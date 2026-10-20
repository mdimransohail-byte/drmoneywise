/* ════════════════════════════════════════════════════════════════════════
   PROPERTY PAGES
     /property            pick a place + compare all places at a glance
     /property/<place>    summary, price charts, yearly changes, rents,
                          affordability, sources
   Everything is worked out from official figures (see propertyService.js).
   The written summaries are filled in from the numbers by simple rules —
   nothing is guessed. These pages are FREE for everyone (the BIS terms
   allow commercial use only when the figures are not behind a paywall).
   ════════════════════════════════════════════════════════════════════════ */

import { PROPERTY_CREDITS, PROPERTY_PLACES, getPlace } from '../data/propertyPlaces.js';
import { readProperty, readPropertyManual } from './propertyService.js';
import { readEconomy } from './dataEngine.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { adSlot } from './adService.js';
import { newsBlockHtml } from './newsBlock.js';

import { C, MONTHS, QWORDS, changeBars, changeOver, esc, gauge, lineChart, money, niceTicks, pct, periodWords, plainPct, rankBars, shortPeriod, spark, tile, toneOf, upDown } from './chartsSvg.js';

export { periodWords };
/* ── Numbers worked out from the series ───────────────────────────── */
function placeFacts(place, d) {
  const bis = d?.bis;
  if (!bis?.nominal?.length) return null;
  const latest = bis.nominal.at(-1);
  const yoy = bis.yoy?.at(-1)?.p === latest.p ? bis.yoy.at(-1).v : changeOver(bis.nominal, 4);
  const realYoy = bis.realYoy?.at(-1)?.v ?? changeOver(bis.real, 4);
  const fiveYear = changeOver(bis.nominal, 20);
  const tenYear = changeOver(bis.nominal, 40);
  const realTen = changeOver(bis.real, 40);
  const peak = bis.nominal.reduce((m, x) => (x.v > m.v ? x : m), bis.nominal[0]);
  const fromPeak = peak.v ? ((latest.v / peak.v) - 1) * 100 : 0;
  const rentYoy = d.blsRent?.yoy?.at(-1) || d.oecd?.rentYoy?.at(-1) || null;
  const income = d.oecd?.priceToIncome?.at(-1) || null;
  const rentRatio = d.oecd?.priceToRent?.at(-1) || null;
  return { latest, yoy, realYoy, fiveYear, tenYear, realTen, peak, fromPeak, rentYoy, income, rentRatio };
}

/** The executive summary: short sentences filled in from the figures. */
function summaryLines(place, f, d, extra = {}) {
  const lines = [];
  const when = periodWords(f.latest.p);
  if (f.yoy !== null) lines.push(`Home prices in ${place.called || place.name} were <strong>${f.yoy >= 0 ? 'up' : 'down'} ${plainPct(f.yoy)}</strong> on a year earlier (${when}).`);
  if (f.realYoy !== null && f.realYoy !== undefined) {
    lines.push(f.realYoy >= 0
      ? `That is faster than prices of everyday things rose, so homes got <strong>${plainPct(f.realYoy)} dearer</strong> after inflation.`
      : `Everyday prices rose faster, so after inflation homes were <strong>${plainPct(f.realYoy)} cheaper</strong> in real terms.`);
  }
  if (f.fiveYear !== null) lines.push(`Over five years, prices are <strong>${upDown(f.fiveYear)} ${plainPct(f.fiveYear, 0)}</strong>.`);
  if (f.fromPeak > -0.5) lines.push('Prices are at or close to their highest level on record in our figures.');
  else lines.push(`Prices are <strong>${plainPct(f.fromPeak)} below</strong> their peak in ${periodWords(f.peak.p)}.`);
  if (f.rentYoy) lines.push(`Rents were <strong>${upDown(f.rentYoy.v)} ${plainPct(f.rentYoy.v)}</strong> on a year earlier (${periodWords(f.rentYoy.p)}).`);
  if (f.income) {
    const gap = f.income.v - 100;
    lines.push(Math.abs(gap) < 3
      ? 'Compared with what people earn, homes cost about the same as their long-term average.'
      : `Compared with what people earn, homes cost <strong>${plainPct(gap, 0)} ${gap > 0 ? 'more' : 'less'}</strong> than their long-term average.`);
  }
  if (extra.ukLatest) lines.push(`The average UK home cost <strong>${money(extra.ukLatest.price, 'GBP')}</strong> in ${periodWords(extra.ukLatest.p)}${extra.londonLatest ? `, and <strong>${money(extra.londonLatest.price, 'GBP')}</strong> in London` : ''}.`);
  if (extra.mortgage) lines.push(`A 30-year fixed mortgage cost <strong>${extra.mortgage.value}%</strong> a year (week of ${new Date(extra.mortgage.asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}).`);
  return lines;
}


function picker(current = '') {
  return `<form class="pr-picker" action="/property" method="get">
        <label for="prPlace">Choose a place</label>
        <select id="prPlace" name="place" onchange="if(this.value)location.href='/property/'+this.value">
          ${current ? '' : '<option value="">Select…</option>'}${PROPERTY_PLACES.map((p) => `<option value="${esc(p.slug)}"${p.slug === current ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
        <noscript><button type="submit">Go</button></noscript>
      </form>`;
}

function credits(keys) {
  return `<div class="pr-sources"><h2>Where these figures come from</h2><ul>${[...new Set(keys)].map((k) => PROPERTY_CREDITS[k]).filter(Boolean).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        <p>Figures are updated weekly from each source; most publish monthly or every three months, so the latest period is usually a few months back. For education only, not advice on buying or selling property.</p></div>`;
}

const EXPLAIN = `
      <details class="pr-explain"><summary>How to read these numbers</summary>
        <ul>
          <li><strong>"Up 3% on a year earlier"</strong> compares prices with the same months one year before.</li>
          <li><strong>"After inflation"</strong> takes away the general rise in prices of everyday things. If homes rose 3% but everything else rose 4%, homes really got 1% cheaper.</li>
          <li><strong>"Compared with incomes"</strong>: 100 means homes cost the usual amount compared with what people earn. 120 means they cost 20% more than usual.</li>
          <li>These are averages for a whole country. Prices in your town or street can move very differently.</li>
        </ul>
      </details>`;

/* ── /property ────────────────────────────────────────────────────── */
export async function renderPropertyHub(origin) {
  const [data, manual] = await Promise.all([readProperty(), readPropertyManual()]);
  const facts = PROPERTY_PLACES.map((place) => ({ place, f: placeFacts(place, data.places?.[place.slug]) }));
  const withData = facts.filter((x) => x.f);
  const head = buildHeadTags({
    title: 'Property prices around the world: US, UK, Dubai, India and more | Dr MoneyWise',
    description: 'How home prices and rents are changing in the US, UK, Dubai, India, Thailand and more, in plain English, from official figures.',
    canonical: `${origin}/property`,
  });

  const dubaiRows = manual.dubai?.rows || [];
  const cards = facts.map(({ place, f }) => {
    if (place.manual) {
      const last = dubaiRows.at(-1);
      return `<a class="pr-card" href="/property/${place.slug}"><span class="pr-card-name">${esc(place.name)}</span>${last
        ? `<strong class="pr-card-big">${last.salesValueBn !== null ? `AED ${esc(last.salesValueBn)}bn` : `${esc(last.salesCount?.toLocaleString('en-GB'))} sales`}</strong><span class="pr-card-note">sold in ${esc(periodWords(last.period))}</span>`
        : '<strong class="pr-card-big muted">Coming soon</strong><span class="pr-card-note">Quarterly sales figures</span>'}<span class="pr-card-go">Open</span></a>`;
    }
    if (!f) return `<a class="pr-card" href="/property/${place.slug}"><span class="pr-card-name">${esc(place.name)}</span><strong class="pr-card-big muted">Updating</strong><span class="pr-card-note">Figures arrive with the next update</span><span class="pr-card-go">Open</span></a>`;
    return `<a class="pr-card" href="/property/${place.slug}"><span class="pr-card-name">${esc(place.name)}</span><strong class="pr-card-big ${toneOf(f.yoy)}">${esc(pct(f.yoy))}</strong><span class="pr-card-note">prices vs a year earlier · ${esc(periodWords(f.latest.p))}</span>${spark(data.places[place.slug].bis.nominal)}<span class="pr-card-go">Open</span></a>`;
  }).join('');

  const yoyRows = withData.filter((x) => x.f.yoy !== null).map(({ place, f }) => ({ slug: place.slug, name: place.name, v: f.yoy, p: f.latest.p })).sort((a, b) => b.v - a.v);
  const fiveRows = withData.filter((x) => x.f.fiveYear !== null).map(({ place, f }) => ({ slug: place.slug, name: place.name, v: f.fiveYear, p: f.latest.p })).sort((a, b) => b.v - a.v);
  const fastest = yoyRows[0];
  const slowest = yoyRows.at(-1);
  const falling = yoyRows.filter((r) => r.v < 0);
  const hubSummary = yoyRows.length >= 2 ? `
      <div class="pr-summary">
        <h2>The picture in short</h2>
        <ul>
          <li>Prices rose fastest in <strong>${esc(fastest.name)}</strong> (${esc(pct(fastest.v))} on a year earlier) and slowest in <strong>${esc(slowest.name)}</strong> (${esc(pct(slowest.v))}).</li>
          <li>${falling.length ? `Prices were lower than a year earlier in ${falling.map((r) => `<strong>${esc(r.name)}</strong>`).join(', ')}.` : `Prices were higher than a year earlier in all ${yoyRows.length} places with figures.`}</li>
          ${fiveRows.length ? `<li>Over five years, <strong>${esc(fiveRows[0].name)}</strong> rose the most (${esc(pct(fiveRows[0].v, 0))}).</li>` : ''}
        </ul>
      </div>` : '';

  const table = withData.length ? `
      <div class="table-scroll"><table class="pr-table">
        <thead><tr><th>Place</th><th>Latest figures</th><th class="num">vs a year earlier</th><th class="num">After inflation</th><th class="num">5 years</th></tr></thead>
        <tbody>${withData.map(({ place, f }) => `<tr><th scope="row"><a href="/property/${place.slug}">${esc(place.name)}</a></th><td>${esc(periodWords(f.latest.p))}</td><td class="num ${toneOf(f.yoy)}">${esc(pct(f.yoy))}</td><td class="num ${toneOf(f.realYoy)}">${esc(pct(f.realYoy))}</td><td class="num ${toneOf(f.fiveYear)}">${esc(pct(f.fiveYear, 0))}</td></tr>`).join('')}</tbody>
      </table></div>` : '';

  const body = `
      <section class="block pr-page">
        <div class="pr-hero">
          <div>
            <h1>Property prices around the world</h1>
            <p class="lede-dark">How home prices and rents are changing, in plain English, from official figures. Pick a place to see the full picture.</p>
          </div>
          ${picker()}
        </div>
        <div class="pr-cards">${cards}</div>
        ${hubSummary}
        ${yoyRows.length ? `<div class="pr-panel"><h2>Home prices vs a year earlier</h2><p class="helper-note">Latest official figures for each place. Click a place for the details.</p>${rankBars({ rows: yoyRows, title: 'Change in home prices on a year earlier, by place' })}</div>` : '<p class="note-box">The first property figures are being collected. Please check back shortly.</p>'}
        ${fiveRows.length ? `<div class="pr-panel"><h2>Change over five years</h2>${rankBars({ rows: fiveRows, title: 'Change in home prices over five years, by place' })}</div>` : ''}
        ${table}
        ${adSlot('in-content')}
        ${EXPLAIN}
        ${credits(['bis', 'oecd', 'bls-rent', 'ukhpi', 'manual'])}
      </section>`;
  return pageShell({ head, body, active: 'property' });
}

/* ── /property/<place> ────────────────────────────────────────────── */
export async function renderPropertyPlace(origin, slug) {
  const place = getPlace(slug);
  if (!place) return null;
  if (place.manual) return renderManualPlace(origin, place);
  const [data, economy] = await Promise.all([readProperty(), readEconomy()]);
  const d = data.places?.[slug] || {};
  const f = placeFacts(place, d);
  const head = buildHeadTags({
    title: `${place.name} property prices and rents: latest figures | Dr MoneyWise`,
    description: `How home prices${place.extras.includes('bls-rent') || place.oecd ? ' and rents' : ''} are changing in ${place.name}, in plain English: yearly changes, after inflation, and the trend over ten years.`,
    canonical: `${origin}/property/${slug}`,
  });
  const top = `
        <p class="crumbs"><a href="/property">Property</a> › ${esc(place.name)}</p>
        <div class="pr-hero">
          <div><h1>Property in ${esc(place.called || place.name)}</h1><p class="lede-dark">${esc(place.intro)}</p></div>
          ${picker(slug)}
        </div>`;
  if (!f) {
    return pageShell({ head, active: 'property', body: `<section class="block pr-page">${top}<p class="note-box">The figures for ${esc(place.called || place.name)} are being collected. Please check back shortly.</p>${credits(['bis'])}</section>` });
  }

  const ukLatest = d.ukhpi?.uk?.at(-1);
  const londonLatest = d.ukhpi?.london?.at(-1);
  const mortgage = place.extras.includes('us-mortgage') ? economy.figures?.mortgageRate : null;
  const lines = summaryLines(place, f, d, { ukLatest, londonLatest, mortgage });

  // 10-year price chart, re-based so the first point = 100
  const n10 = d.bis.nominal.slice(-41);
  const r10 = (d.bis.real || []).filter((x) => n10.some((y) => y.p === x.p));
  const rebase = (list) => (list.length ? list.map((x) => ({ p: x.p, v: (x.v / list[0].v) * 100 })) : []);
  const priceSeries = [{ name: 'Home prices', color: C.blue, points: rebase(n10) }];
  if (r10.length === n10.length) priceSeries.push({ name: 'After inflation', color: C.orange, points: rebase(r10) });
  const startYear = n10[0]?.p ? periodWords(n10[0].p) : '';

  const yoy8 = (d.bis.yoy?.length ? d.bis.yoy : []).slice(-8);
  const rentYoy = d.blsRent?.yoy?.length ? d.blsRent.yoy : d.oecd?.rentYoy || [];
  const rentSource = d.blsRent?.yoy?.length ? 'bls-rent' : rentYoy.length ? 'oecd' : null;
  const rentPoints = d.blsRent?.yoy?.length ? rentYoy.filter((x) => /-(03|06|09|12)$/u.test(x.p)).slice(-8) : rentYoy.slice(-8);

  const tiles = [
    tile('Prices vs a year earlier', esc(pct(f.yoy)), esc(periodWords(f.latest.p)), toneOf(f.yoy)),
    tile('After inflation', esc(pct(f.realYoy)), 'real change in a year', toneOf(f.realYoy)),
    tile('Over 5 years', esc(pct(f.fiveYear, 0)), f.fiveYear !== null ? 'before inflation' : 'not enough history', toneOf(f.fiveYear)),
    f.rentYoy ? tile('Rents vs a year earlier', esc(pct(f.rentYoy.v)), esc(periodWords(f.rentYoy.p)), toneOf(f.rentYoy.v)) : '',
    ukLatest ? tile('Average UK home', esc(money(ukLatest.price, 'GBP')), `${esc(periodWords(ukLatest.p))}${ukLatest.yoy !== null ? ` · ${esc(pct(ukLatest.yoy))} in a year` : ''}`) : '',
    londonLatest ? tile('Average London home', esc(money(londonLatest.price, 'GBP')), `${esc(periodWords(londonLatest.p))}${londonLatest.yoy !== null ? ` · ${esc(pct(londonLatest.yoy))} in a year` : ''}`) : '',
    mortgage ? tile('30-year mortgage rate', `${esc(mortgage.value)}%`, 'Freddie Mac weekly survey') : '',
  ].filter(Boolean).join('');

  const ukChart = d.ukhpi?.uk?.length >= 13 ? (() => {
    const months = d.ukhpi.uk.slice(-36);
    const lon = (d.ukhpi.london || []).filter((x) => months.some((m) => m.p === x.p));
    const series = [{ name: 'UK average', color: C.blue, points: months.map((x) => ({ p: x.p, v: x.price })) }];
    if (lon.length === months.length) series.push({ name: 'London average', color: C.orange, points: lon.map((x) => ({ p: x.p, v: x.price })) });
    return `<div class="pr-panel"><h2>Average price in pounds</h2><p class="helper-note">Monthly, from HM Land Registry. Hover or tap the chart for each month.</p>${lineChart({ series, title: 'Average home price, UK and London', fmt: (v) => `£${Math.round(v / 1000)}k` })}</div>`;
  })() : '';

  const afford = (f.income || f.rentRatio) ? `
        <div class="pr-panel"><h2>Is buying expensive right now?</h2>
          <p class="helper-note">Two ways economists check, compared with each one's long-term average (OECD, ${esc(periodWords((f.income || f.rentRatio).p))}).</p>
          <div class="pr-gauges">
            ${f.income ? gauge({ value: f.income.v, label: 'Prices compared with incomes', low: 'Cheaper', high: 'Dearer' }) : ''}
            ${f.rentRatio ? gauge({ value: f.rentRatio.v, label: 'Prices compared with rents', low: 'Buying cheaper', high: 'Renting cheaper' }) : ''}
          </div>
        </div>` : '';

  const others = PROPERTY_PLACES.filter((p) => p.slug !== slug).map((p) => `<a href="/property/${p.slug}">${esc(p.name)}</a>`).join('');
  const creditKeys = ['bis', ...(d.oecd ? ['oecd'] : []), ...(d.blsRent ? ['bls-rent'] : []), ...(d.ukhpi ? ['ukhpi'] : []), ...(mortgage ? ['us-mortgage'] : [])];

  const body = `
      <section class="block pr-page">
        ${top}
        <p class="pr-updated">Updated weekly · Latest official figures: <strong>${esc(periodWords(f.latest.p))}</strong></p>
        <div class="pr-summary"><h2>In short</h2><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>
        <div class="pr-tiles">${tiles}</div>
        <div class="pr-panel"><h2>Home prices over ${n10.length > 30 ? 'ten' : 'recent'} years</h2>
          <p class="helper-note">If a home cost 100 in ${esc(startYear)}, this is what it would cost now. "After inflation" takes away the rise in everyday prices.</p>
          ${lineChart({ series: priceSeries, title: `Home prices in ${place.name}, re-based to 100` })}
        </div>
        ${yoy8.length ? `<div class="pr-panel"><h2>Price change on a year earlier</h2><p class="helper-note">Each bar compares three months with the same three months a year before.</p>${changeBars({ points: yoy8, title: `Yearly change in home prices, ${place.name}` })}</div>` : ''}
        ${ukChart}
        ${rentPoints.length ? `<div class="pr-panel"><h2>Rents: change on a year earlier</h2><p class="helper-note">${rentSource === 'bls-rent' ? 'What tenants pay across the US (Bureau of Labor Statistics).' : 'Rents across the country (OECD).'}</p>${changeBars({ points: rentPoints, title: `Yearly change in rents, ${place.name}` })}</div>` : `<p class="note-box">We do not have an official rent figure for ${esc(place.called || place.name)} that we are allowed to republish yet, so rents are left out rather than guessed.</p>`}
        ${afford}
        ${await newsBlockHtml('property', slug, { title: `In the news: property in ${place.called || place.name}`, subject: `the ${place.name} property market`, search: `${place.name} property market` })}
        ${adSlot('in-content')}
        ${EXPLAIN}
        ${adSlot('partner-box')}
        ${credits(creditKeys)}
        <div class="pr-others"><h2>Other places</h2><div>${others}</div></div>
      </section>`;
  return pageShell({ head, body, active: 'property' });
}

/* ── Dubai (figures typed in by Admin from official announcements) ── */
async function renderManualPlace(origin, place) {
  const manual = await readPropertyManual();
  const rows = manual[place.slug]?.rows || [];
  const head = buildHeadTags({
    title: `${place.name} property: sales and prices each quarter | Dr MoneyWise`,
    description: `How many homes sold in ${place.name} each quarter and their total value, in plain English, from official announcements.`,
    canonical: `${origin}/property/${place.slug}`,
  });
  const top = `
        <p class="crumbs"><a href="/property">Property</a> › ${esc(place.name)}</p>
        <div class="pr-hero">
          <div><h1>Property in ${esc(place.called || place.name)}</h1><p class="lede-dark">${esc(place.intro)}</p></div>
          ${picker(place.slug)}
        </div>`;
  if (!rows.length) {
    return pageShell({ head, active: 'property', body: `<section class="block pr-page">${top}<p class="note-box">Figures for ${esc(place.name)} are coming soon. We only show numbers we can link to an official source.</p>${await newsBlockHtml('property', place.slug, { title: `In the news: property in ${place.name}`, subject: `the ${place.name} property market`, search: `${place.name} property market` })}<div class="pr-others"><h2>Other places</h2><div>${PROPERTY_PLACES.filter((p) => p.slug !== place.slug).map((p) => `<a href="/property/${p.slug}">${esc(p.name)}</a>`).join('')}</div></div></section>` });
  }
  const last = rows.at(-1);
  const yearAgo = rows.find((r) => r.period === `${Number(last.period.slice(0, 4)) - 1}${last.period.slice(4)}`);
  const ch = (a, b) => (a !== null && b !== null && b ? ((a / b) - 1) * 100 : null);
  const valueChange = yearAgo ? ch(last.salesValueBn, yearAgo.salesValueBn) : null;
  const countChange = yearAgo ? ch(last.salesCount, yearAgo.salesCount) : null;
  const priceChange = yearAgo ? ch(last.pricePerSqft, yearAgo.pricePerSqft) : null;

  const lines = [];
  if (last.salesCount !== null) lines.push(`<strong>${last.salesCount.toLocaleString('en-GB')}</strong> property sales were recorded in ${esc(periodWords(last.period))}${countChange !== null ? `, ${countChange >= 0 ? 'up' : 'down'} <strong>${plainPct(countChange)}</strong> on the same months a year earlier` : ''}.`);
  if (last.salesValueBn !== null) lines.push(`They were worth <strong>AED ${esc(last.salesValueBn)} billion</strong> in total${valueChange !== null ? `, ${valueChange >= 0 ? 'up' : 'down'} <strong>${plainPct(valueChange)}</strong> on a year earlier` : ''}.`);
  if (last.pricePerSqft !== null) lines.push(`The average price was <strong>AED ${last.pricePerSqft.toLocaleString('en-GB')}</strong> per square foot${priceChange !== null ? ` (${pct(priceChange)} in a year)` : ''}.`);
  if (last.rentChangePct !== null && last.rentChangePct !== undefined) lines.push(`Rents were ${last.rentChangePct >= 0 ? 'up' : 'down'} <strong>${plainPct(last.rentChangePct)}</strong> on a year earlier.`);

  const valueSeries = rows.filter((r) => r.salesValueBn !== null).slice(-8);
  const W = 760; const H = 240; const L = 50; const B = 34; const T = 22;
  const max = Math.max(...valueSeries.map((r) => r.salesValueBn), 1);
  const ticks = niceTicks(0, max, 4);
  const Y = (v) => T + (1 - v / ticks.at(-1)) * (H - T - B);
  const slot = (W - L - 12) / Math.max(1, valueSeries.length);
  const bw = Math.min(50, slot * 0.6);
  const valueChart = valueSeries.length ? `<div class="pr-chart"><svg class="pr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Value of property sales each quarter, AED billion">${ticks.map((t) => `<line x1="${L}" x2="${W - 12}" y1="${Y(t)}" y2="${Y(t)}" stroke="${t === 0 ? C.axis : C.grid}"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="${C.text}">${t}</text>`).join('')}${valueSeries.map((r, i) => {
    const cx = L + slot * i + slot / 2; const y = Y(r.salesValueBn); const h = Y(0) - y;
    return `<g class="pr-hit"><rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(1, h)}" rx="4" fill="${C.blue}"/><text x="${cx}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.ink}">${esc(r.salesValueBn)}</text><text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="11.5" fill="${C.text}">${esc(shortPeriod(r.period))}</text><title>${esc(periodWords(r.period))}: AED ${esc(r.salesValueBn)} billion</title></g>`;
  }).join('')}</svg></div>` : '';

  const body = `
      <section class="block pr-page">
        ${top}
        <p class="pr-updated">Latest figures: <strong>${esc(periodWords(last.period))}</strong></p>
        <div class="pr-summary"><h2>In short</h2><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>
        <div class="pr-tiles">
          ${last.salesCount !== null ? tile('Sales in the quarter', esc(last.salesCount.toLocaleString('en-GB')), countChange !== null ? `${esc(pct(countChange))} vs a year earlier` : esc(periodWords(last.period)), toneOf(countChange)) : ''}
          ${last.salesValueBn !== null ? tile('Total value', `AED ${esc(last.salesValueBn)}bn`, valueChange !== null ? `${esc(pct(valueChange))} vs a year earlier` : esc(periodWords(last.period)), toneOf(valueChange)) : ''}
          ${last.pricePerSqft !== null ? tile('Average price per sq ft', `AED ${esc(last.pricePerSqft.toLocaleString('en-GB'))}`, priceChange !== null ? `${esc(pct(priceChange))} vs a year earlier` : '', toneOf(priceChange)) : ''}
          ${last.rentChangePct !== null && last.rentChangePct !== undefined ? tile('Rents vs a year earlier', esc(pct(last.rentChangePct)), '', toneOf(last.rentChangePct)) : ''}
        </div>
        ${valueChart ? `<div class="pr-panel"><h2>Value of sales each quarter (AED billion)</h2>${valueChart}</div>` : ''}
        <div class="table-scroll"><table class="pr-table">
          <thead><tr><th>Quarter</th><th class="num">Sales</th><th class="num">Value (AED bn)</th><th class="num">AED per sq ft</th><th>Source</th></tr></thead>
          <tbody>${rows.slice().reverse().map((r) => `<tr><th scope="row">${esc(periodWords(r.period))}</th><td class="num">${r.salesCount !== null ? esc(r.salesCount.toLocaleString('en-GB')) : '—'}</td><td class="num">${r.salesValueBn ?? '—'}</td><td class="num">${r.pricePerSqft !== null ? esc(r.pricePerSqft.toLocaleString('en-GB')) : '—'}</td><td><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener nofollow">${esc(r.sourceName || 'Official source')}</a></td></tr>`).join('')}</tbody>
        </table></div>
        ${await newsBlockHtml('property', place.slug, { title: `In the news: property in ${place.name}`, subject: `the ${place.name} property market`, search: `${place.name} property market` })}
        ${adSlot('in-content')}
        ${credits(['manual'])}
        <div class="pr-others"><h2>Other places</h2><div>${PROPERTY_PLACES.filter((p) => p.slug !== place.slug).map((p) => `<a href="/property/${p.slug}">${esc(p.name)}</a>`).join('')}</div></div>
      </section>`;
  return pageShell({ head, body, active: 'property' });
}

export function propertySitemapEntries(origin) {
  const today = new Date().toISOString().slice(0, 10);
  return [{ loc: `${origin}/property`, lastmod: today, priority: '0.7' }, ...PROPERTY_PLACES.map((p) => ({ loc: `${origin}/property/${p.slug}`, lastmod: today, priority: '0.6' }))];
}
