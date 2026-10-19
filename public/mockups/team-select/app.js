/* Quick Battle takim secimi (alt bolum) taslagi: oyun kodu DEGIL. Veri oyundan (data/classes, data/skills; team-select/data.js), roster / dugmeler oyundaki hal.
   Ornek takimlar ekran goruntusundeki gibi: Player = Gambler, Anti-Mage, Mage, Defender; Enemy = Mage, Archer, Paladin, Druid. */
(function () {
  const { esc, tip } = MK;
  const C = Object.fromEntries(window.TS_CLASSES.map((c) => [c.id, c]));
  const IC = (n) => `team-select/ic/${n}.webp`;
  const WARR = { sword: 'battle-hud/warrior/sword.webp', whirlwind: 'battle-hud/warrior/whirlwind.webp', charge: 'battle-hud/warrior/charge.webp', warcry: 'battle-hud/warrior/warcry.webp', rage: 'battle-hud/warrior/rage.webp' };
  const icUrl = (n) => WARR[n] || IC(n);
  const STATS = [['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['luck', 'LCK']];
  const GROUPS = [['str', '#d9703a', ['defender', 'warrior']], ['dex', '#5fb06a', ['archer', 'cutthroat']], ['int', '#5a9be0', ['antimage', 'druid', 'mage', 'paladin', 'undead']], ['luck', '#c9a64a', ['gambler', 'hexer']]];
  const NAME = { antimage: 'Anti-Mage' };
  const nm = (id) => NAME[id] || C[id].name;
  const PL = ['gambler', 'antimage', 'mage', 'defender'], EN = ['mage', 'archer', 'paladin', 'druid'];
  const MPI = MK.st('mp'), CDI = MK.ui('cooldown'), RGI = MK.ui('rage');

  const chipOf = (s, res) => {
    const out = [];
    if (s.res === 'mp' && s.amt === 0) out.push('<span class="bp-chip free">Free</span>');
    else if (s.res === 'mp') out.push(`<span class="bp-chip"><img class="bh-ico" src="${MPI}" alt=""><b>${s.amt}</b></span>`);
    else if (s.res === 'rage') out.push(`<span class="bp-chip rage"><img class="bh-ico" src="${RGI}" alt=""><span class="w">RAGE</span><b>${s.amt}</b></span>`);
    else out.push(`<span class="bp-chip"><b>${s.amt}</b></span>`);
    if (s.cd) out.push(`<span class="bp-chip"><img class="bh-ico" src="${CDI}" alt=""><b>${s.cd}</b></span>`);
    return out.join('');
  };
  const plates = (c) => {
    const pas = `<div class="bp pas"><span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span><div class="bp-ico"><img class="bh-ico" src="${icUrl(c.passive.icon)}" alt=""></div><span class="bp-nm">${esc(c.passive.name)}</span><div class="bp-chips"></div></div>`;
    const sk = c.skills.map((s, i) => {
      const ult = i === 3;
      return `<div class="bp ${ult ? 'ult' : ''}">${ult ? '<span class="bp-tag"><span class="full">Ultimate</span><span class="short">Ult</span></span>' : ''}<span class="bp-key">${i + 1}</span><div class="bp-ico"><img class="bh-ico" src="${icUrl(s.icon)}" alt=""></div><span class="bp-nm">${esc(s.name)}</span><div class="bp-chips">${chipOf(s)}</div></div>`;
    }).join('');
    return `<div class="bh-kit ts-plates">${pas}${sk}</div>`;
  };
  const statTiles = (c, cls = 'ts-stat') => STATS.map(([k, l]) => `<span class="${cls}${c.primary === k ? ' pri' : ''}"><img src="${MK.st(k)}" alt="">${l}<b>${c.attrs[k]}</b></span>`).join('');
  const chipsOf = (c) => `<div class="ts-chips"><span class="k-chip dim">${esc(c.role)}</span><span class="k-chip dim">Range ${c.range}</span><span class="k-chip hot"><img src="${MK.st(c.primary)}" alt="">${{ str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck' }[c.primary]} <b>${c.attrs[c.primary]}</b> primary</span></div>`;

  /* ---------- ortak: roster + dugmeler ---------- */
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
  const btns = (old) => `<div class="ts-btns" style="top:${old ? 862 : 872}px"><div class="ts-ready ${old ? 'old' : ''}">Both teams are ready</div><button class="el-btn" type="button">Random both</button><button class="el-btn primary ready" type="button">Start battle</button></div>`;
  const scene = (inner) => `<div class="mk-stage bottom ts-stage"><div class="ts-shade"></div>${inner}</div>`;

  /* ---------- MEVCUT ---------- */
  const cur = (sel) => {
    const c = C[sel];
    return scene(`<div class="ts-cur"><div class="pf"><img src="${MK.av(sel)}" alt=""></div><div class="nm"><b>${esc(nm(sel))}</b><em>${esc(c.role)}</em></div>
      <div class="sts">${STATS.map(([k, l]) => `<span><img src="${MK.st(k)}" alt="">${l} ${c.attrs[k]}</span>`).join('')}</div>
      <div class="sks"><img src="${icUrl(c.passive.icon)}" alt="">${c.skills.map((s) => `<img src="${icUrl(s.icon)}" alt="">`).join('')}</div></div>${roster(sel)}${btns(true)}`);
  };
  /* ---------- V1 kart seridi ---------- */
  const v1 = (sel) => {
    const c = C[sel];
    return scene(`<div class="ts-card"><div class="pf"><img src="${MK.av(sel)}" alt=""><span class="em"><img src="${MK.cls(sel)}" alt=""></span></div>
      <div class="ts-info"><span class="k">Character</span><h3>${esc(nm(sel))}</h3>${chipsOf(c)}<div class="ts-stats">${statTiles(c)}</div></div><div class="ts-vsep"></div>${plates(c)}</div>${roster(sel)}${btns()}`);
  };
  /* ---------- V2 ince seritte zengin ozet ---------- */
  const v2 = (sel, st) => {
    const c = C[sel];
    const sqs = [`<span class="ts-sq pas" data-k="p"><img src="${icUrl(c.passive.icon)}" alt=""></span><span class="sep"></span>`].concat(c.skills.map((s, i) => `<span class="ts-sq" data-k="${i}"><img src="${icUrl(s.icon)}" alt=""></span>`)).join('');
    const k = st.tip;
    let tipHtml = '';
    if (k !== null && k !== undefined) {
      const isP = k === 'p';
      const s = isP ? null : c.skills[k];
      const spec = isP
        ? { kind: 'Passive', title: c.passive.name, icon: icUrl(c.passive.icon), accent: '#6fb0a8', lines: [c.passive.text] }
        : { kind: k === 3 ? 'Ultimate' : 'Skill', title: s.name, icon: icUrl(s.icon), accent: k === 3 ? '#e0702a' : undefined, chips: [s.res === 'mp' && s.amt === 0 ? { text: 'Free', tone: 'free' } : { text: String(s.res).toUpperCase(), tone: 'v', num: String(s.amt) }, ...(s.cd ? [{ text: 'cooldown', tone: 'v', num: String(s.cd) }] : [])] };
      tipHtml = `<div class="ts-tipbox" style="left:${1040 + (isP ? 0 : 78 * (k + 1))}px;top:${722 - (isP ? 190 : 150)}px">${tip(spec)}</div>`;
    }
    return scene(`<div class="ts-slim"><div class="pf"><img src="${MK.av(sel)}" alt=""></div><div class="nm"><h3>${esc(nm(sel))}</h3>${chipsOf(c)}</div>
      <div class="ts-stats">${statTiles(c)}</div><div class="ts-sqs">${sqs}</div></div>${tipHtml}${roster(sel)}${btns()}`);
  };
  /* ---------- V3 bilgi roster uzerine gelince ---------- */
  const v3 = (sel, st) => {
    const c = C[sel];
    const h = C[st.hover || sel];
    const tipSpec = {
      kind: 'Character', title: nm(h.id), icon: MK.av(h.id), iconShape: 'portrait', value: h.role,
      chips: [{ text: `Range ${h.range}` }, { text: { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck' }[h.primary] + ' primary', tone: 'ac', color: '#ffb98a', icon: MK.st(h.primary) }],
      bodyHtml: `<div class="ts-tipstats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:2px 0 10px">${statTiles(h)}</div>${plates(h)}`,
    };
    const idx = [].concat(...GROUPS.map((g) => g[2])).indexOf(st.hover || sel);
    const left = Math.min(40 + idx * 128 - 40, 700);
    return scene(`<div class="ts-mini"><span class="ts-sq" style="width:48px;height:48px"><img src="${MK.av(sel)}" alt=""></span><h3>${esc(nm(sel))}</h3>${chipsOf(c)}<span class="hint">Hover a hero for details</span></div>
      ${roster(sel)}${st.hover !== null && st.hover !== undefined ? `<div class="ts-tipbox" style="left:${left}px;top:${620 - 0}px;transform:translateY(-100%)">${tip(tipSpec).replace('<div class="bt"', '<div class="bt" style="--bu:1.3px;width:760px;max-width:none;pointer-events:none"')}</div>` : ''}${btns()}`);
  };

  const mk = (fn, init) => (host) =>
    MK.addFrame(host, { cap: 'Interaktif: roster\'dan bir kahramana tıkla', bg: MK.bg('proving-grounds'), crop: [820, 296], state: init(), render: (ui, f) => {
      ui.innerHTML = fn(f.state.sel, f.state);
      ui.querySelectorAll('.ts-tile').forEach((t) => {
        t.addEventListener('click', () => { f.state.sel = t.dataset.id; f.redraw(); });
        t.addEventListener('pointerenter', () => { if (f.state.hover !== undefined) { f.state.hover = t.dataset.id; if (f.state.sticky !== true) f.redraw(); } });
      });
      ui.querySelectorAll('.ts-sq[data-k]').forEach((q) => q.addEventListener('pointerenter', () => { f.state.tip = q.dataset.k === 'p' ? 'p' : Number(q.dataset.k); f.redraw(); }));
    } });

  MK.mount({
    title: 'Quick Battle hero strip',
    sections: [
      { id: 'cur', tab: 'Current', h: 'Mevcut hal (birebir, ekranın alt yarısı)', note: 'Seçili kahraman tek satır: küçük portre, ad, italik rol, düz "STR 24 DEX 6 ..." yazısı ve 5 küçük çıplak skill ikonu; ipucu / pasif ayrımı yok.', build: mk(cur, () => ({ sel: 'defender' })) },
      { id: 'v1', tab: 'V1 Card strip', h: 'V1 · Card strip', note: 'Karakter kartı A dili tek şeritte: büyük portre + sınıf amblemi, Cinzel ad, rol / menzil / primary çipleri, 4 stat karosu (primary turuncu), sağda A Plates (PASİF önce, sonra 4 skill + bedel çipleri).', build: mk(v1, () => ({ sel: 'defender' })) },
      { id: 'v2', tab: 'V2 Slim', h: 'V2 · Slim strip', note: 'Şerit ince kalır (yer tasarrufu, telefona uygun): portre, ad + çipler, stat karoları, 5 köşe elmaslı skill ikonu; ayrıntı üstüne gelince A Band ipucunda (pasif yeşilimsi, ulti turuncu).', build: mk(v2, () => ({ sel: 'defender', tip: 2 })) },
      { id: 'v3', tab: 'V3 Hover sheet', h: 'V3 · Hover sheet', note: 'Ekranda yalnızca tek satır (ad + çipler); tüm ayrıntı roster\'daki bir kahramanın üstüne gelince tam A Band karakter kartı olarak açılır (stat karoları + A Plates). En sade ekran.', build: mk(v3, () => ({ sel: 'defender', hover: 'archer' })) },
    ],
  });
})();
