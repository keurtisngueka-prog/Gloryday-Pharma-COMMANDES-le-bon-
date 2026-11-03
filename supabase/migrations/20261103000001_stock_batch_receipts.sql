BEGIN;

-- Receipt lot metadata is stored centrally so it survives device changes and
-- can be used by the expiry dashboard. Keep the legacy quantity/received_date
-- columns compatible with the original table that already exists in production.
CREATE TABLE IF NOT EXISTS public.stock_batches (
  id VARCHAR PRIMARY KEY,
  product_id VARCHAR NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  lot_number TEXT,
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  purchase_price BIGINT,
  supplier_name TEXT,
  received_date DATE,
  product_name TEXT,
  receipt_movement_id UUID,
  quantity_received INTEGER,
  supplier_reference TEXT,
  received_at TIMESTAMPTZ,
  received_by_id TEXT,
  received_by TEXT,
  status TEXT DEFAULT 'disponible',
  status_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  status_updated_by_id TEXT,
  status_updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- The first production table used varchar IDs and the names quantity and
-- received_date. Extend it in place; never drop its rows or guess old balances.
ALTER TABLE public.stock_batches
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS receipt_movement_id UUID,
  ADD COLUMN IF NOT EXISTS quantity_received INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_reference TEXT,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by_id TEXT,
  ADD COLUMN IF NOT EXISTS received_by TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponible',
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_by_id TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.stock_batches AS batch
SET product_name = COALESCE(NULLIF(trim(batch.product_name), ''),
      (SELECT NULLIF(trim(product.name), '') FROM public.products product WHERE product.id = batch.product_id),
      batch.product_id, 'Produit historique'),
    quantity_received = COALESCE(batch.quantity_received, batch.quantity),
    received_at = COALESCE(batch.received_at, batch.received_date::TIMESTAMPTZ, batch.created_at, now()),
    received_by_id = COALESCE(NULLIF(trim(batch.received_by_id), ''), 'historique'),
    received_by = COALESCE(NULLIF(trim(batch.received_by), ''), 'Historique antérieur'),
    status = COALESCE(batch.status, 'disponible'),
    created_at = COALESCE(batch.created_at, batch.received_at, batch.received_date::TIMESTAMPTZ, now());

ALTER TABLE public.stock_batches
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN product_name SET NOT NULL,
  ALTER COLUMN quantity_received SET NOT NULL,
  ALTER COLUMN received_at SET DEFAULT now(),
  ALTER COLUMN received_at SET NOT NULL,
  ALTER COLUMN received_by_id SET NOT NULL,
  ALTER COLUMN received_by SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'disponible',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN lot_number DROP NOT NULL,
  ALTER COLUMN expiry_date DROP NOT NULL,
  ALTER COLUMN purchase_price DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.stock_batches'::REGCLASS AND conname = 'stock_batches_receipt_movement_id_fkey') THEN
    ALTER TABLE public.stock_batches
      ADD CONSTRAINT stock_batches_receipt_movement_id_fkey
      FOREIGN KEY (receipt_movement_id) REFERENCES public.stock_movements(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.stock_batches'::REGCLASS AND conname = 'stock_batches_quantity_positive_check') THEN
    ALTER TABLE public.stock_batches ADD CONSTRAINT stock_batches_quantity_positive_check CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.stock_batches'::REGCLASS AND conname = 'stock_batches_quantity_received_positive_check') THEN
    ALTER TABLE public.stock_batches ADD CONSTRAINT stock_batches_quantity_received_positive_check CHECK (quantity_received > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.stock_batches'::REGCLASS AND conname = 'stock_batches_purchase_price_check') THEN
    ALTER TABLE public.stock_batches ADD CONSTRAINT stock_batches_purchase_price_check CHECK (purchase_price IS NULL OR purchase_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.stock_batches'::REGCLASS AND conname = 'stock_batches_status_check') THEN
    ALTER TABLE public.stock_batches ADD CONSTRAINT stock_batches_status_check CHECK (status IN ('disponible', 'quarantaine', 'detruit'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.stock_batches'::REGCLASS AND conname = 'stock_batches_metadata_check') THEN
    ALTER TABLE public.stock_batches ADD CONSTRAINT stock_batches_metadata_check CHECK (
      length(trim(product_name)) > 0 AND length(trim(received_by_id)) > 0 AND length(trim(received_by)) > 0
      AND (supplier_name IS NULL OR length(trim(supplier_name)) <= 160)
      AND (supplier_reference IS NULL OR length(trim(supplier_reference)) <= 160)
      AND (status_reason IS NULL OR length(trim(status_reason)) <= 500)
    );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_batches_receipt_movement
  ON public.stock_batches (receipt_movement_id)
  WHERE receipt_movement_id IS NOT NULL;

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
  WHERE id = p_movement_id::TEXT
  FOR UPDATE;
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
    quantity, quantity_received, purchase_price, supplier_name, supplier_reference,
    received_date, received_at, received_by_id, received_by, created_at
  ) VALUES (
    p_movement_id::TEXT, p_product_id, v_product_name, p_movement_id,
    NULLIF(trim(p_lot_number), ''), p_expiry_date, p_quantity, p_quantity, p_purchase_price,
    NULLIF(trim(p_supplier_name), ''), NULLIF(trim(p_supplier_reference), ''),
    CURRENT_DATE, now(), trim(p_performed_by_id), trim(p_performed_by), now()
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
