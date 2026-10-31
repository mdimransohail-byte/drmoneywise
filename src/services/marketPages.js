/* ════════════════════════════════════════════════════════════════════════
   MARKET PAGES — /today and /top-10/crypto
   ───────────────────────────────────────────────────────────────────────
   Live prices, the heatmap, the crypto table and the economic calendar are
   free TradingView widgets (they load in the visitor's browser, so they use
   none of our data allowance). TradingView's own credit link must stay
   visible under each widget — that is the condition of free use.
   Economy figures (official sources, see economyService.js) are built on
   the server so Google can read them. News comes from TradingView's free
   news widget unless a paid news plan is switched on (NEWS_API_PLAN=paid).
   ════════════════════════════════════════════════════════════════════════ */

import { CRYPTO_BASICS, CRYPTO_GUIDE, CRYPTO_REVIEWED_ON } from '../data/cryptoGuide.js';
import { readEconomy } from './dataEngine.js';
import { economyTilesHtml } from './infographicService.js';
import { ECONOMY_CREDITS } from './economyService.js';
import { getLiveHeadlines } from './newsService.js';
import { buildHeadTags, pageShell } from './seoService.js';
import { getPhoto, PAGE_PHOTO_QUERIES, photoFigure } from './imageService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/* ── TradingView widgets ─────────────────────────────────────────────── */
export function iframeWidget(script, config, height) {
  return `<div class="tv-box" style="height:${height}px">
          <div class="tradingview-widget-container" style="height:100%;width:100%">
            <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
            <div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Market data by TradingView</a></div>
            <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/${script}" async>
            ${JSON.stringify(config)}
            </script>
          </div>
        </div>`;
}

/** TradingView's free news feed (licensed for websites with its credit link). */
export function newsWidget(height = 520) {
  return iframeWidget('embed-widget-timeline.js', {
    feedMode: 'all_symbols', colorTheme: 'light', isTransparent: false,
    displayMode: 'regular', width: '100%', height: '100%', locale: 'en',
  }, height);
}

function tickerTape() {
  const symbols = [
    'FOREXCOM:SPXUSD', 'FOREXCOM:NSXUSD', 'FOREXCOM:DJI', 'TVC:GOLD', 'TVC:UKOIL', 'BITSTAMP:BTCUSD', 'FX_IDC:EURUSD',
  ];
  return `<div class="tv-tape">
          <script type="module" src="https://www.tradingview-widget.com/w/en/tv-ticker-tape.js"></script>
          <tv-ticker-tape symbols="${symbols.join(',')}"></tv-ticker-tape>
          <div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Prices by TradingView</a> · may be delayed</div>
        </div>`;
}

function stockHeatmap() {
  return iframeWidget('embed-widget-stock-heatmap.js', {
    exchanges: [],
    dataSource: 'SPX500',
    grouping: 'sector',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    locale: 'en',
    symbolUrl: '',
    colorTheme: 'light',
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '100%',
  }, 520);
}

function economicCalendar() {
  return iframeWidget('embed-widget-events.js', {
    colorTheme: 'light',
    isTransparent: false,
    width: '100%',
    height: '100%',
    locale: 'en',
    importanceFilter: '0,1',
    countryFilter: 'us,eu,gb,in,ae,cn,jp',
  }, 520);
}

function cryptoTable() {
  return iframeWidget('embed-widget-screener.js', {
    width: '100%',
    height: '100%',
    defaultColumn: 'overview',
    screener_type: 'crypto_mkt',
    displayCurrency: 'USD',
    colorTheme: 'light',
    locale: 'en',
    isTransparent: false,
  }, 560);
}

function readingAid(what, why, todo) {
  return `<dl class="reading-aid light">
          <div><dt>What is this?</dt><dd>${what}</dd></div>
          <div><dt>Why it matters</dt><dd>${why}</dd></div>
          <div><dt>What you can do</dt><dd>${todo}</dd></div>
        </dl>`;
}

function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Economy figures: plain meaning for each ─────────────────────────── */
export const ECONOMY_MEANING = {
  inflation: (v) => `Prices are about ${v.toFixed(1)}% higher than a year ago.`,
  interestRate: () => 'Sets the cost of loans and what savings earn.',
  tenYearYield: () => 'What the US government pays to borrow for 10 years.',
  mortgageRate: () => 'The typical rate on a new 30-year home loan.',
  unemployment: (v) => `About ${Math.round(v)} in every 100 workers are looking for a job.`,
};

export async function getEconomyFigures() {
  const economy = await readEconomy();
  const order = ['inflation', 'interestRate', 'mortgageRate', 'tenYearYield', 'unemployment'];
  return {
    updatedAt: economy.updatedAt,
    // Never show a figure that can't be a real percentage (see economyService)
    figures: order.map((key) => economy.figures?.[key]).filter((f) => f && f.value > -30 && f.value < 50),
  };
}

/* ── /today ──────────────────────────────────────────────────────────── */
export async function renderToday(origin) {
  const [{ figures, updatedAt }, news] = await Promise.all([
    getEconomyFigures(),
    getLiveHeadlines().catch(() => ({ items: [] })),
  ]);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const head = buildHeadTags({
    title: 'The economy today: inflation, interest rates, jobs and the week ahead | Dr MoneyWise',
    description: 'Today’s key economy figures (inflation, interest rates, bond yields, mortgage rates and jobs), what each one means for you, and the announcements coming up this week.',
    canonical: `${origin}/today`,
  });

  const items = (news.items || []).slice(0, 8);
  const stories = items.length
    ? `<div class="story-list">${items.map((item) => `
            <a href="${esc(item.url || '#')}" target="_blank" rel="noopener">
              <strong>${esc(item.title)}</strong>
              <span>${esc(item.source || 'Market news')}${item.publishedAt ? ` · ${formatWhen(item.publishedAt)}` : ''}</span>
            </a>`).join('')}</div>`
    : '<p class="empty-note">Today’s stories are loading. Please check back shortly.</p>';

  const economy = figures.length
    ? economyTilesHtml({
      title: 'The economy at a glance',
      figures: figures.map((fig) => ({ ...fig })),
      source: `Sources: US Bureau of Labor Statistics, New York Fed, US Treasury, Freddie Mac${updatedAt ? `; retrieved ${updatedAt.slice(0, 10)}` : ''}. Credits below.`,
    })
    : '';
  const credits = `<details class="credits"><summary>Data sources and credits</summary><ul>${ECONOMY_CREDITS.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>`;
  const meanings = figures.length
    ? `<ul class="plain-list">${figures.map((fig) => `<li><strong>${esc(fig.label)}:</strong> ${esc(ECONOMY_MEANING[fig.key]?.(fig.value) || '')}</li>`).join('')}</ul>`
    : '';

  const photo = await getPhoto('page:today', PAGE_PHOTO_QUERIES.today);
  const body = `
      <section class="block">
        ${photoFigure(photo, 'Stock market screen', 'page-photo wide')}
        <p class="dateline-dark">${esc(today)}</p>
        <h1 style="font-size:38px;margin:0 0 10px">The economy today</h1>
        <p class="lede-dark">The figures that shape your savings and loans, what each one means, and what is coming up this week. For the latest news and the market heat map, see the <a href="/">home page</a>.</p>
        ${readingAid(
          'A quick look at how shares, gold, oil and Bitcoin are moving, plus the numbers that shape the economy.',
          'Daily moves feel dramatic but usually even out. The economy figures (prices, interest rates, jobs) matter more for your savings and loans.',
          'Most days, nothing. If you invest for the long term, a single day rarely changes the plan.',
        )}
      </section>

      <section class="block">
        ${economy}
        ${meanings}
        <div id="credits">${figures.length ? credits : ''}</div>
      </section>

      <section class="block">
        <div class="block-head"><div><h2>Coming up this week</h2>
          <p>Scheduled announcements that can move markets, such as jobs figures, inflation reports and central bank decisions.</p></div></div>
        ${economicCalendar()}
        <p class="note-box">Prices and charts are provided by TradingView and may be delayed. This page is for learning, not advice. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'markets' });
}

/* ── /top-10/crypto ──────────────────────────────────────────────────── */
export async function renderCryptoTop10(origin) {
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const head = buildHeadTags({
    title: `Top 10 Crypto by Size — ${month}, explained simply | Dr MoneyWise`,
    description: 'The largest cryptocurrencies by total value, with live prices and a plain-English note on what each coin is and how risky it is.',
    canonical: `${origin}/top-10/crypto`,
  });
  const cards = CRYPTO_GUIDE.map((coin) => `
          <li class="pick">
            <div class="pick-head">
              <span class="pick-rank coin">${esc(coin.symbol)}</span>
              <div><h3>${esc(coin.name)}</h3><p class="pick-kind">${esc(coin.what)}</p></div>
            </div>
            <p><strong>Used for:</strong> ${esc(coin.usedFor)}</p>
            <p class="pick-safety"><span class="risk-meter ${coin.type === 'stablecoin' ? 'mid' : 'high'}">Risk: ${esc(coin.risk)}</span></p>
          </li>`).join('');

  const photo = await getPhoto('page:top10-crypto', PAGE_PHOTO_QUERIES['top10-crypto']);
  const body = `
      <section class="block">
        ${photoFigure(photo, 'A Bitcoin coin', 'page-photo wide')}
        <p class="dateline-dark">Top 10 · ${esc(month)}</p>
        <h1 style="font-size:38px;margin:0 0 10px">Top 10 crypto by size</h1>
        <p class="lede-dark">The biggest cryptocurrencies, ranked live by their total value (price × number of coins).</p>
        <p class="note-box warn" style="margin:0 0 20px"><strong>High risk.</strong> Crypto prices can fall by half or more in a few months, and there is no deposit protection. Only put in money you could afford to lose completely.</p>
        ${readingAid(
          'Cryptocurrencies are digital money and tokens that live on computer networks rather than in banks.',
          'Being big does not make a coin safe. Even the largest have lost over 70% of their value in past downturns.',
          'Learn how each coin works before buying any. Many people keep crypto to a small slice of their savings, if any.',
        )}
        <h2 style="font-size:24px;margin:24px 0 8px">Live ranking</h2>
        <p class="helper-note" style="margin:0 0 10px">Sorted by total value (“market cap”). Live data from TradingView, may be delayed.</p>
        ${cryptoTable()}
      </section>

      <section class="block">
        <div class="block-head"><div><h2>What the biggest coins are</h2>
          <p>Plain-English notes on the coins usually found at the top of the list (reviewed ${esc(new Date(CRYPTO_REVIEWED_ON).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}).</p></div></div>
        <ol class="picks">${cards}</ol>
      </section>

      <section class="block">
        <div class="surface">
          <h2 style="font-size:22px;margin:0 0 8px">Before you buy any crypto</h2>
          <ul class="plain-list">${CRYPTO_BASICS.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
        </div>
        <p class="note-box">This page is for learning, not a recommendation to buy. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'top10' });
}

/* ── Homepage "Markets today" box: economy figures with meanings ───── */
export async function renderHomePulse() {
  const { figures, updatedAt } = await getEconomyFigures();
  const show = figures.filter((fig) => ['inflation', 'interestRate', 'mortgageRate', 'unemployment'].includes(fig.key));
  if (!show.length) return null;
  const rows = show.map((fig) => {
    const value = `${fig.value.toFixed(fig.kind === 'yoy' ? 1 : 2)}${fig.unit}`;
    const diff = fig.previous === null || fig.previous === undefined ? 0 : fig.value - fig.previous;
    const same = fig.previous === null || fig.previous === undefined || fig.previous.toFixed(fig.kind === 'yoy' ? 1 : 2) === fig.value.toFixed(fig.kind === 'yoy' ? 1 : 2);
    const arrow = same ? '●' : diff > 0 ? '▲' : '▼';
    return `<div class="pulse-row"><span class="pulse-name">${esc(fig.label)}</span><span class="pulse-move flat">${arrow} ${esc(value)}</span><span class="pulse-plain">${esc(ECONOMY_MEANING[fig.key]?.(fig.value) || '')}</span></div>`;
  }).join('');
  return `${rows}
            <div class="pulse-foot">Sources: BLS, New York Fed, Freddie Mac${updatedAt ? `, retrieved ${esc(updatedAt.slice(0, 10))}` : ''}. <a href="/today#credits">Credits</a> · <a href="/today">The economy today</a></div>`;
}
