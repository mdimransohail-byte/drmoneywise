import crypto from 'node:crypto';

import { getCouponConfig, getPlanCatalog, getPlanConfig } from '../config.js';
import { sanitizeUser } from './authService.js';
import { readBusinessSettings, saveBusinessSettings } from './businessSettingsService.js';
import { readEnvSettings, writeEnvSettings } from './envService.js';
import { readStore, updateStore } from './storeService.js';

export async function getAdminDashboard() {
  const store = await readStore();
  const envSettings = await readEnvSettings();
  const members = store.users.filter((user) => user.role !== 'admin');
  const pageViews = sumEventValues(store.events, 'page_view');
  const signups = sumEventValues(store.events, 'signup');
  const upgrades = sumEventValues(store.events, 'upgrade');
  const revenue = sumEventValues(store.events, 'revenue');

  return {
    metrics: {
      totalReaders: members.length,
      pageViews,
      signups,
      upgrades,
      revenue,
      conversionRate: signups ? Number(((upgrades / signups) * 100).toFixed(1)) : 0,
      publishedArticles: store.articles.filter((article) => article.status === 'published').length,
      scheduledArticles: store.articles.filter((article) => article.status === 'scheduled').length,
    },
    timeline: buildTimeline(store.events),
    tierMix: buildTierMix(members),
    articleStatuses: buildArticleStatuses(store.articles),
    coupons: store.coupons,
    settings: {
      siteName: store.settings.siteName,
      siteDomain: store.settings.siteDomain,
      supportEmail: store.settings.supportEmail,
      deepseekModel: envSettings.DEEPSEEK_MODEL || '',
      perplexityModel: envSettings.PERPLEXITY_MODEL || '',
      openAiModel: envSettings.OPENAI_MODEL || '',
      claudeModel: envSettings.CLAUDE_MODEL || '',
      openAiKey: envSettings.OPENAI_API_KEY || '',
      claudeKey: envSettings.CLAUDE_API_KEY || '',
      deepseekKey: envSettings.DEEPSEEK_API_KEY || '',
      perplexityKey: envSettings.PERPLEXITY_API_KEY || '',
      marketauxKey: envSettings.MARKETAUX_API_KEY || '',
      tiingoKey: envSettings.TIINGO_API_KEY || '',
      finnhubKey: envSettings.FINNHUB_API_KEY || '',
      marketstackKey: envSettings.MARKETSTACK_API_KEY || '',
      stripeRegularMonthly: envSettings.STRIPE_REGULAR_MONTHLY_URL || '',
      stripeRegularAnnual: envSettings.STRIPE_REGULAR_ANNUAL_URL || '',
      stripePremiumMonthly: envSettings.STRIPE_PREMIUM_MONTHLY_URL || '',
      stripePremiumAnnual: envSettings.STRIPE_PREMIUM_ANNUAL_URL || '',
      openAiConfigured: Boolean(envSettings.OPENAI_API_KEY),
      claudeConfigured: Boolean(envSettings.CLAUDE_API_KEY),
      deepseekConfigured: Boolean(envSettings.DEEPSEEK_API_KEY),
      perplexityConfigured: Boolean(envSettings.PERPLEXITY_API_KEY),
      marketauxConfigured: Boolean(envSettings.MARKETAUX_API_KEY),
      tiingoConfigured: Boolean(envSettings.TIINGO_API_KEY),
      finnhubConfigured: Boolean(envSettings.FINNHUB_API_KEY),
      marketstackConfigured: Boolean(envSettings.MARKETSTACK_API_KEY),
      stripeRegularMonthlyConfigured: Boolean(envSettings.STRIPE_REGULAR_MONTHLY_URL),
      stripeRegularAnnualConfigured: Boolean(envSettings.STRIPE_REGULAR_ANNUAL_URL),
      stripePremiumMonthlyConfigured: Boolean(envSettings.STRIPE_PREMIUM_MONTHLY_URL),
      stripePremiumAnnualConfigured: Boolean(envSettings.STRIPE_PREMIUM_ANNUAL_URL),
    },
  };
}

export async function listCoupons() {
  const store = await readStore();
  return store.coupons;
}

export async function getBusinessSettingsForAdmin() {
  return {
    businessSettings: await readBusinessSettings(),
    envSettings: await readEnvSettings(),
  };
}

export async function saveBusinessSettingsForAdmin(payload) {
  const businessSettings = await saveBusinessSettings(payload.businessSettings || {});
  if (payload.envSettings) {
    await writeEnvSettings(payload.envSettings);
  }

  return {
    businessSettings,
    envSettings: await readEnvSettings(),
  };
}

export async function createCoupon(payload) {
  const couponConfig = getCouponConfig();
  const nextCoupon = {
    id: crypto.randomUUID(),
    code: String(payload.code || '').trim().toUpperCase(),
    discountPercent: Number(payload.discountPercent || 0),
    active: payload.active !== false,
    planScope: payload.planScope || couponConfig.defaultPlanScope,
    createdAt: new Date().toISOString(),
  };

  if (!nextCoupon.code) {
    throw new Error('Coupon code is required.');
  }
  if (!Number.isFinite(nextCoupon.discountPercent) || nextCoupon.discountPercent < 1 || nextCoupon.discountPercent > couponConfig.maxDiscountPercent) {
    throw new Error(`Coupon discount must be between 1 and ${couponConfig.maxDiscountPercent}%.`);
  }
  if (!['all', ...getPlanCatalog().map((plan) => plan.id)].includes(nextCoupon.planScope)) {
    throw new Error('Coupon plan scope is not valid.');
  }

  await updateStore((store) => {
    const exists = store.coupons.find((coupon) => coupon.code === nextCoupon.code);
    if (exists) {
      throw new Error('A coupon with that code already exists.');
    }
    store.coupons.push(nextCoupon);
    return store;
  });

  return nextCoupon;
}

export async function toggleCouponStatus(id) {
  const store = await updateStore((draft) => {
    const coupon = draft.coupons.find((entry) => entry.id === id);
    if (!coupon) {
      throw new Error('Coupon not found.');
    }
    coupon.active = !coupon.active;
    return draft;
  });

  return store.coupons.find((coupon) => coupon.id === id);
}

export async function validateCoupon(code, planId) {
  const store = await readStore();
  const coupon = store.coupons.find(
    (entry) =>
      entry.code === String(code || '').trim().toUpperCase() &&
      entry.active &&
      (entry.planScope === 'all' || entry.planScope === planId),
  );

  if (!coupon) {
    return {
      valid: false,
    };
  }

  const plan = getPlanConfig(planId);
  if (!plan || planId === 'free') {
    return {
      valid: false,
    };
  }
  const monthly = extractNumericPrice(plan.priceLabel);
  const annualOption = plan.billingOptions?.find((option) => option.id.includes('annual'));
  const annual = annualOption ? extractNumericPrice(annualOption.priceText) : monthly;

  return {
    valid: true,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    adjustedMonthly: Math.max(0, Number((monthly * (1 - coupon.discountPercent / 100)).toFixed(2))),
    adjustedAnnual: Math.max(0, Number((annual * (1 - coupon.discountPercent / 100)).toFixed(2))),
  };
}

export async function saveAdminSettings(payload) {
  const envChanges = {};

  if (payload.siteName !== undefined) {
    envChanges.SITE_NAME = payload.siteName;
  }
  if (payload.siteDomain !== undefined) {
    envChanges.SITE_DOMAIN = payload.siteDomain;
  }
  if (payload.supportEmail !== undefined) {
    envChanges.SUPPORT_EMAIL = payload.supportEmail;
  }
  if (payload.openAiKey !== undefined) {
    envChanges.OPENAI_API_KEY = payload.openAiKey;
  }
  if (payload.claudeKey !== undefined) {
    envChanges.CLAUDE_API_KEY = payload.claudeKey;
  }
  if (payload.deepseekKey !== undefined) {
    envChanges.DEEPSEEK_API_KEY = payload.deepseekKey;
  }
  if (payload.perplexityKey !== undefined) {
    envChanges.PERPLEXITY_API_KEY = payload.perplexityKey;
  }
  if (payload.deepseekModel !== undefined) {
    envChanges.DEEPSEEK_MODEL = payload.deepseekModel;
  }
  if (payload.perplexityModel !== undefined) {
    envChanges.PERPLEXITY_MODEL = payload.perplexityModel;
  }
  if (payload.openAiModel !== undefined) {
    envChanges.OPENAI_MODEL = payload.openAiModel;
  }
  if (payload.claudeModel !== undefined) {
    envChanges.CLAUDE_MODEL = payload.claudeModel;
  }
  if (payload.marketauxKey !== undefined) {
    envChanges.MARKETAUX_API_KEY = payload.marketauxKey;
  }
  if (payload.tiingoKey !== undefined) {
    envChanges.TIINGO_API_KEY = payload.tiingoKey;
  }
  if (payload.finnhubKey !== undefined) {
    envChanges.FINNHUB_API_KEY = payload.finnhubKey;
  }
  if (payload.marketstackKey !== undefined) {
    envChanges.MARKETSTACK_API_KEY = payload.marketstackKey;
  }
  if (payload.stripeRegularMonthly !== undefined) {
    envChanges.STRIPE_REGULAR_MONTHLY_URL = payload.stripeRegularMonthly;
  }
  if (payload.stripeRegularAnnual !== undefined) {
    envChanges.STRIPE_REGULAR_ANNUAL_URL = payload.stripeRegularAnnual;
  }
  if (payload.stripePremiumMonthly !== undefined) {
    envChanges.STRIPE_PREMIUM_MONTHLY_URL = payload.stripePremiumMonthly;
  }
  if (payload.stripePremiumAnnual !== undefined) {
    envChanges.STRIPE_PREMIUM_ANNUAL_URL = payload.stripePremiumAnnual;
  }

  await writeEnvSettings(envChanges);

  await updateStore((store) => {
    store.settings.siteName = payload.siteName || store.settings.siteName;
    store.settings.siteDomain = payload.siteDomain || store.settings.siteDomain;
    store.settings.supportEmail = payload.supportEmail || store.settings.supportEmail;
    return store;
  });

  return getAdminDashboard();
}

export async function updateMemberPlan(payload) {
  const userId = String(payload.userId || '').trim();
  const plan = String(payload.plan || 'free').trim();
  const billingCycle = payload.billingCycle === 'annual' ? 'annual' : 'monthly';

  if (!userId) {
    throw new Error('Member id is required.');
  }

  if (!getPlanCatalog().some((entry) => entry.id === plan)) {
    throw new Error('Unknown membership plan.');
  }

  const updated = await updateStore((store) => {
    const member = store.users.find((entry) => entry.id === userId && entry.role !== 'admin');
    if (!member) {
      throw new Error('Member not found.');
    }

    const previousPlan = member.plan;
    const previousCycle = member.billingCycle || 'monthly';

    member.plan = plan;
    member.billingCycle = billingCycle;
    member.updatedAt = new Date().toISOString();

    if (previousPlan !== plan || previousCycle !== billingCycle) {
      store.events.push({
        id: crypto.randomUUID(),
        type: 'upgrade',
        path: '/admin/users/plan',
        userId: member.id,
        value: 1,
        at: new Date().toISOString(),
      });

      if (plan !== 'free') {
        store.events.push({
          id: crypto.randomUUID(),
          type: 'revenue',
          path: '/admin/users/plan',
          userId: member.id,
          value: getPlanCharge(plan, billingCycle),
          at: new Date().toISOString(),
        });
      }
    }

    return store;
  });

  return sanitizeUser(updated.users.find((entry) => entry.id === userId));
}

function sumEventValues(events, type) {
  return events
    .filter((event) => event.type === type)
    .reduce((total, event) => total + Number(event.value || 0), 0);
}

function buildTimeline(events) {
  const grouped = new Map();

  for (const event of events) {
    const key = event.at.slice(0, 10);
    const entry = grouped.get(key) || { date: key, pageViews: 0, signups: 0, upgrades: 0, revenue: 0 };

    if (event.type === 'page_view') {
      entry.pageViews += Number(event.value || 0);
    }
    if (event.type === 'signup') {
      entry.signups += Number(event.value || 0);
    }
    if (event.type === 'upgrade') {
      entry.upgrades += Number(event.value || 0);
    }
    if (event.type === 'revenue') {
      entry.revenue += Number(event.value || 0);
    }

    grouped.set(key, entry);
  }

  return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function buildTierMix(members) {
  const counts = {
    free: 0,
    regular: 0,
    premium: 0,
  };

  for (const member of members) {
    counts[member.plan] = (counts[member.plan] || 0) + 1;
  }

  return Object.entries(counts).map(([plan, count]) => ({
    plan,
    label: getPlanConfig(plan)?.shortName || plan,
    count,
  }));
}

function buildArticleStatuses(articles) {
  return [
    { label: 'Drafts', count: articles.filter((article) => article.status === 'draft').length },
    { label: 'Scheduled', count: articles.filter((article) => article.status === 'scheduled').length },
    { label: 'Published', count: articles.filter((article) => article.status === 'published').length },
  ];
}

function extractNumericPrice(value) {
  return Number(String(value || '').replace(/[^0-9.]/gu, '')) || 0;
}

function getPlanCharge(planId, billingCycle) {
  const plan = getPlanConfig(planId);
  if (!plan || planId === 'free') {
    return 0;
  }

  if (billingCycle === 'annual') {
    const annualOption = plan.billingOptions?.find((option) => option.id.includes('annual'));
    return extractNumericPrice(annualOption?.priceText);
  }

  return extractNumericPrice(plan.priceLabel);
}
