-- =====================================================================
-- GLORYDAY PHARMA - BASE DE DONNÉES POSTGRESQL & SUPABASE
-- Fichier : schema.sql
-- Description : Schéma complet DDL (tables, clés, index) + Données d'initialisation (Seed)
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
-- DONNÉES INITIALES (SEED) : 39 ARTICLES MÉDICAUX DU CATALOGUE
-- =====================================================================
INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-01', 'Seringue 2 ml 3 pièces avec aiguille', 'Consommables médicaux', 'Seringues et perfusion', 'Seringue stérile 3 pièces à usage unique avec aiguille 21G ou 23G, emballage blister individuel.', 'disponible', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80', TRUE, 20, 9375)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-01', 'Boîte de 100 unités (21G)', 7500, 9375, 20);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-01', 'Carton de 20 boîtes (2000 unités)', 140000, 175000, 20);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-02', 'Seringue 5 ml 3 pièces avec aiguille', 'Consommables médicaux', 'Seringues et perfusion', 'Seringue stérile 5 ml 3 pièces avec aiguille sertie ou luer-slip, bague de sécurité.', 'disponible', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80', FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-02', 'Boîte de 100 unités (21G)', 7500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-02', 'Carton de 18 boîtes (1800 unités)', 128000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-03', 'Seringue 10 ml 3 pièces', 'Consommables médicaux', 'Seringues et perfusion', 'Seringue stérile 10 ml haute transparence, graduation nette et durable.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-03', 'Boîte de 100 unités', 9500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-03', 'Carton de 12 boîtes', 108000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-04', 'Seringue 20 ml Luer Lock', 'Consommables médicaux', 'Seringues et perfusion', 'Seringue stérile 20 ml embout luer lock pour injection ou prélèvement sécurisé.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-04', 'Boîte de 50 unités', 8500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-05', 'Seringue 50 ml gavage / irrigation', 'Consommables médicaux', 'Seringues et perfusion', 'Seringue grand volume pour alimentation entérale, lavage vésical ou pansements.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-05', 'Boîte de 25 unités (embout conique)', 11000, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-05', 'Boîte de 25 unités (Luer Lock)', 12500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-06', 'Seringue à Insuline 1 ml avec aiguille 29G', 'Consommables médicaux', 'Seringues et perfusion', 'Seringue à insuline stérile 1 ml, graduation fine 100 UI, aiguille atraumatique.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-06', 'Boîte de 100 unités (U-100)', 8900, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-07', 'Aiguille hypodermique stérile', 'Consommables médicaux', 'Seringues et perfusion', 'Aiguilles hypodermiques stériles à biseau triple affûtage, connecteur Luer standard.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-07', '18G (Rose) - Boîte de 100', 3500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-07', '21G (Vert) - Boîte de 100', 3500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-07', '23G (Bleu) - Boîte de 100', 3500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-07', '25G (Orange) - Boîte de 100', 3500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-08', 'Cathéter court intraveineux (Cathlon)', 'Consommables médicaux', 'Seringues et perfusion', 'Cathéter IV avec site d injection et ailettes, canule en FEP ou PTFE lubrifié.', 'disponible', NULL, TRUE, 15, 14100)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-08', '18G (Vert) - Boîte de 50', 12000, 14100, 15);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-08', '20G (Rose) - Boîte de 50', 12000, 14100, 15);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-08', '22G (Bleu) - Boîte de 50', 12000, 14100, 15);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-08', '24G pédiatrique (Jaune) - Boîte de 50', 13500, 15800, 15);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-09', 'Perfuseur stérile avec filtre et prise d air', 'Consommables médicaux', 'Seringues et perfusion', 'Tubulure de perfusion stérile 20 gouttes/ml avec chambre compte-gouttes souple et filtre.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-09', 'Sachet individuel (Boîte de 25)', 6500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-09', 'Carton de 200 unités', 48000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-10', 'Transfuseur de sang stérile avec filtre 200µ', 'Consommables médicaux', 'Seringues et perfusion', 'Dispositif de transfusion sanguine stérile avec filtre à micro-caillots conforme normes hématologiques.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-10', 'Boîte de 25 unités', 14500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-11', 'Robinet 3 voies Luer-Lock stérile', 'Consommables médicaux', 'Seringues et perfusion', 'Robinet 3 voies résistant aux lipides et à haute pression, manipulation fluide à 360°.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-11', 'Boîte de 50 unités', 11500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-12', 'Prolongateur de perfusion Luer Lock 150 cm', 'Consommables médicaux', 'Seringues et perfusion', 'Ligne d extension stérile en PVC médical souple haute résistance.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-12', 'Boîte de 25 unités', 8000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-ser-13', 'Microperfuseur épicrânien (Epicrânienne / Butterfly)', 'Consommables médicaux', 'Seringues et perfusion', 'Aiguille à ailettes souples avec tubulure 30 cm pour perfusion pédiatrique ou prélèvement délicat.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-13', '21G - Boîte de 100', 9500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-13', '23G - Boîte de 100', 9500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-ser-13', '25G - Boîte de 100', 9500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-gan-01', 'Gants d examen en Latex non poudré', 'Consommables médicaux', 'Gants', 'Gants d examen ambidextres en latex naturel hypoallergénique, surface micro-texturée.', 'disponible', NULL, TRUE, 25, 6000)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-01', 'Taille S - Boîte de 100', 4500, 6000, 25);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-01', 'Taille M - Boîte de 100', 4500, 6000, 25);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-01', 'Taille L - Boîte de 100', 4500, 6000, 25);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-gan-02', 'Gants d examen en Latex poudré', 'Consommables médicaux', 'Gants', 'Gants en latex légèrement poudrés à l amidon de maïs bio pour un enfilage rapide.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-02', 'Taille S - Boîte de 100', 3800, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-02', 'Taille M - Boîte de 100', 3800, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-02', 'Taille L - Boîte de 100', 3800, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-gan-03', 'Gants d examen en Nitrile bleu (sans poudre)', 'Consommables médicaux', 'Gants', 'Gants en nitrile haute résistance chimique et biologique, sans protéines de latex.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-03', 'Taille S - Boîte de 100', 5500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-03', 'Taille M - Boîte de 100', 5500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-03', 'Taille L - Boîte de 100', 5500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-03', 'Taille XL - Boîte de 100', 5900, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('c-gan-04', 'Gants chirurgicaux stériles poudrés (la paire)', 'Consommables médicaux', 'Gants', 'Gants chirurgicaux stériles emballés par paire sous pochette pelable avec repérage main gauche/droite.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-04', 'Taille 6.5 - Boîte de 50 paires', 16000, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-04', 'Taille 7.0 - Boîte de 50 paires', 16000, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-04', 'Taille 7.5 - Boîte de 50 paires', 16000, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('c-gan-04', 'Taille 8.0 - Boîte de 50 paires', 16000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-01', 'Oxymètre de pouls digital au doigt (Saturomètre)', 'Équipements & Matériel médical', '', 'Mesure précise de la SpO2 et du pouls, affichage pléthysmographique, alarme sonore.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-01', 'Modèle portable écran OLED avec piles', 18500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-02', 'Tensiomètre manuel professionnel Manopoire', 'Équipements & Matériel médical', '', 'Mano-poire grand cadran précis, poire ergonomique avec robinet de décompression micrométrique.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-02', 'Boîtier antichoc avec brassard adulte nylon', 22000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-03', 'Tensiomètre électronique médical pour bras', 'Équipements & Matériel médical', '', 'Affichage grand écran LCD, détection d arythmie, classification tensionnelle OMS.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-03', 'Modèle clinique automatique mémoire 99 mesures', 32000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-04', 'Doppler fœtal de poche avec sonde 2 MHz', 'Équipements & Matériel médical', '', 'Détecteur de battements cardiaques fœtaux dès 10-12 semaines de grossesse, haut-parleur intégré.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-04', 'Modèle compact avec écran rétroéclairé', 45000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-05', 'Thermomètre médical infrarouge sans contact', 'Équipements & Matériel médical', '', 'Mesure corporelle à distance de 3 à 5 cm, alarme visuelle de fièvre multicolore.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-05', 'Modèle frontal haute vitesse (1 seconde)', 15000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-07', 'Stéthoscope de diagnostic à double pavillon inox', 'Équipements & Matériel médical', '', 'Pavillon usiné en inox avec membrane flottante et bague anti-froid, lyre anatomique réglable.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-07', 'Version Adulte acoustique haute performance', 16500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-07', 'Version Pédiatrique & Néonatale', 19500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-dev-01', 'Concentrateur d oxygène médical hospitalier 10 L/min', 'Équipements & Matériel médical', '', 'Appareil médical stationnaire haute pureté avec double sortie, nébuliseur intégré et alarmes.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-dev-01', 'Débit 1 à 10 L/min continu - Pureté 93% ± 3%', 0, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-dev-02', 'Échographe portable numérique couleur Doppler avec sondes', 'Équipements & Matériel médical', '', 'Système d imagerie échographique haute définition, écran 15 pouces LED, préréglages gynéco et cardio.', 'disponible', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80', FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-dev-02', 'Configuration complète avec sonde convexe + linéaire', 0, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-dev-03', 'Moniteur multiparamétrique de surveillance patient', 'Équipements & Matériel médical', '', 'Moniteur patient pour soins intensifs et salle de réveil avec batterie rechargeable et alarmes.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-dev-03', 'Écran 12.1" tactile (ECG, SpO2, PNI, Température, Resp)', 0, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-dev-04', 'Électrocardiographe (ECG) 12 pistes numérique', 'Équipements & Matériel médical', '', 'Appareil ECG 12 dérivations simultanées avec analyse de rythme et export des tracés.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-dev-04', 'Modèle avec interprétation automatique et mémoire SD', 0, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('eq-dev-05', 'Défibrillateur semi-automatique (DSA) complet', 'Équipements & Matériel médical', '', 'Défibrillateur cardiaque automatisé avec autotests quotidiens et guidage vocal étape par étape.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('eq-dev-05', 'Pack DSA complet avec invite vocale et kit de secours', 0, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('r-02', 'TDR Paludisme / Malaria Pf/Pv cassette rapide', 'Réactifs & Laboratoire', '', 'Test immunochromatographique rapide pour détection de Plasmodium falciparum et vivax (sensibilité > 99%).', 'disponible', NULL, TRUE, 15, 14700)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('r-02', 'Boîte de 25 tests avec lancettes et diluant', 12500, 14700, 15);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('r-02', 'Carton de 40 boîtes (1000 tests)', 460000, 541000, 15);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('r-03', 'Test rapide de dépistage VIH 1/2 cassette', 'Réactifs & Laboratoire', '', 'Test rapide d orientation diagnostique pour détection des anticorps anti-VIH-1 et VIH-2.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('r-03', 'Boîte de 30 cassettes avec tubes capillaires', 18000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('r-06', 'Test de grossesse urinaire rapide hCG', 'Réactifs & Laboratoire', '', 'Seuil de détection précoce 20 mUI/ml pour détection de l hormone gonadotrophine chorionique.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('r-06', 'Format Bandelettes - Boîte de 50', 6500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('r-06', 'Format Cassettes stériles - Boîte de 25', 7500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('r-09', 'Bandelettes réactives urinaires 10 paramètres (10SG)', 'Réactifs & Laboratoire', '', 'Dépistage leucocytes, nitrites, protéines, pH, sang, cétones, bilirubine, glucose.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('r-09', 'Flacon de 100 bandelettes', 9500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('h-01', 'Solution hydroalcoolique pour désinfection mains', 'Hygiène & Désinfection', '', 'Formulation recommandée par l OMS pour la friction hygiénique et chirurgicale des mains.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('h-01', 'Flacon 500 ml avec pompe distributrice', 3200, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('h-01', 'Bidon de recharge 5 Litres', 19000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('h-02', 'Antiseptique Polyvidone Iodée 10% (Bétadine)', 'Hygiène & Désinfection', '', 'Antiseptique à large spectre bactéricide, fongicide et virucide pour préparation opératoire.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('h-02', 'Flacon de 500 ml dermique', 4200, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('h-02', 'Bidon de 5 Litres', 28000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('h-06', 'Boîte de sécurité pour déchets perforants (DASRI)', 'Hygiène & Désinfection', '', 'Collecteur sécurisé pour aiguilles, lames de bistouri et cathéters avec fermeture définitive conforme OMS.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('h-06', 'Contenance 5 Litres en carton renforcé étanche', 1800, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('h-06', 'Carton de 25 collecteurs 5L', 38000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('p-01', 'Tulle gras stérile pour brûlures et plaies', 'Pansements & Soins', '', 'Pansement imprégné de vaseline neutre favorisant la cicatrisation sans adhérer au lit de la plaie.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('p-01', '10 cm x 10 cm - Boîte de 10 pansements', 6800, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('p-01', '10 cm x 10 cm - Boîte de 30 pansements', 18500, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('p-03', 'Bande adhésive élastique de contention (Elastoplaste)', 'Pansements & Soins', '', 'Bande élastique en pur coton avec masse adhésive hypoallergénique pour strapping et maintien.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('p-03', '6 cm x 2.5 m - Rouleau', 2800, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('p-03', '8 cm x 2.5 m - Rouleau', 3600, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('p-03', '10 cm x 2.5 m - Rouleau', 4400, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('u-01', 'Insufflateur manuel de réanimation silicone (Ambu)', 'Urgence & Réanimation', '', 'Réanimateur en silicone médical autoclavable 134°C avec valve de sécurité et réservoir d oxygène.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('u-01', 'Modèle Adulte avec masque, tubulure et réservoir', 28000, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('u-01', 'Modèle Pédiatrique avec masque enfant', 28000, NULL, NULL);

INSERT INTO products (id, name, category, subcategory, description, status, image_url, is_promotion, discount_percentage, original_price)
VALUES ('u-03', 'Collier cervical réglable multi-tailles', 'Urgence & Réanimation', '', 'Immobilisation rachidienne d urgence avec large ouverture trachéale.', 'disponible', NULL, FALSE, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status,
  is_promotion = EXCLUDED.is_promotion,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price;
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('u-03', 'Modèle rigide monobloc adulte 4 crans', 8500, NULL, NULL);
INSERT INTO product_variants (product_id, label, price, original_price, discount_percentage) VALUES ('u-03', 'Modèle pédiatrique', 8500, NULL, NULL);

-- =====================================================================
-- DONNÉES INITIALES : CLIENTS ÉTABLISSEMENTS DE SANTÉ GABONAIS
-- =====================================================================
INSERT INTO clients (id, phone, facility_name, contact_name, facility_type, delivery_address, total_spent, total_orders_count)
VALUES ('cli-001', '+24177001122', 'Clinique El-Rapha Libreville', 'Dr. Mbadinga', 'Clinique', 'Batterie 4, Libreville, Gabon', 845000, 6)
ON CONFLICT (id) DO NOTHING;
INSERT INTO clients (id, phone, facility_name, contact_name, facility_type, delivery_address, total_spent, total_orders_count)
VALUES ('cli-002', '+24166223344', 'Hôpital Militaire d Instruction des Armées (HIAA)', 'Mme Ondeno (Achats & Pharmacie)', 'Hôpital', 'PK9, Libreville, Gabon', 1650000, 9)
ON CONFLICT (id) DO NOTHING;
INSERT INTO clients (id, phone, facility_name, contact_name, facility_type, delivery_address, total_spent, total_orders_count)
VALUES ('cli-003', '+24174556677', 'Polyclinique Chambrier', 'Dr. Chambrier', 'Clinique', 'Montagne Sainte, Libreville, Gabon', 520000, 4)
ON CONFLICT (id) DO NOTHING;
INSERT INTO clients (id, phone, facility_name, contact_name, facility_type, delivery_address, total_spent, total_orders_count)
VALUES ('cli-004', '+24165998877', 'Cabinet Médical & Maternité La Grâce', 'Sage-femme Major Jeannette', 'Cabinet', 'Akébé Plaine, Libreville, Gabon', 290000, 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO clients (id, phone, facility_name, contact_name, facility_type, delivery_address, total_spent, total_orders_count)
VALUES ('cli-005', '+24177889900', 'Laboratoire Biomédical de l Estuaire', 'Biologiste Alain N.', 'Laboratoire', 'Glass, Libreville, Gabon', 480000, 5)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- EXEMPLE DE COMMANDE D'INITIALISATION
-- =====================================================================
INSERT INTO orders (id, reference, client_id, facility_name, contact_name, phone, delivery_address, delivery_mode, payment_method, estimated_total, status, is_paid)
VALUES ('ord-init-01', 'GP-2026-001', 'cli-001', 'Clinique El-Rapha Libreville', 'Dr. Mbadinga', '+24177001122', 'Batterie 4, Libreville, Gabon', 'livraison', 'especes', 147500, 'Livrée', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, product_name, variant_label, price, quantity, total)
VALUES 
  ('ord-init-01', 'Seringue 2 ml 3 pièces avec aiguille', 'Boîte de 100 unités (21G)', 7500, 5, 37500),
  ('ord-init-01', 'Cathéter court intraveineux (Cathlon)', '18G (Vert) - Boîte de 50', 12000, 5, 60000),
  ('ord-init-01', 'Gants d examen en Latex non poudré', 'Taille M - Boîte de 100', 4500, 10, 45000),
  ('ord-init-01', 'Frais de livraison express Libreville', 'Forfait zone urbaine', 5000, 1, 5000)
ON CONFLICT DO NOTHING;

-- FIN DU SCRIPT SCHEMA.SQL GLORYDAY PHARMA
