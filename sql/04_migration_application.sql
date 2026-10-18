-- =====================================================================
-- GLORYDAY PHARMA - 04_MIGRATION_APPLICATION.SQL
-- Migration des données initiales du catalogue médical et des variantes
-- =====================================================================

-- 1. INSERTION DES PRODUITS ESSENTIELS
INSERT INTO public.products (id, name, category, subcategory, status, description, is_promotion, discount_percentage, original_price) VALUES
('c-ser-01', 'Seringue 2 ml 3 pièces avec aiguille', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Seringue stérile 3 pièces à usage unique avec aiguille 21G ou 23G, emballage blister individuel.', true, 20, 9375),
('c-ser-02', 'Seringue 5 ml 3 pièces avec aiguille', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Seringue stérile 5 ml 3 pièces avec aiguille sertie ou luer-slip, bague de sécurité.', false, 0, 0),
('c-ser-03', 'Seringue 10 ml 3 pièces', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Seringue stérile 10 ml haute transparence, graduation nette et durable.', false, 0, 0),
('c-ser-04', 'Seringue 20 ml Luer Lock', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Seringue stérile 20 ml embout luer lock pour injection ou prélèvement sécurisé.', false, 0, 0),
('c-ser-05', 'Seringue 50 ml gavage / irrigation', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Seringue grand volume pour alimentation entérale, lavage vésical ou pansements.', false, 0, 0),
('c-per-01', 'Perfuseur avec prise d''air et filtre', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Dispositif de perfusion par gravité avec chambre compte-gouttes graduée et régulateur de débit.', true, 20, 16250),
('c-cat-01', 'Cathéter intraveineux avec ailette et site d''injection', 'Consommables médicaux', 'Seringues et perfusion', 'disponible', 'Cathéter court stérile radio-opaque en téflon avec valve anti-reflux et mandrin ergonomique.', false, 0, 0),
('c-gan-01', 'Gants d''examen en latex non poudrés', 'Consommables médicaux', 'Gants et protection', 'disponible', 'Gants de protection médicale ambidextres haute sensibilité tactile et grande résistance.', true, 20, 7500),
('c-gan-02', 'Gants d''examen en nitrile bleu non poudrés', 'Consommables médicaux', 'Gants et protection', 'disponible', 'Gants nitrile sans latex, hypoallergéniques, haute résistance chimique et biologique.', false, 0, 0),
('c-mas-01', 'Masques chirurgicaux 3 plis Type II (boîte de 50)', 'Consommables médicaux', 'Gants et protection', 'disponible', 'Masques haute filtration bactérienne (>98%), barrette nasale ajustable et élastiques doux.', false, 0, 0),
('d-ten-01', 'Tensiomètre électronique de bras professionnel', 'Dispositifs médicaux', 'Diagnostic et mesure', 'disponible', 'Tensiomètre oscillométrique automatique médical grand écran rétroéclairé.', false, 0, 0),
('d-oxy-01', 'Oxymètre de pouls au doigt professionnel', 'Dispositifs médicaux', 'Diagnostic et mesure', 'disponible', 'Saturomètre SpO2 précis et instantané avec courbe pléthysmographique.', false, 0, 0)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    is_promotion = EXCLUDED.is_promotion;

-- 2. INSERTION DES VARIANTES & PRIX
INSERT INTO public.product_variants (product_id, label, price, original_price, discount_percentage) VALUES
('c-ser-01', 'Boîte de 100 unités (21G)', 7500, 9375, 20),
('c-ser-01', 'Carton de 20 boîtes (2000 unités)', 140000, 175000, 20),
('c-ser-02', 'Boîte de 100 unités (21G)', 7500, NULL, NULL),
('c-ser-02', 'Carton de 18 boîtes (1800 unités)', 128000, NULL, NULL),
('c-ser-03', 'Boîte de 100 unités', 9500, NULL, NULL),
('c-ser-03', 'Carton de 12 boîtes', 108000, NULL, NULL),
('c-ser-04', 'Boîte de 50 unités', 8500, NULL, NULL),
('c-ser-05', 'Boîte de 25 unités (embout conique)', 11000, NULL, NULL),
('c-per-01', 'Paquet de 25 unités stériles', 13000, 16250, 20),
('c-per-01', 'Carton de 20 paquets (500 unités)', 240000, 300000, 20),
('c-cat-01', 'Boîte de 50 unités (20G Rose)', 17500, NULL, NULL),
('c-cat-01', 'Boîte de 50 unités (22G Bleu)', 17500, NULL, NULL),
('c-gan-01', 'Boîte de 100 gants (Taille M)', 6000, 7500, 20),
('c-gan-01', 'Carton de 10 boîtes (1000 gants)', 56000, 70000, 20),
('c-gan-02', 'Boîte de 100 gants (Taille M)', 7500, NULL, NULL),
('c-gan-02', 'Carton de 10 boîtes (1000 gants)', 70000, NULL, NULL),
('c-mas-01', 'Boîte de 50 masques', 3500, NULL, NULL),
('c-mas-01', 'Carton de 40 boîtes (2000 masques)', 120000, NULL, NULL),
('d-ten-01', 'Appareil avec brassard adulte (22-42 cm)', 38000, NULL, NULL),
('d-oxy-01', 'Unité avec housse et piles incluses', 18500, NULL, NULL);

-- 3. VALIDATION DE L'INTÉGRITÉ
SELECT 
    (SELECT COUNT(*) FROM public.products) as total_products,
    (SELECT COUNT(*) FROM public.product_variants) as total_variants;
