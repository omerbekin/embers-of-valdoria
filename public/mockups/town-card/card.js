/* Kasaba karti taslagi (oyun kodu DEGIL). Hash: #now #a #b #c  &t=ashford|valdren  &z=169|219|ph  &clean */
(() => {
  const P = 'town-card/';
  const root = document.documentElement;
  const bar = document.getElementById('mk-bar'), note = document.getElementById('mk-note'), view = document.getElementById('mk-view'), stage = document.getElementById('mk-stage');
  const parts = location.hash.slice(1).split('&');
  const q = new Map();
  parts.slice(1).forEach((p) => { const [k, v] = p.split('='); if (k) q.set(k, v === undefined ? '1' : v); });
  const SIZES = { '169': { w: 1920, h: 1080, label: '16:9', gu: 1 }, '219': { w: 2580, h: 1080, label: '21:9', gu: 1 }, ph: { w: 844, h: 390, label: 'Phone', gu: Math.min(844 / 2337, 390 / 1080) } };
  const S = {
    v: ['now', 'a', 'b', 'c'].includes(parts[0]) ? parts[0] : 'a',
    t: q.get('t') === 'valdren' ? 'valdren' : 'ashford',
    z: SIZES[q.get('z')] ? q.get('z') : (innerWidth < 900 ? 'ph' : '169'),
    clean: q.has('clean'),
  };
  root.classList.add(S.clean ? 'clean' : 'clean-off');

  /* gercek oyun metinleri (campaign.json > texts, kasaba verisi) */
  const T = {
    rest: 'Towns do not heal you. Leave tired heroes at the inn: each day they recover half their health and one wound. A day passes for every two battles you win. Pick them up in the same town. The fallen stay down: only Valor can raise them.',
    restShort: 'Towns do not heal you. Leave tired heroes at the inn.',
    innRule: "Leave a hero here and they leave your company. Each day they recover 50% health and 1 wound, and earn no experience. Only this town's inn can give them back.",
    innFoot: 'A day passes for every 2 battles you win.',
    first: 'Choose a companion.',
    waiting: 'A recruit waits at the Barracks',
    recruit: 'Fighters at the barracks offer their swords. Choose one companion, or come back before you leave.',
    notice: 'Notices of burned farms and missing travellers. No one here seeks to join a company. Recruits gather in the cities.',
    odo: 'Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.',
  };
  /* places: kartta gercekte townBlurb'un kullandigi hotspot adlari + fiiller (CampaignMapScene.ts > TOWN_VERB) */
  const TOWNS = {
    ashford: { name: 'Ashford Village', short: 'Ashford', sub: 'Town · Inn, Recruits, Trade', lore: 'A quiet village of thatch and smoke, the last safe hearth before the road turns north toward the ash.', art: 'town-ashford', pos: [0.1728, 0.5128], first: true,
      places: [{ n: 'Inn', v: 'rest', ic: 'inn', tip: 'inn' }, { n: 'Notice Board', v: 'recruit', ic: 'battle', tip: 'notice' }, { n: "Odo's Stall", v: 'trade', ic: 'merchant', tip: 'trade' }] },
    valdren: { name: 'Valdren Keep', short: 'Valdren', sub: 'City · Inn, Smith, Recruits, Trade', lore: "Valdren Keep still flies the king's banner, though its soldiers stopped waiting for his return long ago.", art: 'town-valdren', pos: [0.52, 0.42], first: false, waiting: true,
      places: [{ n: 'Smith', v: 'forge your gear', ic: 'rest', tip: 'smith' }, { n: 'Inn', v: 'rest', ic: 'inn', tip: 'inn' }, { n: 'Barracks', v: 'recruit', ic: 'battle', tip: 'barracks' }, { n: "Odo's Stall", v: 'trade', ic: 'merchant', tip: 'trade' }] },
  };
  const TIPS = {
    inn: { kind: 'Town · Rest', title: 'Inn', ico: 'inn', ac: '#e0702a', lines: [T.innRule, T.innFoot] },
    trade: { kind: 'Town · Trade', title: "Odo's Stall", ico: 'merchant', ac: '#9fc4a0', lines: [T.odo] },
    barracks: { kind: 'Town · Recruits', title: 'Barracks', ico: 'battle', ac: '#cdb67f', lines: [T.recruit] },
    notice: { kind: 'Town · Recruits', title: 'Notice Board', ico: 'battle', ac: '#cdb67f', lines: [T.notice] },
    smith: { kind: 'Town', title: 'Smith', ico: 'rest', ac: '#d9a53a', lines: ['Forge your gear.'] },
  };
  /* ORNEK durum (kayit degil): B varyantinin kadro satirlari */
  const CLS = { warrior: 'Warrior', paladin: 'Paladin' };
  const EX = {
    ashford: { road: [{ c: 'warrior', lv: 1, hp: 1, w: 0 }], inn: [] },
    valdren: { road: [{ c: 'warrior', lv: 4, hp: 0.62, w: 1 }], inn: [{ c: 'paladin', lv: 4, hp: 0.4, w: 1, days: 2 }] },
  };

  const NOTES = [
    ['now', 'Bugün', 'savaş kartının aynısı; uzun dinlenme kuralı 3 satırda kesiliyor, ilk ziyarette düğme "Continue" (neye devam, belli değil).'],
    ['a', 'A Hizmetler (öneri)', 'düğme "Enter town" (ilk ziyaret: "Choose companion"); kasabanın yerleri plaka, kural tek satır, tam kural Inn plakasının üstüne gelince.'],
    ['b', 'B Kadro durumu', 'düğme "Enter Ashford" (kasaba adı); kasaba resmi + kadronun durumu (can, yara, Inn içinde bekleyen); kadro verisi örnek.'],
    ['c', 'C Kısa tabela', 'düğme "Enter"; lore + küçük etiketler, dinlenme kuralı kartta hiç yok (Inn etiketinin ipucunda); yenilik tek turuncu satırda.'],
  ];

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ic = (n) => `${P}ic/${n}.webp`;
  const k = () => Number(stage.dataset.k || 1);
  let lastPtr = 'mouse';
  const touchMode = () => lastPtr === 'touch' || S.z === 'ph';

  /* ---- A Band ipucu (town-ui/mock.js'ten) ---- */
  const tipHtml = (t) => `<div class="bt" style="--ac:${t.ac}"><div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(&quot;${ic(t.ico)}&quot;)"></span><div class="bt-ht"><div class="bt-kind">${esc(t.kind)}</div><div class="bt-title">${esc(t.title)}</div></div></div><div class="bt-div"></div><div class="bt-body">${t.lines.map((l) => `<div class="bt-ln"><span class="dia"></span><div class="tx">${esc(l)}</div></div>`).join('')}</div></div>`;
  let tipEl = null, pinned = null;
  function showTip(key, target) {
    const t = TIPS[key];
    if (!t || !tipEl) return;
    tipEl.innerHTML = tipHtml(t); tipEl.classList.add('on');
    const st = stage.getBoundingClientRect(), r = target.getBoundingClientRect(), s = k();
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight, W = st.width / s, H = st.height / s;
    const tl = (r.left - st.left) / s, tr = (r.right - st.left) / s, tt = (r.top - st.top) / s, tb = (r.bottom - st.top) / s;
    let x = (tl + tr) / 2 - w / 2, y = tb + 8;
    if (y + h > H - 6) y = tt - h - 8;
    x = Math.max(6, Math.min(W - w - 6, x)); y = Math.max(6, Math.min(H - h - 6, y));
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('on'); pinned = null; stage.querySelectorAll('.pin').forEach((e) => e.classList.remove('pin')); }

  /* ---- ortak ---- */
  const head = (name, sub) => `<div class="sbc-head"><div class="sbc-ntile"><img src="${ic('town')}" alt="" draggable="false"></div><div class="tx"><h2 class="sbc-t">${esc(name)}</h2><p class="sbc-sub"><b>${esc(sub)}</b></p></div></div>`;
  const rule = '<hr class="sbc-rule">';
  const btn = (label) => `<div class="sbc-acts"><button class="el-btn primary ready" type="button">${esc(label)}</button></div>`;
  const shell = (cls, inner) => `<div class="sbc"><div class="sbc-scrim"></div><i class="sbc-ring"></i><div class="sbc-card tc ${cls}"><i class="sbc-notch l"></i><i class="sbc-notch r"></i>${inner}</div></div>`;
  const first = (tw) => (tw.first ? `<p class="tc-first"><b>First</b>${esc(T.first)}</p>` : '');
  const waitFlag = (tw) => (tw.waiting ? `<div class="tc-flag">${esc(T.waiting)}</div>` : '');

  function card() {
    const tw = TOWNS[S.t];
    if (S.v === 'now') {
      return shell('nofoes', `${head(tw.name, tw.sub)}${rule}<p class="sbc-info">${esc(T.rest)}</p>${first(tw)}${btn(tw.first ? 'Continue' : 'Enter')}`);
    }
    if (S.v === 'a') {
      const svc = tw.places.map((p) => `<button type="button" data-bt="${p.tip}"><img src="${ic(p.ic)}" alt="" draggable="false"><span><b>${esc(p.n)}</b><i>${esc(p.v)}</i></span></button>`).join('');
      return shell('wide', `${head(tw.name, tw.sub)}${rule}<p class="sbc-info tc-lore-ph">${esc(tw.lore)}</p><div class="tc-svc">${svc}</div>${waitFlag(tw)}<p class="tc-hint">${esc(T.restShort)}</p>${first(tw)}${btn(tw.first ? 'Choose companion' : 'Enter town')}`);
    }
    if (S.v === 'b') {
      const ex = EX[S.t];
      const row = (h, inn) => `<div class="tc-hero${inn ? ' inn' : ''}"><span class="face" style="background-image:url(${P}av/${h.c}.webp)"></span><span class="nm">${CLS[h.c]}</span><span class="bar${h.hp < 0.4 ? ' low' : ''}"><i style="width:${Math.round(h.hp * 100)}%"></i></span><span class="m">${Math.round(h.hp * 100)}% HP${h.w ? ` · ${h.w} wound${h.w > 1 ? 's' : ''}` : ''}${inn ? ` · <em>${h.days === 0 ? 'Fully healed' : `Fully healed in ${h.days} days`}</em>` : ''}</span></div>`;
      const hurt = ex.road.some((h) => h.hp < 1 || h.w);
      const rows = ex.road.map((h) => row(h, false)).join('') + ex.inn.map((h) => row(h, true)).join('');
      const adv = ex.inn.length ? 'Pick up the hero at the inn here, in the same town.' : hurt ? 'Tired heroes can rest at the inn.' : '';
      const post = `<div class="tc-post" style="background-image:url(${P}art/${tw.art}.webp)"><div class="over"><div class="sbc-ntile"><img src="${ic('town')}" alt="" draggable="false"></div><div class="tx"><h2 class="sbc-t">${esc(tw.name)}</h2><p class="sbc-sub"><b>${esc(tw.sub)}</b></p></div></div></div>`;
      return shell('wide', `${post}<div class="tc-co"><span class="tc-lab">Your company</span>${rows}</div>${adv ? `<p class="tc-hint">${esc(adv)}</p>` : ''}${waitFlag(tw)}${first(tw)}${btn(tw.first ? 'Choose companion' : `Enter ${tw.short}`)}`);
    }
    const chips = tw.places.map((p) => `<span class="sbc-tag" tabindex="0" data-bt="${p.tip}"><img src="${ic(p.ic)}" alt="">${esc(p.n)}</span>`).join('');
    const flag = tw.first ? `<div class="tc-flag">${esc(T.first)}</div>` : tw.waiting ? waitFlag(tw) : '';
    return shell('', `${head(tw.name, tw.sub)}${rule}<div class="tc-c"><div class="l"><p class="sbc-info tc-lore-ph">${esc(tw.lore)}</p><div class="tc-chips">${chips}</div>${flag}</div></div>${btn(tw.first ? 'Choose companion' : 'Enter')}`);
  }

  function mapView() {
    const tw = TOWNS[S.t], pos = tw.pos, zw = SIZES[S.z].w, zh = SIZES[S.z].h;
    const iw = 1672, ih = 941, zoom = S.z === 'ph' ? 1.55 : 1.4;
    const sc = Math.max(zw / iw, zh / ih) * zoom, w = iw * sc, h = ih * sc;
    let x = zw * (S.z === 'ph' ? 0.26 : 0.3) - pos[0] * w, y = zh * 0.5 - pos[1] * h;
    x = Math.min(0, Math.max(zw - w, x)); y = Math.min(0, Math.max(zh - h, y));
    const ax = x + pos[0] * w, ay = y + pos[1] * h;
    stage.innerHTML = `<div class="tn-map"><img class="bg" src="${P}art/map.webp" alt="" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="tn-marker" style="left:${ax}px;top:${ay}px"><img src="${ic('town')}" alt=""></div><div class="tn-nname" style="left:${ax}px;top:calc(${ay}px + 36 * var(--u) + 6px)">${tw.name}</div></div>${card()}<div class="tn-tip"></div>`;
    tipEl = stage.querySelector('.tn-tip');
    const go2 = () => placeCard(ax, ay);
    go2(); requestAnimationFrame(go2); setTimeout(go2, 250); setTimeout(go2, 700);
  }
  function placeCard(ax, ay) {
    const wrap = stage.querySelector('.sbc');
    if (!wrap) return;
    const c = wrap.querySelector('.sbc-card'), ring = wrap.querySelector('.sbc-ring'), nl = wrap.querySelector('.sbc-notch.l'), nr = wrap.querySelector('.sbc-notch.r');
    const vw = wrap.clientWidth, vh = wrap.clientHeight, cw = c.offsetWidth, ch = c.offsetHeight, gu = SIZES[S.z].gu;
    const r = Math.max(13, 29 * gu), gap = r + Math.max(14, 20 * gu);
    let left = ax + gap, side = 'l';
    if (left + cw > vw - 10) { left = ax - gap - cw; side = 'r'; }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, ay - ch / 2));
    c.style.left = left + 'px'; c.style.top = top + 'px';
    (side === 'l' ? nr : nl).style.display = 'none'; (side === 'l' ? nl : nr).style.display = '';
    (side === 'l' ? nl : nr).style.top = Math.max(18, Math.min(ch - 30, ay - top - 8)) + 'px';
    wrap.style.setProperty('--ax', ax + 'px'); wrap.style.setProperty('--ay', ay + 'px'); wrap.style.setProperty('--ar', Math.round(r * 1.5) + 'px');
    ring.style.left = ax + 'px'; ring.style.top = ay + 'px'; ring.style.width = ring.style.height = r * 2 + 'px';
    stage.dataset.fit = (top >= 0 && top + ch <= vh && left >= 0 && left + cw <= vw) ? 'ok' : 'cut';
    stage.dataset.cardH = String(Math.round(ch)); stage.dataset.cardW = String(Math.round(cw));
  }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  function buildBar() {
    bar.replaceChildren();
    if (S.clean) { bar.style.display = 'none'; note.style.display = 'none'; return; }
    const add = (label, on, fn) => { const b = el('button', on ? 'on' : '', label); b.onclick = fn; bar.append(b); };
    for (const [v, l] of [['a', 'A'], ['b', 'B'], ['c', 'C'], ['now', 'Now']]) add(l, S.v === v, () => go({ v }));
    bar.append(el('span', 'sep'));
    for (const [t, l] of [['ashford', 'Ashford (first visit)'], ['valdren', 'Valdren']]) add(l, S.t === t, () => go({ t }));
    bar.append(el('span', 'sep'));
    for (const z of ['169', '219', 'ph']) add(SIZES[z].label, S.z === z, () => go({ z }));
    note.innerHTML = NOTES.map(([v, name, txt]) => `<div class="${v === S.v ? 'on' : ''}"><b>${name}:</b> ${txt}</div>`).join('');
  }
  function go(o) { Object.assign(S, o); history.replaceState(null, '', `#${S.v}&t=${S.t}&z=${S.z}${S.clean ? '&clean' : ''}`); render(); }
  function fit() {
    const z = SIZES[S.z];
    view.style.top = S.clean ? '0px' : (48 + note.offsetHeight) + 'px';
    stage.style.width = z.w + 'px'; stage.style.height = z.h + 'px'; stage.style.setProperty('--gu', z.gu + 'px');
    for (const kk of ['--el', '--er', '--et', '--eb']) stage.style.setProperty(kk, '0px');
    root.classList.toggle('short', S.z === 'ph'); root.classList.toggle('compact', S.z === 'ph');
    const kk = Math.min(view.clientWidth / z.w, view.clientHeight / z.h, S.z === 'ph' ? 2.4 : 1);
    stage.style.transform = `scale(${kk})`; stage.dataset.k = String(kk);
  }
  function render() { buildBar(); fit(); pinned = null; mapView(); wire(); }
  function wire() {
    stage.querySelectorAll('[data-bt]').forEach((e) => {
      e.addEventListener('mouseenter', () => { if (!touchMode()) showTip(e.dataset.bt, e); });
      e.addEventListener('mouseleave', () => { if (!touchMode() && pinned !== e.dataset.bt) tipEl && tipEl.classList.remove('on'); });
      e.addEventListener('focus', () => showTip(e.dataset.bt, e));
      e.addEventListener('blur', () => tipEl && tipEl.classList.remove('on'));
      e.addEventListener('click', () => { if (!touchMode()) return; const was = pinned === e.dataset.bt; hideTip(); if (!was) { pinned = e.dataset.bt; e.classList.add('pin'); showTip(e.dataset.bt, e); } });
    });
  }
  stage.addEventListener('pointerdown', (ev) => { lastPtr = ev.pointerType === 'touch' ? 'touch' : 'mouse'; if (touchMode() && !ev.target.closest('[data-bt]')) hideTip(); });
  window.addEventListener('resize', () => { fit(); const a = stage.querySelector('.tn-marker'); if (a) placeCard(parseFloat(a.style.left), parseFloat(a.style.top)); });
  window.addEventListener('hashchange', () => location.reload());
  render();
})();
