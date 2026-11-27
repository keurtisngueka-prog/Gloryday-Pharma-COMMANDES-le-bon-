import React, { useState, useEffect } from 'react';
import { Sparkles, MessageCircle, ShoppingBag, Check, Layers, ChevronRight, X } from 'lucide-react';
import { Pack, Product } from '../types';
import { formatProductNameWithVariant } from '../utils/productDisplay';
import { getPackPricingSummary } from '../utils/packPricing';
import { generateWhatsAppPackUrl } from '../utils/whatsapp';
import './PacksSection.css';

interface PacksSectionProps {
  packs: Pack[];
  products: Product[];
  onAddPackToCart: (pack: Pack) => void;
  openPackId?: string | null;
  onResetOpenPackId?: () => void;
}

export const PacksSection: React.FC<PacksSectionProps> = ({
  packs,
  products,
  onAddPackToCart,
  openPackId,
  onResetOpenPackId
}) => {
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [addedPacks, setAddedPacks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (openPackId && packs.length > 0) {
      const found = packs.find(p => p.id === openPackId) || packs[0];
      if (found) {
        setSelectedPack(found);
      }
      onResetOpenPackId?.();
    }
  }, [openPackId, packs, onResetOpenPackId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPack(null);
    };
    if (selectedPack) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPack]);

  if (packs.length === 0) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0d44e8]">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Aucun pack médical publié pour le moment</h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-slate-600">
          Les packs et campagnes s’afficheront ici dès que l’équipe Gloryday Pharma en aura publié. Vous pouvez déjà commander les articles séparément dans le catalogue.
        </p>
      </section>
    );
  }

  const handleAdd = (pack: Pack) => {
    onAddPackToCart(pack);
    setAddedPacks(prev => ({ ...prev, [pack.id]: true }));
    setTimeout(() => {
      setAddedPacks(prev => ({ ...prev, [pack.id]: false }));
    }, 1500);
  };

  const selectedPackPricing = selectedPack
    ? getPackPricingSummary(selectedPack, products)
    : { savings: 0, discountPercent: 0 };

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#161618] tracking-tight flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="text-amber-900">Packs promotionnels</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-[#6a6a6b]">
            Kits complets prêts à l'emploi à tarif préférentiel
          </p>
        </div>
      </div>

      {/* Horizontal Carousel on Mobile (snap-x), 3 columns on Desktop */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x snap-mandatory">
        {packs.map((pack, index) => {
          const isAdded = addedPacks[pack.id];
          const pricing = getPackPricingSummary(pack, products);
          return (
            <div
              key={pack.id}
              className="promo-pack-card min-w-[280px] sm:min-w-0 flex-1 snap-start border-2 border-amber-300 hover:border-amber-400 bg-white rounded-2xl transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md"
              style={{
                boxShadow: 'rgba(22, 22, 24, 0.04) 0px 4px 16px -4px, rgba(22, 22, 24, 0.04) 0px 0px 0px 1px',
                animationDelay: `${Math.min(index, 5) * 90}ms`,
              }}
            >
              {/* Media Container */}
              <div
                onClick={() => setSelectedPack(pack)}
                className="relative h-48 overflow-hidden bg-slate-100 cursor-pointer group"
              >
                <img
                  src={pack.image}
                  alt={pack.title}
                  className="promo-pack-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                <div className="promo-pack-badge absolute top-3 left-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-2.5 py-1 text-[10px] font-black text-amber-950 shadow-2xs">
                  <Sparkles className="h-3 w-3 text-amber-900" />
                  PACK PROMOTIONNEL
                </div>
                {pricing.discountPercent > 0 && (
                  <div className="absolute top-3 right-3 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-rose-600 text-white shadow-lg ring-2 ring-white/90">
                    <span className="text-sm font-black leading-none">−{pricing.discountPercent}%</span>
                    <span className="mt-1 text-[7px] font-bold tracking-wide">SUR LE PACK</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent">
                </div>
              </div>

              {/* Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base leading-tight text-[#161618] line-clamp-2 mb-1">
                    {pack.title}
                  </h3>
                  <p className="text-[11px] text-[#6a6a6b] line-clamp-2 leading-relaxed mb-2.5">
                    {pack.description}
                  </p>

                  {/* Included items summary */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3 text-[11px] text-slate-700">
                    <span className="font-bold text-[#161618] block mb-1">
                      Contenu ({pack.items.length} articles) :
                    </span>
                    <ul className="space-y-0.5">
                      {pack.items.slice(0, 2).map((item, idx) => (
                        <li key={idx} className="truncate flex items-center justify-between">
                          <span className="truncate pr-1">• {formatProductNameWithVariant(item.productName, item.variant)}</span>
                          <span className="font-semibold text-slate-900 shrink-0">x{item.quantity}</span>
                        </li>
                      ))}
                      {pack.items.length > 2 && (
                        <li className="text-[10px] text-[#0d44e8] font-medium pt-0.5">
                          + {pack.items.length - 2} autre(s) article(s)...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Promotion price and CTA */}
                <div>
                  <div className="mb-3 rounded-xl bg-rose-50/80 border border-rose-100 p-3">
                    {pricing.listPrice && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-slate-500">Valeur des articles séparés</span>
                        <span className="text-[10px] font-semibold text-slate-500 line-through tabular-nums">{pricing.listPrice.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}
                    <div className="mt-1 flex items-end justify-between gap-2">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-rose-700">Prix spécial du pack</span>
                        <span className="text-xl font-black text-[#161618] tabular-nums">{pack.price.toLocaleString('fr-FR')}</span>
                        <span className="ml-1 text-[10px] font-bold text-slate-600">FCFA</span>
                      </div>
                      {pricing.savings > 0 && (
                        <span className="max-w-[105px] rounded-lg bg-rose-600 px-2 py-1.5 text-center text-[9px] font-extrabold leading-tight text-white">
                          Économie<br />{pricing.savings.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_44px] gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdd(pack)}
                      className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0d44e8] hover:bg-[#0b3ac7] text-white active:scale-[0.98]'
                      }`}
                      style={{
                        boxShadow: isAdded 
                          ? 'none' 
                          : 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Ajouté !
                        </>
                      ) : (
                        <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                          Ajouter le pack
                        </>
                      )}
                    </button>

                    <a
                      href={generateWhatsAppPackUrl(pack)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#161618] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Discuter du pack sur WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="sr-only">WhatsApp</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPack(pack)}
                    className="w-full text-center text-[10px] text-[#6a6a6b] hover:text-[#161618] font-medium mt-2 flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    Voir le détail complet
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Bottom Sheet / Modal */}
      {selectedPack && (
        <div 
          onClick={() => setSelectedPack(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-300"></div>
            </div>

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                  Pack promotionnel
                </span>
                <h3 className="text-base font-bold text-[#161618] leading-tight">
                  {selectedPack.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPack(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-rose-100">
                <img
                  src={selectedPack.image}
                  alt={selectedPack.title}
                  className="w-full h-full object-cover"
                />
                {selectedPackPricing.discountPercent > 0 && <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-lg">−{selectedPackPricing.discountPercent}%</span>}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {selectedPack.description}
              </p>

              <div>
                <h4 className="text-xs font-bold text-[#161618] uppercase tracking-wider mb-2">
                  Composition complète du kit ({selectedPack.items.length} articles) :
                </h4>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                  {selectedPack.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="font-semibold text-slate-900 block">{formatProductNameWithVariant(it.productName, it.variant)}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-900 shrink-0 ml-2">
                        x {it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-end justify-between gap-3">
                <div>
                  {selectedPackPricing.listPrice && <span className="block text-[11px] text-slate-500 line-through">Valeur séparée : {selectedPackPricing.listPrice.toLocaleString('fr-FR')} FCFA</span>}
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-rose-700">Prix spécial du pack</span>
                  <span className="text-xl font-black text-[#000000] tabular-nums">{selectedPack.price.toLocaleString('fr-FR')}</span>
                  <span className="text-xs font-bold text-slate-500 ml-1">FCFA</span>
                  <span className="text-[10px] text-slate-400 block">Sans TVA</span>
                </div>
                {selectedPackPricing.savings > 0 && <span className="rounded-lg bg-rose-600 px-2.5 py-2 text-center text-[10px] font-extrabold text-white">Économisez<br />{selectedPackPricing.savings.toLocaleString('fr-FR')} F</span>}
              </div>
              {selectedPackPricing.savings > 0 && (
                <p className="text-[10px] text-rose-700 font-semibold">Cette réduction compare le prix du pack à la valeur normale de ses articles séparés.</p>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
              <a
                href={generateWhatsAppPackUrl(selectedPack)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-emerald-700 shrink-0 transition-colors"
                title="Discuter sur WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  handleAdd(selectedPack);
                  setSelectedPack(null);
                }}
                className="flex-1 h-12 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                style={{
                  boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ajouter le Pack ({selectedPack.price.toLocaleString('fr-FR')} FCFA)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
