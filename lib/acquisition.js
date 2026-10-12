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
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)claude\.ai$/, 'Claude'],
  // Came through the marketing site but its first-visit cookie was missing (blocked or cleared).
  [/(^|\.)d20-loot-tracker\.com$/, 'Marketing site'],
];

export function hostLabel(host) {
  const h = String(host).toLowerCase();
  if (isFoundryHost(h)) return 'Foundry VTT';
  const hit = HOSTS.find(([re]) => re.test(h));
  return hit ? hit[1] : h.replace(/^www\./, '');
}

// Bare lowercase host from a host or a URL: no scheme, port, path or IPv6 brackets.
function hostOf(value) {
  let h = String(value).trim().toLowerCase();
  if (h.includes('://')) {
    try {
      h = new URL(h).hostname;
    } catch {
      return '';
    }
  }
  h = h.split(/[/?#]/)[0];
  const v6 = h.match(/^\[([^\]]+)\]/);
  return v6 ? v6[1] : h.replace(/:\d+$/, '');
}

// localhost, or a loopback, private-network or link-local IP (IPv4 or IPv6).
function isLocalHost(h) {
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  return h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h);
}

// ---------------------------------------------------------------
// Foundry VTT first touch
// ---------------------------------------------------------------
// Marketing site pages about the Foundry module.
export const FOUNDRY_LANDINGS = ['/foundry-vtt-loot-tracker', '/guides/foundry-vtt-module-guide', '/vs/foundry-vtt-loot-tracker'];

// foundryvtt.com, The Forge (hosted Foundry, <name>.forge-vtt.com), or a self-hosted Foundry server.
// A GM who clicks Connect inside Foundry arrives with their own server (localhost, a private IP, a
// Forge host) as the referrer.
export function isFoundryHost(value) {
  const h = hostOf(value);
  return /(^|\.)foundryvtt\.com$|(^|\.)forge-vtt\.com$/.test(h) || isLocalHost(h);
}

function landingPath(value) {
  return String(value).split(/[?#]/)[0].replace(/(.)\/+$/, '$1').toLowerCase();
}

// True when anything recorded about the account's first visit points at Foundry: the app's /foundry
// pairing page, a Foundry referrer or utm_source (app or marketing site), or a first landing on one of
// the marketing site's Foundry pages.
export function isFoundryFirstTouch(source) {
  if (!source || typeof source !== 'object') return false;
  const site = source.site && typeof source.site === 'object' ? source.site : {};
  if (source.entry === 'foundry') return true;
  if ([source.referrer, site.ref].some((h) => h && isFoundryHost(h))) return true;
  const utmIsFoundry = (u) => u && (String(u).trim().toLowerCase() === 'foundry' || isFoundryHost(u));
  if ([source.utm_source, site.utm_source].some(utmIsFoundry)) return true;
  return Boolean(site.landing) && FOUNDRY_LANDINGS.includes(landingPath(site.landing));
}

const UTM_NAMES = {
  google: 'Google', reddit: 'Reddit', discord: 'Discord', youtube: 'YouTube', facebook: 'Facebook',
  instagram: 'Instagram', twitter: 'X', x: 'X', bluesky: 'Bluesky', foundry: 'Foundry VTT',
};

function utmLabel(value) {
  return UTM_NAMES[String(value).toLowerCase()] || String(value);
}

// Earliest known source first: the marketing site's record of the first visit. Without it, entering
// through the Foundry module or the Discord bot wins over the app's referrer and utm tags: a GM who
// clicks Connect inside Foundry arrives with their own Foundry server as the referrer.
export function webSourceFor(source) {
  const site = source.site || {};
  if (site.utm_source) return utmLabel(site.utm_source);
  if (site.ref) return hostLabel(site.ref);
  if (source.entry === 'foundry') return 'Foundry module';
  if (source.entry === 'discord') return 'Discord bot';
  if (source.utm_source) return utmLabel(source.utm_source);
  if (source.referrer) return hostLabel(source.referrer);
  return 'Direct';
}

export function bucketKey(dateStr, weekly) {
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
