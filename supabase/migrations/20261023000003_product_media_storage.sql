BEGIN;

-- Product photos and technical notices are uploaded directly from the browser
-- to Supabase Storage using short-lived signed URLs issued by the API.
-- Public reads are intentional so catalogue images and PDF notices can be
-- displayed to customers without exposing the service-role key.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  TRUE,
  7340032,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
