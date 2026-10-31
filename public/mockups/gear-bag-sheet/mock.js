/* Gear mockup logic (not game code). Hash: #a0..#a3 (bag header), #b0..#b3 (Sheet), add &worst for the crowded Sheet state. */
(() => {
  const B = 'gear-bag-sheet/';
  const root = document.documentElement;
  const stage = document.getElementById('mk-stage');
  const bar = document.getElementById('mk-bar');
  const noteEl = document.getElementById('mk-note');
  const NOTES = {
    a0: '<b>Mevcut:</b> Bag başlığı + üç düğme; telefonda ikinci satıra düşüyor. Karşılaştırma için.',
    a1: '<b>A1 Tek satır:</b> Filtre + bölünmüş "Best" düğmesi (Warrior | All) hep tek satırda. Artı: hiçbir şey saklı değil, bir dokunuşla her şey. Eksi: telefonda yatay yer dar, sıkı.',
    a2: '<b>A2 Üst/alt ayrımı:</b> Üstte görünüm filtresi (iki durum da görünür), altta "Equip best" eylem çubuğu. Artı: görünüm ile eylem karışmaz, birincil sağda. Eksi: telefonda alt çubuk torbayı 252px yerine 168px bırakır.',
    a3: '<b>A3 Tek menü:</b> Başlıkta yalnız filtre + "Equip best ▾" menüsü. Artı: en sade, en geniş boşluk. Eksi: iki eylem bir dokunuş daha derinde; öğretici ipucu menüye taşınmalı.',
    b0: '<b>Mevcut:</b> Üç sütun, kesilen adlar (fark ve +/- kalabalığında), altta boş alan. "Kalabalık" ile görülür.',
    b1: '<b>B1 Üç levha:</b> Aynı üç sütun, her biri plaka; satırlar tüm boyu doldurur, fark rakamın altında. Artı: grup yapısı bilindik, ad kesilmez. Eksi: sütunlar dar kalır (telefonda satır 44px olamaz).',
    b2: '<b>B2 Main şeridi:</b> Main dört büyük kutu (rakam + +/-), altında Attack | Defense yarım genişlikte. Artı: dağıtılan statlar öne çıkar, adlara bol yer. Eksi: telefonda Crowded durumunda +/- 44px olunca sayfa ~36px taşar (iç kaydırma).',
    b3: '<b>B3 Yatay bantlar:</b> Her grup bir bant; hücrede ad üstte (2 satıra sarar), rakam altta. Artı: kesme yok, ekranı dolduruyor, sütun hizası net. Eksi: gruplar arası karşılaştırma dikey, telefonda hücreler çok dar.',
  };
  const GROUPS = { a: ['a0', 'a1', 'a2', 'a3'], b: ['b0', 'b1', 'b2', 'b3'] };
  const DELTAS = { str: '+3', dex: '+2', int: '', luck: '+1', damage: '+12%', crit: '+1.5%', critMult: '+0.15', accuracy: '+3%', spd: '+1', armor: '+14', magicArmor: '+6', evasion: '-2%', hpRegen: '+0.6', mpRegen: '+0.5' };
  const cache = {};
  let tips = {};
  let cur = 'a1';
  let worst = false;
  let filterOn = false;
  const short = () => root.classList.contains('short');

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const get = async (n) => (cache[n] ??= await fetch(B + n).then((r) => r.text()));

  function fit() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const lw = Math.min(2580, Math.max(1920, Math.round((1080 * W) / H)));
    root.style.setProperty('--gu', Math.min(W / lw, H / 1080) + 'px');
    for (const k of ['--el', '--er', '--et', '--eb']) root.style.setProperty(k, '0px');
    root.classList.toggle('short', H <= 520);
    root.classList.toggle('compact', H <= 720);
  }

  /* ---- bar ---- */
  function buildBar() {
    bar.replaceChildren();
    const g = cur[0];
    for (const k of ['a', 'b']) {
      const b = el('button', k === g ? 'on' : '', k.toUpperCase());
      b.title = k === 'a' ? 'Bag header (Hero tab)' : 'Sheet stats (Sheet tab)';
      b.onclick = () => go(k === 'a' ? 'a1' : 'b1');
      bar.append(b);
    }
    bar.append(el('span', 'sep'));
    for (const v of GROUPS[g]) {
      const b = el('button', v === cur ? 'on' : '', v.endsWith('0') ? 'Now' : v.toUpperCase());
      b.onclick = () => go(v);
      bar.append(b);
    }
    if (g === 'b') {
      bar.append(el('span', 'sep'));
      const w = el('button', worst ? 'on' : '', 'Crowded');
      w.title = 'Item compare deltas on every stat + spend-point buttons';
      w.onclick = () => { worst = !worst; location.hash = cur + (worst ? '&worst' : ''); };
      bar.append(w);
    }
    noteEl.innerHTML = NOTES[cur];
    bar.append(noteEl);
  }

  function go(v) { location.hash = v + (worst && v[0] === 'b' ? '&worst' : ''); }

  /* ---- tips (real band tip HTML captured from the game) ---- */
  let tipBox = null, tipFor = null;
  function wireTips(ov) {
    ov.querySelectorAll('.gr-tip').forEach((t) => t.remove());
    tipBox = el('div', 'el-tip gr-tip');
    ov.append(tipBox);
    const show = (t) => {
      const html = tips[t.dataset.stat];
      if (!html) return;
      tipBox.innerHTML = html;
      tipBox.classList.add('on');
      const o = ov.getBoundingClientRect(), r = t.getBoundingClientRect();
      const tw = tipBox.offsetWidth, th = tipBox.offsetHeight;
      let x = r.left - o.left + r.width / 2 - tw / 2, y = r.top - o.top - th - 8;
      if (y < 6) y = r.bottom - o.top + 8;
      tipBox.style.left = Math.max(6, Math.min(o.width - tw - 6, x)) + 'px';
      tipBox.style.top = Math.max(6, Math.min(o.height - th - 6, y)) + 'px';
      tipFor = t;
    };
    const hide = () => { tipBox.classList.remove('on'); tipFor = null; };
    ov.addEventListener('pointerover', (e) => { if (e.pointerType === 'touch') return; const t = e.target.closest('[data-stat]'); if (t) show(t); });
    ov.addEventListener('pointerout', (e) => { if (e.pointerType === 'touch') return; if (e.target.closest('[data-stat]')) hide(); });
    ov.addEventListener('click', (e) => {
      const t = e.target.closest('[data-stat]');
      if (t && !e.target.closest('button') && matchMedia('(pointer: coarse)').matches) { tipFor === t ? hide() : show(t); } else if (!t) hide();
    });
  }

  function toast(ov, text) {
    let t = ov.querySelector('.mk-toast');
    if (!t) { t = el('div', 'mk-toast'); ov.append(t); }
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => t.classList.remove('on'), 1600);
  }

  /* ---- A: bag header ---- */
  const hero = 'Warrior';
  function filterLabel() { return filterOn ? (short() ? 'Usable' : `Usable by ${hero}`) : short() ? 'All' : 'All items'; }
  function applyFilter(ov) {
    for (const c of ov.querySelectorAll('.gr-bag .gr-item.no')) c.classList.toggle('filtered', filterOn);
    for (const c of ov.querySelectorAll('[data-filter]')) {
      if (c.matches('.gr-chip')) { c.classList.toggle('on', filterOn); c.textContent = filterLabel(); }
      else c.classList.toggle('on', (c.dataset.filter === 'on') === filterOn);
    }
  }
  function mkChip(ov) {
    const c = el('button', 'gr-chip', filterLabel());
    c.type = 'button';
    c.dataset.filter = 'chip';
    c.onclick = () => { filterOn = !filterOn; applyFilter(ov); };
    return c;
  }
  function bestHero(ov) { toast(ov, `Equipped the best items for ${hero}`); }
  function bestAll(ov) { toast(ov, 'Equipped the best items for the whole company'); }

  function buildA(ov, v) {
    const head = ov.querySelector('.gr-bag-head');
    const sec = head.querySelector('.gr-sec');
    const inv = head.parentElement;
    const grid = inv.querySelector('.gr-bag');
    // the real shell is 1920 wide: its phone labels/classes are rebuilt here
    if (v === 'a0') {
      const [b1, b2, chip] = [...head.querySelectorAll('.gr-best, .gr-chip')];
      b1.onclick = () => bestHero(ov); b2.onclick = () => bestAll(ov);
      chip.dataset.filter = 'chip';
      chip.onclick = () => { filterOn = !filterOn; applyFilter(ov); };
      chip.textContent = filterLabel();
    } else {
      head.replaceChildren(sec);
      if (v === 'a1') {
        head.classList.add('mk-a1');
        head.append(mkChip(ov));
        const s = el('div', 'mk-seg');
        s.setAttribute('role', 'group');
        s.setAttribute('aria-label', 'Equip best');
        const cap = el('span', 'cap', 'Best');
        const h = el('button', '', hero); h.type = 'button'; h.title = `Equip the best items for ${hero}`; h.onclick = () => bestHero(ov);
        const a = el('button', '', 'All'); a.type = 'button'; a.title = 'Equip best for the whole company'; a.dataset.tut = 'best'; a.onclick = () => bestAll(ov);
        s.append(cap, h, a);
        head.append(s);
      } else if (v === 'a2') {
        const s = el('div', 'mk-seg');
        s.setAttribute('role', 'group');
        s.setAttribute('aria-label', 'Show');
        for (const [val, label] of [['off', short() ? 'All' : 'All items'], ['on', short() ? 'Usable' : `Usable by ${hero}`]]) {
          const b = el('button', '', label); b.type = 'button'; b.dataset.filter = val;
          b.onclick = () => { filterOn = val === 'on'; applyFilter(ov); };
          s.append(b);
        }
        head.append(s);
        const foot = el('div', 'mk-foot');
        foot.append(el('span', 'cap', 'Equip best'));
        const b1 = el('button', 'gr-btn sm gr-best', hero); b1.type = 'button'; b1.title = `Equip the best items for ${hero}`; b1.onclick = () => bestHero(ov);
        const b2 = el('button', 'gr-btn sm gr-best pri', 'All'); b2.type = 'button'; b2.title = 'Equip best for the whole company'; b2.dataset.tut = 'best'; b2.onclick = () => bestAll(ov);
        foot.append(b1, b2);
        inv.append(foot);
      } else if (v === 'a3') {
        head.append(mkChip(ov));
        const wrap = el('div', 'mk-menuwrap');
        const btn = el('button', 'gr-btn sm gr-best', 'Equip best'); btn.type = 'button'; btn.setAttribute('aria-haspopup', 'menu');
        btn.append(el('i', 'mk-caret'));
        const menu = el('div', 'mk-menu'); menu.setAttribute('role', 'menu');
        const m1 = el('button', '', hero); m1.type = 'button'; m1.title = `Equip the best items for ${hero}`; m1.onclick = () => { menu.classList.remove('on'); bestHero(ov); };
        const m2 = el('button', '', 'Whole company'); m2.type = 'button'; m2.dataset.tut = 'best'; m2.onclick = () => { menu.classList.remove('on'); bestAll(ov); };
        menu.append(m1, m2);
        btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('on'); };
        ov.addEventListener('click', () => menu.classList.remove('on'));
        wrap.append(btn, menu);
        head.append(wrap);
      }
    }
    applyFilter(ov);
    // whole-row snap like the game's snapBagRows
    const snap = () => {
      grid.style.maxHeight = ''; if (grid.scrollHeight <= grid.clientHeight + 1) return;
      const cells = [...grid.children]; const next = cells.find((c) => c.offsetTop > cells[0].offsetTop + 1); if (!next) return;
      const cs = getComputedStyle(grid); const gap = parseFloat(cs.rowGap) || 0; const pitch = next.offsetTop - cells[0].offsetTop; const pt = parseFloat(cs.paddingTop) || 0; const pb = parseFloat(cs.paddingBottom) || 0;
      const rows = Math.max(1, Math.floor((grid.clientHeight - pt - pb + gap + 0.5) / pitch));
      grid.style.maxHeight = Math.floor(pt + rows * pitch - gap) + 'px';
    };
    new ResizeObserver(snap).observe(inv);
    snap();
  }

  /* ---- B: sheet ---- */
  function model(ov) {
    const rows = [...ov.querySelectorAll('.sh-row')];
    return rows.map((r) => ({
      id: r.dataset.stat, name: r.querySelector('.sh-k').textContent, val: r.querySelector('.sh-n').textContent,
      ico: r.querySelector('.sh-ico').getAttribute('src'), p: r.classList.contains('p'), pm: !!r.querySelector('.sh-pm'), group: r.closest('.sh-col').classList[1],
    }));
  }
  function row(m, cls = 'sh-row') {
    const r = el('div', cls + (m.p ? ' p' : ''));
    r.dataset.stat = m.id;
    const ico = el('img', 'sh-ico'); ico.src = m.ico; ico.alt = ''; ico.draggable = false;
    const k = el('span', 'sh-k', m.name);
    const val = el('span', 'v-val');
    const n = el('span', 'sh-n', m.val);
    const d = el('span', 'sh-d');
    if (worst && DELTAS[m.id]) { d.textContent = DELTAS[m.id]; d.classList.add(DELTAS[m.id].startsWith('-') ? 'down' : 'up'); r.dataset.delta = DELTAS[m.id]; }
    val.append(n, d);
    r.append(ico, k, val);
    if (m.pm) r.append(pm(m));
    return r;
  }
  function pm(m) {
    const w = el('span', 'sh-pm');
    const add = el('button', 'sh-pmb', '+'); add.type = 'button'; add.title = `Add a point to ${m.name}`;
    const sub = el('button', 'sh-pmb', '−'); sub.type = 'button'; sub.title = `Take back a point from ${m.name}`;
    if (!worst) { add.classList.add('off'); sub.classList.add('off'); add.disabled = sub.disabled = true; add.tabIndex = sub.tabIndex = -1; }
    w.append(add, sub);
    return w;
  }
  const LABEL = { base: 'Main', attack: 'Attack', defense: 'Defense' };
  function col(group, list, rowFn = row) {
    const c = el('div', 'sh-col ' + group);
    c.append(el('div', 'sh-sl', LABEL[group]));
    for (const m of list) c.append(rowFn(m));
    return c;
  }
  function tile(m) {
    const t = el('div', 'mk-tile' + (m.p ? ' p' : ''));
    t.dataset.stat = m.id;
    const top = el('div', 't-top');
    const ico = el('img', 'sh-ico'); ico.src = m.ico; ico.alt = ''; ico.draggable = false;
    top.append(ico, el('span', 'sh-k', m.name));
    const bot = el('div', 't-bot');
    const val = el('span', 'v-val'); const n = el('span', 'sh-n', m.val); const d = el('span', 'sh-d');
    if (worst && DELTAS[m.id]) { d.textContent = DELTAS[m.id]; d.classList.add('up'); t.dataset.delta = DELTAS[m.id]; }
    val.append(n, d);
    bot.append(val);
    if (m.pm) bot.append(pm(m));
    t.append(top, bot);
    return t;
  }
  function cell(m) {
    const t = el('div', 'mk-cell' + (m.p ? ' p' : ''));
    t.dataset.stat = m.id;
    const top = el('div', 'c-top');
    const ico = el('img', 'sh-ico'); ico.src = m.ico; ico.alt = ''; ico.draggable = false;
    top.append(ico, el('span', 'sh-k', m.name));
    const bot = el('div', 'c-bot');
    const val = el('span', 'v-val'); const n = el('span', 'sh-n', m.val); const d = el('span', 'sh-d');
    if (worst && DELTAS[m.id]) { d.textContent = DELTAS[m.id]; d.classList.add(DELTAS[m.id].startsWith('-') ? 'down' : 'up'); t.dataset.delta = DELTAS[m.id]; }
    val.append(n, d);
    bot.append(val);
    if (m.pm) bot.append(pm(m));
    t.append(top, bot);
    return t;
  }
  function buildB(ov, v) {
    const cols = ov.querySelector('.sh-cols');
    const data = model(ov);
    const by = (g) => data.filter((m) => m.group === g);
    if (v === 'b0') {
      if (worst) {
        for (const r of cols.querySelectorAll('.sh-row')) {
          const d = DELTAS[r.dataset.stat]; if (!d) continue;
          const e = r.querySelector('.sh-d'); e.textContent = d; e.classList.add(d.startsWith('-') ? 'down' : 'up'); r.dataset.delta = d;
          const p = r.querySelector('.sh-pm');
          if (p) for (const b of p.querySelectorAll('.sh-pmb')) { b.classList.remove('off'); b.disabled = false; b.removeAttribute('aria-hidden'); b.tabIndex = 0; }
        }
      }
      return;
    }
    // Reset / Confirm share the 'points' row (no separate idle row at the bottom)
    const under = ov.querySelector('.sh-under'), foot = ov.querySelector('.sh-foot');
    if (under && foot) { under.classList.add('mk-merged'); under.append(foot); }
    ov.querySelector('.gr-leaf-sheet').classList.add('mk-fill');
    const blk = el('div', 'mkb');
    if (v === 'b1') {
      blk.classList.add('mk-b1');
      blk.append(col('base', by('base')), col('attack', by('attack')), col('defense', by('defense')));
    } else if (v === 'b2') {
      blk.classList.add('mk-b2');
      const main = el('div', 'mk-main');
      const lab = el('div', 'sh-sl', 'Main');
      for (const m of by('base')) main.append(tile(m));
      const two = el('div', 'mk-two');
      two.append(col('attack', by('attack')), col('defense', by('defense')));
      const top = el('div'); top.style.display = 'flex'; top.style.flexDirection = 'column'; top.style.gap = '4px';
      top.append(lab, main);
      blk.append(top, two);
    } else if (v === 'b3') {
      blk.classList.add('mk-b3');
      for (const g of ['base', 'attack', 'defense']) {
        const band = el('div', 'mk-band' + (g === 'base' ? ' main' : ''));
        band.append(el('div', 'sl', LABEL[g]));
        for (const m of by(g)) band.append(cell(m));
        blk.append(band);
      }
    }
    cols.replaceWith(blk);
  }

  /* ---- render ---- */
  async function render() {
    const raw = location.hash.slice(1).split('&');
    const v = /^[ab][0-3]$/.test(raw[0]) ? raw[0] : 'a1';
    worst = raw.includes('worst');
    cur = v;
    fit();
    const isA = v[0] === 'a';
    const html = await get(isA ? 'shell-hero.html' : 'shell-sheet.html');
    if (!Object.keys(tips).length) tips = JSON.parse(await get('tips.json'));
    stage.innerHTML = html;
    const ov = stage.querySelector('.gr-overlay');
    ov.style.animation = 'none';
    if (isA) buildA(ov, v); else buildB(ov, v);
    wireTips(ov);
    // header tabs switch between the two mockup groups
    const tabs = ov.querySelectorAll('.gr-tab');
    if (tabs[0]) tabs[0].onclick = () => go('a1');
    if (tabs[1]) tabs[1].onclick = () => go('b1');
    buildBar();
  }
  addEventListener('hashchange', render);
  addEventListener('resize', render);
  render();
  window.__mk = { render };
})();
