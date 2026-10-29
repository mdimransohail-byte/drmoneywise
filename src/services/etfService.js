/* ════════════════════════════════════════════════════════════════════════
   ETF HOLDINGS — from the funds' own reports to the SEC (Form N-PORT),
   US government data, free to reuse.
   ───────────────────────────────────────────────────────────────────────
   1. Ticker → fund series: https://www.sec.gov/files/company_tickers_mf.json
   2. Latest holdings report for that series (EDGAR list, Atom format):
      https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=<seriesId>&type=NPORT-P&count=5&output=atom
   3. The report itself: <filing folder>/primary_doc.xml
   Funds file these monthly; the SEC publishes one per quarter, about 60
   days after the quarter ends, so holdings are a few months old (the page
   says the date).
   Saved under data/market/etfs/<TICKER>.json; curated ETFs are refreshed
   weekly by the data engine, others when first looked up (kept 7 days).
   Unit-trust ETFs (like SPY) and commodity trusts (like GLDM) do not file
   N-PORT; their pages say so and point to an equivalent.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { ETF_COMMODITY, ETF_LIST, MORE_ETFS } from '../data/etfList.js';

const UA = { 'User-Agent': 'Dr MoneyWise hello@drmoneywise.com', 'Accept-Encoding': 'gzip, deflate' };
const DIR = path.join(process.cwd(), 'data', 'market', 'etfs');
const MAP_FILE = path.join(process.cwd(), 'data', 'market', 'sec-funds.json');
const WEEK = 7 * 24 * 60 * 60 * 1000;
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });

export const CURATED_ETFS = [...ETF_LIST, ...MORE_ETFS];
export const getCuratedEtf = (ticker) => CURATED_ETFS.find((e) => e.ticker === ticker) || null;

export const ASSET_WORDS = {
  EC: 'Shares', EP: 'Preferred shares', DBT: 'Bonds', 'ABS-MBS': 'Mortgage bonds', 'ABS-ASSET BACKED SECURITIES': 'Asset-backed bonds',
  'ABS-O': 'Asset-backed bonds', 'ABS-CBDO': 'Asset-backed bonds', STIV: 'Cash and cash funds', RA: 'Cash and cash funds',
  DE: 'Derivatives', DIR: 'Derivatives', DFE: 'Derivatives', DCR: 'Derivatives', DCO: 'Derivatives', DO: 'Derivatives',
  RE: 'Property', COMM: 'Commodities', LON: 'Loans', OTHER: 'Other',
};
export const ISSUER_WORDS = {
  CORP: 'Companies', UST: 'US government', USGA: 'US government agencies', USGSE: 'US government agencies',
  MUN: 'US states and cities', NUSS: 'Other governments', PF: 'Private funds', RF: 'Other funds', OTHER: 'Other',
};

/* ── Ticker → series (SEC list, refreshed weekly) ─────────────────── */
async function getFundMap() {
  try {
    const saved = JSON.parse(await fs.readFile(MAP_FILE, 'utf8'));
    if (Date.now() - new Date(saved.updatedAt).getTime() < WEEK) return saved.map;
  } catch { /* first time */ }
  const response = await fetch('https://www.sec.gov/files/company_tickers_mf.json', { headers: UA });
  if (!response.ok) throw new Error(`HTTP ${response.status} from sec.gov (fund list)`);
  const json = await response.json();
  const fields = json.fields || ['cik', 'seriesId', 'classId', 'symbol'];
  const iCik = fields.indexOf('cik'); const iSeries = fields.indexOf('seriesId'); const iClass = fields.indexOf('classId'); const iSym = fields.indexOf('symbol');
  const map = {};
  for (const row of json.data || []) {
    const sym = String(row[iSym] || '').toUpperCase();
    if (sym) map[sym] = { cik: row[iCik], seriesId: row[iSeries], classId: row[iClass] };
  }
  await fs.mkdir(path.dirname(MAP_FILE), { recursive: true });
  await fs.writeFile(MAP_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), map }), 'utf8');
  return map;
}

export async function lookupFund(ticker) {
  const map = await getFundMap();
  return map[String(ticker || '').toUpperCase()] || null;
}

/* ── Holdings report ──────────────────────────────────────────────── */
const tag = (xml, name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`, 'u'))?.[1]?.trim() ?? '';
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const decode = (s) => String(s || '').replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&apos;/gu, "'").replace(/&#39;/gu, "'");

async function latestReportUrl(seriesId) {
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(seriesId)}&type=NPORT-P&dateb=&owner=include&count=5&output=atom`;
  const response = await fetch(url, { headers: UA });
  if (!response.ok) throw new Error(`HTTP ${response.status} from sec.gov (filing list)`);
  const atom = await response.text();
  const href = atom.match(/<filing-href>([^<]+)<\/filing-href>/u)?.[1] || atom.match(/href="(https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/[^"]+-index\.html?)"/u)?.[1];
  if (!href) return null;
  return `${href.slice(0, href.lastIndexOf('/'))}/primary_doc.xml`;
}

export function parseNport(xml, classId) {
  const gen = xml.match(/<genInfo>([\s\S]*?)<\/genInfo>/u)?.[1] || '';
  const fund = xml.match(/<fundInfo>([\s\S]*?)<\/fundInfo>/u)?.[1] || '';
  const returnsXml = [...xml.matchAll(/<monthlyTotReturn\b([^>]*)\/?>/gu)].map((m) => m[1]);
  const pickReturn = returnsXml.find((a) => classId && a.includes(`classId="${classId}"`)) || returnsXml[0] || '';
  const attr = (a, name) => num(a.match(new RegExp(`${name}="([^"]*)"`, 'u'))?.[1]);
  const holdings = [];
  for (const block of xml.split(/<invstOrSec>/u).slice(1)) {
    const body = block.split(/<\/invstOrSec>/u)[0];
    const pct = num(tag(body, 'pctVal'));
    if (pct === null) continue;
    holdings.push({
      name: decode(tag(body, 'name') || tag(body, 'title')),
      title: decode(tag(body, 'title')),
      ticker: body.match(/<ticker\s+value="([^"]*)"/u)?.[1] || '',
      cusip: tag(body, 'cusip'),
      pct,
      value: num(tag(body, 'valUSD')),
      asset: tag(body, 'assetCat') || (body.match(/<assetConditional\s+assetCat="([^"]*)"/u)?.[1] ?? 'OTHER'),
      issuer: tag(body, 'issuerCat') || (body.match(/<issuerConditional\s+issuerCat="([^"]*)"/u)?.[1] ?? 'OTHER'),
      country: tag(body, 'invCountry'),
    });
  }
  holdings.sort((a, b) => b.pct - a.pct);
  return {
    seriesName: decode(tag(gen, 'seriesName')),
    seriesId: tag(gen, 'seriesId'),
    asOf: tag(gen, 'repPdDate') || tag(gen, 'repPdEnd'),
    totalAssets: num(tag(fund, 'totAssets')),
    netAssets: num(tag(fund, 'netAssets')),
    returns: pickReturn ? [attr(pickReturn, 'rtn1'), attr(pickReturn, 'rtn2'), attr(pickReturn, 'rtn3')] : [],
    holdings,
  };
}

/** Keeps what the pages need (top 50 in full, everything else in brief). */
function summarise(ticker, fund, report, sourceUrl) {
  const h = report.holdings;
  const groupBy = (key, words) => {
    const out = {};
    for (const x of h) { const k = words[x[key]] || words.OTHER || 'Other'; out[k] = (out[k] || 0) + x.pct; }
    return Object.entries(out).map(([name, pct]) => ({ name, pct: Math.round(pct * 100) / 100 })).sort((a, b) => b.pct - a.pct);
  };
  const countries = {};
  for (const x of h) { const c = x.country || '—'; countries[c] = (countries[c] || 0) + x.pct; }
  let running = 0; let toHalf = 0;
  for (const x of h) { if (running >= 50) break; running += x.pct; toHalf += 1; }
  return {
    ticker,
    seriesId: fund.seriesId,
    name: report.seriesName,
    asOf: report.asOf,
    netAssets: report.netAssets,
    count: h.length,
    returns: report.returns,
    top: h.slice(0, 50).map(({ name, ticker: t, cusip, pct, asset, issuer, country }) => ({ key: t || cusip || name, name, ticker: t, pct, asset, issuer, country })),
    top10Share: Math.round(h.slice(0, 10).reduce((a, b) => a + b.pct, 0) * 10) / 10,
    toHalf: running >= 50 ? toHalf : null,
    assets: groupBy('asset', ASSET_WORDS),
    issuers: groupBy('issuer', ISSUER_WORDS),
    countries: Object.entries(countries).map(([code, pct]) => ({ code, pct: Math.round(pct * 100) / 100 })).sort((a, b) => b.pct - a.pct).slice(0, 15),
    // compact list for the members' overlap check: [key, pct]
    all: h.slice(0, 4000).map((x) => [x.ticker || x.cusip || x.name, Math.round(x.pct * 1000) / 1000]),
    source: sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}

const fileFor = (ticker) => path.join(DIR, `${ticker.replace(/[^A-Z0-9.-]/gu, '')}.json`);

export async function readEtf(ticker) {
  try { return JSON.parse(await fs.readFile(fileFor(ticker), 'utf8')); } catch { return null; }
}

/** Downloads (or reuses, if under a week old) one ETF's latest holdings. */
export async function getEtfData(ticker, { force = false } = {}) {
  const t = String(ticker || '').toUpperCase().replace(/[^A-Z0-9.-]/gu, '').slice(0, 10);
  if (!t) return null;
  const saved = await readEtf(t);
  if (!force && saved && Date.now() - new Date(saved.fetchedAt || saved.checkedAt || 0).getTime() < WEEK) return saved;
  const curated = getCuratedEtf(t);
  if (curated?.sameAs || ETF_COMMODITY[t]) return saved || { ticker: t, noReport: true, checkedAt: new Date().toISOString() };
  try {
    const fund = await lookupFund(t);
    if (!fund) {
      const out = { ticker: t, notFund: true, checkedAt: new Date().toISOString() };
      await writeEtf(t, out);
      return out;
    }
    await pause(150);
    const url = await latestReportUrl(fund.seriesId);
    if (!url) {
      const out = { ticker: t, seriesId: fund.seriesId, noReport: true, checkedAt: new Date().toISOString() };
      await writeEtf(t, out);
      return out;
    }
    await pause(150);
    const response = await fetch(url, { headers: UA });
    if (!response.ok) throw new Error(`HTTP ${response.status} from sec.gov (holdings report)`);
    const report = parseNport(await response.text(), fund.classId);
    if (!report.holdings.length) throw new Error('holdings report had no holdings');
    const out = summarise(t, fund, report, url);
    await writeEtf(t, out);
    console.log(`[etfs] ${t}: ${out.count} holdings as of ${out.asOf}`);
    return out;
  } catch (error) {
    console.error(`[etfs] ${t}: failed — ${error.message}${saved ? ' (last good figures kept)' : ''}`);
    return saved || { ticker: t, error: error.message, checkedAt: new Date().toISOString() };
  }
}

async function writeEtf(t, data) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(`${fileFor(t)}.tmp`, JSON.stringify(data), 'utf8');
  await fs.rename(`${fileFor(t)}.tmp`, fileFor(t));
}

/** Weekly job: refresh every curated ETF. */
export async function refreshEtfs() {
  let ok = 0; const failed = [];
  const { worldEtfTickers } = await import('../data/worldStocks.js');
  for (const t of worldEtfTickers()) { await getEtfData(t, { force: true }).catch(() => null); await pause(300); }
  // Shariah funds and ETFs (for /shariah)
  const { SHARIAH_FUNDS } = await import('../data/shariahData.js');
  for (const f of SHARIAH_FUNDS.filter((x) => x.sec)) { await getEtfData(f.ticker, { force: true }).catch(() => null); await pause(300); }
  for (const e of CURATED_ETFS) {
    if (e.sameAs || ETF_COMMODITY[e.ticker]) continue;
    const d = await getEtfData(e.ticker, { force: true });
    if (d?.count && !d.error) ok += 1; else failed.push(e.ticker);
    await pause(300);
  }
  const total = CURATED_ETFS.filter((e) => !e.sameAs && !ETF_COMMODITY[e.ticker]).length;
  if (!ok) return { ok: false, message: `No ETF holdings could be downloaded from the SEC (${failed.join(', ')})` };
  return { ok: true, message: `${ok} of ${total} ETFs updated${failed.length ? `; failed: ${failed.join(', ')}` : ''}` };
}

/** Members: how much two ETFs hold in common (sum of the smaller weight). */
export function overlap(a, b) {
  if (!a?.all?.length || !b?.all?.length) return null;
  const mb = new Map(b.all);
  let shared = 0; let count = 0;
  const both = [];
  for (const [key, pa] of a.all) {
    const pb = mb.get(key);
    if (pb !== undefined) { const m = Math.min(pa, pb); shared += m; count += 1; both.push({ key, a: pa, b: pb, m }); }
  }
  both.sort((x, y) => y.m - x.m);
  const nameOf = new Map([...(a.top || []), ...(b.top || [])].map((x) => [x.key || x.ticker || x.name, x.name]));
  return {
    sharedPct: Math.min(100, Math.round(shared * 10) / 10),
    count,
    top: both.slice(0, 10).map((x) => ({ name: nameOf.get(x.key) || x.key, a: x.a, b: x.b })),
  };
}
