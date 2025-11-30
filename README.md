# D20 Loot Tracker Analytics Dashboard

Analytics dashboard for tracking D20 Loot Tracker usage metrics - signups, campaigns, and user activity.

## Features

- **Daily Signups** - Track new user registrations over time
- **Campaign Activity** - Monitor campaign creation trends
- **Overview Stats** - Quick metrics: total users, total campaigns, active campaigns (7d), new users (7d)
- **Test Account Filtering** - Automatically excludes emails containing both "connor" AND "provines"
- **Real-time Data** - Powered by Supabase with live metrics

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Recharts** - Beautiful charting library
- **Supabase** - PostgreSQL database with RPC functions
- **Vercel** - Deployment platform

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run Database Migration

Execute `supabase_analytics_functions.sql` in your Supabase SQL editor. This creates the analytics functions:

- `get_signup_metrics(days_back)` - Daily signup counts
- `get_campaign_metrics(days_back)` - Daily campaign creation counts
- `get_activity_metrics(days_back)` - Daily user activity (campaign joins)
- `get_overview_stats()` - Overview metrics for dashboard cards

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Test Account Filtering

All analytics queries automatically exclude accounts where the email contains **both** "connor" AND "provines". This filters out development/testing activity from metrics.

The filter is applied in the SQL functions:

```sql
AND NOT (
  email ILIKE '%connor%' AND email ILIKE '%provines%'
)
```

## Analytics Functions

### Overview Stats

Returns aggregated metrics:
- Total users (all-time, excluding test accounts)
- Total campaigns (all-time, excluding test campaigns)
- Active campaigns in last 7 days
- New users in last 7 days

### Signup Metrics

Daily breakdown of new user signups for the last 30 days (configurable).

### Campaign Metrics

Daily breakdown of campaign creations for the last 30 days (configurable).

### Activity Metrics

Daily breakdown of user activity (campaign member joins) for the last 30 days (configurable).

## Project Structure

```
d20-analytics-dashboard/
├── app/
│   ├── layout.js         # Root layout with global styles
│   └── page.js           # Main dashboard page
├── components/
│   ├── SignupChart.js    # Daily signups line chart
│   ├── CampaignChart.js  # Campaign activity bar chart
│   └── StatCard.js       # Metric card component
├── lib/
│   ├── supabase.js       # Supabase client setup
│   └── metrics.js        # Analytics data fetching functions
├── supabase_analytics_functions.sql  # Database functions
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Customization

### Change Date Range

Edit `app/page.js` to adjust the default days:

```javascript
const [signups, campaigns, activity, overview] = await Promise.all([
  getSignupMetrics(60),  // 60 days instead of 30
  getCampaignMetrics(60),
  getUserActivityMetrics(60),
  getOverviewStats()
]);
```

### Modify Test Account Filter

Edit the filter in `supabase_analytics_functions.sql`:

```sql
-- Example: Filter emails containing "test" OR "demo"
AND NOT (
  email ILIKE '%test%' OR email ILIKE '%demo%'
)
```

Then re-run the SQL in Supabase SQL Editor.

## Support

For issues related to the dashboard, check:
- Supabase project is active (not paused)
- Environment variables are correct
- Analytics functions are installed in Supabase

For D20 Loot Tracker core app issues, see:
- [Frontend](https://github.com/connorprovines-code/d20-loot-tracker-front-end)
- [Backend](https://github.com/connorprovines-code/D20-Loot-tracker-back-end)
- [Discord Bot](https://github.com/connorprovines-code/d20-loot-tracker-discord-bot)

## License

MIT
