'use client';

import { useEffect, useState } from 'react';
import { getSignupMetrics, getCampaignMetrics, getOverviewStats, getUserActivityMetrics } from '../lib/metrics';
import SignupChart from '../components/SignupChart';
import CampaignChart from '../components/CampaignChart';
import StatCard from '../components/StatCard';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [signups, campaigns, activity, overview] = await Promise.all([
          getSignupMetrics(30),
          getCampaignMetrics(30),
          getUserActivityMetrics(30),
          getOverviewStats()
        ]);

        setSignupData(signups);
        setCampaignData(campaigns);
        setActivityData(activity);
        setStats(overview);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
      </header>

      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          subtitle="All-time signups"
        />
        <StatCard
          title="New Users (7d)"
          value={stats.new_users_7d}
          subtitle="Last 7 days"
        />
        <StatCard
          title="Total Campaigns"
          value={stats.total_campaigns}
          subtitle="All-time"
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
