import React, { useState } from 'react';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Product } from '../types';
import { recordAuditLog } from '../utils/auditLogger';

interface StockLotsModuleProps {
  products: Product[];
  onToggleProductStock: (productId: string, currentStatus: 'disponible' | 'rupture') => Promise<void>;
  actorName?: string;
  actorRole?: string;
}

export const StockLotsModule: React.FC<StockLotsModuleProps> = ({
  products,
  onToggleProductStock,
  actorName = 'Gestionnaire Catalogue',
  actorRole = 'Super-Admin'
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'rupture' | 'disponible'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRestockList, setCopiedRestockList] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const categories = ['Toutes', ...Array.from(new Set(products.map(p => p.category)))];

  const availableProducts = products.filter(p => p.status === 'disponible');
  const outOfStockProducts = products.filter(p => p.status === 'rupture');
  const availabilityRate = products.length > 0
    ? Math.round((availableProducts.length / products.length) * 100)
    : 100;

  const filteredProducts = products.filter(p => {
    if (statusFilter === 'rupture' && p.status !== 'rupture') return false;
    if (statusFilter === 'disponible' && p.status !== 'disponible') return false;
    if (categoryFilter !== 'Toutes' && p.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggle = async (product: Product) => {
    setUpdatingId(product.id);
    const nextStatus = product.status === 'disponible' ? 'rupture' : 'disponible';
    try {
      await onToggleProductStock(product.id, product.status);
      recordAuditLog({
        category: 'stock',
        action: nextStatus === 'disponible' ? 'Réapprovisionnement Article' : 'Signalement Rupture Stock',
        actorName,
        actorRole,
        targetReference: product.id.toUpperCase(),
        details: `L'article "${product.name}" (${product.category}) a été passé à l'état "${nextStatus.toUpperCase()}".`,
        status: nextStatus === 'disponible' ? 'success' : 'warning'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyOutOfStockList = () => {
    if (outOfStockProducts.length === 0) return;
    const lines = [
      `LISTE DE RÉASSORT — GLORYDAY PHARMA GABON (${new Date().toLocaleDateString('fr-FR')})`,
      `Articles en rupture à réapprovisionner (${outOfStockProducts.length}) :`,
      ...outOfStockProducts.map((p, idx) => `${idx + 1}. ${p.name} [${p.category}]`)
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedRestockList(true);
    setTimeout(() => setCopiedRestockList(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* 1. STOCK AVAILABILITY KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Références Catalogue</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{products.length}</div>
          <span className="text-[11px] text-slate-500">Gestion simplifiée active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">En Stock Disponible</span>
          <div className="text-2xl font-black text-emerald-900 mt-1 tabular-nums">{availableProducts.length}</div>
          <span className="text-[11px] text-emerald-700">Prêts pour livraison express</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Articles en Rupture</span>
          <div className="text-2xl font-black text-rose-900 mt-1 tabular-nums">{outOfStockProducts.length}</div>
          <span className="text-[11px] text-rose-700">À commander au fournisseur</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d44e8] block">Taux de Disponibilité</span>
          <div className="text-2xl font-black text-[#0d44e8] mt-1 tabular-nums">{availabilityRate}%</div>
          <span className="text-[11px] text-blue-700">Dépôt Central Libreville</span>
        </div>
      </div>

      {/* 2. MAIN STOCK AVAILABILITY & RESTOCK TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Pilotage Rapide des Stocks & Réassorts ({filteredProducts.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Basculez en un clic la disponibilité de vos produits (Disponible / Rupture) avec journalisation automatique.
            </p>
          </div>

          {outOfStockProducts.length > 0 && (
            <button
              type="button"
              onClick={handleCopyOutOfStockList}
              className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-center shadow-xs"
            >
              {copiedRestockList ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRestockList ? 'Liste copiée !' : `Copier liste de réassort (${outOfStockProducts.length})`}</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rupture')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                statusFilter === 'rupture'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>En Rupture ({outOfStockProducts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disponible')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                statusFilter === 'disponible'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Disponibles ({availableProducts.length})</span>
            </button>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs ml-1"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un dispositif ou consommable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-full lg:w-64 focus:ring-2 focus:ring-[#0d44e8]"
            />
          </div>
        </div>

        {/* Product Rows */}
        <div className="divide-y divide-slate-100">
          {filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Aucun produit trouvé pour ces critères.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isAvailable = product.status === 'disponible';
              const minPrice = product.variants.length > 0 ? product.variants[0].price : 0;

              return (
                <div
                  key={product.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {product.thumbnailUrl || product.image ? (
                        <img
                          src={product.thumbnailUrl || product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {product.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          · {product.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                        {product.variants.length} conditionnement(s) · Dès {minPrice > 0 ? `${minPrice.toLocaleString('fr-FR')} FCFA` : 'Sur devis'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={updatingId === product.id}
                      onClick={() => handleToggle(product)}
                      className={`py-1.5 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-900 hover:bg-rose-100 hover:text-rose-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 hover:bg-emerald-100 hover:text-emerald-900 border border-rose-300'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Disponible (Mettre en rupture)</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>En Rupture (Réapprovisionner)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
