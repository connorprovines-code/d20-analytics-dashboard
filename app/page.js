import { getCoreMetrics, getDiscordBotMetrics, getFoundryMetrics, getAndroidBetaMetrics, getAcquisitionMetrics } from '../lib/metrics';
import { getSentryMetrics } from '../lib/sentry';
import { getFeedback } from '../lib/discordFeedback';
import { getPlayInstalls, getDiscordApp } from '../lib/installs';
import Dashboard from '../components/Dashboard';

export const dynamic = 'force-dynamic';

const RANGES = [7, 14, 30, 60, 90, 365];
const TABS = ['overview', 'acquisition', 'engagement', 'features', 'economy', 'discord', 'foundry', 'beta', 'health', 'feedback'];

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const range = RANGES.includes(Number(params?.range)) ? Number(params.range) : 30;
  const tab = TABS.includes(params?.tab) ? params.tab : 'overview';

  const [core, acquisition, discord, foundry, beta, sentry, feedback, play, discordApp] = await Promise.all([
    getCoreMetrics(range),
    getAcquisitionMetrics(range),
    getDiscordBotMetrics(),
    getFoundryMetrics(range),
    getAndroidBetaMetrics(range),
    getSentryMetrics(),
    getFeedback(),
    getPlayInstalls(),
    getDiscordApp(),
  ]);

  return (
    <Dashboard
      range={range}
      initialTab={tab}
      core={core}
      acquisition={acquisition}
      discord={discord}
      foundry={foundry}
      beta={beta}
      sentry={sentry}
      feedback={feedback}
      play={play}
      discordApp={discordApp}
      generatedAt={new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'}
    />
  );
}
