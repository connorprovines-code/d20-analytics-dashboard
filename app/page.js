import { getCoreMetrics, getDiscordBotMetrics, getAndroidBetaMetrics } from '../lib/metrics';
import { getSentryMetrics } from '../lib/sentry';
import { getFeedback } from '../lib/discordFeedback';
import Dashboard from '../components/Dashboard';

export const dynamic = 'force-dynamic';

const RANGES = [7, 14, 30, 60, 90, 365];
const TABS = ['overview', 'engagement', 'features', 'economy', 'discord', 'beta', 'health', 'feedback'];

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const range = RANGES.includes(Number(params?.range)) ? Number(params.range) : 30;
  const tab = TABS.includes(params?.tab) ? params.tab : 'overview';

  const [core, discord, beta, sentry, feedback] = await Promise.all([
    getCoreMetrics(range),
    getDiscordBotMetrics(),
    getAndroidBetaMetrics(range),
    getSentryMetrics(),
    getFeedback(),
  ]);

  return (
    <Dashboard
      range={range}
      initialTab={tab}
      core={core}
      discord={discord}
      beta={beta}
      sentry={sentry}
      feedback={feedback}
      generatedAt={new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'}
    />
  );
}
