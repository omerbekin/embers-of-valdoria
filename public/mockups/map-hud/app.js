/* Sefer haritasi HUD taslagi: oyun kodu DEGIL. Metinler / yapi CampaignMapScene.ts'ten (renderParty, renderNodeCard, renderInfo, renderLegend). Takim ve sayilar ORNEKTIR. */
(function () {
  const { esc, tip } = MK;
  const CROWN = '<svg class="crown" viewBox="0 0 24 24" fill="#e8c47e" stroke="#7a5a1e" stroke-width="1"><path d="M3 18 L2 7 L8 12 L12 5 L16 12 L22 7 L21 18 Z"/></svg>';
  const PARTY = [
    { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 6, hp: 1, lead: true },
    { id: 'archer', name: 'Archer', role: 'Marksman', lv: 6, hp: 0.7, pts: 2 },
    { id: 'druid', name: 'Druid', role: 'Nature Summoner', lv: 5, hp: 0, fallen: true },
    { id: 'mage', name: 'Mage', role: 'Elemental Mage', lv: 5, hp: 0.55 },
  ];
  const HERE = { name: 'Ravenwood', sub: 'Battle · Outlaw Pack', type: 'battle' };
  const INFO = { region: 'I · The Borderlands', cleared: 4, total: 26, chapter: 1, mode: 'Normal', diff: 'Medium', gold: 128 };
  const LEG = [['battle', 'Battle'], ['elite', 'Elite'], ['boss', 'Boss'], ['town', 'Town'], ['treasure', 'Treasure'], ['event', 'Event'], ['rest', 'Rest point'], ['merchant', 'Merchant']];
  const navs = MK.navBtn('back', 'Back') + MK.navBtn('fs', 'Fullscreen') + MK.navBtn('menu', 'Menu');
  const stage = (inner, o = {}) => `<div class="mk-stage mh-stage"><div class="mh-top"></div>${o.noLeft ? '' : '<div class="mh-left"></div>'}<div class="mh-region">Valdoria</div>${inner}</div>${navs}`;
  const campIcons = () => `<div class="mh-ibtn" style="left:24px;bottom:34px"><img src="${MK.ui('gear')}" alt=""></div><div class="mh-ibtn" style="left:102px;bottom:34px"><img src="${MK.ui('formation')}" alt=""></div>`;
  const tile = () => `<img src="${MK.node(HERE.type)}" alt="">`;
  const hpAdj = (h) => (h.fallen ? 'Fallen' : `${Math.round(h.hp * 100)}%`);

  /* ---------- MEVCUT (birebir) ---------- */
  const cur = () => {
    const rows = PARTY.map((h, i) => `<div class="mh-row${h.fallen ? ' fallen' : ''}" style="top:${194 + i * 112}px"><div class="pf"><img src="${MK.av(h.id)}" alt=""></div><span class="bd">${h.lv}</span>${h.pts ? `<span class="call">+${h.pts}</span>` : ''}<span class="nm">${h.name}</span><span class="ro">${h.fallen ? 'Fallen' : esc(h.role) + (h.lead ? ' · Leader' : '')}</span><div class="hp"><i style="width:${h.hp * 100}%"></i></div>${h.pts ? `<span class="up">Level up · ${h.pts} stat points to spend</span>` : ''}</div>`).join('');
    const hereY = 194 + PARTY.length * 112 + 16;
    return stage(`<div class="mh-kick" style="left:48px;top:150px">Your party · ${PARTY.length}</div><div class="mh-kickline" style="left:48px;width:400px;top:168px"></div>${rows}
      <div class="mh-kick" style="left:48px;top:${hereY}px">You are here</div><div class="mh-kickline" style="left:48px;width:400px;top:${hereY + 18}px"></div><div class="mh-here" style="top:${hereY}px"><div class="tile">${tile()}</div><span class="n">${HERE.name}</span><span class="s">${esc(HERE.sub)}</span></div>
      <div class="mh-info" style="top:${1080 - 34 - 104 - 34 - 12}px"><b>${INFO.region}</b> &nbsp;·&nbsp; Cleared ${INFO.cleared}/${INFO.total} · Chapter ${INFO.chapter}</div>
      <div class="mh-info" style="top:${1080 - 34 - 104 - 12}px">${INFO.mode} &nbsp;·&nbsp; ${INFO.diff} &nbsp;·&nbsp; <img class="mh-coin" src="${MK.ui('gold')}" alt=""> <b>${INFO.gold}</b> gold</div>${campIcons()}
      <div class="mh-legend"><div class="h">Legend <span>hide</span></div><div class="g">${LEG.map(([t, l]) => `<div><img src="${MK.node(t)}" alt="">${l}</div>`).join('')}</div></div>`);
  };

  /* ---------- V1 plakalar ---------- */
  const v1 = () => {
    const plates = PARTY.map((h, i) => `<div class="mh-p${h.fallen ? ' fallen' : ''}${h.pts ? ' up' : ''}" style="top:${150 + i * 128}px"><div class="pf"><img src="${MK.av(h.id)}" alt=""><span class="lv">${h.lv}</span></div><div class="tx"><div class="nm">${h.lead ? CROWN : ''}${h.name}${h.pts ? `<span class="pts">+${h.pts}</span>` : ''}</div><div class="mh-chips"><span class="k-chip dim">${h.role}</span>${h.fallen ? '<span class="k-chip bad">Fallen</span>' : h.lead ? '<span class="k-chip hot">Leader</span>' : ''}</div>${h.fallen ? '' : `<div class="k-bar hp"><i style="width:${h.hp * 100}%"></i><span>${Math.round(h.hp * 100)}%</span></div>`}</div></div>`).join('');
    const hereY = 150 + PARTY.length * 128 + 4;
    return stage(`<div class="mh-kick" style="left:36px;top:120px">Your party · ${PARTY.length}</div>${plates}
      <div class="mh-p" style="top:${hereY}px;height:100px;cursor:default"><div class="pf" style="width:76px;height:76px;display:grid;place-items:center"><img src="${MK.node(HERE.type)}" style="width:50px;height:50px;object-fit:contain" alt=""></div><div class="tx"><div class="mh-chips"><span class="k-chip dim">You are here</span></div><div class="nm" style="font-size:23px">${HERE.name}</div></div></div>
      <div class="mh-chap"><span class="med">I</span><div class="tx"><span class="k">Chapter ${INFO.chapter} · Cleared ${INFO.cleared}/${INFO.total}</span><span class="nm">The Borderlands</span><div class="mh-chips"><span class="k-chip dim">${INFO.mode}</span><span class="k-chip dim">${INFO.diff}</span><span class="k-chip"><span class="mh-gold"><img src="${MK.ui('gold')}" alt=""><b>${INFO.gold}</b></span></span></div><div class="prog"><i style="width:${(INFO.cleared / INFO.total) * 100}%"></i></div></div></div>${campIcons()}
      <div class="mh-lg2"><div class="h">Legend</div><div class="g">${LEG.map(([t, l]) => `<span class="k-chip dim"><img src="${MK.node(t)}" alt="">${l}</span>`).join('')}</div></div>`);
  };

  /* ---------- V2 ray + serit ---------- */
  const v2 = (st) => {
    const rail = PARTY.map((h, i) => {
      const spec = { kind: h.lead ? 'Leader' : 'Party', title: h.name, icon: MK.av(h.id), iconShape: 'portrait', value: `Lv ${h.lv}`, chips: [{ text: h.role }, ...(h.fallen ? [{ text: 'Fallen', tone: 'warn' }] : [])], lines: h.fallen ? ['Revive: town, Rest camp, Valor'] : h.pts ? [`Level up: ${h.pts} stat points to spend`, `${Math.round(h.hp * 100)}% health`] : [`${Math.round(h.hp * 100)}% health`] };
      return `<div class="rp${h.fallen ? ' fallen' : ''}${h.pts ? ' up' : ''}${i === st.open ? ' tipon' : ''}"><img src="${MK.av(h.id)}" alt="">${h.lead ? CROWN : ''}${h.pts ? `<span class="pts">+${h.pts}</span>` : ''}<span class="lv">${h.lv}</span><span class="hp"><i style="width:${h.hp * 100}%"></i></span><div class="cardtip">${tip(spec)}</div></div>`;
    }).join('');
    return stage(`<div class="mh-subtop"><span class="k-chip hot">${INFO.region}</span><span class="k-chip dim">Cleared <b>${INFO.cleared}</b>/${INFO.total}</span><span class="k-chip dim">Chapter <b>${INFO.chapter}</b></span><span class="k-chip dim">${INFO.mode} · ${INFO.diff}</span><span class="k-chip"><span class="mh-gold"><img src="${MK.ui('gold')}" alt=""><b>${INFO.gold}</b></span></span></div>
      <div class="mh-rail">${rail}</div>
      <div class="mh-ribbon"><span class="tile">${tile()}</span><span><div class="k">You are here</div><div class="nm">${HERE.name}</div></span><span class="k-chip dim">${esc(HERE.sub)}</span></div>${campIcons()}
      <div class="mh-lgbtn${st.legend ? ' tipon' : ''}"><img src="${MK.ui('codex')}" alt=""><div class="pop">${tip({ kind: 'Map', title: 'Legend', chips: LEG.map(([t, l]) => ({ icon: MK.node(t), text: l })) })}</div></div>`, { noLeft: true });
  };

  /* ---------- V3 ust seritte parti ---------- */
  const v3 = () => {
    const strip = PARTY.map((h) => `<div class="sp${h.fallen ? ' fallen' : ''}${h.pts ? ' up' : ''}"><div class="pf"><img src="${MK.av(h.id)}" alt="">${h.pts ? `<span class="pts">+${h.pts}</span>` : ''}<span class="lv">${h.lv}</span></div><div class="hp"><i style="width:${h.hp * 100}%"></i></div><div class="nm">${h.name}</div></div>`).join('');
    return stage(`<div class="mh-strip">${strip}</div>
      <div class="mh-v3bot"><div class="plate"><span class="tile">${tile()}</span><span class="sub"><span class="k">You are here</span><span class="nm">${HERE.name}</span><span class="mh-chips"><span class="k-chip dim">${esc(HERE.sub)}</span></span></span></div>
        <div class="plate"><span class="sub"><span class="k">${INFO.region}</span><span class="mh-chips"><span class="k-chip dim">Cleared ${INFO.cleared}/${INFO.total}</span><span class="k-chip dim">Chapter ${INFO.chapter}</span></span></span><span class="sub"><span class="k">${INFO.mode} · ${INFO.diff}</span><span class="mh-chips"><span class="k-chip"><span class="mh-gold"><img src="${MK.ui('gold')}" alt=""><b>${INFO.gold}</b></span></span></span></span></div></div>${campIcons()}
      <div class="mh-lgrow">${LEG.map(([t, l]) => `<span class="li"><img src="${MK.node(t)}" alt=""><span class="t">${l}</span></span>`).join('')}</div>`, { noLeft: true });
  };

  const mk = (fn, st) => (host) => MK.addFrame(host, { cap: 'Harita, Warrior lider, Archer +2 stat puanı, Druid düşmüş (örnek takım)', bg: MK.bg('valdoria'), dim: false, state: st || {}, render: (ui, f) => { ui.innerHTML = fn(f.state); } });
  MK.mount({
    title: 'Campaign map HUD',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (birebir)', note: 'Soldaki sütun: 92 birimlik portre + italik rol + ince can çizgisi; "You are here" ayrı blok; sol altta italik iki satır (bölge · Cleared · Chapter / mod · zorluk · altın); sağ altta katlanabilir Legend.', build: mk(cur) },
      { id: 'v1', tab: 'V1 Plates', h: 'V1 · Plates', note: 'Sol sütun Gear plakası dilinde: portre + Lv, Cinzel ad (liderde taç), rol çipi, sayı içeren can çubuğu; stat puanı olan kahraman kor çerçeveli "+2"; sol altta bölüm plakası (I, ilerleme çubuğu, çipler, altın); Legend çip ızgarası.', build: mk(v1) },
      { id: 'v2', tab: 'V2 Rail', h: 'V2 · Rail', note: 'Sol sütun dar bir portre rayına iner (haritaya yer açar); ayrıntı kahramanın üstüne gelince A Band kartında (ilk kahramanda açık gösterildi); bölge / ilerleme / mod / altın üstte tek çip satırı; "You are here" altta şerit; Legend tek ikon, üstüne gelince.', build: mk(v2, { open: 1 }) },
      { id: 'v3', tab: 'V3 Top strip', h: 'V3 · Top strip', note: 'Takım sol üstte yatay portre şeridi (sol sütun yok: harita tam görünür); altta iki plaka (burada + bölüm bilgisi); Legend sağ altta tek sıra ikon (adı üstüne gelince).', build: mk(v3) },
    ],
  });
})();
