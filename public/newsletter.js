/* Newsletter sign-up boxes (any page): sends the email address, then shows
   "check your inbox". The address is confirmed by a link in that email. */
(function () {
  var forms = document.querySelectorAll('[data-nl-form]');
  // Members already get the Saturday newsletter: show that instead of the sign-up box
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (token) {
    Array.prototype.forEach.call(forms, function (f) {
      var note = document.createElement('div');
      note.className = 'nl-member';
      note.innerHTML = '<strong>✓ You get our Saturday newsletter as a member.</strong> <span>Every Saturday at 6am (Dubai time): company news, charts and the week’s lessons.</span> <a href="/membership">Change your emails</a>';
      f.parentNode.replaceChild(note, f);
    });
    return;
  }
  Array.prototype.forEach.call(forms, function (f) {
    if (f.getAttribute('data-ready')) return;
    f.setAttribute('data-ready', '1');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button');
      var msg = f.querySelector('.nl-msg');
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/site/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email.value, source: f.getAttribute('data-source') || '' }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Something went wrong.'); return d; }); })
        .then(function (d) {
          msg.className = 'nl-msg good';
          msg.textContent = d.already ? 'You’re already signed up. Thank you!' : 'Nearly done: please click the link in the email we’ve just sent you. (Check your spam folder if it isn’t there in a few minutes.)';
          f.email.value = ''; btn.textContent = 'Sign me up'; btn.disabled = false;
        })
        .catch(function (err) { msg.className = 'nl-msg bad'; msg.textContent = err.message; btn.textContent = 'Sign me up'; btn.disabled = false; });
    });
  });
}());
