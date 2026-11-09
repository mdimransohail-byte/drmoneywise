/* /shariah/<market>: filter buttons (everyone) and, for Premium members,
   each company's ratios and the share of dividends to give to charity. */
(function () {
  var table = document.querySelector('[data-sh-market]');
  if (!table) return;
  var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
  var buttons = document.querySelectorAll('[data-sh-filter]');
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(buttons, function (x) { x.classList.toggle('on', x === b); });
      var f = b.getAttribute('data-sh-filter');
      rows.forEach(function (r) {
        var passes = (r.getAttribute('data-passes') || '').split(' ').filter(Boolean);
        var show = !f || (f === 'all5' ? passes.length === 5 : f === 'held' ? Number(r.getAttribute('data-held')) > 0 : passes.indexOf(f) >= 0);
        r.hidden = !show;
      });
    });
  });

  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return;
  fetch('/api/shariah?market=' + encodeURIComponent(table.getAttribute('data-sh-market')), { headers: { 'x-session-token': token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.rows) return;
      var by = {};
      d.rows.forEach(function (x) { by[x.ticker] = x; });
      var pct = function (v) { return v == null ? '—' : v.toFixed(1) + '%'; };
      rows.forEach(function (r) {
        var x = by[r.getAttribute('data-t')];
        if (!x) return;
        var ratio = r.querySelector('[data-ratio]');
        var purify = r.querySelector('[data-purify]');
        var q = x.ratios || {};
        ratio.innerHTML = '<span class="sh-ratio" title="Debt as a share of total assets; cash and interest-bearing investments as a share of total assets">' + pct(q.debtAssets) + '<small>cash ' + pct(q.cashAssets) + '</small></span>';
        purify.innerHTML = x.purify == null ? '<span class="sh-dash">—</span>' : '<span class="sh-ratio" title="Interest income as a share of total income, from the latest yearly report">' + pct(x.purify) + '<small>of dividends</small></span>';
      });
      var note = document.querySelector('[data-sh-prem-note]');
      if (note) note.textContent = 'Debt and cash are shown as a share of total assets. “Give to charity” is interest income as a share of total income in the latest yearly report: the part of your dividends many scholars ask you to give away. It leaves out other non-permitted income we can’t see in the filings.';
    })
    .catch(function () { /* the locks stay */ });
}());
