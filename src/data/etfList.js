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
