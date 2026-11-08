-- Keep raw resource uploads unprotected unless the admin explicitly runs the DRIPX protection workflow.
-- ZIP readability, meta.xml and shader presence are independent of the protection flag.
create or replace function public.dripx_prepare_resource_identity()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.product_type = 'resource'
     or (new.file_path is not null and pg_catalog.btrim(new.file_path) <> '') then
    new.product_type := 'resource';
    new.resource_name := null;

    if new.protection_enabled is true then
      new.resource_manifest := pg_catalog.jsonb_set(
        (coalesce(new.resource_manifest, '{}'::jsonb) - 'resource_name'),
        '{license_protocol}',
        '"dripx-v2"'::jsonb,
        true
      );
    else
      new.resource_manifest := coalesce(new.resource_manifest, '{}'::jsonb) - 'license_protocol' - 'resource_name';
    end if;
  end if;
  return new;
end;
$function$;
