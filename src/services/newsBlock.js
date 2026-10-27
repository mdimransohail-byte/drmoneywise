/* ════════════════════════════════════════════════════════════════════════
   The "In the news" box used on stock, ETF, commodity, bond and property
   pages: a short "What the headlines say" summary and 3–5 recent articles
   from free news sites, each linking to the original.
   If a page has no saved headlines yet, they are fetched in the background
   and TradingView's free news feed is shown meanwhile (never an empty box).
   ════════════════════════════════════════════════════════════════════════ */

import { queueNews, readNews } from './newsLinksService.js';
import { worldRegion } from '../data/worldStocks.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

function ago(iso) {
  if (!iso) return '';
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SITE_NAMES = {
  'reuters.com': 'Reuters', 'apnews.com': 'AP News', 'bloomberg.com': 'Bloomberg', 'cnbc.com': 'CNBC', 'ft.com': 'Financial Times',
  'wsj.com': 'The Wall Street Journal', 'marketwatch.com': 'MarketWatch', 'barrons.com': 'Barron’s', 'fool.com': 'The Motley Fool',
  'fool.co.uk': 'The Motley Fool UK', 'morningstar.com': 'Morningstar', 'finance.yahoo.com': 'Yahoo Finance', 'yahoo.com': 'Yahoo',
  'investing.com': 'Investing.com', 'kitco.com': 'Kitco', 'mining.com': 'MINING.COM', 'oilprice.com': 'OilPrice.com', 'forbes.com': 'Forbes',
  'businessinsider.com': 'Business Insider', 'theguardian.com': 'The Guardian', 'bbc.co.uk': 'BBC', 'bbc.com': 'BBC', 'nasdaq.com': 'Nasdaq',
  'seekingalpha.com': 'Seeking Alpha', 'zacks.com': 'Zacks', 'tipranks.com': 'TipRanks', 'stockinvest.us': 'StockInvest.us', 'benzinga.com': 'Benzinga',
  'thestreet.com': 'TheStreet', 'livemint.com': 'Mint', 'economictimes.indiatimes.com': 'The Economic Times', 'moneycontrol.com': 'Moneycontrol',
  'thenationalnews.com': 'The National', 'gulfnews.com': 'Gulf News', 'khaleejtimes.com': 'Khaleej Times', 'arabianbusiness.com': 'Arabian Business',
  'scmp.com': 'South China Morning Post', 'straitstimes.com': 'The Straits Times', 'bangkokpost.com': 'Bangkok Post', 'prnewswire.com': 'PR Newswire (company release)',
  'globenewswire.com': 'GlobeNewswire (company release)', 'businesswire.com': 'Business Wire (company release)',
};
const siteName = (d) => SITE_NAMES[d] || SITE_NAMES[Object.keys(SITE_NAMES).find((k) => d.endsWith(`.${k}`))] || d;

/* ── "More news on other sites": plain links to each site's own page or
   search for this subject (linking only — nothing is copied). ───────── */
const gnews = (q) => `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=en`;
const PROPERTY_SITES = {
  dubai: [['Gulf News: Property', 'https://gulfnews.com/business/property']],
  'united-kingdom': [['The Guardian: Property', 'https://www.theguardian.com/money/property']],
  thailand: [['Bangkok Post: Property', 'https://www.bangkokpost.com/property']],
  singapore: [['The Straits Times: Housing', 'https://www.straitstimes.com/singapore/housing']],
  'united-states': [['Realtor.com News', 'https://www.realtor.com/news/']],
};
const METALS = ['gold', 'silver', 'platinum'];
const ENERGY = ['crude-oil', 'natural-gas'];
function moreLinks(kind, id, words) {
  if (kind === 'stock' || kind === 'etf') {
    const t = String(id).toUpperCase();
    const lower = t.toLowerCase().replace('.', '-');
    return [
      ['Yahoo Finance', `https://finance.yahoo.com/quote/${encodeURIComponent(t.replace('.', '-'))}/news/`],
      ['Nasdaq', `https://www.nasdaq.com/market-activity/${kind === 'etf' ? 'etf' : 'stocks'}/${lower}/news-headlines`],
      ...(kind === 'stock' ? [['MarketWatch', `https://www.marketwatch.com/investing/stock/${lower}`], ['TipRanks', `https://www.tipranks.com/stocks/${lower}/stock-news`], ['StockInvest.us', `https://stockinvest.us/stock/${encodeURIComponent(t.replace('.', '-'))}`]] : []),
      ['Google News', gnews(`${words} ${kind === 'etf' ? 'ETF' : 'stock'}`)],
    ];
  }
  if (kind === 'commodity') {
    return [
      ['Google News', gnews(words)],
      ...(METALS.includes(id) ? [['Kitco News', 'https://www.kitco.com/news/']] : []),
      ...(ENERGY.includes(id) ? [['OilPrice.com', 'https://oilprice.com/']] : []),
      ['Reuters: Commodities', 'https://www.reuters.com/markets/commodities/'],
    ];
  }
  if (kind === 'region') {
    const reuters = { uk: 'europe', japan: 'asia', china: 'asia', india: 'asia', 'south-korea': 'asia' }[id];
    return [['Google News', gnews(words)], ...(reuters ? [[`Reuters: ${reuters === 'asia' ? 'Asian' : 'European'} markets`, `https://www.reuters.com/markets/${reuters}/`]] : [['Reuters: Markets', 'https://www.reuters.com/markets/']])];
  }
  if (kind === 'localstock') {
    const [regionId, slug] = String(id).split('--');
    const co = worldRegion(regionId)?.local.find((x) => x.slug === slug);
    const [ex, sym] = String(co?.symbol || '').split(':');
    return [['Google News', gnews(`${words} shares`)], ...(sym ? [['TradingView', `https://www.tradingview.com/symbols/${ex}-${encodeURIComponent(sym)}/news/`]] : [])];
  }
  if (kind === 'bond') return [['Google News', gnews(words)], ['Reuters: Rates and bonds', 'https://www.reuters.com/markets/rates-bonds/'], ['CNBC: Bonds', 'https://www.cnbc.com/bonds/']];
  if (kind === 'property') return [['Google News', gnews(words)], ...(PROPERTY_SITES[id] || [])];
  return [['Google News', gnews(words)]];
}

/**
 * kind: stock | etf | commodity | bond | property; id: ticker or slug.
 * opts.subject / opts.name help the background fetch when nothing is saved;
 * opts.search is the wording for the "More news" search links.
 */
export async function newsBlockHtml(kind, id, { title = 'In the news', subject = '', name = '', search = '' } = {}) {
  const saved = await readNews(kind, id);
  const age = saved ? Date.now() - new Date(saved.fetchedAt).getTime() : Infinity;
  const stale = !saved || age > 24 * 60 * 60 * 1000 || (saved.thin && age > 3 * 60 * 60 * 1000);
  if (stale) queueNews(kind, id, { subject, name });
  const items = (saved?.items || []).slice(0, 6);
  const words = search || subject || name || id;
  const links = moreLinks(kind, id, words);
  const more = `
        <div class="nw-more"><span>More news about ${esc(words)} on:</span>${links.map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener nofollow">${esc(label)}</a>`).join('')}</div>`;
  const summary = items.length >= 3 && saved.summary?.text ? `
        <div class="nw-summary"><h3>What the headlines say</h3><p>${esc(saved.summary.text)}</p><span>Our short summary of the headlines below, ${esc(ago(saved.summary.at))}. Not advice.</span></div>` : '';
  const list = items.length ? `
        <ul class="nw-list">${items.map((x) => `
          <li><a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${esc(x.title)}</a><span>${esc(siteName(x.domain))}${x.date ? ` · ${esc(ago(x.date))}` : ''}</span></li>`).join('')}
        </ul>` : '';
  const intro = items.length
    ? 'Recent articles from news sites, newest first. Each link opens the original article.'
    : 'We are collecting the latest articles for this page; they appear here within a few hours. Meanwhile, these news sites cover it:';
  return `
      <section class="block nw-box">
        <div class="block-head"><div><h2>${esc(title)}</h2><p>${esc(intro)}</p></div></div>
        ${summary}
        ${list}
        ${more}
        ${items.length ? '<p class="nw-credit">Headlines found with <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener">the GDELT Project</a>. Articles belong to their publishers; we do not check or endorse them.</p>' : ''}
      </section>`;
}
