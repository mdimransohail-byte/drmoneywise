/* ════════════════════════════════════════════════════════════════════════
   COMPANY RESULTS PAGES
     /results          every recent result, newest first (free)
     company pages     "Latest results" box (free)
     every page        scrolling "Latest results" strip under the menu
                       (filled by public/results.js from /api/site/results-strip)
   "What it means" is Premium: public/results.js fills it in from
   /api/results/impact for Premium members.
   ════════════════════════════════════════════════════════════════════════ */

import { latestResults, readResults, resultsFor } from './resultsService.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { adSlot } from './adService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const day = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

export function resultCardHtml(r, { showCompany = true } = {}) {
  const numbers = (r.numbers || []).length ? `<div class="rs-numbers">${r.numbers.map((n) => `<div><span>${esc(n.label)}</span><strong>${esc(n.value)}</strong>${n.change ? `<em class="${/\bdown\b|fell|lower|loss/iu.test(n.change) ? 'down' : /\bup\b|rose|higher|grew/iu.test(n.change) ? 'up' : ''}">${esc(n.change)}</em>` : ''}</div>`).join('')}</div>` : '';
  return `
        <article class="rs-card" id="r-${esc(r.id)}" data-result-id="${esc(r.id)}">
          <header>
            ${showCompany ? `<a class="rs-co" href="/stock/${esc(r.ticker)}"><span class="pick-ticker">${esc(r.ticker)}</span> ${esc(r.name)}</a>` : ''}
            <span class="rs-date">Results filed ${esc(day(r.filed))}${r.period ? ` · ${esc(r.period)}` : ''}</span>
          </header>
          <h3>${esc(r.headline)}</h3>
          ${r.simple ? `<p class="rs-simple"><strong>In simple words:</strong> ${esc(r.simple)}</p>` : '<p class="rs-simple">A plain-English explanation is on its way. Meanwhile, read the company’s own announcement below.</p>'}
          ${numbers}
          ${r.simple ? `<div class="rs-impact" data-impact-for="${esc(r.id)}"><h4>What it means <span class="members-badge prem">Premium</span></h4><p>Premium members see what changed, what the company expects next, and what to keep an eye on. <a href="/membership">See Premium</a></p></div>` : ''}
          <p class="rs-source"><a href="${esc(r.url)}" target="_blank" rel="noopener">Read the company’s announcement</a> (official filing with the US Securities and Exchange Commission). Not advice.</p>
        </article>`;
}

/** Box for a company page: its latest result (if any in the last 4 months). */
export function companyResultsHtml(ticker, name) {
  const list = resultsFor(ticker).filter((r) => Date.now() - new Date(`${r.filed}T00:00:00Z`).getTime() < 130 * 86400000);
  if (!list.length) return '';
  return `
      <section class="block rs-box">
        <div class="block-head"><div><h2>Latest results</h2><p>What ${esc(name)} reported, explained simply, the day it came out.</p></div></div>
        ${resultCardHtml(list[0], { showCompany: false })}
        <script src="/results.js" defer></script>
      </section>`;
}

/* ── The 100 biggest companies (by yearly sales, from their filings) ──
   The homepage cards and the scrolling strip show only these, so the
   front page is about names everyone knows. /results still lists all. */
let bigMemo = null;
export async function biggestTickers(n = 100) {
  if (bigMemo && Date.now() - bigMemo.at < 6 * 60 * 60 * 1000) return bigMemo.set;
  const { readCompanies } = await import('./dataEngine.js');
  const { companies } = await readCompanies();
  const ranked = Object.values(companies || {}).filter((c) => c?.revenue?.length)
    .sort((a, b) => (b.revenue.at(-1)?.value || 0) - (a.revenue.at(-1)?.value || 0)).slice(0, n).map((c) => c.ticker);
  bigMemo = { at: Date.now(), set: new Set(ranked) };
  return bigMemo.set;
}
async function bigResults(n, days) {
  const big = await biggestTickers();
  const all = latestResults(200, days);
  const top = all.filter((r) => big.has(r.ticker));
  return (top.length >= Math.min(3, n) ? top : all).slice(0, n);
}

/** Small JSON for the scrolling strip (biggest companies only). */
export async function resultsStripData() {
  return (await bigResults(14, 21)).map((r) => ({ id: r.id, ticker: r.ticker, headline: r.headline, filed: r.filed }));
}

/** Homepage: 3 compact cards side by side (biggest companies only). */
export async function homeResultCards() {
  const list = (await bigResults(3, 21)).filter((r) => r.simple);
  if (!list.length) return '';
  const cut = (t, n) => (String(t).length > n ? `${String(t).slice(0, n).replace(/\s+\S*$/u, '')}…` : String(t));
  return `<div class="rs-grid">${list.map((r) => `
          <a class="rs-mini" href="/results#r-${esc(r.id)}">
            <span class="rs-mini-co"><span class="pick-ticker">${esc(r.ticker)}</span> ${esc(r.name)}</span>
            <strong>${esc(r.headline)}</strong>
            <span class="rs-mini-text">${esc(cut(r.simple, 170))}</span>
            ${(r.numbers || []).length ? `<span class="rs-mini-nums">${r.numbers.slice(0, 2).map((x) => `<b>${esc(x.label)}: ${esc(x.value)}</b>`).join('')}</span>` : ''}
            <em>Results filed ${esc(day(r.filed))} · Read more →</em>
          </a>`).join('')}</div>`;
}

export async function renderResultsPage(origin) {
  const data = readResults();
  const items = (data.items || []).slice(0, 60);
  const head = buildHeadTags({
    title: 'Company results today, explained simply | Dr MoneyWise',
    description: 'The latest results from large US companies, explained in plain English the day they come out: sales, profit and what changed.',
    canonical: `${origin}/results`,
  });
  const body = `
      <section class="block pr-page">
        <p class="crumbs"><a href="/markets">Markets</a> › Company results</p>
        <div class="pr-hero"><div><h1>Company results, explained simply</h1><p class="lede-dark">When a big company tells the world how it did, we explain it in plain English the same day: what it sold, what it earned, and how that compares with a year earlier.</p></div></div>
        ${items.length ? items.map((r) => resultCardHtml(r)).join('') : '<p class="note-box">No company has reported results in the last few days. The next ones appear here within an hour of being announced. Most big US companies report in the weeks after each quarter ends (January, April, July and October).</p>'}
        ${adSlot('in-content')}
        <p class="helper-note">From each company’s own results announcement (Form 8-K, item 2.02) filed with the US Securities and Exchange Commission. We check for new results every hour. For education only; not a recommendation to buy or sell.</p>
      </section>
      <script src="/results.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}
