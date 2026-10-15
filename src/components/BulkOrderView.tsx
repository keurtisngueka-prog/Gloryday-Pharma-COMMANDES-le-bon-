import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Search, 
  ShoppingBag, 
  Check, 
  Plus, 
  Minus, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Package, 
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Product, ProductVariant } from '../types';

interface BulkOrderViewProps {
  products: Product[];
  onAddMultipleToCart: (items: { product: Product; variant: ProductVariant; quantity: number }[]) => void;
  onGoToCart: () => void;
}

export const BulkOrderView: React.FC<BulkOrderViewProps> = ({
  products,
  onAddMultipleToCart,
  onGoToCart
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('all');
  
  // Map of `${productId}___${variantLabel}` -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Selected variant per product: productId -> variantLabel
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const [addedSuccessToast, setAddedSuccessToast] = useState(false);

  // Quick category filters targeted to hospital departments
  const quickFilters = [
    { id: 'all', label: 'Tous les consommables' },
    { id: 'gants', label: '🧤 Gants & Protection', match: ['gant', 'masque', 'blouse', 'protection'] },
    { id: 'seringues', label: '💉 Seringues & Aiguilles', match: ['seringue', 'aiguille', 'épicrânienne', 'prélèvement'] },
    { id: 'perfusion', label: '💧 Perfusion & Cathéters', match: ['perfuseur', 'cathéter', 'perfusion', 'robinet', 'prolongateur'] },
    { id: 'compresses', label: '🩹 Compresses & Pansements', match: ['compresse', 'pansement', 'bande', 'coton', 'gaze'] },
    { id: 'tests', label: '🔬 Réactifs & Tests TDR', match: ['test', 'tdr', 'paludisme', 'vih', 'réactif', 'glycémie'] }
  ];

  // Helper to get chosen variant for a product
  const getProductVariant = (product: Product): ProductVariant => {
    const chosenLabel = selectedVariants[product.id];
    if (chosenLabel) {
      const found = product.variants.find(v => v.label === chosenLabel);
      if (found) return found;
    }
    return product.variants[0];
  };

  const getItemKey = (productId: string, variantLabel: string) => `${productId}___${variantLabel}`;

  const setItemQuantity = (product: Product, variant: ProductVariant, qty: number) => {
    const key = getItemKey(product.id, variant.label);
    const validQty = Math.max(0, Math.min(9999, isNaN(qty) ? 0 : qty));
    setQuantities(prev => ({
      ...prev,
      [key]: validQty
    }));
  };

  const handleVariantChange = (product: Product, newVariantLabel: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [product.id]: newVariantLabel
    }));
  };

  // Filter products based on search & quick filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesCat = product.category.toLowerCase().includes(q);
        const matchesSubcat = (product.subcategory || '').toLowerCase().includes(q);
        const matchesRef = (product.id || '').toLowerCase().includes(q);
        const matchesVariants = product.variants.some(v => v.label.toLowerCase().includes(q));
        if (!matchesName && !matchesCat && !matchesSubcat && !matchesRef && !matchesVariants) {
          return false;
        }
      }

      // 2. Quick filter
      if (selectedQuickFilter !== 'all') {
        const activeFilter = quickFilters.find(f => f.id === selectedQuickFilter);
        if (activeFilter && activeFilter.match) {
          const haystack = `${product.name} ${product.category} ${product.subcategory || ''}`.toLowerCase();
          const matchFound = activeFilter.match.some(keyword => haystack.includes(keyword));
          if (!matchFound) return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedQuickFilter]);

  // Compute selected items statistics
  const selectedEntries = useMemo(() => {
    const entries: { product: Product; variant: ProductVariant; quantity: number; subtotal: number }[] = [];
    
    products.forEach(p => {
      p.variants.forEach(v => {
        const key = getItemKey(p.id, v.label);
        const qty = quantities[key] || 0;
        if (qty > 0 && p.status !== 'rupture') {
          entries.push({
            product: p,
            variant: v,
            quantity: qty,
            subtotal: v.price * qty
          });
        }
      });
    });

    return entries;
  }, [products, quantities]);

  const totalSelectedLines = selectedEntries.length;
  const totalSelectedUnits = selectedEntries.reduce((sum, item) => sum + item.quantity, 0);
  const totalEstimatedAmount = selectedEntries.reduce((sum, item) => sum + item.subtotal, 0);

  // Quick Preset Packs for Block Majors and Pharmacists
  const applyPreset = (presetType: 'bloc' | 'perfusion' | 'urgence') => {
    const newQty = { ...quantities };

    if (presetType === 'bloc') {
      products.forEach(p => {
        const name = p.name.toLowerCase();
        if (name.includes('gant') && name.includes('chirurgicaux')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 20;
        } else if (name.includes('compresse') && name.includes('stérile')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 30;
        } else if (name.includes('bétadine') || name.includes('antiseptique') || name.includes('povidone')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 5;
        } else if (name.includes('blouse') || name.includes('charlotte') || name.includes('masque')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 15;
        }
      });
    } else if (presetType === 'perfusion') {
      products.forEach(p => {
        const name = p.name.toLowerCase();
        if (name.includes('perfuseur')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 40;
        } else if (name.includes('cathéter') || name.includes('cathlon')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 30;
        } else if (name.includes('robinet') || name.includes('3 voies')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 20;
        } else if (name.includes('sparadrap') || name.includes('pansement')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 10;
        }
      });
    } else if (presetType === 'urgence') {
      products.forEach(p => {
        const name = p.name.toLowerCase();
        if (name.includes('seringue')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 50;
        } else if (name.includes('gant') && name.includes('latex')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 25;
        } else if (name.includes('tdr') || name.includes('paludisme')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 10;
        } else if (name.includes('aiguille')) {
          newQty[getItemKey(p.id, p.variants[0]?.label || '')] = 30;
        }
      });
    }

    setQuantities(newQty);
  };

  const handleClearAll = () => {
    setQuantities({});
  };

  // Submit all bulk lines to main cart
  const handleTransferToCart = () => {
    if (selectedEntries.length === 0) return;
    
    onAddMultipleToCart(
      selectedEntries.map(e => ({
        product: e.product,
        variant: e.variant,
        quantity: e.quantity
      }))
    );

    setAddedSuccessToast(true);
    setTimeout(() => {
      setAddedSuccessToast(false);
    }, 3500);
  };

  return (
    <div className="space-y-5 pb-32">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Saisie Tabulaire Express pour Établissements de Santé
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tableau de Commande Rapide (Bulk Order)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Majors de bloc opératoire, surveillants généraux et pharmaciens : saisissez directement les quantités nécessaires sans ouvrir chaque fiche produit.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center gap-4 shrink-0">
            <div>
              <span className="text-[10px] text-slate-300 uppercase font-semibold block">Articles Saisis</span>
              <span className="text-xl font-black text-white">{totalSelectedLines} <span className="text-xs font-normal text-slate-300">({totalSelectedUnits} u)</span></span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div>
              <span className="text-[10px] text-slate-300 uppercase font-semibold block">Estimation</span>
              <span className="text-xl font-black text-emerald-400">{totalEstimatedAmount.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-300">FCFA</span></span>
            </div>
          </div>
        </div>

        {/* Quick Presets Buttons */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Pré-remplissage rapide :
          </span>
          <button
            type="button"
            onClick={() => applyPreset('bloc')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10"
          >
            🩺 Kit Bloc Opératoire (Gants + Compresses)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('perfusion')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10"
          >
            💧 Kit Perfusion & Cathéters
          </button>
          <button
            type="button"
            onClick={() => applyPreset('urgence')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10"
          >
            ⚡ Pack Réassort Urgences
          </button>
          {totalSelectedLines > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold transition-colors cursor-pointer border border-rose-500/30 ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser les quantités
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Recherche instantanée : compresse, perfuseur, latex, 5ml, 18G..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0d44e8] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Effacer
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-semibold shrink-0 self-center">
            {filteredProducts.length} référence(s) affichée(s)
          </div>
        </div>

        {/* Quick Department Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              type="button"
              onClick={() => setSelectedQuickFilter(qf.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedQuickFilter === qf.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">État</th>
                <th className="py-3.5 px-4">Désignation du Consommable</th>
                <th className="py-3.5 px-3">Variante / Conditionnement</th>
                <th className="py-3.5 px-3 text-right">Prix Unitaire</th>
                <th className="py-3.5 px-4 text-center w-48">Quantité à Commander</th>
                <th className="py-3.5 px-4 text-right w-36">Sous-Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">Aucun article ne correspond aux filtres sélectionnés.</p>
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSelectedQuickFilter('all'); }}
                      className="mt-2 text-xs font-bold text-[#0d44e8] hover:underline"
                    >
                      Réinitialiser la recherche
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const currentVariant = getProductVariant(product);
                  const key = getItemKey(product.id, currentVariant.label);
                  const qty = quantities[key] || 0;
                  const isOutOfStock = product.status === 'rupture';
                  const rowSubtotal = currentVariant.price * qty;
                  const isSelected = qty > 0;

                  return (
                    <tr 
                      key={product.id}
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-blue-50/60 font-medium' 
                          : isOutOfStock 
                            ? 'bg-slate-50/40 opacity-75' 
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Check / Status Icon */}
                      <td className="py-3 px-4 text-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-lg bg-[#0d44e8] text-white flex items-center justify-center mx-auto shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isOutOfStock ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 block mx-auto" title="Rupture"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 block mx-auto"></span>
                        )}
                      </td>

                      {/* Product Name & Subcategory */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {(product.image || product.thumbnailUrl) && (
                            <img 
                              src={product.image || product.thumbnailUrl} 
                              alt={product.name} 
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                            />
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {product.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-400">Réf: {product.id.slice(0, 10)}</span>
                              <span>·</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {product.subcategory || product.category}
                              </span>
                              {product.isPromotion && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                                  Promo {product.discountPercentage ? `-${product.discountPercentage}%` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Variant Selector */}
                      <td className="py-3 px-3">
                        {product.variants.length > 1 ? (
                          <select
                            value={currentVariant.label}
                            onChange={(e) => handleVariantChange(product, e.target.value)}
                            disabled={isOutOfStock}
                            className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-[#0d44e8] focus:outline-none"
                          >
                            {product.variants.map((v) => (
                              <option key={v.label} value={v.label}>
                                {v.label} {v.price > 0 ? `(${v.price.toLocaleString('fr-FR')} F)` : '(Sur devis)'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700 font-medium text-xs">
                            {currentVariant.label || 'Standard'}
                          </span>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {currentVariant.price > 0 ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {currentVariant.price.toLocaleString('fr-FR')} F
                            </span>
                            {currentVariant.originalPrice && currentVariant.originalPrice > currentVariant.price && (
                              <span className="text-[10px] text-slate-400 line-through block">
                                {currentVariant.originalPrice.toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                            Sur Devis
                          </span>
                        )}
                      </td>

                      {/* Direct Numeric Quantity Input with Stepper */}
                      <td className="py-3 px-4">
                        {isOutOfStock ? (
                          <div className="text-center text-xs font-bold text-rose-600 bg-rose-50 py-1.5 px-2 rounded-lg border border-rose-200">
                            En rupture temporaire
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setItemQuantity(product, currentVariant, qty - 1)}
                              disabled={qty <= 0}
                              className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max="9999"
                              value={qty === 0 ? '' : qty}
                              placeholder="0"
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setItemQuantity(product, currentVariant, isNaN(val) ? 0 : val);
                              }}
                              className={`w-18 text-center py-1.5 px-2 rounded-lg border font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0d44e8] transition-all ${
                                qty > 0 
                                  ? 'border-[#0d44e8] bg-white text-[#0d44e8] ring-1 ring-[#0d44e8]' 
                                  : 'border-slate-300 bg-slate-50 text-slate-800'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => setItemQuantity(product, currentVariant, qty + 1)}
                              className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick +10 / +50 for major clinics */}
                            <div className="hidden sm:flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => setItemQuantity(product, currentVariant, qty + 10)}
                                className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="+10 unités"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemQuantity(product, currentVariant, qty + 50)}
                                className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="+50 unités"
                              >
                                +50
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Row Subtotal */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {currentVariant.price > 0 ? (
                          <span className={`font-mono font-bold text-xs sm:text-sm ${
                            rowSubtotal > 0 ? 'text-[#0d44e8]' : 'text-slate-400'
                          }`}>
                            {rowSubtotal.toLocaleString('fr-FR')} F
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {qty > 0 ? `${qty} u. sur devis` : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Bar at Bottom when Items are Selected */}
      <div className={`fixed bottom-0 inset-x-0 z-30 transition-all duration-300 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl ${
        totalSelectedLines > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div className="w-10 h-10 rounded-xl bg-[#0d44e8] text-white flex items-center justify-center font-black shrink-0">
              {totalSelectedLines}
            </div>
            <div>
              <div className="font-extrabold text-slate-900">
                {totalSelectedLines} ligne(s) sélectionnée(s) · {totalSelectedUnits} unité(s)
              </div>
              <div className="text-slate-500 text-xs">
                Montant total estimé : <strong className="text-emerald-700 text-sm">{totalEstimatedAmount.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearAll}
              className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Vider
            </button>

            <button
              type="button"
              onClick={handleTransferToCart}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <ShoppingBag className="w-4 h-4 text-[#0d44e8]" />
              <span>Transférer au Panier</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleTransferToCart();
                onGoToCart();
              }}
              className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              style={{
                boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
              }}
            >
              <span>Valider la Commande</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {addedSuccessToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white py-3 px-5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>Articles transférés dans votre panier avec succès !</span>
        </div>
      )}
    </div>
  );
};
