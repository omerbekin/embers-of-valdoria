/* Sefer yuvalari "New Campaign" taslagi: oyun kodu DEGIL. Metinler oyundan (src/game/campaign-slots-ui.ts: MODES, DIFFS, "Overwrite this slot", "Begin the journey", "Mode and difficulty cannot be changed later."),
   zorluk metinleri data/campaign/campaign.json; yuva icerikleri ORNEKTIR (gercekte kayit ozetinden gelir: dugum adi, durak sayisi, zafer, kayit sayisi, tarih, takim). */
(function () {
  const { esc, tip } = MK;
  const SLOTS = [
    { id: 0, node: 'Mill Road', type: 'start', stop: 1, vic: 0, saves: 1, date: '18 Oct 2026 · 19:45', party: [['warrior', 1]] },
    { id: 1, node: 'Castle Morvane', type: 'boss', stop: 21, vic: 20, saves: 5, date: '17 Oct 2026 · 22:10', party: [['warrior', 14], ['archer', 13], ['druid', 13], ['mage', 12]] },
    { id: 2, node: 'Valdren Keep', type: 'town', stop: 8, vic: 7, saves: 3, date: '16 Oct 2026 · 18:02', party: [['warrior', 5], ['archer', 5], ['mage', 4]] },
  ];
  const MODES = [{ id: 'normal', name: 'Normal', lines: ['Autosave after every victory', 'Save on the map at any time', 'Up to 5 saves in this slot'] }, { id: 'ironman', name: 'Ironman', lines: ['Saved only after a victory', 'No manual saves', 'One save, always overwritten'] }];
  const DIFFS = [{ id: 'easy', name: 'Easy', lines: ['Enemies make more mistakes.'] }, { id: 'medium', name: 'Medium', lines: ['The intended challenge.'] }, { id: 'hard', name: 'Hard', lines: ['Enemies play their best and are tougher.'] }];
  const NAME = { warrior: 'Warrior', archer: 'Archer', druid: 'Druid', mage: 'Mage' };
  const fresh = () => ({ slot: 1, step: 1, mode: 'normal', diff: 'medium' });
  const nav = () => MK.navBtn('back', 'Back');
  const sub = (s, st) => `${st.mode === 'ironman' ? 'Ironman' : 'Normal'} · ${DIFFS.find((d) => d.id === st.diff).name} · Stop ${s.stop}`;
  const stage = (inner) => `<div class="mk-stage cs-stage"><div class="cs-shade"></div>${inner}</div>${nav()}`;
  const steps = (st) => `<div class="cs-steps"><button class="${st.step === 1 ? 'on' : ''}" data-step="1">I · Slot</button><i></i><button class="${st.step === 2 ? 'on' : ''}" data-step="2">II · Mode &amp; difficulty</button></div>`;
  const faces = (s) => `<div class="cs-faces">${s.party.map(([id]) => `<img src="${MK.av(id)}" alt="">`).join('')}</div>`;
  const optCards = (arr, cur, key) => `<div class="cs-opts">${arr.map((o) => `<div class="cs-opt${o.id === cur ? ' sel' : ''}" data-${key}="${o.id}"><b>${o.name}</b>${o.lines.map((l) => `<em>${esc(l)}</em>`).join('')}</div>`).join('')}</div>`;
  const optPlates = (arr, cur, key) => `<div class="cs-oplates" style="--n:${arr.length}">${arr.map((o) => `<div class="cs-op${o.id === cur ? ' sel' : ''}" data-${key}="${o.id}"><b>${o.name}</b><ul>${o.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('')}</div>`;
  const wire = (ui, f) => {
    const s = f.state;
    ui.querySelectorAll('[data-slot]').forEach((e) => e.addEventListener('click', () => { s.slot = Number(e.dataset.slot); f.redraw(); }));
    ui.querySelectorAll('[data-mode]').forEach((e) => e.addEventListener('click', () => { s.mode = e.dataset.mode; f.redraw(); }));
    ui.querySelectorAll('[data-diff]').forEach((e) => e.addEventListener('click', () => { s.diff = e.dataset.diff; f.redraw(); }));
    ui.querySelectorAll('[data-step]').forEach((e) => e.addEventListener('click', () => { s.step = Number(e.dataset.step); f.redraw(); }));
    ui.querySelectorAll('[data-go]').forEach((e) => e.addEventListener('click', () => { s.step = Number(e.dataset.go); f.redraw(); }));
  };

  /* ---------- MEVCUT ---------- */
  const cur = (ui, f) => {
    const st = f.state, s = SLOTS[st.slot];
    const rows = SLOTS.map((x, i) => `<div class="cs-row${i === st.slot ? ' sel' : ''}" data-slot="${i}" style="top:${290 + i * 100}px"><b>Slot ${i + 1}</b><em>${esc(sub(x, st))}</em></div>`).join('');
    const body = st.step === 1
      ? `<div class="cs-kick">Slot ${s.id + 1}</div><h2>${s.node}</h2><div class="cs-meta">Normal · Medium</div><div class="cs-det">VALDORIA · Stop ${s.stop} of 21 · ${s.vic} victories · ${s.saves} save${s.saves === 1 ? '' : 's'} · ${s.date}</div>${faces(s)}<button class="k-btn" data-go="2">Overwrite this slot</button>`
      : `<div class="cs-kick">Mode</div>${optCards(MODES, st.mode, 'mode')}<div class="cs-kick">Difficulty</div>${optCards(DIFFS, st.diff, 'diff')}<p class="cs-note">Slot ${s.id + 1} · Mode and difficulty cannot be changed later.</p><div class="cs-acts"><button class="k-btn" data-go="1">Back</button><button class="k-btn pri">Begin the journey</button></div>`;
    ui.innerHTML = stage(`<h1 class="cs-title">New Campaign</h1>${steps(st)}${rows}<div class="cs-pan">${body}</div>`);
    wire(ui, f);
  };

  /* ---------- V1 plakalar + A Band kagidi ---------- */
  const partyCards = (s) => `<div class="cs-party">${s.party.map(([id, lv]) => `<div class="cs-hero"><div class="pf"><img src="${MK.av(id)}" alt=""><span class="lv">Lv ${lv}</span></div><div class="nm">${NAME[id]}</div></div>`).join('')}</div>`;
  const v1 = (ui, f) => {
    const st = f.state, s = SLOTS[st.slot];
    const plates = SLOTS.map((x, i) => `<div class="cs-plate${i === st.slot ? ' sel' : ''}" data-slot="${i}" style="top:${290 + i * 178}px"><div class="pf"><img src="${MK.av(x.party[0][0])}" alt=""><span class="n">${x.party.length}</span></div><div class="tx"><span class="k">Slot ${i + 1}</span><span class="nm">${x.node}</span><div class="cs-chips"><span class="k-chip dim">${st.mode === 'ironman' ? 'Ironman' : 'Normal'}</span><span class="k-chip dim">${DIFFS.find((d) => d.id === st.diff).name}</span></div><div class="cs-prog"><i style="width:${(x.stop / 21) * 100}%"></i></div></div></div>`).join('');
    let right;
    if (st.step === 1) {
      const spec = { kind: `Slot ${s.id + 1}`, title: s.node, icon: MK.av(s.party[0][0]), iconShape: 'portrait', value: `${s.stop}/21`, valueLabel: 'stops', chips: [{ text: 'Valdoria' }, { text: 'Normal · Medium', tone: 'ac', color: '#ffb98a' }], lines: [`${s.vic} victories`, `${s.saves} save${s.saves === 1 ? '' : 's'} · ${s.date}`], bodyHtml: partyCards(s) };
      right = `<div class="cs-sheet">${tip(spec)}</div><div class="cs-acts2"><span></span><button class="k-btn pri" data-go="2">Overwrite this slot</button></div>`;
    } else {
      right = `<div class="cs-sheet"><div class="cs-lbl">Mode</div>${optPlates(MODES, st.mode, 'mode')}<div class="cs-lbl">Difficulty</div>${optPlates(DIFFS, st.diff, 'diff')}<p class="cs-note" style="margin:0">Slot ${s.id + 1} · Mode and difficulty cannot be changed later.</p></div><div class="cs-acts2"><button class="k-btn" data-go="1">Back</button><button class="k-btn pri">Begin the journey</button></div>`;
    }
    ui.innerHTML = stage(`<h1 class="cs-title">New Campaign</h1>${steps(st)}${plates}${right}`);
    wire(ui, f);
  };

  /* ---------- V2 uc kart ---------- */
  const NODEBG = { start: 'map', boss: 'map', town: 'map' };
  const v2 = (ui, f) => {
    const st = f.state, s = SLOTS[st.slot];
    const cards = SLOTS.map((x, i) => `<div class="cs-card${i === st.slot ? ' sel' : ''}" data-slot="${i}"><div class="art" style="background-image:url(${MK.bg('valdoria')});background-position:${[18, 80, 38][i]}% ${[85, 15, 40][i]}%"><span class="k">Slot ${i + 1}</span><span class="big">${x.node}</span></div>
      <div class="body"><div class="faces">${x.party.map(([id, lv]) => `<span class="f"><img src="${MK.av(id)}" alt=""><b>${lv}</b></span>`).join('')}</div><div class="cs-chips"><span class="k-chip dim">Stop ${x.stop} / 21</span><span class="k-chip dim">${x.vic} victories</span></div><div class="cs-prog"><i style="width:${(x.stop / 21) * 100}%"></i></div><div class="ft"><span>${x.saves} save${x.saves === 1 ? '' : 's'}</span><span>${x.date.split(' · ')[0]}</span></div></div></div>`).join('');
    const main = st.step === 1
      ? `<div class="cs-cards">${cards}</div><div class="cs-acts2" style="left:110px;width:1700px;top:920px"><span></span><button class="k-btn pri" data-go="2">Overwrite this slot</button></div>`
      : `<div class="cs-col" style="width:1500px;margin-left:-750px;top:290px"><div class="cs-lbl">Mode</div>${optPlates(MODES, st.mode, 'mode')}<div class="cs-lbl">Difficulty</div>${optPlates(DIFFS, st.diff, 'diff')}<div class="cs-colacts"><button class="k-btn" data-go="1">Back</button><span class="cs-colnote">Slot ${s.id + 1} · Mode and difficulty cannot be changed later.</span><button class="k-btn pri">Begin the journey</button></div></div>`;
    ui.innerHTML = stage(`<h1 class="cs-title">New Campaign</h1>${steps(st)}${main}`);
    wire(ui, f);
  };

  /* ---------- V3 ortada tek sutun ---------- */
  const v3 = (ui, f) => {
    const st = f.state, s = SLOTS[st.slot];
    const stepper = `<div class="cs-stepper"><span class="${st.step === 1 ? 'on' : ''}" data-step="1">I · Slot</span><span class="${st.step === 2 ? 'on' : ''}" data-step="2">II · Mode &amp; difficulty</span></div>`;
    const wide = SLOTS.map((x, i) => `<div class="cs-wide${i === st.slot ? ' sel' : ''}" data-slot="${i}"><span class="node"><img src="${MK.node(x.type)}" alt=""></span><div class="tx"><span class="k">Slot ${i + 1} · Stop ${x.stop} of 21</span><span class="nm">${x.node}</span><div class="cs-chips"><span class="k-chip dim">${x.vic} victories</span><span class="k-chip dim">${x.saves} save${x.saves === 1 ? '' : 's'}</span><span class="k-chip dim">${x.date.split(' · ')[0]}</span></div></div><div class="faces">${x.party.map(([id]) => `<img src="${MK.av(id)}" alt="">`).join('')}</div></div>`).join('');
    const seg = (arr, cur, key) => `<div class="cs-seg">${arr.map((o) => `<div class="so${o.id === cur ? ' sel' : ''}" data-${key}="${o.id}"><b>${o.name}</b><span>${esc(o.lines.join(' · '))}</span></div>`).join('')}</div>`;
    const body = st.step === 1
      ? `${wide}<div class="cs-colacts"><span></span><button class="k-btn pri" data-go="2">Overwrite this slot</button></div>`
      : `<div class="cs-lbl">Mode</div>${seg(MODES, st.mode, 'mode')}<div class="cs-lbl">Difficulty</div>${seg(DIFFS, st.diff, 'diff')}<div class="cs-colacts"><button class="k-btn" data-go="1">Back</button><span class="cs-colnote">Slot ${s.id + 1} · Mode and difficulty cannot be changed later.</span><button class="k-btn pri">Begin the journey</button></div>`;
    ui.innerHTML = stage(`<div class="cs-col"><div class="hd"><h1>New Campaign</h1></div>${stepper}${body}</div>`);
    wire(ui, f);
  };

  const mkf = (fn, caps) => (host) => caps.forEach(([cap, step]) => MK.addFrame(host, { cap, bg: MK.bg('menu'), dim: false, state: Object.assign(fresh(), { step }), render: fn }));
  const CAPS = [['Adım I · yuva seç (Slot 2 dolu: "Overwrite this slot")', 1], ['Adım II · mod ve zorluk', 2]];
  MK.mount({
    title: 'Campaign slots',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (New Campaign, birebir)', note: 'Soldan sütun yuvalar (italik alt yazı), sağda tek panel: küçük meta, italik ayrıntı, minik portreler, tek düğme. Adım II\'de iki ve üç kart italik açıklamalı.', build: mkf(cur, CAPS) },
      { id: 'v1', tab: 'V1 Plates', h: 'V1 · Plates + sheet', note: 'Soldaki yuvalar Gear plakası dilinde (lider portre, ad, çipler, ilerleme çubuğu); sağdaki panel A Band kâğıdı (başlık şeridi, "8/21", çipler, takım kartları Lv ile); adım II seçenekleri köşe elmaslı plakalar, madde işaretli düz yazı.', build: mkf(v1, CAPS) },
      { id: 'v2', tab: 'V2 Cards', h: 'V2 · Three cards', note: 'Yuvalar Play kartları gibi üç büyük kart (bölge görseli, takım portreleri + Lv, ilerleme); sol sütun yok; birincil eylem sağ altta. Adım II tam genişlikte iki sıra seçenek plakası.', build: mkf(v2, CAPS) },
      { id: 'v3', tab: 'V3 Column', h: 'V3 · One column', note: 'Ortada tek sütun, üstte iki adımlı gösterge (I Slot / II Mode & difficulty); yuvalar geniş şerit (düğüm ikonu, ad, çipler, takım yüzleri); seçenekler birleşik segment düğmeleri. Telefon yatayda en rahat okunan.', build: mkf(v3, CAPS) },
    ],
  });
})();
