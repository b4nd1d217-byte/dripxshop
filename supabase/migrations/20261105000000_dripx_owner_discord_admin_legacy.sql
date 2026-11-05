CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = (SELECT auth.uid())
      AND i.provider = 'discord'
      AND i.provider_id = '1377637407163154523'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.active = true
  );
$function$;
