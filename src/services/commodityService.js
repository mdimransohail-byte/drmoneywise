/* ════════════════════════════════════════════════════════════════════════
   COMMODITY PRICES — World Bank "Pink Sheet" monthly prices (CC BY 4.0).
   ───────────────────────────────────────────────────────────────────────
   The World Bank publishes one Excel file with monthly average prices
   since 1960, updated early each month. Its web address changes each year,
   so we read the current link from the Commodity Markets page first:
     https://www.worldbank.org/en/research/commodity-markets
   and fall back to the last known address:
     https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx
   Saved to data/market/commodities.json. Refreshed weekly by the data
   engine (so a new month appears within days of release). If the
   download fails, the last good prices are kept.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { COMMODITIES } from '../data/commodityList.js';
import { readSheet } from '../utils/xlsx.js';

const UA = { 'User-Agent': 'Dr MoneyWise (hello@drmoneywise.com)' };
const PAGE = 'https://www.worldbank.org/en/research/commodity-markets';
const FALLBACK = 'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx';
const FILE = path.join(process.cwd(), 'data', 'market', 'commodities.json');

export async function readCommodities() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { updatedAt: null, items: {} }; }
}

async function findFileUrl() {
  try {
    const response = await fetch(PAGE, { headers: { ...UA, Accept: 'text/html' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const link = html.match(/https?:\/\/thedocs\.worldbank\.org\/[^"'\s<>]*CMO-Historical-Data-Monthly\.xlsx/iu)?.[0];
    if (link) return link.replace(/^http:/u, 'https:');
    console.log('[commodities] Link not found on the World Bank page; using the last known address');
  } catch (error) {
    console.log(`[commodities] Could not read the World Bank page (${error.message}); using the last known address`);
  }
  return FALLBACK;
}

/** Turns the World Bank sheet into { slug: { unit, series: [{ p: 'YYYY-MM', v }] } }. */
export function parsePinkSheet(rows) {
  const headerIndex = rows.findIndex((r) => (r || []).some((c) => typeof c === 'string' && c.trim() === 'Gold'));
  if (headerIndex < 0) throw new Error('could not find the heading row (format may have changed)');
  // Excel rows can have gaps (empty cells); Array.from fills them so every
  // column has text (the World Bank file's first heading cell is empty).
  const header = Array.from(rows[headerIndex], (c) => String(c ?? '').trim());
  const units = Array.from(rows[headerIndex + 1] || [], (c) => String(c ?? '').trim());
  const data = rows.slice(headerIndex + 1).filter((r) => /^\d{4}M\d{2}$/u.test(String(r?.[0] ?? '').trim()));
  if (!data.length) throw new Error('no monthly rows found');
  const out = {};
  const missing = [];
  for (const c of COMMODITIES) {
    const col = header.findIndex((h) => String(h || '').toLowerCase().startsWith(String(c.pink || c.name).toLowerCase()));
    if (col < 0) { missing.push(c.name); continue; }
    const series = data.map((r) => ({ p: `${String(r[0]).slice(0, 4)}-${String(r[0]).slice(5, 7)}`, v: Number(r[col]) }))
      .filter((x) => Number.isFinite(x.v) && x.v > 0)
      .map((x) => ({ p: x.p, v: Math.round(x.v * 1000) / 1000 }));
    if (series.length) out[c.slug] = { unit: units[col] || '', heading: header[col], series };
    else missing.push(c.name);
  }
  return { items: out, missing };
}

export async function refreshCommodities({ manual = false } = {}) {
  // Monthly figures: skip the download while last month's prices are saved
  if (!manual) {
    const saved = await readCommodities();
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    if (saved.latest && saved.latest >= lastMonth && Date.now() - new Date(saved.updatedAt || 0).getTime() < 32 * 86400000) {
      return { ok: true, skipped: true, message: `Up to date: prices for ${saved.latest} already saved` };
    }
  }
  const url = await findFileUrl();
  const response = await fetch(url, { headers: UA });
  if (!response.ok) return { ok: false, message: `World Bank file download failed: HTTP ${response.status} (${url})` };
  const buffer = Buffer.from(await response.arrayBuffer());
  let parsed;
  try {
    const rows = readSheet(buffer, /monthly prices/iu);
    parsed = parsePinkSheet(rows);
  } catch (error) {
    return { ok: false, message: `Could not read the World Bank file: ${error.message}` };
  }
  const count = Object.keys(parsed.items).length;
  if (!count) return { ok: false, message: 'World Bank file had none of our commodities (format may have changed)' };
  const existing = await readCommodities();
  const latest = Object.values(parsed.items).map((x) => x.series.at(-1)?.p).sort().at(-1);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), source: url, latest, items: { ...existing.items, ...parsed.items }, missing: parsed.missing }), 'utf8');
  await fs.rename(`${FILE}.tmp`, FILE);
  console.log(`[commodities] ${count} commodities updated to ${latest}${parsed.missing.length ? `; not found in the file: ${parsed.missing.join(', ')}` : ''}`);
  return { ok: true, message: `${count} of ${COMMODITIES.length} commodities updated (latest month ${latest})${parsed.missing.length ? `; missing: ${parsed.missing.join(', ')}` : ''}` };
}

/* ── Figures worked out for the pages ─────────────────────────────── */
const pctChange = (a, b) => (a && b ? ((b / a) - 1) * 100 : null);

export function commodityFacts(series) {
  if (!series?.length) return null;
  const latest = series.at(-1);
  const at = (back) => series[series.length - 1 - back] || null;
  const last12 = series.slice(-12);
  const high12 = last12.reduce((m, x) => (x.v > m.v ? x : m), last12[0]);
  const low12 = last12.reduce((m, x) => (x.v < m.v ? x : m), last12[0]);
  const allHigh = series.reduce((m, x) => (x.v > m.v ? x : m), series[0]);
  return {
    latest,
    month: pctChange(at(1)?.v, latest.v),
    year: pctChange(at(12)?.v, latest.v),
    fiveYear: pctChange(at(60)?.v, latest.v),
    tenYear: pctChange(at(120)?.v, latest.v),
    high12, low12, allHigh,
    fromHigh: pctChange(allHigh.v, latest.v),
  };
}

/** Members-only extras, all worked out from the monthly prices. */
export function commodityDeeper(series) {
  if (!series?.length || series.length < 36) return null;
  // Yearly averages (full calendar years)
  const years = {};
  for (const x of series) (years[x.p.slice(0, 4)] = years[x.p.slice(0, 4)] || []).push(x.v);
  const yearly = Object.entries(years).filter(([, v]) => v.length === 12).map(([y, v]) => ({ p: y, v: v.reduce((a, b) => a + b, 0) / 12 }));
  const yearlyChange = [];
  for (let i = 1; i < yearly.length; i += 1) yearlyChange.push({ p: yearly[i].p, v: pctChange(yearly[i - 1].v, yearly[i].v) });
  const best = [...yearlyChange].sort((a, b) => b.v - a.v).slice(0, 5);
  const worst = [...yearlyChange].sort((a, b) => a.v - b.v).slice(0, 5);
  // Monthly moves over the last 20 years
  const recent = series.slice(-241);
  const moves = [];
  for (let i = 1; i < recent.length; i += 1) moves.push({ p: recent[i].p, v: pctChange(recent[i - 1].v, recent[i].v) });
  const avg = moves.reduce((a, b) => a + b.v, 0) / (moves.length || 1);
  const sd = Math.sqrt(moves.reduce((a, b) => a + (b.v - avg) ** 2, 0) / (moves.length || 1));
  const biggestRise = moves.reduce((m, x) => (x.v > m.v ? x : m), moves[0]);
  const biggestFall = moves.reduce((m, x) => (x.v < m.v ? x : m), moves[0]);
  // Seasonality: average change in each calendar month
  const byMonth = Array.from({ length: 12 }, () => []);
  for (const m of moves) byMonth[Number(m.p.slice(5, 7)) - 1].push(m.v);
  const seasonal = byMonth.map((list, i) => ({ p: String(i + 1).padStart(2, '0'), v: list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0, n: list.length }));
  const upShare = moves.length ? (moves.filter((m) => m.v > 0).length / moves.length) * 100 : null;
  // What $1,000 would be worth now
  const latest = series.at(-1).v;
  const whatIf = [5, 10, 20, 30].map((y) => {
    const then = series[series.length - 1 - y * 12];
    return then ? { years: y, from: then.p, value: (1000 * latest) / then.v } : null;
  }).filter(Boolean);
  return {
    firstMonth: series[0].p,
    yearly: yearly.map((x) => ({ p: x.p, v: Math.round(x.v * 100) / 100 })),
    best, worst, typicalMove: sd, biggestRise, biggestFall, seasonal, upShare, whatIf,
    months: moves.length,
  };
}
