'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// One value per day. Days without a value (null) leave a gap instead of drawing a fake zero.
export default function DailyLineChart({ title, data, dataKey, color = '#3ddc84', label = 'Count' }) {
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
