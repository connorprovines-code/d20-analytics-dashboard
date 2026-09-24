'use client';

// value === null/undefined means the source could not be read: show "unavailable" instead of a fake zero.
export default function StatCard({ title, value, subtitle, reason }) {
  const missing = value === null || value === undefined;
  return (
    <div className={missing ? 'stat-card stat-card-unavailable' : 'stat-card'}>
      <h3>{title}</h3>
      <div className="stat-value">{missing ? 'unavailable' : value}</div>
      {missing
        ? reason && <div className="stat-subtitle">{reason}</div>
        : subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
