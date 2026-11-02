BEGIN;

CREATE TABLE IF NOT EXISTS public.collection_reminders (
  id UUID PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_reference TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL CHECK (channel IN (
    'telephone', 'whatsapp', 'sms', 'email', 'site', 'visite', 'autre'
  )),
  outcome TEXT NOT NULL CHECK (outcome IN (
    'client_joint', 'message_envoye', 'message_prepare', 'sans_reponse',
    'promesse_paiement', 'contestation', 'autre'
  )),
  notes TEXT,
  next_follow_up_date DATE,
  recorded_by_id TEXT NOT NULL,
  recorded_by_name TEXT NOT NULL,
  recorded_by_role TEXT NOT NULL,
  app_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (order_id, id),
  CHECK (length(trim(order_reference)) BETWEEN 1 AND 100),
  CHECK (length(trim(client_name)) BETWEEN 1 AND 200),
  CHECK (notes IS NULL OR length(notes) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_collection_reminders_order_date
  ON public.collection_reminders (order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_reminders_follow_up
  ON public.collection_reminders (next_follow_up_date)
  WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_reminders_client_date
  ON public.collection_reminders (client_id, occurred_at DESC);

ALTER TABLE public.collection_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.collection_reminders FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.collection_reminders TO service_role;

COMMIT;
