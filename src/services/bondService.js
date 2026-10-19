/* ════════════════════════════════════════════════════════════════════════
   GOVERNMENT BOND YIELDS — free official sources, commercial use allowed.
   ───────────────────────────────────────────────────────────────────────
   US — US Treasury daily par yield curve (public domain), one XML per year:
     https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=YYYY
     Past years are kept once downloaded; only this year and last year are
     downloaded again.
   Others — OECD Financial market indicators, monthly 10-year (IRLT) and
     3-month (IR3TIB) interest rates:
     https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_FINMARK/GBR+DEU.M.IRLT+IR3TIB.PA._Z._Z._Z._Z.N?startPeriod=2014-01&format=csvfile
   Saved to data/market/bonds.json. Refreshed weekly by the data engine.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { BOND_PLACES, US_MATURITIES } from '../data/bondList.js';

const UA = { 'User-Agent': 'Dr MoneyWise (hello@drmoneywise.com)' };
const FILE = path.join(process.cwd(), 'data', 'market', 'bonds.json');
const YEARS = 11;

export async function readBonds() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { updatedAt: null, us: null, oecd: {}, usYears: {} }; }
}

/* ── US Treasury ──────────────────────────────────────────────────── */
async function fetchTreasuryYear(year) {
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
  const response = await fetch(url, { headers: UA });
  if (!response.ok) throw new Error(`HTTP ${response.status} from home.treasury.gov (${year})`);
  const xml = await response.text();
  const days = [];
  for (const entry of xml.split(/<m:properties>/u).slice(1)) {
    const date = entry.match(/<d:NEW_DATE[^>]*>(\d{4}-\d{2}-\d{2})/u)?.[1];
    if (!date) continue;
    const row = { d: date };
    for (const [key, tag] of US_MATURITIES) {
      const v = Number(entry.match(new RegExp(`<d:${tag}[^>]*>([\\d.]+)<`, 'u'))?.[1]);
      if (Number.isFinite(v) && v > 0) row[key] = v;
    }
    if (row['10Y']) days.push(row);
  }
  return days.sort((a, b) => a.d.localeCompare(b.d));
}

function monthEnds(days) {
  const byMonth = {};
  for (const day of days) byMonth[day.d.slice(0, 7)] = day; // last day wins (sorted)
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([p, day]) => ({ p, ...day }));
}

/* ── OECD ─────────────────────────────────────────────────────────── */
function parseCsv(text) {
  const lines = text.split(/\r?\n/u).filter(Boolean);
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0] || '').map((h) => h.trim().replace(/^﻿/u, ''));
  return lines.slice(1).map((l) => { const c = split(l); return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])); });
}

async function fetchOecdOnce(codes) {
  const start = `${new Date().getUTCFullYear() - YEARS}-01`;
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_FINMARK/${codes.join('+')}.M.IRLT+IR3TIB.PA._Z._Z._Z._Z.N?startPeriod=${start}&format=csvfile`;
  const response = await fetch(url, { headers: { ...UA, Accept: 'application/vnd.sdmx.data+csv; charset=utf-8' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from sdmx.oecd.org`);
  const rows = parseCsv(await response.text());
  const out = {};
  for (const r of rows) {
    const key = r.MEASURE === 'IRLT' ? 'long' : r.MEASURE === 'IR3TIB' ? 'short' : null;
    const v = Number(r.OBS_VALUE);
    if (!key || !r.REF_AREA || !/^\d{4}-\d{2}$/u.test(r.TIME_PERIOD) || r.OBS_VALUE === '' || !Number.isFinite(v)) continue;
    out[r.REF_AREA] = out[r.REF_AREA] || { long: [], short: [] };
    out[r.REF_AREA][key].push({ p: r.TIME_PERIOD, v: Math.round(v * 1000) / 1000 });
  }
  for (const set of Object.values(out)) { set.long.sort((a, b) => a.p.localeCompare(b.p)); set.short.sort((a, b) => a.p.localeCompare(b.p)); }
  return out;
}

async function fetchOecd(codes) {
  try {
    return await fetchOecdOnce(codes);
  } catch (error) {
    console.log(`[bonds] OECD all-in-one request failed (${error.message}); trying each country`);
    const out = {};
    for (const code of codes) {
      try { Object.assign(out, await fetchOecdOnce([code])); } catch (e) { console.log(`[bonds] OECD ${code}: no data (${e.message})`); }
    }
    if (!Object.keys(out).length) throw error;
    return out;
  }
}

/* ── Refresh (weekly job) ─────────────────────────────────────────── */
export async function refreshBonds() {
  const existing = await readBonds();
  const usYears = { ...(existing.usYears || {}) };
  const failures = [];
  const now = new Date().getUTCFullYear();
  const recentDays = {};
  for (let y = now - YEARS + 1; y <= now; y += 1) {
    if (usYears[y]?.length && y < now - 1) continue; // old years never change
    try {
      const days = await fetchTreasuryYear(y);
      if (days.length) usYears[y] = monthEnds(days);
      if (y >= now - 1) recentDays[y] = days;
    } catch (error) {
      failures.push({ source: `US Treasury ${y}`, reason: error.message });
      console.error(`[bonds] US Treasury ${y}: failed — ${error.message}`);
    }
  }
  const lastYearOfDays = [...(recentDays[now - 1] || []), ...(recentDays[now] || [])].slice(-270);

  let oecd = existing.oecd || {};
  try {
    const fresh = await fetchOecd(BOND_PLACES.map((p) => p.oecd).filter(Boolean));
    oecd = { ...oecd, ...fresh };
    console.log(`[bonds] OECD: ${Object.keys(fresh).length} countries`);
  } catch (error) {
    failures.push({ source: 'OECD interest rates', reason: error.message });
    console.error(`[bonds] OECD interest rates: failed — ${error.message} (last good figures kept)`);
  }

  for (const key of Object.keys(usYears)) if (!/^\d{4}$/u.test(key)) delete usYears[key];
  const usMonthly = Object.keys(usYears).sort().flatMap((k) => usYears[k]);
  const latestDays = lastYearOfDays.length ? lastYearOfDays : existing.us?.days || [];
  if (!usMonthly.length && !Object.keys(oecd).length) {
    return { ok: false, message: `No bond figures could be downloaded (${failures.map((f) => `${f.source}: ${f.reason}`).join('; ')})` };
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), usYears, us: { monthly: usMonthly, days: latestDays }, oecd, failures }), 'utf8');
  await fs.rename(`${FILE}.tmp`, FILE);
  const covered = BOND_PLACES.filter((p) => (p.us && usMonthly.length) || oecd[p.oecd]?.long?.length).length;
  return { ok: true, message: `Bond yields for ${covered} of ${BOND_PLACES.length} countries${failures.length ? `; ${failures.length} failed (${failures.map((f) => f.source).join(', ')})` : ''}` };
}

/* ── Figures for the pages ────────────────────────────────────────── */
/** One place's monthly 10-year and 3-month series: [{ p, v }]. */
export function bondSeries(place, data) {
  if (place.us && data.us?.monthly?.length) {
    return {
      long: data.us.monthly.filter((m) => m['10Y']).map((m) => ({ p: m.p, v: m['10Y'] })),
      short: data.us.monthly.filter((m) => m['3M']).map((m) => ({ p: m.p, v: m['3M'] })),
      source: 'treasury',
    };
  }
  const o = data.oecd?.[place.oecd];
  if (o?.long?.length) return { long: o.long, short: o.short || [], source: 'oecd' };
  return null;
}

/** Price change of a newly issued bond if yields move by `shift` points. */
export function priceChange(years, yieldPct, shift) {
  const c = yieldPct / 100; const y = (yieldPct + shift) / 100; const n = years * 2;
  let price = 0;
  for (let t = 1; t <= n; t += 1) price += (c / 2) * 100 / (1 + y / 2) ** t;
  price += 100 / (1 + y / 2) ** n;
  return price - 100;
}
