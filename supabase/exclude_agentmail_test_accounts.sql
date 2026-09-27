-- Exclude @agentmail.to accounts (the Play review account and other agent-made test accounts)
-- from every analytics function, next to the existing connor+provines test-account filter.
-- Generated 2026-09-27 from the live definitions (pg_get_functiondef). Owners, SECURITY DEFINER and
-- grants are unchanged by CREATE OR REPLACE. Rollback: D:/backups/d20-loot-tracker/2026-09-27-pre-agentmail-filter/functions-before.sql
begin;

CREATE OR REPLACE FUNCTION public.get_activity_metrics(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE(c.updated_at) as date,
    COUNT(DISTINCT c.id)::BIGINT as count
  FROM campaigns c
  LEFT JOIN auth.users u ON c.owner_id = u.id
  WHERE
    c.updated_at >= CURRENT_DATE - days_back
    -- Filter out test account campaigns
    AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
  GROUP BY DATE(c.updated_at)
  ORDER BY DATE(c.updated_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_campaign_engagement()
 RETURNS TABLE(avg_items_per_campaign numeric, avg_players_per_campaign numeric, avg_transactions_per_campaign numeric, max_items_in_campaign bigint, max_players_in_campaign bigint, campaigns_with_activity_30d bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM items GROUP BY campaign_id) sub)::NUMERIC,
    (SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM players GROUP BY campaign_id) sub)::NUMERIC,
    (SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM transactions GROUP BY campaign_id) sub)::NUMERIC,
    (SELECT COALESCE(MAX(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM items GROUP BY campaign_id) sub)::BIGINT,
    (SELECT COALESCE(MAX(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM players GROUP BY campaign_id) sub)::BIGINT,
    (SELECT COUNT(*)::BIGINT FROM campaigns c
     INNER JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= NOW() - INTERVAL '30 days'
       AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_campaign_metrics(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE(c.created_at) as date,
    COUNT(*)::BIGINT as count
  FROM campaigns c
  LEFT JOIN auth.users u ON c.owner_id = u.id
  WHERE
    c.created_at >= CURRENT_DATE - days_back
    -- Filter out campaigns owned by test accounts
    AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
  GROUP BY DATE(c.created_at)
  ORDER BY DATE(c.created_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_collaboration_metrics()
 RETURNS TABLE(total_invites_sent bigint, invites_accepted bigint, invites_pending bigint, multi_user_campaigns bigint, solo_campaigns bigint, avg_members_per_campaign numeric, contributors bigint, viewers bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_total_invites BIGINT;
  v_accepted BIGINT;
  v_pending BIGINT;
  v_multi_user BIGINT;
  v_solo BIGINT;
  v_avg_members NUMERIC;
  v_contributors BIGINT;
  v_viewers BIGINT;
  v_total_campaigns BIGINT;
BEGIN
  -- Total invites sent
  SELECT COUNT(*)::BIGINT INTO v_total_invites FROM campaign_invites;
  
  -- Invites accepted
  SELECT COUNT(*)::BIGINT INTO v_accepted FROM campaign_invites WHERE status = 'accepted';
  
  -- Invites pending
  SELECT COUNT(*)::BIGINT INTO v_pending FROM campaign_invites WHERE status = 'pending';
  
  -- Count campaigns with more than 1 member (multi-user)
  SELECT COUNT(*)::BIGINT INTO v_multi_user
  FROM (
    SELECT campaign_id
    FROM campaign_members
    GROUP BY campaign_id
    HAVING COUNT(*) > 1
  ) sub;
  
  -- Total campaigns (excluding test accounts)
  SELECT COUNT(*)::BIGINT INTO v_total_campaigns
  FROM campaigns c
  INNER JOIN auth.users u ON c.owner_id = u.id
  WHERE NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to');
  
  -- Solo campaigns = total - multi-user
  v_solo := v_total_campaigns - v_multi_user;
  
  -- Average members per campaign
  SELECT COALESCE(AVG(member_count), 1)::NUMERIC INTO v_avg_members
  FROM (
    SELECT COUNT(*)::NUMERIC as member_count 
    FROM campaign_members 
    GROUP BY campaign_id
  ) sub;
  
  -- Contributors (role = 'contributor')
  SELECT COUNT(*)::BIGINT INTO v_contributors 
  FROM campaign_members 
  WHERE role = 'contributor';
  
  -- Viewers (role = 'viewer')  
  SELECT COUNT(*)::BIGINT INTO v_viewers 
  FROM campaign_members 
  WHERE role = 'viewer';
  
  RETURN QUERY SELECT 
    v_total_invites,
    v_accepted,
    v_pending,
    v_multi_user,
    v_solo,
    v_avg_members,
    v_contributors,
    v_viewers;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_back integer DEFAULT 30)
 RETURNS TABLE(date text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH active_users AS (
    -- Users who created campaigns
    SELECT
      DATE_TRUNC('day', c.created_at) as activity_date,
      c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE c.created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')

    UNION

    -- Users who joined campaigns
    SELECT
      DATE_TRUNC('day', cm.joined_at) as activity_date,
      cm.user_id
    FROM campaign_members cm
    INNER JOIN auth.users u ON cm.user_id = u.id
    WHERE cm.joined_at >= NOW() - (days_back || ' days')::INTERVAL
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')

    UNION

    -- Users who updated campaigns
    SELECT
      DATE_TRUNC('day', c.updated_at) as activity_date,
      c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE c.updated_at >= NOW() - (days_back || ' days')::INTERVAL
      AND c.updated_at != c.created_at
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
  )
  SELECT
    TO_CHAR(activity_date, 'YYYY-MM-DD') as date,
    COUNT(DISTINCT user_id)::BIGINT as count
  FROM active_users
  GROUP BY activity_date
  ORDER BY activity_date ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dau_today()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  dau_count BIGINT;
BEGIN
  WITH active_users_today AS (
    -- Users who created campaigns today
    SELECT c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE DATE_TRUNC('day', c.created_at) = DATE_TRUNC('day', NOW())
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')

    UNION

    -- Users who joined campaigns today
    SELECT cm.user_id
    FROM campaign_members cm
    INNER JOIN auth.users u ON cm.user_id = u.id
    WHERE DATE_TRUNC('day', cm.joined_at) = DATE_TRUNC('day', NOW())
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')

    UNION

    -- Users who updated campaigns today
    SELECT c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE DATE_TRUNC('day', c.updated_at) = DATE_TRUNC('day', NOW())
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
  )
  SELECT COUNT(DISTINCT user_id)::BIGINT INTO dau_count
  FROM active_users_today;

  RETURN dau_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_features_by_game_system()
 RETURNS TABLE(game_system text, avg_items numeric, avg_players numeric, avg_transactions numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.game_system::TEXT,
    COALESCE(AVG(item_counts.cnt), 0)::NUMERIC as avg_items,
    COALESCE(AVG(player_counts.cnt), 0)::NUMERIC as avg_players,
    COALESCE(AVG(tx_counts.cnt), 0)::NUMERIC as avg_transactions
  FROM campaigns c
  INNER JOIN auth.users u ON c.owner_id = u.id
  LEFT JOIN (SELECT campaign_id, COUNT(*) as cnt FROM items GROUP BY campaign_id) item_counts ON c.id = item_counts.campaign_id
  LEFT JOIN (SELECT campaign_id, COUNT(*) as cnt FROM players GROUP BY campaign_id) player_counts ON c.id = player_counts.campaign_id
  LEFT JOIN (SELECT campaign_id, COUNT(*) as cnt FROM transactions GROUP BY campaign_id) tx_counts ON c.id = tx_counts.campaign_id
  WHERE NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
  GROUP BY c.game_system
  ORDER BY c.game_system;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_game_system_breakdown()
 RETURNS TABLE(game_system text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.game_system::TEXT, COUNT(*)::BIGINT
  FROM campaigns c
  INNER JOIN auth.users u ON c.owner_id = u.id
  WHERE NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
  GROUP BY c.game_system
  ORDER BY COUNT(*) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_overview_stats()
 RETURNS TABLE(total_users bigint, total_campaigns bigint, active_campaigns_7d bigint, new_users_7d bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Total users (excluding test accounts)
    (SELECT COUNT(*)
     FROM auth.users
     WHERE NOT (email ILIKE '%connor%' AND email ILIKE '%provines%') AND NOT (email ILIKE '%@agentmail.to')
    )::BIGINT as total_users,

    -- Total campaigns (excluding test account campaigns)
    (SELECT COUNT(*)
     FROM campaigns c
     LEFT JOIN auth.users u ON c.owner_id = u.id
     WHERE NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
    )::BIGINT as total_campaigns,

    -- Active campaigns in last 7 days (campaigns with recent activity)
    (SELECT COUNT(DISTINCT c.id)
     FROM campaigns c
     LEFT JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= CURRENT_DATE - 7
     AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
    )::BIGINT as active_campaigns_7d,

    -- New users in last 7 days
    (SELECT COUNT(*)
     FROM auth.users
     WHERE created_at >= CURRENT_DATE - 7
     AND NOT (email ILIKE '%connor%' AND email ILIKE '%provines%') AND NOT (email ILIKE '%@agentmail.to')
    )::BIGINT as new_users_7d;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_signup_metrics(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as count
  FROM auth.users
  WHERE
    created_at >= CURRENT_DATE - days_back
    -- Filter out test accounts (emails containing both "connor" AND "provines")
    AND NOT (email ILIKE '%connor%' AND email ILIKE '%provines%') AND NOT (email ILIKE '%@agentmail.to')
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_retention()
 RETURNS TABLE(users_active_week_1 bigint, users_active_week_2 bigint, users_active_week_3 bigint, users_active_week_4 bigint, users_active_this_month bigint, users_churned_30d bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT c.owner_id)::BIGINT FROM campaigns c
     INNER JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= NOW() - INTERVAL '7 days'
       AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')),
    (SELECT COUNT(DISTINCT c.owner_id)::BIGINT FROM campaigns c
     INNER JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= NOW() - INTERVAL '14 days' AND c.updated_at < NOW() - INTERVAL '7 days'
       AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')),
    (SELECT COUNT(DISTINCT c.owner_id)::BIGINT FROM campaigns c
     INNER JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= NOW() - INTERVAL '21 days' AND c.updated_at < NOW() - INTERVAL '14 days'
       AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')),
    (SELECT COUNT(DISTINCT c.owner_id)::BIGINT FROM campaigns c
     INNER JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= NOW() - INTERVAL '28 days' AND c.updated_at < NOW() - INTERVAL '21 days'
       AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')),
    (SELECT COUNT(DISTINCT c.owner_id)::BIGINT FROM campaigns c
     INNER JOIN auth.users u ON c.owner_id = u.id
     WHERE c.updated_at >= NOW() - INTERVAL '30 days'
       AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')),
    (SELECT COUNT(*)::BIGINT FROM auth.users u
     WHERE NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%') AND NOT (u.email ILIKE '%@agentmail.to')
       AND u.id NOT IN (
         SELECT DISTINCT owner_id FROM campaigns WHERE updated_at >= NOW() - INTERVAL '30 days'
       ));
END;
$function$;

commit;
