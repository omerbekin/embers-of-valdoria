/* Formation penceresi taslagi: oyun kodu degil. Menzil ipucu kurali src/engine/formation-hints.ts ile ayni; sayilar data/classes + deriveStats. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const H = (location.hash || '#a').slice(1).split('&');
  const S = { v: (H[0] || 'a')[0], n: 2, sel: '', moved: '', drag: null, hover: -1, over: -1 };
  H.forEach((p) => { if (p.startsWith('n=')) S.n = +p.slice(2) === 4 ? 4 : 2; if (p === 'clean') document.documentElement.classList.add('mk-clean'); });
  if (!'abc'.includes(S.v)) S.v = 'a';

  const sk = (n) => `formation/sk/${n}.webp`, st = (n) => `formation/st/${n}.webp`;
  const HEROES = {
    warrior: { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', range: 1, primary: 'str', hp: 108, mp: 42, spd: 17, armor: 18, attr: { str: 26, int: 12, dex: 8, luck: 14 },
      skills: [['Double Strike', 'sword', 'Free'], ['Whirlwind', 'whirlwind', '8'], ['Charge', 'charge', '10'], ["Headsman's Blow", 'warcry', 'rage']] },
    undead: { id: 'undead', name: 'Undead', role: 'Dark Mage', range: 5, primary: 'int', hp: 108, mp: 56, spd: 16, armor: 16, attr: { str: 26, int: 26, dex: 4, luck: 4 },
      skills: [['Bone Throw', 'bonethrow', 'Free'], ['Wail of the Dead', 'wail', 'hp'], ['Dark Bond', 'darkbond', 'Free'], ['Raise Dead', 'raise', '8']] },
    paladin: { id: 'paladin', name: 'Paladin', role: 'Holy Healer', range: 4, primary: 'int', hp: 102, mp: 56, spd: 16, armor: 22, attr: { str: 24, int: 26, dex: 4, luck: 6 },
      skills: [['Holy Strike', 'judgehammer', 'Free'], ['Resurrection', 'ankh', '16'], ['Judgment', 'judgebeam', '14'], ['Radiance', 'radiance', '20']] },
    archer: { id: 'archer', name: 'Archer', role: 'Marksman', range: 6, primary: 'dex', hp: 69, mp: 43, spd: 24, armor: 10, attr: { str: 13, int: 13, dex: 26, luck: 8 },
      skills: [['Quick Shot', 'arrow', 'Free'], ['Piercing Arrow', 'pierce', '3'], ['Arrow Rain', 'arrows', '16'], ['Aimed Shot', 'aimedshot', '10']] },
  };
  const COMPANY = { 2: [['warrior', 1, 11], ['undead', 0.82, 0]], 4: [['warrior', 1, 7], ['paladin', 0.55, 4], ['undead', 0.82, 1], ['archer', 0.3, 11]] };
  // yuva = satir*3 + serit; satir 0 = on. Warrior on, Undead arka (ekran goruntusundeki gibi)
  const cells = Array(12).fill('');
  const hpr = {}; let leader = 'warrior';
  const place = { 2: { warrior: 1, undead: 10 }, 4: { warrior: 1, paladin: 4, undead: 7, archer: 11 } };
  function load() { cells.fill(''); S.sel = S.moved = ''; Object.entries(place[S.n]).forEach(([id, s]) => (cells[s] = id)); COMPANY[S.n].forEach(([id, r]) => (hpr[id] = r)); }
  const roster = () => COMPANY[S.n].map(([id]) => HEROES[id]);
  const rowOf = (s) => Math.floor(s / 3), slotOf = (id) => cells.indexOf(id);
  const ROWN = ['Front row', '2nd row', '3rd row', 'Back row'], rown = (r) => ROWN[r].toLowerCase();
  const rtype = (R) => (R <= 2 ? 'Melee' : R <= 4 ? 'Mid-range' : 'Long range');

  // ---- ipucu (engine/formation-hints.ts ile ayni) ----
  function hintOf(arr, id) {
    const s = arr.indexOf(id); if (s < 0) return null;
    const rg = (x) => HEROES[x].range;
    let front = 9; arr.forEach((x, i) => x && (front = Math.min(front, rowOf(i))));
    const row = rowOf(s), R = rg(id);
    if (R - 1 - row < 0) return { kind: 'out', R, row, maxRow: Math.max(0, R - 1) };
    if (R >= 5 && row === front && arr.some((x, j) => x && x !== id && rg(x) <= 2)) return { kind: 'exp', R, row, fromRow: Math.min(3, R - 1) };
    return null;
  }
  const hintText = (h, nm) => h.kind === 'out' ? `${nm} (Range ${h.R}) can't reach the enemy from the ${rown(h.row)}. Try ${h.maxRow === 0 ? 'the front row' : 'the ' + rown(h.maxRow) + ' or closer'}.` : `${nm} (Range ${h.R}) can still reach the enemy from the ${rown(h.fromRow)}. It is safer behind your melee.`;
  const stateOf = (h) => (!h ? 'g' : h.kind === 'out' ? 'b' : 'w');
  const sTitle = { g: 'Good spot', w: 'Exposed in front', b: 'Out of reach' }, sSym = { g: '✓', w: '!', b: '✕' };
  const sCol = { g: 'var(--good)', w: 'var(--warn)', b: 'var(--bad)' };
  function fitAt(id, cell) { // id'yi cell'e koyarsak (yer degistirerek) ne olur
    const from = slotOf(id), a = cells.slice(); a[from] = a[cell]; a[cell] = id; const h = hintOf(a, id); return { st: stateOf(h), h };
  }
  const goodText = (nm) => `${nm} reaches the enemy from here.`;
  function bandFor(id, cell, preview) {
    const hr = HEROES[id], f = preview ? fitAt(id, cell) : { st: stateOf(hintOf(cells, id)), h: hintOf(cells, id) };
    const txt = f.h ? hintText(f.h, hr.name) : 'Good spot: it reaches the enemy from here.';
    return { st: f.st, kind: preview ? `If ${hr.name} moves here` : 'Range hint', title: sTitle[f.st], text: txt };
  }
  const bandHTML = (b) => `<div class="band ${b.st}"><div class="bi"><span>${sSym[b.st]}</span></div><div><div class="bk">${b.kind}</div><div class="bt">${b.title}</div><div class="bx">${b.text}</div></div></div>`;

  // ---- parcalar ----
  const crown = '<svg class="crown" viewBox="-16 -12 32 24"><polygon points="-14,8 -14,-6 -7,1 0,-10 7,1 14,-6 14,8" fill="#2a1d10" stroke="#f3d999" stroke-width="1.6"/><circle cx="0" cy="3" r="2.6" fill="#e0702a"/></svg>';
  const hpCls = (r) => (r > 0.6 ? '' : r > 0.3 ? 'mid' : 'low');
  const hpBar = (r, c = 'hpb') => `<div class="${c}"><i class="${hpCls(r)}" style="width:${Math.round(r * 100)}%"></i></div>`;
  const av = (id) => `formation/av/${id}.webp`;
  const costChip = (c) => (c === 'Free' ? '<span class="chip free">Free</span>' : c === 'rage' ? '<span class="chip rage">Rage <b>30</b></span>' : c === 'hp' ? '<span class="chip">HP <b>20%</b></span>' : `<span class="chip"><img src="${st('mp')}" alt=""><b>${c}</b></span>`);
  const ICON = { str: 'Strength', int: 'Intelligence', dex: 'Dexterity', luck: 'Luck' };
  const statRow = (k, label, val, p) => `<div class="sr ${p ? 'p' : ''}"><img src="${st(k)}" alt=""><span class="k">${label}</span><span class="n">${val}</span></div>`;
  const mainVal = (h, k) => h.attr[k] + (h.primary === k ? 6 : 0);
  const platesFor = (h, cls) => h.skills.map((s, i) => `<div class="plate ${s[2] === 'rage' ? 'rg' : ''}"><div class="ico sm sk" style="--is:${cls || 64}px"><img src="${sk(s[1])}" alt=""></div><div class="pn">${s[0]}</div>${costChip(s[2])}</div>`).join('');
  const heroChips = (h) => { const s = slotOf(h.id); return `<div class="chips"><span class="chip">${h.role}</span><span class="chip hot">Range <b>${h.range}</b> &middot; ${rtype(h.range).replace('-range', '').replace(' range', '')}</span><span class="chip">${ROWN[rowOf(s)]}</span></div>`; };
  const nameLine = (h) => `<div class="nmt"><span class="t">${h.name}</span><span class="lv"><i>Lv</i>1</span></div>`;
  const focus = () => HEROES[S.sel] || HEROES[S.moved] || HEROES[leader];
  const btn = (txt, cls, id) => `<button class="el-btn ${cls}" data-act="${id}">${txt}</button>`;
  const wrapBtns = () => `<div class="btns">${btn('Auto arrange', '', 'auto')}${btn('Done', 'primary', 'done')}</div>`;

  // ---- ızgara ----
  function gridHTML(c, gap, gx, gy, labelsGap) {
    const gw = 4 * c + 3 * gap, gh = 3 * c + 2 * gap, pre = S.drag && S.drag.on ? S.drag.id : S.sel;
    let out = `<div class="lbl back" style="left:${gx - 190}px;width:170px;top:${gy + gh / 2 - 10}px">Back</div><div class="lbl front" style="left:${gx + gw + labelsGap}px;top:${gy + gh / 2 - 10}px">Front ▸</div><div class="grid" id="grid" style="left:${gx}px;top:${gy}px;--c:${c}px">`;
    for (let row = 0; row < 4; row++) for (let lane = 0; lane < 3; lane++) {
      const slot = row * 3 + lane, id = cells[slot], h = HEROES[id];
      const x = (3 - row) * (c + gap), y = lane * (c + gap);
      let cls = 'cell' + (h ? '' : ' empty') + (row === 0 && !h ? ' fr' : '') + (id && id === S.sel ? ' sel' : '') + (S.drag && S.drag.on && S.drag.id === id ? ' src' : '');
      let inner = '';
      if (pre && id !== pre && HEROES[pre]) { const f = fitAt(pre, slot); cls += ' p' + f.st; inner += `<div class="pv" style="--bd:${sCol[f.st]}">${sSym[f.st]}</div>`; if (S.over === slot) cls += ' hot'; }
      if (h) {
        const hn = hintOf(cells, id);
        inner += `<img class="av" src="${av(id)}" alt=""><div class="nm">${h.name}</div><div class="hp"><i class="${hpCls(hpr[id])}" style="width:${hpr[id] * 100}%"></i></div>${id === leader ? crown : ''}${hn ? `<div class="badge" style="--bd:${sCol[stateOf(hn)]}">!</div>` : ''}`;
      }
      out += `<div class="${cls}" data-slot="${slot}" style="left:${x}px;top:${y}px;width:${c}px;height:${c}px">${inner}</div>`;
    }
    return out + '</div>';
  }

  // ---- A: Band ----
  function viewA() {
    const f = focus(), s = slotOf(f.id), c = 128, gap = 10, gx = 120, gy = 150;
    const b = S.hover >= 0 && (S.sel || (S.drag && S.drag.on)) ? bandFor(S.sel || S.drag.id, S.hover, true) : bandFor(f.id, s, false);
    const strip = [...roster()].map((h) => `<div class="rchip ${h.id === f.id ? 'on' : ''}" data-pick="${h.id}"><div class="rn">${h.name}</div><div class="ico sm" style="--is:40px"><img src="${av(h.id)}" alt=""></div><div class="rrw">${["Front","2nd","3rd","Back"][rowOf(slotOf(h.id))]}</div>${hpBar(hpr[h.id], 'hpb rh')}</div>`).join('') + Array(4 - S.n).fill('<div class="rchip empty-slot">Empty</div>').join('');
    return `${gridHTML(c, gap, gx, gy, 18)}
    <div class="below" style="left:${gx}px;top:${gy + 3 * c + 2 * gap + 26}px;width:${4 * c + 3 * gap}px"><div class="sl">Your company <b>${S.n} / 4</b></div><div class="rstrip">${strip}</div><div class="legend"><span class="chip good">✓ Good spot</span><span class="chip warn">! Exposed</span><span class="chip bad">✕ Out of reach</span></div></div>
    <div class="panel ap" style="left:770px;top:140px;width:550px;height:640px">
      <div class="aph"><div class="ico" style="--is:92px"><img src="${av(f.id)}" alt=""></div><div class="apt"><div class="kind">${S.sel ? 'Selected' : 'Your company'}</div>${nameLine(f)}${heroChips(f)}</div></div>
      <div class="apb">${bandHTML(b)}
      <div class="bars two"><div class="bar2"><img src="${st('hp')}" alt=""><div class="bb"><i class="${hpCls(hpr[f.id])}" style="width:${hpr[f.id] * 100}%;background:${hpr[f.id] > .6 ? 'var(--good)' : hpr[f.id] > .3 ? '#d9b24a' : '#c4553f'}"></i></div><span class="v">${Math.round(f.hp * hpr[f.id])}<small> / ${f.hp}</small></span></div><div class="bar2"><img src="${st('mp')}" alt=""><div class="bb"><i style="width:100%;background:#4a8fd0"></i></div><span class="v">${f.mp}<small> / ${f.mp}</small></span></div></div>
      <div class="stg">${['str', 'int', 'dex', 'luck'].map((k) => statRow(k, ICON[k], mainVal(f, k), f.primary === k)).join('')}${statRow('armor', 'Armor', f.armor)}${statRow('spd', 'Speed', f.spd)}</div>
      <div class="slr"><div class="sl">Skills</div><button class="el-btn" data-act="details" style="width:230px;min-height:46px;font-size:16px">Hero details</button></div><div class="plates4">${platesFor(f, 54)}</div></div></div>
    ${wrapBtns()}`;
  }

  // ---- B: Roster ----
  function viewB() {
    const f = focus(), c = 150, gap = 10, gx = 90, gy = 150;
    const gh = 3 * c + 2 * gap, gw = 4 * c + 3 * gap;
    const rows = roster().map((h) => {
      const s = slotOf(h.id), hn = hintOf(cells, h.id), st_ = stateOf(hn), open = h.id === f.id;
      const head = `<div class="rrh"><div class="ico sm" style="--is:${open ? 64 : 46}px"><img src="${av(h.id)}" alt=""></div><div class="rrt"><div class="rrn">${h.name}${h.id === leader ? ' <svg viewBox="-16 -12 32 24" width="22" height="16" style="vertical-align:-1px"><polygon points="-14,8 -14,-6 -7,1 0,-10 7,1 14,-6 14,8" fill="#2a1d10" stroke="#f3d999" stroke-width="1.6"/></svg>' : ''}</div><div class="rrs">${h.role} &middot; ${ROWN[rowOf(s)]}</div></div><div class="rrr"><span class="chip ${st_ === 'g' ? 'good' : st_ === 'w' ? 'warn' : 'bad'}">${sSym[st_]} R${h.range}</span>${open ? '' : hpBar(hpr[h.id], 'hpb rh2')}</div></div>`;
      if (!open) return `<div class="rr ${'' }" data-pick="${h.id}">${head}</div>`;
      const b = S.hover >= 0 && (S.sel || (S.drag && S.drag.on)) ? bandFor(S.sel || S.drag.id, S.hover, true) : bandFor(h.id, s, false);
      return `<div class="rr open" data-pick="${h.id}">${head}<div class="rrb">${bandHTML(b)}<div class="rst">${['str', 'int', 'dex', 'luck'].map((k) => `<span class="chip ${h.primary === k ? 'hot' : ''}"><img src="${st(k)}" alt="">${mainVal(h, k)}</span>`).join('')}<span class="chip"><img src="${st('armor')}" alt=""><b>${h.armor}</b></span><span class="chip"><img src="${st('hp')}" alt=""><b>${Math.round(h.hp * hpr[h.id])}</b>/${h.hp}</span><span class="chip"><img src="${st('spd')}" alt=""><b>${h.spd}</b></span></div>
                <div class="plates4 tight">${platesFor(h, 52)}</div><div style="display:flex;justify-content:flex-end"><button class="el-btn" data-act="details" style="width:220px;min-height:44px;font-size:15px">Hero details</button></div></div></div>`;
    }).join('') + Array(4 - S.n).fill('<div class="rr empty-slot" style="height:46px">Empty slot</div>').join('');
    return `${gridHTML(c, gap, gx, gy, 14)}
    <div class="below" style="left:${gx}px;top:${gy + gh + 22}px;width:${gw}px"><div class="sl">Reach guide</div><div class="legend"><span class="chip good">✓ Good spot</span><span class="chip warn">! Exposed in front</span><span class="chip bad">✕ Out of reach</span></div><div class="how">Drag a hero to a cell, or tap a hero and then a cell. Tapping a filled cell swaps the two.</div></div>
    <div class="rcol" style="left:830px;top:140px;width:490px"><div class="sl">Your company <b>${S.n} / 4</b></div>${rows}</div>${wrapBtns()}`;
  }

  // ---- C: Tactical ----
  function viewC() {
    const f = focus(), s = slotOf(f.id), c = 128, gap = 10, gx = 120, gy = 150, gw = 4 * c + 3 * gap, gh = 3 * c + 2 * gap;
    // menzil cetveli: her sira icin secili kahramanin vurabildigi en arka dusman sirasi
    const pid = S.sel || (S.drag && S.drag.on && S.drag.id) || f.id;
    const ph = HEROES[pid];
    let ruler = '';
    for (let row = 0; row < 4; row++) {
      const reach = Math.min(4, ph.range - row), x = (3 - row) * (c + gap), here = slotOf(pid) >= 0 && rowOf(slotOf(pid)) === row;
      ruler += `<div class="rl ${reach <= 0 ? 'no' : ''} ${here ? 'here' : ''}" style="left:${x}px;width:${c}px"><div class="rb">${reach <= 0 ? '<span>No reach</span>' : [1, 2, 3, 4].map((i) => `<i class="${i <= reach ? 'on' : ''}"></i>`).join('')}</div><div class="rt">${reach <= 0 ? 'Cannot hit' : reach >= 4 ? 'Hits all rows' : reach === 1 ? 'Hits front row' : `Hits rows 1–${reach}`}</div><div class="rn">${ROWN[row]}</div></div>`;
    }
    const tabs = roster().map((h) => `<div class="tab ${h.id === f.id ? 'on' : ''}" data-pick="${h.id}"><img src="${av(h.id)}" alt="">${hpBar(hpr[h.id], 'hpb')}</div>`).join('') + Array(4 - S.n).fill('<div class="tab empty-slot">+</div>').join('');
    const b = S.hover >= 0 && (S.sel || (S.drag && S.drag.on)) ? bandFor(S.sel || S.drag.id, S.hover, true) : bandFor(f.id, s, false);
    const tile = (k, label, v, p) => `<div class="tile ${p ? 'p' : ''}"><img src="${st(k)}" alt=""><div class="tx"><span class="n">${v}</span><span class="k">${label}</span></div></div>`;
    const rowsK = f.skills.map((x) => `<div class="srow ${x[2] === 'rage' ? 'rg' : ''}"><div class="ico sm sk" style="--is:54px"><img src="${sk(x[1])}" alt=""></div><div class="srt"><div class="pn">${x[0]}</div></div>${costChip(x[2])}</div>`).join('');
    return `${gridHTML(c, gap, gx, gy, 18)}
    <div class="below ruler" style="left:${gx}px;top:${gy + gh + 22}px;width:${gw}px"><div class="sl" style="margin-bottom:8px">Reach of ${ph.name} <b>Range ${ph.range}</b></div><div class="rlw">${ruler}</div></div>
    <div class="panel cp" style="left:770px;top:140px;width:550px;height:680px">
      <div class="tabs"><div class="sl" style="flex:none;width:190px">Your company <b>${S.n}/4</b></div>${tabs}</div>
      <div class="chd"><div class="ico" style="--is:84px"><img src="${av(f.id)}" alt=""></div><div class="apt">${nameLine(f)}${heroChips(f)}</div></div>
      <div style="padding:0 16px">${bandHTML(b)}</div>
      <div class="tiles">${['str', 'int', 'dex', 'luck'].map((k) => tile(k, ICON[k], mainVal(f, k), f.primary === k)).join('')}${tile('armor', 'Armor', f.armor)}${tile('spd', 'Speed', f.spd)}</div>
      <div class="slr" style="padding:0 16px"><div class="sl">Skills</div><button class="el-btn" data-act="details" style="width:230px;min-height:46px;font-size:16px">Hero details</button></div><div class="srows">${rowsK}</div></div>
    ${wrapBtns()}`;
  }

  // ---- cizim ----
  const notes = {
    a: 'A Band: pencere ve butonlar aynı; sağ panel karakter kartı A gibi (ad + Lv, çipler, Band menzil satırı, statlar, skill plakaları); ızgara altında tüm şirket şeridi.',
    b: 'B Roster: büyük hücreler (150px) + sağda tüm kahramanların listesi, seçili olan açılır (hint, stat çipleri, skill plakaları); izgara altı Reach rehberi.',
    c: 'C Tactical: izgara altında seçili kahramanın menzil cetveli (hangi sırada düşmanın kaç sırasını vurur), sağda portre sekmeleri, stat karoları, skill satırları.',
  };
  function render() {
    const body = { a: viewA, b: viewB, c: viewC }[S.v]();
    $('#win').innerHTML = `<div class="ttl">Formation</div><div class="sub">The front row faces the enemy.</div>${body}`;
    $('#note').innerHTML = `<b>MOCKUP</b>${notes[S.v]}`;
    document.querySelectorAll('#mk-strip button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v || +b.dataset.n === S.n));
    bind();
  }
  function fit() {
    const k = Math.min(innerWidth / 1920, (innerHeight - (document.documentElement.classList.contains('mk-clean') ? 0 : 28)) / 1080);
    $('#stage').style.transform = `scale(${k})`; $('#wrap').style.paddingTop = document.documentElement.classList.contains('mk-clean') ? '0' : '28px'; S.k = k;
  }
  const pt = (e) => { const r = $('#stage').getBoundingClientRect(); return { x: (e.clientX - r.left) / S.k, y: (e.clientY - r.top) / S.k }; };
  const cellAt = (p) => { const g = $('#grid'); if (!g) return -1; const wr = $('#win'); const gl = g.offsetLeft + wr.offsetLeft, gt = g.offsetTop + wr.offsetTop; for (const el of g.children) { const x = gl + el.offsetLeft, y = gt + el.offsetTop; if (p.x >= x && p.x <= x + el.offsetWidth && p.y >= y && p.y <= y + el.offsetHeight) return +el.dataset.slot; } return -1; };
  function move(id, cell) { const from = slotOf(id), o = cells[cell]; cells[cell] = id; cells[from] = o; S.moved = id; }
  function auto() { cells.fill(''); Object.entries(place[S.n]).forEach(([id, sl]) => (cells[sl] = id)); S.sel = ''; }
  let tip;
  function bind() {
    $('#win').onclick = (e) => { const a = e.target.closest('[data-act]'); if (a && a.dataset.act === 'auto') { auto(); render(); } const p = e.target.closest('[data-pick]'); if (p) { S.sel = S.sel === p.dataset.pick ? '' : p.dataset.pick; render(); } };
    $('#win').onpointerdown = (e) => { const c = e.target.closest('.cell'); if (!c || e.button) return; const id = cells[+c.dataset.slot]; S.down = { slot: +c.dataset.slot, id, x: e.clientX, y: e.clientY, moved: false }; };
    $('#win').onpointermove = (e) => {
      const p = pt(e), cell = cellAt(p);
      if (S.down && S.down.id && !S.down.moved && Math.hypot(e.clientX - S.down.x, e.clientY - S.down.y) > 10) { S.down.moved = true; S.drag = { id: S.down.id, on: true }; S.hover = cell; render(); ghost(); }
      if (S.drag && S.drag.on) { const g = $('#ghost'); if (g) { g.style.left = p.x - 56 + 'px'; g.style.top = p.y - 56 + 'px'; } }
      if (cell !== S.hover) { S.over = cell; S.hover = cell; if (S.drag && S.drag.on) { const keep = $('#ghost'); render(); ghost(); const g2 = $('#ghost'); if (g2) { g2.style.left = p.x - 56 + 'px'; g2.style.top = p.y - 56 + 'px'; } } else { tooltip(cell, p); if (S.sel) render(); } }
      else if (!S.drag) tooltip(cell, p);
    };
    $('#win').onpointerleave = () => { if (tip) { tip.remove(); tip = null; } };
    $('#win').onpointerup = (e) => {
      const p = pt(e), cell = cellAt(p);
      if (S.drag && S.drag.on) { const id = S.drag.id; S.drag = null; S.down = null; S.over = -1; if (cell >= 0 && cell !== slotOf(id)) { move(id, cell); } S.sel = ''; render(); return; }
      const d = S.down; S.down = null; if (!d || cell < 0) return;
      if (!S.sel) { if (cells[cell]) S.sel = cells[cell]; } else if (S.sel === cells[cell]) S.sel = ''; else { move(S.sel, cell); S.sel = ''; }
      S.over = -1; render();
    };
  }
  function ghost() { const st_ = $('#stage'), g = document.createElement('div'); g.className = 'ghost'; g.id = 'ghost'; g.innerHTML = `<img src="${av(S.drag.id)}" alt="">`; st_.appendChild(g); }
  function tooltip(cell, p) {
    if (tip) { tip.remove(); tip = null; }
    if (cell < 0 || S.sel || (S.drag && S.drag.on)) return;
    const id = cells[cell]; if (!id) return;
    const h = HEROES[id], b = bandFor(id, cell, false), t = document.createElement('div'); t.className = 'tipfloat';
    t.innerHTML = bandHTML({ ...b, kind: `${h.name} · ${ROWN[rowOf(cell)]} · Range ${h.range}` });
    t.style.left = Math.min(p.x + 18, 1900 - 360) + 'px'; t.style.top = p.y + 18 + 'px'; $('#stage').appendChild(t); tip = t;
  }
  function init() {
    document.body.insertAdjacentHTML('beforeend', '<div id="mk-strip"><b>MOCKUP</b>Formation &middot; <button data-v="a">A Band</button><button data-v="b">B Roster</button><button data-v="c">C Tactical</button> &middot; heroes: <button data-n="2">2</button><button data-n="4">4</button></div>');
    $('#mk-strip').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v) S.v = b.dataset.v; if (b.dataset.n) { S.n = +b.dataset.n; load(); } location.hash = `${S.v}&n=${S.n}` + (document.documentElement.classList.contains('mk-clean') ? '&clean' : ''); render(); };
    window.addEventListener('hashchange', () => { const h = (location.hash || '#a').slice(1).split('&'); if ('abc'.includes(h[0][0] || 'a')) S.v = (h[0] || 'a')[0]; const n = h.includes('n=4') ? 4 : 2; if (n !== S.n) { S.n = n; load(); } render(); });
    addEventListener('resize', fit);
    load(); fit(); render();
  }
  init();
})();
