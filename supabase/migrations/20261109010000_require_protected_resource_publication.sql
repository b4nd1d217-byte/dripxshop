-- A downloadable resource must never be published or delivered in source form.
-- The ZIP upload and buyer download handlers additionally validate its MTA bytecode and DRIPX guard.
ALTER TABLE public.dripx_products
  ADD CONSTRAINT dripx_published_resource_requires_protection
  CHECK (
    product_type IS DISTINCT FROM 'resource'
    OR status IS DISTINCT FROM 'published'
    OR (protection_enabled IS TRUE AND file_path IS NOT NULL)
  );
