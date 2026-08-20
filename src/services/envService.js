import fs from 'node:fs/promises';
import path from 'node:path';
import { getEnvPath } from '../config.js';

export async function readEnvSettings() {
  const envPath = getEnvPath();
  let raw = '';
  try {
    raw = await fs.readFile(envPath, 'utf8');
  } catch {
    raw = '';
  }
  const pairs = {};
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    pairs[key] = value;
  }
  return pairs;
}

export async function writeEnvSettings(changes) {
  const envPath = getEnvPath();
  const current = await readEnvSettings();
  const next = {
    ...current,
    ...changes,
  };
  for (const [key, value] of Object.entries(changes)) {
    process.env[key] = String(value ?? '');
  }
  // NEWS SOURCES — CURRENT CONFIGURATION
  // Marketaux and NewsData.io are both commercial-use-safe on their free
  // tiers. Tiingo (individual-use license) and Finnhub have been removed.
  const orderedKeys = [
    'PORT',
    'SITE_NAME',
    'SITE_DOMAIN',
    'SUPPORT_EMAIL',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'CLAUDE_API_KEY',
    'CLAUDE_MODEL',
    'PERPLEXITY_API_KEY',
    'PERPLEXITY_MODEL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'PEXELS_API_KEY',
    'GAMMA_API_KEY',
    'MARKETAUX_API_KEY',
    'NEWSDATA_API_KEY',
    'MARKETSTACK_API_KEY',
    'MARKETSTACK_MONTHLY_LIMIT',
    'WATCHLIST_API_URL',
    'WATCHLIST_API_KEY',
    'PORTFOLIO_API_URL',
    'PORTFOLIO_API_KEY',
    'CHECKOUT_FREE_URL',
    'STRIPE_REGULAR_MONTHLY_URL',
    'STRIPE_REGULAR_ANNUAL_URL',
    'STRIPE_PREMIUM_MONTHLY_URL',
    'STRIPE_PREMIUM_ANNUAL_URL',
  ];
  const finalKeys = [
    ...orderedKeys.filter((key) => Object.hasOwn(next, key)),
    ...Object.keys(next).filter((key) => !orderedKeys.includes(key)).sort(),
  ];
  const contents = finalKeys.map((key) => `${key}=${next[key] ?? ''}`).join('\n');
  await fs.mkdir(path.dirname(envPath), { recursive: true });
  await fs.writeFile(envPath, `${contents}\n`, 'utf8');
  return next;
}
