/* ════════════════════════════════════════════════════════════════════════
   TOP 10 PAGES — /top-10, /top-10/dividend-stocks, /top-10/etfs
   Built on the server (readable by Google). Every list shows its ranking
   rule, the date, its sources, and a "not advice" note.
   ════════════════════════════════════════════════════════════════════════ */

import { formatPercent } from './reportCardService.js';
import { rankingBarsHtml } from './infographicService.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { DIVIDEND_RULE, getDividendTop10, getEtfTop10, monthLabel } from './top10Service.js';
import { getPhoto, PAGE_PHOTO_QUERIES, photoFigure } from './imageService.js';
import { buildStockList, stockListSummaries, STOCK_LISTS } from './stockTop10.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const GRADE_ICON = { good: '✓', okay: '–' };

function readingAid(what, why, todo) {
  return `<dl class="reading-aid light">
          <div><dt>What is this?</dt><dd>${what}</dd></div>
          <div><dt>Why it matters</dt><dd>${why}</dd></div>
          <div><dt>What you can do</dt><dd>${todo}</dd></div>
        </dl>`;
}

function notAdvice(extra = '') {
  return `<p class="note-box">This list is for learning, not a recommendation to buy. ${extra}Read our <a href="/disclaimer">disclaimer</a>.</p>`;
}

/* ── /top-10 ─────────────────────────────────────────────────────────── */
export async function renderTop10Hub(origin) {
  const [div, etf] = await Promise.all([getDividendTop10(), getEtfTop10()]);
  const head = buildHeadTags({
    title: 'Top 10 lists: largest companies, best performers, fastest growers, dividends, ETFs and crypto | Dr MoneyWise',
    description: 'Simple Top 10 lists for everyday investors, each with its ranking rule: largest companies, best and worst 1-year returns, 52-week highs and lows, fastest growers, lowest P/E, dividend stocks, ETFs and crypto.',
    canonical: `${origin}/top-10`,
  });
  const card = (href, title, rule, first, extra = '') => `
        <a class="ten hub" href="${href}">
          <h2>${title}</h2>
          <p class="rule">${rule}</p>
          ${extra}
          ${first ? `<p class="meaning">${first}</p>` : ''}
          <span class="go">See the list</span>
        </a>`;
  const top = div.rows[0];
  const photo = await getPhoto('page:top10-hub', PAGE_PHOTO_QUERIES['top10-hub']);
  // Stock lists built from company accounts and prices, grouped
  const lists = await stockListSummaries().catch(() => []);
  const GROUP_COLOURS = { 'Size': '#2a78d6', 'Growth and profit': '#1baf7a', 'Price moves': '#eb6834', 'Value': '#eda100', 'Mixed lists': '#6250d6' };
  const groups = [...new Set(lists.map((x) => x.group))];
  const stockGroups = lists.length ? `
        <h2 style="font-size:28px;margin:34px 0 6px">Stock lists</h2>
        <p class="helper-note" style="margin:0 0 14px">Large US companies, ranked from their official accounts and share prices. Some lists mix two or three measures.</p>
        ${groups.map((g) => `<h3 class="t10-group" style="--c:${GROUP_COLOURS[g] || '#2a78d6'}">${esc(g)}</h3>
        <div class="t10-grid">${lists.filter((x) => x.group === g).map((x) => `<a class="t10-card" href="/top-10/stocks/${x.slug}" style="--c:${GROUP_COLOURS[g] || '#2a78d6'}"><b>${esc(x.short)}</b><span>${esc(x.explain)}</span><em>See the top 10 →</em></a>`).join('')}</div>`).join('')}` : '';
  const body = `
      <section class="block">
        ${photoFigure(photo, 'Charts on a desk', 'page-photo wide')}
        <div class="block-head"><div><h1 style="font-size:36px;margin:0">Top 10 lists</h1>
          <p>Each list shows exactly how it's ranked. They are a starting point for learning, not a shopping list.</p></div></div>
        <div class="tens">
          ${card('/top-10/dividend-stocks', 'Dividend stocks', 'Companies that raised their payout 10+ years in a row.', 'Ranked by how many years in a row each company has raised its dividend, checked against its cash and debt. Updated monthly.')}
          ${card('/top-10/etfs', 'ETFs for beginners', 'Simple, broad funds, ranked by lowest yearly fee.', 'Ranked by yearly fee: what each fund costs you a year for every $1,000 invested.')}
          <a class="ten hub crypto" href="/top-10/crypto"><h2>Crypto by size</h2><p class="rule">The 10 largest coins by total value, live.</p><span class="risk-note">High risk: prices can halve in months</span><p class="meaning">What each coin is, in simple terms, with a risk note.</p><span class="go">See the list</span></a>
        </div>
        ${stockGroups}
      </section>`;
  return pageShell({ head, body, active: 'top10' });
}

/* ── /top-10/dividend-stocks ─────────────────────────────────────────── */
export async function renderDividendTop10(origin) {
  const list = await getDividendTop10();
  const month = monthLabel(list.month);
  const byYield = list.rankedBy === 'yield';
  const head = buildHeadTags({
    title: `Top 10 Dividend Stocks — ${month} | Dr MoneyWise`,
    description: `The 10 US companies with the highest dividend yield among those that have raised their dividend 10+ years in a row. Explained simply, updated ${month}.`,
    canonical: `${origin}/top-10/dividend-stocks`,
  });

  const years = (row) => `${row.yearsAtLeast ? 'at least ' : ''}${row.years} years`;
  // Bars must tell rows apart: if every company has the same record (our
  // filings history caps the count), compare the yearly dividend instead.
  const sameYears = !byYield && new Set(list.rows.map((r) => r.years)).size <= 1;
  const infographic = list.rows.length
    ? rankingBarsHtml({
      title: byYield ? 'Dividend yield' : sameYears ? 'Yearly dividend per share' : 'Years of dividend raises',
      subtitle: byYield ? 'Yearly dividend as a share of today’s price' : sameYears ? `All ten have raised their dividend for ${list.rows[0].yearsAtLeast ? 'at least ' : ''}${list.rows[0].years} years in a row; this is what each pays a year for one share` : 'Years in a row the dividend went up',
      rows: list.rows.map((row) => ({
        label: row.ticker,
        sublabel: row.name,
        value: byYield ? row.yield : sameYears ? row.dividendPerShare : row.years,
        display: byYield ? formatPercent(row.yield) : sameYears ? `$${row.dividendPerShare.toFixed(2)}` : `${row.years} yrs`,
      })),
      source: `Source: SEC filings${list.pricesAsOf ? '; prices from Marketstack' : ''}. List for ${month}.`,
    })
    : '';

  const items = list.rows.map((row, i) => `
          <li class="pick">
            <div class="pick-head">
              <span class="pick-rank">${i + 1}</span>
              <div><h3><a href="/stock/${encodeURIComponent(row.ticker)}">${esc(row.name)}</a> <span class="pick-ticker">${esc(row.ticker)}</span></h3>
              ${row.industry ? `<p class="pick-kind">${esc(row.industry)}</p>` : ''}</div>
            </div>
            <dl class="pick-facts">
              ${byYield ? `<div><dt>Dividend yield</dt><dd>${formatPercent(row.yield)}</dd></div>
              <div><dt>Yearly income per $1,000</dt><dd>about $${row.incomePer1000}</dd></div>` : ''}
              <div><dt>Dividend per share</dt><dd>$${row.dividendPerShare.toFixed(2)} a year</dd></div>
              <div><dt>Raised</dt><dd>${years(row)} in a row</dd></div>
            </dl>
            <p class="pick-link"><a href="/stock/${encodeURIComponent(row.ticker)}">See ${esc(row.ticker)}'s full report card</a></p>
            <p class="pick-safety"><span class="ig-grade ${row.safety.grade}">${GRADE_ICON[row.safety.grade]} ${row.safety.text}</span> ${esc(row.safety.plain)}${row.cashCovered === false ? ' Last year its dividends were bigger than its spare cash.' : ''}</p>
          </li>`).join('');

  const photo = await getPhoto('page:top10-dividends', PAGE_PHOTO_QUERIES['top10-dividends']);
  const body = `
      <section class="block">
        ${photoFigure(photo, 'Coins saved in a jar', 'page-photo wide')}
        <p class="dateline-dark">Top 10 · ${month}</p>
        <h1 style="font-size:38px;margin:0 0 10px">Top 10 dividend stocks</h1>
        <p class="lede-dark">US companies that have raised the cash they pay shareholders every year for at least a decade, ${byYield ? 'ranked by how much they pay compared with their share price.' : 'ranked by the length of their record.'}</p>
        ${readingAid(
          'A dividend is cash a company pays you, usually every three months, just for owning its shares.',
          'Companies that keep raising their dividend tend to be steady, profitable businesses. The yield tells you how much income you get for each $1 you invest.',
          'Use this list to learn about dependable companies. A very high yield can be a warning sign, so read each company’s report card before deciding anything.',
        )}
        ${list.rows.length && list.rows.length < 10 ? `<p class="note-box" style="margin:0 0 18px">Only ${list.rows.length} companies passed every check this month, so this month's list has ${list.rows.length}. We don't pad the list with companies that don't qualify.</p>` : ''}
        ${list.rows.length ? `${infographic}<ol class="picks">${items}</ol>` : '<p class="empty-note">This month’s list is being prepared. Please check back soon.</p>'}
        <div class="surface" style="margin-top:24px">
          <h2 style="font-size:22px;margin:0 0 8px">How we rank</h2>
          <ol class="plain-list">${DIVIDEND_RULE.map((rule) => `<li>${esc(rule)}</li>`).join('')}</ol>
          <p class="helper-note">${list.candidates || 0} companies from our list of large US companies passed the first two checks this month.
          ${byYield ? `Prices are the last close${list.pricesAsOf ? ` as of ${esc(list.pricesAsOf.slice(0, 10))}` : ''}.` : 'Share prices were not available when this list was built, so it is ranked by years of raises instead.'}
          SEC digital records go back to about 2009, so "at least" means the record is probably longer.</p>
        </div>
        ${notAdvice('Dividends can be cut, and share prices go down as well as up. ')}
      </section>`;
  return pageShell({ head, body, active: 'top10' });
}

/* ── /top-10/etfs ────────────────────────────────────────────────────── */
export async function renderEtfTop10(origin) {
  const etf = getEtfTop10();
  const head = buildHeadTags({
    title: 'Top 10 ETFs for Beginners — ranked by lowest fee | Dr MoneyWise',
    description: 'Ten simple, broad ETFs for new investors, ranked by lowest yearly fee, with what each one holds explained in simple terms.',
    canonical: `${origin}/top-10/etfs`,
  });
  // Compared with the average equity mutual fund, so the bars say something
  // even where several funds charge the same (ICI, 2025: 0.40% a year).
  const infographic = rankingBarsHtml({
    title: 'Yearly fee on $10,000 invested',
    subtitle: 'Each fund compared with the average US share fund (0.40% a year). Lower fees leave more of your money growing.',
    rows: [
      ...etf.rows.map((row) => ({ label: row.ticker, sublabel: row.kind, value: row.expenseRatio * 100, display: `$${(row.expenseRatio * 100).toFixed(0)}` })),
      { label: 'Average share fund', sublabel: 'Average US equity mutual fund, 2025 (ICI)', value: 40, display: '$40' },
    ],
    source: `${etf.source}. Average fund fee: Investment Company Institute, 2025.`,
  });
  const abroad = `
        <div class="surface abroad-box">
          <h2 style="font-size:22px;margin:0 0 8px">Investing from outside the US?</h2>
          <p>These are US-listed funds. In the UK and EU, ordinary investors often can’t buy them because of European product-document rules, and in many other countries non-US investors can face US estate tax on US-based funds above $60,000. Most people abroad use the Irish-based (“UCITS”) versions instead, listed in London and elsewhere:</p>
          <table class="abroad-table"><thead><tr><th>Instead of</th><th>Irish-based version</th><th>Yearly fee</th></tr></thead><tbody>
            <tr><td>VOO (S&amp;P 500)</td><td>iShares Core S&amp;P 500 UCITS ETF (CSPX) or Vanguard S&amp;P 500 UCITS ETF (VUAA)</td><td>0.07%</td></tr>
            <tr><td>VT (whole world)</td><td>Vanguard FTSE All-World UCITS ETF (VWRA / VWRL)</td><td>0.14%</td></tr>
            <tr><td>Developed countries only</td><td>iShares Core MSCI World UCITS ETF (IWDA / SWDA)</td><td>0.20%</td></tr>
          </tbody></table>
          <p class="helper-note">Fees as published by the fund companies, checked October 2026. “Acc” versions reinvest dividends; “Dist” versions pay them out. Check what your broker offers and your country’s tax rules. This is general information, not advice.</p>
        </div>`;
  const items = etf.rows.map((row, i) => `
          <li class="pick">
            <div class="pick-head">
              <span class="pick-rank">${i + 1}</span>
              <div><h3>${esc(row.name)} <span class="pick-ticker">${esc(row.ticker)}</span></h3>
              <p class="pick-kind">${esc(row.kind)}</p></div>
            </div>
            <dl class="pick-facts">
              <div><dt>Yearly fee</dt><dd>${row.expenseRatio.toFixed(2)}%</dd></div>
              <div><dt>Cost per $1,000 a year</dt><dd>$${row.feePer1000.toFixed(2)}</dd></div>
              <div><dt>Run by</dt><dd>${esc(row.issuer)}</dd></div>
            </dl>
            <p><strong>What's inside:</strong> ${esc(row.inside)}</p>
            <p><strong>Who it may suit:</strong> ${esc(row.suits)}</p>
          </li>`).join('');

  const photo = await getPhoto('page:top10-etfs', PAGE_PHOTO_QUERIES['top10-etfs']);
  const body = `
      <section class="block">
        ${photoFigure(photo, 'A basket of fruit, like a basket of investments', 'page-photo wide')}
        <p class="dateline-dark">Top 10 · Fees checked ${esc(new Date(etf.checkedOn).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
        <h1 style="font-size:38px;margin:0 0 10px">Top 10 ETFs for beginners</h1>
        <p class="lede-dark">Ten simple funds that each hold hundreds or thousands of investments, ranked by the lowest yearly fee.</p>
        ${readingAid(
          'An ETF is a basket of investments you buy in one go on the stock market, like buying a fruit basket instead of picking every fruit.',
          'Fees are taken every year whether markets go up or down. Over 20 or 30 years, a small difference in fees adds up to a lot of money.',
          'Many people start with one broad fund (the whole US or whole world) and add bonds for steadiness. Think about how long you can leave the money invested.',
        )}
        ${infographic}
        <ol class="picks">${items}</ol>
        ${abroad}
        <div class="surface" style="margin-top:24px">
          <h2 style="font-size:22px;margin:0 0 8px">How we rank</h2>
          <p>We picked ten widely held, low-cost funds that cover the main building blocks (US shares, world shares, bonds, dividends, gold and property) and ranked them by their yearly fee, lowest first. Where fees are equal, they are listed alphabetically.</p>
          <p class="helper-note">${esc(etf.source)}.</p>
        </div>
        ${notAdvice('Fund prices go down as well as up. ')}
      </section>`;
  return pageShell({ head, body, active: 'top10' });
}

/* ── /top-10/stocks/<list> ───────────────────────────────────────────── */
export async function renderStockTop10(origin, slug) {
  const built = await buildStockList(slug);
  if (!built) return null;
  const { list: l, rows, ready, facts } = built;
  const head = buildHeadTags({
    title: `Top 10 ${l.title.charAt(0).toLowerCase()}${l.title.slice(1)} | Dr MoneyWise`,
    description: `${l.title}: the top 10 large US companies. ${l.rule}`.slice(0, 300),
    canonical: `${origin}/top-10/stocks/${slug}`,
  });
  const max = rows.length ? Math.max(...rows.map((r) => (l.barValue ? l.barValue(r, Math.max(...rows.map((x) => l.value(x)))) : l.value(r)))) : 1;
  const sources = [
    'Company accounts: SEC filings',
    l.needs === 'prices' && facts.pricesAsOf ? `prices: Marketstack, last close ${facts.pricesAsOf}` : '',
    l.needs === 'history' && facts.historyAsOf ? `daily prices: Marketstack, to ${facts.historyAsOf}` : '',
  ].filter(Boolean).join('; ');
  const infographic = rows.length ? rankingBarsHtml({
    title: l.short,
    subtitle: l.rule,
    rows: rows.map((r) => ({ label: r.ticker, sublabel: r.name, value: Math.max(0.0001, l.barValue ? l.barValue(r, Math.max(...rows.map((x) => l.value(x)))) : l.value(r)), display: l.barLabel(r) })),
    source: `Source: ${sources}.`,
  }) : '';
  void max;
  const table = rows.length ? `
        <div class="table-scroll"><table class="t10-table">
          <thead><tr><th>#</th><th>Company</th>${l.show.map(([h]) => `<th class="num">${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td><a href="/stock/${encodeURIComponent(r.ticker)}"><b>${esc(r.ticker)}</b> ${esc(r.name)}</a>${r.sector ? `<small>${esc(r.sector)}</small>` : ''}</td>${l.show.map(([, f]) => `<td class="num">${esc(f(r))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>` : '';
  const others = STOCK_LISTS.filter((x) => x.slug !== slug && (x.group === l.group || x.group === 'Mixed lists')).slice(0, 8);
  const body = `
      <section class="block">
        <p class="nl-back"><a href="/top-10">← All Top 10 lists</a></p>
        <p class="dateline-dark">Top 10 · ${esc(l.group)}${facts.pricesAsOf && l.needs ? ` · prices to ${esc(l.needs === 'history' ? facts.historyAsOf : facts.pricesAsOf)}` : ''}</p>
        <h1 style="font-size:36px;margin:0 0 10px">${esc(l.title)}</h1>
        <p class="lede-dark">${esc(l.why)}</p>
        ${rows.length && rows.length < 10 ? `<p class="note-box" style="margin:0 0 18px">Only ${rows.length} companies meet every condition right now, so this list has ${rows.length}. We don't pad lists with companies that don't qualify.</p>` : ''}
        ${rows.length ? `${infographic}${table}` : `<p class="note-box">${ready ? 'No company meets every condition right now.' : 'This list needs share prices, which are still being collected. It will appear here automatically within a few days.'}</p>`}
        <div class="surface" style="margin-top:24px">
          <h2 style="font-size:22px;margin:0 0 8px">How this list is made</h2>
          <p>${esc(l.rule)}</p>
          <p class="helper-note">We cover about 125 large US companies (overseas companies are left out because their per-share figures are for local shares). Figures update automatically: accounts when companies file them, prices every trading day.</p>
        </div>
        <h2 style="font-size:22px;margin:26px 0 10px">More lists</h2>
        <div class="t10-grid">${others.map((x) => `<a class="t10-card" href="/top-10/stocks/${x.slug}"><b>${esc(x.short)}</b><span>${esc(x.group)}</span></a>`).join('')}</div>
        ${notAdvice('Past performance does not tell you what happens next, and share prices go down as well as up. ')}
      </section>`;
  return pageShell({ head, body, active: 'top10' });
}
