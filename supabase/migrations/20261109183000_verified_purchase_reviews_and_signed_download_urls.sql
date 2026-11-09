-- Verified-purchase reviews for DRIP X SHOP.
-- The public product catalog reads a lightweight database aggregate; review writes remain buyer-only.
ALTER TABLE public.dripx_reviews
  ALTER COLUMN order_id SET NOT NULL;

DROP POLICY IF EXISTS dripx_reviews_entitlement_insert ON public.dripx_reviews;
DROP POLICY IF EXISTS dripx_reviews_owner_update ON public.dripx_reviews;

CREATE POLICY dripx_reviews_verified_purchase_insert
ON public.dripx_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND order_id IS NOT NULL
  AND published IS TRUE
  AND EXISTS (
    SELECT 1
    FROM public.dripx_orders AS o
    JOIN public.dripx_order_items AS oi ON oi.order_id = o.id
    WHERE o.id = dripx_reviews.order_id
      AND o.user_id = (SELECT auth.uid())
      AND o.status = 'approved'
      AND oi.product_id = dripx_reviews.product_id
  )
);

CREATE POLICY dripx_reviews_verified_purchase_update
ON public.dripx_reviews
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.dripx_orders AS o
    JOIN public.dripx_order_items AS oi ON oi.order_id = o.id
    WHERE o.id = dripx_reviews.order_id
      AND o.user_id = (SELECT auth.uid())
      AND o.status = 'approved'
      AND oi.product_id = dripx_reviews.product_id
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND order_id IS NOT NULL
  AND published IS TRUE
  AND EXISTS (
    SELECT 1
    FROM public.dripx_orders AS o
    JOIN public.dripx_order_items AS oi ON oi.order_id = o.id
    WHERE o.id = dripx_reviews.order_id
      AND o.user_id = (SELECT auth.uid())
      AND o.status = 'approved'
      AND oi.product_id = dripx_reviews.product_id
  )
);

CREATE INDEX IF NOT EXISTS dripx_reviews_product_published_created_idx
ON public.dripx_reviews (product_id, created_at DESC)
WHERE published IS TRUE;

CREATE OR REPLACE VIEW public.dripx_product_review_stats
WITH (security_invoker = true)
AS
SELECT
  product_id,
  COUNT(*)::integer AS review_count,
  ROUND(AVG(rating)::numeric, 2) AS average_rating
FROM public.dripx_reviews
WHERE published IS TRUE
GROUP BY product_id;

GRANT SELECT ON public.dripx_reviews TO anon, authenticated;
GRANT SELECT ON public.dripx_product_review_stats TO anon, authenticated;
GRANT INSERT, UPDATE ON public.dripx_reviews TO authenticated;
REVOKE INSERT, UPDATE ON public.dripx_reviews FROM anon;
