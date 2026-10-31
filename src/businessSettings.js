// Owner-editable business settings for Dr MoneyWise.
// Change this file when you want to update pricing, plan limits, or news priority.

export const BUSINESS_SETTINGS = {
  // Raise this number when you change any plan's features or tagline below,
  // so the live site picks up the new wording.
  featuresVersion: 9,
  // Raise this number when you change a price below, so the live site
  // shows the new price even if prices were saved earlier in Admin.
  // (Stripe charges whatever its payment links say: make new links too.)
  priceVersion: 2,
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      shortName: 'Free',
      priceLabel: '$0',
      billingLabel: 'forever',
      tagline: 'Everything you need to start understanding money',
      articleLimit: 9,
      learningLimit: 3,
      smartReview: false,
      cta: 'Create Free Account',
      highlight: false,
      billingOptions: [
        {
          id: 'free',
          label: 'Start Free',
          priceText: '$0',
          checkoutEnv: 'CHECKOUT_FREE_URL',
        },
      ],
      features: [
        'Plain-English explainers, new ones every two days',
        'Company results explained in simple words, the day they come out',
        'A report card for any US-listed company and big companies around the world, plus ETFs, bonds, commodities and property',
        'The latest news on every page',
        'Top 10 lists, money calculators and glossary',
        'A simple watchlist',
        'Your own learning path: short steps, with your progress saved',
      ],
    },
    regular: {
      id: 'regular',
      name: 'Paid Regular',
      shortName: 'Regular',
      priceLabel: '$10',
      billingLabel: '/month or $99/year',
      tagline: 'The deeper look, plus alerts and tools',
      articleLimit: 24,
      learningLimit: 12,
      smartReview: true,
      cta: 'Upgrade to Regular',
      highlight: true,
      billingOptions: [
        {
          id: 'regular-monthly',
          label: 'Monthly',
          priceText: '$10',
          checkoutEnv: 'STRIPE_REGULAR_MONTHLY_URL',
        },
        {
          id: 'regular-annual',
          label: 'Yearly',
          priceText: '$99',
          checkoutEnv: 'STRIPE_REGULAR_ANNUAL_URL',
        },
      ],
      features: [
        'Everything in Free',
        'The Deeper look on every company, ETF, bond and commodity: what the big funds own, "what if" scenarios and 10 years of results',
        'Portfolio and watchlist review',
        'Dividend alerts for your watchlist',
        'A weekly email: your watchlist, the week’s results and the economy',
        'Stock screener: filter companies in the US and around the world by growth, profit, debt and dividends',
        'Ask Dr MoneyWise: send us up to 3 money questions a month',
        'Price alerts (coming soon)',
        'Reply in the members’ forum (when it opens)',
      ],
    },
    premium: {
      id: 'premium',
      name: 'Paid Premium',
      shortName: 'Premium',
      priceLabel: '$19.99',
      billingLabel: '/month or $179/year (save 25%)',
      tagline: 'The full toolkit: Lords lessons, health scores, portfolio check, research and no adverts',
      articleLimit: 60,
      learningLimit: 60,
      smartReview: true,
      cta: 'Upgrade to Premium',
      highlight: false,
      billingOptions: [
        {
          id: 'premium-monthly',
          label: 'Monthly',
          priceText: '$19.99',
          checkoutEnv: 'STRIPE_PREMIUM_MONTHLY_URL',
        },
        {
          id: 'premium-annual',
          label: 'Yearly',
          priceText: '$179',
          checkoutEnv: 'STRIPE_PREMIUM_ANNUAL_URL',
        },
      ],
      features: [
        'Everything in Regular',
        'Lords: the deeper lessons for confident investors, a new one every few days',
        'Financial Health Check in full: how each company compares with others in its industry',
        'Portfolio health check: a score and heat map for every holding and your whole portfolio',
        'The Premium weekly newsletter: your portfolio’s week, results and dividends coming up',
        'What each company’s results mean: what changed, what it expects next and what to watch',
        'No adverts anywhere on the site',
        'Big-fund alerts: when famous investors buy or sell your companies',
        'Big-fund data in the screener, plus the Fund explorer: what about 20 famous investors own, and in what proportions',
        'Company bosses buying or selling their own shares, from their official reports',
        'A monthly research report: the month in figures, with charts',
        'Ideas that match the rules you choose, with new matches in your Saturday email',
        'Shariah screening ratios for every company, under all five standards',
        'Ask Dr MoneyWise: up to 10 questions a month',
      ],
    },
  },

  coupons: {
    // Existing and new coupons are managed in /admin.html.
    // This limit protects you from accidental discounts like 500% off.
    maxDiscountPercent: 100,
    defaultPlanScope: 'all',
  },

  newsPriority: {
    // Higher numbers appear first when stories are otherwise close in time.
    urgencyWeights: {
      high: 90,
      medium: 45,
      low: 10,
    },
    assetWeights: {
      equities: 35,
      etfs: 25,
      'fixed-income': 45,
      commodities: 40,
      fx: 30,
      crypto: 20,
      retirement: 15,
      income: 15,
    },
    regionWeights: {
      global: 30,
      'north-america': 25,
      europe: 20,
      mena: 30,
      apac: 20,
      india: 25,
    },
    accessTierWeights: {
      free: 15,
      regular: 25,
      premium: 35,
    },
    // ── NEWS SOURCES — TESTING CONFIGURATION ────────────────────────────
    // Marketaux: free tier, safe for production use, keep long-term.
    // Tiingo: free tier, but its free-tier license is for INDIVIDUAL USE
    //   ONLY. It is fine to use here during development/testing, but it
    //   MUST be removed (or upgraded to a commercial Tiingo plan) before
    //   the site goes live to real members. See PRE-LAUNCH CHECKLIST below.
    // NewsAPI.org: removed — its free Developer plan forbids production
    //   use entirely, even internally.
    // Finnhub: kept — used for live stock price data, its free tier is
    //   fine for production, and it also supplies some company news.
    sourceWeights: {
      'Dr MoneyWise Desk': 60,
      Marketaux: 35,
      Tiingo: 30, // TESTING ONLY — remove this line before launch (see note above)
      Finnhub: 25,
    },
    freshnessHalfLifeHours: 36,
  },
};
