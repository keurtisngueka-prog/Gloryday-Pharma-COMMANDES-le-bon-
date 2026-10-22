import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Check, 
  ShieldCheck, 
  Layers, 
  Thermometer, 
  FileText, 
  Sparkles, 
  Maximize2,
  TrendingDown,
  Info
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { getProductSpecialty, getSpecialtyLabel } from '../utils/specialties';
import { calculateItemVolumePrice, VOLUME_TIERS } from '../utils/volumeDiscount';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart
}: ProductDetailModalProps) {
  if (!isOpen || !product) return null;

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const currentVariant = product.variants[selectedVariantIndex] || product.variants[0] || { label: 'Standard', price: 0 };
  const isQuote = currentVariant.price === 0;

  // Calculation for volume discount
  const volumeCalc = calculateItemVolumePrice(currentVariant.price, quantity, isQuote);

  const images = [
    product.image || product.thumbnailUrl,
    ...(product.galleryImages || [])
  ].filter(Boolean) as string[];

  const specialtyId = getProductSpecialty(product);
  const specialtyLabel = getSpecialtyLabel(specialtyId);

  const handleAdd = () => {
    onAddToCart(product, currentVariant, quantity);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 600);
  };

  const sterilityText = product.specifications?.sterility || 'Non renseignée';
  const latexText = product.specifications?.latexFree === undefined
    ? 'Non renseignée'
    : product.specifications.latexFree ? 'Sans latex' : 'Contient du latex';
  const packagingText = product.specifications?.packaging || 'Non renseigné';
  const storageText = product.specifications?.storage || 'Non renseignées';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Bar Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-[#0d44e8]">{specialtyLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Réf: {product.id.toUpperCase()}</span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Main Visual & Key Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Visual Container */}
            <div className="space-y-3">
              <div className="relative aspect-4/3 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center group">
                {images.length > 0 ? (
                  <img
                    src={images[activeImageIndex] || images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-4 text-center">
                    <ShieldCheck className="w-12 h-12 mb-2 stroke-[1.5]" />
                    <span className="text-xs font-medium">Image du produit non disponible</span>
                  </div>
                )}
                
                {product.status === 'rupture' ? (
                  <span className="absolute top-3 left-3 bg-rose-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                    Rupture temporaire
                  </span>
                ) : (
                  <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                    En stock Libreville
                  </span>
                )}
              </div>

              {/* Thumbnails if multiple images */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                        activeImageIndex === idx ? 'border-[#0d44e8] shadow-xs' : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Core Medical Badges */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {product.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  {product.description || 'Description à compléter.'}
                </p>
              </div>

              {/* Clinical Specs Quick Row */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0d44e8]" /> Stérilité :
                  </span>
                  <span className="font-semibold">{sterilityText}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0d44e8]" /> Présence de latex :
                  </span>
                  <span className="font-semibold">{latexText}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0d44e8]" /> Conditionnement :
                  </span>
                  <span className="font-semibold">{packagingText}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-[#0d44e8]" /> Stockage :
                  </span>
                  <span className="font-semibold">{storageText}</span>
                </div>
              </div>

              {/* Pricing Display */}
              <div className="pt-2">
                {isQuote ? (
                  <div className="text-lg font-bold text-amber-600">
                    Sur devis personnalisé
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                        {volumeCalc.discountedUnitPrice.toLocaleString('fr-FR')} FCFA
                      </span>
                      {volumeCalc.discountPercent > 0 && (
                        <span className="text-xs line-through text-slate-400 font-mono tabular-nums">
                          {currentVariant.price.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                      <span className="text-xs text-slate-500">/ unité</span>
                    </div>

                    {volumeCalc.savings > 0 && (
                      <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Économie volume : -{volumeCalc.savings.toLocaleString('fr-FR')} FCFA ({volumeCalc.discountPercent}%)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Volume Discount Schedule Grid */}
          {!isQuote && (
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0d44e8]">
                  <TrendingDown className="w-4 h-4" />
                  <span>Grille de Remises Dégressives Cliniques</span>
                </div>
                <span className="text-[11px] text-blue-700 font-medium">Application automatique</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded-xl text-xs transition-all ${quantity >= 5 && quantity < 10 ? 'bg-white shadow-xs border border-blue-300 font-bold text-[#0d44e8]' : 'bg-white/60 text-slate-600'}`}>
                  <div className="text-[11px] font-semibold text-slate-500">5 à 9 unités</div>
                  <div className="text-sm font-extrabold text-emerald-600 font-mono">-5%</div>
                </div>
                <div className={`p-2 rounded-xl text-xs transition-all ${quantity >= 10 && quantity < 20 ? 'bg-white shadow-xs border border-blue-300 font-bold text-[#0d44e8]' : 'bg-white/60 text-slate-600'}`}>
                  <div className="text-[11px] font-semibold text-slate-500">10 à 19 unités</div>
                  <div className="text-sm font-extrabold text-emerald-600 font-mono">-10%</div>
                </div>
                <div className={`p-2 rounded-xl text-xs transition-all ${quantity >= 20 ? 'bg-white shadow-xs border border-blue-300 font-bold text-[#0d44e8]' : 'bg-white/60 text-slate-600'}`}>
                  <div className="text-[11px] font-semibold text-slate-500">20+ unités</div>
                  <div className="text-sm font-extrabold text-emerald-600 font-mono">-15%</div>
                </div>
              </div>
            </div>
          )}

          {/* Variant Selector */}
          {product.variants.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                Conditionnement & Calibre disponible :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariantIndex(i)}
                    className={`p-3 text-left rounded-xl border text-xs transition-all flex items-center justify-between ${
                      selectedVariantIndex === i
                        ? 'border-[#0d44e8] bg-blue-50/50 ring-1 ring-[#0d44e8] font-semibold text-slate-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span>{v.label}</span>
                    <span className="font-mono tabular-nums text-slate-900 font-bold">
                      {v.price > 0 ? `${v.price.toLocaleString('fr-FR')} F` : 'Sur devis'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector & Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Quantité :</span>
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors text-base font-bold disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors text-base font-bold"
                >
                  +
                </button>
              </div>

              {!isQuote && (
                <div className="text-xs text-slate-500 font-mono">
                  Total : <span className="font-bold text-slate-900">{volumeCalc.totalWithDiscount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={product.status === 'rupture'}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                product.status === 'rupture'
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : addedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-[#0d44e8] hover:bg-[#0b3ac7] text-white shadow-[#0d44e8]/25'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Ajouté au panier !</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ajouter au panier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
