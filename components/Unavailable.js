'use client';

// `message` replaces the "unavailable (reason)" text, for sources that are expected to be empty
// for now (Play access still propagating, Foundry install tracking not deployed yet).
export default function Unavailable({ title, reason, message }) {
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      <div className="no-data">{message || `unavailable${reason ? ` (${reason})` : ''}`}</div>
    </div>
  );
}
