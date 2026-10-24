import * as XLSX from 'xlsx';
import { Product, ProductVariant, Order, User, Pack, AppNotification } from '../types';

export interface CatalogImportDiffItem {
  id: string;
  name: string;
  category: string;
  previousStock: number;
  newStock: number;
  previousPrice: number;
  newPrice: number;
  previousStatus: 'disponible' | 'rupture';
  newStatus: 'disponible' | 'rupture';
  variantsCount: number;
  changesSummary: string[];
}

export interface CatalogImportCreatedItem {
  id: string;
  name: string;
  category: string;
  newStock: number;
  newPrice: number;
  newStatus: 'disponible' | 'rupture';
  variantsCount: number;
}

export interface CatalogImportPreviewResult {
  success: boolean;
  message: string;
  fileName: string;
  totalRowsRead: number;
  updatedItems: CatalogImportDiffItem[];
  createdItems: CatalogImportCreatedItem[];
  unchangedCount: number;
  productsToUpsert: Product[];
}

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  metadata: {
    appName: string;
    description: string;
    currency: string;
  };
  counts: {
    products: number;
    orders: number;
    clients: number;
    packs: number;
    notifications: number;
  };
  products: Product[];
  orders: Order[];
  clients: any[];
  packs: Pack[];
  notifications: AppNotification[];
}

// Download helper function for browser
function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper to escape CSV fields
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const raw = String(val);
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  const str = safe.replace(/"/g, '""');
  return `"${str}"`;
}

// 1. FULL JSON BACKUP
export function downloadFullBackupJSON(data: {
  products: Product[];
  orders: Order[];
  clients: any[];
  packs: Pack[];
  notifications: AppNotification[];
}) {
  const dateStr = new Date().toISOString().split('T')[0];
  const payload: FullBackupPayload = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    metadata: {
      appName: 'Gloryday Pharma - Commande Médicale',
      description: 'Plateforme mobile de commande de consommables et dispositifs médicaux (Libreville, Gabon)',
      currency: 'FCFA'
    },
    counts: {
      products: data.products.length,
      orders: data.orders.length,
      clients: data.clients.length,
      packs: data.packs.length,
      notifications: data.notifications.length,
    },
    products: data.products,
    orders: data.orders,
    clients: data.clients,
    packs: data.packs,
    notifications: data.notifications
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  triggerDownload(jsonStr, `gloryday-backup-${dateStr}.json`, 'application/json;charset=utf-8');
}

// 2A. PRODUCTS CSV (Excel compatible with UTF-8 BOM & Stock Quantity)
export function downloadProductsCSV(products: Product[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const headers = [
    'ID Article',
    'Nom du Produit',
    'Catégorie',
    'Sous-catégorie',
    'Conditionnement (Variante)',
    'Prix Net (FCFA)',
    'Quantité en Stock',
    'Seuil Alerte Stock',
    'Statut Stock',
    'En Promotion',
    'Pourcentage Remise (%)',
    'Ancien Prix Barré (FCFA)',
    'Description'
  ];

  const rows: string[][] = [];

  products.forEach(p => {
    const stockQty = p.quantityAvailable ?? p.stockQuantity ?? 0;
    const alertThreshold = p.alertThreshold ?? p.lowStockAlertThreshold ?? 10;
    const variantsList = Array.isArray(p.variants) && p.variants.length > 0
      ? p.variants
      : [{ label: 'Unité', price: 0 }];

    variantsList.forEach(v => {
      const isPromo = Boolean(p.isPromotion || (p.discountPercentage && p.discountPercentage > 0) || (v.discountPercentage && v.discountPercentage > 0));
      const discount = v.discountPercentage || p.discountPercentage || 0;
      const origPrice = v.originalPrice || p.originalPrice || '';

      rows.push([
        p.id,
        p.name,
        p.category,
        p.subcategory || '',
        v.label,
        String(v.price ?? 0),
        String(stockQty),
        String(alertThreshold),
        p.status === 'rupture' ? 'Rupture' : 'Disponible',
        isPromo ? 'OUI' : 'NON',
        discount > 0 ? String(discount) : '0',
        origPrice ? String(origPrice) : '',
        p.description || ''
      ]);
    });
  });

  const csvContent = '\uFEFF' + [
    headers.map(escapeCsv).join(';'),
    ...rows.map(r => r.map(escapeCsv).join(';'))
  ].join('\r\n');

  triggerDownload(csvContent, `gloryday-catalogue-stocks-${dateStr}.csv`, 'text/csv;charset=utf-8');
}

// 2B. PRODUCTS NATIVE EXCEL (.XLSX) EXPORT
export function downloadProductsXLSX(products: Product[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const sheetRows: Record<string, string | number>[] = [];

  products.forEach(p => {
    const stockQty = p.quantityAvailable ?? p.stockQuantity ?? 0;
    const alertThreshold = p.alertThreshold ?? p.lowStockAlertThreshold ?? 10;
    const variantsList = Array.isArray(p.variants) && p.variants.length > 0
      ? p.variants
      : [{ label: 'Unité', price: 0 }];

    variantsList.forEach(v => {
      const isPromo = Boolean(p.isPromotion || (p.discountPercentage && p.discountPercentage > 0) || (v.discountPercentage && v.discountPercentage > 0));
      const discount = v.discountPercentage || p.discountPercentage || 0;
      const origPrice = v.originalPrice || p.originalPrice || '';

      sheetRows.push({
        'ID Article': p.id,
        'Nom du Produit': p.name,
        'Catégorie': p.category,
        'Sous-catégorie': p.subcategory || '',
        'Conditionnement (Variante)': v.label,
        'Prix Net (FCFA)': Number(v.price ?? 0),
        'Quantité en Stock': Number(stockQty),
        'Seuil Alerte Stock': Number(alertThreshold),
        'Statut Stock': p.status === 'rupture' ? 'Rupture' : 'Disponible',
        'En Promotion': isPromo ? 'OUI' : 'NON',
        'Pourcentage Remise (%)': Number(discount || 0),
        'Ancien Prix Barré (FCFA)': origPrice !== '' ? Number(origPrice) : '',
        'Description': p.description || ''
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  worksheet['!cols'] = [
    { wch: 20 }, // ID Article
    { wch: 38 }, // Nom du Produit
    { wch: 24 }, // Catégorie
    { wch: 22 }, // Sous-catégorie
    { wch: 26 }, // Conditionnement
    { wch: 16 }, // Prix Net
    { wch: 18 }, // Quantité en Stock
    { wch: 18 }, // Seuil Alerte
    { wch: 16 }, // Statut Stock
    { wch: 14 }, // En Promotion
    { wch: 20 }, // Remise %
    { wch: 22 }, // Ancien Prix
    { wch: 45 }, // Description
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogue & Stocks');
  XLSX.writeFile(workbook, `gloryday-catalogue-stocks-${dateStr}.xlsx`);
}

// Helper: parse CSV string with auto-detected separator (; or ,)
function parseCsvToObjects(csvText: string): Record<string, any>[] {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  // Split into lines while respecting quotes
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      currentLine += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && cleaned[i + 1] === '\n') i++;
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += ch;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const splitRow = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === delimiter && !quoted) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = splitRow(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const result: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    if (values.every(v => !v.trim())) continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] ?? '').replace(/^"|"$/g, '').trim();
    });
    result.push(obj);
  }
  return result;
}

function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getRowField(row: Record<string, any>, candidateAliases: string[]): any {
  const normalizedTargets = new Set(candidateAliases.map(normalizeHeaderKey));
  for (const [k, v] of Object.entries(row)) {
    if (normalizedTargets.has(normalizeHeaderKey(k))) {
      return v;
    }
  }
  return undefined;
}

function parseCleanNumber(val: any, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, Math.round(val));
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (!str || /devis/i.test(str)) return 0;
  if (/^-/.test(str)) return 0;
  // FCFA prices and stock quantities are whole numbers; remove common
  // thousands separators instead of interpreting "15,000" as fifteen.
  const cleaned = str.replace(/[^\d]/g, '');
  if (!cleaned) return fallback;
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : fallback;
}

// 2C. PARSE & DIFF EXCEL (.XLSX / .CSV) CATALOG FOR ADMIN IMPORT
export async function parseCatalogSpreadsheet(
  file: File,
  existingProducts: Product[]
): Promise<CatalogImportPreviewResult> {
  try {
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      throw new Error('Utilisez un fichier Excel (.xlsx, .xls) ou CSV.');
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      throw new Error('Le fichier doit peser au maximum 5 Mo.');
    }
    const buffer = await file.arrayBuffer();
    let rawRows: Record<string, any>[] = [];

    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder('utf-8').decode(buffer);
      rawRows = parseCsvToObjects(text);
    } else {
      const workbook = XLSX.read(buffer, { type: 'array', cellFormula: false, bookVBA: false, WTF: false });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          message: 'Aucune feuille trouvée dans le fichier Excel.',
          fileName: file.name,
          totalRowsRead: 0,
          updatedItems: [],
          createdItems: [],
          unchangedCount: 0,
          productsToUpsert: []
        };
      }
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    }

    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        message: 'Le fichier est vide ou ne contient aucune ligne de données.',
        fileName: file.name,
        totalRowsRead: 0,
        updatedItems: [],
        createdItems: [],
        unchangedCount: 0,
        productsToUpsert: []
      };
    }
    if (rawRows.length > 500) {
      throw new Error('Le fichier dépasse la limite de 500 lignes de produits par import.');
    }

    // Group rows by Product (by ID Article if matching/present, else by normalized product name)
    interface GroupedProductRows {
      rawId: string;
      name: string;
      rows: Record<string, any>[];
    }

    const groupsMap = new Map<string, GroupedProductRows>();
    const existingById = new Map<string, Product>();
    const existingByName = new Map<string, Product>();

    existingProducts.forEach(p => {
      existingById.set(p.id.trim().toLowerCase(), p);
      existingByName.set(p.name.trim().toLowerCase(), p);
    });

    rawRows.forEach((row) => {
      const rawId = String(
        getRowField(row, ['ID Article', 'ID', 'id', 'Code Article', 'Reference', 'Référence']) ?? ''
      ).trim();
      const rawName = String(
        getRowField(row, ['Nom du Produit', 'Nom', 'Produit', 'Désignation', 'Article', 'Libellé', 'name']) ?? ''
      ).trim();

      if (!rawId && !rawName) return;

      const matchedExisting =
        (rawId ? existingById.get(rawId.toLowerCase()) : undefined) ||
        (rawName ? existingByName.get(rawName.toLowerCase()) : undefined);

      const groupKey = matchedExisting
        ? `existing:${matchedExisting.id}`
        : rawId
        ? `id:${rawId.toLowerCase()}`
        : `name:${rawName.toLowerCase()}`;

      const existingGroup = groupsMap.get(groupKey);
      if (existingGroup) {
        existingGroup.rows.push(row);
      } else {
        groupsMap.set(groupKey, {
          rawId: matchedExisting ? matchedExisting.id : rawId,
          name: rawName || matchedExisting?.name || 'Nouvel Article Médical',
          rows: [row]
        });
      }
    });

    if (groupsMap.size === 0) {
      throw new Error('Aucune colonne de nom ou d’identifiant de produit reconnue.');
    }

    const updatedItems: CatalogImportDiffItem[] = [];
    const createdItems: CatalogImportCreatedItem[] = [];
    const productsToUpsert: Product[] = [];
    let unchangedCount = 0;

    let newIndexCounter = 1;

    for (const group of groupsMap.values()) {
      const firstRow = group.rows[0];
      const existing =
        (group.rawId ? existingById.get(group.rawId.toLowerCase()) : undefined) ||
        (group.name ? existingByName.get(group.name.toLowerCase()) : undefined);

      const rawName = String(
        getRowField(firstRow, ['Nom du Produit', 'Nom', 'Produit', 'Désignation', 'Article', 'Libellé', 'name']) ?? ''
      ).trim();
      const finalName = rawName || existing?.name || 'Article Médical';

      const rawCategory = String(
        getRowField(firstRow, ['Catégorie', 'Categorie', 'Category', 'Famille']) ?? ''
      ).trim();
      const finalCategory = rawCategory || existing?.category || 'Consommables médicaux';

      const rawSubcategory = String(
        getRowField(firstRow, ['Sous-catégorie', 'Sous-categorie', 'Subcategory']) ?? ''
      ).trim();
      const finalSubcategory = rawSubcategory || existing?.subcategory;

      const rawDescription = String(
        getRowField(firstRow, ['Description', 'Détails', 'Details']) ?? ''
      ).trim();
      const finalDescription = rawDescription !== '' ? rawDescription : existing?.description;

      // Stock quantity parsing
      const rawStockCell = getRowField(firstRow, [
        'Quantité en Stock',
        'Quantite en Stock',
        'Stock',
        'Quantité',
        'Quantite',
        'Qté',
        'Qte',
        'quantityAvailable',
        'stockQuantity'
      ]);
      const prevStock = existing ? (existing.quantityAvailable ?? existing.stockQuantity ?? 0) : 0;
      const hasStockCell = rawStockCell !== undefined && String(rawStockCell).trim() !== '';
      const newStock = hasStockCell ? parseCleanNumber(rawStockCell, prevStock) : prevStock;

      // Alert threshold parsing
      const rawThresholdCell = getRowField(firstRow, [
        'Seuil Alerte Stock',
        'Seuil Alerte',
        'Seuil',
        'alertThreshold'
      ]);
      const prevThreshold = existing?.alertThreshold ?? existing?.lowStockAlertThreshold ?? 10;
      const newThreshold =
        rawThresholdCell !== undefined && String(rawThresholdCell).trim() !== ''
          ? parseCleanNumber(rawThresholdCell, prevThreshold)
          : prevThreshold;

      // Status parsing
      const rawStatusCell = String(
        getRowField(firstRow, ['Statut Stock', 'Statut', 'Disponibilité', 'status']) ?? ''
      ).trim().toLowerCase();
      const prevStatus: 'disponible' | 'rupture' = existing?.status === 'rupture' ? 'rupture' : 'disponible';
      let newStatus: 'disponible' | 'rupture' = prevStatus;

      if (rawStatusCell.includes('rupture') || rawStatusCell.includes('bloque') || rawStatusCell.includes('bloqué')) {
        // If user increased stock from 0 to > 0 without changing the old 'Rupture' label, unlock automatically
        if (newStock > 0 && prevStock === 0 && prevStatus === 'rupture') {
          newStatus = 'disponible';
        } else {
          newStatus = 'rupture';
        }
      } else if (rawStatusCell.includes('dispo') || rawStatusCell.includes('stock') || rawStatusCell.includes('actif')) {
        newStatus = 'disponible';
      } else if (newStock > 0 && prevStatus === 'rupture') {
        newStatus = 'disponible';
      }

      // Promotion parsing
      const rawPromoCell = String(
        getRowField(firstRow, ['En Promotion', 'Promo', 'Promotion', 'isPromotion']) ?? ''
      ).trim().toLowerCase();
      const isPromoFromCell =
        rawPromoCell === 'oui' || rawPromoCell === 'true' || rawPromoCell === '1'
          ? true
          : rawPromoCell === 'non' || rawPromoCell === 'false' || rawPromoCell === '0'
          ? false
          : existing?.isPromotion;

      // Build variants from rows
      const parsedVariants: ProductVariant[] = [];
      group.rows.forEach((r, idx) => {
        const vLabelRaw = String(
          getRowField(r, ['Conditionnement (Variante)', 'Conditionnement', 'Variante', 'Unité', 'Format']) ?? ''
        ).trim();
        const fallbackLabel = existing?.variants?.[idx]?.label || existing?.variants?.[0]?.label || 'Boîte standard';
        const vLabel = vLabelRaw || fallbackLabel;

        const vPriceRaw = getRowField(r, ['Prix Net (FCFA)', 'Prix Net', 'Prix (FCFA)', 'Prix', 'Tarif', 'price']);
        const fallbackPrice =
          existing?.variants?.find(v => v.label.toLowerCase() === vLabel.toLowerCase())?.price ??
          existing?.variants?.[idx]?.price ??
          existing?.variants?.[0]?.price ??
          0;
        const vPrice =
          vPriceRaw !== undefined && String(vPriceRaw).trim() !== ''
            ? parseCleanNumber(vPriceRaw, fallbackPrice)
            : fallbackPrice;

        const vDiscountRaw = getRowField(r, ['Pourcentage Remise (%)', 'Remise (%)', 'Remise', 'discountPercentage']);
        const vDiscount =
          vDiscountRaw !== undefined && String(vDiscountRaw).trim() !== ''
            ? parseCleanNumber(vDiscountRaw, 0)
            : undefined;

        const vOrigPriceRaw = getRowField(r, ['Ancien Prix Barré (FCFA)', 'Ancien Prix', 'Prix Barré', 'originalPrice']);
        const vOrigPrice =
          vOrigPriceRaw !== undefined && String(vOrigPriceRaw).trim() !== ''
            ? parseCleanNumber(vOrigPriceRaw, 0)
            : undefined;

        const existingVarIdx = parsedVariants.findIndex(v => v.label.toLowerCase() === vLabel.toLowerCase());
        const variantObj: ProductVariant = {
          label: vLabel,
          price: vPrice,
          ...(vOrigPrice && vOrigPrice > 0 ? { originalPrice: vOrigPrice } : {}),
          ...(vDiscount && vDiscount > 0 ? { discountPercentage: vDiscount } : {})
        };
        if (existingVarIdx > -1) {
          parsedVariants[existingVarIdx] = variantObj;
        } else {
          parsedVariants.push(variantObj);
        }
      });

      const finalVariants =
        parsedVariants.length > 0
          ? parsedVariants
          : existing?.variants?.length
          ? existing.variants
          : [{ label: 'Boîte standard', price: 0 }];

      const prevMainPrice = existing?.variants?.[0]?.price ?? 0;
      const newMainPrice = finalVariants[0]?.price ?? 0;

      if (existing) {
        const changes: string[] = [];
        if (prevStock !== newStock) {
          changes.push(`Stock : ${prevStock} ➔ ${newStock} u.`);
        }
        if (prevMainPrice !== newMainPrice) {
          changes.push(`Prix : ${prevMainPrice.toLocaleString('fr-FR')} ➔ ${newMainPrice.toLocaleString('fr-FR')} FCFA`);
        }
        if (prevStatus !== newStatus) {
          changes.push(`Statut : ${prevStatus === 'disponible' ? 'Disponible' : 'Rupture'} ➔ ${newStatus === 'disponible' ? 'Disponible' : 'Rupture'}`);
        }
        if (existing.name !== finalName) {
          changes.push(`Nom : ${existing.name} ➔ ${finalName}`);
        }
        if (existing.category !== finalCategory) {
          changes.push(`Catégorie : ${existing.category} ➔ ${finalCategory}`);
        }
        if ((existing.description || '') !== (finalDescription || '')) {
          changes.push('Description mise à jour');
        }
        if (JSON.stringify(existing.variants) !== JSON.stringify(finalVariants) && prevMainPrice === newMainPrice) {
          changes.push(`Variantes / conditionnements mis à jour (${finalVariants.length})`);
        }

        if (changes.length > 0) {
          const updatedProduct: Product = {
            ...existing,
            name: finalName,
            category: finalCategory,
            subcategory: finalSubcategory,
            description: finalDescription,
            variants: finalVariants,
            status: newStatus,
            quantityAvailable: newStock,
            stockQuantity: newStock,
            hasPhysicalStock: newStock > 0 && newStatus !== 'rupture',
            alertThreshold: newThreshold,
            isPromotion: isPromoFromCell
          };
          productsToUpsert.push(updatedProduct);
          updatedItems.push({
            id: existing.id,
            name: finalName,
            category: finalCategory,
            previousStock: prevStock,
            newStock,
            previousPrice: prevMainPrice,
            newPrice: newMainPrice,
            previousStatus: prevStatus,
            newStatus,
            variantsCount: finalVariants.length,
            changesSummary: changes
          });
        } else {
          unchangedCount++;
        }
      } else {
        const newId = group.rawId || `prod-import-${Date.now()}-${newIndexCounter++}`;
        const createdProduct: Product = {
          id: newId,
          name: finalName,
          category: finalCategory,
          subcategory: finalSubcategory,
          description: finalDescription,
          variants: finalVariants,
          status: newStatus,
          quantityAvailable: newStock,
          stockQuantity: newStock,
          hasPhysicalStock: newStock > 0 && newStatus !== 'rupture',
          alertThreshold: newThreshold,
          isPromotion: Boolean(isPromoFromCell)
        };
        productsToUpsert.push(createdProduct);
        createdItems.push({
          id: newId,
          name: finalName,
          category: finalCategory,
          newStock,
          newPrice: newMainPrice,
          newStatus,
          variantsCount: finalVariants.length
        });
      }
    }

    return {
      success: true,
      message: `Analyse terminée : ${updatedItems.length} article(s) modifié(s), ${createdItems.length} nouvel(aux) article(s), ${unchangedCount} inchangé(s).`,
      fileName: file.name,
      totalRowsRead: rawRows.length,
      updatedItems,
      createdItems,
      unchangedCount,
      productsToUpsert
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erreur lors de la lecture du fichier Excel/CSV : ${err?.message || 'Format non reconnu'}`,
      fileName: file.name,
      totalRowsRead: 0,
      updatedItems: [],
      createdItems: [],
      unchangedCount: 0,
      productsToUpsert: []
    };
  }
}


// 3. ORDERS CSV
export function downloadOrdersCSV(orders: Order[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const headers = [
    'Référence Commande',
    'Date de Création',
    'Établissement Client',
    'Type d Établissement',
    'Contact',
    'Téléphone',
    'Adresse Livraison',
    'Mode Livraison',
    'Moyen Paiement',
    'Nombre Articles',
    'Montant Total (FCFA)',
    'Statut',
    'Payé'
  ];

  const rows = orders.map(o => [
    o.reference,
    new Date(o.createdAt).toLocaleString('fr-FR'),
    o.customer.facilityName,
    o.customer.facilityType || '',
    o.customer.contactName,
    o.customer.phone,
    o.customer.deliveryAddress,
    o.customer.deliveryMode || 'livraison',
    o.customer.paymentMethod || 'especes',
    String(o.items.length),
    String(o.estimatedTotal),
    o.status,
    o.isPaid ? 'OUI' : 'NON'
  ]);

  const csvContent = '\uFEFF' + [
    headers.map(escapeCsv).join(';'),
    ...rows.map(r => r.map(escapeCsv).join(';'))
  ].join('\r\n');

  triggerDownload(csvContent, `gloryday-commandes-${dateStr}.csv`, 'text/csv;charset=utf-8');
}

// 4. CLIENTS CSV
export function downloadClientsCSV(clients: any[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const headers = [
    'ID Client',
    'Nom Établissement',
    'Type Établissement',
    'Contact Responsable',
    'Téléphone',
    'Adresse',
    'Nombre de Commandes',
    'Total Dépensé (FCFA)',
    'Dernière Commande (Jours)',
    'Inactif Plus de 10 Jours'
  ];

  const rows = clients.map(c => [
    c.id,
    c.facilityName || '',
    c.facilityType || '',
    c.contactName || '',
    c.phone || '',
    c.deliveryAddress || '',
    String(c.totalOrdersCount || 0),
    String(c.totalSpent || 0),
    c.daysSinceLastOrder !== undefined ? String(c.daysSinceLastOrder) : '',
    c.isInactive10Days ? 'OUI' : 'NON'
  ]);

  const csvContent = '\uFEFF' + [
    headers.map(escapeCsv).join(';'),
    ...rows.map(r => r.map(escapeCsv).join(';'))
  ].join('\r\n');

  triggerDownload(csvContent, `gloryday-clients-${dateStr}.csv`, 'text/csv;charset=utf-8');
}

// 5. POSTGRESQL / SUPABASE SQL SCRIPT
export function generateSupabaseSQLString(products: Product[], clients: any[], orders: Order[] = []): string {
  return `-- =====================================================================
-- GLORYDAY PHARMA - SCRIPT D'INITIALISATION POSTGRESQL (SUPABASE / CLOUD SQL)
-- Généré le : ${new Date().toLocaleString('fr-FR')}
-- Fichier source : /schema.sql ou /gloryday-database.sql
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE DES CLIENTS & ÉTABLISSEMENTS
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(32) NOT NULL UNIQUE,
    facility_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    facility_type VARCHAR(64) DEFAULT 'Clinique',
    delivery_address TEXT,
    role VARCHAR(32) DEFAULT 'client',
    total_spent BIGINT DEFAULT 0,
    total_orders_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE DES PRODUITS MÉDICAUX
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    subcategory VARCHAR(128),
    description TEXT,
    status VARCHAR(32) DEFAULT 'disponible',
    image_url TEXT,
    is_promotion BOOLEAN DEFAULT FALSE,
    discount_percentage INT DEFAULT 0,
    original_price BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE DES VARIANTES ET CONDITIONNEMENTS
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    original_price BIGINT,
    discount_percentage INT
);

-- 5. TABLE DES COMMANDES
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    reference VARCHAR(32) NOT NULL UNIQUE,
    client_id VARCHAR(64),
    facility_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    delivery_address TEXT NOT NULL,
    estimated_total BIGINT NOT NULL,
    status VARCHAR(64) DEFAULT 'À confirmer',
    is_paid BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLE DES LIGNES DE COMMANDE
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    variant_label VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    quantity INT NOT NULL,
    total BIGINT NOT NULL
);

-- 7. TABLE DU PERSONNEL & STAFF INTERNE
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(32) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL, -- Super-Admin, Commercial, Gestionnaire Catalogue, Logistique
    email VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE DES PACKS CLINIQUES & DOTATIONS
CREATE TABLE IF NOT EXISTS packs (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price BIGINT NOT NULL,
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLE DES DEVIS COMMERCIAUX
CREATE TABLE IF NOT EXISTS commercial_quotes (
    id VARCHAR(64) PRIMARY KEY,
    reference VARCHAR(32) NOT NULL UNIQUE,
    customer_id VARCHAR(64) REFERENCES clients(id),
    commercial_id VARCHAR(64) REFERENCES staff(id),
    subtotal BIGINT NOT NULL,
    discount_amount BIGINT DEFAULT 0,
    final_total BIGINT NOT NULL,
    status VARCHAR(32) DEFAULT 'Brouillon',
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TABLE DES PAIEMENTS ÉCHELONNÉS & MOBILES
CREATE TABLE IF NOT EXISTS payment_installments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- acompte, solde, unique
    amount BIGINT NOT NULL,
    payment_method VARCHAR(32) NOT NULL, -- airtel_money, moov_money, especes, virement
    transaction_reference VARCHAR(64),
    status VARCHAR(32) DEFAULT 'valide',
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABLE DES MESSAGES DIRECTS & DIFFUSION
CREATE TABLE IF NOT EXISTS direct_messages (
    id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(64),
    recipient_facility_name VARCHAR(255),
    recipient_phone VARCHAR(32),
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(32) DEFAULT 'both',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. TABLE DES LOTS MÉDICAUX & PÉREMPTIONS
CREATE TABLE IF NOT EXISTS stock_batches (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    lot_number VARCHAR(64) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT NOT NULL,
    purchase_price BIGINT NOT NULL,
    supplier_name VARCHAR(255),
    received_date DATE DEFAULT CURRENT_DATE
);

-- 13. TABLE DU JOURNAL D'AUDIT IMMUABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_entity VARCHAR(128) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    device_info TEXT,
    details TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT
);

-- 14. TABLE ACTIVITY_LOGS (Actions critiques en temps réel dans Supabase)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "userId" TEXT,
    "actionType" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    actor_name TEXT,
    actor_role TEXT,
    category TEXT DEFAULT 'system',
    severity TEXT DEFAULT 'info',
    action_label TEXT,
    target_label TEXT,
    previous_value TEXT,
    new_value TEXT,
    app_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_snake ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_snake ON public.activity_logs (entity_type, entity_id);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_admin_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_admin_select_policy"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) IN ('Super-Admin', 'Admin simple', 'admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('Super-Admin', 'Admin simple')
    )
  );

-- 15. VUE SQL : HISTORIQUE COMPLET DES ACHATS D'UN CLIENT (ADMINISTRATEUR)
CREATE OR REPLACE VIEW public.client_purchase_history_view AS
SELECT
    COALESCE(o.client_id::text, LOWER(TRIM(o.phone))) AS client_key,
    MAX(o.facility_name) AS facility_name,
    o.phone AS phone,
    MAX(o.delivery_address) AS delivery_address,
    COUNT(o.id) FILTER (WHERE o.status <> 'Annulée') AS total_orders_count,
    COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée'), 0) AS total_spent,
    COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée' AND o.is_paid = TRUE), 0) AS paid_amount,
    COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée' AND o.is_paid = FALSE), 0) AS unpaid_amount,
    MIN(o.created_at) FILTER (WHERE o.status <> 'Annulée') AS first_order_date,
    MAX(o.created_at) FILTER (WHERE o.status <> 'Annulée') AS last_order_date
FROM orders o
GROUP BY COALESCE(o.client_id::text, LOWER(TRIM(o.phone))), o.phone;

-- =====================================================================
-- INSERTION DES PRODUITS MÉDICAUX ACTUELS (${products.length} articles)
-- =====================================================================
${products.map(p => {
  const safeName = p.name.replace(/'/g, "''");
  const safeCat = p.category.replace(/'/g, "''");
  const safeSub = (p.subcategory || '').replace(/'/g, "''");
  const safeDesc = (p.description || '').replace(/'/g, "''");
  const isPromo = p.isPromotion ? 'TRUE' : 'FALSE';
  const discount = p.discountPercentage || 0;
  const origPrice = p.originalPrice || 0;
  const img = p.image ? `'${p.image.replace(/'/g, "''")}'` : 'NULL';

  const productSql = `INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('${p.id}', '${safeName}', '${safeCat}', '${safeSub}', '${safeDesc}', '${p.status}', ${img}, ${isPromo}, ${discount}, ${origPrice})
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage;`;

  const variantsSql = p.variants.map(v => {
    const safeLabel = v.label.replace(/'/g, "''");
    const vOrig = v.originalPrice || 'NULL';
    const vDisc = v.discountPercentage || 'NULL';
    return `INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('${p.id}', '${safeLabel}', ${v.price}, ${vOrig}, ${vDisc});`;
  }).join('\n');

  return `${productSql}\n${variantsSql}`;
}).join('\n\n')}

-- =====================================================================
-- INSERTION DES CLIENTS (${clients.length} établissements)
-- =====================================================================
${clients.map(c => {
  const safeFac = (c.facilityName || 'Établissement').replace(/'/g, "''");
  const safeCont = (c.contactName || '').replace(/'/g, "''");
  const safeAddr = (c.deliveryAddress || 'Libreville').replace(/'/g, "''");
  const spent = c.totalSpent || 0;
  const ordCount = c.totalOrdersCount || 0;
  return `INSERT INTO clients (id, phone, facility_name, contact_name, facility_type, delivery_address, total_spent, total_orders_count)
VALUES ('${c.id}', '${c.phone || '+24100000000'}', '${safeFac}', '${safeCont}', '${c.facilityType || 'Clinique'}', '${safeAddr}', ${spent}, ${ordCount})
ON CONFLICT (id) DO NOTHING;`;
}).join('\n')}

-- Fin du script SQL Supabase / PostgreSQL Gloryday Pharma
`;
}

export function downloadSupabaseSQL(products: Product[], clients: any[], orders: Order[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const sql = generateSupabaseSQLString(products, clients, orders);
  triggerDownload(sql, `schema.sql`, 'text/plain;charset=utf-8');
}

// 6. RESTORE / IMPORT BACKUP JSON
export function restoreBackupJSON(jsonStr: string): {
  success: boolean;
  message: string;
  data?: {
    products?: Product[];
    orders?: Order[];
    clients?: any[];
    packs?: Pack[];
  };
} {
  try {
    const payload = JSON.parse(jsonStr);
    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'Fichier JSON invalide ou corrompu.' };
    }

    const products = Array.isArray(payload.products) ? payload.products : undefined;
    const orders = Array.isArray(payload.orders) ? payload.orders : undefined;
    const clients = Array.isArray(payload.clients) ? payload.clients : undefined;
    const packs = Array.isArray(payload.packs) ? payload.packs : undefined;

    if (!products && !orders && !clients) {
      return { success: false, message: 'Le fichier ne contient ni catalogue, ni commandes, ni clients.' };
    }

    if (products) {
      localStorage.setItem('gloryday_products_v2', JSON.stringify(products));
      localStorage.setItem('gloryday_products', JSON.stringify(products));
    }
    if (orders) {
      localStorage.setItem('gloryday_orders_v2', JSON.stringify(orders));
      localStorage.setItem('gloryday_orders', JSON.stringify(orders));
    }
    if (clients) {
      localStorage.setItem('gloryday_clients_v2', JSON.stringify(clients));
      localStorage.setItem('gloryday_clients', JSON.stringify(clients));
    }
    if (packs) {
      localStorage.setItem('gloryday_packs_v1', JSON.stringify(packs));
    }

    return {
      success: true,
      message: `Restauration réussie : ${products?.length || 0} produits, ${orders?.length || 0} commandes, ${clients?.length || 0} clients restaurés.`,
      data: { products, orders, clients, packs }
    };
  } catch (err: any) {
    return { success: false, message: `Erreur lors de la lecture du fichier : ${err.message}` };
  }
}


