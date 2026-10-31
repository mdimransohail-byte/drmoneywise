/* ════════════════════════════════════════════════════════════════════════
   Ideas that match your rules (Premium) — /ideas
   Each saved idea list: its rules as chips, how many companies match,
   which are new since last week, an area-of-the-economy donut and a card
   for every match. Ready-made lists can be added with one click.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var app = document.getElementById('idApp');
  if (!app) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  var STOPS = [[0, [207, 74, 58]], [35, [232, 128, 58]], [50, [212, 167, 44]], [65, [58, 168, 107]], [80, [14, 122, 78]], [100, [8, 92, 58]]];
  function heat(s) {
    if (s == null) return 'rgb(167,173,194)';
    for (var i = 1; i < STOPS.length; i++) if (s <= STOPS[i][0]) { var a = STOPS[i - 1], b = STOPS[i], t = (s - a[0]) / (b[0] - a[0] || 1); return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); }).join(',') + ')'; }
    return 'rgb(8,92,58)';
  }
  var S = { ideas: [], starters: [], max: 5, open: {}, renaming: null };

  function api(method, body) {
    var h = { 'Content-Type': 'application/json' }; if (token) h['x-session-token'] = token;
    return fetch('/api/member/ideas', { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'error'); e.status = r.status; throw e; } return d; });
    });
  }
  function save(list) {
    app.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    return api('POST', { ideas: list.map(function (i) { return { id: i.id, name: i.name, preset: i.preset, f: i.f }; }) }).then(function (d) { take(d); draw(); });
  }
  function take(d) { S.ideas = d.ideas || []; S.starters = d.starters || []; S.max = d.max || 5; }

  function miniDonut(rows) {
    var count = {}; rows.forEach(function (r) { count[r.sector] = (count[r.sector] || 0) + 1; });
    var list = Object.keys(count).map(function (k) { return [k, count[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var top = list.slice(0, 5), rest = list.slice(5).reduce(function (a, x) { return a + x[1]; }, 0);
    if (rest) top.push(['Other areas', rest]);
    var total = rows.length || 1, a0 = -Math.PI / 2, paths = '';
    var P = function (rad, a) { return (60 + rad * Math.cos(a)).toFixed(2) + ',' + (60 + rad * Math.sin(a)).toFixed(2); };
    top.forEach(function (x, i) {
      var c = x[0] === 'Other areas' ? '#a7adc2' : PALETTE[i];
      if (top.length === 1) { paths += '<circle cx="60" cy="60" r="38" fill="none" stroke="' + c + '" stroke-width="20"/>'; return; }
      var a1 = a0 + x[1] / total * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
      paths += '<path d="M' + P(48, a0) + ' A48 48 0 ' + large + ' 1 ' + P(48, a1) + ' L' + P(28, a1) + ' A28 28 0 ' + large + ' 0 ' + P(28, a0) + 'Z" fill="' + c + '" stroke="#fbf7ef" stroke-width="1.5"/>';
      a0 = a1;
    });
    return '<div class="id-donut"><svg viewBox="0 0 120 120" aria-hidden="true">' + paths + '</svg><ul>' + top.map(function (x, i) { return '<li><i style="background:' + (x[0] === 'Other areas' ? '#a7adc2' : PALETTE[i]) + '"></i>' + esc(x[0]) + ' <b>' + x[1] + '</b></li>'; }).join('') + '</ul></div>';
  }
  function card(r, isNew) {
    var g = r.salesGrowth, m = r.margin;
    return '<a class="id-card' + (isNew ? ' new' : '') + '" href="/stock/' + esc(r.ticker) + '">' + (isNew ? '<span class="id-new">New</span>' : '') +
      '<span class="sc-score" style="background:' + heat(r.score) + ';color:' + (r.score != null && r.score >= 50 && r.score < 65 ? '#0a1128' : '#fff') + '">' + (r.score == null ? '–' : r.score) + '</span>' +
      '<strong>' + esc(r.ticker) + '</strong><span class="id-name">' + esc(r.name) + '</span><small>' + esc(r.sector) + '</small>' +
      '<span class="id-stats"><em class="' + (g == null ? '' : g >= 0 ? 'up' : 'down') + '">Sales ' + (g == null ? '—' : (g > 0 ? '+' : '') + g + '%') + '</em><em>Margin ' + (m == null ? '—' : m + '%') + '</em>' + (r.divYears ? '<em class="up">Dividend ↑' + r.divYears + 'y</em>' : '') + '</span></a>';
  }

  function draw() {
    var html = '<div class="sc-hero"><div><span class="pf-badge prem">★ Premium</span><h1>Ideas that match your rules</h1><p>Save up to ' + S.max + ' sets of rules. We check every company against them each day, and the Saturday email tells you which ones are new.</p></div>' +
      '<a class="pf-btn gold" href="/screener">Make a new list in the screener</a></div>';
    if (!S.ideas.length) html += '<div class="pf-panel id-empty"><h2>You haven’t saved an idea list yet</h2><p>Pick one of the ready-made lists below, or open the <a href="/screener">screener</a>, set the rules you like and press <strong>Save as an idea list</strong>.</p></div>';
    S.ideas.forEach(function (i, n) {
      var fresh = {}; (i.newTickers || []).forEach(function (t) { fresh[t] = 1; });
      var rows = i.rows.slice().sort(function (a, b) { return (fresh[b.ticker] ? 1 : 0) - (fresh[a.ticker] ? 1 : 0); });
      var shown = S.open[i.id] ? rows : rows.slice(0, 8);
      html += '<div class="pf-panel id-list" style="border-top-color:' + PALETTE[n % PALETTE.length] + '">' +
        '<div class="id-head"><div>' + (S.renaming === i.id ? '<form class="id-rename" data-rename="' + esc(i.id) + '"><input name="name" maxlength="60" value="' + esc(i.name) + '" aria-label="List name"><button class="pf-btn" type="submit">Save name</button></form>' : '<h2>' + esc(i.name) + '</h2>') +
        '<div class="id-chips">' + (i.words ? i.words.split(' · ').map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') : '<span>All companies</span>') + '</div></div>' +
        '<div class="id-count"><strong>' + i.count + '</strong><span>match today</span>' + (i.newTickers && i.newTickers.length ? '<b>' + i.newTickers.length + ' new</b>' : '') + '</div></div>' +
        (i.count ? '<div class="id-body">' + miniDonut(i.rows) + '<div class="id-cards">' + shown.map(function (r) { return card(r, fresh[r.ticker]); }).join('') + '</div></div>' : '<p class="pf-sub">No company matches these rules today. Try loosening one of them in the screener.</p>') +
        (i.gone && i.gone.length ? '<p class="pf-sub">No longer matching since last week: ' + i.gone.map(esc).join(', ') + '</p>' : '') +
        '<div class="id-actions">' + (i.count > 8 ? '<button class="pf-btn ghost" data-more="' + esc(i.id) + '">' + (S.open[i.id] ? 'Show fewer' : 'Show all ' + Math.min(i.count, 60)) + '</button>' : '') +
        '<a class="pf-btn ghost" href="/screener?idea=' + encodeURIComponent(i.id) + '">Change the rules</a><button class="pf-btn ghost" data-ren="' + esc(i.id) + '">Rename</button><button class="pf-btn ghost id-del" data-del="' + esc(i.id) + '">Delete</button></div></div>';
    });
    var room = S.ideas.length < S.max;
    var names = S.ideas.map(function (i) { return i.name; });
    var starters = S.starters.filter(function (x) { return names.indexOf(x.name) < 0; });
    if (starters.length) html += '<div class="pf-panel"><h2>Ready-made idea lists</h2><p class="pf-sub">' + (room ? 'Add one with a click, then change it however you like.' : 'You have ' + S.max + ' lists; delete one to add another.') + '</p><div class="id-starters">' +
      starters.map(function (x, k) { return '<div class="id-starter" style="--c:' + PALETTE[(k + 3) % PALETTE.length] + '"><strong>' + esc(x.name) + '</strong><span>' + esc(x.words) + '</span><button class="pf-btn gold" data-add="' + k + '"' + (room ? '' : ' disabled') + '>Add this list</button></div>'; }).join('') + '</div></div>';
    app.innerHTML = html;
    app.querySelectorAll('[data-more]').forEach(function (b) { b.addEventListener('click', function () { S.open[b.dataset.more] = !S.open[b.dataset.more]; draw(); }); });
    app.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { save(S.ideas.filter(function (i) { return i.id !== b.dataset.del; })); }); });
    app.querySelectorAll('[data-ren]').forEach(function (b) { b.addEventListener('click', function () { S.renaming = b.dataset.ren; draw(); var inp = app.querySelector('.id-rename input'); if (inp) inp.focus(); }); });
    app.querySelectorAll('[data-rename]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); var id = f.dataset.rename, name = f.name.value.trim(); S.renaming = null; save(S.ideas.map(function (i) { return i.id === id ? Object.assign({}, i, { name: name || i.name }) : i; })); }); });
    app.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', function () { save(S.ideas.concat([starters[Number(b.dataset.add)]])); }); });
  }

  function locked(text) {
    app.innerHTML = '<div class="sc-hero"><div><span class="pf-badge prem">★ Premium</span><h1>Ideas that match your rules</h1><p>Save your own rules and see every company that matches them, with what’s new each week.</p></div></div>' +
      '<div class="pf-upsell"><strong>' + esc(text) + '</strong><a class="pf-btn gold" href="/membership#plans">See Premium</a></div>' +
      '<div class="pf-panel in-locked"><h2>How it works</h2><ul class="plain-list"><li>Choose rules in the screener: dividend record, sales growth, profit margin, debt, score, region, area of the economy, big funds buying, company bosses buying</li><li>Save up to 5 lists with your own names</li><li>See every company that matches today, as colourful cards with its score</li><li>New matches are marked, and listed in your Saturday email</li></ul>' +
      '<div class="id-starters">' + ['Steady dividend raisers with low debt', 'Fast growers that make good money', 'Where big funds and bosses are buying', 'Top scores outside the US'].map(function (n, k) { return '<div class="id-starter" style="--c:' + PALETTE[(k + 3) % PALETTE.length] + '"><strong>' + esc(n) + '</strong><span>A ready-made list you can add with one click</span></div>'; }).join('') + '</div></div>';
  }

  if (!token) { locked('Sign in with a Premium membership to use idea lists.'); return; }
  api('GET').then(function (d) { take(d); draw(); }).catch(function (e) { locked(e.status === 403 ? 'Idea lists are part of Premium.' : 'Sign in with a Premium membership to use idea lists.'); });
}());
