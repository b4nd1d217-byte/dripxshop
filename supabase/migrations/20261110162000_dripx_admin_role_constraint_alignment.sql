-- Align the profile role constraint with the actual admin role editor.
-- These roles are permissions labels; only "admin" passes dripx_is_admin().
ALTER TABLE public.dripx_profiles
  DROP CONSTRAINT IF EXISTS dripx_profiles_role_check;

ALTER TABLE public.dripx_profiles
  ADD CONSTRAINT dripx_profiles_role_check
  CHECK (role = ANY (ARRAY['customer'::text,'support'::text,'moderator'::text,'admin'::text]));

COMMENT ON CONSTRAINT dripx_profiles_role_check ON public.dripx_profiles IS
  'Allowed account roles. Support and moderator do not grant administrator privileges.';

CREATE OR REPLACE FUNCTION public.dripx_admin_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_old_role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.dripx_is_admin() THEN
    RAISE EXCEPTION 'Solo administración puede cambiar roles' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('customer','support','moderator') THEN
    RAISE EXCEPTION 'Rol no permitido' USING ERRCODE = '22023';
  END IF;

  SELECT p.role
    INTO v_old_role
    FROM public.dripx_profiles AS p
   WHERE p.user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El perfil del usuario no existe' USING ERRCODE = 'P0002';
  END IF;

  IF v_old_role = 'admin' THEN
    RAISE EXCEPTION 'No se puede modificar el rol de un administrador desde este panel' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dripx_profiles
     SET role = p_role, updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,details)
  VALUES (
    auth.uid(),
    'user.role.updated',
    'user',
    p_user_id,
    jsonb_build_object('from',v_old_role,'to',p_role)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.dripx_admin_set_user_role(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dripx_admin_set_user_role(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dripx_admin_list_users()
RETURNS TABLE(
  user_id uuid,
  discord_id text,
  display_name text,
  avatar_url text,
  role text,
  active boolean,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.dripx_is_admin() THEN
    RAISE EXCEPTION 'Solo administración puede consultar usuarios' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    coalesce(p.discord_id,u.raw_user_meta_data->>'provider_id',u.raw_user_meta_data->>'sub'),
    coalesce(p.display_name,u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'global_name',u.raw_user_meta_data->>'name','Usuario Discord'),
    coalesce(
      p.avatar_url,
      CASE
        WHEN u.raw_user_meta_data->>'avatar_url' LIKE 'http%' THEN u.raw_user_meta_data->>'avatar_url'
        WHEN u.raw_user_meta_data->>'avatar' IS NOT NULL
          AND coalesce(p.discord_id,u.raw_user_meta_data->>'provider_id') IS NOT NULL
        THEN 'https://cdn.discordapp.com/avatars/'||
          coalesce(p.discord_id,u.raw_user_meta_data->>'provider_id')||'/'||
          u.raw_user_meta_data->>'avatar'||'.png'
      END
    ),
    coalesce(p.role,'customer'),
    coalesce(p.active,true),
    coalesce(p.created_at,u.created_at),
    u.email
  FROM auth.users AS u
  LEFT JOIN public.dripx_profiles AS p ON p.user_id=u.id
  ORDER BY coalesce(p.display_name,u.raw_user_meta_data->>'global_name',u.email,'') ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.dripx_admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dripx_admin_list_users() TO authenticated;
