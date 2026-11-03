import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, PackagePlus, RefreshCw, X } from 'lucide-react';
import type { Product, StockMovement } from '../types';
import { api } from '../api';

interface StockReceiptModalProps {
  product: Product | null;
  onClose: () => void;
  onProductUpdated: (product: Product) => void;
  canManagePurchasePrice?: boolean;
}

function newMovementId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const formatQuantity = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
const movementLabels: Record<StockMovement['type'], string> = {
  entree: 'Réception',
  sortie_commande: 'Réservation commande',
  perte_casse: 'Perte / casse',
  ajustement: 'Correction du solde',
  retour: 'Retour après annulation',
};
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' });
};

export const StockReceiptModal: React.FC<StockReceiptModalProps> = ({ product, onClose, onProductUpdated, canManagePurchasePrice = false }) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [movementId, setMovementId] = useState(newMovementId);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!product) return;
    setQuantity('');
    setReason('');
    setLotNumber('');
    setExpiryDate('');
    setSupplierName('');
    setSupplierReference('');
    setPurchasePrice('');
    setMovementId(newMovementId());
    setError('');
    setSuccess('');
    setLoadingHistory(true);
    api.getStockMovements(product.id)
      .then(setMovements)
      .catch((loadError: Error) => setError(loadError.message || 'Historique du stock indisponible.'))
      .finally(() => setLoadingHistory(false));
  }, [product?.id]);

  if (!product) return null;

  const currentStock = Math.max(0, Number(product.quantityAvailable ?? product.stockQuantity ?? 0));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const receivedQuantity = Number(quantity);
    if (!Number.isSafeInteger(receivedQuantity) || receivedQuantity < 1 || receivedQuantity > 1000000) {
      setError('Saisissez une quantité entière entre 1 et 1 000 000.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Indiquez un motif d’au moins 3 caractères.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.receiveProductStock({
        productId: product.id,
        quantity: receivedQuantity,
        reason: reason.trim(),
        movementId,
        lotNumber: lotNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        supplierName: supplierName.trim() || undefined,
        supplierReference: supplierReference.trim() || undefined,
        purchasePrice: purchasePrice === '' ? undefined : Number(purchasePrice),
      });
      onProductUpdated(result.product);
      setMovements(previous => [result.movement, ...previous.filter(item => item.id !== result.movement.id)].slice(0, 12));
      setSuccess(`Réception enregistrée : ${formatQuantity(result.movement.previousQuantity)} → ${formatQuantity(result.movement.newQuantity)} unités.`);
      setQuantity('');
      setReason('');
      setLotNumber('');
      setExpiryDate('');
      setSupplierName('');
      setSupplierReference('');
      setPurchasePrice('');
      setMovementId(newMovementId());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'La réception n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-receipt-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
              <PackagePlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="stock-receipt-title" className="text-base font-black text-slate-900">Réception de stock</h2>
              <p className="truncate text-xs font-medium text-slate-500">{product.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Stock actuel</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">{formatQuantity(currentStock)} <span className="text-sm font-bold text-slate-500">unités</span></p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Après réception</p>
              <p className="text-sm font-black tabular-nums text-emerald-700">{quantity && Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 ? formatQuantity(currentStock + Number(quantity)) : '—'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Quantité reçue <span className="text-rose-600">*</span>
              <input
                autoFocus
                type="number"
                min="1"
                max="1000000"
                step="1"
                inputMode="numeric"
                required
                value={quantity}
                onChange={event => { setQuantity(event.target.value); setError(''); setSuccess(''); }}
                placeholder="Ex. 25"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              N° de lot <span className="font-medium text-slate-400">(facultatif)</span>
              <input
                value={lotNumber}
                onChange={event => setLotNumber(event.target.value)}
                maxLength={100}
                placeholder="Ex. LOT-2026-014"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Date de péremption <span className="font-medium text-slate-400">(si applicable)</span>
              <input
                type="date"
                value={expiryDate}
                onChange={event => { setExpiryDate(event.target.value); setError(''); setSuccess(''); }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Fournisseur <span className="font-medium text-slate-400">(facultatif)</span>
              <input
                value={supplierName}
                onChange={event => { setSupplierName(event.target.value); setError(''); setSuccess(''); }}
                maxLength={160}
                placeholder="Nom du fournisseur"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Référence fournisseur / facture <span className="font-medium text-slate-400">(facultatif)</span>
              <input
                value={supplierReference}
                onChange={event => { setSupplierReference(event.target.value); setError(''); setSuccess(''); }}
                maxLength={160}
                placeholder="N° de facture ou bon fournisseur"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            {canManagePurchasePrice && <label className="text-xs font-bold text-slate-700">
              Coût d’achat unitaire (FCFA) <span className="font-medium text-slate-400">(facultatif)</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={purchasePrice}
                onChange={event => { setPurchasePrice(event.target.value); setError(''); setSuccess(''); }}
                placeholder="Ex. 1250"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>}
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">
              Motif / référence fournisseur <span className="text-rose-600">*</span>
              <input
                value={reason}
                onChange={event => { setReason(event.target.value); setError(''); setSuccess(''); }}
                maxLength={500}
                required
                minLength={3}
                placeholder="Ex. Réception facture fournisseur F-2026-118"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800 sm:col-span-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
            {success && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 sm:col-span-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</p>}

            <div className="flex flex-wrap justify-end gap-2 pt-1 sm:col-span-2">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Fermer</button>
              <button type="submit" disabled={saving || !quantity || reason.trim().length < 3} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                {saving ? 'Enregistrement…' : 'Confirmer la réception'}
              </button>
            </div>
          </form>

          <section className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-800">Historique récent</h3>
                <p className="text-[10px] text-slate-500">Quantités, motifs, opérateurs et dates de mouvement</p>
              </div>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            {loadingHistory ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Chargement de l’historique…</div>
            ) : movements.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">Aucun mouvement enregistré dans le registre pour cet article.</p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {movements.slice(0, 12).map(item => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-slate-800">{movementLabels[item.type]}</p>
                      <p className="truncate text-[10px] text-slate-500">{item.reason} · {item.performedBy || 'Opérateur'}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(item.date)}{item.reference ? ` · ${item.reference}` : ''}{item.lotNumber ? ` · Lot ${item.lotNumber}` : ''}</p>
                    </div>
                    <p className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black tabular-nums text-slate-700 shadow-sm">
                      {formatQuantity(item.previousQuantity)} → {formatQuantity(item.newQuantity)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};
