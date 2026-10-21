/* ════════════════════════════════════════════════════════════════════════
   STOCKS BY REGION
     /stocks/world                     hub: every region, index prices,
                                       growth and profit by region
     /stocks/world/<region>            one region: index chart, report-card
                                       companies (SEC 20-F filers), local
                                       giants, charts, news
     /stocks/world/<region>/<slug>     a big local company that doesn't
                                       report to the SEC: TradingView price,
                                       profile and financials widgets + news
   The regions and companies live in src/data/worldStocks.js.
   ════════════════════════════════════════════════════════════════════════ */

import { WORLD_REGIONS, worldRegion } from '../data/worldStocks.js';
import { screenerRows } from './screenerService.js';
import { readCompanies } from './dataEngine.js';
import { companyLogo } from './stockPages.js';
import { iframeWidget } from './marketPages.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { adSlot } from './adService.js';
import { newsBlockHtml } from './newsBlock.js';
import { esc, rankBars, tile } from './chartsSvg.js';
import { getFxRates } from './fxService.js';
import { getEtfData, readEtf } from './etfService.js';

/* ── Regions followed through US-listed funds (the Gulf) ─────────────── */
const loading = new Set();
/** Saved fund holdings; starts a background download when missing or old. */
async function fundHoldings(ticker) {
  const saved = await readEtf(ticker);
  const old = !saved || Date.now() - new Date(saved.fetchedAt || saved.checkedAt || 0).getTime() > 8 * 24 * 60 * 60 * 1000;
  if (old && !loading.has(ticker)) {
    loading.add(ticker);
    getEtfData(ticker).catch(() => null).finally(() => loading.delete(ticker));
  }
  return saved?.top?.length ? saved : null;
}
/** A local company's weight inside its fund (from the fund's N-PORT report). */
function weightIn(fund, co) {
  if (!fund || !co.match) return null;
  const re = new RegExp(co.match, 'iu');
  const row = fund.top.find((h) => re.test(h.name) || re.test(h.title || ''));
  return row ? { pct: row.pct, name: row.name } : null;
}
const tidy = (n) => {
  // Drop legal endings: "P.J.S.C.", "(Q.P.S.C.)", "K.S.C.P", "S.A.K.P.", "PJSC", "Co", "Corporation"…
  let t = String(n || '').replace(/\s*\(?\b(?:[A-Za-z]\.){2,}[A-Za-z]?\.?\)?\s*$/u, '').replace(/\s+\b(PJSC|QPSC|QSC|KSCP|KSC|SJSC|PSC|PLC|CO|CORP|Company|Corporation|Co)\b\.?$/iu, '').trim();
  if (t === t.toUpperCase()) t = t.toLowerCase().replace(/\b([a-z])/gu, (x) => x.toUpperCase());
  return t.replace(/\b(Nbd|Adnoc|Qnb|Sabic|Acwa|Uae|Ihc|Dewa)\b/gu, (w) => w.toUpperCase()).replace(/\b(And|Of)\b/gu, (w) => w.toLowerCase());
};

const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e8a8a', '#8a5a2b'];
const signPct = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`);
const money = (v) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  return `${v < 0 ? '−' : ''}$${a >= 1e12 ? `${(a / 1e12).toFixed(2)}tn` : a >= 1e9 ? `${(a / 1e9).toFixed(1)}bn` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}m` : Math.round(a)}`;
};
const avg = (xs) => { const v = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x)); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null; };
const STOPS = [[0, [207, 74, 58]], [35, [232, 128, 58]], [50, [212, 167, 44]], [65, [58, 168, 107]], [80, [14, 122, 78]], [100, [8, 92, 58]]];
function heat(s) {
  if (s === null || s === undefined) return 'rgb(167,173,194)';
  for (let i = 1; i < STOPS.length; i += 1) {
    if (s <= STOPS[i][0]) {
      const [a0, a] = STOPS[i - 1]; const [b0, b] = STOPS[i]; const t = (s - a0) / (b0 - a0 || 1);
      return `rgb(${[0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t)).join(',')})`;
    }
  }
  return 'rgb(8,92,58)';
}
const chip = (v, good, okay) => (v === null || v === undefined ? '<span class="sc-chip none">—</span>' : `<span class="sc-chip ${v >= good ? 'good' : v >= okay ? 'okay' : 'weak'}">${esc(signPct(v))}</span>`);
const scoreBadge = (s) => `<span class="sc-score" style="background:${heat(s)};color:${s !== null && s >= 50 && s < 65 ? '#0a1128' : '#fff'}">${s ?? '–'}</span>`;

/** Server-drawn donut with legend. slices: [{ label, v }] */
function donut(slices, center, sub, title) {
  const total = slices.reduce((a, s) => a + s.v, 0) || 1;
  const R = 80; const r = 50; let a0 = -Math.PI / 2;
  const P = (rad, a) => `${(100 + rad * Math.cos(a)).toFixed(2)},${(100 + rad * Math.sin(a)).toFixed(2)}`;
  const paths = slices.map((s, i) => {
    const c = s.c || PALETTE[i % PALETTE.length];
    if (slices.length === 1) return `<circle cx="100" cy="100" r="65" fill="none" stroke="${c}" stroke-width="30"/>`;
    const a1 = a0 + (s.v / total) * Math.PI * 2; const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M${P(R, a0)} A${R} ${R} 0 ${large} 1 ${P(R, a1)} L${P(r, a1)} A${r} ${r} 0 ${large} 0 ${P(r, a0)}Z`;
    a0 = a1;
    return `<path d="${d}" fill="${c}" stroke="#fbf7ef" stroke-width="2"><title>${esc(s.label)}: ${s.v}</title></path>`;
  }).join('');
  const legend = slices.map((s, i) => `<li><i style="background:${s.c || PALETTE[i % PALETTE.length]}"></i><span>${esc(s.label)}</span><b>${s.v} (${Math.round((s.v / total) * 100)}%)</b></li>`).join('');
  return `<div class="sc-donut"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(title)}">${paths}<text x="100" y="98" text-anchor="middle" font-size="26" font-weight="800" fill="#0a1128">${esc(center)}</text><text x="100" y="118" text-anchor="middle" font-size="11" fill="#4a5170">${esc(sub)}</text></svg><ul class="sc-legend">${legend}</ul></div>`;
}

/** Donut where values are percentages (legend shows "8.1%"). */
function donutPct(slices, center, sub, title) {
  return donut(slices, center, sub, title).replace(/<b>([\d.]+) \(\d+%\)<\/b>/gu, (m, v) => `<b>${Number(v).toFixed(1)}%</b>`);
}

function sectorSlices(names) {
  const count = {};
  for (const n of names) count[n] = (count[n] || 0) + 1;
  const list = Object.entries(count).sort((a, b) => b[1] - a[1]);
  const top = list.slice(0, 7).map(([label, v]) => ({ label, v }));
  const rest = list.slice(7).reduce((a, [, v]) => a + v, 0);
  if (rest) top.push({ label: 'Other areas', v: rest, c: '#a7adc2' });
  return top;
}

async function regionRows(region) {
  const { rows } = await screenerRows({ premium: false });
  const wanted = new Set(region.sec.map(([t]) => t));
  return rows.filter((r) => wanted.has(r.ticker)).sort((a, b) => (b.sales || 0) - (a.sales || 0));
}

const marketOverview = (tabs, height = 460) => iframeWidget('embed-widget-market-overview.js', {
  colorTheme: 'light', dateRange: '12M', showChart: true, locale: 'en', width: '100%', height: '100%',
  largeChartUrl: '', isTransparent: false, showSymbolLogo: true, showFloatingTooltip: false, tabs,
}, height);

/* ── /stocks/world ─────────────────────────────────────────────────── */
export async function renderWorldHub(origin) {
  const { rows } = await screenerRows({ premium: false });
  const stats = WORLD_REGIONS.map((r) => {
    const set = new Set(r.sec.map(([t]) => t));
    const mine = rows.filter((x) => set.has(x.ticker));
    return { r, n: mine.length, growth: avg(mine.map((x) => x.salesGrowth)), margin: avg(mine.map((x) => x.margin)), score: avg(mine.map((x) => x.score)) };
  });
  const us = rows.filter((x) => x.region === 'us');
  const withUs = [{ r: { id: '', name: 'United States', short: 'US' }, n: us.length, growth: avg(us.map((x) => x.salesGrowth)), margin: avg(us.map((x) => x.margin)) }, ...stats].filter((s) => s.n >= 3);
  const head = buildHeadTags({
    title: 'Stocks around the world: UK, Japan, China, India, Korea, Brazil and the Gulf | Dr MoneyWise',
    description: 'Big companies in the UK, Japan, China, India, South Korea, Brazil and the Gulf, explained simply, with report cards from their official yearly reports.',
    canonical: `${origin}/stocks/world`,
  });
  const cards = stats.map(({ r, n, score }) => `
          <a class="wd-card" href="/stocks/world/${esc(r.id)}" style="--c:${r.colour}">
            <strong>${esc(r.name)}</strong>
            <span>${esc(r.index.name)} · ${esc(r.exchanges.split(',')[0].replace(/\s*\(.*$/u, ''))}</span>
            <em>${n ? `${n} report cards` : r.sec.length ? 'Report cards being collected' : r.etfs ? 'Fund holdings and news' : 'Exchange data and news'}${r.local.length ? ` · ${r.local.length} local giants` : ''}</em>
            ${score !== null ? `<b style="background:${heat(score)}">Average score ${Math.round(score)}</b>` : ''}
          </a>`).join('') + `
          <a class="wd-card" href="/stocks" style="--c:#0a1128"><strong>United States</strong><span>S&amp;P 500 · New York Stock Exchange and Nasdaq</span><em>${us.length} report cards · top 10 in every sector</em></a>`;
  const body = `
      <section class="block pr-page">
        <p class="crumbs"><a href="/stocks">Stocks</a> › Around the world</p>
        <div class="wd-hero"><div><h1>Stocks around the world</h1><p>The biggest companies in seven regions, explained simply. Companies that also report to the US regulator get a full report card from their official yearly report. For the others, we show exchange data and the latest news.</p></div>
          <a class="pf-btn gold" href="/screener">Open the screener</a></div>
        <div class="mk-cards wd-cards">${cards}</div>
        <div class="pf-panel"><h2>Main share indexes, last 12 months</h2><p class="pf-sub">Live prices from TradingView. Click a tab to compare markets.</p>
          ${marketOverview([
            { title: 'Indexes', symbols: [{ s: 'FOREXCOM:SPXUSD', d: 'S&P 500 (US)' }, ...WORLD_REGIONS.flatMap((r) => (r.etfs ? r.etfs.map((e) => ({ s: e.tv, d: `${e.country} fund (${e.ticker})` })) : [{ s: r.index.symbol, d: `${r.index.name} (${r.short})` }]))] },
          ], 520)}</div>
        ${withUs.length >= 2 ? `<div class="mk-two">
          <div class="pf-panel"><h2>Sales growth by region</h2><p class="pf-sub">Average sales growth last year for the companies we have report cards for.</p>${rankBars({ rows: withUs.filter((s) => s.growth !== null).sort((a, b) => b.growth - a.growth).map((s) => ({ name: s.r.name, v: s.growth, href: s.r.id ? `/stocks/world/${s.r.id}` : '/stocks' })), title: 'Sales growth by region', fmt: signPct, labelWidth: 170 })}</div>
          <div class="pf-panel"><h2>Profit margin by region</h2><p class="pf-sub">Average cents of profit kept from every $1 of sales.</p>${rankBars({ rows: withUs.filter((s) => s.margin !== null).sort((a, b) => b.margin - a.margin).map((s) => ({ name: s.r.name, v: s.margin, href: s.r.id ? `/stocks/world/${s.r.id}` : '/stocks' })), title: 'Profit margin by region', fmt: (v) => `${v.toFixed(1)}%`, labelWidth: 170 })}</div>
        </div>` : ''}
        ${adSlot('in-content')}
        <p class="note-box">Overseas companies’ figures come from their yearly reports (Form 20-F) to the US Securities and Exchange Commission and are shown in US dollars at the European Central Bank rate. Exchange data for local companies is from TradingView. These pages describe companies; they are not recommendations to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/* ── /stocks/world/<region> ────────────────────────────────────────── */
export async function renderRegionPage(origin, id) {
  const region = worldRegion(id);
  if (!region) return null;
  const rows = await regionRows(region);
  const { companies } = await readCompanies();
  const fx = await getFxRates().catch(() => null);
  const head = buildHeadTags({
    title: `${region.name} stocks explained simply: biggest companies and report cards | Dr MoneyWise`,
    description: `${region.intro.split('. ')[0]}. See the biggest ${region.name} companies with plain-English report cards, prices and news.`,
    canonical: `${origin}/stocks/world/${region.id}`,
  });
  const totalSales = rows.reduce((a, r) => a + (r.sales || 0), 0);
  const sc = avg(rows.map((r) => r.score));
  const tiles = rows.length ? `<div class="pr-tiles">
          ${tile('Report cards', String(rows.length), 'companies that report to the US regulator')}
          ${tile('Average score', sc === null ? '–' : String(Math.round(sc)), 'out of 100 on our five checks')}
          ${tile('Average sales growth', signPct(avg(rows.map((r) => r.salesGrowth))), 'last year', (avg(rows.map((r) => r.salesGrowth)) ?? 0) >= 0 ? 'up' : 'down')}
          ${tile('Combined yearly sales', money(totalSales), 'in US dollars')}
          ${tile('Pay a dividend', `${rows.filter((r) => r.dividend > 0).length} of ${rows.length}`, '')}
        </div>` : '';
  const table = rows.length ? `
        <div class="pf-panel sc-table-wrap"><h2>Report cards</h2><p class="pf-sub">Biggest first, by yearly sales. Click a company for its full report card.</p>
          <table class="sc-table"><thead><tr><th>Company</th><th>Score</th><th>Sales (yearly)</th><th>Sales growth</th><th>Profit margin</th><th>Dividend raises</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td class="sc-co"><a href="/stock/${esc(r.ticker)}" class="wd-co">${companyLogo(companies?.[r.ticker] || { ticker: r.ticker }, r.name, 'sm')}<span><b>${esc(r.ticker)}</b> ${esc(r.name)}<small>${esc(r.sector)}</small></span></a></td>
            <td>${scoreBadge(r.score)}</td><td>${esc(money(r.sales))}</td><td>${chip(r.salesGrowth, 5, 0)}</td><td>${chip(r.margin, 10, 0)}</td>
            <td>${r.divYears ? `<span class="sc-years" style="--w:${Math.min(100, r.divYears * 2)}%">${r.divYears}</span>` : r.dividend ? '<span class="sc-chip okay">Pays</span>' : '<span class="sc-chip none">—</span>'}</td></tr>`).join('')}
          </tbody></table></div>` : '';
  const charts = rows.length >= 3 ? `<div class="mk-two">
          <div class="pf-panel"><h2>Sales growth</h2><p class="pf-sub">Last year compared with the year before.</p>${rankBars({ rows: rows.filter((r) => r.salesGrowth !== null).sort((a, b) => b.salesGrowth - a.salesGrowth).slice(0, 10).map((r) => ({ name: r.name, v: r.salesGrowth, href: `/stock/${r.ticker}` })), title: 'Sales growth', fmt: signPct, labelWidth: 190 })}</div>
          <div class="pf-panel"><h2>Profit margin</h2><p class="pf-sub">Cents of profit kept from every $1 of sales.</p>${rankBars({ rows: rows.filter((r) => r.margin !== null).sort((a, b) => b.margin - a.margin).slice(0, 10).map((r) => ({ name: r.name, v: r.margin, href: `/stock/${r.ticker}` })), title: 'Profit margin', fmt: (v) => `${v.toFixed(1)}%`, labelWidth: 190 })}</div>
        </div>` : '';
  const sectors = sectorSlices([...rows.map((r) => r.sector), ...region.local.map((x) => x.sector)]);
  const funds = {};
  for (const e of region.etfs || []) funds[e.ticker] = await fundHoldings(e.ticker);
  const localCards = region.local.map((x, i) => {
    const w = weightIn(funds[x.etf], x);
    return `<a class="wd-local" href="/stocks/world/${esc(region.id)}/${esc(x.slug)}" style="--c:${PALETTE[i % PALETTE.length]}"><strong>${esc(x.name)}</strong><span>${esc(x.sector)}</span><em>${w ? `${w.pct.toFixed(1)}% of the ${esc(x.etf)} fund` : esc(x.symbol)}</em></a>`;
  }).join('');
  const fundsPanel = (region.etfs || []).length ? `
        <div class="pf-panel"><h2>${esc(region.name)} markets through US-listed funds</h2><p class="pf-sub">Each fund owns the biggest companies in one country. Prices from TradingView; what each fund owns comes from its official holdings report to the US regulator (Form N-PORT).</p>
          ${marketOverview([{ title: 'Gulf funds', symbols: region.etfs.map((e) => ({ s: e.tv, d: `${e.country} (${e.ticker})` })) }], 440)}
          <div class="wd-funds">${region.etfs.map((e) => {
            const f = funds[e.ticker];
            if (!f) return `<div class="wd-fund"><h3>${esc(e.country)} <small>${esc(e.ticker)}</small></h3><p class="pf-sub">The holdings report is being downloaded; it appears here shortly.</p></div>`;
            const top = f.top.slice(0, 7).map((h) => ({ label: tidy(h.name), v: Math.round(h.pct * 10) / 10 }));
            const rest = Math.max(0, Math.round((100 - top.reduce((a, x) => a + x.v, 0)) * 10) / 10);
            if (rest > 0.5) top.push({ label: 'Everything else', v: rest, c: '#a7adc2' });
            return `<div class="wd-fund"><h3>${esc(e.country)} <small>${esc(e.name)} (${esc(e.ticker)})</small></h3>${donutPct(top, `${f.count}`, 'holdings', `${e.country} fund holdings`)}<p class="pf-sub">Holdings as of ${esc(f.asOf || '—')}. Its top 10 make up ${esc(f.top10Share)}% of the fund.</p></div>`;
          }).join('')}</div></div>` : '';
  const news = await newsBlockHtml('region', region.id, { title: `${region.name} markets in the news`, subject: `shares in ${region.name}`, search: `${region.index.name} stocks` });
  const otherRegions = WORLD_REGIONS.filter((r) => r.id !== region.id).map((r) => `<a href="/stocks/world/${esc(r.id)}" style="--c:${r.colour}">${esc(r.name)}</a>`).join('');
  const body = `
      <section class="block pr-page">
        <p class="crumbs"><a href="/stocks">Stocks</a> › <a href="/stocks/world">Around the world</a> › ${esc(region.name)}</p>
        <div class="wd-hero" style="--c:${region.colour}"><div><span class="wd-flag">${esc(region.exchanges)}</span><h1>${esc(region.name)} stocks</h1><p>${esc(region.intro)}</p></div>
          ${rows.length ? `<a class="pf-btn gold" href="/screener?region=${esc(region.id)}">Screen ${esc(region.short)} companies</a>` : ''}</div>
        ${tiles}
        <div class="mk-two">
          <div class="pf-panel"><h2>${esc(region.index.name)}, last 12 months</h2>${iframeWidget('embed-widget-mini-symbol-overview.js', { symbol: region.index.symbol, width: '100%', height: '100%', locale: 'en', dateRange: '12M', colorTheme: 'light', isTransparent: false, autosize: true, largeChartUrl: '' }, 300)}</div>
          <div class="pf-panel"><h2>Which parts of the economy</h2><p class="pf-sub">The ${rows.length + region.local.length} companies on this page, by area.</p>${donut(sectors, String(rows.length + region.local.length), 'companies', `${region.name} companies by area`)}</div>
        </div>
        ${table}
        ${charts}
        ${fundsPanel}
        ${region.local.length ? `<div class="pf-panel"><h2>${region.etfs ? `The biggest ${esc(region.name)} companies` : `Other big ${esc(region.name)} companies`}</h2><p class="pf-sub">${region.widgets === false ? 'Click a company to see how much of its country’s fund it makes up, the fund’s price and the latest news.' : 'These don’t report to the US regulator, so we show their exchange prices, profile and key figures from TradingView instead of a report card.'}</p>
          ${region.widgets === false ? '' : marketOverview([{ title: region.short, symbols: region.local.map((x) => ({ s: x.symbol, d: x.name })) }], 480)}
          <div class="wd-locals">${localCards}</div></div>` : ''}
        ${region.note ? `<p class="note-box">${esc(region.note)}</p>` : ''}
        ${adSlot('in-content')}
      </section>
      ${news}
      <section class="block">
        <div class="wd-others"><span>Other regions:</span>${otherRegions}<a href="/stocks" style="--c:#0a1128">United States</a></div>
        ${region.officialSites ? `<p class="helper-note">Official company announcements: ${region.officialSites.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(' · ')}</p>` : ''}
        <p class="note-box">${region.etfs ? 'Fund holdings from each fund’s Form N-PORT report to the US Securities and Exchange Commission. ' : ''}${rows.length ? `Report-card figures come from each company’s yearly report (Form 20-F) to the US Securities and Exchange Commission, converted to US dollars at the European Central Bank rate${fx?.date ? ` of ${esc(fx.date)}` : ''}. The same rate is used for every year, so growth and profit margins are as reported. ` : ''}Index and local company data from TradingView. Not a recommendation to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/* ── /stocks/world/<region>/<slug> ─────────────────────────────────── */
export async function renderLocalCompanyPage(origin, regionId, slug) {
  const region = worldRegion(regionId);
  const co = region?.local.find((x) => x.slug === slug);
  if (!co) return null;
  const [ex, sym] = co.symbol.split(':');
  const head = buildHeadTags({
    title: `${co.name} (${sym}) share price, profile and news | Dr MoneyWise`,
    description: `${co.name}: share price on the ${ex} exchange, company profile, key figures and the latest news, explained simply.`,
    canonical: `${origin}/stocks/world/${region.id}/${co.slug}`,
  });
  const news = await newsBlockHtml('localstock', `${region.id}--${co.slug}`, { title: `In the news: ${co.name}`, name: co.name, subject: co.name, search: co.name });
  const rows = await regionRows(region);
  const others = region.local.filter((x) => x.slug !== co.slug).map((x, i) => `<a class="wd-local" href="/stocks/world/${esc(region.id)}/${esc(x.slug)}" style="--c:${PALETTE[i % PALETTE.length]}"><strong>${esc(x.name)}</strong><span>${esc(x.sector)}</span><em>${esc(x.symbol)}</em></a>`).join('');
  let bodyTop;
  if (region.widgets === false) {
    const etf = (region.etfs || []).find((e) => e.ticker === co.etf);
    const fund = etf ? await fundHoldings(etf.ticker) : null;
    const w = weightIn(fund, co);
    const re = co.match ? new RegExp(co.match, 'iu') : null;
    const bars = fund ? fund.top.slice(0, 12).map((h) => ({ label: tidy(h.name), v: h.pct, me: re ? re.test(h.name) : false })) : [];
    const max = Math.max(1, ...bars.map((x) => x.v));
    const exchangeSite = (region.officialSites || []).find(([n]) => n.toLowerCase().includes({ TADAWUL: 'saudi', ADX: 'abu dhabi', DFM: 'dubai', QSE: 'qatar', KSE: 'kuwait' }[ex] || '#'));
    bodyTop = `
      <section class="block pr-page">
        <p class="crumbs"><a href="/stocks/world">Around the world</a> › <a href="/stocks/world/${esc(region.id)}">${esc(region.name)}</a> › ${esc(co.name)}</p>
        <div class="wd-hero" style="--c:${region.colour}"><div><span class="wd-flag">${esc(ex)}: ${esc(sym)} · ${esc(co.sector)}</span><h1>${esc(co.name)}</h1><p>One of the biggest companies in ${esc(/^United/u.test(etf?.country || '') ? `the ${etf.country}` : etf?.country || region.name)}. Gulf companies don’t report to the US regulator and their exchanges’ data can’t be shown here, so we follow ${esc(co.name)} through ${esc(etf?.name || 'a US-listed fund')}, which owns it, using the fund’s official holdings report.</p></div></div>
        ${etf ? `<div class="pr-tiles">
          ${tile(`Share of the ${esc(etf.ticker)} fund`, w ? `${w.pct.toFixed(1)}%` : '—', w ? `of everything the fund owns, as of ${esc(fund.asOf || '—')}` : fund ? 'not in the fund’s top 50 holdings' : 'holdings report being downloaded')}
          ${tile('Rank in the fund', w ? `#${fund.top.findIndex((h) => re.test(h.name)) + 1}` : '—', w ? `of ${fund.count} holdings` : '')}
          ${tile('Country', esc(etf.country), esc(ex))}
          ${tile('Area of the economy', esc(co.sector), '')}
        </div>
        <div class="mk-two">
          <div class="pf-panel"><h2>${esc(etf.country)} fund price, last 12 months</h2><p class="pf-sub">${esc(etf.name)} (${esc(etf.ticker)}), which moves with the biggest ${esc(etf.country)} companies.</p>${iframeWidget('embed-widget-mini-symbol-overview.js', { symbol: etf.tv, width: '100%', height: '100%', locale: 'en', dateRange: '12M', colorTheme: 'light', isTransparent: false, autosize: true, largeChartUrl: '' }, 300)}</div>
          <div class="pf-panel"><h2>Biggest holdings in the fund</h2><p class="pf-sub">${esc(co.name)} is highlighted in gold.</p>${bars.length ? `<div class="sc-hbars">${bars.map((x, i) => `<div class="sc-hbar${x.me ? ' wd-me' : ''}"><span>${esc(x.label)}</span><div><i style="width:${Math.max(3, (x.v / max) * 100)}%;background:${x.me ? '#c9a227' : PALETTE[i % PALETTE.length]}"></i></div><b>${x.v.toFixed(1)}%</b></div>`).join('')}</div>` : '<p class="pf-sub">The holdings report is being downloaded; it appears here shortly.</p>'}</div>
        </div>` : ''}
        ${exchangeSite ? `<p class="helper-note">${esc(co.name)}’s own results and announcements are published on the <a href="${esc(exchangeSite[1])}" target="_blank" rel="noopener">${esc(exchangeSite[0])}</a> website.</p>` : ''}
`;
  } else {
    bodyTop = `
      <section class="block pr-page">
        <p class="crumbs"><a href="/stocks/world">Around the world</a> › <a href="/stocks/world/${esc(region.id)}">${esc(region.name)}</a> › ${esc(co.name)}</p>
        <div class="wd-hero" style="--c:${region.colour}"><div><span class="wd-flag">${esc(ex)}: ${esc(sym)} · ${esc(co.sector)}</span><h1>${esc(co.name)}</h1><p>One of the biggest companies in ${esc(region.name)}. It doesn’t file reports with the US regulator, so instead of our report card this page shows its exchange price, company profile and key figures from TradingView, plus the latest news.</p></div></div>
        ${iframeWidget('embed-widget-symbol-info.js', { symbol: co.symbol, width: '100%', locale: 'en', colorTheme: 'light', isTransparent: false }, 210)}
        <div class="mk-two">
          <div class="pf-panel"><h2>Share price, last 12 months</h2>${iframeWidget('embed-widget-mini-symbol-overview.js', { symbol: co.symbol, width: '100%', height: '100%', locale: 'en', dateRange: '12M', colorTheme: 'light', isTransparent: false, autosize: true, largeChartUrl: '' }, 320)}</div>
          <div class="pf-panel"><h2>About the company</h2>${iframeWidget('embed-widget-symbol-profile.js', { symbol: co.symbol, width: '100%', height: '100%', locale: 'en', colorTheme: 'light', isTransparent: false }, 320)}</div>
        </div>
        <div class="pf-panel"><h2>Key figures</h2><p class="pf-sub">Sales, profit, debt and valuation as reported to the exchange, in the company’s own currency.</p>
          ${iframeWidget('embed-widget-financials.js', { symbol: co.symbol, width: '100%', height: '100%', locale: 'en', colorTheme: 'light', isTransparent: false, largeChartUrl: '', displayMode: 'regular' }, 620)}</div>
`;
  }
  const body = `${bodyTop}
        ${adSlot('in-content')}
      </section>
      ${news}
      <section class="block">
        ${others ? `<h2 style="font-size:22px;margin:0 0 10px">Other big ${esc(region.name)} companies</h2><div class="wd-locals">${others}</div>` : ''}
        ${rows.length ? `<p class="helper-note" style="margin-top:14px"><a href="/stocks/world/${esc(region.id)}">See ${rows.length} ${esc(region.name)} companies with full report cards</a></p>` : ''}
        <p class="note-box">${region.widgets === false ? 'Fund prices from TradingView; holdings from the fund’s Form N-PORT report to the US Securities and Exchange Commission.' : 'Price, profile and figures from TradingView.'} This page describes the company; it is not a recommendation to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

export function worldSitemapEntries(origin) {
  const day = new Date().toISOString().slice(0, 10);
  return [
    { loc: `${origin}/stocks/world`, lastmod: day, priority: '0.7' },
    ...WORLD_REGIONS.map((r) => ({ loc: `${origin}/stocks/world/${r.id}`, lastmod: day, priority: '0.7' })),
    ...WORLD_REGIONS.flatMap((r) => r.local.map((x) => ({ loc: `${origin}/stocks/world/${r.id}/${x.slug}`, lastmod: day, priority: '0.5' }))),
  ];
}
