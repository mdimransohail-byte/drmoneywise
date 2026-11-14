/* ════════════════════════════════════════════════════════════════════════
   MY WATCHLIST and MY PORTFOLIO (/my/watchlist, /my/portfolio)
   What each member sees about their own companies, by plan:
     Free     price, report-card score, latest results
     Regular  + sales growth, profit margin, debt, dividend yield, P/E,
                past-year share price, value and gain of each holding,
                the portfolio's mix by area of the economy
     Premium  + financial-health stars and summary, Shariah status, the
                full portfolio health check (overall score, spread,
                warnings, each holding's checks)
   Locked items come back as null and are listed in `locked`, so the page
   can show what joining would add.
   ════════════════════════════════════════════════════════════════════════ */

import { canAccess } from '../config.js';
import { readCompanies, readPrices } from './dataEngine.js';
import { stockFacts } from './stockTop10.js';
import { resultsFor } from './resultsService.js';
import { financialHealth } from './financialHealthService.js';
import { portfolioHealth, bandFor } from './healthCheckService.js';

const levelOf = (user) => (user?.role === 'admin' ? 'premium' : canAccess(user?.plan || 'free', 'premium') ? 'premium' : canAccess(user?.plan || 'free', 'regular') ? 'regular' : 'free');

async function shariahMap() {
  try {
    const { shariahTable } = await import('./shariahService.js');
    const t = await shariahTable();
    return new Map(t.rows.map((r) => [r.ticker, r]));
  } catch { return new Map(); }
}

/** Facts about each company, cut to what the member's plan includes. */
export async function companyFacts(tickers, user) {
  const level = levelOf(user);
  const regular = level !== 'free'; const premium = level === 'premium';
  const [{ rows }, { companies }, { prices }, sh] = await Promise.all([stockFacts(), readCompanies(), readPrices(), premium ? shariahMap() : new Map()]);
  const byT = new Map(rows.map((r) => [r.ticker, r]));
  const out = [];
  for (const t of [...new Set((tickers || []).map((x) => String(x).toUpperCase()))].slice(0, 60)) {
    const r = byT.get(t) || {}; const c = companies?.[t]; const p = prices?.[t];
    const res = resultsFor(t).sort((a, b) => String(b.filed).localeCompare(String(a.filed)))[0];
    const fh = premium && c ? financialHealth(c) : null;
    const shr = sh.get(t);
    out.push({
      ticker: t,
      name: r.name || c?.displayName || c?.name || t,
      sector: r.sector || '',
      covered: Boolean(c || r.ticker),
      price: p?.price ?? r.price ?? null, priceDate: p?.date ? String(p.date).slice(0, 10) : null,
      score: r.score ?? null, band: bandFor(r.score ?? null),
      result: res ? { headline: res.headline, simple: res.simple, filed: res.filed, id: res.id } : null,
      salesGrowth: regular ? r.salesGrowth ?? null : null,
      margin: regular ? r.margin ?? null : null,
      debtYears: regular ? r.debtYears ?? null : null,
      divYield: regular ? r.divYield ?? null : null,
      pe: regular ? r.pe ?? null : null,
      ret1y: regular ? r.ret1y ?? null : null,
      fromHigh: regular ? r.fromHigh ?? null : null,
      health: fh ? { stars: fh.stars, band: fh.band?.label, colour: fh.band?.colour, headline: fh.headline } : null,
      shariah: premium && shr ? { passes: Object.values(shr.results).filter((x) => x.result === 'pass').length, of: Object.keys(shr.results).length, aaoifi: shr.results.aaoifi?.result || null } : null,
    });
  }
  return { level, companies: out, locked: level === 'premium' ? [] : level === 'regular' ? ['premium'] : ['regular', 'premium'] };
}

export async function myWatchlist(user) {
  return companyFacts(user?.watchlist || [], user);
}

export async function myPortfolio(user) {
  const holdings = user?.portfolio || [];
  const level = levelOf(user);
  const facts = await companyFacts(holdings.map((h) => h.ticker), user);
  if (!holdings.length) return { ...facts, holdings: [], totals: null, health: null };
  const ph = await portfolioHealth(holdings);
  const regular = level !== 'free'; const premium = level === 'premium';
  const rows = ph.rows.map((r) => ({
    ticker: r.ticker, shares: r.shares ?? null, buyPrice: r.buyPrice ?? null, price: r.price ?? null, priceDate: r.priceDate ? String(r.priceDate).slice(0, 10) : null,
    value: r.value ?? null, cost: r.cost ?? null, gain: r.value && r.cost ? r.value / r.cost - 1 : null, weight: r.weight,
    income: regular ? r.income ?? null : null,
    healthScore: premium ? r.score ?? null : null, healthBand: premium ? r.band?.label : null,
    checks: premium ? (r.checks || []).map((k) => ({ label: k.label, score: k.score, note: k.note || k.text || '' })) : null,
  }));
  return {
    ...facts,
    holdings: rows,
    totals: { value: ph.totalValue, cost: ph.totalCost, gain: ph.totalGain, income: regular ? ph.income : null, basis: ph.basis },
    sectors: regular ? ph.sectors : null,
    health: premium ? { overall: ph.overall, band: ph.overallBand?.label, holdingsScore: ph.holdingsScore, spread: ph.spread, spreadBand: ph.spreadBand?.label, notes: ph.notes } : null,
  };
}
