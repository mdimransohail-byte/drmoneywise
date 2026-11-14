/* ════════════════════════════════════════════════════════════════════════
   My watchlist and My portfolio pages (/my/watchlist, /my/portfolio).
   Fills #myApp from /api/member/my-watchlist or /api/member/my-portfolio.
   What appears depends on the member's plan; locked columns show a lock
   and a short note on what joining adds.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var app = document.getElementById('myApp');
  if (!app) return;
  var view = app.getAttribute('data-view');
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var fin = function (v) { return typeof v === 'number' && isFinite(v); };
  var money = function (v) { return fin(v) ? '$' + v.toLocaleString('en-GB', { maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0, minimumFractionDigits: Math.abs(v) < 100 ? 2 : 0 }) : '—'; };
  var pct = function (v, sign) { return fin(v) ? (sign && v > 0 ? '+' : '') + v.toFixed(1) + '%' : '—'; };
  var cls = function (v) { return fin(v) ? (v > 0 ? 'up' : v < 0 ? 'down' : '') : ''; };
  var LOCK = '<span class="my-lock" title="Included with a paid plan">🔒</span>';
  var dateText = function (d) { if (!d) return ''; var x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }

  if (!token) {
    app.innerHTML = '<div class="my-empty"><h1>' + (view === 'watchlist' ? 'My watchlist' : 'My portfolio') + '</h1><p>Sign in to see the companies you follow and own, with prices, report cards and a health check.</p><a class="pf-btn gold" href="/#join">Sign in or join free</a></div>';
    return;
  }

  fetch('/api/member/my-' + view, { headers: { 'x-session-token': token } })
    .then(function (r) { if (r.status === 401) throw new Error('signin'); return r.json(); })
    .then(function (d) { app.innerHTML = view === 'watchlist' ? watchlist(d) : portfolio(d); })
    .catch(function (e) {
      app.innerHTML = e.message === 'signin'
        ? '<div class="my-empty"><h1>Please sign in again</h1><p>Your session has ended.</p><a class="pf-btn gold" href="/#join">Sign in</a></div>'
        : '<div class="my-empty"><p>Your list could not load. Please refresh the page.</p></div>';
    });

  var PLAN = { free: 'Free', regular: 'Regular', premium: 'Premium' };
  function header(title, d, count, noun) {
    return '<div class="my-head"><div><h1>' + title + '</h1><p>' + count + ' ' + (count === 1 ? noun : noun === 'company' ? 'companies' : noun + 's') + ' · your plan: <b class="my-plan ' + d.level + '">' + PLAN[d.level] + '</b></p></div>' +
      '<a class="pf-btn ghost" href="/#tools">Add or remove companies</a></div>';
  }
  function company(c) {
    return '<a class="my-co" href="/stock/' + esc(c.ticker) + '"><b>' + esc(c.name) + '</b><span>' + esc(c.ticker) + (c.sector ? ' · ' + esc(c.sector) : '') + '</span></a>';
  }
  function scoreChip(c) {
    return fin(c.score) ? '<span class="my-score band-' + esc(c.band && c.band.id) + '">' + Math.round(c.score) + '</span>' : '<span class="my-dim">' + (c.covered ? 'Not rated' : 'Not covered') + '</span>';
  }
  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += n >= i ? '★' : n >= i - 0.5 ? '⯪' : '☆'; return '<span class="my-stars">' + s + '</span>'; }
  function upsell(d, what) {
    if (!d.locked.length) return '';
    var reg = d.locked.indexOf('regular') >= 0;
    return '<div class="my-upsell"><div><b>' + (reg ? 'See more about every company you ' + what : 'Get the full health check') + '</b>' +
      '<ul>' + (reg ? '<li><b>Regular:</b> sales growth, profit margin, debt, dividend yield, P/E and the past year’s share price for each company' + (what === 'own' ? ', yearly dividend income and your mix by area of the economy' : '') + '.</li>' : '') +
      '<li><b>Premium:</b> financial-health stars and summary, Shariah status' + (what === 'own' ? ', an overall portfolio score, how well spread you are, warnings and every holding’s checks' : '') + '.</li></ul></div>' +
      '<a class="pf-btn gold" href="/membership#plans">See plans</a></div>';
  }

  /* ── Watchlist ── */
  function watchlist(d) {
    var list = d.companies || [];
    if (!list.length) return header('My watchlist', d, 0, 'company') + '<div class="my-empty"><p>Your watchlist is empty. Add companies on the homepage and they will appear here.</p><a class="pf-btn gold" href="/#tools">Add companies</a></div>';
    var reg = d.level !== 'free', prem = d.level === 'premium';
    var scored = list.filter(function (c) { return fin(c.score); });
    var avg = scored.length ? Math.round(scored.reduce(function (a, c) { return a + c.score; }, 0) / scored.length) : null;
    var recent = list.filter(function (c) { return c.result && (Date.now() - new Date(c.result.filed).getTime()) < 31 * 864e5; }).length;
    var tiles = '<div class="my-tiles">' +
      tile('Companies', list.length, '#2a78d6') +
      tile('Average report card', avg === null ? '—' : avg + '/100', '#1baf7a') +
      tile('Results in the last month', recent, '#c9a227') +
      (prem ? tile('Pass all 5 Shariah standards', list.filter(function (c) { return c.shariah && c.shariah.passes === c.shariah.of; }).length, '#0f8a76') : '') + '</div>';
    var th = '<tr><th>Company</th><th>Price</th><th>Report card</th><th>Latest results</th>' +
      ['Sales growth', 'Profit margin', 'Years to repay debt', 'Dividend yield', 'P/E', 'Share price, 1 year'].map(function (h) { return '<th>' + h + (reg ? '' : ' ' + LOCK) + '</th>'; }).join('') +
      '<th>Financial health' + (prem ? '' : ' ' + LOCK) + '</th><th>Shariah' + (prem ? '' : ' ' + LOCK) + '</th></tr>';
    var rows = list.map(function (c) {
      var L = '<td class="my-dim">' + LOCK + '</td>';
      return '<tr><td>' + company(c) + '</td>' +
        '<td>' + money(c.price) + (c.priceDate ? '<small>' + dateText(c.priceDate) + '</small>' : '') + '</td>' +
        '<td>' + scoreChip(c) + '</td>' +
        '<td class="my-res">' + (c.result ? '<a href="/results#r-' + esc(c.result.id) + '">' + esc(c.result.headline) + '</a><small>' + dateText(c.result.filed) + '</small>' : '<span class="my-dim">—</span>') + '</td>' +
        (reg ? '<td class="' + cls(c.salesGrowth) + '">' + pct(c.salesGrowth, true) + '</td><td>' + pct(c.margin) + '</td><td>' + (fin(c.debtYears) ? (c.debtYears <= 0.05 ? 'No debt' : c.debtYears.toFixed(1) + ' yrs') : '—') + '</td><td>' + pct(c.divYield) + '</td><td>' + (fin(c.pe) ? c.pe.toFixed(1) : '—') + '</td><td class="' + cls(c.ret1y) + '">' + pct(c.ret1y, true) + '</td>' : L + L + L + L + L + L) +
        (prem ? '<td>' + (c.health ? stars(c.health.stars) + '<small>' + esc(c.health.band || '') + '</small>' : '—') + '</td><td>' + (c.shariah ? '<span class="my-sh ' + (c.shariah.passes === c.shariah.of ? 'ok' : c.shariah.passes ? 'part' : 'no') + '">' + c.shariah.passes + ' of ' + c.shariah.of + '</span>' : '—') + '</td>' : L + L) + '</tr>';
    }).join('');
    var notes = prem ? '<h2>What the figures say</h2><div class="my-notes">' + list.filter(function (c) { return c.health && c.health.headline; }).map(function (c) {
      return '<div style="--c:' + esc(c.health.colour || '#2a78d6') + '"><a href="/stock/' + esc(c.ticker) + '"><b>' + esc(c.name) + '</b></a>' + stars(c.health.stars) + '<p>' + esc(c.health.headline) + '</p></div>';
    }).join('') + '</div>' : '';
    return header('My watchlist', d, list.length, 'company') + tiles +
      '<div class="my-scroll"><table class="my-table">' + '<thead>' + th + '</thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="pf-sub">Click a company’s name for its full page: 10 years of results, scenarios, chart check and more. Figures from each company’s SEC filings and the latest closing prices.</p>' +
      notes + upsell(d, 'follow');
  }

  /* ── Portfolio ── */
  function portfolio(d) {
    var hs = d.holdings || [];
    if (!hs.length) return header('My portfolio', d, 0, 'holding') + '<div class="my-empty"><p>Your portfolio is empty. Add what you own on the homepage and it will appear here with its value and a health check.</p><a class="pf-btn gold" href="/#tools">Add holdings</a></div>';
    var reg = d.level !== 'free', prem = d.level === 'premium';
    var facts = {}; (d.companies || []).forEach(function (c) { facts[c.ticker] = c; });
    var t = d.totals || {};
    var tiles = '<div class="my-tiles">' +
      tile('Value today', money(t.value), '#2a78d6') +
      tile('You paid', money(t.cost), '#6b6f80') +
      tile('Gain or loss', fin(t.gain) ? '<i class="' + cls(t.gain) + '">' + pct(t.gain * 100, true) + '</i>' : '—', '#1baf7a') +
      tile('Yearly dividends', reg ? money(t.income) : LOCK, '#c9a227') +
      tile('Portfolio health', prem && d.health && fin(d.health.overall) ? Math.round(d.health.overall) + '/100 <small>' + esc(d.health.band || '') + '</small>' : prem ? '—' : LOCK, '#6250d6') + '</div>';
    var th = '<tr><th>Company</th><th>Shares</th><th>Price paid</th><th>Price now</th><th>Value</th><th>Gain or loss</th><th>Share of portfolio</th><th>Report card</th><th>Yearly dividends' + (reg ? '' : ' ' + LOCK) + '</th><th>Health score' + (prem ? '' : ' ' + LOCK) + '</th></tr>';
    var rows = hs.map(function (h) {
      var c = facts[h.ticker] || { ticker: h.ticker, name: h.ticker };
      return '<tr><td>' + company(c) + '</td><td>' + (fin(h.shares) ? h.shares.toLocaleString('en-GB') : '—') + '</td><td>' + money(h.buyPrice) + '</td><td>' + money(h.price) + (h.priceDate ? '<small>' + dateText(h.priceDate) + '</small>' : '') + '</td><td>' + money(h.value) + '</td>' +
        '<td class="' + cls(h.gain) + '">' + (fin(h.gain) ? pct(h.gain * 100, true) : '—') + '</td>' +
        '<td><span class="my-w"><i style="width:' + Math.round((h.weight || 0) * 100) + '%"></i></span>' + Math.round((h.weight || 0) * 100) + '%</td>' +
        '<td>' + scoreChip(c) + '</td>' +
        '<td>' + (reg ? money(h.income) : '<span class="my-dim">' + LOCK + '</span>') + '</td>' +
        '<td>' + (prem ? (fin(h.healthScore) ? '<b>' + Math.round(h.healthScore) + '</b><small>' + esc(h.healthBand || '') + '</small>' : '—') : '<span class="my-dim">' + LOCK + '</span>') + '</td></tr>';
    }).join('');
    var mix = reg && d.sectors && d.sectors.length ? '<h2>Your mix by area of the economy</h2><div class="my-mix">' + d.sectors.map(function (s, i) {
      var col = ['#2a78d6', '#1baf7a', '#c9a227', '#e5566f', '#6250d6', '#0fa3b1', '#eb6834', '#8a5a2b'][i % 8];
      return '<div><span>' + esc(s.name || 'Other') + '</span><i><b style="width:' + Math.round(s.weight * 100) + '%;background:' + col + '"></b></i><em>' + Math.round(s.weight * 100) + '%</em></div>';
    }).join('') + '</div>' : '';
    var health = '';
    if (prem && d.health) {
      health = '<h2>Your portfolio health check</h2><div class="my-tiles">' +
        tile('Overall', fin(d.health.overall) ? Math.round(d.health.overall) + '/100' : '—', '#6250d6') +
        tile('Your holdings', fin(d.health.holdingsScore) ? Math.round(d.health.holdingsScore) + '/100' : '—', '#1baf7a') +
        tile('How well spread', fin(d.health.spread) ? Math.round(d.health.spread) + '/100 <small>' + esc(d.health.spreadBand || '') + '</small>' : '—', '#2a78d6') + '</div>' +
        (d.health.notes && d.health.notes.length ? '<ul class="my-warn">' + d.health.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
        hs.filter(function (h) { return h.checks && h.checks.length; }).map(function (h) {
          var c = facts[h.ticker] || { name: h.ticker };
          return '<details class="my-checks"><summary><b>' + esc(c.name) + '</b> · ' + (fin(h.healthScore) ? Math.round(h.healthScore) + '/100 ' + esc(h.healthBand || '') : 'not scored') + '</summary><ul>' + h.checks.map(function (k) {
            return '<li><span>' + esc(k.label) + '</span><b>' + (fin(k.score) ? Math.round(k.score) : '—') + '</b><em>' + esc(k.note) + '</em></li>';
          }).join('') + '</ul></details>';
        }).join('') +
        '<p><a class="pf-btn gold" href="/portfolio-health">Open the full health check with heat map</a></p>';
    }
    return header('My portfolio', d, hs.length, 'holding') + tiles +
      '<div class="my-scroll"><table class="my-table">' + '<thead>' + th + '</thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="pf-sub">Click a company’s name for its full page. Values use the latest closing prices in US dollars; prices paid in other currencies are converted at today’s rate.</p>' +
      mix + health + upsell(d, 'own');
  }

  function tile(label, value, colour) {
    return '<div class="my-tile" style="--c:' + colour + '"><span>' + label + '</span><b>' + value + '</b></div>';
  }
})();
