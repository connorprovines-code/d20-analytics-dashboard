# D20 Loot Tracker Analytics Dashboard

Analytics dashboard for D20 Loot Tracker: signups, campaigns, engagement, the Discord bot, the Foundry VTT module, the Android beta, app errors, and community feedback. Anyone with the URL can view it (Connor's call, 2026-09-24); it is not indexed.

## How it works

- All data is fetched server-side. The browser never talks to Supabase, Discord or Sentry, and no key is shipped to the client.
- Postgres is reached over `DATABASE_URL` with the `pg` package. The page calls the same 16 analytics functions as before (`get_signup_metrics`, `get_overview_stats`, ...) plus direct counts on the Discord bot and Android beta tables.
- Every source fails soft: if a table, API or token is missing, only its cards show "unavailable".
- Discord and Sentry responses are cached for 5 minutes (`unstable_cache`, `revalidate: 300`), Google Play reports for 1 hour.

## Tabs

| Tab | Source |
| --- | --- |
| Overview, Engagement, Features, Economy | The 16 analytics functions in `supabase_analytics_functions.sql` |
| Acquisition | `auth.users` (`raw_user_meta_data.signup_source`), first session in `auth.sessions`, first join in `public.campaign_members`. See below. |
| Discord Bot | Servers with the app: Discord's `approximate_guild_count` from `GET /applications/@me` (bot token of the "D20 Loot Tracker" app, id 1552490984791744573). `public.discord_accounts`, `public.discord_channels`, `public.discord_command_usage` (last 30 days) |
| Foundry | `public.foundry_connections` joined to `public.campaigns` (game system) and `auth.users`; signups whose first touch was Foundry from `raw_user_meta_data.signup_source`; module downloads and update checks from `public.foundry_package_hits`. Aggregates only. See below. |
| Android | Play Store installs from the Google Play statistics reports bucket (see below); `public.android_beta_signups`, `public.android_beta_optins` (12 testers for 14 days rule) |
| App Health | sentry.io: unresolved issues (`/organizations/{org}/issues/`), accepted error events 24h/7d (`/organizations/{org}/stats_v2/`), plus the overview numbers |
| Feedback & Bugs | Last 30 messages in Discord #bug-reports and #feature-requests; a ✅ reaction marks a message Fixed |

The date range selector is a `?range=` URL parameter; the active tab is `?tab=`.

## Acquisition: where signups came from

Since 2026-09-27 the app saves where each new account came from in `user_metadata.signup_source`
(`src/signupSource.js` in the backend repo): the platform, how they entered the app (invite, guest
link, demo, Discord, Foundry), the referrer host and utm tags, and `site`. `site` is the marketing
site's record of the visitor's first visit there, carried in a `d20_src` cookie on the shared
`d20-loot-tracker.com` domain.

`lib/acquisition.js` sorts each signup into one channel, first match wins:

| Channel | Rule |
| --- | --- |
| Invited by a group | Joined someone else's campaign within 2 days of signing up, or entered through an invite or guest link |
| Android app | Signed up in the app, or (older accounts) their first session was in the app's WebView |
| Web | Everything else with a recorded source, broken down by the earliest source known: marketing site utm tag, marketing site referrer, then entering through the Foundry module or the Discord bot, then app utm tag, app referrer, else Direct |
| Web, source not recorded | Older accounts with none of the above |

The range covers whole UTC days, so the cards and the chart add up.

foundryvtt.com, The Forge (`forge-vtt.com`) and self-hosted Foundry servers (localhost or a private IP)
are labelled "Foundry VTT". A GM who clicks Connect inside Foundry arrives with their own server as
the referrer, so entering through the app's `/foundry` page wins over the app-side referrer.

## Foundry: is the module getting used

Counted on the account that connected the world, test accounts excluded (same rule as Acquisition):

- Live worlds (not revoked), with the accounts and campaigns behind them, and their game systems
- Active (7d): live worlds the module checked in from in the last 7 days (`last_seen_at`)
- New worlds in the range, per week, split into accounts created in the range and older accounts
- Signups from Foundry in the range, and how many of them connected a world. An account counts when
  any recorded first-visit signal points at Foundry (`isFoundryFirstTouch` in `lib/acquisition.js`):
  it entered through the app's `/foundry` pairing page; its app referrer, marketing site referrer or
  utm_source is Foundry (foundryvtt.com, forge-vtt.com, localhost or a private IP, `utm_source=foundry`);
  or its first marketing site page was `/foundry-vtt-loot-tracker`, `/guides/foundry-vtt-module-guide`
  or `/vs/foundry-vtt-loot-tracker`.

No world titles, emails, user ids or campaign names reach the page.

## Foundry: module installs

The app logs every request for the module's files to `public.foundry_package_hits` (one row per UTC day,
kind, version and client; `client` is a truncated HMAC of the requester, so distinct clients approximate
Foundry servers). The tab shows:

- Module downloads in the range: sum of `hits` for kind `download` (new installs and updates), and by version
- Servers checking (7d): distinct clients with a `manifest` row in the last 7 days (Foundry fetching the
  latest `module.json` to check for updates)
- Per week: downloads and distinct servers checking

Until the table exists (it ships with the app deploy that starts counting), the section reads "Install
tracking starts with the next app deploy". Connor's own test servers count like any other server.

## Android: Play Store installs

Google Play writes daily install statistics as monthly CSV files (UTF-16) to the developer account's
private Cloud Storage bucket: `gs://pubsite_prod_8955575230808742503/stats/installs/installs_com.d20loottracker.app_YYYYMM_overview.csv`
(Play Console > Download reports > Statistics > Copy Cloud Storage URI). `lib/playReports.js` reads every
monthly overview file with a service account key (OAuth 2 JWT, scope `devstorage.read_only`, no SDK) and shows:

- Active devices on the latest reported day (`Active Device Installs`)
- User installs, device installs and uninstalls (`Daily User Uninstalls`) over the 30 days ending on the
  latest reported day, with the latest day's value; user installs since the first report
- A 30-day daily series of installs and of active devices

Play posts each day with a lag of a few days. The service account is
`d20-play-reports@connor-seo-tool.iam.gserviceaccount.com` (Google Cloud project `connor-seo-tool`, no
project roles), invited in Play Console > Users and permissions with the account permission "View app
information and download bulk reports (read-only)", the only level that opens the bulk reports. Its key is
in the Dossier vault as `d20_play_reports_service_account`. Google can take 24 hours or more after the
invite before the bucket answers; until then the section reads "Not available yet".

## Environment variables

All are server-side only. Set them in Vercel (Production and Preview) and in `.env.local` for local runs.

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase Postgres connection string. Use the pooler in transaction mode (port 6543). SSL is on with certificate verification off, as the Supabase pooler requires. |
| `DISCORD_LOOT_BOT_TOKEN` | for the Discord server count | Bot token of the "D20 Loot Tracker" app (id 1552490984791744573), vault discord_loot_app_bot_token. Falls back to DISCORD_BOT_TOKEN when unset. A token of another bot is refused for the server count. |
| `DISCORD_BOT_TOKEN` | for Feedback & Bugs (and the server count if the one above is unset) | Bot token of the "D20 Loot Tracker" app (id 1552490984791744573), which is in the D20 Discord server and can read #bug-reports and #feature-requests. Needs the Message Content intent for message text. A token of another bot is refused for the server count. |
| `GOOGLE_PLAY_SA_KEY` | for Play Store installs | The service account key file's JSON (or the same JSON base64-encoded). Vault: `d20_play_reports_service_account`. |
| `PLAY_REPORTS_BUCKET` | no | Play reports bucket. Defaults to `pubsite_prod_8955575230808742503`. |
| `SENTRY_AUTH_TOKEN` | for App Health errors | sentry.io token with `event:read` (issues) and `org:read` (event stats). A source-map upload token (`org:ci`) is not enough. |
| `SENTRY_ORG` | no | sentry.io organization slug. Defaults to `d20-loot-tracker`. |
| `SENTRY_PROJECT` | no | Numeric sentry.io project ID to limit the counts to one project. Defaults to all projects in the org. |

The old `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DASHBOARD_PASSWORD` and `DASHBOARD_SESSION_SECRET` are no longer used and can be removed from Vercel.

## Lock down the analytics functions

The 16 functions are `SECURITY DEFINER` and were executable with the public anon key. After the server-side version is deployed and verified, run `supabase/revoke_anon.sql` in the Supabase SQL editor. It revokes `EXECUTE` from `public`, `anon` and `authenticated` and grants it to `postgres` and `service_role` only. The rollback statement is at the bottom of the file.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values; .env.local is gitignored
npm run dev -- -p 3150
```

Open http://localhost:3150.

Tests (pure functions, no database): `npm test`.

## Test account filtering

All analytics functions exclude accounts whose email contains both "connor" and "provines" (the
Acquisition and Foundry tabs also exclude `@agentmail.to`, the Play review account and other agent-made accounts):

```sql
AND NOT (
  email ILIKE '%connor%' AND email ILIKE '%provines%'
)
```

## Project structure

```
app/
  layout.js             Global styles
  page.js               Server component: loads every source
components/
  Dashboard.js          Client component: tabs and range selector
  *Chart.js, StatCard.js, TopList.js, FeedbackList.js, Unavailable.js
lib/
  db.js                 pg pool (server-only)
  metrics.js            Analytics functions, acquisition, Discord bot, Foundry and Android beta queries
  acquisition.js        Signup channels, web sources and the Foundry first-touch rule (pure functions)
  sentry.js             sentry.io API
  discordFeedback.js    Discord channel messages
  installs.js           Cached Play and Discord install sources
  playReports.js        Play installs reports: CSV parsing and Cloud Storage reads
  discordApp.js         Discord server count
  safe.js               Fail-soft wrapper
test/                   node --test files for lib/acquisition.js, the Play reports parser and the fail-soft paths
supabase/revoke_anon.sql
supabase_analytics_functions.sql
```

## Related repos

- [Frontend](https://github.com/connorprovines-code/d20-loot-tracker-front-end)
- [Backend](https://github.com/connorprovines-code/D20-Loot-tracker-back-end)
- [Discord Bot](https://github.com/connorprovines-code/d20-loot-tracker-discord-bot)

## License

MIT
