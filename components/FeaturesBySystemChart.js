'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const GAME_LABELS = {
  'dnd-5e': 'D&D 5e',
  'pathfinder-1e': 'PF1e',
  'pathfinder-2e': 'PF2e',
  'other': 'Other'
};

export default function FeaturesBySystemChart({ data }) {
  const formattedData = data.map(d => ({
    name: GAME_LABELS[d.game_system] || d.game_system,
    items: Number(d.avg_items || 0),
    players: Number(d.avg_players || 0),
    transactions: Number(d.avg_transactions || 0)
  }));

  return (
    <div className="chart-container">
      <h2>Avg Features per Campaign by System</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="items" fill="#8884d8" name="Avg Items" />
          <Bar dataKey="players" fill="#82ca9d" name="Avg Players" />
          <Bar dataKey="transactions" fill="#ffc658" name="Avg Transactions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
