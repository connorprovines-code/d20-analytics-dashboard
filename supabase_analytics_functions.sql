-- =====================================================
-- D20 Loot Tracker - Analytics Dashboard Functions
-- =====================================================
-- These functions power the analytics dashboard
-- Run this SQL in your Supabase SQL editor

-- =====================================================
-- 1. Get Daily Signup Metrics
-- =====================================================
-- Returns daily user signups (excluding test accounts)
CREATE OR REPLACE FUNCTION get_signup_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
    COUNT(*)::BIGINT as count
  FROM auth.users
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
    -- Filter out test accounts
    AND NOT (
      email ILIKE '%connor%' AND email ILIKE '%provines%'
    )
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY DATE_TRUNC('day', created_at) ASC;
END;
$$;

-- =====================================================
-- 2. Get Campaign Creation Metrics
-- =====================================================
-- Returns daily campaign creations (excluding test account campaigns)
CREATE OR REPLACE FUNCTION get_campaign_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('day', c.created_at), 'YYYY-MM-DD') as date,
    COUNT(*)::BIGINT as count
  FROM campaigns c
  INNER JOIN auth.users u ON c.owner_id = u.id
  WHERE c.created_at >= NOW() - (days_back || ' days')::INTERVAL
    -- Filter out campaigns created by test accounts
    AND NOT (
      u.email ILIKE '%connor%' AND u.email ILIKE '%provines%'
    )
  GROUP BY DATE_TRUNC('day', c.created_at)
  ORDER BY DATE_TRUNC('day', c.created_at) ASC;
END;
$$;

-- =====================================================
-- 3. Get User Activity Metrics
-- =====================================================
-- Returns daily campaign member joins (excluding test accounts)
CREATE OR REPLACE FUNCTION get_activity_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('day', cm.joined_at), 'YYYY-MM-DD') as date,
    COUNT(*)::BIGINT as count
  FROM campaign_members cm
  INNER JOIN auth.users u ON cm.user_id = u.id
  WHERE cm.joined_at >= NOW() - (days_back || ' days')::INTERVAL
    -- Filter out test account activity
    AND NOT (
      u.email ILIKE '%connor%' AND u.email ILIKE '%provines%'
    )
  GROUP BY DATE_TRUNC('day', cm.joined_at)
  ORDER BY DATE_TRUNC('day', cm.joined_at) ASC;
END;
$$;

-- =====================================================
-- 4. Get Overview Stats
-- =====================================================
-- Returns key metrics for the dashboard overview
CREATE OR REPLACE FUNCTION get_overview_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_campaigns BIGINT,
  active_campaigns_7d BIGINT,
  new_users_7d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total users (excluding test accounts)
    (
      SELECT COUNT(*)::BIGINT
      FROM auth.users
      WHERE NOT (email ILIKE '%connor%' AND email ILIKE '%provines%')
    ) as total_users,

    -- Total campaigns (excluding test account campaigns)
    (
      SELECT COUNT(*)::BIGINT
      FROM campaigns c
      INNER JOIN auth.users u ON c.owner_id = u.id
      WHERE NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')
    ) as total_campaigns,

    -- Active campaigns in last 7 days (campaigns with updated items/players)
    (
      SELECT COUNT(DISTINCT c.id)::BIGINT
      FROM campaigns c
      INNER JOIN auth.users u ON c.owner_id = u.id
      WHERE c.updated_at >= NOW() - INTERVAL '7 days'
        AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')
    ) as active_campaigns_7d,

    -- New users in last 7 days (excluding test accounts)
    (
      SELECT COUNT(*)::BIGINT
      FROM auth.users
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND NOT (email ILIKE '%connor%' AND email ILIKE '%provines%')
    ) as new_users_7d;
END;
$$;

-- =====================================================
-- 5. Get Daily Active Users (DAU)
-- =====================================================
-- Returns daily count of unique active users
-- A user is considered "active" if they:
--   1. Signed up that day, OR
--   2. Created a campaign that day, OR
--   3. Updated a campaign they own that day, OR
--   4. Joined a campaign that day
-- This ensures DAU >= daily signups (since new users who create campaigns count as active)
CREATE OR REPLACE FUNCTION get_daily_active_users(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH active_users AS (
    -- Users who signed up
    SELECT
      DATE_TRUNC('day', created_at) as activity_date,
      id as user_id
    FROM auth.users
    WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND NOT (email ILIKE '%connor%' AND email ILIKE '%provines%')

    UNION

    -- Users who created campaigns
    SELECT
      DATE_TRUNC('day', c.created_at) as activity_date,
      c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE c.created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')

    UNION

    -- Users who updated campaigns (if campaigns have updated_at tracking)
    SELECT
      DATE_TRUNC('day', c.updated_at) as activity_date,
      c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE c.updated_at >= NOW() - (days_back || ' days')::INTERVAL
      AND c.updated_at != c.created_at  -- Exclude initial creation
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')

    UNION

    -- Users who joined campaigns
    SELECT
      DATE_TRUNC('day', cm.joined_at) as activity_date,
      cm.user_id as user_id
    FROM campaign_members cm
    INNER JOIN auth.users u ON cm.user_id = u.id
    WHERE cm.joined_at >= NOW() - (days_back || ' days')::INTERVAL
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')
  )
  SELECT
    TO_CHAR(activity_date, 'YYYY-MM-DD') as date,
    COUNT(DISTINCT user_id)::BIGINT as count
  FROM active_users
  GROUP BY activity_date
  ORDER BY activity_date ASC;
END;
$$;

-- =====================================================
-- 6. Get DAU for Today
-- =====================================================
-- Returns count of unique active users today
CREATE OR REPLACE FUNCTION get_dau_today()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dau_count BIGINT;
BEGIN
  WITH active_users_today AS (
    -- Users who signed up today
    SELECT id as user_id
    FROM auth.users
    WHERE DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW())
      AND NOT (email ILIKE '%connor%' AND email ILIKE '%provines%')

    UNION

    -- Users who created campaigns today
    SELECT c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE DATE_TRUNC('day', c.created_at) = DATE_TRUNC('day', NOW())
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')

    UNION

    -- Users who updated campaigns today
    SELECT c.owner_id as user_id
    FROM campaigns c
    INNER JOIN auth.users u ON c.owner_id = u.id
    WHERE DATE_TRUNC('day', c.updated_at) = DATE_TRUNC('day', NOW())
      AND c.updated_at != c.created_at
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')

    UNION

    -- Users who joined campaigns today
    SELECT cm.user_id
    FROM campaign_members cm
    INNER JOIN auth.users u ON cm.user_id = u.id
    WHERE DATE_TRUNC('day', cm.joined_at) = DATE_TRUNC('day', NOW())
      AND NOT (u.email ILIKE '%connor%' AND u.email ILIKE '%provines%')
  )
  SELECT COUNT(DISTINCT user_id)::BIGINT INTO dau_count
  FROM active_users_today;

  RETURN COALESCE(dau_count, 0);
END;
$$;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Configure .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
-- 3. Run `npm run dev` to start the dashboard locally
-- 4. Deploy to Vercel with `vercel --prod`
