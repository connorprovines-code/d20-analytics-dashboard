// Server-side analytics queries. Every source is wrapped in safe() so a failure
// shows "unavailable" on its own cards instead of breaking the page.
import { query } from './db';
import { safe } from './safe';

const one = async (sql, params) => (await query(sql, params))[0] ?? null;

// ---------------------------------------------------------------
// Existing analytics functions (same 16 SECURITY DEFINER functions)
// ---------------------------------------------------------------
const series = (fn, days) => query(`select * from public.${fn}($1::int)`, [days]);
const table = (fn) => query(`select * from public.${fn}()`);
const row = (fn) => one(`select * from public.${fn}()`);

// Fills in missing days with zero counts (UTC, matching the SQL functions).
export function fillMissingDays(data, days, key = 'date') {
  const map = new Map((data || []).map((d) => [d[key], Number(d.count) || 0]));
  const filled = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    filled.push({ date: dateStr, count: map.get(dateStr) || 0 });
  }
  return filled;
}

export async function getCoreMetrics(days) {
  const [
    signups, campaigns, activity, dau, overview, dauToday,
    gameSystems, collaboration, features, featuresBySystem, itemStats,
    rarity, transactions, gold, engagement, retention,
  ] = await Promise.all([
    safe('get_signup_metrics', () => series('get_signup_metrics', days)),
    safe('get_campaign_metrics', () => series('get_campaign_metrics', days)),
    safe('get_activity_metrics', () => series('get_activity_metrics', days)),
    safe('get_daily_active_users', () => series('get_daily_active_users', days)),
    safe('get_overview_stats', () => row('get_overview_stats')),
    safe('get_dau_today', async () => Number((await one('select public.get_dau_today() as v')).v) || 0),
    safe('get_game_system_breakdown', () => table('get_game_system_breakdown')),
    safe('get_collaboration_metrics', () => row('get_collaboration_metrics')),
    safe('get_feature_utilization', () => row('get_feature_utilization')),
    safe('get_features_by_game_system', () => table('get_features_by_game_system')),
    safe('get_item_stats', () => row('get_item_stats')),
    safe('get_dnd_rarity_breakdown', () => table('get_dnd_rarity_breakdown')),
    safe('get_transaction_breakdown', () => table('get_transaction_breakdown')),
    safe('get_gold_economy_stats', () => row('get_gold_economy_stats')),
    safe('get_campaign_engagement', () => row('get_campaign_engagement')),
    safe('get_user_retention', () => row('get_user_retention')),
  ]);

  const filled = (r) => (r.ok ? fillMissingDays(r.data, days) : null);
  const sum = (arr) => (arr ? arr.reduce((s, d) => s + d.count, 0) : null);
  const signupSeries = filled(signups);
  const campaignSeries = filled(campaigns);

  return {
    signups: signupSeries,
    campaigns: campaignSeries,
    activity: filled(activity),
    dau: filled(dau),
    overview: overview.data,
    dauToday: dauToday.data,
    signupsInRange: sum(signupSeries),
    campaignsInRange: sum(campaignSeries),
    gameSystems: gameSystems.data,
    collaboration: collaboration.data,
    features: features.data,
    featuresBySystem: featuresBySystem.data,
    itemStats: itemStats.data,
    rarity: rarity.data,
    transactions: transactions.data,
    gold: gold.data,
    engagement: engagement.data,
    retention: retention.data,
  };
}

// ---------------------------------------------------------------
// Discord bot
// ---------------------------------------------------------------
export async function getDiscordBotMetrics() {
  const [accounts, channels, usage] = await Promise.all([
    safe('discord_accounts', () => one('select count(*)::int as n from public.discord_accounts')),
    safe('discord_channels', () =>
      one(`select count(*)::int as channels,
                  count(distinct guild_id)::int as servers,
                  count(*) filter (where notify)::int as notify_on,
                  count(*) filter (where not coalesce(notify, false))::int as notify_off
             from public.discord_channels`)
    ),
    safe('discord_command_usage', async () => {
      const [daily, top] = await Promise.all([
        query(`select to_char(day, 'YYYY-MM-DD') as date, sum(count)::int as count
                 from public.discord_command_usage
                where day >= current_date - 29
                group by day order by day`),
        query(`select command, sum(count)::int as count
                 from public.discord_command_usage
                where day >= current_date - 29
                group by command order by 2 desc, 1 limit 10`),
      ]);
      const filledDaily = fillMissingDays(daily, 30);
      return { daily: filledDaily, top, total: filledDaily.reduce((s, d) => s + d.count, 0) };
    }),
  ]);
  return {
    linkedPlayers: accounts.ok ? accounts.data.n : null,
    channels: channels.data,
    channelsReason: channels.reason,
    usage: usage.data,
    usageReason: usage.reason,
  };
}

// ---------------------------------------------------------------
// Android beta
// ---------------------------------------------------------------
export const OPTIN_TARGET = 12;
export const OPTIN_DAYS_REQUIRED = 14;

export async function getAndroidBetaMetrics(days) {
  const [status, daily, optins] = await Promise.all([
    safe('android_beta_signups status', async () => {
      const rows = await query(`select status, count(*)::int as count from public.android_beta_signups group by status`);
      const out = { pending: 0, added: 0, emailed: 0, failed: 0, other: 0, total: 0 };
      for (const r of rows) {
        if (r.status in out && r.status !== 'total' && r.status !== 'other') out[r.status] += r.count;
        else out.other += r.count;
        out.total += r.count;
      }
      return out;
    }),
    safe('android_beta_signups daily', async () => {
      const rows = await query(
        `select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD') as date, count(*)::int as count
           from public.android_beta_signups
          where created_at >= now() - ($1::int || ' days')::interval
          group by 1 order by 1`,
        [days]
      );
      return fillMissingDays(rows, days);
    }),
    safe('android_beta_optins', async () => {
      const rows = await query(
        `select to_char(day, 'YYYY-MM-DD') as day, opted_in::int as opted_in
           from public.android_beta_optins order by day desc limit 120`
      );
      return summariseOptins(rows);
    }),
  ]);
  return {
    status: status.data,
    daily: daily.data,
    optins: optins.data,
    optinsReason: optins.reason,
  };
}

// Consecutive days, ending at the most recent recorded day, with at least OPTIN_TARGET opted in.
// A missing day breaks the streak.
export function summariseOptins(rowsDesc) {
  if (!rowsDesc.length) return { latest: null, latestDay: null, streak: 0 };
  let streak = 0;
  let expected = null;
  for (const r of rowsDesc) {
    const t = Date.parse(r.day + 'T00:00:00Z');
    if (expected !== null && t !== expected) break;
    if (r.opted_in < OPTIN_TARGET) break;
    streak++;
    expected = t - 86_400_000;
  }
  return { latest: rowsDesc[0].opted_in, latestDay: rowsDesc[0].day, streak };
}
