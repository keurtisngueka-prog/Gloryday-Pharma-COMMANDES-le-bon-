ALTER TABLE public.app_staff_accounts
  ADD COLUMN IF NOT EXISTS permissions JSONB,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

UPDATE public.app_staff_accounts
SET permissions = CASE role
  WHEN 'Admin simple' THEN '["orders_view","orders_manage","clients_manage","logistics_manage","stats_view"]'::jsonb
  WHEN 'Commercial' THEN '["orders_view","orders_manage","quotes_manage","clients_manage"]'::jsonb
  WHEN 'Gestionnaire Catalogue' THEN '["catalog_stock","orders_view"]'::jsonb
  WHEN 'Logistique' THEN '["orders_view","logistics_manage"]'::jsonb
  ELSE '[]'::jsonb
END
WHERE permissions IS NULL;

CREATE TABLE IF NOT EXISTS public.app_runtime_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_runtime_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_runtime_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_runtime_settings TO service_role;
