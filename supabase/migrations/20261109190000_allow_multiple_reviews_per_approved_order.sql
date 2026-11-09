-- Allow one verified review per purchase line, not just one lifetime review per user/product.
-- The retained unique key is (order_id, product_id, user_id), so repeat purchases may be reviewed separately.
DROP INDEX IF EXISTS public.dripx_reviews_user_product_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS dripx_reviews_order_id_product_id_user_id_key
ON public.dripx_reviews (order_id, product_id, user_id);
