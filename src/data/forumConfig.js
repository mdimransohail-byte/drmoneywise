/* ════════════════════════════════════════════════════════════════════════
   FORUM SETTINGS — sections (each with its own colour), regions, limits.
   Edit names, descriptions or colours here and upload this one file.
   `color` is the section's strong colour (white text sits on it), `tint`
   its pale background.
   ════════════════════════════════════════════════════════════════════════ */

export const FORUM_SECTIONS = [
  { id: 'stocks', name: 'Stocks', plain: 'Questions about shares and companies, in general or one company at a time.', color: '#1d4ed8', tint: '#eaf0fd', icon: '▲' },
  { id: 'etfs', name: 'ETFs & funds', plain: 'Index funds, ETFs, fees and building a simple portfolio.', color: '#0f766e', tint: '#e6f4f2', icon: '◆' },
  { id: 'dividends', name: 'Dividends & income', plain: 'Earning a regular income from shares, funds and savings.', color: '#a15c07', tint: '#fbf1e1', icon: '●' },
  { id: 'bonds', name: 'Bonds & interest rates', plain: 'Government and company bonds, savings rates and what rate changes mean.', color: '#6d28d9', tint: '#f1ebfc', icon: '≈' },
  { id: 'crypto', name: 'Crypto', plain: 'Bitcoin and other coins: how they work and the risks.', color: '#c2410c', tint: '#fcece4', icon: '₿' },
  { id: 'retirement', name: 'Retirement & planning', plain: 'Pensions, saving goals, tax-free accounts and planning ahead.', color: '#15803d', tint: '#e8f5ec', icon: '◷' },
  { id: 'markets', name: 'Markets & economy', plain: 'What is moving markets: inflation, jobs, central banks and the news.', color: '#be123c', tint: '#fbe9ee', icon: '≡' },
  { id: 'beginners', name: 'Beginner questions', plain: 'No question is too simple. Start here if you are new to investing.', color: '#0a1128', tint: '#ece9e1', icon: '?' },
];

export const FORUM_REGIONS = [
  { id: 'global', name: 'Global' },
  { id: 'us', name: 'United States' },
  { id: 'uk-europe', name: 'UK & Europe' },
  { id: 'india', name: 'India' },
  { id: 'middle-east', name: 'Middle East' },
  { id: 'asia-pacific', name: 'Asia-Pacific' },
];

export const FORUM_LIMITS = {
  titleMin: 10,
  titleMax: 140,
  bodyMin: 20,
  bodyMax: 5000,
  secondsBetweenPosts: 30,
  postsPerDay: 20,
  reportsToHide: 2, // this many reports from different readers hides a post until reviewed
};

export const sectionById = (id) => FORUM_SECTIONS.find((s) => s.id === id) || null;
export const regionById = (id) => FORUM_REGIONS.find((r) => r.id === id) || null;
