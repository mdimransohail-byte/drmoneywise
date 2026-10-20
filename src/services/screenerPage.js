/* ════════════════════════════════════════════════════════════════════════
   /screener — Stock screener (Regular) with Big-fund data and the Fund
   explorer (Premium). public/screener.js draws everything from
   /api/screener (members) or /api/site/screener-preview (everyone else).
   ════════════════════════════════════════════════════════════════════════ */

import { buildHeadTags, pageShell } from './seoService.js';
import { screenerRows } from './screenerService.js';

/** Free preview: the ten companies with the best report-card scores. */
export async function screenerPreview() {
  const { rows } = await screenerRows({ premium: false });
  return { preview: true, rows: rows.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 10), total: rows.length };
}

export function renderScreenerPage(origin) {
  const head = buildHeadTags({
    title: 'Stock screener: find companies by growth, profit, debt and dividends | Dr MoneyWise',
    description: 'Filter large US companies by sales growth, profit, debt and dividend record, from their official filings. Premium adds what the big funds own.',
    canonical: `${origin}/screener`,
  });
  const body = `
      <section class="block sc-page">
        <p class="crumbs"><a href="/markets">Markets</a> › Stock screener</p>
        <div id="scApp"><div class="pf-loading">Loading the screener…</div></div>
        <details class="pr-explain" style="margin-top:22px"><summary>What the columns mean</summary><ul>
          <li><strong>Score</strong>: the average of our five report-card checks (growth, profit, debt, cash, dividend), out of 100.</li>
          <li><strong>Sales growth</strong>: sales last year compared with the year before. <strong>Profit margin</strong>: cents of profit kept from every $1 of sales.</li>
          <li><strong>Debt (years)</strong>: years of cash from the business it would take to repay long-term debt. Lower is safer.</li>
          <li><strong>Dividend raises</strong>: years in a row the dividend went up.</li>
          <li><strong>Big funds</strong> (Premium): how many of the ~20 famous funds we follow own it, how many bought or sold last quarter, the share of the company they own between them, and the fund with the biggest bet (the largest share of that fund’s own money). From their official 13F reports, filed up to 45 days after each quarter.</li>
          <li>Screens find companies that match rules; they are not recommendations to buy or sell.</li>
        </ul></details>
      </section>
      <script src="/screener.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}
