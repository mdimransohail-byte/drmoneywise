/* ════════════════════════════════════════════════════════════════════════
   TRUST PAGES — About, Contact, Disclaimer, Privacy, Terms
   ───────────────────────────────────────────────────────────────────────
   Served at /about, /contact, /disclaimer, /privacy, /terms by
   seoService.renderInfoPage(). To change wording, edit the text below and
   upload this one file. Each page is a list of sections; each section has
   a heading and paragraphs (plain text — no HTML needed).

   Governing law: UAE (Dubai), confirmed by the owner 17 October 2026.
   These are sensible starting points, not legal advice.
   ════════════════════════════════════════════════════════════════════════ */

export const LEGAL_UPDATED = '4 November 2026';
export const CONTACT_EMAIL = 'hello@drmoneywise.com';

export const INFO_PAGES = {
  about: {
    title: 'About us',
    description: 'Dr MoneyWise explains money and investing so simply that anyone can follow. Our rule: when we can explain it simply, we have truly understood it.',
    intro: 'Dr MoneyWise exists for one reason: to help you become financially healthy, wealthy and wise. We take the noise of the markets and explain what happened, why it matters and what, if anything, it means for you, in words anyone can follow.',
    quote: 'If you can explain it to a five-year-old, you have truly understood it.',
    quoteBy: 'Our take on an idea often linked to the physicist Richard Feynman, and the rule we write by',
    sections: [
      {
        heading: 'What “financially healthy, wealthy and wise” means',
        paragraphs: [
          'Our tagline borrows an old saying, “healthy, wealthy and wise”, and applies all three words to your money.',
          'Financially healthy: your day-to-day money is in good shape. You spend less than you earn, keep an emergency fund, keep debt under control and know where your money goes. Like good health, it is the base everything else is built on.',
          'Financially wealthy: your money grows over time. You invest regularly, let time and compounding do the heavy lifting, and build savings that can pay for the things that matter to you, from a home to a comfortable retirement.',
          'Financially wise: you make good decisions. You understand what you own and why, you can tell real risk from noise in the news, you avoid get-rich-quick schemes, and you know when to sit still.',
        ],
      },
      {
        heading: 'A doctor for your money, not your body',
        paragraphs: [
          'The “Dr” in Dr MoneyWise is about checking the health of your finances, not your body. We are money and investing educators, not medical professionals, and nothing on this site is medical or health advice.',
          'Our focus is money: investing, saving and the companies and markets behind them. Our “Financial Health Check”, for example, scores a company’s finances from its official figures; it has nothing to do with medicine.',
        ],
      },
      {
        heading: 'Our philosophy: explain it simply',
        paragraphs: [
          'Richard Feynman, the Nobel Prize-winning physicist, was famous for making the hardest ideas sound simple. He believed that if you truly understand something, you can explain it with everyday words and a good example. Jargon, he thought, often hides the fact that nobody has really understood the idea.',
          'Money is full of jargon: yields, margins, valuations, basis points. We believe none of it is too difficult for you. It has just rarely been explained well. So before anything goes on Dr MoneyWise, we ask one question: could a curious child follow the main idea? Only when the answer is yes does it go on the site.',
          'Simple is not the same as shallow. Our Premium lessons go deep, into company accounts, valuation and portfolio building, but each step is explained in simple terms, with a real example and the numbers shown.',
        ],
      },
      {
        heading: 'What we do',
        paragraphs: [
          'We publish short market summaries, simple explainers on money ideas, easy-to-read company report cards, Top 10 lists with the ranking rule shown on the page, free calculators and a step-by-step course from complete beginner to advanced.',
          'If a word needs a dictionary, we explain it on the spot or link to our list of money words.',
        ],
      },
      {
        heading: 'Where our numbers come from',
        paragraphs: [
          'Company figures come from official filings published by the US Securities and Exchange Commission (SEC). Economic figures come from public central-bank and government sources. Prices come from licensed market-data providers and charting tools, and may be delayed.',
          'Our explanations are written around those numbers, never instead of them. If a number is missing or looks wrong, we hold the page back rather than guess.',
        ],
      },
      {
        heading: 'What we are not',
        paragraphs: [
          'We are not a bank, broker or licensed financial adviser, and nothing on this site is a recommendation to buy or sell anything. We explain; you decide. Please read our Disclaimer.',
        ],
      },
      {
        heading: 'How we make money',
        paragraphs: [
          'Most of the site is free. Members who want more depth pay for a Regular or Premium plan. In future we may also show advertising or earn a fee when readers sign up with partner services; when we do, we will label it clearly. Payments never change what we write.',
        ],
      },
      {
        heading: 'Talk to us',
        paragraphs: [
          'Questions, ideas or a correction? Email hello@drmoneywise.com. We read every message.',
        ],
      },
    ],
  },

  'how-we-work': {
    title: 'How we work: sources, scores and data checks',
    description: 'Where Dr MoneyWise gets its figures, how company scores and ratings are calculated, and how every figure is checked before it is published.',
    intro: 'Everything on Dr MoneyWise is built on official, published figures. This page explains where they come from, how we turn them into simple scores, and how we check them before you see them.',
    sections: [
      {
        heading: 'Where our figures come from',
        paragraphs: [
          'Company accounts (sales, profit, cash, debt, dividends, shares in issue): the companies’ own filings with the US Securities and Exchange Commission (SEC), downloaded from the SEC’s public database.',
          'What big funds own: the funds’ quarterly 13F reports to the SEC. What company bosses buy and sell: their Form 4 filings to the SEC.',
          'Share prices: end-of-day prices from Marketstack; the scrolling ticker and charts come from TradingView and may be delayed by up to 15 minutes.',
          'Economy figures: inflation and jobs from the US Bureau of Labor Statistics; interest rates from the Federal Reserve (via the New York Fed); bond yields from the US Treasury; mortgage rates from Freddie Mac. Other countries’ figures come from the World Bank, the OECD and the BIS.',
          'Property: official house-price and rent statistics (for example HM Land Registry in the UK) and the other sources named on each property page. Exchange rates: the European Central Bank and ExchangeRate-API.',
          'Every page names its sources next to the figures.',
        ],
      },
      {
        heading: 'Live prices versus published figures',
        paragraphs: [
          'Two kinds of number appear on the site. Live market prices (shares, gold, oil, currencies) change through every trading day. Economic figures (inflation, interest rates, unemployment) are published by government agencies once a month or once a week, usually several weeks after the period they describe.',
          'So every economic figure shows the period it covers (for example “Monthly figure · August 2026”), and every share price shows the date of its closing price. We also show when we last retrieved the figures.',
        ],
      },
      {
        heading: 'How company report cards and scores are calculated',
        paragraphs: [
          'Each company gets five ratings from its own latest accounts. Growth: sales up more than 5% on the year before is good; 0–5% okay; down is weak. Profit: more than 10 cents of profit from every $1 of sales is good; 0–10 cents okay; a loss is weak. Debt: long-term debt repayable with under 3 years of cash from operations is good; 3–6 years okay; more is weak. Cash: making more cash than it spends on running and investing in the business is good; otherwise weak. Dividend: raised 10 or more years in a row and paid for by spare cash is good; paying one is okay; no dividend is not rated.',
          'The report-card score out of 100 is the average of the ratings: good counts as 100, okay as 60 and weak as 15. A company is never marked down for a rating that does not apply to it.',
          'The Financial Health Check, Top 10 lists and screener use the same figures and show their ranking rule on the page. These are descriptions of a company’s finances, not recommendations to buy or sell.',
        ],
      },
      {
        heading: 'How data is checked before it is published',
        paragraphs: [
          'Every figure passes an automatic check before it appears. Missing figures are not shown. Impossible figures (for example inflation of 400%, or a value that jumps far more than it ever could in one period) are held back until a person has looked at them. Figures older than their source’s normal update cycle are still shown, but clearly marked as not updated, with the period they cover; we never present an old figure as current.',
          'If a download from one of our data providers fails, the page says so and shows when the figures were last retrieved.',
          'A weekly check opens every page on the site and follows every internal link; broken links are fixed or redirected. Articles are not published if they link to a page that does not exist.',
          'Explanations are written around the figures, never instead of them: the numbers on a page always come from the data, not from the writing.',
        ],
      },
      {
        heading: 'Shariah screening',
        paragraphs: [
          'Companies are checked against five published Shariah standards (AAOIFI, Dow Jones Islamic, S&P, MSCI and FTSE) using the business-activity rules and financial-ratio limits each one publishes.',
          'Each company gets one of four statuses under each standard: Pass, Fail, Business activity excluded, or Not checked. Not checked means a figure the standard needs is missing, so we make no claim either way rather than guess.',
          'Being held by a Shariah fund is shown separately and is never treated as a pass. The full method, how every ratio and purification are calculated, and the date of the last screening are on our page How we screen (/shariah/method).',
        ],
      },
      {
        heading: 'Corrections',
        paragraphs: [
          'If you spot a mistake, email hello@drmoneywise.com. We check every report and correct errors as quickly as we can.',
        ],
      },
    ],
  },

  contact: {
    title: 'Contact us',
    description: 'How to reach the Dr MoneyWise team: email us with questions about your membership, our explainers or the site, and we aim to reply within two working days.',
    intro: `The quickest way to reach us is by email at ${CONTACT_EMAIL}. We aim to reply within two working days.`,
    sections: [
      {
        heading: 'Membership and billing',
        paragraphs: [
          'Paying members can change or cancel their plan at any time with the "Manage my plan" button in the Membership section. For anything else about payments, email us with the address you signed up with.',
        ],
      },
      {
        heading: 'Corrections',
        paragraphs: [
          'If you spot a mistake, please tell us which page and what looks wrong. We check every report and correct errors as quickly as we can.',
        ],
      },
      {
        heading: 'Please note',
        paragraphs: [
          'We cannot give personal financial advice or tell you what to buy or sell, by email or otherwise.',
        ],
      },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    description: 'Dr MoneyWise is for education only and is not financial advice.',
    intro: 'Dr MoneyWise is for general education and information only. It is not financial, investment, tax or legal advice, and it does not take your personal situation into account.',
    sections: [
      {
        heading: 'No advice or recommendations',
        paragraphs: [
          'Nothing on this site is an offer, recommendation or solicitation to buy, sell or hold any investment. Ratings, report cards and Top 10 lists describe companies and funds using a stated rule; they are not a suggestion to invest in them.',
          'Before making any financial decision, consider your own circumstances and, where appropriate, speak to a licensed financial adviser.',
        ],
      },
      {
        heading: 'Investing involves risk',
        paragraphs: [
          'The value of investments can go down as well as up, and you may get back less than you put in. Past performance is not a reliable guide to the future. Dividends can be cut or stopped.',
          'Cryptocurrencies are especially risky. Their prices can rise or fall very sharply in a short time, and you could lose all the money you put in.',
        ],
      },
      {
        heading: 'Accuracy of information',
        paragraphs: [
          'We take care to use reliable sources, but we cannot guarantee that every figure is complete, accurate or up to date. Prices may be delayed. Data from third parties is provided as received.',
          'News headlines link to their original publishers. We do not control and are not responsible for content on other websites.',
          'Property figures are official averages for a whole country or city. Prices and rents for a particular home or area can be very different. They are not a valuation or a reason to buy, sell or rent.',
        ],
      },
      {
        heading: 'Advertising and partner links',
        paragraphs: [
          'Some pages may show adverts or links to partner companies. They are always labelled "Advertisement" or "Partner offer". If you buy through a partner link, we may earn a commission at no extra cost to you.',
          'Adverts and partner offers are not recommendations by Dr MoneyWise, and they never change what we write or how we rate companies. Please check any product carefully before you buy.',
        ],
      },
      {
        heading: 'No liability',
        paragraphs: [
          'To the fullest extent allowed by law, Dr MoneyWise is not liable for any loss or damage arising from the use of, or reliance on, anything on this site.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy policy',
    description: 'What personal information Dr MoneyWise collects, why, and your choices.',
    intro: 'This policy explains what personal information we collect when you use Dr MoneyWise, why we collect it, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'Account details: your name, email address and a scrambled (hashed) version of your password. We never store your password in readable form.',
          'Your preferences and tools: the regions and topics you choose, your watchlist, the holdings you add to your portfolio, and articles you save.',
          'Your profile (optional): if you fill in "Your profile" on the Membership page, we keep your answers, such as country, age range, what you do, how much you know about investing, roughly how much you invest, your goals, topics and markets. Every question is optional and you can change or clear your answers at any time.',
          'Payments: if you subscribe, payments are handled by Stripe. We receive confirmation of your plan and a customer reference, but never your full card number.',
          'Usage: simple page-view and sign-up counts, so we know which pages are useful.',
        ],
      },
      {
        heading: 'How we use it',
        paragraphs: [
          'We use profile answers only in totals (for example, "most readers are beginners") to decide how simply to write and which topics to cover. We never show your answers to other readers and never sell them.',
          'To run your account, show you the topics you care about, provide the features of your plan, process payments, reply to your messages and improve the site. We do not sell your personal information.',
        ],
      },
      {
        heading: 'Services we rely on',
        paragraphs: [
          'Railway (website hosting), Stripe (payments) and Google Fonts (lettering on the site). Market charts and data may load from third-party providers. Each of these processes limited information, such as your IP address, under its own privacy policy.',
        ],
      },
      {
        heading: 'Cookies and storage',
        paragraphs: [
          'We store a sign-in token and your chosen settings in your browser so you stay signed in. We do not currently use advertising or tracking cookies. Labelled adverts and partner links on our pages do not set cookies from us; if you click one, the other company’s own privacy policy applies. If we ever add an advertising service that uses cookies, we will update this policy and ask for your consent first where required.',
        ],
      },
      {
        heading: 'Keeping and deleting your information',
        paragraphs: [
          'We keep your account information while your account is open. You can ask us to see, correct or delete your information at any time by emailing ' + CONTACT_EMAIL + '. Some payment records may need to be kept for legal or tax reasons.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'Dr MoneyWise is not intended for children under 18, and we do not knowingly create accounts for them.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'If we change this policy we will update the date at the top of this page, and tell members by email about any important change.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of use',
    description: 'The rules for using Dr MoneyWise and its memberships, including automatic renewal, the free trial, cancelling and refunds.',
    intro: 'By using Dr MoneyWise you agree to these terms. Please read them together with our Disclaimer and Privacy policy.',
    sections: [
      {
        heading: 'Using the site',
        paragraphs: [
          'You may read and share links to our pages for personal, non-commercial use. Please do not copy large parts of the site, resell our content, or use automated tools to download it.',
          'You must be 18 or over to create an account. Keep your password private; you are responsible for activity on your account.',
        ],
      },
      {
        heading: 'Plans and prices',
        paragraphs: [
          'Dr MoneyWise has three plans: Free, Regular and Premium. Regular and Premium can be paid monthly or yearly. The current prices are shown on the Membership page before you pay, in US dollars. Your bank may add its own charge for paying in a foreign currency.',
          'Payments are handled securely by Stripe. We never see or store your full card number.',
        ],
      },
      {
        heading: 'Automatic renewal',
        paragraphs: [
          'Paid plans renew automatically at the end of each month or year, and the same card is charged the plan price at that time, until you cancel. Your next renewal date is shown under "Your plan" on the Membership page.',
          'We may change prices in future. A change applies from your next renewal, and we will email you at least 14 days before it does, so you can cancel first if you wish.',
        ],
      },
      {
        heading: 'Free trial of Premium',
        paragraphs: [
          'New Premium members may be offered a free trial. The length of the trial (currently 7 days) is shown on the Membership page and at checkout. You give your card details when the trial starts, but you are not charged during the trial.',
          'We email you about 2 days before the trial ends. If you do not cancel before the trial ends, your Premium plan starts automatically and the first payment for the plan you chose (monthly or yearly) is taken on the day the trial ends. It then renews as above.',
          'If you cancel during the trial, you pay nothing, and your Premium access ends when the trial ends. The free trial is limited to one per person.',
        ],
      },
      {
        heading: 'Discount codes',
        paragraphs: [
          'Discount codes are shown with their terms, for example how long the discount lasts. Unless a code says otherwise, it applies to your first payment only (the first month, or the first year), and later renewals are charged at the normal price. Only one code can be used at a time, and codes cannot be exchanged for cash.',
        ],
      },
      {
        heading: 'Cancelling',
        paragraphs: [
          'You can cancel at any time in a few clicks with "Manage my plan" on the Membership page, or by emailing hello@drmoneywise.com. When you cancel, you are not charged again, and you keep your paid plan until the end of the period you have already paid for. After that, your account moves to the Free plan; your saved lessons, watchlist and settings stay.',
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: [
          'Because members get instant access to all the content of their plan, payments are generally not refundable, including for unused parts of a month or year, except where the law requires otherwise.',
          'If you were charged by mistake, charged twice, or forgot to cancel and have not used your paid plan since the renewal, email hello@drmoneywise.com within 14 days of the charge and we will look into it and, where fair, refund it. Refunds go back to the card you paid with and usually take 5 to 10 working days to appear.',
          'If a payment fails, we will try again over the following days and email you. If it still cannot be taken, your account moves to the Free plan.',
        ],
      },
      {
        heading: 'The community forum',
        paragraphs: [
          'Anyone with a free account may ask questions in the forum; paying members may also reply and edit their own posts. You are responsible for what you post. Posts are your own views, not advice from Dr MoneyWise.',
          'Do not post anything unlawful, abusive, misleading, promotional or private (including links, contact details and personal information), and do not encourage others to buy or sell specific investments or promise returns. See the forum rules at /forum/rules.',
          'Posts are checked by our moderators, who may hold, edit or remove any post and suspend accounts that break these terms or the forum rules. By posting you allow us to show your post (with your first name and the initial of your surname) on the site.',
        ],
      },
      {
        heading: 'Our content',
        paragraphs: [
          'Everything on the site is for education only and is not advice (see the Disclaimer). Content, design and the Dr MoneyWise name belong to us or our licensors.',
          'Some pages show labelled adverts or partner offers. Any purchase you make from another company is between you and that company, under its own terms.',
        ],
      },
      {
        heading: 'Ending accounts',
        paragraphs: [
          'You can close your account at any time by emailing us. We may suspend accounts that misuse the site or break these terms.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'The site is provided "as is". To the fullest extent allowed by law, we are not liable for indirect losses, or for losses arising from investment decisions. Nothing in these terms limits rights you have under consumer law.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These terms are governed by the laws of the United Arab Emirates, as applied in the Emirate of Dubai.',
          'Any dispute that cannot be settled by talking to us first will be dealt with by the courts of Dubai, United Arab Emirates.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update these terms. The date at the top shows the latest version. Continuing to use the site after a change means you accept the new terms.',
        ],
      },
    ],
  },
};
