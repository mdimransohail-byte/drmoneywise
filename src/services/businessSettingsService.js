import fs from 'node:fs/promises';
import path from 'node:path';

import { getBusinessSettings, getBusinessSettingsPath } from '../config.js';

export async function readBusinessSettings() {
  await ensureBusinessSettingsFile();
  return getBusinessSettings();
}

export async function saveBusinessSettings(payload) {
  const current = await readBusinessSettings();
  const next = sanitizeBusinessSettings({
    ...current,
    ...payload,
    plans: {
      ...current.plans,
      ...(payload.plans || {}),
    },
    coupons: {
      ...current.coupons,
      ...(payload.coupons || {}),
    },
    newsPriority: {
      ...current.newsPriority,
      ...(payload.newsPriority || {}),
    },
  });

  const settingsPath = getBusinessSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

async function ensureBusinessSettingsFile() {
  const settingsPath = getBusinessSettingsPath();
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(getBusinessSettings(), null, 2), 'utf8');
  }
}

function sanitizeBusinessSettings(settings) {
  const next = structuredClone(settings);

  for (const plan of Object.values(next.plans || {})) {
    plan.articleLimit = clampNumber(plan.articleLimit, 1, 500);
    plan.learningLimit = clampNumber(plan.learningLimit, 0, 500);
    plan.features = normalizeLines(plan.features);
    plan.billingOptions = (plan.billingOptions || []).map((option) => ({
      ...option,
      label: String(option.label || '').trim(),
      priceText: String(option.priceText || '').trim(),
    }));
  }

  next.coupons.maxDiscountPercent = clampNumber(next.coupons.maxDiscountPercent, 1, 100);
  next.coupons.defaultPlanScope = ['all', 'regular', 'premium'].includes(next.coupons.defaultPlanScope)
    ? next.coupons.defaultPlanScope
    : 'all';

  next.newsPriority.freshnessHalfLifeHours = clampNumber(next.newsPriority.freshnessHalfLifeHours, 1, 720);
  for (const key of ['urgencyWeights', 'assetWeights', 'regionWeights', 'accessTierWeights', 'sourceWeights']) {
    next.newsPriority[key] = normalizeWeights(next.newsPriority[key]);
  }

  return next;
}

function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWeights(weights = {}) {
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, clampNumber(value, 0, 500)]),
  );
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
}
