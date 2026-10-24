import React, { useState } from 'react';
import { Download, Printer, FileText, X, CheckCircle2, Building2, Phone, MapPin } from 'lucide-react';
import { Order } from '../types';
import {
  downloadOrderPdf,
  generateInternalPurchaseOrderPdf,
  triggerPdfBlobDownload
} from '../utils/pdfGenerator';

interface OrderPdfDocumentModalProps {
  order: Order;
  pdfDataUrl?: string;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  especes: 'Espèces à la livraison',
  airtel_money: 'Airtel Money Gabon',
  moov_money: 'Moov Money Gabon',
  virement: 'Virement bancaire'
};

export const OrderPdfDocumentModal: React.FC<OrderPdfDocumentModalProps> = ({
  order,
  pdfDataUrl,
  onClose
}) => {
  const [docMode, setDocMode] = useState<'order' | 'visa'>('order');
  const [downloadingOrder, setDownloadingOrder] = useState(false);
  const [downloadingVisa, setDownloadingVisa] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const createdAt = new Date(order.createdAt);
  const formattedDate = Number.isNaN(createdAt.getTime())
    ? new Date().toLocaleDateString('fr-FR')
    : createdAt.toLocaleDateString('fr-FR');

  const itemsSubtotal = (order.items || []).reduce(
    (sum, item) => sum + (item.isQuote ? 0 : (Number(item.total) || Number(item.price) * Number(item.quantity))),
    0
  );
  const totalSavings = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.savings) || 0),
    0
  );
  const deliveryFee = Number(order.deliveryFee ?? order.customer.deliveryFee) || 0;
  const orderTotal = Number(order.estimatedTotal) || itemsSubtotal + deliveryFee;
  const mobilePayment = order.mobilePayment || order.customer.mobilePayment;

  const handleDownloadOrderPdf = async () => {
    setPdfError(null);
    setDownloadingOrder(true);
    try {
      await downloadOrderPdf(order, pdfDataUrl || order.pdfUrl);
    } catch (error) {
      console.error('Échec du téléchargement du bon de commande PDF.', error);
      setPdfError('Le téléchargement du bon PDF a échoué. Réessayez dans un instant.');
    } finally {
      setDownloadingOrder(false);
    }
  };

  const handleDownloadVisaPdf = async () => {
    setPdfError(null);
    setDownloadingVisa(true);
    try {
      const { blob } = await generateInternalPurchaseOrderPdf(order, {
        department: 'Bloc Chirurgical / Pharmacie Centrale',
        requesterTitle: order.customer.contactName || 'Major de Bloc'
      });
      triggerPdfBlobDownload(blob, `Bon_Visa_Interne_${order.reference}.pdf`);
    } catch (error) {
      console.error('Échec de la génération de la fiche Visa PDF.', error);
      setPdfError('La fiche Visa PDF n’a pas pu être générée. Réessayez dans un instant.');
    } finally {
      setDownloadingVisa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5">
      <div className="bg-slate-100 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
        {/* Top Action Bar */}
        <div className="p-3 sm:px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white shrink-0">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center shrink-0 border border-blue-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Bon de Commande PDF — {order.reference}
              </h3>
              <p className="text-[11px] text-slate-500">
                {order.customer.facilityName} · {orderTotal.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 mr-1">
              <button
                type="button"
                onClick={() => setDocMode('order')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  docMode === 'order' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bon de Commande
              </button>
              <button
                type="button"
                onClick={() => setDocMode('visa')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  docMode === 'visa' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fiche Visas A4
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleDownloadOrderPdf()}
              disabled={downloadingOrder}
              className="px-3 py-1.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingOrder ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadVisaPdf()}
              disabled={downloadingVisa}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Télécharger la fiche de validation hiérarchique à 3 signatures"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{downloadingVisa ? 'Préparation...' : 'PDF Visa A4'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fermer</span>
            </button>
          </div>
        </div>

        {pdfError && (
          <p role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 sm:mx-5">
            {pdfError}
          </p>
        )}

        {/* Scrollable A4 Document Sheet */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="bg-white max-w-3xl mx-auto rounded-xl shadow-lg border border-slate-200 overflow-hidden text-left">
            {/* Official Top Blue/Slate Banner */}
            <div className={`${docMode === 'order' ? 'bg-[#0d44e8]' : 'bg-slate-800'} text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
              <div>
                <div className="text-base sm:text-lg font-black tracking-tight">
                  {docMode === 'order' ? 'GLORYDAY PHARMA' : "FICHE DE DEMANDE D'ENGAGEMENT & VISA INTERNE"}
                </div>
                <div className="text-[11px] text-white/85">
                  {docMode === 'order'
                    ? 'Distribution médicale, consommables et équipements hospitaliers'
                    : 'Gloryday Pharma Gabon · Circuit de Validation Hiérarchique Clinique & Hôpital'}
                </div>
              </div>
              <div className="text-[11px] sm:text-right text-white/90 font-medium">
                <div>Libreville, Gabon</div>
                <div>+241 77 003 004 / +241 66 240 399</div>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              {/* Document Title & Reference Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d44e8] block">
                    Document Officiel A4
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    {docMode === 'order' ? 'BON DE COMMANDE PROVISOIRE' : 'BON POUR ACCORD & ENGAGEMENT'}
                  </h4>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs space-y-0.5 sm:text-right">
                  <div className="font-mono font-black text-[#0d44e8] text-sm">Réf. : {order.reference}</div>
                  <div className="text-slate-600">Date : <strong>{formattedDate}</strong></div>
                  <div className="text-slate-700">Statut : <strong>{order.status}</strong></div>
                </div>
              </div>

              {/* Client & Delivery Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0d44e8] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    Client / Destinataire
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {order.customer.facilityName || 'Établissement'}
                  </div>
                  <div className="text-slate-600">
                    Contact : <strong className="text-slate-800">{order.customer.contactName || order.customer.facilityName}</strong>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Téléphone : <strong className="text-slate-800 font-mono">{order.customer.phone}</strong></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0d44e8] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Réception & Règlement
                  </span>
                  <div className="font-bold text-slate-900">
                    {order.customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait en agence'}
                  </div>
                  <div className="text-slate-600">
                    Adresse : <strong className="text-slate-800">{order.customer.deliveryAddress || 'Libreville, Gabon'}</strong>
                  </div>
                  <div className="text-slate-600">
                    Mode de règlement : <strong className="text-slate-800">{PAYMENT_LABELS[order.customer.paymentMethod] || order.customer.paymentMethod}</strong>
                    {mobilePayment?.transactionReference && (
                      <span className="ml-1 font-mono text-emerald-700 font-bold">
                        (Réf. {mobilePayment.transactionReference})
                      </span>
                    )}
                  </div>
                  {order.customer.notes && (
                    <div className="text-slate-500 italic pt-0.5">
                      Instructions : {order.customer.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className={`${docMode === 'order' ? 'bg-[#0d44e8]' : 'bg-slate-800'} text-white font-bold`}>
                    <tr>
                      <th className="py-2.5 px-3">Article et variante</th>
                      <th className="py-2.5 px-3 text-center">Qté</th>
                      <th className="py-2.5 px-3 text-right">Prix unit. (FCFA)</th>
                      <th className="py-2.5 px-3 text-right">Total (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(order.items || []).map((item, idx) => {
                      const unitPrice = Number(item.price) || 0;
                      const lineTotal = Number(item.total) || unitPrice * (Number(item.quantity) || 1);
                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            {item.variant && item.variant !== 'Standard' && (
                              <div className="text-[11px] text-slate-500">{item.variant}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                            {item.isQuote ? (
                              <span className="text-amber-700 font-bold">Sur devis</span>
                            ) : (
                              unitPrice.toLocaleString('fr-FR')
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                            {item.isQuote ? (
                              <span className="text-amber-700">Sur devis</span>
                            ) : (
                              lineTotal.toLocaleString('fr-FR')
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pt-1">
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>• Prix en FCFA hors taxes — Non soumis à la TVA (Sans TVA)</div>
                  <div>• Commande enregistrée auprès du service commercial Gloryday Pharma</div>
                  {order.isPaid && (
                    <div className="text-emerald-700 font-bold flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Commande marquée comme acquittée / payée</span>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total articles</span>
                    <span className="font-semibold tabular-nums">{itemsSubtotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Livraison</span>
                      <span className="font-semibold tabular-nums">{deliveryFee.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Remise volume incluse</span>
                      <span className="tabular-nums">-{totalSavings.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="font-black text-[#0d44e8] uppercase text-xs">Total Estimé</span>
                    <span className="text-base font-black text-slate-900 tabular-nums">
                      {orderTotal.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Signature Approval Block when in Visa Mode */}
              {docMode === 'visa' && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="text-xs font-black uppercase text-slate-800">
                    Circuit des Visas & Bon pour Commande
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="border border-slate-300 rounded-xl p-3 space-y-4 bg-white">
                      <div>
                        <div className="font-black text-slate-900">1. VISA DEMANDEUR</div>
                        <div className="text-[11px] text-slate-500">Major de Bloc / Surveillant(e)</div>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-1 pt-2">
                        <div>Date : ____ / ____ / 2026</div>
                        <div>Signature & Cachet :</div>
                      </div>
                    </div>
                    <div className="border border-slate-300 rounded-xl p-3 space-y-4 bg-white">
                      <div>
                        <div className="font-black text-slate-900">2. DIRECTION MÉDICALE</div>
                        <div className="text-[11px] text-slate-500">Médecin Chef / Pharmacien Gérant</div>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-1 pt-2">
                        <div>Date : ____ / ____ / 2026</div>
                        <div>Mention « Bon pour accord » :</div>
                      </div>
                    </div>
                    <div className="border border-slate-300 rounded-xl p-3 space-y-4 bg-white">
                      <div>
                        <div className="font-black text-slate-900">3. COMPTABILITÉ / DAF</div>
                        <div className="text-[11px] text-slate-500">Contrôle Budgétaire & Engagement</div>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-1 pt-2">
                        <div>Date : ____ / ____ / 2026</div>
                        <div>Visa de Paiement Prévu :</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
