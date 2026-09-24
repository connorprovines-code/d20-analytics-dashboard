'use client';

export default function Unavailable({ title, reason }) {
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      <div className="no-data">unavailable{reason ? ` (${reason})` : ''}</div>
    </div>
  );
}
