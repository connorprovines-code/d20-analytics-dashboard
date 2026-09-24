# D20 Loot Tracker Analytics Dashboard

Password-protected analytics dashboard for D20 Loot Tracker: signups, campaigns, engagement, the Discord bot, the Android beta, app errors, and community feedback.

## How it works

- All data is fetched server-side. The browser never talks to Supabase, Discord or Sentry, and no key is shipped to the client.
- Postgres is reached over `DATABASE_URL` with the `pg` package. The page calls the same 16 analytics functions as before (`get_signup_metrics`, `get_overview_stats`, ...) plus direct counts on the Discord bot and Android beta tables.
- `proxy.js` (Next 16's name for middleware) redirects every request without a valid session cookie to `/login`. The page checks the session again server-side.
- `/login` compares the password in constant time against `DASHBOARD_PASSWORD` and sets an httpOnly, secure, `SameSite=Lax` cookie signed with HMAC-SHA256 (`DASHBOARD_SESSION_SECRET`), valid for 30 days. `/logout` clears it.
- Every source fails soft: if a table, API or token is missing, only its cards show "unavailable".
- Discord and Sentry responses are cached for 5 minutes (`unstable_cache`, `revalidate: 300`).

## Tabs

| Tab | Source |
| --- | --- |
| Overview, Engagement, Features, Economy | The 16 analytics functions in `supabase_analytics_functions.sql` |
| Discord Bot | `public.discord_accounts`, `public.discord_channels`, `public.discord_command_usage` (last 30 days) |
| Android Beta | `public.android_beta_signups`, `public.android_beta_optins` (12 testers for 14 days rule) |
| App Health | sentry.io: unresolved issues (`/organizations/{org}/issues/`), accepted error events 24h/7d (`/organizations/{org}/stats_v2/`), plus the overview numbers |
| Feedback & Bugs | Last 30 messages in Discord #bug-reports and #feature-requests; a ✅ reaction marks a message Fixed |

The date range selector is a `?range=` URL parameter; the active tab is `?tab=`.

## Environment variables

All are server-side only. Set them in Vercel (Production and Preview) and in `.env.local` for local runs.

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase Postgres connection string. Use the pooler in transaction mode (port 6543). SSL is on with certificate verification off, as the Supabase pooler requires. |
| `DASHBOARD_PASSWORD` | yes | The single login password. |
| `DASHBOARD_SESSION_SECRET` | yes | HMAC key for the session cookie, at least 32 characters (for example `openssl rand -hex 32`). Changing it signs everyone out. |
| `DISCORD_BOT_TOKEN` | for Feedback & Bugs | Bot token of a bot in the D20 Discord server that can read #bug-reports and #feature-requests. Needs the Message Content intent for message text. |
| `SENTRY_AUTH_TOKEN` | for App Health errors | sentry.io token with `event:read` (issues) and `org:read` (event stats). A source-map upload token (`org:ci`) is not enough. |
| `SENTRY_ORG` | no | sentry.io organization slug. Defaults to `d20-loot-tracker`. |
| `SENTRY_PROJECT` | no | Numeric sentry.io project ID to limit the counts to one project. Defaults to all projects in the org. |

The old `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are no longer used and can be removed from Vercel.

## Lock down the analytics functions

The 16 functions are `SECURITY DEFINER` and were executable with the public anon key. After the server-side version is deployed and verified, run `supabase/revoke_anon.sql` in the Supabase SQL editor. It revokes `EXECUTE` from `public`, `anon` and `authenticated` and grants it to `postgres` and `service_role` only. The rollback statement is at the bottom of the file.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values; .env.local is gitignored
npm run dev -- -p 3150
```

Open http://localhost:3150 and sign in with `DASHBOARD_PASSWORD`.

## Test account filtering

All analytics functions exclude accounts whose email contains both "connor" and "provines":

```sql
AND NOT (
  email ILIKE '%connor%' AND email ILIKE '%provines%'
)
```

## Project structure

```
app/
  layout.js             Global styles
  page.js               Server component: checks the session, loads every source
  login/page.js         Password form
  login/actions.js      Server action: password check, sets the session cookie
  logout/route.js       Clears the session cookie
components/
  Dashboard.js          Client component: tabs and range selector
  *Chart.js, StatCard.js, TopList.js, FeedbackList.js, Unavailable.js
lib/
  db.js                 pg pool (server-only)
  auth.js               Session token signing and password check
  metrics.js            Analytics functions, Discord bot and Android beta queries
  sentry.js             sentry.io API
  discordFeedback.js    Discord channel messages
  safe.js               Fail-soft wrapper
proxy.js                Redirects unauthenticated requests to /login
supabase/revoke_anon.sql
supabase_analytics_functions.sql
```

## Related repos

- [Frontend](https://github.com/connorprovines-code/d20-loot-tracker-front-end)
- [Backend](https://github.com/connorprovines-code/D20-Loot-tracker-back-end)
- [Discord Bot](https://github.com/connorprovines-code/d20-loot-tracker-discord-bot)

## License

MIT
