/* ════════════════════════════════════════════════════════════════════════
   Dr MoneyWise money calculators (runs in the visitor's browser)
   Page markup comes from src/services/toolsPages.js; country settings are
   embedded by the server as window.DMW_TAX (from src/data/taxPresets.js).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  const root = document.querySelector('[data-calc]');
  if (!root) return;
  const kind = root.dataset.calc;
  const presets = window.DMW_TAX || {};
  const $ = (id) => document.getElementById(id);
  const num = (id) => {
    const el = $(id);
    if (!el) return 0;
    const v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(v) ? v : 0;
  };
  const checked = (id) => Boolean($(id)?.checked);

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode: ignore */ }
  }
  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  let country = recall('dmw-country') || 'us';
  if (!presets[country]) country = 'us';

  function money(value) {
    const p = presets[country] || presets.us;
    try {
      return new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(Math.round(value));
    } catch (e) {
      return `${p.symbol}${Math.round(value).toLocaleString()}`;
    }
  }

  /* ── Country switch: currency + default tax rates + notes ─────────── */
  function applyCountry(fillRates) {
    const p = presets[country];
    document.querySelectorAll('[data-symbol]').forEach((el) => { el.textContent = p.symbol.trim(); });
    if (fillRates) {
      if ($('gainsRate')) $('gainsRate').value = p.gainsRate;
      if ($('gainsAllowance')) $('gainsAllowance').value = p.gainsAllowance;
      if ($('dividendRate')) $('dividendRate').value = p.dividendRate;
      if ($('dividendAllowance')) $('dividendAllowance').value = p.dividendAllowance;
    }
    const notes = $('taxNotes');
    if (notes) {
      notes.innerHTML = '';
      [...p.notes, `Tax-friendly accounts: ${p.taxFreeAccounts}`].forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        notes.appendChild(li);
      });
    }
    const label = $('countryLabel');
    if (label) label.textContent = p.label;
  }

  const select = $('country');
  if (select) {
    select.value = country;
    select.addEventListener('change', () => {
      country = select.value;
      store('dmw-country', country);
      applyCountry(true);
      calculate();
    });
  }
  applyCountry(true);

  /* ── Growth maths ──────────────────────────────────────────────────── */
  function grow({ start, monthly, years, ratePct, stepUpPct = 0 }) {
    const monthlyRate = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
    let value = start;
    let paidIn = start;
    let contribution = monthly;
    const yearly = [];
    for (let y = 1; y <= years; y += 1) {
      for (let m = 0; m < 12; m += 1) {
        value = value * (1 + monthlyRate) + contribution;
        paidIn += contribution;
      }
      yearly.push({ year: y, value, paidIn });
      contribution *= 1 + stepUpPct / 100;
    }
    return { value, paidIn, yearly };
  }

  function gainsTax(gain) {
    if (checked('taxFree')) return 0;
    const taxable = Math.max(0, gain - num('gainsAllowance'));
    return taxable * (num('gainsRate') / 100);
  }

  /* ── Output helpers ───────────────────────────────────────────────── */
  function setResult(rows, sentence) {
    const box = $('results');
    box.innerHTML = '';
    const dl = document.createElement('dl');
    dl.className = 'calc-results';
    rows.forEach(([label, value, strong]) => {
      const div = document.createElement('div');
      if (strong) div.className = 'main';
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      div.append(dt, dd);
      dl.appendChild(div);
    });
    box.appendChild(dl);
    if (sentence) {
      const p = document.createElement('p');
      p.className = 'calc-sentence';
      p.textContent = sentence;
      box.appendChild(p);
    }
  }

  function drawBars(yearly) {
    const chart = $('chart');
    if (!chart) return;
    chart.innerHTML = '';
    if (!yearly.length) return;
    const step = Math.max(1, Math.ceil(yearly.length / 10));
    const points = yearly.filter((row, i) => (i + 1) % step === 0 || i === yearly.length - 1);
    const max = Math.max(...points.map((p) => p.value), 1);
    points.forEach((p) => {
      const col = document.createElement('div');
      col.className = 'calc-col';
      col.title = `Year ${p.year}: ${money(p.value)} (you put in ${money(p.paidIn)})`;
      const bar = document.createElement('div');
      bar.className = 'calc-bar';
      bar.style.height = `${(p.value / max) * 100}%`;
      const growth = document.createElement('span');
      growth.className = 'calc-growth';
      growth.style.flex = String(Math.max(p.value - p.paidIn, 0));
      const paid = document.createElement('span');
      paid.className = 'calc-paid';
      paid.style.flex = String(Math.min(p.paidIn, p.value));
      bar.append(growth, paid);
      const label = document.createElement('span');
      label.className = 'calc-year';
      label.textContent = `Yr ${p.year}`;
      col.append(bar, label);
      chart.appendChild(col);
    });
  }

  /* ── The four calculators ─────────────────────────────────────────── */
  function calculate() {
    if (kind === 'savings-growth' || kind === 'monthly-investing') {
      const years = Math.min(Math.max(Math.round(num('years')), 1), 60);
      const r = grow({
        start: num('start'),
        monthly: kind === 'monthly-investing' ? num('monthly') : 0,
        years,
        ratePct: num('rate'),
        stepUpPct: kind === 'monthly-investing' ? num('stepUp') : 0,
      });
      const growth = r.value - r.paidIn;
      const tax = gainsTax(growth);
      setResult([
        ['After ' + years + ' years (before tax)', money(r.value), true],
        ['Money you put in', money(r.paidIn)],
        ['Growth', money(growth)],
        ['Tax if you sold everything then', money(tax)],
        ['What you keep after tax', money(r.value - tax), true],
      ], `Your money could grow to ${money(r.value)}, of which ${money(growth)} is growth on top of the ${money(r.paidIn)} you put in. Returns are never guaranteed: real markets go up and down along the way.`);
      drawBars(r.yearly);
      return;
    }

    if (kind === 'retirement') {
      const age = num('age');
      const retireAge = Math.max(num('retireAge'), age + 1);
      const years = Math.min(Math.round(retireAge - age), 60);
      const inflation = num('inflation') / 100;
      const r = grow({ start: num('start'), monthly: num('monthly'), years, ratePct: num('rate') });
      const todayMoney = r.value / Math.pow(1 + inflation, years);
      const withdrawal = num('withdrawal') / 100;
      const monthlyIncome = (todayMoney * withdrawal) / 12;
      const wanted = num('wanted');
      const gap = wanted - monthlyIncome;
      let extra = 0;
      if (gap > 0) {
        // extra monthly saving that closes the gap (simple search)
        let lo = 0;
        let hi = Math.max(wanted * 10, 1000);
        for (let i = 0; i < 50; i += 1) {
          const mid = (lo + hi) / 2;
          const t = grow({ start: num('start'), monthly: num('monthly') + mid, years, ratePct: num('rate') });
          const income = ((t.value / Math.pow(1 + inflation, years)) * withdrawal) / 12;
          if (income >= wanted) hi = mid; else lo = mid;
        }
        extra = hi;
      }
      setResult([
        [`Savings at age ${Math.round(retireAge)}`, money(r.value), true],
        ["Worth in today's money", money(todayMoney)],
        ["Monthly income it could give (today's money)", money(monthlyIncome), true],
        ['Monthly income you want', money(wanted)],
        [gap > 0 ? 'Extra to save each month to get there' : 'You are on track', gap > 0 ? money(extra) : 'Yes'],
      ], gap > 0
        ? `You may fall short by about ${money(gap)} a month. Saving roughly ${money(extra)} more each month could close the gap.`
        : `On these assumptions you could take about ${money(monthlyIncome)} a month in today's money, at or above your target.`);
      drawBars(r.yearly);
      return;
    }

    if (kind === 'dividend-income') {
      const amount = num('amount');
      const yieldPct = num('yield') / 100;
      const growthPct = num('divGrowth') / 100;
      const years = Math.min(Math.max(Math.round(num('years')), 1), 50);
      const reinvest = checked('reinvest');
      const taxRate = checked('taxFree') ? 0 : num('dividendRate') / 100;
      const allowance = checked('taxFree') ? Infinity : num('dividendAllowance');
      const afterTax = (d) => d - Math.max(0, d - allowance) * taxRate;

      // Model: share price and dividend both grow at the dividend growth rate,
      // so the yield on today's price stays the same; reinvesting buys more shares.
      const firstYear = amount * yieldPct;
      let units = 1;
      let price = amount;
      let dividendPerUnit = amount * yieldPct;
      const yearly = [];
      let lastIncome = firstYear;
      for (let y = 1; y <= years; y += 1) {
        const income = units * dividendPerUnit;
        lastIncome = income;
        if (reinvest) units += afterTax(income) / price;
        price *= 1 + growthPct;
        dividendPerUnit *= 1 + growthPct;
        yearly.push({ year: y, value: units * price, paidIn: amount });
      }
      setResult([
        ['Dividends in year 1 (before tax)', money(firstYear), true],
        ['Year 1 after tax', money(afterTax(firstYear))],
        ['About per month after tax', money(afterTax(firstYear) / 12)],
        [`Dividends in year ${years} (before tax)`, money(lastIncome), true],
        [`Year ${years} per month after tax`, money(afterTax(lastIncome) / 12)],
      ], `${money(amount)} at a ${num('yield')}% yield pays about ${money(firstYear)} a year to start. If dividends grow ${num('divGrowth')}% a year${reinvest ? ' and you reinvest them' : ''}, that could reach ${money(lastIncome)} a year by year ${years}. Dividends are not guaranteed and can be cut.`);
      drawBars(reinvest ? yearly : []);
      const legend = $('chartWrap');
      if (legend) legend.hidden = !reinvest;
    }
  }

  root.addEventListener('input', calculate);
  root.addEventListener('change', calculate);
  calculate();
}());
