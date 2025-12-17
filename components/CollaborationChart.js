'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

export default function CollaborationChart({ data }) {
  const campaignData = [
    { name: 'Solo Campaigns', value: Number(data.solo_campaigns || 0) },
    { name: 'Multi-User', value: Number(data.multi_user_campaigns || 0) }
  ];

  const inviteData = [
    { name: 'Accepted', value: Number(data.invites_accepted || 0) },
    { name: 'Pending', value: Number(data.invites_pending || 0) },
    { name: 'Declined/Expired', value: Math.max(0, Number(data.total_invites_sent || 0) - Number(data.invites_accepted || 0) - Number(data.invites_pending || 0)) }
  ];

  return (
    <div className="chart-container">
      <h2>Collaboration Overview</h2>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ width: '45%' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#e2e8f0' }}>Campaign Types</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={campaignData}
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${value}`}
              >
                {campaignData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ width: '45%' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#e2e8f0' }}>Invite Status</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={inviteData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#82ca9d"
                dataKey="value"
                label={({ name, value }) => `${value}`}
              >
                {inviteData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
