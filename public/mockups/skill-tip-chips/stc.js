/* Taslak (oyun dışı). Gerçek ipucu içeriği oyundan alındı (skillTip + skillTags + skillMiniGrid; Mage Blizzard, Warrior Charge). */
(function () {
  const I = 'skill-tip-chips/ico/';
  const RG = 'skill-tip-chips/img/range.webp';
  const esc = MK.esc;
  const rich = (t) => esc(t).replace(/(\d+(?:[.,]\d+)?%?)/g, '<span class="n">$1</span>');
  const ICE = '#8fd8ff', PHYS = '#e8e2d0';
  const SK = {
    blizzard: {
      accent: ICE, kind: 'Skill', title: 'Blizzard', icon: I + 'blizzard.webp', target: 'Block 3x2', el: { t: 'Ice', c: ICE, i: I + 'ice.webp' }, range: 6, mp: 14, cd: 2,
      rows: [['Damage 81% INT (21)', ICE]],
      grid: { cols: 4, rows: 3, on: ['1,0', '1,1', '1,2', '2,0', '2,1', '2,2'], an: '2,1' },
    },
    charge: {
      accent: null, kind: 'Skill', title: 'Charge', icon: I + 'charge.webp', target: 'Single Target', el: { t: 'Physical', c: PHYS, i: I + 'sword.png' }, range: 4, mp: 10, cd: 3,
      rows: [['Damage 68% STR (18)', PHYS], ['Applies Stun for 1 turn: Skips its next turn'], ['If you are not in the front row, you then step into the front row: the front cell of your own lane, or the nearest empty front cell if that one is taken (you stay put if the front row is full)']],
      grid: null,
    },
  };
  const gridHtml = (g) => {
    if (!g) return '';
    const on = new Set(g.on);
    let cells = '';
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const k = r + ',' + c;
      cells += `<i class="${on.has(k) ? 'on' : ''}${g.an === k ? ' an' : ''}" style="grid-column:${c + 1};grid-row:${r + 1}"></i>`;
    }
    return `<span class="bt-grid" style="grid-template-columns:repeat(${g.cols},auto);grid-template-rows:repeat(${g.rows},auto)">${cells}</span>`;
  };
  const tag = (t) => `<span class="bt-chip">${esc(t)}</span>`;
  const elChip = (e) => `<span class="bt-chip ac" style="color:${e.c}"><img src="${e.i}" alt="">${esc(e.t)}</span>`;
  const tipAttr = (txt) => `data-tip="${esc(txt)}" aria-label="${esc(txt)}" tabindex="0"`;
  const q = (cls, icon, num, tip) => `<span class="bt-chip v q" ${tipAttr(tip)}><img class="${cls}" src="${icon}" alt=""><span class="n">${num}</span></span>`;
  const chipsFor = (v, s) => {
    const head = tag(s.target) + elChip(s.el);
    if (v === 'cur') {
      return head + `<span class="bt-chip">Range ${s.range}</span><span class="bt-chip v"><img src="${I}mp.webp" alt=""><span class="n">${s.mp}</span> MP</span><span class="bt-chip v"><img src="${I}cooldown.webp" alt=""><span class="n">${s.cd}</span> turns</span>`;
    }
    const R = `Range ${s.range}`, M = `Costs ${s.mp} MP`, C = `Cooldown: ${s.cd} ${s.cd === 1 ? 'turn' : 'turns'}`;
    if (v === 'v3') {
      const sg = (cls, icon, num, tip) => `<span class="sg" ${tipAttr(tip)}><img class="${cls}" src="${icon}" alt=""><span class="n">${num}</span></span>`;
      return head + `<span class="bt-chip v seg">${sg('rg', RG, s.range, R)}${sg('mp', I + 'mp.webp', s.mp, M)}${sg('cd', I + 'cooldown.webp', s.cd, C)}</span>`;
    }
    return head + q('rg', RG, s.range, R) + q('mp', I + 'mp.webp', s.mp, M) + q('cd', I + 'cooldown.webp', s.cd, C);
  };
  const tipHtml = (v, s) => {
    const rows = s.rows.map((r) => `<div class="bt-ln"><span class="dia"></span><div class="tx"><span style="${r[1] ? 'color:' + r[1] : ''}">${rich(r[0])}</span></div></div>`).join('');
    return `<div class="bt" style="${s.accent ? '--ac:' + s.accent : ''}">
      <div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(&quot;${s.icon}&quot;)"></span><div class="bt-ht"><div class="bt-kind">${s.kind}</div><div class="bt-title">${esc(s.title)}</div></div>${s.grid ? `<div class="bt-aside">${gridHtml(s.grid)}</div>` : ''}</div>
      <div class="bt-meta">${chipsFor(v, s)}</div>
      <div class="bt-div"></div><div class="bt-body">${rows}</div></div>`;
  };
  const frame = (host, v, cap, cls) => MK.addFrame(host, {
    cap, crop: [450, 330], bg: MK.bg('castle-hall'),
    render(ui) { ui.innerHTML = `<div class="st-row ${cls || ''}">${tipHtml(v, SK.blizzard)}${tipHtml(v, SK.charge)}</div>`; },
  });
  const zoom = (host) => {
    const box = document.createElement('div');
    box.className = 'zm';
    const row = (sz) => `<div class="zm-row"><span class="sz">${sz}px</span><span class="it"><img src="${RG}" width="${sz}" height="${sz}" alt="">6</span><span class="it"><img src="${I}mp.webp" width="${sz}" height="${sz}" alt="">14</span><span class="it"><img src="${I}cooldown.webp" width="${sz}" height="${sz}" alt="">2</span></div>`;
    box.innerHTML = `<div class="zm-box"><h4>Range / MP / Cooldown at 16, 20, 24 px</h4>${row(16)}${row(20)}${row(24)}</div>
      <div class="zm-box"><h4>Range icon alone (16 / 20 / 24 / 48)</h4><div class="zm-big">${[16, 20, 24, 48].map((s) => `<img src="${RG}" width="${s}" height="${s}" alt="">`).join('')}</div></div>
      <div class="zm-box"><h4>The 3 icons side by side at 24 px</h4><div class="zm-big"><img src="${RG}" width="24" height="24" alt=""><img src="${I}mp.webp" width="24" height="24" alt=""><img src="${I}cooldown.webp" width="24" height="24" alt=""></div></div>`;
    host.append(box);
  };
  MK.mount({
    title: 'Skill tip chips',
    sections: [
      { id: 'cur', h: 'Current (today)', note: 'Bugünkü oyun: sözcüklü çipler (Range 6, 14 MP, 2 turns).', build: (h) => frame(h, 'cur', 'Current') },
      { id: 'v1', h: 'V1: ikonlar 20px, sözcük yok', note: 'BLOCK 3X2 | ICE | [menzil] 6 | [MP] 14 | [kum saati] 2. Çipin üstüne gelince tam ad (öneri).', build: (h) => frame(h, 'v1', 'V1 - 20px', 'i20') },
      { id: 'v2', h: 'V2: ikonlar 24px, sıkı çip', note: 'V1 ile aynı; ikon 24px, çipler biraz daha dar.', build: (h) => frame(h, 'v2', 'V2 - 24px tight', 'i24 tight') },
      { id: 'v3', h: 'V3: üç sayı tek bölmeli çipte', note: 'Menzil / MP / bekleme tek çipte, ince ayraçlı; BLOCK ve element ayrı kalır. Her bölmenin kendi balonu var.', build: (h) => frame(h, 'v3', 'V3 - segmented', 'i20') },
      { id: 'zoom', h: 'Zoom: okunurluk', note: 'Menzil ikonu 16 / 20 / 24 px, MP damlası ve kum saatinin yanında.', build: zoom },
    ],
  });
})();
