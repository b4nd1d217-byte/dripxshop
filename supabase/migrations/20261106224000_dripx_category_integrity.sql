-- Keep DripX category references consistent and safe.
-- Renaming a category updates every DripX product that uses its old name.
-- Deleting a category with products, or disabling a category with published products,
-- is rejected at the database layer.

create or replace function public.dripx_guard_category_references()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.dripx_is_admin() then
    raise exception using errcode='42501', message='Solo administración puede modificar categorías.';
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.dripx_products p
      where lower(btrim(p.category)) = lower(btrim(old.name))
    ) then
      raise exception using errcode='23514',
        message='No se puede eliminar esta categoría porque todavía tiene productos asociados.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.active is true and new.active is false and exists (
      select 1 from public.dripx_products p
      where lower(btrim(p.category)) = lower(btrim(old.name))
        and p.status = 'published'
    ) then
      raise exception using errcode='23514',
        message='No se puede desactivar una categoría que tiene productos publicados. Mueve o archiva primero esos productos.';
    end if;

    if old.name is distinct from new.name then
      update public.dripx_products
         set category = new.name, updated_at = now()
       where lower(btrim(category)) = lower(btrim(old.name));
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists dripx_categories_guard_product_references on public.dripx_categories;
create trigger dripx_categories_guard_product_references
before update or delete on public.dripx_categories
for each row execute function public.dripx_guard_category_references();

create unique index if not exists dripx_categories_name_ci_key
on public.dripx_categories (lower(name));
