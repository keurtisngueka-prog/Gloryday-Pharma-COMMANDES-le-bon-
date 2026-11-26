BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN NOT NULL DEFAULT FALSE;

ALTER FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  RENAME TO app_create_order_atomic_pre_demo;

CREATE FUNCTION public.app_create_order_atomic(
  p_order JSONB,
  p_items JSONB,
  p_stock_requests JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_demo BOOLEAN := FALSE;
  v_order JSONB := COALESCE(p_order, '{}'::JSONB);
  v_result JSONB;
  v_saved_order JSONB;
BEGIN
  IF NULLIF(p_order->>'client_id', '') IS NOT NULL THEN
    SELECT COALESCE(is_demo_account, FALSE)
      INTO v_is_demo
    FROM public.profiles
    WHERE id = (p_order->>'client_id')::UUID
    FOR SHARE;
  END IF;

  IF v_is_demo THEN
    v_order := jsonb_set(
      v_order,
      '{app_data}',
      COALESCE(v_order->'app_data', '{}'::JSONB) || jsonb_build_object('isDemoOrder', TRUE),
      TRUE
    );

    -- Passing no stock requests keeps the database reservation and FEFO lot
    -- deduction path empty, even if the calling server is running old code.
    v_result := public.app_create_order_atomic_pre_demo(v_order, p_items, '[]'::JSONB);

    UPDATE public.orders
      SET app_data = jsonb_set(
        jsonb_set(COALESCE(app_data, '{}'::JSONB), '{isDemoOrder}', 'true'::JSONB, TRUE),
        '{stockReserved}',
        'false'::JSONB,
        TRUE
      )
      WHERE reference = v_result->'order'->>'reference'
      RETURNING app_data INTO v_saved_order;

    IF FOUND THEN
      v_result := jsonb_set(v_result, '{order}', v_saved_order, TRUE);
    ELSE
      v_result := jsonb_set(v_result, '{order,isDemoOrder}', 'true'::JSONB, TRUE);
      v_result := jsonb_set(v_result, '{order,stockReserved}', 'false'::JSONB, TRUE);
    END IF;

    RETURN v_result;
  END IF;

  RETURN public.app_create_order_atomic_pre_demo(
    p_order,
    p_items,
    COALESCE(p_stock_requests, '[]'::JSONB)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  TO service_role;

CREATE OR REPLACE FUNCTION public.app_record_checkout_stock_movements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- A demo checkout must never create stock movement ledger entries.
  IF v_order_data->>'isDemoOrder' = 'true' THEN
    RETURN NULL;
  END IF;

  IF NULLIF(v_reference, '') IS NULL THEN
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
$function$;

COMMIT;
