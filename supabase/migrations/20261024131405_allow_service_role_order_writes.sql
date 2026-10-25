BEGIN;

-- The application creates orders through the trusted service-role API. Client
-- JWTs must still be forced to their own profile, but the server must be able
-- to persist its already-validated client_id and order totals.
CREATE OR REPLACE FUNCTION public.orders_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NOT public.is_staff() THEN
        NEW.client_id           := public.my_profile_id();
        NEW.structure_id        := public.my_structure_id();
        NEW.status              := 'À confirmer';
        NEW.is_paid             := FALSE;
        NEW.delivery_stage      := 'preparation';
        NEW.estimated_total     := 0;
        NEW.cancellation_reason := NULL;
        NEW.courier_name := NULL;
        NEW.courier_phone := NULL;
        NEW.courier_vehicle := NULL;
        NEW.courier_matricule := NULL;
        NEW.courier_current_zone := NULL;
    END IF;

    RETURN NEW;
END;
$function$;

COMMIT;
