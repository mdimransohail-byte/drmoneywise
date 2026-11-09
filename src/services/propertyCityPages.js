/* ════════════════════════════════════════════════════════════════════════
   /property/cities — rents, prices, rental yield and five years of history
   for big cities (src/data/propertyCities.js). Free for everyone.
   Premium (from /api/property/cities-premium, public/citiesprem.js):
   a 5-star scorecard for each city on five fixed rules, a ranking, and
   "if the last five years' pace continued" sums. Only ONS, Land Registry
   and BLS figures are used here (all free for commercial use); the BIS
   figures on the other property pages stay free, as their terms require.
   ════════════════════════════════════════════════════════════════════════ */

import { CITY_CREDITS, CITY_CRITERIA, CITY_LIST } from '../data/propertyCities.js';
import { readProperty } from './propertyService.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { esc, lineChart, money, pct, periodWords, rankBars, toneOf } from './chartsSvg.js';

const COLOURS = ['#2a78d6', '#1baf7a', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1', '#4a5170', '#b8891a', '#8a4fd8', '#127a5d', '#c0392b'];

const back = (list, months, key) => {
  if (!list?.length) return null;
  const last = list.at(-1);
  const [y, m] = last.p.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - months, 1));
  const p = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const then = list.find((x) => x.p === p);
  return then && then[key] ? then[key] : null;
};
const change = (now, then) => (now && then ? (now / then - 1) * 100 : null);
const cagr = (now, then, years) => (now && then ? ((now / then) ** (1 / years) - 1) * 100 : null);

/** Everything worked out for one city. */
export function cityFacts(c, d) {
  if (!d) return null;
  if (c.country === 'uk') {
    const rent = d.rents?.at(-1) || null;
    const price = d.prices?.at(-1) || null;
    if (!rent && !price) return null;
    const yieldPct = rent && price ? (rent.rent * 12 / price.price) * 100 : null;
    return {
      ...c, kind: 'uk', rent, price, yieldPct,
      rent1y: rent ? change(rent.rent, back(d.rents, 12, 'rent')) : null,
      rent5y: rent ? cagr(rent.rent, back(d.rents, 60, 'rent'), 5) : null,
      price1y: price ? change(price.price, back(d.prices, 12, 'price')) : null,
      price5y: price ? cagr(price.price, back(d.prices, 60, 'price'), 5) : null,
      yearsOfRent: rent && price ? price.price / (rent.rent * 12) : null,
      history: (d.rents || []).slice(-61).map((x) => ({ p: x.p, v: x.rent })),
    };
  }
  const idx = d.rentIndex?.at(-1) || null;
  if (!idx) return null;
  const base = back(d.rentIndex, 60, 'index');
  return {
    ...c, kind: 'us', rentIndexLatest: idx,
    rent1y: change(idx.index, back(d.rentIndex, 12, 'index')),
    rent5y: cagr(idx.index, base, 5),
    history: base ? d.rentIndex.slice(-61).map((x) => ({ p: x.p, v: (x.index / base) * 100 })) : [],
  };
}

/* ── The Premium scorecard (rules in CITY_CRITERIA) ──────────────────── */
const step = (v, cuts) => { if (v === null || v === undefined) return null; let s = 1; cuts.forEach((c, i) => { if (v >= c) s = i + 2; }); return Math.min(5, s); };
export function cityScore(f) {
  const stars = [
    ['Rental yield', step(f.yieldPct, [3, 4, 5, 6])],
    ['Rent growth', step(f.rent5y, [1.5, 3, 4.5, 6])],
    ['Rent momentum', step(f.rent1y, [0, 2, 4, 6])],
    ['Price growth', step(f.price5y, [0.5, 2, 3.5, 5])],
    ['Affordability', f.yearsOfRent ? 6 - step(f.yearsOfRent, [15, 18, 22, 27]) : null],
  ];
  const scored = stars.filter(([, s]) => s !== null);
  const overall = scored.length ? Math.round((scored.reduce((a, [, s]) => a + s, 0) / scored.length) * 2) / 2 : null;
  // If the last five years' pace simply continued (arithmetic, not a forecast)
  const in5 = (now, rate) => (now && rate !== null ? now * (1 + rate / 100) ** 5 : null);
  return {
    stars, overall, partial: scored.length < 5,
    projection: { rent: f.kind === 'uk' ? in5(f.rent?.rent, f.rent5y) : null, price: f.kind === 'uk' ? in5(f.price?.price, f.price5y) : null, rentGrowth5: f.rent5y !== null ? ((1 + f.rent5y / 100) ** 5 - 1) * 100 : null },
  };
}

export async function premiumCities() {
  const data = await readProperty();
  return CITY_LIST.map((c) => cityFacts(c, data.cities?.[c.slug])).filter(Boolean)
    .map((f) => ({ slug: f.slug, name: f.name, country: f.country, ...cityScore(f), yieldPct: f.yieldPct, rent1y: f.rent1y, rent5y: f.rent5y, price5y: f.price5y, rent: f.rent?.rent || null, price: f.price?.price || null }))
    .sort((a, b) => Number(a.partial) - Number(b.partial) || (b.overall ?? 0) - (a.overall ?? 0) || (b.yieldPct ?? 0) - (a.yieldPct ?? 0));
}

/* ── Page ───────────────────────────────────────────────────────────── */
export async function renderPropertyCities(origin) {
  const data = await readProperty();
  const facts = CITY_LIST.map((c) => cityFacts(c, data.cities?.[c.slug])).filter(Boolean);
  const uk = facts.filter((f) => f.kind === 'uk');
  const us = facts.filter((f) => f.kind === 'us');
  const head = buildHeadTags({
    title: 'City rents and rental yields: London, Manchester, Birmingham, New York and more | Dr MoneyWise',
    description: 'Average rents, house prices and gross rental yields for big UK cities, rent growth for New York, Los Angeles and Chicago, with five years of history, from official figures.',
    canonical: `${origin}/property/cities`,
  });
  const latestRent = uk.map((f) => f.rent?.p).filter(Boolean).sort().at(-1);
  const ukTable = uk.length ? `
        <div class="table-scroll"><table class="pr-table ct-table">
          <thead><tr><th>City</th><th class="num">Average rent a month</th><th class="num">Rent vs a year ago</th><th class="num">Average price</th><th class="num">Price vs a year ago</th><th class="num">Gross yield</th><th class="num">Years of rent to buy</th></tr></thead>
          <tbody>${uk.map((f) => `<tr><th scope="row">${esc(f.name)}</th>
            <td class="num">${f.rent ? money(f.rent.rent, 'GBP') : '—'}</td>
            <td class="num ${toneOf(f.rent1y)}">${pct(f.rent1y)}</td>
            <td class="num">${f.price ? money(f.price.price, 'GBP') : '—'}</td>
            <td class="num ${toneOf(f.price1y)}">${pct(f.price1y)}</td>
            <td class="num"><b class="ct-yield">${f.yieldPct ? `${f.yieldPct.toFixed(1)}%` : '—'}</b></td>
            <td class="num">${f.yearsOfRent ? f.yearsOfRent.toFixed(0) : '—'}</td></tr>`).join('')}</tbody>
        </table></div>` : '';
  const yieldRows = uk.filter((f) => f.yieldPct).map((f) => ({ name: f.name, v: f.yieldPct })).sort((a, b) => b.v - a.v);
  const ukChart = uk.filter((f) => f.history.length > 12).slice(0, 8);
  const usChart = us.filter((f) => f.history.length > 12);
  const tiles = uk.filter((f) => f.rent).slice(0, 4).map((f, i) => `<div class="ct-tile" style="--c:${COLOURS[i]}"><span>${esc(f.name)}</span><strong>${money(f.rent.rent, 'GBP')}</strong><em>a month · <b class="${toneOf(f.rent1y)}">${pct(f.rent1y)}</b> in a year</em>${f.yieldPct ? `<i>Gross yield ${f.yieldPct.toFixed(1)}%</i>` : ''}</div>`).join('');

  const body = `
      <section class="block pr-page">
        <p class="crumbs"><a href="/property">Property</a> › City rents and yields</p>
        <div class="pr-hero"><div><h1>City rents and rental yields</h1>
          <p class="lede-dark">What renting costs in big cities, how fast rents are rising, and what a landlord earns in rent compared with the price of a home (the gross rental yield). From official figures, checked every week${latestRent ? `; latest rents for ${esc(periodWords(latestRent))}` : ''}.</p></div></div>
        ${tiles ? `<div class="ct-tiles">${tiles}</div>` : '<p class="note-box">City figures are being collected and appear after the next weekly update.</p>'}

        ${ukTable ? `<div class="pr-panel"><h2>UK cities at a glance</h2><p class="helper-note">Gross yield = a year’s rent ÷ average price, before costs such as repairs, letting fees, empty months, mortgage interest and tax. Real returns are lower.</p>${ukTable}</div>` : ''}
        ${yieldRows.length ? `<div class="pr-panel"><h2>Gross rental yield by city</h2>${rankBars({ rows: yieldRows, title: 'Gross rental yield by city', fmt: (v) => `${v.toFixed(1)}%`, link: false })}</div>` : ''}
        ${ukChart.length ? `<div class="pr-panel"><h2>Average monthly rent, last five years</h2><p class="helper-note">Pounds a month, all property types. Hover for each month.</p>${lineChart({ series: ukChart.map((f, i) => ({ name: f.name, color: COLOURS[i], points: f.history })), title: 'Average monthly rent in UK cities over five years', fmt: (v) => money(v, 'GBP') })}</div>` : ''}
        ${usChart.length ? `<div class="pr-panel"><h2>US city rents, last five years</h2><p class="helper-note">How rents have risen, with each city’s rent five years ago set to 100 (so 125 means rents are 25% higher). US official figures give rent changes, not dollar amounts, so we show growth rather than yields.</p>${lineChart({ series: usChart.map((f, i) => ({ name: f.name, color: COLOURS[i + 3], points: f.history })), title: 'Rent growth in US cities over five years', fmt: (v) => v.toFixed(0) })}
          <div class="ct-us">${us.map((f) => `<div><strong>${esc(f.name)}</strong><span>Rents <b class="${toneOf(f.rent1y)}">${pct(f.rent1y)}</b> in a year, about ${f.rent5y !== null ? `${f.rent5y.toFixed(1)}%` : '—'} a year over five years</span></div>`).join('')}</div></div>` : ''}

        <div class="ct-prem" id="cityPremium">
          <div class="ct-prem-head"><span class="pf-badge prem">★ Premium</span><h2>City scorecard: five stars, five tests</h2></div>
          <p>Premium members see every city rated out of five stars on five fixed tests, a ranking of the cities that score best, and what rents and prices would be in five years if the last five years’ pace simply continued.</p>
          <ul class="ct-criteria">${CITY_CRITERIA.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join('')}</ul>
          <a class="mb-btn prem-btn" href="/membership">See Premium</a>
        </div>

        <details class="pr-explain"><summary>Reading these figures</summary><ul>
          <li><strong>Gross rental yield</strong> is a year’s rent divided by the price of the home. A £200,000 flat let for £1,000 a month has a gross yield of 6%.</li>
          <li><strong>Net yield</strong>, after repairs, letting agent fees, insurance, empty months, mortgage interest and tax, is often 1.5 to 3 percentage points lower.</li>
          <li>Averages hide a lot: rents and prices differ street by street, and by type of home.</li>
          <li>Figures describe the past; they are not a forecast and not advice to buy property.</li>
        </ul></details>
        <div class="pr-sources"><h2>Sources</h2><ul>${CITY_CREDITS.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
      </section>
      <script src="/citiesprem.js" defer></script>`;
  return pageShell({ head, body, active: 'property' });
}

/** Small summary box for the /property hub. */
export async function citiesTeaserHtml() {
  const data = await readProperty();
  const uk = CITY_LIST.filter((c) => c.country === 'uk').map((c) => cityFacts(c, data.cities?.[c.slug])).filter((f) => f?.rent);
  return `<a class="ct-teaser" href="/property/cities"><div><strong>City rents and rental yields</strong><span>${uk.length ? uk.slice(0, 3).map((f) => `${esc(f.name)} ${money(f.rent.rent, 'GBP')} a month${f.yieldPct ? ` (yield ${f.yieldPct.toFixed(1)}%)` : ''}`).join(' · ') : 'London, Manchester, Birmingham, New York and more: rents, yields and five years of history.'}</span></div><em>Open →</em></a>`;
}
