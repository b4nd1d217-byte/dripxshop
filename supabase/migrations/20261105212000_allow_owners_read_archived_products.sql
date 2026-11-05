-- Archived products are hidden from the public catalogue, but current owners
-- retain access to their own archived resource or active plan.
DROP POLICY IF EXISTS dripx_products_owned_archived_read ON public.dripx_products;
CREATE POLICY dripx_products_owned_archived_read
ON public.dripx_products
FOR SELECT
TO authenticated
USING (
  status = 'archived'
  AND (
    (
      product_type = 'resource'
      AND (
        EXISTS (
          SELECT 1
          FROM public.dripx_entitlements e
          WHERE e.product_id = dripx_products.id
            AND e.user_id = (SELECT auth.uid())
            AND e.active = true
            AND (
              e.order_id IS NULL
              OR EXISTS (
                SELECT 1 FROM public.dripx_orders o
                WHERE o.id = e.order_id
                  AND o.user_id = (SELECT auth.uid())
                  AND o.status = 'approved'
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.dripx_plan_resources pr
          JOIN public.dripx_user_plans up ON up.product_id = pr.plan_product_id
          WHERE pr.resource_product_id = dripx_products.id
            AND up.user_id = (SELECT auth.uid())
            AND up.active = true
            AND (up.expires_at IS NULL OR up.expires_at > now())
            AND (
              up.order_id IS NULL
              OR EXISTS (
                SELECT 1 FROM public.dripx_orders o
                WHERE o.id = up.order_id
                  AND o.user_id = (SELECT auth.uid())
                  AND o.status = 'approved'
              )
            )
        )
      )
    )
    OR (
      product_type = 'plan'
      AND EXISTS (
        SELECT 1
        FROM public.dripx_user_plans up
        WHERE up.product_id = dripx_products.id
          AND up.user_id = (SELECT auth.uid())
          AND up.active = true
          AND (up.expires_at IS NULL OR up.expires_at > now())
          AND (
            up.order_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.dripx_orders o
              WHERE o.id = up.order_id
                AND o.user_id = (SELECT auth.uid())
                AND o.status = 'approved'
            )
          )
      )
    )
  )
);
