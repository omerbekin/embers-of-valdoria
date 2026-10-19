/* Valor penceresi taslagi: oyun kodu DEGIL. Metinler / sayilar oyundan: data/valor.json (cap 8, mangal basina 4 kor, savas disi diriltme 4, savasta 6, %50 can),
   src/ui/valor-braziers.ts (valorTip, "No hero has fallen. Keep your embers for the battles ahead.", "Revive · 4", "X rises again."). */
(function () {
  const { esc, tip } = MK;
  const COST = 4, BATTLE = 6, CAP = 8, HP = 50;
  const HEROES = [
    { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 4 },
    { id: 'archer', name: 'Archer', role: 'Marksman', lv: 4 },
    { id: 'druid', name: 'Druid', role: 'Nature Summoner', lv: 3 },
    { id: 'mage', name: 'Mage', role: 'Elemental Mage', lv: 3 },
  ];
  const H = (id) => HEROES.find((h) => h.id === id);
  const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M6 9h12"/></svg>';
  const STATES = [
    { key: 'a', cap: 'Two fallen · Valor 6 of 8 (enough: click Revive)', valor: 6, fallen: ['warrior', 'archer'] },
    { key: 'b', cap: 'One fallen · Valor 2 of 8 (not enough)', valor: 2, fallen: ['archer'] },
    { key: 'c', cap: 'No hero has fallen · Valor 5 of 8', valor: 5, fallen: [] },
  ];

  /* ---------- parcalar ---------- */
  const meter = (v, h, readyAt = COST) => {
    const brs = [0, 1].map((i) => {
      const lit = Math.max(0, Math.min(4, v - 4 * i));
      const ready = lit >= 4 && v >= readyAt;
      return `<span class="vl-br${ready ? ' on' : ''}"><img class="vl-img" src="${MK.brazier('brazier-' + lit)}" alt=""><img class="vl-flame" src="${MK.brazier('brazier-ready')}" alt=""></span>`;
    }).join('');
    return `<span class="vl-meter${v >= readyAt ? ' vl-ready' : ''}" style="--vl-h:${h}px"><span class="vl-brs">${brs}</span></span>`;
  };
  const valorTip = (v) =>
    tip({ kind: 'Outside battle', title: 'Valor', icon: MK.brazier('brazier-ready'), value: `${v}/${CAP}`, valueLabel: 'embers',
      lines: [`Win battles to light more embers (+1, +2 elite, +3 boss).`, `A revive costs ${COST} embers outside battle and ${BATTLE} in battle (the gold notch).`, `The fallen hero rises with ${HP}% HP.`] });
  const reviveTip = (h, v) =>
    tip({ kind: 'Revive', title: h.name, icon: MK.av(h.id), iconShape: 'portrait', value: `${COST}`, valueLabel: 'embers',
      lines: v >= COST ? [`Rises again with ${HP}% HP.`] : [`Rises again with ${HP}% HP.`, `Needs ${COST} embers (you have ${v}).`] });
  const face = (h) => `<span class="vv-face"><img src="${MK.av(h.id)}" alt=""><i class="cross">${CROSS}</i></span>`;

  function revive(f, id) {
    const s = f.state;
    if (s.valor < COST) return;
    s.valor -= COST;
    s.fallen = s.fallen.filter((x) => x !== id);
    s.sel = null;
    s.msg = `${H(id).name} rises again.`;
    f.redraw();
  }
  const wire = (f, root) => {
    root.querySelectorAll('[data-rev]').forEach((b) => b.addEventListener('click', () => revive(f, b.dataset.rev)));
    root.querySelectorAll('[data-sel]').forEach((b) => b.addEventListener('click', () => { f.state.sel = f.state.sel === b.dataset.sel ? null : b.dataset.sel; f.redraw(); }));
    root.querySelectorAll('[data-act="go"]').forEach((b) => b.addEventListener('click', () => revive(f, f.state.sel)));
  };
  const fresh = (st) => ({ valor: st.valor, fallen: st.fallen.slice(), sel: null, msg: '' });

  /* ---------- MEVCUT HAL (birebir: valor-braziers.ts > openValorRevive) ---------- */
  const curUi = (ui, f) => {
    const s = f.state;
    const note = s.fallen.length ? `Spend ${COST} embers to raise a fallen hero with ${HP}% HP. Outside battle a revive is cheaper than in battle (${BATTLE}).` : 'No hero has fallen. Keep your embers for the battles ahead.';
    ui.innerHTML = `<div class="el-dialog el-modal vl-overlay"><div class="el-panel corners el-modal-panel vl-panel"><h2 class="el-title vl-title">Valor</h2>
      <div class="vl-meter-box">${meter(s.valor, 64)}</div><p class="vl-note">${esc(note)}</p>
      <div class="vl-list">${s.fallen.map((id) => `<div class="vl-row"><img class="vl-face" src="${MK.av(id)}" alt=""><div class="vl-who"><span class="vl-name">${H(id).name}</span><span class="vl-sub">Fallen</span></div><button class="el-btn vl-go" type="button" data-rev="${id}" ${s.valor < COST ? 'disabled' : ''} title="${s.valor < COST ? `Needs ${COST} Valor (you have ${s.valor})` : `Spend ${COST} Valor`}">Revive · ${COST}</button></div>`).join('')}</div>
      <p class="vl-msg">${esc(s.msg)}</p><div class="el-row"><button class="el-btn primary" type="button">Close</button></div></div></div>`;
    wire(f, ui);
  };

  /* ---------- V1 Plates ---------- */
  const v1Ui = (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const plates = s.fallen.map((id) => {
      const h = H(id);
      return `<div class="vv-plate">${face(h)}<div class="vv-who"><div class="vv-name">${h.name}</div><div class="vv-chips"><span class="k-chip dim"><img src="${MK.cls(h.id)}" alt="">${h.role}</span><span class="k-chip">Lv <b>${h.lv}</b></span><span class="k-chip bad">Fallen</span></div></div>
        <div class="vv-rev k-tipwrap"><span class="vv-cost${can ? '' : ' low'}"><img src="${MK.brazier('brazier-4')}" alt="">${COST}</span><button class="el-btn" type="button" data-rev="${id}" ${can ? '' : 'disabled'}>Revive</button><div class="k-tip" style="left:auto;right:0;transform:none">${reviveTip(h, s.valor)}</div></div></div>`;
    }).join('');
    ui.innerHTML = `<div class="vv-ov el-modal"><div class="el-panel corners el-modal-panel vv-panel"><h2 class="el-title">Valor</h2>
      <div class="vv-meterrow k-tipwrap">${meter(s.valor, 72)}<span class="vv-count${s.valor >= COST ? ' ready' : ''}"><b>${s.valor}</b> / ${CAP}</span><div class="k-tip">${valorTip(s.valor)}</div></div>
      <div class="vv-div"></div>
      <div class="vv-list">${plates || '<div class="vv-empty">No hero has fallen. Keep your embers for the battles ahead.</div>'}</div>
      <div class="vv-foot"><span class="vv-msg">${esc(s.msg)}</span><button class="el-btn primary" type="button">Close</button></div></div></div>`;
    wire(f, ui);
  };

  /* ---------- V2 Roll call ---------- */
  const v2Ui = (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const cards = HEROES.map((h) => {
      const fallen = s.fallen.includes(h.id);
      const sel = s.sel === h.id;
      const bar = fallen ? `<div class="k-bar"><span>Fallen</span></div>` : `<div class="k-bar hp"><i style="width:100%"></i><span>${h.id === 'druid' ? 76 : 94}</span></div>`;
      return `<div class="vv-card k-tipwrap ${fallen ? 'fallen' : 'alive'}${sel ? ' sel' : ''}" ${fallen ? `data-sel="${h.id}"` : ''}><div class="pf"><img src="${MK.av(h.id)}" alt=""><span class="lv">Lv ${h.lv}</span>${fallen ? `<i class="cross">${CROSS}</i>` : ''}</div><div class="nm">${h.name}</div>${bar}${fallen ? `<div class="k-tip">${reviveTip(h, s.valor)}</div>` : ''}</div>`;
    }).join('');
    const hasF = s.fallen.length > 0;
    const sel = s.sel && s.fallen.includes(s.sel);
    ui.innerHTML = `<div class="vv-ov el-modal"><div class="el-panel corners el-modal-panel vv-panel" style="width:min(720px,100%)"><h2 class="el-title">Valor</h2>
      <div style="height:18px"></div><div class="vv-roll">${cards}</div>
      <div class="vv-msg" style="margin-top:12px">${hasF ? esc(s.msg) || '&nbsp;' : 'No hero has fallen.'}</div>
      <div class="vv-roll-foot">${hasF ? '<button class="el-btn" type="button">Close</button>' : '<span></span>'}
        <span class="mid k-tipwrap">${meter(s.valor, 46)}<span class="vv-count${can ? ' ready' : ''}"><b>${s.valor}</b> / ${CAP}</span><div class="k-tip" style="top:auto;bottom:calc(100% + 8px)">${valorTip(s.valor)}</div></span>
        ${hasF ? `<button class="el-btn primary${sel && can ? ' ready' : ''}" type="button" data-act="go" ${sel && can ? '' : 'disabled'}>Revive · ${COST}</button>` : '<button class="el-btn primary" type="button">Close</button>'}</div></div></div>`;
    wire(f, ui);
  };

  /* ---------- V3 Band ---------- */
  const v3Ui = (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const rows = s.fallen.map((id) => {
      const h = H(id);
      return `<div class="vv-row">${face(h)}<div class="vv-who"><div class="vv-name">${h.name}</div><div class="vv-chips"><span class="k-chip dim"><img src="${MK.cls(h.id)}" alt="">${h.role}</span><span class="k-chip bad">Fallen</span></div></div>
        <span class="k-tipwrap"><button class="el-btn${can ? ' primary' : ''}" type="button" data-rev="${id}" ${can ? '' : 'disabled'}>Revive · ${COST}</button><span class="k-tip" style="left:auto;right:0;transform:none">${reviveTip(h, s.valor)}</span></span></div>`;
    }).join('');
    const head = tip({ kind: 'Outside battle', title: 'Valor', icon: MK.brazier('brazier-ready'), value: `${s.valor}/${CAP}`, valueLabel: 'embers',
      chips: [{ text: 'revive outside battle', tone: 'v', num: String(COST) }, { text: 'revive in battle', tone: 'v', num: String(BATTLE) }, { text: 'HP on return', tone: 'v', num: HP + '%' }] });
    const inner = head.replace(/^<div class="bt"[^>]*>/, '').replace(/<\/div>$/, '');
    ui.innerHTML = `<div class="vv-ov el-modal"><div class="bt vv-band">${inner}<div class="bt-div"></div><div class="vv-bandmeter">${meter(s.valor, 64)}</div>
      ${rows ? `<div class="vv-rows" style="padding:0 14px">${rows}</div>` : '<div class="vv-none" style="padding:6px 18px 14px">No hero has fallen. Keep your embers for the battles ahead.</div>'}
      <div class="vv-foot"><span class="vv-msg">${esc(s.msg)}</span><button class="el-btn primary" type="button">Close</button></div></div></div>`;
    wire(f, ui);
  };

  const mkFrames = (render) => (host) => STATES.forEach((st) => MK.addFrame(host, { cap: st.cap, bg: MK.bg('valdoria'), state: fresh(st), render }));

  MK.mount({
    title: 'Valor window',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (birebir)', note: 'Oyundaki pencere: ortada başlık, mangallar, <b>italik açıklama paragrafı</b>, çıplak satırlar (soluk portre + italik "Fallen" + "Revive · 4"). Soldaki iki örnekte Revive çalışır.', build: mkFrames(curUi) },
      { id: 'v1', tab: 'V1 Plates', h: 'V1 · Plates', note: 'Düşen kahraman = Gear plakası dilinde plaka (portre + haç, Cinzel ad, tek satır çip, sağda mangal maliyeti + Revive); açıklama paragrafı yok, bilgi mangala ve düğmeye hover ile A Band ipucunda.', build: mkFrames(v1Ui) },
      { id: 'v2', tab: 'V2 Roll call', h: 'V2 · Roll call', note: 'Tüm parti kartlarla görünür; düşenler soluk + haçlı, tıklayınca seçilir (kor elmaslı çerçeve), birincil "Revive · 4" en sağda, Close solda; kimse düşmediyse yalnızca Close.', build: mkFrames(v2Ui) },
      { id: 'v3', tab: 'V3 Band', h: 'V3 · Band', note: 'Pencerenin kendisi A Band ipucu dilinde: sol medalyon mangal, sağda "6/8", maliyet çipleri (4 / 6 / %50); mangallar ortada, düşenler satır halinde; en sağda kor elmaslı birincil.', build: mkFrames(v3Ui) },
    ],
  });
})();
