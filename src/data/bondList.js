/* ════════════════════════════════════════════════════════════════════════
   GOVERNMENT BONDS — the pages at /bonds/<slug>.
     us      true = full US Treasury yield curve (US Treasury, public domain)
     oecd    OECD country code: monthly 10-year and 3-month interest rates
             (OECD, any use with credit)
     tv      TradingView symbol for the live 10-year yield box (free widget)
   ════════════════════════════════════════════════════════════════════════ */

export const BOND_PLACES = [
  { slug: 'united-states', name: 'United States', called: 'the US', bond: 'US Treasuries', currency: 'US dollars', us: true, oecd: 'USA', tv: 'TVC:US10Y',
    intro: 'Loans to the US government, the biggest and most traded bond market in the world. Their interest rates set the tone for mortgages and loans everywhere.' },
  { slug: 'united-kingdom', name: 'United Kingdom', called: 'the UK', bond: 'UK gilts', currency: 'pounds', oecd: 'GBR', tv: 'TVC:GB10Y',
    intro: 'Loans to the UK government, called “gilts”. They are used by UK pension funds and set the base for UK fixed-rate mortgages.' },
  { slug: 'germany', name: 'Germany', called: 'Germany', bond: 'German Bunds', currency: 'euros', oecd: 'DEU', tv: 'TVC:DE10Y',
    intro: 'Loans to the German government, called “Bunds”. They are seen as the safest bonds in Europe and are the benchmark for the euro area.' },
  { slug: 'france', name: 'France', called: 'France', bond: 'French OATs', currency: 'euros', oecd: 'FRA', tv: 'TVC:FR10Y',
    intro: 'Loans to the French government, called “OATs”. The gap between French and German rates shows how much extra lenders want for France.' },
  { slug: 'italy', name: 'Italy', called: 'Italy', bond: 'Italian BTPs', currency: 'euros', oecd: 'ITA', tv: 'TVC:IT10Y',
    intro: 'Loans to the Italian government, called “BTPs”. Italy has one of the largest government debts in Europe, so its rates are watched closely.' },
  { slug: 'japan', name: 'Japan', called: 'Japan', bond: 'Japanese government bonds', currency: 'yen', oecd: 'JPN', tv: 'TVC:JP10Y',
    intro: 'Loans to the Japanese government. For years Japan kept its interest rates near zero; how fast they rise affects money flows around the world.' },
  { slug: 'india', name: 'India', called: 'India', bond: 'Indian government securities', currency: 'rupees', oecd: 'IND', tv: 'TVC:IN10Y',
    intro: 'Loans to the Indian government, called “G-secs”. Indian rates are higher than in rich countries, partly because inflation has been higher.' },
  { slug: 'canada', name: 'Canada', called: 'Canada', bond: 'Canadian government bonds', currency: 'Canadian dollars', oecd: 'CAN', tv: 'TVC:CA10Y',
    intro: 'Loans to the Canadian government. Canadian rates tend to move closely with US rates.' },
  { slug: 'australia', name: 'Australia', called: 'Australia', bond: 'Australian government bonds', currency: 'Australian dollars', oecd: 'AUS', tv: 'TVC:AU10Y',
    intro: 'Loans to the Australian government. Australian rates react to China’s economy and to prices of the raw materials Australia exports.' },
];

export const getBondPlace = (slug) => BOND_PLACES.find((p) => p.slug === slug) || null;

export const BOND_CREDITS = {
  treasury: 'US yields: US Department of the Treasury, daily par yield curve rates.',
  oecd: 'Other countries: OECD (2026), Financial market indicators (long-term and short-term interest rates), OECD Data Explorer.',
  tv: 'Live yield boxes: TradingView.',
};

/** Maturities in the US Treasury feed, shortest first. */
export const US_MATURITIES = [
  ['1M', 'BC_1MONTH', '1 month'], ['3M', 'BC_3MONTH', '3 months'], ['6M', 'BC_6MONTH', '6 months'],
  ['1Y', 'BC_1YEAR', '1 year'], ['2Y', 'BC_2YEAR', '2 years'], ['3Y', 'BC_3YEAR', '3 years'], ['5Y', 'BC_5YEAR', '5 years'],
  ['7Y', 'BC_7YEAR', '7 years'], ['10Y', 'BC_10YEAR', '10 years'], ['20Y', 'BC_20YEAR', '20 years'], ['30Y', 'BC_30YEAR', '30 years'],
];
