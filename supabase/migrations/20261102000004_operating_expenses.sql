BEGIN;

CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id TEXT PRIMARY KEY,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'transport', 'loyer', 'salaires', 'communication', 'fournitures', 'frais_bancaires', 'autre'
  )),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 3 AND 500),
  amount BIGINT NOT NULL CHECK (amount > 0 AND amount <= 1000000000000),
  payment_method TEXT,
  supplier TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'annulee')),
  recorded_by_id TEXT NOT NULL,
  recorded_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by_id TEXT,
  voided_by_name TEXT,
  void_reason TEXT,
  app_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (
    (status = 'active' AND voided_at IS NULL AND void_reason IS NULL)
    OR (status = 'annulee' AND voided_at IS NOT NULL AND length(trim(COALESCE(void_reason, ''))) BETWEEN 3 AND 500)
  )
);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_date
  ON public.operating_expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_category_date
  ON public.operating_expenses (category, expense_date DESC);

ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.operating_expenses FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.operating_expenses TO service_role;

COMMIT;
