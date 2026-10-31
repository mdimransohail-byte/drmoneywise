import crypto from 'node:crypto';

import { canAccess, DEFAULT_MEMBER_INTERESTS, getInterestLabel, getPlanCatalog as getConfiguredPlanCatalog, getPlanConfig, getRegionLabel } from '../config.js';
import { getNews } from './newsService.js';
import { readStore, updateStore } from './storeService.js';
import { createLearningArticleFromTopic, summarizeNewsItem } from './writerService.js';
import { generateGammaInfographic, searchPexelsImage } from './visualsService.js';
import { pickTrendingLearningTopic } from './trendingService.js';
import { matchesRegion, sortByNewsPriority } from '../utils/filters.js';
import { checkArticle } from './qualityService.js';
import { cleanSections, infographicHtml, quizHtml } from './learnVisuals.js';
import { levelOf } from '../data/learnLevels.js';
import { lessonForArticle } from '../data/learnCourse.js';
import { taDiagramHtml } from './taDiagrams.js';

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
// Each change swaps the 5 oldest for 5 new ones (the 5 newest stay), which
// halves the writing needed (~75 a month instead of ~150).
const LEARNING_SWAP_PER_CYCLE = 5;

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

  let learningPoints = [];
  try {
    learningPoints = (await getActiveLearningPoints()).map((article) => toPublicArticle(article, planConfig));
  } catch (error) {
    // A failure here must not take down /api/site/home — that endpoint also
    // feeds other homepage sections, so a 500 blanks more than just this one.
    console.error('[articleService] Could not build Learning Points for the homepage:', error.message);
  }

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
  // Older stores (and any hand-edited platform-store.json) may not have a
  // meta object at all — reading meta.learningRotation off undefined threw
  // a TypeError that propagated up through getHomeExperience() and made
  // /api/site/home return a 500, which blanked BOTH the Learning Points
  // and the Explore by Interest sections while Top Story (a separate
  // endpoint) kept working fine.
  const rotation = store.meta?.learningRotation || { lastRotatedAt: null, activeIds: [] };
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
    try {
      await rotateLearningPointsNow();
    } catch (error) {
      console.error('[articleService] Learning Points rotation failed:', error.message);
    }

    void topUpTrendingLearningPool().catch((error) => {
      console.error('[articleService] Background Learning Points top-up failed:', error.message);
    });
  }

  const finalStore = await readStore();
  const activeIds = finalStore.meta?.learningRotation?.activeIds || [];
  const active = activeIds.map((id) => finalStore.articles.find((article) => article.id === id)).filter(Boolean);

  if (active.length) {
    return active;
  }

  // Fallback: if rotation hasn't produced a set yet (fresh store, failed
  // rotation, or nothing generated so far), show published Learning Points
  // directly rather than an empty section.
  console.warn('[articleService] No rotated Learning Points available — falling back to published Learning Points.');
  return finalStore.articles
    .filter((article) => article.contentType === 'learning' && article.status === 'published')
    .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime())
    .slice(0, LEARNING_ROTATION_SLOT_COUNT);
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
    return { written: 0, busy: true };
  }
  topUpInFlight = true;
  let written = 0;

  try {
    const store = await readStore();
    const isEligible = (article) =>
      article.contentType === 'learning' && (article.status === 'scheduled' || article.status === 'published');

    // Count only explainers WAITING for the next change (scheduled). The ones
    // on the homepage now are archived at the next change, so counting them
    // too left the next set short (e.g. 8 of 10 with 0 waiting).
    const currentCount = store.articles.filter((article) => isEligible(article) && article.status === 'scheduled').length;
    const gap = Math.min(LEARNING_SWAP_PER_CYCLE - currentCount, MAX_AUTO_GENERATIONS_PER_CYCLE);

    if (gap <= 0) {
      console.log(`[articleService] Learning Points pool is full (${currentCount} eligible) — nothing to generate.`);
      return { written: 0, full: true };
    }

    console.log(`[articleService] Generating ${gap} trending Learning Point(s) in the background…`);

    for (let i = 0; i < gap; i += 1) {
      const generated = await autoGenerateTrendingLearningPoint({ accessTier: 'free', region: 'global' });
      if (!generated) {
        console.warn('[articleService] Stopped topping up: no topic, or the writing service did not answer (see the line above).');
        break;
      }
      written += 1;
      console.log(`[articleService] Generated trending Learning Point: "${generated.headline}"`);
    }
    return { written, wanted: gap };
  } finally {
    topUpInFlight = false;
  }
}

async function rotateLearningPointsNow() {
  await updateStore((store) => {
    if (!store.meta) {
      store.meta = { createdAt: new Date().toISOString() };
    }
    const rotation = store.meta.learningRotation || { lastRotatedAt: null, activeIds: [] };
    const now = new Date().toISOString();

    // Keep the newest (10 − 5) of the current set; archive the older ones —
    // moved to Inventory, never deleted, so they can be rescheduled later.
    const current = (rotation.activeIds || [])
      .map((id) => store.articles.find((entry) => entry.id === id))
      .filter((article) => article && (article.status === 'published' || article.status === 'scheduled'))
      .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
    const keep = current.slice(0, LEARNING_ROTATION_SLOT_COUNT - LEARNING_SWAP_PER_CYCLE);
    for (const article of current.slice(keep.length)) {
      article.status = 'archived';
      article.updatedAt = now;
    }

    const eligible = store.articles.filter(
      (article) => article.contentType === 'learning' && (article.status === 'scheduled' || article.status === 'published') && !keep.includes(article),
    );

    const adminPicks = eligible
      .filter((article) => article.source !== 'trending-auto')
      .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());
    const autoPicks = eligible
      .filter((article) => article.source === 'trending-auto')
      .filter((article) => {
        const quality = checkArticle(article);
        if (!quality.ok) console.warn(`[articleService] Skipped in rotation (failed checks) — "${article.headline}": ${quality.issues.join('; ')}`);
        return quality.ok;
      })
      .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());

    const nextActive = [...keep, ...adminPicks, ...autoPicks].slice(0, LEARNING_ROTATION_SLOT_COUNT);

    // Not enough new ones? Keep the most recent of the outgoing set on the
    // homepage so it never shows fewer than 10 when we have them.
    if (nextActive.length < LEARNING_ROTATION_SLOT_COUNT) {
      const refill = (rotation.activeIds || [])
        .map((id) => store.articles.find((entry) => entry.id === id))
        .filter((article) => article && article.status === 'archived' && !nextActive.includes(article))
        .slice(0, LEARNING_ROTATION_SLOT_COUNT - nextActive.length);
      for (const article of refill) {
        article.status = 'published';
        article.updatedAt = now;
        nextActive.push(article);
      }
      if (refill.length) console.log(`[articleService] Only ${nextActive.length - refill.length} new explainers ready — kept ${refill.length} more from the last set.`);
    }

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

  const full = toFullArticle(article, getPlanConfig(plan));
  if (full.level) {
    const { levelNames, LEVELS } = await import('../data/learnLevels.js');
    const { lessonForArticle } = await import('../data/learnCourse.js');
    const L = LEVELS[full.level];
    const lesson = lessonForArticle(article);
    full.levelInfo = { name: (await levelNames())[full.level], slug: L.slug, colour: L.colour, who: lesson ? `Week ${lesson.week} · Lesson ${lesson.n}` : L.who, week: lesson?.week || null };
  }
  return full;
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
    ...Object.fromEntries(['level', 'quiz', 'chart', 'format', 'courseId'].filter((k) => payload[k] !== undefined).map((k) => [k, payload[k]])),
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
  const level = payload.level === 'intermediate' || payload.level === 'beginner' ? payload.level : levelOf(String(payload.topic || ''));
  const generated = await createLearningArticleFromTopic(
    payload.topic,
    payload.accessTier || 'free',
    payload.region || 'global',
    payload.interest || 'equities',
    payload.model || '',
    '',
    level,
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
    ...learnFields(generated, level),
    tags: ['learning', payload.interest || 'equities'],
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
    .slice(-200) // topics list cycles through everything before repeating
    .map((article) => article.trendingTopic);

  const topic = await pickTrendingLearningTopic({ excludeTopics: recentTopics });
  if (!topic) {
    console.warn('[articleService] No trending topic available for the Learning Points auto-pick right now.');
    return null;
  }

  const interest = guessInterestFromTopic(topic.writerTopic || topic.label);
  const level = topic.level || levelOf(topic.label);

  // Give the writer the real headline for context, not just the bare phrase.
  // The topic is the headline idea; the latest figure goes in as context
  // (passing both as the headline made writers copy the instructions into it).
  const context = topic.sampleHeadline && topic.sampleHeadline !== topic.label ? topic.sampleHeadline : '';
  const generated = await createLearningArticleFromTopic(
    topic.writerTopic || topic.label,
    level === 'technical' ? 'regular' : 'free', // simple-language lesson prompt either way (writerService)
    region,
    interest,
    '',
    context,
    level,
  );
  // Belt and braces: drop any instruction text a writer copied into the headline.
  generated.headline = String(generated.headline || topic.label).replace(/\s+[—-]\s+explain for everyday savers.*$/iu, '').trim();
  // Course lessons keep their planned headline
  if (topic.courseId) generated.headline = topic.label;

  // If no writing service answered, the writer returns a basic placeholder.
  // Never save those — try again next run.
  if (generated.provider === 'local-fallback') {
    console.warn(`[articleService] Writing service did not answer for "${topic.label}" — nothing saved, will retry next run.`);
    return null;
  }

  // Quality checks (src/services/qualityService.js): anything that fails is
  // kept as a draft for a human read instead of going live.
  const quality = checkArticle(generated);
  if (!quality.ok) {
    console.warn(`[articleService] Held for review — "${generated.headline}": ${quality.issues.join('; ')}`);
  }

  const saved = await saveAdminArticle({
    headline: generated.headline,
    contentType: 'learning',
    accessTier: level === 'technical' ? 'regular' : accessTier, // Chart Readers lessons are for members
    region,
    interest,
    status: quality.ok ? 'scheduled' : 'draft',
    publishAt: new Date().toISOString(),
    source: 'trending-auto',
    summary: generated.summary,
    plainEnglish: generated.plainEnglish,
    whyItMatters: generated.whyItMatters,
    everydayExample: generated.everydayExample,
    takeaways: generated.takeaways,
    jargonBuster: generated.jargonBuster,
    infographic: generated.infographic,
    ...learnFields(generated, level),
    tags: ['learning', 'trending', interest],
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
      if (topic.courseId) target.courseId = topic.courseId;
      target.qualityIssues = quality.issues;
      target.qualityCheckedAt = new Date().toISOString();
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

/* The new six-section explainers (writerService buildLearnPrompt) go in
   as they are; older three-field ones keep their three sections. */
function learnFields(generated, level) {
  const sections = generated.format === 2 && Array.isArray(generated.sections) ? generated.sections : null;
  const body = sections || [
    { heading: 'The simple version', body: generated.plainEnglish },
    { heading: 'Why this matters', body: generated.whyItMatters },
    { heading: 'Everyday example', body: generated.everydayExample },
  ];
  const wordsCount = body.reduce((n, s) => n + String(s.body || '').split(/\s+/u).length, 0);
  return {
    bodySections: body,
    level,
    quiz: generated.quiz || [],
    chart: generated.chart || { points: [] },
    format: sections ? 2 : 1,
    readingTime: `${Math.max(3, Math.round(wordsCount / 200))} min read`,
  };
}

/* Chart Readers lessons get a drawn diagram (src/services/taDiagrams.js) */
function diagramFor(article) {
  const lesson = lessonForArticle(article);
  return lesson?.level === 'technical' ? taDiagramHtml(lesson.id) : '';
}

function toFullArticle(article, plan) {
  const accessible = canAccess(plan, article.accessTier || 'free');
  const sections = cleanSections(article, article.bodySections || []);
  const visibleTakeaways = accessible ? article.takeaways || [] : (article.takeaways || []).slice(0, 1);
  const visual = { ...article, visibleTakeaways };
  return {
    ...article,
    accessible,
    lockedMessage: accessible
      ? ''
      : article.accessTier === 'premium'
        ? 'Upgrade to Premium to read the full article, visual breakdown, and learning extras.'
        : 'Upgrade to Regular or Premium to read the full article and member extras.',
    visibleSections: accessible ? sections : sections.slice(0, 1),
    visibleTakeaways,
    visibleJargon: accessible ? article.jargonBuster || [] : (article.jargonBuster || []).slice(0, 1),
    level: article.contentType === 'learning' ? levelOf(article) : '',
    visualHtml: accessible && !article.infographicImageUrl ? infographicHtml(visual) : '',
    quizHtml: accessible ? quizHtml(article) : '',
    diagramHtml: diagramFor(article),
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

/* ── Called by the data engine every few hours (no visitors needed) ── */
export async function runLearningAutopilot() {
  // Explainers held by an earlier, stricter version of the quality checks:
  // check them again and let the ones that now pass join the queue.
  try {
    let released = 0;
    await updateStore((s) => {
      for (const a of s.articles || []) {
        if (a.status !== 'draft' || !['trending-auto', 'deeper-auto'].includes(a.source) || !(a.qualityIssues || []).length || a.adminHeld) continue;
        const again = checkArticle(a);
        if (again.ok) { a.status = 'scheduled'; a.qualityIssues = []; a.qualityCheckedAt = new Date().toISOString(); released += 1; }
      }
      return s;
    });
    if (released) console.log(`[articleService] ${released} held explainer(s) passed the updated checks and joined the queue`);
  } catch (error) {
    console.error('[articleService] Re-checking held explainers failed:', error.message);
  }
  const active = await getActiveLearningPoints();
  // Between changes, keep writing (max 4 per run) until 10 are waiting.
  let topUp = { written: 0 };
  try {
    topUp = (await topUpTrendingLearningPool()) || topUp;
  } catch (error) {
    console.error('[articleService] Autopilot top-up failed:', error.message);
  }
  // Then rewrite one older, short explainer in the new longer format.
  let upgraded = null;
  if (!(topUp.wanted > 0 && topUp.written === 0)) {
    try { upgraded = await upgradeOldLearningArticle(); } catch (error) { console.error('[articleService] Upgrading an older explainer failed:', error.message); }
  }
  const store = await readStore();
  const learning = store.articles.filter((a) => a.contentType === 'learning');
  const waiting = learning.filter((a) => a.status === 'scheduled').length;
  const held = learning.filter((a) => a.status === 'draft' && a.source === 'trending-auto' && (a.qualityIssues || []).length).length;
  const nextRotation = store.meta?.learningRotation?.lastRotatedAt
    ? new Date(new Date(store.meta.learningRotation.lastRotatedAt).getTime() + LEARNING_ROTATION_INTERVAL_MS).toISOString()
    : null;
  const writeFailed = topUp.wanted > 0 && topUp.written === 0;
  return {
    ok: active.length > 0 && !writeFailed,
    message: `${writeFailed ? 'Could not write new explainers — check the writing-service keys (Railway log lines starting [writerService] say why). ' : topUp.written ? `Wrote ${topUp.written} new. ` : ''}${upgraded ? `Rewrote “${upgraded}” in the longer format. ` : ''}${active.length} explainers on the homepage, ${waiting} waiting for the next change${held ? `, ${held} held for review` : ''}${nextRotation ? `; next change ${nextRotation.slice(0, 16).replace('T', ' ')} UTC` : ''}`,
  };
}

/* ── Older explainers → the longer six-section format ──────────────────
   One per autopilot run: the oldest free explainer still in the short
   three-part format is written again (same web address, same headline,
   same photo). If the rewrite fails the checks, the old text stays. */
export async function upgradeOldLearningArticle() {
  const store = await readStore();
  const weekAgo = Date.now() - 7 * 86400000;
  const old = (store.articles || [])
    .filter((a) => a.contentType === 'learning' && a.status === 'published'
      && ((a.accessTier || 'free') === 'free' || (a.tags || []).includes('deeper'))
      && a.format !== 2 && new Date(a.upgradeTriedAt || 0).getTime() < weekAgo)
    .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt))[0];
  if (!old) return null;
  const level = levelOf(old);
  const { lessonForArticle } = await import('../data/learnCourse.js');
  const lesson = lessonForArticle(old);
  const generated = await createLearningArticleFromTopic(lesson ? `${lesson.headline}. The lesson covers: ${lesson.match}` : (old.trendingTopic || old.headline), level === 'lords' ? 'premium' : level === 'technical' ? 'regular' : 'free', old.region || 'global', old.interest || 'equities', '', '', level);
  const quality = generated.provider === 'local-fallback' || generated.format !== 2 ? { ok: false } : checkArticle(generated);
  const fields = quality.ok ? learnFields(generated, level) : null;
  await updateStore((s) => {
    const a = s.articles.find((x) => x.id === old.id);
    if (!a) return s;
    a.upgradeTriedAt = new Date().toISOString();
    if (fields) {
      Object.assign(a, fields, {
        summary: generated.summary || a.summary,
        plainEnglish: generated.plainEnglish, whyItMatters: generated.whyItMatters, everydayExample: generated.everydayExample,
        takeaways: generated.takeaways || a.takeaways, jargonBuster: generated.jargonBuster || a.jargonBuster,
        infographic: generated.infographic || a.infographic, updatedAt: new Date().toISOString(),
        // Same web address; the course's attention-grabbing headline
        ...(lesson ? { headline: lesson.headline, courseId: lesson.id } : {}),
      });
    }
    return s;
  });
  return fields ? old.headline : null;
}

/* ── Deeper explainers (Premium) — data engine job "deeper" ──────────────
   Writes one Premium explainer from DEEPER_TOPICS (src/data/explainerTopics.js)
   in the paid-tier style. Topics are used once before any repeats; quality
   checks decide whether it goes live or waits as a draft. */
export async function writeDeeperExplainer() {
  const { DEEPER_TOPICS } = await import('../data/explainerTopics.js');
  const { lessonsInOrder, lessonForArticle } = await import('../data/learnCourse.js');
  const store = await readStore();
  // Next Lords lesson in course order that hasn't been written yet
  const done = new Set(store.articles.map((a) => lessonForArticle(a)?.id).filter(Boolean));
  const lesson = lessonsInOrder().find((l) => l.level === 'lords' && !done.has(l.id)) || null;
  const used = store.articles.filter((a) => a.source === 'deeper-auto' && a.trendingTopic).map((a) => a.trendingTopic);
  const unused = DEEPER_TOPICS.filter((t) => !used.includes(t));
  const topic = lesson ? lesson.headline : (unused.length ? unused : DEEPER_TOPICS)[0];
  const interest = guessInterestFromTopic(lesson ? lesson.match : topic);
  const generated = await createLearningArticleFromTopic(lesson ? `${lesson.headline}. The lesson covers: ${lesson.match}` : topic, 'premium', 'global', interest, '', '', 'lords');
  if (generated.provider === 'local-fallback') return { ok: false, message: `No writing service answered for "${topic}"; will try again next run` };
  generated.headline = lesson ? lesson.headline : String(generated.headline || topic).trim();
  const quality = checkArticle(generated);
  const saved = await saveAdminArticle({
    headline: generated.headline,
    contentType: 'learning',
    accessTier: 'premium',
    region: 'global',
    interest,
    status: quality.ok ? 'scheduled' : 'draft',
    publishAt: new Date().toISOString(),
    source: 'deeper-auto',
    summary: generated.summary,
    plainEnglish: generated.plainEnglish,
    whyItMatters: generated.whyItMatters,
    everydayExample: generated.everydayExample,
    takeaways: generated.takeaways,
    jargonBuster: generated.jargonBuster,
    infographic: generated.infographic,
    ...learnFields(generated, 'lords'),
    ...(lesson ? { courseId: lesson.id } : {}),
    tags: ['learning', 'deeper', interest],
    engineSlot: generated.writerSlot,
    heroMood: interest,
  });
  await updateStore((s2) => {
    const target = s2.articles.find((a) => a.id === saved.id);
    if (target) { target.trendingTopic = lesson ? lesson.match : topic; target.qualityIssues = quality.issues; target.qualityCheckedAt = new Date().toISOString(); }
    return s2;
  });
  try { await attachPexelsImage(saved.id, generated.headline); } catch (error) { console.error('[articleService] Photo for deeper explainer failed:', error.message); }
  return { ok: true, message: quality.ok ? `Written: "${generated.headline}" (Premium)` : `Written but held as a draft for a read: "${generated.headline}" (${quality.issues.join('; ')})` };
}
