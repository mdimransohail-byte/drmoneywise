/* Homepage portfolio: the Premium "edge" panel (/api/member/portfolio-edge).
   Premium members see health scores, sector mix, yield and Shariah status for
   their holdings; everyone else sees what Premium adds. Refreshes after the
   portfolio changes. */
(function () {
  var box = document.getElementById('portfolioEdge');
  if (!box) return;
  var COLOURS = ['#5b2a9e', '#2a78d6', '#1baf7a', '#e8a33d', '#e5566f', '#0fa3b1', '#8a4fd8', '#4a5170'];
  function token() { try { return JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { return ''; } }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function teaser(signedIn) {
    box.innerHTML = '<div class="pe-teaser"><span class="pf-badge prem">★ Premium</span><h3>Your portfolio’s extra edge</h3>' +
      '<ul><li>A Financial Health score for every holding, and one for your whole portfolio</li><li>Your mix by area of the economy, with warnings if one company or area is too big</li><li>Your estimated dividend yield, and each price against what you paid</li><li>Shariah status for each holding, and the full <a href="/portfolio-health">portfolio health check</a></li></ul>' +
      '<a class="mb-btn" href="/membership">' + (signedIn ? 'Upgrade to Premium' : 'See Premium') + '</a></div>';
  }
  function donut(sectors) {
    var r = 42, len = 2 * Math.PI * r, off = 0;
    var arcs = sectors.map(function (s, i) {
      var l = len * s.weight / 100; var a = '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + COLOURS[i % COLOURS.length] + '" stroke-width="20" stroke-dasharray="' + l.toFixed(1) + ' ' + len.toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 60 60)"/>'; off += l; return a;
    }).join('');
    return '<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">' + arcs + '</svg>';
  }
  function draw(d) {
    if (!d.rows || !d.rows.length) { box.innerHTML = '<div class="pe-teaser"><span class="pf-badge prem">★ Premium</span><h3>Your portfolio’s extra edge</h3><p>Add a holding above to see health scores, your sector mix, yield and Shariah status.</p></div>'; return; }
    var s = d.summary;
    var rows = d.rows.map(function (r) {
      return '<tr><td><a href="/stock/' + encodeURIComponent(r.ticker) + '#healthCheck"><strong>' + esc(r.name) + '</strong></a><small>' + esc(r.ticker) + ' · ' + esc(r.sector) + '</small></td>' +
        '<td>' + Math.round(r.weight) + '%</td>' +
        '<td>' + (r.score == null ? '<span class="pe-muted">n/a</span>' : '<span class="fh-pill" style="--c:' + r.colour + '">' + r.score + '</span>') + '</td>' +
        '<td>' + (r.price ? '$' + r.price.toFixed(2) + (r.vsCost != null ? ' <small class="' + (r.vsCost >= 0 ? 'up' : 'down') + '">' + (r.vsCost >= 0 ? '+' : '') + r.vsCost.toFixed(1) + '% vs paid</small>' : '') : '<span class="pe-muted">after launch</span>') + '</td>' +
        '<td>' + (r.yield != null ? r.yield.toFixed(2) + '%' : '<span class="pe-muted">–</span>') + '</td>' +
        '<td>' + (r.shariah ? esc(r.shariah) : '<span class="pe-muted">–</span>') + '</td></tr>';
    }).join('');
    box.innerHTML = '<div class="pe-panel"><div class="pe-head"><span class="pf-badge prem">★ Premium</span><h3>Your portfolio’s extra edge</h3></div>' +
      '<div class="pe-tiles"><div><strong>' + (s.health == null ? '–' : s.health) + '</strong><span>Portfolio health' + (s.band ? ': ' + esc(s.band) : '') + '</span></div>' +
      '<div><strong>' + (s.estYield == null ? '–' : s.estYield.toFixed(2) + '%') + '</strong><span>Estimated dividend yield</span></div>' +
      '<div><strong>' + s.sectors.length + '</strong><span>Areas of the economy</span></div>' +
      '<div><strong>' + s.shariahPass + ' of ' + d.rows.length + '</strong><span>Pass the AAOIFI Shariah check</span></div></div>' +
      '<div class="pe-mid"><div class="pe-donut">' + donut(s.sectors) + '<ul>' + s.sectors.map(function (x, i) { return '<li><i style="background:' + COLOURS[i % COLOURS.length] + '"></i>' + esc(x.name) + ' <b>' + Math.round(x.weight) + '%</b></li>'; }).join('') + '</ul></div>' +
      '<div class="pe-notes"><h4>Worth knowing</h4><ul>' + s.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul><a href="/portfolio-health">Open the full portfolio health check →</a></div></div>' +
      '<div class="table-scroll"><table class="pe-table"><thead><tr><th>Holding</th><th>Share</th><th>Health</th><th>Latest price</th><th>Yield</th><th>Shariah</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="pe-foot">' + (s.weightsTyped ? 'Weighted by the share of portfolio you entered.' : 'No shares of portfolio entered, so each holding counts equally.') + ' From official company figures and the latest saved prices. Not advice to buy or sell.</p></div>';
  }
  function load() {
    var t = token();
    if (!t) { teaser(false); return; }
    fetch('/api/member/portfolio-edge', { headers: { 'x-session-token': t } })
      .then(function (r) { if (r.status === 403 || r.status === 401) { teaser(r.status === 403); return null; } return r.ok ? r.json() : null; })
      .then(function (d) { if (d) draw(d); })
      .catch(function () {});
  }
  document.addEventListener('submit', function (e) { if (e.target && e.target.id === 'portfolioForm') setTimeout(load, 1500); });
  document.addEventListener('click', function (e) { if (e.target.closest && (e.target.closest('#refreshReviewButton') || e.target.closest('#portfolioList button'))) setTimeout(load, 1500); });
  load();
})();
