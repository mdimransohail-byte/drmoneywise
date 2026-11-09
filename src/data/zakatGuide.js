/* ════════════════════════════════════════════════════════════════════════
   ZAKAT GUIDE shown under the zakat calculator (/tools/zakat):
   what zakat is, what it is due on, where scholars differ (matching the
   calculator's choices), and the sources. Each point is from the sources
   listed at the bottom (src/data/islamicSources.js).
   ════════════════════════════════════════════════════════════════════════ */

import { SOURCES, sourcesHtml } from './islamicSources.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* What zakat is due on: [item, colour, ruling] */
const ASSETS = [
  ['Cash and savings', '#1baf7a', 'Due on all of it, including bank accounts, cash at home, cash ISAs and money you have saved from salary or rent.'],
  ['Gold and silver', '#c9a227', 'Due on coins, bars and gold investments at their value on your zakat date. Jewellery you wear: scholars differ (below).'],
  ['Shares and funds to trade', '#e5566f', 'Bought to sell for a profit: due on the full market value.'],
  ['Long-term shares and funds', '#2a78d6', 'Due on your share of each company’s zakatable assets (cash, money owed to it, stock for sale). Methods differ (below).'],
  ['Pensions', '#6250d6', 'Pensions with a pot (personal, workplace, SIPPs): due on the zakatable part. Final salary and state pensions: not until paid to you.'],
  ['Cryptocurrency', '#0fa3b1', 'Treated like cash or trade goods: due on its value on your zakat date.'],
  ['Property to sell on', '#eb6834', 'Homes or land bought to resell count as trade goods: due on the market value.'],
  ['Rental property', '#8a5a2b', 'Most scholars: not due on the property’s value; the rent you save joins your cash. One view: 5–10% of net rental income (below).'],
  ['Your own home, car and belongings', '#a39c8a', 'Not due. Zakat is not taken from what you need to live.'],
  ['Business assets', '#0f8a76', 'Due on business cash, stock for sale (at its selling price) and money owed to the business. Not on buildings, machines or equipment.'],
  ['Money owed to you', '#4a5170', 'Due on “strong” debts you are highly likely to get back (the National Zakat Foundation’s rule). Ask a scholar about debts you may never receive.'],
];

/* Where scholars differ: [topic, views, what to choose in the calculator] */
const DIFFER = [
  ['Jewellery you wear', [
    ['Hanafi school', 'Zakat is due on all gold and silver, however it is used, including jewellery worn regularly.'],
    ['Maliki, Shafi’i and Hanbali schools', 'Jewellery worn regularly, in normal amounts, is personal use and exempt. Jewellery kept as savings or investment is still zakatable.'],
  ], 'Choose “Include it” or “Leave it out” under “Jewellery you wear”.'],
  ['Long-term shares', [
    ['Look-through method (Fiqh Academy, AAOIFI; relied on by leading Hanafi scholars today)', 'Pay 2.5% of your share of each company’s zakatable assets, worked out from its balance sheet.'],
    ['25% proxy (National Zakat Foundation, UK)', 'If the balance sheet is too hard to work through, count 25% of the market value, so zakat is 0.625% of the holding. The figure is reviewed each year.'],
    ['Dividends only (Fiqh Academy, Resolution 28)', 'A long-term investor who cannot work out the company’s zakatable assets may pay 2.5% on the dividends received.'],
    ['Full market value', 'The most cautious choice, used by some when nothing more reliable is available.'],
  ], 'Choose one under “How to count long-term shares”.'],
  ['Rental property', [
    ['Most scholars', 'No zakat on the value of a property you rent out. The rent you have saved by your zakat date is part of your cash.'],
    ['A minority view (Zakat Foundation of America, following Yusuf al-Qaradawi)', 'Zakat on net rental income, at 10%, or 5% where costs are hard to work out, once it reaches the nisab over a year.'],
  ], 'The calculator follows the majority: put saved rent in your cash. If you follow the minority view, add that amount separately.'],
  ['Pensions', [
    ['Pensions with a pot (personal, workplace, SIPPs)', 'Islamic Relief and Islamic Finance Guru: zakatable on the part held in zakatable assets. Islamic Relief says you may wait until you receive the money, then pay for each past year.'],
    ['Final salary and state pensions', 'Not zakatable until paid, because they are deferred salary.'],
  ], 'Enter only the zakatable part of pots you hold.'],
  ['Which nisab to use', [
    ['Gold (85 g, or 87.48 g by the National Zakat Foundation’s measure)', 'A higher threshold, so fewer people have to pay.'],
    ['Silver (595 g, or 612.36 g)', 'A lower threshold, so more people pay and more reaches those in need.'],
  ], 'Choose under “Nisab based on”.'],
  ['Children’s savings', [
    ['Hanafi school', 'Zakat is not due on the wealth of children until they reach maturity.'],
    ['Maliki, Shafi’i and Hanbali schools', 'Zakat is due on a child’s wealth, paid by their guardian.'],
  ], 'Leave children’s savings out, or work them out separately, depending on the view you follow.'],
];

export function zakatGuideHtml() {
  return `
        <section class="zk-guide">
          <h2>What zakat is</h2>
          <p>Zakat is one of the five pillars of Islam: each year, a Muslim whose wealth stays above a minimum amount (the nisab) for a full lunar year (the hawl) gives 2.5% of it to people in need, such as the poor, those in debt and travellers in difficulty. It is a duty on the wealth itself, not on income, and it is separate from voluntary charity (sadaqah) and from purification of investment income. Most people pick one zakat date each year, such as the start of Ramadan, and add up everything they own that day.</p>
          <p>The basic rules are agreed: 2.5% on cash, gold, silver and trade goods above the nisab, and nothing on your home, car or personal belongings. Scholars differ on some newer and some classical questions, such as jewellery you wear, long-term shares, pensions, rental property and which nisab to use. Below are the main views and how to set the calculator to match the one you follow. If you are unsure, ask a scholar you trust or a zakat organisation in your country.</p>

          <h2>What zakat is due on</h2>
          <div class="zk-grid">${ASSETS.map(([t, c, p]) => `<div class="zk-card" style="--c:${c}"><b>${esc(t)}</b><span>${esc(p)}</span></div>`).join('')}</div>

          <h2>Where scholars differ, and how to adjust</h2>
          ${DIFFER.map(([topic, views, adjust]) => `<details class="zk-diff"><summary>${esc(topic)}</summary>
            <ul>${views.map(([who, view]) => `<li><b>${esc(who)}:</b> ${esc(view)}</li>`).join('')}</ul>
            <p class="zk-adjust">In the calculator: ${esc(adjust)}</p></details>`).join('')}

          <h2>Things to remember</h2>
          <ul class="zk-list">
            <li>Deduct only debts due in the next 12 months, not the whole of a mortgage or student loan, and never interest.</li>
            <li>Interest you received is not yours to count: give it to charity, without counting it as zakat.</li>
            <li>Value everything in one currency, on the same day, at market prices; gold and silver at the price you could sell for.</li>
          </ul>
          ${sourcesHtml([SOURCES.nzfGuide, SOURCES.nzfProxy, SOURCES.iifaShares, SOURCES.seekersShares, SOURCES.musaffaGold, SOURCES.zfaRental, SOURCES.irPensions, SOURCES.ifgPensions, SOURCES.worldBank])}
          <p class="calc-hint">This guide summarises published rulings for learning; it is not a fatwa. See also our <a href="/shariah/islamic-finance">Islamic finance guide</a> and <a href="/shariah/method">how we screen shares</a>.</p>
        </section>`;
}
