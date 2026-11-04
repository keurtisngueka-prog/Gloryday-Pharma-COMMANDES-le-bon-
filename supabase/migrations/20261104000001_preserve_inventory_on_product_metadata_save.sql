BEGIN;

-- Product metadata is saved through a general upsert. On Vercel, separate
-- serverless instances can hold different snapshots of the catalog. Preserve
-- inventory and purchase costs from the locked current row unless the caller
-- explicitly reports an intentional change from its hydrated baseline. Cost
-- values stay excluded from margin reports until an authorized user confirms them.
CREATE OR REPLACE FUNCTION public.app_save_product(p_product JSONB, p_variants JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product_id_value TEXT;
  allow_inventory_update BOOLEAN := COALESCE((p_product->>'__allow_inventory_update')::BOOLEAN, FALSE);
  allow_status_update BOOLEAN := COALESCE((p_product->>'__allow_status_update')::BOOLEAN, FALSE);
  allow_purchase_price_update BOOLEAN := COALESCE((p_product->>'__allow_purchase_price_update')::BOOLEAN, FALSE);
BEGIN
  INSERT INTO public.products AS stored_product (
    id, name, category, subcategory, description, status, image_url,
    is_promotion, discount_percentage, original_price, purchase_price,
    alert_threshold, app_data, created_at, updated_at
  )
  SELECT
    row_data.id, row_data.name, row_data.category, row_data.subcategory,
    row_data.description, row_data.status, row_data.image_url,
    row_data.is_promotion, row_data.discount_percentage, row_data.original_price,
    row_data.purchase_price, row_data.alert_threshold,
    COALESCE(row_data.app_data, '{}'::JSONB),
    COALESCE(row_data.created_at, NOW()), COALESCE(row_data.updated_at, NOW())
  FROM jsonb_to_record(p_product) AS row_data(
    id TEXT, name TEXT, category TEXT, subcategory TEXT, description TEXT,
    status TEXT, image_url TEXT, is_promotion BOOLEAN,
    discount_percentage INTEGER, original_price BIGINT, purchase_price BIGINT,
    alert_threshold INTEGER, app_data JSONB, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    description = EXCLUDED.description,
    status = CASE WHEN allow_status_update THEN EXCLUDED.status ELSE stored_product.status END,
    image_url = EXCLUDED.image_url,
    is_promotion = EXCLUDED.is_promotion,
    discount_percentage = EXCLUDED.discount_percentage,
    original_price = EXCLUDED.original_price,
    purchase_price = CASE WHEN allow_purchase_price_update THEN EXCLUDED.purchase_price ELSE stored_product.purchase_price END,
    alert_threshold = EXCLUDED.alert_threshold,
    app_data = EXCLUDED.app_data
      || CASE
        WHEN allow_inventory_update THEN '{}'::JSONB
        ELSE jsonb_strip_nulls(jsonb_build_object(
        'quantityAvailable', stored_product.app_data->'quantityAvailable',
        'stockQuantity', stored_product.app_data->'stockQuantity',
        'hasPhysicalStock', stored_product.app_data->'hasPhysicalStock'
      )) END
      || CASE
        WHEN allow_purchase_price_update THEN '{}'::JSONB
        ELSE jsonb_strip_nulls(jsonb_build_object(
          'purchasePriceVerified', stored_product.app_data->'purchasePriceVerified'
        ))
      END,
    updated_at = NOW();

  product_id_value := p_product->>'id';
  PERFORM public.app_replace_product_variants(product_id_value, p_variants);
END;
$$;

REVOKE ALL ON FUNCTION public.app_save_product(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_product(JSONB, JSONB) TO service_role;

COMMIT;
