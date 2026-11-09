/* ════════════════════════════════════════════════════════════════════════
   Company bosses' trades (Premium) — the /insiders page and the box on
   each US company page. Data from /api/insiders (SEC Form 4 reports).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var page = document.getElementById('inApp');
  var box = document.getElementById('insidersContent');
  if (!page && !box) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var big = function (v) { if (v == null) return '—'; var a = Math.abs(v); return (v < 0 ? '−' : '') + '$' + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'bn' : a >= 1e6 ? (a / 1e6).toFixed(1) + 'm' : a >= 1e3 ? (a / 1e3).toFixed(0) + 'k' : Math.round(a)); };
  var count = function (v) { return v == null ? '—' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'm' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v)); };
  var day = function (iso) {
    var d = new Date(String(iso || '').slice(0, 10) + 'T00:00:00Z');
    return isNaN(d.getTime()) ? (iso || '') : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };
  var nTrades = function (n) { return (n || 0) + (n === 1 ? ' trade' : ' trades'); };
  var GREEN = '#1baf7a', ORANGE = '#eb6834', GOLD = '#c9a227', GREY = '#a7adc2';

  function api(url) {
    return fetch(url, { headers: token ? { 'x-session-token': token } : {} }).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'error'); e.status = r.status; throw e; } return d; });
    });
  }

  function donut(slices, center, sub) {
    var total = slices.reduce(function (a, s) { return a + s.v; }, 0);
    if (!total) return '<p class="pf-sub">Nothing to show for this period.</p>';
    var R = 80, r = 50, a0 = -Math.PI / 2, paths = '';
    var P = function (rad, a) { return (100 + rad * Math.cos(a)).toFixed(2) + ',' + (100 + rad * Math.sin(a)).toFixed(2); };
    var live = slices.filter(function (s) { return s.v > 0; });
    live.forEach(function (s) {
      if (live.length === 1) { paths += '<circle cx="100" cy="100" r="65" fill="none" stroke="' + s.c + '" stroke-width="30"/>'; return; }
      var a1 = a0 + (s.v / total) * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
      paths += '<path d="M' + P(R, a0) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + P(R, a1) + ' L' + P(r, a1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + P(r, a0) + 'Z" fill="' + s.c + '" stroke="#fbf7ef" stroke-width="2"><title>' + esc(s.label) + '</title></path>';
      a0 = a1;
    });
    return '<div class="sc-donut"><svg viewBox="0 0 200 200" role="img">' + paths + '<text x="100" y="98" text-anchor="middle" font-size="24" font-weight="800" fill="#0a1128">' + esc(center) + '</text><text x="100" y="118" text-anchor="middle" font-size="11" fill="#4a5170">' + esc(sub) + '</text></svg>' +
      '<ul class="sc-legend">' + slices.map(function (s) { return '<li><i style="background:' + s.c + '"></i><span>' + esc(s.label) + '</span><b>' + esc(s.text) + '</b></li>'; }).join('') + '</ul></div>';
  }

  /** Net buying (green, right) or selling (orange, left) per company. */
  function netBars(list) {
    if (!list.length) return '<p class="pf-sub">No market buys or sells in this period.</p>';
    var max = Math.max.apply(null, list.map(function (x) { return Math.abs(x.net); }).concat([1]));
    return '<div class="in-net">' + list.map(function (x) {
      var w = Math.max(2, Math.abs(x.net) / max * 50);
      var bar = x.net >= 0 ? '<i class="buy" style="left:50%;width:' + w + '%"></i>' : '<i class="sell" style="left:' + (50 - w) + '%;width:' + w + '%"></i>';
      return '<div class="in-net-row"><a href="/stock/' + esc(x.ticker) + '"><b>' + esc(x.ticker) + '</b> ' + esc(x.company) + '</a><div class="in-net-track"><span class="in-zero"></span>' + bar + '</div><em class="' + (x.net >= 0 ? 'up' : 'down') + '">' + (x.net >= 0 ? '+' : '') + big(x.net) + '</em></div>';
    }).join('') + '</div><p class="pf-sub">Green = more bought than sold; orange = more sold than bought (value of shares, last ' + S.days + ' days).</p>';
  }

  function tradeRows(trades, showCompany) {
    if (!trades.length) return '<p class="pf-sub">No market buys or sells to show.</p>';
    return '<div class="sc-table-wrap"><table class="sc-table in-table"><thead><tr><th>Date</th>' + (showCompany ? '<th>Company</th>' : '') + '<th>Who</th><th>Bought or sold</th><th>Shares</th><th>Price</th><th>Value</th><th>Shares owned after</th><th></th></tr></thead><tbody>' +
      trades.map(function (t) {
        return '<tr><td>' + esc(day(t.date)) + '</td>' + (showCompany ? '<td class="sc-co"><a href="/stock/' + esc(t.ticker) + '"><b>' + esc(t.ticker) + '</b> ' + esc(t.company) + '</a></td>' : '') +
          '<td><b>' + esc(t.owner) + '</b><small class="in-role">' + esc(t.role) + '</small></td>' +
          '<td><span class="sc-tag ' + (t.side === 'buy' ? 'up' : 'down') + '">' + (t.side === 'buy' ? '▲ Bought' : '▼ Sold') + '</span>' + (t.planned ? ' <span class="sc-tag" title="Arranged in advance under a 10b5-1 plan">Planned</span>' : '') + '</td>' +
          '<td>' + count(t.shares) + '</td><td>' + (t.price ? '$' + t.price.toFixed(2) : '—') + '</td><td><b>' + big(t.value) + '</b></td><td>' + count(t.after) + '</td>' +
          '<td><a href="' + esc(t.url) + '" target="_blank" rel="noopener">Form 4</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var S = { days: 90, side: 'all', mine: false, data: null };

  /* ── The /insiders page ── */
  function drawPage() {
    var d = S.data, t = d.totals;
    var mineSet = {}; (d.mine || []).forEach(function (x) { mineSet[x] = 1; });
    var trades = d.trades.filter(function (x) { return (S.side === 'all' || x.side === S.side) && (!S.mine || mineSet[x.ticker]); });
    var companies = d.companies.filter(function (x) { return !S.mine || mineSet[x.ticker]; });
    var buyers = companies.filter(function (x) { return x.net > 0; }).sort(function (a, b) { return b.net - a.net; }).slice(0, 8);
    var sellers = companies.filter(function (x) { return x.net < 0; }).sort(function (a, b) { return a.net - b.net; }).slice(0, 8);
    var biggest = d.trades.filter(function (x) { return x.side === 'buy' && (!S.mine || mineSet[x.ticker]); }).sort(function (a, b) { return (b.value || 0) - (a.value || 0); }).slice(0, 4);
    var plannedPct = t.sold ? Math.round(t.plannedSold / t.sold * 100) : null;
    page.innerHTML =
      '<div class="sc-hero"><div><span class="pf-badge prem">★ Premium</span><h1>Company bosses’ trades</h1><p>When directors and top managers of the companies we cover bought or sold their own company’s shares on the stock market, from their official Form 4 reports.</p></div>' +
      '<div class="sc-tabs">' + [30, 90, 180].map(function (n) { return '<button data-days="' + n + '" class="' + (S.days === n ? 'on' : '') + '">' + n + ' days</button>'; }).join('') + '</div></div>' +
      '<div class="pr-tiles">' +
        tileHtml('Bought on the market', big(t.bought), nTrades(t.buys), GREEN) +
        tileHtml('Sold on the market', big(t.sold), nTrades(t.sells), ORANGE) +
        tileHtml('Companies where bosses bought', String(t.companiesBuying), 'of ' + d.companies.length + ' with trades', '#2a78d6') +
        tileHtml('Sales planned in advance', plannedPct == null ? '—' : plannedPct + '%', 'of the value sold (10b5-1 plans)', GOLD) +
      '</div>' +
      '<div class="sc-charts"><div class="pf-panel"><h2>Bought vs sold</h2>' + donut([{ label: 'Bought', v: t.bought, c: GREEN, text: big(t.bought) }, { label: 'Sold', v: t.sold, c: ORANGE, text: big(t.sold) }], (t.bought + t.sold) ? Math.round(t.bought / (t.bought + t.sold) * 100) + '%' : '–', 'bought') +
        '<h2 style="margin-top:18px">How the sales were made</h2>' + donut([{ label: 'Planned in advance', v: t.plannedSold, c: GOLD, text: big(t.plannedSold) }, { label: 'Not planned', v: Math.max(0, t.sold - t.plannedSold), c: ORANGE, text: big(Math.max(0, t.sold - t.plannedSold)) }], plannedPct == null ? '–' : plannedPct + '%', 'planned') + '</div>' +
        '<div class="pf-panel"><h2>Where bosses were buying and selling</h2>' + netBars(buyers.concat(sellers)) + '</div></div>' +
      (biggest.length ? '<div class="pf-panel"><h2>Biggest purchases</h2><div class="in-cards">' + biggest.map(function (x) {
        return '<a class="in-card" href="/stock/' + esc(x.ticker) + '"><span class="sc-tag up">▲ Bought</span><strong>' + big(x.value) + '</strong><b>' + esc(x.company) + ' (' + esc(x.ticker) + ')</b><span>' + esc(x.owner) + ', ' + esc(x.role) + '</span><em>' + count(x.shares) + ' shares at $' + (x.price || 0).toFixed(2) + ' · ' + esc(day(x.date)) + '</em></a>';
      }).join('') + '</div></div>' : '') +
      '<div class="pf-panel"><div class="in-filter">' +
        [['all', 'All trades'], ['buy', 'Buys only'], ['sell', 'Sales only']].map(function (o) { return '<button class="sc-preset' + (S.side === o[0] ? ' on' : '') + '" data-side="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
        ((d.mine || []).length ? '<label class="sc-check"><input type="checkbox" data-mine' + (S.mine ? ' checked' : '') + '> Only my watchlist and portfolio</label>' : '') +
      '</div><h2>Every trade, newest first</h2>' + tradeRows(trades.slice(0, 150), true) + (trades.length > 150 ? '<p class="pf-sub">Showing the newest 150.</p>' : '') + '</div>' +
      '<p class="pf-sub">Checked every hour' + (d.updatedAt ? '; last new report read ' + esc(new Date(d.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '') + '. Source: SEC Form 4 reports.</p>';
    page.querySelectorAll('[data-days]').forEach(function (b) { b.addEventListener('click', function () { S.days = Number(b.dataset.days); loadPage(); }); });
    page.querySelectorAll('[data-side]').forEach(function (b) { b.addEventListener('click', function () { S.side = b.dataset.side; drawPage(); }); });
    var m = page.querySelector('[data-mine]'); if (m) m.addEventListener('change', function () { S.mine = m.checked; drawPage(); });
  }
  function tileHtml(label, value, note, colour) { return '<div class="pr-tile" style="border-top-color:' + colour + '"><span class="pr-tile-label">' + esc(label) + '</span><strong>' + esc(value) + '</strong><span class="pr-tile-note">' + esc(note) + '</span></div>'; }

  function previewPage(text) {
    fetch('/api/site/insiders-preview').then(function (r) { return r.json(); }).then(function (d) {
      var t = d.totals || {};
      page.innerHTML = '<div class="sc-hero"><div><span class="pf-badge prem">★ Premium</span><h1>Company bosses’ trades</h1><p>When directors and top managers of the companies we cover bought or sold their own company’s shares, from their official Form 4 reports.</p></div></div>' +
        '<div class="pf-upsell"><strong>' + esc(text) + '</strong><a class="pf-btn gold" href="/membership#plans">See Premium</a></div>' +
        '<div class="pr-tiles">' + tileHtml('Bought on the market', big(t.bought), nTrades(t.buys) + ' in 90 days', GREEN) + tileHtml('Sold on the market', big(t.sold), nTrades(t.sells) + ' in 90 days', ORANGE) + tileHtml('Companies with trades', String(d.companies || 0), 'names shown to Premium members', '#2a78d6') + '</div>' +
        '<div class="pf-panel in-locked"><h2>Premium members see</h2><ul class="plain-list"><li>Every market buy and sale by directors and top managers, with who, what job, how many shares, the price and what they own afterwards</li><li>Which companies’ bosses were buying most, and which were selling, as colour charts</li><li>Which sales were planned months in advance, so you can tell routine selling from a real choice</li><li>A filter for just the companies on your watchlist and in your portfolio</li><li>The same box on every company’s page</li></ul></div>';
    }).catch(function () { page.innerHTML = '<p class="note-box">This page could not load. Please try again.</p>'; });
  }
  function loadPage() {
    api('/api/insiders?days=' + S.days).then(function (d) {
      S.data = d;
      try { drawPage(); } catch (err) { console.error(err); page.innerHTML = '<p class="note-box">The trades could not be shown (' + esc(err.message) + '). Please tell us.</p>'; }
    }).catch(function (e) {
      if (e.status === 401) previewPage('Sign in with a Premium membership to see every trade.');
      else if (e.status === 403) previewPage('Company bosses’ trades are part of Premium.');
      else page.innerHTML = '<p class="note-box">The trades could not load (' + esc(e.message) + '). Please try again in a minute.</p>';
    });
  }

  /* ── The box on a company page ── */
  function loadBox() {
    var ticker = document.getElementById('insidersBox').dataset.ticker;
    var lock = function (text) {
      box.innerHTML = '<ul class="plain-list"><li>Every time a director or top manager bought or sold shares on the stock market in the last 6 months</li><li>Who it was, their job, the number of shares, the price and what they own afterwards</li><li>Whether a sale was planned months in advance</li></ul><p class="members-cta"><a class="pill-gold" href="/membership#plans">' + esc(text) + '</a> <a href="/insiders">About company bosses’ trades</a></p>';
    };
    if (!token) { lock('Premium members see this'); return; }
    api('/api/insiders?days=180&ticker=' + encodeURIComponent(ticker)).then(function (d) {
      var t = d.totals;
      if (!d.trades.length) { box.innerHTML = '<p>No director or top manager bought or sold ' + esc(ticker) + ' shares on the stock market in the last 6 months. (Shares received as pay, option exercises and tax withholding are not counted.) <a href="/insiders">See trades at other companies</a>.</p>'; return; }
      box.innerHTML = '<div class="pr-tiles">' + tileHtml('Bought', big(t.bought), nTrades(t.buys), GREEN) + tileHtml('Sold', big(t.sold), nTrades(t.sells), ORANGE) + tileHtml('Planned sales', t.sold ? Math.round(t.plannedSold / t.sold * 100) + '%' : '—', 'of the value sold', GOLD) + '</div>' +
        '<div class="in-meter"><span class="buy" style="width:' + ((t.bought + t.sold) ? (t.bought / (t.bought + t.sold) * 100) : 50) + '%"></span><span class="sell"></span></div><p class="pf-sub">Green = value bought, orange = value sold, last 6 months.</p>' +
        tradeRows(d.trades.slice(0, 15), false) + '<p class="helper-note"><a href="/insiders">See trades at every company we cover</a></p>';
    }).catch(function (e) { lock(e.status === 403 ? 'Upgrade to Premium to see them' : 'Premium members see this'); });
  }

  if (page) loadPage(); else loadBox();
}());
