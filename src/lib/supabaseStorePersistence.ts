import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { LEGACY_DEMO_PRODUCT_IDS, LEGACY_DEMO_PACK_IDS } from '../data/initialProducts.js';
import type {
  AppNotification,
  CartItem,
  CommercialQuote,
  DirectMessage,
  Order,
  Pack,
  Product,
  User,
  AppRole,
  DeliveryLocationPoint,
  StaffPermission,
  VolumeDiscountSettings,
  StaffActivityLog,
  StockBatch,
  StockMovement,
  OperatingExpense,
  CollectionReminder,
  OrderDraft
} from '../types.js';

export interface ClientWorkspace {
  cartItems: CartItem[];
  drafts: OrderDraft[];
  updatedAt: string;
}

export interface StoredUserAccount {
  user: User;
  passwordHash: string;
}

export type StaffRole = Extract<AppRole, 'Admin simple' | 'Commercial' | 'Gestionnaire Catalogue' | 'Logistique'>;

export interface ManagedStaffAccount {
  id: string;
  identifier: string;
  name: string;
  role: StaffRole;
  passwordHash: string;
  active: boolean;
  permissions?: StaffPermission[];
  lastSeenAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentServerStore {
  products: Product[];
  packs: Pack[];
  orders: Order[];
  stockMovements?: StockMovement[];
  stockBatches?: StockBatch[];
  accounts: StoredUserAccount[];
  staffAccounts: ManagedStaffAccount[];
  quotes: CommercialQuote[];
  messages: DirectMessage[];
  notifications: AppNotification[];
  expenses?: OperatingExpense[];
  collectionReminders?: CollectionReminder[];
  volumeDiscounts?: VolumeDiscountSettings;
  staffLogs?: StaffActivityLog[];
}

type Row = Record<string, any>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const dataObject = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const numberOr = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const isEmbeddedPdf = (value: unknown): value is string =>
  typeof value === 'string' && /^data:application\/pdf(?:;[^,]+)*;base64,/i.test(value);
const pdfUrlForDatabase = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() && !isEmbeddedPdf(value) ? value : null;
const orderForDatabase = (order: Order): Order => {
  if (!isEmbeddedPdf(order.pdfUrl)) return order;
  const { pdfUrl: _discardedPdf, ...orderWithoutEmbeddedPdf } = order;
  return orderWithoutEmbeddedPdf as Order;
};

function mergeById<T>(remote: T[], local: T[], keyOf: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of remote) merged.set(keyOf(item), item);
  for (const item of local) if (!merged.has(keyOf(item))) merged.set(keyOf(item), item);
  return Array.from(merged.values());
}

function assertNoError(context: string, error: { message?: string } | null): void {
  if (error) throw new Error(`Supabase (${context}) : ${error.message || 'erreur inconnue'}`);
}

function stockMovementFromRow(value: unknown): StockMovement {
  const row = dataObject(value);
  return {
    id: String(row.id || ''),
    productId: String(row.product_id || ''),
    productName: String(row.product_name || ''),
    type: row.movement_type as StockMovement['type'],
    quantity: numberOr(row.quantity),
    previousQuantity: numberOr(row.previous_quantity),
    newQuantity: numberOr(row.new_quantity),
    reason: String(row.reason || ''),
    lotNumber: row.lot_number ? String(row.lot_number) : undefined,
    reference: row.reference ? String(row.reference) : undefined,
    date: String(row.created_at || new Date().toISOString()),
    performedBy: String(row.performed_by || ''),
    performedById: row.performed_by_id ? String(row.performed_by_id) : undefined,
    performedByRole: row.performed_by_role as StockMovement['performedByRole'],
  };
}

function stockBatchFromRow(value: unknown): StockBatch {
  const row = dataObject(value);
  return {
    id: String(row.id || ''),
    productId: String(row.product_id || ''),
    productName: String(row.product_name || ''),
    lotNumber: row.lot_number ? String(row.lot_number) : '',
    expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : '',
    quantity: numberOr(row.quantity_received),
    initialQuantity: numberOr(row.quantity_received),
    quantityRemaining: row.quantity_remaining == null ? undefined : numberOr(row.quantity_remaining),
    quantityDestroyed: numberOr(row.quantity_destroyed),
    purchasePrice: row.purchase_price == null ? undefined : numberOr(row.purchase_price),
    supplierName: row.supplier_name ? String(row.supplier_name) : undefined,
    supplierReference: row.supplier_reference ? String(row.supplier_reference) : undefined,
    receivedDate: String(row.received_at || row.created_at || new Date().toISOString()),
    receivedBy: row.received_by ? String(row.received_by) : undefined,
    receivedById: row.received_by_id ? String(row.received_by_id) : undefined,
    status: row.status === 'quarantaine' || row.status === 'perime' || row.status === 'detruit' ? row.status : 'disponible',
    statusReason: row.status_reason ? String(row.status_reason) : undefined,
    statusUpdatedAt: row.status_updated_at ? String(row.status_updated_at) : undefined,
    statusUpdatedBy: row.status_updated_by ? String(row.status_updated_by) : undefined,
    isArchived: row.status === 'detruit',
  };
}

export function createSupabaseStorePersistence(): SupabaseStorePersistence | null {
  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || '';
  const configuredUrl = process.env.SUPABASE_URL?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production bloquée : ajoutez SUPABASE_SERVICE_ROLE_KEY dans les secrets privés de l’hébergeur. Ne mettez jamais cette clé dans VITE_* ni dans le ZIP.');
    }
    return null;
  }
  if (!configuredUrl && !projectRef) {
    throw new Error('Supabase est activé, mais aucune cible n’est définie. Configurez SUPABASE_URL ou SUPABASE_PROJECT_REF pour cet environnement.');
  }
  const url = configuredUrl || `https://${projectRef}.supabase.co`;
  try {
    const parsedUrl = new URL(url);
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      throw new Error('SUPABASE_URL doit utiliser HTTPS en production.');
    }
    const urlProjectRef = parsedUrl.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1];
    if (projectRef && urlProjectRef && projectRef !== urlProjectRef) {
      throw new Error('SUPABASE_URL et SUPABASE_PROJECT_REF désignent deux projets Supabase différents.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('SUPABASE_')) throw error;
    throw new Error('SUPABASE_URL doit être une URL valide.');
  }
  if (serviceKey.startsWith('sb_publishable_')) {
    throw new Error('La clé Supabase fournie est une clé publique. Le serveur doit utiliser la clé secrète service_role, stockée uniquement dans les variables privées de l’hébergeur.');
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return new SupabaseStorePersistence(client);
}

export class SupabaseStorePersistence {
  private baseline: PersistentServerStore | null = null;
  private collectionRemindersTableAvailable = true;
  private readonly profileIds = new Map<string, string>();
  private readonly client: SupabaseClient;
  private queue: Promise<void> = Promise.resolve();

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getClientWorkspace(appUserId: string): Promise<ClientWorkspace | null> {
    const { data, error } = await this.client
      .from('app_client_workspaces')
      .select('cart_data, drafts_data, updated_at')
      .eq('app_user_id', appUserId)
      .maybeSingle();
    assertNoError('lecture de l’espace client', error);
    if (!data) return null;
    return {
      cartItems: Array.isArray(data.cart_data) ? data.cart_data as CartItem[] : [],
      drafts: Array.isArray(data.drafts_data) ? data.drafts_data as OrderDraft[] : [],
      updatedAt: typeof data.updated_at === 'string' ? data.updated_at : new Date(0).toISOString(),
    };
  }

  async saveClientWorkspace(appUserId: string, cartItems: CartItem[], drafts: OrderDraft[]): Promise<ClientWorkspace> {
    const updatedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('app_client_workspaces')
      .upsert({
        app_user_id: appUserId,
        cart_data: cartItems,
        drafts_data: drafts,
        updated_at: updatedAt,
      }, { onConflict: 'app_user_id' })
      .select('cart_data, drafts_data, updated_at')
      .single();
    assertNoError('sauvegarde de l’espace client', error);
    return {
      cartItems: Array.isArray(data?.cart_data) ? data.cart_data as CartItem[] : cartItems,
      drafts: Array.isArray(data?.drafts_data) ? data.drafts_data as OrderDraft[] : drafts,
      updatedAt: typeof data?.updated_at === 'string' ? data.updated_at : updatedAt,
    };
  }

  async hasAtomicClientCreditGuard(): Promise<boolean> {
    const { data, error } = await this.client
      .from('app_runtime_settings')
      .select('setting_value')
      .eq('setting_key', 'client_credit_guard_version')
      .maybeSingle();
    if (this.isMissingTableError(error, 'app_runtime_settings')) return false;
    assertNoError('vérification du contrôle atomique du crédit client', error);
    return Number(dataObject(data).setting_value && dataObject(dataObject(data).setting_value).version) >= 1;
  }

  async listStockMovements(productId?: string): Promise<StockMovement[]> {
    let query = this.client.from('stock_movements').select('*');
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
    assertNoError('lecture des mouvements de stock', error);
    return rows(data).map(stockMovementFromRow);
  }

  async listStockBatches(productId?: string): Promise<StockBatch[]> {
    let query = this.client.from('stock_batches').select('*');
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query.order('received_at', { ascending: false }).limit(2000);
    assertNoError('lecture des lots de stock', error);
    return rows(data).map(stockBatchFromRow);
  }

  async receiveProductStock(input: {
    product: Product;
    movement: StockMovement;
    batch: StockBatch;
  }): Promise<{ movement: StockMovement; batch: StockBatch; quantity: number; status: 'disponible' | 'rupture' }> {
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant une réception de stock.');
      const { data, error } = await this.client.rpc('app_receive_product_stock_with_batch', {
        p_movement_id: input.movement.id,
        p_product_id: input.product.id,
        p_quantity: input.movement.quantity,
        p_reason: input.movement.reason,
        p_lot_number: input.movement.lotNumber || null,
        p_performed_by_id: input.movement.performedById || 'system',
        p_performed_by: input.movement.performedBy,
        p_performed_by_role: input.movement.performedByRole || 'Super-Admin',
        p_expiry_date: input.batch.expiryDate || null,
        p_supplier_name: input.batch.supplierName || null,
        p_supplier_reference: input.batch.supplierReference || null,
        p_purchase_price: input.batch.purchasePrice ?? null,
      });
      assertNoError('réception atomique du stock', error);
      const payload = dataObject(data);
      const movement = stockMovementFromRow(payload.movement);
      const batch = stockBatchFromRow(payload.batch);
      const quantity = numberOr(payload.quantityAvailable, movement.newQuantity);
      const status: 'disponible' | 'rupture' = payload.status === 'rupture' ? 'rupture' : 'disponible';
      this.syncProductStockBaseline(input.product, quantity, status);
      return { movement, batch, quantity, status };
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async updateStockBatchStatus(input: {
    batchId: string;
    targetStatus: 'disponible' | 'quarantaine' | 'detruit';
    reason: string;
    movementId: string;
    performedById: string;
    performedBy: string;
    performedByRole: string;
  }): Promise<{ batch: StockBatch; quantity: number; movement: StockMovement | null }> {
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant de modifier un lot.');
      const { data, error } = await this.client.rpc('app_set_stock_batch_status', {
        p_batch_id: input.batchId,
        p_target_status: input.targetStatus,
        p_reason: input.reason,
        p_movement_id: input.movementId,
        p_performed_by_id: input.performedById,
        p_performed_by: input.performedBy,
        p_performed_by_role: input.performedByRole,
      });
      assertNoError('mise à jour du statut du lot', error);
      const payload = dataObject(data);
      const batch = stockBatchFromRow(payload.batch);
      const product = this.baseline.products.find(item => item.id === batch.productId);
      const quantity = numberOr(payload.quantityAvailable, product ? numberOr(product.quantityAvailable, product.stockQuantity) : 0);
      const movement = payload.movement ? stockMovementFromRow(payload.movement) : null;
      if (product) this.syncProductStockBaseline(product, quantity, quantity > 0 ? 'disponible' : 'rupture');
      return { batch, quantity, movement };
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async adjustProductStock(input: {
    product: Product;
    movement: StockMovement;
    targetQuantity: number;
    status: 'disponible' | 'rupture';
  }): Promise<{ movement: StockMovement | null; quantity: number; status: 'disponible' | 'rupture' }> {
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant un ajustement de stock.');
      const { data, error } = await this.client.rpc('app_adjust_product_stock', {
        p_movement_id: input.movement.id,
        p_product_id: input.product.id,
        p_target_quantity: input.targetQuantity,
        p_status: input.status,
        p_reason: input.movement.reason,
        p_performed_by_id: input.movement.performedById || 'system',
        p_performed_by: input.movement.performedBy,
        p_performed_by_role: input.movement.performedByRole || 'Super-Admin',
      });
      assertNoError('ajustement atomique du stock', error);
      const payload = dataObject(data);
      const quantity = numberOr(payload.quantityAvailable, input.targetQuantity);
      const status: 'disponible' | 'rupture' = payload.status === 'rupture' ? 'rupture' : 'disponible';
      this.syncProductStockBaseline(input.product, quantity, status);
      const movement = payload.movement ? stockMovementFromRow(payload.movement) : null;
      return { movement, quantity, status };
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async cancelOrderAndRestoreStock(input: {
    order: Order;
    reason: string;
    actor: { id: string; name: string; role: AppRole };
    store: PersistentServerStore;
  }): Promise<{ order: Order; cancelled: boolean }> {
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant une annulation de commande.');
      const { data, error } = await this.client.rpc('app_cancel_order_and_restore_stock', {
        p_order_id: input.order.id,
        p_reason: input.reason,
        p_performed_by_id: input.actor.id,
        p_performed_by: input.actor.name,
        p_performed_by_role: input.actor.role,
      });
      assertNoError('annulation atomique et restitution du stock', error);

      const payload = dataObject(data);
      const stocks = rows(payload.stocks).map((row) => ({
        productId: String(row.productId || ''),
        quantity: Math.max(0, Math.trunc(numberOr(row.quantity))),
        status: row.status === 'rupture' ? 'rupture' as const : 'disponible' as const,
      })).filter((stock) => stock.productId);

      for (const stock of stocks) {
        const product = input.store.products.find((item) => item.id === stock.productId);
        if (product) {
          product.quantityAvailable = stock.quantity;
          product.stockQuantity = stock.quantity;
          product.status = stock.status;
          product.hasPhysicalStock = stock.quantity > 0 && stock.status !== 'rupture';
        }
        this.syncProductStockBaseline(
          product || ({ id: stock.productId } as Product),
          stock.quantity,
          stock.status,
        );
      }

      const updatedOrder: Order = {
        ...input.order,
        status: 'Annulée',
        cancellationReason: input.reason,
        stockReserved: false,
      };
      const storeOrderIndex = input.store.orders.findIndex((item) => item.id === input.order.id);
      if (storeOrderIndex >= 0) input.store.orders[storeOrderIndex] = updatedOrder;
      const baselineOrderIndex = this.baseline.orders.findIndex((item) => item.id === input.order.id);
      if (baselineOrderIndex >= 0) this.baseline.orders[baselineOrderIndex] = clone(updatedOrder);
      else this.baseline.orders.unshift(clone(updatedOrder));

      return { order: updatedOrder, cancelled: payload.cancelled !== false };
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private syncProductStockBaseline(product: Product, quantity: number, status: 'disponible' | 'rupture'): void {
    if (!this.baseline) return;
    this.baseline.products = this.baseline.products.map((current) => current.id === product.id
      ? { ...current, quantityAvailable: quantity, stockQuantity: quantity, status, hasPhysicalStock: quantity > 0 && status !== 'rupture' }
      : current);
  }

  async createProductMediaUploadUrl(kind: 'image' | 'pdf', contentType: string, scope: 'product' | 'pack' = 'product'): Promise<{
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
    publicUrl: string;
  }> {
    const extension = kind === 'pdf'
      ? 'pdf'
      : contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/png'
          ? 'png'
          : 'jpg';
    const directory = kind === 'pdf' ? 'notices' : scope === 'pack' ? 'packs' : 'products';
    const bucket = 'product-media';
    const path = `${directory}/${randomUUID()}.${extension}`;
    const storage = this.client.storage.from(bucket);
    const { data, error } = await storage.createSignedUploadUrl(path);
    assertNoError('création du lien d’import média', error);
    if (!data) throw new Error('Supabase n’a pas fourni de lien d’import média.');
    const { data: publicData } = storage.getPublicUrl(path);

    return {
      bucket,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl,
    };
  }

  async hydrate(local: PersistentServerStore): Promise<PersistentServerStore> {
    const [productsResult, variantsResult, packsResult, ordersResult, itemsResult, usersResult, quotesResult, messagesResult, notificationsResult, expensesResult, collectionRemindersResult, staffAccountsResult, activityLogsResult, runtimeSettingsResult] = await Promise.all([
      this.client.from('products').select('*').order('created_at', { ascending: true }),
      this.client.from('product_variants').select('*').order('id', { ascending: true }),
      this.client.from('packs').select('*').order('created_at', { ascending: true }),
      this.client.from('orders').select('*').order('created_at', { ascending: true }),
      this.client.from('order_items').select('*').order('id', { ascending: true }),
      this.client.from('app_users').select('*'),
      this.client.from('quotes').select('*').order('created_at', { ascending: true }),
      this.client.from('direct_messages').select('*').order('created_at', { ascending: true }),
      this.client.from('notifications').select('*').order('created_at', { ascending: true }),
      this.client.from('operating_expenses').select('*').order('expense_date', { ascending: false }),
      this.client.from('collection_reminders').select('*').order('occurred_at', { ascending: false }).limit(10000),
      this.client.from('app_staff_accounts').select('*'),
      this.client.from('activity_logs').select('*').limit(500),
      this.client.from('app_runtime_settings').select('*'),
    ]);

    assertNoError('lecture des produits', productsResult.error);
    assertNoError('lecture des variantes', variantsResult.error);
    assertNoError('lecture des packs', packsResult.error);
    assertNoError('lecture des commandes', ordersResult.error);
    assertNoError('lecture des lignes de commande', itemsResult.error);
    assertNoError('lecture des comptes applicatifs', usersResult.error);
    assertNoError('lecture des devis', quotesResult.error);
    assertNoError('lecture des messages', messagesResult.error);
    assertNoError('lecture des notifications', notificationsResult.error);
    const expensesTableMissing = this.isMissingTableError(expensesResult.error, 'operating_expenses');
    if (expensesResult.error && !expensesTableMissing) {
      assertNoError('lecture des dépenses de fonctionnement', expensesResult.error);
    }
    const collectionRemindersTableMissing = this.isMissingTableError(collectionRemindersResult.error, 'collection_reminders');
    this.collectionRemindersTableAvailable = !collectionRemindersTableMissing;
    if (collectionRemindersResult.error && !collectionRemindersTableMissing) {
      assertNoError('lecture des relances de créances', collectionRemindersResult.error);
    }
    const staffTableMissing = this.isMissingTableError(staffAccountsResult.error, 'app_staff_accounts');
    if (staffAccountsResult.error && !staffTableMissing) {
      assertNoError('lecture des comptes collaborateurs', staffAccountsResult.error);
    }
    const activityLogsMissing = this.isMissingTableError(activityLogsResult.error, 'activity_logs');
    if (activityLogsResult.error && !activityLogsMissing) {
      assertNoError('lecture des logs collaborateurs (activity_logs)', activityLogsResult.error);
    }
    const runtimeSettingsMissing = this.isMissingTableError(runtimeSettingsResult.error, 'app_runtime_settings');
    if (runtimeSettingsResult.error && !runtimeSettingsMissing) {
      assertNoError('lecture des paramètres runtime', runtimeSettingsResult.error);
    }

    const variantRows = rows(variantsResult.data);
    const variantsByProduct = new Map<string, Row[]>();
    for (const variant of variantRows) {
      const list = variantsByProduct.get(String(variant.product_id)) || [];
      list.push(variant);
      variantsByProduct.set(String(variant.product_id), list);
    }
    const remoteProducts = rows(productsResult.data).map((row): Product => {
      const extra = dataObject(row.app_data);
      return {
        ...extra,
        id: String(row.id),
        name: String(row.name),
        category: String(row.category),
        subcategory: row.subcategory || undefined,
        specialty: extra.specialty,
        specifications: extra.specifications,
        variants: (variantsByProduct.get(String(row.id)) || []).map((variant) => ({
          label: String(variant.label),
          price: numberOr(variant.price),
          originalPrice: variant.original_price == null ? undefined : numberOr(variant.original_price),
          discountPercentage: variant.discount_percentage == null ? undefined : numberOr(variant.discount_percentage),
        })),
        status: row.status === 'rupture' ? 'rupture' : 'disponible',
        image: row.image_url || undefined,
        thumbnailUrl: extra.thumbnailUrl || row.image_url || undefined,
        description: row.description || undefined,
        isPromotion: Boolean(row.is_promotion),
        originalPrice: numberOr(row.original_price),
        discountPercentage: numberOr(row.discount_percentage),
        stockQuantity: extra.stockQuantity,
        quantityAvailable: extra.quantityAvailable,
        alertThreshold: numberOr(row.alert_threshold, 15),
        lowStockAlertThreshold: extra.lowStockAlertThreshold,
        purchasePrice: numberOr(row.purchase_price),
        purchasePriceVerified: extra.purchasePriceVerified === true,
      };
    });

    const remotePacks = rows(packsResult.data).map((row): Pack => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description || ''),
      price: numberOr(row.price),
      items: Array.isArray(row.items) ? row.items : [],
      image: String(row.image_url || ''),
      endDate: row.end_date || undefined,
      active: Boolean(row.active),
    }));

    const appUsers = rows(usersResult.data);
    const appUserByProfile = new Map<string, string>();
    const remoteAccounts = appUsers
      .filter((row) => row.password_hash && row.app_user_id && row.profile_id)
      .map((row): StoredUserAccount => {
        const appUserId = String(row.app_user_id);
        const profileId = String(row.profile_id);
        this.profileIds.set(appUserId, profileId);
        appUserByProfile.set(profileId, appUserId);
        const userData = dataObject(row.user_data) as unknown as User;
        return { user: { ...userData, id: appUserId }, passwordHash: String(row.password_hash) };
      });

    const remoteStaffAccounts = rows(staffAccountsResult.data).map((row): ManagedStaffAccount => ({
      id: String(row.id),
      identifier: String(row.identifier),
      name: String(row.name),
      role: row.role as StaffRole,
      passwordHash: String(row.password_hash),
      active: Boolean(row.is_active),
      permissions: Array.isArray(row.permissions) ? row.permissions : undefined,
      lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : undefined,
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
    for (const row of appUsers) {
      if (row.app_user_id && row.profile_id) {
        this.profileIds.set(String(row.app_user_id), String(row.profile_id));
        appUserByProfile.set(String(row.profile_id), String(row.app_user_id));
      }
    }

    const itemsByOrder = new Map<string, Row[]>();
    for (const item of rows(itemsResult.data)) {
      const list = itemsByOrder.get(String(item.order_id)) || [];
      list.push(item);
      itemsByOrder.set(String(item.order_id), list);
    }
    const remoteOrders = rows(ordersResult.data).map((row): Order => {
      const saved = dataObject(row.app_data);
      const savedCustomer = dataObject(saved.customer);
      const savedItems = Array.isArray(saved.items) ? saved.items : (itemsByOrder.get(String(row.id)) || []).map((item) => ({
        productId: item.product_id || '',
        productName: String(item.product_name),
        variant: String(item.variant || ''),
        price: numberOr(item.price),
        quantity: numberOr(item.quantity),
        total: numberOr(item.total),
        isQuote: Boolean(item.is_quote),
      }));
      const customer = {
        ...savedCustomer,
        facilityName: String(row.facility_name),
        facilityType: row.facility_type || savedCustomer.facilityType,
        contactName: String(row.contact_name || savedCustomer.contactName || ''),
        phone: String(row.phone),
        deliveryAddress: String(row.delivery_address),
        neighborhoodId: row.neighborhood_id || savedCustomer.neighborhoodId,
        neighborhoodName: row.neighborhood_name || savedCustomer.neighborhoodName,
        deliveryMode: row.delivery_mode || savedCustomer.deliveryMode || 'livraison',
        paymentMethod: row.payment_method || savedCustomer.paymentMethod || 'especes',
        deliveryFee: numberOr(row.delivery_fee),
      };
      const savedUserId = saved.userId || appUserByProfile.get(String(row.client_id));
      return {
        ...saved,
        id: String(row.id),
        reference: String(row.reference),
        createdAt: String(row.created_at),
        userId: savedUserId,
        customer,
        items: savedItems,
        estimatedTotal: numberOr(row.estimated_total),
        hasQuoteItems: Boolean(row.has_quote_items),
        status: row.status,
        cancellationReason: row.cancellation_reason || undefined,
        isPaid: Boolean(row.is_paid),
        pdfUrl: row.pdf_url || (isEmbeddedPdf(saved.pdfUrl) ? undefined : saved.pdfUrl),
        deliveryStage: row.delivery_stage || 'preparation',
        deliveryZone: row.delivery_zone || undefined,
        deliveryEstimated: row.delivery_estimated || undefined,
        deliveryFee: numberOr(row.delivery_fee),
      } as Order;
    });

    const remoteQuotes = rows(quotesResult.data).map((row): CommercialQuote => {
      const saved = dataObject(row.app_data);
      return {
        ...saved,
        id: String(row.id),
        reference: String(row.reference),
        createdAt: String(row.created_at || saved.createdAt || new Date().toISOString()),
        validUntil: String(row.valid_until || saved.validUntil || ''),
        commercialId: String(saved.commercialId || row.commercial_id || ''),
        commercialName: String(row.commercial_name || saved.commercialName || ''),
        customerId: String(row.customer_id || saved.customerId || ''),
        customer: row.customer || saved.customer,
        items: Array.isArray(row.items) ? row.items : (Array.isArray(saved.items) ? saved.items : []),
        subtotal: numberOr(row.subtotal ?? saved.subtotal),
        discountType: row.discount_type || saved.discountType || 'percent',
        discountValue: numberOr(row.discount_value ?? saved.discountValue),
        discountAmount: numberOr(row.discount_amount ?? saved.discountAmount),
        finalTotal: numberOr(row.final_total ?? saved.finalTotal),
        status: row.status || saved.status || 'Brouillon',
        notes: row.notes || saved.notes,
      } as CommercialQuote;
    });

    const remoteMessages = rows(messagesResult.data).map((row): DirectMessage => {
      const saved = dataObject(row.app_data);
      return {
        ...saved,
        id: String(row.id),
        senderId: appUserByProfile.get(String(row.sender_id)) || String(row.sender_id),
        senderName: String(row.sender_name),
        recipientId: row.receiver_id ? (appUserByProfile.get(String(row.receiver_id)) || String(row.receiver_id)) : saved.recipientId,
        subject: String(saved.subject || ''),
        content: String(row.content),
        channel: saved.channel || 'in_app',
        createdAt: String(row.created_at),
        senderRole: row.sender_role,
      } as DirectMessage;
    });

    const remoteNotifications = rows(notificationsResult.data).map((row): AppNotification => {
      const saved = dataObject(row.data);
      return {
        ...saved,
        id: String(row.id),
        timestamp: String(row.created_at),
        type: row.type,
        message: String(row.message),
        userId: saved.userId || (row.user_id ? appUserByProfile.get(String(row.user_id)) : undefined),
        targetRole: row.target_role || 'all',
        read: Boolean(row.is_read),
      } as AppNotification;
    });

    const remoteExpenses = expensesTableMissing ? [] : rows(expensesResult.data).map((row): OperatingExpense => {
      const saved = dataObject(row.app_data);
      return {
        ...saved,
        id: String(row.id),
        date: String(row.expense_date),
        category: row.category as OperatingExpense['category'],
        description: String(row.description),
        amount: numberOr(row.amount),
        paymentMethod: row.payment_method || undefined,
        supplier: row.supplier || undefined,
        reference: row.reference || undefined,
        status: row.status === 'annulee' ? 'annulee' : 'active',
        recordedById: String(row.recorded_by_id),
        recordedByName: String(row.recorded_by_name),
        createdAt: String(row.created_at),
        voidedAt: row.voided_at || undefined,
        voidedById: row.voided_by_id || undefined,
        voidedByName: row.voided_by_name || undefined,
        voidReason: row.void_reason || undefined,
      } as OperatingExpense;
    });

    const remoteCollectionReminders = collectionRemindersTableMissing ? [] : rows(collectionRemindersResult.data).map((row): CollectionReminder => {
      const saved = dataObject(row.app_data);
      return {
        ...saved,
        id: String(row.id),
        orderId: String(row.order_id),
        orderReference: String(row.order_reference),
        clientId: row.client_id || undefined,
        clientName: String(row.client_name),
        occurredAt: String(row.occurred_at),
        channel: row.channel as CollectionReminder['channel'],
        outcome: row.outcome as CollectionReminder['outcome'],
        notes: row.notes || undefined,
        nextFollowUpDate: row.next_follow_up_date || undefined,
        recordedById: String(row.recorded_by_id),
        recordedByName: String(row.recorded_by_name),
        recordedByRole: row.recorded_by_role as CollectionReminder['recordedByRole'],
      } as CollectionReminder;
    });

    const remoteActivityLogs = rows(activityLogsResult.data).map((row): StaffActivityLog => {
      const saved = dataObject(row.app_data);
      const detailsObj = row.details && typeof row.details === 'object' && !Array.isArray(row.details)
        ? (row.details as Row)
        : {};
      const userId = String(row.user_id || row.userId || detailsObj.userId || saved.userId || saved.actorId || 'system');
      const actionType = String(row.action_type || row.actionType || detailsObj.actionType || saved.actionType || row.action_label || saved.actionLabel || 'ACTION');
      const entityType = String(row.entity_type || row.entityType || detailsObj.entityType || saved.entityType || saved.targetType || 'settings');
      const entityId = String(row.entity_id || row.entityId || detailsObj.entityId || saved.entityId || saved.targetId || row.target_label || saved.targetLabel || 'global');
      const detailsText = typeof row.details === 'string'
        ? row.details
        : String(detailsObj.message || detailsObj.details || saved.details || (Object.keys(detailsObj).length > 0 ? JSON.stringify(detailsObj) : ''));
      const timestamp = String(row.created_at || row.timestamp || detailsObj.timestamp || saved.timestamp || new Date().toISOString());
      return {
        ...saved,
        id: String(row.id),
        userId,
        actionType,
        entityType,
        entityId,
        details: detailsText,
        timestamp,
        actorId: String(detailsObj.actorId || saved.actorId || userId),
        actorName: String(row.actor_name || detailsObj.actorName || saved.actorName || 'Collaborateur'),
        actorRole: (row.actor_role || detailsObj.actorRole || saved.actorRole || 'Super-Admin') as AppRole,
        category: (row.category || detailsObj.category || saved.category || 'system') as StaffActivityLog['category'],
        severity: (row.severity || detailsObj.severity || saved.severity || 'info') as StaffActivityLog['severity'],
        actionLabel: String(row.action_label || detailsObj.actionLabel || saved.actionLabel || actionType),
        targetType: (['product', 'order', 'staff', 'settings', 'quote', 'expense'].includes(entityType) ? entityType : (detailsObj.targetType || saved.targetType || 'settings')) as StaffActivityLog['targetType'],
        targetId: String(detailsObj.targetId || saved.targetId || entityId),
        targetLabel: String(row.target_label || detailsObj.targetLabel || saved.targetLabel || entityId),
        previousValue: row.previous_value || detailsObj.previousValue || saved.previousValue || undefined,
        newValue: row.new_value || detailsObj.newValue || saved.newValue || undefined,
      };
    });

    const runtimeRows = rows(runtimeSettingsResult.data);
    const volumeDiscountRow = runtimeRows.find((r) => r.setting_key === 'volume_discounts');
    const remoteVolumeDiscounts = volumeDiscountRow?.setting_value
      ? (volumeDiscountRow.setting_value as VolumeDiscountSettings)
      : local.volumeDiscounts;

    const mergedStaffLogs = mergeById(remoteActivityLogs, local.staffLogs || [], (item) => item.id)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 500);

    const rawMerged: PersistentServerStore = {
      products: mergeById(remoteProducts, local.products, (item) => item.id),
      packs: mergeById(remotePacks, local.packs, (item) => item.id),
      orders: mergeById(remoteOrders, local.orders, (item) => item.id),
      stockMovements: local.stockMovements || [],
      stockBatches: local.stockBatches || [],
      accounts: mergeById(remoteAccounts, local.accounts, (item) => item.user.id),
      staffAccounts: mergeById(remoteStaffAccounts, local.staffAccounts || [], (item) => item.id),
      quotes: mergeById(remoteQuotes, local.quotes, (item) => item.id),
      messages: mergeById(remoteMessages, local.messages, (item) => item.id),
      notifications: mergeById(remoteNotifications, local.notifications, (item) => item.id),
      expenses: mergeById(remoteExpenses, local.expenses || [], (item) => item.id),
      collectionReminders: mergeById(remoteCollectionReminders, local.collectionReminders || [], (item) => item.id),
      volumeDiscounts: remoteVolumeDiscounts,
      staffLogs: mergedStaffLogs,
    };
    // Compare local seed data to what was actually read from Supabase so the
    // first save uploads the catalogue instead of marking it as already synced.
    this.baseline = clone({
      products: remoteProducts,
      packs: remotePacks,
      orders: remoteOrders,
      accounts: remoteAccounts,
      staffAccounts: remoteStaffAccounts,
      quotes: remoteQuotes,
      messages: remoteMessages,
      notifications: remoteNotifications,
      expenses: remoteExpenses,
      collectionReminders: remoteCollectionReminders,
      staffLogs: remoteActivityLogs,
      volumeDiscounts: volumeDiscountRow?.setting_value
        ? volumeDiscountRow.setting_value as VolumeDiscountSettings
        : undefined,
    });
    const cleanedMerged: PersistentServerStore = {
      ...rawMerged,
      products: rawMerged.products.filter((item) => !LEGACY_DEMO_PRODUCT_IDS.has(item.id)),
      packs: rawMerged.packs.filter((item) => !LEGACY_DEMO_PACK_IDS.has(item.id)),
    };
    return cleanedMerged;
  }

  async loadProducts(): Promise<Product[]> {
    const operation = this.queue.then(async () => {
      const [productsResult, variantsResult] = await Promise.all([
        this.client.from('products').select('*').order('created_at', { ascending: true }),
        this.client.from('product_variants').select('*').order('id', { ascending: true }),
      ]);
      assertNoError('actualisation du catalogue', productsResult.error);
      assertNoError('actualisation des variantes', variantsResult.error);

      const variantsByProduct = new Map<string, Row[]>();
      for (const variant of rows(variantsResult.data)) {
        const productId = String(variant.product_id);
        const list = variantsByProduct.get(productId) || [];
        list.push(variant);
        variantsByProduct.set(productId, list);
      }

      const products = rows(productsResult.data).map((row): Product => {
        const extra = dataObject(row.app_data);
        return {
          ...extra,
          id: String(row.id),
          name: String(row.name),
          category: String(row.category),
          subcategory: row.subcategory || undefined,
          specialty: extra.specialty,
          specifications: extra.specifications,
          variants: (variantsByProduct.get(String(row.id)) || []).map((variant) => ({
            label: String(variant.label),
            price: numberOr(variant.price),
            originalPrice: variant.original_price == null ? undefined : numberOr(variant.original_price),
            discountPercentage: variant.discount_percentage == null ? undefined : numberOr(variant.discount_percentage),
          })),
          status: row.status === 'rupture' ? 'rupture' : 'disponible',
          image: row.image_url || undefined,
          thumbnailUrl: extra.thumbnailUrl || row.image_url || undefined,
          description: row.description || undefined,
          isPromotion: Boolean(row.is_promotion),
          originalPrice: numberOr(row.original_price),
          discountPercentage: numberOr(row.discount_percentage),
          stockQuantity: extra.stockQuantity,
          quantityAvailable: extra.quantityAvailable,
          alertThreshold: numberOr(row.alert_threshold, 15),
          lowStockAlertThreshold: extra.lowStockAlertThreshold,
          purchasePrice: numberOr(row.purchase_price),
          purchasePriceVerified: extra.purchasePriceVerified === true,
        };
      }).filter((product) => !LEGACY_DEMO_PRODUCT_IDS.has(product.id));

      if (this.baseline) this.baseline.products = clone(products);
      return products;
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async loadOrders(clientUserId?: string): Promise<Order[]> {
    const operation = this.queue.then(async () => {
      const profileId = clientUserId ? this.profileIds.get(clientUserId) : undefined;
      if (clientUserId && !profileId) {
        throw new Error('Le profil client n’est pas synchronisé dans Supabase. Reconnectez-vous avant de consulter les commandes.');
      }
      let ordersQuery = this.client.from('orders').select('*').order('created_at', { ascending: false });
      if (profileId) ordersQuery = ordersQuery.eq('client_id', profileId);
      const ordersResult = await ordersQuery;
      assertNoError('actualisation des commandes', ordersResult.error);

      const appUserByProfile = new Map<string, string>();
      for (const [appUserId, mappedProfileId] of this.profileIds.entries()) {
        appUserByProfile.set(mappedProfileId, appUserId);
      }

      const itemsByOrder = new Map<string, Row[]>();
      const orderRows = rows(ordersResult.data);
      const ordersNeedingItemRows = orderRows
        .filter((row) => !Array.isArray(dataObject(row.app_data).items))
        .map((row) => String(row.id));
      if (ordersNeedingItemRows.length > 0) {
        const { data, error } = await this.client
          .from('order_items')
          .select('*')
          .in('order_id', ordersNeedingItemRows)
          .order('id', { ascending: true });
        assertNoError('actualisation des lignes de commande', error);
        for (const item of rows(data)) {
          const orderId = String(item.order_id);
          const list = itemsByOrder.get(orderId) || [];
          list.push(item);
          itemsByOrder.set(orderId, list);
        }
      }

      const orders = orderRows.map((row): Order => {
        const saved = dataObject(row.app_data);
        const savedCustomer = dataObject(saved.customer);
        const savedItems = Array.isArray(saved.items) ? saved.items : (itemsByOrder.get(String(row.id)) || []).map((item) => ({
          productId: item.product_id || '',
          productName: String(item.product_name),
          variant: String(item.variant || ''),
          price: numberOr(item.price),
          quantity: numberOr(item.quantity),
          total: numberOr(item.total),
          isQuote: Boolean(item.is_quote),
        }));
        const customer = {
          ...savedCustomer,
          facilityName: String(row.facility_name),
          facilityType: row.facility_type || savedCustomer.facilityType,
          contactName: String(row.contact_name || savedCustomer.contactName || ''),
          phone: String(row.phone),
          deliveryAddress: String(row.delivery_address),
          neighborhoodId: row.neighborhood_id || savedCustomer.neighborhoodId,
          neighborhoodName: row.neighborhood_name || savedCustomer.neighborhoodName,
          deliveryMode: row.delivery_mode || savedCustomer.deliveryMode || 'livraison',
          paymentMethod: row.payment_method || savedCustomer.paymentMethod || 'especes',
          deliveryFee: numberOr(row.delivery_fee),
        };
        const savedUserId = saved.userId || (clientUserId && profileId === String(row.client_id)
          ? clientUserId
          : appUserByProfile.get(String(row.client_id)));
        return {
          ...saved,
          id: String(row.id),
          reference: String(row.reference),
          idempotencyKey: saved.idempotencyKey || row.idempotency_key || undefined,
          createdAt: String(row.created_at),
          userId: savedUserId,
          customer,
          items: savedItems,
          estimatedTotal: numberOr(row.estimated_total),
          hasQuoteItems: Boolean(row.has_quote_items),
          status: row.status,
          cancellationReason: row.cancellation_reason || undefined,
          isPaid: Boolean(row.is_paid),
          pdfUrl: row.pdf_url || (isEmbeddedPdf(saved.pdfUrl) ? undefined : saved.pdfUrl),
          deliveryStage: row.delivery_stage || 'preparation',
          deliveryZone: row.delivery_zone || undefined,
          deliveryEstimated: row.delivery_estimated || undefined,
          deliveryFee: numberOr(row.delivery_fee),
        } as Order;
      });

      if (this.baseline && !clientUserId) this.baseline.orders = clone(orders);
      return orders;
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async upsertPushSubscription(userId: string, subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  }): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.client
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        user_id: userId,
        subscription,
        updated_at: now
      }, { onConflict: 'endpoint' });
    assertNoError('push_subscriptions.upsert', error);
  }

  async listPushSubscriptions(userIds: string[]): Promise<Array<{
    endpoint: string;
    user_id: string;
    subscription: { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } };
  }>> {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) return [];
    const { data, error } = await this.client
      .from('push_subscriptions')
      .select('endpoint, user_id, subscription')
      .in('user_id', uniqueUserIds);
    assertNoError('push_subscriptions.list', error);
    return rows(data).map(row => ({
      endpoint: String(row.endpoint),
      user_id: String(row.user_id),
      subscription: row.subscription
    }));
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    const { error } = await this.client
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    assertNoError('push_subscriptions.delete', error);
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    const { error } = await this.client
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
    assertNoError('push_subscriptions.delete_expired', error);
  }

  async persist(store: PersistentServerStore): Promise<void> {
    const snapshot = clone(store);
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant la première sauvegarde.');
      await this.persistProducts(snapshot);
      await this.persistPacks(snapshot);
      await this.persistAccounts(snapshot);
      await this.persistStaffAccounts(snapshot);
      await this.persistOrders(snapshot);
      await this.persistQuotes(snapshot);
      await this.persistExpenses(snapshot);
      await this.persistCollectionReminders(snapshot);
      await this.persistMessages(snapshot);
      await this.persistNotifications(snapshot);
      await this.persistRuntimeSettings(snapshot);
      await this.persistActivityLogs(snapshot);
      this.baseline = clone(snapshot);
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  async persistDirectMessage(
    message: DirectMessage,
    notification: AppNotification | null,
    store: PersistentServerStore
  ): Promise<void> {
    const messageSnapshot = clone(message);
    const notificationSnapshot = notification ? clone(notification) : null;
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant la première sauvegarde.');

      const senderAccount = store.accounts.find((item) => item.user.id === messageSnapshot.senderId);
      const senderUser = senderAccount?.user || {
        id: messageSnapshot.senderId,
        phone: '',
        facilityName: 'Direction Gloryday Pharma',
        contactName: messageSnapshot.senderName,
        role: messageSnapshot.senderRole || 'Super-Admin',
        createdAt: messageSnapshot.createdAt,
      } as User;
      const senderProfileId = this.profileIds.get(senderUser.id)
        || await this.ensureProfile(senderUser, senderAccount?.passwordHash);
      const recipientId = messageSnapshot.recipientId && messageSnapshot.recipientId !== 'staff'
        ? messageSnapshot.recipientId
        : undefined;
      const recipientProfileId = await this.profileIdFor(recipientId, store);
      const { error: messageError } = await this.client.from('direct_messages').upsert({
        id: messageSnapshot.id,
        sender_id: senderProfileId,
        receiver_id: recipientProfileId,
        sender_name: messageSnapshot.senderName,
        sender_role: messageSnapshot.senderRole || senderUser.role,
        content: messageSnapshot.content,
        is_read: Boolean((messageSnapshot as any).isRead),
        created_at: messageSnapshot.createdAt,
        app_data: messageSnapshot,
      }, { onConflict: 'id' });
      assertNoError(`enregistrement du message ${messageSnapshot.id}`, messageError);

      if (notificationSnapshot) {
        const { error: notificationError } = await this.client.from('notifications').upsert({
          id: notificationSnapshot.id,
          user_id: await this.profileIdFor(notificationSnapshot.userId, store),
          target_role: notificationSnapshot.targetRole,
          title: notificationSnapshot.title || notificationSnapshot.orderReference || notificationSnapshot.type,
          message: notificationSnapshot.message,
          type: notificationSnapshot.type,
          is_read: Boolean(notificationSnapshot.read),
          data: notificationSnapshot,
          created_at: notificationSnapshot.timestamp,
        }, { onConflict: 'id' });
        assertNoError('enregistrement de la notification du message', notificationError);
      }

      const nextBaseline = clone(this.baseline);
      nextBaseline.messages = mergeById(nextBaseline.messages || [], [messageSnapshot], (item) => item.id);
      if (notificationSnapshot) {
        nextBaseline.notifications = mergeById(nextBaseline.notifications || [], [notificationSnapshot], (item) => item.id);
      }
      this.baseline = nextBaseline;
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  async persistNotificationBatch(
    notifications: AppNotification[],
    store: PersistentServerStore
  ): Promise<void> {
    const notificationSnapshots = clone(notifications);
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant la première sauvegarde.');

      const changedRows = await Promise.all(notificationSnapshots.map(async (notification) => ({
        id: notification.id,
        user_id: await this.profileIdFor(notification.userId, store),
        target_role: notification.targetRole,
        title: notification.title || notification.orderReference || notification.type,
        message: notification.message,
        type: notification.type,
        is_read: Boolean(notification.read),
        data: notification,
        created_at: notification.timestamp,
      })));

      for (let offset = 0; offset < changedRows.length; offset += 100) {
        const { error } = await this.client
          .from('notifications')
          .upsert(changedRows.slice(offset, offset + 100), { onConflict: 'id' });
        assertNoError('enregistrement des notifications', error);
      }

      const nextBaseline = clone(this.baseline);
      nextBaseline.notifications = mergeById(
        nextBaseline.notifications || [],
        notificationSnapshots,
        (item) => item.id
      );
      this.baseline = nextBaseline;
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  async persistOperatingExpense(expense: OperatingExpense, log?: StaffActivityLog): Promise<void> {
    const snapshot = clone(expense);
    const logSnapshot = log ? clone(log) : null;
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant la première sauvegarde.');
      await this.upsertOperatingExpense(snapshot);
      let logSaved = false;
      if (logSnapshot) {
        try {
          await this.persistActivityLogs({ ...this.baseline, staffLogs: [logSnapshot] });
          logSaved = true;
        } catch (error) {
          console.warn('La dépense est enregistrée, mais son entrée dans activity_logs a échoué:', error instanceof Error ? error.message : error);
        }
      }
      const nextBaseline = clone(this.baseline);
      nextBaseline.expenses = mergeById(nextBaseline.expenses || [], [snapshot], (item) => item.id);
      if (logSnapshot && logSaved) {
        nextBaseline.staffLogs = mergeById(nextBaseline.staffLogs || [], [logSnapshot], (item) => item.id).slice(0, 500);
      }
      this.baseline = nextBaseline;
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  async listCollectionReminders(): Promise<CollectionReminder[]> {
    const operation = this.queue.then(async () => {
      const { data, error } = await this.client
        .from('collection_reminders')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(10000);
      if (this.isMissingTableError(error, 'collection_reminders')) {
        throw new Error('Le journal des relances n’est pas encore créé dans Supabase. Appliquez la migration 20261102000005_collection_reminders.sql.');
      }
      assertNoError('lecture des relances de créances', error);
      return rows(data).map((row): CollectionReminder => {
        const saved = dataObject(row.app_data);
        return {
          ...saved,
          id: String(row.id),
          orderId: String(row.order_id),
          orderReference: String(row.order_reference),
          clientId: row.client_id || undefined,
          clientName: String(row.client_name),
          occurredAt: String(row.occurred_at),
          channel: row.channel as CollectionReminder['channel'],
          outcome: row.outcome as CollectionReminder['outcome'],
          notes: row.notes || undefined,
          nextFollowUpDate: row.next_follow_up_date || undefined,
          recordedById: String(row.recorded_by_id),
          recordedByName: String(row.recorded_by_name),
          recordedByRole: row.recorded_by_role as CollectionReminder['recordedByRole'],
        } as CollectionReminder;
      });
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async persistCollectionReminder(reminder: CollectionReminder, log?: StaffActivityLog): Promise<void> {
    const snapshot = clone(reminder);
    const logSnapshot = log ? clone(log) : null;
    const operation = this.queue.then(async () => {
      if (!this.baseline) throw new Error('Supabase doit être initialisé avant la première sauvegarde.');
      await this.upsertCollectionReminder(snapshot);
      let logSaved = false;
      if (logSnapshot) {
        try {
          await this.persistActivityLogs({ ...this.baseline, staffLogs: [logSnapshot] });
          logSaved = true;
        } catch (error) {
          console.warn('La relance est enregistrée, mais son entrée dans activity_logs a échoué:', error instanceof Error ? error.message : error);
        }
      }
      const nextBaseline = clone(this.baseline);
      nextBaseline.collectionReminders = mergeById(
        nextBaseline.collectionReminders || [],
        [snapshot],
        (item) => item.id
      );
      if (logSnapshot && logSaved) {
        nextBaseline.staffLogs = mergeById(nextBaseline.staffLogs || [], [logSnapshot], (item) => item.id).slice(0, 500);
      }
      this.baseline = nextBaseline;
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  async createOrderAtomically(
    order: Order,
    store: PersistentServerStore
  ): Promise<{ order: Order; created: boolean; stocks: Array<{ productId: string; quantity: number }> }> {
    const snapshot = clone(order);
    const operation = this.queue.then(() => this.createOrderAtomicallyInQueue(snapshot, store));
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async createOrderAtomicallyInQueue(
    order: Order,
    store: PersistentServerStore
  ): Promise<{ order: Order; created: boolean; stocks: Array<{ productId: string; quantity: number }> }> {
    if (!this.baseline) throw new Error('Supabase doit être initialisé avant la création d’une commande.');

    const customer = order.customer;
    const fallbackUserId = order.userId || `usr-phone-${String(customer.phone || order.id).replace(/\D/g, '') || order.id}`;
    let profileId = await this.profileIdFor(fallbackUserId, store);
    if (!profileId) {
      const account = store.accounts.find((item) => item.user.id === fallbackUserId)
        || store.accounts.find((item) => item.user.phone && item.user.phone === customer.phone);
      if (account) {
        profileId = await this.saveAccount(account);
      } else {
        profileId = await this.ensureProfile({
          id: fallbackUserId,
          phone: customer.phone,
          facilityName: customer.facilityName,
          contactName: customer.contactName,
          facilityType: customer.facilityType,
          role: 'client',
          createdAt: order.createdAt,
          deliveryAddress: customer.deliveryAddress,
        });
      }
    }
    if (!profileId) throw new Error(`La commande ${order.reference} n’a pas de compte client associé dans Supabase.`);

    const orderRow = {
      id: order.id,
      reference: order.reference,
      client_id: profileId,
      idempotency_key: order.idempotencyKey || null,
      facility_name: customer.facilityName,
      contact_name: customer.contactName || null,
      phone: customer.phone,
      facility_type: customer.facilityType || null,
      delivery_mode: customer.deliveryMode === 'retrait' ? 'retrait' : 'livraison',
      payment_method: customer.paymentMethod || 'especes',
      delivery_address: customer.deliveryAddress || 'Libreville, Gabon',
      neighborhood_id: customer.neighborhoodId || null,
      neighborhood_name: customer.neighborhoodName || null,
      delivery_zone: order.deliveryZone || null,
      delivery_fee: Math.max(0, Math.trunc(numberOr(order.deliveryFee ?? customer.deliveryFee))),
      delivery_estimated: order.deliveryEstimated || null,
      order_type: order.hasQuoteItems ? 'devis' : 'standard',
      has_quote_items: Boolean(order.hasQuoteItems),
      estimated_total: Math.max(0, Math.trunc(numberOr(order.estimatedTotal))),
      status: order.status,
      is_paid: Boolean(order.isPaid),
      delivery_stage: order.deliveryStage || 'preparation',
      cancellation_reason: order.cancellationReason || null,
      notes: customer.notes || null,
      pdf_url: pdfUrlForDatabase(order.pdfUrl),
      courier_name: order.courier?.name || null,
      courier_phone: order.courier?.phone || null,
      courier_vehicle: order.courier?.vehicle || null,
      courier_matricule: order.courier?.matricule || null,
      courier_current_zone: order.courier?.currentZone || null,
      app_data: orderForDatabase(order),
      created_at: order.createdAt,
      updated_at: new Date().toISOString(),
    };

    const itemRows = (order.items || []).map((item) => {
      const matchedProduct = item.productId
        ? store.products.find((product) => product.id === item.productId)
        : undefined;
      const hasMatchingVariant = Boolean(
        matchedProduct && item.variant && matchedProduct.variants?.some((variant) => variant.label === item.variant)
      );
      return {
        product_id: matchedProduct && hasMatchingVariant ? matchedProduct.id : null,
        product_name: item.productName,
        variant: item.variant || null,
        price: Math.max(0, Math.trunc(numberOr(item.price))),
        quantity: Math.max(1, Math.trunc(numberOr(item.quantity, 1))),
        total: Math.max(0, Math.trunc(numberOr(item.total))),
        is_quote: Boolean(item.isQuote),
      };
    });

    const requestedByProduct = new Map<string, number>();
    for (const item of order.items || []) {
      if (item.isQuote || numberOr(item.price) <= 0 || !item.productId) continue;
      requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) || 0) + Math.max(1, Math.trunc(numberOr(item.quantity, 1))));
    }

    const { data, error } = await this.client.rpc('app_create_order_atomic', {
      p_order: orderRow,
      p_items: itemRows,
      p_stock_requests: Array.from(requestedByProduct, ([productId, quantity]) => ({ productId, quantity })),
    });
    assertNoError(`création atomique de la commande ${order.reference}`, error);

    const result = dataObject(data);
    const canonicalOrder = clone(dataObject(result.order)) as unknown as Order;
    if (!canonicalOrder.id || !canonicalOrder.reference) {
      throw new Error('Supabase a accepté la commande sans retourner sa confirmation complète. Consultez « Mes commandes » avant de réessayer.');
    }
    const stocks = rows(result.stocks).map((row) => ({
      productId: String(row.productId || ''),
      quantity: Math.max(0, Math.trunc(numberOr(row.quantity))),
    })).filter((stock) => stock.productId);
    const created = result.created !== false;

    if (created) {
      const orderIndex = this.baseline.orders.findIndex((item) => item.id === canonicalOrder.id);
      if (orderIndex >= 0) this.baseline.orders[orderIndex] = clone(canonicalOrder);
      else this.baseline.orders.unshift(clone(canonicalOrder));

      for (const stock of stocks) {
        const product = this.baseline.products.find((item) => item.id === stock.productId);
        if (product) {
          product.quantityAvailable = stock.quantity;
          product.stockQuantity = stock.quantity;
          product.status = stock.quantity > 0 ? 'disponible' : 'rupture';
          product.hasPhysicalStock = stock.quantity > 0;
        }
      }
    }

    return { order: canonicalOrder, created, stocks };
  }

  private async persistProducts(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.products || []).map((item) => [item.id, item]));
    const currentById = new Map(store.products.map((item) => [item.id, item]));
    for (const product of store.products) {
      const previous = oldById.get(product.id);
      if (previous && same(previous, product)) continue;
      // Only stock-specific flows (such as an authorized CSV stock import)
      // should write inventory values through this general product upsert.
      // Metadata edits must let the SQL function retain the latest values in
      // Supabase, even when this Vercel instance has a stale in-memory copy.
      const currentStock = product.quantityAvailable ?? product.stockQuantity;
      const previousStock = previous?.quantityAvailable ?? previous?.stockQuantity;
      const allowInventoryUpdate = !previous || currentStock !== previousStock;
      const allowStatusUpdate = !previous || allowInventoryUpdate || previous.status !== product.status;
      const allowPurchasePriceUpdate = !previous
        || numberOr(previous.purchasePrice) !== numberOr(product.purchasePrice)
        || previous.purchasePriceVerified !== product.purchasePriceVerified;
      const extra = {
        specialty: product.specialty,
        specifications: product.specifications,
        thumbnailUrl: product.thumbnailUrl,
        galleryImages: product.galleryImages,
        pdfNoticeUrl: product.pdfNoticeUrl,
        pdfNoticeName: product.pdfNoticeName,
        stockQuantity: product.stockQuantity,
        quantityAvailable: product.quantityAvailable,
        lowStockAlertThreshold: product.lowStockAlertThreshold,
        purchasePriceVerified: product.purchasePriceVerified === true,
      };
      const productRow = {
        __allow_inventory_update: allowInventoryUpdate,
        __allow_status_update: allowStatusUpdate,
        __allow_purchase_price_update: allowPurchasePriceUpdate,
        id: product.id,
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || null,
        description: product.description || null,
        status: product.status,
        image_url: product.image || product.thumbnailUrl || null,
        is_promotion: Boolean(product.isPromotion),
        discount_percentage: Math.max(0, Math.min(100, Math.trunc(numberOr(product.discountPercentage)))),
        original_price: numberOr(product.originalPrice),
        purchase_price: numberOr(product.purchasePrice),
        alert_threshold: Math.max(0, Math.trunc(numberOr(product.alertThreshold ?? product.lowStockAlertThreshold, 15))),
        app_data: extra,
        created_at: (product as any).createdAt || undefined,
        updated_at: new Date().toISOString(),
      };
      const { error } = await this.client.rpc('app_save_product', {
        p_product: productRow,
        p_variants: (product.variants || []).map((variant) => ({
          label: String(variant.label),
          price: Math.max(0, Math.trunc(numberOr(variant.price))),
          original_price: variant.originalPrice == null ? null : Math.max(0, Math.trunc(numberOr(variant.originalPrice))),
          discount_percentage: variant.discountPercentage == null ? null : Math.max(0, Math.min(100, Math.trunc(numberOr(variant.discountPercentage)))),
        })),
      });
      assertNoError(`enregistrement du produit ${product.id}`, error);
    }
    for (const previous of oldById.values()) {
      if (!currentById.has(previous.id)) {
        const { error } = await this.client.from('products').delete().eq('id', previous.id);
        assertNoError(`suppression du produit ${previous.id}`, error);
      }
    }
  }

  private async persistPacks(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.packs || []).map((item) => [item.id, item]));
    const currentById = new Map(store.packs.map((item) => [item.id, item]));
    for (const pack of store.packs) {
      const previous = oldById.get(pack.id);
      if (previous && same(previous, pack)) continue;
      const { error } = await this.client.from('packs').upsert({
        id: pack.id,
        title: pack.title,
        description: pack.description || null,
        price: Math.max(0, Math.trunc(numberOr(pack.price))),
        items: pack.items || [],
        image_url: pack.image || null,
        end_date: pack.endDate || null,
        active: Boolean(pack.active),
      }, { onConflict: 'id' });
      assertNoError(`enregistrement du pack ${pack.id}`, error);
    }
    for (const previous of oldById.values()) {
      if (!currentById.has(previous.id)) {
        const { error } = await this.client.from('packs').delete().eq('id', previous.id);
        assertNoError(`suppression du pack ${previous.id}`, error);
      }
    }
  }

  private async persistAccounts(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.accounts || []).map((item) => [item.user.id, item]));
    for (const account of store.accounts) {
      const previous = oldById.get(account.user.id);
      if (previous && same(previous, account)) continue;
      await this.saveAccount(account);
    }
  }

  private async persistStaffAccounts(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.staffAccounts || []).map((item) => [item.id, item]));
    for (const account of store.staffAccounts || []) {
      const previous = oldById.get(account.id);
      if (previous && same(previous, account)) continue;
      const extendedPayload = {
        id: account.id,
        identifier: account.identifier,
        name: account.name,
        role: account.role,
        password_hash: account.passwordHash,
        is_active: account.active,
        permissions: account.permissions || null,
        last_seen_at: account.lastSeenAt || null,
        last_login_at: account.lastLoginAt || null,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
      };
      let { error } = await this.client.from('app_staff_accounts').upsert(extendedPayload, { onConflict: 'id' });
      if (error && /permissions|last_seen_at|last_login_at|column/i.test(error.message || '')) {
        const fallbackResult = await this.client.from('app_staff_accounts').upsert({
          id: account.id,
          identifier: account.identifier,
          name: account.name,
          role: account.role,
          password_hash: account.passwordHash,
          is_active: account.active,
          created_at: account.createdAt,
          updated_at: account.updatedAt,
        }, { onConflict: 'id' });
        error = fallbackResult.error;
      }
      assertNoError(`enregistrement du compte collaborateur ${account.id}`, error);
    }
  }

  private async persistRuntimeSettings(store: PersistentServerStore): Promise<void> {
    if (!store.volumeDiscounts) return;
    if (same(this.baseline?.volumeDiscounts, store.volumeDiscounts)) return;
    const { error } = await this.client.from('app_runtime_settings').upsert({
      setting_key: 'volume_discounts',
      setting_value: store.volumeDiscounts,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });
    if (this.isMissingTableError(error, 'app_runtime_settings')) return;
    assertNoError('enregistrement des paliers de remise volume', error);
  }

  private async persistActivityLogs(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.staffLogs || []).map((item) => [item.id, item]));
    const currentLogs = store.staffLogs || [];
    for (const log of currentLogs) {
      const previous = oldById.get(log.id);
      if (previous && same(previous, log)) continue;
      const resolvedUserId = log.userId || log.actorId || 'system';
      const resolvedActionType = log.actionType || log.actionLabel || 'ACTION';
      const resolvedEntityType = log.entityType || log.targetType || 'settings';
      const resolvedEntityId = log.entityId || log.targetId || log.targetLabel || 'global';
      const detailsJsonb = {
        message: log.details,
        actorId: log.actorId || resolvedUserId,
        actorName: log.actorName,
        actorRole: log.actorRole,
        category: log.category,
        severity: log.severity,
        actionLabel: log.actionLabel,
        targetType: log.targetType,
        targetId: log.targetId || resolvedEntityId,
        targetLabel: log.targetLabel,
        previousValue: log.previousValue || null,
        newValue: log.newValue || null,
      };
      let { error } = await this.client.from('activity_logs').upsert({
        id: log.id,
        user_id: resolvedUserId,
        action_type: resolvedActionType,
        entity_type: resolvedEntityType,
        entity_id: resolvedEntityId,
        details: detailsJsonb,
        created_at: log.timestamp,
        userId: resolvedUserId,
        actionType: resolvedActionType,
        entityType: resolvedEntityType,
        entityId: resolvedEntityId,
        timestamp: log.timestamp,
        actor_name: log.actorName,
        actor_role: log.actorRole,
        category: log.category,
        severity: log.severity,
        action_label: log.actionLabel,
        target_label: log.targetLabel,
        previous_value: log.previousValue || null,
        new_value: log.newValue || null,
        app_data: log,
      }, { onConflict: 'id' });

      if (error && /column|schema/i.test(error.message || '')) {
        const fallbackResult = await this.client.from('activity_logs').upsert({
          id: log.id,
          user_id: resolvedUserId,
          action_type: resolvedActionType,
          entity_type: resolvedEntityType,
          entity_id: resolvedEntityId,
          details: detailsJsonb,
          created_at: log.timestamp,
        }, { onConflict: 'id' });
        error = fallbackResult.error;
      }

      if (this.isMissingTableError(error, 'activity_logs')) return;
      assertNoError(`enregistrement du log collaborateur ${log.id} dans activity_logs`, error);
    }
  }

  private profileRow(user: User): Row {
    return {
      phone: user.phone || null,
      email: user.email || null,
      facility_name: user.facilityName || 'Direction Gloryday Pharma',
      contact_name: user.contactName || null,
      facility_type: user.facilityType || 'Clinique',
      job_title: ['directeur', 'docteur', 'charge_commandes'].includes(String(user.jobTitle)) ? user.jobTitle : null,
      director_approval_status: user.directorApprovalStatus || 'none',
      role: user.role,
      is_active: user.accountStatus ? user.accountStatus === 'actif' : true,
      delivery_address: user.deliveryAddress || null,
      total_spent: Math.max(0, Math.trunc(numberOr(user.totalSpent))),
      total_orders_count: Math.max(0, Math.trunc(numberOr(user.totalOrdersCount))),
    };
  }

  private async saveAccount(account: StoredUserAccount): Promise<string> {
    const user = account.user;
    const knownId = this.profileIds.get(user.id);
    const { data, error } = await this.client.rpc('app_save_user', {
      p_app_user_id: user.id,
      p_profile: this.profileRow(user),
      p_password_hash: account.passwordHash || null,
      p_user_data: user,
    });
    assertNoError(`enregistrement sécurisé du compte ${user.id}`, error);
    const profileId = String(data || knownId || '');
    if (!profileId) throw new Error(`Supabase n’a pas retourné l’identifiant du profil ${user.id}.`);
    this.profileIds.set(user.id, profileId);
    return profileId;
  }

  private async ensureProfile(user: User, passwordHash?: string): Promise<string> {
    const known = this.profileIds.get(user.id);
    const { data, error } = await this.client.rpc('app_save_user', {
      p_app_user_id: user.id,
      p_profile: this.profileRow(user),
      p_password_hash: passwordHash || null,
      p_user_data: user,
    });
    assertNoError(`création du profil lié à ${user.id}`, error);
    const profileId = String(data || known || '');
    if (!profileId) throw new Error(`Supabase n’a pas retourné l’identifiant du profil ${user.id}.`);
    this.profileIds.set(user.id, profileId);
    return profileId;
  }

  private async profileIdFor(userId: string | undefined, store: PersistentServerStore): Promise<string | null> {
    if (!userId) return null;
    const known = this.profileIds.get(userId);
    if (known) return known;
    const account = store.accounts.find((item) => item.user.id === userId);
    if (account) return this.saveAccount(account);
    return null;
  }

  private async persistOrders(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.orders || []).map((item) => [item.id, item]));
    for (const order of store.orders) {
      const previous = oldById.get(order.id);
      if (previous && same(previous, order)) continue;
      const customer = order.customer;
      const fallbackUserId = order.userId || `usr-phone-${String(customer.phone || order.id).replace(/\D/g, '') || order.id}`;
      let profileId = await this.profileIdFor(fallbackUserId, store);
      if (!profileId) {
        const account: StoredUserAccount | undefined =
          store.accounts.find((item) => item.user.id === fallbackUserId) ||
          store.accounts.find((item) => item.user.phone && item.user.phone === customer.phone);
        if (account) {
          profileId = await this.saveAccount(account);
        } else {
          const minimalUser: User = {
            id: fallbackUserId,
            phone: customer.phone,
            facilityName: customer.facilityName,
            contactName: customer.contactName,
            facilityType: customer.facilityType,
            role: 'client',
            createdAt: order.createdAt,
            deliveryAddress: customer.deliveryAddress,
          };
          profileId = await this.ensureProfile(minimalUser);
        }
      }
      if (!profileId) throw new Error(`La commande ${order.reference} n’a pas de compte client associé dans Supabase.`);

      const orderRow = {
        id: order.id,
        reference: order.reference,
        client_id: profileId,
        facility_name: customer.facilityName,
        contact_name: customer.contactName || null,
        phone: customer.phone,
        facility_type: customer.facilityType || null,
        delivery_mode: customer.deliveryMode === 'retrait' ? 'retrait' : 'livraison',
        payment_method: customer.paymentMethod || 'especes',
        delivery_address: customer.deliveryAddress || 'Libreville, Gabon',
        neighborhood_id: customer.neighborhoodId || null,
        neighborhood_name: customer.neighborhoodName || null,
        delivery_zone: order.deliveryZone || null,
        delivery_fee: Math.max(0, Math.trunc(numberOr(order.deliveryFee ?? customer.deliveryFee))),
        delivery_estimated: order.deliveryEstimated || null,
        order_type: order.hasQuoteItems ? 'devis' : 'standard',
        has_quote_items: Boolean(order.hasQuoteItems),
        estimated_total: Math.max(0, Math.trunc(numberOr(order.estimatedTotal))),
        status: order.status,
        is_paid: Boolean(order.isPaid),
        delivery_stage: order.deliveryStage || 'preparation',
        cancellation_reason: order.cancellationReason || null,
        notes: customer.notes || null,
        pdf_url: pdfUrlForDatabase(order.pdfUrl),
        courier_name: order.courier?.name || null,
        courier_phone: order.courier?.phone || null,
        courier_vehicle: order.courier?.vehicle || null,
        courier_matricule: order.courier?.matricule || null,
        courier_current_zone: order.courier?.currentZone || null,
        app_data: orderForDatabase(order),
        created_at: order.createdAt,
        updated_at: new Date().toISOString(),
      };
      const itemRows = (order.items || []).map((item) => {
        const matchedProduct = item.productId
          ? store.products.find((product) => product.id === item.productId)
          : undefined;
        const hasMatchingVariant = Boolean(
          matchedProduct &&
          item.variant &&
          matchedProduct.variants?.some((v) => v.label === item.variant)
        );
        return {
          product_id: matchedProduct && hasMatchingVariant ? matchedProduct.id : null,
          product_name: item.productName,
          variant: item.variant || null,
          price: Math.max(0, Math.trunc(numberOr(item.price))),
          quantity: Math.max(1, Math.trunc(numberOr(item.quantity, 1))),
          total: Math.max(0, Math.trunc(numberOr(item.total))),
          is_quote: Boolean(item.isQuote),
        };
      });

      let { error } = await this.client.rpc('app_save_order', {
        p_order: orderRow,
        p_items: itemRows,
      });

      if (error) {
        const { error: upsertError } = await this.client
          .from('orders')
          .upsert(orderRow, { onConflict: 'id' });

        if (!upsertError) {
          const validCatalogItems = itemRows.filter((item) => Boolean(item.product_id && item.variant));
          const { error: itemsError } = await this.client.rpc('app_replace_order_items', {
            p_order_id: order.id,
            p_items: validCatalogItems,
          });
          if (itemsError && itemsError.code !== 'P0001') {
            error = itemsError;
          } else {
            const { error: restoreTotalsError } = await this.client
              .from('orders')
              .update({
                client_id: profileId,
                estimated_total: orderRow.estimated_total,
                delivery_fee: orderRow.delivery_fee,
                status: orderRow.status,
                is_paid: orderRow.is_paid,
                delivery_stage: orderRow.delivery_stage,
                pdf_url: orderRow.pdf_url,
                app_data: orderRow.app_data,
                updated_at: orderRow.updated_at,
              })
              .eq('id', order.id);
            error = restoreTotalsError;
          }
        } else {
          error = upsertError;
        }
      }

      assertNoError(`enregistrement de la commande ${order.reference}`, error);
    }
  }

  private async persistQuotes(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.quotes || []).map((item) => [item.id, item]));
    for (const quote of store.quotes) {
      const previous = oldById.get(quote.id);
      if (previous && same(previous, quote)) continue;
      const { error } = await this.client.from('quotes').upsert({
        id: quote.id,
        reference: quote.reference,
        created_at: quote.createdAt,
        valid_until: quote.validUntil || null,
        commercial_id: this.profileIds.get(quote.commercialId) || null,
        commercial_name: quote.commercialName || null,
        customer_id: quote.customerId || null,
        customer: quote.customer || null,
        items: quote.items || [],
        subtotal: numberOr(quote.subtotal),
        discount_type: quote.discountType || 'percent',
        discount_value: numberOr(quote.discountValue),
        discount_amount: numberOr(quote.discountAmount),
        final_total: numberOr(quote.finalTotal),
        status: quote.status || 'Brouillon',
        notes: quote.notes || null,
        app_data: quote,
      }, { onConflict: 'id' });
      assertNoError(`enregistrement du devis ${quote.reference}`, error);
    }
  }

  private async persistExpenses(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.expenses || []).map((item) => [item.id, item]));
    for (const expense of store.expenses || []) {
      const previous = oldById.get(expense.id);
      if (previous && same(previous, expense)) continue;
      await this.upsertOperatingExpense(expense);
    }
  }

  private async upsertOperatingExpense(expense: OperatingExpense): Promise<void> {
    const { error } = await this.client.from('operating_expenses').upsert({
      id: expense.id,
      expense_date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      payment_method: expense.paymentMethod || null,
      supplier: expense.supplier || null,
      reference: expense.reference || null,
      status: expense.status,
      recorded_by_id: expense.recordedById,
      recorded_by_name: expense.recordedByName,
      created_at: expense.createdAt,
      voided_at: expense.voidedAt || null,
      voided_by_id: expense.voidedById || null,
      voided_by_name: expense.voidedByName || null,
      void_reason: expense.voidReason || null,
      app_data: expense,
    }, { onConflict: 'id' });
    assertNoError(`enregistrement de la dépense ${expense.id}`, error);
  }

  private async persistCollectionReminders(store: PersistentServerStore): Promise<void> {
    if (!this.collectionRemindersTableAvailable) return;
    const oldIds = new Set((this.baseline?.collectionReminders || []).map((item) => item.id));
    for (const reminder of store.collectionReminders || []) {
      if (oldIds.has(reminder.id)) continue;
      await this.upsertCollectionReminder(reminder);
    }
  }

  private async upsertCollectionReminder(reminder: CollectionReminder): Promise<void> {
    const { error } = await this.client.from('collection_reminders').upsert({
      id: reminder.id,
      order_id: reminder.orderId,
      order_reference: reminder.orderReference,
      client_id: reminder.clientId || null,
      client_name: reminder.clientName,
      occurred_at: reminder.occurredAt,
      channel: reminder.channel,
      outcome: reminder.outcome,
      notes: reminder.notes || null,
      next_follow_up_date: reminder.nextFollowUpDate || null,
      recorded_by_id: reminder.recordedById,
      recorded_by_name: reminder.recordedByName,
      recorded_by_role: reminder.recordedByRole,
      app_data: reminder,
    }, { onConflict: 'id' });
    assertNoError(`enregistrement de la relance ${reminder.id}`, error);
  }

  private async persistMessages(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.messages || []).map((item) => [item.id, item]));
    for (const message of store.messages) {
      const previous = oldById.get(message.id);
      if (previous && same(previous, message)) continue;
      const senderAccount = store.accounts.find((item) => item.user.id === message.senderId);
      const senderUser = senderAccount?.user || {
        id: message.senderId,
        phone: '',
        facilityName: 'Direction Gloryday Pharma',
        contactName: message.senderName,
        role: message.senderRole || 'Super-Admin',
        createdAt: message.createdAt,
      } as User;
      const senderProfileId = await this.ensureProfile(senderUser, senderAccount?.passwordHash);
      const recipientId = message.recipientId && message.recipientId !== 'staff' ? message.recipientId : undefined;
      const recipientProfileId = await this.profileIdFor(recipientId, store);
      const { error } = await this.client.from('direct_messages').upsert({
        id: message.id,
        sender_id: senderProfileId,
        receiver_id: recipientProfileId,
        sender_name: message.senderName,
        sender_role: message.senderRole || senderUser.role,
        content: message.content,
        is_read: Boolean((message as any).isRead),
        created_at: message.createdAt,
        app_data: message,
      }, { onConflict: 'id' });
      assertNoError(`enregistrement du message ${message.id}`, error);
    }
  }

  private async persistNotifications(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.notifications || []).map((item) => [item.id, item]));
    const changedRows: Array<{
      id: string;
      user_id: string | null;
      target_role: string;
      title: string;
      message: string;
      type: string;
      is_read: boolean;
      data: AppNotification;
      created_at: string;
    }> = [];
    for (const notification of store.notifications) {
      const previous = oldById.get(notification.id);
      if (previous && same(previous, notification)) continue;
      changedRows.push({
        id: notification.id,
        user_id: await this.profileIdFor(notification.userId, store),
        target_role: notification.targetRole,
        title: notification.title || notification.orderReference || notification.type,
        message: notification.message,
        type: notification.type,
        is_read: Boolean(notification.read),
        data: notification,
        created_at: notification.timestamp,
      });
    }

    // Campaigns can create one notification per client. Batch those rows so
    // Supabase receives a handful of requests instead of one request per user.
    for (let offset = 0; offset < changedRows.length; offset += 100) {
      const { error } = await this.client
        .from('notifications')
        .upsert(changedRows.slice(offset, offset + 100), { onConflict: 'id' });
      assertNoError('enregistrement des notifications', error);
    }
  }

  async appendDeliveryLocation(orderId: string, point: DeliveryLocationPoint, recordedBy: string): Promise<void> {
    const { error } = await this.client.rpc('app_record_delivery_location', {
      p_order_id: orderId,
      p_latitude: point.latitude,
      p_longitude: point.longitude,
      p_accuracy: point.accuracy,
      p_recorded_at: point.recordedAt,
      p_recorded_by: recordedBy,
    });
    assertNoError('enregistrement de la position du livreur', error);
  }

  async createDeliveryTrackingSession(orderId: string, tokenHash: string, expiresAt: string, createdBy: string): Promise<void> {
    const now = new Date().toISOString();
    const { error: revokeError } = await this.client
      .from('delivery_tracking_sessions')
      .update({ revoked_at: now })
      .eq('order_id', orderId)
      .is('revoked_at', null);
    assertNoError('fermeture des anciens liens GPS', revokeError);
    const { error: cleanupError } = await this.client
      .from('delivery_tracking_sessions')
      .delete()
      .eq('order_id', orderId);
    assertNoError('nettoyage des anciens liens GPS', cleanupError);
    const { error } = await this.client.from('delivery_tracking_sessions').insert({
      order_id: orderId,
      token_hash: tokenHash,
      created_by: createdBy,
      expires_at: expiresAt,
      created_at: now,
    });
    assertNoError('création du lien GPS du coursier', error);
  }

  private isMissingTableError(error: { code?: string; message?: string } | null, tableHint: string): boolean {
    if (!error) return false;
    const msg = error.message || '';
    return (
      error.code === 'PGRST205' ||
      error.code === '42P01' ||
      msg.includes(tableHint) ||
      /schema cache|does not exist/i.test(msg)
    );
  }

  async getDeliveryTrackingSession(tokenHash: string): Promise<{ orderId: string; expiresAt: string; revokedAt?: string } | null> {
    const { data, error } = await this.client
      .from('delivery_tracking_sessions')
      .select('order_id,expires_at,revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (this.isMissingTableError(error, 'delivery_tracking_sessions')) return null;
    assertNoError('validation du lien GPS', error);
    if (!data) return null;
    return {
      orderId: String(data.order_id),
      expiresAt: String(data.expires_at),
      revokedAt: data.revoked_at ? String(data.revoked_at) : undefined,
    };
  }

  async getDeliveryTrackingStatus(orderId: string): Promise<{ active: boolean; expiresAt?: string }> {
    const { data, error } = await this.client
      .from('delivery_tracking_sessions')
      .select('expires_at,revoked_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (this.isMissingTableError(error, 'delivery_tracking_sessions')) return { active: false };
    assertNoError('lecture de l’état du lien GPS', error);
    if (!data) return { active: false };
    const expiresAt = String(data.expires_at);
    return { active: !data.revoked_at && Date.parse(expiresAt) > Date.now(), expiresAt };
  }

  async createAppSession(tokenHash: string, user: User, expiresAt: string): Promise<void> {
    const { error } = await this.client.from('app_sessions').insert({
      token_hash: tokenHash,
      user_id: user.id,
      user_data: user,
      expires_at: expiresAt,
    });
    assertNoError('création de la session sécurisée', error);
  }

  async isLoginRateLimited(keyHash: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('app_auth_is_blocked', {
      p_key_hash: keyHash,
    });
    assertNoError('vérification de la limite de connexion', error);
    return Boolean(data);
  }

  async recordLoginFailure(keyHash: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('app_auth_record_failure', {
      p_key_hash: keyHash,
      p_max_attempts: 8,
      p_window_seconds: 900,
    });
    assertNoError('enregistrement d’une tentative de connexion', error);
    return Boolean(data);
  }

  async clearLoginFailures(keyHash: string): Promise<void> {
    const { error } = await this.client.rpc('app_auth_clear_failures', {
      p_key_hash: keyHash,
    });
    assertNoError('réinitialisation des tentatives de connexion', error);
  }

  async getAppSession(tokenHash: string): Promise<{ user: User; expiresAt: string } | null> {
    const { data, error } = await this.client
      .from('app_sessions')
      .select('user_data,expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (this.isMissingTableError(error, 'app_sessions')) return null;
    assertNoError('lecture de la session sécurisée', error);
    if (!data) return null;
    const expiresAt = String(data.expires_at);
    if (Date.parse(expiresAt) <= Date.now()) {
      await this.revokeAppSession(tokenHash);
      return null;
    }
    return { user: data.user_data as User, expiresAt };
  }

  async revokeAppSession(tokenHash: string): Promise<void> {
    const { error } = await this.client.from('app_sessions').delete().eq('token_hash', tokenHash);
    if (this.isMissingTableError(error, 'app_sessions')) return;
    assertNoError('fermeture de la session sécurisée', error);
  }

  async revokeAppSessionsForUser(userId: string): Promise<void> {
    const { error } = await this.client.from('app_sessions').delete().eq('user_id', userId);
    if (this.isMissingTableError(error, 'app_sessions')) return;
    assertNoError('fermeture des sessions de l’employé', error);
  }

  async revokeDeliveryTrackingSession(orderId: string): Promise<void> {
    const { error } = await this.client
      .from('delivery_tracking_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .is('revoked_at', null);
    if (this.isMissingTableError(error, 'delivery_tracking_sessions')) return;
    assertNoError('révocation du lien GPS', error);
  }

  async getDeliveryLocationHistory(orderId: string): Promise<DeliveryLocationPoint[]> {
    const { data, error } = await this.client
      .from('delivery_location_points')
      .select('latitude,longitude,accuracy,recorded_at')
      .eq('order_id', orderId)
      .order('recorded_at', { ascending: false })
      .limit(400);
    if (this.isMissingTableError(error, 'delivery_location_points')) return [];
    assertNoError('lecture du parcours du livreur', error);
    return rows(data).map((row) => ({
      latitude: numberOr(row.latitude),
      longitude: numberOr(row.longitude),
      accuracy: numberOr(row.accuracy),
      recordedAt: String(row.recorded_at),
    })).reverse();
  }

  async clearDeliveryLocationHistory(orderId: string): Promise<void> {
    const { error } = await this.client
      .from('delivery_location_points')
      .delete()
      .eq('order_id', orderId);
    if (this.isMissingTableError(error, 'delivery_location_points')) return;
    assertNoError('suppression du parcours du livreur', error);
  }
}
