/* ════════════════════════════════════════════════════════════════════════
   Members-only "Deeper look" on commodity, bond and ETF pages.
   Free visitors keep the teaser. Signed-in paying members get the extra
   charts and tables from /api/markets/details (never in the free HTML).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var box = document.getElementById('marketsMembers');
  var content = document.getElementById('marketsMembersContent');
  if (!box || !content) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return; // not signed in: keep the teaser

  function load(other) {
    var url = '/api/markets/details?kind=' + encodeURIComponent(box.dataset.kind) + '&id=' + encodeURIComponent(box.dataset.id) + (other ? '&other=' + encodeURIComponent(other) : '');
    return fetch(url, { headers: { 'x-session-token': token } }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 403) {
          var cta = content.querySelector('.members-cta');
          if (cta) cta.innerHTML = 'You are on the free plan. <a class="pill-gold" href="/membership">Upgrade to see the deeper look</a>';
          return;
        }
        if (!res.ok || !data.html) return;
        content.classList.remove('members-teaser');
        content.innerHTML = data.html;
        bind();
      });
    }).catch(function () { /* network problem: keep what is shown */ });
  }

  function bind() {
    var form = content.querySelector('[data-overlap]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pick = form.querySelector('select').value;
      if (!pick) return;
      var out = content.querySelector('[data-overlap-result]');
      if (out) out.innerHTML = '<p class="helper-note">Comparing…</p>';
      load(pick).then(function () {
        var again = content.querySelector('[data-overlap-result]');
        if (again) again.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  load('');
}());
