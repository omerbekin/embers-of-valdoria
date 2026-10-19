/* Dalgali savas taslagi: oyun kodu DEGIL. Savas HUD'i oyunun gercek sinif / CSS'i (src/ui/battle-hud.ts markup'i, battle-hud.css), konumlar data/battle-layout.json,
   birimler gercek sprite'lar, ikonlar gercek UI ikonlari. Dalga bilgisi ORNEKTIR (veri: karsilasma basina 2-3 dalga; Ömer 2026-10-19 notu). */
(function () {
  const { esc, tip } = MK;
  const W = 1920;
  const PARTY_SLOTS = [[784, 745], [725, 802], [665, 859], [599, 745], [540, 802], [480, 859]];
  const FOE_SLOTS = [[1136, 745], [1195, 802], [1255, 859], [1321, 745], [1380, 802], [1440, 859]];
  const NAMES = { warrior: 'Warrior', archer: 'Archer', druid: 'Druid', mage: 'Mage', grey_wolf: 'Grey Wolf', ravenwood_poacher: 'Ravenwood Poacher', raven_seer: 'Raven Seer', cutpurse: 'Cutpurse', bandit_chief: 'Bandit Chief' };
  const PARTY = [['warrior', 0, 1], ['archer', 4, 1], ['druid', 2, .9], ['mage', 3, 1]];
  // dalga -> [mob, slot, hp orani]
  const WAVES = [
    [['grey_wolf', 0], ['grey_wolf', 1], ['grey_wolf', 2]],
    [['ravenwood_poacher', 0], ['cutpurse', 1], ['raven_seer', 3]],
    [['bandit_chief', 1], ['cutpurse', 0], ['ravenwood_poacher', 2]],
  ];
  const TOTAL = WAVES.length;
  const foeNames = (w) => {
    const m = {};
    WAVES[w - 1].forEach(([id]) => (m[id] = (m[id] || 0) + 1));
    return Object.entries(m).map(([id, n]) => ({ id, n, name: NAMES[id] }));
  };
  const foeLine = (w) => foeNames(w).map((f) => (f.n > 1 ? `${f.name} ×${f.n}` : f.name)).join(', ');
  const img = (u, c = 'bh-ico') => `<img class="${c}" src="${u}" alt="" draggable="false">`;
  const WS = 'battle-hud/warrior/';

  /* ---------- savas HUD'i (src/ui/battle-hud.ts + skill-bar.ts markup'i) ---------- */
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
  const MP = MK.st('mp'), CD = MK.ui('cooldown'), RG = MK.ui('rage');
  const SKILLS = [
    { key: 1, name: 'Double Strike', icon: WS + 'sword.webp', cost: [], sel: 1 },
    { key: 2, name: 'Whirlwind', icon: WS + 'whirlwind.webp', cost: [{ icon: MP, text: '8', kind: 'mp' }, { icon: CD, text: '3', kind: 'cd' }] },
    { key: 3, name: 'Charge', icon: WS + 'charge.webp', cost: [{ icon: MP, text: '10', kind: 'mp' }, { icon: CD, text: '3', kind: 'cd' }] },
    { key: 4, name: "Headsman's Blow", icon: WS + 'warcry.webp', ult: 1, cost: [{ icon: RG, text: 'RAGE 30', kind: 'rage' }, { icon: CD, text: '5', kind: 'cd' }], wait: 1, lack: 'rage' },
  ];
  const meter = (v, h, readyAt, marker) => {
    const brs = [0, 1].map((i) => {
      const lit = Math.max(0, Math.min(4, v - 4 * i));
      const ready = lit >= 4 && v >= readyAt;
      const mk = marker - 1;
      const notch = mk >= 0 && Math.floor(mk / 4) === i ? `<i class="vl-notch" style="left:${20 + (60 * ((mk % 4) + 0.5)) / 4}%"></i>` : '';
      return `<span class="vl-br${ready ? ' on' : ''}"><img class="vl-img" src="${MK.brazier('brazier-' + lit)}" alt=""><img class="vl-flame" src="${MK.brazier('brazier-ready')}" alt="">${notch}</span>`;
    }).join('');
    return `<span class="vl-meter vl-stack${v >= readyAt ? ' vl-ready' : ''}" style="--vl-h:${h}px"><span class="vl-brs">${brs}</span><span class="vl-lbl">Valor</span></span>`;
  };
  function hud(o) {
    const cells = o.queue.map(([id, enemy, state]) => `<div class="bh-cell ${enemy ? 'enemy' : ''} ${state}"><img class="bh-portrait" src="${MK.av(id)}" alt="" ${enemy ? 'style="transform:scaleX(-1)"' : ''}></div>`).join('');
    const past = o.queue.filter((c) => c[2] === 'past').length;
    const bar = (k, ic, v, max, w) => `<div class="bh-hpmp ${k}"><div class="bh-num">${img(ic)}${k === 'rage' ? `<span class="v">${v}</span>` : v}<span class="of">/ ${max}</span></div><div class="bh-bar ${k}"><i style="width:${w}%"></i></div></div>`;
    const st = (ic, l, v, pri) => `<div class="bh-st ${pri ? 'pri' : ''}">${img(ic)}<span class="l">${l}</span><span>${v}</span></div>`;
    const PW = 132, PG = 8, SKW = 4 * PW + 3 * PG, sx = W / 2 - SKW / 2, gx = sx + SKW + 22, vx = gx + 150 + 20, rx = vx + 150 + 24;
    return `<div class="bh-root ${o.cls || ''}"><div class="bh-band"><i class="bh-dia bh-band-dia"></i></div>
      <div class="bh-turn" style="left:${W / 2 - 46 - past * 80}px">${cells}${o.turnExtra || ''}</div>
      <div class="bh-turn-lbl" style="left:${W / 2}px"><i class="bh-dia s"></i>${esc(o.label || 'Your turn')}<i class="bh-dia s"></i></div>${o.lblExtra || ''}
      <div class="bh-actor"><div class="bh-opener"><div class="bh-pframe"><img class="bh-portrait" src="${MK.av('warrior')}" alt=""></div><div class="bh-actor-info">
        <div class="bh-name"><span class="bh-n">Warrior</span></div><div class="bh-chips"><span class="bh-chip">Melee Bruiser</span><span class="bh-chip hot">${img(MK.st('str'))}Strength <b>32</b> primary</span></div>
        <div class="bh-abody"><div class="bh-hpmp-row">${bar('hp', MK.st('hp'), 83, 129, 64)}${bar('mp', MK.st('mp'), 68, 68, 100)}${bar('rage', RG, 7, 50, 14)}</div>
        <div class="bh-aside"><div class="bh-main">${st(MK.st('str'), 'STR', 32, 1)}${st(MK.st('dex'), 'DEX', 8)}${st(MK.st('int'), 'INT', 12)}${st(MK.st('luck'), 'LCK', 14)}</div><span class="bh-more">All stats</span></div></div></div></div></div>
      <div class="bh-pasv" style="left:${sx - (PW + PG)}px;width:${PW}px"><div class="bp pas"><span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span><div class="bp-ico">${img(WS + 'rage.webp')}</div><span class="bp-nm">Berserker</span><div class="bp-chips"></div></div></div>
      <div class="bh-skills" style="left:${sx}px">${SKILLS.map(plate).join('')}</div>
      <div class="bh-globs" style="left:${gx}px"><div class="bh-vfade"></div><div class="bh-gcol">
        <div class="bh-gl">${img(MK.ui('rest'))}<span>Rest</span></div><div class="bh-gl">${img(MK.ui('skip'))}<span>Skip</span></div><div class="bh-gl">${img(MK.ui('move'))}<span>Move</span></div><div class="bh-gl off">${img(MK.brazier('brazier-4'))}<span>Revive</span></div></div></div>
      <div class="bh-valor" style="left:${vx}px">${meter(5, 60, 6, 6)}</div>
      <div class="bh-right" style="left:${rx}px;width:${W - rx - 28}px"><div class="bh-binfo"><div class="bh-links"><span class="bh-plink ico">${img(MK.ui('combatLog'), 'bh-ico bh-pl-ico')}<span class="bh-pl-t">Combat log</span></span></div></div></div></div>`;
  }
  const queueFor = (w) => {
    const foes = WAVES[w - 1].map(([id]) => [id, 1, '']);
    const a = [['archer', 0, 'past'], ['warrior', 0, 'now']];
    const order = [foes[0], ['druid', 0, ''], foes[1], ['mage', 0, ''], foes[2], ['archer', 0, '']];
    return a.concat(order.filter(Boolean));
  };

  /* ---------- sahne ---------- */
  const unit = (id, slot, side, o = {}) => {
    const [x, y] = (side === 'party' ? PARTY_SLOTS : FOE_SLOTS)[slot];
    return `<div class="wb-unit ${side} ${side === 'foe' ? 'flip' : ''} ${o.cls || ''}" data-y="${y}" style="left:${x - 70}px;top:${y - 190}px;z-index:${y}"><div class="pl"><b>${NAMES[id]}</b><i><u style="width:${Math.round((o.hp ?? 1) * 100)}%"></u></i></div><img class="sp" src="${MK.spr(id)}" alt=""></div>`;
  };
  const units = (w, foeCls) => PARTY.map(([id, s, hp]) => unit(id, s, 'party', { hp })).join('') + WAVES[w - 1].map(([id, s]) => unit(id, s, 'foe', { cls: foeCls })).join('');
  const pips = (cur, total, cls = '') => `<span class="wb-pips ${cls}">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 < cur ? 'on' : i + 1 === cur ? 'cur' : ''}"></i>`).join('')}</span>`;
  const navs = MK.navBtn('menu', 'Menu') + MK.navBtn('fs', 'Fullscreen');
  const stage = (inner) => `<div class="wb-stage"><div class="wb-bg" style="background-image:url(${MK.bg('border-road')})"></div>${inner}</div>${navs}`;

  /* ---------- dalga parcalari ---------- */
  const nextTip = (w) =>
    tip({ kind: 'Next wave', title: `Wave ${w} of ${TOTAL}`, icon: MK.node('battle'), value: `${WAVES[w - 1].length}`, valueLabel: 'foes', chips: foeNames(w).map((f) => ({ icon: MK.av(f.id), text: f.n > 1 ? `${f.name} ×${f.n}` : f.name })) });
  const gh = (w) => foeNames(w).map((f) => `<span class="gh ${f.n > 1 ? 'x2' : ''}" data-n="${f.n}x"><img src="${MK.av(f.id)}" alt=""></span>`).join('');

  const V = {
    // V1: sol ust plaka, onizleme YOK, klasik tam bant
    v1: {
      hud: (w) => hud({ queue: queueFor(w) }),
      extra: (w) => `<div class="wb-corner ${w === TOTAL ? 'final' : ''}"><span class="ico"><img src="${MK.node('battle')}" alt=""></span><span class="tx"><span class="k">Wave</span><span class="n">${w}<small> / ${TOTAL}</small></span>${pips(w, TOTAL)}</span></div>`,
      trans: (w) => `<div class="wb-ov"><div class="wb-tband"><div class="c"><i class="dia"></i><h2>Wave ${w}</h2><div class="sub">${esc(foeLine(w))}</div>${pips(w, TOTAL)}</div></div></div>`,
      hudCls: 'gone',
    },
    // V2: sira cubugunda ayirac + etiket altinda dalga; onizleme hover'da; ince ust bant, HUD kalir
    v2: {
      hud: (w) => hud({ queue: queueFor(w), turnExtra: w < TOTAL ? `<div class="wb-qdiv k-tipwrap"><span><small>Wave</small><b>${w + 1}</b></span><div class="k-tip">${nextTip(w + 1)}</div></div>` : '',
        lblExtra: `<div class="wb-lbl2" style="left:${W / 2}px;top:${w === TOTAL ? 150 : 150}px;margin-top:22px"><span class="wv">Wave <b>${w}</b> / ${TOTAL}</span>${pips(w, TOTAL)}</div>` }),
      extra: () => '',
      trans: (w) => `<div class="wb-ov"><div class="wb-slim"><div class="in"><div class="ttl"><span class="k">Wave ${w - 1} cleared</span><h2>Wave ${w} <small>/ ${TOTAL}</small></h2></div><div class="foes">${foeNames(w).map((f) => `<span class="gh"><img src="${MK.av(f.id)}" alt=""></span>`).join('')}</div></div></div></div>`,
      hudCls: 'fade',
    },
    // V3: sag kenar rayi: sonraki dalga hep gorunur; gecis A Band plakasi
    v3: {
      hud: (w) => hud({ queue: queueFor(w) }),
      extra: (w) => w < TOTAL
        ? `<div class="wb-rail"><div class="hd"><span>Next wave</span><b>${w + 1}/${TOTAL}</b></div><div class="row">${gh(w + 1)}</div><div class="ft"><div class="pips">${pips(w, TOTAL)}</div></div></div>`
        : `<div class="wb-rail"><div class="hd"><span>Final wave</span><b>${w}/${TOTAL}</b></div><div class="ft" style="border:0;margin:0;padding:0"><div class="pips">${pips(w, TOTAL)}</div></div></div>`,
      trans: (w) => `<div class="wb-ov"><div class="wb-bandbox">${tip({ kind: 'Reinforcements', title: `Wave ${w} of ${TOTAL}`, icon: MK.node('battle'), value: `${WAVES[w - 1].length}`, valueLabel: 'foes', chips: foeNames(w).map((f) => ({ icon: MK.av(f.id), text: f.n > 1 ? `${f.name} ×${f.n}` : f.name })) })}</div></div>`,
      hudCls: 'fade',
    },
    // mevcut: dalga yok (tek sayfa dusman)
    cur: { hud: (w) => hud({ queue: queueFor(w) }), extra: () => '', trans: () => '', hudCls: '' },
  };

  const STATES = [
    { cap: 'Wave 1 of 3 · battle running', w: 1, phase: 'run' },
    { cap: 'Wave cleared → wave 2 arrives (transition moment)', w: 2, phase: 'enter' },
    { cap: 'Wave 3 of 3 · final wave', w: 3, phase: 'run' },
  ];
  function render(vk, st) {
    const v = V[vk];
    if (st.phase === 'enter') {
      const dead = WAVES[st.w - 2].map(([id, s]) => unit(id, s, 'foe', { cls: 'gone' })).join('');
      return stage(`${PARTY.map(([id, s, hp]) => unit(id, s, 'party', { hp })).join('')}${dead}${WAVES[st.w - 1].map(([id, s]) => unit(id, s, 'foe', { cls: 'enter' })).join('')}${v.hud(st.w).replace('class="bh-root ', `class="bh-root ${v.hudCls} `)}${v.trans(st.w)}`);
    }
    return stage(`${units(st.w)}${v.hud(st.w)}${v.extra(st.w)}`);
  }
  const build = (vk) => (host) => STATES.forEach((st) => MK.addFrame(host, { cap: st.cap, bg: MK.bg('border-road'), dim: false, render: (ui) => { ui.innerHTML = render(vk, st); } }));

  MK.mount({
    title: 'Wave battle',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (dalga yok)', note: 'Bugünkü savaş: tüm düşmanlar tek seferde, HUD\'da dalga bilgisi yok. Sahne ve HUD birebir; aşağıdaki varyantlar yalnızca dalga parçalarını ekler.', build: (host) => MK.addFrame(host, { cap: 'Mevcut savaş HUD\'ı (Warrior, tek sayfa düşman)', bg: MK.bg('border-road'), dim: false, render: (ui) => { ui.innerHTML = render('cur', STATES[0]); } }) },
      { id: 'v1', tab: 'V1 Corner', h: 'V1 · Corner plate', note: 'Sol üstte köşe elmaslı küçük plaka (Wave 1/3 + üç elmas); sonraki dalga ÖNİZLENMEZ (sürpriz); geçişte Endless\'taki gibi tam bant (WAVE 2 + düşman adları) ve HUD kısa süre gizlenir.', build: build('v1') },
      { id: 'v2', tab: 'V2 In queue', h: 'V2 · In the turn bar', note: 'Gösterge sıra çubuğunun altında ("Wave 1 / 3" + elmaslar), sıranın sonunda kesik çerçeveli "Wave 2" hücresi; önizleme yalnızca o hücrenin üstüne gelince A Band ipucunda; geçişte HUD kalır, üstte ince bant.', build: build('v2') },
      { id: 'v3', tab: 'V3 Rail', h: 'V3 · Reinforcement rail', note: 'Sağ üstte "Next wave 2/3" rayı: sonraki dalganın düşman portreleri HEP görünür (stratejiyi etkiler); son dalgada ray "Final wave" der; geçişte ortada A Band plakası (Reinforcements, Wave 2 of 3, düşman çipleri).', build: build('v3') },
    ],
  });
})();
