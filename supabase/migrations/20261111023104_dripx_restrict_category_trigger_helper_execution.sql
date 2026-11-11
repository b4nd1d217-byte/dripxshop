-- The function is an internal trigger guard, not a public RPC.
-- PostgreSQL fires the existing trigger without requiring clients to call this function.
REVOKE ALL ON FUNCTION public.dripx_protect_system_categories() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dripx_protect_system_categories() TO postgres;
