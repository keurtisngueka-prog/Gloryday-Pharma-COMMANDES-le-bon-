import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';
import { Order, OrderStatus, AdminStats, Pack, Product, User, AppRole, DeliveryStage, AppNotification } from '../types';
import { ProductFormModal } from './ProductFormModal';
import { BestClientsModule } from './BestClientsModule';
import { DirectMessagingModal } from './DirectMessagingModal';
import { ClientPurchasesStatsModule } from './ClientPurchasesStatsModule';
import { DataExportModule } from './DataExportModule';
import { AuditLogModule } from './AuditLogModule';
import { StockLotsModule } from './StockLotsModule';
import { SystemSettingsModule } from './SystemSettingsModule';
import { generateWhatsAppMessageForStage } from '../utils/whatsappNotifications';

export type AdminSubTab = 'kpi' | 'orders' | 'packs' | 'stock' | 'lots' | 'clients' | 'stats-achats' | 'audit' | 'settings' | 'export-deploy';

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
  onRefresh: () => void;
  defaultSubTab?: AdminSubTab;
  onOpenDeliveryModal?: (order: Order) => void;
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
  onRefresh,
  defaultSubTab = 'kpi',
  onOpenDeliveryModal
}) => {
  const role: AppRole = currentUser.role;
  const isSuperAdmin = role === 'Super-Admin';
  const isGestionnaire = role === 'Gestionnaire Catalogue' || isSuperAdmin;
  const isLogistique = role === 'Logistique' || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<AdminSubTab>(defaultSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'to_confirm' | 'confirmed' | 'preparation' | 'delivered' | 'cancelled'>('all');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [targetMessageClient, setTargetMessageClient] = useState<any | null>(null);

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
    if (!cancelModalOrder || !cancellationReason.trim()) return;
    await onUpdateStatus(cancelModalOrder.id, 'Annulée', cancellationReason.trim());
    setCancelModalOrder(null);
  };

  // Helper counts
  const toConfirmCount = orders.filter(o => o.status === 'À confirmer').length;
  const inPreparationCount = orders.filter(o => o.status === 'En préparation').length;
  const inTransitCount = orders.filter(o => o.deliveryStage === 'in_transit').length;
  const outOfStockCount = products.filter(p => p.status === 'rupture').length;

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6 px-2 sm:px-0">
      {/* 1. TOP COMMAND CENTER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0f172a] to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0d44e8] to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight">Portail Direction & Logistique</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  {role}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Automate WhatsApp Actif
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
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Produit</span>
              </button>
            )}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="py-2 px-3.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold border border-purple-400/30 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Personnaliser le mot de passe Administrateur"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Mot de passe Admin</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
            >
              Actualiser Données
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS NAVIGATION WITH DYNAMIC BADGES */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        {isSuperAdmin && (
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
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('stats-achats')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'stats-achats' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Statistiques Établissements</span>
          </button>
        )}
        {isSuperAdmin && (
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
      </div>

      {/* 3. TAB 1: EXECUTIVE KPIS */}
      {activeTab === 'kpi' && isSuperAdmin && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Chiffre d'Affaires</span>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">
                {stats.totalRevenue.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">FCFA</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">Facturé & Réglé</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">À confirmer</span>
              <div className="text-xl font-black text-amber-900 mt-1">
                {stats.ordersToConfirm}
              </div>
              <div className="text-[10px] text-amber-700 mt-1 font-medium">Validation WhatsApp requise</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
              <span className="text-[10px] font-bold text-[#0d44e8] uppercase block tracking-wider">En cours logistique</span>
              <div className="text-xl font-black text-[#0d44e8] mt-1">
                {inPreparationCount + inTransitCount}
              </div>
              <div className="text-[10px] text-blue-700 mt-1 font-medium">Colisage / En transit</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Commandes du mois</span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {stats.monthOrdersCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Flux régulier</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Panier Moyen</span>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">
                {stats.averageBasket.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">F</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Par commande clinique</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">Alertes Stock</span>
              <div className="text-xl font-black text-rose-900 mt-1">
                {outOfStockCount}
              </div>
              <div className="text-[10px] text-rose-700 mt-1 font-medium">Articles en rupture</div>
            </div>
          </div>

          {/* Quick Thematic Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('lots')}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 text-left transition-all shadow-2xs flex items-start gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Réassort & Disponibilité Stocks</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gérez les états Disponible / Rupture et copiez la liste de réapprovisionnement fournisseur.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 text-left transition-all shadow-2xs flex items-start gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Journal d'Audit & Traçabilité</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Historique certifié des notifications WhatsApp automatiques, validations et connexions.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 text-left transition-all shadow-2xs flex items-start gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Paramètres Système & Mobile Money</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configurez les comptes Airtel/Moov Money, les seuils de livraison et les modèles WhatsApp.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 4. TAB 2: ORDERS & LOGISTIC STAGES */}
      {activeTab === 'orders' && isLogistique && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Top Filters & Search */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pilotage des Commandes & Notifications WhatsApp ({filteredOrders.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque changement d'étape déclenche automatiquement une notification WhatsApp en arrière-plan vers le client.
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

          {/* Orders List items */}
          <div className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                Aucune commande ne correspond à ces critères.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs hover:bg-slate-50/80 transition-colors">
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

                      {/* Payment Checkbox toggle */}
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

                      {/* Automated WhatsApp logs badge */}
                      {order.whatsappLogs && order.whatsappLogs.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp Auto ({order.whatsappLogs.length})</span>
                        </span>
                      )}
                    </div>

                    <div className="text-slate-800">
                      <strong className="text-sm font-bold">{order.customer.facilityName}</strong> · Contact : {order.customer.contactName || 'Réception'} ({order.customer.phone})
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      📍 {order.customer.deliveryAddress} · {order.items.length} article(s) · <strong className="text-slate-900">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
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
                    {/* Delivery Modal Opener */}
                    {onOpenDeliveryModal && (
                      <button
                        type="button"
                        onClick={() => onOpenDeliveryModal(order)}
                        className="py-1.5 px-3 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold border border-purple-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Gérer les étapes de livraison et affecter le coursier"
                      >
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                        <span>{order.deliveryStage ? `Étape : ${order.deliveryStage}` : 'Suivi Logistique'}</span>
                      </button>
                    )}

                    {/* Status Transitions */}
                    {order.status === 'À confirmer' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'Confirmée')}
                        className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold cursor-pointer transition-colors"
                      >
                        Valider Commande
                      </button>
                    )}

                    {order.status === 'Confirmée' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'En préparation')}
                        className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-colors"
                      >
                        Lancer Colisage
                      </button>
                    )}

                    {order.status === 'En préparation' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'Livrée')}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors"
                      >
                        Marquer Livrée
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

                    {order.status !== 'Livrée' && order.status !== 'Annulée' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalOrder(order);
                          setCancellationReason('');
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

      {/* 5. TAB 3: CATALOG & STOCKS */}
      {activeTab === 'stock' && isGestionnaire && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
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

          <div className="divide-y divide-slate-100">
            {displayedProducts.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    {p.thumbnailUrl || p.image ? (
                      <img src={p.thumbnailUrl || p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{p.name}</h4>
                    <span className="text-[11px] text-slate-500">{p.category} · {p.variants.length} variante(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleProductStock(p.id, p.status)}
                    className={`py-1.5 px-3 rounded-xl font-bold cursor-pointer transition-colors ${
                      p.status === 'disponible'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                    }`}
                  >
                    {p.status === 'disponible' ? '✓ En Stock' : '⚠️ Rupture'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
      {activeTab === 'stats-achats' && isSuperAdmin && (
        <ClientPurchasesStatsModule orders={orders} clients={clients} products={products} />
      )}

      {/* 7. TAB 5: CLIENTS & CONTACTS */}
      {activeTab === 'clients' && isSuperAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900">
              Répertoire des Établissements Hospitaliers & Cliniques
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {clients.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.facilityName}</h4>
                  <div className="text-slate-500 mt-0.5">
                    {c.contactName || 'Réception'} · {c.phone} · {c.deliveryAddress || 'Libreville'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setTargetMessageClient(c); setIsMessageModalOpen(true); }}
                  className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Message Direct</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7B. TAB: AUDIT LOGS */}
      {activeTab === 'audit' && isSuperAdmin && (
        <AuditLogModule orders={orders} />
      )}

      {/* 7C. TAB: SYSTEM SETTINGS */}
      {activeTab === 'settings' && isSuperAdmin && (
        <SystemSettingsModule
          actorName={currentUser.contactName || currentUser.facilityName}
          actorRole={role}
        />
      )}

      {/* 8. TAB 6: EXPORT & CLOUD BACKUP */}
      {activeTab === 'export-deploy' && isSuperAdmin && (
        <DataExportModule orders={orders} products={products} packs={packs} clients={clients} notifications={notifications} />
      )}

      {/* MODALS */}
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
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs h-24 focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancellationReason.trim()}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
