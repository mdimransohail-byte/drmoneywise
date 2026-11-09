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
    id: 'europe', name: 'Europe', short: 'Europe', currency: 'EUR', colour: '#6250d6',
    index: { symbol: 'TVC:SX5E', name: 'Euro Stoxx 50' },
    exchanges: 'Euronext, Deutsche Börse (Xetra), SIX Swiss Exchange and others',
    intro: 'Europe’s shares trade on several exchanges: Euronext (Paris, Amsterdam, Milan, Brussels, Dublin, Lisbon and Oslo), Deutsche Börse in Frankfurt, SIX in Zurich, Nasdaq Nordic and more. The Euro Stoxx 50 follows 50 large companies from countries that use the euro. The companies below also report to the US SEC; figures are converted to US dollars.',
    sec: [
      ['ASML', 'Technology'], ['SAP', 'Technology'], ['NOK', 'Technology'], ['ERIC', 'Technology'], ['LOGI', 'Technology'],
      ['NVO', 'Health care'], ['NVS', 'Health care'], ['SNY', 'Health care'], ['PHG', 'Health care'], ['ALC', 'Health care'],
      ['TTE', 'Energy'], ['EQNR', 'Energy'], ['E', 'Energy'],
      ['STLA', 'Shopping & leisure'], ['RACE', 'Shopping & leisure'], ['BUD', 'Everyday essentials'],
      ['TEF', 'Communication'], ['SPOT', 'Communication'],
      ['ING', 'Banks & finance'], ['UBS', 'Banks & finance'], ['SAN', 'Banks & finance'],
    ],
    local: [
      { slug: 'lvmh', name: 'LVMH', symbol: 'EURONEXT:MC', sector: 'Shopping & leisure' },
      { slug: 'siemens', name: 'Siemens', symbol: 'XETR:SIE', sector: 'Industry & transport' },
      { slug: 'nestle', name: 'Nestlé', symbol: 'SIX:NESN', sector: 'Everyday essentials' },
      { slug: 'loreal', name: 'L’Oréal', symbol: 'EURONEXT:OR', sector: 'Everyday essentials' },
      { slug: 'airbus', name: 'Airbus', symbol: 'EURONEXT:AIR', sector: 'Industry & transport' },
      { slug: 'inditex', name: 'Inditex (Zara)', symbol: 'BME:ITX', sector: 'Shopping & leisure' },
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
    id: 'singapore', name: 'Singapore', short: 'Singapore', currency: 'SGD', colour: '#e5566f',
    // Followed, like the Gulf, through a US-listed fund that holds Singapore
    // shares: its price (TradingView) and its official SEC holdings report.
    widgets: false,
    index: { symbol: 'AMEX:EWS', name: 'Singapore shares (iShares MSCI Singapore ETF)' },
    exchanges: 'Singapore Exchange (SGX)',
    intro: 'The Singapore Exchange is home to the Straits Times Index (STI), which follows 30 of its largest companies. Banks are a big part of the market, along with property trusts (REITs), telecoms and transport. Several large Singapore-based internet companies, such as Sea and Grab, list in New York instead.',
    etfs: [
      { ticker: 'EWS', tv: 'AMEX:EWS', name: 'iShares MSCI Singapore ETF', country: 'Singapore' },
    ],
    officialSites: [['Singapore Exchange', 'https://www.sgx.com'], ['Monetary Authority of Singapore', 'https://www.mas.gov.sg']],
    sec: [['SE', 'Shopping & leisure'], ['GRAB', 'Industry & transport']],
    local: [
      { slug: 'dbs-group', name: 'DBS Group', symbol: 'SGX:D05', sector: 'Banks & finance', etf: 'EWS', match: '\\bdbs\\b' },
      { slug: 'ocbc', name: 'OCBC (Oversea-Chinese Banking Corporation)', symbol: 'SGX:O39', sector: 'Banks & finance', etf: 'EWS', match: 'oversea-chinese|oversea chinese|\\bocbc\\b' },
      { slug: 'uob', name: 'UOB (United Overseas Bank)', symbol: 'SGX:U11', sector: 'Banks & finance', etf: 'EWS', match: 'united overseas bank|\\buob\\b' },
      { slug: 'singtel', name: 'Singtel (Singapore Telecommunications)', symbol: 'SGX:Z74', sector: 'Communication', etf: 'EWS', match: 'singapore telecom|singtel' },
      { slug: 'keppel', name: 'Keppel', symbol: 'SGX:BN4', sector: 'Industry & transport', etf: 'EWS', match: 'keppel' },
      { slug: 'capitaland-integrated-commercial-trust', name: 'CapitaLand Integrated Commercial Trust', symbol: 'SGX:C38U', sector: 'Property', etf: 'EWS', match: 'capitaland integrated' },
      { slug: 'singapore-airlines', name: 'Singapore Airlines', symbol: 'SGX:C6L', sector: 'Industry & transport', etf: 'EWS', match: 'singapore airlines' },
      { slug: 'wilmar', name: 'Wilmar International', symbol: 'SGX:F34', sector: 'Everyday essentials', etf: 'EWS', match: 'wilmar' },
    ],
  },
  {
    id: 'malaysia', name: 'Malaysia', short: 'Malaysia', currency: 'MYR', colour: '#0f8a76',
    widgets: false,
    index: { symbol: 'AMEX:EWM', name: 'Malaysian shares (iShares MSCI Malaysia ETF)' },
    exchanges: 'Bursa Malaysia, Kuala Lumpur',
    intro: 'Bursa Malaysia in Kuala Lumpur is home to the FTSE Bursa Malaysia KLCI, which follows its 30 largest companies. Banks, utilities, palm oil and telecoms are big parts of the market. Malaysia is also a world centre for Islamic finance: its Securities Commission publishes an official list of Shariah-compliant shares twice a year.',
    etfs: [
      { ticker: 'EWM', tv: 'AMEX:EWM', name: 'iShares MSCI Malaysia ETF', country: 'Malaysia' },
    ],
    officialSites: [['Bursa Malaysia', 'https://www.bursamalaysia.com'], ['Securities Commission Malaysia', 'https://www.sc.com.my']],
    sec: [],
    local: [
      { slug: 'maybank', name: 'Maybank (Malayan Banking)', symbol: 'MYX:MAYBANK', sector: 'Banks & finance', etf: 'EWM', match: 'malayan banking|maybank' },
      { slug: 'public-bank', name: 'Public Bank', symbol: 'MYX:PBBANK', sector: 'Banks & finance', etf: 'EWM', match: 'public bank' },
      { slug: 'cimb-group', name: 'CIMB Group', symbol: 'MYX:CIMB', sector: 'Banks & finance', etf: 'EWM', match: '\\bcimb\\b' },
      { slug: 'tenaga-nasional', name: 'Tenaga Nasional', symbol: 'MYX:TENAGA', sector: 'Utilities', etf: 'EWM', match: 'tenaga' },
      { slug: 'ihh-healthcare', name: 'IHH Healthcare', symbol: 'MYX:IHH', sector: 'Health care', etf: 'EWM', match: '\\bihh\\b' },
      { slug: 'press-metal', name: 'Press Metal Aluminium', symbol: 'MYX:PMETAL', sector: 'Materials', etf: 'EWM', match: 'press metal' },
      { slug: 'celcomdigi', name: 'CelcomDigi', symbol: 'MYX:CDB', sector: 'Communication', etf: 'EWM', match: 'celcomdigi' },
      { slug: 'petronas-gas', name: 'Petronas Gas', symbol: 'MYX:PETGAS', sector: 'Energy', etf: 'EWM', match: 'petronas gas' },
    ],
  },
  {
    id: 'gulf', name: 'Gulf (Middle East)', short: 'Gulf', currency: 'USD', colour: '#c9a227',
    // TradingView's free widgets don't show Gulf exchanges, so the Gulf pages
    // use US-listed funds that hold Gulf shares: their prices (TradingView)
    // and their official holdings reports to the SEC (Form N-PORT).
    widgets: false,
    index: { symbol: 'AMEX:KSA', name: 'Saudi shares (iShares MSCI Saudi Arabia ETF)' },
    exchanges: 'Saudi Exchange (Tadawul), Abu Dhabi (ADX), Dubai (DFM), Qatar (QSE) and Boursa Kuwait',
    intro: 'The Saudi Exchange (Tadawul) is the region’s largest, led by Saudi Aramco. Abu Dhabi, Dubai, Qatar and Kuwait each have their own exchange. Oil and gas, banks and property dominate, and most Gulf currencies are fixed to the US dollar, so prices are not moved much by exchange rates. Gulf companies don’t report to the US regulator, so we follow them through US-listed funds that own them, using those funds’ official holdings reports.',
    etfs: [
      { ticker: 'KSA', tv: 'AMEX:KSA', name: 'iShares MSCI Saudi Arabia ETF', country: 'Saudi Arabia' },
      { ticker: 'UAE', tv: 'NASDAQ:UAE', name: 'iShares MSCI UAE ETF', country: 'United Arab Emirates' },
      { ticker: 'QAT', tv: 'NASDAQ:QAT', name: 'iShares MSCI Qatar ETF', country: 'Qatar' },
      { ticker: 'KWT', tv: 'KWT', name: 'iShares MSCI Kuwait ETF', country: 'Kuwait' },
    ],
    officialSites: [
      ['Saudi Exchange', 'https://www.saudiexchange.sa'], ['Abu Dhabi Securities Exchange', 'https://www.adx.ae'],
      ['Dubai Financial Market', 'https://www.dfm.ae'], ['Qatar Stock Exchange', 'https://www.qe.com.qa'], ['Boursa Kuwait', 'https://www.boursakuwait.com.kw'],
    ],
    sec: [],
    local: [
      { slug: 'saudi-aramco', name: 'Saudi Aramco', symbol: 'TADAWUL:2222', sector: 'Energy', etf: 'KSA', match: 'saudi arabian oil|aramco' },
      { slug: 'al-rajhi-bank', name: 'Al Rajhi Bank', symbol: 'TADAWUL:1120', sector: 'Banks & finance', etf: 'KSA', match: 'al rajhi' },
      { slug: 'saudi-national-bank', name: 'Saudi National Bank', symbol: 'TADAWUL:1180', sector: 'Banks & finance', etf: 'KSA', match: 'saudi national bank' },
      { slug: 'sabic', name: 'SABIC', symbol: 'TADAWUL:2010', sector: 'Materials', etf: 'KSA', match: 'saudi basic industries|sabic' },
      { slug: 'stc', name: 'stc (Saudi Telecom)', symbol: 'TADAWUL:7010', sector: 'Communication', etf: 'KSA', match: 'saudi telecom|\\bstc\\b' },
      { slug: 'international-holding', name: 'International Holding Company', symbol: 'ADX:IHC', sector: 'Industry & transport', etf: 'UAE', match: 'international holding' },
      { slug: 'first-abu-dhabi-bank', name: 'First Abu Dhabi Bank', symbol: 'ADX:FAB', sector: 'Banks & finance', etf: 'UAE', match: 'first abu dhabi' },
      { slug: 'adnoc-gas', name: 'ADNOC Gas', symbol: 'ADX:ADNOCGAS', sector: 'Energy', etf: 'UAE', match: 'adnoc gas' },
      { slug: 'e-and', name: 'e& (Etisalat)', symbol: 'ADX:EAND', sector: 'Communication', etf: 'UAE', match: 'emirates telecom|etisalat' },
      { slug: 'emaar-properties', name: 'Emaar Properties', symbol: 'DFM:EMAAR', sector: 'Property', etf: 'UAE', match: 'emaar properties' },
      { slug: 'emirates-nbd', name: 'Emirates NBD', symbol: 'DFM:EMIRATESNBD', sector: 'Banks & finance', etf: 'UAE', match: 'emirates nbd' },
      { slug: 'dewa', name: 'Dubai Electricity and Water (DEWA)', symbol: 'DFM:DEWA', sector: 'Utilities', etf: 'UAE', match: 'dubai electricity' },
      { slug: 'qnb', name: 'QNB (Qatar National Bank)', symbol: 'QSE:QNBK', sector: 'Banks & finance', etf: 'QAT', match: 'qatar national bank|\\bqnb\\b' },
      { slug: 'kuwait-finance-house', name: 'Kuwait Finance House', symbol: 'KSE:KFH', sector: 'Banks & finance', etf: 'KWT', match: 'kuwait finance house' },
    ],
  },
];

export const worldRegion = (id) => WORLD_REGIONS.find((r) => r.id === id) || null;

/** Every SEC-reporting overseas ticker (added to the data engine's list). */
export function worldSecTickers() {
  return [...new Set(WORLD_REGIONS.flatMap((r) => r.sec.map(([t]) => t)))];
}

/** US-listed funds used to follow regions whose exchanges TradingView can't show. */
export function worldEtfTickers() {
  return [...new Set(WORLD_REGIONS.flatMap((r) => (r.etfs || []).map((e) => e.ticker)))];
}

/** { TICKER: { region, sector } } for the overseas SEC companies. */
export function worldTickerInfo() {
  const out = {};
  for (const r of WORLD_REGIONS) for (const [t, sector] of r.sec) out[t] = { region: r.id, regionName: r.name, sector };
  return out;
}
