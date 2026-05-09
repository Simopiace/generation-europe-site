(function () {
  var KEY = 'ge_cookie_consent';
  if (localStorage.getItem(KEY) === 'accepted') return;

  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie notice');
  banner.innerHTML =
    '<div class="cookie-banner-content">' +
      '<p>This website uses only essential cookies necessary for its operation. ' +
      'We do not use tracking, advertising, or analytics cookies. ' +
      '<a href="privacy-policy.html#cookies">Read more</a>.</p>' +
      '<button class="cookie-banner-accept" type="button">OK</button>' +
    '</div>';

  document.body.appendChild(banner);

  banner.querySelector('.cookie-banner-accept').addEventListener('click', function () {
    try { localStorage.setItem(KEY, 'accepted'); } catch (e) {}
    banner.classList.add('cookie-banner-dismiss');
    setTimeout(function () { banner.remove(); }, 250);
  });
})();
