import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Check, 
  AlertOctagon, 
  HelpCircle, 
  FileText, 
  Eye, 
  X, 
  ExternalLink,
  MessageCircle,
  Package,
  Activity,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { calculateItemVolumePrice, getActiveVolumeDiscountSettings } from '../utils/volumeDiscount';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  isInCart?: boolean;
  cartQuantity?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isInCart,
  cartQuantity = 0
}) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const selectedVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const isQuote = selectedVariant?.price === 0 || Boolean(product.isQuote);
  const isOutOfStock = !isQuote && product.status === 'rupture';
  const stockQty = product.quantityAvailable ?? product.stockQuantity ?? 0;
  const hasPhysicalStock = Boolean(product.hasPhysicalStock || (stockQty > 0 && product.status !== 'rupture'));
  const volumeConfig = getActiveVolumeDiscountSettings();

  const discountPercent = selectedVariant?.discountPercentage || product.discountPercentage || 0;
  const originalPrice = selectedVariant?.originalPrice || product.originalPrice;
  const hasDiscount = Boolean(!isQuote && discountPercent > 0 && originalPrice && originalPrice > selectedVariant.price);

  // Handle escape key to close bottom sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDetailOpen(false);
    };
    if (isDetailOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product, selectedVariant, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleModalAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, selectedVariant, quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      setIsDetailOpen(false);
    }, 600);
  };

  const incrementQty = () => setQuantity(q => Math.min(9999, q + 1));
  const decrementQty = () => setQuantity(q => Math.max(1, q - 1));

  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (product.galleryImages && product.galleryImages.length > 0) {
      product.galleryImages.forEach(img => {
        if (!list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [product.image, product.galleryImages]);

  const activePhoto = allImages[selectedImageIndex] || product.image || product.thumbnailUrl;

  const renderCategoryIcon = () => {
    const cat = (product.category || '').toLowerCase();
    if (cat.includes('consommable')) return <Package className="w-8 h-8 text-slate-400" />;
    if (cat.includes('équipement') || cat.includes('materiel')) return <Activity className="w-8 h-8 text-[#0d44e8]/70" />;
    if (cat.includes('mobilier')) return <ShieldCheck className="w-8 h-8 text-slate-400" />;
    return <Stethoscope className="w-8 h-8 text-slate-400" />;
  };

  const generateWhatsAppInquiryUrl = () => {
    const message = `Bonjour Gloryday Pharma Gabon, je souhaite des informations sur l'article "${product.name}" (${selectedVariant?.label || 'Standard'}) - Réf ID: ${product.id}.`;
    return `https://wa.me/24177003004?text=${encodeURIComponent(message)}`;
  };

  return (
    <>
      {/* 2-Column Responsive Card (CleanShot X: 20px radius, soft shadow, clean typography) */}
      <article
        onClick={() => setIsDetailOpen(true)}
        className={`group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200/80 transition-all duration-200 cursor-pointer overflow-hidden ${
          isOutOfStock
            ? 'opacity-60 bg-slate-50'
            : 'hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(22,22,24,0.08)]'
        }`}
        style={{
          boxShadow: 'rgba(22, 22, 24, 0.04) 0px 4px 16px -4px, rgba(22, 22, 24, 0.04) 0px 0px 0px 1px'
        }}
      >
        {/* Top Visual Area */}
        <div className="relative aspect-square m-2 sm:m-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img
              src={product.thumbnailUrl || product.image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {renderCategoryIcon()}
            </div>
          )}

          {/* Availability & Promotion Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
            {isOutOfStock ? (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs">
                Rupture
              </span>
            ) : isInCart ? (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                {cartQuantity} au panier
              </span>
            ) : hasDiscount ? (
              <span className="text-[10px] font-black text-white bg-gradient-to-r from-rose-600 to-red-500 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1 tracking-tight">
                <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                -{discountPercent}%
              </span>
            ) : hasPhysicalStock ? (
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                ✓ En stock ({stockQty})
              </span>
            ) : (
              <span className="text-[9px] font-bold text-amber-800 bg-amber-50/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                Sur commande / Devis
              </span>
            )}

            <div className="flex items-center gap-1">
              {product.pdfNoticeUrl && (
                <span className="text-[9px] font-bold text-[#0d44e8] bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded border border-blue-200 shadow-2xs flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5" />
                  PDF
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Product Info Body */}
        <div className="p-3 pt-1 flex-1 flex flex-col justify-between">
          <div>
            {/* Category text (NO PILL - quiet metadata) */}
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] text-[#6a6a6b] font-medium truncate leading-none">
                {product.subcategory || product.category}
              </span>
              {!isQuote && !isOutOfStock && volumeConfig.enabled && volumeConfig.tier1Percent > 0 && (
                <span className="text-[9px] font-bold text-[#0d44e8] bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-200/80 whitespace-nowrap">
                  -{volumeConfig.tier1Percent}% dès {volumeConfig.tier1Qty}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h3 className="text-xs sm:text-sm font-bold text-[#161618] line-clamp-2 leading-snug group-hover:text-[#0d44e8] transition-colors">
              {product.name}
            </h3>

            {/* Conditionnement hint */}
            <p className="text-[11px] text-[#6a6a6b] mt-1 truncate">
              {product.variants.length > 1 
                ? `${product.variants.length} conditionnements` 
                : selectedVariant.label}
            </p>
          </div>

          {/* Bottom Price & Quick Add Button */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
            <div>
              {isQuote ? (
                <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Sur devis
                </span>
              ) : (
                <div>
                  {hasDiscount && originalPrice && (
                    <div className="flex items-center gap-1 leading-none mb-0.5">
                      <span className="text-[10px] text-slate-400 line-through tabular-nums font-medium">
                        {originalPrice.toLocaleString('fr-FR')} F
                      </span>
                      <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded">
                        -{discountPercent}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xs sm:text-sm font-extrabold text-[#000000] tabular-nums tracking-tight">
                      {selectedVariant.price.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">F</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button with >= 44px touch hitbox */}
            {!isOutOfStock ? (
              <button
                type="button"
                onClick={handleQuickAdd}
                title={isQuote ? "Ajouter à la demande de devis" : "Ajouter 1 au panier"}
                className={`min-h-[40px] px-2.5 sm:min-h-[36px] rounded-full flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs ${
                  justAdded
                    ? 'bg-emerald-600 text-white scale-95'
                    : isQuote
                      ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95 text-[11px] font-bold'
                      : 'bg-[#0d44e8] hover:bg-[#0b3ac7] text-white active:scale-90 min-w-[40px] sm:min-w-[36px]'
                }`}
                style={{
                  boxShadow: justAdded 
                    ? 'none' 
                    : isQuote
                      ? 'rgba(180, 83, 9, 0.28) 0px 2px 6px -1px'
                      : 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
                }}
              >
                {justAdded ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : isQuote ? (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Devis</span>
                  </>
                ) : (
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
                <AlertOctagon className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      </article>

      {/* DETAIL VIEW: BOTTOM SHEET ON MOBILE, MODAL ON DESKTOP */}
      {isDetailOpen && (
        <div 
          onClick={() => setIsDetailOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
          >
            {/* Mobile Sheet Drag Handle Bar */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-300"></div>
            </div>

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-3">
                <span className="text-[11px] font-semibold text-[#6a6a6b] block">
                  {product.category} {product.subcategory ? `· ${product.subcategory}` : ''}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#161618] truncate leading-tight mt-0.5">
                  {product.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Photo Area */}
              {activePhoto ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 h-52 sm:h-64 flex items-center justify-center">
                    <img 
                      src={activePhoto} 
                      alt={product.name} 
                      className="w-full h-full object-contain p-2"
                    />
                    <a
                      href={activePhoto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-xs transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Grand format
                    </a>
                  </div>
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            selectedImageIndex === idx
                              ? 'border-[#0d44e8] ring-2 ring-[#0d44e8]/20'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-36 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center p-4">
                  {renderCategoryIcon()}
                  <span className="text-xs text-[#6a6a6b] mt-2 font-medium">Photo produit non disponible</span>
                </div>
              )}

              {/* Technical Description */}
              <div>
                <h4 className="text-xs font-bold text-[#161618] uppercase tracking-wider mb-1.5">
                  Description technique
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  {product.description || "Consommable et matériel médical homologué pour structures de santé."}
                </p>
              </div>

              {/* Technical Notice PDF if available */}
              {product.pdfNoticeUrl && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-[#0d44e8] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        Fiche technique (PDF)
                      </span>
                      <span className="text-[11px] text-[#6a6a6b] truncate block">
                        {product.pdfNoticeName || 'Notice_medicale.pdf'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={product.pdfNoticeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 rounded-lg bg-[#0d44e8] text-white text-xs font-bold shrink-0 hover:bg-[#0b3ac7] transition-colors"
                  >
                    Ouvrir
                  </a>
                </div>
              )}

              {/* Conditionnements / Variants Selector */}
              <div>
                <label className="block text-xs font-bold text-[#161618] uppercase tracking-wider mb-2">
                  Conditionnement & Tarif :
                </label>
                <div className="space-y-1.5">
                  {product.variants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedVariantIndex(i)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-xs text-left transition-all cursor-pointer ${
                        selectedVariantIndex === i
                          ? 'bg-[#eef3ff] border-2 border-[#0d44e8] font-bold text-[#0d44e8]'
                          : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span>{v.label}</span>
                      <div className="text-right">
                        {v.price > 0 ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            {((v.discountPercentage && v.discountPercentage > 0) || (product.discountPercentage && product.discountPercentage > 0)) && (v.originalPrice || product.originalPrice) && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {(v.originalPrice || product.originalPrice)!.toLocaleString('fr-FR')} F
                              </span>
                            )}
                            <span className="font-extrabold tabular-nums">
                              {v.price.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        ) : (
                          <span className="font-extrabold text-amber-700">Sur devis</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Discount Schedule */}
              {!isQuote && !isOutOfStock && volumeConfig.enabled && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0d44e8]">
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Tarifs dégressifs gros volume clinique :
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">Auto</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                    <div className={`p-1.5 rounded-lg transition-all ${quantity >= volumeConfig.tier1Qty && quantity < volumeConfig.tier2Qty ? 'bg-white shadow-xs border border-blue-300 font-bold text-[#0d44e8]' : 'bg-white/60 text-slate-600'}`}>
                      <div className="text-[10px] text-slate-500">{volumeConfig.tier1Qty}-{volumeConfig.tier2Qty - 1} unités</div>
                      <div className="font-extrabold text-emerald-600">-{volumeConfig.tier1Percent}%</div>
                    </div>
                    <div className={`p-1.5 rounded-lg transition-all ${quantity >= volumeConfig.tier2Qty && quantity < volumeConfig.tier3Qty ? 'bg-white shadow-xs border border-blue-300 font-bold text-[#0d44e8]' : 'bg-white/60 text-slate-600'}`}>
                      <div className="text-[10px] text-slate-500">{volumeConfig.tier2Qty}-{volumeConfig.tier3Qty - 1} unités</div>
                      <div className="font-extrabold text-emerald-600">-{volumeConfig.tier2Percent}%</div>
                    </div>
                    <div className={`p-1.5 rounded-lg transition-all ${quantity >= volumeConfig.tier3Qty ? 'bg-white shadow-xs border border-blue-300 font-bold text-[#0d44e8]' : 'bg-white/60 text-slate-600'}`}>
                      <div className="text-[10px] text-slate-500">{volumeConfig.tier3Qty}+ unités</div>
                      <div className="font-extrabold text-emerald-600">-{volumeConfig.tier3Percent}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              {!isOutOfStock && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">Quantité désirée :</span>
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={decrementQty}
                        disabled={quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-xs tabular-nums text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={incrementQty}
                        className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {!isQuote && (() => {
                    const calc = calculateItemVolumePrice(selectedVariant.price, quantity, false);
                    return calc.savings > 0 ? (
                      <p className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Remise volume : -{calc.savings.toLocaleString('fr-FR')} FCFA ({calc.discountPercent}%)
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (Fixed in Sheet) */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
              <a
                href={generateWhatsAppInquiryUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-emerald-700 shrink-0 transition-colors"
                title="Poser une question sur WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>

              <button
                type="button"
                onClick={handleModalAdd}
                disabled={isOutOfStock}
                className={`flex-1 h-12 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : justAdded
                      ? 'bg-emerald-600 text-white'
                      : isQuote
                        ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]'
                        : 'bg-[#0d44e8] hover:bg-[#0b3ac7] text-white active:scale-[0.98]'
                }`}
                style={{
                  boxShadow: isOutOfStock || justAdded
                    ? 'none'
                    : isQuote
                      ? 'rgba(180, 83, 9, 0.28) 0px 2px 6px -1px'
                      : 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
                }}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isQuote ? 'Ajouté à la demande de devis !' : 'Ajouté au panier !'}</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Article temporairement indisponible</span>
                ) : isQuote ? (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Demander un devis ({quantity} unité{quantity > 1 ? 's' : ''})</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>
                      Ajouter · {(() => {
                        const calc = calculateItemVolumePrice(selectedVariant.price, quantity, false);
                        return `${calc.totalWithDiscount.toLocaleString('fr-FR')} F`;
                      })()}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
