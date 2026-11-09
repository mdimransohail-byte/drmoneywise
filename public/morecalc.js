/* The simpler calculators on /tools/<slug> (definitions in
   src/services/toolsPages.js EXTRA_CALCS). Nothing typed leaves the device. */
(function () {
  var root = document.querySelector('[data-more-calc]');
  if (!root) return;
  var kind = root.dataset.moreCalc;
  var out = document.getElementById('moreResults');
  var COLOURS = ['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1'];

  function num(id) { var el = document.getElementById(id); var v = el ? parseFloat(el.value) : 0; return isFinite(v) ? v : 0; }
  function sym() { var el = document.getElementById('symbol'); return el ? el.value : '$'; }
  function money(v, s) {
    s = s == null ? sym() : s;
    var n = Math.round(v).toLocaleString('en-GB');
    return (v < 0 ? '-' : '') + s + n.replace('-', '');
  }
  function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tiles(list) {
    return '<div class="mc-tiles">' + list.map(function (t, i) {
      return '<div class="mc-tile" style="--c:' + (t[2] || COLOURS[i % COLOURS.length]) + '"><strong>' + esc(t[1]) + '</strong><span>' + esc(t[0]) + '</span></div>';
    }).join('') + '</div>';
  }
  function bars(title, rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r[1]); })) || 1;
    return '<figure class="lv-chart"><figcaption>' + esc(title) + '</figcaption><div class="lv-bars">' + rows.map(function (r, i) {
      return '<div class="lv-bar" style="--c:' + (r[3] || COLOURS[i % COLOURS.length]) + '"><span class="lv-bl">' + esc(r[0]) + '</span><span class="lv-bt"><i style="width:' + Math.max(2, Math.abs(r[1]) / max * 100).toFixed(1) + '%"></i></span><b>' + esc(r[2]) + '</b></div>';
    }).join('') + '</div></figure>';
  }
  function sentence(text, tone) { return '<p class="mc-sentence ' + (tone || '') + '">' + text + '</p>'; }

  var CALC = {
    'emergency-fund': function () {
      var target = num('essentials') * num('months');
      var gap = Math.max(0, target - num('saved'));
      var m = num('monthly');
      var months = gap === 0 ? 0 : m > 0 ? Math.ceil(gap / m) : null;
      return sentence(gap === 0 ? 'Your safety net is already big enough. Well done.' : months === null ? 'Add a monthly amount to see how long it takes.' : 'At ' + esc(money(m)) + ' a month you would reach your target in <strong>' + months + ' month' + (months === 1 ? '' : 's') + '</strong>' + (months > 12 ? ' (about ' + (months / 12).toFixed(1) + ' years)' : '') + '.', gap === 0 ? 'good' : '') +
        tiles([['Your target', money(target)], ['Saved so far', money(num('saved'))], ['Still to save', money(gap)], ['Time to get there', months === null ? '—' : months === 0 ? 'Done' : months + ' months']]) +
        bars('Progress to your target', [['Saved', num('saved'), money(num('saved')), '#1baf7a'], ['Target', target, money(target), '#2a78d6']]);
    },
    'debt-payoff': function () {
      function run(pay) {
        var bal = num('balance'), r = num('apr') / 100 / 12, interest = 0, months = 0;
        if (pay <= bal * r) return null;
        while (bal > 0.005 && months < 1200) { var i = bal * r; interest += i; bal = bal + i - pay; months++; }
        return { months: months, interest: interest };
      }
      var a = run(num('payment')), b = run(num('payment') + num('extra'));
      if (!a) return sentence('At this payment the interest is more than you pay each month, so the debt would never be cleared. Try a bigger monthly payment.', 'bad');
      var saved = b ? a.interest - b.interest : 0;
      return sentence('Paying ' + esc(money(num('payment'))) + ' a month clears it in <strong>' + a.months + ' months</strong> and costs <strong>' + esc(money(a.interest)) + '</strong> in interest.' + (b && num('extra') > 0 ? ' Adding ' + esc(money(num('extra'))) + ' a month clears it <strong>' + (a.months - b.months) + ' months sooner</strong> and saves <strong>' + esc(money(saved)) + '</strong>.' : '')) +
        tiles([['Months to clear', a.months], ['Interest paid', money(a.interest)], ['With the extra: months', b ? b.months : '—'], ['Interest saved', money(saved)]]) +
        bars('Total interest you pay', [['Your payment', a.interest, money(a.interest), '#e5566f'], ['With the extra', b ? b.interest : 0, b ? money(b.interest) : '—', '#1baf7a']]);
    },
    'education-fund': function () {
      var years = Math.max(0, num('startAge') - num('childAge'));
      var rise = num('costRise') / 100, g = num('rate') / 100;
      var total = 0;
      for (var y = 0; y < num('studyYears'); y++) total += num('cost') * Math.pow(1 + rise, years + y);
      var savedGrown = num('saved') * Math.pow(1 + g, years);
      var gap = Math.max(0, total - savedGrown);
      var n = years * 12, mr = g / 12;
      var monthly = n === 0 ? gap : mr > 0 ? gap * mr / (Math.pow(1 + mr, n) - 1) : gap / n;
      var todayCost = num('cost') * num('studyYears');
      return sentence('In ' + years + ' years, ' + num('studyYears') + ' years of study could cost about <strong>' + esc(money(total)) + '</strong> (' + esc(money(todayCost)) + ' at today’s prices). To have that saved, put away about <strong>' + esc(money(monthly)) + ' a month</strong>.') +
        tiles([['Cost when they start', money(total)], ['Your savings by then', money(savedGrown)], ['Gap to fill', money(gap)], ['Save each month', money(monthly)]]) +
        bars('Cost today and when they start', [['At today’s prices', todayCost, money(todayCost), '#2a78d6'], ['When they start', total, money(total), '#e8a33d'], ['Your savings by then', savedGrown, money(savedGrown), '#1baf7a']]) +
        '<p class="calc-hint">Assumes savings grow at the same rate every year. Real returns go up and down, and education costs vary widely by country and course.</p>';
    },
    'life-cover': function () {
      var incomeNeed = num('income') * num('share') / 100 * num('years');
      var needs = incomeNeed + num('debts') + num('education') + num('funeral');
      var have = num('savings') + num('existing');
      var cover = Math.max(0, needs - have);
      return sentence(cover === 0 ? 'Your savings and existing cover already meet the needs you entered.' : 'Your family might need about <strong>' + esc(money(needs)) + '</strong>. After your savings and existing cover, that leaves a gap of about <strong>' + esc(money(cover)) + '</strong> of extra life cover to look into.', cover === 0 ? 'good' : '') +
        tiles([['Income for your family', money(incomeNeed)], ['Debts to clear', money(num('debts'))], ['Education and one-off costs', money(num('education') + num('funeral'))], ['Extra cover to consider', money(cover)]]) +
        bars('Needs against what you have', [['Total needs', needs, money(needs), '#6250d6'], ['Savings and cover you have', have, money(have), '#1baf7a'], ['The gap', cover, money(cover), '#e5566f']]) +
        '<p class="calc-hint">A rough guide only. An adviser or insurer can look at your full situation, including state benefits and tax.</p>';
    },
    'currency-converter': function () {
      var fx = window.DMW_FX || { usdPer: {} };
      var from = document.getElementById('from').value, to = document.getElementById('to').value;
      var rate = fx.usdPer[from] / fx.usdPer[to];
      if (!isFinite(rate)) return sentence('Rates are loading. Please try again shortly.');
      var amt = num('amount'), fair = amt * rate, got = fair * (1 - num('margin') / 100);
      function f(v, c) { var a = Math.abs(v); return (a > 0 && a < 1 ? v.toLocaleString('en-GB', { maximumSignificantDigits: 4 }) : v.toLocaleString('en-GB', { maximumFractionDigits: a < 100 ? 2 : 0 })) + ' ' + c; }
      return sentence(f(amt, from) + ' is <strong>' + f(fair, to) + '</strong> at today’s reference rate. With a ' + num('margin') + '% margin you would get about <strong>' + f(got, to) + '</strong>: the exchange costs you <strong>' + f(fair - got, to) + '</strong>.') +
        tiles([['1 ' + from + ' =', f(rate, to)], ['1 ' + to + ' =', f(1 / rate, from)], ['You would receive', f(got, to)], ['Cost of the margin', f(fair - got, to)]]) +
        bars('What different margins cost you', [0.5, 1, 3, 5, 10].map(function (m, i) { return [m + '% margin', fair * m / 100, f(fair * m / 100, to), COLOURS[i]]; }));
    },
    'what-if': function () {
      var years = Math.max(1, Math.min(60, Math.round(num('years'))));
      var start = num('start'), monthly = num('monthly'), infl = num('inflation') / 100;
      var cases = [['Poor case', num('poor'), '#e5566f'], ['Middle case', num('base'), '#2a78d6'], ['Good case', num('best'), '#1baf7a']];
      function grow(rate, y) {
        var m = Math.pow(1 + rate / 100, 1 / 12) - 1, v = start;
        for (var i = 0; i < y * 12; i++) v = v * (1 + m) + monthly;
        return v;
      }
      var paidIn = start + monthly * 12 * years;
      var ends = cases.map(function (c) { var v = grow(c[1], years); return { name: c[0], rate: c[1], colour: c[2], v: v, real: v / Math.pow(1 + infl, years) }; });
      var marks = [1, 3, 5, 10, 15, 20, 25, 30, 40].filter(function (y) { return y < years; }).slice(-3).concat([years]);
      var table = '<div class="mc-table-wrap"><table class="mc-table"><thead><tr><th>After</th>' + ends.map(function (e) { return '<th style="color:' + e.colour + '">' + esc(e.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        marks.map(function (y) { return '<tr><td>' + y + ' year' + (y === 1 ? '' : 's') + '</td>' + cases.map(function (c) { return '<td>' + esc(money(grow(c[1], y))) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      return sentence('You would put in <strong>' + esc(money(paidIn)) + '</strong>. After ' + years + ' years that could be <strong>' + esc(money(ends[0].v)) + '</strong> in a poor case, <strong>' + esc(money(ends[1].v)) + '</strong> in the middle case and <strong>' + esc(money(ends[2].v)) + '</strong> in a good case.') +
        tiles(ends.map(function (e) { return [e.name + ' (' + e.rate + '% a year)', money(e.v), e.colour]; }).concat([['Money you put in', money(paidIn), '#c9a227']])) +
        bars('In today’s money, after ' + (infl * 100).toFixed(1) + '% yearly inflation', ends.map(function (e) { return [e.name, e.real, money(e.real), e.colour]; })) +
        table +
        '<p class="calc-hint">Real returns go up and down from year to year; these smooth averages show a range, not a forecast. Fees and tax are not included.</p>';
    },
    'zakat': function () {
      function pick(id, d) { var el = document.getElementById(id); return el ? el.value : d; }
      var basis = pick('basis', 'gold85');
      var grams = { gold85: 85, gold87: 87.48, silver595: 595, silver612: 612.36 }[basis] || 85;
      var isSilver = basis.indexOf('silver') === 0;
      var nisab = grams * num(isSilver ? 'silverGram' : 'goldGram');
      var method = pick('shareMethod', 'proxy');
      var lt = num('longterm') * ({ proxy: 0.25, known: 1, full: 1, dividends: 0 }[method]);
      var jew = pick('jewelleryRule', 'include') === 'include' ? num('jewellery') : 0;
      var parts = [['Cash', num('cash')], ['Gold and silver', num('gold') + jew], ['Crypto', num('crypto')], ['Owed to you', num('owed')], ['Shares to trade', num('trade')], ['Long-term shares', lt], ['Pensions', num('pension')], ['Property to sell', num('propertySale')], ['Business', num('business')]];
      var assets = parts.reduce(function (a, p) { return a + p[1]; }, 0);
      var net = Math.max(0, assets - num('debts'));
      var due = nisab > 0 && net >= nisab ? net * 0.025 : 0;
      var label = (isSilver ? 'silver' : 'gold') + ', ' + grams + ' g';
      var head = nisab <= 0 ? 'Enter the price of ' + (isSilver ? 'silver' : 'gold') + ' per gram to work out the nisab.'
        : net >= nisab ? 'Your zakatable wealth of <strong>' + esc(money(net)) + '</strong> is above the nisab of ' + esc(money(nisab)) + '. Zakat due: <strong>' + esc(money(due)) + '</strong> (2.5%).'
        : 'Your zakatable wealth of <strong>' + esc(money(net)) + '</strong> is below the nisab of ' + esc(money(nisab)) + ', so no zakat is due on it this year.';
      var rows = parts.filter(function (p) { return p[1] > 0; }).map(function (p) { return [p[0], p[1], money(p[1])]; });
      if (num('debts') > 0) rows.push(['Less debts due', -num('debts'), '-' + money(num('debts')), '#e5566f']);
      return sentence(head, due > 0 ? '' : 'good') +
        tiles([['Zakatable wealth', money(net)], ['Nisab (' + label + ')', money(nisab)], ['Zakat due', money(due), '#1baf7a']]) +
        bars('What makes up your zakatable wealth', rows) +
        '<p class="calc-hint">' + (method === 'proxy' && num('longterm') > 0 ? 'Long-term shares counted at 25% of ' + esc(money(num('longterm'))) + '. ' : '') + (num('jewellery') > 0 ? (jew ? 'Worn jewellery included. ' : 'Worn jewellery left out. ') : '') + 'Zakat is due on wealth held for a full lunar year. Enter every amount in the same currency as the gold or silver price.</p>';
    },
    'trade-risk': function () {
      var dep = num('deposit'), lev = Math.max(1, num('leverage')), mv = num('move') / 100;
      var size = dep * lev, loss = size * mv, cost = size * num('spread') / 100;
      var pct = (loss + cost) / dep * 100;
      var wipe = 100 / lev;
      return sentence('With ' + esc(money(dep)) + ' and ' + lev + ' to 1 leverage you control <strong>' + esc(money(size)) + '</strong>. A ' + num('move') + '% move against you loses <strong>' + esc(money(loss)) + '</strong> plus about ' + esc(money(cost)) + ' in costs: <strong>' + Math.min(999, pct).toFixed(0) + '% of your money</strong>. A move of just <strong>' + wipe.toFixed(1) + '%</strong> would wipe out your whole deposit.', pct >= 50 ? 'bad' : '') +
        tiles([['Position you control', money(size)], ['Loss on the move', money(loss), '#e5566f'], ['Share of your money lost', Math.min(999, pct).toFixed(0) + '%', '#e5566f'], ['Move that wipes you out', wipe.toFixed(1) + '%', '#6250d6']]) +
        bars('Your loss from a ' + num('move') + '% move, by leverage', [1, 5, 10, 30, 100].map(function (l, i) { var x = dep * l * mv; return [l + ' to 1', Math.min(x, dep * 3), money(x), ['#1baf7a', '#2a78d6', '#e8a33d', '#e5566f', '#a3283b'][i]]; })) +
        '<p class="calc-hint">Most people who trade currencies and commodities with leverage (for example through CFDs) lose money. Brokers in the UK and EU must show what share of their customers lose.</p>';
    },
  };

  function update() {
    var s = sym();
    root.querySelectorAll('[data-symbol]').forEach(function (el) { el.textContent = s.trim() || '$'; });
    try { out.innerHTML = CALC[kind] ? CALC[kind]() : ''; } catch (e) { out.innerHTML = '<p class="calc-hint">Please check the numbers you typed.</p>'; }
  }
  /* Currency picker with flags and a search box. The plain <select> stays in
     the page (hidden) so the sums above keep reading its value. */
  function flagImg(cc) { return cc ? '<img src="' + ((window.DMW_FX && window.DMW_FX.flagBase) || '/flags/') + cc + '.svg" alt="" width="24" height="18" loading="lazy">' : ''; }
  function enhance(sel) {
    var opts = Array.prototype.map.call(sel.options, function (o) { return { v: o.value, t: o.textContent, f: o.dataset.flag, g: o.parentNode.label || '' }; });
    var box = document.createElement('div'); box.className = 'fxp';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fxp-btn'; btn.setAttribute('aria-haspopup', 'listbox');
    var panel = document.createElement('div'); panel.className = 'fxp-panel'; panel.hidden = true;
    panel.innerHTML = '<input type="search" class="fxp-q" placeholder="Search a country or currency" aria-label="Search currencies"><ul class="fxp-list" role="listbox"></ul>';
    var q = panel.querySelector('.fxp-q'), ul = panel.querySelector('.fxp-list');
    function show() { var o = opts.filter(function (x) { return x.v === sel.value; })[0]; btn.innerHTML = o ? flagImg(o.f) + '<b>' + esc(o.v) + '</b><span>' + esc(o.t.split(' · ')[1] || '') + '</span><i aria-hidden="true">▾</i>' : 'Choose'; }
    function list() {
      var term = q.value.trim().toLowerCase(), last = '';
      ul.innerHTML = opts.filter(function (o) { return !term || o.t.toLowerCase().indexOf(term) >= 0; }).map(function (o) {
        var head = !term && o.g !== last ? '<li class="fxp-g">' + esc(last = o.g) + '</li>' : '';
        return head + '<li role="option" data-v="' + esc(o.v) + '"' + (o.v === sel.value ? ' aria-selected="true"' : '') + '>' + flagImg(o.f) + '<b>' + esc(o.v) + '</b><span>' + esc(o.t.split(' · ')[1] || '') + '</span></li>';
      }).join('') || '<li class="fxp-g">No currency matches that</li>';
    }
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () { var open = panel.hidden; document.querySelectorAll('.fxp-panel').forEach(function (p) { p.hidden = true; }); if (open) { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); q.value = ''; list(); q.focus(); } });
    q.addEventListener('input', function (e) { e.stopPropagation(); list(); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); if (e.key === 'Enter') { e.preventDefault(); var first = ul.querySelector('[data-v]'); if (first) first.click(); } });
    ul.addEventListener('click', function (e) { var li = e.target.closest('[data-v]'); if (!li) return; sel.value = li.dataset.v; show(); close(); sel.dispatchEvent(new Event('change', { bubbles: true })); });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
    sel.addEventListener('change', show);
    sel.hidden = true; sel.parentNode.insertBefore(box, sel); box.appendChild(btn); box.appendChild(panel); box.appendChild(sel);
    show();
  }
  root.querySelectorAll('select.fxp-sel').forEach(enhance);
  var swap = root.querySelector('.fxp-swap');
  if (swap) swap.addEventListener('click', function () {
    var a = document.getElementById('from'), b = document.getElementById('to'), t = a.value;
    a.value = b.value; b.value = t;
    a.dispatchEvent(new Event('change', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true }));
  });

  root.addEventListener('input', update);
  root.addEventListener('change', update);
  update();
})();
