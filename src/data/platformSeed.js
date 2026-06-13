import { DEFAULT_MEMBER_INTERESTS, SITE_DOMAIN, SUPPORT_EMAIL } from '../config.js';

export function createPlatformSeed() {
  const now = new Date();

  return {
    meta: {
      createdAt: now.toISOString(),
      nextWriterSlot: 0,
      nextArticleNumber: 1000,
    },
    users: [],
    sessions: [],
    articles: [
      createArticle({
        id: 'learn-diversification',
        slug: 'why-diversification-still-matters',
        headline: 'Why Diversification Still Matters',
        contentType: 'learning',
        accessTier: 'free',
        region: 'global',
        interest: 'retirement',
        status: 'published',
        publishOffsetDays: -10,
        source: 'Dr MoneyWise Learning Point',
        summary: 'Diversification means spreading your money so one bad surprise does not hit everything at once.',
        plainEnglish: 'Instead of putting all your money in one pocket, you use several pockets. If one pocket tears, you do not lose everything.',
        whyItMatters: 'It lowers the chance that one stock, one sector, or one market shock can badly hurt your overall plan.',
        everydayExample: 'It is like carrying water in a few smaller bottles instead of one giant bottle. If one slips, you still have the rest.',
        takeaways: [
          'Mixing assets helps smooth the ride.',
          'Diversification does not remove risk, but it can reduce single-name risk.',
          'It works best when the holdings are genuinely different from each other.',
        ],
        jargonBuster: [
          { term: 'Diversification', meaning: 'Spreading money across different investments.' },
          { term: 'Concentration risk', meaning: 'The danger of being too dependent on one investment.' },
        ],
        infographic: {
          title: 'A balanced starting mix',
          items: [
            { label: 'Core stocks', value: '50%', context: 'Growth engine' },
            { label: 'Income assets', value: '30%', context: 'Stability and income' },
            { label: 'Cash and hedges', value: '20%', context: 'Shock absorber' },
          ],
        },
        tags: ['beginner', 'portfolio basics', 'risk'],
      }),
      createArticle({
        id: 'learn-dividends',
        slug: 'what-dividend-investors-should-watch',
        headline: 'What Dividend Investors Should Watch',
        contentType: 'learning',
        accessTier: 'regular',
        region: 'global',
        interest: 'income',
        status: 'published',
        publishOffsetDays: -7,
        source: 'Dr MoneyWise Learning Point',
        summary: 'Good dividend investing is not just about chasing the biggest yield on the screen.',
        plainEnglish: 'A very high dividend can be a gift or a warning sign. You want income that looks strong enough to keep being paid.',
        whyItMatters: 'Investors often buy high yield names for safety, but unstable payouts can lead to capital losses and income disappointment.',
        everydayExample: 'A shop offering a huge discount every day may be generous, or it may be struggling and trying to survive.',
        takeaways: [
          'Look at payout strength, not just headline yield.',
          'Cashflow and balance sheet quality matter.',
          'Slow, dependable growers can beat flashy income traps.',
        ],
        jargonBuster: [
          { term: 'Dividend yield', meaning: 'How much cash a company pays yearly compared with its share price.' },
          { term: 'Payout ratio', meaning: 'How much of earnings is being used to pay dividends.' },
        ],
        infographic: {
          title: 'Healthy dividend checklist',
          items: [
            { label: 'Cash cover', value: 'Strong', context: 'Room to keep paying' },
            { label: 'Debt pressure', value: 'Low', context: 'Less strain on income' },
            { label: 'History', value: 'Stable', context: 'Fewer nasty surprises' },
          ],
        },
        tags: ['income', 'dividends', 'regular'],
      }),
      createArticle({
        id: 'learn-portfolio-review',
        slug: 'how-to-read-a-portfolio-review',
        headline: 'How To Read A Portfolio Review',
        contentType: 'learning',
        accessTier: 'premium',
        region: 'global',
        interest: 'retirement',
        status: 'published',
        publishOffsetDays: -4,
        source: 'Dr MoneyWise Learning Point',
        summary: 'A portfolio review should tell you what you own, where your biggest risks sit, and how well your holdings match your goals.',
        plainEnglish: 'You are checking whether your basket still matches the trip you are taking.',
        whyItMatters: 'Many investors track performance but miss hidden overexposure, poor balance, or strategy drift.',
        everydayExample: 'Packing five jackets for a beach trip is still packing, but it is the wrong packing.',
        takeaways: [
          'Look at concentration, not just return.',
          'Compare your holdings with your target mix.',
          'Review the role of each position before adding more.',
        ],
        jargonBuster: [
          { term: 'Asset allocation', meaning: 'How your money is split across major buckets like stocks, bonds, and cash.' },
          { term: 'Drift', meaning: 'When your portfolio slowly moves away from your intended plan.' },
        ],
        infographic: {
          title: 'Three review questions',
          items: [
            { label: 'Too much in one area?', value: 'Check', context: 'Avoid overexposure' },
            { label: 'Still fits your goal?', value: 'Check', context: 'Keep purpose clear' },
            { label: 'Need rebalancing?', value: 'Check', context: 'Bring the mix back in line' },
          ],
        },
        tags: ['premium', 'portfolio review', 'wealth planning'],
      }),
      createArticle({
        id: 'schedule-fed',
        slug: 'scheduled-how-rate-moves-touch-everyday-money',
        headline: 'How Rate Moves Touch Everyday Money',
        contentType: 'learning',
        accessTier: 'free',
        region: 'global',
        interest: 'fixed-income',
        status: 'scheduled',
        publishOffsetDays: 2,
        source: 'Dr MoneyWise Learning Point',
        summary: 'This scheduled lesson explains how central bank moves filter into mortgages, savings, markets, and spending.',
        plainEnglish: 'When rates move, borrowing and saving both feel the change.',
        whyItMatters: 'Rate headlines sound distant, but they affect household budgets and investment returns quickly.',
        everydayExample: 'It is like changing the slope of a road. The whole journey feels different after that.',
        takeaways: [
          'Rate cuts and hikes travel into many parts of daily money life.',
          'Borrowers and savers feel changes differently.',
          'Markets try to price changes before they happen.',
        ],
        jargonBuster: [
          { term: 'Policy rate', meaning: 'The interest rate used by the central bank to guide money costs.' },
        ],
        infographic: {
          title: 'Where rates show up',
          items: [
            { label: 'Loans', value: 'Faster', context: 'Borrowing cost changes' },
            { label: 'Savings', value: 'Moderate', context: 'Deposit returns may shift' },
            { label: 'Markets', value: 'Fastest', context: 'Prices react quickly' },
          ],
        },
        tags: ['scheduled', 'rates', 'explainer'],
      }),
      createArticle({
        id: 'schedule-oil',
        slug: 'scheduled-why-oil-news-moves-more-than-energy-stocks',
        headline: 'Why Oil News Moves More Than Energy Stocks',
        contentType: 'learning',
        accessTier: 'regular',
        region: 'mena',
        interest: 'commodities',
        status: 'scheduled',
        publishOffsetDays: 4,
        source: 'Dr MoneyWise Learning Point',
        summary: 'This scheduled piece explains why oil headlines often spill into currencies, inflation, transport, and confidence.',
        plainEnglish: 'Oil prices can change the mood of many markets, not just oil companies.',
        whyItMatters: 'Readers often underestimate how widely energy moves spread through the economy.',
        everydayExample: 'It is like fuel in a delivery van. If fuel changes sharply, many final prices move too.',
        takeaways: [
          'Energy prices can ripple through inflation expectations.',
          'Transport and input costs matter for many sectors.',
          'Oil moves often affect regional currencies and sentiment too.',
        ],
        jargonBuster: [
          { term: 'Second-order effect', meaning: 'A knock-on effect that appears after the first direct impact.' },
        ],
        infographic: {
          title: 'Oil ripple map',
          items: [
            { label: 'Energy shares', value: 'Direct', context: 'First impact' },
            { label: 'Inflation', value: 'Spillover', context: 'Broader pricing effect' },
            { label: 'Consumers', value: 'Visible', context: 'Fuel and transport costs' },
          ],
        },
        tags: ['scheduled', 'oil', 'regular'],
      }),
    ],
    coupons: [
      { id: 'coupon-20', code: 'WELCOME20', discountPercent: 20, active: true, planScope: 'all', createdAt: daysAgo(20) },
      { id: 'coupon-50', code: 'HALFOFF50', discountPercent: 50, active: true, planScope: 'regular', createdAt: daysAgo(12) },
      { id: 'coupon-100', code: 'PRESS100', discountPercent: 100, active: true, planScope: 'premium', createdAt: daysAgo(5) },
    ],
    events: createSeedEvents(now),
    settings: {
      siteName: 'Dr MoneyWise',
      siteDomain: SITE_DOMAIN,
      supportEmail: SUPPORT_EMAIL,
      newsletterLabel: 'Money notes made easy',
      writerA: {
        label: 'Writer 1',
        provider: 'openai',
        model: process.env.WRITER_A_MODEL || '',
      },
      writerB: {
        label: 'Writer 2',
        provider: 'claude',
        model: process.env.WRITER_B_MODEL || '',
      },
      publishingWindows: ['06:30', '11:30', '17:30'],
      defaultRegion: 'global',
      defaultInterests: DEFAULT_MEMBER_INTERESTS,
    },
  };

  function daysAgo(value) {
    return new Date(now.getTime() - value * 24 * 60 * 60 * 1000).toISOString();
  }
}

function createArticle({
  id,
  slug,
  headline,
  contentType,
  accessTier,
  region,
  interest,
  status,
  publishOffsetDays,
  source,
  summary,
  plainEnglish,
  whyItMatters,
  everydayExample,
  takeaways,
  jargonBuster,
  infographic,
  tags,
}) {
  const publishedAt = new Date(Date.now() + publishOffsetDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    id,
    slug,
    headline,
    contentType,
    accessTier,
    region,
    interest,
    status,
    publishAt: publishedAt,
    source,
    sourceUrl: '',
    summary,
    plainEnglish,
    whyItMatters,
    everydayExample,
    takeaways,
    jargonBuster,
    infographic,
    bodySections: [
      {
        heading: 'The simple version',
        body: plainEnglish,
      },
      {
        heading: 'Why this matters',
        body: whyItMatters,
      },
      {
        heading: 'One everyday example',
        body: everydayExample,
      },
    ],
    tags,
    readingTime: contentType === 'learning' ? '5 min read' : '4 min read',
    engineSlot: 'writer-1',
    heroMood: interest,
    createdAt: publishedAt,
    updatedAt: publishedAt,
  };
}

function createSeedEvents(now) {
  const events = [];

  for (let dayIndex = 13; dayIndex >= 0; dayIndex -= 1) {
    const baseDate = new Date(now.getTime() - dayIndex * 24 * 60 * 60 * 1000);
    const pageViews = 1200 + (13 - dayIndex) * 135;
    const signups = 15 + ((13 - dayIndex) % 5) * 3;
    const upgrades = 4 + ((13 - dayIndex) % 4);
    const revenue = 210 + (13 - dayIndex) * 48;

    events.push({
      id: `page-${dayIndex}`,
      type: 'page_view',
      path: '/',
      userId: null,
      value: pageViews,
      at: baseDate.toISOString(),
    });
    events.push({
      id: `signup-${dayIndex}`,
      type: 'signup',
      path: '/signup',
      userId: null,
      value: signups,
      at: baseDate.toISOString(),
    });
    events.push({
      id: `upgrade-${dayIndex}`,
      type: 'upgrade',
      path: '/pricing',
      userId: null,
      value: upgrades,
      at: baseDate.toISOString(),
    });
    events.push({
      id: `revenue-${dayIndex}`,
      type: 'revenue',
      path: '/pricing',
      userId: null,
      value: revenue,
      at: baseDate.toISOString(),
    });
  }

  return events;
}
