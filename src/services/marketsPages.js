/* ════════════════════════════════════════════════════════════════════════
   MARKETS PAGES — like the company report cards, for:
     /markets                  hub: stocks, ETFs, bonds, commodities, crypto
     /commodities, /commodities/<slug>     World Bank monthly prices
     /bonds, /bonds/<slug>                 US Treasury + OECD yields
     /etfs, /etfs/<ticker>                 SEC holdings reports (N-PORT)
   Each page: a free part (summary, tiles, charts, plain-English facts)
   and a members-only "Deeper look" that public/markets-members.js loads
   from /api/markets/details for paying members.
   Summaries are filled in from the figures by fixed rules; nothing is
   guessed. Live price boxes are free TradingView widgets (with credit).
   ════════════════════════════════════════════════════════════════════════ */

import { COMMODITIES, COMMODITY_CREDIT, COMMODITY_GROUPS, getCommodity, unitWords } from '../data/commodityList.js';
import { BOND_CREDITS, BOND_PLACES, US_MATURITIES, getBondPlace } from '../data/bondList.js';
import { ETF_COMMODITY, etfTvSymbol } from '../data/etfList.js';
import { sectorOf } from '../data/sectorLeaders.js';
import { commodityDeeper, commodityFacts, readCommodities } from './commodityService.js';
import { bondSeries, priceChange, readBonds } from './bondService.js';
import { ASSET_WORDS, CURATED_ETFS, getCuratedEtf, getEtfData, overlap, readEtf } from './etfService.js';
import { readEconomy } from './dataEngine.js';
import { iframeWidget } from './marketPages.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { adSlot } from './adService.js';
import { newsBlockHtml } from './newsBlock.js';
import { C, MONTHS, changeBars, esc, lineChart, niceTicks, pct, periodWords, plainPct, rankBars, spark, tile, toneOf, upDown } from './chartsSvg.js';

const countryName = (() => {
  let dn = null;
  try { dn = new Intl.DisplayNames(['en-GB'], { type: 'region' }); } catch { dn = null; }
  return (code) => {
    if (!code || code === '—') return 'Not stated';
    try { return (dn && dn.of(code)) || code; } catch { return code; }
  };
})();
const share = (v, dp = 1) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(dp)}%`);
const points = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)} pts`);
const usd = (v, dp) => {
  if (v === null || v === undefined) return '—';
  if (Number(v) === 0) return '$0';
  const d = dp ?? (v >= 100 ? 0 : v >= 10 ? 2 : 3);
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
};
const bigUsd = (v) => {
  if (!v && v !== 0) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)} trillion`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)} billion`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)} million`;
  return `$${Math.round(v).toLocaleString('en-US')}`;
};
const monthDay = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const sharePlain = (v) => (Math.abs(Number(v)) > 0 && Math.abs(Number(v)) < 0.05 ? '<0.1%' : `${Number(v).toFixed(1)}%`);

/* ── Shared bits ──────────────────────────────────────────────────── */
function pickerSelect(id, label, options, current, base) {
  return `<form class="pr-picker" action="${base}" method="get">
        <label for="${id}">${esc(label)}</label>
        <select id="${id}" name="pick" onchange="if(this.value)location.href='${base}/'+this.value">
          ${current ? '' : '<option value="">Select…</option>'}${options.map(([v, t]) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
        <noscript><button type="submit">Go</button></noscript>
      </form>`;
}

function liveBox(symbol, title, height = 230) {
  if (!symbol) return '';
  return `<div class="pr-panel"><h2>${esc(title)}</h2><p class="helper-note">Live price box from TradingView; it may be delayed.</p>
          ${iframeWidget('embed-widget-mini-symbol-overview.js', { symbol, width: '100%', height: '100%', locale: 'en', dateRange: '12M', colorTheme: 'light', isTransparent: false, autosize: true, largeChartUrl: '' }, height)}</div>`;
}

function membersBox(kind, id, title, items) {
  return `
        <section class="block members-box" id="marketsMembers" data-kind="${esc(kind)}" data-id="${esc(id)}">
          <div class="block-head"><div><h2>Deeper look <span class="members-badge">Members</span></h2><p>${esc(title)}</p></div></div>
          <div id="marketsMembersContent" class="members-teaser">
            <ul class="plain-list">${items.map((x) => `<li>${x}</li>`).join('')}</ul>
            <p class="members-cta"><a class="pill-gold" href="/membership">Become a member</a> <a href="/#join">Already a member? Sign in</a></p>
          </div>
        </section>
        <script src="/markets-members.js" defer></script>`;
}

function sources(lines) {
  return `<div class="pr-sources"><h2>Where these figures come from</h2><ul>${lines.filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p>For education only. Not a recommendation to buy or sell anything. Read our <a href="/disclaimer">disclaimer</a>.</p></div>`;
}

const crumbs = (parts) => `<p class="crumbs">${parts.map(([href, text]) => (href ? `<a href="${href}">${esc(text)}</a>` : esc(text))).join(' › ')}</p>`;

/* ════════════════════════════════════════════════════════════════════
   /markets
   ════════════════════════════════════════════════════════════════════ */
export async function renderMarketsHub(origin) {
  const [com, bonds] = await Promise.all([readCommodities(), readBonds()]);
  const gold = commodityFacts(com.items?.gold?.series);
  const us10 = bondSeries(BOND_PLACES[0], bonds)?.long?.at(-1);
  const head = buildHeadTags({
    title: 'Markets explained: stocks, ETFs, bonds and commodities | Dr MoneyWise',
    description: 'Plain-English report cards for companies, ETFs, government bonds and commodities such as gold, oil and coffee, from official figures.',
    canonical: `${origin}/markets`,
  });
  const cards = [
    ['/stocks', 'Stocks', 'Report cards for US companies: sales, profit, debt and dividends from official filings.', 'Top 10 in every sector'],
    ['/stocks/world', 'Stocks around the world', 'The UK, Japan, China, India, South Korea, Brazil and the Gulf: report cards, prices and news.', '7 regions'],
    ['/etfs', 'ETFs', 'Funds that hold many investments at once: what is inside, the yearly fee and recent returns.', `${CURATED_ETFS.length} popular ETFs, look up any other`],
    ['/bonds', 'Bonds', 'Loans to governments: what they pay, how that has changed, and why it matters for mortgages.', us10 ? `US 10-year: ${us10.v.toFixed(2)}% (${periodWords(us10.p)})` : `${BOND_PLACES.length} countries`],
    ['/commodities', 'Commodities', 'Gold, silver, oil, copper, coffee and more: prices over time and what moves them.', gold ? `Gold: ${usd(gold.latest.v)} an ounce (${periodWords(gold.latest.p)})` : `${COMMODITIES.length} commodities`],
    ['/top-10/crypto', 'Crypto', 'The ten biggest cryptocurrencies, explained simply, with live prices.', 'Top 10 by size'],
    ['/property', 'Property', 'Home prices and rents in the US, UK, Dubai, India and more.', 'Updated weekly'],
    ['/results', 'Company results', 'What big companies reported, explained simply the day it came out.', 'Checked every hour'],
    ['/screener', 'Stock screener', 'Filter companies by growth, profit, debt and dividends. Premium adds what the big funds own.', 'Members'],
    ['/reports', 'Monthly research report', 'Each month in figures: economy, markets, results, bosses’ and big funds’ trades.', 'Premium'],
    ['/insiders', 'Company bosses’ trades', 'When directors and top managers buy or sell their own company’s shares.', 'Premium'],
    ['/portfolio-health', 'Portfolio health check', 'A score and heat map for every holding and your whole portfolio.', 'Premium'],
  ];
  const body = `
      <section class="block pr-page">
        <div class="pr-hero"><div><h1>Markets, explained simply</h1><p class="lede-dark">Choose what you want to look at. Every page uses official figures and plain English.</p></div></div>
        <div class="mk-cards">${cards.map(([href, name, text, stat]) => `<a class="mk-card" href="${href}"><strong>${esc(name)}</strong><span>${esc(text)}</span><em>${esc(stat)}</em></a>`).join('')}</div>
        ${adSlot('in-content')}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/* ════════════════════════════════════════════════════════════════════
   COMMODITIES
   ════════════════════════════════════════════════════════════════════ */
export async function renderCommoditiesHub(origin) {
  const data = await readCommodities();
  const head = buildHeadTags({
    title: 'Commodity prices: gold, silver, oil, copper, coffee and more | Dr MoneyWise',
    description: 'Monthly prices for gold, silver, oil, gas, copper, nickel, coffee, cocoa, wheat and more, with ten-year charts and what moves each price.',
    canonical: `${origin}/commodities`,
  });
  const rows = COMMODITIES.map((c) => ({ c, f: commodityFacts(data.items?.[c.slug]?.series), unit: unitWords(data.items?.[c.slug]?.unit) }));
  const groups = COMMODITY_GROUPS.map((g) => {
    const list = rows.filter((r) => r.c.group === g.id);
    return `<h2 class="mk-group">${esc(g.name)}</h2><div class="pr-cards">${list.map(({ c, f, unit }) => `<a class="pr-card" href="/commodities/${c.slug}"><span class="pr-card-name">${esc(c.name)}</span>${f
      ? `<strong class="pr-card-big">${esc(usd(f.latest.v))}<small class="mk-unit">${esc(unit.short)}</small></strong><span class="pr-card-note"><span class="${toneOf(f.year)}">${esc(pct(f.year))}</span> in a year · ${esc(periodWords(f.latest.p))}</span>${spark(data.items[c.slug].series.slice(-61))}`
      : '<strong class="pr-card-big muted">Updating</strong><span class="pr-card-note">Prices arrive with the next update</span>'}<span class="pr-card-go">Open</span></a>`).join('')}</div>`;
  }).join('');
  const ranked = rows.filter((r) => r.f?.year !== null && r.f).map((r) => ({ name: r.c.name, v: r.f.year, href: `/commodities/${r.c.slug}`, p: r.f.latest.p })).sort((a, b) => b.v - a.v);
  const latest = data.latest ? periodWords(data.latest) : '';
  const body = `
      <section class="block pr-page">
        ${crumbs([['/markets', 'Markets'], [null, 'Commodities']])}
        <div class="pr-hero">
          <div><h1>Commodity prices</h1><p class="lede-dark">Raw materials the world runs on: metals, energy and food. Monthly average prices in US dollars${latest ? `, latest ${esc(latest)}` : ''}.</p></div>
          ${pickerSelect('cmPick', 'Choose a commodity', COMMODITIES.map((c) => [c.slug, c.name]), '', '/commodities')}
        </div>
        ${groups}
        ${ranked.length ? `<div class="pr-panel"><h2>Price change over the last year</h2><p class="helper-note">Monthly average price compared with the same month a year earlier.</p>${rankBars({ rows: ranked, title: 'Change in commodity prices over a year' })}</div>` : '<p class="note-box">The first prices are being collected. Please check back shortly.</p>'}
        ${adSlot('in-content')}
        <details class="pr-explain"><summary>What is a commodity?</summary><ul>
          <li>A commodity is a raw material that is the same whoever makes it: a tonne of copper from Chile is much like a tonne from Peru. That is why it has one world price.</li>
          <li>Prices move with supply (mines, harvests, weather, wars) and demand (factories, building, how fast economies grow).</li>
          <li>Most people invest in commodities through funds rather than buying barrels or sacks. Commodity prices can swing a lot, even within a single month.</li>
        </ul></details>
        ${adSlot('partner-box')}
        ${sources([COMMODITY_CREDIT])}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

export async function renderCommodity(origin, slug) {
  const c = getCommodity(slug);
  if (!c) return null;
  const data = await readCommodities();
  const item = data.items?.[slug];
  const f = commodityFacts(item?.series);
  const unit = unitWords(item?.unit);
  const head = buildHeadTags({
    title: `${c.name} price today and over 10 years, explained | Dr MoneyWise`,
    description: `${c.name} price in plain English: the latest monthly price, change over a year and ten years, what it is used for, where it comes from and what moves the price.`,
    canonical: `${origin}/commodities/${slug}`,
  });
  const top = `
        ${crumbs([['/markets', 'Markets'], ['/commodities', 'Commodities'], [null, c.name]])}
        <div class="pr-hero">
          <div><h1>${esc(c.name)} price</h1><p class="lede-dark">${esc(c.about)}</p></div>
          ${pickerSelect('cmPick', 'Choose a commodity', COMMODITIES.map((x) => [x.slug, x.name]), slug, '/commodities')}
        </div>`;
  const factsPanel = `
        <div class="mk-facts">
          <div class="pr-panel"><h2>Where it comes from</h2><p class="helper-note">The biggest producing countries.</p><div class="mk-chips">${c.producers.map((p, i) => `<span><b>${i + 1}</b> ${esc(p)}</span>`).join('')}</div></div>
          <div class="pr-panel"><h2>What moves the price</h2><ul class="mk-list">${c.drivers.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>
        </div>`;
  const others = `<div class="pr-others"><h2>Other commodities</h2><div>${COMMODITIES.filter((x) => x.slug !== slug).map((x) => `<a href="/commodities/${x.slug}">${esc(x.name)}</a>`).join('')}</div></div>`;
  if (!f) {
    return pageShell({ head, active: 'markets', body: `<section class="block pr-page">${top}${liveBox(c.tv, `${c.name} price now`)}<p class="note-box">The monthly price history for ${esc(c.name.toLowerCase())} is being collected. Please check back shortly.</p>${factsPanel}${await newsBlockHtml('commodity', slug, { title: `In the news: ${c.name}`, subject: `${c.name} prices`, search: `${c.name.replace(/ \(.*\)$/u, '')} price` })}${sources([COMMODITY_CREDIT])}${others}</section>` });
  }
  const when = periodWords(f.latest.p);
  const lines = [
    `${esc(c.name)} cost <strong>${esc(usd(f.latest.v))} ${esc(unit.per)}</strong> on average in ${esc(when)}.`,
    f.month !== null ? `That is <strong>${upDown(f.month)} ${plainPct(f.month)}</strong> on the month before${f.year !== null ? ` and <strong>${upDown(f.year)} ${plainPct(f.year)}</strong> on a year earlier` : ''}.` : '',
    f.tenYear !== null ? `Over ten years the price is <strong>${upDown(f.tenYear)} ${plainPct(f.tenYear, 0)}</strong>.` : f.fiveYear !== null ? `Over five years the price is <strong>${upDown(f.fiveYear)} ${plainPct(f.fiveYear, 0)}</strong>.` : '',
    f.fromHigh > -1 ? 'It is at or near its highest monthly price in our records, which go back to 1960.' : `It is <strong>${plainPct(f.fromHigh, 0)} below</strong> its highest monthly average, ${esc(usd(f.allHigh.v))} in ${esc(periodWords(f.allHigh.p))}.`,
    `In the last 12 months it ranged from ${esc(usd(f.low12.v))} (${esc(periodWords(f.low12.p))}) to ${esc(usd(f.high12.v))} (${esc(periodWords(f.high12.p))}).`,
  ].filter(Boolean);
  const s = item.series;
  const ten = s.slice(-121);
  const monthly = [];
  for (let i = Math.max(1, s.length - 12); i < s.length; i += 1) monthly.push({ p: s[i].p, v: ((s[i].v / s[i - 1].v) - 1) * 100 });
  const etf = c.etf ? getCuratedEtf(c.etf) : null;
  const body = `
      <section class="block pr-page">
        ${top}
        <p class="pr-updated">Monthly average prices · Latest: <strong>${esc(when)}</strong> · Updated when the World Bank publishes each month</p>
        <div class="pr-summary"><h2>In short</h2><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>
        <div class="pr-tiles">
          ${tile(`Price (${when})`, esc(usd(f.latest.v)), esc(unit.per))}
          ${tile('vs last month', esc(pct(f.month)), '', toneOf(f.month))}
          ${tile('vs a year ago', esc(pct(f.year)), '', toneOf(f.year))}
          ${tile('Over 5 years', esc(pct(f.fiveYear, 0)), '', toneOf(f.fiveYear))}
          ${tile('12-month range', `${esc(usd(f.low12.v))}–${esc(usd(f.high12.v))}`, 'lowest to highest month')}
        </div>
        ${liveBox(c.tv, `${c.name} price now`)}
        <div class="pr-panel"><h2>Price over ${ten.length > 100 ? 'ten' : 'recent'} years</h2><p class="helper-note">Average price each month, US dollars ${esc(unit.per)}. Hover or tap for each month.</p>
          ${lineChart({ series: [{ name: c.name, color: C.blue, points: ten }], title: `${c.name} price, monthly`, fmt: (v) => usd(v), labelEnds: true })}</div>
        <div class="pr-panel"><h2>Month-by-month change</h2><p class="helper-note">How much the average price moved from one month to the next.</p>
          ${changeBars({ points: monthly, title: `${c.name}: change on the month before`, tip: 'on the month before' })}</div>
        ${factsPanel}
        ${await newsBlockHtml('commodity', slug, { title: `In the news: ${c.name}`, subject: `${c.name} prices`, search: `${c.name.replace(/ \(.*\)$/u, '')} price` })}
        ${etf ? `<p class="note-box">One way people invest in ${esc(c.name.toLowerCase())} is through a fund: see <a href="/etfs/${etf.ticker}">${esc(etf.name)} (${esc(etf.ticker)})</a>.</p>` : ''}
        ${adSlot('in-content')}
        ${membersBox('commodity', slug, `The full history since 1960 and the patterns inside it, worked out from the World Bank's monthly prices.`, [
          '<strong>Every year since 1960:</strong> the average price each year, on one chart',
          '<strong>Best and worst years:</strong> the five biggest yearly rises and falls',
          '<strong>Seasons:</strong> which months have usually been up or down over the last 20 years',
          '<strong>How bumpy it is:</strong> the typical monthly move and the biggest jumps and drops',
          '<strong>What if:</strong> what $1,000 of it bought 5, 10, 20 and 30 years ago would be worth now',
        ])}
        ${adSlot('partner-box')}
        ${sources([COMMODITY_CREDIT])}
        ${others}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

function commodityMembersHtml(slug, data) {
  const c = getCommodity(slug);
  const item = data.items?.[slug];
  const d = commodityDeeper(item?.series);
  if (!c || !d) return '<p class="helper-note">Not enough price history yet for the deeper look.</p>';
  const unit = unitWords(item.unit);
  const yearRows = (list) => `<div class="table-scroll"><table class="pr-table"><thead><tr><th>Year</th><th class="num">Change in the year’s average price</th></tr></thead><tbody>${list.map((x) => `<tr><th scope="row">${esc(x.p)}</th><td class="num ${toneOf(x.v)}">${esc(pct(x.v))}</td></tr>`).join('')}</tbody></table></div>`;
  const monthName = (p) => MONTHS[Number(p) - 1].slice(0, 3);
  return `
      <h3>Every year since ${esc(d.yearly[0]?.p || d.firstMonth.slice(0, 4))}</h3>
      <p class="helper-note">Average price each full year, US dollars ${esc(unit.per)}. Prices are not adjusted for inflation.</p>
      ${lineChart({ series: [{ name: c.name, color: C.blue, points: d.yearly }], title: `${c.name}: average price each year`, fmt: (v) => usd(v) })}
      <div class="mk-two">
        <div><h3>Best five years</h3>${yearRows(d.best)}</div>
        <div><h3>Worst five years</h3>${yearRows(d.worst)}</div>
      </div>
      <h3>Seasons: the usual move in each month</h3>
      <p class="helper-note">Average change from the month before, over the last ${Math.round(d.months / 12)} years. A pattern in the past is no promise for the future.</p>
      ${changeBars({ points: d.seasonal.map((x) => ({ p: x.p, v: x.v, tipLabel: MONTHS[Number(x.p) - 1] })), title: `${c.name}: average change by month`, label: monthName, tip: 'on average' })}
      <div class="pr-tiles" style="margin-top:14px">
        ${tile('Typical monthly move', `±${esc(d.typicalMove.toFixed(1))}%`, `over the last ${Math.round(d.months / 12)} years`)}
        ${tile('Biggest monthly jump', esc(pct(d.biggestRise.v)), esc(periodWords(d.biggestRise.p)), 'up')}
        ${tile('Biggest monthly drop', esc(pct(d.biggestFall.v)), esc(periodWords(d.biggestFall.p)), 'down')}
        ${d.upShare !== null ? tile('Months that went up', `${Math.round(d.upShare)}%`, 'of all months') : ''}
      </div>
      <h3>What $1,000 would be worth now</h3>
      <div class="table-scroll"><table class="pr-table"><thead><tr><th>Bought</th><th>Month</th><th class="num">Worth now</th></tr></thead><tbody>${d.whatIf.map((w) => `<tr><th scope="row">${w.years} years ago</th><td>${esc(periodWords(w.from))}</td><td class="num ${w.value >= 1000 ? 'up' : 'down'}">${esc(usd(w.value, 0))}</td></tr>`).join('')}</tbody></table></div>
      <p class="helper-note">Based on monthly average prices only. Real investments add costs (storage, fund fees, dealer margins) and may track the price less closely.</p>`;
}

/* ════════════════════════════════════════════════════════════════════
   BONDS
   ════════════════════════════════════════════════════════════════════ */
const BOND_EXPLAIN = `
        <details class="pr-explain" open><summary>How government bonds work, in plain English</summary><ul>
          <li>A government bond is a loan you make to a government. It pays you interest every year and gives your money back on a set date.</li>
          <li>The <strong>yield</strong> is the interest rate you get if you buy the bond today and keep it to the end. When yields rise, the price of existing bonds falls — and the other way round.</li>
          <li>Longer loans usually pay more than short ones. When short loans pay more (an “inverted” curve), it has often come before a slowdown in the economy.</li>
          <li>Bond yields feed into mortgages, savings rates and company borrowing, so they matter even if you never buy a bond.</li>
        </ul></details>`;

export async function renderBondsHub(origin) {
  const data = await readBonds();
  const head = buildHeadTags({
    title: 'Government bond yields: US, UK, Germany, Japan, India and more | Dr MoneyWise',
    description: 'What governments pay to borrow for 10 years, explained simply: latest yields, changes over a year, and the gap between short and long loans.',
    canonical: `${origin}/bonds`,
  });
  const rows = BOND_PLACES.map((p) => {
    const s = bondSeries(p, data);
    const last = s?.long?.at(-1);
    const yearAgo = s?.long?.length > 12 ? s.long[s.long.length - 13] : null;
    return { p, s, last, change: last && yearAgo ? last.v - yearAgo.v : null };
  });
  const cards = rows.map(({ p, s, last, change }) => `<a class="pr-card" href="/bonds/${p.slug}"><span class="pr-card-name">${esc(p.name)}</span>${last
    ? `<strong class="pr-card-big">${last.v.toFixed(2)}%</strong><span class="pr-card-note">10-year yield · ${esc(periodWords(last.p))}${change !== null ? ` · ${esc(points(change))} in a year` : ''}</span>${spark(s.long.slice(-61))}`
    : '<strong class="pr-card-big muted">Updating</strong><span class="pr-card-note">Figures arrive with the next update</span>'}<span class="pr-card-go">Open</span></a>`).join('');
  const ranked = rows.filter((r) => r.last).map((r) => ({ name: r.p.name, v: r.last.v, href: `/bonds/${r.p.slug}`, p: r.last.p })).sort((a, b) => b.v - a.v);
  const body = `
      <section class="block pr-page">
        ${crumbs([['/markets', 'Markets'], [null, 'Bonds']])}
        <div class="pr-hero">
          <div><h1>Government bond yields</h1><p class="lede-dark">What governments pay to borrow money for ten years — the base for mortgages and savings rates around the world.</p></div>
          ${pickerSelect('bdPick', 'Choose a country', BOND_PLACES.map((p) => [p.slug, p.name]), '', '/bonds')}
        </div>
        <div class="pr-cards">${cards}</div>
        ${ranked.length ? `<div class="pr-panel"><h2>10-year yields compared</h2><p class="helper-note">Latest monthly figure for each country.</p>${rankBars({ rows: ranked, title: '10-year government bond yields by country', fmt: (v) => `${v.toFixed(2)}%` })}</div>` : '<p class="note-box">The first figures are being collected. Please check back shortly.</p>'}
        ${BOND_EXPLAIN}
        ${adSlot('in-content')}
        ${adSlot('partner-box')}
        ${sources([BOND_CREDITS.treasury, BOND_CREDITS.oecd, BOND_CREDITS.tv])}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/** The US yield curve: maturities across, one line per date. */
function curveChart(curves, title) {
  const keys = US_MATURITIES.map(([k]) => k).filter((k) => curves.some((c) => c.points[k]));
  if (!keys.length) return '';
  const W = 760; const H = 280; const L = 48; const R = 120; const T = 16; const B = 34;
  const all = curves.flatMap((c) => keys.map((k) => c.points[k]).filter(Boolean));
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 5);
  const X = (i) => L + (i / Math.max(1, keys.length - 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - ticks[0]) / (ticks.at(-1) - ticks[0] || 1)) * (H - T - B);
  const grid = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="${C.grid}"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="${C.text}">${t}%</text>`).join('');
  const xl = keys.map((k, i) => `<text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="${C.text}">${k}</text>`).join('');
  const colors = [C.blue, C.orange, '#1baf7a'];
  const ends = [];
  const lines = curves.map((c, ci) => {
    const pts = keys.map((k, i) => (c.points[k] ? [X(i), Y(c.points[k]), k, c.points[k]] : null)).filter(Boolean);
    const last = pts.at(-1);
    ends.push({ y: last[1], label: c.label, value: last[3], color: colors[ci] });
    return `<polyline fill="none" stroke="${colors[ci]}" stroke-width="2.25" points="${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}"/>${pts.map((p) => `<g class="pr-hit"><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${colors[ci]}" style="opacity:1"/><title>${esc(c.label)}: ${p[2]} ${p[3].toFixed(2)}%</title></g>`).join('')}`;
  }).join('');
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) if (ends[i].y - ends[i - 1].y < 30) ends[i].y = ends[i - 1].y + 30;
  const labels = ends.map((e) => `<text x="${W - R + 10}" y="${e.y - 2}" font-size="13" font-weight="700" fill="${C.ink}">${e.value.toFixed(2)}%</text><text x="${W - R + 10}" y="${e.y + 13}" font-size="11.5" fill="${C.text}">${esc(e.label)}</text>`).join('');
  return `<div class="pr-chart"><svg class="pr-svg mk-curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${grid}${xl}${lines}${labels}</svg></div>`;
}

function usCurveAt(days, back) {
  if (!days?.length) return null;
  const target = new Date(`${days.at(-1).d}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - back);
  const iso = target.toISOString().slice(0, 10);
  const day = [...days].reverse().find((x) => x.d <= iso);
  return day ? { d: day.d, points: Object.fromEntries(US_MATURITIES.map(([k]) => [k, day[k]]).filter(([, v]) => v)) } : null;
}

export async function renderBondsPlace(origin, slug) {
  const place = getBondPlace(slug);
  if (!place) return null;
  const data = await readBonds();
  const s = bondSeries(place, data);
  const head = buildHeadTags({
    title: `${place.name} 10-year bond yield, explained | Dr MoneyWise`,
    description: `What ${place.called} pays to borrow for 10 years, in plain English: the latest yield, how it has changed, and how it compares with short-term rates.`,
    canonical: `${origin}/bonds/${slug}`,
  });
  const top = `
        ${crumbs([['/markets', 'Markets'], ['/bonds', 'Bonds'], [null, place.name]])}
        <div class="pr-hero">
          <div><h1>${esc(place.name)}: government bonds</h1><p class="lede-dark">${esc(place.intro)}</p></div>
          ${pickerSelect('bdPick', 'Choose a country', BOND_PLACES.map((p) => [p.slug, p.name]), slug, '/bonds')}
        </div>`;
  const others = `<div class="pr-others"><h2>Other countries</h2><div>${BOND_PLACES.filter((p) => p.slug !== slug).map((p) => `<a href="/bonds/${p.slug}">${esc(p.name)}</a>`).join('')}</div></div>`;
  if (!s?.long?.length) {
    return pageShell({ head, active: 'markets', body: `<section class="block pr-page">${top}${liveBox(place.tv, `${place.name} 10-year yield now`)}<p class="note-box">The history of ${esc(place.called)}’s bond yields is being collected. Please check back shortly.</p>${await newsBlockHtml('bond', slug, { title: `In the news: ${place.bond}`, subject: `${place.name} government bond yields`, search: `${place.name} bond yields` })}${BOND_EXPLAIN}${others}</section>` });
  }
  const last = s.long.at(-1);
  const yearAgo = s.long.length > 12 ? s.long[s.long.length - 13] : null;
  const shortLast = s.short.at(-1);
  const gap = shortLast && shortLast.p === last.p ? last.v - shortLast.v : shortLast ? last.v - shortLast.v : null;
  const five = s.long.slice(-60);
  const hi = five.reduce((m, x) => (x.v > m.v ? x : m), five[0]);
  const lo = five.reduce((m, x) => (x.v < m.v ? x : m), five[0]);
  const days = place.us ? data.us?.days : null;
  const today = place.us ? usCurveAt(days, 0) : null;
  const lines = [
    `Lending to ${esc(place.called)} for 10 years paid <strong>${last.v.toFixed(2)}% a year</strong> at the end of ${esc(periodWords(last.p))}${today?.points['10Y'] ? ` (${today.points['10Y'].toFixed(2)}% on ${esc(monthDay(today.d))})` : ''}.`,
    yearAgo ? `A year earlier it was ${yearAgo.v.toFixed(2)}%, so it has gone <strong>${upDown(last.v - yearAgo.v)} by ${Math.abs(last.v - yearAgo.v).toFixed(2)} percentage points</strong>.` : '',
    `Over five years it has ranged from ${lo.v.toFixed(2)}% (${esc(periodWords(lo.p))}) to ${hi.v.toFixed(2)}% (${esc(periodWords(hi.p))}).`,
    gap !== null ? (gap >= 0
      ? `A 3-month loan paid ${shortLast.v.toFixed(2)}%, so lending for longer paid <strong>${gap.toFixed(2)} points more</strong> — the normal pattern.`
      : `A 3-month loan paid ${shortLast.v.toFixed(2)}%, <strong>more than the 10-year loan</strong>. This “inverted” pattern has often come before slower growth.`) : '',
  ].filter(Boolean);
  const ten = s.long.slice(-121);
  const series = [{ name: '10-year', color: C.blue, points: ten }];
  const sh = s.short.filter((x) => ten.some((y) => y.p === x.p));
  if (sh.length === ten.length) series.push({ name: '3-month', color: C.orange, points: sh });
  const changes = [];
  for (let i = Math.max(12, s.long.length - 8); i < s.long.length; i += 1) changes.push({ p: s.long[i].p, v: s.long[i].v - s.long[i - 12].v });
  const yearAgoCurve = place.us ? usCurveAt(days, 365) : null;
  const curve = today ? curveChart([{ label: `Today (${monthDay(today.d)})`, points: today.points }, ...(yearAgoCurve ? [{ label: `A year earlier`, points: yearAgoCurve.points }] : [])], 'US Treasury yield curve') : '';
  const body = `
      <section class="block pr-page">
        ${top}
        <p class="pr-updated">${place.us ? 'Daily US Treasury figures, refreshed weekly' : 'Monthly averages, refreshed weekly'} · Latest month: <strong>${esc(periodWords(last.p))}</strong></p>
        <div class="pr-summary"><h2>In short</h2><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>
        <div class="pr-tiles">
          ${tile('10-year yield', `${last.v.toFixed(2)}%`, esc(periodWords(last.p)))}
          ${yearAgo ? tile('Change in a year', esc(points(last.v - yearAgo.v)), `from ${yearAgo.v.toFixed(2)}%`) : ''}
          ${shortLast ? tile('3-month rate', `${shortLast.v.toFixed(2)}%`, esc(periodWords(shortLast.p))) : ''}
          ${gap !== null ? tile('Gap: 10-year minus 3-month', esc(points(gap)), gap >= 0 ? 'normal (long pays more)' : 'inverted (short pays more)', gap >= 0 ? '' : 'down') : ''}
          ${tile('5-year range', `${lo.v.toFixed(2)}–${hi.v.toFixed(2)}%`, 'lowest to highest month')}
        </div>
        ${liveBox(place.tv, `${place.name} 10-year yield now`)}
        ${curve ? `<div class="pr-panel"><h2>The yield curve: what each length of loan pays</h2><p class="helper-note">US government loans from 1 month to 30 years. Normally the line slopes up.</p>${curve}</div>` : ''}
        <div class="pr-panel"><h2>Yields over ${ten.length > 100 ? 'ten' : 'recent'} years</h2><p class="helper-note">Average for each month. Hover or tap for each month.</p>
          ${lineChart({ series, title: `${place.name}: 10-year and 3-month interest rates`, fmt: (v) => `${v.toFixed(2)}%` })}</div>
        ${changes.length ? `<div class="pr-panel"><h2>10-year yield: change on a year earlier</h2><p class="helper-note">In percentage points. A rise means new loans pay more, and older bonds fall in price.</p>
          ${changeBars({ points: changes, title: '10-year yield, change on a year earlier', fmt: (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`, axisFmt: (t) => `${t}`, tip: 'points on a year earlier' })}</div>` : ''}
        ${await newsBlockHtml('bond', slug, { title: `In the news: ${place.bond}`, subject: `${place.name} government bond yields`, search: `${place.name} bond yields` })}
        ${BOND_EXPLAIN}
        ${adSlot('in-content')}
        ${membersBox('bond', slug, `Worked out from the official figures for ${place.called}.`, [
          '<strong>How a price move would hit you:</strong> what happens to 2-, 10- and 30-year bonds if rates rise or fall by 1 point',
          '<strong>Income:</strong> what $10,000 lent for 10 years at today’s rate pays each year and in total',
          '<strong>The gap over ten years:</strong> 10-year minus 3-month rates, and how many months were “inverted”',
          place.us ? '<strong>After inflation:</strong> the real return on a 10-year US loan today, and the yield curve 1, 2 and 5 years ago' : '<strong>Compared with the US:</strong> how much more or less this country pays than the US each month',
        ])}
        ${adSlot('partner-box')}
        ${sources([s.source === 'treasury' ? BOND_CREDITS.treasury : BOND_CREDITS.oecd, BOND_CREDITS.tv])}
        ${others}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

async function bondMembersHtml(slug, data) {
  const place = getBondPlace(slug);
  const s = place && bondSeries(place, data);
  if (!s?.long?.length) return '<p class="helper-note">Not enough figures yet for the deeper look.</p>';
  const y = s.long.at(-1).v;
  const usDays = place.us ? data.us?.days : null;
  const today = place.us ? usCurveAt(usDays, 0) : null;
  const yieldFor = (years) => (today ? today.points[`${years}Y`] : null) ?? y;
  const rows = [2, 10, 30].map((n) => ({ n, y: yieldFor(n), up: priceChange(n, yieldFor(n), 1), down: priceChange(n, yieldFor(n), -1) }));
  const yearly = 10000 * (y / 100);
  const gaps = s.long.map((x) => ({ p: x.p, s: s.short.find((z) => z.p === x.p) })).filter((x) => x.s).map((x) => ({ p: x.p, v: s.long.find((z) => z.p === x.p).v - x.s.v })).slice(-121);
  const inverted = gaps.filter((g) => g.v < 0).length;
  let extra = '';
  if (place.us) {
    const econ = await readEconomy();
    const infl = econ.figures?.inflation;
    if (infl) {
      const real = y - infl.value;
      extra += `<h3>After inflation</h3><div class="pr-tiles">${tile('10-year yield', `${y.toFixed(2)}%`, '')}${tile('Inflation (a year)', `${infl.value.toFixed(1)}%`, `US prices, ${esc(monthDay(infl.asOf))}`)}${tile('Real return', `${real >= 0 ? '+' : '−'}${Math.abs(real).toFixed(2)}%`, real >= 0 ? 'above inflation' : 'below inflation', real >= 0 ? 'up' : 'down')}</div><p class="helper-note">Real return = the yield minus the latest yearly inflation rate (US Bureau of Labor Statistics). It is a rough guide: future inflation may be different.</p>`;
    }
    const curves = [{ label: 'Today', c: today }, { label: '2 years ago', c: usCurveAt(usDays, 730) }];
    const fiveAgo = data.us?.monthly?.length > 60 ? data.us.monthly[data.us.monthly.length - 61] : null;
    const list = curves.filter((x) => x.c).map((x) => ({ label: `${x.label} (${monthDay(x.c.d)})`, points: x.c.points }));
    if (fiveAgo) list.push({ label: `5 years ago (${periodWords(fiveAgo.p)})`, points: Object.fromEntries(US_MATURITIES.map(([k]) => [k, fiveAgo[k]]).filter(([, v]) => v)) });
    if (list.length > 1) extra += `<h3>The yield curve, then and now</h3>${curveChart(list.slice(0, 3), 'US yield curve: today, 2 years ago, 5 years ago')}`;
  } else {
    const us = bondSeries(BOND_PLACES[0], data);
    const diff = us ? s.long.map((x) => ({ p: x.p, u: us.long.find((z) => z.p === x.p) })).filter((x) => x.u).map((x) => ({ p: x.p, v: s.long.find((z) => z.p === x.p).v - x.u.v })).slice(-121) : [];
    if (diff.length > 12) extra += `<h3>Compared with the US</h3><p class="helper-note">${esc(place.name)}’s 10-year yield minus the US 10-year yield, each month. Below zero means ${esc(place.called)} borrows more cheaply than the US government. Latest: <strong>${esc(points(diff.at(-1).v))}</strong>.</p>${lineChart({ series: [{ name: 'vs US', color: C.blue, points: diff }], title: `${place.name} minus US 10-year yield`, fmt: (v) => `${v.toFixed(2)}` })}`;
  }
  return `
      <h3>If interest rates move by 1 point</h3>
      <p class="helper-note">The change in price of a newly issued government bond that pays today’s rate. Longer bonds move much more.</p>
      <div class="table-scroll"><table class="pr-table"><thead><tr><th>Bond</th><th class="num">Pays now</th><th class="num">If rates rise 1 point</th><th class="num">If rates fall 1 point</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${r.n}-year</th><td class="num">${r.y.toFixed(2)}%</td><td class="num down">${esc(pct(r.up))}</td><td class="num up">${esc(pct(r.down))}</td></tr>`).join('')}</tbody></table></div>
      ${place.us ? '' : '<p class="helper-note">Worked out with the 10-year yield for all three lengths, as monthly figures for 2- and 30-year bonds are not in our source.</p>'}
      <h3>What ${place.us ? '$10,000' : '10,000'} lent for 10 years pays</h3>
      ${(() => {
        const cur = place.us ? '$' : '';
        const amt = (v) => `${cur}${Math.round(v).toLocaleString('en-US')}`;
        const unitNote = place.us ? '' : ` ${esc(place.currency)}`;
        return `<p class="helper-note">${place.us ? '' : `Amounts are in ${esc(place.currency)}: lend 10,000 ${esc(place.currency)}.`}</p><div class="pr-tiles">${tile('Each year', `${esc(amt(yearly))}${unitNote}`, `at ${y.toFixed(2)}% a year`)}${tile('Over 10 years', `${esc(amt(yearly * 10))}${unitNote}`, `in interest, plus your ${esc(amt(10000))}${unitNote} back`)}</div>`;
      })()}
      ${gaps.length > 12 ? `<h3>The gap between long and short loans</h3><p class="helper-note">10-year minus 3-month rate each month. Below zero is “inverted”: that happened in <strong>${inverted} of the last ${gaps.length} months</strong>.</p>${lineChart({ series: [{ name: 'Gap', color: C.blue, points: gaps }], title: 'Gap between 10-year and 3-month rates', fmt: (v) => `${v.toFixed(2)}` })}` : ''}
      ${extra}`;
}

/* ════════════════════════════════════════════════════════════════════
   ETFs
   ════════════════════════════════════════════════════════════════════ */
function etfLookupForm(value = '') {
  return `<form class="mk-lookup" action="/etfs" method="get" role="search">
          <label for="etfQ">Look up any US ETF by ticker</label>
          <div><input id="etfQ" name="q" value="${esc(value)}" maxlength="10" placeholder="e.g. IVV, AGG, QQQ" autocapitalize="characters"><button type="submit">Show</button></div>
        </form>`;
}

export async function renderEtfsHub(origin) {
  const head = buildHeadTags({
    title: 'ETFs explained: what is inside popular funds, fees and returns | Dr MoneyWise',
    description: 'Report cards for popular ETFs: their top holdings, what they invest in, yearly fees and recent returns, from the funds’ own reports. Look up any US ETF.',
    canonical: `${origin}/etfs`,
  });
  const rows = await Promise.all(CURATED_ETFS.map(async (e) => ({ e, d: await getEtfDataCachedOnly(e.ticker) })));
  const fees = [...CURATED_ETFS].sort((a, b) => a.expenseRatio - b.expenseRatio || a.ticker.localeCompare(b.ticker)).map((e) => ({ name: e.ticker, v: e.expenseRatio, href: `/etfs/${e.ticker}`, tip: `= $${(e.expenseRatio * 100).toFixed(2)} a year on $10,000` }));
  const body = `
      <section class="block pr-page">
        ${crumbs([['/markets', 'Markets'], [null, 'ETFs']])}
        <div class="pr-hero">
          <div><h1>ETFs explained</h1><p class="lede-dark">An ETF is one fund you can buy on the stock market that holds many investments at once. See what is inside, what it costs and how it has done.</p></div>
          ${etfLookupForm()}
        </div>
        <div class="table-scroll"><table class="pr-table mk-etf-table">
          <thead><tr><th>ETF</th><th>What it holds</th><th class="num">Yearly fee</th><th class="num">Fund size</th><th class="num">Holdings</th></tr></thead>
          <tbody>${rows.map(({ e, d }) => `<tr><th scope="row"><a href="/etfs/${e.ticker}"><strong>${esc(e.ticker)}</strong></a><br><small>${esc(e.name)}</small></th><td>${esc(e.kind)}</td><td class="num">${e.expenseRatio}%</td><td class="num">${d?.netAssets ? esc(bigUsd(d.netAssets)) : '—'}</td><td class="num">${d?.count ? d.count.toLocaleString('en-US') : '—'}</td></tr>`).join('')}</tbody>
        </table></div>
        <div class="pr-panel"><h2>Yearly fee, cheapest first</h2><p class="helper-note">Taken from your money every year. $10,000 in a fund with a 0.03% fee costs $3 a year; at 0.40% it costs $40.</p>${rankBars({ rows: fees, title: 'ETF yearly fees', fmt: (v) => `${v}%`, labelWidth: 90 })}</div>
        ${adSlot('in-content')}
        <details class="pr-explain"><summary>How to read an ETF page</summary><ul>
          <li><strong>Top holdings</strong> are the biggest investments inside the fund, as a share of the whole fund.</li>
          <li><strong>Yearly fee</strong> (expense ratio) is taken from the fund automatically; you never see a bill, but it lowers your return.</li>
          <li>Holdings come from the fund’s own report to the US Securities and Exchange Commission. They are published a couple of months after the date shown.</li>
        </ul></details>
        ${adSlot('partner-box')}
        ${sources(['Holdings, fund size and returns: each fund’s Form N-PORT report to the US Securities and Exchange Commission (SEC EDGAR).', 'Yearly fees: each fund provider’s published fund details, checked 17–19 October 2026.', 'Live price boxes: TradingView.'])}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/** Hub page: only use what is already saved (no slow downloads while a reader waits). */
async function getEtfDataCachedOnly(ticker) {
  const curated = getCuratedEtf(ticker);
  return readEtf(curated?.sameAs || ticker);
}

const monthsBefore = (iso, n) => {
  const d = new Date(`${String(iso).slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 7);
};

export async function renderEtf(origin, rawTicker) {
  const ticker = String(rawTicker || '').toUpperCase().replace(/[^A-Z0-9.-]/gu, '').slice(0, 10);
  if (!ticker) return null;
  const curated = getCuratedEtf(ticker);
  let d = await getEtfData(ticker);
  if (d?.notFund && !curated) return null;
  let borrowed = null;
  if (curated?.sameAs) { borrowed = curated.sameAs; d = await getEtfData(curated.sameAs); }
  const commodity = ETF_COMMODITY[ticker] ? getCommodity(ETF_COMMODITY[ticker]) : null;
  const name = curated?.name || d?.name || ticker;
  const head = buildHeadTags({
    title: `${ticker}: ${name} — holdings, fee and returns explained | Dr MoneyWise`,
    description: `What is inside ${name} (${ticker}) in plain English: top holdings, what it invests in, yearly fee and recent returns, from the fund’s own reports.`,
    canonical: `${origin}/etfs/${ticker}`,
  });
  const hasData = d?.count > 0;
  const fee = curated?.expenseRatio;
  const lines = [];
  if (curated) lines.push(`<strong>What’s inside:</strong> ${esc(curated.inside)}`);
  if (hasData) lines.push(`It held <strong>${d.count.toLocaleString('en-US')} investments</strong> worth <strong>${esc(bigUsd(d.netAssets))}</strong> on ${esc(monthDay(d.asOf))}${borrowed ? ` (figures for ${esc(borrowed)}, which follows the same index)` : ''}.`);
  if (hasData && d.top[0]) lines.push(`The biggest holding was <strong>${esc(d.top[0].name)}</strong> at ${sharePlain(d.top[0].pct)} of the fund; the top 10 together made up <strong>${sharePlain(d.top10Share)}</strong>.`);
  if (fee !== undefined) lines.push(`The yearly fee is <strong>${fee}%</strong>: about <strong>$${(fee * 100).toFixed(2)} a year for every $10,000</strong> invested.`);
  if (curated) lines.push(`<strong>Who it may suit:</strong> ${esc(curated.suits)}`);
  const returns = hasData ? (d.returns || []).map((v, i) => (v === null ? null : { p: monthsBefore(d.asOf, 2 - i), v })).filter(Boolean) : [];
  const assets = hasData ? d.assets.filter((a) => Math.abs(a.pct) >= 0.1) : [];
  const bondShare = hasData ? d.assets.filter((a) => /Bond|Loans/u.test(a.name)).reduce((x, a) => x + a.pct, 0) : 0;
  const issuers = hasData && bondShare > 20 ? d.issuers.filter((a) => Math.abs(a.pct) >= 0.5) : [];

  const top = `
        ${crumbs([['/markets', 'Markets'], ['/etfs', 'ETFs'], [null, ticker]])}
        <div class="pr-hero">
          <div><h1>${esc(name)} <span class="pick-ticker" style="font-size:18px">${esc(ticker)}</span></h1>${curated ? `<p class="pick-kind" style="font-size:17px">${esc(curated.kind)} · run by ${esc(curated.issuer)}</p>` : ''}</div>
          ${etfLookupForm()}
        </div>`;
  const body = `
      <section class="block pr-page">
        ${top}
        ${hasData ? `<p class="pr-updated">Holdings as of <strong>${esc(monthDay(d.asOf))}</strong>, from the fund’s report to the SEC</p>` : ''}
        ${lines.length ? `<div class="pr-summary"><h2>In short</h2><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>` : ''}
        <div class="pr-tiles">
          ${fee !== undefined ? tile('Yearly fee', `${fee}%`, `$${(fee * 100).toFixed(2)} a year per $10,000`) : ''}
          ${hasData ? tile('Fund size', esc(bigUsd(d.netAssets)), esc(monthDay(d.asOf))) : ''}
          ${hasData ? tile('Investments held', d.count.toLocaleString('en-US'), 'separate holdings') : ''}
          ${hasData ? tile('Top 10 share', sharePlain(d.top10Share), 'of the whole fund') : ''}
        </div>
        ${liveBox(curated ? etfTvSymbol(ticker) : ticker, `${ticker} price, last 12 months`, 260)}
        ${borrowed ? `<p class="note-box">${esc(ticker)} is set up as a “unit investment trust”, which does not file holdings reports with the SEC. It follows the same index as <a href="/etfs/${esc(borrowed)}">${esc(borrowed)}</a>, so the holdings below are ${esc(borrowed)}’s and are almost the same.</p>` : ''}
        ${commodity ? `<p class="note-box">${esc(ticker)} holds physical ${esc(commodity.name.toLowerCase())} in a vault rather than shares, so it files no holdings list. Its price follows the ${esc(commodity.name.toLowerCase())} price: see <a href="/commodities/${commodity.slug}">${esc(commodity.name)} price and history</a>.</p>` : ''}
        ${!hasData && !commodity && !borrowed ? `<p class="note-box">${d?.error ? 'The fund’s holdings report could not be downloaded just now; please try again later.' : 'This fund has not published a holdings report (Form N-PORT) that we can read, so only its price is shown.'}</p>` : ''}
        ${hasData ? `<div class="pr-panel"><h2>Top 10 holdings</h2><p class="helper-note">Share of the whole fund.</p>${rankBars({ rows: d.top.slice(0, 10).map((x) => ({ name: x.name, v: x.pct, tip: 'of the fund', href: x.asset === 'EC' && x.country === 'US' && /^[A-Z.]{1,6}$/u.test(x.ticker || '') ? `/stock/${x.ticker}` : '' })), title: 'Top 10 holdings', fmt: sharePlain, labelWidth: 230 })}</div>` : ''}
        ${assets.length ? `<div class="pr-panel"><h2>What it invests in</h2>${assets.length === 1 || assets[0].pct >= 99
          ? `<p class="mk-big-note">Almost all of the fund is in <strong>${esc(assets[0].name.toLowerCase())}</strong> (${sharePlain(Math.min(100, assets[0].pct))}).</p>`
          : rankBars({ rows: assets.map((a) => ({ name: a.name, v: a.pct, tip: 'of the fund' })), title: 'Asset mix', fmt: sharePlain, labelWidth: 190, link: false })}</div>` : ''}
        ${issuers.length ? `<div class="pr-panel"><h2>Who it lends to</h2><p class="helper-note">For the bonds and loans in the fund.</p>${rankBars({ rows: issuers.map((a) => ({ name: a.name, v: a.pct, tip: 'of the fund' })), title: 'Borrowers', fmt: sharePlain, labelWidth: 190, link: false })}</div>` : ''}
        ${returns.length ? `<div class="pr-panel"><h2>Returns, month by month</h2><p class="helper-note">Total return each month (price change plus income paid out), from the fund’s report.</p>${changeBars({ points: returns, title: 'Monthly total returns', tip: 'total return that month', height: 220 })}</div>` : ''}
        ${await newsBlockHtml('etf', ticker, { title: `In the news: ${ticker}`, search: curated ? curated.name : ticker, subject: curated ? `${name} (${ticker}) and ${curated.kind.toLowerCase()}` : `${name} (${ticker})` })}
        ${adSlot('in-content')}
        ${hasData ? membersBox('etf', borrowed || ticker, 'Everything inside the fund, worked out from its latest report.', [
          '<strong>Top 50 holdings</strong> with their share of the fund and country',
          '<strong>Where the money is:</strong> the split by country',
          '<strong>Industries:</strong> how much is in technology, banks, healthcare and more (for the companies we cover)',
          '<strong>How concentrated it is:</strong> how many holdings make up half the fund',
          '<strong>Overlap check:</strong> how much this fund has in common with another ETF, so you avoid paying twice for the same companies',
        ]) : ''}
        ${adSlot('partner-box')}
        ${sources([hasData ? `Holdings, fund size and returns: ${borrowed || ticker}’s Form N-PORT report to the US Securities and Exchange Commission (SEC EDGAR).` : '', fee !== undefined ? 'Yearly fee: the fund provider’s published details, checked October 2026.' : '', 'Live price box: TradingView.'])}
        <div class="pr-others"><h2>Other ETFs</h2><div>${CURATED_ETFS.filter((e) => e.ticker !== ticker).map((e) => `<a href="/etfs/${e.ticker}">${esc(e.ticker)}</a>`).join('')}</div></div>
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

async function etfMembersHtml(ticker, other) {
  const d = await getEtfData(ticker);
  if (!d?.count) return '<p class="helper-note">No holdings report to work from for this fund.</p>';
  const countries = d.countries.filter((c) => Math.abs(c.pct) >= 0.2).map((c) => ({ name: countryName(c.code), v: c.pct, tip: 'of the fund' }));
  // Industries for the companies we cover
  const sectors = {};
  let covered = 0;
  for (const x of d.top) {
    const s = x.ticker && sectorOf(x.ticker);
    if (s) { sectors[s.name] = (sectors[s.name] || 0) + x.pct; covered += x.pct; }
  }
  const sectorRows = Object.entries(sectors).map(([name, v]) => ({ name, v, tip: 'of the fund' })).sort((a, b) => b.v - a.v);
  const options = CURATED_ETFS.filter((e) => e.ticker !== ticker && !ETF_COMMODITY[e.ticker]).map((e) => `<option value="${esc(e.ticker)}"${e.ticker === other ? ' selected' : ''}>${esc(e.ticker)} — ${esc(e.name)}</option>`).join('');
  let overlapHtml = '';
  if (other) {
    const otherCurated = getCuratedEtf(other);
    const od = await getEtfData(otherCurated?.sameAs || other);
    const o = overlap(d, od);
    overlapHtml = o ? `<div class="pr-tiles" style="margin-top:12px">${tile('In common', sharePlain(o.sharedPct), `of ${esc(ticker)} is also in ${esc(other)}`)}${tile('Shared holdings', o.count.toLocaleString('en-US'), 'held by both funds')}</div>
      ${o.top.length ? `<div class="table-scroll"><table class="pr-table"><thead><tr><th>Held by both</th><th class="num">${esc(ticker)}</th><th class="num">${esc(other)}</th></tr></thead><tbody>${o.top.map((x) => `<tr><th scope="row">${esc(x.name)}</th><td class="num">${sharePlain(x.a)}</td><td class="num">${sharePlain(x.b)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="helper-note">“In common” adds up, for every holding in both funds, the smaller of its two shares. 100% would mean the same fund twice.</p>` : '<p class="helper-note">We could not compare these two funds (one has no holdings report).</p>';
  }
  return `
      <h3>Top ${Math.min(50, d.top.length)} holdings</h3>
      ${(() => {
        const row = (x, i) => `<tr><td>${i + 1}</td><th scope="row">${esc(x.name)}${x.ticker ? ` <small>${esc(x.ticker)}</small>` : ''}</th><td>${esc(ASSET_WORDS[x.asset] || 'Other')}</td><td>${esc(countryName(x.country))}</td><td class="num">${esc(sharePlain(x.pct))}</td></tr>`;
        const headRow = '<thead><tr><th>#</th><th>Holding</th><th>Type</th><th>Country</th><th class="num">Share of fund</th></tr></thead>';
        const first = d.top.slice(0, 20);
        const rest = d.top.slice(20);
        return `<div class="table-scroll"><table class="pr-table">${headRow}<tbody>${first.map(row).join('')}</tbody></table></div>${rest.length ? `<details class="pr-explain"><summary>Show holdings 21 to ${d.top.length}</summary><div class="table-scroll"><table class="pr-table"><tbody>${rest.map((x, i) => row(x, i + 20)).join('')}</tbody></table></div></details>` : ''}`;
      })()}
      <div class="pr-tiles" style="margin-top:14px">
        ${tile('Top 10 share', sharePlain(d.top10Share), 'of the whole fund')}
        ${d.toHalf ? tile('Holdings that make up half', d.toHalf.toLocaleString('en-US'), `out of ${d.count.toLocaleString('en-US')}`) : ''}
      </div>
      ${countries.length ? `<h3>Where the money is</h3>${rankBars({ rows: countries, title: 'Split by country', fmt: sharePlain, labelWidth: 170, link: false })}` : ''}
      ${sectorRows.length && covered > 5 ? `<h3>Industries</h3><p class="helper-note">For the companies in our report cards, which make up ${sharePlain(covered)} of the fund.</p>${rankBars({ rows: sectorRows, title: 'Split by industry', fmt: sharePlain, labelWidth: 170, link: false })}` : ''}
      <h3>Overlap check</h3>
      <form class="mk-overlap" data-overlap><label for="ovPick">Compare ${esc(ticker)} with</label><div><select id="ovPick" name="other">${other ? '' : '<option value="">Choose an ETF…</option>'}${options}</select><button type="submit">Compare</button></div></form>
      <div data-overlap-result>${overlapHtml}</div>`;
}

/* ── Members API (/api/markets/details) ──────────────────────────── */
export async function marketsMembersHtml(kind, id, other) {
  if (kind === 'commodity') return commodityMembersHtml(id, await readCommodities());
  if (kind === 'bond') return bondMembersHtml(id, await readBonds());
  if (kind === 'etf') return etfMembersHtml(String(id).toUpperCase(), other ? String(other).toUpperCase().replace(/[^A-Z0-9.-]/gu, '').slice(0, 10) : '');
  return null;
}

export function marketsSitemapEntries(origin) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { loc: `${origin}/markets`, lastmod: today, priority: '0.7' },
    { loc: `${origin}/commodities`, lastmod: today, priority: '0.7' },
    ...COMMODITIES.map((c) => ({ loc: `${origin}/commodities/${c.slug}`, lastmod: today, priority: '0.6' })),
    { loc: `${origin}/bonds`, lastmod: today, priority: '0.7' },
    ...BOND_PLACES.map((p) => ({ loc: `${origin}/bonds/${p.slug}`, lastmod: today, priority: '0.6' })),
    { loc: `${origin}/etfs`, lastmod: today, priority: '0.7' },
    ...CURATED_ETFS.map((e) => ({ loc: `${origin}/etfs/${e.ticker}`, lastmod: today, priority: '0.6' })),
  ];
}
