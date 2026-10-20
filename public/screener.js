/* ════════════════════════════════════════════════════════════════════════
   Stock screener + Fund explorer (runs in the browser).
   Regular: filters, ready-made screens, sector donut, growth/profit map,
   sortable table. Premium: big-fund columns and filters, "most owned by
   big funds" chart, a pie of each company's fund owners, Fund explorer.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var app = document.getElementById('scApp');
  if (!app) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var big = function (v) { if (v == null) return '—'; var a = Math.abs(v); return (v < 0 ? '−' : '') + '$' + (a >= 1e12 ? (a / 1e12).toFixed(2) + 'tn' : a >= 1e9 ? (a / 1e9).toFixed(1) + 'bn' : a >= 1e6 ? (a / 1e6).toFixed(0) + 'm' : Math.round(a)); };
  var PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e8a8a', '#8a5a2b'];
  var OTHER = '#a7adc2';
  var STOPS = [[0, [207, 74, 58]], [35, [232, 128, 58]], [50, [212, 167, 44]], [65, [58, 168, 107]], [80, [14, 122, 78]], [100, [8, 92, 58]]];
  function heat(s) {
    if (s == null) return 'rgb(167,173,194)';
    for (var i = 1; i < STOPS.length; i++) if (s <= STOPS[i][0]) { var a = STOPS[i - 1], b = STOPS[i], t = (s - a[0]) / (b[0] - a[0] || 1); return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); }).join(',') + ')'; }
    return 'rgb(8,92,58)';
  }
  var heatInk = function (s) { return s != null && s >= 50 && s < 65 ? '#0a1128' : '#fff'; };

  var S = { data: null, premium: false, preview: false, preset: 'all', sort: 'score', dir: -1, tab: 'screen', f: { region: '', sector: '', growth: '', margin: '', score: '', divYears: '', debt: '', funds: '', buying: false } };
  try { var qr = new URLSearchParams(location.search).get('region'); if (qr) S.f.region = qr; } catch (e) { /* old browser */ }

  /* ── Charts ── */
  function donut(slices, opts) {
    opts = opts || {};
    var total = slices.reduce(function (a, s) { return a + s.v; }, 0) || 1;
    var R = 80, r = 50, cx = 100, cy = 100, a0 = -Math.PI / 2, paths = '';
    slices.forEach(function (s) {
      var a1 = a0 + (s.v / total) * Math.PI * 2;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var p = function (rad, a) { return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
      var A = p(R, a0), B = p(R, a1), Cc = p(r, a1), D = p(r, a0);
      if (slices.length === 1) paths += '<circle cx="100" cy="100" r="65" fill="none" stroke="' + s.c + '" stroke-width="30"><title>' + esc(s.label) + '</title></circle>';
      else paths += '<path d="M' + A + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + B + ' L' + Cc + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + D + 'Z" fill="' + s.c + '" stroke="#fbf7ef" stroke-width="2"><title>' + esc(s.label) + ': ' + esc(s.text || '') + '</title></path>';
      a0 = a1;
    });
    var center = opts.center ? '<text x="100" y="98" text-anchor="middle" font-size="26" font-weight="800" fill="#0a1128">' + esc(opts.center) + '</text><text x="100" y="118" text-anchor="middle" font-size="11" fill="#4a5170">' + esc(opts.sub || '') + '</text>' : '';
    var legend = '<ul class="sc-legend">' + slices.map(function (s) { return '<li><i style="background:' + s.c + '"></i><span>' + esc(s.label) + '</span><b>' + esc(s.text || '') + '</b></li>'; }).join('') + '</ul>';
    return '<div class="sc-donut"><svg viewBox="0 0 200 200" role="img" aria-label="' + esc(opts.title || 'Chart') + '">' + paths + center + '</svg>' + legend + '</div>';
  }
  function sectorSlices(rows) {
    var count = {};
    rows.forEach(function (r) { count[r.sector] = (count[r.sector] || 0) + 1; });
    var list = Object.keys(count).map(function (k) { return { k: k, v: count[k] }; }).sort(function (a, b) { return b.v - a.v; });
    var top = list.slice(0, 7), rest = list.slice(7).reduce(function (a, x) { return a + x.v; }, 0);
    var out = top.map(function (x, i) { return { label: x.k, v: x.v, c: PALETTE[i], text: x.v + ' (' + Math.round(x.v / rows.length * 100) + '%)' }; });
    if (rest) out.push({ label: 'Other areas', v: rest, c: OTHER, text: rest + ' (' + Math.round(rest / rows.length * 100) + '%)' });
    return out;
  }
  function scatter(rows) {
    var pts = rows.filter(function (r) { return r.salesGrowth != null && r.margin != null; });
    if (pts.length < 3) return '<p class="pf-sub">Not enough companies with both figures.</p>';
    var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    var xs = pts.map(function (r) { return clamp(r.salesGrowth, -30, 60); }), ys = pts.map(function (r) { return clamp(r.margin, -30, 60); });
    var x0 = Math.min.apply(null, xs.concat([0])), x1 = Math.max.apply(null, xs.concat([10])), y0 = Math.min.apply(null, ys.concat([0])), y1 = Math.max.apply(null, ys.concat([10]));
    var px = (x1 - x0) * 0.08, py = (y1 - y0) * 0.1; x0 -= px; x1 += px; y0 -= py; y1 += py;
    var W = 560, H = 300, L = 44, B = 34, T = 10, Rr = 10;
    var X = function (v) { return L + (v - x0) / (x1 - x0 || 1) * (W - L - Rr); }, Y = function (v) { return T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B); };
    var maxSales = Math.max.apply(null, pts.map(function (r) { return r.sales || 0; })) || 1;
    var grid = '<line x1="' + X(0) + '" x2="' + X(0) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#b9ae95"/><line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#b9ae95"/>' +
      '<text x="' + (W - Rr) + '" y="' + (H - 10) + '" text-anchor="end" font-size="12" fill="#4a5170">Sales growth % →</text><text x="' + (L + 4) + '" y="' + (T + 12) + '" font-size="12" fill="#4a5170">↑ Profit margin %</text>' +
      '<text x="' + (L - 6) + '" y="' + (Y(0) + 4) + '" text-anchor="end" font-size="11" fill="#4a5170">0</text><text x="' + X(0) + '" y="' + (H - B + 14) + '" text-anchor="middle" font-size="11" fill="#4a5170">0</text>';
    var dots = pts.map(function (r) {
      var rad = 5 + Math.sqrt((r.sales || 0) / maxSales) * 13;
      return '<a href="/stock/' + esc(r.ticker) + '"><circle cx="' + X(clamp(r.salesGrowth, -30, 60)).toFixed(1) + '" cy="' + Y(clamp(r.margin, -30, 60)).toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + heat(r.score) + '" fill-opacity=".82" stroke="#fff" stroke-width="1.5"><title>' + esc(r.ticker + ' · ' + r.name + ': sales ' + r.salesGrowth + '%, margin ' + r.margin + '%, score ' + (r.score == null ? '–' : r.score)) + '</title></circle></a>';
    }).join('');
    return '<svg class="sc-scatter" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sales growth against profit margin">' + grid + dots + '</svg><p class="pf-sub">Top right = growing fast and very profitable. Bubble size = sales; colour = score.</p>';
  }
  function hbars(items, fmt, colourFn) {
    var max = Math.max.apply(null, items.map(function (x) { return x.v; }).concat([1]));
    return '<div class="sc-hbars">' + items.map(function (x, i) {
      return '<div class="sc-hbar"><a href="' + esc(x.href || '#') + '">' + esc(x.label) + '</a><div><i style="width:' + Math.max(3, x.v / max * 100) + '%;background:' + (colourFn ? colourFn(x, i) : PALETTE[0]) + '"></i></div><b>' + esc(fmt(x)) + '</b></div>';
    }).join('') + '</div>';
  }

  function summaryTiles(rows) {
    var avg = function (k) { var v = rows.map(function (r) { return r[k]; }).filter(function (x) { return x != null; }); return v.length ? v.reduce(function (a, x) { return a + x; }, 0) / v.length : null; };
    var sc = avg('score'), g = avg('salesGrowth'), m = avg('margin'), pay = rows.filter(function (r) { return r.dividend > 0; }).length;
    var t = function (label, val, colour) { return '<div class="sc-tile" style="border-top-color:' + colour + '"><b>' + val + '</b><span>' + label + '</span></div>'; };
    return '<div class="sc-tiles">' + t('Average score', sc == null ? '–' : Math.round(sc), heat(sc)) + t('Average sales growth', g == null ? '–' : (g > 0 ? '+' : '') + g.toFixed(1) + '%', '#2a78d6') +
      t('Average profit margin', m == null ? '–' : m.toFixed(1) + '%', '#1baf7a') + t('Pay a dividend', pay + ' of ' + rows.length, '#eda100') + '</div>';
  }

  function regionName(id) { var g = (S.data.regions || []).filter(function (x) { return x.id === id; })[0]; return g ? g.name : id; }

  /* ── Filtering ── */
  var PRESETS = [
    ['all', 'All companies', function () { return true; }],
    ['divgrow', 'Dividend growers', function (r) { return r.divYears >= 10; }],
    ['fast', 'Fast growers', function (r) { return r.salesGrowth != null && r.salesGrowth >= 10; }],
    ['money', 'Money makers', function (r) { return r.margin != null && r.margin >= 20; }],
    ['lowdebt', 'Low debt', function (r) { return r.debtYears != null && r.debtYears < 2; }],
    ['top', 'Top scores', function (r) { return r.score != null && r.score >= 80; }],
    ['fundsbuy', 'Big funds buying', function (r) { return (r.buyers || 0) > (r.sellers || 0) && (r.buyers || 0) >= 2; }, true],
    ['fundsown', 'Most owned by big funds', function (r) { return (r.funds || 0) >= 4; }, true],
  ];
  function filtered() {
    var rows = S.data.rows, f = S.f, p = PRESETS.filter(function (x) { return x[0] === S.preset; })[0];
    var num = function (v) { return v === '' || v == null ? null : Number(v); };
    return rows.filter(function (r) {
      if (p && !p[2](r)) return false;
      if (f.region && r.region !== f.region) return false;
      if (f.sector && r.sector !== f.sector) return false;
      if (num(f.growth) != null && !(r.salesGrowth >= num(f.growth))) return false;
      if (num(f.margin) != null && !(r.margin >= num(f.margin))) return false;
      if (num(f.score) != null && !(r.score >= num(f.score))) return false;
      if (num(f.divYears) != null && !(r.divYears >= num(f.divYears))) return false;
      if (num(f.debt) != null && !(r.debtYears != null && r.debtYears <= num(f.debt))) return false;
      if (S.premium && num(f.funds) != null && !((r.funds || 0) >= num(f.funds))) return false;
      if (S.premium && f.buying && !((r.buyers || 0) > (r.sellers || 0))) return false;
      return true;
    }).sort(function (a, b) {
      var x = a[S.sort], y = b[S.sort];
      if (x == null) return 1; if (y == null) return -1;
      if (typeof x === 'string') return x.localeCompare(y) * S.dir;
      return (x - y) * S.dir;
    });
  }

  /* ── Drawing ── */
  function chip(v, good, okay, suffix) {
    if (v == null) return '<span class="sc-chip none">—</span>';
    var cls = v >= good ? 'good' : v >= okay ? 'okay' : 'weak';
    return '<span class="sc-chip ' + cls + '">' + (v > 0 && suffix === '%' ? '+' : '') + v + (suffix || '') + '</span>';
  }
  function draw() {
    var rows = filtered();
    var cols = [['name', 'Company'], ['score', 'Score'], ['salesGrowth', 'Sales growth'], ['margin', 'Profit margin'], ['epsGrowth', 'EPS growth (5y)'], ['debtYears', 'Debt (years)'], ['divYears', 'Dividend raises'], ['dividend', 'Dividend']];
    if (S.data.pricesOn) cols.push(['divYield', 'Yield']);
    if (S.premium) cols = cols.concat([['funds', 'Big funds'], ['buyers', 'Bought / sold'], ['ownedPct', 'Owned by funds'], ['bigBet', 'Biggest bet']]);
    var sectors = Array.from(new Set(S.data.rows.map(function (r) { return r.sector; }))).sort();
    var locked = S.preview;
    var html = '<div class="sc-hero"><div><span class="pf-badge">' + (S.premium ? '★ Premium' : 'Members') + '</span><h1>Stock screener</h1><p>Find companies by growth, profit, debt and dividends, from their official filings.' + (S.premium ? ' Plus what the big funds own.' : '') + '</p></div>' +
      '<div class="sc-tabs" role="tablist"><button data-tab="screen" class="' + (S.tab === 'screen' ? 'on' : '') + '">Screener</button><button data-tab="funds" class="' + (S.tab === 'funds' ? 'on' : '') + '">Fund explorer <span class="sc-prem">Premium</span></button></div></div>';
    if (locked) html += '<div class="pf-upsell"><strong>' + esc(S.lockText) + '</strong><a class="pf-btn gold" href="/membership#plans">See plans</a></div>';
    if (S.tab === 'funds') { app.innerHTML = html + fundsTab(); bind(); return; }
    html += '<div class="sc-presets">' + PRESETS.map(function (p) {
      var prem = p[3]; var dis = locked || (prem && !S.premium);
      return '<button class="sc-preset' + (S.preset === p[0] ? ' on' : '') + '" data-preset="' + p[0] + '"' + (dis ? ' disabled' : '') + '>' + esc(p[1]) + (prem ? ' <span class="sc-prem">Premium</span>' : '') + '</button>';
    }).join('') + '</div>';
    html += '<div class="sc-filters' + (locked ? ' locked' : '') + '">' +
      field('Region', '<select data-f="region"' + (locked ? ' disabled' : '') + '><option value="">Every region</option>' + (S.data.regions || []).map(function (g) { return '<option value="' + esc(g.id) + '"' + (S.f.region === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select>') +
      field('Area', '<select data-f="sector"' + (locked ? ' disabled' : '') + '><option value="">All areas</option>' + sectors.map(function (s) { return '<option' + (S.f.sector === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>') +
      field('Sales growth at least (%)', inp('growth', 'e.g. 5')) + field('Profit margin at least (%)', inp('margin', 'e.g. 15')) + field('Score at least', inp('score', 'e.g. 70')) +
      field('Dividend raises at least (years)', inp('divYears', 'e.g. 10')) + field('Debt at most (years)', inp('debt', 'e.g. 3')) +
      (S.premium ? field('Held by at least (big funds)', inp('funds', 'e.g. 3')) + '<label class="sc-check"><input type="checkbox" data-f="buying"' + (S.f.buying ? ' checked' : '') + '> More funds buying than selling</label>' : '') +
      '<button class="pf-btn ghost" data-reset' + (locked ? ' disabled' : '') + '>Clear</button></div>';
    html += '<p class="sc-count"><strong>' + rows.length + '</strong> ' + (locked ? 'of the best-scoring companies shown (' + S.data.total + ' in the full screener)' : 'companies match') + '</p>';
    html += '<div class="sc-charts"><div class="pf-panel"><h2>By area of the economy</h2>' + (rows.length ? donut(sectorSlices(rows), { center: rows.length, sub: 'companies', title: 'Companies by area' }) + summaryTiles(rows) : '<p class="pf-sub">No companies match.</p>') + '</div>' +
      '<div class="pf-panel"><h2>Growth and profit map</h2>' + scatter(rows) + '</div></div>';
    if (S.premium && rows.length) {
      var owned = rows.filter(function (r) { return r.funds; }).sort(function (a, b) { return b.funds - a.funds || (b.fundsValue || 0) - (a.fundsValue || 0); }).slice(0, 10);
      if (owned.length) html += '<div class="pf-panel"><h2>Most owned by the big funds <span class="sc-prem">Premium</span></h2><p class="pf-sub">How many of the famous funds we follow own each company (quarter to ' + esc(S.data.fundsPeriod || '—') + '). Green = more buying than selling last quarter, orange = more selling.</p>' +
        hbars(owned.map(function (r) { return { label: r.ticker + ' · ' + r.name, v: r.funds, r: r, href: '#sc-' + r.ticker }; }), function (x) { return x.v + ' funds · ' + (x.r.ownedPct != null ? x.r.ownedPct + '% of the company' : ''); }, function (x) { return x.r.buyers > x.r.sellers ? '#1baf7a' : x.r.sellers > x.r.buyers ? '#eb6834' : '#2a78d6'; }) + '</div>';
    }
    html += '<div class="pf-panel sc-table-wrap"><table class="sc-table"><thead><tr>' + cols.map(function (c) {
      return '<th><button data-sort="' + c[0] + '"' + (locked ? ' disabled' : '') + '>' + esc(c[1]) + (S.sort === c[0] ? (S.dir < 0 ? ' ▼' : ' ▲') : '') + '</button></th>';
    }).join('') + '</tr></thead><tbody>' + rows.slice(0, 200).map(function (r) {
      var cells = '<td class="sc-co"><a href="/stock/' + esc(r.ticker) + '"><b>' + esc(r.ticker) + '</b> ' + esc(r.name) + '</a><small>' + esc(r.sector) + (r.region && r.region !== 'us' ? ' · ' + esc(regionName(r.region)) : '') + '</small></td>' +
        '<td><span class="sc-score" style="background:' + heat(r.score) + ';color:' + heatInk(r.score) + '">' + (r.score == null ? '–' : r.score) + '</span></td>' +
        '<td>' + chip(r.salesGrowth, 5, 0, '%') + '</td><td>' + chip(r.margin, 10, 0, '%') + '</td><td>' + chip(r.epsGrowth, 8, 0, '%') + '</td>' +
        '<td>' + (r.debtYears == null ? '<span class="sc-chip none">—</span>' : '<span class="sc-chip ' + (r.debtYears < 3 ? 'good' : r.debtYears <= 6 ? 'okay' : 'weak') + '">' + r.debtYears + '</span>') + '</td>' +
        '<td>' + (r.divYears ? '<span class="sc-years" style="--w:' + Math.min(100, r.divYears * 2) + '%">' + r.divYears + '</span>' : '<span class="sc-chip none">—</span>') + '</td>' +
        '<td>' + (r.dividend ? '$' + r.dividend.toFixed(2) : '—') + '</td>' +
        (S.data.pricesOn ? '<td>' + (r.divYield != null ? r.divYield + '%' : '—') + '</td>' : '') +
        (S.premium ? '<td>' + (r.funds ? '<span class="sc-dots">' + new Array(Math.min(r.funds, 10) + 1).join('●') + '</span> ' + r.funds : '—') + '</td>' +
          '<td>' + (r.funds || r.sellers ? '<span class="up">▲' + r.buyers + '</span> <span class="down">▼' + r.sellers + '</span>' : '—') + '</td>' +
          '<td>' + (r.ownedPct != null ? r.ownedPct + '%' : '—') + '</td>' +
          '<td>' + (r.bigBet ? '<small>' + esc(r.bigBet.fund) + '</small> ' + r.bigBet.pct + '%' : '—') + '</td>' : '');
      return '<tr id="sc-' + esc(r.ticker) + '" data-ticker="' + esc(r.ticker) + '"' + (S.premium ? ' class="sc-click" title="Show the big-fund owners"' : '') + '>' + cells + '</tr>';
    }).join('') + '</tbody></table>' + (rows.length > 200 ? '<p class="pf-sub">Showing the first 200; narrow the filters to see the rest.</p>' : '') + '</div>';
    html += '<div id="scDrawer"></div>';
    app.innerHTML = html;
    bind();
  }
  function field(label, control) { return '<label class="sc-field"><span>' + esc(label) + '</span>' + control + '</label>'; }
  function inp(name, ph) { return '<input data-f="' + name + '" inputmode="decimal" placeholder="' + esc(ph) + '" value="' + esc(S.f[name]) + '"' + (S.preview ? ' disabled' : '') + '>'; }

  /* ── Fund explorer (Premium) ── */
  function fundsTab() {
    if (!S.premium) return '<div class="pf-panel"><h2>Fund explorer <span class="sc-prem">Premium</span></h2><p>See what each of about 20 famous investors (Warren Buffett’s Berkshire Hathaway, Bridgewater, Pershing Square and more) owns: their biggest holdings as a share of their money, and what they bought and sold last quarter.</p><a class="pf-btn gold" href="/membership#plans">See Premium</a></div>';
    if (!S.funds) { loadFunds(); return '<div class="pf-loading">Loading the funds…</div>'; }
    var list = S.funds.funds || [];
    if (!list.length) return '<div class="pf-panel"><p>The fund reports are being collected. Please check back soon.</p></div>';
    var pick = list.filter(function (f) { return f.name === S.fund; })[0] || list[0];
    S.fund = pick.name;
    var slices = pick.top.map(function (h, i) { return { label: h.ticker, v: h.pctOfFund || 0, c: PALETTE[i % 10], text: (h.pctOfFund || 0).toFixed(1) + '%' }; });
    if (pick.otherPct > 0.5) slices.push({ label: 'Everything else', v: pick.otherPct, c: OTHER, text: pick.otherPct.toFixed(1) + '%' });
    var chg = function (x) { return { new: 'New', added: 'Bought more', reduced: 'Sold some', sold: 'Sold all' }[x.change] || ''; };
    return '<div class="sc-funds"><div class="sc-fundlist">' + list.map(function (f) {
      return '<button class="sc-fund' + (f.name === pick.name ? ' on' : '') + '" data-fund="' + esc(f.name) + '"><b>' + esc(f.name) + '</b><span>' + esc(f.manager) + '</span><em>' + big(f.total) + ' in ' + f.holdings + ' holdings</em></button>';
    }).join('') + '</div><div class="sc-fundview"><div class="pf-panel"><h2>' + esc(pick.name) + '</h2><p class="pf-sub">' + esc(pick.manager) + ' · quarter to ' + esc(pick.period) + ' · ' + big(pick.total) + ' in US shares across ' + pick.holdings + ' holdings. Its top 10 make up <strong>' + pick.top10Pct + '%</strong> of its money.</p>' +
      donut(slices, { center: pick.top10Pct + '%', sub: 'in its top 10', title: pick.name + ' top holdings' }) + '</div>' +
      '<div class="pf-panel"><h2>Top 10 holdings</h2>' + hbars(pick.top.map(function (h, i) { return { label: h.ticker, v: h.pctOfFund || 0, h: h, href: '/stock/' + h.ticker, i: i }; }), function (x) { return x.v.toFixed(1) + '% · ' + big(x.h.value) + (x.h.change && x.h.change !== 'same' && x.h.change !== 'unknown' ? ' · ' + chg(x.h) : ''); }, function (x) { return PALETTE[x.i % 10]; }) + '</div>' +
      '<div class="pf-two"><div class="pf-panel"><h2><span class="up">▲</span> Bought last quarter</h2>' + (pick.bought.length ? '<ul class="sc-moves">' + pick.bought.map(function (x) { return '<li><a href="/stock/' + esc(x.ticker) + '">' + esc(x.ticker) + '</a> <span class="sc-tag up">' + chg(x) + '</span> ' + big(x.value) + '</li>'; }).join('') + '</ul>' : '<p class="pf-sub">No purchases among the companies we track.</p>') + '</div>' +
      '<div class="pf-panel"><h2><span class="down">▼</span> Sold last quarter</h2>' + (pick.sold.length ? '<ul class="sc-moves">' + pick.sold.map(function (x) { return '<li><a href="/stock/' + esc(x.ticker) + '">' + esc(x.ticker) + '</a> <span class="sc-tag down">' + chg(x) + '</span></li>'; }).join('') + '</ul>' : '<p class="pf-sub">No sales among the companies we track.</p>') + '</div></div></div></div>';
  }
  function loadFunds() {
    api('/api/screener/funds').then(function (d) { S.funds = d; draw(); }).catch(function () { S.funds = { funds: [] }; draw(); });
  }

  /* ── Company drawer (Premium): who owns it ── */
  function openOwners(ticker) {
    var box = document.getElementById('scDrawer');
    if (!box) return;
    box.innerHTML = '<div class="pf-panel sc-drawer"><div class="pf-loading">Loading…</div></div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    api('/api/screener/owners?ticker=' + encodeURIComponent(ticker)).then(function (d) {
      var o = (d.owners || []).filter(function (x) { return x.change !== 'sold'; });
      if (!o.length) { box.innerHTML = '<div class="pf-panel sc-drawer"><h2>' + esc(ticker) + '</h2><p>None of the big funds we follow owned it at the end of the last quarter.</p></div>'; return; }
      var top = o.slice(0, 7), rest = o.slice(7).reduce(function (a, x) { return a + (x.value || 0); }, 0);
      var slices = top.map(function (x, i) { return { label: x.fund, v: x.value || 0, c: PALETTE[i], text: big(x.value) }; });
      if (rest) slices.push({ label: 'Other funds', v: rest, c: OTHER, text: big(rest) });
      var w = { new: 'New', added: 'Bought more', reduced: 'Sold some', same: 'No change', unknown: '—' };
      box.innerHTML = '<div class="pf-panel sc-drawer"><button class="sc-close" aria-label="Close">×</button><h2>Who owns ' + esc(ticker) + ' <span class="sc-prem">Premium</span></h2><p class="pf-sub">Big funds’ holdings at the end of the quarter to ' + esc(d.period || '—') + ', from their 13F reports.</p>' +
        '<div class="sc-owner-grid">' + donut(slices, { center: o.length, sub: 'big funds', title: 'Big-fund owners of ' + ticker }) +
        '<table class="sc-owners"><thead><tr><th>Fund</th><th>Value</th><th>% of the fund’s money</th><th>% of the company</th><th>Last quarter</th></tr></thead><tbody>' + o.map(function (x) {
          return '<tr><td><b>' + esc(x.fund) + '</b><small>' + esc(x.manager) + '</small></td><td>' + big(x.value) + '</td><td><span class="sc-pctbar"><i style="width:' + Math.min(100, (x.pctOfFund || 0) * 3) + '%"></i></span> ' + (x.pctOfFund != null ? x.pctOfFund + '%' : '—') + '</td><td>' + (x.pctOfCompany != null ? x.pctOfCompany + '%' : '—') + '</td><td><span class="sc-tag ' + (x.change === 'new' || x.change === 'added' ? 'up' : x.change === 'reduced' ? 'down' : '') + '">' + (w[x.change] || '') + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>';
      box.querySelector('.sc-close').addEventListener('click', function () { box.innerHTML = ''; });
    }).catch(function () { box.innerHTML = ''; });
  }

  /* ── Events ── */
  function bind() {
    app.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { S.tab = b.dataset.tab; draw(); }); });
    app.querySelectorAll('[data-fund]').forEach(function (b) { b.addEventListener('click', function () { S.fund = b.dataset.fund; draw(); }); });
    if (S.preview) return;
    app.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { S.preset = b.dataset.preset; draw(); }); });
    app.querySelectorAll('[data-sort]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.sort; if (S.sort === k) S.dir = -S.dir; else { S.sort = k; S.dir = k === 'name' || k === 'debtYears' ? 1 : -1; } draw(); }); });
    app.querySelectorAll('[data-f]').forEach(function (el) {
      el.addEventListener('change', function () { S.f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim(); draw(); });
    });
    var reset = app.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', function () { S.f = { region: '', sector: '', growth: '', margin: '', score: '', divYears: '', debt: '', funds: '', buying: false }; S.preset = 'all'; draw(); });
    if (S.premium) app.querySelectorAll('tr.sc-click').forEach(function (tr) { tr.addEventListener('click', function (e) { if (e.target.closest('a')) return; openOwners(tr.dataset.ticker); }); });
  }

  function api(url) {
    return fetch(url, { headers: token ? { 'x-session-token': token } : {} }).then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'error'); e.status = r.status; throw e; } return d; }); });
  }

  function preview(text) {
    fetch('/api/site/screener-preview').then(function (r) { return r.json(); }).then(function (d) {
      S.data = d; S.preview = true; S.lockText = text; draw();
    }).catch(function () { app.innerHTML = '<p class="note-box">The screener could not load. Please try again.</p>'; });
  }
  if (!token) { preview('The screener is for members. Sign in or join to use every filter.'); return; }
  api('/api/screener').then(function (d) { S.data = d; S.premium = Boolean(d.premium); draw(); })
    .catch(function (e) { preview(e.status === 403 ? 'The screener is part of Regular and Premium. Upgrade to use every filter.' : 'Sign in to use the screener.'); });
}());
