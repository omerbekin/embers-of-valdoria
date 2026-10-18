/* Item ipucu taslağı: oyun kodu değil. Veri: data.js (oyunun item-tip çıktısından üretildi). */
(function () {
  const T = window.TIP_DATA;
  const A = 'unified-inventory/';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TIERC = { C: '#b9a98a', B: '#8fb8e8', A: '#f0b04a' };
  const KEYS = { bow: 'u23', axe: 'u17', armor: 'u11', trinket: 'u38', common: 'u9', legendary: 'u30', shield: 'u41' };
  const VNAMES = { v0: 'Today', v1: 'Banner', v2: 'Plaque', v3: 'Split', v4: 'Ledger', v5: 'Hero-first', v6: 'Crest', v7: 'Arch', v8: 'Seal', v9: 'Halo' };
  const HEROES = ['h1', 'h2', 'h3', 'h4'];
  const STAT_ICO = { damage: 'might', block: '../items/iron_buckler' };
  const COIN = A + 'ui-icons/gold.webp';

  // ---- adres
  const S = { v: 'v1', item: 'u23', hero: 'h1', ctx: 'bag', clean: false };
  function readHash() {
    for (const p of location.hash.slice(1).split('&')) {
      const [k, val] = p.split('=');
      if (/^v[0-9]$/.test(k)) S.v = k;
      else if (k === 'item' && val) S.item = KEYS[val] ?? (T.items[val] ? val : S.item);
      else if (k === 'hero' && HEROES.includes(val)) S.hero = val;
      else if (k === 'ctx') S.ctx = val === 'shop' ? 'shop' : 'bag';
      else if (k === 'clean') S.clean = true;
    }
  }
  function writeHash() {
    const key = Object.entries(KEYS).find(([, u]) => u === S.item)?.[0] ?? S.item;
    history.replaceState(null, '', `#${S.v}&item=${key}&hero=${S.hero}${S.ctx === 'shop' ? '&ctx=shop' : ''}${S.clean ? '&clean' : ''}`);
  }
  readHash();

  // ---- KALKAN: taban Armor yerine Block chance (YER TUTUCU: % = 3*armor+3; gercek sayilar motor ajanindan gelecek)
  const BLOCK_ICO = '../items/iron_buckler';
  for (const it of Object.values(T.items)) {
    if (it.slot !== 'offhand' || !it.implicit || it.implicit.ico !== 'armor') continue;
    const a = Number(it.implicit.text.match(/[0-9]+/)[0]);
    const pct = 3 * a + 3;
    it.implicit = { ico: BLOCK_ICO, text: 'Block chance ' + pct + '%' };
    for (const h of Object.values(it.per)) if (h.d) { h.d.armor = (h.d.armor || 0) - a; if (!h.d.armor) delete h.d.armor; h.d.block = pct / 100; }
  }
  for (const h of Object.values(T.heroes)) h.panel.block = { l: 'BLK', f: 'pct', v: 0 };

  // ---- veri yardımcıları
  const item = (u) => T.items[u];
  const subParts = (it) => {
    const p = it.sub.split(' · ');
    const first = p[0].split(' ');
    return { rarity: first[0], kind: first.slice(1).join(' '), grip: p.slice(1, -1).join(' · '), ilvl: p[p.length - 1].replace('Item level ', '') };
  };
  const fmtN = (x) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 10) / 10));
  function fmtStat(v, f) {
    if (f === 'pct') return `${Math.round(v * 1000) / 10}%`;
    if (f === 'dec') return String(Math.round(v * 10) / 10);
    return String(Math.round(v));
  }
  function roll(l) {
    if (!l.range) return null;
    const [lo, hi] = l.range.split('–').map(Number);
    const m = l.text.match(/\d+(\.\d+)?/);
    if (!m || !(hi > lo)) return null;
    const val = Number(m[0]);
    return { lo, hi, val, p: Math.max(0, Math.min(1, (val - lo) / (hi - lo))) };
  }
  function lineIcon(l) {
    if (l.ico) return `${A}stat-icons/${l.ico}.webp`;
    const e = l.text.match(/(Fire|Ice|Holy|Arcane|Nature|Dark) damage/);
    return e ? `${A}misc-icons/element/${e[1].toLowerCase()}.webp` : '';
  }
  const ico = (url, cls = 'tt-ico') => (url ? `<img class="${cls}" src="${url}" alt="" draggable="false">` : `<i class="tt-dia"></i>`);
  const statUrl = (k) => `${A}stat-icons/${STAT_ICO[k] ?? k}.webp`;
  function heroState(hid, it) {
    const h = T.heroes[hid];
    const p = it.per[hid];
    if (p.no) return { hid, h, kind: 'no', msg: p.no, deltas: [] };
    const deltas = Object.entries(p.d).map(([k, v]) => ({ k, v, label: h.panel[k].l, f: h.panel[k].f, before: h.panel[k].v }));
    return { hid, h, kind: h.level < it.req ? 'unmet' : 'ok', msg: h.level < it.req ? `Requires Level ${it.req}` : '', deltas };
  }
  const dText = (d) => `${d.v > 0 ? '+' : '-'}${fmtStat(Math.abs(d.v), d.f)} ${d.label}`;
  const chip = (d) => `<span class="tt-d ${d.v > 0 ? 'up' : 'down'}">${ico(statUrl(d.k), 'tt-dico')}${esc(dText(d))}</span>`;
  const face = (hs, cls = '') => `<img class="tt-face ${cls}" src="${hs.h.avatar}" alt="" draggable="false">`;
  const rollBar = (r, cls = '') => `<span class="tt-rb ${cls}" style="--p:${r.p}" title="Roll range ${fmtN(r.lo)}–${fmtN(r.hi)}"><i></i></span>`;
  const rollPips = (r) => {
    const on = Math.round(r.p * 4) + 1;
    return `<span class="tt-pips" title="Roll range ${fmtN(r.lo)}–${fmtN(r.hi)}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= on ? 'on' : ''}"></i>`).join('')}</span>`;
  };
  const valueText = (it) => (S.ctx === 'shop' ? `Sells for ${it.sell}` : `Value ${it.value}`);
  const reqLine = (it, cls = '') => {
    if (it.req <= 1) return '';
    const unmet = T.heroes[S.hero].level < it.req;
    return `<div class="tt-req ${cls}${unmet ? ' unmet' : ''}">Requires Level ${it.req}</div>`;
  };
  const effectBlock = (it) => (it.effect ? `<div class="tt-fx"><b>${esc(it.effect.split(':')[0])}</b><span>${esc(it.effect.split(':').slice(1).join(':').trim())}</span></div>` : '');
  const implicitRow = (it) => (it.implicit ? `<div class="tt-imp">${ico(it.implicit.ico ? `${A}stat-icons/${it.implicit.ico}.webp` : '')}<span>${esc(it.implicit.text)}</span></div>` : '');
  const tierChip = (t) => `<span class="tt-tier" style="--tc:${TIERC[t]}">${t}</span>`;
  const coinFoot = (it, cls = '') => `<div class="tt-foot ${cls}"><img class="tt-coin" src="${COIN}" alt=""><b>${S.ctx === 'shop' ? it.sell : it.value}</b><span>gold</span>${S.ctx === 'shop' ? '<em>sells for</em>' : '<em>value</em>'}</div>`;

  // can't-use heroes with the same reason collapse into one line
  function groups(it) {
    const st = HEROES.map((h) => heroState(h, it));
    const no = new Map();
    for (const s of st) if (s.kind === 'no') no.set(s.msg, [...(no.get(s.msg) ?? []), s]);
    return { st, usable: st.filter((s) => s.kind !== 'no'), no: [...no.entries()] };
  }
  const noLine = (g, big) => `<div class="tt-no">${g[1].map((s) => face(s, 'gray')).join('')}<span>${esc(g[0])}</span>${big ? `<em>${g[1].map((s) => s.h.name).join(', ')}</em>` : ''}</div>`;

  // ------------------------------------------------------------ sürümler
  // v0: bugünkü ipucu (oyunun işaretlemesi, item-tip.ts)
  function v0(it) {
    const base = [];
    if (it.power) base.push(`<div class="it-power">Weapon power ${it.power}</div>`);
    if (it.implicit) base.push(`<div class="it-implicit">${it.implicit.ico ? `<img class="it-ico" src="${A}stat-icons/${it.implicit.ico}.webp" alt="">` : ''}<span class="it-text">${esc(it.implicit.text)}</span></div>`);
    const unmet = T.heroes[S.hero].level < it.req;
    const lines = it.lines.map((l) => `<div class="it-line"><span class="it-tier" style="color:${TIERC[l.tier]};border-color:${TIERC[l.tier]}">${l.tier}</span>${l.ico ? `<img class="it-ico" src="${A}stat-icons/${l.ico}.webp" alt="">` : ''}<span class="it-text">${esc(l.text)}</span>${l.range ? `<span class="it-range">(${l.range})</span>` : ''}</div>`).join('');
    const heroes = HEROES.map((h) => {
      const s = heroState(h, it);
      const parts = s.kind === 'no' ? `<span class="it-no">${esc(s.msg)}</span>` : s.deltas.slice(0, 2).map((d) => `<span class="it-${d.v > 0 ? 'up' : 'down'}">${esc(dText(d))}</span>`).join(' · ');
      return `<div class="it-hero"><span class="it-hero-k">${esc(s.h.name)}</span><span class="it-hero-v">${s.kind === 'unmet' ? `<span class="it-no">${esc(s.msg)}</span> · ` : ''}${parts}</span></div>`;
    }).join('');
    return `<div class="el-tip item-tip on v0box"><b class="it-name" style="color:${it.color}">${esc(it.name)}</b><div class="it-sub">${esc(it.sub)}</div>${base.length ? `<div class="it-base">${base.join('')}</div>` : ''}${it.req > 1 || unmet ? `<div class="it-req${unmet ? ' unmet' : ''}">Requires Level ${it.req}</div>` : ''}<div class="it-lines">${lines}</div>${it.effect ? `<div class="it-effect">${esc(it.effect)}</div>` : ''}<div class="it-value">${valueText(it)} gold</div><div class="it-heroes">${heroes}</div></div>`;
  }

  // v1 Banner: nadirlik şeridi + ikon + sürekli zar çubuğu + kahraman satırları
  function v1(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="tl">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span>${r ? rollBar(r) : '<span class="tl-fixed">fixed</span>'}</div>`;
    }).join('');
    const heroRows = g.usable.map((s) => `<div class="t1-h">${face(s)}<span class="t1-hn">${esc(s.h.name)}<small>Lv ${s.h.level}</small></span><span class="t1-hd">${s.kind === 'unmet' ? `<span class="tt-d down">${esc(s.msg)}</span>` : ''}${s.deltas.map(chip).join('') || '<span class="tt-same">No change</span>'}</span></div>`).join('');
    return `<div class="tt t1" style="--rc:${it.color}">
      <header class="tt-head t1-head"><span class="t1-frame">${ico(`${A}${it.icon}`, 't1-art gr-px')}</span><div class="t1-id"><b class="tt-name">${esc(it.name)}</b><i>${esc(sp.rarity)} ${esc(sp.kind)}${sp.grip ? ` · ${esc(sp.grip)}` : ''}</i></div><span class="t1-il"><small>Item level</small>${esc(sp.ilvl)}</span></header>
      <div class="tt-main">${it.power ? `<div class="t1-power"><b>${it.power}</b><span>Weapon power</span></div>` : ''}${implicitRow(it)}${reqLine(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}</div>
      <div class="tt-side"><div class="tt-sec">Heroes</div>${heroRows}${g.no.map((x) => noLine(x)).join('')}</div>
      ${coinFoot(it)}</div>`;
  }

  // v2 Plaque: ortalı madalyon, büyük silah gücü, çubuk satırın altında (uçlarda aralık), kahraman kutucukları
  function v2(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="tl2"><div class="tl2-top">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span></div>${r ? `<div class="tl2-roll"><small>${fmtN(r.lo)}</small>${rollBar(r, 'wide')}<small>${fmtN(r.hi)}</small></div>` : ''}</div>`;
    }).join('');
    const tiles = g.st.map((s) => `<div class="t2-tile ${s.kind}">${face(s, s.kind === 'no' ? 'gray' : '')}<b>${esc(s.h.name)}</b><div class="t2-td">${s.kind === 'no' ? '<span class="t2-x">Can\'t use</span>' : (s.kind === 'unmet' ? '<span class="tt-d down">Lv ' + it.req + '</span>' : '') + (s.deltas.map(chip).join('') || '<span class="tt-same">No change</span>')}</div></div>`).join('');
    const noMsg = g.no.length ? `<div class="t2-nomsg">${esc(g.no.map((x) => x[0]).join(' · '))}</div>` : '';
    return `<div class="tt t2" style="--rc:${it.color}">
      <header class="tt-head t2-head"><span class="t2-medal"><span class="gr-item k${it.k}" style="--rc:${it.color}"><span class="gr-c2"></span><span class="gr-c3"></span>${ico(`${A}${it.icon}`, 'gr-svg gr-px item-art')}</span></span>
        <b class="tt-name">${esc(it.name)}</b><div class="t2-rib"><i></i><span>${esc(sp.rarity)} ${esc(sp.kind)}</span><i></i></div><div class="t2-grip">${sp.grip ? esc(sp.grip) + ' · ' : ''}Item level ${esc(sp.ilvl)}</div></header>
      <div class="tt-main">${it.power ? `<div class="t2-power"><b>${it.power}</b><span>Weapon power</span></div>` : ''}${implicitRow(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}${reqLine(it, 'c')}</div>
      <div class="tt-side"><div class="tt-sec c">Compare</div><div class="t2-tiles">${tiles}</div>${noMsg}</div>
      ${coinFoot(it, 'c')}</div>`;
  }

  // v3 Split: geniş, iki sütun (solda item, sağda kahraman karşılaştırma tablosu); telefon yatay için ideal
  function v3(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="tl3">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span>${r ? `<span class="tl3-r"><small>${fmtN(r.lo)}</small>${rollBar(r)}<small>${fmtN(r.hi)}</small></span>` : ''}</div>`;
    }).join('');
    const table = g.usable.map((s) => `<div class="t3-row">${face(s)}<div class="t3-n"><b>${esc(s.h.name)}</b><small>Level ${s.h.level}</small></div><div class="t3-d">${s.kind === 'unmet' ? `<span class="tt-d down">${esc(s.msg)}</span>` : ''}${s.deltas.map((d) => `<span class="t3-line ${d.v > 0 ? 'up' : 'down'}">${ico(statUrl(d.k), 'tt-dico')}<span class="k">${esc(d.label)}</span><span class="b">${fmtStat(d.before, d.f)}</span><span class="ar">&rarr;</span><span class="a">${fmtStat(d.before + d.v, d.f)}</span></span>`).join('') || '<span class="tt-same">No change</span>'}</div></div>`).join('');
    return `<div class="tt t3" style="--rc:${it.color}">
      <header class="tt-head t3-head"><span class="t3-bar"></span>${ico(`${A}${it.icon}`, 't3-art gr-px')}<div class="t3-id"><b class="tt-name">${esc(it.name)}</b><i>${esc(sp.rarity)} ${esc(sp.kind)}${sp.grip ? ` · ${esc(sp.grip)}` : ''} · Item level ${esc(sp.ilvl)}</i></div>${it.power ? `<div class="t3-power"><b>${it.power}</b><span>Weapon power</span></div>` : ''}</header>
      <div class="tt-main">${implicitRow(it)}${reqLine(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}</div>
      <div class="tt-side"><div class="tt-sec">If equipped</div>${table}${g.no.map((x) => noLine(x, true)).join('')}</div>
      ${coinFoot(it)}</div>`;
  }

  // v4 Ledger: ince, sol nadirlik şeridi, 5 noktalı zar göstergesi, tek satır kahraman şeridi
  function v4(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="tl4">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span>${r ? rollPips(r) : ''}</div>`;
    }).join('');
    const strip = g.usable.map((s) => `<div class="t4-h">${face(s)}<span class="t4-dd"><small class="t4-n">${esc(s.h.name)}</small>${s.kind === 'unmet' ? `<span class="tt-d down">Lv ${it.req}</span>` : ''}${s.deltas.map(chip).join('') || '<span class="tt-same">No change</span>'}</span></div>`).join('');
    const nos = g.no.map((x) => `<div class="t4-no">${x[1].map((s) => face(s, 'gray')).join('')}<span>${esc(x[0])}</span></div>`).join('');
    return `<div class="tt t4" style="--rc:${it.color}">
      <header class="tt-head t4-head">${ico(`${A}${it.icon}`, 't4-art gr-px')}<div class="t4-id"><b class="tt-name">${esc(it.name)}</b><i>${esc(sp.rarity)} ${esc(sp.kind)}${sp.grip ? ` · ${esc(sp.grip)}` : ''}</i></div><span class="t4-il">iL ${esc(sp.ilvl)}</span></header>
      <div class="tt-main">${it.power ? `<div class="t4-power"><span>Weapon power</span><b>${it.power}</b></div>` : ''}${implicitRow(it)}${reqLine(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}</div>
      <div class="tt-side">${strip}${nos}</div>
      ${coinFoot(it)}</div>`;
  }

  // v5 Hero-first: karşılaştırma ana konu; kahraman sekmeleri, önce → sonra değerleri
  function v5(it) {
    const sp = subParts(it);
    const g = groups(it);
    const cur = g.st.find((s) => s.hid === S.hero);
    const tabs = g.st.map((s) => `<button class="t5-tab ${s.hid === S.hero ? 'on' : ''} ${s.kind}" type="button" data-hero="${s.hid}" data-tipt="${esc(s.h.name)}">${face(s, s.kind === 'no' ? 'gray' : '')}${s.kind === 'no' ? '<i class="t5-x">&times;</i>' : ''}<small>${esc(s.h.name)}</small></button>`).join('');
    let cmp;
    if (cur.kind === 'no') cmp = `<div class="t5-no"><b>${esc(cur.msg)}</b><span>${esc(cur.h.name)} cannot use this ${esc(sp.kind.toLowerCase())}.</span></div>`;
    else {
      const rows = cur.deltas.map((d) => `<div class="t5-row ${d.v > 0 ? 'up' : 'down'}">${ico(statUrl(d.k), 'tt-ico')}<span class="k">${esc(d.label)}</span><span class="b">${fmtStat(d.before, d.f)}</span><span class="ar">&rarr;</span><span class="a">${fmtStat(d.before + d.v, d.f)}</span><span class="d">${d.v > 0 ? '+' : '-'}${fmtStat(Math.abs(d.v), d.f)}</span></div>`).join('') || '<div class="t5-row"><span class="k">No stat change</span></div>';
      cmp = `${cur.kind === 'unmet' ? `<div class="t5-warn">Requires Level ${it.req} <small>(${esc(cur.h.name)} is Lv ${cur.h.level})</small></div>` : ''}${rows}`;
    }
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="tl">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span>${r ? rollBar(r, 'sm') : ''}</div>`;
    }).join('');
    return `<div class="tt t5" style="--rc:${it.color}">
      <header class="tt-head t5-head">${ico(`${A}${it.icon}`, 't5-art gr-px')}<div class="t5-id"><b class="tt-name">${esc(it.name)}</b><i>${esc(sp.rarity)} ${esc(sp.kind)}${sp.grip ? ` · ${esc(sp.grip)}` : ''} · iL ${esc(sp.ilvl)}</i></div>${it.power ? `<div class="t5-power"><b>${it.power}</b><span>Weapon power</span></div>` : ''}</header>
      <div class="tt-side t5-cmp"><div class="t5-tabs">${tabs}</div><div class="t5-body">${cmp}</div></div>
      <div class="tt-main">${implicitRow(it)}${cur.kind === 'unmet' ? '' : reqLine(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}</div>
      ${coinFoot(it)}</div>`;
  }


  // ---- v6-v9: v2 ailesi, hepsi ortalı
  const rollRow = (r, cls = '') => (r ? `<div class="cv-roll ${cls}"><small>${fmtN(r.lo)}</small>${rollBar(r, 'wide')}<small>${fmtN(r.hi)}</small></div>` : '');
  const medal = (it, cls) => `<span class="cv-medal ${cls}"><span class="gr-item k${it.k}" style="--rc:${it.color}"><span class="gr-c2"></span><span class="gr-c3"></span>${ico(`${A}${it.icon}`, 'gr-svg gr-px item-art')}</span></span>`;
  const powerBlock = (it, cls) => (it.power ? `<div class="cv-power ${cls}"><b>${it.power}</b><span>Weapon power</span></div>` : '');
  const cvImp = (it) => (it.implicit ? `<div class="cv-imp">${ico(it.implicit.ico ? `${A}stat-icons/${it.implicit.ico}.webp` : '', 'tt-ico')}<span>${esc(it.implicit.text)}</span></div>` : '');
  const cvFoot = (it) => coinFoot(it, 'c');
  const noRow = (g) => (g.no.length ? g.no.map((x) => `<div class="t2-nomsg">${x[1].map((s) => face(s, 'gray')).join('')}<span>${esc(x[0])}</span></div>`).join('') : '');
  const heroDeltas = (s, it) => (s.kind === 'unmet' ? `<span class="tt-d down">Lv ${it.req}</span>` : '') + (s.deltas.map(chip).join('') || '<span class="tt-same">No change</span>');

  // v6 Crest: büyük yuvarlak çift halkalı madalyon, kurdele nadirlik, ortalı satırlar + çubuk altta, kahraman şeridi (yüz + fark yan yana)
  function v6(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="cv-line"><div class="cv-lt">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span></div>${rollRow(r)}</div>`;
    }).join('');
    const strip = g.usable.map((s) => `<div class="c6-h">${face(s)}<span><small>${esc(s.h.name)}</small>${heroDeltas(s, it)}</span></div>`).join('');
    return `<div class="tt c6" style="--rc:${it.color}">
      <header class="tt-head c6-head">${medal(it, 'ring')}<b class="tt-name">${esc(it.name)}</b><div class="c6-rib"><span>${esc(sp.rarity)} ${esc(sp.kind)}</span></div><div class="t2-grip">${sp.grip ? esc(sp.grip) + ' · ' : ''}Item level ${esc(sp.ilvl)}</div></header>
      <div class="tt-main">${powerBlock(it, 'c6p')}${cvImp(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}${reqLine(it, 'c')}</div>
      <div class="tt-side"><div class="tt-sec c">Compare</div><div class="c6-strip">${strip}</div>${noRow(g)}</div>
      ${cvFoot(it)}</div>`;
  }

  // v7 Arch: kemerli altın çerçeve, oyma başlık + elmaslar (kurdele yok), 2 sütunlu ortalı stat ızgarası, küçük hap kahraman çipleri
  function v7(it) {
    const sp = subParts(it);
    const g = groups(it);
    const cells = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="c7-cell">${ico(lineIcon(l), 'tt-ico big')}<span class="tl-t">${tierChip(l.tier)} ${esc(l.text)}</span>${rollRow(r, 'thin')}</div>`;
    }).join('');
    const chips = g.usable.map((s) => `<div class="c7-pill">${face(s)}<b>${esc(s.h.name)}</b>${heroDeltas(s, it)}</div>`).join('');
    return `<div class="tt c7" style="--rc:${it.color}">
      <header class="tt-head c7-head">${medal(it, 'arch')}<b class="tt-name">${esc(it.name)}</b><div class="c7-eng"><i></i><span>${esc(sp.rarity)} ${esc(sp.kind)}</span><i></i></div><div class="t2-grip">${sp.grip ? esc(sp.grip) + ' · ' : ''}Item level ${esc(sp.ilvl)}</div></header>
      <div class="tt-main">${powerBlock(it, 'c7p')}${cvImp(it)}<div class="c7-grid">${cells}</div>${effectBlock(it)}${reqLine(it, 'c')}</div>
      <div class="tt-side"><div class="c7-pills">${chips}</div>${noRow(g)}</div>
      ${cvFoot(it)}</div>`;
  }

  // v8 Seal: altıgen mühür madalyonu, güçlü nadirlik ışıması; çubuk satırın alt çizgisi; kahraman sütunları (yüz üstte, fark altta)
  function v8(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="c8-line"><div class="cv-lt">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span></div>${r ? `<span class="c8-bar">${rollBar(r, 'wide')}<em>${fmtN(r.lo)}&ndash;${fmtN(r.hi)}</em></span>` : ''}</div>`;
    }).join('');
    const cols = g.st.map((s) => `<div class="c8-col ${s.kind}">${face(s, s.kind === 'no' ? 'gray' : '')}<small>${esc(s.h.name)}</small>${s.kind === 'no' ? '<span class="t2-x">Can\'t use</span>' : heroDeltas(s, it)}</div>`).join('');
    return `<div class="tt c8" style="--rc:${it.color}">
      <header class="tt-head c8-head">${medal(it, 'seal')}<b class="tt-name">${esc(it.name)}</b><div class="c8-sub"><span>${esc(sp.rarity)}</span> ${esc(sp.kind)}</div><div class="t2-grip">${sp.grip ? esc(sp.grip) + ' · ' : ''}Item level ${esc(sp.ilvl)}</div></header>
      <div class="tt-main">${powerBlock(it, 'c8p')}${cvImp(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}${reqLine(it, 'c')}</div>
      <div class="tt-side"><div class="c8-cols">${cols}</div></div>
      ${cvFoot(it)}</div>`;
  }

  // v9 Halo: çerçevesiz ikon + yumuşak hale, dolu nadirlik şeridi, güç tek satır, pip zar göstergesi, kahraman başına tek ortalı satır
  function v9(it) {
    const sp = subParts(it);
    const g = groups(it);
    const rows = it.lines.map((l) => {
      const r = roll(l);
      return `<div class="c9-line">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="tl-t">${esc(l.text)}</span>${r ? rollPips(r) : ''}</div>`;
    }).join('');
    const hs = g.usable.map((s) => `<div class="c9-h">${face(s)}<b>${esc(s.h.name)}</b>${heroDeltas(s, it)}</div>`).join('');
    return `<div class="tt c9" style="--rc:${it.color}">
      <header class="tt-head c9-head"><span class="c9-halo">${ico(`${A}${it.icon}`, 'c9-art gr-px')}</span><b class="tt-name">${esc(it.name)}</b><div class="c9-band">${esc(sp.rarity)} ${esc(sp.kind)}</div><div class="t2-grip">${sp.grip ? esc(sp.grip) + ' · ' : ''}Item level ${esc(sp.ilvl)}</div></header>
      <div class="tt-main">${it.power ? `<div class="c9-power"><i></i><b>${it.power}</b><span>Weapon power</span><i></i></div>` : ''}${cvImp(it)}<div class="tt-lines">${rows}</div>${effectBlock(it)}${reqLine(it, 'c')}</div>
      <div class="tt-side">${hs}${noRow(g)}</div>
      ${cvFoot(it)}</div>`;
  }

  const BUILD = { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9 };

  // ------------------------------------------------------------ çanta
  const BAG = ['u23', 'u17', 'u11', 'u38', 'u9', 'u30', 'u10', 'u19', 'u18', 'u35', 'u24', 'u26', 'u8', 'u41', 'u21', 'u31', 'u36', 'u22', 'u42', 'u28', 'u15', 'u33', 'u25', 'u32'];
  const cell = (u) => {
    const it = item(u);
    const sp = subParts(it);
    return `<button class="gr-item k${it.k} bc" type="button" data-u="${u}" style="--rc:${it.color}" aria-label="${esc(it.name)}"><span class="gr-c2"></span><span class="gr-c3"></span><img class="gr-svg gr-px item-art" src="${A}${it.icon}" alt="" draggable="false" style="--sz:1;--glow:${it.color}"><span class="bc-il">${esc(sp.ilvl)}</span></button>`;
  };

  const html = `<div class="gr-overlay mk-ov">
    <div class="tt-bagpanel"><div class="gr-sec gr-has-ico bag-h"><img class="gr-ui-ico" src="${A}ui-icons/bag.webp" alt="">Bag<span>${BAG.length} / 30</span></div><div class="tt-bag">${BAG.map(cell).join('')}</div></div>
    <div id="tip"></div></div>`;
  $('#ui-root').innerHTML = html;
  $('#bgimg').style.backgroundImage = `url('${A}bg/town.webp')`;

  // ------------------------------------------------------------ taslak şeridi
  const strip = document.createElement('div');
  strip.id = 'mk-strip';
  strip.innerHTML = `<b class="keep">MOCKUP</b><span class="grp">${Object.entries(VNAMES).map(([k, n]) => `<button type="button" data-v="${k}">${k.slice(1)} ${n}</button>`).join('')}</span><span class="sep"></span><span class="grp">${['bow', 'axe', 'armor', 'trinket', 'common', 'legendary', 'shield'].map((k) => `<button type="button" data-i="${k}">${k}</button>`).join('')}</span><span class="sep"></span><span class="grp">${HEROES.map((h) => `<button type="button" data-h="${h}">${T.heroes[h].name}</button>`).join('')}</span><span class="sep"></span><button type="button" data-ctx="shop">Shop</button><button type="button" class="x keep" data-x="min">_</button>`;
  document.body.append(strip);

  // ------------------------------------------------------------ çizim (yalnızca değişince)
  let last = '';
  let lastV = '';
  function render() {
    const key = `${S.v}|${S.item}|${S.hero}|${S.ctx}`;
    document.documentElement.classList.toggle('mk-clean', S.clean);
    document.querySelectorAll('#mk-strip [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v));
    document.querySelectorAll('#mk-strip [data-i]').forEach((b) => b.classList.toggle('on', KEYS[b.dataset.i] === S.item));
    document.querySelectorAll('#mk-strip [data-h]').forEach((b) => b.classList.toggle('on', b.dataset.h === S.hero));
    document.querySelectorAll('#mk-strip [data-ctx]').forEach((b) => b.classList.toggle('on', S.ctx === 'shop'));
    document.querySelectorAll('.bc').forEach((b) => b.classList.toggle('on', b.dataset.u === S.item));
    const bag = $('.tt-bag');
    bag.className = `tt-bag c${S.v.slice(1)}`;
    if (key === last) return;
    const tip = $('#tip');
    const fresh = S.v !== lastV;
    tip.innerHTML = BUILD[S.v](item(S.item));
    tip.className = `tv-${S.v}${fresh ? ' enter' : ''}`;
    last = key;
    lastV = S.v;
    place();
    writeHash();
  }
  function place() {
    const tip = $('#tip');
    const panel = $('.tt-bagpanel');
    const cellEl = $(`.bc[data-u="${S.item}"]`);
    const ov = $('.mk-ov').getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const cr = cellEl.getBoundingClientRect();
    const short = document.documentElement.classList.contains('short');
    const maxW = Math.max(240, ov.width - pr.right - 20);
    tip.style.maxWidth = '';
    tip.style.width = '';
    const base = tip.firstElementChild;
    if (short) tip.style.width = `${Math.min(maxW, 660)}px`;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = pr.right + 14 - ov.left;
    let top = cr.top + cr.height / 2 - th / 2 - ov.top;
    if (left + tw > ov.width - 6) {
      // yana sığmıyor: çantanın altına (yer varsa), yoksa sağa yaslı
      if (pr.bottom + 14 + th <= ov.bottom - 6) { left = Math.max(6, pr.left - ov.left); top = pr.bottom + 14 - ov.top; }
      else left = Math.max(6, ov.width - tw - 6);
    }
    top = Math.max(6, Math.min(ov.height - th - 6, top));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    void base;
  }
  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    const gu = Math.min(h / 1080, w / 1920);
    const de = document.documentElement;
    de.style.setProperty('--gu', `${gu}px`);
    de.classList.toggle('short', h <= 520);
    de.classList.toggle('compact', h <= 720);
    last = '';
    render();
  }

  // ------------------------------------------------------------ girdi
  const pick = (u) => { if (u && u !== S.item) { S.item = u; render(); } };
  document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') pick(e.target.closest?.('.bc')?.dataset.u); });
  document.addEventListener('click', (e) => {
    const t = e.target;
    const c = t.closest('.bc');
    if (c) return pick(c.dataset.u);
    const th = t.closest('[data-hero]');
    if (th) { S.hero = th.dataset.hero; return render(); }
    const b = t.closest('#mk-strip button');
    if (!b) return;
    if (b.dataset.v) S.v = b.dataset.v;
    else if (b.dataset.i) S.item = KEYS[b.dataset.i];
    else if (b.dataset.h) S.hero = b.dataset.h;
    else if (b.dataset.ctx) S.ctx = S.ctx === 'shop' ? 'bag' : 'shop';
    else if (b.dataset.x === 'min') return document.documentElement.classList.toggle('mk-strip-min');
    render();
  });
  document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'h') document.documentElement.classList.toggle('mk-clean'); });
  window.addEventListener('hashchange', () => { readHash(); render(); });
  window.addEventListener('resize', layout);
  layout();
})();
