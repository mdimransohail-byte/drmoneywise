/* ════════════════════════════════════════════════════════════════════════
   TOP 10 ETFs FOR BEGINNERS — fixed list, ranked by lowest yearly fee
   ───────────────────────────────────────────────────────────────────────
   Fees change rarely. They were checked on CHECKED_ON against each fund's
   page; re-check every 3 months (the Admin Data engine box reminds you)
   and edit the numbers below if a fund changes its fee.
   expenseRatio is a percentage per year, e.g. 0.03 means 0.03% a year.
   ════════════════════════════════════════════════════════════════════════ */

export const ETF_CHECKED_ON = '2026-10-17';
export const ETF_SOURCE = 'Fund fees from each fund’s published details (via stockanalysis.com), checked 17 Oct 2026';

export const ETF_LIST = [
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.03,
    kind: 'Whole US stock market',
    inside: 'About 3,500 US companies, big and small, in one fund.',
    suits: 'A simple core holding for long-term US investing.',
  },
  {
    ticker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.03,
    kind: 'Biggest 500 US companies',
    inside: 'The 500 large US companies in the S&P 500 index.',
    suits: 'People who want the best-known US companies in one go.',
  },
  {
    ticker: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.03,
    kind: 'US bonds',
    inside: 'Thousands of high-quality US government and company bonds (loans that pay interest).',
    suits: 'Steadier money alongside shares; tends to swing less.',
  },
  {
    ticker: 'VIG',
    name: 'Vanguard Dividend Appreciation ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.04,
    kind: 'US dividend growers',
    inside: 'US companies that have raised their dividends for at least 10 years in a row.',
    suits: 'People who like steady, growing companies.',
  },
  {
    ticker: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.05,
    kind: 'Companies outside the US',
    inside: 'Thousands of companies across Europe, Asia and emerging markets.',
    suits: 'Spreading money beyond the US.',
  },
  {
    ticker: 'VT',
    name: 'Vanguard Total World Stock ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.06,
    kind: 'The whole world',
    inside: 'Thousands of companies in the US and around the world, in one fund.',
    suits: 'The simplest "own a bit of everything" choice.',
  },
  {
    ticker: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    issuer: 'Charles Schwab',
    expenseRatio: 0.06,
    kind: 'US dividend payers',
    inside: '100 US companies chosen for paying solid, reliable dividends.',
    suits: 'People who want regular cash income.',
  },
  {
    ticker: 'GLDM',
    name: 'SPDR Gold MiniShares Trust',
    issuer: 'State Street',
    expenseRatio: 0.10,
    kind: 'Gold',
    inside: 'Real gold bars stored in London vaults.',
    suits: 'A small slice of protection when markets are shaky. Pays no income.',
  },
  {
    ticker: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    issuer: 'Vanguard',
    expenseRatio: 0.13,
    kind: 'Property companies',
    inside: 'US companies that own offices, flats, warehouses and other buildings.',
    suits: 'Property exposure without buying a building.',
  },
  {
    ticker: 'QQQM',
    name: 'Invesco NASDAQ 100 ETF',
    issuer: 'Invesco',
    expenseRatio: 0.15,
    kind: '100 big tech-heavy companies',
    inside: 'The 100 largest non-financial companies on the Nasdaq exchange, mostly technology.',
    suits: 'People comfortable with bigger ups and downs for growth.',
  },
];

/* ════════════════════════════════════════════════════════════════════════
   MORE ETFs WITH THEIR OWN PAGE (/etfs/<ticker>), besides the Top 10.
   Any other ETF can still be looked up by ticker; its page then shows the
   holdings from SEC filings, without our written description or fee.
   Fees checked 19 Oct 2026 against each provider's fund list
   (via stockanalysis.com). tv = TradingView symbol for the price box.
   sameAs: unit-trust ETFs (like SPY) do not file holdings reports; we show
   the holdings of a fund that follows the same index, and say so.
   ════════════════════════════════════════════════════════════════════════ */
export const MORE_ETFS = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', issuer: 'State Street', expenseRatio: 0.0945, kind: 'Biggest 500 US companies', inside: 'The 500 large US companies in the S&P 500 index. The oldest and most traded ETF in the world.', suits: 'People who want the S&P 500; long-term savers may prefer a cheaper fund that follows the same index.', sameAs: 'VOO' },
  { ticker: 'SPYM', name: 'SPDR Portfolio S&P 500 ETF', issuer: 'State Street', expenseRatio: 0.02, kind: 'Biggest 500 US companies', inside: 'The same 500 companies as SPY, at a much lower yearly fee.', suits: 'Long-term savers who want the S&P 500 cheaply.' },
  { ticker: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', issuer: 'Vanguard', expenseRatio: 0.03, kind: 'Rich countries outside the US', inside: 'Thousands of companies in Europe, Japan, Canada, Australia and other developed countries.', suits: 'Spreading money across rich countries beyond the US.' },
  { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', issuer: 'Vanguard', expenseRatio: 0.06, kind: 'Emerging markets', inside: 'Companies in fast-growing countries such as China, India, Taiwan and Brazil.', suits: 'A smaller, longer-term slice for growth, accepting bigger ups and downs.' },
  { ticker: 'VUG', name: 'Vanguard Growth ETF', issuer: 'Vanguard', expenseRatio: 0.03, kind: 'US growth companies', inside: 'Large US companies whose sales and profits are growing fast, many of them in technology.', suits: 'People who want more of the fast-growing big names.' },
  { ticker: 'VTV', name: 'Vanguard Value ETF', issuer: 'Vanguard', expenseRatio: 0.03, kind: 'US value companies', inside: 'Large US companies that look cheap compared with their profits, such as banks, healthcare and energy firms.', suits: 'People who prefer steady, lower-priced companies.' },
  { ticker: 'VYM', name: 'Vanguard High Dividend Yield ETF', issuer: 'Vanguard', expenseRatio: 0.04, kind: 'US high dividends', inside: 'US companies that pay higher-than-average dividends.', suits: 'People who want regular income from shares.' },
  { ticker: 'VGT', name: 'Vanguard Information Technology ETF', issuer: 'Vanguard', expenseRatio: 0.09, kind: 'US technology', inside: 'US technology companies: chips, software, computers and phones.', suits: 'A focused bet on technology, with bigger ups and downs than a broad fund.' },
  { ticker: 'XLK', name: 'Technology Select Sector SPDR Fund', issuer: 'State Street', expenseRatio: 0.08, kind: 'US technology (S&P 500)', inside: 'The technology companies in the S&P 500.', suits: 'A focused bet on the biggest US tech companies.' },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR Fund', issuer: 'State Street', expenseRatio: 0.08, kind: 'US banks and finance', inside: 'The banks, insurers and payment companies in the S&P 500.', suits: 'A focused bet on US finance.' },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund', issuer: 'State Street', expenseRatio: 0.08, kind: 'US oil and gas companies', inside: 'The oil and gas companies in the S&P 500.', suits: 'A focused bet on energy, which moves with oil prices.' },
];

/** TradingView symbol for an ETF's price box. */
export const ETF_EXCHANGE = {
  BND: 'NASDAQ', VXUS: 'NASDAQ', QQQM: 'NASDAQ',
};
export const etfTvSymbol = (ticker) => `${ETF_EXCHANGE[ticker] || 'AMEX'}:${ticker}`;

/** GLDM-style funds hold a commodity directly, not shares. */
export const ETF_COMMODITY = { GLDM: 'gold' };
