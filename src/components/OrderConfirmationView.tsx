import React, { useState } from 'react';
import { 
  CheckCircle2, 
  MessageCircle, 
  Download, 
  Eye, 
  Copy, 
  Check, 
  Clock 
} from 'lucide-react';
import { Order } from '../types';
import { generateWhatsAppOrderUrl } from '../utils/whatsapp';

interface OrderConfirmationViewProps {
  order: Order;
  pdfDataUrl?: string;
  onNewOrder: () => void;
  onViewDashboard: () => void;
  onTrackOrder?: (order: Order) => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order,
  pdfDataUrl,
  onNewOrder,
  onViewDashboard,
  onTrackOrder
}) => {
  const [copied, setCopied] = useState(false);
  const [useSecondaryNumber, setUseSecondaryNumber] = useState(false);

  const primaryUrl = generateWhatsAppOrderUrl(order, order.pdfUrl, false);
  const secondaryUrl = generateWhatsAppOrderUrl(order, order.pdfUrl, true);
  const currentWhatsAppUrl = useSecondaryNumber ? secondaryUrl : primaryUrl;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(order.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <span className="text-slate-400 block text-[10px] uppercase">Contact</span>
            <strong className="text-slate-900 block truncate">{order.customer.phone}</strong>
          </div>
        </div>
      </div>

      {/* PDF Actions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 text-left">
        <span className="text-xs font-bold text-slate-900 block mb-2">
          Bon de commande officiel (PDF)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Télécharger PDF
          </button>
          <button
            type="button"
            onClick={handleOpenPdf}
            className="h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            Visualiser
          </button>
        </div>
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
        <button
          type="button"
          onClick={onNewOrder}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0f0f12] text-white text-xs font-bold hover:bg-black cursor-pointer"
        >
          Nouvelle commande
        </button>
      </div>
    </div>
  );
};
