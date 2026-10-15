import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  MessageCircle, 
  X,
  Briefcase
} from 'lucide-react';
import { CommercialQuote, Product, User } from '../types';
import { api } from '../api';

interface CommercialQuotesModuleProps {
  quotes: CommercialQuote[];
  assignedClients: any[];
  products: Product[];
  currentCommercial: User;
  onRefreshQuotes: () => void;
}

export const CommercialQuotesModule: React.FC<CommercialQuotesModuleProps> = ({
  quotes,
  assignedClients,
  products,
  currentCommercial,
  onRefreshQuotes
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; variantIndex: number; quantity: number }[]>([
    { productId: products[0]?.id || '', variantIndex: 0, quantity: 1 }
  ]);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(5);
  const [validDays, setValidDays] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    setSelectedItems(prev => [...prev, { productId: products[0]?.id || '', variantIndex: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (selectedItems.length <= 1) return;
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const v = prod?.variants[item.variantIndex] || prod?.variants[0];
      const p = v?.price || 0;
      return sum + p * item.quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = discountType === 'percent'
    ? Math.round((subtotal * Math.min(100, discountValue)) / 100)
    : Math.min(subtotal, Math.round(discountValue));
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Veuillez sélectionner un établissement client');
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
        const prod = products.find(p => p.id === item.productId) || products[0];
        const v = prod.variants[item.variantIndex] || prod.variants[0];
        return {
          productId: prod.id,
          productName: prod.name,
          variant: v.label,
          price: v.price,
          quantity: item.quantity,
          total: v.price * item.quantity,
          isQuote: v.price === 0
        };
      });

      await api.createQuote({
        customerId: client.id,
        customer: {
          facilityName: client.facilityName,
          contactName: client.contactName || client.facilityName,
          phone: client.phone,
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
      lines.push(`${i + 1}. ${it.quantity}x ${it.productName} (${it.variant}) = ${it.total.toLocaleString('fr-FR')} FCFA`);
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
          onClick={() => {
            if (assignedClients.length > 0) {
              setSelectedClientId(assignedClients[0].id);
            }
            setIsCreateModalOpen(true);
          }}
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
          <form onSubmit={handleCreateQuote} className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
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
                  {assignedClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.facilityName} ({c.facilityType || 'Clinique'}) - {c.phone}
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
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setSelectedItems(prev => {
                            const copy = [...prev];
                            copy[idx].productId = newId;
                            return copy;
                          });
                        }}
                        className="flex-1 p-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const q = parseInt(e.target.value, 10) || 1;
                          setSelectedItems(prev => {
                            const copy = [...prev];
                            copy[idx].quantity = q;
                            return copy;
                          });
                        }}
                        className="w-16 p-1.5 rounded-lg border border-slate-300 bg-white text-center font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={selectedItems.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
                      onClick={() => setDiscountType('percent')}
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
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 rounded-lg border border-slate-300 bg-white font-bold text-right"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total :</span>
                  <span className="font-bold tabular-nums">{subtotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Remise déduite :</span>
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
