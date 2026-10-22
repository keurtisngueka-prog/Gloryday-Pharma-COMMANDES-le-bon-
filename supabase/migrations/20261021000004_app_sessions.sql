-- Persistent login sessions for Vercel's stateless function runtime.
-- Only a SHA-256 hash of the random browser token is stored.
CREATE TABLE IF NOT EXISTS public.app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_sessions_expires_at_idx
  ON public.app_sessions (expires_at);

CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx
  ON public.app_sessions (user_id);

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_sessions TO service_role;
