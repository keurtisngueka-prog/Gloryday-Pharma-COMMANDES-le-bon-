-- =====================================================================
-- GLORYDAY PHARMA - 02_SECURITE_RLS.SQL
-- Politiques de Sécurité au niveau des lignes (Row Level Security - RLS)
-- Description : Activation RLS et politiques d'accès pour chaque table
-- =====================================================================

-- 1. ACTIVATION RLS SUR TOUTES LES TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. FONCTION UTILITAIRE : OBTENIR LE RÔLE DE L'UTILISATEUR ACTUEL
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid();
    RETURN COALESCE(user_role, 'anon');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLITIQUES SUR LES PRODUITS & VARIANTES (Lecture publique, Modification Staff)
DROP POLICY IF EXISTS "Lecture publique des produits" ON public.products;
CREATE POLICY "Lecture publique des produits" 
    ON public.products FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Modification produits par admin" ON public.products;
CREATE POLICY "Modification produits par admin" 
    ON public.products FOR ALL 
    TO authenticated 
    USING (public.get_current_user_role() IN ('admin', 'commercial'));

DROP POLICY IF EXISTS "Lecture publique des variantes" ON public.product_variants;
CREATE POLICY "Lecture publique des variantes" 
    ON public.product_variants FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Modification variantes par admin" ON public.product_variants;
CREATE POLICY "Modification variantes par admin" 
    ON public.product_variants FOR ALL 
    TO authenticated 
    USING (public.get_current_user_role() IN ('admin', 'commercial'));

-- 4. POLITIQUES SUR LES PROFILS
DROP POLICY IF EXISTS "Lecture profil propre ou par staff" ON public.profiles;
CREATE POLICY "Lecture profil propre ou par staff" 
    ON public.profiles FOR SELECT 
    USING (
        auth_user_id = auth.uid() 
        OR public.get_current_user_role() IN ('admin', 'commercial')
    );

DROP POLICY IF EXISTS "Mise à jour profil personnel" ON public.profiles;
CREATE POLICY "Mise à jour profil personnel" 
    ON public.profiles FOR UPDATE 
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Création profil lors de l'inscription" ON public.profiles;
CREATE POLICY "Création profil lors de l'inscription" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth_user_id = auth.uid() OR auth.uid() IS NULL);

-- 5. POLITIQUES SUR LES COMMANDES
-- Permettre la création par les invités et les utilisateurs connectés
DROP POLICY IF EXISTS "Création de commande autorisée" ON public.orders;
CREATE POLICY "Création de commande autorisée" 
    ON public.orders FOR INSERT 
    WITH CHECK (true);

-- Lecture des commandes (client concerné ou équipe Gloryday)
DROP POLICY IF EXISTS "Lecture des commandes autorisée" ON public.orders;
CREATE POLICY "Lecture des commandes autorisée" 
    ON public.orders FOR SELECT 
    USING (
        public.get_current_user_role() IN ('admin', 'commercial', 'livreur')
        OR client_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
        OR auth.uid() IS NULL -- Permet aux clients invités de récupérer via leur numéro de téléphone
    );

-- Mise à jour des commandes (admin, commercial, ou coursier pour le statut de livraison)
DROP POLICY IF EXISTS "Mise à jour commandes par staff" ON public.orders;
CREATE POLICY "Mise à jour commandes par staff" 
    ON public.orders FOR UPDATE 
    USING (public.get_current_user_role() IN ('admin', 'commercial', 'livreur'));

-- Lignes de commande (order_items)
DROP POLICY IF EXISTS "Lecture lignes commande" ON public.order_items;
CREATE POLICY "Lecture lignes commande" 
    ON public.order_items FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Insertion lignes commande" ON public.order_items;
CREATE POLICY "Insertion lignes commande" 
    ON public.order_items FOR INSERT 
    WITH CHECK (true);

-- 6. POLITIQUES SUR LES DEVIS COMMERCIAUX
DROP POLICY IF EXISTS "Accès devis par client ou commercial" ON public.commercial_quotes;
CREATE POLICY "Accès devis par client ou commercial" 
    ON public.commercial_quotes FOR ALL 
    USING (
        public.get_current_user_role() IN ('admin', 'commercial')
        OR client_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

-- 7. POLITIQUES SUR LES MESSAGES DIRECTS & NOTIFICATIONS
DROP POLICY IF EXISTS "Lecture messages personnels" ON public.direct_messages;
CREATE POLICY "Lecture messages personnels" 
    ON public.direct_messages FOR SELECT 
    USING (
        sender_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
        OR receiver_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
        OR public.get_current_user_role() IN ('admin', 'commercial')
    );

DROP POLICY IF EXISTS "Envoi message" ON public.direct_messages;
CREATE POLICY "Envoi message" 
    ON public.direct_messages FOR INSERT 
    WITH CHECK (true);
