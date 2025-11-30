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
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          .stat-card h3 {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
            margin-bottom: 0.5rem;
          }

          .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
          }

          .stat-subtitle {
            font-size: 0.875rem;
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
