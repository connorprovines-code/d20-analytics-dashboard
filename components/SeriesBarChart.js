'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Side-by-side bars for a few series per day (or per week, starting on each bar's date).
// series: [{ key, label, color }]
export default function SeriesBarChart({ title, data, series, weekly = false }) {
  // Legend and tooltip in the order the series are given (Recharts sorts them by name otherwise).
  const order = (item) => series.findIndex((s) => s.key === item.dataKey);
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(d) => (weekly ? `Week of ${d}` : d)} itemSorter={order} />
          <Legend itemSorter={order} formatter={(value) => <span style={{ color: '#333' }}>{value}</span>} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
