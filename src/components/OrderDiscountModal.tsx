import React, { useEffect, useState } from 'react';
import { LoaderCircle, Percent, X } from 'lucide-react';
import type { Order, OrderDiscountSummary } from '../types';
import { api } from '../api';
import { FREE_DELIVERY_THRESHOLD_FCFA } from '../utils/orderFinance';
import { getNeighborhoodById } from '../data/librevilleZones';

interface OrderDiscountModalProps {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}

const formatMoney = (amount: number) => `${Math.max(0, Math.round(amount)).toLocaleString('fr-FR')} FCFA`;

export const OrderDiscountModal: React.FC<OrderDiscountModalProps> = ({ order, onClose, onSaved }) => {
  const [summary, setSummary] = useState<OrderDiscountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api.getOrderDiscountSummary(order.id).then((loadedSummary) => {
      if (!active) return;
      setSummary(loadedSummary);
      const initialType = loadedSummary.discountType || 'amount';
      setDiscountType(initialType);
      setDiscountValue(String(loadedSummary.discountValue ?? loadedSummary.currentDiscountAmount ?? 0));
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les montants de cette commande.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [order.id]);

  const baseSubtotal = summary?.baseSubtotal ?? 0;
  const numericValue = Number(discountValue);
  const safeValue = Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
  const previewDiscount = discountType === 'percent'
    ? Math.round(baseSubtotal * Math.min(100, safeValue) / 100)
    : Math.min(baseSubtotal, Math.round(safeValue));
  const discountedSubtotal = Math.max(0, baseSubtotal - previewDiscount);
  const neighborhood = summary?.neighborhoodId ? getNeighborhoodById(summary.neighborhoodId) : undefined;
  const deliveryFee = !summary || summary.deliveryMode === 'retrait'
    ? 0
    : neighborhood?.id === 'centre-ville'
      ? summary.baseDeliveryFee
      : discountedSubtotal >= FREE_DELIVERY_THRESHOLD_FCFA
        ? 0
        : summary.baseDeliveryFee;
  const previewTotal = discountedSubtotal + deliveryFee;
  const hasInvoice = summary?.hasInvoice ?? false;
  const isCancelled = summary?.isCancelled ?? order.status === 'Annulée';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading || !summary || hasInvoice || isCancelled) return;
    if (!Number.isFinite(numericValue) || numericValue < 0 || (discountType === 'percent' && numericValue > 100)) {
      setError('Saisissez un montant positif ou un pourcentage compris entre 0 et 100.');
      return;
    }
    if (discountType === 'amount' && Math.round(numericValue) > baseSubtotal) {
      setError('La remise dépasse le sous-total des articles chiffrés.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateOrderDiscount(order.id, {
        discountType,
        discountValue: numericValue,
        note: note.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La remise n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="order-discount-title" className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-100 p-2 text-emerald-800"><Percent className="h-5 w-5" /></span>
            <div>
              <h2 id="order-discount-title" className="text-lg font-black text-slate-950">Accorder une remise</h2>
              <p className="mt-1 text-xs text-slate-600">Commande {order.reference} · {order.customer.facilityName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {loading && <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement des montants de la commande…</p>}
          {isCancelled && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Une commande annulée ne peut pas recevoir de remise.</p>}
          {hasInvoice && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Une facture existe déjà pour cette commande. Une remise ne peut plus modifier une facture émise.</p>}
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <label className="text-xs font-bold text-slate-700">Type de remise
              <select value={discountType} onChange={(event) => {
                const nextType = event.target.value as 'percent' | 'amount';
                setDiscountType(nextType);
                if (nextType === 'percent') setDiscountValue((value) => String(Math.min(100, Number(value) || 0)));
              }} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="amount">Montant en FCFA</option>
                <option value="percent">Pourcentage</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">{discountType === 'amount' ? 'Montant' : 'Pourcentage'}
              <input required type="number" min="0" max={discountType === 'percent' ? 100 : baseSubtotal} step={discountType === 'percent' ? 0.1 : 1} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm tabular-nums" />
            </label>
          </div>

          <label className="block text-xs font-bold text-slate-700">Motif (facultatif)
            <input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. geste commercial demandé par le client" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <div className="flex justify-between gap-3 text-slate-600"><span>Sous-total avant nouvelle remise</span><strong>{formatMoney(baseSubtotal)}</strong></div>
            <div className="mt-2 flex justify-between gap-3 text-emerald-800"><span>Remise appliquée</span><strong>−{formatMoney(previewDiscount)}</strong></div>
            <div className="mt-2 flex justify-between gap-3 text-slate-600"><span>Livraison</span><strong>{formatMoney(deliveryFee)}</strong></div>
            <div className="mt-3 flex justify-between gap-3 border-t border-slate-200 pt-3 text-sm font-black text-slate-950"><span>Nouveau total proforma</span><strong>{formatMoney(previewTotal)}</strong></div>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">La remise est répartie entre les articles chiffrés après les remises déjà appliquées aux lignes. Elle remplace toute remise globale précédente. La proforma du client connecté est actualisée et une notification lui est envoyée. Une remise à 0 retire la remise globale.</p>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Annuler</button>
            <button type="submit" disabled={saving || loading || !summary || hasInvoice || isCancelled} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? 'Enregistrement…' : 'Enregistrer la remise'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
