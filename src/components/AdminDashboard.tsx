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
  CreditCard
} from 'lucide-react';
import { Order, OrderStatus, AdminStats, Pack, Product, User, AppRole } from '../types';
import { ProductFormModal } from './ProductFormModal';
import { BestClientsModule } from './BestClientsModule';
import { DirectMessagingModal } from './DirectMessagingModal';
import { ClientPurchasesStatsModule } from './ClientPurchasesStatsModule';
import { DataExportModule } from './DataExportModule';
import { generateWhatsAppMessageForStage } from '../utils/whatsappNotifications';

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
  defaultSubTab?: 'kpi' | 'orders' | 'packs' | 'stock' | 'clients' | 'stats-achats' | 'export-deploy';
  onOpenDeliveryModal?: (order: Order) => void;
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
  onOpenDeliveryModal
}) => {
  const role: AppRole = currentUser.role;
  const isSuperAdmin = role === 'Super-Admin';
  const isGestionnaire = role === 'Gestionnaire Catalogue' || isSuperAdmin;
  const isLogistique = role === 'Logistique' || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'kpi' | 'orders' | 'packs' | 'stock' | 'clients' | 'stats-achats' | 'export-deploy'>(defaultSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [targetMessageClient, setTargetMessageClient] = useState<any | null>(null);

  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return o.reference.toLowerCase().includes(q) || o.customer.facilityName.toLowerCase().includes(q);
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

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-5 px-2 sm:px-0">
      {/* Top Banner */}
      <div className="bg-[#0f0f12] text-white rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0d44e8] flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold">Portail Back-Office</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Connecté : <strong>{currentUser.contactName || currentUser.facilityName}</strong>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('kpi')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'kpi' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vue d'ensemble & KPIs
          </button>
        )}
        {isLogistique && (
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4 text-[#0d44e8]" />
            <span>Commandes ({orders.length})</span>
          </button>
        )}
        {isGestionnaire && (
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stock' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Catalogue & Stocks ({products.length})</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('stats-achats')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stats-achats' ? 'bg-[#0f0f12] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#0d44e8]" />
            <span>Statistiques Achats Clients</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'clients' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>Clients & Relances ({clients.length})</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('export-deploy')}
            className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export-deploy' ? 'bg-[#0f0f12] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Sauvegardes & Déploiement Cloud</span>
          </button>
        )}
      </div>

      {/* TAB 1: KPIS */}
      {activeTab === 'kpi' && isSuperAdmin && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Chiffre d'Affaires</span>
              <div className="text-base font-black text-slate-900 mt-1 tabular-nums">
                {stats.totalRevenue.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">F</span>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">À confirmer</span>
              <div className="text-lg font-black text-amber-900 mt-1">
                {stats.ordersToConfirm}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Commandes mois</span>
              <div className="text-lg font-black text-slate-900 mt-1">
                {stats.monthOrdersCount}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Panier Moyen</span>
              <div className="text-base font-black text-slate-900 mt-1 tabular-nums">
                {stats.averageBasket.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">F</span>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">Clients Inscrits</span>
              <div className="text-lg font-black text-slate-900 mt-1">
                {stats.totalClients}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Inactifs &gt; 10j</span>
              <div className="text-lg font-black text-rose-900 mt-1">
                {stats.inactiveClientsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS */}
      {activeTab === 'orders' && isLogistique && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher référence, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-[#0d44e8]">
                      {order.reference}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {order.status}
                    </span>
                    <label className="flex items-center gap-1 cursor-pointer font-bold ml-1">
                      <input
                        type="checkbox"
                        checked={order.isPaid}
                        onChange={(e) => onUpdatePayment(order.id, e.target.checked)}
                        className="rounded text-[#0d44e8]"
                      />
                      <span className={order.isPaid ? 'text-emerald-700' : 'text-slate-400'}>
                        {order.isPaid ? 'Payée' : 'Non payée'}
                      </span>
                    </label>
                  </div>
                  <div className="text-slate-800">
                    <strong>{order.customer.facilityName}</strong> · {order.customer.phone} · {order.customer.deliveryAddress}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-500">
                      {order.items.length} article(s) · <strong className="text-slate-900">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      📍 {order.deliveryZone || order.customer.neighborhoodName || 'Libreville'} · ⏱️ {order.deliveryEstimated || '~30-45 min'}
                    </span>
                  </div>

                  {/* Mobile Payment Validation Banner */}
                  {(order.mobilePayment || order.customer.paymentMethod === 'airtel_money' || order.customer.paymentMethod === 'moov_money') && (
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
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
                      {order.mobilePayment?.senderPhone && (
                        <span className="text-[10px] text-slate-500">
                          Payeur: {order.mobilePayment.senderPhone}
                        </span>
                      )}
                      {order.mobilePayment?.screenshotUrl && (
                        <a
                          href={order.mobilePayment.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1"
                        >
                          <span>Voir reçu SMS</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Transitions & WhatsApp Notification Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                  {/* Payment validation toggle */}
                  {!order.isPaid ? (
                    <button
                      type="button"
                      onClick={() => onUpdatePayment(order.id, true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-300 text-xs flex items-center gap-1 transition-colors"
                      title="Valider l'encaissement du paiement (Airtel/Moov/Espèces)"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Valider Paiement</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                      ✓ Payée
                    </span>
                  )}
                  {/* Automated WhatsApp Notification 1-Click Button */}
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
                    <span>WhatsApp Client</span>
                  </a>

                  {onOpenDeliveryModal && (
                    <button
                      type="button"
                      onClick={() => onOpenDeliveryModal(order)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold border border-purple-200 flex items-center gap-1"
                      title="Gérer le statut de livraison & le coursier"
                    >
                      <Truck className="w-3.5 h-3.5 text-purple-600" />
                      <span>{order.deliveryStage ? `Livraison : ${order.deliveryStage}` : 'Suivi Livreur'}</span>
                    </button>
                  )}
                  {order.status === 'À confirmer' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'Confirmée')}
                      className="px-2.5 py-1 rounded-lg bg-[#0d44e8] text-white font-bold"
                    >
                      Confirmer
                    </button>
                  )}
                  {order.status === 'Confirmée' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'En préparation')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold"
                    >
                      Colisage
                    </button>
                  )}
                  {order.status === 'En préparation' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'Livrée')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
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
                      className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STOCKS & CATALOG */}
      {activeTab === 'stock' && isGestionnaire && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher produit..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
              />
            </div>
            <button
              type="button"
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Produit</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {displayedProducts.map((p) => {
              const isRupture = p.status === 'rupture';
              return (
                <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[#6a6a6b] block truncate">{p.category}</span>
                    <h4 className="font-bold text-slate-900 truncate">{p.name}</h4>
                    <span className="text-[11px] text-slate-500">{p.variants.length} conditionnement(s)</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleProductStock(p.id, p.status)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        isRupture ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isRupture ? 'En rupture' : 'En stock'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CLIENTS */}
      {activeTab === 'clients' && isSuperAdmin && (
        <BestClientsModule
          clients={clients}
          commercials={[]}
          isSuperAdmin={isSuperAdmin}
          onRefreshClients={onRefresh}
          onOpenMessageModal={(c) => {
            setTargetMessageClient(c);
            setIsMessageModalOpen(true);
          }}
        />
      )}

      {/* TAB 5: STATISTIQUES ACHATS CLIENTS */}
      {activeTab === 'stats-achats' && isSuperAdmin && (
        <ClientPurchasesStatsModule
          orders={orders}
          clients={clients}
          products={products}
          onOpenMessageModal={(c) => {
            setTargetMessageClient(c);
            setIsMessageModalOpen(true);
          }}
        />
      )}

      {/* TAB 6: SAUVEGARDES, EXPORT & DÉPLOIEMENT CLOUD */}
      {activeTab === 'export-deploy' && isSuperAdmin && (
        <DataExportModule
          products={products}
          orders={orders}
          clients={clients}
          packs={packs}
          notifications={[]}
        />
      )}

      {/* Cancellation modal */}
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
                className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancellationReason.trim()}
                className="py-1.5 px-3 rounded-lg bg-rose-700 text-white font-bold disabled:opacity-50"
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
    </div>
  );
};
