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
    description: 'Simple calculators for savings growth, monthly investing, retirement and dividend income, with tax settings for the US, UK, India and the UAE.',
    canonical: `${origin}/tools`,
  });
  const photo = await getPhoto('page:tools', 'calculator notebook desk');
  const cards = Object.entries(CALCULATORS).map(([slug, c]) => `
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
        <p class="note-box">Want to track your own holdings? Use <a href="/#tools">My watchlist and portfolio</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'tools' });
}

/* ── /tools/<slug> ──────────────────────────────────────────────────── */
export async function renderCalculator(origin, slug) {
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

export async function renderGlossaryTerm(origin, slug) {
  const g = BY_SLUG.get(slug);
  if (!g) return null;
  const related = (g.related || []).map((name) => BY_TERM.get(name.toLowerCase())).filter(Boolean);
  const all = sortedTerms();
  const i = all.indexOf(g);
  const prev = all[i - 1];
  const next = all[i + 1];
  const head = buildHeadTags({
    title: `What is ${g.term}? Explained simply | Dr MoneyWise`,
    description: `${g.plain} Example: ${g.example}`.slice(0, 300),
    canonical: `${origin}/glossary/${slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: g.term,
      description: g.plain,
      url: `${origin}/glossary/${slug}`,
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Dr MoneyWise money words', url: `${origin}/glossary` },
    },
  });
  const body = `
      <section class="block gloss-term">
        <p class="crumbs"><a href="/glossary">Money words</a> › ${esc(g.term)}</p>
        <h1 style="font-size:40px;margin:0 0 12px">${esc(g.term)}</h1>
        <p class="gloss-plain">${esc(g.plain)}</p>
        <div class="surface gloss-example"><h2>Example</h2><p>${esc(g.example)}</p></div>
        ${related.length ? `<div class="gloss-related"><h2>Related words</h2><ul>${related.map((r) => `<li><a href="/glossary/${slugify(r.term)}">${esc(r.term)}</a></li>`).join('')}</ul></div>` : ''}
        <nav class="gloss-pager" aria-label="Other words">
          ${prev ? `<a href="/glossary/${slugify(prev.term)}">← ${esc(prev.term)}</a>` : '<span></span>'}
          <a href="/glossary">All words</a>
          ${next ? `<a href="/glossary/${slugify(next.term)}">${esc(next.term)} →</a>` : '<span></span>'}
        </nav>
        <p class="note-box">Try it out with our free <a href="/tools">money calculators</a>, or read our <a href="/learn">plain-English explainers</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

/* ── Sitemap entries ────────────────────────────────────────────────── */
export function toolsSitemapEntries(origin) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { loc: `${origin}/tools`, lastmod: today, priority: '0.7' },
    ...Object.keys(CALCULATORS).map((s) => ({ loc: `${origin}/tools/${s}`, lastmod: today, priority: '0.7' })),
    { loc: `${origin}/glossary`, lastmod: today, priority: '0.6' },
    ...GLOSSARY.map((g) => ({ loc: `${origin}/glossary/${slugify(g.term)}`, lastmod: today, priority: '0.4' })),
  ];
}
