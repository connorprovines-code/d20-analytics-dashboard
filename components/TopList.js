'use client';

export default function TopList({ title, rows, labelKey, valueKey, empty = 'No data yet' }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <div className="no-data">{empty}</div>
      ) : (
        <ol className="top-list">
          {rows.map((r) => (
            <li key={r[labelKey]}>
              <span className="top-list-label">{r[labelKey]}</span>
              <span className="top-list-bar" style={{ width: `${(Number(r[valueKey]) / max) * 100}%` }} />
              <span className="top-list-value">{Number(r[valueKey]).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
