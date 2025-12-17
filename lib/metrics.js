import { supabase } from './supabase';

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

// =====================================================
// ADVANCED ANALYTICS FUNCTIONS
// =====================================================

/**
 * Get campaign breakdown by game system
 */
export async function getGameSystemBreakdown() {
  const { data, error } = await supabase.rpc('get_game_system_breakdown');

  if (error) {
    console.error('Error fetching game system breakdown:', error);
    return [];
  }

  return data || [];
}

/**
 * Get collaboration metrics (invites, multi-user campaigns, roles)
 */
export async function getCollaborationMetrics() {
  const { data, error } = await supabase.rpc('get_collaboration_metrics');

  if (error) {
    console.error('Error fetching collaboration metrics:', error);
    return {
      total_invites_sent: 0,
      invites_accepted: 0,
      invites_pending: 0,
      multi_user_campaigns: 0,
      solo_campaigns: 0,
      avg_members_per_campaign: 0,
      contributors: 0,
      viewers: 0
    };
  }

  return (data && data.length > 0) ? data[0] : {
    total_invites_sent: 0,
    invites_accepted: 0,
    invites_pending: 0,
    multi_user_campaigns: 0,
    solo_campaigns: 0,
    avg_members_per_campaign: 0,
    contributors: 0,
    viewers: 0
  };
}

/**
 * Get feature utilization metrics
 */
export async function getFeatureUtilization() {
  const { data, error } = await supabase.rpc('get_feature_utilization');

  if (error) {
    console.error('Error fetching feature utilization:', error);
    return {
      campaigns_with_items: 0,
      campaigns_with_players: 0,
      campaigns_with_party_fund: 0,
      campaigns_with_containers: 0,
      campaigns_with_transactions: 0,
      total_items: 0,
      total_players: 0,
      total_transactions: 0,
      total_containers: 0
    };
  }

  return (data && data.length > 0) ? data[0] : {
    campaigns_with_items: 0,
    campaigns_with_players: 0,
    campaigns_with_party_fund: 0,
    campaigns_with_containers: 0,
    campaigns_with_transactions: 0,
    total_items: 0,
    total_players: 0,
    total_transactions: 0,
    total_containers: 0
  };
}

/**
 * Get feature utilization by game system
 */
export async function getFeaturesByGameSystem() {
  const { data, error } = await supabase.rpc('get_features_by_game_system');

  if (error) {
    console.error('Error fetching features by game system:', error);
    return [];
  }

  return data || [];
}

/**
 * Get item statistics (rarity, attunement, etc.)
 */
export async function getItemStats() {
  const { data, error } = await supabase.rpc('get_item_stats');

  if (error) {
    console.error('Error fetching item stats:', error);
    return {
      total_items: 0,
      treasure_items: 0,
      loot_items: 0,
      assigned_items: 0,
      unassigned_items: 0,
      consumable_items: 0,
      avg_item_value: 0,
      total_item_value: 0,
      items_with_attunement: 0,
      attuned_items: 0
    };
  }

  return (data && data.length > 0) ? data[0] : {
    total_items: 0,
    treasure_items: 0,
    loot_items: 0,
    assigned_items: 0,
    unassigned_items: 0,
    consumable_items: 0,
    avg_item_value: 0,
    total_item_value: 0,
    items_with_attunement: 0,
    attuned_items: 0
  };
}

/**
 * Get D&D 5e rarity breakdown
 */
export async function getDndRarityBreakdown() {
  const { data, error } = await supabase.rpc('get_dnd_rarity_breakdown');

  if (error) {
    console.error('Error fetching D&D rarity breakdown:', error);
    return [];
  }

  return data || [];
}

/**
 * Get transaction type breakdown
 */
export async function getTransactionBreakdown() {
  const { data, error } = await supabase.rpc('get_transaction_breakdown');

  if (error) {
    console.error('Error fetching transaction breakdown:', error);
    return [];
  }

  return data || [];
}

/**
 * Get gold economy stats
 */
export async function getGoldEconomyStats() {
  const { data, error } = await supabase.rpc('get_gold_economy_stats');

  if (error) {
    console.error('Error fetching gold economy stats:', error);
    return {
      total_player_gold: 0,
      total_party_fund_gold: 0,
      avg_player_gold: 0,
      avg_party_fund: 0,
      total_transaction_volume: 0
    };
  }

  return (data && data.length > 0) ? data[0] : {
    total_player_gold: 0,
    total_party_fund_gold: 0,
    avg_player_gold: 0,
    avg_party_fund: 0,
    total_transaction_volume: 0
  };
}

/**
 * Get campaign engagement metrics (items/players per campaign)
 */
export async function getCampaignEngagement() {
  const { data, error } = await supabase.rpc('get_campaign_engagement');

  if (error) {
    console.error('Error fetching campaign engagement:', error);
    return {
      avg_items_per_campaign: 0,
      avg_players_per_campaign: 0,
      avg_transactions_per_campaign: 0,
      max_items_in_campaign: 0,
      max_players_in_campaign: 0,
      campaigns_with_activity_30d: 0
    };
  }

  return (data && data.length > 0) ? data[0] : {
    avg_items_per_campaign: 0,
    avg_players_per_campaign: 0,
    avg_transactions_per_campaign: 0,
    max_items_in_campaign: 0,
    max_players_in_campaign: 0,
    campaigns_with_activity_30d: 0
  };
}

/**
 * Get user retention cohorts
 */
export async function getUserRetention() {
  const { data, error } = await supabase.rpc('get_user_retention');

  if (error) {
    console.error('Error fetching user retention:', error);
    return {
      users_active_week_1: 0,
      users_active_week_2: 0,
      users_active_week_3: 0,
      users_active_week_4: 0,
      users_active_this_month: 0,
      users_churned_30d: 0
    };
  }

  return (data && data.length > 0) ? data[0] : {
    users_active_week_1: 0,
    users_active_week_2: 0,
    users_active_week_3: 0,
    users_active_week_4: 0,
    users_active_this_month: 0,
    users_churned_30d: 0
  };
}
