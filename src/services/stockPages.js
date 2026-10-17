/* ════════════════════════════════════════════════════════════════════════
   COMPANY PAGES — /stocks (search + A–Z) and /stock/<TICKER>
   ───────────────────────────────────────────────────────────────────────
   Every number comes from the saved SEC data; the "In plain English"
   paragraph is written by code from those numbers (no writing engine, no
   cost, never out of step with the figures). Chart and news are free
   TradingView widgets.
   ════════════════════════════════════════════════════════════════════════ */

import { readCompanies, readPrices } from './dataEngine.js';
import { buildReportCard, formatMoney, formatPercent, RATING_RULES } from './reportCardService.js';
import { reportCardHtml, yearBarsHtml } from './infographicService.js';
import { getPhoto, industryQuery, PAGE_PHOTO_QUERIES, photoFigure } from './imageService.js';
import { iframeWidget } from './marketPages.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { getDividendTop10 } from './top10Service.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const short = (v) => formatMoney(v).replace(' billion', 'bn').replace(' trillion', 'tn').replace(' million', 'm');

function tvSymbol(company) {
  const exchange = String(company.exchange || '').toUpperCase();
  const ticker = company.ticker.replace('-', '.');
  if (exchange === 'NASDAQ' || exchange === 'NYSE' || exchange === 'AMEX' || exchange === 'CBOE') {
    return `${exchange}:${ticker}`;
  }
  return ticker;
}

function monthYear(isoDate) {
  if (!isoDate) return '';
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** The "In plain English" paragraph — built only from the numbers. */
export function plainEnglishSummary(company) {
  const d = company.derived || {};
  const name = company.displayName || company.name;
  const sales = company.revenue.at(-1)?.value;
  const profit = company.netIncome.at(-1)?.value;
  const parts = [];
  parts.push(`${name} is a US-listed company${company.industry ? ` in the ${company.industry.toLowerCase()} business` : ''}.`);
  if (sales) {
    let line = `In its latest financial year${company.latestFiscalYearEnd ? ` (to ${monthYear(company.latestFiscalYearEnd)})` : ''} it brought in ${formatMoney(sales)} from customers`;
    if (profit !== null && profit !== undefined) {
      line += profit >= 0
        ? ` and kept ${formatMoney(profit)} as profit, about ${Math.round((profit / sales) * 100)} cents of every dollar.`
        : ` but made a loss of ${formatMoney(Math.abs(profit))}.`;
    } else {
      line += '.';
    }
    parts.push(line);
  }
  if (d.revenueGrowth !== null && d.revenueGrowth !== undefined) {
    parts.push(d.revenueGrowth >= 0
      ? `Sales grew ${formatPercent(d.revenueGrowth)} compared with the year before.`
      : `Sales fell ${formatPercent(Math.abs(d.revenueGrowth))} compared with the year before.`);
  }
  if (d.latestDividendPerShare > 0) {
    parts.push(`It paid shareholders a dividend of $${d.latestDividendPerShare.toFixed(2)} for each share${d.yearsOfDividendRaises >= 2 ? `, and has raised it ${d.dividendRaisesFullHistory ? 'for at least ' : ''}${d.yearsOfDividendRaises} years in a row` : ''}.`);
  } else {
    parts.push('It does not currently pay a dividend; it keeps its profits to reinvest in the business.');
  }
  return parts.join(' ');
}

/* ── /stocks ─────────────────────────────────────────────────────────── */
export async function renderStocksIndex(origin, query = '') {
  const { companies } = await readCompanies();
  const all = Object.values(companies || {}).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
  const q = String(query || '').trim().toLowerCase();
  const list = q
    ? all.filter((c) => c.ticker.toLowerCase().includes(q) || (c.displayName || c.name).toLowerCase().includes(q) || (c.industry || '').toLowerCase().includes(q))
    : all;
  const photo = await getPhoto('page:stocks', PAGE_PHOTO_QUERIES.stocks);
  const head = buildHeadTags({
    title: 'Company report cards — large US stocks explained simply | Dr MoneyWise',
    description: `Plain-English report cards for ${all.length} large US companies: growth, profit, debt, spare cash and dividends, from official SEC filings.`,
    canonical: `${origin}/stocks`,
  });
  const rows = list.map((c) => `
          <a class="stock-row" href="/stock/${encodeURIComponent(c.ticker)}">
            <span class="pick-ticker">${esc(c.ticker)}</span>
            <span class="stock-row-name">${esc(c.displayName || c.name)}</span>
            <span class="stock-row-kind">${esc(c.industry || '')}</span>
          </a>`).join('');
  const body = `
      <section class="block">
        <div class="page-intro">
          <div>
            <p class="dateline-dark">Company report cards</p>
            <h1 style="font-size:38px;margin:0 0 10px">Look up a company</h1>
            <p class="lede-dark">Five simple checks for ${all.length} large US companies: is it growing, profitable, in control of its debt, making spare cash, and paying you a dividend?</p>
            <form class="inline-form stock-search" method="get" action="/stocks" role="search">
              <label class="sr-only" for="stockQ">Company name or ticker</label>
              <input id="stockQ" class="input" type="search" name="q" value="${esc(query)}" placeholder="Company name or ticker, e.g. Apple or AAPL" />
              <button class="button primary" type="submit">Search</button>
            </form>
          </div>
          ${photoFigure(photo, 'City financial district')}
        </div>
        <p class="helper-note">${q ? `${list.length} match${list.length === 1 ? '' : 'es'} for "${esc(query)}". <a href="/stocks">Show all</a>` : 'All companies, A to Z.'}</p>
        <div class="stock-list">${rows || '<p class="empty-note">No companies match that search yet. Try a ticker like KO or a name like Coca.</p>'}</div>
      </section>`;
  return pageShell({ head, body, active: 'stocks' });
}

/** Exact ticker or exact name → its page address, for the search box. */
export async function findCompanyPath(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  const { companies } = await readCompanies();
  const list = Object.values(companies || {});
  const exact = list.find((c) => c.ticker.toLowerCase() === q || c.ticker.replace('-', '.').toLowerCase() === q)
    || list.find((c) => (c.displayName || c.name).toLowerCase() === q);
  if (exact) return `/stock/${encodeURIComponent(exact.ticker)}`;
  const starts = list.filter((c) => (c.displayName || c.name).toLowerCase().startsWith(q));
  return starts.length === 1 ? `/stock/${encodeURIComponent(starts[0].ticker)}` : null;
}

/* ── /stock/<TICKER> ─────────────────────────────────────────────────── */
export async function renderStockPage(origin, rawTicker) {
  const ticker = String(rawTicker || '').toUpperCase().replace('.', '-');
  const [{ companies, updatedAt }, { prices }, dividendList] = await Promise.all([readCompanies(), readPrices(), getDividendTop10().catch(() => ({ rows: [] }))]);
  const company = companies?.[ticker];
  if (!company) return null;

  const name = company.displayName || company.name;
  const ratings = buildReportCard(company);
  const source = `Source: ${name} annual reports filed with the US SEC${updatedAt ? `, checked ${updatedAt.slice(0, 10)}` : ''}`;
  const photo = await getPhoto(`industry:${industryQuery(company.industry)}`, industryQuery(company.industry));
  const price = prices?.[ticker];
  const d = company.derived || {};
  const dividendRank = dividendList.rows.findIndex((row) => row.ticker === ticker);

  const head = buildHeadTags({
    title: `${name} (${ticker}) explained simply: report card, sales and dividends | Dr MoneyWise`,
    description: `${plainEnglishSummary(company).slice(0, 155)}`,
    canonical: `${origin}/stock/${encodeURIComponent(ticker)}`,
    image: photo?.url || '',
  });

  const facts = [
    ['Sales (latest year)', formatMoney(company.revenue.at(-1)?.value)],
    ['Profit (latest year)', formatMoney(company.netIncome.at(-1)?.value)],
    ['Earnings per share', company.eps.at(-1) ? `$${company.eps.at(-1).value.toFixed(2)}` : '—'],
    ['Dividend per share', d.latestDividendPerShare ? `$${d.latestDividendPerShare.toFixed(2)} a year` : 'None'],
    ['Dividend yield', price?.price && d.latestDividendPerShare ? `${formatPercent(d.latestDividendPerShare / price.price)} at $${price.price.toFixed(2)}` : '—'],
    ['Long-term debt', formatMoney(company.longTermDebt)],
    ['Cash in the bank', formatMoney(company.cash)],
    ['Spare cash last year', formatMoney(d.freeCashFlow)],
  ];

  const related = Object.values(companies)
    .filter((c) => c.ticker !== ticker && c.industry && c.industry === company.industry)
    .slice(0, 6);

  const body = `
      <section class="block">
        <p class="dateline-dark"><a href="/stocks">Company report cards</a> · ${esc(company.exchange || 'US')}: ${esc(ticker)}</p>
        <div class="page-intro">
          <div>
            <h1 style="font-size:38px;margin:0 0 6px">${esc(name)} <span class="pick-ticker" style="font-size:18px">${esc(ticker)}</span></h1>
            ${company.industry ? `<p class="pick-kind" style="font-size:17px">${esc(company.industry)}</p>` : ''}
            <div class="plain-box">
              <h2>In plain English</h2>
              <p>${esc(plainEnglishSummary(company))}</p>
            </div>
            ${dividendRank >= 0 ? `<p class="note-box" style="margin-top:12px">Number ${dividendRank + 1} on this month's <a href="/top-10/dividend-stocks">Top 10 dividend stocks</a>.</p>` : ''}
          </div>
          ${photoFigure(photo, `${company.industry || 'Business'} photo`)}
        </div>
      </section>

      <section class="block stock-grid">
        <div>
          ${reportCardHtml({ title: 'Report card', subtitle: 'Five plain-English checks on the business', ratings, source })}
        </div>
        <div>
          <h2 style="font-size:22px;margin:0 0 8px">Share price, last 12 months</h2>
          ${iframeWidget('embed-widget-mini-symbol-overview.js', {
            symbol: tvSymbol(company), width: '100%', height: '100%', locale: 'en', dateRange: '12M',
            colorTheme: 'light', isTransparent: false, autosize: true, largeChartUrl: '',
          }, 260)}
          <table class="fact-table">
            ${facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
          </table>
          <p class="helper-note">Figures for the year to ${esc(monthYear(company.latestFiscalYearEnd) || '—')}. Debt and cash as of ${esc(monthYear(company.balanceSheetAsOf) || '—')}.</p>
        </div>
      </section>

      <section class="block">
        ${company.revenue.length ? yearBarsHtml({ title: 'Sales each year', subtitle: 'Money coming in from customers', series: company.revenue, format: short, source }) : ''}
        ${company.netIncome.length ? yearBarsHtml({ title: 'Profit each year', subtitle: 'What was left after all costs (losses show as zero)', series: company.netIncome, format: short, source }) : ''}
        ${company.dividendsPerShare.length ? yearBarsHtml({ title: 'Dividend per share each year', subtitle: 'Cash paid to shareholders for each share they own', series: company.dividendsPerShare, format: (v) => `$${v.toFixed(2)}`, source }) : ''}
      </section>

      <section class="block">
        <div class="block-head"><div><h2>Latest news on ${esc(name)}</h2><p>Headlines from TradingView's news feed.</p></div></div>
        ${iframeWidget('embed-widget-timeline.js', {
          feedMode: 'symbol', symbol: tvSymbol(company), colorTheme: 'light', isTransparent: false,
          displayMode: 'regular', width: '100%', height: '100%', locale: 'en',
        }, 460)}
      </section>

      <section class="block">
        <div class="surface">
          <h2 style="font-size:22px;margin:0 0 8px">How we rate</h2>
          <ul class="plain-list">${RATING_RULES.map((rule) => `<li>${esc(rule)}</li>`).join('')}</ul>
        </div>
        ${related.length ? `<h2 style="font-size:22px;margin:24px 0 10px">Other ${esc(company.industry.toLowerCase())} companies</h2>
        <div class="stock-list">${related.map((c) => `<a class="stock-row" href="/stock/${encodeURIComponent(c.ticker)}"><span class="pick-ticker">${esc(c.ticker)}</span><span class="stock-row-name">${esc(c.displayName || c.name)}</span></a>`).join('')}</div>` : ''}
        <p class="note-box">This report card describes the business using its official figures. It is not a recommendation to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'stocks' });
}

export async function stockSitemapEntries(origin) {
  const { companies, updatedAt } = await readCompanies();
  const day = (updatedAt || new Date().toISOString()).slice(0, 10);
  return Object.keys(companies || {}).map((ticker) => ({ loc: `${origin}/stock/${encodeURIComponent(ticker)}`, lastmod: day, priority: '0.6' }));
}
