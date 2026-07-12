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
