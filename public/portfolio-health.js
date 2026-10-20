/* ════════════════════════════════════════════════════════════════════════
   Portfolio health check (Premium) — draws the scores, heat maps and the
   holdings editor. Premium members see their own portfolio; everyone
   else sees a live example and an upgrade box.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var app = document.getElementById('pfApp');
  if (!app) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var money = function (v) { return v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US'); };
  var pct = function (v, dp) { if (v == null) return '—'; var s = Math.abs(v * 100).toFixed(dp == null ? 1 : dp); return (v > 0 ? '+' : v < 0 ? '−' : '') + s + '%'; };

  // Colour for a score: red → orange → gold → green → deep green
  var STOPS = [[0, [207, 74, 58]], [35, [232, 128, 58]], [50, [212, 167, 44]], [65, [58, 168, 107]], [80, [14, 122, 78]], [100, [8, 92, 58]]];
  function colour(score) {
    if (score == null) return 'rgb(138,144,168)';
    for (var i = 1; i < STOPS.length; i++) {
      if (score <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], t = (score - a[0]) / (b[0] - a[0] || 1);
        return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); }).join(',') + ')';
      }
    }
    return 'rgb(8,92,58)';
  }
  var ink = function (score) { return score != null && score >= 50 && score < 65 ? '#0a1128' : '#fff'; };

  function ring(score, band) {
    var r = 70, c = 2 * Math.PI * r, p = score == null ? 0 : score / 100;
    return '<svg class="pf-ring" viewBox="0 0 180 180" role="img" aria-label="Portfolio score ' + (score == null ? 'not rated' : score + ' out of 100') + '">' +
      '<defs><linearGradient id="pfGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7d07c"/><stop offset="1" stop-color="#c9a227"/></linearGradient></defs>' +
      '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="14"/>' +
      '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + colour(score) + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (c * p).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 90 90)"/>' +
      '<circle cx="90" cy="90" r="54" fill="none" stroke="url(#pfGold)" stroke-width="1.5" opacity=".6"/>' +
      '<text x="90" y="92" text-anchor="middle" font-size="44" font-weight="800" fill="#fff">' + (score == null ? '–' : score) + '</text>' +
      '<text x="90" y="118" text-anchor="middle" font-size="14" fill="#e9d79a" letter-spacing="2">' + esc(String(band.label).toUpperCase()) + '</text></svg>';
  }

  function pill(band, score) {
    return '<span class="pf-pill" style="background:' + colour(score) + ';color:' + ink(score) + '">' + esc(band.icon) + ' ' + esc(band.label) + (score == null ? '' : ' · ' + score) + '</span>';
  }

  function render(d, opts) {
    var example = opts && opts.example;
    var cols = [['business', 'Business'], ['trend', 'Profit trend'], ['outlook', 'Outlook'], ['gain', 'vs your price'], ['funds', 'Big funds']];
    var etfCols = { business: 'fee', trend: 'spread', outlook: 'conc' };
    var html = '';
    html += '<div class="pf-hero">' +
      '<div class="pf-hero-text"><span class="pf-badge">★ Premium</span><h1>' + (example ? 'Portfolio health check' : 'Your portfolio health check') + '</h1>' +
      '<p>' + (example ? 'Here is a real check of an <strong>example portfolio</strong> (VOO 40%, Apple, JPMorgan, Coca-Cola and ExxonMobil 15% each), worked out from today’s official figures. Premium members get this for their own holdings.' : 'Every holding scored out of 100 from official company figures, and your whole portfolio scored for quality and spread.') + '</p>' +
      '<div class="pf-hero-stats">' +
        stat('Holdings', d.holdingsScore, bandOf(d.holdingsScore)) +
        stat('Spread', d.spread, d.spreadBand) +
        '<div class="pf-stat"><span>' + (d.totalValue ? 'Value today' : 'Paid') + '</span><strong>' + (d.totalValue ? money(d.totalValue) : d.totalCost ? money(d.totalCost) : '—') + '</strong>' + (d.totalGain != null ? '<em class="' + (d.totalGain >= 0 ? 'up' : 'down') + '">' + pct(d.totalGain) + '</em>' : '<em>' + (d.pricesOn ? '' : 'prices soon') + '</em>') + '</div>' +
        '<div class="pf-stat"><span>Dividends a year</span><strong>' + (d.income ? money(d.income) : '—') + '</strong><em>' + (d.income ? 'at last year’s rate' : 'add your shares') + '</em></div>' +
      '</div></div>' +
      '<div class="pf-hero-ring">' + ring(d.overall, d.overallBand) + '<span>Overall score</span></div></div>';

    if (!d.rows.length) {
      html += '<div class="pf-panel"><h2>Add your holdings</h2><p>Type each company or fund you own below, with how many shares and the price you paid, then press Check my portfolio.</p></div>';
    } else {
      // Heat map 1: tiles sized by share of the portfolio
      html += '<div class="pf-panel"><h2>Heat map</h2><p class="pf-sub">Each tile is one holding, sized by its share of your portfolio and coloured by its score.</p><div class="pf-tiles">' +
        d.rows.map(function (r) {
          return '<a class="pf-tile" href="' + (r.kind === 'etf' ? '/etfs/' : '/stock/') + esc(r.ticker) + '" style="flex-grow:' + Math.max(1, Math.round(r.weight * 100)) + ';background:' + colour(r.score) + ';color:' + ink(r.score) + '" title="' + esc(r.name) + ': ' + esc(r.band.label) + (r.score != null ? ' ' + r.score : '') + '">' +
            '<b>' + esc(r.ticker) + '</b><span>' + (r.score == null ? '–' : r.score) + '</span><small>' + Math.round(r.weight * 100) + '%' + (r.gain != null ? ' · ' + pct(r.gain, 0) : '') + '</small></a>';
        }).join('') + '</div>' + legend() + '</div>';

      // Heat map 2: every check for every holding
      html += '<div class="pf-panel"><h2>Check by check</h2><p class="pf-sub">Darker green is better. Hover or tap a square for the detail. For funds, the first three columns show fee, number of holdings and spread.</p><div class="pf-matrix-wrap"><table class="pf-matrix"><thead><tr><th>Holding</th>' +
        cols.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '<th>Score</th></tr></thead><tbody>' +
        d.rows.map(function (r) {
          return '<tr><th scope="row"><a href="' + (r.kind === 'etf' ? '/etfs/' : '/stock/') + esc(r.ticker) + '">' + esc(r.ticker) + '</a><small>' + esc(r.name) + '</small></th>' +
            cols.map(function (c) {
              var key = r.kind === 'etf' ? (etfCols[c[0]] || c[0]) : c[0];
              var ch = (r.checks || []).filter(function (x) { return x.key === key; })[0];
              if (!ch) return '<td class="pf-cell none" title="Not used for this holding">·</td>';
              return '<td class="pf-cell" style="background:' + colour(ch.score) + ';color:' + ink(ch.score) + '" title="' + esc(ch.label + ': ' + ch.text) + '">' + (ch.score == null ? '–' : ch.score) + '</td>';
            }).join('') +
            '<td class="pf-cell total" style="background:' + colour(r.score) + ';color:' + ink(r.score) + '">' + (r.score == null ? '–' : r.score) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      // Spread across areas
      html += '<div class="pf-two"><div class="pf-panel"><h2>Where your money is</h2>' +
        d.sectors.map(function (s) { return '<div class="pf-bar"><span>' + esc(s.name) + '</span><div><i style="width:' + Math.max(2, Math.round(s.weight * 100)) + '%"></i></div><b>' + Math.round(s.weight * 100) + '%</b></div>'; }).join('') +
        '<p class="pf-sub" style="margin-top:8px">Weighted by ' + ({ value: 'today’s value', cost: 'what you paid', weight: 'the shares you typed', equal: 'equal amounts' }[d.basis] || 'equal amounts') + '.</p></div>' +
        '<div class="pf-panel"><h2>What stands out</h2>' + (d.notes.length ? '<ul class="pf-notes">' + d.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '<p>Nothing unusual: a reasonably balanced set of holdings on our checks.</p>') + '</div></div>';

      // Each holding in detail
      html += '<div class="pf-panel"><h2>Each holding</h2>' + d.rows.map(function (r) {
        return '<details class="pf-hold"><summary>' + pill(r.band, r.score) + '<strong>' + esc(r.ticker) + '</strong> <span>' + esc(r.name) + '</span><em>' + Math.round(r.weight * 100) + '% of portfolio' + (r.price ? ' · $' + r.price.toFixed(2) : '') + (r.gain != null ? ' · ' + pct(r.gain) : '') + '</em></summary>' +
          '<div class="pf-hold-body"><ul>' + (r.checks || []).map(function (c) {
            return '<li><span class="pf-dot" style="background:' + colour(c.score) + '"></span><b>' + esc(c.label) + '</b> ' + (c.score == null ? '' : '<i>' + c.score + '/100</i> ') + esc(c.text) + '</li>';
          }).join('') + '</ul>' +
          (r.outlookPrice ? '<p class="pf-outlook"><b>Outlook (our own):</b> if the share price simply followed profits at their past pace, it would be about <strong>$' + r.outlookPrice.toFixed(2) + '</strong> in 3 years (' + pct(r.outlookChange, 0) + '). This is a simple sum, not a forecast.</p>' : '') +
          (r.highlights && r.highlights.length ? '<p class="pf-sub">' + r.highlights.map(function (h) { return esc(h.label) + ' ' + esc(h.plain); }).join(' ') + '</p>' : '') +
          '<a href="' + (r.kind === 'etf' ? '/etfs/' : '/stock/') + esc(r.ticker) + '">Open the full report card</a></div></details>';
      }).join('') + '</div>';
    }
    html += '<p class="pf-legal">Scores describe the businesses and how your holdings have done, by fixed rules from official figures. They are not advice to buy, sell or hold anything. Checked ' + esc(new Date(d.checkedAt).toLocaleString('en-GB')) + '.</p>';
    return html;
  }
  function bandOf(s) { var B = [[80, 'Strong'], [65, 'Healthy'], [50, 'Fair'], [35, 'Watch'], [0, 'Weak']]; if (s == null) return { label: 'Not rated' }; for (var i = 0; i < B.length; i++) if (s >= B[i][0]) return { label: B[i][1] }; return { label: 'Weak' }; }
  function stat(label, score, band) { return '<div class="pf-stat"><span>' + esc(label) + '</span><strong style="color:' + colour(score) + '">' + (score == null ? '–' : score) + '</strong><em>' + esc(band.label) + '</em></div>'; }
  function legend() { return '<div class="pf-legend">' + [['Strong', 90], ['Healthy', 72], ['Fair', 57], ['Watch', 42], ['Weak', 20]].map(function (x) { return '<span><i style="background:' + colour(x[1]) + '"></i>' + x[0] + '</span>'; }).join('') + '<span><i style="background:' + colour(null) + '"></i>Not rated</span></div>'; }

  /* ── Holdings editor (Premium) ── */
  function editor(holdings) {
    var rows = (holdings.length ? holdings : [{}, {}, {}]).map(rowHtml).join('');
    return '<div class="pf-panel pf-editor"><h2>Your holdings</h2><p class="pf-sub">Up to 30. Shares and price paid make the check much richer; you can leave them blank.</p>' +
      '<form id="pfForm"><div class="pf-rows">' + rows + '</div>' +
      '<div class="pf-actions"><button type="button" class="pf-btn ghost" id="pfAdd">+ Add a holding</button><button type="submit" class="pf-btn gold">Check my portfolio</button><span id="pfMsg" role="status"></span></div></form></div>';
  }
  function rowHtml(h) {
    h = h || {};
    return '<div class="pf-row"><input name="ticker" placeholder="Ticker, e.g. AAPL" maxlength="10" value="' + esc(h.ticker || '') + '" aria-label="Ticker">' +
      '<input name="shares" inputmode="decimal" placeholder="Shares" value="' + esc(h.shares || '') + '" aria-label="Shares">' +
      '<input name="buyPrice" inputmode="decimal" placeholder="Price paid per share ($)" value="' + esc(h.buyPrice || h.cost || '') + '" aria-label="Price paid">' +
      '<button type="button" class="pf-del" aria-label="Remove">×</button></div>';
  }
  function bindEditor() {
    var form = document.getElementById('pfForm');
    if (!form) return;
    form.addEventListener('click', function (e) {
      if (e.target.classList.contains('pf-del')) e.target.parentNode.remove();
    });
    document.getElementById('pfAdd').addEventListener('click', function () {
      form.querySelector('.pf-rows').insertAdjacentHTML('beforeend', rowHtml({}));
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('pfMsg');
      var holdings = Array.prototype.map.call(form.querySelectorAll('.pf-row'), function (r) {
        return { ticker: r.querySelector('[name=ticker]').value.trim().toUpperCase(), shares: r.querySelector('[name=shares]').value.trim(), buyPrice: r.querySelector('[name=buyPrice]').value.trim() };
      }).filter(function (h) { return h.ticker; });
      msg.textContent = 'Checking… (new companies can take a few seconds)';
      fetch('/api/member/holdings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token }, body: JSON.stringify({ holdings: holdings }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Could not save'); return d; }); })
        .then(function (d) { show(d.health, d.holdings); window.scrollTo({ top: 0, behavior: 'smooth' }); })
        .catch(function (err) { msg.textContent = err.message; });
    });
  }
  function show(health, holdings) {
    app.innerHTML = render(health, {}) + editor(holdings || []);
    bindEditor();
  }

  function showExample(reason) {
    fetch('/api/site/portfolio-health-example').then(function (r) { return r.json(); }).then(function (d) {
      app.innerHTML = '<div class="pf-upsell"><strong>' + esc(reason) + '</strong><a class="pf-btn gold" href="/membership#plans">See Premium</a></div>' + render(d, { example: true });
    }).catch(function () { app.innerHTML = '<p class="note-box">The health check could not load. Please try again.</p>'; });
  }

  if (!token) { showExample('This is a Premium tool. Sign in as a Premium member to check your own portfolio.'); return; }
  fetch('/api/member/portfolio-health', { headers: { 'x-session-token': token } })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (x) {
      if (x.status === 403 || x.status === 401) { showExample('Upgrade to Premium to check your own portfolio like this.'); return; }
      show(x.d.health, x.d.holdings);
    })
    .catch(function () { showExample('This is a Premium tool.'); });
}());
