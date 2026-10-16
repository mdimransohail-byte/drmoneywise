/* ════════════════════════════════════════════════════════════════════════
   DATA ENGINE — fetches market data on a schedule, saves it to the volume
   ───────────────────────────────────────────────────────────────────────
   Jobs (all automatic once the server is running):
     economy    daily    FRED: inflation, interest rates, jobs, mortgages
     companies  weekly   SEC: yearly financials for every company in
                         src/data/stockUniverse.js
     prices     daily    Marketstack end-of-day prices. On the FREE plan
                         (100 calls/month) this only runs when you press
                         "Run now" in Admin, for the dividend shortlist —
                         it switches to daily automatically once
                         MARKETSTACK_MONTHLY_LIMIT is 10000 (paid Basic).

   Saved files (Railway volume, survive redeploys):
     data/market/economy.json, companies.json, prices.json, jobs.json

   Every job logs "[data] …" lines in Railway so you can see what happened.
   If a job fails, the last good data is kept and the pages keep working.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { getUniverse, toPriceSymbol } from '../data/stockUniverse.js';
import { fetchCompanies } from './secService.js';
import { fetchEconomy } from './economyService.js';
import { getLatestPrices, getQuotaStatus } from './marketstackClient.js';

const marketDir = path.join(process.cwd(), 'data', 'market');
const FILES = {
  economy: path.join(marketDir, 'economy.json'),
  companies: path.join(marketDir, 'companies.json'),
  prices: path.join(marketDir, 'prices.json'),
  jobs: path.join(marketDir, 'jobs.json'),
};

const HOUR = 60 * 60 * 1000;
const JOBS = {
  economy: { label: 'Economy numbers (FRED)', every: 20 * HOUR },
  companies: { label: 'Company financials (SEC)', every: 7 * 24 * HOUR },
  prices: { label: 'End-of-day prices (Marketstack)', every: 20 * HOUR },
};
const CHECK_EVERY_MS = 15 * 60 * 1000;
const FIRST_CHECK_AFTER_MS = 60 * 1000;

const running = new Set();

/* ── File helpers ───────────────────────────────────────────────────── */
async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(marketDir, { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fs.rename(tmp, file);
}

export const readEconomy = () => readJson(FILES.economy, { updatedAt: null, figures: {} });
export const readCompanies = () => readJson(FILES.companies, { updatedAt: null, companies: {} });
export const readPrices = () => readJson(FILES.prices, { updatedAt: null, prices: {} });

async function readJobs() {
  return readJson(FILES.jobs, {});
}

async function recordJob(name, result) {
  const jobs = await readJobs();
  const previous = jobs[name] || {};
  jobs[name] = {
    ...previous,
    lastRunAt: new Date().toISOString(),
    lastResult: result.ok ? 'ok' : result.skipped ? 'skipped' : 'failed',
    lastMessage: result.message,
    ...(result.ok ? { lastSuccessAt: new Date().toISOString() } : {}),
  };
  await writeJson(FILES.jobs, jobs);
}

/* ── Jobs ───────────────────────────────────────────────────────────── */
async function runEconomy() {
  const { economy, failures } = await fetchEconomy();
  const count = Object.keys(economy).length;
  if (!count) {
    return { ok: false, message: `No economy figures could be downloaded (${failures.map((f) => `${f.series}: ${f.reason}`).join('; ')})` };
  }
  const existing = await readEconomy();
  await writeJson(FILES.economy, { updatedAt: new Date().toISOString(), figures: { ...existing.figures, ...economy } });
  return { ok: true, message: `${count} figures updated${failures.length ? `, ${failures.length} failed` : ''}` };
}

async function runCompanies() {
  const universe = getUniverse();
  const { companies, failures } = await fetchCompanies(universe);
  const count = Object.keys(companies).length;
  if (!count) {
    return { ok: false, message: `No companies could be downloaded from the SEC (${failures.slice(0, 3).map((f) => `${f.ticker}: ${f.reason}`).join('; ')})` };
  }
  const existing = await readCompanies();
  await writeJson(FILES.companies, {
    updatedAt: new Date().toISOString(),
    companies: { ...existing.companies, ...companies },
    failures,
  });
  return { ok: true, message: `${count} companies updated${failures.length ? `, ${failures.length} failed (${failures.slice(0, 10).map((f) => f.ticker).join(', ')}${failures.length > 10 ? ', …' : ''})` : ''}` };
}

function isPaidPriceTier() {
  return Number(process.env.MARKETSTACK_MONTHLY_LIMIT || 0) >= 1000;
}

/** Which tickers need prices. On the free plan: only the dividend shortlist. */
async function priceTickers() {
  const { companies } = await readCompanies();
  if (isPaidPriceTier()) {
    return getUniverse();
  }
  return Object.values(companies)
    .filter((company) => (company.derived?.yearsOfDividendRaises || 0) >= 10)
    .sort((a, b) => (b.derived.yearsOfDividendRaises || 0) - (a.derived.yearsOfDividendRaises || 0))
    .slice(0, 40)
    .map((company) => company.ticker);
}

async function runPrices({ manual = false } = {}) {
  if (!process.env.MARKETSTACK_API_KEY) {
    return { ok: false, skipped: true, message: 'Skipped — no Marketstack key saved in Admin' };
  }
  if (!manual && !isPaidPriceTier()) {
    return { ok: false, skipped: true, message: 'Skipped — free Marketstack plan; press "Run now" to fetch the dividend shortlist (about 40 calls)' };
  }
  const tickers = await priceTickers();
  if (!tickers.length) {
    return { ok: false, skipped: true, message: 'Skipped — run "Company financials" first so we know which companies need prices' };
  }

  const existing = await readPrices();
  const prices = { ...existing.prices };
  let fetched = 0;
  let lastError = '';
  for (let i = 0; i < tickers.length; i += 50) {
    const chunk = tickers.slice(i, i + 50);
    const symbols = chunk.map(toPriceSymbol);
    const result = await getLatestPrices(symbols);
    chunk.forEach((ticker, index) => {
      const row = result.prices?.[symbols[index]];
      if (row?.price) {
        prices[ticker] = { price: row.price, date: row.date };
        fetched += 1;
      }
    });
    if (result.source === 'error' || result.source === 'quota-exhausted') {
      lastError = result.error || 'Marketstack quota used up';
      console.error(`[data] Prices: ${lastError}`);
      break;
    }
  }
  if (!fetched) {
    return { ok: false, message: `No prices fetched${lastError ? ` — ${lastError}` : ''}` };
  }
  await writeJson(FILES.prices, { updatedAt: new Date().toISOString(), prices });
  const quota = getQuotaStatus();
  return { ok: true, message: `${fetched} of ${tickers.length} prices updated (Marketstack ${quota.used}/${quota.limit} used this month)` };
}

const RUNNERS = { economy: runEconomy, companies: runCompanies, prices: runPrices };

/** Runs one job now. Used by the scheduler and by Admin → "Run now". */
export async function runJob(name, { manual = false } = {}) {
  if (!RUNNERS[name]) throw new Error(`Unknown data job: ${name}`);
  if (running.has(name)) return { ok: false, message: 'Already running — check back in a few minutes' };
  running.add(name);
  const startedAt = Date.now();
  console.log(`[data] ${JOBS[name].label}: starting${manual ? ' (Run now from Admin)' : ''}`);
  try {
    const result = await RUNNERS[name]({ manual });
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[data] ${JOBS[name].label}: ${result.ok ? 'OK' : result.skipped ? 'SKIPPED' : 'FAILED'} — ${result.message} (${seconds}s)`);
    await recordJob(name, result);
    return result;
  } catch (error) {
    const result = { ok: false, message: error.message };
    console.error(`[data] ${JOBS[name].label}: FAILED — ${error.message}`);
    await recordJob(name, result);
    return result;
  } finally {
    running.delete(name);
  }
}

/** Status for Admin: when each job last ran and how it went. */
export async function getDataStatus() {
  const jobs = await readJobs();
  const [economy, companies, prices] = await Promise.all([readEconomy(), readCompanies(), readPrices()]);
  return {
    jobs: Object.entries(JOBS).map(([name, job]) => ({
      name,
      label: job.label,
      running: running.has(name),
      ...(jobs[name] || {}),
    })),
    counts: {
      economyFigures: Object.keys(economy.figures || {}).length,
      companies: Object.keys(companies.companies || {}).length,
      universe: getUniverse().length,
      prices: Object.keys(prices.prices || {}).length,
    },
    marketstackPlan: isPaidPriceTier() ? 'paid' : 'free',
  };
}

/* ── Scheduler ──────────────────────────────────────────────────────── */
async function checkSchedule() {
  const jobs = await readJobs();
  for (const [name, job] of Object.entries(JOBS)) {
    const lastSuccess = jobs[name]?.lastSuccessAt ? new Date(jobs[name].lastSuccessAt).getTime() : 0;
    const lastRun = jobs[name]?.lastRunAt ? new Date(jobs[name].lastRunAt).getTime() : 0;
    const due = Date.now() - lastSuccess > job.every;
    const notRetriedRecently = Date.now() - lastRun > 2 * HOUR; // after a failure, retry every 2 hours
    if (due && notRetriedRecently && !running.has(name)) {
      await runJob(name);
    }
  }
}

let started = false;
export function startDataEngine() {
  if (started) return;
  started = true;
  console.log('[data] Data engine started — first check in 1 minute, then every 15 minutes.');
  setTimeout(() => {
    checkSchedule().catch((error) => console.error('[data] Scheduler error:', error.message));
    setInterval(() => {
      checkSchedule().catch((error) => console.error('[data] Scheduler error:', error.message));
    }, CHECK_EVERY_MS);
  }, FIRST_CHECK_AFTER_MS);
}
