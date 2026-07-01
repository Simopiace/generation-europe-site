(function () {
  var KEY = 'ge_cookie_consent';
  if (localStorage.getItem(KEY) === 'accepted') return;

  var it = document.documentElement.lang === 'it';

  var text = it
    ? 'Questo sito utilizza solo cookie essenziali, necessari al suo funzionamento. ' +
      'Non utilizziamo cookie di tracciamento, pubblicitari o statistici. ' +
      '<a href="privacy-policy.html#cookies">Scopri di più</a>.'
    : 'This website uses only essential cookies necessary for its operation. ' +
      'We do not use tracking, advertising, or analytics cookies. ' +
      '<a href="privacy-policy.html#cookies">Read more</a>.';

  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', it ? 'Avviso cookie' : 'Cookie notice');
  banner.innerHTML =
    '<div class="cookie-banner-content">' +
      '<p>' + text + '</p>' +
      '<button class="cookie-banner-accept" type="button">OK</button>' +
    '</div>';

  document.body.appendChild(banner);

  banner.querySelector('.cookie-banner-accept').addEventListener('click', function () {
    try { localStorage.setItem(KEY, 'accepted'); } catch (e) {}
    banner.classList.add('cookie-banner-dismiss');
    setTimeout(function () { banner.remove(); }, 250);
  });
})();
