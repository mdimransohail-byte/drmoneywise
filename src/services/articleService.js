import crypto from 'node:crypto';

import { canAccess, DEFAULT_MEMBER_INTERESTS, getInterestLabel, getPlanCatalog as getConfiguredPlanCatalog, getPlanConfig, getRegionLabel } from '../config.js';
import { getNews } from './newsService.js';
import { readStore, updateStore } from './storeService.js';
import { createLearningArticleFromTopic, summarizeNewsItem } from './writerService.js';
import { generateGammaInfographic, searchPexelsImage } from './visualsService.js';
import { pickTrendingLearningTopic } from './trendingService.js';
import { matchesRegion, sortByNewsPriority } from '../utils/filters.js';

/* ════════════════════════════════════════════════════════════════════════
   LEARNING POINTS — homepage rotation (5×2 grid, 2-day cycle)
   ───────────────────────────────────────────────────────────────────────
   See getActiveLearningPoints() / rotateLearningPointsNow() further below
   for the actual rotation logic. Kept as named constants here since both
   the homepage query and the admin "more than 10 scheduled" warning need
   to agree on the same number.
   ════════════════════════════════════════════════════════════════════════ */
const LEARNING_ROTATION_SLOT_COUNT = 10;
const LEARNING_ROTATION_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

// Ceiling on how many articles one background top-up will write. Keeps a
// single cycle from firing a long burst of paid AI calls unattended.
const MAX_AUTO_GENERATIONS_PER_CYCLE = 4;

export async function publishDueArticles() {
  await updateStore((store) => {
    const now = Date.now();
    for (const article of store.articles) {
      if (article.status === 'scheduled' && new Date(article.publishAt).getTime() <= now) {
        article.status = 'published';
        article.updatedAt = new Date().toISOString();
      }
    }
    return store;
  });
}

export async function getHomeExperience({ regions = ['global'], interests = [], plan = 'free' } = {}) {
  await publishDueArticles();
  const selectedInterests = interests.length ? interests : ['equities', 'etfs', 'fixed-income'];
  const selectedRegions = regions.length ? regions : ['global'];

  const store = await readStore();
  const planConfig = getPlanConfig(plan);
  const publishedArticles = sortByNewsPriority(store.articles
    .filter((article) => article.status === 'published')
    .filter((article) => matchesRegion(article.region, selectedRegions))
    .filter((article) => selectedInterests.includes(article.interest) || article.interest === 'retirement' || article.interest === 'income'));

  const groupedAreas = selectedInterests.map((interestId) => {
    const areaArticles = publishedArticles
      .filter((article) => article.interest === interestId)
      .filter((article) => article.contentType !== 'learning')
      .slice(0, 3)
      .map((article) => toPublicArticle(article, planConfig));

    return {
      id: interestId,
      label: getInterestLabel(interestId),
      summary: `${getInterestLabel(interestId)} made simpler for ${getRegionsLabel(selectedRegions)} readers.`,
      articles: areaArticles,
    };
  });

  const learningPoints = (await getActiveLearningPoints()).map((article) => toPublicArticle(article, planConfig));

  const featured = publishedArticles[0] ? toPublicArticle(publishedArticles[0], planConfig) : null;

  return {
    featured,
    areas: groupedAreas,
    learningPoints,
  };
}

function getRegionsLabel(regions) {
  if (!regions.length || regions.includes('global')) {
    return 'Global';
  }

  if (regions.length > 2) {
    return 'your selected regions';
  }

  return regions.map((regionId) => getRegionLabel(regionId)).join(' & ');
}

/* ════════════════════════════════════════════════════════════════════════
   LEARNING POINTS — homepage rotation
   ───────────────────────────────────────────────────────────────────────
   Keeps exactly LEARNING_ROTATION_SLOT_COUNT (10) Learning Points "active"
   on the homepage at a time, swapping the whole set out for a fresh one
   every LEARNING_ROTATION_INTERVAL_MS (2 days) — no admin interference
   required. Two sources compete for the 10 slots:

   - Admin-picked topics (anything with contentType 'learning' whose
     `source` isn't 'trending-auto') ALWAYS fill first, oldest-scheduled
     first — "my article takes priority over AI chosen ones."
   - Whatever slots are left are filled by trending auto-picks (see
     autoGenerateTrendingLearningPoint() below), newest first. If there
     aren't enough already sitting in the pool, topUpTrendingLearningPool()
     generates more on the spot before the rotation runs, so the homepage
     is never short a card just because nobody clicked a button.

   Articles rotated OUT are set to status 'archived' — not deleted — so
   they show up in Admin → Inventory and can be rescheduled at any time
   (the existing "Schedule" button already works on any non-scheduled
   status, archived included).

   Rotation state lives at store.meta.learningRotation = { lastRotatedAt,
   activeIds }. Rotation is checked (and only actually run) whenever
   getHomeExperience() is called — a lazy/on-request pattern, same as
   publishDueArticles() above, since this plain-Node server has no cron.
   ════════════════════════════════════════════════════════════════════════ */
export async function getActiveLearningPoints() {
  await publishDueArticles();

  const store = await readStore();
  const rotation = store.meta.learningRotation || { lastRotatedAt: null, activeIds: [] };
  const rotationDue = !rotation.lastRotatedAt || Date.now() - new Date(rotation.lastRotatedAt).getTime() >= LEARNING_ROTATION_INTERVAL_MS;

  if (rotationDue) {
    // Rotate FIRST, using whatever is already in the pool, then top up in
    // the background for the next cycle.
    //
    // This used to await topUpTrendingLearningPool() before rotating —
    // which meant a homepage request could sit through up to 10 sequential
    // AI writing calls (minutes) before responding. Railway cuts the
    // request off long before that finishes, so the generated articles
    // were never saved and no new Learning Points ever appeared. The
    // top-up is now fire-and-forget: it keeps running server-side after
    // the page has already been served.
    await rotateLearningPointsNow();

    void topUpTrendingLearningPool().catch((error) => {
      console.error('[articleService] Background Learning Points top-up failed:', error.message);
    });
  }

  const finalStore = await readStore();
  const activeIds = finalStore.meta.learningRotation?.activeIds || [];
  return activeIds.map((id) => finalStore.articles.find((article) => article.id === id)).filter(Boolean);
}

// Generates fresh trending Learning Points (see autoGenerateTrendingLearningPoint
// below) until the combined admin + auto pool can fill all 10 homepage
// slots, or until pickTrendingLearningTopic() has nothing left to offer
// (e.g. no news API keys configured, or every provider failed this cycle).
let topUpInFlight = false;

async function topUpTrendingLearningPool() {
  // Guard against two overlapping homepage requests both kicking off a
  // top-up and double-writing the store.
  if (topUpInFlight) {
    console.log('[articleService] Learning Points top-up already running — skipping this trigger.');
    return;
  }
  topUpInFlight = true;

  try {
    const store = await readStore();
    const isEligible = (article) =>
      article.contentType === 'learning' && (article.status === 'scheduled' || article.status === 'published');

    const currentCount = store.articles.filter(isEligible).length;
    const gap = Math.min(LEARNING_ROTATION_SLOT_COUNT - currentCount, MAX_AUTO_GENERATIONS_PER_CYCLE);

    if (gap <= 0) {
      console.log(`[articleService] Learning Points pool is full (${currentCount} eligible) — nothing to generate.`);
      return;
    }

    console.log(`[articleService] Generating ${gap} trending Learning Point(s) in the background…`);

    for (let i = 0; i < gap; i += 1) {
      const generated = await autoGenerateTrendingLearningPoint({ accessTier: 'free', region: 'global' });
      if (!generated) {
        console.warn('[articleService] Ran out of trending topics while topping up Learning Points — homepage may show fewer than 10 until more news comes in.');
        break;
      }
      console.log(`[articleService] Generated trending Learning Point: "${generated.headline}"`);
    }
  } finally {
    topUpInFlight = false;
  }
}

async function rotateLearningPointsNow() {
  await updateStore((store) => {
    const rotation = store.meta.learningRotation || { lastRotatedAt: null, activeIds: [] };
    const now = new Date().toISOString();

    // Archive whatever was active before this rotation — moved to
    // Inventory, never deleted, so any of them (admin-picked or trending)
    // can be rescheduled later.
    for (const id of rotation.activeIds || []) {
      const article = store.articles.find((entry) => entry.id === id);
      if (article && (article.status === 'published' || article.status === 'scheduled')) {
        article.status = 'archived';
        article.updatedAt = now;
      }
    }

    const eligible = store.articles.filter(
      (article) => article.contentType === 'learning' && (article.status === 'scheduled' || article.status === 'published'),
    );

    const adminPicks = eligible
      .filter((article) => article.source !== 'trending-auto')
      .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());
    const autoPicks = eligible
      .filter((article) => article.source === 'trending-auto')
      .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());

    const nextActive = [...adminPicks, ...autoPicks].slice(0, LEARNING_ROTATION_SLOT_COUNT);

    // Selected articles must actually be live for readers, not merely
    // eligible — a 'scheduled' pick that just got chosen publishes now.
    for (const article of nextActive) {
      if (article.status === 'scheduled') {
        article.status = 'published';
        article.updatedAt = now;
      }
    }

    store.meta.learningRotation = {
      lastRotatedAt: now,
      activeIds: nextActive.map((article) => article.id),
    };

    return store;
  });
}

/* ════════════════════════════════════════════════════════════════════════
   ARTICLE BANK — discovery queue
   ───────────────────────────────────────────────────────────────────────
   Deliberately NOT called from getHomeExperience() (the homepage just
   reads already-published articles). This runs only when the admin clicks
   "Discover candidates" in the Article Bank page. It pulls fresh headlines
   from the news APIs, AI-rewrites each one into an original article (see
   writerService.js — never reproduces the source's own text), and saves
   them with status: 'candidate' — a holding queue the admin reviews and
   either Publishes or Schedules from the existing Inventory page, exactly
   like a manually-written draft. Nothing here auto-publishes.
   ════════════════════════════════════════════════════════════════════════ */
export async function discoverArticleCandidates({ regions = ['global'], interests = [], limit = 12 } = {}) {
  const selectedInterests = interests.length ? interests : DEFAULT_MEMBER_INTERESTS;
  const selectedRegions = regions.length ? regions : ['global'];
  const perInterestLimit = Math.max(1, Math.ceil(limit / selectedInterests.length));

  const discoveredSlugs = [];

  for (const interest of selectedInterests) {
    const payload = await getNews({
      tier: 'premium',
      regions: selectedRegions,
      asset: interest,
      query: '',
    });

    const topItems = (payload.items || []).slice(0, perInterestLimit);
    for (const item of topItems) {
      const result = await upsertNewsArticle(item, { defaultStatus: 'candidate' });
      if (result.wasNew) {
        discoveredSlugs.push(result.slug);
      }
      if (discoveredSlugs.length >= limit) {
        break;
      }
    }

    if (discoveredSlugs.length >= limit) {
      break;
    }
  }

  return {
    discovered: discoveredSlugs.length,
    slugs: discoveredSlugs,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   VISUALS — attach a Pexels photo or a Gamma-generated infographic to an
   existing article. Both do a targeted, safe partial update — only the
   image field changes, nothing else about the article is touched.
   ════════════════════════════════════════════════════════════════════════ */
export async function attachPexelsImage(articleId, query) {
  const image = await searchPexelsImage(query);
  if (!image) {
    return null;
  }

  const updated = await updateStore((store) => {
    const article = store.articles.find((entry) => entry.id === articleId);
    if (!article) {
      throw new Error('Article not found.');
    }
    article.heroImage = image;
    article.updatedAt = new Date().toISOString();
    return store;
  });

  return updated.articles.find((entry) => entry.id === articleId);
}

export async function attachGammaInfographic(articleId) {
  const store = await readStore();
  const article = store.articles.find((entry) => entry.id === articleId);
  if (!article) {
    throw new Error('Article not found.');
  }

  const imagePath = await generateGammaInfographic({
    headline: article.headline,
    infographic: article.infographic,
  });

  if (!imagePath) {
    return null;
  }

  const updated = await updateStore((store) => {
    const target = store.articles.find((entry) => entry.id === articleId);
    if (!target) {
      throw new Error('Article not found.');
    }
    target.infographicImageUrl = imagePath;
    target.updatedAt = new Date().toISOString();
    return store;
  });

  return updated.articles.find((entry) => entry.id === articleId);
}

export async function getArticleBySlug({ slug, plan = 'free' }) {
  await publishDueArticles();
  const store = await readStore();
  const article = store.articles.find((entry) => entry.slug === slug);
  if (!article) {
    return null;
  }

  return toFullArticle(article, getPlanConfig(plan));
}

export async function getAdminArticles() {
  await publishDueArticles();
  const store = await readStore();
  return [...store.articles].sort(
    (left, right) => new Date(right.updatedAt || right.publishAt).getTime() - new Date(left.updatedAt || left.publishAt).getTime(),
  );
}

export async function saveAdminArticle(payload) {
  const nextArticle = {
    id: payload.id || crypto.randomUUID(),
    slug: payload.slug || slugify(payload.headline || payload.topic || `article-${Date.now()}`),
    headline: payload.headline,
    contentType: payload.contentType || 'learning',
    accessTier: payload.accessTier || 'free',
    region: payload.region || 'global',
    interest: payload.interest || 'equities',
    status: payload.status || 'draft',
    publishAt: payload.publishAt || new Date().toISOString(),
    source: payload.source || 'Dr MoneyWise Desk',
    sourceUrl: payload.sourceUrl || '',
    summary: payload.summary || '',
    plainEnglish: payload.plainEnglish || '',
    whyItMatters: payload.whyItMatters || '',
    everydayExample: payload.everydayExample || '',
    takeaways: payload.takeaways || [],
    jargonBuster: payload.jargonBuster || [],
    infographic: payload.infographic || { title: 'Quick breakdown', items: [] },
    bodySections: payload.bodySections || [],
    tags: payload.tags || [],
    readingTime: payload.readingTime || '4 min read',
    engineSlot: payload.engineSlot || 'writerA',
    heroMood: payload.heroMood || payload.interest || 'equities',
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateStore((store) => {
    const index = store.articles.findIndex((article) => article.id === nextArticle.id || article.slug === nextArticle.slug);
    if (index >= 0) {
      store.articles[index] = {
        ...store.articles[index],
        ...nextArticle,
      };
    } else {
      store.articles.push(nextArticle);
    }
    return store;
  });

  return nextArticle;
}

export async function generateLearningPointDraft(payload) {
  const generated = await createLearningArticleFromTopic(
    payload.topic,
    payload.accessTier || 'free',
    payload.region || 'global',
    payload.interest || 'equities',
    payload.model || '',
  );

  return saveAdminArticle({
    headline: generated.headline,
    contentType: 'learning',
    accessTier: payload.accessTier || 'free',
    region: payload.region || 'global',
    interest: payload.interest || 'equities',
    status: payload.status || 'draft',
    publishAt: payload.publishAt || new Date().toISOString(),
    source: 'Dr MoneyWise Learning Point',
    summary: generated.summary,
    plainEnglish: generated.plainEnglish,
    whyItMatters: generated.whyItMatters,
    everydayExample: generated.everydayExample,
    takeaways: generated.takeaways,
    jargonBuster: generated.jargonBuster,
    infographic: generated.infographic,
    bodySections: [
      { heading: 'The simple version', body: generated.plainEnglish },
      { heading: 'Why this matters', body: generated.whyItMatters },
      { heading: 'Everyday example', body: generated.everydayExample },
    ],
    tags: ['learning', payload.interest || 'equities'],
    readingTime: '5 min read',
    engineSlot: generated.writerSlot,
    heroMood: payload.interest || 'equities',
  });
}

/* ════════════════════════════════════════════════════════════════════════
   LEARNING POINTS — trending auto-pick
   ───────────────────────────────────────────────────────────────────────
   Picks the single highest-scoring trending topic (see trendingService.js)
   that hasn't been auto-covered recently, writes a Learning Point about it,
   and auto-attaches a Pexels photo (free, instant — safe to do
   automatically). Gamma infographics are NOT auto-attached here on
   purpose: Gamma requires a paid Pro+ plan and bills per call, so
   attaching one automatically to every trending pick could run up cost
   without Imran seeing it happen first — that stays a manual button in
   Admin → AI Writer, same as for any other article.

   Always writes using the SIMPLE/free-tier prompt style (see
   writerService.buildArticlePrompt), regardless of which accessTier the
   article is actually published under — Learning Points exist to explain
   things in plain language with a real-life example; the "professional
   tone" prompt variant is meant for paid-tier News articles, not this.

   Saved with status 'scheduled' (not published immediately) and
   source: 'trending-auto', so it shows up in Inventory for review same as
   anything else, and is distinguishable from admin-picked topics.
   ════════════════════════════════════════════════════════════════════════ */
export async function autoGenerateTrendingLearningPoint({ accessTier = 'free', region = 'global' } = {}) {
  const store = await readStore();
  const recentTopics = store.articles
    .filter((article) => article.contentType === 'learning' && article.source === 'trending-auto' && article.trendingTopic)
    .slice(-15)
    .map((article) => article.trendingTopic);

  const topic = await pickTrendingLearningTopic({ excludeTopics: recentTopics });
  if (!topic) {
    console.warn('[articleService] No trending topic available for the Learning Points auto-pick right now.');
    return null;
  }

  const interest = guessInterestFromTopic(topic.label);

  const generated = await createLearningArticleFromTopic(
    topic.label,
    'free', // forces the simple-language prompt — see note above
    region,
    interest,
    '',
  );

  const saved = await saveAdminArticle({
    headline: generated.headline,
    contentType: 'learning',
    accessTier,
    region,
    interest,
    status: 'scheduled',
    publishAt: new Date().toISOString(),
    source: 'trending-auto',
    summary: generated.summary,
    plainEnglish: generated.plainEnglish,
    whyItMatters: generated.whyItMatters,
    everydayExample: generated.everydayExample,
    takeaways: generated.takeaways,
    jargonBuster: generated.jargonBuster,
    infographic: generated.infographic,
    bodySections: [
      { heading: 'The simple version', body: generated.plainEnglish },
      { heading: 'Why this matters', body: generated.whyItMatters },
      { heading: 'Everyday example', body: generated.everydayExample },
    ],
    tags: ['learning', 'trending', interest],
    readingTime: '5 min read',
    engineSlot: generated.writerSlot,
    heroMood: interest,
  });

  // Record which trending topic this came from, so future auto-picks can
  // avoid repeating it (see recentTopics above). saveAdminArticle doesn't
  // know about this field, so it's patched in as a small follow-up write.
  await updateStore((storeToPatch) => {
    const target = storeToPatch.articles.find((article) => article.id === saved.id);
    if (target) {
      target.trendingTopic = topic.label;
    }
    return storeToPatch;
  });

  try {
    await attachPexelsImage(saved.id, generated.headline);
  } catch (error) {
    console.error('[articleService] Auto Pexels attach failed for trending Learning Point:', error.message);
  }

  return { ...saved, trendingTopic: topic.label };
}

function guessInterestFromTopic(label) {
  const lower = label.toLowerCase();
  if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('ethereum')) {
    return 'crypto';
  }
  if (lower.includes('bond') || lower.includes('yield') || lower.includes('treasury') || lower.includes('rate')) {
    return 'fixed-income';
  }
  if (lower.includes('oil') || lower.includes('gold') || lower.includes('metal')) {
    return 'commodities';
  }
  if (lower.includes('etf') || lower.includes('fund')) {
    return 'etfs';
  }
  if (lower.includes('dollar') || lower.includes('euro') || lower.includes('yen') || lower.includes('currency')) {
    return 'fx';
  }
  return 'equities';
}

export async function deleteArticleById(id) {
  await updateStore((store) => {
    store.articles = store.articles.filter((article) => article.id !== id);
    return store;
  });
}

async function upsertNewsArticle(item, { defaultStatus = 'candidate' } = {}) {
  const generated = await summarizeNewsItem(item);
  const slug = slugify(`${item.title}-${item.id || item.source || 'story'}`);
  let wasNew = false;

  await updateStore((store) => {
    const existingIndex = store.articles.findIndex((article) => article.slug === slug);
    wasNew = existingIndex < 0;

    const nextArticle = {
      id: existingIndex >= 0 ? store.articles[existingIndex].id : crypto.randomUUID(),
      slug,
      headline: item.title,
      contentType: 'news',
      accessTier: item.accessTier || 'free',
      region: item.region || 'global',
      interest: item.asset || 'equities',
      // Only set status/publishAt on first discovery — re-running discovery and
      // finding the same headline again must never revert an article the admin
      // has already reviewed, scheduled, or published.
      status: existingIndex >= 0 ? store.articles[existingIndex].status : defaultStatus,
      publishAt: existingIndex >= 0 ? store.articles[existingIndex].publishAt : (item.publishedAt || new Date().toISOString()),
      source: item.source || 'Market feed',
      sourceUrl: item.url || '',
      summary: generated.summary,
      plainEnglish: generated.plainEnglish,
      whyItMatters: generated.whyItMatters,
      everydayExample: generated.everydayExample,
      takeaways: generated.takeaways,
      jargonBuster: generated.jargonBuster,
      infographic: generated.infographic,
      bodySections: [
        { heading: 'What happened', body: generated.summary },
        { heading: 'In plain English', body: generated.plainEnglish },
        { heading: 'Why readers should care', body: generated.whyItMatters },
      ],
      tags: [...new Set([item.asset, item.region, ...(item.topics || [])].filter(Boolean))],
      readingTime: item.readTime ? `${item.readTime} read` : '4 min read',
      engineSlot: generated.writerSlot,
      heroMood: item.asset || 'equities',
      createdAt: existingIndex >= 0 ? store.articles[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalPublishedAt: item.publishedAt || '',
      sentiment: item.sentiment || 'neutral',
    };

    if (existingIndex >= 0) {
      store.articles[existingIndex] = {
        ...store.articles[existingIndex],
        ...nextArticle,
      };
    } else {
      store.articles.push(nextArticle);
    }
    return store;
  });

  return { slug, wasNew };
}

function toPublicArticle(article, plan) {
  const accessible = canAccess(plan, article.accessTier || 'free');
  return {
    id: article.id,
    slug: article.slug,
    headline: article.headline,
    contentType: article.contentType,
    accessTier: article.accessTier || 'free',
    region: article.region,
    interest: article.interest,
    source: article.source,
    publishAt: article.publishAt,
    summary: accessible ? article.summary : article.summary,
    preview: article.plainEnglish || article.summary,
    accessible,
    tags: article.tags || [],
    readingTime: article.readingTime || '4 min read',
    heroImage: article.heroImage || null,
  };
}

function toFullArticle(article, plan) {
  const accessible = canAccess(plan, article.accessTier || 'free');
  return {
    ...article,
    accessible,
    lockedMessage: accessible
      ? ''
      : article.accessTier === 'premium'
        ? 'Upgrade to Premium to read the full article, visual breakdown, and learning extras.'
        : 'Upgrade to Regular or Premium to read the full article and member extras.',
    visibleSections: accessible ? article.bodySections : article.bodySections.slice(0, 1),
    visibleTakeaways: accessible ? article.takeaways : article.takeaways.slice(0, 1),
    visibleJargon: accessible ? article.jargonBuster : article.jargonBuster.slice(0, 1),
  };
}

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 80);
}

export function getPlanCatalog() {
  return getConfiguredPlanCatalog();
}
