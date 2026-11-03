-- Make the public catalogue view enforce the querying role's permissions and
-- row-level security policies instead of the view owner's privileges.
ALTER VIEW public.catalogue_public SET (security_invoker = true);
