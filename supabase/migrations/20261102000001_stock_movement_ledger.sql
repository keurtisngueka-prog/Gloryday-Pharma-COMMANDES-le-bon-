BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'entree', 'sortie_commande', 'perte_casse', 'ajustement', 'retour'
  )),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
  new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  lot_number TEXT,
  reference TEXT,
  performed_by_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_by_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (movement_type <> 'entree' OR new_quantity = previous_quantity + quantity),
  CHECK (movement_type <> 'ajustement' OR quantity = abs(new_quantity - previous_quantity))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created_at
  ON public.stock_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
  ON public.stock_movements (created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.stock_movements FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.stock_movements TO service_role;

CREATE OR REPLACE FUNCTION public.app_receive_product_stock(
  p_movement_id UUID,
  p_product_id TEXT,
  p_quantity INTEGER,
  p_reason TEXT,
  p_lot_number TEXT,
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
  v_product_name TEXT;
  v_product_data JSONB;
  v_product_status TEXT;
  v_current NUMERIC;
  v_new_quantity INTEGER;
  v_existing public.stock_movements%ROWTYPE;
  v_created public.stock_movements%ROWTYPE;
BEGIN
  IF p_movement_id IS NULL OR NULLIF(trim(p_product_id), '') IS NULL
     OR p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 1000000
     OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500
     OR NULLIF(trim(p_performed_by_id), '') IS NULL
     OR NULLIF(trim(p_performed_by), '') IS NULL
     OR NULLIF(trim(p_performed_by_role), '') IS NULL THEN
    RAISE EXCEPTION 'Données de réception de stock invalides.' USING ERRCODE = '22023';
  END IF;

  SELECT name, COALESCE(app_data, '{}'::JSONB), status
    INTO v_product_name, v_product_data, v_product_status
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_product_data->>'quantityAvailable', '') ~ '^-?[0-9]+$' THEN
    v_current := (v_product_data->>'quantityAvailable')::NUMERIC;
  ELSIF COALESCE(v_product_data->>'stockQuantity', '') ~ '^-?[0-9]+$' THEN
    v_current := (v_product_data->>'stockQuantity')::NUMERIC;
  ELSE
    v_current := 0;
  END IF;

  -- A stable movement id makes a network retry safe: the same receipt cannot
  -- add its quantity twice, even if the first response was lost.
  SELECT * INTO v_existing
  FROM public.stock_movements
  WHERE id = p_movement_id;
  IF FOUND THEN
    IF v_existing.product_id <> p_product_id
       OR v_existing.movement_type <> 'entree'
       OR v_existing.quantity <> p_quantity THEN
      RAISE EXCEPTION 'Cet identifiant de mouvement a déjà été utilisé.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'movement', to_jsonb(v_existing),
      'quantityAvailable', v_current,
      'status', v_product_status
    );
  END IF;

  IF v_current < 0 OR v_current > 2147483647 OR v_current <> trunc(v_current)
     OR v_current + p_quantity > 2147483647 THEN
    RAISE EXCEPTION 'La quantité actuelle ou reçue dépasse la limite autorisée.' USING ERRCODE = '22003';
  END IF;
  v_new_quantity := v_current::INTEGER + p_quantity;

  v_product_data := jsonb_set(v_product_data, '{quantityAvailable}', to_jsonb(v_new_quantity), TRUE);
  v_product_data := jsonb_set(v_product_data, '{stockQuantity}', to_jsonb(v_new_quantity), TRUE);
  UPDATE public.products
  SET app_data = v_product_data,
      status = 'disponible',
      updated_at = now()
  WHERE id = p_product_id;

  INSERT INTO public.stock_movements (
    id, product_id, product_name, movement_type, quantity,
    previous_quantity, new_quantity, reason, lot_number,
    performed_by_id, performed_by, performed_by_role
  ) VALUES (
    p_movement_id, p_product_id, v_product_name, 'entree', p_quantity,
    v_current::INTEGER, v_new_quantity, trim(p_reason), NULLIF(trim(p_lot_number), ''),
    trim(p_performed_by_id), trim(p_performed_by), trim(p_performed_by_role)
  ) RETURNING * INTO v_created;

  RETURN jsonb_build_object(
    'movement', to_jsonb(v_created),
    'quantityAvailable', v_new_quantity,
    'status', 'disponible'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_adjust_product_stock(
  p_movement_id UUID,
  p_product_id TEXT,
  p_target_quantity INTEGER,
  p_status TEXT,
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
  v_product_name TEXT;
  v_product_data JSONB;
  v_product_status TEXT;
  v_current NUMERIC;
  v_new_status TEXT;
  v_existing public.stock_movements%ROWTYPE;
  v_created public.stock_movements%ROWTYPE;
BEGIN
  IF p_movement_id IS NULL OR NULLIF(trim(p_product_id), '') IS NULL
     OR p_target_quantity IS NULL OR p_target_quantity < 0
     OR p_target_quantity > 2147483647
     OR p_status IS NULL OR p_status NOT IN ('disponible', 'rupture')
     OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500
     OR NULLIF(trim(p_performed_by_id), '') IS NULL
     OR NULLIF(trim(p_performed_by), '') IS NULL
     OR NULLIF(trim(p_performed_by_role), '') IS NULL THEN
    RAISE EXCEPTION 'Données de correction de stock invalides.' USING ERRCODE = '22023';
  END IF;

  SELECT name, COALESCE(app_data, '{}'::JSONB), status
    INTO v_product_name, v_product_data, v_product_status
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_product_data->>'quantityAvailable', '') ~ '^-?[0-9]+$' THEN
    v_current := (v_product_data->>'quantityAvailable')::NUMERIC;
  ELSIF COALESCE(v_product_data->>'stockQuantity', '') ~ '^-?[0-9]+$' THEN
    v_current := (v_product_data->>'stockQuantity')::NUMERIC;
  ELSE
    v_current := 0;
  END IF;

  SELECT * INTO v_existing
  FROM public.stock_movements
  WHERE id = p_movement_id;
  IF FOUND THEN
    IF v_existing.product_id <> p_product_id
       OR v_existing.movement_type <> 'ajustement'
       OR v_existing.new_quantity <> p_target_quantity THEN
      RAISE EXCEPTION 'Cet identifiant de mouvement a déjà été utilisé.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'movement', to_jsonb(v_existing),
      'quantityAvailable', v_current,
      'status', v_product_status
    );
  END IF;

  IF v_current < 0 OR v_current > 2147483647 OR v_current <> trunc(v_current) THEN
    RAISE EXCEPTION 'La quantité actuelle du produit est invalide.' USING ERRCODE = '22003';
  END IF;

  v_new_status := CASE WHEN p_target_quantity = 0 THEN 'rupture' ELSE p_status END;
  v_product_data := jsonb_set(v_product_data, '{quantityAvailable}', to_jsonb(p_target_quantity), TRUE);
  v_product_data := jsonb_set(v_product_data, '{stockQuantity}', to_jsonb(p_target_quantity), TRUE);
  UPDATE public.products
  SET app_data = v_product_data,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_product_id;

  IF p_target_quantity <> v_current THEN
    INSERT INTO public.stock_movements (
      id, product_id, product_name, movement_type, quantity,
      previous_quantity, new_quantity, reason,
      performed_by_id, performed_by, performed_by_role
    ) VALUES (
      p_movement_id, p_product_id, v_product_name, 'ajustement',
      abs(p_target_quantity - v_current::INTEGER), v_current::INTEGER,
      p_target_quantity, trim(p_reason), trim(p_performed_by_id),
      trim(p_performed_by), trim(p_performed_by_role)
    ) RETURNING * INTO v_created;
  END IF;

  RETURN jsonb_build_object(
    'movement', CASE WHEN v_created.id IS NULL THEN NULL ELSE to_jsonb(v_created) END,
    'quantityAvailable', p_target_quantity,
    'status', v_new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.app_receive_product_stock(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_receive_product_stock(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.app_adjust_product_stock(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_adjust_product_stock(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
