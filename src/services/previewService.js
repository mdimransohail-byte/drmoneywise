/* ════════════════════════════════════════════════════════════════════════
   INFOGRAPHIC PREVIEW + DATA CHECK — /preview/infographics?ticker=KO
   ───────────────────────────────────────────────────────────────────────
   A behind-the-scenes page (hidden from Google) for checking that the
   data engine and the infographic maker work on real data, and for
   spot-checking a company's numbers against its annual report.
   ════════════════════════════════════════════════════════════════════════ */

import { readCompanies, readEconomy, readPrices } from './dataEngine.js';
import { buildReportCard, formatMoney, formatPercent, RATING_RULES } from './reportCardService.js';
import { economyTilesHtml as economyTiles, rankingBarsHtml as rankingBars, reportCardHtml as reportCard, yearBarsHtml as yearBars } from './infographicService.js';
import { pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

export async function renderInfographicPreview(requestedTicker) {
  const [{ companies, updatedAt }, economy, { prices }] = await Promise.all([readCompanies(), readEconomy(), readPrices()]);
  const tickers = Object.keys(companies || {}).sort();
  const ticker = (requestedTicker || 'KO').toUpperCase();
  const company = companies?.[ticker];
  const secSource = `Source: company annual reports filed with the US SEC${updatedAt ? `, checked ${updatedAt.slice(0, 10)}` : ''}`;

  let companyBlock = `<p class="empty-note">No data for ${esc(ticker)} yet. Run "Company financials" in Admin first.</p>`;
  if (company) {
    const ratings = buildReportCard(company);
    const price = prices?.[ticker]?.price;
    const dps = company.derived?.latestDividendPerShare;
    const yieldText = price && dps ? formatPercent(dps / price) : '— (no price yet)';
    const rows = [
      ['Financial year ending', company.latestFiscalYearEnd || '—'],
      ['Sales (latest year)', formatMoney(company.revenue.at(-1)?.value)],
      ['Profit (latest year)', formatMoney(company.netIncome.at(-1)?.value)],
      ['Earnings per share', company.eps.at(-1) ? `$${company.eps.at(-1).value.toFixed(2)}` : '—'],
      ['Dividend per share', dps ? `$${dps.toFixed(2)}` : '—'],
      ['Years of dividend raises', company.derived?.yearsOfDividendRaises ?? '—'],
      ['Long-term debt', formatMoney(company.longTermDebt)],
      ['Cash', formatMoney(company.cash)],
      ['Shares in issue', company.sharesOutstanding ? `${(company.sharesOutstanding / 1e9).toFixed(2)} billion` : '—'],
      ['Price (last close)', price ? `$${price.toFixed(2)} on ${String(prices[ticker].date).slice(0, 10)}` : '— (prices not fetched)'],
      ['Dividend yield', yieldText],
    ];
    companyBlock = `
      ${reportCard({ title: `${company.name} (${ticker})`, subtitle: 'Report card — five plain-English checks', ratings, source: secSource })}
      
      ${yearBars({ title: 'Sales each year', subtitle: 'Money coming in from customers', series: company.revenue, format: (v) => formatMoney(v).replace(' billion', 'bn').replace(' trillion', 'tn').replace(' million', 'm'), source: secSource })}
      ${company.dividendsPerShare.length ? `${yearBars({ title: 'Dividend per share each year', subtitle: 'Cash paid to shareholders for each share they own', series: company.dividendsPerShare, format: (v) => `$${v.toFixed(2)}`, source: secSource })}` : ''}
      <h3 style="margin:28px 0 8px">Numbers to spot-check against the annual report</h3>
      <table style="border-collapse:collapse;width:100%;max-width:720px;background:#fff;border:1px solid var(--line);border-radius:12px">
        ${rows.map(([k, v]) => `<tr><td style="padding:8px 14px;border-bottom:1px solid var(--line);color:var(--ink-2)">${esc(k)}</td><td style="padding:8px 14px;border-bottom:1px solid var(--line);font-weight:600;text-align:right">${esc(v)}</td></tr>`).join('')}
      </table>
      <p class="helper-note">Data used: ${esc(Object.values(company.sourceConcepts || {}).filter(Boolean).join(', '))}</p>`;
  }

  const raisers = Object.values(companies || {})
    .filter((c) => (c.derived?.yearsOfDividendRaises || 0) >= 5)
    .sort((a, b) => (b.derived.yearsOfDividendRaises - a.derived.yearsOfDividendRaises) || a.ticker.localeCompare(b.ticker))
    .slice(0, 10);
  const ranking = raisers.length
    ? rankingBars({
      title: 'Longest runs of dividend raises',
      subtitle: 'Years in a row the yearly dividend per share went up (filings since 2009)',
      rows: raisers.map((c) => ({ label: c.ticker, sublabel: c.name, value: c.derived.yearsOfDividendRaises, display: `${c.derived.yearsOfDividendRaises} yrs` })),
      source: secSource,
    })
    : '<p class="empty-note">No dividend data yet.</p>';

  const figs = Object.values(economy.figures || {});
  const econ = figs.length
    ? economyTiles({ title: 'The economy at a glance', figures: figs, source: `Sources: BLS, New York Fed, US Treasury, Freddie Mac${economy.updatedAt ? `, checked ${economy.updatedAt.slice(0, 10)}` : ''}` })
    : '<p class="empty-note">No economy data yet.</p>';

  const head = '<title>Infographic preview | Dr MoneyWise</title>\n    <meta name="robots" content="noindex, nofollow" />';
  const body = `
      <section class="block">
        <div class="block-head"><div><h1 style="font-size:34px;margin:0">Infographic preview</h1>
          <p>Drawn by code from the saved data. ${tickers.length} companies available.</p></div></div>
        <form method="get" action="/preview/infographics" class="inline-form" style="max-width:520px;margin-bottom:24px">
          <label class="sr-only" for="pv">Ticker</label>
          <select id="pv" name="ticker" class="input">${tickers.map((t) => `<option ${t === ticker ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <button class="button primary" type="submit">Show</button>
        </form>
        ${companyBlock}
        
        ${ranking}
        
        ${econ}
        <h3 style="margin:28px 0 8px">How the report card rates</h3>
        <ul class="plain-list">${RATING_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </section>`;
  return pageShell({ head, body, active: '' });
}
