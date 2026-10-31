import crypto from 'node:crypto';

import { canAccess, DEFAULT_MEMBER_INTERESTS, getPlanConfig } from '../config.js';
import { requireSessionUser, sanitizeUser } from './authService.js';
import { readStore, updateStore } from './storeService.js';

export async function getMemberProfile(token) {
  const user = await requireSessionUser(token);
  return user;
}

export async function saveMemberPreferences(token, payload) {
  const user = await requireSessionUser(token);

  const updated = await updateStore((store) => {
    const target = store.users.find((entry) => entry.id === user.id);
    if (!target) {
      throw new Error('Member not found.');
    }

    target.name = payload.name || target.name;
    target.regions =
      Array.isArray(payload.regions) && payload.regions.length
        ? payload.regions
        : target.regions && target.regions.length
          ? target.regions
          : target.region
            ? [target.region]
            : ['global'];
    target.region = target.regions[0];
    target.interests =
      Array.isArray(payload.interests) && payload.interests.length ? payload.interests : target.interests || DEFAULT_MEMBER_INTERESTS;
    target.preferencesSavedAt = new Date().toISOString();
    return store;
  });

  return sanitizeUser(updated.users.find((entry) => entry.id === user.id));
}

export async function saveMemberWatchlist(token, tickers) {
  const user = await requireSessionUser(token);
  const nextTickers = Array.isArray(tickers)
    ? tickers.map((ticker) => String(ticker).trim().toUpperCase()).filter(Boolean).slice(0, 20)
    : [];

  const updated = await updateStore((store) => {
    const target = store.users.find((entry) => entry.id === user.id);
    if (!target) {
      throw new Error('Member not found.');
    }

    target.watchlist = nextTickers;
    return store;
  });

  const watchlist = updated.users.find((entry) => entry.id === user.id)?.watchlist || [];
  await syncCollectionToExternalApi({
    endpoint: process.env.WATCHLIST_API_URL,
    apiKey: process.env.WATCHLIST_API_KEY,
    type: 'watchlist',
    user,
    payload: { tickers: watchlist },
  });

  return watchlist;
}

export async function saveMemberPortfolio(token, holdings) {
  const user = await requireSessionUser(token);
  const nextHoldings = Array.isArray(holdings)
    ? holdings
        .map((holding) => ({
          id: holding.id || crypto.randomUUID(),
          ticker: String(holding.ticker || '').trim().toUpperCase(),
          name: String(holding.name || '').trim(),
          weight: String(holding.weight || '').trim(),
          cost: String(holding.cost || '').trim(),
          note: String(holding.note || '').trim(),
        }))
        .filter((holding) => holding.ticker)
        .slice(0, 20)
    : [];

  const updated = await updateStore((store) => {
    const target = store.users.find((entry) => entry.id === user.id);
    if (!target) {
      throw new Error('Member not found.');
    }

    target.portfolio = nextHoldings;
    return store;
  });

  const portfolio = updated.users.find((entry) => entry.id === user.id)?.portfolio || [];
  await syncCollectionToExternalApi({
    endpoint: process.env.PORTFOLIO_API_URL,
    apiKey: process.env.PORTFOLIO_API_KEY,
    type: 'portfolio',
    user,
    payload: { holdings: portfolio },
  });

  return portfolio;
}

export async function toggleSavedArticle(token, slug) {
  const user = await requireSessionUser(token);
  const updated = await updateStore((store) => {
    const target = store.users.find((entry) => entry.id === user.id);
    if (!target) {
      throw new Error('Member not found.');
    }

    const exists = (target.savedArticleSlugs || []).includes(slug);
    target.savedArticleSlugs = exists
      ? target.savedArticleSlugs.filter((entry) => entry !== slug)
      : [...(target.savedArticleSlugs || []), slug];
    return store;
  });

  return updated.users.find((entry) => entry.id === user.id)?.savedArticleSlugs || [];
}

export async function getPortfolioReview(token) {
  const user = await requireSessionUser(token);
  const plan = getPlanConfig(user.plan);

  if (!canAccess(plan, 'regular')) {
    return {
      accessible: false,
      title: 'Upgrade to unlock portfolio review',
      summary: 'Free members can save a watchlist. Regular and Premium members can unlock the full portfolio review.',
      strengths: [],
      risks: [],
      actions: [],
    };
  }

  const holdings = user.portfolio || [];
  if (!holdings.length) {
    return {
      accessible: true,
      title: 'Add holdings to start your review',
      summary: 'Once you add your portfolio holdings, this section will highlight concentration, balance, and simple next steps.',
      strengths: [],
      risks: [],
      actions: [],
    };
  }

  const topHolding = holdings[0];
  const hasProtection = holdings.some((holding) => /gold|bond|cash|gld|bnd|tlt/i.test(`${holding.ticker} ${holding.name}`));

  return {
    accessible: true,
    title: 'Your portfolio review',
    summary: hasProtection
      ? 'Your portfolio has at least one stabilizer alongside growth positions, which can help smooth large market swings.'
      : 'Your portfolio is tilted toward growth and may benefit from at least one stabilizer or income sleeve.',
    strengths: [
      `${topHolding.ticker} is your biggest visible anchor, which helps make the portfolio story easier to follow.`,
      hasProtection
        ? 'You already have at least one holding acting as a cushion.'
        : 'A focused portfolio can be easier to understand than a cluttered one.',
    ],
    risks: [
      'Check whether one holding is doing too much of the work.',
      'Review if your positions all react to the same type of headline.',
    ],
    actions: [
      'Write down the job of each holding in one sentence.',
      hasProtection
        ? 'Recheck whether your stabilizer allocation is still large enough for your comfort level.'
        : 'Consider adding one calmer holding that can offset aggressive risk.',
      'Review the mix once a month instead of reacting every day.',
    ],
  };
}

export async function getMembersForAdmin() {
  const store = await readStore();
  return store.users.map((user) => sanitizeUser(user));
}

async function syncCollectionToExternalApi({ endpoint, apiKey, type, user, payload }) {
  if (!endpoint) {
    return;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({
      type,
      memberId: user.id,
      memberEmail: user.email,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`${type} sync failed with status ${response.status}.`);
  }
}

/* ── Reader profile (Membership → "Your profile") ─────────────────────── */
export async function saveMemberProfile(token, payload) {
  const user = await requireSessionUser(token);
  const { PROFILE_OPTIONS, MULTI_FIELDS, OTHER_TEXT_FIELDS, OTHER_TEXT_MAX } = await import('../data/profileOptions.js');
  const { INTEREST_OPTIONS, REGION_OPTIONS } = await import('../config.js');
  const allowed = {
    ...Object.fromEntries(Object.entries(PROFILE_OPTIONS).map(([k, list]) => [k, new Set(list.map(([id]) => id))])),
    interests: new Set(INTEREST_OPTIONS.map((o) => o.id)),
    regions: new Set(REGION_OPTIONS.map((o) => o.id)),
  };
  const clean = {};
  for (const [field, set] of Object.entries(allowed)) {
    const value = payload?.[field];
    if (MULTI_FIELDS.includes(field)) {
      clean[field] = Array.isArray(value) ? [...new Set(value.map(String))].filter((v) => set.has(v)).slice(0, 12) : [];
    } else {
      clean[field] = set.has(String(value || '')) ? String(value) : '';
    }
  }
  // Typed answers when "other" was chosen (plain text only, kept short)
  for (const field of OTHER_TEXT_FIELDS) {
    const chosen = MULTI_FIELDS.includes(field) ? clean[field].includes('other') : clean[field] === 'other';
    const typed = String(payload?.[`${field}Other`] || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, OTHER_TEXT_MAX);
    clean[`${field}Other`] = chosen ? typed : '';
  }
  const updated = await updateStore((store) => {
    const target = store.users.find((entry) => entry.id === user.id);
    if (!target) throw new Error('Member not found.');
    target.profile = { ...clean, updatedAt: new Date().toISOString() };
    // Keep the older region/interest settings in step with the profile
    if (clean.regions.length) { target.regions = clean.regions; target.region = clean.regions[0]; }
    if (clean.interests.length) target.interests = clean.interests;
    if (payload?.name && String(payload.name).trim()) target.name = String(payload.name).trim().slice(0, 80);
    return store;
  });
  return sanitizeUser(updated.users.find((entry) => entry.id === user.id));
}

/* ── Admin: totals across readers who filled in their profile ─────────── */
const ORDERED_FIELDS = ['knowledge', 'experience', 'ageRange', 'investAmount'];
export async function getAudienceSummary() {
  const { PROFILE_OPTIONS, OTHER_TEXT_FIELDS } = await import('../data/profileOptions.js');
  const { INTEREST_OPTIONS, REGION_OPTIONS } = await import('../config.js');
  const store = await readStore();
  const members = store.users.filter((u) => u.role !== 'admin');
  const withProfile = members.filter((u) => u.profile && u.profile.updatedAt);
  const labels = {
    ...Object.fromEntries(Object.entries(PROFILE_OPTIONS).map(([k, list]) => [k, Object.fromEntries(list)])),
    interests: Object.fromEntries(INTEREST_OPTIONS.map((o) => [o.id, o.label])),
    regions: Object.fromEntries(REGION_OPTIONS.map((o) => [o.id, o.label])),
  };
  const fields = {};
  for (const field of Object.keys(labels)) {
    const counts = {};
    for (const u of withProfile) {
      const v = u.profile[field];
      for (const item of Array.isArray(v) ? v : v ? [v] : []) counts[item] = (counts[item] || 0) + 1;
    }
    const row = ([id, n]) => ({ id, label: String(labels[field][id] || id).split(' — ')[0], n, pct: withProfile.length ? Math.round((n / withProfile.length) * 100) : 0 });
    // Ordered answers (age, experience…) keep their natural order, zeros included
    fields[field] = ORDERED_FIELDS.includes(field)
      ? PROFILE_OPTIONS[field].filter(([id]) => id !== 'na' || counts.na).map(([id]) => row([id, counts[id] || 0]))
      : Object.entries(counts).sort((a, b) => b[1] - a[1]).map(row);
  }
  // What readers typed under "other" (most common first)
  const typed = {};
  for (const field of OTHER_TEXT_FIELDS) {
    const counts = {};
    for (const u of withProfile) {
      const t = String(u.profile[`${field}Other`] || '').trim();
      if (t) { const key = t.toLowerCase(); counts[key] = counts[key] || { text: t, n: 0 }; counts[key].n += 1; }
    }
    typed[field] = Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 10);
  }
  // A plain suggestion for the writing level, from what readers know
  // and how long they have invested (we do not ask them to choose a level)
  const k = Object.fromEntries((fields.knowledge || []).map((x) => [x.id, x.pct]));
  const e = Object.fromEntries((fields.experience || []).map((x) => [x.id, x.pct]));
  const newerKnow = (k.beginner || 0) + (k.some || 0);
  const newerExp = (e.none || 0) + (e.lt1 || 0) + (e['1-3'] || 0);
  const answered = (f) => (fields[f] || []).some((x) => x.n > 0);
  const parts = [answered('knowledge') && newerKnow, answered('experience') && newerExp].filter((v) => v !== false);
  const level = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  let suggestion = 'Not enough profiles yet to judge. Keep the current plain-English style.';
  let tone = 'wait';
  if (withProfile.length >= 5) {
    if (level >= 60) { tone = 'simple'; suggestion = `Most readers are newer to investing (${newerKnow}% beginner or basic knowledge; ${newerExp}% investing under 3 years). Keep explainers simple: short sentences, every term explained.`; }
    else if (level <= 40) { tone = 'deeper'; suggestion = 'Most readers know their way around. Explainers can use more market terms and go deeper into the numbers, while still explaining key words.'; }
    else { tone = 'mixed'; suggestion = 'Readers are a mix of levels. Keep the plain-English base, and add a short "Going deeper" part for confident readers.'; }
  }
  return { members: members.length, withProfile: withProfile.length, fields, typed, suggestion, tone, newerPct: withProfile.length ? level : null };
}


/* ── Portfolio health check (Premium): holdings with shares + price paid ── */
export async function saveHoldings(userId, holdings) {
  const clean = (Array.isArray(holdings) ? holdings : []).map((h) => {
    const ticker = String(h?.ticker || '').toUpperCase().replace(/[^A-Z0-9.-]/gu, '').slice(0, 10);
    const n = (v) => { const x = Number(String(v ?? '').replace(/[$,\s]/gu, '')); return Number.isFinite(x) && x > 0 && x < 1e9 ? x : null; };
    return { ticker, shares: n(h.shares), buyPrice: n(h.buyPrice) };
  }).filter((h) => h.ticker).slice(0, 30);
  const updated = await updateStore((store) => {
    const target = store.users.find((u) => u.id === userId);
    if (!target) throw new Error('Member not found.');
    const old = target.portfolio || [];
    target.portfolio = clean.map((h) => {
      const prev = old.find((o) => o.ticker === h.ticker) || {};
      return { ...prev, id: prev.id || crypto.randomUUID(), ticker: h.ticker, shares: h.shares, buyPrice: h.buyPrice, cost: h.buyPrice ? String(h.buyPrice) : prev.cost || '' };
    });
    return store;
  });
  return updated.users.find((u) => u.id === userId)?.portfolio || [];
}

/* ── Learning path: steps the member has ticked as done ─────────────── */
export async function saveLearningDone(userId, ids) {
  const { ALL_STEP_IDS } = await import('../data/learningPath.js');
  const clean = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter((id) => ALL_STEP_IDS.includes(id)))];
  const updated = await updateStore((store) => {
    const target = store.users.find((u) => u.id === userId);
    if (!target) throw new Error('Member not found.');
    target.learningDone = clean;
    return store;
  });
  return updated.users.find((u) => u.id === userId)?.learningDone || [];
}

/* ── Learn course: lessons the member has read (and their quiz score) ──
   Stored on the member as lessonsRead: [{ slug, at, quiz }]. */
export async function saveLessonRead(userId, { slug, done = true, quiz = null } = {}) {
  const clean = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/gu, '').slice(0, 120);
  if (!clean) throw Object.assign(new Error('Which lesson?'), { status: 400 });
  const updated = await updateStore((store) => {
    if (!(store.articles || []).some((a) => a.slug === clean && (a.contentType || 'learning') === 'learning')) throw Object.assign(new Error('Lesson not found.'), { status: 404 });
    const target = store.users.find((u) => u.id === userId);
    if (!target) throw new Error('Member not found.');
    const list = (target.lessonsRead || []).filter((x) => x.slug !== clean);
    if (done) {
      const prev = (target.lessonsRead || []).find((x) => x.slug === clean);
      const q = quiz && Number.isFinite(Number(quiz.score)) ? { score: Number(quiz.score), of: Number(quiz.of) || 3 } : prev?.quiz || null;
      list.push({ slug: clean, at: prev?.at || new Date().toISOString(), quiz: q });
    }
    target.lessonsRead = list.slice(-2000);
    return store;
  });
  return updated.users.find((u) => u.id === userId)?.lessonsRead || [];
}

/** Progress for each course level: { read: [...], levels: { beginner: { read, total, planned } } } */
export async function lessonProgress(user) {
  const read = user?.lessonsRead || [];
  const { getPublishedLearningArticles } = await import('./seoService.js');
  const { levelOf } = await import('../data/learnLevels.js');
  const { COURSE } = await import('../data/learnCourse.js');
  const all = await getPublishedLearningArticles();
  const readSet = new Set(read.map((x) => x.slug));
  const levels = {};
  for (const id of ['beginner', 'intermediate', 'technical', 'lords']) {
    const mine = all.filter((a) => levelOf(a) === id);
    levels[id] = { read: mine.filter((a) => readSet.has(a.slug)).length, total: mine.length, planned: (COURSE[id] || []).reduce((n, w) => n + w.lessons.length, 0) };
  }
  return { read, levels };
}
