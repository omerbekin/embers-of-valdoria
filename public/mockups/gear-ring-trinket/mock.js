/* Gear Ring + Trinket mockup mantigi (oyun kodu DEGIL). Hash: #now #a #b #c, istege bagli &s=open|locked|filled &z=169|219|ph */
(() => {
  const P = 'gear-ring-trinket/';
  const root = document.documentElement;
  const bar = document.getElementById('mk-bar');
  const note = document.getElementById('mk-note');
  const view = document.getElementById('mk-view');
  const stage = document.getElementById('mk-stage');

  const NOTES = {
    now: '<b>Bugun:</b> 7 yuva, iki sutun; son yuva "Ring" adini tasiyan tek trinket yuvasi, yanindaki hucre bos. Karsilastirma icin.',
    a: '<b>A Sekizinci satir (oneri):</b> Ring ve Trinket ayni plakalarla izgaranin son satirinda yan yana; izgara 4x2 tam dolar, hicbir sey kuculmez. Telefonda 4 satir sigsin diye skill plakalarinin cipleri gizlenir (bugun 4. satir kirpiliyor).',
    b: '<b>B Taki seridi:</b> 6 donanim plakasi ustte; Ring ve Trinket ince bir ayiricinin altinda alcak plakalar olarak ayri okunur, stat satirlari ipucuna gider.',
    c: '<b>C Baslik karolari:</b> Ring ve Trinket sinif satirinin sagina ikon karolari olur; 6 plaka daha yuksek ve ferah kalir, ad ve stat yalniz ipucunda.',
  };
  const STATE_NOTE = {
    open: 'Ikisi acik: Ring ve Trinket bos.',
    locked: 'Trinket kilitli: gorunur, uzerine gel (telefonda dokun) = neden.',
    filled: 'Dolu: ikisinde de item var, gercek plaka ve item ipucu.',
  };
  const SIZES = { '169': { w: 1920, h: 1080, label: '16:9' }, '219': { w: 2580, h: 1080, label: '21:9' }, ph: { w: 844, h: 390, label: 'Phone' } };
  SIZES.ph.gu = Math.min(844 / 2337, 390 / 1080);
  SIZES['169'].gu = 1; SIZES['219'].gu = 1;

  const hp = new URLSearchParams(location.hash.slice(1).split('&').slice(1).join('&'));
  const S = {
    v: (location.hash.slice(1).split('&')[0] || 'a'),
    st: hp.get('s') || 'open',
    z: hp.get('z') || (innerWidth < 900 ? 'ph' : '169'),
    equip: {}, bag: [], sel: null,
  };
  if (!NOTES[S.v]) S.v = 'a';
  if (!STATE_NOTE[S.st]) S.st = 'open';
  if (!SIZES[S.z]) S.z = '169';
  if (S.v === 'now' && S.st === 'locked') S.st = 'open';

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  /* ---------------- veri ----------------
     Item adlari, nadirlik, seviye, ikon oyun verisinden (data/items.json). Stat DEGERLERI affix formulunden
     (taban + seviye x adim) yaklasik hesaplandi: ORNEK DEGER, oyundaki zar sonucu degil. "value" (altin) YER TUTUCU. */
  const RC = { common: '#8a8a84', uncommon: '#5f8f3e', rare: '#3f6fa8', epic: '#7a3f9a' };
  const RN = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic' };
  const RK = { common: 0, uncommon: 1, rare: 2, epic: 3 };
  const TC = { C: '#b9a98a', B: '#8fb8e8', A: '#f0b04a' };
  const LABEL = { weapon: 'Weapon', offhand: 'Offhand', helm: 'Head', armor: 'Chest', gloves: 'Hands', boots: 'Feet', ring: 'Ring', trinket: 'Trinket' };
  const KIND = { weapon: 'Axe', offhand: 'Shield', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', trinket: 'Trinket' };
  const D = {
    woodcutters_axe: { name: "Woodcutter's Axe", slot: 'weapon', r: 'common', il: 2, main: ['Power', '13'], aff: [], lines: [], val: 9 },
    iron_buckler: { name: 'Iron Buckler', slot: 'offhand', r: 'common', il: 2, main: ['Block', '15%'], aff: ['+2 Armor'], lines: [['C', 'armor', '+2 Armor']], val: 8 },
    leather_coif: { name: 'Leather Coif', slot: 'helm', r: 'common', il: 2, aff: ['+2 Max HP'], lines: [['C', 'hp', '+2 Max HP']], val: 6 },
    padded_gambeson: { name: 'Padded Gambeson', slot: 'armor', r: 'common', il: 3, aff: ['+2 Armor'], lines: [['C', 'armor', '+2 Armor']], val: 10 },
    work_gloves: { name: 'Work Gloves', slot: 'gloves', r: 'common', il: 2, aff: ['+0.8% Accuracy'], lines: [['C', 'accuracy', '+0.8% Accuracy']], val: 6 },
    soft_boots: { name: 'Soft Boots', slot: 'boots', r: 'common', il: 5, aff: ['+2% Evasion'], lines: [['C', 'evasion', '+2% Evasion']], val: 11 },
    copper_ring: { name: 'Copper Ring', slot: 'ring', r: 'common', il: 4, aff: ['+10 Max MP'], lines: [['C', 'mp', '+10 Max MP']], val: 9 },
    rabbits_foot: { name: "Rabbit's Foot", slot: 'trinket', r: 'common', il: 4, aff: ['+10 Max MP'], lines: [['C', 'mp', '+10 Max MP']], val: 9 },
    wolf_tooth: { name: 'Wolf-Tooth Charm', slot: 'trinket', r: 'uncommon', il: 5, aff: ['+11 Max MP', '+0.5 MP per turn'], lines: [['C', 'mp', '+11 Max MP'], ['C', 'mpRegen', '+0.5 MP per turn']], val: 22 },
    pilgrims_token: { name: "Pilgrim's Token", slot: 'trinket', r: 'uncommon', il: 8, aff: ['+0.75 MP per turn', '+14 Max MP'], lines: [['C', 'mpRegen', '+0.75 MP per turn'], ['C', 'mp', '+14 Max MP']], val: 34 },
    saints_medal: { name: "Saint's Medal", slot: 'trinket', r: 'rare', il: 9, aff: ['+0.75 MP per turn', '+15 Max MP'], lines: [['B', null, 'Start battles 20% into your turn'], ['C', 'mpRegen', '+0.75 MP per turn'], ['C', 'mp', '+15 Max MP']], val: 61 },
  };
  const bagInit = [['b1', 'saints_medal'], ['b2', 'copper_ring'], ['b3', 'rabbits_foot'], ['b4', 'leather_coif'], ['b5', 'pilgrims_token'], ['b6', 'soft_boots']];
  const gearInit = { weapon: 'e1:woodcutters_axe', offhand: 'e2:iron_buckler', helm: 'e3:leather_coif', armor: 'e4:padded_gambeson', gloves: 'e5:work_gloves', boots: 'e6:soft_boots' };
  const inst = (s) => { const [uid, id] = s.split(':'); return { uid, id }; };

  function resetItems() {
    S.sel = null;
    S.equip = {};
    for (const [k, v] of Object.entries(gearInit)) S.equip[k] = inst(v);
    S.bag = bagInit.map(([uid, id]) => ({ uid, id }));
    if (S.st === 'filled') {
      S.equip.ring = { uid: 'r1', id: 'copper_ring' };
      S.equip.trinket = { uid: 't1', id: 'wolf_tooth' };
    }
    if (S.v === 'now' && S.st === 'filled') delete S.equip.trinket;
  }

  const slotKeys = () => {
    const six = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots'];
    return S.v === 'now' ? [...six, 'ring'] : [...six, 'ring', 'trinket'];
  };
  const isLocked = (k) => k === 'trinket' && S.st === 'locked' && S.v !== 'now';
  const accepts = (k, it) => {
    const s = D[it.id].slot;
    if (S.v === 'now' && k === 'ring') return s === 'ring' || s === 'trinket';
    return s === k;
  };
  const defaultSlot = (it) => {
    const s = D[it.id].slot;
    if (S.v === 'now' && s === 'trinket') return 'ring';
    return s;
  };
  const slotLabel = (k) => LABEL[k];
  const lockText = 'Trinket opens at Reedgate.';

  /* ---------------- DOM parcalari ---------------- */
  const slotIcon = (k) => `${P}slots/${k === 'ring' ? 'trinket' : k}.webp`;
  const itemImg = (id) => `${P}items/${id}.webp`;
  const lockSvg = '<span class="gr-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>';

  function emptyArt(k) {
    if (k === 'ring') return `<img class="gr-svg gr-px gr-silhouette" src="${itemImg('copper_ring')}" alt="" draggable="false" style="--sz:1.3">`;
    return `<img class="gr-svg gr-slot-ico" src="${slotIcon(k)}" alt="" draggable="false" style="--sz:1.3">`;
  }
  function labelIcon(k) {
    return k === 'ring' ? `<img src="${itemImg('copper_ring')}" alt="" draggable="false">` : `<img src="${slotIcon(k)}" alt="" draggable="false">`;
  }
  const l2 = (it) => {
    const d = D[it.id];
    let h = '';
    if (d.main) h += `<span class="gp-main">${d.main[0]} <b>${d.main[1]}</b></span>`;
    h += `<span class="gp-il">iL <b>${d.il}</b></span>`;
    for (const a of d.aff.slice(0, 2)) h += `<span class="gp-aff">${a}</span>`;
    return `<div class="gp-l2">${h}</div>`;
  };

  function plateHtml(k) {
    const it = S.equip[k];
    const locked = isLocked(k);
    if (!it) {
      const cls = `gr-slot gr-plate empty${locked ? ' locked' : ''} gr-slot-${k}`;
      const attr = locked ? `data-slot="${k}" data-tipkey="lock:${k}" aria-label="Trinket, locked"` : `data-slot="${k}" data-drop="slot:${k}"`;
      return `<button class="${cls}" type="button" ${attr} style="--rc:#5b4a33"><span class="gp-hint"></span><span class="gp-ico">${emptyArt(k)}</span>${locked ? lockSvg : ''}<div class="gr-slot-text gp-tx"><div class="gp-lbl">${labelIcon(k)}${slotLabel(k)}</div><div class="gr-slot-name">${locked ? 'Locked' : 'Empty'}</div></div></button>`;
    }
    const d = D[it.id];
    return `<button class="gr-slot gr-plate gr-slot-${k}" type="button" data-slot="${k}" data-drop="slot:${k}" data-drag="slot:${k}" data-tipkey="eq:${k}" style="--rc:${RC[d.r]}"><span class="gp-hint"></span><span class="gp-ico"><img class="gr-svg gr-px item-art" src="${itemImg(it.id)}" alt="" draggable="false" style="--sz:1.3;--glow:${RC[d.r]}"></span><div class="gr-slot-text gp-tx"><div class="gp-lbl">${labelIcon(k)}${slotLabel(k)}</div><div class="gr-slot-name${d.name.length >= 22 ? ' long' : ''}">${d.name}</div>${l2(it)}</div></button>`;
  }

  function tileHtml(k) {
    const it = S.equip[k];
    const locked = isLocked(k);
    if (!it) {
      const attr = locked ? `data-tipkey="lock:${k}"` : `data-drop="slot:${k}" data-tipkey="slotinfo:${k}"`;
      return `<button class="mk-tile empty${locked ? ' locked' : ''}" type="button" data-slot="${k}" ${attr} aria-label="${slotLabel(k)}${locked ? ', locked' : ', empty'}" style="--rc:#5b4a33"><span class="gp-hint"></span>${emptyArt(k).replace('gr-svg', 'gr-svg')}${locked ? lockSvg : ''}<i class="mk-cap">${slotLabel(k)}</i></button>`;
    }
    const d = D[it.id];
    return `<button class="mk-tile" type="button" data-slot="${k}" data-drop="slot:${k}" data-drag="slot:${k}" data-tipkey="eq:${k}" aria-label="${slotLabel(k)}: ${d.name}" style="--rc:${RC[d.r]}"><span class="gp-hint"></span><img class="gr-svg gr-px item-art" src="${itemImg(it.id)}" alt="" draggable="false" style="--sz:1.3;--glow:${RC[d.r]}"><i class="mk-cap">${slotLabel(k)}</i></button>`;
  }

  function heroPage() {
    const six = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots'];
    let tiles = '', jbar = '', slots;
    if (S.v === 'now' || S.v === 'a') slots = slotKeys().map(plateHtml).join('');
    else if (S.v === 'b') {
      slots = six.map(plateHtml).join('');
      jbar = `<div class="mk-jbar"><div class="mk-jdiv"></div><div class="mk-jrow">${plateHtml('ring')}${plateHtml('trinket')}</div></div>`;
    } else {
      slots = six.map(plateHtml).join('');
      tiles = `<div class="mk-tiles">${tileHtml('ring')}${tileHtml('trinket')}</div>`;
    }
    return `<div class="gr-leaf gr-leaf-hero"><div class="gr-sec gr-class-sec"><span class="gp-chip cls plain">Level 9 Warrior</span>${tiles}</div><div class="gr-slots">${slots}</div>${jbar}</div>`;
  }

  function bagHtml() {
    let cells = '';
    for (const b of S.bag) {
      const d = D[b.id];
      cells += `<button class="gr-item k${RK[d.r]}" type="button" data-bag="${b.uid}" data-drag="bag:${b.uid}" data-tipkey="bag:${b.uid}" aria-label="${d.name}" style="--rc:${RC[d.r]}"><img class="gr-svg gr-px item-art" src="${itemImg(b.id)}" alt="" draggable="false" style="--sz:1;--glow:${RC[d.r]}"></button>`;
    }
    for (let i = S.bag.length; i < 30; i++) cells += '<button class="gr-item empty" type="button" tabindex="-1" disabled></button>';
    return `<div class="gr-inv"><div class="gr-bag-head"><div class="gr-sec gr-has-ico"><img class="gr-ui-ico" src="${P}icons/bag.webp" alt="" draggable="false">Bag ${S.bag.length} / 30</div></div><div class="gr-bag" data-drop="bag">${cells}</div></div>`;
  }

  let SKILLS = '';
  const skills = () => SKILLS;

  function shell() {
    return `<div class="gr-overlay el-modal gr-ledger-ov mk-ov${S.v === 'now' ? '' : ' mk-fit'}" role="dialog" aria-label="Gear"><div class="gr-panel gr-gear gr-ledger el-modal-panel gr-solo tab-hero">`
      + `<div class="gr-head gr-lhead"><div class="gr-title">Gear</div><div class="gr-tabs gr-headtabs mk-deadtab" role="tablist"><button class="gr-tab on" type="button" role="tab" aria-selected="true"><img class="gr-tab-ico" alt="" draggable="false" src="${P}icons/gear.webp">Hero</button><button class="gr-tab" type="button" role="tab" aria-selected="false"><img class="gr-tab-ico" alt="" draggable="false" src="${P}stats/str.webp">Sheet</button><button type="button" class="gr-tab" role="tab" aria-selected="false"><img class="gr-tab-ico" alt="" draggable="false" src="${P}icons/passive.webp">Tree</button></div><span class="gr-grow"></span><div class="gr-gold gr-has-ico"><img class="gr-ui-ico" alt="" draggable="false" src="${P}icons/gold.webp">0</div></div>`
      + `<div class="gr-body gr-lbody"><div class="gr-marks-col"><div class="gr-marks"><button class="gr-mark on" type="button" aria-label="Warrior"><div class="gr-face" style="background-image:url(&quot;${P}av/warrior.png&quot;)"></div></button></div></div>`
      + `<div class="gr-page"><div class="gr-page-in">${heroPage()}</div></div><div class="gr-spine"></div><div class="gr-page r"><div class="gr-page-in">${bagHtml()}</div></div>${skills()}</div></div>`
      + `<div class="el-tip item-tip"></div><div class="el-tip gr-tip"></div><div class="gr-toast" role="status"></div></div>`;
  }

  /* ---------------- ipuclari ---------------- */
  function itemTipHtml(it, equipped, acts) {
    const d = D[it.id];
    const lines = d.lines.map(([t, ic, tx]) => `<div class="it-line"><span class="it-tier" style="--tc:${TC[t]};color:${TC[t]}">${t}</span>${ic ? `<img class="it-ico" src="${P}stats/${ic}.webp" alt="">` : '<i class="it-dia"></i>'}<span class="it-text">${tx}</span></div>`).join('');
    const kind = `${RN[d.r]} · ${KIND[d.slot]}`;
    const big = d.main ? `<div class="it-big"><div class="it-big-power"><strong>${d.main[1]}</strong><span>${d.main[0] === 'Power' ? 'Weapon power' : 'Block chance'}</span></div></div>` : '';
    return `<div class="it-card${equipped ? ' eq' : ''}" style="--rc:${RC[d.r]}">${equipped ? '<span class="it-eqtag">Equipped</span>' : ''}<div class="it-head"><span class="it-medal"><img class="gr-svg gr-px" src="${itemImg(it.id)}" alt="" draggable="false"></span><div class="it-id"><strong class="it-name">${d.name}</strong><div class="it-rule"></div><div class="it-kind">${kind}</div><div class="it-sub">Item level ${d.il}</div>${big}</div></div>${lines ? `<div class="it-main"><div class="it-lines">${lines}</div></div>` : ''}<div class="it-reqrow"><span class="it-req"></span><span class="it-val"><img class="it-coin" src="${P}icons/gold.webp" alt=""><strong>${d.val}</strong><em>value</em></span></div>${acts ? `<div class="it-acts">${acts}</div>` : ''}</div>`;
  }
  function bandHtml(o) {
    return `<div class="bt" style="--ac:${o.ac}"><div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(&quot;${o.icon}&quot;)"></span><div class="bt-ht"><div class="bt-kind">${o.kind}</div><div class="bt-title">${o.title}</div></div></div><div class="bt-div"></div><div class="bt-body">${o.lines.map((l) => `<div class="bt-ln"><span class="dia"></span><div class="tx">${l}</div></div>`).join('')}</div>${o.foot ? `<div class="bt-foot"><span class="dia"></span><span class="tx">${o.foot}</span></div>` : ''}</div>`;
  }

  let ov, itemTip, bandTip, toastEl, pinnedKey = null, shownKey = null, dragSt = null, suppressClick = false, lastPtr = 'mouse';
  const k = () => Number(stage.dataset.k || 1);
  const touchMode = () => lastPtr === 'touch' || S.z === 'ph';

  function place(box, target) {
    const o = ov.getBoundingClientRect(), r = target.getBoundingClientRect(), s = k();
    const w = box.offsetWidth, h = box.offsetHeight, W = o.width / s, H = o.height / s;
    const tl = (r.left - o.left) / s, tr = (r.right - o.left) / s, tt = (r.top - o.top) / s, tb = (r.bottom - o.top) / s;
    let x = tr + 8, y = tt;
    if (x + w > W - 6) x = tl - w - 8;
    if (x < 6) { x = Math.max(6, Math.min(W - w - 6, tl)); y = tb + 8; if (y + h > H - 6) y = tt - h - 8; }
    y = Math.max(6, Math.min(H - h - 6, y));
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }
  function hideTips() {
    itemTip.classList.remove('on', 'pinned'); bandTip.classList.remove('on', 'pinned');
    shownKey = null; pinnedKey = null;
  }
  function showTip(target, pin) {
    const key = target.dataset.tipkey;
    if (!key) return;
    const [kind, id] = key.split(':');
    bandTip.classList.remove('on', 'pinned'); itemTip.classList.remove('on', 'pinned');
    if (kind === 'lock') {
      bandTip.innerHTML = bandHtml({ ac: '#a8977a', icon: slotIcon('trinket'), kind: 'Slot · Locked', title: 'Trinket', lines: [lockText], foot: 'Open from the start in Endless.' });
      bandTip.classList.add('on'); if (pin) bandTip.classList.add('pinned');
      place(bandTip, target);
    } else if (kind === 'slotinfo') {
      bandTip.innerHTML = bandHtml({ ac: '#d9b26a', icon: id === 'ring' ? itemImg('copper_ring') : slotIcon(id), kind: 'Slot', title: slotLabel(id), lines: ['Empty'] });
      bandTip.classList.add('on'); if (pin) bandTip.classList.add('pinned');
      place(bandTip, target);
    } else {
      let it, equipped = false, acts = '';
      if (kind === 'eq') { it = S.equip[id]; equipped = true; if (pin) acts = '<button class="gr-btn sm" type="button" data-act="unequip">Unequip</button>'; }
      else { it = S.bag.find((b) => b.uid === id); if (pin) acts = '<button class="gr-btn sm pri" type="button" data-act="equip">Equip</button>'; }
      if (!it) return;
      itemTip.innerHTML = itemTipHtml(it, equipped, acts);
      itemTip.dataset.key = key;
      itemTip.classList.add('on'); if (pin) itemTip.classList.add('pinned');
      place(itemTip, target);
    }
    shownKey = key; if (pin) pinnedKey = key;
  }
  function toast(text, ok) {
    toastEl.textContent = text; toastEl.classList.toggle('ok', !!ok); toastEl.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(() => toastEl.classList.remove('on'), 2400);
  }

  /* ---------------- esyalar ---------------- */
  function equipTo(uid, slot) {
    const i = S.bag.findIndex((b) => b.uid === uid);
    if (i < 0) return;
    const it = S.bag[i];
    if (isLocked(slot)) { toast(lockText); return; }
    if (!accepts(slot, it)) { toast(`${D[it.id].name} does not fit the ${slotLabel(slot)} slot.`); return; }
    const cur = S.equip[slot];
    S.equip[slot] = it;
    if (cur) S.bag[i] = cur; else S.bag.splice(i, 1);
    S.sel = null; render(true);
  }
  function unequip(slot) {
    const it = S.equip[slot];
    if (!it || S.bag.length >= 30) return;
    delete S.equip[slot]; S.bag.push(it); S.sel = null; render(true);
  }
  function moveSlot(from, to) {
    if (from === to) return;
    const a = S.equip[from], b = S.equip[to];
    if (isLocked(to)) { toast(lockText); return; }
    if (!a || !accepts(to, a)) { toast(`${a ? D[a.id].name : 'That item'} does not fit the ${slotLabel(to)} slot.`); return; }
    if (b && !accepts(from, b)) { delete S.equip[from]; S.bag.push(b); } else if (b) S.equip[from] = b; else delete S.equip[from];
    S.equip[to] = a; render(true);
  }

  function markTargets(it, fromSlot) {
    for (const t of ov.querySelectorAll('[data-slot]')) {
      const key = t.dataset.slot;
      const ok = !isLocked(key) && key !== fromSlot && accepts(key, it);
      t.classList.toggle('drop-ok', ok);
      t.classList.toggle('drop-no', !ok);
    }
  }
  function clearTargets() { for (const t of ov.querySelectorAll('.drop-ok,.drop-no')) t.classList.remove('drop-ok', 'drop-no'); }

  /* ---------------- olaylar ---------------- */
  function wire() {
    ov = stage.querySelector('.mk-ov');
    itemTip = ov.querySelector('.item-tip'); bandTip = ov.querySelector('.gr-tip'); toastEl = ov.querySelector('.gr-toast');
    ov.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch' || pinnedKey || dragSt) return;
      const t = e.target.closest('[data-tipkey]');
      if (t) showTip(t, false);
    });
    ov.addEventListener('pointerout', (e) => {
      if (e.pointerType === 'touch' || pinnedKey) return;
      if (e.target.closest('[data-tipkey]')) hideTips();
    });
    ov.addEventListener('pointerdown', (e) => {
      lastPtr = e.pointerType || 'mouse';
      const src = e.target.closest('[data-drag]');
      if (!src || e.button > 0) return;
      dragSt = { src, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    });
    ov.addEventListener('click', (e) => {
      if (suppressClick) { suppressClick = false; return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        const [kind, id] = (itemTip.dataset.key || '').split(':');
        hideTips();
        if (act.dataset.act === 'equip') equipTo(id, defaultSlotFor(id));
        else unequip(id);
        return;
      }
      if (e.target.closest('.item-tip.pinned, .gr-tip.pinned')) return;
      const slot = e.target.closest('[data-slot]');
      const bagCell = e.target.closest('[data-bag]');
      if (S.sel && slot) {
        const it = S.bag.find((b) => b.uid === S.sel);
        if (isLocked(slot.dataset.slot)) { toast(lockText); showTip(slot, touchMode()); return; }
        if (it && accepts(slot.dataset.slot, it)) { hideTips(); equipTo(S.sel, slot.dataset.slot); return; }
      }
      const t = e.target.closest('[data-tipkey]');
      if (bagCell) {
        const uid = bagCell.dataset.bag;
        const same = S.sel === uid;
        clearTargets(); ov.querySelectorAll('.gr-item.on').forEach((c) => c.classList.remove('on')); ov.classList.remove('mk-selecting');
        hideTips();
        if (same) { S.sel = null; return; }
        S.sel = uid; bagCell.classList.add('on'); ov.classList.add('mk-selecting');
        markTargets(S.bag.find((b) => b.uid === uid), null);
        showTip(bagCell, touchMode());
        return;
      }
      if (t && touchMode()) {
        if (pinnedKey === t.dataset.tipkey) hideTips(); else showTip(t, true);
        return;
      }
      if (!t) { hideTips(); S.sel = null; clearTargets(); ov.classList.remove('mk-selecting'); ov.querySelectorAll('.gr-item.on').forEach((c) => c.classList.remove('on')); }
    });
    ov.addEventListener('dblclick', (e) => {
      const bagCell = e.target.closest('[data-bag]');
      const slot = e.target.closest('[data-slot][data-drag]');
      if (bagCell) { hideTips(); equipTo(bagCell.dataset.bag, defaultSlotFor(bagCell.dataset.bag)); }
      else if (slot) { hideTips(); unequip(slot.dataset.slot); }
    });
  }
  const defaultSlotFor = (uid) => { const it = S.bag.find((b) => b.uid === uid); return it ? defaultSlot(it) : null; };

  // surukle: pencere duzeyinde
  window.addEventListener('pointermove', (e) => {
    if (!dragSt) return;
    const s = k();
    if (!dragSt.on) {
      if (Math.hypot(e.clientX - dragSt.x, e.clientY - dragSt.y) < 8) return;
      dragSt.on = true;
      const [kind, id] = dragSt.src.dataset.drag.split(':');
      dragSt.kind = kind; dragSt.id = id;
      dragSt.item = kind === 'bag' ? S.bag.find((b) => b.uid === id) : S.equip[id];
      if (!dragSt.item) { dragSt = null; return; }
      hideTips();
      const d = D[dragSt.item.id];
      ov.classList.add('gr-dragging');
      ov.style.setProperty('--drag-rc', RC[d.r]);
      const g = el('div', 'gr-ghost'); g.style.setProperty('--rc', RC[d.r]);
      g.innerHTML = `<img class="gr-svg gr-px" src="${itemImg(dragSt.item.id)}" alt="">`;
      ov.append(g); dragSt.ghost = g;
      markTargets(dragSt.item, kind === 'slot' ? id : null);
      ov.querySelector('.gr-bag').classList.toggle('drop-ok', kind === 'slot');
    }
    const o = ov.getBoundingClientRect();
    dragSt.ghost.style.left = (e.clientX - o.left) / s + 'px';
    dragSt.ghost.style.top = (e.clientY - o.top) / s + 'px';
  });
  window.addEventListener('pointerup', (e) => {
    if (!dragSt) return;
    const st = dragSt; dragSt = null;
    if (!st.on) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    st.ghost.remove(); ov.classList.remove('gr-dragging'); clearTargets();
    ov.querySelector('.gr-bag')?.classList.remove('drop-ok');
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
    if (!t) return;
    const target = t.dataset.drop;
    if (target === 'bag') { if (st.kind === 'slot') unequip(st.id); return; }
    const slot = target.split(':')[1];
    if (st.kind === 'bag') equipTo(st.id, slot); else moveSlot(st.id, slot);
  });
  window.addEventListener('pointercancel', () => { if (dragSt?.on) { dragSt.ghost.remove(); ov.classList.remove('gr-dragging'); clearTargets(); } dragSt = null; });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov) { hideTips(); S.sel = null; clearTargets(); ov.classList.remove('mk-selecting'); } });

  /* ---------------- cubuk + yerlesim ---------------- */
  function buildBar() {
    bar.replaceChildren();
    const add = (label, on, fn, dis, title) => { const b = el('button', on ? 'on' : '', label); if (dis) b.disabled = true; if (title) b.title = title; b.onclick = fn; bar.append(b); };
    for (const [v, l] of [['a', 'A'], ['b', 'B'], ['c', 'C'], ['now', 'Now']]) add(l, S.v === v, () => go({ v }));
    bar.append(el('span', 'sep'));
    for (const [s, l] of [['open', 'Both open'], ['locked', 'Trinket locked'], ['filled', 'Filled']]) add(l, S.st === s, () => go({ st: s }), S.v === 'now' && s === 'locked', S.v === 'now' && s === 'locked' ? 'Today there is a single slot, nothing to lock' : '');
    bar.append(el('span', 'sep'));
    for (const z of ['169', '219', 'ph']) add(SIZES[z].label, S.z === z, () => go({ z }));
    note.innerHTML = NOTES[S.v] + ' <b>' + STATE_NOTE[S.st] + '</b>' + (S.v === 'now' ? '' : ' Dene: bagdan surukle / dokun, cift tikla.');
  }
  function go(o) {
    const nv = o.v ?? S.v, ns = o.st ?? S.st;
    const reset = o.v !== undefined || o.st !== undefined;
    Object.assign(S, { v: nv, st: nv === 'now' && ns === 'locked' ? 'open' : ns, z: o.z ?? S.z });
    history.replaceState(null, '', `#${S.v}&s=${S.st}&z=${S.z}`);
    if (reset) resetItems();
    render(false);
  }
  function fit() {
    const z = SIZES[S.z];
    stage.style.width = z.w + 'px'; stage.style.height = z.h + 'px';
    stage.style.setProperty('--gu', z.gu + 'px');
    for (const kk of ['--el', '--er', '--et', '--eb']) stage.style.setProperty(kk, '0px');
    root.classList.toggle('short', S.z === 'ph');
    root.classList.toggle('compact', S.z === 'ph');
    const kk = Math.min(view.clientWidth / z.w, view.clientHeight / z.h, S.z === 'ph' ? 2.4 : 1);
    stage.style.transform = `scale(${kk})`;
    stage.dataset.k = String(kk);
  }
  function render(keepAnim) {
    buildBar(); fit();
    stage.innerHTML = shell();
    if (keepAnim) { ov = stage.querySelector('.mk-ov'); ov.style.animation = 'none'; ov.querySelector('.gr-panel').style.animation = 'none'; }
    wire();
  }
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', () => location.reload());
  resetItems();
  fetch(P + 'skills.html').then((r) => r.text()).catch(() => '').then((t) => { SKILLS = t; render(false); });
})();
