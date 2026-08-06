import fs from 'node:fs/promises';
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
  // NEWS SOURCES — TESTING CONFIGURATION
  // TIINGO_API_KEY replaces NEWSAPI_KEY here. Tiingo's free tier is for
  // individual use only — remove TIINGO_API_KEY (here and from Railway
  // Variables) before the site goes live. See businessSettings.js for
  // the matching note on sourceWeights.
  //
  // DEEPSEEK PRICING NOTE: DeepSeek V4 bills double during Beijing peak
  // hours (9:00-12:00 and 14:00-18:00 Beijing Time). Off-peak stays at
  // standard pricing. Worth keeping in mind if/when article generation
  // gets scheduled automatically.
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
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_MODEL',
    'PERPLEXITY_API_KEY',
    'PERPLEXITY_MODEL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'MARKETAUX_API_KEY',
    'TIINGO_API_KEY',
    'FINNHUB_API_KEY',
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
  await fs.writeFile(envPath, `${contents}\n`, 'utf8');
  return next;
}
