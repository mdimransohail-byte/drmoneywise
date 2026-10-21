/* ════════════════════════════════════════════════════════════════════════
   MONTHLY RESEARCH REPORT (Premium) — /reports and /reports/<YYYY-MM>
   ───────────────────────────────────────────────────────────────────────
   Built by the data engine ("report" job) on the 1st of each month for
   the month just ended, from the figures the site already collects:
     economy (BLS, NY Fed, Treasury, Freddie Mac) · commodities (World
     Bank) · bond yields (US Treasury, OECD) · company results and
     dividends (SEC 8-K) · company bosses' trades (SEC Form 4) · big funds
     (SEC 13F) · report-card scores (SEC accounts) · home prices (BIS)
   The executive summary and "what to watch" are written from those
   figures only; every number in the text is checked against them and,
   if any doesn't match, plain sentences built by code are used instead.
   Until the first full month, a "month so far" report is built so the
   page is never empty. Saved to data/market/reports/<id>.json.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { COMMODITIES } from '../data/commodityList.js';
import { BOND_PLACES } from '../data/bondList.js';
import { PROPERTY_PLACES } from '../data/propertyPlaces.js';
import { WORLD_REGIONS } from '../data/worldStocks.js';
import { readCommodities } from './commodityService.js';
import { readBonds } from './bondService.js';
import { readProperty, yoyFrom } from './propertyService.js';
import { readEconomy } from './dataEngine.js';
import { readDividends, readResults } from './resultsService.js';
import { insiderTradesBetween } from './insiderService.js';
import { screenerRows } from './screenerService.js';
import { checkNewsText } from './qualityService.js';

const DIR = path.join(process.cwd(), 'data', 'market', 'reports');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (id) => `${MONTHS[Number(id.slice(5, 7)) - 1]} ${id.slice(0, 4)}`;
const periodName = (p) => (/^\d{4}-\d{2}$/u.test(p) ? monthName(p) : /^\d{4}-Q\d$/u.test(p) ? `${['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'][Number(p.slice(-1)) - 1]} ${p.slice(0, 4)}` : p);
const pct = (v, dp = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(dp)}%`;
const money = (v) => {
  const a = Math.abs(v || 0);
  return `$${a >= 1e9 ? `${(a / 1e9).toFixed(1)}bn` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}m` : a >= 1e3 ? `${Math.round(a / 1e3)}k` : Math.round(a)}`;
};
const monthsBack = (p, n) => { const [y, m] = p.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export async function listReports() {
  try {
    const files = (await fs.readdir(DIR)).filter((f) => /^\d{4}-\d{2}\.json$/u.test(f)).sort().reverse();
    const out = [];
    for (const f of files) out.push(JSON.parse(await fs.readFile(path.join(DIR, f), 'utf8')));
    return out;
  } catch { return []; }
}
export async function readReport(id) {
  if (!/^\d{4}-\d{2}$/u.test(String(id))) return null;
  try { return JSON.parse(await fs.readFile(path.join(DIR, `${id}.json`), 'utf8')); } catch { return null; }
}

/* ── Gathering the figures ─────────────────────────────────────────── */
async function gather(id, from, to) {
  const data = {};
  // Economy
  const econ = (await readEconomy()).figures || {};
  const E = [['inflation', 'US inflation (prices vs a year ago)'], ['interestRate', 'US central bank interest rate'], ['tenYearYield', 'US 10-year government bond yield'], ['mortgageRate', 'US 30-year mortgage rate'], ['unemployment', 'US unemployment rate']];
  data.economy = E.filter(([k]) => econ[k]?.value !== undefined).map(([k, name]) => ({ key: k, name, value: econ[k].value, previous: econ[k].previous ?? null, asOf: econ[k].asOf }));
  // Commodities (World Bank monthly averages)
  const com = await readCommodities();
  data.commodities = COMMODITIES.map((c) => {
    const s = com.items?.[c.slug]?.series || [];
    const last = s.at(-1); const prev = s.at(-2); const yearAgo = last ? s.find((x) => x.p === monthsBack(last.p, 12)) : null;
    if (!last || !prev) return null;
    return { slug: c.slug, name: c.name, period: last.p, value: last.v, month: ((last.v / prev.v) - 1) * 100, year: yearAgo ? ((last.v / yearAgo.v) - 1) * 100 : null, unit: com.items[c.slug].unit || '' };
  }).filter(Boolean);
  // Bond yields (10-year)
  const bonds = await readBonds();
  data.bonds = BOND_PLACES.map((b) => {
    const s = b.us ? (bonds.us?.monthly || []).map((r) => ({ p: r.p, v: r['10Y'] })).filter((r) => r.v !== undefined) : (bonds.oecd?.[b.oecd]?.long || []);
    const last = s.at(-1); const prev = s.at(-2);
    return last ? { slug: b.slug, name: b.name, period: last.p, value: last.v, change: prev ? last.v - prev.v : null } : null;
  }).filter(Boolean);
  // Company results and dividends announced in the month
  const results = (readResults().items || []).filter((r) => r.filed >= from && r.filed <= to);
  const firstTracked = (readResults().items || []).map((r) => r.filed).sort()[0] || null;
  data.results = { since: firstTracked && firstTracked > from ? firstTracked : null, count: results.length, items: results.slice(0, 8).map((r) => ({ ticker: r.ticker, name: r.name, headline: r.headline || 'Results announced', filed: r.filed })) };
  const divs = readDividends().filter((d) => d.filed >= from && d.filed <= to);
  data.dividends = { raised: divs.filter((d) => d.action === 'raised').length, cut: divs.filter((d) => d.action === 'cut').length, started: divs.filter((d) => d.action === 'started').length, stopped: divs.filter((d) => d.action === 'stopped').length,
    raisedNames: divs.filter((d) => d.action === 'raised').slice(0, 6).map((d) => ({ ticker: d.ticker, name: d.name })) };
  // Company bosses' trades
  const trades = await insiderTradesBetween(from, to);
  const by = {};
  for (const t of trades) { const x = by[t.ticker] = by[t.ticker] || { ticker: t.ticker, name: t.company, net: 0 }; x.net += (t.side === 'buy' ? 1 : -1) * (t.value || 0); }
  data.insiders = {
    buys: trades.filter((t) => t.side === 'buy').length, sells: trades.filter((t) => t.side === 'sell').length,
    bought: trades.filter((t) => t.side === 'buy').reduce((a, t) => a + (t.value || 0), 0), sold: trades.filter((t) => t.side === 'sell').reduce((a, t) => a + (t.value || 0), 0),
    topBuying: Object.values(by).filter((x) => x.net > 0).sort((a, b) => b.net - a.net).slice(0, 6),
  };
  // Big funds (latest quarterly reports) and report-card scores
  const { rows, fundsPeriod } = await screenerRows({ premium: true });
  data.funds = { period: fundsPeriod, mostBought: rows.filter((r) => r.buyers >= 2).sort((a, b) => b.buyers - a.buyers || (b.fundsValue || 0) - (a.fundsValue || 0)).slice(0, 8).map((r) => ({ ticker: r.ticker, name: r.name, buyers: r.buyers, sellers: r.sellers })) };
  const scored = rows.filter((r) => r.score !== null);
  data.scores = {
    companies: scored.length,
    average: scored.length ? Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length) : null,
    top: scored.slice().sort((a, b) => b.score - a.score || (b.sales || 0) - (a.sales || 0)).slice(0, 10).map((r) => ({ ticker: r.ticker, name: r.name, score: r.score, sector: r.sector, region: r.region })),
    regions: [{ id: 'us', name: 'United States' }, ...WORLD_REGIONS].map((g) => {
      const mine = scored.filter((r) => r.region === g.id);
      return mine.length >= 3 ? { name: g.name, average: Math.round(mine.reduce((a, r) => a + r.score, 0) / mine.length), companies: mine.length } : null;
    }).filter(Boolean),
  };
  // Home prices, change on a year earlier (BIS)
  const prop = await readProperty();
  data.property = PROPERTY_PLACES.map((p) => {
    const yoy = yoyFrom(prop.places?.[p.slug]?.bis?.nominal || [], 4).at(-1);
    return yoy ? { slug: p.slug, name: p.name, period: yoy.p, change: yoy.v } : null;
  }).filter(Boolean);
  return data;
}

/** The short, rounded figures handed to the writer (and used to check its numbers). */
export function factsFor(data) {
  return {
    economy: data.economy.map((e) => ({ figure: e.name, latest: `${e.value.toFixed(2).replace(/\.?0+$/u, '')}%`, before: e.previous !== null ? `${e.previous.toFixed(2).replace(/\.?0+$/u, '')}%` : null, asOf: periodName(String(e.asOf).slice(0, 7)) })),
    commodities: data.commodities.slice().sort((a, b) => Math.abs(b.month) - Math.abs(a.month)).slice(0, 6).map((c) => ({ name: c.name, monthChange: pct(c.month), yearChange: c.year !== null ? pct(c.year) : null, month: periodName(c.period) })),
    bonds10Year: data.bonds.slice(0, 6).map((b) => ({ country: b.name, yield: `${b.value.toFixed(2)}%`, changeOnMonth: b.change !== null ? `${b.change >= 0 ? '+' : '−'}${Math.abs(b.change).toFixed(2)} points` : null })),
    companyResults: data.results.count,
    dividends: { raised: data.dividends.raised, cut: data.dividends.cut },
    companyBosses: { buys: data.insiders.buys, sales: data.insiders.sells, valueBought: money(data.insiders.bought), valueSold: money(data.insiders.sold) },
    bigFundsMostBought: data.funds.mostBought.slice(0, 4).map((f) => `${f.name} (${f.buyers} funds bought)`),
    reportCardAverageScore: data.scores.average,
    reportCardCompanies: data.scores.companies,
    homePricesYearOnYear: data.property.map((p) => ({ place: p.name, change: pct(p.change) })),
  };
}

/** Every number in the text must appear in the facts (years and step counts excepted). */
export function numbersCheck(text, facts) {
  const NUM = /[−+-]?\$?\d[\d,]*(?:\.\d+)?(?:%|bn|m|k)?/gu;
  const bare = (t) => t.replace(/[,−+$-]/gu, '').replace(/(%|bn|m|k)$/u, '');
  const known = new Set([...JSON.stringify(facts).matchAll(NUM)].map((m) => bare(m[0])));
  const bad = [];
  for (const m of String(text).matchAll(NUM)) {
    const n = bare(m[0]);
    if (/^(19|20)\d\d$/u.test(n) || (Number(n) <= 10 && !/[%$.]/u.test(m[0]))) continue; // years, small counts
    if (!known.has(n)) bad.push(m[0]);
  }
  return bad;
}

/** Plain sentences built by code, used if no written summary passes the checks. */
function ruleText(id, data) {
  const f = factsFor(data);
  const e = Object.fromEntries(data.economy.map((x) => [x.key, x]));
  const p = [];
  if (e.inflation) p.push(`Prices in the US were ${f.economy.find((x) => x.figure.startsWith('US inflation')).latest} higher than a year earlier${e.interestRate ? `, and the central bank’s interest rate stood at ${f.economy.find((x) => x.figure.startsWith('US central')).latest}` : ''}. When prices rise faster than the interest savings earn, cash slowly loses buying power.`);
  const big = data.commodities.slice().sort((a, b) => Math.abs(b.month) - Math.abs(a.month))[0];
  if (big) p.push(`Among commodities, ${big.name.toLowerCase()} moved most in ${periodName(big.period)}, ${big.month >= 0 ? 'up' : 'down'} ${pct(Math.abs(big.month)).replace('+', '')} on the month${big.year !== null ? ` and ${big.year >= 0 ? 'up' : 'down'} ${pct(Math.abs(big.year)).replace('+', '')} on a year earlier` : ''}.`);
  if (data.results.count || data.insiders.buys + data.insiders.sells) p.push(`${data.results.count} ${data.results.count === 1 ? 'company' : 'companies'} we follow reported results this month. Company bosses bought shares on the market ${data.insiders.buys} ${data.insiders.buys === 1 ? 'time' : 'times'} (${money(data.insiders.bought)}) and sold ${data.insiders.sells} ${data.insiders.sells === 1 ? 'time' : 'times'} (${money(data.insiders.sold)}). Selling is usually more common than buying, often to pay tax or as part of a plan made months earlier.`);
  if (data.scores.average !== null) p.push(`Across the ${data.scores.companies} companies with report cards, the average score was ${data.scores.average} out of 100.`);
  const watch = [
    e.inflation && 'The next inflation figure: whether price rises keep slowing or pick up again affects interest rates and mortgages.',
    data.bonds[0] && 'Government bond yields: they set the tone for borrowing costs and for how investors value shares.',
    data.funds.period && 'The next big-fund reports, due about 45 days after the quarter ends.',
  ].filter(Boolean);
  return { headline: `${monthName(id)}: the month in figures`, summary: p, watch, source: 'rules' };
}

/** Builds (or rebuilds) the report for month `id` (YYYY-MM). */
export async function buildReport(id, { partial = false } = {}) {
  const from = `${id}-01`;
  const end = new Date(Date.UTC(Number(id.slice(0, 4)), Number(id.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const to = partial ? today : end;
  const data = await gather(id, from, to);
  const facts = factsFor(data);
  let text = null;
  try {
    const { writeReportSummary } = await import('./writerService.js');
    const written = await writeReportSummary({ month: partial ? `${monthName(id)} so far` : monthName(id), facts });
    if (written) {
      const all = [written.headline, ...written.summary, ...written.watch].join(' ');
      const badNumbers = numbersCheck(all, facts);
      const issues = checkNewsText(all);
      if (!badNumbers.length && !issues.length) text = { ...written, source: 'written' };
      else console.log(`[report] ${id}: written summary not used (${[...badNumbers.map((n) => `number ${n} not in the figures`), ...issues].slice(0, 4).join('; ')}) — using plain sentences`);
    }
  } catch (error) { console.error(`[report] ${id}: summary failed — ${error.message}`); }
  if (!text) text = ruleText(id, data);
  const report = { id, month: monthName(id), partial, from, to, createdAt: new Date().toISOString(), text, data };
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${id}.json`), JSON.stringify(report));
  return report;
}

/** Data engine job, daily. The first report covers "the month so far" (we
 *  don't build reports for months before the site was collecting figures);
 *  on the 1st, last month's report is finished; a "so far" report is
 *  refreshed weekly until then. */
export async function runReports() {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = monthsBack(thisMonth, 1);
  const all = await listReports();
  if (!all.length) {
    if (now.getUTCDate() < 7) return { ok: true, message: 'First report will be built on the 7th of the month' };
    const r = await buildReport(thisMonth, { partial: true });
    return { ok: true, message: `First report built: "${r.month} so far"` };
  }
  const prev = await readReport(lastMonth);
  if ((prev && prev.partial) || (!prev && all.some((r) => r.id < lastMonth))) {
    const r = await buildReport(lastMonth);
    return { ok: true, message: `Report for ${r.month} built (${r.text.source === 'written' ? 'summary written and checked' : 'plain summary'})` };
  }
  const current = all.find((r) => r.id === thisMonth);
  if (current?.partial && Date.now() - new Date(current.createdAt).getTime() > 7 * 86400000) {
    const r = await buildReport(thisMonth, { partial: true });
    return { ok: true, message: `"${r.month} so far" report refreshed` };
  }
  return { ok: true, message: `Up to date (latest: ${all[0].month}${all[0].partial ? ' so far' : ''})` };
}
