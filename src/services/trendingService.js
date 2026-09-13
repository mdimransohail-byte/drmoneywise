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
const TRENDING_BATCH_LIMIT = 60; // raw headlines pulled per refresh, across providers combined

const INTEREST_KEYWORD_MAP = {
  all: ['markets', 'economy', 'stocks', 'business'],
  equities: ['stocks', 'earnings', 'equities', 'shares'],
  etfs: ['etf', 'fund', 'allocation', 'flows'],
  'fixed-income': ['bonds', 'treasury', 'yield', 'duration', 'rates'],
  commodities: ['oil', 'gold', 'commodities', 'metals', 'energy'],
  fx: ['forex', 'currency', 'dollar', 'euro', 'yen'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'digital assets'],
};

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

  const rawItems = await fetchTrendingBatch();
  const topics = scoreTopics(rawItems);
  trendingCache = { topics, rawItems, fetchedAt: now };
  return topics;
}

/**
 * Raw headlines (title/source/url/publishedAt only) for one interest,
 * ranked by trending score then recency. Powers Explore by Interest.
 */
export async function getTrendingHeadlinesForInterest(interestId, { limit = 5 } = {}) {
  const topics = await getTrendingTopics();
  const items = trendingCache?.rawItems || [];
  const keywords = INTEREST_KEYWORD_MAP[interestId] || INTEREST_KEYWORD_MAP.all;

  const scored = items
    .filter((item) => matchesKeywords(item.title, keywords))
    .map((item) => ({ ...item, score: scoreHeadlineAgainstTopics(item, topics) }))
    .sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt));

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

  for (const provider of providers) {
    try {
      const items = await provider.fetcher();
      if (items.length) {
        return items;
      }
      console.warn(`[trendingService] ${provider.name} returned 0 items for the trending batch.`);
    } catch (error) {
      console.error(`[trendingService] ${provider.name} batch fetch failed:`, error.message);
    }
  }

  console.warn('[trendingService] All providers failed or returned nothing — trending list will be empty until the next refresh.');
  return [];
}

async function fetchNewsDataBatch() {
  if (!process.env.NEWSDATA_API_KEY) {
    console.warn('[trendingService] Skipping NewsData.io — no API key configured.');
    return [];
  }

  const url = new URL('https://newsdata.io/api/1/latest');
  url.searchParams.set('apikey', process.env.NEWSDATA_API_KEY);
  url.searchParams.set(
    'q',
    'stocks OR business OR crypto OR commodities OR oil OR gold OR USD OR Nasdaq OR economy OR earnings OR rates',
  );
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
  url.searchParams.set('limit', String(TRENDING_BATCH_LIMIT));
  url.searchParams.set('search', 'markets OR economy OR stocks OR business OR earnings OR rates');

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
