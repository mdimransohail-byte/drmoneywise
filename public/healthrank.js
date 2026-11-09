/* Financial Health Check: Premium members see the company's place in its
   industry, check by check (from /api/health/rank). Everyone else keeps the
   "See Premium" box that the page already shows. */
(function () {
  var box = document.querySelector('[data-health-rank]');
  if (!box) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  fetch('/api/health/rank?ticker=' + encodeURIComponent(box.dataset.healthRank), { headers: { 'x-session-token': token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var r = d && d.rank;
      if (!r) return;
      if (!r.position) { box.innerHTML = '<div><b>Industry ranking</b><span>Not enough similar companies with scores yet in ' + esc(r.group) + '.</span></div>'; return; }
      var rows = r.checks.map(function (c) {
        var me = c.points == null ? 'n/a' : c.points; var avg = c.average == null ? 'n/a' : c.average;
        var tone = c.points == null || c.average == null ? '' : c.points > c.average ? 'up' : c.points < c.average ? 'down' : '';
        return '<tr class="' + tone + '"><td>' + esc(c.label) + '</td><td>' + me + '</td><td>' + avg + '</td></tr>';
      }).join('');
      var peers = r.peers.map(function (p, i) { return '<li><a href="/stock/' + encodeURIComponent(p.ticker) + '#healthCheck">' + (i + 1) + '. ' + esc(p.name) + '</a> <b>' + p.score + '</b></li>'; }).join('');
      box.className = 'fh-rank open';
      box.innerHTML = '<div class="fh-rank-head"><span class="pf-badge prem">Premium</span><h3>Number ' + r.position + ' of ' + r.of + ' in ' + esc(r.group) + '</h3><p>Industry average score: ' + r.average + '/100.</p></div>' +
        '<div class="fh-rank-grid"><table class="fh-cmp"><thead><tr><th>Check</th><th>This company</th><th>Industry average</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<ol class="fh-peers">' + peers + '</ol></div>';
    })
    .catch(function () {});
})();
