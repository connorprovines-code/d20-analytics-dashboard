export const metadata = {
  title: 'D20 Loot Tracker Analytics',
  description: 'Usage metrics and analytics dashboard',
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
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
