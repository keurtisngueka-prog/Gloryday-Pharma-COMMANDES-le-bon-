BEGIN;

-- Receipt lot metadata is stored centrally so it survives device changes and
-- can be used by the expiry dashboard. Stock quantity remains authoritative
-- in products.app_data and stock_movements until per-lot allocation is enabled.
CREATE TABLE IF NOT EXISTS public.stock_batches (
  id UUID PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  receipt_movement_id UUID NOT NULL UNIQUE REFERENCES public.stock_movements(id) ON DELETE RESTRICT,
  lot_number TEXT,
  expiry_date DATE,
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  purchase_price BIGINT CHECK (purchase_price IS NULL OR purchase_price >= 0),
  supplier_name TEXT,
  supplier_reference TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by_id TEXT NOT NULL,
  received_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponible'
    CHECK (status IN ('disponible', 'quarantaine', 'detruit')),
  status_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  status_updated_by_id TEXT,
  status_updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (length(trim(product_name)) > 0),
  CHECK (length(trim(received_by_id)) > 0),
  CHECK (length(trim(received_by)) > 0),
  CHECK (supplier_name IS NULL OR length(trim(supplier_name)) <= 160),
  CHECK (supplier_reference IS NULL OR length(trim(supplier_reference)) <= 160),
  CHECK (status_reason IS NULL OR length(trim(status_reason)) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_stock_batches_product_received
  ON public.stock_batches (product_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_batches_expiry
  ON public.stock_batches (expiry_date)
  WHERE status = 'disponible' AND expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_batches_status
  ON public.stock_batches (status, expiry_date);

ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.stock_batches FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.stock_batches TO service_role;

CREATE OR REPLACE FUNCTION public.app_receive_product_stock_with_batch(
  p_movement_id UUID,
  p_product_id TEXT,
  p_quantity INTEGER,
  p_reason TEXT,
  p_lot_number TEXT,
  p_performed_by_id TEXT,
  p_performed_by TEXT,
  p_performed_by_role TEXT,
  p_expiry_date DATE DEFAULT NULL,
  p_supplier_name TEXT DEFAULT NULL,
  p_supplier_reference TEXT DEFAULT NULL,
  p_purchase_price BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_product_name TEXT;
  v_existing public.stock_batches%ROWTYPE;
  v_created public.stock_batches%ROWTYPE;
BEGIN
  IF p_movement_id IS NULL
     OR NULLIF(trim(p_product_id), '') IS NULL
     OR p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 1000000
     OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500
     OR NULLIF(trim(p_performed_by_id), '') IS NULL
     OR NULLIF(trim(p_performed_by), '') IS NULL
     OR NULLIF(trim(p_performed_by_role), '') IS NULL
     OR (p_supplier_name IS NOT NULL AND length(trim(p_supplier_name)) > 160)
     OR (p_supplier_reference IS NOT NULL AND length(trim(p_supplier_reference)) > 160)
     OR (p_purchase_price IS NOT NULL AND p_purchase_price < 0) THEN
    RAISE EXCEPTION 'Données de réception de lot invalides.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.stock_batches
  WHERE id = p_movement_id;
  IF FOUND THEN
    IF v_existing.product_id <> p_product_id
       OR v_existing.quantity_received <> p_quantity
       OR v_existing.lot_number IS DISTINCT FROM NULLIF(trim(p_lot_number), '')
       OR v_existing.expiry_date IS DISTINCT FROM p_expiry_date
       OR v_existing.supplier_name IS DISTINCT FROM NULLIF(trim(p_supplier_name), '')
       OR v_existing.supplier_reference IS DISTINCT FROM NULLIF(trim(p_supplier_reference), '')
       OR v_existing.purchase_price IS DISTINCT FROM p_purchase_price THEN
      RAISE EXCEPTION 'Cet identifiant de réception existe déjà avec d’autres données.' USING ERRCODE = '23505';
    END IF;
    v_result := public.app_receive_product_stock(
      p_movement_id, p_product_id, p_quantity, p_reason, p_lot_number,
      p_performed_by_id, p_performed_by, p_performed_by_role
    );
    RETURN v_result || jsonb_build_object('batch', to_jsonb(v_existing));
  END IF;

  -- The existing stock RPC locks the product and writes the stock ledger. The
  -- lot row is inserted in this same transaction, so a failure rolls back both.
  v_result := public.app_receive_product_stock(
    p_movement_id, p_product_id, p_quantity, p_reason, p_lot_number,
    p_performed_by_id, p_performed_by, p_performed_by_role
  );

  SELECT name INTO v_product_name FROM public.products WHERE id = p_product_id;
  INSERT INTO public.stock_batches (
    id, product_id, product_name, receipt_movement_id, lot_number, expiry_date,
    quantity_received, purchase_price, supplier_name, supplier_reference,
    received_by_id, received_by
  ) VALUES (
    p_movement_id, p_product_id, v_product_name, p_movement_id,
    NULLIF(trim(p_lot_number), ''), p_expiry_date, p_quantity, p_purchase_price,
    NULLIF(trim(p_supplier_name), ''), NULLIF(trim(p_supplier_reference), ''),
    trim(p_performed_by_id), trim(p_performed_by)
  ) RETURNING * INTO v_created;

  RETURN v_result || jsonb_build_object('batch', to_jsonb(v_created));
END;
$$;

REVOKE ALL ON FUNCTION public.app_receive_product_stock_with_batch(
  UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_receive_product_stock_with_batch(
  UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, BIGINT
) TO service_role;

COMMIT;
