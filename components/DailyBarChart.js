'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailyBarChart({ title, data, color = '#8884d8', label = 'Count' }) {
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill={color} name={label} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
