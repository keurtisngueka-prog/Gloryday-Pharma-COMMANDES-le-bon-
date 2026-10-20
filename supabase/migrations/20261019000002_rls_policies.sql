-- =====================================================================
-- GLORYDAY PHARMA - MIGRATION 02 : ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Lecture publique des produits" ON public.products;
CREATE POLICY "Lecture publique des produits" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification produits par admin" ON public.products;
CREATE POLICY "Modification produits par admin" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Lecture publique des variantes" ON public.product_variants;
CREATE POLICY "Lecture publique des variantes" ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification variantes par admin" ON public.product_variants;
CREATE POLICY "Modification variantes par admin" ON public.product_variants FOR ALL USING (true);

DROP POLICY IF EXISTS "Lecture profils" ON public.profiles;
CREATE POLICY "Lecture profils" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ecriture profils" ON public.profiles;
CREATE POLICY "Ecriture profils" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces commandes" ON public.orders;
CREATE POLICY "Acces commandes" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces lignes commande" ON public.order_items;
CREATE POLICY "Acces lignes commande" ON public.order_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces devis" ON public.commercial_quotes;
CREATE POLICY "Acces devis" ON public.commercial_quotes FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces messages" ON public.direct_messages;
CREATE POLICY "Acces messages" ON public.direct_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces notifications" ON public.notifications;
CREATE POLICY "Acces notifications" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces audit_logs" ON public.audit_logs;
CREATE POLICY "Acces audit_logs" ON public.audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Acces system_settings" ON public.system_settings;
CREATE POLICY "Acces system_settings" ON public.system_settings FOR ALL USING (true);
