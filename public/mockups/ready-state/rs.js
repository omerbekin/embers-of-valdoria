/* Hazir durumu taslagi: oyun kodu DEGIL. Quick Battle + Multiplayer takim secimi (TeamSelectScene) yerlesimi 1920x1080 oyun biriminde; veri oyundan (team-select/data.js). */
(function () {
  const { esc } = MK;
  const C = Object.fromEntries(window.TS_CLASSES.map((c) => [c.id, c]));
  const NAME = { antimage: 'Anti-Mage' };
  const nm = (id) => NAME[id] || C[id].name;
  const PL = ['gambler', 'antimage', 'mage', 'defender'], EN = ['mage', 'archer', 'paladin', 'druid'];
  const GROUPS = [['str', '#d9703a', ['defender', 'warrior']], ['dex', '#5fb06a', ['archer', 'cutthroat']], ['int', '#5a9be0', ['antimage', 'druid', 'mage', 'paladin', 'undead']], ['luck', '#c9a64a', ['gambler', 'hexer']]];
  const STATS = [['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['luck', 'LCK']];
  const WARR = { sword: 'battle-hud/warrior/sword.webp', whirlwind: 'battle-hud/warrior/whirlwind.webp', charge: 'battle-hud/warrior/charge.webp', warcry: 'battle-hud/warrior/warcry.webp', rage: 'battle-hud/warrior/rage.webp' };
  const icUrl = (n) => WARR[n] || `team-select/ic/${n}.webp`;
  const ROWS = 4, LANES = 3, CELL = 120, GAP = 12;

  /* ---- ortak sahne parcalari ---- */
  const roster = (sel) => {
    let x = 40;
    const y = 884;
    return GROUPS.map(([k, col, ids]) => {
      const gx = x;
      const tiles = ids.map((id) => {
        const tx = x;
        x += 124;
        const p = PL.includes(id) ? '<i class="bd p">1</i>' : '', e = EN.includes(id) ? '<i class="bd e">1</i>' : '';
        return `<div class="ts-tile${sel === id ? ' sel' : ''}" style="left:${tx}px;top:${y}px"><div class="pf"><img src="${MK.av(id)}" alt="">${p}${e}</div><div class="nm">${esc(nm(id))}</div></div>`;
      }).join('');
      x += 22;
      return `<div class="ts-gh" style="left:${gx}px;top:${y - 36}px;--c:${col}"><i></i>${{ str: 'STR', dex: 'DEX', int: 'INT', luck: 'LCK' }[k]}</div>${tiles}`;
    }).join('');
  };
  const strip = (sel) => {
    const c = C[sel];
    const sts = STATS.map(([k, l]) => `<span class="st${c.primary === k ? ' pri' : ''}"><img src="${MK.st(k)}" alt=""><i>${l}</i><b>${c.attrs[k]}</b></span>`).join('');
    const sks = [`<span class="sk pas"><img class="i" src="${icUrl(c.passive.icon)}" alt=""></span>`].concat(c.skills.map((s) => `<span class="sk"><img class="i" src="${icUrl(s.icon)}" alt=""></span>`)).join('');
    return `<div class="t3 cur"><div class="av"><img src="${MK.av(sel)}" alt=""></div><div class="nm"><b>${esc(nm(sel))}</b><em>${esc(c.role)}</em></div><div class="sts">${sts}</div><div class="sks">${sks}</div></div>`;
  };
  const CH = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const cellPos = (side, i) => {
    const row = Math.floor(i / LANES), lane = i % LANES;
    const col = side === 'p' ? ROWS - 1 - row : row;
    return [col * (CELL + GAP), lane * (CELL + GAP)];
  };
  const board = (side, ids, o) => {
    const e = side === 'e';
    const cells = Array.from({ length: 12 }, (_, i) => {
      const [x, y] = cellPos(side, i);
      const id = o.hidden ? '' : ids[i];
      return `<div class="rs-cell${id ? ' f' : ''}" style="left:${x}px;top:${y}px">${id ? `<img src="${MK.av(id)}" alt=""><div class="n">${esc(nm(id))}</div>` : ''}</div>`;
    }).join('');
    const stepper = o.stepper ? `<div class="rs-step"><i>${CH('M15 5 L8 12 L15 19')}</i><b>4</b><i>${CH('M9 5 L16 12 L9 19')}</i></div>` : '';
    const ct = o.count ? `<span class="ct">${o.count}</span>` : '';
    const hd = `<div class="rs-hd"><span class="dia${o.dia ? '' : ' off'}"></span><span class="nm${o.dia ? ' on' : ''}">${o.name}</span>${ct}<span class="grow"></span>${stepper}</div>`;
    const cover = o.hidden ? `<div class="rs-cover"><span class="d${o.opp ? '' : ' off'}"></span><b class="${o.opp ? 'on' : ''}">${o.opp ? 'Opponent is ready' : 'Opponent is choosing...'}</b><span>Rival's team is revealed when the battle starts</span></div>` : '';
    const acts = o.acts ? `<div class="rs-acts">Random <u>◆</u> Clear</div>` : '';
    const fx = e ? 0 : 516 - CELL;
    return `<div class="rs-side ${side}" style="left:${e ? 1320 : 84}px">${hd}<div class="rs-front" style="left:${fx}px">Front</div><div class="rs-grid">${cells}</div>${cover}${acts}${o.extra || ''}</div>`;
  };

  /* ---- durum modeli ---- */
  const SC = [
    { id: 'qb1', cap: 'QUICK BATTLE · Player takımı eksik (3 / 4), Enemy hazır', mode: 'qb', p: { n: 3, lit: false }, e: { n: 4, lit: true }, start: false },
    { id: 'qb2', cap: 'QUICK BATTLE · iki takım da hazır', mode: 'qb', p: { n: 4, lit: true }, e: { n: 4, lit: true }, start: true },
    { id: 'mp1', cap: 'MULTIPLAYER · sen hazırsın, rakip hâlâ seçiyor', mode: 'mp', p: { n: 4, lit: true }, e: { n: 0, lit: false }, start: true, me: true, opp: false },
    { id: 'mp2', cap: 'MULTIPLAYER · ikisi de hazır, savaş başlıyor', mode: 'mp', p: { n: 4, lit: true }, e: { n: 0, lit: true }, start: true, me: true, opp: true },
  ];
  const both = (s) => s.p.lit && s.e.lit;
  const missing = (s) => (s.p.n < 4 ? `Player team needs ${4 - s.p.n} more ${4 - s.p.n === 1 ? 'class' : 'classes'}` : '');
  /* oyundaki metinler (TeamSelectScene.refresh) */
  const gameStatus = (s) => {
    if (s.mode === 'qb') return both(s) ? ['Both teams are ready', 'on'] : [missing(s), ''];
    return s.opp ? ['Both ready - starting...', 'on'] : ['Waiting for your opponent to be ready', 'on'];
  };

  const btns = (s, v) => {
    const mp = s.mode === 'mp';
    const fire = v && both(s) ? ' rs-fire' : '';
    const label = mp ? (s.me ? 'Not ready' : 'Ready') : 'Start battle';
    const [txt, tone] = gameStatus(s);
    let top = '';
    if (v === 'v3') {
      const l = s.mode === 'qb' ? `Player ${s.p.n}/4` : 'You · ' + (s.p.lit ? 'Ready' : `${s.p.n}/4`);
      const r = s.mode === 'qb' ? `Enemy ${s.e.n}/4` : 'Rival · ' + (s.e.lit ? 'Ready' : 'Choosing');
      const lw = s.mode === 'qb' ? (s.p.n / 4) * 100 : s.p.lit ? 100 : (s.p.n / 4) * 100;
      const rw = s.mode === 'qb' ? (s.e.n / 4) * 100 : s.e.lit ? 100 : 0;
      const show = !(s.mode === 'qb' && both(s)) && !(s.mode === 'qb' && !both(s));
      const stline = s.mode === 'mp' ? `<div class="ts-ready ${tone}">${txt}</div>` : '';
      top = `${stline}${mp ? '' : '<button class="el-btn" type="button">Random both</button>'}<div class="rs-bar${both(s) ? ' both' : ''}"><div class="h${s.p.lit ? ' lit' : ''}"><s style="width:${lw}%"></s><span>${l}</span></div><div class="h r${s.e.lit ? ' lit' : ''}"><s style="width:${rw}%"></s><span>${r}</span></div></div>`;
      void show;
      return `<div class="rs-btns">${top}<div class="rs-conduit${both(s) ? ' on' : ''}"></div><button class="el-btn primary${s.start ? ' ready' : ''}${fire}" type="button">${label}</button></div>`;
    }
    if (!v) top = `<div class="ts-ready ${tone}">${txt}</div>`;
    else if (v === 'v1') top = s.mode === 'mp' ? `<div class="ts-ready ${tone}">${txt}</div>` : '';
    return `<div class="rs-btns">${top}${mp ? '' : '<button class="el-btn" type="button">Random both</button>'}<button class="el-btn primary${s.start ? ' ready' : ''}${fire}" type="button">${label}</button></div>`;
  };

  /* ---- V1 plaka ---- */
  const plate = (lit, label, n, size) => {
    const pips = size ? `<span class="pips">${Array.from({ length: size }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}</span>` : '';
    return `<div class="rs-plate${lit ? ' lit' : ''}"><span class="k">${label}</span>${pips}</div>`;
  };
  const plates = (s) => {
    if (s.mode === 'qb') {
      return [
        plate(s.p.lit, s.p.lit ? 'Ready' : `Needs ${4 - s.p.n} more`, s.p.n, 4),
        plate(s.e.lit, s.e.lit ? 'Ready' : `Needs ${4 - s.e.n} more`, s.e.n, 4),
      ];
    }
    return [plate(s.p.lit, s.p.lit ? 'You · Ready' : s.p.n === 4 ? 'You · Press ready' : 'You · Choosing', s.p.n, 4), plate(s.e.lit, s.e.lit ? 'Opponent · Ready' : 'Opponent · Choosing', 0, 0)];
  };

  /* ---- V2 muhur ---- */
  const seal = (s) => {
    const l = s.p.lit, r = s.e.lit, b = both(s);
    const [t, sub] = s.mode === 'qb'
      ? (b ? ['Both teams ready', 'Press Start Battle'] : [l ? 'Enemy not ready' : 'Player not ready', missing(s) || 'Pick the missing heroes'])
      : (b ? ['Both ready', 'Starting...'] : ['Waiting for opponent', 'Your team is ready']);
    return `<div class="rs-sealln l${l ? ' on' : ''}"></div><div class="rs-sealln r${r ? ' on' : ''}"></div>
      <div class="rs-seal${b ? ' both' : ''}"><div class="ring"><div class="hf l${l ? ' on' : ''}"></div><div class="hf r${r ? ' on' : ''}"></div><div class="mid"></div><div class="vs">VS</div></div><i class="gem l${l ? ' on' : ''}"></i><i class="gem r${r ? ' on' : ''}"></i></div>
      <div class="rs-sealtx${b ? ' on' : ''}">${t}<small>${sub}</small></div>`;
  };
  const vsPlain = '<div class="rs-vsl l"></div><div class="rs-vsl r"></div><div class="rs-vs">VS</div>';

  const render = (s, v) => {
    const qb = s.mode === 'qb';
    const pb = board('p', PL.slice(0, s.p.n), { name: 'Player', dia: true, count: `${s.p.n} / 4`, stepper: qb, acts: qb, extra: v === 'v1' ? plates(s)[0] : '' });
    const eb = board('e', qb ? EN.slice(0, s.e.n) : [], { name: qb ? 'Enemy' : 'Opponent', dia: false, count: qb ? `${s.e.n} / 4` : '', stepper: qb, acts: qb, hidden: !qb, opp: s.e.lit, extra: v === 'v1' ? plates(s)[1] : '' });
    return `<div class="mk-stage ts-stage rs-stage"><div class="ts-shade"></div><div class="rs-title">${qb ? 'Quick Battle' : 'Multiplayer'}</div>${pb}${eb}${v === 'v2' ? seal(s) : vsPlain}${strip(qb ? 'defender' : 'mage')}${roster(qb ? 'defender' : 'mage')}${btns(s, v)}</div>`;
  };

  const build = (v) => (host) => SC.forEach((s) => MK.addFrame(host, { cap: s.cap, bg: MK.bg('proving-grounds'), render: (ui) => { ui.innerHTML = render(s, v); } }));

  MK.mount({
    title: 'Ready state',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (oyunun birebiri)', note: 'Hazır olunca yalnızca sağ altta, Random both\'un üstünde küçük düz yazı; ortada VS düz. Eksikse aynı yerde soluk "needs N more class". Multiplayer\'da rakip tahtası koyu örtü ("Opponent is choosing..." / "Opponent is ready"), durum yazısı yine aynı yerde.', build: build(null) },
      { id: 'v1', tab: 'V1 Plaka', h: 'V1 · Plaka', note: 'Her tahtanın başlığının altında hazır plakası (ön sıra etiketine çarpmaz): kor elması + durum + takım sayısı kadar küçük elmas (dolan kor olur). Hazır olan taraf kor çerçeve ve iç parıltı alır. İkisi hazır olunca START BATTLE tutuşur (güçlü kor nefesi). Düz yazı kalktı; yalnızca multiplayer durum satırı kaldı.', build: build('v1') },
      { id: 'v2', tab: 'V2 Mühür', h: 'V2 · Mühür', note: 'Ortadaki VS büyük bir mühür olur: sol yarı Player, sağ yarı Enemy / rakip hazır olunca kor dolar, yanındaki elmas ve çizgi de yanar. İkisi birden yanınca mühür alev alır; altında tek kısa durum satırı. START da tutuşur. Sağ alttaki düz yazı kalktı.', build: build('v2') },
      { id: 'v3', tab: 'V3 Çubuk', h: 'V3 · Hazır çubuğu', note: 'START\'ın hemen üstünde iki yarı çubuk (sen / rakip): takım tamamlandıkça kor dolar (multiplayer\'da rakibin takımı gizli, hazır olunca dolar). İkisi dolunca ortadaki elmas yanar, çubuk parlar ve START\'a inen bir kor çizgisiyle birleşir; START tutuşur.', build: build('v3') },
    ],
  });
})();
