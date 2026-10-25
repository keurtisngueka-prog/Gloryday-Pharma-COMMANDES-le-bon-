-- =====================================================================
-- GLORYDAY PHARMA - MIGRATION 01 : SCHÉMA INITIAL (Project: kqvfoltosjrjvghaizpd)
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE DES PROFILS & UTILISATEURS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    phone VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255),
    facility_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    facility_type VARCHAR(64) DEFAULT 'Clinique',
    delivery_address TEXT,
    role VARCHAR(32) DEFAULT 'client' CHECK (role IN ('client', 'commercial', 'admin', 'livreur')),
    assigned_commercial_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_spent BIGINT DEFAULT 0,
    total_orders_count INT DEFAULT 0,
    is_inactive_10_days BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. TABLE DES PRODUITS & DISPOSITIFS MÉDICAUX
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    subcategory VARCHAR(128),
    specialty VARCHAR(128),
    description TEXT,
    status VARCHAR(32) DEFAULT 'disponible' CHECK (status IN ('disponible', 'rupture')),
    image_url TEXT,
    is_promotion BOOLEAN DEFAULT FALSE,
    discount_percentage INT DEFAULT 0,
    original_price BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- 4. TABLE DES VARIANTES DE PRODUITS
CREATE TABLE IF NOT EXISTS public.product_variants (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    original_price BIGINT,
    discount_percentage INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);

-- 5. TABLE DES COMMANDES
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY,
    reference VARCHAR(64) NOT NULL UNIQUE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    facility_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(32) NOT NULL,
    facility_type VARCHAR(64),
    delivery_address TEXT NOT NULL,
    neighborhood_id VARCHAR(64),
    neighborhood_name VARCHAR(128),
    delivery_zone VARCHAR(128),
    delivery_fee BIGINT DEFAULT 0,
    delivery_estimated VARCHAR(128),
    order_type VARCHAR(32) DEFAULT 'standard' CHECK (order_type IN ('standard', 'express', 'devis')),
    has_quote_items BOOLEAN DEFAULT FALSE,
    estimated_total BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) DEFAULT 'À confirmer' CHECK (status IN ('À confirmer', 'Confirmée', 'En préparation', 'Livrée', 'Annulée')),
    is_paid BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(64) DEFAULT 'especes',
    delivery_stage VARCHAR(32) DEFAULT 'preparation' CHECK (delivery_stage IN ('preparation', 'picked_up', 'in_transit', 'delivered')),
    cancellation_reason TEXT,
    notes TEXT,
    pdf_url TEXT,
    courier_name VARCHAR(128),
    courier_phone VARCHAR(32),
    courier_vehicle VARCHAR(64),
    courier_matricule VARCHAR(32),
    courier_current_zone VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 6. LIGNES DE COMMANDE
CREATE TABLE IF NOT EXISTS public.order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255),
    price BIGINT NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    total BIGINT NOT NULL DEFAULT 0,
    is_quote BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 7. TABLE DES DEVIS COMMERCIAUX
CREATE TABLE IF NOT EXISTS public.commercial_quotes (
    id VARCHAR(64) PRIMARY KEY,
    quote_number VARCHAR(64) NOT NULL UNIQUE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    facility_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(32) NOT NULL,
    commercial_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    commercial_name VARCHAR(128),
    total_amount BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) DEFAULT 'Brouillon' CHECK (status IN ('Brouillon', 'Envoyé', 'Accepté', 'Rejeté', 'Converti en commande')),
    valid_until DATE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE DES MESSAGES DIRECTS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id VARCHAR(64) PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name VARCHAR(128) NOT NULL,
    sender_role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) DEFAULT 'order',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. JOURNAL D'AUDIT & PARAMÈTRES SYSTÈME
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    action VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    target_label VARCHAR(255),
    details TEXT,
    severity VARCHAR(32) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    company_name VARCHAR(255) DEFAULT 'Gloryday Pharma Gabon',
    whatsapp_number VARCHAR(32),
    airtel_money_number VARCHAR(32),
    moov_money_number VARCHAR(32),
    free_delivery_threshold BIGINT DEFAULT 150000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger automatique updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
