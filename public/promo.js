/* Offer pop-up on the homepage (Admin → Offers). Appears a couple of
   seconds after the page opens, to visitors who aren't Premium, at most once
   every 3 days per offer. The button goes to the membership page with the
   discount code filled in, so the analytics can count members it brought. */
(function () {
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
  fetch('/api/site/promo?tz=' + encodeURIComponent(tz), { headers: token ? { 'x-session-token': token } : {} })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var p = d && d.promo;
      if (!p) return;
      var KEY = 'dmw-promo-' + p.id;
      try { var last = Number(localStorage.getItem(KEY) || 0); if (Date.now() - last < 3 * 86400000) return; } catch (e) { /* show it */ }
      setTimeout(function () { show(p, KEY); }, (p.delay == null ? 2 : p.delay) * 1000);
    }).catch(function () {});

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ping(id, type) { try { fetch('/api/site/promo/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, type: type }), keepalive: true }); } catch (e) { /* ignore */ } }

  function show(p, KEY) {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
    var href = '/membership?coupon=' + encodeURIComponent(p.code) + '&src=popup-' + p.id + '#plans';
    var until = '';
    try { until = new Date(p.endAt + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }); } catch (e) { until = p.endAt; }
    var wrap = document.createElement('div');
    wrap.className = 'promo-pop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', p.headline);
    wrap.innerHTML = '<div class="promo-box">' +
      '<button type="button" class="promo-x" aria-label="Close">×</button>' +
      (p.image ? '<a href="' + href + '" class="promo-img" data-go><img src="' + esc(p.image) + '" alt="' + esc(p.headline) + ': ' + esc(p.percent) + '% off Premium"></a>' : '') +
      '<div class="promo-body"><span class="promo-tag">' + esc(p.occasion) + '</span><h2>' + esc(p.headline) + '</h2><p>' + esc(p.text) + '</p>' +
      '<a class="promo-btn" href="' + href + '" data-go>' + esc(p.button) + '</a>' +
      '<p class="promo-brand"><b>Dr MoneyWise</b> · Become financially healthy, wealthy and wise.</p>' +
      '<p class="promo-small">Code <b>' + esc(p.code) + '</b> · until ' + esc(until) + ' · cancel any time</p></div></div>';
    document.body.appendChild(wrap);
    ping(p.id, 'view');
    requestAnimationFrame(function () { wrap.classList.add('on'); });
    function close() { wrap.classList.remove('on'); setTimeout(function () { wrap.remove(); }, 250); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('.promo-x')) { close(); return; }
      if (e.target.closest('[data-go]')) {
        ping(p.id, 'click');
        // Remember the offer, so it still applies after signing up first
        try { localStorage.setItem('dmw-offer', JSON.stringify({ code: p.code, src: 'popup-' + p.id, until: p.endAt })); } catch (err) { /* ignore */ }
      }
    });
    var btn = wrap.querySelector('.promo-btn'); if (btn) btn.focus({ preventScroll: true });
  }
})();
