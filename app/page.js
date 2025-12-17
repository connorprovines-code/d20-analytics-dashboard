'use client';

import { useEffect, useState } from 'react';
import {
  getSignupMetrics,
  getCampaignMetrics,
  getOverviewStats,
  getUserActivityMetrics,
  getDailyActiveUsers,
  getDAUToday,
  getGameSystemBreakdown,
  getCollaborationMetrics,
  getFeatureUtilization,
  getFeaturesByGameSystem,
  getItemStats,
  getDndRarityBreakdown,
  getTransactionBreakdown,
  getGoldEconomyStats,
  getCampaignEngagement,
  getUserRetention
} from '../lib/metrics';
import SignupChart from '../components/SignupChart';
import CampaignChart from '../components/CampaignChart';
import DailyActiveUsersChart from '../components/DailyActiveUsersChart';
import ActivityChart from '../components/ActivityChart';
import StatCard from '../components/StatCard';
import GameSystemChart from '../components/GameSystemChart';
import TransactionChart from '../components/TransactionChart';
import RarityChart from '../components/RarityChart';
import FeatureUtilizationChart from '../components/FeatureUtilizationChart';
import FeaturesBySystemChart from '../components/FeaturesBySystemChart';
import CollaborationChart from '../components/CollaborationChart';
import RetentionChart from '../components/RetentionChart';

// Helper function to fill in missing days with zero counts
// Uses UTC to match server-side date handling in Supabase
function fillMissingDays(data, days) {
  const filled = [];
  const dataMap = new Map(data.map(d => [d.date, d.count]));

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    filled.push({
      date: dateStr,
      count: dataMap.get(dateStr) || 0
    });
  }

  return filled;
}

// Format gold values
function formatGold(value) {
  const num = Number(value) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

export default function Dashboard() {
  // Basic metrics state
  const [signupData, setSignupData] = useState([]);
  const [campaignData, setCampaignData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [dauData, setDauData] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_campaigns: 0,
    active_campaigns_7d: 0,
    new_users_7d: 0,
    dau_today: 0
  });

  // Advanced metrics state
  const [gameSystemData, setGameSystemData] = useState([]);
  const [collaborationData, setCollaborationData] = useState({});
  const [featureData, setFeatureData] = useState({});
  const [featuresBySystem, setFeaturesBySystem] = useState([]);
  const [itemStats, setItemStats] = useState({});
  const [rarityData, setRarityData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [goldStats, setGoldStats] = useState({});
  const [engagementData, setEngagementData] = useState({});
  const [retentionData, setRetentionData] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch basic metrics
        const [signups, campaigns, activity, dau, overview, dauToday] = await Promise.all([
          getSignupMetrics(dateRange),
          getCampaignMetrics(dateRange),
          getUserActivityMetrics(dateRange),
          getDailyActiveUsers(dateRange),
          getOverviewStats(),
          getDAUToday()
        ]);

        // Fetch advanced metrics
        const [
          gameSystems,
          collaboration,
          features,
          featuresBySys,
          items,
          rarity,
          transactions,
          gold,
          engagement,
          retention
        ] = await Promise.all([
          getGameSystemBreakdown(),
          getCollaborationMetrics(),
          getFeatureUtilization(),
          getFeaturesByGameSystem(),
          getItemStats(),
          getDndRarityBreakdown(),
          getTransactionBreakdown(),
          getGoldEconomyStats(),
          getCampaignEngagement(),
          getUserRetention()
        ]);

        // Fill in missing days with zero counts
        const filledSignups = fillMissingDays(signups, dateRange);
        const filledCampaigns = fillMissingDays(campaigns, dateRange);
        const filledActivity = fillMissingDays(activity, dateRange);
        const filledDAU = fillMissingDays(dau, dateRange);

        // Set basic metrics
        setSignupData(filledSignups);
        setCampaignData(filledCampaigns);
        setActivityData(filledActivity);
        setDauData(filledDAU);
        setStats({
          ...overview,
          dau_today: dauToday,
          signups_in_range: filledSignups.reduce((sum, item) => sum + item.count, 0),
          campaigns_in_range: filledCampaigns.reduce((sum, item) => sum + item.count, 0)
        });

        // Set advanced metrics
        setGameSystemData(gameSystems);
        setCollaborationData(collaboration);
        setFeatureData(features);
        setFeaturesBySystem(featuresBySys);
        setItemStats(items);
        setRarityData(rarity);
        setTransactionData(transactions);
        setGoldStats(gold);
        setEngagementData(engagement);
        setRetentionData(retention);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>D20 Loot Tracker Analytics</h1>
        <p className="subtitle">Comprehensive usage metrics dashboard</p>
        <div className="controls">
          <div className="tabs">
            <button
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={activeTab === 'engagement' ? 'active' : ''}
              onClick={() => setActiveTab('engagement')}
            >
              Engagement
            </button>
            <button
              className={activeTab === 'features' ? 'active' : ''}
              onClick={() => setActiveTab('features')}
            >
              Features
            </button>
            <button
              className={activeTab === 'economy' ? 'active' : ''}
              onClick={() => setActiveTab('economy')}
            >
              Economy
            </button>
          </div>
          <div className="date-range-selector">
            <label htmlFor="date-range">Date Range:</label>
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
            >
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
            <div className="stats-grid">
              <StatCard
                title="Total Users"
                value={stats.total_users}
                subtitle="All-time signups"
              />
              <StatCard
                title={'Signups (' + dateRange + 'd)'}
                value={stats.signups_in_range || 0}
                subtitle="In selected range"
              />
              <StatCard
                title="Total Campaigns"
                value={stats.total_campaigns}
                subtitle="All-time"
              />
              <StatCard
                title={'Campaigns (' + dateRange + 'd)'}
                value={stats.campaigns_in_range || 0}
                subtitle="In selected range"
              />
              <StatCard
                title="New Users (7d)"
                value={stats.new_users_7d}
                subtitle="Last 7 days"
              />
              <StatCard
                title="Active Campaigns (7d)"
                value={stats.active_campaigns_7d}
                subtitle="With recent activity"
              />
              <StatCard
                title="Daily Active Users"
                value={stats.dau_today}
                subtitle="Active today"
              />
            </div>
          </section>

          <section>
            <h2 className="section-title">Activity Trends</h2>
            <div className="charts-grid">
              <SignupChart data={signupData} />
              <CampaignChart data={campaignData} />
              <ActivityChart data={activityData} />
              <DailyActiveUsersChart data={dauData} />
            </div>
          </section>

          <section>
            <h2 className="section-title">Game System Breakdown</h2>
            <div className="charts-grid">
              <GameSystemChart data={gameSystemData} />
              <RetentionChart data={retentionData} />
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
              <StatCard
                title="Avg Items/Campaign"
                value={Number(engagementData.avg_items_per_campaign || 0).toFixed(1)}
                subtitle="Items tracked"
              />
              <StatCard
                title="Avg Players/Campaign"
                value={Number(engagementData.avg_players_per_campaign || 0).toFixed(1)}
                subtitle="Party size"
              />
              <StatCard
                title="Max Items"
                value={engagementData.max_items_in_campaign || 0}
                subtitle="In single campaign"
              />
              <StatCard
                title="Max Players"
                value={engagementData.max_players_in_campaign || 0}
                subtitle="In single campaign"
              />
              <StatCard
                title="Active (30d)"
                value={engagementData.campaigns_with_activity_30d || 0}
                subtitle="Campaigns with activity"
              />
              <StatCard
                title="Churned Users"
                value={retentionData.users_churned_30d || 0}
                subtitle="Inactive 30+ days"
              />
            </div>
          </section>

          <section>
            <h2 className="section-title">Collaboration</h2>
            <div className="stats-grid">
              <StatCard
                title="Invites Sent"
                value={collaborationData.total_invites_sent || 0}
                subtitle="All-time"
              />
              <StatCard
                title="Invites Accepted"
                value={collaborationData.invites_accepted || 0}
                subtitle={(collaborationData.total_invites_sent > 0 ? ((collaborationData.invites_accepted / collaborationData.total_invites_sent) * 100).toFixed(0) : 0) + '% acceptance rate'}
              />
              <StatCard
                title="Pending Invites"
                value={collaborationData.invites_pending || 0}
                subtitle="Awaiting response"
              />
              <StatCard
                title="Multi-User Campaigns"
                value={collaborationData.multi_user_campaigns || 0}
                subtitle="Collaborative"
              />
              <StatCard
                title="Contributors"
                value={collaborationData.contributors || 0}
                subtitle="Can edit"
              />
              <StatCard
                title="Viewers"
                value={collaborationData.viewers || 0}
                subtitle="Read-only"
              />
            </div>
          </section>

          <section>
            <div className="charts-grid">
              <CollaborationChart data={collaborationData} />
              <RetentionChart data={retentionData} />
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
              <StatCard
                title="Total Items"
                value={featureData.total_items || 0}
                subtitle={(featureData.campaigns_with_items || 0) + ' campaigns'}
              />
              <StatCard
                title="Total Players"
                value={featureData.total_players || 0}
                subtitle={(featureData.campaigns_with_players || 0) + ' campaigns'}
              />
              <StatCard
                title="Total Transactions"
                value={featureData.total_transactions || 0}
                subtitle={(featureData.campaigns_with_transactions || 0) + ' campaigns'}
              />
              <StatCard
                title="Total Containers"
                value={featureData.total_containers || 0}
                subtitle={(featureData.campaigns_with_containers || 0) + ' campaigns'}
              />
            </div>
          </section>

          <section>
            <h2 className="section-title">Item Breakdown</h2>
            <div className="stats-grid">
              <StatCard
                title="Treasure Items"
                value={itemStats.treasure_items || 0}
                subtitle="Gold/valuables"
              />
              <StatCard
                title="Loot Items"
                value={itemStats.loot_items || 0}
                subtitle="Equipment/gear"
              />
              <StatCard
                title="Assigned"
                value={itemStats.assigned_items || 0}
                subtitle="To players/party"
              />
              <StatCard
                title="Unassigned"
                value={itemStats.unassigned_items || 0}
                subtitle="Pending distribution"
              />
              <StatCard
                title="Consumables"
                value={itemStats.consumable_items || 0}
                subtitle="One-time use"
              />
              <StatCard
                title="Attunement"
                value={(itemStats.attuned_items || 0) + '/' + (itemStats.items_with_attunement || 0)}
                subtitle="Attuned / Requires"
              />
            </div>
          </section>

          <section>
            <div className="charts-grid">
              <FeatureUtilizationChart data={featureData} totalCampaigns={stats.total_campaigns} />
              <FeaturesBySystemChart data={featuresBySystem} />
              <RarityChart data={rarityData} />
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
              <StatCard
                title="Total Player Gold"
                value={formatGold(goldStats.total_player_gold)}
                subtitle="Across all players"
              />
              <StatCard
                title="Total Party Funds"
                value={formatGold(goldStats.total_party_fund_gold)}
                subtitle="Shared gold"
              />
              <StatCard
                title="Avg Player Gold"
                value={formatGold(goldStats.avg_player_gold)}
                subtitle="Per player"
              />
              <StatCard
                title="Avg Party Fund"
                value={formatGold(goldStats.avg_party_fund)}
                subtitle="Per campaign"
              />
              <StatCard
                title="Transaction Volume"
                value={formatGold(goldStats.total_transaction_volume)}
                subtitle="Total gold moved"
              />
              <StatCard
                title="Total Item Value"
                value={formatGold(itemStats.total_item_value)}
                subtitle="All items"
              />
              <StatCard
                title="Avg Item Value"
                value={formatGold(itemStats.avg_item_value)}
                subtitle="Per item"
              />
            </div>
          </section>

          <section>
            <h2 className="section-title">Transaction Analysis</h2>
            <div className="charts-grid">
              <TransactionChart data={transactionData} />
              <GameSystemChart data={gameSystemData} />
            </div>
          </section>
        </>
      )}

      <footer>
        <p>Data refreshes on page load | Test accounts filtered</p>
      </footer>
    </div>
  );
}
