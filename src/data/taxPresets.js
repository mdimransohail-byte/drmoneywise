/* ════════════════════════════════════════════════════════════════════════
   COUNTRY SETTINGS FOR THE MONEY CALCULATORS
   ───────────────────────────────────────────────────────────────────────
   Checked 17 October 2026. Rules are simplified to the common case; every
   calculator lets the reader type their own rate instead. Review each April
   (UK/India budgets) and January (US). Edit numbers below and upload.

   gainsRate / dividendRate are percentages. gainsAllowance and
   dividendAllowance are the tax-free amount per year in local currency.
   ════════════════════════════════════════════════════════════════════════ */

export const TAX_CHECKED_ON = '17 October 2026';

export const TAX_PRESETS = {
  us: {
    label: 'United States',
    currency: 'USD',
    symbol: '$',
    locale: 'en-US',
    gainsRate: 15,
    gainsAllowance: 0,
    dividendRate: 15,
    dividendAllowance: 0,
    taxFreeAccounts: '401(k), IRA and Roth IRA accounts grow without yearly tax (Roth withdrawals can be tax-free).',
    notes: [
      'Long-term gains (investments held over a year) and qualified dividends are taxed at 0%, 15% or 20% depending on income. Most middle-income savers pay 15%, which is the default here.',
      'For 2026, the 0% rate applies to taxable income up to $49,450 (single) or $98,900 (married filing jointly); 20% starts above $545,500 (single) or $613,700 (married).',
      'Higher earners may also pay a 3.8% Net Investment Income Tax.',
    ],
  },
  uk: {
    label: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    locale: 'en-GB',
    gainsRate: 18,
    gainsAllowance: 3000,
    dividendRate: 10.75,
    dividendAllowance: 500,
    taxFreeAccounts: 'Stocks & Shares ISA: up to £20,000 a year, with no tax on gains or dividends. Pensions also grow tax-free.',
    notes: [
      'Capital Gains Tax on shares is 18% for basic-rate taxpayers and 24% for higher-rate, after the first £3,000 of gains each year (2026/27).',
      'Dividend tax is 10.75% (basic rate), 35.75% (higher) or 39.35% (additional), after the first £500 of dividends each year (2026/27).',
      'Defaults here are basic-rate figures. Change the rate if you pay higher-rate tax.',
    ],
  },
  in: {
    label: 'India',
    currency: 'INR',
    symbol: '₹',
    locale: 'en-IN',
    gainsRate: 12.5,
    gainsAllowance: 125000,
    dividendRate: 20,
    dividendAllowance: 0,
    taxFreeAccounts: 'PPF, NPS and ELSS funds offer tax benefits; PPF interest and maturity are tax-free.',
    notes: [
      'Long-term gains on listed shares and equity mutual funds held over 12 months are taxed at 12.5% above ₹1.25 lakh a year. Gains on holdings under 12 months are taxed at 20%.',
      'Dividends are added to your income and taxed at your income-tax slab rate. The default of 20% is only an example: enter your own slab rate.',
    ],
  },
  ae: {
    label: 'United Arab Emirates',
    currency: 'AED',
    symbol: 'AED ',
    locale: 'en-AE',
    gainsRate: 0,
    gainsAllowance: 0,
    dividendRate: 0,
    dividendAllowance: 0,
    taxFreeAccounts: 'Individuals pay no tax on salary, investment gains, dividends or interest.',
    notes: [
      'There is no personal income tax in the UAE, so investment gains and dividends are tax-free for individuals.',
      'If you are a citizen or tax resident of another country (for example the US), that country may still tax you.',
    ],
  },
  other: {
    label: 'Another country',
    currency: 'USD',
    symbol: '$',
    locale: 'en-US',
    gainsRate: 0,
    gainsAllowance: 0,
    dividendRate: 0,
    dividendAllowance: 0,
    taxFreeAccounts: 'Many countries have special savings accounts with tax benefits. Check your local rules.',
    notes: [
      'Enter the tax rates that apply where you live. If you are not sure, leave them at 0% to see the before-tax figure.',
    ],
  },
};
