-- =====================================================================
-- GLORYDAY PHARMA - MIGRATION 03 : PROVISIONNEMENT ADMIN & CATALOGUE
-- =====================================================================

-- 1. COMPTE ADMINISTRATEUR PRINCIPAL
INSERT INTO public.profiles (
    id,
    phone,
    email,
    facility_name,
    contact_name,
    facility_type,
    delivery_address,
    role,
    total_spent,
    total_orders_count,
    is_inactive_10_days
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '+24101000001',
    'admin@glorydaypharma.ga',
    'Direction Générale Gloryday Pharma',
    'Administrateur Principal',
    'Direction',
    'Libreville, Zone Industrielle d''Oloumi',
    'admin',
    0,
    0,
    false
)
ON CONFLICT (phone) DO UPDATE 
SET role = 'admin',
    contact_name = EXCLUDED.contact_name,
    facility_name = EXCLUDED.facility_name;

-- 2. PARAMÈTRES SYSTÈME PAR DÉFAUT
INSERT INTO public.system_settings (
    id,
    company_name,
    whatsapp_number,
    airtel_money_number,
    moov_money_number,
    free_delivery_threshold
) VALUES (
    'default',
    'Gloryday Pharma Gabon',
    '24165522611',
    '074 00 11 22',
    '066 00 33 44',
    150000
)
ON CONFLICT (id) DO NOTHING;

-- 3. PRODUITS ESSENTIELS DU CATALOGUE
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
