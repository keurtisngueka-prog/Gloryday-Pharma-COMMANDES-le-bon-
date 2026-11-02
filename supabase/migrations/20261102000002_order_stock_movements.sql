BEGIN;

-- The core checkout RPC already owns the product locks and stock decrements.
-- Wrap it in the same database transaction and use a transaction-local marker
-- so an order_items trigger can record only genuine checkout reservations.
DO $$
BEGIN
  IF to_regprocedure('public.app_create_order_atomic_pre_stock_ledger(jsonb,jsonb,jsonb)') IS NULL THEN
    ALTER FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
      RENAME TO app_create_order_atomic_pre_stock_ledger;
  END IF;
END;
$$;

-- Older mixed orders could have reserved available lines while storing the
-- whole order as unreserved because another line was deferred. Restore that
-- per-order flag for open orders so a later cancellation returns only the
-- physical, non-deferred items.
UPDATE public.orders AS existing_order
SET app_data = jsonb_set(COALESCE(existing_order.app_data, '{}'::JSONB), '{stockReserved}', 'true'::JSONB, TRUE),
    updated_at = now()
WHERE existing_order.status IN ('À confirmer', 'Confirmée', 'En préparation')
  AND COALESCE(existing_order.app_data->>'stockReserved', 'false') <> 'true'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(existing_order.app_data->'items', '[]'::JSONB)) AS order_lines(item)
    WHERE NULLIF(order_lines.item->>'productId', '') IS NOT NULL
      AND order_lines.item->>'isQuote' IS DISTINCT FROM 'true'
      AND order_lines.item->>'isDeferredStock' IS DISTINCT FROM 'true'
      AND CASE
        WHEN COALESCE(order_lines.item->>'price', '') ~ '^-?[0-9]+$'
          THEN (order_lines.item->>'price')::NUMERIC > 0
        ELSE FALSE
      END
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_order_product_type
  ON public.stock_movements (reference, product_id, movement_type)
  WHERE reference IS NOT NULL
    AND movement_type IN ('sortie_commande', 'retour');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stock_movements'::REGCLASS
      AND conname = 'stock_movements_order_balance_check'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_order_balance_check
      CHECK (
        movement_type NOT IN ('sortie_commande', 'retour')
        OR (movement_type = 'sortie_commande' AND previous_quantity = new_quantity + quantity)
        OR (movement_type = 'retour' AND new_quantity = previous_quantity + quantity)
      );
  END IF;
END;
$$;

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
      COALESCE(NULLIF(v_order_data->>'userId', ''), 'client'),
      COALESCE(NULLIF(v_order_data->'customer'->>'facilityName', ''),
               NULLIF(v_order_data->'customer'->>'contactName', ''), 'Client'),
      'client'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_checkout_stock_movements ON public.order_items;
CREATE TRIGGER trg_record_checkout_stock_movements
AFTER INSERT ON public.order_items
REFERENCING NEW TABLE AS new_order_items
FOR EACH STATEMENT
EXECUTE FUNCTION public.app_record_checkout_stock_movements();

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
  v_order_id TEXT := NULLIF(p_order->>'id', '');
  v_result JSONB;
  v_has_reserved_stock BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('app.stock_ledger_order_id', COALESCE(v_order_id, ''), TRUE);
  v_result := public.app_create_order_atomic_pre_stock_ledger(
    p_order,
    p_items,
    COALESCE(p_stock_requests, '[]'::JSONB)
  );
  IF COALESCE((v_result->>'created')::BOOLEAN, FALSE) THEN
    SELECT COALESCE(bool_or(
      item->>'isQuote' IS DISTINCT FROM 'true'
      AND item->>'isDeferredStock' IS DISTINCT FROM 'true'
      AND NULLIF(item->>'productId', '') IS NOT NULL
      AND CASE
        WHEN COALESCE(item->>'price', '') ~ '^-?[0-9]+$'
          THEN (item->>'price')::NUMERIC > 0
        ELSE FALSE
      END
    ), FALSE)
    INTO v_has_reserved_stock
    FROM jsonb_array_elements(COALESCE(v_result->'order'->'items', '[]'::JSONB)) AS order_lines(item);

    UPDATE public.orders
    SET app_data = jsonb_set(COALESCE(app_data, '{}'::JSONB), '{stockReserved}', to_jsonb(v_has_reserved_stock), TRUE),
        updated_at = now()
    WHERE id = v_order_id;

    v_result := jsonb_set(v_result, '{order,stockReserved}', to_jsonb(v_has_reserved_stock), TRUE);
  END IF;
  PERFORM set_config('app.stock_ledger_order_id', '', TRUE);
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.stock_ledger_order_id', '', TRUE);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.app_create_order_atomic_pre_stock_ledger(JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  TO service_role;
REVOKE ALL ON FUNCTION public.app_record_checkout_stock_movements()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.app_cancel_order_and_restore_stock(
  p_order_id TEXT,
  p_reason TEXT,
  p_performed_by_id TEXT,
  p_performed_by TEXT,
  p_performed_by_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_order_data JSONB;
  v_product_data JSONB;
  v_product_name TEXT;
  v_current NUMERIC;
  v_new_quantity INTEGER;
  v_reason TEXT := left(trim(COALESCE(p_reason, 'Annulation demandée')), 500);
  v_line RECORD;
  v_stock_results JSONB := '[]'::JSONB;
  v_was_reserved BOOLEAN;
BEGIN
  IF NULLIF(trim(p_order_id), '') IS NULL
     OR NULLIF(trim(p_performed_by_id), '') IS NULL
     OR NULLIF(trim(p_performed_by), '') IS NULL
     OR NULLIF(trim(p_performed_by_role), '') IS NULL
     OR length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Données d’annulation invalides.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id OR reference = p_order_id
  ORDER BY CASE WHEN id = p_order_id THEN 0 ELSE 1 END
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable.' USING ERRCODE = 'P0002';
  END IF;

  v_order_data := COALESCE(v_order.app_data, '{}'::JSONB);
  IF v_order.status = 'Annulée' THEN
    RETURN jsonb_build_object('cancelled', FALSE, 'order', v_order_data, 'stocks', v_stock_results);
  END IF;

  IF v_order.status NOT IN ('À confirmer', 'Confirmée', 'En préparation')
     OR COALESCE(v_order.delivery_stage, 'preparation') IN ('picked_up', 'in_transit', 'delivered') THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être annulée à cette étape.' USING ERRCODE = '22023';
  END IF;

  v_was_reserved := v_order_data->>'stockReserved' = 'true';
  IF v_was_reserved THEN
    FOR v_line IN
      SELECT item->>'productId' AS product_id,
             max(item->>'productName') AS product_name,
             sum(CASE WHEN COALESCE(item->>'quantity', '') ~ '^[0-9]+$'
                      THEN (item->>'quantity')::INTEGER ELSE 0 END)::INTEGER AS quantity
      FROM jsonb_array_elements(COALESCE(v_order_data->'items', '[]'::JSONB)) AS order_lines(item)
      WHERE NULLIF(item->>'productId', '') IS NOT NULL
        AND item->>'isQuote' IS DISTINCT FROM 'true'
        AND item->>'isDeferredStock' IS DISTINCT FROM 'true'
      GROUP BY item->>'productId'
      ORDER BY item->>'productId'
    LOOP
      IF v_line.quantity < 1 THEN
        CONTINUE;
      END IF;

      SELECT name, COALESCE(app_data, '{}'::JSONB)
        INTO v_product_name, v_product_data
      FROM public.products
      WHERE id = v_line.product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit de la commande introuvable pendant la restitution du stock.'
          USING ERRCODE = 'P0002';
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
        RAISE EXCEPTION 'La restitution dépasserait la limite de stock autorisée.'
          USING ERRCODE = '22003';
      END IF;

      v_new_quantity := v_current::INTEGER + v_line.quantity;
      v_product_data := jsonb_set(v_product_data, '{quantityAvailable}', to_jsonb(v_new_quantity), TRUE);
      v_product_data := jsonb_set(v_product_data, '{stockQuantity}', to_jsonb(v_new_quantity), TRUE);
      UPDATE public.products
      SET app_data = v_product_data,
          status = 'disponible',
          updated_at = now()
      WHERE id = v_line.product_id;

      INSERT INTO public.stock_movements (
        id, product_id, product_name, movement_type, quantity,
        previous_quantity, new_quantity, reason, reference,
        performed_by_id, performed_by, performed_by_role
      ) VALUES (
        gen_random_uuid(), v_line.product_id, COALESCE(v_product_name, v_line.product_name),
        'retour', v_line.quantity, v_current::INTEGER, v_new_quantity,
        format('Restitution liée à l’annulation de la commande %s : %s', v_order.reference, v_reason),
        v_order.reference, trim(p_performed_by_id), trim(p_performed_by), trim(p_performed_by_role)
      )
      ON CONFLICT DO NOTHING;

      v_stock_results := v_stock_results || jsonb_build_array(
        jsonb_build_object('productId', v_line.product_id, 'quantity', v_new_quantity, 'status', 'disponible')
      );
    END LOOP;
  END IF;

  v_order_data := jsonb_set(v_order_data, '{status}', to_jsonb('Annulée'::TEXT), TRUE);
  v_order_data := jsonb_set(v_order_data, '{cancellationReason}', to_jsonb(v_reason), TRUE);
  v_order_data := jsonb_set(v_order_data, '{stockReserved}', 'false'::JSONB, TRUE);

  UPDATE public.orders
  SET status = 'Annulée',
      cancellation_reason = v_reason,
      app_data = v_order_data,
      updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object('cancelled', TRUE, 'order', v_order_data, 'stocks', v_stock_results);
END;
$$;

REVOKE ALL ON FUNCTION public.app_cancel_order_and_restore_stock(TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_cancel_order_and_restore_stock(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
