export const metadata = {
  title: 'D20 Loot Tracker Analytics',
  description: 'Usage metrics and analytics dashboard',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
            padding: 2rem;
          }

          .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          }

          header {
            margin-bottom: 2rem;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 1rem;
          }

          h1 {
            color: #667eea;
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
          }

          .subtitle {
            color: #666;
            font-size: 1rem;
            margin-bottom: 1rem;
          }

          .controls {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            margin-top: 1rem;
          }

          .tabs {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .tabs button {
            padding: 0.5rem 1rem;
            border: 2px solid #667eea;
            border-radius: 6px;
            background: white;
            color: #667eea;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .tabs button:hover {
            background: rgba(102, 126, 234, 0.1);
          }

          .tabs button.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: transparent;
          }

          .date-range-selector {
            display: flex;
            align-items: center;
          }

          .date-range-selector label {
            font-weight: 600;
            color: #333;
            margin-right: 0.5rem;
          }

          .date-range-selector select {
            padding: 0.5rem 1rem;
            border: 2px solid #667eea;
            border-radius: 6px;
            background: white;
            color: #333;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s;
          }

          .date-range-selector select:hover {
            border-color: #764ba2;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
          }

          .date-range-selector select:focus {
            outline: none;
            border-color: #764ba2;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          section {
            margin-bottom: 2rem;
          }

          .section-title {
            color: #333;
            font-size: 1.5rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #f0f0f0;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.25rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          .stat-card h3 {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
            margin-bottom: 0.5rem;
          }

          .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
          }

          .stat-subtitle {
            font-size: 0.75rem;
            opacity: 0.8;
          }

          .charts-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
          }

          @media (min-width: 1024px) {
            .charts-grid {
              grid-template-columns: 1fr 1fr;
            }
          }

          .chart-container {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          .chart-container h2 {
            color: #333;
            font-size: 1.25rem;
            margin-bottom: 1rem;
          }

          .no-data {
            text-align: center;
            padding: 2rem;
            color: #999;
            font-style: italic;
          }

          footer {
            text-align: center;
            color: #999;
            font-size: 0.875rem;
            padding-top: 1rem;
            border-top: 1px solid #f0f0f0;
          }

          .loading, .error {
            text-align: center;
            padding: 4rem 2rem;
            font-size: 1.25rem;
            color: #667eea;
          }

          .error {
            color: #e74c3c;
          }

          .header-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: baseline;
            gap: 0.5rem 1rem;
          }

          .logout-link {
            color: #667eea;
            font-weight: 600;
            text-decoration: none;
            white-space: nowrap;
          }

          .logout-link:hover {
            text-decoration: underline;
          }

          .container.is-loading {
            opacity: 0.6;
            transition: opacity 0.2s;
          }

          .stat-card-unavailable {
            background: #e9eaf5;
            color: #5b5f7a;
            box-shadow: none;
          }

          .stat-card-unavailable .stat-value {
            font-size: 1.25rem;
            font-style: italic;
            padding: 0.4rem 0;
          }

          .top-list {
            list-style: none;
            display: grid;
            gap: 0.6rem;
          }

          .top-list li {
            display: grid;
            grid-template-columns: minmax(0, 8rem) 1fr auto;
            align-items: center;
            gap: 0.75rem;
          }

          .top-list-label {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 0.9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .top-list-bar {
            height: 0.9rem;
            min-width: 2px;
            border-radius: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .top-list-value {
            font-weight: 600;
            font-variant-numeric: tabular-nums;
          }

          .feedback-list {
            list-style: none;
            display: grid;
            gap: 0.75rem;
            max-height: 70vh;
            overflow-y: auto;
          }

          .feedback-item {
            background: white;
            border-radius: 6px;
            padding: 0.75rem;
            border: 1px solid #eceef6;
            min-width: 0;
          }

          .feedback-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.25rem 0.6rem;
            font-size: 0.8rem;
            color: #666;
            margin-bottom: 0.35rem;
          }

          .feedback-author {
            font-weight: 600;
            color: #333;
          }

          .feedback-text {
            font-size: 0.9rem;
            line-height: 1.4;
            overflow-wrap: anywhere;
            margin-bottom: 0.35rem;
          }

          .feedback-extras {
            color: #888;
            font-size: 0.8rem;
          }

          .feedback-link {
            font-size: 0.8rem;
            color: #667eea;
            font-weight: 600;
          }

          .badge {
            display: inline-block;
            padding: 0.1rem 0.5rem;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .badge-open {
            background: #fdecea;
            color: #b42318;
          }

          .badge-fixed {
            background: #e7f6ec;
            color: #1a7f37;
          }

          .login-box {
            max-width: 420px;
            margin-top: 10vh;
          }

          .login-box h1 {
            font-size: 1.75rem;
          }

          .login-form {
            display: grid;
            gap: 0.75rem;
          }

          .login-form label {
            font-weight: 600;
          }

          .login-form input {
            padding: 0.6rem 0.75rem;
            border: 2px solid #667eea;
            border-radius: 6px;
            font-size: 1rem;
            width: 100%;
          }

          .login-form input:focus {
            outline: none;
            border-color: #764ba2;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          }

          .login-form button {
            padding: 0.6rem 1rem;
            border: none;
            border-radius: 6px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .login-error {
            color: #e74c3c;
            font-weight: 600;
          }

          .chart-container {
            min-width: 0;
          }

          @media (max-width: 640px) {
            body {
              padding: 0.75rem;
            }

            .container {
              padding: 1rem;
            }

            h1 {
              font-size: 1.6rem;
            }

            .section-title {
              font-size: 1.2rem;
            }

            .stats-grid {
              grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            }

            .stat-value {
              font-size: 1.5rem;
            }

            .chart-container {
              padding: 1rem 0.5rem;
            }

            .chart-container h2 {
              padding: 0 0.5rem;
            }

            .tabs button {
              padding: 0.4rem 0.7rem;
              font-size: 0.85rem;
            }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
