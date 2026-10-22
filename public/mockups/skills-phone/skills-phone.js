/* Telefon Gear > Hero skill blogu taslagi (ui-dev, 2026-10-23). Oyun kodu DEGIL. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hp = new URLSearchParams(location.hash.slice(1).replace(/^[abc]&?/, ''));
  const S = { v: (location.hash.match(/^#([abc])/) || [])[1] || 'a', cls: hp.get('class') || 'cutthroat', sel: 0 };
  const root = document.documentElement;

  /* ---- olcek: viewport.ts ile ayni (--gu = min(w/1920, h/1080)) ---- */
  function scale() {
    const w = innerWidth, h = innerHeight;
    root.style.setProperty('--gu', Math.min(w / 1920, h / 1080) + 'px');
    root.classList.toggle('s2', h <= 370);
  }
  scale();
  addEventListener('resize', () => { scale(); measure(); });

  /* ---- gercek Hero sekmesi baglami ---- */
  const RC = { common: '#8a8a84', uncommon: '#5f8f3e', rare: '#3f6fa8' };
  const SLOTN = { weapon: 'Weapon', offhand: 'Off-hand', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', trinket: 'Trinket' };
  const HEROES = {
    cutthroat: { name: 'Cutthroat', lv: 6, eq: { weapon: ['rondel_dagger', 'Rondel Dagger', 'common', 5, '+4 DEX'], offhand: ['misericorde', 'Misericorde', 'uncommon', 7, '+3 LUCK'], helm: ['padded_hood', 'Padded Hood', 'uncommon', 6, '+2 DEX'], armor: ['leather_jerkin', 'Leather Jerkin', 'uncommon', 6, '+9 Armor'], gloves: ['leather_gloves', 'Leather Gloves', 'common', 4, '+2 DEX'], boots: ['soft_boots', 'Soft Boots', 'common', 4, '+1 Speed'], trinket: null } },
    warrior: { name: 'Warrior', lv: 6, eq: { weapon: ['arming_sword', 'Arming Sword', 'rare', 8, '+6 STR'], offhand: ['kite_shield', 'Kite Shield', 'rare', 8, '+12 Armor'], helm: ['kettle_hat', 'Kettle Hat', 'rare', 7, '+8 Armor'], armor: ['riveted_mail', 'Riveted Mail', 'uncommon', 6, '+14 Armor'], gloves: ['work_gloves', 'Work Gloves', 'common', 3, '+1 STR'], boots: ['hobnailed_boots', 'Hobnailed Boots', 'uncommon', 6, '+2 Speed'], trinket: ['pilgrims_token', "Pilgrim's Token", 'uncommon', 5, '+5 HP'] } },
    archer: { name: 'Archer', lv: 6, eq: { weapon: ['hunting_bow', 'Hunting Bow', 'uncommon', 6, '+5 DEX'], offhand: 'blocked', helm: ['leather_coif', 'Leather Coif', 'common', 4, '+2 Armor'], armor: ['leather_jerkin', 'Leather Jerkin', 'uncommon', 6, '+9 Armor'], gloves: ['archers_bracer', "Archer's Bracer", 'uncommon', 6, '+3 DEX'], boots: ['ranger_boots', 'Ranger Boots', 'rare', 8, '+3 Speed'], trinket: ['rabbits_foot', "Rabbit's Foot", 'common', 3, '+2 LUCK'] } },
  };
  const BAG = [['arming_sword', 'rare', 'weapon'], ['short_bow', 'common', 'weapon'], ['kettle_hat', 'rare', 'helm'], ['hobnailed_boots', 'uncommon', 'boots'], ['iron_buckler', 'common', 'offhand'], ['leather_gloves', 'common', 'gloves'], ['rabbits_foot', 'common', 'trinket'], ['misericorde', 'uncommon', 'weapon']];

  function slotsHtml(h) {
    return Object.keys(SLOTN).map((k) => {
      const e = h.eq[k];
      const lbl = `<div class="gp-lbl"><img src="slots/${k}.webp" alt="">${SLOTN[k]}</div>`;
      if (e === 'blocked') return `<button class="gr-slot gr-plate empty blocked gr-slot-${k}" style="--rc:#5b4a33" disabled tabindex="-1"><span class="gp-ico"><img class="gr-svg gr-slot-ico" src="slots/${k}.webp" alt="" style="--sz:1.3"></span><div class="gr-slot-text gp-tx">${lbl}<div class="gr-slot-name">Empty</div><div class="gr-slot-sub gr-hands-hint">Hands full</div></div></button>`;
      if (!e) return `<button class="gr-slot gr-plate empty gr-slot-${k}" style="--rc:#5b4a33"><span class="gp-ico"><img class="gr-svg gr-slot-ico" src="slots/${k}.webp" alt="" style="--sz:1.3"></span><div class="gr-slot-text gp-tx">${lbl}<div class="gr-slot-name">Empty</div></div></button>`;
      return `<button class="gr-slot gr-plate gr-slot-${k}" style="--rc:${RC[e[2]]}"><span class="gp-ico"><img class="gr-svg gr-px" src="items/${e[0]}.webp#smooth" alt="" style="--sz:1.3"></span><div class="gr-slot-text gp-tx">${lbl}<div class="gr-slot-name">${esc(e[1])}</div><div class="gp-l2"><span class="gp-il">iL <b>${e[3]}</b></span><span class="gp-aff">${esc(e[4])}</span></div></div></button>`;
    }).join('');
  }
  function bagHtml() {
    let h = '';
    for (let i = 0; i < 30; i++) {
      const b = BAG[i];
      h += b ? `<div class="gr-cellw"><button class="gr-item k${['common', 'uncommon', 'rare'].indexOf(b[1])}" style="--rc:${RC[b[1]]}"><img class="gr-svg gr-px" src="items/${b[0]}.webp#smooth" alt="" style="--sz:1"></button><div class="gr-price"></div></div>` : `<div class="gr-cellw"><div class="gr-item empty"></div><div class="gr-price"></div></div>`;
    }
    return h;
  }
  function shell(skillsHtml) {
    const hero = HEROES[S.cls];
    const marks = Object.keys(HEROES).map((k) => `<button class="gr-mark${k === S.cls ? ' on' : ''}" data-hero="${k}" aria-label="${HEROES[k].name}"><div class="gr-face" style="background-image:url('av/${k}.webp')"></div></button>`).join('');
    return `<div class="gr-overlay gr-ledger-ov"><div class="gr-panel gr-gear gr-ledger gr-solo tab-hero">
      <div class="gr-head gr-lhead"><div class="gr-title">Gear</div><div class="gr-tabs gr-headtabs" role="tablist"><button class="gr-tab on" role="tab"><img class="gr-tab-ico" src="ui/gear.webp" alt="">Hero</button><button class="gr-tab" role="tab"><img class="gr-tab-ico" src="ui/str.webp" alt="">Sheet</button></div><span class="gr-grow"></span><div class="gr-gold">245<img class="gr-ui-ico" src="ui/gold.webp" alt=""></div></div>
      <div class="gr-body gr-lbody">
        <div class="gr-marks-col"><div class="gr-marks">${marks}</div></div>
        <div class="gr-page"><div class="gr-page-in"><div class="gr-leaf gr-leaf-hero"><div class="gr-sec gr-class-sec"><span class="gp-chip cls">${hero.name}</span></div><div class="gr-slots">${slotsHtml(hero)}</div></div></div></div>
        <div class="gr-spine"></div>
        <div class="gr-page r"><div class="gr-page-in"><div class="gr-inv"><div class="gr-bag-head"><div class="gr-sec">Bag ${BAG.length} / 30</div></div><div class="gr-bag">${bagHtml()}</div></div></div></div>
        <div class="gr-lskills"><div class="gr-skills"><div class="gr-sec">Skills</div>${skillsHtml}</div></div>
      </div></div></div>`;
  }

  /* ---- skill verisi (skill-info.ts stili) ---- */
  const chipMp = (n) => `<span class="chip"><img src="ui/mp.webp" alt="">${n}</span>`;
  const chipCd = (n) => `<span class="chip"><img src="ui/cooldown.webp" alt="">${n}</span>`;
  const chipRage = (n) => `<span class="chip rage"><img src="ui/rage.webp" alt="">RAGE ${n}</span>`;
  const free = '<span class="chip free">Free</span>';
  function costs(r) {
    if (r.kind === 'pas') return [];
    const m = /^(\d+)\s*MP/.exec(r.cost);
    const rg = /RAGE/i.test(r.cost);
    const rn = (/min\s*(\d+)/.exec(r.cost) || [])[1];
    const a = [m ? chipMp(m[1]) : rg ? chipRage(rn || '30') : free];
    if (r.cd > 0) a.push(chipCd(r.cd));
    return a;
  }
  const blurb = (r) => (r.kind === 'pas' ? r.desc : r.lines[0].replace(/\s*\(.*?\)/, ''));
  const bigNums = (r) => r.nums.map((n) => `<div class="bg"><b class="bn">${esc(n.v)}</b><span class="bl">${esc(n.k)}</span></div>`).join('');
  const tagOf = (r) => (r.kind ? `<span class="tag">${r.kind === 'pas' ? 'Passive' : 'Ultimate'}</span>` : '');
  const icoOf = (r) => `<div class="ico"><img src="${r.icon}#smooth" alt="" draggable="false"></div>`;
  const kcls = (r) => (r.kind ? ' ' + r.kind : '');

  function vA(rows) {
    return `<div class="sp spa">${rows.map((r, i) => `<button class="cell${kcls(r)} in" style="--i:${i}" data-id="${r.id}" aria-label="${esc(r.name)}">${tagOf(r)}${icoOf(r)}<span class="nm">${esc(r.name)}</span><div class="nv"><b class="bn">${esc(r.nums[0].v)}</b>${r.kind === 'pas' ? '<span class="bl">' + esc(r.nums[0].k) + '</span>' : '<div class="chips">' + costs(r).join('') + '</div>'}</div></button>`).join('')}</div>`;
  }
  function vB(rows) {
    const p = rows[0];
    const pas = `<button class="cell pas pcell in" style="--i:0" data-id="${p.id}">${tagOf(p)}${icoOf(p)}<div class="mb"><span class="nm">${esc(p.name)}</span><div class="bd">${esc(blurb(p))}</div><div class="row2"><div style="display:flex;gap:10px">${bigNums(p)}</div></div></div></button>`;
    const mini = rows.slice(1).map((r, i) => `<button class="cell mini${kcls(r)} in" style="--i:${i + 1}" data-id="${r.id}">${r.kind ? tagOf(r) : ''}${icoOf(r)}<div class="mb"><span class="nm">${esc(r.name)}</span><div class="row2"><div class="chips">${costs(r).join('')}</div><b class="bn">${esc(r.nums[0].v)}</b></div></div></button>`).join('');
    return `<div class="sp spb">${pas}${mini}</div>`;
  }
  function vC(rows) {
    const r = rows[S.sel];
    const tabs = rows.map((x, i) => `<button class="tab${kcls(x)}${i === S.sel ? ' on' : ''} in" style="--i:${i}" data-i="${i}" aria-label="${esc(x.name)}">${icoOf(x)}</button>`).join('');
    return `<div class="sp spc"><div class="tabs">${tabs}</div>${cardC(r)}</div>`;
  }
  function cardC(r) {
    return `<button class="cell card${kcls(r)}" data-id="${r.id}">${tagOf(r)}${icoOf(r)}<div class="bd"><div class="hd"><span class="nm">${esc(r.name)}</span><div class="chips">${costs(r).join('')}</div></div><div class="ds">${esc(blurb(r))}</div><div class="big">${bigNums(r)}</div></div></button>`;
  }

  /* ---- A Band skill ipucu (src/ui/band-tip.ts ile ayni isaretleme) ---- */
  const KW = /\b(Wound|Slow|Stun|Wither|Blinded|Shrouded|Rage|critical|Accuracy|Evasion|Healing received|Haste|Speed)\b/g;
  const rich = (t) => esc(t).replace(KW, '<span class="k">$1</span>').replace(/(\+|-)?\d+(\.\d+)?%?/g, (m) => `<span class="n">${m}</span>`);
  function tipHtml(r) {
    const pas = r.kind === 'pas';
    const ac = pas ? '#6fb0a8' : r.kind === 'ult' ? '#e0702a' : r.fx || '#d9b26a';
    const meta = pas ? '' : `<div class="bt-meta">${costs(r).map((h) => h.replace('class="chip', 'class="bt-chip v').replace(/ rage"/, ' warn"')).join('')}<span class="bt-chip ac">${esc(r.badge)}</span></div>`;
    const lines = (pas ? [r.desc] : r.lines).map((l) => `<div class="bt-ln"><span class="dia"></span><div class="tx">${rich(l)}</div></div>`).join('');
    return `<div class="bt" style="--ac:${ac}"><div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(&quot;${r.icon}&quot;)"></span><div class="bt-ht"><div class="bt-kind">${pas ? 'Passive' : r.kind === 'ult' ? 'Ultimate' : 'Skill'}</div><div class="bt-title">${esc(r.name)}</div></div></div>${meta}<div class="bt-div"></div><div class="bt-body">${lines}</div></div>`;
  }
  let fl = null, flFor = null;
  function hideTip() {
    if (fl) { fl.remove(); fl = null; }
    if (flFor) { flFor.classList.remove('open'); flFor = null; }
  }
  function showTip(cell) {
    hideTip();
    const r = CLASSES[S.cls].rows.find((x) => x.id === cell.dataset.id);
    if (!r) return;
    fl = document.createElement('div');
    fl.className = 'fl';
    fl.innerHTML = tipHtml(r);
    document.body.append(fl);
    flFor = cell;
    cell.classList.add('open');
    const cr = cell.getBoundingClientRect(), tr = fl.getBoundingClientRect(), M = 6;
    let x = cr.left + cr.width / 2 - tr.width / 2;
    let y = cr.top - tr.height - 10;
    if (y < M) y = cr.bottom + 10;
    x = Math.max(M, Math.min(innerWidth - tr.width - M, x));
    y = Math.max(M, Math.min(innerHeight - tr.height - M, y));
    fl.style.left = x + 'px';
    fl.style.top = y + 'px';
    requestAnimationFrame(() => fl && fl.classList.add('on'));
  }

  /* ---- yuva adi sigdirma: tek uzun kelime kutudan tasarsa yazi 0.5 px kuculur (en az 10 px); tire / ... yok ---- */
  function fitNames() {
    document.querySelectorAll('.gr-leaf-hero .gr-slot-name').forEach((n) => {
      n.style.fontSize = '';
      let fs = parseFloat(getComputedStyle(n).fontSize);
      while (n.scrollWidth > n.clientWidth + 0.5 && fs > 10) { fs -= 0.5; n.style.fontSize = fs + 'px'; }
      // 10 px'te de sığmayan tek kelime (Misericorde @740): ortadan tireyle böl, kesme yok
      if (n.scrollWidth > n.clientWidth + 0.5) n.innerHTML = n.textContent.replace(/\S{9,}/g, (w) => w.slice(0, Math.ceil(w.length / 2)) + '&shy;' + w.slice(Math.ceil(w.length / 2)));
    });
  }

  /* ---- olcum: blok yuvalari ve ust sayfayi kaydirmaya zorluyor mu? ---- */
  function measure() {
    fitNames();
    const lsk = $('.gr-lskills'), pg = $('.gr-page'), panel = $('.gr-panel');
    if (!lsk || !pg) return;
    const h = Math.round(lsk.getBoundingClientRect().height);
    const w = Math.round(lsk.getBoundingClientRect().width);
    const sl = $('.gr-slots');
    const over = Math.max(pg.scrollHeight - pg.clientHeight, sl ? sl.scrollHeight - sl.clientHeight : 0, Math.round(lsk.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom + 6));
    const panelOver = panel.scrollHeight - panel.clientHeight;
    parent.postMessage({ sp: 1, w, h, over: Math.max(over, panelOver), vw: innerWidth, vh: innerHeight }, '*');
  }

  /* ---- cizim ---- */
  let first = true;
  function render() {
    const rows = CLASSES[S.cls].rows;
    hideTip();
    const keep = first ? '' : '';
    const html = S.v === 'a' ? vA(rows) : S.v === 'b' ? vB(rows) : vC(rows);
    $('#ui-root').innerHTML = shell(html);
    if (!first) $('#ui-root').querySelectorAll('.in').forEach((e) => e.classList.remove('in'));
    first = false;
    history.replaceState(null, '', '#' + S.v + '&class=' + S.cls);
    requestAnimationFrame(() => requestAnimationFrame(measure));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  function setSel(i, dir) {
    const rows = CLASSES[S.cls].rows;
    S.sel = Math.max(0, Math.min(rows.length - 1, i));
    hideTip();
    document.querySelectorAll('.spc .tab').forEach((t) => t.classList.toggle('on', Number(t.dataset.i) === S.sel));
    const old = $('.spc .card');
    const n = document.createElement('div');
    n.innerHTML = cardC(rows[S.sel]);
    const card = n.firstElementChild;
    card.classList.add('sw');
    card.style.setProperty('--dir', (dir || 0) * 14 + 'px');
    old.replaceWith(card);
  }

  document.addEventListener('click', (e) => {
    const mk = e.target.closest('.gr-mark');
    if (mk) { S.cls = mk.dataset.hero; S.sel = 0; render(); notify(); return; }
    const tab = e.target.closest('.spc .tab');
    if (tab) { const i = Number(tab.dataset.i); setSel(i, i > S.sel ? 1 : -1); return; }
    const cell = e.target.closest('.sp .cell');
    if (cell) { if (flFor === cell) hideTip(); else showTip(cell); return; }
    hideTip();
  });
  /* C: karti saga / sola kaydirinca onceki / sonraki skill */
  let sx = null;
  document.addEventListener('pointerdown', (e) => { sx = e.target.closest('.spc .card') ? { x: e.clientX, y: e.clientY } : null; });
  document.addEventListener('pointerup', (e) => {
    if (!sx) return;
    const dx = e.clientX - sx.x, dy = e.clientY - sx.y;
    sx = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); setSel(S.sel + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); suppress = true; setTimeout(() => (suppress = false), 0); }
  });
  let suppress = false;
  document.addEventListener('click', (e) => { if (suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener('hashchange', () => { const m = location.hash.match(/^#([abc])/); if (m) { S.v = m[1]; S.sel = 0; render(); } const c = new URLSearchParams(location.hash.slice(1).replace(/^[abc]&?/, '')).get('class'); if (c && c !== S.cls) { S.cls = c; render(); } });
  function notify() { parent.postMessage({ sp: 2, cls: S.cls }, '*'); }
  render();
})();
