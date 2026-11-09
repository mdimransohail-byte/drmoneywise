/* Premium lesson PDFs: buttons with data-pdf-lesson="<slug>" or
   data-pdf-week="<level>:<week>". Members download straight away; others
   are taken to sign in or to the Premium page. */
(function () {
  function token() { try { return JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { return ''; } }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pdf-lesson],[data-pdf-week]');
    if (!btn) return;
    e.preventDefault();
    var t = token();
    if (!t) { location.href = '/#join'; return; }
    var url = btn.dataset.pdfLesson ? '/api/learn/pdf?slug=' + encodeURIComponent(btn.dataset.pdfLesson)
      : '/api/learn/pdf-week?level=' + encodeURIComponent(btn.dataset.pdfWeek.split(':')[0]) + '&week=' + encodeURIComponent(btn.dataset.pdfWeek.split(':')[1]);
    var label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Preparing your PDF…';
    fetch(url, { headers: { 'x-session-token': t } }).then(function (r) {
      if (r.status === 403) { location.href = '/membership#premium'; return null; }
      if (r.status === 401) { location.href = '/#join'; return null; }
      if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'The PDF could not be made'); });
      var name = ((r.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/) || [])[1] || 'drmoneywise-lesson.pdf';
      return r.blob().then(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000)
      }).then(function () { btn.disabled = false; btn.innerHTML = label; });
    }).catch(function (err) {
      btn.textContent = err.message;
      setTimeout(function () { btn.disabled = false; btn.innerHTML = label; }, 4000);
    });
  });
})();
