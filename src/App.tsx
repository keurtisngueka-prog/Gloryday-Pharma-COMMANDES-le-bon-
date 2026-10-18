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
  User, 
  AppNotification, 
  AdminStats, 
  OrderStatus,
  CommercialQuote,
  AppRole,
  DeliveryStage
} from './types';
import { api, setStoredToken, getStoredCustomerInfo } from './api';
import { matchesProductSearch } from './utils/search';
import { generateOrderPdf } from './utils/pdfGenerator';
import { CATEGORIES, CONSUMABLE_SUBCATEGORIES, MEDICAL_SPECIALTIES } from './data/initialProducts';
import { getProductSpecialty } from './utils/specialties';

// Components
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppSidebar } from './components/AppSidebar';
import { AuthModal } from './components/AuthModal';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PacksSection } from './components/PacksSection';
import { CartView } from './components/CartView';
import { BulkOrderView } from './components/BulkOrderView';
import { DeliveryTrackingModal } from './components/DeliveryTrackingModal';
import { OrderPreviewModal } from './components/OrderPreviewModal';
import { OrderConfirmationView } from './components/OrderConfirmationView';
import { ClientDashboard } from './components/ClientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { CommercialQuotesModule } from './components/CommercialQuotesModule';
import { BestClientsModule } from './components/BestClientsModule';
import { NotificationModal } from './components/NotificationModal';
import { ProductFormModal } from './components/ProductFormModal';
import { PWAInstallBanner, OfflineIndicator } from './components/PWAInstallBanner';
import { RestrictedAccessView } from './components/RestrictedAccessView';

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
  | 'admin-deploy';

export const ADMIN_TABS: AppTab[] = [
  'admin',
  'admin-orders',
  'admin-catalog',
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('gloryday_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem('gloryday_current_user', JSON.stringify(currentUser));
      } catch {}
    }
  }, [currentUser]);

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

  // Transient Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Keep references fresh for synchronous beforeunload/pagehide handlers
  const cartItemsRef = useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Standard reactive save to localStorage
  useEffect(() => {
    try {
      const key = getCartStorageKey(currentUser);
      localStorage.setItem(key, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart', e);
    }
  }, [cartItems, currentUser]);

  // Guaranteed synchronous auto-save on browser close, tab close, reload, or app switch
  useEffect(() => {
    const handleSyncCartToStorage = () => {
      try {
        const key = getCartStorageKey(currentUserRef.current);
        localStorage.setItem(key, JSON.stringify(cartItemsRef.current));
      } catch (err) {
        console.error('Auto-save cart on browser close error:', err);
      }
    };

    window.addEventListener('beforeunload', handleSyncCartToStorage);
    window.addEventListener('pagehide', handleSyncCartToStorage);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSyncCartToStorage();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleSyncCartToStorage);
      window.removeEventListener('pagehide', handleSyncCartToStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [confirmedPdfDataUrl, setConfirmedPdfDataUrl] = useState<string | undefined>(undefined);
  const [activeDeliveryOrder, setActiveDeliveryOrder] = useState<Order | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [pendingCustomerInfo, setPendingCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

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

  // Notifications (Initialized with automated event notifications)
  const [notifications, setNotifications] = useState<AppNotification[]>(() => [
    {
      id: 'notif-promo-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      type: 'promotion',
      message: '🔥 Offre Spéciale : -25% sur les Gants d\'examen Latex et -20% sur les Seringues 2ml 3 pièces en stock !',
      discountBadge: '-25%',
      targetRole: 'all',
      read: false
    },
    {
      id: 'notif-promo-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      type: 'promotion',
      message: '🏷️ Réduction immédiate : -15% sur les Tests rapides TDR Paludisme et Cathéters courts (Cathlon).',
      discountBadge: '-15%',
      targetRole: 'all',
      read: false
    },
    {
      id: 'notif-status-demo',
      timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      type: 'status_changed',
      orderReference: 'GP-2026-0042',
      message: 'Votre commande GP-2026-0042 a été validée par le service logistique. Livraison programmée ce jour à Libreville.',
      targetRole: 'client',
      read: true
    }
  ]);
  const lastEventTimestamp = useRef<number>(Date.now() - 60000);

  // Initial Data Load
  const loadInitialData = async () => {
    try {
      const [prodsData, packsData, authData] = await Promise.all([
        api.getProducts(),
        api.getPacks(),
        api.getCurrentUser()
      ]);
      setProducts(prodsData);
      setPacks(packsData);

      if (authData) {
        setCurrentUser(authData.user);
        setCartItems(loadCartForUser(authData.user));
        const userOrders = await api.getOrders(authData.user.phone);
        setOrders(userOrders);
        if (authData.role === 'Super-Admin') {
          api.getAdminStats().then(setAdminStats).catch(() => {});
        }
        if (authData.role !== 'client') {
          api.getClients().then(setClients).catch(() => {});
          api.getQuotes().then(setQuotes).catch(() => {});
        }
      } else {
        const guestOrders = await api.getOrders();
        setOrders(guestOrders);
      }
    } catch (err) {
      console.error('Initialization error', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Notifications 20s Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const events = await api.getEvents(lastEventTimestamp.current);
        if (events && events.length > 0) {
          lastEventTimestamp.current = Date.now();
          setNotifications(prev => [...events, ...prev]);
          if (currentUser?.role === 'Super-Admin') {
            api.getAdminStats().then(setAdminStats).catch(() => {});
          }
          api.getOrders(currentUser ? currentUser.phone : undefined).then(setOrders).catch(() => {});
        }
      } catch (e) {
        // quiet polling failure
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Auth Handlers
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // Load isolated cart belonging strictly to this user
    const userCart = loadCartForUser(user);
    setCartItems(userCart);

    if (user.role === 'Super-Admin') {
      if (!ADMIN_TABS.includes(activeTab)) {
        setActiveTab('admin');
      }
      api.getAdminStats().then(setAdminStats).catch(() => {});
      api.getOrders().then(setOrders).catch(() => {});
      api.getClients().then(setClients).catch(() => {});
      api.getQuotes().then(setQuotes).catch(() => {});
    } else if (user.role === 'Commercial') {
      setActiveTab('commercial-quotes');
      api.getQuotes().then(setQuotes).catch(() => {});
      api.getClients().then(setClients).catch(() => {});
    } else {
      setActiveTab('dashboard');
      api.getOrders(user.phone).then(setOrders).catch(() => {});
    }
  };

  const handleLogout = () => {
    // Persist current cart for this user before logging out
    if (currentUser) {
      try {
        localStorage.setItem(getCartStorageKey(currentUser), JSON.stringify(cartItems));
      } catch {}
    }
    setStoredToken(null);
    localStorage.removeItem('gloryday_current_user');
    setCurrentUser(null);
    // Reset active cart for the next guest visitor as confirmed by user
    setCartItems([]);
    try {
      localStorage.removeItem('gloryday_cart_guest');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {}
    setActiveTab('catalog');
    api.getOrders().then(setOrders).catch(() => {});
  };

  const handleDemoSwitchRole = async (targetRole: AppRole) => {
    try {
      if (currentUser) {
        try {
          localStorage.setItem(getCartStorageKey(currentUser), JSON.stringify(cartItems));
        } catch {}
      }

      if (targetRole === 'client') {
        const res = await api.login('+24177001122', 'client123');
        setCurrentUser(res.user);
        setCartItems(loadCartForUser(res.user));
        loadInitialData();
        setActiveTab('catalog');
      } else {
        const res = await api.adminLogin('gloryday-admin-2026', targetRole);
        setCurrentUser(res.user);
        setCartItems(loadCartForUser(res.user));
        api.getClients().then(setClients).catch(console.warn);
        api.getQuotes().then(setQuotes).catch(console.warn);
        api.getAdminStats().then(setAdminStats).catch(console.warn);
        if (targetRole === 'Super-Admin') {
          setActiveTab('admin');
        } else if (targetRole === 'Commercial') {
          setActiveTab('commercial-quotes');
        } else {
          setActiveTab('catalog');
        }
      }
    } catch (e) {
      console.error('Error switching role', e);
    }
  };

  // Cart Operations
  const handleAddToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    if (product.status === 'rupture') return;
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        it => it.productId === product.id && it.variant === variant.label
      );
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity = Math.min(9999, copy[existingIndex].quantity + quantity);
        return copy;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          category: product.category,
          variant: variant.label,
          price: variant.price,
          quantity: Math.min(9999, Math.max(1, quantity)),
          isQuote: variant.price === 0
        };
        return [...prev, newItem];
      }
    });
  };

  const handleAddPackToCart = (pack: Pack) => {
    pack.items.forEach(item => {
      const foundProduct = products.find(p => p.name === item.productName) || products[0];
      const foundVariant = foundProduct?.variants.find(v => v.label === item.variant) || foundProduct?.variants[0];
      if (foundProduct && foundVariant && foundProduct.status !== 'rupture') {
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
      copy[index].quantity = Math.min(9999, quantity);
      return copy;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
    try {
      const key = getCartStorageKey(currentUser);
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.removeItem('gloryday_guest_customer_info');
    } catch {}
    setToastMessage('Panier vidé');
  };

  // Clicking on the brand logo resets the cart to 0 and navigates back to home/catalog
  const handleLogoClick = () => {
    setCartItems([]);
    try {
      const key = getCartStorageKey(currentUser);
      localStorage.setItem(key, JSON.stringify([]));
      localStorage.removeItem('gloryday_guest_customer_info');
    } catch (e) {
      console.error('Error resetting cart on logo click:', e);
    }

    // Dismiss any modal or confirmation flow
    setIsPreviewModalOpen(false);
    if (confirmedOrder) {
      setConfirmedOrder(null);
      setConfirmedPdfDataUrl(undefined);
    }

    // Navigate back to primary view
    if (currentUser?.role === 'Super-Admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('catalog');
    }

    setToastMessage('Panier réinitialisé à 0 article');
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
          copy.push({
            productId: product.id,
            productName: product.name,
            category: product.category,
            variant: variant.label,
            price: variant.price,
            quantity: Math.min(9999, Math.max(1, quantity)),
            isQuote: variant.price === 0
          });
        }
      });
      return copy;
    });
  };

  const handleUpdateDeliveryStage = async (orderId: string, stage: DeliveryStage) => {
    try {
      const updated = await api.updateOrderDeliveryStage(orderId, stage);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (activeDeliveryOrder?.id === orderId) {
        setActiveDeliveryOrder(updated);
      }
      if (stage === 'delivered') {
        const notif: AppNotification = {
          id: `notif-deliv-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'status_changed',
          orderId,
          orderReference: updated.reference,
          message: `🎉 Commande ${updated.reference} livrée avec succès à ${updated.customer.facilityName} !`,
          targetRole: 'all',
          read: false
        };
        setNotifications(prev => [notif, ...prev]);
      }
    } catch (e) {
      console.error('Failed to update delivery stage', e);
    }
  };

  const handleReorder = (order: Order) => {
    const newCartItems: CartItem[] = [];
    order.items.forEach(it => {
      const currentProd = products.find(p => p.id === it.productId || p.name === it.productName);
      if (currentProd && currentProd.status !== 'rupture') {
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

  const handleAddCartItemDirectly = (item: CartItem) => {
    const currentProd = products.find(p => p.id === item.productId || p.name === item.productName);
    if (currentProd && currentProd.status === 'rupture') {
      setToastMessage(`Article en rupture : ${item.productName}`);
      return;
    }
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        it => it.productId === item.productId && it.variant === item.variant
      );
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity = Math.min(9999, copy[existingIndex].quantity + (item.quantity || 1));
        return copy;
      } else {
        return [...prev, { ...item, quantity: item.quantity || 1 }];
      }
    });
    setToastMessage(`Article réapprovisionné au panier : ${item.productName}`);
  };

  // Order Submission
  const handleProceedToPreview = (customerInfo: CustomerInfo) => {
    setPendingCustomerInfo(customerInfo);
    setIsPreviewModalOpen(true);
  };

  const handleConfirmAndSubmitOrder = async () => {
    if (!pendingCustomerInfo || cartItems.length === 0) return;
    try {
      setIsSubmittingOrder(true);
      const newOrder = await api.createOrder(pendingCustomerInfo, cartItems);
      const { dataUrl } = await generateOrderPdf(newOrder);
      setConfirmedPdfDataUrl(dataUrl);
      api.uploadOrderPdf(newOrder.reference, dataUrl).then(url => {
        newOrder.pdfUrl = url;
      }).catch(() => {});
      setCartItems([]);
      setIsPreviewModalOpen(false);
      setConfirmedOrder(newOrder);

      // Automated notifications dispatch (Client confirmation & Staff alert)
      const clientConfirmationNotif: AppNotification = {
        id: `notif-${Date.now()}-client`,
        timestamp: new Date().toISOString(),
        type: 'order_created',
        orderId: newOrder.id,
        orderReference: newOrder.reference,
        message: `Votre commande ${newOrder.reference} d'un montant de ${newOrder.estimatedTotal.toLocaleString('fr-FR')} FCFA a été validée avec succès. Notre service logistique prépare votre colis.`,
        targetRole: 'client',
        read: false
      };
      const adminOrderAlertNotif: AppNotification = {
        id: `notif-${Date.now()}-admin`,
        timestamp: new Date().toISOString(),
        type: 'order_created',
        orderId: newOrder.id,
        orderReference: newOrder.reference,
        message: `Nouvelle commande médicale : ${newOrder.reference} (${pendingCustomerInfo.facilityName}) - ${newOrder.estimatedTotal.toLocaleString('fr-FR')} FCFA.`,
        targetRole: 'Super-Admin',
        read: false
      };
      setNotifications(prev => [clientConfirmationNotif, adminOrderAlertNotif, ...prev]);

      api.getOrders(currentUser ? currentUser.phone : pendingCustomerInfo.phone).then(setOrders).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la confirmation.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleViewOrderPdf = async (order: Order) => {
    try {
      const { dataUrl } = await generateOrderPdf(order);
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    } catch (e) {
      alert('Impossible d afficher le PDF.');
    }
  };

  // Admin Actions
  const handleAdminUpdateStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    await api.updateOrderStatus(orderId, status, reason);
    const updated = await api.getOrders();
    setOrders(updated);
    const stats = await api.getAdminStats();
    setAdminStats(stats);

    // Automated client notification on order status change
    const targetOrder = updated.find(o => o.id === orderId);
    const refStr = targetOrder?.reference || orderId;
    const statusChangeNotif: AppNotification = {
      id: `notif-${Date.now()}-status`,
      timestamp: new Date().toISOString(),
      type: 'status_changed',
      orderId,
      orderReference: refStr,
      message: `Mise à jour commande ${refStr} : Statut passé à « ${status} ».${reason ? ` (Motif : ${reason})` : ''}`,
      targetRole: 'all',
      read: false
    };
    setNotifications(prev => [statusChangeNotif, ...prev]);
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
    await api.updateProductStatus(productId, newStatus);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
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
    if (sortBy === 'price-asc') {
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
        onSwitchRole={handleDemoSwitchRole}
        onOpenCreateProduct={() => setIsGlobalProductModalOpen(true)}
        onLogoClick={handleLogoClick}
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
        onLogoClick={handleLogoClick}
      />

      {/* Toast Notification Banner (Feedback for Cart Reset & Actions) */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-250 pointer-events-none"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-slate-700/80 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping"></span>
            <span>{toastMessage}</span>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12">
        {/* VIEW 1: ORDER CONFIRMATION VIEW */}
        {confirmedOrder ? (
          <OrderConfirmationView
            order={confirmedOrder}
            pdfDataUrl={confirmedPdfDataUrl}
            onNewOrder={() => {
              setConfirmedOrder(null);
              setConfirmedPdfDataUrl(undefined);
              setActiveTab('catalog');
            }}
            onViewDashboard={() => {
              setConfirmedOrder(null);
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
                onAddToCartItem={handleAddCartItemDirectly}
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
                    Suivi de l'activité, détection d'inactivité &gt; 10 jours et relance WhatsApp immédiate.
                  </p>
                </div>
                <BestClientsModule
                  clients={clients}
                  commercials={[]}
                  isSuperAdmin={currentUser?.role === 'Super-Admin'}
                  onRefreshClients={() => api.getClients().then(setClients)}
                  onOpenMessageModal={() => {}}
                />
              </div>
            )}

            {/* VIEW 7: ADMIN DASHBOARD (STRICTLY GUARDED FOR SUPER-ADMIN) */}
            {ADMIN_TABS.includes(activeTab) && (
              currentUser?.role === 'Super-Admin' ? (
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
                  onRefresh={() => {
                    api.getAdminStats().then(setAdminStats);
                    api.getOrders().then(setOrders);
                    api.getClients().then(setClients);
                  }}
                  defaultSubTab={
                    activeTab === 'admin-catalog'
                      ? 'stock'
                      : activeTab === 'admin-orders'
                        ? 'orders'
                        : activeTab === 'admin-deploy'
                          ? 'export-deploy'
                          : 'kpi'
                  }
                  onOpenDeliveryModal={(order: Order) => {
                    setActiveDeliveryOrder(order);
                    setIsDeliveryModalOpen(true);
                  }}
                />
              ) : (
                <RestrictedAccessView
                  requestedTab={activeTab}
                  currentUser={currentUser}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
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
                      Fournisseur médical certifié · Libreville
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-[#000000] tracking-tight leading-tight">
                      Le matériel médical, <br className="hidden sm:inline" />
                      commandé <span className="text-[#0d44e8]">simplement.</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6a6a6b] mt-2 leading-relaxed">
                      Consommables, équipements et réactifs pour cliniques, pharmacies et laboratoires. Bon de commande PDF et transmission immédiate sur WhatsApp.
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

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED 5 TABS) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}
        onSelectNotificationAction={(n) => {
          setIsNotificationModalOpen(false);
          if (n.type === 'promotion') {
            setActiveTab('catalog');
            setOnlyPromotions(true);
          } else if (n.type === 'order_created' || n.type === 'status_changed') {
            if (currentUser?.role === 'Super-Admin' || currentUser?.role === 'Logistique') {
              setActiveTab('admin-orders');
            } else {
              setActiveTab('dashboard');
            }
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
          isAdmin={Boolean(currentUser && currentUser.role !== 'client')}
        />
      )}

      {/* Offline Connectivity Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
