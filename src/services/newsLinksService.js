/* ════════════════════════════════════════════════════════════════════════
   "IN THE NEWS" — recent free articles about each stock, ETF, commodity,
   bond market and property market, with a short plain-English summary.
   ───────────────────────────────────────────────────────────────────────
   Headlines: the GDELT Project's free news index (gdeltproject.org), which
   lists articles from thousands of news sites. Its terms allow any use,
   including commercial, with a citation and link to GDELT (shown under
   each list). We only show each article's headline, the site's name and a
   link to the original — readers read the article on the publisher's own
   site (Motley Fool, Reuters, CNBC, Kitco, MarketWatch and others).
     https://api.gdeltproject.org/api/v2/doc/doc?query=…&mode=artlist&format=json
   GDELT asks for no more than one request every 5 seconds, so requests
   wait their turn.

   Summary: "What the headlines say" — 2–3 sentences written by our writing
   service from the headlines only (never copied from the articles), checked
   for banned words, and refreshed at most once a day per page when the
   headlines change. No writing key saved = links only.

   Saved under data/market/news/. The data engine refreshes every page's
   links twice a day; pages not in the lists (looked-up companies or ETFs)
   are fetched in the background the first time someone opens them.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const UA = { 'User-Agent': 'Dr MoneyWise (hello@drmoneywise.com)' };
const DIR = path.join(process.cwd(), 'data', 'market', 'news');
const HOUR = 60 * 60 * 1000;
const FRESH = 11 * HOUR;
const SUMMARY_EVERY = 22 * HOUR;
// GDELT allows one request every 5 seconds per internet address. Railway
// servers share addresses with other sites, so we go slower (one every 12
// seconds) and, after a "please slow down" reply, everyone waits 2 minutes.
const GAP_MS = 12000;
const COOL_OFF_MS = 120000;
let pauseUntil = 0;

export const NEWS_CREDIT = 'Headlines found with the GDELT Project (gdeltproject.org). Each link opens the original article on the publisher’s site.';

/* ── Which sites rank first, and which are left out ───────────────── */
const TRUSTED = [
  'reuters.com', 'apnews.com', 'bloomberg.com', 'cnbc.com', 'ft.com', 'wsj.com', 'marketwatch.com', 'barrons.com',
  'fool.com', 'fool.co.uk', 'morningstar.com', 'morningstar.co.uk', 'finance.yahoo.com', 'yahoo.com', 'investing.com',
  'kitco.com', 'mining.com', 'oilprice.com', 'forbes.com', 'businessinsider.com', 'theguardian.com', 'bbc.co.uk', 'bbc.com',
  'economist.com', 'nasdaq.com', 'seekingalpha.com', 'zacks.com', 'tipranks.com', 'stockinvest.us', 'benzinga.com',
  'thestreet.com', 'investopedia.com', 'fxstreet.com', 'livemint.com', 'economictimes.indiatimes.com', 'business-standard.com',
  'moneycontrol.com', 'thehindubusinessline.com', 'thenationalnews.com', 'gulfnews.com', 'khaleejtimes.com', 'arabianbusiness.com',
  'zawya.com', 'scmp.com', 'straitstimes.com', 'businesstimes.com.sg', 'bangkokpost.com', 'nationthailand.com', 'abc.net.au',
  'afr.com', 'smh.com.au', 'cbc.ca', 'theglobeandmail.com', 'financialpost.com', 'asia.nikkei.com', 'japantimes.co.jp',
  'euronews.com', 'dw.com', 'cnn.com', 'nytimes.com', 'washingtonpost.com', 'axios.com', 'fortune.com', 'kiplinger.com',
  'thisismoney.co.uk', 'telegraph.co.uk', 'independent.co.uk', 'cityam.com', 'housingwire.com', 'realtor.com', 'inman.com',
  'spglobal.com', 'agweb.com', 'foodnavigator.com', 'fastmarkets.com', 'argusmedia.com', 'naturalgasintel.com', 'eia.gov',
  'federalreserve.gov', 'treasury.gov', 'imf.org', 'worldbank.org', 'bankofengland.co.uk', 'ecb.europa.eu', 'rbi.org.in',
];
const PRESS = ['prnewswire.com', 'globenewswire.com', 'businesswire.com', 'accessnewswire.com', 'newsfilecorp.com'];
const BLOCKED = [/(^|\.)[a-z]+telegraph\.com$/u, /einpresswire\.com$/u, /openpr\.com$/u, /prlog\.org$/u, /newsbreak\.com$/u, /dailypolitical\.com$/u, /tickerreport\.com$/u, /thelincolnianonline\.com$/u, /themarketsdaily\.com$/u, /etfdailynews\.com$/u, /wkrb13\.com$/u, /modernreaders\.com$/u, /thecerbatgem\.com$/u, /theenterpriseleader\.com$/u, /americanbankingnews\.com$/u, /zolmax\.com$/u, /tickerreport\.com$/u];
const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./u, ''); } catch { return ''; } };
const isTrusted = (d) => TRUSTED.some((t) => d === t || d.endsWith(`.${t}`));
const isPress = (d) => PRESS.some((t) => d === t || d.endsWith(`.${t}`));
const isBlocked = (d) => BLOCKED.some((re) => re.test(d));

/** GDELT adds spaces before punctuation ("12 , 743", "Mt . Hamilton"). */
export function cleanTitle(t) {
  return String(t || '')
    .replace(/\s+([,.;:!?%)\]’'])/gu, '$1')
    .replace(/([(\[$£€‘])\s+/gu, '$1')
    .replace(/(\d), (\d{3})\b/gu, '$1,$2')
    .replace(/\s+'\s*s\b/gu, "'s")
    .replace(/\s{2,}/gu, ' ')
    .trim();
}

/* ── Queries for each page ────────────────────────────────────────── */
const COMMODITY_Q = {
  gold: '("gold price" OR "gold prices")', silver: '("silver price" OR "silver prices")', platinum: '("platinum price" OR "platinum prices" OR "platinum market")',
  copper: '("copper price" OR "copper prices")', aluminium: '("aluminium price" OR "aluminum price" OR "aluminium prices" OR "aluminum prices")',
  nickel: '("nickel price" OR "nickel prices" OR "nickel market")', zinc: '("zinc price" OR "zinc prices" OR "zinc market")',
  'iron-ore': '("iron ore price" OR "iron ore prices" OR "iron ore futures")', 'crude-oil': '("oil prices" OR "Brent crude")',
  'natural-gas': '("natural gas prices" OR "Henry Hub")', coffee: '("coffee prices" OR "arabica coffee" OR "coffee futures")',
  cocoa: '("cocoa prices" OR "cocoa futures")', sugar: '("sugar prices" OR "sugar futures")', wheat: '("wheat prices" OR "wheat futures")',
  rice: '("rice prices" OR "rice exports")', 'palm-oil': '("palm oil prices" OR "palm oil futures")',
};
const BOND_Q = {
  'united-states': '("Treasury yields" OR "10-year Treasury")', 'united-kingdom': '("gilt yields" OR "UK gilts")',
  germany: '("Bund yields" OR "German bond yields" OR "German Bunds")', france: '("French bond yields" OR "French bonds" OR "OAT yields")',
  italy: '("Italian bond yields" OR "BTP yields" OR "Italian bonds")', japan: '("JGB yields" OR "Japanese government bond" OR "Japan bond yields")',
  india: '("India bond yields" OR "Indian bond yields" OR "Indian government bonds")', canada: '("Canadian bond yields" OR "Canada bond yields")',
  australia: '("Australian bond yields" OR "Australia bond yields")',
};
const PROPERTY_Q = {
  'united-states': '("US home prices" OR "US housing market" OR "mortgage rates")', 'united-kingdom': '("UK house prices" OR "UK housing market" OR "UK property market")',
  dubai: '("Dubai property" OR "Dubai real estate" OR "Dubai housing")', india: '("India real estate" OR "Indian real estate" OR "India housing")',
  thailand: '("Thailand property" OR "Thai property" OR "Bangkok property" OR "Thailand real estate")', singapore: '("Singapore property" OR "Singapore home prices" OR "Singapore housing")',
  australia: '("Australia house prices" OR "Australian property" OR "Australian housing")', canada: '("Canada housing market" OR "Canadian home prices" OR "Canada home sales")',
  spain: '("Spain property" OR "Spanish property" OR "Spain house prices" OR "Spanish housing")',
};
const ETF_Q = {
  VTI: '("total stock market" OR "VTI ETF")', VOO: '("S&P 500" (stocks OR index OR ETF))', SPY: '("S&P 500" (stocks OR index OR ETF))', SPYM: '("S&P 500" (stocks OR index OR ETF))',
  BND: '("bond ETF" OR "bond funds" OR "BND ETF")', VIG: '("dividend growth" OR "dividend stocks" OR "VIG ETF")', VYM: '("dividend stocks" OR "high dividend" OR "VYM ETF")',
  SCHD: '("SCHD" OR "dividend ETF")', VXUS: '("international stocks" OR "global stocks" OR "VXUS")', VT: '("global stocks" OR "world stocks" OR "VT ETF")',
  VEA: '("developed markets" (stocks OR ETF) OR "European stocks")', VWO: '("emerging markets" (stocks OR ETF))', GLDM: '("gold ETF" OR "gold price")',
  VNQ: '("REIT" OR "real estate stocks" OR "VNQ")', QQQM: '("Nasdaq 100" OR "Nasdaq-100" OR "tech stocks")', VUG: '("growth stocks" OR "VUG ETF")',
  VTV: '("value stocks" OR "VTV ETF")', VGT: '("tech stocks" OR "technology stocks" OR "VGT")', XLK: '("tech stocks" OR "technology sector" OR "XLK")',
  XLF: '("bank stocks" OR "financial stocks" OR "XLF")', XLE: '("energy stocks" OR "oil stocks" OR "XLE")',
};

/* Second try when the first search finds fewer than 3 articles (or GDELT
   has a hiccup): plain keywords instead of exact phrases, over 30 days. */
const COMMODITY_WIDE = {
  gold: 'gold (price OR prices OR ounce)', silver: 'silver (price OR prices OR ounce)', platinum: 'platinum (price OR prices OR demand OR supply)',
  copper: 'copper (price OR prices OR demand OR supply)', aluminium: '(aluminium OR aluminum) (price OR prices OR tariffs OR demand)',
  nickel: 'nickel (price OR prices OR Indonesia OR supply)', zinc: 'zinc (price OR prices OR smelter OR supply)', 'iron-ore': '"iron ore"',
  'crude-oil': '(oil OR crude) (prices OR OPEC OR Brent)', 'natural-gas': '"natural gas" (prices OR LNG OR supply)', coffee: 'coffee (prices OR beans OR harvest OR arabica)',
  cocoa: 'cocoa (prices OR harvest OR chocolate)', sugar: 'sugar (prices OR harvest OR cane)', wheat: 'wheat (prices OR harvest OR exports OR crop)',
  rice: 'rice (prices OR exports OR harvest)', 'palm-oil': '"palm oil"',
};
const BOND_WIDE = {
  'united-states': '(Treasury OR Treasuries) yields', 'united-kingdom': '(gilt OR gilts) yields', germany: 'German bonds yields', france: 'France bonds yields',
  italy: 'Italy bonds yields', japan: 'Japan bonds yields', india: 'India bonds yields', canada: 'Canada bonds yields', australia: 'Australia bonds yields',
};
const PROPERTY_WIDE = {
  'united-states': '(housing OR "home prices" OR "home sales") (US OR America)', 'united-kingdom': '(UK OR Britain) (housing OR "house prices" OR property OR rents)',
  dubai: 'Dubai (property OR "real estate" OR housing OR rents)', india: 'India (housing OR "real estate" OR property)',
  thailand: '(Thailand OR Bangkok) (property OR condominium OR housing OR "real estate")', singapore: 'Singapore (property OR housing OR condo OR HDB)',
  australia: 'Australia (housing OR "house prices" OR property OR rents)', canada: 'Canada (housing OR "home prices" OR "home sales" OR rents)',
  spain: '(Spain OR Spanish) (housing OR property OR "house prices" OR rents)',
};

const STRIP = /[,.]?\s+(inc|incorporated|corp|corporation|co|company|plc|ltd|limited|holdings?|group|the|class [a-z]|n\.?v\.?|s\.?a\.?|ag|se)\.?$/iu;
export function shortCompanyName(name) {
  let n = String(name || '').replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/u, '').replace(/&amp;/gu, '&').trim();
  for (let i = 0; i < 4; i += 1) n = n.replace(STRIP, '').replace(/\s*[&,]$/u, '').trim();
  return n;
}

/** The searches to try, in order: [query, days]. */
// Stocks by region: the market's own words first, then a wider search
const REGION_Q = {
  us: [['("Wall Street" OR "S&P 500" OR Nasdaq OR "Federal Reserve" OR "US economy")', 3], ['("Wall Street" OR "US economy")', 7]],
  europe: [['("Euro Stoxx" OR "European Central Bank" OR "eurozone economy" OR DAX OR "CAC 40")', 3], ['("European stocks" OR eurozone)', 7]],
  uk: [['("FTSE 100" OR "Bank of England" OR "UK economy" OR "London Stock Exchange")', 3], ['("FTSE 100" OR "UK economy")', 14]],
  japan: [['(Nikkei OR "Bank of Japan" OR "Japanese economy" OR TOPIX)', 3], ['(Nikkei OR "Japan economy")', 14]],
  china: [['("Hang Seng" OR "Shanghai Composite" OR "China economy" OR "Chinese economy" OR PBOC)', 3], ['("China stocks" OR "Chinese economy")', 14]],
  india: [['(Sensex OR Nifty OR "Reserve Bank of India" OR "Indian economy")', 3], ['(Sensex OR "Indian economy")', 14]],
  'south-korea': [['(KOSPI OR "Bank of Korea" OR "South Korean economy" OR "Korean stocks")', 3], ['(KOSPI OR "Korean economy")', 14]],
  brazil: [['(Ibovespa OR "Brazilian economy" OR "Brazil economy" OR "Banco Central do Brasil")', 3], ['(Ibovespa OR "Brazil economy")', 14]],
  gulf: [['(Tadawul OR "Saudi economy" OR "UAE economy" OR "Dubai Financial Market" OR "Abu Dhabi Securities Exchange" OR "Gulf stocks")', 3], ['("Saudi economy" OR "UAE economy" OR "Gulf stocks")', 14]],
};
/* Headline test for each region. GDELT matches words anywhere in an
   article, so many results only mention the place in passing. We keep a
   headline only if it names one of the region's markets or institutions,
   or names the place together with a business word. */
const BUSINESS_WORDS = /\b(econom\w*|market\w*|stocks?|shares?|equit\w*|bank\w*|profits?|earnings|revenue|sales|results|inflation|interest rates?|rates?|trade|tariffs?|exports?|imports?|invest\w*|growth|gdp|budget|tax\w*|currency|bonds?|yields?|ipo|listing|deal|merger|acquisition|oil|prices?|jobs|unemployment|jobless|startups?|companies|company|firms?|business\w*|industr\w*|factory|manufactur\w*|retail\w*|consumer\w*|property|housing|debt|funding|billion|million|dollar|euro|pound|yen|yuan|rupee|riyal|dirham)\b/iu;
const REGION_TITLE = {
  us: { market: /\b(wall street|s&p 500|nasdaq|dow jones|dow|federal reserve|the fed|fed's|powell|us treasur\w*|nyse)\b/iu, place: /(\bU\.S\.|\bUS\b|\bUnited States\b|\bAmerica\w*)/u },
  europe: { market: /\b(euro stoxx|stoxx|european central bank|ecb|eurozone|euro zone|dax|cac 40|ftse mib|ibex)\b/iu, place: /\b(europe\w*|eu|germany|german|france|french|italy|italian|spain|spanish|netherlands|dutch|eurozone)\b/iu },
  uk: { market: /\b(ftse|bank of england|boe|london stock exchange|lse-listed|gilts?|sterling|reeves|hmrc)\b/iu, place: /\b(uk|u\.k\.|britain|british|england|english|london|scotland)\b/iu },
  india: { market: /\b(sensex|nifty|reserve bank of india|rbi|sebi|bse|nse|dalal street|rupee)\b/iu, place: /\b(india|indian|mumbai|delhi|bengaluru|bangalore)\b/iu },
  china: { market: /\b(hang seng|shanghai composite|csi 300|pboc|people's bank of china|yuan|renminbi|shenzhen)\b/iu, place: /\b(china|chinese|beijing|shanghai|hong kong)\b/iu },
  japan: { market: /\b(nikkei|topix|bank of japan|boj|yen)\b/iu, place: /\b(japan|japanese|tokyo)\b/iu },
  'south-korea': { market: /\b(kospi|kosdaq|bank of korea|korean won|chaebol)\b/iu, place: /\b(south korea\w*|korean|korea's|seoul|samsung|hyundai|sk hynix)\b/iu },
  brazil: { market: /\b(ibovespa|bovespa|b3|banco central do brasil|brazilian real|petrobras|vale)\b/iu, place: /\b(brazil|brazilian|sao paulo|são paulo|lula)\b/iu },
  gulf: { market: /\b(tadawul|tasi|dfm|adx|aramco|adnoc|emaar|qatarenergy|riyal|dirham|sama)\b/iu, place: /\b(gulf|gcc|saudi\w*|uae|emirat\w*|dubai|abu dhabi|qatar\w*|kuwait\w*|bahrain\w*|oman\w*|riyadh|doha)\b/iu },
};

/** True if a headline is clearly about this region's business news. */
export function regionHeadlineOk(id, title) {
  const rule = REGION_TITLE[id];
  return !rule || rule.market.test(title) || (rule.place.test(title) && BUSINESS_WORDS.test(title));
}

/** Regions for the homepage news box (id, name), in display order. */
export const HOME_NEWS_REGIONS = [
  ['us', 'United States'], ['uk', 'United Kingdom'], ['europe', 'Europe'], ['india', 'India'], ['china', 'China'],
  ['japan', 'Japan'], ['south-korea', 'South Korea'], ['brazil', 'Brazil'], ['gulf', 'Gulf (Middle East)'],
];


export function newsQueries(kind, id, extra = {}) {
  // Third try: two plain words, the simplest search GDELT accepts
  const plain = String(extra.plain || id).replace(/-/gu, ' ');
  if (kind === 'commodity') return [[COMMODITY_Q[id], 14], [COMMODITY_WIDE[id], 30], [`${plain} prices`, 30]].filter(([q]) => q);
  if (kind === 'bond') return [[BOND_Q[id], 14], [BOND_WIDE[id], 30], [`${plain} bonds`, 30]].filter(([q]) => q);
  if (kind === 'property') return [[PROPERTY_Q[id], 14], [PROPERTY_WIDE[id], 30], [`${plain} property`, 30]].filter(([q]) => q);
  if (kind === 'etf') return [[ETF_Q[id] || `"${id} ETF"`, 14], [ETF_Q[id] || `"${id}" ETF`, 30]];
  if (kind === 'region') return REGION_Q[id] || [];
  if (kind === 'stock' || kind === 'localstock') {
    const name = shortCompanyName(extra.name || id).replace(/"/gu, '');
    if (!name || name.length < 3) return [];
    return [[`"${name}" (shares OR stock OR earnings OR investors)`, 14], [`"${name}"`, 30]];
  }
  return [];
}
export const newsQuery = (kind, id, extra) => newsQueries(kind, id, extra)[0]?.[0] || null;

/* ── GDELT, one request at a time ─────────────────────────────────── */
let chain = Promise.resolve();
let lastCall = 0;
function throttled(fn) {
  const run = chain.then(async () => {
    const wait = Math.max(lastCall + GAP_MS, pauseUntil) - Date.now();
    if (wait > 0) await new Promise((r) => { setTimeout(r, wait); });
    lastCall = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
}

async function gdelt(query, days = 14, max = 75) {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${query} sourcelang:english`)}&mode=artlist&maxrecords=${max}&format=json&sort=datedesc&timespan=${days}d`;
  // GDELT sometimes answers "please limit requests" (HTTP 429) or drops the
  // connection when busy: pause all requests for 2 minutes, then try once more.
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await throttled(async () => {
        const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status} from GDELT ${text.slice(0, 60).trim()}`);
        if (!text.trim().startsWith('{')) throw new Error(`GDELT said: ${text.slice(0, 120).trim()}`);
        return JSON.parse(text).articles || [];
      });
    } catch (error) {
      lastError = error;
      pauseUntil = Date.now() + COOL_OFF_MS;
      if (attempt < 2) console.log(`[news] GDELT busy (${error.message.slice(0, 60)}); all news requests pause 2 minutes`);
    }
  }
  throw lastError;
}

/** Picks the best 5 (15 for regions): trusted sites first, no duplicates or spam sites. */
export function pickArticles(articles, kind, limit = kind === 'region' ? 15 : 5, id = '') {
  const seen = new Set();
  const out = [];
  const rule = kind === 'region' ? REGION_TITLE[id] : null;
  for (const a of articles || []) {
    const url = String(a.url || '').replace(/^http:\/\//u, 'https://');
    const domain = domainOf(url) || String(a.domain || '');
    const title = cleanTitle(a.title);
    if (!url || !title || title.length < 25 || isBlocked(domain)) continue;
    // Regions: the HEADLINE itself must be about that place and about business
    if (rule && !(rule.market.test(title) || (rule.place.test(title) && BUSINESS_WORDS.test(title)))) continue;
    const key = title.toLowerCase().replace(/[^a-z0-9]+/gu, ' ').slice(0, 70);
    if (seen.has(key)) continue;
    seen.add(key);
    const d = String(a.seendate || '');
    const date = /^\d{8}T/u.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:00Z` : null;
    let score = isTrusted(domain) ? 10 : 0;
    if (isPress(domain)) score += kind === 'stock' || kind === 'localstock' ? 3 : -6;
    out.push({ title, url, domain, date, score });
  }
  return out.sort((x, y) => y.score - x.score || String(y.date).localeCompare(String(x.date)))
    .slice(0, limit)
    .sort((x, y) => String(y.date).localeCompare(String(x.date)))
    .map(({ score, ...rest }) => rest);
}

/* ── Saved files ──────────────────────────────────────────────────── */
const fileFor = (kind, id) => path.join(DIR, `${kind}-${String(id).replace(/[^A-Za-z0-9.-]/gu, '_')}.json`);
export async function readNews(kind, id) {
  try { return JSON.parse(await fs.readFile(fileFor(kind, id), 'utf8')); } catch { return null; }
}
async function writeNews(kind, id, data) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(`${fileFor(kind, id)}.tmp`, JSON.stringify(data), 'utf8');
  await fs.rename(`${fileFor(kind, id)}.tmp`, fileFor(kind, id));
}

/** Downloads fresh links (and a new summary if the headlines changed). */
export async function refreshNews(kind, id, { subject, name, force = false } = {}) {
  const saved = await readNews(kind, id);
  const freshFor = saved?.thin ? 3 * HOUR : kind === 'region' ? 6 * HOUR : kind === 'stock' || kind === 'localstock' ? 23 * HOUR : FRESH;
  if (!force && saved && Date.now() - new Date(saved.fetchedAt).getTime() < freshFor) return saved;
  const tries = newsQueries(kind, id, { name });
  if (!tries.length) return saved;
  let items = [];
  let query = tries[0][0];
  const problems = [];
  for (const [q, days] of tries) {
    try {
      const found = pickArticles(await gdelt(q, days, kind === 'region' ? 250 : 75), kind, undefined, id);
      if (found.length > items.length) { items = found; query = q; }
      if (items.length >= (kind === 'region' ? 10 : 3)) break;
    } catch (error) {
      problems.push(error.message);
    }
  }
  if (!items.length && problems.length) {
    console.error(`[news] ${kind} ${id}: failed — ${problems.join(' / ')}${saved ? ' (last links kept)' : ''}`);
    return saved;
  }
  if (items.length < 3) console.log(`[news] ${kind} ${id}: only ${items.length} article(s) found; will try again in 2 hours`);
  else console.log(`[news] ${kind} ${id}: ${items.length} articles`);
  const keep = kind === 'region' || items.length >= 3 || items.length >= (saved?.items?.length || 0);
  const next = { kind, id, query, fetchedAt: new Date().toISOString(), thin: items.length < 3, items: keep ? items : saved.items, summary: saved?.summary || null };
  const changed = items.length >= 3 && JSON.stringify(items.map((x) => x.url).sort()) !== JSON.stringify((saved?.summary?.basis || []).slice().sort());
  const due = !saved?.summary || Date.now() - new Date(saved.summary.at).getTime() > SUMMARY_EVERY;
  if (changed && due) {
    const text = await writeSummary(subject || name || id, items).catch((e) => { console.error(`[news] summary for ${kind} ${id} failed — ${e.message}`); return null; });
    if (text) next.summary = { text, at: new Date().toISOString(), basis: items.map((x) => x.url) };
  }
  await writeNews(kind, id, next);
  return next;
}

async function writeSummary(subject, items) {
  const { summarizeHeadlines } = await import('./writerService.js');
  const text = await summarizeHeadlines({ subject, headlines: items.map((x) => `${x.title} (${x.domain})`) });
  if (!text) return null;
  const { checkNewsText } = await import('./qualityService.js');
  const issues = checkNewsText(text);
  if (issues.length) { console.log(`[news] Summary for ${subject} held back: ${issues.join('; ')}`); return null; }
  return text;
}

/* ── Background fetch for pages opened before their first download ── */
const queued = new Set();
export function queueNews(kind, id, opts = {}) {
  const key = `${kind}:${id}`;
  if (queued.has(key)) return;
  queued.add(key);
  refreshNews(kind, id, opts).catch(() => {}).finally(() => queued.delete(key));
}

/** Data engine job (twice a day): every page in our lists. */
export async function refreshAllNews() {
  const [{ COMMODITIES }, { BOND_PLACES }, { PROPERTY_PLACES }, { CURATED_ETFS }, { getUniverse }, { readCompanies }, { WORLD_REGIONS }] = await Promise.all([
    import('../data/commodityList.js'), import('../data/bondList.js'), import('../data/propertyPlaces.js'),
    import('./etfService.js'), import('../data/stockUniverse.js'), import('./dataEngine.js'), import('../data/worldStocks.js'),
  ]);
  const { companies } = await readCompanies();
  const jobs = [
    ...COMMODITIES.map((c) => ['commodity', c.slug, { subject: `${c.name} prices` }]),
    ...BOND_PLACES.map((p) => ['bond', p.slug, { subject: `${p.name} government bond yields` }]),
    ...PROPERTY_PLACES.map((p) => ['property', p.slug, { subject: `the ${p.name} property market` }]),
    ...CURATED_ETFS.map((e) => ['etf', e.ticker, { subject: `${e.name} (${e.ticker}) and ${e.kind.toLowerCase()}` }]),
    ...HOME_NEWS_REGIONS.map(([id, name]) => ['region', id, { subject: `business news from ${name}` }]),
    ...WORLD_REGIONS.flatMap((r) => r.local.map((x) => ['localstock', `${r.id}--${x.slug}`, { name: x.name, subject: x.name }])),
    ...getUniverse().map((t) => {
      const c = companies?.[t];
      const name = c?.displayName || c?.name || t;
      return ['stock', t, { name, subject: `${shortCompanyName(name)} (${t})` }];
    }),
  ];
  let ok = 0; let withLinks = 0; let summaries = 0;
  for (const [kind, id, opts] of jobs) {
    const before = await readNews(kind, id);
    const d = await refreshNews(kind, id, opts);
    if (d && d.fetchedAt !== before?.fetchedAt) ok += 1;
    if (d?.items?.length >= 3) withLinks += 1;
    if (d?.summary && d.summary.at !== before?.summary?.at) summaries += 1;
  }
  if (!ok && !withLinks) return { ok: false, message: 'No headlines could be downloaded from GDELT' };
  return { ok: true, message: `${ok} pages refreshed; ${withLinks} of ${jobs.length} have 3+ articles; ${summaries} new summaries written` };
}

/** Homepage news box: one region's latest business headlines. */
export async function homeRegionNews(regionId) {
  const region = HOME_NEWS_REGIONS.find(([id]) => id === regionId);
  if (!region) return null;
  const saved = await readNews('region', region[0]);
  const rule = REGION_TITLE[region[0]];
  // Only headlines that are clearly about this region and about business
  const items = (saved?.items || []).filter((x) => !rule || rule.market.test(x.title) || (rule.place.test(x.title) && BUSINESS_WORDS.test(x.title)));
  const age = saved ? Date.now() - new Date(saved.fetchedAt).getTime() : Infinity;
  const oldList = saved && items.length < (saved.items || []).length; // saved before the headline test existed
  if (!saved || oldList || age > 6 * HOUR || (saved.thin && age > 3 * HOUR)) {
    queueNews('region', region[0], { subject: `business news from ${region[1]}`, force: oldList });
  }
  return { region: region[0], name: region[1], items, fetchedAt: saved?.fetchedAt || null };
}
