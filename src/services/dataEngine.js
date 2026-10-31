/* ════════════════════════════════════════════════════════════════════════
   DATA ENGINE — fetches market data on a schedule, saves it to the volume
   ───────────────────────────────────────────────────────────────────────
   Jobs (all automatic once the server is running):
     economy    daily    BLS, NY Fed, Treasury, Freddie Mac: inflation, rates, jobs, mortgages
     companies  weekly   SEC: yearly financials for every company in
                         src/data/stockUniverse.js
     funds      weekly   SEC 13F: what ~20 big funds hold (members' section)
     learning   6 hours  rotates homepage explainers every 2 days and
                         writes new ones (checked first, see qualityService)
     health     daily    site health check, emailed if a Resend key is saved
     property   weekly   BIS, OECD, BLS, HM Land Registry: home prices and rents
     commodities weekly  World Bank monthly prices (gold, oil, copper, coffee…)
     bonds      weekly   US Treasury yield curve + OECD 10-year/3-month rates
     etfs       weekly   SEC N-PORT holdings for the ETFs with their own page
     results    hourly   SEC: new company results (8-K item 2.02), explained simply
     news       12 hours GDELT headlines for every stock/ETF/commodity/bond/property
                         page + a short "What the headlines say" summary
     prices     daily    Marketstack end-of-day prices — ONLY on the paid
                         Basic plan (free plan is non-commercial). Turns on
                         by itself once MARKETSTACK_MONTHLY_LIMIT is 10000.

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
  economy: { label: 'Economy numbers (BLS, NY Fed, Treasury, Freddie Mac)', every: 20 * HOUR },
  companies: { label: 'Company financials (SEC)', every: 7 * 24 * HOUR },
  prices: { label: 'End-of-day prices (Marketstack)', every: 20 * HOUR },
  top10: { label: 'Top 10 lists (rebuilt monthly)', every: 20 * HOUR },
  photos: { label: 'Photos for explainers (Pexels)', every: 20 * HOUR },
  funds: { label: 'Big-fund holdings (SEC 13F)', every: 7 * 24 * HOUR },
  learning: { label: 'Homepage explainers (autopilot)', every: 6 * HOUR },
  deeper: { label: 'Lords lessons for Premium (one every 2 days)', every: 2 * 24 * HOUR },
  report: { label: 'Monthly research report (built on the 1st)', every: 20 * HOUR },
  health: { label: 'Daily health check + email', every: 24 * HOUR },
  property: { label: 'Property prices and rents (BIS, OECD, BLS, Land Registry)', every: 7 * 24 * HOUR },
  commodities: { label: 'Commodity prices (World Bank)', every: 7 * 24 * HOUR },
  bonds: { label: 'Government bond yields (US Treasury daily, OECD monthly)', every: 24 * HOUR },
  etfs: { label: 'ETF holdings (SEC N-PORT)', every: 7 * 24 * HOUR },
  news: { label: 'In the news: headlines for each page (GDELT)', every: 12 * HOUR },
  results: { label: 'Company results (SEC filings, checked hourly)', every: 1 * HOUR },
  newsletter: { label: 'Newsletter: carries on a big send (daily limit)', every: 1 * HOUR },
  alerts: { label: 'Member emails: dividend + big-fund alerts, Saturday weekly email', every: 1 * HOUR },
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
// Marketstack's FREE plan is "Non-Commercial Use" (checked 17 Oct 2026), so
// prices are only shown once the paid Basic plan is on
// (MARKETSTACK_MONTHLY_LIMIT >= 1000). Until then pages rank by sales /
// years of dividend raises and show TradingView's price widgets instead.
export const readPrices = async () => (isPaidPriceTier()
  ? readJson(FILES.prices, { updatedAt: null, prices: {} })
  : { updatedAt: null, prices: {} });

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
    // Our companies plus any other company members hold or watch
    // (for the Portfolio health check and watchlists)
    let extra = [];
    try {
      const { readStore } = await import('./storeService.js');
      const store = await readStore();
      extra = (store.users || []).flatMap((u) => [...(u.portfolio || []).map((h) => h.ticker), ...(u.watchlist || [])])
        .map((t) => String(t || '').toUpperCase().trim()).filter((t) => /^[A-Z.-]{1,6}$/u.test(t));
    } catch { /* store not readable: universe only */ }
    return [...new Set([...getUniverse(), ...extra])].slice(0, 300); // 300 a day fits the Basic plan (10,000 a month)
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
  if (!isPaidPriceTier()) {
    return { ok: false, skipped: true, message: 'Off — Marketstack\'s free plan is for non-commercial use only. Prices switch on with the Basic plan ($9.99/mo) + MARKETSTACK_MONTHLY_LIMIT=10000' };
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
    const result = await getLatestPrices(symbols, { fresh: true });
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
  // Keep a short daily history so the Premium newsletter can show the week's change
  try {
    const { savePriceSnapshot } = await import('./premiumWeekService.js');
    await savePriceSnapshot(prices);
  } catch (error) {
    console.error('[data] Could not save the price history:', error.message);
  }
  // If this month's dividend list had to be ranked without prices, rebuild it now.
  try {
    const saved = await readJson(path.join(marketDir, 'top10.json'), {});
    if (saved.dividends?.rankedBy === 'years') {
      const { rebuildTop10 } = await import('./top10Service.js');
      await rebuildTop10({ force: true });
    }
  } catch (error) {
    console.error('[data] Could not refresh the Top 10 list after prices:', error.message);
  }
  const quota = getQuotaStatus();
  return { ok: true, message: `${fetched} of ${tickers.length} prices updated (Marketstack ${quota.used}/${quota.limit} used this month)` };
}

async function runTop10({ manual = false } = {}) {
  const { rebuildTop10 } = await import('./top10Service.js');
  return rebuildTop10({ force: manual });
}

async function runPhotos() {
  const { attachMissingArticlePhotos } = await import('./imageService.js');
  return attachMissingArticlePhotos();
}

async function runFunds() {
  const { refreshFunds } = await import('./fundsService.js');
  return refreshFunds();
}

async function runLearning() {
  const { runLearningAutopilot } = await import('./articleService.js');
  return runLearningAutopilot();
}

async function runReport() {
  const { runReports } = await import('./reportService.js');
  return runReports();
}

async function runNewsletter() {
  const { continueSending } = await import('./newsletterService.js');
  return continueSending();
}

async function runDeeper() {
  const { writeDeeperExplainer } = await import('./articleService.js');
  return writeDeeperExplainer();
}

async function runHealth() {
  const { getHealthReport, sendHealthEmail } = await import('./healthService.js');
  const report = await getHealthReport();
  const problems = report.checks.filter((c) => c.status === 'fail').map((c) => c.label);
  if (problems.length) console.warn(`[health] Problems: ${problems.join(', ')}`);
  const sent = await sendHealthEmail({ report });
  // The check itself counts as done even when no email key is saved.
  return { ok: !sent.skipped ? sent.ok : true, message: `${report.summary.ok} OK, ${report.summary.warn} to check, ${report.summary.fail} problems. ${sent.message}` };
}

async function runProperty() {
  const { refreshProperty } = await import('./propertyService.js');
  return refreshProperty();
}

async function runCommodities() {
  const { refreshCommodities } = await import('./commodityService.js');
  return refreshCommodities();
}

async function runBonds() {
  const { refreshBonds } = await import('./bondService.js');
  return refreshBonds();
}

async function runEtfs() {
  const { refreshEtfs } = await import('./etfService.js');
  return refreshEtfs();
}

async function runNews() {
  const { refreshAllNews } = await import('./newsLinksService.js');
  return refreshAllNews();
}

async function runResults() {
  const { checkResults } = await import('./resultsService.js');
  return checkResults();
}

async function runAlertsJob() {
  const { runAlerts } = await import('./alertsService.js');
  return runAlerts();
}

const RUNNERS = { newsletter: runNewsletter, report: runReport, deeper: runDeeper, alerts: runAlertsJob, results: runResults, news: runNews, commodities: runCommodities, bonds: runBonds, etfs: runEtfs, property: runProperty, economy: runEconomy, companies: runCompanies, prices: runPrices, top10: runTop10, photos: runPhotos, funds: runFunds, learning: runLearning, health: runHealth };

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
      // The news job takes about an hour (the news index allows one search
      // every few seconds), so it runs alongside the others instead of
      // holding them up.
      if (name === 'news') { runJob(name).catch(() => {}); continue; }
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
