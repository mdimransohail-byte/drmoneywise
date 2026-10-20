/* ════════════════════════════════════════════════════════════════════════
   COMPANY PAGES — /stocks (search + A–Z) and /stock/<TICKER>
   ───────────────────────────────────────────────────────────────────────
   /stocks shows the 10 largest companies in each sector (src/data/
   sectorLeaders.js) with the latest closing price, plus a search box that
   finds ANY US-listed company (pages for those are built on request, see
   companyLookup.js). A "Full financial results" section is for paying
   members only: the numbers are fetched by public/members.js from
   /api/stock/details, so they are never in the free page's HTML.

   Every number comes from the saved SEC data; the "In plain English"
   paragraph is written by code from those numbers (no writing engine, no
   cost, never out of step with the figures). Chart and news are free
   TradingView widgets.
   ════════════════════════════════════════════════════════════════════════ */

import { readCompanies, readPrices } from './dataEngine.js';
import { buildReportCard, formatMoney, formatPercent, RATING_RULES } from './reportCardService.js';
import { reportCardHtml, yearBarsHtml } from './infographicService.js';
import { getPhoto, PAGE_PHOTO_QUERIES, photoFigure } from './imageService.js';
import { cleanName } from './secService.js';
import { iframeWidget } from './marketPages.js';
import { buildHeadTags, isForumEnabled, pageShell } from './seoService.js';
import { adSlot } from './adService.js';
import { newsBlockHtml } from './newsBlock.js';
import { companyResultsHtml } from './resultsPages.js';
import { getDividendTop10 } from './top10Service.js';
import { SECTORS, SECTORS_REVIEWED, sectorOf } from '../data/sectorLeaders.js';
import { getCompany, normaliseTicker, readExtraCompanies, searchAllCompanies } from './companyLookup.js';
import { fundsForTicker } from './fundsService.js';
import { WORLD_REGIONS, worldRegion, worldTickerInfo } from '../data/worldStocks.js';
import { CURRENCY_WORDS } from './fxService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
// Company name for display: tidy capitals and drop SEC state tags like "/De/".
const nameOf = (c) => String(c.displayName || cleanName(c.name || c.ticker)).replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/u, '').trim();

/** One company tile: logo, name and ticker on one line, industry on the next. Same size everywhere. */
function stockRow(c) {
  const name = nameOf(c);
  return `<a class="stock-row" href="/stock/${encodeURIComponent(c.ticker)}" title="${esc(name)}">
            ${companyLogo(c, name, 'sm')}
            <span class="stock-row-line"><span class="stock-row-name">${esc(name)}</span><span class="pick-ticker">${esc(c.ticker)}</span></span>
            <span class="stock-row-kind">${esc(c.industry || '')}</span>
          </a>`;
}
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

/** "UNITED KINGDOM" → "the United Kingdom"; "JAPAN" → "Japan". */
function titleCountry(text) {
  const t = String(text).toLowerCase().replace(/\b([a-z])/gu, (x) => x.toUpperCase()).replace(/\bOf\b/gu, 'of').replace(/\bAnd\b/gu, 'and');
  return /^(United|Netherlands|Cayman|Philippines|Czech)/u.test(t) ? `the ${t}` : t;
}

/** Note shown on overseas companies' pages about currency and share type. */
export function foreignNote(company) {
  if (!company.foreignFiler) return '';
  const cur = company.currency || 'USD';
  const fx = company.fx;
  return `${cur !== 'USD' && fx?.rate ? `${company.displayName || company.ticker} reports in ${CURRENCY_WORDS[cur] || cur}. We show its figures in US dollars at the European Central Bank rate${fx.date ? ` of ${fx.date}` : ''} (1 ${cur} = $${fx.rate < 0.01 ? fx.rate.toFixed(5) : fx.rate.toFixed(4)}), the same rate for every year, so growth and profit margins are exactly as reported. ` : ''}Per-share figures are for one local share. Its US-listed shares are usually ADRs, and one ADR can stand for several local shares, so we don't work out a dividend yield from the US price.`;
}

/** The "In plain English" paragraph — built only from the numbers. */
export function plainEnglishSummary(company) {
  const d = company.derived || {};
  const name = nameOf(company);
  const sales = company.revenue.at(-1)?.value;
  const profit = company.netIncome.at(-1)?.value;
  const parts = [];
  parts.push(company.foreignFiler
    ? `${name} is ${company.country ? `based in ${titleCountry(company.country)}` : 'based outside the US'}${company.industry ? `, in the ${company.industry.toLowerCase()} business,` : ''} and its shares also trade in the US.`
    : `${name} is a US-listed company${company.industry ? ` in the ${company.industry.toLowerCase()} business` : ''}.`);
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
    parts.push(`It paid shareholders a dividend of $${d.latestDividendPerShare.toFixed(2)} for each ${company.foreignFiler ? 'local ' : ''}share${d.yearsOfDividendRaises >= 2 ? `, and has raised it ${d.dividendRaisesFullHistory ? 'for at least ' : ''}${d.yearsOfDividendRaises} years in a row` : ''}.`);
  } else {
    parts.push('It does not currently pay a dividend; it keeps its profits to reinvest in the business.');
  }
  return parts.join(' ');
}

function initialsOf(name, ticker) {
  const letters = String(name || ticker).replace(/[^A-Za-z0-9 ]/gu, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  // e.g. Aflac Inc would give "AI" — use the ticker instead (site never shows "AI").
  return esc(!letters || letters === 'AI' ? ticker.slice(0, 4) : letters);
}

/** Logo image address at the given pixel size (Logo.dev, by ticker). */
export function logoUrl(company, size = 128) {
  const key = String(process.env.LOGO_DEV_KEY || '').trim();
  if (!key) return '';
  return `https://img.logo.dev/ticker/${encodeURIComponent(company.ticker.replace('-', '.'))}?token=${encodeURIComponent(key)}&size=${size}&format=png&retina=true`;
}

/** Big logo card shown at the top right of a company page. */
function logoCard(company, name) {
  const initials = initialsOf(name, company.ticker);
  const src = logoUrl(company, 400);
  const mark = src
    ? `<img src="${src}" alt="${esc(name)} logo" width="200" height="200" onerror="this.parentNode.classList.add('initials');this.parentNode.textContent='${initials}'" />`
    : initials;
  return `<div class="logo-card">
          <div class="logo-card-mark${src ? '' : ' initials'}">${mark}</div>
          <p class="logo-card-name">${esc(name)}</p>
          <p class="logo-card-meta">${esc(company.exchange || 'US')}: ${esc(company.ticker)}${company.industry ? ` · ${esc(company.industry)}` : ''}</p>
        </div>`;
}

/** Company logo from Logo.dev (free, needs LOGO_DEV_KEY), with the
 *  company's initials as a fallback if no key or no logo is found. */
export function companyLogo(company, name, size = 'lg') {
  const initials = initialsOf(name, company.ticker);
  const key = String(process.env.LOGO_DEV_KEY || '').trim();
  const fallback = `<span class="co-logo ${size} initials" aria-hidden="true">${initials}</span>`;
  if (!key) return fallback;
  const src = `https://img.logo.dev/ticker/${encodeURIComponent(company.ticker.replace('-', '.'))}?token=${encodeURIComponent(key)}&size=128&format=png&retina=true`;
  return `<span class="co-logo ${size}"><img src="${src}" alt="${esc(name)} logo" loading="lazy" width="64" height="64" onerror="this.parentNode.classList.add('initials');this.parentNode.textContent='${initials}'" /></span>`;
}

/* ── /stocks ─────────────────────────────────────────────────────────── */
/* ── Sector top 10s ─────────────────────────────────────────────────── */
function priceText(p) {
  if (!p?.price) return '—';
  const day = p.date ? new Date(p.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  return `$${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${day ? `<small>${esc(day)} close</small>` : ''}`;
}

/** Top 10 of one sector: by market value when we have prices, else by sales. */
export function sectorTop10(sector, companies, prices) {
  const rows = sector.tickers.map((t) => companies[t]).filter(Boolean).map((c) => {
    const p = prices?.[c.ticker];
    return { c, p, value: p?.price && c.sharesOutstanding ? p.price * c.sharesOutstanding : null, sales: c.revenue?.at(-1)?.value || 0 };
  });
  const byValue = rows.length && rows.filter((r) => r.value).length >= Math.min(rows.length, 10);
  rows.sort((a, b) => (byValue ? (b.value || 0) - (a.value || 0) : b.sales - a.sales));
  return { rankedBy: byValue ? 'value' : 'sales', rows: rows.slice(0, 10) };
}

function sectorTable(sector, top) {
  const lines = top.rows.map((r, i) => {
    const name = nameOf(r.c);
    const yieldPct = r.p?.price && r.c.derived?.latestDividendPerShare ? formatPercent(r.c.derived.latestDividendPerShare / r.p.price) : (r.c.derived?.latestDividendPerShare ? '…' : 'None');
    return `
            <tr>
              <td class="rank">${i + 1}</td>
              <td class="co"><a href="/stock/${encodeURIComponent(r.c.ticker)}">${companyLogo(r.c, name, 'sm')}<span><strong>${esc(name)}</strong><span class="pick-ticker">${esc(r.c.ticker)}</span></span></a></td>
              <td class="num">${priceText(r.p)}</td>
              <td class="num hide-sm">${esc(short(r.sales || null))}</td>
              <td class="num hide-sm">${esc(yieldPct)}</td>
            </tr>`;
  }).join('');
  return `
        <section class="sector" id="${esc(sector.id)}">
          <div class="sector-head"><h2>${esc(sector.name)}</h2><p>${esc(sector.plain)}</p></div>
          <div class="table-scroll"><table class="sector-table">
            <thead><tr><th>#</th><th>Company</th><th class="num">Share price</th><th class="num hide-sm">Yearly sales</th><th class="num hide-sm">Dividend yield</th></tr></thead>
            <tbody>${lines || '<tr><td colspan="5">Figures are being collected. Check back soon.</td></tr>'}</tbody>
          </table></div>
          <p class="helper-note">${top.rankedBy === 'value' ? 'Ranked by market value (share price × number of shares).' : 'Ranked by yearly sales until today’s share prices are in.'}</p>
        </section>`;
}

/* ── /stocks ─────────────────────────────────────────────────────────── */
export async function renderStocksIndex(origin, query = '') {
  const [{ companies }, { prices, updatedAt: pricesAt }] = await Promise.all([readCompanies(), readPrices()]);
  const extra = await readExtraCompanies();
  const all = { ...extra, ...(companies || {}) };
  const q = String(query || '').trim();
  const photo = await getPhoto('page:stocks', PAGE_PHOTO_QUERIES.stocks);
  const head = buildHeadTags({
    title: 'Largest companies in each sector, explained simply | Dr MoneyWise',
    description: 'The 10 largest US companies in each sector with their latest share price, plus a plain-English report card for any US-listed company, from official SEC filings.',
    canonical: `${origin}/stocks`,
  });

  const searchForm = `
            <form class="inline-form stock-search" method="get" action="/stocks" role="search">
              <label class="sr-only" for="stockQ">Company name or ticker</label>
              <input id="stockQ" class="input" type="search" name="q" value="${esc(q)}" placeholder="Any US company, e.g. Apple, AAPL or Costco" />
              <button class="button primary" type="submit">Search</button>
            </form>`;

  let content;
  if (q) {
    const matches = await searchAllCompanies(q, 24);
    const items = matches.map((m) => {
      const known = all[m.ticker];
      return known
        ? stockRow(known)
        : `<a class="stock-row" href="/stock/${encodeURIComponent(m.ticker)}" title="${esc(m.name)}">
            <span class="co-logo sm initials" aria-hidden="true">${initialsOf(m.name, m.ticker)}</span>
            <span class="stock-row-line"><span class="stock-row-name">${esc(m.name)}</span><span class="pick-ticker">${esc(m.ticker)}</span></span>
            <span class="stock-row-kind">US-listed company</span>
          </a>`;
    }).join('');
    content = `
        <p class="helper-note">${matches.length ? `${matches.length} compan${matches.length === 1 ? 'y' : 'ies'} found for "${esc(q)}".` : `Nothing found for "${esc(q)}".`} <a href="/stocks">Back to the sector lists</a></p>
        <div class="stock-list">${items || '<p class="empty-note">Try the company’s ticker (for example KO) or the start of its name. We cover companies listed in the US.</p>'}</div>`;
  } else {
    const jump = SECTORS.map((s) => `<a href="#${esc(s.id)}">${esc(s.name)}</a>`).join('');
    content = `
        <div class="wd-others wd-top"><span>Outside the US:</span>${WORLD_REGIONS.map((r) => `<a href="/stocks/world/${esc(r.id)}" style="--c:${r.colour}">${esc(r.name)}</a>`).join('')}<a href="/screener" style="--c:#0a1128">Stock screener</a></div>
        <nav class="sector-jump" aria-label="Jump to sector">${jump}</nav>
        ${SECTORS.map((s) => sectorTable(s, sectorTop10(s, all, prices))).join('')}
        <p class="note-box">Prices are the latest closing prices${pricesAt ? ` (updated ${esc(pricesAt.slice(0, 10))})` : ''}. Sector lists reviewed ${esc(SECTORS_REVIEWED)}. These lists show size, not quality: they are not a recommendation to buy. Read our <a href="/disclaimer">disclaimer</a>.</p>`;
  }

  const body = `
      <section class="block">
        <div class="page-intro">
          <div>
            <p class="dateline-dark">Company report cards</p>
            <h1 style="font-size:38px;margin:0 0 10px">${q ? 'Search results' : 'The biggest companies, sector by sector'}</h1>
            <p class="lede-dark">See the 10 largest US companies in each part of the economy. Looking for another company? Search any US-listed company by name or ticker.</p>
            ${searchForm}
          </div>
          ${photoFigure(photo, 'City financial district')}
        </div>
        ${content}
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/** Search box shortcut: exact ticker, exact name or a single clear match → its page. */
export async function findCompanyPath(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const matches = await searchAllCompanies(q, 5);
  if (!matches.length) return null;
  const top = matches[0];
  if (top.score >= 90) return `/stock/${encodeURIComponent(top.ticker)}`;
  if (top.score >= 70 && (matches.length === 1 || matches[1].score < 70)) return `/stock/${encodeURIComponent(top.ticker)}`;
  return null;
}

/* ── Not found / busy pages ──────────────────────────────────────────── */
function lookupProblemPage(origin, ticker, result) {
  const head = buildHeadTags({ title: `${ticker} | Dr MoneyWise`, description: 'Company look-up', canonical: `${origin}/stocks` });
  const message = result.busy
    ? 'We are fetching lots of company files right now. Please try again in a few minutes.'
    : result.reason === 'no-filings'
      ? `${result.name || ticker} doesn’t publish its yearly figures to the SEC in the standard format we read (this is common for funds, trusts and some companies based outside the US), so we can’t build a report card for it.`
      : `We couldn’t find a US-listed company with the ticker "${ticker}". Check the spelling, or search by name.`;
  const body = `
      <section class="block">
        <h1 style="font-size:34px">${result.busy ? 'Please try again shortly' : 'Company not found'}</h1>
        <p>${esc(message)}</p>
        <form class="inline-form stock-search" method="get" action="/stocks" role="search">
          <label class="sr-only" for="stockQ2">Company name or ticker</label>
          <input id="stockQ2" class="input" type="search" name="q" placeholder="Company name or ticker" />
          <button class="button primary" type="submit">Search</button>
        </form>
        <p class="helper-note"><a href="/stocks">See the largest companies in each sector</a></p>
      </section>`;
  return pageShell({ head: `${head}\n    <meta name="robots" content="noindex" />`, body, active: 'markets' });
}

/* ── /stock/<TICKER> ─────────────────────────────────────────────────── */
/** Returns { status, html }. */
export async function renderStockPage(origin, rawTicker) {
  const ticker = normaliseTicker(rawTicker);
  const company = await getCompany(ticker);
  if (!company || company.notFound || company.busy) {
    return { status: company?.busy ? 503 : 404, html: lookupProblemPage(origin, ticker, company || {}) };
  }
  const [{ companies, updatedAt }, { prices }, dividendList] = await Promise.all([readCompanies(), readPrices(), getDividendTop10().catch(() => ({ rows: [] }))]);

  const name = nameOf(company);
  const ratings = buildReportCard(company);
  const checked = company.onRequest ? company.updatedAt : updatedAt;
  const source = `Source: ${name} annual reports filed with the US SEC${checked ? `, checked ${checked.slice(0, 10)}` : ''}`;
  const price = prices?.[ticker];
  const d = company.derived || {};
  const dividendRank = dividendList.rows.findIndex((row) => row.ticker === ticker);
  const sector = sectorOf(ticker);
  const world = worldTickerInfo()[ticker] || null;
  const region = world ? worldRegion(world.region) : null;
  const last6 = (series) => (series || []).slice(-6);

  const head = buildHeadTags({
    title: `${name} (${ticker}) explained simply: report card, sales and dividends | Dr MoneyWise`,
    description: `${plainEnglishSummary(company).slice(0, 155)}`,
    canonical: `${origin}/stock/${encodeURIComponent(ticker)}`,
    image: logoUrl(company, 400) || '',
  });

  const facts = [
    ['Share price', price?.price ? `$${price.price.toFixed(2)} (close ${price.date ? String(price.date).slice(0, 10) : ''})` : 'See the chart'],
    ['Sales (latest year)', formatMoney(company.revenue.at(-1)?.value)],
    ['Profit (latest year)', formatMoney(company.netIncome.at(-1)?.value)],
    [company.foreignFiler ? 'Earnings per local share' : 'Earnings per share', company.eps.at(-1) ? `$${company.eps.at(-1).value.toFixed(2)}` : '—'],
    [company.foreignFiler ? 'Dividend per local share' : 'Dividend per share', d.latestDividendPerShare ? `$${d.latestDividendPerShare.toFixed(2)} a year` : 'None'],
    ['Dividend yield', !company.foreignFiler && price?.price && d.latestDividendPerShare ? formatPercent(d.latestDividendPerShare / price.price) : '—'],
    ['Long-term debt', formatMoney(company.longTermDebt)],
    ['Cash in the bank', formatMoney(company.cash)],
  ];

  const newsHtml = await newsBlockHtml('stock', ticker, { title: `In the news: ${name}`, name, subject: `${name} (${ticker})`, search: name });
  const pool = { ...(companies || {}) };
  const related = (region
    ? region.sec.map(([t]) => pool[t])
    : sector
    ? sector.tickers.map((t) => pool[t])
    : Object.values(pool).filter((c) => c.industry && c.industry === company.industry))
    .filter((c) => c && c.ticker !== ticker)
    .slice(0, 6);

  const body = `
      <section class="block">
        <p class="dateline-dark"><a href="/stocks">Company report cards</a>${region ? ` · <a href="/stocks/world/${esc(region.id)}">${esc(region.name)}</a>` : ''}${sector ? ` · <a href="/stocks#${esc(sector.id)}">${esc(sector.name)}</a>` : ''} · ${esc(company.exchange || 'US')}: ${esc(ticker)}</p>
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
          ${logoCard(company, name)}
        </div>
      </section>

      ${companyResultsHtml(ticker, name)}

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
          ${company.foreignFiler ? `<p class="note-box">${esc(foreignNote(company))}</p>` : ''}
        </div>
      </section>

      <section class="block">
        ${company.revenue.length ? yearBarsHtml({ title: 'Sales each year', subtitle: 'Money coming in from customers', series: last6(company.revenue), format: short, source }) : ''}
        ${company.netIncome.length ? yearBarsHtml({ title: 'Profit each year', subtitle: 'What was left after all costs (losses show as zero)', series: last6(company.netIncome), format: short, source }) : ''}
        ${company.dividendsPerShare.length ? yearBarsHtml({ title: 'Dividend per share each year', subtitle: 'Cash paid to shareholders for each share they own', series: company.dividendsPerShare, format: (v) => `$${v.toFixed(2)}`, source }) : ''}
      </section>

      <section class="block members-box" id="membersFinancials" data-ticker="${esc(ticker)}">
        <div class="block-head"><div><h2>Deeper look <span class="members-badge">Members</span></h2>
          <p>What the big funds are doing, "what if" growth scenarios, and ten years of results from ${esc(name)}'s official filings.</p></div></div>
        <div id="membersContent" class="members-teaser">
          <ul class="plain-list">
            <li><strong>What the big funds are doing:</strong> which of about 20 famous investors (Buffett's Berkshire Hathaway, Bridgewater, Pershing Square and others) own it, and whether they bought or sold last quarter, from their official SEC reports</li>
            <li><strong>"What if" growth scenarios:</strong> where sales, profit and dividends would be in 1, 3 and 5 years if the company keeps its past pace, slows to half, or stops growing</li>
            <li>Sales, gross profit, operating profit and net profit for up to 10 years</li>
            <li>Earnings per share, cash from operations, investment spending and spare cash each year</li>
            <li>The last few quarters, so you see the newest results first</li>
            <li>What the company owns and owes today: cash, debt, total assets and liabilities</li>
          </ul>
          <p class="members-cta"><a class="pill-gold" href="/membership">Become a member</a> <a href="/#join">Already a member? Sign in</a></p>
        </div>
      </section>

      ${adSlot('in-content')}

      ${isForumEnabled() ? `<section class="block">
        <a class="forum-cta" href="/forum/stocks?ticker=${encodeURIComponent(ticker)}">
          <strong>Questions about ${esc(name)}?</strong>
          <span>See what other investors are asking about ${esc(ticker)} in the forum, or ask your own.</span>
        </a>
      </section>` : ''}

      ${newsHtml}

      ${(company.announcements || []).length ? `<section class="block">
        <div class="block-head"><div><h2>Official announcements</h2><p>What ${esc(name)} has formally told investors recently, in its own filings with the US Securities and Exchange Commission.</p></div></div>
        <ul class="nw-list">${company.announcements.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.what)}</a><span>Form 8-K · ${esc(new Date(`${a.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))}</span></li>`).join('')}</ul>
      </section>` : ''}

      <section class="block">
        <div class="surface">
          <h2 style="font-size:22px;margin:0 0 8px">How we rate</h2>
          <ul class="plain-list">${RATING_RULES.map((rule) => `<li>${esc(rule)}</li>`).join('')}</ul>
        </div>
        ${related.length ? `<h2 style="font-size:22px;margin:24px 0 10px">${region ? `Other ${esc(region.name)} companies` : sector ? `Other large ${esc(sector.name.toLowerCase())} companies` : `Other ${esc(company.industry.toLowerCase())} companies`}</h2>
        <div class="stock-list">${related.map((c) => stockRow(c)).join('')}</div>` : ''}
        ${process.env.LOGO_DEV_KEY ? '<p class="helper-note">Company logos provided by <a href="https://logo.dev" target="_blank" rel="noopener">Logo.dev</a>. Logos belong to their companies and are shown only to identify them.</p>' : ''}
        <p class="note-box">This report card describes the business using its official figures. It is not a recommendation to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      ${adSlot('partner-box')}
      <script src="/members.js" defer></script>`;
  return { status: 200, html: pageShell({ head, body, active: 'markets' }) };
}

/* ── "What if" growth scenarios (members) ─────────────────────────────
   Pure arithmetic on the company's own past figures — NOT a forecast.
   Growth rate = average yearly growth over up to 5 years (compound),
   kept between −20% and +30% a year so one odd year can't run away. */
function cagr(series, maxYears = 5) {
  const rows = (series || []).filter((r) => Number.isFinite(r.value));
  if (rows.length < 3) return null;
  const last = rows.at(-1);
  const first = rows[Math.max(0, rows.length - 1 - maxYears)];
  const years = last.year - first.year;
  if (years < 2 || first.value <= 0 || last.value <= 0) return null;
  return { rate: Math.pow(last.value / first.value, 1 / years) - 1, years, base: last.value, baseYear: last.year };
}

export function whatIfScenarios(company) {
  const make = (label, series, kind) => {
    const g = cagr(series);
    if (!g) return { label, kind, available: false };
    const rate = Math.min(Math.max(g.rate, -0.2), 0.3);
    const project = (r) => [1, 3, 5].map((n) => ({ years: n, value: g.base * Math.pow(1 + r, n) }));
    return {
      label, kind, available: true, pastRate: g.rate, usedRate: rate, overYears: g.years, base: g.base, baseYear: g.baseYear,
      cases: [
        { name: 'Keeps its past pace', rate, points: project(rate) },
        { name: 'Grows at half the pace', rate: rate / 2, points: project(rate / 2) },
        { name: 'Stops growing', rate: 0, points: project(0) },
      ],
    };
  };
  return [
    make('Sales', company.revenue, 'money'),
    make('Profit', company.netIncome, 'money'),
    make('Earnings per share', company.eps, 'perShare'),
    make('Dividend per share', company.dividendsPerShare, 'perShare'),
  ];
}

/* ── Members-only numbers (served by /api/stock/details) ─────────────── */
export async function stockDetailsFor(rawTicker) {
  const company = await getCompany(rawTicker);
  if (!company || company.notFound || company.busy) return null;
  const years = [...new Set([
    ...company.revenue, ...company.netIncome, ...(company.grossProfit || []), ...(company.operatingIncome || []),
    ...company.eps, ...company.operatingCashFlow, ...company.capex,
  ].map((r) => r.year))].sort((a, b) => a - b).slice(-10);
  const pick = (series, year) => (series || []).find((r) => r.year === year)?.value ?? null;
  const rows = years.map((year) => {
    const ocf = pick(company.operatingCashFlow, year);
    const capex = pick(company.capex, year);
    return {
      year,
      revenue: pick(company.revenue, year),
      grossProfit: pick(company.grossProfit, year),
      operatingIncome: pick(company.operatingIncome, year),
      netIncome: pick(company.netIncome, year),
      eps: pick(company.eps, year),
      operatingCashFlow: ocf,
      capex,
      freeCashFlow: ocf !== null && capex !== null ? ocf - capex : null,
      dividendPerShare: pick(company.dividendsPerShare, year),
    };
  });
  return {
    ticker: company.ticker,
    name: nameOf(company),
    funds: await fundsForTicker(company.ticker),
    scenarios: whatIfScenarios(company),
    years: rows,
    quarters: company.quarters || { revenue: [], netIncome: [], eps: [] },
    balance: {
      asOf: company.balanceSheetAsOf,
      cash: company.cash,
      longTermDebt: company.longTermDebt,
      totalAssets: company.totalAssets ?? null,
      totalLiabilities: company.totalLiabilities ?? null,
      equity: company.equity,
      sharesOutstanding: company.sharesOutstanding,
    },
    source: company.foreignFiler
      ? `${nameOf(company)} yearly reports (Form 20-F) filed with the US SEC${company.fx?.rate ? `, in US dollars at the European Central Bank rate of ${company.fx.date || 'the latest day'}` : ''}`
      : `${nameOf(company)} filings with the US SEC (10-K yearly, 10-Q quarterly)`,
    updatedAt: company.updatedAt,
  };
}

export async function stockSitemapEntries(origin) {
  const [{ companies, updatedAt }, extra] = await Promise.all([readCompanies(), readExtraCompanies()]);
  const day = (updatedAt || new Date().toISOString()).slice(0, 10);
  return [
    ...Object.keys(companies || {}).map((ticker) => ({ loc: `${origin}/stock/${encodeURIComponent(ticker)}`, lastmod: day, priority: '0.6' })),
    ...Object.values(extra).filter((c) => !companies?.[c.ticker]).map((c) => ({ loc: `${origin}/stock/${encodeURIComponent(c.ticker)}`, lastmod: String(c.updatedAt || day).slice(0, 10), priority: '0.4' })),
  ];
}
