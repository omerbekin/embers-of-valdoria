/* Crown Surge taslagi: oyun kodu DEGIL. Savas HUD'i wave-battle taslagiyla ayni (oyunun gercek markup'i + battle-hud.css), arka plan Harita 2 river-gorge.
   Sayilar / metinler ORNEKTIR (Ash Surge: takima 2 tur +%30 hasar, cagiran 1 Ashen Taint = -%3 maks can; docs/design/campaign/map2-quests-surge.md C1). */
(function () {
  if (!location.hash) location.hash = '#v1';
  const { esc, tip } = MK;
  const W = 1920;
  const CS = 'crown-surge/';
  const PARTY_SLOTS = [[784, 745], [725, 802], [665, 859], [599, 745], [540, 802], [480, 859]];
  const FOE_SLOTS = [[1136, 745], [1195, 802], [1255, 859], [1321, 745], [1380, 802], [1440, 859]];
  const NAMES = { warrior: 'Warrior', archer: 'Archer', druid: 'Druid', mage: 'Mage', drowned: 'Drowned', drowned_knight: 'Drowned Knight', corsair_cutlass: 'Corsair' };
  const PARTY = [['warrior', 0, 1], ['archer', 4, 1], ['druid', 2, .9], ['mage', 3, 1]];
  const FOES = [['drowned_knight', 0, .8], ['corsair_cutlass', 1, 1], ['drowned', 2, .6]];
  const spr = (id) => (MK.spr(id).includes('/spr/') && !/drowned|corsair/.test(id) ? MK.spr(id) : `${CS}spr-${id}.webp`);
  const av = (id) => (/drowned|corsair/.test(id) ? `${CS}av-${id}.webp` : MK.av(id));
  const img = (u, c = 'bh-ico') => `<img class="${c}" src="${u}" alt="" draggable="false">`;
  const WS = 'battle-hud/warrior/';
  const CROWN = CS + 'crown.webp';

  /* ---------- savas HUD'i (wave-battle ile ayni) ---------- */
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
    const taint = !!o.taint;
    const queue = o.queue;
    const cells = queue.map(([id, enemy, state]) => `<div class="bh-cell ${enemy ? 'enemy' : ''} ${state}"><img class="bh-portrait" src="${av(id)}" alt="" ${enemy ? 'style="transform:scaleX(-1)"' : ''}></div>`).join('');
    const past = queue.filter((c) => c[2] === 'past').length;
    const bar = (k, ic, v, max, w) => `<div class="bh-hpmp ${k}"><div class="bh-num">${img(ic)}${k === 'rage' ? `<span class="v">${v}</span>` : v}<span class="of">/ ${max}</span></div><div class="bh-bar ${k}"><i style="width:${w}%"></i></div></div>`;
    const st = (ic, l, v, pri) => `<div class="bh-st ${pri ? 'pri' : ''}">${img(ic)}<span class="l">${l}</span><span>${v}</span></div>`;
    const PW = 132, PG = 8, SKW = 4 * PW + 3 * PG, sx = W / 2 - SKW / 2, gx = sx + SKW + 22, vx = gx + 150 + 20, rx = vx + 150 + 24;
    const maxhp = taint ? 125 : 129;
    return `<div class="bh-root"><div class="bh-band"><i class="bh-dia bh-band-dia"></i></div>
      <div class="bh-turn" style="left:${W / 2 - 46 - past * 80}px">${cells}</div>
      <div class="bh-turn-lbl" style="left:${W / 2}px"><i class="bh-dia s"></i>${esc(o.label || 'Your turn')}<i class="bh-dia s"></i></div>
      <div class="bh-actor"><div class="bh-opener"><div class="bh-pframe"><img class="bh-portrait" src="${MK.av('warrior')}" alt=""></div><div class="bh-actor-info">
        <div class="bh-name"><span class="bh-n">Warrior</span></div><div class="bh-chips"><span class="bh-chip">Melee Bruiser</span>${taint ? `<span class="bh-chip taint"><b>Ashen Taint ×1</b></span>` : `<span class="bh-chip hot">${img(MK.st('str'))}Strength <b>32</b> primary</span>`}</div>
        <div class="bh-abody"><div class="bh-hpmp-row">${bar('hp', MK.st('hp'), 83, maxhp, Math.round(8300 / maxhp))}${bar('mp', MK.st('mp'), 68, 68, 100)}${bar('rage', RG, 7, 50, 14)}</div>
        <div class="bh-aside"><div class="bh-main">${st(MK.st('str'), 'STR', 32, 1)}${st(MK.st('dex'), 'DEX', 8)}${st(MK.st('int'), 'INT', 12)}${st(MK.st('luck'), 'LCK', 14)}</div><span class="bh-more">All stats</span></div></div></div></div></div>
      <div class="bh-pasv" style="left:${sx - (PW + PG)}px;width:${PW}px"><div class="bp pas"><span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span><div class="bp-ico">${img(WS + 'rage.webp')}</div><span class="bp-nm">Berserker</span><div class="bp-chips"></div></div></div>
      <div class="bh-skills" style="left:${sx}px">${SKILLS.map(plate).join('')}</div>
      <div class="bh-globs" style="left:${gx}px"><div class="bh-vfade"></div><div class="bh-gcol">
        <div class="bh-gl">${img(MK.ui('rest'))}<span>Rest</span></div><div class="bh-gl">${img(MK.ui('skip'))}<span>Skip</span></div><div class="bh-gl">${img(MK.ui('move'))}<span>Move</span></div><div class="bh-gl off">${img(MK.brazier('brazier-4'))}<span>Revive</span></div></div></div>
      <div class="bh-valor" style="left:${vx}px">${meter(5, 60, 6, 6)}</div>
      <div class="bh-right ${o.crownPlate ? "cs-right" : ""}" style="left:${o.crownPlate ? rx - 14 : rx}px;width:${W - rx - (o.crownPlate ? 8 : 28)}px">${o.crownPlate || ''}<div class="bh-binfo"><div class="bh-links"><span class="bh-plink ico">${img(MK.ui('combatLog'), 'bh-ico bh-pl-ico')}<span class="bh-pl-t">Combat log</span></span></div></div></div></div>`;
  }
  const QUEUE = [['archer', 0, 'past'], ['warrior', 0, 'now'], ['drowned_knight', 1, ''], ['druid', 0, ''], ['corsair_cutlass', 1, ''], ['mage', 0, ''], ['drowned', 1, ''], ['archer', 0, '']];

  /* ---------- sahne ---------- */
  const unit = (id, slot, side, o = {}) => {
    const [x, y] = (side === 'party' ? PARTY_SLOTS : FOE_SLOTS)[slot];
    const buff = o.surge ? `<span class="cs-buff"><img src="${CROWN}" alt="">+30%</span>` : '';
    return `<div class="wb-unit ${side} ${side === 'foe' ? 'flip' : ''} ${o.surge ? 'surge' : ''}" style="left:${x - 70}px;top:${y - 190}px;z-index:${y}"><div class="pl">${buff}<b>${NAMES[id]}</b><i><u style="width:${Math.round((o.hp ?? 1) * 100)}%"></u></i></div><img class="sp" src="${spr(id)}" alt=""></div>`;
  };
  const units = (surge) => PARTY.map(([id, s, hp]) => unit(id, s, 'party', { hp, surge })).join('') + FOES.map(([id, s, hp]) => unit(id, s, 'foe', { hp })).join('');
  const navs = MK.navBtn('menu', 'Menu') + MK.navBtn('fs', 'Fullscreen');
  const stage = (inner) => `<div class="wb-stage"><div class="wb-bg" style="background-image:url(${CS}bg.webp)"></div>${inner}</div>${navs}`;
  const pill = () => `<div class="cs-pill"><img src="${CROWN}" alt=""><div><div class="t">Ash Surge</div><div class="s">Party deals <b>+30%</b> damage · <b>2</b> turns</div></div></div>`;

  const surgeTip = (extra) => tip({
    kind: 'Crown Surge', title: 'Ash Surge', icon: CROWN, accent: '#e2b04a', value: '1', valueLabel: 'left in region',
    chips: [{ text: 'Whole party' }, { text: '2 turns' }, ...(extra || [])],
    lines: ['The whole party deals +30% damage for 2 turns.', 'The hero who calls it takes 1 Ashen Taint (-3% max HP per stack) until cleansed at a chapel.'],
  });

  /* ---------- V1: HUD'da tac plakasi, kahramanin eylemini harcar ---------- */
  function v1(st) {
    const used = st.used;
    const tag = '<span class="bp-tag"><span class="full">Crown</span><span class="short">Crown</span></span>';
    const chips = used
      ? `<span class="bp-chip none"><b>0 / 1</b></span>`
      : `<span class="bp-chip act"><b>1 / 1</b></span><span class="bp-chip"><span class="w">Action</span></span>`;
    const plateHtml = `<div class="cs-v1wrap k-tipwrap ${st.tip ? 'tipon' : ''}" data-act="toggle"><div class="bp crown ${used ? 'used' : ''}">${tag}<span class="bp-key">5</span><div class="bp-ico"><img class="bh-ico" src="${CROWN}" alt=""></div><span class="bp-nm">Crown Surge</span><div class="bp-chips">${chips}</div></div><div class="k-tip">${used ? tip({ kind: 'Crown Surge', title: 'Spent', icon: CROWN, accent: '#6b5a3a', value: '0', valueLabel: 'left in region', lines: ['Already called in this region.', 'Refills when you reach the next region.'] }) : surgeTip([{ text: 'Uses the hero\'s action', tone: 'bad' }])}</div></div>`;
    return stage(`${units(used)}${hud({ queue: QUEUE, taint: used, crownPlate: plateHtml, label: used ? 'Crown called' : 'Your turn' })}${used ? pill() : ''}`);
  }

  /* ---------- V2: ulti cubugu ---------- */
  const barTip = (pct) => tip({
    kind: 'Crown charge', title: 'Crown Surge', icon: CROWN, accent: '#e2b04a', value: pct + '%', valueLabel: pct >= 100 ? 'ready' : 'charged',
    chips: [{ text: 'Shared by the party' }, { text: 'Once per region' }],
    lines: ['Fills as your party deals and takes damage.', 'When full, the active hero may call Ash Surge: the whole party deals +30% damage for 2 turns.', 'The caller takes 1 Ashen Taint (-3% max HP per stack) until cleansed.'],
  });
  function v2(st) {
    const p = st.pct, full = p >= 100 && !st.used, spent = st.used;
    const ticks = Array.from({ length: 9 }, (_, i) => `<u style="left:${(i + 1) * 10}%"></u>`).join('');
    const sub = spent ? 'Spent in this region' : full ? '<b>Ready</b> · click to call Ash Surge' : 'Fills as the party deals and takes damage';
    const num = spent ? '0' : p;
    const bar = `<div class="cs-bar k-tipwrap ${full ? 'full' : spent ? 'spent' : p > 0 ? 'mid' : ''} ${st.tip ? 'tipon' : ''}" data-act="toggle"><div class="cs-med"><img src="${CROWN}" alt=""></div><div class="cs-mid"><div class="cs-hd"><span class="k">Crown</span><b>${num}<small> / 100</small></b></div><div class="cs-track"><i style="width:${spent ? 0 : p}%"></i>${ticks}</div><div class="cs-sub">${sub}</div></div><div class="k-tip">${spent ? tip({ kind: 'Crown charge', title: 'Spent', icon: CROWN, accent: '#6b5a3a', lines: ['Already called in this region.', 'The bar stays empty until the next region.'] }) : barTip(p)}</div></div>`;
    return stage(`${units(spent)}${hud({ queue: QUEUE, taint: spent, label: spent ? 'Crown called' : 'Your turn' })}${bar}${spent ? pill() : ''}`);
  }

  const wire = (host, f, key) => {
    f.ui.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="toggle"]')) return;
      if (key === 'v1') f.state.used = !f.state.used;
      else if (f.state.used) { f.state.used = false; f.state.pct = 100; }
      else if (f.state.pct >= 100) { f.state.used = true; }
      else return;
      f.state.tip = false;
      f.redraw();
    });
  };
  const frames = (key, list, fn) => (host) => list.forEach((s) => {
    const f = MK.addFrame(host, { cap: s.cap, bg: CS + 'bg.webp', dim: false, state: { ...s }, render: (ui, fr) => { ui.innerHTML = fn(fr.state); } });
    wire(host, f, key);
  });

  MK.mount({
    title: 'Crown Surge',
    sections: [
      { id: 'v1', tab: 'V1 Crown button', h: 'V1', build: frames('v1', [
        { cap: 'Ready: 1 use left in this region (click the Crown to try it)', used: false },
        { cap: 'Hovering the Crown: tooltip', used: false, tip: true },
        { cap: 'Called: hero\'s action spent, party +30%, Warrior has 1 Ashen Taint, button dim', used: true },
      ], v1) },
      { id: 'v2', tab: 'V2 Charge bar', h: 'V2', build: frames('v2', [
        { cap: 'Empty: region start', pct: 0 },
        { cap: 'Filling (55%) + hover tooltip explains what fills it', pct: 55, tip: true },
        { cap: 'Full: Crown glows, ready to call (click it to try)', pct: 100 },
        { cap: 'Called: bar spent for this region, party +30%, Warrior has 1 Ashen Taint', pct: 100, used: true },
      ], v2) },
    ],
  });
})();
