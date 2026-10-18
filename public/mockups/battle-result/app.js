/* Savas sonu ekrani taslagi: oyun kodu degil. Sayilar ornek veridir (oyun BattleStats'tan okur). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const S = { u: 1, phone: false, clean: false, v: 'all', first: true };
  const av = (n) => `battle-result/av/${n}.webp`, cls = (n) => `battle-result/cls/${n}.webp`, ic = (n) => `battle-result/ic/${n}.webp`;
  const CROSS = '<svg viewBox="0 0 12 12"><path d="M5 0h2v4h4v2H7v6H5V6H1V4h4z" fill="#8d8070"/></svg>';
  const STAR = '<svg viewBox="0 0 12 12"><path d="M6 0l1.6 4.4L12 6 7.6 7.6 6 12 4.4 7.6 0 6l4.4-1.6z" fill="#2a1405"/></svg>';
  const SWORDS = '<svg viewBox="0 0 64 64"><g fill="none" stroke="#f3d999" stroke-width="3" stroke-linejoin="round"><path d="M14 10l30 30M50 10L20 40"/><path d="M40 36l8 8M24 36l-8 8" stroke-width="4"/><path d="M44 44l-5 5M20 44l5 5" stroke-width="5"/></g><path d="M32 4l4 5-4 4-4-4z" fill="#e0702a"/></svg>';
  const BROKEN = '<svg viewBox="0 0 64 64"><g fill="none" stroke="#d88a7e" stroke-width="3" stroke-linejoin="round"><path d="M32 6v28M24 34h16M32 34v8"/><path d="M28 44l-4 14M36 44l4 14" stroke-width="4"/></g><path d="M32 60l4-5-4-4-4 4z" fill="#8a3a32"/></svg>';

  // ----- ornek veri (rakamlar tutarli: takim "dealt" toplami = karsi takim "taken" toplami) -----
  const P = (n, k, hp, mx, d, t, h, o = {}) => ({ n, k, hp, mx, d, t, h, ...o });
  const SC = {
    s1: { win: true, turns: 9, sub: 'The enemy line is broken', rh: 104, party: [P('Warrior', 'warrior', 70, 108, 90, 59, 21, { cls: 'warrior', mvp: 1 })],
      foe: [P('Cutpurse', 'cutpurse', 0, 0, 21, 36, 1), P('Road Thug', 'road_thug', 0, 0, 38, 54, 4)],
      x: { dealt: 90, taken: 59, big: 31, who: 'Warrior · Whirlwind', crit: 2, block: 0, dodge: 1 } },
    s2: { win: true, turns: 14, sub: 'The enemy line is broken', rh: 74,
      party: [P('Warrior', 'warrior', 64, 118, 212, 148, 0, { cls: 'warrior', mvp: 1 }), P('Druid', 'druid', 71, 84, 96, 40, 128, { cls: 'druid' }), P('Hexer', 'hexer-hood', 0, 72, 148, 91, 0, { cls: 'hexer' }), P('Archer', 'archer', 49, 76, 187, 22, 0, { cls: 'archer' })],
      foe: [P('Cutthroat', 'cutthroat', 0, 0, 74, 128, 0), P('Bandit Crossbowman', 'bandit_crossbowman', 0, 0, 52, 96, 0), P('Grey Wolf', 'grey_wolf', 0, 0, 61, 104, 0), P('Road Thug', 'road_thug', 0, 0, 66, 131, 0), P('Cutpurse', 'cutpurse', 0, 0, 18, 84, 0), P('Bandit Chief', 'bandit_chief', 0, 0, 30, 100, 14)],
      x: { dealt: 643, taken: 301, big: 58, who: 'Warrior · Headsman\'s Blow', crit: 7, block: 3, dodge: 5 } },
    s3: { win: false, turns: 11, sub: 'Your party has fallen', rh: 84,
      party: [P('Warrior', 'warrior', 0, 118, 98, 140, 0, { cls: 'warrior' }), P('Druid', 'druid', 0, 84, 44, 83, 61, { cls: 'druid' }), P('Hexer', 'hexer-hood', 0, 72, 120, 96, 0, { cls: 'hexer' }), P('Archer', 'archer', 0, 76, 71, 88, 0, { cls: 'archer' })],
      foe: [P('Cutthroat', 'cutthroat', 38, 134, 140, 96, 0), P('Bandit Crossbowman', 'bandit_crossbowman', 0, 0, 112, 81, 0), P('Grey Wolf', 'grey_wolf', 20, 108, 95, 88, 0), P('Road Thug', 'road_thug', 0, 0, 60, 68, 0)],
      x: { dealt: 333, taken: 407, big: 44, who: 'Hexer', crit: 3, block: 1, dodge: 2 } },
  };
  const NAMES = { s1: 'Zafer · 1 kahraman, 2 düşman (şu anki ekranla aynı veri)', s2: 'Zafer · 4 kahraman (biri düşmüş), 6 düşman', s3: 'Yenilgi · 4 kahraman, 4 düşman' };
  const sum = (a, k) => a.reduce((s, u) => s + u[k], 0);
  const num = (n, cls) => (n > 0 ? `<span class="num ${cls}">${n}</span>` : '<span class="num zero">-</span>');

  const plaque = (d) => {
    const stand = d.party.filter((u) => u.hp > 0).length;
    return `<div class="pl"><div class="pl-top"><span>Battle result</span><span>${d.win ? 'Campaign' : 'Quick Battle'}</span></div>
    <div class="pl-main"><div class="emb">${d.win ? SWORDS : BROKEN}</div>
      <div class="pl-t"><h1>${d.win ? 'Victory' : 'Defeat'}</h1><div class="orn"><i></i><b></b><i></i></div><p>${d.sub}</p></div>
      <div class="pl-v"><div class="pv"><img src="${ic('cooldown')}" alt=""><div><b>${d.turns}</b><small>Turns</small></div></div>
      <div class="pv"><img src="${ic('hp')}" alt=""><div><b>${stand} / ${d.party.length}</b><small>Standing</small></div></div></div></div></div>`;
  };
  const mvpOf = (d) => (d.win ? d.party.reduce((b, u) => (!b || u.d > b.d ? u : b), null) : null);
  const bar = () => `<div class="bar"><button class="cp" title="Copies the full match log to the clipboard"><img src="${ic('combatLog')}" alt=""><span>Copy match data</span></button>
    <div class="go"><span class="key"><b>Enter</b>Continue</span><button class="cont">Continue</button></div></div>`;
  const hpBar = (u, en, icon) => { const z = u.hp <= 0; return `<div class="hp ${en ? 'en' : ''} ${z ? 'z' : ''}">${z ? '' : `<i style="width:${Math.max(3, (u.hp / u.mx) * 100)}%"></i>`}<span>${z ? '0' : `${u.hp} / ${u.mx}`}</span></div>`; };
  const pf = (u, size, left) => `<div class="pf" style="${size ? `width:${size}px;height:${size}px` : ''}"><img class="a" src="${av(u.k)}" alt="">${u.hp <= 0 && left ? `<span class="cr">${CROSS}</span>` : u.cls ? `<span class="cl"><img src="${cls(u.cls)}" alt=""></span>` : ''}</div>`;
  const tag = (u, mvp) => (mvp === u ? `<span class="tg mvp">${STAR}MVP</span>` : u.hp <= 0 ? `<span class="tg fall">Fallen</span>` : '');
  const metric = (u, k, key, tot) => { const v = u[k]; return `<div class="m ${key} ${v ? '' : 'zero'}" title="${{ d: 'Damage dealt', t: 'Damage taken', h: 'Healing done' }[k]}"><div class="v"><img src="${ic({ d: 'str', t: 'armor', h: 'hpRegen' }[k])}" alt="">${num(v, key)}</div><div class="sh"><i style="width:${tot ? Math.round((v / tot) * 100) : 0}%"></i></div></div>`; };
  const colHead = (txt, win, w) => `<div class="hd ${win ? '' : 'lose'}"><h3>${txt}</h3><span class="ln"></span></div>`;
  const colLbls = (w) => `<div class="cols"><span style="width:${w}px"><img src="${ic('str')}" alt="">Dealt</span><span style="width:${w}px"><img src="${ic('armor')}" alt="">Taken</span><span style="width:${w}px"><img src="${ic('hpRegen')}" alt="">Healed</span></div>`;
  const unit = (u, side, mvp, tots) => `<div class="u ${mvp === u ? 'mvp' : ''} ${u.hp <= 0 ? 'fall' : ''}">${pf(u, 0, true)}<div class="id"><div class="nm">${u.n}</div>${tag(u, mvp)}</div>${hpBar(u, side === 'foe')}<span class="sp"></span>${metric(u, 'd', 'dealt', tots.d)}${metric(u, 't', 'taken', tots.t)}${metric(u, 'h', 'healed', tots.h)}</div>`;
  const tots = (a) => ({ d: sum(a, 'd'), t: sum(a, 't'), h: sum(a, 'h') });
  const strip = (d) => { const x = d.x; return `<div class="strip">
    <div><img src="${ic('str')}" alt=""><span><small>Damage dealt</small><b class="dealt">${x.dealt}</b></span></div>
    <div><img src="${ic('armor')}" alt=""><span><small>Damage taken</small><b class="taken">${x.taken}</b></span></div>
    <div><img src="${ic('might')}" alt=""><span><small>Biggest hit</small><b>${x.big}</b><em>${x.who}</em></span></div>
    <div><img src="${ic('critChance')}" alt=""><span><small>Critical hits</small><b>${x.crit}</b></span></div>
    <div><img src="${ic('armor')}" alt=""><span><small>Blocked</small><b>${x.block}</b></span></div>
    <div><img src="${ic('evasion')}" alt=""><span><small>Dodged</small><b>${x.dodge}</b></span></div></div>`; };
  const stage = (d, v, body) => `<div class="fit"><div class="stage ${v} ${d.win ? 'victory' : 'defeat'} ${S.first ? 'in' : ''}">${plaque(d)}${body}${bar()}</div></div>`;

  // ----- varyant A -----
  const A = (d) => { const mvp = mvpOf(d); const rh = d.rh; const rows = Math.max(3, d.party.length, d.foe.length);
    const col = (arr, side, title, win) => `<div class="panel">${colHead(title, win)}${colLbls(92)}<div class="rows" style="--rh:${rh}px">${arr.map((u) => unit(u, side, mvp, tots(arr))).join('')}</div></div>`;
    return `<div class="area"><div class="two">${col(d.party, 'party', 'Your party', d.win)}${col(d.foe, 'foe', 'Enemy', !d.win)}</div>${strip(d)}</div>`; };
  // ----- varyant B -----
  const B = (d) => { const mvp = mvpOf(d); const rh = d.rh;
    const col = (arr, side, title, win) => `<div class="panel t">${colHead(title, win)}${colLbls(80)}<div class="rows" style="--rh:${rh}px">${arr.map((u) => unit(u, side, mvp, tots(arr))).join('')}</div></div>`;
    const x = d.x, pd = sum(d.party, 'd'), ed = sum(d.foe, 'd'), tt = Math.max(1, pd + ed);
    const st = (i, l, v, e) => `<div class="st"><img src="${ic(i)}" alt=""><span><small>${l}</small><b>${v}</b></span>${e ? `<em>${e}</em>` : ''}</div>`;
    const spine = `<div class="panel spine"><h4>Battle totals</h4><div class="tug"><div class="l"><span>Your damage</span><b class="dealt">${pd}</b></div><div class="bar2"><i class="p" style="width:${(pd / tt) * 100}%"></i><i class="e" style="width:${(ed / tt) * 100}%"></i></div><div class="l"><span>Enemy damage</span><b class="taken">${ed}</b></div></div>
      ${st('might', 'Biggest hit', x.big, x.who.split(' · ')[0])}${st('critChance', 'Critical hits', x.crit)}${st('armor', 'Blocked', x.block)}${st('evasion', 'Dodged', x.dodge)}</div>`;
    return `<div class="area"><div class="three">${col(d.party, 'party', 'Your party', d.win)}${spine}${col(d.foe, 'foe', 'Enemy', !d.win)}</div></div>`; };
  // ----- varyant C -----
  const C = (d) => { const mvp = mvpOf(d); const tp = tots(d.party);
    const mr = (u, k, key, tot) => `<div class="mr ${key} ${u[k] ? '' : 'zero'}" title="${{ d: 'Damage dealt', t: 'Damage taken', h: 'Healing done' }[k]}"><img src="${ic({ d: 'str', t: 'armor', h: 'hpRegen' }[k])}" alt=""><span class="sh"><i style="width:${tot ? Math.round((u[k] / tot) * 100) : 0}%"></i></span>${u[k] ? `<b class="${key}">${u[k]}</b>` : '<b>-</b>'}</div>`;
    const hero = (u) => `<div class="hc ${mvp === u ? 'mvp' : ''} ${u.hp <= 0 ? 'fall' : ''}"><div class="top">${pf(u, 0, true)}<div><div class="nm">${u.n}</div>${tag(u, mvp)}</div></div>${hpBar(u, false)}<div class="ms">${mr(u, 'd', 'dealt', tp.d)}${mr(u, 't', 'taken', tp.t)}${mr(u, 'h', 'healed', tp.h)}</div></div>`;
    const foe = (u) => `<div class="fp ${u.hp <= 0 ? 'fall' : ''}"><div class="r1">${pf(u, 0, true)}<div class="nm">${u.n}</div></div>${u.hp > 0 ? hpBar(u, true) : ''}<div class="r2"><span class="dealt" title="Damage dealt"><img src="${ic('str')}" alt="">${u.d}</span><span class="taken" title="Damage taken"><img src="${ic('armor')}" alt="">${u.t}</span><span class="${u.h ? 'healed' : 'zero'}" title="Healing done"><img src="${ic('hpRegen')}" alt="">${u.h || '-'}</span></div></div>`;
    return `<div class="area"><div><div class="hd ${d.win ? '' : 'lose'}"><h3>Your party</h3><span class="ln"></span></div><div class="heroes">${d.party.map(hero).join('')}</div></div>
      <div><div class="hd ${d.win ? 'lose' : ''}"><h3>Enemy</h3><span class="ln"></span></div><div class="foes">${d.foe.map(foe).join('')}</div></div>${strip(d)}</div>`; };

  // ----- mevcut hal (birebir) -----
  const CUR = (d) => { const mvp = mvpOf(d);
    const rw = (u, side) => `<div class="rw ${mvp === u ? 'mvp' : ''} ${u.hp <= 0 ? 'fall' : ''}"><div class="f"><img src="${av(u.k)}" alt=""></div><div class="nn">${u.n}<i class="${mvp === u ? 'm' : ''}">${mvp === u ? 'MVP' : u.hp <= 0 ? 'Fallen' : ''}</i></div><div class="hb ${side === 'foe' ? 'en' : ''}"><div>${u.hp > 0 ? `<i style="width:${(u.hp / u.mx) * 100}%"></i>` : ''}</div>${u.hp > 0 ? `${u.hp} / ${u.mx}` : 0}</div>
      <div class="n" style="color:var(--dealt)">${u.d || '-'}</div><div class="n" style="color:var(--taken)">${u.t || '-'}</div><div class="n" style="color:var(--healed)">${u.h || '-'}</div></div>`;
    const c = (arr, side, t) => `<div class="c"><h4>${t}</h4><div class="lb"><span>DEALT</span><span>TAKEN</span><span>HEALED</span></div>${arr.map((u) => rw(u, side)).join('')}</div>`;
    const stand = d.party.filter((u) => u.hp > 0).length;
    return `<div class="fit"><div class="stage cur ${d.win ? 'victory' : 'defeat'}"><div class="pl"><div class="t">${d.win ? 'Victory' : 'Defeat'}</div><div class="o"></div><div class="s1">${d.sub}</div><div class="s2">${d.turns} turns &nbsp;·&nbsp; ${stand} of ${d.party.length} heroes standing</div></div>
    <div class="sm">${c(d.party, 'party', 'Your party')}${c(d.foe, 'foe', 'Enemy')}</div><div class="btn">CONTINUE</div><div class="ft">Enter: Continue <b>◆</b> Copy match data</div></div></div>`; };

  const VAR = [
    ['cur', 'Mevcut hal', 'Oyundaki ekranın aynısı (result-screen.ts): plaket, iki sütun tablo, büyük boş alan, ortada CONTINUE, altta italik ipucu.', (d) => CUR(d), ['s1']],
    ['a', 'A · Plates (iki sütun + özet şeridi)', 'Mevcut dizilim korunur (sol takım, sağ düşman); satırlar plaka, altta tek şerit. En az değişiklik, 4v6\'da en rahat okunan. Önerim.', (d) => stage(d, 'A', A(d)), ['s1', 's2', 's3']],
    ['b', 'B · Omurga (ortada toplamlar)', 'Sütunlar daralır, ortadaki omurgada iki tarafın toplam hasar çubuğu ve en büyük vuruş / kritik / blok / kaçınma durur. Boş alanı en doğal dolduran; 4v6\'da sütunlar dar.', (d) => stage(d, 'B', B(d)), ['s1', 's2', 's3']],
    ['c', 'C · Kahraman kartları', 'Kahramanlar karakter kartı gibi büyük kartlarda (oransal çubuklu), düşmanlar altta küçük plakalarda; en gösterişli, tek kahramanda ve 6 düşmanda yatay yer ister.', (d) => stage(d, 'C', C(d)), ['s1', 's2', 's3']],
  ];

  function render() {
    const want = S.v;
    $('#sections').innerHTML = VAR.filter((v) => want === 'all' || want === v[0]).map((v) => `<section class="sec" id="${v[0]}"><h2>${v[1]}</h2><div class="note">${v[2]}</div>
      ${v[4].map((k) => `<div class="col"><label>${v[0] === 'cur' ? 'Mevcut' : v[0].toUpperCase()}<i>${NAMES[k]}</i></label>${v[3](SC[k])}</div>`).join('')}</section>`).join('');
    document.querySelectorAll('.cp').forEach((b) => b.addEventListener('click', () => { const s = b.querySelector('span'); s.textContent = 'Copied (24 moves)'; setTimeout(() => (s.textContent = 'Copy match data'), 1800); }));
    document.querySelectorAll('.cont, .btn').forEach((b) => b.addEventListener('click', () => { b.style.transform = 'translateY(2px)'; setTimeout(() => (b.style.transform = ''), 120); }));
  }
  function apply(re) {
    const r = document.documentElement;
    r.style.setProperty('--s', S.u);
    r.classList.toggle('mk-phone', S.phone); r.classList.toggle('mk-clean', S.clean);
    document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.classList.toggle('on', Number(b.dataset.u) === S.u));
    document.querySelectorAll('#mk-strip button[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v));
    history.replaceState(null, '', '#u=' + S.u + (S.v !== 'all' ? '&v=' + S.v : '') + (S.clean ? '&clean' : ''));
    if (re) { S.first = false; render(); }
  }
  for (const p of location.hash.slice(1).split('&')) { const [k, v] = p.split('='); if (k === 'u') { S.u = Number(v) || 1; S.phone = S.u < 0.5; } if (k === 'v') S.v = v; if (k === 'clean') S.clean = true; }
  document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.addEventListener('click', () => { S.u = Number(b.dataset.u); S.phone = S.u < 0.5; apply(false); }));
  document.querySelectorAll('#mk-strip button[data-v]').forEach((b) => b.addEventListener('click', () => { S.v = b.dataset.v; apply(true); }));
  window.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const c = document.querySelector('.cont'); if (c) c.click(); } });
  render(); apply(false);
  setTimeout(() => { S.first = false; }, 1500);
})();
