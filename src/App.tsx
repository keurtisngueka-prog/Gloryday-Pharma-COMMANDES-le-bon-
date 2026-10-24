import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  Sparkles, 
  ShoppingBag, 
  Check, 
  ArrowUpDown,
  AlertCircle,
  Filter,
  CheckCircle2,
  FileText,
  Stethoscope
} from 'lucide-react';
import { 
  Product, 
  ProductVariant, 
  Pack, 
  CartItem, 
  CustomerInfo, 
  Order, 
  OrderDraft,
  User, 
  AppNotification, 
  AdminStats, 
  OrderStatus,
  CommercialQuote,
  AppRole,
  DeliveryStage,
  CourierInfo,
  DeliveryProof
} from './types';
import { api } from './api';
import { matchesProductSearch, scoreProductSearch } from './utils/search';
import { createPushSubscription, getExistingPushSubscription, getPushSupportStatus } from './utils/pushNotifications';
import type { PushNotificationStatus } from './utils/pushNotifications';
import { generateOrderPdf } from './utils/pdfGenerator';
import { getStoredDrafts, deleteDraft } from './utils/draftsStorage';
import { CATEGORIES, CONSUMABLE_SUBCATEGORIES, MEDICAL_SPECIALTIES } from './data/initialProducts';
import { getProductSpecialty } from './utils/specialties';
import { setActiveVolumeDiscountSettings } from './utils/volumeDiscount';

// Components
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppSidebar } from './components/AppSidebar';
import { AuthModal } from './components/AuthModal';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { DeliveryTrackingModal } from './components/DeliveryTrackingModal';
import { OrderPreviewModal } from './components/OrderPreviewModal';
import { OrderConfirmationView } from './components/OrderConfirmationView';
import { OrderPdfDocumentModal } from './components/OrderPdfDocumentModal';
import { BestClientsModule } from './components/BestClientsModule';
import { NotificationModal } from './components/NotificationModal';
import { ProductFormModal } from './components/ProductFormModal';
import { DraftsManagerModal } from './components/DraftsManagerModal';
import { PWAInstallBanner, OfflineIndicator } from './components/PWAInstallBanner';
import { RestrictedAccessView } from './components/RestrictedAccessView';

const PacksSection = React.lazy(() => import('./components/PacksSection').then(module => ({ default: module.PacksSection })));
const CartView = React.lazy(() => import('./components/CartView').then(module => ({ default: module.CartView })));
const BulkOrderView = React.lazy(() => import('./components/BulkOrderView').then(module => ({ default: module.BulkOrderView })));
const ClientDashboard = React.lazy(() => import('./components/ClientDashboard').then(module => ({ default: module.ClientDashboard })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const CommercialQuotesModule = React.lazy(() => import('./components/CommercialQuotesModule').then(module => ({ default: module.CommercialQuotesModule })));

export type AppTab = 
  | 'catalog' 
  | 'bulk-order'
  | 'packs' 
  | 'cart' 
  | 'dashboard' 
  | 'admin' 
  | 'commercial-quotes' 
  | 'clients-list' 
  | 'admin-catalog' 
  | 'admin-orders'
  | 'admin-staff'
  | 'admin-deploy';

export const ADMIN_TABS: AppTab[] = [
  'admin',
  'admin-orders',
  'admin-catalog',
  'admin-staff',
  'admin-deploy'
];

const getTabFromHash = (): AppTab => {
  if (typeof window === 'undefined') return 'catalog';
  const raw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  const validTabs: AppTab[] = [
    'catalog', 
    'bulk-order', 
    'packs', 
    'cart', 
    'dashboard', 
    'admin', 
    'commercial-quotes', 
    'clients-list', 
    'admin-catalog', 
    'admin-orders', 
    'admin-staff',
    'admin-deploy'
  ];
  if (validTabs.includes(raw as AppTab)) {
    return raw as AppTab;
  }
  return 'catalog';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => getTabFromHash());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<CommercialQuote[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  // Current User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const authGeneration = useRef(0);

  // Global Product Creation Modal State
  const [isGlobalProductModalOpen, setIsGlobalProductModalOpen] = useState(false);

  // Cart Storage Partitioning Helpers (Strict Account Isolation)
  const getCartStorageKey = (user: User | null): string => {
    if (user) {
      const key = (user.phone || user.id || 'user').replace(/[\s\-\.\(\)]/g, '');
      return `gloryday_cart_user_${key}`;
    }
    return 'gloryday_cart_guest';
  };

  const loadCartForUser = (user: User | null): CartItem[] => {
    try {
      const key = getCartStorageKey(user);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  // Cart State (Strictly isolated per user / guest session)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    return loadCartForUser(currentUser);
  });

  useEffect(() => {
    try {
      const key = getCartStorageKey(currentUser);
      localStorage.setItem(key, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart', e);
    }
  }, [cartItems, currentUser]);

  // URL Hash synchronization & Route Guard listener
  useEffect(() => {
    const handleHashChange = () => {
      const tabFromHash = getTabFromHash();
      setActiveTab(tabFromHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    try {
      const currentHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      const targetHash = activeTab === 'catalog' ? '' : activeTab;
      if (currentHash !== targetHash) {
        if (targetHash) {
          window.location.hash = targetHash;
        } else if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    } catch {
      // Safe fallback
    }
  }, [activeTab]);

  // Modals & Flows
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'guest_choice' | 'login' | 'register' | 'admin' | 'google_complete'>('guest_choice');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [draftsCount, setDraftsCount] = useState<number>(() => {
    return getStoredDrafts(currentUser?.phone).length;
  });
  const [initialDraftCustomerInfo, setInitialDraftCustomerInfo] = useState<Partial<CustomerInfo> | undefined>(undefined);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [confirmedPdfDataUrl, setConfirmedPdfDataUrl] = useState<string | undefined>(undefined);
  const [confirmedPdfFailed, setConfirmedPdfFailed] = useState(false);
  const [confirmedPdfStorageFailed, setConfirmedPdfStorageFailed] = useState(false);
  const [isPreparingConfirmedPdf, setIsPreparingConfirmedPdf] = useState(false);
  const [activeDeliveryOrder, setActiveDeliveryOrder] = useState<Order | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [pendingCustomerInfo, setPendingCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const orderSubmissionInFlightRef = useRef(false);
  const orderSubmissionKeyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const [previewPdfOrder, setPreviewPdfOrder] = useState<{ order: Order; dataUrl?: string } | null>(null);
  const [toastBanner, setToastBanner] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToastBanner({ message, type });
    setTimeout(() => {
      setToastBanner(current => (current?.message === message ? null : current));
    }, 4500);
  };

  const getOrderSubmissionKey = async (items: CartItem[]): Promise<string> => {
    const fingerprintSource = JSON.stringify({
      userId: currentUser?.id,
      items: items.map(({ productId, variant, quantity, isQuote }) => ({ productId, variant, quantity, isQuote }))
    });
    let fingerprint: string;
    try {
      const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintSource));
      fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    } catch {
      let hash = 2166136261;
      for (let index = 0; index < fingerprintSource.length; index += 1) {
        hash = Math.imul(hash ^ fingerprintSource.charCodeAt(index), 16777619);
      }
      fingerprint = (hash >>> 0).toString(36);
    }

    const activeSubmission = orderSubmissionKeyRef.current;
    if (activeSubmission?.fingerprint === fingerprint) return activeSubmission.key;

    const storageKey = `gloryday_order_submission_${currentUser?.id || 'guest'}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as { fingerprint?: unknown; key?: unknown } | null;
      if (saved?.fingerprint === fingerprint && typeof saved.key === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(saved.key)) {
        orderSubmissionKeyRef.current = { fingerprint, key: saved.key };
        return saved.key;
      }
    } catch {
      // Session storage may be unavailable in private browsing.
    }

    const key = `order-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    orderSubmissionKeyRef.current = { fingerprint, key };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
    } catch {
      // Keep the in-memory protection if session storage is unavailable.
    }
    return key;
  };

  const clearOrderSubmissionKey = (clearInMemory = true) => {
    try {
      sessionStorage.removeItem(`gloryday_order_submission_${currentUser?.id || 'guest'}`);
    } catch {
      // Session storage may be unavailable in private browsing.
    }
    if (clearInMemory) orderSubmissionKeyRef.current = null;
  };

  // Sync drafts count on mount, user change, or storage / custom events
  useEffect(() => {
    const updateCount = () => {
      setDraftsCount(getStoredDrafts(currentUser?.phone).length);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('gloryday_drafts_updated', updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('gloryday_drafts_updated', updateCount);
    };
  }, [currentUser]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous les articles');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Toutes les sous-catégories');
  const [onlySelected, setOnlySelected] = useState(false);
  const [onlyPromotions, setOnlyPromotions] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc'>('default');
  const [priceRange, setPriceRange] = useState<'all' | 'promotions' | 'under10k' | '10k-50k' | 'over50k' | 'quote'>('all');
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus>('unconfigured');
  const [pushError, setPushError] = useState<string | null>(null);
  const lastEventTimestamp = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) {
      setPushStatus('signed-out');
      setPushError(null);
      return () => { cancelled = true; };
    }

    const capability = getPushSupportStatus();
    if (capability !== 'available') {
      setPushStatus(capability);
      setPushError(null);
      return () => { cancelled = true; };
    }

    setPushStatus('loading');
    void getExistingPushSubscription().then(async subscription => {
      if (subscription) {
        await api.registerPushSubscription({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh || '',
            auth: subscription.toJSON().keys?.auth || ''
          }
        });
      }
      if (!cancelled) setPushStatus(subscription ? 'enabled' : capability);
    }).catch(error => {
      if (cancelled) return;
      setPushStatus('error');
      setPushError(error instanceof Error ? error.message : 'Impossible de vérifier cet abonnement push.');
    });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // Initial Data Load
  const loadInitialData = async () => {
    const generation = authGeneration.current;
    const [productsResult, packsResult, authResult, discountResult] = await Promise.allSettled([
      api.getProducts(),
      api.getPacks(),
      api.getCurrentUser(),
      api.getVolumeDiscountSettings()
    ]);
    if (generation !== authGeneration.current) return;

    // A failure in packs, auth, or settings must never prevent the catalogue
    // from rendering. Keep each initial request independent.
    if (productsResult.status === 'fulfilled') {
      setProducts(productsResult.value);
    } else {
      console.error('Chargement du catalogue impossible', productsResult.reason);
    }
    if (packsResult.status === 'fulfilled') {
      setPacks(packsResult.value);
    } else {
      console.warn('Chargement des packs impossible', packsResult.reason);
    }
    if (discountResult.status === 'fulfilled') {
      setActiveVolumeDiscountSettings(discountResult.value);
    }
    if (authResult.status === 'rejected') {
      console.warn('Vérification de session impossible', authResult.reason);
      setOrders([]);
      return;
    }

    const authData = authResult.value;
    if (!authData) {
      setOrders([]);
      return;
    }

    setCurrentUser(authData.user);
    setCartItems(loadCartForUser(authData.user));
    try {
      const userOrders = await api.getOrders(authData.user.phone);
      if (generation !== authGeneration.current) return;
      setOrders(userOrders);
    } catch (error) {
      console.warn('Chargement des commandes impossible', error);
    }
    const perms = authData.user.permissions || [];
    if (authData.role === 'Super-Admin' || authData.role === 'Admin simple' || perms.includes('stats_view')) {
      api.getAdminStats().then(setAdminStats).catch(() => {});
    }
    if (authData.role === 'Super-Admin' || authData.role === 'Admin simple' || authData.role === 'Commercial' || perms.includes('clients_manage')) {
      api.getClients().then(setClients).catch(() => {});
    }
    if (authData.role === 'Super-Admin' || authData.role === 'Commercial' || perms.includes('quotes_manage')) {
      api.getQuotes().then(setQuotes).catch(() => {});
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Notifications 20s Polling
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      lastEventTimestamp.current = 0;
      return;
    }

    let cancelled = false;
    const pollNotifications = async () => {
      const generation = authGeneration.current;
      try {
        const events = await api.getEvents(lastEventTimestamp.current);
        if (cancelled || generation !== authGeneration.current) return;
        if (events && events.length > 0) {
          const latestTimestamp = Math.max(...events.map(event => Date.parse(event.timestamp)).filter(Number.isFinite));
          if (Number.isFinite(latestTimestamp)) {
            lastEventTimestamp.current = Math.max(lastEventTimestamp.current, latestTimestamp);
          }
          setNotifications(prev => {
            const byId = new Map(prev.map(notification => [notification.id, notification]));
            events.forEach(event => byId.set(event.id, event));
            return Array.from(byId.values())
              .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
              .slice(0, 30);
          });
          if (currentUser?.role === 'Super-Admin' || currentUser?.role === 'Admin simple') {
            api.getAdminStats().then(setAdminStats).catch(() => {});
          }
          api.getOrders(currentUser ? currentUser.phone : undefined)
            .then(data => { if (generation === authGeneration.current) setOrders(data); })
            .catch(() => {});
        }
      } catch (e) {
        // quiet polling failure
      }
    };

    void pollNotifications();
    const interval = setInterval(pollNotifications, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUser]);

  // Auth Handlers
  const handleAuthSuccess = (user: User) => {
    const generation = ++authGeneration.current;
    lastEventTimestamp.current = 0;
    setNotifications([]);
    setCurrentUser(user);
    // Load isolated cart belonging strictly to this user
    const userCart = loadCartForUser(user);
    setCartItems(userCart);

    if (user.role === 'Super-Admin') {
      if (!ADMIN_TABS.includes(activeTab)) {
        setActiveTab('admin');
      }
      api.getAdminStats().then(setAdminStats).catch(() => {});
      api.getOrders().then(data => { if (generation === authGeneration.current) setOrders(data); }).catch(() => {});
      api.getClients().then(setClients).catch(() => {});
      api.getQuotes().then(setQuotes).catch(() => {});
    } else if (user.role === 'Admin simple') {
      setActiveTab('admin');
      api.getAdminStats().then(setAdminStats).catch(() => {});
      api.getOrders().then(data => { if (generation === authGeneration.current) setOrders(data); }).catch(() => {});
      api.getClients().then(setClients).catch(() => {});
    } else if (user.role === 'Logistique') {
      setActiveTab('admin-orders');
      api.getOrders().then(data => { if (generation === authGeneration.current) setOrders(data); }).catch(() => {});
    } else if (user.role === 'Commercial') {
      setActiveTab('commercial-quotes');
      api.getQuotes().then(setQuotes).catch(() => {});
      api.getClients().then(setClients).catch(() => {});
    } else {
      setActiveTab('dashboard');
      api.getOrders(user.phone).then(data => { if (generation === authGeneration.current) setOrders(data); }).catch(() => {});
    }
  };

  const handleLogout = () => {
    authGeneration.current += 1;
    // Persist current cart for this user before logging out
    if (currentUser) {
      try {
        localStorage.setItem(getCartStorageKey(currentUser), JSON.stringify(cartItems));
      } catch {}
    }
    void api.logout().catch(() => {});
    localStorage.removeItem('gloryday_current_user');
    localStorage.removeItem('gloryday_customer_info');
    localStorage.removeItem('gloryday_drafts_guest');
    localStorage.removeItem('gloryday_autodraft_guest');
    setCurrentUser(null);
    lastEventTimestamp.current = 0;
    setNotifications([]);
    setOrders([]);
    setClients([]);
    setQuotes([]);
    setAdminStats(null);
    // Reset active cart for the next guest visitor as confirmed by user
    setCartItems([]);
    try {
      localStorage.removeItem('gloryday_cart_guest');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {}
    setActiveTab('catalog');
  };

  // Cart Operations
  const handleAddToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        it => it.productId === product.id && it.variant === variant.label
      );
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity = Math.min(9999, copy[existingIndex].quantity + quantity);
        return copy;
      } else {
        const cleanQty = Math.min(9999, Math.max(1, quantity));
        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          category: product.category,
          variant: variant.label,
          price: variant.price,
          quantity: cleanQty,
          isQuote: variant.price === 0 || Boolean(product.isQuote)
        };
        return [...prev, newItem];
      }
    });
  };

  const handleAddPackToCart = (pack: Pack) => {
    pack.items.forEach(item => {
      const foundProduct = products.find(p => p.name === item.productName) || products[0];
      const foundVariant = foundProduct?.variants.find(v => v.label === item.variant) || foundProduct?.variants[0];
      if (foundProduct && foundVariant) {
        handleAddToCart(foundProduct, foundVariant, item.quantity);
      }
    });
  };

  const handleUpdateCartQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    setCartItems(prev => {
      const copy = [...prev];
      const item = copy[index];
      const nextQty = Math.min(9999, quantity);
      copy[index] = {
        ...item,
        quantity: nextQty
      };
      return copy;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleAddMultipleToCart = (itemsToAdd: { product: Product; variant: ProductVariant; quantity: number }[]) => {
    setCartItems(prev => {
      let copy = [...prev];
      itemsToAdd.forEach(({ product, variant, quantity }) => {
        const existingIndex = copy.findIndex(
          it => it.productId === product.id && it.variant === variant.label
        );
        if (existingIndex > -1) {
          copy[existingIndex].quantity = Math.min(9999, copy[existingIndex].quantity + quantity);
        } else {
          const cleanQty = Math.min(9999, Math.max(1, quantity));
          copy.push({
            productId: product.id,
            productName: product.name,
            category: product.category,
            variant: variant.label,
            price: variant.price,
            quantity: cleanQty,
            isQuote: variant.price === 0 || Boolean(product.isQuote)
          });
        }
      });
      return copy;
    });
  };

  const handleUpdateDeliveryStage = async (
    orderId: string,
    stage: DeliveryStage,
    options?: { courier?: CourierInfo; deliveryProof?: DeliveryProof }
  ) => {
    const updated = await api.updateOrderDeliveryStage(orderId, stage, options);
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    if (activeDeliveryOrder?.id === orderId) {
      setActiveDeliveryOrder(updated);
    }
  };

  const handleReorder = (order: Order) => {
    const newCartItems: CartItem[] = [];
    order.items.forEach(it => {
      const currentProd = products.find(p => p.id === it.productId || p.name === it.productName);
      if (currentProd) {
        const currentVariant = currentProd.variants.find(v => v.label === it.variant) || currentProd.variants[0];
        newCartItems.push({
          productId: currentProd.id,
          productName: currentProd.name,
          category: currentProd.category,
          variant: currentVariant ? currentVariant.label : it.variant,
          price: currentVariant ? currentVariant.price : it.price,
          quantity: it.quantity,
          isQuote: currentVariant ? currentVariant.price === 0 : it.isQuote
        });
      }
    });
    if (newCartItems.length > 0) {
      setCartItems(newCartItems);
      setActiveTab('cart');
    }
  };

  // Order Submission
  const handleProceedToPreview = (customerInfo: CustomerInfo) => {
    setPendingCustomerInfo(customerInfo);
    setIsPreviewModalOpen(true);
  };

  const prepareConfirmedOrderPdf = async (order: Order) => {
    setIsPreparingConfirmedPdf(true);
    setConfirmedPdfFailed(false);
    setConfirmedPdfStorageFailed(false);
    try {
      const { dataUrl } = await generateOrderPdf(order);
      setConfirmedPdfDataUrl(dataUrl);
      if (currentUser?.role === 'client') {
        try {
          const pdfUrl = await api.uploadOrderPdf(order.reference, dataUrl);
          const savedOrder = { ...order, pdfUrl };
          setConfirmedOrder(current => current?.id === order.id ? savedOrder : current);
          setOrders(previous => previous.map(existing => existing.id === order.id ? savedOrder : existing));
        } catch (storageError) {
          console.warn('PDF prêt sur cet appareil, mais sa sauvegarde pour le partage a échoué.', storageError);
          setConfirmedPdfStorageFailed(true);
        }
      }
    } catch (pdfError) {
      console.error('La commande est enregistrée, mais le PDF n’a pas pu être préparé.', pdfError);
      setConfirmedPdfDataUrl(undefined);
      setConfirmedPdfFailed(true);
    } finally {
      setIsPreparingConfirmedPdf(false);
    }
  };

  const handleConfirmAndSubmitOrder = async () => {
    if (!pendingCustomerInfo || cartItems.length === 0) return;
    if (!currentUser || currentUser.role !== 'client') {
      setIsAuthModalOpen(true);
      return;
    }
    if (orderSubmissionInFlightRef.current) return;
    orderSubmissionInFlightRef.current = true;
    try {
      setIsSubmittingOrder(true);
      // createOrder resolves only after the API has returned its saved order; PDF work starts after that confirmation.
      const idempotencyKey = await getOrderSubmissionKey(cartItems);
      const newOrder = await api.createOrder(pendingCustomerInfo, cartItems, idempotencyKey);
      try {
        localStorage.setItem(getCartStorageKey(currentUser), JSON.stringify([]));
      } catch {
        // The server accepted the order; local storage must not block the success screen.
      }
      clearOrderSubmissionKey();
      setCartItems([]);
      setIsPreviewModalOpen(false);
      setConfirmedOrder(newOrder);
      setConfirmedPdfDataUrl(undefined);
      setConfirmedPdfFailed(false);

      await prepareConfirmedOrderPdf(newOrder);
      api.getOrders(currentUser.phone).then(setOrders).catch(() => {});
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur réseau ou serveur lors de la confirmation. Vérifiez « Mes commandes » avant de réessayer.', 'error');
    } finally {
      orderSubmissionInFlightRef.current = false;
      setIsSubmittingOrder(false);
    }
  };

  // Drafts Management Handlers
  const handleLoadDraftToCart = (draft: OrderDraft) => {
    setCartItems(draft.items);
    setInitialDraftCustomerInfo(draft.customerInfo);
    setIsDraftsModalOpen(false);
    setActiveTab('cart');

    const restoreNotif: AppNotification = {
      id: `notif-${Date.now()}-draft-loaded`,
      timestamp: new Date().toISOString(),
      type: 'order_created',
      orderId: draft.id,
      orderReference: draft.name,
      message: `Brouillon « ${draft.name} » chargé dans votre panier avec succès (${draft.itemsCount} article(s)).`,
      targetRole: 'client',
      read: false
    };
    setNotifications(prev => [restoreNotif, ...prev]);
  };

  const handleDirectSubmitDraft = async (draft: OrderDraft) => {
    if (!currentUser || currentUser.role !== 'client') {
      setIsAuthModalOpen(true);
      return;
    }
    if (!draft.customerInfo?.facilityName || !draft.customerInfo?.phone) {
      handleLoadDraftToCart(draft);
      return;
    }
    const completeCustomerInfo: CustomerInfo = {
      facilityName: draft.customerInfo.facilityName || 'Établissement de Santé',
      contactName: draft.customerInfo.contactName || 'Responsable Pharmacie',
      phone: draft.customerInfo.phone,
      deliveryAddress: draft.customerInfo.deliveryAddress || 'Libreville, Gabon',
      neighborhoodId: draft.customerInfo.neighborhoodId,
      neighborhoodName: draft.customerInfo.neighborhoodName,
      deliveryMode: draft.customerInfo.deliveryMode || 'livraison',
      paymentMethod: draft.customerInfo.paymentMethod || 'especes',
      mobilePayment: draft.customerInfo.mobilePayment,
      notes: draft.notes || ''
    };

    if (orderSubmissionInFlightRef.current) return;
    orderSubmissionInFlightRef.current = true;
    setIsSubmittingOrder(true);
    try {
      // Keep the draft until the API confirms persistence, then prepare its PDF.
      const idempotencyKey = await getOrderSubmissionKey(draft.items);
      const newOrder = await api.createOrder(completeCustomerInfo, draft.items, idempotencyKey);
      deleteDraft(draft.id, currentUser?.phone);
      clearOrderSubmissionKey();
      setDraftsCount(getStoredDrafts(currentUser?.phone).length);
      setIsDraftsModalOpen(false);
      setConfirmedOrder(newOrder);
      setConfirmedPdfDataUrl(undefined);
      setConfirmedPdfFailed(false);

      await prepareConfirmedOrderPdf(newOrder);
      api.getOrders(currentUser.phone).then(setOrders).catch(() => {});
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur réseau ou serveur. Le brouillon est conservé; vérifiez « Mes commandes » avant de réessayer.', 'error');
    } finally {
      orderSubmissionInFlightRef.current = false;
      setIsSubmittingOrder(false);
    }
  };

  const handleViewOrderPdf = async (order: Order) => {
    setPreviewPdfOrder({ order, dataUrl: order.pdfUrl });
    try {
      const { dataUrl } = await generateOrderPdf(order);
      setPreviewPdfOrder(curr => curr && curr.order.id === order.id ? { order, dataUrl } : curr);
    } catch (e) {
      console.error('Erreur génération PDF:', e);
    }
  };

  // Admin Actions
  const handleAdminUpdateStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    const updatedOrder = await api.updateOrderStatus(orderId, status, reason);
    setOrders(prev => prev.map(order =>
      order.id === updatedOrder.id || order.reference === updatedOrder.reference
        ? updatedOrder
        : order
    ));

    const canViewAdminStats = currentUser?.role === 'Super-Admin' ||
      currentUser?.role === 'Admin simple' ||
      Boolean(currentUser?.permissions?.includes('stats_view'));
    if (canViewAdminStats) {
      void api.getAdminStats().then(setAdminStats).catch((error) => {
        console.warn('Actualisation des statistiques après changement de commande impossible :', error);
      });
    }
    if (status === 'Annulée') {
      void api.getProducts().then(setProducts).catch((error) => {
        console.warn('Actualisation du stock après annulation impossible :', error);
      });
    }
  };

  const handleAdminUpdatePayment = async (orderId: string, isPaid: boolean) => {
    await api.updateOrderPayment(orderId, isPaid);
    const updated = await api.getOrders();
    setOrders(updated);
  };

  const handleAdminCreatePack = async (packData: Omit<Pack, 'id'>) => {
    await api.createPack(packData);
    const updated = await api.getPacks();
    setPacks(updated);
  };

  const handleAdminUpdatePack = async (id: string, packData: Partial<Pack>) => {
    await api.updatePack(id, packData);
    const updated = await api.getPacks();
    setPacks(updated);
  };

  const handleAdminDeletePack = async (id: string) => {
    await api.deletePack(id);
    const updated = await api.getPacks();
    setPacks(updated);
  };

  const handleAdminToggleStock = async (productId: string, currentStatus: 'disponible' | 'rupture') => {
    const newStatus = currentStatus === 'disponible' ? 'rupture' : 'disponible';
    const updatedProduct = await api.updateProductStatus(productId, newStatus);
    setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
  };

  const handleAdminUpdateProductStock = async (productId: string, quantityAvailable: number, status?: 'disponible' | 'rupture') => {
    const updatedProduct = await api.updateProductStock(productId, quantityAvailable, status);
    setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
  };

  const handleAdminDeleteProduct = async (productId: string) => {
    await api.deleteProduct(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleAdminProductSaved = (savedProduct: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === savedProduct.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = savedProduct;
        return copy;
      } else {
        return [savedProduct, ...prev];
      }
    });
  };

  // Cart counts
  const cartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);
  const cartFixedTotal = cartItems
    .filter(it => !it.isQuote)
    .reduce((sum, it) => sum + it.price * it.quantity, 0);

  // Total promo products count
  const promoProductsCount = useMemo(() => {
    return products.filter(p => 
      p.isPromotion || 
      (p.discountPercentage && p.discountPercentage > 0) || 
      p.variants.some(v => (v.discountPercentage && v.discountPercentage > 0) || (v.originalPrice && v.originalPrice > v.price))
    ).length;
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchQuery.trim()) {
      result = result.filter(p => matchesProductSearch(p, searchQuery));
    }
    if (selectedSpecialty !== 'all') {
      result = result.filter(p => getProductSpecialty(p) === selectedSpecialty);
    }
    if (selectedCategory !== 'Tous les articles') {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (selectedCategory === 'Consommables médicaux' && selectedSubcategory !== 'Toutes les sous-catégories') {
      result = result.filter(p => p.subcategory === selectedSubcategory);
    }
    if (onlySelected) {
      const selectedIds = new Set(cartItems.map(it => it.productId));
      result = result.filter(p => selectedIds.has(p.id));
    }
    if (onlyPromotions || priceRange === 'promotions') {
      result = result.filter(p => 
        p.isPromotion || 
        (p.discountPercentage && p.discountPercentage > 0) || 
        p.variants.some(v => (v.discountPercentage && v.discountPercentage > 0) || (v.originalPrice && v.originalPrice > v.price))
      );
    }
    if (priceRange === 'under10k') {
      result = result.filter(p => p.variants.some(v => v.price > 0 && v.price < 10000));
    } else if (priceRange === '10k-50k') {
      result = result.filter(p => p.variants.some(v => v.price >= 10000 && v.price <= 50000));
    } else if (priceRange === 'over50k') {
      result = result.filter(p => p.variants.some(v => v.price > 50000));
    } else if (priceRange === 'quote') {
      result = result.filter(p => p.variants.some(v => v.price === 0));
    }
    if (sortBy === 'default' && searchQuery.trim()) {
      result = [...result].sort((a, b) => scoreProductSearch(b, searchQuery) - scoreProductSearch(a, searchQuery));
    } else if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0));
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0));
    } else if (sortBy === 'name-asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    return result;
  }, [products, searchQuery, selectedSpecialty, selectedCategory, selectedSubcategory, onlySelected, onlyPromotions, priceRange, sortBy, cartItems]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Lateral Menu / Drawer */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        cartCount={cartCount}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenCreateProduct={() => setIsGlobalProductModalOpen(true)}
        onOpenDraftsModal={() => setIsDraftsModalOpen(true)}
        draftsCount={draftsCount}
      />

      {/* PWA In-App Install Prompt Banner */}
      <PWAInstallBanner />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        cartTotal={cartFixedTotal}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        onOpenDraftsModal={() => setIsDraftsModalOpen(true)}
        draftsCount={draftsCount}
      />

      {/* Main Content Area */}
      <React.Suspense fallback={<div className="mx-auto w-full max-w-7xl px-3 py-12 text-center text-sm font-bold text-slate-500">Chargement de la page…</div>}>
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12">
        {/* VIEW 1: ORDER CONFIRMATION VIEW */}
        {confirmedOrder ? (
          <OrderConfirmationView
            order={confirmedOrder}
            pdfDataUrl={confirmedPdfDataUrl}
            pdfPreparing={isPreparingConfirmedPdf}
            pdfGenerationFailed={confirmedPdfFailed}
            pdfStorageFailed={confirmedPdfStorageFailed}
            onRetryPdf={() => { void prepareConfirmedOrderPdf(confirmedOrder); }}
            onNewOrder={() => {
              clearOrderSubmissionKey();
              setConfirmedOrder(null);
              setConfirmedPdfDataUrl(undefined);
              setConfirmedPdfFailed(false);
              setConfirmedPdfStorageFailed(false);
              setActiveTab('catalog');
            }}
            onViewDashboard={() => {
              clearOrderSubmissionKey();
              setConfirmedOrder(null);
              setConfirmedPdfStorageFailed(false);
              setActiveTab('dashboard');
            }}
          />
        ) : (
          <>
            {/* VIEW: BULK ORDER (SAISIE RAPIDE TAB) */}
            {activeTab === 'bulk-order' && (
              <BulkOrderView
                products={products}
                onAddMultipleToCart={handleAddMultipleToCart}
                onGoToCart={() => setActiveTab('cart')}
              />
            )}

            {/* VIEW 2: PACKS PROMOS TAB */}
            {activeTab === 'packs' && (
              <div className="space-y-4">
                <div className="px-1">
                  <h1 className="text-xl sm:text-2xl font-black text-[#161618] tracking-tight">
                    Packs Médicaux & Campagnes
                  </h1>
                  <p className="text-xs text-[#6a6a6b] mt-0.5">
                    Kits complets d'urgence et de bloc opératoire avec remise immédiate
                  </p>
                </div>
                <PacksSection
                  packs={packs}
                  products={products}
                  onAddPackToCart={handleAddPackToCart}
                />
              </div>
            )}

            {/* VIEW 3: CART VIEW */}
            {activeTab === 'cart' && (
              <CartView
                items={cartItems}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onClearCart={handleClearCart}
                onProceedToPreview={handleProceedToPreview}
                onContinueShopping={() => setActiveTab('catalog')}
                onOpenDraftsModal={() => setIsDraftsModalOpen(true)}
                draftsCount={draftsCount}
                initialCustomerInfo={initialDraftCustomerInfo}
              />
            )}

            {/* VIEW 4: CLIENT DASHBOARD */}
            {activeTab === 'dashboard' && (
              <ClientDashboard
                orders={orders}
                currentUser={currentUser}
                onReorder={handleReorder}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onRefreshOrders={() => api.getOrders(currentUser ? currentUser.phone : undefined).then(setOrders)}
                onViewOrderPdf={handleViewOrderPdf}
                onTrackDelivery={(order: Order) => {
                  setActiveDeliveryOrder(order);
                  setIsDeliveryModalOpen(true);
                }}
              />
            )}

            {/* VIEW 5: COMMERCIAL QUOTES TAB */}
            {activeTab === 'commercial-quotes' && (
              <CommercialQuotesModule
                quotes={quotes}
                assignedClients={clients}
                products={products}
                currentCommercial={currentUser || {
                  id: 'user-commercial-1',
                  phone: '+24166240399',
                  facilityName: 'Équipe Commerciale Libreville',
                  contactName: 'Marc Commercial',
                  role: 'Commercial',
                  createdAt: ''
                }}
                onRefreshQuotes={() => api.getQuotes().then(setQuotes)}
              />
            )}

            {/* VIEW 6: BEST CLIENTS & RELANCES */}
            {activeTab === 'clients-list' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {currentUser?.role === 'Commercial' ? 'Mes Clients Assignés' : 'Gestion des Établissements & Relances'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Suivi de l'activité, détection d'inactivité &gt; 10 jours et préparation d'une relance WhatsApp manuelle.
                  </p>
                </div>
                <BestClientsModule
                  clients={clients}
                  orders={orders}
                  commercials={[]}
                  isSuperAdmin={currentUser?.role === 'Super-Admin'}
                  onRefreshClients={() => api.getClients().then(setClients)}
                  onOpenMessageModal={() => {}}
                  onViewOrderPdf={handleViewOrderPdf}
                />
              </div>
            )}

            {/* VIEW 7: ADMIN DASHBOARD (GUARDED BY ROLE OR GRANULAR PERMISSIONS) */}
            {ADMIN_TABS.includes(activeTab) && (
              currentUser && currentUser.role !== 'client' ? (
                <React.Suspense fallback={<div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Chargement du tableau de bord…</div>}>
                  <AdminDashboard
                    stats={adminStats}
                    orders={orders}
                    packs={packs}
                    products={products}
                    clients={clients}
                    currentUser={currentUser}
                    onUpdateStatus={handleAdminUpdateStatus}
                    onUpdatePayment={handleAdminUpdatePayment}
                    onCreatePack={handleAdminCreatePack}
                    onUpdatePack={handleAdminUpdatePack}
                    onDeletePack={handleAdminDeletePack}
                    onDeleteProduct={handleAdminDeleteProduct}
                    onProductSaved={handleAdminProductSaved}
                    onToggleProductStock={handleAdminToggleStock}
                    onUpdateProductStock={handleAdminUpdateProductStock}
                    onRefresh={() => {
                      api.getProducts().then(setProducts).catch(() => {});
                      if (currentUser.role === 'Super-Admin' || currentUser.role === 'Admin simple' || currentUser.permissions?.includes('stats_view')) {
                        api.getAdminStats().then(setAdminStats).catch(() => {});
                      }
                      if (currentUser.role === 'Super-Admin' || currentUser.role === 'Admin simple' || currentUser.permissions?.includes('clients_manage')) {
                        api.getClients().then(setClients).catch(() => {});
                      }
                      api.getOrders().then(setOrders).catch(() => {});
                    }}
                    defaultSubTab={
                      activeTab === 'admin-catalog'
                        ? 'stock'
                        : activeTab === 'admin-orders'
                          ? 'orders'
                          : activeTab === 'admin-deploy'
                            ? 'export-deploy'
                          : activeTab === 'admin-staff'
                            ? 'staff'
                            : 'kpi'
                    }
                    notifications={notifications}
                    onViewOrderPdf={handleViewOrderPdf}
                    onOpenDeliveryModal={(order: Order) => {
                      setActiveDeliveryOrder(order);
                      setIsDeliveryModalOpen(true);
                    }}
                  />
                </React.Suspense>
              ) : (
                <RestrictedAccessView
                  requestedTab={activeTab}
                  currentUser={currentUser}
                  onOpenAuth={() => {
                    setAuthInitialMode('admin');
                    setIsAuthModalOpen(true);
                  }}
                  onReturnToCatalog={() => {
                    setActiveTab('catalog');
                    try {
                      window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    } catch {}
                  }}
                />
              )
            )}

            {/* VIEW 8: CATALOGUE VIEW (DEFAULT) */}
            {activeTab === 'catalog' && (
              <div className="space-y-6">
                {/* Hero Banner (CleanShot X Minimalist Editorial) */}
                <div className="py-2 sm:py-6 px-1">
                  <div className="max-w-2xl">
                    <span className="text-[10px] font-bold text-[#0d44e8] uppercase tracking-wider block mb-1">
                      Fournisseur de matériel médical · Libreville
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-[#000000] tracking-tight leading-tight">
                      Le matériel médical, <br className="hidden sm:inline" />
                      commandé <span className="text-[#0d44e8]">simplement.</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6a6a6b] mt-2 leading-relaxed">
                      Consommables, équipements et réactifs pour cliniques, pharmacies et laboratoires. Bon de commande PDF et message WhatsApp préparé pour envoi.
                    </p>
                  </div>
                </div>

                {/* Promotional Packs Carousel */}
                <PacksSection
                  packs={packs}
                  products={products}
                  onAddPackToCart={handleAddPackToCart}
                />

                {/* Search & Categories Bar (Sticky below header if desired) */}
                <div id="catalogue" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-base sm:text-lg font-bold text-[#161618]">
                      Catalogue ({filteredProducts.length} articles)
                    </h2>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-[#0d44e8] font-bold hover:underline"
                      >
                        Effacer la recherche
                      </button>
                    )}
                  </div>

                  {/* Search Input (Clean 14px border radius) */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Rechercher : seringue, gants, test paludisme..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50/60 focus:bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0d44e8] transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Medical Specialty Selector for Clinics and Hospitals */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0d44e8]" />
                        Spécialités & Services Hospitaliers :
                      </span>
                      {selectedSpecialty !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedSpecialty('all')}
                          className="text-[#0d44e8] font-bold hover:underline cursor-pointer"
                        >
                          Toutes les spécialités
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {MEDICAL_SPECIALTIES.map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setSelectedSpecialty(spec.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            selectedSpecialty === spec.id
                              ? 'bg-[#0d44e8] text-white shadow-xs font-bold'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {spec.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Horizontal Categories Carousel (No Pill Cliché) */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedSubcategory('Toutes les sous-catégories');
                        }}
                        className={`px-3 py-1.5 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#0f0f12] text-white shadow-2xs font-bold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Subcategories (if Consommables) */}
                  {selectedCategory === 'Consommables médicaux' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                      <span className="text-slate-400 font-bold uppercase shrink-0">Sous-catégorie :</span>
                      {CONSUMABLE_SUBCATEGORIES.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                            selectedSubcategory === sub
                              ? 'bg-[#eef3ff] text-[#0d44e8] font-bold border border-blue-200'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Secondary Filters Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setOnlySelected(!onlySelected)}
                        className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          onlySelected
                            ? 'bg-[#0d44e8] text-white font-bold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Ma sélection ({cartItems.length})</span>
                      </button>

                      {/* PROMOTIONS FAST ACCESS BUTTON (Positioned right next to Ma sélection as requested) */}
                      <button
                        type="button"
                        onClick={() => setOnlyPromotions(!onlyPromotions)}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          onlyPromotions
                            ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white ring-2 ring-rose-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>Promotions ({promoProductsCount})</span>
                      </button>

                      <select
                        value={priceRange}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setPriceRange(val);
                          if (val === 'promotions') {
                            setOnlyPromotions(true);
                          }
                        }}
                        className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
                      >
                        <option value="all">Tous les prix</option>
                        <option value="promotions">🔥 Promotions uniquement</option>
                        <option value="under10k">&lt; 10 000 FCFA</option>
                        <option value="10k-50k">10 000 - 50 000 FCFA</option>
                        <option value="over50k">&gt; 50 000 FCFA</option>
                        <option value="quote">Sur devis</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
                      >
                        <option value="default">Tri par défaut</option>
                        <option value="price-asc">Prix croissant</option>
                        <option value="price-desc">Prix décroissant</option>
                        <option value="name-asc">Nom (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Product Grid: 2 COLUMNS ON MOBILE (grid-cols-2) and 3/4 COLUMNS ON DESKTOP */}
                {filteredProducts.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center max-w-sm mx-auto">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Aucun article trouvé</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Modifiez votre recherche ou sélectionnez une autre catégorie.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('Tous les articles');
                        setSelectedSubcategory('Toutes les sous-catégories');
                        setOnlySelected(false);
                        setPriceRange('all');
                      }}
                      className="mt-3 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-50"
                    >
                      Réinitialiser
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {filteredProducts.map((prod) => {
                      const cartItem = cartItems.find(it => it.productId === prod.id);
                      return (
                        <ProductCard
                          key={prod.id}
                          product={prod}
                          onAddToCart={handleAddToCart}
                          isInCart={Boolean(cartItem)}
                          cartQuantity={cartItem?.quantity || 0}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      </React.Suspense>

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED 5 TABS) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        draftsCount={draftsCount}
      />

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authInitialMode}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthInitialMode('guest_choice');
        }}
        onSuccess={handleAuthSuccess}
      />

      {isPreviewModalOpen && pendingCustomerInfo && (
        <OrderPreviewModal
          items={cartItems}
          customer={pendingCustomerInfo}
          onConfirm={handleConfirmAndSubmitOrder}
          onBackToEdit={() => setIsPreviewModalOpen(false)}
          isSubmitting={isSubmittingOrder}
        />
      )}

      {/* Offline Order Drafts Manager Modal */}
      <DraftsManagerModal
        isOpen={isDraftsModalOpen}
        onClose={() => {
          setIsDraftsModalOpen(false);
          setDraftsCount(getStoredDrafts(currentUser?.phone).length);
        }}
        currentUser={currentUser}
        currentCartItems={cartItems}
        currentCustomerInfo={initialDraftCustomerInfo || (currentUser ? {
          facilityName: currentUser.facilityName,
          contactName: currentUser.contactName,
          phone: currentUser.phone,
          deliveryAddress: currentUser.deliveryAddress
        } : undefined)}
        onLoadDraftToCart={handleLoadDraftToCart}
        onDirectSubmitDraft={handleDirectSubmitDraft}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        pushStatus={currentUser ? pushStatus : 'signed-out'}
        pushError={pushError}
        onEnablePush={async () => {
          if (!currentUser) return;
          setPushStatus('loading');
          setPushError(null);
          try {
            const subscription = await createPushSubscription();
            await api.registerPushSubscription(subscription);
            setPushStatus('enabled');
          } catch (error) {
            const capability = getPushSupportStatus();
            setPushStatus(capability === 'permission-denied' ? capability : 'error');
            setPushError(error instanceof Error ? error.message : 'Impossible d’activer les notifications push.');
          }
        }}
        onDisablePush={async () => {
          setPushStatus('loading');
          setPushError(null);
          try {
            const subscription = await getExistingPushSubscription();
            if (subscription) {
              try {
                await api.removePushSubscription(subscription.endpoint);
              } finally {
                await subscription.unsubscribe();
              }
            }
            setPushStatus(getPushSupportStatus());
          } catch (error) {
            setPushStatus('error');
            setPushError(error instanceof Error ? error.message : 'Impossible de désactiver les notifications push.');
          }
        }}
        onMarkAllAsRead={() => {
          const unreadIds = notifications.filter(notification => !notification.read).map(notification => notification.id);
          if (unreadIds.length === 0 || !currentUser) return;
          void api.markNotificationsRead(unreadIds)
            .then(() => setNotifications(prev => prev.map(notification => ({ ...notification, read: true }))))
            .catch(() => {});
        }}
        onSelectNotificationAction={(n) => {
          setIsNotificationModalOpen(false);
          if (n.type === 'promotion') {
            setActiveTab('catalog');
            setOnlyPromotions(true);
          } else if (n.type === 'order_created' || n.type === 'status_changed') {
            if (currentUser?.role === 'Super-Admin' || currentUser?.role === 'Admin simple' || currentUser?.role === 'Logistique') {
              setActiveTab('admin-orders');
            } else {
              setActiveTab('dashboard');
            }
          } else if (n.type === 'password_recovery' && currentUser?.role === 'Super-Admin') {
            setActiveTab('clients-list');
          }
        }}
      />

      <ProductFormModal
        isOpen={isGlobalProductModalOpen}
        onClose={() => setIsGlobalProductModalOpen(false)}
        onSuccess={handleAdminProductSaved}
      />

      {/* Interactive Delivery Tracking Modal */}
      {isDeliveryModalOpen && activeDeliveryOrder && (
        <DeliveryTrackingModal
          isOpen={isDeliveryModalOpen}
          order={activeDeliveryOrder}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setActiveDeliveryOrder(null);
          }}
          onUpdateStage={handleUpdateDeliveryStage}
          isAdmin={Boolean(currentUser && (currentUser.role === 'Super-Admin' || currentUser.role === 'Admin simple' || currentUser.role === 'Logistique'))}
        />
      )}

      {/* Offline Connectivity Status Indicator */}
      <OfflineIndicator />

      {/* In-App Order PDF Viewer Modal */}
      {previewPdfOrder && (
        <OrderPdfDocumentModal
          order={previewPdfOrder.order}
          pdfDataUrl={previewPdfOrder.dataUrl}
          onClose={() => setPreviewPdfOrder(null)}
        />
      )}

      {/* Toast Notification Banner */}
      {toastBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2">
          <div className={`p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md border ${
            toastBanner.type === 'error'
              ? 'bg-rose-900/95 text-white border-rose-700/50'
              : toastBanner.type === 'success'
              ? 'bg-emerald-900/95 text-white border-emerald-700/50'
              : 'bg-slate-900/95 text-white border-slate-700/50'
          }`}>
            <span className="flex-1">{toastBanner.message}</span>
            <button
              onClick={() => setToastBanner(null)}
              className="text-white/80 hover:text-white px-2 py-1 rounded-md text-xs font-bold cursor-pointer"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
