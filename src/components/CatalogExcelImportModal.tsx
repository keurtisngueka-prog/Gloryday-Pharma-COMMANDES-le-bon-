import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Check,
  X,
  Upload,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Package,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { Product } from '../types';
import { CatalogImportPreviewResult } from '../utils/dataExport';
import { api } from '../api';

interface CatalogExcelImportModalProps {
  preview: CatalogImportPreviewResult | null;
  onClose: () => void;
  onSuccess: (updatedCatalog: Product[], summaryMessage: string) => void;
}

export const CatalogExcelImportModal: React.FC<CatalogExcelImportModalProps> = ({
  preview,
  onClose,
  onSuccess
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'updated' | 'created'>('all');
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!preview) return null;

  const totalChanges = preview.updatedItems.length + preview.createdItems.length;

  const handleConfirmImport = async () => {
    if (totalChanges === 0) {
      onClose();
      return;
    }
    setIsApplying(true);
    setErrorMsg(null);
    try {
      const res = await api.bulkUpsertProducts(preview.productsToUpsert);
      try {
        localStorage.setItem('gloryday_products_v2', JSON.stringify(res.products));
        localStorage.setItem('gloryday_products', JSON.stringify(res.products));
      } catch {
        // Ignore storage quota warnings
      }
      onSuccess(
        res.products,
        `Import Excel appliqué : ${res.updatedCount} article(s) mis à jour et ${res.createdCount} nouvel(aux) article(s) créé(s).`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de la synchronisation avec le serveur.');
    } finally {
      setIsApplying(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base truncate">
                Aperçu avant importation Excel / CSV
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                Fichier analysé : <span className="font-mono font-bold text-emerald-300">{preview.fileName}</span> ({preview.totalRowsRead} ligne(s) lues)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Counters Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-white border border-blue-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-blue-700 block">
                  Articles existants modifiés
                </span>
                <span className="text-lg font-black text-slate-900">
                  {preview.updatedItems.length}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#0d44e8] font-bold text-[11px]">
                Stocks / Prix / Statuts
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-emerald-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">
                  Nouveaux articles détectés
                </span>
                <span className="text-lg font-black text-slate-900">
                  {preview.createdItems.length}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                Création auto.
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                  Articles sans changement
                </span>
                <span className="text-lg font-black text-slate-700">
                  {preview.unchangedCount}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold text-[11px]">
                Ignorés
              </span>
            </div>
          </div>

          {totalChanges > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Toutes les modifications ({totalChanges})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('updated')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                    activeFilter === 'updated'
                      ? 'bg-[#0d44e8] text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Mis à jour ({preview.updatedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('created')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                    activeFilter === 'created'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Nouveaux articles ({preview.createdItems.length})
                </button>
              </div>
              <span className="text-[11px] text-slate-500">
                Stock &gt; 0 = <strong>Achat direct client</strong> · Stock 0 = <strong>Demande de devis auto.</strong>
              </span>
            </div>
          )}
        </div>

        {/* Body / Diff List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {!preview.success ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Impossible de lire ce fichier</h4>
                <p className="mt-1 text-xs">{preview.message}</p>
              </div>
            </div>
          ) : totalChanges === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Check className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-sm text-slate-900">
                Aucune différence détectée avec le catalogue actuel
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Les {preview.unchangedCount} articles présents dans votre fichier Excel ont déjà exactement les mêmes quantités en stock, prix et statuts dans votre base.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* UPDATED ITEMS TABLE */}
              {(activeFilter === 'all' || activeFilter === 'updated') &&
                preview.updatedItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-[#0d44e8]" />
                      <span>Articles existants mis à jour ({preview.updatedItems.length})</span>
                    </h4>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                      {preview.updatedItems.map((item) => {
                        const stockChanged = item.previousStock !== item.newStock;
                        const priceChanged = item.previousPrice !== item.newPrice;
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {item.name}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                  {item.id}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  · {item.category}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {item.changesSummary.map((c, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0d44e8] border border-blue-200 font-bold text-[10px]"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              {/* Stock badge */}
                              <div
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                                  stockChanged
                                    ? item.newStock > 0
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                      : 'bg-amber-50 border-amber-300 text-amber-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <span>Stock :</span>
                                <span className="font-mono">{item.previousStock}</span>
                                <ArrowRight className="w-3 h-3 opacity-70" />
                                <span className="font-mono font-black">{item.newStock} u.</span>
                              </div>

                              {/* Price badge */}
                              <div
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                                  priceChanged
                                    ? 'bg-blue-50 border-blue-300 text-blue-950'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <span>Prix :</span>
                                <span className="font-mono">
                                  {item.newPrice > 0
                                    ? `${item.newPrice.toLocaleString('fr-FR')} F`
                                    : 'Sur devis'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* CREATED ITEMS TABLE */}
              {(activeFilter === 'all' || activeFilter === 'created') &&
                preview.createdItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Nouveaux articles à créer ({preview.createdItems.length})</span>
                    </h4>
                    <div className="rounded-2xl border border-emerald-200 overflow-hidden divide-y divide-emerald-100 bg-emerald-50/20">
                      {preview.createdItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[10px] uppercase">
                                Nouveau
                              </span>
                              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                {item.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Catégorie : <strong>{item.category}</strong> · {item.variantsCount} variante(s) · ID :{' '}
                              <span className="font-mono">{item.id}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 font-bold text-[11px]">
                              Stock initial : <strong>{item.newStock} u.</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-[11px]">
                              {item.newPrice > 0
                                ? `${item.newPrice.toLocaleString('fr-FR')} FCFA`
                                : 'Sur devis'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            {totalChanges > 0 ? (
              <span>
                Prêt à synchroniser <strong>{totalChanges} article(s)</strong> dans votre espace Admin et côté Client.
              </span>
            ) : (
              <span>Aucune écriture requise.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
            >
              Annuler
            </button>
            {preview.success && totalChanges > 0 && (
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                disabled={isApplying}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronisation en cours...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      Confirmer et importer ({totalChanges} article{totalChanges > 1 ? 's' : ''})
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
