-- Separate downloadable catalog products from plans and expose audited admin actions.
create or replace function public.dripx_admin_save_plan_resources(p_plan_product_id uuid,p_resource_product_ids uuid[])
returns integer
language plpgsql security definer set search_path=public
as $$
declare v_ids uuid[] := coalesce(p_resource_product_ids,'{}'::uuid[]); v_count integer := 0;
begin
 if auth.uid() is null or not public.dripx_is_admin() then raise exception 'No autorizado.' using errcode='42501'; end if;
 if cardinality(v_ids)>100 then raise exception 'Un plan no puede incluir más de 100 productos.' using errcode='22023'; end if;
 if not exists(select 1 from public.dripx_products p where p.id=p_plan_product_id and p.product_type='plan' and p.category='Planes' and p.file_path is null and p.protection_enabled=false) then
   raise exception 'El registro seleccionado no es un plan válido sin ZIP.' using errcode='22023';
 end if;
 if exists(
   select 1 from unnest(v_ids) selected(resource_id)
   left join public.dripx_products r on r.id=selected.resource_id
     and r.product_type='resource' and r.category='Productos'
     and r.status='published' and r.file_path is not null
   where r.id is null
 ) then raise exception 'Solo se pueden incluir productos publicados de la categoría Productos con ZIP disponible.' using errcode='22023'; end if;
 delete from public.dripx_plan_resources where plan_product_id=p_plan_product_id;
 insert into public.dripx_plan_resources(plan_product_id,resource_product_id)
 select p_plan_product_id,x.resource_id from (select distinct unnest(v_ids) resource_id) x on conflict do nothing;
 get diagnostics v_count=row_count;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'plan.resources.updated','product',p_plan_product_id,jsonb_build_object('resource_ids',v_ids,'count',v_count));
 return v_count;
end $$;

create or replace function public.dripx_admin_update_catalog_item(
 p_product_id uuid,p_title text,p_description text,p_price_usd numeric,p_tagline text,
 p_image_url text,p_plan_code text,p_billing_period text,p_features jsonb,p_resource_product_ids uuid[]
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_product public.dripx_products%rowtype; v_ids uuid[]:=coalesce(p_resource_product_ids,'{}'::uuid[]); v_count integer:=0;
begin
 if auth.uid() is null or not public.dripx_is_admin() then raise exception 'No autorizado.' using errcode='42501'; end if;
 select * into v_product from public.dripx_products where id=p_product_id for update;
 if not found then raise exception 'El elemento ya no existe.' using errcode='P0002'; end if;
 if length(btrim(coalesce(p_title,'')))<2 or length(btrim(coalesce(p_title,'')))>100 then raise exception 'El título debe tener entre 2 y 100 caracteres.'; end if;
 if length(coalesce(p_description,''))>8000 or length(coalesce(p_tagline,''))>180 then raise exception 'La descripción o frase corta supera el límite permitido.'; end if;
 if p_price_usd is null or p_price_usd<0 or p_price_usd>100000 then raise exception 'Precio no válido.'; end if;
 if nullif(btrim(coalesce(p_image_url,'')),'') is not null and p_image_url !~* '^https://[^[:space:]]+$' then raise exception 'La imagen debe ser una URL HTTPS válida.'; end if;
 if v_product.product_type='plan' then
   if v_product.file_path is not null or coalesce(v_product.protection_enabled,false) then raise exception 'Un plan no puede contener ZIP ni protección de archivos.'; end if;
   if coalesce(p_plan_code,'') !~ '^[a-z0-9_-]{2,40}$' then raise exception 'Código de plan no válido.'; end if;
   if cardinality(v_ids)>100 then raise exception 'Un plan no puede incluir más de 100 productos.'; end if;
   if exists(
     select 1 from unnest(v_ids) selected(resource_id)
     left join public.dripx_products r on r.id=selected.resource_id
       and r.product_type='resource' and r.category='Productos'
       and r.status='published' and r.file_path is not null
     where r.id is null
   ) then raise exception 'Los recursos deben ser productos publicados de la categoría Productos y tener ZIP.'; end if;
   update public.dripx_products set title=btrim(p_title),description=coalesce(p_description,''),price_usd=p_price_usd,
     category='Planes',tagline=coalesce(p_tagline,''),image_url=nullif(btrim(coalesce(p_image_url,'')),''),
     plan_code=lower(btrim(p_plan_code)),billing_period=coalesce(p_billing_period,''),features=coalesce(p_features,'[]'::jsonb),
     file_path=null,protection_enabled=false,updated_at=now()
   where id=p_product_id;
   delete from public.dripx_plan_resources where plan_product_id=p_product_id;
   insert into public.dripx_plan_resources(plan_product_id,resource_product_id)
     select p_product_id,x.resource_id from (select distinct unnest(v_ids) resource_id) x on conflict do nothing;
   get diagnostics v_count=row_count;
 else
   if v_product.product_type<>'resource' then raise exception 'Tipo de producto no compatible.'; end if;
   update public.dripx_products set title=btrim(p_title),description=coalesce(p_description,''),price_usd=p_price_usd,
     category='Productos',tagline=coalesce(p_tagline,''),image_url=nullif(btrim(coalesce(p_image_url,'')),''),
     updated_at=now()
   where id=p_product_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case when v_product.product_type='plan' then 'plan.updated' else 'product.updated' end,
 'product',p_product_id,jsonb_build_object('title',btrim(p_title),'price_usd',p_price_usd,'resource_count',v_count));
 return jsonb_build_object('id',p_product_id,'product_type',v_product.product_type,'resources_assigned',v_count);
end $$;

create or replace function public.dripx_admin_set_catalog_status(p_product_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public
as $$
declare v_product public.dripx_products%rowtype;
begin
 if auth.uid() is null or not public.dripx_is_admin() then raise exception 'No autorizado.' using errcode='42501'; end if;
 if p_status not in ('draft','published','archived') then raise exception 'Estado no permitido.'; end if;
 select * into v_product from public.dripx_products where id=p_product_id for update;
 if not found then raise exception 'El elemento no existe.'; end if;
 if v_product.product_type='plan' and (v_product.file_path is not null or coalesce(v_product.protection_enabled,false)) then raise exception 'Los planes no pueden tener ZIP ni protección.'; end if;
 if v_product.product_type='resource' and p_status='published' and v_product.file_path is null then raise exception 'No se puede publicar un producto sin ZIP.'; end if;
 update public.dripx_products set status=p_status,updated_at=now() where id=p_product_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case p_status when 'published' then 'catalog.item.published' when 'archived' then 'catalog.item.hidden' else 'catalog.item.drafted' end,
 'product',p_product_id,jsonb_build_object('previous_status',v_product.status,'status',p_status,'product_type',v_product.product_type));
end $$;

revoke all on function public.dripx_admin_save_plan_resources(uuid,uuid[]) from public,anon;
revoke all on function public.dripx_admin_update_catalog_item(uuid,text,text,numeric,text,text,text,text,jsonb,uuid[]) from public,anon;
revoke all on function public.dripx_admin_set_catalog_status(uuid,text) from public,anon;
grant execute on function public.dripx_admin_save_plan_resources(uuid,uuid[]) to authenticated;
grant execute on function public.dripx_admin_update_catalog_item(uuid,text,text,numeric,text,text,text,text,jsonb,uuid[]) to authenticated;
grant execute on function public.dripx_admin_set_catalog_status(uuid,text) to authenticated;