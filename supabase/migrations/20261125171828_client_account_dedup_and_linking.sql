BEGIN;

-- Prevent duplicate login identifiers when punctuation, spacing, or email case differs.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_login_normalized_unique
  ON public.profiles ((regexp_replace(lower(phone), '[[:space:]().-]', '', 'g')))
  WHERE NULLIF(BTRIM(phone), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_login_normalized_unique
  ON public.profiles ((lower(BTRIM(email))))
  WHERE NULLIF(BTRIM(email), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_phone_login_normalized_unique
  ON public.app_users ((regexp_replace(lower(user_data->>'phone'), '[[:space:]().-]', '', 'g')))
  WHERE NULLIF(BTRIM(user_data->>'phone'), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_login_normalized_unique
  ON public.app_users ((lower(BTRIM(user_data->>'email'))))
  WHERE NULLIF(BTRIM(user_data->>'email'), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_client_records_company_phone_unique
  ON public.app_client_records ((regexp_replace(company_phone, '[^0-9]', '', 'g')))
  WHERE NULLIF(regexp_replace(company_phone, '[^0-9]', '', 'g'), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_client_records_linked_user_unique
  ON public.app_client_records (linked_user_id)
  WHERE linked_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.app_register_user_with_client_record(
  p_app_user_id TEXT,
  p_profile JSONB,
  p_password_hash TEXT,
  p_user_data JSONB,
  p_client_record_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_profile_id UUID;
  current_linked_user_id TEXT;
BEGIN
  SELECT linked_user_id
    INTO current_linked_user_id
    FROM public.app_client_records
    WHERE id = p_client_record_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client record not found' USING ERRCODE = 'P0002';
  END IF;

  IF current_linked_user_id IS NOT NULL AND current_linked_user_id <> p_app_user_id THEN
    RAISE EXCEPTION 'Client record is already linked to another account'
      USING ERRCODE = '23505', CONSTRAINT = 'app_client_records_linked_user_unique';
  END IF;

  saved_profile_id := public.app_save_user(
    p_app_user_id,
    p_profile,
    p_password_hash,
    p_user_data
  );

  UPDATE public.app_client_records
    SET linked_user_id = p_app_user_id,
        updated_at = NOW()
    WHERE id = p_client_record_id;

  RETURN saved_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.app_register_user_with_client_record(TEXT, JSONB, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_register_user_with_client_record(TEXT, JSONB, TEXT, JSONB, TEXT)
  TO service_role;

COMMIT;
