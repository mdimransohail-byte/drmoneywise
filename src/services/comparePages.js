/* ════════════════════════════════════════════════════════════════════════
   /compare/<A>-vs-<B> — two companies side by side, from official figures:
   Financial Health score and its seven checks, sales, profit, margins,
   growth, debt, spare cash, dividends, and six years of sales and profit.
   Short plain-English lines say who leads on what. Free (people search
   "Coca-Cola vs Pepsi" a lot). Not advice to buy or sell either.
   /compare (no pair) shows a picker and popular match-ups.
   ════════════════════════════════════════════════════════════════════════ */

import { getCompany, normaliseTicker } from './companyLookup.js';
import { financialHealth, starsHtml } from './financialHealthService.js';
import { formatMoney } from './reportCardService.js';
import { SECTORS } from '../data/sectorLeaders.js';
import { readPrices } from './dataEngine.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const nameOf = (c) => String(c.displayName || c.name || c.ticker).replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/u, '').trim();
const A = '#2a78d6'; const B = '#e8730c';
const last = (s) => s?.at?.(-1)?.value ?? null;

/** Popular match-ups: neighbours within each sector list (about 100 pairs). */
export function popularPairs() {
  const out = [];
  for (const s of SECTORS) for (let i = 0; i + 1 < Math.min(s.tickers.length, 10); i += 1) out.push([s.tickers[i], s.tickers[i + 1], s.name]);
  return out;
}

function facts(c, price) {
  const d = c.derived || {};
  const ocf = last(c.operatingCashFlow);
  return {
    sales: last(c.revenue), profit: last(c.netIncome), margin: d.profitMargin, growth: d.revenueGrowth,
    debtYears: c.longTermDebt === 0 ? 0 : c.longTermDebt && ocf > 0 ? c.longTermDebt / ocf : null,
    fcf: d.freeCashFlow, dps: d.latestDividendPerShare || 0, raises: d.yearsOfDividendRaises || 0,
    yield: price && d.latestDividendPerShare && !c.foreignFiler ? d.latestDividendPerShare / price * 100 : null,
    cash: c.cash,
  };
}

function lead(a, b, an, bn) {
  const lines = [];
  const both = (x, y) => x !== null && x !== undefined && y !== null && y !== undefined;
  const say = (x, y, high, win, tie) => { if (!both(x, y)) return; if (Math.abs(x - y) < Math.abs(x || y || 1) * 0.005) lines.push(tie); else lines.push(win((high ? x > y : x < y) ? an : bn)); };
  say(a.sales, b.sales, true, (w) => `<b>${esc(w)}</b> is the bigger business by sales (${formatMoney(Math.max(a.sales, b.sales))} against ${formatMoney(Math.min(a.sales, b.sales))}).`, `Both bring in about the same sales (${formatMoney(a.sales)} a year).`);
  say(a.margin, b.margin, true, (w) => `<b>${esc(w)}</b> keeps more of each $1 of sales as profit (${Math.round(Math.max(a.margin, b.margin) * 100)}¢ against ${Math.round(Math.min(a.margin, b.margin) * 100)}¢).`, `Both keep about ${Math.round((a.margin || 0) * 100)}¢ of each $1 of sales as profit.`);
  say(a.growth, b.growth, true, (w) => `<b>${esc(w)}</b> grew sales faster last year (${(Math.max(a.growth, b.growth) * 100).toFixed(1)}% against ${(Math.min(a.growth, b.growth) * 100).toFixed(1)}%).`, `Both grew sales by about ${((a.growth || 0) * 100).toFixed(1)}% last year.`);
  say(a.debtYears, b.debtYears, false, (w) => `<b>${esc(w)}</b> has the lighter debt: about ${Math.min(a.debtYears, b.debtYears).toFixed(1)} years of business cash to repay it, against ${Math.max(a.debtYears, b.debtYears).toFixed(1)}.`, `Both would need about ${(a.debtYears || 0).toFixed(1)} years of business cash to repay their debt.`);
  if (a.raises || b.raises) lines.push(a.raises === b.raises ? `Both have raised their dividend ${a.raises} years in a row.` : `<b>${esc(a.raises > b.raises ? an : bn)}</b> has the longer record of dividend rises (${Math.max(a.raises, b.raises)} years in a row against ${Math.min(a.raises, b.raises)}).`);
  return lines;
}

function yearBars(ca, cb, key, title) {
  const ya = new Map((ca[key] || []).map((x) => [x.year, x.value]));
  const yb = new Map((cb[key] || []).map((x) => [x.year, x.value]));
  const years = [...new Set([...ya.keys(), ...yb.keys()])].sort().slice(-6);
  if (years.length < 2) return '';
  const max = Math.max(...years.flatMap((y) => [Math.abs(ya.get(y) || 0), Math.abs(yb.get(y) || 0)])) || 1;
  const W = 640; const H = 220; const L = 10; const bw = (W - L * 2) / years.length;
  const bar = (v, x, col) => { const h = Math.max(1, (Math.max(0, v || 0) / max) * (H - 50)); return `<rect x="${x}" y="${H - 28 - h}" width="${bw * 0.34}" height="${h}" rx="4" fill="${col}"/>`; };
  const cols = years.map((y, i) => { const x = L + i * bw + bw * 0.14; return `${bar(ya.get(y), x, A)}${bar(yb.get(y), x + bw * 0.38, B)}<text x="${x + bw * 0.36}" y="${H - 8}" text-anchor="middle" font-size="13" fill="#4a5170">${y}</text>`; }).join('');
  return `<figure class="cp-chart"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${cols}</svg></figure>`;
}

const pctTxt = (v) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);

export async function renderCompare(origin, pair) {
  const m = String(pair || '').match(/^([A-Za-z0-9.-]{1,10})-vs-([A-Za-z0-9.-]{1,10})$/u);
  if (!m) return { status: 404, html: null };
  const [ta, tb] = [normaliseTicker(m[1]), normaliseTicker(m[2])];
  if (ta === tb) return { redirect: `/stock/${ta}` };
  if (m[1] !== ta || m[2] !== tb) return { redirect: `/compare/${ta}-vs-${tb}` };
  const [ca, cb] = await Promise.all([getCompany(ta), getCompany(tb)]);
  if (!ca || ca.notFound || ca.busy || !cb || cb.notFound || cb.busy) {
    const missing = [ca?.notFound || ca?.busy || !ca ? ta : null, cb?.notFound || cb?.busy || !cb ? tb : null].filter(Boolean);
    return { status: 404, html: pageShell({ head: buildHeadTags({ title: 'Compare companies | Dr MoneyWise', description: 'Compare two companies side by side.', canonical: `${origin}/compare` }), body: `<section class="block"><h1>Compare companies</h1><p class="note-box">We couldn’t find official figures for ${esc(missing.join(' and '))}. Check the ticker, or try again in a few minutes.</p>${pickerHtml(ta, tb)}</section>`, active: 'markets' }) };
  }
  const { prices } = await readPrices();
  const an = nameOf(ca); const bn = nameOf(cb);
  const fa = facts(ca, prices?.[ta]?.price); const fb = facts(cb, prices?.[tb]?.price);
  const ha = financialHealth(ca); const hb = financialHealth(cb);
  const canonicalPair = [ta, tb].sort().join('-vs-');
  const head = buildHeadTags({
    title: `${an} vs ${bn} (${ta} vs ${tb}): which is financially stronger? | Dr MoneyWise`,
    description: `${an} vs ${bn} compared simply: health scores ${ha?.score ?? '–'} and ${hb?.score ?? '–'} out of 100, sales, profit, debt, spare cash and dividends, from official figures.`,
    canonical: `${origin}/compare/${canonicalPair}`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: `${an} vs ${bn}`, about: [{ '@type': 'Corporation', name: an, tickerSymbol: ta }, { '@type': 'Corporation', name: bn, tickerSymbol: tb }] },
  });
  const row = (label, va, vb, better = null) => {
    const win = better === 'a' ? ' class="cp-win-a"' : better === 'b' ? ' class="cp-win-b"' : '';
    return `<tr${win}><th scope="row">${esc(label)}</th><td>${va}</td><td>${vb}</td></tr>`;
  };
  const cmp = (x, y, high = true) => (x === null || x === undefined || y === null || y === undefined || x === y ? null : (high ? x > y : x < y) ? 'a' : 'b');
  const table = `
        <div class="table-scroll"><table class="cp-table">
          <thead><tr><th></th><th style="--c:${A}">${esc(an)} <span>${esc(ta)}</span></th><th style="--c:${B}">${esc(bn)} <span>${esc(tb)}</span></th></tr></thead>
          <tbody>
            ${row('Financial Health score', ha?.score ?? '—', hb?.score ?? '—', cmp(ha?.score, hb?.score))}
            ${row('Sales (latest year)', formatMoney(fa.sales), formatMoney(fb.sales), cmp(fa.sales, fb.sales))}
            ${row('Profit (latest year)', formatMoney(fa.profit), formatMoney(fb.profit), cmp(fa.profit, fb.profit))}
            ${row('Profit from each $1 of sales', fa.margin === null || fa.margin === undefined ? '—' : `${Math.round(fa.margin * 100)}¢`, fb.margin === null || fb.margin === undefined ? '—' : `${Math.round(fb.margin * 100)}¢`, cmp(fa.margin, fb.margin))}
            ${row('Sales growth last year', pctTxt(fa.growth), pctTxt(fb.growth), cmp(fa.growth, fb.growth))}
            ${row('Years of business cash to repay debt', fa.debtYears === null ? '—' : fa.debtYears.toFixed(1), fb.debtYears === null ? '—' : fb.debtYears.toFixed(1), cmp(fa.debtYears, fb.debtYears, false))}
            ${row('Spare cash (free cash flow)', formatMoney(fa.fcf), formatMoney(fb.fcf), cmp(fa.fcf, fb.fcf))}
            ${row('Dividend per share', fa.dps ? `$${fa.dps.toFixed(2)}` : 'None', fb.dps ? `$${fb.dps.toFixed(2)}` : 'None')}
            ${row('Dividend yield', fa.yield ? `${fa.yield.toFixed(2)}%` : '—', fb.yield ? `${fb.yield.toFixed(2)}%` : '—')}
            ${row('Years of dividend rises', fa.raises || 0, fb.raises || 0, cmp(fa.raises, fb.raises))}
          </tbody></table></div>`;
  const checks = ha && hb ? `
        <div class="cp-checks">${ha.checks.map((x, i) => { const y = hb.checks[i]; return `<div class="cp-check"><span>${esc(x.label)}</span>
          <div class="cp-bars"><i style="--c:${A};width:${(x.points ?? 0) * 10}%"></i><b>${x.points ?? 'n/a'}</b></div>
          <div class="cp-bars"><i style="--c:${B};width:${(y.points ?? 0) * 10}%"></i><b>${y.points ?? 'n/a'}</b></div></div>`; }).join('')}</div>` : '';
  const lines = lead(fa, fb, an, bn);
  const body = `
      <section class="block cp-page">
        <p class="crumbs"><a href="/compare">Compare companies</a> › ${esc(ta)} vs ${esc(tb)}</p>
        <h1>${esc(an)} vs ${esc(bn)}</h1>
        <p class="lede-dark">Two companies side by side, from their official yearly reports. Which is bigger, more profitable, faster-growing and less in debt?</p>
        <div class="cp-hero">
          <a class="cp-side" href="/stock/${encodeURIComponent(ta)}" style="--c:${A}"><span class="cp-tk">${esc(ta)}</span><strong>${esc(an)}</strong>${ha?.score !== null && ha ? `<span class="cp-score">${ha.score}<small>/100</small></span>${starsHtml(ha.stars, 18)}<em>${esc(ha.band.label)} health</em>` : '<em>Not enough figures for a score</em>'}</a>
          <span class="cp-vs">vs</span>
          <a class="cp-side" href="/stock/${encodeURIComponent(tb)}" style="--c:${B}"><span class="cp-tk">${esc(tb)}</span><strong>${esc(bn)}</strong>${hb?.score !== null && hb ? `<span class="cp-score">${hb.score}<small>/100</small></span>${starsHtml(hb.stars, 18)}<em>${esc(hb.band.label)} health</em>` : '<em>Not enough figures for a score</em>'}</a>
        </div>
        ${lines.length ? `<div class="cp-lines"><h2>In short</h2><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>` : ''}
        <h2 class="lvp-h">The figures</h2>
        ${table}
        ${checks ? `<h2 class="lvp-h">Financial Health Check, check by check</h2><p class="cp-key"><i style="--c:${A}"></i>${esc(an)} <i style="--c:${B}"></i>${esc(bn)} · each check scored out of 10 (<a href="/health-check">how we score</a>)</p>${checks}` : ''}
        <div class="cp-charts">${yearBars(ca, cb, 'revenue', 'Sales each year')}${yearBars(ca, cb, 'netIncome', 'Profit each year')}</div>
        <p class="cp-key"><i style="--c:${A}"></i>${esc(an)} <i style="--c:${B}"></i>${esc(bn)}</p>
        <h2 class="lvp-h">Compare other companies</h2>
        ${pickerHtml(ta, tb)}
        <p class="note-box">This compares the two businesses’ finances from their official reports. It says nothing about whether either share is cheap or expensive and is not advice to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return { status: 200, html: pageShell({ head, body, active: 'markets' }) };
}

function pickerHtml(a = '', b = '') {
  return `<form class="cp-pick" onsubmit="var a=this.a.value.trim().toUpperCase(),b=this.b.value.trim().toUpperCase();if(a&&b){location.href='/compare/'+encodeURIComponent(a)+'-vs-'+encodeURIComponent(b)}return false">
          <label>First company<input name="a" value="${esc(a)}" placeholder="Ticker, e.g. KO" maxlength="10" required></label>
          <span>vs</span>
          <label>Second company<input name="b" value="${esc(b)}" placeholder="Ticker, e.g. PEP" maxlength="10" required></label>
          <button class="pf-btn gold" type="submit">Compare</button>
        </form>`;
}

export async function renderCompareIndex(origin) {
  const pairs = popularPairs();
  const bySector = new Map();
  pairs.forEach(([a, b, s]) => { if (!bySector.has(s)) bySector.set(s, []); bySector.get(s).push([a, b]); });
  const head = buildHeadTags({
    title: 'Compare two companies side by side | Dr MoneyWise',
    description: 'Compare any two US-listed companies: Financial Health scores, sales, profit, debt, spare cash and dividends side by side, explained simply. Free.',
    canonical: `${origin}/compare`,
  });
  const body = `
      <section class="block cp-page">
        <h1>Compare two companies</h1>
        <p class="lede-dark">Type two tickers to see them side by side: health scores, sales, profit, debt, spare cash and dividends, from official figures.</p>
        ${pickerHtml('KO', 'PEP')}
        <h2 class="lvp-h">Popular match-ups</h2>
        <div class="cp-popular">${[...bySector].map(([s, list]) => `<div><h3>${esc(s)}</h3>${list.map(([a, b]) => `<a href="/compare/${a}-vs-${b}">${a} vs ${b}</a>`).join('')}</div>`).join('')}</div>
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

export function compareSitemapEntries(origin) {
  const today = new Date().toISOString().slice(0, 10);
  return [{ loc: `${origin}/compare`, lastmod: today, priority: '0.7' }, ...popularPairs().map(([a, b]) => ({ loc: `${origin}/compare/${[a, b].sort().join('-vs-')}`, lastmod: today, priority: '0.5' }))];
}

/** "Compare with…" links for a company page (its sector neighbours). */
export function compareLinksHtml(ticker) {
  const s = SECTORS.find((x) => x.tickers.includes(ticker));
  if (!s) return '';
  const others = s.tickers.filter((t) => t !== ticker).slice(0, 5);
  return `<p class="cp-also">Compare ${esc(ticker)} with: ${others.map((t) => `<a href="/compare/${ticker}-vs-${t}">${t}</a>`).join(' · ')} · <a href="/compare">any company</a></p>`;
}
