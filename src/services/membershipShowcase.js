/* ════════════════════════════════════════════════════════════════════════
   MEMBERSHIP SHOWCASE — every paid feature with: a short explanation, a
   sample of what it shows, an example of the benefit, what Free members get
   versus members, and buttons to try it or join. Shown on /membership.
   Samples are clearly labelled as samples (illustrative layouts, not live
   figures). To change a feature, edit FEATURES below.
   ════════════════════════════════════════════════════════════════════════ */

const esc = (s) => String(s ?? '').replace(/[&<>"]/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const bar = (label, pct, colour, value) => `<div class="sx-bar"><span>${label}</span><i><b style="width:${pct}%;background:${colour}"></b></i><em>${value}</em></div>`;
const chip = (t, c) => `<span class="sx-chip" style="--c:${c}">${t}</span>`;

const FEATURES = [
  {
    tier: 'regular', title: 'Stock screener', href: '/screener',
    what: 'Filter about 125 large companies by growth, profit, debt, spare cash and dividends, and sort by any column.',
    sample: `<table class="sx-table"><tr><th>Company</th><th>Sales growth</th><th>Margin</th><th>Debt</th></tr><tr><td>Company A</td><td class="g">+14%</td><td>28%</td><td class="g">1.1 yrs</td></tr><tr><td>Company B</td><td class="g">+9%</td><td>19%</td><td>2.4 yrs</td></tr><tr><td>Company C</td><td>+3%</td><td>11%</td><td class="r">7.8 yrs</td></tr></table>`,
    benefit: 'Looking for steady dividend payers with little debt? Two filters give you the shortlist in seconds instead of an evening of reading accounts.',
    free: 'Free: browse companies one at a time.', paid: 'Regular and Premium: filter, sort and save your screens.',
  },
  {
    tier: 'regular', title: 'The deeper look on every company', href: '/stock/KO',
    what: '10 years of results, “what if” scenarios for sales, profit, dividends and share price, and simple warnings.',
    sample: `<div class="sx-mini"><b>If profit keeps its past pace</b>${bar('In 1 year', 40, '#1baf7a', '$11.2bn')}${bar('In 3 years', 62, '#1baf7a', '$12.4bn')}${bar('In 5 years', 85, '#1baf7a', '$13.8bn')}</div>`,
    benefit: 'See how a company’s dividend would look in five years if it keeps growing, slows down or stalls, before you decide it is right for your income plan.',
    free: 'Free: the report card and latest figures.', paid: 'Members: 10-year history, scenarios and warnings.',
  },
  {
    tier: 'regular', title: 'Dividend and results alerts', href: '/membership',
    what: 'An email when a company on your watchlist announces a dividend change or new results, explained in a sentence.',
    sample: `<div class="sx-mail"><b>✉ Your company paid more</b><span>Company A raised its dividend by 6%, to $0.53 a share. That is its 15th raise in a row.</span></div>`,
    benefit: 'You hold five dividend shares. Instead of checking each company’s announcements, the news comes to you, explained.',
    free: 'Free: the Saturday newsletter.', paid: 'Members: alerts on your own companies.',
  },
  {
    tier: 'regular', title: 'Full Chart check', href: '/technical',
    what: 'What any share’s price chart shows: trend, RSI, MACD, moving averages, support and resistance, in simple words.',
    sample: `<div class="sx-mini">${chip('Trend: rising', '#1baf7a')}${chip('RSI 64: strong, not overbought', '#2a78d6')}${chip('Above its 200-day average', '#1baf7a')}${chip('Next support near $142', '#eb6834')}</div>`,
    benefit: 'Thinking of buying after a big rise? Chart check shows whether the share is stretched far above its usual range.',
    free: 'Free: 3 headline signals.', paid: 'Members: every signal, with what each one means.',
  },
  {
    tier: 'regular', title: 'Ask Dr MoneyWise', href: '/ask',
    what: 'Send a money question and get a clear, personal answer from our team within a few days.',
    sample: `<div class="sx-mail"><b>Q: Should my emergency fund be in savings or bonds?</b><span>A: Keep 3–6 months of spending where you can reach it in a day, such as an easy-access savings account…</span></div>`,
    benefit: 'A real answer to your own situation, written simply, instead of searching through forums.',
    free: 'Free: read the guides.', paid: 'Members: ask your own questions.',
  },
  {
    tier: 'premium', title: 'Advanced lessons and PDF workbooks', href: '/learn/advanced',
    what: '17 weeks of deeper lessons, including the Premium Intensive: reading accounts, red flags, valuation, portfolio rules and sector deep dives. Each lesson and week comes as a printable PDF.',
    sample: `<div class="sx-mini"><b>Week 11 · Valuing a company</b>${bar('Lesson 1: what a share is worth', 100, '#6250d6', '✓')}${bar('Lesson 2: discounted cash flow', 60, '#6250d6', '12 min')}${bar('Week workbook (PDF)', 30, '#c9a227', '⬇')}</div>`,
    benefit: 'Learn to value a company the way professionals do, step by step, with a worked example and a workbook to print.',
    free: 'Free: the Beginners and Intermediate courses.', paid: 'Premium: the full Advanced course and every PDF.',
  },
  {
    tier: 'premium', title: 'Portfolio health check', href: '/portfolio-health',
    what: 'A health score for every company you own and for your whole portfolio, a heat map of your mix, and warnings if one company or sector is too big.',
    sample: `<div class="sx-mini"><b>Your portfolio: 74/100</b>${bar('Company A', 88, '#1baf7a', '88')}${bar('Company B', 71, '#eda100', '71')}${bar('Company C', 39, '#e34948', '39')}<span class="sx-warn">⚠ 46% of your money is in one sector</span></div>`,
    benefit: 'Find out that one holding has weak cash and heavy debt, or that half your money sits in one industry, before a bad year does it for you.',
    free: 'Free: a simple portfolio list.', paid: 'Premium: scores, heat map and warnings.',
  },
  {
    tier: 'premium', title: 'What the big funds and bosses are doing', href: '/insiders',
    what: 'What about 20 of the world’s largest funds own and changed each quarter, and when company directors buy or sell their own shares.',
    sample: `<div class="sx-mini">${bar('Funds buying', 70, '#1baf7a', '9')}${bar('Funds selling', 25, '#e34948', '3')}<span class="sx-note">Director bought $2.1m of shares on 4 Nov</span></div>`,
    benefit: 'When several big funds add to a company and its own directors buy shares, that is worth knowing about, and it is all from official SEC filings.',
    free: 'Free: not included.', paid: 'Premium: fund holdings, changes and directors’ trades.',
  },
  {
    tier: 'premium', title: 'Ideas that match your rules', href: '/ideas',
    what: 'Save your own rules (for example “dividend raised 10 years, debt under 3 years”) and see every company that matches, updated as new figures come in.',
    sample: `<div class="sx-mini"><b>Your rule: “steady dividend growers”</b>${chip('6 companies match', '#1baf7a')}${chip('2 new this month', '#2a78d6')}</div>`,
    benefit: 'Your shortlist stays up to date by itself, so you only look again when something changes.',
    free: 'Free: not included.', paid: 'Premium: saved rules that update themselves.',
  },
  {
    tier: 'premium', title: 'Research reports and market reviews', href: '/reports',
    what: 'A monthly research report with charts, a market review every two weeks, and your own Premium section in the Saturday newsletter.',
    sample: `<div class="sx-mini"><b>Market review · two weeks to 6 Nov</b>${bar('Technology', 80, '#1baf7a', '+4.2%')}${bar('Energy', 35, '#e34948', '−1.8%')}${bar('Health care', 55, '#1baf7a', '+1.1%')}</div>`,
    benefit: 'The big picture in ten minutes: what moved, why, and what it means for long-term investors.',
    free: 'Free: the Saturday newsletter.', paid: 'Premium: reports, reviews and your Premium newsletter section.',
  },
  {
    tier: 'premium', title: 'No adverts', href: '/membership',
    what: 'Premium members never see adverts anywhere on the site.',
    sample: `<div class="sx-mini">${chip('Clean pages', '#6250d6')}${chip('Faster reading', '#6250d6')}</div>`,
    benefit: 'Read and research without distractions.',
    free: 'Free and Regular: a few adverts.', paid: 'Premium: none.',
  },
];

export function showcaseHtml({ trialDays = 7 } = {}) {
  const tierName = { regular: 'Regular', premium: 'Premium' };
  return `
        <section class="sx-wrap" id="features">
          <h2>Every paid feature, with a sample</h2>
          <p class="sx-intro">What each feature does, what it looks like, how it helps, and what Free members get. Samples show the layout; real pages use live figures from official sources.</p>
          <div class="sx-grid">${FEATURES.map((f) => `
            <article class="sx-card ${f.tier}">
              <header><span class="sx-tier">${tierName[f.tier]}${f.tier === 'regular' ? ' and Premium' : ''}</span><h3>${esc(f.title)}</h3></header>
              <p class="sx-what">${esc(f.what)}</p>
              <div class="sx-sample" aria-label="Sample"><span class="sx-label">Sample</span>${f.sample}</div>
              <p class="sx-benefit"><b>How it helps:</b> ${esc(f.benefit)}</p>
              <div class="sx-vs"><span>${esc(f.free)}</span><span>${esc(f.paid)}</span></div>
              <div class="sx-cta"><a class="pf-btn gold" href="/membership#plans">${f.tier === 'premium' && trialDays ? `Try Premium free for ${trialDays} days` : `Join ${tierName[f.tier]}`}</a>${f.href !== '/membership' ? `<a class="pf-btn" href="${f.href}">See it</a>` : ''}</div>
            </article>`).join('')}
          </div>
        </section>`;
}
