-- Keep the administrative predicate callable only by authenticated users and service role.
-- Public catalogue policies are independent and do not require this function.
revoke execute on function public.dripx_is_admin() from anon;
grant execute on function public.dripx_is_admin() to authenticated, service_role;
