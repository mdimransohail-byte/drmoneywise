/* ════════════════════════════════════════════════════════════════════════
   TOOLS + GLOSSARY PAGES
     /tools                     the four money calculators
     /tools/<calculator>        one calculator (maths runs in public/calculators.js)
     /glossary                  A–Z of money words
     /glossary/<term>           one word, explained simply
   Country tax settings come from src/data/taxPresets.js.
   ════════════════════════════════════════════════════════════════════════ */

import { buildHeadTags, pageShell } from './seoService.js';
import { TAX_CHECKED_ON, TAX_PRESETS } from '../data/taxPresets.js';
import { GLOSSARY, slugify } from '../data/glossary.js';
import { getPhoto, photoFigure } from './imageService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/* ── Calculator definitions ─────────────────────────────────────────── */
export const CALCULATORS = {
  'savings-growth': {
    title: 'Grow my savings',
    short: 'What a lump sum could grow to',
    intro: 'See what a one-off amount could grow to if you leave it invested, and how much tax you might owe when you sell.',
    photo: 'piggy bank coins',
    fields: [
      ['start', 'Amount you invest today', 10000, 'money'],
      ['years', 'How many years', 10, 'years'],
      ['rate', 'Yearly growth you expect', 7, 'percent', 'Shares have averaged roughly 7% a year after inflation over very long periods, but some years are much worse.'],
    ],
    tax: 'gains',
  },
  'monthly-investing': {
    title: 'Monthly investing',
    short: 'Investing a little every month',
    intro: 'See what investing a set amount every month could add up to, including what you could keep after tax.',
    photo: 'calendar savings plan',
    fields: [
      ['start', 'Amount you start with', 0, 'money'],
      ['monthly', 'Amount you add each month', 200, 'money'],
      ['years', 'How many years', 20, 'years'],
      ['rate', 'Yearly growth you expect', 7, 'percent'],
      ['stepUp', 'Raise your monthly amount each year by', 0, 'percent', 'For example 5% if you plan to save a bit more as your pay rises.'],
    ],
    tax: 'gains',
  },
  retirement: {
    title: 'Retirement check',
    short: 'Am I on track?',
    intro: 'Check whether your savings could give you the monthly income you want when you stop working, in today’s money.',
    photo: 'retired couple walking beach',
    fields: [
      ['age', 'Your age now', 35, 'years'],
      ['retireAge', 'Age you want to retire', 65, 'years'],
      ['start', 'Retirement savings you have now', 25000, 'money'],
      ['monthly', 'Amount you save each month', 500, 'money'],
      ['rate', 'Yearly growth you expect', 6, 'percent'],
      ['inflation', 'Yearly price rises (inflation)', 3, 'percent'],
      ['withdrawal', 'Share of savings you take out each year', 4, 'percent', 'Taking about 4% a year is a common rule of thumb for making savings last around 30 years.'],
      ['wanted', 'Monthly income you want (today’s money)', 3000, 'money'],
    ],
    tax: 'none',
  },
  'dividend-income': {
    title: 'Dividend income',
    short: 'Yearly payout from my shares',
    intro: 'See how much income your shares or funds could pay you each year, after tax, and how it could grow.',
    photo: 'coins growing plant',
    fields: [
      ['amount', 'Amount invested', 20000, 'money'],
      ['yield', 'Dividend yield', 3.5, 'percent', 'A year’s dividends divided by the price. You will find it on each company page.'],
      ['divGrowth', 'Yearly dividend growth', 5, 'percent'],
      ['years', 'How many years', 15, 'years'],
    ],
    tax: 'dividends',
  },
};

/* Simpler calculators (no tax settings). The sums run in public/morecalc.js. */
export const EXTRA_CALCS = {
  'emergency-fund': {
    title: 'Emergency fund', short: 'How big should my safety net be?', photo: 'jar of coins savings',
    intro: 'Work out how big your safety net should be, and how long it will take to build at the rate you can save.',
    fields: [
      ['essentials', 'Essential spending each month (rent, bills, food, travel)', 2000, 'money'],
      ['months', 'Months of spending to cover', 6, 'number', 'Three to six months is a common guide; more if your income is irregular or others depend on you.'],
      ['saved', 'Already saved for emergencies', 1500, 'money'],
      ['monthly', 'Amount you can add each month', 300, 'money'],
    ],
  },
  'debt-payoff': {
    title: 'Debt payoff', short: 'When will I be debt-free?', photo: 'credit cards wallet',
    intro: 'See how long it takes to clear a loan or credit card, how much interest you pay, and what paying a little extra each month saves.',
    fields: [
      ['balance', 'Amount you owe', 5000, 'money'],
      ['apr', 'Interest rate a year (APR)', 22, 'percent', 'You will find it on your statement. Credit cards are often 20% or more.'],
      ['payment', 'Monthly payment', 200, 'money'],
      ['extra', 'Extra you could pay each month', 50, 'money'],
    ],
  },
  'education-fund': {
    title: 'Education fund', short: 'Saving for a child’s school or university', photo: 'graduation cap books',
    intro: 'Estimate what your child’s education could cost by the time they start, and how much to save each month to get there.',
    fields: [
      ['childAge', 'Your child’s age now', 3, 'years'],
      ['startAge', 'Age they start (for example 18 for university)', 18, 'years'],
      ['cost', 'Yearly cost today (fees and living costs)', 20000, 'money'],
      ['studyYears', 'Years of study', 3, 'years'],
      ['costRise', 'Yearly rise in education costs', 5, 'percent', 'Fees have often risen faster than general prices; 4–6% is a cautious guess.'],
      ['saved', 'Already saved', 2000, 'money'],
      ['rate', 'Yearly growth you expect on savings', 6, 'percent'],
    ],
  },
  'life-cover': {
    title: 'Life cover', short: 'How much life insurance might I need?', photo: 'family holding hands park',
    intro: 'Add up how much money your family might need if you died, to get a rough idea of the life insurance to look for.',
    fields: [
      ['income', 'Your yearly take-home pay', 40000, 'money'],
      ['years', 'Years your family would need that income', 10, 'years'],
      ['share', 'Share of your income they would need', 70, 'percent', 'Often less than 100%, because some of your own costs stop.'],
      ['debts', 'Mortgage and other debts to clear', 150000, 'money'],
      ['education', 'Future education costs for children', 40000, 'money'],
      ['funeral', 'Funeral and other one-off costs', 6000, 'money'],
      ['savings', 'Savings and investments your family could use', 20000, 'money'],
      ['existing', 'Life cover you already have (for example through work)', 80000, 'money'],
    ],
  },
  'currency-converter': {
    title: 'Currency converter', short: 'Today’s rates, and what the exchange really costs', photo: 'foreign currency banknotes',
    intro: 'Convert between currencies at today’s reference rates, and see how much a bank or exchange shop’s margin really costs you.',
    fields: [
      ['amount', 'Amount to change', 1000, 'number'],
      ['margin', 'Margin the provider adds (their spread)', 3, 'percent', 'Airport kiosks and some banks add 3–10%. Some cards and apps add less than 1%.'],
    ],
    currency: true,
  },
  'trade-risk': {
    title: 'Trading risk', short: 'What leverage does to a small price move', photo: 'stock market screen chart',
    intro: 'See how borrowed money (leverage) multiplies gains and losses when trading currencies or commodities, and how much you could lose on a move against you.',
    fields: [
      ['deposit', 'Money you put in (your margin)', 1000, 'money'],
      ['leverage', 'Leverage (for example 30 means 30 to 1)', 30, 'number', 'UK and EU rules cap retail leverage at 30:1 for major currencies and 20:1 for gold; other countries may allow more.'],
      ['move', 'Price move against you', 2, 'percent'],
      ['spread', 'Trading cost (spread) as % of the position', 0.05, 'percent'],
    ],
  },
};

const COUNTRY_ORDER = ['us', 'uk', 'in', 'ae', 'other'];

function field([id, label, value, type, hint]) {
  const unit = type === 'percent' ? '<span class="calc-unit">%</span>' : type === 'years' ? '<span class="calc-unit">yrs</span>' : '';
  const prefix = type === 'money' ? '<span class="calc-unit pre" data-symbol>$</span>' : '';
  const step = type === 'percent' ? '0.1' : type === 'money' ? '50' : '1';
  return `
            <div class="calc-field">
              <label for="${id}">${esc(label)}</label>
              <div class="calc-input">${prefix}<input id="${id}" name="${id}" type="number" inputmode="decimal" min="0" step="${step}" value="${value}" />${unit}</div>
              ${hint ? `<p class="calc-hint">${esc(hint)}</p>` : ''}
            </div>`;
}

function taxFields(kind) {
  if (kind === 'none') {
    return `<p class="calc-hint">This check is shown before tax. Retirement accounts are taxed differently in each country; see the notes below.</p>`;
  }
  const isDiv = kind === 'dividends';
  const rateId = isDiv ? 'dividendRate' : 'gainsRate';
  const allowId = isDiv ? 'dividendAllowance' : 'gainsAllowance';
  return `
          <fieldset class="calc-tax">
            <legend>Tax on ${isDiv ? 'dividends' : 'your gains'}</legend>
            ${field([rateId, isDiv ? 'Dividend tax rate' : 'Tax rate on gains', 0, 'percent'])}
            ${field([allowId, 'Tax-free amount each year', 0, 'money'])}
            <label class="calc-check"><input id="taxFree" type="checkbox" /> Held in a tax-free account (no tax)</label>
            ${isDiv ? '<label class="calc-check"><input id="reinvest" type="checkbox" checked /> Reinvest my dividends</label>' : ''}
          </fieldset>`;
}

/* ── /tools ─────────────────────────────────────────────────────────── */
export async function renderToolsHub(origin) {
  const head = buildHeadTags({
    title: 'Free money calculators | Dr MoneyWise',
    description: 'Free money calculators: savings growth, monthly investing, retirement, dividend income, emergency fund, debt payoff, education fund, life cover, currency converter and trading risk.',
    canonical: `${origin}/tools`,
  });
  const photo = await getPhoto('page:tools', 'calculator notebook desk');
  const cards = [...Object.entries(CALCULATORS), ...Object.entries(EXTRA_CALCS)].map(([slug, c]) => `
          <a class="ten hub" href="/tools/${slug}">
            <h2>${esc(c.title)}</h2>
            <p class="rule">${esc(c.short)}</p>
            <p class="meaning">${esc(c.intro)}</p>
            <span class="go">Open calculator</span>
          </a>`).join('');
  const body = `
      <section class="block">
        ${photoFigure(photo, 'Calculator and notebook', 'page-photo wide')}
        <div class="block-head"><div><h1 style="font-size:36px;margin:0">Money calculators</h1>
          <p>Free, simple and private: nothing you type leaves your device. Pick your country to use its currency and tax rules.</p></div></div>
        <div class="tens">${cards}
          <a class="ten hub gloss-hub" href="/glossary">
            <h2>Glossary</h2>
            <p class="rule">New to a word? See our money words.</p>
            <p class="meaning">${GLOSSARY.length} money words, each explained simply with an everyday example.</p>
            <span class="go">Open the glossary</span>
          </a>
        </div>
        <div class="block-head" style="margin-top:30px"><div><h2 style="font-size:28px;margin:0">Tools for members</h2>
          <p>Research tools built from companies’ and funds’ official reports.</p></div></div>
        <div class="tens">
          ${[
            ['/screener', 'Stock screener', 'Regular and Premium', 'Filter companies in the US and around the world by growth, profit, debt and dividends. Premium adds what the big funds own.'],
            ['/ideas', 'Ideas that match your rules', 'Premium', 'Save up to 5 sets of rules and see every company that matches, with new matches in your Saturday email.'],
            ['/portfolio-health', 'Portfolio health check', 'Premium', 'A score and colour heat map for every holding and for your whole portfolio.'],
            ['/shariah', 'Shariah-compliant investing', 'Free', 'Which big companies pass the five main Shariah standards, with Shariah funds and ETFs. Members can also filter the screener by standard.'],
            ['/insiders', 'Company bosses’ trades', 'Premium', 'When directors and top managers buy or sell their own company’s shares.'],
            ['/reports', 'Monthly research report', 'Premium', 'The month in figures: economy, markets, results, and what bosses and big funds did.'],
            ['/ask', 'Ask Dr MoneyWise', 'Regular and Premium', 'Send us your money questions; read the answers to other readers’ questions.'],
            ['/learn/path', 'Your learning path', 'Free', 'Short steps from your first savings to running a portfolio, with your progress saved.'],
          ].map(([href, title, plan, text]) => `
          <a class="ten hub" href="${href}">
            <h2>${esc(title)}</h2>
            <p class="rule"><span class="sc-prem">${esc(plan)}</span></p>
            <p class="meaning">${esc(text)}</p>
            <span class="go">Open</span>
          </a>`).join('')}
        </div>
        <p class="note-box">Want to track your own holdings? Use <a href="/#tools">My watchlist and portfolio</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'tools' });
}

/* ── /tools/<slug> ──────────────────────────────────────────────────── */
export async function renderCalculator(origin, slug) {
  if (EXTRA_CALCS[slug]) return renderExtraCalculator(origin, slug);
  const c = CALCULATORS[slug];
  if (!c) return null;
  const head = buildHeadTags({
    title: `${c.title} calculator | Dr MoneyWise`,
    description: c.intro,
    canonical: `${origin}/tools/${slug}`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${c.title} calculator`, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0' }, url: `${origin}/tools/${slug}` },
  });
  const photo = await getPhoto(`page:tool-${slug}`, c.photo);
  const options = COUNTRY_ORDER.map((k) => `<option value="${k}">${esc(TAX_PRESETS[k].label)}</option>`).join('');
  const others = Object.entries(CALCULATORS).filter(([s]) => s !== slug)
    .map(([s, o]) => `<li><a href="/tools/${s}">${esc(o.title)}</a> <span>${esc(o.short)}</span></li>`).join('');
  const taxJson = JSON.stringify(TAX_PRESETS).replace(/</gu, '\\u003c');
  const body = `
      <section class="block calc-page" data-calc="${slug}">
        <p class="crumbs"><a href="/tools">Calculators</a> › ${esc(c.title)}</p>
        <div class="calc-top">
          <div>
            <h1 style="font-size:36px;margin:0 0 8px">${esc(c.title)}</h1>
            <p>${esc(c.intro)}</p>
          </div>
          ${photoFigure(photo, c.title, 'page-photo calc-photo')}
        </div>
        <div class="calc-grid">
          <form class="surface calc-form" onsubmit="return false" aria-label="${esc(c.title)} inputs">
            <div class="calc-field">
              <label for="country">Your country</label>
              <select id="country" name="country">${options}</select>
            </div>
            ${c.fields.map(field).join('')}
            ${taxFields(c.tax)}
          </form>
          <div class="surface calc-out" aria-live="polite">
            <h2 style="margin-top:0">Your result</h2>
            <div id="results"><p class="calc-hint">Loading the calculator…</p></div>
            <div id="chartWrap">
              <div id="chart" class="calc-chart" role="img" aria-label="Value year by year"></div>
              <p class="calc-legend"><span class="key growth"></span> Growth <span class="key paid"></span> Money you put in <span id="chartYears" class="calc-years-note">· numbers under the bars are years</span></p>
            </div>
          </div>
        </div>
        <div class="surface calc-notes">
          <h2 style="margin-top:0">Tax in <span id="countryLabel">${esc(TAX_PRESETS.us.label)}</span>, simply</h2>
          <ul id="taxNotes">${TAX_PRESETS.us.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
          <p class="calc-hint">Tax rules checked ${esc(TAX_CHECKED_ON)} and simplified to the common case. Your own tax depends on your income and situation. This is for learning, not tax or financial advice. Read our <a href="/disclaimer">disclaimer</a>.</p>
        </div>
        <div class="surface">
          <h2 style="margin-top:0">Other calculators</h2>
          <ul class="calc-others">${others}</ul>
        </div>
      </section>
      <noscript><p class="note-box">Turn on JavaScript in your browser to use this calculator.</p></noscript>
      <script>window.DMW_TAX = ${taxJson};</script>
      <script src="/calculators.js" defer></script>`;
  return pageShell({ head, body, active: 'tools' });
}

/* ── The simpler calculators ────────────────────────────────────────── */
const CURRENCY_LIST = ['USD', 'GBP', 'EUR', 'INR', 'AED', 'SAR', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'HKD', 'SGD', 'PKR', 'BRL', 'MXN', 'KRW', 'ZAR', 'NZD', 'SEK', 'NOK', 'TRY'];

async function renderExtraCalculator(origin, slug) {
  const c = EXTRA_CALCS[slug];
  const head = buildHeadTags({
    title: `${c.title} calculator: ${c.short.toLowerCase().replace(/\?$/u, '')} | Dr MoneyWise`,
    description: c.intro,
    canonical: `${origin}/tools/${slug}`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${c.title} calculator`, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0' }, url: `${origin}/tools/${slug}` },
  });
  const photo = await getPhoto(`page:tool-${slug}`, c.photo);
  let fx = null;
  if (c.currency) {
    const { getFxRates, CURRENCY_WORDS } = await import('./fxService.js');
    const rates = await getFxRates();
    const list = CURRENCY_LIST.filter((k) => rates.usdPer?.[k]);
    fx = { date: rates.date, usdPer: Object.fromEntries(list.map((k) => [k, rates.usdPer[k]])), words: Object.fromEntries(list.map((k) => [k, CURRENCY_WORDS[k] || k])) };
  }
  const symbolPicker = c.currency ? '' : `<div class="calc-field"><label for="symbol">Currency</label><select id="symbol">${[['$', 'US dollar ($)'], ['£', 'Pound (£)'], ['€', 'Euro (€)'], ['₹', 'Rupee (₹)'], ['AED ', 'Dirham (AED)']].map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>`;
  const pick = (id, label, def) => `<div class="calc-field"><label for="${id}">${esc(label)}</label><select id="${id}">${Object.keys(fx?.usdPer || {}).map((k) => `<option value="${k}"${k === def ? ' selected' : ''}>${k} · ${esc(fx.words[k])}</option>`).join('')}</select></div>`;
  const all = { ...CALCULATORS, ...EXTRA_CALCS };
  const others = Object.entries(all).filter(([s]) => s !== slug).map(([s, o]) => `<li><a href="/tools/${s}">${esc(o.title)}</a> <span>${esc(o.short)}</span></li>`).join('');
  const body = `
      <section class="block calc-page" data-more-calc="${slug}">
        <p class="crumbs"><a href="/tools">Calculators</a> › ${esc(c.title)}</p>
        <div class="calc-top">
          <div><h1 style="font-size:36px;margin:0 0 8px">${esc(c.title)} calculator</h1><p>${esc(c.intro)}</p></div>
          ${photoFigure(photo, c.title, 'page-photo calc-photo')}
        </div>
        <div class="calc-grid">
          <form class="surface calc-form" onsubmit="return false" aria-label="${esc(c.title)} inputs">
            ${symbolPicker}
            ${c.currency ? `${pick('from', 'From', 'GBP')}${pick('to', 'To', 'USD')}` : ''}
            ${c.fields.map(field).join('')}
          </form>
          <div class="surface calc-out" aria-live="polite">
            <h2 style="margin-top:0">Your result</h2>
            <div id="moreResults"><p class="calc-hint">Loading the calculator…</p></div>
          </div>
        </div>
        ${c.currency ? `<p class="calc-hint">Reference rates from the European Central Bank${fx?.date ? `, ${esc(fx.date)}` : ''}; dirham, riyal and other fixed rates from their official pegs. Real rates from banks and exchange shops include their margin.</p>` : ''}
        <p class="calc-hint">These are rough estimates to help you think, not financial advice. Read our <a href="/disclaimer">disclaimer</a>.</p>
        <div class="surface"><h2 style="margin-top:0">Other calculators</h2><ul class="calc-others">${others}</ul></div>
      </section>
      <noscript><p class="note-box">Turn on JavaScript in your browser to use this calculator.</p></noscript>
      ${fx ? `<script>window.DMW_FX = ${JSON.stringify(fx).replace(/</gu, '\\u003c')};</script>` : ''}
      <script src="/morecalc.js" defer></script>`;
  return pageShell({ head, body, active: 'tools' });
}

/* ── Glossary ───────────────────────────────────────────────────────── */
const BY_SLUG = new Map(GLOSSARY.map((g) => [slugify(g.term), g]));
const BY_TERM = new Map(GLOSSARY.map((g) => [g.term.toLowerCase(), g]));

function sortedTerms() {
  return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'en', { numeric: true }));
}

function letterOf(term) {
  const ch = term[0].toUpperCase();
  return /[A-Z]/u.test(ch) ? ch : '#';
}

export async function renderGlossaryIndex(origin) {
  const head = buildHeadTags({
    title: 'Money words explained simply — glossary | Dr MoneyWise',
    description: `${GLOSSARY.length} money and investing words explained in plain English, each with an everyday example.`,
    canonical: `${origin}/glossary`,
  });
  const groups = new Map();
  for (const g of sortedTerms()) {
    const l = letterOf(g.term);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(g);
  }
  const letters = [...groups.keys()].sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  const jump = letters.map((l) => `<a href="#letter-${l === '#' ? 'num' : l}">${l}</a>`).join('');
  const sections = letters.map((l) => `
        <section class="gloss-letter" id="letter-${l === '#' ? 'num' : l}">
          <h2>${l === '#' ? '0–9' : l}</h2>
          <dl>${groups.get(l).map((g) => `
            <div><dt><a href="/glossary/${slugify(g.term)}">${esc(g.term)}</a></dt><dd>${esc(g.plain)}</dd></div>`).join('')}
          </dl>
        </section>`).join('');
  const body = `
      <section class="block">
        <div class="block-head"><div><h1 style="font-size:36px;margin:0">Money words, explained simply</h1>
          <p>${GLOSSARY.length} words you will meet when saving and investing, each in a sentence or two with an everyday example.</p></div></div>
        <form class="gloss-search" onsubmit="return false" role="search">
          <label class="sr-only" for="glossFilter">Find a word</label>
          <input id="glossFilter" type="search" placeholder="Find a word, e.g. dividend" oninput="var q=this.value.toLowerCase();document.querySelectorAll('.gloss-letter dl > div').forEach(function(d){d.hidden=q&&d.textContent.toLowerCase().indexOf(q)<0;});document.querySelectorAll('.gloss-letter').forEach(function(s){s.hidden=!s.querySelector('dl > div:not([hidden])');});" />
        </form>
        <nav class="gloss-jump" aria-label="Jump to letter">${jump}</nav>
        ${sections}
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

/* Words with a live figure on the site: the latest official number. */
const LIVE_FIGURE = { Inflation: 'inflation', 'Interest rate': 'interestRate', 'Central bank': 'interestRate', 'Federal Reserve': 'interestRate', 'Bond yield': 'tenYearYield', Treasury: 'tenYearYield', Mortgage: 'mortgageRate', 'Unemployment rate': 'unemployment' };

async function liveFigureHtml(term) {
  const key = LIVE_FIGURE[term];
  if (!key) return '';
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { figures = {} } = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'market', 'economy.json'), 'utf8'));
    const f = figures[key];
    if (!f || typeof f.value !== 'number') return '';
    const when = new Date(`${f.asOf}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const change = typeof f.previous === 'number' && Math.abs(f.value - f.previous) >= 0.01 ? (f.value > f.previous ? `up from ${f.previous.toFixed(2)}%` : `down from ${f.previous.toFixed(2)}%`) : 'unchanged on the previous figure';
    return `<div class="gl-live"><span>Latest figure</span><strong>${f.value.toFixed(f.unit === '%' && Math.abs(f.value) < 10 ? 2 : 1)}%</strong><p>${esc(f.label)}, ${esc(when)}: ${esc(change)}. Official US figures, updated automatically.</p><a href="/today">See today’s economy figures →</a></div>`;
  } catch { return ''; }
}

export async function renderGlossaryTerm(origin, slug) {
  const g = BY_SLUG.get(slug);
  if (!g) return null;
  const related = (g.related || []).map((name) => BY_TERM.get(name.toLowerCase())).filter(Boolean);
  const all = sortedTerms();
  const i = all.indexOf(g);
  const prev = all[i - 1];
  const next = all[i + 1];
  // Guides, lessons and calculators that use this word
  const { HUBS, HUB_ORDER } = await import('../data/topicHubs.js');
  const hubs = [...HUB_ORDER, 'commodities'].filter((h) => HUBS[h].words.includes(g.term)).map((h) => [h === 'commodities' ? '/commodities' : `/${h}`, HUBS[h].name, HUBS[h].colour]);
  const calcs = [...new Set(hubs.flatMap(([href]) => HUBS[href.slice(1)]?.calcs || []))].slice(0, 3).map((c) => [c, { ...CALCULATORS, ...EXTRA_CALCS }[c]]).filter(([, c]) => c);
  const { getPublishedLearningArticles } = await import('./seoService.js');
  const word = g.term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/s$/u, '');
  const re = new RegExp(`\\b${word}`, 'iu');
  const lessons = (await getPublishedLearningArticles()).filter((a) => re.test(`${a.headline} ${a.trendingTopic || ''} ${a.summary || ''}`)).slice(0, 4);
  const live = await liveFigureHtml(g.term);
  const head = buildHeadTags({
    title: `What is ${/^[A-Z0-9]{2,}|^\d/u.test(g.term) ? g.term : g.term.toLowerCase()}? Meaning and example, explained simply | Dr MoneyWise`,
    description: `${g.term} meaning: ${g.plain} Example: ${g.example}`,
    canonical: `${origin}/glossary/${slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'DefinedTerm', name: g.term, description: g.plain, url: `${origin}/glossary/${slug}`, inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Dr MoneyWise money words', url: `${origin}/glossary` } },
        { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: `What is ${g.term}?`, acceptedAnswer: { '@type': 'Answer', text: g.plain } }, { '@type': 'Question', name: `What is an example of ${g.term}?`, acceptedAnswer: { '@type': 'Answer', text: g.example } }] },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Money words', item: `${origin}/glossary` }, { '@type': 'ListItem', position: 2, name: g.term, item: `${origin}/glossary/${slug}` }] },
      ],
    },
  });
  const body = `
      <section class="block gloss-term">
        <p class="crumbs"><a href="/glossary">Money words</a> › ${esc(g.term)}</p>
        <h1 style="font-size:40px;margin:0 0 12px">What is ${esc(/^[A-Z0-9]{2,}|^\d/u.test(g.term) ? g.term : g.term.toLowerCase())}?</h1>
        <div class="gl-top">
          <div>
            <p class="gloss-plain">${esc(g.plain)}</p>
            <div class="surface gloss-example"><h2>Example</h2><p>${esc(g.example)}</p></div>
          </div>
          ${live}
        </div>
        ${lessons.length ? `<h2 class="lvp-h">Learn more about ${esc(g.term.toLowerCase())}</h2><div class="gl-links">${lessons.map((a) => `<a href="/learn/${esc(a.slug)}"><strong>${esc(a.headline)}</strong><span>${esc(a.readingTime || '5 min read')}</span></a>`).join('')}</div>` : ''}
        ${hubs.length || calcs.length ? `<div class="gl-chips">${hubs.map(([href, name, c]) => `<a href="${href}" style="--c:${c}">Guide: ${esc(name)}</a>`).join('')}${calcs.map(([s2, c]) => `<a href="/tools/${s2}" style="--c:#6250d6">Calculator: ${esc(c.title)}</a>`).join('')}</div>` : ''}
        ${related.length ? `<div class="gloss-related"><h2>Related words</h2><ul>${related.map((r) => `<li><a href="/glossary/${slugify(r.term)}">${esc(r.term)}</a></li>`).join('')}</ul></div>` : ''}
        <nav class="gloss-pager" aria-label="Other words">
          ${prev ? `<a href="/glossary/${slugify(prev.term)}">← ${esc(prev.term)}</a>` : '<span></span>'}
          <a href="/glossary">All words</a>
          ${next ? `<a href="/glossary/${slugify(next.term)}">${esc(next.term)} →</a>` : '<span></span>'}
        </nav>
        <p class="note-box">Start the free <a href="/learn/beginners">Young Guns course</a>, try our <a href="/tools">money calculators</a>, or browse all <a href="/guides">money guides</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

/* ── Sitemap entries ────────────────────────────────────────────────── */
export function toolsSitemapEntries(origin) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { loc: `${origin}/tools`, lastmod: today, priority: '0.7' },
    ...[...Object.keys(CALCULATORS), ...Object.keys(EXTRA_CALCS)].map((s) => ({ loc: `${origin}/tools/${s}`, lastmod: today, priority: '0.7' })),
    { loc: `${origin}/glossary`, lastmod: today, priority: '0.6' },
    ...GLOSSARY.map((g) => ({ loc: `${origin}/glossary/${slugify(g.term)}`, lastmod: today, priority: '0.4' })),
  ];
}
