// Shared Marketstack integration used by watchlistService.js and portfolioService.js.
//
// Marketstack's Free Plan allows 100 requests/month, end-of-day data only, and
// each ticker in a request counts as one request (5 symbols = 5 requests).
// This module exists to make sure both services share ONE cache and ONE quota
// counter instead of each burning through the monthly allowance independently.
//
// Env vars:
//   MARKETSTACK_API_KEY       - required to fetch live prices. Without it, both
//                                services fall back to demo data automatically.
//   MARKETSTACK_MONTHLY_LIMIT - optional override. Defaults to 100 (Free Plan).
//                                Set to 10000 when upgrading to the $9.99/mo Basic
//                                plan before launch.

const MARKETSTACK_BASE_URL = 'https://api.marketstack.com/v1';
const FREE_PLAN_MONTHLY_LIMIT = 100;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — free plan only ever returns the latest close anyway

const priceCache = new Map(); // ticker -> { data, fetchedAt }

const usage = {
  monthKey: currentMonthKey(),
  requestsUsed: 0,
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function resetUsageIfNewMonth() {
  const monthKey = currentMonthKey();
  if (usage.monthKey !== monthKey) {
    usage.monthKey = monthKey;
    usage.requestsUsed = 0;
  }
}

function getMonthlyLimit() {
  const override = Number(process.env.MARKETSTACK_MONTHLY_LIMIT);
  return Number.isFinite(override) && override > 0 ? override : FREE_PLAN_MONTHLY_LIMIT;
}

/**
 * Current quota usage/warning state. Safe to call anytime (e.g. to show a
 * banner in the UI even before any prices have been requested this session).
 */
export function getQuotaStatus() {
  resetUsageIfNewMonth();
  const limit = getMonthlyLimit();
  const used = usage.requestsUsed;
  const remaining = Math.max(limit - used, 0);
  const percentUsed = limit > 0 ? used / limit : 0;

  let warningLevel = null;
  if (percentUsed >= 1) {
    warningLevel = 'exhausted';
  } else if (percentUsed >= 0.9) {
    warningLevel = 'critical';
  } else if (percentUsed >= 0.75) {
    warningLevel = 'warning';
  }

  return {
    provider: 'Marketstack',
    monthKey: usage.monthKey,
    used,
    limit,
    remaining,
    percentUsed: Math.round(percentUsed * 1000) / 10,
    warningLevel,
    message: buildQuotaMessage(warningLevel, remaining, limit),
  };
}

function buildQuotaMessage(warningLevel, remaining, limit) {
  if (!warningLevel) {
    return null;
  }

  if (warningLevel === 'exhausted') {
    return `Marketstack's monthly request quota (${limit}) is used up. Showing cached/demo prices until next month, or until the plan is upgraded.`;
  }

  if (warningLevel === 'critical') {
    return `Marketstack quota is almost gone: only ${remaining} of ${limit} requests left this month.`;
  }

  return `Marketstack quota is getting low: ${remaining} of ${limit} requests left this month.`;
}

function recordUsage(tickerCount) {
  resetUsageIfNewMonth();
  usage.requestsUsed += tickerCount;
}

/**
 * Fetch latest EOD prices for the given tickers, using the shared cache and
 * spending as little of the monthly quota as possible.
 *
 * Returns: {
 *   prices: { [ticker]: { price, open, high, low, volume, date } },
 *   quota: quotaStatus,
 *   source: 'cache' | 'live' | 'no-api-key' | 'quota-exhausted' | 'error' | 'none',
 *   missing: string[] (tickers we could not get fresh data for, if any),
 *   error: string (only when source === 'error'),
 * }
 */
export async function getLatestPrices(tickers) {
  resetUsageIfNewMonth();

  const uniqueTickers = Array.from(
    new Set((tickers || []).map((ticker) => String(ticker || '').trim().toUpperCase()).filter(Boolean)),
  );

  if (!uniqueTickers.length) {
    return { prices: {}, quota: getQuotaStatus(), source: 'none' };
  }

  const now = Date.now();
  const prices = {};
  const staleTickers = [];

  for (const ticker of uniqueTickers) {
    const entry = priceCache.get(ticker);
    if (entry && now - entry.fetchedAt < CACHE_TTL_MS) {
      prices[ticker] = entry.data;
    } else {
      staleTickers.push(ticker);
    }
  }

  if (!staleTickers.length) {
    return { prices, quota: getQuotaStatus(), source: 'cache' };
  }

  const apiKey = process.env.MARKETSTACK_API_KEY;
  if (!apiKey) {
    return { prices, quota: getQuotaStatus(), source: 'no-api-key', missing: staleTickers };
  }

  const quotaBefore = getQuotaStatus();
  if (quotaBefore.remaining <= 0) {
    return { prices, quota: quotaBefore, source: 'quota-exhausted', missing: staleTickers };
  }

  // If there isn't enough quota left for every stale ticker, fetch as many as
  // we can afford rather than failing the whole request.
  const affordableTickers = staleTickers.slice(0, quotaBefore.remaining);
  const skippedTickers = staleTickers.slice(quotaBefore.remaining);

  try {
    const url = new URL(`${MARKETSTACK_BASE_URL}/eod/latest`);
    url.searchParams.set('access_key', apiKey);
    url.searchParams.set('symbols', affordableTickers.join(','));

    const response = await fetch(url);
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.error) {
      const message = payload?.error?.message || `Marketstack request failed with status ${response.status}`;
      return {
        prices,
        quota: getQuotaStatus(),
        source: 'error',
        error: message,
        missing: [...affordableTickers, ...skippedTickers],
      };
    }

    recordUsage(affordableTickers.length);

    const rows = Array.isArray(payload.data) ? payload.data : [];
    for (const row of rows) {
      const ticker = String(row.symbol || '').toUpperCase();
      if (!ticker) continue;

      const priceData = {
        price: row.close ?? row.last ?? null,
        open: row.open ?? null,
        high: row.high ?? null,
        low: row.low ?? null,
        volume: row.volume ?? null,
        date: row.date ?? null,
      };

      priceCache.set(ticker, { data: priceData, fetchedAt: now });
      prices[ticker] = priceData;
    }

    return {
      prices,
      quota: getQuotaStatus(),
      source: 'live',
      missing: skippedTickers.length ? skippedTickers : undefined,
    };
  } catch (error) {
    return {
      prices,
      quota: getQuotaStatus(),
      source: 'error',
      error: error instanceof Error ? error.message : String(error),
      missing: [...affordableTickers, ...skippedTickers],
    };
  }
}
