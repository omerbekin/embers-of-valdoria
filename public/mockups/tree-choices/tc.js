/* Skill agaci secim arayuzu taslagi: oyun kodu degil. Skill adlari/bedelleri data/skills.json ile ayni. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const IC = (n) => `tree-choices/ic/${n}.webp`;
  const SP = (n) => `tree-choices/sp/${n}.webp`;
  const stage = $('#stage'), frame = $('#frame');

  /* ---------- adres ---------- */
  function parse() {
    const o = { v: 1, node: 'beam', phone: false, clean: false, pillar: false, lance: false, double: false };
    for (const x of location.hash.slice(1).split('&')) {
      if (/^v[123]$/.test(x)) o.v = +x[1];
      else if (x.startsWith('node=')) o.node = x.slice(5) === 'deck' ? 'deck' : 'beam';
      else if (x in o && typeof o[x] === 'boolean') o[x] = true;
    }
    return o;
  }
  function put(patch) {
    const o = Object.assign(parse(), patch);
    const t = ['v' + o.v, 'node=' + o.node];
    for (const k of ['phone', 'clean', 'pillar', 'lance', 'double']) if (o[k]) t.push(k);
    location.hash = t.join('&');
  }
  let P = parse();
  const phoneClass = () => { const c = document.documentElement.classList; c.toggle('mk-phone', P.phone); c.toggle('mk-clean', P.clean); };

  /* ---------- veri ---------- */
  const STATUS = {
    slow: { name: 'Slow', icon: 'slow', turns: 2, note: '2 turns' },
    wound: { name: 'Wound', icon: 'wound', turns: 2, note: '2 turns' },
    stun: { name: 'Stun', icon: 'stun', turns: 1, note: '1 turn, first target only' },
  };
  const NODES = {
    beam: {
      hero: 'paladin', title: 'Paladin', hp: [96, 120], mp: [48, 60], allies: ['gambler', 'defender'],
      skills: [
        { id: 'divine_light', name: 'Divine Light', icon: 'divine', pas: 1 },
        { id: 'holy_strike', name: 'Holy Strike', icon: 'judgehammer', n: 1, free: 1 },
        { id: 'resurrection', name: 'Resurrection', icon: 'ankh', n: 2, mp: 16, cd: 5 },
        { id: 'judgment', name: 'Judgment', icon: 'judgebeam', n: 3, mp: 14, cd: 3 },
        { id: 'radiance', name: 'Radiance', icon: 'radiance', n: 4, mp: 20, cd: 4, ult: 1 },
      ],
    },
    deck: {
      hero: 'gambler', title: 'Gambler', hp: [80, 92], mp: [44, 52], allies: ['paladin', 'defender'],
      skills: [
        { id: 'double_or_nothing', name: 'Double or Nothing', icon: 'doubleornothing', pas: 1 },
        { id: 'loaded_dice', name: 'Loaded Dice', icon: 'loadeddice', n: 1, free: 1 },
        { id: 'high_stakes', name: 'High Stakes', icon: 'highstakes', n: 2, mp: 4, cd: 2 },
        { id: 'card_trick', name: 'Card Trick', icon: 'cardtrick', n: 3, mp: 9, cd: 3 },
        { id: 'all_in', name: 'All In', icon: 'allin', n: 4, mp: 8, cd: 3, wait: 3, ult: 1 },
      ],
    },
  };
  const ENEMIES = [
    { id: 'e1', spr: 'cutpurse', name: 'Cutpurse', col: 0, lane: 0, hp: 70 },
    { id: 'e2', spr: 'bandit_chief', name: 'Bandit Chief', col: 0, lane: 1, hp: 100 },
    { id: 'e3', spr: 'road_thug', name: 'Road Thug', col: 0, lane: 2, hp: 55 },
    { id: 'e4', spr: 'ravenwood_poacher', name: 'Poacher', col: 1, lane: 0, hp: 85 },
    { id: 'e5', spr: 'cutpurse', name: 'Cutpurse', col: 1, lane: 2, hp: 90 },
  ];
  const DESC = {
    beam: [
      'V1: Radiance dugmesinin altinda All / One anahtari. All = bugunku gibi tek tikla; One = tikla, sonra bir dusman sec. Secim savasta kalir.',
      'V2: Radiance tiklaninca iki kartli kucuk panel acilir: Radiance / Focused Beam. Focused secilirse dusman secilir.',
      'V3: Radiance tiklaninca "hazir" olur (hepsi isaretli). Tek dusmana tiklarsan isin odaklanir; Cast ile atilir. Dugmede ek kontrol yok.',
    ],
    deck: [
      'V1: Card Trick dugmesinin altinda 3 durum dugmesi (Slow / Wound / Stun). Secim kalir; dugmeye tiklayinca secili durumla atilir.',
      'V2: Card Trick tiklaninca 3 kartlik panel acilir; secilen kart hemen atilir. Her seferinde sorar.',
      'V3: Tiklayinca son secimle atilir. Basili tut (telefon) / sag tik (fare) halka menu acar; dugmede secili durum rozeti durur.',
    ],
  };

  /* ---------- durum ---------- */
  let L, S, scale = 1;
  const fresh = () => ({ sel: 0, phase: 'idle', mode: 'all', pick: 'slow', focus: null, pop: null, cd: 0, ctCd: 0, lp: false, applied: {}, ground: null, note: '' });

  /* ---------- yerlesim ---------- */
  function layout() {
    if (P.phone) return { W: 1000, H: 475, hud: 196, feet: [150, 208, 266], sh: 140, hx: [300, 190], ex: [700, 810], badge: 22,
      v: { fs1: 15, fs2: 12, fs3: 12, fs4: 8, gap: 12, pad: 14, pf: 84, barw: 80, skw: 96, skgap: 8, ico: 50, skpad: 14, subh: 66, hit: 54, segpad: 14, pp: 7, optw: 150, oico: 44, rbs: 56 } };
    return { W: 1920, H: 1080, hud: 270, feet: [430, 555, 680], sh: 330, hx: [640, 430], ex: [1280, 1490], badge: 30,
      v: { fs1: 24, fs2: 17, fs3: 15, fs4: 10, gap: 18, pad: 26, pf: 124, barw: 130, skw: 150, skgap: 14, ico: 76, skpad: 18, subh: 94, hit: 48, segpad: 18, pp: 10, optw: 250, oico: 64, rbs: 76 } };
  }

  /* ---------- kurulum ---------- */
  function build() {
    P = parse(); phoneClass();
    L = layout(); S = fresh();
    stage.innerHTML = '';
    stage.style.width = L.W + 'px'; stage.style.height = L.H + 'px';
    for (const [k, v] of Object.entries(L.v)) stage.style.setProperty('--' + k, v + 'px');
    const N = NODES[P.node];
    const fieldH = L.H - L.hud;
    let h = `<div id="field" style="height:${fieldH}px"></div><div id="fieldwrap" style="position:absolute;left:0;top:0;width:100%;height:${fieldH}px">`;
    const unit = (cls, id, spr, name, x, feet, hpPct) => `<div class="shadow" style="left:${x}px;top:${feet - 16}px"></div>
      <div class="unit ${cls}" id="${id}" data-id="${id}" title="${name}" style="left:${x}px;top:${feet}px">
        <div class="ring"></div><img class="body" src="${SP(spr)}" style="height:${L.sh}px" alt="${name}">
        <div class="bar" style="top:${-L.sh - 12}px"><i style="width:${hpPct}%"></i></div>
        <div class="badges" style="top:${-L.sh - 12 - L.badge - 6}px"></div>
        ${id === 'actor' ? '<div class="turn"></div>' : ''}</div>`;
    // dostlar: aktor orta seritte, onde
    const hv = [[N.allies[0], 0, 78], [N.hero, 1, 80], [N.allies[1], 2, 91]];
    for (const [spr, lane, hp] of hv) h += unit('hero' + (lane === 1 ? ' actor' : ''), lane === 1 ? 'actor' : 'ally' + lane, spr, lane === 1 ? N.title : spr, L.hx[0], L.feet[lane], hp);
    for (const e of ENEMIES) h += unit('enemy', e.id, e.spr, e.name, L.ex[e.col], L.feet[e.lane] + e.col * 0, e.hp);
    h += '</div>';
    h += `<div id="top"><div><span id="turnname">${N.title}'s turn</span><i id="note"></i></div></div>`;
    h += `<div id="prompt" style="bottom:${L.hud + 18}px"></div><div id="hud" style="height:${L.hud}px"></div><div id="pops"></div>`;
    stage.innerHTML = h;
    // ayni seride onde/arkada: arka sutundakiler biraz yukari
    for (const e of ENEMIES) if (e.col === 1) { const u = $('#' + e.id); u.style.top = (L.feet[e.lane] - (P.phone ? 6 : 18)) + 'px'; u.previousElementSibling.style.top = (L.feet[e.lane] - (P.phone ? 6 : 18) - 16) + 'px'; }
    hudBuild();
    fit(); strip();
    refresh();
  }

  function fit() {
    const s = P.phone ? Math.min(812 / L.W, 375 / L.H) : Math.min(innerWidth / L.W, innerHeight / L.H);
    scale = s;
    const fw = P.phone ? 812 : L.W * s, fh = P.phone ? 375 : L.H * s;
    frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
    stage.style.left = (fw - L.W * s) / 2 + 'px'; stage.style.top = (fh - L.H * s) / 2 + 'px';
    stage.style.transform = `scale(${s})`;
  }
  addEventListener('resize', () => L && fit());

  function hudBuild() {
    const N = NODES[P.node];
    const hud = $('#hud');
    hud.innerHTML = `<div class="act"><div class="pf"><img src="${IC(N.hero)}" alt=""></div><div>
      <div class="ti">${N.title}</div>
      <div class="vt"><img src="${IC('hp')}" alt="">${N.hp[0]} <small style="opacity:.6">/ ${N.hp[1]}</small><div class="b"><i style="width:${(N.hp[0] / N.hp[1]) * 100}%;background:linear-gradient(90deg,#4f9a32,#7fbf3f)"></i></div></div>
      <div class="vt"><img src="${IC('mp')}" alt="">${N.mp[0]} <small style="opacity:.6">/ ${N.mp[1]}</small><div class="b"><i style="width:${(N.mp[0] / N.mp[1]) * 100}%;background:linear-gradient(90deg,#2e6fc0,#5aa5f0)"></i></div></div>
    </div></div><div id="skills"></div>`;
  }

  /* ---------- yetenek cubugu ---------- */
  function skillCol(s, idx) {
    const radiance = s.id === 'radiance', trick = s.id === 'card_trick';
    const cdLeft = radiance ? S.cd : trick ? S.ctCd : s.wait || 0;
    const cls = ['sk', s.pas ? 'pas' : '', s.ult ? 'ult' : '', S.sel === idx && !s.pas ? 'sel' : '', cdLeft ? 'cdn' : ''].join(' ');
    const ch = s.pas ? '' : `${s.free ? '<span class="fr">Free</span>' : `<span><img src="${IC('mp')}" alt="">${s.mp}</span>`}${s.cd ? `<span><img src="${IC('cooldown')}" alt="">${s.cd}</span>` : ''}`;
    let badge = '', sub = '';
    if (P.node === 'beam' && radiance) {
      if (P.v === 1) sub = `<div class="seg"><button data-mode="all" class="${S.mode === 'all' ? 'on' : ''}" title="All: heal allies, hit all enemies">All</button><button data-mode="one" class="${S.mode === 'one' ? 'on' : ''}" title="One: Focused Beam, 220% to one enemy, no heal">One</button></div>`;
    }
    if (P.node === 'deck' && trick) {
      if (P.v === 1) sub = `<div class="over"><div class="pick">${Object.keys(STATUS).map((k) => `<button data-pick="${k}" class="${S.pick === k ? 'on' : ''}" title="${STATUS[k].name}: ${STATUS[k].note}"><img src="${IC(STATUS[k].icon)}" alt="">${k === 'stun' ? '<b>1st</b>' : ''}</button>`).join('')}${P.double ? '<div class="rnd" title="Double Deal: a random second status">+ ?</div>' : ''}</div></div>`;
      if (P.v === 3) { badge = `<div class="badge"><img src="${IC(STATUS[S.pick].icon)}" alt=""></div>`; sub = `<div class="hint">Hold: <b>${STATUS[S.pick].name}</b>${P.double ? ' + ?' : ''}</div>`; }
    }
    return `<div class="col" data-i="${idx}"><div class="${cls}" data-id="${s.id}" title="${s.name}">${s.pas ? '<span class="tag">Passive</span>' : ''}${s.n ? `<span class="key">${s.n}</span>` : ''}<div class="ico"><img src="${IC(s.icon)}" alt="">${cdLeft ? `<span class="cdv">${cdLeft}</span>` : ''}${badge}</div><div class="nm">${s.name}</div><div class="ch">${ch}</div></div><div class="sub">${sub}</div></div>`;
  }
  function skillsRender() {
    $('#skills').innerHTML = NODES[P.node].skills.map(skillCol).join('');
  }

  /* ---------- yardimcilar ---------- */
  const $$ = (s) => [...stage.querySelectorAll(s)];
  const enemy = (id) => ENEMIES.find((e) => e.id === id);
  function pos(el, side) { // sahne mantiksal koordinati
    const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { x: (r.left - sr.left + r.width / 2) / scale, top: (r.top - sr.top) / scale, bottom: (r.bottom - sr.top) / scale, cy: (r.top - sr.top + r.height / 2) / scale };
  }
  function uc(id) { const u = $('#' + id); return { x: parseFloat(u.style.left), y: parseFloat(u.style.top) }; }
  function floater(id, text, cls, dy = 0) {
    const c = uc(id), f = document.createElement('div');
    f.className = 'fl ' + cls; f.textContent = text;
    f.style.left = c.x + 'px'; f.style.top = (c.y - L.sh * 0.65 + dy) + 'px';
    if (P.phone) f.style.fontSize = (cls === 'st' ? 15 : 22) + 'px';
    $('#fieldwrap').appendChild(f); setTimeout(() => f.remove(), 1600);
  }
  function flash() { const f = document.createElement('div'); f.className = 'flash'; $('#fieldwrap').appendChild(f); setTimeout(() => f.remove(), 1000); }
  function setNote(t) { S.note = t; $('#note').textContent = t ? '· ' + t : ''; }

  /* ---------- gorunum ---------- */
  function refresh() {
    skillsRender();
    const fw = $('#fieldwrap');
    fw.classList.toggle('tg', S.phase === 'pick');
    fw.classList.toggle('soft', S.phase === 'armed' && !S.focus);
    fw.classList.toggle('focus', S.phase === 'armed' && !!S.focus);
    for (const e of ENEMIES) {
      const u = $('#' + e.id);
      u.classList.toggle('fx', S.phase === 'armed' && S.focus === e.id);
      let behind = false;
      if (S.phase === 'armed' && S.focus && P.lance) { const f = enemy(S.focus); behind = f.col === 0 && e.col === 1 && e.lane === f.lane; }
      u.classList.toggle('lane', behind);
    }
    promptRender();
  }
  function promptRender() {
    const p = $('#prompt');
    let h = '';
    if (S.phase === 'pick') h = `Focused Beam<small>Choose an enemy</small><button data-act="cancel">Cancel</button>`;
    else if (S.phase === 'armed') {
      if (!S.focus) h = `Radiance<small>Heals allies, hits all enemies. Click an enemy to focus.</small><button data-act="cancel">Cancel</button><button class="go" data-act="cast">Cast</button>`;
      else h = `Focused Beam<small>${enemy(S.focus).name}: 220%, no heal${P.lance ? ', pierces the lane behind' : ''}${P.pillar ? ', holy fire' : ''}</small><button data-act="cancel">Cancel</button><button class="go" data-act="cast">Cast</button>`;
    }
    p.innerHTML = h; p.classList.toggle('on', !!h);
  }

  /* ---------- paneller ---------- */
  function clearPop() { $('#pops').innerHTML = ''; S.pop = null; }
  function openPop(kind) {
    clearPop(); S.pop = kind;
    const host = $('#pops');
    if (kind === 'beam') {
      const col = $('.col[data-i="4"]'), a = pos(col.querySelector('.sk'));
      const extra = [P.pillar ? 'Holy fire on the target, 2 turns.' : '', P.lance ? 'Pierces the lane behind, 60%.' : ''].filter(Boolean).join(' ');
      const el = document.createElement('div'); el.className = 'pop';
      el.innerHTML = `<div class="opt" data-pop="all"><div class="oi"><img src="${IC('radiance')}" alt=""></div><div class="on">Radiance</div><div class="od">Heals all allies. Hits all enemies.</div><div class="oc"><span><img src="${IC('mp')}" alt="">20</span></div></div>
        <div class="opt" data-pop="one"><div class="oi tgt"><img src="${IC('radiance')}" alt=""></div><div class="on">Focused Beam</div><div class="od">220% to one enemy. No heal.${extra ? `<small>${extra}</small>` : ''}</div><div class="oc"><span><img src="${IC('mp')}" alt="">20</span></div></div>`;
      host.appendChild(el); placePop(el, a);
    } else if (kind === 'deck') {
      const col = $('.col[data-i="3"]'), a = pos(col.querySelector('.sk'));
      const el = document.createElement('div'); el.className = 'pop';
      el.innerHTML = `<div class="pophead">${P.double ? 'Pick one. A random second status joins it.' : 'Pick the status for both cards.'}</div>` + Object.keys(STATUS).map((k) => `<div class="opt" data-st="${k}"><div class="oi"><img src="${IC(STATUS[k].icon)}" alt=""></div><div class="on">${STATUS[k].name}</div><div class="od">${STATUS[k].note}${k === 'stun' ? '<small>The second card adds nothing.</small>' : ''}</div></div>`).join('');
      host.appendChild(el); placePop(el, a);
    } else if (kind === 'radial') {
      const col = $('.col[data-i="3"]'), ic = pos(col.querySelector('.ico'));
      const R = P.phone ? 84 : 128, ang = [-155, -90, -25];
      Object.keys(STATUS).forEach((k, i) => {
        const b = document.createElement('div'); b.className = 'rb' + (S.pick === k ? ' on' : ''); b.dataset.rad = k;
        b.style.left = ic.x + Math.cos((ang[i] * Math.PI) / 180) * R + 'px'; b.style.top = ic.cy + Math.sin((ang[i] * Math.PI) / 180) * R + 'px';
        b.title = STATUS[k].name + ': ' + STATUS[k].note;
        b.innerHTML = `<img src="${IC(STATUS[k].icon)}" alt=""><span>${STATUS[k].name}${k === 'stun' ? ' (1st)' : ''}</span>`;
        host.appendChild(b);
      });
    }
  }
  function placePop(el, a) {
    const w = el.offsetWidth, left = Math.max(8, Math.min(L.W - 8 - w, a.x - w / 2));
    el.style.left = left + 'px'; el.style.bottom = L.H - a.top + 14 + 'px'; el.style.setProperty('--ax', a.x - left + 'px');
    if (el.querySelector('.pophead')) el.style.marginTop = '0';
  }

  /* ---------- eylemler ---------- */
  function cancel() { S.phase = 'idle'; S.focus = null; clearPop(); refresh(); }
  function fireBeam(targetId) {
    const wasFocus = !!targetId;
    S.phase = 'idle'; const f = S.focus; S.focus = null; clearPop(); S.cd = 4;
    flash();
    if (!wasFocus) {
      for (const e of ENEMIES) floater(e.id, '-' + (40 + e.hp % 17), 'dmg');
      for (const id of ['ally0', 'actor', 'ally2']) floater(id, '+' + (24 + (id.length % 7)), 'heal');
      setNote('Radiance: allies healed, all enemies hit');
    } else {
      const t = enemy(targetId);
      floater(targetId, '-118', 'dmg');
      let n = 'Focused Beam: ' + t.name + ' takes 220%, no heal';
      if (P.lance) {
        const b = ENEMIES.find((e) => e.col === 1 && e.lane === t.lane && t.col === 0);
        if (b) { floater(b.id, '-43', 'dmg'); n += `, ${b.name} hit behind (60%)`; } else n += ', nothing behind';
      }
      if (P.pillar) {
        S.ground = targetId; const u = $('#' + targetId);
        u.insertAdjacentHTML('beforeend', `<div class="gnd"><img src="${IC('holy_fire')}" alt=""><b>2</b></div>`);
        n += ', holy fire 2 turns';
      }
      setNote(n);
    }
    refresh();
  }
  function fireDeck(pick) {
    S.ctCd = 3; clearPop(); S.phase = 'idle';
    const pool = ENEMIES.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    const keys = Object.keys(STATUS);
    const list = [pick];
    if (P.double) { const rest = keys.filter((k) => k !== pick); list.push(rest[Math.floor(Math.random() * rest.length)]); }
    pool.forEach((t, i) => {
      floater(t.id, '-' + (22 + i * 3), 'dmg');
      const applied = list.filter((k) => !(k === 'stun' && i > 0));
      const bd = $('#' + t.id + ' .badges');
      applied.forEach((k) => { bd.insertAdjacentHTML('beforeend', `<span title="${STATUS[k].name}"><img src="${IC(STATUS[k].icon)}" alt=""><b>${STATUS[k].turns}</b></span>`); });
      if (applied.length) floater(t.id, applied.map((k) => STATUS[k].name).join(' + '), 'st', 34);
    });
    setNote('Card Trick: ' + list.map((k) => STATUS[k].name).join(' + ') + (P.double ? ' (second is random)' : ''));
    refresh();
  }

  function onSkill(idx) {
    const s = NODES[P.node].skills[idx];
    if (s.pas) return;
    const left = s.id === 'radiance' ? S.cd : s.id === 'card_trick' ? S.ctCd : s.wait || 0;
    if (left) return;
    const again = S.sel === idx && S.phase === 'armed';
    if (again && s.id === 'radiance') return cast();
    S.sel = idx; S.phase = 'idle'; S.focus = null; clearPop();
    if (s.id === 'radiance' && P.node === 'beam') {
      if (P.v === 1) { if (S.mode === 'all') fireBeam(null); else { S.phase = 'pick'; refresh(); } return; }
      if (P.v === 2) { refresh(); openPop('beam'); return; }
      S.phase = 'armed'; refresh(); return;
    }
    if (s.id === 'card_trick' && P.node === 'deck') {
      if (P.v === 2) { refresh(); openPop('deck'); return; }
      return fireDeck(S.pick);
    }
    refresh();
  }
  function cast() { fireBeam(S.focus); }
  function onEnemy(id) {
    if (S.phase === 'pick') return fireBeam(id);
    if (S.phase === 'armed') { S.focus = S.focus === id ? null : id; refresh(); }
  }

  /* ---------- girdi ---------- */
  let lpTimer = 0;
  stage.addEventListener('click', (e) => {
    const t = e.target;
    const act = t.closest('[data-act]');
    if (act) return act.dataset.act === 'cast' ? cast() : cancel();
    const mode = t.closest('[data-mode]');
    if (mode) { S.mode = mode.dataset.mode; refresh(); return; }
    const pk = t.closest('[data-pick]');
    if (pk) { S.pick = pk.dataset.pick; refresh(); return; }
    const po = t.closest('[data-pop]');
    if (po) { if (po.dataset.pop === 'all') return fireBeam(null); clearPop(); S.phase = 'pick'; refresh(); return; }
    const st = t.closest('[data-st]');
    if (st) { S.pick = st.dataset.st; return fireDeck(S.pick); }
    const rb = t.closest('[data-rad]');
    if (rb) { S.pick = rb.dataset.rad; clearPop(); refresh(); return; }
    const un = t.closest('.unit.enemy');
    if (un && S.phase !== 'idle') return onEnemy(un.dataset.id);
    const col = t.closest('.col');
    if (col) {
      if (S.lp) { S.lp = false; return; }
      return onSkill(+col.dataset.i);
    }
    if (S.pop || S.phase !== 'idle') { if (!t.closest('.pop')) cancel(); }
  });
  stage.addEventListener('pointerdown', (e) => {
    if (P.node === 'deck' && P.v === 3) {
      const col = e.target.closest('.col[data-i="3"]');
      if (col) { clearTimeout(lpTimer); lpTimer = setTimeout(() => { S.lp = true; openPop('radial'); }, 450); }
    }
  });
  const stopLp = () => clearTimeout(lpTimer);
  stage.addEventListener('pointerup', stopLp); stage.addEventListener('pointerleave', stopLp); stage.addEventListener('pointercancel', stopLp);
  stage.addEventListener('contextmenu', (e) => {
    if (P.node === 'deck' && P.v === 3 && e.target.closest('.col[data-i="3"]')) { e.preventDefault(); S.lp = true; openPop('radial'); }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return cancel();
    if ((e.key === 'Enter' || e.key === ' ') && S.phase === 'armed') { e.preventDefault(); return cast(); }
    const n = +e.key;
    if (n >= 1 && n <= 4) onSkill(n);
  });

  /* ---------- mockup seridi ---------- */
  function strip() {
    const s = $('#mk-strip');
    const b = (label, on, f) => `<button class="${on ? 'on' : ''}" data-f="${f}">${label}</button>`;
    s.innerHTML = `<b>MOCKUP</b>Node:${b('Paladin: Focused Beam', P.node === 'beam', 'n:beam')}${b('Gambler: Stacked Deck', P.node === 'deck', 'n:deck')}<u>Variant:</u>${[1, 2, 3].map((i) => b('V' + i, P.v === i, 'v:' + i)).join('')}<u>Tree:</u>` +
      (P.node === 'beam' ? b('Pillar of Wrath', P.pillar, 't:pillar') + b('Lance of Dawn', P.lance, 't:lance') : b('Double Deal', P.double, 't:double')) +
      `<u>View:</u>${b('Phone 812x375', P.phone, 't:phone')}${b('Reset', false, 'reset')}`;
    $('#mk-desc').textContent = DESC[P.node][P.v - 1];
  }
  $('#mk-strip').addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]'); if (!f) return;
    const [k, v] = f.dataset.f.split(':');
    if (k === 'n') put({ node: v }); else if (k === 'v') put({ v: +v });
    else if (k === 't') put({ [v]: !P[v] });
    else build();
  });
  addEventListener('hashchange', build);
  build();
})();
