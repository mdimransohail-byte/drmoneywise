/* Remembers how a visitor first found us (an advert or newsletter link with
   utm_ tags, Google, Instagram…), so the sign-up can record it. Stored only
   in this browser; sent once, with the sign-up form. A tagged link always
   wins over an earlier untagged visit. */
(function () {
  try {
    var KEY = 'dmw-src';
    var q = new URLSearchParams(location.search);
    var tagged = q.get('utm_source') || q.get('src');
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : '';
    if (tagged || !saved) {
      var rec = {
        utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '',
        via: /^popup/.test(q.get('src') || '') ? 'popup' : '', referrer: ref, landing: location.pathname, at: Date.now(),
      };
      if (tagged || ref || !saved) localStorage.setItem(KEY, JSON.stringify(rec));
    }
  } catch (e) { /* private browsing: nothing saved */ }
})();
