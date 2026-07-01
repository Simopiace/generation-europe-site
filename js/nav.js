(function () {
  var btn = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', function () {
    var open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('is-open');
  });
  document.addEventListener('click', function (e) {
    if (!btn.contains(e.target) && !links.contains(e.target)) {
      btn.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
    }
  });
})();

// Ricorda la lingua scelta quando l'utente usa lo switch EN/IT (cookie "ge_lang"),
// cosi' la scelta manuale ha la precedenza sul redirect automatico per lingua.
(function () {
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var a = t.closest('.lang-switch a.lang-opt');
    if (!a) return;
    var lang = a.getAttribute('lang');
    if (lang === 'en' || lang === 'it') {
      document.cookie = 'ge_lang=' + lang + '; path=/; max-age=31536000; samesite=lax';
    }
  });
})();
