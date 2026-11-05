/* ════════════════════════════════════════════════════════════════════════
   /shariah/islamic-finance — Islamic finance from the basics to advanced,
   with the main rulings of scholars and scholarly councils, each one with
   its source. Free to read. Every ruling below was checked against the
   council's own published text or a reliable report (November 2026).
   To change wording, edit the lists below and upload this one file.
   ════════════════════════════════════════════════════════════════════════ */

import { buildHeadTags, pageShell } from './seoService.js';
import { esc } from './chartsSvg.js';

const IIFA = 'International Islamic Fiqh Academy (OIC)';

/* ── Level 1: the basics ─────────────────────────────────────────── */
const PRINCIPLES = [
  { icon: '✕%', c: '#e34948', t: 'No riba (interest)', p: 'Money may not earn money just by being lent. A loan must be repaid at the amount lent, with no agreed extra. The Qur’an says: “Allah has permitted trade and forbidden riba” (2:275).' },
  { icon: '?', c: '#eb6834', t: 'No gharar (excessive uncertainty)', p: 'Both sides must know clearly what is being sold, its price and when it will be delivered. The Prophet ﷺ forbade sales based on gharar (Sahih Muslim). Small, unavoidable uncertainty is accepted.' },
  { icon: '🎲', c: '#6250d6', t: 'No maysir (gambling)', p: 'Deals where one side wins only because the other loses by chance, such as betting, are not allowed (Qur’an 5:90). This is why most scholars reject conventional insurance and pure speculation.' },
  { icon: '✓', c: '#1baf7a', t: 'Only halal business', p: 'Money may not be used for, or earned from, forbidden activities such as alcohol, pork, gambling, interest-based lending or adult entertainment.' },
  { icon: '⚖', c: '#2a78d6', t: 'Real assets and shared risk', p: 'Profit should come from real trade, property or business, and the person who earns a profit should also carry some of the risk of loss. “Profit goes with liability” (al-kharaj bi’l-daman) is a well-known rule of Islamic law.' },
];

const WORDS = [
  ['Riba', 'Any agreed extra on a loan, or unequal swaps of the same kind of money or staple goods.'],
  ['Riba al-nasi’ah', 'The extra charged for delay, as in a loan with interest. All schools agree it is forbidden.'],
  ['Riba al-fadl', 'An unequal hand-to-hand swap of the same kind of goods, for example 10 g of gold for 11 g.'],
  ['Gharar', 'Too much uncertainty or missing information in a contract.'],
  ['Maysir / qimar', 'Gambling: gaining purely by chance at another’s expense.'],
  ['Halal / haram', 'Permitted / forbidden.'],
  ['Shariah board', 'A panel of scholars that checks a bank’s or fund’s products against Islamic law.'],
  ['Fatwa', 'A scholar’s or council’s answer on a point of Islamic law.'],
  ['Zakat', 'The yearly 2.5% charity on wealth held for a full lunar year above a minimum (nisab).'],
  ['Purification', 'Giving to charity the small part of an investment’s income that came from non-permitted sources.'],
  ['Sukuk', 'Islamic certificates, often called “Islamic bonds”, that give part-ownership of real assets.'],
  ['Takaful', 'Islamic insurance based on members helping each other from a shared fund.'],
];

/* ── Level 2: the main contracts ─────────────────────────────────── */
const CONTRACTS = [
  { n: 'Murabaha', a: 'Cost-plus sale', c: '#2a78d6', how: 'The bank buys the item you want (a car, stock for your shop) and sells it to you at an agreed, disclosed mark-up, paid in instalments. The price is fixed once agreed and does not grow if you pay late.', use: 'Car and home finance, trade finance, the most-used contract in Islamic banks.' },
  { n: 'Ijara', a: 'Leasing', c: '#1baf7a', how: 'The bank owns an asset and rents it to you. In ijara muntahia bittamleek, ownership passes to you at the end. The owner carries the risks of ownership, such as major repairs.', use: 'Home finance, cars, equipment, and many sukuk.' },
  { n: 'Musharaka', a: 'Partnership', c: '#eb6834', how: 'Partners put in money and share profits in an agreed ratio, while losses are shared in proportion to the money each put in.', use: 'Business finance, joint ventures, project finance.' },
  { n: 'Diminishing musharaka', a: 'Step-by-step partnership', c: '#eda100', how: 'You and the bank buy a home together. You pay rent on the bank’s share and buy its share bit by bit, until you own it all.', use: 'One of the most popular forms of Islamic home finance in the UK, US and Gulf.' },
  { n: 'Mudaraba', a: 'Investment partnership', c: '#6250d6', how: 'One side provides the money, the other the skill and work. Profits are shared in an agreed ratio; money losses fall on the investor unless the manager was negligent.', use: 'Islamic savings and investment accounts, investment funds.' },
  { n: 'Salam', a: 'Paid-in-advance sale', c: '#0fa3b1', how: 'The buyer pays the full price today for goods with an exact description, delivered on a fixed later date.', use: 'Farming and commodity finance.' },
  { n: 'Istisna’', a: 'Made-to-order', c: '#e5566f', how: 'A buyer orders something to be built or made (a building, a ship) and the price can be paid in stages as work progresses.', use: 'Construction and infrastructure finance.' },
  { n: 'Wakala', a: 'Agency', c: '#8a5a2b', how: 'One side acts as agent for another for a known fee, for example to invest money or run a takaful fund.', use: 'Investment accounts, takaful, sukuk.' },
  { n: 'Qard hasan', a: 'Good loan', c: '#1a2a9e', how: 'A loan with no extra charged at all, given to help. Only actual costs may be recovered.', use: 'Current accounts in Islamic banks, charity and student loans.' },
];

/* ── Level 3: investing ─────────────────────────────────────────── */
const INVESTING = [
  { t: 'Shares (stocks)', c: '#1baf7a', p: [
    'Owning shares is owning part of a real business, so most scholars allow it when the company’s main business is halal.',
    `Most scholars also allow companies that have some interest-bearing debt or income, within limits. The best-known limits are AAOIFI’s (Shariah Standard No. 21, 2004): interest-based borrowing and interest-bearing deposits each no more than 30% of the company’s market value, and non-permitted income no more than 5% of its total income, with that share of dividends given to charity.`,
    'A minority of scholars hold that any share in a company that deals in interest is not allowed, which is also the starting point of the Fiqh Academy’s 1992 resolution (see the rulings below).',
  ] },
  { t: 'Funds and ETFs', c: '#2a78d6', p: ['A Shariah fund screens every company for you and is overseen by its own Shariah board. See our list of Shariah funds and ETFs.'] },
  { t: 'Sukuk', c: '#eda100', p: ['Sukuk holders own a share of real assets (buildings, aircraft, projects) and receive income from them, such as rent. AAOIFI’s Shariah board said in 2008 that tradable sukuk must represent real ownership, not just a right to repayment (see the rulings below).'] },
  { t: 'Gold and silver', c: '#c9a227', p: ['Gold and silver are “ribawi” items: swapped for money, they must be exchanged on the spot. AAOIFI’s Shariah Standard No. 57 (2016, written with the World Gold Council) says investing in gold is permissible when the rules on taking possession and on zakat are met.'] },
  { t: 'Things most scholars avoid', c: '#e34948', p: ['Conventional bonds and savings accounts that pay interest, short selling (selling what you don’t own), buying shares with borrowed money at interest (margin), and most options and futures, because of interest, uncertainty or selling what you don’t own.'] },
  { t: 'Crypto-currencies', c: '#6250d6', p: ['Scholars are divided. Some see well-established coins as permissible property; others see them as too uncertain or too often used for speculation. Ask a qualified scholar and treat crypto as high risk in any case.'] },
];

/* ── Level 4: advanced topics and debates ───────────────────────── */
const ADVANCED = [
  { t: 'Form versus substance', p: 'A long-running debate: some Islamic products follow the right contracts on paper but end up with the same cash flows as an interest-based loan. Critics, including leading scholars such as Mufti Muhammad Taqi Usmani, argue that Islamic finance should move towards true profit-and-loss sharing (musharaka, mudaraba). Others reply that sale- and lease-based products are valid and fill real needs.' },
  { t: 'Tawarruq (commodity “monetisation”)', p: 'In tawarruq a person buys a commodity on credit and sells it to someone else for cash, to raise money. The classical form is accepted by most scholars, though Ibn Taymiyyah and his student Ibn al-Qayyim disliked it. In 2009 the Fiqh Academy ruled that the bank-arranged (“organised”) form is not permitted, because the deal is a planned route to cash today for more cash later. It is still widely used, and debated.' },
  { t: 'The sukuk debate', p: 'In November 2007, Mufti Taqi Usmani, then chairman of AAOIFI’s Shariah board, said that about 85% of sukuk did not comply, mainly because issuers promised to buy the assets back at their original value, which guarantees investors their money like a bond. AAOIFI’s Shariah board met in February 2008 and set out recommendations, including that tradable sukuk must give real ownership of assets and that managers may not promise to buy them back at face value.' },
  { t: 'Mortgages for Muslims living in the West', p: 'Most scholars hold that a conventional mortgage is interest and not allowed. The European Council for Fatwa and Research, chaired by Yusuf al-Qaradawi, ruled in 1999 that Muslims in Europe without an Islamic alternative may take one for a first family home, out of need. Many scholars disagree, and Islamic home finance is now widely available in the UK, US and elsewhere, so check the options first.' },
  { t: 'Shariah governance', p: 'Islamic banks and funds have Shariah boards, and many countries now have a central Shariah authority. AAOIFI (Bahrain) writes Shariah and accounting standards used across the world, and the Islamic Financial Services Board (Malaysia) writes rules for regulators. Different boards can reach different answers on the same product.' },
  { t: 'Purification and zakat on investments', p: 'Purification removes the non-permitted part of income; zakat is a separate yearly duty on the wealth itself. The Fiqh Academy ruled that long-term investors who cannot work out the company’s own zakatable assets pay 2.5% on the dividends they received, while traders pay 2.5% on the market value of their shares (see the rulings below).' },
];

/* ── Rulings of scholars and councils (each checked against its source) ── */
const RULINGS = [
  { y: '1985', who: IIFA, where: 'Resolution 10 (10/2), Jeddah', c: '#e34948', t: 'Bank interest is riba', p: 'Any extra charged on a loan, whether agreed at the start or for extending the repayment date, is forbidden riba. The Academy urged Muslim governments to support banks that follow Islamic principles.', src: ['IIFA resolution text', 'https://iifa-aifi.org/en/32234.html'] },
  { y: '1985', who: IIFA, where: 'Resolution 9 (9/2), Jeddah', c: '#6250d6', t: 'Insurance', p: 'Conventional (commercial) insurance with a fixed premium contains major uncertainty (gharar) and is not permitted. Co-operative insurance, based on giving and mutual help (takaful), is the permitted alternative.', src: ['IIFA resolution text', 'https://iifa-aifi.org/en/32229.html'] },
  { y: '1988', who: IIFA, where: 'Resolution 28 (3/4), Jeddah', c: '#1baf7a', t: 'Zakat on company shares', p: 'Zakat on shares is due from the shareholders. If the company does not pay it for them, a long-term investor who cannot work out the exact amount pays 2.5% of the dividends received; someone who holds shares to trade pays 2.5% of their market value. Confirmed in 2001 (Resolution 121 (3/13), Kuwait).', src: ['IIFA resolution text', 'https://iifa-aifi.org/en/32294.html'] },
  { y: '1989', who: 'Sheikh Muhammad Sayyid Tantawi', where: 'Grand Mufti of Egypt, later Grand Imam of Al-Azhar', c: '#8a5a2b', t: 'A minority view on bank interest', p: 'He ruled that some fixed returns, such as on savings accounts and government bonds, are permissible profit rather than riba. Al-Azhar’s Islamic Research Academy issued a similar decision in 2002. Most scholars rejected this view, among them Yusuf al-Qaradawi and Mufti Taqi Usmani.', src: ['Background', 'https://en.wikipedia.org/wiki/Muhammad_Sayyid_Tantawi'] },
  { y: '1992', who: IIFA, where: 'Resolution 63 (1/7), Jeddah', c: '#2a78d6', t: 'Shares and stock markets', p: 'Companies with lawful aims and activities may be set up and their shares traded. Owning shares in companies whose main business is forbidden is not allowed. Shares in companies with a lawful business that sometimes deal in interest are, in principle, also forbidden.', src: ['Summary of the resolution', 'https://fiqh.islamonline.net/en/stock-markets-and-their-applications/'] },
  { y: '1999', who: 'European Council for Fatwa and Research', where: '4th session, October 1999, chaired by Yusuf al-Qaradawi', c: '#eda100', t: 'First home for Muslims in Europe', p: 'Where no Islamic home finance is available, a Muslim may take a conventional mortgage for a family home, out of need, if it is for their own household, they own no other home, and they have no other way to buy one. In a separate ruling, the Council allowed Muslims in the West to hold shares in companies with a halal main business, within set limits on debt and interest income.', src: ['Summary of the fatwa', 'https://fiqh.islamonline.net/en/purchasing-houses-with-usurious-loans-in-the-west/'] },
  { y: '1999', who: 'Supreme Court of Pakistan (Shariat Appellate Bench)', where: '23 December 1999', c: '#0fa3b1', t: 'Interest declared riba', p: 'Upheld that all interest, including bank interest, is riba and ordered laws allowing it to be changed. The case was sent back for review in 2002.', src: ['Background', 'https://en.wikipedia.org/wiki/Federal_Shariah_Court_verdict_on_interest_system_in_Pakistan'] },
  { y: '2004', who: 'AAOIFI', where: 'Shariah Standard No. 21, Financial Papers', c: '#1baf7a', t: 'The limits for shares', p: 'Shares in companies with a permitted main business are allowed if interest-based borrowing and interest-bearing deposits are each under 30% of market value and non-permitted income is under 5% of total income, using the latest accounts. The shareholder must give away their share of non-permitted income.', src: ['Standard text (PSE copy)', 'https://documents.pse.com.ph/wp-content/uploads/sites/15/2021/04/AAOIFI-Sharia-Standard-No-21-Financial-Paper-1.pdf'] },
  { y: '2007–08', who: 'Mufti Muhammad Taqi Usmani and AAOIFI', where: 'Statement (Nov 2007); Shariah board meeting, Bahrain (Feb 2008)', c: '#eb6834', t: 'Sukuk must give real ownership', p: 'Usmani said about 85% of sukuk did not comply because of promises to repay at face value. AAOIFI’s board then said tradable sukuk must give holders real ownership of assets, and managers may not promise to buy the assets back at face value.', src: ['Arab News report', 'https://www.arabnews.com/node/311174'] },
  { y: '2009', who: IIFA, where: 'Resolution 179 (5/19), Sharjah', c: '#e5566f', t: 'Organised tawarruq', p: 'Classical tawarruq is permitted when its sale conditions are met. Bank-arranged (organised) and reverse tawarruq are not permitted, because they are a planned route to cash now for more cash later.', src: ['IIFA resolution text', 'https://iifa-aifi.org/en/32987.html'] },
  { y: '2016', who: 'AAOIFI with the World Gold Council', where: 'Shariah Standard No. 57, Gold', c: '#c9a227', t: 'Investing in gold', p: 'Investment in gold is permissible provided the Shariah rules are met, including those on taking possession and on zakat. The standard opened the way for Shariah-compliant gold products.', src: ['World Gold Council', 'https://www.gold.org/news-and-events/press-releases/launch-aaoifi-shariah-standard-gold-developed-collaboration-world'] },
  { y: '2022–24', who: 'Federal Shariat Court of Pakistan; Parliament of Pakistan', where: '28 April 2022 ruling; 26th Constitutional Amendment, October 2024', c: '#1a2a9e', t: 'An interest-free banking system', p: 'The Court ruled that interest-based banking is against Shariah and asked for an interest-free system by 2027. In 2024 Pakistan’s constitution was changed to aim to end riba “as far as practicable” by 1 January 2028.', src: ['Dawn report', 'https://www.dawn.com/news/1687237'] },
];

/* ── Classical scholars on riba al-fadl ─────────────────────────── */
const SCHOOLS = [
  ['Hanafi (Imam Abu Hanifa)', 'Goods sold by weight or by volume, of the same kind.'],
  ['Maliki (Imam Malik)', 'Gold, silver and money; and staple foods that can be stored.'],
  ['Shafi’i (Imam al-Shafi’i)', 'Gold, silver and money; and all foods.'],
  ['Hanbali (Imam Ahmad)', 'The best-known view: like the Hanafis, goods sold by weight or volume.'],
];

const FAQ = [
  ['Is Islamic finance only for Muslims?', 'No. Anyone can use Islamic banks, funds, home finance or sukuk. Non-Muslims also use them, and Shariah funds appeal to people who want to avoid heavily indebted companies.'],
  ['Isn’t a murabaha mark-up just interest by another name?', 'Scholars who accept murabaha point out the differences: the bank must really own the item first and carry its risk, the price is fixed and cannot grow if you pay late, and the deal is a sale, not a loan. Critics say that in practice it often works much like a loan. Both views appear in the advanced section above.'],
  ['Can I keep money in a normal bank account?', 'Many scholars allow a current account that pays no interest when there is no Islamic alternative. Interest received should be given to charity, without counting it as your own charity.'],
  ['Who should I ask about my own situation?', 'A qualified scholar you trust, or an Islamic bank or fund with its own Shariah board. Rulings can depend on the details of your situation and the country you live in.'],
];

export function islamicFinanceSitemapEntry(origin, today) {
  return { loc: `${origin}/shariah/islamic-finance`, lastmod: today, priority: '0.7' };
}

export function renderIslamicFinance(origin) {
  const head = buildHeadTags({
    title: 'Islamic finance explained: from the basics to advanced, with scholars’ rulings | Dr MoneyWise',
    description: 'Islamic finance in simple terms: riba, gharar and maysir, murabaha, ijara, musharaka and sukuk, halal investing and zakat on shares, and the key rulings of the Fiqh Academy, AAOIFI and leading scholars, with sources.',
    canonical: `${origin}/shariah/islamic-finance`,
  });
  const levels = [['basics', 'Basics', '#1baf7a'], ['contracts', 'Contracts', '#2a78d6'], ['investing', 'Investing', '#eda100'], ['advanced', 'Advanced', '#6250d6'], ['rulings', 'Scholars’ rulings', '#e34948']];
  const body = `
      <section class="block sh-page ifp">
        <p class="nl-back"><a href="/shariah">← Shariah-compliant investing</a></p>
        <div class="sh-hero"><div><span class="pf-badge free">Free guide</span><h1>Islamic finance, from the basics to advanced</h1>
          <p>What makes finance “Islamic”, how Islamic banks, home finance, insurance and sukuk work, how to invest in a halal way, and what leading scholars and councils have ruled, each with its source.</p></div>
          <div class="sh-mark" aria-hidden="true">☪</div></div>
        <nav class="ifp-jump" aria-label="Levels">${levels.map(([id, label, c], i) => `<a href="#${id}" style="--c:${c}"><b>${i + 1}</b>${esc(label)}</a>`).join('')}</nav>

        <h2 id="basics"><span class="ifp-lvl" style="--c:#1baf7a">Level 1</span> The basics: five principles</h2>
        <p class="pf-sub">Islamic finance is ordinary finance with a few firm rules, all aimed at fairness and at tying money to real economic activity.</p>
        <div class="ifp-principles">${PRINCIPLES.map((x) => `<div style="--c:${x.c}"><i aria-hidden="true">${esc(x.icon)}</i><h3>${esc(x.t)}</h3><p>${esc(x.p)}</p></div>`).join('')}</div>
        <div class="pf-panel"><h3>Interest versus profit, simply</h3>
          <div class="ifp-vs"><div class="bad"><b>Interest loan</b><span>Lend $10,000, get back $11,000 whatever happens. The lender takes no business risk.</span></div>
          <div class="good"><b>Islamic partnership</b><span>Invest $10,000 in a business and share its actual profit, or its loss. Reward comes with risk.</span></div></div></div>
        <div class="pf-panel"><h3>Words to know</h3><dl class="ifp-words">${WORDS.map(([w, m]) => `<div><dt>${esc(w)}</dt><dd>${esc(m)}</dd></div>`).join('')}</dl></div>

        <h2 id="contracts"><span class="ifp-lvl" style="--c:#2a78d6">Level 2</span> The main contracts</h2>
        <p class="pf-sub">Islamic banks use a small set of contracts known from classical Islamic law. Each one is a sale, a lease, a partnership or a service, never a loan for profit.</p>
        <div class="ifp-contracts">${CONTRACTS.map((x) => `<div style="--c:${x.c}"><h3>${esc(x.n)} <small>${esc(x.a)}</small></h3><p>${esc(x.how)}</p><p class="ifp-use"><b>Used for:</b> ${esc(x.use)}</p></div>`).join('')}</div>
        <div class="ifp-two">
          <div class="pf-panel"><h3>Islamic home finance</h3><p>Usually <b>diminishing musharaka</b> (you buy the bank’s share bit by bit and pay rent on the rest), <b>ijara</b> (lease ending in ownership) or <b>murabaha</b> (the bank buys and resells at a fixed mark-up). Monthly costs are often close to a conventional mortgage, because banks price against market rates, but the contract is different.</p></div>
          <div class="pf-panel"><h3>Takaful (Islamic insurance)</h3><p>Members pay into a shared fund as a donation (tabarru’) to help whichever member suffers a loss. A takaful company runs the fund for a fee (wakala) or a profit share (mudaraba), and any surplus may be shared with members.</p></div>
        </div>

        <h2 id="investing"><span class="ifp-lvl" style="--c:#eda100">Level 3</span> Investing the halal way</h2>
        <div class="ifp-invest">${INVESTING.map((x) => `<div style="--c:${x.c}"><h3>${esc(x.t)}</h3>${x.p.map((t) => `<p>${esc(t)}</p>`).join('')}</div>`).join('')}</div>
        <div class="pf-panel ifp-example"><h3>Worked example: purification</h3><p>You receive <b>$200</b> of dividends from a company that earns <b>3%</b> of its income from interest. You give <b>3% × $200 = $6</b> to charity. Pro members see an estimate for each company on our Shariah market pages.</p></div>
        <p class="ifp-links"><a class="pf-btn gold" href="/shariah">Which companies pass each standard</a> <a class="pf-btn" href="/shariah/funds">Shariah funds and ETFs</a></p>

        <h2 id="advanced"><span class="ifp-lvl" style="--c:#6250d6">Level 4</span> Advanced topics and debates</h2>
        <div class="ifp-adv">${ADVANCED.map((x) => `<details><summary>${esc(x.t)}</summary><p>${esc(x.p)}</p></details>`).join('')}</div>
        <div class="pf-panel"><h3>The classical schools on riba al-fadl</h3><p class="pf-sub">All four Sunni schools agree that interest on loans is forbidden. They differ on which goods must be swapped equally and on the spot, based on the hadith of the six items (gold, silver, wheat, barley, dates and salt), recorded in Sahih Muslim.</p>
          <div class="ifp-schools">${SCHOOLS.map(([s, v]) => `<div><b>${esc(s)}</b><span>${esc(v)}</span></div>`).join('')}</div></div>

        <h2 id="rulings"><span class="ifp-lvl" style="--c:#e34948">Rulings</span> What scholars and councils have ruled</h2>
        <p class="pf-sub">The main decisions of the International Islamic Fiqh Academy (the scholarly body of the Organisation of Islamic Cooperation), AAOIFI, national courts and leading scholars, in date order. Each links to its source.</p>
        <ol class="ifp-timeline">${RULINGS.map((r) => `<li style="--c:${r.c}"><span class="ifp-year">${esc(r.y)}</span><div><h3>${esc(r.t)}</h3><p class="ifp-who"><b>${esc(r.who)}</b> · ${esc(r.where)}</p><p>${esc(r.p)}</p><a href="${esc(r.src[1])}" target="_blank" rel="noopener">${esc(r.src[0])} ↗</a></div></li>`).join('')}</ol>

        <h2>Common questions</h2>
        <div class="ifp-adv">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>

        <p class="note-box">This guide explains Islamic finance and summarises published rulings for learning. It is not a fatwa or a religious ruling, and scholars differ on many points. For your own situation, ask a qualified scholar or use a bank or fund with its own Shariah board. Nothing here is financial advice; read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}
