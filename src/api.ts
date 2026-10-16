import { 
  Product, 
  Pack, 
  Order, 
  User, 
  AppNotification, 
  AdminStats, 
  CartItem, 
  MediaItem, 
  CommercialQuote, 
  DirectMessage,
  AppRole
} from './types';
import { INITIAL_PRODUCTS, INITIAL_PACKS } from './data/initialProducts';
import { getEstimatedDeliveryText, detectNeighborhoodFromAddress } from './data/librevilleZones';

const TOKEN_KEY = 'gloryday_auth_token';
const GUEST_ORDERS_KEY = 'gloryday_guest_orders';
const GUEST_INFO_KEY = 'gloryday_customer_info';
const REGISTERED_USERS_KEY = 'gloryday_registered_users';

export interface StoredAccount {
  user: User;
  passwordHash: string;
}

export function normalizePhone(p: string): string {
  return (p || '').replace(/[\s\-\.\(\)]/g, '').toLowerCase();
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    user: {
      id: 'usr-ste-marie',
      phone: '+24177001122',
      facilityName: 'Clinique Sainte-Marie',
      contactName: 'Dr. Jeanne Ndong',
      facilityType: 'Clinique',
      role: 'client',
      deliveryAddress: 'Quartier Louis, Libreville, Gabon',
      coordinates: { lat: 0.4022, lng: 9.4442 },
      createdAt: '2026-01-10T08:00:00Z'
    },
    passwordHash: 'client123'
  },
  {
    user: {
      id: 'usr-pharma-mer',
      phone: '+24166334455',
      facilityName: 'Pharmacie du Bord de Mer',
      contactName: 'Dr. Obame',
      facilityType: 'Pharmacie',
      role: 'client',
      deliveryAddress: 'Boulevard Triomphal, Libreville, Gabon',
      coordinates: { lat: 0.3920, lng: 9.4530 },
      createdAt: '2026-01-15T09:30:00Z'
    },
    passwordHash: 'pharma123'
  },
  {
    user: {
      id: 'usr-rapha',
      phone: '+24174001122',
      facilityName: 'Polyclinique El Rapha',
      contactName: 'Dr. Mengue (Major de Bloc)',
      facilityType: 'Polyclinique',
      role: 'client',
      deliveryAddress: 'Batterie 4, Libreville, Gabon',
      coordinates: { lat: 0.418, lng: 9.432 },
      createdAt: '2026-01-20T10:15:00Z'
    },
    passwordHash: 'rapha123'
  }
];

export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const accounts: StoredAccount[] = JSON.parse(raw);
    let modified = false;
    for (const def of DEFAULT_ACCOUNTS) {
      if (!accounts.some(a => normalizePhone(a.user.phone) === normalizePhone(def.user.phone))) {
        accounts.push(def);
        modified = true;
      }
    }
    if (modified) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
    }
    return accounts;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredCustomerInfo() {
  try {
    const raw = localStorage.getItem(GUEST_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredCustomerInfo(info: any) {
  try {
    localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('Failed to save customer info', e);
  }
}

export function getLocalGuestOrders(): Order[] {
  try {
    const raw = localStorage.getItem(GUEST_ORDERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Default mock orders with active delivery tracking for demonstration
    const defaultOrders: Order[] = [
      {
        id: 'ord-demo-01',
        reference: 'GP-2026-0089',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        customer: {
          facilityName: 'Polyclinique El Rapha',
          facilityType: 'Polyclinique',
          contactName: 'Dr. Mengue (Major de Bloc)',
          phone: '+24177001122',
          deliveryAddress: 'Batterie 4, Libreville, Gabon',
          deliveryMode: 'livraison',
          paymentMethod: 'airtel_money',
          coordinates: { lat: 0.418, lng: 9.432 }
        },
        items: [
          {
            productId: 'c-ser-01',
            productName: 'Seringue 2 ml 3 pièces avec aiguille',
            variant: 'Boîte de 100 unités (21G)',
            price: 7500,
            quantity: 3,
            total: 22500,
            isQuote: false
          },
          {
            productId: 'c-gant-01',
            productName: "Gants d'examen latex poudrés",
            variant: 'Boîte de 100 gants - Taille M',
            price: 4500,
            quantity: 5,
            total: 22500,
            isQuote: false
          },
          {
            productId: 'c-cath-01',
            productName: 'Cathéter court intraveineux (Cathlon)',
            variant: 'Boîte de 50 (20G Rose)',
            price: 11000,
            quantity: 2,
            total: 22000,
            isQuote: false
          }
        ],
        estimatedTotal: 67000,
        hasQuoteItems: false,
        status: 'En préparation',
        isPaid: true,
        deliveryStage: 'in_transit',
        courier: {
          name: 'Alexandre Moundounga',
          phone: '+24177003004',
          vehicle: 'Moto Express Honda GP-04',
          matricule: 'COUR-LBV-04',
          currentZone: 'En cours d’acheminement : Axe Boulevard Triomphal ➔ Batterie 4',
          estimatedTime: '20-30 min'
        }
      },
      {
        id: 'ord-demo-02',
        reference: 'GP-2026-0042',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        customer: {
          facilityName: 'Pharmacie du Bord de Mer',
          facilityType: 'Pharmacie',
          contactName: 'Dr. Obame',
          phone: '+24166334455',
          deliveryAddress: 'Boulevard de la Mer, Libreville',
          deliveryMode: 'livraison',
          paymentMethod: 'especes'
        },
        items: [
          {
            productId: 'c-perf-01',
            productName: 'Perfuseur de précision avec régulateur',
            variant: 'Carton de 25 unités',
            price: 18500,
            quantity: 2,
            total: 37000,
            isQuote: false
          }
        ],
        estimatedTotal: 37000,
        hasQuoteItems: false,
        status: 'Livrée',
        isPaid: true,
        deliveryStage: 'delivered',
        courier: {
          name: 'Jean-Marc Nze',
          phone: '+24177003004',
          vehicle: 'Pick-up Isuzu GP-Log',
          matricule: 'LOG-LBV-02',
          currentZone: 'Livré et émargé au comptoir pharmacie',
          estimatedTime: 'Livré'
        }
      }
    ];
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(defaultOrders));
    return defaultOrders;
  } catch {
    return [];
  }
}

export function saveLocalGuestOrder(order: Order) {
  try {
    const current = getLocalGuestOrders();
    const filtered = current.filter(o => o.reference !== order.reference);
    filtered.unshift(order);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(filtered.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save local guest order', e);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `Erreur (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  async getProducts(): Promise<Product[]> {
    try {
      return await request<Product[]>('/api/products');
    } catch (err) {
      return INITIAL_PRODUCTS;
    }
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      return await request<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
    } catch (e) {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: productData.name || 'Produit Médical',
        category: productData.category || 'Consommables médicaux',
        subcategory: productData.subcategory,
        variants: productData.variants || [{ label: 'Boîte de 100', price: 7500 }],
        status: productData.status || 'disponible',
        image: productData.image,
        thumbnailUrl: productData.thumbnailUrl || productData.image,
        description: productData.description
      };
      return newProd;
    }
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    return request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await request(`/api/products/${id}`, { method: 'DELETE' });
  },

  async updateProductStatus(id: string, status: 'disponible' | 'rupture'): Promise<Product> {
    const res = await request<{ success: boolean; product: Product }>(`/api/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.product;
  },

  async uploadMediaImage(file: File, tags?: string[]): Promise<MediaItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (tags && tags.length > 0) {
      formData.append('tags', tags.join(','));
    }
    const res = await request<{ success: boolean; mediaItem: MediaItem }>('/api/media/upload', {
      method: 'POST',
      body: formData
    });
    return res.mediaItem;
  },

  async uploadPdfNotice(file: File): Promise<{ pdfUrl: string; originalName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ success: boolean; pdfUrl: string; originalName: string }>('/api/media/upload-pdf', {
      method: 'POST',
      body: formData
    });
  },

  async getMediaLibrary(query?: string): Promise<MediaItem[]> {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<MediaItem[]>(`/api/media${q}`);
  },

  async deleteMediaItem(id: string): Promise<void> {
    await request(`/api/media/${id}`, { method: 'DELETE' });
  },

  async getPacks(): Promise<Pack[]> {
    try {
      return await request<Pack[]>('/api/packs');
    } catch (err) {
      return INITIAL_PACKS;
    }
  },

  async createPack(packData: Omit<Pack, 'id'>): Promise<Pack> {
    return request<Pack>('/api/packs', {
      method: 'POST',
      body: JSON.stringify(packData)
    });
  },

  async updatePack(id: string, packData: Partial<Pack>): Promise<Pack> {
    return request<Pack>(`/api/packs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packData)
    });
  },

  async deletePack(id: string): Promise<void> {
    await request(`/api/packs/${id}`, { method: 'DELETE' });
  },

  async register(registrationData: {
    phone: string;
    facilityName: string;
    contactName?: string;
    facilityType?: string;
    facilityTypeOther?: string;
    password: string;
    deliveryAddress?: string;
    coordinates?: { lat: number; lng: number };
  }): Promise<{ token: string; user: User }> {
    const cleanPhone = normalizePhone(registrationData.phone);
    const cleanPass = (registrationData.password || '').trim();

    if (!cleanPhone || !cleanPass) {
      throw new Error('Numéro de téléphone et mot de passe obligatoires.');
    }
    if (!registrationData.facilityName) {
      throw new Error('Nom de l\'établissement obligatoire.');
    }

    const accounts = getRegisteredAccounts();
    const existing = accounts.find(a => normalizePhone(a.user.phone) === cleanPhone);
    if (existing) {
      throw new Error('Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter.');
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      phone: registrationData.phone.trim(),
      facilityName: registrationData.facilityName.trim(),
      contactName: registrationData.contactName?.trim() || 'Responsable Approvisionnement',
      facilityType: (registrationData.facilityType as any) || 'Clinique',
      facilityTypeOther: registrationData.facilityTypeOther,
      role: 'client',
      deliveryAddress: registrationData.deliveryAddress || 'Libreville, Gabon',
      coordinates: registrationData.coordinates || { lat: 0.3924, lng: 9.4536 },
      createdAt: new Date().toISOString()
    };

    accounts.push({
      user: newUser,
      passwordHash: cleanPass
    });

    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
      localStorage.setItem('gloryday_current_user', JSON.stringify(newUser));
    } catch {}

    const token = `usr-token-${newUser.id}-${Date.now()}`;
    setStoredToken(token);
    return { token, user: newUser };
  },

  async login(phone: string, password: string): Promise<{ token: string; user: User }> {
    const cleanPhone = normalizePhone(phone);
    const cleanPass = (password || '').trim();

    if (!cleanPhone || !cleanPass) {
      throw new Error('Veuillez renseigner votre numéro de téléphone et votre mot de passe.');
    }

    // Check if it's admin credentials entered in the client login tab
    if (
      (cleanPhone === 'admin' || cleanPhone === '+24177003004' || cleanPhone === '077003004' || cleanPhone === '24177003004') &&
      (cleanPass === 'admin' || cleanPass === 'gloryday2026')
    ) {
      return this.adminLogin('admin', cleanPass, 'Super-Admin');
    }

    // Check against registered accounts in local storage
    const accounts = getRegisteredAccounts();
    const found = accounts.find(a => normalizePhone(a.user.phone) === cleanPhone);

    if (!found) {
      throw new Error('Aucun compte trouvé avec ce numéro. Si vous êtes nouveau client, veuillez créer un compte.');
    }

    if (found.passwordHash !== cleanPass) {
      throw new Error('Mot de passe incorrect. Veuillez vérifier votre saisie.');
    }

    const token = `usr-token-${found.user.id}-${Date.now()}`;
    setStoredToken(token);
    try {
      localStorage.setItem('gloryday_current_user', JSON.stringify(found.user));
    } catch {}
    return { token, user: found.user };
  },

  async adminLogin(identifier: string, passwordOrRole?: string | AppRole, roleOption?: AppRole): Promise<{ token: string; user: User }> {
    let password = typeof passwordOrRole === 'string' && !['client', 'Super-Admin', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'].includes(passwordOrRole)
      ? passwordOrRole
      : undefined;
    let role: AppRole = (roleOption || (typeof passwordOrRole === 'string' && ['client', 'Super-Admin', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'].includes(passwordOrRole) ? passwordOrRole as AppRole : 'Super-Admin'));

    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Check credentials: admin / admin OR admin@glorydaypharma.ga / admin OR gloryday-admin-2026 OR +24177003004 / admin
    const isKeyValid = cleanId === 'gloryday-admin-2026';
    const isIdValid = cleanId === 'admin' || cleanId === 'admin@glorydaypharma.ga' || normalizePhone(cleanId) === '+24177003004' || normalizePhone(cleanId) === '24177003004' || normalizePhone(cleanId) === '077003004';
    const isPassValid = !password || cleanPass === 'admin' || cleanPass === 'gloryday2026';

    if (!isKeyValid && (!isIdValid || !isPassValid)) {
      throw new Error('Identifiants administrateur incorrects. Utilisez : admin / admin (ou admin@glorydaypharma.ga)');
    }

    const assignedRole = role || 'Super-Admin';
    const staffUser: User = {
      id: `staff-${assignedRole.toLowerCase().replace(/\s+/g, '-')}`,
      phone: '+24177003004',
      facilityName: `Direction Générale Gloryday`,
      contactName: `Direction & Staff [${assignedRole}]`,
      role: assignedRole,
      createdAt: new Date().toISOString()
    };
    const token = `staff-token-${Date.now()}`;
    setStoredToken(token);
    try {
      localStorage.setItem('gloryday_current_user', JSON.stringify(staffUser));
    } catch {}
    return { token, user: staffUser };
  },

  async getCurrentUser(): Promise<{ user: User; role: AppRole } | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const savedUserStr = localStorage.getItem('gloryday_current_user');
      if (savedUserStr) {
        const user: User = JSON.parse(savedUserStr);
        return { user, role: user.role };
      }
    } catch {}
    return null;
  },

  async getClients(): Promise<any[]> {
    try {
      return await request<any[]>('/api/clients');
    } catch {
      return [
        {
          id: 'client-1',
          phone: '+24174001122',
          facilityName: 'Polyclinique El Rapha',
          contactName: 'Dr. Mengue',
          facilityType: 'Polyclinique',
          role: 'client',
          deliveryAddress: 'Libreville, Batterie 4',
          totalOrdersCount: 4,
          totalSpent: 485000,
          daysSinceLastOrder: 14,
          isInactive10Days: true
        },
        {
          id: 'client-2',
          phone: '+24166334455',
          facilityName: 'Pharmacie du Bord de Mer',
          contactName: 'Dr. Obame',
          facilityType: 'Pharmacie',
          role: 'client',
          deliveryAddress: 'Libreville, Boulevard Triomphal',
          totalOrdersCount: 6,
          totalSpent: 792000,
          daysSinceLastOrder: 3,
          isInactive10Days: false
        }
      ];
    }
  },

  async assignClientToCommercial(clientId: string, commercialId: string): Promise<any> {
    return request<any>(`/api/clients/${clientId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ commercialId })
    });
  },

  async createQuote(quoteData: any): Promise<CommercialQuote> {
    return request<CommercialQuote>('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(quoteData)
    });
  },

  async getQuotes(): Promise<CommercialQuote[]> {
    try {
      return await request<CommercialQuote[]>('/api/quotes');
    } catch {
      return [];
    }
  },

  async updateQuoteStatus(quoteId: string, status: string): Promise<CommercialQuote> {
    return request<CommercialQuote>(`/api/quotes/${quoteId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async sendDirectMessage(msgData: any): Promise<DirectMessage> {
    return request<DirectMessage>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(msgData)
    });
  },

  async getDirectMessages(): Promise<DirectMessage[]> {
    return request<DirectMessage[]>('/api/messages');
  },

  async createOrder(customer: Order['customer'], items: CartItem[]): Promise<Order> {
    const zoneName = customer.neighborhoodName || 
      (customer.deliveryAddress ? detectNeighborhoodFromAddress(customer.deliveryAddress)?.name : null) || 
      'Grand Libreville';
    const estimatedTime = getEstimatedDeliveryText(customer.neighborhoodId, customer.deliveryAddress);

    try {
      const order = await request<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ customer, items })
      });
      if (!order.deliveryZone) order.deliveryZone = zoneName;
      if (!order.deliveryEstimated) order.deliveryEstimated = estimatedTime;
      saveLocalGuestOrder(order);
      return order;
    } catch (err: any) {
      const year = new Date().getFullYear();
      const localCounter = Math.floor(1000 + Math.random() * 9000);
      const fallbackRef = `GP-${year}-P${localCounter}`;
      const itemsTotal = items
        .filter(it => !it.isQuote)
        .reduce((sum, it) => sum + it.price * it.quantity, 0);
      const deliveryFee = customer.deliveryFee || 0;
      const finalTotal = itemsTotal + deliveryFee;

      const localOrder: Order = {
        id: `ord-offline-${Date.now()}`,
        reference: fallbackRef,
        createdAt: new Date().toISOString(),
        customer,
        items: items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          variant: it.variant,
          price: it.price,
          quantity: it.quantity,
          total: it.isQuote ? 0 : it.price * it.quantity,
          isQuote: it.isQuote
        })),
        estimatedTotal: finalTotal,
        hasQuoteItems: items.some(it => it.isQuote),
        status: 'À confirmer',
        isPaid: false,
        deliveryStage: 'preparation',
        deliveryZone: zoneName,
        deliveryEstimated: estimatedTime,
        deliveryFee,
        courier: {
          name: 'Alexandre Moundounga (Livreur Médical)',
          phone: '+24177003004',
          vehicle: 'Moto Médicale GP-04',
          matricule: 'LOG-LBV-04',
          currentZone: 'Dépôt Central Oloumi',
          estimatedTime
        }
      };
      saveLocalGuestOrder(localOrder);
      return localOrder;
    }
  },

  async uploadOrderPdf(orderReference: string, pdfBase64: string): Promise<string> {
    try {
      const res = await request<{ success: boolean; pdfUrl: string }>('/api/orders/upload-pdf', {
        method: 'POST',
        body: JSON.stringify({ orderReference, pdfBase64 })
      });
      return res.pdfUrl;
    } catch {
      return pdfBase64;
    }
  },

  async getOrders(phone?: string): Promise<Order[]> {
    try {
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      return await request<Order[]>(`/api/orders${query}`);
    } catch {
      return getLocalGuestOrders();
    }
  },

  async updateOrderStatus(orderId: string, status: Order['status'], cancellationReason?: string): Promise<Order> {
    try {
      return await request<Order>(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancellationReason })
      });
    } catch {
      const orders = getLocalGuestOrders();
      const idx = orders.findIndex(o => o.id === orderId || o.reference === orderId);
      if (idx > -1) {
        orders[idx].status = status;
        if (cancellationReason) orders[idx].cancellationReason = cancellationReason;
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
        return orders[idx];
      }
      throw new Error('Commande non trouvée');
    }
  },

  async updateOrderDeliveryStage(orderId: string, deliveryStage: import('./types').DeliveryStage, courier?: import('./types').CourierInfo): Promise<Order> {
    try {
      return await request<Order>(`/api/orders/${orderId}/delivery-stage`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryStage, courier })
      });
    } catch {
      const orders = getLocalGuestOrders();
      const idx = orders.findIndex(o => o.id === orderId || o.reference === orderId);
      if (idx > -1) {
        orders[idx].deliveryStage = deliveryStage;
        if (deliveryStage === 'delivered') {
          orders[idx].status = 'Livrée';
        } else if (deliveryStage === 'preparation' || deliveryStage === 'picked_up' || deliveryStage === 'in_transit') {
          orders[idx].status = 'En préparation';
        }
        if (courier) {
          orders[idx].courier = { ...orders[idx].courier, ...courier };
        }
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
        return orders[idx];
      }
      throw new Error('Commande non trouvée');
    }
  },

  async updateOrderPayment(orderId: string, isPaid: boolean): Promise<Order> {
    return request<Order>(`/api/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ isPaid })
    });
  },

  async getAdminStats(): Promise<AdminStats> {
    try {
      return await request<AdminStats>('/api/admin/stats');
    } catch {
      return {
        totalRevenue: 1250000,
        ordersToConfirm: 3,
        monthOrdersCount: 18,
        averageBasket: 69400,
        totalClients: 8,
        pendingPaymentAmount: 320000,
        salesLast14Days: [],
        ordersByStatus: {
          'À confirmer': 3,
          'Confirmée': 5,
          'En préparation': 4,
          'Livrée': 12,
          'Annulée': 1
        },
        topProducts: [],
        priorityOrders: [],
        inactiveClientsCount: 2
      };
    }
  },

  async getEvents(since = 0): Promise<AppNotification[]> {
    try {
      return await request<AppNotification[]>(`/api/events?since=${since}`);
    } catch {
      return [];
    }
  }
};
