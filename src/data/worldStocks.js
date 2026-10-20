/* ════════════════════════════════════════════════════════════════════════
   STOCKS BY REGION — the regions and companies on /stocks/world
   ───────────────────────────────────────────────────────────────────────
   sec    Companies that file a yearly report (20-F) with the US SEC.
          They get a full report card, the screener and the big-fund data,
          exactly like US companies. Figures are converted to US dollars at
          the latest European Central Bank rate (ratios are unchanged).
          Tickers checked against the SEC ticker list, Oct 2026.
   local  Big local companies that do NOT report to the SEC. Their stock
          exchanges' terms don't allow us to reuse their data, so their
          pages use TradingView's free widgets (price, profile, key
          financials, shown with TradingView's credit) plus our news links.
   index  TradingView symbol for the region's main share index.
   If a widget shows "only available on TradingView", change its symbol
   here (or remove the company) and upload this file.
   Sector names match src/data/sectorLeaders.js.
   ════════════════════════════════════════════════════════════════════════ */

export const WORLD_REGIONS = [
  {
    id: 'uk', name: 'United Kingdom', short: 'UK', currency: 'GBP', colour: '#2a78d6',
    index: { symbol: 'FOREXCOM:UKXGBP', name: 'FTSE 100' },
    exchanges: 'London Stock Exchange',
    intro: 'The London Stock Exchange is one of Europe’s biggest. Its best-known index, the FTSE 100, follows the 100 largest companies listed there. Many of them earn most of their money outside Britain, so a weaker pound can lift their profits when counted in pounds.',
    sec: [
      ['SHEL', 'Energy'], ['BP', 'Energy'], ['AZN', 'Health care'], ['GSK', 'Health care'], ['SNN', 'Health care'],
      ['HSBC', 'Banks & finance'], ['BCS', 'Banks & finance'], ['LYG', 'Banks & finance'], ['NWG', 'Banks & finance'], ['PUK', 'Banks & finance'],
      ['UL', 'Everyday essentials'], ['DEO', 'Everyday essentials'], ['BTI', 'Everyday essentials'], ['CCEP', 'Everyday essentials'],
      ['RIO', 'Materials'], ['NGG', 'Utilities'], ['VOD', 'Communication'], ['RELX', 'Industry & transport'], ['IHG', 'Shopping & leisure'], ['ARM', 'Technology'],
    ],
    local: [
      { slug: 'rolls-royce', name: 'Rolls-Royce Holdings', symbol: 'LSE:RR.', sector: 'Industry & transport' },
      { slug: 'lseg', name: 'London Stock Exchange Group', symbol: 'LSE:LSEG', sector: 'Banks & finance' },
      { slug: 'bae-systems', name: 'BAE Systems', symbol: 'LSE:BA.', sector: 'Industry & transport' },
      { slug: 'tesco', name: 'Tesco', symbol: 'LSE:TSCO', sector: 'Everyday essentials' },
      { slug: 'compass-group', name: 'Compass Group', symbol: 'LSE:CPG', sector: 'Shopping & leisure' },
    ],
  },
  {
    id: 'japan', name: 'Japan', short: 'Japan', currency: 'JPY', colour: '#e34948',
    index: { symbol: 'INDEX:NKY', name: 'Nikkei 225' },
    exchanges: 'Tokyo Stock Exchange',
    intro: 'The Tokyo Stock Exchange is Asia’s largest by the value of its companies. The Nikkei 225 and the broader TOPIX are its main indexes. Most Japanese companies end their financial year in March, so their yearly results arrive in May.',
    sec: [
      ['TM', 'Shopping & leisure'], ['HMC', 'Shopping & leisure'], ['SONY', 'Technology'], ['TAK', 'Health care'],
      ['MUFG', 'Banks & finance'], ['SMFG', 'Banks & finance'], ['MFG', 'Banks & finance'], ['NMR', 'Banks & finance'], ['IX', 'Banks & finance'],
    ],
    local: [
      { slug: 'keyence', name: 'Keyence', symbol: 'TSE:6861', sector: 'Technology' },
      { slug: 'fast-retailing', name: 'Fast Retailing (Uniqlo)', symbol: 'TSE:9983', sector: 'Shopping & leisure' },
      { slug: 'tokyo-electron', name: 'Tokyo Electron', symbol: 'TSE:8035', sector: 'Technology' },
      { slug: 'nintendo', name: 'Nintendo', symbol: 'TSE:7974', sector: 'Communication' },
      { slug: 'hitachi', name: 'Hitachi', symbol: 'TSE:6501', sector: 'Industry & transport' },
      { slug: 'softbank-group', name: 'SoftBank Group', symbol: 'TSE:9984', sector: 'Communication' },
    ],
  },
  {
    id: 'china', name: 'China', short: 'China', currency: 'CNY', colour: '#eb6834',
    index: { symbol: 'SSE:000001', name: 'Shanghai Composite' },
    exchanges: 'Shanghai, Shenzhen and Hong Kong stock exchanges',
    intro: 'Chinese companies list in Shanghai, Shenzhen, Hong Kong and, for many big internet names, New York. Many US-listed Chinese companies are owned through an offshore holding company (a “VIE” structure), which gives shareholders fewer rights than owning the business directly. Rules set by Beijing and Washington can move these shares sharply.',
    sec: [
      ['BABA', 'Shopping & leisure'], ['PDD', 'Shopping & leisure'], ['JD', 'Shopping & leisure'], ['TCOM', 'Shopping & leisure'], ['YUMC', 'Shopping & leisure'],
      ['NIO', 'Shopping & leisure'], ['LI', 'Shopping & leisure'], ['XPEV', 'Shopping & leisure'],
      ['BIDU', 'Communication'], ['NTES', 'Communication'], ['TME', 'Communication'], ['BEKE', 'Property'], ['ZTO', 'Industry & transport'],
    ],
    local: [
      { slug: 'tencent', name: 'Tencent', symbol: 'HKEX:700', sector: 'Communication' },
      { slug: 'kweichow-moutai', name: 'Kweichow Moutai', symbol: 'SSE:600519', sector: 'Everyday essentials' },
      { slug: 'catl', name: 'CATL (batteries)', symbol: 'SZSE:300750', sector: 'Industry & transport' },
      { slug: 'byd', name: 'BYD', symbol: 'HKEX:1211', sector: 'Shopping & leisure' },
      { slug: 'xiaomi', name: 'Xiaomi', symbol: 'HKEX:1810', sector: 'Technology' },
      { slug: 'icbc', name: 'ICBC', symbol: 'HKEX:1398', sector: 'Banks & finance' },
    ],
  },
  {
    id: 'india', name: 'India', short: 'India', currency: 'INR', colour: '#eda100',
    index: { symbol: 'BSE:SENSEX', name: 'BSE Sensex' },
    exchanges: 'National Stock Exchange (NSE) and BSE',
    intro: 'India’s two main exchanges are the National Stock Exchange (home of the Nifty 50 index) and the BSE (home of the Sensex). Only a handful of Indian companies also list in the US, so most of India’s biggest names, such as Reliance and TCS, are bought on the local exchanges or through India funds and ETFs.',
    sec: [
      ['INFY', 'Technology'], ['WIT', 'Technology'], ['HDB', 'Banks & finance'], ['IBN', 'Banks & finance'], ['RDY', 'Health care'], ['MMYT', 'Shopping & leisure'],
    ],
    local: [
      { slug: 'reliance-industries', name: 'Reliance Industries', symbol: 'BSE:RELIANCE', sector: 'Energy' },
      { slug: 'tcs', name: 'Tata Consultancy Services', symbol: 'BSE:TCS', sector: 'Technology' },
      { slug: 'bharti-airtel', name: 'Bharti Airtel', symbol: 'BSE:BHARTIARTL', sector: 'Communication' },
      { slug: 'state-bank-of-india', name: 'State Bank of India', symbol: 'BSE:SBIN', sector: 'Banks & finance' },
      { slug: 'hindustan-unilever', name: 'Hindustan Unilever', symbol: 'BSE:HINDUNILVR', sector: 'Everyday essentials' },
      { slug: 'larsen-toubro', name: 'Larsen & Toubro', symbol: 'BSE:LT', sector: 'Industry & transport' },
    ],
  },
  {
    id: 'south-korea', name: 'South Korea', short: 'S. Korea', currency: 'KRW', colour: '#6250d6',
    index: { symbol: 'KRX:KOSPI', name: 'KOSPI' },
    exchanges: 'Korea Exchange (KRX)',
    intro: 'The Korea Exchange is home to the KOSPI index. A few giant family-run groups (chaebol) such as Samsung, Hyundai and SK make up a big share of it, and memory chips are a large part of the market, so it often moves with the global chip cycle.',
    sec: [
      ['KB', 'Banks & finance'], ['SHG', 'Banks & finance'], ['WF', 'Banks & finance'], ['PKX', 'Materials'], ['KEP', 'Utilities'],
      ['SKM', 'Communication'], ['KT', 'Communication'], ['CPNG', 'Shopping & leisure'],
    ],
    local: [
      { slug: 'samsung-electronics', name: 'Samsung Electronics', symbol: 'KRX:005930', sector: 'Technology' },
      { slug: 'sk-hynix', name: 'SK Hynix', symbol: 'KRX:000660', sector: 'Technology' },
      { slug: 'hyundai-motor', name: 'Hyundai Motor', symbol: 'KRX:005380', sector: 'Shopping & leisure' },
      { slug: 'lg-energy-solution', name: 'LG Energy Solution', symbol: 'KRX:373220', sector: 'Industry & transport' },
      { slug: 'naver', name: 'NAVER', symbol: 'KRX:035420', sector: 'Communication' },
    ],
    note: 'Coupang is a US-registered company, but almost all of its business is in South Korea.',
  },
  {
    id: 'brazil', name: 'Brazil', short: 'Brazil', currency: 'BRL', colour: '#1baf7a',
    index: { symbol: 'BMFBOVESPA:IBOV', name: 'Ibovespa' },
    exchanges: 'B3, São Paulo',
    intro: 'B3 in São Paulo is Latin America’s largest stock exchange and the Ibovespa is its main index. Oil, iron ore, banks and farming are big parts of the market, so Brazilian shares often follow commodity prices and the real’s exchange rate.',
    sec: [
      ['PBR', 'Energy'], ['VALE', 'Materials'], ['GGB', 'Materials'], ['SUZ', 'Materials'],
      ['ITUB', 'Banks & finance'], ['BBD', 'Banks & finance'], ['BSBR', 'Banks & finance'], ['NU', 'Banks & finance'], ['XP', 'Banks & finance'],
      ['ABEV', 'Everyday essentials'], ['SBS', 'Utilities'], ['EBR', 'Utilities'], ['ERJ', 'Industry & transport'],
    ],
    local: [
      { slug: 'weg', name: 'WEG', symbol: 'BMFBOVESPA:WEGE3', sector: 'Industry & transport' },
      { slug: 'b3', name: 'B3', symbol: 'BMFBOVESPA:B3SA3', sector: 'Banks & finance' },
      { slug: 'btg-pactual', name: 'BTG Pactual', symbol: 'BMFBOVESPA:BPAC11', sector: 'Banks & finance' },
      { slug: 'localiza', name: 'Localiza', symbol: 'BMFBOVESPA:RENT3', sector: 'Shopping & leisure' },
    ],
  },
  {
    id: 'gulf', name: 'Gulf (Middle East)', short: 'Gulf', currency: 'USD', colour: '#c9a227',
    index: { symbol: 'TADAWUL:TASI', name: 'Tadawul All Share (Saudi)' },
    exchanges: 'Saudi Exchange (Tadawul), Abu Dhabi (ADX), Dubai (DFM), Qatar (QSE) and Boursa Kuwait',
    intro: 'The Saudi Exchange (Tadawul) is the region’s largest, led by Saudi Aramco. Abu Dhabi, Dubai, Qatar and Kuwait each have their own exchange. Oil and gas, banks and property dominate, and most Gulf currencies are fixed to the US dollar, so prices are not moved much by exchange rates. Gulf companies don’t report to the US regulator, so these pages use exchange data shown through TradingView.',
    sec: [],
    local: [
      { slug: 'saudi-aramco', name: 'Saudi Aramco', symbol: 'TADAWUL:2222', sector: 'Energy' },
      { slug: 'al-rajhi-bank', name: 'Al Rajhi Bank', symbol: 'TADAWUL:1120', sector: 'Banks & finance' },
      { slug: 'saudi-national-bank', name: 'Saudi National Bank', symbol: 'TADAWUL:1180', sector: 'Banks & finance' },
      { slug: 'sabic', name: 'SABIC', symbol: 'TADAWUL:2010', sector: 'Materials' },
      { slug: 'stc', name: 'stc (Saudi Telecom)', symbol: 'TADAWUL:7010', sector: 'Communication' },
      { slug: 'international-holding', name: 'International Holding Company', symbol: 'ADX:IHC', sector: 'Industry & transport' },
      { slug: 'first-abu-dhabi-bank', name: 'First Abu Dhabi Bank', symbol: 'ADX:FAB', sector: 'Banks & finance' },
      { slug: 'adnoc-gas', name: 'ADNOC Gas', symbol: 'ADX:ADNOCGAS', sector: 'Energy' },
      { slug: 'e-and', name: 'e& (Etisalat)', symbol: 'ADX:EAND', sector: 'Communication' },
      { slug: 'emaar-properties', name: 'Emaar Properties', symbol: 'DFM:EMAAR', sector: 'Property' },
      { slug: 'emirates-nbd', name: 'Emirates NBD', symbol: 'DFM:EMIRATESNBD', sector: 'Banks & finance' },
      { slug: 'dewa', name: 'Dubai Electricity and Water (DEWA)', symbol: 'DFM:DEWA', sector: 'Utilities' },
      { slug: 'qnb', name: 'QNB (Qatar National Bank)', symbol: 'QSE:QNBK', sector: 'Banks & finance' },
      { slug: 'kuwait-finance-house', name: 'Kuwait Finance House', symbol: 'KSE:KFH', sector: 'Banks & finance' },
    ],
  },
];

export const worldRegion = (id) => WORLD_REGIONS.find((r) => r.id === id) || null;

/** Every SEC-reporting overseas ticker (added to the data engine's list). */
export function worldSecTickers() {
  return [...new Set(WORLD_REGIONS.flatMap((r) => r.sec.map(([t]) => t)))];
}

/** { TICKER: { region, sector } } for the overseas SEC companies. */
export function worldTickerInfo() {
  const out = {};
  for (const r of WORLD_REGIONS) for (const [t, sector] of r.sec) out[t] = { region: r.id, regionName: r.name, sector };
  return out;
}
