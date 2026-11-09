/* ════════════════════════════════════════════════════════════════════════
   DATA QUALITY: one place that decides whether a figure may be published.
   Every figure is checked before it reaches a page:
     missing        no value, or not a number            → not shown
     inconsistent   outside the range it can really be    → not shown
                    (e.g. inflation of 400%), or a share
                    price that jumped more than 60% in a day
     stale          older than its source's normal update → shown WITH its
                    period and a clear "not updated" note, never as current
     ok
   It also tells pages:
     • the reporting period of each economic figure ("August 2026") and
       when we retrieved it, so a monthly figure is never mistaken for live
     • whether the last download from a provider failed, so the page can
       say so instead of quietly showing old numbers
   Admin → Health and the daily health email list every problem found
   (qualityReport). To change a rule, edit RULES below.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const DAY = 86400000;
const marketDir = path.join(process.cwd(), 'data', 'market');

/* How often each economy figure is published, how old it may get before
   it counts as out of date, and the range it can really take. */
export const RULES = {
  inflation: { freq: 'monthly', maxAgeDays: 80, min: -5, max: 30, source: 'US Bureau of Labor Statistics' },
  interestRate: { freq: 'monthly', maxAgeDays: 80, min: 0, max: 25, source: 'Federal Reserve (via New York Fed)' },
  mortgageRate: { freq: 'weekly', maxAgeDays: 21, min: 0, max: 20, source: 'Freddie Mac' },
  tenYearYield: { freq: 'daily', maxAgeDays: 10, min: -1, max: 20, source: 'US Treasury' },
  unemployment: { freq: 'monthly', maxAgeDays: 80, min: 0, max: 30, source: 'US Bureau of Labor Statistics' },
};
const DEFAULT_RULE = { freq: 'monthly', maxAgeDays: 120, min: -100, max: 1000, source: '' };

/* Which download job feeds which kind of data, and who provides it */
export const PROVIDERS = {
  economy: { job: 'economy', name: 'the government statistics services', kind: 'periodic' },
  prices: { job: 'prices', name: 'Marketstack', kind: 'live' },
  companies: { job: 'companies', name: 'the SEC', kind: 'periodic' },
  funds: { job: 'funds', name: 'the SEC (13F fund reports)', kind: 'periodic' },
  property: { job: 'property', name: 'the property data sources', kind: 'periodic' },
};

const monthName = (d) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayName = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "August 2026", "week to 30 October 2026" or "30 October 2026" */
export function periodLabel(asOf, freq = 'monthly') {
  const d = new Date(asOf);
  if (Number.isNaN(d.getTime())) return '';
  if (freq === 'monthly') return monthName(d);
  if (freq === 'weekly') return `week to ${dayName(d)}`;
  return dayName(d);
}

/** Check one economy figure. Returns { status, reason, period, freq, retrieved } */
export function checkEconomyFigure(fig, retrievedAt) {
  const r = RULES[fig?.key] || DEFAULT_RULE;
  const base = { freq: r.freq, source: r.source, period: fig?.asOf ? periodLabel(fig.asOf, r.freq) : '', retrieved: retrievedAt ? dayName(new Date(retrievedAt)) : '' };
  if (!fig || fig.value === null || fig.value === undefined || !Number.isFinite(Number(fig.value))) return { ...base, status: 'missing', reason: 'No value was received' };
  const v = Number(fig.value);
  if (v < r.min || v > r.max) return { ...base, status: 'inconsistent', reason: `${v}${fig.unit || ''} is outside the possible range (${r.min} to ${r.max}); held back` };
  if (fig.previous !== null && fig.previous !== undefined && Number.isFinite(Number(fig.previous)) && Math.abs(v - Number(fig.previous)) > Math.max(5, Math.abs(Number(fig.previous)) * 2)) {
    return { ...base, status: 'inconsistent', reason: `jumped from ${fig.previous} to ${v} in one period; held back until checked` };
  }
  const age = fig.asOf ? (Date.now() - new Date(fig.asOf).getTime()) / DAY : null;
  if (age === null) return { ...base, status: 'stale', reason: 'No reporting date was given' };
  // Monthly figures are dated the 1st of the month they describe and published weeks later
  if (age > r.maxAgeDays) return { ...base, status: 'stale', reason: `the latest figure we have is for ${base.period}, older than usual for a ${r.freq} figure` };
  return { ...base, status: 'ok', reason: '' };
}

/** Check a closing share price. */
export function checkPrice(p) {
  if (!p || !Number.isFinite(Number(p.price)) || Number(p.price) <= 0) return { status: 'missing', reason: 'No price' };
  const age = p.date ? (Date.now() - new Date(p.date).getTime()) / DAY : null;
  if (age === null) return { status: 'stale', reason: 'No date on the price' };
  if (age > 5) return { status: 'stale', reason: `last close is from ${dayName(new Date(p.date))}` };
  return { status: 'ok', reason: '' };
}

/** Check a company's accounts: missing sales, or accounts more than two years old. */
export function checkCompany(c) {
  if (!c?.revenue?.length) return { status: 'missing', reason: 'No sales figures in its filings' };
  const lastYear = Number(String(c.revenue.at(-1)?.year || c.revenue.at(-1)?.end || '').slice(0, 4));
  if (lastYear && lastYear < new Date().getFullYear() - 2) return { status: 'stale', reason: `latest accounts are for ${lastYear}` };
  return { status: 'ok', reason: '' };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

/** Did the last download from this provider fail? Returns a sentence for the page, or ''. */
export async function providerNotice(name) {
  const p = PROVIDERS[name];
  if (!p) return '';
  const jobs = await readJson(path.join(marketDir, 'jobs.json'), {});
  const j = jobs[p.job];
  if (!j || j.lastResult !== 'failed') return '';
  const last = j.lastSuccessAt ? dayName(new Date(j.lastSuccessAt)) : '';
  return `We couldn’t get new figures from ${p.name} on our last try (${dayName(new Date(j.lastRunAt))}). ${last ? `The figures below were retrieved on ${last}; each one shows the period it covers.` : 'Figures are shown only where we have them.'}`;
}

/* Economy figures as pages should use them: inconsistent or missing ones
   are removed (listed in `held`), every other one carries `quality`. */
export function screenEconomy(economy) {
  const figures = {}; const held = [];
  for (const [k, f] of Object.entries(economy?.figures || {})) {
    const q = checkEconomyFigure({ ...f, key: f.key || k }, economy.updatedAt);
    if (q.status === 'missing' || q.status === 'inconsistent') { held.push({ key: k, label: f.label, ...q }); continue; }
    figures[k] = { ...f, quality: q };
  }
  return { ...economy, figures, held };
}

/** Everything that is missing, stale or inconsistent, for Admin → Health. */
export async function qualityReport() {
  const issues = [];
  const add = (area, item, q) => issues.push({ area, item, status: q.status, reason: q.reason });
  const economy = await readJson(path.join(marketDir, 'economy.json'), { figures: {} });
  for (const [k, f] of Object.entries(economy.figures || {})) {
    const q = checkEconomyFigure({ ...f, key: f.key || k }, economy.updatedAt);
    if (q.status !== 'ok') add('Economy', f.label || k, q);
  }
  for (const key of Object.keys(RULES)) if (!economy.figures?.[key]) add('Economy', key, { status: 'missing', reason: 'never downloaded' });
  const prices = await readJson(path.join(marketDir, 'prices.json'), { prices: {} });
  const ps = Object.entries(prices.prices || {}).map(([t, p]) => [t, checkPrice(p)]);
  const stalePrices = ps.filter(([, q]) => q.status !== 'ok');
  if (stalePrices.length) issues.push({ area: 'Prices', item: `${stalePrices.length} of ${ps.length} companies`, status: 'stale', reason: `e.g. ${stalePrices.slice(0, 5).map(([t, q]) => `${t}: ${q.reason}`).join('; ')}` });
  const companies = await readJson(path.join(marketDir, 'companies.json'), { companies: {} });
  const cs = Object.values(companies.companies || {}).map((c) => [c.ticker, checkCompany(c)]).filter(([, q]) => q.status !== 'ok');
  if (cs.length) issues.push({ area: 'Company accounts', item: `${cs.length} companies`, status: cs.some(([, q]) => q.status === 'missing') ? 'missing' : 'stale', reason: cs.slice(0, 6).map(([t, q]) => `${t}: ${q.reason}`).join('; ') });
  const jobs = await readJson(path.join(marketDir, 'jobs.json'), {});
  for (const [name, p] of Object.entries(PROVIDERS)) {
    const j = jobs[p.job];
    if (j?.lastResult === 'failed') issues.push({ area: 'Provider', item: p.name, status: 'failed', reason: String(j.lastMessage || '').slice(0, 200) });
    void name;
  }
  return { checkedAt: new Date().toISOString(), ok: issues.length === 0, issues };
}
