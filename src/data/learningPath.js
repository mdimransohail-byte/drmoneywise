/* ════════════════════════════════════════════════════════════════════════
   YOUR LEARNING PATH (free) — /learn/path
   Three levels, each a short list of steps. A member starts at the level
   that fits the investing experience they gave in their profile; anyone
   can switch level. Each step: a short plain-English lesson (written here,
   so the page is never empty), the matching explainer if we've published
   one (matched by its topic in src/data/explainerTopics.js), money words
   from the glossary, and something to try on the site.
   ════════════════════════════════════════════════════════════════════════ */

export const PATH_LEVELS = [
  {
    id: 'start', name: 'Getting started', colour: '#1baf7a',
    intro: 'The ideas everything else is built on: saving first, then how investing works and why time matters more than timing.',
    steps: [
      {
        id: 'emergency', title: 'Build a safety cushion first',
        plain: 'Before investing, keep some money you can reach quickly for surprises such as a car repair or a gap between jobs. Many people aim for three to six months of essential spending, kept in a savings account.',
        points: ['Investments can fall just when you need cash, so this money stays safe instead', 'Pay off expensive debts such as credit cards before investing', 'Then invest money you won’t need for at least five years'],
        topic: 'How big should an emergency fund be?', words: ['Emergency fund', 'Savings account', 'Debt'],
        tryIt: ['Work out your savings growth', '/tools/savings-growth'],
      },
      {
        id: 'compound', title: 'Let time do the heavy lifting',
        plain: 'Compound growth means your returns start earning returns of their own. The longer money is invested, the more of the final total comes from growth rather than from what you put in.',
        points: ['Starting early usually matters more than starting with a lot', 'Small regular amounts add up over decades', 'Taking money out early stops the snowball'],
        topic: 'How compound growth turns small savings into big sums', words: ['Compound interest', 'Return', 'Time horizon'],
        tryIt: ['See what monthly investing could grow to', '/tools/monthly-investing'],
      },
      {
        id: 'stock', title: 'What owning a share means',
        plain: 'A share is a small piece of a company. If the company grows its profits over time, its shares tend to become worth more, and it may pay you part of its profits as a dividend.',
        points: ['Share prices move every day with news and mood', 'Over many years, prices tend to follow profits', 'A company can also shrink or fail, so prices can fall a long way'],
        topic: 'What a stock actually is, and why prices move', words: ['Share', 'Stock', 'Dividend', 'Stock exchange'],
        tryIt: ['Read a company report card', '/stock/KO'],
      },
      {
        id: 'risk', title: 'Risk and reward go together',
        plain: 'Investments that can grow faster can also fall further. Shares have grown more than bonds or cash over long periods, but with bigger drops along the way.',
        points: ['Falls of 10% or more have happened in many years', 'Nobody can reliably say when falls will come', 'Only take as much risk as you could live with in a bad year'],
        topic: 'Risk and reward: why higher returns come with bigger drops', words: ['Risk', 'Volatility', 'Risk tolerance', 'Correction'],
        tryIt: ['See how today’s markets are moving', '/today'],
      },
      {
        id: 'spread', title: 'Don’t put all your eggs in one basket',
        plain: 'Spreading money across many companies, industries and countries means one bad result can’t sink your whole plan. An index fund or ETF does this for you in a single purchase.',
        points: ['One company can fall 50% in a day; a whole market rarely does', 'An index fund holds every company in an index', 'Lower fees leave more of the return for you'],
        topic: 'Diversification: why not to put all your eggs in one basket', words: ['Diversification', 'Index fund', 'ETF', 'Index'],
        tryIt: ['Look inside a popular ETF', '/etfs'],
      },
      {
        id: 'steady', title: 'Invest a little, regularly',
        plain: 'Putting the same amount in every month (dollar-cost averaging) means you buy more shares when prices are low and fewer when they are high, and it takes the stress out of picking a moment.',
        points: ['Trying to time the market usually means missing its best days', 'Automatic monthly investing builds a habit', 'Keep going through the falls; that’s when you buy cheaply'],
        topic: 'Dollar-cost averaging: investing the same amount every month', words: ['Dollar-cost averaging', 'Long-term investing', 'SIP'],
        tryIt: ['Try the monthly investing calculator', '/tools/monthly-investing'],
      },
    ],
  },
  {
    id: 'build', name: 'Building your knowledge', colour: '#2a78d6',
    intro: 'How to look at a company, a fund or the economy and understand what the numbers are telling you.',
    steps: [
      {
        id: 'reportcard', title: 'Read a company’s report card',
        plain: 'Five questions tell you a lot about a business: is it growing, does it make a profit, is its debt under control, does it make spare cash, and does it pay a dividend? Our report cards answer them from the company’s official yearly report.',
        points: ['Sales growth shows whether customers want more of what it sells', 'Profit margin shows how much of each $1 of sales it keeps', 'Spare cash (free cash flow) is what pays dividends and repays debt'],
        topic: 'How to read a company report card in five minutes', words: ['Revenue', 'Profit margin', 'Free cash flow', 'Annual report'],
        tryIt: ['Compare companies in the screener', '/screener'],
      },
      {
        id: 'valuation', title: 'Price versus value',
        plain: 'A great company can still be a poor investment if you pay too much. The price-to-earnings ratio compares the share price with the profit per share, so you can see how much investors are paying for each $1 of profit.',
        points: ['A high P/E often means investors expect fast growth', 'A low P/E can mean good value, or real problems', 'Compare a company with others in the same industry'],
        topic: 'Price-to-earnings ratio explained without jargon', words: ['P/E ratio', 'Earnings per share', 'Valuation', 'Market capitalisation'],
        tryIt: ['See the biggest companies in each sector', '/stocks'],
      },
      {
        id: 'dividends', title: 'Dividends and whether they last',
        plain: 'A dividend is cash a company pays its shareholders, usually from profits. Companies that raise their dividend year after year often have steady businesses, but a very high yield can be a warning that the price has fallen because the payout is at risk.',
        points: ['Payout ratio: the share of profit paid out; very high can be risky', 'Check the dividend is covered by spare cash', 'Raising it for 10+ years in a row is a sign of a steady business'],
        topic: 'Payout ratio: can a company afford its dividend?', words: ['Dividend yield', 'Payout ratio', 'Dividend growth', 'Dividend aristocrat'],
        tryIt: ['See this month’s top dividend stocks', '/top-10/dividend-stocks'],
      },
      {
        id: 'bonds', title: 'How bonds and interest rates work',
        plain: 'A bond is a loan to a government or company that pays you interest. When interest rates rise, older bonds paying less become worth less, so bond prices fall; when rates fall, bond prices rise.',
        points: ['Government bonds from stable countries are among the safest investments', 'Longer bonds move more when rates change', 'The 10-year government yield affects mortgage rates'],
        topic: 'What a bond is, and why bond prices fall when rates rise', words: ['Bond', 'Bond yield', 'Coupon', 'Maturity'],
        tryIt: ['See today’s government bond yields', '/bonds'],
      },
      {
        id: 'inflation', title: 'Inflation and your real return',
        plain: 'Inflation is how fast prices rise. If your savings earn 3% while prices rise 4%, you can buy less than before. Your real return is what you earn after inflation.',
        points: ['Cash loses buying power when inflation is above its interest rate', 'Central banks raise interest rates to slow inflation', 'Shares and property have tended to beat inflation over long periods'],
        topic: 'Real return: your return after inflation', words: ['Inflation', 'Real return', 'Interest rate', 'Central bank'],
        tryIt: ['See the latest inflation figure', '/today'],
      },
      {
        id: 'world', title: 'Investing beyond your home country',
        plain: 'Owning companies from several countries spreads your risk, because economies don’t all rise and fall together. It also adds currency risk: if the other country’s currency weakens against yours, your investment is worth less to you.',
        points: ['Emerging markets can grow faster but swing more', 'Global funds spread you across many countries at once', 'Many big companies already earn money worldwide'],
        topic: 'Investing outside your home country: currency risk explained', words: ['Emerging markets', 'Exchange rate', 'Currency'],
        tryIt: ['Explore stocks around the world', '/stocks/world'],
      },
    ],
  },
  {
    id: 'confident', name: 'Going deeper', colour: '#6250d6',
    intro: 'For confident investors: keeping a portfolio on track, reading what professionals do, and avoiding the mistakes that cost the most.',
    steps: [
      {
        id: 'allocation', title: 'Set your mix and rebalance',
        plain: 'Your asset allocation is how you split money between shares, bonds and cash. Over time the parts that grow fastest take up more of your portfolio; rebalancing means trimming them back to your plan, perhaps once a year.',
        points: ['Your mix matters more to your results than any single pick', 'Rebalancing makes you sell high and buy low, by rule', 'Many people hold more bonds as they near retirement'],
        topic: 'Rebalancing: keeping your mix of investments on plan', words: ['Asset allocation', 'Rebalancing', 'Portfolio'],
        tryIt: ['Check your portfolio’s health (Premium)', '/portfolio-health'],
      },
      {
        id: 'cashflow', title: 'Follow the cash, not just the profit',
        plain: 'Profit includes items that aren’t cash yet. Cash from operations, minus spending on equipment and buildings, gives free cash flow: the money a business truly has spare. A company whose profit rises while its cash falls deserves a closer look.',
        points: ['Free cash flow pays dividends, buybacks and debt', 'Compare debt with yearly cash from operations', 'Check several years, not just one'],
        topic: 'Free cash flow: the spare cash that pays dividends', words: ['Operating cash flow', 'Free cash flow', 'Debt-to-equity', 'Liquidity'],
        tryIt: ['Screen for low-debt companies', '/screener'],
      },
      {
        id: 'professionals', title: 'Learn from what professionals report',
        plain: 'Large US funds must report their holdings each quarter (Form 13F), and company bosses must report trades in their own shares within two business days (Form 4). These show what experienced investors did, though often weeks later and without their reasons.',
        points: ['Fund reports come up to 45 days after the quarter ends', 'Bosses buying with their own money is rarer than selling', 'Many sales are planned months ahead and say little'],
        topic: null, words: ['Fund manager', 'SEC', 'Buyback'],
        tryIt: ['See company bosses’ trades (Premium)', '/insiders'],
      },
      {
        id: 'behaviour', title: 'Your own behaviour is the biggest risk',
        plain: 'Selling in a panic after a fall, or piling into whatever has just soared, are two of the most costly habits. Writing down your plan and your reasons before you buy makes it easier to stick to them.',
        points: ['Falls feel worse than gains of the same size feel good', 'Hype and fear of missing out lead to buying high', 'Check your plan, not the price, when markets are noisy'],
        topic: 'Why we panic-sell at the bottom, and how to avoid it', words: ['Bear market', 'Long-term investing', 'Volatility'],
        tryIt: ['Read the latest explainers', '/learn'],
      },
      {
        id: 'leverage', title: 'Borrowing to invest multiplies losses too',
        plain: 'Leverage (investing with borrowed money, or margin) makes gains bigger, but losses bigger as well, and a broker can sell your investments if prices fall far enough. Promises of guaranteed high returns are a warning sign of a scam.',
        points: ['A 50% fall with 2× leverage wipes out your money', 'Interest on the loan has to be paid either way', 'If it sounds too good to be true, it usually is'],
        topic: 'Leverage and margin: how borrowing multiplies losses', words: ['Leverage', 'Margin', 'Risk'],
        tryIt: ['Spot investment scams', '/learn'],
      },
      {
        id: 'retire', title: 'Turning savings into an income',
        plain: 'In retirement, the question becomes how much you can take out each year without running out. A common starting point is the 4% rule: take about 4% in the first year, then raise it with inflation. It’s a rule of thumb, not a guarantee.',
        points: ['A higher share in shares can last longer but swings more', 'Dividends and bond interest can cover part of your spending', 'Plan for a long retirement; many people now live into their 90s'],
        topic: 'The 4% rule for retirement income, explained', words: ['Pension', 'Annuity', 'Retirement account'],
        tryIt: ['Try the retirement calculator', '/tools/retirement'],
      },
    ],
  },
];

/** The level that fits a member's profile (experience, then knowledge). */
export function levelForProfile(profile = {}) {
  const exp = profile.experience;
  const know = profile.knowledge;
  if (exp === '3-10' || exp === '10+' || know === 'confident' || know === 'expert') return 'confident';
  if (exp === '1-3' || know === 'some') return 'build';
  return 'start';
}

export const ALL_STEP_IDS = PATH_LEVELS.flatMap((l) => l.steps.map((s) => `${l.id}:${s.id}`));
