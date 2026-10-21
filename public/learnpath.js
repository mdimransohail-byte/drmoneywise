/* ════════════════════════════════════════════════════════════════════════
   Your learning path — level tabs, ticks and progress rings.
   Members: ticks saved to their account (/api/member/learning) and the
   starting level comes from their profile. Visitors: ticks kept in this
   browser only.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var page = document.querySelector('.lp-page');
  if (!page) return;
  var KEY = 'drmoneywise-learning';
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  var done = {};
  try { (JSON.parse(localStorage.getItem(KEY) || '[]') || []).forEach(function (id) { done[id] = 1; }); } catch (e) { /* none */ }
  var member = false;

  function levelOf(profile) {
    if (!profile) return null;
    var exp = profile.experience, know = profile.knowledge;
    if (exp === '3-10' || exp === '10+' || know === 'confident' || know === 'expert') return 'confident';
    if (exp === '1-3' || know === 'some') return 'build';
    return 'start';
  }
  function show(level) {
    page.querySelectorAll('.lp-level').forEach(function (s) { s.hidden = s.dataset.level !== level; });
    page.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === level); b.setAttribute('aria-selected', b.dataset.tab === level); });
    try { sessionStorage.setItem('lp-level', level); } catch (e) { /* ignore */ }
  }
  function paint() {
    var total = 0, n = 0;
    page.querySelectorAll('.lp-level').forEach(function (s) {
      var steps = s.querySelectorAll('.lp-step'), k = 0;
      steps.forEach(function (li) { var on = Boolean(done[li.dataset.step]); li.classList.toggle('is-done', on); li.querySelector('[data-done]').checked = on; if (on) k += 1; });
      total += steps.length; n += k;
      var ring = s.querySelector('.lp-ring'); if (ring) ring.setAttribute('stroke-dasharray', (113 * k / steps.length).toFixed(1) + ' 113');
      var b = s.querySelector('.lp-progress b'); if (b) b.textContent = k + '/' + steps.length;
      var tab = page.querySelector('[data-tab="' + s.dataset.level + '"]'); if (tab) tab.classList.toggle('complete', k === steps.length);
    });
    var big = document.getElementById('lpRing'); if (big) big.setAttribute('stroke-dasharray', (315 * n / (total || 1)).toFixed(1) + ' 315');
    var c = document.getElementById('lpCount'); if (c) c.textContent = n;
  }
  function save() {
    var ids = Object.keys(done);
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ }
    if (!member) return;
    fetch('/api/member/learning', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token }, body: JSON.stringify({ done: ids }) }).catch(function () { /* kept in this browser */ });
  }

  page.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); window.scrollTo({ top: page.querySelector('.lp-tabs').offsetTop - 10, behavior: 'smooth' }); }); });
  page.querySelectorAll('[data-done]').forEach(function (box) {
    box.addEventListener('change', function () { if (box.checked) done[box.dataset.done] = 1; else delete done[box.dataset.done]; paint(); save(); });
  });

  var saved = ''; try { saved = sessionStorage.getItem('lp-level') || ''; } catch (e) { saved = ''; }
  show(saved || 'start');
  paint();

  if (!token) return;
  fetch('/api/member/learning', { headers: { 'x-session-token': token } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    member = true;
    // Merge ticks from this browser into the account the first time
    var before = Object.keys(done).length;
    (d.done || []).forEach(function (id) { done[id] = 1; });
    paint();
    if (Object.keys(done).length !== (d.done || []).length || before) save();
    var lvl = levelOf(d.profile);
    var note = document.getElementById('lpNote');
    if (lvl && !saved) { show(lvl); if (note) note.textContent = 'We started you at “' + page.querySelector('[data-tab="' + lvl + '"]').textContent.replace(/^\d/, '') + '” because of the investing experience in your profile. Switch level any time.'; }
    else if (!d.profile && note) note.innerHTML = 'Fill in <a href="/membership#profileForm">your profile</a> and we’ll start you at the level that fits your experience. Your ticks are saved to your account.';
    else if (note) note.textContent = 'Your ticks are saved to your account.';
  }).catch(function () { /* stay with this browser */ });
}());
