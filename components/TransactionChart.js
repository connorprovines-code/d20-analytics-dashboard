'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TYPE_LABELS = {
  'sell': 'Sell',
  'buy': 'Buy',
  'distribute': 'Distribute',
  'wages': 'Wages',
  'loot': 'Loot',
  'transfer': 'Transfer'
};

export default function TransactionChart({ data }) {
  const formattedData = data.map(d => ({
    name: TYPE_LABELS[d.type] || d.type,
    count: Number(d.count),
    volume: Number(d.total_volume || 0)
  }));

  return (
    <div className="chart-container">
      <h2>Transactions by Type</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={80} />
          <Tooltip formatter={(value) => value.toLocaleString()} />
          <Bar dataKey="count" fill="#8884d8" name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
