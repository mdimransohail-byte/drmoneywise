import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
:root{--bg:#06111f;--bg-soft:#0c1c30;--panel:rgba(8,24,43,.78);--card:rgba(13,31,54,.8);--line:rgba(255,215,140,.12);--line-strong:rgba(255,215,140,.24);--text:#ecf3ff;--text-soft:#9eb3cc;--text-dark:#0b1730;--gold:#d7a546;--gold-strong:#ffcb6b;--gold-soft:rgba(215,165,70,.18);--sea:#3cb5c4;--sea-soft:rgba(60,181,196,.14);--rose:#f26a6a;--green:#2bc48a;--shadow:0 30px 80px rgba(0,0,0,.38);--shadow-soft:0 18px 40px rgba(0,0,0,.22);--font-d:'Playfair Display',Georgia,serif;--font-b:'Aptos','Segoe UI Variable Text','Segoe UI',sans-serif;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font-b);color:var(--text);background:radial-gradient(circle at 10% 10%,rgba(60,181,196,.2),transparent 25%),radial-gradient(circle at 90% 6%,rgba(215,165,70,.18),transparent 26%),radial-gradient(circle at 50% 120%,rgba(93,31,84,.24),transparent 38%),linear-gradient(180deg,#04101c 0%,#071525 35%,#081827 100%);min-height:100vh}
a{color:inherit;text-decoration:none}
button,input,select,textarea{font:inherit}
.hidden{display:none!important}
.dmw-shell{width:min(1380px,calc(100% - 28px));margin:0 auto;padding:22px 0 64px}
.narrow{width:min(960px,calc(100% - 28px))}

/* TOPBAR */
.topbar{position:sticky;top:14px;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 20px;border:1px solid rgba(255,255,255,.06);background:rgba(7,17,30,.82);backdrop-filter:blur(20px);border-radius:999px;box-shadow:var(--shadow-soft)}
.brand{display:inline-flex;align-items:center;gap:12px;cursor:pointer}
.brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;color:#1d1303;font-weight:900;font-size:.95rem;background:linear-gradient(135deg,#ffd982 0%,#d29d33 48%,#8e5d0f 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.42)}
.brand strong{display:block;font-size:.95rem;font-family:var(--font-d)}
.brand small{display:block;color:var(--text-soft);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase}
.topnav{display:flex;align-items:center;gap:18px;color:var(--text-soft);font-size:.88rem}
.topnav a,.topnav button{background:none;border:0;cursor:pointer;color:var(--text-soft);transition:color 180ms}
.topnav a:hover,.topnav button:hover{color:var(--text)}
.topbar-actions{display:flex;align-items:center;gap:10px}
.member-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:var(--sea-soft);color:#8fe9f4;font-size:.75rem;letter-spacing:.06em}

/* BUTTONS */
.btn{appearance:none;border:0;border-radius:999px;padding:11px 20px;cursor:pointer;font-size:.88rem;font-weight:600;transition:transform 160ms ease,opacity 160ms ease,box-shadow 160ms ease;letter-spacing:.02em}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:linear-gradient(135deg,#f7d07c 0%,#d4a03a 50%,#8f6512 100%);color:#161006;box-shadow:0 12px 24px rgba(215,165,70,.22)}
.btn-primary:hover{box-shadow:0 18px 32px rgba(215,165,70,.32)}
.btn-secondary{background:rgba(255,255,255,.08);color:var(--text);border:1px solid rgba(255,255,255,.08)}
.btn-ghost{background:none;color:var(--text-soft);border:1px solid rgba(255,255,255,.06)}
.btn-sm{padding:7px 13px;font-size:.75rem}
.btn-sea{background:rgba(60,181,196,.15);color:#8fe9f4;border:1px solid rgba(60,181,196,.2)}

/* GLASS CARD */
.glass{border-radius:24px;padding:24px;background:linear-gradient(180deg,rgba(9,24,43,.88),rgba(5,18,33,.82));border:1px solid var(--line);box-shadow:var(--shadow)}

/* HERO */
.hero-grid{margin-top:24px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(340px,.7fr);gap:20px}
.hero-copy{position:relative;overflow:hidden;padding:40px;border-radius:28px;background:radial-gradient(circle at 84% 16%,rgba(215,165,70,.22),transparent 24%),radial-gradient(circle at 15% 78%,rgba(60,181,196,.16),transparent 24%),linear-gradient(135deg,rgba(8,18,34,.98),rgba(10,28,48,.95));border:1px solid var(--line);box-shadow:var(--shadow)}
.hero-copy h1{font-family:var(--font-d);font-size:clamp(2.8rem,5.5vw,5.2rem);line-height:.92;max-width:11ch;margin:12px 0 0}
.hero-copy p{color:var(--text-soft);line-height:1.7;margin:14px 0 22px}
.hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.eyebrow{display:inline-flex;align-items:center;gap:10px;color:var(--gold-strong);font-size:.7rem;text-transform:uppercase;letter-spacing:.18em;font-weight:700}
.eyebrow::before{content:'';width:24px;height:1px;background:currentColor;opacity:.6}

/* SUMMARY STRIP */
.summary-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:20px}
.summary-chip{padding:16px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
.summary-chip strong{display:block;margin-bottom:5px;font-size:1rem}
.summary-chip .cnt{font-size:1.6rem;font-family:var(--font-d);color:var(--gold-strong)}
.helper{color:var(--text-soft);font-size:.82rem;line-height:1.5}

/* SECTION */
.section-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:20px;margin-top:20px}
.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
.section-head h2{font-family:var(--font-d);font-size:clamp(1.7rem,2.8vw,2.6rem);line-height:1}

/* INTEREST FILTER */
.filter-bar{margin-top:24px}
.filter-inner{display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 14px;font-size:.8rem;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);color:var(--text-soft);cursor:pointer;transition:all 160ms}
.chip.active{background:linear-gradient(135deg,rgba(247,208,124,.16),rgba(215,165,70,.26));border-color:rgba(255,215,140,.25);color:var(--text)}
.chip:hover{border-color:rgba(255,255,255,.14);color:var(--text)}
.chip-select{color:var(--text-soft);font-size:.82rem;padding:9px 12px 9px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);width:100%;cursor:pointer;-webkit-appearance:auto}

/* STORY CARD */
.story-card{padding:18px;border-radius:20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:grid;gap:12px;transition:transform 200ms,border-color 200ms}
.story-card:hover{transform:translateY(-2px);border-color:rgba(255,215,140,.14)}
.story-card.locked{background:radial-gradient(circle at 90% 8%,rgba(215,165,70,.1),transparent 28%),rgba(255,255,255,.04)}
.story-card.featured{padding:22px}
.story-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.story-card h3{font-size:1.05rem;line-height:1.3;cursor:pointer}
.story-card h3:hover{color:var(--gold-strong)}
.story-card p{color:var(--text-soft);font-size:.88rem;line-height:1.65}
.tag{display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;font-size:.72rem;background:rgba(255,255,255,.07);color:var(--text-soft)}
.tag.gold{background:var(--gold-soft);color:var(--gold-strong)}
.tag.green{background:rgba(43,196,138,.14);color:#81f2c0}
.tag.sea{background:var(--sea-soft);color:#8fe9f4}
.subtle-chip{font-size:.72rem;color:var(--text-soft);opacity:.8}
.card-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

/* AREA PANEL */
.area-panel{padding:20px;border-radius:22px;background:linear-gradient(180deg,rgba(12,28,49,.9),rgba(8,19,34,.8));border:1px solid rgba(255,255,255,.06)}
.area-panel>h3{margin-bottom:5px;font-size:1.05rem}
.area-panel>.area-desc{color:var(--text-soft);font-size:.84rem;margin-bottom:16px}
.stack{display:flex;flex-direction:column;gap:10px}
.area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:6px}

/* TOOLS GRID */
.tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}
.stack-form{display:grid;gap:14px}
.form-group{display:grid;gap:6px}
.form-group label{font-size:.82rem;color:var(--text-soft)}
.form-group input,.form-group select,.form-group textarea{padding:11px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:var(--text);width:100%}
.form-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.watchlist-chips{display:flex;flex-wrap:wrap;gap:8px;min-height:36px}
.list-row{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.04)}
.review-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.review-col h3{margin-bottom:10px;color:var(--gold-strong);font-size:.95rem}
.review-col ul{padding-left:16px;display:grid;gap:7px;color:var(--text-soft);font-size:.86rem}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:24px}
.pricing-card{padding:22px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:grid;gap:16px;transition:transform 200ms}
.pricing-card:hover{transform:translateY(-2px)}
.pricing-card.highlight{background:radial-gradient(circle at 88% 10%,rgba(215,165,70,.14),transparent 28%),rgba(255,255,255,.04);border-color:rgba(255,215,140,.18)}
.price-big{font-family:var(--font-d);font-size:2.6rem;color:var(--text)}
.pricing-options{display:flex;flex-wrap:wrap;gap:8px}
.pricing-feat{padding-left:16px;display:grid;gap:7px;color:var(--text-soft);font-size:.86rem}
.coupon-box{display:flex;gap:10px;align-items:center}
.coupon-box input{flex:1;padding:11px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:var(--text)}

/* AUTH */
.auth-card{background:linear-gradient(180deg,rgba(13,31,54,.95),rgba(8,21,37,.92));border:1px solid var(--line)}
.auth-tabs{display:flex;gap:0;margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.07)}
.auth-tab{flex:1;padding:10px;background:none;border:0;color:var(--text-soft);cursor:pointer;font-size:.88rem;transition:all 160ms}
.auth-tab.active{background:rgba(255,215,140,.1);color:var(--text)}

/* ARTICLE VIEW */
.article-layout{padding:28px;margin-top:24px;background:linear-gradient(180deg,rgba(11,27,47,.94),rgba(6,19,34,.88));border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow)}
.article-header{padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:24px}
.article-title{font-family:var(--font-d);font-size:clamp(2rem,4vw,3.8rem);line-height:.94;max-width:14ch;margin:12px 0}
.article-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr);gap:22px}
.article-block{padding:20px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
.article-block h3{margin-bottom:12px;font-size:1.05rem}
.article-block p,.article-block li{color:var(--text-soft);line-height:1.7;font-size:.9rem}
.article-block ul{padding-left:16px;display:grid;gap:7px}
.visual-grid{display:flex;flex-direction:column;gap:12px}
.visual-item{padding:13px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05)}
.visual-item strong{display:block;margin-bottom:3px;font-size:.9rem}
.visual-item .v-val{font-size:1.5rem;font-family:var(--font-d);color:var(--gold-strong)}

/* ADMIN */
.admin-body-bg{background:radial-gradient(circle at 14% 10%,rgba(76,150,255,.15),transparent 22%),radial-gradient(circle at 88% 10%,rgba(255,203,107,.14),transparent 24%),linear-gradient(180deg,#02060d 0%,#090d15 100%)}
.admin-login{max-width:500px;margin:40px auto 0}
.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:20px}
.metric-card{padding:18px;border-radius:18px;background:linear-gradient(180deg,rgba(12,17,27,.96),rgba(14,24,41,.88));border:1px solid rgba(255,255,255,.06)}
.metric-card strong{display:block;font-family:var(--font-d);font-size:2rem;margin-bottom:4px}
.metric-card span{color:var(--text-soft);font-size:.8rem}
.admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:20px}
.timeline-bar-row{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);margin-bottom:8px}
.timeline-track{display:grid;grid-template-columns:100px 1fr;gap:14px;align-items:center}
.timeline-fill{height:9px;border-radius:999px;background:linear-gradient(90deg,#57b8ff,#f0bc56);min-width:8px}
.bar-list-row{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.04);margin-bottom:6px}
.bar-swatch{width:140px}
.inventory-item{padding:14px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05);margin-bottom:8px}
.inventory-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-top:6px}

/* SKELETON */
.skeleton{border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.06),rgba(255,255,255,.12),rgba(255,255,255,.06));background-size:200% 100%;animation:shimmer 1.4s infinite linear}
.sk-line{height:14px;margin-bottom:8px}
.sk-card{height:120px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* AI TYPING */
.ai-typing::after{content:'▋';animation:blink .7s step-end infinite;color:var(--gold)}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

/* FOOTER */
.site-footer{margin-top:32px;padding:20px 8px 0;display:flex;justify-content:space-between;gap:16px;color:var(--text-soft);font-size:.82rem;border-top:1px solid var(--line)}

/* GRID BG */
.grid-bg::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,215,140,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,140,.035) 1px,transparent 1px);background-size:120px 120px;pointer-events:none;mask-image:linear-gradient(180deg,rgba(0,0,0,.5),transparent 90%);z-index:0}

/* RESPONSIVE */
@media(max-width:1100px){.hero-grid,.section-grid,.tools-grid,.admin-grid,.article-grid{grid-template-columns:1fr}.area-grid,.pricing-grid,.metric-grid,.review-board{grid-template-columns:1fr}}
@media(max-width:760px){.summary-strip,.filter-inner,.form-row{grid-template-columns:1fr}.topnav{display:none}}
`;

// ── DATA ─────────────────────────────────────────────────────────────────
const REGIONS = [
  { id: 'global', label: 'Global', summary: 'The broad market picture across regions' },
  { id: 'north-america', label: 'North America', summary: 'US and Canada earnings, rates, and flows' },
  { id: 'europe', label: 'Europe', summary: 'Europe policy, exporters, and currencies' },
  { id: 'mena', label: 'Middle East', summary: 'Gulf liquidity, energy, and local market moves' },
  { id: 'apac', label: 'Asia Pacific', summary: 'Asia growth, supply chains, and risk appetite' },
  { id: 'india', label: 'India', summary: 'Domestic growth, banks, and investor participation' },
];

const INTERESTS = [
  { id: 'equities', label: 'Stocks' },
  { id: 'etfs', label: 'ETFs' },
  { id: 'fixed-income', label: 'Bonds' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'fx', label: 'Currencies' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'retirement', label: 'Retirement' },
  { id: 'income', label: 'Income' },
];

const ACCESS = { free: 0, regular: 1, premium: 2 };

const PLANS = [
  { id: 'free', name: 'Free', shortName: 'Free', priceLabel: '$0', billingLabel: 'forever', tagline: 'For readers building a daily money habit', highlight: false, cta: 'Create Free Account', features: ['Free daily market summaries', 'Saved interests and region selection', 'Simple watchlist', 'Free learning points'], billingOptions: [{ id: 'free', label: 'Start Free', priceText: '$0' }] },
  { id: 'regular', name: 'Paid Regular', shortName: 'Regular', priceLabel: '$10', billingLabel: '/month or $99/year', tagline: 'For readers who want more depth and paid explainers', highlight: true, cta: 'Upgrade to Regular', features: ['Regular paid articles', 'Portfolio and watchlist review', 'More learning points', 'Priority member feed'], billingOptions: [{ id: 'regular-monthly', label: 'Monthly', priceText: '$10' }, { id: 'regular-annual', label: 'Yearly', priceText: '$99' }] },
  { id: 'premium', name: 'Paid Premium', shortName: 'Premium', priceLabel: '$25', billingLabel: '/month or $249/year', tagline: 'For readers who want every article and the fullest review tools', highlight: false, cta: 'Upgrade to Premium', features: ['Premium paid articles', 'Unlimited learning library', 'Full portfolio review', 'Early access to scheduled releases'], billingOptions: [{ id: 'premium-monthly', label: 'Monthly', priceText: '$25' }, { id: 'premium-annual', label: 'Yearly', priceText: '$249' }] },
];

const ARTICLES = [
  { id: 'learn-diversification', slug: 'why-diversification-still-matters', headline: 'Why Diversification Still Matters', contentType: 'learning', accessTier: 'free', region: 'global', interest: 'retirement', publishAt: '2026-04-15T08:49:16.493Z', source: 'Dr MoneyWise Learning Point', summary: 'Diversification means spreading your money so one bad surprise does not hit everything at once.', plainEnglish: 'Instead of putting all your money in one pocket, you use several pockets. If one pocket tears, you do not lose everything.', whyItMatters: 'It lowers the chance that one stock, one sector, or one market shock can badly hurt your overall plan.', everydayExample: 'It is like carrying water in a few smaller bottles instead of one giant bottle. If one slips, you still have the rest.', takeaways: ['Mixing assets helps smooth the ride.', 'Diversification does not remove risk, but it can reduce single-name risk.', 'It works best when the holdings are genuinely different from each other.'], jargonBuster: [{ term: 'Diversification', meaning: 'Spreading money across different investments.' }, { term: 'Concentration risk', meaning: 'The danger of being too dependent on one investment.' }], infographic: { title: 'A balanced starting mix', items: [{ label: 'Core stocks', value: '50%', context: 'Growth engine' }, { label: 'Income assets', value: '30%', context: 'Stability and income' }, { label: 'Cash and hedges', value: '20%', context: 'Shock absorber' }] }, bodySections: [{ heading: 'The simple version', body: 'Instead of putting all your money in one pocket, you use several pockets. If one pocket tears, you do not lose everything.' }, { heading: 'Why this matters', body: 'It lowers the chance that one stock, one sector, or one market shock can badly hurt your overall plan.' }, { heading: 'One everyday example', body: 'It is like carrying water in a few smaller bottles instead of one giant bottle. If one slips, you still have the rest.' }], readingTime: '5 min read', sentiment: 'neutral' },
  { id: 'learn-dividends', slug: 'what-dividend-investors-should-watch', headline: 'What Dividend Investors Should Watch', contentType: 'learning', accessTier: 'regular', region: 'global', interest: 'income', publishAt: '2026-04-18T08:49:16.493Z', source: 'Dr MoneyWise Learning Point', summary: 'Good dividend investing is not just about chasing the biggest yield on the screen.', plainEnglish: 'A very high dividend can be a gift or a warning sign. You want income that looks strong enough to keep being paid.', whyItMatters: 'Investors often buy high yield names for safety, but unstable payouts can lead to capital losses and income disappointment.', everydayExample: 'A shop offering a huge discount every day may be generous, or it may be struggling and trying to survive.', takeaways: ['Look at payout strength, not just headline yield.', 'Cashflow and balance sheet quality matter.', 'Slow, dependable growers can beat flashy income traps.'], jargonBuster: [{ term: 'Dividend yield', meaning: 'How much cash a company pays yearly compared with its share price.' }, { term: 'Payout ratio', meaning: 'How much of earnings is being used to pay dividends.' }], infographic: { title: 'Healthy dividend checklist', items: [{ label: 'Cash cover', value: 'Strong', context: 'Room to keep paying' }, { label: 'Debt pressure', value: 'Low', context: 'Less strain on income' }, { label: 'History', value: 'Stable', context: 'Fewer nasty surprises' }] }, bodySections: [{ heading: 'The simple version', body: 'A very high dividend can be a gift or a warning sign. You want income that looks strong enough to keep being paid.' }, { heading: 'Why this matters', body: 'Investors often buy high yield names for safety, but unstable payouts can lead to capital losses and income disappointment.' }], readingTime: '5 min read', sentiment: 'neutral' },
  { id: 'learn-portfolio-review', slug: 'how-to-read-a-portfolio-review', headline: 'How To Read A Portfolio Review', contentType: 'learning', accessTier: 'premium', region: 'global', interest: 'retirement', publishAt: '2026-04-21T08:49:16.493Z', source: 'Dr MoneyWise Learning Point', summary: 'A portfolio review should tell you what you own, where your biggest risks sit, and how well your holdings match your goals.', plainEnglish: 'You are checking whether your basket still matches the trip you are taking.', whyItMatters: 'Many investors track performance but miss hidden overexposure, poor balance, or strategy drift.', everydayExample: 'Packing five jackets for a beach trip is still packing, but it is the wrong packing.', takeaways: ['Look at concentration, not just return.', 'Compare your holdings with your target mix.', 'Review the role of each position before adding more.'], jargonBuster: [{ term: 'Asset allocation', meaning: 'How your money is split across major buckets like stocks, bonds, and cash.' }, { term: 'Drift', meaning: 'When your portfolio slowly moves away from your intended plan.' }], infographic: { title: 'Three review questions', items: [{ label: 'Too much in one area?', value: 'Check', context: 'Avoid overexposure' }, { label: 'Still fits your goal?', value: 'Check', context: 'Keep purpose clear' }, { label: 'Need rebalancing?', value: 'Check', context: 'Bring the mix back in line' }] }, bodySections: [{ heading: 'The simple version', body: 'You are checking whether your basket still matches the trip you are taking.' }, { heading: 'Why this matters', body: 'Many investors track performance but miss hidden overexposure, poor balance, or strategy drift.' }], readingTime: '5 min read', sentiment: 'neutral' },
  { id: 'schedule-fed', slug: 'scheduled-how-rate-moves-touch-everyday-money', headline: 'How Rate Moves Touch Everyday Money', contentType: 'learning', accessTier: 'free', region: 'global', interest: 'fixed-income', publishAt: '2026-04-27T08:49:16.493Z', source: 'Dr MoneyWise Learning Point', summary: 'This lesson explains how central bank moves filter into mortgages, savings, markets, and spending.', plainEnglish: 'When rates move, borrowing and saving both feel the change.', whyItMatters: 'Rate headlines sound distant, but they affect household budgets and investment returns quickly.', everydayExample: 'It is like changing the slope of a road. The whole journey feels different after that.', takeaways: ['Rate cuts and hikes travel into many parts of daily money life.', 'Borrowers and savers feel changes differently.', 'Markets try to price changes before they happen.'], jargonBuster: [{ term: 'Policy rate', meaning: 'The interest rate used by the central bank to guide money costs.' }], infographic: { title: 'Where rates show up', items: [{ label: 'Loans', value: 'Faster', context: 'Borrowing cost changes' }, { label: 'Savings', value: 'Moderate', context: 'Deposit returns may shift' }, { label: 'Markets', value: 'Fastest', context: 'Prices react quickly' }] }, bodySections: [{ heading: 'The simple version', body: 'When rates move, borrowing and saving both feel the change.' }, { heading: 'Why this matters', body: 'Rate headlines sound distant, but they affect household budgets and investment returns quickly.' }], readingTime: '5 min read', sentiment: 'neutral' },
  { id: 'schedule-oil', slug: 'scheduled-why-oil-news-moves-more-than-energy-stocks', headline: 'Why Oil News Moves More Than Energy Stocks', contentType: 'learning', accessTier: 'regular', region: 'mena', interest: 'commodities', publishAt: '2026-04-29T08:49:16.493Z', source: 'Dr MoneyWise Learning Point', summary: 'This piece explains why oil headlines often spill into currencies, inflation, transport, and confidence.', plainEnglish: 'Oil prices can change the mood of many markets, not just oil companies.', whyItMatters: 'Readers often underestimate how widely energy moves spread through the economy.', everydayExample: 'It is like fuel in a delivery van. If fuel changes sharply, many final prices move too.', takeaways: ['Energy prices can ripple through inflation expectations.', 'Transport and input costs matter for many sectors.', 'Oil moves often affect regional currencies and sentiment too.'], jargonBuster: [{ term: 'Second-order effect', meaning: 'A knock-on effect that appears after the first direct impact.' }], infographic: { title: 'Oil ripple map', items: [{ label: 'Energy shares', value: 'Direct', context: 'First impact' }, { label: 'Inflation', value: 'Spillover', context: 'Broader pricing effect' }, { label: 'Consumers', value: 'Visible', context: 'Fuel and transport costs' }] }, bodySections: [{ heading: 'The simple version', body: 'Oil prices can change the mood of many markets, not just oil companies.' }, { heading: 'Why this matters', body: 'Readers often underestimate how widely energy moves spread through the economy.' }], readingTime: '5 min read', sentiment: 'neutral' },
  { id: 'd766727e', slug: 'cloud-infrastructure-spend-remains-the-lead-variable-for-north-american-software', headline: 'Cloud infrastructure spend remains the lead variable for North American software valuations', contentType: 'news', accessTier: 'regular', region: 'north-america', interest: 'equities', publishAt: '2026-04-24T08:20:00Z', source: 'SignalHarbor Research', summary: 'Enterprise buyers are still consolidating vendors, but AI capacity budgets remain unusually durable for platform names with pricing power.', plainEnglish: 'Enterprise buyers are consolidating, but AI budgets stay strong for platform names.', whyItMatters: 'This setup favors cash-generative large caps and second-derivative winners in semis, networking, and workflow automation.', everydayExample: 'Think of it like a busy road getting one important traffic signal changed. Even one change can affect the whole journey.', takeaways: ['The headline points to a real shift, not just noise.', 'The wider market impact depends on how long the trend lasts.', 'Watch related sectors and your own holdings before reacting.'], jargonBuster: [{ term: 'Market sentiment', meaning: 'The overall mood of investors.' }, { term: 'Positioning', meaning: 'How investors are currently placed in the market.' }], infographic: { title: 'Quick breakdown', items: [{ label: 'Headline impact', value: 'Now', context: 'Immediate reaction' }, { label: 'Sector spillover', value: 'Next', context: 'Related areas may move too' }, { label: 'Longer effect', value: 'Watch', context: 'Depends on follow-through' }] }, bodySections: [{ heading: 'What happened', body: 'Enterprise buyers are still consolidating vendors, but AI capacity budgets remain unusually durable for platform names with pricing power.' }, { heading: 'In plain English', body: 'Enterprise tech budgets are under pressure everywhere except AI infrastructure, where spend looks durable.' }, { heading: 'Why readers should care', body: 'This setup favors cash-generative large caps and second-derivative winners in semis, networking, and workflow automation.' }], readingTime: '4 min read', sentiment: 'positive' },
  { id: 'd8fd0bf1', slug: 'energy-cash-flows-keep-gulf-liquidity-healthy-supporting-regional-infrastructure', headline: 'Energy cash flows keep Gulf liquidity healthy, supporting regional infrastructure and bank stories', contentType: 'news', accessTier: 'premium', region: 'mena', interest: 'equities', publishAt: '2026-04-24T08:05:00Z', source: 'Gulf Markets', summary: 'Sovereign and quasi-sovereign spending plans continue to support capital market confidence across the Gulf corridor.', plainEnglish: 'Government spending plans keep confidence strong across Gulf capital markets.', whyItMatters: 'This backdrop favors construction-linked lenders, logistics names, and local bond issuance with visible policy support.', everydayExample: 'It is like a well-funded city council that keeps building even when conditions elsewhere slow down.', takeaways: ['Policy-backed spending supports local lenders.', 'Infrastructure flows favor logistics and construction.', 'Regional bond markets see visible support.'], jargonBuster: [{ term: 'Sovereign fund', meaning: 'A government-owned investment pool.' }, { term: 'Capital market', meaning: 'Where companies and governments raise longer-term money.' }], infographic: { title: 'Gulf liquidity map', items: [{ label: 'Oil revenues', value: 'High', context: 'Fueling government budgets' }, { label: 'Infra spend', value: 'Active', context: 'Construction and logistics' }, { label: 'Bank confidence', value: 'Stable', context: 'Lending conditions solid' }] }, bodySections: [{ heading: 'What happened', body: 'Sovereign and quasi-sovereign spending plans continue to support capital market confidence across the Gulf corridor.' }, { heading: 'Why readers should care', body: 'This backdrop favors construction-linked lenders, logistics names, and local bond issuance with visible policy support.' }], readingTime: '4 min read', sentiment: 'positive' },
  { id: 'cb97479d', slug: 'european-industrial-exporters-see-better-order-visibility-as-supply-chains-norma', headline: 'European industrial exporters see better order visibility as supply chains normalize', contentType: 'news', accessTier: 'regular', region: 'europe', interest: 'equities', publishAt: '2026-04-24T05:35:00Z', source: 'SignalHarbor Research', summary: 'Capital goods leaders are seeing steadier fulfillment windows, which lowers fear premiums that had been compressing margins last quarter.', plainEnglish: 'European industrial companies can now see their orders more clearly, which calms fears about margins.', whyItMatters: 'If order books remain healthy, Europe quality industrial basket can outperform low-conviction cyclical rebounds.', everydayExample: 'It is like a restaurant finally seeing reservations fill up again after months of uncertainty.', takeaways: ['Steadier supply chains reduce margin-compression fear.', 'Quality industrials may outperform cyclicals.', 'Order visibility is a leading signal worth tracking.'], jargonBuster: [{ term: 'Order visibility', meaning: 'How clearly a company can see its upcoming pipeline of sales.' }, { term: 'Fear premium', meaning: 'Extra discount investors apply when uncertainty is high.' }], infographic: { title: 'European industrial signals', items: [{ label: 'Supply chain', value: 'Normalizing', context: 'Fewer bottlenecks' }, { label: 'Order books', value: 'Healthier', context: 'Better pipeline clarity' }, { label: 'Margin trend', value: 'Recovering', context: 'Fear premium fading' }] }, bodySections: [{ heading: 'What happened', body: 'Capital goods leaders are seeing steadier fulfillment windows, which lowers fear premiums compressing margins last quarter.' }, { heading: 'Why readers should care', body: "If order books remain healthy, Europe's quality industrial basket can outperform low-conviction cyclical rebounds." }], readingTime: '5 min read', sentiment: 'positive' },
  { id: 'f638b8c8', slug: 'sector-etf-rotation-favors-profitable-growth-over-deep-cyclicals-in-north-americ', headline: 'Sector ETF rotation favors profitable growth over deep cyclicals in North America', contentType: 'news', accessTier: 'regular', region: 'north-america', interest: 'etfs', publishAt: '2026-04-24T06:25:00Z', source: 'ETF Flow Desk', summary: 'Flows show investors are still willing to own upside, but they want earnings visibility and stronger balance sheets.', plainEnglish: 'Investors still want growth, but are picking companies with clear profits over risky cyclicals.', whyItMatters: 'Quality tech, healthcare, and selective industrial automation look better than aggressive beta chasing.', everydayExample: 'It is like choosing a reliable car over a fast one when road conditions are uncertain.', takeaways: ['Quality and profitability are rewarded in the current rotation.', 'Deep cyclicals face tougher flows until macro clarity improves.', 'ETF flows are a useful signal for where conviction lives.'], jargonBuster: [{ term: 'Cyclicals', meaning: 'Companies whose profits follow the economic cycle up and down.' }, { term: 'Beta', meaning: 'A measure of how much a stock moves relative to the overall market.' }], infographic: { title: 'Rotation signals', items: [{ label: 'Quality growth', value: 'Gaining', context: 'Strong inflows' }, { label: 'Deep cyclicals', value: 'Losing', context: 'Lighter conviction' }, { label: 'Healthcare', value: 'Stable', context: 'Defensive with upside' }] }, bodySections: [{ heading: 'What happened', body: 'Flows show investors are still willing to own upside, but they want earnings visibility and stronger balance sheets.' }, { heading: 'Why readers should care', body: 'That makes quality tech, healthcare, and selective industrial automation a cleaner combination than aggressive beta chasing.' }], readingTime: '4 min read', sentiment: 'positive' },
  { id: 'b46b9fbf', slug: 'quality-and-dividend-etfs-keep-attracting-investors-looking-for-calmer-upside-gl', headline: 'Quality and dividend ETFs keep attracting investors looking for calmer upside', contentType: 'news', accessTier: 'free', region: 'global', interest: 'etfs', publishAt: '2026-04-24T01:45:00Z', source: 'Allocator Desk', summary: 'Flows suggest investors still want exposure, but with balance-sheet resilience and cash distribution discipline.', plainEnglish: 'Investors want market exposure, but prefer companies with solid balance sheets and regular payouts.', whyItMatters: 'The market is rewarding participation with protection, not reckless duration or leverage.', everydayExample: 'It is like choosing a steady savings account over a lottery ticket when you want your money to work reliably.', takeaways: ['Defensive equity ETFs see durable inflows.', 'Balance sheet quality matters more than headline growth.', 'Cash distributions signal financial discipline.'], jargonBuster: [{ term: 'Balance sheet resilience', meaning: 'A company having strong finances with manageable debt.' }, { term: 'Duration', meaning: 'Sensitivity to interest rate changes.' }], infographic: { title: 'Quality ETF signals', items: [{ label: 'Dividend ETFs', value: 'Inflows', context: 'Steady demand' }, { label: 'Quality screen', value: 'Strong', context: 'Low debt, high ROE' }, { label: 'Volatility', value: 'Lower', context: 'Calmer ride' }] }, bodySections: [{ heading: 'What happened', body: 'Flows suggest investors still want exposure, but with balance-sheet resilience and cash distribution discipline.' }, { heading: 'Why readers should care', body: 'The market is rewarding participation with protection, not reckless duration or leverage.' }], readingTime: '2 min read', sentiment: 'positive' },
  { id: 'f56d96fe', slug: 'front-end-yields-stay-reactive-as-traders-price-a-slower-but-still-possible-easi', headline: 'Front-end yields stay reactive as traders price a slower but still possible easing path', contentType: 'news', accessTier: 'free', region: 'north-america', interest: 'fixed-income', publishAt: '2026-04-24T07:40:00Z', source: 'Macro Desk', summary: 'Short-duration bonds are moving with every inflation-sensitive data point, while long-end demand remains selective rather than broad.', plainEnglish: 'Short-term bond prices are jumpy because of inflation data, while longer-term bonds see calmer, more selective demand.', whyItMatters: 'A stickier rates regime keeps valuation discipline important and supports barbell positioning across quality equity and short-duration income.', everydayExample: 'Think of it like a thermostat that keeps adjusting with each news item rather than settling on one temperature.', takeaways: ['Short-duration bonds are more sensitive to inflation data.', 'Long-end demand is selective, not broad.', 'Barbell positioning may offer resilience in this environment.'], jargonBuster: [{ term: 'Front-end yields', meaning: 'Interest rates on shorter-term government bonds (1-2 year).' }, { term: 'Easing path', meaning: 'The expected sequence of central bank interest rate cuts.' }], infographic: { title: 'Yield curve snapshot', items: [{ label: 'Short end', value: 'Reactive', context: 'Data-sensitive' }, { label: 'Long end', value: 'Selective', context: 'Cautious demand' }, { label: 'Rate cuts', value: 'Slower', context: 'Market pricing' }] }, bodySections: [{ heading: 'What happened', body: 'Short-duration bonds are moving with every inflation-sensitive data point, while long-end demand remains selective rather than broad.' }, { heading: 'Why readers should care', body: 'A stickier rates regime keeps valuation discipline important and supports barbell positioning.' }], readingTime: '3 min read', sentiment: 'neutral' },
  { id: '77ab134b', slug: 'balanced-bond-demand-points-to-barbell-positioning-instead-of-one-way-duration-c', headline: 'Balanced bond demand points to barbell positioning instead of one-way duration conviction', contentType: 'news', accessTier: 'free', region: 'global', interest: 'fixed-income', publishAt: '2026-04-23T21:20:00Z', source: 'Rate Radar', summary: 'Allocators are blending cash-like duration with selective long-end exposure rather than making a single macro bet.', plainEnglish: 'Rather than betting on one direction, investors are hedging with a mix of short and long bonds.', whyItMatters: 'This pattern supports multi-asset portfolios seeking resilience more than maximum carry.', everydayExample: 'It is like splitting your bets rather than putting everything on one outcome at once.', takeaways: ['Barbell positioning reduces single-direction rate risk.', 'Blending durations supports portfolio resilience.', 'Avoid making one-way duration bets in this environment.'], jargonBuster: [{ term: 'Barbell positioning', meaning: 'Holding short and long-dated assets together, avoiding the middle.' }, { term: 'Duration conviction', meaning: 'A strong view on interest rate direction expressed through bond maturities.' }], infographic: { title: 'Barbell explained', items: [{ label: 'Short bonds', value: 'Safety', context: 'Cash-like, low risk' }, { label: 'Long bonds', value: 'Selective', context: 'Chosen carefully' }, { label: 'Middle', value: 'Lighter', context: 'Less conviction here' }] }, bodySections: [{ heading: 'What happened', body: 'Allocators are blending cash-like duration with selective long-end exposure rather than making a single macro bet.' }, { heading: 'Why readers should care', body: 'This pattern supports multi-asset portfolios seeking resilience more than maximum carry.' }], readingTime: '2 min read', sentiment: 'neutral' },
  { id: '7e7021ad', slug: 'how-to-compare-a-stock-with-an-etf', headline: 'How To Compare A Stock With An ETF', contentType: 'learning', accessTier: 'regular', region: 'global', interest: 'equities', publishAt: '2026-04-25T08:50:29.636Z', source: 'Dr MoneyWise Learning Point', summary: 'Comparing a stock with an ETF means understanding single-name risk versus basket exposure.', plainEnglish: 'A stock bets on one company; an ETF spreads you across many. Each has a different risk shape.', whyItMatters: 'Choosing between individual stocks and ETFs changes how your money handles risk, income, and growth.', everydayExample: 'It is like reading the weather before leaving home. You may still go out, but you dress differently and plan better.', takeaways: ['Single stocks offer concentration; ETFs offer spread.', 'ETFs can lower the impact of one company failing.', 'Stocks can outperform if the company does well.'], jargonBuster: [{ term: 'Volatility', meaning: 'How sharply prices move up and down.' }, { term: 'Allocation', meaning: 'How money is spread across investments.' }], infographic: { title: 'Stock vs ETF at a glance', items: [{ label: 'Concentration', value: 'Stock', context: 'Single company risk' }, { label: 'Spread', value: 'ETF', context: 'Across many names' }, { label: 'Costs', value: 'ETF', context: 'Usually lower fees' }] }, bodySections: [{ heading: 'The simple version', body: 'A stock bets on one company; an ETF spreads you across many. Each has a different risk shape.' }, { heading: 'Why this matters', body: 'Choosing between individual stocks and ETFs changes how your money handles risk, income, and growth.' }], readingTime: '5 min read', sentiment: 'neutral' },
  { id: 'bcfeaf88', slug: 'indian-private-lenders-keep-leadership-as-retail-loan-growth-stays-sturdy-india-', headline: 'Indian private lenders keep leadership as retail loan growth stays sturdy', contentType: 'news', accessTier: 'free', region: 'india', interest: 'equities', publishAt: '2026-04-24T04:10:00Z', source: 'Bharat Markets', summary: 'Investors continue to reward banks combining deposit stability with better-quality consumer and SME growth.', plainEnglish: 'Indian private banks keep winning market share as they combine solid deposits with good consumer loan growth.', whyItMatters: "That often spills over into broader domestic cyclicals and benchmark ETFs tied to financial leadership.", everydayExample: 'Like a local bank branch that keeps growing its customer base while the competition struggles.', takeaways: ['Private lender quality is rewarded over public sector banks.', 'Consumer and SME credit growth stays healthy.', 'Financial sector leadership supports broader India ETFs.'], jargonBuster: [{ term: 'SME', meaning: 'Small and medium-sized enterprise — smaller businesses.' }, { term: 'Deposit stability', meaning: 'Consistent funding that gives a bank a reliable base to lend from.' }], infographic: { title: 'India banking signals', items: [{ label: 'Private banks', value: 'Leading', context: 'Outperforming state banks' }, { label: 'Retail credit', value: 'Sturdy', context: 'Healthy consumer loans' }, { label: 'Deposits', value: 'Stable', context: 'Solid funding base' }] }, bodySections: [{ heading: 'What happened', body: 'Investors continue to reward banks combining deposit stability with better-quality consumer and SME growth.' }, { heading: 'Why readers should care', body: 'That often spills over into broader domestic cyclicals and benchmark ETFs tied to financial leadership.' }], readingTime: '3 min read', sentiment: 'positive' },
];

// ── UTILS ─────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return 'Today';
  try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v)); } catch { return v; }
}
function canAccess(plan, tier) {
  return (ACCESS[plan || 'free'] ?? 0) >= (ACCESS[tier || 'free'] ?? 0);
}
function getRegionLabel(id) { return REGIONS.find(r => r.id === id)?.label || 'Global'; }
function getInterestLabel(id) { return INTERESTS.find(i => i.id === id)?.label || id; }
function getFilteredArticles(region, interests) {
  return ARTICLES.filter(a => {
    const regionMatch = region === 'global' || a.region === 'global' || a.region === region;
    const interestMatch = !interests.length || interests.includes(a.interest);
    return regionMatch && interestMatch && a.contentType === 'news';
  });
}
function getLearningPoints(region, interests) {
  return ARTICLES.filter(a => {
    const regionMatch = region === 'global' || a.region === 'global' || a.region === region;
    const interestMatch = !interests.length || interests.includes(a.interest);
    return regionMatch && interestMatch && a.contentType === 'learning';
  });
}

// ── CLAUDE API ─────────────────────────────────────────────────────────────
async function callClaude(prompt, systemPrompt = '') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt || 'You are the editorial engine for Dr MoneyWise, a financial education platform. Write for intelligent non-experts. Explain market moves in plain English. Avoid investment advice, hype, and guarantees. Return strict JSON matching the requested schema.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ── COMPONENTS ─────────────────────────────────────────────────────────────
function TierTag({ tier }) {
  const cls = tier === 'free' ? '' : tier === 'regular' ? 'sea' : 'gold';
  const label = tier === 'free' ? 'Free' : tier === 'regular' ? 'Regular' : 'Premium';
  return <span className={`tag ${cls}`}>{label}</span>;
}

function TopBar({ user, view, onNavigate, onSignOut }) {
  return (
    <nav className="topbar">
      <div className="brand" onClick={() => onNavigate('home')}>
        <div className="brand-mark">$</div>
        <div>
          <strong>Dr MoneyWise</strong>
          <small>Market Intelligence</small>
        </div>
      </div>
      <div className="topnav">
        <button onClick={() => onNavigate('home')}>Markets</button>
        <button onClick={() => onNavigate('home', '#membership')}>Membership</button>
        <button onClick={() => onNavigate('admin')}>Admin</button>
      </div>
      <div className="topbar-actions">
        <span className="member-badge">
          {user ? `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} member` : '● Guest reader'}
        </span>
        {user && <button className="btn btn-ghost btn-sm" onClick={onSignOut}>Sign out</button>}
      </div>
    </nav>
  );
}

function StoryCard({ article, userPlan, saved, onSave, onRead, featured }) {
  const accessible = canAccess(userPlan, article.accessTier);
  return (
    <article className={`story-card ${accessible ? '' : 'locked'} ${featured ? 'featured' : ''}`}>
      <div className="story-meta">
        <div className="chip-row">
          <TierTag tier={article.accessTier} />
          <span className="tag">{getRegionLabel(article.region)}</span>
          <span className="tag">{getInterestLabel(article.interest)}</span>
          {article.contentType === 'learning' && <span className="tag sea">Learning</span>}
        </div>
        <span className="subtle-chip">{article.readingTime}</span>
      </div>
      <h3 onClick={() => onRead(article)}>{article.headline}</h3>
      <p>{article.summary}</p>
      {featured && <div className="helper">{article.source} · {fmtDate(article.publishAt)}</div>}
      <div className="card-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onRead(article)}>
          {accessible ? 'Read' : 'Preview'}
        </button>
        {onSave && (
          <button className="btn btn-ghost btn-sm" onClick={() => onSave(article.slug)}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        )}
        {!accessible && <span className="tag">🔒 {article.accessTier === 'regular' ? 'Regular' : 'Premium'} plan needed</span>}
      </div>
    </article>
  );
}

function ArticleView({ article, userPlan, savedArticles, onSave, onBack }) {
  if (!article) return null;
  const accessible = canAccess(userPlan, article.accessTier);
  const saved = savedArticles.includes(article.slug);
  const infoItems = article.infographic?.items || [];

  return (
    <div className="narrow dmw-shell">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div className="article-layout">
        <header className="article-header">
          <div className="story-meta">
            <div className="chip-row">
              <TierTag tier={article.accessTier} />
              <span className="tag">{getRegionLabel(article.region)}</span>
              <span className="tag">{getInterestLabel(article.interest)}</span>
              {article.contentType === 'learning' && <span className="tag sea">Learning Point</span>}
            </div>
            <span className="subtle-chip">{article.readingTime}</span>
          </div>
          <h1 className="article-title">{article.headline}</h1>
          <div className="helper" style={{ marginBottom: 14 }}>{article.source} · {fmtDate(article.publishAt)}</div>
          <p style={{ color: 'var(--text-soft)', lineHeight: 1.7 }}>{article.summary}</p>
          <div className="card-actions" style={{ marginTop: 14 }}>
            {onSave && <button className="btn btn-primary btn-sm" onClick={() => onSave(article.slug)}>{saved ? '✓ Saved' : 'Save to account'}</button>}
          </div>
        </header>

        <div className="article-grid">
          <div className="visual-grid">
            {accessible ? (
              (article.bodySections || []).map((s, i) => (
                <div key={i} className="article-block">
                  <h3>{s.heading}</h3>
                  <p>{s.body}</p>
                </div>
              ))
            ) : (
              <>
                <div className="article-block">
                  <h3>{article.bodySections?.[0]?.heading || 'Summary'}</h3>
                  <p>{article.bodySections?.[0]?.body || article.summary}</p>
                </div>
                <div className="article-block" style={{ background: 'radial-gradient(circle at 90% 10%, rgba(215,165,70,.12), transparent 30%), rgba(255,255,255,.04)' }}>
                  <h3>🔒 Continue with a paid plan</h3>
                  <p style={{ color: 'var(--text-soft)' }}>Upgrade to {article.accessTier} or higher to read the full article, takeaways, and jargon guide.</p>
                  <div className="card-actions" style={{ marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => document.getElementById('membership')?.scrollIntoView({ behavior: 'smooth' })}>See plans</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <aside className="visual-grid">
            <div className="article-block">
              <h3>{article.infographic?.title || 'Quick breakdown'}</h3>
              <div className="visual-grid" style={{ marginTop: 8 }}>
                {infoItems.map((item, i) => (
                  <div key={i} className="visual-item">
                    <strong>{item.label}</strong>
                    <div className="v-val">{item.value}</div>
                    <div className="helper">{item.context}</div>
                  </div>
                ))}
              </div>
            </div>
            {accessible && (
              <>
                <div className="article-block">
                  <h3>Key takeaways</h3>
                  <ul>{(article.takeaways || []).map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <div className="article-block">
                  <h3>Jargon made simple</h3>
                  <ul>{(article.jargonBuster || []).map((j, i) => <li key={i}><strong>{j.term}:</strong> {j.meaning}</li>)}</ul>
                </div>
                <div className="article-block">
                  <h3>Everyday example</h3>
                  <p>{article.everydayExample}</p>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function AdminView({ onBack }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('hello@drmoneywise.com');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [articles, setArticles] = useState(ARTICLES);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState('');
  const [topic, setTopic] = useState('');
  const [genAccess, setGenAccess] = useState('free');
  const [genRegion, setGenRegion] = useState('global');
  const [genInterest, setGenInterest] = useState('equities');

  const METRICS = [
    { label: 'Readers', value: '234' }, { label: 'Page views', value: '1,847' },
    { label: 'Signups', value: '47' }, { label: 'Upgrades', value: '12' },
    { label: 'Revenue', value: '$2,340' }, { label: 'Conversion', value: '5.1%' },
    { label: 'Published', value: '15' }, { label: 'Scheduled', value: '2' },
  ];
  const TIMELINE = [
    { date: 'May 30', pageViews: 210, signups: 5, upgrades: 1, revenue: 240 },
    { date: 'May 31', pageViews: 280, signups: 8, upgrades: 2, revenue: 380 },
    { date: 'Jun 1', pageViews: 320, signups: 6, upgrades: 1, revenue: 290 },
    { date: 'Jun 2', pageViews: 390, signups: 9, upgrades: 3, revenue: 520 },
    { date: 'Jun 3', pageViews: 270, signups: 4, upgrades: 1, revenue: 210 },
    { date: 'Jun 4', pageViews: 340, signups: 7, upgrades: 2, revenue: 360 },
    { date: 'Jun 5', pageViews: 290, signups: 8, upgrades: 2, revenue: 340 },
  ];
  const TIER_MIX = [{ name: 'Free', value: 189, color: '#9eb3cc' }, { name: 'Regular', value: 31, color: '#3cb5c4' }, { name: 'Premium', value: 14, color: '#ffcb6b' }];
  const STATUS_MIX = [{ name: 'Published', value: 15, color: '#2bc48a' }, { name: 'Draft', value: 3, color: '#9eb3cc' }, { name: 'Scheduled', value: 2, color: '#f0bc56' }];

  function handleLogin(e) {
    e.preventDefault();
    if (email === 'hello@drmoneywise.com' && password === 'ChangeMe123!') {
      setLoggedIn(true);
    } else {
      setLoginMsg('Invalid credentials. Try hello@drmoneywise.com / ChangeMe123!');
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    setGenResult('');
    try {
      const raw = await callClaude(
        `Generate a short financial learning point article for the topic: "${topic}". Region: ${genRegion}. Interest: ${genInterest}. Access tier: ${genAccess}.
Return only JSON: {"headline":"...","summary":"...","plainEnglish":"...","whyItMatters":"...","takeaways":["...","...","..."],"jargonBuster":[{"term":"...","meaning":"..."}]}`,
        'You are the editorial engine for Dr MoneyWise. Return strict JSON. No markdown, no preamble.'
      );
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const newArticle = {
        id: `gen-${Date.now()}`,
        slug: `gen-${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        headline: parsed.headline,
        contentType: 'learning',
        accessTier: genAccess,
        region: genRegion,
        interest: genInterest,
        publishAt: new Date().toISOString(),
        source: 'Dr MoneyWise Desk',
        summary: parsed.summary,
        plainEnglish: parsed.plainEnglish,
        whyItMatters: parsed.whyItMatters,
        everydayExample: '',
        takeaways: parsed.takeaways || [],
        jargonBuster: parsed.jargonBuster || [],
        infographic: { title: 'Quick breakdown', items: [] },
        bodySections: [{ heading: 'In plain English', body: parsed.plainEnglish }, { heading: 'Why this matters', body: parsed.whyItMatters }],
        readingTime: '4 min read',
        sentiment: 'neutral',
      };
      setArticles(prev => [newArticle, ...prev]);
      setGenResult(`✓ Article created: "${newArticle.headline}"`);
      setTopic('');
    } catch (err) {
      setGenResult('Failed to generate. Check API connection.');
    }
    setGenerating(false);
  }

  if (!loggedIn) {
    return (
      <div className="dmw-shell admin-login">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 20 }}>← Back</button>
        <div className="glass">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Admin Access</div>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '2rem', marginBottom: 20 }}>Dr MoneyWise Admin</h2>
          <form className="stack-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@drmoneywise.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" />
            </div>
            {loginMsg && <p style={{ color: 'var(--rose)', fontSize: '.84rem' }}>{loginMsg}</p>}
            <button className="btn btn-primary" type="submit">Sign in to Admin</button>
          </form>
          <p className="helper" style={{ marginTop: 14 }}>Demo: hello@drmoneywise.com / ChangeMe123!</p>
        </div>
      </div>
    );
  }

  const tabs = ['dashboard', 'content', 'members', 'settings'];
  return (
    <div className="dmw-shell">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>← Back to site</button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Admin Dashboard</div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2.2rem' }}>Dr MoneyWise Admin</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setLoggedIn(false)}>Sign out</button>
      </div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t} className={`chip ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="metric-grid">
            {METRICS.map(m => (
              <div key={m.label} className="metric-card">
                <strong>{m.value}</strong>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
          <div className="admin-grid" style={{ marginTop: 24 }}>
            <div className="glass">
              <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-d)' }}>Traffic timeline</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={TIMELINE}>
                  <XAxis dataKey="date" stroke="#9eb3cc" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9eb3cc" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0c1c30', border: '1px solid rgba(255,215,140,.12)', borderRadius: 12, color: '#ecf3ff', fontSize: 12 }} />
                  <Line type="monotone" dataKey="pageViews" stroke="#3cb5c4" strokeWidth={2} dot={false} name="Page views" />
                  <Line type="monotone" dataKey="signups" stroke="#ffcb6b" strokeWidth={2} dot={false} name="Signups" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="admin-grid" style={{ margin: 0, gap: 12 }}>
              <div className="glass">
                <h3 style={{ marginBottom: 12, fontFamily: 'var(--font-d)', fontSize: '1rem' }}>Member tier mix</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={TIER_MIX} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                      {TIER_MIX.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0c1c30', border: '1px solid rgba(255,215,140,.12)', borderRadius: 12, color: '#ecf3ff', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chip-row" style={{ justifyContent: 'center', gap: 8 }}>
                  {TIER_MIX.map(t => <span key={t.name} style={{ fontSize: '.72rem', color: t.color }}>● {t.name} {t.value}</span>)}
                </div>
              </div>
              <div className="glass">
                <h3 style={{ marginBottom: 12, fontFamily: 'var(--font-d)', fontSize: '1rem' }}>Article status</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={STATUS_MIX} barSize={28}>
                    <XAxis dataKey="name" stroke="#9eb3cc" tick={{ fontSize: 10 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {STATUS_MIX.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                    <Tooltip contentStyle={{ background: '#0c1c30', border: '1px solid rgba(255,215,140,.12)', borderRadius: 12, color: '#ecf3ff', fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'content' && (
        <div className="admin-grid">
          <div className="glass">
            <h3 style={{ fontFamily: 'var(--font-d)', marginBottom: 18 }}>AI Article Generator</h3>
            <form className="stack-form" onSubmit={handleGenerate}>
              <div className="form-group">
                <label>Topic</label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. How inflation affects bond prices" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Access tier</label>
                  <select value={genAccess} onChange={e => setGenAccess(e.target.value)}>
                    <option value="free">Free</option>
                    <option value="regular">Regular</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Region</label>
                  <select value={genRegion} onChange={e => setGenRegion(e.target.value)}>
                    {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Interest</label>
                <select value={genInterest} onChange={e => setGenInterest(e.target.value)}>
                  {INTERESTS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={generating || !topic.trim()}>
                {generating ? <span className="ai-typing">Generating article</span> : 'Generate with AI'}
              </button>
            </form>
            {genResult && <p style={{ marginTop: 14, color: genResult.startsWith('✓') ? 'var(--green)' : 'var(--rose)', fontSize: '.88rem' }}>{genResult}</p>}
          </div>
          <div className="glass" style={{ overflow: 'hidden' }}>
            <h3 style={{ fontFamily: 'var(--font-d)', marginBottom: 16 }}>Article inventory ({articles.length})</h3>
            <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
              {articles.map(a => (
                <div key={a.id} className="inventory-item">
                  <strong style={{ fontSize: '.9rem', lineHeight: 1.3 }}>{a.headline}</strong>
                  <div className="inventory-meta">
                    <div className="chip-row">
                      <TierTag tier={a.accessTier} />
                      <span className="tag">{getRegionLabel(a.region)}</span>
                      <span className="tag">{getInterestLabel(a.interest)}</span>
                    </div>
                    <span className="tag green">{a.contentType === 'learning' ? 'Learning' : 'News'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="glass">
          <h3 style={{ fontFamily: 'var(--font-d)', marginBottom: 18 }}>Member overview</h3>
          {[
            { name: 'Alice Chen', plan: 'premium', email: 'alice@example.com', joined: '2026-01-12' },
            { name: 'Omar Farouk', plan: 'regular', email: 'omar@example.com', joined: '2026-02-18' },
            { name: 'Sarah Mitchell', plan: 'free', email: 'sarah@example.com', joined: '2026-03-05' },
            { name: 'Priya Nair', plan: 'premium', email: 'priya@example.com', joined: '2026-04-01' },
            { name: 'Tom Bergmann', plan: 'regular', email: 'tom@example.com', joined: '2026-04-22' },
          ].map((u, i) => (
            <div key={i} className="list-row" style={{ marginBottom: 8 }}>
              <div>
                <strong>{u.name}</strong>
                <div className="helper">{u.email} · Joined {u.joined}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TierTag tier={u.plan} />
                <button className="btn btn-ghost btn-sm">Edit plan</button>
              </div>
            </div>
          ))}
          <p className="helper" style={{ marginTop: 12 }}>Showing 5 of 234 members</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="admin-grid">
          <div className="glass">
            <h3 style={{ fontFamily: 'var(--font-d)', marginBottom: 18 }}>Site settings</h3>
            <div className="stack-form">
              {[['Site name', 'Dr MoneyWise'], ['Domain', 'drmoneywise.com'], ['Support email', 'hello@drmoneywise.com']].map(([label, val]) => (
                <div key={label} className="form-group">
                  <label>{label}</label>
                  <input type="text" defaultValue={val} />
                </div>
              ))}
              {[['OpenAI API key', 'sk-...'], ['Claude API key', 'sk-ant-...'], ['Marketaux key', ''], ['NewsAPI key', ''], ['Finnhub key', '']].map(([label, ph]) => (
                <div key={label} className="form-group">
                  <label>{label}</label>
                  <input type="password" placeholder={ph || '••••••••'} />
                </div>
              ))}
              <button className="btn btn-primary">Save settings</button>
            </div>
          </div>
          <div className="glass">
            <h3 style={{ fontFamily: 'var(--font-d)', marginBottom: 18 }}>Stripe checkout links</h3>
            <div className="stack-form">
              {[['Regular monthly', 'STRIPE_REGULAR_MONTHLY_URL'], ['Regular annual', 'STRIPE_REGULAR_ANNUAL_URL'], ['Premium monthly', 'STRIPE_PREMIUM_MONTHLY_URL'], ['Premium annual', 'STRIPE_PREMIUM_ANNUAL_URL']].map(([label, key]) => (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <input type="url" placeholder="https://buy.stripe.com/..." />
                </div>
              ))}
              <button className="btn btn-primary">Save Stripe links</button>
            </div>
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-d)', marginBottom: 14 }}>Coupons</h3>
              <div className="stack-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Code</label>
                    <input type="text" placeholder="WELCOME20" />
                  </div>
                  <div className="form-group">
                    <label>Discount %</label>
                    <input type="number" placeholder="20" min="1" max="100" />
                  </div>
                </div>
                <button className="btn btn-sea">Add coupon</button>
              </div>
              {[{ code: 'WELCOME20', discount: 20, active: true }, { code: 'ANNUAL30', discount: 30, active: true }, { code: 'LAUNCH50', discount: 50, active: false }].map((c, i) => (
                <div key={i} className="list-row" style={{ marginTop: 8 }}>
                  <div><strong>{c.code}</strong><div className="helper">{c.discount}% off · all plans</div></div>
                  <span className={`tag ${c.active ? 'green' : ''}`}>{c.active ? 'Active' : 'Disabled'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('home');
  const [currentArticle, setCurrentArticle] = useState(null);
  const [user, setUser] = useState(null);
  const [region, setRegion] = useState('global');
  const [interests, setInterests] = useState(['equities', 'etfs', 'fixed-income']);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [savedArticles, setSavedArticles] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [authTab, setAuthTab] = useState('signup');
  const [authMsg, setAuthMsg] = useState('');
  const [portfolioReview, setPortfolioReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Ticker state
  const [tickers] = useState([
    { sym: 'S&P 500', val: 5842.1, chg: +0.42 },
    { sym: 'NASDAQ', val: 18920.5, chg: +0.61 },
    { sym: 'Gold', val: 2341.0, chg: -0.18 },
    { sym: 'BTC', val: 67420, chg: +1.24 },
    { sym: '10Y UST', val: 4.42, chg: -0.03 },
    { sym: 'EUR/USD', val: 1.0821, chg: +0.09 },
  ]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [watchlistInput, setWatchlistInput] = useState('');
  const [pfTicker, setPfTicker] = useState('');
  const [pfName, setPfName] = useState('');
  const [pfWeight, setPfWeight] = useState('');
  const [pfCost, setPfCost] = useState('');

  function navigate(target, anchor) {
    setView(target);
    if (anchor) setTimeout(() => document.getElementById(anchor.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function handleReadArticle(article) {
    setCurrentArticle(article);
    setView('article');
    window.scrollTo(0, 0);
  }

  function handleSave(slug) {
    if (!user) { setAuthTab('signup'); setAuthMsg('Sign in to save articles.'); return; }
    setSavedArticles(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  }

  function handleSignUp(e) {
    e.preventDefault();
    if (!name || !email || !password) { setAuthMsg('Please fill all fields.'); return; }
    setUser({ name, email, plan: 'free', role: 'member', watchlist: [], portfolio: [], savedArticleSlugs: [] });
    setAuthMsg(`Welcome, ${name}! Your free account is ready.`);
  }

  function handleSignIn(e) {
    e.preventDefault();
    if (loginEmail === 'hello@drmoneywise.com' && loginPassword === 'ChangeMe123!') {
      setUser({ name: 'Admin', email: loginEmail, plan: 'premium', role: 'admin' });
      setAuthMsg('Admin signed in. Full access enabled.');
    } else if (loginEmail && loginPassword) {
      setUser({ name: loginEmail.split('@')[0], email: loginEmail, plan: 'free', role: 'member' });
      setAuthMsg(`Welcome back!`);
    } else {
      setAuthMsg('Enter your email and password.');
    }
  }

  function handleSignOut() { setUser(null); setAuthMsg('You are signed out.'); }

  function addToWatchlist(e) {
    e.preventDefault();
    const ticker = watchlistInput.trim().toUpperCase();
    if (!ticker) return;
    setWatchlist(prev => [...new Set([...prev, ticker])].slice(0, 20));
    setWatchlistInput('');
  }

  function addToPortfolio(e) {
    e.preventDefault();
    if (!pfTicker.trim()) return;
    setPortfolio(prev => [...prev, { id: Date.now(), ticker: pfTicker.toUpperCase(), name: pfName, weight: pfWeight, cost: pfCost }]);
    setPfTicker(''); setPfName(''); setPfWeight(''); setPfCost('');
  }

  async function getPortfolioReview() {
    if (!user || !['regular', 'premium'].includes(user?.plan)) {
      setPortfolioReview({ locked: true, msg: 'Portfolio review is available on Regular and Premium plans.' });
      return;
    }
    if (!portfolio.length) { setPortfolioReview({ locked: false, msg: 'Add holdings to your portfolio first.' }); return; }
    setReviewLoading(true);
    setPortfolioReview(null);
    try {
      const holdingsList = portfolio.map(h => `${h.ticker}${h.name ? ' (' + h.name + ')' : ''} - weight: ${h.weight || 'unknown'}, cost: ${h.cost || 'unknown'}`).join(', ');
      const raw = await callClaude(
        `Review this portfolio for a retail investor: ${holdingsList}. 
Return only JSON: {"title":"Portfolio Review","summary":"...2-3 sentences...","strengths":["...","...","..."],"risks":["...","..."],"actions":["...","..."]}`,
        'You are Dr MoneyWise editorial engine. Provide balanced, educational portfolio feedback. No investment advice. No guarantees. Return strict JSON.'
      );
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setPortfolioReview({ locked: false, ...parsed });
    } catch {
      setPortfolioReview({ locked: false, msg: 'Review unavailable. Try again shortly.' });
    }
    setReviewLoading(false);
  }

  function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (code === 'WELCOME20') { setCouponDiscount(20); setCouponMsg('WELCOME20 applied — 20% off Regular and Premium plans.'); }
    else if (code === 'ANNUAL30') { setCouponDiscount(30); setCouponMsg('ANNUAL30 applied — 30% off annual plans.'); }
    else if (code === 'LAUNCH50') { setCouponDiscount(50); setCouponMsg('LAUNCH50 applied — 50% off!'); }
    else { setCouponDiscount(0); setCouponMsg('Coupon code not found.'); }
  }

  const filteredNews = getFilteredArticles(region, interests);
  const learningPoints = getLearningPoints(region, interests);
  const featured = filteredNews[0] || ARTICLES.find(a => a.accessTier === 'free') || ARTICLES[0];

  const areasByInterest = interests.map(intId => {
    const int = INTERESTS.find(i => i.id === intId);
    const arts = ARTICLES.filter(a => a.interest === intId && (region === 'global' || a.region === 'global' || a.region === region)).slice(0, 3);
    return { id: intId, label: int?.label || intId, articles: arts };
  }).filter(a => a.articles.length > 0);

  const summaryStrip = interests.slice(0, 3).map(intId => {
    const label = INTERESTS.find(i => i.id === intId)?.label || intId;
    const count = ARTICLES.filter(a => a.interest === intId).length;
    const highlight = ARTICLES.find(a => a.interest === intId)?.summary?.slice(0, 60) + '...' || '';
    return { label, count, highlight };
  });

  if (view === 'article') {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh' }}>
          <div className="dmw-shell">
            <TopBar user={user} view={view} onNavigate={navigate} onSignOut={handleSignOut} />
          </div>
          <ArticleView
            article={currentArticle}
            userPlan={user?.plan || 'free'}
            savedArticles={savedArticles}
            onSave={handleSave}
            onBack={() => setView('home')}
          />
          <div className="dmw-shell">
            <footer className="site-footer">
              <span>© 2026 Dr MoneyWise — drmoneywise.com</span>
              <span>hello@drmoneywise.com · Not investment advice</span>
            </footer>
          </div>
        </div>
      </>
    );
  }

  if (view === 'admin') {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh' }} className="admin-body-bg">
          <div className="dmw-shell">
            <TopBar user={user} view={view} onNavigate={navigate} onSignOut={handleSignOut} />
          </div>
          <AdminView onBack={() => setView('home')} />
        </div>
      </>
    );
  }

  // ── HOME VIEW ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh' }}>
        <div className="dmw-shell">
          {/* TOP BAR */}
          <TopBar user={user} view={view} onNavigate={navigate} onSignOut={handleSignOut} />

          {/* HERO */}
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Live market intelligence</span>
              <h1>Markets, explained simply.</h1>
              <p>Financial news and learning for readers who want to understand money — not just follow it.</p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => document.getElementById('membership')?.scrollIntoView({ behavior: 'smooth' })}>Start free today</button>
                <button className="btn btn-secondary" onClick={() => document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' })}>Browse stories</button>
              </div>
              {/* TICKER STRIP */}
              <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {tickers.map(t => (
                  <div key={t.sym} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,.06)', fontSize: '.75rem' }}>
                    <span style={{ color: 'var(--text-soft)', marginRight: 6 }}>{t.sym}</span>
                    <span style={{ fontFamily: 'var(--font-d)', color: t.chg >= 0 ? 'var(--green)' : 'var(--rose)' }}>
                      {t.chg >= 0 ? '+' : ''}{t.chg}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* AUTH CARD */}
            <div className="glass auth-card" id="account">
              {!user ? (
                <>
                  <div className="auth-tabs">
                    <button className={`auth-tab ${authTab === 'signup' ? 'active' : ''}`} onClick={() => setAuthTab('signup')}>Create account</button>
                    <button className={`auth-tab ${authTab === 'signin' ? 'active' : ''}`} onClick={() => setAuthTab('signin')}>Sign in</button>
                  </div>
                  {authTab === 'signup' ? (
                    <form className="stack-form" onSubmit={handleSignUp}>
                      <div className="form-group"><label>Your name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Chen" /></div>
                      <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@example.com" /></div>
                      <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
                      {authMsg && <p style={{ color: authMsg.includes('ready') ? 'var(--green)' : 'var(--rose)', fontSize: '.84rem' }}>{authMsg}</p>}
                      <button className="btn btn-primary" type="submit">Create free account</button>
                    </form>
                  ) : (
                    <form className="stack-form" onSubmit={handleSignIn}>
                      <div className="form-group"><label>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="your@email.com" /></div>
                      <div className="form-group"><label>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" /></div>
                      {authMsg && <p style={{ color: 'var(--rose)', fontSize: '.84rem' }}>{authMsg}</p>}
                      <button className="btn btn-primary" type="submit">Sign in</button>
                      <p className="helper" style={{ marginTop: 4 }}>Admin: hello@drmoneywise.com / ChangeMe123!</p>
                    </form>
                  )}
                </>
              ) : (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>Your account</div>
                  <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.4rem', marginBottom: 6 }}>Welcome back, {user.name}</h3>
                  <p className="helper">{user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} plan · {user.email}</p>
                  <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                    <div className="list-row"><span>Saved articles</span><span className="tag">{savedArticles.length}</span></div>
                    <div className="list-row"><span>Watchlist items</span><span className="tag">{watchlist.length}</span></div>
                    <div className="list-row"><span>Portfolio holdings</span><span className="tag">{portfolio.length}</span></div>
                  </div>
                  {authMsg && <p style={{ marginTop: 12, color: 'var(--green)', fontSize: '.84rem' }}>{authMsg}</p>}
                </div>
              )}
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="summary-strip">
            {summaryStrip.map((s, i) => (
              <div key={i} className="summary-chip">
                <div className="cnt">{s.count}</div>
                <strong>{s.label}</strong>
                <div className="helper">{s.highlight}</div>
              </div>
            ))}
          </div>

          {/* INTEREST FILTER */}
          <div className="filter-bar glass" id="feed" style={{ marginTop: 24, padding: '18px 22px' }}>
            <div className="filter-inner">
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Your region</div>
                <select className="chip-select" value={region} onChange={e => setRegion(e.target.value)}>
                  {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Your interests</div>
                <div className="chip-row">
                  {INTERESTS.map(i => (
                    <button key={i.id} className={`chip ${interests.includes(i.id) ? 'active' : ''}`}
                      onClick={() => setInterests(prev => prev.includes(i.id) ? (prev.length > 1 ? prev.filter(x => x !== i.id) : prev) : [...prev, i.id])}>
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FEATURED + BRIEF */}
          <div className="section-grid">
            <div>
              <div className="section-head">
                <div><div className="eyebrow">Featured story</div><h2>Today's headline</h2></div>
              </div>
              {featured && <StoryCard article={featured} userPlan={user?.plan || 'free'} saved={savedArticles.includes(featured.slug)} onSave={handleSave} onRead={handleReadArticle} featured />}
            </div>
            <div>
              <div className="section-head"><div><div className="eyebrow">Today's clear brief</div><h2>Quick read</h2></div></div>
              <div className="stack" style={{ gap: 10 }}>
                {[featured, ...(filteredNews.slice(1, 4))].filter(Boolean).map((a, i) => (
                  <div key={i} className="list-row" style={{ cursor: 'pointer' }} onClick={() => handleReadArticle(a)}>
                    <div>
                      <div className="chip-row" style={{ marginBottom: 5 }}><TierTag tier={a.accessTier} /><span className="tag">{getInterestLabel(a.interest)}</span></div>
                      <strong style={{ fontSize: '.88rem', lineHeight: 1.3 }}>{a.headline}</strong>
                    </div>
                    <span className="subtle-chip">{a.readingTime}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AREA PANELS */}
          <div style={{ marginTop: 32 }}>
            <div className="section-head"><div><div className="eyebrow">Interest areas</div><h2>Your selected topics</h2></div></div>
            <div className="area-grid">
              {areasByInterest.slice(0, 6).map(area => (
                <div key={area.id} className="area-panel">
                  <h3>{area.label}</h3>
                  <p className="area-desc">{INTERESTS.find(i => i.id === area.id)?.description || ''}</p>
                  <div className="stack">
                    {area.articles.map(a => (
                      <StoryCard key={a.id} article={a} userPlan={user?.plan || 'free'} saved={savedArticles.includes(a.slug)} onSave={handleSave} onRead={handleReadArticle} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LEARNING POINTS */}
          <div style={{ marginTop: 32 }}>
            <div className="section-head"><div><div className="eyebrow">Learn as you read</div><h2>Learning points</h2></div></div>
            <div className="area-grid">
              {learningPoints.slice(0, 3).map(a => (
                <StoryCard key={a.id} article={a} userPlan={user?.plan || 'free'} saved={savedArticles.includes(a.slug)} onSave={handleSave} onRead={handleReadArticle} />
              ))}
            </div>
          </div>

          {/* TOOLS */}
          <div className="tools-grid" style={{ marginTop: 32 }}>
            {/* WATCHLIST */}
            <div className="glass">
              <div className="section-head compact"><div><div className="eyebrow">Your watchlist</div><h2 style={{ fontSize: '1.5rem' }}>Track names</h2></div></div>
              <form style={{ display: 'flex', gap: 10, marginBottom: 16 }} onSubmit={addToWatchlist}>
                <input style={{ flex: 1, padding: '10px 14px', borderRadius: 13, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: 'var(--text)' }}
                  value={watchlistInput} onChange={e => setWatchlistInput(e.target.value)} placeholder="NVDA, MSFT, GLD…" />
                <button className="btn btn-primary btn-sm" type="submit">Add</button>
              </form>
              <div className="watchlist-chips">
                {watchlist.length === 0 && <span className="helper">No tickers yet. Add a symbol above.</span>}
                {watchlist.map(t => (
                  <span key={t} className="chip active">
                    {t}
                    <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-soft)', marginLeft: 2 }} onClick={() => setWatchlist(prev => prev.filter(x => x !== t))}>×</button>
                  </span>
                ))}
              </div>
              {!user && watchlist.length > 0 && <p className="helper" style={{ marginTop: 12 }}>Sign in to save your watchlist permanently.</p>}
            </div>

            {/* PORTFOLIO */}
            <div className="glass">
              <div className="section-head compact"><div><div className="eyebrow">Your portfolio</div><h2 style={{ fontSize: '1.5rem' }}>Holdings</h2></div></div>
              <form className="stack-form" onSubmit={addToPortfolio} style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-group"><label>Ticker</label><input value={pfTicker} onChange={e => setPfTicker(e.target.value)} placeholder="NVDA" /></div>
                  <div className="form-group"><label>Name</label><input value={pfName} onChange={e => setPfName(e.target.value)} placeholder="NVIDIA" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Weight</label><input value={pfWeight} onChange={e => setPfWeight(e.target.value)} placeholder="40%" /></div>
                  <div className="form-group"><label>Avg cost</label><input value={pfCost} onChange={e => setPfCost(e.target.value)} placeholder="$910" /></div>
                </div>
                <button className="btn btn-primary btn-sm" type="submit">Add holding</button>
              </form>
              <div className="stack">
                {portfolio.length === 0 && <div className="list-row"><span className="helper">No holdings yet. Add above to track your portfolio.</span></div>}
                {portfolio.map(h => (
                  <div key={h.id} className="list-row">
                    <div><strong>{h.ticker}{h.name ? ` · ${h.name}` : ''}</strong><div className="helper">{h.weight || '—'} weight · cost {h.cost || '—'}</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPortfolio(prev => prev.filter(x => x.id !== h.id))}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PORTFOLIO REVIEW */}
          {portfolio.length > 0 && (
            <div className="glass" style={{ marginTop: 20 }}>
              <div className="section-head compact">
                <div><div className="eyebrow">Smart review</div><h2 style={{ fontSize: '1.6rem' }}>Portfolio insight</h2></div>
                <button className="btn btn-sea btn-sm" onClick={getPortfolioReview} disabled={reviewLoading}>
                  {reviewLoading ? <span className="ai-typing">Analysing</span> : '↻ Get review'}
                </button>
              </div>
              {!portfolioReview && <p className="helper">Click "Get review" to receive an educational overview of your holdings. Available on Regular and Premium plans.</p>}
              {portfolioReview?.locked && <p style={{ color: 'var(--gold-strong)' }}>🔒 {portfolioReview.msg}</p>}
              {portfolioReview && !portfolioReview.locked && portfolioReview.summary && (
                <div className="review-board">
                  <div className="review-col"><h3>{portfolioReview.title}</h3><p style={{ color: 'var(--text-soft)', fontSize: '.88rem', lineHeight: 1.65 }}>{portfolioReview.summary}</p></div>
                  <div className="review-col"><h3>Strengths</h3><ul>{(portfolioReview.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  <div className="review-col"><h3>Risks & next steps</h3><ul>{[...(portfolioReview.risks || []), ...(portfolioReview.actions || [])].map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                </div>
              )}
              {portfolioReview?.msg && !portfolioReview.locked && <p className="helper">{portfolioReview.msg}</p>}
            </div>
          )}

          {/* PRICING */}
          <div id="membership" style={{ marginTop: 40 }}>
            <div className="section-head">
              <div><div className="eyebrow">Membership</div><h2>Choose your plan</h2></div>
            </div>
            <div className="coupon-box" style={{ marginBottom: 20 }}>
              <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code (try WELCOME20)" style={{ maxWidth: 260 }} />
              <button className="btn btn-sea btn-sm" onClick={applyCoupon}>Apply</button>
              {couponMsg && <span style={{ fontSize: '.84rem', color: couponDiscount > 0 ? 'var(--green)' : 'var(--rose)' }}>{couponMsg}</span>}
            </div>
            <div className="pricing-grid">
              {PLANS.map(plan => {
                const discounted = couponDiscount > 0 && plan.id !== 'free';
                const mPrice = plan.id === 'regular' ? 10 : plan.id === 'premium' ? 25 : 0;
                const aPrice = plan.id === 'regular' ? 99 : plan.id === 'premium' ? 249 : 0;
                const disc = v => (v * (1 - couponDiscount / 100)).toFixed(2).replace('.00', '');
                const isCurrent = user?.plan === plan.id;
                return (
                  <div key={plan.id} className={`pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                    <div>
                      <div className="eyebrow">{plan.shortName}</div>
                      <h3 style={{ fontFamily: 'var(--font-d)', marginTop: 6 }}>{plan.name}</h3>
                      {isCurrent && <span className="tag gold" style={{ marginTop: 6 }}>Current plan</span>}
                    </div>
                    <p style={{ color: 'var(--text-soft)', fontSize: '.88rem' }}>{plan.tagline}</p>
                    <div>
                      <span className="price-big">{plan.priceLabel}</span>
                      <span className="helper"> {plan.billingLabel}</span>
                    </div>
                    {discounted && mPrice > 0 && (
                      <p style={{ color: 'var(--green)', fontSize: '.82rem' }}>With {couponCode}: ${disc(mPrice)}/mo or ${disc(aPrice)}/yr</p>
                    )}
                    <ul className="pricing-feat">
                      {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    <div className="pricing-options">
                      {plan.billingOptions.map(opt => (
                        <button key={opt.id} className={`btn btn-sm ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => { if (plan.id === 'free') { document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' }); } else { setAuthMsg(`Checkout coming soon — add your Stripe link in admin.`); } }}>
                          {opt.label} {opt.priceText}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <footer className="site-footer">
            <span>© 2026 Dr MoneyWise · drmoneywise.com</span>
            <span>hello@drmoneywise.com · This is not investment advice</span>
          </footer>
        </div>
      </div>
    </>
  );
}
