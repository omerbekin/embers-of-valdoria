/* Hazir durumu v2 taslagi: oyun kodu DEGIL. Sahne/kit ready-state/rs.js'ten; veri team-select/data.js. 1920x1080 oyun birimi. */
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
    const cover = o.hidden ? `<div class="rs-cover"><span class="d${o.opp ? '' : ' off'}"></span><b class="${o.opp ? 'on' : ''}">${o.opp ? 'Opponent is ready' : 'Opponent is choosing...'}</b><span>Opponent's team is revealed when the battle starts</span></div>` : '';
    const acts = o.acts ? `<div class="rs-acts">Random <u>◆</u> Clear</div>` : '';
    const fx = e ? 0 : 516 - CELL;
    return `<div class="rs-side ${side}" style="left:${e ? 1320 : 84}px">${hd}<div class="rs-front" style="left:${fx}px">Front</div><div class="rs-grid">${cells}</div>${cover}${acts}</div>`;
  };

  /* ---- orta alan: 5 varyant ---- */
  const BURST = `<div class="bst"><i class="rg"></i>${Array.from({ length: 10 }, (_, i) => `<u style="--a:${i * 36}deg"></u>`).join('')}</div>`;
  const chain = (side, n) => {
    const links = Array.from({ length: n }, (_, i) => `<i class="${i % 2 ? 'k' : ''}" style="--i:${i}"></i>`).join('');
    return `<div class="ch ${side}">${links}<i class="o" style="--i:${n}"></i></div>`;
  };
  const SWORD = '<svg viewBox="0 0 420 44"><circle class="bd" cx="8" cy="22" r="8"/><rect class="bd" x="12" y="18" width="44" height="8"/><rect class="bd" x="56" y="3" width="13" height="38" rx="3"/><polygon class="bd" points="69,15 392,15 420,22 392,29 69,29"/></svg>';
  const sword = (side) => `<div class="sw ${side}"><div class="gh">${SWORD}</div><div class="rv">${SWORD}</div></div>`;
  const HALF = 'M2 2 H108 V188 C40 150 2 110 2 70 Z';
  const half = (side) => `<div class="half ${side}"><div class="cl"><div class="fl"></div></div><svg viewBox="0 0 110 190"><path d="${HALF}"/></svg></div>`;
  const ARENA = {
    v1: () => `<div class="bar"><div class="h l"><s></s></div><div class="h r"><s></s></div><i class="cap l"></i><i class="cap r"></i><i class="gem"></i></div>${BURST}`,
    v2: () => `${chain('l', 8)}${chain('r', 8)}${BURST}`,
    v3: () => `${sword('l')}${sword('r')}<i class="clash"></i>${BURST}`,
    v4: () => `${half('l')}${half('r')}<i class="seam"></i><i class="emb"></i>${BURST}`,
    v5: () => `<div class="fz l"><i class="lt"></i></div><div class="fz r"><i class="lt"></i></div><div class="bz"><i class="stand"></i><i class="foot"></i><i class="bowl"></i><i class="coal"></i><div class="fl"><b></b><b></b></div></div>${BURST}`,
    cur: () => '<div class="rs-vsl l" style="top:140px;left:208px"></div><div class="rs-vsl r" style="top:140px;left:402px"></div><div class="rs-vs" style="left:340px;top:140px">VS</div>',
  };

  const names = (qb) => (qb ? ['Player', 'Enemy'] : ['You', 'Opponent']);
  const render = (v, st) => {
    const qb = st.mode === 'qb', [L, R] = names(qb);
    const p = !!st.p, e = !!st.e, both = p && e, cur = v === 'cur';
    const cls = `mk-stage ts-stage rs-stage rs2-stage v-${v}${p ? ' p-on' : ''}${e ? ' e-on' : ''}${both && !cur ? ' joined' : ''}${both ? ' armed' : ''}${st.fixed ? ' nofx' : ''}`;
    const pb = board('p', PL, { name: L === 'You' ? 'You' : 'Player', dia: true, count: '4 / 4', stepper: qb, acts: qb });
    const eb = board('e', qb ? EN : [], { name: R, dia: false, count: qb ? '4 / 4' : '', stepper: qb, acts: qb, hidden: !qb, opp: e });
    const arena = `<div class="rs2-a"><div class="rs2-cp l"><span>${L}</span><span class="s"></span></div><div class="rs2-cp r"><span>${R}</span><span class="s"></span></div>${ARENA[v]()}</div>`;
    const rb = (s, who, on) => `<div class="rb ${s === 'p' ? 'l' : 'r'}"><button class="el-btn${on ? ' on' : ''}" data-s="${s}" type="button"><small>${who}</small><span>${on ? 'Not ready' : 'Ready'}</span></button></div>`;
    const btns = `<div class="rs-btns rs2-btns">${cur ? '<div class="ts-ready"></div>' : ''}<button class="el-btn primary rs2-start${both ? ' ready' + (cur ? '' : ' rs-fire') : ''}" type="button">Start battle</button></div>`;
    return `<div class="${cls}"><div class="ts-shade"></div><div class="rs-title">${qb ? 'Quick Battle' : 'Multiplayer'}</div>${pb}${eb}${arena}${rb('p', L, p)}${rb('e', R, e)}${strip(qb ? 'defender' : 'mage')}${roster(qb ? 'defender' : 'mage')}${btns}</div>`;
  };

  /* gorunumu durumla esle (yeniden cizmeden: animasyonlar kesilmesin) */
  const FILL_MS = 1300, ARM_MS = 600;
  const sync = (f, v) => {
    const r = f.ui.firstElementChild, st = f.state, qb = st.mode === 'qb', cur = v === 'cur';
    const p = !!st.p, e = !!st.e, both = p && e;
    r.classList.toggle('p-on', p); r.classList.toggle('e-on', e);
    clearTimeout(f.t1); clearTimeout(f.t2);
    const start = r.querySelector('.rs2-start');
    const arm = (on) => { r.classList.toggle('armed', on); start.classList.toggle('ready', on); start.classList.toggle('rs-fire', on && !cur); };
    if (!both) { r.classList.remove('joined'); arm(false); }
    else if (cur) { arm(true); } else if (!r.classList.contains('joined')) {
      f.t1 = setTimeout(() => { r.classList.add('joined'); f.t2 = setTimeout(() => arm(true), ARM_MS); }, FILL_MS);
    }
    r.querySelectorAll('.rb .el-btn').forEach((b) => { const on = b.dataset.s === 'p' ? p : e; b.classList.toggle('on', on); b.querySelector('span').textContent = on ? 'Not ready' : 'Ready'; });
    const cv = r.querySelector('.rs-cover');
    if (cv) { cv.querySelector('b').textContent = e ? 'Opponent is ready' : 'Opponent is choosing...'; cv.querySelector('b').className = e ? 'on' : ''; cv.querySelector('.d').className = 'd' + (e ? '' : ' off'); }
    const tr = r.querySelector('.ts-ready');
    if (tr) {
      const t = qb ? (both ? ['Both teams are ready', 'on'] : ['', '']) : (both ? ['Both ready - starting...', 'on'] : p ? ['Waiting for your opponent to be ready', 'on'] : ['', '']);
      tr.textContent = t[0]; tr.className = 'ts-ready ' + t[1];
    }
  };

  const STATIC = [
    { cap: 'SABİT · QUICK BATTLE · hiçbiri hazır değil', mode: 'qb', p: 0, e: 0 },
    { cap: 'SABİT · QUICK BATTLE · Player hazır, Enemy bekleniyor', mode: 'qb', p: 1, e: 0 },
    { cap: 'SABİT · QUICK BATTLE · ikisi hazır (birleşti, START yanıyor)', mode: 'qb', p: 1, e: 1 },
    { cap: 'SABİT · MULTIPLAYER · ikisi hazır', mode: 'mp', p: 1, e: 1 },
  ];
  const bg = MK.bg('proving-grounds');
  const build = (v) => (host) => {
    const first = host.children.length;
    void first;
    const f = MK.addFrame(host, {
      cap: 'TIKLANABİLİR · Ready düğmelerine bas (tekrar basınca geri alır)', bg, state: { mode: 'qb', p: 0, e: 0 },
      render: (ui, fr) => { ui.innerHTML = render(v, fr.state); },
    });
    const tb = document.createElement('div');
    tb.className = 'rs2-tb';
    tb.innerHTML = '<button data-m="qb" class="on">Quick Battle</button><button data-m="mp">Multiplayer</button><button data-a="reset">Reset</button><button data-a="auto">Her ikisi hazır</button>';
    f.cell.insertBefore(tb, f.cell.querySelector('.mk-zoom'));
    const reset = () => { f.state.p = 0; f.state.e = 0; sync(f, v); };
    tb.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.m) {
        f.state = { mode: b.dataset.m, p: 0, e: 0 };
        clearTimeout(f.t1); clearTimeout(f.t2);
        f.redraw();
        tb.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
      } else if (b.dataset.a === 'reset') reset();
      else { f.state.p = 1; f.state.e = 1; sync(f, v); }
    });
    f.ui.addEventListener('click', (ev) => {
      const b = ev.target.closest('.rb .el-btn');
      if (!b) return;
      const k = b.dataset.s;
      f.state[k] = f.state[k] ? 0 : 1;
      sync(f, v);
    });
    STATIC.forEach((s) => {
      const g = MK.addFrame(host, { cap: s.cap, bg, render: (ui) => { ui.innerHTML = render(v, { ...s, fixed: true }); } });
      g.cell.classList.add('rs2-static');
    });
  };

  const NOTE = {
    cur: 'Bugünkü hâl: ortada düz VS, hazır olunca yalnızca sağ altta küçük düz yazı ("Both teams are ready"); START hazır olunca açılır. Karşılaştırma için.',
    v1: 'Ember bar (eski V3 cilalı): iki yarı çubuk dıştan ortaya kor dolar, önde parlayan uç. İkisi ortada buluşunca ortadaki elmas patlayıp tutuşur, çubuk bütün kor çerçeve alır, START yanar.',
    v2: 'Zincir: iki yarı zincir, halka halka (dıştan içe) kordan altına ısınır; uçtaki iki büyük halka ortada birbirine geçer ("klink" + kıvılcım), zincir gerilip kilitlenir. START yanar.',
    v3: 'Kılıçlar: iki kılıç kendi taraflarından uzanır (kabzadan uca doğru parlar), uçlar ortada birbirine değer. İkisi hazır olunca ileri atılıp çapraz kesişir, kesişimde kor elmas + kıvılcım. START yanar.',
    v4: 'Kalkan: iki yarım kalkan kenarlardan ortaya kayarken içi alttan kor dolar. İkisi gelince tek kalkan olur, dikişte altın çizgi ve kor elmas yanar. START yanar.',
    v5: 'Fitil: iki yandan fitil yanar (öndeki kıvılcım), ortadaki mangala ulaşınca mangalda küçük alev; ikinci fitil de varınca mangal tam alev alır ve patlar. START yanar.',
  };
  const TITLE = { cur: 'Current (oyunun bugünkü hâli)', v1: 'V1 · Kor çubuğu', v2: 'V2 · Zincir', v3: 'V3 · Kılıçlar', v4: 'V4 · Kalkan', v5: 'V5 · Fitil + mangal' };
  const TAB = { cur: 'Current', v1: 'V1 Kor', v2: 'V2 Zincir', v3: 'V3 Kılıç', v4: 'V4 Kalkan', v5: 'V5 Fitil' };

  MK.onApply = () => {
    const z = Math.min(1, (window.innerWidth - 44) / (MK.S.phone ? 844 : 1600));
    document.querySelectorAll('.rs2-static .mk-zoom').forEach((e) => { e.style.zoom = String(z * 0.5); });
  };
  MK.mount({
    title: 'Ready state v2',
    sections: ['cur', 'v1', 'v2', 'v3', 'v4', 'v5'].map((v) => ({ id: v, tab: TAB[v], h: TITLE[v], note: NOTE[v], build: build(v) })),
  });
})();
