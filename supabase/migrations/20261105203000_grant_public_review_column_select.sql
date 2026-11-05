-- Allow public clients to read only the fields used for published product reviews.
-- Row-level security still limits anon to rows where published = true.
GRANT SELECT (id, product_id, rating, body, public_name, published, created_at, updated_at)
ON TABLE public.dripx_reviews TO anon;
