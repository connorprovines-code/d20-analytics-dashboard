// Recent #bug-reports and #feature-requests messages from the D20 Discord server, server-side only.
// Cached for 5 minutes so page loads stay far below Discord rate limits.
import { unstable_cache } from 'next/cache';
import { safe, SourceError } from './safe';

export const GUILD_ID = '1445189224641986781';
export const FEEDBACK_CHANNELS = [
  { key: 'bugs', title: '#bug-reports', id: '1445191313552314551' },
  // Looked up via GET /guilds/{GUILD_ID}/channels.
  { key: 'features', title: '#feature-requests', id: '1445495362650374244' },
];
const FIXED_EMOJI = '✅'; // white heavy check mark

async function fetchChannel(channelId) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new SourceError('DISCORD_BOT_TOKEN not set');
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=30`, {
    headers: { Authorization: `Bot ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) throw new SourceError('bot cannot read channel', `discord ${res.status}`);
  if (res.status === 429) throw new SourceError('rate limited');
  if (!res.ok) throw new SourceError(`discord HTTP ${res.status}`);
  const messages = await res.json();
  return messages.map((m) => {
    const text = (m.content || '').replace(/\s+/g, ' ').trim();
    const extras = [];
    if (m.attachments?.length) extras.push(`${m.attachments.length} attachment${m.attachments.length > 1 ? 's' : ''}`);
    if (m.embeds?.length) extras.push(`${m.embeds.length} embed${m.embeds.length > 1 ? 's' : ''}`);
    return {
      id: m.id,
      author: m.author?.global_name || m.author?.username || 'unknown',
      timestamp: m.timestamp,
      date: m.timestamp ? m.timestamp.slice(0, 16).replace('T', ' ') + ' UTC' : '',
      text: text.length > 200 ? text.slice(0, 200) + '...' : text,
      extras: extras.join(', '),
      fixed: (m.reactions || []).some((r) => r.emoji?.name === FIXED_EMOJI),
      url: `https://discord.com/channels/${GUILD_ID}/${channelId}/${m.id}`,
    };
  });
}

const cachedChannel = unstable_cache(fetchChannel, ['discord-feedback-v1'], { revalidate: 300 });

export async function getFeedback() {
  const results = await Promise.all(
    FEEDBACK_CHANNELS.map((c) => safe(`discord ${c.title}`, () => cachedChannel(c.id)))
  );
  return FEEDBACK_CHANNELS.map((c, i) => ({
    ...c,
    messages: results[i].data,
    reason: results[i].reason,
  }));
}
