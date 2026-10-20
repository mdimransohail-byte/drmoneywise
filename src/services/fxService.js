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
