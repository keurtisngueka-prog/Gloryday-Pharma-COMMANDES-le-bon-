import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { createRequire } from 'module';
import { INITIAL_PRODUCTS, INITIAL_PACKS, LEGACY_DEMO_PRODUCT_IDS, LEGACY_DEMO_PACK_IDS } from './src/data/initialProducts.js';
import { buildNeighborhoodDeliveryAddress, getEstimatedDeliveryText, getNeighborhoodById, resolveOrderDestinationCoordinates } from './src/data/librevilleZones.js';
import {
  calculateCartVolumeSummary,
  calculateItemVolumePrice,
  DEFAULT_VOLUME_DISCOUNT_SETTINGS,
  sanitizeVolumeDiscountSettings,
  setActiveVolumeDiscountSettings
} from './src/utils/volumeDiscount.js';
import { getOrderPaidAmount, getOrderRemainingBalance } from './src/utils/orderFinance.js';
import { ALL_CONFIGURABLE_PERMISSIONS, getDefaultStaffPermissions, normalizeStaffPermissions } from './src/permissions.js';
import {
  createSupabaseStorePersistence,
  type ClientWorkspace,
  type ManagedStaffAccount,
  type PersistentServerStore,
  type StaffRole,
  type StoredUserAccount,
  type SupabaseStorePersistence
} from './src/lib/supabaseStorePersistence.js';
import type {
  Product,
  Pack,
  Order,
  CartItem,
  User,
  FacilityType,
  AppNotification,
  AdminStats,
  CommercialQuote,
  DirectMessage,
  AppRole,
  DeliveryStage,
  OrderStatus,
  PaymentInstallment,
  InvoiceRecord,
  CourierInfo,
  DeliveryProof,
  DeliveryLocationPoint,
  StaffPermission,
  VolumeDiscountSettings,
  StaffActivityStats,
  StaffActivityLog,
  StaffLogCategory,
  StaffLogSeverity,
  StockBatch,
  StockMovement,
  OperatingExpense,
  OperatingExpenseCategory,
  CollectionReminder,
  OrderDraft,
  CollectionReminderChannel,
  CollectionReminderOutcome
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/tmp/gloryday-pharma' : path.join(__dirname, 'data'));
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const scrypt = promisify(scryptCallback);
const requireFromProject = createRequire(import.meta.url);
const SESSION_COOKIE = 'gloryday_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const STAFF_ROLES: StaffRole[] = ['Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'];
const OPERATING_EXPENSE_CATEGORIES: OperatingExpenseCategory[] = [
  'transport', 'loyer', 'salaires', 'communication', 'fournitures', 'frais_bancaires', 'autre'
];
const COLLECTION_REMINDER_CHANNELS: CollectionReminderChannel[] = [
  'telephone', 'whatsapp', 'sms', 'email', 'site', 'visite', 'autre'
];
const COLLECTION_REMINDER_OUTCOMES: CollectionReminderOutcome[] = [
  'client_joint', 'message_envoye', 'message_prepare', 'sans_reponse', 'promesse_paiement', 'contestation', 'autre'
];
type SessionEntry = { user: User; expiresAt: number };
type StoredDeliveryTrackingSession = { token?: string; tokenHash: string; expiresAt: string; createdAt: string; revokedAt?: string };
type ServerStore = PersistentServerStore & {
  expenses: OperatingExpense[];
  collectionReminders: CollectionReminder[];
  stockMovements: StockMovement[];
  stockBatches: StockBatch[];
  clientWorkspaces?: Record<string, ClientWorkspace>;
  deliveryLocations?: Record<string, DeliveryLocationPoint[]>;
  deliveryTrackingSessions?: Record<string, StoredDeliveryTrackingSession>;
};
type AuthenticatedRequest = express.Request & { authenticatedUser?: User };
const asyncHandler = (handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>): express.RequestHandler =>
  (req, res, next) => { void handler(req, res, next).catch(next); };

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return scrypt(password, salt, 64).then((derived) => `scrypt$${salt}$${(derived as Buffer).toString('hex')}`);
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const derived = await scrypt(password, parts[1], 64) as Buffer;
    const expected = Buffer.from(parts[2], 'hex');
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanUser(user: User): User {
  return { ...user };
}

function normalizePhone(p: string): string {
  return (p || '').replace(/[\s\-\.\(\)]/g, '').toLowerCase();
}

function normalizeStaffIdentifier(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isStaffRole(value: unknown): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

function environmentStaffAccounts(): Array<{ identifier: string; name: string; role: StaffRole; password: string }> {
  let configured: Array<{ identifier?: string; password?: string; role?: AppRole; name?: string }> = [];
  try { configured = JSON.parse(process.env.STAFF_ACCOUNTS_JSON || '[]'); } catch { configured = []; }
  if (!Array.isArray(configured)) return [];
  return configured.flatMap((item) => {
    const identifier = normalizeStaffIdentifier(item?.identifier);
    if (!identifier || !item.password || item.password.length < 8 || item.password.length > 85 || !isStaffRole(item.role)) return [];
    return [{ identifier, name: String(item.name || item.role).slice(0, 100), role: item.role, password: item.password }];
  });
}

const ALL_STAFF_PERMISSIONS: StaffPermission[] = [...ALL_CONFIGURABLE_PERMISSIONS, 'catalog_stock', 'orders_manage', 'orders_status_manage'];

function getDefaultPermissionsForRole(role: StaffRole): StaffPermission[] {
  return getDefaultStaffPermissions(role);
}

function sanitizePermissions(input: unknown, fallbackRole: StaffRole): StaffPermission[] {
  const normalized = normalizeStaffPermissions(input, fallbackRole);
  return normalized.filter((permission) => ALL_STAFF_PERMISSIONS.includes(permission));
}

function hasStockPermission(user: User | null | undefined, permission: Extract<StaffPermission, 'stock_view' | 'stock_receive' | 'stock_adjust' | 'stock_batches_manage' | 'stock_availability_manage' | 'stock_costs_view' | 'stock_costs_manage' | 'stock_export'>): boolean {
  if (!user) return false;
  if (user.role === 'Super-Admin') return true;
  const permissions = user.permissions || [];
  if (permissions.includes('catalog_stock') || permissions.includes(permission)) return true;
  if (permission === 'stock_costs_view' && permissions.includes('stock_costs_manage')) return true;
  return permission === 'stock_view' && [
    'stock_receive', 'stock_adjust', 'stock_batches_manage', 'stock_availability_manage', 'stock_costs_manage', 'stock_export'
  ].some((implied) => permissions.includes(implied as StaffPermission));
}

function hasCatalogPermission(user: User | null | undefined, permission: 'catalog_view' | 'catalog_manage'): boolean {
  if (!user) return false;
  if (user.role === 'Super-Admin') return true;
  const permissions = user.permissions || [];
  return permissions.includes('catalog_stock') || permissions.includes(permission);
}

function computeStaffStats(accountId: string, accountName: string, store: ServerStore, lastLoginAt?: string): StaffActivityStats {
  const normName = (accountName || '').trim().toLowerCase();
  const ordersProcessed = store.orders.filter(o =>
    o.assignedCommercialId === accountId ||
    (normName && o.courier?.name?.trim().toLowerCase() === normName)
  ).length;
  const quotesManaged = store.quotes.filter(q =>
    q.commercialId === accountId ||
    (normName && q.commercialName?.trim().toLowerCase() === normName)
  ).length;
  const deliveriesHandled = store.orders.filter(o =>
    o.status === 'Livrée' && (
      o.assignedCommercialId === accountId ||
      (normName && o.courier?.name?.trim().toLowerCase() === normName)
    )
  ).length;
  return {
    ordersProcessed,
    quotesManaged,
    deliveriesHandled,
    lastLoginAt,
  };
}

function staffAccountSummary(account: ManagedStaffAccount, store?: ServerStore, activeUserIds?: Set<string>) {
  const permissions = sanitizePermissions(account.permissions, account.role);
  const lastSeenMs = account.lastSeenAt ? Date.parse(account.lastSeenAt) : 0;
  const isRecentlySeen = Number.isFinite(lastSeenMs) && (Date.now() - lastSeenMs) < 5 * 60 * 1000;
  const isOnline = Boolean(account.active && ((activeUserIds && activeUserIds.has(account.id)) || isRecentlySeen));
  return {
    id: account.id,
    identifier: account.identifier,
    name: account.name,
    role: account.role,
    active: account.active,
    permissions,
    isOnline,
    lastSeenAt: account.lastSeenAt || account.lastLoginAt || account.updatedAt,
    lastLoginAt: account.lastLoginAt,
    stats: store ? computeStaffStats(account.id, account.name, store, account.lastLoginAt) : undefined,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    source: 'managed' as const,
  };
}

function isStaffAccountsMigrationError(error: unknown): boolean {
  return /app_staff_accounts|PGRST205|42P01|schema cache/i.test(error instanceof Error ? error.message : String(error));
}

function isDeliveryLocationsMigrationError(error: unknown): boolean {
  return /delivery_location_points|delivery_tracking_sessions|app_record_delivery_location|PGRST205|42P01|schema cache/i.test(error instanceof Error ? error.message : String(error));
}

function isStockLedgerMigrationError(error: unknown): boolean {
  return /stock_movements|stock_batches|stock_batch_movements|app_receive_product_stock_with_batch|app_set_stock_batch_status|app_cancel_order_and_restore_stock|app_create_order_atomic_(?:pre|without)_stock_ledger|PGRST202|PGRST205|42P01|schema cache/i.test(error instanceof Error ? error.message : String(error));
}

function isOperatingExpensesMigrationError(error: unknown): boolean {
  return /operating_expenses|PGRST205|42P01|schema cache/i.test(error instanceof Error ? error.message : String(error));
}

function isCollectionRemindersMigrationError(error: unknown): boolean {
  return /collection_reminders|PGRST205|42P01|schema cache/i.test(error instanceof Error ? error.message : String(error));
}

function loadStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const rawProducts: Product[] = Array.isArray(parsed.products) ? parsed.products : [];
      const rawPacks: Pack[] = Array.isArray(parsed.packs) ? parsed.packs : [];
      const cleanedProducts = rawProducts.filter(p => p && typeof p.id === 'string' && !LEGACY_DEMO_PRODUCT_IDS.has(p.id));
      const cleanedPacks = rawPacks.filter(pk => pk && typeof pk.id === 'string' && !LEGACY_DEMO_PACK_IDS.has(pk.id));

      // Merge official catalog products while preserving any existing stock/price overrides
      const existingProductMap = new Map<string, Product>();
      for (const p of cleanedProducts) {
        if (p && p.id) existingProductMap.set(p.id, p);
      }
      for (const initialProduct of INITIAL_PRODUCTS) {
        if (!existingProductMap.has(initialProduct.id)) {
          existingProductMap.set(initialProduct.id, { ...initialProduct });
        }
      }
      const syncedProducts = Array.from(existingProductMap.values());

      const loadedStore: ServerStore = {
        products: syncedProducts,
        packs: cleanedPacks,
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        staffAccounts: Array.isArray(parsed.staffAccounts) ? parsed.staffAccounts : [],
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        collectionReminders: Array.isArray(parsed.collectionReminders) ? parsed.collectionReminders : [],
        stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
        stockBatches: Array.isArray(parsed.stockBatches) ? parsed.stockBatches : [],
        clientWorkspaces: parsed.clientWorkspaces && typeof parsed.clientWorkspaces === 'object' && !Array.isArray(parsed.clientWorkspaces)
          ? parsed.clientWorkspaces
          : {},
        volumeDiscounts: sanitizeVolumeDiscountSettings(parsed.volumeDiscounts),
        staffLogs: Array.isArray(parsed.staffLogs) ? parsed.staffLogs.slice(0, 500) : [],
        deliveryLocations: parsed.deliveryLocations && typeof parsed.deliveryLocations === 'object' && !Array.isArray(parsed.deliveryLocations)
          ? parsed.deliveryLocations
          : {},
        deliveryTrackingSessions: parsed.deliveryTrackingSessions && typeof parsed.deliveryTrackingSessions === 'object' && !Array.isArray(parsed.deliveryTrackingSessions)
          ? parsed.deliveryTrackingSessions
          : {}
      };
      setActiveVolumeDiscountSettings(loadedStore.volumeDiscounts);
      if (syncedProducts.length !== rawProducts.length || cleanedPacks.length !== rawPacks.length) {
        saveStoreLocal(loadedStore);
      }
      return loadedStore;
    }
  } catch (err) {
    console.error('Error loading store.json, initializing fresh store:', err);
    if (fs.existsSync(STORE_PATH)) {
      throw new Error('Persistent data store is unreadable; startup stopped to prevent overwriting it.');
    }
  }

  const initialStore: ServerStore = {
    products: INITIAL_PRODUCTS,
    packs: INITIAL_PACKS,
    orders: [],
    accounts: [],
    staffAccounts: [],
    quotes: [],
    messages: [],
    notifications: [],
    expenses: [],
    collectionReminders: [],
    stockMovements: [],
    stockBatches: [],
    clientWorkspaces: {},
    volumeDiscounts: { ...DEFAULT_VOLUME_DISCOUNT_SETTINGS },
    staffLogs: [],
    deliveryLocations: {},
    deliveryTrackingSessions: {}
  };
  setActiveVolumeDiscountSettings(initialStore.volumeDiscounts);
  saveStoreLocal(initialStore);
  return initialStore;
}

function getTrackedProductStock(product: Product): number | undefined {
  const stock = typeof product.quantityAvailable === 'number'
    ? product.quantityAvailable
    : product.stockQuantity;
  return Number.isSafeInteger(stock) && (stock as number) >= 0 ? stock as number : undefined;
}

function getEffectiveProductStatus(product: Product): Product['status'] {
  return product.status === 'rupture' ? 'rupture' : 'disponible';
}

function enrichProductWithStockState(product: Product): Product {
  const stock = getTrackedProductStock(product) ?? 0;
  return {
    ...product,
    quantityAvailable: stock,
    stockQuantity: stock,
    hasPhysicalStock: stock > 0 && product.status !== 'rupture',
    status: getEffectiveProductStatus(product)
  };
}

function setTrackedProductStock(product: Product, quantity: number): void {
  product.quantityAvailable = quantity;
  product.stockQuantity = quantity;
  product.hasPhysicalStock = quantity > 0 && product.status !== 'rupture';
}

function saveStoreLocal(store: ServerStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), { encoding: 'utf-8', mode: 0o600 });
    if (process.platform !== 'win32') fs.chmodSync(STORE_PATH, 0o600);
  } catch (err) {
    console.error('Error saving store.json:', err);
    throw err;
  }
}

async function saveStore(store: ServerStore, persistence: SupabaseStorePersistence | null): Promise<void> {
  if (persistence) await persistence.persist(store);
  // In production on Vercel, Supabase is the durable source of truth. Writing
  // and JSON-stringifying the complete in-memory store to the ephemeral
  // function filesystem after every mutation only adds synchronous latency.
  if (persistence && process.env.VERCEL) return;
  try {
    saveStoreLocal(store);
  } catch (err) {
    if (!persistence) throw err;
    console.error('Supabase accepted the update, but the local cache could not be refreshed:', err);
  }
}

async function saveDirectMessage(
  store: ServerStore,
  persistence: SupabaseStorePersistence | null,
  message: DirectMessage,
  notification: AppNotification | null
): Promise<void> {
  if (persistence) await persistence.persistDirectMessage(message, notification, store);
  if (persistence && process.env.VERCEL) return;
  try {
    saveStoreLocal(store);
  } catch (err) {
    if (!persistence) throw err;
    console.error('Supabase a accepté le message, mais le cache local n’a pas pu être actualisé:', err);
  }
}

async function saveNotificationBatch(
  store: ServerStore,
  persistence: SupabaseStorePersistence | null,
  notifications: AppNotification[]
): Promise<void> {
  if (persistence) await persistence.persistNotificationBatch(notifications, store);
  if (persistence && process.env.VERCEL) return;
  try {
    saveStoreLocal(store);
  } catch (err) {
    if (!persistence) throw err;
    console.error('Supabase a accepté les notifications, mais le cache local n’a pas pu être actualisé:', err);
  }
}

async function saveOperatingExpense(
  store: ServerStore,
  persistence: SupabaseStorePersistence | null,
  expense: OperatingExpense,
  log?: StaffActivityLog
): Promise<void> {
  if (persistence) await persistence.persistOperatingExpense(expense, log);
  if (persistence && process.env.VERCEL) return;
  try {
    saveStoreLocal(store);
  } catch (err) {
    if (!persistence) throw err;
    console.error('Supabase a accepté la dépense, mais le cache local n’a pas pu être actualisé:', err);
  }
}

async function saveCollectionReminder(
  store: ServerStore,
  persistence: SupabaseStorePersistence | null,
  reminder: CollectionReminder,
  log?: StaffActivityLog
): Promise<void> {
  if (persistence) await persistence.persistCollectionReminder(reminder, log);
  if (persistence && process.env.VERCEL) return;
  try {
    saveStoreLocal(store);
  } catch (err) {
    if (!persistence) throw err;
    console.error('Supabase a accepté la relance, mais le cache local n’a pas pu être actualisé:', err);
  }
}

async function migrateLegacyPasswords(store: ServerStore): Promise<void> {
  for (const account of store.accounts) {
    if (account.passwordHash && !account.passwordHash.startsWith('scrypt$')) {
      account.passwordHash = await hashPassword(account.passwordHash);
    }
  }
  for (const order of store.orders) {
    const legacyPayment = order.mobilePayment || order.customer?.mobilePayment;
    if (legacyPayment) {
      if (legacyPayment.isPrePaid || legacyPayment.status === 'verified' || order.isPaid) {
        legacyPayment.isPrePaid = false;
        legacyPayment.status = 'pending';
        legacyPayment.validatedAt = undefined;
        order.isPaid = false;
      }
      order.mobilePayment = legacyPayment;
      if (order.customer) order.customer.mobilePayment = legacyPayment;
    }
    if (order.whatsappLogs?.length) {
      order.whatsappLogs = [];
      order.lastWhatsAppNotifiedStage = undefined;
    }
    if (order.courier?.name?.includes('Alexandre Moundounga')) {
      order.courier = undefined;
    }
  }
  // Also strips the old hard-coded adminPassword property when rewriting older stores.
  saveStoreLocal(store);
}

export async function createServerApp(options: { serveFrontend?: boolean } = {}) {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8 || process.env.ADMIN_PASSWORD.length > 85) {
      console.error('ADMIN_PASSWORD non configuré ou invalide. La connexion Super-Admin restera désactivée.');
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase doit être configuré en production. Le stockage local temporaire de Vercel ne peut pas conserver le catalogue et les commandes.');
    }
    process.env.DATA_DIR ||= '/tmp/gloryday-pharma';
  }
  const app = express();
  // Vercel is the trusted reverse proxy in production; use its forwarded client IP for rate limiting.
  app.set('trust proxy', process.env.VERCEL ? 1 : false);
  let store = loadStore();
  const persistence = createSupabaseStorePersistence();
  if (persistence) {
    try {
      const hydratedStore = await persistence.hydrate(store);
      store = {
        ...hydratedStore,
        expenses: hydratedStore.expenses || [],
        collectionReminders: hydratedStore.collectionReminders || [],
        stockMovements: hydratedStore.stockMovements || [],
        stockBatches: hydratedStore.stockBatches || []
      };
      await saveStore(store, persistence);
    } catch (error) {
      console.warn('Hydratation Supabase échouée; le démarrage sera interrompu en production :', error instanceof Error ? error.message : error);
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }
  const existingIds = new Set(store.products.map(p => p.id));
  let addedAny = false;
  for (const initProd of INITIAL_PRODUCTS) {
    if (!existingIds.has(initProd.id)) {
      store.products.push({ ...initProd });
      addedAny = true;
    }
  }
  if (addedAny) {
    await saveStore(store, persistence);
  }
  await migrateLegacyPasswords(store);
  store.deliveryLocations ||= {};
  store.deliveryTrackingSessions ||= {};
  const clearDeliveryLocations = async (orderId: string) => {
    if (persistence) {
      try {
        await persistence.clearDeliveryLocationHistory(orderId);
        await persistence.revokeDeliveryTrackingSession(orderId);
      } catch (error) {
        if (!isDeliveryLocationsMigrationError(error)) throw error;
        console.warn('GPS history cleanup skipped because the delivery location migration is not applied yet.');
      }
    }
    delete store.deliveryLocations?.[orderId];
    const trackingSession = store.deliveryTrackingSessions?.[orderId];
    if (trackingSession) trackingSession.revokedAt = new Date().toISOString();
    const order = store.orders.find(item => item.id === orderId);
    if (order) {
      order.courierTrackingToken = undefined;
      order.courierTrackingExpiresAt = undefined;
    }
    saveStoreLocal(store);
  };
  const issueCourierTrackingSession = async (order: Order, actorId = 'system'): Promise<{ token: string; expiresAt: string }> => {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
    if (persistence) {
      try {
        await persistence.createDeliveryTrackingSession(order.id, tokenHash, expiresAt, actorId);
      } catch (error) {
        if (!isDeliveryLocationsMigrationError(error)) {
          console.warn('Session GPS livreur conservée localement :', error instanceof Error ? error.message : error);
        }
      }
    }
    store.deliveryTrackingSessions ||= {};
    store.deliveryTrackingSessions[order.id] = { token, tokenHash, expiresAt, createdAt: createdAt.toISOString() };
    order.courierTrackingToken = token;
    order.courierTrackingExpiresAt = expiresAt;
    saveStoreLocal(store);
    return { token, expiresAt };
  };
  const resolveCourierTrackingToken = async (token: string) => {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const localEntry = Object.entries(store.deliveryTrackingSessions || {}).find(([, item]) => item.tokenHash === tokenHash);
    const localSession = localEntry ? { ...localEntry[1], orderId: localEntry[0] } : null;
    let session: { orderId: string; expiresAt: string; revokedAt?: string } | null = localSession;
    if (!session && persistence) {
      try {
        session = await persistence.getDeliveryTrackingSession(tokenHash);
      } catch (error) {
        if (!isDeliveryLocationsMigrationError(error)) throw error;
      }
    }
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
      const orderWithToken = store.orders.find(item => item.courierTrackingToken === token);
      if (orderWithToken && orderWithToken.courierTrackingExpiresAt && Date.parse(orderWithToken.courierTrackingExpiresAt) > Date.now()) {
        session = {
          orderId: orderWithToken.id,
          expiresAt: orderWithToken.courierTrackingExpiresAt,
        };
      } else {
        return null;
      }
    }
    const order = store.orders.find(item => item.id === session!.orderId);
    if (!order || order.status === 'Livrée' || order.status === 'Annulée' || !['preparation', 'picked_up', 'in_transit'].includes(order.deliveryStage || 'preparation')) return null;
    return { session, order };
  };

  const sessions = new Map<string, SessionEntry>();
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const deliveryTrackingLastPost = new Map<string, number>();
  const localLoginBlocked = (key: string) => {
    const entry = loginAttempts.get(key);
    return Boolean(entry && entry.resetAt > Date.now() && entry.count >= 8);
  };
  const localRecordLoginFailure = (key: string) => {
    const entry = loginAttempts.get(key);
    if (!entry || entry.resetAt <= Date.now()) loginAttempts.set(key, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
    else entry.count += 1;
  };
  const authRateLimitHash = (key: string) => createHash('sha256').update(key).digest('hex');
  const loginBlocked = async (key: string): Promise<boolean> => {
    if (persistence) {
      try {
        return await persistence.isLoginRateLimited(authRateLimitHash(key));
      } catch (error) {
        if (process.env.NODE_ENV === 'production') throw error;
        console.warn('Limitation de connexion Supabase indisponible en développement :', error instanceof Error ? error.message : error);
      }
    }
    return localLoginBlocked(key);
  };
  const recordLoginFailure = async (key: string): Promise<void> => {
    if (persistence) {
      try {
        await persistence.recordLoginFailure(authRateLimitHash(key));
        return;
      } catch (error) {
        if (process.env.NODE_ENV === 'production') throw error;
        console.warn('Enregistrement de la tentative dans Supabase indisponible en développement :', error instanceof Error ? error.message : error);
      }
    }
    localRecordLoginFailure(key);
  };
  const clearLoginFailures = async (key: string): Promise<void> => {
    if (persistence) {
      try {
        await persistence.clearLoginFailures(authRateLimitHash(key));
        return;
      } catch (error) {
        if (process.env.NODE_ENV === 'production') throw error;
        console.warn('Réinitialisation des tentatives Supabase indisponible en développement :', error instanceof Error ? error.message : error);
      }
    }
    loginAttempts.delete(key);
  };
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow iFrame embedding in AI Studio / preview environment
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  const issueSession = async (res: express.Response, user: User): Promise<void> => {
    for (const [id, entry] of sessions) if (entry.expiresAt <= Date.now()) sessions.delete(id);
    const sessionId = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    // Keep a local copy for development; production authentication also requires its persistent DB record.
    sessions.set(sessionId, { user: cleanUser(user), expiresAt });
    if (persistence) {
      try {
        const tokenHash = createHash('sha256').update(sessionId).digest('hex');
        await persistence.createAppSession(tokenHash, cleanUser(user), new Date(expiresAt).toISOString());
      } catch (error) {
        sessions.delete(sessionId);
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Impossible de créer la session sécurisée dans Supabase. Vérifiez la migration app_sessions.');
        }
        console.warn('Session conservée en mémoire (table public.app_sessions non disponible) :', error instanceof Error ? error.message : error);
      }
    }
    // The app and its API share one origin, so Lax blocks cross-site form submissions.
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS
    });
  };

  const getSessionId = (req: express.Request): string | null => {
    const cookieHeader = req.headers.cookie || '';
    const raw = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
    if (!raw) return null;
    try {
      return decodeURIComponent(raw.slice(SESSION_COOKIE.length + 1));
    } catch {
      return null;
    }
  };

  const readSession = async (req: express.Request): Promise<User | null> => {
    const sessionId = getSessionId(req);
    if (!sessionId) return null;
    if (persistence) {
      try {
        const tokenHash = createHash('sha256').update(sessionId).digest('hex');
        const remoteSession = await persistence.getAppSession(tokenHash);
        if (remoteSession) return cleanUser(remoteSession.user);
        if (process.env.NODE_ENV === 'production') return null;
      } catch (error) {
        if (process.env.NODE_ENV === 'production') return null;
        console.warn('Lecture de session Supabase ignorée, basculement sur la session en mémoire :', error instanceof Error ? error.message : error);
      }
    }
    const session = sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(sessionId);
      return null;
    }
    return session.user;
  };

  const isPublicApi = (req: express.Request) =>
    (['GET', 'HEAD'].includes(req.method) && ['/products', '/packs', '/auth/session', '/download-project-zip', '/settings/volume-discounts'].includes(req.path)) ||
    (req.method === 'POST' && ['/auth/register', '/auth/login', '/auth/admin', '/auth/google', '/auth/google/complete', '/auth/recovery-request', '/auth/logout'].includes(req.path)) ||
    (['GET', 'POST'].includes(req.method) && /^\/courier-tracking\/[A-Za-z0-9_-]{32,64}$/.test(req.path));

  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    const origin = req.headers.origin;
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
        const directHost = String(req.headers.host || '').trim();
        const isAllowedProxyOrigin =
          originHost === directHost ||
          (forwardedHost && originHost === forwardedHost) ||
          originHost.endsWith('.run.app') ||
          originHost.endsWith('.google.com') ||
          originHost.startsWith('localhost:');
        if (!isAllowedProxyOrigin) {
          res.status(403).json({ error: 'Origine de requête refusée.' });
          return;
        }
      } catch {
        res.status(403).json({ error: 'Origine de requête invalide.' });
        return;
      }
    }
    if (isPublicApi(req)) {
      next();
      return;
    }

    void readSession(req).then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Connexion requise.' });
        return;
      }

      // Update staff online heartbeat and sync latest granular permissions
      const managedStaff = store.staffAccounts.find(s => s.id === user.id);
      if (managedStaff) {
        managedStaff.lastSeenAt = new Date().toISOString();
        user.permissions = sanitizePermissions(managedStaff.permissions, managedStaff.role);
      } else if (user.role !== 'client' && user.role !== 'Super-Admin') {
        user.permissions = sanitizePermissions(user.permissions, user.role as StaffRole);
      }

      (req as AuthenticatedRequest).authenticatedUser = user;

    const role = user.role;
    const method = req.method;
    const route = req.path;
    const isSuperAdmin = role === 'Super-Admin';
    const effectivePermissions = sanitizePermissions(user.permissions, user.role as StaffRole);
    user.permissions = effectivePermissions;
    const hasPerm = (perm: StaffPermission) => isSuperAdmin || effectivePermissions.includes(perm);
    let allowed = false;

    if (/^\/products(?:\/|$)/.test(route)) {
      if (route.endsWith('/status')) allowed = hasStockPermission(user, 'stock_availability_manage');
      else if (route.endsWith('/media-upload-url') || route === '/products/bulk') allowed = hasCatalogPermission(user, 'catalog_manage');
      else if (/^\/products\/[^/]+$/.test(route)) allowed = method === 'GET' || hasCatalogPermission(user, 'catalog_manage');
      else allowed = method === 'GET' || hasCatalogPermission(user, 'catalog_manage');
    } else if (/^\/packs(?:\/|$)/.test(route)) {
      allowed = method === 'GET' || hasPerm('packs_manage');
    } else if (route === '/clients' || route.startsWith('/clients/')) {
      if (route.endsWith('/credit-terms')) allowed = method === 'PATCH' && hasPerm('clients_credit_manage');
      else if (route.endsWith('/assign')) allowed = method === 'PATCH' && hasPerm('clients_manage');
      else allowed = method === 'GET' ? hasPerm('clients_view') || hasPerm('clients_manage') || hasPerm('clients_credit_manage') : hasPerm('clients_manage');
    } else if (route.startsWith('/quotes')) {
      allowed = method === 'GET' ? hasPerm('quotes_view') || hasPerm('quotes_manage') : hasPerm('quotes_manage');
    } else if (route.startsWith('/messages')) {
      allowed = method === 'GET'
        ? role === 'client' || hasPerm('messages_view')
        : role === 'client' || hasPerm('messages_send');
    } else if (route.startsWith('/orders')) {
      if (route.endsWith('/upload-pdf')) allowed = role === 'client' || hasPerm('orders_view') || hasPerm('orders_finance_view') || hasPerm('orders_finance_manage');
      else if (route.endsWith('/delivery-stage')) allowed = hasPerm('logistics_manage');
      else if (route.endsWith('/collection-reminders')) allowed = hasPerm('receivables_reminders_manage');
      else if (route.endsWith('/live-location')) {
        allowed = method === 'GET'
          ? role === 'client' || hasPerm('logistics_view') || hasPerm('logistics_manage')
          : hasPerm('logistics_manage');
      }
      else if (route.endsWith('/tracking-link')) allowed = hasPerm('logistics_manage');
      else if (route.endsWith('/finance')) allowed = [
        'orders_finance_manage', 'payments_manage', 'receivables_payments_manage',
        'receivables_reminders_manage', 'logistics_manage',
      ].some(permission => hasPerm(permission as StaffPermission));
      else if (route.endsWith('/payment')) allowed = hasPerm('payments_manage') || hasPerm('receivables_payments_manage');
      else if (route.endsWith('/mobile-payment')) allowed = role === 'client' || hasPerm('payments_manage');
      else if (route.endsWith('/expected-delivery')) allowed = role === 'client' || hasPerm('logistics_manage');
      else if (route.endsWith('/status')) allowed = role === 'client' || hasPerm('orders_confirm') || hasPerm('orders_cancel');
      else if (method === 'GET') allowed = role === 'client' || hasPerm('orders_view') || hasPerm('orders_confirm') || hasPerm('orders_cancel') || hasPerm('orders_finance_view') || hasPerm('orders_finance_manage') || hasPerm('payments_manage') || hasPerm('logistics_view') || hasPerm('logistics_manage') || hasPerm('receivables_view') || hasPerm('receivables_payments_manage') || hasPerm('receivables_reminders_manage') || hasPerm('finance_view');
      else if (method === 'POST') allowed = role === 'client';
    } else if (route === '/events') {
      allowed = method === 'GET';
    } else if (route === '/auth/profile') {
      allowed = method === 'PATCH' && role === 'client';
    } else if (route === '/client/workspace') {
      allowed = role === 'client' && ['GET', 'PUT'].includes(method);
    } else if (route === '/events/announcement') {
      allowed = method === 'POST' && hasPerm('campaigns_manage');
    } else if (route === '/push/subscriptions' || route === '/push/unsubscribe') {
      allowed = method === 'POST';
    } else if (route === '/events/read') {
      allowed = method === 'POST';
    } else if (route === '/admin/stats') {
      allowed = hasPerm('stats_view');
    } else if (route === '/admin/settings/volume-discounts') {
      allowed = hasPerm('settings_manage');
    } else if (route === '/admin/stock/movements') {
      allowed = method === 'GET' && hasStockPermission(user, 'stock_view');
    } else if (route === '/admin/stock/batches') {
      allowed = method === 'GET' && hasStockPermission(user, 'stock_view');
    } else if (/^\/admin\/stock\/batches\/[^/]+\/status$/.test(route)) {
      allowed = method === 'PATCH' && hasStockPermission(user, 'stock_batches_manage');
    } else if (route === '/admin/stock/receive') {
      allowed = method === 'POST' && hasStockPermission(user, 'stock_receive');
    } else if (route === '/admin/collection-reminders') {
      allowed = method === 'GET'
        ? hasPerm('receivables_view') || hasPerm('receivables_payments_manage') || hasPerm('receivables_reminders_manage')
        : hasPerm('receivables_reminders_manage');
    } else if (route === '/admin/expenses' || route.startsWith('/admin/expenses/')) {
      allowed = method === 'GET' ? hasPerm('finance_view') || hasPerm('expenses_manage') : hasPerm('expenses_manage');
    } else if (route.startsWith('/admin/clients/')) {
      allowed = hasPerm('clients_view') || hasPerm('clients_manage') || hasPerm('stats_view');
    } else if (route === '/admin/logs' || route === '/admin/activity-logs') {
      allowed = method === 'GET' ? hasPerm('audit_view') : isSuperAdmin;
    } else if (route.startsWith('/admin/staff') || route === '/supabase/migration-sql' || route === '/auth/admin-password' || route === '/download-project-zip') {
      allowed = isSuperAdmin;
    }

      if (!allowed) {
        res.status(403).json({ error: 'Votre rôle ne permet pas cette action.' });
        return;
      }
      next();
    }).catch(next);
  });

  const sendPushNotifications = async (
    userIds: string[],
    title: string,
    message: string,
    url = '/#dashboard'
  ): Promise<{ configured: boolean; sentCount: number }> => {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || '';
    const subject = process.env.VAPID_SUBJECT?.trim() || '';
    if (!persistence || !publicKey || !privateKey || !subject || userIds.length === 0) {
      return { configured: false, sentCount: 0 };
    }

    type PushSubscription = {
      endpoint: string;
      expirationTime?: number | null;
      keys: { p256dh: string; auth: string };
    };
    type WebPushClient = {
      sendNotification: (
        subscription: PushSubscription,
        payload: string,
        options: {
          TTL: number;
          urgency: 'normal';
          timeout: number;
          vapidDetails: { subject: string; publicKey: string; privateKey: string };
        }
      ) => Promise<unknown>;
    };

    let subscriptions: Awaited<ReturnType<SupabaseStorePersistence['listPushSubscriptions']>>;
    let webPush: WebPushClient;
    try {
      subscriptions = await persistence.listPushSubscriptions(userIds);
      webPush = requireFromProject('web-push') as WebPushClient;
    } catch (error) {
      console.warn('Push notifications unavailable:', error instanceof Error ? error.message : 'configuration missing');
      return { configured: false, sentCount: 0 };
    }

    if (subscriptions.length === 0) return { configured: true, sentCount: 0 };
    const payload = JSON.stringify({
      title: title.slice(0, 120),
      body: message.slice(0, 700),
      url,
      tag: `gloryday-${randomUUID().slice(0, 16)}`
    });
    let sentCount = 0;
    for (let offset = 0; offset < subscriptions.length; offset += 100) {
      const batch = subscriptions.slice(offset, offset + 100);
      const results = await Promise.allSettled(batch.map(async row => {
        try {
          await webPush.sendNotification(row.subscription, payload, {
            TTL: 60 * 60,
            urgency: 'normal',
            timeout: 5000,
            vapidDetails: { subject, publicKey, privateKey }
          });
          return true;
        } catch (error) {
          const statusCode = error && typeof error === 'object' && 'statusCode' in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;
          if ((statusCode === 404 || statusCode === 410) && persistence) {
            await persistence.deletePushSubscriptionByEndpoint(row.endpoint).catch(() => {});
          }
          return false;
        }
      }));
      sentCount += results.filter(result => result.status === 'fulfilled' && result.value).length;
    }
    return { configured: true, sentCount };
  };

  const sendPushForNotification = async (notification: AppNotification, url = '/#dashboard') => {
    if (!notification.userId) return { configured: false, sentCount: 0 };
    return sendPushNotifications(
      [notification.userId],
      notification.title || 'Nouvelle information Gloryday Pharma',
      notification.message,
      url
    );
  };

  await migrateLegacyPasswords(store);
  if (persistence) await persistence.persist(store);
  saveStoreLocal(store);

  const normalizeActivityLogEntry = (raw: Partial<StaffActivityLog>): StaffActivityLog => {
    const id = raw.id || `log-${randomUUID()}`;
    const timestamp = raw.timestamp || new Date().toISOString();
    const userId = raw.userId || raw.actorId || 'system';
    const actionType = raw.actionType || raw.actionLabel || 'ACTION';
    const entityType = raw.entityType || raw.targetType || 'settings';
    const entityId = raw.entityId || raw.targetId || raw.targetLabel || 'global';
    const details = raw.details || '';
    const targetType = (['product', 'order', 'staff', 'settings', 'quote'].includes(String(raw.targetType || entityType))
      ? (raw.targetType || entityType)
      : 'settings') as StaffActivityLog['targetType'];
    return {
      id,
      userId,
      actionType,
      entityType,
      entityId,
      details,
      timestamp,
      actorId: raw.actorId || userId,
      actorName: raw.actorName || 'Collaborateur',
      actorRole: raw.actorRole || 'Super-Admin',
      category: raw.category || 'system',
      severity: raw.severity || 'info',
      actionLabel: raw.actionLabel || actionType,
      targetType,
      targetId: raw.targetId || entityId,
      targetLabel: raw.targetLabel || entityId,
      previousValue: raw.previousValue,
      newValue: raw.newValue,
    };
  };

  store.staffLogs = (store.staffLogs || []).map(normalizeActivityLogEntry);
  if (store.staffLogs.length === 0) {
    const nowIso = new Date().toISOString();
    const vd = sanitizeVolumeDiscountSettings(store.volumeDiscounts);
    store.staffLogs = [
      normalizeActivityLogEntry({
        id: `log-${randomUUID()}`,
        userId: 'staff-super-admin',
        actionType: 'VOLUME_DISCOUNT_INIT',
        entityType: 'settings',
        entityId: 'volume_discounts',
        timestamp: nowIso,
        actorId: 'staff-super-admin',
        actorName: 'Super-Admin',
        actorRole: 'Super-Admin',
        category: 'stock_price',
        severity: 'info',
        actionLabel: 'Initialisation paliers remise volume',
        targetType: 'settings',
        targetId: 'volume_discounts',
        targetLabel: 'Remises B2B sur volume',
        details: `Configuration active : Palier 1 (-${vd.tier1Percent}% dès ${vd.tier1Qty} u.), Palier 2 (-${vd.tier2Percent}% dès ${vd.tier2Qty} u.), Palier 3 (-${vd.tier3Percent}% dès ${vd.tier3Qty} u.).`,
        newValue: `${vd.tier1Qty}u (-${vd.tier1Percent}%) / ${vd.tier2Qty}u (-${vd.tier2Percent}%)`
      }),
      normalizeActivityLogEntry({
        id: `log-${randomUUID()}`,
        userId: 'staff-super-admin',
        actionType: 'CATALOG_STOCK_SYNC',
        entityType: 'product',
        entityId: 'catalog-all',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        actorId: 'staff-super-admin',
        actorName: 'Super-Admin',
        actorRole: 'Super-Admin',
        category: 'stock_price',
        severity: 'info',
        actionLabel: 'Synchronisation catalogue médical',
        targetType: 'product',
        targetId: 'catalog-all',
        targetLabel: `Catalogue complet (${store.products.length} réf.)`,
        details: `Vérification des stocks initiaux et activation de la conversion automatique en demande de devis pour les articles à stock 0.`,
        newValue: `${store.products.length} produits actifs`
      })
    ];
    saveStoreLocal(store);
  }

  const appendStaffLog = (
    actor: User | { id: string; contactName?: string; facilityName?: string; role: AppRole } | undefined,
    entry: {
      actionType?: string;
      category: StaffLogCategory;
      severity?: StaffLogSeverity;
      actionLabel: string;
      targetType: StaffActivityLog['targetType'];
      targetId?: string;
      targetLabel: string;
      details: string;
      previousValue?: string;
      newValue?: string;
    }
  ): StaffActivityLog => {
    store.staffLogs ||= [];
    const nowIso = new Date().toISOString();
    const userId = actor?.id || 'system';
    const actionType = entry.actionType || entry.actionLabel;
    const entityType = entry.targetType;
    const entityId = entry.targetId || entry.targetLabel;
    const logEntry: StaffActivityLog = normalizeActivityLogEntry({
      id: `log-${randomUUID()}`,
      userId,
      actionType,
      entityType,
      entityId,
      details: entry.details,
      timestamp: nowIso,
      actorId: userId,
      actorName: actor?.contactName || actor?.facilityName || 'Collaborateur',
      actorRole: actor?.role || 'Super-Admin',
      category: entry.category,
      severity: entry.severity || 'info',
      actionLabel: entry.actionLabel,
      targetType: entry.targetType,
      targetId: entry.targetId || entityId,
      targetLabel: entry.targetLabel,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
    });
    store.staffLogs.unshift(logEntry);
    if (store.staffLogs.length > 500) {
      store.staffLogs.length = 500;
    }
    return logEntry;
  };

  // ==========================================
  // 1. PRODUCTS & STOCKS ROUTES
  // ==========================================
  app.get('/api/settings/volume-discounts', (_req, res) => {
    const settings = sanitizeVolumeDiscountSettings(store.volumeDiscounts);
    store.volumeDiscounts = settings;
    setActiveVolumeDiscountSettings(settings);
    res.json(settings);
  });

  app.put('/api/admin/settings/volume-discounts', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser;
    const prev = sanitizeVolumeDiscountSettings(store.volumeDiscounts);
    const updated = sanitizeVolumeDiscountSettings(req.body);
    store.volumeDiscounts = updated;
    setActiveVolumeDiscountSettings(updated);
    appendStaffLog(user, {
      category: 'stock_price',
      severity: 'warning',
      actionLabel: 'Modification paliers remise volume',
      targetType: 'settings',
      targetLabel: 'Remises B2B sur volume',
      details: updated.enabled
        ? `Paliers mis à jour : -${updated.tier1Percent}% dès ${updated.tier1Qty} u., -${updated.tier2Percent}% dès ${updated.tier2Qty} u., -${updated.tier3Percent}% dès ${updated.tier3Qty} u.`
        : 'Remises automatiques sur volume désactivées.',
      previousValue: prev.enabled ? `${prev.tier1Qty}u (-${prev.tier1Percent}%) / ${prev.tier2Qty}u (-${prev.tier2Percent}%)` : 'Désactivé',
      newValue: updated.enabled ? `${updated.tier1Qty}u (-${updated.tier1Percent}%) / ${updated.tier2Qty}u (-${updated.tier2Percent}%)` : 'Désactivé'
    });
    await saveStore(store, persistence);
    res.json(updated);
  }));

  app.get('/api/products', asyncHandler(async (_req, res) => {
    if (persistence) {
      try {
        const latestProducts = await persistence.loadProducts();
        store.products = latestProducts;
      } catch (error) {
        if (store.products.length === 0) throw error;
        console.warn('Lecture du catalogue Supabase impossible, conservation du dernier catalogue chargé :', error instanceof Error ? error.message : error);
      }
    }
    const user = await readSession(_req);
    const canViewStock = hasStockPermission(user, 'stock_view');
    const canViewStockCosts = hasStockPermission(user, 'stock_costs_view');
    res.json(store.products.map((product) => {
      const enriched = enrichProductWithStockState(product);
      const visibleProduct: Product = { ...enriched };
      if (!canViewStock) {
        visibleProduct.status = 'disponible';
        delete visibleProduct.alertThreshold;
        delete visibleProduct.lowStockAlertThreshold;
        delete visibleProduct.quantityAvailable;
        delete visibleProduct.stockQuantity;
        delete visibleProduct.hasPhysicalStock;
      }
      if (!canViewStockCosts) delete visibleProduct.purchasePrice;
      return visibleProduct;
    }));
  }));

  app.post('/api/products/media-upload-url', asyncHandler(async (req, res) => {
    if (!persistence) {
      res.status(503).json({ error: 'L’import de photos et de notices nécessite la connexion à Supabase Storage.' });
      return;
    }

    const kind = req.body?.kind;
    const contentType = String(req.body?.contentType || '').trim().toLowerCase();
    const fileSize = Number(req.body?.fileSize);
    const maxFileSize = 6 * 1024 * 1024;
    const allowedImageTypes = ['image/webp', 'image/jpeg', 'image/png'];
    const validType = kind === 'pdf'
      ? contentType === 'application/pdf'
      : kind === 'image' && allowedImageTypes.includes(contentType);

    if (!validType) {
      res.status(400).json({ error: 'Format de fichier non accepté. Utilisez une image WebP, JPEG, PNG ou un document PDF.' });
      return;
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxFileSize) {
      res.status(400).json({ error: 'Le fichier doit peser au maximum 6 Mo.' });
      return;
    }

    const upload = await persistence.createProductMediaUploadUrl(kind, contentType);
    res.status(201).json(upload);
  }));

  app.post('/api/packs/media-upload-url', asyncHandler(async (req, res) => {
    if (!persistence) {
      res.status(503).json({ error: 'L’import de photos de packs nécessite la connexion à Supabase Storage.' });
      return;
    }
    const contentType = String(req.body?.contentType || '').trim().toLowerCase();
    const fileSize = Number(req.body?.fileSize);
    const validType = ['image/webp', 'image/jpeg', 'image/png'].includes(contentType);
    if (!validType) {
      res.status(400).json({ error: 'Format non accepté. Utilisez une image WebP, JPEG ou PNG.' });
      return;
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 6 * 1024 * 1024) {
      res.status(400).json({ error: 'La photo optimisée doit peser au maximum 6 Mo.' });
      return;
    }
    const upload = await persistence.createProductMediaUploadUrl('image', contentType, 'pack');
    res.status(201).json(upload);
  }));

  app.post('/api/products', asyncHandler(async (req, res) => {
    const productData = req.body || {};
    const actor = (req as AuthenticatedRequest).authenticatedUser;
    const canAdjustStock = hasStockPermission(actor, 'stock_adjust');
    const canEditCost = hasStockPermission(actor, 'stock_costs_manage');
    const purchasePrice = Number(productData.purchasePrice ?? 0);
    if (canEditCost && (!Number.isFinite(purchasePrice) || purchasePrice < 0 || purchasePrice > 1_000_000_000)) {
      res.status(400).json({ error: 'Le prix d’achat doit être un montant valide et positif.' });
      return;
    }
    // New inventory is always recorded through the receipt workflow so it
    // receives an operator, timestamp, reason, lot and expiry trace.
    const initialStock = 0;
    const newProduct: Product = {
      id: productData.id || `prod-${Date.now()}`,
      name: productData.name || 'Nouveau Produit Médical',
      category: productData.category || 'Consommables médicaux',
      subcategory: productData.subcategory,
      specialty: productData.specialty,
      specifications: productData.specifications,
      variants: Array.isArray(productData.variants) && productData.variants.length > 0
        ? productData.variants
        : [{ label: 'Boîte standard', price: 7500 }],
      status: canAdjustStock && productData.status === 'rupture' ? 'rupture' : 'disponible',
      image: productData.image,
      thumbnailUrl: productData.thumbnailUrl || productData.image,
      pdfNoticeUrl: productData.pdfNoticeUrl,
      pdfNoticeName: productData.pdfNoticeName,
      description: productData.description,
      isPromotion: productData.isPromotion,
      originalPrice: productData.originalPrice,
      discountPercentage: productData.discountPercentage,
      quantityAvailable: initialStock,
      stockQuantity: initialStock,
      hasPhysicalStock: initialStock > 0,
      alertThreshold: canAdjustStock ? productData.alertThreshold : 10,
      lowStockAlertThreshold: canAdjustStock ? productData.lowStockAlertThreshold : 10,
      purchasePrice: canEditCost ? Math.round(purchasePrice) : 0
    };
    store.products.unshift(newProduct);
    const mainPrice = newProduct.variants[0]?.price ?? 0;
    appendStaffLog(actor, {
      category: 'stock_price',
      severity: 'info',
      actionLabel: 'Création nouveau produit',
      targetType: 'product',
      targetId: newProduct.id,
      targetLabel: newProduct.name,
      details: `Ajout au catalogue (${newProduct.category}) · Prix : ${mainPrice > 0 ? `${mainPrice.toLocaleString('fr-FR')} FCFA` : 'Sur devis'} · Stock initial : ${initialStock} u.`,
      newValue: `${mainPrice.toLocaleString('fr-FR')} FCFA · Stock ${initialStock} u.`
    });
    await saveStore(store, persistence);
    res.status(201).json(enrichProductWithStockState(newProduct));
  }));

  app.post('/api/products/bulk', asyncHandler(async (req, res) => {
    const incoming = req.body?.products;
    if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 500) {
      res.status(400).json({ error: 'Import invalide : sélectionnez entre 1 et 500 articles.' });
      return;
    }
    const actor = (req as AuthenticatedRequest).authenticatedUser;
    const hasStockFields = incoming.some((item: any) => item && typeof item === 'object' &&
      (item.quantityAvailable !== undefined || item.stockQuantity !== undefined || item.status !== undefined || item.alertThreshold !== undefined));
    if (hasStockFields && !hasStockPermission(actor, 'stock_adjust')) {
      res.status(403).json({ error: 'Le droit « Corriger le stock » est requis pour importer des quantités, seuils ou états de stock.' });
      return;
    }

    const normalizedItems: Array<{
      id?: string;
      name: string;
      category?: string;
      subcategory?: string;
      description?: string;
      status?: 'disponible' | 'rupture';
      stock?: number;
      alertThreshold?: number;
      isPromotion?: boolean;
      originalPrice?: number;
      discountPercentage?: number;
      variants?: Product['variants'];
    }> = [];
    const seenKeys = new Set<string>();

    for (const [index, raw] of incoming.entries()) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        res.status(400).json({ error: `La ligne ${index + 1} du fichier n’est pas valide.` });
        return;
      }
      const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 255) : '';
      const id = typeof raw.id === 'string' ? raw.id.trim().slice(0, 64) : '';
      if (!name || (id && !/^[A-Za-z0-9_:-]+$/.test(id))) {
        res.status(400).json({ error: `Nom ou identifiant invalide à la ligne ${index + 1}.` });
        return;
      }
      const key = id ? `id:${id.toLowerCase()}` : `name:${name.toLocaleLowerCase('fr')}`;
      if (seenKeys.has(key)) {
        res.status(400).json({ error: `L’article « ${name} » apparaît plusieurs fois dans le fichier.` });
        return;
      }
      seenKeys.add(key);

      const rawStock = raw.quantityAvailable ?? raw.stockQuantity;
      const stock = rawStock === undefined ? undefined : Number(rawStock);
      if (stock !== undefined && (!Number.isFinite(stock) || stock < 0 || stock > 1_000_000)) {
        res.status(400).json({ error: `Quantité invalide à la ligne ${index + 1}.` });
        return;
      }

      let variants: Product['variants'] | undefined;
      if (raw.variants !== undefined) {
        if (!Array.isArray(raw.variants) || raw.variants.length > 25) {
          res.status(400).json({ error: `Les conditionnements sont invalides à la ligne ${index + 1}.` });
          return;
        }
        variants = [];
        for (const variant of raw.variants) {
          const label = typeof variant?.label === 'string' ? variant.label.trim().slice(0, 120) : '';
          const price = Number(variant?.price);
          if (!label || !Number.isFinite(price) || price < 0 || price > 1_000_000_000) {
            res.status(400).json({ error: `Prix ou conditionnement invalide à la ligne ${index + 1}.` });
            return;
          }
          variants.push({
            label,
            price: Math.round(price),
            ...(Number.isFinite(Number(variant.originalPrice)) && Number(variant.originalPrice) > 0
              ? { originalPrice: Math.round(Number(variant.originalPrice)) }
              : {}),
            ...(Number.isFinite(Number(variant.discountPercentage)) && Number(variant.discountPercentage) > 0
              ? { discountPercentage: Math.min(100, Math.round(Number(variant.discountPercentage))) }
              : {})
          });
        }
      }

      const discount = raw.discountPercentage === undefined ? undefined : Number(raw.discountPercentage);
      const originalPrice = raw.originalPrice === undefined ? undefined : Number(raw.originalPrice);
      const alertThreshold = raw.alertThreshold === undefined ? undefined : Number(raw.alertThreshold);
      if ((discount !== undefined && (!Number.isFinite(discount) || discount < 0 || discount > 100)) ||
          (originalPrice !== undefined && (!Number.isFinite(originalPrice) || originalPrice < 0 || originalPrice > 1_000_000_000)) ||
          (alertThreshold !== undefined && (!Number.isFinite(alertThreshold) || alertThreshold < 0 || alertThreshold > 1_000_000))) {
        res.status(400).json({ error: `Remise, prix ou seuil de stock invalide à la ligne ${index + 1}.` });
        return;
      }

      normalizedItems.push({
        ...(id ? { id } : {}),
        name,
        ...(typeof raw.category === 'string' && raw.category.trim() ? { category: raw.category.trim().slice(0, 128) } : {}),
        ...(typeof raw.subcategory === 'string' ? { subcategory: raw.subcategory.trim().slice(0, 128) } : {}),
        ...(typeof raw.description === 'string' ? { description: raw.description.slice(0, 4_000) } : {}),
        ...(raw.status === 'disponible' || raw.status === 'rupture' ? { status: raw.status } : {}),
        ...(stock !== undefined ? { stock: Math.round(stock) } : {}),
        ...(alertThreshold !== undefined ? { alertThreshold: Math.round(alertThreshold) } : {}),
        ...(typeof raw.isPromotion === 'boolean' ? { isPromotion: raw.isPromotion } : {}),
        ...(originalPrice !== undefined ? { originalPrice: Math.round(originalPrice) } : {}),
        ...(discount !== undefined ? { discountPercentage: Math.round(discount) } : {}),
        ...(variants ? { variants } : {})
      });
    }

    const nextProducts = [...store.products];
    let updatedCount = 0;
    let createdCount = 0;
    const importedProducts: Product[] = [];
    for (const item of normalizedItems) {
      const idMatch = item.id
        ? nextProducts.findIndex(product => product.id.toLowerCase() === item.id?.toLowerCase())
        : -1;
      const nameMatch = nextProducts.findIndex(product => product.name.trim().toLocaleLowerCase('fr') === item.name.toLocaleLowerCase('fr'));
      if (idMatch >= 0 && nameMatch >= 0 && idMatch !== nameMatch) {
        res.status(409).json({ error: `L’identifiant et le nom de « ${item.name} » désignent deux produits différents.` });
        return;
      }
      const existingIndex = idMatch >= 0 ? idMatch : nameMatch;
      const existing = existingIndex >= 0 ? nextProducts[existingIndex] : undefined;
      const stock = item.stock ?? (existing ? (getTrackedProductStock(existing) ?? 0) : 0);
      const product: Product = enrichProductWithStockState({
        ...(existing || {} as Product),
        id: existing?.id || item.id || `prod-${randomUUID()}`,
        name: item.name,
        category: item.category || existing?.category || 'Consommables médicaux',
        ...(item.subcategory !== undefined ? { subcategory: item.subcategory || undefined } : {}),
        ...(item.description !== undefined ? { description: item.description || undefined } : {}),
        variants: item.variants?.length ? item.variants : existing?.variants?.length ? existing.variants : [{ label: 'Boîte standard', price: 0 }],
        status: item.status || existing?.status || 'disponible',
        ...(item.isPromotion !== undefined ? { isPromotion: item.isPromotion } : {}),
        ...(item.originalPrice !== undefined ? { originalPrice: item.originalPrice } : {}),
        ...(item.discountPercentage !== undefined ? { discountPercentage: item.discountPercentage } : {}),
        ...(item.alertThreshold !== undefined ? { alertThreshold: item.alertThreshold } : {}),
        quantityAvailable: stock,
        stockQuantity: stock,
        hasPhysicalStock: stock > 0 && (item.status || existing?.status) !== 'rupture'
      });
      if (existingIndex >= 0) {
        nextProducts[existingIndex] = product;
        updatedCount += 1;
      } else {
        nextProducts.unshift(product);
        createdCount += 1;
      }
      importedProducts.push(product);
    }

    const originalProducts = store.products;
    store.products = nextProducts;
    appendStaffLog(actor, {
      actionType: 'CATALOG_EXCEL_IMPORT',
      category: 'stock_price',
      severity: 'info',
      actionLabel: 'Import Excel Catalogue & Stocks',
      targetType: 'product',
      targetId: 'catalog-excel-bulk',
      targetLabel: `${updatedCount + createdCount} article(s) synchronisé(s)`,
      details: `Import catalogue validé : ${updatedCount} article(s) mis à jour et ${createdCount} créé(s).`,
      newValue: `${updatedCount} mis à jour · ${createdCount} créés`
    });
    try {
      await saveStore(store, persistence);
    } catch (error) {
      store.products = originalProducts;
      throw error;
    }

    res.json({
      success: true,
      updatedCount,
      createdCount,
      products: store.products.map(product => enrichProductWithStockState(product))
    });
  }));

  app.put('/api/products/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idx = store.products.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }
    const previousProduct = store.products[idx];
    const previousStaffLogs = [...(store.staffLogs || [])];
    const actor = (req as AuthenticatedRequest).authenticatedUser;
    const canEditCost = hasStockPermission(actor, 'stock_costs_manage');
    const canAdjustStock = hasStockPermission(actor, 'stock_adjust');
    const requestedPurchasePrice = req.body?.purchasePrice;
    if (canEditCost && requestedPurchasePrice !== undefined &&
        (!Number.isFinite(Number(requestedPurchasePrice)) || Number(requestedPurchasePrice) < 0 || Number(requestedPurchasePrice) > 1_000_000_000)) {
      res.status(400).json({ error: 'Le prix d’achat doit être un montant valide et positif.' });
      return;
    }
    const prevPrice = previousProduct.variants?.[0]?.price ?? 0;
    const prevStock = getTrackedProductStock(previousProduct) ?? 0;
    const {
      quantityAvailable: _ignoredQuantity,
      stockQuantity: _ignoredStockQuantity,
      stockAdjustment: _ignoredStockAdjustment,
      purchasePrice: _ignoredPurchasePrice,
      status: _ignoredStatus,
      alertThreshold: _ignoredAlertThreshold,
      lowStockAlertThreshold: _ignoredLowStockAlertThreshold,
      ...productFields
    } = req.body || {};
    const merged: Product = {
      ...previousProduct,
      ...productFields,
      ...(canAdjustStock && req.body?.status !== undefined ? { status: req.body.status } : {}),
      ...(canAdjustStock && req.body?.alertThreshold !== undefined ? { alertThreshold: req.body.alertThreshold } : {}),
      ...(canAdjustStock && req.body?.lowStockAlertThreshold !== undefined ? { lowStockAlertThreshold: req.body.lowStockAlertThreshold } : {}),
      ...(canEditCost && Number.isFinite(Number(req.body?.purchasePrice)) ? { purchasePrice: Math.max(0, Math.round(Number(req.body.purchasePrice))) } : {}),
      id
    };
    // Product metadata edits never change inventory. Dedicated stock routes
    // record every intentional stock change in the movement ledger.
    setTrackedProductStock(merged, prevStock);
    store.products[idx] = enrichProductWithStockState(merged);
    const updatedProduct = store.products[idx];
    const newPrice = updatedProduct.variants?.[0]?.price ?? 0;
    const newStock = getTrackedProductStock(updatedProduct) ?? 0;
    const priceChanged = prevPrice !== newPrice;
    const stockChanged = prevStock !== newStock;
    appendStaffLog(actor, {
      category: 'stock_price',
      severity: priceChanged ? 'warning' : 'info',
      actionLabel: priceChanged ? 'Modification prix produit' : stockChanged ? 'Modification stock produit' : 'Modification fiche produit',
      targetType: 'product',
      targetId: updatedProduct.id,
      targetLabel: updatedProduct.name,
      details: `Mise à jour de la fiche produit (${updatedProduct.category}) : Prix ${prevPrice.toLocaleString('fr-FR')} -> ${newPrice.toLocaleString('fr-FR')} FCFA · Stock ${prevStock} -> ${newStock} u.`,
      previousValue: `${prevPrice.toLocaleString('fr-FR')} FCFA · ${prevStock} u.`,
      newValue: `${newPrice.toLocaleString('fr-FR')} FCFA · ${newStock} u.`
    });
    try {
      await saveStore(store, persistence);
    } catch (error) {
      store.products[idx] = previousProduct;
      store.staffLogs = previousStaffLogs;
      throw error;
    }
    res.json(store.products[idx]);
  }));

  app.get('/api/admin/stock/movements', asyncHandler(async (req, res) => {
    const rawProductId = req.query.productId;
    const productId = typeof rawProductId === 'string' ? rawProductId.trim() : undefined;
    try {
      const movements = persistence
        ? await persistence.listStockMovements(productId)
        : (store.stockMovements || [])
            .filter(movement => !productId || movement.productId === productId)
            .slice(0, 200);
      res.json({ movements });
    } catch (error) {
      if (isStockLedgerMigrationError(error)) {
        res.status(503).json({ error: 'Le journal de stock n’est pas encore créé dans Supabase. Appliquez les migrations 20261102000001_stock_movement_ledger.sql et 20261102000002_order_stock_movements.sql.' });
        return;
      }
      throw error;
    }
  }));

  app.get('/api/admin/stock/batches', asyncHandler(async (req, res) => {
    const rawProductId = req.query.productId;
    const productId = typeof rawProductId === 'string' ? rawProductId.trim() : undefined;
    try {
      const batches = persistence
        ? await persistence.listStockBatches(productId)
        : [...(store.stockBatches || [])]
            .filter(batch => !productId || batch.productId === productId)
            .sort((left, right) => right.receivedDate.localeCompare(left.receivedDate))
            .slice(0, 2000);
      const user = (req as AuthenticatedRequest).authenticatedUser!;
      const canViewCosts = hasStockPermission(user, 'stock_costs_view') || hasStockPermission(user, 'stock_costs_manage');
      res.json({ batches: batches.map(batch => {
        if (canViewCosts) return batch;
        const { purchasePrice: _restrictedCost, ...visibleBatch } = batch;
        return visibleBatch;
      }) });
    } catch (error) {
      if (isStockLedgerMigrationError(error)) {
        res.status(503).json({ error: 'Le registre des lots n’est pas encore créé dans Supabase. Appliquez la migration 20261103000001_stock_batch_receipts.sql.' });
        return;
      }
      throw error;
    }
  }));

  app.patch('/api/admin/stock/batches/:batchId/status', asyncHandler(async (req, res) => {
    const batchId = String(req.params.batchId || '').trim();
    const movementId = typeof req.body?.movementId === 'string' ? req.body.movementId.trim() : '';
    const targetStatus = req.body?.targetStatus;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batchId) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(movementId) ||
        !['disponible', 'quarantaine', 'detruit'].includes(targetStatus) || reason.length < 3) {
      res.status(400).json({ error: 'Choisissez un état valide et indiquez un motif de 3 à 500 caractères.' });
      return;
    }

    const actor = (req as AuthenticatedRequest).authenticatedUser!;
    const batchIndex = (store.stockBatches || []).findIndex(batch => batch.id === batchId);
    if (batchIndex < 0) {
      res.status(404).json({ error: 'Lot introuvable.' });
      return;
    }
    const batch = store.stockBatches[batchIndex];
    const productIndex = store.products.findIndex(product => product.id === batch.productId);
    if (productIndex < 0) {
      res.status(404).json({ error: 'Produit associé au lot introuvable.' });
      return;
    }
    if (batch.quantityRemaining === undefined) {
      res.status(409).json({ error: 'Ce lot historique doit être rapproché par inventaire physique avant de changer son état.' });
      return;
    }
    if (batch.status === 'detruit' && targetStatus !== 'detruit') {
      res.status(409).json({ error: 'Un lot détruit ne peut pas être réactivé.' });
      return;
    }
    if (targetStatus === 'disponible' && (batch.status !== 'quarantaine' || (batch.expiryDate && batch.expiryDate < new Date().toISOString().slice(0, 10)))) {
      res.status(409).json({ error: 'Seul un lot non périmé en quarantaine peut être remis en disponibilité.' });
      return;
    }
    if (batch.status === targetStatus) {
      res.json({ success: true, batch, product: store.products[productIndex], movement: null });
      return;
    }

    const product = store.products[productIndex];
    const previousBatchSnapshot = { ...batch };
    const previousProductSnapshot = { ...product };
    const previousMovementsSnapshot = [...(store.stockMovements || [])];
    const previousStaffLogsSnapshot = [...(store.staffLogs || [])];
    const previousQuantity = Math.max(0, Number(product.quantityAvailable ?? product.stockQuantity ?? 0));
    let delta = 0;
    if (targetStatus === 'disponible') delta = batch.quantityRemaining;
    else if (batch.status === 'disponible') delta = -batch.quantityRemaining;
    const nextQuantity = previousQuantity + delta;
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 0 || nextQuantity > 2147483647) {
      res.status(409).json({ error: 'Le stock disponible ne permet pas ce changement. Faites un inventaire par lot.' });
      return;
    }

    const savedStatus = targetStatus as 'disponible' | 'quarantaine' | 'detruit';
    let movement: StockMovement | null = null;
    const now = new Date().toISOString();
    if (delta !== 0) {
      movement = {
        id: movementId,
        productId: product.id,
        productName: product.name,
        type: 'ajustement',
        quantity: Math.abs(delta),
        previousQuantity,
        newQuantity: nextQuantity,
        reason,
        lotNumber: batch.lotNumber || undefined,
        date: now,
        performedBy: actor.contactName || actor.facilityName || actor.phone || 'Collaborateur',
        performedById: actor.id,
        performedByRole: actor.role,
      };
    }

    try {
      if (persistence) {
        const result = await persistence.updateStockBatchStatus({
          batchId,
          targetStatus: savedStatus,
          reason,
          movementId,
          performedById: actor.id,
          performedBy: actor.contactName || actor.facilityName || actor.phone || 'Collaborateur',
          performedByRole: actor.role,
        });
        store.stockBatches[batchIndex] = result.batch;
        store.products[productIndex] = enrichProductWithStockState({
          ...product,
          quantityAvailable: result.quantity,
          stockQuantity: result.quantity,
          status: result.quantity > 0 ? (savedStatus === 'disponible' ? 'disponible' : product.status) : 'rupture',
        });
        if (result.movement) store.stockMovements = [result.movement, ...(store.stockMovements || []).filter(item => item.id !== result.movement!.id)].slice(0, 2000);
        movement = result.movement;
      } else {
        const priorMovement = (store.stockMovements || []).find(item => item.id === movementId);
        if (priorMovement) {
          if (priorMovement.productId !== product.id || priorMovement.type !== 'ajustement' || priorMovement.lotNumber !== batch.lotNumber) {
            res.status(409).json({ error: 'Cet identifiant de mouvement a déjà été utilisé pour une autre opération.' });
            return;
          }
          movement = priorMovement;
        }
        store.stockBatches[batchIndex] = {
          ...batch,
          status: savedStatus,
          statusReason: reason,
          statusUpdatedAt: now,
          statusUpdatedBy: actor.contactName || actor.facilityName || 'Collaborateur',
          ...(savedStatus === 'detruit' ? {
            quantityDestroyed: Number(batch.quantityDestroyed || 0) + batch.quantityRemaining,
            quantityRemaining: 0,
          } : {}),
        };
        store.products[productIndex] = enrichProductWithStockState({
          ...product,
          quantityAvailable: nextQuantity,
          stockQuantity: nextQuantity,
          status: nextQuantity > 0 ? (savedStatus === 'disponible' ? 'disponible' : product.status) : 'rupture',
        });
        if (movement) store.stockMovements = [movement, ...(store.stockMovements || []).filter(item => item.id !== movement!.id)].slice(0, 2000);
      }

      appendStaffLog(actor, {
        category: 'stock_price',
        severity: savedStatus === 'detruit' ? 'critical' : savedStatus === 'quarantaine' ? 'warning' : 'info',
        actionLabel: savedStatus === 'disponible' ? 'Réactivation d’un lot' : savedStatus === 'detruit' ? 'Destruction d’un lot' : 'Mise en quarantaine d’un lot',
        targetType: 'product',
        targetId: product.id,
        targetLabel: `${product.name} · lot ${batch.lotNumber || batch.id}`,
        details: `État du lot : ${batch.status || 'disponible'} → ${savedStatus}. Motif : ${reason}. Stock vendable : ${previousQuantity} → ${persistence ? store.products[productIndex].quantityAvailable : nextQuantity} unité(s).`,
        previousValue: `${batch.status || 'disponible'} · ${batch.quantityRemaining} unité(s) restantes`,
        newValue: `${savedStatus} · ${store.products[productIndex].quantityAvailable ?? 0} unité(s) vendables`,
      });
      if (persistence) {
        try { await saveStore(store, persistence); }
        catch (error) { console.error('État du lot enregistré, mais le journal général n’a pas pu être synchronisé :', error); }
      } else {
        await saveStore(store, persistence);
      }
      res.json({ success: true, batch: store.stockBatches[batchIndex], product: store.products[productIndex], movement });
    } catch (error) {
      // The local JSON store is not transactional. Restore in-memory state if
      // its write failed, so the UI cannot observe an operation we reported
      // as failed.
      if (!persistence) {
        store.stockBatches[batchIndex] = previousBatchSnapshot;
        store.products[productIndex] = previousProductSnapshot;
        store.stockMovements = previousMovementsSnapshot;
        store.staffLogs = previousStaffLogsSnapshot;
      }
      if (isStockLedgerMigrationError(error)) {
        res.status(503).json({ error: 'Le suivi des quantités par lot n’est pas encore installé dans Supabase. Appliquez la migration 20261103000002_stock_batch_remaining_fefo.sql.' });
        return;
      }
      throw error;
    }
  }));

  app.post('/api/admin/stock/receive', asyncHandler(async (req, res) => {
    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
    const movementId = typeof req.body?.movementId === 'string' ? req.body.movementId.trim() : '';
    const quantity = req.body?.quantity;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    const lotNumber = typeof req.body?.lotNumber === 'string' ? req.body.lotNumber.trim().slice(0, 100) : '';
    const expiryDate = typeof req.body?.expiryDate === 'string' ? req.body.expiryDate.trim() : '';
    const supplierName = typeof req.body?.supplierName === 'string' ? req.body.supplierName.trim().slice(0, 160) : '';
    const supplierReference = typeof req.body?.supplierReference === 'string' ? req.body.supplierReference.trim().slice(0, 160) : '';
    const purchasePrice = req.body?.purchasePrice;
    const expiryTimestamp = expiryDate ? Date.parse(`${expiryDate}T00:00:00.000Z`) : 0;
    const validExpiryDate = !expiryDate || (
      /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) && Number.isFinite(expiryTimestamp) &&
      new Date(expiryTimestamp).toISOString().slice(0, 10) === expiryDate
    );
    if (!productId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(movementId) ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000 || reason.length < 3 ||
        !validExpiryDate ||
        (purchasePrice !== undefined && (!Number.isSafeInteger(purchasePrice) || purchasePrice < 0))) {
      res.status(400).json({ error: 'Vérifiez la quantité, la date de péremption, le coût et le motif de réception.' });
      return;
    }
    const actor = (req as AuthenticatedRequest).authenticatedUser!;
    const canManageBatchCost = hasStockPermission(actor, 'stock_costs_manage');
    if (purchasePrice !== undefined && !canManageBatchCost) {
      res.status(403).json({ error: 'Vous n’avez pas le droit de saisir un coût d’achat pour ce lot.' });
      return;
    }
    const idx = store.products.findIndex(product => product.id === productId);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable.' });
      return;
    }
    const product = store.products[idx];
    const previousQuantity = getTrackedProductStock(product) ?? 0;
    const movement: StockMovement = {
      id: movementId,
      productId,
      productName: product.name,
      type: 'entree',
      quantity,
      previousQuantity,
      newQuantity: previousQuantity + quantity,
      reason,
      lotNumber: lotNumber || undefined,
      date: new Date().toISOString(),
      performedBy: actor.contactName || actor.facilityName || 'Collaborateur',
      performedById: actor.id,
      performedByRole: actor.role,
    };
    const batch: StockBatch = {
      id: movementId,
      productId,
      productName: product.name,
      lotNumber,
      expiryDate: expiryDate || '',
      quantity,
      initialQuantity: quantity,
      purchasePrice: purchasePrice === undefined ? undefined : purchasePrice,
      supplierName: supplierName || undefined,
      supplierReference: supplierReference || undefined,
      receivedDate: movement.date,
      receivedBy: movement.performedBy,
      receivedById: actor.id,
      status: 'disponible',
    };
    const previousLogs = [...(store.staffLogs || [])];
    const previousMovements = [...(store.stockMovements || [])];
    const previousBatches = [...(store.stockBatches || [])];
    let receipt: { movement: StockMovement; batch: StockBatch; quantity: number; status: 'disponible' | 'rupture' };
    try {
      receipt = persistence
        ? await persistence.receiveProductStock({ product, movement, batch })
        : (() => {
          const priorMovement = (store.stockMovements || []).find(item => item.id === movementId);
          const priorBatch = (store.stockBatches || []).find(item => item.id === movementId);
          if (priorMovement) {
            if (priorMovement.productId !== productId || priorMovement.type !== 'entree' || priorMovement.quantity !== quantity || !priorBatch) {
              throw new Error('Cet identifiant de réception existe déjà avec des données différentes.');
            }
            return { movement: priorMovement, batch: priorBatch, quantity: getTrackedProductStock(product) ?? 0, status: product.status };
          }
          return { movement, batch, quantity: movement.newQuantity, status: 'disponible' as const };
        })();
    } catch (error) {
      if (isStockLedgerMigrationError(error)) {
        res.status(503).json({ error: 'La réception avec lots n’est pas encore disponible dans Supabase. Appliquez les migrations de registre de stock puis réessayez.' });
        return;
      }
      throw error;
    }
    const savedMovement = receipt.movement;
    const updatedProduct = enrichProductWithStockState({
      ...product,
      quantityAvailable: receipt.quantity,
      stockQuantity: receipt.quantity,
      status: receipt.status,
    });
    store.products[idx] = updatedProduct;
    store.stockMovements = [savedMovement, ...previousMovements].slice(0, 2000);
    store.stockBatches = [receipt.batch, ...previousBatches.filter(item => item.id !== receipt.batch.id)].slice(0, 2000);
    appendStaffLog(actor, {
      category: 'stock_price',
      severity: 'info',
      actionLabel: 'Réception de stock',
      targetType: 'product',
      targetId: product.id,
      targetLabel: product.name,
      details: `Réception de ${quantity} unité(s) : ${savedMovement.previousQuantity} -> ${savedMovement.newQuantity}. Lot ${batch.lotNumber || 'sans numéro'}${batch.expiryDate ? ` · péremption ${batch.expiryDate}` : ''}${batch.supplierName ? ` · fournisseur ${batch.supplierName}` : ''}. Motif : ${reason}.`,
      previousValue: `${savedMovement.previousQuantity} u. · Lot ${batch.lotNumber || 'sans numéro'}`,
      newValue: `${savedMovement.newQuantity} u.${batch.expiryDate ? ` · péremption ${batch.expiryDate}` : ''}`,
    });
    if (persistence) {
      try {
        await saveStore(store, persistence);
      } catch (error) {
        console.error('Stock reçu et tracé, mais le journal global n’a pas pu être synchronisé :', error);
      }
    } else {
      try {
        await saveStore(store, persistence);
      } catch (error) {
        store.products[idx] = product;
        store.stockMovements = previousMovements;
        store.stockBatches = previousBatches;
        store.staffLogs = previousLogs;
        throw error;
      }
    }
    res.status(201).json({ success: true, product: updatedProduct, movement: savedMovement, batch: receipt.batch });
  }));

  app.get('/api/admin/expenses', (_req, res) => {
    const expenses = [...(store.expenses || [])]
      .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
    res.json(expenses);
  });

  app.get('/api/admin/collection-reminders', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    let reminders: CollectionReminder[];
    try {
      reminders = persistence
        ? await persistence.listCollectionReminders()
        : [...(store.collectionReminders || [])].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    } catch (error) {
      if (isCollectionRemindersMigrationError(error)) {
        res.status(503).json({ error: 'Le journal des relances n’est pas encore créé dans Supabase. Appliquez la migration 20261102000005_collection_reminders.sql.' });
        return;
      }
      throw error;
    }
    if (user.role === 'Commercial') {
      const assignedOrderIds = new Set(store.orders
        .filter((order) => order.assignedCommercialId === user.id || store.accounts.some(
          (account) => account.user.id === order.userId && account.user.assignedToCommercialId === user.id
        ))
        .map((order) => order.id));
      reminders = reminders.filter((reminder) => assignedOrderIds.has(reminder.orderId));
    }
    res.json(reminders);
  }));

  app.post('/api/admin/expenses', asyncHandler(async (req, res) => {
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
    const category = req.body?.category;
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const amount = req.body?.amount;
    const supplier = typeof req.body?.supplier === 'string' ? req.body.supplier.trim().slice(0, 150) : '';
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim().slice(0, 100) : '';
    const paymentMethod = typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod.trim() : '';
    const validPaymentMethods = ['especes', 'airtel_money', 'moov_money', 'virement', 'cheque', 'autre'];
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date ||
        !OPERATING_EXPENSE_CATEGORIES.includes(category) || description.length < 3 || description.length > 500 ||
        !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000000 ||
        (paymentMethod && !validPaymentMethods.includes(paymentMethod))) {
      res.status(400).json({ error: 'Vérifiez la date, la catégorie, le libellé, le montant et le mode de paiement.' });
      return;
    }

    const actor = (req as AuthenticatedRequest).authenticatedUser!;
    const expense: OperatingExpense = {
      id: `expense-${randomUUID()}`,
      date,
      category,
      description,
      amount,
      paymentMethod: paymentMethod || undefined,
      supplier: supplier || undefined,
      reference: reference || undefined,
      status: 'active',
      recordedById: actor.id,
      recordedByName: actor.contactName || actor.facilityName || 'Super Admin',
      createdAt: new Date().toISOString(),
    };
    store.expenses ||= [];
    store.expenses.unshift(expense);
    const previousLogs = [...(store.staffLogs || [])];
    const log = appendStaffLog(actor, {
      category: 'finance',
      actionLabel: 'Dépense enregistrée',
      targetType: 'expense',
      targetId: expense.id,
      targetLabel: `${expense.description} · ${expense.amount.toLocaleString('fr-FR')} FCFA`,
      details: `${expense.date} · ${expense.category} · ${expense.amount.toLocaleString('fr-FR')} FCFA${expense.supplier ? ` · Bénéficiaire : ${expense.supplier}` : ''}.`,
      newValue: `${expense.amount.toLocaleString('fr-FR')} FCFA`,
    });
    try {
      await saveOperatingExpense(store, persistence, expense, log);
    } catch (error) {
      store.expenses = store.expenses.filter((item) => item.id !== expense.id);
      store.staffLogs = previousLogs;
      if (isOperatingExpensesMigrationError(error)) {
        res.status(503).json({ error: 'Le registre des dépenses n’est pas encore créé dans Supabase. Appliquez la migration 20261102000004_operating_expenses.sql.' });
        return;
      }
      throw error;
    }
    res.status(201).json(expense);
  }));

  app.patch('/api/admin/expenses/:id/void', asyncHandler(async (req, res) => {
    const index = (store.expenses || []).findIndex((item) => item.id === req.params.id);
    if (index < 0) {
      res.status(404).json({ error: 'Dépense introuvable.' });
      return;
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (reason.length < 3) {
      res.status(400).json({ error: 'Indiquez un motif d’annulation d’au moins 3 caractères.' });
      return;
    }
    const current = store.expenses[index];
    if (current.status === 'annulee') {
      res.status(409).json({ error: 'Cette dépense est déjà annulée.' });
      return;
    }
    const previous = { ...current };
    const previousLogs = [...(store.staffLogs || [])];
    const actor = (req as AuthenticatedRequest).authenticatedUser!;
    store.expenses[index] = {
      ...current,
      status: 'annulee',
      voidedAt: new Date().toISOString(),
      voidedById: actor.id,
      voidedByName: actor.contactName || actor.facilityName || 'Super Admin',
      voidReason: reason,
    };
    const log = appendStaffLog(actor, {
      category: 'finance',
      severity: 'warning',
      actionLabel: 'Annulation dépense',
      targetType: 'expense',
      targetId: current.id,
      targetLabel: `${current.description} · ${current.amount.toLocaleString('fr-FR')} FCFA`,
      details: `Dépense annulée. Motif : ${reason}`,
      previousValue: 'Active',
      newValue: `Annulée · ${reason}`,
    });
    try {
      await saveOperatingExpense(store, persistence, store.expenses[index], log);
    } catch (error) {
      store.expenses[index] = previous;
      store.staffLogs = previousLogs;
      if (isOperatingExpensesMigrationError(error)) {
        res.status(503).json({ error: 'Le registre des dépenses n’est pas encore créé dans Supabase. Appliquez la migration 20261102000004_operating_expenses.sql.' });
        return;
      }
      throw error;
    }
    res.json(store.expenses[index]);
  }));

  app.patch('/api/products/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, quantityAvailable } = req.body || {};
    const idx = store.products.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }
    if (quantityAvailable !== undefined &&
        (!Number.isSafeInteger(quantityAvailable) || quantityAvailable < 0 || quantityAvailable > 2147483647)) {
      res.status(400).json({ error: 'La quantité de stock doit être un nombre entier positif valide.' });
      return;
    }
    if (status !== undefined && status !== 'disponible' && status !== 'rupture') {
      res.status(400).json({ error: 'Le statut de disponibilité est invalide.' });
      return;
    }
    const previousProduct = store.products[idx];
    const previousLogs = [...(store.staffLogs || [])];
    const previousMovements = [...(store.stockMovements || [])];
    const prevStock = getTrackedProductStock(previousProduct) ?? 0;
    const prevStatus = previousProduct.status;
    const actor = (req as AuthenticatedRequest).authenticatedUser!;
    const targetQuantity = quantityAvailable === undefined ? prevStock : quantityAvailable;
    const requestedStatus: Product['status'] = status || (targetQuantity === 0 ? 'rupture' : prevStatus);
    let movement: StockMovement | null = null;
    let stockRpcCommitted = false;
    let updatedProduct: Product;

    if (targetQuantity !== prevStock) {
      const draftMovement: StockMovement = {
        id: randomUUID(),
        productId: previousProduct.id,
        productName: previousProduct.name,
        type: 'ajustement',
        quantity: Math.abs(targetQuantity - prevStock),
        previousQuantity: prevStock,
        newQuantity: targetQuantity,
        reason: typeof req.body?.reason === 'string' && req.body.reason.trim().length >= 3
          ? req.body.reason.trim().slice(0, 500)
          : 'Ajustement manuel depuis le tableau Catalogue & Stock',
        date: new Date().toISOString(),
        performedBy: actor.contactName || actor.facilityName || 'Collaborateur',
        performedById: actor.id,
        performedByRole: actor.role,
      };
      if (persistence) {
        const result = await persistence.adjustProductStock({
          product: previousProduct,
          movement: draftMovement,
          targetQuantity,
          status: requestedStatus,
        });
        stockRpcCommitted = true;
        movement = result.movement;
        updatedProduct = enrichProductWithStockState({
          ...previousProduct,
          quantityAvailable: result.quantity,
          stockQuantity: result.quantity,
          status: result.status,
        });
      } else {
        movement = draftMovement;
        updatedProduct = enrichProductWithStockState({
          ...previousProduct,
          quantityAvailable: targetQuantity,
          stockQuantity: targetQuantity,
          status: targetQuantity === 0 ? 'rupture' : requestedStatus,
        });
      }
      if (movement) store.stockMovements = [movement, ...previousMovements].slice(0, 2000);
    } else {
      updatedProduct = enrichProductWithStockState({
        ...previousProduct,
        status: requestedStatus,
      });
    }
    store.products[idx] = updatedProduct;
    const auditedPreviousStock = movement?.previousQuantity ?? prevStock;
    const newStock = getTrackedProductStock(updatedProduct) ?? 0;
    const newStatus = updatedProduct.status;
    appendStaffLog(actor, {
      category: 'stock_price',
      severity: newStatus === 'rupture' || newStock === 0 ? 'warning' : 'info',
      actionLabel: auditedPreviousStock !== newStock ? 'Ajustement quantité en stock' : 'Changement statut disponibilité',
      targetType: 'product',
      targetId: updatedProduct.id,
      targetLabel: updatedProduct.name,
      details: newStock > 0 && newStatus === 'disponible'
        ? `Stock mis à jour à ${newStock} u. (${newStatus}) — validation directe de commande activée côté client.`
        : `Stock à ${newStock} u. (${newStatus}) — bascule automatique en demande de devis côté client.`,
      previousValue: `${auditedPreviousStock} u. (${prevStatus})`,
      newValue: `${newStock} u. (${newStatus})`
    });
    if (persistence && stockRpcCommitted) {
      try {
        await saveStore(store, persistence);
      } catch (error) {
        console.error('Stock ajusté et tracé, mais le journal global n’a pas pu être synchronisé :', error);
      }
    } else {
      try {
        await saveStore(store, persistence);
      } catch (error) {
        store.products[idx] = previousProduct;
        store.stockMovements = previousMovements;
        store.staffLogs = previousLogs;
        throw error;
      }
    }
    res.json({ success: true, product: store.products[idx] });
  }));

  app.delete('/api/products/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const target = store.products.find(p => p.id === id);
    store.products = store.products.filter(p => p.id !== id);
    if (target) {
      const actor = (req as AuthenticatedRequest).authenticatedUser;
      appendStaffLog(actor, {
        category: 'stock_price',
        severity: 'critical',
        actionLabel: 'Suppression produit du catalogue',
        targetType: 'product',
        targetId: target.id,
        targetLabel: target.name,
        details: `Le produit « ${target.name} » (${target.category}) a été retiré du catalogue.`
      });
    }
    await saveStore(store, persistence);
    res.json({ success: true });
  }));

  // ==========================================
  // 2. PACKS ROUTES
  // ==========================================
  app.get('/api/packs', (_req, res) => {
    res.json(store.packs);
  });

  app.post('/api/packs', asyncHandler(async (req, res) => {
    const newPack: Pack = {
      ...req.body,
      id: `pack-${Date.now()}`
    };
    store.packs.unshift(newPack);
    await saveStore(store, persistence);
    res.status(201).json(newPack);
  }));

  app.put('/api/packs/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idx = store.packs.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pack introuvable' });
      return;
    }
    store.packs[idx] = { ...store.packs[idx], ...req.body, id };
    await saveStore(store, persistence);
    res.json(store.packs[idx]);
  }));

  app.delete('/api/packs/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    store.packs = store.packs.filter(p => p.id !== id);
    await saveStore(store, persistence);
    res.json({ success: true });
  }));

  // ==========================================
  // 3. AUTHENTICATION & USERS ROUTES
  // ==========================================
  app.get('/api/auth/session', asyncHandler(async (req, res) => {
    const user = await readSession(req);
    if (user && user.role !== 'client' && user.role !== 'Super-Admin') {
      user.permissions = sanitizePermissions(user.permissions, user.role as StaffRole);
    }
    res.json(user ? { user } : { user: null });
  }));

  app.get('/api/client/workspace', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (user.role !== 'client') {
      res.status(403).json({ error: 'Cet espace est réservé aux comptes clients.' });
      return;
    }
    const workspace = persistence
      ? await persistence.getClientWorkspace(user.id)
      : store.clientWorkspaces?.[user.id] || null;
    res.json(workspace || { cartItems: [], drafts: [], updatedAt: new Date(0).toISOString() });
  }));

  app.put('/api/client/workspace', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (user.role !== 'client') {
      res.status(403).json({ error: 'Cet espace est réservé aux comptes clients.' });
      return;
    }
    const cartItems = req.body?.cartItems;
    const drafts = req.body?.drafts;
    const isValidCartItem = (item: any) => Boolean(
      item && typeof item.productId === 'string' && item.productId.length <= 160 &&
      typeof item.productName === 'string' && item.productName.length <= 240 &&
      typeof item.category === 'string' && item.category.length <= 120 &&
      typeof item.variant === 'string' && item.variant.length <= 160 &&
      Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 10000 &&
      Number.isFinite(item.price) && item.price >= 0 && item.price <= 1_000_000_000 &&
      typeof item.isQuote === 'boolean'
    );
    const isValidDraft = (draft: any) => Boolean(
      draft && typeof draft.id === 'string' && draft.id.length <= 180 &&
      typeof draft.name === 'string' && draft.name.length <= 240 &&
      typeof draft.createdAt === 'string' && Number.isFinite(Date.parse(draft.createdAt)) &&
      typeof draft.updatedAt === 'string' && Number.isFinite(Date.parse(draft.updatedAt)) &&
      Array.isArray(draft.items) && draft.items.length <= 100 && draft.items.every(isValidCartItem) &&
      draft.customerInfo && typeof draft.customerInfo === 'object' && !Array.isArray(draft.customerInfo) &&
      (draft.notes === undefined || (typeof draft.notes === 'string' && draft.notes.length <= 5000)) &&
      ['offline_saved', 'ready_to_sync', 'synced'].includes(draft.status) &&
      Number.isFinite(draft.totalAmount) && draft.totalAmount >= 0 &&
      Number.isSafeInteger(draft.itemsCount) && draft.itemsCount >= 0
    );
    if (!Array.isArray(cartItems) || cartItems.length > 150 || !cartItems.every(isValidCartItem) ||
        !Array.isArray(drafts) || drafts.length > 50 || !drafts.every(isValidDraft)) {
      res.status(400).json({ error: 'Le panier ou les brouillons sont invalides ou trop volumineux.' });
      return;
    }
    const workspace = persistence
      ? await persistence.saveClientWorkspace(user.id, cartItems as CartItem[], drafts as OrderDraft[])
      : {
          cartItems: cartItems as CartItem[],
          drafts: drafts as OrderDraft[],
          updatedAt: new Date().toISOString(),
        };
    if (!persistence) {
      store.clientWorkspaces ||= {};
      store.clientWorkspaces[user.id] = workspace;
      await saveStore(store, persistence);
    }
    res.json(workspace);
  }));

  app.post('/api/auth/logout', asyncHandler(async (req, res) => {
    const sessionId = getSessionId(req);
    if (sessionId) {
      sessions.delete(sessionId);
      if (persistence) {
        try {
          await persistence.revokeAppSession(createHash('sha256').update(sessionId).digest('hex'));
        } catch {
          // ignore if app_sessions table is not yet created
        }
      }
    }
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.json({ success: true });
  }));

  app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const registrationKey = `${req.ip}:register`;
    if (await loginBlocked(registrationKey)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    await recordLoginFailure(registrationKey);
    const { phone, facilityName, contactName, facilityType, facilityTypeOther, password, deliveryAddress, coordinates, avatarUrl: rawAvatarUrl } = req.body || {};
    const cleanPhone = normalizePhone(String(phone || ''));
    const cleanPass = String(password || '');
    if (!cleanPhone || !facilityName || !/^\+?\d{8,15}$/.test(cleanPhone)) {
      res.status(400).json({ error: 'Numéro de téléphone valide et nom de l’établissement obligatoires.' });
      return;
    }
    if (cleanPass.length < 8 || cleanPass.length > 85) {
      res.status(400).json({ error: 'Choisissez un mot de passe de 8 à 85 caractères.' });
      return;
    }
    let avatarUrl: string | undefined;
    try {
      avatarUrl = sanitizeAvatarUrl(rawAvatarUrl);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Photo de profil invalide.' });
      return;
    }
    if (store.accounts.some(a => normalizePhone(a.user.phone) === cleanPhone)) {
      res.status(409).json({ error: 'Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter.' });
      return;
    }
    const newUser: User = {
      id: `usr-${randomUUID()}`,
      phone: String(phone).trim(),
      facilityName: String(facilityName).trim().slice(0, 120),
      contactName: contactName ? String(contactName).trim().slice(0, 120) : 'Responsable Approvisionnement',
      facilityType: facilityType || 'Clinique',
      facilityTypeOther: facilityTypeOther ? String(facilityTypeOther).slice(0, 120) : undefined,
      role: 'client',
      authProvider: 'credentials',
      avatarUrl,
      deliveryAddress: String(deliveryAddress || 'Libreville, Gabon').slice(0, 300),
      coordinates: coordinates &&
        typeof coordinates.lat === 'number' && Number.isFinite(coordinates.lat) && coordinates.lat >= -90 && coordinates.lat <= 90 &&
        typeof coordinates.lng === 'number' && Number.isFinite(coordinates.lng) && coordinates.lng >= -180 && coordinates.lng <= 180
        ? { lat: coordinates.lat, lng: coordinates.lng }
        : undefined,
      createdAt: new Date().toISOString()
    };
    store.accounts.push({ user: newUser, passwordHash: await hashPassword(cleanPass) });
    await saveStore(store, persistence);
    await clearLoginFailures(registrationKey);
    const welcomeNotification: AppNotification = {
      id: `notif-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'admin_message',
      title: 'Bienvenue chez Gloryday Pharma',
      message: `Bonjour ${newUser.contactName || newUser.facilityName}, bienvenue chez Gloryday Pharma. Votre compte client est créé : vous pouvez consulter le catalogue et suivre vos commandes depuis votre espace.`,
      userId: newUser.id,
      targetRole: 'client',
      read: false,
    };
    store.notifications.unshift(welcomeNotification);
    try {
      await saveNotificationBatch(store, persistence, [welcomeNotification]);
    } catch {
      store.notifications = store.notifications.filter((notification) => notification.id !== welcomeNotification.id);
      console.warn('The new-client welcome notification could not be persisted.');
    }
    await issueSession(res, newUser);
    res.status(201).json({ user: cleanUser(newUser) });
  }));

  function sanitizeAvatarUrl(raw: unknown): string | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string') throw new Error('Photo de profil invalide.');
    const value = raw.trim();
    if (!value) return undefined;
    if (value.length > 300_000) throw new Error('La photo compressée est trop volumineuse.');

    const dataUrlMatch = value.match(/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (dataUrlMatch) {
      const imageBytes = Buffer.from(dataUrlMatch[2], 'base64');
      if (!imageBytes.length || imageBytes.length > 220_000) {
        throw new Error('La photo compressée dépasse la taille autorisée.');
      }
      return value;
    }

    if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'https:') return value;
    } catch {
      // Reject malformed or non-HTTPS external URLs below.
    }
    throw new Error('La photo doit être une image HTTPS ou une image JPG, PNG ou WEBP compressée.');
  }

  app.patch('/api/auth/profile', asyncHandler(async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).authenticatedUser;
    if (!currentUser || currentUser.role !== 'client') {
      res.status(401).json({ error: 'Connexion client requise.' });
      return;
    }

    const accountIndex = store.accounts.findIndex(account => account.user.id === currentUser.id);
    if (accountIndex < 0) {
      res.status(404).json({ error: 'Compte client introuvable.' });
      return;
    }

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body as Record<string, unknown>
      : {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const updatedUser: User = { ...store.accounts[accountIndex].user };
    const cleanProfileText = (value: unknown, maxLength: number) =>
      typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength) : '';

    if (has('facilityName')) {
      const facilityName = cleanProfileText(body.facilityName, 120);
      if (!facilityName) {
        res.status(400).json({ error: 'Le nom de votre établissement est obligatoire.' });
        return;
      }
      updatedUser.facilityName = facilityName;
    }
    if (has('contactName')) {
      updatedUser.contactName = cleanProfileText(body.contactName, 120) || undefined;
    }
    if (has('secondaryPhone')) {
      const secondaryPhone = cleanProfileText(body.secondaryPhone, 32);
      const digitCount = secondaryPhone.replace(/\D/g, '').length;
      if (secondaryPhone && (!/^\+?[0-9][0-9\s().-]{5,30}$/.test(secondaryPhone) || digitCount < 6 || digitCount > 15)) {
        res.status(400).json({ error: 'Saisissez un deuxième numéro de téléphone valide.' });
        return;
      }
      updatedUser.secondaryPhone = secondaryPhone || undefined;
    }
    if (has('facilityType')) {
      const allowedFacilityTypes: FacilityType[] = ['Clinique', 'Polyclinique', 'Hôpital', 'Laboratoire', 'Pharmacie', 'Cabinet médical', 'Autre'];
      if (!allowedFacilityTypes.includes(body.facilityType as FacilityType)) {
        res.status(400).json({ error: 'Le type d’établissement sélectionné est invalide.' });
        return;
      }
      updatedUser.facilityType = body.facilityType as FacilityType;
    }
    if (has('facilityTypeOther')) {
      updatedUser.facilityTypeOther = cleanProfileText(body.facilityTypeOther, 120) || undefined;
    }
    if (has('neighborhoodId')) {
      const neighborhoodId = cleanProfileText(body.neighborhoodId, 64);
      if (!getNeighborhoodById(neighborhoodId)) {
        res.status(400).json({ error: 'Choisissez un quartier de livraison valide.' });
        return;
      }
      updatedUser.neighborhoodId = neighborhoodId;
    }
    if (has('deliveryInstructions')) {
      if (typeof body.deliveryInstructions !== 'string' || body.deliveryInstructions.length > 250) {
        res.status(400).json({ error: 'La précision d’adresse doit rester sous 250 caractères.' });
        return;
      }
      updatedUser.deliveryInstructions = cleanProfileText(body.deliveryInstructions, 250) || undefined;
    }
    if (has('neighborhoodId') || has('deliveryInstructions')) {
      if (!updatedUser.neighborhoodId || !getNeighborhoodById(updatedUser.neighborhoodId)) {
        res.status(400).json({ error: 'Choisissez un quartier de livraison valide.' });
        return;
      }
      updatedUser.deliveryAddress = buildNeighborhoodDeliveryAddress(
        updatedUser.neighborhoodId,
        updatedUser.deliveryInstructions || ''
      );
    }
    if (has('avatarUrl')) {
      try {
        updatedUser.avatarUrl = sanitizeAvatarUrl(body.avatarUrl);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Photo de profil invalide.' });
        return;
      }
    }
    store.accounts[accountIndex] = { ...store.accounts[accountIndex], user: updatedUser };
    for (const [sessionId, session] of sessions) {
      if (session.user.id === updatedUser.id) {
        sessions.set(sessionId, { ...session, user: cleanUser(updatedUser) });
      }
    }

    await saveStore(store, persistence);
    await issueSession(res, updatedUser);
    res.json({ user: cleanUser(updatedUser) });
  }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const cleanPhone = normalizePhone(String(req.body?.phone || ''));
    const cleanPass = String(req.body?.password || '');
    if (cleanPhone.length > 32 || cleanPass.length < 8 || cleanPass.length > 85) {
      res.status(400).json({ error: 'Saisissez un mot de passe de 8 à 85 caractères.' });
      return;
    }
    const key = `${req.ip}:client:${cleanPhone}`;
    if (await loginBlocked(key)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    const found = store.accounts.find(a => normalizePhone(a.user.phone) === cleanPhone);
    const valid = await verifyPassword(cleanPass, found?.passwordHash || 'scrypt$00112233445566778899aabbccddeeff$00');
    if (!valid || !found) {
      await recordLoginFailure(key);
      res.status(401).json({ error: 'Numéro de téléphone ou mot de passe incorrect.' });
      return;
    }
    await clearLoginFailures(key);
    await issueSession(res, found.user);
    res.json({ user: cleanUser(found.user) });
  }));

  app.post('/api/auth/google', (_req, res) => {
    res.status(503).json({ error: 'La connexion Google sera disponible après configuration et vérification OAuth.' });
  });

  app.post('/api/auth/google/complete', (_req, res) => {
    res.status(503).json({ error: 'La création de compte Google est désactivée tant que la vérification OAuth réelle n’est pas configurée.' });
  });

  app.post('/api/auth/recovery-request', asyncHandler(async (req, res) => {
    const cleanPhone = normalizePhone(String(req.body?.phone || ''));
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      res.status(400).json({ error: 'Saisissez un numéro de téléphone valide.' });
      return;
    }

    const requestKey = `${req.ip}:recovery`;
    if (await loginBlocked(requestKey)) {
      res.status(429).json({ error: 'Trop de demandes. Réessayez dans 15 minutes.' });
      return;
    }
    await recordLoginFailure(requestKey);

    const account = store.accounts.find((entry) => normalizePhone(entry.user.phone) === cleanPhone);
    if (account) {
      const timestamp = new Date().toISOString();
      store.notifications.unshift({
        id: `notif-${randomUUID()}`,
        timestamp,
        type: 'password_recovery',
        title: 'Demande de récupération du mot de passe',
        message: `Demande reçue pour ${account.user.facilityName} (${account.user.phone}). Vérifiez l’identité du demandeur avant toute réinitialisation.`,
        targetRole: 'Super-Admin',
        read: false
      });
      await saveStore(store, persistence);
    }

    res.status(202).json({ success: true });
  }));

  app.post('/api/auth/admin', asyncHandler(async (req, res) => {
    const identifier = String(req.body?.identifier || '').trim().slice(0, 128);
    const password = String(req.body?.password || '');
    if (password.length < 8 || password.length > 85) {
      res.status(400).json({ error: 'Identifiants invalides.' });
      return;
    }
    const key = `${req.ip}:${identifier.toLowerCase()}`;
    if (await loginBlocked(key)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    const fail = async () => {
      await recordLoginFailure(key);
      res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    };
    const verifyCollaboratorAccessCode = async (): Promise<boolean> => {
      const configuredCode = process.env.STAFF_AREA_ACCESS_PIN?.trim() || '';
      if (!/^\d{4}$/.test(configuredCode)) {
        res.status(503).json({ error: 'Le code d’accès collaborateur n’est pas configuré. Contactez le Super-Admin.' });
        return false;
      }
      const submittedCode = String(req.body?.accessCode || '');
      if (!/^\d{4}$/.test(submittedCode) || !safeEqual(submittedCode, configuredCode)) {
        await fail();
        return false;
      }
      return true;
    };
    const adminUserName = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (identifier.toLowerCase() === adminUserName.toLowerCase() && !adminPassword) {
      res.status(503).json({ error: 'La connexion Super-Admin n’est pas configurée. Contactez le responsable du site.' });
      return;
    }
    if (identifier.toLowerCase() === adminUserName.toLowerCase() && adminPassword && adminPassword.length >= 8 && adminPassword.length <= 85 && safeEqual(password, adminPassword)) {
      const user: User = { id: 'staff-super-admin', phone: '', facilityName: 'Direction Générale Gloryday', contactName: 'Super-Admin', role: 'Super-Admin', createdAt: new Date().toISOString() };
      await clearLoginFailures(key);
      await issueSession(res, user);
      appendStaffLog(user, {
        category: 'access',
        severity: 'info',
        actionLabel: 'Connexion Super-Admin',
        targetType: 'staff',
        targetId: user.id,
        targetLabel: 'Super-Admin (Direction Générale)',
        details: 'Session ouverte sur le Portail Direction & Logistique.'
      });
      saveStoreLocal(store);
      res.json({ user });
      return;
    }
    const normalizedIdentifier = normalizeStaffIdentifier(identifier);
    const staff = environmentStaffAccounts().find(item => item.identifier === normalizedIdentifier);
    if (staff && safeEqual(password, staff.password)) {
      if (!await verifyCollaboratorAccessCode()) return;
      const user: User = { id: `staff-${Buffer.from(normalizedIdentifier).toString('hex').slice(0, 24)}`, phone: '', facilityName: 'Direction Générale Gloryday', contactName: staff.name || staff.role, role: staff.role, createdAt: new Date().toISOString() };
      await clearLoginFailures(key);
      await issueSession(res, user);
      appendStaffLog(user, {
        category: 'access',
        severity: 'info',
        actionLabel: 'Connexion collaborateur',
        targetType: 'staff',
        targetId: user.id,
        targetLabel: `${user.contactName} (${user.role})`,
        details: `Connexion réussie avec l'identifiant « ${normalizedIdentifier} ».`
      });
      saveStoreLocal(store);
      res.json({ user });
      return;
    }
    const managedStaff = store.staffAccounts.find(item => item.identifier === normalizedIdentifier);
    const validManagedPassword = await verifyPassword(password, managedStaff?.passwordHash || 'scrypt$00112233445566778899aabbccddeeff$00');
    if (managedStaff?.active && validManagedPassword) {
      if (!await verifyCollaboratorAccessCode()) return;
      const now = new Date().toISOString();
      managedStaff.lastLoginAt = now;
      managedStaff.lastSeenAt = now;
      const permissions = sanitizePermissions(managedStaff.permissions, managedStaff.role);
      const user: User = {
        id: managedStaff.id,
        phone: '',
        facilityName: 'Direction Générale Gloryday',
        contactName: managedStaff.name,
        role: managedStaff.role,
        permissions,
        createdAt: managedStaff.createdAt
      };
      appendStaffLog(user, {
        category: 'access',
        severity: 'info',
        actionLabel: 'Connexion collaborateur',
        targetType: 'staff',
        targetId: managedStaff.id,
        targetLabel: `${managedStaff.name} (${managedStaff.role})`,
        details: `Session ouverte par « ${managedStaff.identifier} » (${permissions.length} droit(s) actif(s)).`
      });
      saveStoreLocal(store);
      await clearLoginFailures(key);
      await issueSession(res, user);
      res.json({ user });
      return;
    }
    await fail();
  }));

  app.get('/api/admin/staff', (_req, res) => {
    const activeUserIds = new Set<string>();
    const nowMs = Date.now();
    for (const [, session] of sessions) {
      if (session.expiresAt > nowMs && session.user?.id) {
        activeUserIds.add(session.user.id);
      }
    }
    const fromEnvironment = environmentStaffAccounts().map((account) => {
      const envId = `environment-${Buffer.from(account.identifier).toString('hex').slice(0, 24)}`;
      return {
        id: envId,
        identifier: account.identifier,
        name: account.name,
        role: account.role,
        active: true,
        permissions: getDefaultPermissionsForRole(account.role),
        isOnline: activeUserIds.has(envId),
        stats: computeStaffStats(envId, account.name, store),
        createdAt: '',
        updatedAt: '',
        source: 'environment' as const,
      };
    });
    const managed = store.staffAccounts.map(acc => staffAccountSummary(acc, store, activeUserIds));
    res.json([...fromEnvironment, ...managed].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
  });

  app.post('/api/admin/staff', asyncHandler(async (req, res) => {
    const identifier = normalizeStaffIdentifier(req.body?.identifier);
    const name = String(req.body?.name || '').trim();
    const role = req.body?.role;
    const password = String(req.body?.password || '');
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(identifier)) {
      res.status(400).json({ error: 'Choisissez un identifiant de 3 à 64 caractères : lettres sans accent, chiffres, point, tiret ou souligné.' });
      return;
    }
    if (!name || name.length > 100 || !isStaffRole(role)) {
      res.status(400).json({ error: 'Saisissez un nom et choisissez un rôle valide.' });
      return;
    }
    if (password.length < 8 || password.length > 85) {
      res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 85 caractères.' });
      return;
    }
    const identifierTaken = environmentStaffAccounts().some(item => item.identifier === identifier) ||
      store.staffAccounts.some(item => item.identifier === identifier);
    if (identifierTaken) {
      res.status(409).json({ error: 'Cet identifiant est déjà utilisé. Choisissez-en un autre.' });
      return;
    }
    const now = new Date().toISOString();
    const permissions = sanitizePermissions(req.body?.permissions, role);
    const account: ManagedStaffAccount = {
      id: `staff-${randomUUID()}`,
      identifier,
      name,
      role,
      permissions,
      passwordHash: await hashPassword(password),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    store.staffAccounts.push(account);
    const actor = (req as AuthenticatedRequest).authenticatedUser;
    appendStaffLog(actor, {
      category: 'access',
      severity: 'warning',
      actionLabel: 'Création compte collaborateur',
      targetType: 'staff',
      targetId: account.id,
      targetLabel: `${account.name} (${account.identifier})`,
      details: `Nouveau profil collaborateur créé avec le rôle « ${account.role} » et ${permissions.length} droit(s) d'accès.`,
      newValue: `${account.role} · [${permissions.join(', ')}]`
    });
    try {
      await saveStore(store, persistence);
    } catch (error) {
      store.staffAccounts = store.staffAccounts.filter(item => item.id !== account.id);
      if (isStaffAccountsMigrationError(error)) {
        res.status(503).json({ error: 'La mise à jour des comptes employés n’a pas encore été appliquée dans Supabase. Copie le SQL de mise à jour, exécute-le dans Supabase, puis redémarre le serveur.' });
        return;
      }
      throw error;
    }
    res.status(201).json(staffAccountSummary(account, store));
  }));

  app.patch('/api/admin/staff/:id', asyncHandler(async (req, res) => {
    const index = store.staffAccounts.findIndex(item => item.id === req.params.id);
    if (index < 0) {
      res.status(404).json({ error: 'Ce compte ne peut pas être modifié ici.' });
      return;
    }
    const current = store.staffAccounts[index];
    const identifier = req.body?.identifier === undefined ? current.identifier : normalizeStaffIdentifier(req.body.identifier);
    const name = req.body?.name === undefined ? current.name : String(req.body.name || '').trim();
    const role = req.body?.role === undefined ? current.role : req.body.role;
    const active = req.body?.active === undefined ? current.active : req.body.active;
    const password = req.body?.password === undefined ? '' : String(req.body.password);
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(identifier) || !name || name.length > 100 || !isStaffRole(role) || typeof active !== 'boolean') {
      res.status(400).json({ error: 'Vérifiez l’identifiant, le nom, le rôle et l’état du compte.' });
      return;
    }
    if (password && (password.length < 8 || password.length > 85)) {
      res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 85 caractères.' });
      return;
    }
    const identifierTaken = environmentStaffAccounts().some(item => item.identifier === identifier) ||
      store.staffAccounts.some(item => item.id !== current.id && item.identifier === identifier);
    if (identifierTaken) {
      res.status(409).json({ error: 'Cet identifiant est déjà utilisé. Choisissez-en un autre.' });
      return;
    }
    const prevPermissions = sanitizePermissions(current.permissions, current.role);
    const permissions = req.body?.permissions !== undefined
      ? sanitizePermissions(req.body.permissions, role)
      : sanitizePermissions(current.permissions, role);
    const updated: ManagedStaffAccount = {
      ...current,
      identifier,
      name,
      role,
      permissions,
      active,
      passwordHash: password ? await hashPassword(password) : current.passwordHash,
      updatedAt: new Date().toISOString(),
    };
    store.staffAccounts[index] = updated;
    const actor = (req as AuthenticatedRequest).authenticatedUser;
    appendStaffLog(actor, {
      category: 'access',
      severity: !updated.active ? 'critical' : 'warning',
      actionLabel: current.active !== updated.active
        ? (updated.active ? 'Réactivation compte collaborateur' : 'Suspension compte collaborateur')
        : 'Modification droits / profil collaborateur',
      targetType: 'staff',
      targetId: updated.id,
      targetLabel: `${updated.name} (${updated.identifier})`,
      details: `Mise à jour du profil collaborateur : Rôle ${current.role} -> ${updated.role} · État ${updated.active ? 'Actif' : 'Désactivé'} · ${permissions.length} droit(s) accordé(s).`,
      previousValue: `${current.role} (${current.active ? 'Actif' : 'Inactif'}) · [${prevPermissions.join(', ')}]`,
      newValue: `${updated.role} (${updated.active ? 'Actif' : 'Inactif'}) · [${permissions.join(', ')}]`
    });
    try {
      await saveStore(store, persistence);
    } catch (error) {
      store.staffAccounts[index] = current;
      if (isStaffAccountsMigrationError(error)) {
        res.status(503).json({ error: 'La mise à jour des comptes employés n’a pas encore été appliquée dans Supabase. Copie le SQL de mise à jour, exécute-le dans Supabase, puis redémarre le serveur.' });
        return;
      }
      throw error;
    }
    for (const [sessionId, session] of sessions) {
      if (session.user.id === current.id) {
        if (!active || password) {
          sessions.delete(sessionId);
        } else {
          session.user = {
            ...session.user,
            contactName: updated.name,
            role: updated.role,
            permissions: updated.permissions,
          };
        }
      }
    }
    if (persistence && (!active || password)) await persistence.revokeAppSessionsForUser(current.id);
    res.json(staffAccountSummary(updated, store));
  }));

  app.put('/api/auth/admin-password', (_req, res) => {
    res.status(410).json({ error: 'Le mot de passe administrateur se modifie dans les variables sécurisées de l’hébergeur.' });
  });

  // ==========================================
  // 4. CLIENTS & QUOTES ROUTES
  // ==========================================
  const buildClientPurchaseSummary = (clientUser: Partial<User> & { id: string; phone: string; facilityName: string }, allOrders: Order[]) => {
    const cleanTargetPhone = normalizePhone(clientUser.phone || '');
    const cleanTargetFacility = (clientUser.facilityName || '').trim().toLowerCase();
    const matchingOrders = allOrders
      .filter((o) => {
        if (clientUser.id && o.userId && o.userId === clientUser.id) return true;
        const orderPhone = normalizePhone(o.customer?.phone || '');
        if (cleanTargetPhone && orderPhone && cleanTargetPhone === orderPhone) return true;
        const orderFacility = (o.customer?.facilityName || '').trim().toLowerCase();
        if (!cleanTargetPhone && cleanTargetFacility && orderFacility === cleanTargetFacility) return true;
        return false;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const validOrders = matchingOrders.filter((o) => o.status !== 'Annulée');
    const totalSpent = validOrders.reduce((s, o) => s + (o.estimatedTotal || 0), 0);
    const paidAmount = validOrders.reduce((sum, order) => sum + getOrderPaidAmount(order), 0);
    const unpaidAmount = validOrders.reduce((sum, order) => sum + getOrderRemainingBalance(order), 0);
    const averageOrderValue = validOrders.length > 0 ? Math.round(totalSpent / validOrders.length) : 0;
    const lastOrder = validOrders[0] || matchingOrders[0];
    const firstOrder = validOrders[validOrders.length - 1] || matchingOrders[matchingOrders.length - 1];
    const daysSinceLastOrder = lastOrder
      ? Math.max(0, Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 999;

    const productMap = new Map<string, {
      productId: string;
      productName: string;
      variant: string;
      totalQuantity: number;
      totalRevenue: number;
      ordersCount: number;
      lastPurchasedAt: string;
    }>();

    for (const ord of validOrders) {
      for (const item of ord.items || []) {
        const key = `${item.productId || item.productName}::${item.variant || ''}`;
        const existing = productMap.get(key) || {
          productId: item.productId || item.productName,
          productName: item.productName,
          variant: item.variant || 'Standard',
          totalQuantity: 0,
          totalRevenue: 0,
          ordersCount: 0,
          lastPurchasedAt: ord.createdAt,
        };
        existing.totalQuantity += item.quantity || 0;
        existing.totalRevenue += item.total || 0;
        existing.ordersCount += 1;
        if (Date.parse(ord.createdAt) > Date.parse(existing.lastPurchasedAt)) {
          existing.lastPurchasedAt = ord.createdAt;
        }
        productMap.set(key, existing);
      }
    }

    const purchasedProducts = Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalQuantity - a.totalQuantity);

    return {
      ...clientUser,
      totalOrdersCount: validOrders.length,
      allOrdersCount: matchingOrders.length,
      totalSpent,
      paidAmount,
      unpaidAmount,
      outstandingBalance: unpaidAmount,
      averageOrderValue,
      firstOrderDate: firstOrder?.createdAt || null,
      lastOrderDate: lastOrder?.createdAt || null,
      daysSinceLastOrder,
      isInactive10Days: daysSinceLastOrder >= 10,
      orders: matchingOrders,
      purchasedProducts,
    };
  };

  const redactClientFinancialSummary = (summary: Record<string, any>) => ({
    ...summary,
    totalSpent: undefined,
    paidAmount: undefined,
    unpaidAmount: undefined,
    outstandingBalance: undefined,
    averageOrderValue: undefined,
    creditLimit: undefined,
    minimumCreditOrderAmount: undefined,
    paymentTerms: undefined,
    orders: undefined,
    purchasedProducts: Array.isArray(summary.purchasedProducts)
      ? summary.purchasedProducts.map(({ totalRevenue: _totalRevenue, ...product }: Record<string, any>) => product)
      : undefined,
  });

  const canViewOrderFinancials = (user: User) => user.role === 'Super-Admin' || Boolean(
    user.permissions?.some(permission => [
      'orders_finance_view', 'orders_finance_manage', 'payments_manage',
      'receivables_view', 'receivables_payments_manage', 'finance_view', 'stats_view',
    ].includes(permission))
  );

  const redactOrderFinancialFields = (order: Order, user: User): Order => {
    const hasCollectionAccess = user.role === 'Super-Admin' || Boolean(user.permissions?.some(permission => [
      'receivables_view', 'receivables_payments_manage', 'receivables_reminders_manage', 'payments_manage',
    ].includes(permission)));
    const hasLineAmountAccess = user.role === 'Super-Admin' || Boolean(user.permissions?.some(permission => [
      'orders_finance_view', 'orders_finance_manage', 'finance_view', 'stats_view',
    ].includes(permission)));
    const hasPaymentDetailsAccess = user.role === 'Super-Admin' || Boolean(user.permissions?.some(permission => [
      'orders_finance_view', 'orders_finance_manage', 'payments_manage', 'receivables_payments_manage',
    ].includes(permission)));
    const hasInvoiceAccess = user.role === 'Super-Admin' || Boolean(user.permissions?.some(permission => [
      'orders_finance_view', 'orders_finance_manage',
    ].includes(permission)));
    return {
      ...order,
      estimatedTotal: canViewOrderFinancials(user) || hasCollectionAccess ? order.estimatedTotal : undefined,
      isPaid: canViewOrderFinancials(user) || hasCollectionAccess ? order.isPaid : undefined,
      amountPaid: canViewOrderFinancials(user) || hasCollectionAccess ? order.amountPaid : undefined,
      installments: canViewOrderFinancials(user) || hasCollectionAccess ? order.installments : undefined,
      invoices: hasInvoiceAccess ? order.invoices : undefined,
      mobilePayment: hasPaymentDetailsAccess ? order.mobilePayment : undefined,
      deliveryFee: hasLineAmountAccess ? order.deliveryFee : undefined,
      collectionDueDate: hasCollectionAccess ? order.collectionDueDate : undefined,
      items: order.items.map(({ price, total, discountPercent, savings, ...item }) => ({
        ...item,
        price: hasLineAmountAccess ? price : 0,
        total: hasLineAmountAccess ? total : 0,
        ...(hasLineAmountAccess && discountPercent !== undefined ? { discountPercent } : {}),
        ...(hasLineAmountAccess && savings !== undefined ? { savings } : {}),
      })),
    } as Order;
  };

  app.get('/api/clients', (_req, res) => {
    const user = (_req as AuthenticatedRequest).authenticatedUser!;
    const visibleAccounts = user.role === 'Commercial'
      ? store.accounts.filter(acc => acc.user.assignedToCommercialId === user.id)
      : store.accounts;
    const knownPhones = new Set<string>();
    const enrichedClients = visibleAccounts.map(acc => {
      if (acc.user.phone) knownPhones.add(normalizePhone(acc.user.phone));
      return { ...buildClientPurchaseSummary(acc.user, store.orders), hasAccount: true };
    });

    // Also include any facility/client from orders that does not yet have a registered account row
    if (user.role !== 'Commercial') {
      const guestByPhone = new Map<string, Order>();
      for (const ord of store.orders) {
        const normPhone = normalizePhone(ord.customer?.phone || '');
        const key = normPhone || (ord.customer?.facilityName || '').trim().toLowerCase();
        if (!key || (normPhone && knownPhones.has(normPhone))) continue;
        if (!guestByPhone.has(key)) {
          guestByPhone.set(key, ord);
        }
      }
      for (const [key, ord] of guestByPhone.entries()) {
        enrichedClients.push({ ...buildClientPurchaseSummary({
          id: ord.userId || `client-${Buffer.from(key).toString('hex').slice(0, 16)}`,
          phone: ord.customer.phone || '',
          facilityName: ord.customer.facilityName || 'Établissement Client',
          contactName: ord.customer.contactName || 'Responsable Achats',
          facilityType: ord.customer.facilityType || 'Clinique',
          deliveryAddress: ord.customer.deliveryAddress || 'Libreville, Gabon',
          role: 'client',
          createdAt: ord.createdAt,
        }, store.orders), hasAccount: false });
      }
    }

    const canSeeFinancials = canViewOrderFinancials(user);
    res.json(canSeeFinancials ? enrichedClients : enrichedClients.map(redactClientFinancialSummary));
  });

  app.patch('/api/clients/:id/credit-terms', asyncHandler(async (req, res) => {
    const account = store.accounts.find((item) => item.user.id === req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Compte client introuvable.' });
      return;
    }

    const body = req.body || {};
    const creditLimit = Number(body.creditLimit);
    const minimumCreditOrderAmount = Number(body.minimumCreditOrderAmount);
    const paymentTerms = body.paymentTerms;
    const accountStatus = body.accountStatus;
    if (!Number.isSafeInteger(creditLimit) || creditLimit < 0 || creditLimit > 1_000_000_000) {
      res.status(400).json({ error: 'Le plafond de crédit doit être un montant entier compris entre 0 et 1 000 000 000 FCFA.' });
      return;
    }
    if (!Number.isSafeInteger(minimumCreditOrderAmount) || minimumCreditOrderAmount < 0 || minimumCreditOrderAmount > 1_000_000_000) {
      res.status(400).json({ error: 'Le seuil minimum doit être un montant entier positif valide.' });
      return;
    }
    if (creditLimit > 0 && minimumCreditOrderAmount > creditLimit) {
      res.status(400).json({ error: 'Le seuil minimum ne peut pas dépasser le plafond de crédit.' });
      return;
    }
    if (!['comptant', '15_jours', '30_jours', '60_jours', 'acompte_solde'].includes(paymentTerms)) {
      res.status(400).json({ error: 'Les conditions de règlement sélectionnées ne sont pas valides.' });
      return;
    }
    if (!['actif', 'en_attente', 'suspendu', 'bloque'].includes(accountStatus)) {
      res.status(400).json({ error: 'Le statut du compte client est invalide.' });
      return;
    }

    const previous = {
      creditLimit: account.user.creditLimit ?? 0,
      minimumCreditOrderAmount: account.user.minimumCreditOrderAmount ?? 50000,
      paymentTerms: account.user.paymentTerms || 'comptant',
      accountStatus: account.user.accountStatus || 'actif',
    };
    account.user.creditLimit = creditLimit;
    account.user.minimumCreditOrderAmount = minimumCreditOrderAmount;
    account.user.paymentTerms = paymentTerms;
    account.user.accountStatus = accountStatus;
    const outstandingBalance = store.orders
      .filter((order) => order.userId === account.user.id && order.status !== 'Annulée')
      .reduce((sum, order) => sum + getOrderRemainingBalance(order), 0);
    account.user.outstandingBalance = outstandingBalance;

    appendStaffLog((req as AuthenticatedRequest).authenticatedUser, {
      category: 'system',
      severity: 'info',
      actionLabel: 'Mise à jour des conditions de crédit client',
      targetType: 'settings',
      targetId: account.user.id,
      targetLabel: `${account.user.facilityName} · ${account.user.phone}`,
      previousValue: JSON.stringify(previous),
      newValue: JSON.stringify({ creditLimit, minimumCreditOrderAmount, paymentTerms, accountStatus }),
      details: `Plafond ${creditLimit.toLocaleString('fr-FR')} FCFA · seuil minimum ${minimumCreditOrderAmount.toLocaleString('fr-FR')} FCFA · délai ${paymentTerms} · statut ${accountStatus}.`,
    });
    await saveStore(store, persistence);
    res.json(buildClientPurchaseSummary(account.user, store.orders));
  }));

  app.get('/api/admin/clients/:id/purchases', (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const targetId = String(req.params.id || '').trim();
    const account = store.accounts.find(
      (a) => a.user.id === targetId || normalizePhone(a.user.phone) === normalizePhone(targetId)
    );
    if (account) {
      if (user.role === 'Commercial' && account.user.assignedToCommercialId !== user.id) {
        res.status(403).json({ error: 'Ce client ne vous est pas attribué.' });
        return;
      }
      const summary = buildClientPurchaseSummary(account.user, store.orders);
      res.json(canViewOrderFinancials(user) ? summary : redactClientFinancialSummary(summary));
      return;
    }
    const matchingOrder = store.orders.find(
      (o) => o.userId === targetId || normalizePhone(o.customer?.phone || '') === normalizePhone(targetId)
    );
    if (matchingOrder) {
      const summary = buildClientPurchaseSummary({
        id: matchingOrder.userId || targetId,
        phone: matchingOrder.customer.phone,
        facilityName: matchingOrder.customer.facilityName,
        contactName: matchingOrder.customer.contactName,
        facilityType: matchingOrder.customer.facilityType || 'Clinique',
        deliveryAddress: matchingOrder.customer.deliveryAddress,
        role: 'client',
        createdAt: matchingOrder.createdAt,
      }, store.orders);
      res.json(canViewOrderFinancials(user) ? summary : redactClientFinancialSummary(summary));
      return;
    }
    res.status(404).json({ error: 'Client ou historique d’achats introuvable.' });
  });

  app.patch('/api/clients/:id/assign', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { commercialId } = req.body || {};
    const found = store.accounts.find(a => a.user.id === id);
    if (!found) {
      res.status(404).json({ error: 'Client introuvable' });
      return;
    }
    found.user.assignedToCommercialId = commercialId;
    await saveStore(store, persistence);
    res.json(found.user);
  }));

  app.get('/api/quotes', (_req, res) => {
    const user = (_req as AuthenticatedRequest).authenticatedUser!;
    const quotes = user.role === 'Commercial'
      ? store.quotes.filter(q => q.commercialId === user.id)
      : store.quotes;
    res.json(quotes);
  });

  app.post('/api/quotes', asyncHandler(async (req, res) => {
    const quoteData = req.body || {};
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const customerAccount = store.accounts.find(account => account.user.id === String(quoteData.customerId || ''));
    if (!customerAccount || (user.role === 'Commercial' && customerAccount.user.assignedToCommercialId !== user.id)) {
      res.status(403).json({ error: 'Ce client ne vous est pas attribué ou n’existe pas.' });
      return;
    }
    const newQuote: CommercialQuote = {
      ...quoteData,
      id: `quote-${randomUUID()}`,
      commercialId: user.id,
      commercialName: user.contactName || user.facilityName,
      customer: {
        facilityName: customerAccount.user.facilityName,
        contactName: customerAccount.user.contactName || 'Responsable Approvisionnement',
        phone: customerAccount.user.phone,
        deliveryAddress: customerAccount.user.deliveryAddress || '',
        deliveryMode: 'livraison',
        paymentMethod: 'especes'
      },
      reference: quoteData.reference || `DEV-${new Date().getFullYear()}-${String(store.quotes.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString()
    };
    store.quotes.unshift(newQuote);
    await saveStore(store, persistence);
    res.status(201).json(newQuote);
  }));

  app.patch('/api/quotes/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const idx = store.quotes.findIndex(q => q.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Devis introuvable' });
      return;
    }
    if (!['Brouillon', 'Transmis', 'Accepté', 'Refusé'].includes(status)) {
      res.status(400).json({ error: 'Statut de devis invalide.' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (user.role === 'Commercial' && store.quotes[idx].commercialId !== user.id) {
      res.status(403).json({ error: 'Ce devis ne vous est pas attribué.' });
      return;
    }
    store.quotes[idx].status = status;
    await saveStore(store, persistence);
    res.json(store.quotes[idx]);
  }));

  app.get('/api/messages', (_req, res) => {
    const user = (_req as AuthenticatedRequest).authenticatedUser!;
    const assignedClientIds = user.role === 'Commercial'
      ? new Set(store.accounts.filter(a => a.user.assignedToCommercialId === user.id).map(a => a.user.id))
      : new Set<string>();
    const messages = user.role === 'Super-Admin'
      ? store.messages
      : user.role === 'client'
        ? store.messages.filter(m => m.senderId === user.id || m.recipientId === user.id)
        : user.role === 'Commercial'
          ? store.messages.filter(m => m.senderId === user.id || m.recipientId === user.id || assignedClientIds.has(m.recipientId || '') || assignedClientIds.has(m.senderId))
          : store.messages;
    const canViewClientContacts = user.role === 'Super-Admin'
      || (user.permissions || []).some(permission => permission === 'clients_view' || permission === 'clients_manage');
    res.json(canViewClientContacts ? messages : messages.map(({ recipientPhone: _recipientPhone, ...message }) => message));
  });

  app.post('/api/messages', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    let recipientId: string | undefined;
    let recipientFacilityName: string | undefined;
    let recipientPhone: string | undefined;
    if (user.role === 'client') {
      recipientId = 'staff';
      recipientFacilityName = 'Direction Gloryday Pharma';
    } else if (req.body?.recipientId) {
      const account = store.accounts.find(a => a.user.id === String(req.body.recipientId));
      if (!account || (user.role === 'Commercial' && account.user.assignedToCommercialId !== user.id)) {
        res.status(403).json({ error: 'Destinataire non autorisé.' });
        return;
      }
      recipientId = account.user.id;
      recipientFacilityName = account.user.facilityName;
      recipientPhone = account.user.phone;
    } else {
      recipientId = 'staff';
      recipientFacilityName = 'Direction Gloryday Pharma';
    }
    const msg: DirectMessage = {
      ...req.body,
      id: `msg-${randomUUID()}`,
      senderId: user.id,
      senderName: user.contactName || user.facilityName,
      senderRole: user.role,
      recipientId,
      recipientFacilityName,
      recipientPhone,
      subject: String(req.body?.subject || '').trim().slice(0, 160),
      content: String(req.body?.content || '').trim().slice(0, 5000),
      channel: ['whatsapp', 'both'].includes(req.body?.channel) ? req.body.channel : 'in_app',
      createdAt: new Date().toISOString()
    };
    if (!msg.subject || !msg.content) {
      res.status(400).json({ error: 'Un objet et un message sont nécessaires.' });
      return;
    }
    store.messages.unshift(msg);
    let messagePushNotification: AppNotification | null = null;
    if (recipientId && recipientId !== 'staff' && (msg.channel === 'in_app' || msg.channel === 'both')) {
      messagePushNotification = {
        id: `notif-${randomUUID()}`,
        timestamp: msg.createdAt,
        type: 'admin_message',
        title: msg.subject,
        message: msg.content,
        targetRole: 'client',
        userId: recipientId,
        read: false
      };
      store.notifications.unshift(messagePushNotification);
    }
    await saveDirectMessage(store, persistence, msg, messagePushNotification);
    if (messagePushNotification) await sendPushForNotification(messagePushNotification);
    res.status(201).json(msg);
  }));

  // ==========================================
  // 5. ORDERS & LOGISTICS ROUTES
  // ==========================================
  app.get('/api/orders', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const currentOrders = persistence
      ? await persistence.loadOrders(user.role === 'client' ? user.id : undefined)
      : store.orders;
    if (persistence && user.role !== 'client') store.orders = currentOrders;
    let visibleOrders = currentOrders;
    if (user.role === 'client') {
      visibleOrders = visibleOrders.filter(o => o.userId === user.id);
    } else if (user.role === 'Commercial') {
      visibleOrders = visibleOrders.filter(o => o.assignedCommercialId === user.id || store.accounts.some(a => a.user.id === o.userId && a.user.assignedToCommercialId === user.id));
    } else if (user.role === 'Logistique') {
      res.json(currentOrders.map(order => {
        const permittedOrder = user.role === 'Super-Admin' ? order : redactOrderFinancialFields(order, user);
        return {
          ...permittedOrder,
          customer: {
            facilityName: order.customer.facilityName,
            contactName: order.customer.contactName,
            phone: order.customer.phone,
            deliveryAddress: order.customer.deliveryAddress,
            neighborhoodName: order.customer.neighborhoodName,
            deliveryMode: order.customer.deliveryMode,
            coordinates: order.customer.coordinates,
            googleMapsUrl: order.customer.googleMapsUrl,
            notes: order.customer.notes
          } as Order['customer']
        };
      }));
      return;
    }
    if (user.role !== 'Super-Admin' && user.role !== 'client') {
      visibleOrders = visibleOrders.map(order => redactOrderFinancialFields(order, user));
    }
    res.json(visibleOrders);
  }));

  app.post('/api/orders', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const account = store.accounts.find(a => a.user.id === user.id);
    const customerInput = req.body?.customer || {};
    const requestedItems = req.body?.items;
    if (!account || !Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 100) {
      res.status(400).json({ error: 'Informations client et articles requis.' });
      return;
    }
    const rawIdempotencyKey = req.body?.idempotencyKey;
    const idempotencyKey = typeof rawIdempotencyKey === 'string' ? rawIdempotencyKey.trim() : '';
    if (rawIdempotencyKey !== undefined && (!idempotencyKey || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey))) {
      res.status(400).json({ error: 'Identifiant de validation invalide. Actualisez la page avant de réessayer.' });
      return;
    }
    if (idempotencyKey) {
      const existingOrder = store.orders.find(order =>
        order.userId === account.user.id && order.idempotencyKey === idempotencyKey
      );
      if (existingOrder) {
        res.status(200).json(existingOrder);
        return;
      }
    }
    if (account.user.accountStatus && account.user.accountStatus !== 'actif') {
      res.status(403).json({ error: 'Ce compte ne peut pas encore passer commande. Contactez Gloryday Pharma.' });
      return;
    }

    // Validate every checkout against the latest catalog instead of an old
    // serverless-instance snapshot. The RPC still locks and reserves stock.
    if (persistence) store.products = await persistence.loadProducts();

    const items = [] as CartItem[];
    for (const requested of requestedItems) {
      const product = store.products.find(p => p.id === String(requested?.productId || ''));
      const variant = product?.variants?.find(v => v.label === String(requested?.variant || ''));
      const quantity = Number(requested?.quantity);
      if (!product || !variant || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
        res.status(400).json({ error: 'Un article, son format ou sa quantité n’est plus valide. Actualisez le catalogue.' });
        return;
      }
      const isQuoteItem = Number(variant.price) === 0 || Boolean(product.isQuote);
      items.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        variant: variant.label,
        price: Number(variant.price) || 0,
        quantity,
        isQuote: isQuoteItem
      });
    }

    const requestedByProduct = new Map<string, number>();
    for (const item of items) {
      if (item.isQuote || item.price === 0) continue;
      requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) || 0) + item.quantity);
    }
    const stockUpdates: Array<{ product: Product; remaining: number }> = [];
    for (const [productId, requestedQuantity] of requestedByProduct) {
      const product = store.products.find(candidate => candidate.id === productId)!;
      const availableQuantity = getTrackedProductStock(product) ?? 0;
      if (availableQuantity < requestedQuantity) {
        // Automatic conversion to quote / proforma request when stock is 0 or insufficient
        for (const item of items) {
          if (item.productId === productId) {
            item.isDeferredStock = true;
          }
        }
        // A deferred line never reserves physical stock, even if the product
        // has a smaller quantity than the customer requested.
      } else {
        stockUpdates.push({ product, remaining: availableQuantity - requestedQuantity });
      }
    }

    const neighborhood = customerInput.deliveryMode === 'retrait' ? undefined : getNeighborhoodById(String(customerInput.neighborhoodId || ''));
    if (customerInput.deliveryMode !== 'retrait' && !neighborhood) {
      res.status(400).json({ error: 'Sélectionnez un quartier de livraison valide.' });
      return;
    }
    const requestedCoordinates = customerInput.coordinates;
    const hasRequestedCoordinates = requestedCoordinates !== undefined && requestedCoordinates !== null;
    const coordinatesAreValid = hasRequestedCoordinates && typeof requestedCoordinates === 'object' &&
      typeof requestedCoordinates.lat === 'number' && Number.isFinite(requestedCoordinates.lat) && requestedCoordinates.lat >= -90 && requestedCoordinates.lat <= 90 &&
      typeof requestedCoordinates.lng === 'number' && Number.isFinite(requestedCoordinates.lng) && requestedCoordinates.lng >= -180 && requestedCoordinates.lng <= 180 &&
      (requestedCoordinates.accuracy === undefined || (typeof requestedCoordinates.accuracy === 'number' && Number.isFinite(requestedCoordinates.accuracy) && requestedCoordinates.accuracy >= 0 && requestedCoordinates.accuracy <= 100000));
    if (hasRequestedCoordinates && !coordinatesAreValid) {
      res.status(400).json({ error: 'Coordonnées GPS de livraison invalides. Relevez à nouveau la position.' });
      return;
    }
    const orderCoordinates = customerInput.deliveryMode === 'livraison'
      ? (coordinatesAreValid
          ? {
              lat: requestedCoordinates.lat,
              lng: requestedCoordinates.lng,
              ...(typeof requestedCoordinates.accuracy === 'number' ? { accuracy: requestedCoordinates.accuracy } : {}),
              source: 'checkout' as const,
            }
          : neighborhood?.defaultCoordinates
            ? {
                lat: neighborhood.defaultCoordinates.lat,
                lng: neighborhood.defaultCoordinates.lng,
                source: 'neighborhood' as const,
              }
            : undefined)
      : undefined;
    const customer = {
      facilityName: account.user.facilityName,
      facilityType: account.user.facilityType,
      facilityTypeOther: account.user.facilityTypeOther,
      contactName: account.user.contactName || 'Responsable Approvisionnement',
      phone: account.user.phone,
      secondaryPhone: account.user.secondaryPhone,
      deliveryAddress: String(customerInput.deliveryAddress || account.user.deliveryAddress || '').slice(0, 300),
      neighborhoodId: neighborhood?.id,
      neighborhoodName: neighborhood?.name,
      notes: String(customerInput.notes || '').slice(0, 1000),
      deliveryMode: customerInput.deliveryMode === 'retrait' ? 'retrait' as const : 'livraison' as const,
      paymentMethod: ['especes', 'airtel_money', 'moov_money', 'virement', 'cheque', 'en_compte'].includes(customerInput.paymentMethod) ? customerInput.paymentMethod : 'especes',
      mobilePayment: customerInput.mobilePayment ? {
        provider: customerInput.mobilePayment.provider === 'moov_money' ? 'moov_money' as const : 'airtel_money' as const,
        merchantPhone: String(customerInput.mobilePayment.merchantPhone || '').slice(0, 40),
        transactionReference: String(customerInput.mobilePayment.transactionReference || '').slice(0, 100),
        senderPhone: String(customerInput.mobilePayment.senderPhone || '').slice(0, 40),
        isPrePaid: false,
        status: 'submitted' as const
      } : undefined,
      coordinates: customerInput.deliveryMode === 'retrait' ? undefined : orderCoordinates,
      googleMapsUrl: account.user.googleMapsUrl,
      deliveryFee: 0
    };

    const year = new Date().getFullYear();
    const orderNum = String(store.orders.length + 1).padStart(4, '0');
    const reference = `GP-${year}-${orderNum}`;

    const zoneName = neighborhood?.name || 'Retrait au dépôt';
    const estimatedTime = getEstimatedDeliveryText(customer.neighborhoodId, customer.deliveryAddress);

    const activeDiscountSettings = sanitizeVolumeDiscountSettings(store.volumeDiscounts);
    const volumeSummary = calculateCartVolumeSummary(items, activeDiscountSettings);
    const deliveryFee = customer.deliveryMode === 'retrait' || volumeSummary.netTotal >= 50000 ? 0 : neighborhood?.baseDeliveryFee || 0;
    const finalTotal = volumeSummary.netTotal + deliveryFee;
    customer.deliveryFee = deliveryFee;

    let collectionDueDate: string | undefined;
    if (customer.paymentMethod === 'en_compte') {
      if (account.user.accountStatus !== 'actif' || account.user.paymentTerms === 'comptant' || !account.user.paymentTerms) {
        res.status(403).json({ error: 'Le paiement à terme n’est pas autorisé pour ce compte. Contactez Gloryday Pharma.' });
        return;
      }
      if (account.user.paymentTerms === 'acompte_solde') {
        res.status(409).json({ error: 'Votre compte est configuré en acompte et solde. Contactez Gloryday Pharma pour enregistrer l’acompte avant cette commande.' });
        return;
      }
      if (items.some((item) => item.isQuote || item.isDeferredStock)) {
        res.status(409).json({ error: 'Les commandes contenant un article sur devis ou en réapprovisionnement doivent être chiffrées avant un paiement à terme.' });
        return;
      }
      const minimumOrderAmount = Math.max(0, Math.trunc(Number(account.user.minimumCreditOrderAmount ?? 50000) || 0));
      if (finalTotal < minimumOrderAmount) {
        const missingAmount = minimumOrderAmount - finalTotal;
        res.status(400).json({ error: `Le seuil de paiement à terme est de ${minimumOrderAmount.toLocaleString('fr-FR')} FCFA. Il manque ${missingAmount.toLocaleString('fr-FR')} FCFA à cette commande.` });
        return;
      }
      const creditLimit = Math.max(0, Math.trunc(Number(account.user.creditLimit) || 0));
      if (creditLimit <= 0) {
        res.status(409).json({ error: 'Aucun plafond de crédit n’est activé pour ce compte.' });
        return;
      }
      if (persistence) {
        const creditGuardReady = await persistence.hasAtomicClientCreditGuard();
        if (!creditGuardReady) {
          res.status(503).json({ error: 'Le paiement à terme sera activé après l’application de la migration Supabase 20261102000003_enforce_client_credit_limit.sql.' });
          return;
        }
      } else {
        const localOutstanding = store.orders
          .filter((order) => order.userId === account.user.id && order.status !== 'Annulée')
          .reduce((sum, order) => sum + getOrderRemainingBalance(order), 0);
        if (finalTotal > Math.max(0, creditLimit - localOutstanding)) {
          res.status(409).json({ error: `Plafond dépassé. Encours actuel : ${localOutstanding.toLocaleString('fr-FR')} FCFA.` });
          return;
        }
      }
      const dueDays = account.user.paymentTerms === '15_jours' ? 15 : account.user.paymentTerms === '60_jours' ? 60 : 30;
      const librevilleDateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date());
      const partValue = (type: Intl.DateTimeFormatPartTypes) => librevilleDateParts.find((part) => part.type === type)?.value || '0';
      const dueDate = new Date(Date.UTC(
        Number(partValue('year')),
        Number(partValue('month')) - 1,
        Number(partValue('day')) + dueDays,
      ));
      collectionDueDate = dueDate.toISOString().slice(0, 10);
    }

    const createdNow = new Date();
    const isAfterHours = createdNow.getHours() >= 18 || createdNow.getHours() < 7;
    const defaultExpectedDate = new Date(createdNow);
    if (isAfterHours) {
      defaultExpectedDate.setDate(defaultExpectedDate.getDate() + 1);
    }
    const expectedDeliveryDate = `${defaultExpectedDate.getFullYear()}-${String(defaultExpectedDate.getMonth() + 1).padStart(2, '0')}-${String(defaultExpectedDate.getDate()).padStart(2, '0')}`;
    const expectedDeliverySlot = customer.deliveryMode === 'retrait'
      ? 'Retrait Dépôt Oloumi (20-30 min)'
      : isAfterHours
        ? 'Matin · 08h30 - 10h00 (1ère tournée)'
        : estimatedTime;

    const hasQuoteOrDeferred = items.some((it: any) => it.isQuote || it.isDeferredStock);

    const newOrder: Order = {
      id: `ord-${randomUUID()}`,
      reference,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      createdAt: createdNow.toISOString(),
      userId: account.user.id,
      assignedCommercialId: account.user.assignedToCommercialId,
      customer,
      items: items.map((it: any) => {
        const calc = calculateItemVolumePrice(it.price, it.quantity, it.isQuote, activeDiscountSettings);
        return {
          productId: it.productId,
          productName: it.productName,
          category: it.category,
          variant: it.variant,
          price: calc.discountedUnitPrice,
          quantity: it.quantity,
          total: it.isQuote ? 0 : calc.totalWithDiscount,
          isQuote: it.isQuote,
          isDeferredStock: Boolean(it.isDeferredStock),
          discountPercent: calc.discountPercent,
          savings: calc.savings
        };
      }),
      estimatedTotal: finalTotal,
      collectionDueDate,
      hasQuoteItems: hasQuoteOrDeferred,
      status: 'À confirmer',
      isPaid: false,
      mobilePayment: customer.mobilePayment,
      deliveryStage: 'preparation',
      stockReserved: stockUpdates.some((update) => (getTrackedProductStock(update.product) ?? 0) > update.remaining),
      deliveryZone: zoneName,
      deliveryEstimated: estimatedTime,
      expectedDeliveryDate,
      expectedDeliverySlot,
      deliveryFee,
      whatsappLogs: []
    };

    let orderToSave = newOrder;
    if (persistence) {
      const atomicResult = await persistence.createOrderAtomically(newOrder, store);
      if (!atomicResult.created) {
        res.status(200).json(atomicResult.order);
        return;
      }
      orderToSave = atomicResult.order;
      for (const update of atomicResult.stocks) {
        const product = store.products.find((candidate) => candidate.id === update.productId);
        if (product) {
          setTrackedProductStock(product, update.quantity);
          product.status = update.quantity > 0 ? 'disponible' : 'rupture';
          product.hasPhysicalStock = update.quantity > 0;
        }
      }
    } else {
      for (const update of stockUpdates) {
        const previousQuantity = getTrackedProductStock(update.product) ?? 0;
        setTrackedProductStock(update.product, update.remaining);
        update.product.status = update.remaining > 0 ? 'disponible' : 'rupture';
        update.product.hasPhysicalStock = update.remaining > 0;
        const movedQuantity = previousQuantity - update.remaining;
        if (movedQuantity > 0) {
          store.stockMovements.unshift({
            id: randomUUID(),
            productId: update.product.id,
            productName: update.product.name,
            reference: orderToSave.reference,
            type: 'sortie_commande',
            quantity: movedQuantity,
            previousQuantity,
            newQuantity: update.remaining,
            reason: `Réservation liée à la commande ${orderToSave.reference}`,
            date: new Date().toISOString(),
            performedBy: account.user.contactName || account.user.facilityName || account.user.phone,
            performedById: account.user.id,
            performedByRole: account.user.role,
          });
        }
      }
    }
    store.orders.unshift(orderToSave);

    const hasDeferredStockItems = orderToSave.items.some((item) => Boolean(item.isDeferredStock));
    const orderNeedsQuote = orderToSave.hasQuoteItems || orderToSave.items.some((item) => item.isQuote || item.isDeferredStock);

    if (orderNeedsQuote) {
      const validUntil = new Date(createdNow.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
      const autoQuote: CommercialQuote = {
        id: `qte-${randomUUID()}`,
        reference: `DEV-${year}-${orderToSave.reference.split('-').at(-1) || randomUUID().slice(0, 8).toUpperCase()}`,
        createdAt: createdNow.toISOString(),
        validUntil,
        commercialId: account.user.assignedToCommercialId || 'staff-super-admin',
        commercialName: account.user.assignedToCommercialName || 'Service Commercial Gloryday',
        customerId: account.user.id,
        customer,
        items: orderToSave.items,
        subtotal: volumeSummary.grossTotal,
        discountType: 'amount',
        discountValue: volumeSummary.totalSavings,
        discountAmount: volumeSummary.totalSavings,
        finalTotal,
        status: 'Transmis',
        notes: `Demande de devis / proforma liée au bon de commande ${orderToSave.reference}${hasDeferredStockItems ? ' (conversion automatique stock à 0)' : ''}.`
      };
      store.quotes.unshift(autoQuote);
    }

    const staffOrderNotificationRoles: AppRole[] = ['Super-Admin', 'Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'];
    const staffOrderNotifications: AppNotification[] = staffOrderNotificationRoles.map(targetRole => ({
      id: `notif-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'order_created',
      orderId: orderToSave.id,
      orderReference: orderToSave.reference,
      message: `Nouvelle commande ${orderToSave.reference} reçue de ${customer.facilityName} (${finalTotal.toLocaleString('fr-FR')} FCFA).`,
      targetRole,
      read: false
    }));
    store.notifications.unshift(...staffOrderNotifications);
    store.notifications.unshift({
      id: `notif-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'order_created',
      orderId: orderToSave.id,
      orderReference: orderToSave.reference,
      message: `Votre commande ${orderToSave.reference} a été reçue. Elle est en attente de confirmation par Gloryday Pharma.`,
      targetRole: 'client',
      userId: account.user.id,
      read: false
    });
    const orderCreatedNotification = store.notifications[0];

    await saveStore(store, persistence);
    if (orderCreatedNotification) await sendPushForNotification(orderCreatedNotification);
    res.status(201).json(orderToSave);
  }));

  app.post('/api/orders/upload-pdf', asyncHandler(async (req, res) => {
    const { orderReference, pdfBase64 } = req.body || {};
    const idx = store.orders.findIndex(o => o.reference === orderReference || o.id === orderReference);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const order = store.orders[idx];
    const isStaff = ['Super-Admin', 'Admin simple', 'Commercial', 'Logistique'].includes(user.role);
    if (!isStaff && (user.role !== 'client' || order.userId !== user.id)) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    if (
      typeof pdfBase64 !== 'string' ||
      !/^data:application\/pdf(?:;[^,]+)*;base64,/i.test(pdfBase64) ||
      pdfBase64.length > 4_000_000
    ) {
      res.status(400).json({ error: 'Fichier PDF invalide ou trop volumineux.' });
      return;
    }
    // Keep compatibility with older installed clients without storing a
    // multi-hundred-kilobyte data URL in every order row. PDFs are generated
    // in the browser whenever they are viewed or downloaded.
    res.json({ success: true, pdfUrl: '' });
  }));

  app.get('/api/courier-tracking/:token', asyncHandler(async (req, res) => {
    let tracking: Awaited<ReturnType<typeof resolveCourierTrackingToken>>;
    try {
      tracking = await resolveCourierTrackingToken(req.params.token);
    } catch (error) {
      if (isDeliveryLocationsMigrationError(error)) {
        res.status(503).json({ error: 'Les liens GPS ne sont pas activés : appliquez la migration Supabase 20261021000002_delivery_location_points.sql.' });
        return;
      }
      throw error;
    }
    if (!tracking) {
      res.status(410).json({ error: 'Ce lien de suivi a expiré ou a été désactivé.' });
      return;
    }
    const { order, session } = tracking;
    const resolvedDest = order.customer.coordinates
      ? { lat: order.customer.coordinates.lat, lng: order.customer.coordinates.lng }
      : resolveOrderDestinationCoordinates(order.customer.neighborhoodId, order.customer.deliveryAddress);
    res.json({
      orderReference: order.reference,
      courierName: order.courier?.name || 'Coursier Gloryday Pharma',
      facilityName: order.customer.facilityName,
      deliveryAddress: order.customer.deliveryAddress,
      neighborhoodName: order.customer.neighborhoodName || order.deliveryZone,
      destinationCoordinates: { lat: resolvedDest.lat, lng: resolvedDest.lng },
      contactName: order.customer.contactName,
      contactPhone: order.customer.phone,
      expiresAt: session.expiresAt,
    });
  }));

  app.post('/api/courier-tracking/:token', asyncHandler(async (req, res) => {
    let tracking: Awaited<ReturnType<typeof resolveCourierTrackingToken>>;
    try {
      tracking = await resolveCourierTrackingToken(req.params.token);
    } catch (error) {
      if (isDeliveryLocationsMigrationError(error)) {
        res.status(503).json({ error: 'Le suivi GPS n’est pas activé. Contactez la logistique Gloryday Pharma.' });
        return;
      }
      throw error;
    }
    if (!tracking) {
      res.status(410).json({ error: 'Ce lien de suivi a expiré ou la livraison est terminée.' });
      return;
    }
    const { latitude, longitude, accuracy } = req.body || {};
    if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) {
      res.status(400).json({ error: 'Coordonnées GPS invalides.' });
      return;
    }
    const tokenHash = createHash('sha256').update(req.params.token).digest('hex');
    const nowMs = Date.now();
    const lastPostAt = deliveryTrackingLastPost.get(tokenHash) || 0;
    if (nowMs - lastPostAt < 10_000) {
      res.status(429).json({ error: 'Attendez quelques secondes avant le prochain relevé GPS.' });
      return;
    }
    deliveryTrackingLastPost.set(tokenHash, nowMs);
    if (deliveryTrackingLastPost.size > 5000) {
      for (const [key, timestamp] of deliveryTrackingLastPost) {
        if (nowMs - timestamp > 60 * 60 * 1000) deliveryTrackingLastPost.delete(key);
      }
    }
    const point: DeliveryLocationPoint = { latitude, longitude, accuracy, recordedAt: new Date().toISOString() };
    if (persistence) {
      try {
        await persistence.appendDeliveryLocation(tracking.order.id, point, 'courier-link');
      } catch (error) {
        if (/too frequent/i.test(error instanceof Error ? error.message : String(error))) {
          res.status(429).json({ error: 'Attendez quelques secondes avant le prochain relevé GPS.' });
          return;
        }
        if (isDeliveryLocationsMigrationError(error)) {
          store.deliveryLocations ||= {};
          const existing = store.deliveryLocations[tracking.order.id] || [];
          store.deliveryLocations[tracking.order.id] = [...existing, point].slice(-400);
          saveStoreLocal(store);
          res.json({ success: true, point });
          return;
        }
        throw error;
      }
    } else {
      store.deliveryLocations ||= {};
      const existing = store.deliveryLocations[tracking.order.id] || [];
      store.deliveryLocations[tracking.order.id] = [...existing, point].slice(-400);
      saveStoreLocal(store);
    }
    res.json({ success: true, point });
  }));

  app.get('/api/orders/:id/tracking-link', asyncHandler(async (req, res) => {
    const order = store.orders.find(item => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    try {
      const localSession = store.deliveryTrackingSessions?.[order.id];
      const localActive = Boolean(localSession && !localSession.revokedAt && Date.parse(localSession.expiresAt) > Date.now());
      let status: { active: boolean; expiresAt?: string; token?: string } = {
        active: localActive,
        expiresAt: localSession?.expiresAt || order.courierTrackingExpiresAt,
        token: localActive ? (localSession?.token || order.courierTrackingToken) : undefined,
      };
      if (!status.active && persistence) {
        try {
          const remoteStatus = await persistence.getDeliveryTrackingStatus(order.id);
          status = {
            active: remoteStatus.active,
            expiresAt: remoteStatus.expiresAt || order.courierTrackingExpiresAt,
            token: remoteStatus.active ? order.courierTrackingToken : undefined,
          };
        } catch (err) {
          if (!isDeliveryLocationsMigrationError(err)) throw err;
        }
      }
      const isActiveDelivery = order.status !== 'Livrée' && order.status !== 'Annulée' && order.customer.deliveryMode !== 'retrait';
      if ((!status.active || !status.token) && isActiveDelivery && order.courier?.name) {
        const user = (req as AuthenticatedRequest).authenticatedUser;
        const issued = await issueCourierTrackingSession(order, user?.id || 'system');
        await saveStore(store, persistence);
        status = { active: true, expiresAt: issued.expiresAt, token: issued.token };
      }
      res.json(status);
    } catch (error) {
      if (isDeliveryLocationsMigrationError(error)) {
        res.status(503).json({ error: 'Les liens GPS ne sont pas activés : appliquez la migration Supabase 20261021000002_delivery_location_points.sql.' });
        return;
      }
      throw error;
    }
  }));

  app.post('/api/orders/:id/tracking-link', asyncHandler(async (req, res) => {
    const order = store.orders.find(item => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    const currentStage = order.status === 'Livrée' ? 'delivered' : order.deliveryStage || 'preparation';
    if (order.status === 'Annulée' || currentStage === 'delivered' ||
        !order.courier || order.customer.deliveryMode === 'retrait') {
      res.status(409).json({ error: 'Affectez d’abord un coursier à cette commande pour générer le lien GPS.' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const issued = await issueCourierTrackingSession(order, user.id);
    await saveStore(store, persistence);
    res.json(issued);
  }));

  app.delete('/api/orders/:id/tracking-link', asyncHandler(async (req, res) => {
    const order = store.orders.find(item => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    await clearDeliveryLocations(order.id);
    res.json({ success: true });
  }));

  app.get('/api/orders/:id/live-location', asyncHandler(async (req, res) => {
    const order = store.orders.find(item => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (user.role === 'client' && order.userId !== user.id) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    let points: DeliveryLocationPoint[];
    try {
      points = persistence
        ? await persistence.getDeliveryLocationHistory(order.id)
        : (store.deliveryLocations?.[order.id] || []).slice(-400);
    } catch (error) {
      if (isDeliveryLocationsMigrationError(error)) {
        res.status(503).json({ error: 'Suivi GPS indisponible : appliquez la migration Supabase 20261021000002_delivery_location_points.sql.' });
        return;
      }
      throw error;
    }
    res.json({ points });
  }));

  app.post('/api/orders/:id/live-location', asyncHandler(async (req, res) => {
    const order = store.orders.find(item => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    const currentStage = order.status === 'Livrée' ? 'delivered' : order.deliveryStage || 'preparation';
    if (order.status === 'Annulée' || currentStage === 'delivered' || !['picked_up', 'in_transit'].includes(currentStage)) {
      res.status(409).json({ error: 'Le partage de position est réservé aux livraisons en cours.' });
      return;
    }
    if (!order.courier || order.customer.deliveryMode === 'retrait') {
      res.status(409).json({ error: 'Cette commande ne peut pas partager une position de livraison.' });
      return;
    }
    const { latitude, longitude, accuracy } = req.body || {};
    if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) {
      res.status(400).json({ error: 'Coordonnées GPS invalides.' });
      return;
    }
    const point: DeliveryLocationPoint = {
      latitude,
      longitude,
      accuracy,
      recordedAt: new Date().toISOString(),
    };
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (persistence) {
      try {
        await persistence.appendDeliveryLocation(order.id, point, user.id);
      } catch (error) {
        if (isDeliveryLocationsMigrationError(error)) {
          res.status(503).json({ error: 'Suivi GPS indisponible : appliquez la migration Supabase 20261021000002_delivery_location_points.sql.' });
          return;
        }
        throw error;
      }
    } else {
      const existing = store.deliveryLocations?.[order.id] || [];
      store.deliveryLocations ||= {};
      store.deliveryLocations[order.id] = [...existing, point].slice(-400);
      saveStoreLocal(store);
    }
    res.json({ success: true, point });
  }));

  app.delete('/api/orders/:id/live-location', asyncHandler(async (req, res) => {
    const order = store.orders.find(item => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    await clearDeliveryLocations(order.id);
    res.json({ success: true });
  }));

  app.patch('/api/orders/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, cancellationReason } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const currentStatus = store.orders[idx].status;
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      'À confirmer': ['Confirmée', 'Annulée'],
      'Confirmée': ['En préparation', 'Annulée'],
      'En préparation': ['Annulée'],
      'Livrée': [],
      'Annulée': []
    };
    const shipmentHasLeftDepot = ['picked_up', 'in_transit', 'delivered'].includes(store.orders[idx].deliveryStage || 'preparation');
    const canTransition = allowedTransitions[currentStatus]?.includes(status) &&
      !(currentStatus === 'En préparation' && status === 'Annulée' && shipmentHasLeftDepot);

    if (user.role === 'client') {
      if (store.orders[idx].userId !== user.id || status !== 'Annulée' || currentStatus !== 'À confirmer') {
        res.status(403).json({ error: 'Vous ne pouvez annuler que votre commande en attente de confirmation.' });
        return;
      }
    } else {
      const hasStaffPermission = (permission: StaffPermission) => user.role === 'Super-Admin' || user.permissions?.includes(permission) === true;
      if (status === 'Annulée' ? !hasStaffPermission('orders_cancel') : !hasStaffPermission('orders_confirm')) {
        res.status(403).json({ error: status === 'Annulée' ? 'Le droit « Annuler une commande » est requis.' : 'Le droit « Confirmer une commande » est requis.' });
        return;
      }
      if (user.role === 'Commercial') {
      const isAssigned = store.orders[idx].assignedCommercialId === user.id ||
        store.accounts.some(account => account.user.id === store.orders[idx].userId && account.user.assignedToCommercialId === user.id);
      const canCommercialTransition = (currentStatus === 'À confirmer' && ['Confirmée', 'Annulée'].includes(status)) ||
        (currentStatus === 'Confirmée' && status === 'Annulée');
      if (!isAssigned || !canCommercialTransition) {
        res.status(403).json({ error: 'Cette commande ne vous est pas attribuée ou cette transition n’est pas autorisée.' });
        return;
      }
      }
    }
    if (!canTransition) {
      res.status(409).json({ error: status === 'Livrée'
        ? 'Marquez la livraison comme terminée depuis le suivi logistique, avec sa preuve de réception.'
        : 'Cette transition de statut n’est pas autorisée.' });
      return;
    }
    let order = store.orders[idx];
    const cleanCancellationReason = String(cancellationReason || '').trim().slice(0, 500) || 'Annulation demandée';
    if (status === 'Annulée' && persistence) {
      try {
        const cancellation = await persistence.cancelOrderAndRestoreStock({
          order,
          reason: cleanCancellationReason,
          actor: {
            id: user.id,
            name: user.contactName || user.facilityName || user.phone || user.role,
            role: user.role,
          },
          store,
        });
        order = cancellation.order;
        store.orders[idx] = order;
        if (!cancellation.cancelled) {
          res.json(order);
          return;
        }
      } catch (error) {
        if (isStockLedgerMigrationError(error)) {
          res.status(503).json({ error: 'L’annulation avec journal de stock n’est pas encore disponible. Appliquez les migrations Supabase 20261102000001_stock_movement_ledger.sql et 20261102000002_order_stock_movements.sql.' });
          return;
        }
        const cancellationError = error instanceof Error ? error.message : String(error);
        if (/ne peut plus être annulée|restitution dépasserait|quantité de stock invalide/i.test(cancellationError)) {
          res.status(409).json({ error: 'Le stock ou le statut de cette commande a changé. Actualisez la commande avant de réessayer.' });
          return;
        }
        throw error;
      }
    } else if (status === 'Annulée' && order.stockReserved) {
      const quantitiesByProduct = new Map<string, number>();
      for (const item of order.items) {
        if (item.isQuote || item.isDeferredStock || !item.productId) continue;
        quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) || 0) + item.quantity);
      }
      const restorePlan = Array.from(quantitiesByProduct, ([productId, quantity]) => {
        const product = store.products.find(candidate => candidate.id === productId);
        const previousQuantity = product ? getTrackedProductStock(product) : undefined;
        return product && previousQuantity !== undefined
          ? { product, previousQuantity, newQuantity: previousQuantity + quantity, quantity }
          : null;
      }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      if (restorePlan.some(entry => !Number.isSafeInteger(entry.newQuantity) || entry.newQuantity > 2147483647)) {
        res.status(409).json({ error: 'La quantité retournée ferait dépasser la limite de stock autorisée.' });
        return;
      }
      for (const entry of restorePlan) {
        setTrackedProductStock(entry.product, entry.newQuantity);
        entry.product.status = 'disponible';
        entry.product.hasPhysicalStock = true;
        store.stockMovements.unshift({
          id: randomUUID(),
          productId: entry.product.id,
          productName: entry.product.name,
          reference: order.reference,
          type: 'retour',
          quantity: entry.quantity,
          previousQuantity: entry.previousQuantity,
          newQuantity: entry.newQuantity,
          reason: `Restitution liée à l’annulation de la commande ${order.reference} : ${cleanCancellationReason}`,
          date: new Date().toISOString(),
          performedBy: user.contactName || user.facilityName || user.phone || user.role,
          performedById: user.id,
          performedByRole: user.role,
        });
      }
      order.stockReserved = false;
    }
    if (status === 'Annulée') await clearDeliveryLocations(order.id);
    store.orders[idx].status = status;
    if (status === 'Annulée') store.orders[idx].cancellationReason = cleanCancellationReason;
    if (user.role !== 'client') {
      appendStaffLog(user, {
        category: 'orders',
        severity: status === 'Annulée' ? 'critical' : 'info',
        actionLabel: status === 'Confirmée'
          ? 'Validation bon de commande'
          : status === 'En préparation'
            ? 'Mise en préparation / colisage'
            : status === 'Annulée'
              ? 'Annulation de commande'
              : `Statut commande -> ${status}`,
        targetType: 'order',
        targetId: order.id,
        targetLabel: `${order.reference} · ${order.customer.facilityName}`,
        details: status === 'Annulée'
          ? `Commande ${order.reference} annulée (${order.estimatedTotal.toLocaleString('fr-FR')} FCFA). Motif : ${cleanCancellationReason}.`
          : `Commande ${order.reference} (${order.estimatedTotal.toLocaleString('fr-FR')} FCFA) passée de « ${currentStatus} » à « ${status} ».`,
        previousValue: currentStatus,
        newValue: status
      });
    }
    if (store.orders[idx].userId) {
      store.notifications.unshift({
        id: `notif-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        type: 'status_changed',
        orderId: store.orders[idx].id,
        orderReference: store.orders[idx].reference,
        message: `Le statut de votre commande ${store.orders[idx].reference} est maintenant : ${status}.`,
        targetRole: 'client',
        userId: store.orders[idx].userId,
        read: false
      });
    }
    const customerStatusNotification = store.orders[idx].userId ? store.notifications[0] : null;
    await saveStore(store, persistence);
    if (customerStatusNotification) await sendPushForNotification(customerStatusNotification);
    res.json(store.orders[idx]);
  }));

  app.patch('/api/orders/:id/delivery-stage', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deliveryStage, courier, deliveryProof } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const stage = deliveryStage as DeliveryStage;
    const stageOrder: DeliveryStage[] = ['preparation', 'picked_up', 'in_transit', 'delivered'];
    if (!stageOrder.includes(stage)) {
      res.status(400).json({ error: 'Étape de livraison invalide.' });
      return;
    }
    const actorRole = (req as AuthenticatedRequest).authenticatedUser?.role;
    const order = store.orders[idx];
    const hasCompleteDeliveryProof = Boolean(order.deliveryProof?.receivedBy?.trim() && order.deliveryProof?.receiptReference?.trim());
    const isCompletingLegacyProof = order.status === 'Livrée' && stage === 'delivered' && !hasCompleteDeliveryProof;
    if (order.status === 'Annulée' || (order.status === 'Livrée' && !isCompletingLegacyProof)) {
      res.status(409).json({ error: 'Une commande annulée ou livrée ne peut plus avancer.' });
      return;
    }
    const currentStage = order.status === 'Livrée' ? 'delivered' : order.deliveryStage || 'preparation';
    const stageChanged = currentStage !== stage;
    if (stageChanged) {
      if (order.status !== 'En préparation') {
        res.status(409).json({ error: 'Confirmez la commande et lancez le colisage avant son départ.' });
        return;
      }
      if (stageOrder.indexOf(stage) !== stageOrder.indexOf(currentStage) + 1) {
        res.status(409).json({ error: 'Suivez les étapes dans l’ordre, sans en sauter ni revenir en arrière.' });
        return;
      }
    }

    let courierChanged = false;
    let courierToSave: Order['courier'];
    if (courier !== undefined) {
      if (actorRole !== 'Super-Admin' && actorRole !== 'Admin simple' && actorRole !== 'Logistique') {
        res.status(403).json({ error: 'Seule la logistique peut affecter un coursier.' });
        return;
      }
      if (order.status !== 'Confirmée' && order.status !== 'En préparation') {
        res.status(409).json({ error: 'Confirmez la commande avant d’affecter un coursier.' });
        return;
      }
      const name = String(courier?.name || '').trim().slice(0, 100);
      const phone = String(courier?.phone || '').trim().slice(0, 40);
      if (!name || !phone) {
        res.status(400).json({ error: 'Indiquez le nom et le téléphone du coursier.' });
        return;
      }
      courierToSave = {
        name,
        phone,
        vehicle: String(courier.vehicle || '').trim().slice(0, 100),
        matricule: String(courier.matricule || '').trim().slice(0, 50),
        currentZone: String(courier.currentZone || '').trim().slice(0, 100),
        estimatedTime: String(courier.estimatedTime || '').trim().slice(0, 100)
      };
    }

    if (!stageChanged && courier === undefined && !isCompletingLegacyProof) {
      res.status(400).json({ error: 'Aucun changement de livraison à enregistrer.' });
      return;
    }
    if (stage === 'picked_up' && stageChanged && !(courierToSave || order.courier)) {
      res.status(409).json({ error: 'Affectez un coursier avant de confirmer sa prise en charge.' });
      return;
    }
    if (stage === 'delivered' && (stageChanged || isCompletingLegacyProof)) {
      const receivedBy = String(deliveryProof?.receivedBy || '').trim().slice(0, 120);
      const receiptReference = String(deliveryProof?.receiptReference || '').trim().slice(0, 200);
      if (!receivedBy || !receiptReference) {
        res.status(400).json({ error: 'Indiquez le nom du réceptionnaire et la référence du bon de livraison signé.' });
        return;
      }
      order.deliveryProof = { receivedBy, receiptReference, timestamp: new Date().toISOString() };
    }

    if (courierToSave) {
      order.courier = courierToSave;
      courierChanged = true;
    }
    if (stageChanged) {
      order.deliveryStage = stage;
      if (stage === 'delivered') {
        order.status = 'Livrée';
        order.stockReserved = false;
      }
    }
    if (stage === 'delivered') {
      await clearDeliveryLocations(order.id);
    } else if (order.customer.deliveryMode !== 'retrait' && order.courier?.name) {
      const existingSession = store.deliveryTrackingSessions?.[order.id];
      const hasValidSession = Boolean(
        existingSession &&
        !existingSession.revokedAt &&
        Date.parse(existingSession.expiresAt) > Date.now() &&
        (existingSession.token || order.courierTrackingToken)
      );
      if (courierChanged || !hasValidSession) {
        const actorId = (req as AuthenticatedRequest).authenticatedUser?.id || 'system';
        await issueCourierTrackingSession(order, actorId);
      }
    }

    const stageLabel: Record<DeliveryStage, string> = {
      preparation: 'préparation',
      picked_up: 'prise en charge par le coursier',
      in_transit: 'acheminement',
      delivered: 'livraison terminée'
    };
    if (order.userId && (stageChanged || courierChanged)) {
      store.notifications.unshift({
        id: `notif-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        type: 'status_changed',
        orderId: order.id,
        orderReference: order.reference,
        message: stageChanged
          ? `Le suivi de votre commande ${order.reference} est passé à l’étape : ${stageLabel[stage]}.`
          : `Un coursier a été affecté à votre commande ${order.reference}.`,
        targetRole: 'client',
        userId: order.userId,
        read: false
      });
    }
    const customerDeliveryNotification = order.userId && (stageChanged || courierChanged) ? store.notifications[0] : null;

    if (courierChanged && courierToSave) {
      const assignmentMessage = `${courierToSave.name} (${courierToSave.phone}) est affecté à la commande ${order.reference}. Le lien GPS de suivi en direct a été généré automatiquement.`;
      const dispatchRoles: AppRole[] = ['Super-Admin', 'Admin simple', 'Logistique'];
      const dispatchNotifications: AppNotification[] = dispatchRoles.map(targetRole => ({
        id: `notif-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        type: 'status_changed',
        title: 'Coursier affecté · Lien GPS prêt',
        orderId: order.id,
        orderReference: order.reference,
        message: assignmentMessage,
        targetRole,
        read: false
      }));
      store.notifications.unshift(...dispatchNotifications);
    }

    const actorUser = (req as AuthenticatedRequest).authenticatedUser;
    appendStaffLog(actorUser, {
      category: 'orders',
      severity: 'info',
      actionLabel: stage === 'delivered'
        ? 'Livraison terminée & validée'
        : courierChanged
          ? 'Affectation coursier & étape logistique'
          : 'Avancement étape logistique',
      targetType: 'order',
      targetId: order.id,
      targetLabel: `${order.reference} · ${order.customer.facilityName}`,
      details: stage === 'delivered'
        ? `Livraison confirmée pour ${order.reference} (Réceptionné par : ${order.deliveryProof?.receivedBy || 'Client'}, BL : ${order.deliveryProof?.receiptReference || 'Signé'}).`
        : `Suivi logistique de ${order.reference} mis à jour : ${stageLabel[stage]}${order.courier?.name ? ` · Coursier : ${order.courier.name}` : ''}.`,
      previousValue: stageLabel[currentStage],
      newValue: stageLabel[stage]
    });

    await saveStore(store, persistence);
    if (customerDeliveryNotification) await sendPushForNotification(customerDeliveryNotification);
    res.json(order);
  }));

  app.patch('/api/orders/:id/finance', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (persistence) store.orders = await persistence.loadOrders();

    const idx = store.orders.findIndex(order => order.id === req.params.id || order.reference === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    const order = store.orders[idx];
    const body = req.body || {};
    const hasPermission = (permission: StaffPermission) => user.role === 'Super-Admin' || user.permissions?.includes(permission) === true;
    const sameValue = (left: unknown, right: unknown) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    const currentInvoices = order.invoices || [];
    const currentInstallments = order.installments || [];
    const invoices = Array.isArray(body.invoices) ? body.invoices : [];
    const installments = Array.isArray(body.installments) ? body.installments : [];
    if ((body.invoices !== undefined && (!Array.isArray(body.invoices) || invoices.length > 200)) ||
        (body.installments !== undefined && (!Array.isArray(body.installments) || installments.length > 200))) {
      res.status(400).json({ error: 'La liste des documents ou des paiements est invalide.' });
      return;
    }

    const invoiceIds = new Set<string>();
    const invoiceNumbers = new Set(store.orders.flatMap(item => (item.invoices || []).map(invoice => invoice.number)));
    const newInvoices: InvoiceRecord[] = [];
    for (const raw of invoices) {
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id.trim() || invoiceIds.has(raw.id)) {
        res.status(400).json({ error: 'Un identifiant de facture ou d’avoir est invalide ou en double.' });
        return;
      }
      invoiceIds.add(raw.id);
      if (currentInvoices.some(invoice => invoice.id === raw.id)) continue;

      const type = raw.type === 'facture' || raw.type === 'avoir' ? raw.type : null;
      const number = typeof raw.number === 'string' ? raw.number.trim().slice(0, 100) : '';
      const issueDate = typeof raw.issueDate === 'string' ? raw.issueDate : '';
      const tvaRate = Number(raw.tvaRate);
      const reason = typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 500) : undefined;
      const numberMatchesType = type === 'facture' ? /^FAC-\d{4}-[A-Z0-9-]+$/.test(number) : /^AVOIR-\d{4}-[A-Z0-9-]+$/.test(number);
      if (!type || !numberMatchesType || invoiceNumbers.has(number) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !Number.isFinite(Date.parse(issueDate)) ||
          !Number.isFinite(tvaRate) || tvaRate < 0 || tvaRate > 1 || (type === 'avoir' && !reason)) {
        res.status(400).json({ error: 'Les informations de la facture ou de l’avoir sont invalides.' });
        return;
      }
      invoiceNumbers.add(number);
      const totalTTC = Math.max(0, Math.trunc(order.estimatedTotal));
      const totalHT = tvaRate > 0 ? Math.round(totalTTC / (1 + tvaRate)) : totalTTC;
      newInvoices.push({
        id: raw.id.slice(0, 120),
        orderId: order.id,
        orderReference: order.reference,
        type,
        number,
        issueDate,
        clientFacilityName: order.customer.facilityName,
        tvaRate,
        tvaAmount: totalTTC - totalHT,
        totalHT,
        totalTTC,
        reason: type === 'avoir' ? reason : undefined,
      });
    }
    if (newInvoices.length > 0 && !hasPermission('orders_finance_manage')) {
      res.status(403).json({ error: 'Vous ne pouvez pas créer ou modifier les documents de facturation.' });
      return;
    }

    const installmentIds = new Set<string>();
    const newInstallments: PaymentInstallment[] = [];
    for (const raw of installments) {
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id.trim() || installmentIds.has(raw.id)) {
        res.status(400).json({ error: 'Un identifiant de paiement est invalide ou en double.' });
        return;
      }
      installmentIds.add(raw.id);
      if (currentInstallments.some(installment => installment.id === raw.id)) continue;

      const amount = Number(raw.amount);
      const paymentMethod = ['especes', 'airtel_money', 'moov_money', 'virement', 'cheque'].includes(raw.paymentMethod)
        ? raw.paymentMethod as PaymentInstallment['paymentMethod']
        : null;
      const type = raw.type === 'acompte' || raw.type === 'solde' ? raw.type : null;
      const paidAt = typeof raw.paidAt === 'string' ? raw.paidAt : '';
      if (!type || !paymentMethod || !Number.isSafeInteger(amount) || amount <= 0 ||
          raw.status !== 'valide' || !Number.isFinite(Date.parse(paidAt))) {
        res.status(400).json({ error: 'Les informations du paiement sont invalides.' });
        return;
      }
      newInstallments.push({
        id: raw.id.slice(0, 120),
        type,
        amount,
        paymentMethod,
        transactionReference: typeof raw.transactionReference === 'string' ? raw.transactionReference.trim().slice(0, 120) || undefined : undefined,
        status: 'valide',
        paidAt,
        validatedBy: typeof raw.validatedBy === 'string' ? raw.validatedBy.trim().slice(0, 120) || undefined : undefined,
      });
    }
    if (newInstallments.length > 0 && !hasPermission('payments_manage') && !hasPermission('receivables_payments_manage')) {
      res.status(403).json({ error: 'Vous ne pouvez pas enregistrer un paiement sur cette commande.' });
      return;
    }

    if (newInstallments.length > 0) {
      const totalPaid = getOrderPaidAmount(order) + newInstallments
        .reduce((sum, installment) => sum + (installment.status === 'valide' ? installment.amount : 0), 0);
      if (totalPaid > order.estimatedTotal) {
        res.status(409).json({ error: 'Le montant des versements dépasse le total de la commande.' });
        return;
      }
      order.installments = [...currentInstallments, ...newInstallments];
      order.amountPaid = totalPaid;
      order.isPaid = totalPaid >= order.estimatedTotal;
      if (order.isPaid) order.collectionDueDate = undefined;
    }

    if (body.collectionDueDate !== undefined) {
      const rawDueDate = body.collectionDueDate === null ? '' : String(body.collectionDueDate).trim();
      if (rawDueDate !== (order.collectionDueDate || '') && !hasPermission('receivables_reminders_manage')) {
        res.status(403).json({ error: 'Vous ne pouvez pas modifier l’échéance de recouvrement.' });
        return;
      }
      const parsedDueDate = rawDueDate ? new Date(`${rawDueDate}T00:00:00.000Z`) : null;
      const invalidDueDate = rawDueDate && (
        !/^\d{4}-\d{2}-\d{2}$/.test(rawDueDate)
        || !parsedDueDate
        || !Number.isFinite(parsedDueDate.getTime())
        || parsedDueDate.toISOString().slice(0, 10) !== rawDueDate
      );
      if (invalidDueDate) {
        res.status(400).json({ error: 'La date de recouvrement doit être une date valide au format AAAA-MM-JJ.' });
        return;
      }
      order.collectionDueDate = rawDueDate || undefined;
    }

    if (newInvoices.length > 0) order.invoices = [...currentInvoices, ...newInvoices];

    if (body.courier !== undefined) {
      const requestedCourier = body.courier === null ? undefined : body.courier;
      if (!sameValue(requestedCourier, order.courier) && !hasPermission('logistics_manage')) {
        res.status(403).json({ error: 'Vous ne pouvez pas modifier l’affectation du coursier.' });
        return;
      }
      if (body.courier === null) {
        order.courier = undefined;
      } else if (typeof body.courier === 'object' && typeof body.courier.name === 'string' && body.courier.name.trim()) {
        order.courier = {
          name: body.courier.name.trim().slice(0, 120),
          phone: typeof body.courier.phone === 'string' ? body.courier.phone.trim().slice(0, 40) : '',
          vehicle: typeof body.courier.vehicle === 'string' ? body.courier.vehicle.trim().slice(0, 80) : '',
          matricule: typeof body.courier.matricule === 'string' ? body.courier.matricule.trim().slice(0, 80) : '',
        };
      } else {
        res.status(400).json({ error: 'Les informations du coursier sont invalides.' });
        return;
      }
    }

    if (body.deliveryProof !== undefined) {
      if (!sameValue(body.deliveryProof, order.deliveryProof) && !hasPermission('logistics_manage')) {
        res.status(403).json({ error: 'Vous ne pouvez pas modifier la preuve de livraison.' });
        return;
      }
      if (body.deliveryProof === null) {
        order.deliveryProof = undefined;
      } else if (typeof body.deliveryProof === 'object' && typeof body.deliveryProof.receivedBy === 'string' && body.deliveryProof.receivedBy.trim()) {
        const timestamp = typeof body.deliveryProof.timestamp === 'string' ? body.deliveryProof.timestamp : '';
        if (!Number.isFinite(Date.parse(timestamp))) {
          res.status(400).json({ error: 'La date de preuve de livraison est invalide.' });
          return;
        }
        order.deliveryProof = {
          receivedBy: body.deliveryProof.receivedBy.trim().slice(0, 120),
          receiptReference: typeof body.deliveryProof.receiptReference === 'string' ? body.deliveryProof.receiptReference.trim().slice(0, 120) || undefined : undefined,
          signatureUrl: typeof body.deliveryProof.signatureUrl === 'string' ? body.deliveryProof.signatureUrl.trim().slice(0, 1000) || undefined : undefined,
          photoUrl: typeof body.deliveryProof.photoUrl === 'string' ? body.deliveryProof.photoUrl.trim().slice(0, 2000) || undefined : undefined,
          timestamp,
        };
      } else {
        res.status(400).json({ error: 'Les informations de preuve de livraison sont invalides.' });
        return;
      }
    }

    if (body.isPartialDelivery !== undefined) {
      if (body.isPartialDelivery !== order.isPartialDelivery && !hasPermission('logistics_manage')) {
        res.status(403).json({ error: 'Vous ne pouvez pas modifier le statut de livraison partielle.' });
        return;
      }
      if (typeof body.isPartialDelivery !== 'boolean') {
        res.status(400).json({ error: 'Le statut de livraison partielle est invalide.' });
        return;
      }
      order.isPartialDelivery = body.isPartialDelivery;
    }
    if (body.partialDeliveryNotes !== undefined) {
      const requestedNotes = typeof body.partialDeliveryNotes === 'string' ? body.partialDeliveryNotes.trim().slice(0, 2000) || undefined : body.partialDeliveryNotes;
      if (!sameValue(requestedNotes, order.partialDeliveryNotes) && !hasPermission('logistics_manage')) {
        res.status(403).json({ error: 'Vous ne pouvez pas modifier les reliquats de livraison.' });
        return;
      }
      if (typeof body.partialDeliveryNotes !== 'string') {
        res.status(400).json({ error: 'Le détail de livraison partielle est invalide.' });
        return;
      }
      order.partialDeliveryNotes = body.partialDeliveryNotes.trim().slice(0, 2000) || undefined;
    }

    appendStaffLog(user, {
      category: 'orders',
      severity: 'info',
      actionLabel: 'Mise à jour financière et logistique',
      targetType: 'order',
      targetId: order.id,
      targetLabel: `${order.reference} · ${order.customer.facilityName}`,
      details: `${newInvoices.length} document(s) créé(s), ${newInstallments.length} versement(s) ajouté(s) pour ${order.reference}.`,
    });
    await saveStore(store, persistence);
    res.json(redactOrderFinancialFields(order, user));
  }));

  app.post('/api/orders/:id/collection-reminders', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (persistence) store.orders = await persistence.loadOrders();
    const order = store.orders.find((item) => item.id === req.params.id || item.reference === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    if (user.role === 'Commercial') {
      const assigned = order.assignedCommercialId === user.id || store.accounts.some(
        (account) => account.user.id === order.userId && account.user.assignedToCommercialId === user.id
      );
      if (!assigned) {
        res.status(403).json({ error: 'Cette créance ne vous est pas attribuée.' });
        return;
      }
    }
    if (order.status === 'Annulée' || getOrderRemainingBalance(order) <= 0) {
      res.status(409).json({ error: 'Cette commande ne présente plus de solde à recouvrer.' });
      return;
    }

    const id = typeof req.body?.id === 'string' ? req.body.id.trim() : '';
    const channel = req.body?.channel;
    const outcome = req.body?.outcome;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : '';
    const nextFollowUpDate = typeof req.body?.nextFollowUpDate === 'string' ? req.body.nextFollowUpDate.trim() : '';
    const parsedFollowUp = nextFollowUpDate ? new Date(`${nextFollowUpDate}T00:00:00.000Z`) : null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
        !COLLECTION_REMINDER_CHANNELS.includes(channel) || !COLLECTION_REMINDER_OUTCOMES.includes(outcome) ||
        (nextFollowUpDate && (!/^\d{4}-\d{2}-\d{2}$/.test(nextFollowUpDate) || !parsedFollowUp ||
          !Number.isFinite(parsedFollowUp.getTime()) || parsedFollowUp.toISOString().slice(0, 10) !== nextFollowUpDate)) ||
        (outcome === 'promesse_paiement' && !nextFollowUpDate)) {
      res.status(400).json({ error: 'Vérifiez le canal, le résultat et la date de suivi. Une promesse de paiement doit avoir une date de rappel.' });
      return;
    }

    const existing = (store.collectionReminders || []).find((item) => item.id === id);
    if (existing) {
      res.status(200).json(existing);
      return;
    }
    const reminder: CollectionReminder = {
      id,
      orderId: order.id,
      orderReference: order.reference,
      clientId: order.userId,
      clientName: order.customer.facilityName,
      occurredAt: new Date().toISOString(),
      channel,
      outcome,
      notes: notes || undefined,
      nextFollowUpDate: nextFollowUpDate || undefined,
      recordedById: user.id,
      recordedByName: user.contactName || user.facilityName || 'Collaborateur',
      recordedByRole: user.role,
    };
    store.collectionReminders ||= [];
    store.collectionReminders.unshift(reminder);
    const previousLogs = [...(store.staffLogs || [])];
    const log = appendStaffLog(user, {
      category: 'finance',
      actionLabel: 'Relance de créance enregistrée',
      targetType: 'order',
      targetId: order.id,
      targetLabel: `${order.reference} · ${order.customer.facilityName}`,
      details: `Relance ${channel} · ${outcome}${nextFollowUpDate ? ` · prochain suivi le ${nextFollowUpDate}` : ''}${notes ? ` · ${notes}` : ''}.`,
      newValue: `${getOrderRemainingBalance(order).toLocaleString('fr-FR')} FCFA restant dû`,
    });
    try {
      await saveCollectionReminder(store, persistence, reminder, log);
    } catch (error) {
      store.collectionReminders = store.collectionReminders.filter((item) => item.id !== reminder.id);
      store.staffLogs = previousLogs;
      if (isCollectionRemindersMigrationError(error)) {
        res.status(503).json({ error: 'Le journal des relances n’est pas encore créé dans Supabase. Appliquez la migration 20261102000005_collection_reminders.sql.' });
        return;
      }
      throw error;
    }
    res.status(201).json(reminder);
  }));

  app.patch('/api/orders/:id/payment', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isPaid } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    if (typeof isPaid !== 'boolean') {
      res.status(400).json({ error: 'Le statut de paiement doit être vrai ou faux.' });
      return;
    }
    const wasPaid = store.orders[idx].isPaid;
    const order = store.orders[idx];
    const verifiedInstallmentTotal = (order.installments || []).reduce(
      (sum, installment) => sum + (installment.status === 'valide' ? Math.max(0, Number(installment.amount) || 0) : 0),
      0,
    );
    order.isPaid = isPaid;
    order.amountPaid = isPaid
      ? order.estimatedTotal
      : Math.min(order.estimatedTotal, wasPaid ? verifiedInstallmentTotal : Math.max(verifiedInstallmentTotal, Number(order.amountPaid) || 0));
    if (isPaid) order.collectionDueDate = undefined;
    if (store.orders[idx].mobilePayment) {
      store.orders[idx].mobilePayment!.status = isPaid ? 'verified' : 'pending';
      if (isPaid && !store.orders[idx].mobilePayment!.validatedAt) {
        store.orders[idx].mobilePayment!.validatedAt = new Date().toISOString();
      }
    }
    const actorUser = (req as AuthenticatedRequest).authenticatedUser;
    appendStaffLog(actorUser, {
      category: 'orders',
      severity: isPaid ? 'info' : 'warning',
      actionLabel: isPaid ? 'Validation paiement commande' : 'Annulation statut payé',
      targetType: 'order',
      targetId: store.orders[idx].id,
      targetLabel: `${store.orders[idx].reference} · ${store.orders[idx].customer.facilityName}`,
      details: `Statut financier de ${store.orders[idx].reference} (${store.orders[idx].estimatedTotal.toLocaleString('fr-FR')} FCFA) défini sur « ${isPaid ? 'Payée' : 'Non payée'} ».`,
      previousValue: wasPaid ? 'Payée' : 'Non payée',
      newValue: isPaid ? 'Payée' : 'Non payée'
    });
    if (wasPaid !== isPaid && store.orders[idx].userId) {
      store.notifications.unshift({
        id: `notif-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        type: 'payment_updated',
        orderId: store.orders[idx].id,
        orderReference: store.orders[idx].reference,
        message: isPaid
          ? `Le paiement de votre commande ${store.orders[idx].reference} a été confirmé.`
          : `Le paiement de votre commande ${store.orders[idx].reference} est en attente de vérification.`,
        targetRole: 'client',
        userId: store.orders[idx].userId,
        read: false
      });
    }
    const customerPaymentNotification = wasPaid !== isPaid && store.orders[idx].userId ? store.notifications[0] : null;
    await saveStore(store, persistence);
    if (customerPaymentNotification) await sendPushForNotification(customerPaymentNotification);
    res.json(store.orders[idx]);
  }));

  app.patch('/api/orders/:id/mobile-payment', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mobilePayment } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (user.role === 'client' && store.orders[idx].userId !== user.id) {
      res.status(403).json({ error: 'Cette commande ne vous appartient pas.' });
      return;
    }
    const transactionReference = String(mobilePayment?.transactionReference || '').trim();
    if (!transactionReference) {
      res.status(400).json({ error: 'La référence de transaction est obligatoire.' });
      return;
    }
    if (transactionReference && store.orders.some((order, orderIndex) =>
      orderIndex !== idx && order.mobilePayment?.transactionReference?.toLowerCase() === transactionReference.toLowerCase()
    )) {
      res.status(409).json({ error: 'Cette référence de transaction est déjà associée à une autre commande.' });
      return;
    }
    const submittedPayment = mobilePayment ? {
      provider: mobilePayment.provider === 'moov_money' ? 'moov_money' as const : 'airtel_money' as const,
      merchantPhone: String(mobilePayment.merchantPhone || '').slice(0, 40),
      transactionReference: transactionReference.slice(0, 100),
      senderPhone: String(mobilePayment.senderPhone || '').slice(0, 40),
      isPrePaid: false,
      status: 'submitted' as const,
      amount: store.orders[idx].estimatedTotal
    } : undefined;
    store.orders[idx].mobilePayment = submittedPayment;
    store.orders[idx].customer.mobilePayment = submittedPayment;
    store.notifications.unshift({
      id: `notif-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'payment_updated',
      orderId: store.orders[idx].id,
      orderReference: store.orders[idx].reference,
      message: `Référence Mobile Money ${transactionReference.slice(0, 100)} reçue pour la commande ${store.orders[idx].reference}; vérifiez le paiement.`,
      targetRole: 'Super-Admin',
      read: false
    });
    if (store.orders[idx].userId) {
      store.notifications.unshift({
        id: `notif-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        type: 'payment_updated',
        orderId: store.orders[idx].id,
        orderReference: store.orders[idx].reference,
        message: `Votre référence de paiement pour la commande ${store.orders[idx].reference} a été transmise pour vérification.`,
        targetRole: 'client',
        userId: store.orders[idx].userId,
        read: false
      });
    }
    const customerMobilePaymentNotification = store.orders[idx].userId ? store.notifications[0] : null;
    await saveStore(store, persistence);
    if (customerMobilePaymentNotification) await sendPushForNotification(customerMobilePaymentNotification);
    res.json(store.orders[idx]);
  }));

  app.patch('/api/orders/:id/expected-delivery', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { expectedDeliveryDate, expectedDeliverySlot } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (user.role === 'client' && store.orders[idx].userId !== user.id) {
      res.status(403).json({ error: 'Cette commande ne vous appartient pas.' });
      return;
    }
    if (store.orders[idx].status === 'Annulée' || store.orders[idx].status === 'Livrée') {
      res.status(409).json({ error: 'Impossible de modifier la date de livraison d’une commande déjà livrée ou annulée.' });
      return;
    }
    const cleanDate = String(expectedDeliveryDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      res.status(400).json({ error: 'Format de date de livraison invalide (AAAA-MM-JJ requis).' });
      return;
    }
    const cleanSlot = String(expectedDeliverySlot || '').trim().slice(0, 120);
    store.orders[idx].expectedDeliveryDate = cleanDate;
    if (cleanSlot) {
      store.orders[idx].expectedDeliverySlot = cleanSlot;
    }
    await saveStore(store, persistence);
    res.json(store.orders[idx]);
  }));

  // ==========================================
  // 6. REAL-TIME ADMIN STATS & EVENTS
  // ==========================================
  app.get('/api/admin/stats', (_req, res) => {
    const validOrders = store.orders.filter(o => o.status !== 'Annulée');
    const totalRevenue = validOrders.reduce((s, o) => s + o.estimatedTotal, 0);
    const ordersToConfirm = store.orders.filter(o => o.status === 'À confirmer').length;

    const now = new Date();
    const monthOrders = validOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const averageBasket = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;
    const pendingPaymentAmount = validOrders.reduce((sum, order) => sum + getOrderRemainingBalance(order), 0);

    const ordersByStatus: Record<OrderStatus, number> = {
      'À confirmer': store.orders.filter(o => o.status === 'À confirmer').length,
      'Confirmée': store.orders.filter(o => o.status === 'Confirmée').length,
      'En préparation': store.orders.filter(o => o.status === 'En préparation').length,
      'Livrée': store.orders.filter(o => o.status === 'Livrée').length,
      'Annulée': store.orders.filter(o => o.status === 'Annulée').length
    };

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    validOrders.forEach(o => {
      o.items.forEach(item => {
        const cur = productSalesMap.get(item.productName) || { name: item.productName, quantity: 0, revenue: 0 };
        cur.quantity += item.quantity;
        cur.revenue += item.total;
        productSalesMap.set(item.productName, cur);
      });
    });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const stats: AdminStats = {
      totalRevenue,
      ordersToConfirm,
      monthOrdersCount: monthOrders.length,
      averageBasket,
      totalClients: store.accounts.length,
      pendingPaymentAmount,
      salesLast14Days: [],
      ordersByStatus,
      topProducts,
      priorityOrders: store.orders.filter(o => o.status === 'À confirmer').slice(0, 5),
      inactiveClientsCount: 0
    };

    res.json(stats);
  });

  app.get('/api/admin/logs', (_req, res) => {
    const logs = Array.isArray(store.staffLogs) ? store.staffLogs.map(normalizeActivityLogEntry) : [];
    res.json(logs);
  });

  app.get('/api/admin/activity-logs', (_req, res) => {
    const logs = Array.isArray(store.staffLogs) ? store.staffLogs.map(normalizeActivityLogEntry) : [];
    res.json(logs);
  });

  app.delete('/api/admin/logs', asyncHandler(async (req, res) => {
    const actor = (req as AuthenticatedRequest).authenticatedUser;
    store.staffLogs = [];
    appendStaffLog(actor, {
      actionType: 'LOGS_RESET',
      category: 'system',
      severity: 'warning',
      actionLabel: 'Réinitialisation du journal des logs',
      targetType: 'settings',
      targetId: 'activity_logs',
      targetLabel: 'Journal des actions collaborateurs',
      details: 'Le journal des événements collaborateurs (activity_logs) a été archivé et réinitialisé par le Super-Admin.'
    });
    await saveStore(store, persistence);
    res.json({ success: true, logs: store.staffLogs });
  }));

  app.post('/api/push/subscriptions', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const raw = req.body?.subscription;
    const endpoint = String(raw?.endpoint || '').trim();
    const p256dh = String(raw?.keys?.p256dh || '').trim();
    const auth = String(raw?.keys?.auth || '').trim();
    let endpointUrl: URL | null = null;
    try { endpointUrl = new URL(endpoint); } catch {}
    const hostname = endpointUrl?.hostname.toLowerCase() || '';
    const allowedPushHost = hostname === 'fcm.googleapis.com'
      || hostname === 'fcmregistrations.googleapis.com'
      || hostname === 'push.services.mozilla.com'
      || hostname.endsWith('.push.services.mozilla.com')
      || hostname.endsWith('.push.apple.com')
      || hostname.endsWith('.notify.windows.com');

    if (!endpointUrl || endpointUrl.protocol !== 'https:' || endpointUrl.username || endpointUrl.password || endpointUrl.port || !allowedPushHost
      || endpoint.length > 2048 || p256dh.length < 20 || p256dh.length > 256 || auth.length < 8 || auth.length > 128) {
      res.status(400).json({ error: 'Abonnement de notifications invalide.' });
      return;
    }
    if (!persistence || !process.env.VAPID_PUBLIC_KEY?.trim() || !process.env.VAPID_PRIVATE_KEY?.trim() || !process.env.VAPID_SUBJECT?.trim()) {
      res.status(503).json({ error: 'Les notifications push ne sont pas encore configurées sur le serveur.' });
      return;
    }

    const currentSubscriptions = await persistence.listPushSubscriptions([user.id]);
    if (currentSubscriptions.length >= 20 && !currentSubscriptions.some(item => item.endpoint === endpoint)) {
      res.status(409).json({ error: 'Cet utilisateur a déjà atteint la limite d’appareils activés.' });
      return;
    }

    await persistence.upsertPushSubscription(user.id, {
      endpoint,
      expirationTime: Number.isFinite(Number(raw?.expirationTime)) ? Number(raw.expirationTime) : null,
      keys: { p256dh, auth }
    });
    res.status(201).json({ success: true });
  }));

  app.post('/api/push/unsubscribe', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const endpoint = String(req.body?.endpoint || '').trim();
    if (!endpoint || endpoint.length > 2048) {
      res.status(400).json({ error: 'Adresse d’abonnement invalide.' });
      return;
    }
    if (persistence) await persistence.deletePushSubscription(user.id, endpoint);
    res.json({ success: true });
  }));

  app.get('/api/events', (_req, res) => {
    const user = (_req as AuthenticatedRequest).authenticatedUser!;
    const requestedSince = Number(_req.query.since);
    const since = Number.isFinite(requestedSince) && requestedSince > 0 ? requestedSince : 0;
    const visibleNotifications = store.notifications.filter(notification => {
      if (user.role === 'Super-Admin') {
        return notification.userId === user.id || (!notification.userId && (notification.targetRole === 'all' || notification.targetRole === 'Super-Admin'));
      }
      return notification.userId === user.id || (!notification.userId && (notification.targetRole === 'all' || notification.targetRole === user.role));
    });
    const recentNotifications = visibleNotifications
      .filter(notification => Date.parse(notification.timestamp) >= since)
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
      .slice(0, 30);
    res.json(recentNotifications);
  });

  app.post('/api/events/announcement', asyncHandler(async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    if (title.length < 3 || title.length > 120 || message.length < 3 || message.length > 2000) {
      res.status(400).json({ error: 'Le titre doit contenir 3 à 120 caractères et le message 3 à 2 000 caractères.' });
      return;
    }

    const clients = store.accounts.filter(account => account.user.role === 'client');
    if (clients.length === 0) {
      res.status(409).json({ error: 'Aucun compte client ne peut recevoir cette information.' });
      return;
    }

    const timestamp = new Date().toISOString();
    const announcements: AppNotification[] = clients.map(({ user }) => ({
      id: `notif-${randomUUID()}`,
      timestamp,
      type: 'admin_message',
      title,
      message,
      targetRole: 'client',
      userId: user.id,
      read: false
    }));
    store.notifications.unshift(...announcements);
    await saveNotificationBatch(store, persistence, announcements);
    const push = await sendPushNotifications(clients.map(({ user }) => user.id), title, message, '/#packs');
    res.status(201).json({
      sentCount: announcements.length,
      pushConfigured: push.configured,
      pushSentCount: push.sentCount
    });
  }));

  app.post('/api/events/read', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const requestedIds = Array.isArray(req.body?.ids)
      ? new Set(req.body.ids.slice(0, 100).map((id: unknown) => String(id)))
      : new Set<string>();
    let updated = 0;
    for (const notification of store.notifications) {
      const belongsToUser = notification.userId === user.id || (
        !notification.userId && (notification.targetRole === 'all' || notification.targetRole === user.role)
      );
      if (requestedIds.has(notification.id) && belongsToUser && !notification.read) {
        notification.read = true;
        updated += 1;
      }
    }
    if (updated > 0) await saveStore(store, persistence);
    res.json({ updated });
  }));

  app.get('/api/supabase/migration-sql', (_req, res) => {
    try {
      const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
      const fileNames = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort();
      const incrementalFiles = fileNames.filter(name =>
        name.startsWith('20261021') ||
        name.startsWith('20261022000001') ||
        name.startsWith('20261023') ||
        name.startsWith('20261102')
      );
      const targetFiles = incrementalFiles.length > 0 ? incrementalFiles : fileNames.slice(-1);
      if (targetFiles.length > 0) {
        const combinedSql = targetFiles
          .map(name => `-- Migration: ${name}\n${fs.readFileSync(path.join(migrationsDir, name), 'utf-8').trim()}`)
          .join('\n\n');
        res.json({ sql: combinedSql, name: targetFiles[targetFiles.length - 1] });
        return;
      }
    } catch (err) {
      console.error('Error reading Supabase migrations:', err);
    }
    res.json({ sql: '' });
  });

  app.get('/api/download-project-zip', (_req, res) => {
    const updatedZipPath = path.join(__dirname, 'public', 'gloryday-pharma-corrige-20261022.zip');
    const fallbackZipPath = path.join(__dirname, 'public', 'assets', 'aistudio', 'gloryday-pharma-corrige-20261022_c96e8e48.zip');
    const targetPath = fs.existsSync(updatedZipPath) ? updatedZipPath : fallbackZipPath;
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'Archive ZIP introuvable.' });
      return;
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="gloryday-pharma-corrige-20261022.zip"');
    fs.createReadStream(targetPath).pipe(res);
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    console.error('Request failed:', err);
    res.status(500).json({ error: 'Une erreur est survenue pendant l’enregistrement. Réessayez dans un instant.' });
  });

  // ==========================================
  // 7. VITE DEV MIDDLEWARE OR STATIC PROD
  // ==========================================
  if (options.serveFrontend) {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        root: __dirname,
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  return app;
}

let vercelAppPromise: ReturnType<typeof createServerApp> | undefined;
export function getVercelApp() {
  if (!vercelAppPromise) {
    const pending = createServerApp();
    vercelAppPromise = pending;
    void pending.catch(() => {
      // Keep successful initialization warm, but let a later request retry after
      // transient Supabase or network failures during cold start.
      if (vercelAppPromise === pending) vercelAppPromise = undefined;
    });
  }
  return vercelAppPromise;
}

function resolveServerPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.APP_PORT || process.env.PORT) || 3000;
}

async function startServer() {
  const app = await createServerApp({ serveFrontend: true });
  const preferredPort = resolveServerPort();
  const server = app.listen(preferredPort, '0.0.0.0', () => {
    console.log(`Gloryday Pharma Server running on http://0.0.0.0:${preferredPort}`);
  });
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && preferredPort !== 3000) {
      console.warn(`Port ${preferredPort} occupé, basculement sur le port 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log(`Gloryday Pharma Server running on http://0.0.0.0:3000`);
      });
    } else {
      throw err;
    }
  });
}

if (!process.env.VERCEL) void startServer();
