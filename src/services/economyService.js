/* ════════════════════════════════════════════════════════════════════════
   ECONOMY NUMBERS — FRED (Federal Reserve Bank of St. Louis), free
   ───────────────────────────────────────────────────────────────────────
   Without a key we read FRED's public chart download:
     https://fred.stlouisfed.org/graph/fredgraph.csv?id=SERIES
     (two columns: date, value — "." means no value that day)
   If FRED_API_KEY is saved in Admin we use the official API instead:
     https://api.stlouisfed.org/fred/series/observations?series_id=…&api_key=…&file_type=json
     → { observations: [ { date, value }, … ] }
   The series below come from US government sources (BLS, Federal Reserve,
   Freddie Mac) and are shown with credit to FRED.
   ════════════════════════════════════════════════════════════════════════ */

export const ECONOMY_SERIES = [
  { id: 'CPIAUCSL', key: 'inflation', label: 'Inflation (vs a year ago)', kind: 'yoy', unit: '%' },
  { id: 'FEDFUNDS', key: 'interestRate', label: 'US interest rate (Fed)', kind: 'level', unit: '%' },
  { id: 'DGS10', key: 'tenYearYield', label: '10-year US bond yield', kind: 'level', unit: '%' },
  { id: 'MORTGAGE30US', key: 'mortgageRate', label: '30-year mortgage rate', kind: 'level', unit: '%' },
  { id: 'UNRATE', key: 'unemployment', label: 'US unemployment', kind: 'level', unit: '%' },
];

function parseFredCsv(text) {
  const lines = String(text || '').trim().split(/\r?\n/u);
  const rows = [];
  for (const line of lines.slice(1)) {
    const [date, value] = line.split(',');
    const number = Number(value);
    if (date && value !== '.' && value !== '' && Number.isFinite(number)) {
      rows.push({ date: date.trim(), value: number });
    }
  }
  return rows;
}

async function fetchObservations(seriesId) {
  const apiKey = String(process.env.FRED_API_KEY || '').trim();
  if (apiKey) {
    const url = new URL('https://api.stlouisfed.org/fred/series/observations');
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('observation_start', `${new Date().getFullYear() - 3}-01-01`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED API returned HTTP ${response.status}`);
    const data = await response.json();
    return (data.observations || [])
      .filter((row) => row.value !== '.' && Number.isFinite(Number(row.value)))
      .map((row) => ({ date: row.date, value: Number(row.value) }));
  }

  const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`, {
    headers: { 'User-Agent': 'Dr MoneyWise (hello@drmoneywise.com)' },
  });
  if (!response.ok) throw new Error(`FRED download returned HTTP ${response.status}`);
  return parseFredCsv(await response.text());
}

function summarise(series, rows) {
  if (!rows.length) return null;
  const latest = rows.at(-1);

  if (series.kind === 'yoy') {
    const target = new Date(latest.date);
    target.setFullYear(target.getFullYear() - 1);
    const yearAgo = [...rows].reverse().find((row) => new Date(row.date) <= target);
    if (!yearAgo) return null;
    const value = ((latest.value - yearAgo.value) / yearAgo.value) * 100;
    // Previous month's year-on-year figure, to show the direction
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

  // For levels, "previous" = about a month earlier
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
      const rows = await fetchObservations(series.id);
      const summary = summarise(series, rows);
      if (summary) {
        results[series.key] = summary;
      } else {
        failures.push({ series: series.id, reason: 'no usable values' });
        console.log(`[economy] ${series.id}: downloaded but no usable values`);
      }
    } catch (error) {
      failures.push({ series: series.id, reason: error.message });
      console.error(`[economy] ${series.id}: failed — ${error.message}`);
    }
  }
  console.log(`[economy] Done: ${Object.keys(results).length} of ${ECONOMY_SERIES.length} figures updated${process.env.FRED_API_KEY ? ' (FRED API)' : ' (FRED public download)'}.`);
  return { economy: results, failures };
}
