/* Hazir durumu v3b taslagi: oyun kodu DEGIL. Sahne/kit rs2.js'ten; veri team-select/data.js. 1920x1080 oyun birimi. */
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
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

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
    const chip = o.chip ? '<span class="rs3-chip"></span>' : '';
    const hd = `<div class="rs-hd"><span class="dia${o.dia ? '' : ' off'}"></span><span class="nm${o.dia ? ' on' : ''}">${o.name}</span>${ct}${chip}<span class="grow"></span>${stepper}</div>`;
    const cover = o.hidden ? `<div class="rs-cover"><span class="d${o.opp ? '' : ' off'}"></span><b class="${o.opp ? 'on' : ''}">${o.opp ? 'Opponent is ready' : 'Opponent is choosing...'}</b><span>Opponent's team is revealed when the battle starts</span></div>` : '';
    const acts = o.acts ? `<div class="rs-acts">Random <u>◆</u> Clear</div>` : '';
    const fx = e ? 0 : 516 - CELL;
    return `<div class="rs-side ${side}" style="left:${e ? 1320 : 84}px">${hd}<div class="rs-front" style="left:${fx}px">Front</div><div class="rs-grid">${cells}</div>${cover}${acts}${o.extra || ''}</div>`;
  };

  /* ---- ortak: patlama + yazi ---- */
  const BURST = (y) => `<div class="bst" style="top:${y}px"><i class="rg"></i>${Array.from({ length: 10 }, (_, i) => `<u style="--a:${i * 36}deg"></u>`).join('')}</div>`;
  const capText = (st) => {
    const qb = st.mode === 'qb', p = !!st.p, e = !!st.e;
    if (p && e) return 'Both ready';
    if (p) return qb ? 'Waiting for Enemy' : 'Waiting for Opponent';
    if (e) return qb ? 'Waiting for Player' : 'Opponent is ready';
    return '';
  };
  const CAP = (st) => `<div class="rs3-cap${(st.p || st.e) ? ' on' : ''}"><i></i><b>${capText(st)}</b><i></i></div>`;

  /* ---- V6 mandal ---- */
  const HASP = '<div class="hasp"><i class="bar"></i><i class="ring"></i></div>';
  /* ---- V7 cember ---- */
  const RING = () => `<svg class="ringfx" viewBox="0 0 1920 1080" preserveAspectRatio="none">
<ellipse class="glow" cx="960" cy="600" rx="930" ry="108"/>
<ellipse class="base" cx="960" cy="600" rx="930" ry="108"/>
<ellipse class="tick" cx="960" cy="600" rx="930" ry="108"/>
<ellipse class="tick in" cx="960" cy="600" rx="880" ry="96"/>
<g class="lit l"><path pathLength="1" d="M30 600 A930 108 0 0 1 960 492"/><path pathLength="1" d="M30 600 A930 108 0 0 0 960 708"/></g>
<g class="lit r"><path pathLength="1" d="M1890 600 A930 108 0 0 0 960 492"/><path pathLength="1" d="M1890 600 A930 108 0 0 1 960 708"/></g>
<ellipse class="rip" cx="960" cy="600" rx="930" ry="108"/>
</svg>`;
  /* ---- V8 ferman ---- */
  const SEAL = (s) => `<div class="slot ${s}"><div class="wx"><i></i></div><em class="who"></em></div>`;
  const SCROLL = () => `<div class="scr"><i class="rod t"></i><div class="par"><span class="hd">VS</span><u></u><u></u><u></u><div class="rib l"></div><div class="rib r"></div><i class="kn"></i>${SEAL('l')}${SEAL('r')}</div><i class="rod b"></i></div>`;
  /* ---- V9 vitray ---- */
  const GL = (() => {
    const R = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
    const f = (n) => n.toFixed(1);
    const sec = (r0, r1, a0, a1) => {
      const p = [R(r1, a0), R(r1, a1), R(r0, a1), R(r0, a0)];
      return `M${f(p[0][0])} ${f(p[0][1])}A${r1} ${r1} 0 0 1 ${f(p[1][0])} ${f(p[1][1])}L${f(p[2][0])} ${f(p[2][1])}A${r0} ${r0} 0 0 0 ${f(p[3][0])} ${f(p[3][1])}Z`;
    };
    const COL = ['#e0702a', '#ffb35a', '#b8480f', '#f3d999', '#c9531a', '#ffd070'];
    let out = '';
    [[84, 128, 12, 0], [40, 80, 12, 15]].forEach(([r0, r1, n, off], ring) => {
      for (let i = 0; i < n; i++) {
        const a0 = ((i * 360) / n + off + 1.5) * Math.PI / 180, a1 = (((i + 1) * 360) / n + off - 1.5) * Math.PI / 180;
        const am = (a0 + a1) / 2, left = Math.cos(am) < 0;
        const ext = left ? Math.PI : 0;
        let d = Math.abs(am - ext) % (Math.PI * 2);
        d = Math.min(d, Math.PI * 2 - d);
        out += `<path class="pc ${left ? 'l' : 'r'}" style="--c:${COL[(i + ring * 2) % COL.length]};--d:${(d / Math.PI * 1.4 + ring * 0.15).toFixed(2)}" d="${sec(r0, r1, a0, a1)}"/>`;
      }
    });
    return out;
  })();
  const WINDOW = () => `<div class="wlt"></div><div class="rays"></div><svg class="rose" viewBox="-140 -140 280 280"><circle class="rim" r="136"/><circle class="rim2" r="132"/>${GL}<circle class="hub" r="32"/><circle class="lead" r="82"/><circle class="lead" r="38"/></svg>`;
  /* ---- V10 run cercevesi ---- */
  const RUNES = ['M2 0V20M2 6L11 1M2 11L11 6', 'M2 20V0L10 8V20', 'M2 0V20M2 5L10 10L2 15', 'M2 0V20M2 4L10 9M2 10L10 15', 'M2 0V20M2 1H8L10 5L8 9H2L10 20', 'M10 2L2 10L10 18', 'M2 2L10 18M10 2L2 18', 'M2 0V20M2 1L10 6L2 11', 'M2 0V20M10 0V20M2 7L10 13', 'M6 0V20M2 7L10 13', 'M6 0V20', 'M3 4L9 9L3 14', 'M2 0V20M2 2L10 7L2 12L10 17L2 20', 'M2 20V0L6 8L10 0V20', 'M6 20V0L10 4', 'M2 2L6 10L2 18L10 18L6 10L10 2Z'];
  const FRAME = () => {
    const m = 24, x0 = m, x1 = 1920 - m, y0 = m, y1 = 1080 - m, ym = 540, step = 56;
    const pts = [];
    const chain = (a, mir, up) => {
      const yv = up ? y0 : y1, len1 = Math.abs(ym - yv), len2 = 960 - x0, tot = len1 + len2;
      for (let s = 0; s < tot - 30; s += step) {
        let x, y;
        if (s <= len1) { x = x0; y = ym + (up ? -s : s); } else { x = x0 + (s - len1); y = yv; }
        pts.push({ x: mir ? 1920 - x : x, y, s: s / tot, side: a });
      }
    };
    chain('l', false, true); chain('l', false, false); chain('r', true, true); chain('r', true, false);
    const runes = pts.map((p, i) => `<g class="rn ${p.side}" style="--d:${p.s.toFixed(2)}" transform="translate(${p.x.toFixed(0)} ${p.y.toFixed(0)})"><path d="${RUNES[(i * 7 + (i >> 2)) % RUNES.length]}" transform="translate(-6 -10)"/></g>`).join('');
    const cor = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => `<rect class="cd" x="${x - 9}" y="${y - 9}" width="18" height="18" transform="rotate(45 ${x} ${y})"/>`).join('');
    return `<svg class="runes" viewBox="0 0 1920 1080"><rect class="ln" x="9" y="9" width="1902" height="1062"/>${runes}${cor}</svg><div class="fglow"></div>`;
  };

  const V = {
    cur: { arena: () => '<div class="rs-vsl l" style="top:140px;left:208px"></div><div class="rs-vsl r" style="top:140px;left:402px"></div><div class="rs-vs" style="left:340px;top:140px">VS</div>' },
    v6: { arena: (st) => `${CAP(st)}<div class="pin"><i></i></div>${BURST(164)}`, extra: HASP },
    v7: { back: RING, arena: (st) => `${CAP(st)}${BURST(168)}` },
    v8: { arena: (st) => `${CAP(st)}${SCROLL()}${BURST(150)}` },
    v9: { arena: (st) => `${CAP(st)}${WINDOW()}${BURST(161)}` },
    v10: { front: FRAME, arena: (st) => `${CAP(st)}<div class="rs-vs rs3-vs" style="left:340px;top:168px">VS</div>${BURST(168)}` },
  };

  const names = (qb) => (qb ? ['Player', 'Enemy'] : ['You', 'Opponent']);
  const render = (v, st) => {
    const qb = st.mode === 'qb', [L, R] = names(qb);
    const p = !!st.p, e = !!st.e, both = p && e, cur = v === 'cur', d = V[v];
    const cls = `mk-stage ts-stage rs-stage rs2-stage rs3-stage v-${v}${qb ? '' : ' mp'}${p ? ' p-on' : ''}${e ? ' e-on' : ''}${both && !cur ? ' joined' : ''}${both ? ' armed' : ''}${st.fixed ? ' nofx' : ''}`;
    const pb = board('p', PL, { name: L === 'You' ? 'You' : 'Player', dia: true, count: '4 / 4', stepper: qb, acts: qb, chip: !cur, extra: d.extra });
    const eb = board('e', qb ? EN : [], { name: R, dia: false, count: qb ? '4 / 4' : '', stepper: qb, acts: qb, hidden: !qb, opp: e, chip: !cur, extra: d.extra });
    const labels = cur ? `<div class="rs2-cp l"><span>${L}</span><span class="s"></span></div><div class="rs2-cp r"><span>${R}</span><span class="s"></span></div>` : '';
    const arena = `<div class="rs2-a">${labels}${d.arena(st)}</div>`;
    const rb = (s, who, on) => `<div class="rb ${s === 'p' ? 'l' : 'r'}"><button class="el-btn${on ? ' on' : ''}" data-s="${s}" type="button"><small>${who}</small><span>${on ? 'Not ready' : 'Ready'}</span></button></div>`;
    const btns = `<div class="rs-btns rs2-btns">${cur ? '<div class="ts-ready"></div>' : ''}<button class="el-btn primary rs2-start${both ? ' ready' + (cur ? '' : ' rs-fire') : ''}" type="button">Start battle</button></div>`;
    return `<div class="${cls}"><div class="ts-shade"></div>${d.back ? d.back() : ''}<div class="rs-title">${qb ? 'Quick Battle' : 'Multiplayer'}</div>${pb}${eb}${arena}${d.front ? d.front() : ''}${rb('p', L, p)}${rb('e', R, e)}${strip(qb ? 'defender' : 'mage')}${roster(qb ? 'defender' : 'mage')}${btns}</div>`;
  };

  const FILL_MS = REDUCED ? 0 : 1300, ARM_MS = REDUCED ? 0 : 600;
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
    const cp = r.querySelector('.rs3-cap');
    if (cp) { cp.querySelector('b').textContent = capText(st); cp.classList.toggle('on', p || e); }
  };

  const STATIC = [
    { cap: 'SABİT · QUICK BATTLE · hiçbiri hazır değil', mode: 'qb', p: 0, e: 0 },
    { cap: 'SABİT · QUICK BATTLE · Player hazır, Enemy bekleniyor', mode: 'qb', p: 1, e: 0 },
    { cap: 'SABİT · QUICK BATTLE · ikisi hazır (birleşti, START yanıyor)', mode: 'qb', p: 1, e: 1 },
    { cap: 'SABİT · MULTIPLAYER · rakip hazır, sen değilsin ("Opponent is ready")', mode: 'mp', p: 0, e: 1 },
    { cap: 'SABİT · MULTIPLAYER · ikisi hazır', mode: 'mp', p: 1, e: 1 },
  ];
  const bg = MK.bg('proving-grounds');
  const build = (v) => (host) => {
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
    cur: 'Bugünkü hâl: ortada düz VS, hazır olunca yalnızca sağ altta küçük düz yazı; START hazır olunca açılır. Karşılaştırma için.',
    v6: "Mandal: Ready'ye basan tahta ortaya doğru kayar ve iç kenarından demir bir mandal uzanır. İkisi hazır olunca tahtalar tam yaklaşır, mandal halkaları üst üste biner ve ortadan kor bir çivi iner. Kapı kilitlenir, START yanar.",
    v7: 'Düello çemberi: yere, iki takımın altından geçen geniş bir çember çizilir. Her taraf çemberi kendi yan ucundan başlatır, çizgi üstten ve alttan ortaya doğru akar. İkisi hazır olunca çember kapanır, içi kor gibi parlar ve bir dalga yayılır. START yanar.',
    v8: "Mühür fermanı: ortada eski bir parşömen. Ready'ye basan taraf kendi mührünü (balmumu) parşömene basar ve altın kordon o taraftan ortaya uzanır. İki kordon ortada düğümlenince ferman parlar. START yanar.",
    v9: 'Vitray: ortada gül penceresi. Her taraf kendi yarısının camlarını dıştan içe tek tek yakar. İkisi de bitince ortadaki göbek yanar, camdan ışık huzmeleri çıkar. START yanar.',
    v10: 'Rün çerçevesi: ekranın dört kenarını saran çerçevede oyulu rünler var. Her taraf kendi orta kenarından başlayıp rünleri üste ve alta doğru yakar; iki zincir üstte ve altta ortada buluşunca çerçevenin kenarı kor gibi tutuşur, köşe elmasları yanar. START yanar.',
  };
  const TITLE = { cur: 'Current (oyunun bugünkü hâli)', v6: 'V6 · Kapı mandalı', v7: 'V7 · Düello çemberi', v8: 'V8 · Mühür fermanı', v9: 'V9 · Gül vitray', v10: 'V10 · Rün çerçevesi' };
  const TAB = { cur: 'Current', v6: 'V6 Mandal', v7: 'V7 Çember', v8: 'V8 Ferman', v9: 'V9 Vitray', v10: 'V10 Rün' };

  MK.onApply = () => {
    const z = Math.min(1, (window.innerWidth - 44) / (MK.S.phone ? 844 : 1600));
    document.querySelectorAll('.rs2-static .mk-zoom').forEach((e) => { e.style.zoom = String(z * 0.5); });
  };
  MK.mount({
    title: 'Ready state v3b',
    sections: ['cur', 'v6', 'v7', 'v8', 'v9', 'v10'].map((v) => ({ id: v, tab: TAB[v], h: TITLE[v], note: NOTE[v], build: build(v) })),
  });
})();
