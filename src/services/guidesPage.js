/* /guides — every topic guide on one page (menu item "Guides"). */

import { HUBS, HUB_ORDER, CLUSTERS } from '../data/topicHubs.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

const MORE = [
  ['/commodities', 'Commodities', '⛏', '#b8891a', 'Gold, oil, copper and more: prices, how commodity trading works and the companies behind them.'],
  ['/health-check', 'Financial Health Check', '❤', '#e5566f', 'Every company we cover scored out of 100, with stars and a simple rating.'],
  ['/shariah', 'Shariah screening', '☪', '#0f8a76', 'The five main Shariah standards side by side, with companies, funds and ETFs.'],
  ['/learn', 'Learn, week by week', '✦', '#1baf7a', 'Beginner, intermediate, chart-reading and advanced courses, from the basics up.'],
  ['/tools', 'Calculators', '▦', '#6250d6', 'Savings, retirement, debt, education, life cover, currencies and more.'],
];

export async function renderGuidesIndex(origin) {
  const head = buildHeadTags({
    title: 'Money guides: personal finance, investing, retirement, property and more | Dr MoneyWise',
    description: 'Free simple money guides in ten topics: personal finance, investing basics, company research, portfolios, retirement, income investing, global investing, property, Islamic finance and economic indicators.',
    canonical: `${origin}/guides`,
  });
  const card = ([href, name, icon, colour, text], n) => `<a class="gd-card" href="${href}" style="--c:${colour}"><span class="gd-ico" aria-hidden="true">${icon}</span>${n ? `<b class="gd-num">${n}</b>` : ''}<strong>${esc(name)}</strong><span>${esc(text)}</span><em>Open the guide →</em></a>`;
  const clusters = CLUSTERS.map((c) => (c.length === 1 ? [`/${c[0]}`, HUBS[c[0]].name, HUBS[c[0]].icon, HUBS[c[0]].colour, HUBS[c[0]].intro] : c));
  const inClusters = new Set(CLUSTERS.filter((c) => c.length === 1).map((c) => c[0]));
  const more = [
    ...HUB_ORDER.filter((s) => !inClusters.has(s)).map((s) => [`/${s}`, HUBS[s].name, HUBS[s].icon, HUBS[s].colour, HUBS[s].intro]),
    ...MORE,
  ];
  const body = `
      <section class="block">
        <div class="gd-hero"><h1>Money guides</h1><p>Ten topics, from your everyday money to reading the economy. Each guide brings together the big ideas in simple terms, lessons from our courses, calculators, the companies involved and answers to common questions.</p></div>
        <h2 class="lvp-h">The ten topics</h2>
        <div class="gd-grid">${clusters.map((c, i) => card(c, i + 1)).join('')}</div>
        <h2 class="lvp-h">More guides and tools</h2>
        <div class="gd-grid">${more.map((c) => card(c)).join('')}</div>
      </section>`;
  return pageShell({ head, body, active: 'guides' });
}
