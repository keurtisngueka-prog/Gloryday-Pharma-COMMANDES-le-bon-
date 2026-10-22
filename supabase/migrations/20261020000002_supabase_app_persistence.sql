-- Gloryday Pharma: compatibilité de l'application Node avec le schéma Supabase existant.
-- Migration additive uniquement : aucune table ni donnée métier existante n'est supprimée.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS app_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS app_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS app_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS app_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.app_users (
  app_user_id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_hash TEXT,
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_users FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_users TO service_role;

CREATE OR REPLACE FUNCTION public.app_save_user(
  p_app_user_id TEXT,
  p_profile JSONB,
  p_password_hash TEXT,
  p_user_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_profile_id UUID;
BEGIN
  SELECT profile_id INTO saved_profile_id
  FROM public.app_users
  WHERE app_user_id = p_app_user_id
  FOR UPDATE;

  IF saved_profile_id IS NULL THEN
    INSERT INTO public.profiles (
      phone, email, facility_name, contact_name, facility_type, job_title,
      director_approval_status, role, is_active, delivery_address,
      total_spent, total_orders_count
    )
    SELECT
      profile.phone, profile.email, profile.facility_name, profile.contact_name,
      profile.facility_type, profile.job_title, profile.director_approval_status,
      profile.role, profile.is_active, profile.delivery_address,
      profile.total_spent, profile.total_orders_count
    FROM jsonb_to_record(p_profile) AS profile(
      phone TEXT, email TEXT, facility_name TEXT, contact_name TEXT,
      facility_type TEXT, job_title TEXT, director_approval_status TEXT,
      role TEXT, is_active BOOLEAN, delivery_address TEXT,
      total_spent BIGINT, total_orders_count INTEGER
    )
    RETURNING id INTO saved_profile_id;

    INSERT INTO public.app_users (app_user_id, profile_id, password_hash, user_data)
    VALUES (p_app_user_id, saved_profile_id, p_password_hash, COALESCE(p_user_data, '{}'::jsonb));
  ELSE
    UPDATE public.profiles AS current_profile
    SET phone = profile.phone,
        email = profile.email,
        facility_name = profile.facility_name,
        contact_name = profile.contact_name,
        facility_type = profile.facility_type,
        job_title = profile.job_title,
        director_approval_status = profile.director_approval_status,
        role = profile.role,
        is_active = profile.is_active,
        delivery_address = profile.delivery_address,
        total_spent = profile.total_spent,
        total_orders_count = profile.total_orders_count,
        updated_at = NOW()
    FROM jsonb_to_record(p_profile) AS profile(
      phone TEXT, email TEXT, facility_name TEXT, contact_name TEXT,
      facility_type TEXT, job_title TEXT, director_approval_status TEXT,
      role TEXT, is_active BOOLEAN, delivery_address TEXT,
      total_spent BIGINT, total_orders_count INTEGER
    )
    WHERE current_profile.id = saved_profile_id;

    UPDATE public.app_users
    SET password_hash = p_password_hash,
        user_data = COALESCE(p_user_data, '{}'::jsonb),
        updated_at = NOW()
    WHERE app_user_id = p_app_user_id;
  END IF;

  RETURN saved_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.app_save_user(TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_user(TEXT, JSONB, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.app_replace_order_items(p_order_id TEXT, p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, variant, price, quantity, total, is_quote
  )
  SELECT
    p_order_id,
    item.product_id,
    item.product_name,
    item.variant,
    item.price,
    item.quantity,
    item.total,
    item.is_quote
  FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS item(
    product_id TEXT,
    product_name TEXT,
    variant TEXT,
    price BIGINT,
    quantity INTEGER,
    total BIGINT,
    is_quote BOOLEAN
  );
END;
$$;

REVOKE ALL ON FUNCTION public.app_replace_order_items(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_replace_order_items(TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.app_save_order(p_order JSONB, p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  order_id_value TEXT;
BEGIN
  INSERT INTO public.orders (
    id, reference, client_id, facility_name, contact_name, phone, facility_type,
    delivery_mode, payment_method, delivery_address, neighborhood_id,
    neighborhood_name, delivery_zone, delivery_fee, delivery_estimated,
    order_type, has_quote_items, estimated_total, status, is_paid, delivery_stage,
    cancellation_reason, notes, pdf_url, courier_name, courier_phone,
    courier_vehicle, courier_matricule, courier_current_zone, app_data,
    created_at, updated_at
  )
  SELECT
    row_data.id, row_data.reference, row_data.client_id, row_data.facility_name,
    row_data.contact_name, row_data.phone, row_data.facility_type,
    row_data.delivery_mode, row_data.payment_method, row_data.delivery_address,
    row_data.neighborhood_id, row_data.neighborhood_name, row_data.delivery_zone,
    row_data.delivery_fee, row_data.delivery_estimated, row_data.order_type,
    row_data.has_quote_items, row_data.estimated_total, row_data.status,
    row_data.is_paid, row_data.delivery_stage, row_data.cancellation_reason,
    row_data.notes, row_data.pdf_url, row_data.courier_name, row_data.courier_phone,
    row_data.courier_vehicle, row_data.courier_matricule,
    row_data.courier_current_zone, COALESCE(row_data.app_data, '{}'::jsonb),
    COALESCE(row_data.created_at, NOW()), COALESCE(row_data.updated_at, NOW())
  FROM jsonb_to_record(p_order) AS row_data(
    id TEXT, reference TEXT, client_id UUID, facility_name TEXT, contact_name TEXT,
    phone TEXT, facility_type TEXT, delivery_mode TEXT, payment_method TEXT,
    delivery_address TEXT, neighborhood_id TEXT, neighborhood_name TEXT,
    delivery_zone TEXT, delivery_fee BIGINT, delivery_estimated TEXT,
    order_type TEXT, has_quote_items BOOLEAN, estimated_total BIGINT,
    status TEXT, is_paid BOOLEAN, delivery_stage TEXT,
    cancellation_reason TEXT, notes TEXT, pdf_url TEXT, courier_name TEXT,
    courier_phone TEXT, courier_vehicle TEXT, courier_matricule TEXT,
    courier_current_zone TEXT, app_data JSONB, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  )
  ON CONFLICT (id) DO UPDATE SET
    reference = EXCLUDED.reference,
    client_id = EXCLUDED.client_id,
    facility_name = EXCLUDED.facility_name,
    contact_name = EXCLUDED.contact_name,
    phone = EXCLUDED.phone,
    facility_type = EXCLUDED.facility_type,
    delivery_mode = EXCLUDED.delivery_mode,
    payment_method = EXCLUDED.payment_method,
    delivery_address = EXCLUDED.delivery_address,
    neighborhood_id = EXCLUDED.neighborhood_id,
    neighborhood_name = EXCLUDED.neighborhood_name,
    delivery_zone = EXCLUDED.delivery_zone,
    delivery_fee = EXCLUDED.delivery_fee,
    delivery_estimated = EXCLUDED.delivery_estimated,
    order_type = EXCLUDED.order_type,
    has_quote_items = EXCLUDED.has_quote_items,
    estimated_total = EXCLUDED.estimated_total,
    status = EXCLUDED.status,
    is_paid = EXCLUDED.is_paid,
    delivery_stage = EXCLUDED.delivery_stage,
    cancellation_reason = EXCLUDED.cancellation_reason,
    notes = EXCLUDED.notes,
    pdf_url = EXCLUDED.pdf_url,
    courier_name = EXCLUDED.courier_name,
    courier_phone = EXCLUDED.courier_phone,
    courier_vehicle = EXCLUDED.courier_vehicle,
    courier_matricule = EXCLUDED.courier_matricule,
    courier_current_zone = EXCLUDED.courier_current_zone,
    app_data = EXCLUDED.app_data,
    updated_at = NOW();

  order_id_value := p_order->>'id';
  PERFORM public.app_replace_order_items(order_id_value, p_items);
END;
$$;

REVOKE ALL ON FUNCTION public.app_save_order(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_order(JSONB, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.app_replace_product_variants(p_product_id TEXT, p_variants JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.product_variants WHERE product_id = p_product_id;

  INSERT INTO public.product_variants (
    product_id, label, price, original_price, discount_percentage
  )
  SELECT
    p_product_id,
    variant.label,
    variant.price,
    variant.original_price,
    variant.discount_percentage
  FROM jsonb_to_recordset(COALESCE(p_variants, '[]'::jsonb)) AS variant(
    label TEXT,
    price BIGINT,
    original_price BIGINT,
    discount_percentage INTEGER
  );
END;
$$;

REVOKE ALL ON FUNCTION public.app_replace_product_variants(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_replace_product_variants(TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.app_save_product(p_product JSONB, p_variants JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product_id_value TEXT;
BEGIN
  INSERT INTO public.products (
    id, name, category, subcategory, description, status, image_url,
    is_promotion, discount_percentage, original_price, purchase_price,
    alert_threshold, app_data, created_at, updated_at
  )
  SELECT
    row_data.id, row_data.name, row_data.category, row_data.subcategory,
    row_data.description, row_data.status, row_data.image_url,
    row_data.is_promotion, row_data.discount_percentage, row_data.original_price,
    row_data.purchase_price, row_data.alert_threshold,
    COALESCE(row_data.app_data, '{}'::jsonb),
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
    status = EXCLUDED.status,
    image_url = EXCLUDED.image_url,
    is_promotion = EXCLUDED.is_promotion,
    discount_percentage = EXCLUDED.discount_percentage,
    original_price = EXCLUDED.original_price,
    purchase_price = EXCLUDED.purchase_price,
    alert_threshold = EXCLUDED.alert_threshold,
    app_data = EXCLUDED.app_data,
    updated_at = NOW();

  product_id_value := p_product->>'id';
  PERFORM public.app_replace_product_variants(product_id_value, p_variants);
END;
$$;

REVOKE ALL ON FUNCTION public.app_save_product(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_product(JSONB, JSONB) TO service_role;
