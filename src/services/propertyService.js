/* ════════════════════════════════════════════════════════════════════════
   PROPERTY DATA — official, free sources that allow use on a commercial
   site with credit (checked 19 October 2026). Refreshed weekly by the data
   engine; most sources publish monthly or quarterly.
   ───────────────────────────────────────────────────────────────────────
   House prices (all places except Dubai) — Bank for International
     Settlements (BIS), one request for every country:
     https://stats.bis.org/api/v1/data/WS_SPP/Q.US+GB+….N+R.628+771/all?format=csv
       N = before inflation, R = after inflation; 628 = index, 771 = % vs a year ago
     Terms: free use incl. commercial "provided … no additional charge to
     subscribers" → property pages stay FREE for everyone. Cite the BIS.

   Rents + prices compared with incomes and rents — OECD analytical house
     price indicators (OECD members only; others are simply left out):
     https://sdmx.oecd.org/public/rest/data/OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES/USA+GBR.Q.RPI+HPI_YDH_AVG+HPI_RPI_AVG.?format=csvfile
     Terms: any use incl. commercial, with credit to the OECD.

   US rents — BLS API v1, CUSR0000SEHA (rent of primary residence), no key.
   UK £ prices — HM Land Registry UK HPI, Open Government Licence v3.0:
     https://landregistry.data.gov.uk/data/ukhpi/region/united-kingdom.json
   Dubai — typed in by Admin → Property from the Land Department's public
     announcements (its open-data files carry no clear reuse licence).

   Saved to data/market/property.json (Railway volume). If a source fails,
   the last good figures are kept and the failure shows in Health + logs.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { PROPERTY_PLACES } from '../data/propertyPlaces.js';
import { listSheets, readSheet } from '../utils/xlsx.js';

const UA = { 'User-Agent': 'Dr MoneyWise (hello@drmoneywise.com)' };
const marketDir = path.join(process.cwd(), 'data', 'market');
const FILE = path.join(marketDir, 'property.json');
const MANUAL_FILE = path.join(marketDir, 'property-manual.json');
const YEARS_BACK = 12;

/* ── Files ─────────────────────────────────────────────────────────── */
async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, data) {
  await fs.mkdir(marketDir, { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fs.rename(tmp, file);
}
export const readProperty = () => readJson(FILE, { updatedAt: null, places: {}, failures: [] });
export const readPropertyManual = () => readJson(MANUAL_FILE, { dubai: { rows: [] } });

/* ── Small CSV reader (handles quoted fields) ─────────────────────── */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== '')) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim().replace(/^﻿/u, ''));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
}

async function getText(url, accept = 'text/csv') {
  const response = await fetch(url, { headers: { ...UA, Accept: accept } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.text();
}

const startQuarter = () => `${new Date().getUTCFullYear() - YEARS_BACK}-Q1`;
const byPeriod = (a, b) => a.p.localeCompare(b.p);

/* ── BIS: house prices ─────────────────────────────────────────────── */
async function fetchBis(codes) {
  const url = `https://stats.bis.org/api/v1/data/WS_SPP/Q.${codes.join('+')}.N+R.628+771/all?startPeriod=${startQuarter()}&format=csv`;
  const rows = parseCsv(await getText(url));
  const out = {};
  const name = { 'N.628': 'nominal', 'R.628': 'real', 'N.771': 'yoy', 'R.771': 'realYoy' };
  for (const r of rows) {
    const key = name[`${r.VALUE}.${r.UNIT_MEASURE}`];
    const v = Number(r.OBS_VALUE);
    if (!key || !r.REF_AREA || !/^\d{4}-Q[1-4]$/u.test(r.TIME_PERIOD) || r.OBS_VALUE === '' || !Number.isFinite(v)) continue;
    out[r.REF_AREA] = out[r.REF_AREA] || { nominal: [], real: [], yoy: [], realYoy: [] };
    out[r.REF_AREA][key].push({ p: r.TIME_PERIOD, v: Math.round(v * 100) / 100 });
  }
  for (const set of Object.values(out)) for (const list of Object.values(set)) list.sort(byPeriod);
  return out;
}

/* ── OECD: rents and price ratios ─────────────────────────────────── */
async function fetchOecd(codes) {
  try {
    return await fetchOecdOnce(codes);
  } catch (error) {
    // One unknown country code can make the whole request fail — try one by one
    console.log(`[property] OECD all-in-one request failed (${error.message}); trying each country`);
    const out = {};
    for (const code of codes) {
      try { Object.assign(out, await fetchOecdOnce([code])); } catch (e) { console.log(`[property] OECD ${code}: no data (${e.message})`); }
    }
    if (!Object.keys(out).length) throw error;
    return out;
  }
}

async function fetchOecdOnce(codes) {
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES/${codes.join('+')}.Q.RPI+HPI_YDH_AVG+HPI_RPI_AVG.?startPeriod=${startQuarter()}&format=csvfile`;
  const rows = parseCsv(await getText(url, 'application/vnd.sdmx.data+csv; charset=utf-8'));
  const name = { RPI: 'rent', HPI_YDH_AVG: 'priceToIncome', HPI_RPI_AVG: 'priceToRent' };
  const out = {};
  for (const r of rows) {
    const key = name[r.MEASURE];
    const v = Number(r.OBS_VALUE);
    if (!key || !r.REF_AREA || !/^\d{4}-Q[1-4]$/u.test(r.TIME_PERIOD) || r.OBS_VALUE === '' || !Number.isFinite(v)) continue;
    out[r.REF_AREA] = out[r.REF_AREA] || { rent: [], priceToIncome: [], priceToRent: [] };
    out[r.REF_AREA][key].push({ p: r.TIME_PERIOD, v: Math.round(v * 100) / 100 });
  }
  for (const set of Object.values(out)) for (const list of Object.values(set)) list.sort(byPeriod);
  // Rent index → % vs a year ago (4 quarters back)
  for (const set of Object.values(out)) set.rentYoy = yoyFrom(set.rent, 4);
  return out;
}

/** % change vs `lag` periods earlier, for each point that has one. */
export function yoyFrom(list, lag) {
  const out = [];
  for (let i = lag; i < (list || []).length; i += 1) {
    const before = list[i - lag].v;
    if (before) out.push({ p: list[i].p, v: Math.round(((list[i].v / before) - 1) * 1000) / 10 });
  }
  return out;
}

/* ── US rents (BLS) ───────────────────────────────────────────────── */
async function fetchBlsRent() {
  const text = await getText('https://api.bls.gov/publicAPI/v1/timeseries/data/CUSR0000SEHA', 'application/json');
  const data = JSON.parse(text);
  if (data.status && data.status !== 'REQUEST_SUCCEEDED') throw new Error(`BLS said ${data.status}: ${(data.message || []).join(' ')}`);
  const results = Array.isArray(data.Results) ? data.Results[0] : data.Results;
  const list = (results?.series?.[0]?.data || [])
    .filter((row) => /^M(0[1-9]|1[0-2])$/u.test(row.period) && Number.isFinite(Number(row.value)))
    .map((row) => ({ p: `${row.year}-${row.period.slice(1)}`, v: Number(row.value) }))
    .sort(byPeriod);
  return { index: list, yoy: yoyFrom(list, 12) };
}

/* ── UK average prices (HM Land Registry) ─────────────────────────── */
const num = (x) => {
  const v = Number(x && typeof x === 'object' ? (x._value ?? x.value) : x);
  return Number.isFinite(v) ? v : null;
};
async function fetchUkHpiRegion(region) {
  const url = `https://landregistry.data.gov.uk/data/ukhpi/region/${region}.json?_pageSize=40&_sort=-refMonth`;
  const data = JSON.parse(await getText(url, 'application/json'));
  const items = data?.result?.items || [];
  const list = items.map((it) => {
    const month = String(it.refMonth?._value ?? it.refMonth ?? '').slice(0, 7);
    return { p: month, price: num(it.averagePrice), yoy: num(it.percentageAnnualChange) };
  }).filter((x) => /^\d{4}-\d{2}$/u.test(x.p) && x.price).sort(byPeriod);
  // Work out the yearly change ourselves if the field is missing
  for (let i = 12; i < list.length; i += 1) {
    if (list[i].yoy === null && list[i - 12].price) list[i].yoy = Math.round(((list[i].price / list[i - 12].price) - 1) * 1000) / 10;
  }
  if (!list.length) throw new Error(`no months in the reply for ${region}`);
  return list;
}

/* ── Refresh everything (weekly job) ──────────────────────────────── */
export async function refreshProperty() {
  const existing = await readProperty();
  const places = { ...existing.places };
  const failures = [];
  const ok = [];
  const bisCodes = PROPERTY_PLACES.map((p) => p.bis).filter(Boolean);
  const oecdCodes = PROPERTY_PLACES.map((p) => p.oecd).filter(Boolean);

  const step = async (label, fn) => {
    try { const r = await fn(); ok.push(label); console.log(`[property] ${label}: OK`); return r; } catch (error) {
      failures.push({ source: label, reason: error.message });
      console.error(`[property] ${label}: failed — ${error.message} (last good figures kept)`);
      return null;
    }
  };

  const bis = await step('BIS house prices', () => fetchBis(bisCodes));
  const oecd = await step('OECD rents and price ratios', () => fetchOecd(oecdCodes));
  const needs = (x) => PROPERTY_PLACES.some((p) => p.extras.includes(x));
  const blsRent = needs('bls-rent') ? await step('US rents (BLS)', fetchBlsRent) : null;
  let ukhpi = null;
  if (needs('ukhpi')) {
    const uk = await step('UK average price (Land Registry)', () => fetchUkHpiRegion('united-kingdom'));
    const london = uk ? await step('London average price (Land Registry)', () => fetchUkHpiRegion('london')) : null;
    if (uk) ukhpi = { uk, london: london || existing.places?.['united-kingdom']?.ukhpi?.london || [] };
  }

  for (const place of PROPERTY_PLACES) {
    const prev = places[place.slug] || {};
    const next = { ...prev };
    if (place.bis && bis?.[place.bis]?.nominal?.length) next.bis = bis[place.bis];
    if (place.oecd && oecd?.[place.oecd]) {
      const o = oecd[place.oecd];
      if (o.rent.length || o.priceToIncome.length || o.priceToRent.length) next.oecd = o;
    }
    if (place.extras.includes('bls-rent') && blsRent?.index?.length) next.blsRent = blsRent;
    if (place.extras.includes('ukhpi') && ukhpi) next.ukhpi = ukhpi;
    places[place.slug] = next;
  }

  const hasAny = Object.values(places).some((p) => p.bis?.nominal?.length);
  if (!hasAny && !ok.length) {
    return { ok: false, message: `No property figures could be downloaded (${failures.map((f) => `${f.source}: ${f.reason}`).join('; ')})` };
  }
  // Cities: rents, prices and yields (ONS, Land Registry, BLS)
  const cityRun = await refreshCities(existing.cities).catch((error) => ({ cities: existing.cities || {}, failures: [{ source: 'Cities', reason: error.message }] }));
  failures.push(...cityRun.failures);
  await writeJson(FILE, { updatedAt: new Date().toISOString(), places, cities: cityRun.cities, failures });
  const covered = PROPERTY_PLACES.filter((p) => places[p.slug]?.bis?.nominal?.length).length;
  return { ok: true, message: `${ok.length} sources updated; house prices for ${covered} places${failures.length ? `; ${failures.length} failed (${failures.map((f) => f.source).join(', ')})` : ''}` };
}

/* ── Dubai figures typed in by Admin ──────────────────────────────── */
const PERIOD_RE = /^\d{4}-Q[1-4]$/u;
export async function saveManualRow(placeSlug, row) {
  if (placeSlug !== 'dubai') throw new Error('Only Dubai figures are typed in by hand.');
  const period = String(row?.period || '').trim().toUpperCase();
  if (!PERIOD_RE.test(period)) throw new Error('Choose the year and quarter, e.g. 2026-Q2.');
  const n = (v, max) => {
    if (v === '' || v === null || v === undefined) return null;
    const x = Number(String(v).replace(/[, ]/gu, ''));
    if (!Number.isFinite(x) || x < 0 || x > max) throw new Error('Please check the numbers (digits only).');
    return x;
  };
  const clean = {
    period,
    salesCount: n(row.salesCount, 10_000_000),
    salesValueBn: n(row.salesValueBn, 100_000),
    pricePerSqft: n(row.pricePerSqft, 1_000_000),
    rentChangePct: row.rentChangePct === '' || row.rentChangePct === undefined || row.rentChangePct === null ? null : Number(row.rentChangePct),
    sourceName: String(row.sourceName || '').replace(/[<>]/gu, '').trim().slice(0, 120),
    sourceUrl: /^https:\/\/[^\s<>"]+$/u.test(String(row.sourceUrl || '').trim()) ? String(row.sourceUrl).trim().slice(0, 400) : '',
    savedAt: new Date().toISOString(),
  };
  if (clean.rentChangePct !== null && (!Number.isFinite(clean.rentChangePct) || Math.abs(clean.rentChangePct) > 100)) throw new Error('Rent change should be a percentage between -100 and 100.');
  if (clean.salesCount === null && clean.salesValueBn === null) throw new Error('Enter at least the number of sales or their total value.');
  if (!clean.sourceUrl) throw new Error('Add the https link where these figures were published.');
  const manual = await readPropertyManual();
  const rows = (manual.dubai?.rows || []).filter((r) => r.period !== period);
  rows.push(clean);
  rows.sort((a, b) => a.period.localeCompare(b.period));
  manual.dubai = { rows };
  await writeJson(MANUAL_FILE, manual);
  return manual.dubai;
}

export async function deleteManualRow(placeSlug, period) {
  const manual = await readPropertyManual();
  manual[placeSlug] = { rows: (manual[placeSlug]?.rows || []).filter((r) => r.period !== period) };
  await writeJson(MANUAL_FILE, manual);
  return manual[placeSlug];
}

/** Admin → Property: what each place has. */
export async function getPropertyStatus() {
  const [data, manual] = await Promise.all([readProperty(), readPropertyManual()]);
  return {
    updatedAt: data.updatedAt,
    failures: data.failures || [],
    places: PROPERTY_PLACES.map((p) => {
      const d = data.places?.[p.slug] || {};
      return {
        slug: p.slug,
        name: p.name,
        prices: d.bis?.nominal?.at(-1)?.p || null,
        rents: d.blsRent?.index?.at(-1)?.p || d.oecd?.rent?.at(-1)?.p || null,
        ratios: d.oecd?.priceToIncome?.at(-1)?.p || null,
        ukPrice: d.ukhpi?.uk?.at(-1)?.p || null,
        manualRows: p.manual ? (manual[p.slug]?.rows || []).length : null,
      };
    }),
    dubai: manual.dubai?.rows || [],
  };
}

/* ════════════════════════════════════════════════════════════════════════
   CITIES — rents, prices, yields and five years of history
   (src/data/propertyCities.js lists the cities and sources)
   ════════════════════════════════════════════════════════════════════════ */
const ONS_PAGE = 'https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics';
const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

/** 'Sep 2026', 'September 2026', '2026-09', '2026 SEP' or an Excel date number → 'YYYY-MM' */
export function monthOf(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/ ](\d{1,2})(?:\b|$)/u);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^([A-Za-z]{3})[A-Za-z]*[ -]+(\d{4})$/u) || s.match(/^(\d{4})[ -]+([A-Za-z]{3})[A-Za-z]*$/u);
  if (m) {
    const [mon, yr] = /^\d/u.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    const mm = MONTHS[mon.toLowerCase()];
    return mm ? `${yr}-${mm}` : null;
  }
  return null;
}

/** Reads the ONS rents workbook into { 'Area name': [{ p, rent }] } for the names wanted. */
export function parseOnsRents(buffer, wanted) {
  const want = new Map(wanted.map((n) => [n.toLowerCase(), n]));
  const out = {};
  for (const sheet of listSheets(buffer)) {
    let rows;
    try { rows = readSheet(buffer, new RegExp(`^${sheet.name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u')); } catch { continue; }
    for (let h = 0; h < Math.min(rows.length, 40); h += 1) {
      const head = (rows[h] || []).map((c) => String(c ?? '').toLowerCase());
      const area = head.findIndex((c) => /area name|^area$|local authority name|region or country name/u.test(c));
      const rent = head.findIndex((c) => /rental price|average rent|price \(£\)|rent \(£\)/u.test(c) && !/change|index/u.test(c));
      const time = head.findIndex((c) => /time period|^date$|^month$|^period$/u.test(c));
      if (area < 0 || rent < 0 || time < 0) continue;
      for (const r of rows.slice(h + 1)) {
        const name = want.get(String(r?.[area] ?? '').trim().toLowerCase());
        if (!name) continue;
        const p = monthOf(r[time]);
        const v = Number(String(r[rent] ?? '').replace(/[£,\s]/gu, ''));
        if (!p || !Number.isFinite(v) || v < 100 || v > 20000) continue;
        (out[name] ||= new Map()).set(p, v);
      }
      if (Object.keys(out).length) break; // first table with the figures (all homes)
    }
    if (Object.keys(out).length) break;
  }
  return Object.fromEntries(Object.entries(out).map(([k, m]) => [k, [...m.entries()].map(([p, rent]) => ({ p, rent })).sort((a, b) => a.p.localeCompare(b.p))]));
}

async function fetchOnsRents(names) {
  let url = null;
  try {
    const html = await getText(ONS_PAGE, 'text/html');
    const href = html.match(/\/file\?uri=[^"'\s<>]*priceindexofprivaterentsukmonthlypricestatistics[^"'\s<>]*\.xlsx/iu)?.[0];
    if (href) url = `https://www.ons.gov.uk${href.replace(/&amp;/gu, '&')}`;
  } catch (error) { throw new Error(`could not read the ONS page (${error.message})`); }
  if (!url) throw new Error('download link not found on the ONS page');
  const response = await fetch(url, { headers: UA });
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading the ONS rents file`);
  const parsed = parseOnsRents(Buffer.from(await response.arrayBuffer()), names);
  if (!Object.keys(parsed).length) throw new Error('no city rents found in the ONS file (its layout may have changed)');
  return parsed;
}

async function fetchUkHpiLong(slugs) {
  for (const slug of slugs) {
    try {
      const url = `https://landregistry.data.gov.uk/data/ukhpi/region/${slug}.json?_pageSize=84&_sort=-refMonth`;
      const data = JSON.parse(await getText(url, 'application/json'));
      const list = (data?.result?.items || []).map((it) => ({ p: String(it.refMonth?._value ?? it.refMonth ?? '').slice(0, 7), price: num(it.averagePrice) }))
        .filter((x) => /^\d{4}-\d{2}$/u.test(x.p) && x.price).sort(byPeriod);
      if (list.length) return list;
    } catch { /* try the next name */ }
  }
  throw new Error(`no Land Registry figures under ${slugs.join(' / ')}`);
}

async function fetchBlsSeries(id) {
  const data = JSON.parse(await getText(`https://api.bls.gov/publicAPI/v1/timeseries/data/${id}`, 'application/json'));
  if (data.status && data.status !== 'REQUEST_SUCCEEDED') throw new Error(`BLS said ${data.status}`);
  const results = Array.isArray(data.Results) ? data.Results[0] : data.Results;
  const list = (results?.series?.[0]?.data || [])
    .filter((row) => /^M(0[1-9]|1[0-2])$/u.test(row.period) && Number.isFinite(Number(row.value)))
    .map((row) => ({ p: `${row.year}-${row.period.slice(1)}`, index: Number(row.value) }))
    .sort(byPeriod);
  if (!list.length) throw new Error('no monthly values');
  return list;
}

/** Weekly: every city in CITY_LIST. Keeps the last good figures for any source that fails. */
export async function refreshCities(existing = {}) {
  const { CITY_LIST } = await import('../data/propertyCities.js');
  const cities = { ...(existing || {}) };
  const failures = [];
  const uk = CITY_LIST.filter((c) => c.country === 'uk');
  let rents = {};
  try { rents = await fetchOnsRents(uk.flatMap((c) => c.ons)); } catch (error) { failures.push({ source: 'UK city rents (ONS)', reason: error.message }); console.error(`[property] UK city rents (ONS): ${error.message} (last good figures kept)`); }
  for (const c of CITY_LIST) {
    const prev = cities[c.slug] || {};
    const next = { ...prev, name: c.name, country: c.country };
    if (c.country === 'uk') {
      const r = c.ons.map((n) => rents[n]).find((x) => x?.length);
      if (r) next.rents = r.slice(-84);
      try { next.prices = (await fetchUkHpiLong(c.ukhpi)).slice(-84); } catch (error) { failures.push({ source: `${c.name} prices (Land Registry)`, reason: error.message }); }
    } else {
      try { next.rentIndex = (await fetchBlsSeries(c.bls)).slice(-84); } catch (error) { failures.push({ source: `${c.name} rents (BLS)`, reason: error.message }); }
    }
    cities[c.slug] = next;
  }
  return { cities, failures };
}
