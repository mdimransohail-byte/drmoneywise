/* ════════════════════════════════════════════════════════════════════════
   /technical and /technical/<TICKER> — the Chart check.
   Everyone: TradingView's live chart (with moving averages, RSI and MACD
   drawn on) and the headline reading of the chart. Regular and Premium:
   every signal, support and resistance, and our annotated chart, from
   /api/technical (public/technical.js). Linked to the Chart Readers course.
   ════════════════════════════════════════════════════════════════════════ */

import { getCompany, normaliseTicker } from './companyLookup.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { iframeWidget } from './marketPages.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const POPULAR = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'KO', 'JPM', 'XOM'];

function formHtml(t = '') {
  return `<form class="ta-form" onsubmit="var t=this.t.value.trim().toUpperCase();if(t){location.href='/technical/'+encodeURIComponent(t)}return false">
          <label for="taT">Company ticker</label><input id="taT" name="t" value="${esc(t)}" placeholder="e.g. AAPL" maxlength="10" required>
          <button class="pf-btn gold" type="submit">Check the chart</button>
          <span class="ta-pop">Try: ${POPULAR.map((p) => `<a href="/technical/${p}">${p}</a>`).join(' ')}</span>
        </form>`;
}

export async function renderTechnical(origin, raw = '') {
  const ticker = raw ? normaliseTicker(raw) : '';
  let company = null;
  if (ticker) {
    company = await getCompany(ticker);
    if (!company || company.notFound || !company.ticker) company = null;
  }
  const name = company ? String(company.displayName || company.name || ticker) : ticker;
  const head = buildHeadTags({
    title: ticker ? `${name} (${ticker}) technical analysis: chart, RSI, MACD and moving averages | Dr MoneyWise` : 'Chart check: simple technical analysis of any stock | Dr MoneyWise',
    description: ticker ? `What ${name}’s share price chart shows, explained simply: trend, moving averages, RSI, MACD, Bollinger bands, support and resistance.` : 'Enter any US-listed company to see what its price chart shows: trend, momentum, moving averages, RSI, MACD and support and resistance, explained simply.',
    canonical: `${origin}/technical${ticker ? `/${encodeURIComponent(ticker)}` : ''}`,
  });
  const { tvSymbol } = await import('./stockPages.js');
  const symbol = company ? tvSymbol(company) : ticker;
  const body = `
      <section class="block ta-page">
        <p class="crumbs"><a href="/tools">Tools</a> › Chart check${ticker ? ` › ${esc(ticker)}` : ''}</p>
        <div class="ta-hero"><div><span class="pf-badge free">Free</span> <span class="pf-badge mem">Full check: Members</span>
          <h1>${ticker ? `${esc(name)}: chart check` : 'Chart check'}</h1>
          <p>Technical analysis looks at a share’s price chart rather than the business: which way the trend is going, how strong the moves are, and where buyers and sellers have stepped in before. We explain each sign in plain English.</p></div>
          ${formHtml(ticker)}</div>
        ${ticker ? `
        <div class="ta-grid">
          <div class="ta-live"><h2>Live chart</h2>
            ${iframeWidget('embed-widget-advanced-chart.js', { autosize: true, symbol, interval: 'D', timezone: 'Etc/UTC', theme: 'light', style: '1', locale: 'en', allow_symbol_change: false, hide_side_toolbar: true, studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'], support_host: 'https://www.tradingview.com' }, 520)}
          </div>
          <div class="ta-read" id="taRead" data-ticker="${esc(ticker)}"><h2>What the chart shows</h2><p class="calc-hint">Reading the chart…</p></div>
        </div>
        <div id="taFull"></div>
        ${company ? `<p class="ta-links"><a href="/stock/${encodeURIComponent(ticker)}#healthCheck">${esc(name)}: Financial Health Check (the business itself) →</a></p>` : ''}` : `
        <div class="ta-intro">
          <div><h2>What you’ll see</h2><ul><li><b>Trend:</b> is the price above or below its 50- and 200-day averages?</li><li><b>Momentum:</b> RSI and MACD, and whether the move is speeding up or fading</li><li><b>Range:</b> where the price sits between its 52-week high and low</li><li><b>Levels:</b> support and resistance, where buyers and sellers stepped in before</li></ul></div>
          <div><h2>Learn to read charts</h2><p>Our <a href="/learn/technical">Chart Readers course</a> explains each idea step by step, with pictures: candlesticks, trends, moving averages, RSI, MACD, chart patterns and how to manage risk.</p></div>
        </div>`}
        <p class="note-box">A chart shows where a price has been, not where it will go. Technical signals are often wrong, and this is not advice to buy or sell. Prices from Marketstack (end of day) and TradingView (live chart, may be delayed). Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      ${ticker ? '<script src="/technical.js" defer></script>' : ''}`;
  return pageShell({ head, body, active: 'tools' });
}
