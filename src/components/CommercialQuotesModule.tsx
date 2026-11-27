import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  MessageCircle, 
  X,
  Briefcase,
  Search
} from 'lucide-react';
import { CommercialQuote, Product, User } from '../types';
import { api } from '../api';
import { formatProductNameWithVariant } from '../utils/productDisplay';

interface CommercialQuotesModuleProps {
  quotes: CommercialQuote[];
  assignedClients: any[];
  products: Product[];
  currentCommercial: User;
  onRefreshQuotes: () => void;
}

const createEmptyQuoteLine = () => ({
  productId: '',
  variantIndex: 0,
  quantity: 1,
  discountPercent: 0,
});

export const CommercialQuotesModule: React.FC<CommercialQuotesModuleProps> = ({
  quotes,
  assignedClients,
  products,
  currentCommercial,
  onRefreshQuotes
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; variantIndex: number; quantity: number; discountPercent: number }[]>([
    createEmptyQuoteLine()
  ]);
  const [productFilter, setProductFilter] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [validDays, setValidDays] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productQuery = productFilter.trim().toLocaleLowerCase('fr');
  const matchingProducts = productQuery.length < 2 ? [] : products.filter((product) =>
    `${product.name} ${product.reference || ''} ${product.category} ${product.subcategory || ''}`
      .toLocaleLowerCase('fr')
      .includes(productQuery)
  );

  const updateSelectedItem = (index: number, changes: Partial<(typeof selectedItems)[number]>) => {
    setSelectedItems((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    setSelectedItems(prev => [...prev, createEmptyQuoteLine()]);
  };

  const openCreateModal = () => {
    setSelectedClientId('');
    setSelectedItems([createEmptyQuoteLine()]);
    setProductFilter('');
    setDiscountType('percent');
    setDiscountValue(0);
    setValidDays(15);
    setNotes('');
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleRemoveItem = (idx: number) => {
    if (selectedItems.length <= 1) return;
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const v = prod?.variants[item.variantIndex] || prod?.variants[0];
      if (prod?.isQuote) return sum;
      const p = v?.price || 0;
      return sum + p * Math.max(1, Math.trunc(Number(item.quantity) || 1));
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const lineDiscountAmount = selectedItems.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants[item.variantIndex] || product?.variants[0];
    if (product?.isQuote) return sum;
    const grossLineTotal = (Number(variant?.price) || 0) * Math.max(1, Math.trunc(Number(item.quantity) || 1));
    return sum + Math.round(grossLineTotal * Math.min(100, Math.max(0, Number(item.discountPercent) || 0)) / 100);
  }, 0);
  const subtotalAfterLineDiscount = Math.max(0, subtotal - lineDiscountAmount);
  const generalDiscountAmount = discountType === 'percent'
    ? Math.round((subtotalAfterLineDiscount * Math.min(100, discountValue)) / 100)
    : Math.min(subtotalAfterLineDiscount, Math.round(discountValue));
  const discountAmount = lineDiscountAmount + generalDiscountAmount;
  const finalTotal = Math.max(0, subtotalAfterLineDiscount - generalDiscountAmount);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Veuillez sélectionner un établissement client');
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue < 0 || (discountType === 'percent' && discountValue > 100)) {
      setError('La remise générale doit être positive et ne peut pas dépasser 100 %.');
      return;
    }
    if (selectedItems.length === 0 || selectedItems.some((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants?.[item.variantIndex] || product?.variants?.[0];
      return !product || !variant || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000
        || !Number.isFinite(item.discountPercent) || item.discountPercent < 0 || item.discountPercent > 100;
    })) {
      setError('Vérifiez chaque produit, conditionnement et quantité (1 à 10 000).');
      return;
    }
    const client = assignedClients.find(c => c.id === selectedClientId) || assignedClients[0];
    if (!client) {
      setError('Client assigné introuvable');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const itemsPayload = selectedItems.map(item => {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) throw new Error('Choisissez un produit sur chaque ligne du devis.');
        const v = prod.variants[item.variantIndex] || prod.variants[0];
        if (!v) throw new Error('Choisissez un conditionnement pour chaque produit.');
        return {
          productId: prod.id,
          productReference: prod.reference,
          productName: prod.name,
          variant: v.label,
          price: v.price,
          quantity: item.quantity,
          total: prod.isQuote || v.price <= 0 ? 0 : v.price * item.quantity,
          discountPercent: item.discountPercent,
          savings: prod.isQuote || v.price <= 0 ? 0 : Math.round((v.price || 0) * item.quantity * item.discountPercent / 100),
          isQuote: v.price === 0 || Boolean(prod.isQuote)
        };
      });

      await api.createQuote({
        customerId: client.id,
        customer: {
          facilityName: client.facilityName,
          contactName: client.contactName || client.facilityName,
          phone: client.companyPhone || client.phone,
          deliveryAddress: client.deliveryAddress || 'Libreville',
          deliveryMode: 'livraison',
          paymentMethod: 'airtel_money'
        },
        items: itemsPayload,
        discountType,
        discountValue,
        validDays,
        notes
      });
      onRefreshQuotes();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du devis');
    } finally {
      setSubmitting(false);
    }
  };

  const generateWhatsAppQuoteUrl = (quote: CommercialQuote) => {
    const cleanPhone = quote.customer.phone.replace(/[^0-9]/g, '');
    const lines = [
      `Bonjour ${quote.customer.facilityName},`,
      `Voici votre proposition commerciale de Gloryday Pharma :`,
      `📄 *Devis N° ${quote.reference}*`,
      `📅 Validité : jusqu'au ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}`,
      '',
      '*Détail des articles :*'
    ];
    quote.items.forEach((it, i) => {
      lines.push(`${i + 1}. ${it.quantity}x ${formatProductNameWithVariant(it.productName, it.variant)} = ${it.isQuote ? 'Sur devis' : `${it.total.toLocaleString('fr-FR')} FCFA${it.savings ? ` · remise article ${it.savings.toLocaleString('fr-FR')} FCFA` : ''}`}`);
    });
    lines.push('');
    lines.push(`💰 Sous-total : ${quote.subtotal.toLocaleString('fr-FR')} FCFA`);
    if (quote.discountAmount > 0) {
      lines.push(`🏷️ Remise accordée : -${quote.discountAmount.toLocaleString('fr-FR')} FCFA`);
    }
    lines.push(`⭐ *TOTAL NET À PAYER :* ${quote.finalTotal.toLocaleString('fr-FR')} FCFA (Sans TVA)`);
    if (quote.notes) lines.push(`📝 Note : ${quote.notes}`);
    lines.push('');
    lines.push('Merci de confirmer votre accord pour lancer la livraison.');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 px-2 sm:px-0">
      {/* Top Banner */}
      <div className="bg-[#0f0f12] text-white rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d44e8]">
            Espace Négociation & Devis
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            Portefeuille Commercial · {currentCommercial.contactName || currentCommercial.facilityName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Établissez des propositions avec remise personnalisée pour vos clients et transmettez-les sur WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="h-10 px-4 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau devis avec remise
        </button>
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Devis & Offres émises ({quotes.length})
          </h3>
          <span className="text-xs text-[#6a6a6b]">
            {assignedClients.length} client(s) dans votre portefeuille
          </span>
        </div>

        {quotes.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            Aucun devis émis pour l'instant. Cliquez sur "Nouveau devis" pour créer une offre.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotes.map((quote) => (
              <div key={quote.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-[#0d44e8]">
                      {quote.reference}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {quote.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Valable jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-800">
                    <strong>{quote.customer.facilityName}</strong> · Contact : {quote.customer.contactName} ({quote.customer.phone})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                    <span>Sous-total : {quote.subtotal.toLocaleString('fr-FR')} F</span>
                    {quote.discountAmount > 0 && (
                      <span className="text-emerald-700 font-bold">
                        Remise : -{quote.discountAmount.toLocaleString('fr-FR')} F
                      </span>
                    )}
                    <span className="font-black text-slate-900">
                      Net : {quote.finalTotal.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                <a
                  href={generateWhatsAppQuoteUrl(quote)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-center"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Envoyer WhatsApp
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal create quote */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form onSubmit={handleCreateQuote} className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0d44e8]" />
                Nouveau devis commercial
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Établissement client assigné
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                >
                    <option value="">Choisir un établissement</option>
                  {assignedClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.facilityName} ({c.facilityType || 'Clinique'}) - entreprise {c.companyPhone || c.phone}{c.loginPhone ? ` · connexion ${c.loginPhone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 uppercase">Articles</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[#0d44e8] font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </button>
                </div>
                <label className="relative mb-2 block">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={productFilter}
                    onChange={(event) => setProductFilter(event.target.value)}
                    placeholder="Filtrer par nom, référence ou catégorie…"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs"
                  />
                </label>
                <p className="mb-2 text-[10px] text-slate-500">
                  {productQuery.length < 2 ? 'Saisissez au moins 2 caractères pour afficher les produits à choisir.' : `${matchingProducts.length} produit(s) correspondant(s)`}
                </p>
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => {
                    const selectedProduct = products.find((candidate) => candidate.id === item.productId);
                    const selectedVariant = selectedProduct?.variants[item.variantIndex] || selectedProduct?.variants[0];
                    const quoteLine = !selectedVariant || Boolean(selectedProduct?.isQuote) || Number(selectedVariant.price) <= 0;
                    const lineGross = quoteLine ? 0 : (Number(selectedVariant?.price) || 0) * Math.max(1, item.quantity || 1);
                    const lineDiscount = Math.round(lineGross * item.discountPercent / 100);
                    return <div key={idx} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_76px_92px_32px] sm:items-center">
                      <select
                        value={item.productId}
                        onChange={(e) => updateSelectedItem(idx, { productId: e.target.value, variantIndex: 0, discountPercent: 0 })}
                        disabled={productQuery.length < 2 && !item.productId}
                        aria-label={`Produit ligne ${idx + 1}`}
                        className="min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      >
                        <option value="">{productQuery.length < 2 ? 'Filtrer les produits d’abord' : 'Choisir un produit'}</option>
                        {productQuery.length >= 2 && matchingProducts.length === 0 && <option value="" disabled>Aucun résultat</option>}
                        {(() => {
                          const selectedProduct = products.find((candidate) => candidate.id === item.productId);
                          const options = matchingProducts.some((candidate) => candidate.id === item.productId) || !selectedProduct
                            ? matchingProducts
                            : [selectedProduct, ...matchingProducts];
                          return options.map(p => (
                          <option key={p.id} value={p.id}>{p.reference ? `${p.reference} · ` : ''}{p.name}</option>
                        ));
                        })()}
                      </select>
                      <select
                        aria-label={`Conditionnement ligne ${idx + 1}`}
                        value={item.variantIndex}
                        onChange={(event) => updateSelectedItem(idx, { variantIndex: Number(event.target.value), discountPercent: 0 })}
                        className="min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      >
                        {(products.find((candidate) => candidate.id === item.productId)?.variants || []).map((variant, variantIndex) => (
                          <option key={`${variant.label}-${variantIndex}`} value={variantIndex}>{variant.label} · {variant.price > 0 ? `${variant.price.toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateSelectedItem(idx, { quantity: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-center text-xs font-bold"
                      />
                      <label className="text-[10px] font-bold text-slate-600">Remise article %
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={item.discountPercent}
                          onChange={(event) => updateSelectedItem(idx, { discountPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
                          disabled={quoteLine}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-center text-xs font-bold"
                          aria-label={`Remise pour l’article ${idx + 1}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={selectedItems.length <= 1}
                        className="justify-self-end p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {lineDiscount > 0 && <p className="text-[10px] font-semibold text-emerald-700 sm:col-span-5">Remise sur cette ligne : −{lineDiscount.toLocaleString('fr-FR')} FCFA · net après remise : {(lineGross - lineDiscount).toLocaleString('fr-FR')} FCFA</p>}
                    </div>
                  })}
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Type de remise
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setDiscountType('percent'); setDiscountValue(value => Math.min(100, value)); }}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${
                        discountType === 'percent' ? 'bg-[#0d44e8] text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Pourcentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('amount')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${
                        discountType === 'amount' ? 'bg-[#0d44e8] text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Montant (F)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Valeur remise
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    step="1"
                    value={discountValue}
                    onChange={(e) => {
                      const entered = parseFloat(e.target.value) || 0;
                      setDiscountValue(Math.max(0, discountType === 'percent' ? Math.min(100, entered) : entered));
                    }}
                    className="w-full p-1.5 rounded-lg border border-slate-300 bg-white font-bold text-right"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total avant remises :</span>
                  <span className="font-bold tabular-nums">{subtotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {lineDiscountAmount > 0 && <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Remises par article :</span>
                  <span className="tabular-nums">−{lineDiscountAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>}
                {generalDiscountAmount > 0 && <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Remise générale :</span>
                  <span className="tabular-nums">−{generalDiscountAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>}
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total des remises :</span>
                  <span className="tabular-nums">-{discountAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total Net :</span>
                  <span className="text-[#0d44e8] tabular-nums">{finalTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Conditions particulières
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Livraison prioritaire offerte, paiement à 30 jours..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2 px-5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold shadow-md"
              >
                {submitting ? 'Création...' : 'Créer le devis'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
