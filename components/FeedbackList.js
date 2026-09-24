'use client';

export default function FeedbackList({ title, messages }) {
  return (
    <div className="chart-container">
      <h2>{title}</h2>
      {messages.length === 0 ? (
        <div className="no-data">No messages</div>
      ) : (
        <ul className="feedback-list">
          {messages.map((m) => (
            <li key={m.id} className="feedback-item">
              <div className="feedback-meta">
                <span className={m.fixed ? 'badge badge-fixed' : 'badge badge-open'}>{m.fixed ? 'Fixed' : 'Open'}</span>
                <span className="feedback-author">{m.author}</span>
                <span className="feedback-date">{m.date}</span>
              </div>
              <p className="feedback-text">
                {m.text || <em>(no text)</em>}
                {m.extras && <span className="feedback-extras"> [{m.extras}]</span>}
              </p>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="feedback-link">
                Open in Discord
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
