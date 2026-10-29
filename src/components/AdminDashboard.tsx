import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Package, 
  Truck, 
  Users, 
  Plus, 
  Search, 
  AlertTriangle,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Download,
  Database,
  Smartphone,
  CreditCard,
  Zap,
  Filter,
  Clock,
  Layers,
  MapPin,
  Calendar,
  Check,
  Settings,
  Megaphone,
  Activity,
  FileText,
  Receipt,
  RefreshCw,
  ArrowUpRight,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import { Order, OrderStatus, AdminStats, Pack, Product, User, AppRole, DeliveryStage, AppNotification, VolumeDiscountSettings, StaffPermission } from '../types';
import { api } from '../api';
import { getActiveVolumeDiscountSettings, setActiveVolumeDiscountSettings } from '../utils/volumeDiscount';
import { ProductFormModal } from './ProductFormModal';
import { BestClientsModule } from './BestClientsModule';
import { DirectMessagingModal } from './DirectMessagingModal';
import { ClientAnnouncementModal } from './ClientAnnouncementModal';
import { AdminPacksModule } from './AdminPacksModule';
import { ClientPurchasesStatsModule } from './ClientPurchasesStatsModule';
import { ClientPurchaseHistoryView } from './ClientPurchaseHistoryView';
const DataExportModule = React.lazy(() => import('./DataExportModule').then(module => ({ default: module.DataExportModule })));
import { AuditLogModule } from './AuditLogModule';
import { StockLotsModule } from './StockLotsModule';
import { SystemSettingsModule } from './SystemSettingsModule';
import { StaffAccountsModule } from './StaffAccountsModule';
import { StaffLogsRealtimeModule } from './StaffLogsRealtimeModule';
const SalesMonthlyChart = React.lazy(() => import('./SalesMonthlyChart').then(module => ({ default: module.SalesMonthlyChart })));
import { generateWhatsAppMessageForStage } from '../utils/whatsappNotifications';
import type { CatalogImportPreviewResult } from '../utils/dataExport';
import { CatalogExcelImportModal } from './CatalogExcelImportModal';

const hasValidOrderCoordinates = (order: Order): boolean => {
  const coordinates = order.customer.coordinates;
  return Boolean(coordinates && Number.isFinite(coordinates.lat) && coordinates.lat >= -90 && coordinates.lat <= 90 &&
    Number.isFinite(coordinates.lng) && coordinates.lng >= -180 && coordinates.lng <= 180);
};

const hasConfirmedOrderGps = (order: Order): boolean =>
  hasValidOrderCoordinates(order) && order.customer.coordinates?.source === 'checkout';

export type AdminSubTab = 'kpi' | 'orders' | 'packs' | 'stock' | 'lots' | 'clients' | 'stats-achats' | 'logs' | 'audit' | 'settings' | 'staff' | 'export-deploy';

interface AdminDashboardProps {
  stats: AdminStats | null;
  orders: Order[];
  packs: Pack[];
  products: Product[];
  clients: any[];
  currentUser: User;
  notifications?: AppNotification[];
  onUpdateStatus: (orderId: string, status: OrderStatus, reason?: string) => Promise<void>;
  onUpdatePayment: (orderId: string, isPaid: boolean) => Promise<void>;
  onCreatePack: (pack: Omit<Pack, 'id'>) => Promise<void>;
  onUpdatePack: (id: string, pack: Partial<Pack>) => Promise<void>;
  onDeletePack: (id: string) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onProductSaved: (product: Product) => void;
  onToggleProductStock: (productId: string, currentStatus: 'disponible' | 'rupture') => Promise<void>;
  onUpdateProductStock?: (productId: string, quantityAvailable: number, status?: 'disponible' | 'rupture') => Promise<void>;
  onRefresh: () => void;
  defaultSubTab?: AdminSubTab;
  onOpenDeliveryModal?: (order: Order) => void;
  onOpenFinanceModal?: (order: Order) => void;
  onViewOrderPdf?: (order: Order) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  orders,
  packs,
  products,
  clients,
  currentUser,
  notifications = [],
  onUpdateStatus,
  onUpdatePayment,
  onCreatePack,
  onUpdatePack,
  onDeletePack,
  onDeleteProduct,
  onProductSaved,
  onToggleProductStock,
  onUpdateProductStock,
  onRefresh,
  defaultSubTab = 'kpi',
  onOpenDeliveryModal,
  onOpenFinanceModal,
  onViewOrderPdf
}) => {
  const role: AppRole = currentUser.role;
  const isSuperAdmin = role === 'Super-Admin';
  const hasPerm = (perm: StaffPermission) => isSuperAdmin || Boolean(currentUser.permissions?.includes(perm));
  const isSimpleAdmin = role === 'Admin simple' || hasPerm('stats_view');
  const canManageFinance = isSuperAdmin || role === 'Admin simple' || hasPerm('orders_manage');
  const isCommercial = role === 'Commercial' || hasPerm('orders_manage') || hasPerm('quotes_manage');
  const isGestionnaire = role === 'Gestionnaire Catalogue' || isSuperAdmin || hasPerm('catalog_stock');
  const isLogistique = role === 'Logistique' || isSuperAdmin || isSimpleAdmin || hasPerm('logistics_manage') || hasPerm('orders_view') || hasPerm('orders_manage');
  const canManageClients = isSuperAdmin || hasPerm('clients_manage');
  const canManageSettings = isSuperAdmin || hasPerm('settings_manage');

  const [activeTab, setActiveTab] = useState<AdminSubTab>(defaultSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'to_confirm' | 'confirmed' | 'preparation' | 'delivered' | 'cancelled'>('all');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelOrderError, setCancelOrderError] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [targetMessageClient, setTargetMessageClient] = useState<any | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedHistoryClientId, setSelectedHistoryClientId] = useState<string | null>(null);
  const [clientsModuleView, setClientsModuleView] = useState<'directory' | 'purchase-history'>('directory');
  const [clientDirectorySearch, setClientDirectorySearch] = useState('');
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  // Volume discount settings state
  const [discountSettings, setDiscountSettings] = useState<VolumeDiscountSettings>(() => getActiveVolumeDiscountSettings());
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [discountSavedMsg, setDiscountSavedMsg] = useState('');

  // Inline stock draft quantities per product
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);
  const [lastSavedStockId, setLastSavedStockId] = useState<string | null>(null);
  const [excelImportPreview, setExcelImportPreview] = useState<CatalogImportPreviewResult | null>(null);
  const [excelImportFeedback, setExcelImportFeedback] = useState<string | null>(null);

  const handleExcelFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setExcelImportFeedback('Le fichier doit peser au maximum 5 Mo.');
      return;
    }
    const { parseCatalogSpreadsheet } = await import('../utils/dataExport');
    const preview = await parseCatalogSpreadsheet(file, products);
    if (!preview.success) {
      setExcelImportFeedback(preview.message);
      return;
    }
    setExcelImportFeedback(null);
    setExcelImportPreview(preview);
  };

  const handleProductExport = async (format: 'xlsx' | 'csv') => {
    try {
      const exports = await import('../utils/dataExport');
      if (format === 'xlsx') await exports.downloadProductsXLSX(displayedProducts);
      else exports.downloadProductsCSV(displayedProducts);
    } catch {
      setExcelImportFeedback('L’export n’a pas pu être préparé. Réessayez dans un instant.');
    }
  };

  useEffect(() => {
    setActiveTab(defaultSubTab);
  }, [defaultSubTab]);

  useEffect(() => {
    // Remove a legacy GitHub token left by older dashboard builds.
    try { sessionStorage.removeItem('gloryday_gh_pat'); } catch {}
  }, []);

  useEffect(() => {
    api.getVolumeDiscountSettings()
      .then((s) => {
        setActiveVolumeDiscountSettings(s);
        setDiscountSettings(s);
      })
      .catch(() => {});
  }, []);

  const handleSaveVolumeDiscounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDiscounts(true);
    setDiscountSavedMsg('');
    try {
      const updated = await api.updateVolumeDiscountSettings(discountSettings);
      setActiveVolumeDiscountSettings(updated);
      setDiscountSettings(updated);
      setDiscountSavedMsg('Seuils de réduction enregistrés et appliqués côté client !');
      setTimeout(() => setDiscountSavedMsg(''), 4000);
    } catch {
      setDiscountSavedMsg('Erreur lors de la sauvegarde des paliers.');
    } finally {
      setSavingDiscounts(false);
    }
  };

  const handleInlineStockSave = async (product: Product, nextQty: number) => {
    const cleanQty = Math.max(0, Math.round(nextQty));
    setSavingStockId(product.id);
    try {
      if (onUpdateProductStock) {
        await onUpdateProductStock(product.id, cleanQty, 'disponible');
      } else {
        const updated = await api.updateProductStock(product.id, cleanQty, 'disponible');
        onProductSaved(updated);
      }
      setStockDrafts(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
      setLastSavedStockId(product.id);
      setTimeout(() => setLastSavedStockId(curr => (curr === product.id ? null : curr)), 2500);
    } finally {
      setSavingStockId(null);
    }
  };

  // Filtered orders with search and status chips
  const filteredOrders = orders.filter(o => {
    // Status filter
    if (orderStatusFilter === 'to_confirm' && o.status !== 'À confirmer') return false;
    if (orderStatusFilter === 'confirmed' && o.status !== 'Confirmée') return false;
    if (orderStatusFilter === 'preparation' && o.status !== 'En préparation') return false;
    if (orderStatusFilter === 'delivered' && o.status !== 'Livrée') return false;
    if (orderStatusFilter === 'cancelled' && o.status !== 'Annulée') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return o.reference.toLowerCase().includes(q) || 
           o.customer.facilityName.toLowerCase().includes(q) ||
           o.customer.phone.toLowerCase().includes(q);
  });

  const displayedProducts = products.filter(p => {
    if (!stockSearchQuery.trim()) return true;
    return p.name.toLowerCase().includes(stockSearchQuery.toLowerCase());
  });

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder || !cancellationReason.trim() || isCancellingOrder) return;
    setIsCancellingOrder(true);
    setCancelOrderError(null);
    try {
      await onUpdateStatus(cancelModalOrder.id, 'Annulée', cancellationReason.trim());
      setCancelModalOrder(null);
      setCancellationReason('');
    } catch (error) {
      setCancelOrderError(error instanceof Error && error.message.trim()
        ? error.message
        : 'L’annulation n’a pas abouti. Vérifiez votre connexion puis réessayez.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Helper counts
  const toConfirmCount = orders.filter(o => o.status === 'À confirmer').length;
  const inPreparationCount = orders.filter(o => o.status === 'En préparation').length;
  const inTransitCount = orders.filter(o => o.deliveryStage === 'in_transit').length;
  const outOfStockCount = products.filter(p => p.status === 'rupture').length;
  const activeDeliveryOrders = orders.filter(order =>
    order.customer.deliveryMode === 'livraison' &&
    ['Confirmée', 'En préparation'].includes(order.status)
  );
  const activeDeliveriesWithConfirmedGps = activeDeliveryOrders.filter(hasConfirmedOrderGps).length;
  const deliveryOrdersToAssign = activeDeliveryOrders.filter(order => !order.courier?.name?.trim());
  const courierLoads = Array.from(activeDeliveryOrders.reduce((loads, order) => {
    const courier = order.courier;
    if (!courier?.name?.trim()) return loads;
    const key = courier.phone?.trim() || courier.name.trim().toLocaleLowerCase('fr');
    const load = loads.get(key) || { name: courier.name.trim(), count: 0 };
    load.count += 1;
    loads.set(key, load);
    return loads;
  }, new Map<string, { name: string; count: number }>()).entries()).map(([key, load]) => ({ key, ...load }));

  return (
    <div className="admin-dashboard-enter max-w-6xl mx-auto pb-24 space-y-6 px-2 sm:px-0">
      {/* 1. TOP COMMAND CENTER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0f172a] to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="dashboard-orb-float absolute top-0 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0d44e8] to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md pulse-ring-blue">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight">Portail Direction & Logistique</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  {role}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  WhatsApp manuel · envoi automatique non connecté
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Session active : <strong>{currentUser.contactName || currentUser.facilityName}</strong> · Supervision des flux médicaux au Gabon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">

            {isGestionnaire && (
              <button
                type="button"
                onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                className="btn-shine py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Produit</span>
              </button>
            )}
            {canManageClients && (
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Créer une annonce dans l’application pour les clients"
              >
                <Megaphone className="w-4 h-4" />
                <span>Campagne clients</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsRefreshingData(true);
                onRefresh();
                setTimeout(() => setIsRefreshingData(false), 650);
              }}
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingData ? 'animate-spin text-blue-300' : ''}`} />
              <span>Actualiser Données</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS NAVIGATION WITH DYNAMIC BADGES */}
      <nav aria-label="Sections du tableau de bord" className="flex gap-1.5 overflow-x-auto border-b border-slate-200 pb-1 text-xs font-bold scrollbar-none">
        {(isSuperAdmin || isSimpleAdmin) && (
          <button
            type="button"
            onClick={() => setActiveTab('kpi')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'kpi' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Vue d'ensemble & KPIs</span>
          </button>
        )}
        {isLogistique && (
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-[#0d44e8] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Commandes & Expéditions</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'orders' ? 'bg-white text-[#0d44e8]' : 'bg-slate-200 text-slate-700'
            }`}>
              {orders.length}
            </span>
            {toConfirmCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
        )}
        {isGestionnaire && (
          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'packs' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Packs médicaux</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'packs' ? 'bg-white text-indigo-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {packs.length}
            </span>
          </button>
        )}
        {isGestionnaire && (
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'stock' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalogue & Produits</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'stock' ? 'bg-white text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {products.length}
            </span>
          </button>
        )}
        {isGestionnaire && (
          <button
            type="button"
            onClick={() => setActiveTab('lots')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'lots' ? 'bg-amber-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Réassort & Disponibilité</span>
            {outOfStockCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'lots' ? 'bg-white text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {outOfStockCount}
              </span>
            )}
          </button>
        )}
        {(isSuperAdmin || isSimpleAdmin || canManageClients) && (
          <button
            type="button"
            onClick={() => setActiveTab('stats-achats')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'stats-achats' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Historique & Stats Achats Clients</span>
          </button>
        )}
        {canManageClients && (
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'clients' ? 'bg-purple-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cliniques & Contacts ({clients.length})</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'logs' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeTab === 'logs' ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>Logs</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Flux temps réel actif" />
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'audit' ? 'bg-indigo-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Journal d'Audit</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'staff' ? 'bg-purple-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Comptes employés</span>
          </button>
        )}
        {canManageSettings && (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramètres Système</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('export-deploy')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'export-deploy' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sauvegardes & Déploiement</span>
          </button>
        )}
      </nav>

      {/* 3. TAB 1: EXECUTIVE KPIS */}
      {activeTab === 'kpi' && (isSuperAdmin || isSimpleAdmin) && stats && (
        <div key="tab-kpi" className="dashboard-tab-enter space-y-5">
          <div className="admin-dashboard-kpis grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Montant des commandes</span>
                <span className="kpi-icon-badge w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">
                {stats.totalRevenue.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">FCFA</span>
              </div>
              <div className="text-[10px] text-slate-600 font-bold mt-1">Commandes payées et en attente</div>
            </div>

            <div
              onClick={() => {
                setOrderStatusFilter('to_confirm');
                setActiveTab('orders');
              }}
              className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">À confirmer</span>
                <span className="kpi-icon-badge w-7 h-7 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-amber-900 mt-1 tabular-nums">
                {stats.ordersToConfirm}
              </div>
              <div className="text-[10px] text-amber-700 mt-1 font-medium">Confirmation manuelle à effectuer</div>
            </div>

            <div
              onClick={() => {
                setOrderStatusFilter('preparation');
                setActiveTab('orders');
              }}
              className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-[#0d44e8] uppercase block tracking-wider">En cours logistique</span>
                <span className="kpi-icon-badge w-7 h-7 rounded-xl bg-blue-100/80 text-[#0d44e8] flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-[#0d44e8] mt-1 tabular-nums">
                {inPreparationCount + inTransitCount}
              </div>
              <div className="text-[10px] text-blue-700 mt-1 font-medium">Colisage / En transit</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Commandes du mois</span>
                <span className="kpi-icon-badge w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                {stats.monthOrdersCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Flux régulier</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Panier Moyen</span>
                <span className="kpi-icon-badge w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">
                {stats.averageBasket.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">F</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Par commande clinique</div>
            </div>

            <div
              onClick={() => setActiveTab('lots')}
              className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">Alertes Stock</span>
                <span className="kpi-icon-badge w-7 h-7 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-rose-900 mt-1 tabular-nums">
                {outOfStockCount}
              </div>
              <div className="text-[10px] text-rose-700 mt-1 font-medium">Articles en rupture</div>
            </div>
          </div>

          <div className="dashboard-card-interactive rounded-3xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-5">
            <React.Suspense fallback={<div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-500">Chargement du graphique…</div>}>
              <SalesMonthlyChart orders={orders} stats={stats} />
            </React.Suspense>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="dashboard-card-interactive group flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 text-left shadow-sm hover:border-blue-400"
          >
            <span className="kpi-icon-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#0d44e8]"><MapPin className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900">Localisation GPS par commande</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-slate-600">{activeDeliveriesWithConfirmedGps} sur {activeDeliveryOrders.length} livraison(s) active(s) ont un point GPS relevé pour cette commande. Ouvrez la liste pour consulter chaque adresse et sa carte.</span>
            </span>
            <span className="btn-shine shrink-0 rounded-xl bg-[#0d44e8] px-3 py-2 text-[10px] font-extrabold text-white flex items-center gap-1">
              <span>Voir les commandes</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>

          {/* Quick Thematic Navigation Cards */}
          {isSuperAdmin && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('lots')}
              className="dashboard-card-interactive group p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 text-left shadow-2xs flex items-start gap-3 cursor-pointer"
            >
              <div className="kpi-icon-badge w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Réassort & Disponibilité Stocks</h4>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gérez les états Disponible / Rupture et copiez la liste de réapprovisionnement fournisseur.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className="dashboard-card-interactive group p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 text-left shadow-2xs flex items-start gap-3 cursor-pointer"
            >
              <div className="kpi-icon-badge w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Journal d'Audit & Traçabilité</h4>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Journal local au navigateur. Aucun envoi WhatsApp automatique n'est configuré.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="dashboard-card-interactive group p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 text-left shadow-2xs flex items-start gap-3 cursor-pointer"
            >
              <div className="kpi-icon-badge w-10 h-10 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Paramètres Système & Mobile Money</h4>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#0d44e8] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configurez les comptes Airtel/Moov Money, les seuils de livraison et les modèles WhatsApp.
                </p>
              </div>
            </button>
          </div>}
        </div>
      )}

      {/* 4. TAB 2: ORDERS & LOGISTIC STAGES */}
      {activeTab === 'orders' && isLogistique && (
        <div key="tab-orders" className="dashboard-tab-enter bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Top Filters & Search */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Commandes et suivi des livraisons ({filteredOrders.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Les alertes dans l’application sont envoyées aux rôles concernés. Les messages WhatsApp au client et au coursier sont à transmettre avec les boutons ci-dessous.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher référence, clinique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0d44e8] w-56 sm:w-64"
              />
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setOrderStatusFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                orderStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Toutes ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setOrderStatusFilter('to_confirm')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                orderStatusFilter === 'to_confirm' ? 'bg-amber-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>À confirmer ({toConfirmCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderStatusFilter('confirmed')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                orderStatusFilter === 'confirmed' ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Confirmées</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderStatusFilter('preparation')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                orderStatusFilter === 'preparation' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Colisage ({inPreparationCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderStatusFilter('delivered')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                orderStatusFilter === 'delivered' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Livrées</span>
            </button>
          </div>

          {/* Compact dispatch overview: one courier per delivery, with reusable couriers across orders. */}
          <section className="p-4 sm:p-5 border-b border-slate-100 bg-white" aria-label="Organisation des livreurs">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Organisation des livraisons</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Une commande = un livreur affecté. Un même livreur peut prendre plusieurs commandes.
                </p>
              </div>
              <span className="text-[10px] text-slate-400">Commandes confirmées ou en préparation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-3.5 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white text-blue-700 flex items-center justify-center shadow-sm">
                  <Truck className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-blue-800">Livraisons actives</p>
                  <p className="text-xl leading-6 font-black text-slate-900">{activeDeliveryOrders.length}</p>
                </div>
              </div>
              <div className={`rounded-2xl border px-3.5 py-3 flex items-center gap-3 ${deliveryOrdersToAssign.length ? 'border-amber-200 bg-amber-50/80' : 'border-emerald-100 bg-emerald-50/70'}`}>
                <span className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm ${deliveryOrdersToAssign.length ? 'text-amber-700' : 'text-emerald-700'}`}>
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <p className={`text-[10px] font-semibold ${deliveryOrdersToAssign.length ? 'text-amber-800' : 'text-emerald-800'}`}>À affecter</p>
                  <p className="text-xl leading-6 font-black text-slate-900">{deliveryOrdersToAssign.length}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-3.5 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white text-violet-700 flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-violet-800">Livreurs mobilisés</p>
                  <p className="text-xl leading-6 font-black text-slate-900">{courierLoads.length}</p>
                </div>
              </div>
            </div>

            {courierLoads.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Nombre de commandes par livreur">
                {courierLoads.map(load => (
                  <span key={load.key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700">
                    <Truck className="w-3.5 h-3.5 text-violet-600" />
                    <strong>{load.name}</strong>
                    <span className="text-slate-500">· {load.count} commande{load.count > 1 ? 's' : ''}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-slate-500">Aucun livreur n’est encore affecté à une livraison active.</p>
            )}

            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              La charge compte les commandes actives. Le trajet GPS est propre à chaque commande ; aucune capacité maximale ni tournée groupée automatique n’est encore définie.
            </p>
          </section>

          {/* Orders List items */}
          <div className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                Aucune commande ne correspond à ces critères.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="dashboard-row-interactive p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-[#0d44e8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {order.reference}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        order.status === 'Livrée'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Annulée'
                            ? 'bg-rose-100 text-rose-800'
                            : order.status === 'En préparation'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status}
                      </span>

                      {order.hasQuoteItems && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Inclut Devis / Stock 0
                        </span>
                      )}

                      {/* Payment Checkbox toggle */}
                      {(isSuperAdmin || isSimpleAdmin) && (
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold ml-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={order.isPaid}
                            onChange={(e) => onUpdatePayment(order.id, e.target.checked)}
                            className="rounded text-[#0d44e8]"
                          />
                          <span className={order.isPaid ? 'text-emerald-700' : 'text-slate-500'}>
                            {order.isPaid ? '✓ Payée' : 'Non payée'}
                          </span>
                        </label>
                      )}

                      {/* Automated WhatsApp logs badge */}
                      {order.whatsappLogs && order.whatsappLogs.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>Historique WhatsApp ({order.whatsappLogs.length})</span>
                        </span>
                      )}
                    </div>

                    <div className="text-slate-800">
                      <strong className="text-sm font-bold">{order.customer.facilityName}</strong> · Contact : {order.customer.contactName || 'Réception'} ({order.customer.phone})
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${hasConfirmedOrderGps(order) ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold leading-relaxed text-slate-800">{order.customer.deliveryMode === 'retrait' ? 'Retrait au dépôt' : order.customer.deliveryAddress || 'Adresse non renseignée'}</div>
                          {order.customer.deliveryMode !== 'retrait' && (
                            <div className={`mt-1 text-[10px] font-extrabold ${hasConfirmedOrderGps(order) ? 'text-emerald-800' : hasValidOrderCoordinates(order) ? 'text-amber-800' : 'text-slate-500'}`}>
                              {hasConfirmedOrderGps(order) ? 'GPS relevé pour cette commande' : hasValidOrderCoordinates(order) ? 'Ancien point GPS — à confirmer' : 'GPS précis non relevé · adresse écrite uniquement'}
                            </div>
                          )}
                          {hasValidOrderCoordinates(order) && (
                            <div className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-600">
                              {order.customer.coordinates!.lat.toFixed(6)}, {order.customer.coordinates!.lng.toFixed(6)}
                              {Number.isFinite(order.customer.coordinates!.accuracy) && ` · ±${Math.round(order.customer.coordinates!.accuracy!)} m`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
                        {order.items.length} article(s) · <strong className="text-slate-900">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                    </div>

                    {/* Mobile Payment details banner if present */}
                    {(order.mobilePayment || order.customer.paymentMethod === 'airtel_money' || order.customer.paymentMethod === 'moov_money') && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                          (order.mobilePayment?.provider || order.customer.paymentMethod) === 'airtel_money'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          <Smartphone className="w-3 h-3" />
                          <span>{(order.mobilePayment?.provider || order.customer.paymentMethod) === 'airtel_money' ? 'Airtel Money' : 'Moov Money'}</span>
                        </span>
                        {order.mobilePayment?.transactionReference ? (
                          <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Réf: {order.mobilePayment.transactionReference}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            ⏳ En attente Réf SMS
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operational & Logistic Action Controls */}
                  <div className="flex items-center gap-1.5 self-end xl:self-center flex-wrap">
                    {onOpenFinanceModal && canManageFinance && (
                      <button
                        type="button"
                        onClick={() => onOpenFinanceModal(order)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Ouvrir les acomptes, factures et avoirs de cette commande"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Facture / Avoir</span>
                      </button>
                    )}
                    {onViewOrderPdf && (
                      <button
                        type="button"
                        onClick={() => onViewOrderPdf(order)}
                        className="py-1.5 px-3 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Visualiser et télécharger le Bon de Commande PDF A4"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#0d44e8]" />
                        <span>Bon PDF</span>
                      </button>
                    )}

                    {/* Delivery Modal Opener */}
                    {onOpenDeliveryModal && (
                      <button
                        type="button"
                        onClick={() => onOpenDeliveryModal(order)}
                        className="py-1.5 px-3 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold border border-purple-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Gérer les étapes de livraison et affecter le coursier"
                      >
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                        <span>{hasConfirmedOrderGps(order) ? 'Voir carte GPS' : order.deliveryStage ? `Étape : ${order.deliveryStage}` : 'Localisation & livraison'}</span>
                      </button>
                    )}

                    {/* Status Transitions */}
                    {order.status === 'À confirmer' && (isSuperAdmin || isSimpleAdmin || isCommercial) && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'Confirmée')}
                        className="btn-shine py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold cursor-pointer"
                      >
                        Valider Commande
                      </button>
                    )}

                    {order.status === 'Confirmée' && (isSuperAdmin || isSimpleAdmin) && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'En préparation')}
                        className="btn-shine py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                      >
                        Lancer Colisage
                      </button>
                    )}

                    {/* WhatsApp Client Manual Backup */}
                    <a
                      href={generateWhatsAppMessageForStage(
                        order, 
                        order.deliveryStage || (order.status === 'Livrée' ? 'delivered' : order.status === 'En préparation' ? 'preparation' : 'confirmed')
                      ).directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Envoyer la notification WhatsApp personnalisée au client"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Client</span>
                    </a>

                    {order.status !== 'Livrée' && order.status !== 'Annulée' &&
                      (((isSuperAdmin || isSimpleAdmin) && !(order.status === 'En préparation' && ['picked_up', 'in_transit', 'delivered'].includes(order.deliveryStage || 'preparation'))) ||
                        (isCommercial && ['À confirmer', 'Confirmée'].includes(order.status))) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalOrder(order);
                          setCancellationReason('');
                          setCancelOrderError(null);
                        }}
                        className="py-1.5 px-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'packs' && isGestionnaire && (
        <div key="tab-packs" className="dashboard-tab-enter space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <div>
              <h2 className="font-black text-slate-900 text-sm">Packs médicaux & campagnes clients</h2>
              <p className="mt-1 text-xs text-slate-600">Gérez les packs du catalogue ou créez une annonce visible dans l’application client.</p>
            </div>
            {canManageClients && (
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 flex items-center justify-center gap-2"
              >
                <Megaphone className="w-4 h-4" />
                Créer une campagne
              </button>
            )}
          </div>
          <AdminPacksModule
            packs={packs}
            products={products}
            currentUser={currentUser}
            onCreatePack={onCreatePack}
            onUpdatePack={onUpdatePack}
            onDeletePack={onDeletePack}
          />
        </div>
      )}

      {/* 5. TAB 3: CATALOG, STOCKS & VOLUME DISCOUNTS */}
      {activeTab === 'stock' && isGestionnaire && (
        <div key="tab-stock" className="dashboard-tab-enter space-y-5">
          {/* Volume Discount Configuration Panel */}
          <form onSubmit={handleSaveVolumeDiscounts} className="bg-white rounded-3xl border border-blue-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0d44e8]" />
                  Configuration des Réductions sur Volume (5%, 10%, 15%...)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Définissez vous-même à partir de quelle quantité commandée la remise s’applique automatiquement côté client.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountSettings.enabled}
                  onChange={(e) => setDiscountSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded text-[#0d44e8]"
                />
                <span>Activer les remises volume</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-black text-[#0d44e8] uppercase text-[10px] block">Palier 1 (Clinique)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="font-bold text-slate-700">
                    À partir de (qté)
                    <input
                      type="number"
                      min={1}
                      value={discountSettings.tier1Qty}
                      onChange={(e) => setDiscountSettings(prev => ({ ...prev, tier1Qty: Math.max(1, Number(e.target.value)) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-900"
                    />
                  </label>
                  <label className="font-bold text-slate-700">
                    Réduction (%)
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={discountSettings.tier1Percent}
                      onChange={(e) => setDiscountSettings(prev => ({ ...prev, tier1Percent: Math.max(0, Number(e.target.value)) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-emerald-700"
                    />
                  </label>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-black text-[#0d44e8] uppercase text-[10px] block">Palier 2 (Hôpital)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="font-bold text-slate-700">
                    À partir de (qté)
                    <input
                      type="number"
                      min={2}
                      value={discountSettings.tier2Qty}
                      onChange={(e) => setDiscountSettings(prev => ({ ...prev, tier2Qty: Math.max(2, Number(e.target.value)) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-900"
                    />
                  </label>
                  <label className="font-bold text-slate-700">
                    Réduction (%)
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={discountSettings.tier2Percent}
                      onChange={(e) => setDiscountSettings(prev => ({ ...prev, tier2Percent: Math.max(0, Number(e.target.value)) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-emerald-700"
                    />
                  </label>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-black text-[#0d44e8] uppercase text-[10px] block">Palier 3 (Centrale)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="font-bold text-slate-700">
                    À partir de (qté)
                    <input
                      type="number"
                      min={3}
                      value={discountSettings.tier3Qty}
                      onChange={(e) => setDiscountSettings(prev => ({ ...prev, tier3Qty: Math.max(3, Number(e.target.value)) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-900"
                    />
                  </label>
                  <label className="font-bold text-slate-700">
                    Réduction (%)
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={discountSettings.tier3Percent}
                      onChange={(e) => setDiscountSettings(prev => ({ ...prev, tier3Percent: Math.max(0, Number(e.target.value)) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-emerald-700"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500">
                Aperçu client actuel :{' '}
                {discountSettings.enabled ? (
                  <strong className="text-slate-800">
                    -{discountSettings.tier1Percent}% dès {discountSettings.tier1Qty} u. · -{discountSettings.tier2Percent}% dès {discountSettings.tier2Qty} u. · -{discountSettings.tier3Percent}% dès {discountSettings.tier3Qty} u.
                  </strong>
                ) : (
                  <strong className="text-rose-700">Remises volume désactivées</strong>
                )}
              </p>
              <div className="flex items-center gap-2">
                {discountSavedMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    {discountSavedMsg}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingDiscounts}
                  className="px-4 py-2 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {savingDiscounts ? 'Enregistrement…' : 'Enregistrer les paliers de remise'}
                </button>
              </div>
            </div>
          </form>

          {/* Products & Real-Time Stock Sync Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  Catalogue & Synchronisation Stock Client ({displayedProducts.length} produits)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifiez la quantité en stock ici : si Stock &gt; 0, le produit passe immédiatement en <strong>validation directe</strong> côté client. Si Stock = 0, la commande est <strong>convertie en demande de devis</strong>.
                </p>
              </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100">
                <Upload className="h-3.5 w-3.5" /> Importer Excel / CSV
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelFileSelected} />
              </label>
              <button type="button" onClick={() => void handleProductExport('xlsx')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Exporter Excel
              </button>
              <button type="button" onClick={() => void handleProductExport('csv')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher produit..."
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                />
              </div>
              </div>
            </div>
          {excelImportFeedback && <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800" role="status">{excelImportFeedback}</p>}

            <div className="divide-y divide-slate-100">
              {displayedProducts.map((p) => {
                const currentQty = p.quantityAvailable ?? p.stockQuantity ?? 0;
                const draftQty = stockDrafts[p.id] !== undefined ? stockDrafts[p.id] : currentQty;
                const isQuoteOnly = p.isQuote || p.variants.every(v => v.price === 0);
                return (
                  <div key={p.id} className="dashboard-row-interactive p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {p.thumbnailUrl || p.image ? (
                          <img src={p.thumbnailUrl || p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{p.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500">{p.category} · {p.variants.length} variante(s)</span>
                          {/* Live Client-Side Visibility Status Indicator */}
                          {p.status === 'rupture' ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              🔴 Bloqué (Rupture) côté client
                            </span>
                          ) : isQuoteOnly ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              📋 Équipement sur devis
                            </span>
                          ) : currentQty > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              🟢 En stock côté client ({currentQty} u.) · Commande directe
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              🟠 Stock 0 · Converti auto. en devis côté client
                            </span>
                          )}
                          {lastSavedStockId === p.id && (
                            <span className="text-[10px] font-extrabold text-emerald-700">
                              ✓ Synchronisé côté client !
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Direct Stock Quantity Editor */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 px-1.5">Stock :</span>
                        <input
                          type="number"
                          min={0}
                          value={draftQty}
                          onChange={(e) => setStockDrafts(prev => ({ ...prev, [p.id]: Math.max(0, Number(e.target.value)) }))}
                          className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-center font-bold text-slate-900 text-xs"
                        />
                        <button
                          type="button"
                          disabled={savingStockId === p.id}
                          onClick={() => void handleInlineStockSave(p, draftQty)}
                          className="px-2.5 py-1 rounded-lg bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                        >
                          {savingStockId === p.id ? '...' : 'Valider stock'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleProductStock(p.id, p.status)}
                        className={`py-1.5 px-3 rounded-xl font-bold cursor-pointer transition-colors ${
                          p.status === 'disponible'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {p.status === 'disponible' ? '✓ Autorisé' : '⚠️ Rupture'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                        className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        title="Modifier la fiche complète"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5B. TAB: STOCK LOTS & RESTOCK AVAILABILITY */}
      {activeTab === 'lots' && isGestionnaire && (
        <StockLotsModule
          products={products}
          onToggleProductStock={onToggleProductStock}
          actorName={currentUser.contactName || currentUser.facilityName}
          actorRole={role}
        />
      )}

      {/* 6. TAB 4: CLIENT PURCHASES STATS */}
      {activeTab === 'stats-achats' && (isSuperAdmin || isSimpleAdmin || canManageClients) && (
        <ClientPurchasesStatsModule
          orders={orders}
          clients={clients}
          products={products}
          initialSelectedClientId={selectedHistoryClientId}
          onClearSelectedClient={() => setSelectedHistoryClientId(null)}
        />
      )}

      {/* 7. TAB 5: CLIENTS & CONTACTS */}
      {activeTab === 'clients' && canManageClients && (
        <div key="tab-clients" className="dashboard-tab-enter bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Répertoire des Établissements Hospitaliers & Cliniques
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez les coordonnées, le volume d'affaires et l'historique complet des achats de chaque client.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setClientsModuleView('directory')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    clientsModuleView === 'directory' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#0d44e8]" />
                  <span>Répertoire ({clients.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientsModuleView('purchase-history')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    clientsModuleView === 'purchase-history' ? 'bg-[#0d44e8] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Historique des achats</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <span>Informer tous les clients</span>
              </button>
            </div>
          </div>
          {clientsModuleView === 'purchase-history' ? (
            <ClientPurchaseHistoryView
              clients={clients}
              orders={orders}
              selectedClientId={selectedHistoryClientId}
              onSelectClientId={setSelectedHistoryClientId}
              onBackToDirectory={() => setClientsModuleView('directory')}
              onViewOrderPdf={onViewOrderPdf}
              onOpenDeliveryModal={onOpenDeliveryModal}
              onUpdatePayment={onUpdatePayment}
              onOpenMessageModal={(client) => {
                setTargetMessageClient(client);
                setIsMessageModalOpen(true);
              }}
            />
          ) : (
          <>
          <div className="p-3.5 px-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientDirectorySearch}
                onChange={(e) => setClientDirectorySearch(e.target.value)}
                placeholder="Rechercher un établissement, un contact ou un téléphone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
              />
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Filtrez le répertoire client</span>
          </div>
          <div className="divide-y divide-slate-100">
            {clients.filter((client) => {
              const query = clientDirectorySearch.trim().toLowerCase();
              if (!query) return true;
              return [client.facilityName, client.contactName, client.phone, client.deliveryAddress]
                .some((value) => String(value || '').toLowerCase().includes(query));
            }).map((c) => {
              const clientOrdersCount = typeof c.totalOrdersCount === 'number'
                ? c.totalOrdersCount
                : orders.filter(o => o.customer.phone === c.phone && o.status !== 'Annulée').length;
              const clientTotalSpent = typeof c.totalSpent === 'number'
                ? c.totalSpent
                : orders.filter(o => o.customer.phone === c.phone && o.status !== 'Annulée').reduce((sum, o) => sum + o.estimatedTotal, 0);
              const clientUnpaid = typeof c.unpaidAmount === 'number'
                ? c.unpaidAmount
                : orders.filter(o => o.customer.phone === c.phone && o.status !== 'Annulée' && !o.isPaid).reduce((sum, o) => sum + o.estimatedTotal, 0);

              return (
                <div key={c.id} className="dashboard-row-interactive p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{c.facilityName}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] tabular-nums">
                        {clientOrdersCount} commande{clientOrdersCount > 1 ? 's' : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-extrabold text-[11px] tabular-nums">
                        {clientTotalSpent.toLocaleString('fr-FR')} FCFA
                      </span>
                      {clientUnpaid > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 font-bold text-[11px] tabular-nums">
                          Reste à régler : {clientUnpaid.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 mt-1">
                      {c.contactName || 'Réception'} · <span className="font-mono">{c.phone}</span> · {c.deliveryAddress || 'Libreville'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHistoryClientId(c.id || c.phone);
                        setClientsModuleView('purchase-history');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Historique des achats</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTargetMessageClient(c); setIsMessageModalOpen(true); }}
                      className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Message Direct</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
          )}
        </div>
      )}

      {/* 7A. TAB: REAL-TIME COLLABORATOR LOGS (SUPER-ADMIN) */}
      {activeTab === 'logs' && isSuperAdmin && (
        <StaffLogsRealtimeModule />
      )}

      {/* 7B. TAB: AUDIT LOGS */}
      {activeTab === 'audit' && isSuperAdmin && (
        <AuditLogModule orders={orders} />
      )}

      {/* 7C. TAB: SYSTEM SETTINGS */}
      {activeTab === 'settings' && canManageSettings && (
        <SystemSettingsModule
          actorName={currentUser.contactName || currentUser.facilityName}
          actorRole={role}
        />
      )}

      {activeTab === 'staff' && isSuperAdmin && <StaffAccountsModule />}

      {/* 8. TAB 6: EXPORT & CLOUD BACKUP */}
      {activeTab === 'export-deploy' && isSuperAdmin && (
        <React.Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Chargement des outils d’export…</div>}>
          <DataExportModule orders={orders} products={products} packs={packs} clients={clients} notifications={notifications} />
        </React.Suspense>
      )}

      {/* MODALS */}
      {excelImportPreview && (
        <CatalogExcelImportModal
          preview={excelImportPreview}
          onClose={() => setExcelImportPreview(null)}
          onSuccess={(_catalog, message) => {
            setExcelImportPreview(null);
            setExcelImportFeedback(message);
            onRefresh();
          }}
        />
      )}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={true}
          onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
          onSuccess={(prod: Product) => { onProductSaved(prod); setIsProductModalOpen(false); }}
          initialProduct={editingProduct || undefined}
        />
      )}

      {isMessageModalOpen && targetMessageClient && (
        <DirectMessagingModal
          isOpen={true}
          onClose={() => { setIsMessageModalOpen(false); setTargetMessageClient(null); }}
          targetClient={targetMessageClient}
          onSuccess={() => { setIsMessageModalOpen(false); setTargetMessageClient(null); onRefresh(); }}
        />
      )}

      {isAnnouncementModalOpen && (
        <ClientAnnouncementModal
          isOpen={true}
          onClose={() => setIsAnnouncementModalOpen(false)}
        />
      )}

      {/* CANCEL ORDER MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h4 className="font-bold text-slate-900 text-sm">
              Annuler la commande {cancelModalOrder.reference}
            </h4>
            <textarea
              placeholder="Motif de l'annulation (ex: Rupture imprévue, demande client...)"
              value={cancellationReason}
              onChange={(e) => {
                setCancellationReason(e.target.value);
                setCancelOrderError(null);
              }}
              disabled={isCancellingOrder}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs h-24 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-50"
            />
            {cancelOrderError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {cancelOrderError}
              </p>
            )}
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                disabled={isCancellingOrder}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer disabled:opacity-50"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancellationReason.trim() || isCancellingOrder}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                {isCancellingOrder ? 'Annulation…' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

          </div>
  );
};
