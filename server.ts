import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { INITIAL_PRODUCTS, INITIAL_PACKS } from './src/data/initialProducts.js';
import { getEstimatedDeliveryText, getNeighborhoodById } from './src/data/librevilleZones.js';
import { calculateCartVolumeSummary, calculateItemVolumePrice } from './src/utils/volumeDiscount.js';
import {
  createSupabaseStorePersistence,
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
  AppNotification,
  AdminStats,
  CommercialQuote,
  DirectMessage,
  AppRole,
  DeliveryStage,
  OrderStatus,
  DeliveryLocationPoint
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/tmp/gloryday-pharma' : path.join(__dirname, 'data'));
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'gloryday_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const STAFF_ROLES: StaffRole[] = ['Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'];
type SessionEntry = { user: User; expiresAt: number };
type StoredDeliveryTrackingSession = { tokenHash: string; expiresAt: string; createdAt: string; revokedAt?: string };
type ServerStore = PersistentServerStore & {
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

function staffAccountSummary(account: ManagedStaffAccount) {
  return {
    id: account.id,
    identifier: account.identifier,
    name: account.name,
    role: account.role,
    active: account.active,
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

function loadStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        products: Array.isArray(parsed.products) && parsed.products.length > 0 ? parsed.products : (process.env.NODE_ENV === 'production' ? [] : INITIAL_PRODUCTS),
        packs: Array.isArray(parsed.packs) && parsed.packs.length > 0 ? parsed.packs : (process.env.NODE_ENV === 'production' ? [] : INITIAL_PACKS),
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        staffAccounts: Array.isArray(parsed.staffAccounts) ? parsed.staffAccounts : [],
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        deliveryLocations: parsed.deliveryLocations && typeof parsed.deliveryLocations === 'object' && !Array.isArray(parsed.deliveryLocations)
          ? parsed.deliveryLocations
          : {},
        deliveryTrackingSessions: parsed.deliveryTrackingSessions && typeof parsed.deliveryTrackingSessions === 'object' && !Array.isArray(parsed.deliveryTrackingSessions)
          ? parsed.deliveryTrackingSessions
          : {}
      };
    }
  } catch (err) {
    console.error('Error loading store.json, initializing fresh store:', err);
    if (fs.existsSync(STORE_PATH)) {
      throw new Error('Persistent data store is unreadable; startup stopped to prevent overwriting it.');
    }
  }

  const initialStore: ServerStore = {
    products: process.env.NODE_ENV === 'production' ? [] : INITIAL_PRODUCTS,
    packs: process.env.NODE_ENV === 'production' ? [] : INITIAL_PACKS,
    orders: [],
    accounts: [],
    staffAccounts: [],
    quotes: [],
    messages: [],
    notifications: [],
    deliveryLocations: {},
    deliveryTrackingSessions: {}
  };
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
  const stock = getTrackedProductStock(product);
  return product.status === 'disponible' && (stock === undefined || stock === 0)
    ? 'rupture'
    : product.status;
}

function setTrackedProductStock(product: Product, quantity: number): void {
  product.quantityAvailable = quantity;
  product.stockQuantity = quantity;
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
  try {
    saveStoreLocal(store);
  } catch (err) {
    if (!persistence) throw err;
    console.error('Supabase accepted the update, but the local cache could not be refreshed:', err);
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
      console.warn('⚠️ ADMIN_PASSWORD non configuré ou longueur invalide. Utilisation du mot de passe admin de secours GlorydayAdmin2026!.');
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase non configuré. Mode autonome local actif (stockage fichier persistant).');
    }
    process.env.DATA_DIR ||= '/tmp/gloryday-pharma';
  }
  const app = express();
  let store = loadStore();
  const persistence = createSupabaseStorePersistence();
  if (persistence) {
    try {
      store = await persistence.hydrate(store);
    } catch (error) {
      console.warn('⚠️ Hydratation Supabase partielle ou table non migrée, utilisation du cache local :', error instanceof Error ? error.message : error);
    }
  }
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
    saveStoreLocal(store);
  };
  const resolveCourierTrackingToken = async (token: string) => {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = persistence
      ? await persistence.getDeliveryTrackingSession(tokenHash)
      : (() => {
          const entry = Object.entries(store.deliveryTrackingSessions || {}).find(([, item]) => item.tokenHash === tokenHash);
          return entry ? { ...entry[1], orderId: entry[0] } : null;
        })();
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return null;
    const order = store.orders.find(item => item.id === session.orderId);
    if (!order || order.status === 'Livrée' || order.status === 'Annulée' || !['picked_up', 'in_transit'].includes(order.deliveryStage || 'preparation')) return null;
    return { session, order };
  };

  const sessions = new Map<string, SessionEntry>();
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const deliveryTrackingLastPost = new Map<string, number>();
  const loginBlocked = (key: string) => {
    const entry = loginAttempts.get(key);
    return Boolean(entry && entry.resetAt > Date.now() && entry.count >= 8);
  };
  const recordLoginFailure = (key: string) => {
    const entry = loginAttempts.get(key);
    if (!entry || entry.resetAt <= Date.now()) loginAttempts.set(key, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
    else entry.count += 1;
  };
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow iFrame embedding in AI Studio / preview environment
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  const issueSession = async (res: express.Response, user: User): Promise<string> => {
    for (const [id, entry] of sessions) if (entry.expiresAt <= Date.now()) sessions.delete(id);
    const sessionId = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    // Always store in-memory so sessions work even before public.app_sessions migration is applied in Supabase
    sessions.set(sessionId, { user: cleanUser(user), expiresAt });
    if (persistence) {
      try {
        const tokenHash = createHash('sha256').update(sessionId).digest('hex');
        await persistence.createAppSession(tokenHash, cleanUser(user), new Date(expiresAt).toISOString());
      } catch (error) {
        console.warn('Session conservée en mémoire (table public.app_sessions non disponible) :', error instanceof Error ? error.message : error);
      }
    }
    // Support iframe and cross-origin embedding while keeping httpOnly protection
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS
    });
    return sessionId;
  };

  const getSessionId = (req: express.Request): string | null => {
    // 1. Check Authorization: Bearer <token> (works seamlessly in iframe contexts)
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }
    // 2. Fall back to session cookie
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
      } catch (error) {
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
    (['GET', 'HEAD'].includes(req.method) && ['/products', '/packs', '/auth/session', '/download-project-zip'].includes(req.path)) ||
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
      (req as AuthenticatedRequest).authenticatedUser = user;

    const role = user.role;
    const method = req.method;
    const route = req.path;
    const isSuperAdmin = role === 'Super-Admin';
    const isSimpleAdmin = role === 'Admin simple';
    const isCatalogManager = role === 'Gestionnaire Catalogue';
    const isCommercial = role === 'Commercial';
    const isLogistics = role === 'Logistique';
    let allowed = false;

    if (/^\/products(?:\/|$)/.test(route) || /^\/packs(?:\/|$)/.test(route)) {
      allowed = method === 'GET' || isSuperAdmin || isCatalogManager;
    } else if (route === '/clients' || route.startsWith('/clients/')) {
      allowed = method === 'GET' ? isSuperAdmin || isSimpleAdmin || isCommercial : isSuperAdmin;
    } else if (route.startsWith('/quotes')) {
      allowed = isSuperAdmin || isCommercial;
    } else if (route.startsWith('/messages')) {
      allowed = method === 'GET' ? isSuperAdmin || isCommercial || role === 'client' : isSuperAdmin || isCommercial || role === 'client';
    } else if (route.startsWith('/orders')) {
      if (route.endsWith('/upload-pdf')) allowed = role === 'client' || isSuperAdmin;
      else if (route.endsWith('/delivery-stage')) allowed = isSuperAdmin || isSimpleAdmin || isLogistics;
      else if (route.endsWith('/live-location')) {
        allowed = method === 'GET'
          ? role === 'client' || isSuperAdmin || isSimpleAdmin || isLogistics
          : isSuperAdmin || isSimpleAdmin || isLogistics;
      }
      else if (route.endsWith('/tracking-link')) allowed = isSuperAdmin || isSimpleAdmin || isLogistics;
      else if (route.endsWith('/payment')) allowed = isSuperAdmin || isSimpleAdmin;
      else if (route.endsWith('/mobile-payment')) allowed = role === 'client' || isSuperAdmin;
      else if (route.endsWith('/status')) allowed = isSuperAdmin || isSimpleAdmin || isCommercial || role === 'client';
      else if (method === 'GET') allowed = role === 'client' || isSuperAdmin || isSimpleAdmin || isCommercial || isLogistics;
      else if (method === 'POST') allowed = role === 'client';
    } else if (route === '/events') {
      allowed = method === 'GET';
    } else if (route === '/events/announcement') {
      allowed = method === 'POST' && isSuperAdmin;
    } else if (route === '/events/read') {
      allowed = method === 'POST';
    } else if (route === '/admin/stats') {
      allowed = isSuperAdmin || isSimpleAdmin;
    } else if (route.startsWith('/admin/staff') || route === '/supabase/migration-sql' || route === '/auth/admin-password') {
      allowed = isSuperAdmin;
    }

      if (!allowed) {
        res.status(403).json({ error: 'Votre rôle ne permet pas cette action.' });
        return;
      }
      next();
    }).catch(next);
  });

  await migrateLegacyPasswords(store);
  if (persistence) await persistence.persist(store);
  saveStoreLocal(store);

  // ==========================================
  // 1. PRODUCTS & STOCKS ROUTES
  // ==========================================
  app.get('/api/products', asyncHandler(async (_req, res) => {
    const user = await readSession(_req);
    if (user && ['Super-Admin', 'Gestionnaire Catalogue'].includes(user.role)) {
      res.json(store.products.map(product => ({ ...product, status: getEffectiveProductStatus(product) })));
      return;
    }
    res.json(store.products.map((product) => {
      const { purchasePrice, stockQuantity, alertThreshold, lowStockAlertThreshold, quantityAvailable, ...publicProduct } = product;
      return {
        ...publicProduct,
        status: getEffectiveProductStatus(product)
      };
    }));
  }));

  app.post('/api/products', asyncHandler(async (req, res) => {
    const productData = req.body || {};
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
      status: productData.status || 'disponible',
      image: productData.image,
      thumbnailUrl: productData.thumbnailUrl || productData.image,
      description: productData.description,
      isPromotion: productData.isPromotion,
      originalPrice: productData.originalPrice,
      discountPercentage: productData.discountPercentage,
      quantityAvailable: productData.quantityAvailable,
      stockQuantity: productData.stockQuantity,
      alertThreshold: productData.alertThreshold,
      lowStockAlertThreshold: productData.lowStockAlertThreshold,
      purchasePrice: productData.purchasePrice
    };
    store.products.unshift(newProduct);
    await saveStore(store, persistence);
    res.status(201).json(newProduct);
  }));

  app.put('/api/products/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idx = store.products.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }
    store.products[idx] = { ...store.products[idx], ...req.body, id };
    await saveStore(store, persistence);
    res.json(store.products[idx]);
  }));

  app.patch('/api/products/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const idx = store.products.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }
    store.products[idx].status = status === 'rupture' ? 'rupture' : 'disponible';
    await saveStore(store, persistence);
    res.json({ success: true, product: store.products[idx] });
  }));

  app.delete('/api/products/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    store.products = store.products.filter(p => p.id !== id);
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
    res.json(user ? { user } : { user: null });
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });
    res.json({ success: true });
  }));

  app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const registrationKey = `${req.ip}:register`;
    if (loginBlocked(registrationKey)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    recordLoginFailure(registrationKey);
    const { phone, facilityName, contactName, facilityType, facilityTypeOther, password, deliveryAddress, coordinates } = req.body || {};
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
    loginAttempts.delete(registrationKey);
    const token = await issueSession(res, newUser);
    res.status(201).json({ user: cleanUser(newUser), token });
  }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const cleanPhone = normalizePhone(String(req.body?.phone || ''));
    const cleanPass = String(req.body?.password || '');
    if (cleanPhone.length > 32 || cleanPass.length < 8 || cleanPass.length > 85) {
      res.status(400).json({ error: 'Saisissez un mot de passe de 8 à 85 caractères.' });
      return;
    }
    const key = `${req.ip}:client:${cleanPhone}`;
    if (loginBlocked(key)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    const found = store.accounts.find(a => normalizePhone(a.user.phone) === cleanPhone);
    const valid = await verifyPassword(cleanPass, found?.passwordHash || 'scrypt$00112233445566778899aabbccddeeff$00');
    if (!valid || !found) {
      recordLoginFailure(key);
      res.status(401).json({ error: 'Numéro de téléphone ou mot de passe incorrect.' });
      return;
    }
    loginAttempts.delete(key);
    const token = await issueSession(res, found.user);
    res.json({ user: cleanUser(found.user), token });
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
    if (loginBlocked(requestKey)) {
      res.status(429).json({ error: 'Trop de demandes. Réessayez dans 15 minutes.' });
      return;
    }
    recordLoginFailure(requestKey);

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
    if (loginBlocked(key)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    const fail = () => {
      recordLoginFailure(key);
      res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    };
    const adminUserName = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'GlorydayAdmin2026!';
    if (identifier.toLowerCase() === adminUserName.toLowerCase() && adminPassword.length >= 8 && adminPassword.length <= 85 && safeEqual(password, adminPassword)) {
      const user: User = { id: 'staff-super-admin', phone: '', facilityName: 'Direction Générale Gloryday', contactName: 'Super-Admin', role: 'Super-Admin', createdAt: new Date().toISOString() };
      const token = await issueSession(res, user);
      loginAttempts.delete(key);
      res.json({ user, token });
      return;
    }
    const normalizedIdentifier = normalizeStaffIdentifier(identifier);
    const staff = environmentStaffAccounts().find(item => item.identifier === normalizedIdentifier);
    if (staff && safeEqual(password, staff.password)) {
      const user: User = { id: `staff-${Buffer.from(normalizedIdentifier).toString('hex').slice(0, 24)}`, phone: '', facilityName: 'Direction Générale Gloryday', contactName: staff.name || staff.role, role: staff.role, createdAt: new Date().toISOString() };
      const token = await issueSession(res, user);
      loginAttempts.delete(key);
      res.json({ user, token });
      return;
    }
    const managedStaff = store.staffAccounts.find(item => item.identifier === normalizedIdentifier);
    const validManagedPassword = await verifyPassword(password, managedStaff?.passwordHash || 'scrypt$00112233445566778899aabbccddeeff$00');
    if (managedStaff?.active && validManagedPassword) {
      const user: User = { id: managedStaff.id, phone: '', facilityName: 'Direction Générale Gloryday', contactName: managedStaff.name, role: managedStaff.role, createdAt: managedStaff.createdAt };
      const token = await issueSession(res, user);
      loginAttempts.delete(key);
      res.json({ user, token });
      return;
    }
    fail();
  }));

  app.get('/api/admin/staff', (_req, res) => {
    const fromEnvironment = environmentStaffAccounts().map((account) => ({
      id: `environment-${Buffer.from(account.identifier).toString('hex').slice(0, 24)}`,
      identifier: account.identifier,
      name: account.name,
      role: account.role,
      active: true,
      createdAt: '',
      updatedAt: '',
      source: 'environment' as const,
    }));
    const managed = store.staffAccounts.map(staffAccountSummary);
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
    const account: ManagedStaffAccount = {
      id: `staff-${randomUUID()}`,
      identifier,
      name,
      role,
      passwordHash: await hashPassword(password),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    store.staffAccounts.push(account);
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
    res.status(201).json(staffAccountSummary(account));
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
    const updated: ManagedStaffAccount = {
      ...current,
      identifier,
      name,
      role,
      active,
      passwordHash: password ? await hashPassword(password) : current.passwordHash,
      updatedAt: new Date().toISOString(),
    };
    store.staffAccounts[index] = updated;
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
      if (session.user.id === current.id) sessions.delete(sessionId);
    }
    if (persistence) await persistence.revokeAppSessionsForUser(current.id);
    res.json(staffAccountSummary(updated));
  }));

  app.put('/api/auth/admin-password', (_req, res) => {
    res.status(410).json({ error: 'Le mot de passe administrateur se modifie dans les variables sécurisées de l’hébergeur.' });
  });

  // ==========================================
  // 4. CLIENTS & QUOTES ROUTES
  // ==========================================
  app.get('/api/clients', (_req, res) => {
    const user = (_req as AuthenticatedRequest).authenticatedUser!;
    const visibleAccounts = user.role === 'Commercial'
      ? store.accounts.filter(acc => acc.user.assignedToCommercialId === user.id)
      : store.accounts;
    const enrichedClients = visibleAccounts.map(acc => {
      const clientOrders = store.orders.filter(
        o => o.status !== 'Annulée' && o.userId === acc.user.id
      );
      const totalSpent = clientOrders.reduce((s, o) => s + o.estimatedTotal, 0);
      const lastOrder = clientOrders[0];
      const daysSinceLastOrder = lastOrder
        ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 99;

      return {
        ...acc.user,
        totalOrdersCount: clientOrders.length,
        totalSpent,
        lastOrderDate: lastOrder?.createdAt,
        daysSinceLastOrder,
        isInactive10Days: daysSinceLastOrder >= 10
      };
    });
    res.json(enrichedClients);
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
        : store.messages.filter(m => m.senderId === user.id || m.recipientId === user.id || assignedClientIds.has(m.recipientId || '') || assignedClientIds.has(m.senderId));
    res.json(messages);
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
    if (recipientId && recipientId !== 'staff' && (msg.channel === 'in_app' || msg.channel === 'both')) {
      store.notifications.unshift({
        id: `notif-${randomUUID()}`,
        timestamp: msg.createdAt,
        type: 'admin_message',
        title: msg.subject,
        message: msg.content,
        targetRole: 'client',
        userId: recipientId,
        read: false
      });
    }
    await saveStore(store, persistence);
    res.status(201).json(msg);
  }));

  // ==========================================
  // 5. ORDERS & LOGISTICS ROUTES
  // ==========================================
  app.get('/api/orders', (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    let visibleOrders = store.orders;
    if (user.role === 'client') {
      visibleOrders = visibleOrders.filter(o => o.userId === user.id);
    } else if (user.role === 'Commercial') {
      visibleOrders = visibleOrders.filter(o => o.assignedCommercialId === user.id || store.accounts.some(a => a.user.id === o.userId && a.user.assignedToCommercialId === user.id));
    } else if (user.role === 'Logistique') {
      res.json(store.orders.map(order => ({
        ...order,
        estimatedTotal: undefined,
        isPaid: undefined,
        amountPaid: undefined,
        installments: undefined,
        invoices: undefined,
        mobilePayment: undefined,
        deliveryFee: undefined,
        items: order.items.map(({ price, total, discountPercent, savings, ...item }) => ({ ...item, price: 0, total: 0 })),
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
      })));
      return;
    }
    res.json(visibleOrders);
  });

  app.post('/api/orders', asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    const account = store.accounts.find(a => a.user.id === user.id);
    const customerInput = req.body?.customer || {};
    const requestedItems = req.body?.items;
    if (!account || !Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 100) {
      res.status(400).json({ error: 'Informations client et articles requis.' });
      return;
    }
    if (account.user.accountStatus && account.user.accountStatus !== 'actif') {
      res.status(403).json({ error: 'Ce compte ne peut pas encore passer commande. Contactez Gloryday Pharma.' });
      return;
    }

    const items = [] as CartItem[];
    for (const requested of requestedItems) {
      const product = store.products.find(p => p.id === String(requested?.productId || ''));
      const variant = product?.variants?.find(v => v.label === String(requested?.variant || ''));
      const quantity = Number(requested?.quantity);
      if (!product || !variant || product.status !== 'disponible' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
        res.status(400).json({ error: 'Un article, son format ou sa quantité n’est plus valide. Actualisez le catalogue.' });
        return;
      }
      items.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        variant: variant.label,
        price: Number(variant.price) || 0,
        quantity,
        isQuote: Number(variant.price) === 0
      });
    }

    const requestedByProduct = new Map<string, number>();
    for (const item of items) {
      requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) || 0) + item.quantity);
    }
    const stockUpdates: Array<{ product: Product; remaining: number }> = [];
    for (const [productId, requestedQuantity] of requestedByProduct) {
      const product = store.products.find(candidate => candidate.id === productId)!;
      const availableQuantity = getTrackedProductStock(product);
      if (availableQuantity === undefined) {
        res.status(409).json({ error: `Le stock de « ${product.name} » n’est pas renseigné. Contactez Gloryday Pharma avant de commander.` });
        return;
      }
      if (product.status !== 'disponible') {
        res.status(409).json({ error: `« ${product.name} » n’est pas actuellement disponible à la commande.` });
        return;
      }
      if (availableQuantity < requestedQuantity) {
        res.status(409).json({ error: `Stock insuffisant pour « ${product.name} » : ${availableQuantity} disponible(s), ${requestedQuantity} demandé(s).` });
        return;
      }
      stockUpdates.push({ product, remaining: availableQuantity - requestedQuantity });
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
    const orderCoordinates = customerInput.deliveryMode === 'livraison' && coordinatesAreValid ? {
      lat: requestedCoordinates.lat,
      lng: requestedCoordinates.lng,
      ...(typeof requestedCoordinates.accuracy === 'number' ? { accuracy: requestedCoordinates.accuracy } : {}),
      source: 'checkout' as const,
    } : undefined;
    const customer = {
      facilityName: account.user.facilityName,
      facilityType: account.user.facilityType,
      facilityTypeOther: account.user.facilityTypeOther,
      contactName: account.user.contactName || 'Responsable Approvisionnement',
      phone: account.user.phone,
      deliveryAddress: String(customerInput.deliveryAddress || account.user.deliveryAddress || '').slice(0, 300),
      neighborhoodId: neighborhood?.id,
      neighborhoodName: neighborhood?.name,
      notes: String(customerInput.notes || '').slice(0, 1000),
      deliveryMode: customerInput.deliveryMode === 'retrait' ? 'retrait' as const : 'livraison' as const,
      paymentMethod: ['especes', 'airtel_money', 'moov_money', 'virement'].includes(customerInput.paymentMethod) ? customerInput.paymentMethod : 'especes',
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

    const volumeSummary = calculateCartVolumeSummary(items);
    const deliveryFee = customer.deliveryMode === 'retrait' || volumeSummary.netTotal >= 50000 ? 0 : neighborhood?.baseDeliveryFee || 0;
    const finalTotal = volumeSummary.netTotal + deliveryFee;
    customer.deliveryFee = deliveryFee;

    const newOrder: Order = {
      id: `ord-${randomUUID()}`,
      reference,
      createdAt: new Date().toISOString(),
      userId: account.user.id,
      customer,
      items: items.map((it: any) => {
        const calc = calculateItemVolumePrice(it.price, it.quantity, it.isQuote);
        return {
          productId: it.productId,
          productName: it.productName,
          category: it.category,
          variant: it.variant,
          price: calc.discountedUnitPrice,
          quantity: it.quantity,
          total: it.isQuote ? 0 : calc.totalWithDiscount,
          isQuote: it.isQuote,
          discountPercent: calc.discountPercent,
          savings: calc.savings
        };
      }),
      estimatedTotal: finalTotal,
      hasQuoteItems: items.some((it: any) => it.isQuote),
      status: 'À confirmer',
      isPaid: false,
      mobilePayment: customer.mobilePayment,
      deliveryStage: 'preparation',
      stockReserved: true,
      deliveryZone: zoneName,
      deliveryEstimated: estimatedTime,
      deliveryFee,
      whatsappLogs: []
    };

    for (const update of stockUpdates) setTrackedProductStock(update.product, update.remaining);
    store.orders.unshift(newOrder);

    const staffOrderNotificationRoles: AppRole[] = ['Super-Admin', 'Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'];
    const staffOrderNotifications: AppNotification[] = staffOrderNotificationRoles.map(targetRole => ({
      id: `notif-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'order_created',
      orderId: newOrder.id,
      orderReference: newOrder.reference,
      message: `Nouvelle commande ${newOrder.reference} reçue de ${customer.facilityName} (${finalTotal.toLocaleString('fr-FR')} FCFA).`,
      targetRole,
      read: false
    }));
    store.notifications.unshift(...staffOrderNotifications);
    store.notifications.unshift({
      id: `notif-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'order_created',
      orderId: newOrder.id,
      orderReference: newOrder.reference,
      message: `Votre commande ${newOrder.reference} a été reçue. Elle est en attente de confirmation par Gloryday Pharma.`,
      targetRole: 'client',
      userId: account.user.id,
      read: false
    });

    await saveStore(store, persistence);
    res.status(201).json(newOrder);
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
    if (user.role !== 'Super-Admin' && (user.role !== 'client' || order.userId !== user.id)) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    if (typeof pdfBase64 !== 'string' || !pdfBase64.startsWith('data:application/pdf;base64,') || pdfBase64.length > 1_500_000) {
      res.status(400).json({ error: 'Fichier PDF invalide ou trop volumineux.' });
      return;
    }
    store.orders[idx].pdfUrl = pdfBase64;
    await saveStore(store, persistence);
    res.json({ success: true, pdfUrl: pdfBase64 });
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
    res.json({
      orderReference: order.reference,
      courierName: order.courier?.name || 'Coursier Gloryday Pharma',
      facilityName: order.customer.facilityName,
      deliveryAddress: order.customer.deliveryAddress,
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
          res.status(503).json({ error: 'Le suivi GPS n’est pas activé. Contactez la logistique Gloryday Pharma.' });
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
      const status = persistence
        ? await persistence.getDeliveryTrackingStatus(order.id)
        : (() => {
            const session = store.deliveryTrackingSessions?.[order.id];
            return {
              active: Boolean(session && !session.revokedAt && Date.parse(session.expiresAt) > Date.now()),
              expiresAt: session?.expiresAt,
            };
          })();
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
    if (order.status === 'Annulée' || currentStage === 'delivered' || !['picked_up', 'in_transit'].includes(currentStage) ||
        !order.courier || order.customer.deliveryMode === 'retrait') {
      res.status(409).json({ error: 'Affectez un coursier et confirmez sa prise en charge avant de créer le lien GPS.' });
      return;
    }
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const user = (req as AuthenticatedRequest).authenticatedUser!;
    if (persistence) {
      try {
        await persistence.createDeliveryTrackingSession(order.id, tokenHash, expiresAt, user.id);
      } catch (error) {
        if (isDeliveryLocationsMigrationError(error)) {
          res.status(503).json({ error: 'Les liens GPS ne sont pas activés : appliquez la migration Supabase 20261021000002_delivery_location_points.sql.' });
          return;
        }
        throw error;
      }
    }
    store.deliveryTrackingSessions ||= {};
    store.deliveryTrackingSessions[order.id] = { tokenHash, expiresAt, createdAt: createdAt.toISOString() };
    saveStoreLocal(store);
    res.json({ token, expiresAt });
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
    } else if (user.role === 'Commercial') {
      const isAssigned = store.orders[idx].assignedCommercialId === user.id ||
        store.accounts.some(account => account.user.id === store.orders[idx].userId && account.user.assignedToCommercialId === user.id);
      const canCommercialTransition = (currentStatus === 'À confirmer' && ['Confirmée', 'Annulée'].includes(status)) ||
        (currentStatus === 'Confirmée' && status === 'Annulée');
      if (!isAssigned || !canCommercialTransition) {
        res.status(403).json({ error: 'Cette commande ne vous est pas attribuée ou cette transition n’est pas autorisée.' });
        return;
      }
    } else if (user.role === 'Admin simple') {
      if (!canTransition) {
        res.status(409).json({ error: 'Cette transition de statut n’est pas autorisée.' });
        return;
      }
    } else if (user.role !== 'Super-Admin') {
      res.status(403).json({ error: 'Votre rôle ne permet pas de modifier le statut de cette commande.' });
      return;
    } else if (!canTransition) {
      res.status(409).json({ error: status === 'Livrée'
        ? 'Marquez la livraison comme terminée depuis le suivi logistique, avec sa preuve de réception.'
        : 'Cette transition de statut n’est pas autorisée.' });
      return;
    }
    const order = store.orders[idx];
    if (status === 'Annulée' && order.stockReserved) {
      for (const item of order.items) {
        const product = store.products.find(candidate => candidate.id === item.productId);
        const availableQuantity = product ? getTrackedProductStock(product) : undefined;
        if (product && availableQuantity !== undefined) {
          setTrackedProductStock(product, availableQuantity + item.quantity);
        }
      }
      order.stockReserved = false;
    }
    if (status === 'Annulée') await clearDeliveryLocations(order.id);
    store.orders[idx].status = status;
    if (cancellationReason) {
      store.orders[idx].cancellationReason = cancellationReason;
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
    await saveStore(store, persistence);
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
    if (stage === 'delivered') await clearDeliveryLocations(order.id);

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

    if (courierChanged && courierToSave) {
      const assignmentMessage = `${courierToSave.name} (${courierToSave.phone}) est affecté à la commande ${order.reference}. Transmettez-lui son ordre de mission et son lien GPS.`;
      const dispatchRoles: AppRole[] = ['Super-Admin', 'Admin simple', 'Logistique'];
      const dispatchNotifications: AppNotification[] = dispatchRoles.map(targetRole => ({
        id: `notif-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        type: 'status_changed',
        title: 'Coursier affecté · action requise',
        orderId: order.id,
        orderReference: order.reference,
        message: assignmentMessage,
        targetRole,
        read: false
      }));
      store.notifications.unshift(...dispatchNotifications);
    }

    await saveStore(store, persistence);
    res.json(order);
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
    store.orders[idx].isPaid = isPaid;
    if (store.orders[idx].mobilePayment) {
      store.orders[idx].mobilePayment!.status = isPaid ? 'verified' : 'pending';
      if (isPaid && !store.orders[idx].mobilePayment!.validatedAt) {
        store.orders[idx].mobilePayment!.validatedAt = new Date().toISOString();
      }
    }
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
    await saveStore(store, persistence);
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
    const pendingPaymentAmount = validOrders
      .filter(o => !o.isPaid)
      .reduce((s, o) => s + o.estimatedTotal, 0);

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
    await saveStore(store, persistence);
    res.status(201).json({ sentCount: announcements.length });
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
      const incrementalFiles = fileNames.filter(name => name.startsWith('20261021'));
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
  if (!vercelAppPromise) vercelAppPromise = createServerApp();
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
