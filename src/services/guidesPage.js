/* /guides — every topic guide on one page (menu item "Guides"). */

import { HUBS, HUB_ORDER } from '../data/topicHubs.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

const MORE = [
  ['/commodities', 'Commodities', '⛏', '#b8891a', 'Gold, oil, copper and more: prices, how commodity trading works and the companies behind them.'],
  ['/health-check', 'Financial Health Check', '❤', '#e5566f', 'Every company we cover scored out of 100, with stars and a simple rating.'],
  ['/shariah', 'Shariah-compliant investing', '☪', '#0f8a76', 'The five main Shariah standards side by side, with companies, funds and ETFs.'],
  ['/property', 'Property', '⌂', '#2a78d6', 'Home prices and rents around the world, from official figures.'],
  ['/learn', 'Learn, week by week', '✦', '#1baf7a', 'Courses for Young Guns, Knights and Lords, from the basics up.'],
  ['/tools', 'Calculators', '▦', '#6250d6', 'Savings, retirement, debt, education, life cover, currencies and more.'],
];

export async function renderGuidesIndex(origin) {
  const head = buildHeadTags({
    title: 'Money guides: budgeting, retirement, insurance, currencies and more | Dr MoneyWise',
    description: 'Free plain-English money guides: budgeting and debt, retirement planning, saving for a child’s education, insurance, currencies and commodities, each with lessons, calculators and companies.',
    canonical: `${origin}/guides`,
  });
  const cards = [
    ...HUB_ORDER.map((s) => [`/${s}`, HUBS[s].name, HUBS[s].icon, HUBS[s].colour, HUBS[s].intro]),
    ...MORE,
  ].map(([href, name, icon, colour, text]) => `<a class="gd-card" href="${href}" style="--c:${colour}"><span class="gd-ico" aria-hidden="true">${icon}</span><strong>${esc(name)}</strong><span>${esc(text)}</span><em>Open the guide →</em></a>`).join('');
  const body = `
      <section class="block">
        <div class="gd-hero"><h1>Money guides</h1><p>Everything on one topic in one place: the big ideas in plain English, lessons from our courses, calculators, the companies involved and answers to common questions.</p></div>
        <div class="gd-grid">${cards}</div>
      </section>`;
  return pageShell({ head, body, active: 'guides' });
}
