/* ════════════════════════════════════════════════════════════════════════
   /insiders — Company bosses buying or selling their own shares (Premium)
   public/insiders.js draws the page from /api/insiders (Premium) or
   /api/site/insiders-preview (totals only, for everyone else). The same
   script fills the small box on each US company page.
   ════════════════════════════════════════════════════════════════════════ */

import { buildHeadTags, pageShell } from './seoService.js';
import { insiderSummary } from './insiderService.js';

/** Totals only: no names, no companies. */
export async function insiderPreview() {
  const s = await insiderSummary({ days: 90 });
  return { preview: true, days: s.days, totals: s.totals, companies: s.companies.length, updatedAt: s.updatedAt };
}

/** The box on a company page (filled in by insiders.js). */
export function insiderBoxHtml(ticker, name) {
  const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/"/gu, '&quot;');
  return `
      <section class="block members-box in-box" id="insidersBox" data-ticker="${esc(ticker)}">
        <div class="block-head"><div><h2>Company bosses’ trades <span class="sc-prem">Premium</span></h2>
          <p>When ${esc(name)}’s directors and top managers bought or sold its shares with their own money in the last 6 months, from their official Form 4 reports.</p></div></div>
        <div id="insidersContent"><div class="pf-loading">Loading…</div></div>
      </section>
      <script src="/insiders.js" defer></script>`;
}

export function renderInsidersPage(origin) {
  const head = buildHeadTags({
    title: 'Company bosses buying or selling their own shares | Dr MoneyWise',
    description: 'See when directors and top managers of large US companies buy or sell their own company’s shares, from their official SEC Form 4 reports, explained simply.',
    canonical: `${origin}/insiders`,
  });
  const body = `
      <section class="block sc-page">
        <p class="crumbs"><a href="/markets">Markets</a> › Company bosses’ trades</p>
        <div id="inApp"><div class="pf-loading">Loading the latest trades…</div></div>
        <details class="pr-explain" style="margin-top:22px"><summary>How to read this</summary><ul>
          <li>Directors, top managers and anyone owning 10% or more of a US company must report a trade in its shares within two business days, on <strong>Form 4</strong> to the US Securities and Exchange Commission.</li>
          <li>We count only shares <strong>bought or sold on the stock market</strong>. Shares given as pay, option exercises, shares kept back for tax and gifts are left out, because they don’t show a choice to buy or sell.</li>
          <li><strong>Buying</strong> with their own money is rarer and is often read as a sign the people who know the business best think the shares are good value.</li>
          <li><strong>Selling</strong> happens for many ordinary reasons: paying tax, buying a house, spreading their savings. Many sales are <strong>planned months in advance</strong> under a “10b5-1 plan”, so they say little about today’s view.</li>
          <li>This shows what happened; it is not a recommendation to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</li>
        </ul></details>
      </section>
      <script src="/insiders.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}
