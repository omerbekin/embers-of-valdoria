/* Formation penceresi taslagi (v2): oyun kodu degil. Menzil ipucu kurali src/engine/formation-hints.ts ile ayni; sayilar data/classes + deriveStats. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const H = (location.hash || '#a').slice(1).split('&');
  const S = { v: (H[0] || 'a')[0], n: 2, sel: '', moved: '', drag: null, hover: -1, over: -1 };
  H.forEach((p) => { if (p.startsWith('n=')) S.n = +p.slice(2) === 4 ? 4 : 2; if (p === 'clean') document.documentElement.classList.add('mk-clean'); });
  if (!'abc'.includes(S.v)) S.v = 'a';

  const sk = (n) => `formation/sk/${n}.webp`, st = (n) => `formation/st/${n}.webp`, av = (id) => `formation/av/${id}.webp`;
  const HEROES = {
    warrior: { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', range: 1, primary: 'str', hp: 108, mp: 42, attr: { str: 26, int: 12, dex: 8, luck: 14 }, passive: ['Berserker', 'rage'],
      skills: [['Double Strike', 'sword', 'Free'], ['Whirlwind', 'whirlwind', '8'], ['Charge', 'charge', '10'], ["Headsman's Blow", 'warcry', 'rage']] },
    undead: { id: 'undead', name: 'Undead', role: 'Dark Mage', range: 5, primary: 'int', hp: 108, mp: 56, attr: { str: 26, int: 26, dex: 4, luck: 4 }, passive: ['Vampiric Bite', 'soul'],
      skills: [['Bone Throw', 'bonethrow', 'Free'], ['Wail of the Dead', 'wail', 'hp'], ['Dark Bond', 'darkbond', 'Free'], ['Raise Dead', 'raise', '8']] },
    paladin: { id: 'paladin', name: 'Paladin', role: 'Holy Healer', range: 4, primary: 'int', hp: 102, mp: 56, attr: { str: 24, int: 26, dex: 4, luck: 6 }, passive: ['Divine Light', 'divine'],
      skills: [['Holy Strike', 'judgehammer', 'Free'], ['Resurrection', 'ankh', '16'], ['Judgment', 'judgebeam', '14'], ['Radiance', 'radiance', '20']] },
    archer: { id: 'archer', name: 'Archer', role: 'Marksman', range: 6, primary: 'dex', hp: 69, mp: 43, attr: { str: 13, int: 13, dex: 26, luck: 8 }, passive: ['Sharpshooter', 'sharp'],
      skills: [['Quick Shot', 'arrow', 'Free'], ['Piercing Arrow', 'pierce', '3'], ['Arrow Rain', 'arrows', '16'], ['Aimed Shot', 'aimedshot', '10']] },
  };
  const COMPANY = { 2: [['warrior', 1], ['undead', 0.82]], 4: [['warrior', 1], ['paladin', 0.55], ['undead', 0.82], ['archer', 0.3]] };
  const place = { 2: { warrior: 1, undead: 10 }, 4: { warrior: 1, paladin: 4, undead: 7, archer: 11 } };
  const cells = Array(12).fill(''), hpr = {}, leader = 'warrior';
  function load() { cells.fill(''); S.sel = S.moved = ''; Object.entries(place[S.n]).forEach(([id, s]) => (cells[s] = id)); COMPANY[S.n].forEach(([id, r]) => (hpr[id] = r)); }
  const roster = () => COMPANY[S.n].map(([id]) => HEROES[id]);
  const rowOf = (s) => Math.floor(s / 3), slotOf = (id) => cells.indexOf(id);
  const ROWN = ['Front row', '2nd row', '3rd row', 'Back row'];

  // ---- menzil (engine/formation-hints.ts ile ayni kural) ----
  function hintOf(arr, id) {
    const s = arr.indexOf(id); if (s < 0) return null;
    let front = 9; arr.forEach((x, i) => x && (front = Math.min(front, rowOf(i))));
    const row = rowOf(s), R = HEROES[id].range;
    if (R - 1 - row < 0) return 'out';
    if (R >= 5 && row === front && arr.some((x, j) => x && x !== id && HEROES[x].range <= 2)) return 'exp';
    return null;
  }
  const reachAt = (id, row) => Math.max(0, Math.min(4, HEROES[id].range - row)); // dusmanin kac sirasina ulasir
  const reachText = (n) => (n <= 0 ? "Can't reach the enemy from here" : n >= 4 ? 'From here: hits every row' : n === 3 ? 'From here: hits almost every row' : n === 2 ? 'From here: hits the first two rows' : 'From here: hits the front row only');
  function fitAt(id, cell) { const from = slotOf(id), a = cells.slice(); a[from] = a[cell]; a[cell] = id; return hintOf(a, id); }

  // ---- kucuk parcalar ----
  const crown = '<svg class="crown" viewBox="-16 -12 32 24"><polygon points="-14,8 -14,-6 -7,1 0,-10 7,1 14,-6 14,8" fill="#2a1d10" stroke="#f3d999" stroke-width="1.6"/><circle cx="0" cy="3" r="2.6" fill="#e0702a"/></svg>';
  const hpCls = (r) => (r > 0.6 ? '' : r > 0.3 ? 'mid' : 'low');
  const hpBar = (r, c = 'hpb') => `<div class="${c}"><i class="${hpCls(r)}" style="width:${Math.round(r * 100)}%"></i></div>`;
  const costChip = (c) => (c === 'Free' ? '<span class="chip free">Free</span>' : c === 'rage' ? '<span class="chip rage">Rage <b>30</b></span>' : c === 'hp' ? '<span class="chip">HP <b>20%</b></span>' : `<span class="chip"><img src="${st('mp')}" alt=""><b>${c}</b></span>`);
  const NAMES = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck' }, ORDER = ['str', 'dex', 'int', 'luck'];
  const mainVal = (h, k) => h.attr[k] + (h.primary === k ? 6 : 0);
  const focus = () => HEROES[S.sel] || HEROES[S.moved] || HEROES[leader];
  const btn = (txt, cls, id) => `<button class="el-btn ${cls}" data-act="${id}">${txt}</button>`;
  const wrapBtns = () => `<div class="btns">${btn('Auto arrange', '', 'auto')}${btn('Done', 'primary', 'done')}</div>`;
  const chipsOf = (h) => `<div class="chips one"><span class="chip">${h.role}</span><span class="chip hot">Range <b>${h.range}</b></span><span class="chip">${ROWN[rowOf(slotOf(h.id))]}</span></div>`;
  const nameLine = (h) => `<div class="nmt"><span class="t">${h.name}</span><span class="lv"><i>Lv</i>1</span></div>`;
  const hpCol = (r) => (r > 0.6 ? 'var(--good)' : r > 0.3 ? '#d9b24a' : '#c4553f');
  const bars = (h) => `<div class="bars"><div class="bar2"><img src="${st('hp')}" alt=""><div class="bb"><i style="width:${hpr[h.id] * 100}%;background:${hpCol(hpr[h.id])}"></i></div><span class="v">${Math.round(h.hp * hpr[h.id])}</span></div><div class="bar2"><img src="${st('mp')}" alt=""><div class="bb"><i style="width:100%;background:#4a8fd0"></i></div><span class="v">${h.mp}</span></div></div>`;
  const passivePlate = (h, cls) => `<div class="plate pas ${cls || ''}"><span class="ptag">Passive</span><div class="ico sm sk" style="--is:${cls === 'wide' ? 54 : 54}px"><img src="${sk(h.passive[1])}" alt=""></div><div class="pn">${h.passive[0]}</div></div>`;
  const skillPlate = (s) => `<div class="plate ${s[2] === 'rage' ? 'rg' : ''}"><div class="ico sm sk" style="--is:54px"><img src="${sk(s[1])}" alt=""></div><div class="pn">${s[0]}</div>${costChip(s[2])}</div>`;
  const detailsBtn = () => `<button class="el-btn" data-act="details" style="width:230px;min-height:46px;font-size:16px">Hero details</button>`;

  // ---- ızgara ----
  function gridHTML() {
    const c = 128, gap = 10, gx = 120, gy = 150, gw = 4 * c + 3 * gap, gh = 3 * c + 2 * gap, pre = S.drag && S.drag.on ? S.drag.id : S.sel;
    let out = `<div class="lbl back" style="left:${gx - 190}px;width:170px;top:${gy + gh / 2 - 10}px">Back</div><div class="lbl front" style="left:${gx + gw + 18}px;top:${gy + gh / 2 - 10}px">Front ▸</div><div class="grid" id="grid" style="left:${gx}px;top:${gy}px;--c:${c}px">`;
    for (let row = 0; row < 4; row++) for (let lane = 0; lane < 3; lane++) {
      const slot = row * 3 + lane, id = cells[slot], h = HEROES[id];
      let cls = 'cell' + (h ? '' : ' empty') + (row === 0 && !h ? ' fr' : '') + (id && id === S.sel ? ' sel' : '') + (S.drag && S.drag.on && S.drag.id === id ? ' src' : '');
      let inner = '';
      const pre2 = S.drag && S.drag.on ? S.drag.id : (S.sel && !id ? S.sel : ''); if (pre2 && id !== pre2 && HEROES[pre2]) { const f = fitAt(pre2, slot); if (f) { cls += f === 'out' ? ' pb' : ' pw'; inner += '<i class="pdot"></i>'; } if (S.over === slot) cls += ' hot'; }
      if (h) inner += `<img class="av" src="${av(id)}" alt=""><div class="nm">${h.name}</div><div class="hp"><i class="${hpCls(hpr[id])}" style="width:${hpr[id] * 100}%"></i></div>${id === leader ? crown : ''}${!pre && hintOf(cells, id) ? '<i class="pdot own"></i>' : ''}`;
      out += `<div class="${cls}" data-slot="${slot}" style="left:${(3 - row) * (c + gap)}px;top:${lane * (c + gap)}px;width:${c}px;height:${c}px">${inner}</div>`;
    }
    return out + `</div><div class="how" style="left:${gx}px;top:${gy + gh + 24}px;width:${gw}px">Drag a hero onto another hero to swap, or onto an empty cell to move. Tap a hero to select it, then tap an empty cell. Hover any cell to see how far a hero reaches from there.</div>`;
  }

  // ---- sag panel: ortak parcalar ----
  function panel() {
    const f = focus(), v = S.v;
    const head = `<div class="chd"><div class="ico" style="--is:84px"><img src="${av(f.id)}" alt=""></div><div class="apt">${nameLine(f)}${chipsOf(f)}</div></div>`;
    const skRow = (x) => `<div class="srow ${x[2] === 'rage' ? 'rg' : ''}"><div class="ico sm sk" style="--is:44px"><img src="${sk(x[1])}" alt=""></div><div class="pn">${x[0]}</div>${costChip(x[2])}</div>`;
    if (v === 'a') {
      const tiles = ORDER.map((k) => `<div class="tile ${f.primary === k ? 'p' : ''}"><img src="${st(k)}" alt=""><div class="tx"><span class="n">${mainVal(f, k)}</span><span class="k">${NAMES[k]}</span></div></div>`).join('');
      return `${head}${bars(f)}<div class="tilesA">${tiles}</div><div class="sl">Skills</div><div class="srowsA"><div class="srow pas"><div class="ico sm sk" style="--is:44px"><img src="${sk(f.passive[1])}" alt=""></div><div class="pn">${f.passive[0]}</div><span class="ptag">Passive</span></div>${f.skills.map(skRow).join('')}</div><div class="foot">${detailsBtn()}</div>`;
    }
    if (v === 'b') {
      const rows = ORDER.map((k) => `<div class="sr ${f.primary === k ? 'p' : ''}"><img src="${st(k)}" alt=""><span class="k">${NAMES[k]}</span><span class="n">${mainVal(f, k)}</span></div>`).join('');
      return `${head}<div class="midB"><div class="srB">${rows}</div>${bars(f)}</div><div class="slr"><div class="sl">Skills</div>${detailsBtn()}</div><div class="plates5">${passivePlate(f)}${f.skills.map(skillPlate).join('')}</div>`;
    }
    const chips = ORDER.map((k) => `<span class="chip ${f.primary === k ? 'hot' : ''}"><img src="${st(k)}" alt=""><b>${mainVal(f, k)}</b>${NAMES[k].slice(0, 3)}</span>`).join('');
    const ic = (x) => `<div class="ic ${x[2] === 'rage' ? 'rg' : ''}"><div class="ico sm sk" style="--is:60px"><img src="${sk(x[1])}" alt=""></div><div class="pn">${x[0]}</div></div>`;
    return `${head}${bars(f)}<div class="chips one statsC">${chips}</div><div class="sl">Skills</div><div class="iconsC"><div class="ic pas"><div class="ico sm sk" style="--is:60px"><img src="${sk(f.passive[1])}" alt=""></div><div class="pn">${f.passive[0]}</div><span class="ptag">Passive</span></div>${f.skills.map(ic).join('')}</div><div class="foot wide">${detailsBtn()}</div>`;
  }

  const notes = {
    a: 'A: ad + etiketler, HP/MP, 4 stat karosu yan yana; Passive tam genişlikte İLK satır, altında 2x2 skill; Hero details altta sağda.',
    b: 'B: stat listesi (Sheet) + HP/MP yan yana; Passive İLK plaka, 5 plaka tek sırada; Hero details Skills başlığının yanında.',
    c: 'C: stat tek çip satırı; ikon ızgarasında Passive İLK; Hero details altta tam genişlikte tek düğme. Hover kutusu üçünde de aynı (Band).',
  };
  function render() {
    $('#win').innerHTML = `<div class="ttl">Formation</div><div class="sub">The front row faces the enemy.</div>${gridHTML()}<div class="panel rp v${S.v}" style="left:770px;top:134px;width:550px;height:580px">${panel()}</div>${wrapBtns()}`;
    $('#note').innerHTML = `<b>MOCKUP</b>${notes[S.v]}`;
    document.querySelectorAll('#mk-strip button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v || +b.dataset.n === S.n));
    bind();
  }
  function fit() { const clean = document.documentElement.classList.contains('mk-clean'), k = Math.min(innerWidth / 1920, (innerHeight - (clean ? 0 : 28)) / 1080); $('#stage').style.transform = `scale(${k})`; $('#wrap').style.paddingTop = clean ? '0' : '28px'; S.k = k; }
  const pt = (e) => { const r = $('#stage').getBoundingClientRect(); return { x: (e.clientX - r.left) / S.k, y: (e.clientY - r.top) / S.k }; };
  const cellAt = (p) => { const g = $('#grid'); if (!g) return -1; const wr = $('#win'); const gl = g.offsetLeft + wr.offsetLeft, gt = g.offsetTop + wr.offsetTop; for (const el of g.children) { const x = gl + el.offsetLeft, y = gt + el.offsetTop; if (p.x >= x && p.x <= x + el.offsetWidth && p.y >= y && p.y <= y + el.offsetHeight) return +el.dataset.slot; } return -1; };
  function move(id, cell) { const from = slotOf(id), o = cells[cell]; cells[cell] = id; cells[from] = o; S.moved = id; }
  function auto() { cells.fill(''); Object.entries(place[S.n]).forEach(([id, sl]) => (cells[sl] = id)); S.sel = ''; }

  // ---- hover yazisi ----
  let tip;
  const clearTip = () => { if (tip) { tip.remove(); tip = null; } };
  function tipInfo(cell) {
    if (cell < 0) return null;
    const drag = S.drag && S.drag.on ? S.drag.id : '', occ = cells[cell];
    const who = drag || (S.sel && !occ ? S.sel : '') || occ || focus().id;
    const h = HEROES[who], here = slotOf(who) === cell, hint = here ? hintOf(cells, who) : fitAt(who, cell), n = reachAt(who, rowOf(cell));
    return { who: here ? `${h.name} \u00B7 ${ROWN[rowOf(cell)]}` : `${h.name} here`, text: reachText(n), n, exp: hint === 'exp' };
  }
  const barHTML = (n) => `<span class="mb">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  function showTip(cell, p) {
    clearTip();
    const t = tipInfo(cell); if (!t) return;
    const el = document.createElement('div');
    el.className = 'rtip ta' + (t.n <= 0 ? ' no' : '');
    el.innerHTML = `<div class="rk">${t.who}</div><div class="rt">${t.text}</div>${barHTML(t.n)}${t.exp ? '<div class="rx">Exposed in front</div>' : ''}`;
    el.style.left = Math.min(p.x + 18, 1900 - 340) + 'px'; el.style.top = p.y + 18 + 'px'; $('#stage').appendChild(el); tip = el;
  }

  function ghost() { const g = document.createElement('div'); g.className = 'ghost'; g.id = 'ghost'; g.innerHTML = `<img src="${av(S.drag.id)}" alt="">`; $('#stage').appendChild(g); }
  function bind() {
    const w = $('#win');
    w.onclick = (e) => { const a = e.target.closest('[data-act]'); if (a && a.dataset.act === 'auto') { auto(); render(); } const p = e.target.closest('[data-pick]'); if (p) { S.sel = S.sel === p.dataset.pick ? '' : p.dataset.pick; render(); } };
    w.onpointerdown = (e) => { const c = e.target.closest('.cell'); if (!c || e.button) return; S.down = { slot: +c.dataset.slot, id: cells[+c.dataset.slot], x: e.clientX, y: e.clientY, moved: false }; };
    w.onpointermove = (e) => {
      const p = pt(e), cell = cellAt(p);
      if (S.down && S.down.id && !S.down.moved && Math.hypot(e.clientX - S.down.x, e.clientY - S.down.y) > 10) { S.down.moved = true; S.drag = { id: S.down.id, on: true }; S.hover = cell; render(); ghost(); }
      if (S.drag && S.drag.on) { const g = $('#ghost'); if (g) { g.style.left = p.x - 56 + 'px'; g.style.top = p.y - 56 + 'px'; } }
      if (cell !== S.hover) {
        S.over = cell; S.hover = cell;
        if ((S.drag && S.drag.on) || S.sel) { render(); if (S.drag && S.drag.on) { ghost(); const g2 = $('#ghost'); g2.style.left = p.x - 56 + 'px'; g2.style.top = p.y - 56 + 'px'; } }
        showTip(cell, p);
      } else if (tip) { tip.style.left = Math.min(p.x + 18, 1900 - 340) + 'px'; tip.style.top = p.y + 18 + 'px'; }
    };
    w.onpointerleave = () => { clearTip(); S.hover = -1; };
    w.onpointerup = (e) => {
      const p = pt(e), cell = cellAt(p);
      if (S.drag && S.drag.on) { const id = S.drag.id; S.drag = null; S.down = null; S.over = -1; if (cell >= 0 && cell !== slotOf(id)) move(id, cell); S.sel = ''; render(); return; }
      const d = S.down; S.down = null; if (!d || cell < 0) return;
      if (!S.sel) { if (cells[cell]) S.sel = cells[cell]; } else if (S.sel === cells[cell]) S.sel = ''; else if (cells[cell]) S.sel = cells[cell]; else { move(S.sel, cell); S.sel = ''; }
      S.over = -1; render();
    };
  }
  function init() {
    document.body.insertAdjacentHTML('beforeend', '<div id="mk-strip"><b>MOCKUP</b>Formation &middot; <button data-v="a">A</button><button data-v="b">B</button><button data-v="c">C</button> &middot; heroes: <button data-n="2">2</button><button data-n="4">4</button></div>');
    $('#mk-strip').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v) S.v = b.dataset.v; if (b.dataset.n) { S.n = +b.dataset.n; load(); } location.hash = `${S.v}&n=${S.n}` + (document.documentElement.classList.contains('mk-clean') ? '&clean' : ''); render(); };
    window.addEventListener('hashchange', () => { const h = (location.hash || '#a').slice(1).split('&'); if ('abc'.includes(h[0][0] || 'a')) S.v = (h[0] || 'a')[0]; const n = h.includes('n=4') ? 4 : 2; if (n !== S.n) { S.n = n; load(); } render(); });
    addEventListener('resize', fit);
    load(); fit(); render();
  }
  init();
})();
