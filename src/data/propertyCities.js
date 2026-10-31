/* ════════════════════════════════════════════════════════════════════════
   CITIES on the property pages: rents, prices, rental yield and five years
   of history. Checked weekly by the data engine (the sources publish
   monthly). All sources are official and free to reuse commercially:
     UK rents   ONS Price Index of Private Rents (average monthly rent in £
                by local authority), Open Government Licence v3.0
     UK prices  HM Land Registry UK House Price Index (average price in £),
                Open Government Licence v3.0
     US rents   US Bureau of Labor Statistics consumer price index, rent of
                primary residence by metro area (public domain). An index,
                not dollars, so US cities show rent growth but no yield.
   ukhpi: Land Registry region names to try, in order.
   ons:   area names as written in the ONS rents file, in order.
   ════════════════════════════════════════════════════════════════════════ */

export const CITY_LIST = [
  { slug: 'london', name: 'London', country: 'uk', ukhpi: ['london'], ons: ['London'] },
  { slug: 'manchester', name: 'Manchester', country: 'uk', ukhpi: ['manchester', 'city-of-manchester'], ons: ['Manchester'] },
  { slug: 'birmingham', name: 'Birmingham', country: 'uk', ukhpi: ['birmingham', 'city-of-birmingham'], ons: ['Birmingham'] },
  { slug: 'leeds', name: 'Leeds', country: 'uk', ukhpi: ['leeds', 'city-of-leeds'], ons: ['Leeds'] },
  { slug: 'liverpool', name: 'Liverpool', country: 'uk', ukhpi: ['liverpool', 'city-of-liverpool'], ons: ['Liverpool'] },
  { slug: 'bristol', name: 'Bristol', country: 'uk', ukhpi: ['city-of-bristol', 'bristol'], ons: ['Bristol, City of', 'City of Bristol', 'Bristol'] },
  { slug: 'edinburgh', name: 'Edinburgh', country: 'uk', ukhpi: ['city-of-edinburgh', 'edinburgh'], ons: ['City of Edinburgh', 'Edinburgh, City of', 'Edinburgh'] },
  { slug: 'glasgow', name: 'Glasgow', country: 'uk', ukhpi: ['glasgow-city', 'city-of-glasgow', 'glasgow'], ons: ['Glasgow City', 'Glasgow'] },
  { slug: 'new-york', name: 'New York', country: 'us', bls: 'CUURA101SEHA', area: 'New York-Newark-Jersey City' },
  { slug: 'los-angeles', name: 'Los Angeles', country: 'us', bls: 'CUURA421SEHA', area: 'Los Angeles-Long Beach-Anaheim' },
  { slug: 'chicago', name: 'Chicago', country: 'us', bls: 'CUURA207SEHA', area: 'Chicago-Naperville-Elgin' },
];

export const CITY_CREDITS = [
  'UK rents: Office for National Statistics, Price Index of Private Rents, under the Open Government Licence v3.0.',
  'UK house prices: HM Land Registry UK House Price Index, under the Open Government Licence v3.0. Contains HM Land Registry data © Crown copyright and database right.',
  'US rents: US Bureau of Labor Statistics, consumer price index for rent of primary residence by metro area. BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.',
];

/* The five things a city is scored on for the Premium scorecard (each 0-5
   stars). Fixed rules, shown on the page, so the stars always match the
   figures. A description, not advice. */
export const CITY_CRITERIA = [
  ['Rental yield', 'Yearly rent as a share of the average price. 6%+ = 5 stars, 5% = 4, 4% = 3, 3% = 2, below 3% = 1.'],
  ['Rent growth', 'Average rise in rents a year over 5 years. 6%+ = 5 stars, 4.5% = 4, 3% = 3, 1.5% = 2, less = 1.'],
  ['Rent momentum', 'Rise in rents over the last year. 6%+ = 5 stars, 4% = 4, 2% = 3, 0% = 2, falling = 1.'],
  ['Price growth', 'Average rise in house prices a year over 5 years. 5%+ = 5 stars, 3.5% = 4, 2% = 3, 0.5% = 2, less = 1.'],
  ['Affordability', 'Years of rent to buy the average home (price ÷ yearly rent). Under 15 = 5 stars, 15–18 = 4, 18–22 = 3, 22–27 = 2, 27 or more = 1. Cheaper to buy relative to rent leaves more room for the rent to cover costs.'],
];
