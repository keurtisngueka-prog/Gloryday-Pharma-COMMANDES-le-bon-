BEGIN;

WITH most_used_client AS (
  SELECT profile.id, app_user.app_user_id
  FROM public.profiles AS profile
  JOIN public.app_users AS app_user ON app_user.profile_id = profile.id
  LEFT JOIN public.app_sessions AS session ON session.user_id = app_user.app_user_id
  WHERE profile.role = 'client'
  GROUP BY profile.id, profile.created_at, app_user.app_user_id
  ORDER BY COUNT(DISTINCT session.token_hash) DESC, profile.created_at ASC, profile.id ASC
  LIMIT 1
), updated_profile AS (
  UPDATE public.profiles AS profile
  SET is_demo_account = TRUE,
      updated_at = NOW()
  FROM most_used_client AS target
  WHERE profile.id = target.id
  RETURNING target.app_user_id
), updated_app_user AS (
  UPDATE public.app_users AS app_user
  SET user_data = COALESCE(app_user.user_data, '{}'::JSONB)
      || jsonb_build_object('isDemoAccount', TRUE),
      updated_at = NOW()
  FROM updated_profile AS target
  WHERE app_user.app_user_id = target.app_user_id
  RETURNING app_user.app_user_id
)
UPDATE public.app_sessions AS session
SET user_data = COALESCE(session.user_data, '{}'::JSONB)
    || jsonb_build_object('isDemoAccount', TRUE)
FROM updated_app_user AS target
WHERE session.user_id = target.app_user_id;

COMMIT;
