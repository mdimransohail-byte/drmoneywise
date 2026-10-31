/* ════════════════════════════════════════════════════════════════════════
   EXCHANGE RATES — European Central Bank euro reference rates (free;
   reuse is allowed provided the ECB is named as the source).
     https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
     <Cube currency="USD" rate="1.0832"/> … = units of each currency per €1
   We turn these into "US dollars per 1 unit" for each currency. Gulf
   currencies the ECB doesn't publish are fixed (pegged) to the dollar by
   their central banks, so their official peg is used.
   Saved to data/market/fx.json; refreshed at most once a day.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const FILE = path.join(process.cwd(), 'data', 'market', 'fx.json');
// Official dollar pegs (units per US$1): UAE dirham, Saudi riyal, Qatari riyal, Bahraini dinar, Omani rial
const PEGS = { AED: 3.6725, SAR: 3.75, QAR: 3.64, BHD: 0.376, OMR: 0.3845 };

let memo = null;

export function parseEcb(xml) {
  const perEuro = { EUR: 1 };
  const day = String(xml).match(/time=['"](\d{4}-\d{2}-\d{2})['"]/u)?.[1] || null;
  for (const m of String(xml).matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/gu)) perEuro[m[1]] = Number(m[2]);
  if (!perEuro.USD) throw new Error('the ECB file had no US dollar rate');
  const usdPer = {};
  for (const [cur, rate] of Object.entries(perEuro)) if (rate > 0) usdPer[cur] = perEuro.USD / rate;
  for (const [cur, units] of Object.entries(PEGS)) usdPer[cur] = 1 / units;
  usdPer.USD = 1;
  return { date: day, usdPer };
}

/** { date, usdPer: { JPY: 0.0066, GBP: 1.27, … } } — US dollars for one unit. */
export async function getFxRates({ force = false } = {}) {
  if (!force && memo && Date.now() - memo.at < 6 * 60 * 60 * 1000) return memo.data;
  let saved = null;
  try { saved = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { /* none yet */ }
  if (!force && saved && Date.now() - new Date(saved.fetchedAt).getTime() < 24 * 60 * 60 * 1000) {
    memo = { at: Date.now(), data: saved };
    return saved;
  }
  try {
    const response = await fetch(URL, { headers: { Accept: 'application/xml' } });
    if (!response.ok) throw new Error(`ECB returned HTTP ${response.status}`);
    const data = { ...parseEcb(await response.text()), fetchedAt: new Date().toISOString(), source: 'European Central Bank euro reference rates' };
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data));
    memo = { at: Date.now(), data };
    console.log(`[fx] Exchange rates saved for ${data.date} (${Object.keys(data.usdPer).length} currencies)`);
    return data;
  } catch (error) {
    console.error(`[fx] Could not update exchange rates: ${error.message}${saved ? ' — using the last saved rates' : ''}`);
    if (saved) { memo = { at: Date.now(), data: saved }; return saved; }
    return { date: null, usdPer: { USD: 1, ...Object.fromEntries(Object.entries(PEGS).map(([c, u]) => [c, 1 / u])) } };
  }
}

export const CURRENCY_WORDS = {
  USD: 'US dollars', GBP: 'British pounds', EUR: 'euros', JPY: 'Japanese yen', CNY: 'Chinese yuan', HKD: 'Hong Kong dollars',
  INR: 'Indian rupees', KRW: 'South Korean won', BRL: 'Brazilian reais', CHF: 'Swiss francs', AUD: 'Australian dollars',
  CAD: 'Canadian dollars', ILS: 'Israeli shekels', SAR: 'Saudi riyals', AED: 'UAE dirhams', MXN: 'Mexican pesos', TWD: 'Taiwan dollars',
};

/* ── Every currency, for the converter ────────────────────────────────────
   ExchangeRate-API "open access" (free, commercial use allowed, about 160
   currencies, updated once a day). Its terms ask for the credit link
   "Rates By Exchange Rate API" wherever the rates are shown, and no more
   than one request a day is needed, so the answer is saved for 24 hours.
   If it can't be reached, the ECB rates above are used instead.          */
const ALL_URL = 'https://open.er-api.com/v6/latest/USD';
const ALL_FILE = path.join(process.cwd(), 'data', 'market', 'fx-all.json');
let allMemo = null;

/** { date, usdPer, source: 'erapi' | 'ecb' } — US dollars for one unit of each currency. */
export async function getAllRates({ force = false } = {}) {
  if (!force && allMemo && Date.now() - allMemo.at < 6 * 60 * 60 * 1000) return allMemo.data;
  let saved = null;
  try { saved = JSON.parse(await fs.readFile(ALL_FILE, 'utf8')); } catch { /* none yet */ }
  if (!force && saved && Date.now() - new Date(saved.fetchedAt).getTime() < 24 * 60 * 60 * 1000) {
    allMemo = { at: Date.now(), data: saved };
    return saved;
  }
  try {
    const response = await fetch(ALL_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    if (json.result !== 'success' || !json.rates?.USD) throw new Error(json['error-type'] || 'no rates in the answer');
    const usdPer = {};
    for (const [cur, perUsd] of Object.entries(json.rates)) if (Number(perUsd) > 0) usdPer[cur] = 1 / Number(perUsd);
    const date = json.time_last_update_unix ? new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10) : null;
    const data = { date, usdPer, source: 'erapi', fetchedAt: new Date().toISOString() };
    await fs.mkdir(path.dirname(ALL_FILE), { recursive: true });
    await fs.writeFile(ALL_FILE, JSON.stringify(data));
    allMemo = { at: Date.now(), data };
    console.log(`[fx] All-currency rates saved for ${date} (${Object.keys(usdPer).length} currencies)`);
    return data;
  } catch (error) {
    console.error(`[fx] Could not update all-currency rates: ${error.message}${saved ? ' — using the last saved rates' : ' — using ECB rates'}`);
    if (saved) { allMemo = { at: Date.now(), data: saved }; return saved; }
    const ecb = await getFxRates();
    return { date: ecb.date, usdPer: ecb.usdPer, source: 'ecb' };
  }
}
