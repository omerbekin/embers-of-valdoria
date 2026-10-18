(function () {
  'use strict';
  /* TASLAK: Merchant (Odo) ekran yeniden tasarimi. Veri ornektir; metin Ingilizce (oyun ici). */
  var HEROES = [
    { id: 'warrior', name: 'Warrior' }, { id: 'hexer', name: 'Hexer' }, { id: 'archer', name: 'Archer' }, { id: 'mage', name: 'Mage' }
  ];
  var LINES = {
    idle: 'Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.',
    poor: 'That one is beyond your purse, friend. Come back after the next fight.',
    buy: 'A fine choice. Mind the edge, it bites.',
    sold: 'Pleasure doing business.',
    buyback: 'Changed your mind? Same price, no questions.',
    reroll: 'Fresh from the bottom of the cart. Have a look.',
    bagFull: 'Your bag is bursting, friend. Sell me something first.',
    empty: 'Nothing left on the stall that suits your company.'
  };
  var SLOTLBL = { weapon: 'Weapon', offhand: 'Off-hand', helm: 'Helm', chest: 'Chest', gloves: 'Hands', boots: 'Boots', trinket: 'Trinket' };
  var RAR = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
  var BAG_SIZE = 12;

  function W(id, name, r, slot, fam, il, stat, val, aff, price, fit) { return { id: id, name: name, r: r, slot: slot, fam: fam, il: il, stat: stat, val: val, aff: aff, price: price, fit: fit }; }
  var SET0 = [
    W('dane_axe', 'Dane Axe of the Bear', 'epic', 'weapon', 'Axes · Two-handed', 10, 'Weapon power', '22', [['Crit multiplier', '+14%'], ['Speed', '+2%'], ['Strength', '+9']], 148,
      { warrior: ['up', '+12', 'Weapon power'], hexer: ['no'], archer: ['no'], mage: ['no'] }),
    W('kettle_hat', 'Kettle Hat of the Hawk', 'rare', 'helm', 'Heavy helm', 9, 'Max HP', '46', [['Armor', '+11'], ['Accuracy', '+3%']], 62,
      { warrior: ['up', '+14', 'Max HP'], hexer: ['no'], archer: ['up', '+6', 'Max HP'], mage: ['no'] }),
    W('hobnailed_boots', 'Hobnailed Boots', 'uncommon', 'boots', 'Heavy boots', 4, 'Armor', '9', [['Speed', '+2%']], 18,
      { warrior: ['eq', '', 'Same as worn'], hexer: ['no'], archer: ['down', '-2', 'Armor'], mage: ['no'] }),
    W('oak_shield', 'Oak Tower Shield', 'uncommon', 'offhand', 'Shields', 6, 'Armor', '17', [['Block chance', '+6%']], 34,
      { warrior: ['up', '+9', 'Armor'], hexer: ['no'], archer: ['no'], mage: ['no'] }),
    W('pilgrims_token', "Pilgrim's Token", 'uncommon', 'trinket', 'Charm', 8, 'MP regen', '+1.2', [['Luck', '+4%']], 29,
      { warrior: ['no'], hexer: ['up', '+0.7', 'MP regen'], archer: ['up', '+0.4', 'MP regen'], mage: ['up', '+0.7', 'MP regen'] })
  ];
  var SET1 = [
    W('great_helm', 'Great Helm', 'epic', 'helm', 'Heavy helm', 10, 'Max HP', '58', [['Armor', '+16'], ['Block chance', '+2%']], 120,
      { warrior: ['up', '+26', 'Max HP'], hexer: ['no'], archer: ['no'], mage: ['no'] }),
    W('leather_gloves', 'Leather Gloves', 'common', 'gloves', 'Light gloves', 5, 'Accuracy', '+4%', [], 9,
      { warrior: ['eq', '', 'Same as worn'], hexer: ['up', '+4%', 'Accuracy'], archer: ['up', '+4%', 'Accuracy'], mage: ['up', '+4%', 'Accuracy'] }),
    W('swift_sabatons', 'Swift Sabatons', 'epic', 'boots', 'Heavy boots', 10, 'Evasion', '+7%', [['Speed', '+5%'], ['Armor', '+8']], 96,
      { warrior: ['up', '+7%', 'Evasion'], hexer: ['no'], archer: ['up', '+7%', 'Evasion'], mage: ['no'] }),
    W('copper_ring', 'Copper Ring', 'common', 'trinket', 'Ring', 4, 'Max MP', '+8', [], 7,
      { warrior: ['no'], hexer: ['up', '+8', 'Max MP'], archer: ['up', '+8', 'Max MP'], mage: ['up', '+8', 'Max MP'] }),
    W('ranger_boots', 'Ranger Boots', 'uncommon', 'boots', 'Light boots', 6, 'Evasion', '+4%', [['Speed', '+3%']], 22,
      { warrior: ['no'], hexer: ['down', '-1%', 'Evasion'], archer: ['up', '+4%', 'Evasion'], mage: ['up', '+4%', 'Evasion'] })
  ];
  var BAGSTART = [
    W('iron_buckler', 'Iron Buckler', 'rare', 'offhand', 'Shields', 2, 'Block chance', '8%', [['Armor', '+17']], 42, { warrior: ['down', '-9', 'Armor'], hexer: ['no'], archer: ['no'], mage: ['no'] }),
    W('quilted_jack', 'Quilted Jack', 'common', 'chest', 'Light armor', 3, 'Armor', '8', [], 16, { warrior: ['down', '-6', 'Armor'], hexer: ['up', '+8', 'Armor'], archer: ['up', '+8', 'Armor'], mage: ['up', '+8', 'Armor'] }),
    W('soft_boots', 'Soft Boots', 'common', 'boots', 'Light boots', 2, 'Evasion', '+2%', [], 8, { warrior: ['no'], hexer: ['eq', '', 'Same as worn'], archer: ['down', '-2%', 'Evasion'], mage: ['up', '+2%', 'Evasion'] }),
    W('wolf_tooth', 'Wolf Tooth', 'uncommon', 'trinket', 'Charm', 5, 'Crit chance', '+3%', [['Evasion', '+2%']], 24, { warrior: ['up', '+3%', 'Crit chance'], hexer: ['up', '+3%', 'Crit chance'], archer: ['up', '+3%', 'Crit chance'], mage: ['up', '+3%', 'Crit chance'] }),
    W('arming_sword', 'Arming Sword', 'uncommon', 'weapon', 'Swords', 4, 'Weapon power', '13', [['Accuracy', '+2%']], 30, { warrior: ['down', '-9', 'Weapon power'], hexer: ['no'], archer: ['no'], mage: ['no'] }),
    W('hex_doll', 'Hex Doll', 'rare', 'trinket', 'Charm', 7, 'Hex power', '+9%', [['MP regen', '+0.6']], 56, { warrior: ['no'], hexer: ['up', '+9%', 'Hex power'], archer: ['no'], mage: ['no'] }),
    W('iron_cap', 'Iron Cap', 'common', 'helm', 'Heavy helm', 3, 'Max HP', '22', [], 14, { warrior: ['down', '-24', 'Max HP'], hexer: ['no'], archer: ['up', '+22', 'Max HP'], mage: ['no'] })
  ];
  var BBSTART = [
    W('riding_boots', 'Riding Boots', 'common', 'boots', 'Light boots', 3, 'Evasion', '+3%', [], 5, { warrior: ['no'], hexer: ['up', '+3%', 'Evasion'], archer: ['up', '+3%', 'Evasion'], mage: ['up', '+3%', 'Evasion'] }),
    W('bone_staff', 'Bone Staff', 'uncommon', 'weapon', 'Staves · Two-handed', 5, 'Magic power', '15', [['Max MP', '+6']], 17, { warrior: ['no'], hexer: ['up', '+4', 'Magic power'], archer: ['no'], mage: ['up', '+6', 'Magic power'] }),
    W('twin_stilettos', 'Twin Stilettos', 'rare', 'weapon', 'Daggers', 8, 'Weapon power', '18', [['Crit chance', '+5%'], ['Speed', '+4%']], 53, { warrior: ['no'], hexer: ['no'], archer: ['up', '+5', 'Weapon power'], mage: ['no'] }),
    W('leather_gloves', 'Leather Gloves', 'common', 'gloves', 'Light gloves', 5, 'Accuracy', '+4%', [], 4, { warrior: ['eq', '', 'Same as worn'], hexer: ['up', '+4%', 'Accuracy'], archer: ['up', '+4%', 'Accuracy'], mage: ['up', '+4%', 'Accuracy'] })
  ];

  var NOTES = {
    a: 'A, Plaka listesi + yana yapışık ayrıntı: mallar satır plakası (ad, güç, fiyat, kim kullanabilir), seçilen malın Band ipucu sağda sabit; en çok bilgi.',
    b: 'B, Hücre ızgarası + altta geniş ayrıntı: mallar bugünkü gibi kare hücre (ad + fiyat altta), ayrıntı alttaki geniş Band; envantere en yakın.',
    c: 'C, Odo vitrini: solda Odo tam boy + konuşma balonu, mallar dikey kartlar, ayrıntı ve kahraman uyumu altta; en çok atmosfer.'
  };

  // ---- durum
  var S, firstRender = true;
  function parseHash() {
    var h = (location.hash || '#a').slice(1).split('&');
    var v = h[0];
    var o = { v: (v === 'b' || v === 'c') ? v : 'a', phone: false, bb: false, sel: -1, clean: false };
    h.slice(1).forEach(function (p) {
      if (p === 'phone') o.phone = true; else if (p === 'bb') o.bb = true; else if (p === 'clean') o.clean = true; else if (p.indexOf('sel=') === 0) o.sel = +p.slice(4);
    });
    return o;
  }
  function resetState() {
    var o = parseHash();
    S = {
      v: o.v, phone: o.phone, tab: o.bb ? 'bb' : 'sell', gold: 74, set: 0, rerolls: 0, rerollCost: 15, line: 'idle',
      wares: SET0.map(function (w, i) { return Object.assign({ uid: 'w' + i, sold: false }, w); }),
      bag: BAGSTART.map(function (w, i) { return Object.assign({ uid: 'b' + i }, w, { worth: w.price }); }),
      bb: BBSTART.map(function (w, i) { return Object.assign({ uid: 'bb' + i }, w); }),
      sel: null, hero: null, armed: false
    };
    if (o.sel >= 0 && S.tab === 'sell') select('ware', o.sel, true);
    document.documentElement.classList.toggle('mk-clean', o.clean);
  }
  function sellPrice(it) { return Math.max(1, Math.floor((it.worth || it.price) / 2)); }

  // ---- yardimcilar
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function gi() { return '<img class="gi" src="merchant/ui/gold.webp" alt="">'; }
  function itemOf(sel) {
    if (!sel) return null;
    return sel.kind === 'ware' ? S.wares[sel.i] : sel.kind === 'bb' ? S.bb[sel.i] : S.bag[sel.i];
  }
  function select(kind, i, quiet) {
    if (S.sel && S.sel.kind === kind && S.sel.i === i && !quiet) { S.sel = null; S.hero = null; return; }
    S.sel = { kind: kind, i: i };
    var it = itemOf(S.sel);
    var ok = HEROES.filter(function (h) { return it.fit[h.id][0] !== 'no'; });
    S.hero = ok.length ? ok[0].id : null;
    if (S.hero) { var up = ok.filter(function (h) { return it.fit[h.id][0] === 'up'; }); if (up.length) S.hero = up[0].id; }
    S.armed = kind === 'bag';
  }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { e.hidden = true; }, 1700); }

  // ---- parcalar
  function cell(it, o) {
    o = o || {};
    return '<button type="button" class="cell' + (o.on ? ' on' : '') + (o.sold ? ' sold' : '') + '" data-r="' + it.r + '"' + (o.sel ? ' data-sel="' + o.sel + '"' : '') + (o.drag ? ' data-drag="' + o.drag + '"' : '') + ' aria-label="' + esc(it.name) + '"><img src="merchant/items/' + it.id + '.webp" alt="" draggable="false">' + (o.il ? '<span class="il">' + it.il + '</span>' : '') + '</button>';
  }
  function price(n, bad, label) { return '<span class="price' + (bad ? ' bad' : '') + '">' + gi() + (label || n) + '</span>'; }
  function pips(it) {
    return '<span class="pips">' + HEROES.map(function (h) {
      var f = it.fit[h.id][0];
      return '<span class="pip' + (f === 'no' ? ' no' : '') + (f === 'up' ? ' up' : '') + '" style="background-image:url(merchant/av/' + h.id + '.webp)" title="' + h.name + (f === 'no' ? " can't use" : '') + '"></span>';
    }).join('') + '</span>';
  }
  function bagFull() { return S.bag.length >= BAG_SIZE; }

  function plate(it, i) {
    var poor = !it.sold && S.gold < it.price;
    var on = S.sel && S.sel.kind === 'ware' && S.sel.i === i;
    return '<div class="pl' + (on ? ' on' : '') + (it.sold ? ' sold' : '') + '" data-r="' + it.r + '"' + (it.sold ? '' : ' data-sel="ware:' + i + '" data-drag="ware:' + i + '"') + '>' +
      cell(it, { il: false }) +
      '<div class="tx"><div class="nm rl">' + esc(it.name) + '</div>' +
      '<div class="l2"><span class="chip">' + SLOTLBL[it.slot] + '</span><span class="meta"><b>' + it.val + '</b> ' + it.stat + '</span><span class="meta">iL ' + it.il + '</span></div>' +
      '<div class="l3"><span class="aff" style="flex:1">' + (it.aff.length ? it.aff.map(function (a) { return a[1] + ' ' + a[0]; }).join(' · ') : 'No bonus') + '</span>' + pips(it) + '</div></div>' +
      '<div class="pr">' + (it.sold ? '<span class="price">SOLD</span>' : price(it.price, poor)) + (poor ? '<span class="need">Need ' + (it.price - S.gold) + ' more</span>' : '') + '</div></div>';
  }
  function bbPlate(it, i) {
    var poor = S.gold < it.price;
    var on = S.sel && S.sel.kind === 'bb' && S.sel.i === i;
    return '<div class="pl' + (on ? ' on' : '') + '" data-r="' + it.r + '" data-sel="bb:' + i + '" data-drag="bb:' + i + '">' + cell(it) +
      '<div class="tx"><div class="nm rl">' + esc(it.name) + '</div><div class="l2"><span class="chip">' + SLOTLBL[it.slot] + '</span><span class="meta"><b>' + it.val + '</b> ' + it.stat + '</span><span class="meta">iL ' + it.il + '</span></div>' +
      '<div class="l3"><span class="aff" style="flex:1">Sold this visit</span>' + pips(it) + '</div></div>' +
      '<div class="pr">' + price(it.price, poor) + (poor ? '<span class="need">Need ' + (it.price - S.gold) + ' more</span>' : '') + '</div></div>';
  }

  // Band ipucu (docked): baslik seridi + ozellikler + kahraman uyumu
  function band(it, two) {
    var lines = it.aff.map(function (a) { return '<div class="bt-ln"><span class="dia"></span><span class="tx"><span class="k">' + a[0] + '</span> <span class="n">' + a[1] + '</span></span></div>'; }).join('') || '<div class="bt-ln"><span class="dia"></span><span class="tx" style="color:#8a7d66">No extra bonuses</span></div>';
    var rows = HEROES.map(function (h) {
      var f = it.fit[h.id], st = f[0];
      var tag = st === 'up' ? '<span class="tag up">Upgrade</span>' : st === 'down' ? '<span class="tag down">Worse</span>' : st === 'eq' ? '<span class="tag eq">Same</span>' : '';
      var val = st === 'no' ? "Can't use this" : st === 'eq' ? 'Same as worn' : '<b class="' + (st === 'up' ? 'up' : 'down') + '">' + f[1] + '</b> ' + f[2];
      return '<div class="hrow ' + st + (S.hero === h.id ? ' pick' : '') + '"' + (st === 'no' ? '' : ' data-pick="' + h.id + '"') + '><div class="hav" style="background-image:url(merchant/av/' + h.id + '.webp)"></div><div class="hn">' + h.name + '</div><div class="hv">' + val + '</div>' + tag + '</div>';
    }).join('');
    var head = '<div class="bt-head"><div class="bt-medal ico" style="background-image:url(merchant/items/' + it.id + '.webp)"></div><div class="bt-ht"><div class="bt-kind">' + RAR[it.r] + ' · ' + SLOTLBL[it.slot] + ' · iL ' + it.il + '</div><div class="bt-title">' + esc(it.name) + '</div></div><div class="bt-aside"><div class="bt-big">' + it.val + '<small>' + it.stat + '</small></div></div></div>';
    var hl = '<div class="bt-body" style="padding-bottom:4px"><div class="bt-kind" style="opacity:.7">Who can use it</div></div>';
    var foot = '<div class="bt-foot"><span class="dia"></span><span class="tx">' + it.fam + '</span><span class="n" style="color:var(--g-gold);font-family:var(--g-disp)">' + gi() + ' worth ' + (it.worth || it.price) + '</span></div>';
    if (two) {
      foot = '<div class="bt-foot"><span class="dia"></span><span class="tx">' + it.fam + ' · ' + gi() + ' worth ' + (it.worth || it.price) + '</span>' + actions(it, true) + '</div>';
      return '<div class="bt" data-r="' + it.r + '" style="--ac:var(--rc)">' + head + '<div class="bt-div"></div><div class="bt-two"><div><div class="bt-body" style="padding-bottom:4px"><div class="bt-kind" style="opacity:.7">Bonuses</div></div><div class="bt-body" style="padding-top:2px">' + lines + '</div></div><div class="col2">' + hl + '<div class="heroes" style="padding:0 6px 8px">' + rows + '</div></div></div>' + foot + '</div>';
    }
    return '<div class="bt" data-r="' + it.r + '" style="--ac:var(--rc)">' + head + '<div class="bt-div"></div><div class="bt-body">' + lines + '</div><div class="bt-div"></div>' + hl + '<div style="padding:0 6px 8px;display:flex;flex-direction:column;gap:2px">' + rows + '</div>' + foot + '</div>';
  }
  function actions(it, inline) {
    var k = S.sel.kind, h = HEROES.filter(function (x) { return x.id === S.hero; })[0];
    if (k === 'ware') {
      var short = it.price - S.gold, full = bagFull();
      var lbl = short > 0 ? 'Need ' + short + ' more' : full ? 'Bag full' : 'Buy ' + gi() + ' ' + it.price;
      return '<div class="acts' + (inline ? ' in' : '') + '">' + (h ? '<button class="btn" data-act="buyeq"' + (short > 0 || full ? ' disabled' : '') + '>Buy &amp; equip ' + h.name + '</button>' : '') + '<button class="btn pri" data-act="buy"' + (short > 0 || full ? ' disabled' : '') + '>' + lbl + '</button></div>';
    }
    if (k === 'bb') {
      var s2 = it.price - S.gold;
      return '<div class="acts' + (inline ? ' in' : '') + '"><button class="btn pri" data-act="bback"' + (s2 > 0 ? ' disabled' : '') + '>' + (s2 > 0 ? 'Need ' + s2 + ' more' : 'Buy back ' + gi() + ' ' + it.price) + '</button></div>';
    }
    return '<div class="acts' + (inline ? ' in' : '') + '"><button class="btn pri" data-act="sell">Sell ' + gi() + ' ' + sellPrice(it) + '</button></div>';
  }
  function nosel() {
    var bb = S.tab === 'bb';
    return '<div class="nosel"><img src="merchant/ui/gold.webp" alt=""><b>' + (bb ? 'Buyback' : 'Inspect a ware') + '</b>' + (bb ? 'Select an item to see who can use it.' : 'Select a ware to see its bonuses and which heroes it suits. Double-click to buy.') + '</div>';
  }
  function dock(two) {
    var it = itemOf(S.sel);
    return '<div class="dock">' + (it ? band(it, two) + (two ? '' : actions(it)) : nosel()) + '</div>';
  }

  function sellzone() {
    var it = S.sel && S.sel.kind === 'bag' ? itemOf(S.sel) : null;
    var armed = !!(it && S.armed);
    return '<div class="sell' + (armed ? ' armed' : '') + '" data-drop="sell" data-act="sellzone"><img class="ico" src="merchant/ui/gold.webp" alt=""><div><div class="st">' + (armed ? 'Sell ' + esc(it.name) : 'Sell to Odo') + '</div>' +
      '<div class="sd">' + (armed ? 'Tap here to sell for <b>' + sellPrice(it) + '</b> gold.' : 'Drag an item here from your bag. Odo pays half its worth.') + '</div></div>' +
      (armed ? '<button class="btn pri" data-act="sell">Sell ' + gi() + ' ' + sellPrice(it) + '</button>' : '') + '</div>';
  }
  var REROLL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M19.5 4v4.5H15"/></svg>';
  function waresHead() {
    var left = S.wares.filter(function (w) { return !w.sold; }).length;
    return '<div class="sech">Wares <span class="cnt">' + left + ' / ' + S.wares.length + '</span><button class="rr" data-act="reroll" title="Reroll wares"' + (S.gold < S.rerollCost ? ' disabled' : '') + '>' + REROLL_SVG + gi() + ' ' + S.rerollCost + '</button></div>';
  }
  function header() {
    return '<div class="hd"><div><div class="ttl">Odo the Peddler</div><div class="sub">Travelling merchant · Ashford Village</div></div><span class="grow"></span><span class="purse"><img src="merchant/ui/gold.webp" alt="">' + S.gold + '</span></div>';
  }
  function talk(extraCls) {
    return '<div class="talk"><div class="face" style="background-image:url(merchant/av/merchant.webp)"></div><div class="bubble' + (extraCls || '') + '">' + esc(LINES[S.line]) + '</div></div>';
  }
  function tabs() {
    return '<div class="tabs" role="tablist"><button class="tab' + (S.tab === 'sell' ? ' on' : '') + '" data-tab="sell">Buy &amp; Sell</button><button class="tab' + (S.tab === 'bb' ? ' on' : '') + '" data-tab="bb">Buyback' + (S.bb.length ? '<span class="bdg">' + S.bb.length + '</span>' : '') + '</button></div>';
  }
  var XBTN = '<button class="xbtn" title="Leave the stall" aria-label="Leave"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

  // ---- canta paneli
  function bagPanel() {
    var cells = '';
    for (var i = 0; i < BAG_SIZE; i++) {
      var it = S.bag[i];
      if (!it) { cells += '<div class="cw"><div class="cell slot"></div></div>'; continue; }
      var on = S.sel && S.sel.kind === 'bag' && S.sel.i === i;
      cells += '<div class="cw">' + cell(it, { on: on, sel: 'bag:' + i, drag: 'bag:' + i, il: true }) + price(sellPrice(it), false) + '</div>';
    }
    return '<div class="sech">Your bag <span class="cnt">' + S.bag.length + ' / ' + BAG_SIZE + '</span></div><div class="bag">' + cells + '</div><div class="meta" style="margin-top:auto">Prices under items are what Odo pays. Double-click an item to sell it.</div>';
  }
  function sidePanel() {
    var it = itemOf(S.sel);
    if (S.phone && it) {
      return '<div class="sech">Details<button class="backchip" data-act="back">Back to bag</button></div><div class="scr dock-wrap">' + dock(false) + '</div>';
    }
    return bagPanel();
  }

  // ---- varyantlar
  function paneA() {
    var body;
    if (S.tab === 'sell') {
      body = '<div class="list">' + waresHead() + '<div class="plates scr">' + (S.wares.length ? S.wares.map(plate).join('') : '<div class="empty-t">' + LINES.empty + '</div>') + '</div></div>';
    } else {
      body = '<div class="list"><div class="sech">Sold this visit <span class="cnt">' + S.bb.length + '</span></div><div class="plates scr">' + (S.bb.length ? S.bb.map(bbPlate).join('') : '<div class="empty-t">Sold something by mistake? It waits here until you leave.</div>') + '</div></div>';
    }
    return '<div class="body">' + body + (S.phone ? '' : dock(false)) + '</div>' + (S.tab === 'sell' ? sellzone() : '');
  }
  function paneB() {
    var out;
    if (S.tab === 'sell') {
      out = waresHead() + '<div class="wgrid">' + S.wares.map(function (w, i) {
        var poor = !w.sold && S.gold < w.price, on = S.sel && S.sel.kind === 'ware' && S.sel.i === i;
        return '<div class="cw">' + cell(w, { on: on, sold: w.sold, sel: w.sold ? '' : 'ware:' + i, drag: w.sold ? '' : 'ware:' + i, il: true }) + '<div class="wn rl" data-r="' + w.r + '">' + esc(w.name) + '</div>' + (w.sold ? '<span class="price">SOLD</span>' : price(w.price, poor)) + '</div>';
      }).join('') + '</div>';
    } else {
      out = '<div class="sech">Sold this visit <span class="cnt">' + S.bb.length + '</span></div>' + (S.bb.length ? '<div class="wgrid">' + S.bb.map(function (w, i) {
        var on = S.sel && S.sel.kind === 'bb' && S.sel.i === i;
        return '<div class="cw">' + cell(w, { on: on, sel: 'bb:' + i, drag: 'bb:' + i, il: true }) + '<div class="wn rl" data-r="' + w.r + '">' + esc(w.name) + '</div>' + price(w.price, S.gold < w.price) + '</div>';
      }).join('') + '</div>' : '<div class="empty-t">Sold something by mistake? It waits here until you leave.</div>');
    }
    return out + (S.phone ? '' : dock(true)) + (S.tab === 'sell' ? sellzone() : '');
  }
  function paneC() {
    var out;
    var mk = function (w, i, kind) {
      var poor = kind === 'ware' ? (!w.sold && S.gold < w.price) : S.gold < w.price;
      var on = S.sel && S.sel.kind === kind && S.sel.i === i;
      return '<div class="card' + (on ? ' on' : '') + (w.sold ? ' sold' : '') + '" data-r="' + w.r + '"' + (w.sold ? '' : ' data-sel="' + kind + ':' + i + '" data-drag="' + kind + ':' + i + '"') + '>' + cell(w, { il: true }) + '<div class="nm rl">' + esc(w.name) + '</div><div class="meta"><b>' + w.val + '</b> ' + w.stat + '</div>' + (w.sold ? '<span class="price">SOLD</span>' : price(w.price, poor)) + '</div>';
    };
    if (S.tab === 'sell') out = waresHead() + '<div class="cards">' + S.wares.map(function (w, i) { return mk(w, i, 'ware'); }).join('') + '</div>';
    else out = '<div class="sech">Sold this visit <span class="cnt">' + S.bb.length + '</span></div>' + (S.bb.length ? '<div class="cards">' + S.bb.map(function (w, i) { return mk(w, i, 'bb'); }).join('') + '</div>' : '<div class="empty-t">Sold something by mistake? It waits here until you leave.</div>');
    return out + (S.phone ? '' : dock(true)) + (S.tab === 'sell' ? '<div class="tray">' + sellzone().replace('class="sell', 'style="flex:1" class="sell') + '</div>' : '');
  }

  function render() {
    var st = $('#stage');
    st.className = (S.phone ? 'phone' : 'desk') + ' v' + S.v + (firstRender ? ' enter' : '');
    var stall;
    if (S.v === 'c' && !S.phone) {
      stall = '<section class="panel stall" data-drop="sell"><div class="odo"><img class="fig" src="merchant/ui/odo-full.webp" alt=""><div class="bubble">' + esc(LINES[S.line]) + '</div></div><div class="main">' + header() + tabs() + paneC() + '</div></section>';
    } else {
      var pane = S.v === 'a' ? paneA() : S.v === 'b' ? paneB() : paneC();
      stall = '<section class="panel stall" data-drop="sell">' + header() + talk(S.v === 'c' ? ' sf' : '') + tabs() + pane + '</section>';
    }
    st.innerHTML = '<div class="bgimg"></div><div class="ms">' + stall + '<section class="panel side" data-drop="bag">' + sidePanel() + '</section>' + XBTN + '</div>';
    // sahne iceriginde X sag ustte panel disinda dursun
    fit();
    if (firstRender) { firstRender = false; setTimeout(function () { st.classList.remove('enter'); }, 700); }
    strip();
  }
  function fit() {
    var st = $('#stage'), vw = innerWidth, vh = innerHeight - 0;
    var w = S.phone ? 844 : 1920, h = S.phone ? 390 : 1080;
    var k = Math.min(vw / w, vh / h);
    st.style.transform = 'scale(' + k + ')';
    st.style.left = Math.max(0, (vw - w * k) / 2) + 'px'; st.style.top = Math.max(0, (vh - h * k) / 2) + 'px';
  }
  addEventListener('resize', fit);

  function strip() {
    var s = $('#mk-strip');
    var btn = function (l, on, a) { return '<button class="' + (on ? 'on' : '') + '" ' + a + '>' + l + '</button>'; };
    s.innerHTML = '<b>MOCKUP</b>Merchant &middot; ' + btn('A Plates', S.v === 'a', 'data-v="a"') + btn('B Grid', S.v === 'b', 'data-v="b"') + btn('C Showcase', S.v === 'c', 'data-v="c"') +
      '<span class="sep"></span>' + btn('Desktop 1920', !S.phone, 'data-d="desk"') + btn('Phone 844x390', S.phone, 'data-d="phone"') +
      '<span class="sep"></span>' + btn('Reset', false, 'data-reset="1"') + '<span class="sep"></span><span class="note">' + NOTES[S.v] + '</span>';
  }
  function setHash(o) {
    var p = o.v + (o.phone ? '&phone' : '') + (o.bb ? '&bb' : '') + (document.documentElement.classList.contains('mk-clean') ? '&clean' : '');
    location.hash = p;
  }

  // ---- islemler
  function acquire(it, kind) {
    var o = Object.assign({}, it, { uid: 'n' + Date.now() + Math.random(), worth: it.worth || it.price });
    delete o.sold; S.bag.push(o);
    return o;
  }
  function doBuy(i, equip) {
    var w = S.wares[i]; if (!w || w.sold) return;
    if (S.gold < w.price) { S.line = 'poor'; toast('Not enough gold'); return render(); }
    if (bagFull()) { S.line = 'bagFull'; toast('Your bag is full'); return render(); }
    S.gold -= w.price; w.sold = true; var hn = HEROES.filter(function (h) { return h.id === S.hero; })[0];
    if (equip && hn) { toast(w.name + ' equipped on ' + hn.name); } else { acquire(w, 'ware'); toast(w.name + ' added to your bag'); }
    S.line = 'buy'; S.sel = null; S.hero = null; render();
  }
  function doBuyBack(i) {
    var e = S.bb[i]; if (!e) return;
    if (S.gold < e.price) { S.line = 'poor'; return render(); }
    if (bagFull()) { S.line = 'bagFull'; return render(); }
    S.gold -= e.price; S.bb.splice(i, 1); var o = Object.assign({}, e, { uid: 'n' + Date.now(), worth: e.price * 2 }); S.bag.push(o);
    S.line = 'buyback'; S.sel = null; S.hero = null; toast(e.name + ' bought back'); render();
  }
  function doSell(i) {
    var it = S.bag[i]; if (!it) return;
    var p = sellPrice(it); S.gold += p; S.bag.splice(i, 1);
    S.bb.unshift(Object.assign({}, it, { price: p }));
    S.line = 'sold'; S.sel = null; S.hero = null; S.armed = false; toast('Sold ' + it.name + ' for ' + p + ' gold'); render();
  }
  function doReroll() {
    if (S.gold < S.rerollCost) return;
    S.gold -= S.rerollCost; S.set = 1 - S.set; S.rerolls++;
    var src = S.set ? SET1 : SET0;
    S.wares = src.map(function (w, i) { return Object.assign({ uid: 'w' + i, sold: false }, w); });
    S.line = 'reroll'; S.sel = null; S.hero = null; render();
  }

  // ---- olaylar
  var drag = null, lastTap = { k: '', t: 0 }, suppress = false;
  document.addEventListener('click', function (e) {
    if (suppress) { suppress = false; return; }
    var t = e.target;
    var sv = t.closest('[data-v]'); if (sv) { var o = parseHash(); o.v = sv.dataset.v; setHash(o); return; }
    var sd = t.closest('[data-d]'); if (sd) { var o2 = parseHash(); o2.phone = sd.dataset.d === 'phone'; setHash(o2); return; }
    if (t.closest('[data-reset]')) { resetState(); firstRender = true; render(); return; }
    if (!t.closest('#stage')) return;
    var tab = t.closest('[data-tab]'); if (tab) { if (S.tab !== tab.dataset.tab) { S.tab = tab.dataset.tab; S.sel = null; S.hero = null; S.line = tab.dataset.tab === 'bb' ? 'buyback' : 'idle'; render(); } return; }
    var act = t.closest('[data-act]');
    if (act && !act.disabled) {
      var a = act.dataset.act, s = S.sel;
      if (a === 'reroll') return doReroll();
      if (a === 'buy' && s) return doBuy(s.i, false);
      if (a === 'buyeq' && s) return doBuy(s.i, true);
      if (a === 'bback' && s) return doBuyBack(s.i);
      if (a === 'sell' && s && s.kind === 'bag') return doSell(s.i);
      if (a === 'sellzone') { if (S.sel && S.sel.kind === 'bag') return doSell(S.sel.i); toast('Select an item from your bag first'); return; }
      if (a === 'back') { S.sel = null; S.hero = null; return render(); }
    }
    var pk = t.closest('[data-pick]'); if (pk) { S.hero = pk.dataset.pick; return render(); }
    var se = t.closest('[data-sel]');
    if (se && se.dataset.sel) {
      var p = se.dataset.sel.split(':'), kind = p[0], i = +p[1], key = se.dataset.sel, now = performance.now();
      if (lastTap.k === key && now - lastTap.t < 380) {
        lastTap = { k: '', t: 0 };
        if (kind === 'ware') { select(kind, i, true); return doBuy(i, false); }
        if (kind === 'bb') return doBuyBack(i);
        if (kind === 'bag') return doSell(i);
      }
      lastTap = { k: key, t: now };
      var it = kind === 'ware' ? S.wares[i] : kind === 'bb' ? S.bb[i] : S.bag[i];
      select(kind, i);
      S.line = kind === 'ware' && S.sel && S.gold < it.price ? 'poor' : kind === 'bb' ? 'buyback' : 'idle';
      return render();
    }
    if (t.closest('.xbtn')) toast('Leave the stall (mockup)');
  });

  document.addEventListener('pointerdown', function (e) {
    var d = e.target.closest('#stage [data-drag]');
    if (!d || !d.dataset.drag || e.button) return;
    drag = { key: d.dataset.drag, x: e.clientX, y: e.clientY, on: false, src: d };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      drag.on = true;
      var p = drag.key.split(':'), it = p[0] === 'ware' ? S.wares[+p[1]] : p[0] === 'bb' ? S.bb[+p[1]] : S.bag[+p[1]];
      var g = $('#ghost'); g.innerHTML = '<img src="merchant/items/' + it.id + '.webp" alt="">'; g.hidden = false;
      var st = $('#stage'); st.classList.add('dragging'); st.style.setProperty('--dragc', 'color-mix(in srgb, ' + ({ common: '#8a8a84', uncommon: '#5f8f3e', rare: '#3f6fa8', epic: '#7a3f9a', legendary: '#f0a830' }[it.r]) + ' 60%, #fff)');
      var sell = p[0] === 'bag';
      st.querySelectorAll('[data-drop]').forEach(function (n) { n.classList.toggle('drop-ok', sell ? n.dataset.drop === 'sell' : n.dataset.drop === 'bag'); });
    }
    var g2 = $('#ghost'); g2.style.left = e.clientX + 'px'; g2.style.top = e.clientY + 'px';
  });
  function endDrag(e, cancel) {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.on) return;
    suppress = true; setTimeout(function () { suppress = false; }, 0);
    $('#ghost').hidden = true; var st = $('#stage'); st.classList.remove('dragging');
    st.querySelectorAll('.drop-ok').forEach(function (n) { n.classList.remove('drop-ok'); });
    if (cancel) return;
    var under = document.elementFromPoint(e.clientX, e.clientY), tg = under && under.closest('[data-drop]');
    var p = d.key.split(':'), i = +p[1];
    if (!tg) return;
    if (p[0] === 'bag' && tg.dataset.drop === 'sell') return doSell(i);
    if (p[0] === 'ware' && tg.dataset.drop === 'bag') return doBuy(i, false);
    if (p[0] === 'bb' && tg.dataset.drop === 'bag') return doBuyBack(i);
  }
  document.addEventListener('pointerup', function (e) { endDrag(e, false); });
  document.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  addEventListener('hashchange', function () { var keep = S; resetState(); firstRender = true; render(); });

  resetState();
  render();
})();
