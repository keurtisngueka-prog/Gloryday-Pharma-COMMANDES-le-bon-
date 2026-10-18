import React, { useState, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Calendar, 
  ArrowDownRight, 
  ArrowUpRight, 
  Plus, 
  Download, 
  Upload, 
  Building2, 
  History, 
  Search,
  DollarSign,
  TrendingUp,
  Tag,
  CheckCircle2,
  Boxes,
  Edit2,
  Trash2,
  Filter,
  Check,
  Clock,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import { Product, StockBatch, StockMovement, StockMovementType, Supplier, PurchaseOrder, User } from '../types';
import { 
  getStockBatches, 
  saveStockBatches, 
  createStockBatch,
  updateStockBatch,
  deleteStockBatch,
  getStockMovements, 
  recordStockMovement, 
  updateStockMovement,
  deleteStockMovement,
  getSuppliers, 
  saveSuppliers, 
  getPurchaseOrders, 
  savePurchaseOrders,
  exportProductsToCSV 
} from '../utils/stockStorage';
import { logAuditEvent } from '../utils/auditLogger';

interface StockLotsModuleProps {
  products: Product[];
  currentUser: User;
  onUpdateProduct: (product: Product) => void;
  onRefresh: () => void;
}

export const StockLotsModule: React.FC<StockLotsModuleProps> = ({
  products,
  currentUser,
  onUpdateProduct,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'inventory' | 'lots' | 'movements' | 'suppliers'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilterType, setMovementFilterType] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [lotExpiryFilter, setLotExpiryFilter] = useState<'all' | 'valid' | 'expiring_soon' | 'expired'>('all');
  const [lotSelectedProductId, setLotSelectedProductId] = useState<string>('all');
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  const [batches, setBatches] = useState<StockBatch[]>(() => getStockBatches());
  const [movements, setMovements] = useState<StockMovement[]>(() => getStockMovements());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());

  // Modal 1: Create Batch
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<Product | null>(null);
  const [newBatchLotNumber, setNewBatchLotNumber] = useState('');
  const [newBatchExpiryDate, setNewBatchExpiryDate] = useState('');
  const [newBatchQuantity, setNewBatchQuantity] = useState<number>(50);
  const [newBatchPurchasePrice, setNewBatchPurchasePrice] = useState<number>(1500);
  const [newBatchSupplier, setNewBatchSupplier] = useState('');

  // Modal 2: Edit Batch
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [editBatchLotNumber, setEditBatchLotNumber] = useState('');
  const [editBatchExpiryDate, setEditBatchExpiryDate] = useState('');
  const [editBatchQuantity, setEditBatchQuantity] = useState<number>(0);
  const [editBatchPurchasePrice, setEditBatchPurchasePrice] = useState<number>(0);
  const [editBatchSupplier, setEditBatchSupplier] = useState('');

  // Modal 3: Create Movement (Entrée, Sortie, Perte, Inventaire)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType>('entree');
  const [movementQty, setMovementQty] = useState<number>(10);
  const [movementReason, setMovementReason] = useState('');
  const [movementLotNumber, setMovementLotNumber] = useState('');

  // Modal 4: Edit Movement
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editMovementReason, setEditMovementReason] = useState('');
  const [editMovementLot, setEditMovementLot] = useState('');

  // Stock KPI Summary
  const stockSummary = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let totalStockValuation = 0;

    products.forEach(p => {
      const stock = typeof p.quantityAvailable === 'number' 
        ? p.quantityAvailable 
        : typeof p.stockQuantity === 'number' 
          ? p.stockQuantity 
          : 0;
      const threshold = typeof p.alertThreshold === 'number'
        ? p.alertThreshold
        : typeof p.lowStockAlertThreshold === 'number'
          ? p.lowStockAlertThreshold
          : 10;
      const buyPrice = typeof p.purchasePrice === 'number' && p.purchasePrice > 0
        ? p.purchasePrice
        : p.variants && p.variants[0] ? Math.round(p.variants[0].price * 0.65) : 0;

      totalUnits += stock;
      if (stock <= threshold) lowStockCount++;
      totalStockValuation += stock * buyPrice;
    });

    const now = Date.now();
    let expiredLotsCount = 0;
    let expiringSoonLotsCount = 0;

    batches.forEach(b => {
      const expiryTime = new Date(b.expiryDate).getTime();
      if (expiryTime < now) {
        expiredLotsCount++;
      } else if (expiryTime - now < 90 * 24 * 3600 * 1000) {
        expiringSoonLotsCount++;
      }
    });

    return {
      totalUnits,
      lowStockCount,
      totalStockValuation,
      totalBatches: batches.length,
      expiredLotsCount,
      expiringSoonLotsCount
    };
  }, [products, batches]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const stock = typeof p.quantityAvailable === 'number' 
        ? p.quantityAvailable 
        : typeof p.stockQuantity === 'number' 
          ? p.stockQuantity 
          : 0;
      const threshold = typeof p.alertThreshold === 'number'
        ? p.alertThreshold
        : typeof p.lowStockAlertThreshold === 'number'
          ? p.lowStockAlertThreshold
          : 10;
      
      if (onlyLowStock && stock > threshold) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });
  }, [products, searchQuery, onlyLowStock]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (lotSelectedProductId !== 'all' && b.productId !== lotSelectedProductId) return false;
      const now = Date.now();
      const expiryTime = new Date(b.expiryDate).getTime();
      const isExpired = expiryTime < now;
      const isExpiringSoon = !isExpired && (expiryTime - now < 90 * 24 * 3600 * 1000);

      if (lotExpiryFilter === 'expired' && !isExpired) return false;
      if (lotExpiryFilter === 'expiring_soon' && !isExpiringSoon) return false;
      if (lotExpiryFilter === 'valid' && (isExpired || isExpiringSoon)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const prod = products.find(p => p.id === b.productId);
      return (
        b.lotNumber.toLowerCase().includes(q) ||
        (prod && prod.name.toLowerCase().includes(q)) ||
        (b.supplierName && b.supplierName.toLowerCase().includes(q))
      );
    });
  }, [batches, lotSelectedProductId, lotExpiryFilter, searchQuery, products]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (movementFilterType === 'entree' && m.type !== 'entree') return false;
      if (movementFilterType === 'sortie' && m.type !== 'sortie' && m.type !== 'sortie_commande') return false;
      if (movementFilterType === 'perte' && m.type !== 'perte' && m.type !== 'perte_casse') return false;
      if (movementFilterType === 'inventaire' && m.type !== 'inventaire') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.productName.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        (m.lotNumber && m.lotNumber.toLowerCase().includes(q)) ||
        m.performedBy.toLowerCase().includes(q)
      );
    });
  }, [movements, movementFilterType, searchQuery]);

  // Handle Create Batch
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBatch || !newBatchLotNumber || !newBatchExpiryDate) return;

    const newBatch = createStockBatch({
      productId: selectedProductForBatch.id,
      lotNumber: newBatchLotNumber.trim(),
      expiryDate: newBatchExpiryDate,
      quantity: Number(newBatchQuantity),
      initialQuantity: Number(newBatchQuantity),
      purchasePrice: Number(newBatchPurchasePrice),
      supplierName: newBatchSupplier.trim() || 'Fournisseur Direct'
    }, currentUser);

    const updatedBatches = [newBatch, ...batches];
    setBatches(updatedBatches);

    // Update Product real stock quantity
    const currentStock = typeof selectedProductForBatch.quantityAvailable === 'number' 
      ? selectedProductForBatch.quantityAvailable 
      : typeof selectedProductForBatch.stockQuantity === 'number' 
        ? selectedProductForBatch.stockQuantity 
        : 0;
    const newStock = currentStock + Number(newBatchQuantity);
    const updatedProd: Product = {
      ...selectedProductForBatch,
      quantityAvailable: newStock,
      stockQuantity: newStock,
      purchasePrice: Number(newBatchPurchasePrice),
      status: 'disponible'
    };
    onUpdateProduct(updatedProd);

    // Record stock movement (Entrée de stock)
    const mvt = recordStockMovement({
      productId: selectedProductForBatch.id,
      productName: selectedProductForBatch.name,
      lotNumber: newBatchLotNumber.trim(),
      type: 'entree',
      quantity: Number(newBatchQuantity),
      previousQuantity: currentStock,
      newQuantity: newStock,
      reason: `Réception de lot ${newBatchLotNumber} (${newBatchSupplier || 'Fournisseur Direct'})`,
      performedBy: currentUser.contactName || currentUser.facilityName
    }, currentUser);

    setMovements([mvt, ...movements]);
    setIsNewBatchOpen(false);
    setSelectedProductForBatch(null);
    setNewBatchLotNumber('');
    setNewBatchExpiryDate('');
  };

  // Handle Edit Batch
  const handleOpenEditBatch = (b: StockBatch) => {
    setEditingBatch(b);
    setEditBatchLotNumber(b.lotNumber);
    setEditBatchExpiryDate(b.expiryDate);
    setEditBatchQuantity(b.quantity);
    setEditBatchPurchasePrice(b.purchasePrice);
    setEditBatchSupplier(b.supplierName || '');
  };

  const handleSaveEditBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    const updated = updateStockBatch(editingBatch.id, {
      lotNumber: editBatchLotNumber.trim(),
      expiryDate: editBatchExpiryDate,
      quantity: Number(editBatchQuantity),
      purchasePrice: Number(editBatchPurchasePrice),
      supplierName: editBatchSupplier.trim()
    }, currentUser);

    if (updated) {
      setBatches(prev => prev.map(b => b.id === updated.id ? updated : b));
    }
    setEditingBatch(null);
  };

  const handleDeleteBatch = (batchId: string) => {
    const target = batches.find(b => b.id === batchId);
    if (!target) return;
    if (window.confirm(`Supprimer définitivement le lot ${target.lotNumber} ?`)) {
      deleteStockBatch(batchId, currentUser);
      setBatches(prev => prev.filter(b => b.id !== batchId));
    }
  };

  // Handle Create Movement (CRUD: Create)
  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementProduct || movementQty <= 0) return;

    const currentStock = typeof movementProduct.quantityAvailable === 'number' 
      ? movementProduct.quantityAvailable 
      : typeof movementProduct.stockQuantity === 'number' 
        ? movementProduct.stockQuantity 
        : 0;

    let newStock = currentStock;
    if (movementType === 'entree') {
      newStock = currentStock + movementQty;
    } else if (movementType === 'sortie' || movementType === 'sortie_commande') {
      newStock = Math.max(0, currentStock - movementQty);
    } else if (movementType === 'perte' || movementType === 'perte_casse') {
      newStock = Math.max(0, currentStock - movementQty);
    } else if (movementType === 'inventaire') {
      newStock = movementQty;
    }

    const updatedProd: Product = {
      ...movementProduct,
      quantityAvailable: newStock,
      stockQuantity: newStock,
      status: newStock === 0 ? 'rupture' : 'disponible'
    };
    onUpdateProduct(updatedProd);

    const mvt = recordStockMovement({
      productId: movementProduct.id,
      productName: movementProduct.name,
      lotNumber: movementLotNumber.trim() || undefined,
      type: movementType,
      quantity: movementQty,
      previousQuantity: currentStock,
      newQuantity: newStock,
      reason: movementReason.trim() || `Mouvement manuel (${movementType})`,
      performedBy: currentUser.contactName || currentUser.facilityName
    }, currentUser);

    // Synchronize lot batch quantity if a lot was targeted
    if (movementLotNumber.trim()) {
      const currentBatches = getStockBatches();
      const bIdx = currentBatches.findIndex(
        b => b.productId === movementProduct.id && b.lotNumber.toLowerCase() === movementLotNumber.trim().toLowerCase()
      );
      if (bIdx !== -1) {
        if (movementType === 'entree') {
          currentBatches[bIdx].quantity += movementQty;
        } else if (movementType === 'sortie' || movementType === 'sortie_commande' || movementType === 'perte' || movementType === 'perte_casse') {
          currentBatches[bIdx].quantity = Math.max(0, currentBatches[bIdx].quantity - movementQty);
        }
        saveStockBatches(currentBatches);
        setBatches(currentBatches);
      }
    }

    setMovements([mvt, ...movements]);
    setIsMovementModalOpen(false);
    setMovementProduct(null);
    setMovementReason('');
    setMovementLotNumber('');
  };

  // Handle Edit Movement (CRUD: Update)
  const handleOpenEditMovement = (m: StockMovement) => {
    setEditingMovement(m);
    setEditMovementReason(m.reason);
    setEditMovementLot(m.lotNumber || '');
  };

  const handleSaveEditMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;

    const updated = updateStockMovement(editingMovement.id, {
      reason: editMovementReason.trim(),
      lotNumber: editMovementLot.trim() || undefined
    }, currentUser);

    if (updated) {
      setMovements(prev => prev.map(m => m.id === updated.id ? updated : m));
    }
    setEditingMovement(null);
  };

  // Handle Delete Movement (CRUD: Delete)
  const handleDeleteMovement = (mvtId: string) => {
    const target = movements.find(m => m.id === mvtId);
    if (!target) return;

    if (window.confirm(`Supprimer le mouvement ${target.type.toUpperCase()} sur ${target.productName} ?\nLe stock sera restauré à ${target.previousQuantity} unités.`)) {
      const prod = products.find(p => p.id === target.productId);
      if (prod) {
        const restoredProd: Product = {
          ...prod,
          quantityAvailable: target.previousQuantity,
          stockQuantity: target.previousQuantity,
          status: target.previousQuantity === 0 ? 'rupture' : 'disponible'
        };
        onUpdateProduct(restoredProd);
      }
      deleteStockMovement(mvtId, currentUser);
      setMovements(prev => prev.filter(m => m.id !== mvtId));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Module Header Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Gestionnaire Intégral des Stocks, Lots & Mouvements
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantités réelles disponibles, seuils d'alerte, traçabilité des lots avec dates de péremption, et opérations CRUD complètes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportProductsToCSV(products)}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Stocks</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (products.length > 0) {
                setMovementProduct(products[0]);
                setIsMovementModalOpen(true);
              }
            }}
            className="py-2 px-3 bg-[#0d44e8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Mouvement (E/S/P)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (products.length > 0) {
                setSelectedProductForBatch(products[0]);
                setIsNewBatchOpen(true);
              }
            }}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Nouveau Lot</span>
          </button>
        </div>
      </div>

      {/* Stock KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50/60 border-b border-slate-100">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Stock Total Réel</span>
            <Package className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stockSummary.totalUnits.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">unités</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {products.length} références cataloguées
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Alertes Seuil Critique</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${stockSummary.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-base font-bold font-mono ${stockSummary.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {stockSummary.lowStockCount} <span className="text-xs font-normal text-slate-500">articles</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Stock sous le seuil d'alerte configuré
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Lots & Péremptions</span>
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {stockSummary.totalBatches} <span className="text-xs font-normal text-slate-500">lots</span>
          </div>
          <div className="text-[10px] mt-0.5 flex items-center gap-1.5">
            {stockSummary.expiredLotsCount > 0 && (
              <span className="font-bold text-rose-600">{stockSummary.expiredLotsCount} périmé(s)</span>
            )}
            {stockSummary.expiringSoonLotsCount > 0 && (
              <span className="font-semibold text-amber-600">{stockSummary.expiringSoonLotsCount} &lt; 90j</span>
            )}
            {stockSummary.expiredLotsCount === 0 && stockSummary.expiringSoonLotsCount === 0 && (
              <span className="text-emerald-600 font-medium">Tous lots conformes</span>
            )}
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Valorisation (Prix Achat)</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-emerald-700 font-mono">
            {stockSummary.totalStockValuation.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FCFA</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Surveillance marge & stock
          </div>
        </div>
      </div>

      {/* Subtab Navigation Buttons */}
      <div className="flex border-b border-slate-100 bg-white px-4 gap-2 overflow-x-auto text-xs font-semibold py-2">
        <button
          type="button"
          onClick={() => setSubTab('inventory')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            subTab === 'inventory' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Quantités & Alertes ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('lots')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            subTab === 'lots' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Historique des Lots & Péremptions ({batches.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('movements')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            subTab === 'movements' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Mouvements de Stock CRUD ({movements.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('suppliers')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            subTab === 'suppliers' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Fournisseurs Agréés ({suppliers.length})
        </button>
      </div>

      {/* SUBTAB 1: INVENTAIRE, QUANTITÉ DISPONIBLE & SEUILS */}
      {subTab === 'inventory' && (
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher produit par nom, catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                className="rounded text-rose-600 w-4 h-4"
              />
              <span className={onlyLowStock ? 'text-rose-700' : 'text-slate-600'}>
                Afficher uniquement les alertes rupture & seuil critique
              </span>
            </label>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-3">Dispositif Médical</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3 text-center">Quantité Disponible</th>
                  <th className="py-2.5 px-3 text-center">Seuil d'Alerte</th>
                  <th className="py-2.5 px-3 text-right">Prix Vente</th>
                  <th className="py-2.5 px-3 text-right">Prix Achat</th>
                  <th className="py-2.5 px-3 text-right">Marge Brute</th>
                  <th className="py-2.5 px-3 text-right">Actions Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const salePrice = p.variants && p.variants[0] ? p.variants[0].price : 0;
                  const buyPrice = p.purchasePrice || Math.round(salePrice * 0.65);
                  const margin = salePrice > 0 ? salePrice - buyPrice : 0;
                  const marginPercent = salePrice > 0 ? Math.round((margin / salePrice) * 100) : 0;
                  const stock = typeof p.quantityAvailable === 'number' 
                    ? p.quantityAvailable 
                    : typeof p.stockQuantity === 'number' 
                      ? p.stockQuantity 
                      : 45;
                  const threshold = typeof p.alertThreshold === 'number' 
                    ? p.alertThreshold 
                    : typeof p.lowStockAlertThreshold === 'number' 
                      ? p.lowStockAlertThreshold 
                      : 10;
                  const isLow = stock <= threshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {p.category}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          stock === 0 
                            ? 'bg-rose-100 text-rose-800' 
                            : isLow 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {stock} unités
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {threshold} unités
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {salePrice.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        {buyPrice.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span className="text-emerald-700 font-bold">
                          +{margin.toLocaleString('fr-FR')} F
                        </span>{' '}
                        <span className="text-[10px] text-emerald-600 font-semibold">({marginPercent}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProductForHistory(p)}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                            title="Consulter l'historique des lots et dates de péremption de ce produit"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Lots ({batches.filter(b => b.productId === p.id).length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForBatch(p);
                              setIsNewBatchOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                            title="Ajouter un lot médical avec date de péremption"
                          >
                            + Lot
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMovementProduct(p);
                              setMovementType('entree');
                              setMovementQty(10);
                              setIsMovementModalOpen(true);
                            }}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0d44e8] rounded text-[11px] font-semibold cursor-pointer"
                            title="Créer une entrée, sortie ou perte"
                          >
                            Mouvement
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: HISTORIQUE DES LOTS & DATES DE PÉREMPTION */}
      {subTab === 'lots' && (
        <div className="p-4 space-y-3">
          {/* Lot Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrer par lot, produit, fournisseur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={lotSelectedProductId}
                onChange={(e) => setLotSelectedProductId(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs max-w-[200px]"
              >
                <option value="all">Tous les dispositifs médicaux</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={lotExpiryFilter}
                onChange={(e: any) => setLotExpiryFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs"
              >
                <option value="all">Tous les statuts de péremption</option>
                <option value="valid">Lots valides uniquement</option>
                <option value="expiring_soon">Alerte péremption (&lt; 90 jours)</option>
                <option value="expired">Lots périmés uniquement</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-3">Numéro de Lot</th>
                  <th className="py-2.5 px-3">Dispositif Médical</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3">Date de Péremption</th>
                  <th className="py-2.5 px-3">Statut & Échéance</th>
                  <th className="py-2.5 px-3 text-right">Quantité Restante</th>
                  <th className="py-2.5 px-3 text-right">Prix d'Achat</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Aucun lot actif ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(b => {
                    const prod = products.find(p => p.id === b.productId);
                    const now = Date.now();
                    const expiryTime = new Date(b.expiryDate).getTime();
                    const daysRemaining = Math.ceil((expiryTime - now) / (1000 * 3600 * 24));
                    const isExpired = daysRemaining <= 0;
                    const isExpiringSoon = !isExpired && daysRemaining <= 90;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {b.lotNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {prod ? prod.name : b.productId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {b.supplierName || 'Fournisseur Direct'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {b.expiryDate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {isExpired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              PÉRIMÉ ({Math.abs(daysRemaining)}j)
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Alerte {daysRemaining} jours restants
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              Valide ({daysRemaining}j)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {b.quantity} unités
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          {b.purchasePrice.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBatch(b)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                              title="Modifier les informations du lot"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(b.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                              title="Supprimer ce lot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: MOUVEMENTS DE STOCK (CRUD COMPLET) */}
      {subTab === 'movements' && (
        <div className="p-4 space-y-3">
          {/* Movement Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher mouvement par produit, motif, lot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={movementFilterType}
                onChange={(e) => setMovementFilterType(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs"
              >
                <option value="all">Tous les types de mouvements</option>
                <option value="entree">Entrées de stock (+)</option>
                <option value="sortie">Sorties de stock / commandes (-)</option>
                <option value="perte">Pertes, casses & périmés (-)</option>
                <option value="inventaire">Ajustements d'inventaire</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Produit & Lot</th>
                  <th className="py-2.5 px-3 text-right">Quantité</th>
                  <th className="py-2.5 px-3 text-center">Avant → Après</th>
                  <th className="py-2.5 px-3">Motif & Opérateur</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Aucun mouvement de stock correspondant à ces critères.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const isPositive = m.type === 'entree' || m.type === 'retour_client';

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(m.date).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'entree' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : m.type === 'sortie' || m.type === 'sortie_commande'
                                ? 'bg-blue-100 text-blue-800'
                                : m.type === 'perte' || m.type === 'perte_casse'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-purple-100 text-purple-800'
                          }`}>
                            {m.type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{m.productName}</div>
                          {m.lotNumber && (
                            <span className="font-mono text-[10px] text-slate-500">
                              Lot : {m.lotNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {m.previousQuantity} → <strong className="text-slate-900">{m.newQuantity}</strong>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{m.reason}</div>
                          <div className="text-[10px] text-slate-400">Par : {m.performedBy}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMovement(m)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                              title="Modifier motif ou lot"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMovement(m.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                              title="Supprimer ce mouvement"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: FOURNISSEURS */}
      {subTab === 'suppliers' && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suppliers.map(s => (
              <div key={s.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">{s.name}</h4>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-medium text-slate-700">
                    {s.country}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-2 space-y-1">
                  <div>Contact : <strong>{s.contactPerson}</strong></div>
                  <div>Tél : {s.phone} · Email : {s.email}</div>
                  <div>Délai moyen d'approvisionnement : <strong>{s.leadTimeDays} jours</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: NOUVEAU LOT (CRUD CREATE) */}
      {isNewBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Enregistrement de Lot & Péremption</span>
            </h3>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispositif Médical</label>
                <select
                  value={selectedProductForBatch?.id || ''}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) setSelectedProductForBatch(found);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Numéro de Lot *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: LOT-2026-X88"
                    value={newBatchLotNumber}
                    onChange={(e) => setNewBatchLotNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Péremption *</label>
                  <input
                    type="date"
                    required
                    value={newBatchExpiryDate}
                    onChange={(e) => setNewBatchExpiryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantité reçue *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newBatchQuantity}
                    onChange={(e) => setNewBatchQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prix d'Achat (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newBatchPurchasePrice}
                    onChange={(e) => setNewBatchPurchasePrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fournisseur</label>
                <select
                  value={newBatchSupplier}
                  onChange={(e) => setNewBatchSupplier(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.country})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewBatchOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Enregistrer le Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MODIFIER LOT (CRUD UPDATE) */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#0d44e8]" />
              <span>Modifier le Lot : {editingBatch.lotNumber}</span>
            </h3>

            <form onSubmit={handleSaveEditBatch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Numéro de Lot</label>
                  <input
                    type="text"
                    required
                    value={editBatchLotNumber}
                    onChange={(e) => setEditBatchLotNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Péremption</label>
                  <input
                    type="date"
                    required
                    value={editBatchExpiryDate}
                    onChange={(e) => setEditBatchExpiryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantité Restante</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editBatchQuantity}
                    onChange={(e) => setEditBatchQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prix d'Achat (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editBatchPurchasePrice}
                    onChange={(e) => setEditBatchPurchasePrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fournisseur</label>
                <input
                  type="text"
                  value={editBatchSupplier}
                  onChange={(e) => setEditBatchSupplier(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CRÉER MOUVEMENT DE STOCK (CRUD CREATE : ENTRÉE / SORTIE / PERTE / INVENTAIRE) */}
      {isMovementModalOpen && movementProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Nouveau Mouvement : {movementProduct.name}
            </h3>

            <form onSubmit={handleCreateMovement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type de Mouvement</label>
                <select
                  value={movementType}
                  onChange={(e: any) => setMovementType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="entree">Entrée de Stock (+)</option>
                  <option value="sortie">Sortie de Stock manuelle (-)</option>
                  <option value="perte">Perte, Casse ou Péremption (-)</option>
                  <option value="inventaire">Correction Inventaire (Remplacement)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {movementType === 'inventaire' ? 'Nouvelle Quantité Réelle' : 'Quantité du Mouvement'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro de Lot concerné (facultatif)</label>
                {movementProduct && batches.filter(b => b.productId === movementProduct.id).length > 0 && (
                  <div className="flex gap-1 mb-1.5 flex-wrap">
                    {batches.filter(b => b.productId === movementProduct.id).map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setMovementLotNumber(b.lotNumber)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer border ${
                          movementLotNumber === b.lotNumber
                            ? 'bg-[#0d44e8] text-white border-[#0d44e8]'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {b.lotNumber} ({b.quantity}u)
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Ex: LOT-2026-X88 ou sélectionnez ci-dessus"
                  value={movementLotNumber}
                  onChange={(e) => setMovementLotNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motif du Mouvement *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Réception express, Casse transport, Inventaire trimestriel"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Enregistrer Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: MODIFIER MOUVEMENT (CRUD UPDATE) */}
      {editingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Modifier Mouvement : {editingMovement.productName}
            </h3>

            <form onSubmit={handleSaveEditMovement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type de Mouvement</label>
                <span className="font-mono font-bold text-slate-900 uppercase">
                  {editingMovement.type} ({editingMovement.quantity} unités)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lot Associé</label>
                <input
                  type="text"
                  value={editMovementLot}
                  onChange={(e) => setEditMovementLot(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motif</label>
                <input
                  type="text"
                  required
                  value={editMovementReason}
                  onChange={(e) => setEditMovementReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMovement(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: HISTORIQUE DÉTAILLÉ DES LOTS & DATES DE PÉREMPTION DU PRODUIT */}
      {selectedProductForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0d44e8]">
                    {selectedProductForHistory.category}
                  </span>
                  <span className="text-xs text-slate-400">ID: {selectedProductForHistory.id}</span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  {selectedProductForHistory.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Traçabilité médicale intégrale : lots actifs, dates de péremption, arrivages et seuils d'alerte.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Key Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Stock Réel Disponible</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {typeof selectedProductForHistory.quantityAvailable === 'number' 
                    ? selectedProductForHistory.quantityAvailable 
                    : typeof selectedProductForHistory.stockQuantity === 'number' 
                      ? selectedProductForHistory.stockQuantity 
                      : 0} unités
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Seuil d'Alerte</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {typeof selectedProductForHistory.alertThreshold === 'number'
                    ? selectedProductForHistory.alertThreshold
                    : typeof selectedProductForHistory.lowStockAlertThreshold === 'number'
                      ? selectedProductForHistory.lowStockAlertThreshold
                      : 10} unités
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Prix Achat Estimé</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {(selectedProductForHistory.purchasePrice || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* Product Lots List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Lots Enregistrés ({batches.filter(b => b.productId === selectedProductForHistory.id).length})</span>
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForBatch(selectedProductForHistory);
                    setIsNewBatchOpen(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nouveau Lot</span>
                </button>
              </div>

              {batches.filter(b => b.productId === selectedProductForHistory.id).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  Aucun lot médical enregistré pour ce produit. Créez un premier lot pour activer la déduction FEFO et le suivi des dates de péremption.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                        <th className="py-2 px-3">Numéro de Lot</th>
                        <th className="py-2 px-3">Date Péremption</th>
                        <th className="py-2 px-3">Statut & Échéance</th>
                        <th className="py-2 px-3 text-right">Qté Restante</th>
                        <th className="py-2 px-3 text-right">Prix Achat</th>
                        <th className="py-2 px-3">Fournisseur</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batches
                        .filter(b => b.productId === selectedProductForHistory.id)
                        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                        .map(b => {
                          const now = Date.now();
                          const expiryTime = new Date(b.expiryDate).getTime();
                          const daysRemaining = Math.ceil((expiryTime - now) / (1000 * 3600 * 24));
                          const isExpired = daysRemaining <= 0;
                          const isExpiringSoon = !isExpired && daysRemaining <= 90;

                          return (
                            <tr key={b.id} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                {b.lotNumber}
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                                {b.expiryDate}
                              </td>
                              <td className="py-2 px-3">
                                {isExpired ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    PÉRIMÉ ({Math.abs(daysRemaining)}j)
                                  </span>
                                ) : isExpiringSoon ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    {daysRemaining}j restants
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                    Valide ({daysRemaining}j)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {b.quantity} / {b.initialQuantity || b.quantity}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                                {b.purchasePrice.toLocaleString('fr-FR')} F
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {b.supplierName || 'Fournisseur Direct'}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditBatch(b)}
                                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBatch(b.id)}
                                    className="p-1 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Product Movements */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Mouvements récents pour cet article ({movements.filter(m => m.productId === selectedProductForHistory.id).length})</span>
              </h4>

              {movements.filter(m => m.productId === selectedProductForHistory.id).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Aucun mouvement de stock enregistré pour ce produit.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {movements
                    .filter(m => m.productId === selectedProductForHistory.id)
                    .slice(0, 10)
                    .map(m => (
                      <div key={m.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {m.type.toUpperCase()} : {m.reason}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(m.date).toLocaleString('fr-FR')} {m.lotNumber ? `· Lot ${m.lotNumber}` : ''} · Par {m.performedBy}
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold">
                          <span className={m.type === 'entree' ? 'text-emerald-600' : 'text-slate-700'}>
                            {m.type === 'entree' ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {m.previousQuantity} → {m.newQuantity}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
