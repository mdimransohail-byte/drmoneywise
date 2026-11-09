/* ════════════════════════════════════════════════════════════════════════
   SHARIAH-COMPLIANT INVESTING PAGES
     /shariah              how screening works, the five standards side by
                           side, the markets, purification
     /shariah/<market>     every company we cover in that market against
                           each standard, the Shariah funds that hold it,
                           local funds (us, uk, ireland, europe, hong-kong, india)
                           or, for fund countries (malaysia, saudi-arabia,
                           uae, indonesia, pakistan, canada), the official
                           local Shariah list or index and the local funds
     /shariah/funds        Shariah ETFs, mutual funds and sukuk funds, with
                           real holdings from SEC reports for US funds
   Free to read. Premium members also see each company's ratios and the
   share of dividends to give away (public/shariah.js, /api/shariah).
   ════════════════════════════════════════════════════════════════════════ */

import { BUSINESS_WORDS, MARKET_FACTS, MARKET_NOTES, METHODS, SHARIAH_FUNDS, SHARIAH_MARKETS, SHARIAH_SOURCES } from '../data/shariahData.js';
import { shariahFundsData, shariahTable } from './shariahService.js';
import { readCompanies } from './dataEngine.js';
import { companyLogo } from './stockPages.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { esc, tile } from './chartsSvg.js';

/* The four statuses a company can have under each standard */
const RESULT = {
  pass: { mark: '✓', word: 'Pass', cls: 'pass', explain: 'Its main business is allowed and every money test is below the standard’s limit.' },
  fail: { mark: '✗', word: 'Fail', cls: 'fail', explain: 'Its main business is allowed, but at least one money test (debt, cash, money owed or interest income) is over the limit.' },
  out: { mark: '⊘', word: 'Business activity excluded', cls: 'out', explain: 'Its main business is one the standard rules out, such as conventional banking, alcohol or gambling, so the money tests are not needed.' },
  na: { mark: '?', word: 'Not checked', cls: 'na', explain: 'We don’t yet have every figure the standard needs (for example a share price or a figure missing from the filing), so we make no claim either way.' },
};
const dateText = (d) => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const STATUS_KEY = `<div class="sh-status-key">${Object.values(RESULT).map((r) => `<div class="${r.cls}"><b>${r.mark}</b><div><strong>${r.word}</strong><span>${r.explain}</span></div></div>`).join('')}</div>`;
const REASON = { adr: 'US shares are ADRs, so only MSCI and FTSE (based on total assets) are checked', debt: 'too much debt', cash: 'too much cash and interest-bearing investments', recv: 'too much owed by customers plus cash', income: 'too much interest income', price: 'waiting for share prices', figures: 'figures missing from its filings' };
const marketById = (id) => SHARIAH_MARKETS.find((m) => m.id === id) || null;
const fundsFor = (id) => SHARIAH_FUNDS.filter((f) => f.market === id || (f.also || []).includes(id));
const GULF = new Set(['saudi-arabia', 'uae']);
const NOT_ADVICE = `<p class="note-box">Our lists apply each standard’s published rules to the companies’ own SEC figures. They are not the providers’ official index lists, and not a religious ruling (fatwa). The providers use 24- or 36-month average company values and more detailed business data, so their answer can differ from ours. For your own decisions, ask a qualified Shariah scholar or use a fund with its own Shariah board. Read our <a href="/disclaimer">disclaimer</a>.</p>`;

function cell(method, res) {
  const r = RESULT[res.result] || RESULT.na;
  const why = res.result === 'out' ? BUSINESS_WORDS[res.reason] || '' : res.result === 'fail' || res.result === 'na' ? REASON[res.reason] || '' : '';
  return `<td class="sh-cell ${r.cls}" title="${esc(`${method.short}: ${r.word}${why ? ` (${why})` : ''}`)}"><span aria-hidden="true">${r.mark}</span><span class="sr-only">${esc(r.word)}</span>${res.result === 'fail' && res.reason ? `<small>${esc({ debt: 'debt', cash: 'cash', recv: 'owed', income: 'interest' }[res.reason] || '')}</small>` : ''}</td>`;
}

/** Stacked bar of pass / fail / ruled-out / not checked for one standard. */
function stack(rows, m) {
  const n = rows.length || 1;
  const count = (k) => rows.filter((r) => r.results[m.id].result === k).length;
  const parts = [['pass', '#1baf7a'], ['fail', '#e34948'], ['out', '#8a5a2b'], ['na', '#c9c2b0']].map(([k, c]) => ({ k, c, v: count(k) }));
  return `<div class="sh-stack-row"><span class="sh-stack-name" style="--c:${m.colour}">${esc(m.short)}</span>
    <span class="sh-stack" role="img" aria-label="${esc(`${m.short}: ${parts.map((p) => `${p.v} ${RESULT[p.k].word.toLowerCase()}`).join(', ')}`)}">${parts.filter((p) => p.v).map((p) => `<i style="width:${(p.v / n) * 100}%;background:${p.c}" title="${p.v} ${esc(RESULT[p.k].word.toLowerCase())}"></i>`).join('')}</span>
    <b>${parts[0].v}</b></div>`;
}
const LEGEND = '<p class="sh-legend"><span><i style="background:#1baf7a"></i>Pass</span><span><i style="background:#e34948"></i>Fail</span><span><i style="background:#8a5a2b"></i>Business activity excluded</span><span><i style="background:#c9c2b0"></i>Not checked</span></p>';

function standardsTable() {
  const allEx = Object.keys(BUSINESS_WORDS).filter((k) => METHODS.some((m) => m.excludes.includes(k)));
  const testOf = (m, key) => { const t = m.tests.find((x) => x.key === key); return t ? `<b>under ${t.max}%</b><small>of ${esc(t.of)}</small>` : '<span class="sh-dash">not tested</span>'; };
  return `<div class="sh-scroll"><table class="sh-compare">
    <thead><tr><th></th>${METHODS.map((m) => `<th style="--c:${m.colour}">${esc(m.short)}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><th>Debt</th>${METHODS.map((m) => `<td>${testOf(m, 'debt')}</td>`).join('')}</tr>
      <tr><th>Cash and interest-bearing investments</th>${METHODS.map((m) => `<td>${testOf(m, 'cash')}</td>`).join('')}</tr>
      <tr><th>Owed by customers plus cash</th>${METHODS.map((m) => `<td>${testOf(m, 'recv')}</td>`).join('')}</tr>
      <tr><th>Interest and other non-permitted income</th>${METHODS.map((m) => `<td>${testOf(m, 'income')}</td>`).join('')}</tr>
      ${allEx.map((k) => `<tr class="sh-ex"><th>${esc(BUSINESS_WORDS[k])}</th>${METHODS.map((m) => `<td>${m.excludes.includes(k) ? '<span class="sh-no">Ruled out</span>' : m.partly?.[k] ? `<span class="sh-part">${esc(m.partly[k])}</span>` : '<span class="sh-ok">Allowed</span>'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
}

function fundCountriesShare(fundData, codes) {
  return (fundData?.countries || []).filter((c) => codes.includes(c.code)).reduce((a, c) => a + c.pct, 0);
}

/* ── /shariah ─────────────────────────────────────────────────────── */
export async function renderShariahHub(origin) {
  const { rows, pricesOn } = await shariahTable();
  const head = buildHeadTags({
    title: 'Shariah-compliant investing explained: halal stocks, ETFs and funds | Dr MoneyWise',
    description: 'How Shariah stock screening works, the five main standards (AAOIFI, Dow Jones, S&P, MSCI, FTSE) side by side, which big companies pass each one, and the Shariah ETFs and funds you can buy.',
    canonical: `${origin}/shariah`,
  });
  const marketCards = SHARIAH_MARKETS.filter((mk) => !mk.fundsOnly).map((mk) => {
    const list = rows.filter((r) => r.market === mk.id);
    const all5 = list.filter((r) => r.passes.length === 5).length;
    const any = list.filter((r) => r.passes.length).length;
    return `<a class="sh-market" href="/shariah/${mk.id}" style="--c:${mk.colour}">
        <span class="sh-market-name">${esc(mk.name)}</span>
        <span class="sh-market-big">${any}<small> of ${list.length}</small></span>
        <span class="sh-market-sub">pass at least one standard${all5 ? ` · ${all5} pass all five` : ''}</span>
        ${list.length ? `<span class="sh-mini">${METHODS.map((m) => { const p = list.filter((r) => r.results[m.id].result === 'pass').length; return `<i style="height:${Math.max(4, (p / list.length) * 100)}%;background:${m.colour}" title="${esc(`${m.short}: ${p} pass`)}"></i>`; }).join('')}</span>` : ''}
        <em>See the list →</em></a>`;
  }).join('');
  const body = `
      <section class="block sh-page">
        <div class="sh-hero"><div><span class="pf-badge free">Free guide</span><h1>Shariah-compliant investing</h1>
          <p>Islamic investing avoids companies whose main business is forbidden (such as alcohol, gambling or interest-based banking) and companies that borrow or hold too much interest-bearing money. Here’s how the checks work, how the five best-known standards differ, which big companies pass each one, and the Shariah funds and ETFs you can buy.</p></div>
          <div class="sh-mark" aria-hidden="true">⚖</div></div>

        <a class="ifp-promo" href="/shariah/islamic-finance"><span aria-hidden="true">☪</span><div><b>New: Islamic finance, from the basics to advanced</b><small>Riba, the main contracts (murabaha, ijara, musharaka, sukuk), halal investing, zakat on shares, and the rulings of the Fiqh Academy, AAOIFI and leading scholars.</small></div><em>Read the guide →</em></a>

        <h2>How a company is checked</h2>
        <div class="sh-steps">
          <div style="--c:#2a78d6"><b>1</b><h3>What does it do?</h3><p>Companies whose main business is conventional banking or insurance, alcohol, pork, gambling, tobacco or adult entertainment are ruled out. Some standards also rule out weapons, music, cinema and hotels.</p></div>
          <div style="--c:#eb6834"><b>2</b><h3>How much does it borrow?</h3><p>Interest-bearing debt must be below a limit, usually 30% or 33% of the company’s value or of everything it owns (its total assets).</p></div>
          <div style="--c:#1baf7a"><b>3</b><h3>How much interest-bearing money does it hold?</h3><p>Cash in interest-paying accounts and bonds must also stay below about 30% to 33%. Some standards also limit money owed by customers.</p></div>
          <div style="--c:#6250d6"><b>4</b><h3>How much income is not permitted?</h3><p>Interest and other non-permitted income must be under 5% of total income. Many scholars ask investors to give that share of their dividends to charity (“purification”).</p></div>
        </div>

        <h2>The four statuses we give</h2>
        <p class="pf-sub">Every company gets one of these under each of the five standards. Being held by a Shariah fund is shown separately and is not a status.</p>
        ${STATUS_KEY}
        <div class="sh-links3">
          <a href="/shariah/method" style="--c:#2a78d6"><b>How we screen</b><span>Each standard’s method, how every ratio and purification are calculated, and when we last screened.</span></a>
          <a href="/tools/zakat" style="--c:#1baf7a"><b>Zakat calculator</b><span>Work out the 2.5% due on your savings, gold and shares, against the gold or silver nisab.</span></a>
          <a href="/membership#plans" style="--c:#6250d6"><b>Advanced Shariah research <small>Premium</small></b><span>Every company’s debt, cash and receivables ratios, the share of each dividend to purify, and a Shariah filter in the screener.</span></a>
        </div>

        <h2>The five standards side by side</h2>
        <p class="pf-sub">Checked against each provider’s own rules, October 2026. S&amp;P and Dow Jones tightened theirs on 21 September 2026.</p>
        ${standardsTable()}
        <div class="sh-method-grid">${METHODS.map((m) => `<div class="sh-method" style="--c:${m.colour}"><h3>${esc(m.name)}</h3><p>${esc(m.who)}</p><p class="pf-sub">${esc(m.note)}</p><a href="${esc(m.source.url)}" target="_blank" rel="noopener">${esc(m.source.label)} ↗</a></div>`).join('')}</div>

        <h2>Which companies pass, by market</h2>
        <p class="pf-sub">Bars show how many companies pass each standard (green AAOIFI, blue Dow Jones, orange S&amp;P, purple MSCI, yellow FTSE).${pricesOn ? '' : ' AAOIFI, Dow Jones and S&amp;P compare debt with the company’s share-market value, so they are checked once daily share prices switch on; MSCI and FTSE use total assets and are checked now.'}</p>
        <div class="sh-markets">${marketCards}</div>
        <h2>Shariah funds and official lists in other countries</h2>
        <p class="pf-sub">Most companies in these countries don’t report to the US SEC, so instead we show each country’s official Shariah list or index and its Shariah funds and ETFs.</p>
        <div class="sh-countries">${SHARIAH_MARKETS.filter((mk) => mk.fundsOnly).map((mk) => `<a href="/shariah/${mk.id}" style="--c:${mk.colour}"><b>${esc(mk.name)}</b><span>${fundsFor(mk.id).length} fund${fundsFor(mk.id).length === 1 ? '' : 's'}${MARKET_FACTS[mk.id] ? ' · official list or index' : ''}</span></a>`).join('')}</div>

        <div class="sh-two">
          <div class="pf-panel"><h2>Shariah funds and ETFs</h2><p>Ready-made Shariah funds do the checking for you, under their own Shariah board. We list ${SHARIAH_FUNDS.length} across ${new Set(SHARIAH_FUNDS.map((f) => f.market)).size} groups, from the US and UK to Malaysia, Saudi Arabia and Pakistan, with the real holdings of the US ones from their reports to the SEC.</p><p><a class="pf-btn gold" href="/shariah/funds">See the funds</a></p></div>
          <div class="pf-panel"><h2>Purification, simply</h2><p>If 2% of a company’s income comes from interest, many scholars ask you to give 2% of the dividends you receive from it to charity. Premium members see an estimate for each company on the market pages, from the interest income in its yearly report.</p><p><a href="/membership#plans">See Premium</a></p></div>
        </div>
        <p class="pf-sub">You can also tick a Shariah standard in the <a href="/screener?shariah=any">stock screener</a> (members).</p>
        ${NOT_ADVICE}
        <p class="sh-sources">Sources: ${[...METHODS.map((m) => m.source), ...SHARIAH_SOURCES].map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

/* ── /shariah/<market> ────────────────────────────────────────────── */
export async function renderShariahMarket(origin, id) {
  const mk = marketById(id);
  if (!mk) return null;
  const [{ rows: allRows, pricesOn, updatedAt }, { companies }, fundData] = await Promise.all([shariahTable(), readCompanies(), shariahFundsData()]);
  const rows = allRows.filter((r) => r.market === id);
  if (mk.fundsOnly) return renderFundCountry(origin, mk, fundData);
  const head = buildHeadTags({
    title: `Shariah-compliant ${mk.name} stocks: halal checks under 5 standards | Dr MoneyWise`,
    description: `Which big ${mk.name} companies pass each Shariah standard, which Shariah funds hold them, and the local Shariah funds and ETFs. Updated from the companies' own filings.`,
    canonical: `${origin}/shariah/${id}`,
  });
  const funds = fundsFor(id);
  const holding = SHARIAH_FUNDS.filter((f) => f.sec && f.market !== 'sukuk').map((f) => ({ f, pct: fundCountriesShare(fundData[f.ticker], mk.fundCountries) }))
    .filter((x) => x.pct >= 0.5).sort((a, b) => b.pct - a.pct);
  const any = rows.filter((r) => r.passes.length).length;
  const all5 = rows.filter((r) => r.passes.length === 5).length;
  const held = rows.filter((r) => r.heldBy.length).length;
  const table = rows.length ? `
        <div class="pf-panel sh-table-wrap">
          <div class="sh-filter" role="group" aria-label="Show companies that pass">
            <span>Show:</span><button class="on" data-sh-filter="">All ${rows.length}</button>${METHODS.map((m) => `<button data-sh-filter="${m.id}" style="--c:${m.colour}">Passes ${esc(m.short)}</button>`).join('')}<button data-sh-filter="all5">Passes all five</button><button data-sh-filter="held">Held by a Shariah fund</button>
          </div>
          <div class="sh-scroll"><table class="sh-table" data-sh-market="${esc(id)}"><thead><tr><th>Company</th>${METHODS.map((m) => `<th style="--c:${m.colour}">${esc(m.short)}</th>`).join('')}<th class="sh-held-col">Held by Shariah funds<small>ownership, not a status</small></th><th class="sh-prem-col">Debt / assets <span class="sc-prem">Premium</span></th><th class="sh-prem-col">Give to charity <span class="sc-prem">Premium</span></th></tr></thead><tbody>
          ${rows.map((r) => `<tr data-passes="${esc(r.passes.join(' '))}" data-held="${r.heldBy.length}" data-t="${esc(r.ticker)}">
            <td class="sc-co"><a href="/stock/${esc(r.ticker)}" class="wd-co">${companyLogo(companies?.[r.ticker] || { ticker: r.ticker }, r.name, 'sm')}<span><b>${esc(r.ticker)}</b> ${esc(r.name)}<small>${esc(r.business ? BUSINESS_WORDS[r.business] : r.sector)}</small></span></a></td>
            ${METHODS.map((m) => cell(m, r.results[m.id])).join('')}
            <td class="sh-held-col">${r.heldBy.length ? r.heldBy.map((t) => `<a class="sh-fund-chip" href="/etfs/${esc(t)}">${esc(t)}</a>`).join('') : '<span class="sh-dash">—</span>'}</td>
            <td class="sh-prem-col" data-ratio>🔒</td><td class="sh-prem-col" data-purify>🔒</td></tr>`).join('')}
          </tbody></table></div>
          <p class="sh-legend"><span><b class="pass">✓</b> Pass</span><span><b class="fail">✗</b> Fail (the small word says which test)</span><span><b class="out">⊘</b> Business activity excluded</span><span><b class="na">?</b> Not checked${pricesOn ? '' : ' (AAOIFI, Dow Jones and S&amp;P need share prices, which switch on soon)'}</span></p>
          <p class="sh-dates">Last screened: <b>${esc(dateText(updatedAt))}</b>. Each company’s figures come from its latest balance sheet (the date is on its own page); company value uses the latest closing price. We re-screen whenever new filings or prices arrive. <a href="/shariah/method">How we screen, step by step</a></p>
          <p class="pf-sub">Being held by a Shariah fund is shown separately from the status: a fund may follow a different standard, use older figures, or be selling the shares.</p>
          <p class="pf-sub" data-sh-prem-note>Premium members also see each company’s debt and cash ratios and the share of its dividends to give to charity. <a href="/membership#plans">See Premium</a></p>
          ${rows.some((r) => r.foreign) ? '<p class="pf-sub">These companies’ US shares are usually ADRs (one ADR can stand for several local shares), so we check them with the two standards based on total assets: MSCI and FTSE.</p>' : ''}
        </div>` : '<div class="pf-panel"><p>We’re still collecting the figures for this market. Please check back soon.</p></div>';
  const body = `
      <section class="block sh-page">
        <p class="nl-back"><a href="/shariah">← Shariah-compliant investing</a></p>
        <div class="sh-hero" style="--hc:${mk.colour}"><div><span class="pf-badge">Shariah check</span><h1>${esc(mk.name)}: Shariah-compliant stocks</h1><p>${esc(mk.intro)}</p></div><div class="sh-mark" aria-hidden="true">⚖</div></div>
        <div class="pr-tiles">
          ${tile('Companies checked', String(rows.length), 'from their own SEC filings')}
          ${tile('Pass at least one standard', String(any), `of ${rows.length}`, 'up')}
          ${tile('Pass all five', String(all5), 'the strictest test')}
          ${tile('Held by a Shariah fund', String(held), 'in the funds’ latest SEC reports')}
        </div>
        ${rows.length ? `<div class="pf-panel"><h2>How many pass each standard</h2>${METHODS.map((m) => stack(rows, m)).join('')}${LEGEND}</div>` : ''}
        ${table}
        <div class="sh-stacked">
          <div class="pf-panel"><h2>Shariah funds for ${esc(mk.name)}</h2>
            ${funds.length ? `<ul class="sh-fund-list">${funds.map((f) => `<li><b>${esc(f.name)}</b>${f.ticker ? ` <span class="sh-fund-chip">${esc(f.ticker)}</span>` : ''}<small>${esc(f.type)} · ${esc(f.invests)}${f.rule ? ` · ${esc(METHODS.find((m) => m.id === f.rule)?.short || '')} rules` : ''}</small>${f.sec ? ` <a href="/etfs/${esc(f.ticker)}">Holdings</a>` : f.url ? ` <a href="${esc(f.url)}" target="_blank" rel="noopener nofollow">More ↗</a>` : ''}</li>`).join('')}</ul>` : '<p>We haven’t found Shariah funds listed in this market itself.</p>'}
            ${MARKET_NOTES[id] ? `<p class="pf-sub">${esc(MARKET_NOTES[id])}</p>` : ''}
            ${(MARKET_FACTS[id] || []).map((x) => `<p class="pf-sub"><b>${esc(x.big)}:</b> ${esc(x.text)}</p>`).join('')}
            <p><a href="/shariah/funds">All Shariah funds and ETFs →</a></p></div>
          <div class="pf-panel"><h2>Shariah funds holding ${esc(mk.name)} companies</h2>
            ${holding.length ? `<p class="pf-sub">Share of each US-registered Shariah fund invested in companies based here, from its latest SEC report.</p>${holding.slice(0, 10).map((x) => `<div class="sh-bar-row"><a href="/etfs/${esc(x.f.ticker)}">${esc(x.f.ticker)}</a><span class="sh-bar"><i style="width:${Math.min(100, x.pct)}%;background:${mk.colour}"></i></span><b>${x.pct.toFixed(1)}%</b></div>`).join('')}` : '<p>No US-registered Shariah fund we follow has a meaningful share here yet, or their reports are still loading.</p>'}
          </div>
        </div>
        <p class="sh-other">Other markets: ${SHARIAH_MARKETS.filter((m) => m.id !== id).map((m) => `<a href="/shariah/${m.id}" style="--c:${m.colour}">${esc(m.name)}</a>`).join('')}</p>
        ${NOT_ADVICE}
      </section>
      <script src="/shariah.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}

/* ── /shariah/funds ───────────────────────────────────────────────── */
const GROUPS = [
  ['us', 'United States: shares', 'US-registered funds. Holdings are from each fund’s latest report to the SEC.'],
  ['world', 'Worldwide and outside the US', 'US-registered funds investing around the world.'],
  ['sukuk', 'Sukuk (Islamic bonds) and income', 'Sukuk pay a return from real assets or business deals instead of interest.'],
  ['ireland', 'Registered in Ireland, traded in London', 'UCITS ETFs that follow MSCI’s Islamic indices; UK investors can hold them in an ISA.'],
  ['uk', 'United Kingdom', ''],
  ['malaysia', 'Malaysia (Bursa Malaysia)', 'Eq8 was called MyETF until May 2024.'],
  ['saudi-arabia', 'Saudi Arabia (Saudi Exchange)', ''],
  ['uae', 'United Arab Emirates (ADX and DFM)', 'Chimera’s ETFs are now run by Lunate Capital.'],
  ['india', 'India', ''],
  ['hong-kong', 'Hong Kong & China', ''],
  ['pakistan', 'Pakistan (PSX)', ''],
  ['canada', 'Canada', ''],
];
export async function renderShariahFunds(origin) {
  const data = await shariahFundsData();
  const head = buildHeadTags({
    title: 'Shariah ETFs and Islamic funds: what they hold and which rules they follow | Dr MoneyWise',
    description: 'Shariah-compliant ETFs, mutual funds and sukuk funds in the US, Europe, India and Hong Kong, with the real holdings of US funds from their SEC reports.',
    canonical: `${origin}/shariah/funds`,
  });
  const colours = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6'];
  const card = (f) => {
    const d = f.sec ? data[f.ticker] : null;
    const rule = f.rule ? METHODS.find((m) => m.id === f.rule) : null;
    return `<div class="sh-fund" style="--c:${rule?.colour || '#8a5a2b'}">
      <div class="sh-fund-head">${f.ticker ? `<span class="sh-fund-chip big">${esc(f.ticker)}</span>` : ''}<span class="sh-fund-type">${esc(f.type)}</span></div>
      <h3>${esc(f.name)}</h3><p>${esc(f.invests)}</p>
      <p class="sh-fund-rule">${rule ? `Follows <b>${esc(rule.short)}</b> rules` : 'Own Shariah board and rules'}</p>
      ${d ? `<p class="pf-sub">${d.count} holdings at ${esc(d.asOf || '')}. Biggest:</p>${d.top.map((h, i) => `<div class="sh-bar-row"><span class="sh-hold">${esc(h.name)}</span><span class="sh-bar"><i style="width:${Math.min(100, h.pct * 5)}%;background:${colours[i % colours.length]}"></i></span><b>${h.pct.toFixed(1)}%</b></div>`).join('')}<a href="/etfs/${esc(f.ticker)}">All holdings →</a>`
        : f.sec ? '<p class="pf-sub">Holdings are loading from the SEC; please check back later.</p>' : f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener nofollow">More about this fund ↗</a>` : ''}
    </div>`;
  };
  const body = `
      <section class="block sh-page">
        <p class="nl-back"><a href="/shariah">← Shariah-compliant investing</a></p>
        <div class="sh-hero"><div><span class="pf-badge">Funds and ETFs</span><h1>Shariah funds and ETFs</h1><p>A Shariah fund checks every company for you and is overseen by its own Shariah board. Here are the main ones by where they’re listed. Costs change, so check each fund’s own documents before you buy.</p></div><div class="sh-mark" aria-hidden="true">⚖</div></div>
        ${GROUPS.map(([g, title, sub]) => { const list = SHARIAH_FUNDS.filter((f) => f.market === g); return list.length ? `<h2>${esc(title)}</h2>${sub ? `<p class="pf-sub">${esc(sub)}</p>` : ''}<div class="sh-fund-grid">${list.map(card).join('')}</div>${MARKET_NOTES[g] ? `<p class="pf-sub">${esc(MARKET_NOTES[g])}</p>` : ''}` : ''; }).join('')}
        <p class="pf-sub">Indonesia: see <a href="/shariah/indonesia">the official sharia list and indices</a>.</p>
        <p class="note-box">Listing a fund is not a recommendation. Holdings of US funds come from their reports to the SEC (Form N-PORT), which are published a few months after the date shown. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

function fundCard(f) {
  const rule = f.rule ? METHODS.find((m) => m.id === f.rule) : null;
  return `<div class="sh-fund" style="--c:${rule?.colour || '#8a5a2b'}">
      <div class="sh-fund-head">${f.ticker ? `<span class="sh-fund-chip big">${esc(f.ticker)}</span>` : ''}<span class="sh-fund-type">${esc(f.type)}</span></div>
      <h3>${esc(f.name)}</h3><p>${esc(f.invests)}</p>
      <p class="sh-fund-rule">${rule ? `Follows <b>${esc(rule.short)}</b> rules` : 'Own Shariah board and rules'}</p>
      ${f.sec ? `<a href="/etfs/${esc(f.ticker)}">Holdings →</a>` : f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener nofollow">Source ↗</a>` : ''}
    </div>`;
}

/** A country where we show the official Shariah list or index and the local funds. */
function renderFundCountry(origin, mk, fundData) {
  const id = mk.id;
  const head = buildHeadTags({
    title: `Shariah-compliant investing in ${mk.name}: Islamic funds and ETFs | Dr MoneyWise`,
    description: `How Shariah-compliant shares are chosen in ${mk.name}, the official list or index, and the Shariah ETFs and funds you can buy there.`,
    canonical: `${origin}/shariah/${id}`,
  });
  const funds = fundsFor(id);
  const facts = MARKET_FACTS[id] || [];
  const holding = SHARIAH_FUNDS.filter((f) => f.sec && f.market !== 'sukuk').map((f) => ({ f, pct: fundCountriesShare(fundData[f.ticker], mk.fundCountries) }))
    .filter((x) => x.pct >= 0.3).sort((a, b) => b.pct - a.pct);
  const colours = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
  const body = `
      <section class="block sh-page">
        <p class="nl-back"><a href="/shariah">← Shariah-compliant investing</a></p>
        <div class="sh-hero"><div><span class="pf-badge">Shariah investing</span><h1>${esc(mk.name)}: Shariah funds and the official list</h1><p>${esc(mk.intro)}</p></div><div class="sh-mark" aria-hidden="true">⚖</div></div>
        ${facts.length ? `<div class="sh-facts">${facts.map((x, i) => `<div style="--c:${colours[i % colours.length]}"><b>${esc(x.big)}</b><p>${esc(x.text)}${x.url ? ` <a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">Source ↗</a>` : ''}</p></div>`).join('')}</div>` : ''}
        <h2>Shariah funds and ETFs ${funds.length ? `<span class="sh-count">${funds.length}</span>` : ''}</h2>
        ${funds.length ? `<div class="sh-fund-grid">${funds.map(fundCard).join('')}</div>` : '<p>We haven’t found Shariah funds listed here yet.</p>'}
        ${MARKET_NOTES[id] ? `<p class="pf-sub">${esc(MARKET_NOTES[id])}${GULF.has(id) ? ' <a href="/stocks/world/gulf">Gulf companies →</a>' : ''}</p>` : ''}
        <div class="pf-panel"><h2>US-registered Shariah funds investing in ${esc(mk.name)}</h2>
          ${holding.length ? `<p class="pf-sub">Share of each fund invested in companies based here, from its latest SEC report.</p>${holding.slice(0, 10).map((x) => `<div class="sh-bar-row"><a href="/etfs/${esc(x.f.ticker)}">${esc(x.f.ticker)}</a><span class="sh-bar"><i style="width:${Math.min(100, x.pct * 4)}%;background:${mk.colour}"></i></span><b>${x.pct.toFixed(1)}%</b></div>`).join('')}` : '<p>None of the US-registered Shariah funds we follow holds a meaningful amount here, or their reports are still loading.</p>'}
        </div>
        <p class="sh-other">Other countries: ${SHARIAH_MARKETS.filter((m) => m.id !== id).map((m) => `<a href="/shariah/${m.id}" style="--c:${m.colour}">${esc(m.name)}</a>`).join('')}</p>
        <p class="note-box">Listing a fund is not a recommendation. Check each fund’s own documents for costs and its Shariah board before you invest, and ask a qualified scholar about your own situation. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

export function shariahSitemapEntries(origin, today) {
  return [`${origin}/shariah`, `${origin}/shariah/funds`, `${origin}/shariah/islamic-finance`, `${origin}/shariah/method`, ...SHARIAH_MARKETS.map((m) => `${origin}/shariah/${m.id}`)].map((loc) => ({ loc, lastmod: today, priority: '0.6' }));
}

/** Small box for a company page: status under each standard, then fund ownership, kept apart. */
export async function shariahBoxHtml(ticker) {
  const { shariahTable } = await import('./shariahService.js');
  const table = await shariahTable().catch(() => null);
  const r = table?.rows.find((x) => x.ticker === ticker);
  if (!r) return '';
  return `<section class="block sh-box"><div class="block-head"><div><h2>Shariah check</h2><p>This company’s status under the five main Islamic screening standards.</p></div></div>
    <div class="sh-box-row">${METHODS.map((m) => { const res = r.results[m.id]; const x = RESULT[res.result]; return `<span class="sh-pill ${x.cls}" style="--c:${m.colour}" title="${esc(`${x.word}${res.result === 'out' ? `: ${BUSINESS_WORDS[res.reason] || ''}` : REASON[res.reason] ? `: ${REASON[res.reason]}` : ''}`)}"><b>${x.mark}</b> ${esc(m.short)}<small>${esc(x.word)}</small></span>`; }).join('')}</div>
    <p class="pf-sub">${r.business ? `Main business: ${esc(BUSINESS_WORDS[r.business])}, which ${METHODS.filter((m) => m.excludes.includes(r.business)).length === 5 ? 'all five standards exclude' : 'some standards exclude'}. ` : ''}Last screened ${esc(dateText(table.updatedAt))}${r.asOf ? `, using the balance sheet dated ${esc(dateText(r.asOf))}` : ''}.</p>
    <div class="sh-own"><b>Fund ownership</b> <span>${r.heldBy.length ? `Held by ${r.heldBy.length} Shariah fund${r.heldBy.length === 1 ? '' : 's'}: ${r.heldBy.map((t) => `<a href="/etfs/${esc(t)}">${esc(t)}</a>`).join(', ')}.` : 'Not in the latest reports of the Shariah funds we follow.'} This is shown separately: a fund may use a different standard or older figures.</span></div>
    <p class="pf-sub">Our check of published rules, not a fatwa. <a href="/shariah/${esc(r.market)}">See the full list</a> · <a href="/shariah/method">How we screen</a></p></section>`;
}

/* ── /shariah/method ─────────────────────────────────────────────── */
export async function renderShariahMethod(origin) {
  const { updatedAt, rows } = await shariahTable();
  const head = buildHeadTags({
    title: 'How we screen for Shariah compliance: methods, ratios and purification | Dr MoneyWise',
    description: 'Our Shariah screening method step by step: the four statuses, each standard’s rules, how the debt, cash, receivables and interest-income ratios are calculated, how purification is worked out, and when we last screened.',
    canonical: `${origin}/shariah/method`,
  });
  const f = (a, b) => `<span class="sh-frac"><span>${a}</span><span>${b}</span></span>`;
  const RATIOS = [
    ['Debt ratio', `${f('Interest-bearing debt', 'Company value <em>or</em> total assets')} × 100`, 'Debt = long-term debt + short-term borrowing + the part of long-term debt due within a year, from the latest balance sheet. Company value = latest share price × shares in issue.'],
    ['Cash ratio', `${f('Cash + short-term interest-bearing investments', 'Company value <em>or</em> total assets')} × 100`, 'Cash and short-term investments from the latest balance sheet.'],
    ['Receivables ratio (MSCI and FTSE)', `${f('Money owed by customers + cash', 'Total assets')} × 100`, 'Accounts receivable from the latest balance sheet.'],
    ['Interest-income ratio', `${f('Interest income', 'Sales + interest income')} × 100`, 'Interest and investment income from the latest yearly profit and loss account. Many companies don’t report it separately; when it is missing this test doesn’t block a pass on its own.'],
  ];
  const counts = Object.fromEntries(Object.keys(RESULT).map((k) => [k, rows.reduce((a, r) => a + Object.values(r.results).filter((x) => x.result === k).length, 0)]));
  const body = `
      <section class="block sh-page">
        <p class="nl-back"><a href="/shariah">← Shariah-compliant investing</a></p>
        <div class="sh-hero"><div><span class="pf-badge free">Our method</span><h1>How we screen for Shariah compliance</h1>
          <p>Every step we take to give a company its status under each standard, so you can check our working, repeat it yourself, or ask a scholar about it.</p></div><div class="sh-mark" aria-hidden="true">⚖</div></div>

        <div class="pr-tiles">
          ${tile('Last screened', esc(dateText(updatedAt)), 'updated as new filings and prices arrive')}
          ${tile('Companies screened', String(rows.length), 'from their own SEC filings')}
          ${tile('Standards', String(METHODS.length), METHODS.map((m) => m.short).join(', '))}
        </div>

        <h2>1. The four statuses</h2>
        ${STATUS_KEY}
        <p class="pf-sub">Across all companies and standards right now: ${Object.entries(counts).map(([k, v]) => `${v} ${RESULT[k].word.toLowerCase()}`).join(' · ')}.</p>

        <h2>2. The order of the checks</h2>
        <ol class="sh-order">
          <li><b>Business activity.</b> We take the company’s main industry code from its SEC filings (plus a short list of well-known companies whose code doesn’t show their real business). If that business is on the standard’s excluded list, the status is <em>Business activity excluded</em> and we stop.</li>
          <li><b>Figures.</b> We take debt, cash, short-term investments, money owed by customers, total assets and interest income from the latest filings, and the latest closing share price.</li>
          <li><b>Money tests.</b> We work out each ratio the standard uses (below) and compare it with its limit. Any ratio at or over its limit gives <em>Fail</em>.</li>
          <li><b>Missing figures.</b> If a ratio the standard needs can’t be worked out, the status is <em>Not checked</em> rather than a guess.</li>
          <li><b>Otherwise</b> the status is <em>Pass</em>.</li>
        </ol>

        <h2>3. How each ratio is calculated</h2>
        <div class="sh-ratio-grid">${RATIOS.map(([n, formula, note]) => `<div class="sh-ratio"><h3>${n}</h3><div class="sh-formula">${formula}</div><p>${note}</p></div>`).join('')}</div>
        <p class="pf-sub">AAOIFI, Dow Jones and S&amp;P divide by <b>company value</b>; MSCI and FTSE divide by <b>total assets</b>. Dow Jones and S&amp;P use a 24- or 36-month average company value; we use today’s, so after a big price move our answer can differ from theirs. For overseas companies whose US shares are ADRs, we only apply MSCI and FTSE, because one ADR can stand for several local shares.</p>

        <h2>4. Each standard’s method</h2>
        <div class="sh-method-grid">${METHODS.map((m) => `<div class="sh-method" style="--c:${m.colour}"><h3>${esc(m.name)}</h3><p>${esc(m.who)}</p>
          <ul>${m.tests.map((t) => `<li>${esc(t.label)} under <b>${t.max}%</b> of ${esc(t.of)}</li>`).join('')}</ul>
          <p class="pf-sub"><b>Excluded businesses:</b> ${m.excludes.map((k) => esc(BUSINESS_WORDS[k] || k)).join(', ')}${m.partly ? `; partly: ${Object.entries(m.partly).map(([k, v]) => `${esc(BUSINESS_WORDS[k] || k)} (${esc(v)})`).join(', ')}` : ''}.</p>
          <p class="pf-sub">${esc(m.note)}</p><a href="${esc(m.source.url)}" target="_blank" rel="noopener">${esc(m.source.label)} ↗</a></div>`).join('')}</div>

        <h2>5. How purification is calculated</h2>
        <div class="sh-two">
          <div class="pf-panel"><h3>The idea</h3><p>Even a company that passes may earn a little income that is not permitted, usually interest on its cash. Many scholars ask investors to give that share of their dividends to charity, without expecting reward. This is purification, and it is separate from zakat.</p>
            <div class="sh-formula">Amount to give = dividends you received × ${f('Interest and other non-permitted income', 'Total income')}</div></div>
          <div class="pf-panel"><h3>A worked example</h3><p>You received <b>$400</b> in dividends from a company this year. Its yearly report shows interest income of <b>$1.2 billion</b> and sales of <b>$58.8 billion</b>, so total income is $60 billion.</p>
            <p>Non-permitted share = 1.2 ÷ 60 = <b>2%</b>. Amount to give = $400 × 2% = <b>$8</b>.</p>
            <p class="pf-sub">Some scholars purify capital gains as well as dividends; ask your own scholar. Premium members see this percentage for every company on the market pages.</p></div>
        </div>

        <h2>6. Fund ownership is kept separate</h2>
        <p>Next to each company we show which Shariah funds held it in their latest SEC holdings report (Form N-PORT). This is <b>not</b> part of the status: a fund may follow a different standard, use averaged figures, report holdings weeks after the date, or be in the middle of selling. It is a useful second opinion, not a pass.</p>

        <h2>7. When we screen</h2>
        <ul class="sh-order">
          <li><b>Company accounts:</b> checked after each new quarterly or yearly SEC filing.</li>
          <li><b>Share prices:</b> latest daily close, so company-value tests can change from day to day.</li>
          <li><b>Fund holdings:</b> each fund’s latest SEC report, published monthly or quarterly.</li>
          <li><b>The standards’ rules:</b> checked against each provider’s own document; last reviewed October 2026.</li>
        </ul>

        <h2>8. What our screening can’t do</h2>
        <p>We use each company’s main industry code, not a line-by-line breakdown of its income, so a company with a small excluded business inside a larger permitted one may show as <em>Pass</em> when a provider would look deeper. Our lists are our own calculation of published rules, not the providers’ official index lists and not a religious ruling (fatwa).</p>

        <div class="sh-links3">
          <a href="/tools/zakat" style="--c:#1baf7a"><b>Zakat calculator</b><span>The 2.5% due on savings, gold and shares.</span></a>
          <a href="/shariah/islamic-finance" style="--c:#c9a227"><b>Islamic finance guide</b><span>From the basics to the scholars’ rulings.</span></a>
          <a href="/membership#plans" style="--c:#6250d6"><b>Advanced Shariah research <small>Premium</small></b><span>Every ratio and purification figure, plus a Shariah filter in the screener.</span></a>
        </div>
        ${NOT_ADVICE}
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}
