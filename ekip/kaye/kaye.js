// Kaye Aktivite Pratik, filled in place (2026-10-21).
//
// The page is built by 19. Sorceries/taptap_kaye_aktivite.py --site, which bakes
// window.KAYE: each activity's fields are the SAME spec as the `kaye` form, so
// what is sent here lands in Jesyon exactly like a form answer. 5.1 sends three
// daily reports to rapo-jou, flagged pratik. 6.1 is performed live.
//
// Like the Oganizate: saved on the phone per person (localStorage kaye.v1, a
// name picker for shared phones), each activity sends itself, and a send with
// no signal waits in kaye.voye.v1 and leaves on its own. Photos are the one
// exception: they upload when picked, so they need signal at that moment.
(function(){
"use strict";
var S = window.KAYE;
if(!S){ return; }
var KEY = "kaye.v1", KQ = "kaye.voye.v1";
var DB = load();

// ------------------------------------------------------------ storage
function load(){
  try { var d = JSON.parse(localStorage.getItem(KEY) || "null"); if(d && d.moun){ return d; } } catch(e){}
  return {aktif: null, moun: {}};
}
var SAVE_T = null;
function save(now){
  clearTimeout(SAVE_T);
  var go = function(){ try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch(e){ warnFull(); } };
  if(now){ go(); } else { SAVE_T = setTimeout(go, 250); }
}
function warnFull(){
  var k = document.getElementById("kim");
  if(k && !document.getElementById("plen")){
    k.insertAdjacentHTML("beforeend", '<p class="err" id="plen">Telefòn nan pa ka sove plis. Voye aktivite ki fini yo.</p>');
  }
}
function M(){ return DB.aktif ? DB.moun[DB.aktif] : null; }
function today(){
  var d = new Date(), p = function(n){ return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function blank(v){ return v == null || v === "" || (Array.isArray(v) && !v.length); }
function vals(a){
  var m = M(); if(!m){ return null; }
  if(!m.v[a]){ m.v[a] = {_dat: today()}; }
  return m.v[a];
}

// ------------------------------------------------------------ the spec
var LIS = {}; S.lis.forEach(function(x){ LIS[x.n] = x; });
function specOf(a){
  if(a.indexOf("5.1#") === 0){ return {fields: S.rapo, preset: {}, slug: S.rapo_slug}; }
  var s = S.akt[a];
  return {fields: s.fields.concat(S.lot), preset: s.preset || {}, slug: S.slug, tach: s.tach};
}
function seen(f, V){
  if(!f.si){ return true; }
  return [].concat(f.si.vo || []).map(String).indexOf(String(V[f.si.chan] == null ? "" : V[f.si.chan])) >= 0;
}
function rowsOf(f, V, pre){
  if(!Array.isArray(V[f.key])){
    var p = pre && pre.rows ? pre.rows : [{}];
    // a preset row that prints something is fixed; a blank one is the person's own
    V[f.key] = p.map(function(r){ var o = {}; for(var k in r){ o[k] = r[k]; } o._p = Object.keys(r).length ? 1 : 0; return o; });
  }
  return V[f.key];
}
function fixOf(pre){ return pre ? (pre.band || pre.fix || null) : null; }
// a row counts when something other than its printed column is filled
function kept(f, row, pre){
  var fx = fixOf(pre);
  return f.fields.some(function(c){ return c.key !== fx && !blank(row[c.key]); });
}

// ------------------------------------------------------------ draw
function lab(f){
  return esc(f.label || "") + (f.required ? ' <span class="req">*</span>' : "");
}
function hint(f){ return f.hint ? '<p class="hint">' + esc(f.hint) + "</p>" : ""; }
function inp(type, k, v, extra){
  return '<input type="' + type + '" data-k="' + esc(k) + '" value="' + esc(v == null ? "" : v) + '"' + (extra || "") + ">";
}
function field(f, V, a, pre){
  var k = f.key, v = V[k], h = "";
  if(!seen(f, V)){ return ""; }
  switch(f.type){
    case "text": case "tel":
      h = inp(f.type === "tel" ? "tel" : "text", k, v, f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : ""); break;
    case "number":
      h = inp("number", k, v, ' inputmode="decimal" step="' + esc(f.step || "any") + '"' + (f.min != null ? ' min="' + esc(f.min) + '"' : "")); break;
    case "currency":
      if(f.sum_of){
        var tot = sumOf(f.sum_of, V);
        h = '<div class="cur"><span>' + esc(f.currency || "HTG") + '</span><input type="number" readonly tabindex="-1" value="' + tot + '"></div><p class="hint">Kalkile otomatikman.</p>';
      } else {
        h = '<div class="cur"><span>' + esc(f.currency || "HTG") + "</span>" + inp("number", k, v, ' inputmode="decimal" step="any" min="0"') + "</div>";
      }
      break;
    case "date":
      h = inp("date", k, v); break;
    case "textarea":
      h = '<textarea data-k="' + esc(k) + '" rows="' + (f.rows || 2) + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + ">" + esc(v || "") + "</textarea>"; break;
    case "select":
      h = '<select data-k="' + esc(k) + '"><option value=""></option>' + (f.options || []).map(function(o){
        return '<option value="' + esc(o.v) + '"' + (String(v) === String(o.v) ? " selected" : "") + ">" + esc(o.t) + "</option>";
      }).join("") + "</select>"; break;
    case "radio":
      h = (f.options || []).map(function(o){
        return '<label class="opt"><input type="radio" name="' + esc(a + "|" + k) + '" data-k="' + esc(k) + '" value="' + esc(o.v) + '"' + (String(v) === String(o.v) ? " checked" : "") + "><span>" + esc(o.t) + "</span></label>";
      }).join(""); break;
    case "checkbox":
      var arr = Array.isArray(v) ? v : [];
      h = (f.options || []).map(function(o){
        return '<label class="opt"><input type="checkbox" data-cb="' + esc(k) + '" value="' + esc(o.v) + '"' + (arr.indexOf(String(o.v)) >= 0 ? " checked" : "") + "><span>" + esc(o.t) + "</span></label>";
      }).join(""); break;
    case "file":
      var meta = V["_f_" + k];
      h = '<div class="up" id="up-' + esc(a + "-" + k) + '">'
        + (v && v.path ? '<span class="ok">✓ ' + esc(meta && meta.name || "Foto a voye") + '</span> <button type="button" class="sm" data-unfile="' + esc(k) + '">Retire</button>'
                       : '<button type="button" data-file="' + esc(k) + '">Pran oswa chwazi yon foto</button>')
        + '</div><input type="file" accept="image/*,application/pdf" hidden data-filein="' + esc(k) + '">';
      break;
    case "group":
      return '<div class="fld" data-fld="' + esc(k) + '"><span class="lb">' + lab(f) + "</span>" + hint(f) + group(f, V, pre[k]) + "</div>";
    default:
      h = inp("text", k, v);
  }
  return '<div class="fld" data-fld="' + esc(k) + '"><label>' + lab(f) + "</label>" + h + hint(f) + "</div>";
}
function group(f, V, pre){
  var rows = rowsOf(f, V, pre), fx = fixOf(pre), band = pre && pre.band;
  var cols = f.fields.filter(function(c){ return !(band && c.key === band); });
  var th = cols.map(function(c){
    return "<th>" + esc(c.label) + (c.type === "currency" ? " (" + esc(c.currency || "HTG") + ")" : "") + (c.required ? ' <span class="req">*</span>' : "") + "</th>";
  }).join("");
  var body = "", last = null, opt = {};
  f.fields.forEach(function(c){ (c.options || []).forEach(function(o){ opt[c.key + "|" + o.v] = o.t; }); });
  rows.forEach(function(r, i){
    if(band && r[band] !== last){
      last = r[band];
      body += '<tr class="bn"><td colspan="' + (cols.length + 1) + '">' + esc(opt[band + "|" + r[band]] || r[band] || "") + "</td></tr>";
    }
    body += "<tr>" + cols.map(function(c){
      var v = r[c.key];
      var dl = ' data-l="' + esc(c.label) + (c.type === "currency" ? " (" + esc(c.currency || "HTG") + ")" : "") + '"';
      if(c.key === fx && r._p){ return '<td class="fx"' + dl + ">" + esc(v || "") + "</td>"; }
      var at = ' data-g="' + esc(f.key) + '" data-r="' + i + '" data-c="' + esc(c.key) + '"';
      var nm = /^(number|currency|date|select)$/.test(c.type) ? ' class="nm"' : "";
      if(c.type === "select"){
        return "<td" + nm + dl + "><select" + at + '><option value=""></option>' + (c.options || []).map(function(o){
          return '<option value="' + esc(o.v) + '"' + (String(v) === String(o.v) ? " selected" : "") + ">" + esc(o.t) + "</option>";
        }).join("") + "</select></td>";
      }
      var t = (c.type === "number" || c.type === "currency") ? "number" : (c.type === "date" ? "date" : "text");
      return "<td" + nm + dl + '><input type="' + t + '"' + at + (t === "number" ? ' inputmode="decimal" step="any" min="0"' : "") + ' value="' + esc(v == null ? "" : v) + '"></td>';
    }).join("") + '<td class="x">' + (r._p ? "" : '<button type="button" class="sm" data-delrow="' + esc(f.key) + '" data-r="' + i + '" aria-label="Retire liy">×</button>') + "</td></tr>";
    // a band ends: offer a row inside it
    if(band && (i === rows.length - 1 || rows[i + 1][band] !== r[band])){
      body += '<tr class="ad"><td colspan="' + (cols.length + 1) + '"><button type="button" class="sm" data-addrow="' + esc(f.key) + '" data-band="' + esc(r[band]) + '">+ Yon lòt nan bann sa a</button></td></tr>';
    }
  });
  var add = (!band && rows.length < (f.max || 40))
    ? '<button type="button" class="sm" data-addrow="' + esc(f.key) + '">+ ' + esc(f.add_label || "Ajoute yon liy") + "</button>" : "";
  return '<div class="gw"><table class="g"><thead><tr>' + th + "<th></th></tr></thead><tbody>" + body + "</tbody></table></div>" + add;
}
function sumOf(path, V){
  var p = String(path).split("."), rows = V[p[0]], t = 0;
  (Array.isArray(rows) ? rows : []).forEach(function(r){ var n = Number(r[p[1]]); if(isFinite(n)){ t += n; } });
  return Math.round(t * 100) / 100;
}

function drawAkt(el){
  var a = el.getAttribute("data-akt");
  if(a === "pwogre"){ return drawPwogre(el); }
  var m = M();
  if(a === "6.1"){
    el.innerHTML = '<p class="tit">Kijan aktivite sa a fèt</p><p>Aktivite sa a fèt <b>an pèsòn</b>, devan yon evalyatè ki pa t rekrite w. '
      + 'Pa gen anyen pou voye. Pratike senk règ yo pi wo a jiskaske ou ka di yo pa kè. Evalyatè a make rezilta a nan Ekip.</p>';
    return;
  }
  if(!m){
    el.innerHTML = '<p class="tit">Ranpli l isit la</p><p>Mete non w <a href="#kim">anlè paj la</a> pou w kòmanse ranpli aktivite sa a.</p>';
    return;
  }
  if(a === "5.1"){ return draw51(el); }
  el.innerHTML = '<p class="tit">Sa ou voye tounen · ranpli l isit la</p>' + body(a) + sendBox(a);
}
function body(a){
  var sp = specOf(a), V = vals(a), h = "";
  if(a.indexOf("5.1#") !== 0){
    h += '<div class="fld" data-fld="_dat"><label>Dat ou fè l <span class="req">*</span></label>' + inp("date", "_dat", V._dat) + "</div>";
  }
  sp.fields.forEach(function(f){ h += field(f, V, a, sp.preset); });
  return '<div data-form="' + esc(a) + '">' + h + "</div>";
}
function draw51(el){
  var h = '<p class="tit">Twa rapò · ranpli yo isit la</p>'
    + '<p class="hint">Chak jou se yon rapò apa. Voye l menm jou a. Li ale nan Rapò chak jou, make « pratik ».</p>';
  for(var j = 1; j <= 3; j++){
    var a = "5.1#" + j, V = vals(a);
    if(!V.dat){ V.dat = j === 1 ? today() : ""; }
    h += '<div class="card"><p class="tit">Jou ' + j + "</p>" + body(a) + sendBox(a) + "</div>";
  }
  el.innerHTML = h;
}
function sendBox(a){
  var m = M(), v = m.voye[a], st;
  var q = qread().some(function(o){ return o.non === m.non && o.a === a; });
  if(q){ st = '<p class="wait">Sove sou telefòn nan. L ap pati poukont li lè w gen siyal.</p>'; }
  else if(v && v.ref){ st = '<p class="ok">✓ Rive nan Ekip · Referans ' + esc(v.ref) + " · " + esc(v.dat) + '</p><p class="hint">Si ou chanje l, ou ka voye l ankò.</p>'; }
  else { st = '<p class="hint">Li sove sou telefòn nan pandan w ap ekri. Lè w fini, voye l: evalyatè a ap wè l nan Ekip.</p>'; }
  var lbl = a.indexOf("5.1#") === 0 ? "Voye rapò jou " + a.slice(4) : "Voye l bay Ekip";
  return '<div class="send"><button type="button" class="go" data-send="' + esc(a) + '">' + lbl + '</button><div id="st-' + esc(a) + '">' + st + "</div></div>";
}
function eta(n){
  var m = M(); if(!m){ return ["", ""]; }
  if(n === "6.1"){ return ["Devan evalyatè a", ""]; }
  if(n === "5.1"){
    var c = 0, d = 0, w = 0, qq = qread();
    for(var j = 1; j <= 3; j++){
      var x = m.voye["5.1#" + j];
      if(qq.some(function(o){ return o.non === m.non && o.a === "5.1#" + j; })){ w++; }
      else if(x && x.ref){ c++; } else if(touched("5.1#" + j)){ d++; }
    }
    if(c === 3){ return ["3 sou 3 jou voye", "ok"]; }
    return [[c ? c + " sou 3 jou voye" : "", w ? w + " ap tann siyal" : "", d && !c && !w ? "Ap ranpli" : ""].filter(Boolean).join(" · "), (c || w || d) ? "dr" : ""];
  }
  var v = m.voye[n];
  if(v && v.ref){ return ["Voye · " + v.ref, "ok"]; }
  if(qread().some(function(o){ return o.non === m.non && o.a === n; })){ return ["Ap tann siyal", "dr"]; }
  return touched(n) ? ["Ap ranpli", "dr"] : ["", ""];
}
// something typed, beyond what the page fills in by itself (dates, preset rows)
function touched(a){
  var V = M() && M().v[a]; if(!V){ return false; }
  var sp = specOf(a);
  return sp.fields.some(function(f){
    if(f.key === "dat"){ return false; }
    var v = V[f.key];
    if(f.type === "group"){ return Array.isArray(v) && v.some(function(r){ return kept(f, r, sp.preset[f.key]); }); }
    return !blank(v);
  });
}
function drawPwogre(el){
  if(!M()){ el.innerHTML = ""; return; }
  el.innerHTML = '<p class="tit">Kote ou ye · sou telefòn sa a</p><table class="pw"><thead><tr><th>#</th><th>Aktivite</th><th>Eta</th></tr></thead><tbody>'
    + S.lis.map(function(x){
      var e = eta(x.n);
      return '<tr><td>' + esc(x.n) + '</td><td><a href="#akt-' + x.n.replace(".", "-") + '">' + esc(x.non) + "</a>" + (x.pot ? " · <b>PÒT</b>" : "") + '</td><td class="' + (e[1] === "ok" ? "ok" : e[1] === "dr" ? "wait" : "") + '">' + esc(e[0] || "—") + "</td></tr>";
    }).join("") + '</tbody></table><p class="hint">Evalyatè a make si chak aktivite pase, nan Ekip. Lè tout kenz yo pase, ou fini Nivo 1.</p>';
}
function navChips(){
  Array.prototype.forEach.call(document.querySelectorAll('nav a[href^="#akt-"]'), function(l){
    var n = l.getAttribute("href").slice(5).replace("-", "."), e = eta(n), s = l.querySelector(".st");
    if(!s){ s = document.createElement("span"); s.className = "st"; l.appendChild(s); }
    s.className = "st " + (e[1] || ""); s.textContent = e[1] === "ok" ? "✓" : (e[1] === "dr" ? "•" : "");
  });
}
function drawKim(){
  var k = document.getElementById("kim"), m = M();
  if(m){
    k.innerHTML = "<h3>Kiyès k ap ranpli</h3><p><b>" + esc(m.non) + "</b>" + (m.sit ? " · Sit: " + esc(m.sit) : " · <span class=\"err\">pa gen sit</span>") + (m.tel ? " · " + esc(m.tel) : "") + "</p>"
      + '<div class="moun"><button type="button" id="kmod">Chanje sit oswa telefòn</button><button type="button" id="kchanje">Se yon lòt moun</button></div><div id="kfom"></div>';
    document.getElementById("kchanje").onclick = function(){ DB.aktif = null; save(true); all(); };
    document.getElementById("kmod").onclick = function(){
      document.getElementById("kfom").innerHTML = '<p><label>Sit la<br><input id="ksit" value="' + esc(m.sit || "") + '"></label></p>'
        + '<p><label>Telefòn<br><input id="ktel" type="tel" value="' + esc(m.tel || "") + '"></label></p><button type="button" class="go" id="kok">Sove</button>';
      document.getElementById("kok").onclick = function(){
        m.sit = document.getElementById("ksit").value.trim(); m.tel = document.getElementById("ktel").value.trim(); save(true); all();
      };
    };
    return;
  }
  var names = Object.keys(DB.moun);
  k.innerHTML = "<h3>Kiyès k ap ranpli kaye a?</h3>"
    + (names.length ? '<div class="moun">' + names.map(function(n){ return '<button type="button" data-moun="' + esc(n) + '">' + esc(n) + "</button>"; }).join("") + "</div><p><b>Oswa yon nouvo moun</b></p>" : "")
    + '<p><label>Non w konplè<br><input id="knon" autocomplete="name"></label></p>'
    + '<p><label>Sit la (si w gen youn)<br><input id="ksit"></label></p>'
    + '<p><label>Telefòn (si w genyen)<br><input id="ktel" type="tel" inputmode="tel"></label></p>'
    + '<button type="button" class="go" id="kok">Kòmanse</button><p class="err" id="kerr"></p>'
    + '<p class="hint">Sa w ekri sove sou telefòn sa a. Si plizyè moun sèvi ak menm telefòn nan, chak moun chwazi non pa l.</p>';
  Array.prototype.forEach.call(k.querySelectorAll("[data-moun]"), function(b){
    b.onclick = function(){ DB.aktif = b.getAttribute("data-moun"); save(true); all(); };
  });
  document.getElementById("kok").onclick = function(){
    var n = document.getElementById("knon").value.trim().replace(/\s+/g, " ");
    if(!n){ document.getElementById("kerr").textContent = "Mete non w anvan."; return; }
    if(!DB.moun[n]){ DB.moun[n] = {non: n, tel: document.getElementById("ktel").value.trim(), sit: document.getElementById("ksit").value.trim(), v: {}, voye: {}}; }
    DB.aktif = n; save(true); all();
  };
}
function all(){
  drawKim();
  Array.prototype.forEach.call(document.querySelectorAll(".live[data-akt]"), drawAkt);
  navChips();
}
function redraw(a){
  var base = a.indexOf("5.1#") === 0 ? "5.1" : a;
  var el = document.querySelector('.live[data-akt="' + base + '"]');
  if(el){ var y = window.scrollY; drawAkt(el); window.scrollTo(0, y); }
  var p = document.querySelector('.live[data-akt="pwogre"]'); if(p){ drawPwogre(p); }
  navChips();
}

// ------------------------------------------------------------ input
function formOf(t){ var f = t.closest("[data-form]"); return f ? f.getAttribute("data-form") : null; }
function onInput(e){
  var t = e.target, a = formOf(t); if(!a){ return; }
  var V = vals(a), sp = specOf(a), k;
  if(t.hasAttribute("data-g")){
    var g = t.getAttribute("data-g"), r = +t.getAttribute("data-r"), c = t.getAttribute("data-c");
    if(V[g] && V[g][r]){ V[g][r][c] = t.value; }
    save();
    var tot = sp.fields.filter(function(f){ return f.sum_of && f.sum_of.split(".")[0] === g; })[0];
    if(tot && e.type === "change"){ redraw(a); }
    return;
  }
  if((k = t.getAttribute("data-cb"))){
    var arr = Array.isArray(V[k]) ? V[k] : [];
    arr = arr.filter(function(x){ return x !== t.value; });
    if(t.checked){ arr.push(t.value); }
    V[k] = arr; save(); return;
  }
  if((k = t.getAttribute("data-k"))){
    V[k] = t.value; save();
    t.closest(".fld") && t.closest(".fld").classList.remove("bad");
    // a field another field depends on redraws the block
    if(e.type === "change" && sp.fields.some(function(f){ return f.si && f.si.chan === k; })){ redraw(a); }
  }
}
function onClick(e){
  var t = e.target.closest("button"); if(!t){ return; }
  var a = formOf(t), k;
  if((k = t.getAttribute("data-addrow"))){
    var V = vals(a), b = t.getAttribute("data-band"), rows = V[k], row = {};
    if(b != null){
      var band = specOf(a).preset[k].band, at = 0;
      rows.forEach(function(r, i){ if(r[band] === b){ at = i + 1; } });
      row[band] = b; row._p = 0; rows.splice(at, 0, row);
    } else { rows.push(row); }
    save(true); redraw(a); return;
  }
  if((k = t.getAttribute("data-delrow"))){
    vals(a)[k].splice(+t.getAttribute("data-r"), 1); save(true); redraw(a); return;
  }
  if((k = t.getAttribute("data-file"))){
    if(navigator.onLine === false){ upMsg(a, k, "Ou pa gen entènèt. Foto a pa ka voye kounye a. Chwazi l ankò lè w gen siyal."); return; }
    var fi = t.closest("[data-fld]").querySelector('[data-filein="' + k + '"]');
    fi.onchange = function(){ if(fi.files && fi.files[0]){ upload(a, k, fi.files[0]); } };
    fi.click(); return;
  }
  if((k = t.getAttribute("data-unfile"))){
    var V2 = vals(a); delete V2[k]; delete V2["_f_" + k]; save(true); redraw(a); return;
  }
  if((k = t.getAttribute("data-send"))){ send(k); }
}

// ------------------------------------------------------------ photos
function upMsg(a, k, msg, cls){
  var el = document.getElementById("up-" + a + "-" + k);
  if(el){ el.insertAdjacentHTML("beforeend", '<p class="' + (cls || "err") + '" style="width:100%;margin:4px 0 0">' + esc(msg) + "</p>"); }
}
function shrink(file, cb){
  var cv = document.createElement("canvas");
  if(!/^image\//.test(file.type) || !cv.toBlob){ cb(file, file.type); return; }
  var url = URL.createObjectURL(file), img = new Image();
  img.onerror = function(){ URL.revokeObjectURL(url); cb(file, file.type); };
  img.onload = function(){
    try {
      var w = img.naturalWidth, h = img.naturalHeight, sc = Math.min(1, 1600 / Math.max(w, h));
      cv.width = Math.max(1, Math.round(w * sc)); cv.height = Math.max(1, Math.round(h * sc));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function(b){ URL.revokeObjectURL(url); if(b && b.size < file.size){ cb(b, "image/jpeg"); } else { cb(file, file.type); } }, "image/jpeg", 0.82);
    } catch(e){ URL.revokeObjectURL(url); cb(file, file.type); }
  };
  img.src = url;
}
function upload(a, k, file){
  if(file.size > 26214400){ upMsg(a, k, "Fichye a twò gwo."); return; }
  var box = document.getElementById("up-" + a + "-" + k), slug = specOf(a).slug;
  if(box){ box.innerHTML = '<span class="wait">N ap voye foto a…</span>'; }
  shrink(file, function(blob, mime){
    fetch(S.api + "/" + encodeURIComponent(slug) + "/upload", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({key: k, name: file.name, type: mime, size: blob.size})})
      .then(function(r){ return r.json().then(function(j){ return {ok: r.ok, j: j}; }); })
      .then(function(o){
        if(!o.ok){ redraw(a); upMsg(a, k, o.j.error || "Voye foto a pa mache."); return; }
        var x = new XMLHttpRequest();
        x.open("PUT", o.j.url, true); x.setRequestHeader("Content-Type", o.j.mime);
        x.upload.onprogress = function(ev){ if(ev.lengthComputable && box){ box.innerHTML = '<span class="wait">N ap voye foto a… ' + Math.round(ev.loaded / ev.total * 100) + "%</span>"; } };
        x.onload = function(){
          if(x.status < 200 || x.status >= 300){ redraw(a); upMsg(a, k, "Voye foto a pa mache. Eseye ankò."); return; }
          var V = vals(a); V[k] = {path: o.j.path}; V["_f_" + k] = {name: file.name, size: blob.size}; save(true); redraw(a);
        };
        x.onerror = x.ontimeout = function(){ redraw(a); upMsg(a, k, "Koneksyon an koupe. Eseye ankò lè w gen siyal."); };
        x.send(blob);
      })
      .catch(function(){ redraw(a); upMsg(a, k, "Ou pa gen entènèt. Chwazi foto a ankò lè w gen siyal."); });
  });
}

// ------------------------------------------------------------ send
function payload(a){
  var m = M(), sp = specOf(a), V = vals(a), p = {}, miss = [];
  if(a.indexOf("5.1#") === 0){
    if(!m.sit){ return {err: "Mete non sit la anlè paj la (Chanje sit oswa telefòn) anvan w voye rapò a."}; }
    p = {sit: m.sit, moun_ki_rapote: m.non, pratik: "wi"};
  } else {
    p = {non: m.non, tel: m.tel || "", sit: m.sit || "", aktivite: a, dat: V._dat || today()};
    if(!V._dat){ miss.push({k: "_dat", l: "Dat ou fè l"}); }
  }
  sp.fields.forEach(function(f){
    if(!seen(f, V)){ return; }
    var v = V[f.key];
    if(f.type === "group"){
      var pre = sp.preset[f.key], rows = rowsOf(f, V, pre).filter(function(r){ return kept(f, r, pre); });
      var out = rows.map(function(r){ var o = {}; f.fields.forEach(function(c){ o[c.key] = r[c.key] == null ? "" : r[c.key]; }); return o; });
      if(f.min && out.length < f.min){ miss.push({k: f.key, l: f.label + " (omwen " + f.min + " liy)"}); }
      rows.forEach(function(r){ f.fields.forEach(function(c){ if(c.required && blank(r[c.key])){ miss.push({k: f.key, l: f.label + ": " + c.label}); } }); });
      p[f.key] = out; return;
    }
    if(f.sum_of){ p[f.key] = sumOf(f.sum_of, V); return; }
    if(f.type === "checkbox"){ v = Array.isArray(v) ? v : []; }
    if(f.type === "file"){ v = v && v.path ? {path: v.path} : ""; }
    if(f.required && blank(v)){ miss.push({k: f.key, l: f.label}); }
    p[f.key] = v == null ? "" : v;
  });
  if(miss.length){
    var seenK = {}, ls = [];
    miss.forEach(function(x){ if(!seenK[x.l]){ seenK[x.l] = 1; ls.push(x.l); } });
    return {err: "Ranpli sa yo anvan: " + ls.join(" · "), miss: miss};
  }
  return {p: p};
}
function qread(){ try { return JSON.parse(localStorage.getItem(KQ) || "[]"); } catch(e){ return []; } }
function qwrite(x){ try { localStorage.setItem(KQ, JSON.stringify(x)); } catch(e){ warnFull(); } }
function stMsg(a, msg, cls){ var el = document.getElementById("st-" + a); if(el){ el.innerHTML = '<p class="' + (cls || "err") + '">' + esc(msg) + "</p>"; } }
function send(a){
  var m = M(), r = payload(a);
  var form = document.querySelector('[data-form="' + a + '"]');
  if(form){ Array.prototype.forEach.call(form.querySelectorAll(".bad"), function(x){ x.classList.remove("bad"); }); }
  if(r.err){
    (r.miss || []).forEach(function(x){ var f = form && form.querySelector('[data-fld="' + x.k + '"]'); if(f){ f.classList.add("bad"); } });
    stMsg(a, r.err); return;
  }
  var slug = specOf(a).slug, h = JSON.stringify(r.p), v = m.voye[a];
  // the same page, unchanged, is never sent twice (the Oganizate's double-tap lesson)
  if(qread().some(function(o){ return o.non === m.non && o.a === a && o.h === h; })){ return; }
  if(v && v.ref && v.h === h){ stMsg(a, "Sa a deja rive (referans " + v.ref + "). Ou pa chanje anyen depi lè sa a.", "hint"); return; }
  var q = qread().filter(function(o){ return !(o.non === m.non && o.a === a); });
  q.push({id: uid(), non: m.non, a: a, slug: slug, p: r.p, h: h}); qwrite(q);
  redraw(a); flush();
}
var FLY = false;
function flush(){
  if(FLY || !window.fetch){ return; }
  var q = qread(); if(!q.length){ return; }
  var it = q[0]; FLY = true;
  fetch(S.api + "/" + encodeURIComponent(it.slug), {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(it.p)})
    .then(function(r){ return r.json().then(function(j){ return {ok: r.ok, s: r.status, j: j}; }); })
    .then(function(x){
      FLY = false;
      var who = DB.moun[it.non];
      if(x.ok && x.j && x.j.ok){
        qwrite(qread().filter(function(o){ return o.id !== it.id; }));
        if(who){ who.voye[it.a] = {ref: x.j.referans || "ok", dat: today(), h: it.h}; save(true); }
        redraw(it.a); flush();
      } else if(x.s >= 400 && x.s < 500){
        // a refusal will not fix itself on retry: drop it and say why
        qwrite(qread().filter(function(o){ return o.id !== it.id; }));
        redraw(it.a);
        stMsg(it.a, "Ekip pa t aksepte l: " + ((x.j && x.j.error) || "erè") + ". Korije l epi voye l ankò.");
        flush();
      }
    })
    .catch(function(){ FLY = false; });
}

// ------------------------------------------------------------ start
document.addEventListener("input", onInput);
document.addEventListener("change", onInput);
document.addEventListener("click", onClick);
window.addEventListener("online", flush);
setInterval(flush, 30000);
all();
flush();
})();
