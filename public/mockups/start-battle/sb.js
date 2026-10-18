/* START BATTLE? taslağı: oyun kodu DEĞİL. Veri oyunun kendi verisinden (data/campaign/valdoria.json düğümleri + encounters.json + nodeLevel). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#ui-root'), stage = $('#stage');
  const A = 'unified-inventory/avatars/';
  const SVG = {
    menu: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16 M4 12h5 M15 12h5 M4 18h16"/><path d="M12 9.2 l2.8 2.8 -2.8 2.8 -2.8 -2.8 z" stroke="#e0904a" fill="#e0702a" stroke-width="1"/></svg>',
    fs: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="round"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>',
  };
  // Düğümler: valdoria.json (pos = harita oranı). TYPE_LABEL: CampaignMapScene.
  const TL = { town: 'Town', battle: 'Battle', elite: 'Elite', boss: 'Boss', rest: 'Rest point', start: 'Battle' };
  const N = {
    '1': { name: 'Mill Road', type: 'battle', icon: 'start', pos: [0.146, 0.846] },
    '2': { name: 'Ravenwood', type: 'battle', icon: 'battle', pos: [0.224, 0.639] },
    '3': { name: 'Ruined Watchtower', type: 'elite', icon: 'elite', pos: [0.281, 0.407] },
    '4': { name: 'Ashford Village', type: 'town', icon: 'town', pos: [0.229, 0.231] },
    river: { name: 'Riverside Camp', type: 'rest', icon: 'rest', pos: [0.703, 0.477] },
    '9': { name: "King's Bridge", type: 'boss', icon: 'boss', pos: [0.677, 0.628] },
    '10': { name: 'Ashen Plain', type: 'battle', icon: 'battle', pos: [0.76, 0.731] },
  };
  // Karşılaşmalar: encounters.json (ravenwood_pack, watchtower_tutorial, bridge_warden); ad/ikon = enemyPreview + mobs avatarı; level = nodeLevel('valdoria', id)
  const E = {
    battle: { id: '2', prev: '1', next: '4', nextWord: null, subtitle: 'Battle · Outlaw Pack', level: 1, thenId: '3',
      foes: [{ cls: 'grey_wolf', name: 'Grey Wolf', n: 3 }, { cls: 'ravenwood_poacher', name: 'Ravenwood Poacher' }, { cls: 'raven_seer', name: 'Raven Seer' }],
      party: [{ cls: 'warrior', name: 'Warrior', lv: 1, hp: 1 }, { cls: 'archer', name: 'Archer', lv: 1, hp: 0.7 }], cx: 0.34 },
    elite: { id: '3', prev: '2', subtitle: 'Elite · Bandit Chief', level: 2, thenId: '4', leader: 'Bandit Chief',
      foes: [{ cls: 'bandit_chief', name: 'Bandit Chief', tier: 'elite' }, { cls: 'ravenwood_poacher', name: 'Ravenwood Poacher' }, { cls: 'ember_acolyte', name: 'Ember Acolyte' }],
      party: [{ cls: 'warrior', name: 'Warrior', lv: 2, hp: 0.85 }, { cls: 'archer', name: 'Archer', lv: 2, hp: 0.6 }], cx: 0.34 },
    boss: { id: '9', prev: 'river', subtitle: 'Boss · The Bridge Warden', level: 6, thenId: '10', leader: 'The Bridge Warden',
      foes: [{ cls: 'bridge_warden', name: 'The Bridge Warden', tier: 'boss' }, { cls: 'iron_mooring', name: 'Iron Mooring', n: 2 }],
      party: [{ cls: 'warrior', name: 'Warrior', lv: 6, hp: 1 }, { cls: 'archer', name: 'Archer', lv: 6, hp: 0.8 }, { cls: 'druid', name: 'Druid', lv: 6, hp: 0.55 }, { cls: 'mage', name: 'Mage', lv: 6, hp: 0.9 }], cx: 0.34 },
  };
  // Savaşsız düğüm örneği (yalnız v3): aynı kart, portre satırı yok, düğümün kendi eylemi (Enter); bilgi = düğüm lore'u
  E.town = { id: '4', prev: '3', subtitle: 'Town · Rest, Recruits, Trade', level: 1, thenId: '10', foes: [], place: { title: 'Enter town?', action: 'Enter', info: 'A quiet village of thatch and smoke, the last safe hearth before the road turns north toward the ash.' }, party: [] };
  E.battle.thenId = '3';
  const FORK = 'The other roads will close for this journey.';
  const VS = ['v1', 'v2', 'v3', 'v4', 'v5'];
  const VN = { v1: 'Classic', v2: 'Versus', v3: 'Anchored', v4: 'Dossier', v5: 'Banner' };
  const VT = { v1: 'Same window as today, with portraits', v2: 'Your party vs. foes', v3: 'Small card next to the node', v4: 'Side sheet with route', v5: 'Slim bottom banner' };
  const EN = ['battle', 'elite', 'boss', 'town'];
  let S = { v: 'v1', enc: 'elite', fork: false, shut: false };
  let key = '';

  function readHash() {
    const h = location.hash.replace(/^#/, '');
    S.fork = false;
    h.split('&').forEach((p) => {
      if (VS.includes(p)) S.v = p;
      else if (p.startsWith('enc=') && EN.includes(p.slice(4))) S.enc = p.slice(4);
      else if (p === 'fork' || p === 'fork=1') S.fork = true;
      else if (p === 'clean') document.documentElement.classList.add('mk-clean');
    });
    S.shut = false;
  }
  function writeHash() { history.replaceState(null, '', `#${S.v}&enc=${S.enc}${S.fork ? '&fork' : ''}${document.documentElement.classList.contains('mk-clean') ? '&clean' : ''}`); }

  const img = (kind, n) => `<img src="start-battle/${kind}/${n}.webp" alt="" draggable="false">`;
  const tag = (t) => (t === 'elite' ? '<i class="sb-tag">ELITE</i>' : t === 'boss' ? '<i class="sb-tag">BOSS</i>' : '');
  const foeTile = (f, lv, o = {}) => `<div class="sb-foe ${f.tier || ''}" tabindex="0" data-tip="${f.name}${f.n > 1 ? ' ×' + f.n : ''}${f.tier ? ' · ' + (f.tier === 'boss' ? 'Boss' : 'Elite') : ''} · Lv ${lv}">
    <div class="sb-face">${img('mobs', f.cls)}${f.n > 1 ? `<i class="cnt">${f.n}×</i>` : ''}${tag(f.tier)}</div>${o.noName ? '' : `<span class="sb-nm">${f.name}</span>`}<span class="sb-lv">Lv ${lv}</span></div>`;
  const heroTile = (h) => `<div class="sb-foe" tabindex="0" data-tip="${h.name} · Lv ${h.lv}">
    <div class="sb-face"><img src="${A}${h.cls}.webp" alt="" draggable="false"></div><span class="sb-nm">${h.name}</span><span class="sb-lv">Lv ${h.lv}</span><div class="sb-hp"><i class="${h.hp < 0.66 ? 'mid' : ''}" style="width:${Math.round(h.hp * 100)}%"></i></div></div>`;
  const ntile = (id) => `<div class="sb-ntile">${img('nodes', N[id].icon)}</div>`;
  const nextBits = (e) => { const t = N[e.thenId]; return { name: t.name, ty: TL[t.type], icon: t.icon }; };
  const thenLine = (e) => { const t = nextBits(e); return `<div class="sb-then"><span class="k">Then</span>${img('nodes', t.icon)}<b>${t.name}</b><span class="ty">(${t.ty})</span></div>`; };
  // v3: tek bilgi satırı = var olan oyun metni (önder düşmanın pasifi: data/mobs; boss: data/bosses > firstBanner). "Then" ve "diğer yollar kapanır" satırları YOK (Ömer).
  const INFO = { battle: ['Grey Wolf', 'Deals +15% damage for every other living Grey Wolf in the same row. Kill one and the rest grow weaker.'],
    elite: ['Bandit Chief', 'Whenever an ally dies, gains Fortified for 1 turn and +15% damage until the end of battle (stacks).'],
    boss: ['The Bridge Warden', '“None shall cross.”'] };
  const infoLine = (e) => { if (e.place) return `<p class="sb-info">${e.place.info}</p>`; const k = Object.keys(E).find((x) => E[x] === e); const [who, text] = INFO[k]; return `<p class="sb-info${k === 'boss' ? ' quote' : ''}"><b>${who}</b> ${text}</p>`; };
  const fightIcon = '<img src="start-battle/nodes/battle.webp" alt="">';
  const fight = (ico) => `<button class="el-btn primary ready" type="button" data-act="fight">${ico && !S.place ? fightIcon : ''}${S.place ? S.place.action : 'Fight'}</button>`;
  const cancel = '<button class="el-btn" type="button" data-act="cancel">Cancel</button>';
  const forkLine = (cls) => (S.fork ? `<p class="sb-note ${cls || ''}">${FORK}</p>` : '');

  function win(e, n) {
    const t = N[e.id], lv = e.level;
    S.place = e.place || null;
    const title = `<h2 class="sb-t">${e.place ? e.place.title : 'Start battle?'}</h2>`;
    const subHtml = `<p class="sb-sub">${t.name} · <b>${e.subtitle.split(' · ')[0]}</b>${e.subtitle.includes('·') ? ' · ' + e.subtitle.split(' · ')[1] : ''}</p>`;
    const foes = e.foes.map((f) => foeTile(f, lv)).join('');
    if (S.v === 'v1') return `<div class="sb-panel">
      <div class="sb-head">${ntile(e.id)}<div class="tx">${title}${subHtml}</div></div><hr class="sb-rule">
      <h3 class="sb-h">Foes<span class="r">Level ${lv}</span></h3><div class="sb-row">${foes}</div>
      ${thenLine(e)}${forkLine()}<div class="sb-acts">${cancel}${fight(false)}</div></div>`;
    if (S.v === 'v2') return `<div class="sb-panel">
      <div class="sb-hdr">${ntile(e.id)}<div class="tx">${title}${subHtml}</div></div><hr class="sb-rule">
      <div class="sb-vs"><div class="sb-side"><h3 class="sb-h">Your party<span class="r">${e.party.length} hero${e.party.length > 1 ? 'es' : ''}</span></h3><div class="sb-row">${e.party.map(heroTile).join('')}</div></div>
      <div class="sb-mid"><span>VS</span></div>
      <div class="sb-side"><h3 class="sb-h">Foes<span class="r">Level ${lv}</span></h3><div class="sb-row">${foes}</div></div></div>
      ${thenLine(e)}${forkLine()}<div class="sb-acts">${fight(true)}</div></div>`;
    if (S.v === 'v3') return `<div class="sb-panel"><i class="sb-notch l"></i><i class="sb-notch r"></i>
      <div class="sb-head">${ntile(e.id)}<div class="tx">${title}${subHtml}</div></div><hr class="sb-rule">
      ${e.foes.length ? `<div class="sb-row">${e.foes.map((f) => foeTile(f, lv, { noName: false })).join('')}</div>` : ''}
      ${infoLine(e)}<div class="sb-acts">${fight(true)}</div></div>`;
    if (S.v === 'v4') {
      const lead = e.foes.find((f) => f.tier) || e.foes[0];
      const rest = e.foes.filter((f) => f !== lead);
      const tn = nextBits(e);
      return `<div class="sb-panel">
        ${title}${subHtml}<hr class="sb-rule">
        <div class="sb-lead"><div class="sb-foe ${lead.tier || ''}" tabindex="0" data-tip="${lead.name}${lead.tier ? ' · ' + (lead.tier === 'boss' ? 'Boss' : 'Elite') : ''}"><div class="sb-face">${img('mobs', lead.cls)}${tag(lead.tier)}</div></div>
          <div class="tx"><span class="big">${lead.name}</span><span class="sb-lv">Lv ${lv}${lead.tier ? ' · ' + (lead.tier === 'boss' ? 'Boss' : 'Elite') : ''}</span></div></div>
        <h3 class="sb-h">With them<span class="r">Level ${lv}</span></h3><div class="sb-row">${rest.map((f) => foeTile(f, lv)).join('') || '<span class="sb-note">Fights alone</span>'}</div>
        <h3 class="sb-h">Route</h3><div class="sb-route"><div class="sb-step now">${ntile(e.id)}<div class="tx"><b>${t.name}</b><i>This battle · ${TL[t.type]}</i></div></div>
          <div class="sb-step">${img('nodes', tn.icon).replace('<img', '<img style="width:max(34px,calc(60*var(--u)));height:max(34px,calc(60*var(--u)));padding:6px;box-sizing:border-box;border:1px solid rgba(217,178,106,.3);background:#120c08"')}<div class="tx"><b>${tn.name}</b><i>Then · ${tn.ty}</i></div></div></div>
        ${forkLine()}<div class="sb-grow"></div><div class="sb-acts">${fight(true)}</div></div>`;
    }
    // v5 banner
    const tn = nextBits(e);
    return `<div class="sb-panel"><div class="sb-head">${ntile(e.id)}<div class="tx">${title}${subHtml}</div></div>
      <div class="sb-row">${e.foes.map((f) => foeTile(f, lv, { noName: false })).join('')}</div>
      <div class="sb-then"><span class="k">Then</span><span class="row">${img('nodes', tn.icon)}<b>${tn.name}</b></span><span class="ty">${tn.ty}</span></div>
      <div class="sb-acts">${fight(true)}</div>${S.fork ? `<p class="sb-note sb-fork">${FORK}</p>` : ''}</div>`;
  }

  function mapHtml(e) {
    const ids = [e.prev, e.id, e.thenId];
    const vw = innerWidth, vh = innerHeight;
    const W = Math.max(vw, vh * 1672 / 941), H = W * 941 / 1672;
    const t = N[e.id];
    const cx = S.v === 'v3' ? 0.3 : S.v === 'v4' ? 0.28 : 0.5;
    const cy = S.v === 'v5' ? 0.38 : 0.5;
    const L = Math.min(0, Math.max(vw - W, vw * cx - t.pos[0] * W));
    const T = Math.min(0, Math.max(vh - H, vh * cy - t.pos[1] * H));
    const pts = ids.map((i) => `${N[i].pos[0] * W},${N[i].pos[1] * H}`);
    const nodes = ids.map((i, k) => `<div class="sb-node${i === e.id ? ' target' : ''}${k === 0 ? ' cleared' : ''}" style="left:${N[i].pos[0] * 100}%;top:${N[i].pos[1] * 100}%">${img('nodes', N[i].icon)}<span class="lab">${N[i].name}</span></div>`).join('');
    return { html: `<div class="sb-map" style="left:${L}px;top:${T}px;width:${W}px;height:${H}px"><svg viewBox="0 0 ${W} ${H}"><path d="M${pts.join(' L')}"/></svg>${nodes}</div>`, px: [L + t.pos[0] * W, T + t.pos[1] * H] };
  }

  function render() {
    const e = E[S.enc];
    const k = `${S.v}|${S.enc}|${S.fork}`;
    const m = mapHtml(e);
    stage.className = `sb-${S.v}${S.shut ? ' sb-shut' : ''}`;
    root.innerHTML = `${m.html}<div class="sb-scrim" data-act="cancel"></div><div class="sb-win" data-v="${S.v}">${win(e)}</div>
      <button class="nav-btn settings-toggle fullscreen-toggle" type="button" title="Fullscreen" aria-label="Fullscreen" data-act="fs">${SVG.fs}</button>
      <button class="nav-btn settings-toggle" type="button" title="${S.shut ? 'Menu (Esc)' : 'Close (Esc)'}" aria-label="${S.shut ? 'Menu' : 'Close'}" data-act="${S.shut ? 'menu' : 'cancel'}">${S.shut ? SVG.menu : SVG.x}</button>
      <div class="mk-toast"></div>`;
    // giriş animasyonu yalnızca ilk açılışta / düzen değişince (hover ve yeniden boyutlandırma baştan çalıştırmaz)
    if (k !== key) { stage.classList.add('sb-in'); }
    key = k;
    if (S.v === 'v3') place(e, m.px);
    $('.sb-panel')?.classList.toggle('nofoes', !e.foes.length);
    strip();
  }
  function place(e, [nx, ny]) {
    const w = $('.sb-win'), vw = innerWidth, vh = innerHeight;
    const cw = w.offsetWidth, ch = w.offsetHeight, r = Math.max(13, 29 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu')));
    const lab = $('.sb-node.target .lab'), gap = Math.max(r + 22, (lab ? lab.offsetWidth / 2 : 0) + 14);
    let left = nx + gap, side = 'l';
    if (left + cw > vw - 10) { left = nx - gap - cw; side = 'r'; }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, ny - ch / 2));
    w.style.left = left + 'px'; w.style.top = top + 'px';
    const notch = $(`.sb-notch.${side}`, w), other = $(`.sb-notch.${side === 'l' ? 'r' : 'l'}`, w);
    other.style.display = 'none';
    notch.style.top = Math.max(18, Math.min(ch - 30, ny - top - 8)) + 'px';
  }
  function layout() {
    const w = innerWidth, h = innerHeight, de = document.documentElement;
    de.style.setProperty('--gu', `${Math.min(h / 1080, w / 1920)}px`);
    de.classList.toggle('short', h <= 520);
    de.classList.toggle('compact', h <= 720);
    de.classList.add('menu-btn-on');
    const coarse = matchMedia('(pointer: coarse)').matches;
    de.style.setProperty('--nav-k', String(coarse ? 1 : Math.min(1.75, Math.max(1, Math.round((h / 640) / 0.05) * 0.05))));
  }
  const toast = (msg) => { const t = $('.mk-toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); };
  function act(a) {
    if (a === 'cancel') { if (S.shut) return; S.shut = true; render(); toast('Closed: back to the map (backdrop / Esc / X = Cancel)'); }
    else if (a === 'fight') { toast(`${E[S.enc].place ? 'Heading into' : 'Marching to'} ${N[E[S.enc].id].name}... (mockup: ${E[S.enc].place ? 'the town screen would open' : 'battle would start'})`); }
    else if (a === 'fs') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}); }
    else if (a === 'menu') { toast('Menu (Esc): Resume · Save · Codex · Settings · Main Menu'); }
  }
  root.addEventListener('click', (ev) => { const b = ev.target.closest('[data-act]'); if (b) act(b.dataset.act); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') act('cancel');
    if (e.key === 'h' || e.key === 'H') { document.documentElement.classList.toggle('mk-clean'); writeHash(); }
  });

  function strip() {
    let s = $('#mk-strip');
    if (!s) {
      s = document.createElement('div'); s.id = 'mk-strip';
      s.innerHTML = `<b class="keep">MOCKUP</b>${VS.map((v) => `<button type="button" data-v="${v}" title="${VT[v]}">${v} ${VN[v]}</button>`).join('')}<span class="sep"></span>${EN.map((m) => `<button type="button" data-e="${m}">${m}</button>`).join('')}<span class="sep"></span><button type="button" data-x="fork" title="Show the fork warning line">fork</button><button type="button" data-x="open" title="Open the window again">Reopen</button><button type="button" data-x="clean" title="Hide strip (H)">Hide</button><button class="keep" type="button" data-x="min">–</button>`;
      s.addEventListener('click', (ev) => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.v) S.v = b.dataset.v; else if (b.dataset.e) S.enc = b.dataset.e;
        else if (b.dataset.x === 'fork') S.fork = !S.fork;
        else if (b.dataset.x === 'clean') { document.documentElement.classList.add('mk-clean'); writeHash(); return; }
        else if (b.dataset.x === 'min') { document.documentElement.classList.toggle('mk-strip-min'); return; }
        S.shut = false; writeHash(); key = ''; render();
      });
      document.body.append(s);
    }
    s.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v));
    s.querySelectorAll('[data-e]').forEach((b) => b.classList.toggle('on', b.dataset.e === S.enc));
    s.querySelector('[data-x=fork]').classList.toggle('on', S.fork);
  }
  readHash(); layout(); render();
  addEventListener('resize', () => { layout(); render(); });
  addEventListener('hashchange', () => { readHash(); key = ''; render(); });
  window.__sb = { S: () => S, render };
})();
