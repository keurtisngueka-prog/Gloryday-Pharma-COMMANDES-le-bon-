-- =====================================================================
-- GLORYDAY PHARMA - BASE DE DONNÉES POSTGRESQL & SUPABASE
-- Fichier : schema.sql
-- Description : Schéma DDL complet (tables, clés et index), sans données d'initialisation
-- Compatible : Supabase, Neon, Cloud SQL PostgreSQL, AWS RDS, Docker Postgres
-- =====================================================================

-- 1. EXTENSIONS POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE DES CLIENTS & ÉTABLISSEMENTS DE SANTÉ
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
    is_inactive_10_days BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE DU CATALOGUE PRODUITS MÉDICAUX
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE DES VARIANTES & CONDITIONNEMENTS DE PRODUITS
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL, -- Prix en FCFA (0 = sur devis)
    original_price BIGINT,
    discount_percentage INT
);

-- 5. TABLE DES COMMANDES
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    reference VARCHAR(32) NOT NULL UNIQUE,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    facility_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(32) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_mode VARCHAR(64) DEFAULT 'livraison',
    payment_method VARCHAR(64) DEFAULT 'especes',
    estimated_total BIGINT NOT NULL,
    status VARCHAR(64) DEFAULT 'À confirmer',
    is_paid BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLE DES LIGNES D'ARTICLES COMMANDÉS
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    variant_label VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    quantity INT NOT NULL,
    total BIGINT NOT NULL
);

-- 7. TABLE DES NOTIFICATIONS
CREATE TABLE IF NOT EXISTS app_notifications (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type VARCHAR(64) NOT NULL,
    order_id VARCHAR(64),
    order_reference VARCHAR(32),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    target_client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
    sent_by_admin BOOLEAN DEFAULT FALSE
);

-- 8. INDEX POUR OPTIMISATION DES RECHERCHES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_promotion ON products(is_promotion);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- =====================================================================
-- Fin du schéma : aucune donnée utilisateur ou produit n'est insérée automatiquement.

-- FIN DU SCRIPT SCHEMA.SQL GLORYDAY PHARMA
