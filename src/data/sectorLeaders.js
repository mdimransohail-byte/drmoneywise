/* ════════════════════════════════════════════════════════════════════════
   SECTORS — the /stocks page shows the 10 largest companies in each
   ───────────────────────────────────────────────────────────────────────
   Each sector lists about 12–15 big US companies (standard GICS sectors,
   list reviewed 17 October 2026). The site ranks them by size itself:
     • by market value (latest price × shares) once daily prices are on
       (Marketstack paid plan, from launch), otherwise
     • by yearly sales from their SEC filings.
   and shows the top 10. Any other US-listed company can still be looked up
   by name or ticker — its page is built on request from SEC filings.

   To add a company: add its ticker (as on the SEC list, e.g. "BRK-B").
   ════════════════════════════════════════════════════════════════════════ */

export const SECTORS = [
  {
    id: 'technology',
    name: 'Technology',
    plain: 'Companies that make computers, chips, phones and the software that runs on them.',
    tickers: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'AMD', 'CSCO', 'IBM', 'ADBE', 'INTU', 'QCOM', 'TXN', 'NOW', 'MU'],
  },
  {
    id: 'communication',
    name: 'Communication',
    plain: 'Search, social media, streaming, phone and internet companies.',
    tickers: ['GOOGL', 'META', 'NFLX', 'TMUS', 'DIS', 'T', 'VZ', 'CMCSA', 'CHTR', 'EA', 'TTWO', 'OMC'],
  },
  {
    id: 'consumer-discretionary',
    name: 'Shopping & leisure',
    plain: 'Things people buy when they have money to spare: cars, online shopping, restaurants, travel and clothes.',
    tickers: ['AMZN', 'TSLA', 'HD', 'MCD', 'BKNG', 'LOW', 'TJX', 'SBUX', 'NKE', 'ORLY', 'CMG', 'GM', 'F'],
  },
  {
    id: 'consumer-staples',
    name: 'Everyday essentials',
    plain: 'Food, drink, cleaning products and supermarkets: things people buy in good times and bad.',
    tickers: ['WMT', 'COST', 'PG', 'KO', 'PEP', 'PM', 'MO', 'MDLZ', 'CL', 'KMB', 'KR', 'TGT', 'GIS'],
  },
  {
    id: 'health-care',
    name: 'Health care',
    plain: 'Drug makers, medical equipment, hospitals and health insurers.',
    tickers: ['LLY', 'JNJ', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'ISRG', 'AMGN', 'PFE', 'DHR', 'BSX', 'GILD', 'BMY', 'VRTX'],
  },
  {
    id: 'financials',
    name: 'Banks & finance',
    plain: 'Banks, card networks, insurers and investment firms.',
    tickers: ['BRK-B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'AXP', 'SCHW', 'C', 'BLK', 'SPGI', 'PGR', 'CB'],
  },
  {
    id: 'industrials',
    name: 'Industry & transport',
    plain: 'Planes, machines, railways, delivery, defence and building services.',
    tickers: ['GE', 'CAT', 'RTX', 'HON', 'UNP', 'BA', 'DE', 'LMT', 'UPS', 'ETN', 'ADP', 'WM', 'GD', 'NOC', 'MMM'],
  },
  {
    id: 'energy',
    name: 'Energy',
    plain: 'Oil and gas producers, refiners and pipelines.',
    tickers: ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'WMB', 'KMI', 'MPC', 'PSX', 'OKE', 'VLO', 'OXY'],
  },
  {
    id: 'utilities',
    name: 'Utilities',
    plain: 'Electricity, gas and water suppliers. Usually steady, often pay dividends.',
    tickers: ['NEE', 'SO', 'DUK', 'CEG', 'AEP', 'SRE', 'D', 'EXC', 'XEL', 'PCG', 'ED', 'PEG'],
  },
  {
    id: 'real-estate',
    name: 'Property',
    plain: 'Companies that own warehouses, offices, phone towers, data centres and homes, and rent them out (often REITs).',
    tickers: ['PLD', 'AMT', 'WELL', 'EQIX', 'SPG', 'O', 'PSA', 'CCI', 'DLR', 'VICI', 'EXR', 'AVB'],
  },
  {
    id: 'materials',
    name: 'Materials',
    plain: 'Chemicals, paint, metals, mining and building materials.',
    tickers: ['LIN', 'SHW', 'ECL', 'APD', 'FCX', 'NEM', 'CTVA', 'DOW', 'NUE', 'DD', 'VMC', 'MLM'],
  },
];

export const SECTORS_REVIEWED = '17 October 2026';

export function sectorTickers() {
  return [...new Set(SECTORS.flatMap((s) => s.tickers))];
}

/** Sector a ticker belongs to (or null). */
export function sectorOf(ticker) {
  return SECTORS.find((s) => s.tickers.includes(ticker)) || null;
}
