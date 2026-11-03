import React, { useEffect, useMemo, useState } from 'react';
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
  ArrowUpDown,
  Clock3,
  RefreshCw,
  ShieldAlert,
  RotateCw,
  Trash2,
  X
} from 'lucide-react';
import { Order, Product, StockBatch, StockMovement } from '../types';
import { recordAuditLog } from '../utils/auditLogger';
import { matchesProductSearch } from '../utils/search';
import { api } from '../api';

interface StockLotsModuleProps {
  products: Product[];
  orders?: Order[];
  onProductStockChanged?: (product: Product) => void;
  onToggleProductStock: (productId: string, currentStatus: 'disponible' | 'rupture') => Promise<void>;
  canToggleStock?: boolean;
  canExportStock?: boolean;
  canViewStockCosts?: boolean;
  canManageBatches?: boolean;
  actorName?: string;
  actorRole?: string;
}

export const StockLotsModule: React.FC<StockLotsModuleProps> = ({
  products,
  orders = [],
  onProductStockChanged,
  onToggleProductStock,
  canToggleStock = true,
  canExportStock = true,
  canViewStockCosts = false,
  canManageBatches = false,
  actorName = 'Gestionnaire Catalogue',
  actorRole = 'Super-Admin'
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'rupture' | 'disponible' | 'sur-commande' | 'sous-seuil'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRestockList, setCopiedRestockList] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState('');
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState('');
  const [batchQuery, setBatchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState<'all' | 'expiring' | 'expired' | 'quarantine'>('all');
  const [periodFilter, setPeriodFilter] = useState<'7' | '30' | '90' | 'all'>('30');
  const [exportError, setExportError] = useState('');
  const [batchAction, setBatchAction] = useState<{ batch: StockBatch; targetStatus: 'disponible' | 'quarantaine' | 'detruit' } | null>(null);
  const [batchActionReason, setBatchActionReason] = useState('');
  const [batchActionError, setBatchActionError] = useState('');
  const [batchActionSaving, setBatchActionSaving] = useState(false);
  const [confirmBatchDestruction, setConfirmBatchDestruction] = useState(false);

  const loadBatches = async () => {
    setBatchesLoading(true);
    setBatchesError('');
    try {
      setStockBatches(await api.getStockBatches());
    } catch (error) {
      setBatchesError(error instanceof Error ? error.message : 'Le registre des lots est indisponible.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const loadMovements = async () => {
    setMovementsLoading(true);
    setMovementsError('');
    try {
      setStockMovements(await api.getStockMovements());
    } catch (error) {
      setMovementsError(error instanceof Error ? error.message : 'Le journal des mouvements est indisponible.');
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => { void loadBatches(); void loadMovements(); }, []);

  const categories = ['Toutes', ...Array.from(new Set(products.map(p => p.category)))];

  const isQuoteOnly = (product: Product) => Boolean(
    product.isQuote || (product.variants.length > 0 && product.variants.every(variant => variant.price === 0))
  );
  const hasPhysicalStock = (product: Product) => {
    const quantity = Number(product.quantityAvailable ?? product.stockQuantity ?? 0);
    return !isQuoteOnly(product) && product.status !== 'rupture' && quantity > 0;
  };
  const stockTrackedProducts = products.filter(product => !isQuoteOnly(product));
  const availableProducts = stockTrackedProducts.filter(hasPhysicalStock);
  const recordedStockUnits = stockTrackedProducts.reduce((total, product) => total + Math.max(0, Number(product.quantityAvailable ?? product.stockQuantity ?? 0)), 0);
  const availableUnits = availableProducts.reduce((total, product) => total + Math.max(0, Number(product.quantityAvailable ?? product.stockQuantity ?? 0)), 0);
  const reservedByProduct = useMemo(() => {
    const quantities = new Map<string, number>();
    orders.forEach(order => {
      if (!order.stockReserved || order.status === 'Annulée' || order.status === 'Livrée' || order.deliveryStage === 'delivered') return;
      order.items.forEach(item => {
        if (item.isDeferredStock || item.isQuote) return;
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + Math.max(0, Number(item.quantity || 0)));
      });
    });
    return quantities;
  }, [orders]);
  const reservedUnits = Array.from(reservedByProduct.values()).reduce((total, quantity) => total + quantity, 0);
  const estimatedPhysicalUnits = recordedStockUnits + reservedUnits;
  const onOrderProducts = stockTrackedProducts.filter(product => product.status !== 'rupture' && !hasPhysicalStock(product));
  const outOfStockProducts = stockTrackedProducts.filter(product => product.status === 'rupture');
  const lowStockProducts = stockTrackedProducts.filter(product => {
    const quantity = Number(product.quantityAvailable ?? product.stockQuantity ?? 0);
    const threshold = Number(product.alertThreshold ?? product.lowStockAlertThreshold ?? 0);
    return threshold > 0 && quantity > 0 && quantity <= threshold;
  });
  const availabilityRate = stockTrackedProducts.length > 0
    ? Math.round((availableProducts.length / stockTrackedProducts.length) * 100)
    : 100;

  const filteredProducts = products.filter(p => {
    if (statusFilter === 'rupture' && (isQuoteOnly(p) || p.status !== 'rupture')) return false;
    if (statusFilter === 'disponible' && !hasPhysicalStock(p)) return false;
    if (statusFilter === 'sur-commande' && (isQuoteOnly(p) || p.status === 'rupture' || hasPhysicalStock(p))) return false;
    if (statusFilter === 'sous-seuil' && !lowStockProducts.some(item => item.id === p.id)) return false;
    if (categoryFilter !== 'Toutes' && p.category !== categoryFilter) return false;
    if (searchQuery.trim() && !matchesProductSearch(p, searchQuery)) return false;
    return true;
  });

  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Libreville' }).format(new Date());
  const isWithinSelectedPeriod = (value: string) => {
    if (periodFilter === 'all') return true;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return false;
    return timestamp >= Date.now() - Number(periodFilter) * 24 * 60 * 60 * 1000;
  };
  const expiryStatus = (batch: StockBatch): 'expired' | 'expiring' | 'quarantine' | 'destroyed' | 'ok' => {
    if (batch.status === 'detruit' || batch.isArchived) return 'destroyed';
    if (batch.status === 'quarantaine') return 'quarantine';
    if (batch.status === 'perime') return 'expired';
    if (!batch.expiryDate) return 'ok';
    if (batch.expiryDate < todayKey) return 'expired';
    const days = Math.floor((Date.parse(`${batch.expiryDate}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86400000);
    return days <= 30 ? 'expiring' : 'ok';
  };
  const batchCounts = {
    expiring: stockBatches.filter(batch => expiryStatus(batch) === 'expiring').length,
    expired: stockBatches.filter(batch => expiryStatus(batch) === 'expired').length,
    quarantine: stockBatches.filter(batch => expiryStatus(batch) === 'quarantine').length,
  };
  const movementTypeLabels: Record<StockMovement['type'], string> = {
    entree: 'Réception',
    sortie_commande: 'Sortie commande',
    perte_casse: 'Perte / casse',
    ajustement: 'Ajustement',
    retour: 'Retour',
  };
  const filteredBatches = useMemo(() => stockBatches
    .filter(batch => {
      const status = expiryStatus(batch);
      if (batchFilter === 'expiring' && status !== 'expiring') return false;
      if (batchFilter === 'expired' && status !== 'expired') return false;
      if (batchFilter === 'quarantine' && status !== 'quarantine') return false;
      if (!isWithinSelectedPeriod(batch.receivedDate)) return false;
      const product = products.find(item => item.id === batch.productId);
      if (categoryFilter !== 'Toutes' && product?.category !== categoryFilter) return false;
      if (searchQuery.trim() && product && !matchesProductSearch(product, searchQuery)) return false;
      const query = batchQuery.trim().toLocaleLowerCase('fr');
      if (!query) return true;
      return [batch.productName, batch.lotNumber, batch.supplierName, batch.supplierReference]
        .some(value => String(value || '').toLocaleLowerCase('fr').includes(query));
    })
    .sort((a, b) => String(a.expiryDate || '9999-12-31').localeCompare(String(b.expiryDate || '9999-12-31'))),
  [stockBatches, batchFilter, batchQuery, categoryFilter, searchQuery, periodFilter, todayKey, products]);

  const filteredMovements = useMemo(() => stockMovements.filter(movement => {
    if (!isWithinSelectedPeriod(movement.date)) return false;
    const product = products.find(item => item.id === movement.productId);
    if (categoryFilter !== 'Toutes' && product?.category !== categoryFilter) return false;
    if (searchQuery.trim() && product && !matchesProductSearch(product, searchQuery)) return false;
    const query = batchQuery.trim().toLocaleLowerCase('fr');
    return !query || [movement.productName, movement.lotNumber, movement.reference, movement.performedBy, movement.reason]
      .some(value => String(value || '').toLocaleLowerCase('fr').includes(query));
  }).slice(0, 100), [stockMovements, products, categoryFilter, searchQuery, batchQuery, periodFilter]);

  const exportStockWorkbook = async () => {
    setExportError('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const productRows = filteredProducts.map(product => ({
        Référence: product.id,
        Produit: product.name,
        Catégorie: product.category,
        Conditionnement: product.variants.map(variant => variant.label).join(' / '),
        'Unités disponibles': Number(product.quantityAvailable ?? product.stockQuantity ?? 0),
        'Seuil d’alerte': Number(product.alertThreshold ?? product.lowStockAlertThreshold ?? 0),
        Statut: isQuoteOnly(product) ? 'Sur devis' : product.status === 'rupture' ? 'Rupture' : 'Disponible',
        ...(canViewStockCosts ? { 'Prix d’achat (FCFA)': Number(product.purchasePrice || 0) } : {}),
      }));
      const batchRows = filteredBatches.map(batch => ({
        Produit: batch.productName || products.find(product => product.id === batch.productId)?.name || '',
        Lot: batch.lotNumber,
        'Quantité reçue': Number(batch.quantity || 0),
        'Quantité restante': batch.quantityRemaining === undefined ? 'À rapprocher' : Number(batch.quantityRemaining || 0),
        'Quantité détruite': Number(batch.quantityDestroyed || 0),
        Réception: batch.receivedDate,
        Péremption: batch.expiryDate || '',
        Fournisseur: batch.supplierName || '',
        'Référence fournisseur': batch.supplierReference || '',
        État: batch.status || 'disponible',
        ...(canViewStockCosts ? { 'Coût unitaire (FCFA)': batch.purchasePrice ?? '' } : {}),
      }));
      const movementRows = filteredMovements.map(movement => ({
        Date: movement.date,
        Produit: movement.productName,
        Type: movement.type,
        Quantité: Number(movement.quantity || 0),
        'Avant mouvement': Number(movement.previousQuantity || 0),
        'Après mouvement': Number(movement.newQuantity || 0),
        Référence: movement.reference || '',
        Motif: movement.reason,
        Opérateur: movement.performedBy,
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows), 'Stocks');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(batchRows), 'Lots et péremptions');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(movementRows), 'Mouvements');
      XLSX.writeFile(workbook, `gloryday-stocks-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'L’export Excel du stock a échoué.');
    }
  };

  const openBatchAction = (batch: StockBatch, targetStatus: 'disponible' | 'quarantaine' | 'detruit') => {
    setBatchAction({ batch, targetStatus });
    setBatchActionReason('');
    setBatchActionError('');
    setConfirmBatchDestruction(false);
  };

  const submitBatchAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!batchAction) return;
    const reason = batchActionReason.trim();
    if (reason.length < 3) {
      setBatchActionError('Saisissez un motif d’au moins 3 caractères.');
      return;
    }
    if (batchAction.targetStatus === 'detruit' && !confirmBatchDestruction) {
      setBatchActionError('Confirmez que le lot a bien été détruit physiquement.');
      return;
    }
    setBatchActionSaving(true);
    setBatchActionError('');
    try {
      const result = await api.updateStockBatchStatus({
        batchId: batchAction.batch.id,
        targetStatus: batchAction.targetStatus,
        reason,
        movementId: crypto.randomUUID(),
      });
      setStockBatches(current => current.map(batch => batch.id === result.batch.id ? result.batch : batch));
      onProductStockChanged?.(result.product);
      if (result.movement) setStockMovements(current => [result.movement!, ...current.filter(movement => movement.id !== result.movement!.id)].slice(0, 200));
      setBatchAction(null);
    } catch (error) {
      setBatchActionError(error instanceof Error ? error.message : 'Le changement d’état du lot a échoué.');
    } finally {
      setBatchActionSaving(false);
    }
  };

  const handleToggle = async (product: Product) => {
    setUpdatingId(product.id);
    const nextStatus = product.status === 'disponible' ? 'rupture' : 'disponible';
    try {
      await onToggleProductStock(product.id, product.status);
      recordAuditLog({
        category: 'stock',
        action: nextStatus === 'disponible' ? 'Activation de disponibilité' : 'Signalement Rupture Stock',
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
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-900">
        Changer l’état du catalogue ne modifie pas la quantité. Pour ajouter des unités, utilisez <strong>Réception +</strong> dans l’onglet Catalogue &amp; Stock.
      </div>
      {/* 1. STOCK AVAILABILITY KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Références Catalogue</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{products.length}</div>
          <span className="text-[11px] text-slate-500">Gestion simplifiée active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">En Stock Disponible</span>
          <div className="text-2xl font-black text-emerald-900 mt-1 tabular-nums">{availableProducts.length}</div>
          <span className="text-[11px] text-emerald-700">Disponibles selon le stock renseigné</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">Unités disponibles</span>
          <div className="text-2xl font-black text-teal-900 mt-1 tabular-nums">{availableUnits.toLocaleString('fr-FR')}</div>
          <span className="text-[11px] text-teal-700">Quantité enregistrée au catalogue</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">Unités réservées</span>
          <div className="text-2xl font-black text-indigo-900 mt-1 tabular-nums">{reservedUnits.toLocaleString('fr-FR')}</div>
          <span className="text-[11px] text-indigo-700">Commandes actives avec stock engagé</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 bg-slate-50/30 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Stock physique estimé</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{estimatedPhysicalUnits.toLocaleString('fr-FR')}</div>
          <span className="text-[11px] text-slate-500">Disponible + réservé</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Sur commande</span>
          <div className="text-2xl font-black text-amber-900 mt-1 tabular-nums">{onOrderProducts.length}</div>
          <span className="text-[11px] text-amber-700">Quantite physique: zero</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Sous le seuil d’alerte</span>
          <div className="mt-1 text-2xl font-black tabular-nums text-orange-950">{lowStockProducts.length}</div>
          <span className="text-[11px] text-orange-800">À réapprovisionner avant la rupture</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Lots à surveiller</span>
          <div className="mt-1 text-2xl font-black tabular-nums text-amber-950">{batchCounts.expiring}</div>
          <span className="text-[11px] text-amber-900">Péremption dans les 30 prochains jours</span>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Lots arrivés à péremption</span>
          <div className="mt-1 text-2xl font-black tabular-nums text-rose-950">{batchCounts.expired}</div>
          <span className="text-[11px] text-rose-900">Vérifier le lot et isoler physiquement les unités</span>
        </div>
        <div className="rounded-2xl border border-slate-300 bg-slate-100/70 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Lots en quarantaine</span>
          <div className="mt-1 text-2xl font-black tabular-nums text-slate-900">{batchCounts.quarantine}</div>
          <span className="text-[11px] text-slate-700">Historique conservé, vente à bloquer côté stock réel</span>
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

          {canExportStock && outOfStockProducts.length > 0 && (
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

            <button
              type="button"
              onClick={() => setStatusFilter('sur-commande')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                statusFilter === 'sur-commande'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>Sur commande ({onOrderProducts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('sous-seuil')}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                statusFilter === 'sous-seuil'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-orange-800 hover:bg-orange-50 border border-orange-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Sous seuil ({lowStockProducts.length})</span>
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
              const quantity = Number(product.quantityAvailable ?? product.stockQuantity ?? 0);
              const stockLabel = isQuoteOnly(product)
                ? 'Sur devis'
                : product.status === 'rupture'
                  ? 'Rupture'
                  : hasPhysicalStock(product)
                    ? `${quantity || 'Disponible'} en stock`
                    : 'Sur commande';

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
                      {!isQuoteOnly(product) && <div className="mt-1 text-[10px] font-semibold tabular-nums text-slate-600">
                        Physique estimé { (quantity + (reservedByProduct.get(product.id) || 0)).toLocaleString('fr-FR') }
                        <span className="mx-1.5 text-slate-300">·</span>
                        Réservé { (reservedByProduct.get(product.id) || 0).toLocaleString('fr-FR') }
                        <span className="mx-1.5 text-slate-300">·</span>
                        Disponible { (hasPhysicalStock(product) ? quantity : 0).toLocaleString('fr-FR') }
                      </div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      stockLabel === 'Rupture'
                        ? 'bg-rose-100 text-rose-800'
                        : stockLabel === 'Sur commande'
                          ? 'bg-amber-100 text-amber-800'
                          : stockLabel === 'Sur devis'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                    }`}>{stockLabel}</span>
                    {canToggleStock && <button
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
                          <span>Actif catalogue (mettre en rupture)</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Réactiver la disponibilité</span>
                        </>
                      )}
                    </button>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
        <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Clock3 className="h-4 w-4 text-amber-600" /> Lots reçus & péremptions ({filteredBatches.length})
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Registre des réceptions partagé. La quantité affichée est la quantité reçue ; le suivi du restant par lot sera relié aux sorties par commande dans la prochaine étape.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Période des lots et mouvements" value={periodFilter} onChange={event => setPeriodFilter(event.target.value as typeof periodFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="all">Toute la période</option>
            </select>
            {canExportStock && <button type="button" onClick={() => void exportStockWorkbook()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800">
              <Download className="h-3.5 w-3.5" /> Export Excel
            </button>}
            <button type="button" onClick={() => { void loadBatches(); void loadMovements(); }} disabled={batchesLoading || movementsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${batchesLoading || movementsLoading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
        </header>
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={batchQuery} onChange={event => setBatchQuery(event.target.value)} placeholder="Rechercher produit, lot ou fournisseur" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
          </div>
          <select value={batchFilter} onChange={event => setBatchFilter(event.target.value as typeof batchFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            <option value="all">Tous les lots</option>
            <option value="expiring">Expire dans 30 jours</option>
            <option value="expired">Déjà périmé</option>
            <option value="quarantine">En quarantaine</option>
          </select>
        </div>
        {exportError && <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{exportError}</div>}
        {batchesError ? (
          <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{batchesError}</div>
        ) : batchesLoading ? (
          <div className="flex items-center gap-2 p-6 text-xs text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Chargement des lots…</div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">Aucune réception de lot ne correspond à ces critères.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produit / lot</th>
                  <th className="px-4 py-3">Fournisseur / référence</th>
                  <th className="px-4 py-3 text-right">Qté reçue</th>
                  <th className="px-4 py-3 text-right">Qté restante</th>
                  <th className="px-4 py-3">Réception</th>
                  <th className="px-4 py-3">Péremption</th>
                  {canViewStockCosts && <th className="px-4 py-3 text-right">Coût unitaire</th>}
                  <th className="px-4 py-3">État</th>
                  {canManageBatches && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map(batch => {
                  const state = expiryStatus(batch);
                  const stateLabel = state === 'expired' ? 'Périmé' : state === 'expiring' ? 'Expire bientôt' : state === 'quarantine' ? 'Quarantaine' : state === 'destroyed' ? 'Détruit' : batch.expiryDate ? 'Valide' : 'Sans péremption';
                  const stateStyle = state === 'expired' || state === 'destroyed' ? 'bg-rose-100 text-rose-800' : state === 'expiring' ? 'bg-amber-100 text-amber-900' : state === 'quarantine' ? 'bg-slate-200 text-slate-800' : 'bg-emerald-100 text-emerald-800';
                  const hasTrackedRemainder = batch.quantityRemaining !== undefined;
                  const canReactivate = batch.status === 'quarantaine' && (!batch.expiryDate || batch.expiryDate >= todayKey);
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{batch.productName || products.find(product => product.id === batch.productId)?.name || 'Produit retiré'}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-500">{batch.lotNumber || 'N° de lot non renseigné'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{batch.supplierName || 'Fournisseur non renseigné'}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400">{batch.supplierReference || 'Sans référence'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-800">{Number(batch.quantity || 0).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-800">
                        {hasTrackedRemainder ? Number(batch.quantityRemaining || 0).toLocaleString('fr-FR') : <span className="text-[10px] font-sans font-semibold text-amber-700">À rapprocher</span>}
                        {Number(batch.quantityDestroyed || 0) > 0 && <div className="mt-0.5 text-[9px] font-sans font-medium text-slate-500">Détruit : {Number(batch.quantityDestroyed).toLocaleString('fr-FR')}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{new Date(batch.receivedDate).toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })}</td>
                      <td className="px-4 py-3 text-slate-600">{batch.expiryDate ? new Date(`${batch.expiryDate}T00:00:00.000Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : 'Non renseignée'}</td>
                      {canViewStockCosts && <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">{batch.purchasePrice != null ? `${Number(batch.purchasePrice).toLocaleString('fr-FR')} FCFA` : '—'}</td>}
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${stateStyle}`}>{stateLabel}</span></td>
                      {canManageBatches && <td className="px-4 py-3">
                        {!hasTrackedRemainder ? (
                          <span className="text-[10px] font-semibold text-amber-700" title="Le solde historique du lot n’est pas connu">Inventaire requis</span>
                        ) : batch.status === 'detruit' ? (
                          <span className="text-[10px] font-semibold text-slate-500">Lot clôturé</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {canReactivate ? <button type="button" onClick={() => openBatchAction(batch, 'disponible')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"><RotateCw className="h-3 w-3" />Réactiver</button> : batch.status === 'disponible' && <button type="button" onClick={() => openBatchAction(batch, 'quarantaine')} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100"><ShieldAlert className="h-3 w-3" />Quarantaine</button>}
                            <button type="button" onClick={() => openBatchAction(batch, 'detruit')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-800 hover:bg-rose-100"><Trash2 className="h-3 w-3" />Détruire</button>
                          </div>
                        )}
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
        <header className="border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <ArrowUpDown className="h-4 w-4 text-blue-700" /> Journal des mouvements ({filteredMovements.length})
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Réceptions, sorties de commandes, retours, pertes et ajustements, avec l’opérateur et les quantités avant/après.</p>
        </header>
        {movementsError ? (
          <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{movementsError}</div>
        ) : movementsLoading ? (
          <div className="flex items-center gap-2 p-6 text-xs text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Chargement de l’historique…</div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">Aucun mouvement trouvé pour ces filtres.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date / opérateur</th>
                  <th className="px-4 py-3">Produit / lot</th>
                  <th className="px-4 py-3">Opération / motif</th>
                  <th className="px-4 py-3 text-right">Variation</th>
                  <th className="px-4 py-3 text-right">Avant → après</th>
                  <th className="px-4 py-3">Référence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map(movement => (
                  <tr key={movement.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-600">
                      <div>{new Date(movement.date).toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' })}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">{movement.performedBy || 'Opérateur non renseigné'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{movement.productName}</div>
                      {movement.lotNumber && <div className="mt-0.5 font-mono text-[10px] text-slate-500">Lot {movement.lotNumber}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold">{movementTypeLabels[movement.type] || movement.type}</div>
                      <div className="mt-0.5 max-w-[260px] truncate text-[10px] text-slate-500" title={movement.reason}>{movement.reason || 'Sans motif'}</div>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${movement.type === 'entree' || movement.type === 'retour' ? 'text-emerald-700' : movement.type === 'sortie_commande' || movement.type === 'perte_casse' ? 'text-rose-700' : 'text-slate-700'}`}>
                      {movement.type === 'entree' || movement.type === 'retour' ? '+' : movement.type === 'sortie_commande' || movement.type === 'perte_casse' ? '−' : ''}{Number(movement.quantity || 0).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">{Number(movement.previousQuantity || 0).toLocaleString('fr-FR')} → {Number(movement.newQuantity || 0).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{movement.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {batchAction && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px]" role="presentation">
        <form onSubmit={submitBatchAction} role="dialog" aria-modal="true" aria-labelledby="stock-batch-action-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className={`flex items-start justify-between gap-3 border-b p-4 ${batchAction.targetStatus === 'detruit' ? 'border-rose-100 bg-rose-50/70' : batchAction.targetStatus === 'disponible' ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
            <div>
              <h3 id="stock-batch-action-title" className="text-sm font-black text-slate-900">
                {batchAction.targetStatus === 'disponible' ? 'Réactiver le lot' : batchAction.targetStatus === 'detruit' ? 'Confirmer la destruction du lot' : 'Mettre le lot en quarantaine'}
              </h3>
              <p className="mt-1 text-xs text-slate-600">{batchAction.batch.productName || products.find(product => product.id === batchAction.batch.productId)?.name} · Lot {batchAction.batch.lotNumber || batchAction.batch.id}</p>
            </div>
            <button type="button" disabled={batchActionSaving} onClick={() => setBatchAction(null)} aria-label="Fermer" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-50"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div>Solde suivi du lot : <strong>{Number(batchAction.batch.quantityRemaining || 0).toLocaleString('fr-FR')} unité(s)</strong></div>
              {batchAction.targetStatus === 'quarantaine' && <p className="mt-1">Les unités restantes seront retirées du stock vendable. Les réservations actives empêchent le blocage jusqu’au traitement des commandes.</p>}
              {batchAction.targetStatus === 'disponible' && <p className="mt-1">Les unités du lot seront réintégrées au stock vendable. Un lot périmé ne peut pas être réactivé.</p>}
              {batchAction.targetStatus === 'detruit' && <p className="mt-1 font-semibold text-rose-800">Cette action est irréversible : le solde sera retiré du stock et conservé dans l’historique comme détruit.</p>}
            </div>
            <label className="block text-xs font-bold text-slate-700">Motif obligatoire
              <textarea autoFocus value={batchActionReason} onChange={event => setBatchActionReason(event.target.value)} maxLength={500} rows={3} placeholder={batchAction.targetStatus === 'detruit' ? 'Ex. : lot détruit après contrôle qualité' : 'Indiquez la raison de ce changement'} className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            {batchAction.targetStatus === 'detruit' && <label className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-900">
              <input type="checkbox" checked={confirmBatchDestruction} onChange={event => setConfirmBatchDestruction(event.target.checked)} className="mt-0.5 rounded border-rose-300" />
              <span>Je confirme que les unités restantes ont été détruites physiquement.</span>
            </label>}
            {batchActionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">{batchActionError}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
            <button type="button" disabled={batchActionSaving} onClick={() => setBatchAction(null)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Annuler</button>
            <button type="submit" disabled={batchActionSaving || batchActionReason.trim().length < 3 || (batchAction.targetStatus === 'detruit' && !confirmBatchDestruction)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${batchAction.targetStatus === 'disponible' ? 'bg-emerald-700 hover:bg-emerald-800' : batchAction.targetStatus === 'detruit' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-700 hover:bg-amber-800'}`}>
              {batchActionSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {batchAction.targetStatus === 'disponible' ? 'Réactiver le lot' : batchAction.targetStatus === 'detruit' ? 'Confirmer la destruction' : 'Confirmer la quarantaine'}
            </button>
          </div>
        </form>
      </div>}
    </div>
  );
};
