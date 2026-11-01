/* Codex tooltip mockup (oyun kodu degil). Metinler: src/wiki/view.ts (title= metinleri), data/statuses.json, grounds.json, items.json, skill-chips.ts. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var I = function (n) { return 'codex-tips/i/' + n + '.webp'; };

  /* ---------- A Band (src/ui/band-tip.ts sadelestirilmis kopyasi; ayni sinif adlari) ---------- */
  function rich(t) { return esc(t).replace(/\*([^*]+)\*/g, '<span class="k">$1</span>').replace(/(\d+%?)/g, '<span class="n">$1</span>'); }
  function gridHtml(g) {
    var cells = '';
    for (var r = 0; r < g.rows; r++) for (var c = 0; c < g.cols; c++) cells += '<i class="on' + (r === g.rows - 1 && c === 0 ? ' an' : '') + '"></i>';
    return '<span class="bt-grid" style="grid-template-columns:repeat(' + g.cols + ',auto)">' + cells + '</span>';
  }
  function bandTip(s) {
    var medal = s.icon ? '<span class="bt-medal ico frm" style="background-image:url(&quot;' + s.icon + '&quot;)"></span>' : '';
    var aside = (s.grid ? gridHtml(s.grid) : '') + (s.value ? '<div class="bt-big">' + esc(s.value) + (s.valueLabel ? '<small>' + esc(s.valueLabel) + '</small>' : '') + '</div>' : '');
    var head = '<div class="bt-head">' + medal + '<div class="bt-ht">' + (s.kind ? '<div class="bt-kind">' + esc(s.kind) + '</div>' : '') + '<div class="bt-title">' + esc(s.title) + '</div>' +
      (s.sub ? '<div class="bt-sub"><span class="pl">' + esc(s.sub.split(':')[0]) + ':</span> ' + rich(s.sub.split(':').slice(1).join(':').trim()) + '</div>' : '') + '</div>' + (aside ? '<div class="bt-aside">' + aside + '</div>' : '') + '</div>';
    var chips = (s.chips && s.chips.length) ? '<div class="bt-meta">' + s.chips.map(function (c) {
      return '<span class="bt-chip' + (c.tone ? ' ' + c.tone : '') + '"' + (c.color ? ' style="color:' + c.color + '"' : '') + '>' + (c.icon ? '<img src="' + c.icon + '" alt="">' : '') + (c.num ? '<span class="n">' + esc(c.num) + '</span> ' : '') + esc(c.text) + '</span>';
    }).join('') + '</div>' : '';
    var lines = (s.lines || []).map(function (l) {
      if (l.sec) return '<div class="bt-sec"><span>' + esc(l.sec) + '</span></div>';
      return '<div class="bt-ln"><span class="dia"></span><div class="tx">' + rich(l) + '</div></div>';
    }).join('');
    var body = lines ? '<div class="bt-div"></div><div class="bt-body">' + lines + '</div>' : '';
    var foot = s.foot ? '<div class="bt-foot"><span class="dia"></span><span class="tx">' + esc(s.foot) + '</span></div>' : '';
    return '<div class="bt" style="--ac:' + (s.accent || '#d9b26a') + '">' + head + chips + body + foot + '</div>';
  }

  /* ---------- veri ---------- */
  var RANGE_TEXT = 'Melee: reaches the front rows only. Ranged: reaches anyone. Support: targets an ally. Self: only the caster.';
  var ST = {
    chilled: { name: 'Chilled', color: '#9fe3ff', icon: 'st-chilled', text: '20% less Speed and 10% less Evasion', by: 'Ice Crater', turns: 2 }
  };
  var GR = {
    burning: { name: 'Burning Ground', color: '#ff7a1a', icon: 'gr-burning', el: 'Fire', elIcon: 'el-fire', text: 'Leaves Burning Ground on the area. Enemies standing there are Burning while they stay inside (takes fire damage at the start of each of its turns).', by: 'Meteor' }
  };
  var ATTR = { str: ['Strength', 20], int: ['Intelligence', 26], dex: ['Dexterity', 6], luck: ['Luck', 8] };
  var RAR = [
    { id: 'common', name: 'Common', color: '#8a8a84', tiers: ['C'] },
    { id: 'uncommon', name: 'Uncommon', color: '#5f8f3e', tiers: ['C', 'C'] },
    { id: 'rare', name: 'Rare', color: '#3f6fa8', tiers: ['C', 'C', 'B'] },
    { id: 'epic', name: 'Epic', color: '#7a3f9a', tiers: ['C', 'C', 'B', 'A'] },
    { id: 'legendary', name: 'Legendary', color: '#f0a830', tiers: ['C', 'C', 'B', 'A'], effect: true }
  ];
  var SKILLS = [
    { n: '1. Fire Bolt', ico: 'sk-fireball', el: 'fire', target: ['Single Target', 'One enemy'], mp: 4, cd: null, lines: ['Deals 100% fire damage (INT)'], apply: [] },
    { n: '2. Blizzard', ico: 'sk-blizzard', el: 'ice', target: ['AoE · Block 3x2', 'Area'], grid: { cols: 2, rows: 3 }, mp: 14, cd: 2, lines: ['Deals 81% ice damage (INT) to every enemy in the area'], apply: [] },
    { n: '3. Ice Crater', ico: 'sk-icecrater', el: 'ice', target: ['Single Target', 'One enemy'], mp: 10, cd: 3, lines: ['Deals 85% ice damage (INT)', 'Applies Chilled for 2 turns'], apply: ['st:chilled'] },
    { n: '4. Meteor', ico: 'sk-meteor', el: 'fire', target: ['AoE · Block 2x3', 'Area'], grid: { cols: 3, rows: 2 }, mp: 20, cd: 3, lines: ['Deals 63% fire damage (INT) to every enemy in the area', 'Leaves Burning Ground for 2 turns'], apply: ['gr:burning'] }
  ];
  var EL = { fire: '#ff7a1a', ice: '#8fd8ff' };

  /* ---------- ipucu kaydi (anahtar -> A Band ozelligi). V = varyant ---------- */
  function tipFor(key, V) {
    var p = key.split(':'), k = p[0], a = p[1];
    if (k === 'range') return { accent: '#e8e2d0', icon: I('ui-range'), kind: 'Skill range', title: 'Ranged', lines: ['*Ranged:* reaches anyone.', { sec: 'Other ranges' }, 'Melee: reaches the front rows only.', 'Support: targets an ally.', 'Self: only the caster.'] };
    if (k === 'target') { var s = SKILLS[+a]; return { accent: '#d9b26a', icon: I('ui-range'), kind: 'Skill target', title: s.target[0].split(' · ')[0], grid: s.grid || null, lines: [s.target[1] + (s.grid ? '. Hits the shape shown, anchored at the front.' : '')] }; }
    if (k === 'reach') { var s2 = SKILLS[+a]; return { accent: '#d9b26a', icon: I('ui-range'), kind: 'Skill reach', title: 'Ranged · ' + s2.target[0].split(' · ')[0], grid: s2.grid || null, lines: ['*Ranged:* reaches anyone.', '*Target:* ' + s2.target[1], { sec: 'Other ranges' }, 'Melee: reaches the front rows only.', 'Support: targets an ally.', 'Self: only the caster.'] }; }
    if (k === 'qrange') return { accent: '#e8e2d0', icon: I('ui-range'), kind: 'Skill', title: 'Range 6' };
    if (k === 'qcost') return { accent: '#4aa3e8', icon: I('stat-mp'), kind: 'Skill', title: 'Costs ' + a + ' MP' };
    if (k === 'qcd') return { accent: '#e8e2d0', icon: I('ui-cooldown'), kind: 'Skill', title: 'Cooldown: ' + a + ' turns' };
    if (k === 'st') { var t = ST[a]; var o = { accent: t.color, icon: I(t.icon), kind: 'Status · Debuff', title: t.name, lines: [t.text] }; if (V === 'c') o.chips = [{ text: 'from ' + t.by, tone: 'ac' }, { text: t.turns + ' turns', tone: 'v' }]; return o; }
    if (k === 'gr') { var g = GR[a]; var o2 = { accent: g.color, icon: I(g.icon), kind: 'Ground', title: g.name, lines: [g.text], chips: [{ text: g.el, icon: I(g.elIcon), tone: 'ac' }] }; if (V === 'c') o2.chips.push({ text: 'from ' + g.by, tone: 'ac' }); return o2; }
    if (k === 'attr') { var at = ATTR[a], prim = a === 'int'; return { accent: prim ? '#ffd76a' : '#d9b26a', icon: I('stat-' + a), kind: prim ? 'Attribute · Primary' : 'Attribute', title: at[0], value: String(at[1]), sub: prim ? "Primary: Mana Echo - 20% chance to get back half of a skill's MP cost" : null, lines: prim ? [] : ["The Mage's primary stat is Intelligence"] }; }
    if (k === 'rar') { var r = RAR[+a]; return { accent: r.color, kind: 'Rarity', title: r.name, value: String(r.tiers.length), valueLabel: r.tiers.length === 1 ? 'affix' : 'affixes', lines: ['Affix tiers: *' + r.tiers.join(', ') + '*'].concat(r.effect ? ['Also carries a unique effect'] : []) }; }
    return { title: key };
  }

  /* ---------- makale HTML ---------- */
  var S = { art: 'mage', v: 'a', size: '16:9', pin: null };
  function tagAttrs(key, nowTitle, nowTip) { // yeni: data-bt; eski: title= (ya da .q icin data-tip + ::after)
    if (S.v === 'now') return nowTip ? ' data-tip="' + esc(nowTip) + '" tabindex="0"' : ' title="' + esc(nowTitle) + '"';
    return ' data-bt="' + key + '" tabindex="0" aria-label="' + esc(nowTitle || nowTip) + '"';
  }
  function qchip(ico, num, key, tip) { return '<span class="cx-tag q"' + tagAttrs(key, '', tip) + '><img class="cx-ico q" src="' + I(ico) + '" alt=""><b>' + num + '</b></span>'; }

  function skillHtml(s, i) {
    var meta = '';
    if (S.v === 'c') meta += '<span class="cx-tag strong"' + tagAttrs('reach:' + i, RANGE_TEXT + ' ' + s.target[1]) + '>Ranged · ' + s.target[0] + '</span>';
    else meta += '<span class="cx-tag"' + tagAttrs('range', RANGE_TEXT) + '>Ranged</span><span class="cx-tag strong"' + tagAttrs('target:' + i, s.target[1]) + '>' + s.target[0] + '</span>';
    meta += qchip('ui-range', '6', 'qrange', 'Range 6') + qchip('stat-mp', s.mp, 'qcost:' + s.mp, 'Costs ' + s.mp + ' MP');
    if (s.cd) meta += qchip('ui-cooldown', s.cd, 'qcd:' + s.cd, 'Cooldown: ' + s.cd + ' turns');
    var applies = s.apply.map(refHtml).join('');
    return '<div class="cx-skill"><img class="cx-ico big" src="' + I(s.ico) + '" alt=""><div class="cx-skill-body"><div class="cx-skill-name"><button class="cx-skill-link" type="button"><b>' + s.n + '</b></button><span class="cx-eltag" style="--c:' + EL[s.el] + '">' + s.el + '</span></div>' +
      '<div class="cx-meta">' + meta + '</div><ul class="cx-lines">' + s.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' + (applies ? '<div class="cx-applies"><span class="cx-label">Applies</span>' + applies + '</div>' : '') + '</div></div>';
  }
  function refHtml(r) {
    var p = r.split(':'), d = p[0] === 'st' ? ST[p[1]] : GR[p[1]];
    var ic = I(d.icon), text = p[0] === 'st' ? d.text : d.text;
    return '<button class="cx-ref" type="button" style="--c:' + d.color + '"' + tagAttrs(r, text, null) + '><img class="cx-ico small" src="' + ic + '" alt=""><span>' + d.name + '</span></button>';
  }
  function mageHtml() {
    var attrs = ['str', 'int', 'dex', 'luck'].map(function (a) {
      var prim = a === 'int', at = ATTR[a];
      return '<div class="cx-attr' + (prim ? ' primary' : '') + '"' + tagAttrs('attr:' + a, at[0] + ' ' + at[1] + (prim ? ' (primary)' : '')) + '><img class="cx-ico small" src="' + I('stat-' + a) + '" alt=""><small>' + a.toUpperCase() + '</small><b>' + at[1] + '</b></div>';
    }).join('');
    var head = '<header class="cx-ahead"><span class="cx-portrait cx-bigportrait from-avatar" style="--g:#3d7be0"><img src="' + I('av-mage') + '" alt=""></span><div class="cx-ahead-text"><h1>Mage</h1><div class="cx-role">Elemental Mage · <span class="cx-pri" style="color:#ffd76a">INT</span><span class="cx-headtags"><img class="cx-ico small" src="' + I('class-mage') + '" alt=""><span class="cx-tag">Ranged</span></span></div></div></header>';
    var left = head + '<div class="cx-attrs">' + attrs + '</div>' +
      '<div class="cx-bonus"><img class="cx-ico small" src="' + I('stat-int') + '" alt=""><div><b>Mana Echo</b><span class="cx-dim"> 20% refund half MP</span><div class="cx-note">After each skill, 20% chance to get back half of its MP cost (rounded up, at least 1).</div></div></div>' +
      '<h3 class="cx-h3">Passive</h3><div class="cx-passive"><img class="cx-ico big" src="' + I('sk-heatmirage') + '" alt=""><div><b>Heat Mirage</b><div class="cx-note">When an enemy hits the Mage in melee, Burning Ground appears under it for 1 turn (once per round). The Mage takes 10% less Fire and Ice damage.</div><div class="cx-applies">' + refHtml('gr:burning') + '</div></div></div>';
    var right = '<h3 class="cx-h3">Skills</h3><div class="cm-skills">' + SKILLS.map(skillHtml).join('') + '</div>';
    if (S.size === 'phone') return '<div class="cx-art cx-unit"><div class="cm-split"><div>' + left + '</div><div>' + right + '</div></div></div>';
    return '<div class="cx-art cx-unit">' + left + right + '</div>';
  }
  function itemsHtml() {
    var rar = RAR.map(function (r, i) {
      return '<div class="cx-rarity" style="--c:' + r.color + '"' + tagAttrs('rar:' + i, r.name + ' · ' + r.tiers.length + (r.tiers.length === 1 ? ' affix' : ' affixes')) + '><span class="cx-slotbox"><svg class="cx-slot-svg" viewBox="0 0 24 24"><path d="M12 2 22 12 12 22 2 12Z" fill="none" stroke="' + r.color + '" stroke-width="2"/><path d="M12 7 17 12 12 17 7 12Z" fill="' + r.color + '" opacity=".6"/></svg></span><span>' + r.name + '</span></div>';
    }).join('');
    return '<div class="cx-art"><header class="cx-ahead"><img class="cx-ico head" src="' + I('ui-bag') + '" alt=""><div class="cx-ahead-text"><h1>Items and gear</h1><div class="cx-role">Rules</div></div></header>' +
      '<p>Every item has a rarity. Rarity is the number of affixes the item carries; the colors below match the names on item cards.</p><h3 class="cx-h3">Rarity</h3><div class="cx-rarities">' + rar + '</div></div>';
  }

  /* ---------- kabuk ---------- */
  var NAV = ['Getting Started', 'Mechanics', 'Classes', 'Skills', 'Statuses & Grounds', 'Elements', 'Items and gear', 'Bosses'];
  function shell() {
    var cur = S.art === 'mage' ? 'Classes' : 'Items and gear';
    var nav = NAV.map(function (n) { return '<button class="cx-navrow' + (n === cur ? ' on' : '') + '" type="button"><span class="cx-navtitle">' + n + '</span></button>'; }).join('');
    var list = ['Warrior', 'Defender', 'Archer', 'Mage', 'Paladin', 'Hexer'].map(function (n) { return '<button class="cx-row' + (n === 'Mage' && S.art === 'mage' ? ' on' : '') + '" type="button"><b>' + n + '</b><small></small></button>'; }).join('');
    var tabs = NAV.map(function (n) { return '<button' + (n === cur ? ' class="on"' : '') + '>' + n + '</button>'; }).join('');
    return '<div class="cm' + (S.size === '21:9' ? ' wide' : '') + '"><div class="cm-top"><span class="cm-back">&lsaquo;</span><span class="cm-title">Codex</span><div class="cm-tabs">' + tabs + '</div></div>' +
      '<div class="cm-body"><div class="cm-side"><div class="cx-nav">' + nav + '</div></div><div class="cm-list">' + (S.art === 'mage' ? list : '') + '</div><div class="cm-art" id="cm-art">' + (S.art === 'mage' ? mageHtml() : itemsHtml()) + '</div></div></div>';
  }

  /* ---------- ipucu motoru ---------- */
  var stage = $('#mk-stage'), tipEl = null;
  var SIZES = { '16:9': [1920, 1080], '21:9': [2580, 1080], phone: [844, 390] };
  var NOTES = {
    now: '<b>Mevcut:</b> menzil, hedef, durum, zemin, nitelik ve nadirlik yalnızca yerel title= balonunda (dokunmatikte hiç görünmez); sayı çipleri ise kendi küçük ::after kutusunda.',
    a: '<b>A Yüzen band:</b> aynı bilgi, her etikette A Band ipucu, etiketin üstünde açılır; dokunma sabitler, boşluğa dokunma kapatır. Etiket metinleri değişmedi, dokunma hedefi telefonda 44 px.',
    b: '<b>B Sabit şerit:</b> ipucu etiketin üstünde süzülmez, sahnenin altında tek yerde açılır (parmak örtmez, kısa ekranda kesilmez); masaüstünde de aynı yer.',
    c: '<b>C Birleşik künye:</b> menzil + hedef tek "Ranged · Single Target" etiketinde, tek ipucunda (alan şekli dahil); durum/zemin ipucu kaynak skill ve süre çipi taşır. İki etiket yerine bir.'
  };
  function bar() {
    var b = $('#mk-bar');
    function btn(k, l, on) { return '<button data-k="' + k + '"' + (on ? ' class="on"' : '') + '>' + l + '</button>'; }
    b.innerHTML = btn('art:mage', 'Class: Mage', S.art === 'mage') + btn('art:items', 'Rules: Items', S.art === 'items') + '<span class="sep"></span>' +
      btn('v:now', 'Now', S.v === 'now') + btn('v:a', 'A Float', S.v === 'a') + btn('v:b', 'B Dock', S.v === 'b') + btn('v:c', 'C Merged', S.v === 'c') + '<span class="sep"></span>' +
      btn('sz:16:9', '16:9', S.size === '16:9') + btn('sz:21:9', '21:9', S.size === '21:9') + btn('sz:phone', 'Phone 844x390', S.size === 'phone');
    $('#mk-note').innerHTML = NOTES[S.v];
  }
  function fit() {
    var d = SIZES[S.size], W = d[0], H = d[1], vw = innerWidth, vh = innerHeight - 86;
    var sc = Math.min(vw / W, vh / H); if (S.size === 'phone') sc = Math.min(sc, 1);
    stage.style.width = W + 'px'; stage.style.height = H + 'px'; stage.style.setProperty('--u', (H / 1080) + 'px'); var small = innerHeight < 520; document.documentElement.classList.toggle('small', small); if (small) { sc = Math.min(1, innerWidth / W); $('#mk-view').style.setProperty('--vh', Math.ceil(H * sc) + 'px'); } stage.style.transform = 'scale(' + sc + ')'; stage._sc = sc;
    document.documentElement.classList.toggle('short', S.size === 'phone');
  }
  function ensureTip() { if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'cm-tipwrap'; stage.appendChild(tipEl); } return tipEl; }
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }
  function showTip(el) {
    var t = ensureTip(); t.innerHTML = bandTip(tipFor(el.getAttribute('data-bt'), S.v));
    t.className = 'cm-tipwrap' + (S.v === 'b' ? ' dock' : '');
    var sc = stage._sc || 1, sr = stage.getBoundingClientRect(), br = el.getBoundingClientRect(), W = parseFloat(stage.style.width), H = parseFloat(stage.style.height);
    t.style.left = '0px'; t.style.top = '0px';
    var tw = t.offsetWidth, th = t.offsetHeight, x, y;
    if (S.v === 'b') { x = W / 2; y = H - th - (S.size === 'phone' ? 6 : 20); t.style.left = x + 'px'; t.style.top = y + 'px'; }
    else {
      var bx = (br.left - sr.left) / sc, by = (br.top - sr.top) / sc, bw = br.width / sc, bh = br.height / sc;
      x = Math.min(Math.max(6, bx + bw / 2 - tw / 2), W - tw - 6); y = by - th - 10; if (y < 4) y = by + bh + 10;
      t.style.left = x + 'px'; t.style.top = Math.max(4, Math.min(y, H - th - 4)) + 'px';
    }
    requestAnimationFrame(function () { t.classList.add('show'); });
  }
  function clearPin() { S.pin = null; stage.querySelectorAll('.pin').forEach(function (e) { e.classList.remove('pin'); }); hideTip(); }
  function wire() {
    stage.querySelectorAll('[data-bt]').forEach(function (b) {
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !S.pin) showTip(b); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !S.pin) hideTip(); });
      b.addEventListener('focus', function () { if (!S.pin) showTip(b); });
      b.addEventListener('blur', function () { if (!S.pin) hideTip(); });
      b.addEventListener('click', function (e) { e.stopPropagation(); var was = S.pin === b; clearPin(); if (!was) { S.pin = b; b.classList.add('pin'); showTip(b); } });
    });
    stage.addEventListener('click', function (e) { if (!e.target.closest('[data-bt]')) clearPin(); });
    var art = $('#cm-art'); if (art) art.addEventListener('scroll', function () { if (S.pin) showTip(S.pin); else hideTip(); });
  }
  function render() {
    bar(); fit(); tipEl = null; S.pin = null;
    stage.innerHTML = '<span class="size-tag">' + (S.size === 'phone' ? '844x390 (html.short)' : S.size) + '</span>' + shell();
    if (S.v !== 'now') wire();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('#mk-bar button'); if (!b) return;
    var p = b.getAttribute('data-k').split(':'), k = p[0], v = p.slice(1).join(':');
    if (k === 'art') S.art = v; else if (k === 'v') S.v = v; else if (k === 'sz') S.size = v;
    render();
  });
  addEventListener('resize', fit);
  var h = (location.hash || '').replace('#', '');
  if (/^(now|a|b|c)(&|$)/.test(h)) S.v = h.split('&')[0];
  var sz = /size=(16:9|21:9|phone)/.exec(location.search + location.hash); if (sz) S.size = sz[1];
  if (/items/.test(location.hash)) S.art = 'items';
  if (/clean/.test(location.hash)) document.documentElement.classList.add('clean');
  render();
})();
