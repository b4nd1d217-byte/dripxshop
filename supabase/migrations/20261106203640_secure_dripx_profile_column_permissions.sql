begin;

revoke all privileges on table public.dripx_profiles from anon, authenticated;
revoke all (
  user_id, discord_id, display_name, avatar_url,
  role, active, created_at, updated_at, leaderboard_public
) on table public.dripx_profiles from anon, authenticated;

grant select on table public.dripx_profiles to authenticated;
grant update (leaderboard_public, updated_at)
  on table public.dripx_profiles to authenticated;

commit;
