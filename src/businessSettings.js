// Owner-editable business settings for Dr MoneyWise.
// Change this file when you want to update pricing, plan limits, or news priority.

export const BUSINESS_SETTINGS = {
  // Raise this number when you change any plan's features or tagline below,
  // so the live site picks up the new wording.
  featuresVersion: 2,
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
        'A report card for any US-listed company',
        'Top 10 dividend stocks, ETFs and crypto',
        'Markets today, money calculators and glossary',
        'A simple watchlist',
      ],
    },
    regular: {
      id: 'regular',
      name: 'Paid Regular',
      shortName: 'Regular',
      priceLabel: '$10',
      billingLabel: '/month or $99/year',
      tagline: 'The deeper look behind every company',
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
        'What the big funds are doing: which of about 20 famous investors own each company, and whether they bought or sold',
        '"What if" growth scenarios for sales, profit and dividends',
        '10 years of full financial results and the latest quarters',
        'Portfolio and watchlist review',
        'More member articles',
      ],
    },
    premium: {
      id: 'premium',
      name: 'Paid Premium',
      shortName: 'Premium',
      priceLabel: '$25',
      billingLabel: '/month or $249/year',
      tagline: 'Every article and the fullest review tools',
      articleLimit: 60,
      learningLimit: 60,
      smartReview: true,
      cta: 'Upgrade to Premium',
      highlight: false,
      billingOptions: [
        {
          id: 'premium-monthly',
          label: 'Monthly',
          priceText: '$25',
          checkoutEnv: 'STRIPE_PREMIUM_MONTHLY_URL',
        },
        {
          id: 'premium-annual',
          label: 'Yearly',
          priceText: '$249',
          checkoutEnv: 'STRIPE_PREMIUM_ANNUAL_URL',
        },
      ],
      features: [
        'Everything in Regular',
        'Every member article, including in-depth premium pieces',
        'The full explainer library',
        'Full portfolio review',
        'Early access to new articles',
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
