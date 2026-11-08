/* ════════════════════════════════════════════════════════════════════════
   STOCK TOP 10 LISTS — /top-10/stocks/<list>
   Twenty lists built from the same data the rest of the site uses:
     • company accounts from SEC filings (sales, profit, growth, cash, debt,
       report-card score)
     • last closing prices, and about 14 months of daily prices for each
       company we cover (1-year and year-to-date returns, 52-week high and
       low), all from Marketstack
   Some lists mix two or three of these, e.g. "strong companies near their
   52-week low". Each list shows its rule, date and sources. US companies
   only (overseas companies report per-share figures for local shares).
   Lists that need prices or price history appear when that data is in;
   until then they are left off the Top 10 page rather than shown empty.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { readCompanies, readPrices } from './dataEngine.js';
import { screenerRows } from './screenerService.js';
import { whatIfScenarios } from './stockPages.js';
import { formatMoney } from './reportCardService.js';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'market', 'history');
const latest = (s) => s?.at?.(-1)?.value ?? null;
const pct = (v, dp = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(dp)}%`);
const pctPlain = (v, dp = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toFixed(dp)}%`);
const money = (v) => formatMoney(v).replace(' trillion', 'tn').replace(' billion', 'bn').replace(' million', 'm');
const usd = (v) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : '—');
const BIG = 5e9;   // "large company" floor for ratio lists (yearly sales)
const HUGE = 10e9;

/* ── Price-history figures for one company ─────────────────────────── */
async function historyStats(ticker) {
  try {
    const data = JSON.parse(await fs.readFile(path.join(HISTORY_DIR, `${ticker}.json`), 'utf8'));
    const rows = (data.rows || []).filter((r) => Number.isFinite(r.c));
    if (rows.length < 200) return null;
    const last = rows.at(-1);
    const lastDate = new Date(last.d);
    // Close about one year ago: the last close on or before the same date last year
    const yearAgo = new Date(lastDate); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const ya = yearAgo.toISOString().slice(0, 10);
    const then = rows.filter((r) => r.d <= ya).at(-1);
    const year = rows.filter((r) => r.d > ya);
    const hi = Math.max(...year.map((r) => (Number.isFinite(r.h) ? r.h : r.c)));
    const lo = Math.min(...year.map((r) => (Number.isFinite(r.l) ? r.l : r.c)));
    const ys = `${lastDate.getFullYear()}-01-01`;
    const startYtd = rows.filter((r) => r.d < ys).at(-1);
    return {
      asOf: last.d,
      close: last.c,
      ret1y: then ? (last.c / then.c - 1) * 100 : null,
      ytd: startYtd ? (last.c / startYtd.c - 1) * 100 : null,
      hi52: hi, lo52: lo,
      fromHigh: hi > 0 ? (last.c / hi - 1) * 100 : null,     // 0% = at the high, -20% = 20% below it
      aboveLow: lo > 0 ? (last.c / lo - 1) * 100 : null,     // 0% = at the low
    };
  } catch { return null; }
}

/* ── One row per US company, everything the lists need ─────────────── */
let memo = null;
export async function stockFacts() {
  if (memo && Date.now() - memo.at < 30 * 60 * 1000) return memo.data;
  const [{ companies }, prices, screener] = await Promise.all([readCompanies(), readPrices(), screenerRows({ premium: false })]);
  const byTicker = new Map(screener.rows.map((r) => [r.ticker, r]));
  const rows = [];
  let pricesAsOf = ''; let historyAsOf = ''; let withHistory = 0;
  for (const c of Object.values(companies || {})) {
    if (!c?.ticker || c.foreignFiler || !c.revenue?.length) continue;
    const s = byTicker.get(c.ticker) || {};
    const p = prices.prices?.[c.ticker];
    const price = p?.price || null;
    if (p?.date && p.date > pricesAsOf) pricesAsOf = p.date;
    const eps = whatIfScenarios(c).find((x) => x.label === 'Earnings per share');
    const epsNow = eps?.available ? eps.base : null;
    const h = await historyStats(c.ticker);
    if (h) { withHistory += 1; if (h.asOf > historyAsOf) historyAsOf = h.asOf; }
    rows.push({
      ticker: c.ticker,
      name: s.name || c.displayName || c.name || c.ticker,
      sector: s.sector || '',
      sales: latest(c.revenue),
      profit: latest(c.netIncome),
      salesGrowth: s.salesGrowth ?? null,
      margin: s.margin ?? null,
      epsGrowth: s.epsGrowth ?? null,
      debtYears: s.debtYears ?? null,
      spareCash: s.spareCash ?? null,
      dividend: s.dividend || 0,
      divYears: s.divYears || 0,
      divYield: s.divYield ?? null,
      score: s.score ?? null,
      price,
      marketCap: price && c.sharesOutstanding ? price * c.sharesOutstanding : null,
      pe: price && epsNow > 0 ? price / epsNow : null,
      ...(h || {}),
    });
  }
  const data = { rows, pricesAsOf: String(pricesAsOf).slice(0, 10), historyAsOf, withHistory };
  memo = { at: Date.now(), data };
  return data;
}

/* ── The lists ─────────────────────────────────────────────────────────
   group     where it sits on the Top 10 page
   needs     'prices' | 'history' | '' (accounts only)
   value     the ranking number; rows without one are left out
   keep      extra conditions a company must meet
   asc       true = smallest first
   show      the columns in the table (label, function)                  */
const C = {
  sales: ['Yearly sales', (r) => money(r.sales)],
  profit: ['Yearly profit', (r) => money(r.profit)],
  growth: ['Sales growth', (r) => pct(r.salesGrowth)],
  margin: ['Profit margin', (r) => pctPlain(r.margin)],
  eps: ['Earnings growth a year', (r) => pct(r.epsGrowth)],
  cash: ['Spare cash a year', (r) => money(r.spareCash)],
  debt: ['Years to repay debt', (r) => (r.debtYears === 0 ? 'No debt' : r.debtYears === null ? '—' : `${r.debtYears.toFixed(1)} yrs`)],
  score: ['Report-card score', (r) => (r.score === null ? '—' : `${r.score}/100`)],
  cap: ['Market value', (r) => money(r.marketCap)],
  price: ['Price', (r) => usd(r.price)],
  pe: ['P/E', (r) => (r.pe ? r.pe.toFixed(1) : '—')],
  y1: ['1-year return', (r) => pct(r.ret1y)],
  ytd: ['This year', (r) => pct(r.ytd)],
  hi: ['52-week high', (r) => usd(r.hi52)],
  lo: ['52-week low', (r) => usd(r.lo52)],
  fromHigh: ['Below its high', (r) => (r.fromHigh === null ? '—' : r.fromHigh > -0.05 ? 'At its high' : `${Math.abs(r.fromHigh).toFixed(1)}% below`)],
  aboveLow: ['Above its low', (r) => (r.aboveLow === null ? '—' : r.aboveLow < 0.05 ? 'At its low' : `${r.aboveLow.toFixed(1)}% above`)],
  yield: ['Dividend yield', (r) => pctPlain(r.divYield, 2)],
};

export const STOCK_LISTS = [
  // Size
  { slug: 'largest-companies', group: 'Size', title: 'Largest companies by market value', short: 'Largest companies', needs: 'prices', value: (r) => r.marketCap, show: [C.cap, C.price, C.sales, C.score],
    rule: 'Ranked by market value: today’s share price × the number of shares in issue (from the latest SEC filing).',
    why: 'Market value is what the stock market says the whole company is worth. The biggest companies make up a large part of most index funds.', barLabel: (r) => money(r.marketCap) },
  { slug: 'biggest-sales', group: 'Size', title: 'Biggest companies by sales', short: 'Biggest sales', needs: '', value: (r) => r.sales, show: [C.sales, C.growth, C.margin, C.score],
    rule: 'Ranked by sales (revenue) in the latest financial year, from SEC filings.',
    why: 'Sales are all the money a company takes in before costs. Big sales mean a big business, though not always a profitable one.', barLabel: (r) => money(r.sales) },
  { slug: 'most-profitable', group: 'Size', title: 'Companies making the most profit', short: 'Most profit', needs: '', value: (r) => (r.profit > 0 ? r.profit : null), show: [C.profit, C.margin, C.sales, C.score],
    rule: 'Ranked by profit (net income) in the latest financial year, from SEC filings.',
    why: 'Profit is what is left after every cost and tax. It is what can be paid out as dividends or reinvested.', barLabel: (r) => money(r.profit) },
  // Growth and profit
  { slug: 'fastest-growing', group: 'Growth and profit', title: 'Fastest-growing large companies', short: 'Fastest growing', needs: '', value: (r) => r.salesGrowth, keep: (r) => r.sales >= BIG, show: [C.growth, C.sales, C.margin, C.score],
    rule: 'Ranked by sales growth in the latest year. Only companies with yearly sales of $5 billion or more, so tiny companies with a lucky year don’t top the list.',
    why: 'Fast-growing sales show customers want more of what a company sells. Growth that lasts several years matters more than one good year.', barLabel: (r) => pct(r.salesGrowth) },
  { slug: 'highest-margins', group: 'Growth and profit', title: 'Highest profit margins', short: 'Highest margins', needs: '', value: (r) => r.margin, keep: (r) => r.sales >= BIG, show: [C.margin, C.profit, C.growth, C.score],
    rule: 'Ranked by profit margin: profit as a share of sales, latest year. Companies with yearly sales of $5 billion or more.',
    why: 'A high margin means a company keeps a lot of each dollar it sells, often a sign of a strong brand or little competition.', barLabel: (r) => pctPlain(r.margin) },
  { slug: 'earnings-growth', group: 'Growth and profit', title: 'Fastest-rising earnings per share', short: 'Earnings growth', needs: '', value: (r) => r.epsGrowth, keep: (r) => r.sales >= BIG && r.profit > 0, show: [C.eps, C.growth, C.margin, C.score],
    rule: 'Ranked by how fast earnings per share have grown each year on average over the past several years (from SEC filings). Profitable companies with yearly sales of $5 billion or more.',
    why: 'Earnings per share is the profit belonging to each share. Over long periods, share prices tend to follow it.', barLabel: (r) => pct(r.epsGrowth) },
  { slug: 'cash-machines', group: 'Growth and profit', title: 'Biggest cash machines', short: 'Most spare cash', needs: '', value: (r) => (r.spareCash > 0 ? r.spareCash : null), show: [C.cash, C.profit, C.debt, C.score],
    rule: 'Ranked by spare cash (free cash flow) in the latest year: cash from running the business minus spending on buildings and equipment.',
    why: 'Spare cash is real money a company can use for dividends, buying back shares, paying off debt or growing, without borrowing.', barLabel: (r) => money(r.spareCash) },
  { slug: 'strongest-balance-sheets', group: 'Growth and profit', title: 'Strongest finances: least debt', short: 'Least debt', needs: '', value: (r) => r.debtYears, asc: true, keep: (r) => r.sales >= HUGE && r.spareCash > 0, show: [C.debt, C.cash, C.sales, C.score],
    rule: 'Ranked by how many years of operating cash it would take to repay all long-term debt (fewest first). Companies with yearly sales of $10 billion or more and positive spare cash.',
    why: 'Companies with little debt can ride out bad years without cutting dividends or borrowing at high rates.', barLabel: (r) => (r.debtYears === 0 ? 'No debt' : `${r.debtYears.toFixed(1)} yrs`), barValue: (r, max) => max - r.debtYears + 0.5 },
  { slug: 'best-report-cards', group: 'Growth and profit', title: 'Best overall report cards', short: 'Best report cards', needs: '', value: (r) => (r.score === null ? null : r.score + Math.min(r.sales || 0, 1e12) / 1e13), show: [C.score, C.growth, C.margin, C.debt],
    rule: 'Ranked by our report-card score out of 100 (growth, profit, debt, cash and dividends, each rated from SEC filings). Ties go to the larger company.',
    why: 'A high score means a company does well on several health checks at once, not just one.', barLabel: (r) => `${r.score}/100`, barValue: (r) => r.score },
  // Price moves
  { slug: 'best-1-year', group: 'Price moves', title: 'Best performers over the past year', short: 'Best 1-year returns', needs: 'history', value: (r) => r.ret1y, keep: (r) => r.ret1y > 0, show: [C.y1, C.price, C.fromHigh, C.score],
    rule: 'Ranked by the change in share price over the past 12 months (closing prices; dividends not included).',
    why: 'Shows which shares have risen most. A big rise can reflect real progress, or excitement that may fade.', barLabel: (r) => pct(r.ret1y), barValue: (r) => Math.max(0, r.ret1y) },
  { slug: 'worst-1-year', group: 'Price moves', title: 'Biggest fallers over the past year', short: 'Biggest 1-year falls', needs: 'history', value: (r) => r.ret1y, asc: true, keep: (r) => r.ret1y < 0, show: [C.y1, C.price, C.aboveLow, C.score],
    rule: 'Ranked by the fall in share price over the past 12 months, biggest fall first (closing prices).',
    why: 'Big fallers are where bad news, or bargains, may be. Check the report card to see whether the business itself has weakened.', barLabel: (r) => pct(r.ret1y), barValue: (r) => Math.abs(Math.min(0, r.ret1y)) },
  { slug: 'best-this-year', group: 'Price moves', title: 'Best performers this year', short: 'Best this year', needs: 'history', value: (r) => r.ytd, keep: (r) => r.ytd > 0, show: [C.ytd, C.y1, C.price, C.score],
    rule: 'Ranked by the change in share price since the last close of last year (year to date).',
    why: 'This year’s leaders. Short-term moves often reverse, so treat it as a starting point for learning.', barLabel: (r) => pct(r.ytd), barValue: (r) => Math.max(0, r.ytd) },
  { slug: 'near-52-week-high', group: 'Price moves', title: 'At or near their 52-week high', short: 'Near 52-week high', needs: 'history', value: (r) => r.fromHigh, sortBy: (a, b) => b.fromHigh - a.fromHigh || b.ret1y - a.ret1y, show: [C.fromHigh, C.hi, C.price, C.y1],
    rule: 'Ranked by how close the latest close is to the highest price of the past 52 weeks (closest first).',
    why: 'Shares at a 52-week high are in an uptrend: buyers have been willing to pay more and more.', barLabel: (r) => (r.fromHigh > -0.05 ? 'At high' : `${Math.abs(r.fromHigh).toFixed(1)}% below`), barValue: (r) => 100 + r.fromHigh },
  { slug: 'near-52-week-low', group: 'Price moves', title: 'At or near their 52-week low', short: 'Near 52-week low', needs: 'history', value: (r) => r.aboveLow, asc: true, show: [C.aboveLow, C.lo, C.price, C.y1],
    rule: 'Ranked by how close the latest close is to the lowest price of the past 52 weeks (closest first).',
    why: 'Shares near a 52-week low are out of favour. Some recover, some keep falling: the business’s health is what matters.', barLabel: (r) => (r.aboveLow < 0.05 ? 'At low' : `${r.aboveLow.toFixed(1)}% above`), barValue: (r) => Math.max(1, 50 - r.aboveLow) },
  // Value
  { slug: 'lowest-pe', group: 'Value', title: 'Lowest price-to-earnings (P/E) large companies', short: 'Lowest P/E', needs: 'prices', value: (r) => r.pe, asc: true, keep: (r) => r.sales >= HUGE && r.pe >= 3, show: [C.pe, C.price, C.eps, C.score],
    rule: 'Ranked by P/E: share price ÷ latest yearly earnings per share (lowest first). Profitable companies with yearly sales of $10 billion or more; P/Es under 3 left out as usually one-off.',
    why: 'A low P/E means you pay less for each $1 of profit. It can mean good value, or that investors expect profits to fall.', barLabel: (r) => r.pe.toFixed(1), barValue: (r, max) => max - r.pe + 1 },
  { slug: 'highest-dividend-yield', group: 'Value', title: 'Highest dividend yields among large companies', short: 'Highest yields', needs: 'prices', value: (r) => r.divYield, keep: (r) => r.sales >= BIG && r.divYield > 0 && r.spareCash > 0, show: [C.yield, C.cash, C.debt, C.score],
    rule: 'Ranked by dividend yield: yearly dividend per share ÷ share price. Companies with yearly sales of $5 billion or more and positive spare cash.',
    why: 'Yield is the income you get for each $1 invested. A very high yield can be a warning that the dividend may be cut.', barLabel: (r) => pctPlain(r.divYield, 2) },
  // Mixed
  { slug: 'quality-growers', group: 'Mixed lists', title: 'Quality growers: growing fast and very profitable', short: 'Quality growers', needs: '', value: (r) => r.salesGrowth, keep: (r) => r.salesGrowth >= 10 && r.margin >= 15 && (r.score ?? 0) >= 60, show: [C.growth, C.margin, C.score, C.sales],
    rule: 'Sales growing 10% or more a year, profit margin of 15% or more, and a report-card score of 60 or more. Ranked by sales growth.',
    why: 'Growth and high margins together are rare: such companies grow without sacrificing profit.', barLabel: (r) => pct(r.salesGrowth) },
  { slug: 'growth-at-a-fair-price', group: 'Mixed lists', title: 'Growth at a fair price', short: 'Growth at a fair price', needs: 'prices', value: (r) => (r.pe && r.epsGrowth > 5 ? r.pe / r.epsGrowth : null), asc: true, keep: (r) => r.sales >= BIG && r.pe > 0 && r.pe < 40, show: [C.pe, C.eps, C.margin, C.score],
    rule: 'Ranked by P/E ÷ yearly earnings growth (the “PEG” ratio, lowest first). Companies with sales of $5 billion or more, earnings growing over 5% a year and a P/E under 40.',
    why: 'Mixes price and growth: a company growing fast with a modest P/E may be better value than a slow grower that looks cheap.', barLabel: (r) => `PEG ${(r.pe / r.epsGrowth).toFixed(2)}`, barValue: (r, max) => max - r.pe / r.epsGrowth + 0.2 },
  { slug: 'strong-companies-near-low', group: 'Mixed lists', title: 'Strong companies near their 52-week low', short: 'Strong but near low', needs: 'history', value: (r) => r.aboveLow, asc: true, keep: (r) => (r.score ?? 0) >= 70 && r.sales >= BIG, show: [C.aboveLow, C.score, C.y1, C.margin],
    rule: 'Report-card score of 70 or more and yearly sales of $5 billion or more, ranked by how close the share price is to its 52-week low.',
    why: 'Healthy businesses whose shares are out of favour. Worth learning why the price fell before deciding anything.', barLabel: (r) => (r.aboveLow < 0.05 ? 'At low' : `${r.aboveLow.toFixed(1)}% above low`), barValue: (r) => Math.max(1, 50 - r.aboveLow) },
  { slug: 'strong-and-rising', group: 'Mixed lists', title: 'Strong finances and rising shares', short: 'Strong and rising', needs: 'history', value: (r) => r.ret1y, keep: (r) => (r.score ?? 0) >= 70 && r.ret1y > 0, show: [C.y1, C.score, C.growth, C.fromHigh],
    rule: 'Report-card score of 70 or more and a share price up over the past year. Ranked by 1-year return.',
    why: 'Shares that are rising and backed by healthy accounts, rather than by excitement alone.', barLabel: (r) => pct(r.ret1y) },
  { slug: 'dividend-growers-with-cash', group: 'Mixed lists', title: 'Dividend raisers with plenty of spare cash', short: 'Dividend raisers', needs: '', value: (r) => (r.dividend > 0 ? r.divYears * 1000 + Math.min(r.spareCash || 0, 9.99e11) / 1e9 : null), keep: (r) => r.divYears >= 5 && r.spareCash > 0 && (r.debtYears === null || r.debtYears <= 4), show: [['Dividend raises', (r) => `${r.divYears}${r.divYears >= 15 ? '+' : ''} years`], C.cash, C.debt, C.yield],
    rule: 'Dividend raised 5+ years in a row, positive spare cash and debt repayable within 4 years of operating cash. Ranked by years of raises, then spare cash.',
    why: 'A dividend is safest when spare cash covers it and debt is low.', barLabel: (r) => `${r.divYears} yrs`, barValue: (r) => r.divYears },
];

const sorter = (l) => l.sortBy || ((a, b) => (l.asc ? l.value(a) - l.value(b) : l.value(b) - l.value(a)));

export async function buildStockList(slug) {
  const l = STOCK_LISTS.find((x) => x.slug === slug);
  if (!l) return null;
  const facts = await stockFacts();
  const ready = l.needs === 'history' ? facts.withHistory >= 30 : l.needs === 'prices' ? !!facts.pricesAsOf : true;
  const rows = ready ? facts.rows.filter((r) => { const v = l.value(r); return v !== null && v !== undefined && Number.isFinite(v) && (!l.keep || l.keep(r)); }).sort(sorter(l)).slice(0, 10) : [];
  return { list: l, rows, ready, facts };
}

/** For the Top 10 page and sitemap: which lists have data, with their number 1. */
export async function stockListSummaries() {
  const out = [];
  for (const l of STOCK_LISTS) {
    const b = await buildStockList(l.slug).catch(() => null);
    if (b?.ready && b.rows.length >= 3) out.push({ slug: l.slug, group: l.group, title: l.title, short: l.short, rule: l.rule, first: b.rows[0], firstLabel: l.barLabel(b.rows[0]) });
  }
  return out;
}
