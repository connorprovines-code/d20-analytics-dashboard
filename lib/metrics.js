import { supabase } from './supabase';

/**
 * Filter to exclude test accounts containing both "connor" AND "provines" in email
 */
const TEST_ACCOUNT_FILTER = `
  AND NOT (
    email ILIKE '%connor%' AND email ILIKE '%provines%'
  )
`;

/**
 * Get daily signup metrics (excluding test accounts)
 */
export async function getSignupMetrics(days = 30) {
  const { data, error } = await supabase.rpc('get_signup_metrics', {
    days_back: days
  });

  if (error) {
    console.error('Error fetching signup metrics:', error);
    return [];
  }

  return data || [];
}

/**
 * Get campaign creation metrics (excluding test account campaigns)
 */
export async function getCampaignMetrics(days = 30) {
  const { data, error } = await supabase.rpc('get_campaign_metrics', {
    days_back: days
  });

  if (error) {
    console.error('Error fetching campaign metrics:', error);
    return [];
  }

  return data || [];
}

/**
 * Get overview stats
 */
export async function getOverviewStats() {
  const { data, error } = await supabase.rpc('get_overview_stats');

  if (error) {
    console.error('Error fetching overview stats:', error);
    return {
      total_users: 0,
      total_campaigns: 0,
      active_campaigns_7d: 0,
      new_users_7d: 0
    };
  }

  // Supabase returns a single row as an array, so get the first element
  return (data && data.length > 0) ? data[0] : {
    total_users: 0,
    total_campaigns: 0,
    active_campaigns_7d: 0,
    new_users_7d: 0
  };
}

/**
 * Get user activity (campaign joins) over time
 */
export async function getUserActivityMetrics(days = 30) {
  const { data, error } = await supabase.rpc('get_activity_metrics', {
    days_back: days
  });

  if (error) {
    console.error('Error fetching activity metrics:', error);
    return [];
  }

  return data || [];
}

/**
 * Get daily active users (DAU) over time
 */
export async function getDailyActiveUsers(days = 30) {
  const { data, error } = await supabase.rpc('get_daily_active_users', {
    days_back: days
  });

  if (error) {
    console.error('Error fetching daily active users:', error);
    return [];
  }

  return data || [];
}

/**
 * Get daily active users for today
 */
export async function getDAUToday() {
  const { data, error } = await supabase.rpc('get_dau_today');

  if (error) {
    console.error('Error fetching DAU today:', error);
    return 0;
  }

  return data || 0;
}
