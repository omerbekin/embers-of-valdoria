/* Cursor mockup (ui-dev, 2026-11-01). Oyun kodu DEGIL. Tum imlecler SVG ile cizilmis TASLAKTIR. */
(function () {
  'use strict';
  var D = 'cursor/';
  var STATES = ['def', 'click', 'attack', 'skill', 'move', 'grab', 'drag', 'no', 'shop'];
  var SNAME = { def: 'Default', click: 'Clickable', attack: 'Attack target', skill: 'Skill target', move: 'Move', grab: 'Can grab', drag: 'Dragging', no: 'Not allowed', shop: 'Shop (optional)' };
  var SUSE = {
    def: 'Empty ground, plain UI',
    click: 'Buttons, cards, tabs',
    attack: 'Enemy cell while an attack skill is picked',
    skill: 'Ally or any cell for a heal / buff skill',
    move: 'Empty cell while Move is picked',
    grab: 'Item or unit that can be dragged',
    drag: 'Item in hand, over a slot',
    no: 'Disabled button, unaffordable item',
    shop: 'Merchant and shop windows'
  };

  /* ---------- SVG helpers ---------- */
  var HALO = '#f4e8c8', DARK = '#17110b';
  function wrapSvg(inner, size) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + inner + '</svg>'; }
  function out(parts) {
    var a = '', b = '';
    parts.forEach(function (p) {
      var t = p.t ? ' transform="' + p.t + '"' : '';
      a += '<path d="' + p.d + '"' + t + ' fill="' + p.f + '" stroke="' + HALO + '" stroke-width="4.4" stroke-linejoin="round" opacity=".85"/>';
      b += '<path d="' + p.d + '"' + t + ' fill="' + p.f + '" stroke="' + DARK + '" stroke-width="2.4" stroke-linejoin="round"/>';
    });
    return a + b;
  }
  function st(d, col, w, o) {
    o = o || {};
    var dash = o.dash ? ' stroke-dasharray="' + o.dash + '"' : '', fill = o.fill || 'none';
    var c = ' stroke-linecap="round" stroke-linejoin="round"' + dash;
    return '<path d="' + d + '" fill="none" stroke="' + HALO + '" stroke-width="' + (w + 3.4) + '"' + c + ' opacity=".85"/>' +
      '<path d="' + d + '" fill="none" stroke="' + DARK + '" stroke-width="' + (w + 1.8) + '"' + c + '/>' +
      '<path d="' + d + '" fill="' + fill + '" stroke="' + col + '" stroke-width="' + w + '"' + c + '/>';
  }
  function circ(cx, cy, r, col, w, o) { return st('M' + (cx - r) + ' ' + cy + ' a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0', col, w, o); }
  function enc(svg) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }

  /* ---------- shapes (32x32) ---------- */
  var ARROW = 'M5 3 L5 24 L10.4 19.2 L14 27.2 L17.6 25.6 L14.2 17.8 L21.2 17.6 Z';
  var HAND = 'M12 3 C10.5 3 10 4 10 5 L10 15 L8.5 13.8 C7.5 13 6 13.5 6 14.8 L6 17 C6 21 8 26 10 28 L21 28 C23 26 25 22 25 18 L25 14 C25 12.8 23.5 12.2 22.8 13 L22 14 L22 12.5 C22 11.3 20.5 10.8 19.8 11.6 L19 12.5 L19 11.5 C19 10.3 17.6 9.8 16.8 10.6 L16 11.5 L14 11.5 L14 5 C14 4 13.2 3 12 3 Z';
  var OPEN = 'M10 15 V8 C10 6.8 12.2 6.8 12.2 8 V13 V6 C12.2 4.8 14.6 4.8 14.6 6 V13 V6.8 C14.6 5.6 17 5.6 17 6.8 V13.5 V9 C17 7.8 19.4 7.8 19.4 9 V19 C19.4 24 17 27.5 13.5 27.5 C10.5 27.5 9 25.5 7.5 22.5 L5.5 18.5 C5 17 6.5 16 7.5 17 L10 20 Z';
  var FIST = 'M8 15 C8 12.6 11.4 12.6 11.4 14.6 C11.4 12 15.4 12 15.4 14.4 C15.4 12.2 19.6 12.2 19.6 14.8 C19.6 13 24 13 24 15.6 L24 21 C24 25 21 28 17 28 L14 28 C10 28 8 25 8 21 Z';
  var PARCH = '#efe0b8', GOLD = '#e9c872', EMBER = '#e0702a', RED = '#c4402e', STEEL = '#d5dbe0';

  function C(svg, w, hx, hy, fb) { return { svg: svg, w: w, hx: hx, hy: hy, fb: fb || 'auto' }; }

  /* "Now": plain OS-style shapes, what the game shows today */
  function nowSet() {
    var arrow = wrapSvg('<path d="' + ARROW + '" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>', 32);
    var hand = wrapSvg('<path d="' + HAND + '" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>', 32);
    var open = wrapSvg('<path d="' + OPEN + '" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>', 32);
    var fist = wrapSvg('<path d="' + FIST + '" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>', 32);
    var no = wrapSvg('<circle cx="16" cy="16" r="9" fill="rgba(255,255,255,.9)" stroke="#000" stroke-width="1.4"/><circle cx="16" cy="16" r="7" fill="none" stroke="#d22" stroke-width="3"/><path d="M11 21 L21 11" stroke="#d22" stroke-width="3"/>', 32);
    return {
      def: C(arrow, 32, 5, 3, 'default'), click: C(hand, 32, 12, 3, 'pointer'), attack: C(hand, 32, 12, 3, 'pointer'), skill: C(hand, 32, 12, 3, 'pointer'),
      move: C(arrow, 32, 5, 3, 'default'), grab: C(open, 32, 16, 14, 'grab'), drag: C(fist, 32, 16, 18, 'grabbing'), no: C(no, 32, 16, 16, 'not-allowed'), shop: C(arrow, 32, 5, 3, 'default')
    };
  }

  /* A / B shapes: gilded arrow with an ember gem */
  var GEM = '<path d="M8.4 10.2 L10 12.8 L8.4 15.4 L6.8 12.8 Z" fill="' + EMBER + '" stroke="' + DARK + '" stroke-width=".8"/>';
  function themedArrow() { return wrapSvg(out([{ d: ARROW, f: GOLD }]) + GEM, 32); }

  function setA() {
    var sword = out([
      { d: 'M16 1 L19.2 6 L19.2 19 L12.8 19 L12.8 6 Z', f: STEEL, t: 'rotate(-45 16 16)' },
      { d: 'M8 19 H24 V22.5 H8 Z', f: GOLD, t: 'rotate(-45 16 16)' },
      { d: 'M14.4 22.5 H17.6 V28 H14.4 Z', f: '#7a4a24', t: 'rotate(-45 16 16)' },
      { d: 'M16 25.5 m-2.2 0 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0', f: GOLD, t: 'rotate(-45 16 16)' }
    ]);
    var reticle = circ(16, 16, 9, EMBER, 2.4) + st('M16 2.5 V8 M16 24 V29.5 M2.5 16 H8 M24 16 H29.5', EMBER, 2.2) + out([{ d: 'M16 12.4 L19.6 16 L16 19.6 L12.4 16 Z', f: '#ffb35a' }]);
    var move = st('M8 8.5 L15 16 L8 23.5', GOLD, 3.4) + st('M17 8.5 L24 16 L17 23.5', GOLD, 3.4);
    var no = circ(16, 16, 9, RED, 3) + st('M10 22 L22 10', RED, 3);
    var coin = out([{ d: 'M16 6.5 m-9.5 9.5 a9.5 9.5 0 1 0 19 0 a9.5 9.5 0 1 0 -19 0', f: GOLD }]) + circ(16, 16, 5.4, '#a8782a', 1.6) + '<path d="M16 12.4 L18.2 16 L16 19.6 L13.8 16 Z" fill="#a8782a"/>';
    return {
      def: C(themedArrow(), 32, 5, 3, 'default'),
      click: C(wrapSvg(out([{ d: HAND, f: PARCH }]) + '<path d="M12 5 V14" stroke="' + EMBER + '" stroke-width="1.6" stroke-linecap="round"/>', 32), 32, 12, 3, 'pointer'),
      attack: C(wrapSvg(sword, 32), 32, 5, 5, 'crosshair'),
      skill: C(wrapSvg(reticle, 32), 32, 16, 16, 'crosshair'),
      move: C(wrapSvg(move, 32), 32, 16, 16, 'move'),
      grab: C(wrapSvg(out([{ d: OPEN, f: PARCH }]), 32), 32, 16, 14, 'grab'),
      drag: C(wrapSvg(out([{ d: FIST, f: PARCH }]), 32), 32, 16, 18, 'grabbing'),
      no: C(wrapSvg(no, 32), 32, 16, 16, 'not-allowed'),
      shop: C(wrapSvg(coin, 32), 32, 16, 16, 'pointer')
    };
  }

  function setB() {
    var a = C(themedArrow(), 32, 5, 3, 'default'), o = {};
    STATES.forEach(function (s) { o[s] = a; });
    return o;
  }

  /* C: game-drawn ring (48x48, centre 24,24). Native cursor hidden, ring follows the pointer. */
  function ringSet() {
    function r(inner) { return C(wrapSvg(inner, 48), 48, 24, 24, 'none'); }
    var dot = '<circle cx="24" cy="24" r="2.6" fill="#ffd99a" stroke="' + DARK + '" stroke-width="1"/>';
    return {
      def: r(circ(24, 24, 8, EMBER, 2.2) + dot),
      click: r(circ(24, 24, 11, GOLD, 2.6) + st('M24 5 V9 M24 39 V43 M5 24 H9 M39 24 H43', GOLD, 2.2) + dot),
      attack: r(circ(24, 24, 11, RED, 3) + st('M13 13 L18 18 M35 13 L30 18 M13 35 L18 30 M35 35 L30 30', RED, 2.6) + '<path d="M24 20.5 L27.5 24 L24 27.5 L20.5 24 Z" fill="' + RED + '" stroke="' + DARK + '" stroke-width="1"/>'),
      skill: r(circ(24, 24, 14, EMBER, 2.4, { dash: '5 4' }) + circ(24, 24, 6.5, '#ffb35a', 2.2) + dot),
      move: r(circ(24, 24, 12, GOLD, 2.4, { dash: '3 4' }) + st('M20 18 L27 24 L20 30', GOLD, 3)),
      grab: r(circ(24, 24, 11, PARCH, 2.4) + st('M19 24 H29 M24 19 V29', PARCH, 2.4)),
      drag: r(circ(24, 24, 10, GOLD, 3, { fill: 'rgba(233,200,114,.45)' })),
      no: r(circ(24, 24, 11, RED, 3) + st('M16 32 L32 16', RED, 3)),
      shop: r(circ(24, 24, 11, GOLD, 2.6, { fill: 'rgba(233,200,114,.4)' }) + '<path d="M24 19 L27 24 L24 29 L21 24 Z" fill="#a8782a" stroke="' + DARK + '" stroke-width="1"/>')
    };
  }

  var VARS = {
    now: { name: 'Now', tag: 'TODAY', set: nowSet(), live: 'css',
      note: 'Bugün: sistem imleci. Oyun yalnızca ok ile el arasında geçiyor, özel bir imleç görseli yok.',
      sub: 'Ok ve el işaretçisi tarayıcıdan gelir. Savaşta sadece seçilebilir hücrelerin üstünde el olur; öğe tutarken (Gear) tutma / bırakma eli ve devre dışı düğmede yasak işareti çıkar.' },
    a: { name: 'A. State set', tag: 'ÖNERİLEN', rec: true, set: setA(), live: 'css',
      note: 'Tavsiye: durum başına küçük, net imleç; fare neye tıklayacağını daha tıklamadan söyler (saldırı, skill, hareket, tutma, yasak).',
      sub: 'Dokuz durum, hepsi gerçek CSS imleci (32 px); gecikmesiz çalışır. Dükkân parası isteğe bağlı bir durumdur, istenmezse düşer.' },
    b: { name: 'B. One themed cursor', tag: '', set: setB(), live: 'css',
      note: 'En sade: her yerde aynı tek temalı imleç (altın ok, kor taşı); yalnızca havada oyunun diline uyar, durum anlatmaz.',
      sub: 'Tek şekil, tek dosya, her durumda aynı (yasak ve tutma dahil). Tıklanabilirlik imleçten değil, mevcut hover yükselmesi ve parlamasından anlaşılır.' },
    c: { name: 'C. Game-drawn follower', tag: '', set: ringSet(), live: 'follow',
      note: 'En süslü: sistem imleci gizlenir, oyun kor halkasını çizer; fareyi izler, arkasında kıvılcım bırakır, tıklayınca dalga yapar, duruma göre biçim değiştirir.',
      sub: 'Sistem imleci oyun alanında gizlenir (cursor: none), halka bir kare geriden gelir, büyük boy ve parıltı serbesttir. Dokunmatikte yok. Sayfadaki canlı denemede kıvılcım ve dalga çalışır.' }
  };
  var ORDER = ['now', 'a', 'b', 'c'];

  function cssCursor(v, s) {
    var c = VARS[v].set[s];
    if (VARS[v].live === 'follow') return 'none';
    return 'url("' + enc(c.svg) + '") ' + c.hx + ' ' + c.hy + ', ' + c.fb;
  }

  /* ---------- state from hash ---------- */
  function parse() {
    var S = { v: 'all', z: '169', bg: 'ember', mk: 1, clean: false };
    var parts = location.hash.replace(/^#/, '').split('&');
    parts.forEach(function (p, i) {
      if (!p) return;
      if (p === 'clean') { S.clean = true; return; }
      var kv = p.split('=');
      if (kv.length === 2) { if (kv[0] === 'z') S.z = kv[1]; else if (kv[0] === 'bg') S.bg = kv[1]; else if (kv[0] === 'mk') S.mk = kv[1] === '0' ? 0 : 1; }
      else if (i === 0 && (p === 'all' || VARS[p])) S.v = p;
    });
    return S;
  }
  var S = parse();
  function save() {
    var h = S.v + (S.z !== '169' ? '&z=' + S.z : '') + (S.bg !== 'ember' ? '&bg=' + S.bg : '') + (S.mk ? '' : '&mk=0') + (S.clean ? '&clean' : '');
    history.replaceState(null, '', '#' + h);
  }

  /* ---------- scenes ---------- */
  function img(f, st) { return '<img src="' + D + f + '" alt="" style="' + st + '">'; }

  function battleScene(W, bg) {
    var xo = (W - 1920) / 2;
    var bgW = W, bgH = Math.round(W / 1536 * 1024);
    var ff = bg === 'sunny' ? 0.527 : 0.596;
    var top = Math.min(0, Math.max(1080 - bgH, Math.round(715 - ff * bgH)));
    var file = bg === 'sunny' ? 'bg-sunny.webp' : 'bg-ember-road.webp';
    var h = '<div style="position:absolute;inset:0;background:#14100c url(' + D + file + ') no-repeat 0 ' + top + 'px/' + bgW + 'px ' + bgH + 'px"></div>';
    var cells = [
      { x: 330, y: 850, k: 'a', spr: 'warrior.webp' }, { x: 590, y: 790, k: 'a', spr: 'warrior.webp', ally2: 1 }, { x: 850, y: 850, k: 'empty' },
      { x: 1070, y: 790, k: 'e', spr: 'ember_acolyte.webp' }, { x: 1330, y: 850, k: 'e', spr: 'ember_acolyte.webp', foe: 1 }, { x: 1590, y: 790, k: 'e', spr: 'ember_acolyte.webp' }
    ];
    cells.forEach(function (c) {
      var x = c.x + xo;
      h += '<div class="cell' + (c.k === 'e' ? ' en' : '') + '" style="left:' + x + 'px;top:' + c.y + 'px"></div>';
    });
    cells.forEach(function (c) {
      var x = c.x + xo;
      if (c.spr) h += '<img class="spr" src="' + D + c.spr + '" alt="" style="left:' + x + 'px;top:' + (c.y - 310) + 'px;' + (c.k === 'e' ? 'transform:translateX(-50%) scaleX(-1)' : '') + '">';
      var cur = c.k === 'e' ? 'attack' : c.k === 'a' ? 'skill' : 'move';
      h += '<div class="hit" data-cur="' + cur + '" style="left:' + x + 'px;top:' + (c.y - 330) + 'px;height:370px"></div>';
    });
    var bx = 960 + xo - 340;
    h += '<div class="bar" style="left:' + bx + 'px;top:940px;width:680px">' +
      '<div class="eb" data-cur="click">Rest</div><div class="eb" data-cur="click">Skip</div><div class="eb pri" data-cur="click">Move</div><div class="eb off" data-cur="no">Revive</div></div>';
    return h;
  }
  // markers in stage coordinates (hotspot point), xo added by caller
  function battleMarks(xo) {
    return [
      { x: 210 + xo, y: 380, st: 'def', lb: 'Empty ground' },
      { x: 590 + xo, y: 650, st: 'skill', lb: 'Ally cell, heal/buff picked' },
      { x: 1330 + xo, y: 700, st: 'attack', lb: 'Enemy cell, attack picked' },
      { x: 850 + xo, y: 850, st: 'move', lb: 'Empty cell, Move picked' },
      { x: 960 + xo - 255, y: 976, st: 'click', lb: 'Button (Rest)' },
      { x: 960 + xo + 280, y: 976, st: 'no', lb: 'Disabled (Revive)' }
    ];
  }

  var ITEMS = [
    { n: 'Arming Sword', sb: 'Weapon · Item level 4', ic: 'arming_sword.webp', c: '#5f8f3e', p: 40 },
    { n: 'Great Helm', sb: 'Helm · Item level 5', ic: 'great_helm.webp', c: '#3f6fa8', p: 120 },
    { n: 'Oak Shield', sb: 'Off hand · Item level 3', ic: 'oak_shield.webp', c: '#9a9a9a', p: 65 },
    { n: 'Hobnailed Boots', sb: 'Boots · Item level 4', ic: 'hobnailed_boots.webp', c: '#5f8f3e', p: 30 },
    { n: 'Copper Ring', sb: 'Ring · Item level 3', ic: 'copper_ring.webp', c: '#9a9a9a', p: 55 },
    { n: 'Wolf Tooth', sb: 'Trinket · Item level 8', ic: 'wolf_tooth.webp', c: '#7a3f9a', p: 210, dim: 1 }
  ];
  function merchantScene(W) {
    var xo = (W - 1920) / 2, L = 20 + xo;
    var h = '<div class="bgimg"></div><div class="ov"></div>';
    // left: stall
    h += '<div class="panel" data-cur="def" style="left:' + L + 'px;width:600px"><div class="ph1">Merchant</div><div class="phs">Your gold: 128</div></div>';
    h += '<img class="av" data-cur="shop" src="' + D + 'av-merchant.webp" alt="" style="left:' + (L + 440) + 'px;top:28px;width:120px;height:120px;border:1px solid rgba(217,178,106,.4)">';
    ITEMS.forEach(function (it, i) {
      var y = 170 + i * 118;
      h += '<div class="plate' + (it.dim ? ' dim' : '') + (i === 0 ? ' hl' : '') + '" data-cur="' + (it.dim ? 'no' : 'grab') + '" style="--rc:' + it.c + ';left:' + (L + 32) + 'px;top:' + y + 'px;width:536px">' +
        '<img class="ic" src="' + D + it.ic + '" alt=""><div><div class="nm">' + it.n + '</div><div class="sb">' + it.sb + '</div></div>' +
        '<div class="pr"><img src="' + D + 'gold.webp" alt="">' + it.p + '</div></div>';
    });
    // right: ledger
    var R = L + 616, RW = 1880 - 616;
    h += '<div class="panel" data-cur="def" style="left:' + R + 'px;width:' + RW + 'px"><div class="ph1">Gear</div><div class="phs">Warrior · drag items onto a slot</div></div>';
    h += '<img class="av" data-cur="def" src="' + D + 'av-warrior.webp" alt="" style="left:' + (R + 60) + 'px;top:150px;width:400px;height:500px">';
    var slots = [['Weapon', 0, 0], ['Helm', 1, 0], ['Off hand', 0, 1], ['Boots', 1, 1], ['Ring', 0, 2], ['Trinket', 1, 2]];
    slots.forEach(function (s) {
      var x = R + 520 + s[1] * 360, y = 170 + s[2] * 118;
      h += '<div class="plate empty' + (s[0] === 'Weapon' ? ' hl' : '') + '" data-cur="' + (s[0] === 'Weapon' ? 'drag' : 'def') + '" style="--rc:#9a9a9a;left:' + x + 'px;top:' + y + 'px;width:330px"><div><div class="nm" style="color:#a8977a">' + s[0] + '</div><div class="sb">Empty</div></div></div>';
    });
    h += '<div class="bar" style="left:' + (R + 520) + 'px;top:940px;width:' + (RW - 560) + 'px;justify-content:flex-end"><div class="eb" data-cur="click">Sell all</div><div class="eb pri" data-cur="click">Done</div></div>';
    return h;
  }
  function merchantMarks(xo) {
    var L = 20 + xo, R = L + 616;
    return [
      { x: R + 100, y: 260, st: 'def', lb: 'Plain panel' },
      { x: L + 500, y: 90, st: 'shop', lb: 'Merchant portrait' },
      { x: L + 260, y: 215, st: 'grab', lb: 'Item you can drag' },
      { x: L + 260, y: 215 + 5 * 118, st: 'no', lb: 'Unaffordable item' },
      { x: R + 690, y: 215, st: 'drag', lb: 'Dragging over a slot', ghost: 'arming_sword.webp' },
      { x: R + 1144, y: 972, st: 'click', lb: 'Button (Done)' }
    ];
  }

  /* ---------- marker html (unscaled layer, positions scaled) ---------- */
  function markHtml(vk, m, s) {
    var c = VARS[vk].set[m.st], left = m.x * s, top = m.y * s, h = '<div class="mk" style="left:' + left + 'px;top:' + top + 'px">';
    if (VARS[vk].live === 'follow') {
      [[16, 12], [30, 22], [46, 33], [62, 44]].forEach(function (t, i) {
        h += '<span class="dot" style="left:' + (-t[0]) + 'px;top:' + (-t[1]) + 'px;width:' + (6 - i) + 'px;height:' + (6 - i) + 'px;opacity:' + (0.8 - i * 0.18) + '"></span>';
      });
    }
    if (m.ghost) h += '<img src="' + D + m.ghost + '" alt="" style="left:-4px;top:-40px;width:44px;height:44px;opacity:.85;border:1px solid rgba(217,178,106,.5);background:rgba(0,0,0,.5)">';
    h += '<img src="' + enc(c.svg) + '" alt="" style="left:' + (-c.hx) + 'px;top:' + (-c.hy) + 'px;width:' + c.w + 'px;height:' + c.w + 'px;' + (VARS[vk].live === 'follow' ? 'filter:drop-shadow(0 0 6px rgba(255,150,60,.7))' : '') + '">';
    h += '<span class="hs"></span><span class="lb" style="left:' + (c.w - c.hx + 4) + 'px;top:' + (c.w - c.hy - 4) + 'px">' + SNAME[m.st] + ' · ' + m.lb + '</span></div>';
    return h;
  }

  function sceneBlock(vk, kind, W, s) {
    var xo = (W - 1920) / 2;
    var inner = kind === 'battle' ? battleScene(W, S.bg) : merchantScene(W);
    var marks = kind === 'battle' ? battleMarks(xo) : merchantMarks(xo);
    var mh = S.mk ? marks.map(function (m) { return markHtml(vk, m, s); }).join('') : '';
    return '<div class="cap">' + (kind === 'battle' ? 'Battle scene' : 'Merchant / Gear screen') + ' · ' + (W === 2580 ? '21:9' : '16:9') + (S.mk ? ' · blue dot = click point' : '') + '</div>' +
      '<div class="scrollx"><div class="wrap" data-v="' + vk + '" data-kind="' + kind + '" style="width:' + Math.round(W * s) + 'px;height:' + Math.round(1080 * s) + 'px">' +
      '<div class="stage" style="width:' + W + 'px;height:1080px;transform:scale(' + s + ')">' + inner + '</div>' +
      '<div class="marks">' + mh + '</div></div></div>';
  }

  function sheet(vk) {
    var h = '<div class="cap">Shape check · dark vs bright background · 1x and 2x</div><div class="scrollx"><table class="sheet"><tr><th>State</th><th>Dark 1x</th><th>Bright 1x</th><th>Dark 2x</th><th>Bright 2x</th><th>Used for</th></tr>';
    STATES.forEach(function (s) {
      var c = VARS[vk].set[s], u = enc(c.svg), glow = VARS[vk].live === 'follow' ? 'filter:drop-shadow(0 0 5px rgba(255,150,60,.7));' : '';
      function cell(cls, z) {
        var sz = c.w * z;
        var tr = '';
        if (VARS[vk].live === 'follow') tr = '<i class="tr" style="left:' + (8 * z) + 'px;top:' + (10 * z) + 'px"></i><i class="tr" style="left:' + (16 * z) + 'px;top:' + (18 * z) + 'px;opacity:.6"></i>';
        return '<td><div class="sw ' + cls + ' s' + z + '">' + tr + '<img src="' + u + '" alt="" style="width:' + sz + 'px;height:' + sz + 'px;' + glow + '"></div></td>';
      }
      h += '<tr><td class="sn">' + SNAME[s] + '</td>' + cell('dk', 1) + cell('br', 1) + cell('dk', 2) + cell('br', 2) + '<td class="sd">' + SUSE[s] + '</td></tr>';
    });
    return h + '</table></div>';
  }

  /* ---------- live cursor ---------- */
  function applyLive(root) {
    root.querySelectorAll('.wrap').forEach(function (w) {
      var vk = w.getAttribute('data-v'), V = VARS[vk];
      w.style.cursor = cssCursor(vk, 'def');
      w.querySelectorAll('[data-cur]').forEach(function (e) { e.style.cursor = cssCursor(vk, e.getAttribute('data-cur')); });
      if (V.live === 'follow') followSetup(w, vk);
    });
  }
  function followSetup(w, vk) {
    var f = document.createElement('img'); f.className = 'follow'; w.appendChild(f);
    var last = { x: -99, y: -99 }, curSt = '';
    w.addEventListener('mousemove', function (e) {
      var r = w.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      var t = e.target.closest ? e.target.closest('[data-cur]') : null, st = t ? t.getAttribute('data-cur') : 'def';
      if (st !== curSt) { f.src = enc(VARS[vk].set[st].svg); curSt = st; }
      f.style.display = 'block'; f.style.left = (x - 24) + 'px'; f.style.top = (y - 24) + 'px';
      if (Math.abs(x - last.x) + Math.abs(y - last.y) > 14) {
        last = { x: x, y: y };
        var d = document.createElement('span'); d.className = 'trail'; d.style.left = x + 'px'; d.style.top = y + 'px'; w.appendChild(d);
        setTimeout(function () { d.remove(); }, 500);
      }
    });
    w.addEventListener('mouseleave', function () { f.style.display = 'none'; });
    w.addEventListener('mousedown', function (e) {
      var r = w.getBoundingClientRect(), d = document.createElement('span'); d.className = 'rip'; d.style.left = (e.clientX - r.left) + 'px'; d.style.top = (e.clientY - r.top) + 'px'; w.appendChild(d);
      setTimeout(function () { d.remove(); }, 450);
    });
  }

  /* ---------- page ---------- */
  function facts() {
    document.getElementById('now-facts').innerHTML =
      '<li><b>Özel imleç görseli yok.</b> Kodda <b>cursor: url(...)</b> yok, <b>cursor: none</b> yok. Sadece anahtar sözcükler kullanılıyor.</li>' +
      '<li><b>DOM arayüz (CSS):</b> yaklaşık 80 yerde <b>cursor: pointer</b> (25 CSS dosyası: ana menü, savaş HUD, Gear, harita penceresi, ekonomi...). <b>cursor: grab / grabbing</b> yalnızca <b>gear.css</b> (öğe sürükleme); <b>cursor: not-allowed</b> gear.css, company-window.css, map-window.css (devre dışı düğme / plaka).</li>' +
      '<li><b>Phaser (kanvas):</b> yaklaşık 35 yerde <b>setInteractive({ useHandCursor: true })</b> (elegant-ui, ana menü, takım seçimi, Endless, sefer haritası...). <b>BattleScene</b> ayrıca <b>input.setDefaultCursor(\'pointer\' | \'default\')</b> çağırıyor: hücre üstünde seçilebiliyorsa el, değilse ok (satır ~1382-1388) ve itme seçeneklerinde (satır ~2337-2355).</li>' +
      '<li><b>Etkileşim:</b> Phaser imleci kanvasın inline <b>style.cursor</b> değeri olarak yazar, bu yüzden sayfadaki bir <b>canvas { cursor: url() }</b> kuralı onu ezemez. DOM katmanları (Gear, pencereler) kanvasın üstünde kendi CSS imleciyle durur. Özel imleç için iki yerde değişiklik gerekir: Phaser çağrıları tek yardımcıdan geçmeli, DOM kuralları bir CSS değişkenine (<b>--cur-click</b> gibi) bağlanmalı. Küçük bir iş, yeni mekanik değil.</li>' +
      '<li><b>Telefon:</b> dokunmatikte imleç yok; hiçbir şey değişmez.</li>';
    document.getElementById('limits').innerHTML =
      '<li><b>Boyut:</b> Chrome ve Firefox en çok 128x128 px kabul eder; 32x32 önerilir. Chrome 32 px üstü imleci tarayıcı çerçevesine yakınken gizleyebilir (bildiğim kadarıyla). Bu sayfada hepsi 32 px.</li>' +
      '<li><b>Biçim:</b> SVG (genişlik/yükseklik yazılı), PNG, CUR. Mutlaka son yedek anahtar sözcük (<b>auto</b>, <b>pointer</b>) yazılır; görsel yüklenmezse o kullanılır.</li>' +
      '<li><b>Hotspot:</b> tıklama noktası görselin içinde olmalı (<b>url(...) x y</b>). Mavi nokta bunu gösterir.</li>' +
      '<li><b>Animasyon yok:</b> imleç görseli oynatılamaz (GIF/APNG hareket etmez). Parıltı, kıvılcım, dalga ancak oyunun kendi çizdiği takipçi (C) ile olur.</li>' +
      '<li><b>Yüksek çözünürlük:</b> SVG ölçeklenir; PNG için <b>image-set</b> ile 2x dosya gerekir (tarayıcıya göre değişir).</li>' +
      '<li><b>Ekran görüntüsü ve kayıt:</b> gerçek imleç işletim sisteminin çizdiği şey olduğu için çoğu görüntüde çıkmaz; bu yüzden örnek noktalara ayrıca çizildi.</li>' +
      '<li><b>Takipçi (C):</b> bir kare gecikme, pencere dışına çıkınca kaybolur, sistem imleci gizli olduğundan sayfa donarsa imleç de görünmez olabilir. Bu sayfada denemeleri bilerek yapmadım.</li>';
  }

  function strip() {
    function b(l, on, attr) { return '<button ' + attr + (on ? ' class="on"' : '') + '>' + l + '</button>'; }
    var h = '<b>MOCKUP</b>Cursor ';
    h += b('All', S.v === 'all', 'data-v="all"');
    ORDER.forEach(function (k) { h += b(VARS[k].name.split('.')[0].length === 1 ? VARS[k].name.split('.')[0] : VARS[k].name, S.v === k, 'data-v="' + k + '"'); });
    h += '<span class="sep"></span>' + b('16:9', S.z === '169', 'data-z="169"') + b('21:9', S.z === '219', 'data-z="219"') + b('Phone (no cursor)', S.z === 'ph', 'data-z="ph"');
    h += '<span class="sep"></span>' + b('Dark backdrop', S.bg === 'ember', 'data-bg="ember"') + b('Bright backdrop', S.bg === 'sunny', 'data-bg="sunny"');
    h += '<span class="sep"></span>' + b('Markers ' + (S.mk ? 'on' : 'off'), false, 'data-mk="1"');
    document.getElementById('mk-strip').innerHTML = h;
  }

  function render() {
    document.documentElement.classList.toggle('mk-clean', S.clean);
    strip(); facts();
    var avail = Math.max(320, Math.min(document.documentElement.clientWidth - 44, 1280));
    var W = S.z === '219' ? 2580 : 1920, s = avail / W;
    var keys = S.v === 'all' ? ORDER : [S.v], out = '';
    keys.forEach(function (k) {
      var V = VARS[k];
      out += '<section class="one"><div class="vname">' + V.name + (V.tag ? '<span class="vtag' + (V.rec ? ' rec' : '') + '">' + V.tag + '</span>' : '') + '</div><div class="vnote">' + V.note + '</div><div class="vsub">' + V.sub + '</div>';
      if (S.z === 'ph') out += '<div class="warn"><b>Phone:</b> dokunmatik telefonda imleç yoktur, bu yüzden burada gösterilecek bir şey yok ve telefonda hiçbir şey değişmez. Şekil kontrolü aşağıda.</div>';
      else out += sceneBlock(k, 'battle', W, s) + sceneBlock(k, 'merchant', W, s);
      out += sheet(k) + '</section>';
    });
    var sec = document.getElementById('sections'); sec.innerHTML = out;
    applyLive(sec);
  }

  document.getElementById('mk-strip').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.v) S.v = t.dataset.v; if (t.dataset.z) S.z = t.dataset.z; if (t.dataset.bg) S.bg = t.dataset.bg; if (t.dataset.mk) S.mk = S.mk ? 0 : 1;
    save(); render();
  });
  window.addEventListener('hashchange', function () { S = parse(); render(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 150); });
  render();
})();
