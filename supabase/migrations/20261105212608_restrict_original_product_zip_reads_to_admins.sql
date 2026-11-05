drop policy if exists "dripx_product_files_entitled_read" on storage.objects;
drop policy if exists "product_files_entitled_read" on storage.objects;

create policy "dripx_product_files_admin_read_only"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-files'
  and public.dripx_is_admin()
);
