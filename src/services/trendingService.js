/* ════════════════════════════════════════════════════════════════════════
   TRENDING DETECTION — shared "what's hot right now" engine
   ───────────────────────────────────────────────────────────────────────
   Dr MoneyWise has no budget for a real trends API (Google Trends etc.
   aren't freely available for this kind of commercial use). This
   approximates "trending" by pulling a broad batch of fresh headlines from
   NewsData.io/Marketaux and counting how many DIFFERENT headlines mention
   the same topic — a name, company, or theme that keeps showing up across
   several separate stories in the last few hours is treated as more
   "trending" than something that appears once.

   This is a heuristic, not a licensed trends signal — it won't match
   Google Trends exactly. It is free, fully automatic, and reasonably
   correlated with what's actually being covered heavily right now, which
   is what matters for the three places that use it:

   - newsService.getLiveHeadlines()      (Top Story)         — ranks by trend score
   - newsService.getInterestHeadlines()  (Explore by Interest) — same ranking, per interest
   - articleService's Learning Points auto-picker — picks the top trending
     topic (not recently covered) to write a Learning Point about

   No extra dependency is used here (matches the project's package.json
   rule of zero unnecessary external packages) — everything below is plain
   JS string/array handling.
   ════════════════════════════════════════════════════════════════════════ */

const TRENDING_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours — refreshes more often than the 24h per-interest cache in newsService.js
const TRENDING_BATCH_LIMIT = 50;

// Matches the limit your existing, working fetchMarketauxHeadlines() (Live
// Wire / Top Story) already uses successfully — an earlier version of this
// file guessed at a lower "free plan" limit with no evidence for it, which
// was needlessly starving every interest query of results. Removed.
const MARKETAUX_QUERY_LIMIT = 20;

// NOTE: 'retirement' and 'income' are real, user-selectable interests in
// config.INTEREST_OPTIONS (and 'income' is one of the defaults), but they
// were missing from this map — and from ASSET_KEYWORDS in newsService.js,
// which this was modelled on. Any interest missing here fell back to the
// generic 'all' keywords, which almost never matched, so those cards came
// up permanently empty. Both are now covered.
const INTEREST_KEYWORD_MAP = {
  all: ['markets', 'economy', 'stocks', 'business'],
  equities: ['stocks', 'earnings', 'equities', 'shares'],
  etfs: ['etf', 'fund', 'allocation', 'flows'],
  'fixed-income': ['bonds', 'treasury', 'yield', 'duration', 'rates'],
  commodities: ['oil', 'gold', 'commodities', 'metals', 'energy'],
  fx: ['forex', 'currency', 'dollar', 'euro', 'yen'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'digital assets'],
  retirement: ['retirement', 'pension', 'savings', '401k', 'long-term investing'],
  income: ['dividend', 'income', 'yield', 'payout', 'cashflow'],
};

// Every interest's keywords, deduped, combined into one shared search query
// (used for both providers below). This used to be a short generic list
// ('markets OR economy OR stocks'), which meant narrower interests like
// Crypto or Currencies were barely represented in the one shared batch —
// this widens it so the single shared fetch actually covers every interest.
const MASTER_SEARCH_TERMS = [
  ...new Set(
    Object.entries(INTEREST_KEYWORD_MAP)
      .filter(([interestId]) => interestId !== 'all')
      .flatMap(([, keywords]) => keywords),
  ),
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'as', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'it', 'its', 'this', 'that',
  'these', 'those', 'after', 'before', 'over', 'under', 'into', 'out', 'up', 'down', 'new',
  'says', 'say', 'said', 'will', 'would', 'could', 'should', 'may', 'might', 'not', 'no', 'yes',
  'than', 'then', 'more', 'most', 'less', 'least', 'from', 'about', 'amid', 'amidst', 'how',
  'why', 'what', 'when', 'who', 'which', 'their', 'his', 'her', 'they', 'them', 'we', 'our',
  'you', 'your', 'i', 'he', 'she',
]);

let trendingCache = null; // { topics, rawItems, fetchedAt }
let refreshInFlight = null; // Promise, so concurrent callers share one fetch

/**
 * Returns the current ranked list of trending topics:
 * [{ label, score, sampleHeadline, sampleUrl, latest }], highest score first.
 * `score` = number of distinct headlines mentioning that topic in the
 * current batch. Recomputes at most once every 3 hours.
 */
export async function getTrendingTopics({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && trendingCache && now - trendingCache.fetchedAt < TRENDING_CACHE_TTL_MS) {
    return trendingCache.topics;
  }

  // If a refresh is already running (e.g. several interest cards all asked
  // at once right as the cache expired), share that one fetch instead of
  // each caller starting its own — this is exactly the kind of concurrent
  // burst that was hitting NewsData/Marketaux's rate limits before.
  if (refreshInFlight) {
    const cache = await refreshInFlight;
    return cache.topics;
  }

  refreshInFlight = (async () => {
    const rawItems = await fetchTrendingBatch();
    const topics = scoreTopics(rawItems);
    const cache = { topics, rawItems, fetchedAt: Date.now() };
    trendingCache = cache;
    return cache;
  })();

  try {
    const cache = await refreshInFlight;
    return cache.topics;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Raw headlines (title/source/url/publishedAt only) for one interest,
 * ranked by trending score then recency. Powers Explore by Interest.
 *
 * Filters the ONE shared trending batch (see fetchTrendingBatch below)
 * rather than making its own live API call — an earlier version queried
 * NewsData/Marketaux separately for every interest, and since the
 * frontend requests all selected interests at once, that meant several
 * simultaneous calls to the same free-tier APIs, which got rate-limited
 * and silently came back empty. One shared, broader-worded batch (see
 * MASTER_SEARCH_TERMS above) avoids that entirely.
 */
export async function getTrendingHeadlinesForInterest(interestId, { limit = 5 } = {}) {
  const topics = await getTrendingTopics();
  const keywords = INTEREST_KEYWORD_MAP[interestId] || INTEREST_KEYWORD_MAP.all;

  let items = (trendingCache?.rawItems || []).filter((item) => matchesKeywords(item.title, keywords));

  // Last resort: show the freshest general headlines rather than an empty
  // card. Should be rare now that the shared batch's query explicitly
  // covers every interest's keywords.
  if (!items.length) {
    console.warn(`[trendingService] No headlines matched "${interestId}" in the shared batch — showing general headlines instead of an empty card.`);
    items = trendingCache?.rawItems || [];
  }

  const scored = items
    .map((item) => ({ ...item, score: scoreHeadlineAgainstTopics(item, topics) }))
    .sort(
      (a, b) => b.score - a.score || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  return dedupeByTitle(scored)
    .slice(0, limit)
    .map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
    }));
}

/**
 * Picks the single highest-scoring trending topic that isn't in
 * `excludeTopics` (case-insensitive) — used to pick a fresh Learning
 * Points subject. Returns null if nothing is trending right now (e.g. no
 * news API keys configured, or every provider failed).
 */
export async function pickTrendingLearningTopic({ excludeTopics = [] } = {}) {
  const topics = await getTrendingTopics();
  const excludeSet = new Set(excludeTopics.map((topic) => topic.toLowerCase()));
  return topics.find((topic) => !excludeSet.has(topic.label.toLowerCase())) || topics[0] || null;
}

/* ── internals ──────────────────────────────────────────────────────── */

async function fetchTrendingBatch() {
  const providers = [
    { name: 'NewsData.io', fetcher: fetchNewsDataBatch },
    { name: 'Marketaux', fetcher: fetchMarketauxBatch },
  ];

  // Combine every provider rather than stopping at the first that
  // answers. On the free plans a single provider returns only a handful of
  // headlines, which is too thin a sample for "appears in 2+ separate
  // headlines" to ever detect a trend.
  const collected = [];
  for (const provider of providers) {
    try {
      const items = await provider.fetcher();
      if (items.length) {
        collected.push(...items);
      } else {
        console.warn(`[trendingService] ${provider.name} returned 0 items for the trending batch.`);
      }
    } catch (error) {
      console.error(`[trendingService] ${provider.name} batch fetch failed:`, error.message);
    }
  }

  if (!collected.length) {
    console.warn('[trendingService] All providers failed or returned nothing — trending list will be empty until the next refresh.');
  } else {
    console.log(`[trendingService] Trending batch collected ${collected.length} headlines across providers.`);
  }

  return dedupeByTitle(collected).slice(0, TRENDING_BATCH_LIMIT);
}

async function fetchNewsDataBatch() {
  if (!process.env.NEWSDATA_API_KEY) {
    console.warn('[trendingService] Skipping NewsData.io — no API key configured.');
    return [];
  }

  const url = new URL('https://newsdata.io/api/1/latest');
  url.searchParams.set('apikey', process.env.NEWSDATA_API_KEY);
  url.searchParams.set('q', MASTER_SEARCH_TERMS.join(' OR '));
  url.searchParams.set('category', 'business,technology,politics,top');
  url.searchParams.set('language', 'en');
  url.searchParams.set('image', '0');
  url.searchParams.set('video', '0');

  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`NewsData.io (trending) request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  return (payload.results || [])
    .filter((article) => article.title)
    .slice(0, TRENDING_BATCH_LIMIT)
    .map((article) => ({
      title: article.title,
      source: article.source_name || 'NewsData.io',
      url: article.link || '',
      publishedAt: article.pubDate || new Date().toISOString(),
    }));
}

async function fetchMarketauxBatch() {
  if (!process.env.MARKETAUX_API_KEY) {
    console.warn('[trendingService] Skipping Marketaux — no API key configured.');
    return [];
  }

  const url = new URL('https://api.marketaux.com/v1/news/all');
  url.searchParams.set('api_token', process.env.MARKETAUX_API_KEY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(MARKETAUX_QUERY_LIMIT));
  url.searchParams.set('search', MASTER_SEARCH_TERMS.join(' OR '));

  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Marketaux (trending) request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
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

function scoreTopics(items) {
  const counts = new Map(); // lowercase phrase -> { label, count, sampleHeadline, sampleUrl, latest }

  for (const item of items) {
    const phrases = extractPhrases(item.title);
    for (const phrase of phrases) {
      const key = phrase.toLowerCase();
      const existing = counts.get(key) || {
        label: phrase,
        count: 0,
        sampleHeadline: item.title,
        sampleUrl: item.url,
        latest: item.publishedAt,
      };
      existing.count += 1;
      if (new Date(item.publishedAt).getTime() > new Date(existing.latest).getTime()) {
        existing.latest = item.publishedAt;
        existing.sampleHeadline = item.title;
        existing.sampleUrl = item.url;
      }
      counts.set(key, existing);
    }
  }

  // Must appear in at least 2 separate headlines to count as "trending" —
  // a single mention is just news, not a trend. If nothing clears that bar
  // (e.g. a thin batch), fall back to the freshest single-mention items so
  // callers still get something rather than an empty list.
  const qualifying = [...counts.values()].filter((topic) => topic.count >= 2);
  const pool = qualifying.length ? qualifying : [...counts.values()];

  return pool
    .sort((a, b) => b.count - a.count || new Date(b.latest).getTime() - new Date(a.latest).getTime())
    .map((topic) => ({
      label: topic.label,
      score: topic.count,
      sampleHeadline: topic.sampleHeadline,
      sampleUrl: topic.sampleUrl,
      latest: topic.latest,
    }));
}

// Extracts candidate "topic" phrases from a headline: runs of consecutive
// capitalized words (proper nouns — company names, people, places, index
// names like "S&P 500"), plus known asset-keyword hits. Pure heuristic, no
// NLP library — deliberately, to match the project's zero-extra-dependency
// rule (see package.json — only adm-zip is an external dependency).
function extractPhrases(title) {
  const words = title.split(/\s+/u);
  const phrases = [];
  let current = [];

  for (const rawWord of words) {
    const word = rawWord.replace(/[^\w&$%.-]/gu, '');
    const isCapitalized = /^[A-Z]/u.test(word) && !STOPWORDS.has(word.toLowerCase());
    if (isCapitalized && word.length > 1) {
      current.push(word);
    } else {
      if (current.length) {
        phrases.push(current.join(' '));
        current = [];
      }
    }
  }
  if (current.length) {
    phrases.push(current.join(' '));
  }

  const lowerTitle = title.toLowerCase();
  for (const keywords of Object.values(INTEREST_KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) {
        phrases.push(keyword);
      }
    }
  }

  return [...new Set(phrases.filter((phrase) => phrase.length > 2))];
}

function matchesKeywords(title, keywords) {
  const lowerTitle = title.toLowerCase();
  return keywords.some((keyword) => lowerTitle.includes(keyword));
}

function scoreHeadlineAgainstTopics(item, topics) {
  const lowerTitle = item.title.toLowerCase();
  const match = topics.find((topic) => lowerTitle.includes(topic.label.toLowerCase()));
  return match ? match.score : 0;
}

function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.title)) {
      return false;
    }
    seen.add(item.title);
    return true;
  });
}
