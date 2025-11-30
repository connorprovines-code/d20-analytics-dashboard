'use client';

import { useEffect, useState } from 'react';
import { getSignupMetrics, getCampaignMetrics, getOverviewStats, getUserActivityMetrics } from '../lib/metrics';
import SignupChart from '../components/SignupChart';
import CampaignChart from '../components/CampaignChart';
import StatCard from '../components/StatCard';

// Helper function to fill in missing days with zero counts
function fillMissingDays(data, days) {
  const filled = [];
  const dataMap = new Map(data.map(d => [d.date, d.count]));

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    filled.push({
      date: dateStr,
      count: dataMap.get(dateStr) || 0
    });
  }

  return filled;
}

export default function Dashboard() {
  const [signupData, setSignupData] = useState([]);
  const [campaignData, setCampaignData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_campaigns: 0,
    active_campaigns_7d: 0,
    new_users_7d: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [signups, campaigns, activity, overview] = await Promise.all([
          getSignupMetrics(dateRange),
          getCampaignMetrics(dateRange),
          getUserActivityMetrics(dateRange),
          getOverviewStats()
        ]);

        // Fill in missing days with zero counts
        const filledSignups = fillMissingDays(signups, dateRange);
        const filledCampaigns = fillMissingDays(campaigns, dateRange);
        const filledActivity = fillMissingDays(activity, dateRange);

        setSignupData(filledSignups);
        setCampaignData(filledCampaigns);
        setActivityData(filledActivity);
        setStats({
          ...overview,
          // Calculate totals for the selected date range
          signups_in_range: filledSignups.reduce((sum, item) => sum + item.count, 0),
          campaigns_in_range: filledCampaigns.reduce((sum, item) => sum + item.count, 0)
        });
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
        <h1>🎲 D20 Loot Tracker Analytics</h1>
        <p className="subtitle">Usage metrics dashboard (test accounts filtered)</p>
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
      </header>

      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          subtitle="All-time signups"
        />
        <StatCard
          title={`Signups (${dateRange}d)`}
          value={stats.signups_in_range || 0}
          subtitle="In selected range"
        />
        <StatCard
          title="Total Campaigns"
          value={stats.total_campaigns}
          subtitle="All-time"
        />
        <StatCard
          title={`Campaigns (${dateRange}d)`}
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
      </div>

      <div className="charts-grid">
        <SignupChart data={signupData} />
        <CampaignChart data={campaignData} />
      </div>

      <footer>
        <p>Data updated in real-time | Test accounts filtered (emails containing both "connor" AND "provines")</p>
      </footer>
    </div>
  );
}
