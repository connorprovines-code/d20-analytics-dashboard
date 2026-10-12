// Install numbers from outside the database: Google Play (Android) and Discord. Server-side only.
// Both fail soft: a missing key, an access error or an unexpected file shows on their own cards.
import { unstable_cache } from 'next/cache';
import { safe } from './safe';
import { readPlayInstalls } from './playReports';
import { readDiscordApp } from './discordApp';

// Play posts the reports once a day with a lag of a few days, so an hour of caching loses nothing.
const cachedPlay = unstable_cache(
  () => readPlayInstalls({
    keyJson: process.env.GOOGLE_PLAY_SA_KEY,
    bucket: process.env.PLAY_REPORTS_BUCKET || undefined,
  }),
  ['play-installs-v1'],
  { revalidate: 3600 }
);

const cachedDiscordApp = unstable_cache(
  () => readDiscordApp({ token: process.env.DISCORD_BOT_TOKEN }),
  ['discord-app-v1'],
  { revalidate: 300 }
);

export async function getPlayInstalls() {
  const r = await safe('google play installs', () => cachedPlay());
  return { data: r.data, reason: r.reason, pending: Boolean(r.reason && r.reason.startsWith('not available yet')) };
}

export async function getDiscordApp() {
  const r = await safe('discord application', () => cachedDiscordApp());
  return { data: r.data, reason: r.reason };
}
