BEGIN;

-- Every application database request goes through the server API, which uses
-- the Supabase service role. The browser must not read or write these tables
-- directly, even when an older permissive RLS policy is still present.
DO $$
DECLARE
  target_name TEXT;
  target_kind "char";
  policy_name TEXT;
  app_relations TEXT[] := ARRAY[
    'profiles',
    'products',
    'product_variants',
    'orders',
    'order_items',
    'commercial_quotes',
    'direct_messages',
    'notifications',
    'audit_logs',
    'system_settings',
    'packs',
    'quotes',
    'app_users',
    'app_staff_accounts',
    'delivery_location_points',
    'delivery_tracking_sessions',
    'app_sessions',
    'app_auth_rate_limits',
    'app_runtime_settings',
    'activity_logs',
    'push_subscriptions',
    'staff_roles'
  ];
BEGIN
  FOREACH target_name IN ARRAY app_relations LOOP
    SELECT c.relkind
      INTO target_kind
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = target_name;

    IF target_kind IN ('r', 'p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_name);
    END IF;

    IF target_kind IN ('r', 'p', 'v', 'm', 'f') THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', target_name);
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', target_name);

      IF target_kind IN ('r', 'p') THEN
        FOR policy_name IN
          SELECT p.policyname
            FROM pg_policies AS p
           WHERE p.schemaname = 'public'
             AND p.tablename = target_name
        LOOP
          EXECUTE format('DROP POLICY %I ON public.%I', policy_name, target_name);
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  IF to_regclass('public.client_purchase_history_view') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON TABLE public.client_purchase_history_view FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON TABLE public.client_purchase_history_view TO service_role;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_auth_rate_limits (
  key_hash TEXT PRIMARY KEY CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.app_auth_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.app_auth_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.app_auth_is_blocked(p_key_hash TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.app_auth_rate_limits
     WHERE key_hash = p_key_hash
       AND blocked_until > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.app_auth_record_failure(
  p_key_hash TEXT,
  p_max_attempts INTEGER DEFAULT 8,
  p_window_seconds INTEGER DEFAULT 900
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_count INTEGER;
  current_window TIMESTAMPTZ;
  next_count INTEGER;
  next_blocked_until TIMESTAMPTZ;
  safe_max_attempts INTEGER := GREATEST(1, LEAST(COALESCE(p_max_attempts, 8), 100));
  safe_window_seconds INTEGER := GREATEST(60, LEAST(COALESCE(p_window_seconds, 900), 86400));
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key';
  END IF;

  INSERT INTO public.app_auth_rate_limits (key_hash)
  VALUES (p_key_hash)
  ON CONFLICT (key_hash) DO NOTHING;

  SELECT failure_count, window_started_at, blocked_until
    INTO current_count, current_window, next_blocked_until
    FROM public.app_auth_rate_limits
   WHERE key_hash = p_key_hash
   FOR UPDATE;

  IF current_window <= now() - make_interval(secs => safe_window_seconds) THEN
    next_count := 1;
    next_blocked_until := NULL;
    UPDATE public.app_auth_rate_limits
       SET failure_count = next_count,
           window_started_at = now(),
           blocked_until = NULL,
           updated_at = now()
     WHERE key_hash = p_key_hash;
  ELSE
    next_count := current_count + 1;
    IF next_count >= safe_max_attempts THEN
      next_blocked_until := now() + make_interval(secs => safe_window_seconds);
    END IF;
    UPDATE public.app_auth_rate_limits
       SET failure_count = next_count,
           blocked_until = next_blocked_until,
           updated_at = now()
     WHERE key_hash = p_key_hash;
  END IF;

  RETURN next_blocked_until IS NOT NULL AND next_blocked_until > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.app_auth_clear_failures(p_key_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key';
  END IF;
  DELETE FROM public.app_auth_rate_limits WHERE key_hash = p_key_hash;
END;
$$;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMIT;
