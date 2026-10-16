/* ════════════════════════════════════════════════════════════════════════
   REPORT CARD — turns a company's SEC numbers into five plain-English
   ratings (good / okay / weak). Pure code, no writing engine involved, so
   the ratings always match the numbers.

   These are descriptions of the company's health, NOT buy/sell advice.
   Thresholds are deliberately simple and are shown on the page under
   "How we rate".
   ════════════════════════════════════════════════════════════════════════ */

export const RATING_RULES = [
  'Growth: sales up more than 5% on the year before = good; 0–5% = okay; down = weak.',
  'Profit: keeps more than 10 cents of every $1 of sales as profit = good; 0–10 cents = okay; a loss = weak.',
  'Debt: could repay long-term debt with under 3 years of its cash from operations = good; 3–6 years = okay; more = weak.',
  'Cash: makes more cash than it spends on running and investing in the business = good; otherwise weak.',
  'Dividend: raised 10+ years in a row and paid for by spare cash = good; pays one = okay; none = not rated.',
];

export function formatMoney(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)} trillion`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)} billion`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)} million`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

const latest = (series) => series?.at?.(-1)?.value ?? null;

export function buildReportCard(company) {
  const d = company?.derived || {};
  const ratings = [];

  // 1. Growth
  if (d.revenueGrowth !== null && d.revenueGrowth !== undefined) {
    const g = d.revenueGrowth;
    ratings.push({
      key: 'growth',
      label: 'Is it growing?',
      grade: g > 0.05 ? 'good' : g >= 0 ? 'okay' : 'weak',
      plain: g > 0.05
        ? `Yes. Sales grew ${formatPercent(g)} last year.`
        : g >= 0 ? `Slowly. Sales grew ${formatPercent(g)} last year.` : `No. Sales fell ${formatPercent(Math.abs(g))} last year.`,
    });
  }

  // 2. Profit
  if (d.profitMargin !== null && d.profitMargin !== undefined) {
    const cents = Math.round(d.profitMargin * 100);
    ratings.push({
      key: 'profit',
      label: 'Does it make a profit?',
      grade: d.profitMargin > 0.10 ? 'good' : d.profitMargin >= 0 ? 'okay' : 'weak',
      plain: d.profitMargin >= 0
        ? `Yes. It keeps about ${cents} cents of every $1 of sales.`
        : `No. It lost ${formatMoney(Math.abs(latest(company.netIncome) || 0))} last year.`,
    });
  }

  // 3. Debt
  const ocf = latest(company.operatingCashFlow);
  if (company.longTermDebt !== null && company.longTermDebt !== undefined && ocf) {
    const years = ocf > 0 ? company.longTermDebt / ocf : Infinity;
    ratings.push({
      key: 'debt',
      label: 'Is its debt under control?',
      grade: years < 3 ? 'good' : years <= 6 ? 'okay' : 'weak',
      plain: company.longTermDebt <= 0
        ? 'It has no long-term debt.'
        : years === Infinity
          ? `It owes ${formatMoney(company.longTermDebt)} and is not making cash from operations to repay it.`
          : `It owes ${formatMoney(company.longTermDebt)}, about ${years.toFixed(1)} years of the cash its business brings in.`,
    });
  } else if (company.longTermDebt === 0) {
    ratings.push({ key: 'debt', label: 'Is its debt under control?', grade: 'good', plain: 'It has no long-term debt.' });
  }

  // 4. Cash
  if (d.freeCashFlow !== null && d.freeCashFlow !== undefined) {
    ratings.push({
      key: 'cash',
      label: 'Does it make spare cash?',
      grade: d.freeCashFlow > 0 ? 'good' : 'weak',
      plain: d.freeCashFlow > 0
        ? `Yes. ${formatMoney(d.freeCashFlow)} left over after running and investing in the business.`
        : `No. It spent ${formatMoney(Math.abs(d.freeCashFlow))} more than it brought in.`,
    });
  }

  // 5. Dividend
  const dps = d.latestDividendPerShare;
  if (dps && dps > 0) {
    const years = d.yearsOfDividendRaises || 0;
    const covered = d.dividendCoveredByCash !== false;
    ratings.push({
      key: 'dividend',
      label: 'Does it pay you a dividend?',
      grade: years >= 10 && covered ? 'good' : covered ? 'okay' : 'weak',
      plain: `Yes, $${dps.toFixed(2)} a share last year${years >= 2 ? `, raised ${years} years in a row` : ''}.${covered ? '' : ' But it paid out more than its spare cash.'}`,
    });
  } else {
    ratings.push({ key: 'dividend', label: 'Does it pay you a dividend?', grade: 'none', plain: 'No. It keeps its profits in the business instead.' });
  }

  return ratings;
}

export const GRADE_TEXT = { good: 'Good', okay: 'Okay', weak: 'Weak', none: 'Not rated' };
