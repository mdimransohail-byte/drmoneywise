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
      function f(v, c) { return v.toLocaleString('en-GB', { maximumFractionDigits: v < 100 ? 2 : 0 }) + ' ' + c; }
      return sentence(f(amt, from) + ' is <strong>' + f(fair, to) + '</strong> at today’s reference rate. With a ' + num('margin') + '% margin you would get about <strong>' + f(got, to) + '</strong>: the exchange costs you <strong>' + f(fair - got, to) + '</strong>.') +
        tiles([['1 ' + from + ' =', f(rate, to)], ['1 ' + to + ' =', f(1 / rate, from)], ['You would receive', f(got, to)], ['Cost of the margin', f(fair - got, to)]]) +
        bars('What different margins cost you', [0.5, 1, 3, 5, 10].map(function (m, i) { return [m + '% margin', fair * m / 100, f(fair * m / 100, to), COLOURS[i]]; }));
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
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  update();
})();
