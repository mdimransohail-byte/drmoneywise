/* ════════════════════════════════════════════════════════════════════════
   /reports and /reports/<YYYY-MM> — the monthly research report.
   Everyone sees the cover, the key numbers and the first paragraph of the
   summary (written into the page). Premium members get the full report:
   public/reports.js swaps in the HTML from /api/reports/<id>.
   ════════════════════════════════════════════════════════════════════════ */

import { listReports, readReport } from './reportService.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { esc, rankBars, tile } from './chartsSvg.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const periodName = (p) => (/^\d{4}-\d{2}$/u.test(String(p)) ? `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : /^\d{4}-Q\d$/u.test(String(p)) ? `${['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'][Number(p.slice(-1)) - 1]} ${p.slice(0, 4)}` : String(p || ''));
const day = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const signPct = (v, dp = 1) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(dp)}%`);
const money = (v) => { const a = Math.abs(v || 0); return `$${a >= 1e9 ? `${(a / 1e9).toFixed(1)}bn` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}m` : a >= 1e3 ? `${Math.round(a / 1e3)}k` : Math.round(a)}`; };
const GREEN = '#1baf7a'; const ORANGE = '#eb6834'; const GOLD = '#c9a227'; const BLUE = '#2a78d6';
const PALETTE = [BLUE, ORANGE, GREEN, '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

function donut(slices, center, sub) {
  const total = slices.reduce((a, s) => a + s.v, 0);
  if (!total) return '<p class="pf-sub">Nothing to show for this month.</p>';
  let a0 = -Math.PI / 2;
  const P = (r, a) => `${(100 + r * Math.cos(a)).toFixed(2)},${(100 + r * Math.sin(a)).toFixed(2)}`;
  const live = slices.filter((s) => s.v > 0);
  const paths = live.map((s) => {
    if (live.length === 1) return `<circle cx="100" cy="100" r="65" fill="none" stroke="${s.c}" stroke-width="30"/>`;
    const a1 = a0 + (s.v / total) * Math.PI * 2; const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M${P(80, a0)} A80 80 0 ${large} 1 ${P(80, a1)} L${P(50, a1)} A50 50 0 ${large} 0 ${P(50, a0)}Z`;
    a0 = a1;
    return `<path d="${d}" fill="${s.c}" stroke="#fbf7ef" stroke-width="2"/>`;
  }).join('');
  return `<div class="sc-donut"><svg viewBox="0 0 200 200" role="img"><title>${esc(sub)}</title>${paths}<text x="100" y="98" text-anchor="middle" font-size="24" font-weight="800" fill="#0a1128">${esc(center)}</text><text x="100" y="118" text-anchor="middle" font-size="11" fill="#4a5170">${esc(sub)}</text></svg><ul class="sc-legend">${slices.map((s) => `<li><i style="background:${s.c}"></i><span>${esc(s.label)}</span><b>${esc(s.text)}</b></li>`).join('')}</ul></div>`;
}

const heading = (n, title, note) => `<div class="rp-sec-head"><span>${n}</span><div><h2>${esc(title)}</h2>${note ? `<p>${note}</p>` : ''}</div></div>`;

/** The cover: title, key numbers and the summary (first paragraph only unless full). */
function cover(r, full) {
  const d = r.data;
  const inf = d.economy.find((e) => e.key === 'inflation');
  const rate = d.economy.find((e) => e.key === 'interestRate');
  const tiles = [
    inf && tile('US inflation', `${inf.value.toFixed(1)}%`, `vs a year ago (${esc(periodName(String(inf.asOf).slice(0, 7)))})`),
    rate && tile('US interest rate', `${rate.value.toFixed(2)}%`, 'central bank rate'),
    tile('Company results', String(d.results.count), 'reported this month'),
    tile('Bosses bought / sold', `${d.insiders.buys} / ${d.insiders.sells}`, `${money(d.insiders.bought)} bought, ${money(d.insiders.sold)} sold`),
    d.scores.average !== null && tile('Average report-card score', String(d.scores.average), `across ${d.scores.companies} companies`),
  ].filter(Boolean).join('');
  const paras = full ? r.text.summary : r.text.summary.slice(0, 1);
  return `
        <div class="rp-cover"><div><span class="pf-badge">★ Premium research</span><p class="rp-month">${esc(r.month)}${r.partial ? ` · so far, to ${esc(day(r.to))}` : ''}</p><h1>${esc(r.text.headline)}</h1></div>
          <div class="rp-stamp"><strong>${esc(r.month.split(' ')[0].slice(0, 3))}</strong><span>${esc(r.id.slice(0, 4))}</span></div></div>
        <div class="pr-tiles">${tiles}</div>
        <div class="pf-panel rp-summary"><h2>Executive summary</h2>${paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
}

/** Everything after the cover (Premium). */
function sections(r) {
  const d = r.data;
  const out = [];
  let n = 1;
  // 1. Economy
  if (d.economy.length) {
    out.push(`<section class="pf-panel rp-sec">${heading(n++, 'The economy', 'The latest official US figures.')}
      <div class="rp-econ">${d.economy.map((e) => {
        const ch = e.previous !== null ? e.value - e.previous : null;
        return `<div class="rp-econ-item"><span>${esc(e.name)}</span><strong>${e.value.toFixed(2).replace(/\.?0+$/u, '')}%</strong><em class="${ch === null || Math.abs(ch) < 0.005 ? '' : ch > 0 ? 'hi' : 'lo'}">${ch === null ? '' : Math.abs(ch) < 0.005 ? 'No change' : `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(2)} points`}</em><small>${esc(periodName(String(e.asOf).slice(0, 7)))}</small></div>`;
      }).join('')}</div></section>`);
  }
  // 2. Commodities and bonds
  if (d.commodities.length) {
    const rows = d.commodities.slice().sort((a, b) => b.month - a.month);
    out.push(`<section class="pf-panel rp-sec">${heading(n++, 'Commodities', `Change in the World Bank’s average price for ${esc(periodName(d.commodities[0].period))}, compared with the month before.`)}
      ${rankBars({ rows: rows.map((c) => ({ name: c.name, v: Math.round(c.month * 10) / 10, href: `/commodities/${c.slug}` })), title: 'Commodity prices, change on the month', fmt: (v) => signPct(v), labelWidth: 150 })}
      <p class="pf-sub">Biggest change over 12 months: ${(() => { const y = d.commodities.filter((c) => c.year !== null).sort((a, b) => Math.abs(b.year) - Math.abs(a.year))[0]; return y ? `${esc(y.name)}, ${signPct(y.year)}` : '—'; })()}.</p></section>`);
  }
  if (d.bonds.length) {
    out.push(`<section class="pf-panel rp-sec">${heading(n++, 'Government bond yields', 'What governments pay to borrow for 10 years. Higher yields mean costlier mortgages and loans.')}
      ${rankBars({ rows: d.bonds.slice().sort((a, b) => b.value - a.value).map((b) => ({ name: b.name, v: Math.round(b.value * 100) / 100, href: `/bonds/${b.slug}`, tip: b.change !== null ? `(${b.change >= 0 ? '+' : '−'}${Math.abs(b.change).toFixed(2)} points on the month)` : '' })), title: '10-year government bond yields', fmt: (v) => `${v.toFixed(2)}%`, labelWidth: 150 })}</section>`);
  }
  // 3. Results and dividends
  out.push(`<section class="pf-panel rp-sec">${heading(n++, 'Company results and dividends', d.results.since ? `Results counted from ${esc(day(d.results.since))}, when we started tracking them.` : 'Announcements to the US regulator this month.')}
    <div class="mk-two"><div>${d.results.items.length ? `<ul class="rp-list">${d.results.items.map((x) => `<li><a href="/stock/${esc(x.ticker)}"><b>${esc(x.ticker)}</b> ${esc(x.name)}</a><span>${esc(x.headline)}</span></li>`).join('')}</ul><p class="pf-sub"><a href="/results">All results, explained</a></p>` : '<p class="pf-sub">No results from the companies we follow this month.</p>'}</div>
    <div><h3>Dividend changes</h3>${donut([{ label: 'Raised', v: d.dividends.raised, c: GREEN, text: String(d.dividends.raised) }, { label: 'Started', v: d.dividends.started, c: BLUE, text: String(d.dividends.started) }, { label: 'Cut', v: d.dividends.cut, c: ORANGE, text: String(d.dividends.cut) }, { label: 'Stopped', v: d.dividends.stopped, c: '#e34948', text: String(d.dividends.stopped) }], String(d.dividends.raised + d.dividends.started + d.dividends.cut + d.dividends.stopped), 'changes')}
    ${d.dividends.raisedNames.length ? `<p class="pf-sub">Raised: ${d.dividends.raisedNames.map((x) => `<a href="/stock/${esc(x.ticker)}">${esc(x.name)}</a>`).join(', ')}</p>` : ''}</div></div></section>`);
  // 4. Company bosses
  out.push(`<section class="pf-panel rp-sec">${heading(n++, 'Company bosses’ trades', 'Directors and top managers buying or selling their own company’s shares on the market (SEC Form 4).')}
    <div class="rp-donut-row"><div>${donut([{ label: 'Bought', v: d.insiders.bought, c: GREEN, text: money(d.insiders.bought) }, { label: 'Sold', v: d.insiders.sold, c: ORANGE, text: money(d.insiders.sold) }], `${d.insiders.buys + d.insiders.sells}`, 'trades')}</div>
    <div class="rp-wide"><h3>Where bosses bought most</h3>${d.insiders.topBuying.length ? rankBars({ rows: d.insiders.topBuying.map((x) => ({ name: x.name, v: Math.round(x.net), href: `/stock/${x.ticker}` })), title: 'Net buying by company bosses', fmt: money, labelWidth: 190 }) : '<p class="pf-sub">No company’s bosses bought more than they sold this month.</p>'}<p class="pf-sub"><a href="/insiders">See every trade</a></p></div></div></section>`);
  // 5. Big funds
  if (d.funds.mostBought.length) {
    out.push(`<section class="pf-panel rp-sec">${heading(n++, 'What the big funds bought', `How many of the famous funds we follow bought or added to each company in the quarter to ${esc(day(d.funds.period))} (their latest 13F reports).`)}
      ${rankBars({ rows: d.funds.mostBought.map((x) => ({ name: x.name, v: x.buyers, href: `/stock/${x.ticker}`, tip: `(${x.sellers} sold)` })), title: 'Funds buying', fmt: (v) => `${v} funds`, labelWidth: 210 })}</section>`);
  }
  // 6. Scores
  if (d.scores.top.length) {
    out.push(`<section class="pf-panel rp-sec">${heading(n++, 'Report-card leaders', 'The highest scores on our five checks (growth, profit, debt, spare cash, dividend). A strong report card describes the business, not whether the shares are good value.')}
      <div><ol class="rp-top rp-top-grid">${d.scores.top.map((x) => `<li><a href="/stock/${esc(x.ticker)}"><b>${esc(x.ticker)}</b> ${esc(x.name)}</a><span>${esc(x.sector)}</span><em>${x.score}</em></li>`).join('')}</ol>
      <div class="rp-wide"><h3>Average score by region</h3>${rankBars({ rows: d.scores.regions.sort((a, b) => b.average - a.average).map((g) => ({ name: g.name, v: g.average, tip: `(${g.companies} companies)` })), title: 'Average score by region', fmt: (v) => String(v), labelWidth: 170, link: false })}</div></div></section>`);
  }
  // 7. Property
  if (d.property.length) {
    out.push(`<section class="pf-panel rp-sec">${heading(n++, 'Home prices', 'Change on a year earlier, from the Bank for International Settlements (latest quarter for each place).')}
      ${rankBars({ rows: d.property.slice().sort((a, b) => b.change - a.change).map((p) => ({ name: p.name, v: p.change, href: `/property/${p.slug}`, p: p.period })), title: 'Home prices, change on a year earlier', fmt: (v) => signPct(v), labelWidth: 170 })}</section>`);
  }
  // 8. What to watch
  if (r.text.watch.length) {
    out.push(`<section class="pf-panel rp-sec rp-watch">${heading(n++, 'What to watch next month', '')}<ul>${r.text.watch.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>`);
  }
  out.push(`<p class="note-box">Sources: US Bureau of Labor Statistics, New York Fed, US Treasury and Freddie Mac (economy); World Bank (commodities); US Treasury and OECD (bonds); company filings with the US SEC (results, dividends, Form 4, 13F, accounts); Bank for International Settlements (home prices). Built on ${esc(day(r.createdAt))}. This report describes what happened; it is not a recommendation to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>`);
  return out.join('');
}

export function reportFullHtml(r) { return cover(r, true) + sections(r); }

export async function renderReportsIndex(origin) {
  const reports = await listReports();
  const head = buildHeadTags({ title: 'Monthly research report | Dr MoneyWise', description: 'Each month in figures: the economy, commodities, bond yields, company results, dividends, what company bosses and big funds did, and the strongest report cards. For Premium members.', canonical: `${origin}/reports` });
  const body = `
      <section class="block rp-page">
        <p class="crumbs"><a href="/markets">Markets</a> › Monthly research report</p>
        <div class="rp-cover"><div><span class="pf-badge">★ Premium research</span><h1>Monthly research report</h1><p class="rp-lede">Each month in figures, explained simply: the economy, commodities, bond yields, company results and dividends, what company bosses and the big funds did, and the strongest report cards. Out on the 1st of every month.</p></div></div>
        ${reports.length ? `<div class="rp-cards">${reports.map((r, i) => `<a class="rp-card" href="/reports/${esc(r.id)}" style="--c:${PALETTE[i % PALETTE.length]}"><span>${esc(r.month)}${r.partial ? ' · so far' : ''}</span><strong>${esc(r.text.headline)}</strong><em>${esc(String(r.text.summary[0] || '').slice(0, 160))}…</em></a>`).join('')}</div>`
          : '<div class="pf-panel"><p>The first report is being prepared and will appear here soon.</p></div>'}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

export async function renderReportPage(origin, id) {
  const r = await readReport(id);
  if (!r) return null;
  const head = buildHeadTags({ title: `${r.month} research report: ${r.text.headline} | Dr MoneyWise`, description: String(r.text.summary[0] || '').slice(0, 155), canonical: `${origin}/reports/${r.id}` });
  const lockedList = ['The economy', 'Commodities', 'Government bond yields', 'Company results and dividends', 'Company bosses’ trades', 'What the big funds bought', 'Report-card leaders', 'Home prices', 'What to watch next month'];
  const body = `
      <section class="block rp-page">
        <p class="crumbs"><a href="/reports">Monthly research report</a> › ${esc(r.month)}</p>
        <div id="rpApp" data-id="${esc(r.id)}">
          ${cover(r, false)}
          <div class="pf-upsell" id="rpLock"><strong>The full report is for Premium members: ${lockedList.length} sections with charts.</strong><a class="pf-btn gold" href="/membership#plans">See Premium</a></div>
          <div class="pf-panel in-locked"><h2>Inside this report</h2><ol class="rp-toc">${lockedList.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
        </div>
      </section>
      <script src="/reports.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}

export async function reportSitemapEntries(origin) {
  const reports = await listReports();
  return [{ loc: `${origin}/reports`, lastmod: new Date().toISOString().slice(0, 10), priority: '0.6' }, ...reports.map((r) => ({ loc: `${origin}/reports/${r.id}`, lastmod: r.createdAt.slice(0, 10), priority: '0.5' }))];
}
