/* ════════════════════════════════════════════════════════════════════════
   PORTFOLIO HEALTH CHECK (Premium) — a score out of 100 for each holding
   and for the whole portfolio, worked out by fixed rules from official
   figures. It describes the businesses and how each holding has done; it
   is NOT advice to buy or sell (the page says so).
   ───────────────────────────────────────────────────────────────────────
   Each company holding is scored on up to five checks (missing ones are
   left out and the rest re-weighted):
     Business      our five-point report card (growth, profit, debt, cash,
                   dividend) from SEC filings ......................... 40%
     Profit trend  yearly growth of earnings per share (up to 5 years) .. 20%
     Outlook       our own: where the price would be in 3 years if it
                   simply followed profits at their past pace .......... 15%
     vs your price today's price against what you paid ................. 15%
     Big funds     famous funds buying vs selling last quarter .......... 10%
   ETFs are scored on fee, how many holdings, and how spread out they are,
   plus "vs your price". Prices come from Marketstack once the paid plan is
   on; until then the price checks show "waiting for prices".
   No analyst forecasts are used (they need a paid licence).
   ════════════════════════════════════════════════════════════════════════ */

import { worldTickerInfo } from '../data/worldStocks.js';
import { buildReportCard } from './reportCardService.js';
import { getCompany } from './companyLookup.js';
import { readPrices } from './dataEngine.js';
import { fundsForTicker } from './fundsService.js';
import { getCuratedEtf, readEtf } from './etfService.js';
import { ETF_COMMODITY } from '../data/etfList.js';
import { sectorOf } from '../data/sectorLeaders.js';
import { whatIfScenarios } from './stockPages.js';

export const BANDS = [
  { min: 80, id: 'strong', label: 'Strong', icon: '▲▲' },
  { min: 65, id: 'healthy', label: 'Healthy', icon: '▲' },
  { min: 50, id: 'fair', label: 'Fair', icon: '●' },
  { min: 35, id: 'watch', label: 'Watch', icon: '▼' },
  { min: 0, id: 'weak', label: 'Weak', icon: '▼▼' },
];
export const bandFor = (score) => (score === null || score === undefined ? { id: 'none', label: 'Not rated', icon: '–' } : BANDS.find((b) => score >= b.min));

const clampScore = (v) => Math.max(0, Math.min(100, Math.round(v)));
const GRADE_POINTS = { good: 100, okay: 60, weak: 15 };
const num = (v) => { const n = Number(String(v ?? '').replace(/[$,%\s]/gu, '')); return Number.isFinite(n) && n > 0 ? n : null; };

function weighted(parts) {
  const have = parts.filter((p) => p.score !== null && p.score !== undefined);
  const w = have.reduce((a, p) => a + p.weight, 0);
  return w ? clampScore(have.reduce((a, p) => a + p.score * p.weight, 0) / w) : null;
}

function gainScore(g) {
  if (g === null) return null;
  return g > 0.2 ? 90 : g >= 0 ? 70 : g >= -0.1 ? 50 : g >= -0.25 ? 30 : 15;
}

/* ── One company ──────────────────────────────────────────────────── */
async function scoreCompany(h, company, price) {
  const card = buildReportCard(company);
  const rated = card.filter((r) => GRADE_POINTS[r.grade] !== undefined);
  const business = rated.length ? clampScore(rated.reduce((a, r) => a + GRADE_POINTS[r.grade], 0) / rated.length) : null;

  const eps = whatIfScenarios(company).find((x) => x.label === 'Earnings per share');
  const g = eps?.available ? eps.usedRate : null;
  const trend = g === null ? null : g > 0.10 ? 100 : g > 0.05 ? 80 : g >= 0 ? 60 : g >= -0.05 ? 35 : 15;

  const outlookPrice = price && g !== null ? price * (1 + g) ** 3 : null;
  const outlookChange = outlookPrice ? outlookPrice / price - 1 : null;
  const outlook = outlookChange === null ? null : outlookChange > 0.3 ? 90 : outlookChange > 0.1 ? 70 : outlookChange >= 0 ? 55 : 25;

  const gain = price && h.buyPrice ? price / h.buyPrice - 1 : null;

  const funds = await fundsForTicker(h.ticker);
  const rows = (funds.rows || []).filter((r) => r.change !== 'unknown');
  const buyers = rows.filter((r) => r.change === 'new' || r.change === 'added').length;
  const sellers = rows.filter((r) => r.change === 'reduced' || r.change === 'sold').length;
  const fundsScore = rows.length ? (buyers > sellers ? 80 : buyers === sellers ? 55 : 30) : null;

  const checks = [
    { key: 'business', label: 'Business', score: business, weight: 40, text: business === null ? 'Not enough figures' : `${rated.filter((r) => r.grade === 'good').length} of ${rated.length} checks good` },
    { key: 'trend', label: 'Profit trend', score: trend, weight: 20, text: g === null ? 'Not enough history' : `Earnings per share ${g >= 0 ? 'up' : 'down'} ${(Math.abs(g) * 100).toFixed(1)}% a year` },
    { key: 'outlook', label: 'Outlook', score: outlook, weight: 15, text: outlookChange === null ? (price ? 'Not enough history' : 'Waiting for prices') : `${outlookChange >= 0 ? '+' : '−'}${Math.abs(outlookChange * 100).toFixed(0)}% in 3 years if the price follows profits` },
    { key: 'gain', label: 'vs your price', score: gainScore(gain), weight: 15, text: gain === null ? (price ? 'Add the price you paid' : 'Waiting for prices') : `${gain >= 0 ? '+' : '−'}${Math.abs(gain * 100).toFixed(1)}% since you bought` },
    { key: 'funds', label: 'Big funds', score: fundsScore, weight: 10, text: rows.length ? `${buyers} bought, ${sellers} sold last quarter` : 'Not held by the funds we follow' },
  ];
  const sector = sectorOf(h.ticker)?.name || worldTickerInfo()[h.ticker]?.sector || company.industry || 'Other';
  return {
    kind: 'stock', name: company.displayName || company.name || h.ticker, sector, checks, score: weighted(checks),
    gain, outlookPrice, outlookChange,
    // Overseas companies: per local share, not per US-listed ADR, so no income figure
    dividendPerShare: company.foreignFiler ? null : company.derived?.latestDividendPerShare || null,
    highlights: card.map((r) => ({ label: r.label, grade: r.grade, plain: r.plain })),
  };
}

/* ── One ETF ──────────────────────────────────────────────────────── */
async function scoreEtf(h, curated, price) {
  const data = await readEtf(curated?.sameAs || h.ticker);
  const fee = curated?.expenseRatio ?? null;
  const feeScore = fee === null ? null : fee <= 0.1 ? 90 : fee <= 0.3 ? 70 : 45;
  const count = data?.count || null;
  const spread = count === null ? null : count >= 500 ? 90 : count >= 100 ? 75 : count >= 30 ? 55 : 35;
  const top10 = data?.top10Share ?? null;
  const conc = top10 === null ? null : top10 < 30 ? 85 : top10 < 50 ? 65 : 40;
  const gain = price && h.buyPrice ? price / h.buyPrice - 1 : null;
  const commodity = ETF_COMMODITY[h.ticker];
  const checks = [
    { key: 'fee', label: 'Yearly fee', score: feeScore, weight: 30, text: fee === null ? 'Fee not checked' : `${fee}% a year` },
    { key: 'spread', label: 'How many holdings', score: commodity ? null : spread, weight: 25, text: commodity ? `Holds ${commodity}` : count ? `${count.toLocaleString('en-US')} holdings` : 'Holdings not published' },
    { key: 'conc', label: 'Spread out', score: commodity ? null : conc, weight: 25, text: top10 === null ? '—' : `Top 10 = ${top10}% of the fund` },
    { key: 'gain', label: 'vs your price', score: gainScore(gain), weight: 20, text: gain === null ? (price ? 'Add the price you paid' : 'Waiting for prices') : `${gain >= 0 ? '+' : '−'}${Math.abs(gain * 100).toFixed(1)}% since you bought` },
  ];
  return { kind: 'etf', name: curated?.name || data?.name || h.ticker, sector: commodity ? 'Gold and commodities' : curated?.kind || 'Fund', checks, score: weighted(checks), gain, dividendPerShare: null, highlights: [] };
}

/* ── Whole portfolio ──────────────────────────────────────────────── */
export async function portfolioHealth(holdingsRaw) {
  const prices = (await readPrices()).prices || {};
  const pricesOn = Object.keys(prices).length > 0;
  const holdings = (holdingsRaw || []).map((h) => ({
    ticker: String(h.ticker || '').toUpperCase().trim(),
    shares: num(h.shares),
    buyPrice: num(h.buyPrice ?? h.cost),
    weightIn: num(h.weight),
  })).filter((h) => /^[A-Z0-9.-]{1,10}$/u.test(h.ticker)).slice(0, 30);

  const rows = [];
  for (const h of holdings) {
    const price = prices[h.ticker]?.price || null;
    const curated = getCuratedEtf(h.ticker);
    let r = null;
    if (curated || ETF_COMMODITY[h.ticker]) r = await scoreEtf(h, curated, price);
    else {
      const company = await getCompany(h.ticker).catch(() => null);
      if (company && !company.notFound && !company.busy && company.revenue) r = await scoreCompany(h, company, price);
      else {
        const etfData = await readEtf(h.ticker);
        r = etfData?.count ? await scoreEtf(h, null, price) : { kind: 'unknown', name: h.ticker, sector: 'Not covered', checks: [], score: null, gain: null, highlights: [] };
      }
    }
    const value = price && h.shares ? price * h.shares : null;
    const cost = h.buyPrice && h.shares ? h.buyPrice * h.shares : null;
    rows.push({ ...h, ...r, price, priceDate: prices[h.ticker]?.date || null, value, cost, band: bandFor(r.score),
      income: r.dividendPerShare && h.shares ? r.dividendPerShare * h.shares : null });
  }

  // Weights: by today's value, else by what was paid, else the % typed, else equal
  const basis = rows.every((r) => r.value) ? 'value' : rows.every((r) => r.cost) ? 'cost' : rows.every((r) => r.weightIn) ? 'weight' : 'equal';
  const raw = rows.map((r) => (basis === 'value' ? r.value : basis === 'cost' ? r.cost : basis === 'weight' ? r.weightIn : 1));
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  rows.forEach((r, i) => { r.weight = raw[i] / total; });

  const scored = rows.filter((r) => r.score !== null);
  const sw = scored.reduce((a, r) => a + r.weight, 0);
  const holdingsScore = sw ? clampScore(scored.reduce((a, r) => a + r.score * r.weight, 0) / sw) : null;

  // Spread: how many holdings, how big the biggest one is, how many areas
  const biggest = rows.reduce((m, r) => (r.weight > (m?.weight || 0) ? r : m), null);
  const sectors = {};
  for (const r of rows) sectors[r.sector] = (sectors[r.sector] || 0) + r.weight;
  const broadFunds = rows.filter((r) => r.kind === 'etf' && (r.checks.find((c) => c.key === 'spread')?.score || 0) >= 75).reduce((a, r) => a + r.weight, 0);
  let spread = 40;
  if (rows.length >= 8) spread += 20; else if (rows.length >= 4) spread += 10;
  if (biggest && biggest.weight <= 0.2) spread += 20; else if (biggest && biggest.weight <= 0.35) spread += 10; else spread -= 10;
  if (Object.keys(sectors).length >= 5) spread += 15; else if (Object.keys(sectors).length >= 3) spread += 8;
  spread += Math.round(broadFunds * 25);
  spread = clampScore(spread);

  const overall = holdingsScore === null ? null : clampScore(holdingsScore * 0.75 + spread * 0.25);
  const totalValue = rows.every((r) => r.value) ? rows.reduce((a, r) => a + r.value, 0) : null;
  const totalCost = rows.every((r) => r.cost) ? rows.reduce((a, r) => a + r.cost, 0) : null;
  const income = rows.reduce((a, r) => a + (r.income || 0), 0) || null;

  const notes = [];
  if (biggest && biggest.weight > 0.35) notes.push(`${biggest.ticker} is ${Math.round(biggest.weight * 100)}% of your portfolio, so it has a big effect on how the whole portfolio does.`);
  if (Object.keys(sectors).length <= 2 && rows.length >= 3) notes.push('Most of your money is in one or two areas of the economy, so a bad patch for those areas would hit you harder.');
  const weakOnes = rows.filter((r) => r.band.id === 'weak' || r.band.id === 'watch');
  if (weakOnes.length) notes.push(`${weakOnes.map((r) => r.ticker).join(', ')} scored lower on our checks. The table shows which checks pulled the score down.`);
  if (broadFunds >= 0.3) notes.push('Broad funds make up a good part of your portfolio, which spreads your money over many companies.');
  if (!pricesOn) notes.push('Today’s prices switch on soon. Until then, the “vs your price” and “Outlook” checks are left out and weights use what you paid.');

  return {
    pricesOn, basis, overall, overallBand: bandFor(overall), holdingsScore, spread, spreadBand: bandFor(spread),
    totalValue, totalCost, totalGain: totalValue && totalCost ? totalValue / totalCost - 1 : null, income,
    sectors: Object.entries(sectors).map(([name, w]) => ({ name, weight: w })).sort((a, b) => b.weight - a.weight),
    rows: rows.sort((a, b) => b.weight - a.weight),
    notes,
    checkedAt: new Date().toISOString(),
  };
}
