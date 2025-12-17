'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const RARITY_COLORS = {
  'common': '#9ca3af',
  'uncommon': '#22c55e',
  'rare': '#3b82f6',
  'very rare': '#a855f7',
  'legendary': '#f97316',
  'artifact': '#ef4444'
};

export default function RarityChart({ data }) {
  const formattedData = data.map(d => ({
    name: d.rarity ? d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1) : 'Unknown',
    value: Number(d.count),
    rarity: d.rarity
  }));

  if (formattedData.length === 0) {
    return (
      <div className="chart-container">
        <h2>D&D 5e Item Rarity</h2>
        <div className="no-data">No D&D 5e items with rarity data</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h2>D&D 5e Item Rarity</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={RARITY_COLORS[entry.rarity] || '#8884d8'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
