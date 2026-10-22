-- Autorise les comptes d'administration opérationnelle sans accès aux réglages système.
ALTER TABLE public.app_staff_accounts
  DROP CONSTRAINT IF EXISTS app_staff_accounts_role_check;

ALTER TABLE public.app_staff_accounts
  ADD CONSTRAINT app_staff_accounts_role_check
  CHECK (role IN ('Admin simple', 'Commercial', 'Gestionnaire Catalogue', 'Logistique'));
