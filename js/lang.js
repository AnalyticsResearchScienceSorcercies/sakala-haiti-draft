/* Sitewide EN <-> FR machine-translation switch for konkret-haiti.com.
   Drives the Google Website Translate widget through the `googtrans` cookie so the
   language choice sticks across every page (no per-page mirror needed). Brand terms
   (KONKRET, BARSS, TapTap, Konbit, Konekte Kreye Travay ...) are locked with
   .notranslate so machine translation never mangles them. A custom EN | FR button
   lives in the nav (desktop + mobile); Google's grey banner is hidden. First-time
   French-language browsers are auto-switched to French. Idempotent.

   Graceful degradation: if this script fails to load, the existing a.kn-lang link
   still points to the hand-written -fr.html mirror. */
(function () {
  var COOKIE = 'googtrans';
  var STORE  = 'kn-lang-choice';          // set to 'fr' | 'en' once the user picks explicitly
  var HOST   = location.hostname;         // konkret-haiti.com (also set the dotted variant)

  // Brand tokens that must survive untranslated. Exact, case-sensitive, whole-token.
  var NOTRANSLATE = ['KONKRET', 'Konkret', 'BARSS', 'SAKALA', 'TapTaps', 'TapTap',
    'Tap Tap', 'Konbit', 'Konekte Kreye Travay', 'Bay yo Travay', 'Bayo Travay',
    'FatraKa', 'Fatraka', 'Job Power', 'MonCash', 'Pratik'];

  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  }
  // val like '/en/fr' to translate to French, or '' to clear (back to English).
  function setGoogTrans(val) {
    [HOST, '.' + HOST, ''].forEach(function (d) {
      var c = COOKIE + '=' + (val || '') + '; path=/';
      if (d) c += '; domain=' + d;
      if (!val) c += '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = c;
    });
  }
  function currentLang() {
    return /\/fr$/.test(getCookie(COOKIE)) ? 'fr' : 'en';
  }

  // ---- brand lock: wrap exact tokens in <span class="notranslate"> ----
  function lockBrand() {
    if (!document.body || document.body.getAttribute('data-brand-locked')) return;
    var esc = NOTRANSLATE.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    var rx  = new RegExp('(' + esc.join('|') + ')');
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !rx.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== document.body) {
          if (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
          if (p.classList && p.classList.contains('notranslate')) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    var rxg = new RegExp(rx.source, 'g');
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment(), last = 0, s = node.nodeValue, m;
      rxg.lastIndex = 0;
      while ((m = rxg.exec(s))) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        var span = document.createElement('span');
        span.className = 'notranslate';
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    document.body.setAttribute('data-brand-locked', '1');
  }

  function applyLang(lang, reload) {
    setGoogTrans(lang === 'fr' ? '/en/fr' : '');
    if (reload) location.reload();
  }
  function toggle() {
    var next = currentLang() === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem(STORE, next); } catch (e) {}
    applyLang(next, true);
  }
  function labelFor() { return currentLang() === 'fr' ? 'EN' : 'FR'; }

  // ---- Google widget bootstrap (only loaded when a translation is active) ----
  function loadWidget() {
    if (window.__knGT) return;
    window.__knGT = true;
    if (!document.getElementById('google_translate_element')) {
      var host = document.createElement('div');
      host.id = 'google_translate_element';
      host.style.display = 'none';
      document.body.appendChild(host);
    }
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(s);
  }

  function wireButtons() {
    // desktop: reuse the existing a.kn-lang if present, else inject before the hamburger
    var btn = document.querySelector('.kn-nav a.kn-lang');
    if (!btn) {
      var container = document.querySelector('.kn-nav .container') || document.querySelector('.kn-nav');
      var ham = document.querySelector('.kn-nav .kn-hamburger');
      if (container) {
        btn = document.createElement('a');
        btn.className = 'kn-lang';
        if (ham && ham.parentNode) ham.parentNode.insertBefore(btn, ham);
        else container.appendChild(btn);
      }
    }
    if (btn) {
      btn.removeAttribute('href');
      btn.style.cursor = 'pointer';
      btn.setAttribute('role', 'button');
      btn.classList.add('notranslate');
      btn.textContent = labelFor();
      btn.setAttribute('aria-label', currentLang() === 'fr'
        ? 'Switch to English' : 'Voir le site en francais / View in French');
      btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    }
    // mobile menu: append a toggle link
    var mob = document.getElementById('kn-mobile-nav') || document.querySelector('.kn-mobile');
    if (mob && !document.getElementById('kn-lang-mob')) {
      var m = document.createElement('a');
      m.id = 'kn-lang-mob';
      m.className = 'notranslate';
      m.style.cursor = 'pointer';
      m.textContent = currentLang() === 'fr' ? 'English' : 'Francais';
      m.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
      mob.appendChild(m);
    }
  }

  function hideBanner() {
    if (document.getElementById('kn-gt-style')) return;
    var st = document.createElement('style');
    st.id = 'kn-gt-style';
    st.textContent =
      '.goog-te-banner-frame,.skiptranslate>iframe{display:none!important;}' +
      'body{top:0!important;position:static!important;}' +
      '#goog-gt-tt,.goog-te-balloon-frame{display:none!important;}' +
      '.goog-text-highlight{background:none!important;box-shadow:none!important;}' +
      '#google_translate_element{display:none!important;}' +
      'font[style]{background:none!important;box-shadow:none!important;}';
    document.head.appendChild(st);
  }

  function init() {
    hideBanner();
    lockBrand();
    wireButtons();

    // auto-detect: first visit, no explicit choice, browser prefers French -> switch once
    var chosen = null;
    try { chosen = localStorage.getItem(STORE); } catch (e) {}
    if (!chosen && currentLang() === 'en') {
      var lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (lang.indexOf('fr') === 0) { applyLang('fr', true); return; }
    }
    // if a translation is active, load the widget so it renders on this page
    if (currentLang() === 'fr' || getCookie(COOKIE)) loadWidget();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
