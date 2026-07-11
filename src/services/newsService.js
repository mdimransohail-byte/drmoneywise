import { ASSET_OPTIONS, REGION_OPTIONS, canAccess, getPlanConfig } from '../config.js';
import { fallbackNews } from '../data/marketNews.js';
import { marketSnapshotCards } from '../data/marketSnapshot.js';
import { average, matchesAsset, matchesQuery, matchesRegion, sortByNewsPriority, uniqueBy } from '../utils/filters.js';

const REGION_COUNTRY_MAP = {
  global: [],
  'north-america': ['us', 'ca'],
  europe: ['gb', 'de', 'fr', 'nl'],
  mena: ['ae', 'sa', 'qa'],
  apac: ['jp', 'sg', 'au', 'cn'],
  india: ['in'],
};

const ASSET_KEYWORDS = {
  all: ['markets', 'economy', 'stocks'],
  equities: ['stocks', 'earnings', 'equities', 'shares'],
  etfs: ['ETF', 'fund', 'allocation', 'flows'],
  'fixed-income': ['bonds', 'Treasury', 'yield', 'duration', 'rates'],
  commodities: ['oil', 'gold', 'commodities', 'metals', 'energy'],
  fx: ['forex', 'currency', 'dollar', 'euro', 'yen'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'digital assets'],
};

export async function getNews({ tier = 'free', region = 'global', asset = 'all', query = '' } = {}) {
  const plan = getPlanConfig(tier);
  const limit = plan.articleLimit || plan.newsLimit || 12;
  const liveResult = await fetchLiveNews({ region, asset, limit });
  const sourceItems = liveResult.items.length ? liveResult.items : fallbackNews;

  const filtered = sortByNewsPriority(
    sourceItems.filter((item) => matchesRegion(item.region, region) && matchesAsset(item.asset, asset) && matchesQuery(item, query)),
  );

  const visible = filtered.slice(0, limit).map((item, index) => {
    const accessTier = normalizeAccessTier(item, index);
    return {
      ...item,
      accessTier,
      accessible: canAccess(plan, accessTier),
    };
  });

  return {
    mode: liveResult.items.length ? 'live' : 'demo',
    provider: liveResult.provider || 'Curated demo feed',
    updatedAt: new Date().toISOString(),
    totalCount: filtered.length,
    lockedCount: visible.filter((item) => !item.accessible).length,
    items: visible,
    statusNote: liveResult.items.length
      ? `Live feed connected through ${liveResult.provider}.`
      : 'Demo mode is active. Add API keys in .env for live headlines.',
  };
}

export async function getMarketSnapshot({ region = 'global', asset = 'all' } = {}) {
  const cards = marketSnapshotCards.filter(
    (card) => matchesRegion(card.region, region) && matchesAsset(card.asset, asset),
  );

  const visibleCards = cards.length ? cards : marketSnapshotCards.filter((card) => matchesAsset(card.asset, asset));
  const gainers = visibleCards.filter((card) => card.change > 0).length;
  const breadth = Math.round((gainers / visibleCards.length) * 100);
  const avgChange = average(visibleCards.map((card) => card.change));

  return {
    headline: `${getRegionLabel(region)} ${getAssetLabel(asset)} pulse`,
    breadth,
    avgChange: Number(avgChange.toFixed(2)),
    cards: visibleCards.slice(0, 6),
  };
}

/* ════════════════════════════════════════════════════════════════════════
   LIVE WIRE — homepage scrolling headline ticker
   ───────────────────────────────────────────────────────────────────────
   Deliberately separate from getNews()/getHomeExperience(): those exist to
   build personalized, AI-rewritten "articles" gated by region/interest/plan,
   and calling that pipeline just to fill a ticker meant burning AI-writer
   and news-provider calls on every homepage load for no real benefit. This
   function instead fetches a small set of raw headlines (title/source/link
   only, no AI rewrite) and caches them in memory for 6 hours, shared across
   every visitor — so Marketaux only gets hit a handful of times a day
   regardless of traffic.

   TESTING CONFIGURATION: Marketaux only for now (safe for production use).
   Add more providers here later using the same fallback pattern as
   fetchLiveNews() below, once ready to expand beyond Marketaux.
   ════════════════════════════════════════════════════════════════════════ */
const LIVE_HEADLINES_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LIVE_HEADLINES_LIMIT = 20;
let liveHeadlinesCache = null; // { payload, fetchedAt }

export async function getLiveHeadlines() {
  const now = Date.now();

  if (liveHeadlinesCache && now - liveHeadlinesCache.fetchedAt < LIVE_HEADLINES_CACHE_TTL_MS) {
    return { ...liveHeadlinesCache.payload, cached: true };
  }

  try {
    const items = await fetchMarketauxHeadlines({ limit: LIVE_HEADLINES_LIMIT });
    if (items.length) {
      const payload = {
        mode: 'live',
        provider: 'Marketaux',
        updatedAt: new Date().toISOString(),
        items,
      };
      liveHeadlinesCache = { payload, fetchedAt: now };
      return { ...payload, cached: false };
    }
  } catch {
    // Fall through to a stale cache (if any) or demo headlines below.
  }

  if (liveHeadlinesCache) {
    return { ...liveHeadlinesCache.payload, cached: true, stale: true };
  }

  return {
    mode: 'demo',
    provider: 'Curated demo feed',
    updatedAt: new Date().toISOString(),
    items: fallbackNews.slice(0, LIVE_HEADLINES_LIMIT).map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url || '',
      publishedAt: item.publishedAt,
    })),
  };
}

async function fetchMarketauxHeadlines({ limit }) {
  if (!process.env.MARKETAUX_API_KEY) {
    return [];
  }

  const url = new URL('https://api.marketaux.com/v1/news/all');
  url.searchParams.set('api_token', process.env.MARKETAUX_API_KEY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('search', ASSET_KEYWORDS.all.join(' OR '));

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return (payload.data || [])
    .filter((article) => article.title)
    .map((article) => ({
      title: article.title,
      source: article.source || 'Marketaux',
      url: article.url || '',
      publishedAt: article.published_at || new Date().toISOString(),
    }));
}

/* ════════════════════════════════════════════════════════════════════════
   NEWS SOURCES — TESTING CONFIGURATION
   ───────────────────────────────────────────────────────────────────────
   Marketaux: free tier, safe for production, keep long-term.
   Tiingo: free tier, but its free-tier license is INDIVIDUAL USE ONLY.
     Fine to use during development/testing — must be removed (or upgraded
     to a commercial Tiingo plan) before the site goes live. Search this
     file for "TESTING ONLY" to find every spot that needs to change.
   NewsAPI.org: removed entirely — its free Developer plan forbids
     production use, including internal use. See businessSettings.js and
     envService.js for matching notes.
   Finnhub: kept — free tier is production-safe, also supplies some
     company-specific news alongside its main role as the live stock
     price source.
   ════════════════════════════════════════════════════════════════════════ */
async function fetchLiveNews({ region, asset, limit }) {
  const providers = [
    {
      name: 'Marketaux',
      enabled: Boolean(process.env.MARKETAUX_API_KEY),
      fetcher: () => fetchMarketauxNews({ region, asset, limit }),
    },
    {
      name: 'Tiingo', // TESTING ONLY — remove this provider before launch (individual-use license)
      enabled: Boolean(process.env.TIINGO_API_KEY),
      fetcher: () => fetchTiingoNews({ region, asset, limit }),
    },
    {
      name: 'Finnhub',
      enabled: Boolean(process.env.FINNHUB_API_KEY),
      fetcher: () => fetchFinnhubNews({ region, asset, limit }),
    },
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      continue;
    }

    try {
      const items = await provider.fetcher();
      if (items.length) {
        return {
          provider: provider.name,
          items,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    provider: null,
    items: [],
  };
}

async function fetchMarketauxNews({ region, asset, limit }) {
  const countries = REGION_COUNTRY_MAP[region] || [];
  const keywords = ASSET_KEYWORDS[asset] || ASSET_KEYWORDS.all;
  const url = new URL('https://api.marketaux.com/v1/news/all');

  url.searchParams.set('api_token', process.env.MARKETAUX_API_KEY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('filter_entities', 'true');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('search', keywords.join(' OR '));
  if (countries.length) {
    url.searchParams.set('countries', countries.join(','));
  }

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return normalizeLiveArticles(
    payload.data?.map((article, index) => ({
      id: article.uuid || `marketaux-${index}`,
      title: article.title,
      summary: article.description || article.snippet || 'Market headline',
      whyItMatters: article.description || 'This headline matters because it could affect positioning and sentiment.',
      source: article.source || 'Marketaux',
      region: resolveRegionFromArticle(article, region),
      asset: resolveAssetFromText(article.title || article.description || '', asset),
      topics: article.entities?.map((entity) => entity.symbol).filter(Boolean).slice(0, 4) || [],
      tickers: article.entities?.map((entity) => entity.symbol).filter(Boolean).slice(0, 4) || [],
      sentiment: 'neutral',
      urgency: index < 2 ? 'high' : 'medium',
      accessTier: index % 5 === 0 ? 'premium' : index % 2 === 0 ? 'regular' : 'free',
      publishedAt: article.published_at || new Date().toISOString(),
      readTime: '3 min',
      url: article.url,
    })) || [],
  );
}

// TESTING ONLY — Tiingo's free tier is individual-use only.
// Remove this function and its provider entry above before going live.
async function fetchTiingoNews({ region, asset, limit }) {
  const keywords = ASSET_KEYWORDS[asset] || ASSET_KEYWORDS.all;
  const url = new URL('https://api.tiingo.com/tiingo/news');

  url.searchParams.set('token', process.env.TIINGO_API_KEY);
  url.searchParams.set('tags', keywords.join(','));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sortBy', 'publishedDate');

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return normalizeLiveArticles(
    (Array.isArray(payload) ? payload : []).map((article, index) => ({
      id: article.id ? `tiingo-${article.id}` : `tiingo-${index}`,
      title: article.title,
      summary: article.description || 'Market headline',
      whyItMatters: article.description || 'This headline could affect positioning and sentiment across related assets.',
      source: article.source || 'Tiingo',
      region,
      asset: resolveAssetFromText(`${article.title} ${article.description || ''}`, asset),
      topics: article.tags || keywords,
      tickers: article.tickers || [],
      sentiment: 'neutral',
      urgency: index < 2 ? 'high' : 'medium',
      accessTier: index % 5 === 0 ? 'premium' : index % 2 === 0 ? 'regular' : 'free',
      publishedAt: article.publishedDate || article.crawlDate || new Date().toISOString(),
      readTime: '3 min',
      url: article.url,
    })),
  );
}

async function fetchFinnhubNews({ region, asset, limit }) {
  const category = asset === 'crypto' ? 'crypto' : 'general';
  const url = new URL('https://finnhub.io/api/v1/news');

  url.searchParams.set('category', category);
  url.searchParams.set('token', process.env.FINNHUB_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return normalizeLiveArticles(
    payload.slice(0, limit).map((article, index) => ({
      id: `finnhub-${article.id || index}`,
      title: article.headline,
      summary: article.summary || 'Market headline',
      whyItMatters: article.summary || 'This headline could affect sector leadership and cross-asset risk appetite.',
      source: article.source || 'Finnhub',
      region,
      asset: resolveAssetFromText(`${article.headline} ${article.summary || ''}`, asset),
      topics: ASSET_KEYWORDS[asset] || ASSET_KEYWORDS.all,
      tickers: [],
      sentiment: 'neutral',
      urgency: index < 2 ? 'high' : 'medium',
      accessTier: index % 5 === 0 ? 'premium' : index % 2 === 0 ? 'regular' : 'free',
      publishedAt: article.datetime ? new Date(article.datetime * 1000).toISOString() : new Date().toISOString(),
      readTime: '2 min',
      url: article.url,
    })),
  );
}

function normalizeLiveArticles(items) {
  return uniqueBy(
    items
      .filter((item) => item.title && item.summary)
      .map((item) => ({
        ...item,
        source: item.source || 'Live provider',
      })),
    (item) => item.title,
  );
}

function resolveRegionFromArticle(article, fallbackRegion) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  if (text.includes('india')) {
    return 'india';
  }
  if (text.includes('europe') || text.includes('euro')) {
    return 'europe';
  }
  if (text.includes('gulf') || text.includes('saudi') || text.includes('uae')) {
    return 'mena';
  }
  if (text.includes('asia') || text.includes('japan') || text.includes('china')) {
    return 'apac';
  }
  if (text.includes('united states') || text.includes('canada') || text.includes('wall street')) {
    return 'north-america';
  }
  return fallbackRegion;
}

function resolveAssetFromText(text, fallbackAsset) {
  const normalized = text.toLowerCase();
  if (normalized.includes('bitcoin') || normalized.includes('crypto') || normalized.includes('ethereum')) {
    return 'crypto';
  }
  if (normalized.includes('bond') || normalized.includes('yield') || normalized.includes('treasury')) {
    return 'fixed-income';
  }
  if (normalized.includes('oil') || normalized.includes('gold') || normalized.includes('metal')) {
    return 'commodities';
  }
  if (normalized.includes('etf') || normalized.includes('fund')) {
    return 'etfs';
  }
  if (normalized.includes('currency') || normalized.includes('forex') || normalized.includes('dollar') || normalized.includes('euro')) {
    return 'fx';
  }
  if (normalized.includes('stock') || normalized.includes('equity') || normalized.includes('share') || normalized.includes('earnings')) {
    return 'equities';
  }
  return fallbackAsset === 'all' ? 'equities' : fallbackAsset;
}

function getRegionLabel(regionId) {
  return REGION_OPTIONS.find((option) => option.id === regionId)?.label || 'Global';
}

function getAssetLabel(assetId) {
  return ASSET_OPTIONS.find((option) => option.id === assetId)?.label || 'All Assets';
}

function normalizeAccessTier(item, index) {
  if (item.accessTier) {
    return item.accessTier;
  }

  if (item.premium) {
    return index % 2 === 0 ? 'regular' : 'premium';
  }

  return 'free';
}
