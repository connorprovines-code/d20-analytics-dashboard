'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import SignupChart from './SignupChart';
import CampaignChart from './CampaignChart';
import DailyActiveUsersChart from './DailyActiveUsersChart';
import ActivityChart from './ActivityChart';
import StatCard from './StatCard';
import GameSystemChart from './GameSystemChart';
import TransactionChart from './TransactionChart';
import RarityChart from './RarityChart';
import FeatureUtilizationChart from './FeatureUtilizationChart';
import FeaturesBySystemChart from './FeaturesBySystemChart';
import CollaborationChart from './CollaborationChart';
import RetentionChart from './RetentionChart';
import DailyBarChart from './DailyBarChart';
import TopList from './TopList';
import FeedbackList from './FeedbackList';
import Unavailable from './Unavailable';

const TABS = [
  ['overview', 'Overview'],
  ['engagement', 'Engagement'],
  ['features', 'Features'],
  ['economy', 'Economy'],
  ['discord', 'Discord Bot'],
  ['beta', 'Android Beta'],
  ['health', 'App Health'],
  ['feedback', 'Feedback & Bugs'],
];

const OPTIN_TARGET = 12;
const OPTIN_DAYS_REQUIRED = 14;

// Field from a source object, or null when the whole source is unavailable.
const f = (obj, key) => (obj ? obj[key] ?? 0 : null);
const fixed1 = (v) => (v === null ? null : Number(v || 0).toFixed(1));

function formatGold(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

// Renders the chart when its data loaded, otherwise an "unavailable" card with the same title.
function chart(data, title, render) {
  return data ? render(data) : <Unavailable title={title} />;
}

export default function Dashboard({ range, initialTab, core, discord, beta, sentry, feedback, generatedAt }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pending, startTransition] = useTransition();
  const ov = core.overview;

  function selectTab(tab) {
    setActiveTab(tab);
    // Keep the tab in the URL without a server round trip.
    window.history.replaceState(null, '', `/?range=${range}&tab=${tab}`);
  }

  function selectRange(value) {
    startTransition(() => router.push(`/?range=${value}&tab=${activeTab}`));
  }

  const keyMetrics = (
    <div className="stats-grid">
      <StatCard title="Total Users" value={f(ov, 'total_users')} subtitle="All-time signups" />
      <StatCard title={`Signups (${range}d)`} value={core.signupsInRange} subtitle="In selected range" />
      <StatCard title="Total Campaigns" value={f(ov, 'total_campaigns')} subtitle="All-time" />
      <StatCard title={`Campaigns (${range}d)`} value={core.campaignsInRange} subtitle="In selected range" />
      <StatCard title="New Users (7d)" value={f(ov, 'new_users_7d')} subtitle="Last 7 days" />
      <StatCard title="Active Campaigns (7d)" value={f(ov, 'active_campaigns_7d')} subtitle="With recent activity" />
      <StatCard title="Daily Active Users" value={core.dauToday} subtitle="Active today" />
    </div>
  );

  const collab = core.collaboration;
  const acceptance = collab && collab.total_invites_sent > 0
    ? ((collab.invites_accepted / collab.total_invites_sent) * 100).toFixed(0) + '% acceptance rate'
    : '0% acceptance rate';

  const channels = discord.channels;
  const usage = discord.usage;
  const status = beta.status;
  const optins = beta.optins;

  return (
    <div className={pending ? 'container is-loading' : 'container'}>
      <header>
        <div className="header-row">
          <h1>D20 Loot Tracker Analytics</h1>
          <a className="logout-link" href="/logout">Log out</a>
        </div>
        <p className="subtitle">Usage, community and app health metrics</p>
        <div className="controls">
          <div className="tabs">
            {TABS.map(([key, label]) => (
              <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => selectTab(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="date-range-selector">
            <label htmlFor="date-range">Date Range:</label>
            <select id="date-range" value={range} disabled={pending} onChange={(e) => selectRange(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>
      </header>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <section>
            <h2 className="section-title">Key Metrics</h2>
            {keyMetrics}
          </section>

          <section>
            <h2 className="section-title">Activity Trends</h2>
            <div className="charts-grid">
              {chart(core.signups, 'New User Signups (Daily)', (d) => <SignupChart data={d} />)}
              {chart(core.campaigns, 'Campaign Creations (Daily)', (d) => <CampaignChart data={d} />)}
              {chart(core.activity, 'Campaign Joins (Daily)', (d) => <ActivityChart data={d} />)}
              {chart(core.dau, 'Daily Active Users (DAU)', (d) => <DailyActiveUsersChart data={d} />)}
            </div>
          </section>

          <section>
            <h2 className="section-title">Game System Breakdown</h2>
            <div className="charts-grid">
              {chart(core.gameSystems, 'Campaigns by Game System', (d) => <GameSystemChart data={d} />)}
              {chart(core.retention, 'User Activity by Week (Last 30 Days)', (d) => <RetentionChart data={d} />)}
            </div>
          </section>
        </>
      )}

      {/* ENGAGEMENT TAB */}
      {activeTab === 'engagement' && (
        <>
          <section>
            <h2 className="section-title">User Engagement</h2>
            <div className="stats-grid">
              <StatCard title="Avg Items/Campaign" value={fixed1(f(core.engagement, 'avg_items_per_campaign'))} subtitle="Items tracked" />
              <StatCard title="Avg Players/Campaign" value={fixed1(f(core.engagement, 'avg_players_per_campaign'))} subtitle="Party size" />
              <StatCard title="Max Items" value={f(core.engagement, 'max_items_in_campaign')} subtitle="In single campaign" />
              <StatCard title="Max Players" value={f(core.engagement, 'max_players_in_campaign')} subtitle="In single campaign" />
              <StatCard title="Active (30d)" value={f(core.engagement, 'campaigns_with_activity_30d')} subtitle="Campaigns with activity" />
              <StatCard title="Churned Users" value={f(core.retention, 'users_churned_30d')} subtitle="Inactive 30+ days" />
            </div>
          </section>

          <section>
            <h2 className="section-title">Collaboration</h2>
            <div className="stats-grid">
              <StatCard title="Invites Sent" value={f(collab, 'total_invites_sent')} subtitle="All-time" />
              <StatCard title="Invites Accepted" value={f(collab, 'invites_accepted')} subtitle={acceptance} />
              <StatCard title="Pending Invites" value={f(collab, 'invites_pending')} subtitle="Awaiting response" />
              <StatCard title="Multi-User Campaigns" value={f(collab, 'multi_user_campaigns')} subtitle="Collaborative" />
              <StatCard title="Contributors" value={f(collab, 'contributors')} subtitle="Can edit" />
              <StatCard title="Viewers" value={f(collab, 'viewers')} subtitle="Read-only" />
            </div>
          </section>

          <section>
            <div className="charts-grid">
              {chart(collab, 'Collaboration Overview', (d) => <CollaborationChart data={d} />)}
              {chart(core.retention, 'User Activity by Week (Last 30 Days)', (d) => <RetentionChart data={d} />)}
            </div>
          </section>
        </>
      )}

      {/* FEATURES TAB */}
      {activeTab === 'features' && (
        <>
          <section>
            <h2 className="section-title">Feature Adoption</h2>
            <div className="stats-grid">
              <StatCard title="Total Items" value={f(core.features, 'total_items')} subtitle={f(core.features, 'campaigns_with_items') + ' campaigns'} />
              <StatCard title="Total Players" value={f(core.features, 'total_players')} subtitle={f(core.features, 'campaigns_with_players') + ' campaigns'} />
              <StatCard title="Total Transactions" value={f(core.features, 'total_transactions')} subtitle={f(core.features, 'campaigns_with_transactions') + ' campaigns'} />
              <StatCard title="Total Containers" value={f(core.features, 'total_containers')} subtitle={f(core.features, 'campaigns_with_containers') + ' campaigns'} />
            </div>
          </section>

          <section>
            <h2 className="section-title">Item Breakdown</h2>
            <div className="stats-grid">
              <StatCard title="Treasure Items" value={f(core.itemStats, 'treasure_items')} subtitle="Gold/valuables" />
              <StatCard title="Loot Items" value={f(core.itemStats, 'loot_items')} subtitle="Equipment/gear" />
              <StatCard title="Assigned" value={f(core.itemStats, 'assigned_items')} subtitle="To players/party" />
              <StatCard title="Unassigned" value={f(core.itemStats, 'unassigned_items')} subtitle="Pending distribution" />
              <StatCard title="Consumables" value={f(core.itemStats, 'consumable_items')} subtitle="One-time use" />
              <StatCard
                title="Attunement"
                value={core.itemStats ? `${f(core.itemStats, 'attuned_items')}/${f(core.itemStats, 'items_with_attunement')}` : null}
                subtitle="Attuned / Requires"
              />
            </div>
          </section>

          <section>
            <div className="charts-grid">
              {chart(core.features, 'Feature Adoption', (d) => (
                <FeatureUtilizationChart data={d} totalCampaigns={f(ov, 'total_campaigns') || 0} />
              ))}
              {chart(core.featuresBySystem, 'Avg Features per Campaign by System', (d) => <FeaturesBySystemChart data={d} />)}
              {chart(core.rarity, 'D&D 5e Item Rarity', (d) => <RarityChart data={d} />)}
            </div>
          </section>
        </>
      )}

      {/* ECONOMY TAB */}
      {activeTab === 'economy' && (
        <>
          <section>
            <h2 className="section-title">Gold Economy</h2>
            <div className="stats-grid">
              <StatCard title="Total Player Gold" value={formatGold(f(core.gold, 'total_player_gold'))} subtitle="Across all players" />
              <StatCard title="Total Party Funds" value={formatGold(f(core.gold, 'total_party_fund_gold'))} subtitle="Shared gold" />
              <StatCard title="Avg Player Gold" value={formatGold(f(core.gold, 'avg_player_gold'))} subtitle="Per player" />
              <StatCard title="Avg Party Fund" value={formatGold(f(core.gold, 'avg_party_fund'))} subtitle="Per campaign" />
              <StatCard title="Transaction Volume" value={formatGold(f(core.gold, 'total_transaction_volume'))} subtitle="Total gold moved" />
              <StatCard title="Total Item Value" value={formatGold(f(core.itemStats, 'total_item_value'))} subtitle="All items" />
              <StatCard title="Avg Item Value" value={formatGold(f(core.itemStats, 'avg_item_value'))} subtitle="Per item" />
            </div>
          </section>

          <section>
            <h2 className="section-title">Transaction Analysis</h2>
            <div className="charts-grid">
              {chart(core.transactions, 'Transactions by Type', (d) => <TransactionChart data={d} />)}
              {chart(core.gameSystems, 'Campaigns by Game System', (d) => <GameSystemChart data={d} />)}
            </div>
          </section>
        </>
      )}

      {/* DISCORD BOT TAB */}
      {activeTab === 'discord' && (
        <>
          <section>
            <h2 className="section-title">Discord Bot</h2>
            <div className="stats-grid">
              <StatCard title="Linked Players" value={discord.linkedPlayers} subtitle="Discord accounts linked" />
              <StatCard title="Servers" value={f(channels, 'servers')} subtitle="Following a campaign" reason={discord.channelsReason} />
              <StatCard title="Channels" value={f(channels, 'channels')} subtitle="Following a campaign" reason={discord.channelsReason} />
              <StatCard title="Notify On" value={f(channels, 'notify_on')} subtitle="Channels posting updates" reason={discord.channelsReason} />
              <StatCard title="Notify Off" value={f(channels, 'notify_off')} subtitle="Channels muted" reason={discord.channelsReason} />
              <StatCard title="Commands (30d)" value={usage ? usage.total : null} subtitle="All commands" reason={discord.usageReason} />
            </div>
          </section>

          <section>
            <h2 className="section-title">Command Usage (Last 30 Days)</h2>
            <div className="charts-grid">
              {usage ? (
                <DailyBarChart title="Commands per Day" data={usage.daily} color="#5865f2" label="Commands" />
              ) : (
                <Unavailable title="Commands per Day" reason={discord.usageReason} />
              )}
              {usage ? (
                <TopList title="Top Commands" rows={usage.top} labelKey="command" valueKey="count" empty="No commands recorded" />
              ) : (
                <Unavailable title="Top Commands" reason={discord.usageReason} />
              )}
            </div>
          </section>
        </>
      )}

      {/* ANDROID BETA TAB */}
      {activeTab === 'beta' && (
        <>
          <section>
            <h2 className="section-title">Android Beta Signups</h2>
            <div className="stats-grid">
              <StatCard title="Total Signups" value={f(status, 'total')} subtitle="All-time" />
              <StatCard title="Pending" value={f(status, 'pending')} subtitle="Not yet processed" />
              <StatCard title="Added" value={f(status, 'added')} subtitle="Added to testers" />
              <StatCard title="Emailed" value={f(status, 'emailed')} subtitle="Invite sent" />
              <StatCard title="Failed" value={f(status, 'failed')} subtitle="Needs a retry" />
            </div>
          </section>

          <section>
            <h2 className="section-title">Closed Testing Requirement</h2>
            <div className="stats-grid">
              <StatCard
                title="Opted-In Testers"
                value={optins ? optins.latest ?? 0 : null}
                subtitle={optins?.latestDay ? `As of ${optins.latestDay}, target ${OPTIN_TARGET}` : 'No days recorded yet'}
                reason={beta.optinsReason}
              />
              <StatCard
                title={`Days at ${OPTIN_TARGET}+ Opted In`}
                value={optins ? `${optins.streak} / ${OPTIN_DAYS_REQUIRED}` : null}
                subtitle={`Consecutive days toward Google's ${OPTIN_DAYS_REQUIRED}-day rule`}
                reason={beta.optinsReason}
              />
            </div>
          </section>

          <section>
            <div className="charts-grid">
              {beta.daily ? (
                <DailyBarChart title={`Beta Signups per Day (${range}d)`} data={beta.daily} color="#3ddc84" label="Signups" />
              ) : (
                <Unavailable title="Beta Signups per Day" />
              )}
            </div>
          </section>
        </>
      )}

      {/* APP HEALTH TAB */}
      {activeTab === 'health' && (
        <>
          <section>
            <h2 className="section-title">Errors (Sentry)</h2>
            <div className="stats-grid">
              <StatCard title="Unresolved Issues" value={sentry.unresolved ? sentry.unresolved.count + (sentry.unresolved.capped ? '+' : '') : null} subtitle="Seen in the last 90 days" reason={sentry.unresolvedReason} />
              <StatCard title="Error Events (24h)" value={sentry.events24h} subtitle="Accepted by Sentry" reason={sentry.eventsReason} />
              <StatCard title="Error Events (7d)" value={sentry.events7d} subtitle="Accepted by Sentry" reason={sentry.eventsReason} />
            </div>
          </section>

          <section>
            <h2 className="section-title">Usage</h2>
            {keyMetrics}
          </section>
        </>
      )}

      {/* FEEDBACK TAB */}
      {activeTab === 'feedback' && (
        <>
          <section>
            <h2 className="section-title">Feedback &amp; Bugs</h2>
            <div className="stats-grid">
              {feedback.flatMap((c) => [
                <StatCard key={c.key + '-open'} title={`${c.title} open`} value={c.messages ? c.messages.filter((m) => !m.fixed).length : null} subtitle="Of the last 30 messages" reason={c.reason} />,
                <StatCard key={c.key + '-fixed'} title={`${c.title} fixed`} value={c.messages ? c.messages.filter((m) => m.fixed).length : null} subtitle="Marked with a check mark" reason={c.reason} />,
              ])}
            </div>
          </section>
          <section>
            <div className="charts-grid">
              {feedback.map((c) =>
                c.messages ? (
                  <FeedbackList key={c.key} title={`${c.title} (last 30)`} messages={c.messages} />
                ) : (
                  <Unavailable key={c.key} title={c.title} reason={c.reason} />
                )
              )}
            </div>
          </section>
        </>
      )}

      <footer>
        <p>Loaded {generatedAt} | Discord and Sentry cached for 5 minutes | Test accounts filtered</p>
      </footer>
    </div>
  );
}
