/* ════════════════════════════════════════════════════════════════════════
   FORUM STARTER THREADS — common questions answered by the Dr MoneyWise
   Team, shown openly as "Dr MoneyWise Team" (never as made-up readers).
   Added once from Admin → Forum → "Add starter threads". Safe to press
   twice: threads with the same title are skipped.
   ════════════════════════════════════════════════════════════════════════ */

export const FORUM_STARTERS = [
  // ── Stocks ──
  {
    section: 'stocks', title: 'How do I tell if a company is in good shape before I buy its shares?',
    question: 'A question we hear a lot: with thousands of companies to choose from, what are the simplest things to check before buying a share?',
    answer: 'Start with five plain checks, the same ones on every company report card on this site. Are sales growing? Is it making a profit, and is the profit margin steady? Is its debt under control compared with what it earns? Does it make spare cash (free cash flow) after paying for its business? And if it pays a dividend, can it afford it? No single number tells the whole story, so look at several years, not one. Then ask whether you understand how the company makes money. If you cannot explain it in two sentences, that is a reason to slow down.',
  },
  {
    section: 'stocks', ticker: 'KO', title: 'Why do people call Coca-Cola a "defensive" stock?',
    question: 'Coca-Cola (KO) is often described as defensive. What does that mean in plain English?',
    answer: 'A defensive company sells things people keep buying in good times and bad: drinks, toothpaste, electricity. Its sales usually fall less in a recession, so its share price tends to swing less than the market as a whole. Coca-Cola also has a long record of raising its dividend every year, which appeals to people who want income. The trade-off is that defensive companies usually grow more slowly, so in strong markets they can lag behind faster-growing companies. Defensive means steadier, not safe: the share price can still fall.',
  },
  {
    section: 'stocks', title: 'Should I buy single shares or a fund?',
    question: 'Is it better for a beginner to pick individual companies or buy a fund that holds many?',
    answer: 'A fund that holds hundreds of companies spreads your risk: if one company does badly, it is a small part of the whole. Picking single shares means more research and more risk, because a few companies make up your whole portfolio. Many people do both: a low-cost index fund as the core, and a small slice in companies they have studied and want to follow. Whichever you choose, keep costs low and think in years, not weeks.',
  },
  // ── ETFs & funds ──
  {
    section: 'etfs', title: 'What is the difference between an ETF and a mutual fund?',
    question: 'Both hold lots of investments. So what actually separates an ETF from a mutual fund?',
    answer: 'Both pool your money with other investors and spread it across many holdings. An ETF trades on the stock exchange like a share, so its price moves during the day and you buy it through a broker. A mutual fund is bought from the fund company and priced once a day after the market closes. ETFs are often cheaper and more tax-efficient, but many mutual funds, especially index funds, are low-cost too. The yearly fee (expense ratio) and what the fund holds matter more than the label.',
  },
  {
    section: 'etfs', title: 'How much do fund fees really matter?',
    question: 'A fee of 0.5% versus 0.05% sounds tiny. Does it make a real difference?',
    answer: 'Over long periods, yes. Fees are taken every year, whether the fund goes up or down, and they compound just like returns. On $10,000 growing for 30 years at 7% a year before fees, a 0.05% fee leaves you roughly $75,000, while 0.5% leaves about $66,000: a difference of around $9,000, simply from fees. Try our Monthly investing calculator with different growth rates to see it for yourself.',
  },
  {
    section: 'etfs', title: 'What does "tracking an index" mean?',
    question: 'Funds say they "track the S&P 500" or another index. What does that involve?',
    answer: 'An index is a list of companies chosen by a fixed rule, such as the 500 largest US companies. A fund that tracks it simply buys the companies on the list, in roughly the same proportions, instead of a manager picking favourites. That keeps costs low and means you get close to the market’s return, minus the small fee. You will not beat the market this way, but you are unlikely to fall far behind it.',
  },
  // ── Dividends & income ──
  {
    section: 'dividends', title: 'Is a very high dividend yield a good sign?',
    question: 'Some shares show yields of 8% or 10%. Is that better than a company paying 2%?',
    answer: 'Not necessarily. Yield is the dividend divided by the share price, so a yield jumps when the share price falls, often because investors expect trouble. If profits cannot cover the payout, the dividend may be cut. Check the payout ratio (the share of profits paid out) and whether the company makes enough spare cash to fund it. A modest yield that grows every year is often healthier than a very high one that is under strain.',
  },
  {
    section: 'dividends', title: 'Should I reinvest my dividends or take them as cash?',
    question: 'What is the difference over time between reinvesting dividends and spending them?',
    answer: 'Reinvesting buys more shares, which then pay their own dividends, so your income snowballs over time. Taking cash gives you money to spend now. If you do not need the income yet, reinvesting usually grows your money faster. Our Dividend income calculator shows both: tick or untick "Reinvest my dividends" to compare.',
  },
  {
    section: 'dividends', title: 'Are dividends taxed?',
    question: 'Do I pay tax on dividends, and how much?',
    answer: 'It depends on where you live. In the US, most dividends from shares held long enough are taxed at 0%, 15% or 20% depending on income. In the UK there is a small tax-free allowance, then rates depend on your income band. In India dividends are added to your income. In the UAE individuals pay no tax on them. Tax-free accounts (such as an ISA, Roth IRA or PPF) can shelter dividends. Our calculators let you pick your country; for your own situation, check with a qualified tax adviser.',
  },
  // ── Bonds & interest rates ──
  {
    section: 'bonds', title: 'Why do bond prices fall when interest rates rise?',
    question: 'This one confuses many people. Why would a bond lose value when rates go up?',
    answer: 'A bond pays a fixed amount of interest. If new bonds start paying more because rates rose, nobody will pay full price for your older bond that pays less. So its price drops until its yield matches the new bonds. The longer a bond has left to run, the bigger the drop. If you hold a bond until it ends and the issuer pays in full, you get your money back regardless of the price moves along the way.',
  },
  {
    section: 'bonds', title: 'What happens to my savings when the central bank cuts rates?',
    question: 'News says rates may be cut. What does that mean for my savings account and my loans?',
    answer: 'Banks usually lower the interest they pay on savings soon after a cut, so savers earn less. Borrowers on variable-rate loans or mortgages usually pay less. Fixed-rate loans do not change until the fixed period ends. Bond prices often rise when rates fall. Shares can benefit too, because borrowing gets cheaper for companies, but markets often move before the cut actually happens.',
  },
  {
    section: 'bonds', title: 'Are government bonds safer than company bonds?',
    question: 'How do government bonds compare with bonds issued by companies?',
    answer: 'Bonds from stable governments are usually seen as the lowest-risk, because governments can raise taxes to pay. Company bonds pay more interest to make up for the higher chance that the company cannot pay. Credit ratings (AAA down to junk) are a quick guide to that risk. Higher interest is not free money: it is payment for taking more risk.',
  },
  // ── Crypto ──
  {
    section: 'crypto', title: 'Why do crypto prices swing so much?',
    question: 'Bitcoin can move 10% in a day. Why is crypto so much more volatile than shares?',
    answer: 'Crypto has no profits or dividends to anchor its value, so prices depend mostly on what buyers expect others to pay later. It trades around the clock, much of it with borrowed money, and news or large holders can move prices quickly. That is why many people keep crypto to a small share of their savings, an amount they could afford to see halve.',
  },
  {
    section: 'crypto', title: 'What is a stablecoin and is it risk-free?',
    question: 'Stablecoins aim to stay at $1. Does that make them safe?',
    answer: 'A stablecoin tries to hold a fixed value, usually $1, by keeping reserves such as cash and government bonds. It is only as safe as those reserves and the company behind them. Some stablecoins have lost their $1 value in the past. They are not bank deposits, so they usually have no deposit protection.',
  },
  {
    section: 'crypto', title: 'How do I spot a crypto scam?',
    question: 'What are the warning signs of a crypto scam?',
    answer: 'Watch for promises of fixed or guaranteed returns, pressure to act fast, requests to move to a private chat, "account managers" who contact you first, and sites that let you deposit easily but make withdrawals hard. Never share your wallet recovery words with anyone. If it sounds too good to be true, it almost always is.',
  },
  // ── Retirement & planning ──
  {
    section: 'retirement', title: 'How much do I need to retire?',
    question: 'Is there a simple way to estimate how much I need saved to retire?',
    answer: 'A common rule of thumb is that you can take about 4% of your savings each year in retirement with a good chance of the money lasting around 30 years. So for $30,000 a year you would need roughly $750,000 (30,000 divided by 0.04). Pensions and other income reduce the amount you need. Our Retirement check calculator works this out in today’s money and shows how much extra to save if you are short.',
  },
  {
    section: 'retirement', title: 'Should I pay off debt or invest first?',
    question: 'I have some debt and some spare money each month. Which comes first?',
    answer: 'Paying off expensive debt, such as credit cards, is usually the best "return" you can get: clearing a card charging 25% is like earning 25%. Cheap debt, such as a low-rate mortgage, can sit alongside investing. Many people first build a small emergency fund, then clear expensive debt, then invest. If your employer adds to your pension when you save, it is often worth taking that first.',
  },
  {
    section: 'retirement', title: 'What is an emergency fund and how big should it be?',
    question: 'Everyone says to have an emergency fund. How much, and where should it be kept?',
    answer: 'It is money set aside for surprises such as losing a job or a big repair, so you are not forced to borrow or sell investments at a bad time. Three to six months of essential spending is a common target. Keep it somewhere safe and easy to reach, such as a savings account, not in shares.',
  },
  // ── Markets & economy ──
  {
    section: 'markets', title: 'What does inflation mean for my money?',
    question: 'Prices keep rising. What does inflation actually do to my savings?',
    answer: 'Inflation means each unit of money buys a little less over time. If your savings earn 2% while prices rise 3%, you are losing about 1% of buying power a year. That is why people invest part of their long-term money in things that have historically grown faster than prices, such as shares, while accepting that they go up and down. The latest inflation figure is on our Markets today page.',
  },
  {
    section: 'markets', title: 'Should I sell when the market falls?',
    question: 'When markets drop sharply, is it wise to sell and wait for things to calm down?',
    answer: 'Falls of 10% or more happen in most years, and bigger falls every few years. People who sell in a panic often miss the recovery, because some of the best days come soon after the worst. If your money is meant for the long term and you do not need it soon, many investors simply hold, or keep investing a fixed amount each month. Money you need within a few years is better kept out of shares.',
  },
  {
    section: 'markets', title: 'Why does the stock market react to jobs numbers?',
    question: 'Why do markets move when the monthly jobs figures come out?',
    answer: 'Jobs figures show how strong the economy is. Strong hiring can be good for company profits, but it can also push up wages and prices, making the central bank less likely to cut interest rates. Weak hiring can raise hopes of rate cuts but also signal a slowdown. Markets react to the surprise, the difference between the figure and what was expected.',
  },
  // ── Beginner questions ──
  {
    section: 'beginners', title: 'I have never invested. Where do I start?',
    question: 'What are the first steps for someone who has never invested before?',
    answer: 'A simple order many people follow: build an emergency fund, clear expensive debt, use any tax-friendly accounts in your country, then invest regularly in a low-cost, broad index fund. Start small if you need to; the habit matters more than the amount. Learn one idea at a time: our Learn section and Glossary explain the words you will meet.',
  },
  {
    section: 'beginners', title: 'What is the difference between saving and investing?',
    question: 'Are saving and investing the same thing?',
    answer: 'Saving means keeping money safe and easy to reach, usually in a bank, earning a little interest. Investing means buying things like shares or funds that can grow more over time but can also fall in value. Savings are for short-term needs and emergencies; investing is for goals several years away.',
  },
  {
    section: 'beginners', title: 'How much money do I need to start investing?',
    question: 'Do I need a lot of money to start investing?',
    answer: 'No. Many brokers let you buy funds or fractions of shares with small amounts, and some have no minimum at all. Investing a small amount every month can grow into a meaningful sum over the years, thanks to compound growth. Our Monthly investing calculator shows what regular small amounts could become.',
  },
];
