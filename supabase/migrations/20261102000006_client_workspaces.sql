-- Keep client carts and saved order drafts in the authenticated server workspace.
-- The application server uses the Supabase service role; direct browser access is denied.
CREATE TABLE IF NOT EXISTS public.app_client_workspaces (
  app_user_id TEXT PRIMARY KEY REFERENCES public.app_users(app_user_id) ON DELETE CASCADE,
  cart_data JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cart_data) = 'array'),
  drafts_data JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(drafts_data) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_client_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_client_workspaces FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_client_workspaces TO service_role;
