// Owner-editable business settings for Dr MoneyWise.
// Change this file when you want to update pricing, plan limits, or news priority.

export const BUSINESS_SETTINGS = {
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      shortName: 'Free',
      priceLabel: '$0',
      billingLabel: 'forever',
      tagline: 'For readers building a daily money habit',
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
        'Free daily market summaries',
        'Saved interests and region selection',
        'Simple watchlist',
        'Free learning points',
      ],
    },
    regular: {
      id: 'regular',
      name: 'Paid Regular',
      shortName: 'Regular',
      priceLabel: '$10',
      billingLabel: '/month or $99/year',
      tagline: 'For readers who want more depth and paid explainers',
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
        'Regular paid articles',
        'Portfolio and watchlist review',
        'More learning points',
        'Priority member feed',
      ],
    },
    premium: {
      id: 'premium',
      name: 'Paid Premium',
      shortName: 'Premium',
      priceLabel: '$25',
      billingLabel: '/month or $249/year',
      tagline: 'For readers who want every article and the fullest review tools',
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
        'Premium paid articles',
        'Unlimited learning library',
        'Full portfolio review',
        'Early access to scheduled releases',
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
    sourceWeights: {
      'Dr MoneyWise Desk': 60,
      Marketaux: 35,
      NewsAPI: 30,
      Finnhub: 25,
    },
    freshnessHalfLifeHours: 36,
  },
};
