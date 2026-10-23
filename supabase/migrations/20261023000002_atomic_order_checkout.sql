BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.orders
SET idempotency_key = NULLIF(app_data->>'idempotencyKey', '')
WHERE idempotency_key IS NULL
  AND NULLIF(app_data->>'idempotencyKey', '') IS NOT NULL;

-- Keep all historical orders. If an older release already created duplicates,
-- retain the first key and leave the others available for normal order history.
WITH ranked_keys AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY client_id, idempotency_key
           ORDER BY created_at, id
         ) AS key_rank
  FROM public.orders
  WHERE client_id IS NOT NULL
    AND idempotency_key IS NOT NULL
)
UPDATE public.orders AS orders
SET idempotency_key = NULL,
    app_data = COALESCE(orders.app_data, '{}'::JSONB) - 'idempotencyKey'
FROM ranked_keys
WHERE orders.id = ranked_keys.id
  AND ranked_keys.key_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_idempotency_key
  ON public.orders (client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.gloryday_order_reference_seq;

SELECT setval(
  'public.gloryday_order_reference_seq',
  COALESCE(MAX(split_part(reference, '-', 3)::BIGINT), 0) + 1,
  false
)
FROM public.orders
WHERE reference ~ '^GP-[0-9]{4}-[0-9]+$';

CREATE OR REPLACE FUNCTION public.app_create_order_atomic(
  p_order JSONB,
  p_items JSONB,
  p_stock_requests JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id TEXT;
  v_client_id UUID;
  v_idempotency_key TEXT;
  v_reference TEXT;
  v_order_row JSONB;
  v_order_app JSONB;
  v_existing_order JSONB;
  v_product_id TEXT;
  v_requested INTEGER;
  v_available INTEGER;
  v_remaining INTEGER;
  v_product_status TEXT;
  v_product_data JSONB;
  v_deferred_product_ids TEXT[] := ARRAY[]::TEXT[];
  v_stock_results JSONB := '[]'::JSONB;
  v_order_items JSONB;
  v_has_deferred BOOLEAN := FALSE;
  v_has_quote_items BOOLEAN := FALSE;
BEGIN
  v_order_id := NULLIF(p_order->>'id', '');
  v_client_id := NULLIF(p_order->>'client_id', '')::UUID;
  v_idempotency_key := COALESCE(
    NULLIF(p_order->>'idempotency_key', ''),
    NULLIF(p_order->'app_data'->>'idempotencyKey', '')
  );

  IF v_order_id IS NULL OR v_client_id IS NULL THEN
    RAISE EXCEPTION 'Commande ou profil client manquant.' USING ERRCODE = '22023';
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    SELECT app_data INTO v_existing_order
    FROM public.orders
    WHERE client_id = v_client_id
      AND idempotency_key = v_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object('created', FALSE, 'order', COALESCE(v_existing_order, '{}'::JSONB), 'stocks', '[]'::JSONB);
    END IF;
  END IF;

  -- Lock products in a stable order so simultaneous multi-product orders do
  -- not oversell stock or deadlock each other.
  FOR v_product_id, v_requested IN
    SELECT stock_request->>'productId', GREATEST(COALESCE((stock_request->>'quantity')::INTEGER, 0), 0)
    FROM jsonb_array_elements(COALESCE(p_stock_requests, '[]'::JSONB)) AS stock_requests(stock_request)
    WHERE NULLIF(stock_request->>'productId', '') IS NOT NULL
    ORDER BY stock_request->>'productId'
  LOOP
    IF v_requested < 1 THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(app_data, '{}'::JSONB), status
      INTO v_product_data, v_product_status
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable pendant la validation : %', v_product_id
        USING ERRCODE = 'P0001';
    END IF;

    v_available := GREATEST(CASE
      WHEN COALESCE(v_product_data->>'quantityAvailable', '') ~ '^-?[0-9]+$'
        THEN (v_product_data->>'quantityAvailable')::INTEGER
      WHEN COALESCE(v_product_data->>'stockQuantity', '') ~ '^-?[0-9]+$'
        THEN (v_product_data->>'stockQuantity')::INTEGER
      ELSE 0
    END, 0);

    IF v_available < v_requested THEN
      v_deferred_product_ids := array_append(v_deferred_product_ids, v_product_id);
      -- The entire line moves to a quote when stock cannot cover it. Keep the
      -- available quantity untouched instead of reserving a partial quantity.
      v_remaining := v_available;
    ELSE
      v_remaining := v_available - v_requested;
    END IF;

    IF v_remaining <> v_available
      OR NOT (v_product_data ? 'stockQuantity')
      OR NOT (v_product_data ? 'quantityAvailable')
      OR (v_remaining > 0 AND v_product_status IS DISTINCT FROM 'disponible')
      OR (v_remaining = 0 AND v_product_status IS DISTINCT FROM 'rupture') THEN
      v_product_data := jsonb_set(v_product_data, '{stockQuantity}', to_jsonb(v_remaining), TRUE);
      v_product_data := jsonb_set(v_product_data, '{quantityAvailable}', to_jsonb(v_remaining), TRUE);
      UPDATE public.products
      SET app_data = v_product_data,
          status = CASE WHEN v_remaining > 0 THEN 'disponible' ELSE 'rupture' END
      WHERE id = v_product_id;
    END IF;

    v_stock_results := v_stock_results || jsonb_build_array(
      jsonb_build_object('productId', v_product_id, 'quantity', v_remaining)
    );
  END LOOP;

  v_has_deferred := cardinality(v_deferred_product_ids) > 0;
  v_order_app := COALESCE(p_order->'app_data', '{}'::JSONB);
  v_order_items := COALESCE(v_order_app->'items', '[]'::JSONB);

  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN item->>'productId' = ANY(v_deferred_product_ids)
        THEN jsonb_set(item, '{isDeferredStock}', 'true'::JSONB, TRUE)
      ELSE item - 'isDeferredStock'
    END
    ORDER BY item_order
  ), '[]'::JSONB)
  INTO v_order_items
  FROM jsonb_array_elements(v_order_items) WITH ORDINALITY AS item_rows(item, item_order);

  v_order_app := jsonb_set(v_order_app, '{items}', v_order_items, TRUE);
  SELECT COALESCE(bool_or(COALESCE(NULLIF(item->>'isQuote', '')::BOOLEAN, FALSE)), FALSE)
    INTO v_has_quote_items
  FROM jsonb_array_elements(v_order_items) AS order_items(item);
  v_has_quote_items := v_has_quote_items OR v_has_deferred;
  v_order_app := jsonb_set(v_order_app, '{hasQuoteItems}', to_jsonb(v_has_quote_items), TRUE);
  v_order_app := jsonb_set(v_order_app, '{stockReserved}', to_jsonb(NOT v_has_deferred), TRUE);

  v_reference := format(
    'GP-%s-%s',
    to_char(clock_timestamp(), 'YYYY'),
    lpad(nextval('public.gloryday_order_reference_seq')::TEXT, 4, '0')
  );
  v_order_app := jsonb_set(v_order_app, '{reference}', to_jsonb(v_reference), TRUE);

  v_order_row := p_order || jsonb_build_object(
    'reference', v_reference,
    'app_data', v_order_app,
    'idempotency_key', v_idempotency_key,
    'has_quote_items', v_has_quote_items,
    'order_type', CASE WHEN v_has_quote_items THEN 'devis' ELSE COALESCE(p_order->>'order_type', 'standard') END
  );

  PERFORM public.app_save_order(v_order_row, COALESCE(p_items, '[]'::JSONB));

  UPDATE public.orders
  SET idempotency_key = v_idempotency_key
  WHERE id = v_order_id;

  RETURN jsonb_build_object('created', TRUE, 'order', v_order_app, 'stocks', v_stock_results);
EXCEPTION
  WHEN unique_violation THEN
    -- The unique key makes retrying safe even when two Vercel instances receive
    -- the same submission at almost the same time. The exception subtransaction
    -- rolls back its stock changes before this lookup runs.
    IF v_idempotency_key IS NOT NULL THEN
      SELECT app_data INTO v_existing_order
      FROM public.orders
      WHERE client_id = v_client_id
        AND idempotency_key = v_idempotency_key;

      IF FOUND THEN
        RETURN jsonb_build_object('created', FALSE, 'order', COALESCE(v_existing_order, '{}'::JSONB), 'stocks', '[]'::JSONB);
      END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB) TO service_role;

COMMIT;
