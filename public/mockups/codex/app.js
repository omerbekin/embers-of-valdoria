/* Codex taslagi: oyun kodu DEGIL. Bolum adlari / sayilar / madde basliklari oyundan (src/wiki/codex.ts CODEX_SECTIONS, catalog.ts "Basics" makaleleri; sayilar ekran goruntusunden),
   sinif verisi data/classes + data/skills. Yalnizca "Getting Started" ve "Classes" bolumleri tiklanabilir; ikonlar yaklasik (oyundaki Codex renkli pikselart ikonlar kullaniyor). */
(function () {
  const { esc, tip } = MK;
  const C = Object.fromEntries(window.TS_CLASSES.map((c) => [c.id, c]));
  const IC = (n) => `team-select/ic/${n}.webp`;
  const WARR = { sword: 'battle-hud/warrior/sword.webp', whirlwind: 'battle-hud/warrior/whirlwind.webp', charge: 'battle-hud/warrior/charge.webp', warcry: 'battle-hud/warrior/warcry.webp', rage: 'battle-hud/warrior/rage.webp' };
  const icUrl = (n) => WARR[n] || IC(n);
  const NAME = { antimage: 'Anti-Mage' };
  const nm = (id) => NAME[id] || C[id].name;
  const SECS = [
    { id: 'start', t: 'Getting Started', n: 6, ic: MK.node('battle'), live: 1 },
    { id: 'lessons', t: 'Lessons', n: 6, ic: MK.ui('codex') },
    { id: 'classes', t: 'Classes', n: 11, ic: MK.cls('warrior'), live: 1 },
    { id: 'skills', t: 'Skills', n: 117, ic: IC('fireball') },
    { id: 'mech', t: 'Stats & Mechanics', n: 60, ic: MK.st('str') },
    { id: 'status', t: 'Statuses & Grounds', n: 23, ic: MK.st('armor') },
    { id: 'elem', t: 'Elements', n: 8, ic: IC('meteor') },
    { id: 'assets', t: 'Assets', n: 929, ic: MK.ui('bag') },
  ];
  const ENT = [
    { id: 'goal', t: 'The goal', ic: MK.node('battle'), body: ['Pick a team of 4 different classes (11 classes to choose from) and fight an enemy team that is picked the same way. Teams do not have to be this size: a side can field anywhere from 1 to 12 units. Defeat every enemy unit to win; if your whole team falls, you lose.', 'You control your own team; the enemy team is played by the computer. Pick a skill, then pick its target (hover a target to preview the expected result).'] },
    { id: 'turns', t: 'Turn order and the SPD counter', ic: MK.ui('cooldown') },
    { id: 'formation', t: 'Formation and rows', ic: MK.ui('formation') },
    { id: 'range', t: 'Range', ic: IC('arrow') },
    { id: 'mana', t: 'MP and cooldowns', ic: MK.st('mp') },
    { id: 'screen', t: 'Reading the screen', ic: MK.ui('codex'), list: ['Hover a unit to see its stats; hover a skill to see its description and cost.', "Keys 1-4 pick the acting unit's skills.", 'Menu (top right, or Esc) opens the Codex and Settings; the battle pauses while the Codex is open. On a phone, the corner-arrows button switches to full screen (on iPhone use Add to Home Screen); held upright, the game turns sideways to fill the screen.'] },
  ];
  const CLS = ['defender', 'warrior', 'archer', 'cutthroat', 'antimage', 'druid', 'mage', 'paladin', 'undead', 'gambler', 'hexer'];
  const E = (id) => ENT.find((e) => e.id === id);
  const fresh = (sec) => ({ sec, entry: 'goal', cls: 'warrior', cat: 'Basics' });
  const nav = () => MK.navBtn('back', 'Back');
  const wrap = (inner, cls = '') => `<div class="cx ${cls}"><div class="cx-bg"></div><div class="cx-title">Codex</div>${inner}</div>${nav()}`;
  const wire = (ui, f) => {
    const s = f.state;
    ui.querySelectorAll('[data-sec]').forEach((e) => e.addEventListener('click', () => { if (e.dataset.live) { s.sec = e.dataset.sec; f.redraw(); } }));
    ui.querySelectorAll('[data-ent]').forEach((e) => e.addEventListener('click', () => { if (e.dataset.live) { s.entry = e.dataset.ent; f.redraw(); } }));
    ui.querySelectorAll('[data-cls]').forEach((e) => e.addEventListener('click', () => { s.cls = e.dataset.cls; f.redraw(); }));
  };
  const bodyHtml = (e) => (e.list ? `<ul>${e.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : (e.body || []).map((p) => `<p>${esc(p)}</p>`).join(''));
  const live = (e) => !!(e.body || e.list);
  const plates = (c) => {
    const cdi = MK.ui('cooldown'), mpi = MK.st('mp');
    const chip = (s) => (s.res === 'mp' && s.amt === 0 ? '<span class="bp-chip free">Free</span>' : s.res === 'rage' ? `<span class="bp-chip rage"><img class="bh-ico" src="${MK.ui('rage')}" alt=""><span class="w">RAGE</span><b>${s.amt}</b></span>` : `<span class="bp-chip"><img class="bh-ico" src="${mpi}" alt=""><b>${s.amt}</b></span>`) + (s.cd ? `<span class="bp-chip"><img class="bh-ico" src="${cdi}" alt=""><b>${s.cd}</b></span>` : '');
    const pas = `<div class="bp pas" style="width:132px"><span class="bp-tag"><span class="full">Passive</span></span><div class="bp-ico"><img class="bh-ico" src="${icUrl(c.passive.icon)}" alt=""></div><span class="bp-nm">${esc(c.passive.name)}</span><div class="bp-chips"></div></div>`;
    return `<div class="bh-kit">${pas}${c.skills.map((s, i) => `<div class="bp ${i === 3 ? 'ult' : ''}">${i === 3 ? '<span class="bp-tag"><span class="full">Ultimate</span></span>' : ''}<span class="bp-key">${i + 1}</span><div class="bp-ico"><img class="bh-ico" src="${icUrl(s.icon)}" alt=""></div><span class="bp-nm">${esc(s.name)}</span><div class="bp-chips">${chip(s)}</div></div>`).join('')}</div>`;
  };
  const primaryName = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck' };
  const classSpec = (c) => ({ kind: 'Class', title: nm(c.id), icon: MK.av(c.id), iconShape: 'portrait', value: c.role, chips: [{ text: `Range ${c.range}` }, { text: `${primaryName[c.primary]} primary`, tone: 'ac', color: '#ffb98a', icon: MK.st(c.primary) }], bodyHtml: `<p style="margin:0 0 10px;font-size:1.05em">${esc(c.blurb)}</p>${plates(c)}` });

  /* ---------- MEVCUT ---------- */
  const cur = (st) => {
    const cats = SECS.map((s) => `<div class="cx-c${s.id === st.sec ? ' sel' : ''}" data-sec="${s.id}" ${s.live ? 'data-live="1"' : ''}><img src="${s.ic}" alt=""><span>${s.t}</span><i>${s.n}</i></div>`).join('');
    let mid, right;
    if (st.sec === 'classes') {
      const c = C[st.cls];
      mid = `<div class="cx-hd"><span>Classes</span><b>11</b></div><div class="cx-scroll"><div class="cx-tiles" style="grid-template-columns:repeat(2,1fr)">${CLS.map((id) => `<div class="cx-tile${id === st.cls ? ' sel' : ''}" data-cls="${id}"><img src="${MK.av(id)}" alt=""><b>${nm(id)}</b></div>`).join('')}</div></div>`;
      right = `<div class="cx-card"><div class="hd"><img src="${MK.av(c.id)}" alt=""><div><h2>${nm(c.id)}</h2><div class="ty">${esc(c.role)}</div></div></div><p>${esc(c.blurb)}</p><p>Range ${c.range} · Primary: ${primaryName[c.primary]} · STR ${c.attrs.str} · DEX ${c.attrs.dex} · INT ${c.attrs.int} · LUCK ${c.attrs.luck}</p><p><b style="color:#f3d999">Passive: ${esc(c.passive.name)}.</b> ${esc(c.passive.text)}</p><p>Skills: ${c.skills.map((s) => esc(s.name)).join(', ')}.</p></div>`;
    } else {
      const e = E(st.entry);
      mid = `<div class="cx-hd"><span>Getting Started</span><b>6</b></div><div class="cx-scroll">${ENT.map((x) => `<div class="cx-e${x.id === st.entry ? ' sel' : ''}" data-ent="${x.id}" ${live(x) ? 'data-live="1"' : ''}><img src="${x.ic}" alt=""><span>${esc(x.t)}</span></div>`).join('')}</div>`;
      right = `<div class="cx-card"><div class="hd"><img src="${e.ic}" alt=""><div><h2>${esc(e.t)}</h2><div class="ty">Basics</div></div></div>${bodyHtml(e)}</div>`;
    }
    return wrap(`<div class="cx-body"><div class="cx-col" style="width:22%"><div class="cx-search"><img src="${MK.ui('codex')}" alt=""><span style="font-style:italic">Search the Codex...</span></div><div class="cx-scroll" style="margin-top:10px">${cats}</div></div><div class="cx-col" style="width:27%">${mid}</div><div class="cx-col" style="flex:1;min-width:0">${right}</div></div>`);
  };

  /* ---------- V1 ust sekmeler ---------- */
  const tabs = (st, withCount = true) => SECS.map((s) => `<span class="cx-tab${s.id === st.sec ? ' sel' : ''}" data-sec="${s.id}" ${s.live ? 'data-live="1"' : ''}><img src="${s.ic}" alt="">${s.t}${withCount ? `<b>${s.n}</b>` : ''}</span>`).join('');
  const v1 = (st) => {
    let left, right;
    if (st.sec === 'classes') {
      const c = C[st.cls];
      left = `<div class="cx-col" style="width:34%"><div class="cx-scroll"><div class="cx-tiles" style="grid-template-columns:repeat(3,1fr)">${CLS.map((id) => `<div class="cx-tile${id === st.cls ? ' sel' : ''}" data-cls="${id}"><img src="${MK.av(id)}" alt=""><b>${nm(id)}</b></div>`).join('')}</div></div></div>`;
      right = `<div class="cx-sheet">${tip(classSpec(c))}</div>`;
    } else {
      const e = E(st.entry);
      left = `<div class="cx-col" style="width:34%"><div class="cx-scroll">${ENT.map((x) => `<div class="cx-plate${x.id === st.entry ? ' sel' : ''}" data-ent="${x.id}" ${live(x) ? 'data-live="1"' : ''}><span class="ic"><img src="${x.ic}" alt=""></span><span><span class="nm">${esc(x.t)}</span><span class="k">Basics</span></span></div>`).join('')}</div></div>`;
      right = `<div class="cx-sheet">${tip({ kind: 'Basics', title: e.t, icon: e.ic, bodyHtml: bodyHtml(e) }).replace('class="bt"', 'class="bt cx-h"')}</div>`;
    }
    return wrap(`<div class="cx-tabs">${tabs(st)}</div><div class="cx-body">${left}${right}</div>`, 'cx-v1');
  };

  /* ---------- V2 defter ---------- */
  const v2 = (st) => {
    const marks = SECS.map((s) => `<div class="cx-mark${s.id === st.sec ? ' sel' : ''}" data-sec="${s.id}" ${s.live ? 'data-live="1"' : ''}><img src="${s.ic}" alt="">${s.t}</div>`).join('');
    let pl, pr;
    if (st.sec === 'classes') {
      const c = C[st.cls];
      pl = `<div class="cx-scroll"><div class="cx-tiles" style="grid-template-columns:repeat(3,1fr)">${CLS.map((id) => `<div class="cx-tile${id === st.cls ? ' sel' : ''}" data-cls="${id}"><img src="${MK.av(id)}" alt=""><b>${nm(id)}</b></div>`).join('')}</div></div>`;
      pr = `<span class="k-sub kind">Class · ${esc(c.role)}</span><h2>${nm(c.id)}</h2><div class="rule"></div><div class="cx-scroll"><p>${esc(c.blurb)}</p><div class="k-chip hot" style="margin:2px 0 10px"><img src="${MK.st(c.primary)}" alt="">${primaryName[c.primary]} <b>${c.attrs[c.primary]}</b> primary</div>${plates(c)}</div>`;
    } else {
      const e = E(st.entry);
      pl = `<div class="cx-hd"><span>Getting Started</span><b>6</b></div><div class="cx-scroll">${ENT.map((x) => `<div class="cx-lk${x.id === st.entry ? ' sel' : ''}" data-ent="${x.id}" ${live(x) ? 'data-live="1"' : ''}><img src="${x.ic}" alt=""><span class="nm">${esc(x.t)}</span></div>`).join('')}</div>`;
      pr = `<span class="k-sub kind">Basics</span><h2>${esc(e.t)}</h2><div class="rule"></div><div class="cx-scroll">${bodyHtml(e)}</div>`;
    }
    return wrap(`<div class="cx-ledger"><div class="cx-marks">${marks}</div><div class="cx-page"><div class="cx-tabs2">${tabs(st, false)}</div>${pl}</div><div class="cx-page">${pr}</div></div>`);
  };

  /* ---------- V3 arama oncelikli ---------- */
  const v3 = (st) => {
    let cards, drawer;
    if (st.sec === 'classes') {
      const c = C[st.cls];
      cards = CLS.map((id) => `<div class="cx-gc${id === st.cls ? ' sel' : ''}" data-cls="${id}"><span class="ic"><img src="${MK.av(id)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top"></span><span><span class="nm">${nm(id)}</span><span class="k">${esc(C[id].role)}</span></span></div>`).join('');
      drawer = `<div class="cx-drawer">${tip(classSpec(c))}</div>`;
    } else {
      const e = E(st.entry);
      cards = ENT.map((x) => `<div class="cx-gc${x.id === st.entry ? ' sel' : ''}" data-ent="${x.id}" ${live(x) ? 'data-live="1"' : ''}><span class="ic"><img src="${x.ic}" alt=""></span><span><span class="nm">${esc(x.t)}</span><span class="k">Basics</span></span></div>`).join('');
      drawer = `<div class="cx-drawer">${tip({ kind: 'Basics', title: e.t, icon: e.ic, bodyHtml: bodyHtml(e) })}</div>`;
    }
    return wrap(`<div class="cx-body"><div class="cx-bigsearch"><img src="${MK.ui('codex')}" alt="">Search skills, classes, rules...</div><div class="cx-chips">${tabs(st)}</div><div class="cx-grid">${cards}</div></div>${drawer}`, 'cx-v3');
  };

  const mk = (fn) => (host) => [['Getting Started · madde seç (tıkla)', 'start'], ['Classes · sınıf seç (tıkla)', 'classes']].forEach(([cap, sec]) => MK.addFrame(host, { cap, bg: MK.bg('castle-hall'), dim: false, state: fresh(sec), render: (ui, f) => { ui.innerHTML = fn(f.state); wire(ui, f); } }));
  MK.mount({
    title: 'Codex',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (yaklaşık)', note: 'Üç sütun: sol bölüm menüsü (adlar "GETTING STA…", "STATS & ME…" diye kesiliyor), orta madde listesi, sağ kart (italik alt başlık). İkonlar bu taslakta yaklaşık (oyunda renkli pikselart).', build: mk(cur) },
      { id: 'v1', tab: 'V1 Tabs', h: 'V1 · Tabs on top', note: 'Bölümler üstte sekme (ikon + ad + sayı çipi, kesilme yok, 44 px); madde listesi Gear plakası dilinde; madde A Band kâğıdı (başlık şeridi, düz yazı). Sınıflarda portre ızgarası + sınıf kâğıdı (A Plates, pasif önce).', build: mk(v1) },
      { id: 'v2', tab: 'V2 Ledger', h: 'V2 · Ledger', note: 'Gear ekranındaki defter dili: sol sayfa liste, sağ sayfa madde (Cinzel başlık, elmaslı çizgi); bölümler defterin sağ kenarında yer imi. Telefonda yer imleri üst sekmeye iner.', build: mk(v2) },
      { id: 'v3', tab: 'V3 Search', h: 'V3 · Search first', note: 'Büyük arama kutusu + bölüm çipleri; sonuçlar üç sütun plaka ızgarası; seçilen madde sağdan çekmece (A Band). Aramayla çalışan oyuncu için en hızlısı.', build: mk(v3) },
    ],
  });
})();
