-- =====================================================================
-- GLORYDAY PHARMA - MIGRATION SUPABASE 2026-10-23
-- 1. Table `public.activity_logs` avec les colonnes :
--    id, user_id, action_type, entity_type, entity_id, details (JSONB), created_at
--    + Politiques RLS autorisant uniquement les administrateurs authentifiés à lire ces logs
-- 2. Vue SQL & Fonction RPC de l'Historique Complet des Achats d'un Client
-- =====================================================================

-- 1. TABLE ACTIVITY_LOGS (Actions critiques des collaborateurs en temps réel)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Colonnes de compatibilité applicative temps réel
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

-- Mise à niveau idempotente si la table existait déjà sous un ancien format
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS "actionType" TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS app_data JSONB;

-- Conversion sécurisée de `details` en JSONB si elle avait été créée en TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activity_logs'
      AND column_name = 'details'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE public.activity_logs
      ALTER COLUMN details TYPE JSONB
      USING CASE
        WHEN details IS NULL OR TRIM(details) = '' THEN '{}'::jsonb
        WHEN LEFT(TRIM(details), 1) = '{' THEN details::jsonb
        ELSE jsonb_build_object('message', details)
      END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_snake ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type_snake ON public.activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_snake ON public.activity_logs (entity_type, entity_id);

-- Activation de Row-Level Security (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.activity_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.activity_logs TO authenticated;
GRANT ALL ON TABLE public.activity_logs TO service_role;

-- Politique RLS : Seuls les administrateurs authentifiés peuvent lire les logs (SELECT)
DROP POLICY IF EXISTS "activity_logs_admin_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_admin_select_policy"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')
      IN ('Super-Admin', 'Admin simple', 'admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('Super-Admin', 'Admin simple')
    )
    OR EXISTS (
      SELECT 1 FROM public.app_staff_accounts s
      WHERE s.id = auth.uid()::text
        AND s.role IN ('Super-Admin', 'Admin simple')
        AND s.is_active = TRUE
    )
  );

-- Politique RLS : Insertion réservée aux administrateurs et collaborateurs authentifiés
DROP POLICY IF EXISTS "activity_logs_admin_insert_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_admin_insert_policy"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')
      IN ('Super-Admin', 'Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique', 'admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('Super-Admin', 'Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique')
    )
  );

-- Activation optionnelle du flux Realtime Supabase sur activity_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. VUE SQL : HISTORIQUE COMPLET DES ACHATS PAR CLIENT (POUR L'ADMINISTRATEUR)
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
    THEN ROUND(COALESCE(SUM(o.estimated_total) FILTER (WHERE o.status <> 'Annulée'), 0)::numeric / (COUNT(o.id) FILTER (WHERE o.status <> 'Annulée')))
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

GRANT SELECT ON public.client_purchase_history_view TO service_role;

-- 3. FONCTION RPC SUPABASE : OBTENIR L'HISTORIQUE DÉTAILLÉ DES ACHATS D'UN CLIENT
CREATE OR REPLACE FUNCTION public.app_get_client_purchase_history(p_client_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'phone', c.phone,
    'facilityName', c.facility_name,
    'facilityType', c.facility_type,
    'contactName', c.contact_name,
    'deliveryAddress', c.delivery_address,
    'totalOrdersCount', c.total_orders_count,
    'totalSpent', c.total_spent,
    'paidAmount', c.paid_amount,
    'unpaidAmount', c.unpaid_amount,
    'averageOrderValue', c.average_order_value,
    'firstOrderDate', c.first_order_date,
    'lastOrderDate', c.last_order_date,
    'ordersHistory', c.orders_history
  )
  INTO v_result
  FROM public.client_purchase_history_view c
  WHERE REGEXP_REPLACE(LOWER(c.phone), '[^0-9+]', '', 'g') = REGEXP_REPLACE(LOWER(p_client_phone), '[^0-9+]', '', 'g')
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.app_get_client_purchase_history(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_get_client_purchase_history(TEXT) TO service_role;
