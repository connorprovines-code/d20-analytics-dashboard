'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHANNELS } from '../lib/acquisition';

// Legend and tooltip list the channels top to bottom, the way the bars stack (Recharts would
// otherwise sort them alphabetically).
const stackOrder = (item) => -CHANNELS.findIndex((c) => c.key === item.dataKey);

// Signups per day (or week) stacked by where they came from. The 2px stroke in the card's
// background color separates the segments.
export default function ChannelChart({ title, data, weekly }) {
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          {/* Month-day on the axis keeps the first label clear of the y-axis; the tooltip has the full date. */}
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(d) => (weekly ? `Week of ${d}` : d)} itemSorter={stackOrder} />
          <Legend itemSorter={stackOrder} formatter={(value) => <span style={{ color: '#333' }}>{value}</span>} />
          {CHANNELS.map((c) => (
            <Bar key={c.key} dataKey={c.key} name={c.label} stackId="signups" fill={c.color} stroke="#f8f9fa" strokeWidth={2} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
