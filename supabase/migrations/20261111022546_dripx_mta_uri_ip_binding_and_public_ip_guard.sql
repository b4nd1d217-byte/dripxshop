-- Canonical MTA URI/IP binding and public server address validation.

CREATE OR REPLACE FUNCTION private.parse_mta_server_binding(p_address text, p_port integer DEFAULT NULL::integer)
 RETURNS TABLE(server_ip inet, server_port integer)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_address text := btrim(coalesce(p_address, ''));
  v_host text;
  v_url_port_text text;
  v_url_port integer;
  v_port integer;
  v_ip inet;
  v_match text[];
begin
  if v_address ilike 'mtasa://%' then
    v_address := substring(v_address from 9);
  elsif v_address ~* '^[a-z][a-z0-9+.-]*://' then
    raise exception 'Usa mtasa://IP:PUERTO o una IP sin prefijo. No se admiten direcciones HTTP/HTTPS.';
  end if;

  if right(v_address, 1) = '/' then
    v_address := left(v_address, length(v_address) - 1);
  end if;

  if v_address = '' or v_address ~ '[[:space:]/?#@%]' then
    raise exception 'La dirección MTA está vacía o contiene caracteres no permitidos.';
  end if;

  -- IPv6 with an optional port must use brackets: [2001:db8::1]:22003.
  if v_address ~ '^\[[0-9A-Fa-f:.]+\](:[0-9]{1,5})?$' then
    v_match := regexp_match(v_address, '^\[([0-9A-Fa-f:.]+)\](:([0-9]{1,5}))?$');
    v_host := v_match[1];
    v_url_port_text := v_match[3];
  -- IPv4 may include its MTA game port: 203.0.113.10:22003.
  elsif (length(v_address) - length(replace(v_address, ':', ''))) = 1
        and v_address ~ '^[0-9.]+:[0-9]{1,5}$' then
    v_match := regexp_match(v_address, '^([0-9.]+):([0-9]{1,5})$');
    v_host := v_match[1];
    v_url_port_text := v_match[2];
  else
    -- An unbracketed IPv6 value is treated as the address only, never split.
    v_host := v_address;
  end if;

  if v_url_port_text is not null then
    v_url_port := v_url_port_text::integer;
    if v_url_port not between 1 and 65535 then
      raise exception 'El puerto de la URL MTA debe estar entre 1 y 65535.';
    end if;
  end if;

  -- mtasa://IP without a port uses MTA's default game port.
  v_port := coalesce(v_url_port, p_port, 22003);
  if v_port not between 1 and 65535 then
    raise exception 'El puerto del servidor MTA debe estar entre 1 y 65535.';
  end if;

  begin
    v_ip := v_host::inet;
  exception when others then
    raise exception 'La dirección no contiene una IP IPv4 o IPv6 válida.';
  end;

  if (family(v_ip) = 4 and masklen(v_ip) <> 32)
     or (family(v_ip) = 6 and masklen(v_ip) <> 128) then
    raise exception 'Introduce una IP individual, no una red CIDR.';
  end if;

  -- Only globally routable IPv4 addresses can be used for public license binding.
  if family(v_ip) = 4 and (
       v_ip <<= '0.0.0.0/8'::inet
    or v_ip <<= '10.0.0.0/8'::inet
    or v_ip <<= '100.64.0.0/10'::inet
    or v_ip <<= '127.0.0.0/8'::inet
    or v_ip <<= '169.254.0.0/16'::inet
    or v_ip <<= '172.16.0.0/12'::inet
    or v_ip <<= '192.0.0.0/24'::inet
    or v_ip <<= '192.0.2.0/24'::inet
    or v_ip <<= '192.88.99.0/24'::inet
    or v_ip <<= '192.168.0.0/16'::inet
    or v_ip <<= '198.18.0.0/15'::inet
    or v_ip <<= '198.51.100.0/24'::inet
    or v_ip <<= '203.0.113.0/24'::inet
    or v_ip <<= '224.0.0.0/4'::inet
    or v_ip <<= '240.0.0.0/4'::inet
  ) then
    raise exception 'Indica la IP pública del servidor, no una dirección privada, local o reservada.';
  end if;

  -- Public IPv6 global-unicast only; exclude documentation and protocol-reserved space.
  if family(v_ip) = 6 and (
       not (v_ip <<= '2000::/3'::inet)
    or v_ip <<= '2001:db8::/32'::inet
    or v_ip <<= '2001::/23'::inet
  ) then
    raise exception 'Indica una IPv6 pública global, no local ni reservada.';
  end if;

  return query select v_ip, v_port;
end;
$function$


REVOKE ALL ON FUNCTION private.parse_mta_server_binding(text, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dripx_save_account_license_binding(p_server_ip text, p_server_port integer DEFAULT NULL::integer, p_admin_account_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_ip inet;
  v_port integer;
  v_name text := nullif(btrim(coalesce(p_admin_account_name,'')),'');
  v_license public.account_licenses%rowtype;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not public.is_account_active() then
    raise exception 'account_inactive' using errcode='42501';
  end if;

  select parsed.server_ip, parsed.server_port
    into v_ip, v_port
  from private.parse_mta_server_binding(p_server_ip, p_server_port) as parsed;

  if v_name is not null and (length(v_name)>64 or v_name !~ '^[A-Za-z0-9_.-]{1,64}$') then
    raise exception 'El nombre de cuenta MTA admite 1–64 letras, números, punto, guion o guion bajo.';
  end if;

  perform public.issue_account_license_for_user(v_user);
  select * into v_license
  from public.account_licenses
  where user_id=v_user
  for update;

  if not found then
    raise exception 'account_license_not_found';
  end if;
  if v_license.status <> 'active' then
    raise exception 'account_license_revoked' using errcode='42501';
  end if;

  -- A server move revokes the previous installation. The new IP/port can
  -- activate with the same account key on its next online validation.
  update public.account_license_activations
  set is_active=false, revoked_at=now()
  where account_license_id=v_license.id
    and is_active=true
    and (server_ip is distinct from v_ip or server_port is distinct from v_port);

  update public.account_licenses
  set bound_server_ip=v_ip,
      bound_server_port=v_port,
      authorized_account_name=v_name,
      updated_at=now()
  where id=v_license.id;

  return jsonb_build_object(
    'saved',true,
    'server_ip',host(v_ip),
    'server_port',v_port,
    'authorized_account_name',v_name
  );
end;
$function$


REVOKE ALL ON FUNCTION public.dripx_save_account_license_binding(text, integer, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.dripx_save_account_license_binding(text, integer, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dripx_save_license_binding(p_license_id uuid, p_server_ip text, p_server_port integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_license public.dripx_resource_licenses%rowtype;
  v_ip inet;
  v_port integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode='42501';
  end if;

  select parsed.server_ip, parsed.server_port
    into v_ip, v_port
  from private.parse_mta_server_binding(p_server_ip, p_server_port) as parsed;

  select * into v_license
  from public.dripx_resource_licenses
  where id=p_license_id and user_id=auth.uid()
  for update;

  if not found then
    raise exception 'Licencia no encontrada.';
  end if;
  if v_license.status <> 'active' then
    raise exception 'La licencia está revocada.';
  end if;
  if not exists (
    select 1 from public.dripx_entitlements e
    where e.user_id=auth.uid()
      and e.product_id=v_license.product_id
      and e.active=true
  ) then
    raise exception 'La compra ya no tiene acceso activo.';
  end if;

  if exists (
    select 1 from public.dripx_license_activations a
    where a.license_id=v_license.id
      and a.is_active=true
  ) and (v_license.server_ip is distinct from v_ip or v_license.server_port is distinct from v_port) then
    raise exception 'El servidor ya está activado. Pide a administración liberar la activación antes de cambiar IP o puerto.';
  end if;

  update public.dripx_resource_licenses
  set server_ip=v_ip,server_port=v_port,updated_at=now()
  where id=v_license.id;

  return jsonb_build_object('saved',true,'server_ip',host(v_ip),'server_port',v_port);
end;
$function$


REVOKE ALL ON FUNCTION public.dripx_save_license_binding(uuid, text, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.dripx_save_license_binding(uuid, text, integer) TO authenticated, service_role;
