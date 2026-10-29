/* ════════════════════════════════════════════════════════════════════════
   SHARIAH CHECKS — each company against five published standards
   ───────────────────────────────────────────────────────────────────────
   1. Business: main SEC industry code (and a short list of well-known
      cases) → is the company in an area that standard rules out?
   2. Money tests: debt, cash and (for MSCI / FTSE) receivables, compared
      with company value (AAOIFI, Dow Jones, S&P) or total assets (MSCI,
      FTSE); interest income compared with total income.
   Company value = latest price × shares. The providers use a 24- or
   36-month average, so a big price move can make our answer differ.
   Overseas companies' US shares are often ADRs (one ADR ≠ one share), so
   for them only the total-assets standards (MSCI, FTSE) are checked.
   Results: 'pass' | 'fail' | 'out' (ruled-out business) | 'na' (figures
   missing or prices not on yet). Shared by /shariah, the screener and
   company pages. Cached for 30 minutes.
   ════════════════════════════════════════════════════════════════════════ */

import { BUSINESS_OVERRIDES, METHODS, SHARIAH_FUNDS, SHARIAH_MARKETS, businessFromSic } from '../data/shariahData.js';
import { WORLD_REGIONS, worldTickerInfo } from '../data/worldStocks.js';
import { readCompanies, readPrices } from './dataEngine.js';
import { readExtraCompanies } from './companyLookup.js';
import { sectorOf } from '../data/sectorLeaders.js';

let memo = null;
const r1 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);

function businessOf(c) {
  return BUSINESS_OVERRIDES[c.ticker] || businessFromSic(c.sic) || null;
}

/** All the ratios one company needs (as %; null when a figure is missing). */
function ratiosOf(c, price) {
  const sh = c.shariah || null;
  if (!sh) return { ready: false };
  const debt = sh.debtIsTotal ? (c.longTermDebt ?? null)
    : [c.longTermDebt, sh.shortBorrowing, sh.debtCurrent].some((v) => Number.isFinite(v)) ? (c.longTermDebt || 0) + (sh.shortBorrowing || 0) + (sh.debtCurrent || 0) : null;
  const cashLike = Number.isFinite(c.cash) || Number.isFinite(sh.shortInvestments) ? (c.cash || 0) + (sh.shortInvestments || 0) : null;
  const mcap = !c.foreignFiler && price && c.sharesOutstanding ? price * c.sharesOutstanding : null;
  const assets = c.totalAssets || null;
  const revenue = c.revenue?.at(-1)?.value || null;
  const pct = (a, b) => (Number.isFinite(a) && b > 0 ? (a / b) * 100 : null);
  return {
    ready: true,
    foreign: Boolean(c.foreignFiler),
    mcap,
    debt, cashLike, receivables: sh.receivables ?? null, assets,
    debtMcap: pct(debt, mcap), cashMcap: pct(cashLike, mcap),
    debtAssets: pct(debt, assets), cashAssets: pct(cashLike, assets),
    recvAssets: Number.isFinite(sh.receivables) && cashLike !== null ? pct(sh.receivables + cashLike, assets) : null,
    // Interest earned as a share of income: the part of the dividend some scholars ask investors to give to charity
    income: Number.isFinite(sh.interestIncome) && revenue ? pct(sh.interestIncome, revenue + Math.max(0, sh.interestIncome)) : null,
    incomeKnown: Number.isFinite(sh.interestIncome),
  };
}

function judge(method, business, x) {
  if (business && method.excludes.includes(business)) return { result: 'out', reason: business, checks: [] };
  if (!x.ready) return { result: 'na', reason: 'figures', checks: [] };
  const value = (key) => {
    if (key === 'debt') return method.base === 'mcap' ? x.debtMcap : x.debtAssets;
    if (key === 'cash') return method.base === 'mcap' ? x.cashMcap : x.cashAssets;
    if (key === 'recv') return x.recvAssets;
    if (key === 'income') return x.incomeKnown ? (x.income ?? 0) : null;
    return null;
  };
  const checks = method.tests.map((t) => {
    const v = value(t.key);
    return { key: t.key, value: r1(v), max: t.max, ok: v === null ? null : v < t.max };
  });
  if (checks.some((k) => k.ok === false)) return { result: 'fail', reason: checks.find((k) => k.ok === false).key, checks };
  // Interest income missing: many companies report none, so it doesn't block a pass on its own
  const needed = checks.filter((k) => k.key !== 'income');
  if (needed.some((k) => k.ok === null)) return { result: 'na', reason: method.base === 'mcap' && !x.mcap ? (x.foreign ? 'adr' : 'price') : 'figures', checks };
  return { result: 'pass', reason: null, checks };
}

function marketOf(c, world) {
  const region = world[c.ticker]?.region;
  for (const m of SHARIAH_MARKETS) if (m.regions?.includes(region)) return m.id;
  // Companies based in Ireland or the UK that file like US companies (e.g. Medtronic, Accenture)
  for (const m of SHARIAH_MARKETS) if (!region && m.countries?.includes(c.country)) return m.id;
  if (!region && !c.foreignFiler) return 'us';
  return null;
}

/** Every covered company with its result under each standard. */
export async function shariahTable() {
  if (memo && Date.now() - memo.at < 30 * 60 * 1000) return memo.data;
  const [{ companies }, extra, prices] = await Promise.all([readCompanies(), readExtraCompanies(), readPrices()]);
  const world = worldTickerInfo();
  const heldBy = await fundHoldersIndex();
  const rows = [];
  for (const c of Object.values({ ...(extra || {}), ...(companies || {}) })) {
    if (!c?.ticker || !c.revenue?.length) continue;
    const market = marketOf(c, world);
    if (!market) continue;
    const price = prices.prices?.[c.ticker]?.price || null;
    const business = businessOf(c);
    const x = ratiosOf(c, price);
    const results = Object.fromEntries(METHODS.map((m) => [m.id, judge(m, business, x)]));
    rows.push({
      ticker: c.ticker,
      name: String(c.displayName || c.name || c.ticker).replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/u, ''),
      market,
      sector: sectorOf(c.ticker)?.name || world[c.ticker]?.sector || c.industry || 'Other',
      industry: c.industry || '',
      business,
      foreign: Boolean(c.foreignFiler),
      ratios: { debtMcap: r1(x.debtMcap), cashMcap: r1(x.cashMcap), debtAssets: r1(x.debtAssets), cashAssets: r1(x.cashAssets), recvAssets: r1(x.recvAssets), income: r1(x.income) },
      purify: x.incomeKnown ? r1(x.income) : null,
      results,
      passes: METHODS.filter((m) => results[m.id].result === 'pass').map((m) => m.id),
      heldBy: heldBy[c.ticker] || [],
      asOf: c.balanceSheetAsOf || null,
    });
  }
  rows.sort((a, b) => b.passes.length - a.passes.length || b.heldBy.length - a.heldBy.length || a.name.localeCompare(b.name));
  const pricesOn = Object.keys(prices.prices || {}).length > 0;
  const data = { rows, pricesOn, updatedAt: new Date().toISOString() };
  memo = { at: Date.now(), data };
  return data;
}

/** { TICKER: ['SPUS', 'HLAL', ...] } from the Shariah funds' SEC holdings reports. */
async function fundHoldersIndex() {
  const { readEtf } = await import('./etfService.js');
  const out = {};
  for (const f of SHARIAH_FUNDS.filter((x) => x.sec && x.market !== 'sukuk')) {
    const d = await readEtf(f.ticker).catch(() => null);
    for (const h of d?.top || []) if (h.ticker) (out[String(h.ticker).toUpperCase()] = out[String(h.ticker).toUpperCase()] || []).push(f.ticker);
    for (const [key] of d?.all || []) {
      const t = String(key || '').toUpperCase();
      if (/^[A-Z][A-Z0-9.-]{0,9}$/u.test(t) && !(out[t] || []).includes(f.ticker)) (out[t] = out[t] || []).push(f.ticker);
    }
  }
  return out;
}

/** Holdings summary for each US-registered Shariah fund (from SEC reports). */
export async function shariahFundsData() {
  const { readEtf } = await import('./etfService.js');
  const out = {};
  for (const f of SHARIAH_FUNDS.filter((x) => x.sec)) {
    const d = await readEtf(f.ticker).catch(() => null);
    if (!d?.count) { out[f.ticker] = null; continue; }
    out[f.ticker] = { count: d.count, asOf: d.asOf, netAssets: d.netAssets, top: (d.top || []).slice(0, 5).map((h) => ({ name: h.name, ticker: h.ticker, pct: h.pct })), countries: d.countries || [] };
  }
  return out;
}

/** One company's results, for its stock page. */
export async function shariahFor(ticker) {
  const { rows } = await shariahTable();
  return rows.find((r) => r.ticker === ticker) || null;
}

export function clearShariahCache() { memo = null; }
export { METHODS, SHARIAH_MARKETS, WORLD_REGIONS };
