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
  AppRole,
  DeliveryStage,
  CourierInfo,
  DeliveryProof,
  DeliveryLocationPoint,
  CourierTrackingInfo,
  StaffPermission,
  VolumeDiscountSettings,
  StaffActivityStats,
  StaffActivityLog
} from './types';

export type StaffRole = Extract<AppRole, 'Admin simple' | 'Commercial' | 'Gestionnaire Catalogue' | 'Logistique'>;

export interface StaffAccountSummary {
  id: string;
  identifier: string;
  name: string;
  role: StaffRole;
  permissions?: StaffPermission[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  source: 'managed' | 'environment';
  isOnline?: boolean;
  lastSeenAt?: string;
  lastLoginAt?: string;
  stats?: StaffActivityStats;
}

export function clearLocalDraftsAndCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('gloryday_auth_token');
    localStorage.removeItem('gloryday_registered_users');
    localStorage.removeItem('gloryday_guest_orders');
    localStorage.removeItem('gloryday_customer_info');
    localStorage.removeItem('gloryday_drafts_guest');
    localStorage.removeItem('gloryday_autodraft_guest');
    localStorage.removeItem('gloryday_current_user');
  } catch {}
}

if (typeof window !== 'undefined') {
  clearLocalDraftsAndCaches();
}

let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    return localStorage.getItem('gloryday_session_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem('gloryday_session_token', token);
    } else {
      localStorage.removeItem('gloryday_session_token');
    }
  } catch {}
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };
  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include'
    });
  } catch (error) {
    const networkError = new Error('Le serveur est injoignable pour le moment. Vérifiez votre connexion puis réessayez.');
    (networkError as Error & { status?: number; cause?: unknown }).status = 0;
    (networkError as Error & { cause?: unknown }).cause = error;
    throw networkError;
  }

  if (!response.ok) {
    let errorMsg = `Erreur (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    const serverError = new Error(errorMsg);
    (serverError as Error & { status?: number }).status = response.status;
    throw serverError;
  }
  try {
    return await response.json();
  } catch (cause) {
    const invalidResponse = new Error('Le serveur a renvoyé une réponse illisible.');
    (invalidResponse as Error & { status?: number; cause?: unknown }).status = response.status;
    (invalidResponse as Error & { cause?: unknown }).cause = cause;
    throw invalidResponse;
  }
}

export const api = {
  async getProducts(): Promise<Product[]> {
    return request<Product[]>('/api/products');
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    return request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
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

  async updateProductStatus(id: string, status: 'disponible' | 'rupture', quantityAvailable?: number): Promise<Product> {
    const res = await request<{ success: boolean; product: Product }>(`/api/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(typeof quantityAvailable === 'number' ? { quantityAvailable } : {}) })
    });
    return res.product;
  },

  async updateProductStock(id: string, quantityAvailable: number, status?: 'disponible' | 'rupture'): Promise<Product> {
    const res = await request<{ success: boolean; product: Product }>(`/api/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: status || 'disponible', quantityAvailable })
    });
    return res.product;
  },

  async getVolumeDiscountSettings(): Promise<VolumeDiscountSettings> {
    return request<VolumeDiscountSettings>('/api/settings/volume-discounts');
  },

  async updateVolumeDiscountSettings(settings: VolumeDiscountSettings): Promise<VolumeDiscountSettings> {
    return request<VolumeDiscountSettings>('/api/admin/settings/volume-discounts', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
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
    return request<Pack[]>('/api/packs');
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
  }): Promise<{ token?: string; user: User }> {
    const res = await request<{ user: User; token?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async login(phone: string, password: string): Promise<{ token?: string; user: User }> {
    const res = await request<{ user: User; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async requestPasswordRecovery(phone: string): Promise<void> {
    await request<{ success: boolean }>('/api/auth/recovery-request', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  },

  async loginWithGoogle(googleProfile: {
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<{ isNewUser: boolean; token?: string; user?: User; profileData: { email: string; name: string; avatarUrl?: string } }> {
    await request('/api/auth/google', { method: 'POST', body: JSON.stringify(googleProfile) });
    return { isNewUser: false, profileData: googleProfile };
  },

  async completeGoogleRegistration(data: {
    email: string;
    name: string;
    avatarUrl?: string;
    facilityName: string;
    phone: string;
    contactName?: string;
    facilityType?: string;
    deliveryAddress?: string;
    coordinates?: { lat: number; lng: number };
  }): Promise<{ token?: string; user: User }> {
    const res = await request<{ user: User; token?: string }>('/api/auth/google/complete', { method: 'POST', body: JSON.stringify(data) });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async adminLogin(identifier: string, passwordOrRole?: string | AppRole, _roleOption?: AppRole): Promise<{ token?: string; user: User }> {
    const password = typeof passwordOrRole === 'string' && !['client', 'Super-Admin', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'].includes(passwordOrRole)
      ? passwordOrRole
      : '';
    const res = await request<{ user: User; token?: string }>('/api/auth/admin', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async getStaffAccounts(): Promise<StaffAccountSummary[]> {
    return request<StaffAccountSummary[]>('/api/admin/staff');
  },

  async createStaffAccount(input: { identifier: string; name: string; role: StaffRole; password: string; permissions?: StaffPermission[] }): Promise<StaffAccountSummary> {
    return request<StaffAccountSummary>('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async updateStaffAccount(id: string, input: { identifier?: string; name?: string; role?: StaffRole; active?: boolean; password?: string; permissions?: StaffPermission[] }): Promise<StaffAccountSummary> {
    return request<StaffAccountSummary>(`/api/admin/staff/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async getLatestMigrationSql(): Promise<string> {
    const result = await request<{ sql: string }>('/api/supabase/migration-sql');
    return result.sql;
  },

  async getCurrentUser(): Promise<{ user: User; role: AppRole } | null> {
    try {
      const result = await request<{ user: User | null }>('/api/auth/session');
      return result.user ? { user: result.user, role: result.user.role } : null;
    } catch { return null; }
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST', body: '{}' });
    } finally {
      setStoredToken(null);
      clearLocalDraftsAndCaches();
    }
  },

  async getClients(): Promise<any[]> {
    return request<any[]>('/api/clients');
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
    return request<CommercialQuote[]>('/api/quotes');
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

  async createOrder(customer: Order['customer'], items: CartItem[], idempotencyKey: string): Promise<Order> {
    try {
      return await request<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ customer, items, idempotencyKey })
      });
    } catch (error) {
      const requestStatus = (error as Error & { status?: number }).status;
      if (requestStatus === 0) {
        throw new Error('La connexion a été interrompue avant la confirmation de la commande. Consultez « Mes commandes » avant de réessayer pour éviter un doublon.');
      }
      if (requestStatus !== undefined && requestStatus >= 200 && requestStatus < 300) {
        throw new Error('Le serveur a répondu sans fournir la confirmation lisible de la commande. Consultez « Mes commandes » avant de réessayer pour éviter un doublon.');
      }
      throw error;
    }
  },

  async uploadOrderPdf(orderReference: string, pdfBase64: string): Promise<string> {
    const res = await request<{ success: boolean; pdfUrl: string }>('/api/orders/upload-pdf', {
      method: 'POST',
      body: JSON.stringify({ orderReference, pdfBase64 })
    });
    return res.pdfUrl;
  },

  async getOrders(phone?: string): Promise<Order[]> {
    const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
    return request<Order[]>(`/api/orders${query}`);
  },

  async updateOrderStatus(orderId: string, status: Order['status'], cancellationReason?: string): Promise<Order> {
    return request<Order>(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancellationReason })
    });
  },

  async updateOrderDeliveryStage(
    orderId: string,
    deliveryStage: DeliveryStage,
    options: { courier?: CourierInfo; deliveryProof?: DeliveryProof } = {}
  ): Promise<Order> {
    return request<Order>(`/api/orders/${orderId}/delivery-stage`, {
      method: 'PATCH',
      body: JSON.stringify({ deliveryStage, ...options })
    });
  },

  async getDeliveryLocationHistory(orderId: string): Promise<DeliveryLocationPoint[]> {
    const result = await request<{ points: DeliveryLocationPoint[] }>(`/api/orders/${encodeURIComponent(orderId)}/live-location`);
    return result.points;
  },

  async createCourierTrackingLink(orderId: string): Promise<{ url: string; expiresAt: string }> {
    const result = await request<{ token: string; expiresAt: string }>(`/api/orders/${encodeURIComponent(orderId)}/tracking-link`, {
      method: 'POST',
      body: '{}'
    });
    return {
      url: new URL(`/courier-track/${encodeURIComponent(result.token)}`, window.location.origin).href,
      expiresAt: result.expiresAt,
    };
  },

  async getCourierTrackingStatus(orderId: string): Promise<{ active: boolean; expiresAt?: string; token?: string; url?: string }> {
    const result = await request<{ active: boolean; expiresAt?: string; token?: string }>(`/api/orders/${encodeURIComponent(orderId)}/tracking-link`);
    return {
      ...result,
      url: result.token ? new URL(`/courier-track/${encodeURIComponent(result.token)}`, window.location.origin).href : undefined,
    };
  },

  async revokeCourierTracking(orderId: string): Promise<void> {
    await request<{ success: boolean }>(`/api/orders/${encodeURIComponent(orderId)}/tracking-link`, { method: 'DELETE' });
  },

  async getCourierTrackingInfo(token: string): Promise<CourierTrackingInfo> {
    return request<CourierTrackingInfo>(`/api/courier-tracking/${encodeURIComponent(token)}`);
  },

  async postCourierTrackingLocation(token: string, point: Pick<DeliveryLocationPoint, 'latitude' | 'longitude' | 'accuracy'>): Promise<void> {
    await request<{ success: boolean }>(`/api/courier-tracking/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify(point)
    });
  },

  async updateOrderPayment(orderId: string, isPaid: boolean): Promise<Order> {
    return request<Order>(`/api/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ isPaid })
    });
  },

  async updateOrderMobilePayment(orderId: string, mobilePayment: import('./types').MobilePaymentDetails): Promise<Order> {
    return request<Order>(`/api/orders/${orderId}/mobile-payment`, {
      method: 'PATCH',
      body: JSON.stringify({ mobilePayment })
    });
  },

  async updateOrderExpectedDelivery(orderId: string, expectedDeliveryDate: string, expectedDeliverySlot?: string): Promise<Order> {
    return request<Order>(`/api/orders/${encodeURIComponent(orderId)}/expected-delivery`, {
      method: 'PATCH',
      body: JSON.stringify({ expectedDeliveryDate, expectedDeliverySlot })
    });
  },

  async getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>('/api/admin/stats');
  },

  async getEvents(since = 0): Promise<AppNotification[]> {
    return request<AppNotification[]>(`/api/events?since=${since}`);
  },

  async sendClientAnnouncement(title: string, message: string): Promise<{ sentCount: number }> {
    return request<{ sentCount: number }>('/api/events/announcement', {
      method: 'POST',
      body: JSON.stringify({ title, message })
    });
  },

  async markNotificationsRead(ids: string[]): Promise<void> {
    await request<{ updated: number }>('/api/events/read', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  },

  async getStaffActivityLogs(): Promise<StaffActivityLog[]> {
    return request<StaffActivityLog[]>('/api/admin/logs');
  },

  async clearStaffActivityLogs(): Promise<StaffActivityLog[]> {
    const res = await request<{ success: boolean; logs: StaffActivityLog[] }>('/api/admin/logs', {
      method: 'DELETE'
    });
    return res.logs;
  },

  async getClientPurchaseHistory(clientId: string): Promise<any> {
    return request<any>(`/api/admin/clients/${encodeURIComponent(clientId)}/purchases`);
  },

  async syncGitHubRepository(token?: string, commitMessage?: string): Promise<{
    success: boolean;
    pushed: boolean;
    commitHash: string;
    repoUrl: string;
    message: string;
  }> {
    return request('/api/admin/github/sync', {
      method: 'POST',
      body: JSON.stringify({ token, commitMessage })
    });
  }
};


