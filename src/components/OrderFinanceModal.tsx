import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  CreditCard, 
  FileText, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Receipt, 
  Camera, 
  UserCheck, 
  Clock,
  Plus,
  Download
} from 'lucide-react';
import { Order, User, Courier, PaymentInstallment, InvoiceRecord } from '../types';
import { formatCollectionDueDate, getOrderPaidAmount, getOrderRemainingBalance, isCollectionOverdue } from '../utils/orderFinance';
import { getOrderBillingTotal } from '../utils/orderFulfillment';
import { normalizeCourierPhone } from '../utils/courierDirectory';
import { logAuditEvent } from '../utils/auditLogger';
import { downloadDeliveryNotePdf, downloadInvoiceProjectPdf } from '../utils/pdfGenerator';
import { api } from '../api';
import { getInvoiceReadyLineItems, getInvoiceReadyTotal, getOrderDeliveredQuantity, getOrderRemainingQuantity } from '../utils/orderFulfillment';

interface OrderFinanceModalProps {
  order: Order;
  currentUser: User;
  canViewInvoices: boolean;
  canManageInvoices: boolean;
  canViewPayments: boolean;
  canManagePayments: boolean;
  canManageCollectionDate: boolean;
  canManageLogistics: boolean;
  onClose: () => void;
  onUpdateOrder: (updated: Order) => Promise<void> | void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentInstallment['paymentMethod'], string> = {
  especes: 'Espèces',
  airtel_money: 'Airtel Money',
  moov_money: 'Moov Money',
  virement: 'Virement',
  cheque: 'Chèque',
};

export const OrderFinanceModal: React.FC<OrderFinanceModalProps> = ({
  order,
  currentUser,
  canViewInvoices,
  canManageInvoices,
  canViewPayments,
  canManagePayments,
  canManageCollectionDate,
  canManageLogistics,
  onClose,
  onUpdateOrder
}) => {
  const availableTabs = [
    ...(canViewPayments || canManageCollectionDate ? ['installments' as const] : []),
    ...(canViewInvoices ? ['invoices' as const] : []),
    ...(canManageLogistics ? ['delivery' as const, 'partial' as const] : []),
  ];
  const [activeTab, setActiveTab] = useState<'installments' | 'invoices' | 'delivery' | 'partial'>(availableTabs[0] || 'invoices');
  const [isSaving, setIsSaving] = useState(false);
  const paymentSubmitLockRef = useRef(false);
  const invoiceSubmitLockRef = useRef(false);
  const deliverySubmitLockRef = useRef(false);
  const [saveError, setSaveError] = useState('');
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierDirectoryError, setCourierDirectoryError] = useState('');

  // Installment State
  const [installmentAmount, setInstallmentAmount] = useState(String(Math.round(order.estimatedTotal / 2)));
  const [installmentType, setInstallmentType] = useState<'acompte' | 'solde'>('acompte');
  const [installmentMethod, setInstallmentMethod] = useState<'especes' | 'airtel_money' | 'moov_money' | 'virement' | 'cheque'>('airtel_money');
  const [installmentRef, setInstallmentRef] = useState('');
  const [collectionDueDate, setCollectionDueDate] = useState(order.collectionDueDate || '');

  // Invoice State
  const [invoiceType, setInvoiceType] = useState<'facture' | 'avoir'>('facture');
  const [tvaRate, setTvaRate] = useState<number>(0); // 0% dispositifs médicaux ou 18%
  const [includeStampOnInvoice, setIncludeStampOnInvoice] = useState(true);
  const [creditReason, setCreditReason] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [invoiceDownloadError, setInvoiceDownloadError] = useState('');
  const [downloadingDeliveryNote, setDownloadingDeliveryNote] = useState(false);
  const [deliveryNoteError, setDeliveryNoteError] = useState('');
  const [remainderResponseNote, setRemainderResponseNote] = useState('');
  const [isSavingRemainderResponse, setIsSavingRemainderResponse] = useState(false);

  // Delivery Proof State
  const [selectedCourierId, setSelectedCourierId] = useState(order.courier?.courierId || '');
  const [receivedByName, setReceivedByName] = useState(order.deliveryProof?.receivedBy || order.customer.contactName || '');
  const [signatureText, setSignatureText] = useState(order.deliveryProof?.signatureUrl || 'Émargé sur bon de livraison papier');
  const [photoProof, setPhotoProof] = useState(order.deliveryProof?.photoUrl || '');

  // Partial Delivery State
  const [partialNotes, setPartialNotes] = useState(order.partialDeliveryNotes || '');
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!canManageLogistics) return;
    let active = true;
    void api.getCourierDirectory().then((directory) => {
      if (!active) return;
      const activeCouriers = directory.filter((courier) => courier.active !== false);
      setCouriers(activeCouriers);
      setCourierDirectoryError('');
      const currentPhone = normalizeCourierPhone(order.courier?.phone);
      const selected = activeCouriers.find((courier) =>
        courier.id === order.courier?.courierId || normalizeCourierPhone(courier.phone) === currentPhone
      );
      setSelectedCourierId(selected?.id || activeCouriers[0]?.id || '');
    }).catch((error) => {
      if (active) setCourierDirectoryError(error instanceof Error ? error.message : 'Impossible de charger l’annuaire des coursiers.');
    });
    return () => { active = false; };
  }, [canManageLogistics, order.id, order.courier?.courierId, order.courier?.phone]);

  const totalPaid = getOrderPaidAmount(order);
  const remainingDue = getOrderRemainingBalance(order);
  const deliveryTrackingActive = (order.deliveryFulfillments || []).length > 0;
  const invoiceReadyLines = getInvoiceReadyLineItems(order);
  const invoiceReadyTotal = deliveryTrackingActive ? getInvoiceReadyTotal(order) : order.estimatedTotal;
  const collectionOverdue = canViewPayments && isCollectionOverdue({ ...order, collectionDueDate: collectionDueDate || undefined });
  const latestClientRemainderRequest = order.clientRemainderRequests?.[order.clientRemainderRequests.length - 1];
  const clientRemainderChoiceLabels = {
    continue_partial: 'Recevoir les articles disponibles puis le reste',
    wait_for_restock: 'Attendre que les articles manquants soient disponibles',
    cancel_remaining: 'Demander l’annulation des articles manquants',
    request_equivalent: 'Demander une proposition d’article équivalent',
  };

  const saveUpdatedOrder = async (updatedOrder: Order): Promise<boolean> => {
    setIsSaving(true);
    setSaveError('');
    try {
      await onUpdateOrder(updatedOrder);
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'L’enregistrement a échoué. Réessayez.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewClientRemainderRequest = async () => {
    if (!canManageLogistics || !latestClientRemainderRequest || latestClientRemainderRequest.status !== 'pending' || !remainderResponseNote.trim() || isSavingRemainderResponse) return;
    setIsSavingRemainderResponse(true);
    setSaveError('');
    try {
      const updatedOrder: Order = {
        ...order,
        clientRemainderRequests: (order.clientRemainderRequests || []).map((request) => request.id === latestClientRemainderRequest.id
          ? { ...request, status: 'reviewed', reviewedAt: new Date().toISOString(), reviewedByName: currentUser.contactName || currentUser.facilityName, responseNote: remainderResponseNote.trim() }
          : request),
      };
      if (await saveUpdatedOrder(updatedOrder)) setRemainderResponseNote('');
    } finally {
      setIsSavingRemainderResponse(false);
    }
  };

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePayments || paymentSubmitLockRef.current) return;
    const cleanInstallmentAmount = Number(installmentAmount);
    if (!Number.isSafeInteger(cleanInstallmentAmount) || cleanInstallmentAmount <= 0 || cleanInstallmentAmount > remainingDue) {
      setSaveError(`Saisissez un montant entier compris entre 1 et ${remainingDue.toLocaleString('fr-FR')} FCFA.`);
      return;
    }
    paymentSubmitLockRef.current = true;
    try {

    const newInst: PaymentInstallment = {
      id: globalThis.crypto?.randomUUID?.() || `INST-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: installmentType,
      amount: cleanInstallmentAmount,
      paymentMethod: installmentMethod,
      transactionReference: installmentRef.trim() || undefined,
      status: 'valide',
      paidAt: new Date().toISOString(),
      validatedBy: currentUser.contactName || currentUser.facilityName
    };

    const updatedInstallments = [...(order.installments || []), newInst];
    const newTotalPaid = totalPaid + newInst.amount;
    const isNowFullyPaid = newTotalPaid >= getOrderBillingTotal(order);

    const updatedOrder: Order = {
      ...order,
      installments: updatedInstallments,
      amountPaid: newTotalPaid,
      isPaid: isNowFullyPaid,
      collectionDueDate: isNowFullyPaid ? undefined : order.collectionDueDate,
    };

    if (!await saveUpdatedOrder(updatedOrder)) return;
    if (isNowFullyPaid) setCollectionDueDate('');
    setInstallmentAmount('');

    logAuditEvent(
      currentUser,
      'validation_paiement',
      'Paiement Échelonné Commande',
      order.reference,
      `Enregistrement ${installmentType.toUpperCase()} de ${cleanInstallmentAmount.toLocaleString('fr-FR')} FCFA (${installmentMethod}) pour ${order.customer.facilityName}`,
      `Reste dû: ${remainingDue}`,
      `Nouveau total payé: ${newTotalPaid}`
    );

    setInstallmentRef('');
    } finally {
      paymentSubmitLockRef.current = false;
    }
  };

  const handleSaveCollectionDueDate = async () => {
    if (!canManageCollectionDate) return;
    const effectiveDueDate = canViewPayments && remainingDue <= 0 ? undefined : collectionDueDate || undefined;
    const updatedOrder: Order = { ...order, collectionDueDate: effectiveDueDate };
    if (!await saveUpdatedOrder(updatedOrder)) return;
    setCollectionDueDate(effectiveDueDate || '');
    logAuditEvent(
      currentUser,
      'mise_a_jour_financiere',
      'Échéance de recouvrement',
      order.reference,
      `Échéance de recouvrement mise à jour pour ${order.customer.facilityName}`,
      order.collectionDueDate ? formatCollectionDueDate(order.collectionDueDate) : 'Aucune échéance',
      collectionDueDate ? formatCollectionDueDate(collectionDueDate) : 'Échéance supprimée'
    );
  };
  const handleCreateInvoiceOrCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInvoices || invoiceSubmitLockRef.current) return;
    invoiceSubmitLockRef.current = true;
    try {
    const isFacture = invoiceType === 'facture';
    const documentYear = new Date().getFullYear();
    const orderCode = order.reference.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const sequence = String((order.invoices || []).length + 1).padStart(2, '0');
    const num = isFacture
      ? `FAC-${documentYear}-${orderCode}-${sequence}`
      : `AVOIR-${documentYear}-${orderCode}-${sequence}`;

    const deliveryTrackingActive = (order.deliveryFulfillments || []).length > 0;
    const totalTTC = isFacture
      ? deliveryTrackingActive ? getInvoiceReadyTotal(order) : order.estimatedTotal
      : getOrderBillingTotal(order);
    const totalHT = tvaRate > 0 ? Math.round(totalTTC / (1 + tvaRate)) : totalTTC;
    const tvaAmount = totalTTC - totalHT;
    const lineItems = isFacture ? getInvoiceReadyLineItems(order) : [];
    if (isFacture && totalTTC <= 0) {
      setSaveError('Aucune quantité livrée non facturée ne peut être mise sur cette facture.');
      return;
    }

    const newDoc: InvoiceRecord = {
      id: `DOC-${Date.now()}`,
      orderId: order.id,
      orderReference: order.reference,
      type: invoiceType,
      number: num,
      issueDate: new Date().toISOString().slice(0, 10),
      clientFacilityName: order.customer.facilityName,
      tvaRate,
      tvaAmount,
      totalHT,
      totalTTC,
      lineItems: isFacture ? lineItems : undefined,
      deliveryFee: isFacture ? Math.max(0, totalTTC - lineItems.reduce((sum, line) => sum + line.lineTotal, 0)) : 0,
      includeStamp: includeStampOnInvoice,
      reason: isFacture ? undefined : (creditReason.trim() || 'Retour dispositifs / ajustement tarifaire')
    };

    const updatedOrder: Order = {
      ...order,
      invoices: [...(order.invoices || []), newDoc]
    };

    if (!await saveUpdatedOrder(updatedOrder)) return;

    logAuditEvent(
      currentUser,
      'export_donnees',
      'Facturation B2B',
      order.reference,
      `Émission de ${invoiceType === 'facture' ? 'Facture' : 'Avoir'} ${num} (${totalTTC.toLocaleString('fr-FR')} FCFA TTC)`
    );
    } finally {
      invoiceSubmitLockRef.current = false;
    }
  };

  const handleDownloadInvoiceProject = async (invoice: InvoiceRecord) => {
    setDownloadingInvoiceId(invoice.id);
    setInvoiceDownloadError('');
    try {
      await downloadInvoiceProjectPdf(order, invoice);
    } catch (error) {
      console.error('Impossible de générer le PDF de facture:', error);
      setInvoiceDownloadError('Le PDF n’a pas pu être créé. Réessayez dans un instant.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleDownloadDeliveryNote = async () => {
    setDownloadingDeliveryNote(true);
    setDeliveryNoteError('');
    try {
      await downloadDeliveryNotePdf(order);
    } catch (error) {
      console.error('Impossible de générer le bon de livraison PDF:', error);
      setDeliveryNoteError(error instanceof Error ? error.message : 'Le bon de livraison PDF n’a pas pu être créé.');
    } finally {
      setDownloadingDeliveryNote(false);
    }
  };

  const handleSaveDeliveryProofAndCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageLogistics) return;
    const courierFound = couriers.find(c => c.id === selectedCourierId);

    const updatedOrder: Order = {
      ...order,
      courier: courierFound ? {
        courierId: courierFound.id,
        name: courierFound.name,
        phone: courierFound.phone,
        vehicle: courierFound.vehicle,
        matricule: courierFound.matricule
      } : order.courier,
      deliveryProof: {
        receivedBy: receivedByName.trim(),
        signatureUrl: signatureText.trim(),
        photoUrl: photoProof.trim() || undefined,
        timestamp: new Date().toISOString()
      },
      isPartialDelivery: order.isPartialDelivery,
      partialDeliveryNotes: order.partialDeliveryNotes
    };

    if (!await saveUpdatedOrder(updatedOrder)) return;

    logAuditEvent(
      currentUser,
      'statut_commande',
      'Preuve de Livraison & Coursier',
      order.reference,
      `Assignation coursier ${courierFound?.name || 'Inchangé'} et preuve de livraison émargée par ${receivedByName}`
    );

    onClose();
  };

  const handleSaveDeliveryFulfillment = async () => {
    if (!canManageLogistics || isSaving || deliverySubmitLockRef.current) return;
    deliverySubmitLockRef.current = true;
    try {
    const lines = Object.entries(deliveryQuantities).flatMap(([rawIndex, rawQuantity]) => {
      const itemIndex = Number(rawIndex);
      const quantity = Number(rawQuantity);
      return Number.isSafeInteger(quantity) && quantity > 0 ? [{ itemIndex, quantity }] : [];
    });
    const notes = partialNotes.trim();
    if (!lines.length && !notes) {
      setSaveError('Saisissez une quantité réellement remise ou expliquez le reliquat à fournir.');
      return;
    }
    const overLimit = lines.find((line) => line.quantity > getOrderRemainingQuantity(order, line.itemIndex));
    if (overLimit) {
      setSaveError(`La quantité dépasse le reliquat de « ${order.items[overLimit.itemIndex]?.productName || 'cet article'} ».`);
      return;
    }
    if (lines.some((line) => {
      const item = order.items[line.itemIndex];
      return !item || item.isQuote || item.isDeferredStock || Number(item.price) <= 0;
    })) {
      setSaveError('Un article sur devis ou en réapprovisionnement doit d’abord être chiffré et confirmé avant l’enregistrement de sa remise.');
      return;
    }
    const fulfillmentId = globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
    const fulfillment = {
      id: fulfillmentId,
      fulfilledAt: new Date().toISOString(),
      lines,
      notes: notes || undefined,
      recordedById: currentUser.id,
      recordedByName: currentUser.contactName || currentUser.facilityName || 'Collaborateur Gloryday',
    };
    const deliveryFulfillments = [...(order.deliveryFulfillments || []), fulfillment];
    const isPartialDelivery = order.items.some((_, itemIndex) => {
      const delivered = deliveryFulfillments.reduce((sum, record) => sum + record.lines
        .filter((line) => line.itemIndex === itemIndex)
        .reduce((lineSum, line) => lineSum + line.quantity, 0), 0);
      return delivered < order.items[itemIndex].quantity;
    });
    if (!await saveUpdatedOrder({
      ...order,
      deliveryFulfillments,
      isPartialDelivery,
      partialDeliveryNotes: notes || undefined,
    })) return;
    setDeliveryQuantities({});
    setPartialNotes('');
    logAuditEvent(
      currentUser,
      'statut_commande',
      'Quantités remises / reliquat',
      order.reference,
      `${lines.reduce((sum, line) => sum + line.quantity, 0)} unité(s) remises ; ${isPartialDelivery ? 'reliquat conservé à fournir' : 'commande entièrement remise'}. ${notes}`
    );
    } finally {
      deliverySubmitLockRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto text-xs">
        {/* Header */}
        <div className="bg-[#0f0f12] text-white p-4 px-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Gestion Financière & Logistique : {order.reference}</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {order.customer.facilityName}{(canViewPayments || canViewInvoices) && <> · Total Commande : <strong className="text-white font-mono">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong></>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtabs */}
        <div className="flex border-b border-slate-200 px-4 gap-2 bg-slate-50 font-semibold py-2">
          {availableTabs.includes('installments') && <button
            type="button"
            onClick={() => setActiveTab('installments')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'installments' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Acomptes & Soldes
          </button>}
          {availableTabs.includes('invoices') && <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'invoices' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Facture & Avoir
          </button>}
          {availableTabs.includes('delivery') && <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'delivery' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Coursier & Preuve Livraison
          </button>}
          {availableTabs.includes('partial') && <button
            type="button"
            onClick={() => setActiveTab('partial')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'partial' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Remises & reliquats
          </button>}
        </div>

        <div className="p-4 space-y-4">
          {isSaving && <p role="status" className="text-xs font-semibold text-blue-700">Enregistrement en cours…</p>}
          {saveError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {saveError}
            </p>
          )}
          {/* TAB 1: INSTALLMENTS */}
          {activeTab === 'installments' && (canViewPayments || canManagePayments || canManageCollectionDate) && (
            <div className="space-y-3">
              {canViewPayments && <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Encaissé</span>
                  <strong className="text-emerald-700 text-sm">{totalPaid.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">Reste à Payer (Solde)</span>
                  <strong className={`text-sm ${remainingDue > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {remainingDue.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>
              </div>}

              {(canManageCollectionDate || canViewPayments) && <div className={`rounded-xl border p-3 ${collectionOverdue ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <label className="flex-1 text-[11px] font-bold text-slate-700">
                    Date prévue de recouvrement
                    {canManageCollectionDate ? <input
                      type="date"
                      value={collectionDueDate}
                      onChange={(event) => setCollectionDueDate(event.target.value)}
                      disabled={(canViewPayments && remainingDue <= 0) || isSaving}
                      className={`mt-1 w-full rounded-lg border px-2.5 py-2 text-xs ${collectionOverdue ? 'border-rose-300 bg-white' : 'border-slate-300 bg-slate-50'}`}
                    /> : <span className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs">{collectionDueDate ? formatCollectionDueDate(collectionDueDate) : 'Aucune échéance enregistrée'}</span>}
                  </label>
                  {canManageCollectionDate && <button
                    type="button"
                    onClick={() => void handleSaveCollectionDueDate()}
                    disabled={isSaving || (canViewPayments && remainingDue <= 0) || collectionDueDate === (order.collectionDueDate || '')}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Enregistrer l’échéance
                  </button>}
                </div>
                <p className={`mt-2 text-[10px] font-semibold ${collectionOverdue ? 'text-rose-700' : 'text-slate-500'}`}>
                  {canViewPayments && remainingDue <= 0
                    ? 'Commande soldée : aucune relance à prévoir.'
                    : collectionOverdue
                      ? `Échéance dépassée · reste ${remainingDue.toLocaleString('fr-FR')} FCFA à recouvrer.`
                      : 'Le reste dû et cette date apparaîtront dans le suivi client et le tableau admin.'}
                </p>
              </div>}

              {/* History of installments */}
              {canViewPayments && <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px]">Historique des encaissements :</span>
                {(!order.installments || order.installments.length === 0) ? (
                  <p className="text-slate-400 italic">Aucun acompte spécifique enregistré (Paiement comptant standard).</p>
                ) : (
                  order.installments.map((inst) => (
                    <div key={inst.id} className="p-2 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold uppercase text-slate-800">{inst.type}</span> · {PAYMENT_METHOD_LABELS[inst.paymentMethod]}
                        {inst.transactionReference && <span className="font-mono text-slate-500 ml-1">({inst.transactionReference})</span>}
                        <span className="block text-[10px] text-slate-500">
                          {new Date(inst.paidAt).toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' })}
                          {inst.validatedBy ? ` · reçu par ${inst.validatedBy}` : ''}
                        </span>
                      </div>
                      <strong className="text-emerald-700 font-mono">+{inst.amount.toLocaleString('fr-FR')} F</strong>
                    </div>
                  ))
                )}
              </div>}

              {/* Add installment form */}
              {canManagePayments && remainingDue > 0 && (
                <form onSubmit={handleAddInstallment} className="p-3 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                  <span className="font-bold text-slate-800">Enregistrer un versement (Acompte ou Solde) :</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-0.5">Type</label>
                      <select
                        value={installmentType}
                        onChange={(e: any) => setInstallmentType(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="acompte">Acompte initial</option>
                        <option value="solde">Règlement du solde</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Montant (FCFA)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        max={remainingDue}
                        required
                        value={installmentAmount}
                        onChange={(e) => setInstallmentAmount(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-0.5">Mode de Paiement</label>
                      <select
                        value={installmentMethod}
                        onChange={(e: any) => setInstallmentMethod(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="airtel_money">Airtel Money</option>
                        <option value="moov_money">Moov Money</option>
                        <option value="especes">Espèces</option>
                        <option value="virement">Virement Bancaire (BGFI/UBA)</option>
                        <option value="cheque">Chèque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Réf Transaction</label>
                      <input
                        type="text"
                        placeholder="Ex: MP260408..."
                        value={installmentRef}
                        onChange={(e) => setInstallmentRef(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-xs mt-1"
                  >
                    {isSaving ? 'Enregistrement…' : 'Valider l’encaissement'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: INVOICES & AVOIRS */}
          {activeTab === 'invoices' && canViewInvoices && (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px]">Documents de commande :</span>
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">
                  La facture et l’avoir sont enregistrés dans le dossier de cette commande. Vérifiez les mentions et le taux applicable avant de transmettre le document.
                </p>
                {deliveryTrackingActive && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-950">
                    <strong>Facturable à ce jour : {invoiceReadyTotal.toLocaleString('fr-FR')} FCFA.</strong>
                    <span className="block">Ce total ne comprend que les quantités réellement remises et pas encore facturées. Le reliquat apparaîtra sur une facture après sa livraison.</span>
                    {invoiceReadyLines.length > 0 && <span className="mt-1 block">{invoiceReadyLines.map((line) => `${line.quantity} × ${line.productName}`).join(' · ')}</span>}
                  </div>
                )}
                {(!order.invoices || order.invoices.length === 0) ? (
                  <p className="text-slate-400 italic">Aucune facture ou note d'avoir générée pour cette commande.</p>
                ) : (
                  order.invoices.map((inv) => (
                    <div key={inv.id} className="p-2.5 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 font-mono">{inv.number}</div>
                        <div className="text-[10px] text-slate-500">
                          {inv.type === 'facture' ? 'Facture' : 'Avoir'} · Créé le {inv.issueDate}
                          {inv.reason && ` · Motif : ${inv.reason}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="font-mono text-slate-900">{inv.totalTTC.toLocaleString('fr-FR')} F</strong>
                        <div className="text-[10px] text-slate-400">TVA: {inv.tvaRate * 100}%</div>
                        <button
                          type="button"
                          onClick={() => void handleDownloadInvoiceProject(inv)}
                          disabled={downloadingInvoiceId === inv.id}
                          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#0d44e8] hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
                        >
                          <Download className="h-3 w-3" />
                          {downloadingInvoiceId === inv.id ? 'Création…' : `Télécharger ${inv.type === 'facture' ? 'la facture' : 'l’avoir'} PDF`}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {invoiceDownloadError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {invoiceDownloadError}
                </p>
              )}

              {canManageInvoices && <form onSubmit={handleCreateInvoiceOrCredit} className="p-3 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-800">Créer un document :</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Type de Document</label>
                    <select
                      value={invoiceType}
                      onChange={(e: any) => setInvoiceType(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="facture">Facture</option>
                      <option value="avoir">Avoir / retour</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Régime TVA</label>
                    <select
                      value={tvaRate}
                      onChange={(e) => setTvaRate(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="0">0% (à confirmer)</option>
                      <option value="0.18">18% (à confirmer)</option>
                    </select>
                  </div>
                </div>

                {invoiceType === 'facture' && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeStampOnInvoice}
                      onChange={(event) => setIncludeStampOnInvoice(event.target.checked)}
                      className="mt-0.5 accent-blue-700"
                    />
                    <span><strong className="block">Inclure le cachet Gloryday sur le PDF</strong><span className="text-slate-500">Ce choix sera conservé pour cette facture.</span></span>
                  </label>
                )}

                {invoiceType === 'avoir' && (
                  <div>
                    <label className="block text-slate-600 mb-0.5">Motif du Retour / Avoir</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Retour 2 cartons gants défectueux, Erreur de commande"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving || (invoiceType === 'facture' && (deliveryTrackingActive ? invoiceReadyTotal <= 0 : (order.invoices || []).some((invoice) => invoice.type === 'facture')))}
                  className="w-full py-2 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs mt-1"
                >
                  Créer {invoiceType === 'facture' ? 'la facture' : 'l’avoir'}
                </button>
              </form>}
            </div>
          )}

          {/* TAB 3: COURRIER & PREUVE DE LIVRAISON */}
          {activeTab === 'delivery' && canManageLogistics && (
            <form onSubmit={handleSaveDeliveryProofAndCourier} className="space-y-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950"><FileText className="h-3.5 w-3.5" />Bon de livraison PDF</div>
                    <p className="mt-1 text-[10px] text-blue-800">Document avec le logo Gloryday, les quantités commandées, remises et restant à fournir, avec espace de signature.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDownloadDeliveryNote()}
                    disabled={downloadingDeliveryNote || (order.items || []).length === 0}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingDeliveryNote ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {downloadingDeliveryNote ? 'Préparation…' : 'Télécharger le bon'}
                  </button>
                </div>
                {deliveryNoteError && <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-700">{deliveryNoteError}</p>}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sélectionner un coursier (annuaire configuré)
                </label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {couriers.length === 0 && <option value="">Aucun coursier enregistré — affectez-en un dans le suivi livraison</option>}
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}{c.vehicle ? ` (${c.vehicle}` : ''}{c.matricule ? `${c.vehicle ? ' · ' : ' ('}${c.matricule}` : ''}{c.vehicle || c.matricule ? ')' : ''}
                    </option>
                  ))}
                </select>
                {courierDirectoryError && <p role="status" className="mt-1 text-[11px] text-amber-700">Annuaire indisponible : {courierDirectoryError}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom du Réceptionnaire à la Clinique / Pharmacie *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Major Ondo (Bloc), Dr. Obiang (Pharmacie)"
                  value={receivedByName}
                  onChange={(e) => setReceivedByName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Émargement / Preuve de Signature
                </label>
                <input
                  type="text"
                  placeholder="Mention ou lien de signature émargée"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Photo du Bordereau Émargé (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="URL photo ou fichier joint"
                  value={photoProof}
                  onChange={(e) => setPhotoProof(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-xs mt-2"
              >
                Valider Preuve & Affectation Coursier
              </button>
            </form>
          )}

          {/* TAB 4: PARTIAL DELIVERY */}
          {activeTab === 'partial' && canManageLogistics && (
            <div className="space-y-3">
              {latestClientRemainderRequest && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950">
                  <div className="font-black">Choix transmis par le client · {latestClientRemainderRequest.status === 'pending' ? 'à traiter' : 'traité'}</div>
                  <p className="mt-1">{latestClientRemainderRequest.requestedByName} demande : <strong>{clientRemainderChoiceLabels[latestClientRemainderRequest.choice]}</strong>.</p>
                  <p className="mt-0.5 text-[10px] text-indigo-800">Reçu le {new Date(latestClientRemainderRequest.requestedAt).toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' })}. Cette demande ne modifie pas la commande avant validation par l’équipe.</p>
                  {latestClientRemainderRequest.note && <p className="mt-1 rounded-lg bg-white/70 p-2">Précision du client : {latestClientRemainderRequest.note}</p>}
                  {latestClientRemainderRequest.status === 'pending' ? (
                    <div className="mt-2 space-y-2">
                      <label className="block text-[11px] font-bold">Réponse à transmettre au client
                        <textarea rows={2} maxLength={500} value={remainderResponseNote} onChange={(event) => setRemainderResponseNote(event.target.value)} placeholder="Ex. : Nous avons noté votre choix. Les articles disponibles partent aujourd’hui ; le reste est prévu vendredi." className="mt-1 w-full rounded-lg border border-indigo-200 bg-white p-2 text-xs font-normal outline-none focus:border-indigo-500" />
                      </label>
                      <button type="button" onClick={() => void handleReviewClientRemainderRequest()} disabled={isSavingRemainderResponse || !remainderResponseNote.trim()} className="rounded-lg bg-indigo-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">{isSavingRemainderResponse ? 'Enregistrement…' : 'Marquer comme traitée et informer le client'}</button>
                    </div>
                  ) : (
                    <p className="mt-2 rounded-lg bg-white/70 p-2">Réponse envoyée par {latestClientRemainderRequest.reviewedByName || 'l’équipe'} : {latestClientRemainderRequest.responseNote}</p>
                  )}
                </div>
              )}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                Saisissez uniquement les unités effectivement remises. Le stock des lignes disponibles a déjà été réservé à la commande : cette étape ne le déduit pas une seconde fois. Les quantités non remises restent au reliquat, et une facture ne portera que sur les unités remises et pas encore facturées.
              </div>
              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-900">Après l’enregistrement, le client rattaché à un compte reçoit une notification dans son espace et sur son appareil si les notifications sont autorisées. Elle indique les quantités remises et les articles restant à recevoir. La commande d’origine est conservée ; pour un client sans compte, transmettez le bon de livraison mis à jour par votre canal habituel.</p>
              <div className="space-y-2">
                {order.items.map((item, itemIndex) => {
                  const delivered = getOrderDeliveredQuantity(order, itemIndex);
                  const remaining = getOrderRemainingQuantity(order, itemIndex);
                  const isDeferred = item.isQuote || item.isDeferredStock || Number(item.price) <= 0;
                  return (
                    <div key={`${item.productId}-${item.variant}-${itemIndex}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_115px_150px] sm:items-center">
                      <div>
                        <strong className="block text-sm text-slate-900">{item.productName}</strong>
                        <span className="text-xs text-slate-500">{item.variant} · commandé {item.quantity} · déjà remis {delivered} · reste {remaining}</span>
                        {isDeferred && <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">À chiffrer / réapprovisionner avant remise</span>}
                      </div>
                      <label className="text-xs font-semibold text-slate-600">
                        Remis aujourd’hui
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          step="1"
                          value={deliveryQuantities[itemIndex] ?? ''}
                          disabled={isDeferred || remaining === 0}
                          onChange={(event) => setDeliveryQuantities((current) => ({ ...current, [itemIndex]: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm tabular-nums disabled:bg-slate-100"
                          aria-label={`Quantité remise aujourd’hui pour ${item.productName}`}
                        />
                      </label>
                      <span className={`rounded-full px-2.5 py-1 text-center text-[11px] font-bold ${remaining === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                        {remaining === 0 ? 'Entièrement remis' : 'Reliquat à fournir'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Note sur le reliquat ou la livraison</label>
                <textarea
                  rows={3}
                  placeholder="Ex. : rupture fournisseur ; client informé, 4 boîtes remises aujourd’hui et 2 prévues vendredi."
                  value={partialNotes}
                  onChange={(event) => setPartialNotes(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2"
                />
              </div>
              {(order.deliveryFulfillments || []).length > 0 && (
                <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-bold text-slate-700">Historique des remises ({order.deliveryFulfillments!.length})</summary>
                  <div className="mt-2 space-y-2">
                    {order.deliveryFulfillments!.map((record) => (
                      <div key={record.id} className="rounded-lg bg-white p-2">
                        <strong>{new Date(record.fulfilledAt).toLocaleString('fr-FR')} · {record.recordedByName}</strong>
                        <p>{record.lines.map((line) => `${line.quantity} × ${order.items[line.itemIndex]?.productName || 'article'}`).join(', ') || 'Signalement de reliquat, sans remise'}</p>
                        {record.notes && <p className="text-slate-500">{record.notes}</p>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <button
                type="button"
                onClick={() => void handleSaveDeliveryFulfillment()}
                disabled={isSaving}
                className="w-full py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {isSaving ? 'Enregistrement…' : 'Enregistrer la remise et le reliquat'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
