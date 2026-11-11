CREATE OR REPLACE FUNCTION public.dripx_admin_list_users()
RETURNS TABLE(user_id uuid, discord_id text, display_name text, avatar_url text, role text, active boolean, created_at timestamp with time zone, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.dripx_is_admin() THEN
    RAISE EXCEPTION 'Solo administración puede consultar usuarios' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  SELECT u.id,
    coalesce(p.discord_id,pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'provider_id'),pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'sub')),
    coalesce(p.display_name,pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'full_name'),pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'global_name'),pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'name'),'Usuario Discord'),
    coalesce(p.avatar_url,CASE
      WHEN pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'avatar_url') LIKE 'http%'
        THEN pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'avatar_url')
      WHEN pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'avatar') IS NOT NULL
        AND coalesce(p.discord_id,pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'provider_id')) IS NOT NULL
        THEN 'https://cdn.discordapp.com/avatars/'||coalesce(p.discord_id,pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'provider_id'))||'/'||pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'avatar')||'.png'
    END),
    coalesce(p.role,'customer'),coalesce(p.active,true),coalesce(p.created_at,u.created_at),u.email
  FROM auth.users u LEFT JOIN public.dripx_profiles p ON p.user_id=u.id
  ORDER BY coalesce(p.display_name,pg_catalog.jsonb_extract_path_text(coalesce(u.raw_user_meta_data::jsonb,'{}'::jsonb),'global_name'),u.email,'') ASC;
END;
$function$;
REVOKE ALL ON FUNCTION public.dripx_admin_list_users() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dripx_admin_list_users() TO authenticated,service_role;
