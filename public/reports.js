/* Monthly research report: Premium members get the full report in place of the preview. */
(function () {
  var app = document.getElementById('rpApp');
  if (!app) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return;
  fetch('/api/reports/' + encodeURIComponent(app.dataset.id), { headers: { 'x-session-token': token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.html) app.innerHTML = d.html; else { var l = document.querySelector('#rpLock strong'); if (l) l.textContent = 'The full report is part of Premium.'; } })
    .catch(function () { /* keep the preview */ });
}());
