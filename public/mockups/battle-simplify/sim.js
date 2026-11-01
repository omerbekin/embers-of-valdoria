/* Battle screen simplify mockup (NOT game code). Numbers come from src/ui/battle-hud.css + src/game/combatant-view.ts + data/battle-layout.json.
   Hash: #now | #a | #b | #c   &z=169 | 219 | ph   &x=1 (100% real size)   &clean (hide bar/notes)   &boxes (show label boxes)   &nopin (hide pinned tip) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var I = function (n) { return 'battle-simplify/img/' + n + '.webp'; };

  var VARS = ['now', 'a', 'b', 'c'];
  var NAMES = { now: 'Now', a: 'A · Numbers first', b: 'B · Icon plates', c: 'C · One size floor' };
  var SIZES = { 169: { w: 1920, l: '16:9' }, 219: { w: 2580, l: '21:9' }, ph: { w: 2337, l: 'Phone 844x390' } };
  var PH_SCALE = 390 / 1080; // phone: 844x390 viewport -> HUD scale 0.361 (BattleHud.layout)
  var S = { v: 'now', z: '169', x: false, clean: false, boxes: false, nopin: false };

  /* ---------------------------------------------------------------------------------------------------------------------------------
     TOKENS. Text tokens [desktop units(=px at 1920), phone REAL px]; layout tokens [desktop units, phone units]. 0 = not shown.
     'now' = battle-hud.css today. A/B/C = proposals. */
  var T = {
    now: {
      nm: [23, 10], num: [15, 9], of: [12, 8], numIco: [18, 10], stv: [15, 9], stl: [11, 0], tileH: [26, 14], tileIco: [18, 10], more: [11, 0], moreH: [27, 0], rc: [12, 0],
      pn: [13, 9], fr: [10, 9], pw: [10, 0], pc: [13, 10], chipH: [21, 12], chipIco: [15, 10], tag: [10, 7], key: [14, 9], gl: [15, 0], cl: [13, 9], vl: [15, 0], tl: [15, 5.4], cdv: [30, 18], un: [26, 9.4],
      pfW: [108, 96], pfH: [128, 118], infoW: [378, 540], barH: [9, 11], plW: [132, 146], plH: [148, 148], plTop: [926, 926], padT: [17, 12], plGap: [6, 2], ico: [60, 76],
      glH: [126, 0], glW: [172, 0], glIco: [24, 64], glTxt: 0, glGap: 0, clH: [46, 0], clW: [190, 0], clSq: [0, 0], clIco: [24, 40], vlh: [60, 66],
      ubW: [104, 104], ubH: [16, 16],
      f: { roleChips: 1, barsIn: 0, tiles: 1, tileLabels: 1, moreMode: 'text', tags: 1, words: 1, plateName: 1, valorLabel: 1, unit: 'now', clogSquare: 0 }
    },
    a: {
      nm: [30, 14], num: [22, 13], of: [16, 10], numIco: [22, 12], stv: [22, 13], stl: [0, 0], tileH: [34, 20], tileIco: [22, 13], more: [14, 0], moreH: [26, 0], rc: [0, 0],
      pn: [15, 11], fr: [15, 11], pw: [0, 0], pc: [20, 14], chipH: [26, 17], chipIco: [18, 13], tag: [13, 9], key: [18, 12], gl: [19, 10], cl: [17, 12], vl: [17, 0], tl: [22, 11], cdv: [32, 20], un: [19, 9.5],
      pfW: [108, 96], pfH: [128, 118], infoW: [354, 540], barH: [26, 17], plW: [140, 146], plH: [154, 148], plTop: [920, 926], padT: [16, 12], plGap: [5, 2], ico: [58, 76],
      glH: [132, 0], glW: [184, 0], glIco: [24, 52], glTxt: 1, glGap: 4, clH: [54, 0], clW: [210, 0], clSq: [0, 122], clIco: [24, 64], vlh: [60, 66],
      ubW: [150, 176], ubH: [26, 36],
      f: { roleChips: 0, barsIn: 1, tiles: 1, tileLabels: 0, moreMode: 'text', tags: 1, words: 0, plateName: 1, valorLabel: 1, unit: 'plaque', clogSquare: 1 }
    },
    b: {
      nm: [30, 14], num: [24, 14], of: [16, 10], numIco: [24, 13], stv: [0, 0], stl: [0, 0], tileH: [0, 0], tileIco: [0, 0], more: [14, 0], moreH: [26, 0], rc: [0, 0],
      pn: [0, 0], fr: [17, 12], pw: [0, 0], pc: [22, 14], chipH: [30, 17], chipIco: [20, 14], tag: [14, 9], key: [20, 12], gl: [20, 0], cl: [17, 12], vl: [17, 0], tl: [22, 11], cdv: [34, 22], un: [24, 10],
      pfW: [108, 96], pfH: [128, 118], infoW: [290, 500], barH: [30, 17], plW: [150, 160], plH: [154, 148], plTop: [920, 926], padT: [16, 10], plGap: [8, 3], ico: [84, 84],
      glH: [140, 0], glW: [190, 0], glIco: [26, 64], glTxt: 0, glGap: 0, clH: [54, 0], clW: [210, 0], clSq: [0, 122], clIco: [24, 64], vlh: [60, 66],
      ubW: [120, 130], ubH: [22, 26],
      f: { roleChips: 0, barsIn: 1, tiles: 0, tileLabels: 0, moreMode: 'text', tags: 1, words: 0, plateName: 0, valorLabel: 1, unit: 'below', clogSquare: 1 }
    },
    c: {
      nm: [26, 12], num: [20, 12], of: [16, 10], numIco: [20, 11], stv: [20, 12], stl: [0, 0], tileH: [30, 16], tileIco: [22, 12], more: [0, 0], moreH: [30, 0], rc: [0, 0],
      pn: [16, 10], fr: [16, 11], pw: [0, 0], pc: [18, 12], chipH: [24, 15], chipIco: [18, 12], tag: [0, 0], key: [16, 10], gl: [18, 0], cl: [16, 10], vl: [0, 0], tl: [20, 10], cdv: [32, 18], un: [26, 10],
      pfW: [108, 96], pfH: [128, 118], infoW: [340, 540], barH: [24, 17], plW: [144, 146], plH: [156, 148], plTop: [918, 926], padT: [14, 10], plGap: [5, 2], ico: [62, 80],
      glH: [130, 0], glW: [180, 0], glIco: [24, 64], glTxt: 0, glGap: 0, clH: [50, 0], clW: [200, 0], clSq: [0, 122], clIco: [24, 64], vlh: [60, 66],
      ubW: [112, 120], ubH: [20, 22],
      f: { roleChips: 0, barsIn: 1, tiles: 1, tileLabels: 0, moreMode: 'dot', tags: 0, words: 0, plateName: 1, valorLabel: 0, unit: 'tight', clogSquare: 1 }
    }
  };
  var TEXT = { nm: 1, fr: 1, num: 1, of: 1, numIco: 1, stv: 1, stl: 1, tileH: 1, tileIco: 1, more: 1, rc: 1, pn: 1, pw: 1, pc: 1, chipH: 1, chipIco: 1, tag: 1, key: 1, gl: 1, cl: 1, vl: 1, tl: 1, cdv: 1, un: 1 };
  // text-like tokens (real px on phone): sized in real px; everything else in units

  function resolve(v, ph) {
    var r = ph ? 1 / PH_SCALE : 1, t = T[v], o = { f: t.f, r: r, ph: ph }, k;
    for (k in t) {
      if (k === 'f') continue;
      var pair = t[k];
      if (!Array.isArray(pair)) { o[k] = pair; continue; }
      o[k] = ph ? (TEXT[k] ? pair[1] * r : pair[1]) : pair[0];
      o[k + '_raw'] = pair; // for notes
    }
    return o;
  }

  /* ---------------------------------------------------------------------------------------------------------------------------------
     Scene (Ravenwood, Warrior vs 3 Grey Wolves). Foot points = data/battle-layout.json party/enemy slots (1920 center region). */
  var SPR = { warrior: { w: 494, h: 640, scale: 1, flip: false, img: 'warrior', name: 'Warrior', side: 'party' }, wolf: { w: 928, h: 640, scale: 1.2, flip: true, img: 'wolf', name: 'Grey Wolf', side: 'enemy' } };
  var UNITS = [
    { s: 'warrior', x: 784, y: 745, hp: 0.64, mp: 1 },
    { s: 'wolf', x: 1136, y: 745, hp: 1 },
    { s: 'wolf', x: 1195, y: 802, hp: 0.62 },
    { s: 'wolf', x: 1255, y: 859, hp: 1 }
  ];
  function dims(u) { var sp = SPR[u.s], sc = Math.min(140 / sp.w, 190 / sp.h) * sp.scale; return { w: sp.w * sc, h: sp.h * sc }; }

  // label geometry per mode; returns { html, boxes: { name:{x0,y0,x1,y1}, bar:{...}, all:{...} } } in stage units (offX already added)
  function unitLabel(u, c, offX) {
    var d = dims(u), sp = SPR[u.s], x = u.x + offX, y = u.y, en = sp.side === 'enemy', fill = (u.hp * 100).toFixed(0) + '%';
    var un = c.un, mode = c.f.unit, html = '', bx = {};
    var nameW = function (txt) { return txt.length * un * 0.66 + 8; }; // rough Cinzel mixed-case width, only for the debug boxes
    var barBox = function (cx, cy, w, h) { return { x0: cx - w / 2 - 3, y0: cy - h / 2 - 3, x1: cx + w / 2 + 3, y1: cy + h / 2 + 3 }; };
    var bar = function (cx, cy, w, h, extra, inner) { return '<div class="ubar ' + (en ? 'en ' : '') + (extra || '') + '" style="left:' + cx + 'px;top:' + cy + 'px;width:' + w + 'px;height:' + h + 'px"><div class="o"></div><div class="b"><i style="width:' + (extra === 'mp' ? '100%' : fill) + '"></i></div>' + (inner || '') + '</div>'; };
    var mpBar = function (cx, cy, w) { return u.mp ? bar(cx, cy, w, 8, 'mp') : ''; };
    var nameEl = function (cls, left, top, w, h, txt) { return '<div class="uname ' + cls + '" style="left:' + (left - w / 2) + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h + 'px;line-height:' + h + 'px">' + txt + '</div>'; };
    var W = c.ubW, H = c.ubH;
    if (mode === 'now') {
      var hpY = y - d.h - 24, nb = hpY - 16 - 4, nh = Math.round(un * 1.46), nw = nameW(sp.name);
      html = bar(x, hpY, 104, 16) + mpBar(x, hpY + 15, 104) + nameEl('', x, nb - nh, 300, nh, sp.name);
      bx = { name: { x0: x - nw / 2, y0: nb - nh, x1: x + nw / 2, y1: nb }, bar: barBox(x, hpY, 104, 16), all: null };
    } else if (mode === 'plaque') {
      var top = y - d.h - 10 - H, cy = top + H / 2;
      html = bar(x, cy, W, H, '', '<div class="nm" style="font-size:' + un + 'px">' + sp.name + '</div>') + mpBar(x, top + H + 7, W);
      bx = { name: { x0: x - W / 2, y0: top, x1: x + W / 2, y1: top + H }, bar: barBox(x, cy, W, H) };
    } else if (mode === 'below') {
      var by = y - d.h - 24, nh2 = Math.round(un * 1.46);
      html = bar(x, by, W, H) + mpBar(x, by + H / 2 + 8, W) + nameEl('', x, y + 4, 300, nh2, sp.name);
      bx = { name: { x0: x - nameW(sp.name) / 2, y0: y + 4, x1: x + nameW(sp.name) / 2, y1: y + 4 + nh2 }, bar: barBox(x, by, W, H) };
    } else { // tight: bar first, name hugging the head, line box = font size
      var nb3 = y - d.h - 3, nt = nb3 - un, mpH = u.mp ? 11 : 0, by3 = nt - mpH - 3 - H / 2;
      html = bar(x, by3, W, H) + mpBar(x, nt - 8, W) + nameEl('', x, nt, 300, un, sp.name);
      bx = { name: { x0: x - nameW(sp.name) / 2, y0: nt, x1: x + nameW(sp.name) / 2, y1: nb3 }, bar: barBox(x, by3, W, H) };
    }
    return { html: html, box: bx, d: d };
  }

  /* ---------------------------------------------------------------------------------------------------------------------------------
     HUD pieces */
  var chipH = function (kind, num, c, low) {
    var ico = kind === 'mp' ? I('st-mp') : kind === 'cd' ? I('ui-cooldown') : I('ui-rage');
    var word = (kind === 'rage' && c.f.words && !c.ph) ? '<span>Rage&nbsp;</span>' : '';
    return '<span class="bp-chip ' + (kind === 'rage' ? 'rage ' : '') + (low ? 'low' : '') + '"><img class="ico" src="' + ico + '" alt="">' + word + '<b>' + num + '</b></span>';
  };
  function plate(p, c) {
    var tag = '';
    if (c.f.tags && (p.k === 'pas' || p.ult)) tag = '<span class="bp-tag"><span class="tag-f">' + (p.k === 'pas' ? 'Passive' : 'Ultimate') + '</span><span class="tag-s">' + (p.k === 'pas' ? 'Pas' : 'Ult') + '</span></span>';
    var chips = p.chips ? p.chips.map(function (q) { return q.free ? '<span class="bp-chip free" style="font-size:var(--fr)">Free</span>' : chipH(q.t, q.n, c, q.low); }).join('') : '';
    var showName = c.f.plateName && (!c.ph || p.k === 'pas');
    return '<div class="bp ' + (p.k === 'pas' ? 'pas ' : '') + (p.ult ? 'ult ' : '') + (p.sel ? 'sel ' : '') + (p.off ? 'off ' : '') + (showName ? '' : 'nonm') + '" data-n="' + (p.n || 0) + '">' + tag +
      (p.n ? '<span class="bp-key">' + p.n + '</span>' : '') +
      '<div class="bp-ico"><img class="sk" src="' + p.icon + '" alt="">' + (p.lock ? '<img class="bp-lock" src="' + I('ui-lock') + '" alt="Locked">' : '') + '</div>' +
      (showName ? '<span class="bp-nm">' + esc(p.name) + '</span>' : '') +
      '<div class="bp-chips">' + chips + '</div></div>';
  }
  var PAS = { k: 'pas', name: 'Berserker', icon: I('sk-rage') };
  var SK = [
    { n: 1, name: 'Double Strike', icon: I('sk-sword'), sel: 1, chips: [{ free: 1 }] },
    { n: 2, name: 'Whirlwind', icon: I('sk-whirlwind'), chips: [{ t: 'mp', n: 8 }, { t: 'cd', n: 3 }] },
    { n: 3, name: 'Charge', icon: I('sk-charge'), off: 1, lock: 1, chips: [{ t: 'mp', n: 10 }, { t: 'cd', n: 4 }] },
    { n: 4, name: "Headsman's Blow", icon: I('sk-warcry'), ult: 1, off: 1, chips: [{ t: 'rage', n: 30, low: 1 }, { t: 'cd', n: 5 }] }
  ];

  function actorHtml(c) {
    var f = c.f, ph = c.ph, barsOut = !f.barsIn || ph;
    var hb = function (cls, ico, v, max, w) {
      var num = '<div class="nu"><img class="ico" src="' + ico + '" alt="">' + v + '<span class="of">/ ' + max + '</span></div>';
      var ico2 = (ph && f.barsIn) ? '' : '';
      return '<div class="hb ' + cls + ' ' + (barsOut ? '' : 'in') + '" style="' + (barsOut ? '' : 'height:' + c.barH + 'px') + '">' + (barsOut ? num + '<div class="bb"><i style="width:' + w + '"></i></div>' : '<div class="bb"><i style="width:' + w + '"></i></div>' + num) + '</div>';
    };
    var bars = '<div class="bars">' + hb('hp', I('st-hp'), 83, 129, '64%') + hb('mp', I('st-mp'), 68, 68, '100%') + hb('rg', I('ui-rage'), 7, 50, '14%') + '</div>';
    var STA = [['str', 'STR', 32, 1], ['dex', 'DEX', 8], ['int', 'INT', 12], ['luck', 'LCK', 14]];
    var tiles = f.tiles ? '<div class="tiles">' + STA.map(function (a) { return '<div class="tile ' + (a[3] ? 'pri' : '') + '"><img class="ico" src="' + I('st-' + a[0]) + '" alt="">' + (f.tileLabels && !ph ? '<span class="l">' + a[1] + '</span>' : '') + '<span>' + a[2] + '</span></div>'; }).join('') + '</div>' : '';
    var more = '';
    if (!ph && c.more > 0 && f.moreMode === 'text') more = '<span class="more">All stats</span>';
    if (!ph && f.moreMode === 'dot') more = '<span class="more dot" title="All stats"></span>';
    var chips = '';
    if (f.roleChips && !ph) chips = '<div class="chips"><span class="chip">Melee Bruiser</span><span class="chip hot"><img class="ico" src="' + I('st-str') + '" alt="">Strength <b>32</b> primary</span></div>';
    var nmrow;
    if (v_() === 'b' && !ph) nmrow = '<div class="nmrow"><span class="n">Warrior</span><span class="more" style="height:26px;padding:0 10px">All stats</span></div>';
    else nmrow = '<div class="nmrow"><span class="n">Warrior</span></div>';
    var aside = (tiles || more) && !(v_() === 'b') ? '<div class="aside">' + tiles + more + '</div>' : '';
    var body = '<div class="abody" style="' + (v_() === 'b' ? 'grid-template-columns:1fr' : '') + '">' + bars + aside + '</div>';
    return '<div class="actor" style="left:22px;bottom:12px"><div class="pf"><img src="' + I('av-warrior') + '" alt=""></div><div class="info" style="gap:' + (f.barsIn && !ph ? 6 : 4) + 'px">' + nmrow + chips + body + '</div></div>';
  }
  function v_() { return S.v; }

  function globsHtml(c) {
    var G = [['Rest', 'ui-rest'], ['Skip', 'ui-skip'], ['Move', 'ui-move'], ['Revive', 'br-ready', 1]];
    return '<div class="gcol">' + G.map(function (g) { return '<div class="gl ' + (g[2] ? 'off' : '') + '"><img class="ico" src="' + I(g[1]) + '" alt=""><span>' + g[0] + '</span></div>'; }).join('') + '</div>';
  }
  function valorHtml(c) {
    return '<div class="vl"><div class="brs"><span class="br"><img src="' + I('br-3') + '" alt=""></span><span class="br"><img src="' + I('br-0') + '" alt=""></span></div>' + (c.f.valorLabel && !c.ph ? '<span class="lb">Valor</span>' : '') + '</div>';
  }

  /* ---------------------------------------------------------------------------------------------------------------------------------
     Pinned sample tips (real band-tip.css). Wording approximated from data/skills.json + data/classes/warrior.json (not the engine's skill-info text). */
  function rich(t) { return esc(t).replace(/\*([^*]+)\*/g, '<span class="k">$1</span>').replace(/(\d+%?)/g, '<span class="n">$1</span>'); }
  function tip(s) {
    var medal = s.icon ? '<span class="bt-medal ' + (s.por ? 'por' : 'ico frm') + '" style="background-image:url(&quot;' + s.icon + '&quot;)"></span>' : '';
    var head = '<div class="bt-head">' + medal + '<div class="bt-ht"><div class="bt-kind">' + esc(s.kind) + '</div><div class="bt-title">' + esc(s.title) + '</div></div></div>';
    var chips = s.chips && s.chips.length ? '<div class="bt-meta">' + s.chips.map(function (q) { return '<span class="bt-chip ' + (q.tone || '') + '"' + (q.color ? ' style="color:' + q.color + '"' : '') + '>' + (q.icon ? '<img src="' + q.icon + '" alt="">' : '') + (q.num ? '<span class="n">' + esc(q.num) + '</span> ' : '') + esc(q.text) + '</span>'; }).join('') + '</div>' : '';
    var lines = (s.lines || []).map(function (l) { return '<div class="bt-ln"><span class="dia"></span><div class="tx"' + (l.c ? ' style="color:' + l.c + '"' : '') + '>' + rich(l.t || l) + '</div></div>'; }).join('');
    var body = lines ? '<div class="bt-div"></div><div class="bt-body">' + lines + '</div>' : '';
    return '<div class="bt" style="--ac:' + (s.accent || '#d9b26a') + '">' + head + chips + body + '</div>';
  }
  var TIPS = {
    a: { label: 'Pinned sample: Character sheet header (portrait / stat area click)', tip: { kind: 'Character', title: 'Warrior', icon: I('av-warrior'), por: 1, chips: [{ text: 'Melee Bruiser' }, { text: 'Strength primary', tone: 'ac', color: '#ffb98a', icon: I('st-str') }],
      lines: ['*Strength* 32 (primary)', '*Dexterity* 8', '*Intelligence* 12', '*Luck* 14'] }, at: 'actor' },
    b: { label: 'Pinned sample: Whirlwind tooltip (name now lives here)', tip: { kind: 'Skill', title: 'Whirlwind', icon: I('sk-whirlwind'), accent: '#d9b26a', chips: [{ text: 'Area · Block 3x2' }, { text: 'Melee' }, { num: '8', text: 'MP', tone: 'v', icon: I('st-mp') }, { num: '3', text: 'turns cooldown', tone: 'v', icon: I('ui-cooldown') }],
      lines: ['Deals 45% physical damage (STR) to every enemy in the area', 'Heals you for 20% of the damage dealt'] }, at: 2 },
    c: { label: 'Pinned sample: Ultimate tooltip (ULTIMATE tag now lives here)', tip: { kind: 'Ultimate', title: "Headsman's Blow", icon: I('sk-warcry'), accent: '#e0702a', chips: [{ text: 'One enemy' }, { text: 'Melee' }, { num: '30', text: 'Rage', tone: 'v', icon: I('ui-rage'), color: '#ffb070' }, { num: '5', text: 'turns cooldown', tone: 'v', icon: I('ui-cooldown') }],
      lines: ['Spends all Rage on one execution strike', 'Deals 50% physical damage (STR), plus more for every Rage spent', { t: 'Not enough Rage (7 / 30)', c: '#ff9a7a' }] }, at: 4 }
  };

  /* ---------------------------------------------------------------------------------------------------------------------------------
     Build the whole stage */
  function build() {
    var ph = S.z === 'ph', W = SIZES[S.z].w, v = S.v, c = resolve(v, ph), r = c.r, f = c.f;
    var offX = (W - 1920) / 2;
    var st = $('#stage');
    st.style.width = W + 'px';
    st.className = ph ? 'ph' : '';
    var sty = [], set = function (k, val) { sty.push('--' + k + ':' + val + 'px'); };
    ['nm', 'num', 'of', 'numIco', 'stv', 'stl', 'tileH', 'tileIco', 'more', 'rc', 'pn', 'pw', 'pc', 'chipH', 'chipIco', 'tag', 'key', 'gl', 'cl', 'vl', 'tl', 'cdv', 'un', 'fr', 'pfW', 'pfH', 'infoW', 'barH', 'plW', 'plH', 'padT', 'plGap', 'ico', 'glH', 'glW', 'glIco', 'glGap', 'clH', 'clW', 'clSq', 'clIco', 'vlh', 'moreH'].forEach(function (k) { set(k, Math.round(c[k] * 100) / 100); });
    sty.push('--glTxt:' + (c.glTxt ? 'block' : 'none'));
    sty.push('--r:' + r);
    sty.push('--tipU:' + (ph ? 1.6 : 1) + 'px', '--pinLbl:' + (ph ? 7 * r : 13) + 'px');
    st.setAttribute('style', sty.join(';') + ';width:' + W + 'px');

    // background: cover + floor line (Ravenwood floor 0.602; target ~715) like backgroundPlacement()
    var iw = 1536, ih = 1024, sc = Math.max(W / iw, 1080 / ih), h = ih * sc, cy = Math.min(h / 2, Math.max(1080 - h / 2, 715 - (0.602 - 0.5) * h));
    var scene = '<img id="bg" src="' + I('bg') + '" alt="" style="width:' + iw * sc + 'px;height:' + h + 'px;left:' + (W - iw * sc) / 2 + 'px;top:' + (cy - h / 2) + 'px">';
    var boxesHtml = '', over = '', labels = '', prev = null, boxes = [];
    UNITS.forEach(function (u, i) {
      var d = dims(u), sp = SPR[u.s], x = u.x + offX;
      scene += '<div class="shadow" style="left:' + (x - d.w * 0.4) + 'px;top:' + (u.y - 6 - 12) + 'px;width:' + d.w * 0.8 + 'px;height:24px"></div>';
      if (i === 0) scene += '<div class="ring" style="left:' + (x - 66) + 'px;top:' + (u.y - 6 - 13) + 'px;width:132px;height:26px"></div>';
      scene += '<img class="sp" src="' + I(sp.img) + '" alt="" style="left:' + (x - d.w / 2) + 'px;top:' + (u.y - d.h) + 'px;width:' + d.w + 'px;height:' + d.h + 'px;' + (sp.flip ? 'transform:scaleX(-1)' : '') + '">';
    });
    UNITS.forEach(function (u, i) {
      var L = unitLabel(u, c, offX);
      labels += L.html;
      boxes.push(L.box);
      if (S.boxes) { var b = L.box; boxesHtml += '<div class="dbox" style="left:' + b.name.x0 + 'px;top:' + b.name.y0 + 'px;width:' + (b.name.x1 - b.name.x0) + 'px;height:' + (b.name.y1 - b.name.y0) + 'px"></div><div class="dbox" style="left:' + b.bar.x0 + 'px;top:' + b.bar.y0 + 'px;width:' + (b.bar.x1 - b.bar.x0) + 'px;height:' + (b.bar.y1 - b.bar.y0) + 'px;outline-color:rgba(255,220,120,.8)"></div>'; }
    });
    // overlap detector: any unit's NAME box vs any OTHER unit's bar box (the bug today)
    var firstOver = null;
    for (var i = 0; i < boxes.length; i++) for (var j = 0; j < boxes.length; j++) {
      if (i === j) continue;
      var n = boxes[i].name, b2 = boxes[j].bar;
      var x0 = Math.max(n.x0, b2.x0), x1 = Math.min(n.x1, b2.x1), y0 = Math.max(n.y0, b2.y0), y1 = Math.min(n.y1, b2.y1);
      if (x1 > x0 && y1 > y0) { over += '<div class="fail" style="left:' + x0 + 'px;top:' + y0 + 'px;width:' + (x1 - x0) + 'px;height:' + (y1 - y0) + 'px"></div>'; if (!firstOver) firstOver = { x: (x0 + x1) / 2, y: y0, h: Math.round(y1 - y0), w: Math.round(x1 - x0) }; }
    }
    S.overlap = firstOver;
    if (v === 'now' && firstOver) over += '<div class="fail-t" style="left:' + firstOver.x + 'px;top:' + (firstOver.y - 30) + 'px">name box over another unit\'s HP bar</div>';

    // ---- HUD layout (mirrors BattleHud.place) ----
    var PW = c.plW, PG = 8, SKW = 4 * PW + 3 * PG, sx = W / 2 - SKW / 2;
    var gSk = ph ? 12 : 22, gGl = ph ? 10 : 20, EDGE = 28;
    var globW = ph ? 4 * 122 + 3 * 10 : Math.max(150, c.glW);
    var valW = ph ? 2 * c.vlh * 1.055 + c.vlh * 0.08 : 2 * c.vlh * 1.055 + c.vlh * 0.08 + 34;
    var actorR = 22 + c.pfW + 16 + c.infoW;
    var plTop = c.plTop, plH = c.plH, clW = ph ? (f.clogSquare ? c.clSq : c.clIco + 14) : c.clW;
    var rightOf = function (x) { return x + SKW + gSk + globW + gGl + valW + 24 + clW + EDGE; };
    if (ph) {
      var need = rightOf(sx) - W;
      if (need > 0) { var room = Math.max(0, sx - (PW + PG) - (actorR + 20)); sx -= Math.min(need, room); }
    }
    var pasX = sx - (PW + PG), gx = sx + SKW + gSk, vx = gx + globW + gGl, rx = vx + valW + (ph ? 12 : 24);
    var hud = '';
    // queue + label
    var cells = [{ s: 'wolf', st: 'past' }, { s: 'warrior', st: 'now' }, { s: 'wolf', st: 'next' }, { s: 'wolf', st: 'next' }, { s: 'warrior', st: 'next' }];
    var qx = W / 2 - 92 / 2 - 1 * (70 + 10);
    hud += '<div class="queue" style="left:' + qx + 'px">' + cells.map(function (q) { var sp = SPR[q.s]; return '<div class="cell ' + (sp.side === 'enemy' ? 'enemy ' : '') + q.st + '"><img src="' + I(q.s === 'wolf' ? 'av-wolf' : 'av-warrior') + '" alt="" style="' + (sp.flip ? 'transform:scaleX(-1)' : '') + '"></div>'; }).join('') + '</div>';
    hud += '<div class="tlbl" style="left:' + W / 2 + 'px"><i class="dia s"></i>Your turn<i class="dia s"></i></div>';
    hud += '<div class="band"><i class="dia"></i></div>';
    hud += actorHtml(c);
    hud += '<div class="skills" style="left:' + pasX + 'px;top:' + plTop + 'px">' + plate(PAS, c) + '</div>';
    hud += '<div class="skills" style="left:' + sx + 'px;top:' + plTop + 'px">' + SK.map(function (p) { return plate(p, c); }).join('') + '</div>';
    var gTop = plTop + (plH - (ph ? 122 : c.glH)) / 2;
    hud += '<div class="globs" style="left:' + gx + 'px;top:' + gTop + 'px">' + globsHtml(c) + '</div>';
    // valor
    var vTop = ph ? 914 : plTop + (plH - 101) / 2;
    hud += '<div class="valor" style="left:' + vx + 'px;top:' + vTop + 'px">' + valorHtml(c) + '</div>';
    // combat log
    var clog = '<span class="clog"><img class="ico" src="' + I('ui-combatLog') + '" alt="">' + (ph ? '<span></span>' : '<span>Combat log</span>') + '</span>';
    if (ph && !f.clogSquare) hud += '<div style="left:' + vx + 'px;top:1000px;width:' + 144 + 'px;display:flex;justify-content:center"><img class="ico" src="' + I('ui-combatLog') + '" alt="" style="width:' + c.clIco + 'px;height:' + c.clIco + 'px"></div>';
    else if (ph) hud += '<div style="left:' + rx + 'px;top:' + (plTop + (plH - c.clSq) / 2) + 'px">' + clog + '</div>';
    else hud += '<div style="left:' + rx + 'px;top:' + (plTop + (plH - c.clH) / 2) + 'px">' + clog + '</div>';

    // pinned tip
    var pin = '';
    var P = TIPS[v];
    if (P && !S.nopin) {
      var left, bottom = 1080 - (plTop - 16);
      if (P.at === 'actor') { left = 22; bottom = 1080 - 905; }
      else left = sx + (P.at - 1) * (PW + PG) - (P.at === 4 ? 160 : 0);
      pin = '<div class="pin" style="left:' + left + 'px;bottom:' + bottom + 'px"><div class="pin-lbl">' + esc(P.label) + '</div>' + tip(P.tip) + '</div>';
    }
    st.innerHTML = scene + labels + boxesHtml + over + '<div id="hud" style="width:' + W + 'px">' + hud + '</div>' + pin;
    fit();
  }

  function fit() {
    var ph = S.z === 'ph', W = SIZES[S.z].w, st = $('#stage'), fr = $('#frame');
    var avW = window.innerWidth, avH = window.innerHeight - ($('#bar').offsetHeight || 0) - ($('#legend').offsetHeight || 0) - 4;
    if (S.clean) avH = window.innerHeight;
    var s = S.x ? (ph ? PH_SCALE : 1) : Math.min(avW / W, avH / 1080);
    if (!S.x && ph) s = Math.min(avW / W, avH / 1080);
    st.style.transform = 'scale(' + s + ')';
    fr.style.width = W * s + 'px'; fr.style.height = 1080 * s + 'px';
    S.shown = s;
    var real = ph ? PH_SCALE : 1;
    $('#legend').innerHTML = '<b>' + NAMES[S.v] + '</b> · ' + SIZES[S.z].l + ' · shown at ' + Math.round(s / real * 100) + '% of real size. Sizes in the notes are real pixels (1920 wide; phone 844x390). ' + (S.v === 'now' ? 'Red box = name box over another unit\'s HP bar (computed from combatant-view.ts geometry).' : 'Pinned tip = sample of where the removed text now lives.');
  }

  /* ---------------------------------------------------------------------------------------------------------------------------------
     Bar + hash */
  function bar() {
    var b = $('#bar');
    b.innerHTML = '<span class="lbl">View</span>' + VARS.map(function (v) { return '<button data-v="' + v + '" class="' + (S.v === v ? 'on' : '') + '">' + NAMES[v] + (v === 'a' ? '<span class="rec">recommended</span>' : '') + '</button>'; }).join('') +
      '<span class="sep"></span><span class="lbl">Size</span>' + Object.keys(SIZES).map(function (z) { return '<button data-z="' + z + '" class="' + (S.z === z ? 'on' : '') + '">' + SIZES[z].l + '</button>'; }).join('') +
      '<span class="sep"></span><span class="lbl">Zoom</span><button data-x="0" class="' + (!S.x ? 'on' : '') + '">Fit</button><button data-x="1" class="' + (S.x ? 'on' : '') + '">100%</button>' +
      '<span class="sep"></span><button data-b="1" class="' + (S.boxes ? 'on' : '') + '">Boxes</button>';
  }
  function hash() { return '#' + S.v + '&z=' + S.z + (S.x ? '&x=1' : '') + (S.clean ? '&clean' : '') + (S.boxes ? '&boxes' : '') + (S.nopin ? '&nopin' : ''); }
  function readHash() {
    var p = location.hash.slice(1).split('&');
    p.forEach(function (q) {
      var kv = q.split('='), k = kv[0], val = kv[1];
      if (VARS.indexOf(k) >= 0) S.v = k;
      else if (k === 'z' && SIZES[val]) S.z = val;
      else if (k === 'x') S.x = val === '1';
      else if (k === 'clean') S.clean = true;
      else if (k === 'boxes') S.boxes = true;
      else if (k === 'nopin') S.nopin = true;
    });
  }
  function render() { document.body.classList.toggle('clean', S.clean); history.replaceState(null, '', hash()); bar(); build(); notes(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('#bar button'); if (!b) return;
    if (b.dataset.v) S.v = b.dataset.v; else if (b.dataset.z) S.z = b.dataset.z; else if (b.dataset.x) S.x = b.dataset.x === '1'; else if (b.dataset.b) S.boxes = !S.boxes;
    render();
  });
  window.addEventListener('hashchange', function () { readHash(); render(); });
  window.addEventListener('resize', fit);
  window.__sim = { T: T, TEXT: TEXT, PH_SCALE: PH_SCALE, S: S, resolve: resolve, render: render, readHash: readHash, esc: esc };
  window.__simInit = function () { readHash(); render(); };
  window.__notesHook = null;
  function notes() { if (window.__notesHook) window.__notesHook(); }
  if (window.__simAuto !== false) window.__simInit();
})();
