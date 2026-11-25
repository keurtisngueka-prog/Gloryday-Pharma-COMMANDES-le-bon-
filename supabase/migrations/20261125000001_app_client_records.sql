-- Prepare a relational client directory while preserving the existing JSONB source.
-- The application still reads and writes app_runtime_settings.client_directory;
-- switching its persistence layer is a separate application change.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_client_records (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL DEFAULT '',
  invoice_name TEXT,
  facility_type TEXT,
  facility_type_other TEXT,
  contact_name TEXT NOT NULL DEFAULT '',
  director_name TEXT,
  company_phone TEXT NOT NULL DEFAULT '',
  secondary_phone TEXT,
  city TEXT,
  delivery_address TEXT,
  delivery_instructions TEXT,
  linked_user_id TEXT,
  assigned_to_commercial_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_client_records_facility_name_idx
  ON public.app_client_records (LOWER(facility_name));

CREATE INDEX IF NOT EXISTS app_client_records_linked_user_idx
  ON public.app_client_records (linked_user_id)
  WHERE linked_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_client_records_assigned_commercial_idx
  ON public.app_client_records (assigned_to_commercial_id)
  WHERE assigned_to_commercial_id IS NOT NULL;

ALTER TABLE public.app_client_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_client_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_client_records TO service_role;

INSERT INTO public.app_client_records (
  id,
  facility_name,
  invoice_name,
  facility_type,
  facility_type_other,
  contact_name,
  director_name,
  company_phone,
  secondary_phone,
  city,
  delivery_address,
  delivery_instructions,
  linked_user_id,
  assigned_to_commercial_id,
  created_at,
  updated_at
)
SELECT
  client.value->>'id',
  COALESCE(client.value->>'facilityName', ''),
  NULLIF(client.value->>'invoiceName', ''),
  NULLIF(client.value->>'facilityType', ''),
  NULLIF(client.value->>'facilityTypeOther', ''),
  COALESCE(client.value->>'contactName', ''),
  NULLIF(client.value->>'directorName', ''),
  COALESCE(client.value->>'companyPhone', ''),
  NULLIF(client.value->>'secondaryPhone', ''),
  NULLIF(client.value->>'city', ''),
  NULLIF(client.value->>'deliveryAddress', ''),
  NULLIF(client.value->>'deliveryInstructions', ''),
  NULLIF(client.value->>'linkedUserId', ''),
  NULLIF(client.value->>'assignedToCommercialId', ''),
  COALESCE(NULLIF(client.value->>'createdAt', '')::TIMESTAMPTZ, NOW()),
  COALESCE(NULLIF(client.value->>'updatedAt', '')::TIMESTAMPTZ, NOW())
FROM public.app_runtime_settings AS settings
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(settings.setting_value) = 'array' THEN settings.setting_value
    ELSE '[]'::JSONB
  END
) AS client(value)
WHERE settings.setting_key = 'client_directory'
  AND jsonb_typeof(client.value) = 'object'
  AND NULLIF(client.value->>'id', '') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;
