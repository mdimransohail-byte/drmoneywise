/* ════════════════════════════════════════════════════════════════════════
   /portfolio-health — the Premium portfolio health check page.
   The page itself is a shell; public/portfolio-health.js fills it in from
   /api/member/portfolio-health (Premium) or, for everyone else, from a
   live example portfolio (/api/site/portfolio-health-example).
   ════════════════════════════════════════════════════════════════════════ */

import { portfolioHealth } from './healthCheckService.js';
import { buildHeadTags, pageShell } from './seoService.js';

const EXAMPLE = [
  { ticker: 'VOO', weight: 40 }, { ticker: 'AAPL', weight: 15 }, { ticker: 'JPM', weight: 15 },
  { ticker: 'KO', weight: 15 }, { ticker: 'XOM', weight: 15 },
];
let exampleCache = null;

/** A real check of a made-up example portfolio (equal amounts, no prices paid). */
export async function examplePortfolioHealth() {
  if (exampleCache && Date.now() - exampleCache.at < 6 * 60 * 60 * 1000) return exampleCache.data;
  const data = await portfolioHealth(EXAMPLE);
  exampleCache = { at: Date.now(), data };
  return data;
}

export function renderHealthCheckPage(origin) {
  const head = buildHeadTags({
    title: 'Portfolio health check | Dr MoneyWise Premium',
    description: 'A score for every holding and for your whole portfolio, from official company figures: business quality, profit trend, outlook, big funds and how spread out you are.',
    canonical: `${origin}/portfolio-health`,
  });
  const body = `
      <section class="block pf-page">
        <p class="crumbs"><a href="/markets">Markets</a> › Portfolio health check</p>
        <div id="pfApp" class="pf-app"><div class="pf-loading">Checking your portfolio…</div></div>
        <noscript><p class="note-box">The health check needs JavaScript switched on.</p></noscript>
        <details class="pr-explain" style="margin-top:22px"><summary>How the health check works</summary><ul>
          <li><strong>Each company</strong> is scored out of 100 on up to five checks: <strong>Business</strong> (our five-point report card from its official filings, 40%), <strong>Profit trend</strong> (how fast earnings per share grew, 20%), <strong>Outlook</strong> (where the price would be in 3 years if it simply followed profits at their past pace, 15%), <strong>vs your price</strong> (today’s price against what you paid, 15%) and <strong>Big funds</strong> (famous funds buying or selling last quarter, 10%). Checks we cannot work out are left out and the others count for more.</li>
          <li><strong>Each ETF</strong> is scored on its yearly fee, how many investments it holds, how spread out they are, and today’s price against what you paid.</li>
          <li><strong>Your portfolio score</strong> is three quarters the average of your holdings (bigger holdings count more) and one quarter how well spread your money is: number of holdings, size of the biggest one, and how many areas of the economy you cover.</li>
          <li>Bands: 80+ Strong, 65–79 Healthy, 50–64 Fair, 35–49 Watch, under 35 Weak.</li>
          <li>The Outlook is our own simple sum, not an analyst forecast and not a prediction. Real prices can move very differently.</li>
          <li>This check describes businesses and how your holdings have done. It is not advice to buy, sell or hold anything. Please read our <a href="/disclaimer">disclaimer</a>.</li>
        </ul></details>
      </section>
      <script src="/portfolio-health.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}
