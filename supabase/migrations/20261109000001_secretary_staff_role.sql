-- Add the Secretary role and attribute staff-created order stock movements.
-- No existing staff accounts or stock quantities are changed by this migration.
ALTER TABLE public.app_staff_accounts
  DROP CONSTRAINT IF EXISTS app_staff_accounts_role_check;

ALTER TABLE public.app_staff_accounts
  ADD CONSTRAINT app_staff_accounts_role_check
  CHECK (role IN (
    'Admin simple',
    'Commercial',
    'Gestionnaire Catalogue',
    'Logistique',
    'Secrétaire'
  ));

CREATE OR REPLACE FUNCTION public.app_record_checkout_stock_movements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id TEXT := NULLIF(current_setting('app.stock_ledger_order_id', TRUE), '');
  v_reference TEXT;
  v_order_data JSONB;
  v_product_data JSONB;
  v_product_name TEXT;
  v_current NUMERIC;
  v_line RECORD;
BEGIN
  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT reference, COALESCE(app_data, '{}'::JSONB)
    INTO v_reference, v_order_data
  FROM public.orders
  WHERE id = v_order_id;

  IF NOT FOUND OR NULLIF(v_reference, '') IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_line IN
    SELECT product_id::TEXT AS product_id,
           max(product_name)::TEXT AS product_name,
           sum(quantity)::INTEGER AS quantity
    FROM new_order_items
    WHERE order_id = v_order_id
      AND product_id IS NOT NULL
      AND quantity > 0
      AND COALESCE(is_quote, FALSE) = FALSE
    GROUP BY product_id
    ORDER BY product_id::TEXT
  LOOP
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_order_data->'items', '[]'::JSONB)) AS order_line(item)
      WHERE order_line.item->>'productId' = v_line.product_id
        AND order_line.item->>'isDeferredStock' = 'true'
    ) THEN
      CONTINUE;
    END IF;

    SELECT name, COALESCE(app_data, '{}'::JSONB)
      INTO v_product_name, v_product_data
    FROM public.products
    WHERE id = v_line.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF COALESCE(v_product_data->>'quantityAvailable', '') ~ '^-?[0-9]+$' THEN
      v_current := (v_product_data->>'quantityAvailable')::NUMERIC;
    ELSIF COALESCE(v_product_data->>'stockQuantity', '') ~ '^-?[0-9]+$' THEN
      v_current := (v_product_data->>'stockQuantity')::NUMERIC;
    ELSE
      v_current := 0;
    END IF;

    IF v_current < 0 OR v_current > 2147483647
       OR v_current <> trunc(v_current)
       OR v_current + v_line.quantity > 2147483647 THEN
      RAISE EXCEPTION 'Quantité de stock invalide pour le mouvement de commande.'
        USING ERRCODE = '22003';
    END IF;

    INSERT INTO public.stock_movements (
      id, product_id, product_name, movement_type, quantity,
      previous_quantity, new_quantity, reason, reference,
      performed_by_id, performed_by, performed_by_role
    ) VALUES (
      gen_random_uuid(), v_line.product_id, COALESCE(v_product_name, v_line.product_name),
      'sortie_commande', v_line.quantity,
      (v_current + v_line.quantity)::INTEGER, v_current::INTEGER,
      format('Réservation liée à la commande %s', v_reference), v_reference,
      COALESCE(NULLIF(v_order_data->>'createdByUserId', ''), NULLIF(v_order_data->>'userId', ''), 'client'),
      COALESCE(NULLIF(v_order_data->>'createdByName', ''), NULLIF(v_order_data->'customer'->>'facilityName', ''), NULLIF(v_order_data->'customer'->>'contactName', ''), 'Client'),
      COALESCE(NULLIF(v_order_data->>'createdByRole', ''), 'client')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.app_record_checkout_stock_movements()
  FROM PUBLIC, anon, authenticated, service_role;
