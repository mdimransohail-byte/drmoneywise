/* ════════════════════════════════════════════════════════════════════════
   THE LEARN COURSE — three levels, taught week by week, basics first
   ───────────────────────────────────────────────────────────────────────
     beginner      Young Guns   free     6 weeks
     intermediate  Knights      free     6 weeks
     technical     Chart Readers Regular and Premium (technical analysis) 4 weeks
     lords         Lords        Premium  5 weeks
   Week 1 has 5 lessons, later weeks 4. Each lesson:
     id        stays the same forever (it is saved on the article)
     headline  the attention-grabbing title the article is published with
               (honest: it must be backed up in the article itself)
     match     the older topic name, so explainers written before the
               course existed slot into the right week automatically
   The writer works through lessons in order (Week 1 of every level, then
   Week 2...), see pickEvergreenTopic() in explainerTopics.js. Lords lessons
   are written by the "deeper" job. The newsletter features one week at a
   time (newsletterService draftFromSite).
   To add a week: add a block with the next week number. Keep ids unique.
   ════════════════════════════════════════════════════════════════════════ */

export const COURSE = {
  beginner: [
    { week: 1, title: 'Money basics', lessons: [
      { id: 'yg-1-1', headline: 'You’re losing money, even in the bank', match: 'How inflation quietly shrinks your savings' },
      { id: 'yg-1-2', headline: 'Saving or investing? Where each pound should go', match: 'Saving versus investing: which money goes where' },
      { id: 'yg-1-3', headline: 'The safety net that stops one bad month ruining your year', match: 'How big should an emergency fund be?' },
      { id: 'yg-1-4', headline: 'The 50/30/20 rule: a budget that takes ten minutes', match: 'Budgeting with the 50/30/20 rule' },
      { id: 'yg-1-5', headline: 'Why your pay rise vanishes, and how to keep it', match: 'Lifestyle creep: why spending rises with pay' },
    ] },
    { week: 2, title: 'Making money grow', lessons: [
      { id: 'yg-2-1', headline: 'How £100 a month could grow to £100,000', match: 'How compound growth turns small savings into big sums' },
      { id: 'yg-2-2', headline: 'Can you beat inflation? What your savings need to earn', match: 'Real return: your return after inflation' },
      { id: 'yg-2-3', headline: 'Starting at 25 or 35: the ten years that cost a fortune', match: 'Starting to invest in your 20s, 30s, 40s and 50s' },
      { id: 'yg-2-4', headline: 'Good debt, bad debt: which one is quietly costing you?', match: 'Good debt and bad debt: how to tell the difference' },
    ] },
    { week: 3, title: 'What you can invest in', lessons: [
      { id: 'yg-3-1', headline: 'What is a share? Owning a slice of a real business', match: 'What a stock actually is, and why prices move' },
      { id: 'yg-3-2', headline: 'Bonds: lending your money to governments and companies', match: 'What a bond is, and why bond prices fall when rates rise' },
      { id: 'yg-3-3', headline: 'Index funds: own 500 companies in one go', match: 'Index funds explained: owning the whole market cheaply' },
      { id: 'yg-3-4', headline: 'ETFs or funds: the difference that can save you thousands', match: 'ETFs versus mutual funds: what is the difference?' },
    ] },
    { week: 4, title: 'Risk without the fear', lessons: [
      { id: 'yg-4-1', headline: 'Why prices fall, and why it isn’t the end of the world', match: 'Risk and reward: why higher returns come with bigger drops' },
      { id: 'yg-4-2', headline: 'Don’t put all your eggs in one basket: diversification made simple', match: 'Diversification: why not to put all your eggs in one basket' },
      { id: 'yg-4-3', headline: 'Bull or bear? What market moods mean for you', match: 'Bull and bear markets: what the names mean for you' },
      { id: 'yg-4-4', headline: 'Why trying to time the market usually backfires', match: 'Why trying to time the market usually fails' },
    ] },
    { week: 5, title: 'Costs, tax and accounts', lessons: [
      { id: 'yg-5-1', headline: 'The 1% fee that can eat a quarter of your savings', match: 'Why fees matter: how a 1% fee eats into 30 years of savings' },
      { id: 'yg-5-2', headline: 'Tax-free accounts: ISA, Roth IRA and friends explained', match: 'Tax-free accounts around the world: ISA, Roth IRA, PPF and more' },
      { id: 'yg-5-3', headline: 'Free money from your employer: workplace pensions', match: 'Workplace pensions and employer matching: free money explained' },
      { id: 'yg-5-4', headline: 'A little every month: the stress-free way to invest', match: 'Dollar-cost averaging: investing the same amount every month' },
    ] },
    { week: 6, title: 'Protect yourself', lessons: [
      { id: 'yg-6-1', headline: 'Too good to be true: how to spot an investment scam', match: 'Spotting investment scams: the warning signs' },
      { id: 'yg-6-2', headline: '“Guaranteed returns”: two words that should worry you', match: 'Promises of guaranteed returns: why they are a red flag' },
      { id: 'yg-6-3', headline: 'Fear of missing out: how hype empties wallets', match: 'Fear of missing out: how hype leads to bad buys' },
      { id: 'yg-6-4', headline: 'How to read money news without panicking', match: 'How to read financial news without panicking' },
    ] },
  ],
  intermediate: [
    { week: 1, title: 'Reading a company', lessons: [
      { id: 'kn-1-1', headline: 'Is this company healthy? The five-minute check', match: 'How to read a company report card in five minutes' },
      { id: 'kn-1-2', headline: 'Market cap: what a company is really “worth”', match: 'What market value (market cap) tells you about a company' },
      { id: 'kn-1-3', headline: 'The P/E ratio: is this share cheap, or just unloved?', match: 'Price-to-earnings ratio explained without jargon' },
      { id: 'kn-1-4', headline: 'Free cash flow: the number that’s hard to dress up', match: 'Free cash flow: the spare cash that pays dividends' },
      { id: 'kn-1-5', headline: 'Results day: why shares jump or slump in minutes', match: 'Earnings season explained: why share prices jump on results day' },
    ] },
    { week: 2, title: 'Dividends that last', lessons: [
      { id: 'kn-2-1', headline: 'Getting paid to own a share: how dividends are decided', match: 'What a dividend is and how companies decide to pay one' },
      { id: 'kn-2-2', headline: 'A 10% dividend yield sounds great. Here’s why it’s often a warning', match: 'Dividend yield: why a very high yield can be a warning sign' },
      { id: 'kn-2-3', headline: 'The payout ratio: can a company afford its dividend?', match: 'Payout ratio: can a company afford its dividend?' },
      { id: 'kn-2-4', headline: 'Dividend growers: why a rising payout can beat a high one', match: 'Dividend growth stocks: why raising the payout every year matters' },
    ] },
    { week: 3, title: 'How the economy moves your money', lessons: [
      { id: 'kn-3-1', headline: 'Interest rates: the lever that moves everything', match: 'Why central banks raise and cut interest rates' },
      { id: 'kn-3-2', headline: 'What the 10-year bond yield is telling you', match: 'What the 10-year government bond yield tells us' },
      { id: 'kn-3-3', headline: 'Recession: what it is, and what usually happens to shares', match: 'Recessions explained: what they are and how long they last' },
      { id: 'kn-3-4', headline: 'A strong dollar: who wins and who loses', match: 'Why a strong dollar matters to investors around the world' },
    ] },
    { week: 4, title: 'Building a portfolio', lessons: [
      { id: 'kn-4-1', headline: 'How much in shares at your age? A simple starting point', match: 'Asset allocation by age: a simple way to think about it' },
      { id: 'kn-4-2', headline: 'How big a fall could you really live with?', match: 'Your risk tolerance: how much of a fall could you live with?' },
      { id: 'kn-4-3', headline: 'Rebalancing: the once-a-year habit that keeps you on track', match: 'Rebalancing: keeping your mix of investments on plan' },
      { id: 'kn-4-4', headline: 'Growth or value: two ways to pick shares', match: 'Growth stocks versus value stocks in plain English' },
    ] },
    { week: 5, title: 'Beyond shares', lessons: [
      { id: 'kn-5-1', headline: 'Gold: why people run to it in a crisis', match: 'Why gold is seen as a safe haven' },
      { id: 'kn-5-2', headline: 'REITs: owning property without buying a house', match: 'Real estate investment trusts (REITs) explained' },
      { id: 'kn-5-3', headline: 'Emerging markets: faster growth, bumpier ride', match: 'Emerging markets: higher growth, higher risk' },
      { id: 'kn-5-4', headline: 'Your foreign shares fell, but the company didn’t: currency risk', match: 'Investing outside your home country: currency risk explained' },
    ] },
    { week: 6, title: 'Avoiding costly mistakes', lessons: [
      { id: 'kn-6-1', headline: 'Why we sell at the bottom, and how to stop yourself', match: 'Why we panic-sell at the bottom, and how to avoid it' },
      { id: 'kn-6-2', headline: 'Borrowing to invest: how leverage multiplies losses', match: 'Leverage and margin: how borrowing multiplies losses' },
      { id: 'kn-6-3', headline: 'Day trading or long-term investing: what the evidence says', match: 'Day trading versus long-term investing: what the evidence says' },
      { id: 'kn-6-4', headline: 'Last year’s winner, next year’s loser? Past performance explained', match: 'Why past performance does not guarantee future returns' },
    ] },
  ],
  technical: [
    { week: 1, title: 'Reading a price chart', lessons: [
      { id: 'ta-1-1', headline: 'What a price chart is really telling you', match: 'How to read a share price chart: price, time and volume' },
      { id: 'ta-1-2', headline: 'Candlesticks: four prices in one little bar', match: 'Candlestick charts explained: open, high, low and close' },
      { id: 'ta-1-3', headline: 'Is it going up? Spotting a trend, and when it breaks', match: 'Trends and trendlines: higher highs, higher lows' },
      { id: 'ta-1-4', headline: 'Support and resistance: the floors and ceilings on a chart', match: 'Support and resistance levels explained' },
      { id: 'ta-1-5', headline: 'Volume: why the crowd behind a move matters', match: 'Trading volume and what it tells you about a price move' },
    ] },
    { week: 2, title: 'The four most-used indicators', lessons: [
      { id: 'ta-2-1', headline: 'Moving averages: smoothing out the noise', match: 'Simple and exponential moving averages: 20, 50 and 200 days' },
      { id: 'ta-2-2', headline: 'Golden cross, death cross: what they mean and how often they fail', match: 'The golden cross and death cross explained' },
      { id: 'ta-2-3', headline: 'RSI: is a share overbought or oversold?', match: 'The relative strength index (RSI) explained' },
      { id: 'ta-2-4', headline: 'MACD: catching momentum as it turns', match: 'MACD: the moving average convergence divergence indicator' },
    ] },
    { week: 3, title: 'Patterns and breakouts', lessons: [
      { id: 'ta-3-1', headline: 'Bollinger bands: when a quiet share is about to move', match: 'Bollinger bands and volatility squeezes' },
      { id: 'ta-3-2', headline: 'Head and shoulders, double tops: the famous chart patterns', match: 'Classic chart patterns: head and shoulders, double tops and bottoms' },
      { id: 'ta-3-3', headline: 'Breakouts and fakeouts: telling them apart', match: 'Breakouts and false breakouts' },
      { id: 'ta-3-4', headline: 'Daily, weekly, monthly: why the timeframe changes the story', match: 'Chart timeframes: daily, weekly and monthly charts' },
    ] },
    { week: 4, title: 'Using charts sensibly', lessons: [
      { id: 'ta-4-1', headline: 'Stop-losses and position size: limiting the damage', match: 'Risk management for traders: stop-loss orders and position sizing' },
      { id: 'ta-4-2', headline: 'Charts plus company health: getting the best of both', match: 'Combining technical analysis with company fundamentals' },
      { id: 'ta-4-3', headline: 'Does technical analysis work? What the evidence says', match: 'The evidence on technical analysis: what works and what does not' },
      { id: 'ta-4-4', headline: 'Your five-minute chart checklist', match: 'A simple checklist for reading any share price chart' },
    ] },
  ],
  lords: [
    { week: 1, title: 'Reading the accounts like a professional', lessons: [
      { id: 'lo-1-1', headline: 'Follow the cash: reading a cash flow statement', match: 'Reading a cash flow statement: where a company’s money really goes' },
      { id: 'lo-1-2', headline: 'Return on invested capital: great business or just a busy one?', match: 'Return on invested capital: how to tell a great business from a busy one' },
      { id: 'lo-1-3', headline: 'Profits that won’t last: spotting low-quality earnings', match: 'Earnings quality: spotting profits that may not last' },
      { id: 'lo-1-4', headline: 'Growing fast and running out of cash: working capital', match: 'Working capital: why fast-growing companies can run short of cash' },
      { id: 'lo-1-5', headline: 'The bill that arrives years later: goodwill and write-downs', match: 'Goodwill and write-downs: what an acquisition costs years later' },
    ] },
    { week: 2, title: 'What is a share really worth?', lessons: [
      { id: 'lo-2-1', headline: 'What is a share worth today? Discounted cash flow, simply', match: 'Discounted cash flow in plain English: what a share is worth today' },
      { id: 'lo-2-2', headline: 'Beyond P/E: EV/EBITDA, cash flow yield and when to use each', match: 'Valuation beyond P/E: EV/EBITDA, free cash flow yield and when to use each' },
      { id: 'lo-2-3', headline: 'Why rising rates knock share prices: the discount-rate effect', match: 'Why interest rates move share valuations: the discount-rate effect' },
      { id: 'lo-2-4', headline: 'Small sales change, big profit swing: operating leverage', match: 'Operating leverage: why small sales changes can swing profits' },
    ] },
    { week: 3, title: 'The economy’s warning lights', lessons: [
      { id: 'lo-3-1', headline: 'The inverted yield curve: the signal before past recessions', match: 'The yield curve: what an inverted curve has signalled before recessions' },
      { id: 'lo-3-2', headline: 'Credit spreads: the bond market’s fear gauge', match: 'Credit spreads: what the extra yield on company bonds tells you about risk' },
      { id: 'lo-3-3', headline: 'When central banks shrink: quantitative tightening explained', match: 'Quantitative tightening: what happens when central banks shrink their balance sheets' },
      { id: 'lo-3-4', headline: 'The dollar cycle: how a strong dollar squeezes the world', match: 'The dollar cycle: how a strong dollar squeezes emerging markets' },
    ] },
    { week: 4, title: 'Advanced portfolio craft', lessons: [
      { id: 'lo-4-1', headline: 'The retirement risk nobody warns you about: bad early years', match: 'Sequence-of-returns risk: why the first years of retirement matter most' },
      { id: 'lo-4-2', headline: 'Value, momentum, quality, size: factor investing explained', match: 'Factor investing: value, momentum, quality and size explained' },
      { id: 'lo-4-3', headline: 'When a few giants are the market: index concentration', match: 'Index concentration: what it means when a few giants dominate the market' },
      { id: 'lo-4-4', headline: 'Currency hedging: when it protects you and when it costs you', match: 'Currency hedging: when it helps an overseas investment and when it costs you' },
    ] },
    { week: 5, title: 'Following the smart money', lessons: [
      { id: 'lo-5-1', headline: 'What the big funds own: reading a 13F report', match: 'Reading a 13F: what big-fund reports show and what they hide' },
      { id: 'lo-5-2', headline: 'When bosses buy their own shares: what the research says', match: 'Insider buying and selling: what the research says about following bosses' },
      { id: 'lo-5-3', headline: 'Before the dividend cut: warning signs in the figures', match: 'Dividend cuts: the warning signs in a company’s figures' },
      { id: 'lo-5-4', headline: 'Buybacks or dividends: which returns more to you?', match: 'Share buybacks versus dividends: which returns more to shareholders, and when' },
    ] },
    { week: 6, title: 'Advanced chart reading', lessons: [
      { id: 'lo-6-1', headline: 'When price and momentum disagree: divergences', match: 'RSI and MACD divergences: when momentum disagrees with the price' },
      { id: 'lo-6-2', headline: 'Beating the market? Relative strength explained', match: 'Relative strength: comparing a share with its market and sector' },
      { id: 'lo-6-3', headline: 'Fibonacci levels: why traders watch 38% and 62%', match: 'Fibonacci retracements and why traders watch them' },
      { id: 'lo-6-4', headline: 'Reading three timeframes at once', match: 'Multi-timeframe analysis: weekly trend, daily entry' },
    ] },
    { week: 7, title: 'Reading company events like a professional', lessons: [
      { id: 'lo-7-1', headline: 'Beyond the headline: reading a results announcement', match: 'How to read a quarterly results announcement and the outlook' },
      { id: 'lo-7-2', headline: 'What bosses say on results calls, and what they avoid', match: 'Earnings calls: guidance, tone and the questions analysts ask' },
      { id: 'lo-7-3', headline: 'Profit warnings: the early clues', match: 'Profit warnings and guidance cuts: the early signs' },
      { id: 'lo-7-4', headline: 'Mergers and takeovers: who usually wins', match: 'Mergers and acquisitions: what happens to the buyer’s and the target’s shares' },
    ] },
    { week: 8, title: 'Building a lasting income', lessons: [
      { id: 'lo-8-1', headline: 'The dividend safety score: five checks before you trust a payout', match: 'Dividend safety: payout, cash cover, debt, history and industry' },
      { id: 'lo-8-2', headline: 'Yield traps: when a high payout is a warning', match: 'Yield traps: high dividends that are about to be cut' },
      { id: 'lo-8-3', headline: 'Bonds, REITs and dividend shares: mixing income sources', match: 'Building an income portfolio from bonds, REITs and dividend shares' },
      { id: 'lo-8-4', headline: 'Drawing an income without running out', match: 'Withdrawal strategies in retirement: fixed, flexible and bucket approaches' },
    ] },
  ],
};

export const COURSE_LEVELS = ['beginner', 'intermediate', 'technical', 'lords'];

/** Every lesson, with its level and week, in teaching order (Week 1 of each level, then Week 2…). */
export function lessonsInOrder() {
  const out = [];
  const maxWeeks = Math.max(...COURSE_LEVELS.map((l) => COURSE[l].length));
  for (let w = 1; w <= maxWeeks; w += 1) {
    for (const level of COURSE_LEVELS) {
      const week = COURSE[level].find((x) => x.week === w);
      if (week) week.lessons.forEach((lesson, i) => out.push({ ...lesson, level, week: w, weekTitle: week.title, n: i + 1 }));
    }
  }
  return out;
}

export function lessonById(id) {
  return lessonsInOrder().find((l) => l.id === id) || null;
}

/** Finds the course lesson an article belongs to (by course id, old topic name or headline). */
export function lessonForArticle(a) {
  const all = lessonsInOrder();
  if (a.courseId) return all.find((l) => l.id === a.courseId) || null;
  const t = String(a.trendingTopic || '').toLowerCase();
  const h = String(a.headline || '').toLowerCase();
  return all.find((l) => (t && (l.match.toLowerCase() === t || l.headline.toLowerCase() === t)) || l.headline.toLowerCase() === h) || null;
}

/** Map lessonId → published article (the newest one if there are two). */
export function courseArticleMap(articles) {
  const map = new Map();
  for (const a of articles) {
    const l = lessonForArticle(a);
    if (l && !map.has(l.id)) map.set(l.id, a);
  }
  return map;
}
