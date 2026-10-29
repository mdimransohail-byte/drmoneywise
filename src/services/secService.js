import fs from 'node:fs/promises';
import path from 'node:path';

import { getFxRates } from './fxService.js';

/* ════════════════════════════════════════════════════════════════════════
   SEC EDGAR — official company financials (free, no key needed)
   ───────────────────────────────────────────────────────────────────────
   Sources (checked against SEC docs, Oct 2026):
   - Ticker → CIK list:   https://www.sec.gov/files/company_tickers.json
       { "0": { "cik_str": 1045810, "ticker": "NVDA", "title": "NVIDIA CORP" }, … }
   - Company facts:       https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json
       facts["us-gaap"][Concept].units["USD" | "USD/shares" | "shares"] = [
         { start?, end, val, accn, fy, fp, form, filed, frame? }, … ]
   SEC fair-access rules: at most 10 requests/second and a User-Agent that
   names the site and a contact email. We stay well under (4/second).

   For each company we keep only a small summary (last 6 years of the
   numbers we show), saved to data/market/companies.json.
   ════════════════════════════════════════════════════════════════════════ */

const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SUBMISSIONS_URL = (cik) => `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`;
const FACTS_URL = (cik) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`;
const ANNUAL_FORMS = new Set(['10-K', '10-K/A', '20-F', '20-F/A', '40-F', '40-F/A']);
const PAUSE_MS = 250;

export function userAgent() {
  const email = process.env.SUPPORT_EMAIL || 'hello@drmoneywise.com';
  return `Dr MoneyWise ${email}`;
}

export async function secFetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
  });
  if (!response.ok) {
    const error = new Error(`SEC returned HTTP ${response.status} for ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** { TICKER: { cik, name } } for every US-listed company. */
export async function fetchTickerMap() {
  const raw = await secFetchJson(TICKERS_URL);
  const map = {};
  for (const entry of Object.values(raw || {})) {
    if (entry?.ticker && entry?.cik_str) {
      map[String(entry.ticker).toUpperCase()] = { cik: Number(entry.cik_str), name: entry.title };
    }
  }
  return map;
}

/* ── Picking clean yearly numbers out of the filings ────────────────── */
function daysBetween(start, end) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
}

/** Full-year values (from annual reports), one per fiscal year end, newest last. */
const TAXONOMIES = ['us-gaap', 'ifrs-full'];
const unitMapOf = (facts, concept) => {
  for (const tax of TAXONOMIES) if (facts?.[tax]?.[concept]?.units) return facts[tax][concept].units;
  return {};
};

function annualSeries(facts, concepts, units) {
  for (const concept of concepts) {
    const unitMap = unitMapOf(facts, concept);
    for (const unit of units) {
      const rows = (unitMap[unit] || []).filter(
        (row) => ANNUAL_FORMS.has(row.form) && row.start && row.end
          && daysBetween(row.start, row.end) > 330 && daysBetween(row.start, row.end) < 400
          && Number.isFinite(Number(row.val)),
      );
      if (!rows.length) continue;
      const byEnd = new Map();
      for (const row of rows) {
        const existing = byEnd.get(row.end);
        if (!existing || row.filed > existing.filed) byEnd.set(row.end, row); // latest filing wins (restatements)
      }
      const series = [...byEnd.values()]
        .sort((a, b) => a.end.localeCompare(b.end))
        .map((row) => ({ year: Number(row.end.slice(0, 4)), end: row.end, value: Number(row.val) }));
      // Only use this concept if it is still being reported (last 2 years)
      const latestYear = series.at(-1)?.year || 0;
      if (latestYear >= new Date().getFullYear() - 2) {
        return { concept, series };
      }
    }
  }
  return { concept: null, series: [] };
}

/** Latest balance-sheet value (point in time) from annual or quarterly reports. */
function latestInstant(facts, concepts, units = ['USD']) {
  for (const concept of concepts) {
    const unitMap = unitMapOf(facts, concept);
    for (const unit of units) {
      const rows = (unitMap[unit] || []).filter((row) => row.end && !row.start && Number.isFinite(Number(row.val)));
      if (!rows.length) continue;
      rows.sort((a, b) => (a.end === b.end ? a.filed.localeCompare(b.filed) : a.end.localeCompare(b.end)));
      const row = rows.at(-1);
      if (Number(row.end.slice(0, 4)) >= new Date().getFullYear() - 2) {
        return { concept, value: Number(row.val), asOf: row.end };
      }
    }
  }
  return { concept: null, value: null, asOf: null };
}

/** Three-month values from quarterly reports (10-Q), newest last. */
function quarterlySeries(facts, concepts, units, keep = 5) {
  for (const concept of concepts) {
    const unitMap = unitMapOf(facts, concept);
    for (const unit of units) {
      const rows = (unitMap[unit] || []).filter(
        (row) => (row.form === '10-Q' || row.form === '10-Q/A') && row.start && row.end
          && daysBetween(row.start, row.end) > 80 && daysBetween(row.start, row.end) < 100
          && Number.isFinite(Number(row.val)),
      );
      if (!rows.length) continue;
      const byEnd = new Map();
      for (const row of rows) {
        const existing = byEnd.get(row.end);
        if (!existing || row.filed > existing.filed) byEnd.set(row.end, row);
      }
      const series = [...byEnd.values()]
        .sort((a, b) => a.end.localeCompare(b.end))
        .map((row) => ({ end: row.end, label: `${row.fp || ''} ${row.fy || ''}`.trim(), value: Number(row.val) }));
      if (Number(series.at(-1)?.end?.slice(0, 4) || 0) >= new Date().getFullYear() - 1) {
        return series.slice(-keep);
      }
    }
  }
  return [];
}

/** Total shares across share classes (A, B…) on the latest cover-page date. */
function sharesOutstandingTotal(facts) {
  const rows = (facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares || []).filter((row) => row.end && Number.isFinite(Number(row.val)));
  if (!rows.length) return { value: null, asOf: null };
  const latestEnd = rows.map((row) => row.end).sort().at(-1);
  const latestFiled = rows.filter((row) => row.end === latestEnd).map((row) => row.filed).sort().at(-1);
  const total = rows.filter((row) => row.end === latestEnd && row.filed === latestFiled).reduce((sum, row) => sum + Number(row.val), 0);
  return { value: total || null, asOf: latestEnd };
}

/** How many years in a row the yearly dividend per share went up (most recent run). */
function yearsOfRaises(dividendSeries) {
  let count = 0;
  for (let i = dividendSeries.length - 1; i > 0; i -= 1) {
    if (dividendSeries[i].value > dividendSeries[i - 1].value * 1.001) count += 1;
    else break;
  }
  return count;
}

function lastN(series, n = 10) {
  return series.slice(-n);
}

/** The currency a company reports in: the unit used most for its sales
 *  and profit (overseas companies often add a few US-dollar "convenience"
 *  figures, which this ignores). */
export function reportingCurrency(facts) {
  const counts = {};
  for (const concept of ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenue', 'RevenueFromContractsWithCustomers',
    'NetIncomeLoss', 'ProfitLoss', 'ProfitLossAttributableToOwnersOfParent', 'Assets', 'CashFlowsFromUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivities']) {
    for (const [unit, rows] of Object.entries(unitMapOf(facts, concept))) {
      if (/^[A-Z]{3}$/u.test(unit)) counts[unit] = (counts[unit] || 0) + rows.length;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';
}

/** Turns one company's full SEC file into the small summary we keep.
 *  fx = { usdPer: { JPY: 0.0066, … }, date } (needed for non-dollar filers). */
export function summariseCompanyFacts(ticker, factsJson, fx = null) {
  const facts = factsJson?.facts || {};
  const cur = reportingCurrency(facts);
  const M = [cur];
  const PS = [`${cur}/shares`];
  const revenue = annualSeries(facts, [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet',
    'SalesRevenueGoodsNet',
    'RevenuesNetOfInterestExpense',
    'RevenueFromContractWithCustomerProductAndServiceExcludingAssessedTax',
    'OperatingLeasesIncomeStatementLeaseRevenue',
    'InterestAndDividendIncomeOperating',
    // IFRS names (companies outside the US)
    'Revenue', 'RevenueFromContractsWithCustomers', 'RevenueFromSaleOfGoods', 'RevenueFromRenderingOfServices',
    'RevenueAndOperatingIncome', 'RevenueFromInterest', 'InterestRevenueCalculatedUsingEffectiveInterestMethod',
  ], M);
  const netIncome = annualSeries(facts, ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic', 'ProfitLossAttributableToOwnersOfParent', 'ProfitLoss'], M);
  const eps = annualSeries(facts, ['EarningsPerShareDiluted', 'EarningsPerShareBasic', 'DilutedEarningsLossPerShare', 'BasicEarningsLossPerShare'], PS);
  const dividendsPerShare = annualSeries(facts, ['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid', 'DividendsRecognisedAsDistributionsToOwnersPerShare'], PS);
  const dividendsPaid = annualSeries(facts, ['PaymentsOfDividendsCommonStock', 'PaymentsOfDividends', 'DividendsPaidClassifiedAsFinancingActivities', 'DividendsPaidToEquityHoldersOfParentClassifiedAsFinancingActivities', 'DividendsPaid'], M);
  const operatingCashFlow = annualSeries(facts, ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations', 'CashFlowsFromUsedInOperatingActivities'], M);
  const capex = annualSeries(facts, ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets', 'PaymentsForCapitalImprovements', 'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities', 'PurchaseOfPropertyPlantAndEquipment', 'PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets'], M);
  const grossProfit = annualSeries(facts, ['GrossProfit'], M);
  const operatingIncome = annualSeries(facts, ['OperatingIncomeLoss', 'ProfitLossFromOperatingActivities'], M);
  const totalAssets = latestInstant(facts, ['Assets'], M);
  const totalLiabilities = latestInstant(facts, ['Liabilities'], M);
  const quarters = {
    revenue: quarterlySeries(facts, ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet', 'RevenuesNetOfInterestExpense'], M),
    netIncome: quarterlySeries(facts, ['NetIncomeLoss', 'ProfitLossAttributableToOwnersOfParent', 'ProfitLoss'], M),
    eps: quarterlySeries(facts, ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], PS),
  };

  const cash = latestInstant(facts, ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'CashAndCashEquivalents'], M);
  const longTermDebt = latestInstant(facts, ['LongTermDebt', 'LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations', 'LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities', 'DebtInstrumentCarryingAmount', 'SeniorLongTermNotes', 'DebtLongtermAndShorttermCombinedAmount', 'LongTermNotesPayable', 'LongtermBorrowings', 'NoncurrentPortionOfNoncurrentBorrowings', 'Borrowings'], M);
  const equity = latestInstant(facts, ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'EquityAttributableToOwnersOfParent', 'Equity'], M);
  const shares = sharesOutstandingTotal(facts);
  // For the Shariah checks: borrowing due within a year, money owed by customers,
  // short-term investments and interest earned (US and international names)
  const shortBorrowing = latestInstant(facts, ['ShortTermBorrowings', 'CommercialPaper', 'OtherShortTermBorrowings', 'ShorttermBorrowings', 'CurrentBorrowings', 'BankOverdrafts'], M);
  const debtCurrent = latestInstant(facts, ['LongTermDebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent', 'CurrentPortionOfLongtermBorrowings', 'DebtCurrent'], M);
  const receivables = latestInstant(facts, ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsNotesAndLoansReceivableNetCurrent', 'TradeAndOtherCurrentReceivables', 'TradeReceivables', 'CurrentTradeReceivables'], M);
  const shortInvestments = latestInstant(facts, ['ShortTermInvestments', 'MarketableSecuritiesCurrent', 'AvailableForSaleSecuritiesDebtSecuritiesCurrent', 'HeldToMaturitySecuritiesCurrent', 'OtherShortTermInvestments', 'CurrentFinancialAssetsAtFairValueThroughProfitOrLoss', 'ShorttermDepositsNotClassifiedAsCashEquivalents', 'OtherCurrentFinancialAssets'], M);
  const interestIncome = annualSeries(facts, ['InvestmentIncomeInterest', 'InterestIncomeOther', 'InvestmentIncomeInterestAndDividend', 'InterestAndOtherIncome', 'InterestIncomeOperating', 'FinanceIncome', 'InterestIncome', 'RevenueFromInterest'], M);


  // Non-dollar filers: convert every money figure at today's rate, so the
  // whole site can show US dollars. One rate for every year keeps growth
  // rates, margins and other ratios exactly as reported.
  const rate = cur === 'USD' ? 1 : fx?.usdPer?.[cur];
  if (!rate) throw new Error(`reports in ${cur} and no exchange rate is available yet`);
  if (rate !== 1) {
    for (const s of [revenue, netIncome, eps, dividendsPerShare, dividendsPaid, operatingCashFlow, capex, grossProfit, operatingIncome]) {
      s.series = s.series.map((row) => ({ ...row, value: row.value * rate }));
    }
    for (const x of [totalAssets, totalLiabilities, cash, longTermDebt, equity, shortBorrowing, debtCurrent, receivables, shortInvestments]) if (x.value !== null) x.value *= rate;
    interestIncome.series = interestIncome.series.map((row) => ({ ...row, value: row.value * rate }));
    for (const k of Object.keys(quarters)) quarters[k] = quarters[k].map((row) => ({ ...row, value: row.value * rate }));
  }
  const coverRows = (facts.dei?.EntityCommonStockSharesOutstanding?.units?.shares || []).slice().sort((a, b) => String(a.filed).localeCompare(String(b.filed)));
  const annualForm = /^(20-F|40-F)/u.test(coverRows.at(-1)?.form || '') ? coverRows.at(-1).form : null;

  const latest = (s) => s.series.at(-1)?.value ?? null;
  const growth = (s) => {
    const rows = s.series;
    if (rows.length < 2 || !rows.at(-2).value) return null;
    return (rows.at(-1).value - rows.at(-2).value) / Math.abs(rows.at(-2).value);
  };

  const fcf = latest(operatingCashFlow) !== null && latest(capex) !== null ? latest(operatingCashFlow) - latest(capex) : null;
  const payoutRatio = latest(dividendsPerShare) && latest(eps) > 0 ? latest(dividendsPerShare) / latest(eps) : null;

  return {
    ticker,
    name: factsJson?.entityName || ticker,
    cik: factsJson?.cik || null,
    updatedAt: new Date().toISOString(),
    latestFiscalYearEnd: revenue.series.at(-1)?.end || netIncome.series.at(-1)?.end || null,
    revenue: lastN(revenue.series),
    netIncome: lastN(netIncome.series),
    eps: lastN(eps.series),
    dividendsPerShare: lastN(dividendsPerShare.series, 16),
    dividendsPaid: lastN(dividendsPaid.series),
    operatingCashFlow: lastN(operatingCashFlow.series),
    capex: lastN(capex.series),
    grossProfit: lastN(grossProfit.series),
    operatingIncome: lastN(operatingIncome.series),
    quarters,
    totalAssets: totalAssets.value,
    totalLiabilities: totalLiabilities.value,
    cash: cash.value,
    longTermDebt: longTermDebt.value,
    equity: equity.value,
    sharesOutstanding: shares.value,
    // Shariah checks (see shariahService.js). "LongTermDebt" on its own already
    // includes the part due this year, so that part is only added to the other names.
    shariah: {
      shortBorrowing: shortBorrowing.value,
      debtCurrent: ['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations', 'NoncurrentPortionOfNoncurrentBorrowings', 'LongTermNotesPayable'].includes(longTermDebt.concept) ? debtCurrent.value : null,
      // These names already cover all borrowing, short and long
      debtIsTotal: ['DebtLongtermAndShorttermCombinedAmount', 'Borrowings'].includes(longTermDebt.concept),
      longDebtConcept: longTermDebt.concept,
      receivables: receivables.value,
      shortInvestments: shortInvestments.value,
      interestIncome: interestIncome.series.at(-1)?.value ?? null,
      interestIncomeYear: interestIncome.series.at(-1)?.year ?? null,
    },
    currency: cur,
    fx: rate !== 1 ? { rate, date: fx?.date || null } : null,
    // Files yearly reports as an overseas company (20-F): its US-listed
    // shares are usually ADRs, each worth one or more local shares
    foreignFiler: Boolean(annualForm) || cur !== 'USD',
    balanceSheetAsOf: equity.asOf || cash.asOf || null,
    derived: {
      revenueGrowth: growth(revenue),
      profitGrowth: growth(netIncome),
      profitMargin: latest(revenue) && latest(netIncome) !== null ? latest(netIncome) / latest(revenue) : null,
      freeCashFlow: fcf,
      payoutRatio,
      dividendCoveredByCash: latest(dividendsPaid) && fcf !== null ? fcf >= latest(dividendsPaid) : null,
      yearsOfDividendRaises: yearsOfRaises(dividendsPerShare.series),
      // True when the run of raises goes back as far as the SEC data does,
      // so the real record is probably longer ("at least N years").
      dividendRaisesFullHistory: dividendsPerShare.series.length > 1
        && yearsOfRaises(dividendsPerShare.series) === dividendsPerShare.series.length - 1,
      debtToEquity: longTermDebt.value !== null && equity.value > 0 ? longTermDebt.value / equity.value : null,
      latestDividendPerShare: latest(dividendsPerShare),
    },
    sourceConcepts: {
      revenue: revenue.concept,
      netIncome: netIncome.concept,
      dividendsPerShare: dividendsPerShare.concept,
      operatingCashFlow: operatingCashFlow.concept,
      capex: capex.concept,
      longTermDebt: longTermDebt.concept,
    },
    // Which numbers this company's filings did not give us in a standard form
    missing: [
      !revenue.series.length && 'sales',
      !netIncome.series.length && 'profit',
      !operatingCashFlow.series.length && 'cash from operations',
      !capex.series.length && 'investment spending',
      longTermDebt.value === null && 'long-term debt',
    ].filter(Boolean),
  };
}

/** "COCA COLA CO" → "Coca Cola Co"; leaves mixed-case names alone. */
export function cleanName(name) {
  const text = String(name || '').trim();
  if (text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(/\b([a-z])/gu, (letter) => letter.toUpperCase())
    .replace(/\b(Inc|Co|Corp|Ltd|Plc|Llc)\b\.?/gu, (word) => `${word}`)
    .replace(/\bIbm\b/gu, 'IBM');
}

/* ── Official company announcements (Form 8-K), newest first ──────────── */
const ITEM_WORDS = {
  '1.01': 'Signed a major agreement', '1.02': 'Ended a major agreement', '1.03': 'Bankruptcy or receivership',
  '2.01': 'Completed a purchase or sale of assets', '2.02': 'Results announced', '2.03': 'Took on new debt',
  '2.05': 'Cost-cutting or restructuring', '2.06': 'Wrote down the value of assets', '3.01': 'Stock-exchange listing notice',
  '3.02': 'Sold new shares privately', '3.03': 'Changed shareholders’ rights', '4.01': 'Changed its auditor',
  '4.02': 'Earlier accounts should not be relied on', '5.01': 'Change in control of the company',
  '5.02': 'Directors or top managers changed (or their pay)', '5.03': 'Changed its company rules or year-end',
  '5.07': 'Shareholder vote results', '7.01': 'Shared information with investors', '8.01': 'Other news the company chose to report',
  '9.01': 'Financial statements and attachments',
};
export function recentAnnouncements(submissions, cik) {
  const r = submissions?.filings?.recent;
  if (!r?.form) return [];
  const out = [];
  for (let i = 0; i < r.form.length && out.length < 6; i += 1) {
    if (r.form[i] !== '8-K') continue;
    const items = String(r.items?.[i] || '').split(',').map((x) => x.trim()).filter((x) => x && x !== '9.01');
    const words = [...new Set(items.map((x) => ITEM_WORDS[x]).filter(Boolean))];
    const acc = String(r.accessionNumber?.[i] || '').replace(/-/gu, '');
    const doc = r.primaryDocument?.[i] || '';
    if (!acc) continue;
    out.push({
      date: r.filingDate?.[i] || '',
      what: words.length ? words.join('; ') : 'Company announcement',
      url: doc ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${doc}` : `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/`,
    });
  }
  return out;
}

/* ── One company on request (any US-listed ticker) ──────────────────── */
const TICKER_CACHE = path.join(process.cwd(), 'data', 'market', 'sec-tickers.json');
let tickerMapMemo = null;

/** SEC ticker list, saved to the volume and refreshed weekly. */
export async function getTickerMapCached() {
  if (tickerMapMemo && Date.now() - tickerMapMemo.at < 24 * 60 * 60 * 1000) return tickerMapMemo.map;
  try {
    const saved = JSON.parse(await fs.readFile(TICKER_CACHE, 'utf8'));
    if (Date.now() - new Date(saved.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
      tickerMapMemo = { map: saved.map, at: Date.now() };
      return saved.map;
    }
  } catch { /* no saved list yet */ }
  const map = await fetchTickerMap();
  await fs.mkdir(path.dirname(TICKER_CACHE), { recursive: true });
  await fs.writeFile(TICKER_CACHE, JSON.stringify({ updatedAt: new Date().toISOString(), map }));
  tickerMapMemo = { map, at: Date.now() };
  console.log(`[sec] Ticker list saved (${Object.keys(map).length} companies)`);
  return map;
}

/** Financials + company details for one ticker. Throws if the SEC has nothing. */
export async function fetchOneCompany(ticker, match) {
  const facts = await secFetchJson(FACTS_URL(match.cik));
  const fx = reportingCurrency(facts?.facts || {}) === 'USD' ? null : await getFxRates();
  const summary = summariseCompanyFacts(ticker, facts, fx);
  summary.name = match.name || summary.name;
  try {
    await sleep(PAUSE_MS);
    const submissions = await secFetchJson(SUBMISSIONS_URL(match.cik));
    summary.industry = submissions?.sicDescription || '';
    summary.sic = Number(submissions?.sic) || null;
    summary.exchange = submissions?.exchanges?.[0] || '';
    const where = submissions?.addresses?.business || {};
    summary.country = where.stateOrCountryDescription && !/^[A-Z]{2}$/u.test(where.stateOrCountry || '') ? where.stateOrCountryDescription : (where.stateOrCountry ? 'United States' : '');
    summary.displayName = cleanName(submissions?.name || match.name || ticker);
    summary.announcements = recentAnnouncements(submissions, match.cik);
  } catch (error) {
    console.log(`[sec] ${ticker}: company details not available (${error.message}) — financials still saved`);
    summary.displayName = cleanName(match.name || ticker);
  }
  return summary;
}

/**
 * Downloads and summarises every ticker. Returns { companies, failures }.
 * Logs clearly per company so problems show up in Railway logs.
 */
export async function fetchCompanies(tickers) {
  const tickerMap = await getTickerMapCached();
  console.log(`[sec] Ticker list loaded (${Object.keys(tickerMap).length} companies). Fetching ${tickers.length}…`);

  const companies = {};
  const failures = [];
  for (const ticker of tickers) {
    const match = tickerMap[ticker];
    if (!match) {
      failures.push({ ticker, reason: 'not on SEC ticker list' });
      console.log(`[sec] ${ticker}: skipped — not on the SEC ticker list (check the spelling in stockUniverse.js)`);
      continue;
    }
    try {
      const summary = await fetchOneCompany(ticker, match);
      companies[ticker] = summary;
      if (summary.missing.length) {
        console.log(`[sec] ${ticker}: saved, but its filings don't report ${summary.missing.join(', ')} in a standard way`);
      }
    } catch (error) {
      failures.push({ ticker, reason: error.message });
      console.error(`[sec] ${ticker}: failed — ${error.message}`);
    }
    await sleep(PAUSE_MS);
  }
  console.log(`[sec] Done: ${Object.keys(companies).length} companies saved, ${failures.length} failed.`);
  return { companies, failures };
}
