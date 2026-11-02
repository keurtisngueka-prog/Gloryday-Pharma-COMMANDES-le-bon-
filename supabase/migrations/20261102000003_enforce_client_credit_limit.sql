BEGIN;

-- Keep the stock ledger wrapper as the implementation underneath this
-- customer-credit guard. The profile-linked app_users row serializes concurrent
-- credit checkouts for the same customer.
DO $$
BEGIN
  IF to_regprocedure('public.app_create_order_atomic_pre_credit(jsonb,jsonb,jsonb)') IS NULL THEN
    ALTER FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
      RENAME TO app_create_order_atomic_pre_credit;
  END IF;
END;
$$;

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
  v_client_id UUID := NULLIF(p_order->>'client_id', '')::UUID;
  v_idempotency_key TEXT := COALESCE(
    NULLIF(p_order->>'idempotency_key', ''),
    NULLIF(p_order->'app_data'->>'idempotencyKey', '')
  );
  v_existing_order JSONB;
  v_user_data JSONB;
  v_requested_total NUMERIC := 0;
  v_credit_limit NUMERIC := 0;
  v_minimum_order NUMERIC := 50000;
  v_outstanding NUMERIC := 0;
  v_result JSONB;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Profil client manquant pour le contrôle du plafond de crédit.'
      USING ERRCODE = '22023';
  END IF;

  -- Idempotent retries must return the original order without consuming credit twice.
  IF v_idempotency_key IS NOT NULL THEN
    SELECT app_data INTO v_existing_order
    FROM public.orders
    WHERE client_id = v_client_id
      AND idempotency_key = v_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('created', FALSE, 'order', COALESCE(v_existing_order, '{}'::JSONB), 'stocks', '[]'::JSONB);
    END IF;
  END IF;

  IF p_order->>'payment_method' = 'en_compte' THEN
    -- The app user row is the per-client mutex. A second checkout waits here,
    -- then calculates its available balance against the first committed order.
    SELECT COALESCE(user_data, '{}'::JSONB)
      INTO v_user_data
    FROM public.app_users
    WHERE profile_id = v_client_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Le compte client n’a pas de conditions de crédit enregistrées.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_data->>'accountStatus' IS DISTINCT FROM 'actif'
       OR COALESCE(v_user_data->>'paymentTerms', '') IN ('', 'comptant', 'acompte_solde') THEN
      RAISE EXCEPTION 'Le paiement à terme n’est pas autorisé par les conditions de ce compte.'
        USING ERRCODE = 'P0001';
    END IF;

    IF COALESCE(v_user_data->>'creditLimit', '') ~ '^[0-9]+$' THEN
      v_credit_limit := (v_user_data->>'creditLimit')::NUMERIC;
    END IF;
    IF COALESCE(v_user_data->>'minimumCreditOrderAmount', '') ~ '^[0-9]+$' THEN
      v_minimum_order := (v_user_data->>'minimumCreditOrderAmount')::NUMERIC;
    END IF;
    IF COALESCE(p_order->>'estimated_total', '') ~ '^[0-9]+$' THEN
      v_requested_total := (p_order->>'estimated_total')::NUMERIC;
    END IF;

    IF v_credit_limit <= 0 THEN
      RAISE EXCEPTION 'Aucun plafond de crédit n’est activé pour ce compte.'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_requested_total < v_minimum_order THEN
      RAISE EXCEPTION 'Le seuil minimum pour payer à terme est de % FCFA.', v_minimum_order
        USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(GREATEST(
      COALESCE(order_row.estimated_total, 0)::NUMERIC
      - LEAST(
        COALESCE(order_row.estimated_total, 0)::NUMERIC,
        GREATEST(CASE
          WHEN order_row.is_paid OR order_row.app_data->>'isPaid' = 'true' THEN COALESCE(order_row.estimated_total, 0)::NUMERIC
          WHEN CASE
            WHEN jsonb_typeof(order_row.app_data->'installments') = 'array'
              THEN jsonb_array_length(order_row.app_data->'installments') > 0
            ELSE FALSE
          END THEN (
            SELECT COALESCE(SUM(CASE
              WHEN installment->>'status' = 'valide'
                   AND COALESCE(installment->>'amount', '') ~ '^[0-9]+$'
                THEN (installment->>'amount')::NUMERIC
              ELSE 0
            END), 0)
            FROM jsonb_array_elements(order_row.app_data->'installments') AS installment_rows(installment)
          )
          WHEN COALESCE(order_row.app_data->>'amountPaid', '') ~ '^[0-9]+$'
            THEN (order_row.app_data->>'amountPaid')::NUMERIC
          ELSE 0
        END, 0)
      ),
      0
    )), 0)
    INTO v_outstanding
    FROM public.orders AS order_row
    WHERE order_row.client_id = v_client_id
      AND order_row.status <> 'Annulée';

    IF v_requested_total > GREATEST(v_credit_limit - v_outstanding, 0) THEN
      RAISE EXCEPTION 'Plafond dépassé. Disponible : % FCFA.', GREATEST(v_credit_limit - v_outstanding, 0)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_result := public.app_create_order_atomic_pre_credit(
    p_order,
    p_items,
    COALESCE(p_stock_requests, '[]'::JSONB)
  );

  -- A stock race can convert a line to a quote after the application check.
  -- Roll back the order and stock reservation instead of allowing unpriced credit.
  IF p_order->>'payment_method' = 'en_compte'
     AND COALESCE((v_result->'order'->>'hasQuoteItems')::BOOLEAN, FALSE) THEN
    RAISE EXCEPTION 'Un article est passé en devis ou en réapprovisionnement. Le paiement à terme nécessite un montant confirmé.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.app_create_order_atomic_pre_credit(JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_order_atomic(JSONB, JSONB, JSONB)
  TO service_role;

INSERT INTO public.app_runtime_settings (setting_key, setting_value, updated_at)
VALUES ('client_credit_guard_version', '{"version":1}'::JSONB, NOW())
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = EXCLUDED.updated_at;

COMMIT;
