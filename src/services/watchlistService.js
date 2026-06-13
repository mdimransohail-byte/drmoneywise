export async function getWatchlistSnapshot({ tickers = [] } = {}) {
  const cleanedTickers = tickers.length ? tickers : ['NVDA', 'MSFT', 'BTC', 'GLD'];

  if (process.env.WATCHLIST_API_URL) {
    try {
      const url = new URL(process.env.WATCHLIST_API_URL);
      url.searchParams.set('tickers', cleanedTickers.join(','));

      const response = await fetch(url, {
        headers: buildHeaders(process.env.WATCHLIST_API_KEY),
      });

      if (response.ok) {
        const payload = await response.json();
        return {
          mode: 'live',
          provider: 'Custom watchlist API',
          items: normalizeWatchlistPayload(payload, cleanedTickers),
        };
      }
    } catch {
      // Fall back to demo data if the custom endpoint is unavailable.
    }
  }

  return {
    mode: 'demo',
    provider: 'Local watchlist demo',
    items: cleanedTickers.map((ticker, index) => ({
      ticker,
      note: index % 2 === 0 ? 'Momentum is improving.' : 'Wait for confirmation from the next headline.',
      alert: index % 3 === 0 ? 'high' : 'medium',
    })),
  };
}

function normalizeWatchlistPayload(payload, fallbackTickers) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return fallbackTickers.map((ticker) => ({
    ticker,
    note: 'Loaded from custom watchlist API.',
    alert: 'medium',
  }));
}

function buildHeaders(apiKey) {
  if (!apiKey) {
    return {};
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}
