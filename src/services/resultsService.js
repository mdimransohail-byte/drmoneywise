/* ════════════════════════════════════════════════════════════════════════
   COMPANY RESULTS — spotted the day a company reports, explained simply.
   ───────────────────────────────────────────────────────────────────────
   When a US company announces results it files a Form 8-K with "Item 2.02
   Results of Operations" and attaches its press release (usually exhibit
   99.1). Every hour we check the SEC's filing lists for each company we
   cover (src/data/stockUniverse.js):
     https://data.sec.gov/submissions/CIK##########.json
   For each new results filing we read the press release and our writing
   service turns it into:
     • headline + "In simple words" (3–4 sentences) + key numbers  → FREE
     • "What it means" (what changed, what the company expects)     → PREMIUM
   Only figures the company itself states are used; nothing is predicted
   and nobody is told to buy or sell. SEC filings are public.
   Saved to data/market/results.json (newest first, last 300 kept).
   No writing key saved = the result is still listed, with a link to the
   company's announcement.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { getUniverse } from '../data/stockUniverse.js';
import { getTickerMapCached, secFetchJson, userAgent } from './secService.js';

const FILE = path.join(process.cwd(), 'data', 'market', 'results.json');
const LOOKBACK_DAYS = 10;
const KEEP = 300;
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });

let cache = (() => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { updatedAt: null, items: [] }; } })();

export const readResults = () => cache;
export const resultsFor = (ticker) => (cache.items || []).filter((r) => r.ticker === ticker);
export const latestResults = (n = 12, days = 21) => (cache.items || [])
  .filter((r) => Date.now() - new Date(`${r.filed}T00:00:00Z`).getTime() < days * 86400000)
  .slice(0, n);

async function save() {
  await fsp.mkdir(path.dirname(FILE), { recursive: true });
  await fsp.writeFile(`${FILE}.tmp`, JSON.stringify(cache), 'utf8');
  await fsp.rename(`${FILE}.tmp`, FILE);
}

/* ── Reading the press release ────────────────────────────────────── */
async function secText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'text/html,application/json' } });
  if (!response.ok) throw new Error(`SEC returned HTTP ${response.status} for ${url}`);
  return response.text();
}

export function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/giu, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/giu, '\n')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/giu, ' ')
    .replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&#39;|&rsquo;|&#8217;/gu, '’')
    .replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/gu, ' ')
    .replace(/\n\s*\n+/gu, '\n')
    .trim();
}

/** Finds the press release (exhibit 99.1) inside a filing folder. */
async function pressReleaseUrl(cik, acc, primaryDoc) {
  const folder = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}`;
  try {
    const index = JSON.parse(await secText(`${folder}/index.json`));
    const files = (index?.directory?.item || []).filter((f) => /\.html?$/iu.test(f.name) && f.name !== primaryDoc && !/index/iu.test(f.name));
    const named = files.find((f) => /ex[-_]?99|exhibit[-_]?99|ex991|press|earnings|release/iu.test(f.name));
    const pick = named || files.sort((a, b) => Number(b.size || 0) - Number(a.size || 0))[0];
    if (pick) return `${folder}/${pick.name}`;
  } catch (error) {
    console.log(`[results] filing index not readable (${error.message}); using the main filing`);
  }
  return primaryDoc ? `${folder}/${primaryDoc}` : null;
}

/* ── One new result ───────────────────────────────────────────────── */
async function buildResult({ ticker, name, cik, acc, filed, primaryDoc }) {
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${primaryDoc || ''}`;
  const base = { id: acc, ticker, name, filed, filingUrl, url: filingUrl, headline: `${name} reported results`, simple: null, numbers: [], impact: null, foundAt: new Date().toISOString() };
  try {
    const url = await pressReleaseUrl(cik, acc, primaryDoc);
    if (!url) return base;
    await pause(200);
    const text = htmlToText(await secText(url)).slice(0, 16000);
    base.url = url;
    if (text.length < 400) return base;
    const { explainResults } = await import('./writerService.js');
    const written = await explainResults({ company: name, ticker, text });
    if (!written) return base;
    const { checkNewsText } = await import('./qualityService.js');
    const issues = checkNewsText([written.headline, written.simple, written.impact, ...written.numbers.map((n) => `${n.label} ${n.value} ${n.change}`)].join('\n'));
    if (issues.length) {
      console.log(`[results] ${ticker}: explanation held back (${issues.join('; ')}); listed with a link only`);
      return base;
    }
    return { ...base, ...written, writtenAt: new Date().toISOString() };
  } catch (error) {
    console.error(`[results] ${ticker}: could not read the announcement — ${error.message}`);
    return base;
  }
}

/** Hourly job: looks for new results filings from every company we cover. */
export async function checkResults() {
  const map = await getTickerMapCached();
  const known = new Set([...(cache.items || []).map((r) => r.id), ...(cache.seen || [])]);
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10);
  const found = [];
  // Company bosses' trades (Form 4): looked for in the same filing lists
  const { insiderSeen, processInsiderFilings } = await import('./insiderService.js');
  const insiderKnown = await insiderSeen();
  const insiderSince = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const form4s = [];
  let checked = 0; let failed = 0;
  for (const ticker of getUniverse()) {
    const match = map[ticker];
    if (!match) continue;
    try {
      const sub = await secFetchJson(`https://data.sec.gov/submissions/CIK${String(match.cik).padStart(10, '0')}.json`);
      checked += 1;
      const r = sub?.filings?.recent;
      for (let i = 0; i < (r?.form?.length || 0); i += 1) {
        if (r.filingDate[i] < insiderSince) break;
        if (r.form[i] === '4') {
          const acc4 = String(r.accessionNumber[i]).replace(/-/gu, '');
          if (!insiderKnown.has(acc4)) form4s.push({ ticker, name: sub.name || match.name || ticker, cik: match.cik, acc: acc4, filed: r.filingDate[i], primaryDoc: r.primaryDocument?.[i] || '' });
          continue;
        }
        if (r.filingDate[i] < since) continue;
        const items = String(r.items?.[i] || '').split(',').map((x) => x.trim());
        if (r.form[i] !== '8-K') continue;
        const isResults = items.includes('2.02');
        // Other announcements (items 7.01 / 8.01) are read only to spot dividends
        if (!isResults && !items.includes('7.01') && !items.includes('8.01')) continue;
        const acc = String(r.accessionNumber[i]).replace(/-/gu, '');
        if (known.has(acc)) continue;
        known.add(acc);
        const { cleanName } = await import('./secService.js');
        found.push({ ticker, name: cleanName(sub.name || match.name || ticker), cik: match.cik, acc, filed: r.filingDate[i], primaryDoc: r.primaryDocument?.[i] || '', kind: isResults ? 'results' : 'other' });
      }
    } catch (error) {
      failed += 1;
      if (failed <= 3) console.log(`[results] ${ticker}: filing list not available (${error.message})`);
    }
    await pause(150);
  }
  let written = 0;
  let dividends = 0;
  for (const f of found.filter((x) => x.kind === 'other')) {
    const d = await checkDividend(f);
    if (d) dividends += 1;
    await pause(250);
  }
  for (const f of found.filter((x) => x.kind === 'results')) {
    const result = await buildResult(f);
    if (result.dividend) await addDividend({ id: f.acc, ticker: f.ticker, name: f.name, filed: f.filed, url: result.url, ...result.dividend });
    if (result.simple) written += 1;
    cache = { updatedAt: new Date().toISOString(), items: [result, ...(cache.items || []).filter((x) => x.id !== result.id)].sort((a, b) => String(b.filed).localeCompare(String(a.filed))).slice(0, KEEP) };
    await save();
    console.log(`[results] ${f.ticker}: results filed ${f.filed}${result.simple ? ' — explained' : ' — listed with a link'}`);
    await pause(300);
  }
  if (!found.length) { cache.updatedAt = new Date().toISOString(); }
  // Remember announcements already read, so they are not read again
  cache.seen = [...new Set([...(cache.seen || []), ...found.map((f) => f.acc)])].slice(-3000);
  await save();
  let insiderNote = '';
  if (form4s.length) {
    const { cleanName } = await import('./secService.js');
    const ins = await processInsiderFilings(form4s.map((f) => ({ ...f, name: cleanName(f.name) }))).catch((error) => { console.error(`[insiders] failed — ${error.message}`); return null; });
    if (ins) insiderNote = `; ${ins.added} bosses' trades saved${ins.waiting ? ` (${ins.waiting} filings waiting)` : ''}`;
  }
  if (!checked) return { ok: false, message: 'Could not read any SEC filing lists' };
  const nResults = found.filter((x) => x.kind === 'results').length;
  return { ok: true, message: `${checked} companies checked; ${nResults} new results (${written} explained); ${dividends} dividend announcements${insiderNote}${failed ? `; ${failed} lists failed` : ''}` };
}

/* ── Dividends (for dividend alerts) ──────────────────────────────── */
export const readDividends = () => cache.dividends || [];

async function addDividend(event) {
  cache.dividends = [event, ...(cache.dividends || []).filter((x) => x.id !== event.id)].slice(0, 400);
  await save();
}

async function checkDividend(f) {
  try {
    const url = await pressReleaseUrl(f.cik, f.acc, f.primaryDoc);
    if (!url) return null;
    await pause(200);
    const text = htmlToText(await secText(url)).slice(0, 9000);
    if (!/dividend/iu.test(text.slice(0, 5000))) return null;
    const { explainDividend } = await import('./writerService.js');
    const d = await explainDividend({ company: f.name, ticker: f.ticker, text });
    if (!d) return null;
    await addDividend({ id: f.acc, ticker: f.ticker, name: f.name, filed: f.filed, url, ...d });
    console.log(`[results] ${f.ticker}: dividend ${d.action}${d.amount ? ` (${d.amount})` : ''}`);
    return d;
  } catch (error) {
    console.log(`[results] ${f.ticker}: announcement not readable (${error.message})`);
    return null;
  }
}

/** Premium: "What it means" for the given result ids. */
export function impactsFor(ids) {
  const want = new Set(ids);
  return Object.fromEntries((cache.items || []).filter((r) => want.has(r.id) && r.impact).map((r) => [r.id, r.impact]));
}
