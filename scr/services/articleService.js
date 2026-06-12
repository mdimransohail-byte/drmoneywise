import crypto from 'node:crypto';

import { canAccess, getInterestLabel, getPlanCatalog as getConfiguredPlanCatalog, getPlanConfig, getRegionLabel } from '../config.js';
import { getNews } from './newsService.js';
import { readStore, updateStore } from './storeService.js';
import { createLearningArticleFromTopic, summarizeNewsItem } from './writerService.js';
import { sortByNewsPriority } from '../utils/filters.js';

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

export async function getHomeExperience({ region = 'global', interests = [], plan = 'free' } = {}) {
  await publishDueArticles();
  const selectedInterests = interests.length ? interests : ['equities', 'etfs', 'fixed-income'];
  await ingestLatestNews({ region, interests: selectedInterests });

  const store = await readStore();
  const planConfig = getPlanConfig(plan);
  const publishedArticles = sortByNewsPriority(store.articles
    .filter((article) => article.status === 'published')
    .filter((article) => article.region === region || article.region === 'global' || region === 'global')
    .filter((article) => selectedInterests.includes(article.interest) || article.interest === 'retirement' || article.interest === 'income'));

  const groupedAreas = selectedInterests.map((interestId) => {
    const areaArticles = publishedArticles
      .filter((article) => article.interest === interestId)
      .slice(0, 3)
      .map((article) => toPublicArticle(article, planConfig));

    return {
      id: interestId,
      label: getInterestLabel(interestId),
      summary: `${getInterestLabel(interestId)} made simpler for ${getRegionLabel(region)} readers.`,
      articles: areaArticles,
    };
  });

  const learningPoints = publishedArticles
    .filter((article) => article.contentType === 'learning')
    .slice(0, 6)
    .map((article) => toPublicArticle(article, planConfig));

  const featured = publishedArticles[0] ? toPublicArticle(publishedArticles[0], planConfig) : null;

  return {
    featured,
    areas: groupedAreas,
    learningPoints,
    summaryStrip: buildSummaryStrip(groupedAreas),
  };
}

export async function ingestLatestNews({ region = 'global', interests = [] } = {}) {
  const selectedInterests = interests.length ? interests : ['equities', 'etfs', 'fixed-income'];

  for (const interest of selectedInterests) {
    const payload = await getNews({
      tier: 'premium',
      region,
      asset: interest,
      query: '',
    });

    const topItems = (payload.items || []).slice(0, 3);
    for (const item of topItems) {
      await upsertNewsArticle(item);
    }
  }
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

export async function deleteArticleById(id) {
  await updateStore((store) => {
    store.articles = store.articles.filter((article) => article.id !== id);
    return store;
  });
}

async function upsertNewsArticle(item) {
  const generated = await summarizeNewsItem(item);
  const slug = slugify(`${item.title}-${item.id || item.source || 'story'}`);

  await updateStore((store) => {
    const existingIndex = store.articles.findIndex((article) => article.slug === slug);
    const nextArticle = {
      id: existingIndex >= 0 ? store.articles[existingIndex].id : crypto.randomUUID(),
      slug,
      headline: item.title,
      contentType: 'news',
      accessTier: item.accessTier || 'free',
      region: item.region || 'global',
      interest: item.asset || 'equities',
      status: 'published',
      publishAt: item.publishedAt || new Date().toISOString(),
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

function buildSummaryStrip(groupedAreas) {
  return groupedAreas.map((area) => ({
    label: area.label,
    articleCount: area.articles.length,
    highlight: area.articles[0]?.headline || 'Fresh stories loading',
  }));
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
