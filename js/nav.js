/* Sitewide navigation for konkret-haiti.com — single source of truth.
   Rebuilds the desktop top-bar (.kn-links) into 5 grouped hover-dropdowns + Contact,
   and the mobile overlay (#kn-mobile-nav) into a grouped list.
   Surgical: only replaces the .kn-links UL contents and the #kn-mobile-nav links.
   Leaves brand, CTAs, language toggle untouched, and keeps mobile links as DIRECT
   children so donate.js / lang.js still find an anchor to inject before.
   Runs synchronously at end-of-body (before donate.js / lang.js DOMContentLoaded). Idempotent. */
(function () {
  if (window.__knNavBuilt) return;

  var segs = location.pathname.split('/').filter(Boolean);
  var file = segs.length ? segs[segs.length - 1] : 'index.html';
  if (!/\.html?$/.test(file)) file = 'index.html';
  var pref = segs.length > 1 ? new Array(segs.length).join('../') : '';
  function u(h) { return /^(https?:|mailto:|#)/.test(h) ? h : pref + h; }
  function leaf(h) { return h.split('/').pop(); }
  var here = file;

  var MENU = [
    { label: 'About', href: 'a-propos.html', items: [
      ['About Us', 'a-propos.html'], ['KONKRET', 'konkret.html'],
      ['Our History', 'notre-histoire.html'], ['Leadership', 'leadership.html'],
      ['Voices', 'temoignages.html'], ['FAQ', 'faq.html'],
      ['Partners', 'partners.html'], ['Transparency', 'documents-publics.html'] ] },
    { label: 'The Model', href: 'nos-actions.html', items: [
      ['How It Works', 'nos-actions.html'], ['What is a TapTap?', 'what-is-a-taptap.html'],
      ['Aprantisaj', 'aprantisaj.html'], ['The Proof', 'programs/proof.html'],
      ['The Unified Model', 'programs/system.html'] ] },
    { label: 'TapTaps', href: 'taptaps.html', items: [
      ['Sponsor a TapTap', 'taptaps.html'], ['The Network', 'network.html'] ] },
    { label: 'Programs', href: 'programs/index.html', items: [
      ['Programs & Data', 'programs/index.html'], ['Cassava', 'programs/cassava.html'],
      ['Rabbits', 'programs/rabbits.html'], ['Harvest Box', 'programs/harvest-box.html'],
      ['FatraKa', 'programs/fatraka.html'], ['Konbit Press', 'programs/konbit-press.html'],
      ['Equipment', 'ekipman.html'], ['Art480', 'programs/art480.html'],
      ['Plaket', 'programs/plaket.html'], ['Konbit Data', 'programs/konbit-data.html'] ] },
    { label: 'Get Involved', href: 'je-veux-un-emploi.html', items: [
      ['Get a Job', 'je-veux-un-emploi.html'], ['Hire Youth', 'employer.html'],
      ['Host a TapTap', 'devenir-partenaire.html'], ['Summer 2026', 'summer-2026.html'],
      ['Donate', 'don.html'] ] },
    { label: 'Contact', href: 'contact.html' }
  ];

  // ---------- desktop ----------
  var ul = document.querySelector('.kn-nav .kn-links');
  if (ul) {
    ul.innerHTML = '';
    MENU.forEach(function (g) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = u(g.href); a.textContent = g.label;
      var childActive = g.items && g.items.some(function (it) { return leaf(it[1]) === here; });
      if (childActive || leaf(g.href) === here) a.classList.add('active');
      li.appendChild(a);
      if (g.items) {
        li.className = 'kn-has';
        var dd = document.createElement('div'); dd.className = 'kn-dd';
        g.items.forEach(function (it) {
          var ia = document.createElement('a');
          ia.href = u(it[1]); ia.textContent = it[0];
          if (leaf(it[1]) === here) ia.classList.add('active');
          dd.appendChild(ia);
        });
        li.appendChild(dd);
      }
      ul.appendChild(li);
    });
  }

  // ---------- mobile (flat grouped; anchors stay direct children) ----------
  var mob = document.getElementById('kn-mobile-nav');
  if (mob) {
    mob.classList.add('kn-mobile-grouped');
    mob.innerHTML = '';
    var close = document.createElement('button');
    close.className = 'kn-mobile-close'; close.textContent = 'Close';
    close.onclick = function () { mob.classList.remove('open'); };
    mob.appendChild(close);

    var home = document.createElement('a');
    home.href = u('index.html'); home.textContent = 'Home'; home.className = 'kn-mtop';
    mob.appendChild(home); // first anchor = donate/lang injection anchor

    MENU.forEach(function (g) {
      if (!g.items) {
        var solo = document.createElement('a');
        solo.href = u(g.href); solo.textContent = g.label; solo.className = 'kn-mtop';
        mob.appendChild(solo); return;
      }
      var hd = document.createElement('div'); hd.className = 'kn-mgroup-hd';
      hd.textContent = g.label; mob.appendChild(hd);
      g.items.forEach(function (it) {
        var ia = document.createElement('a'); ia.href = u(it[1]); ia.textContent = it[0];
        if (leaf(it[1]) === here) ia.classList.add('active');
        mob.appendChild(ia);
      });
    });
  }

  // ---------- styles (self-contained) ----------
  if (!document.getElementById('kn-nav-style')) {
    var st = document.createElement('style'); st.id = 'kn-nav-style';
    st.textContent = [
      '.kn-nav .kn-links{align-items:stretch;overflow:visible;}',
      '.kn-links>li{position:relative;display:flex;align-items:center;height:60px;list-style:none;}',
      '.kn-links>li>a{display:inline-flex;align-items:center;gap:5px;}',
      '.kn-links>li.kn-has>a{cursor:pointer;}',
      '.kn-links>li.kn-has>a::after{content:"\\25BE";font-size:9px;opacity:.55;}',
      '.kn-dd{position:absolute;top:100%;left:50%;transform:translateX(-50%);min-width:214px;',
        'background:#0a0a0a;border:1px solid #1d1d1d;border-top:2px solid var(--sodium-orange,#FF6A1F);',
        'padding:7px 0;display:none;flex-direction:column;box-shadow:0 16px 42px rgba(0,0,0,.6);z-index:260;}',
      '.kn-links>li.kn-has:hover>.kn-dd,.kn-links>li.kn-has:focus-within>.kn-dd{display:flex;}',
      '.kn-dd a{padding:9px 22px;white-space:nowrap;font-family:"Courier Prime",monospace;font-size:11px;',
        'letter-spacing:1px;text-transform:uppercase;color:rgba(244,239,226,.6);transition:color .12s,background .12s;}',
      '.kn-dd a:hover,.kn-dd a.active{color:var(--sodium-orange,#FF6A1F);background:rgba(255,106,31,.08);}',
      '.kn-mobile.kn-mobile-grouped{justify-content:flex-start;align-items:stretch;gap:0;',
        'padding:68px 26px 48px;overflow-y:auto;}',
      '.kn-mobile-grouped>a,.kn-mobile-grouped>.kn-mgroup-hd{width:100%;max-width:440px;margin-left:auto;margin-right:auto;}',
      '.kn-mgroup-hd{font-family:"Courier Prime",monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;',
        'color:var(--sodium-orange,#FF6A1F);padding:20px 0 8px;border-bottom:1px solid rgba(244,239,226,.14);margin-bottom:6px;}',
      '.kn-mobile-grouped>a{font-family:"Anton",sans-serif;font-size:19px;letter-spacing:1px;text-transform:uppercase;',
        'color:var(--bone,#F4EFE2);padding:8px 0;}',
      '.kn-mobile-grouped>a.kn-mtop{font-size:23px;padding:12px 0;}',
      '.kn-mobile-grouped>a:hover,.kn-mobile-grouped>a.active{color:var(--sodium-orange,#FF6A1F);}'
    ].join('');
    document.head.appendChild(st);
  }

  window.__knNavBuilt = true;
})();
