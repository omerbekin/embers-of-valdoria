/* Valor penceresi v3 taslagi: oyun kodu DEGIL. Metinler / sayilar oyundan: data/valor.json (cap 8, mangal basina 4 kor, savas disi diriltme 4, savasta 6, %50 can),
   src/ui/valor-braziers.ts ("No hero has fallen. Keep your embers for the battles ahead.", "Revive · 4", "X rises again."). */
(function () {
  const { esc, tip } = MK;
  const COST = 4, BATTLE = 6, CAP = 8, HP = 50, HOLD_MS = 900;
  const HEROES = [
    { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 4 },
    { id: 'archer', name: 'Archer', role: 'Marksman', lv: 4 },
    { id: 'druid', name: 'Druid', role: 'Nature Summoner', lv: 3 },
    { id: 'mage', name: 'Mage', role: 'Elemental Mage', lv: 3 },
  ];
  const H = (id) => HEROES.find((h) => h.id === id);
  const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M6 9h12"/></svg>';
  const DIA = '<i class="vz-dia"></i>';
  const STATES = [
    { cap: 'İki düşmüş · Valor 6 / 8 (yeter: Revive çalışır)', valor: 6, fallen: ['warrior', 'archer'] },
    { cap: 'Bir düşmüş · Valor 2 / 8 (yetmiyor)', valor: 2, fallen: ['archer'] },
    { cap: 'Kimse düşmemiş · Valor 5 / 8', valor: 5, fallen: [] },
  ];
  const fresh = (st) => ({ valor: st.valor, fallen: st.fallen.slice(), sel: null, msg: '' });

  /* ---------- ortak parcalar ---------- */
  const valorTip = (v) =>
    tip({ kind: 'Outside battle', title: 'Valor', icon: MK.brazier('brazier-ready'), value: `${v}/${CAP}`, valueLabel: 'embers',
      lines: ['Win battles to light more embers (+1, +2 elite, +3 boss).', `A revive costs ${COST} embers outside battle and ${BATTLE} in battle.`, `The fallen hero rises with ${HP}% HP.`] });
  const reviveTip = (h, v, hold) =>
    tip({ kind: 'Revive', title: h.name, icon: MK.av(h.id), iconShape: 'portrait', value: `${COST}`, valueLabel: 'embers',
      lines: [`Rises again with ${HP}% HP.`].concat(v >= COST ? (hold ? ['Hold to revive.'] : []) : [`Needs ${COST} embers (you have ${v}).`]) });
  /* tek mangal (idx 0 / 1): 4 kor; hazirsa (4 kor + diriltmaya yeter) alevli gorsel */
  const brz = (v, idx, h, lit0) => {
    const lit = lit0 !== undefined ? lit0 : Math.max(0, Math.min(4, v - 4 * idx));
    const ready = lit >= 4 && v >= COST;
    return `<span class="vl-meter${ready ? ' vl-ready' : ''}" style="--vl-h:${h}"><span class="vl-brs"><span class="vl-br${ready ? ' on' : ''}"><img class="vl-img" src="${MK.brazier('brazier-' + lit)}" alt=""><img class="vl-flame" src="${MK.brazier('brazier-ready')}" alt=""></span></span></span>`;
  };
  const sparks = () => '<div class="vz-sparks">' + Array.from({ length: 16 }, (_, i) => `<i style="left:${(i * 37 + 11) % 100}%;animation-delay:${-((i * 53) % 90) / 10}s;animation-duration:${7 + (i % 5)}s;--dx:${((i * 29) % 40) - 20}px"></i>`).join('') + '</div>';
  const face = (id, cls) => `<span class="${cls}"><img src="${MK.av(id)}" alt=""></span>`;

  function revive(f, id) {
    const s = f.state;
    if (s.valor < COST || !s.fallen.includes(id)) return;
    s.valor -= COST;
    s.fallen = s.fallen.filter((x) => x !== id);
    s.sel = null;
    s.msg = `${H(id).name} rises again.`;
    f.redraw();
  }
  const wireCommon = (f, root) => {
    root.querySelectorAll('[data-sel]').forEach((b) => b.addEventListener('click', () => { f.state.sel = f.state.sel === b.dataset.sel ? null : b.dataset.sel; f.state.msg = ''; f.redraw(); }));
    root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => revive(f, f.state.sel)));
  };
  const closeBtn = (cls) => `<button class="el-btn ${cls || ''}" type="button">Close</button>`;

  /* ======================= V1 SUNAK ======================= */
  const v1 = (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const sel = s.sel && s.fallen.includes(s.sel) ? s.sel : null;
    const cards = s.fallen.map((id) => {
      const h = H(id);
      return `<div class="alt-card k-tipwrap${sel === id ? ' sel' : ''}" data-sel="${id}"><div class="arch"><img src="${MK.av(id)}" alt=""><i class="cross">${CROSS}</i></div>
        <div class="nm">${h.name}</div><div class="rl">${h.role}</div>
        <div class="cs${can ? '' : ' low'}">${DIA}<b>${COST}</b></div><div class="k-tip">${reviveTip(h, s.valor)}</div></div>`;
    }).join('');
    const mid = cards ? `<div class="alt-cards">${cards}</div>` : `<div class="alt-none"><span class="vz-dia big"></span><div class="t1">No hero has fallen.</div><div class="t2">Keep your embers for the battles ahead.</div></div>`;
    ui.innerHTML = `<div class="vz-ov el-modal">${sparks()}<div class="el-panel corners alt-panel"><h2 class="el-title">Valor</h2>
      <div class="alt-body">
        <div class="alt-br k-tipwrap${sel && can ? ' spend' : ''}">${brz(s.valor, 0, 'calc(150px * var(--k) * var(--kb, 1))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
        ${mid}
        <div class="alt-br k-tipwrap">${brz(s.valor, 1, 'calc(150px * var(--k) * var(--kb, 1))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
      </div>
      <div class="alt-ledge"><span class="vz-dia"></span></div>
      <div class="alt-count"><b>${s.valor}</b> / ${CAP} <span>embers</span></div>
      <div class="vz-foot">${s.fallen.length ? closeBtn() : '<span></span>'}<span class="vz-msg">${esc(s.msg)}</span>${s.fallen.length ? `<button class="el-btn primary${sel && can ? ' ready' : ''}" type="button" data-go ${sel && can ? '' : 'disabled'}>Revive · ${COST}</button>` : closeBtn('primary')}</div></div></div>`;
    wireCommon(f, ui);
  };

  /* ======================= V2 NOBET (basili tut) ======================= */
  const v2 = (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const banners = s.fallen.map((id) => {
      const h = H(id);
      return `<div class="bn-wrap k-tipwrap"><span class="rope"></span><div class="bn${can ? ' can' : ''}" data-hold="${id}" tabindex="0" style="--hold:0"><div class="bn-in">
        <div class="pt"><img src="${MK.av(id)}" alt=""><i class="cross">${CROSS}</i><span class="lv">Lv ${h.lv}</span></div>
        <div class="nm">${h.name}</div><div class="rl">${h.role}</div>
        <div class="pill${can ? '' : ' low'}">${DIA}Revive · ${COST}</div><div class="fill"></div></div></div><div class="k-tip">${reviveTip(h, s.valor, true)}</div></div>`;
    }).join('');
    const hang = s.fallen.length
      ? `<div class="vg-hang"><div class="vg-bar"><i></i><i></i></div><div class="vg-banners">${banners}</div></div>`
      : `<div class="vg-hang none"><div class="vg-bar"><i></i><i></i></div><div class="vg-empty"><div class="t1">No hero has fallen.</div><div class="t2">Keep your embers for the battles ahead.</div></div></div>`;
    ui.innerHTML = `<div class="vz-ov el-modal">${sparks()}<div class="vg"><h2 class="el-title">Valor</h2>
      <div class="vg-row">
        <div class="vg-br k-tipwrap">${brz(s.valor, 0, 'calc(130px * var(--k))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
        ${hang}
        <div class="vg-br k-tipwrap">${brz(s.valor, 1, 'calc(130px * var(--k))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
      </div>
      <div class="vg-count"><b>${s.valor}</b> / ${CAP} <span>embers</span></div>
      <div class="vz-foot center"><span class="vz-msg">${esc(s.msg)}</span>${closeBtn('primary')}</div></div></div>`;
    // basili tut
    ui.querySelectorAll('.bn.can').forEach((bn) => {
      let raf = 0, t0 = 0;
      const stop = () => { cancelAnimationFrame(raf); raf = 0; bn.style.setProperty('--hold', '0'); bn.classList.remove('holding'); };
      const step = (t) => {
        const p = Math.min(1, (t - t0) / HOLD_MS);
        bn.style.setProperty('--hold', String(p));
        if (p >= 1) { raf = 0; revive(f, bn.dataset.hold); return; }
        raf = requestAnimationFrame(step);
      };
      bn.addEventListener('pointerdown', (e) => { if (e.button) return; bn.setPointerCapture(e.pointerId); bn.classList.add('holding'); t0 = performance.now(); raf = requestAnimationFrame(step); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => bn.addEventListener(ev, () => { if (raf) stop(); }));
      bn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revive(f, bn.dataset.hold); } });
    });
  };

  /* ======================= V3 RITUEL CEMBERI (surukle) ======================= */
  const v3 = (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const sel = s.sel && s.fallen.includes(s.sel) ? s.sel : null;
    const spendFrom = s.valor - COST; // yanan yuvalardan son 4'u harcanacak
    const sock = Array.from({ length: CAP }, (_, i) => {
      const a = (i / CAP) * 2 * Math.PI - Math.PI / 2;
      const lit = i < s.valor;
      const spend = sel && can && lit && i >= spendFrom;
      return `<i class="sk${lit ? ' lit' : ''}${spend ? ' spend' : ''}" style="--x:${(Math.cos(a) * 50).toFixed(2)}%;--y:${(Math.sin(a) * 50).toFixed(2)}%"></i>`;
    }).join('');
    const center = sel
      ? `<div class="rg-hero${can ? '' : ' low'}" data-sel="${sel}"><img src="${MK.av(sel)}" alt=""></div>`
      : `<div class="rg-glyph"><span class="vz-dia big"></span></div>`;
    const pill = sel ? `<button class="rg-go el-btn primary${can ? ' ready' : ''}" type="button" data-go ${can ? '' : 'disabled'}>Revive · ${COST}</button>` : '';
    const tokens = s.fallen.filter((id) => id !== sel).map((id) => {
      const h = H(id);
      return `<div class="tk k-tipwrap" data-drag="${id}" data-sel="${id}">${face(id, 'pf')}<i class="cross">${CROSS}</i><div class="nm">${h.name}</div><div class="k-tip">${reviveTip(h, s.valor)}</div></div>`;
    }).join('');
    const none = !s.fallen.length;
    ui.innerHTML = `<div class="vz-ov el-modal">${sparks()}<div class="rg"><h2 class="el-title">Valor</h2>
      <div class="rg-mid">
        <div class="rg-br k-tipwrap">${brz(s.valor, 0, 'calc(110px * var(--k))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
        <div class="rg-ring k-tipwrap" data-ring><i class="o1"></i><i class="o2"></i>${sock}${center}${pill}<div class="k-tip" style="top:auto;bottom:calc(100% + 10px)">${valorTip(s.valor)}</div></div>
        <div class="rg-br k-tipwrap">${brz(s.valor, 1, 'calc(110px * var(--k))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
      </div>
      <div class="rg-tokens">${none ? '<div class="rg-none"><span class="t1">No hero has fallen.</span><span class="t2">Keep your embers for the battles ahead.</span></div>' : tokens || '<span class="rg-none"><span class="t2">&nbsp;</span></span>'}</div>
      <div class="vz-foot center"><span class="vz-msg">${esc(s.msg)}</span>${closeBtn('primary')}</div></div></div>`;
    // surukle-birak (fare + dokunma): ayni zamanda tik = sec
    const fr = f.frame;
    const ring = ui.querySelector('[data-ring]');
    ui.querySelectorAll('[data-drag]').forEach((tk) => {
      let ghost = null, sx = 0, sy = 0, moved = false;
      const zoomOf = () => fr.getBoundingClientRect().width / fr.offsetWidth;
      const place = (e) => {
        const r = fr.getBoundingClientRect(), z = zoomOf();
        ghost.style.left = (e.clientX - r.left) / z + 'px';
        ghost.style.top = (e.clientY - r.top) / z + 'px';
        const rr = ring.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (rr.left + rr.width / 2), e.clientY - (rr.top + rr.height / 2));
        ring.classList.toggle('over', d < rr.width / 2);
      };
      tk.addEventListener('pointerdown', (e) => { if (e.button) return; sx = e.clientX; sy = e.clientY; moved = false; tk.setPointerCapture(e.pointerId); e.preventDefault(); });
      tk.addEventListener('pointermove', (e) => {
        if (!(e.buttons & 1) && e.pointerType === 'mouse') return;
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
        if (!moved) { moved = true; ghost = document.createElement('div'); ghost.className = 'rg-ghost'; ghost.innerHTML = `<img src="${MK.av(tk.dataset.drag)}" alt="">`; ui.append(ghost); tk.classList.add('dragging'); }
        place(e);
      });
      const end = (e) => {
        if (moved) {
          const over = ring.classList.contains('over');
          ghost.remove(); ring.classList.remove('over'); tk.classList.remove('dragging');
          if (over) { if (f.state.valor >= COST) revive(f, tk.dataset.drag); else { f.state.msg = `Needs ${COST} embers (you have ${f.state.valor}).`; f.redraw(); } }
          tk._skip = true;
          moved = false;
        }
      };
      tk.addEventListener('pointerup', end);
      tk.addEventListener('pointercancel', end);
      // sürüklemeden sonra gelen click secimi tetiklemesin
      tk.addEventListener('click', (e) => { if (tk._skip) { e.stopImmediatePropagation(); tk._skip = false; } }, true);
    });
    wireCommon(f, ui);
  };

  const mkFrames = (render) => (host) => STATES.forEach((st) => MK.addFrame(host, { cap: st.cap, bg: MK.bg('valdoria'), state: fresh(st), render }));

  MK.mount({
    title: 'Valor window v3',
    sections: [
      { id: 'v1', tab: 'V1 Sunak', h: 'V1 · Sunak', note: 'İki büyük mangal iki yanda; ortada taş kemerli düşmüş kahraman kartları (altında kor bedeli). Karta bas: seçilir, sol mangal "harcanacak" diye parlar; sağ altta Revive · 4.', build: mkFrames(v1) },
      { id: 'v2', tab: 'V2 Nöbet', h: 'V2 · Nöbet', note: 'Kutusuz: çubuktan sarkan sancaklar. Sancağa BASILI TUT (≈1 sn): kor alttan yükselir, kahramanın rengi geri gelir, kalkar. Yetmiyorsa sancak soluk, ipucu "Needs 4 embers".', build: mkFrames(v2) },
      { id: 'v3', tab: 'V3 Çember', h: 'V3 · Ritüel çemberi', note: 'Ortada 8 kor yuvalı çember (yanan yuva sayısı = Valor). Düşen kahramanı çembere SÜRÜKLE ya da dokunup seç, çemberdeki Revive · 4\'e dokun. Seçilince harcanacak 4 yuva parlar.', build: mkFrames(v3) },
    ],
  });
})();
