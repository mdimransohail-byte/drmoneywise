/* ════════════════════════════════════════════════════════════════════════
   PORTFOLIO EDGE (Premium) — extra insight on the homepage portfolio:
   for each holding its Financial Health score, area of the economy,
   dividend yield, latest price against the price paid, and Shariah status;
   for the whole portfolio a weighted health score, the sector mix, the
   estimated dividend yield and the biggest single holding.
   From official figures and saved prices only. Not advice.
   ════════════════════════════════════════════════════════════════════════ */

import { readCompanies } from './dataEngine.js';
import { financialHealth } from './financialHealthService.js';
import { getLatestPrices } from './marketstackClient.js';
import { sectorOf } from '../data/sectorLeaders.js';

const pct = (v) => { const n = Number(String(v ?? '').replace(/[%\s]/gu, '')); return Number.isFinite(n) && n > 0 ? n : null; };
const money = (v) => { const n = Number(String(v ?? '').replace(/[$£€,\s]/gu, '')); return Number.isFinite(n) && n > 0 ? n : null; };

export async function portfolioEdge(user) {
  const holdings = (user?.portfolio || []).filter((h) => h?.ticker).slice(0, 30);
  if (!holdings.length) return { rows: [], summary: null };
  const { companies } = await readCompanies();
  const tickers = holdings.map((h) => String(h.ticker).toUpperCase());
  const { prices } = await getLatestPrices(tickers).catch(() => ({ prices: {} }));
  let shariah = null;
  try { shariah = await import('./shariahService.js'); } catch { shariah = null; }

  // Weights: as typed, or equal if none were given
  const typed = holdings.map((h) => pct(h.weight));
  const haveWeights = typed.some(Boolean);
  const totalTyped = typed.reduce((a, b) => a + (b || 0), 0) || 1;
  const rows = [];
  for (const [i, h] of holdings.entries()) {
    const t = String(h.ticker).toUpperCase();
    const c = companies?.[t] || null;
    const fh = c ? financialHealth(c) : null;
    const price = prices?.[t]?.price || null;
    const dps = c?.derived?.latestDividendPerShare || null;
    const cost = money(h.cost);
    const sh = shariah ? await shariah.shariahFor(t).catch(() => null) : null;
    const aaoifi = sh?.results?.aaoifi?.result || null;
    rows.push({
      ticker: t,
      name: c?.displayName || c?.name || h.name || t,
      weight: haveWeights ? (typed[i] || 0) / totalTyped * 100 : 100 / holdings.length,
      sector: sectorOf(t)?.name || c?.industry || 'Other',
      score: fh?.score ?? null, band: fh?.band?.label || null, colour: fh?.band?.colour || '#8a8576', stars: fh?.stars || 0,
      price, priceDate: prices?.[t]?.date || null,
      yield: price && dps && !c?.foreignFiler ? dps / price * 100 : null,
      vsCost: price && cost ? (price / cost - 1) * 100 : null,
      shariah: aaoifi === 'pass' ? 'Passes AAOIFI' : aaoifi === 'fail' || aaoifi === 'out' ? 'Does not pass AAOIFI' : null,
    });
  }
  const scored = rows.filter((r) => r.score !== null);
  const wSum = scored.reduce((a, r) => a + r.weight, 0);
  const health = scored.length ? Math.round(scored.reduce((a, r) => a + r.score * r.weight, 0) / (wSum || 1)) : null;
  const sectors = {};
  rows.forEach((r) => { sectors[r.sector] = (sectors[r.sector] || 0) + r.weight; });
  const yRows = rows.filter((r) => r.yield !== null);
  const estYield = yRows.length ? yRows.reduce((a, r) => a + r.yield * r.weight, 0) / 100 : null;
  const biggest = [...rows].sort((a, b) => b.weight - a.weight)[0];
  const notes = [];
  if (biggest && biggest.weight > 25) notes.push(`${biggest.name} is ${Math.round(biggest.weight)}% of your portfolio. Many investors keep any one company under 10–20%.`);
  const topSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0];
  if (topSector && topSector[1] > 40 && rows.length > 1) notes.push(`${Math.round(topSector[1])}% is in ${topSector[0].toLowerCase()}. A problem in that area would hit most of your money.`);
  const weak = rows.filter((r) => r.score !== null && r.score < 50);
  if (weak.length) notes.push(`${weak.map((r) => r.name).join(', ')} ${weak.length === 1 ? 'has' : 'have'} a weak Financial Health score: worth reading ${weak.length === 1 ? 'its' : 'their'} health check.`);
  if (!notes.length) notes.push('No single company or area of the economy dominates, and no holding has a weak health score.');
  return {
    rows,
    summary: {
      health, band: health === null ? null : health >= 80 ? 'Excellent' : health >= 65 ? 'Strong' : health >= 50 ? 'Fair' : health >= 35 ? 'Weak' : 'Poor',
      sectors: Object.entries(sectors).map(([name, w]) => ({ name, weight: Math.round(w * 10) / 10 })).sort((a, b) => b.weight - a.weight),
      estYield: estYield === null ? null : Math.round(estYield * 100) / 100,
      shariahPass: rows.filter((r) => r.shariah === 'Passes AAOIFI').length,
      notes,
      weightsTyped: haveWeights,
    },
  };
}
