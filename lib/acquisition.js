// Where signups came from. Pure functions over one row per signup (see getAcquisitionMetrics).
//
// New accounts carry user_metadata.signup_source, written by the app at sign-up: platform, how they
// entered the app (invite, guest link, ...), the referrer and utm tags, and `site`, the marketing
// site's record of the visitor's first visit there. Accounts from before that shipped have none, so
// they are placed from what the database already shows: a join to someone else's campaign, or a
// first session inside the Android app's WebView.

// Stack order, bottom to top. Colors validated for color-blind separation in this order.
export const CHANNELS = [
  { key: 'unrecorded', label: 'Web, source not recorded', color: '#9ca3af' },
  { key: 'invited', label: 'Invited by a group', color: '#2a78d6' },
  { key: 'android', label: 'Android app', color: '#eb6834' },
  { key: 'web', label: 'Web', color: '#1baf7a' },
];

const INVITE_WINDOW_MS = 2 * 86_400_000;

export function channelFor(row) {
  const s = row.source && typeof row.source === 'object' ? row.source : null;
  // pg hands timestamps back as Date objects; strings work too.
  const joinedSoon = row.first_join && new Date(row.first_join) - new Date(row.created_at) < INVITE_WINDOW_MS;
  if (joinedSoon || s?.entry === 'invite' || s?.entry === 'guest') return 'invited';
  if (s?.platform === 'android' || (!s && /; wv\)/.test(row.user_agent || ''))) return 'android';
  return s ? 'web' : 'unrecorded';
}

// Referrer hosts grouped into names. Android apps report themselves as android-app://<package>.
const HOSTS = [
  [/(^|\.)gemini\.google\.com$/, 'Gemini'],
  [/(^|\.)google\.[a-z.]+$|googlequicksearchbox/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)search\.yahoo\.com$|(^|\.)yahoo\.[a-z.]+$/, 'Yahoo'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
  [/(^|\.)search\.brave\.com$/, 'Brave Search'],
  [/(^|\.)reddit\.com$|^redd\.it$|com\.reddit\.frontpage/, 'Reddit'],
  [/(^|\.)discord(app)?\.(com|gg)$|^com\.discord$/, 'Discord'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/(^|\.)facebook\.com$|^fb\.com$|^l\.facebook\.com$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'X'],
  [/(^|\.)bsky\.app$/, 'Bluesky'],
  [/(^|\.)foundryvtt\.com$/, 'Foundry VTT'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)claude\.ai$/, 'Claude'],
  // Came through the marketing site but its first-visit cookie was missing (blocked or cleared).
  [/(^|\.)d20-loot-tracker\.com$/, 'Marketing site'],
];

export function hostLabel(host) {
  const h = String(host).toLowerCase();
  const hit = HOSTS.find(([re]) => re.test(h));
  return hit ? hit[1] : h.replace(/^www\./, '');
}

const UTM_NAMES = {
  google: 'Google', reddit: 'Reddit', discord: 'Discord', youtube: 'YouTube', facebook: 'Facebook',
  instagram: 'Instagram', twitter: 'X', x: 'X', bluesky: 'Bluesky', foundry: 'Foundry VTT',
};

function utmLabel(value) {
  return UTM_NAMES[String(value).toLowerCase()] || String(value);
}

// Earliest known source first: the marketing site's record of the first visit, then what the app saw.
export function webSourceFor(source) {
  const site = source.site || {};
  if (site.utm_source) return utmLabel(site.utm_source);
  if (site.ref) return hostLabel(site.ref);
  if (source.utm_source) return utmLabel(source.utm_source);
  if (source.referrer) return hostLabel(source.referrer);
  if (source.entry === 'foundry') return 'Foundry module';
  if (source.entry === 'discord') return 'Discord bot';
  return 'Direct';
}

function bucketKey(dateStr, weekly) {
  if (!weekly) return dateStr;
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return d.toISOString().slice(0, 10);
}

// Every bucket in the range, oldest first, with a zero for each channel.
function emptyBuckets(days, weekly) {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = bucketKey(d.toISOString().slice(0, 10), weekly);
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys.map((date) => ({ date, ...Object.fromEntries(CHANNELS.map((c) => [c.key, 0])) }));
}

function ranked(counts) {
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function summariseAcquisition(rows, days) {
  const weekly = days > 30;
  const series = emptyBuckets(days, weekly);
  const byDate = new Map(series.map((b) => [b.date, b]));
  const totals = Object.fromEntries(CHANNELS.map((c) => [c.key, 0]));
  const sources = {};
  const landings = {};
  let viaSite = 0;

  for (const row of rows) {
    const channel = channelFor(row);
    totals[channel]++;
    const bucket = byDate.get(bucketKey(row.date, weekly));
    if (bucket) bucket[channel]++;
    if (channel !== 'web') continue;
    const label = webSourceFor(row.source);
    sources[label] = (sources[label] || 0) + 1;
    if (row.source.site) {
      viaSite++;
      const page = row.source.site.landing || '/';
      landings[page] = (landings[page] || 0) + 1;
    }
  }

  return {
    total: rows.length,
    totals,
    viaSite,
    weekly,
    series,
    sources: ranked(sources),
    landings: ranked(landings).slice(0, 10),
  };
}
