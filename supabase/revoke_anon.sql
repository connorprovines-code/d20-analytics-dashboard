-- =====================================================
-- Lock the analytics functions to server-side use only
-- =====================================================
-- The dashboard now calls these functions server-side over DATABASE_URL (role postgres),
-- so the public anon key no longer needs EXECUTE. Apply this in the Supabase SQL editor
-- AFTER the server-side dashboard is deployed and verified; before that the old
-- browser build still depends on anon access.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so PUBLIC is revoked too;
-- otherwise anon/authenticated would still inherit it.
--
-- To check afterwards (should return false for anon):
--   select has_function_privilege('anon', 'public.get_overview_stats()', 'execute');

begin;

revoke execute on function
  public.get_signup_metrics(integer),
  public.get_campaign_metrics(integer),
  public.get_overview_stats(),
  public.get_activity_metrics(integer),
  public.get_daily_active_users(integer),
  public.get_dau_today(),
  public.get_game_system_breakdown(),
  public.get_collaboration_metrics(),
  public.get_feature_utilization(),
  public.get_features_by_game_system(),
  public.get_item_stats(),
  public.get_dnd_rarity_breakdown(),
  public.get_transaction_breakdown(),
  public.get_gold_economy_stats(),
  public.get_campaign_engagement(),
  public.get_user_retention()
from public, anon, authenticated;

grant execute on function
  public.get_signup_metrics(integer),
  public.get_campaign_metrics(integer),
  public.get_overview_stats(),
  public.get_activity_metrics(integer),
  public.get_daily_active_users(integer),
  public.get_dau_today(),
  public.get_game_system_breakdown(),
  public.get_collaboration_metrics(),
  public.get_feature_utilization(),
  public.get_features_by_game_system(),
  public.get_item_stats(),
  public.get_dnd_rarity_breakdown(),
  public.get_transaction_breakdown(),
  public.get_gold_economy_stats(),
  public.get_campaign_engagement(),
  public.get_user_retention()
to postgres, service_role;

commit;

-- ROLLBACK (restores the previous public access; run only if something that still
-- uses the anon key breaks):
--
-- grant execute on function
--   public.get_signup_metrics(integer),
--   public.get_campaign_metrics(integer),
--   public.get_overview_stats(),
--   public.get_activity_metrics(integer),
--   public.get_daily_active_users(integer),
--   public.get_dau_today(),
--   public.get_game_system_breakdown(),
--   public.get_collaboration_metrics(),
--   public.get_feature_utilization(),
--   public.get_features_by_game_system(),
--   public.get_item_stats(),
--   public.get_dnd_rarity_breakdown(),
--   public.get_transaction_breakdown(),
--   public.get_gold_economy_stats(),
--   public.get_campaign_engagement(),
--   public.get_user_retention()
-- to public, anon, authenticated;
