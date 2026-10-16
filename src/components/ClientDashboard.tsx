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
  FileCheck2
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

  const nonCancelledOrders = orders.filter(o => o.status !== 'Annulée');
  const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
  const pendingOrders = orders.filter(o => o.status === 'À confirmer' || o.status === 'Confirmée' || o.status === 'En préparation');
  const latestOrder = orders.length > 0 ? orders[0] : null;

  const steps = [
    { label: 'À confirmer', desc: 'Reçue WhatsApp' },
    { label: 'Confirmée', desc: 'Validée' },
    { label: 'En préparation', desc: 'Colisage' },
    { label: 'Livrée', desc: 'Mise à disposition' }
  ];

  const getStatusStepIndex = (status: OrderStatus) => {
    if (status === 'À confirmer') return 0;
    if (status === 'Confirmée') return 1;
    if (status === 'En préparation') return 2;
    if (status === 'Livrée') return 3;
    return -1;
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

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-5 px-2 sm:px-0">
      {/* Client Profile Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#eef3ff] text-[#0d44e8] font-bold text-xl flex items-center justify-center shrink-0">
            {currentUser ? currentUser.facilityName.charAt(0).toUpperCase() : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {currentUser ? currentUser.facilityName : 'Espace Client & Commandes'}
              </h1>
              {currentUser?.facilityType && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {currentUser.facilityType}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6a6a6b] mt-0.5">
              {currentUser?.phone ? `WhatsApp : ${currentUser.phone}` : 'Historique local de vos commandes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentUser ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3.5 py-2 rounded-xl bg-[#0d44e8] text-white text-xs font-bold hover:bg-[#0b3ac7] cursor-pointer"
            >
              Se connecter
            </button>
          ) : (
            <a
              href="https://wa.me/24177003004"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contact Commercial</span>
            </a>
          )}
          <button
            type="button"
            onClick={onRefreshOrders}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">Commandes</span>
          <span className="text-lg sm:text-xl font-black text-slate-900">{orders.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">En cours</span>
          <span className="text-lg sm:text-xl font-black text-[#0d44e8]">{pendingOrders.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">Dépenses (sans TVA)</span>
          <span className="text-base sm:text-xl font-black text-slate-900 tabular-nums">
            {totalSpent.toLocaleString('fr-FR')} <span className="text-[11px] font-bold text-slate-500">F</span>
          </span>
        </div>
      </div>

      {/* Latest Order Tracking */}
      {latestOrder && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d44e8] block">
                Dernière commande en cours
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-0.5">
                {latestOrder.reference} · {new Date(latestOrder.createdAt).toLocaleDateString('fr-FR')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {onTrackDelivery && (
                <button
                  type="button"
                  onClick={() => onTrackDelivery(latestOrder)}
                  className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Suivi & Contact Livreur</span>
                </button>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                latestOrder.status === 'Livrée'
                  ? 'bg-emerald-100 text-emerald-800'
                  : latestOrder.status === 'Annulée'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-blue-50 text-[#0d44e8]'
              }`}>
                {latestOrder.status}
              </span>
            </div>
          </div>

          {latestOrder.status !== 'Annulée' ? (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              {steps.map((st, i) => {
                const currentIdx = getStatusStepIndex(latestOrder.status);
                const isPassed = i <= currentIdx;
                const isCurrent = i === currentIdx;

                return (
                  <div key={st.label} className="text-center">
                    <div className="relative flex items-center justify-center mb-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#0d44e8] text-white ring-4 ring-blue-100 shadow-xs'
                          : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isPassed && !isCurrent ? '✓' : i + 1}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold block ${isCurrent ? 'text-[#0d44e8]' : isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                      {st.label}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:block">
                      {st.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Commande annulée : {latestOrder.cancellationReason || 'Non spécifié'}</span>
            </div>
          )}
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Historique des commandes ({orders.length})
          </h3>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucune commande enregistrée. Vos achats apparaîtront ici.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const mp = order.mobilePayment || order.customer.mobilePayment;
              const isMobilePayment = order.customer.paymentMethod === 'airtel_money' || 
                                     order.customer.paymentMethod === 'moov_money' || 
                                     !!mp;

              return (
                <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[#0d44e8]">
                        {order.reference}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {order.status}
                      </span>
                      {order.isPaid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Payée</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Non payée
                        </span>
                      )}

                      {/* Mobile Payment Badge */}
                      {isMobilePayment && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          (mp?.provider || order.customer.paymentMethod) === 'airtel_money'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          <Smartphone className="w-3 h-3" />
                          <span>{(mp?.provider || order.customer.paymentMethod) === 'airtel_money' ? 'Airtel Money' : 'Moov Money'}</span>
                          {mp?.transactionReference && (
                            <span className="font-mono text-[9px] text-slate-700 bg-white/80 px-1 rounded ml-0.5">
                              {mp.transactionReference}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')} · {order.items.length} article(s) · <strong className="text-slate-900">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                    {/* Mobile Payment Validation / Status Button */}
                    {isMobilePayment && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentOrder(order)}
                        className={`py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer border shadow-2xs transition-colors ${
                          mp?.transactionReference
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Vérifier ou valider la référence de paiement mobile"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{mp?.transactionReference ? 'Réf. Validée' : 'Régler / Valider SMS'}</span>
                      </button>
                    )}

                    {onTrackDelivery && (
                      <button
                        type="button"
                        onClick={() => onTrackDelivery(order)}
                        className="py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs flex items-center gap-1 cursor-pointer border border-blue-200"
                        title="Suivi de livraison en direct & contact coursier"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Suivi Livreur</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onViewOrderPdf(order)}
                      className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
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
                      className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Télécharger la fiche de visas hiérarchiques A4"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Visa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onReorder(order)}
                      className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Recommander ces articles au panier"
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

      {/* Mobile Payment Modal for Client Dashboard */}
      {selectedPaymentOrder && (
        <MobilePaymentModal
          isOpen={true}
          onClose={() => setSelectedPaymentOrder(null)}
          orderTotal={selectedPaymentOrder.estimatedTotal}
          orderReference={selectedPaymentOrder.reference}
          facilityName={selectedPaymentOrder.customer.facilityName}
          initialProvider={
            selectedPaymentOrder.mobilePayment?.provider || 
            (selectedPaymentOrder.customer.paymentMethod === 'moov_money' ? 'moov_money' : 'airtel_money')
          }
          initialDetails={selectedPaymentOrder.mobilePayment || {
            provider: selectedPaymentOrder.customer.paymentMethod === 'moov_money' ? 'moov_money' : 'airtel_money',
            merchantPhone: selectedPaymentOrder.customer.paymentMethod === 'moov_money' ? '066240399' : '077003004',
            senderPhone: selectedPaymentOrder.customer.phone
          }}
          onSavePayment={handleSaveMobilePayment}
        />
      )}
    </div>
  );
};
