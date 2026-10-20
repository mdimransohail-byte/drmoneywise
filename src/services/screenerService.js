/* ════════════════════════════════════════════════════════════════════════
   STOCK SCREENER — every company we cover, with the figures to filter on.
     Regular  growth, profit, debt, cash, dividends, report-card score
     Premium  + what the ~20 big funds own: how many hold it, buying vs
              selling, share of each fund's money, share of the company
              they own between them; and the Fund explorer (each fund's
              biggest holdings and what it bought or sold)
   All from official SEC filings (company accounts and 13F fund reports).
   Prices (for dividend yield) appear once the Marketstack paid plan is on.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { readCompanies, readPrices } from './dataEngine.js';
import { readExtraCompanies } from './companyLookup.js';
import { buildReportCard } from './reportCardService.js';
import { sectorOf } from '../data/sectorLeaders.js';
import { whatIfScenarios } from './stockPages.js';

const FUNDS_FILE = path.join(process.cwd(), 'data', 'market', 'funds.json');
const GRADE_POINTS = { good: 100, okay: 60, weak: 15 };
const latest = (s) => s?.at?.(-1)?.value ?? null;
const r1 = (v, dp = 1) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** dp) / 10 ** dp);

let memo = null;
async function readFunds() {
  try { return JSON.parse(await fs.readFile(FUNDS_FILE, 'utf8')); } catch { return { funds: [], positions: {} }; }
}

/** Builds the table (cached for 10 minutes, always with the big-fund
 *  figures; they are removed for anyone who is not Premium). */
export async function screenerRows({ premium = false } = {}) {
  if (!memo || Date.now() - memo.at > 10 * 60 * 1000) {
    const [{ companies }, extra, prices, funds] = await Promise.all([readCompanies(), readExtraCompanies(), readPrices(), readFunds()]);
    const all = { ...(extra || {}), ...(companies || {}) };
    const rows = [];
    for (const c of Object.values(all)) {
      if (!c?.ticker || !c.revenue?.length) continue;
      const d = c.derived || {};
      const card = buildReportCard(c);
      const rated = card.filter((x) => GRADE_POINTS[x.grade] !== undefined);
      const score = rated.length ? Math.round(rated.reduce((a, x) => a + GRADE_POINTS[x.grade], 0) / rated.length) : null;
      const eps = whatIfScenarios(c).find((x) => x.label === 'Earnings per share');
      const ocf = latest(c.operatingCashFlow);
      const debtYears = c.longTermDebt === 0 ? 0 : c.longTermDebt && ocf > 0 ? c.longTermDebt / ocf : null;
      const price = prices.prices?.[c.ticker]?.price || null;
      const positions = (funds.positions?.[c.ticker] || []);
      const holders = positions.filter((p) => p.change !== 'sold');
      const sharesHeld = holders.reduce((a, p) => a + (p.shares || 0), 0);
      const biggest = holders.slice().sort((a, b) => (b.value || 0) - (a.value || 0))[0];
      const bigBet = holders.slice().sort((a, b) => (b.shareOfFund || 0) - (a.shareOfFund || 0))[0];
      rows.push({
        ticker: c.ticker,
        name: String(c.displayName || c.name || c.ticker).replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/u, ''),
        sector: sectorOf(c.ticker)?.name || 'Other',
        sales: latest(c.revenue),
        salesGrowth: r1((d.revenueGrowth ?? null) * 100),
        margin: r1((d.profitMargin ?? null) * 100),
        epsGrowth: eps?.available ? r1(eps.pastRate * 100) : null,
        debtYears: r1(debtYears),
        spareCash: d.freeCashFlow ?? null,
        dividend: d.latestDividendPerShare || 0,
        divYears: d.yearsOfDividendRaises || 0,
        divYield: price && d.latestDividendPerShare ? r1((d.latestDividendPerShare / price) * 100, 2) : null,
        price,
        score,
        ...({
          funds: holders.length,
          buyers: positions.filter((p) => p.change === 'new' || p.change === 'added').length,
          sellers: positions.filter((p) => p.change === 'reduced' || p.change === 'sold').length,
          fundsValue: holders.reduce((a, p) => a + (p.value || 0), 0) || null,
          ownedPct: c.sharesOutstanding && sharesHeld ? r1((sharesHeld / c.sharesOutstanding) * 100, 2) : null,
          topFund: biggest ? biggest.fund : null,
          bigBet: bigBet ? { fund: bigBet.fund, pct: r1((bigBet.shareOfFund || 0) * 100) } : null,
        }),
      });
    }
    memo = { at: Date.now(), rowsPremium: rows, period: funds.funds?.map((f) => f.period).sort().at(-1) || null, pricesOn: Object.keys(prices.prices || {}).length > 0 };
  }
  const strip = (r) => { const { funds, buyers, sellers, fundsValue, ownedPct, topFund, bigBet, ...rest } = r; return rest; };
  return { rows: premium ? memo.rowsPremium : memo.rowsPremium.map(strip), fundsPeriod: premium ? memo.period : null, pricesOn: memo.pricesOn };
}

/** Premium: one company's big-fund owners (for the pie chart). */
export async function fundOwners(ticker) {
  const funds = await readFunds();
  const { companies } = await readCompanies();
  const c = companies?.[ticker] || (await readExtraCompanies())?.[ticker];
  const rows = (funds.positions?.[ticker] || []).slice().sort((a, b) => (b.value || 0) - (a.value || 0));
  return {
    ticker,
    period: rows[0]?.period || null,
    owners: rows.map((p) => ({
      fund: p.fund, manager: p.manager, value: p.value, shares: p.shares, change: p.change,
      pctOfFund: r1((p.shareOfFund || 0) * 100, 2),
      pctOfCompany: c?.sharesOutstanding && p.shares ? r1((p.shares / c.sharesOutstanding) * 100, 3) : null,
    })),
  };
}

/** Premium: Fund explorer — each fund's biggest holdings and what it changed. */
export async function fundExplorer() {
  const funds = await readFunds();
  const byFund = {};
  for (const [ticker, list] of Object.entries(funds.positions || {})) {
    for (const p of list) {
      (byFund[p.fund] = byFund[p.fund] || []).push({ ticker, value: p.value, pctOfFund: r1((p.shareOfFund || 0) * 100, 2), change: p.change });
    }
  }
  return {
    period: funds.funds?.map((f) => f.period).sort().at(-1) || null,
    funds: (funds.funds || []).map((f) => {
      const list = (byFund[f.name] || []).filter((x) => x.change !== 'sold').sort((a, b) => (b.value || 0) - (a.value || 0));
      const total = list.reduce((a, x) => a + (x.value || 0), 0);
      const top = list.slice(0, 10);
      const changes = (byFund[f.name] || []).filter((x) => ['new', 'added', 'reduced', 'sold'].includes(x.change));
      return {
        name: f.name, manager: f.manager, period: f.period, holdings: f.holdings, total,
        top, otherPct: r1(100 - top.reduce((a, x) => a + (x.pctOfFund || 0), 0)),
        top10Pct: r1(top.reduce((a, x) => a + (x.pctOfFund || 0), 0)),
        bought: changes.filter((x) => x.change === 'new' || x.change === 'added').sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 8),
        sold: changes.filter((x) => x.change === 'reduced' || x.change === 'sold').slice(0, 8),
      };
    }).sort((a, b) => b.total - a.total),
  };
}
