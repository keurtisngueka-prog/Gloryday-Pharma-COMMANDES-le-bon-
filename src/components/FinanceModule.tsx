import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Plus, Receipt, RotateCcw, Wallet } from 'lucide-react';
import { api } from '../api';
import type { OperatingExpense, OperatingExpenseCategory, Order, Product } from '../types';

interface FinanceModuleProps {
  orders: Order[];
  products: Product[];
  canManageExpenses: boolean;
}

const categories: Array<{ value: OperatingExpenseCategory; label: string }> = [
  { value: 'transport', label: 'Transport' },
  { value: 'loyer', label: 'Loyer' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'communication', label: 'Communication' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'frais_bancaires', label: 'Frais bancaires' },
  { value: 'autre', label: 'Autre' },
];

const paymentMethods = [
  { value: '', label: 'Non précisé' },
  { value: 'especes', label: 'Espèces' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'moov_money', label: 'Moov Money' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'autre', label: 'Autre' },
];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Libreville' });
const currentMonth = () => today().slice(0, 7);
const money = (amount: number) => `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
const categoryName = (category: OperatingExpenseCategory) => categories.find((item) => item.value === category)?.label || 'Autre';

export const FinanceModule: React.FC<FinanceModuleProps> = ({ orders, products, canManageExpenses }) => {
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [form, setForm] = useState({
    date: today(),
    category: 'transport' as OperatingExpenseCategory,
    description: '',
    amount: '',
    paymentMethod: '',
    supplier: '',
    reference: '',
  });

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setExpenses(await api.getOperatingExpenses());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les dépenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const filteredExpenses = useMemo(() => expenses.filter((expense) => month === 'all' || expense.date.startsWith(month)), [expenses, month]);
  const activeExpenses = useMemo(() => filteredExpenses.filter((expense) => expense.status === 'active'), [filteredExpenses]);
  const expensesTotal = useMemo(() => activeExpenses.reduce((sum, expense) => sum + expense.amount, 0), [activeExpenses]);
  const availableMonths = useMemo(() => [...new Set([currentMonth(), ...expenses.map((expense) => expense.date.slice(0, 7))])].sort((left, right) => right.localeCompare(left)), [expenses]);

  const marginSummary = useMemo(() => {
    const productById = new Map(products.map((product) => [product.id, product]));
    let knownSales = 0;
    let knownCost = 0;
    let missingCostSales = 0;
    for (const order of orders) {
      if (order.status === 'Annulée' || (month !== 'all' && !order.createdAt.startsWith(month))) continue;
      for (const item of order.items || []) {
        if (item.isQuote || item.isDeferredStock) continue;
        const purchasePrice = productById.get(item.productId)?.purchasePrice;
        if (typeof purchasePrice === 'number' && purchasePrice > 0) {
          knownSales += item.total || 0;
          knownCost += purchasePrice * item.quantity;
        } else {
          missingCostSales += item.total || 0;
        }
      }
    }
    const coverage = knownSales + missingCostSales > 0
      ? Math.round((knownSales / (knownSales + missingCostSales)) * 100)
      : 0;
    return { knownSales, knownCost, missingCostSales, coverage, grossMargin: knownSales - knownCost };
  }, [orders, products, month]);
  const marginAfterExpenses = marginSummary.grossMargin - expensesTotal;
  const marginAfterExpensesReady = marginSummary.knownSales > 0 && marginSummary.missingCostSales === 0;

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await api.createOperatingExpense({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || undefined,
        supplier: form.supplier.trim() || undefined,
        reference: form.reference.trim() || undefined,
      });
      setExpenses((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setForm((previous) => ({ ...previous, description: '', amount: '', supplier: '', reference: '' }));
      setMonth(saved.date.slice(0, 7));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La dépense n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  const voidExpense = async (expense: OperatingExpense) => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.voidOperatingExpense(expense.id, voidReason.trim());
      setExpenses((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      setVoidingId(null);
      setVoidReason('');
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : 'L’annulation n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = filteredExpenses.map((expense) => [
      expense.date,
      categoryName(expense.category),
      expense.description,
      expense.supplier || '',
      expense.reference || '',
      expense.amount,
      expense.paymentMethod || '',
      expense.status === 'annulee' ? 'Annulée' : 'Active',
      expense.recordedByName,
      expense.voidedByName || '',
      expense.voidReason || '',
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'));
    const content = '\uFEFF' + [
      ['Date', 'Catégorie', 'Dépense', 'Fournisseur', 'Référence', 'Montant FCFA', 'Paiement', 'Statut', 'Enregistrée par', 'Annulée par', 'Motif annulation'].join(';'),
      ...rows,
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `depenses_gloryday_${month}_${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-tab-enter space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Wallet className="h-4 w-4 text-rose-600" /> Dépenses actives</div>
          <div className="mt-2 text-xl font-black tabular-nums text-slate-900">{money(expensesTotal)}</div>
          <div className="mt-1 text-xs text-slate-500">{activeExpenses.length} écriture(s) {month === 'all' ? 'au total' : `en ${month}`}</div>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-800">Marge indicative connue</div>
          <div className={`mt-2 text-xl font-black tabular-nums ${marginSummary.missingCostSales > 0 && marginSummary.knownSales === 0 ? 'text-amber-800' : marginSummary.grossMargin < 0 ? 'text-rose-700' : 'text-emerald-900'}`}>{marginSummary.missingCostSales > 0 && marginSummary.knownSales === 0 ? 'À compléter' : money(marginSummary.grossMargin)}</div>
          <div className="mt-1 text-xs text-emerald-800">Ventes avec coût connu : {marginSummary.coverage}%</div>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-blue-800">Ventes sans coût renseigné</div>
          <div className="mt-2 text-xl font-black tabular-nums text-blue-950">{money(marginSummary.missingCostSales)}</div>
          <div className="mt-1 text-xs text-blue-800">Chiffre d’affaires concerné, pas un coût d’achat</div>
        </article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-800">Marge indicative après frais</div>
          <div className={`mt-2 text-xl font-black tabular-nums ${marginAfterExpensesReady && marginAfterExpenses < 0 ? 'text-rose-700' : marginAfterExpensesReady ? 'text-violet-950' : 'text-amber-800'}`}>{marginAfterExpensesReady ? money(marginAfterExpenses) : marginSummary.missingCostSales > 0 ? 'Coûts à compléter' : 'Aucune vente'}</div>
          <div className="mt-1 text-xs text-violet-800">Affichée seulement si les coûts d’achat des ventes sont renseignés</div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {canManageExpenses && <form onSubmit={submitExpense} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Plus className="h-4 w-4" /></span>
            <div><h2 className="font-bold text-slate-900">Nouvelle dépense</h2><p className="text-xs text-slate-500">L’achat de stock se saisit dans la réception du lot.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Date
              <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Catégorie
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as OperatingExpenseCategory })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Libellé
              <input required minLength={3} maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ex. Transport livraison fournisseur" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Montant (FCFA)
              <input required type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Ex. 25000" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm tabular-nums" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Mode de paiement
              <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                {paymentMethods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">Fournisseur / bénéficiaire
              <input maxLength={150} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Référence justificatif
              <input maxLength={100} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Facture ou reçu" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <button disabled={saving || !form.description.trim() || Number(form.amount) < 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
          </button>
        </form>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-blue-700" /><div><h2 className="font-bold text-slate-900">Journal des dépenses</h2><p className="text-xs text-slate-500">Chaque écriture conserve son auteur et son historique.</p></div></div>
            <div className="flex items-center gap-2">
              <select aria-label="Période des dépenses" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">
                <option value="all">Toute la période</option>
                {availableMonths.map((value) => <option key={value} value={value}>{value === currentMonth() ? 'Mois actuel' : value}</option>)}
              </select>
              <button type="button" onClick={exportCsv} disabled={!filteredExpenses.length} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"><Download className="h-3.5 w-3.5" /> CSV</button>
            </div>
          </div>

          {error && <div role="alert" className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {loading ? <div className="p-8 text-center text-sm text-slate-500">Chargement du journal…</div> : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center"><RotateCcw className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">Aucune dépense sur cette période</p><p className="mt-1 text-xs text-slate-500">Les frais enregistrés apparaîtront ici.</p></div>
          ) : (
            <div className="max-h-[620px] divide-y divide-slate-100 overflow-auto">
              {filteredExpenses.map((expense) => (
                <article key={expense.id} className={`p-4 ${expense.status === 'annulee' ? 'bg-slate-50/80 opacity-75' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">{new Date(`${expense.date}T12:00:00`).toLocaleDateString('fr-FR')}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{categoryName(expense.category)}</span>{expense.status === 'annulee' && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Annulée</span>}</div>
                      <h3 className="mt-1.5 break-words text-sm font-bold text-slate-900">{expense.description}</h3>
                      <p className="mt-1 text-xs text-slate-500">{[expense.supplier, expense.reference && `Réf. ${expense.reference}`, paymentMethods.find((item) => item.value === expense.paymentMethod)?.label].filter(Boolean).join(' · ') || 'Détails facultatifs non renseignés'}</p>
                      <p className="mt-1 text-[11px] text-slate-400">Saisie par {expense.recordedByName} · {new Date(expense.createdAt).toLocaleString('fr-FR')}</p>
                      {expense.voidReason && <p className="mt-1 text-[11px] font-medium text-rose-700">Annulée par {expense.voidedByName} · {expense.voidReason}</p>}
                    </div>
                    <div className="text-right"><div className={`font-mono text-sm font-black tabular-nums ${expense.status === 'annulee' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{money(expense.amount)}</div>{canManageExpenses && expense.status === 'active' && <button type="button" onClick={() => { setVoidingId(expense.id); setVoidReason(''); }} className="mt-2 text-[11px] font-bold text-rose-700 hover:text-rose-900">Annuler</button>}</div>
                  </div>
                  {voidingId === expense.id && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <label className="block text-xs font-semibold text-rose-900">Motif d’annulation
                        <input autoFocus minLength={3} maxLength={500} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm" />
                      </label>
                      <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setVoidingId(null)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-900">Retour</button><button type="button" disabled={saving || voidReason.trim().length < 3} onClick={() => voidExpense(expense)} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Confirmer l’annulation</button></div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
      <p className="text-xs leading-relaxed text-slate-500">La marge est indicative : elle utilise le prix d’achat actuel de la fiche produit. Les ventes sans coût renseigné sont exclues du calcul. Pour une marge historique exacte, le coût doit être figé sur chaque ligne au moment de la vente.</p>
    </div>
  );
};
