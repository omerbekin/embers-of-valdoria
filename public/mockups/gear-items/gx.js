/* Gear > Hero item listesi taslagi (ui-dev, 2026-10-18). Item verisi ORNEKTIR (gorsel gercek, sayilar taslak). */
(function () {
  var SLOTS = [
    { id: 'weapon', label: 'Weapon', ico: 'weapon' },
    { id: 'offhand', label: 'Offhand', ico: 'offhand' },
    { id: 'helm', label: 'Head', ico: 'helm' },
    { id: 'armor', label: 'Chest', ico: 'armor' },
    { id: 'gloves', label: 'Hands', ico: 'gloves' },
    { id: 'boots', label: 'Feet', ico: 'boots' },
    { id: 'ring', label: 'Ring', ico: 'trinket' }
  ];
  var EQ = {
    weapon: { name: "Woodcutter's Axe", r: 'common', il: 2, img: 'woodcutters_axe', stat: 'Power', v: '12', sub: 'Common Axe · One-handed', aff: [] },
    offhand: { name: 'Iron Buckler', r: 'rare', il: 2, img: 'iron_buckler', stat: 'Block', v: '8%', sub: 'Rare Shield · Off-hand', aff: ['+17 Armor', '+6% Shield power'] },
    helm: { name: 'Leather Coif', r: 'uncommon', il: 2, img: 'leather_coif', stat: 'Armor', v: '4', sub: 'Uncommon Helm', aff: ['+3% Evasion'] },
    armor: { name: 'Padded Gambeson', r: 'common', il: 3, img: 'padded_gambeson', stat: 'Armor', v: '8', sub: 'Common Chest', aff: [] },
    gloves: { name: 'Work Gloves', r: 'uncommon', il: 2, img: 'work_gloves', stat: 'Armor', v: '2', sub: 'Uncommon Gloves', aff: ['+1.3% Accuracy', '+0.5 MP per turn'] },
    boots: { name: 'Hobnailed Boots', r: 'uncommon', il: 4, img: 'hobnailed_boots', stat: 'Armor', v: '5', sub: 'Uncommon Boots', aff: ['+4% Evasion'] },
    ring: { name: 'Copper Ring', r: 'common', il: 4, img: 'copper_ring', stat: 'MP', v: '+2', sub: 'Common Ring', aff: [] }
  };
  var DRAGS = {
    gloves: { name: 'Leather Gloves', r: 'uncommon', img: 'leather_gloves', ok: { gloves: 'Swap' } },
    ring: { name: 'Copper Ring', r: 'common', img: 'copper_ring', ok: { ring: 'Swap' } },
    axe: { name: "Woodcutter's Axe", r: 'common', img: 'woodcutters_axe', ok: { weapon: 'Swap', offhand: 'Off-hand' } }
  };
  var RC = { common: '#8a8a84', uncommon: '#5f8f3e', rare: '#3f77c4' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var drag = 'off';
  var hs = location.hash;
  var um = /u=([\d.]+)/.exec(hs), U = um ? parseFloat(um[1]) : 1;
  if (/clean/.test(hs)) document.documentElement.classList.add('mk-clean');
  var dm = /drag=(\w+)/.exec(hs); if (dm) drag = dm[1];

  function slotDef(id) { return SLOTS.filter(function (s) { return s.id === id; })[0]; }
  function icoHtml(id, item) {
    return '<div class="ico"><img src="' + (item ? 'gear-items/items/' + item.img + '.webp' : 'gear-items/slot-icons/' + slotDef(id).ico + '.webp') + '" alt=""></div>';
  }
  function lbl(id) { var s = slotDef(id); return '<div class="slotlbl"><img src="gear-items/slot-icons/' + s.ico + '.webp" alt="">' + s.label + '</div>'; }
  function stat(it) { return it.stat + ' <b>' + it.v + '</b>'; }
  function plate(id, variant) {
    var it = EQ[id], empty = !it || id === window.__empty;
    var cls = 'pl it' + (empty ? ' empty' : '');
    var attr = ' data-slot="' + id + '"' + (empty ? '' : ' data-r="' + it.r + '"');
    var hint = '<span class="drophint">' + (empty ? 'Equip' : 'Swap') + '</span>';
    var name = empty ? 'Empty' : it.name;
    var tx;
    if (variant === 'a') {
      var l2 = empty ? '<span class="meta">Drop an item here</span>' :
        '<span class="meta">' + stat(it) + '</span><span class="meta">iL <b>' + it.il + '</b></span>' + it.aff.map(function (a) { return '<span class="meta aff">' + a + '</span>'; }).join('');
      tx = lbl(id) + '<div class="nm">' + name + '</div><div class="l2">' + l2 + '</div>';
    } else if (variant === 'b') {
      tx = lbl(id) + '<div class="nm">' + name + '</div>' + (empty ? '' : '<div class="meta">' + stat(it) + ' · iL <b>' + it.il + '</b></div>');
    } else {
      tx = lbl(id) + '<div class="nm">' + name + '</div>' + (empty ? '' : '<div class="meta">' + stat(it) + '</div><div class="meta">iL <b>' + it.il + '</b></div>');
    }
    if (variant === 'c') return '<div class="' + cls + '"' + attr + '>' + hint + tx.replace(/^(<div class="slotlbl">.*?<\/div>)/, '$1' + icoHtml(id, empty ? null : it)) + '</div>';
    return '<div class="' + cls + '"' + attr + '>' + hint + icoHtml(id, empty ? null : it) + '<div class="tx">' + tx + '</div></div>';
  }
  function heroes() {
    var h = [['warrior', 3, 0], ['archer', 6, 1], ['mage', 0, 1], ['hexer', 0, 1]];
    return '<div class="gx-heroes">' + h.map(function (x, i) {
      return '<div class="gx-hero' + (i === 0 ? ' on' : '') + (x[2] ? ' dead' : '') + '" style="background-image:url(gear-items/avatars/' + x[0] + '.webp)">' + (x[1] ? '<span class="gx-badge">' + x[1] + '</span>' : '') + '<span class="cross">&#10013;</span></div>';
    }).join('') + '</div>';
  }
  function head(chips) {
    if (!chips) return '<div class="gx-head"><span class="gx-title">Warrior · Axes &amp; Swords / Maces &amp; Shields</span></div>';
    return '<div class="gx-head"><span class="gx-chip cls">Warrior</span>' +
      '<span class="gx-chip"><img src="gear-items/slot-icons/weapon.webp" alt="">Axes &amp; Swords</span>' +
      '<span class="gx-chip"><img src="gear-items/slot-icons/offhand.webp" alt="">Maces &amp; Shields</span></div>';
  }
  function scene(inner) { return '<div class="scene"><div class="gx">' + heroes() + '<div class="gx-main">' + inner + '</div></div></div>'; }
  function sec(title, note, inner) { return '<div class="sec"><h2>' + title + '</h2><div class="note">' + note + '</div>' + inner + '</div>'; }

  function oldRow(id) {
    var it = EQ[id];
    return '<div class="sl it' + (it ? '' : ' empty') + '" data-slot="' + id + '"' + (it ? ' data-r="' + it.r + '"' : '') + '>' + icoHtml(id, it) + '<span class="nm">' + (it ? it.name : 'Empty') + '</span></div>';
  }
  function render() {
    var all = SLOTS.map(function (s) { return s.id; });
    var old = '<div class="old">' + head(false) + '<div class="row">' + all.map(oldRow).join('') + '</div><div class="ghost">WORK GLOVES<small>UNCOMMON GLOVES · Item level 2</small></div></div>';
    var A = head(true) + '<div class="va">' + all.map(function (i) { return plate(i, 'a'); }).join('') + '</div>';
    var left = ['helm', 'armor', 'gloves', 'boots'], right = ['weapon', 'offhand', 'ring'];
    var B = head(true) + '<div class="vb"><div class="colx l">' + left.map(function (i) { return plate(i, 'b'); }).join('') + '</div>' +
      '<div class="doll"><img src="gear-items/pose-warrior.webp" alt=""><span>Warrior · Lv 8</span></div>' +
      '<div class="colx r">' + right.map(function (i) { return plate(i, 'b'); }).join('') + '</div></div>';
    var C = head(true) + '<div class="vc">' + all.map(function (i) { return plate(i, 'c'); }).join('') +
      '<div class="pl it sumc"><div class="slotlbl">Total</div><div class="big">36</div><div class="meta">Armor</div><div class="meta"><b>7</b> / 7 slots</div></div></div>';
    $('#sections').innerHTML =
      sec('Mevcut hal', 'Birebir yeniden çizim (Gear &gt; HERO). Arkadaki soluk "Work Gloves" tooltip hayaleti de çizildi: olası hata.', scene(old)) +
      sec('A, İki sütun satır plakaları (önerim)', 'Yuva türü etiketi + ad + altın rakamlar + iL + affix özeti; rarity kenarı, iç ışık, köşe elmasları. Boş yuva: kesik kenar + soluk siluet.', scene(A)) +
      sec('B, Paper-doll', 'Kahraman figürü ortada, sol sütun zırh, sağ sütun silah / offhand / yüzük. Telefon yatayda dar kalır.', scene(B)) +
      sec('C, Kompakt kart ızgarası', 'Dikey kart: etiket, büyük ikon, ad, tek altın rakam. Sekizinci hücre özet (öneri).', scene(C)) +
      '<div class="sec"><h2>Davranış notları</h2><ul class="notes">' +
      '<li><b>Sürükle-bırak hedefi:</b> çantadan item tutulunca uygun yuva(lar) item\'ın rarity renginde ışır ve köşede "Equip" (boşsa) / "Swap" (doluysa) bandı çıkar; uymayan yuvalar soluk. Silah, el yuvası olarak Offhand\'a da bırakılabilir ("Off-hand" bandı). Ölü kahramanda hedef yok. Bu sayfada: alttaki şeritten Drag seç.</li>' +
      '<li><b>Hover:</b> masaüstünde item tooltip v3 (kısa); dokunmatikte dokununca seçilir, uzun basınca tooltip. Boş yuvada tooltip yok.</li>' +
      '<li><b>Çift tık / çift dokunma:</b> kuşanılmış item çantaya döner (Unequip), boş yuvada bir şey olmaz. Sağ tık menüsü: Unequip.</li>' +
      '<li><b>Dokunma hedefi:</b> her plaka en az 44px gerçek yükseklikte; telefon yatayda (844x390) A ve C korunur, B yalnız kısa ekranda küçülür.</li>' +
      '<li><b>Yanıp sönme yok:</b> hover ve sürükleme yalnız sınıf değiştirir; liste baştan kurulmaz.</li></ul></div>';
    bind(); applyDrag();
  }
  var tip = $('#tip'), toast = $('#toast'), tt;
  function showToast(t) { toast.textContent = t; toast.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, 1600); }
  function bind() {
    var els = document.querySelectorAll('.pl:not(.sumc), .old .sl');
    Array.prototype.forEach.call(els, function (el) {
      var id = el.dataset.slot, it = EQ[id];
      el.addEventListener('mouseenter', function () {
        if (!it) return;
        tip.style.setProperty('--rc', RC[it.r]);
        tip.innerHTML = '<span class="tn">' + it.name + '</span><div class="ts">' + it.sub + ' · Item level ' + it.il + '</div><div class="tl"><b>' + it.stat + ' ' + it.v + '</b></div>' + it.aff.map(function (a) { return '<div class="tl">' + a + '</div>'; }).join('');
        tip.hidden = false;
        var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
        var x = Math.min(r.right + 10, innerWidth - w - 8); if (x < 8) x = 8;
        var y = Math.min(Math.max(8, r.top), innerHeight - h - 8);
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      });
      el.addEventListener('mouseleave', function () { tip.hidden = true; });
      el.addEventListener('click', function () {
        if (drag !== 'off') {
          var d = DRAGS[drag], ok = d.ok[id];
          showToast(ok ? (ok === 'Swap' && it ? 'Equipped ' + d.name + ', ' + it.name + ' to bag' : 'Equipped ' + d.name + ' (' + ok + ')') : 'Cannot equip here');
          return;
        }
        Array.prototype.forEach.call(document.querySelectorAll('.pl.on'), function (e) { e.classList.remove('on'); });
        el.classList.add('on');
      });
      el.addEventListener('dblclick', function () { if (it && drag === 'off') showToast('Unequipped ' + it.name + ' to bag'); });
    });
  }
  var ghost = document.createElement('div'); ghost.className = 'ghostdrag'; ghost.hidden = true; document.body.appendChild(ghost);
  document.addEventListener('mousemove', function (e) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; });
  function applyDrag() {
    var root = document.documentElement;
    root.classList.toggle('dragging', drag !== 'off');
    Array.prototype.forEach.call(document.querySelectorAll('#mk-strip [data-drag]'), function (b) { b.classList.toggle('on', b.dataset.drag === drag); });
    Array.prototype.forEach.call(document.querySelectorAll('.pl:not(.sumc)'), function (el) {
      el.classList.remove('drop-ok', 'drop-no');
      if (drag === 'off') return;
      var d = DRAGS[drag], ok = d.ok[el.dataset.slot];
      el.classList.add(ok ? 'drop-ok' : 'drop-no');
      var h = el.querySelector('.drophint');
      if (h && ok) h.textContent = (ok === 'Swap' && el.classList.contains('empty')) ? 'Equip' : ok;
    });
    if (drag === 'off') { ghost.hidden = true; return; }
    var dd = DRAGS[drag];
    root.style.setProperty('--dragc', RC[dd.r]);
    ghost.innerHTML = '<img src="gear-items/items/' + dd.img + '.webp" alt="">'; ghost.hidden = false;
  }
  function applyScale() {
    document.documentElement.style.setProperty('--u', U + 'px');
    document.documentElement.classList.toggle('mk-phone', U < 0.5);
    Array.prototype.forEach.call(document.querySelectorAll('#mk-strip [data-u]'), function (b) { b.classList.toggle('on', parseFloat(b.dataset.u) === U); });
  }
  document.getElementById('mk-strip').addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.u) { U = parseFloat(t.dataset.u); applyScale(); }
    if (t.dataset.empty) { window.__empty = window.__empty ? '' : 'ring'; t.classList.toggle('on', !!window.__empty); render(); }
    if (t.dataset.drag) { drag = t.dataset.drag; applyDrag(); }
  });
  applyScale(); render();
})();
