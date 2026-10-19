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

export const LEGAL_UPDATED = '19 October 2026';
export const CONTACT_EMAIL = 'hello@drmoneywise.com';

export const INFO_PAGES = {
  about: {
    title: 'About Dr MoneyWise',
    description: 'Dr MoneyWise turns the noise of the markets into plain-English explanations for everyday investors.',
    intro: 'Dr MoneyWise is a plain-English guide to money and investing for ordinary people. We take the daily noise of the markets and explain what happened, why it matters, and what, if anything, it means for you.',
    sections: [
      {
        heading: 'What we do',
        paragraphs: [
          'We publish short daily market summaries, simple explainers on money ideas, easy-to-read company report cards, Top 10 lists with the ranking rule shown on the page, and free calculators.',
          'Everything is written for someone who has never studied finance. If a word needs a dictionary, we explain it or link to our glossary.',
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
    ],
  },

  contact: {
    title: 'Contact us',
    description: 'How to reach the Dr MoneyWise team.',
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
    description: 'The rules for using Dr MoneyWise and its free and paid memberships.',
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
        heading: 'Memberships and payments',
        paragraphs: [
          'Paid plans renew automatically each month or year until you cancel. You can cancel at any time with "Manage my plan"; you keep access until the end of the period you have paid for.',
          'Payments are not refundable for partial periods, except where the law requires otherwise. If something has gone wrong with a charge, email us within 14 days and we will look into it.',
          'We may change prices in future. Any change will apply from your next renewal, and we will tell you before it does.',
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
