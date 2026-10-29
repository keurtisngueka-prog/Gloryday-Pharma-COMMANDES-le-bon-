BEGIN;

-- Order PDFs are generated in the browser. Remove legacy data URLs from both
-- persisted copies so cold starts do not download hundreds of kilobytes per
-- order from Postgres. The order and its line items remain intact; PDFs can be
-- regenerated from the saved order whenever the user previews or downloads it.
UPDATE public.orders
SET pdf_url = NULL,
    app_data = COALESCE(app_data, '{}'::jsonb) - 'pdfUrl'
WHERE COALESCE(pdf_url, '') ILIKE 'data:application/pdf%;base64,%'
   OR COALESCE(app_data ->> 'pdfUrl', '') ILIKE 'data:application/pdf%;base64,%';

COMMIT;
