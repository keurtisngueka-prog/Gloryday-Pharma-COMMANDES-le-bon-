-- =====================================================================
-- GLORYDAY PHARMA - 03_CREER_ADMIN.SQL
-- Script de création et attribution des comptes Administrateurs et Commerciaux
-- Description : Provisionne les rôles système pour Gloryday Pharma
-- =====================================================================

-- Les comptes utilisateurs sont provisionnés par le flux d'authentification de l'application.
-- Aucun compte, numéro de téléphone ou code PIN par défaut n'est créé par ce script.

-- 4. FONCTION POUR PROCLAMER UN UTILISATEUR ADMIN VIA SON EMAIL OU NUMÉRO
CREATE OR REPLACE FUNCTION public.promouvoir_en_admin(target_phone VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE phone = target_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
