/* Unit card mockup (NOT game code).
   Hash:  #a | #b | #c | #now     &u=skeleton|hero   &z=169|219|ph   &closed   &tip=<n> (show effect/passive tip n)   */
(function () {
  'use strict';
  var I = function (n) { return 'unit-card/img/' + n + '.webp'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SIZES = { 169: { w: 1920, l: '16:9' }, 219: { w: 2580, l: '21:9' }, ph: { w: 2337, l: 'Phone 844x390' } };
  var NAMES = { now: 'Today', a: 'A - Same text, stats move out', b: 'B - One-line rows, text on hover', c: 'C - Chips + drawer' };
  var $ = function (q, r) { return (r || document).querySelector(q); };

  /* ---------------- example data (see report: which values are invented) ---------------- */
  var HOLY = '#fff0a0';
  var DATA = {
    skeleton: {
      enemy: true, kind: 'Enemy', name: 'Risen Skeleton', lv: 3, av: 'av-skeleton', flip: true, chips: [],
      bars: [['hp', 'st-hp', 37, 80]],
      attrs: [['st-str', 'STR', '26'], ['st-dex', 'DEX', '9'], ['st-int', 'INT', '0'], ['st-luck', 'LCK', '5']],
      atk: [['st-spd', 'SPD', '16.04'], ['st-critChance', 'CRIT', '6.3%'], ['st-accuracy', 'ACC', '83%']],
      def: [['st-armor', 'ARM', '10', '-14%'], ['st-evasion', 'EVA', '0%'], ['st-magicArmor', 'M.ARM', '0'], ['block', 'BLOCK', '15%']],
      fx: [
        { n: 'Poisoned', c: '#7fd04f', turns: '1 turn', t: 'Takes nature damage at the start of each of its turns and receives 15% less healing (from Poison)', ic: 'poisoned', bad: true },
        { n: 'Slow', c: '#8ec8ff', turns: '2 turns', t: '30% less Speed', ic: 'slow', bad: true },
        { n: 'Weak to Holy', c: HOLY, turns: '+50%', t: 'Takes more holy damage', ic: null, bad: true, short: 'Holy' }
      ],
      passive: null,
      skills: [
        { n: 'Grave Strike', ic: 'grave_strike', t: 'Single', cost: null, cd: 0, wait: 0 },
        { n: 'Grave Sweep', ic: 'grave_sweep', t: 'Single', cost: null, cd: 3, wait: 0 }
      ],
      pv: { ic: 'thornwhip', n: 'Thorn Whip', hit: '86%', amt: '27–33 dmg' },
      sx: 0.0
    },
    hero: {
      enemy: false, kind: 'Ally', name: 'Warrior', lv: 4, av: 'av-warrior', flip: false,
      chips: [{ t: 'Melee Bruiser' }, { t: 'Strength primary', ic: 'st-str', hot: true }],
      bars: [['hp', 'st-hp', 142, 160], ['mp', 'st-mp', 24, 40], ['rage', 'ui-rage', 34, 100]],
      attrs: [['st-str', 'STR', '32', null, true], ['st-dex', 'DEX', '11'], ['st-int', 'INT', '2'], ['st-luck', 'LCK', '6']],
      atk: [['st-spd', 'SPD', '14.20'], ['st-critChance', 'CRIT', '7.5%'], ['st-accuracy', 'ACC', '90%']],
      def: [['st-armor', 'ARM', '38', '-31%'], ['st-evasion', 'EVA', '3%'], ['st-magicArmor', 'M.ARM', '6', '-5%'], ['block', 'BLOCK', '20%']],
      fx: [{ n: 'Fortified', c: '#c58bff', turns: '2 turns', t: 'Takes 50% less damage', ic: 'fortify', bad: false }],
      passive: { n: 'Berserker', ic: 'sk-rage', t: 'The lower your HP, the harder you hit: up to <span class="n">80%</span> more damage at the brink of death. Losing HP also gives Rage.' },
      skills: [
        { n: 'Double Strike', ic: 'sk-sword', t: 'Single', cost: null, cd: 0, wait: 0 },
        { n: 'Whirlwind', ic: 'sk-whirlwind', t: 'Area', cost: ['st-mp', '8'], cd: 3, wait: 0 },
        { n: 'Charge', ic: 'sk-charge', t: 'Single', cost: ['st-mp', '10'], cd: 4, wait: 2 },
        { n: 'Headsman’s Blow', ic: 'sk-warcry', t: 'Single', cost: ['ui-rage', '30', 'rg'], cd: 5, wait: 0 }
      ],
      pv: null
    }
  };

  /* ---------------- state from the address ---------------- */
  var S = { v: 'a', u: 'skeleton', z: null, closed: false, tip: null, zm: 1 };
  function readHash() {
    var raw = (location.hash.slice(1) + '&' + location.search.slice(1)).split('&');
    S = { v: 'a', u: 'skeleton', z: null, closed: false, tip: null, zm: 1 };
    raw.forEach(function (t) {
      if (!t) return;
      var kv = t.split('=');
      if (kv.length === 1) {
        // Tek kelimelik link: #b, #b-219, #b-ph-hero-closed (Artifact görüntüleyicisi yalnız düz çapa geçirir)
        var w = t.split('-');
        if (/^(a|b|c|now)$/.test(w[0])) { S.v = w[0]; w.slice(1).forEach(function (x) { if (/^(169|219|ph)$/.test(x)) S.z = x; else if (x === 'hero') S.u = 'hero'; else if (x === 'closed') S.closed = true; }); }
        else if (t === 'closed') S.closed = true;
      }
      else if (kv[0] === 'u' && DATA[kv[1]]) S.u = kv[1];
      else if (kv[0] === 'z' && SIZES[kv[1]]) S.z = kv[1];
      else if (kv[0] === 'zm') S.zm = parseFloat(kv[1]) || 1;
      else if (kv[0] === 'tip') S.tip = parseInt(kv[1], 10);
      else if (kv[0] === 'closed') S.closed = kv[1] !== '0';
    });
    if (!S.z) { var r = innerWidth / innerHeight; S.z = r >= 2.2 ? '219' : (innerWidth <= 900 && innerHeight <= 520) ? 'ph' : '169'; }
  }

  /* ---------------- pieces ---------------- */
  var ico = function (n, cls) { return '<img class="ico ' + (cls || '') + '" src="' + I(n) + '" alt="">'; };
  function bar(b, u) {
    var pct = Math.round(b[2] / b[3] * 100);
    return '<div class="cb"><div class="cb-v">' + ico(b[1]) + '<b>' + b[2] + '</b><span class="of">/ ' + b[3] + '</span></div><div class="bar ' + b[0] + (b[0] === 'hp' && u.enemy ? ' en' : '') + '"><i style="width:calc(' + pct + '% - 2px)"></i></div></div>';
  }
  var bars = function (u) { return '<div class="cbars">' + u.bars.map(function (b) { return bar(b, u); }).join('') + '</div>'; };
  var div = '<div class="bt-div"></div>';
  var lab = function (t, cls) { return '<div class="cl ' + (cls || '') + '">' + esc(t) + '</div>'; };
  function srow(s) { return '<div class="sr' + (s[4] ? ' pri' : '') + '">' + ico(s[0] === 'block' ? 'block' : s[0]) + '<span class="k">' + esc(s[1]) + '</span><span class="n">' + esc(s[2]) + '</span><span class="rd">' + (s[3] ? esc(s[3]) : '') + '</span></div>'; }
  function tile(s) { return '<div class="tile' + (s[4] ? ' pri' : '') + '">' + ico(s[0] === 'block' ? 'block' : s[0]) + '<span class="n">' + esc(s[2]) + '</span><span class="k">' + esc(s[1]) + '</span><span class="rd">' + (s[3] ? esc(s[3]) : '') + '</span></div>'; }
  var sec = function (title, rows, f) { return '<div class="sc">' + lab(title) + rows.map(f).join('') + '</div>'; };

  var TIPS = [];
  function tipIdx(o) { TIPS.push(o); return TIPS.length - 1; }
  function effFull(e) {
    return '<div class="e" style="--c:' + e.c + '">' + (e.ic ? ico(e.ic) : '<i class="dia"></i>') + '<b>' + esc(e.n) + '</b><em>' + esc(e.turns) + '</em><span class="d">' + esc(e.t) + '</span></div>';
  }
  function effRow(e) {
    var i = tipIdx({ title: e.n, kind: (e.bad ? 'Debuff' : 'Buff') + (e.turns ? ' · ' + e.turns : ''), text: e.t, ic: e.ic, c: e.c });
    return '<div class="e row" data-tip="' + i + '" style="--c:' + e.c + '">' + (e.ic ? ico(e.ic) : '<i class="dia"></i>') + '<b>' + esc(e.n) + '</b><em>' + esc(e.turns) + '</em></div>';
  }
  function effChip(e) {
    var i = tipIdx({ title: e.n, kind: (e.bad ? 'Debuff' : 'Buff') + (e.turns ? ' · ' + e.turns : ''), text: e.t, ic: e.ic, c: e.c });
    var num = e.ic ? '<b>' + esc(e.turns.replace(/ turns?/, '')) + '</b>' : '<span>' + esc(e.short || '') + '</span><b>' + esc(e.turns) + '</b>';
    return '<div class="fxc" data-tip="' + i + '" style="--c:' + e.c + '">' + (e.ic ? ico(e.ic) : '<i class="dia"></i>') + num + '</div>';
  }
  function costChip(k) {
    if (!k.cost) return '<span class="bt-chip free">Free</span>';
    return '<span class="bt-chip' + (k.cost[2] ? ' ' + k.cost[2] : '') + '">' + ico(k.cost[0]) + '<span class="n">' + k.cost[1] + '</span></span>';
  }
  function cdChip(k) {
    if (k.wait > 0) return '<span class="bt-chip wait">' + ico('cooldown') + '<span class="n">' + k.wait + '</span>/' + k.cd + '</span>';
    if (k.cd > 0) return '<span class="bt-chip">' + ico('cooldown') + '<span class="n">' + k.cd + '</span></span>';
    return '';
  }
  function skRow(k) { return '<div class="cs' + (k.wait ? ' cool' : '') + '">' + ico(k.ic) + '<span class="n">' + esc(k.n) + '</span><span class="t">' + esc(k.t) + '</span><span class="cw">' + costChip(k) + '</span><span class="cw">' + cdChip(k) + '</span></div>'; }
  function skPlate(k) { return '<div class="pl' + (k.wait ? ' cool' : '') + '">' + ico(k.ic) + '<span class="n">' + esc(k.n) + '</span><span class="m"><span class="t">' + esc(k.t) + '</span>' + costChip(k) + cdChip(k) + '</span></div>'; }
  function passiveFull(p) { return '<div class="pas">' + ico(p.ic) + '<div class="tx"><b>' + esc(p.n) + '</b><span>' + p.t + '</span></div></div>'; }
  function passiveRow(p) {
    var i = tipIdx({ title: p.n, kind: 'Passive', text: p.t, ic: p.ic, c: '#d9b26a', html: true });
    return '<div class="pas row" data-tip="' + i + '">' + ico(p.ic) + '<b>' + esc(p.n) + '</b><em>Passive</em></div>';
  }
  function preview(u) {
    if (!u.pv) return '';
    return '<div class="pv">' + ico(u.pv.ic) + '<b>' + esc(u.pv.n) + '</b><span class="r">' + esc(u.pv.hit) + '<em> to hit</em></span><span>' + esc(u.pv.amt) + '</span></div>';
  }
  function chipsRow(u) {
    if (!u.chips.length) return '';
    return '<div class="bt-meta">' + u.chips.map(function (c) { return '<span class="bt-chip' + (c.hot ? ' ac' : '') + '"' + (c.hot ? ' style="color:#ffb98a;border-color:rgba(224,112,42,.55);background:rgba(224,112,42,.14)"' : '') + '>' + (c.ic ? ico(c.ic) : '') + esc(c.t) + '</span>'; }).join('') + '</div>';
  }
  function medal(u, extra) { return '<span class="bt-medal por"' + ' style="background-image:url(&quot;' + I(u.av) + '&quot;)' + (u.flip ? ';transform:scaleX(-1)' : '') + '"></span>' + (extra || ''); }
  function head(u, o) {
    o = o || {};
    var av = o.plain ? medal(u) : '<button type="button" class="av' + (o.tag ? ' tagged' : '') + '" data-toggle aria-label="Show stats" title="Stats">' + medal(u) + (o.badge ? '<i class="gl"></i>' : '') + '</button>';
    return '<div class="bt-head">' + av + '<div class="bt-ht"><div class="bt-kind">' + esc(u.kind) + '</div><div class="bt-title">' + esc(u.name) + '</div></div><div class="bt-aside"><div class="bt-big">Lv ' + u.lv + '</div></div></div>';
  }
  var frame = function (inner, foot) { return '<div class="bt" style="--ac:#d9b26a">' + inner + (foot || '') + '</div>'; };
  var split = function (u) { return { buff: u.fx.filter(function (e) { return !e.bad; }), debuff: u.fx.filter(function (e) { return e.bad; }) }; };

  /* ---------------- variants ---------------- */
  function cardNow(u) {
    var cols = '<div class="scols">' + sec('Main', u.attrs, srow) + sec('Attack', u.atk, srow) + sec('Defense', u.def, srow) + '</div>';
    var fx = u.fx.length ? div + '<div class="csec">' + lab('Effects') + '<div class="eff">' + u.fx.map(effFull).join('') + '</div></div>' : '';
    var sk = div + '<div class="csec">' + lab('Skills') + '<div class="csl">' + u.skills.map(skRow).join('') + '</div></div>';
    var ps = u.passive ? div + '<div class="csec">' + lab('Passive') + passiveFull(u.passive) + '</div>' : '';
    var pv = u.pv ? '<div class="pvw">' + preview(u) + '</div>' : '';
    var body = '<div class="uc-body">' + bars(u) + div + cols + fx + sk + ps + pv + '</div>';
    return { card: frame(head(u, { plain: true }) + chipsRow(u) + body), panel: '' };
  }
  function cardA(u) {
    var s = split(u);
    var fx = '';
    if (s.buff.length) fx += div + '<div class="csec">' + lab('Buffs', 'good') + '<div class="eff">' + s.buff.map(effFull).join('') + '</div></div>';
    if (s.debuff.length) fx += div + '<div class="csec">' + lab('Debuffs', 'bad') + '<div class="eff">' + s.debuff.map(effFull).join('') + '</div></div>';
    var ps = u.passive ? div + '<div class="csec">' + lab('Passive') + passiveFull(u.passive) + '</div>' : '';
    var sk = div + '<div class="csec">' + lab('Skills') + '<div class="csl">' + u.skills.map(skRow).join('') + '</div></div>';
    var body = '<div class="uc-body">' + bars(u) + fx + ps + sk + '</div>';
    var foot = u.pv ? '<div class="uc-foot">' + preview(u) + '</div>' : '';
    var panel = '<div class="uc-panel">' + frame('<div class="bt-head"><div class="bt-ht"><div class="bt-kind">' + esc(u.name) + '</div><div class="bt-title">Stats</div></div><button type="button" class="x" data-toggle aria-label="Close stats"></button></div><div class="uc-body pcol">' + sec('Main', u.attrs, srow) + sec('Attack', u.atk, srow) + sec('Defense', u.def, srow) + '</div>') + '</div>';
    return { card: frame(head(u, { badge: true }) + chipsRow(u) + body, foot), panel: panel };
  }
  function cardB(u) {
    var s = split(u);
    var fx = '';
    if (s.buff.length) fx += div + '<div class="csec">' + lab('Buffs', 'good') + '<div class="eff">' + s.buff.map(effRow).join('') + '</div></div>';
    if (s.debuff.length) fx += div + '<div class="csec">' + lab('Debuffs', 'bad') + '<div class="eff">' + s.debuff.map(effRow).join('') + '</div></div>';
    var ps = u.passive ? div + '<div class="csec">' + lab('Passive') + passiveRow(u.passive) + '</div>' : '';
    var sk = div + '<div class="csec">' + lab('Skills') + '<div class="csl">' + u.skills.map(skRow).join('') + '</div></div>';
    var body = '<div class="uc-body">' + bars(u) + fx + ps + sk + '</div>';
    var foot = u.pv ? '<div class="uc-foot">' + preview(u) + '</div>' : '';
    var phead = '<div class="bt-head">' + medal(u) + '<div class="bt-ht"><div class="bt-kind">Stats</div><div class="bt-title">' + esc(u.name) + '</div></div></div>';
    var panel = '<div class="uc-link"></div><div class="uc-panel">' + frame(phead + '<div class="uc-body"><div class="scols">' + sec('Main', u.attrs, srow) + sec('Attack', u.atk, srow) + sec('Defense', u.def, srow) + '</div></div>') + '</div>';
    return { card: frame(head(u, { tag: true }) + chipsRow(u) + body, foot), panel: panel };
  }
  function cardC(u) {
    var s = split(u);
    var fx = '';
    if (s.buff.length) fx += div + '<div class="csec">' + lab('Buffs', 'good') + '<div class="chips">' + s.buff.map(effChip).join('') + '</div></div>';
    if (s.debuff.length) fx += div + '<div class="csec">' + lab('Debuffs', 'bad') + '<div class="chips">' + s.debuff.map(effChip).join('') + '</div></div>';
    var ps = u.passive ? div + '<div class="csec">' + lab('Passive') + passiveRow(u.passive) + '</div>' : '';
    var sk = div + '<div class="csec">' + lab('Skills') + '<div class="plates">' + u.skills.map(skPlate).join('') + '</div></div>';
    var body = '<div class="uc-body">' + bars(u) + fx + ps + sk + '</div>';
    var foot = u.pv ? '<div class="uc-foot">' + preview(u) + '</div>' : '';
    var phead = '<div class="bt-head"><div class="bt-ht"><div class="bt-kind">' + esc(u.name) + '</div><div class="bt-title">Stats</div></div></div>';
    var tiles = '<div class="uc-body">' + sec('Main', u.attrs, tile).replace('class="sc"', 'class="sc"') + '' + '</div>';
    var tb = function (t, rows) { return '<div class="sc">' + lab(t) + '<div class="tiles">' + rows.map(tile).join('') + '</div></div>'; };
    var panel = '<div class="uc-drawer"><button type="button" class="tab" data-toggle aria-label="Toggle stats" title="Stats"></button><div class="uc-panel">' + frame(phead + '<div class="uc-body">' + tb('Main', u.attrs) + tb('Attack', u.atk) + tb('Defense', u.def) + '</div>') + '</div></div>';
    return { card: frame(head(u, { badge: true }) + chipsRow(u) + body, foot), panel: panel };
  }

  /* ---------------- scene ---------------- */
  function build() {
    TIPS = [];
    var ph = S.z === 'ph', W = SIZES[S.z].w, u = DATA[S.u], v = S.v;
    var stage = $('#stage');
    stage.style.width = W + 'px';
    stage.className = ph ? 'ph' : '';
    var iw = 1536, ih = 1024, sc = Math.max(W / iw, 1080 / ih), h = ih * sc, cy = Math.min(h / 2, Math.max(1080 - h / 2, 715 - 0.1 * h));
    var html = '<img id="bg" src="' + I('bg') + '" alt="" style="width:' + iw * sc + 'px;height:' + h + 'px;left:' + (W - iw * sc) / 2 + 'px;top:' + (cy - h / 2) + 'px">';
    var y = 715, SP = [
      { img: 'warrior', w: 494, h: 640, x: W / 2 - 300, flip: false, nm: 'Warrior', hp: 0.89, party: true, me: S.u === 'hero' },
      { img: 'skeleton', w: 313, h: 640, x: W / 2 + 60, flip: true, nm: 'Risen Skeleton', hp: 0.46, party: false, me: S.u === 'skeleton' },
      { img: 'skeleton', w: 313, h: 640, x: W / 2 + 270, flip: true, nm: 'Risen Skeleton', hp: 1, party: false }
    ];
    SP.forEach(function (s) {
      var k = Math.min(140 / s.w, 190 / s.h), w = s.w * k, hh = s.h * k;
      html += '<div class="shadow" style="left:' + (s.x - w * 0.4) + 'px;top:' + (y - 18) + 'px;width:' + w * 0.8 + 'px;height:24px"></div>';
      if (s.me) html += '<div class="ring" style="left:' + (s.x - 66) + 'px;top:' + (y - 19) + 'px;width:132px;height:26px"></div>';
      html += '<img class="sp" src="' + I(s.img) + '" alt="" style="left:' + (s.x - w / 2) + 'px;top:' + (y - hh) + 'px;width:' + w + 'px;height:' + hh + 'px;' + (s.flip ? 'transform:scaleX(-1)' : '') + '">';
      html += '<div class="uname" style="left:' + s.x + 'px;top:' + (y - hh - 54) + 'px">' + s.nm + '</div><div class="ubar' + (s.party ? '' : ' en') + '" style="left:' + s.x + 'px;top:' + (y - hh - 22) + 'px"><i style="width:' + s.hp * 100 + '%"></i></div>';
    });
    var cells = [['av-warrior', 0, 1], ['av-skeleton', 1, 0], ['av-skeleton', 1, 0], ['av-warrior', 0, 0]];
    var hud = '<div class="queue" style="left:' + (W / 2 - 160) + 'px">' + cells.map(function (c, i) { return '<div class="cell ' + (c[1] ? 'enemy ' : '') + (i === 0 ? 'now' : '') + '"><img src="' + I(c[0]) + '" alt="" style="' + (c[1] ? 'transform:scaleX(-1)' : '') + '"></div>'; }).join('') + '</div>';
    hud += '<div class="band"></div>';
    var pl = [['sk-sword', 'Double Strike'], ['sk-whirlwind', 'Whirlwind'], ['sk-charge', 'Charge'], ['sk-warcry', 'Headsman’s']];
    hud += pl.map(function (p, i) { return '<div class="plate" style="left:' + (W / 2 - 282 + i * 142) + 'px"><img src="' + I(p[0]) + '" alt="">' + p[1] + '</div>'; }).join('');
    // the card
    var r = v === 'now' ? cardNow(u) : v === 'a' ? cardA(u) : v === 'b' ? cardB(u) : cardC(u);
    var open = !S.closed && v !== 'now';
    hud += '<div class="uc ' + (u.enemy ? 'enemy' : 'party') + ' v-' + v + (open ? ' open' : '') + '" id="uc"><div class="uc-card">' + r.card + '</div>' + r.panel + '</div>';
    hud += '<div class="uc-tip" id="tip"></div>';
    stage.innerHTML = html + '<div id="hud" style="width:' + W + 'px">' + hud + '</div>';
    $('#tag').textContent = NAMES[v] + ' · ' + SIZES[S.z].l + ' · ' + (u.enemy ? 'enemy' : 'hero') + ' example';
    fit();
    var dr = $('.uc-drawer'); if (dr) dr.style.minHeight = $('.uc-card').offsetHeight + 'px';
    document.querySelectorAll('.uc-body').forEach(function (b) {
      var upd = function () { b.classList.toggle('more', b.scrollHeight > b.clientHeight + 2 && b.scrollTop + b.clientHeight < b.scrollHeight - 4); };
      b.addEventListener('scroll', upd); upd();
    });
    wire();
  }
  function fit() {
    var ph = S.z === 'ph', W = SIZES[S.z].w, st = $('#stage'), fr = $('#frame');
    var s = Math.min(innerWidth / W, innerHeight / 1080);
    if (S.zm > 1) { /* review aid: magnify and anchor to the card's screen edge */
      s *= S.zm; fr.style.transform = 'none'; fr.style.top = -130 * s + 'px';
      fr.style.left = DATA[S.u].enemy ? innerWidth - W * s + 'px' : '0px';
    } else { fr.style.transform = 'translate(-50%,-50%)'; fr.style.top = '50%'; fr.style.left = '50%'; }
    st.style.transform = 'scale(' + s + ')';
    fr.style.width = W * s + 'px'; fr.style.height = 1080 * s + 'px';
    S.shown = s;
  }

  /* ---------------- interaction ---------------- */
  var tipPinned = null;
  function showTip(el) {
    var t = TIPS[+el.getAttribute('data-tip')], tip = $('#tip'), uc = $('#uc');
    if (!t) return;
    tip.innerHTML = '<div class="bt" style="--ac:' + t.c + '"><div class="bt-head">' + (t.ic ? '<span class="bt-medal ico frm" style="background-image:url(&quot;' + I(t.ic) + '&quot;)"></span>' : '') + '<div class="bt-ht"><div class="bt-kind">' + esc(t.kind) + '</div><div class="bt-title">' + esc(t.title) + '</div></div></div><div class="bt-body">' + (t.html ? t.text : esc(t.text)) + '</div></div>';
    tip.classList.add('on');
    var sr = $('#stage').getBoundingClientRect(), s = sr.width / SIZES[S.z].w;
    var er = el.getBoundingClientRect(), cr = $('.uc-card', uc).getBoundingClientRect();
    var pn = $('.uc-panel', uc) || $('.uc-drawer', uc), pr = pn && uc.classList.contains('open') ? pn.getBoundingClientRect() : null;
    var enemy = uc.classList.contains('enemy');
    var tw = tip.offsetWidth, th = tip.offsetHeight, gap = 14;
    var edgeL = ((pr ? Math.min(pr.left, cr.left) : cr.left) - sr.left) / s, edgeR = ((pr ? Math.max(pr.right, cr.right) : cr.right) - sr.left) / s;
    var x = enemy ? edgeL - tw - gap : edgeR + gap;
    var y = (er.top + er.height / 2 - sr.top) / s - th / 2;
    y = Math.max(10, Math.min(1070 - th, y)); x = Math.max(8, Math.min(SIZES[S.z].w - tw - 8, x));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    el.classList.add('tip');
  }
  function hideTip() { var tip = $('#tip'); if (tip) tip.classList.remove('on'); document.querySelectorAll('.tip').forEach(function (e) { if (e.id !== 'tip') e.classList.remove('tip'); }); tipPinned = null; }
  function wire() {
    var uc = $('#uc');
    uc.addEventListener('click', function (e) {
      var tg = e.target.closest('[data-toggle]');
      if (tg) { uc.classList.toggle('open'); hideTip(); return; }
      var tp = e.target.closest('[data-tip]');
      if (tp) { if (tipPinned === tp) { hideTip(); } else { hideTip(); showTip(tp); tipPinned = tp; } }
    });
    uc.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch' || tipPinned) return;
      var tp = e.target.closest('[data-tip]'); if (tp) { hideTip(); showTip(tp); }
    });
    uc.addEventListener('pointerout', function (e) {
      if (e.pointerType === 'touch' || tipPinned) return;
      if (e.target.closest('[data-tip]')) hideTip();
    });
    document.addEventListener('pointerdown', function (e) { if (tipPinned && !e.target.closest('[data-tip]')) hideTip(); }, true);
    if (S.tip !== null && !isNaN(S.tip)) { var el = document.querySelector('[data-tip="' + S.tip + '"]'); if (el) { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { showTip(el); }); } }
  }

  function render() { readHash(); build(); }
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', function () { if (!S.z) return; fit(); });
  render();
})();
