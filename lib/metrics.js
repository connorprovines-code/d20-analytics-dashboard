// Server-side analytics queries. Every source is wrapped in safe() so a failure
// shows "unavailable" on its own cards instead of breaking the page.
import { query } from './db';
import { safe } from './safe';
import { summariseAcquisition, isFoundryFirstTouch, bucketKey } from './acquisition';

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

// One bucket per week (starting Monday, UTC) that overlaps the last `days` days, oldest first.
export function fillMissingWeeks(data, days) {
  const map = new Map((data || []).map((d) => [d.date, Number(d.count) || 0]));
  const weeks = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const week = bucketKey(date.toISOString().slice(0, 10), true);
    if (weeks[weeks.length - 1] !== week) weeks.push(week);
  }
  return weeks.map((date) => ({ date, count: map.get(date) || 0 }));
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
// Foundry VTT module
// ---------------------------------------------------------------
// Aggregates only: the dashboard has no login, so no world titles, emails, user ids or campaign
// names leave this function. Test accounts are excluded with the same rule as getAcquisitionMetrics,
// applied to the account that connected the world (or signed up).
const NOT_TEST_ACCOUNT = `not (u.email ilike '%connor%' and u.email ilike '%provines%')
          and u.email not ilike '%@agentmail.to'`;
// Start of the range in whole UTC days, as in getAcquisitionMetrics.
const RANGE_START = `((now() at time zone 'UTC')::date - ($1::int - 1)) at time zone 'UTC'`;

export async function getFoundryMetrics(days) {
  const [worlds, signups, packageHits] = await Promise.all([
    safe('foundry_connections', async () => {
      const [totals, weekly, systems] = await Promise.all([
        one(
          `select count(*) filter (where fc.revoked_at is null)::int as live,
                  count(*) filter (where fc.revoked_at is null
                                     and fc.last_seen_at >= now() - interval '7 days')::int as active_7d,
                  count(distinct fc.user_id) filter (where fc.revoked_at is null)::int as live_accounts,
                  count(distinct fc.campaign_id) filter (where fc.revoked_at is null)::int as live_campaigns,
                  count(*) filter (where fc.created_at >= ${RANGE_START})::int as new_in_range,
                  count(*) filter (where fc.created_at >= ${RANGE_START}
                                     and u.created_at >= ${RANGE_START})::int as new_by_new_accounts
             from public.foundry_connections fc
             join auth.users u on u.id = fc.user_id
            where ${NOT_TEST_ACCOUNT}`,
          [days]
        ),
        query(
          `select to_char(date_trunc('week', fc.created_at at time zone 'UTC'), 'YYYY-MM-DD') as date,
                  count(*)::int as count
             from public.foundry_connections fc
             join auth.users u on u.id = fc.user_id
            where fc.created_at >= ${RANGE_START}
              and ${NOT_TEST_ACCOUNT}
            group by 1 order by 1`,
          [days]
        ),
        query(
          `select coalesce(c.game_system, 'unknown') as game_system, count(*)::int as count
             from public.foundry_connections fc
             join auth.users u on u.id = fc.user_id
             join public.campaigns c on c.id = fc.campaign_id
            where fc.revoked_at is null
              and ${NOT_TEST_ACCOUNT}
            group by 1 order by 2 desc, 1`
        ),
      ]);
      return { ...totals, weekly: fillMissingWeeks(weekly, days), systems };
    }),
    // New accounts whose first touch was Foundry (see isFoundryFirstTouch), and how many of them
    // connected a world (revoked connections count: they did connect).
    safe('foundry signups', async () => {
      const rows = await query(
        `select u.raw_user_meta_data->'signup_source' as source,
                exists (select 1 from public.foundry_connections fc where fc.user_id = u.id) as connected
           from auth.users u
          where u.created_at >= ${RANGE_START}
            and ${NOT_TEST_ACCOUNT}`,
        [days]
      );
      const fromFoundry = rows.filter((r) => isFoundryFirstTouch(r.source));
      return { total: fromFoundry.length, connected: fromFoundry.filter((r) => r.connected).length };
    }),
    getFoundryPackageHits(days),
  ]);
  return {
    worlds: worlds.data,
    worldsReason: worlds.reason,
    signups: signups.data,
    signupsReason: signups.reason,
    ...packageHits,
  };
}

// Module installs, from public.foundry_package_hits (written by the app's api/foundry.js): one row
// per UTC day, kind, version and client. 'download' = a zip fetched (a new install or an update);
// 'manifest' = Foundry fetching the latest module.json to check for updates. client is a hashed
// requester id, so distinct clients approximate Foundry servers. Only counts leave this function.
const DAY_START = `((now() at time zone 'UTC')::date - ($1::int - 1))`;

export async function getFoundryPackageHits(days) {
  const hits = await safe('foundry_package_hits', async () => {
    const [totals, versions, weekly] = await Promise.all([
      one(
        `select coalesce(sum(hits) filter (where kind = 'download' and day >= ${DAY_START}), 0)::int as downloads,
                count(distinct client) filter (where kind = 'manifest'
                                                 and day >= (now() at time zone 'UTC')::date - 6)::int as servers_7d
           from public.foundry_package_hits`,
        [days]
      ),
      query(
        `select version, sum(hits)::int as count
           from public.foundry_package_hits
          where kind = 'download' and day >= ${DAY_START}
          group by version order by 2 desc, 1 desc`,
        [days]
      ),
      query(
        `select to_char(date_trunc('week', day), 'YYYY-MM-DD') as date,
                coalesce(sum(hits) filter (where kind = 'download'), 0)::int as downloads,
                count(distinct client) filter (where kind = 'manifest')::int as servers
           from public.foundry_package_hits
          where day >= ${DAY_START}
          group by 1 order by 1`,
        [days]
      ),
    ]);
    return { ...totals, versions, weekly: mergeWeeklyHits(weekly, days) };
  });
  return {
    hits: hits.data,
    hitsReason: hits.reason,
    // The table arrives with the app deploy that starts counting; until then there is nothing to show.
    hitsPending: hits.reason === 'table not found',
  };
}

// [{ date, downloads, servers }] -> one row per week in the range, zeros for weeks with no hits.
export function mergeWeeklyHits(rows, days) {
  const downloads = fillMissingWeeks((rows || []).map((r) => ({ date: r.date, count: r.downloads })), days);
  const servers = fillMissingWeeks((rows || []).map((r) => ({ date: r.date, count: r.servers })), days);
  return downloads.map((d, i) => ({ date: d.date, downloads: d.count, servers: servers[i].count }));
}

// ---------------------------------------------------------------
// Acquisition: where signups came from (classified in lib/acquisition.js)
// ---------------------------------------------------------------
// Test accounts: the same connor+provines rule as the analytics functions, plus @agentmail.to
// (the Play review account and other agent-made accounts).
export async function getAcquisitionMetrics(days) {
  const result = await safe('acquisition', async () => {
    const rows = await query(
      `select to_char(u.created_at at time zone 'UTC', 'YYYY-MM-DD') as date,
              u.created_at,
              u.raw_user_meta_data->'signup_source' as source,
              (select s.user_agent from auth.sessions s
                where s.user_id = u.id order by s.created_at limit 1) as user_agent,
              (select min(m.joined_at) from public.campaign_members m
                 join public.campaigns c on c.id = m.campaign_id
                where m.user_id = u.id and c.owner_id <> u.id) as first_join
         from auth.users u
        -- Whole UTC days, the same days the chart shows, so the cards and the bars add up.
        where u.created_at >= ((now() at time zone 'UTC')::date - ($1::int - 1)) at time zone 'UTC'
          and not (u.email ilike '%connor%' and u.email ilike '%provines%')
          and u.email not ilike '%@agentmail.to'`,
      [days]
    );
    return summariseAcquisition(rows, days);
  });
  return { data: result.data, reason: result.reason };
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
