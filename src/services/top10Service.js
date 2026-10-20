/* ════════════════════════════════════════════════════════════════════════
   TOP 10 LISTS — built by code from the saved data, with the rule shown
   ───────────────────────────────────────────────────────────────────────
   Dividend stocks (rebuilt on the 1st of each month, or "Run now"):
     1. From our company list, keep those whose yearly dividend per share
        went up at least 10 years in a row (SEC filings).
     2. Keep only those paying out less than 90% of their profit as
        dividends (so the payout is covered by earnings).
     3. Rank by dividend yield = last year's dividend ÷ latest price.
     If prices are missing, rank by years of raises instead and say so.

   ETFs: fixed beginner list (src/data/etfList.js), ranked by lowest fee.

   Saved to data/market/top10.json so the list stays the same all month.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { ETF_CHECKED_ON, ETF_LIST, ETF_SOURCE } from '../data/etfList.js';
import { readCompanies, readPrices } from './dataEngine.js';

const FILE = path.join(process.cwd(), 'data', 'market', 'top10.json');
const MIN_RAISES = 10;
const MAX_PAYOUT = 0.9;

export const DIVIDEND_RULE = [
  `Raised its dividend at least ${MIN_RAISES} years in a row (from SEC filings).`,
  'Pays out less than 90% of its profit as dividends, so profits cover the payout.',
  'Ranked by dividend yield: last year’s dividend per share divided by the latest share price.',
];

async function readSaved() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function save(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify(data), 'utf8');
  await fs.rename(`${FILE}.tmp`, FILE);
}

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  const [year, month] = String(key || monthKey()).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function safetyOf(payout) {
  if (payout < 0.6) return { grade: 'good', text: 'Comfortable', plain: `Pays out about ${Math.round(payout * 100)} cents of every $1 of profit.` };
  return { grade: 'okay', text: 'Stretched', plain: `Pays out about ${Math.round(payout * 100)} cents of every $1 of profit, leaving less room.` };
}

async function computeDividendList() {
  const [{ companies, updatedAt }, { prices, updatedAt: pricesAt }] = await Promise.all([readCompanies(), readPrices()]);
  const candidates = Object.values(companies || {}).filter((c) => {
    const d = c.derived || {};
    return !c.foreignFiler && (d.yearsOfDividendRaises || 0) >= MIN_RAISES
      && d.latestDividendPerShare > 0
      && d.payoutRatio !== null && d.payoutRatio > 0 && d.payoutRatio < MAX_PAYOUT;
  });

  const withPrice = candidates
    .map((c) => {
      const price = prices?.[c.ticker]?.price;
      return { c, price, yield: price ? c.derived.latestDividendPerShare / price : null };
    })
    .filter((row) => row.yield);

  const rankedByYield = withPrice.length >= 5;
  const rows = (rankedByYield
    ? withPrice.sort((a, b) => b.yield - a.yield)
    : candidates.map((c) => ({ c, price: prices?.[c.ticker]?.price || null, yield: null }))
      .sort((a, b) => (b.c.derived.yearsOfDividendRaises - a.c.derived.yearsOfDividendRaises) || (a.c.derived.payoutRatio - b.c.derived.payoutRatio)))
    .slice(0, 10)
    .map(({ c, price, yield: y }) => ({
      ticker: c.ticker,
      name: c.displayName || c.name,
      industry: c.industry || '',
      dividendPerShare: c.derived.latestDividendPerShare,
      price,
      priceDate: prices?.[c.ticker]?.date || null,
      yield: y,
      incomePer1000: y ? Math.round(y * 1000) : null,
      years: c.derived.yearsOfDividendRaises,
      yearsAtLeast: Boolean(c.derived.dividendRaisesFullHistory),
      payoutRatio: c.derived.payoutRatio,
      safety: safetyOf(c.derived.payoutRatio),
      cashCovered: c.derived.dividendCoveredByCash,
    }));

  return {
    rows,
    rankedBy: rankedByYield ? 'yield' : 'years',
    candidates: candidates.length,
    dataAsOf: updatedAt,
    pricesAsOf: pricesAt,
  };
}

/** Rebuilds when the month changes (or when forced). Returns { ok, message }. */
export async function rebuildTop10({ force = false } = {}) {
  const saved = await readSaved();
  const key = monthKey();
  if (!force && saved.month === key && saved.dividends?.rows?.length) {
    return { ok: true, skipped: true, message: `Already built for ${monthLabel(key)}` };
  }
  const dividends = await computeDividendList();
  if (!dividends.rows.length) {
    return { ok: false, message: 'No companies qualified yet — run "Company financials" first' };
  }
  await save({ month: key, builtAt: new Date().toISOString(), dividends });
  const note = dividends.rankedBy === 'yield' ? 'ranked by yield' : 'ranked by years of raises (prices missing)';
  console.log(`[top10] Dividend list rebuilt for ${monthLabel(key)}: ${dividends.rows.length} of ${dividends.candidates} qualifying companies, ${note}`);
  return { ok: true, message: `${monthLabel(key)} list: ${dividends.rows.length} companies, ${note}` };
}

export async function getDividendTop10() {
  let saved = await readSaved();
  if (!saved.dividends?.rows?.length) {
    await rebuildTop10({ force: true }).catch(() => {});
    saved = await readSaved();
  }
  return { month: saved.month || monthKey(), builtAt: saved.builtAt || null, ...(saved.dividends || { rows: [] }) };
}

export function getEtfTop10() {
  const rows = [...ETF_LIST]
    .sort((a, b) => a.expenseRatio - b.expenseRatio || a.ticker.localeCompare(b.ticker))
    .map((etf) => ({ ...etf, feePer1000: etf.expenseRatio * 10 }));
  const checked = new Date(ETF_CHECKED_ON);
  const reviewDue = Date.now() - checked.getTime() > 92 * 24 * 60 * 60 * 1000;
  return { rows, checkedOn: ETF_CHECKED_ON, source: ETF_SOURCE, reviewDue };
}
