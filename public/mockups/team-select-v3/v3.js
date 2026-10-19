/* Quick Battle secili kahraman seridi v3 taslagi: oyun kodu DEGIL. Veri oyundan (team-select/data.js). Serit yerlesimi oyundaki TeamSelectScene.renderInfo ile ayni; yalniz stat / skill gorunumu degisir. */
(function () {
  const { esc, tip } = MK;
  const C = Object.fromEntries(window.TS_CLASSES.map((c) => [c.id, c]));
  const IC = (n) => `team-select/ic/${n}.webp`;
  const WARR = { sword: 'battle-hud/warrior/sword.webp', whirlwind: 'battle-hud/warrior/whirlwind.webp', charge: 'battle-hud/warrior/charge.webp', warcry: 'battle-hud/warrior/warcry.webp', rage: 'battle-hud/warrior/rage.webp' };
  const icUrl = (n) => WARR[n] || IC(n);
  const STATS = [['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['luck', 'LCK']];
  const SCOL = { str: '#ff9f43', dex: '#7dff9b', int: '#7dc4ff', luck: '#ffd166' };
  const GROUPS = [['str', '#d9703a', ['defender', 'warrior']], ['dex', '#5fb06a', ['archer', 'cutthroat']], ['int', '#5a9be0', ['antimage', 'druid', 'mage', 'paladin', 'undead']], ['luck', '#c9a64a', ['gambler', 'hexer']]];
  const NAME = { antimage: 'Anti-Mage' };
  const nm = (id) => NAME[id] || C[id].name;
  const PL = ['gambler', 'antimage', 'mage', 'defender'], EN = ['mage', 'archer', 'paladin', 'druid'];
  const MPI = MK.st('mp'), CDI = MK.ui('cooldown'), RGI = MK.ui('rage');
  const MAXSTAT = 30;

  /* ---- ortak: roster + dugmeler + sahne (team-select-v2 ile ayni) ---- */
  function roster(sel) {
    let x = 40;
    const y = 884;
    return GROUPS.map(([k, col, ids]) => {
      const gx = x;
      const tiles = ids.map((id) => {
        const tx = x;
        x += 124;
        const p = PL.includes(id) ? '<i class="bd p">1</i>' : '', e = EN.includes(id) ? '<i class="bd e">1</i>' : '';
        return `<div class="ts-tile${sel === id ? ' sel' : ''}" data-id="${id}" style="left:${tx}px;top:${y}px"><div class="pf"><img src="${MK.av(id)}" alt="">${p}${e}</div><div class="nm">${esc(nm(id))}</div></div>`;
      }).join('');
      x += 22;
      return `<div class="ts-gh" style="left:${gx}px;top:${y - 36}px;--c:${col}"><i></i>${{ str: 'STR', dex: 'DEX', int: 'INT', luck: 'LCK' }[k]}</div>${tiles}`;
    }).join('');
  }
  const btns = () => `<div class="ts-btns" style="top:862px"><div class="ts-ready old">Both teams are ready</div><button class="el-btn" type="button">Random both</button><button class="el-btn primary ready" type="button">Start battle</button></div>`;
  const scene = (inner) => `<div class="mk-stage bottom ts-stage"><div class="ts-shade"></div>${inner}</div>`;

  /* ---- skill ipucu (A Band) ---- */
  const skillTip = (c, k) => {
    if (k === 'p') return tip({ kind: 'Passive', title: c.passive.name, icon: icUrl(c.passive.icon), accent: '#6fb0a8', lines: [c.passive.text || 'Shots strike harder the farther the target stands.'] });
    const s = c.skills[k];
    return tip({ kind: k === 3 ? 'Ultimate' : 'Skill', title: s.name, icon: icUrl(s.icon), accent: k === 3 ? '#e0702a' : undefined,
      chips: [s.res === 'mp' && s.amt === 0 ? { text: 'Free', tone: 'free' } : { text: String(s.res).toUpperCase(), tone: 'v', num: String(s.amt) }, ...(s.cd ? [{ text: 'cooldown', tone: 'v', num: String(s.cd) }] : [])] });
  };
  const tipOf = (c, k) => `<div class="t3-tip">${skillTip(c, k)}</div>`;

  /* bedel kucuk gosterimi: {cls, html} */
  const cost = (s, icons = true) => {
    const mp = icons ? `<img src="${MPI}" alt="">` : '';
    const parts = [];
    if (s.res === 'mp' && s.amt === 0) parts.push(['free', 'Free']);
    else if (s.res === 'mp') parts.push(['', `${mp}${s.amt}`]);
    else if (s.res === 'rage') parts.push(['rage', `<img src="${RGI}" alt="">${s.amt}`]);
    else parts.push(['', String(s.amt)]);
    return parts[0];
  };
  const cdOf = (s) => (s.cd ? `<span class="cd"><img src="${CDI}" alt="">${s.cd}</span>` : '');

  const head = (c, sel) => `<div class="av"><img src="${MK.av(sel)}" alt=""></div><div class="nm"><b>${esc(nm(sel))}</b><em>${esc(c.role)}</em></div>`;

  /* ---------- CURRENT (oyunun birebiri) ---------- */
  const cur = (sel) => {
    const c = C[sel];
    const sts = STATS.map(([k, l]) => `<span class="st${c.primary === k ? ' pri' : ''}"><img src="${MK.st(k)}" alt=""><i>${l}</i><b>${c.attrs[k]}</b></span>`).join('');
    const sks = [`<span class="sk pas"><img class="i" src="${icUrl(c.passive.icon)}" alt="">${tipOf(c, 'p')}</span>`].concat(c.skills.map((s, i) => `<span class="sk"><img class="i" src="${icUrl(s.icon)}" alt="">${tipOf(c, i)}</span>`)).join('');
    return `<div class="t3 cur">${head(c, sel)}<div class="sts">${sts}</div><div class="sks">${sks}</div></div>`;
  };

  /* ---------- V1 Olcer ---------- */
  const v1 = (sel) => {
    const c = C[sel];
    const sts = STATS.map(([k, l]) => `<span class="st${c.primary === k ? ' pri' : ''}" style="--c:${SCOL[k]}"><img src="${MK.st(k)}" alt=""><i>${l}</i><b>${c.attrs[k]}</b><u><s style="width:${Math.min(100, (c.attrs[k] / MAXSTAT) * 100)}%"></s></u></span>`).join('');
    const sks = [`<span class="sk pas"><img class="i" src="${icUrl(c.passive.icon)}" alt=""><span class="co pt">PASSIVE</span>${tipOf(c, 'p')}</span>`].concat(c.skills.map((s, i) => {
      const [cl, h] = cost(s);
      return `<span class="sk${i === 3 ? ' ult' : ''}"><span class="key">${i + 1}</span><img class="i" src="${icUrl(s.icon)}" alt=""><span class="co ${cl}">${h}${cdOf(s)}</span>${tipOf(c, i)}</span>`;
    })).join('');
    return `<div class="t3 v1">${head(c, sel)}<div class="sts">${sts}</div><div class="sks">${sks}</div></div>`;
  };

  /* ---------- V2 Sakin ---------- */
  const v2 = (sel) => {
    const c = C[sel];
    const sts = STATS.map(([k, l]) => `<span class="st${c.primary === k ? ' pri' : ''}" style="--c:${SCOL[k]}">${c.primary === k ? '<span class="dia"></span>' : ''}<img src="${MK.st(k)}" alt=""><i>${l}</i><b>${c.attrs[k]}</b><u style="width:${c.primary === k ? 46 : 28}px"></u></span>`).join('');
    const sks = [`<span class="sk pas"><img class="i" src="${icUrl(c.passive.icon)}" alt="">${tipOf(c, 'p')}</span><span class="gap"></span>`].concat(c.skills.map((s, i) => {
      const [cl, h] = cost(s, false);
      return `<span class="sk${i === 3 ? ' ult' : ''}"><img class="i" src="${icUrl(s.icon)}" alt=""><span class="pip ${cl}">${s.res === 'mp' && s.amt === 0 ? 'FREE' : s.amt}</span>${tipOf(c, i)}</span>`;
    })).join('');
    return `<div class="t3 v2">${head(c, sel)}<div class="sts">${sts}</div><div class="sks">${sks}</div></div>`;
  };

  /* ---------- V3 Plaka ---------- */
  const v3 = (sel) => {
    const c = C[sel];
    const sts = STATS.map(([k, l]) => `<span class="st${c.primary === k ? ' pri' : ''}" style="--c:${SCOL[k]}"><s style="width:${Math.min(100, (c.attrs[k] / MAXSTAT) * 100)}%"></s><img src="${MK.st(k)}" alt=""><i>${l}</i><b>${c.attrs[k]}</b></span>`).join('');
    const sks = [`<span class="sk pas"><span class="tg">Passive</span><img class="i" src="${icUrl(c.passive.icon)}" alt=""><span class="n">${esc(c.passive.name)}</span>${tipOf(c, 'p')}</span>`].concat(c.skills.map((s, i) => {
      const [cl, h] = cost(s);
      return `<span class="sk${i === 3 ? ' ult' : ''}">${i === 3 ? '<span class="tg">Ultimate</span>' : `<span class="key">${i + 1}</span>`}<img class="i" src="${icUrl(s.icon)}" alt=""><span class="n">${esc(s.name)}</span><span class="co ${cl}">${h}${cdOf(s)}</span>${tipOf(c, i)}</span>`;
    })).join('');
    return `<div class="t3 v3">${head(c, sel)}<div class="sts">${sts}</div><div class="sks">${sks}</div></div>`;
  };

  const mk = (fn) => (host) =>
    MK.addFrame(host, { cap: 'Interaktif: roster\'dan bir kahramana tıkla, skill\'in üstüne gel', bg: MK.bg('proving-grounds'), crop: [820, 300], state: { sel: 'defender' }, render: (ui, f) => {
      ui.innerHTML = scene(fn(f.state.sel) + roster(f.state.sel) + btns());
      ui.querySelectorAll('.ts-tile').forEach((t) => t.addEventListener('click', () => { f.state.sel = t.dataset.id; f.redraw(); }));
      ui.querySelectorAll('.sk').forEach((q) => q.addEventListener('click', () => { const on = q.classList.contains('tipon'); ui.querySelectorAll('.sk.tipon').forEach((e) => e.classList.remove('tipon')); if (!on) q.classList.add('tipon'); }));
    } });

  MK.mount({
    title: 'Quick Battle hero strip v3',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (oyunun birebiri)', note: 'Oyundaki şerit: portre, ad + rol, ikon + kısa ad + değer şeklinde 4 stat (ana stat altın), pasif (yuvarlak) + 4 skill 48 birimlik kutu. Yerleşim bu 3 varyantta da aynı.', build: mk(cur) },
      { id: 'v1', tab: 'V1 Ölçer', h: 'V1 · Ölçer', note: 'Statlar küçük gösterge hücresi: altta ince dolgu çizgisi (değer/30), ana stat kor elmaslı ve kor çerçeveli. Skill\'ler köşe elmaslı Gear yuvası: numara sol üstte, altında bedel + bekleme; pasif turkuaz, ulti kor.', build: mk(v1) },
      { id: 'v2', tab: 'V2 Sakin', h: 'V2 · Sakin', note: 'Statlar kutusuz, aralarında ince ayraç, altında stat renginde kısa çizgi; ana stat kor elmaslı. Skill\'ler çift ince çerçeveli yuva, bedel köşede küçük rozet; pasif yuvarlak ve ayrı, ulti kor parıltılı.', build: mk(v2) },
      { id: 'v3', tab: 'V3 Plaka', h: 'V3 · Plaka', note: 'Statlar dolgulu çubuk çip (değer/30). Skill\'ler adı yazılı mini A Plates: PASSIVE / ULTIMATE şeridi, ikon, ad, bedel + bekleme çipi.', build: mk(v3) },
    ],
  });
})();
