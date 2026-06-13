import fs from 'node:fs';
import path from 'node:path';

import { BUSINESS_SETTINGS } from './businessSettings.js';

loadDotEnv();

export const APP_NAME = process.env.SITE_NAME || 'Dr MoneyWise';
export const PORT = Number(process.env.PORT || 3000);
export const SITE_DOMAIN = process.env.SITE_DOMAIN || 'drmoneywise.com';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'hello@drmoneywise.com';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@drmoneywise.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

export const REGION_OPTIONS = [
  { id: 'global', label: 'Global', summary: 'The broad market picture across regions' },
  { id: 'north-america', label: 'North America', summary: 'US and Canada earnings, rates, and flows' },
  { id: 'europe', label: 'Europe', summary: 'Europe policy, exporters, and currencies' },
  { id: 'mena', label: 'Middle East', summary: 'Gulf liquidity, energy, and local market moves' },
  { id: 'apac', label: 'Asia Pacific', summary: 'Asia growth, supply chains, and risk appetite' },
  { id: 'india', label: 'India', summary: 'Domestic growth, banks, and investor participation' },
];

export const INTEREST_OPTIONS = [
  { id: 'equities', label: 'Stocks', description: 'Company news, earnings, and market leadership' },
  { id: 'etfs', label: 'ETFs', description: 'Broad market and sector baskets' },
  { id: 'fixed-income', label: 'Bonds', description: 'Rates, yields, and safer asset moves' },
  { id: 'commodities', label: 'Commodities', description: 'Oil, gold, metals, and inflation trades' },
  { id: 'fx', label: 'Currencies', description: 'Dollar, euro, yen, and carry stories' },
  { id: 'crypto', label: 'Crypto', description: 'Bitcoin, Ethereum, and digital asset flows' },
  { id: 'retirement', label: 'Retirement', description: 'Long-term wealth and asset mix ideas' },
  { id: 'income', label: 'Income', description: 'Dividend, yield, and cashflow-focused ideas' },
];

export const ASSET_OPTIONS = INTEREST_OPTIONS.filter((interest) =>
  ['equities', 'etfs', 'fixed-income', 'commodities', 'fx', 'crypto'].includes(interest.id),
);

export const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export const ACCESS_LEVELS = {
  free: 0,
  regular: 1,
  premium: 2,
};

export const PLAN_CONFIG = buildPlanConfig();

export const COUPON_CONFIG = BUSINESS_SETTINGS.coupons;
export const NEWS_PRIORITY_CONFIG = BUSINESS_SETTINGS.newsPriority;

export function getBusinessSettings() {
  const overridePath = getBusinessSettingsPath();
  if (!fs.existsSync(overridePath)) {
    return BUSINESS_SETTINGS;
  }

  try {
    const savedSettings = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
    return mergeSettings(BUSINESS_SETTINGS, savedSettings);
  } catch {
    return BUSINESS_SETTINGS;
  }
}

export function getBusinessSettingsPath() {
  return path.join(process.cwd(), 'data', 'business-settings.json');
}

export function getPlanCatalog() {
  return Object.values(buildPlanConfig());
}

function buildPlanConfig() {
  const settings = getBusinessSettings();
  return Object.fromEntries(Object.entries(settings.plans).map(([planId, plan]) => [
    planId,
    {
      ...plan,
      accessLevel: ACCESS_LEVELS[planId] ?? ACCESS_LEVELS.free,
      billingOptions: (plan.billingOptions || []).map((option) => ({
        ...option,
        checkoutUrl: process.env[option.checkoutEnv] || '',
      })),
    },
  ]));
}

export const DEFAULT_MEMBER_INTERESTS = ['equities', 'etfs', 'fixed-income'];

export function getPlanConfig(plan = 'free') {
  const planConfig = buildPlanConfig();
  return planConfig[plan] || planConfig.free;
}

export function getAccessLevel(plan = 'free') {
  if (typeof plan === 'object' && plan?.accessLevel !== undefined) {
    return plan.accessLevel;
  }

  const planConfig = buildPlanConfig();
  return planConfig[plan]?.accessLevel ?? ACCESS_LEVELS.free;
}

export function canAccess(plan, requiredAccess = 'free') {
  return getAccessLevel(plan) >= (ACCESS_LEVELS[requiredAccess] ?? ACCESS_LEVELS.free);
}

export function getRegionLabel(regionId) {
  return REGION_OPTIONS.find((region) => region.id === regionId)?.label || 'Global';
}

export function getInterestLabel(interestId) {
  return INTEREST_OPTIONS.find((interest) => interest.id === interestId)?.label || interestId;
}

export function getEnvPath() {
  return path.join(process.cwd(), '.env');
}

export function getCouponConfig() {
  return getBusinessSettings().coupons;
}

export function getNewsPriorityConfig() {
  return getBusinessSettings().newsPriority;
}

function mergeSettings(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return base;
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeSettings(base[key] || {}, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function loadDotEnv() {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) {
    return;
  }

  const fileContents = fs.readFileSync(envPath, 'utf8');
  for (const line of fileContents.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/gu, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
