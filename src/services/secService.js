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

function userAgent() {
  const email = process.env.SUPPORT_EMAIL || 'hello@drmoneywise.com';
  return `Dr MoneyWise ${email}`;
}

async function secFetchJson(url) {
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
function annualSeries(facts, concepts, units) {
  for (const concept of concepts) {
    const unitMap = facts?.['us-gaap']?.[concept]?.units || {};
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
function latestInstant(facts, concepts, units = ['USD'], taxonomy = 'us-gaap') {
  for (const concept of concepts) {
    const unitMap = facts?.[taxonomy]?.[concept]?.units || {};
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

/** How many years in a row the yearly dividend per share went up (most recent run). */
function yearsOfRaises(dividendSeries) {
  let count = 0;
  for (let i = dividendSeries.length - 1; i > 0; i -= 1) {
    if (dividendSeries[i].value > dividendSeries[i - 1].value * 1.001) count += 1;
    else break;
  }
  return count;
}

function lastN(series, n = 6) {
  return series.slice(-n);
}

/** Turns one company's full SEC file into the small summary we keep. */
export function summariseCompanyFacts(ticker, factsJson) {
  const facts = factsJson?.facts || {};
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
  ], ['USD']);
  const netIncome = annualSeries(facts, ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic', 'ProfitLoss'], ['USD']);
  const eps = annualSeries(facts, ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], ['USD/shares']);
  const dividendsPerShare = annualSeries(facts, ['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid'], ['USD/shares']);
  const dividendsPaid = annualSeries(facts, ['PaymentsOfDividendsCommonStock', 'PaymentsOfDividends'], ['USD']);
  const operatingCashFlow = annualSeries(facts, ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'], ['USD']);
  const capex = annualSeries(facts, ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets', 'PaymentsForCapitalImprovements'], ['USD']);

  const cash = latestInstant(facts, ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents']);
  const longTermDebt = latestInstant(facts, ['LongTermDebt', 'LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations', 'LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities', 'DebtInstrumentCarryingAmount', 'SeniorLongTermNotes', 'DebtLongtermAndShorttermCombinedAmount', 'LongTermNotesPayable']);
  const equity = latestInstant(facts, ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']);
  const shares = latestInstant(facts, ['EntityCommonStockSharesOutstanding'], ['shares'], 'dei');

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
    cash: cash.value,
    longTermDebt: longTermDebt.value,
    equity: equity.value,
    sharesOutstanding: shares.value,
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

/**
 * Downloads and summarises every ticker. Returns { companies, failures }.
 * Logs clearly per company so problems show up in Railway logs.
 */
export async function fetchCompanies(tickers) {
  const tickerMap = await fetchTickerMap();
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
      const facts = await secFetchJson(FACTS_URL(match.cik));
      const summary = summariseCompanyFacts(ticker, facts);
      summary.name = match.name || summary.name;
      try {
        await sleep(PAUSE_MS);
        const submissions = await secFetchJson(SUBMISSIONS_URL(match.cik));
        summary.industry = submissions?.sicDescription || '';
        summary.exchange = submissions?.exchanges?.[0] || '';
        summary.displayName = cleanName(submissions?.name || match.name || ticker);
      } catch (error) {
        console.log(`[sec] ${ticker}: company details not available (${error.message}) — financials still saved`);
        summary.displayName = cleanName(match.name || ticker);
      }
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
