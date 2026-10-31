/* ════════════════════════════════════════════════════════════════════════
   THE LEARN COURSE — three levels, taught week by week, basics first
   ───────────────────────────────────────────────────────────────────────
     beginner      Young Guns   free     6 weeks
     intermediate  Knights      free     6 weeks
     technical     Chart Readers Regular and Premium (technical analysis) 4 weeks
     lords         Lords        Premium  17 weeks (weeks 9-17: the Lords Intensive)
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
    /* ── Weeks 9 to 17: the Lords Intensive ───────────────────────────
       Longer, worked lessons with a downloadable PDF workbook per lesson
       and per week (src/services/learnPdfService.js). "brief" tells the
       writer what the lesson must cover; "companies" (sector lessons) are
       given to the writer with their real reported figures from our
       company data, so the comparison uses genuine numbers. */
    { week: 9, title: 'The three statements, end to end', module: 'Reading the accounts', lessons: [
      { id: 'lo-9-1', headline: 'The profit and loss account, line by line', match: 'The income statement explained line by line: from sales to earnings per share', brief: 'Walk down a real-looking income statement: revenue, cost of sales, gross profit, operating costs, operating profit, interest, tax, net profit, earnings per share. Show gross, operating and net margin with the sums. Explain one-off items and diluted shares.' },
      { id: 'lo-9-2', headline: 'The balance sheet: what a company owns, owes and keeps', match: 'The balance sheet explained: assets, liabilities and shareholders’ equity', brief: 'Cover current and non-current assets, debt and other liabilities, equity, book value per share, net debt, current ratio and debt to equity, with one full worked example. Explain why the two sides always balance.' },
      { id: 'lo-9-3', headline: 'One sale, three statements: how the accounts connect', match: 'How the income statement, balance sheet and cash flow statement link together', brief: 'Follow a single credit sale and a single equipment purchase through all three statements, showing exactly which lines change and why profit and cash differ.' },
      { id: 'lo-9-4', headline: 'A full health check in ten ratios', match: 'Ten financial ratios for a complete company health check', brief: 'Group ten ratios into growth, profitability, cash, debt and valuation. Work every ratio through one example company with a summary table in the text, and give a sensible range for each with the caveat that ranges differ by industry.' },
    ] },
    { week: 10, title: 'Accounting red flags', module: 'Reading the accounts', lessons: [
      { id: 'lo-10-1', headline: 'When profit and cash part company', match: 'Forensic accounting: when reported profit and operating cash flow diverge', brief: 'Explain the cash conversion ratio (operating cash flow divided by net profit), accruals, and why a long gap is a warning. Worked example over three years.' },
      { id: 'lo-10-2', headline: 'Unpaid bills and unsold stock: receivables and inventory warnings', match: 'Receivables days and inventory days as early warning signs', brief: 'Show how to work out receivables days and inventory days, what rising numbers can mean (channel stuffing, slowing demand), and when a rise is innocent.' },
      { id: 'lo-10-3', headline: 'Adjusted profits, one-offs that keep coming and costs moved to the balance sheet', match: 'Accounting tricks: adjusted earnings, recurring one-offs and capitalised costs', brief: 'Cover non-standard ("adjusted") profit measures, restructuring charges every year, capitalising costs that should be expenses, and changes in depreciation lives. Show how each flatters profit with numbers.' },
      { id: 'lo-10-4', headline: 'The clues were in the accounts: lessons from famous collapses', match: 'Corporate collapses and the warning signs in their accounts: Enron, Wirecard, Carillion', brief: 'Use only well-documented public facts about Enron, Wirecard and Carillion. For each, the warning signs that were visible in published accounts, and a final checklist of red flags.' },
    ] },
    { week: 11, title: 'Valuing a business properly', module: 'Valuation', lessons: [
      { id: 'lo-11-1', headline: 'What is the price already expecting? Reverse discounted cash flow', match: 'Reverse DCF: working out the growth the share price already assumes', brief: 'Start from a share price and work backwards to the growth rate needed to justify it. Step-by-step worked example with a simple table of growth rates.' },
      { id: 'lo-11-2', headline: 'Margin of safety: a buffer for being wrong', match: 'Margin of safety in investing and how to set one', brief: 'Explain margin of safety, how to estimate a range of values (bear, base, bull), and how a buffer changes the buying price. Worked example.' },
      { id: 'lo-11-3', headline: 'One size does not fit all: valuing banks, property, fast growers and cyclicals', match: 'Choosing the right valuation method for banks, REITs, high-growth and cyclical companies', brief: 'Price to book and return on equity for banks; funds from operations for property trusts; price to sales and the rule of 40 for fast growers; normalised earnings across a cycle for cyclicals.' },
      { id: 'lo-11-4', headline: 'When the parts are worth more than the whole', match: 'Sum-of-the-parts valuation and asset-based valuation', brief: 'Sum-of-the-parts for a group with several businesses, the conglomerate discount, and net asset value. Worked example with three divisions.' },
    ] },
    { week: 12, title: 'Designing your portfolio', module: 'Building a portfolio', lessons: [
      { id: 'lo-12-1', headline: 'Spread wide or bet big? How many shares is enough', match: 'Diversification versus concentration: how many holdings a portfolio needs', brief: 'What research says about risk falling as holdings rise, the case for focus, the case for spreading, and how to choose a number that suits your knowledge and time.' },
      { id: 'lo-12-2', headline: 'Five jobs for your money: give every holding a role', match: 'A role-based portfolio framework: foundation, income, growth, opportunity and reserve', brief: 'Our own framework, called "Five jobs for your money": Foundation (broad funds and steady leaders), Income (dependable payers), Growth (companies reinvesting to grow), Opportunity (out-of-favour or cyclical companies bought below value), Reserve (cash and short bonds for dry powder). For each: purpose, typical share of the portfolio for a cautious, balanced and adventurous investor, what to check and when it no longer fits. Do not name any other company’s framework.' },
      { id: 'lo-12-3', headline: 'How much in each share? Sizing positions with rules', match: 'Position sizing rules for long-term investors', brief: 'Equal weight, conviction tiers, maximum position size, and sizing by how much you could lose. Worked example with a £50,000 portfolio.' },
      { id: 'lo-12-4', headline: 'A review calendar that keeps you honest', match: 'Portfolio reviews and rebalancing: how often and what to check', brief: 'Calendar versus threshold rebalancing, what to check every quarter and every year, tax and cost points, with a worked rebalancing example.' },
    ] },
    { week: 13, title: 'Buying and selling with discipline', module: 'Building a portfolio', lessons: [
      { id: 'lo-13-1', headline: 'Before you buy: an entry checklist', match: 'An entry checklist for buying a share: business, numbers, price and risk', brief: 'A written checklist covering the business, its numbers, the valuation, the risks and the role in the portfolio, plus writing down why you are buying (your thesis).' },
      { id: 'lo-13-2', headline: 'The four good reasons to sell', match: 'When to sell a share: broken thesis, better use of money, too large, or far above value', brief: 'Thesis broken, a clearly better use of the money, position grown too large, price far above any reasonable value. Contrast with bad reasons (fear, boredom, a falling price alone). Worked examples.' },
      { id: 'lo-13-3', headline: 'Know the business well enough to hold through a fall', match: 'Why understanding the business matters for holding through price falls', brief: 'How deep understanding of the business separates a temporary price fall from real damage, with questions to ask after a big drop and a worked example.' },
      { id: 'lo-13-4', headline: 'Your investment diary: learning from your own decisions', match: 'Keeping an investment journal to improve decisions', brief: 'What to record when buying, holding and selling, how to review it yearly, and the common behavioural mistakes a diary reveals.' },
    ] },
    { week: 14, title: 'Charts for long-term investors', module: 'Timing with charts', lessons: [
      { id: 'lo-14-1', headline: 'Hold, add or trim? The 200-day average for long-term owners', match: 'Using the 200-day moving average to decide whether to hold, add or trim', brief: 'How fundamental investors use the 200-day average as a check rather than a trigger, with rules for adding and trimming and how often they misfire.' },
      { id: 'lo-14-2', headline: 'Weekly charts: the long trend without the noise', match: 'Weekly charts and long-term trends for fundamental investors', brief: 'Why weekly charts suit long-term investors, the 40-week average, higher highs and lows on a weekly chart, and a worked example.' },
      { id: 'lo-14-3', headline: 'Buying good companies on weakness: support zones and volume', match: 'Using support zones and volume to add to quality companies on dips', brief: 'Combine a valuation range with support zones and volume to stage purchases in parts. Worked example of buying in three parts.' },
      { id: 'lo-14-4', headline: 'When the chart warns before the results do', match: 'Distribution, breakdowns and relative weakness as warnings for long-term holders', brief: 'Heavy selling on high volume, a break of a long-term support level and weakness against the market as early warnings, and how to respond with a review rather than panic.' },
    ] },
    { week: 15, title: 'Short-term trading, honestly', module: 'Trading', lessons: [
      { id: 'lo-15-1', headline: 'Swing trading in plain English: holding for days or weeks', match: 'Swing trading strategies explained: trend pullbacks, breakouts and ranges', brief: 'Three common swing set-ups (trend pullback, breakout, range), how each works and how each fails. Be balanced about the odds.' },
      { id: 'lo-15-2', headline: 'The main trading indicators side by side', match: 'Short-term trading indicators compared: ATR, stochastics, VWAP and volume', brief: 'Average true range, stochastics, the volume-weighted average price and volume: what each measures, typical settings, and when each misleads.' },
      { id: 'lo-15-3', headline: 'A trading plan: entry, stop, target and the 1% rule', match: 'Writing a trading plan with entry, stop-loss, target and risk per trade', brief: 'Risk per trade, reward to risk, position size from the stop distance, and expectancy, all with worked sums.' },
      { id: 'lo-15-4', headline: 'Why most short-term traders lose money', match: 'Why most retail traders lose: costs, leverage and behaviour', brief: 'Widely published evidence (for example regulators’ figures on CFD accounts losing money, with the year), costs, leverage and behaviour. Explain how to test an idea on paper first.' },
    ] },
    { week: 16, title: 'Becoming a sector specialist', module: 'Sector deep dives', lessons: [
      { id: 'lo-16-1', headline: 'How to study a sector: drivers, cycle and scorecard', match: 'How to analyse an industry sector: demand drivers, competition, cycle and key measures', brief: 'A repeatable method: what drives demand, how competitive it is (five forces in plain words), where it is in its cycle, the two or three measures that matter most in that sector, and a scorecard to compare companies.' },
      { id: 'lo-16-2', headline: 'Drinks and snacks up close: Coca-Cola and PepsiCo compared', match: 'Sector deep dive: consumer staples, Coca-Cola and PepsiCo compared', brief: 'Apply the sector method to consumer staples, then compare the two companies on growth, margins, cash and dividends using ONLY the figures supplied.', companies: ['KO', 'PEP'] },
      { id: 'lo-16-3', headline: 'Banks up close: JPMorgan Chase and Bank of America compared', match: 'Sector deep dive: banks, JPMorgan Chase and Bank of America compared', brief: 'Explain how banks make money (net interest income, fees), why loans and deposits matter, credit losses and capital. Then compare the two banks using ONLY the figures supplied.', companies: ['JPM', 'BAC'] },
      { id: 'lo-16-4', headline: 'Healthcare up close: Johnson & Johnson and AbbVie compared', match: 'Sector deep dive: pharmaceuticals, Johnson & Johnson and AbbVie compared', brief: 'Explain patents, drug pipelines, patent expiry and pricing pressure. Then compare the two companies using ONLY the figures supplied.', companies: ['JNJ', 'ABBV'] },
      { id: 'lo-16-5', headline: 'Chips up close: Nvidia and AMD compared', match: 'Sector deep dive: semiconductors, Nvidia and AMD compared', brief: 'Explain the chip cycle, data centres, research spending and customer concentration. Then compare the two companies using ONLY the figures supplied.', companies: ['NVDA', 'AMD'] },
    ] },
    { week: 17, title: 'Research faster with smart tools', module: 'Smart research', lessons: [
      { id: 'lo-17-1', headline: 'Chat assistants as research helpers: where they shine and where they slip', match: 'Using chat assistants and smart research software for investing research: strengths and limits', brief: 'Call them "chat assistants" or "smart research tools" throughout. What they do well (summarising long reports, explaining terms, listing questions to ask) and where they go wrong (made-up figures, out-of-date information, overconfidence).' },
      { id: 'lo-17-2', headline: 'Asking good questions: getting a clear summary of a results report', match: 'How to ask a chat assistant to summarise a company results report', brief: 'Call them "chat assistants" throughout. Show example questions (written in plain text, not as code) to summarise results, list risks, and compare with last year, and how to paste in the source text so answers rely on it.' },
      { id: 'lo-17-3', headline: 'Trust, but check: verifying figures against the source', match: 'Checking figures from research tools against company filings', brief: 'Call them "chat assistants" or "smart research tools" throughout. A step-by-step check of every figure against the annual report or regulatory filing, spotting mistakes, and keeping a record of sources.' },
      { id: 'lo-17-4', headline: 'A weekly research routine with smart tools', match: 'A weekly investing research routine using smart research tools', brief: 'Call them "smart research tools" throughout. A 60-minute weekly routine: news scan, results summaries, checking the figures, updating your diary and thesis, with the decisions always your own.' },
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
