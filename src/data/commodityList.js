/* ════════════════════════════════════════════════════════════════════════
   COMMODITIES — the pages at /commodities/<slug>.
   Prices: World Bank Commodity Price Data ("The Pink Sheet"), monthly
   averages, free to reuse under CC BY 4.0 (the default licence for World
   Bank datasets). The column is matched by the start of its heading in the
   World Bank file (pink), e.g. "Coffee, Arabica".
   tv: a TradingView symbol for the live price box (free widget, with its
   credit link). Only symbols that TradingView's free widgets carry are
   listed; the others show the monthly World Bank price instead.
   Facts below are general, long-standing knowledge (uses, main producers,
   what moves the price) written in plain English.
   ════════════════════════════════════════════════════════════════════════ */

export const COMMODITY_GROUPS = [
  { id: 'metals', name: 'Precious metals' },
  { id: 'industrial', name: 'Industrial metals' },
  { id: 'energy', name: 'Energy' },
  { id: 'food', name: 'Food and drink' },
];

export const COMMODITIES = [
  {
    slug: 'gold', name: 'Gold', group: 'metals', pink: 'Gold', tv: 'TVC:GOLD', etf: 'GLDM',
    about: 'A rare metal that people have treated as money for thousands of years. Today it is bought for jewellery, as savings (bars and coins), by central banks for their reserves, and in small amounts for electronics.',
    producers: ['China', 'Russia', 'Australia'],
    drivers: ['Interest rates: gold pays no interest, so it often does better when rates fall.', 'The US dollar: gold is priced in dollars, so a weaker dollar tends to lift it.', 'Worry: in wars, crises and high inflation, people often buy gold for safety.', 'Central banks buying or selling large amounts.'],
  },
  {
    slug: 'silver', name: 'Silver', group: 'metals', pink: 'Silver', tv: 'TVC:SILVER',
    about: 'A precious metal that is also an industrial workhorse: it conducts electricity better than any other metal, so it goes into solar panels and electronics as well as jewellery, cutlery and coins.',
    producers: ['Mexico', 'China', 'Peru'],
    drivers: ['Factory and solar-panel demand, which makes it swing more than gold.', 'It often follows gold, for the same reasons (interest rates, the dollar, worry).', 'Most silver is mined as a by-product of copper, lead and zinc mines, so supply reacts slowly.'],
  },
  {
    slug: 'platinum', name: 'Platinum', group: 'metals', pink: 'Platinum', tv: 'TVC:PLATINUM',
    about: 'A rare, heavy metal used mainly in catalytic converters that clean car exhaust, in jewellery, in chemical and glass factories, and in hydrogen fuel cells.',
    producers: ['South Africa', 'Russia', 'Zimbabwe'],
    drivers: ['Car making, especially diesel cars, and the switch to electric cars (which need no catalytic converter).', 'Supply problems in South Africa, which mines most of the world’s platinum (power cuts, strikes).', 'Jewellery demand, especially in China.'],
  },
  {
    slug: 'copper', name: 'Copper', group: 'industrial', pink: 'Copper', tv: 'OANDA:XCUUSD',
    about: 'The metal of electricity: it is in wiring, power grids, motors, buildings and electronics. Electric cars, wind farms and solar farms use much more of it than older technology.',
    producers: ['Chile', 'Congo (DRC)', 'Peru'],
    drivers: ['China’s economy, which uses about half the world’s copper.', 'Building and factory activity around the world — copper is sometimes called “Dr Copper” because its price hints at the health of the economy.', 'New mines take many years to open, so supply is slow to respond.'],
  },
  {
    slug: 'aluminium', name: 'Aluminium', group: 'industrial', pink: 'Aluminum',
    about: 'A light, rust-free metal used in drinks cans, food packaging, cars, planes, window frames and power lines.',
    producers: ['China', 'India', 'Russia'],
    drivers: ['Electricity prices: making aluminium uses huge amounts of power.', 'China, which makes more than half of the world’s aluminium.', 'Car and building demand, and trade rules such as import taxes.'],
  },
  {
    slug: 'nickel', name: 'Nickel', group: 'industrial', pink: 'Nickel',
    about: 'A tough metal mostly used to make stainless steel (for kitchens, buildings and machines), and increasingly in batteries for electric cars.',
    producers: ['Indonesia', 'Philippines', 'Russia'],
    drivers: ['Stainless-steel making, mainly in China.', 'Fast growth in supply from Indonesia, now by far the biggest producer.', 'Demand for electric-car batteries.'],
  },
  {
    slug: 'zinc', name: 'Zinc', group: 'industrial', pink: 'Zinc',
    about: 'Mostly used to coat steel so it does not rust (galvanising), for example on car bodies, roofs and road barriers. Also used in brass and batteries.',
    producers: ['China', 'Peru', 'Australia'],
    drivers: ['Building and car making, which use galvanised steel.', 'Mine openings and closures, and the cost of energy for smelting.'],
  },
  {
    slug: 'iron-ore', name: 'Iron ore', group: 'industrial', pink: 'Iron ore',
    about: 'The rock that steel is made from. Steel goes into buildings, bridges, cars, ships and machines, so iron ore is one of the most traded raw materials in the world.',
    producers: ['Australia', 'Brazil', 'China'],
    drivers: ['China’s steel making and building industry, which buys most seaborne iron ore.', 'Output from the big mines in Australia and Brazil, and shipping costs.'],
  },
  {
    slug: 'crude-oil', name: 'Crude oil (Brent)', group: 'energy', pink: 'Crude oil, Brent', tv: 'TVC:UKOIL',
    about: 'Oil straight out of the ground, refined into petrol, diesel, jet fuel and the raw materials for plastics. Brent, from the North Sea, is the price most of the world’s oil is measured against.',
    producers: ['United States', 'Saudi Arabia', 'Russia'],
    drivers: ['Decisions by OPEC+ (the big producers, led by Saudi Arabia and Russia) to pump more or less.', 'How fast the world economy grows, especially China and the US.', 'Wars and trouble in producing regions such as the Middle East.', 'Stockpiles, and the switch to electric cars over time.'],
  },
  {
    slug: 'natural-gas', name: 'Natural gas (US)', group: 'energy', pink: 'Natural gas, US', tv: 'OANDA:NATGASUSD',
    about: 'Gas used to heat homes, make electricity and run factories. This is the US price (Henry Hub); prices in Europe and Asia are usually higher because gas has to be shipped there as liquid gas.',
    producers: ['United States', 'Russia', 'Iran'],
    drivers: ['Weather: cold winters and hot summers (air conditioning) raise demand.', 'How much gas is in storage before winter.', 'Exports of liquid gas to Europe and Asia.'],
  },
  {
    slug: 'coffee', name: 'Coffee (Arabica)', group: 'food', pink: 'Coffee, Arabica',
    about: 'Arabica is the higher-quality coffee bean used in most café and speciality coffee. The cheaper Robusta bean goes mainly into instant coffee and blends.',
    producers: ['Brazil', 'Vietnam', 'Colombia'],
    drivers: ['Weather in Brazil, the biggest grower: frost or drought can cut the crop sharply.', 'The Brazilian currency: when it is weak, farmers sell more abroad.', 'Coffee trees take years to grow, so supply cannot change quickly.'],
  },
  {
    slug: 'cocoa', name: 'Cocoa', group: 'food', pink: 'Cocoa',
    about: 'The bean that chocolate is made from. Most of the world’s cocoa is grown by small farmers in West Africa.',
    producers: ['Côte d’Ivoire', 'Ghana', 'Ecuador'],
    drivers: ['Weather and crop diseases in Côte d’Ivoire and Ghana, which grow most of the world’s cocoa.', 'Chocolate demand, and the prices those governments set for farmers.'],
  },
  {
    slug: 'sugar', name: 'Sugar', group: 'food', pink: 'Sugar, world', tv: 'OANDA:SUGARUSD',
    about: 'Made from sugar cane and sugar beet, and used in food and drinks. In Brazil, cane is also turned into ethanol fuel for cars.',
    producers: ['Brazil', 'India'],
    drivers: ['Harvests in Brazil and India, which depend on rain.', 'Oil prices: when oil is dear, Brazil turns more cane into ethanol and less into sugar.', 'Export rules in India.'],
  },
  {
    slug: 'wheat', name: 'Wheat', group: 'food', pink: 'Wheat, US HRW', tv: 'OANDA:WHEATUSD',
    about: 'The grain behind bread, pasta, noodles and biscuits — one of the most important foods in the world. This price is for US hard red winter wheat, a common bread wheat.',
    producers: ['China', 'India', 'Russia'],
    drivers: ['Weather in the big growing areas (drought, floods, frost).', 'Exports from Russia and Ukraine, two of the largest sellers, and the Black Sea shipping routes.', 'The price of fertiliser and fuel for farms.'],
  },
  {
    slug: 'rice', name: 'Rice', group: 'food', pink: 'Rice, Thai 5%',
    about: 'The main food for more than half of the world’s people, mostly in Asia. This is the price of Thai white rice, a standard for rice traded between countries.',
    producers: ['China', 'India', 'Bangladesh'],
    drivers: ['Monsoon rains in South and South-East Asia.', 'Export rules in India, the largest seller of rice abroad.', 'Government stockpiles in big buying countries.'],
  },
  {
    slug: 'palm-oil', name: 'Palm oil', group: 'food', pink: 'Palm oil',
    about: 'The most widely used vegetable oil: it is in cooking oil, margarine, biscuits, soap, shampoo and biofuel.',
    producers: ['Indonesia', 'Malaysia', 'Thailand'],
    drivers: ['Output in Indonesia and Malaysia, which produce most of the world’s palm oil.', 'Biofuel rules, especially in Indonesia.', 'Prices of competing oils such as soybean oil.'],
  },
];

export const getCommodity = (slug) => COMMODITIES.find((c) => c.slug === slug) || null;

/** Units as written in the World Bank file → plain English. */
export function unitWords(unit) {
  const u = String(unit || '').toLowerCase().replace(/[()\s]/gu, '');
  if (u.includes('troyoz')) return { per: 'per troy ounce', short: '/oz' };
  if (u.includes('bbl')) return { per: 'per barrel', short: '/barrel' };
  if (u.includes('mmbtu')) return { per: 'per million BTU (a unit of energy)', short: '/mmBtu' };
  if (u.includes('/kg')) return { per: 'per kilogram', short: '/kg' };
  if (u.includes('dmtu')) return { per: 'per dry tonne', short: '/tonne' };
  if (u.includes('/mt')) return { per: 'per tonne', short: '/tonne' };
  return { per: unit || '', short: '' };
}

export const COMMODITY_CREDIT = 'Prices: World Bank Commodity Price Data (The Pink Sheet), monthly averages in US dollars, licensed under Creative Commons Attribution 4.0 (CC BY 4.0). Live price boxes: TradingView.';
