-- =====================================================================
-- GLORYDAY PHARMA - 03_CREER_ADMIN.SQL
-- Script de création et attribution des comptes Administrateurs et Commerciaux
-- Description : Provisionne les rôles système pour Gloryday Pharma
-- =====================================================================

-- 1. INSCRIPTION DE L'ADMINISTRATEUR PRINCIPAL DANS LES PROFILS
-- Note : Si vous utilisez Supabase Auth, l'utilisateur s'inscrit avec l'email 'admin@glorydaypharma.ga'
-- ou connectez-vous avec le numéro de téléphone +24101000001 / code PIN 1234.
INSERT INTO public.profiles (
    id,
    phone,
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

-- 2. CRÉATION D'UN COMPTE COMMERCIAL DE DÉMONSTRATION
INSERT INTO public.profiles (
    id,
    phone,
    facility_name,
    contact_name,
    facility_type,
    delivery_address,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '+24177889900',
    'Gloryday Pharma - Équipe Commerciale',
    'Serge Ondo (Responsable Commercial)',
    'Équipe Commerciale',
    'Libreville, Oloumi Dépôt Central',
    'commercial'
)
ON CONFLICT (phone) DO UPDATE 
SET role = 'commercial';

-- 3. CRÉATION DU COMPTE LIVREUR / COURSIER DÉDIÉ
INSERT INTO public.profiles (
    id,
    phone,
    facility_name,
    contact_name,
    facility_type,
    delivery_address,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000003'::uuid,
    '+24177003004',
    'Logistique Médicale Express',
    'Alexandre Moundounga (Livreur Médical)',
    'Logistique & Livraison',
    'Grand Libreville',
    'livreur'
)
ON CONFLICT (phone) DO UPDATE 
SET role = 'livreur';

-- 4. FONCTION POUR PROCLAMER UN UTILISATEUR ADMIN VIA SON EMAIL OU NUMÉRO
CREATE OR REPLACE FUNCTION public.promouvoir_en_admin(target_phone VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE phone = target_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
