'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FeatureUtilizationChart({ data, totalCampaigns }) {
  const features = [
    { name: 'Items', value: data.campaigns_with_items || 0 },
    { name: 'Players', value: data.campaigns_with_players || 0 },
    { name: 'Party Fund', value: data.campaigns_with_party_fund || 0 },
    { name: 'Containers', value: data.campaigns_with_containers || 0 },
    { name: 'Transactions', value: data.campaigns_with_transactions || 0 }
  ];

  const formattedData = features.map(f => ({
    ...f,
    percentage: totalCampaigns > 0 ? ((f.value / totalCampaigns) * 100).toFixed(1) : 0
  }));

  return (
    <div className="chart-container">
      <h2>Feature Adoption</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, totalCampaigns || 100]} />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip
            formatter={(value, name, props) => [
              `${value} campaigns (${props.payload.percentage}%)`,
              'Using Feature'
            ]}
          />
          <Bar dataKey="value" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
