/* Endless team pick + reward cards mockup (oyun kodu degil). Veri: data/classes, formation-hints.ts metinleri, ui-text.ts. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- A Band ipucu (src/ui/band-tip.ts > bandTipHtml sadelestirilmis kopyasi; ayni sinif adlari) ---------- */
  function rich(t) {
    // *kelime* = anahtar (vurgu rengi), sayilar altin
    return esc(t).replace(/\*([^*]+)\*/g, '<span class="k">$1</span>').replace(/(\d+%?)/g, function (m) { return '<span class="n">' + m + '</span>'; });
  }
  function bandTip(s) {
    var medal = s.icon ? '<span class="bt-medal ico frm" style="background-image:url(&quot;' + s.icon + '&quot;)"></span>' : '';
    var head = '<div class="bt-head">' + medal + '<div class="bt-ht">' + (s.kind ? '<div class="bt-kind">' + esc(s.kind) + '</div>' : '') +
      '<div class="bt-title">' + esc(s.title) + '</div>' + (s.sub ? '<div class="bt-sub"><span class="pl">' + esc(s.sub.split(':')[0]) + ':</span> ' + rich(s.sub.split(':').slice(1).join(':').trim()) + '</div>' : '') + '</div></div>';
    var chips = (s.chips && s.chips.length) ? '<div class="bt-meta">' + s.chips.map(function (c) {
      return '<span class="bt-chip' + (c.tone ? ' ' + c.tone : '') + '">' + (c.icon ? '<img class="ci" src="' + c.icon + '" alt="">' : '') + (c.num ? '<span class="n">' + esc(c.num) + '</span> ' : '') + esc(c.text) + '</span>';
    }).join('') + '</div>' : '';
    var lines = (s.lines || []).map(function (l) { return '<div class="bt-ln"><span class="dia"></span><div class="tx">' + rich(l) + '</div></div>'; }).join('');
    var body = lines ? '<div class="bt-div"></div><div class="bt-body">' + lines + '</div>' : '';
    var foot = s.foot ? '<div class="bt-foot' + (s.footWarn ? ' warn' : '') + '"><span class="dia"></span><span class="tx">' + esc(s.foot) + '</span></div>' : '';
    return '<div class="bt" style="--ac:' + (s.accent || '#d9b26a') + '">' + head + chips + body + foot + '</div>';
  }

  /* ---------- veri (data/classes/*.json) ---------- */
  var PRIMARY = { str: "35% chance for debuffs on you to last 1 turn less", dex: "15% more damage when you are faster than your target", int: "20% chance to get back half of a skill's MP cost", luck: '30% chance to ignore a lethal hit once per battle' };
  var PRIM_NAME = { str: 'Resilience', dex: "Hunter's Mark", int: 'Mana Echo', luck: 'Lucky Escape' };
  var CLASSES = [
    { id: 'warrior', name: 'Warrior', color: '#c8553d', role: 'Melee Bruiser', range: 1, primary: 'str', passive: 'Berserker', blurb: "Frontline bruiser who turns pain into Rage and hits hardest at death's door." },
    { id: 'defender', name: 'Defender', color: '#8a94a6', role: 'Tank', range: 1, primary: 'str', passive: 'Bulwark Aura', blurb: 'Iron-clad tank who taunts foes and hardens the armor of allies at his side.' },
    { id: 'cutthroat', name: 'Cutthroat', color: '#5b4a6b', role: 'Assassin', range: 1, primary: 'dex', passive: 'Opportunist', blurb: 'Cunning assassin who poisons, blinds and stabs weakened foes in the back.' },
    { id: 'archer', name: 'Archer', color: '#3f7d4e', role: 'Marksman', range: 6, primary: 'dex', passive: 'Sharpshooter', blurb: 'Patient marksman whose arrows strike harder the farther the target stands.' },
    { id: 'mage', name: 'Mage', color: '#3d7be0', role: 'Elemental Mage', range: 6, primary: 'int', passive: 'Heat Mirage', blurb: 'Elemental caster who rains fire and frost on enemy ranks from afar.' },
    { id: 'paladin', name: 'Paladin', color: '#e6c14a', role: 'Holy Healer', range: 4, primary: 'int', passive: 'Divine Light', blurb: 'Holy knight who mends the most wounded each turn and raises the fallen.' },
    { id: 'antimage', name: 'Anti-Mage', color: '#9b59d0', role: 'Mana Hunter', range: 4, primary: 'int', passive: "Spellbreaker's Instinct", blurb: 'Mana hunter who burns enemy spellpower and strikes faster when enemies cast on her team.' },
    { id: 'druid', name: 'Druid', color: '#5a8f29', role: 'Nature Summoner', range: 5, primary: 'int', passive: "Nature's Grudge", blurb: 'Nature summoner who calls treants to the field, mends allies and roots whoever fells one.' },
    { id: 'gambler', name: 'Gambler', color: '#b8892e', role: 'Risk Taker', range: 5, primary: 'luck', passive: 'Double or Nothing', blurb: 'Reckless risk taker who wagers HP and mana on fate for huge hits.' },
    { id: 'hexer', name: 'Hexer', color: '#6a2f5f', role: 'Curse Caster', range: 5, primary: 'luck', passive: 'Ill Omen', blurb: 'Curse caster who piles Omens on foes and passes them on when a victim falls.' },
    { id: 'undead', name: 'Undead', color: '#7d8a73', role: 'Dark Mage', range: 5, primary: 'int', passive: 'Vampiric Bite', blurb: 'Dark mage who drains life, shares it through a dark bond and raises the dead.' }
  ];
  var BYID = {}; CLASSES.forEach(function (c) { BYID[c.id] = c; });
  var ROWS = ['Front row', '2nd row', '3rd row', 'Back row'];
  var ROWL = ['front row', '2nd row', '3rd row', 'back row'];
  // taslak takimi (4 kisi): slot = sira*3 + serit, sira 0 = on
  var team = { mage: 0, defender: 1, warrior: 7, paladin: 9 };
  function hintOf(id) { // formation-hints.ts mantigi: outOfReach / exposed
    var c = BYID[id], slot = team[id]; if (slot === undefined) return null;
    var row = Math.floor(slot / 3);
    if (c.range - 1 - row < 0) return { kind: 'outOfReach', c: c, row: row, maxRow: Math.max(0, c.range - 1) };
    var front = 9; Object.keys(team).forEach(function (k) { front = Math.min(front, Math.floor(team[k] / 3)); });
    var melee = Object.keys(team).some(function (k) { return k !== id && BYID[k].range <= 1; });
    if (c.range >= 5 && row === front && melee) return { kind: 'exposed', c: c, row: row, fromRow: Math.min(3, c.range - 1) };
    return null;
  }
  function hintText(h) { // placementHintText
    if (h.kind === 'outOfReach') return h.c.name + ' (Range ' + h.c.range + ") can't reach the enemy from the " + ROWL[h.row] + '. Try ' + (h.maxRow === 0 ? 'the front row' : 'the ' + ROWL[h.maxRow] + ' or closer') + '.';
    return h.c.name + ' (Range ' + h.c.range + ') can still reach the enemy from the ' + ROWL[h.fromRow] + '. It is safer behind your melee.';
  }
  var ICON = function (n) { return 'endless-pick/i/' + n + '.webp'; };

  /* ---------- "mevcut" bilgi satiri (T.classInfo + heroRow + placementHintText) ---------- */
  function nowLine(id) {
    if (!id) return 'The front row faces the enemy.';
    var c = BYID[id], s = c.name + ' · ' + c.primary.toUpperCase() + ' · Passive: ' + c.passive, slot = team[id];
    if (slot === undefined) return s;
    var h = hintOf(id);
    return s + '  ·  ' + ROWS[Math.floor(slot / 3)] + (h ? '  ·  ' + hintText(h) : '');
  }

  /* ---------- ipucu icerigi (uc varyant) ---------- */
  function tipSpec(variant, id) {
    var c = BYID[id], slot = team[id], h = hintOf(id);
    var melee = c.range <= 1;
    var base = { accent: c.color, icon: ICON('cls-' + id), kind: c.role + ' · ' + (melee ? 'Melee' : 'Ranged'), title: c.name };
    var rowChip = slot !== undefined ? { text: ROWS[Math.floor(slot / 3)], tone: 'ac' } : null;
    var warnChip = h ? { text: h.kind === 'outOfReach' ? 'Out of reach' : 'Exposed in front', tone: h.kind === 'outOfReach' ? 'warn' : 'free' } : null;
    if (variant === 'a') { // Quick Battle sinif ipucu gibi: kind + baslik + blurb; ustune Primary / Passive satirlari, izgarada sira + uyari
      var s = Object.assign({}, base, { sub: 'Primary: ' + c.primary.toUpperCase() + ' · ' + PRIM_NAME[c.primary], lines: [c.blurb, '*Passive:* ' + c.passive] });
      if (rowChip) s.chips = [rowChip, { text: 'Range', num: String(c.range), tone: 'v' }];
      if (h) { s.foot = hintText(h); s.footWarn = true; }
      return s;
    }
    if (variant === 'b') { // yalniz cipler: Primary + Range + Passive adi; uyari cipi + kisa cumle
      var chips = [{ text: c.primary.toUpperCase(), tone: 'ac', icon: ICON('stat-' + c.primary) }, { text: 'Range', num: String(c.range), tone: 'v' }];
      if (rowChip) chips.push(rowChip);
      if (warnChip) chips.push(warnChip);
      var s2 = Object.assign({}, base, { chips: chips, lines: ['*Passive:* ' + c.passive] });
      if (h) { s2.foot = hintText(h); s2.footWarn = true; }
      return s2;
    }
    // c: dock; ayni icerik zengin: primary bonusu cümlesi dahil
    var s3 = Object.assign({}, base, { sub: 'Primary: ' + c.primary.toUpperCase() + ' · ' + PRIMARY[c.primary], lines: [c.blurb, '*Passive:* ' + c.passive] });
    var ch = [{ text: 'Range', num: String(c.range), tone: 'v' }];
    if (rowChip) ch.unshift(rowChip);
    if (warnChip) ch.push(warnChip);
    s3.chips = ch;
    if (h) { s3.foot = hintText(h); s3.footWarn = true; }
    return s3;
  }

  /* ---------- durum ---------- */
  var S = { view: 'pick', v: 'a', size: '16:9', pin: null, rw: 'new', rwSel: -1 };
  var SIZES = { '16:9': [1920, 1080], '21:9': [2580, 1080], 'phone': [844, 390] };
  var NOTES = {
    now: '<b>Mevcut:</b> sahnenin altında kalıcı tek satır; üzerine gelinen kahramana göre yeniden yazılıyor. Dokunmatikte hover yok, yani bilgi hiç görünmez.',
    a: '<b>A Yalın ipucu:</b> satır yok; üstüne gelince Quick Battle ile aynı A Band ipucu (rol, Primary, pasif, blurb); ızgarada sıra çipi + uyarı alt şeridinde. Dokunma sabitler, boşluğa dokunma kapatır.',
    b: '<b>B Çip ipucu:</b> kısa ve sık açılan: yalnız çipler (Primary, Range, sıra, uyarı adı) + pasif adı; uyarı cümlesi yalnızca uyarı olan hücrede alt şeritte.',
    c: '<b>C Sabit kutu:</b> ipucu kahramanın üstünde süzülmez; ekranın altında tek yerde açılır (parmak ya da imleç örtmez). İçerik zengin: Primary bonusunun tam cümlesi dahil.',
    rwNew: '<b>Yeni hover (kural):</b> ui-motion.json card: 170 ms, 4 px yükselme (yalnız fare), ince altın kenar parlaması; ölçek yok. Dokunmatikte hareket yok, seçili kartın kenarı altın.',
    rwOld: '<b>Eski hover:</b> 10 px yükselme + ölçek 1.012, 200 ms (EndlessScene.ts setState). Karşılaştırma için.'
  };

  var stage = $('#mk-stage'), tipEl = null, hideT = 0;

  function bar() {
    var b = $('#mk-bar'); var h = '';
    function btn(k, label, on) { return '<button data-k="' + k + '"' + (on ? ' class="on"' : '') + '>' + label + '</button>'; }
    h += btn('view:pick', 'Team pick', S.view === 'pick') + btn('view:rw', 'Reward cards', S.view === 'rw') + '<span class="sep"></span>';
    if (S.view === 'pick') h += btn('v:now', 'Now', S.v === 'now') + btn('v:a', 'A Lean', S.v === 'a') + btn('v:b', 'B Chips', S.v === 'b') + btn('v:c', 'C Dock', S.v === 'c');
    else h += btn('rw:new', 'New hover', S.rw === 'new') + btn('rw:old', 'Old hover', S.rw === 'old');
    h += '<span class="sep"></span>' + btn('sz:16:9', '16:9', S.size === '16:9') + btn('sz:21:9', '21:9', S.size === '21:9') + btn('sz:phone', 'Phone 844x390', S.size === 'phone');
    b.innerHTML = h;
    var n = S.view === 'pick' ? NOTES[S.v] : (S.rw === 'new' ? NOTES.rwNew : NOTES.rwOld);
    $('#mk-note').innerHTML = n;
  }

  function fit() {
    var d = SIZES[S.size], W = d[0], H = d[1];
    var vw = innerWidth, vh = innerHeight - 86;
    var sc = Math.min(vw / W, vh / H); if (S.size === 'phone') sc = Math.min(sc, 1);
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    stage.style.setProperty('--u', (H / 1080) + 'px');
    var small = innerHeight < 520; document.documentElement.classList.toggle('small', small); if (small) { sc = Math.min(1, innerWidth / W); $('#mk-view').style.setProperty('--vh', Math.ceil(H * sc) + 'px'); } stage.style.transform = 'scale(' + sc + ')';
    stage._sc = sc;
    document.documentElement.classList.toggle('short', S.size === 'phone');
  }

  /* ---------- kadro + izgara ---------- */
  function pickHtml() {
    var rost = CLASSES.map(function (c) {
      var on = team[c.id] !== undefined;
      return '<button class="ep-hero' + (on ? ' in' : '') + '" style="--c:' + c.color + '" data-cls="' + c.id + '" data-src="r"><span class="av"><img src="' + ICON('av-' + c.id) + '" alt=""></span><span class="nm">' + c.name + '</span><span class="bar"></span></button>';
    }).join('');
    // izgara: sutun 0 = arka sira (3) ... sutun 3 = on sira (0); satir = serit
    var cells = '';
    for (var lane = 0; lane < 3; lane++) for (var col = 0; col < 4; col++) {
      var row = 3 - col, slot = row * 3 + lane, id = null;
      Object.keys(team).forEach(function (k) { if (team[k] === slot) id = k; });
      if (id) {
        var h = hintOf(id), c = BYID[id];
        var hc = h ? (h.kind === 'outOfReach' ? '#e8806a' : '#ffb35a') : '';
        cells += '<button class="ep-cell full' + (row === 0 ? ' front' : '') + '" data-cls="' + id + '" data-src="g" style="--ct:' + (hc || '#f3d999') + '"><img src="' + ICON('av-' + id) + '" alt="">' + (h ? '<span class="ep-badge" style="--bc:' + hc + '"><b>!</b></span>' : '') + '<span class="cn">' + c.name + '</span></button>';
      } else cells += '<button class="ep-cell empty' + (row === 0 ? ' front' : '') + '" tabindex="-1" aria-label="Empty cell"></button>';
    }
    var n = Object.keys(team).length;
    return '<div class="ep"><div class="ep-head"><div class="ep-title">Choose Your Company</div><div class="ep-sub">Drag 4 heroes onto the field. They start at level 1 with no gear, and keep their places all run.</div></div>' +
      '<div class="ep-main"><div><div class="ep-label">Heroes</div><div class="ep-panel"><div class="ep-roster">' + rost + '</div></div></div>' +
      '<div><div class="ep-label on">Your company  ' + n + ' / 4</div><div class="ep-panel"><div class="ep-gridwrap"><span class="ep-side back">Back</span><div class="ep-grid">' + cells + '</div><span class="ep-side on">Front ▸</span></div></div></div></div>' +
      (S.v === 'now' ? '<div class="ep-info" id="ep-info">' + esc(nowLine(null)) + '</div>' : '') +
      '<div class="ep-btns"><button class="ep-btn">Randomize</button><button class="ep-btn">Auto Arrange</button><button class="ep-btn pri">Start Run</button></div></div>';
  }

  /* ---------- ipucu goster / gizle ---------- */
  function ensureTip() { if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'ep-tipwrap'; stage.appendChild(tipEl); } return tipEl; }
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }
  function showTip(btn) {
    var id = btn.getAttribute('data-cls'); var t = ensureTip();
    clearTimeout(hideT);
    t.innerHTML = bandTip(tipSpec(S.v, id));
    t.className = 'ep-tipwrap' + (S.v === 'c' && S.size !== 'phone' ? ' dock' : '');
    var sc = stage._sc || 1, sr = stage.getBoundingClientRect(), br = btn.getBoundingClientRect();
    var W = parseFloat(stage.style.width), H = parseFloat(stage.style.height);
    t.style.left = '0px'; t.style.top = '0px';
    var tw = t.offsetWidth, th = t.offsetHeight;
    var x, y;
    if (S.size === 'phone') { // telefon: ipucu dokunulan yerin yanina (kadro -> sag, izgara -> sol), parmagi ve hucreyi orter
      var fromRoster = btn.getAttribute('data-src') === 'r';
      x = fromRoster ? W - tw - 8 : 8; y = Math.max(4, Math.min((H - th) / 2, H - th - 4));
      t.style.left = x + 'px'; t.style.top = y + 'px';
    } else if (S.v === 'c') { // sabit kutu: alt orta, dugmelerin hemen ustu
      x = W / 2; y = H - th - Math.max(60, 74 * (H / 1080) + 10);
      t.style.left = x + 'px'; t.style.top = Math.max(4, y) + 'px';
    } else {
      var bx = (br.left - sr.left) / sc, by = (br.top - sr.top) / sc, bw = br.width / sc, bh = br.height / sc;
      x = Math.min(Math.max(6, bx + bw / 2 - tw / 2), W - tw - 6);
      y = by - th - 10; if (y < 4) y = by + bh + 10;
      t.style.left = x + 'px'; t.style.top = Math.max(4, Math.min(y, H - th - 4)) + 'px';
    }
    requestAnimationFrame(function () { t.classList.add('show'); });
  }
  function clearPin() { S.pin = null; stage.querySelectorAll('.pin').forEach(function (e) { e.classList.remove('pin'); }); hideTip(); }

  function wirePick() {
    var info = $('#ep-info');
    stage.querySelectorAll('[data-cls]').forEach(function (b) {
      var id = b.getAttribute('data-cls');
      b.addEventListener('pointerenter', function (e) {
        if (S.v === 'now') { if (info) info.textContent = nowLine(id); return; }
        if (e.pointerType === 'mouse' && !S.pin) showTip(b);
      });
      b.addEventListener('pointerleave', function (e) {
        if (S.v === 'now') { if (info) info.textContent = nowLine(null); return; }
        if (e.pointerType === 'mouse' && !S.pin) hideTip();
      });
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (S.v === 'now') { if (info) info.textContent = nowLine(id); return; }
        var was = S.pin === b; clearPin();
        if (!was) { S.pin = b; b.classList.add('pin'); showTip(b); }
      });
    });
    stage.addEventListener('click', function (e) { if (!e.target.closest('[data-cls]')) clearPin(); });
  }

  /* ---------- oduller ---------- */
  function rwHtml() {
    var use = ['defender', 'warrior', 'paladin'].map(function (c) { return '<img src="' + ICON('av-' + c) + '" alt="">'; }).join('');
    var cards = [
      { ac: '#3f6fa8', k: 'Spoils · Choose 1 of 3', ico: 'it-arming_sword', nm: 'Arming Sword', ln: 'iL 9 · Rare', tx: '', sell: 'Sell: 55', use: use },
      { ac: '#ecc878', k: 'Coin', ico: 'ui-gold', big: '+75', small: 'GOLD', tx: 'Coin for the merchant who comes after every 5th wave.', ln: 'Purse 120 → 195' },
      { ac: '#d96a5a', k: 'Rest', ico: 'ui-rest', big: '+30%', tx: 'Every hero recovers 30% of their health.', ln: '' }
    ];
    return '<div class="rw ' + S.rw + '"><div class="ep-head"><div class="ep-title">Victory</div><div class="ep-sub">Wave 6 cleared. Choose one reward.</div></div><div class="rw-cards">' +
      cards.map(function (c, i) {
        return '<button class="rw-card' + (S.rwSel === i ? ' sel' : '') + '" data-rw="' + i + '" style="--ac:' + c.ac + '"><span class="kick">' + esc(c.k) + '</span>' + (c.sell ? '<span class="sell"><img src="' + ICON('ui-gold') + '" alt="">' + c.sell + '</span>' : '') +
          '<span class="med"><img src="' + ICON(c.ico) + '" alt=""></span>' + (c.nm ? '<span class="nm">' + c.nm + '</span>' : '') + (c.big ? '<span class="big">' + c.big + (c.small ? '<small>' + c.small + '</small>' : '') + '</span>' : '') +
          (c.tx ? '<span class="tx">' + esc(c.tx) + '</span>' : '') + (c.ln ? '<span class="ln">' + esc(c.ln) + '</span>' : '') + (c.use ? '<span class="use"><span>USABLE BY</span><div>' + c.use + '</div></span>' : '') + '</button>';
      }).join('') + '</div><div class="ep-btns"><button class="ep-btn">Abandon Run</button><button class="ep-btn pri">Take</button></div></div>';
  }

  function render() {
    bar(); fit(); clearTimeout(hideT); tipEl = null; S.pin = null;
    stage.innerHTML = '<span class="size-tag">' + (S.size === 'phone' ? '844x390 (html.short)' : S.size) + '</span>' + (S.view === 'pick' ? pickHtml() : rwHtml());
    if (S.view === 'pick') {
      wirePick();
      // Varyantlar yalnız ipucunda ayrılıyor: örnek ipucu açık gelir, yoksa düğmeler çalışmıyor sanılıyor (Ömer 2026-11-01)
      if (S.v !== 'now') { var sample = stage.querySelector('[data-cls="mage"][data-src="g"]'); if (sample) sample.click(); }
    } else stage.querySelectorAll('[data-rw]').forEach(function (b) { b.addEventListener('click', function () { S.rwSel = +b.getAttribute('data-rw'); stage.querySelectorAll('.rw-card').forEach(function (x) { x.classList.toggle('sel', x === b); }); }); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('#mk-bar button'); if (!b) return;
    var p = b.getAttribute('data-k').split(':'); var k = p[0], v = p.slice(1).join(':');
    if (k === 'view') S.view = v; else if (k === 'v') S.v = v; else if (k === 'rw') S.rw = v; else if (k === 'sz') S.size = v;
    render();
  });
  addEventListener('resize', fit);
  var h = (location.hash || '').replace('#', '');
  if (/^(now|a|b|c)(&|$)/.test(h)) S.v = h.split('&')[0]; else if (/^rw(&|$)/.test(h)) S.view = 'rw';
  var sz = /size=(16:9|21:9|phone)/.exec(location.search + location.hash); if (sz) S.size = sz[1];
  if (/clean/.test(location.hash)) document.documentElement.classList.add('clean');
  render();
})();
