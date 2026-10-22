-- Position du livreur : historique privé, accessible uniquement depuis le serveur.
CREATE TABLE IF NOT EXISTS public.delivery_location_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy DOUBLE PRECISION NOT NULL CHECK (accuracy BETWEEN 0 AND 100000),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS delivery_location_points_order_recorded_idx
  ON public.delivery_location_points (order_id, recorded_at DESC, id DESC);

ALTER TABLE public.delivery_location_points ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delivery_location_points FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.delivery_location_points TO service_role;

CREATE TABLE IF NOT EXISTS public.delivery_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS delivery_tracking_sessions_order_idx
  ON public.delivery_tracking_sessions (order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_tracking_sessions_one_active_per_order_idx
  ON public.delivery_tracking_sessions (order_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.delivery_tracking_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delivery_tracking_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.delivery_tracking_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.app_record_delivery_location(
  p_order_id TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION,
  p_recorded_at TIMESTAMPTZ,
  p_recorded_by TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_latitude IS NULL OR p_latitude NOT BETWEEN -90 AND 90 OR
     p_longitude IS NULL OR p_longitude NOT BETWEEN -180 AND 180 OR
     p_accuracy IS NULL OR p_accuracy NOT BETWEEN 0 AND 100000 OR
     p_recorded_by IS NULL OR length(p_recorded_by) = 0 THEN
    RAISE EXCEPTION 'Invalid delivery location';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.delivery_location_points
    WHERE order_id = p_order_id AND recorded_at > NOW() - INTERVAL '9 seconds'
  ) THEN
    RAISE EXCEPTION 'Delivery location updates are too frequent';
  END IF;

  INSERT INTO public.delivery_location_points (
    order_id, latitude, longitude, accuracy, recorded_at, recorded_by
  ) VALUES (
    p_order_id, p_latitude, p_longitude, p_accuracy, COALESCE(p_recorded_at, NOW()), p_recorded_by
  );

  DELETE FROM public.delivery_location_points
  WHERE order_id = p_order_id
    AND id IN (
      SELECT id
      FROM public.delivery_location_points
      WHERE order_id = p_order_id
      ORDER BY recorded_at DESC, id DESC
      OFFSET 400
    );
END;
$$;

REVOKE ALL ON FUNCTION public.app_record_delivery_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_record_delivery_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TEXT)
  TO service_role;
