/* ════════════════════════════════════════════════════════════════════════
   WHAT THE BIG FUNDS ARE DOING — from official SEC 13F filings (free,
   public US government records; fine for commercial use).
   ───────────────────────────────────────────────────────────────────────
   For each fund in src/data/bigFunds.js:
     1. https://data.sec.gov/submissions/CIK##########.json
        → the two latest 13F-HR filings (accession numbers + dates)
     2. https://www.sec.gov/Archives/edgar/data/<cik>/<accession>/index.json
        → the holdings file (the .xml that isn't primary_doc.xml)
     3. that XML: <infoTable> rows with nameOfIssuer, cusip, value (US$),
        shrsOrPrnAmt/sshPrnamt (shares), putCall (options — skipped)
   13F lists companies by name + CUSIP, not ticker, so we match the name
   to the SEC ticker list (unmatched names are skipped, and counted in
   the log). Result: data/market/funds.json, refreshed weekly.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { BIG_FUNDS } from '../data/bigFunds.js';
import { getTickerMapCached } from './secService.js';

const FILE = path.join(process.cwd(), 'data', 'market', 'funds.json');
const PAUSE_MS = 260;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = () => ({ 'User-Agent': `Dr MoneyWise ${process.env.SUPPORT_EMAIL || 'hello@drmoneywise.com'}` });

async function secGet(url, as = 'json') {
  await sleep(PAUSE_MS);
  const response = await fetch(url, { headers: UA() });
  if (!response.ok) {
    const error = new Error(`SEC returned HTTP ${response.status} for ${url}`);
    error.status = response.status;
    throw error;
  }
  return as === 'json' ? response.json() : response.text();
}

/** "ALPHABET INC CL A" / "Coca-Cola Co" → "alphabet" / "coca cola" */
export function normaliseIssuer(name) {
  return String(name || '')
    .toUpperCase()
    .replace(/&/gu, ' AND ')
    .replace(/[^A-Z0-9 ]/gu, ' ')
    .replace(/\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|LLC|LP|HOLDINGS?|GROUP|CLASS|CL|COM|COMMON|STOCK|SHS|NEW|DEL|THE|SA|NV|AG|N V|ORD|A|B|C)\b/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

async function nameToTicker() {
  const map = await getTickerMapCached();
  const byName = new Map();
  for (const [ticker, entry] of Object.entries(map)) {
    const key = normaliseIssuer(entry.name);
    if (!key) continue;
    const existing = byName.get(key);
    // Keep the shortest ticker (main share class) for each company name
    if (!existing || ticker.length < existing.length) byName.set(key, ticker);
  }
  return byName;
}

export function parseInfoTable(xml) {
  const rows = [];
  // Tags may carry a namespace prefix (e.g. <ns1:infoTable>)
  const tag = (block, name) => block.match(new RegExp(`<(?:\\w+:)?${name}>([^<]*)</(?:\\w+:)?${name}>`, 'u'))?.[1]?.trim();
  for (const block of xml.split(/<(?:\w+:)?infoTable>/u).slice(1)) {
    if (tag(block, 'putCall')) continue; // options, not shares
    const shares = Number(tag(block, 'sshPrnamt'));
    const value = Number(tag(block, 'value'));
    const type = tag(block, 'sshPrnamtType');
    if (type && type !== 'SH') continue; // bonds (PRN) skipped
    rows.push({ issuer: tag(block, 'nameOfIssuer'), cusip: tag(block, 'cusip'), shares, value });
  }
  return rows;
}

async function holdingsFor(cik, accession) {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/gu, '')}`;
  const index = await secGet(`${folder}/index.json`);
  const files = (index?.directory?.item || []).map((i) => i.name).filter((n) => /\.xml$/iu.test(n) && !/primary_doc/iu.test(n));
  if (!files.length) throw new Error(`no holdings file in ${accession}`);
  const xml = await secGet(`${folder}/${files[0]}`, 'text');
  return parseInfoTable(xml);
}

/** Sums rows by ticker: { TICKER: { shares, value } } and counts unmatched. */
function byTicker(rows, lookup) {
  const out = {};
  let unmatched = 0;
  for (const row of rows) {
    const ticker = lookup.get(normaliseIssuer(row.issuer));
    if (!ticker) { unmatched += 1; continue; }
    out[ticker] = out[ticker] || { shares: 0, value: 0, issuer: row.issuer };
    out[ticker].shares += Number.isFinite(row.shares) ? row.shares : 0;
    out[ticker].value += Number.isFinite(row.value) ? row.value : 0;
  }
  return { holdings: out, unmatched };
}

export async function refreshFunds() {
  const lookup = await nameToTicker();
  const funds = [];
  const positions = {}; // ticker -> [ { fund, ... } ]
  const failures = [];

  for (const fund of BIG_FUNDS) {
    try {
      const subs = await secGet(`https://data.sec.gov/submissions/CIK${String(fund.cik).padStart(10, '0')}.json`);
      if (!String(subs.name || '').toUpperCase().includes(fund.match)) {
        throw new Error(`SEC number ${fund.cik} belongs to "${subs.name}", not ${fund.name} — check src/data/bigFunds.js`);
      }
      const recent = subs.filings?.recent || {};
      const filings = (recent.form || [])
        .map((form, i) => ({ form, accession: recent.accessionNumber[i], filed: recent.filingDate[i], period: recent.reportDate[i] }))
        .filter((f) => f.form === '13F-HR')
        .sort((a, b) => String(b.period).localeCompare(String(a.period)) || String(b.filed).localeCompare(String(a.filed)));
      // newest filing per quarter
      const perQuarter = [];
      for (const f of filings) if (!perQuarter.some((p) => p.period === f.period)) perQuarter.push(f);
      if (!perQuarter.length) throw new Error('no 13F filings found');
      const [latest, previous] = perQuarter;

      const now = byTicker(await holdingsFor(fund.cik, latest.accession), lookup);
      const before = previous ? byTicker(await holdingsFor(fund.cik, previous.accession), lookup) : { holdings: {} };
      const total = Object.values(now.holdings).reduce((s, h) => s + h.value, 0);

      for (const [ticker, h] of Object.entries(now.holdings)) {
        const prev = before.holdings[ticker];
        let change = 'same';
        if (!previous) change = 'unknown';
        else if (!prev) change = 'new';
        else if (h.shares > prev.shares * 1.02) change = 'added';
        else if (h.shares < prev.shares * 0.98) change = 'reduced';
        (positions[ticker] = positions[ticker] || []).push({
          fund: fund.name, manager: fund.manager, shares: h.shares, value: h.value,
          prevShares: prev?.shares ?? null, change, shareOfFund: total ? h.value / total : null, period: latest.period,
        });
      }
      for (const [ticker, prev] of Object.entries(before.holdings)) {
        if (!now.holdings[ticker]) {
          (positions[ticker] = positions[ticker] || []).push({
            fund: fund.name, manager: fund.manager, shares: 0, value: 0,
            prevShares: prev.shares, change: 'sold', shareOfFund: 0, period: latest.period,
          });
        }
      }
      funds.push({ name: fund.name, manager: fund.manager, cik: fund.cik, period: latest.period, filed: latest.filed, holdings: Object.keys(now.holdings).length, unmatched: now.unmatched });
      console.log(`[funds] ${fund.name}: ${Object.keys(now.holdings).length} holdings for quarter to ${latest.period}${now.unmatched ? ` (${now.unmatched} names not matched to a ticker)` : ''}`);
    } catch (error) {
      failures.push({ fund: fund.name, reason: error.message });
      console.error(`[funds] ${fund.name}: failed — ${error.message}`);
    }
  }

  if (!funds.length) {
    return { ok: false, message: `No fund reports could be read (${failures.slice(0, 2).map((f) => `${f.fund}: ${f.reason}`).join('; ')})` };
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), funds, positions, failures }));
  await fs.rename(`${FILE}.tmp`, FILE);
  return { ok: true, message: `${funds.length} of ${BIG_FUNDS.length} funds read, ${Object.keys(positions).length} companies covered${failures.length ? `; failed: ${failures.map((f) => f.fund).join(', ')}` : ''}` };
}

/** Big-fund positions in one company, biggest first. */
export async function fundsForTicker(ticker) {
  try {
    const data = JSON.parse(await fs.readFile(FILE, 'utf8'));
    const rows = (data.positions?.[ticker] || []).slice().sort((a, b) => b.value - a.value);
    return { updatedAt: data.updatedAt, rows, fundsTracked: data.funds?.length || 0 };
  } catch {
    return { updatedAt: null, rows: [], fundsTracked: 0 };
  }
}
