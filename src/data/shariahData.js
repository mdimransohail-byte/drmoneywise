/* ════════════════════════════════════════════════════════════════════════
   SHARIAH-COMPLIANT INVESTING — rules, markets and funds
   ───────────────────────────────────────────────────────────────────────
   METHODS   The published screening rules of five widely used standards.
             Checked October 2026 against each provider's own document
             (links in `source`). S&P and Dow Jones changed theirs on
             21 September 2026 (debt limit 33% → 30%, new cash test).
   BUSINESS  Which lines of business each standard rules out, and how we
             spot them: the company's main SEC industry code (SIC), plus a
             short list of well-known companies whose main code doesn't
             show it (e.g. a drinks maker filed under "food").
   MARKETS   The markets on /shariah and which companies are in each.
   FUNDS     Shariah funds and ETFs, by market. US-registered funds also
             get their real holdings from SEC reports (Form N-PORT).
   Our lists are our own calculation using these published rules and the
   companies' SEC figures. They are not the providers' official index
   lists (those are licensed) and not a religious ruling (fatwa).
   ════════════════════════════════════════════════════════════════════════ */

export const METHODS = [
  {
    id: 'aaoifi', short: 'AAOIFI', name: 'AAOIFI Shari’ah Standard No. 21', colour: '#1baf7a',
    who: 'The Accounting and Auditing Organization for Islamic Financial Institutions (Bahrain). Many Shariah boards and halal screening apps follow it.',
    base: 'mcap',
    tests: [
      { key: 'debt', label: 'Interest-bearing debt', of: 'company value (market cap)', max: 30 },
      { key: 'cash', label: 'Cash and interest-bearing investments', of: 'company value (market cap)', max: 30 },
      { key: 'income', label: 'Income from interest and other non-permitted sources', of: 'total income', max: 5 },
    ],
    excludes: ['finance', 'alcohol', 'tobacco', 'pork', 'gambling', 'adult', 'cannabis'],
    note: 'AAOIFI’s standard is the most widely quoted “30/30/5” rule.',
    source: { label: 'AAOIFI Shari’ah Standards', url: 'https://aaoifi.com' },
  },
  {
    id: 'djim', short: 'Dow Jones Islamic', name: 'Dow Jones Islamic Market indices', colour: '#2a78d6',
    who: 'S&P Dow Jones Indices, with an independent Shariah board. Used by funds such as Wahed’s UMMA.',
    base: 'mcap', avg: '24-month average company value',
    tests: [
      { key: 'debt', label: 'Interest-bearing debt', of: 'company value (24-month average)', max: 30 },
      { key: 'cash', label: 'Cash and interest-bearing securities', of: 'company value (24-month average)', max: 30 },
      { key: 'income', label: 'Non-permitted income (including interest)', of: 'total income', max: 5 },
    ],
    excludes: ['finance', 'alcohol', 'tobacco', 'pork', 'gambling', 'adult', 'cannabis'],
    partly: { defence: 'Offensive weapons only' },
    note: 'Since 21 September 2026 the debt limit is 30% (was 33%) and there is a new cash test. Weapons made for purposes other than defence are also ruled out; our industry codes can’t separate those, so that part isn’t checked.',
    source: { label: 'S&P Dow Jones Indices: Dow Jones Islamic Market Indices methodology (Sept 2026)', url: 'https://spglobal.com/spdji/en/documents/methodologies/methodology-dj-islamic-market-indices.pdf' },
  },
  {
    id: 'sp', short: 'S&P Shariah', name: 'S&P Shariah indices', colour: '#eb6834',
    who: 'S&P Dow Jones Indices, screened by Ratings Intelligence Partners. Used by SP Funds’ SPUS.',
    base: 'mcap', avg: '36-month average company value',
    tests: [
      { key: 'debt', label: 'Debt', of: 'company value (36-month average)', max: 30 },
      { key: 'cash', label: 'Cash, deposits and interest-bearing securities', of: 'company value (36-month average)', max: 30 },
      { key: 'income', label: 'Non-permitted income (including all interest)', of: 'total income', max: 5 },
    ],
    excludes: ['finance', 'alcohol', 'tobacco', 'pork', 'gambling', 'adult', 'music', 'advertising', 'cannabis'],
    note: 'Since 21 September 2026 the debt limit is 30% (was 33%), there is a new cash test and the old receivables test has gone. Defence companies are allowed.',
    source: { label: 'S&P Shariah Indices methodology (Oct 2026)', url: 'https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-shariah-indices.pdf' },
  },
  {
    id: 'msci', short: 'MSCI Islamic', name: 'MSCI Islamic Index Series', colour: '#6250d6',
    who: 'MSCI, with a Shariah board. Used by the iShares and HSBC Islamic ETFs listed in London.',
    base: 'assets',
    tests: [
      { key: 'debt', label: 'Total debt', of: 'total assets', max: 33.33 },
      { key: 'cash', label: 'Cash and interest-bearing securities', of: 'total assets', max: 33.33 },
      { key: 'recv', label: 'Money owed by customers plus cash', of: 'total assets', max: 33.33 },
      { key: 'income', label: 'Income from ruled-out activities (including interest)', of: 'total income', max: 5 },
    ],
    excludes: ['finance', 'alcohol', 'tobacco', 'pork', 'gambling', 'adult', 'defence', 'music', 'hotels', 'cinema', 'cannabis'],
    note: 'The strictest list of businesses: it also rules out defence, music, hotels and cinema/TV. New companies must pass at 30% before they are added.',
    source: { label: 'MSCI Islamic Index Series methodology (Oct 2024)', url: 'https://www.msci.com/indexes/documents/methodology/2_MSCI_Islamic_Index_Series_Methodology_20241030.pdf' },
  },
  {
    id: 'ftse', short: 'FTSE Shariah', name: 'FTSE Yasaar Global Equity Shariah', colour: '#eda100',
    who: 'FTSE Russell, screened by Yasaar Limited, whose scholars issued a fatwa for the series. Used by Wahed’s HLAL.',
    base: 'assets',
    tests: [
      { key: 'debt', label: 'Debt', of: 'total assets', max: 33.333 },
      { key: 'cash', label: 'Cash and interest-bearing items', of: 'total assets', max: 33.333 },
      { key: 'recv', label: 'Money owed by customers plus cash', of: 'total assets', max: 50 },
      { key: 'income', label: 'Interest and non-compliant income', of: 'total revenue', max: 5 },
    ],
    excludes: ['finance', 'alcohol', 'tobacco', 'pork', 'gambling', 'adult', 'cannabis', 'defence', 'music', 'hotels', 'cinema'],
    partly: {},
    note: 'Businesses in the ruled-out areas are removed when those areas are more than 5% of revenue.',
    source: { label: 'FTSE Russell: FTSE Yasaar Global Equity Shariah Index Series', url: 'https://www.lseg.com/en/ftse-russell/indices/global-shariah' },
  },
];

export const BUSINESS_WORDS = {
  finance: 'Conventional banking, lending, insurance or investment firms',
  alcohol: 'Alcohol',
  tobacco: 'Tobacco',
  pork: 'Meat processing, likely to include pork',
  gambling: 'Gambling and casinos',
  adult: 'Adult entertainment',
  cannabis: 'Cannabis and other intoxicants',
  defence: 'Weapons and defence',
  music: 'Music',
  hotels: 'Hotels',
  cinema: 'Film, TV and cable',
  advertising: 'Advertising',
};

/** Main SEC industry codes (SIC) → ruled-out area. */
export function businessFromSic(sic) {
  const n = Number(sic) || 0;
  if (!n) return null;
  if ((n >= 6000 && n <= 6411) || (n >= 6700 && n <= 6799 && n !== 6798)) return 'finance'; // 6798 = property trusts (REITs)
  if ([2082, 2084, 2085, 5180, 5181, 5182].includes(n)) return 'alcohol';
  if ((n >= 2100 && n <= 2199) || n === 5194) return 'tobacco';
  if ([2011, 2013].includes(n)) return 'pork';
  if ((n >= 3480 && n <= 3489) || (n >= 3760 && n <= 3769) || n === 3795 || n === 3812) return 'defence';
  if (n === 7011) return 'hotels';
  if ((n >= 7812 && n <= 7833) || n === 4833 || n === 4841) return 'cinema';
  if (n === 3652 || n === 4832) return 'music';
  if (n >= 7310 && n <= 7319) return 'advertising';
  return null;
}

/** Well-known companies whose main industry code doesn't show the ruled-out business. */
export const BUSINESS_OVERRIDES = {
  STZ: 'alcohol', 'BF-B': 'alcohol', TAP: 'alcohol', SAM: 'alcohol', DEO: 'alcohol', BUD: 'alcohol', ABEV: 'alcohol',
  MO: 'tobacco', PM: 'tobacco', BTI: 'tobacco',
  LVS: 'gambling', WYNN: 'gambling', MGM: 'gambling', CZR: 'gambling', DKNG: 'gambling', FLUT: 'gambling',
  HRL: 'pork', TSN: 'pork',
  MAR: 'hotels', HLT: 'hotels', H: 'hotels', IHG: 'hotels',
  LMT: 'defence', NOC: 'defence', GD: 'defence', RTX: 'defence', LHX: 'defence', HII: 'defence',
  DIS: 'cinema', NFLX: 'cinema', WBD: 'cinema', CMCSA: 'cinema',
  SPOT: 'music', TME: 'music', LYV: 'music',
  // Not banks, but their main business is lending or investing for others
  NU: 'finance', XP: 'finance',
};

/* ── Markets ───────────────────────────────────────────────────────── */
// Company markets: every company we cover there is checked (SEC figures).
//   regions   = regions in worldStocks.js; countries = the country in the
//   company's SEC address (for Irish- and UK-based companies filing as US ones).
// Fund countries (fundsOnly): the local official Shariah list or index and
//   the Shariah funds there; most local companies don't report to the SEC.
// fundCountries = country codes in US Shariah funds' SEC holdings reports.
export const SHARIAH_MARKETS = [
  { id: 'us', name: 'United States', colour: '#2a78d6', fundCountries: ['US'],
    intro: 'Big US companies we cover, checked with their own yearly reports to the SEC.' },
  { id: 'uk', name: 'United Kingdom', colour: '#0e8a8a', regions: ['uk'], countries: ['United Kingdom'], fundCountries: ['GB'],
    intro: 'British companies that also report to the US SEC, so their figures are free and official, plus the Shariah funds you can buy in the UK.' },
  { id: 'ireland', name: 'Ireland', colour: '#1baf7a', countries: ['Ireland'], fundCountries: ['IE'],
    intro: 'Companies based in Ireland that report to the US SEC. Ireland is also where many of Europe’s ETFs are registered, including the main Islamic ETFs sold in London.' },
  { id: 'europe', name: 'Europe', colour: '#6250d6', regions: ['europe'], fundCountries: ['DE', 'FR', 'NL', 'CH', 'DK', 'SE', 'NO', 'IT', 'ES', 'BE', 'FI', 'LU'],
    intro: 'Big companies from mainland Europe that also report to the US SEC, so their figures are free and official.' },
  { id: 'hong-kong', name: 'Hong Kong & China', colour: '#e34948', regions: ['china'], fundCountries: ['HK', 'CN', 'KY'],
    intro: 'Chinese companies listed in New York, most of which also have shares in Hong Kong. Their figures come from their SEC reports.' },
  { id: 'india', name: 'India', colour: '#eda100', regions: ['india'], fundCountries: ['IN'],
    intro: 'Indian companies with US-listed shares. Most big Indian companies only list at home, so this list is short; see the Indian Shariah funds and indices below.' },
  { id: 'malaysia', name: 'Malaysia', colour: '#2a78d6', fundsOnly: true, fundCountries: ['MY'],
    intro: 'Malaysia has one of the world’s largest Islamic capital markets. Its regulator publishes the official list of Shariah-compliant shares on Bursa Malaysia.' },
  { id: 'saudi-arabia', name: 'Saudi Arabia', colour: '#0e8a57', fundsOnly: true, fundCountries: ['SA'],
    intro: 'The Saudi Exchange (Tadawul) is the Middle East’s biggest stock market, with Shariah ETFs for Saudi shares and government sukuk.' },
  { id: 'uae', name: 'United Arab Emirates', colour: '#c9a227', fundsOnly: true, fundCountries: ['AE'],
    intro: 'Abu Dhabi (ADX) and Dubai (DFM) list Shariah ETFs for UAE shares and for other markets such as India and China.' },
  { id: 'indonesia', name: 'Indonesia', colour: '#e87ba4', fundsOnly: true, fundCountries: ['ID'],
    intro: 'Indonesia, the country with the most Muslims, has an official list of sharia securities and sharia share indices on the Indonesia Stock Exchange.' },
  { id: 'pakistan', name: 'Pakistan', colour: '#008300', fundsOnly: true, fundCountries: ['PK'],
    intro: 'The Pakistan Stock Exchange runs Shariah indices, and Pakistan’s first Islamic ETF follows them.' },
  { id: 'canada', name: 'Canada', colour: '#eb6834', fundsOnly: true, fundCountries: ['CA'],
    intro: 'Canada has a Shariah ETF investing in companies around the developed world.' },
];

/** Official local Shariah lists and indices, for the fund countries (and India). */
export const MARKET_FACTS = {
  malaysia: [
    { big: '850', text: 'shares on Bursa Malaysia were Shariah-compliant in the May 2025 list, about 80% of everything listed.', url: 'https://www.thestar.com.my/business/business-news/2025/05/30/sc-41-securities-classified-as-shariah-compliant-nine-as-shariah-non-compliant' },
    { big: 'Yearly', text: 'review by the Shariah Advisory Council of the Securities Commission Malaysia, using each company’s latest audited accounts. The latest update took effect on 29 May 2026.', url: 'https://www.sc.com.my/development/icm/icm-publications/list-of-shariah-compliant-securities' },
  ],
  indonesia: [
    { big: '622', text: 'company shares on the official sharia securities list (Daftar Efek Syariah) from 1 June 2026, set by the financial regulator OJK.', url: 'https://ojk.go.id/id/berita-dan-kegiatan/pengumuman/Pages/Daftar-Efek-Syariah-KEP21D042026.aspx' },
    { big: '2 a year', text: 'The list is renewed at the end of May and November (in force from 1 June and 1 December). The stock exchange builds its sharia indices from it, such as ISSI (all sharia shares) and the Jakarta Islamic Index (JII, 30 large, often-traded ones).' },
  ],
  pakistan: [
    { big: 'KMI-30', text: 'The Pakistan Stock Exchange’s index of the 30 most-traded Shariah-compliant companies, with no company above 12%.', url: 'https://www.psx.com.pk/psx/resources-and-tools/shariah-compliant-investment' },
    { big: 'All Share', text: 'The PSX-KMI All Share Index covers every Shariah-compliant company on the exchange; PSX built it with Meezan Bank.' },
  ],
  india: [
    { big: 'Nifty 50 Shariah', text: 'NSE publishes Shariah versions of its Nifty 50 and Nifty 500 indices.' },
  ],
};

/* ── Funds and ETFs ────────────────────────────────────────────────── */
// sec: true → US-registered; holdings are read from its SEC reports (N-PORT).
// also: other market pages that list the same fund.
export const SHARIAH_FUNDS = [
  // United States
  { market: 'us', ticker: 'SPUS', name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF', type: 'ETF', invests: 'Large US companies', rule: 'sp', sec: true },
  { market: 'us', ticker: 'HLAL', name: 'Wahed FTSE USA Shariah ETF', type: 'ETF', invests: 'US companies', rule: 'ftse', sec: true },
  { market: 'us', ticker: 'MNZL', name: 'Manzil Russell Halal USA Broad Market ETF', type: 'ETF', invests: 'Large and mid-sized US companies (Nasdaq, since Nov 2025)', rule: null, sec: true },
  { market: 'us', ticker: 'AMGR', name: 'Amana Growth ETF', type: 'ETF', invests: 'Growing companies, chosen by a manager (Nasdaq, since June 2026)', rule: null, sec: true },
  { market: 'us', ticker: 'AMEI', name: 'Amana Equity Income ETF', type: 'ETF', invests: 'Dividend-paying companies, chosen by a manager (since June 2026)', rule: null, sec: true },
  { market: 'us', ticker: 'AMAGX', name: 'Amana Growth Fund', type: 'Mutual fund', invests: 'Growing companies (institutional class AMIGX)', rule: null, sec: true },
  { market: 'us', ticker: 'AMANX', name: 'Amana Income Fund', type: 'Mutual fund', invests: 'Dividend-paying companies (institutional class AMINX)', rule: null, sec: true },
  { market: 'us', ticker: 'ADJEX', name: 'Azzad Ethical Fund', type: 'Mutual fund', invests: 'Mid-sized US companies', rule: null, sec: true },
  { market: 'us', ticker: 'SPRE', name: 'SP Funds S&P Global REIT Sharia ETF', type: 'ETF', invests: 'Property companies (REITs) worldwide', rule: 'sp', sec: true },
  // Worldwide and outside the US (US-registered)
  { market: 'world', ticker: 'UMMA', name: 'Wahed Dow Jones Islamic World ETF', type: 'ETF', invests: 'Large companies outside the US', rule: 'djim', sec: true },
  { market: 'world', ticker: 'SPWO', name: 'SP Funds S&P World (ex-US) ETF', type: 'ETF', invests: 'Companies outside the US', rule: 'sp', sec: true },
  { market: 'world', ticker: 'SPTE', name: 'SP Funds S&P Global Technology ETF', type: 'ETF', invests: 'Technology companies worldwide', rule: 'sp', sec: true },
  { market: 'world', ticker: 'AMEM', name: 'Amana Developing World ETF', type: 'ETF', invests: 'Companies in developing countries (since June 2026)', rule: null, sec: true },
  { market: 'world', ticker: 'AMDWX', name: 'Amana Developing World Fund', type: 'Mutual fund', invests: 'Companies in developing countries (institutional class AMIDX)', rule: null, sec: true },
  // Sukuk (Islamic bonds)
  { market: 'sukuk', ticker: 'SPSK', name: 'SP Funds Dow Jones Global Sukuk ETF', type: 'ETF', invests: 'Sukuk (Islamic bonds) worldwide', rule: null, sec: true },
  { market: 'sukuk', ticker: 'AMAPX', name: 'Amana Participation Fund', type: 'Mutual fund', invests: 'Mostly short and medium-term sukuk (institutional class AMIPX)', rule: null, sec: true },
  { market: 'sukuk', ticker: 'WISEX', name: 'Azzad Wise Capital Fund', type: 'Mutual fund', invests: 'Sukuk and other Islamic income investments', rule: null, sec: true },
  // Ireland-registered, listed in London (and Xetra / Swiss exchange)
  { market: 'ireland', also: ['uk'], ticker: 'ISWD', name: 'iShares MSCI World Islamic UCITS ETF', type: 'ETF (London)', invests: 'Large companies in developed countries; also ISDW (US dollars), and IUSD on Xetra', rule: 'msci', url: 'https://www.ishares.com/uk/individual/en/products/251394/ishares-msci-world-islamic-ucits-etf' },
  { market: 'ireland', also: ['uk'], ticker: 'ISUS', name: 'iShares MSCI USA Islamic UCITS ETF', type: 'ETF (London)', invests: 'US companies; also ISDU (US dollars). Registered in Ireland (ISIN IE00B296QM64)', rule: 'msci', url: 'https://www.ishares.com/gls-download/literature/fact-sheet/isus-ishares-msci-usa-islamic-ucits-etf-fund-fact-sheet-en-gb.pdf' },
  { market: 'ireland', also: ['uk'], ticker: 'ISDE', name: 'iShares MSCI EM Islamic UCITS ETF', type: 'ETF (London)', invests: 'Companies in emerging markets', rule: 'msci' },
  { market: 'ireland', also: ['uk'], ticker: 'HIWS', name: 'HSBC MSCI World Islamic UCITS ETF', type: 'ETF (London)', invests: 'Large companies in developed countries, with extra ESG screens', rule: 'msci' },
  // United Kingdom
  { market: 'uk', ticker: null, name: 'HSBC Islamic Global Equity Index Fund', type: 'Index fund (Luxembourg-registered, sold in the UK)', invests: 'Shariah-screened companies worldwide; started March 2017', rule: null, url: 'https://www.ajbell.co.uk/market-research/sub/FUND:BDCVVD1/fund-info' },
// India
  { market: 'india', ticker: null, name: 'Tata Ethical Fund', type: 'Mutual fund (India)', invests: 'Indian companies that pass Shariah screens; compared with the Nifty 500 Shariah index', rule: null, url: 'https://www.valueresearchonline.com/stories/51912/what-are-shariah-compliant-mutual-funds/' },
  { market: 'india', ticker: null, name: 'Taurus Ethical Fund', type: 'Mutual fund (India)', invests: 'Indian companies with a Shariah-based ethical mandate', rule: null },
  { market: 'india', ticker: null, name: 'Nippon India ETF Nifty 50 Shariah BeES', type: 'ETF (NSE, India)', invests: 'Follows the Nifty 50 Shariah index (the Nifty 50 companies that pass Shariah screens)', rule: null },
  // Hong Kong & China
  { market: 'hong-kong', also: ['uae'], ticker: 'CHHK', name: 'Lunate (formerly Chimera) S&P China HK Shariah ETF', type: 'ETF (Abu Dhabi, ADX)', invests: 'Chinese and Hong Kong companies that pass S&P Shariah screens', rule: 'sp' },
  { market: 'hong-kong', also: ['saudi-arabia'], ticker: '3478', name: 'Premia BOCHK Saudi Arabia Government Sukuk ETF', type: 'ETF (Hong Kong)', invests: 'Saudi government sukuk; Asia’s first Saudi sukuk ETF (May 2025); also 9478 in US dollars', rule: null, url: 'https://www.arabnews.com/node/2602601/business-economy' },
  // Malaysia (Bursa Malaysia). Eq8 was called MyETF until May 2024.
  { market: 'malaysia', ticker: '0821EA', name: 'Eq8 Dow Jones Islamic Market Malaysia Titans 25 ETF', type: 'ETF (Bursa Malaysia)', invests: 'The 25 biggest Shariah-compliant Malaysian companies', rule: 'djim', url: 'https://www.wahed.com/mme/all-you-need-to-know-about-etfs-malaysias-guide-to-2026s-best-shariah-compliant-etfs' },
  { market: 'malaysia', ticker: '0824EA', name: 'Eq8 MSCI Malaysia Islamic Dividend ETF', type: 'ETF (Bursa Malaysia)', invests: 'Shariah-compliant Malaysian dividend payers', rule: 'msci' },
  { market: 'malaysia', ticker: '0825EA', name: 'Eq8 MSCI SEA Islamic Dividend ETF', type: 'ETF (Bursa Malaysia)', invests: 'Shariah-compliant dividend payers across South-East Asia', rule: 'msci' },
  { market: 'malaysia', ticker: '0827EA', name: 'Eq8 Dow Jones US Titans 50 ETF', type: 'ETF (Bursa Malaysia)', invests: 'The 50 biggest Shariah-compliant US companies', rule: 'djim' },
  { market: 'malaysia', ticker: '0839EA', name: 'Eq8 FTSE Malaysia Enhanced Dividend Waqf ETF', type: 'ETF (Bursa Malaysia)', invests: 'Shariah-compliant Malaysian dividend payers; half of its payouts go to Yayasan Waqaf Malaysia', rule: 'ftse' },
  { market: 'malaysia', ticker: '0838EA', name: 'VP-DJ Shariah China A-Shares 100 ETF', type: 'ETF (Bursa Malaysia)', invests: 'The 100 biggest Shariah-compliant mainland Chinese companies (Value Partners)', rule: 'djim' },
  { market: 'malaysia', ticker: '0828EA', name: 'TradePlus Shariah Gold Tracker ETF', type: 'ETF (Bursa Malaysia)', invests: 'Physical gold, priced off the LBMA gold price', rule: null },
  // Saudi Arabia (Tadawul)
  { market: 'saudi-arabia', ticker: null, name: 'Albilad MSCI Saudi Equity ETF', type: 'ETF (Saudi Exchange)', invests: 'Saudi shares in an MSCI index of Shariah-compliant companies; listed October 2025 with the Public Investment Fund as anchor investor', rule: 'msci', url: 'https://www.pif.gov.sa/en/news-and-insights/newswire/2025/pif-anchors-newly-listed-albilad-msci-saudi-equity-exchange-traded-fund/' },
  { market: 'saudi-arabia', ticker: '9403', name: 'Albilad Saudi Sovereign Sukuk ETF', type: 'ETF (Saudi Exchange)', invests: 'Sukuk issued by the Saudi government', rule: null },
  // United Arab Emirates (ADX / DFM)
  { market: 'uae', ticker: null, name: 'Chimera S&P UAE Shariah ETF', type: 'ETF (ADX and DFM)', invests: 'UAE companies in the S&P UAE Domestic Shariah index; the UAE’s first ETF tracking a Shariah index (August 2020)', rule: 'sp', url: 'https://thenationalnews.com/business/markets/uae-s-first-etf-tracking-sharia-compliant-index-lists-on-uae-markets-1.1064718' },
  { market: 'uae', also: ['india'], ticker: null, name: 'Chimera S&P India Shariah ETF', type: 'ETF (ADX)', invests: 'The 30 most-traded Shariah-compliant Indian companies; listed January 2024 by Lunate Capital', rule: 'sp', url: 'https://www.zawya.com/en/press-release/companies-news/lunate-capital-llc-launches-shariah-compliant-etf-tracking-indian-equities-ej9u92pj' },
  // Pakistan (PSX)
  { market: 'pakistan', ticker: 'MZNP-ETF', name: 'Meezan Pakistan ETF', type: 'ETF (Pakistan Stock Exchange)', invests: '12 big KMI-30 companies; Pakistan’s first Islamic ETF (October 2020)', rule: null, url: 'https://www.almeezangroup.com/news-announcement/al-meezan-launches-pakistans-first-islamic-etf-exchange-traded-fund/' },
  // Canada
  { market: 'canada', ticker: 'WSHR', name: 'Wealthsimple Shariah World Equity Index ETF', type: 'ETF (Cboe Canada, formerly NEO)', invests: 'Developed-market companies in a Dow Jones Islamic quality and low-volatility index; certified by Ratings Intelligence Partners (2021)', rule: 'djim', url: 'https://newsroom.wealthsimple.com/there-were-no-etfs-for-islamic-investors-in-canada-so-we-built-one' },
];

/** Notes for markets with few or no local Shariah funds. */
export const MARKET_NOTES = {
  'hong-kong': 'Hang Seng’s Islamic China Index Fund, once Hong Kong’s best-known Shariah fund, closed in October 2023.',
  ireland: 'Most European ETFs, including the iShares and HSBC Islamic ETFs, are registered in Ireland and traded in London and other European exchanges. UK investors usually buy them through a stocks and shares ISA or pension.',
  uk: 'The iShares and HSBC Islamic ETFs here are registered in Ireland but trade on the London Stock Exchange in pounds and dollars.',
  indonesia: 'Indonesian fund managers also offer sharia mutual funds (reksa dana syariah), and in 2026 the exchange launched its first sharia-compliant gold ETFs.',
  'saudi-arabia': 'For the Saudi and other Gulf companies themselves, see our Gulf page.',
  uae: 'For the UAE companies themselves, see our Gulf page.',
}

export const SHARIAH_SOURCES = [
  { label: 'S&P Dow Jones Indices: Shariah rule changes, 20 Aug 2026', url: 'https://www.spglobal.com/spdji/en/documents/indexnews/announcements/20260820-1484595/1484595_sp-shariah-indices-update-20260820.pdf' },
  { label: 'Hang Seng Islamic China Index Fund: final report (closed 30 Oct 2023)', url: 'https://cms.hangsenginvestment.com/cms/ivp/hsvm/document2/FS_H04482.pdf' },
];
