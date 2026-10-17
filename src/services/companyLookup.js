/* ════════════════════════════════════════════════════════════════════════
   ANY COMPANY ON REQUEST
   ───────────────────────────────────────────────────────────────────────
   The weekly data job covers the sector leaders and dividend payers. Any
   other US-listed company (about 10,000 on the SEC list) gets its page
   built the first time someone looks it up: two free SEC requests (~1–2 s),
   then saved to data/market/companies-extra.json and reused for 7 days.

   Guards: only real SEC tickers, at most 60 new look-ups an hour (stops
   bots from hammering the SEC on our behalf), failures remembered 1 hour.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { readCompanies } from './dataEngine.js';
import { cleanName, fetchOneCompany, getTickerMapCached } from './secService.js';

const EXTRA_FILE = path.join(process.cwd(), 'data', 'market', 'companies-extra.json');
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const HOURLY_LIMIT = 60;

const recentFetches = [];
const failedRecently = new Map(); // ticker -> time
const inFlight = new Map(); // ticker -> promise

async function readExtra() {
  try {
    return JSON.parse(await fs.readFile(EXTRA_FILE, 'utf8'));
  } catch {
    return { companies: {} };
  }
}

async function saveExtra(company) {
  const extra = await readExtra();
  extra.companies[company.ticker] = company;
  await fs.mkdir(path.dirname(EXTRA_FILE), { recursive: true });
  const tmp = `${EXTRA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(extra));
  await fs.rename(tmp, EXTRA_FILE);
}

export async function readExtraCompanies() {
  return (await readExtra()).companies || {};
}

export function normaliseTicker(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\./gu, '-');
}

function underLimit() {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  while (recentFetches.length && recentFetches[0] < hourAgo) recentFetches.shift();
  return recentFetches.length < HOURLY_LIMIT;
}

async function fetchAndSave(ticker, match) {
  recentFetches.push(Date.now());
  console.log(`[lookup] ${ticker}: building page from SEC filings (first visit or older than 7 days)`);
  const company = await fetchOneCompany(ticker, match);
  if (!company.revenue.length && !company.netIncome.length) {
    // e.g. funds, or companies reporting in non-US formats: nothing we can show
    const error = new Error('no standard yearly figures in SEC filings');
    error.status = 404;
    throw error;
  }
  company.onRequest = true;
  await saveExtra(company);
  return company;
}

/**
 * Returns the company summary for any US-listed ticker, or
 * { notFound: true } / { busy: true } when it can't.
 */
export async function getCompany(rawTicker) {
  const ticker = normaliseTicker(rawTicker);
  if (!/^[A-Z0-9-]{1,10}$/u.test(ticker)) return { notFound: true };

  const { companies } = await readCompanies();
  if (companies?.[ticker]) return companies[ticker];

  const extra = await readExtraCompanies();
  const saved = extra[ticker];
  const stale = !saved || Date.now() - new Date(saved.updatedAt).getTime() > FRESH_MS;
  if (saved && !stale) return saved;

  if (failedRecently.has(ticker) && Date.now() - failedRecently.get(ticker) < 60 * 60 * 1000) {
    return saved || { notFound: true };
  }

  let map;
  try {
    map = await getTickerMapCached();
  } catch (error) {
    console.error('[lookup] SEC ticker list unavailable:', error.message);
    return saved || { busy: true };
  }
  const match = map[ticker];
  if (!match) return { notFound: true };

  if (!underLimit()) {
    console.warn(`[lookup] ${ticker}: hourly look-up limit reached (${HOURLY_LIMIT}) — try later`);
    return saved || { busy: true };
  }

  // Old copy? Show it now and refresh quietly in the background.
  if (saved) {
    if (!inFlight.has(ticker)) {
      inFlight.set(ticker, fetchAndSave(ticker, match).catch((e) => console.error(`[lookup] ${ticker}: refresh failed — ${e.message}`)).finally(() => inFlight.delete(ticker)));
    }
    return saved;
  }

  try {
    if (!inFlight.has(ticker)) {
      inFlight.set(ticker, fetchAndSave(ticker, match).finally(() => inFlight.delete(ticker)));
    }
    return await inFlight.get(ticker);
  } catch (error) {
    console.error(`[lookup] ${ticker}: failed — ${error.message}`);
    // SEC said "no such file" (404) → this company has no standard financial data.
    // Anything else (network, SEC busy) → ask the reader to try again shortly.
    if (error.status === 404) {
      failedRecently.set(ticker, Date.now());
      return { notFound: true, reason: 'no-filings', name: cleanName(match.name) };
    }
    return { busy: true };
  }
}

/**
 * Search box: ticker or name → matches from the full SEC list.
 * Returns [{ ticker, name }], best matches first (max `limit`).
 */
export async function searchAllCompanies(query, limit = 20) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 1) return [];
  let map;
  try {
    map = await getTickerMapCached();
  } catch {
    return [];
  }
  const qTicker = normaliseTicker(q);
  const rows = [];
  for (const [ticker, entry] of Object.entries(map)) {
    const name = String(entry.name || '').toLowerCase();
    let score = 0;
    if (ticker === qTicker) score = 100;
    else if (name === q) score = 90;
    else if (name.startsWith(q)) score = 70;
    else if (q.length >= 3 && new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u').test(name)) score = 50;
    else if (q.length >= 2 && ticker.startsWith(qTicker)) score = 30;
    if (score) rows.push({ ticker, name: cleanName(entry.name), score });
  }
  // Prefer the main share class (shorter tickers) when names tie.
  return rows
    .sort((a, b) => b.score - a.score || a.ticker.length - b.ticker.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}
