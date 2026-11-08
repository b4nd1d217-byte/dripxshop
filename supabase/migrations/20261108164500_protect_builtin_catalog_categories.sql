create or replace function public.dripx_protect_builtin_categories()
returns trigger language plpgsql set search_path=public
as $$
begin
 if old.slug in ('planes','productos') then
   if tg_op='DELETE' then
     raise exception 'Las categorías del sistema Planes y Productos son obligatorias y no se pueden eliminar.' using errcode='23514';
   end if;
   if new.slug is distinct from old.slug or new.name is distinct from old.name or new.active is not true then
     raise exception 'Las categorías del sistema Planes y Productos no se pueden renombrar ni desactivar.' using errcode='23514';
   end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
drop trigger if exists dripx_categories_builtin_guard on public.dripx_categories;
create trigger dripx_categories_builtin_guard
before update or delete on public.dripx_categories
for each row execute function public.dripx_protect_builtin_categories();