'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c43'];
const GAME_LABELS = {
  'dnd-5e': 'D&D 5e',
  'pathfinder-1e': 'Pathfinder 1e',
  'pathfinder-2e': 'Pathfinder 2e',
  'other': 'Other'
};

export default function GameSystemChart({ data }) {
  const formattedData = data.map(d => ({
    name: GAME_LABELS[d.game_system] || d.game_system,
    value: Number(d.count),
    game_system: d.game_system
  }));

  return (
    <div className="chart-container">
      <h2>Campaigns by Game System</h2>
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
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
