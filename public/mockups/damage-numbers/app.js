/* Damage numbers mockup (ui-dev, 2026-11-01). NOT game code. Mirrors src/game/float-text.ts (floatStyle) and combatant-view.ts (damageText, floatText)
   and data/battle-layout.json (colors, animation.damageNumber*). Hash: #a|b|c|d|e|all &z=169|219|ph &cb=none|deut|prot|gray &bg=ember|sunny &fl=0|1 &clean */
(function () {
  'use strict';
  var SERIF = '"Palatino Linotype","Book Antiqua",Palatino,"Times New Roman",Georgia,serif';
  var STAGE_H = 1080;
  var SPR_H = 310; // assumed on-screen sprite height (logical px); the real value depends on spriteScale per unit
  var RISE_FROZEN = 60; // numbers are frozen about 45% into their 110px rise so they all show at once
  var PH_DEVICE_MIN = 15; // phone floor: smallest number height in device px (variants only)

  // ---- real colors (data/battle-layout.json > colors) ----
  var C = {
    damage: '#ffe066', damageMid: '#ff9f43', damageHigh: '#ff4d4d', crit: '#ffd23f', heal: '#7dff9b', shield: '#8fe3ff', miss: '#cfc7a0',
    wither: '#9cab3c', ember: '#e0702a'
  };
  var EL = { physical: '#e8e2d0', fire: '#ff7a1a', ice: '#8fd8ff', holy: '#fff0a0', dark: '#b36bff', nature: '#7ed957', arcane: '#e05cff', lightning: '#c6dbff' };
  var EL_ICON = { fire: 'el-fire.webp', ice: 'el-ice.webp', holy: 'el-holy.webp', dark: 'el-dark.webp', nature: 'el-nature.webp', arcane: 'el-arcane.webp', lightning: 'BOLT' };
  var EL_WORD = { fire: 'FIRE', ice: 'ICE', holy: 'HOLY', dark: 'DARK', nature: 'NATURE', arcane: 'ARCANE', lightning: 'LIGHTNING' };

  function hexToN(h) { return parseInt(h.replace('#', ''), 16); }
  function lighten(h, a) { var n = hexToN(h); return '#' + [16, 8, 0].map(function (sh) { var v = (n >> sh) & 255; return Math.round(v + (255 - v) * a).toString(16).padStart(2, '0'); }).join(''); }
  function darken(h, a) { var n = hexToN(h); return '#' + [16, 8, 0].map(function (sh) { return Math.round(((n >> sh) & 255) * (1 - a)).toString(16).padStart(2, '0'); }).join(''); }
  function sev(l) { return l < 0.34 ? C.damage : l < 0.67 ? C.damageMid : C.damageHigh; }

  // mirror of floatStyle(): outline colour, thickness, top light
  function styleFor(kind, size, hex) {
    var s = { stroke: '#1b0f08', th: Math.max(4, Math.round(size / 5)), top: lighten(hex, 0.45), glow: false };
    if (kind === 'damage') { s.stroke = darken(hex, 0.86); s.th = Math.max(5, Math.round(size / 4.2)); }
    else if (kind === 'crit') { s.stroke = '#3a1204'; s.th = Math.max(6, Math.round(size / 3.8)); s.top = '#fff6c8'; s.glow = true; }
    else if (kind === 'heal') { s.stroke = '#0c2a16'; s.top = lighten(hex, 0.55); }
    else if (kind === 'shield') { s.stroke = '#0e1a24'; s.top = lighten(hex, 0.5); }
    else if (kind === 'miss') { s.stroke = '#26200f'; s.th = Math.max(3, Math.round(size / 7)); s.top = null; }
    return s;
  }

  // ---- scene: what is on stage (same in every variant) ----
  // unit: x, y = feet (logical 1920 space, centred), items bottom -> top. {group:[...]} = one multi-element hit (rendered as a row only in variant E)
  var UNITS = [
    { id: 'w2', spr: 'warrior.webp', x: 430, y: 850, flip: false, items: [{ k: 'shield', txt: 'Blocked', note: 'shield absorbed the hit' }] },
    { id: 'w1', spr: 'warrior.webp', x: 690, y: 780, flip: false, items: [{ k: 'heal', txt: '+24' }] },
    { id: 'e1', spr: 'ember_acolyte.webp', x: 960, y: 780, flip: true, items: [{ k: 'dmg', amt: 14, lvl: 0.2, el: 'physical' }, { k: 'dmg', amt: 64, lvl: 0.8, el: 'fire', crit: true }] },
    { id: 'e2', spr: 'ember_acolyte.webp', x: 1150, y: 850, flip: true, items: [{ group: [{ k: 'dmg', amt: 31, lvl: 0.45, el: 'fire' }, { k: 'dmg', amt: 18, lvl: 0.25, el: 'ice' }] }] },
    { id: 'e3', spr: 'ember_acolyte.webp', x: 1340, y: 780, flip: true, items: [{ k: 'dmg', amt: 22, lvl: 0.9, el: 'nature' }, { k: 'dmg', amt: 12, lvl: 0.15, el: 'dark' }] },
    { id: 'e4', spr: 'ember_acolyte.webp', x: 1530, y: 850, flip: true, items: [{ group: [{ k: 'dmg', amt: 26, lvl: 0.55, el: 'lightning' }, { k: 'dmg', amt: 17, lvl: 0.3, el: 'holy' }] }] },
    { id: 'e5', spr: 'ember_acolyte.webp', x: 1720, y: 780, flip: true, items: [{ k: 'dot', amt: 6, st: 'poison', word: 'POISON' }, { k: 'dmg', amt: 9, lvl: 0.15, el: 'fire', ground: 'burning', word: 'BURN' }, { k: 'miss', txt: 'MISS' }] }
  ];

  var VARIANTS = {
    a: { name: 'A · Now', tag: 'Bugünkü oyun', note: 'Sayı vuruşun şiddetine göre sarı → turuncu → kırmızı; element yalnızca sağdaki küçük ikonda. Ömer\'in gördüğü uyumsuzluk: kırmızı 22 + yeşil yaprak.', cvd: 'Elementi ikonun ŞEKLİ taşıdığı için renk körlüğünde de okunur; ama sayının rengi (sarı/turuncu/kırmızı) şiddet, element değil: deut\'ta turuncu-kırmızı ΔE 20, sarı-turuncu 14 (zayıf).' },
    b: { name: 'B · Renk + kelime', tag: 'ÖNERİLEN', note: 'Sayı elementin renginde, ikon yok; şiddet yalnızca boyutla. Altında küçük bir kelime (FIRE, ICE...) rengi desteklediği için renge güvenmek gerekmiyor.', cvd: 'Kelime elementi taşıdığı için deut/prot\'ta da ayırt edilir (ice-shield ve lightning-ice renkleri çökse bile). Telefonda kelime, 9 cihaz px alt sınırıyla çizilir.' },
    c: { name: 'C · Yalnız renk', tag: 'en sade', note: 'Sayı elementin renginde, ikon da kelime de yok; en temiz görünüm, en az bilgi güvencesi.', cvd: 'Renk körlüğünde çöker: ice/shield ΔE 5-6, lightning/shield 1-4, lightning/ice 5-9. Tek başına yeterli değil.' },
    d: { name: 'D · İkon plakası', tag: 'ikon taşır', note: 'Sayı bugünkü gibi şiddet renginde; element, sayının SOLUNDA element renginde halkalı, koyu bir plaka içindeki ikonla (yaprak yerde efekt gibi durmaz, plakaya oturur).', cvd: 'İkon şekli + halka birlikte taşır, renk körlüğünde okunur. Telefonda plaka sayı boyunda (≈15 px) kalır, ikon ayrıntısı kaybolur.' },
    e: { name: 'E · Parçalı vuruş', tag: 'yapı farkı', note: 'Renk C ile aynı; fark yapıda: iki elementli bir vuruş (ateş 31 + buz 18) üst üste iki şerit yerine tek satırda, ince bir çizgiyle ayrılmış iki parça olarak çıkar. Tek elementli vuruşlar aynı kalır.', cvd: 'Renk körlüğü sonucu C ile aynı (yalnız renk); kazanç dikey yer ve "bunlar aynı vuruşun parçaları" bilgisi.' }
  };
  var ORDER = ['a', 'b', 'c', 'd', 'e'];

  // ---- one number ----
  function describe(sp, v, scale, floorOn) {
    var d = { kind: 'damage', hex: C.damage, px: 40, left: null, right: null, plate: null, word: null, text: '' };
    if (sp.k === 'dmg') {
      d.text = String(sp.amt);
      d.px = Math.round(34 + 37 * sp.lvl) + (sp.crit ? 9 : 0);
      d.kind = sp.crit ? 'crit' : 'damage';
      var icon = sp.ground === 'burning' ? 'burning.webp' : (sp.el !== 'physical' ? EL_ICON[sp.el] : null);
      var elHex = sp.ground === 'burning' ? EL.fire : EL[sp.el];
      if (v === 'a') {
        d.hex = sp.crit ? C.crit : sev(sp.lvl);
        if (sp.crit) d.left = 'crit.webp';
        if (icon) d.right = icon;
      } else if (v === 'd') {
        d.hex = sp.crit ? C.crit : sev(sp.lvl);
        if (icon) d.plate = { icon: icon, ring: elHex };
        if (sp.crit) d.right = 'crit.webp';
      } else { // b, c, e: number carries the element colour
        d.hex = elHex;
        if (sp.crit) d.left = 'crit.webp';
        if (v === 'b') d.word = sp.word || EL_WORD[sp.el] || null;
      }
    } else if (sp.k === 'dot') {
      d.text = String(sp.amt); d.px = 38; d.hex = C.wither; d.kind = 'damage';
      if (v === 'a') d.right = 'poisoned.webp';
      else if (v === 'd') d.plate = { icon: 'poisoned.webp', ring: C.wither };
      else if (v === 'b') d.word = sp.word;
    } else if (sp.k === 'heal') { d.text = sp.txt; d.px = 64; d.hex = C.heal; d.kind = 'heal'; }
    else if (sp.k === 'shield') { d.text = sp.txt; d.px = 46; d.hex = C.shield; d.kind = 'shield'; }
    else if (sp.k === 'miss') { d.text = sp.txt; d.px = 46; d.hex = C.miss; d.kind = 'miss'; }
    if (floorOn && v !== 'a') d.px = Math.max(d.px, Math.round(PH_DEVICE_MIN / scale));
    return d;
  }

  var BOLT = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M14 1 4 14h6l-2 9 11-14h-6z" fill="#c6dbff" stroke="#27324a" stroke-width="2" stroke-linejoin="round"/></svg>';
  function iconHtml(name, d, tint) {
    if (name === 'BOLT') return '<span class="ic" style="width:' + d + 'px;height:' + d + 'px">' + BOLT + '</span>';
    return '<img class="ic" style="width:' + d + 'px;height:' + d + 'px" src="damage-numbers/' + name + '" alt="">';
  }

  function numHtml(d, scale, v) {
    var st = styleFor(d.kind, d.px, d.hex);
    var gap = -Math.round(d.px * 0.07);
    var out = '';
    var icoD = Math.round(d.px * 0.66);
    var cell = '';
    if (d.plate) {
      var pd = Math.round(d.px * 0.95), ring = Math.max(2, Math.round(d.px / 14));
      cell += '<span class="plate" style="width:' + pd + 'px;height:' + pd + 'px;margin-right:' + Math.round(d.px * 0.1) + 'px;box-shadow:0 0 0 ' + ring + 'px ' + d.plate.ring + ',0 3px 8px rgba(0,0,0,.75)">' + iconHtml(d.plate.icon, Math.round(pd * 0.8)) + '</span>';
    }
    if (d.left) cell += '<span class="ico-slot" style="margin-right:' + gap + 'px">' + iconHtml(d.left, icoD) + '</span>';
    var fill = st.top ? 'linear-gradient(180deg,' + st.top + ' 0%,' + d.hex + ' 55%,' + d.hex + ' 100%)' : d.hex;
    var sh = Math.max(2, Math.round(d.px / 14)), bl = Math.max(4, Math.round(d.px / 8));
    var fx = st.glow ? 'drop-shadow(0 0 ' + Math.max(10, Math.round(d.px / 4)) + 'px rgba(240,140,40,.9))' : 'drop-shadow(0 ' + sh + 'px ' + bl + 'px rgba(0,0,0,.85))';
    cell += '<span class="num" style="font-size:' + d.px + 'px;filter:' + fx + '"><span class="nb" style="-webkit-text-stroke:' + st.th + 'px ' + st.stroke + ';color:' + st.stroke + '">' + d.text + '</span><span class="nf" style="background:' + fill + ';-webkit-background-clip:text;background-clip:text">' + d.text + '</span></span>';
    if (d.right) cell += '<span class="ico-slot" style="margin-left:' + gap + 'px">' + iconHtml(d.right, icoD) + '</span>';
    out += '<span class="row">' + cell + '</span>';
    if (d.word) {
      var wpx = Math.max(Math.round(d.px * 0.3), Math.round(9 / scale));
      out += '<span class="word" style="font-size:' + wpx + 'px;color:' + d.hex + ';-webkit-text-stroke:' + Math.max(3, Math.round(wpx / 3)) + 'px #1b0f08">' + d.word + '</span>';
    }
    return { html: out, wordH: d.word ? Math.max(Math.round(d.px * 0.3), Math.round(9 / scale)) * 1.25 : 0, glowPx: st.glow ? d.px : 0 };
  }

  // ---- stage ----
  function stageHtml(v, o) {
    var W = o.W, xo = (W - 1920) / 2, s = o.s;
    var bgW = W, bgH = Math.round(W / 1536 * 1024);
    var floorFrac = o.bg === 'sunny' ? 0.527 : 0.596;
    var top = Math.min(0, Math.max(STAGE_H - bgH, Math.round(715 - floorFrac * bgH)));
    var bgFile = o.bg === 'sunny' ? 'bg-sunny.webp' : 'bg-ember-road.webp';
    var h = '<div class="stage" style="width:' + W + 'px;height:' + STAGE_H + 'px;transform:scale(' + s + ');background:#14100c url(damage-numbers/' + bgFile + ') no-repeat 0 ' + top + 'px/' + bgW + 'px ' + bgH + 'px">';
    var sprites = '', floats = '';
    UNITS.forEach(function (u) {
      var cx = u.x + xo;
      sprites += '<img class="spr" src="damage-numbers/' + u.spr + '" alt="" style="left:' + cx + 'px;top:' + (u.y - SPR_H) + 'px;height:' + SPR_H + 'px;transform:translateX(-50%)' + (u.flip ? ' scaleX(-1)' : '') + '">';
      // lanes: flatten groups except in variant E
      var lanes = [];
      u.items.forEach(function (it) {
        if (it.group) { if (v === 'e') lanes.push({ group: it.group }); else it.group.forEach(function (g) { lanes.push({ one: g }); }); }
        else lanes.push({ one: it });
      });
      var base = u.y - SPR_H - 60 - RISE_FROZEN, cum = 0, firstH = null;
      lanes.forEach(function (ln) {
        var parts = (ln.group || [ln.one]).map(function (sp) { return numHtml(describe(sp, v, s, o.fl), s, v); });
        var ds = (ln.group || [ln.one]).map(function (sp) { return describe(sp, v, s, o.fl); });
        var px = Math.max.apply(null, ds.map(function (d) { return d.px; }));
        var wordH = Math.max.apply(null, parts.map(function (p) { return p.wordH; }));
        var laneH = px * 0.95 + wordH;
        if (firstH === null) firstH = laneH;
        var cy = base - (cum + laneH / 2 - firstH / 2);
        cum += laneH;
        var inner;
        if (ln.group) {
          inner = parts.map(function (p) { return '<span class="chip">' + p.html + '</span>'; }).join('<span class="sep" style="height:' + Math.round(px * 0.8) + 'px"></span>');
        } else inner = parts[0].html;
        var glow = Math.max.apply(null, parts.map(function (p) { return p.glowPx; }));
        floats += '<div class="fl' + (ln.group ? ' grp' : '') + '" style="left:' + cx + 'px;top:' + Math.round(cy) + 'px">' + (glow ? '<span class="cg" style="width:' + Math.round(glow * 3.4) + 'px;height:' + Math.round(glow * 1.9) + 'px"></span>' : '') + inner + '</div>';
      });
    });
    h += sprites + floats + '</div>';
    return h;
  }

  // ---- page ----
  var hashState = { v: 'b', z: '169', cb: 'none', bg: 'ember', fl: '1', clean: false };
  function parseHash() {
    var st = { v: 'b', z: '169', cb: 'none', bg: 'ember', fl: '1', clean: false };
    var h = location.hash.replace(/^#/, '');
    h.split('&').forEach(function (p) {
      if (!p) return;
      var kv = p.split('=');
      if (kv.length === 1) { if (p === 'clean') st.clean = true; else if (p === 'all' || ORDER.indexOf(p) >= 0) st.v = p; return; }
      var k = kv[0], val = kv[1];
      if (k === 'z') st.z = (val === '16' ? '169' : val === '21' ? '219' : val);
      else if (k === 'cb') st.cb = val; else if (k === 'bg') st.bg = val; else if (k === 'fl') st.fl = val; else if (k === 'v') st.v = val;
    });
    if (['169', '219', 'ph'].indexOf(st.z) < 0) st.z = '169';
    if (['none', 'deut', 'prot', 'gray'].indexOf(st.cb) < 0) st.cb = 'none';
    if (st.bg !== 'sunny') st.bg = 'ember';
    return st;
  }
  function setHash(patch) {
    var st = Object.assign({}, hashState, patch);
    var parts = [st.v, 'z=' + st.z, 'cb=' + st.cb, 'bg=' + st.bg, 'fl=' + st.fl];
    if (st.clean) parts.push('clean');
    location.hash = parts.join('&');
  }

  var SIZES = { '169': { W: 1920, label: '16:9 (1920x1080)' }, '219': { W: 2580, label: '21:9 (2580x1080)' }, ph: { W: 2337, label: 'Telefon 844x390' } };

  function oneStage(v, st, availW) {
    var size = SIZES[st.z], W = size.W;
    var wrapW = st.z === 'ph' ? 844 : Math.max(320, Math.min(availW, 1500));
    var s = wrapW / W;
    var html = stageHtml(v, { W: W, s: s, bg: st.bg, fl: st.fl === '1' && v !== 'a' && (st.z === 'ph' || s < 0.4) });
    var wrapH = Math.round(STAGE_H * s);
    var cbCls = st.cb === 'none' ? '' : ' cb-' + st.cb;
    return '<div class="wrap' + cbCls + '" style="width:' + Math.round(wrapW) + 'px;height:' + wrapH + 'px">' + html + '</div>' +
      '<div class="scalenote">Ölçek ' + s.toFixed(3) + ' · 34 px sayı = ' + (34 * s).toFixed(1) + ' cihaz px, 71 px sayı = ' + (71 * s).toFixed(1) + ' cihaz px' + (st.z === 'ph' ? ' (gerçek boyut; dizüstünde 1:1 = telefon CSS px)' : '') + '</div>';
  }

  function info(v) {
    var V = VARIANTS[v];
    return '<div class="vinfo"><div class="vname">' + V.name + (V.tag ? ' <i class="vtag' + (V.tag === 'ÖNERİLEN' ? ' rec' : '') + '">' + V.tag + '</i>' : '') + '</div><div class="vnote">' + V.note + '</div><div class="vcvd"><b>Renk körlüğü:</b> ' + V.cvd + '</div></div>';
  }

  function render() {
    var st = hashState = parseHash();
    document.documentElement.classList.toggle('mk-clean', st.clean);
    document.documentElement.classList.toggle('mk-phone', st.z === 'ph');
    var availW = Math.max(320, document.documentElement.clientWidth - 44);
    var out = '';
    if (st.v === 'all') {
      var w = st.z === 'ph' ? availW : Math.min(availW, 760);
      ORDER.forEach(function (v) { out += '<section class="one">' + info(v) + oneStage(v, st, w) + '</section>'; });
    } else out = '<section class="one">' + info(st.v) + oneStage(st.v, st, availW) + '</section>';
    document.getElementById('stages').innerHTML = out;
    // strip state
    document.querySelectorAll('#mk-strip button').forEach(function (b) {
      var k = b.getAttribute('data-k'), val = b.getAttribute('data-v');
      b.classList.toggle('on', st[k] === val);
    });
  }
  function wireStrip() {
    document.getElementById('mk-strip').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var p = {}; p[b.getAttribute('data-k')] = b.getAttribute('data-v'); setHash(p);
    });
  }
  window.addEventListener('hashchange', render);
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 120); });
  document.addEventListener('DOMContentLoaded', function () { wireStrip(); render(); });
  if (document.readyState !== 'loading') { wireStrip(); render(); }
})();
