/* /property/cities: Premium members see the city scorecard (stars on five
   fixed tests, ranking, "if the pace continued" sums) from
   /api/property/cities-premium. Others keep the description already shown. */
(function () {
  var box = document.getElementById('cityPremium');
  if (!box) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stars(n) { if (n == null) return '<span class="ct-na">n/a</span>'; var out = ''; for (var i = 1; i <= 5; i++) out += '<span class="' + (n >= i ? 'on' : n >= i - 0.5 ? 'half' : '') + '">★</span>'; return '<span class="fh-stars">' + out + '</span>'; }
  function gbp(v) { return v ? '£' + Math.round(v).toLocaleString('en-GB') : '—'; }
  fetch('/api/property/cities-premium', { headers: { 'x-session-token': token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.cities || !d.cities.length) return;
      var rows = d.cities.map(function (c, i) {
        return '<tr><td class="ct-rank">' + (i + 1) + '</td><td><strong>' + esc(c.name) + '</strong>' + (c.partial ? '<small>Scored on the tests we have figures for</small>' : '') + '</td><td>' + stars(c.overall) + '</td>' +
          c.stars.map(function (s) { return '<td>' + stars(s[1]) + '</td>'; }).join('') + '</tr>';
      }).join('');
      var top = d.cities.filter(function (c) { return c.overall != null && !c.partial; }).slice(0, 3);
      var cards = top.map(function (c, i) {
        var p = c.projection || {};
        return '<div class="ct-top"><span class="ct-medal">' + (i + 1) + '</span><strong>' + esc(c.name) + '</strong>' + stars(c.overall) +
          '<ul>' + (c.yieldPct ? '<li>Gross yield ' + c.yieldPct.toFixed(1) + '%</li>' : '') +
          (c.rent5y != null ? '<li>Rents up about ' + c.rent5y.toFixed(1) + '% a year over 5 years</li>' : '') +
          (p.rent ? '<li>If that pace continued: rent about ' + gbp(p.rent) + ' a month in 5 years (now ' + gbp(c.rent) + ')</li>' : p.rentGrowth5 != null ? '<li>If that pace continued: rents about ' + p.rentGrowth5.toFixed(0) + '% higher in 5 years</li>' : '') +
          (p.price ? '<li>Average price about ' + gbp(p.price) + ' in 5 years (now ' + gbp(c.price) + ')</li>' : '') + '</ul></div>';
      }).join('');
      box.innerHTML = '<div class="ct-prem-head"><span class="pf-badge prem">★ Premium</span><h2>City scorecard: five stars, five tests</h2></div>' +
        '<p>Each city is rated on the five tests below, from official figures. The ranking shows which cities score best on today’s numbers; the “if the pace continued” sums simply extend the last five years and are not forecasts.</p>' +
        '<div class="ct-tops">' + cards + '</div>' +
        '<div class="table-scroll"><table class="ct-score"><thead><tr><th>#</th><th>City</th><th>Overall</th>' + d.cities[0].stars.map(function (s) { return '<th>' + esc(s[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="ct-note">Not advice: property prices and rents can fall, and costs, taxes and borrowing change the picture for every buyer.</p>';
    })
    .catch(function () {});
})();
