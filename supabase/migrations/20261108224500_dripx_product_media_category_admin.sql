create or replace function public.dripx_admin_update_product_details(
  p_product_id uuid,
  p_store_category text,
  p_image_url text default null,
  p_video_url text default null,
  p_image_path text default null,
  p_video_path text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.dripx_products%rowtype;
  v_category text := lower(btrim(coalesce(p_store_category,'')));
  v_image_url text := nullif(btrim(coalesce(p_image_url,'')),'');
  v_video_url text := nullif(btrim(coalesce(p_video_url,'')),'');
  v_image_path text := nullif(btrim(coalesce(p_image_path,'')),'');
  v_video_path text := nullif(btrim(coalesce(p_video_path,'')),'');
begin
  if auth.uid() is null or not public.dripx_is_admin() then
    raise exception 'No autorizado.' using errcode='42501';
  end if;
  select * into v_product from public.dripx_products where id=p_product_id for update;
  if not found then raise exception 'El producto no existe.' using errcode='P0002'; end if;
  if v_product.product_type <> 'resource' then
    raise exception 'Esta operación solo admite productos descargables.' using errcode='23514';
  end if;
  if v_category in ('','planes','productos') or not exists (
    select 1 from public.dripx_categories c
    where c.slug=v_category and c.active=true and c.slug not in ('planes','productos')
  ) then
    raise exception 'Selecciona una categoría de producto activa.' using errcode='23514';
  end if;
  if v_image_url is not null and v_image_url !~* '^https://[^[:space:]]+$' then
    raise exception 'La imagen debe usar una URL HTTPS válida.';
  end if;
  if v_video_url is not null and v_video_url !~* '^https://[^[:space:]]+$' then
    raise exception 'El vídeo debe usar una URL HTTPS válida.';
  end if;
  if v_image_path is not null and (v_image_path !~ ('^products/' || p_product_id::text || '/[A-Za-z0-9._-]+$') or v_image_path ~ '(^|/)\.\.(/|$)') then
    raise exception 'Ruta de imagen no válida.';
  end if;
  if v_video_path is not null and (v_video_path !~ ('^products/' || p_product_id::text || '/[A-Za-z0-9._-]+$') or v_video_path ~ '(^|/)\.\.(/|$)') then
    raise exception 'Ruta de vídeo no válida.';
  end if;
  update public.dripx_products set
    store_category=v_category,
    image_url=case when v_image_path is not null then null else v_image_url end,
    image_path=v_image_path,
    video_url=case when v_video_path is not null then null else v_video_url end,
    video_path=v_video_path,
    updated_at=now()
  where id=p_product_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'product.media_category.updated','product',p_product_id,
    jsonb_build_object('store_category',v_category,'image_path_changed',v_image_path is not null,
      'video_path_changed',v_video_path is not null,'image_url_set',v_image_url is not null,
      'video_url_set',v_video_url is not null));
  return jsonb_build_object('id',p_product_id,'store_category',v_category,'updated',true);
end;
$$;
revoke all on function public.dripx_admin_update_product_details(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.dripx_admin_update_product_details(uuid,text,text,text,text,text) to authenticated;
