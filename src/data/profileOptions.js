/* ════════════════════════════════════════════════════════════════════════
   READER PROFILE — the questions on Membership → "Your profile".
   All optional. Used (in totals only) to pitch the site's vocabulary and
   depth, shown in Admin → Analytics → "Your readers".
   Each list: [id, label]. Add or rename options here and upload.
   ════════════════════════════════════════════════════════════════════════ */

export const PROFILE_OPTIONS = {
  country: [
    ['ae', 'United Arab Emirates'], ['sa', 'Saudi Arabia'], ['qa', 'Qatar'], ['kw', 'Kuwait'], ['om', 'Oman'], ['bh', 'Bahrain'],
    ['in', 'India'], ['pk', 'Pakistan'], ['bd', 'Bangladesh'], ['lk', 'Sri Lanka'], ['np', 'Nepal'],
    ['us', 'United States'], ['ca', 'Canada'], ['gb', 'United Kingdom'], ['ie', 'Ireland'], ['de', 'Germany'], ['fr', 'France'],
    ['nl', 'Netherlands'], ['es', 'Spain'], ['it', 'Italy'], ['ch', 'Switzerland'],
    ['sg', 'Singapore'], ['my', 'Malaysia'], ['ph', 'Philippines'], ['id', 'Indonesia'], ['hk', 'Hong Kong'], ['jp', 'Japan'], ['au', 'Australia'], ['nz', 'New Zealand'],
    ['eg', 'Egypt'], ['ng', 'Nigeria'], ['ke', 'Kenya'], ['za', 'South Africa'],
    ['other', 'Another country'],
  ],
  ageRange: [['18-24', '18–24'], ['25-34', '25–34'], ['35-44', '35–44'], ['45-54', '45–54'], ['55-64', '55–64'], ['65+', '65 or over'], ['na', 'Prefer not to say']],
  profession: [
    ['student', 'Student'], ['employed', 'Employed (salaried)'], ['business', 'Business owner / self-employed'],
    ['professional', 'Professional (e.g. doctor, engineer, lawyer)'], ['finance', 'Work in finance or accounting'],
    ['homemaker', 'Homemaker'], ['retired', 'Retired'], ['other', 'Other'],
  ],
  knowledge: [
    ['beginner', 'Beginner — I’m just starting to learn'],
    ['some', 'Some knowledge — I know the basics'],
    ['confident', 'Confident — I understand most investing terms'],
    ['expert', 'Expert — I work with markets or follow them closely'],
  ],
  experience: [['none', 'I haven’t invested yet'], ['lt1', 'Less than 1 year'], ['1-3', '1–3 years'], ['3-10', '3–10 years'], ['10+', 'More than 10 years']],
  investAmount: [
    ['lt1k', 'Under $1,000'], ['1k-10k', '$1,000 – $10,000'], ['10k-50k', '$10,000 – $50,000'],
    ['50k-250k', '$50,000 – $250,000'], ['250k+', 'Over $250,000'], ['na', 'Prefer not to say'],
  ],
  goals: [
    ['learn', 'Learn how markets work'], ['savings', 'Build my savings'], ['wealth', 'Grow my wealth over time'], ['income', 'Earn a regular income'],
    ['retirement', 'Plan for retirement'], ['home', 'Buy a home'], ['education', 'Pay for children’s education'],
  ],
  depth: [
    ['simple', 'Keep it simple — short and jargon-free'],
    ['balanced', 'Some detail — explain the key numbers'],
    ['detailed', 'Full detail — I like the deeper analysis'],
  ],
};

// interests and markets reuse the site's existing lists (config.js)
export const PROFILE_FIELDS = ['country', 'ageRange', 'profession', 'knowledge', 'experience', 'investAmount', 'goals', 'depth', 'interests', 'regions'];
export const MULTI_FIELDS = ['goals', 'interests', 'regions'];
