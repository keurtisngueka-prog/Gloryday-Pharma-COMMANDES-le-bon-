import React, { useState } from 'react';
import { 
  Building2, 
  Package, 
  TrendingUp, 
  Clock, 
  RotateCcw, 
  FileText, 
  MessageCircle, 
  AlertCircle, 
  Truck, 
  Printer,
  Smartphone, 
  ShieldCheck, 
  Check, 
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { Order, OrderStatus, User, MobilePaymentDetails } from '../types';
import { generateInternalPurchaseOrderPdf } from '../utils/pdfGenerator';
import { api } from '../api';
import { MobilePaymentModal } from './MobilePaymentModal';

interface ClientDashboardProps {
  orders: Order[];
  currentUser: User | null;
  onReorder: (order: Order) => void;
  onOpenAuth: () => void;
  onRefreshOrders: () => void;
  onViewOrderPdf: (order: Order) => void;
  onTrackDelivery?: (order: Order) => void;
}

const GoogleIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  orders,
  currentUser,
  onReorder,
  onOpenAuth,
  onRefreshOrders,
  onViewOrderPdf,
  onTrackDelivery
}) => {
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'delivered' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const nonCancelledOrders = orders.filter(o => o.status !== 'Annulée');
  const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
  const pendingOrders = orders.filter(o => o.status === 'À confirmer' || o.status === 'Confirmée' || o.status === 'En préparation');
  const deliveredOrders = orders.filter(o => o.status === 'Livrée');
  const unpaidOrders = orders.filter(o => !o.isPaid && o.status !== 'Annulée');
  
  // Find active ongoing order for direct delivery spotlight
  const activeDeliveryOrder = orders.find(
    o => o.status !== 'Annulée' && o.status !== 'Livrée'
  ) || (orders.length > 0 ? orders[0] : null);

  const deliverySteps = [
    { key: 'preparation', label: '1. Colisage & Validation', desc: 'En préparation au dépôt' },
    { key: 'picked_up', label: '2. Pris en charge', desc: 'Coursier en départ' },
    { key: 'in_transit', label: '3. En acheminement', desc: 'Sur axe Libreville' },
    { key: 'delivered', label: '4. Livré & Émargé', desc: 'Mise à disposition' }
  ];

  const getDeliveryStageIndex = (stage?: string, status?: OrderStatus) => {
    if (stage === 'delivered' || status === 'Livrée') return 3;
    if (stage === 'in_transit') return 2;
    if (stage === 'picked_up') return 1;
    return 0; // preparation or À confirmer
  };

  const handleSaveMobilePayment = async (details: MobilePaymentDetails) => {
    if (!selectedPaymentOrder) return;
    try {
      await api.updateOrderMobilePayment(selectedPaymentOrder.id, details);
      onRefreshOrders();
    } catch (e) {
      console.error('Failed to update mobile payment', e);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter === 'in_progress' && (order.status === 'Livrée' || order.status === 'Annulée')) return false;
    if (statusFilter === 'delivered' && order.status !== 'Livrée') return false;
    if (statusFilter === 'unpaid' && (order.isPaid || order.status === 'Annulée')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = order.reference.toLowerCase().includes(q);
      const matchItems = order.items.some(i => i.productName.toLowerCase().includes(q));
      if (!matchRef && !matchItems) return false;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-6 px-2 sm:px-0">
      {/* 1. MODERN HEADER & PROFILE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-inner">
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.facilityName} 
                  className="w-full h-full rounded-2xl object-cover" 
                />
              ) : currentUser ? (
                currentUser.facilityName.charAt(0).toUpperCase()
              ) : (
                <Building2 className="w-8 h-8 text-blue-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {currentUser ? currentUser.facilityName : 'Espace Client & Pharmacie Hospitalière'}
                </h1>
                {currentUser?.facilityType && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {currentUser.facilityType}
                  </span>
                )}
                {currentUser?.authProvider === 'google' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-900 shadow-xs">
                    <GoogleIcon className="w-3.5 h-3.5" />
                    <span>Google Connecté</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                {currentUser?.phone && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp : <strong>{currentUser.phone}</strong>
                  </span>
                )}
                {currentUser?.deliveryAddress && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {currentUser.deliveryAddress}
                  </span>
                )}
                {currentUser?.email && (
                  <span className="text-slate-400">
                    ({currentUser.email})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4" />
                <span>Se connecter</span>
              </button>
            ) : (
              <a
                href="https://wa.me/24177003004"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Support Pharmacie 24/7</span>
              </a>
            )}
            <button
              type="button"
              onClick={onRefreshOrders}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* 2. MODERN HEALTHCARE KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold">Total Commandes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{deliveredOrders.length} livrées avec succès</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#0d44e8]">En cours d'envoi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0d44e8] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0d44e8]">{pendingOrders.length}</div>
          <div className="text-[11px] text-blue-700 mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Livraison express Libreville</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold">Dépenses Cumulées</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {totalSpent.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Facturation conforme OHADA</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold">Paiements en attente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800">{unpaidOrders.length}</div>
          <div className="text-[11px] text-amber-700 mt-1">
            {unpaidOrders.length === 0 ? 'Toutes vos commandes sont réglées' : 'Airtel Money, Moov ou Espèces'}
          </div>
        </div>
      </div>

      {/* 3. SPOTLIGHT : DIRECT LIVE DELIVERY TRACKING (MODERN TRACKER) */}
      {activeDeliveryOrder && activeDeliveryOrder.status !== 'Annulée' && (
        <div className="bg-white rounded-3xl border border-blue-200 shadow-md p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#0d44e8] border border-blue-200">
                  Suivi Direct en Temps Réel
                </span>
                <span className="text-xs text-slate-500">
                  Réf : <strong className="text-slate-900 font-mono">{activeDeliveryOrder.reference}</strong>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Livraison à {activeDeliveryOrder.customer.facilityName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDeliveryOrder.customer.deliveryAddress} · {activeDeliveryOrder.items.length} produit(s) · {activeDeliveryOrder.estimatedTotal.toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onTrackDelivery && (
                <button
                  type="button"
                  onClick={() => onTrackDelivery(activeDeliveryOrder)}
                  className="py-2 px-3.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Détails & Géolocalisation</span>
                </button>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                activeDeliveryOrder.status === 'Livrée'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-50 text-[#0d44e8] border border-blue-200'
              }`}>
                {activeDeliveryOrder.status}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {deliverySteps.map((step, idx) => {
              const currentStepIdx = getDeliveryStageIndex(activeDeliveryOrder.deliveryStage, activeDeliveryOrder.status);
              const isDone = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="relative">
                  <div className={`p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-50/80 border-[#0d44e8] shadow-xs'
                      : isDone
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? 'bg-[#0d44e8] text-white shadow-xs'
                          : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                      )}
                    </div>
                    <div className={`text-xs font-bold ${isCurrent ? 'text-[#0d44e8]' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Courier Card & Direct Contact (Only if assigned) */}
          {activeDeliveryOrder.courier && (
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                  <Truck className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Coursier Certifié : {activeDeliveryOrder.courier.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-200 text-slate-700">
                      {activeDeliveryOrder.courier.matricule}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {activeDeliveryOrder.courier.vehicle} · {activeDeliveryOrder.courier.currentZone || 'Acheminement express'}
                  </div>
                </div>
              </div>

              <a
                href={`https://wa.me/${(activeDeliveryOrder.courier.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${activeDeliveryOrder.courier.name}, je vous contacte concernant la commande ${activeDeliveryOrder.reference} pour ${activeDeliveryOrder.customer.facilityName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-center"
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>Joindre le coursier (+241)</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* 4. ORDERS HISTORY & INTERACTIVE ACTIONS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table header with search & filter chips */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Historique des Commandes & Facturation ({filteredOrders.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultez vos reçus, téléchargez vos bons de commande PDF et effectuez un réassort en 1 clic.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher réf ou produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0d44e8] w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Filter chips bar */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Toutes ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
              statusFilter === 'in_progress' ? 'bg-[#0d44e8] text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>En cours ({pendingOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
              statusFilter === 'delivered' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Livrées ({deliveredOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
              statusFilter === 'unpaid' ? 'bg-amber-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>À régler ({unpaidOrders.length})</span>
          </button>
        </div>

        {/* Orders List items */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Aucune commande ne correspond à ce filtre.</p>
            <p className="text-xs text-slate-400">Consultez notre catalogue pour initier un approvisionnement médical.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => {
              const mp = order.mobilePayment || order.customer.mobilePayment;
              const isMobilePayment = order.customer.paymentMethod === 'airtel_money' || 
                                     order.customer.paymentMethod === 'moov_money' || 
                                     !!mp;

              return (
                <div key={order.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs text-[#0d44e8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {order.reference}
                      </span>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        order.status === 'Livrée'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Annulée'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-[#0d44e8]'
                      }`}>
                        {order.status}
                      </span>

                      {order.isPaid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Payée</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          En attente de paiement
                        </span>
                      )}

                      {/* Mobile Payment details */}
                      {isMobilePayment && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          (mp?.provider || order.customer.paymentMethod) === 'airtel_money'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          <Smartphone className="w-3 h-3" />
                          <span>{(mp?.provider || order.customer.paymentMethod) === 'airtel_money' ? 'Airtel Money' : 'Moov Money'}</span>
                          {mp?.transactionReference && (
                            <span className="font-mono text-[9px] text-slate-700 bg-white px-1 rounded ml-0.5">
                              {mp.transactionReference}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span>·</span>
                      <span>{order.items.length} article(s)</span>
                      <span>·</span>
                      <span className="text-slate-900 font-bold text-sm">
                        {order.estimatedTotal.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {/* Items preview preview */}
                    <div className="text-[11px] text-slate-400 line-clamp-1">
                      {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 self-end lg:self-center flex-wrap">
                    {/* Mobile Payment Verification button */}
                    {isMobilePayment && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentOrder(order)}
                        className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer border shadow-2xs transition-colors ${
                          mp?.transactionReference
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Vérifier ou valider la référence de paiement mobile"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{mp?.transactionReference ? 'Réf. Validée' : 'Régler par SMS'}</span>
                      </button>
                    )}

                    {onTrackDelivery && (
                      <button
                        type="button"
                        onClick={() => onTrackDelivery(order)}
                        className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs flex items-center gap-1 cursor-pointer border border-blue-200"
                        title="Suivi de livraison en direct & contact coursier"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Suivi Livreur</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onViewOrderPdf(order)}
                      className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { blob } = await generateInternalPurchaseOrderPdf(order, {
                            department: 'Bloc Chirurgical / Pharmacie',
                            requesterTitle: order.customer.contactName || 'Major de Bloc'
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Bon_Visa_Interne_${order.reference}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        } catch (e) {
                          console.error('Error generating visa pdf', e);
                        }
                      }}
                      className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Télécharger la fiche de visas hiérarchiques A4"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Visa A4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onReorder(order)}
                      className="py-1.5 px-3.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Recharger ces articles dans le panier"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Recommander</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MOBILE PAYMENT MODAL FOR DIRECT SETTLEMENT */}
      {selectedPaymentOrder && (
        <MobilePaymentModal
          isOpen={true}
          onClose={() => setSelectedPaymentOrder(null)}
          order={selectedPaymentOrder}
          allOrders={orders}
          onPaymentConfirmed={async (transactionId, operator, status) => {
            await handleSaveMobilePayment({
              provider: operator,
              merchantPhone: operator === 'moov_money' ? '066240399' : '077003004',
              transactionReference: transactionId,
              senderPhone: selectedPaymentOrder.customer.phone,
              status: status || 'submitted',
              validatedAt: new Date().toISOString()
            });
          }}
        />
      )}
    </div>
  );
};
