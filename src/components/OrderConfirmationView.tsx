import React, { useState } from 'react';
import { 
  CheckCircle2, 
  MessageCircle, 
  Download, 
  Eye, 
  Copy, 
  Check, 
  Clock,
  Printer,
  Smartphone,
  ShieldCheck,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { Order, MobilePaymentDetails } from '../types';
import { generateWhatsAppOrderUrl } from '../utils/whatsapp';
import { generateInternalPurchaseOrderPdf } from '../utils/pdfGenerator';
import { api } from '../api';
import { MobilePaymentModal } from './MobilePaymentModal';

interface OrderConfirmationViewProps {
  order: Order;
  pdfDataUrl?: string;
  onNewOrder: () => void;
  onViewDashboard: () => void;
  onTrackOrder?: (order: Order) => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order: initialOrder,
  pdfDataUrl,
  onNewOrder,
  onViewDashboard,
  onTrackOrder
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [copied, setCopied] = useState(false);
  const [copiedUssd, setCopiedUssd] = useState(false);
  const [useSecondaryNumber, setUseSecondaryNumber] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [validationSuccessToast, setValidationSuccessToast] = useState<string | null>(null);

  const primaryUrl = generateWhatsAppOrderUrl(order, order.pdfUrl, false);
  const secondaryUrl = generateWhatsAppOrderUrl(order, order.pdfUrl, true);
  const currentWhatsAppUrl = useSecondaryNumber ? secondaryUrl : primaryUrl;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(order.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMobilePayment = async (details: MobilePaymentDetails) => {
    try {
      const updated = await api.updateOrderMobilePayment(order.id, details);
      setOrder(updated);
      setValidationSuccessToast('Paiement mobile enregistré et associé à votre commande !');
      setTimeout(() => setValidationSuccessToast(null), 4000);
    } catch (e) {
      console.error('Error updating order mobile payment', e);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfDataUrl) return;
    const link = document.createElement('a');
    link.href = pdfDataUrl;
    link.download = `Bon_de_Commande_${order.reference}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPdf = () => {
    if (!pdfDataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${pdfDataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center">
      {/* Success Icon */}
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">
        Commande enregistrée
      </h1>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
        Votre demande a été enregistrée avec succès. Transmettez-la sur WhatsApp pour confirmation instantanée.
      </p>

      {/* Reference Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 text-left shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Numéro de Commande
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-mono font-black text-[#0d44e8]">
                {order.reference}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="text-slate-400 hover:text-slate-700 p-1"
                title="Copier"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total estimé
            </span>
            <span className="text-base font-black text-slate-900 tabular-nums">
              {order.estimatedTotal.toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-slate-400 block">Sans TVA</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Établissement</span>
            <strong className="text-slate-900 block truncate">{order.customer.facilityName}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Contact WhatsApp</span>
            <strong className="text-slate-900 block truncate">{order.customer.phone}</strong>
          </div>
        </div>

        {/* Neighborhood & Delay estimation */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="text-base">📍</span>
            <span>Destination : <strong className="text-slate-900">{order.deliveryZone || order.customer.neighborhoodName || 'Libreville'}</strong></span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
            ⏱️ {order.deliveryEstimated || 'Délai : ~30 - 45 min'}
          </span>
        </div>
      </div>

      {/* PDF Actions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 text-left">
        <span className="text-xs font-bold text-slate-900 block mb-2">
          Documents officiels imprimables (PDF)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Bon Commande
          </button>
          <button
            type="button"
            onClick={handleOpenPdf}
            className="h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            Visualiser
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
            className="h-10 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Bon de Demande d'Achat avec cases de signatures et visas direction"
          >
            <Printer className="w-3.5 h-3.5 text-[#0d44e8]" />
            Bon de Visa (A4)
          </button>
        </div>
      </div>

      {/* Toast feedback if recently validated */}
      {validationSuccessToast && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{validationSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationSuccessToast(null)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile Payment Validation Module (Airtel Money / Moov Money) */}
      <div className={`rounded-2xl p-4 mb-4 text-left border shadow-xs transition-all ${
        order.mobilePayment?.provider === 'airtel_money' || order.customer.paymentMethod === 'airtel_money'
          ? 'bg-red-50/60 border-red-200'
          : order.mobilePayment?.provider === 'moov_money' || order.customer.paymentMethod === 'moov_money'
            ? 'bg-blue-50/60 border-blue-200'
            : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              order.mobilePayment?.provider === 'airtel_money' || order.customer.paymentMethod === 'airtel_money'
                ? 'bg-red-600'
                : 'bg-[#0d44e8]'
            }`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Validation Paiement Mobile Gabon
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  order.mobilePayment?.provider === 'airtel_money' || order.customer.paymentMethod === 'airtel_money'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                  {order.mobilePayment?.provider === 'moov_money' || order.customer.paymentMethod === 'moov_money'
                    ? 'Moov Money (*555#)'
                    : 'Airtel Money (*150#)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Compte marchand Gloryday : <strong className="text-slate-800 font-mono">
                  {order.mobilePayment?.provider === 'moov_money' || order.customer.paymentMethod === 'moov_money'
                    ? '066 24 03 99'
                    : '077 00 30 04'}
                </strong> · Net à payer : <strong className="text-slate-900">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Status preview banner */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 mb-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Statut du versement :</span>
            {order.mobilePayment?.transactionReference ? (
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 text-[11px]">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                Référence SMS Validée
              </span>
            ) : (
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                En attente d'ID SMS
              </span>
            )}
          </div>

          {order.mobilePayment?.transactionReference ? (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <span className="text-slate-600">ID Transaction : <strong className="font-mono text-slate-900">{order.mobilePayment.transactionReference}</strong></span>
              <span className="text-[10px] text-emerald-700 font-bold">✓ Prêt pour WhatsApp</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 pt-0.5">
              Si vous avez déjà transféré les fonds ou dès réception du SMS d'Airtel/Moov, renseignez le code pour accélérer le traitement prioritaire de votre commande.
            </p>
          )}

          {order.mobilePayment?.screenshotUrl && (
            <div className="pt-1 flex items-center gap-2">
              <img src={order.mobilePayment.screenshotUrl} alt="Reçu" className="w-8 h-8 object-cover rounded border border-slate-200" />
              <span className="text-[11px] font-semibold text-emerald-800">Preuve de versement attachée</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsMobileModalOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:border-slate-400 font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {order.mobilePayment?.transactionReference
              ? 'Modifier ou vérifier la référence SMS'
              : 'Valider mon règlement mobile (Saisir référence SMS)'}
          </span>
        </button>
      </div>

      {/* WhatsApp Transmission */}
      <div className="bg-white border-2 border-emerald-500 rounded-2xl p-5 mb-5 shadow-lg text-left">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Transmission sur WhatsApp
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Cliquez ci-dessous pour ouvrir le message préformaté dans WhatsApp et valider l'envoi auprès de notre service commercial.
            </p>
          </div>
        </div>

        {/* Number choice */}
        <div className="mb-3 p-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Ligne WhatsApp :</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUseSecondaryNumber(false)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                !useSecondaryNumber ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              +241 77 003 004
            </button>
            <button
              type="button"
              onClick={() => setUseSecondaryNumber(true)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                useSecondaryNumber ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              +241 66 240 399
            </button>
          </div>
        </div>

        {/* CTA */}
        <a
          href={currentWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all text-center"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Envoyer la commande sur WhatsApp</span>
        </a>

        <div className="mt-2.5 flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Confirmation et délai de livraison en moins de 2 minutes.</span>
        </div>
      </div>

      {/* Secondary links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
        {onTrackOrder && (
          <button
            type="button"
            onClick={() => onTrackOrder(order)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-50 text-[#0d44e8] font-bold text-xs border border-blue-200 hover:bg-blue-100 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>🛵 Suivre la livraison en direct</span>
          </button>
        )}
        <button
          type="button"
          onClick={onViewDashboard}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          Mes commandes
        </button>
      </div>

      {/* Interactive Mobile Payment Validation Modal */}
      <MobilePaymentModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        orderTotal={order.estimatedTotal}
        orderReference={order.reference}
        facilityName={order.customer.facilityName}
        initialProvider={order.mobilePayment?.provider || (order.customer.paymentMethod === 'moov_money' ? 'moov_money' : 'airtel_money')}
        initialDetails={order.mobilePayment || {
          provider: order.customer.paymentMethod === 'moov_money' ? 'moov_money' : 'airtel_money',
          merchantPhone: order.customer.paymentMethod === 'moov_money' ? '066240399' : '077003004',
          senderPhone: order.customer.phone
        }}
        onSavePayment={handleSaveMobilePayment}
      />
    </div>
  );
};
