create or replace function public.dripx_public_top_buyers()
returns table(
  buyer_rank integer,
  buyer_name text,
  purchase_count bigint,
  avatar_url text
)
language sql
stable
security definer
set search_path to ''
as $function$
  with totals as (
    select o.user_id,
           count(i.id)::bigint as purchases,
           coalesce(sum(i.unit_price), 0)::numeric as spent
      from public.dripx_orders o
      join public.dripx_order_items i on i.order_id=o.id
      join public.dripx_profiles p
        on p.user_id=o.user_id
       and p.leaderboard_public is true
       and p.active is true
     where o.status='approved'
     group by o.user_id
  ),
  ranked as (
    select t.user_id,t.purchases,t.spent,
           row_number() over(order by t.purchases desc,t.spent desc,t.user_id) as pos
      from totals t
  )
  select r.pos::integer,
         coalesce(nullif(p.display_name,''),'Comprador'),
         r.purchases,
         p.avatar_url
    from ranked r
    join public.dripx_profiles p on p.user_id=r.user_id
   where r.pos <= 3
     and p.leaderboard_public is true
     and p.active is true
   order by r.pos;
$function$;
