/* ════════════════════════════════════════════════════════════════════════
   COMPANY BOSSES BUYING OR SELLING THEIR OWN SHARES (Premium)
   ───────────────────────────────────────────────────────────────────────
   Directors, top managers and 10%+ owners of US companies must report
   their trades in the company's shares within two business days, on SEC
   Form 4 (free, public US government records; fine for commercial use).
   The hourly results check (resultsService.js) already reads each
   company's filing list; it passes new Form 4s here. For each we read the
   filing's XML:
     https://www.sec.gov/Archives/edgar/data/<cik>/<accession>/<file>.xml
     <reportingOwner> name + relationship (director / officer + title)
     <nonDerivativeTransaction> date, code (P = bought on the market,
       S = sold on the market; awards, option exercises and tax
       withholding are other codes, kept out of the buy/sell totals),
       shares, price, shares owned afterwards
     <aff10b5One> 1 = a sale or purchase planned in advance (10b5-1 plan)
   Saved to data/market/insiders.json (last 180 days).
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { userAgent } from './secService.js';

const FILE = path.join(process.cwd(), 'data', 'market', 'insiders.json');
const KEEP_DAYS = 180;
const PER_RUN = 150; // filings read per hourly run (SEC allows far more; we stay gentle)
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });

let cache = null;
async function load() {
  if (cache) return cache;
  try { cache = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { cache = { updatedAt: null, trades: [], seen: [] }; }
  return cache;
}
async function save() {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify(cache));
  await fs.rename(`${FILE}.tmp`, FILE);
}

export async function insiderSeen() {
  const c = await load();
  return new Set(c.seen || []);
}

const pick = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}>\\s*(?:<value>)?\\s*([\\s\\S]*?)\\s*(?:</value>)?\\s*</${tag}>`, 'u'));
  return m ? m[1].replace(/<[^>]+>/gu, '').trim() : '';
};
const yes = (v) => v === '1' || /^true$/iu.test(v);
const num = (v) => { const x = Number(String(v || '').replace(/,/gu, '')); return Number.isFinite(x) ? x : null; };
const titleCase = (s) => String(s || '').toLowerCase().replace(/\b([a-z])/gu, (x) => x.toUpperCase());
/** SEC lists people surname first ("COOK TIMOTHY D") → "Timothy D Cook". */
function personName(raw) {
  const t = titleCase(raw).replace(/\s+/gu, ' ').trim();
  if (/\b(Inc|Llc|Lp|Ltd|Trust|Fund|Partners|Holdings|Capital|Corp|Co|Foundation|Management)\b/u.test(t)) return t;
  const parts = t.split(' ');
  return parts.length >= 2 ? `${parts.slice(1).join(' ')} ${parts[0]}` : t;
}

/** Reads one Form 4 XML into trades. Exported for tests. */
export function parseForm4(xml) {
  const owners = [...xml.matchAll(/<reportingOwner>([\s\S]*?)<\/reportingOwner>/gu)].map((m) => m[1]);
  const o = owners[0] || '';
  const rel = o.match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/u)?.[1] || '';
  const roles = [];
  if (yes(pick(rel, 'isOfficer'))) roles.push(titleCase(pick(rel, 'officerTitle')) || 'Senior manager');
  if (yes(pick(rel, 'isDirector'))) roles.push('Director');
  if (yes(pick(rel, 'isTenPercentOwner'))) roles.push('Owns 10%+');
  if (!roles.length && yes(pick(rel, 'isOther'))) roles.push(titleCase(pick(rel, 'otherText')) || 'Insider');
  const planned = yes(pick(xml, 'aff10b5One')) || /10b5-1/iu.test(xml.match(/<footnotes>([\s\S]*?)<\/footnotes>/u)?.[1] || '');
  const out = [];
  for (const m of xml.matchAll(/<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gu)) {
    const t = m[1];
    const code = pick(t.match(/<transactionCoding>([\s\S]*?)<\/transactionCoding>/u)?.[1] || '', 'transactionCode');
    const shares = num(pick(t, 'transactionShares'));
    const price = num(pick(t, 'transactionPricePerShare'));
    out.push({
      date: pick(t, 'transactionDate').slice(0, 10),
      code,
      side: code === 'P' ? 'buy' : code === 'S' ? 'sell' : 'other',
      shares,
      price,
      value: shares && price ? Math.round(shares * price) : null,
      after: num(pick(t, 'sharesOwnedFollowingTransaction')),
      direct: pick(t, 'directOrIndirectOwnership') !== 'I',
    });
  }
  return {
    owner: personName(pick(o, 'rptOwnerName')),
    role: roles.join(', ') || 'Insider',
    planned,
    trades: out,
  };
}

/**
 * Called by the hourly results check with new Form 4s:
 * [{ ticker, name, cik, acc, filed, primaryDoc }]
 */
export async function processInsiderFilings(list) {
  const c = await load();
  const seen = new Set(c.seen || []);
  const todo = list.filter((f) => !seen.has(f.acc)).sort((a, b) => String(b.filed).localeCompare(String(a.filed))).slice(0, PER_RUN);
  let added = 0; let failed = 0;
  for (const f of todo) {
    const file = String(f.primaryDoc || '').replace(/^xsl[^/]+\//u, '');
    const url = `https://www.sec.gov/Archives/edgar/data/${Number(f.cik)}/${f.acc}/${file}`;
    try {
      if (!/\.xml$/iu.test(file)) throw new Error('no XML file listed');
      const response = await fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/xml' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const doc = parseForm4(await response.text());
      const page = `https://www.sec.gov/Archives/edgar/data/${Number(f.cik)}/${f.acc}/${String(f.primaryDoc || '')}`;
      for (const [i, t] of doc.trades.entries()) {
        if (t.side === 'other') continue; // awards, option exercises, tax withholding, gifts
        c.trades.push({ id: `${f.acc}-${i}`, ticker: f.ticker, company: f.name, owner: doc.owner, role: doc.role, planned: doc.planned, filed: f.filed, url: page, ...t });
        added += 1;
      }
      seen.add(f.acc);
    } catch (error) {
      failed += 1;
      if (failed <= 3) console.log(`[insiders] ${f.ticker} ${f.acc}: could not read the Form 4 (${error.message})`);
      if (failed > 20) break;
    }
    await pause(200);
  }
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  c.trades = c.trades.filter((t) => (t.date || t.filed) >= cutoff).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  c.seen = [...seen].slice(-20000);
  c.updatedAt = new Date().toISOString();
  cache = c;
  if (todo.length) await save();
  if (todo.length) console.log(`[insiders] ${todo.length} Form 4 filings read; ${added} market buys or sells saved${list.length > todo.length ? `; ${list.length - todo.length} more next hour` : ''}`);
  return { read: todo.length, added, waiting: Math.max(0, list.length - todo.length) };
}

/** Everything the /insiders page and company pages need. */
export async function insiderSummary({ days = 90, ticker = null } = {}) {
  const c = await load();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const trades = c.trades.filter((t) => t.date >= since && (!ticker || t.ticker === ticker));
  const by = {};
  for (const t of trades) {
    const x = by[t.ticker] = by[t.ticker] || { ticker: t.ticker, company: t.company, buys: 0, sells: 0, bought: 0, sold: 0, people: new Set() };
    if (t.side === 'buy') { x.buys += 1; x.bought += t.value || 0; } else { x.sells += 1; x.sold += t.value || 0; }
    x.people.add(t.owner);
  }
  const companies = Object.values(by).map((x) => ({ ...x, people: x.people.size, net: x.bought - x.sold }));
  const sum = (side, key) => trades.filter((t) => t.side === side).reduce((a, t) => a + (key ? t[key] || 0 : 1), 0);
  return {
    updatedAt: c.updatedAt,
    days,
    totals: {
      buys: sum('buy'), sells: sum('sell'), bought: sum('buy', 'value'), sold: sum('sell', 'value'),
      plannedSold: trades.filter((t) => t.side === 'sell' && t.planned).reduce((a, t) => a + (t.value || 0), 0),
      companiesBuying: companies.filter((x) => x.buys).length,
    },
    companies,
    trades: trades.slice(0, ticker ? 40 : 400),
  };
}

/** { TICKER: { buys, sells } } over 90 days, for the screener. */
export async function insiderCounts(days = 90) {
  const c = await load();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const out = {};
  for (const t of c.trades) {
    if (t.date < since) continue;
    const x = out[t.ticker] = out[t.ticker] || { buys: 0, sells: 0 };
    if (t.side === 'buy') x.buys += 1; else x.sells += 1;
  }
  return out;
}
