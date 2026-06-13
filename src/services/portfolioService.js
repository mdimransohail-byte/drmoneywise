export async function getPortfolioSnapshot() {
  if (process.env.PORTFOLIO_API_URL) {
    try {
      const response = await fetch(process.env.PORTFOLIO_API_URL, {
        headers: buildHeaders(process.env.PORTFOLIO_API_KEY),
      });

      if (response.ok) {
        const payload = await response.json();
        return {
          mode: 'live',
          provider: 'Custom portfolio API',
          holdings: normalizePortfolioPayload(payload),
        };
      }
    } catch {
      // Fall back to demo holdings if the custom endpoint is unavailable.
    }
  }

  return {
    mode: 'demo',
    provider: 'Local portfolio demo',
    holdings: [
      { ticker: 'MSFT', weight: '28%', note: 'Core AI platform exposure' },
      { ticker: 'NVDA', weight: '22%', note: 'High-growth semiconductor leader' },
      { ticker: 'GLD', weight: '15%', note: 'Portfolio protection sleeve' },
      { ticker: 'BTC', weight: '10%', note: 'High-volatility growth sleeve' },
    ],
  };
}

function normalizePortfolioPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.holdings)) {
    return payload.holdings;
  }

  return [];
}

function buildHeaders(apiKey) {
  if (!apiKey) {
    return {};
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}
