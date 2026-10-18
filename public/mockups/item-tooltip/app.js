/* Item ipucu taslağı: oyun kodu değil. Veri: data.js (oyunun item-tip çıktısından üretildi). */
(function () {
  const T = window.TIP_DATA;
  const A = 'unified-inventory/';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TIERC = { C: '#b9a98a', B: '#8fb8e8', A: '#f0b04a' };
  const KEYS = { bow: 'u23', axe: 'u17', armor: 'u11', trinket: 'u38', common: 'u9', legendary: 'u30', shield: 'u41' };
  const VNAMES = { v1: 'Notched gauge', v2: 'Diamond pips', v3: 'Gem rail + effect on top' };
  const HEROES = ['h1', 'h2', 'h3', 'h4'];
  const STAT_ICO = { damage: 'might', block: '../items/iron_buckler' };
  const COIN = A + 'ui-icons/gold.webp';

  // ---- adres
  const S = { v: 'v1', item: 'u23', hero: 'h1', ctx: 'bag', clean: false };
  function readHash() {
    for (const p of location.hash.slice(1).split('&')) {
      const [k, val] = p.split('=');
      if (/^v[1-3]$/.test(k)) S.v = k;
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
    const pct = 15 + (a % 6);
    it.implicit = { ico: BLOCK_ICO, text: 'Block chance ' + pct + '%' };
    it.blockPct = pct;
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

  // ---- yardımcılar (yeni)
  const tierChip = (t) => `<span class="tt-tier" style="--tc:${TIERC[t]}">${t}</span>`;
  const effectBlock = (it) => (it.effect ? `<div class="tt-fx"><b>${esc(it.effect.split(':')[0])}</b><span>${esc(it.effect.split(':').slice(1).join(':').trim())}</span></div>` : '');
  const implicitRow = (it) => (it.implicit && !it.blockPct ? `<div class="cv-imp">${ico(it.implicit.ico ? `${A}stat-icons/${it.implicit.ico}.webp` : '', 'tt-ico')}<span>${esc(it.implicit.text)}</span></div>` : '');
  function gauge(r) {
    const t = `Roll range ${fmtN(r.lo)}–${fmtN(r.hi)}`;
    if (S.v === 'v2') {
      const on = Math.round(r.p * 4) + 1;
      return `<span class="gg g-dia" title="${t}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= on ? 'on' : ''}"></i>`).join('')}</span>`;
    }
    return `<span class="gg ${S.v === 'v3' ? 'g-rail' : 'g-notch'}" style="--p:${r.p}" title="${t}"><i></i><b></b></span>`;
  }
  const statRows = (it) => it.lines.map((l) => {
    const r = roll(l);
    return `<div class="sl">${tierChip(l.tier)}${ico(lineIcon(l))}<span class="sl-t">${esc(l.text)}</span>${r ? gauge(r) : ''}</div>`;
  }).join('');
  const heroPill = (hid, it) => {
    const s = heroState(hid, it);
    if (s.kind === 'no') return `<div class="hp no">${face(s, 'gray')}<b>${esc(s.h.name)}</b><span class="hp-x">${esc(s.msg)}</span></div>`;
    const lv = `<span class="hp-lv${s.kind === 'unmet' ? ' unmet' : ''}" title="${s.kind === 'unmet' ? 'Requires Level ' + it.req : ''}">Lv ${s.h.level}</span>`;
    return `<div class="hp">${face(s)}<b>${esc(s.h.name)}</b>${lv}<span class="hp-d">${s.deltas.map(chip).join('') || '<span class="tt-same">No change</span>'}</span></div>`;
  };

  function build(it) {
    const sp = subParts(it);
    const unmet = it.req > 1 && T.heroes[S.hero].level < it.req;
    const big = it.power
      ? `<div class="cv-power"><b>${it.power}</b><span>Weapon power</span></div>`
      : it.blockPct ? `<div class="cv-power blk"><span class="blk-n"><img class="blk-ico" src="${A}stat-icons/${BLOCK_ICO}.webp" alt=""><b>${it.blockPct}%</b></span><span>Block chance</span></div>` : '';
    const fx = effectBlock(it);
    return `<div class="tt c8" style="--rc:${it.color}">
      <header class="tt-head c8-head"><span class="cv-medal ring"><span class="gr-item k${it.k}" style="--rc:${it.color}"><span class="gr-c2"></span><span class="gr-c3"></span>${ico(`${A}${it.icon}`, 'gr-svg gr-px item-art')}</span></span>
        <div class="c8-id"><b class="tt-name">${esc(it.name)}</b><div class="c6-rib"><span>${esc(sp.rarity)} ${esc(sp.kind)}</span></div><div class="t2-grip">${sp.grip ? esc(sp.grip) + ' · ' : ''}Item level ${esc(sp.ilvl)}</div>${big}</div></header>
      <div class="tt-main">${S.v === 'v3' ? fx : ''}${implicitRow(it)}<div class="sl-list">${statRows(it)}</div>${S.v === 'v3' ? '' : fx}</div>
      <div class="tt-reqrow"><span class="rq${unmet ? ' unmet' : ''}">${it.req > 1 ? 'Requires Level ' + it.req : ''}</span><span class="vl"><img class="tt-coin" src="${COIN}" alt=""><b>${S.ctx === 'shop' ? it.sell : it.value}</b><em>${S.ctx === 'shop' ? 'sells for' : 'value'}</em></span></div>
      <div class="tt-heroes">${HEROES.map((h) => heroPill(h, it)).join('')}</div></div>`;
  }
  const BUILD = { v1: build, v2: build, v3: build };

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
    bag.className = "tt-bag";
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
