import { Product, Order, User, Pack, AppNotification } from '../types';

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
  const str = String(val).replace(/"/g, '""');
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

// 2. PRODUCTS CSV (Excel compatible with UTF-8 BOM)
export function downloadProductsCSV(products: Product[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const headers = [
    'ID Article',
    'Nom du Produit',
    'Catégorie',
    'Sous-catégorie',
    'Conditionnement (Variante)',
    'Prix Net (FCFA)',
    'En Promotion',
    'Pourcentage Remise (%)',
    'Ancien Prix Barré (FCFA)',
    'Statut Stock',
    'Description'
  ];

  const rows: string[][] = [];

  products.forEach(p => {
    p.variants.forEach(v => {
      const isPromo = Boolean(p.isPromotion || (p.discountPercentage && p.discountPercentage > 0) || (v.discountPercentage && v.discountPercentage > 0));
      const discount = v.discountPercentage || p.discountPercentage || 0;
      const origPrice = v.originalPrice || p.originalPrice || '';

      rows.push([
        p.id,
        p.name,
        p.category,
        p.subcategory || '',
        v.label,
        v.price > 0 ? String(v.price) : 'Sur devis',
        isPromo ? 'OUI' : 'NON',
        discount > 0 ? `${discount}%` : '',
        origPrice ? String(origPrice) : '',
        p.status === 'rupture' ? 'Rupture' : 'Disponible',
        p.description || ''
      ]);
    });
  });

  const csvContent = '\uFEFF' + [
    headers.map(escapeCsv).join(';'),
    ...rows.map(r => r.map(escapeCsv).join(';'))
  ].join('\r\n');

  triggerDownload(csvContent, `gloryday-catalogue-${dateStr}.csv`, 'text/csv;charset=utf-8');
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

