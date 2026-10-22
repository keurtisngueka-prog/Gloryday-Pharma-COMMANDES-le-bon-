import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AppNotification,
  CommercialQuote,
  DirectMessage,
  Order,
  Pack,
  Product,
  User,
  AppRole,
  DeliveryLocationPoint
} from '../types.js';

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
  createdAt: string;
  updatedAt: string;
}

export interface PersistentServerStore {
  products: Product[];
  packs: Pack[];
  orders: Order[];
  accounts: StoredUserAccount[];
  staffAccounts: ManagedStaffAccount[];
  quotes: CommercialQuote[];
  messages: DirectMessage[];
  notifications: AppNotification[];
}

type Row = Record<string, any>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const dataObject = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const numberOr = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;

function mergeById<T>(remote: T[], local: T[], keyOf: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of remote) merged.set(keyOf(item), item);
  for (const item of local) if (!merged.has(keyOf(item))) merged.set(keyOf(item), item);
  return Array.from(merged.values());
}

function assertNoError(context: string, error: { message?: string } | null): void {
  if (error) throw new Error(`Supabase (${context}) : ${error.message || 'erreur inconnue'}`);
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
  private readonly profileIds = new Map<string, string>();
  private readonly client: SupabaseClient;
  private queue: Promise<void> = Promise.resolve();

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async hydrate(local: PersistentServerStore): Promise<PersistentServerStore> {
    const [productsResult, variantsResult, packsResult, ordersResult, itemsResult, usersResult, quotesResult, messagesResult, notificationsResult, staffAccountsResult] = await Promise.all([
      this.client.from('products').select('*').order('created_at', { ascending: true }),
      this.client.from('product_variants').select('*').order('id', { ascending: true }),
      this.client.from('packs').select('*').order('created_at', { ascending: true }),
      this.client.from('orders').select('*').order('created_at', { ascending: true }),
      this.client.from('order_items').select('*').order('id', { ascending: true }),
      this.client.from('app_users').select('*'),
      this.client.from('quotes').select('*').order('created_at', { ascending: true }),
      this.client.from('direct_messages').select('*').order('created_at', { ascending: true }),
      this.client.from('notifications').select('*').order('created_at', { ascending: true }),
      this.client.from('app_staff_accounts').select('*'),
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
    const staffTableMissing = staffAccountsResult.error?.code === 'PGRST205' ||
      (staffAccountsResult.error?.message || '').includes('app_staff_accounts');
    if (staffAccountsResult.error && !staffTableMissing) {
      assertNoError('lecture des comptes collaborateurs', staffAccountsResult.error);
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
        pdfUrl: row.pdf_url || saved.pdfUrl,
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

    const merged: PersistentServerStore = {
      products: mergeById(remoteProducts, local.products, (item) => item.id),
      packs: mergeById(remotePacks, local.packs, (item) => item.id),
      orders: mergeById(remoteOrders, local.orders, (item) => item.id),
      accounts: mergeById(remoteAccounts, local.accounts, (item) => item.user.id),
      staffAccounts: mergeById(remoteStaffAccounts, local.staffAccounts || [], (item) => item.id),
      quotes: mergeById(remoteQuotes, local.quotes, (item) => item.id),
      messages: mergeById(remoteMessages, local.messages, (item) => item.id),
      notifications: mergeById(remoteNotifications, local.notifications, (item) => item.id),
    };
    this.baseline = clone(merged);
    return merged;
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
      await this.persistMessages(snapshot);
      await this.persistNotifications(snapshot);
      this.baseline = clone(snapshot);
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  private async persistProducts(store: PersistentServerStore): Promise<void> {
    const oldById = new Map((this.baseline?.products || []).map((item) => [item.id, item]));
    const currentById = new Map(store.products.map((item) => [item.id, item]));
    for (const product of store.products) {
      const previous = oldById.get(product.id);
      if (previous && same(previous, product)) continue;
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
      };
      const productRow = {
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
      const { error } = await this.client.from('app_staff_accounts').upsert({
        id: account.id,
        identifier: account.identifier,
        name: account.name,
        role: account.role,
        password_hash: account.passwordHash,
        is_active: account.active,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
      }, { onConflict: 'id' });
      assertNoError(`enregistrement du compte collaborateur ${account.id}`, error);
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
      let profileId = await this.profileIdFor(order.userId, store);
      if (!profileId && order.userId) {
        const customer = order.customer;
        const account: StoredUserAccount | undefined = store.accounts.find((item) => item.user.id === order.userId);
        if (account) profileId = await this.saveAccount(account);
        else {
          const minimalUser: User = {
            id: order.userId,
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

      const customer = order.customer;
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
        pdf_url: order.pdfUrl || null,
        courier_name: order.courier?.name || null,
        courier_phone: order.courier?.phone || null,
        courier_vehicle: order.courier?.vehicle || null,
        courier_matricule: order.courier?.matricule || null,
        courier_current_zone: order.courier?.currentZone || null,
        app_data: order,
        created_at: order.createdAt,
        updated_at: new Date().toISOString(),
      };
      const itemRows = (order.items || []).map((item) => ({
        product_id: item.productId && store.products.some((product) => product.id === item.productId) ? item.productId : null,
        product_name: item.productName,
        variant: item.variant || null,
        price: Math.max(0, Math.trunc(numberOr(item.price))),
        quantity: Math.max(1, Math.trunc(numberOr(item.quantity, 1))),
        total: Math.max(0, Math.trunc(numberOr(item.total))),
        is_quote: Boolean(item.isQuote),
      }));
      const { error } = await this.client.rpc('app_save_order', {
        p_order: orderRow,
        p_items: itemRows,
      });
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
    for (const notification of store.notifications) {
      const previous = oldById.get(notification.id);
      if (previous && same(previous, notification)) continue;
      const { error } = await this.client.from('notifications').upsert({
        id: notification.id,
        user_id: await this.profileIdFor(notification.userId, store),
        target_role: notification.targetRole,
        title: notification.title || notification.orderReference || notification.type,
        message: notification.message,
        type: notification.type,
        is_read: Boolean(notification.read),
        data: notification,
        created_at: notification.timestamp,
      }, { onConflict: 'id' });
      assertNoError(`enregistrement de la notification ${notification.id}`, error);
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
    if (this.isMissingTableError(error, 'app_sessions')) return;
    assertNoError('création de la session sécurisée', error);
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
