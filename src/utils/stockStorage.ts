import { Product, StockBatch, StockMovement, Supplier, PurchaseOrder, User } from '../types';
import { logAuditEvent } from './auditLogger';

const STOCK_BATCHES_KEY = 'gloryday_stock_batches_v1';
const STOCK_MOVEMENTS_KEY = 'gloryday_stock_movements_v1';
const SUPPLIERS_KEY = 'gloryday_suppliers_v1';
const PURCHASE_ORDERS_KEY = 'gloryday_purchase_orders_v1';

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-1',
    name: 'Becton Dickinson Pharma France',
    contactPerson: 'Marc Delattre',
    phone: '+33 1 42 68 00 12',
    email: 'contact@bd-medical.fr',
    country: 'France',
    leadTimeDays: 7
  },
  {
    id: 'supp-2',
    name: 'Braun Medical Melsungen',
    contactPerson: 'Dr. Helga Schmidt',
    phone: '+49 5661 71 0',
    email: 'orders@bbraun.de',
    country: 'Allemagne',
    leadTimeDays: 10
  },
  {
    id: 'supp-3',
    name: 'Ansell Healthcare Protective Europe',
    contactPerson: 'Sophie Bernard',
    phone: '+32 2 528 74 00',
    email: 'distribution@ansell.com',
    country: 'Belgique',
    leadTimeDays: 8
  },
  {
    id: 'supp-4',
    name: 'Laboratoires Urgo Médical',
    contactPerson: 'Patrick Moreau',
    phone: '+33 3 80 54 50 00',
    email: 'commandes@urgo.fr',
    country: 'France',
    leadTimeDays: 6
  }
];

export function getSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(SUPPLIERS_KEY);
    if (!raw) {
      localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(INITIAL_SUPPLIERS));
      return INITIAL_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliers(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
  } catch (err) {
    console.error('Erreur save suppliers:', err);
  }
}

export const INITIAL_STOCK_BATCHES: StockBatch[] = [
  {
    id: 'batch-ser-01-a',
    productId: 'c-ser-01',
    lotNumber: 'LOT-2025-BD01',
    expiryDate: '2027-06-30',
    quantity: 120,
    initialQuantity: 150,
    purchasePrice: 4800,
    supplierName: 'Becton Dickinson Pharma France',
    receivedDate: '2025-07-15'
  },
  {
    id: 'batch-ser-01-b',
    productId: 'c-ser-01',
    lotNumber: 'LOT-2024-BD99',
    expiryDate: '2026-11-20',
    quantity: 30,
    initialQuantity: 50,
    purchasePrice: 4700,
    supplierName: 'Becton Dickinson Pharma France',
    receivedDate: '2024-12-01'
  },
  {
    id: 'batch-ser-02-a',
    productId: 'c-ser-02',
    lotNumber: 'LOT-2025-BD05',
    expiryDate: '2027-09-30',
    quantity: 95,
    initialQuantity: 100,
    purchasePrice: 4900,
    supplierName: 'Becton Dickinson Pharma France',
    receivedDate: '2025-08-10'
  },
  {
    id: 'batch-cath-01-a',
    productId: 'c-ser-08',
    lotNumber: 'LOT-2025-BR44',
    expiryDate: '2028-01-15',
    quantity: 65,
    initialQuantity: 80,
    purchasePrice: 7800,
    supplierName: 'Braun Medical Melsungen',
    receivedDate: '2025-09-02'
  },
  {
    id: 'batch-gant-01-a',
    productId: 'c-gant-01',
    lotNumber: 'LOT-2025-AN01',
    expiryDate: '2027-12-31',
    quantity: 110,
    initialQuantity: 120,
    purchasePrice: 4200,
    supplierName: 'Ansell Healthcare Protective Europe',
    receivedDate: '2025-06-20'
  },
  {
    id: 'batch-tdr-palu-a',
    productId: 'dm-tdr-01',
    lotNumber: 'LOT-2024-SD90',
    expiryDate: '2026-12-31',
    quantity: 45,
    initialQuantity: 60,
    purchasePrice: 15500,
    supplierName: 'Laboratoires Urgo Médical',
    receivedDate: '2025-01-10'
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mvt-init-01',
    productId: 'c-ser-01',
    productName: 'Seringue 2 ml 3 pièces avec aiguille',
    lotNumber: 'LOT-2025-BD01',
    type: 'entree',
    quantity: 150,
    previousQuantity: 0,
    newQuantity: 150,
    reason: 'Réception initiale arrivage fournisseur Becton Dickinson France',
    date: '2025-07-15T09:30:00Z',
    performedBy: 'Responsable Pharmacie'
  },
  {
    id: 'mvt-init-02',
    productId: 'c-ser-01',
    productName: 'Seringue 2 ml 3 pièces avec aiguille',
    lotNumber: 'LOT-2025-BD01',
    type: 'sortie_commande',
    quantity: 30,
    previousQuantity: 150,
    newQuantity: 120,
    reason: 'Expédition commande Clinique Sainte-Marie (GP-2026-0042)',
    date: '2026-02-14T11:15:00Z',
    performedBy: 'Service Expéditions'
  },
  {
    id: 'mvt-init-03',
    productId: 'c-ser-08',
    productName: 'Cathéter court intraveineux (Cathlon)',
    lotNumber: 'LOT-2025-BR44',
    type: 'entree',
    quantity: 80,
    previousQuantity: 0,
    newQuantity: 80,
    reason: 'Réception arrivage Braun Medical Melsungen',
    date: '2025-09-02T14:00:00Z',
    performedBy: 'Directeur Logistique'
  },
  {
    id: 'mvt-init-04',
    productId: 'c-gant-01',
    productName: 'Gants d\'examen latex poudrés',
    lotNumber: 'LOT-2025-AN01',
    type: 'perte_casse',
    quantity: 2,
    previousQuantity: 112,
    newQuantity: 110,
    reason: 'Carton endommagé lors du transport maritime / déchargement',
    date: '2026-03-01T16:20:00Z',
    performedBy: 'Magasinier Central'
  }
];

export function getStockBatches(productId?: string): StockBatch[] {
  try {
    const raw = localStorage.getItem(STOCK_BATCHES_KEY);
    if (!raw) {
      localStorage.setItem(STOCK_BATCHES_KEY, JSON.stringify(INITIAL_STOCK_BATCHES));
      return productId ? INITIAL_STOCK_BATCHES.filter(b => b.productId === productId) : INITIAL_STOCK_BATCHES;
    }
    const parsed: StockBatch[] = JSON.parse(raw);
    if (productId) {
      return parsed.filter(b => b.productId === productId);
    }
    return parsed;
  } catch {
    return INITIAL_STOCK_BATCHES;
  }
}

export function getProductBatchHistory(productId: string): StockBatch[] {
  return getStockBatches(productId);
}

export function saveStockBatches(batches: StockBatch[]): void {
  try {
    localStorage.setItem(STOCK_BATCHES_KEY, JSON.stringify(batches));
  } catch (err) {
    console.error('Erreur save batches:', err);
  }
}

export function archiveStockBatch(batchId: string, user?: User | null): StockBatch | null {
  return updateStockBatch(batchId, { isArchived: true }, user);
}

export function createStockBatch(
  batch: Omit<StockBatch, 'id' | 'receivedDate'>,
  user?: User | null
): StockBatch {
  const current = getStockBatches();
  const newBatch: StockBatch = {
    ...batch,
    id: `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    receivedDate: new Date().toISOString().slice(0, 10),
    initialQuantity: batch.initialQuantity || batch.quantity
  };
  const updated = [newBatch, ...current];
  saveStockBatches(updated);

  if (user) {
    logAuditEvent(
      user,
      'mouvement_stock',
      'Lot Médical',
      newBatch.lotNumber,
      `Création du lot ${newBatch.lotNumber} (${newBatch.quantity} unités, péremption : ${newBatch.expiryDate})`,
      undefined,
      String(newBatch.quantity)
    );
  }
  return newBatch;
}

export function updateStockBatch(
  batchId: string,
  updates: Partial<StockBatch>,
  user?: User | null
): StockBatch | null {
  const current = getStockBatches();
  const idx = current.findIndex(b => b.id === batchId);
  if (idx === -1) return null;

  const oldBatch = current[idx];
  const updatedBatch: StockBatch = { ...oldBatch, ...updates };
  current[idx] = updatedBatch;
  saveStockBatches(current);

  if (user) {
    logAuditEvent(
      user,
      'mouvement_stock',
      'Lot Médical',
      updatedBatch.lotNumber,
      `Mise à jour du lot ${updatedBatch.lotNumber} (Qté: ${updatedBatch.quantity}, Péremption: ${updatedBatch.expiryDate})`,
      JSON.stringify(oldBatch),
      JSON.stringify(updatedBatch)
    );
  }
  return updatedBatch;
}

export function deleteStockBatch(batchId: string, user?: User | null): boolean {
  const current = getStockBatches();
  const target = current.find(b => b.id === batchId);
  if (!target) return false;

  const remaining = current.filter(b => b.id !== batchId);
  saveStockBatches(remaining);

  if (user) {
    logAuditEvent(
      user,
      'mouvement_stock',
      'Lot Médical',
      target.lotNumber,
      `Suppression du lot ${target.lotNumber} (Produit ID: ${target.productId})`
    );
  }
  return true;
}

export function getStockMovements(productId?: string): StockMovement[] {
  try {
    const raw = localStorage.getItem(STOCK_MOVEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(INITIAL_STOCK_MOVEMENTS));
      return productId ? INITIAL_STOCK_MOVEMENTS.filter(m => m.productId === productId) : INITIAL_STOCK_MOVEMENTS;
    }
    const parsed: StockMovement[] = JSON.parse(raw);
    if (productId) {
      return parsed.filter(m => m.productId === productId);
    }
    return parsed;
  } catch {
    return INITIAL_STOCK_MOVEMENTS;
  }
}

export function recordStockMovement(
  movement: Omit<StockMovement, 'id' | 'date'>,
  user?: User | null
): StockMovement {
  const all = getStockMovements();
  const newMovement: StockMovement = {
    ...movement,
    id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString()
  };
  const updated = [newMovement, ...all].slice(0, 800);
  try {
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(updated));
    if (user) {
      logAuditEvent(
        user,
        'mouvement_stock',
        'Stock Produit',
        movement.productId,
        `${movement.type.toUpperCase()} de ${movement.quantity} unités sur ${movement.productName} (${movement.reason})`,
        String(movement.previousQuantity),
        String(movement.newQuantity)
      );
    }
  } catch (err) {
    console.error('Erreur enregistrement mouvement stock:', err);
  }
  return newMovement;
}

export function updateStockMovement(
  movementId: string,
  updates: Partial<StockMovement>,
  user?: User | null
): StockMovement | null {
  const all = getStockMovements();
  const idx = all.findIndex(m => m.id === movementId);
  if (idx === -1) return null;

  const oldMvt = all[idx];
  const updatedMvt: StockMovement = { ...oldMvt, ...updates };
  all[idx] = updatedMvt;

  try {
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(all));
    if (user) {
      logAuditEvent(
        user,
        'mouvement_stock',
        'Mouvement Stock',
        movementId,
        `Modification du mouvement ${oldMvt.type} (${oldMvt.productName}) : ${updates.reason || 'Mise à jour motif/quantité'}`
      );
    }
  } catch (err) {
    console.error('Erreur mise à jour mouvement stock:', err);
  }
  return updatedMvt;
}

export function deleteStockMovement(movementId: string, user?: User | null): boolean {
  const all = getStockMovements();
  const target = all.find(m => m.id === movementId);
  if (!target) return false;

  const remaining = all.filter(m => m.id !== movementId);
  try {
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(remaining));
    if (user) {
      logAuditEvent(
        user,
        'mouvement_stock',
        'Mouvement Stock',
        movementId,
        `Annulation / Suppression du mouvement de stock ${target.type} (${target.productName}, ${target.quantity} unités)`
      );
    }
    return true;
  } catch (err) {
    console.error('Erreur suppression mouvement stock:', err);
    return false;
  }
}

export function getPurchaseOrders(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(PURCHASE_ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePurchaseOrders(orders: PurchaseOrder[]): void {
  try {
    localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Erreur save purchase orders:', err);
  }
}

// Décrémente le stock réel lors de la confirmation d'une commande
export function deductStockForOrder(
  orderItems: { productId: string; productName: string; quantity: number }[],
  products: Product[],
  onUpdateProduct: (product: Product) => void,
  user?: User | null
): void {
  const batches = getStockBatches();
  let batchesModified = false;

  orderItems.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return;

    const currentQty = typeof prod.quantityAvailable === 'number' 
      ? prod.quantityAvailable 
      : typeof prod.stockQuantity === 'number' 
        ? prod.stockQuantity 
        : 100;
    const newQty = Math.max(0, currentQty - item.quantity);
    const updatedProd: Product = {
      ...prod,
      quantityAvailable: newQty,
      stockQuantity: newQty,
      status: newQty === 0 ? 'rupture' : prod.status
    };

    // Déduction FEFO sur les lots existants pour ce produit
    const prodBatches = batches.filter(b => b.productId === prod.id && b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    let needed = item.quantity;
    for (const b of prodBatches) {
      if (needed <= 0) break;
      const deduct = Math.min(b.quantity, needed);
      b.quantity -= deduct;
      needed -= deduct;
      batchesModified = true;
    }

    onUpdateProduct(updatedProd);

    recordStockMovement({
      productId: prod.id,
      productName: prod.name,
      type: 'sortie_commande',
      quantity: item.quantity,
      previousQuantity: currentQty,
      newQuantity: newQty,
      reason: `Sortie commande automatique`,
      performedBy: user?.contactName || 'Système Commandes'
    }, user);
  });

  if (batchesModified) {
    saveStockBatches(batches);
  }
}

// Export CSV du catalogue complet avec marges et lots
export function exportProductsToCSV(products: Product[]): void {
  const headers = [
    'ID',
    'Nom',
    'Categorie',
    'SousCategorie',
    'Statut',
    'PrixVente_FCFA',
    'PrixAchat_FCFA',
    'Marge_FCFA',
    'TauxMarge_Pourcent',
    'StockActuel',
    'SeuilAlerte'
  ];

  const rows = products.map(p => {
    const salePrice = p.variants && p.variants[0] ? p.variants[0].price : 0;
    const buyPrice = p.purchasePrice || Math.round(salePrice * 0.65);
    const margin = salePrice > 0 ? salePrice - buyPrice : 0;
    const marginRate = salePrice > 0 ? Math.round((margin / salePrice) * 100) : 0;
    const stock = typeof p.stockQuantity === 'number' ? p.stockQuantity : 50;
    const alertThreshold = p.lowStockAlertThreshold || 10;

    return [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.subcategory || ''}"`,
      `"${p.status}"`,
      salePrice,
      buyPrice,
      margin,
      `${marginRate}%`,
      stock,
      alertThreshold
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `catalogue_gloryday_stock_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
