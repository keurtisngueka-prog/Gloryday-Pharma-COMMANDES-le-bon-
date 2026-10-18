import React, { useState, useMemo } from 'react';
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
  Layers,
  Settings,
  Receipt,
  FileText,
  Filter,
  CheckSquare,
  Square,
  BarChart3,
  Calendar
} from 'lucide-react';
import { Order, OrderStatus, AdminStats, Pack, Product, User, AppRole } from '../types';
import { ProductFormModal } from './ProductFormModal';
import { DirectMessagingModal } from './DirectMessagingModal';
import { DataExportModule } from './DataExportModule';
import { SalesMonthlyChart } from './SalesMonthlyChart';
import { MobilePaymentModal } from './MobilePaymentModal';
import { OrderFinanceModal } from './OrderFinanceModal';
import { AuditLogModule } from './AuditLogModule';
import { StockLotsModule } from './StockLotsModule';
import { EnterpriseClientsModule } from './EnterpriseClientsModule';
import { SystemSettingsModule } from './SystemSettingsModule';
import { AdminPacksModule } from './AdminPacksModule';
import { EnterpriseReportsModule } from './EnterpriseReportsModule';
import { generateWhatsAppMessageForStage } from '../utils/whatsappNotifications';
import { logAuditEvent } from '../utils/auditLogger';

interface AdminDashboardProps {
  stats: AdminStats | null;
  orders: Order[];
  packs: Pack[];
  products: Product[];
  clients: any[];
  currentUser: User;
  onUpdateStatus: (orderId: string, status: OrderStatus, reason?: string) => Promise<void>;
  onUpdatePayment: (orderId: string, isPaid: boolean) => Promise<void>;
  onCreatePack: (pack: Omit<Pack, 'id'>) => Promise<void>;
  onUpdatePack: (id: string, pack: Partial<Pack>) => Promise<void>;
  onDeletePack: (id: string) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onProductSaved: (product: Product) => void;
  onToggleProductStock: (productId: string, currentStatus: 'disponible' | 'rupture') => Promise<void>;
  onRefresh: () => void;
  defaultSubTab?: 'kpi' | 'reporting' | 'orders' | 'packs' | 'stock' | 'clients' | 'audit' | 'settings' | 'export-deploy';
  onOpenDeliveryModal?: (order: Order) => void;
  onUpdateOrder?: (updated: Order) => void;
  onUpdateClient?: (updated: User) => void;
  onDeleteClientData?: (clientId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  orders,
  packs,
  products,
  clients,
  currentUser,
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
  onOpenDeliveryModal,
  onUpdateOrder,
  onUpdateClient,
  onDeleteClientData
}) => {
  const role: AppRole = currentUser.role;
  const isSuperAdmin = role === 'Super-Admin';
  const isGestionnaire = role === 'Gestionnaire Catalogue' || isSuperAdmin;
  const isLogistique = role === 'Logistique' || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'kpi' | 'reporting' | 'orders' | 'packs' | 'stock' | 'clients' | 'audit' | 'settings' | 'export-deploy'>(defaultSubTab);

  // Search & Filters for orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  // Selected orders for bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modals state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [targetMessageClient, setTargetMessageClient] = useState<any | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [financeModalOrder, setFinanceModalOrder] = useState<Order | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentFilter === 'payee' && !o.isPaid) return false;
      if (paymentFilter === 'non_payee' && o.isPaid) return false;
      if (zoneFilter !== 'all' && o.deliveryZone && !o.deliveryZone.toLowerCase().includes(zoneFilter.toLowerCase())) return false;
      
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.reference.toLowerCase().includes(q) ||
        o.customer.facilityName.toLowerCase().includes(q) ||
        o.customer.phone.toLowerCase().includes(q) ||
        o.customer.deliveryAddress.toLowerCase().includes(q) ||
        (o.courier && o.courier.name.toLowerCase().includes(q))
      );
    });
  }, [orders, searchQuery, statusFilter, paymentFilter, zoneFilter]);

  // Bulk actions
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkConfirm = async () => {
    if (selectedOrderIds.length === 0) return;
    for (const id of selectedOrderIds) {
      await onUpdateStatus(id, 'Confirmée');
    }
    setSelectedOrderIds([]);
    onRefresh();
  };

  const handleBulkMarkPaid = async () => {
    if (selectedOrderIds.length === 0) return;
    for (const id of selectedOrderIds) {
      await onUpdatePayment(id, true);
    }
    setSelectedOrderIds([]);
    onRefresh();
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder || !cancellationReason.trim()) return;
    await onUpdateStatus(cancelModalOrder.id, 'Annulée', cancellationReason.trim());
    logAuditEvent(
      currentUser,
      'annulation_commande',
      'Commande',
      cancelModalOrder.reference,
      `Annulation commande pour ${cancelModalOrder.customer.facilityName} : ${cancellationReason.trim()}`
    );
    setCancelModalOrder(null);
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-4 px-2 sm:px-0">
      {/* Top Banner */}
      <div className="bg-[#0f0f12] text-white rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0d44e8] flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold">Centre de Contrôle Entreprise Gloryday</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase font-mono">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Opérateur : <strong>{currentUser.contactName || currentUser.facilityName}</strong> · Pharmacie & Dispositifs Médicaux B2B
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGestionnaire && (
            <button
              type="button"
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Ribbon Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('kpi')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'kpi' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vue KPIs
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('reporting')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reporting' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#0d44e8]" />
            <span>Pilotage & Marges</span>
          </button>
        )}

        {isLogistique && (
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#0d44e8]" />
            <span>Commandes & Finances ({orders.length})</span>
          </button>
        )}

        {isGestionnaire && (
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'stock' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>Stocks Réels & Lots ({products.length})</span>
          </button>
        )}

        {isGestionnaire && (
          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'packs' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Packs Cliniques ({packs.length})</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'clients' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Clients B2B ({clients.length})</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Journal d'Audit</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Paramètres Sans Code</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('export-deploy')}
            className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'export-deploy' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sauvegardes & Restauration</span>
          </button>
        )}
      </div>

      {/* TAB 1: KPIS BASIQUES */}
      {activeTab === 'kpi' && isSuperAdmin && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Chiffre d'Affaires</span>
              <div className="text-base font-black text-slate-900 mt-1 tabular-nums font-mono">
                {stats.totalRevenue.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">F</span>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">À confirmer</span>
              <div className="text-lg font-black text-amber-900 mt-1 font-mono">
                {stats.ordersToConfirm}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Commandes mois</span>
              <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                {stats.monthOrdersCount}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Panier Moyen</span>
              <div className="text-base font-black text-slate-900 mt-1 tabular-nums font-mono">
                {stats.averageBasket.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">F</span>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Clients Inscrits</span>
              <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                {stats.totalClients}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Inactifs &gt; 10j</span>
              <div className="text-lg font-black text-rose-900 mt-1 font-mono">
                {stats.inactiveClientsCount}
              </div>
            </div>
          </div>

          {/* Interactive 6-Month Sales Evolution AreaChart */}
          <SalesMonthlyChart orders={orders} stats={stats} />
        </div>
      )}

      {/* TAB 2: PILOTAGE FINANCIER & MARGES */}
      {activeTab === 'reporting' && isSuperAdmin && (
        <EnterpriseReportsModule
          stats={stats}
          orders={orders}
          products={products}
          currentUser={currentUser}
        />
      )}

      {/* TAB 3: COMMANDES & FINANCES ENRICHIES */}
      {activeTab === 'orders' && isLogistique && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Multi-criteria filter header */}
          <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher référence, client, téléphone, coursier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#0d44e8]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs"
              >
                <option value="all">Tous les statuts</option>
                <option value="À confirmer">À confirmer</option>
                <option value="Confirmée">Confirmée</option>
                <option value="En préparation">En préparation</option>
                <option value="Livrée">Livrée</option>
                <option value="Annulée">Annulée</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs"
              >
                <option value="all">Tous les règlements</option>
                <option value="payee">Payées</option>
                <option value="non_payee">En attente / Impayées</option>
              </select>

              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-slate-500 font-semibold">{selectedOrderIds.length} sélectionnée(s)</span>
                  <button
                    type="button"
                    onClick={handleBulkConfirm}
                    className="py-1 px-2.5 bg-[#0d44e8] text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkMarkPaid}
                    className="py-1 px-2.5 bg-emerald-600 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Marquer Payées
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Orders List */}
          <div className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucune commande ne correspond aux filtres sélectionnés.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                const totalPaid = (order.installments || []).reduce((sum, i) => sum + (i.status === 'valide' ? i.amount : 0), 0) + (order.isPaid && (!order.installments || order.installments.length === 0) ? order.estimatedTotal : 0);
                const hasInstallments = (order.installments || []).length > 0;
                const isPartialPayment = totalPaid > 0 && totalPaid < order.estimatedTotal;

                return (
                  <div key={order.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOrder(order.id)}
                        className="mt-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#0d44e8]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono font-bold text-[#0d44e8]">
                            {order.reference}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {order.status}
                          </span>
                          
                          {/* Payment badge */}
                          {order.isPaid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Soldée (Payée)
                            </span>
                          ) : isPartialPayment ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Acompte : {totalPaid.toLocaleString('fr-FR')} F ({Math.round((totalPaid / order.estimatedTotal) * 100)}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                              Non payée
                            </span>
                          )}

                          {order.isPartialDelivery && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              Livraison Partielle
                            </span>
                          )}
                        </div>

                        <div className="text-slate-900 font-bold">
                          {order.customer.facilityName}
                          <span className="font-normal text-slate-500 ml-1.5">
                            · {order.customer.phone} · {order.customer.deliveryAddress}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500">
                          <span>
                            {order.items.length} article(s) · <strong className="text-slate-900 font-mono">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
                          </span>
                          <span>·</span>
                          <span className="text-blue-700 font-medium">
                            📍 {order.deliveryZone || order.customer.neighborhoodName || 'Libreville'}
                          </span>
                          {order.courier && (
                            <>
                              <span>·</span>
                              <span className="text-purple-700 font-medium">
                                🏍️ Coursier : {order.courier.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                      {/* WhatsApp Client Notification */}
                      <a
                        href={generateWhatsAppMessageForStage(
                          order, 
                          order.deliveryStage || (order.status === 'Livrée' ? 'delivered' : order.status === 'En préparation' ? 'preparation' : 'confirmed')
                        ).directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-300 flex items-center gap-1 transition-colors shadow-2xs"
                        title="Envoyer la notification WhatsApp personnalisée pour cette étape"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Mobile Money Reconciliation */}
                      <button
                        type="button"
                        onClick={() => setPaymentModalOrder(order)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Rapprochement bancaire Airtel/Moov avec contrôle anti-doublon"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rapprochement</span>
                      </button>

                      {/* Finance & Courier Management Modal */}
                      <button
                        type="button"
                        onClick={() => setFinanceModalOrder(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Gérer les acomptes, factures/avoirs, coursiers et preuve de livraison"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-700" />
                        <span>Finances & Coursier</span>
                      </button>

                      {/* Status Advances */}
                      {order.status === 'À confirmer' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(order.id, 'Confirmée')}
                          className="px-2.5 py-1 rounded-lg bg-[#0d44e8] hover:bg-blue-700 text-white font-bold cursor-pointer"
                        >
                          Confirmer
                        </button>
                      )}
                      {order.status === 'Confirmée' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(order.id, 'En préparation')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                        >
                          Colisage
                        </button>
                      )}
                      {order.status === 'En préparation' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(order.id, 'Livrée')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                        >
                          Livrée
                        </button>
                      )}
                      {order.status !== 'Livrée' && order.status !== 'Annulée' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancellationReason('');
                          }}
                          className="px-2 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STOCKS RÉELS & LOTS */}
      {activeTab === 'stock' && isGestionnaire && (
        <StockLotsModule
          products={products}
          currentUser={currentUser}
          onUpdateProduct={onProductSaved}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 5: PACKS & DOTATIONS */}
      {activeTab === 'packs' && isGestionnaire && (
        <AdminPacksModule
          packs={packs}
          products={products}
          currentUser={currentUser}
          onCreatePack={onCreatePack}
          onUpdatePack={onUpdatePack}
          onDeletePack={onDeletePack}
        />
      )}

      {/* TAB 6: CLIENTS B2B */}
      {activeTab === 'clients' && isSuperAdmin && (
        <EnterpriseClientsModule
          clients={clients}
          currentUser={currentUser}
          onUpdateClient={(updated) => {
            if (onUpdateClient) onUpdateClient(updated);
            onRefresh();
          }}
          onDeleteClientData={(id) => {
            if (onDeleteClientData) onDeleteClientData(id);
            onRefresh();
          }}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 7: JOURNAL D'AUDIT IMMUABLE */}
      {activeTab === 'audit' && isSuperAdmin && (
        <AuditLogModule />
      )}

      {/* TAB 8: PARAMÈTRES SANS CODE */}
      {activeTab === 'settings' && isSuperAdmin && (
        <SystemSettingsModule
          currentUser={currentUser}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 9: SAUVEGARDES, RESTAURATION & CLOUD */}
      {activeTab === 'export-deploy' && isSuperAdmin && (
        <DataExportModule
          products={products}
          orders={orders}
          clients={clients}
          packs={packs}
          notifications={[]}
          onDataRestored={onRefresh}
        />
      )}

      {/* Cancellation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-rose-700">Motif d'annulation requis</h3>
            <p className="text-slate-600">
              Veuillez préciser le motif d'annulation pour la commande <strong>{cancelModalOrder.reference}</strong> :
            </p>
            <textarea
              required
              rows={3}
              placeholder="Ex: Rupture fournisseur sur les cathéters..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancellationReason.trim()}
                className="py-1.5 px-3 rounded-lg bg-rose-700 text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        initialProduct={editingProduct}
        onSuccess={(p) => {
          onProductSaved(p);
          onRefresh();
        }}
      />

      {/* Message Modal */}
      <DirectMessagingModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        targetClient={targetMessageClient}
        onSuccess={() => onRefresh()}
      />

      {/* Mobile Money Modal with Duplicate Reference Detection */}
      {paymentModalOrder && (
        <MobilePaymentModal
          isOpen={Boolean(paymentModalOrder)}
          order={paymentModalOrder}
          allOrders={orders}
          onClose={() => setPaymentModalOrder(null)}
          onPaymentConfirmed={async (ref, operator, status) => {
            const isVerified = status !== 'failed';
            await onUpdatePayment(paymentModalOrder.id, isVerified);
            logAuditEvent(
              currentUser,
              'validation_paiement',
              'Rapprochement Mobile Money',
              paymentModalOrder.reference,
              `Rapprochement ${operator === 'airtel_money' ? 'Airtel Money' : 'Moov Money'} (Réf: ${ref}) : Statut=${status || 'verified'}`
            );
            onRefresh();
          }}
        />
      )}

      {/* Finance & Logistique Modal (Acomptes, Factures, Avoirs, Preuve de livraison) */}
      {financeModalOrder && (
        <OrderFinanceModal
          order={financeModalOrder}
          currentUser={currentUser}
          onClose={() => setFinanceModalOrder(null)}
          onUpdateOrder={(updated) => {
            if (onUpdateOrder) onUpdateOrder(updated);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
