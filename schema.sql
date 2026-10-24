-- =====================================================================
-- GLORYDAY PHARMA - BASE DE DONNÉES POSTGRESQL & SUPABASE
-- Fichier : schema.sql
-- Description : Schéma DDL complet (tables, clés, index et vues), sans données d'initialisation
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
    facility_type VARCHAR(64),
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

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS facility_type VARCHAR(64);

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

-- 8. JOURNAL DES ACTIONS ADMINISTRATIVES ET HISTORIQUE DES ACHATS
-- Les propriétés supplémentaires restent compatibles avec les migrations
-- Supabase qui stockent les données applicatives dans app_data.
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

CREATE OR REPLACE VIEW public.client_purchase_history_view AS
SELECT
    COALESCE(o.client_id::text, LOWER(TRIM(o.phone))) AS client_key,
    MAX(o.facility_name) AS facility_name,
    MAX(o.facility_type) AS facility_type,
    MAX(o.contact_name) AS contact_name,
    o.phone AS phone,
    MAX(o.delivery_address) AS delivery_address,
    COUNT(o.id) FILTER (WHERE o.status <> 'Annulée') AS total_orders_count,
    COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée'), 0) AS total_spent,
    COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée' AND o.is_paid = TRUE), 0) AS paid_amount,
    COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée' AND o.is_paid = FALSE), 0) AS unpaid_amount,
    CASE
        WHEN COUNT(o.id) FILTER (WHERE o.status <> 'Annulée') > 0
        THEN ROUND(
            COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée'), 0)::numeric /
            COUNT(o.id) FILTER (WHERE o.status <> 'Annulée')
        )
        ELSE 0
    END AS average_order_value,
    MIN(o.created_at) FILTER (WHERE o.status <> 'Annulée') AS first_order_date,
    MAX(o.created_at) FILTER (WHERE o.status <> 'Annulée') AS last_order_date,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', o.id,
                'reference', o.reference,
                'createdAt', o.created_at,
                'status', o.status,
                'isPaid', o.is_paid,
                'estimatedTotal', o.estimated_total,
                'deliveryMode', o.delivery_mode,
                'paymentMethod', o.payment_method,
                'deliveryAddress', o.delivery_address
            ) ORDER BY o.created_at DESC
        ),
        '[]'::jsonb
    ) AS orders_history
FROM public.orders o
GROUP BY COALESCE(o.client_id::text, LOWER(TRIM(o.phone))), o.phone;

-- 9. INDEX POUR OPTIMISATION DES RECHERCHES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_promotion ON products(is_promotion);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- =====================================================================
-- FIN DU SCRIPT SCHEMA.SQL GLORYDAY PHARMA
