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
// Raised from 50 — now pulling from 2 NewsData queries + 2 Marketaux
// queries per refresh cycle instead of 1 each, so the combined pool before
// de-dupe can run larger; this caps the final de-duped pool, not any
// single request.
const TRENDING_BATCH_LIMIT = 80;

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

// Every interest's keywords, deduped — used only for LOCAL filtering of
// whatever headlines come back (see getTrendingHeadlinesForInterest below),
// NOT sent as the actual search query anymore. NewsData.io's free plan
// hard-caps the `q` parameter at 100 characters (confirmed via its own
// error: "Query length cannot be greater than 100" / UnsupportedQueryLength)
// — combining all these keywords into one query blew well past that and
// the request was being rejected outright. See NEWSDATA_SAFE_QUERY below,
// which reuses the exact ~97-character query your already-working Top
// Story fetcher (fetchNewsDataHeadlines in newsService.js) uses — proven
// to fit the limit for this account.
const MASTER_SEARCH_TERMS = [
  ...new Set(
    Object.entries(INTEREST_KEYWORD_MAP)
      .filter(([interestId]) => interestId !== 'all')
      .flatMap(([, keywords]) => keywords),
  ),
];

// Exact same query your working fetchNewsDataHeadlines() (Top Story) uses
// — proven to sit under NewsData's 100-char cap for this account. Reusing
// it verbatim rather than building a new one, since "built a new query
// without checking its length against the actual limit" is exactly what
// broke this the last two times.
const NEWSDATA_SAFE_QUERY = 'stocks OR business OR crypto OR commodities OR oil OR gold OR USD OR Nasdaq OR S&P OR China OR AI';

// Second NewsData pass, covering the keyword clusters the first query
// under-represents (bonds/yields, currencies, crypto specifics,
// retirement/income) — a shared batch built from ONE query was too thin
// for narrower interests to ever find a real match, so most of them fell
// back to the same generic pool and looked identical to each other. Also
// measured at 97 chars — under the same 100-char NewsData cap.
const NEWSDATA_SAFE_QUERY_2 = 'bonds OR treasury OR yields OR dividend OR forex OR euro OR yen OR bitcoin OR ethereum OR pension';

// Marketaux didn't error on a 15-term combined query (only NewsData did),
// so these stay reasonably broad — split into two passes covering
// different halves of MASTER_SEARCH_TERMS, both run once per 3h refresh
// (not per request), so this doesn't reintroduce the earlier rate-limit
// problem — it's the same "one shared fetch" pattern, just two calls to
// Marketaux instead of one.
const MARKETAUX_SEARCH_TERMS = MASTER_SEARCH_TERMS.slice(0, 12);
const MARKETAUX_SEARCH_TERMS_2 = MASTER_SEARCH_TERMS.slice(12, 24);

// Region matching for Explore by Interest — deterministic keyword lists,
// same approach as INTEREST_KEYWORD_MAP above and deliberately NOT an AI
// classification call: a model name is one more thing that can quietly
// break later (see writerService's retired-model bug this session). This
// is plain string matching against country/region names and financial
// hubs that plausibly show up in a headline about that region. It won't
// be perfect — a headline can mention a region without being IN scope for
// it, or vice versa — but it's free, instant, and has no moving parts to
// go stale.
const REGION_KEYWORDS = {
  'north-america': ['U.S.', 'US ', 'United States', 'America', 'Canada', 'Wall Street', 'Federal Reserve', 'Fed ', 'Nasdaq', 'Dow Jones', 'Washington', 'New York'],
  europe: ['Europe', 'EU ', 'Eurozone', 'ECB', 'Germany', 'France', 'UK', 'Britain', 'London', 'Brexit', 'Bank of England'],
  mena: ['Middle East', 'Gulf', 'UAE', 'Dubai', 'Abu Dhabi', 'Saudi', 'Qatar', 'Egypt', 'Iran', 'Oman', 'Kuwait', 'Bahrain'],
  apac: ['Asia', 'China', 'Japan', 'Korea', 'Hong Kong', 'Singapore', 'Australia', 'Taiwan', 'Beijing', 'Tokyo'],
  india: ['India', 'Sensex', 'Nifty', 'Mumbai', 'RBI', 'Rupee', 'Delhi'],
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
 *
 * `regions`: an array of REGION_OPTIONS ids (e.g. ['mena']). Filtering is
 * matched with REGION_KEYWORDS above. 'global', an empty array, or more
 * than one region selected all skip region filtering (region-tagging a
 * headline is inherently fuzzy with this heuristic, and "global" or
 * "several regions" both mean "don't narrow it").
 */
export async function getTrendingHeadlinesForInterest(interestId, { limit = 5, regions = [] } = {}) {
  const topics = await getTrendingTopics();
  const keywords = INTEREST_KEYWORD_MAP[interestId] || INTEREST_KEYWORD_MAP.all;
  const pool = trendingCache?.rawItems || [];

  const singleRegion = regions.length === 1 && regions[0] !== 'global' ? regions[0] : null;
  const regionKeywords = singleRegion ? REGION_KEYWORDS[singleRegion] : null;

  // STEP 1 — interest keywords AND region keywords both matched, if a
  // specific single region was requested.
  let items = regionKeywords
    ? pool.filter((item) => matchesKeywords(item.title, keywords) && matchesKeywords(item.title, regionKeywords))
    : pool.filter((item) => matchesKeywords(item.title, keywords));

  // STEP 2 — a region-specific match is a hard ask for a single headline
  // ("mentions both Crypto AND Dubai") — drop the region requirement
  // rather than show an empty card, since the interest match is the more
  // important of the two.
  if (!items.length && regionKeywords) {
    console.warn(`[trendingService] No "${interestId}" headlines matched region "${singleRegion}" — showing unfiltered "${interestId}" headlines instead of an empty card.`);
    items = pool.filter((item) => matchesKeywords(item.title, keywords));
  }

  // STEP 3 — last resort: show the freshest general headlines rather than
  // an empty card. Should be rare now that the shared batch's query
  // explicitly covers every interest's keywords.
  if (!items.length) {
    console.warn(`[trendingService] No headlines matched "${interestId}" in the shared batch — showing general headlines instead of an empty card.`);
    items = pool;
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
  console.log(`[trendingService] Fetching widened trending batch — 2 NewsData queries + 2 Marketaux queries.`);

  // Two queries per provider instead of one — covers more of the interest
  // keyword space (crypto/fx/bonds/income were thin with just the general
  // query, which is why unrelated interest cards kept showing the same
  // fallback headlines). Still just ONE fetch cycle every 3 hours, run
  // sequentially here (not concurrently) — this does NOT reintroduce the
  // earlier per-interest-request rate-limit problem, since it's driven by
  // the shared cache refresh, not by how many interests a page requests.
  const providers = [
    { name: 'NewsData.io (query 1)', fetcher: () => fetchNewsDataBatch(NEWSDATA_SAFE_QUERY) },
    { name: 'NewsData.io (query 2)', fetcher: () => fetchNewsDataBatch(NEWSDATA_SAFE_QUERY_2) },
    { name: 'Marketaux (query 1)', fetcher: () => fetchMarketauxBatch(MARKETAUX_SEARCH_TERMS) },
    { name: 'Marketaux (query 2)', fetcher: () => fetchMarketauxBatch(MARKETAUX_SEARCH_TERMS_2) },
  ];

  // Combine every provider/query rather than stopping at the first that
  // answers. On the free plans a single call returns only a handful of
  // headlines, which is too thin a sample for "appears in 2+ separate
  // headlines" to ever detect a trend, and too thin for narrower interests
  // to find a real keyword match.
  const collected = [];
  for (const provider of providers) {
    try {
      const items = await provider.fetcher();
      if (items.length) {
        collected.push(...items);
        console.log(`[trendingService] ${provider.name} returned ${items.length} headlines.`);
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
    console.log(`[trendingService] Trending batch collected ${collected.length} headlines across providers (before de-dupe).`);
  }

  return dedupeByTitle(collected).slice(0, TRENDING_BATCH_LIMIT);
}

async function fetchNewsDataBatch(query) {
  if (!process.env.NEWSDATA_API_KEY) {
    console.warn('[trendingService] Skipping NewsData.io — no API key configured.');
    return [];
  }

  const url = new URL('https://newsdata.io/api/1/latest');
  url.searchParams.set('apikey', process.env.NEWSDATA_API_KEY);
  url.searchParams.set('q', query);
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

async function fetchMarketauxBatch(searchTerms) {
  if (!process.env.MARKETAUX_API_KEY) {
    console.warn('[trendingService] Skipping Marketaux — no API key configured.');
    return [];
  }

  const url = new URL('https://api.marketaux.com/v1/news/all');
  url.searchParams.set('api_token', process.env.MARKETAUX_API_KEY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(MARKETAUX_QUERY_LIMIT));
  url.searchParams.set('search', searchTerms.join(' OR '));
  // Confirmed via Marketaux's own API spec: using `search` switches their
  // DEFAULT sort from published_at (recency) to relevance_score — so an
  // old article that matches the search terms well can rank above today's
  // news entirely. That's what let 2023 press-release-wire articles
  // (globenewswire.com) show up ahead of current headlines. Forcing both
  // an explicit sort and a recency cutoff closes that regardless of which
  // one Marketaux actually honors for this plan.
  url.searchParams.set('sort', 'published_on');
  url.searchParams.set('published_after', recentCutoffTimestamp());

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

// Marketaux's own docs note dates are UTC; publishedBefore/publishedAfter
// rejects malformed values ("The published_before parameter(s) are
// incorrectly formatted"), so this sticks to a plain
// YYYY-MM-DDTHH:MM:SS format (no milliseconds, no trailing Z) — the
// commonly accepted shape for this kind of param.
function recentCutoffTimestamp(hoursBack = 48) {
  return new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString().slice(0, 19);
}
