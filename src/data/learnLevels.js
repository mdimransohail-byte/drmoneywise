/* ════════════════════════════════════════════════════════════════════════
   LEARN LEVELS — the two free reading levels on /learn
   ───────────────────────────────────────────────────────────────────────
     beginner      /learn/beginners     default name "Young Guns"   free
     intermediate  /learn/intermediate  default name "Knights"      free
     lords         /learn/advanced      default name "Lords"        Premium
   Each level is taught week by week (src/data/learnCourse.js).
   The names can be changed in Admin → APIs & More → "Learn level names"
   without breaking any links, because the web addresses stay the same.
   Every explainer gets a level: the writer is told which one, and older
   explainers are sorted by their topic, or by the words in their headline.
   ════════════════════════════════════════════════════════════════════════ */

import { readStore } from '../services/storeService.js';
import { lessonForArticle } from './learnCourse.js';

export const LEVELS = {
  beginner: {
    id: 'beginner', slug: 'beginners', defaultName: 'Young Guns', who: 'Beginners',
    colour: '#1baf7a', colour2: '#7be0b8', pathLevel: 'start',
    tagline: 'Brand new to money and investing? Start here.',
    intro: 'Short, friendly explainers that assume you know nothing yet: what a share is, how saving and investing differ, why time matters more than timing. Every idea comes with an everyday example and real numbers.',
    promise: ['No jargon without an explanation', 'Worked examples with real numbers', 'A 3-question check at the end of each lesson'],
  },
  intermediate: {
    id: 'intermediate', slug: 'intermediate', defaultName: 'Knights', who: 'Mid-level investors',
    colour: '#2a78d6', colour2: '#8fc1ff', pathLevel: 'build',
    tagline: 'Know the basics? Sharpen your judgement.',
    intro: 'For readers who already know what a share, a fund and an interest rate are. We go one level deeper: the ratios worth checking, how the economy feeds into prices, and the habits that separate steady investors from busy ones.',
    promise: ['One or two useful ratios per lesson, worked through', 'How professionals think about the same idea', 'Common mistakes and how to avoid them'],
  },
  technical: {
    id: 'technical', slug: 'technical', defaultName: 'Chart Readers', who: 'Regular and Premium members', paid: true,
    colour: '#e8730c', colour2: '#ffb066', pathLevel: 'build',
    tagline: 'Learn to read a share price chart, step by step.',
    intro: 'Technical analysis, explained with pictures: candlesticks, trends, support and resistance, moving averages, RSI, MACD, chart patterns, and how to manage risk. Each lesson has worked examples and a chart, and you can try every idea on any company with our Chart check.',
    promise: ['A clear picture in every lesson', 'Try each idea on a real company', 'The limits, not just the hype'],
  },
  lords: {
    id: 'lords', slug: 'advanced', defaultName: 'Lords', who: 'Confident investors', premium: true,
    colour: '#5b2a9e', colour2: '#8a4fd8', pathLevel: 'confident',
    tagline: 'Read the accounts and the economy like a professional.',
    intro: 'The deeper lessons, for Premium members: cash flow statements, what a share is really worth, the economy’s warning lights and the habits of experienced portfolio builders. Every lesson works through real figures.',
    promise: ['How professionals value a company', 'The warning signs in a company’s figures', 'Advanced portfolio and retirement planning'],
  },
};

/* Topics from src/data/explainerTopics.js that belong to the beginner level.
   Everything else defaults to intermediate. */
const BEGINNER_TOPICS = new Set([
  'How compound growth turns small savings into big sums',
  'Saving versus investing: which money goes where',
  'How big should an emergency fund be?',
  'What a stock actually is, and why prices move',
  'What a bond is, and why bond prices fall when rates rise',
  'Index funds explained: owning the whole market cheaply',
  'ETFs versus mutual funds: what is the difference?',
  'Why fees matter: how a 1% fee eats into 30 years of savings',
  'Risk and reward: why higher returns come with bigger drops',
  'Diversification: why not to put all your eggs in one basket',
  'Dollar-cost averaging: investing the same amount every month',
  'What a dividend is and how companies decide to pay one',
  'Stock splits: why a cheaper share price changes nothing',
  'Bull and bear markets: what the names mean for you',
  'Why trying to time the market usually fails',
  'How inflation quietly shrinks your savings',
  'Why central banks raise and cut interest rates',
  'What GDP measures, and why it matters to you',
  'Exchange rates: why your holiday money changes in value',
  'Oil prices and your wallet: the chain from barrel to pump',
  'Why gold is seen as a safe haven',
  'Tariffs explained: who really pays them',
  'Workplace pensions and employer matching: free money explained',
  'Tax-free accounts around the world: ISA, Roth IRA, PPF and more',
  'Starting to invest in your 20s, 30s, 40s and 50s',
  'Paying off debt versus investing: which comes first?',
  'Good debt and bad debt: how to tell the difference',
  'How credit scores work and how to improve yours',
  'Renting versus buying a home: the money side',
  'Saving for a child’s education: the main options',
  'How to set money goals you will actually keep',
  'Budgeting with the 50/30/20 rule',
  'Lifestyle creep: why spending rises with pay',
  'Bitcoin explained without the hype',
  'Spotting investment scams: the warning signs',
  'Promises of guaranteed returns: why they are a red flag',
  'Fear of missing out: how hype leads to bad buys',
  'Why past performance does not guarantee future returns',
  'How to read financial news without panicking',
]);

const BEGINNER_WORDS = /\b(what (?:is|a|an)|explained simply|beginner|first|budget|saving|savings|emergency|credit score|debt|pension|isa|basics?|start(?:ing)?|scam|inflation quietly|compound)\b/iu;
const KNIGHT_WORDS = /\b(ratio|yield|valuation|cash flow|margin|leverage|rebalanc|allocation|p\/e|eps|ebitda|bond rating|reit|annuit|emerging|duration|buyback|payout|free cash|correction|recession|gdp|unemployment|10-year|federal reserve|currency risk)\b/iu;

/** 'beginner' | 'intermediate' for any article (or topic label). */
export function levelOf(article) {
  if (typeof article === 'string') article = { trendingTopic: article, headline: article };
  if ((article.tags || []).includes('deeper') || article.level === 'lords') return 'lords';
  const lesson = lessonForArticle(article);
  if (lesson) return lesson.level;
  if (article.level === 'beginner' || article.level === 'intermediate') return article.level;
  const topic = article.trendingTopic || '';
  if (BEGINNER_TOPICS.has(topic)) return 'beginner';
  const text = `${topic} ${article.headline || ''}`;
  if (KNIGHT_WORDS.test(text)) return 'intermediate';
  if (BEGINNER_WORDS.test(text)) return 'beginner';
  return topic ? 'intermediate' : 'beginner';
}

/** The names currently in use, e.g. { beginner: 'Young Guns', intermediate: 'Knights', lords: 'Lords' }. */
export async function levelNames() {
  let saved = {};
  try { saved = (await readStore()).settings?.learnLevelNames || {}; } catch { /* defaults */ }
  return {
    beginner: String(saved.beginner || '').trim() || LEVELS.beginner.defaultName,
    intermediate: String(saved.intermediate || '').trim() || LEVELS.intermediate.defaultName,
    technical: String(saved.technical || '').trim() || LEVELS.technical.defaultName,
    lords: String(saved.lords || '').trim() || LEVELS.lords.defaultName,
  };
}

/** Small emblem for each level (inline SVG, no outside images). */
export function levelEmblem(level, size = 56) {
  if (level === 'technical') {
    // Candlesticks on a round badge
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb066"/><stop offset="1" stop-color="#e8730c"/></linearGradient></defs><circle cx="32" cy="32" r="28" fill="url(#emT)" stroke="#f7d07c" stroke-width="3"/><line x1="20" y1="18" x2="20" y2="44" stroke="#fff" stroke-width="2"/><rect x="16" y="24" width="8" height="14" rx="1.5" fill="#fff"/><line x1="32" y1="14" x2="32" y2="40" stroke="#0a1128" stroke-width="2"/><rect x="28" y="18" width="8" height="16" rx="1.5" fill="#0a1128"/><line x1="44" y1="20" x2="44" y2="50" stroke="#fff" stroke-width="2"/><rect x="40" y="26" width="8" height="18" rx="1.5" fill="#fff"/></svg>`;
  }
  if (level === 'lords') {
    // Crown on a gold medallion
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7d07c"/><stop offset="1" stop-color="#b8891a"/></linearGradient></defs><circle cx="32" cy="32" r="28" fill="#0a1128" stroke="url(#emL)" stroke-width="4"/><path d="M15 25l8.5 7L32 18l8.5 14L49 25l-4 20H19z" fill="url(#emL)"/><rect x="19" y="47" width="26" height="4" rx="2" fill="#f7d07c"/></svg>`;
  }
  if (level === 'intermediate') {
    // Shield with a star
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emK" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fc1ff"/><stop offset="1" stop-color="#2a78d6"/></linearGradient></defs><path d="M32 4 56 12v18c0 15-10 25-24 30C18 55 8 45 8 30V12z" fill="url(#emK)" stroke="#f7d07c" stroke-width="3"/><path d="m32 18 4.3 8.8 9.7 1.4-7 6.8 1.7 9.6L32 40l-8.7 4.6 1.7-9.6-7-6.8 9.7-1.4z" fill="#f7d07c"/></svg>`;
  }
  // Rising arrow over a sprout, in a circle
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emY" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1baf7a"/><stop offset="1" stop-color="#7be0b8"/></linearGradient></defs><circle cx="32" cy="32" r="28" fill="url(#emY)" stroke="#f7d07c" stroke-width="3"/><path d="M32 50V30" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M32 34c-8 0-12-5-12-11 7 0 12 4 12 11zM32 30c0-8 5-12 12-12 0 7-4 12-12 12z" fill="#fff"/><path d="m40 14 8-2-2 8" fill="none" stroke="#f7d07c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
