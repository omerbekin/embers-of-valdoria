/* Yara arayuzu taslagi: oyun kodu DEGIL. Kurallar: src/progression/wounds.ts + data/campaign/campaign.json rules.wounds ({ riseRatio .1, maxHpLoss .2, lethal 3 }).
   Takim ve sayilar ORNEKTIR. */
(function () {
  const { esc, tip } = MK;
  const LOSS = 0.2, LETHAL = 3;
  const CROWN = '<svg class="crown" viewBox="0 0 24 24" fill="#e8c47e" stroke="#7a5a1e" stroke-width="1"><path d="M3 18 L2 7 L8 12 L12 5 L16 12 L22 7 L21 18 Z"/></svg>';
  // yara damlasi (CSS/SVG, gorsel uretimi yok)
  const DROP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 C12 2.5 5 10.5 5 15 a7 7 0 0 0 14 0 C19 10.5 12 2.5 12 2.5 Z" fill="currentColor"/><path d="M13.5 8 L10.5 13 L13 14.5 L10.5 20" fill="none" stroke="#1a0705" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // pence/kilic izi (tek cizik)
  const SLASH = '<svg class="mark %c" viewBox="0 0 15 18" aria-hidden="true"><path d="M2 17 L13 1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M6 17 L13 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".7"/></svg>';

  const TEAM = [
    { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 6, base: 110, w: 0, r: 1, lead: true },
    { id: 'archer', name: 'Archer', role: 'Marksman', lv: 6, base: 84, w: 1, r: 0.7 },
    { id: 'mage', name: 'Mage', role: 'Elemental Mage', lv: 5, base: 72, w: 2, r: 0.18 },
    { id: 'defender', name: 'Defender', role: 'Frontline Tank', lv: 5, base: 140, w: 3, r: 0.45 },
  ];
  const eff = (base, w) => Math.max(1, Math.round(base * Math.max(0.05, 1 - LOSS * Math.min(w, LETHAL))));
  const calc = (h) => { const e = eff(h.base, h.w); return { e, cur: Math.max(1, Math.round(e * h.r)), pct: h.w * LOSS * 100, low: h.r <= 0.25 }; };

  // ---- A Band ipucu (tum yara gostergelerinde ayni) ----
  const woundTip = (h) => {
    const { e, pct } = calc(h);
    if (h.w <= 0) return tip({ kind: 'Wounds', title: 'No wounds', value: '100%', valueLabel: 'max HP', chips: [{ text: `Max HP ${h.base}` }], lines: ['A hero who is down when a battle is won rises with 10% health and gains a wound.', 'Each wound lowers max HP by 20%.'] });
    const max = h.w >= LETHAL;
    return tip({
      kind: 'Wounds', title: `${h.w} ${h.w === 1 ? 'Wound' : 'Wounds'}`, value: `-${pct}%`, valueLabel: 'max HP', accent: '#c8503c', titleColor: '#e8806a', valueColor: '#e8806a',
      chips: [{ text: `Max HP ${e} of ${h.base}`, tone: max ? 'warn' : '' }, ...(max ? [{ text: 'Maximum', tone: 'warn' }] : [])],
      lines: ['Each wound lowers max HP by 20%.', 'Heal: resting in a town clears all wounds. A Valor revive clears 1.', ...(max ? ['Going down again in a won battle leaves a corpse. Valor can raise it.'] : [])],
      foot: 'Camp rest does not heal wounds.',
    });
  };
  const tipbox = (h) => `<div class="wd-tipbox">${woundTip(h)}</div>`;

  // ---- parcalar ----
  const pips = (h) => `<span class="pips">${[0, 1, 2].map((i) => `<i class="pip${i < h.w ? ' on' : ''}${h.w >= LETHAL ? ' max' : ''}"></i>`).join('')}</span>`;
  const marks = (h) => `<span class="marks">${[0, 1, 2].map((i) => SLASH.replace('%c', i < h.w ? 'on' : '')).join('')}</span>`;
  const badge = (h) => (h.w > 0 ? `<span class="wbadge${h.w >= LETHAL ? ' max' : ''}">${DROP}<b>${h.w}</b></span>` : '');
  const fillW = (v) => `${Math.round(v * 1000) / 10}%`;

  // ---- Your party (sefer haritasi) ----
  const row = (h, i, v) => {
    const c = calc(h);
    let bar, side = '', pf = `<img src="${MK.av(h.id)}" alt="">`, hurt = '';
    if (v === 'v1') {
      bar = `<div class="wd-bar"><i class="fill${c.low ? ' low' : ''}" style="width:${fillW(c.cur / h.base)}"></i>${h.w ? `<b class="scar" style="width:${fillW(h.w * LOSS)}"></b>` : ''}</div>`;
      side = `<span class="rt">${esc(h.role)}</span>${pips(h)}`;
    } else if (v === 'v2') {
      bar = `<div class="wd-bar"><i class="fill${c.low ? ' low' : ''}" style="width:${fillW(h.r)}"></i></div>`;
      side = `<span class="rt">${esc(h.role)}</span><span class="num${c.low ? ' low' : ''}">${c.cur} / ${c.e}</span>`;
      pf += badge(h);
      hurt = h.w ? ' hurt' : '';
    } else {
      bar = `<div class="wd-bar"><i class="fill${c.low ? ' low' : ''}" style="width:${fillW(h.r)}"></i></div>`;
      side = `${marks(h)}<span class="rt">${esc(h.role)}</span><span class="num${c.low ? ' low' : ''}">${c.cur} / ${c.e}${h.w ? `<s>${h.base}</s>` : ''}</span>`;
    }
    const trig = v === 'v2' ? '' : ' wd-t';
    const pfEl = v === 'v2' ? `<div class="wd-pf wd-t${hurt}">${pf}${tipbox(h)}</div>` : `<div class="wd-pf${hurt}">${pf}</div>`;
    return `<div class="wd-row${trig}" style="top:${186 + i * 112}px;--i:${i}">${pfEl}<div class="wd-body"><span class="wd-name">${h.lead ? CROWN : ''}${h.name}</span><span class="wd-lv">Lv ${h.lv}</span>${bar}<div class="wd-role">${side}</div></div>${v === 'v2' ? '' : tipbox(h)}</div>`;
  };
  const mapScreen = (v) => `<div class="mk-stage"><div class="wd-left"></div><div class="wd-region">Valdoria</div><div class="wd-kick">Your party · ${TEAM.length}</div><div class="wd-kickline"></div>${TEAM.map((h, i) => row(h, i, v)).join('')}</div>${MK.navBtn('back', 'Back') + MK.navBtn('fs', 'Fullscreen') + MK.navBtn('menu', 'Menu')}`;

  // ---- Karakter ekrani (Gear > Hero basligi + karakter karti A) ----
  const HERO = { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 6, base: 110 };
  const charScreen = (v) => {
    const x = MK.S.extra;
    const w = Math.max(0, Math.min(3, parseInt(x.w == null ? '2' : x.w, 10) || 0));
    const r = x.lo === '1' ? 0.18 : 0.82;
    const h = { ...HERO, w, r };
    const c = calc(h);
    let hp, chip, pf = `<img src="${MK.av(h.id)}" alt="">`, pfT = false;
    const hpBarV1 = `<div class="wd-bar wd-t"><i class="fill${c.low ? ' low' : ''}" style="width:${fillW(c.cur / h.base)}"></i>${w ? `<b class="scar" style="width:${fillW(w * LOSS)}"></b>` : ''}<span class="wd-n">${c.cur} / ${c.e}</span></div>`;
    const plain = `<div class="wd-bar"><i class="fill${c.low ? ' low' : ''}" style="width:${fillW(h.r)}"></i><span class="wd-n">${c.cur} / ${c.e}</span></div>`;
    if (v === 'v1') {
      hp = `<div class="wd-vit wd-t"><span class="k">HP</span>${hpBarV1.replace(' wd-t', '')}<span class="side${c.low ? ' low' : ''}">${pips(h)}</span>${tipbox(h)}</div>`;
      chip = `<span class="wd-chip wd-t dim">${w ? 'Wounded' : 'Unwounded'}${tipbox(h)}</span>`;
      chip = '';
    } else if (v === 'v2') {
      hp = `<div class="wd-vit"><span class="k">HP</span>${plain}<span class="side${c.low ? ' low' : ''}">${w ? `-${c.e < h.base ? Math.round(w * LOSS * 100) : 0}% max` : ''}</span></div>`;
      pf += badge(h);
      pfT = true;
      chip = w ? `<span class="wd-chip bad wd-t">${DROP}${w} ${w === 1 ? 'Wound' : 'Wounds'}${tipbox(h)}</span>` : '';
    } else {
      hp = `<div class="wd-vit wd-t"><span class="k">HP</span>${plain}<span class="side${c.low ? ' low' : ''}">${c.cur} / ${c.e}${w ? `<s>${h.base}</s>` : ''}</span>${tipbox(h)}</div>`;
      chip = `<span class="wd-chip wd-t dim">${marks(h)}${tipbox(h)}</span>`;
    }
    if (v === 'v1') chip = `<span class="wd-chip wd-t dim">${pips(h)}${tipbox(h)}</span>`;
    const ip = (n) => `<img src="${MK.st(n)}" alt="">`;
    const stat = (n, l, val, p) => `<div class="wd-stat${p ? ' p' : ''}">${ip(n)}<div><span class="v">${val}</span><span class="l">${l}</span></div></div>`;
    return `<div class="mk-stage"><div class="wd-dim"></div><div class="wd-char">
      <div class="wd-tabs"><span class="on">Hero</span><span>Sheet</span><span>Skills</span><span>Bag</span></div>
      <div class="wd-hd"><div class="wd-hpf${w ? ' hurt' : ''}${pfT ? ' wd-t' : ''}">${pf}${pfT ? tipbox(h) : ''}</div>
        <div class="wd-hr"><div class="wd-h1"><span class="n">${h.name}</span><span class="lv">Lv ${h.lv}</span></div>
          <div class="wd-chips"><span class="wd-chip">${h.role}</span><span class="wd-chip hot">Strength <b>32</b></span>${chip}</div>
          ${hp}
          <div class="wd-vit mp"><span class="k">MP</span><div class="wd-bar"><i class="fill mp" style="width:100%"></i><span class="wd-n">40 / 40</span></div><span class="side"></span></div>
        </div></div>
      <div class="wd-card"><div class="wd-stats">${stat('str', 'STR', 32, true)}${stat('dex', 'DEX', 12)}${stat('int', 'INT', 6)}${stat('luck', 'LUCK', 8)}</div>
        <div class="wd-pass"><img src="${MK.ui('rage')}" alt=""><div><span class="tag">Passive</span><div class="pn">Berserker</div><p>The lower your HP, the harder you hit: up to <b>+80%</b> damage at the brink of death. Losing HP gives Rage.</p></div></div></div>
    </div></div>`;
  };

  const frames = [];
  const mapFrame = (v, cap) => (host) => MK.addFrame(host, { cap, bg: MK.bg('valdoria'), dim: false, render: (ui) => { ui.innerHTML = mapScreen(v); } });
  const charFrame = (v, cap) => (host) => { const f = MK.addFrame(host, { cap, bg: MK.bg('castle-hall'), render: (ui) => { ui.innerHTML = charScreen(v); } }); frames.push(f); };
  const both = (v, c1, c2) => (host) => { mapFrame(v, c1)(host); charFrame(v, c2)(host); };

  MK.onApply = () => { frames.forEach((f) => f.redraw()); document.querySelectorAll('#mk-strip .wdb').forEach((b) => b.classList.toggle('on', (b.dataset.w != null && (MK.S.extra.w == null ? '2' : MK.S.extra.w) === b.dataset.w) || (b.dataset.lo && MK.S.extra.lo === '1'))); };

  MK.mount({
    title: 'Wounds UI',
    sections: [
      { id: 'v1', tab: 'V1 Scar', h: 'V1 · Yara bölümü (scar) + noktalar',
        note: 'Can çubuğunun sağ ucunda, yaraların götürdüğü kısım çatlak koyu bir bölüm olarak görünür (her yara çubuğun %20\'si); altında üç küçük elmas nokta (dolu = yara). Sağdaki sayı yok: çubuk ne kadar canın kalıcı kaybolduğunu zaten gösterir. Çubuğun üstüne ya da satıra gelince A Band ipucu.',
        build: both('v1', 'Sefer haritası · Your party: Warrior lider 0 yara · Archer 1 · Mage 2 + düşük can · Defender 3 (üst sınır). Üstüne gelince ipucu.', 'Gear > Hero başlığı + kart A (üstte W0-W3 / Düşük can şeridi)') },
      { id: 'v2', tab: 'V2 Badge', h: 'V2 · Portre köşesinde rozet',
        note: 'Portrenin sağ alt köşesinde damla simgeli yara sayısı rozeti; yara arttıkça portre çerçevesi kızarır, 3 yarada rozet kor rengiyle parlar. Çubuk gerçek (azalmış) maksimuma göre dolar, yanında "47 / 67". Ayrıntı portre/rozet üstüne gelince A Band ipucunda; karakter ekranında ek olarak çip.',
        build: both('v2', 'Sefer haritası · Your party (ipucu için portrelerin üstüne gel)', 'Gear > Hero başlığı + kart A') },
      { id: 'v3', tab: 'V3 Marks', h: 'V3 · Kompakt durum satırı',
        note: 'Rol satırında üç çizik işareti (yanan = yara) ve etkin maksimum can: "70 / 88" yanında eski maksimum (110) üstü çizili. Çubuk azalmış maksimuma göre dolar. Ekranda yazı yok; "-%40" gibi sayılar ve iyileşme yolu satıra gelince A Band ipucunda.',
        build: both('v3', 'Sefer haritası · Your party', 'Gear > Hero başlığı + kart A') },
    ],
  });

  // karakter ekrani durumlari icin sol alt serit dugmeleri
  const strip = document.getElementById('mk-strip');
  const add = (label, attrs, fn) => { const b = document.createElement('button'); b.className = 'wdb'; b.textContent = label; Object.entries(attrs).forEach(([k, v]) => (b.dataset[k] = v)); b.addEventListener('click', fn); strip.append(b); };
  const sep = document.createElement('span'); sep.className = 'sep'; strip.append(sep);
  [0, 1, 2, 3].forEach((n) => add('W' + n, { w: String(n) }, () => { MK.S.extra.w = String(n); MK.refresh(); }));
  add('Low HP', { lo: '1' }, () => { if (MK.S.extra.lo === '1') delete MK.S.extra.lo; else MK.S.extra.lo = '1'; MK.refresh(); });
  MK.onApply();
})();
