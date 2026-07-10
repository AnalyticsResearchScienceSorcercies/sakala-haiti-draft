/* Sitewide "Give" injector for konkret-haiti.com.
   Renders (1) an always-on floating button, (2) a nav CTA, (3) a footer link,
   all pointing straight to the SAKALA International PayPal donation (tax-deductible).
   Label localizes to "Donner" on -fr pages, "Give" elsewhere. Idempotent. */
(function () {
  var PAYPAL = 'https://www.paypal.com/donate/?business=PF49VDYFMRYQN&item_name=Job+Power&currency_code=USD';
  var file = (location.pathname.split('/').pop() || 'index.html');
  var isFr = /-fr\.html$/.test(file);
  var LABEL = isFr ? 'Donner' : 'Give';
  var ARIA = LABEL + (isFr
    ? ' (ouvre PayPal, don deductible d\'impot a SAKALA International)'
    : ' (opens PayPal, tax-deductible to SAKALA International)');

  function mkGive(id, cls) {
    var a = document.createElement('a');
    a.id = id;
    if (cls) a.className = cls;
    a.href = PAYPAL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = LABEL;
    a.setAttribute('aria-label', ARIA);
    return a;
  }

  function inject() {
    // ---- shared styles (once) ----
    if (!document.getElementById('kn-give-style')) {
      var st = document.createElement('style');
      st.id = 'kn-give-style';
      st.textContent =
        '#kn-give-fab{position:fixed;right:20px;bottom:20px;z-index:9999;' +
        'font-family:"Courier Prime",monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:700;' +
        'color:#fff;background:var(--voice-green,#1F6F5F);text-decoration:none;padding:14px 24px;border-radius:40px;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.35);transition:transform .15s ease,background .15s ease;}' +
        '#kn-give-fab:hover{background:#15140f;transform:translateY(-2px);}' +
        '@media(max-width:640px){#kn-give-fab{right:14px;bottom:14px;padding:12px 18px;font-size:12px;letter-spacing:1.5px;}}' +
        '@media print{#kn-give-fab{display:none;}}' +
        '.kn-cta-give{background:var(--voice-green,#1F6F5F)!important;color:#fff!important;border-color:var(--voice-green,#1F6F5F)!important;}';
      document.head.appendChild(st);
    }

    // ---- 1. floating button ----
    if (!document.getElementById('kn-give-fab')) {
      document.body.appendChild(mkGive('kn-give-fab', null));
    }

    // ---- 2. desktop nav CTA (before the language toggle, else the hamburger) ----
    if (!document.getElementById('kn-give-nav')) {
      var anchor = document.querySelector('.kn-nav a.kn-lang') ||
                   document.querySelector('.kn-nav .kn-hamburger');
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(mkGive('kn-give-nav', 'kn-cta kn-cta-give'), anchor);
      }
    }

    // ---- 2b. mobile nav (first link) ----
    if (!document.getElementById('kn-give-mob')) {
      var mob = document.getElementById('kn-mobile-nav') || document.querySelector('.kn-mobile');
      if (mob) {
        var firstA = mob.querySelector('a');
        var mb = mkGive('kn-give-mob', null);
        if (firstA) mob.insertBefore(mb, firstA); else mob.appendChild(mb);
      }
    }

    // ---- 3. footer link (Take Action / Agir column) ----
    if (!document.getElementById('kn-give-foot')) {
      var titles = document.querySelectorAll('.kn-footer-col-title');
      for (var i = 0; i < titles.length; i++) {
        var t = (titles[i].textContent || '').trim();
        if (t === 'Take Action' || t === 'Agir') {
          titles[i].parentNode.insertBefore(mkGive('kn-give-foot', null), titles[i].nextSibling);
          break;
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
