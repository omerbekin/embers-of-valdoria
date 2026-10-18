(function () {
  'use strict';
  /* TASLAK: tuccar (Odo) ekrani. Veri oyunun gercek item-tip ciktisindan (item-tooltip/data.js). Metinler Ingilizce. */
  var D = window.MX_DATA, IT = D.items, HEROES = [['h1', 'warrior'], ['h2', 'mage'], ['h3', 'archer'], ['h4', 'hexer']];
  var LINES = {
    idle: 'Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.',
    poor: 'That one is beyond your purse, friend. Come back after the next fight.',
    buy: 'A fine choice. Mind the edge, it bites.', sold: 'Pleasure doing business.', buyback: 'Changed your mind? Same price, no questions.',
    reroll: 'Fresh from the bottom of the cart. Have a look.', bagFull: 'Your bag is bursting, friend. Sell me something first.'
  };
  var SET = [['u17', 'u18', 'u5', 'u2', 'u32'], ['u35', 'u28', 'u21', 'u9', 'u29']];
  var NOTES = {
    a: 'A, Fiyat plakanın içinde sağ kenarda: tek sütun Gear > Hero plakası, altın ikon + sayı en sağda; satış kutusu bugünkü kesik çerçeve.',
    b: 'B, Fiyat plakanın dışında küçük etiket: aynı plaka, sağında ayrı altın etiket (yetmeyen kırmızı); satış kutusu ince tek satır.',
    c: 'C, İki sütun plaka: aynı plaka yan yana iki sütun, fiyat etiketi plakanın altında; satış kutusu geniş şerit.'
  };
  var BAG_SIZE = 8, REROLL = 15;
  var S, first = true;

  function parse() {
    var h = (location.hash || '#a').slice(1).split('&');
    return { v: /^[abc]$/.test(h[0]) ? h[0] : 'a', phone: h.indexOf('phone') >= 0, bb: h.indexOf('bb') >= 0, clean: h.indexOf('clean') >= 0 };
  }
  function mkItem(u, extra) { var d = IT[u]; return Object.assign({ key: u, d: d, uid: u + '_' + Math.random().toString(36).slice(2, 6) }, extra || {}); }
  function reset() {
    var o = parse();
    S = { v: o.v, phone: o.phone, tab: o.bb ? 'bb' : 'sell', gold: 120, set: 0, line: 'idle', hero: 'h1', sel: null, armed: false,
      wares: SET[0].map(function (u) { return mkItem(u, { sold: false }); }),
      bag: ['u41', 'u8', 'u13', 'u16', 'u33', 'u25', 'u3'].map(function (u) { return mkItem(u); }),
      bb: ['u37', 'u6', 'u12', 'u15'].map(function (u) { var i = mkItem(u); i.bbPrice = i.d.sell; return i; }),
      equip: { helm: mkItem('u15'), gloves: mkItem('u12'), boots: mkItem('u37') } };
    document.documentElement.classList.toggle('mk-clean', o.clean);
    document.documentElement.classList.toggle('short', o.phone);
  }

  // ---- yardimcilar
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var M = 'merchant/';
  var gi = function () { return '<img class="gi" src="' + M + 'ui/gold.webp" alt="">'; };
  var price = function (n, bad, t) { return '<span class="price' + (bad ? ' bad' : '') + '">' + gi() + (t || n) + '</span>'; };
  var rcol = function (it) { return it.d.color; };
  function sub(d) { var p = d.sub.split(' · '), f = p[0].split(' '); return { rar: f[0], kind: f.slice(1).join(' '), grip: p.slice(1, -1).join(' · '), il: p[p.length - 1].replace('Item level ', '') }; }
  function fmtN(v, f) { if (f === 'pct') return (Math.round(v * 1000) / 10) + '%'; if (f === 'dec') return String(Math.round(v * 10) / 10); return String(Math.round(v)); }
  function heroParts(hid, d) {
    var p = d.per[hid];
    if (p.no) return [{ t: p.no, dir: 'no' }];
    var H = D.heroes[hid];
    return Object.keys(p.d).slice(0, 3).map(function (k) { var pn = H.panel[k]; return { t: (p.d[k] > 0 ? '+' : '-') + fmtN(Math.abs(p.d[k]), pn.f) + ' ' + pn.l, dir: p.d[k] > 0 ? 'up' : 'down' }; });
  }
  function usable(it, hid) { return !it.d.per[hid].no; }
  // ---- gercek item ipucu v3 (item-tip.ts > itemTipNodes ile ayni DOM / sinif adlari)
  function tipHTML(it, ctx) {
    var d = it.d, s = sub(d), H = D.heroes[S.hero];
    var big = d.power ? '<div class="it-big"><strong>' + d.power + '</strong><span>Weapon power</span></div>' : (d.blockPct ? '<div class="it-big"><span class="it-big-n"><strong>' + d.blockPct + '%</strong></span><span>Block chance</span></div>' : '');
    var lineIco = function (l) { if (l.ico) return '<img class="it-ico" src="' + M + 'stat/' + l.ico + '.webp" alt="">'; var e = l.text.match(/(Fire|Ice|Holy|Arcane|Nature|Dark) damage/); return e ? '<img class="it-ico" src="' + M + 'el/' + e[1].toLowerCase() + '.webp" alt="">' : '<i class="it-dia"></i>'; };
    var TC = { C: '#b9a98a', B: '#8fb8e8', A: '#f0b04a' }, TO = { A: 0, B: 1, C: 2 };
    var imp = d.implicit ? '<div class="it-implicit">' + (d.implicit.ico ? '<img class="it-ico" src="' + M + 'stat/' + d.implicit.ico + '.webp" alt="">' : '') + '<span class="it-text">' + esc(d.implicit.text) + '</span></div>' : '';
    var fx = d.effect ? '<div class="it-effect"><strong>' + esc(d.effect.split(':')[0]) + '</strong><span>' + esc(d.effect.split(':').slice(1).join(':').trim()) + '</span></div>' : '';
    var rows = d.lines.slice().sort(function (a, b) { return (TO[a.tier] || 9) - (TO[b.tier] || 9); }).map(function (l) {
      var rail = '';
      if (l.range) { var r = l.range.split('–').map(Number), m = l.text.match(/\d+(\.\d+)?/); if (m && r[1] > r[0]) rail = '<span class="it-rail" style="--p:' + Math.max(0, Math.min(1, (Number(m[0]) - r[0]) / (r[1] - r[0]))) + '" title="Roll range ' + l.range + '"><i></i><strong></strong></span>'; else rail = '<span class="it-range">(' + l.range + ')</span>'; }
      return '<div class="it-line"><span class="it-tier" style="--tc:' + TC[l.tier] + '">' + l.tier + '</span>' + lineIco(l) + '<span class="it-text">' + esc(l.text) + '</span>' + rail + '</div>';
    }).join('');
    var unmet = H.level < d.req;
    var val = ctx === 'bag' ? d.sell : ctx === 'bb' ? d.sell : d.value;
    var valLbl = ctx === 'bag' ? 'sells for' : 'value';
    var heroes = HEROES.map(function (h) {
      var pa = heroParts(h[0], d), no = pa.some(function (p) { return p.dir === 'no'; }), HH = D.heroes[h[0]];
      return '<div class="it-hero' + (no ? ' no' : '') + '"><span class="it-face" style="background-image:url(' + M + 'av/' + h[1] + '.webp)"></span><strong class="it-hero-k">' + HH.name + '</strong>' +
        (no ? '' : '<span class="it-lv' + (HH.level < d.req ? ' unmet' : '') + '">Lv ' + HH.level + '</span>') +
        '<span class="it-hero-v">' + pa.map(function (p) { return '<span class="it-chip it-' + p.dir + '">' + esc(p.t) + '</span>'; }).join('') + '</span></div>';
    }).join('');
    return '<div class="it-card" style="--rc:' + d.color + '"><div class="it-head"><span class="it-medal"><img class="gr-svg gr-px" src="' + M + 'items/' + d.icon.split('/').pop() + '" alt=""></span>' +
      '<div class="it-id"><strong class="it-name">' + esc(d.name) + '</strong><div class="it-rib"><span>' + s.rar + ' ' + s.kind + '</span></div><div class="it-sub">' + (s.grip ? esc(s.grip) + ' · ' : '') + 'Item level ' + s.il + '</div>' + big + '</div></div>' +
      '<div class="it-main">' + fx + imp + '<div class="it-lines">' + rows + '</div></div>' +
      '<div class="it-reqrow"><span class="it-req' + (unmet ? ' unmet' : '') + '">' + (d.req > 1 ? 'Requires Level ' + d.req : '') + '</span><span class="it-val"><img class="it-coin" src="' + M + 'ui/gold.webp" alt=""><strong>' + val + '</strong><em>' + valLbl + '</em></span></div>' +
      '<div class="it-heroes">' + heroes + '</div></div>';
  }

  // ---- ItemTip (hover = imlecin yaninda, dokunma = sabitlenir)
  var tipKey = '', tipPinned = false, goneT;
  function tipBox() { var t = $('#tip'); if (!t) { t = document.createElement('div'); t.id = 'tip'; t.className = 'el-tip item-tip'; $('#stage').appendChild(t); } return t; }
  function kScale() { var st = $('#stage'); return st.getBoundingClientRect().width / st.offsetWidth || 1; }
  function tipPlace(cx, cy) {
    var t = tipBox(), st = $('#stage'), r = st.getBoundingClientRect(), k = kScale(), x = (cx - r.left) / k, y = (cy - r.top) / k, Wd = st.offsetWidth, Ht = st.offsetHeight, tw = t.offsetWidth, th = t.offsetHeight, gap = 18;
    var l = x + gap, tp = y + gap; if (l + tw > Wd - 6) l = x - gap - tw; if (tp + th > Ht - 6) tp = y - gap - th;
    t.style.left = Math.max(6, Math.min(Wd - tw - 6, l)) + 'px'; t.style.top = Math.max(6, Math.min(Ht - th - 6, tp)) + 'px';
  }
  function tipShow(key, html, cx, cy) {
    var t = tipBox(); clearTimeout(goneT);
    if (key !== tipKey || tipPinned) t.innerHTML = html;
    tipPinned = false; t.classList.remove('pinned'); tipKey = key;
    if (t.style.display === 'none') { t.style.display = ''; void t.offsetWidth; }
    t.classList.add('on'); tipPlace(cx, cy);
  }
  function tipHide() {
    var t = $('#tip'); if (!t) return; tipKey = ''; tipPinned = false; t.classList.remove('on', 'pinned'); clearTimeout(goneT);
    goneT = setTimeout(function () { if (!tipKey) t.style.display = 'none'; }, 200);
  }
  function tipPin(key, html, anchor, acts) {
    var t = tipBox(); clearTimeout(goneT);
    t.innerHTML = html;
    if (acts.length) { var row = document.createElement('div'); row.className = 'it-acts'; acts.forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.className = 'gr-btn sm' + (a.pri ? ' primary' : ''); b.innerHTML = a.label; b.disabled = !!a.dis; b.addEventListener('click', function (e) { e.stopPropagation(); tipHide(); a.run(); }); row.appendChild(b); }); t.querySelector('.it-card').appendChild(row); }
    tipKey = key; tipPinned = true; t.classList.add('pinned', 'on'); if (t.style.display === 'none') t.style.display = '';
    var st = $('#stage'), r = st.getBoundingClientRect(), k = kScale(), a = anchor.getBoundingClientRect(), ax = (a.left - r.left) / k, ay = (a.top - r.top) / k, aw = a.width / k, ah = a.height / k, Wd = st.offsetWidth, Ht = st.offsetHeight, tw = t.offsetWidth, th = t.offsetHeight, gap = 8, l, tp;
    if (ax + aw + gap + tw <= Wd - 6) { l = ax + aw + gap; tp = ay + ah / 2 - th / 2; } else if (ax - gap - tw >= 6) { l = ax - gap - tw; tp = ay + ah / 2 - th / 2; } else { l = ax + aw / 2 - tw / 2; tp = ay + ah + gap + th <= Ht - 6 ? ay + ah + gap : ay - gap - th; }
    t.style.left = Math.max(6, Math.min(Wd - tw - 6, l)) + 'px'; t.style.top = Math.max(6, Math.min(Ht - th - 6, tp)) + 'px';
  }

  // ---- parcalar
  function itemOf(kind, i) { return kind === 'ware' ? S.wares[i] : kind === 'bb' ? S.bb[i] : kind === 'bag' ? S.bag[i] : S.equip[i]; }
  function cell(it, kind, i, o) {
    o = o || {}; var d = it.d, rank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }[d.rarity];
    var on = S.sel && S.sel.kind === kind && S.sel.i === i;
    return '<div class="cellb' + (o.sold ? ' sold' : '') + '" data-tip="' + kind + ':' + i + '"' + (o.sold ? '' : ' data-sel="' + kind + ':' + i + '"') + (o.drag && !o.sold ? ' data-drag="' + kind + ':' + i + '"' : '') + '><div class="gr-item k' + rank + (on ? ' on' : '') + '" style="--rc:' + d.color + '">' + (rank >= 3 ? '<i class="gr-c2"></i><i class="gr-c3"></i>' : '') + '<img src="' + M + 'items/' + d.icon.split('/').pop() + '" alt="" draggable="false">' + (on ? '<i class="gr-dia"></i>' : '') + '</div></div>';
  }
  function wareState(it) { var p = it.d.value, poor = !it.sold && S.gold < p; return { p: p, poor: poor }; }
  var RR = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M19.5 4v4.5H15"/></svg>';
  var rrBtn = function () { return '<button class="rr" data-act="reroll" title="Reroll wares" aria-label="Reroll wares"' + (S.gold < REROLL ? ' disabled' : '') + '>' + RR + gi() + REROLL + '</button>'; };
  function head() { return '<div class="lhead"><div class="gtitle">Odo the Peddler</div><span class="gold"><img src="' + M + 'ui/gold.webp" alt="">' + S.gold + '</span></div><div class="shopsub">Travelling merchant · Ashford Village</div>'; }
  function talk() { return '<div class="talk"><div class="face" style="background-image:url(' + M + 'av/merchant.webp)"></div><div class="say">' + esc(LINES[S.line]) + '</div></div>'; }
  function tabs() { return '<div class="tabs" role="tablist"><button class="tab' + (S.tab === 'sell' ? ' on' : '') + '" data-tab="sell">Buy &amp; Sell</button><button class="tab' + (S.tab === 'bb' ? ' on' : '') + '" data-tab="bb">Buyback' + (S.bb.length ? '<span class="pt">' + S.bb.length + '</span>' : '') + '</button></div>'; }
  function sellbox() {
    var it = S.sel && S.sel.kind === 'bag' ? itemOf('bag', S.sel.i) : null, armed = !!(it && S.armed);
    return '<div class="sellbox' + (armed ? ' armed' : '') + '" data-drop="sell" data-act="sellzone"><img src="' + M + 'ui/gold.webp" alt=""><div><span class="st">' + (armed ? 'Sell ' + esc(it.d.name) : 'Sell to Odo') + '</span><span class="dim">' + (armed ? 'Tap here to sell for ' + it.d.sell + ' gold.' : 'Drag an item here from the bag to sell it for half its worth.') + '</span></div></div>';
  }
  function actbar() {
    var s = S.sel, h = '<span class="hint">Hover an item to inspect it. Double-click to buy.</span>';
    if (!s) return '<div class="act">' + h + '</div>';
    var it = itemOf(s.kind, s.i); if (!it || s.kind === 'equip') return '<div class="act">' + h + '</div>';
    if (s.kind === 'ware') { var sh = it.d.value - S.gold, full = S.bag.length >= BAG_SIZE; return '<div class="act">' + h + '<button class="gr-btn primary" data-act="buy"' + (sh > 0 || full ? ' disabled' : '') + '>' + (sh > 0 ? 'Need ' + sh + ' more' : full ? 'Bag full' : 'Buy · ' + it.d.value) + '</button></div>'; }
    if (s.kind === 'bb') { var sb = it.bbPrice - S.gold; return '<div class="act">' + h + '<button class="gr-btn primary" data-act="bback"' + (sb > 0 ? ' disabled' : '') + '>' + (sb > 0 ? 'Need ' + sb + ' more' : 'Buy back · ' + it.bbPrice) + '</button></div>'; }
    return '<div class="act">' + h + '<button class="gr-btn primary" data-act="sell">Sell · ' + it.d.sell + '</button></div>';
  }
  var BB_EMPTY = '<div class="empty-t">Sold something by mistake? It waits here until you leave.</div>';

  // ---- Gear > Hero plakasi (character-panel.ts slotsBlock ile ayni DOM / sinif adlari)
  var SLOTLBL = { weapon: 'Weapon', offhand: 'Offhand', helm: 'Head', armor: 'Chest', gloves: 'Hands', boots: 'Feet', trinket: 'Ring' };
  var SLOTICO = { weapon: 'weapon', offhand: 'offhand', helm: 'helm', armor: 'armor', gloves: 'gloves', boots: 'boots', trinket: 'trinket' };
  var goldNum = function (t) { return esc(t).replace(/[+\-]?\d+(\.\d+)?%?/, function (m) { return '<b>' + m + '</b>'; }); };
  function plate(it, kind, i, o) {
    o = o || {};
    var d = it.d, on = S.sel && S.sel.kind === kind && S.sel.i === i, slot = d.slot, main = '';
    if (d.power) main = '<span class="gp-main">Power <b>' + d.power + '</b></span>';
    else if (d.blockPct) main = '<span class="gp-main">Block <b>' + d.blockPct + '%</b></span>';
    else if (d.implicit) main = '<span class="gp-main">' + goldNum(d.implicit.text) + '</span>';
    var aff = d.lines.slice(0, 2).map(function (l) { return '<span class="gp-aff">' + esc(l.text) + '</span>'; }).join('');
    var attrs = ' data-tip="' + kind + ':' + i + '"' + (o.sold ? '' : ' data-sel="' + kind + ':' + i + '"') + (o.drag && !o.sold ? ' data-drag="' + kind + ':' + i + '"' : '');
    return '<button type="button" class="gr-slot gr-plate' + (on ? ' on' : '') + (o.sold ? ' sold' : '') + '" style="--rc:' + d.color + '"' + attrs + '>' +
      '<span class="gp-ico"><img class="gr-svg gr-px" src="' + M + 'items/' + d.icon.split('/').pop() + '" alt="" draggable="false"></span>' +
      '<div class="gr-slot-text gp-tx"><div class="gp-lbl"><img src="' + M + 'slot/' + SLOTICO[slot] + '.webp" alt="">' + SLOTLBL[slot] + '</div><div class="gr-slot-name">' + esc(d.name) + '</div>' +
      '<div class="gp-l2">' + main + '<span class="gp-il">iL <b>' + sub(d).il + '</b></span>' + aff + '</div></div>' + (o.inside || '') + '</button>';
  }
  function emptyPlate(slot) {
    return '<button type="button" class="gr-slot gr-plate empty" style="--rc:#5b4a33"><span class="gp-ico"><img class="gr-svg" style="opacity:.22;filter:grayscale(1)" src="' + M + 'slot/' + SLOTICO[slot] + '.webp" alt=""></span><div class="gr-slot-text gp-tx"><div class="gp-lbl"><img src="' + M + 'slot/' + SLOTICO[slot] + '.webp" alt="">' + SLOTLBL[slot] + '</div><div class="gr-slot-name">Empty</div></div></button>';
  }
  // fiyat: plakanin yanina eklenen TEK sey (altin ikonu + sayi; yetmeyen kirmizi)
  function ptag(p, poor, cls) { return '<span class="wp-price' + (poor ? ' bad' : '') + (cls ? ' ' + cls : '') + '">' + gi() + p + '</span>'; }
  function wareEntry(w, i, kind) {
    var sold = kind === 'ware' && w.sold, p = kind === 'bb' ? w.bbPrice : w.d.value, poor = !sold && S.gold < p;
    var tag = sold ? '<span class="wp-price">SOLD</span>' : ptag(p, poor);
    if (S.v === 'a') return '<div class="we">' + plate(w, kind, i, { sold: sold, drag: true, inside: tag }) + '</div>';
    return '<div class="we out">' + plate(w, kind, i, { sold: sold, drag: true }) + tag + '</div>';
  }

  // ---- varyantlar: plaka ve ipucu ayni; yalniz fiyatin yeri / sutun sayisi / satis kutusu
  function paneAny() {
    var body;
    if (S.tab === 'sell') body = '<div class="sec">Wares <span class="cnt">' + S.wares.filter(function (w) { return !w.sold; }).length + ' / ' + S.wares.length + '</span>' + rrBtn() + '</div><div class="wares">' + S.wares.map(function (w, i) { return wareEntry(w, i, 'ware'); }).join('') + '</div>';
    else body = '<div class="sec">Sold this visit <span class="cnt">' + S.bb.length + '</span></div>' + (S.bb.length ? '<div class="wares">' + S.bb.map(function (w, i) { return wareEntry(w, i, 'bb'); }).join('') + '</div>' : BB_EMPTY);
    return body + (S.tab === 'sell' ? sellbox() : '') + actbar();
  }

  // ---- sag: Gear defteri (Hero sekmesi: ayni plakalar; degismedi, temsili)
  function ledger() {
    var slots = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'trinket'];
    var pl = slots.map(function (s) { var e = S.equip[s]; return e ? plate(e, 'equip', s) : emptyPlate(s); }).join('');
    var bag = ''; for (var i = 0; i < BAG_SIZE; i++) { var it = S.bag[i]; bag += it ? '<div class="cw">' + cell(it, 'bag', i, { drag: true }) + price(it.d.sell, false) + '</div>' : '<div class="cw"><div class="empty"></div></div>'; }
    var H = D.heroes[S.hero];
    return '<section class="panel ledger" data-drop="bag"><div class="lhead"><div class="gtitle">Gear</div><div class="htabs"><button class="htab on">Hero</button><button class="htab">Sheet</button></div></div>' +
      '<div class="lbody"><div class="marks">' + HEROES.map(function (h) { return '<button class="mark' + (S.hero === h[0] ? ' on' : '') + '" data-hero="' + h[0] + '" style="background-image:url(' + M + 'av/' + h[1] + '.webp)" title="' + D.heroes[h[0]].name + '"></button>'; }).join('') + '</div>' +
      '<div class="page"><div class="hname">' + H.name + ' <span class="meta">Lv ' + H.level + '</span></div><div class="slotcol">' + pl + '</div></div><div class="spine"></div>' +
      '<div class="page"><div class="sec">Bag <span class="cnt">' + S.bag.length + ' / ' + BAG_SIZE + '</span></div><div class="bag">' + bag + '</div><div class="meta">Prices under items are what Odo pays. Double-click an item to sell it.</div></div></div></section>';
  }
  var X = '<button class="xbtn" title="Leave the stall" aria-label="Leave"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

  function render() {
    tipHide();
    var st = $('#stage');
    st.className = (S.phone ? 'phone' : 'desk') + ' v' + S.v + (first ? ' enter' : '');
    var inner = head() + talk() + tabs() + paneAny();
    st.innerHTML = '<div class="bgimg"></div><div class="ov"></div><div class="pair"><section class="panel stall" data-drop="stall">' + inner + '</section>' + ledger() + '</div>' + X;
    fit();
    if (first) { first = false; setTimeout(function () { st.classList.remove('enter'); }, 700); }
    strip();
  }
  function fit() {
    var st = $('#stage'), w = S.phone ? 844 : 1920, h = S.phone ? 390 : 1080, k = Math.min(innerWidth / w, innerHeight / h);
    st.style.transform = 'scale(' + k + ')'; st.style.left = Math.max(0, (innerWidth - w * k) / 2) + 'px'; st.style.top = Math.max(0, (innerHeight - h * k) / 2) + 'px';
  }
  addEventListener('resize', fit);
  function strip() {
    var b = function (l, on, a) { return '<button class="' + (on ? 'on' : '') + '" ' + a + '>' + l + '</button>'; };
    $('#mk-strip').innerHTML = '<b>MOCKUP</b>Merchant ' + b('A Price inside', S.v === 'a', 'data-v="a"') + b('B Price tag', S.v === 'b', 'data-v="b"') + b('C Two columns', S.v === 'c', 'data-v="c"') + '<span class="sep"></span>' + b('Desktop', !S.phone, 'data-d="desk"') + b('Phone 844x390', S.phone, 'data-d="phone"') + '<span class="sep"></span>' + b('Reset', false, 'data-reset="1"') + '<span class="sep"></span><span class="note">' + NOTES[S.v] + '</span>';
  }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { e.hidden = true; }, 1700); }

  // ---- islemler
  function select(kind, i) { if (S.sel && S.sel.kind === kind && S.sel.i === i) { S.sel = null; S.armed = false; return; } S.sel = { kind: kind, i: i }; S.armed = kind === 'bag'; }
  function doBuy(i, equip) {
    var w = S.wares[i]; if (!w || w.sold) return;
    if (S.gold < w.d.value) { S.line = 'poor'; toast('Not enough gold'); return render(); }
    if (S.bag.length >= BAG_SIZE) { S.line = 'bagFull'; return render(); }
    S.gold -= w.d.value; w.sold = true; var n = mkItem(w.key); S.bag.push(n); S.line = 'buy'; S.sel = null; toast(w.d.name + ' added to your bag'); render();
  }
  function doBack(i) { var e = S.bb[i]; if (!e) return; if (S.gold < e.bbPrice) { S.line = 'poor'; return render(); } if (S.bag.length >= BAG_SIZE) { S.line = 'bagFull'; return render(); } S.gold -= e.bbPrice; S.bb.splice(i, 1); S.bag.push(mkItem(e.key)); S.line = 'buyback'; S.sel = null; toast(e.d.name + ' bought back'); render(); }
  function doSell(i) { var it = S.bag[i]; if (!it) return; S.gold += it.d.sell; S.bag.splice(i, 1); var b = mkItem(it.key); b.bbPrice = it.d.sell; S.bb.unshift(b); S.line = 'sold'; S.sel = null; S.armed = false; toast('Sold ' + it.d.name + ' for ' + it.d.sell + ' gold'); render(); }
  function doReroll() { if (S.gold < REROLL) return; S.gold -= REROLL; S.set = 1 - S.set; S.wares = SET[S.set].map(function (u) { return mkItem(u, { sold: false }); }); S.line = 'reroll'; S.sel = null; render(); }

  // ---- olaylar
  var lastType = 'mouse', lastTap = { k: '', t: 0 }, drag = null, suppress = false;
  function keyOf(el) { var t = el.closest('[data-tip]'); return t ? t.dataset.tip : ''; }
  function itemFromKey(key) { var p = key.split(':'); return itemOf(p[0], isNaN(+p[1]) ? p[1] : +p[1]); }
  function acts(key) {
    var p = key.split(':'), kind = p[0], i = +p[1], it = itemFromKey(key), a = [];
    if (kind === 'ware') { var sh = it.d.value - S.gold, full = S.bag.length >= BAG_SIZE; a.push({ label: sh > 0 ? 'Need ' + sh + ' more' : full ? 'Bag full' : 'Buy · ' + it.d.value, dis: sh > 0 || full, pri: true, run: function () { doBuy(i); } }); }
    else if (kind === 'bb') { var s2 = it.bbPrice - S.gold; a.push({ label: s2 > 0 ? 'Need ' + s2 + ' more' : 'Buy back · ' + it.bbPrice, dis: s2 > 0, pri: true, run: function () { doBack(i); } }); }
    else if (kind === 'bag') a.push({ label: 'Sell · ' + it.d.sell, pri: false, run: function () { doSell(i); } });
    return a;
  }
  document.addEventListener('pointerdown', function (e) {
    lastType = e.pointerType || 'mouse';
    var d = e.target.closest('#stage [data-drag]'); if (d && !e.button) drag = { key: d.dataset.drag, x: e.clientX, y: e.clientY, on: false };
    if (lastType === 'touch' && tipPinned && !e.target.closest('#tip')) { /* boslukta dokunus: kapat */ if (!e.target.closest('[data-tip]')) tipHide(); }
  });
  document.addEventListener('mouseover', function (e) {
    if (lastType === 'touch' || drag) return;
    var k = e.target.closest ? keyOf(e.target) : ''; if (!k || !e.target.closest('#stage')) return;
    var it = itemFromKey(k); if (!it) return; var kind = k.split(':')[0];
    tipShow(k, tipHTML(it, kind === 'equip' ? 'equip' : kind), e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function (e) { if (drag && drag.on) { var g = $('#ghost'); g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; return; } if (tipKey && !tipPinned) tipPlace(e.clientX, e.clientY); });
  document.addEventListener('mouseout', function (e) { if (lastType === 'touch') return; var f = e.target.closest ? e.target.closest('[data-tip]') : null; if (f && !(e.relatedTarget && f.contains(e.relatedTarget)) && !tipPinned) tipHide(); });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      drag.on = true; tipHide(); var it = itemFromKey(drag.key), g = $('#ghost'); g.innerHTML = '<img src="' + M + 'items/' + it.d.icon.split('/').pop() + '" alt="">'; g.hidden = false;
      var st = $('#stage'); st.classList.add('dragging'); st.style.setProperty('--dragc', it.d.color);
      var sell = drag.key.split(':')[0] === 'bag'; st.querySelectorAll('[data-drop]').forEach(function (n) { n.classList.toggle('drop-ok', sell ? n.dataset.drop === 'sell' || n.dataset.drop === 'stall' : n.dataset.drop === 'bag'); });
    }
    var g2 = $('#ghost'); g2.style.left = e.clientX + 'px'; g2.style.top = e.clientY + 'px';
  });
  function endDrag(e, cancel) {
    if (!drag) return; var d = drag; drag = null; if (!d.on) return;
    suppress = true; setTimeout(function () { suppress = false; }, 0);
    $('#ghost').hidden = true; var st = $('#stage'); st.classList.remove('dragging'); st.querySelectorAll('.drop-ok').forEach(function (n) { n.classList.remove('drop-ok'); });
    if (cancel) return;
    var under = document.elementFromPoint(e.clientX, e.clientY), tg = under && under.closest('[data-drop]'), p = d.key.split(':'), i = +p[1]; if (!tg) return;
    if (p[0] === 'bag' && (tg.dataset.drop === 'sell' || tg.dataset.drop === 'stall')) return doSell(i);
    if (p[0] === 'ware' && tg.dataset.drop === 'bag') return doBuy(i);
    if (p[0] === 'bb' && tg.dataset.drop === 'bag') return doBack(i);
  }
  document.addEventListener('pointerup', function (e) { endDrag(e, false); });
  document.addEventListener('pointercancel', function (e) { endDrag(e, true); });

  document.addEventListener('click', function (e) {
    if (suppress) return; var t = e.target;
    var sv = t.closest('[data-v]'); if (sv) { S.v = sv.dataset.v; history.replaceState(null, '', '#' + S.v + (S.phone ? '&phone' : '') + (S.tab === 'bb' ? '&bb' : '')); first = true; return render(); }
    var sd = t.closest('[data-d]'); if (sd) { S.phone = sd.dataset.d === 'phone'; document.documentElement.classList.toggle('short', S.phone); history.replaceState(null, '', '#' + S.v + (S.phone ? '&phone' : '')); first = true; return render(); }
    if (t.closest('[data-reset]')) { reset(); first = true; return render(); }
    if (!t.closest('#stage') || t.closest('#tip')) return;
    var tab = t.closest('[data-tab]'); if (tab) { if (S.tab !== tab.dataset.tab) { S.tab = tab.dataset.tab; S.sel = null; S.line = S.tab === 'bb' ? 'buyback' : 'idle'; render(); } return; }
    var hm = t.closest('[data-hero]'); if (hm) { S.hero = hm.dataset.hero; return render(); }
    var act = t.closest('[data-act]');
    if (act && !act.disabled) {
      var a = act.dataset.act, s = S.sel;
      if (a === 'reroll') return doReroll();
      if (a === 'quick') return doBuy(+act.dataset.i);
      if (a === 'buy' && s) return doBuy(s.i);
      if (a === 'bback') return doBack(act.dataset.i !== undefined ? +act.dataset.i : s.i);
      if (a === 'sell' && s) return doSell(s.i);
      if (a === 'sellzone') { if (S.sel && S.sel.kind === 'bag') return doSell(S.sel.i); toast('Select an item from your bag first'); return; }
    }
    if (act && act.disabled) return;
    var se = t.closest('[data-sel]');
    if (se) {
      var key = se.dataset.sel, p = key.split(':'), kind = p[0], i = +p[1], now = performance.now(), isTouch = lastType === 'touch';
      var dbl = lastTap.k === key && now - lastTap.t < 380; lastTap = { k: key, t: now };
      if (dbl) { lastTap = { k: '', t: 0 }; if (kind === 'ware') return doBuy(i); if (kind === 'bb') return doBack(i); if (kind === 'bag') return doSell(i); }
      if (isTouch && (kind !== 'equip')) { select(kind, i); var it = itemFromKey(key); S.line = kind === 'ware' && S.gold < it.d.value ? 'poor' : 'idle'; render(); var anchor = $('[data-sel="' + key + '"]'); if (anchor) tipPin(key, tipHTML(it, kind), anchor, acts(key)); return; }
      var it2 = itemFromKey(key); select(kind, i); S.line = kind === 'ware' && S.sel && S.gold < it2.d.value ? 'poor' : 'idle';
      return render();
    }
    if (t.closest('.xbtn')) toast('Leave the stall (mockup)');
  });

  addEventListener('hashchange', function () { var o = parse(); S.v = o.v; S.phone = o.phone; S.tab = o.bb ? 'bb' : S.tab; document.documentElement.classList.toggle('short', S.phone); document.documentElement.classList.toggle('mk-clean', o.clean); first = true; render(); });
  reset(); render();
})();
