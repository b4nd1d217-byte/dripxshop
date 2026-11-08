create or replace function public.dripx_admin_create_plan(
 p_title text,p_description text,p_price_usd numeric,p_tagline text,p_image_url text,
 p_plan_code text,p_billing_period text,p_features jsonb,p_resource_product_ids uuid[]
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_ids uuid[]:=coalesce(p_resource_product_ids,'{}'::uuid[]); v_count integer:=0; v_code text:=lower(btrim(coalesce(p_plan_code,'')));
begin
 if auth.uid() is null or not public.dripx_is_admin() then raise exception 'No autorizado.' using errcode='42501'; end if;
 if length(btrim(coalesce(p_title,'')))<2 or length(btrim(coalesce(p_title,'')))>100 then raise exception 'El nombre del plan debe tener entre 2 y 100 caracteres.'; end if;
 if length(coalesce(p_description,''))>8000 or length(coalesce(p_tagline,''))>180 then raise exception 'La descripción o frase corta supera el límite permitido.'; end if;
 if p_price_usd is null or p_price_usd<0 or p_price_usd>100000 then raise exception 'Precio no válido.'; end if;
 if v_code !~ '^[a-z0-9_-]{2,40}$' then raise exception 'Código de plan no válido.'; end if;
 if exists(select 1 from public.dripx_products where product_type='plan' and lower(plan_code)=v_code) then raise exception 'Ese código de plan ya existe.'; end if;
 if coalesce(p_billing_period,'monthly') not in ('monthly','yearly','lifetime') then raise exception 'Duración de plan no permitida.'; end if;
 if nullif(btrim(coalesce(p_image_url,'')),'') is not null and p_image_url !~* '^https://[^[:space:]]+$' then raise exception 'La imagen debe ser una URL HTTPS válida.'; end if;
 if coalesce(jsonb_typeof(p_features),'array')<>'array' or jsonb_array_length(coalesce(p_features,'[]'::jsonb))>30 then raise exception 'Las características deben ser una lista de hasta 30 elementos.'; end if;
 if cardinality(v_ids)>100 then raise exception 'Un plan no puede incluir más de 100 productos.'; end if;
 if exists(
   select 1 from unnest(v_ids) selected(resource_id)
   left join public.dripx_products r on r.id=selected.resource_id
     and r.product_type='resource' and r.category='Productos'
     and r.status='published' and r.file_path is not null
   where r.id is null
 ) then raise exception 'Solo se pueden incluir productos publicados de la categoría Productos con ZIP disponible.'; end if;
 insert into public.dripx_products(
   title,description,price_usd,category,status,featured,product_type,plan_code,billing_period,features,
   tagline,is_featured,image_url,protection_enabled,file_path
 ) values(
   btrim(p_title),coalesce(p_description,''),p_price_usd,'Planes','draft',false,'plan',v_code,
   coalesce(p_billing_period,'monthly'),coalesce(p_features,'[]'::jsonb),
   coalesce(p_tagline,''),false,nullif(btrim(coalesce(p_image_url,'')),''),false,null
 ) returning id into v_id;
 insert into public.dripx_plan_resources(plan_product_id,resource_product_id)
 select v_id,x.resource_id from (select distinct unnest(v_ids) resource_id) x on conflict do nothing;
 get diagnostics v_count=row_count;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'plan.created','product',v_id,jsonb_build_object('title',btrim(p_title),'plan_code',v_code,'price_usd',p_price_usd,'billing_period',coalesce(p_billing_period,'monthly'),'resource_count',v_count));
 return jsonb_build_object('id',v_id,'product_type','plan','status','draft','resources_assigned',v_count);
end $$;
revoke all on function public.dripx_admin_create_plan(text,text,numeric,text,text,text,text,jsonb,uuid[]) from public,anon;
grant execute on function public.dripx_admin_create_plan(text,text,numeric,text,text,text,text,jsonb,uuid[]) to authenticated;