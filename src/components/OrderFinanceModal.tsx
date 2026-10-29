import React, { useState } from 'react';
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
import { getCouriers } from '../utils/courierDirectory';
import { logAuditEvent } from '../utils/auditLogger';
import { downloadInvoiceProjectPdf } from '../utils/pdfGenerator';

interface OrderFinanceModalProps {
  order: Order;
  currentUser: User;
  onClose: () => void;
  onUpdateOrder: (updated: Order) => Promise<void> | void;
}

export const OrderFinanceModal: React.FC<OrderFinanceModalProps> = ({
  order,
  currentUser,
  onClose,
  onUpdateOrder
}) => {
  const [activeTab, setActiveTab] = useState<'installments' | 'invoices' | 'delivery' | 'partial'>('invoices');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const couriers: Courier[] = getCouriers();

  // Installment State
  const [installmentAmount, setInstallmentAmount] = useState<number>(Math.round(order.estimatedTotal / 2));
  const [installmentType, setInstallmentType] = useState<'acompte' | 'solde'>('acompte');
  const [installmentMethod, setInstallmentMethod] = useState<'especes' | 'airtel_money' | 'moov_money' | 'virement'>('airtel_money');
  const [installmentRef, setInstallmentRef] = useState('');

  // Invoice State
  const [invoiceType, setInvoiceType] = useState<'facture' | 'avoir'>('facture');
  const [tvaRate, setTvaRate] = useState<number>(0); // 0% dispositifs médicaux ou 18%
  const [creditReason, setCreditReason] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [invoiceDownloadError, setInvoiceDownloadError] = useState('');

  // Delivery Proof State
  const [selectedCourierId, setSelectedCourierId] = useState(order.courier?.matricule || couriers[0]?.id || '');
  const [receivedByName, setReceivedByName] = useState(order.deliveryProof?.receivedBy || order.customer.contactName || '');
  const [signatureText, setSignatureText] = useState(order.deliveryProof?.signatureUrl || 'Émargé sur bon de livraison papier');
  const [photoProof, setPhotoProof] = useState(order.deliveryProof?.photoUrl || '');

  // Partial Delivery State
  const [isPartial, setIsPartial] = useState(order.isPartialDelivery || false);
  const [partialNotes, setPartialNotes] = useState(order.partialDeliveryNotes || '');

  const totalPaid = (order.installments || []).reduce((sum, inst) => sum + (inst.status === 'valide' ? inst.amount : 0), 0) + (order.isPaid && (!order.installments || order.installments.length === 0) ? order.estimatedTotal : 0);
  const remainingDue = Math.max(0, order.estimatedTotal - totalPaid);

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

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (installmentAmount <= 0) return;

    const newInst: PaymentInstallment = {
      id: `INST-${Date.now()}`,
      type: installmentType,
      amount: Number(installmentAmount),
      paymentMethod: installmentMethod,
      transactionReference: installmentRef.trim() || undefined,
      status: 'valide',
      paidAt: new Date().toISOString(),
      validatedBy: currentUser.contactName || currentUser.facilityName
    };

    const updatedInstallments = [...(order.installments || []), newInst];
    const newTotalPaid = updatedInstallments.reduce((sum, i) => sum + (i.status === 'valide' ? i.amount : 0), 0);
    const isNowFullyPaid = newTotalPaid >= order.estimatedTotal;

    const updatedOrder: Order = {
      ...order,
      installments: updatedInstallments,
      amountPaid: newTotalPaid,
      isPaid: isNowFullyPaid
    };

    if (!await saveUpdatedOrder(updatedOrder)) return;

    logAuditEvent(
      currentUser,
      'validation_paiement',
      'Paiement Échelonné Commande',
      order.reference,
      `Enregistrement ${installmentType.toUpperCase()} de ${installmentAmount.toLocaleString('fr-FR')} FCFA (${installmentMethod}) pour ${order.customer.facilityName}`,
      `Reste dû: ${remainingDue}`,
      `Nouveau total payé: ${newTotalPaid}`
    );

    setInstallmentRef('');
  };

  const handleCreateInvoiceOrCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isFacture = invoiceType === 'facture';
    const documentYear = new Date().getFullYear();
    const orderCode = order.reference.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const sequence = String((order.invoices || []).length + 1).padStart(2, '0');
    const num = isFacture
      ? `FAC-${documentYear}-${orderCode}-${sequence}`
      : `AVOIR-${documentYear}-${orderCode}-${sequence}`;

    const totalTTC = order.estimatedTotal;
    const totalHT = tvaRate > 0 ? Math.round(totalTTC / (1 + tvaRate)) : totalTTC;
    const tvaAmount = totalTTC - totalHT;

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
  };

  const handleDownloadInvoiceProject = async (invoice: InvoiceRecord) => {
    setDownloadingInvoiceId(invoice.id);
    setInvoiceDownloadError('');
    try {
      await downloadInvoiceProjectPdf(order, invoice);
    } catch (error) {
      console.error('Impossible de générer le projet de facture PDF:', error);
      setInvoiceDownloadError('Le PDF n’a pas pu être créé. Réessayez dans un instant.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleSaveDeliveryProofAndCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    const courierFound = couriers.find(c => c.id === selectedCourierId);

    const updatedOrder: Order = {
      ...order,
      courier: courierFound ? {
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
      isPartialDelivery: isPartial,
      partialDeliveryNotes: isPartial ? partialNotes.trim() : undefined
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
              {order.customer.facilityName} · Total Commande : <strong className="text-white font-mono">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
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
          <button
            type="button"
            onClick={() => setActiveTab('installments')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'installments' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Acomptes & Soldes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'invoices' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Facture & Avoir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'delivery' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Coursier & Preuve Livraison
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('partial')}
            className={`py-1 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'partial' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Livraison Partielle
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isSaving && <p role="status" className="text-xs font-semibold text-blue-700">Enregistrement en cours…</p>}
          {saveError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {saveError}
            </p>
          )}
          {/* TAB 1: INSTALLMENTS */}
          {activeTab === 'installments' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono">
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
              </div>

              {/* History of installments */}
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px]">Historique des encaissements :</span>
                {(!order.installments || order.installments.length === 0) ? (
                  <p className="text-slate-400 italic">Aucun acompte spécifique enregistré (Paiement comptant standard).</p>
                ) : (
                  order.installments.map((inst) => (
                    <div key={inst.id} className="p-2 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold uppercase text-slate-800">{inst.type}</span> · {inst.paymentMethod}
                        {inst.transactionReference && <span className="font-mono text-slate-500 ml-1">({inst.transactionReference})</span>}
                      </div>
                      <strong className="text-emerald-700 font-mono">+{inst.amount.toLocaleString('fr-FR')} F</strong>
                    </div>
                  ))
                )}
              </div>

              {/* Add installment form */}
              {remainingDue > 0 && (
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
                        max={remainingDue}
                        value={installmentAmount}
                        onChange={(e) => setInstallmentAmount(Number(e.target.value))}
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
                    Valider l'Encaissement
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: INVOICES & AVOIRS */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px]">Documents de commande :</span>
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">
                  Les documents générés ici sont des projets internes. Vérifiez les mentions, la numérotation et le taux applicable avec votre comptable avant de les transmettre.
                </p>
                {(!order.invoices || order.invoices.length === 0) ? (
                  <p className="text-slate-400 italic">Aucune facture ou note d'avoir générée pour cette commande.</p>
                ) : (
                  order.invoices.map((inv) => (
                    <div key={inv.id} className="p-2.5 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 font-mono">{inv.number}</div>
                        <div className="text-[10px] text-slate-500">
                          {inv.type === 'facture' ? 'Projet de facture' : 'Projet d’avoir'} · Créé le {inv.issueDate}
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
                          {downloadingInvoiceId === inv.id ? 'Création…' : 'Télécharger le projet PDF'}
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

              <form onSubmit={handleCreateInvoiceOrCredit} className="p-3 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-800">Créer un projet de document :</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Type de Document</label>
                    <select
                      value={invoiceType}
                      onChange={(e: any) => setInvoiceType(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="facture">Projet de facture</option>
                      <option value="avoir">Projet d'avoir / retour</option>
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
                  disabled={isSaving}
                  className="w-full py-2 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs mt-1"
                >
                  Créer {invoiceType === 'facture' ? 'le projet de facture' : 'le projet d’avoir'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: COURRIER & PREUVE DE LIVRAISON */}
          {activeTab === 'delivery' && (
            <form onSubmit={handleSaveDeliveryProofAndCourier} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sélectionner un coursier (annuaire configuré)
                </label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone} ({c.vehicle} - {c.matricule})
                    </option>
                  ))}
                </select>
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
          {activeTab === 'partial' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPartial}
                  onChange={(e) => setIsPartial(e.target.checked)}
                  className="rounded text-[#0d44e8] w-4 h-4"
                />
                <div>
                  <strong className="text-slate-900 block">Marquer comme Livraison Partielle</strong>
                  <span className="text-slate-500 text-[11px]">
                    Cochez cette case si un ou plusieurs articles sont en rupture temporaire et feront l'objet d'un reliquat.
                  </span>
                </div>
              </label>

              {isPartial && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Détail des Reliquats & Ruptures
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: 5 boîtes de compresses livrées sur 10. Reliquat de 5 boîtes programmé demain matin."
                    value={partialNotes}
                    onChange={(e) => setPartialNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveDeliveryProofAndCourier}
                disabled={isSaving}
                className="w-full py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Enregistrer le Statut Partiel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
