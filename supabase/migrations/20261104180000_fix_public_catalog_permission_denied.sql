-- Public catalog requests must not execute the privileged admin predicate.
-- The helper is safe for anon: auth.uid() is NULL and the function returns false.
GRANT EXECUTE ON FUNCTION public.dripx_is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS dripx_categories_read_authenticated ON public.dripx_categories;
DROP POLICY IF EXISTS dripx_categories_read_anon ON public.dripx_categories;
CREATE POLICY dripx_categories_read_anon
  ON public.dripx_categories FOR SELECT TO anon
  USING (active);
CREATE POLICY dripx_categories_read_authenticated
  ON public.dripx_categories FOR SELECT TO authenticated
  USING (active OR (SELECT public.dripx_is_admin()));

DROP POLICY IF EXISTS dripx_products_public_read_authenticated ON public.dripx_products;
DROP POLICY IF EXISTS dripx_products_public_read_anon ON public.dripx_products;
CREATE POLICY dripx_products_public_read_anon
  ON public.dripx_products FOR SELECT TO anon
  USING (status = 'published');
CREATE POLICY dripx_products_public_read_authenticated
  ON public.dripx_products FOR SELECT TO authenticated
  USING (status = 'published' OR (SELECT public.dripx_is_admin()));
