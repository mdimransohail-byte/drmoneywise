/* ════════════════════════════════════════════════════════════════════════
   PROPERTY PAGES — the places readers can pick on /property.
   To add a place: copy a block, give it a new slug, and fill in the codes.
     called  how the name reads in a sentence ("the United Kingdom"), if different
     bis   BIS country code (house prices, all places with official data)
     oecd  OECD country code (rents, and prices compared with incomes/rents;
           only some countries have these — missing ones are left out)
     extras  extra official sources for this place:
           'bls-rent'  US rents (US Bureau of Labor Statistics)
           'ukhpi'     average UK and London prices in £ (HM Land Registry)
           'us-mortgage'  30-year mortgage rate (Freddie Mac, already used)
     manual  true = figures typed in by Admin → Property (Dubai: the Land
           Department's open data has no clear reuse licence, so we use
           the totals it announces publicly, with a link to each source)
   ════════════════════════════════════════════════════════════════════════ */

export const PROPERTY_PLACES = [
  {
    slug: 'united-states', name: 'United States', called: 'the United States', short: 'US', bis: 'US', oecd: 'USA', currency: 'USD',
    extras: ['bls-rent', 'us-mortgage'],
    intro: 'Home prices across the whole country, plus what renters pay and the cost of a 30-year mortgage.',
  },
  {
    slug: 'united-kingdom', name: 'United Kingdom', called: 'the United Kingdom', short: 'UK', bis: 'GB', oecd: 'GBR', currency: 'GBP',
    extras: ['ukhpi'],
    intro: 'Home prices across the UK, the average price in pounds, and London compared with the whole country.',
  },
  {
    slug: 'dubai', name: 'Dubai', short: 'Dubai', bis: null, oecd: null, currency: 'AED', manual: true,
    extras: [],
    intro: 'Sales across Dubai each quarter: how many homes changed hands and their total value, from the Dubai Land Department’s announcements.',
  },
  {
    slug: 'india', name: 'India', short: 'India', bis: 'IN', oecd: 'IND', currency: 'INR',
    extras: [],
    intro: 'Home prices across India’s main cities, from the Reserve Bank of India’s house price index.',
  },
  {
    slug: 'thailand', name: 'Thailand', short: 'Thailand', bis: 'TH', oecd: 'THA', currency: 'THB',
    extras: [],
    intro: 'Home prices in Thailand, from the Bank of Thailand’s housing price index.',
  },
  {
    slug: 'singapore', name: 'Singapore', short: 'Singapore', bis: 'SG', oecd: 'SGP', currency: 'SGD',
    extras: [],
    intro: 'Private home prices in Singapore, from the Urban Redevelopment Authority.',
  },
  {
    slug: 'australia', name: 'Australia', short: 'Australia', bis: 'AU', oecd: 'AUS', currency: 'AUD',
    extras: [],
    intro: 'Home prices across Australia, plus rents and how prices compare with incomes.',
  },
  {
    slug: 'canada', name: 'Canada', short: 'Canada', bis: 'CA', oecd: 'CAN', currency: 'CAD',
    extras: [],
    intro: 'Home prices across Canada, plus rents and how prices compare with incomes.',
  },
  {
    slug: 'spain', name: 'Spain', short: 'Spain', bis: 'ES', oecd: 'ESP', currency: 'EUR',
    extras: [],
    intro: 'Home prices across Spain, plus rents and how prices compare with incomes.',
  },
];

export const getPlace = (slug) => PROPERTY_PLACES.find((p) => p.slug === slug) || null;

/** Credit lines, as each source's terms ask. Shown on every property page. */
export const PROPERTY_CREDITS = {
  bis: 'House prices: BIS Residential Property Price database (Bank for International Settlements), compiled from national central banks and statistics offices. The BIS does not endorse this site.',
  oecd: 'Rents and price ratios: OECD (2026), Analytical house prices indicators, OECD Data Explorer.',
  'bls-rent': 'US rents: US Bureau of Labor Statistics, rent of primary residence. BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.',
  ukhpi: 'UK average prices: HM Land Registry UK House Price Index. Contains HM Land Registry data © Crown copyright and database right 2026. This data is licensed under the Open Government Licence v3.0.',
  'us-mortgage': 'Mortgage rate: Freddie Mac Primary Mortgage Market Survey®.',
  manual: 'Dubai figures: Dubai Land Department public announcements (source linked beside each figure).',
};
