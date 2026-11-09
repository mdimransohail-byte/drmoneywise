/* ════════════════════════════════════════════════════════════════════════
   COMPETITORS — on every US company page, the company side by side with
   up to five rivals in the same industry: sales, growth, profit margin,
   debt, report-card score, P/E and the past year's share-price change,
   with where it ranks on each.
   Rivals: same SEC industry code first, then the same sector, biggest
   sales first. Figures from stockFacts() (SEC filings and closing prices).
   ════════════════════════════════════════════════════════════════════════ */

import { stockFacts } from './stockTop10.js';
import { readCompanies } from './dataEngine.js';
import { sectorOf } from '../data/sectorLeaders.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => (v === null || v === undefined ? '—' : Math.abs(v) >= 1e12 ? `$${(v / 1e12).toFixed(2)}tn` : Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}bn` : `$${(v / 1e6).toFixed(0)}m`);
const pct = (v, sign = false) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`);
const ORD = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;

/* Each measure: label, value, how to show it, whether higher is better */
const MEASURES = [
  ['Sales (latest year)', (r) => r.sales, money, true],
  ['Sales growth', (r) => r.salesGrowth, (v) => pct(v, true), true],
  ['Profit margin', (r) => r.margin, pct, true],
  ['Years to repay debt', (r) => r.debtYears, (v) => (v === null || v === undefined ? '—' : v <= 0.05 ? 'No debt' : `${v.toFixed(1)} yrs`), false],
  ['Report-card score', (r) => r.score, (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}/100`), true],
  ['P/E (price ÷ earnings)', (r) => r.pe, (v) => (v === null || v === undefined ? '—' : v.toFixed(1)), false],
  ['Share price, past year', (r) => r.ret1y, (v) => pct(v, true), true],
];

export async function competitorsHtml(ticker) {
  const [{ rows }, { companies }] = await Promise.all([stockFacts(), readCompanies()]);
  const me = rows.find((r) => r.ticker === ticker);
  const c = companies?.[ticker];
  if (!me || !c) return '';
  const sameIndustry = rows.filter((r) => r.ticker !== ticker && c.industry && companies[r.ticker]?.industry === c.industry);
  const sector = sectorOf(ticker)?.name || me.sector;
  const sameSector = rows.filter((r) => r.ticker !== ticker && !sameIndustry.includes(r) && sector && (sectorOf(r.ticker)?.name || r.sector) === sector);
  const bySales = (a, b) => (b.sales || 0) - (a.sales || 0);
  const rivals = [...sameIndustry.sort(bySales), ...sameSector.sort(bySales)].slice(0, 5);
  if (rivals.length < 2) return '';
  const group = [me, ...rivals];
  const basis = sameIndustry.length >= 2 ? `its industry (${esc(c.industry)})` : `the ${esc(sector)} sector`;

  // Where it ranks on each measure (among those with a figure)
  const ranks = MEASURES.map(([label, get, , high]) => {
    const have = group.filter((r) => Number.isFinite(get(r)));
    if (!Number.isFinite(get(me)) || have.length < 3) return null;
    have.sort((a, b) => (high ? get(b) - get(a) : get(a) - get(b)));
    return { label, place: have.indexOf(me) + 1, of: have.length };
  }).filter(Boolean);
  const best = ranks.filter((x) => x.place === 1).map((x) => x.label.toLowerCase());
  const worst = ranks.filter((x) => x.place === x.of).map((x) => x.label.toLowerCase());

  const shown = MEASURES.filter(([, get]) => group.some((r) => Number.isFinite(get(r))));
  const cell = (r, [, get, show, high]) => {
    const vals = group.map(get).filter(Number.isFinite);
    const v = get(r);
    const top = Number.isFinite(v) && vals.length >= 3 && v === (high ? Math.max(...vals) : Math.min(...vals));
    return `<td class="${top ? 'cc-top' : ''}">${esc(show(v))}</td>`;
  };
  return `<section class="block cc-box" id="competitors">
    <div class="block-head"><div><h2>How it compares with its competitors</h2><p>${esc(me.name)} next to the ${rivals.length} largest companies we cover in ${basis}. Green marks the best figure on each line.</p></div></div>
    <div class="cc-ranks">${ranks.map((x) => `<div class="${x.place === 1 ? 'good' : x.place === x.of ? 'weak' : ''}"><b>${ORD(x.place)}</b><span>of ${x.of}</span><em>${esc(x.label)}</em></div>`).join('')}</div>
    <div class="cc-scroll"><table class="cc-table">
      <thead><tr><th></th>${group.map((r) => `<th class="${r === me ? 'cc-me' : ''}">${r === me ? esc(r.ticker) : `<a href="/stock/${esc(r.ticker)}">${esc(r.ticker)}</a>`}<small>${esc(String(r.name).slice(0, 28))}</small></th>`).join('')}</tr></thead>
      <tbody>${shown.map((m) => `<tr><th>${esc(m[0])}</th>${group.map((r) => cell(r, m).replace('<td class="', `<td class="${r === me ? 'cc-me ' : ''}`)).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="pf-sub">${best.length ? `${esc(me.name)} leads this group on ${esc(best.join(', '))}. ` : ''}${worst.length ? `It is last on ${esc(worst.join(', '))}. ` : ''}Lower is better for years to repay debt and P/E. Figures from each company’s SEC filings and the latest closing prices. ${rivals.slice(0, 1).map((r) => `<a href="/compare/${esc([ticker, r.ticker].sort().join('-vs-'))}">Compare ${esc(ticker)} and ${esc(r.ticker)} in detail</a>`).join('')}</p>
  </section>`;
}
