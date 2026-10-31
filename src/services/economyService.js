/* ════════════════════════════════════════════════════════════════════════
   ECONOMY NUMBERS — straight from the official sources (all free, and all
   allow use on a commercial website with credit). Checked 17 October 2026.
   ───────────────────────────────────────────────────────────────────────
   We do NOT use FRED: its terms forbid commercial use without written
   permission. Instead:

   Inflation + unemployment — US Bureau of Labor Statistics (BLS) API v1,
     no key, 25 requests/day (we use 2):
     https://api.bls.gov/publicAPI/v1/timeseries/data/CUSR0000SA0  (CPI, seasonally adjusted)
     https://api.bls.gov/publicAPI/v1/timeseries/data/LNS14000000  (unemployment rate)
     Terms: cite the date retrieved + BLS disclaimer (shown on the pages).

   Interest rate — Federal Reserve Bank of New York, Effective Fed Funds Rate:
     https://markets.newyorkfed.org/api/rates/unsecured/effr/last/40.json
     Terms allow "personal or business purposes" with the NY Fed notice.

   10-year bond yield — US Treasury daily par yield curve (XML feed):
     https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=YYYYMM
     US government data (public domain).

   30-year mortgage rate — Freddie Mac weekly survey (PMMS), Excel file:
     https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx
     "may be used with proper attribution" (shown on the pages).
   ════════════════════════════════════════════════════════════════════════ */

import AdmZip from 'adm-zip';

const UA = { 'User-Agent': 'Dr MoneyWise (hello@drmoneywise.com)' };

export const ECONOMY_SERIES = [
  { id: 'BLS:CUSR0000SA0', key: 'inflation', label: 'Inflation (vs a year ago)', kind: 'yoy', unit: '%' },
  { id: 'NYFED:EFFR', key: 'interestRate', label: 'US interest rate (Fed)', kind: 'level', unit: '%' },
  { id: 'TREASURY:10Y', key: 'tenYearYield', label: '10-year US bond yield', kind: 'level', unit: '%' },
  { id: 'FREDDIEMAC:PMMS30', key: 'mortgageRate', label: '30-year mortgage rate', kind: 'level', unit: '%' },
  { id: 'BLS:LNS14000000', key: 'unemployment', label: 'US unemployment', kind: 'level', unit: '%' },
];

/** Credit lines the pages must show (from each source's terms). */
export const ECONOMY_CREDITS = [
  'Inflation and unemployment: US Bureau of Labor Statistics. BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.',
  `Interest rate: Effective Federal Funds Rate, © ${new Date().getFullYear()} Federal Reserve Bank of New York. Content from the New York Fed subject to the Terms of Use at newyorkfed.org. The New York Fed does not sanction or endorse any particular republication, and has no liability for your use.`,
  '10-year bond yield: US Department of the Treasury.',
  'Mortgage rate: Freddie Mac Primary Mortgage Market Survey®.',
];

/* ── Fetchers: each returns [{ date: 'YYYY-MM-DD', value }] oldest first ── */
async function getJson(url) {
  const response = await fetch(url, { headers: { ...UA, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}

async function fetchBls(seriesId) {
  const data = await getJson(`https://api.bls.gov/publicAPI/v1/timeseries/data/${seriesId}`);
  if (data.status && data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS said ${data.status}: ${(data.message || []).join(' ')}`);
  }
  const results = Array.isArray(data.Results) ? data.Results[0] : data.Results;
  const rows = (results?.series?.[0]?.data || [])
    .filter((row) => /^M(0[1-9]|1[0-2])$/u.test(row.period) && Number.isFinite(Number(row.value)))
    .map((row) => ({ date: `${row.year}-${row.period.slice(1)}-01`, value: Number(row.value) }));
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchEffr() {
  const data = await getJson('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/40.json');
  return (data.refRates || [])
    .filter((row) => row.effectiveDate && Number.isFinite(Number(row.percentRate)))
    .map((row) => ({ date: row.effectiveDate, value: Number(row.percentRate) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchTreasury10y() {
  const rows = [];
  const now = new Date();
  // This month and the two before (early in a month there may be few days yet)
  for (let back = 2; back >= 0; back -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${ym}`;
    const response = await fetch(url, { headers: UA });
    if (!response.ok) throw new Error(`HTTP ${response.status} from home.treasury.gov`);
    const xml = await response.text();
    for (const entry of xml.split(/<m:properties>/u).slice(1)) {
      const date = entry.match(/<d:NEW_DATE[^>]*>(\d{4}-\d{2}-\d{2})/u)?.[1];
      const value = Number(entry.match(/<d:BC_10YEAR[^>]*>([\d.]+)</u)?.[1]);
      if (date && Number.isFinite(value) && value > 0) rows.push({ date, value });
    }
  }
  if (!rows.length) throw new Error('Treasury feed had no 10-year values (feed format may have changed)');
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/** Reads Freddie Mac's Excel file: column A = week date, column B = 30-year rate. */
async function fetchFreddieMac30() {
  const response = await fetch('https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx', { headers: UA });
  if (!response.ok) throw new Error(`HTTP ${response.status} from freddiemac.com`);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const sheetEntry = zip.getEntry('xl/worksheets/sheet1.xml');
  if (!sheetEntry) throw new Error('Freddie Mac file has no first sheet (format may have changed)');
  const shared = (zip.getEntry('xl/sharedStrings.xml')?.getData().toString('utf8') || '')
    .split(/<si>/u).slice(1).map((si) => (si.match(/<t[^>]*>([^<]*)<\/t>/gu) || []).map((t) => t.replace(/<[^>]+>/gu, '')).join(''));
  const xml = sheetEntry.getData().toString('utf8');
  const rows = [];
  for (const rowXml of xml.split(/<row\b/u).slice(1)) {
    const cells = {};
    for (const c of rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<f>[^<]*<\/f>)?<v>([^<]*)<\/v>/gu)) {
      const [, col, attrs, raw] = c;
      cells[col] = /t="s"/u.test(attrs) ? shared[Number(raw)] : raw;
    }
    const a = cells.A;
    const b = Number(cells.B);
    if (!a || !Number.isFinite(b) || b <= 0 || b > 25) continue;
    let date = null;
    if (/^\d{5}(\.\d+)?$/u.test(a)) {
      // Excel serial date (days since 1899-12-30)
      date = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(a)) * 86400000).toISOString().slice(0, 10);
    } else if (!Number.isNaN(Date.parse(a))) {
      date = new Date(a).toISOString().slice(0, 10);
    }
    if (date) rows.push({ date, value: b });
  }
  if (!rows.length) throw new Error('No rates found in Freddie Mac file (format may have changed)');
  return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}

const FETCHERS = {
  'BLS:CUSR0000SA0': () => fetchBls('CUSR0000SA0'),
  'BLS:LNS14000000': () => fetchBls('LNS14000000'),
  'NYFED:EFFR': fetchEffr,
  'TREASURY:10Y': fetchTreasury10y,
  'FREDDIEMAC:PMMS30': fetchFreddieMac30,
};

/* ── Same summary rules as before ─────────────────────────────────────── */
function summarise(series, rows) {
  if (!rows.length) return null;
  const latest = rows.at(-1);

  if (series.kind === 'yoy') {
    const target = new Date(latest.date);
    target.setFullYear(target.getFullYear() - 1);
    const yearAgo = [...rows].reverse().find((row) => new Date(row.date) <= target);
    if (!yearAgo) return null;
    const value = ((latest.value - yearAgo.value) / yearAgo.value) * 100;
    const prev = rows.at(-2);
    let previous = null;
    if (prev) {
      const prevTarget = new Date(prev.date);
      prevTarget.setFullYear(prevTarget.getFullYear() - 1);
      const prevYearAgo = [...rows].reverse().find((row) => new Date(row.date) <= prevTarget);
      if (prevYearAgo) previous = ((prev.value - prevYearAgo.value) / prevYearAgo.value) * 100;
    }
    return { ...series, value: round(value), previous: previous === null ? null : round(previous), asOf: latest.date };
  }

  const monthAgo = new Date(latest.date);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const prev = [...rows].reverse().find((row) => new Date(row.date) <= monthAgo) || rows.at(-2);
  return { ...series, value: round(latest.value), previous: prev ? round(prev.value) : null, asOf: latest.date };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export async function fetchEconomy() {
  const results = {};
  const failures = [];
  for (const series of ECONOMY_SERIES) {
    try {
      const rows = await FETCHERS[series.id]();
      const summary = summarise(series, rows);
      // Sense check: every figure here is a percentage between -30 and 50.
      // Anything outside that means the source changed format: keep the old figure.
      if (summary && !(summary.value > -30 && summary.value < 50)) {
        failures.push({ series: series.id, reason: `value ${summary.value} looks wrong for a percentage` });
        console.error(`[economy] ${series.id}: value ${summary.value} looks wrong; last good figure kept`);
        continue;
      }
      if (summary) {
        results[series.key] = summary;
        console.log(`[economy] ${series.label}: ${summary.value}% (as of ${summary.asOf})`);
      } else {
        failures.push({ series: series.id, reason: 'no usable values' });
        console.log(`[economy] ${series.id}: downloaded but no usable values`);
      }
    } catch (error) {
      failures.push({ series: series.id, reason: error.message });
      console.error(`[economy] ${series.id}: failed — ${error.message} (last good figure kept)`);
    }
  }
  console.log(`[economy] Done: ${Object.keys(results).length} of ${ECONOMY_SERIES.length} figures updated from official sources.`);
  return { economy: results, failures };
}
