/* ════════════════════════════════════════════════════════════════════════
   TOP 10 PAGES — /top-10, /top-10/dividend-stocks, /top-10/etfs
   Built on the server (readable by Google). Every list shows its ranking
   rule, the date, its sources, and a "not advice" note.
   ════════════════════════════════════════════════════════════════════════ */

import { formatPercent } from './reportCardService.js';
import { rankingBarsHtml } from './infographicService.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { DIVIDEND_RULE, getDividendTop10, getEtfTop10, monthLabel } from './top10Service.js';

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
    title: 'Top 10 lists — dividend stocks, ETFs and crypto | Dr MoneyWise',
    description: 'Simple Top 10 lists for everyday investors, each with the ranking rule shown: dividend stocks, beginner ETFs and the largest cryptocurrencies.',
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
  const body = `
      <section class="block">
        <div class="block-head"><div><h1 style="font-size:36px;margin:0">Top 10 lists</h1>
          <p>Each list shows exactly how it's ranked. They are a starting point for learning, not a shopping list.</p></div></div>
        <div class="tens">
          ${card('/top-10/dividend-stocks', 'Dividend stocks', 'Companies that raised their payout 10+ years in a row.', top ? `This month's number 1: ${esc(top.name)} (${esc(top.ticker)}).` : '')}
          ${card('/top-10/etfs', 'ETFs for beginners', 'Simple, broad funds, ranked by lowest yearly fee.', `Cheapest: ${esc(etf.rows[0].ticker)} at $${etf.rows[0].feePer1000.toFixed(2)} a year per $1,000.`)}
          <a class="ten hub crypto" href="/top-10/crypto"><h2>Crypto by size</h2><p class="rule">The 10 largest coins by total value, live.</p><span class="risk-note">High risk: prices can halve in months</span><p class="meaning">What each coin is, in plain English, with a risk note.</p><span class="go">See the list</span></a>
        </div>
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
  const infographic = list.rows.length
    ? rankingBarsHtml({
      title: byYield ? 'Dividend yield' : 'Years of dividend raises',
      subtitle: byYield ? 'Yearly dividend as a share of today’s price' : 'Years in a row the dividend went up',
      rows: list.rows.map((row) => ({
        label: row.ticker,
        sublabel: row.name,
        value: byYield ? row.yield : row.years,
        display: byYield ? formatPercent(row.yield) : `${row.years} yrs`,
      })),
      source: `Source: SEC filings${list.pricesAsOf ? '; prices from Marketstack' : ''}. List for ${month}.`,
    })
    : '';

  const items = list.rows.map((row, i) => `
          <li class="pick">
            <div class="pick-head">
              <span class="pick-rank">${i + 1}</span>
              <div><h3>${esc(row.name)} <span class="pick-ticker">${esc(row.ticker)}</span></h3>
              ${row.industry ? `<p class="pick-kind">${esc(row.industry)}</p>` : ''}</div>
            </div>
            <dl class="pick-facts">
              ${byYield ? `<div><dt>Dividend yield</dt><dd>${formatPercent(row.yield)}</dd></div>
              <div><dt>Yearly income per $1,000</dt><dd>about $${row.incomePer1000}</dd></div>` : ''}
              <div><dt>Dividend per share</dt><dd>$${row.dividendPerShare.toFixed(2)} a year</dd></div>
              <div><dt>Raised</dt><dd>${years(row)} in a row</dd></div>
            </dl>
            <p class="pick-safety"><span class="ig-grade ${row.safety.grade}">${GRADE_ICON[row.safety.grade]} ${row.safety.text}</span> ${esc(row.safety.plain)}${row.cashCovered === false ? ' Last year its dividends were bigger than its spare cash.' : ''}</p>
          </li>`).join('');

  const body = `
      <section class="block">
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
    description: 'Ten simple, broad ETFs for new investors, ranked by lowest yearly fee, with what each one holds explained in plain English.',
    canonical: `${origin}/top-10/etfs`,
  });
  const infographic = rankingBarsHtml({
    title: 'Yearly fee for every $1,000 invested',
    subtitle: 'Lower fees leave more of your money growing',
    rows: etf.rows.map((row) => ({ label: row.ticker, sublabel: row.kind, value: row.feePer1000, display: `$${row.feePer1000.toFixed(2)}` })),
    source: etf.source,
  });
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

  const body = `
      <section class="block">
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
        <div class="surface" style="margin-top:24px">
          <h2 style="font-size:22px;margin:0 0 8px">How we rank</h2>
          <p>We picked ten widely held, low-cost funds that cover the main building blocks (US shares, world shares, bonds, dividends, gold and property) and ranked them by their yearly fee, lowest first. Where fees are equal, they are listed alphabetically.</p>
          <p class="helper-note">${esc(etf.source)}.</p>
        </div>
        ${notAdvice('Fund prices go down as well as up. ')}
      </section>`;
  return pageShell({ head, body, active: 'top10' });
}
