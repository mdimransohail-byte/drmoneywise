import { getLatestPrices, getQuotaStatus } from './marketstackClient.js';

const DEFAULT_TICKERS = ['NVDA', 'MSFT', 'BTC', 'GLD'];

/**
 * Build a watchlist snapshot for the given tickers, using live Marketstack
 * prices where quota/cache allow, and falling back to demo notes otherwise.
 *
 * @param {{ tickers?: string[] }} options
 */
export async function getWatchlistSnapshot({ tickers = [] } = {}) {
  const cleanedTickers = (tickers.length ? tickers : DEFAULT_TICKERS)
    .map((ticker) => String(ticker || '').trim().toUpperCase())
    .filter(Boolean);

  const { prices, quota, source, missing, error } = await getLatestPrices(cleanedTickers);

  const haveAnyLiveData = source === 'live' || source === 'cache';

  const items = cleanedTickers.map((ticker, index) => {
    const priceData = prices[ticker];

    if (priceData) {
      return {
        ticker,
        price: priceData.price,
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        volume: priceData.volume,
        asOf: priceData.date,
        note: buildLiveNote(priceData),
        alert: buildAlertLevel(priceData),
      };
    }

    // No live/cached price available for this ticker (no API key yet, quota
    // exhausted, or the symbol wasn't found) — demo-style placeholder so the
    // UI still has something sensible to render.
    return {
      ticker,
      note: index % 2 === 0 ? 'Momentum is improving.' : 'Wait for confirmation from the next headline.',
      alert: index % 3 === 0 ? 'high' : 'medium',
    };
  });

  return {
    mode: haveAnyLiveData ? 'live' : 'demo',
    provider: haveAnyLiveData ? 'Marketstack' : 'Local watchlist demo',
    items,
    quota,
    dataSource: source,
    missingTickers: missing && missing.length ? missing : undefined,
    error,
  };
}

function buildLiveNote(priceData) {
  if (priceData.price == null || priceData.open == null) {
    return 'Latest price loaded from Marketstack.';
  }

  const change = priceData.price - priceData.open;
  const changePct = priceData.open ? (change / priceData.open) * 100 : 0;
  const direction = change >= 0 ? 'up' : 'down';

  return `${direction === 'up' ? 'Up' : 'Down'} ${Math.abs(changePct).toFixed(2)}% from the day's open.`;
}

function buildAlertLevel(priceData) {
  if (priceData.price == null || priceData.open == null) {
    return 'medium';
  }

  const changePct = priceData.open ? ((priceData.price - priceData.open) / priceData.open) * 100 : 0;
  const magnitude = Math.abs(changePct);

  if (magnitude >= 3) return 'high';
  if (magnitude >= 1) return 'medium';
  return 'low';
}

/**
 * Re-exported so callers (e.g. server routes) can surface a quota warning
 * without needing to fetch a full watchlist snapshot first.
 */
export { getQuotaStatus };
