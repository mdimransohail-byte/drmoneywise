/* ════════════════════════════════════════════════════════════════════════
   STOCK UNIVERSE — the companies Dr MoneyWise covers
   ───────────────────────────────────────────────────────────────────────
   Launch set: ~120 large, well-known US-listed companies, including the
   long-running dividend payers used for the Top 10 Dividend Stocks list.
   To add a company, add its ticker below (as written on the SEC list,
   e.g. "BRK-B") and upload this file. The data engine picks it up on its
   next weekly run, or straight away with Admin → "Run now".
   ════════════════════════════════════════════════════════════════════════ */

export const STOCK_UNIVERSE = [
  // Largest US companies
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO', 'LLY',
  'JPM', 'V', 'MA', 'UNH', 'XOM', 'JNJ', 'WMT', 'PG', 'HD', 'COST',
  'ORCL', 'CVX', 'MRK', 'ABBV', 'KO', 'PEP', 'BAC', 'NFLX', 'ADBE', 'CRM',
  'AMD', 'TMO', 'MCD', 'CSCO', 'ABT', 'DIS', 'WFC', 'INTC', 'VZ', 'T',
  'PFE', 'NKE', 'QCOM', 'TXN', 'IBM', 'CAT', 'GE', 'HON', 'UNP', 'LOW',
  'SBUX', 'BA', 'GS', 'MS', 'AMGN', 'BMY', 'CVS', 'LMT', 'RTX', 'UPS',
  'DE', 'SPGI', 'BLK', 'AXP', 'NEE', 'DUK', 'SO', 'PLD', 'AMT', 'MO',
  'PM', 'TGT', 'ADP', 'PNC', 'USB',
  // Long-running dividend payers
  'MMM', 'CL', 'KMB', 'GIS', 'HSY', 'SYY', 'ITW', 'EMR', 'APD', 'SHW',
  'ECL', 'ED', 'XEL', 'WEC', 'AFL', 'CB', 'TRV', 'CAH', 'BEN', 'TROW',
  'GPC', 'SWK', 'DOV', 'PPG', 'NUE', 'CLX', 'CHD', 'MKC', 'CINF', 'ESS',
  'FRT', 'ATO', 'NDSN', 'CTAS', 'BDX', 'ADM', 'AOS', 'BRO', 'CHRW', 'EXPD',
  'FAST', 'GD', 'GWW', 'PNR', 'ROP', 'O', 'LIN', 'KVUE', 'MDT', 'D',
];

/** Unique, upper-case list (protects against accidental duplicates above). */
export function getUniverse() {
  return Array.from(new Set(STOCK_UNIVERSE.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean)));
}

/** Marketstack writes share classes with a dot (BRK.B); the SEC uses a dash (BRK-B). */
export function toPriceSymbol(ticker) {
  return ticker.replace('-', '.');
}
