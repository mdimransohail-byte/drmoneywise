/* ════════════════════════════════════════════════════════════════════════
   EXPLAINER TOPICS — what the homepage explainers are written about when
   no paid news feed is switched on (see newsService newsFeedMode()).
   ───────────────────────────────────────────────────────────────────────
   1. First choice: a fresh official economy figure (inflation, interest
      rate, bond yield, mortgage rate, jobs) from data/market/economy.json,
      if it was published in the last 10 days and hasn't been covered.
   2. Otherwise: the next unused evergreen topic below.
   Add a topic by adding a line; each is used once, then again only after
   every other topic has had a turn.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

export const EVERGREEN_TOPICS = [
  // Getting started
  'How compound growth turns small savings into big sums',
  'Saving versus investing: which money goes where',
  'How big should an emergency fund be?',
  'What a stock actually is, and why prices move',
  'What a bond is, and why bond prices fall when rates rise',
  'Index funds explained: owning the whole market cheaply',
  'ETFs versus mutual funds: what is the difference?',
  'Why fees matter: how a 1% fee eats into 30 years of savings',
  'Risk and reward: why higher returns come with bigger drops',
  'Diversification: why not to put all your eggs in one basket',
  'Dollar-cost averaging: investing the same amount every month',
  'How to read a company report card in five minutes',
  'What market value (market cap) tells you about a company',
  'Price-to-earnings ratio explained without jargon',
  'What a dividend is and how companies decide to pay one',
  'Dividend yield: why a very high yield can be a warning sign',
  'Dividend growth stocks: why raising the payout every year matters',
  'Payout ratio: can a company afford its dividend?',
  'Free cash flow: the spare cash that pays dividends',
  'Why companies buy back their own shares',
  'Stock splits: why a cheaper share price changes nothing',
  'Growth stocks versus value stocks in plain English',
  'Large companies versus small companies: risk and reward',
  'What a stock market index like the S&P 500 measures',
  'Bull and bear markets: what the names mean for you',
  'Market corrections: why 10% falls happen most years',
  'Why trying to time the market usually fails',
  'Rebalancing: keeping your mix of investments on plan',
  'Asset allocation by age: a simple way to think about it',
  'Your risk tolerance: how much of a fall could you live with?',
  // Economy
  'How inflation quietly shrinks your savings',
  'Real return: your return after inflation',
  'Why central banks raise and cut interest rates',
  'What the Federal Reserve does, in plain English',
  'How interest rate changes affect your mortgage and savings',
  'What the 10-year government bond yield tells us',
  'Recessions explained: what they are and how long they last',
  'What GDP measures, and why it matters to you',
  'Unemployment rate: what the jobs figure says about the economy',
  'Why a strong dollar matters to investors around the world',
  'Exchange rates: why your holiday money changes in value',
  'Oil prices and your wallet: the chain from barrel to pump',
  'Why gold is seen as a safe haven',
  'Tariffs explained: who really pays them',
  'Government debt: why it matters and why it may not',
  // Retirement & planning
  'How much do you need to retire? A simple rule of thumb',
  'The 4% rule for retirement income, explained',
  'Workplace pensions and employer matching: free money explained',
  'Tax-free accounts around the world: ISA, Roth IRA, PPF and more',
  'Starting to invest in your 20s, 30s, 40s and 50s',
  'Paying off debt versus investing: which comes first?',
  'Good debt and bad debt: how to tell the difference',
  'How credit scores work and how to improve yours',
  'Fixed or variable mortgage: the trade-offs',
  'Renting versus buying a home: the money side',
  'Annuities explained: swapping a lump sum for an income',
  'Saving for a child’s education: the main options',
  'How to set money goals you will actually keep',
  'Budgeting with the 50/30/20 rule',
  'Lifestyle creep: why spending rises with pay',
  // Other investments
  'Real estate investment trusts (REITs) explained',
  'Bond funds versus individual bonds',
  'Government bonds versus company bonds: safety and yield',
  'What a bond rating like AAA means',
  'Commodities explained: oil, gold, wheat and copper',
  'Bitcoin explained without the hype',
  'Stablecoins: digital dollars and their risks',
  'Why crypto prices swing so much',
  'Emerging markets: higher growth, higher risk',
  'Investing outside your home country: currency risk explained',
  // Behaviour & safety
  'Why we panic-sell at the bottom, and how to avoid it',
  'Fear of missing out: how hype leads to bad buys',
  'Spotting investment scams: the warning signs',
  'Promises of guaranteed returns: why they are a red flag',
  'Leverage and margin: how borrowing multiplies losses',
  'Day trading versus long-term investing: what the evidence says',
  'Why past performance does not guarantee future returns',
  'How to read financial news without panicking',
  'Earnings season explained: why share prices jump on results day',
  'IPOs explained: buying a company on its first day',
];

const ECONOMY_FILE = path.join(process.cwd(), 'data', 'market', 'economy.json');

const ECONOMY_TOPIC = {
  inflation: (f) => [`What US inflation of ${f.value.toFixed(1)}% means for your money`, `The latest US inflation figure is ${f.value.toFixed(1)}% a year${f.previous != null ? `, compared with ${f.previous.toFixed(1)}% the month before` : ''} (as of ${f.asOf}).`],
  interestRate: (f) => [`US interest rates at ${f.value.toFixed(2)}%: what it means for savers and borrowers`, `The US central bank's main interest rate is ${f.value.toFixed(2)}%${f.previous != null ? `, compared with ${f.previous.toFixed(2)}% a month earlier` : ''} (as of ${f.asOf}).`],
  tenYearYield: (f) => [`The 10-year US bond yield at ${f.value.toFixed(2)}%: why it matters`, `The 10-year US government bond yield is ${f.value.toFixed(2)}%${f.previous != null ? `, compared with ${f.previous.toFixed(2)}% a month earlier` : ''} (as of ${f.asOf}).`],
  mortgageRate: (f) => [`Mortgage rates at ${f.value.toFixed(2)}%: what it means for home buyers`, `The average US 30-year mortgage rate is ${f.value.toFixed(2)}%${f.previous != null ? `, compared with ${f.previous.toFixed(2)}% a month earlier` : ''} (as of ${f.asOf}).`],
  unemployment: (f) => [`US unemployment at ${f.value.toFixed(1)}%: what the jobs figure tells us`, `The US unemployment rate is ${f.value.toFixed(1)}%${f.previous != null ? `, compared with ${f.previous.toFixed(1)}% the month before` : ''} (as of ${f.asOf}).`],
};

/** Returns { label, sampleHeadline } or null. `excludeTopics` = labels already written. */
export async function pickEvergreenTopic({ excludeTopics = [] } = {}) {
  const used = new Set(excludeTopics.map((t) => String(t).toLowerCase()));

  // 1. A fresh economy figure that changed
  try {
    const { figures = {} } = JSON.parse(await fs.readFile(ECONOMY_FILE, 'utf8'));
    for (const [key, fig] of Object.entries(figures)) {
      if (!ECONOMY_TOPIC[key] || !fig?.asOf) continue;
      const ageDays = (Date.now() - new Date(fig.asOf).getTime()) / 86400000;
      const changed = fig.previous == null || Math.abs(fig.value - fig.previous) >= 0.05;
      if (ageDays > 10 || !changed) continue;
      const [label, fact] = ECONOMY_TOPIC[key](fig);
      // The same figure (say inflation) at most once in the last 8 explainers,
      // so the list doesn't fill up with near-identical pieces.
      const stem = label.split(/\d/u)[0].trim().toLowerCase();
      if (excludeTopics.slice(-8).some((t) => String(t).toLowerCase().startsWith(stem))) continue;
      if (!used.has(label.toLowerCase())) return { label, sampleHeadline: fact, score: 1 };
    }
  } catch { /* no economy file yet */ }

  // 2. Next unused evergreen topic (cycle again once all are used)
  const fresh = EVERGREEN_TOPICS.find((t) => !used.has(t.toLowerCase()));
  const label = fresh || EVERGREEN_TOPICS[Math.floor(Math.random() * EVERGREEN_TOPICS.length)];
  return { label, sampleHeadline: label, score: 1 };
}

/* ── Deeper explainers (Premium) ──────────────────────────────────────
   For confident readers: written in the paid-tier style (second-order
   effects, what professionals watch). One is written every 3 days by the
   data engine ("deeper" job), each topic once before any repeats. */
export const DEEPER_TOPICS = [
  'Reading a cash flow statement: where a company’s money really goes',
  'Return on invested capital: how to tell a great business from a busy one',
  'Share buybacks versus dividends: which returns more to shareholders, and when',
  'Share-based pay: the hidden cost that profit figures leave out',
  'Operating leverage: why small sales changes can swing profits',
  'Working capital: why fast-growing companies can run short of cash',
  'Goodwill and write-downs: what an acquisition costs years later',
  'Valuation beyond P/E: EV/EBITDA, free cash flow yield and when to use each',
  'Discounted cash flow in plain English: what a share is worth today',
  'Why interest rates move share valuations: the discount-rate effect',
  'The yield curve: what an inverted curve has signalled before recessions',
  'Credit spreads: what the extra yield on company bonds tells you about risk',
  'Duration and convexity: how much a bond fund can fall when rates rise',
  'Real yields and inflation-linked bonds: what TIPS and linkers protect against',
  'Quantitative tightening: what happens when central banks shrink their balance sheets',
  'The dollar cycle: how a strong dollar squeezes emerging markets',
  'Sequence-of-returns risk: why the first years of retirement matter most',
  'Factor investing: value, momentum, quality and size explained',
  'Index concentration: what it means when a few giants dominate the market',
  'Currency hedging: when it helps an overseas investment and when it costs you',
  'ADRs explained: owning foreign companies through US-listed shares',
  'Reading a 13F: what big-fund reports show and what they hide',
  'Insider buying and selling: what the research says about following bosses',
  'Dividend cuts: the warning signs in a company’s figures',
  'Leverage inside ETFs: why daily-reset funds lose value over time',
  'Commodity futures and roll yield: why commodity ETFs can lag the price',
  'Tax-loss harvesting: using losses to lower your tax bill (and the rules)',
  'Bond ladders versus bond funds for a steady income',
  'How index rebalancing days move share prices',
  'Earnings quality: spotting profits that may not last',
];
