import { getLatestPrices, getQuotaStatus } from './marketstackClient.js';

const DEFAULT_HOLDINGS = [
  { ticker: 'MSFT', weight: '28%', note: 'Core AI platform exposure' },
  { ticker: 'NVDA', weight: '22%', note: 'High-growth semiconductor leader' },
  { ticker: 'GLD', weight: '15%', note: 'Portfolio protection sleeve' },
  { ticker: 'BTC', weight: '10%', note: 'High-volatility growth sleeve' },
];

/**
 * Build a portfolio snapshot for the given holdings, attaching live
 * Marketstack prices where quota/cache allow.
 *
 * @param {{ holdings?: Array<{ ticker: string, shares?: number, weight?: string, note?: string }> }} options
 */
export async function getPortfolioSnapshot({ holdings = [] } = {}) {
  const cleanedHoldings = (holdings.length ? holdings : DEFAULT_HOLDINGS)
    .map((holding) => ({
      ticker: String(holding.ticker || '').trim().toUpperCase(),
      shares: holding.shares != null ? Number(holding.shares) : null,
      weight: holding.weight ?? null,
      note: holding.note ?? null,
    }))
    .filter((holding) => holding.ticker);

  const tickers = cleanedHoldings.map((holding) => holding.ticker);
  const { prices, quota, source, missing, error } = await getLatestPrices(tickers);

  const haveAnyLiveData = source === 'live' || source === 'cache';

  let totalValue = 0;
  let totalValueIsComplete = true;

  const enrichedHoldings = cleanedHoldings.map((holding) => {
    const priceData = prices[holding.ticker];

    if (!priceData) {
      totalValueIsComplete = false;
      return {
        ticker: holding.ticker,
        weight: holding.weight,
        note: holding.note || 'Live price unavailable — showing last known allocation only.',
      };
    }

    const value = holding.shares != null && Number.isFinite(holding.shares) ? holding.shares * priceData.price : null;
    if (value != null) {
      totalValue += value;
    } else {
      totalValueIsComplete = false;
    }

    return {
      ticker: holding.ticker,
      shares: holding.shares,
      weight: holding.weight,
      price: priceData.price,
      open: priceData.open,
      high: priceData.high,
      low: priceData.low,
      asOf: priceData.date,
      value,
      note: holding.note || `Priced from Marketstack as of ${priceData.date || 'last close'}.`,
    };
  });

  return {
    mode: haveAnyLiveData ? 'live' : 'demo',
    provider: haveAnyLiveData ? 'Marketstack' : 'Local portfolio demo',
    holdings: enrichedHoldings,
    totalValue: totalValueIsComplete ? totalValue : null,
    quota,
    dataSource: source,
    missingTickers: missing && missing.length ? missing : undefined,
    error,
  };
}

/**
 * Re-exported so callers (e.g. server routes) can surface a quota warning
 * without needing to fetch a full portfolio snapshot first.
 */
export { getQuotaStatus };
