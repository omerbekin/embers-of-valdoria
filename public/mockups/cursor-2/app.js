/* Cursor mockup round 2 (ui-dev, 2026-11-01). Oyun kodu DEGIL. Tum imlecler SVG ile cizilmis TASLAKTIR. */
(function () {
  'use strict';
  var D = 'cursor-2/';
  var STATES = ['def', 'click', 'attack', 'no', 'drag'];
  var SNAME = { def: 'Normal', click: 'Clickable', attack: 'Target / attack', no: 'Disabled', drag: 'Drag' };
  var SUSE = { def: 'Empty ground, plain UI', click: 'Buttons, cards, items', attack: 'Enemy cell, attack picked', no: 'Disabled button, unaffordable', drag: 'Item in hand' };

  var HALO = '#f4e8c8', DARK = '#17110b';
  var PARCH = '#efe0b8', GOLD = '#e9c872', GOLD2 = '#a8782a', EMBER = '#e0702a', EMBER2 = '#ffb35a', RED = '#c4402e', STEEL = '#d5dbe0', GREY = '#8d867a', BROWN = '#6b3f22';

  function enc(svg) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }
  function wrap(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' + inner + '</svg>'; }
  /* parts: [{d,f,sw}] -> all halos first, then all dark+fill, so no halo covers a neighbour's outline */
  function build(parts) {
    var a = '', b = '';
    parts.forEach(function (p) {
      var sw = p.sw || 2.2;
      a += '<path d="' + p.d + '" fill="' + p.f + '" stroke="' + HALO + '" stroke-width="' + (sw + 2.4) + '" stroke-linejoin="round" opacity=".92"/>';
      b += '<path d="' + p.d + '" fill="' + p.f + '" stroke="' + DARK + '" stroke-width="' + sw + '" stroke-linejoin="round"/>';
    });
    return a + b;
  }
  function ln(d, col, w, o) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 1) + '" stroke-linecap="round" stroke-linejoin="round"' + (o ? ' opacity="' + o + '"' : '') + '/>'; }
  function fillp(d, f) { return '<path d="' + d + '" fill="' + f + '"/>'; }
  /* tip at (16,tipY) pointing up; rotate -45 so it points up-left; scale about centre */
  function rot(sc, inner) { return '<g transform="translate(16 16) rotate(-45) scale(' + sc + ') translate(-16 -16)">' + inner + '</g>'; }
  function hot(sc, tipY) { var k = (16 - tipY) * sc * 0.7071; return [Math.round((16 - k) * 10) / 10, Math.round((16 - k) * 10) / 10]; }
  function mk(svg, h, fb) { return { svg: wrap(svg), hx: h[0], hy: h[1], fb: fb || 'default' }; }
  var DIAM = function (cx, cy, r, f) { return 'M' + cx + ' ' + (cy - r) + ' L' + (cx + r * 0.7) + ' ' + cy + ' L' + cx + ' ' + (cy + r) + ' L' + (cx - r * 0.7) + ' ' + cy + ' Z'; };
  var NOBADGE = '<circle cx="24" cy="24" r="5.4" fill="#17110b" stroke="' + HALO + '" stroke-width="1"/><circle cx="24" cy="24" r="4" fill="none" stroke="#e0463a" stroke-width="1.9"/><path d="M21.2 26.8 L26.8 21.2" stroke="#e0463a" stroke-width="1.9" stroke-linecap="round"/>';

  /* ================= NOW ================= */
  var ARROW = 'M5 3 L5 24 L10.4 19.2 L14 27.2 L17.6 25.6 L14.2 17.8 L21.2 17.6 Z';
  var HAND = 'M12 3 C10.5 3 10 4 10 5 L10 15 L8.5 13.8 C7.5 13 6 13.5 6 14.8 L6 17 C6 21 8 26 10 28 L21 28 C23 26 25 22 25 18 L25 14 C25 12.8 23.5 12.2 22.8 13 L22 14 L22 12.5 C22 11.3 20.5 10.8 19.8 11.6 L19 12.5 L19 11.5 C19 10.3 17.6 9.8 16.8 10.6 L16 11.5 L14 11.5 L14 5 C14 4 13.2 3 12 3 Z';
  var FIST = 'M8 15 C8 12.6 11.4 12.6 11.4 14.6 C11.4 12 15.4 12 15.4 14.4 C15.4 12.2 19.6 12.2 19.6 14.8 C19.6 13 24 13 24 15.6 L24 21 C24 25 21 28 17 28 L14 28 C10 28 8 25 8 21 Z';
  function plain(d) { return wrap('<path d="' + d + '" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>'); }
  var NOW = (function () {
    var no = wrap('<circle cx="16" cy="16" r="9" fill="rgba(255,255,255,.9)" stroke="#000" stroke-width="1.4"/><circle cx="16" cy="16" r="7" fill="none" stroke="#d22" stroke-width="3"/><path d="M11 21 L21 11" stroke="#d22" stroke-width="3"/>');
    return {
      def: { svg: plain(ARROW), hx: 5, hy: 3, fb: 'default' }, click: { svg: plain(HAND), hx: 12, hy: 3, fb: 'pointer' }, attack: { svg: plain(HAND), hx: 12, hy: 3, fb: 'pointer' },
      no: { svg: no, hx: 16, hy: 16, fb: 'not-allowed' }, drag: { svg: plain(FIST), hx: 16, hy: 18, fb: 'grabbing' }
    };
  })();

  /* ================= 1 QUILL ================= */
  function quill(o) {
    var sc = 0.98, parts = [
      { d: 'M16.4 8 C22.8 10.6 24.2 21 17.6 31.4 C16.8 23 16.4 15 16.4 8 Z', f: o.vane },
      { d: 'M15.6 9 C10.8 11.2 9.4 19.4 13.6 27.6 C15 21 15.6 15 15.6 9 Z', f: o.vane2 || o.vane },
      { d: 'M16 0.3 L19 6.6 L17.2 10.2 H14.8 L13 6.6 Z', f: o.nib }
    ];
    var s = (o.glow ? '<circle cx="16" cy="2.6" r="4.6" fill="' + EMBER2 + '" opacity=".6"/>' : '') + build(parts) + ln('M16 9 L16.2 31', o.shaft || GOLD2, 1.1) + ln('M16 3.2 V7.4', DARK, 1) +
      (o.glow ? ln('M21.4 1.4 L23.4 -.2 M10.6 1.4 L8.6 -.2', EMBER2, 1.4) : '') + (o.gem ? fillp(DIAM(19.4, 17, 2.4), o.gem) + ln(DIAM(19.4, 17, 2.4), DARK, .7) : '') + (o.bar ? ln('M10 20 L22 24', RED, 0) : '');
    var h = hot(sc, 0.3);
    return mk(rot(sc, s) + (o.no ? NOBADGE : ''), h);
  }
  var Q = {
    def: quill({ vane: PARCH, vane2: '#d9c79a', nib: GOLD }),
    click: quill({ vane: PARCH, vane2: '#d9c79a', nib: EMBER2, glow: true }),
    attack: quill({ vane: '#cf4a36', vane2: '#a8332a', nib: '#ff7a3a', shaft: '#6b1c14' }),
    no: quill({ vane: '#9a948a', vane2: '#807a70', nib: '#aaa396', shaft: '#5d584f', no: true }),
    drag: quill({ vane: GOLD, vane2: '#c9a24e', nib: GOLD, gem: EMBER })
  };

  /* ================= 2 SWORD ================= */
  function sword(o) {
    var sc = 1, blade = 'M16 0.3 L19.2 6 V20 H12.8 V6 Z';
    var parts = [], s = '';
    if (o.sheath) {
      parts.push({ d: 'M13 2.6 Q16 -0.8 19 2.6 V21 H13 Z', f: '#6c665c' });
    } else {
      parts.push({ d: blade, f: o.blade });
    }
    parts.push({ d: 'M7.4 20 H24.6 V23.4 H7.4 Z', f: o.guard || GOLD });
    parts.push({ d: 'M14.6 23.4 H17.4 V28.4 H14.6 Z', f: o.grip || BROWN });
    parts.push({ d: 'M16 28.6 m-2.4 0 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0', f: o.pom || GOLD });
    if (o.glove) parts.push({ d: 'M13 22.6 H19 V29.4 H13 Z', f: PARCH });
    s += build(parts);
    if (o.sheath) s += fillp('M13 8 H19 V10.4 H13 Z', GREY) + ln('M16 12 V19', '#4a463f', 1.2);
    else s += fillp('M16 0.3 L19.2 6 V20 H16 Z', 'rgba(60,70,80,.28)') + ln('M16 4.5 V17.6', o.fuller || '#8a949c', 1);
    if (o.glow) s += '<circle cx="16" cy="3" r="4.4" fill="' + EMBER2 + '" opacity=".55"/>' + ln('M16 0.6 L19 5.8 V19', '#fff6dd', 0.9);
    if (!o.sheath) s += fillp(DIAM(16, 15.4, 2.7), o.gem || '#c9692a') + ln(DIAM(16, 15.4, 2.7), DARK, .7);
    s += ln('M8.4 21.7 H23.6', GOLD2, .8);
    return mk(rot(sc, s) + (o.no ? NOBADGE : ''), hot(sc, 0.3), 'default');
  }
  var SW = {
    def: sword({ blade: STEEL }),
    click: sword({ blade: '#f6efd8', gem: EMBER2, glow: true }),
    attack: sword({ blade: '#ee6f3a', fuller: '#7a1e10', gem: '#ffe2a0', guard: GOLD }),
    no: sword({ sheath: true, guard: GREY, pom: GREY, grip: '#5a5249', no: true }),
    drag: sword({ blade: GOLD, glove: true, gem: EMBER })
  };

  /* ================= 3 EMBER ARROWHEAD (one shape) ================= */
  function arrow(o) {
    var sc = 1, head = 'M16 0.3 C21.6 7 23.2 13.6 20.6 19.6 L16 22.6 L11.4 19.6 C8.8 13.6 10.4 7 16 0.3 Z';
    var parts = [
      { d: 'M15.2 25.4 H16.8 V31.4 H15.2 Z', f: BROWN },
      { d: 'M16 27.4 L20.6 31.6 H16 Z', f: o.fl || PARCH }, { d: 'M16 27.4 L11.4 31.6 H16 Z', f: o.fl || PARCH },
      { d: 'M12.4 22.6 H19.6 V25.6 H12.4 Z', f: o.col || GOLD },
      { d: head, f: o.head }
    ];
    var s = (o.glow ? '<circle cx="16" cy="12" r="8" fill="' + EMBER2 + '" opacity=".5"/>' : '') + build(parts) + fillp('M16 .3 C21.6 7 23.2 13.6 20.6 19.6 L16 22.6 Z', 'rgba(40,50,60,.22)');
    s += ln('M16 3.4 C19 8 19.8 13 18.6 17.4', o.edge || '#fff', .8, .7);
    var dm = DIAM(16, 12.6, 5.2);
    s += o.hollow ? '<path d="' + dm + '" fill="rgba(0,0,0,.25)" stroke="' + DARK + '" stroke-width="1.3" stroke-linejoin="round"/>' : '<path d="' + dm + '" fill="' + o.gem + '" stroke="' + DARK + '" stroke-width="1.3" stroke-linejoin="round"/>' + fillp(DIAM(15.4, 11.6, 1.8), 'rgba(255,255,255,.55)');
    if (o.no) s += ln('M10.6 7 L21.4 18', '#e0463a', 2.2);
    return mk(rot(sc, s), hot(sc, 0.3));
  }
  var AR = {
    def: arrow({ head: STEEL, gem: '#d4641f' }),
    click: arrow({ head: '#f6efd8', gem: '#ffb35a', glow: true, col: '#ffd57a' }),
    attack: arrow({ head: '#d9503f', gem: '#ffd9a0', col: '#8c2a20', edge: '#ffd0c0' }),
    no: arrow({ head: '#9a948a', hollow: true, col: GREY, fl: '#b3ad9f', edge: '#ccc', no: true }),
    drag: arrow({ head: GOLD, gem: EMBER, col: GOLD2 })
  };

  /* ================= 4 GAUNTLET ================= */
  function gaunt(o) {
    var sc = 0.84, parts = [], s = '';
    var cuff = 'M7.6 24.6 H25.4 V30.4 H7.6 Z';
    if (o.fist) {
      parts.push({ d: 'M9.5 5 C9.5 2.5 12 1.6 13.6 2.6 C15 1 18 1 19.2 2.6 C21 1.6 24 2.6 24 5.4 V21 C24 23 22.4 24.6 20.4 24.6 H12 C10.6 24.6 9.5 23.4 9.5 21.8 Z', f: o.steel });
    } else {
      parts.push({ d: 'M16 0.4 C18.6 0.4 19.4 2.6 19.4 5 V9.6 H12.6 V5 C12.6 2.6 13.4 0.4 16 0.4 Z', f: o.tip || o.steel });
      parts.push({ d: 'M12.4 10.6 H19.6 V15.6 H12.4 Z', f: o.steel });
      parts.push({ d: 'M9.6 16.6 H25 C27 16.6 28 18.4 27.6 20.6 L26.6 24.6 H9.2 Z', f: o.steel });
    }
    parts.push({ d: cuff, f: o.cuff || GOLD });
    s += (o.glow ? '<circle cx="16" cy="2.4" r="4.6" fill="' + EMBER2 + '" opacity=".6"/>' : '') + build(parts);
    if (o.fist) {
      s += ln('M13.4 3 V10 M19 3 V10 M9.8 11 H23.8 M12 14 C14 16 18 16 20 14', DARK, 1.1, .9) + fillp(DIAM(16.4, 6.6, 2.6), o.gem) + ln(DIAM(16.4, 6.6, 2.6), DARK, .7);
    } else {
      s += ln('M12.8 10.1 H19.2 M12.6 16.1 H19.4', DARK, 1) + ln('M23 17.4 V22.6 M25.4 17.8 V22.6', DARK, 1) + ln('M14.4 2 V8', '#fff', .8, .55);
      if (o.glow) s += ln('M21.6 1.4 L23.6 -0.2 M10.4 1.4 L8.4 -0.2', EMBER2, 1.4);
      if (o.slash) s += '<path d="M10 12.6 H22" stroke="' + DARK + '" stroke-width="4.2" stroke-linecap="round"/><path d="M10 12.6 H22" stroke="#e0463a" stroke-width="2.2" stroke-linecap="round"/>';
    }
    s += fillp(DIAM(16.5, 27.5, 2.1), o.dm || EMBER) + ln(DIAM(16.5, 27.5, 2.1), DARK, .6);
    return mk(rot(sc, s), o.fist ? [Math.round((16 - (16 - 2) * sc * .7071) * 10) / 10 + 1, Math.round((16 - (16 - 2) * sc * .7071) * 10) / 10 + 1] : hot(sc, 0.4));
  }
  var GA = {
    def: gaunt({ steel: STEEL }),
    click: gaunt({ steel: STEEL, tip: '#ffd9a0', glow: true, dm: EMBER2 }),
    attack: gaunt({ steel: '#d9674f', fist: true, gem: '#ffe2a0', cuff: GOLD }),
    no: gaunt({ steel: '#9a948a', cuff: GREY, dm: GREY, slash: true }),
    drag: gaunt({ steel: GOLD, fist: true, gem: EMBER, cuff: GOLD2 })
  };

  /* ================= 5 WAX SEAL ================= */
  function seal(o) {
    var tear = 'M3 3 L22.24 10.08 A9.5 9.5 0 1 1 10.08 22.24 Z';
    var parts = [];
    (o.drips !== false) && parts.push({ d: 'M27.4 24.2 m-2.1 0 a2.1 2.1 0 1 0 4.2 0 a2.1 2.1 0 1 0 -4.2 0', f: o.wax });
    parts.push({ d: 'M13.6 28.4 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0', f: o.wax });
    parts.push({ d: tear, f: o.wax });
    var s = (o.lift ? '<ellipse cx="22" cy="30" rx="7" ry="1.6" fill="rgba(0,0,0,.35)"/>' : '') + (o.glow ? '<circle cx="19" cy="19" r="12" fill="' + EMBER2 + '" opacity=".28"/>' : '') + build(parts);
    s += '<circle cx="19" cy="19" r="6.4" fill="' + o.inner + '" stroke="' + (o.rim || GOLD) + '" stroke-width="' + (o.rimw || 1) + '"/>';
    s += ln('M8.4 8.2 L14 12.2', 'rgba(255,255,255,.55)', 1.2);
    if (o.cross) s += ln('M15.6 15.6 L22.4 22.4 M22.4 15.6 L15.6 22.4', GOLD, 1.8) + fillp(DIAM(19, 19, 2.2), '#ff8a5a');
    else s += fillp(DIAM(19, 19, o.big ? 4.2 : 3.4), o.gem) + ln(DIAM(19, 19, o.big ? 4.2 : 3.4), DARK, .7);
    if (o.crack) s += ln('M13.6 13 L17.4 17.2 L15.4 20 L20.4 25.4', DARK, 1.5);
    return mk(s, [3.4, 3.4]);
  }
  var SE = {
    def: seal({ wax: '#a63a2c', inner: '#862c22', gem: EMBER2 }),
    click: seal({ wax: '#c64a30', inner: '#a63a2c', gem: '#ffe2a0', rim: '#ffe29a', rimw: 1.7, glow: true, big: true }),
    attack: seal({ wax: '#5e1a14', inner: '#3e100c', gem: '#ff8a5a', cross: true }),
    no: seal({ wax: '#8d867a', inner: '#7a746a', gem: '#6d675d', rim: '#b0a998', crack: true }),
    drag: seal({ wax: '#a63a2c', inner: '#862c22', gem: EMBER2, rim: GOLD, rimw: 1.7, lift: true, big: true })
  };

  var VARS = {
    now: { name: 'Now', short: 'Now', set: NOW, line: 'What the game shows today: the plain system arrow, hand and not-allowed sign (a redrawn stand-in).' },
    1: { name: '1 Quill', short: 'Quill', set: Q, line: 'A feather quill whose gold nib is the click point. Parchment normally, nib dipped in ember when clickable, red feather on a target, grey and struck out when disabled, gilded when carrying.' },
    2: { name: '2 Sword point', short: 'Sword', set: SW, line: 'A drawn arming sword, point is the hotspot. Steel at rest, blade flares when clickable, glows ember-hot on a target, sheathed when disabled, gloved grip when carrying.' },
    3: { name: '3 Ember arrowhead', short: 'Arrowhead', set: AR, rec: true, line: 'One single shape in every state: a leaf-shaped broadhead with an ember diamond at its heart. Only metal and gem colour change (bright, red, hollow grey, gilded).' },
    4: { name: '4 Gauntlet', short: 'Gauntlet', set: GA, line: 'A plated gauntlet with a pointing finger, fingertip is the hotspot. Fingertip glows when clickable, becomes a red-hot fist on a target, barred when disabled, golden fist when carrying.' },
    5: { name: '5 Wax seal', short: 'Seal', set: SE, line: 'A teardrop wax seal; its point is the click pointer and the stamped ember diamond sits in the round body. Brightens, crosses its blades, cracks grey, or lifts gilded by state.' }
  };
  var ORDER = ['now', '1', '2', '3', '4', '5'];

  function curCss(v, s) { var c = VARS[v].set[s]; return 'url("' + enc(c.svg) + '") ' + c.hx + ' ' + c.hy + ', ' + c.fb; }

  function parse() {
    var S = { v: '3', z: '169', bg: 'ember', mk: 1 };
    location.hash.replace(/^#/, '').split('&').forEach(function (p, i) {
      if (!p) return;
      var kv = p.split('=');
      if (kv.length === 2) { if (kv[0] === 'z') S.z = kv[1] === '219' ? '219' : '169'; else if (kv[0] === 'bg') S.bg = kv[1] === 'sunny' ? 'sunny' : 'ember'; else if (kv[0] === 'mk') S.mk = kv[1] === '0' ? 0 : 1; }
      else if (i === 0 && VARS[p]) S.v = p;
    });
    return S;
  }
  var S = parse();
  function href(o) { var n = { v: S.v, z: S.z, bg: S.bg, mk: S.mk }; for (var k in o) n[k] = o[k]; return '#' + n.v + '&z=' + n.z + '&bg=' + n.bg + (n.mk ? '' : '&mk=0'); }

  /* ---------- scenes ---------- */
  function battleScene(W, bg) {
    var xo = (W - 1920) / 2, bgW = W, bgH = Math.round(W / 1536 * 1024), ff = bg === 'sunny' ? 0.527 : 0.596;
    var top = Math.min(0, Math.max(1080 - bgH, Math.round(715 - ff * bgH))), file = bg === 'sunny' ? 'bg-sunny.webp' : 'bg-ember-road.webp';
    var h = '<div style="position:absolute;inset:0;background:#14100c url(' + D + file + ') no-repeat 0 ' + top + 'px/' + bgW + 'px ' + bgH + 'px"></div>';
    var cells = [{ x: 330, y: 850, k: 'a', spr: 'warrior.webp' }, { x: 590, y: 790, k: 'a', spr: 'warrior.webp' }, { x: 850, y: 850, k: 'empty' }, { x: 1070, y: 790, k: 'e', spr: 'ember_acolyte.webp' }, { x: 1330, y: 850, k: 'e', spr: 'ember_acolyte.webp' }, { x: 1590, y: 790, k: 'e', spr: 'ember_acolyte.webp' }];
    cells.forEach(function (c) { h += '<div class="cell' + (c.k === 'e' ? ' en' : '') + '" style="left:' + (c.x + xo) + 'px;top:' + c.y + 'px"></div>'; });
    cells.forEach(function (c) {
      var x = c.x + xo;
      if (c.spr) h += '<img class="spr" src="' + D + c.spr + '" alt="" style="left:' + x + 'px;top:' + (c.y - 310) + 'px;' + (c.k === 'e' ? 'transform:translateX(-50%) scaleX(-1)' : '') + '">';
      h += '<div class="hit" data-cur="' + (c.k === 'e' ? 'attack' : c.k === 'a' ? 'click' : 'def') + '" style="left:' + x + 'px;top:' + (c.y - 330) + 'px;height:370px"></div>';
    });
    h += '<div class="bar" style="left:' + (960 + xo - 340) + 'px;top:940px;width:680px"><div class="eb" data-cur="click">Rest</div><div class="eb" data-cur="click">Skip</div><div class="eb pri" data-cur="click">Move</div><div class="eb off" data-cur="no">Revive</div></div>';
    return h;
  }
  function battleMarks(xo) {
    return [{ x: 200 + xo, y: 400, st: 'def', lb: 'Empty ground' }, { x: 1330 + xo, y: 690, st: 'attack', lb: 'Enemy, attack picked' }, { x: 960 + xo - 255, y: 972, st: 'click', lb: 'Button' }, { x: 960 + xo + 280, y: 972, st: 'no', lb: 'Disabled' }];
  }
  var ITEMS = [
    { n: 'Arming Sword', sb: 'Weapon · Item level 4', ic: 'arming_sword.webp', c: '#5f8f3e', p: 40 }, { n: 'Great Helm', sb: 'Helm · Item level 5', ic: 'great_helm.webp', c: '#3f6fa8', p: 120 },
    { n: 'Oak Shield', sb: 'Off hand · Item level 3', ic: 'oak_shield.webp', c: '#9a9a9a', p: 65 }, { n: 'Hobnailed Boots', sb: 'Boots · Item level 4', ic: 'hobnailed_boots.webp', c: '#5f8f3e', p: 30 },
    { n: 'Copper Ring', sb: 'Ring · Item level 3', ic: 'copper_ring.webp', c: '#9a9a9a', p: 55 }, { n: 'Wolf Tooth', sb: 'Trinket · Item level 8', ic: 'wolf_tooth.webp', c: '#7a3f9a', p: 210, dim: 1 }
  ];
  function merchantScene(W) {
    var xo = (W - 1920) / 2, L = 20 + xo, h = '<div class="bgimg"></div><div class="ov"></div>';
    h += '<div class="panel" data-cur="def" style="left:' + L + 'px;width:600px"><div class="ph1">Merchant</div><div class="phs">Your gold: 128</div></div>';
    h += '<img class="av" data-cur="click" src="' + D + 'av-merchant.webp" alt="" style="left:' + (L + 440) + 'px;top:28px;width:120px;height:120px;border:1px solid rgba(217,178,106,.4)">';
    ITEMS.forEach(function (it, i) {
      h += '<div class="plate' + (it.dim ? ' dim' : '') + (i === 0 ? ' hl' : '') + '" data-cur="' + (it.dim ? 'no' : 'click') + '" style="--rc:' + it.c + ';left:' + (L + 32) + 'px;top:' + (170 + i * 118) + 'px;width:536px"><img class="ic" src="' + D + it.ic + '" alt=""><div><div class="nm">' + it.n + '</div><div class="sb">' + it.sb + '</div></div><div class="pr"><img src="' + D + 'gold.webp" alt="">' + it.p + '</div></div>';
    });
    var R = L + 616, RW = 1880 - 616;
    h += '<div class="panel" data-cur="def" style="left:' + R + 'px;width:' + RW + 'px"><div class="ph1">Gear</div><div class="phs">Warrior · drag items onto a slot</div></div>';
    h += '<img class="av" data-cur="def" src="' + D + 'av-warrior.webp" alt="" style="left:' + (R + 60) + 'px;top:150px;width:400px;height:500px">';
    [['Weapon', 0, 0], ['Helm', 1, 0], ['Off hand', 0, 1], ['Boots', 1, 1], ['Ring', 0, 2], ['Trinket', 1, 2]].forEach(function (s) {
      h += '<div class="plate empty' + (s[0] === 'Weapon' ? ' hl' : '') + '" data-cur="' + (s[0] === 'Weapon' ? 'drag' : 'def') + '" style="--rc:#9a9a9a;left:' + (R + 520 + s[1] * 360) + 'px;top:' + (170 + s[2] * 118) + 'px;width:330px"><div><div class="nm" style="color:#a8977a">' + s[0] + '</div><div class="sb">Empty</div></div></div>';
    });
    h += '<div class="bar" style="left:' + (R + 520) + 'px;top:940px;width:' + (RW - 560) + 'px;justify-content:flex-end"><div class="eb" data-cur="click">Sell all</div><div class="eb pri" data-cur="click">Done</div></div>';
    return h;
  }
  function merchantMarks(xo) {
    var L = 20 + xo, R = L + 616;
    return [{ x: R + 120, y: 300, st: 'def', lb: 'Plain panel' }, { x: L + 330, y: 215, st: 'click', lb: 'Item' }, { x: L + 330, y: 215 + 5 * 118, st: 'no', lb: 'Unaffordable' }, { x: R + 690, y: 215, st: 'drag', lb: 'Dragging over slot', ghost: 'arming_sword.webp' }];
  }
  function markHtml(vk, m, s) {
    var c = VARS[vk].set[m.st], h = '<div class="mk" style="left:' + (m.x * s) + 'px;top:' + (m.y * s) + 'px">';
    if (m.ghost) h += '<img src="' + D + m.ghost + '" alt="" style="position:absolute;left:6px;top:-30px;width:34px;height:34px;opacity:.85;border:1px solid rgba(217,178,106,.5);background:rgba(0,0,0,.5)">';
    h += '<img class="cu" src="' + enc(c.svg) + '" alt="" style="left:' + (-c.hx) + 'px;top:' + (-c.hy) + 'px;width:32px;height:32px">';
    if (S.mk) h += '<span class="hs"></span><span class="lb" style="left:' + (30 - c.hx) + 'px;top:' + (30 - c.hy) + 'px">' + SNAME[m.st] + ' · ' + m.lb + '</span>';
    return h + '</div>';
  }
  function sceneBlock(vk, kind, W, s) {
    var xo = (W - 1920) / 2, inner = kind === 'battle' ? battleScene(W, S.bg) : merchantScene(W), marks = kind === 'battle' ? battleMarks(xo) : merchantMarks(xo);
    return '<div><div class="cap">' + (kind === 'battle' ? 'Battle' : 'Shop and Gear') + ' · ' + (W === 2580 ? '21:9' : '16:9') + ' · cursors at real 32 px</div>' +
      '<div class="wrap" data-v="' + vk + '" style="width:' + Math.round(W * s) + 'px;height:' + Math.round(1080 * s) + 'px"><div class="stage" style="width:' + W + 'px;height:1080px;transform:scale(' + s + ')">' + inner + '</div><div class="marks">' + marks.map(function (m) { return markHtml(vk, m, s); }).join('') + '</div></div></div>';
  }
  function sheet(vk) {
    var h = '';
    STATES.forEach(function (s) {
      var c = VARS[vk].set[s], u = enc(c.svg);
      function sw(cls, z, big) { return '<div class="sw ' + cls + ' ' + (big ? 'big' : 'sm') + '"><img class="cu" src="' + u + '" alt="" style="width:' + (32 * z) + 'px;height:' + (32 * z) + 'px;margin:' + (0) + '"><span class="hs" style="left:' + ((big ? 56 : 28) - 16 * z + c.hx * z) + 'px;top:' + ((big ? 56 : 22) - 16 * z + c.hy * z) + 'px"></span></div>'; }
      h += '<div class="sc"><div class="sn">' + SNAME[s] + '<small>' + SUSE[s] + '</small></div><div class="pair">' + sw('dk', 3, 1) + sw('br', 3, 1) + '</div><div class="pair">' + sw('dk', 1, 0) + sw('br', 1, 0) + '</div></div>';
    });
    return h;
  }

  function applyLive() {
    var root = document.documentElement, v = S.v;
    root.style.cursor = curCss(v, 'def');
    document.body.style.cursor = curCss(v, 'def');
    document.querySelectorAll('[data-cur]').forEach(function (e) { e.style.cursor = curCss(v, e.getAttribute('data-cur')); });
    document.querySelectorAll('.wrap').forEach(function (e) { e.style.cursor = curCss(v, 'def'); });
  }

  function render() {
    var V = VARS[S.v];
    var bar = '<span class="ttl">Cursor · round 2</span><div class="grp">';
    ORDER.forEach(function (k) { bar += '<a class="btn' + (S.v === k ? ' on' : '') + '" data-cur="click" href="' + href({ v: k }) + '">' + (k === 'now' ? 'Now' : k + ' ' + VARS[k].short) + (VARS[k].rec ? '<i>REC</i>' : '') + '</a>'; });
    bar += '</div><span class="sep"></span><div class="grp"><a class="btn' + (S.z === '169' ? ' on' : '') + '" data-cur="click" href="' + href({ z: '169' }) + '">16:9</a><a class="btn' + (S.z === '219' ? ' on' : '') + '" data-cur="click" href="' + href({ z: '219' }) + '">21:9</a></div>';
    bar += '<div class="grp"><a class="btn' + (S.bg === 'ember' ? ' on' : '') + '" data-cur="click" href="' + href({ bg: 'ember' }) + '">Ember</a><a class="btn' + (S.bg === 'sunny' ? ' on' : '') + '" data-cur="click" href="' + href({ bg: 'sunny' }) + '">Sunny</a><a class="btn' + (S.mk ? ' on' : '') + '" data-cur="click" href="' + href({ mk: S.mk ? 0 : 1 }) + '">Labels</a></div>';
    document.getElementById('bar').innerHTML = bar;
    document.getElementById('line').innerHTML = '<b>' + V.name + '</b>' + (V.rec ? '<span class="rec">RECOMMENDED</span>' : ' ') + V.line + ' <span class="ph">Phone: touch screens have no cursor, nothing changes there.</span>';
    var avail = Math.max(320, document.documentElement.clientWidth - 28), cols = avail >= 1000 ? 2 : 1, gap = 12;
    var W = S.z === '219' ? 2580 : 1920, colW = cols === 2 ? (avail - gap) / 2 : avail, s = colW / W;
    var sc = document.getElementById('scenes');
    sc.style.gridTemplateColumns = 'repeat(' + cols + ', ' + Math.round(colW) + 'px)';
    sc.innerHTML = sceneBlock(S.v, 'battle', W, s) + sceneBlock(S.v, 'merchant', W, s);
    document.getElementById('sheet').innerHTML = sheet(S.v);
    applyLive();
  }
  window.addEventListener('hashchange', function () { S = parse(); render(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 150); });
  render();
})();
