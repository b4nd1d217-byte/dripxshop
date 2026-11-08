-- DRIP X SHOP: real user administration, product grants, suspension and audit trail
create or replace function public.dripx_admin_list_users()
returns table(user_id uuid, discord_id text, display_name text, avatar_url text, role text, active boolean, created_at timestamptz, email text)
language plpgsql security definer set search_path=public,auth
as $$
begin
  if not public.dripx_is_admin() then raise exception 'Solo administración puede consultar usuarios'; end if;
  return query
  select u.id,coalesce(p.discord_id,u.raw_user_meta_data->>'provider_id',u.raw_user_meta_data->>'sub'),
    coalesce(p.display_name,u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'global_name',u.raw_user_meta_data->>'name','Usuario Discord'),
    coalesce(p.avatar_url,case when u.raw_user_meta_data->>'avatar_url' like 'http%' then u.raw_user_meta_data->>'avatar_url'
      when u.raw_user_meta_data->>'avatar' is not null and coalesce(p.discord_id,u.raw_user_meta_data->>'provider_id') is not null
      then 'https://cdn.discordapp.com/avatars/'||coalesce(p.discord_id,u.raw_user_meta_data->>'provider_id')||'/'||u.raw_user_meta_data->>'avatar'||'.png' end),
    coalesce(p.role,'user'),coalesce(p.active,true),coalesce(p.created_at,u.created_at),u.email
  from auth.users u left join public.dripx_profiles p on p.user_id=u.id
  order by coalesce(p.display_name,u.raw_user_meta_data->>'global_name',u.email,'') asc;
end $$;
create or replace function public.dripx_admin_set_user_role(p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path=public as $$
declare old_role text;
begin
 if not public.dripx_is_admin() then raise exception 'Solo administración puede cambiar roles'; end if;
 if p_role not in ('user','support','moderator') then raise exception 'Rol no permitido'; end if;
 select role into old_role from public.dripx_profiles where user_id=p_user_id for update;
 if not found then raise exception 'El perfil del usuario no existe'; end if;
 if old_role='admin' then raise exception 'No se puede modificar el rol de un administrador desde este panel'; end if;
 update public.dripx_profiles set role=p_role,updated_at=now() where user_id=p_user_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'user.role.updated','user',p_user_id,jsonb_build_object('from',old_role,'to',p_role));
end $$;
create or replace function public.dripx_admin_set_user_suspension(p_user_id uuid,p_suspended boolean,p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
declare old_active boolean; old_role text;
begin
 if not public.dripx_is_admin() then raise exception 'Solo administración puede suspender usuarios'; end if;
 select active,role into old_active,old_role from public.dripx_profiles where user_id=p_user_id for update;
 if not found then raise exception 'El perfil del usuario no existe'; end if;
 if old_role='admin' then raise exception 'No se puede suspender a un administrador desde este panel'; end if;
 update public.dripx_profiles set active=not p_suspended,updated_at=now() where user_id=p_user_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),case when p_suspended then 'user.suspended' else 'user.reactivated' end,'user',p_user_id,jsonb_build_object('reason',left(coalesce(p_reason,''),500),'previous_active',old_active));
end $$;
create or replace function public.dripx_admin_grant_user_product(p_user_id uuid,p_product_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare entitlement_id uuid;
begin
 if not public.dripx_is_admin() then raise exception 'Solo administración puede asignar productos'; end if;
 if not exists(select 1 from public.dripx_profiles where user_id=p_user_id and active=true) then raise exception 'El usuario no existe o está suspendido'; end if;
 if not exists(select 1 from public.dripx_products where id=p_product_id and status='published' and product_type='resource' and file_path is not null) then raise exception 'El producto no está publicado o no tiene ZIP'; end if;
 select id into entitlement_id from public.dripx_entitlements where user_id=p_user_id and product_id=p_product_id and active=true limit 1;
 if entitlement_id is null then insert into public.dripx_entitlements(user_id,product_id,active,granted_at) values(p_user_id,p_product_id,true,now()) returning id into entitlement_id; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'user.product.granted','user',p_user_id,jsonb_build_object('product_id',p_product_id,'entitlement_id',entitlement_id));
 return entitlement_id;
end $$;
create or replace function public.dripx_admin_revoke_user_product(p_user_id uuid,p_product_id uuid,p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.dripx_is_admin() then raise exception 'Solo administración puede quitar productos'; end if;
 update public.dripx_entitlements set active=false where user_id=p_user_id and product_id=p_product_id and active=true;
 if not found then raise exception 'El usuario no tiene una asignación directa activa de ese producto'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'user.product.revoked','user',p_user_id,jsonb_build_object('product_id',p_product_id,'reason',left(coalesce(p_reason,''),500)));
end $$;
create or replace function public.dripx_admin_get_user_audit(p_user_id uuid)
returns table(id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,details jsonb,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
 if not public.dripx_is_admin() then raise exception 'Solo administración puede consultar registros'; end if;
 return query select a.id,a.actor_id,a.action,a.entity_type,a.entity_id,a.details,a.created_at from public.audit_logs a where a.entity_type='user' and a.entity_id=p_user_id order by a.created_at desc limit 100;
end $$;
revoke all on function public.dripx_admin_list_users() from public,anon;
revoke all on function public.dripx_admin_set_user_role(uuid,text) from public,anon;
revoke all on function public.dripx_admin_set_user_suspension(uuid,boolean,text) from public,anon;
revoke all on function public.dripx_admin_grant_user_product(uuid,uuid) from public,anon;
revoke all on function public.dripx_admin_revoke_user_product(uuid,uuid,text) from public,anon;
revoke all on function public.dripx_admin_get_user_audit(uuid) from public,anon;
grant execute on function public.dripx_admin_list_users() to authenticated;
grant execute on function public.dripx_admin_set_user_role(uuid,text) to authenticated;
grant execute on function public.dripx_admin_set_user_suspension(uuid,boolean,text) to authenticated;
grant execute on function public.dripx_admin_grant_user_product(uuid,uuid) to authenticated;
grant execute on function public.dripx_admin_revoke_user_product(uuid,uuid,text) to authenticated;
grant execute on function public.dripx_admin_get_user_audit(uuid) to authenticated;