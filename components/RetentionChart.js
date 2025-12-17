'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RetentionChart({ data }) {
  const chartData = [
    { name: 'Week 1', users: Number(data.users_active_week_1 || 0) },
    { name: 'Week 2', users: Number(data.users_active_week_2 || 0) },
    { name: 'Week 3', users: Number(data.users_active_week_3 || 0) },
    { name: 'Week 4', users: Number(data.users_active_week_4 || 0) }
  ];

  return (
    <div className="chart-container">
      <h2>User Activity by Week (Last 30 Days)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="users" fill="#8884d8" name="Active Users" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
