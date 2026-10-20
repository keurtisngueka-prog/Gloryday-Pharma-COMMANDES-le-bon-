import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PRODUCTS, INITIAL_PACKS } from './src/data/initialProducts.js';
import { getEstimatedDeliveryText, detectNeighborhoodFromAddress } from './src/data/librevilleZones.js';
import { calculateCartVolumeSummary, calculateItemVolumePrice } from './src/utils/volumeDiscount.js';
import { generateWhatsAppMessageForStage } from './src/utils/whatsappNotifications.js';
import type {
  Product,
  Pack,
  Order,
  User,
  AppNotification,
  AdminStats,
  CommercialQuote,
  DirectMessage,
  AppRole,
  DeliveryStage,
  WhatsAppNotificationLog,
  OrderStatus
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface StoredUserAccount {
  user: User;
  passwordHash: string;
}

interface ServerStore {
  products: Product[];
  packs: Pack[];
  orders: Order[];
  accounts: StoredUserAccount[];
  quotes: CommercialQuote[];
  messages: DirectMessage[];
  notifications: AppNotification[];
  adminPassword: string;
}

function normalizePhone(p: string): string {
  return (p || '').replace(/[\s\-\.\(\)]/g, '').toLowerCase();
}

const DEMO_ORDER_IDS = new Set([
  'ord-demo-01',
  'ord-demo-02',
  'ord-1792474689944',
  'ord-1792473572477',
  'ord-1792473563555',
  'ord-1792473303182'
]);

const DEMO_ACCOUNT_IDS = new Set([
  'usr-ste-marie',
  'usr-pharma-mer',
  'usr-rapha',
  'client-1',
  'client-2'
]);

function isDemoOrTestOrder(o: Partial<Order> | null | undefined): boolean {
  if (!o) return false;
  if (o.id && (DEMO_ORDER_IDS.has(o.id) || o.id.startsWith('ord-demo-'))) return true;
  if (o.reference && (o.reference === 'GP-2026-0042' || o.reference.includes('DEMO'))) return true;
  const notes = (o.customer?.notes || '').trim().toLowerCase();
  const addr = (o.customer?.deliveryAddress || '').trim().toLowerCase();
  if (notes === 'hjjj' || addr.includes('fgfghhjj') || addr.includes('repère : 202020')) return true;
  return false;
}

function isDemoOrTestNotification(n: Partial<AppNotification> | null | undefined): boolean {
  if (!n) return false;
  if (n.id && n.id.includes('demo')) return true;
  if (n.orderId && DEMO_ORDER_IDS.has(n.orderId)) return true;
  if (n.orderReference && n.orderReference === 'GP-2026-0042') return true;
  return false;
}

function loadStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const rawOrders: Order[] = Array.isArray(parsed.orders) ? parsed.orders : [];
      const rawAccounts: StoredUserAccount[] = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const rawNotifs: AppNotification[] = Array.isArray(parsed.notifications) ? parsed.notifications : [];

      const cleanedOrders = rawOrders.filter(o => !isDemoOrTestOrder(o));
      const cleanedAccounts = rawAccounts.filter(a => a?.user && !DEMO_ACCOUNT_IDS.has(a.user.id));
      const cleanedNotifs = rawNotifs.filter(n => !isDemoOrTestNotification(n));

      const storeObj: ServerStore = {
        products: Array.isArray(parsed.products) && parsed.products.length > 0 ? parsed.products : INITIAL_PRODUCTS,
        packs: Array.isArray(parsed.packs) && parsed.packs.length > 0 ? parsed.packs : INITIAL_PACKS,
        orders: cleanedOrders,
        accounts: cleanedAccounts,
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        notifications: cleanedNotifs,
        adminPassword: parsed.adminPassword || process.env.ADMIN_PASSWORD || 'Gloryday@2026!'
      };

      if (
        cleanedOrders.length !== rawOrders.length ||
        cleanedAccounts.length !== rawAccounts.length ||
        cleanedNotifs.length !== rawNotifs.length
      ) {
        saveStore(storeObj);
      }

      return storeObj;
    }
  } catch (err) {
    console.error('Error loading store.json, initializing fresh store:', err);
  }

  const initialStore: ServerStore = {
    products: INITIAL_PRODUCTS,
    packs: INITIAL_PACKS,
    orders: [],
    accounts: [],
    quotes: [],
    messages: [],
    notifications: [],
    adminPassword: process.env.ADMIN_PASSWORD || 'Gloryday@2026!'
  };
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: ServerStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  let store = loadStore();

  app.use(express.json({ limit: '15mb' }));

  // ==========================================
  // 1. PRODUCTS & STOCKS ROUTES
  // ==========================================
  app.get('/api/products', (_req, res) => {
    res.json(store.products);
  });

  app.post('/api/products', (req, res) => {
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
    saveStore(store);
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const idx = store.products.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }
    store.products[idx] = { ...store.products[idx], ...req.body, id };
    saveStore(store);
    res.json(store.products[idx]);
  });

  app.patch('/api/products/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const idx = store.products.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }
    store.products[idx].status = status === 'rupture' ? 'rupture' : 'disponible';
    saveStore(store);
    res.json({ success: true, product: store.products[idx] });
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    store.products = store.products.filter(p => p.id !== id);
    saveStore(store);
    res.json({ success: true });
  });

  // ==========================================
  // 2. PACKS ROUTES
  // ==========================================
  app.get('/api/packs', (_req, res) => {
    res.json(store.packs);
  });

  app.post('/api/packs', (req, res) => {
    const newPack: Pack = {
      ...req.body,
      id: `pack-${Date.now()}`
    };
    store.packs.unshift(newPack);
    saveStore(store);
    res.status(201).json(newPack);
  });

  app.put('/api/packs/:id', (req, res) => {
    const { id } = req.params;
    const idx = store.packs.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pack introuvable' });
      return;
    }
    store.packs[idx] = { ...store.packs[idx], ...req.body, id };
    saveStore(store);
    res.json(store.packs[idx]);
  });

  app.delete('/api/packs/:id', (req, res) => {
    const { id } = req.params;
    store.packs = store.packs.filter(p => p.id !== id);
    saveStore(store);
    res.json({ success: true });
  });

  // ==========================================
  // 3. AUTHENTICATION & USERS ROUTES
  // ==========================================
  app.post('/api/auth/register', (req, res) => {
    const { phone, facilityName, contactName, facilityType, facilityTypeOther, password, deliveryAddress, coordinates } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const cleanPass = (password || '').trim();

    if (!cleanPhone || !cleanPass || !facilityName) {
      res.status(400).json({ error: 'Numéro de téléphone, nom de l\'établissement et mot de passe obligatoires.' });
      return;
    }

    const existing = store.accounts.find(a => normalizePhone(a.user.phone) === cleanPhone);
    if (existing) {
      res.status(409).json({ error: 'Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter.' });
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      phone: String(phone).trim(),
      facilityName: String(facilityName).trim(),
      contactName: contactName ? String(contactName).trim() : 'Responsable Approvisionnement',
      facilityType: facilityType || 'Clinique',
      facilityTypeOther,
      role: 'client',
      authProvider: 'credentials',
      deliveryAddress: deliveryAddress || 'Libreville, Gabon',
      coordinates: coordinates || { lat: 0.3924, lng: 9.4536 },
      createdAt: new Date().toISOString()
    };

    store.accounts.push({ user: newUser, passwordHash: cleanPass });
    saveStore(store);

    const token = `usr-token-${newUser.id}-${Date.now()}`;
    res.status(201).json({ token, user: newUser });
  });

  app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const cleanPass = (password || '').trim();

    const found = store.accounts.find(a => normalizePhone(a.user.phone) === cleanPhone);
    if (!found) {
      res.status(404).json({ error: 'Aucun compte trouvé avec ce numéro. Si vous êtes nouveau client, veuillez créer un compte.' });
      return;
    }
    if (found.passwordHash !== cleanPass) {
      res.status(401).json({ error: 'Mot de passe incorrect. Veuillez vérifier votre saisie.' });
      return;
    }

    const token = `usr-token-${found.user.id}-${Date.now()}`;
    res.json({ token, user: found.user });
  });

  app.post('/api/auth/google', (req, res) => {
    const { email, name, avatarUrl } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ error: 'Adresse email Google requise.' });
      return;
    }

    const found = store.accounts.find(a => (a.user.email || '').toLowerCase() === cleanEmail);
    if (found) {
      found.user.authProvider = 'google';
      if (avatarUrl) found.user.avatarUrl = avatarUrl;
      if (name && !found.user.contactName) found.user.contactName = name;
      saveStore(store);
      const token = `google-token-${found.user.id}-${Date.now()}`;
      res.json({ isNewUser: false, token, user: found.user });
      return;
    }

    res.json({ isNewUser: true });
  });

  app.post('/api/auth/google/complete', (req, res) => {
    const { email, name, avatarUrl, facilityName, facilityType, phone, deliveryAddress, coordinates } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);

    if (!facilityName || !cleanPhone || !cleanEmail) {
      res.status(400).json({ error: 'Veuillez renseigner le nom de votre établissement et votre numéro de téléphone.' });
      return;
    }

    const existingIdx = store.accounts.findIndex(
      a => normalizePhone(a.user.phone) === cleanPhone || (a.user.email || '').toLowerCase() === cleanEmail
    );

    if (existingIdx > -1) {
      const updatedUser: User = {
        ...store.accounts[existingIdx].user,
        email: cleanEmail,
        contactName: name || store.accounts[existingIdx].user.contactName,
        facilityName: String(facilityName).trim(),
        facilityType: facilityType || store.accounts[existingIdx].user.facilityType || 'Clinique',
        phone: String(phone).trim(),
        avatarUrl: avatarUrl || store.accounts[existingIdx].user.avatarUrl,
        authProvider: 'google',
        deliveryAddress: deliveryAddress || store.accounts[existingIdx].user.deliveryAddress || 'Libreville, Gabon',
        coordinates: coordinates || store.accounts[existingIdx].user.coordinates
      };
      store.accounts[existingIdx].user = updatedUser;
      saveStore(store);
      const token = `google-token-${updatedUser.id}-${Date.now()}`;
      res.json({ token, user: updatedUser });
      return;
    }

    const newUser: User = {
      id: `usr-google-${Date.now()}`,
      phone: String(phone).trim(),
      facilityName: String(facilityName).trim(),
      contactName: String(name || 'Responsable Médical').trim(),
      facilityType: facilityType || 'Clinique',
      role: 'client',
      email: cleanEmail,
      avatarUrl,
      authProvider: 'google',
      deliveryAddress: deliveryAddress || 'Libreville, Gabon',
      coordinates: coordinates || { lat: 0.3924, lng: 9.4536 },
      createdAt: new Date().toISOString()
    };

    store.accounts.push({ user: newUser, passwordHash: 'google_oauth_auth' });
    saveStore(store);

    const token = `google-token-${newUser.id}-${Date.now()}`;
    res.status(201).json({ token, user: newUser });
  });

  app.post('/api/auth/admin', (req, res) => {
    const { identifier, password, role } = req.body || {};
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const validIds = ['admin', 'admin@glorydaypharma.ga', 'direction@glorydaypharma.ga', '+24177003004', '24177003004', '077003004', 'gloryday-admin-2026'];
    const isIdValid = validIds.includes(cleanId) || validIds.includes(normalizePhone(cleanId));
    const currentSecret = store.adminPassword || process.env.ADMIN_PASSWORD || 'Gloryday@2026!';
    const isDefaultStillActive = currentSecret === 'Gloryday@2026!';
    const isPassValid =
      cleanPass === currentSecret ||
      (isDefaultStillActive && (cleanPass === 'Gloryday@2026!' || cleanPass === 'admin' || cleanPass === 'gloryday2026'));

    if (!isIdValid || !isPassValid) {
      res.status(401).json({ error: 'Identifiants administrateur ou mot de passe de sécurité incorrects.' });
      return;
    }

    const assignedRole: AppRole = role || 'Super-Admin';
    const staffUser: User = {
      id: `staff-${assignedRole.toLowerCase().replace(/\s+/g, '-')}`,
      phone: '+24177003004',
      facilityName: 'Direction Générale Gloryday',
      contactName: `Direction & Staff [${assignedRole}]`,
      role: assignedRole,
      createdAt: new Date().toISOString()
    };

    const token = `staff-token-${Date.now()}`;
    res.json({ token, user: staffUser });
  });

  app.put('/api/auth/admin-password', (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).trim().length < 6) {
      res.status(400).json({ error: 'Le nouveau mot de passe administrateur doit contenir au moins 6 caractères.' });
      return;
    }
    store.adminPassword = String(newPassword).trim();
    saveStore(store);
    res.json({ success: true });
  });

  // ==========================================
  // 4. CLIENTS & QUOTES ROUTES
  // ==========================================
  app.get('/api/clients', (_req, res) => {
    const enrichedClients = store.accounts.map(acc => {
      const clientOrders = store.orders.filter(
        o => o.status !== 'Annulée' && (
          normalizePhone(o.customer.phone) === normalizePhone(acc.user.phone) ||
          o.customer.facilityName.toLowerCase() === acc.user.facilityName.toLowerCase()
        )
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

  app.patch('/api/clients/:id/assign', (req, res) => {
    const { id } = req.params;
    const { commercialId } = req.body || {};
    const found = store.accounts.find(a => a.user.id === id);
    if (!found) {
      res.status(404).json({ error: 'Client introuvable' });
      return;
    }
    found.user.assignedToCommercialId = commercialId;
    saveStore(store);
    res.json(found.user);
  });

  app.get('/api/quotes', (_req, res) => {
    res.json(store.quotes);
  });

  app.post('/api/quotes', (req, res) => {
    const quoteData = req.body || {};
    const newQuote: CommercialQuote = {
      ...quoteData,
      id: `quote-${Date.now()}`,
      reference: quoteData.reference || `DEV-${new Date().getFullYear()}-${String(store.quotes.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString()
    };
    store.quotes.unshift(newQuote);
    saveStore(store);
    res.status(201).json(newQuote);
  });

  app.patch('/api/quotes/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const idx = store.quotes.findIndex(q => q.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Devis introuvable' });
      return;
    }
    store.quotes[idx].status = status;
    saveStore(store);
    res.json(store.quotes[idx]);
  });

  app.get('/api/messages', (_req, res) => {
    res.json(store.messages);
  });

  app.post('/api/messages', (req, res) => {
    const msg: DirectMessage = {
      ...req.body,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    store.messages.unshift(msg);
    saveStore(store);
    res.status(201).json(msg);
  });

  // ==========================================
  // 5. ORDERS & LOGISTICS ROUTES
  // ==========================================
  app.get('/api/orders', (req, res) => {
    const phone = req.query.phone as string | undefined;
    if (phone) {
      const clean = normalizePhone(phone);
      const clientOrders = store.orders.filter(o => normalizePhone(o.customer.phone) === clean);
      res.json(clientOrders);
      return;
    }
    res.json(store.orders);
  });

  app.post('/api/orders', (req, res) => {
    const { customer, items } = req.body || {};
    if (!customer || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Informations client et articles requis.' });
      return;
    }

    const year = new Date().getFullYear();
    const orderNum = String(store.orders.length + 1).padStart(4, '0');
    const reference = `GP-${year}-${orderNum}`;

    const zoneName = customer.neighborhoodName ||
      (customer.deliveryAddress ? detectNeighborhoodFromAddress(customer.deliveryAddress)?.name : null) ||
      'Grand Libreville';
    const estimatedTime = getEstimatedDeliveryText(customer.neighborhoodId, customer.deliveryAddress);

    const volumeSummary = calculateCartVolumeSummary(items);
    const deliveryFee = customer.deliveryFee || 0;
    const finalTotal = volumeSummary.netTotal + deliveryFee;
    const isMobilePrePaid = !!(customer.mobilePayment?.isPrePaid && customer.mobilePayment?.transactionReference);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      reference,
      createdAt: new Date().toISOString(),
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
      isPaid: isMobilePrePaid,
      mobilePayment: customer.mobilePayment,
      deliveryStage: 'preparation',
      deliveryZone: zoneName,
      deliveryEstimated: estimatedTime,
      deliveryFee,
      courier: {
        name: 'Alexandre Moundounga',
        phone: '+24177003004',
        vehicle: 'Moto Express Honda GP-04',
        matricule: 'COUR-LBV-04',
        currentZone: 'Dépôt Central Libreville',
        estimatedTime
      },
      whatsappLogs: []
    };

    store.orders.unshift(newOrder);

    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'order_created',
      orderId: newOrder.id,
      orderReference: newOrder.reference,
      message: `Nouvelle commande ${newOrder.reference} reçue de ${customer.facilityName} (${finalTotal.toLocaleString('fr-FR')} FCFA).`,
      targetRole: 'Super-Admin',
      read: false
    });

    saveStore(store);
    res.status(201).json(newOrder);
  });

  app.post('/api/orders/upload-pdf', (req, res) => {
    const { orderReference, pdfBase64 } = req.body || {};
    const idx = store.orders.findIndex(o => o.reference === orderReference || o.id === orderReference);
    if (idx > -1 && pdfBase64) {
      store.orders[idx].pdfUrl = pdfBase64;
      saveStore(store);
    }
    res.json({ success: true, pdfUrl: pdfBase64 });
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, cancellationReason } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    store.orders[idx].status = status;
    if (cancellationReason) {
      store.orders[idx].cancellationReason = cancellationReason;
    }
    if (status === 'Livrée') {
      store.orders[idx].deliveryStage = 'delivered';
    }
    saveStore(store);
    res.json(store.orders[idx]);
  });

  app.patch('/api/orders/:id/delivery-stage', (req, res) => {
    const { id } = req.params;
    const { deliveryStage, courier } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const STAGE_LABELS: Record<DeliveryStage, string> = {
      preparation: 'En préparation à l’entrepôt',
      picked_up: 'Pris en charge par le coursier',
      in_transit: 'En cours d’acheminement',
      delivered: 'Livré à l’établissement'
    };

    const stage = deliveryStage as DeliveryStage;
    store.orders[idx].deliveryStage = stage;
    if (stage === 'delivered') {
      store.orders[idx].status = 'Livrée';
    } else if (stage === 'preparation' || stage === 'picked_up' || stage === 'in_transit') {
      store.orders[idx].status = 'En préparation';
    }
    if (courier) {
      store.orders[idx].courier = { ...store.orders[idx].courier, ...courier };
    }

    const stagePayload = generateWhatsAppMessageForStage(store.orders[idx], stage);
    const logEntry: WhatsAppNotificationLog = {
      id: `wlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      stage,
      stageLabel: STAGE_LABELS[stage] || stage,
      recipientRole: 'client',
      recipientPhone: store.orders[idx].customer?.phone || '+24177003004',
      recipientName: store.orders[idx].customer?.facilityName || 'Client Médical',
      timestamp: new Date().toISOString(),
      status: 'sent',
      messagePreview: stagePayload.messageText.length > 140
        ? stagePayload.messageText.slice(0, 140) + '...'
        : stagePayload.messageText,
      triggeredBy: 'Automate API Logistique (Gloryday)'
    };

    if (!store.orders[idx].whatsappLogs) {
      store.orders[idx].whatsappLogs = [];
    }
    store.orders[idx].whatsappLogs = [logEntry, ...store.orders[idx].whatsappLogs];
    store.orders[idx].lastWhatsAppNotifiedStage = stage;

    saveStore(store);
    res.json(store.orders[idx]);
  });

  app.patch('/api/orders/:id/payment', (req, res) => {
    const { id } = req.params;
    const { isPaid } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    store.orders[idx].isPaid = Boolean(isPaid);
    if (store.orders[idx].mobilePayment) {
      store.orders[idx].mobilePayment!.status = isPaid ? 'verified' : 'pending';
      if (isPaid && !store.orders[idx].mobilePayment!.validatedAt) {
        store.orders[idx].mobilePayment!.validatedAt = new Date().toISOString();
      }
    }
    saveStore(store);
    res.json(store.orders[idx]);
  });

  app.patch('/api/orders/:id/mobile-payment', (req, res) => {
    const { id } = req.params;
    const { mobilePayment } = req.body || {};
    const idx = store.orders.findIndex(o => o.id === id || o.reference === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }
    store.orders[idx].mobilePayment = mobilePayment;
    store.orders[idx].customer.mobilePayment = mobilePayment;
    if (mobilePayment?.isPrePaid || mobilePayment?.status === 'verified') {
      store.orders[idx].isPaid = true;
    }
    saveStore(store);
    res.json(store.orders[idx]);
  });

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
    res.json(store.notifications.slice(0, 30));
  });

  app.post('/api/admin/production-cleanup', (req, res) => {
    const fullReset = req.body?.fullReset !== false;
    const prevOrdersCount = store.orders.length;
    const prevNotifsCount = store.notifications.length;
    const prevAccountsCount = store.accounts.length;

    if (fullReset) {
      store.orders = [];
      store.notifications = [];
      store.quotes = [];
      store.messages = [];
      store.accounts = store.accounts.filter(a => a?.user && !DEMO_ACCOUNT_IDS.has(a.user.id));
    } else {
      store.orders = store.orders.filter(o => !isDemoOrTestOrder(o));
      store.notifications = store.notifications.filter(n => !isDemoOrTestNotification(n));
      store.accounts = store.accounts.filter(a => a?.user && !DEMO_ACCOUNT_IDS.has(a.user.id));
    }

    saveStore(store);

    res.json({
      success: true,
      removedOrdersCount: prevOrdersCount - store.orders.length,
      removedNotificationsCount: prevNotifsCount - store.notifications.length,
      removedAccountsCount: prevAccountsCount - store.accounts.length,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/supabase/migration-sql', (_req, res) => {
    try {
      const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        const combinedSql = files
          .map(f => fs.readFileSync(path.join(migrationsDir, f), 'utf-8'))
          .join('\n\n');
        res.json({
          projectRef: 'kqvfoltosjrjvghaizpd',
          supabaseUrl: 'https://kqvfoltosjrjvghaizpd.supabase.co',
          sql: combinedSql
        });
        return;
      }
    } catch (err) {
      console.error('Error reading Supabase migrations:', err);
    }
    res.json({
      projectRef: 'kqvfoltosjrjvghaizpd',
      supabaseUrl: 'https://kqvfoltosjrjvghaizpd.supabase.co',
      sql: ''
    });
  });

  // ==========================================
  // 7. VITE DEV MIDDLEWARE OR STATIC PROD
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gloryday Pharma Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
