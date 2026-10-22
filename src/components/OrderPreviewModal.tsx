import React from 'react';
import { FileText, ArrowLeft, CheckCircle2, Building2, MapPin, Phone } from 'lucide-react';
import { CartItem, CustomerInfo } from '../types';
import { calculateCartVolumeSummary, calculateItemVolumePrice } from '../utils/volumeDiscount';

interface OrderPreviewModalProps {
  items: CartItem[];
  customer: CustomerInfo;
  onConfirm: () => void;
  onBackToEdit: () => void;
  isSubmitting: boolean;
}

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({
  items,
  customer,
  onConfirm,
  onBackToEdit,
  isSubmitting
}) => {
  const quoteItems = items.filter(it => it.isQuote);
  const volumeSummary = calculateCartVolumeSummary(items);
  const deliveryFee = customer.deliveryFee || 0;
  const grandTotal = volumeSummary.netTotal + deliveryFee;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0d44e8]" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                Aperçu du bon de commande
              </h3>
              <p className="text-[11px] text-slate-500">
                Vérifiez les articles et vos coordonnées avant transmission
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBackToEdit}
            disabled={isSubmitting}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Modifier
          </button>
        </div>

        {/* Scrollable Document Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Header Info */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <span className="font-black text-base text-slate-900 block">GLORYDAY PHARMA</span>
              <p className="text-xs text-slate-500">Distribution Médicale · Libreville, Gabon</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Document</span>
              <span className="text-xs font-bold text-slate-900 block">Bon de commande</span>
              <span className="text-[11px] text-slate-500">{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          {/* Client summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Établissement</span>
              <p className="font-bold text-slate-900">{customer.facilityName}</p>
              <p className="text-slate-600">{customer.contactName}</p>
              <p className="text-slate-600">{customer.phone}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Livraison & Règlement</span>
              <p className="text-slate-800 font-medium">{customer.deliveryAddress}</p>
              <div className="mt-1 flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                <span>⏱️ {customer.deliveryMode === 'retrait' ? 'Prêt sous 20 à 30 min (Dépôt Oloumi)' : `Délai estimé : ${customer.neighborhoodName ? `${customer.neighborhoodName}` : 'Grand Libreville'}`}</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Mode : <strong>{customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait au dépôt'}</strong> · 
                Paiement : <strong>{customer.paymentMethod.replace('_', ' ').toUpperCase()}</strong>
              </p>
              {customer.mobilePayment && (customer.paymentMethod === 'airtel_money' || customer.paymentMethod === 'moov_money') && (
                <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{customer.mobilePayment.provider === 'airtel_money' ? 'Airtel Money Gabon' : 'Moov Money Gabon'}</span>
                    <span className={customer.mobilePayment.isPrePaid ? 'text-emerald-700 font-bold' : 'text-blue-700'}>
                      {customer.mobilePayment.isPrePaid ? '✓ Pré-payé' : 'À la réception'}
                    </span>
                  </div>
                  {customer.mobilePayment.transactionReference ? (
                    <div className="font-mono text-slate-700 truncate">
                      ID Transaction : <strong className="text-slate-900">{customer.mobilePayment.transactionReference}</strong>
                    </div>
                  ) : (
                    <div className="text-amber-700 italic">Référence SMS transmissible après confirmation</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Article</th>
                  <th className="py-2.5 px-3 text-center">Qté</th>
                  <th className="py-2.5 px-3 text-right">PU (FCFA)</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const itemCalc = calculateItemVolumePrice(item.price, item.quantity, item.isQuote);
                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 block">{item.productName}</span>
                          {itemCalc.discountPercent > 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                              -{itemCalc.discountPercent}%
                            </span>
                          )}
                        </div>
                        {item.variant && item.variant !== 'Standard' && (
                          <span className="text-[11px] text-slate-500">{item.variant}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {item.isQuote ? 'Sur devis' : itemCalc.discountedUnitPrice.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {item.isQuote ? 'Sur devis' : itemCalc.totalWithDiscount.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pt-2">
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>• Prix en FCFA hors taxes — Non soumis à la TVA (Sans TVA)</p>
              <p>• Validité de l'offre : 15 jours</p>
              {volumeSummary.totalSavings > 0 && (
                <p className="text-emerald-700 font-bold">
                  ✨ Remise volume appliquée : -{volumeSummary.totalSavings.toLocaleString('fr-FR')} FCFA
                </p>
              )}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right w-full sm:w-auto min-w-[200px]">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total net estimé</span>
              <span className="text-xl font-black text-slate-900 tabular-nums">
                {grandTotal.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onBackToEdit}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-11 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Modifier le panier
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            style={{
              boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
            }}
          >
            {isSubmitting ? (
              <span>Génération du bon...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer la commande et préparer le bon PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
