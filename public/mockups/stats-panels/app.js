/* Stat panelleri taslagi: oyun kodu degil. Sayilar ve metinler oyundan alinan iki ekran goruntusuyle ayni. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const S = { u: 1, phone: false, clean: false, pts: 3 };
  const SI = (n) => `unified-inventory/stat-icons/${n}.webp`;
  const UI = (n) => `unified-inventory/ui-icons/${n}.webp`;
  const SK = (n) => `skills-block/${n}.webp`;
  const BLOCK = 'unified-inventory/items/iron_buckler.webp';
  const AVATAR = 'unified-inventory/avatars/warrior.webp';

  /* ---------- SHEET verisi ---------- */
  const BASE = { str: 32, dex: 8, int: 12, luck: 14 };
  // [id, kisa (mevcut), tam ad (yeni), deger, ikon, ayar yapilabilir]
  const G = [
    ['Main', [['str', 'STR', 'Strength', 32, SI('str'), 1], ['dex', 'DEX', 'Dexterity', 8, SI('dex'), 1], ['int', 'INT', 'Intelligence', 12, SI('int'), 1], ['luck', 'LUCK', 'Luck', 14, SI('luck'), 1]]],
    ['Attack', [['dmg', 'DMG', 'Damage', '0%', SI('might')], ['crit', 'CRIT', 'Crit chance', '8.5%', SI('critChance')], ['cdmg', 'CDMG', 'Crit damage', '1.5', SI('critMult')], ['acc', 'ACC', 'Accuracy', '88.3%', SI('accuracy')], ['spd', 'SPD', 'Speed', '17', SI('spd')]]],
    ['Defense', [['arm', 'ARM', 'Armor', '28', SI('armor')], ['marm', 'M.ARM', 'Magic armor', '6', SI('magicArmor')], ['eva', 'EVA', 'Evasion', '2.5%', SI('evasion')], ['hpr', 'HP+/T', 'HP regen', '4.5', SI('hpRegen')], ['mpr', 'MP+/T', 'MP regen', '3', SI('mpRegen')], ['blk', 'BLOCK', 'Block', '15%', BLOCK]]],
  ];
  const STATES = {};
  const ST = (id) => STATES[id] || (STATES[id] = { pts: S.pts, add: { str: 0, dex: 0, int: 0, luck: 0 }, base: { ...BASE } });
  const resetStates = () => { for (const k of Object.keys(STATES)) delete STATES[k]; };
  const pend = (st) => Object.values(st.add).reduce((a, b) => a + b, 0);
  const free = (st) => st.pts - pend(st);
  const val = (st, id) => st.base[id] + st.add[id];
  const canAdd = (st, id) => {
    if (free(st) <= 0) return false;
    const others = ['str', 'dex', 'int', 'luck'].filter((k) => k !== id).reduce((a, k) => a + val(st, k), 0);
    return val(st, id) + 1 <= others;
  };
  const pm = (st, id) => {
    const f = free(st), can = canAdd(st, id), a = st.add[id];
    const sub = a > 0 ? `<button class="pmb" data-act="sub" data-a="${id}" title="Take back a point">&minus;</button>` : `<button class="pmb off" disabled tabindex="-1" aria-hidden="true">&minus;</button>`;
    const add = f > 0 ? `<button class="pmb" data-act="add" data-a="${id}" ${can ? '' : 'disabled'} title="${can ? 'Add a point' : 'A base stat can never exceed the sum of the other three'}">+</button>` : `<button class="pmb off" disabled tabindex="-1" aria-hidden="true">+</button>`;
    return `<span class="pm">${add}${sub}</span>`;
  };
  const shown = (st, r) => (r[5] ? String(val(st, r[0])) : String(r[3]));
  const delta = (st, r) => (r[5] && st.add[r[0]] ? `+${st.add[r[0]]}` : '');

  const OLD_PTS = (st, inst) => {
    const f = free(st), p = pend(st), idle = f <= 0 && p <= 0;
    const acts = p > 0 ? `<button class="gbtn" data-act="reset">Reset</button><button class="gbtn primary" data-act="confirm">Confirm</button>` : '';
    return `<div class="pts ${idle ? 'idle' : ''}"><span class="chip ${f > 0 ? '' : 'empty'}">${f}</span><span>${f > 0 ? `stat point${f === 1 ? '' : 's'} to spend` : 'All points placed'}</span><span class="acts">${acts}</span></div>`;
  };
  const oldSheet = (st) => `<div class="osheet" data-inst="old">
    <div class="lv"><span class="a">Level 3</span><span class="x">95 / 116 XP</span></div><div class="xb"><i></i></div>
    ${OLD_PTS(st)}
    <div class="spn">2 skill points saved for the skill trees</div>
    <div class="sec2">Stats</div>
    <div class="vit"><div><div class="vh"><img src="${SI('hp')}" alt=""><span>HP</span><b>97 / 129</b></div><div class="vbar"><i class="fhp" style="width:75%"></i></div></div>
    <div><div class="vh"><img src="${SI('mp')}" alt=""><span>MP</span><b>68 / 68</b></div><div class="vbar"><i class="fmp" style="width:100%"></i></div></div></div>
    <div class="cols">${G.map((g) => `<div>${g[1].map((r) => `<div class="r"><img src="${r[4]}" alt=""><span class="k">${r[1]}</span><span class="v">${shown(st, r)}</span><span class="d d up">${delta(st, r)}</span>${r[5] ? pm(st, r[0]) : ''}</div>`).join('')}</div>`).join('')}</div></div>`;

  const bar = (ic, n, cur, max, cls, pct) => `<div><div class="bh2"><img src="${ic}" alt=""><span class="bn">${n}</span><span class="bv">${cur}${max ? ` <s>/ ${max}</s>` : ''}</span></div><div class="bar2"><i class="${cls}" style="width:${pct}%"></i></div></div>`;
  const srow = (st, r) => `<div class="sr ${r[0] === 'str' ? 'p' : ''}"><img src="${r[4]}" alt=""><span class="k">${r[2]}</span><span class="n">${shown(st, r)}</span><span class="d d up">${delta(st, r)}</span>${r[5] ? pm(st, r[0]) : ''}</div>`;
  const scol = (st, g, plate) => `<div class="${plate ? 'plate' : ''}"><div class="sl">${g[0]}</div>${g[1].map((r) => srow(st, r)).join('')}</div>`;
  const ptsNew = (st) => {
    const f = free(st), p = pend(st), idle = f <= 0 && p <= 0;
    const acts = p > 0 ? `<span class="acts"><button class="gbtn" data-act="reset">Reset</button><button class="gbtn primary" data-act="confirm">Confirm</button></span>` : '';
    return `<span class="ptr"><span class="medal ${f > 0 ? '' : 'empty'}"><span>${f}</span></span><span class="tx">${f > 0 ? `stat point${f === 1 ? '' : 's'} to spend` : 'All points placed'}</span>${acts}</span>`;
  };
  const underRow = (st) => { const idle = free(st) <= 0 && pend(st) <= 0; return `<div class="under ${idle ? 'idle' : ''}"><span class="chip sp"><b>2</b> skill points saved for the skill trees</span>${ptsNew(st)}</div>`; };
  const xp = '<div class="bar2 xpb"><i class="fxp" style="width:82%"></i></div>';
  const xpv = '<span class="xpv">95 <s>/ 116 XP</s></span>';
  const newSheetA = (st) => `<div class="cc ns nsa" data-inst="a"><div class="head"><span class="lt">Level <b>3</b></span>${xpv}</div>${xp}${underRow(st)}<div class="dv"></div>
    <div class="sl big">Stats</div><div class="vit">${bar(SI('hp'), 'HP', 97, 129, 'fhp', 75)}${bar(SI('mp'), 'MP', 68, 68, 'fmp', 100)}</div>
    <div class="scols">${G.map((g) => scol(st, g)).join('')}</div></div>`;
  const newSheetB = (st) => `<div class="cc ns nsb" data-inst="b"><div class="plate"><div class="head"><span class="medal"><span>3</span></span><span class="lt">Level</span>${xpv}</div>${xp}${underRow(st)}</div>
    <div class="vit"><div class="plate">${bar(SI('hp'), 'HP', 97, 129, 'fhp', 75)}</div><div class="plate">${bar(SI('mp'), 'MP', 68, 68, 'fmp', 100)}</div></div>
    <div class="scols">${G.map((g) => scol(st, g, 1)).join('')}</div></div>`;

  /* ---------- BIRIM KARTI verisi ---------- */
  const SKILLS = [
    { n: 'Double Strike', i: SK('sword'), t: 'single', mp: 0, cd: 0 },
    { n: 'Whirlwind', i: SK('whirlwind'), t: 'all foes', mp: 8, cd: 3 },
    { n: 'Charge', i: SK('charge'), t: 'single', mp: 10, cd: 3 },
    { n: "Headsman's Blow", i: SK('warcry'), t: 'single', rage: 30, wait: 1, cdMax: 5, ult: 1 },
  ];
  const oldUnit = () => `<div class="ocard"><div class="hd"><div class="pt"><img src="${AVATAR}" alt=""></div><div><div class="nm">Warrior</div><div class="sb">Melee Bruiser &middot; Strength 32 primary</div></div></div><span class="al">ALLY</span>
    <div class="bars"><div><div class="bh"><b>83</b><span>/ 129</span></div><div class="bb"><i class="fhp" style="width:64%"></i></div></div><div><div class="bh"><b style="color:#9fe8f5">68</b><span>/ 68</span></div><div class="bb"><i class="fmp" style="width:100%"></i></div></div>
    <div><div class="bh"><b style="color:#fbe27a">7</b><span>/ 50</span></div><div class="bb"><i class="frg" style="width:14%"></i></div></div></div>
    <div class="s1"><div class="c p"><img src="${SI('str')}" alt=""><span class="k">STR</span><span class="v">32</span></div><div class="c"><img src="${SI('dex')}" alt=""><span class="k">DEX</span><span class="v">8</span></div><div class="c"><img src="${SI('int')}" alt=""><span class="k">INT</span><span class="v">12</span></div><div class="c"><img src="${SI('luck')}" alt=""><span class="k">LCK</span><span class="v">14</span></div></div>
    <div class="s2">${[['armor', 'ARM', '28', '−32%'], ['evasion', 'EVA', '3%', ''], ['spd', 'SPD', '17', ''], ['magicArmor', 'M.ARM', '6', '−9%'], ['critChance', 'CRIT', '8.5%', ''], ['accuracy', 'ACC', '88%', '']].map((r) => `<div class="c"><img src="${SI(r[0])}" alt=""><span class="k">${r[1]}</span><span class="v">${r[2]}${r[3] ? `<span class="rd">${r[3]}</span>` : ''}</span></div>`).join('')}<div class="c"><img src="${BLOCK}" alt=""><span class="k">BLOCK</span><span class="v">15%</span></div></div>
    <div class="sh">Skills</div>${SKILLS.map((s) => `<div class="sk ${s.wait ? 'dim' : ''}"><span class="ik"><img src="${s.i}" alt=""></span><span>${s.n}</span><span class="tg">${s.t}</span><span class="mp">${s.mp ? `<img src="${SI('mp')}" alt="">${s.mp}` : s.rage ? `<img src="${UI('rage')}" alt=""><span style="color:#ffa24a">${s.rage}</span>` : ''}</span><span class="cdn">${s.cd ? `<img src="${UI('cooldown')}" alt="">${s.cd}` : s.wait ? `<img src="${UI('cooldown')}" alt=""><span style="color:#fbe27a">${s.wait}</span><small>/${s.cdMax}</small>` : ''}</span></div>`).join('')}
    <div class="sh">Passive</div><div class="ps"><b>Berserker</b><i>The lower your HP, the harder you hit: up to +80% damage at the brink of death. Losing HP gives Rage: 0.5 per 1% of your max HP lost (at most 15 per hit; shields absorbing the hit give none).</i></div>
    <div class="pin">Pinned &middot; tap again or Esc to close</div></div>`;

  const UG = [
    ['Main', [['str', 'STR', '32', SI('str'), 1], ['dex', 'DEX', '8', SI('dex')], ['int', 'INT', '12', SI('int')], ['luck', 'LCK', '14', SI('luck')]]],
    ['Attack', [['crit', 'CRIT', '8.5%', SI('critChance')], ['spd', 'SPD', '17', SI('spd')], ['acc', 'ACC', '88%', SI('accuracy')]]],
    ['Defense', [['arm', 'ARM', '28', SI('armor'), 0, '−32%'], ['marm', 'M.ARM', '6', SI('magicArmor'), 0, '−9%'], ['eva', 'EVA', '3%', SI('evasion')], ['blk', 'BLOCK', '15%', BLOCK]]],
  ];
  const urow = (r) => `<div class="sr ${r[4] ? 'p' : ''}"><img src="${r[3]}" alt=""><span class="k">${r[1]}</span><span class="n">${r[2]}</span><span class="rd">${r[5] || ''}</span></div>`;
  const costChips = (s, short) => (s.rage ? `<span class="chip rg"><img src="${UI('rage')}" alt="">${short ? "" : "Rage "}<b>${s.rage}</b></span>` : s.mp ? `<span class="chip"><img src="${SI('mp')}" alt=""><b>${s.mp}</b></span>` : `<span class="chip free">Free</span>`);
  const cdChip = (s) => (s.wait ? `<span class="chip wait"><img src="${UI('cooldown')}" alt=""><b>${s.wait}</b>/${s.cdMax}</span>` : s.cd ? `<span class="chip"><img src="${UI('cooldown')}" alt=""><b>${s.cd}</b></span>` : '');
  const unitHead = () => `<div class="hd2"><div class="ico"><img src="${AVATAR}" alt=""></div><div class="ht"><div class="kind ally">Ally</div><div class="titler"><span class="title">Warrior</span><span class="lvc">Lv <b>3</b></span></div><div class="chips"><span class="chip">Melee Bruiser</span><span class="chip hot"><img src="${SI('str')}" alt="">Strength <b>32</b> primary</span></div></div></div>`;
  const unitTop = () => `${unitHead()}<div class="dv"></div><div class="bars3">${bar(SI('hp'), 'HP', 83, 129, 'fhp', 64)}${bar(SI('mp'), 'MP', 68, 68, 'fmp', 100)}${bar(UI('rage'), 'Rage', 7, 50, 'frg', 14)}</div><div class="dv"></div><div class="scols">${UG.map((g) => `<div><div class="sl">${g[0]}</div>${g[1].map(urow).join('')}</div>`).join('')}</div><div class="dv"></div>`;
  const pinf = '<div class="pinf"><span><b>Pinned</b> &middot; tap again or Esc to close</span></div>';
  const newUnitA = () => `<div class="cc nu nua">${unitTop()}<div class="sks"><div class="sl">Skills</div><div class="plts">${SKILLS.map((s) => `<div class="pl ${s.ult ? 'ult' : ''} ${s.wait ? 'dim' : ''}"><div class="ico"><img src="${s.i}" alt=""></div><div class="tx"><div class="tgt">${s.t}</div><div class="nm">${s.n}</div><div class="chips">${costChips(s)}${cdChip(s)}</div></div></div>`).join('')}</div></div>${pinf}</div>`;
  const newUnitB = () => `<div class="cc nu nub">${unitTop()}<div class="sks"><div class="sl">Skills</div><div class="rws">${SKILLS.map((s) => `<div class="rw ${s.ult ? 'ult' : ''} ${s.wait ? 'dim' : ''}"><div class="ico"><img src="${s.i}" alt=""></div><span class="nm">${s.n}</span><span class="tgt">${s.t}</span><span class="cell">${costChips(s, 1)}</span><span class="cell">${cdChip(s)}</span></div>`).join('')}</div></div>${pinf}</div>`;

  const SECS = [
    { h: 'Gear > Sheet', n: 'Stat puanı dağıtımı çalışır (alttaki şeritten Points 3). A: düz akış, karakter kartı A diliyle birebir akraba. B: her bölüm kendi plakasında, seviye elması solda.', old: () => `<div class="sheet">${oldSheet(ST('old'))}</div>`, cur: 'Current (Sheet)', vs: [['A · Band (önerim)', 'a', () => `<div class="sheet">${newSheetA(ST('a'))}</div>`], ['B · Plates', 'b', () => `<div class="sheet">${newSheetB(ST('b'))}</div>`]], scene: 'flat' },
    { h: 'Savaş birim kartı (pinned)', n: 'Başlıkta sınıf adının sağında Lv 3; ALLY etiketi tür satırı oldu (düşmanda ENEMY, kırmızı); PASSIVE kaldırıldı. HP / MP / Rage tek sırada, değer sağda. A: skiller mini plaka (2x2). B: tek sütun satırlar, MP ve bekleme sütunları hizalı.', old: () => `<div class="ucard">${oldUnit()}</div>`, cur: 'Current (unit card)', vs: [['A · Band + Plates (önerim: masaüstü)', 'ua', () => `<div class="ucard nw">${newUnitA()}</div>`], ['B · Band + Rows (önerim: telefon)', 'ub', () => `<div class="ucard nw">${newUnitB()}</div>`]], scene: '' },
  ];
  function render() {
    $('#sections').innerHTML = SECS.map((s, si) => `<section class="sec"><h2>${s.h}</h2><div class="note">${s.n}</div><div class="row">` +
      `<div class="col"><label>${s.cur}<i>mevcut, birebir</i></label><div class="scene ${s.scene}" data-s="${si}" data-v="old">${s.old()}</div></div>` +
      s.vs.map((v, vi) => `<div class="col"><label>${v[0].split(' (')[0]}<i>yeni öneri</i></label><div class="scene ${s.scene}" data-s="${si}" data-v="${vi}">${v[2]()}</div></div>`).join('') + '</div></section>').join('');
  }
  function redraw(el) {
    const s = SECS[Number(el.dataset.s)];
    el.innerHTML = el.dataset.v === 'old' ? s.old() : s.vs[Number(el.dataset.v)][2]();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const scene = b.closest('.scene'); const inst = b.closest('[data-inst]');
    if (!scene || !inst) return;
    const st = ST(inst.dataset.inst);
    const act = b.dataset.act;
    if (act === 'add' && canAdd(st, b.dataset.a)) st.add[b.dataset.a]++;
    else if (act === 'sub' && st.add[b.dataset.a] > 0) st.add[b.dataset.a]--;
    else if (act === 'reset') for (const k of Object.keys(st.add)) st.add[k] = 0;
    else if (act === 'confirm') { const f = free(st); for (const k of Object.keys(st.add)) { st.base[k] += st.add[k]; st.add[k] = 0; } st.pts = f; }
    redraw(scene);
  });
  function apply() {
    const r = document.documentElement;
    r.style.setProperty('--u', S.u + 'px');
    r.classList.toggle('mk-phone', S.phone);
    r.classList.toggle('mk-clean', S.clean);
    document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.classList.toggle('on', Number(b.dataset.u) === S.u));
    document.querySelectorAll('#mk-strip button[data-p]').forEach((b) => b.classList.toggle('on', Number(b.dataset.p) === S.pts));
    history.replaceState(null, '', '#u=' + S.u + '&pts=' + S.pts + (S.clean ? '&clean' : ''));
  }
  for (const p of location.hash.slice(1).split('&')) { const [k, v] = p.split('='); if (k === 'u') { S.u = Number(v) || 1; S.phone = S.u < 0.5; } if (k === 'pts') S.pts = Number(v) || 0; if (k === 'clean') S.clean = true; }
  document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.addEventListener('click', () => { S.u = Number(b.dataset.u); S.phone = S.u < 0.5; apply(); }));
  document.querySelectorAll('#mk-strip button[data-p]').forEach((b) => b.addEventListener('click', () => { S.pts = Number(b.dataset.p); resetStates(); render(); apply(); }));
  render(); apply();
})();
