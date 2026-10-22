-- Comptes employés Gloryday Pharma : mot de passe haché côté serveur uniquement.
CREATE TABLE IF NOT EXISTS public.app_staff_accounts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Commercial', 'Gestionnaire Catalogue', 'Logistique')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_staff_accounts_identifier_lower_key
  ON public.app_staff_accounts (LOWER(identifier));

ALTER TABLE public.app_staff_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_staff_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_staff_accounts TO service_role;
