// How many Discord servers have the "D20 Loot Tracker" app, from Discord's own count.
// GET /applications/@me with the bot token returns approximate_guild_count.
// No Next.js imports here, so node --test can load this file.
import { SourceError } from './safe.js';

export const DISCORD_APP_ID = '1552490984791744573';

export async function readDiscordApp({ token, fetchImpl = fetch } = {}) {
  if (!token) throw new SourceError('DISCORD_LOOT_BOT_TOKEN not set');
  const res = await fetchImpl('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) throw new SourceError('bot token rejected', `discord ${res.status}`);
  if (res.status === 429) throw new SourceError('rate limited');
  if (!res.ok) throw new SourceError(`discord HTTP ${res.status}`);
  const app = await res.json();
  // A token from another bot (the support bot, say) would report that bot's servers.
  if (app.id !== DISCORD_APP_ID) throw new SourceError('token is for a different Discord app', `app ${app.id}`);
  if (typeof app.approximate_guild_count !== 'number') throw new SourceError('server count missing');
  return { servers: app.approximate_guild_count };
}
