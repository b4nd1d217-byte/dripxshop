create or replace function public.dripx_save_account_license_binding(
  p_server_ip text,
  p_server_port integer,
  p_admin_account_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_ip inet;
  v_name text := nullif(btrim(coalesce(p_admin_account_name,'')),'');
  v_license public.account_licenses%rowtype;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if not public.is_account_active() then
    raise exception 'account_inactive' using errcode='42501';
  end if;
  if p_server_port is null or p_server_port not between 1 and 65535 then
    raise exception 'El puerto debe estar entre 1 y 65535.';
  end if;
  begin
    v_ip := btrim(coalesce(p_server_ip,''))::inet;
  exception when others then
    raise exception 'La IP pública no es válida.';
  end;
  if (family(v_ip)=4 and masklen(v_ip)<>32) or (family(v_ip)=6 and masklen(v_ip)<>128) then
    raise exception 'Introduce una IP individual, no un rango CIDR.';
  end if;
  if (family(v_ip)=4 and (
       v_ip <<= '10.0.0.0/8'::inet or v_ip <<= '172.16.0.0/12'::inet
       or v_ip <<= '192.168.0.0/16'::inet or v_ip <<= '127.0.0.0/8'::inet
       or v_ip <<= '169.254.0.0/16'::inet
     )) or (family(v_ip)=6 and (
       v_ip <<= 'fc00::/7'::inet or v_ip <<= 'fe80::/10'::inet or v_ip='::1'::inet
     )) then
    raise exception 'Indica la IP pública del servidor, no una dirección local.';
  end if;
  if v_name is not null and (length(v_name)>64 or v_name !~ '^[A-Za-z0-9_.-]{1,64}$') then
    raise exception 'El nombre de cuenta MTA admite 1–64 letras, números, punto, guion o guion bajo.';
  end if;

  perform public.issue_account_license_for_user(v_user);
  select * into v_license
  from public.account_licenses
  where user_id=v_user
  for update;
  if not found then raise exception 'account_license_not_found'; end if;
  if v_license.status <> 'active' then
    raise exception 'account_license_revoked' using errcode='42501';
  end if;

  -- A server move revokes the previous installation. Its next online check fails,
  -- while the new IP/port can activate with the same account key.
  update public.account_license_activations
  set is_active=false, revoked_at=now()
  where account_license_id=v_license.id
    and is_active=true
    and (server_ip is distinct from v_ip or server_port is distinct from p_server_port);

  update public.account_licenses
  set bound_server_ip=v_ip,
      bound_server_port=p_server_port,
      authorized_account_name=v_name,
      updated_at=now()
  where id=v_license.id;

  return jsonb_build_object(
    'saved',true,
    'server_ip',host(v_ip),
    'server_port',p_server_port,
    'authorized_account_name',v_name
  );
end;
$function$;
