/* C6: sessiz bilgi dersleri (mockup, oyun kodu DEGIL). HUD markup'i oyunun src/ui/battle-hud.ts + skill-bar.ts yapisi (wave-battle taslagindan); ders metinleri data/tutorial.json. */
(function () {
  'use strict';
  const H = (function () { const o = { v: 'a', p: {} }; location.hash.replace(/^#/, '').split('&').filter(Boolean).forEach((t, i) => { if (i === 0 && /^[abc]$/.test(t)) o.v = t; else { const k = t.split('='); o.p[k[0]] = k[1] === undefined ? true : k[1]; } }); return o; })();
  const VAR = H.v, SHOW = ['both', 'info', 'box'].includes(H.p.s) ? H.p.s : 'both', LES = H.p.l || 'cycle';
  const $ = (q, r) => (r || document).querySelector(q);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const A = 'art/';
  const av = (n) => `${A}av/${n}.webp`, spr = (n) => `${A}spr/${n}.webp`, ui = (n) => `${A}ui/${n}.webp`, st = (n) => `${A}stat/${n}.webp`, wi = (n) => `${A}wi/${n}.webp`, bz = (n) => `${A}valor/${n}.webp`;
  const img = (u, c = 'bh-ico') => `<img class="${c}" src="${u}" alt="" draggable="false">`;
  const NAMES = { warrior: 'Warrior', archer: 'Archer', druid: 'Druid', mage: 'Mage', grey_wolf: 'Grey Wolf', ravenwood_poacher: 'Ravenwood Poacher', raven_seer: 'Raven Seer', cutpurse: 'Cutpurse', bandit_chief: 'Bandit Chief' };
  /* data/tutorial.json: bilgi dersleri (focus / done yok) */
  const INFO = {
    fighter: { title: 'Reading a Fighter', text: 'Tap or hover over any fighter to read their stats, passive and cooldowns.' },
    status: { title: 'Statuses', text: 'Icons beside a health bar are statuses, like Slow or Wound. Tap the unit to read what they do.' },
    area: { title: 'Area Shapes', text: 'Area skills hit a fixed shape of cells. The lit cells show exactly who gets caught.' },
  };
  const ORDER = ['fighter', 'status', 'area'];
  /* eylem dersi (karsilastirma): data/tutorial.json > rest */
  const ACTION = { title: 'Rest', text: 'Not enough MP for your stronger skills. Rest refills MP and ends the turn.' };

  const PARTY_SLOTS = [[784, 745], [725, 802], [665, 859], [599, 745], [540, 802], [480, 859]];
  const FOE_SLOTS = [[1136, 745], [1195, 802], [1255, 859], [1321, 745], [1380, 802], [1440, 859]];
  const PARTY = [['warrior', 0, 0.64], ['archer', 4, 1], ['druid', 2, 0.9], ['mage', 3, 1]];
  const FOES = [['grey_wolf', 0, 1], ['grey_wolf', 1, 0.8], ['grey_wolf', 2, 1]];
  const mpLow = SHOW === 'box' || SHOW === 'both'; /* Rest dersi icin MP az */

  const chip = (c, lack) => {
    const m = /^(\D*?)\s*(\d+)$/.exec(c.text.trim());
    const word = m && m[1] ? `<span class="w">${esc(m[1])}</span>` : '';
    const cls = [c.kind === 'rage' ? 'rage' : '', c.kind === 'cd' ? 'cd' : '', lack && c.kind === lack ? 'low' : ''].filter(Boolean).join(' ');
    return `<span class="bp-chip ${cls}">${img(c.icon)}${word}<b>${esc(m ? m[2] : c.text)}</b></span>`;
  };
  const plate = (s) => {
    const chips = s.cost.length ? s.cost.map((c) => chip(c, s.lack)).join('') : '<span class="bp-chip free">Free</span>';
    const tag = s.ult ? '<span class="bp-tag"><span class="full">Ultimate</span><span class="short">Ult</span></span>' : '';
    return `<div class="bp ${s.ult ? 'ult' : ''} ${s.wait ? 'cdn' : ''} ${s.sel ? 'sel' : ''}">${tag}<span class="bp-key">${s.key}</span><div class="bp-ico">${img(s.icon)}${s.wait ? `<span class="cdv">${s.wait}</span>` : ''}</div><span class="bp-nm">${esc(s.name)}</span><div class="bp-chips">${chips}</div></div>`;
  };
  const MP = st('mp'), CD = ui('cooldown'), RG = ui('rage');
  const lackMp = mpLow ? 'mp' : '';
  const SKILLS = [
    { key: 1, name: 'Double Strike', icon: wi('sword'), cost: [], sel: 1 },
    { key: 2, name: 'Whirlwind', icon: wi('whirlwind'), cost: [{ icon: MP, text: '8', kind: 'mp' }, { icon: CD, text: '3', kind: 'cd' }], lack: lackMp },
    { key: 3, name: 'Charge', icon: wi('charge'), cost: [{ icon: MP, text: '10', kind: 'mp' }, { icon: CD, text: '3', kind: 'cd' }], lack: lackMp },
    { key: 4, name: "Headsman's Blow", icon: wi('warcry'), ult: 1, cost: [{ icon: RG, text: 'RAGE 30', kind: 'rage' }, { icon: CD, text: '5', kind: 'cd' }], wait: 1, lack: 'rage' },
  ];
  const meter = (v, h, readyAt) => {
    const brs = [0, 1].map((i) => { const lit = Math.max(0, Math.min(4, v - 4 * i)); return `<span class="vl-br"><img class="vl-img" src="${bz('brazier-' + lit)}" alt=""><img class="vl-flame" src="${bz('brazier-ready')}" alt=""></span>`; }).join('');
    return `<span class="vl-meter vl-stack" style="--vl-h:${h}px"><span class="vl-brs">${brs}</span><span class="vl-lbl">Valor</span></span>`;
  };
  function hud(W) {
    const queue = [['archer', 0, 'past'], ['warrior', 0, 'now'], ['grey_wolf', 1, ''], ['druid', 0, ''], ['grey_wolf', 1, ''], ['mage', 0, ''], ['grey_wolf', 1, ''], ['archer', 0, '']];
    const cells = queue.map(([id, enemy, s]) => `<div class="bh-cell ${enemy ? 'enemy' : ''} ${s}"><img class="bh-portrait" src="${av(id)}" alt="" ${enemy ? 'style="transform:scaleX(-1)"' : ''}></div>`).join('');
    const past = queue.filter((c) => c[2] === 'past').length;
    const mp = mpLow ? 3 : 68;
    const bar = (k, ic, v, max, w) => `<div class="bh-hpmp ${k}"><div class="bh-num">${img(ic)}${k === 'rage' ? `<span class="v">${v}</span>` : v}<span class="of">/ ${max}</span></div><div class="bh-bar ${k}"><i style="width:${w}%"></i></div></div>`;
    const stt = (ic, l, v, pri) => `<div class="bh-st ${pri ? 'pri' : ''}">${img(ic)}<span class="l">${l}</span><span>${v}</span></div>`;
    const PW = 132, PG = 8, SKW = 4 * PW + 3 * PG, sx = W / 2 - SKW / 2, gx = sx + SKW + 22, vx = gx + 150 + 20, rx = vx + 150 + 24;
    return `<div class="bh-root"><div class="bh-band"><i class="bh-dia bh-band-dia"></i></div>
      <div class="bh-turn" style="left:${W / 2 - 46 - past * 80}px">${cells}</div>
      <div class="bh-turn-lbl" style="left:${W / 2}px"><i class="bh-dia s"></i>Your turn<i class="bh-dia s"></i></div>
      <div class="bh-actor"><div class="bh-opener"><div class="bh-pframe"><img class="bh-portrait" src="${av('warrior')}" alt=""></div><div class="bh-actor-info">
        <div class="bh-name"><span class="bh-n">Warrior</span></div><div class="bh-chips"><span class="bh-chip">Melee Bruiser</span><span class="bh-chip hot">${img(st('str'))}Strength <b>32</b> primary</span></div>
        <div class="bh-abody"><div class="bh-hpmp-row">${bar('hp', st('hp'), 83, 129, 64)}${bar('mp', MP, mp, 68, Math.round((mp / 68) * 100))}${bar('rage', RG, 7, 50, 14)}</div>
        <div class="bh-aside"><div class="bh-main">${stt(st('str'), 'STR', 32, 1)}${stt(st('dex'), 'DEX', 8)}${stt(st('int'), 'INT', 12)}${stt(st('luck'), 'LCK', 14)}</div><span class="bh-more">All stats</span></div></div></div></div></div>
      <div class="bh-pasv" style="left:${sx - (PW + PG)}px;width:${PW}px"><div class="bp pas"><span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span><div class="bp-ico">${img(wi('rage'))}</div><span class="bp-nm">Berserker</span><div class="bp-chips"></div></div></div>
      <div class="bh-skills" style="left:${sx}px">${SKILLS.map(plate).join('')}</div>
      <div class="bh-globs" style="left:${gx}px"><div class="bh-vfade"></div><div class="bh-gcol">
        <div class="bh-gl" data-global="rest">${img(ui('rest'))}<span>Rest</span></div><div class="bh-gl" data-global="skip">${img(ui('skip'))}<span>Skip</span></div><div class="bh-gl" data-global="move_tile">${img(ui('move'))}<span>Move</span></div><div class="bh-gl off">${img(bz('brazier-4'))}<span>Revive</span></div></div></div>
      <div class="bh-valor" style="left:${vx}px">${meter(5, 60, 6)}</div>
      <div class="bh-right" style="left:${rx}px;width:${W - rx - 28}px"><div class="bh-binfo"><div class="bh-links"><span class="bh-plink ico">${img(ui('combatLog'), 'bh-ico bh-pl-ico')}<span class="bh-pl-t">Combat log</span></span></div></div></div></div>`;
  }
  const unit = (id, slot, side, hp, off) => {
    const [x, y] = (side === 'party' ? PARTY_SLOTS : FOE_SLOTS)[slot];
    return `<div class="sc-unit ${side} ${side === 'foe' ? 'flip' : ''}" style="left:${x - 70 + off}px;top:${y - 190}px;z-index:${y}"><div class="pl"><b>${NAMES[id]}</b><i><u style="width:${Math.round(hp * 100)}%"></u></i></div><img class="sp" src="${spr(id)}" alt=""></div>`;
  };

  /* ---------- yerlesim ---------- */
  const world = $('#world'), uiRoot = $('#ui-root'), de = document.documentElement;
  let W = 1920;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    W = Math.max(1920, Math.min(2580, (vw / vh) * 1080));
    const s = Math.min(vh / 1080, vw / W);
    world.style.width = W + 'px';
    world.style.transform = `translate(${Math.round((vw - W * s) / 2)}px, ${Math.round((vh - 1080 * s) / 2)}px) scale(${s})`;
    de.style.setProperty('--gu', s + 'px'); de.style.setProperty('--bh-inv', String(1 / s)); de.style.setProperty('--sc', String(s));
    de.classList.toggle('both', SHOW === 'both'); de.classList.toggle('short', vh <= 520); de.classList.toggle('compact', vh <= 720);
    return s;
  }
  function build() {
    layout();
    const off = (W - 1920) / 2;
    world.innerHTML = `<div class="sc-bg" style="background-image:url(${A}bg/border-road.webp)"></div>${PARTY.map(([id, s, hp]) => unit(id, s, 'party', hp, off)).join('')}${FOES.map(([id, s, hp]) => unit(id, s, 'foe', hp, off)).join('')}${hud(W)}<div class="ql" id="ql"></div>`;
    /* statu ikonlari: Slow / Wound, kurt basinda (Statuses dersi icin gercek isaret) */
    const w1 = world.querySelectorAll('.sc-unit.foe')[1];
    if (w1) w1.insertAdjacentHTML('beforeend', '<div class="st"><img src="' + A + 'ui/cooldown.webp" alt=""></div>');
    $('#ql').addEventListener('mouseenter', () => { paused = true; });
    $('#ql').addEventListener('mouseleave', () => { paused = false; });
    boxShow();
  }

  /* ---------- eylem dersi kutusu (gercek lesson-box markup'i) ---------- */
  let boxEl = null;
  function boxShow() {
    if (boxEl) boxEl.remove(); boxEl = null;
    $$('.tut-focus').forEach((e) => e.classList.remove('tut-focus'));
    if (SHOW === 'info') return;
    const w = document.createElement('div');
    w.className = 'tut-wrap';
    w.innerHTML = `<div class="tut-box el-panel corners" role="dialog" aria-label="Garrick: ${ACTION.title}"><div class="tut-face"><img src="garrick.webp" alt="Garrick"></div><div class="tut-main"><div class="tut-head"><div class="tut-title">${ACTION.title}<span class="tut-who">Garrick · Old Border Commander</span></div></div><div class="tut-text">${ACTION.text}</div></div><div class="tut-side"><button type="button" class="el-btn tut-ok">Got it</button><button type="button" class="el-link tut-off">Don't show again</button></div></div>`;
    uiRoot.append(w); boxEl = w;
    const t = $('.bh-gl[data-global="rest"]'); if (t) t.classList.add('tut-focus');
    $('.tut-ok', w).addEventListener('click', () => { w.remove(); boxEl = null; $$('.tut-focus').forEach((e) => e.classList.remove('tut-focus')); });
  }
  function $$(q) { return Array.from(document.querySelectorAll(q)); }

  /* ---------- sessiz cizgi ---------- */
  let paused = false, seq = 0, timer = 0;
  const HOLD = 7000;
  function lineHtml(L) {
    if (VAR === 'a') return `<div class="ql-a"><i class="dia"></i><span class="k">${esc(L.title)}</span><span class="t">${esc(L.text)}</span><i class="dia"></i></div>`;
    if (VAR === 'b') return `<div class="ql-b"><span class="face"><img src="garrick.webp" alt=""></span><span class="t"><span class="who">Garrick</span>${esc(L.text)}</span></div>`;
    return `<div class="ql-c"><div class="row"><span class="chip k">${esc(L.title)}</span><span class="t">${esc(L.text)}</span><span class="cx">Saved in Codex &gt; Lessons</span></div><div class="bar"><i style="--hold:${HOLD}ms"></i></div></div>`;
  }
  function showLine(key) {
    const ql = $('#ql'); if (!ql) return;
    ql.classList.remove('on'); ql.className = 'ql ql-wrap' + (LES !== 'cycle' ? ' pin' : '');
    setTimeout(() => { ql.innerHTML = lineHtml(INFO[key]); ql.classList.add('on'); if (LES !== 'cycle') ql.classList.add('pin'); }, 60);
  }
  function loop() {
    clearTimeout(timer);
    if (SHOW === 'box') { const ql = $('#ql'); if (ql) { ql.className = 'ql'; ql.innerHTML = ''; } return; }
    if (LES !== 'cycle' && INFO[LES]) { showLine(LES); return; }
    const key = ORDER[seq++ % ORDER.length];
    showLine(key);
    const wait = () => { if (paused) { timer = setTimeout(wait, 300); return; } const ql = $('#ql'); if (ql) ql.classList.remove('on'); timer = setTimeout(loop, 1800); };
    timer = setTimeout(wait, HOLD);
  }
  window.addEventListener('resize', () => { layout(); });
  window.addEventListener('hashchange', () => location.reload());
  build(); loop();
})();
