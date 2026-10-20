/* MASTERY BAR v2 arayuzu (mockup, oyun kodu DEGIL). Kurallar: core.js (SMC), sekiller: shapes.js (SMV_SHAPES), icerik: data/vN.js (SMV_DATA).
   Brief: docs/design/skill-tree-mastery-v2.md. Adres: #v=1..10&c=w|h&lv=1..30[&clean] */
'use strict';
(function () {
  const SH = window.SMV_SHAPES, MC = window.SMC;
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = 'skill-mastery-v2/';

  /* ---------- sinif tablosu (satir basligi: ikon, ad, temel aciklama) ---------- */
  const CLS = {
    w: { name: 'Warrior', av: 'warrior', mastery: 'Fury Mastery', rows: [
      { ic: 'rage', name: 'Berserker', pas: 1, d: 'Hits harder as HP drops, and losing HP also grants Rage.' },
      { ic: 'sword', name: 'Double Strike', d: 'Two quick axe blows. The basic attack; builds Rage.' },
      { ic: 'whirlwind', name: 'Whirlwind', d: 'Sweeps the front row and heals through lifesteal. Cooldown 3.' },
      { ic: 'charge', name: 'Charge', d: 'Dives at the back row and Stuns the target. Cooldown 3.' },
      { ic: 'warcry', name: "Headsman's Blow", d: 'Spends all Rage on one heavy strike. Cooldown 5.' },
    ] },
    h: { name: 'Hexer', av: 'hexer', mastery: 'Hex Mastery', rows: [
      { ic: 'soul', name: 'Ill Omen', pas: 1, d: 'When a cursed enemy dies, its Omens pass to the nearest enemy.' },
      { ic: 'eye', name: 'Evil Eye', d: 'Basic ranged curse. Stacks Omens on the target.' },
      { ic: 'drainfield', name: 'Withering Curse', d: 'Area curse that withers enemies over time. Cooldown 3.' },
      { ic: 'clover', name: 'Jinx', d: 'A Jinxed enemy misses more and crits less. Cooldown 3.' },
      { ic: 'voidstrike', name: 'Doom Mark', d: 'Detonates the target’s Omens as Doom. Cooldown 4.' },
    ] },
  };
  const KN = { F: 'Filler', E: 'Edge', M: 'Major', V: 'Evolve' };
  const TR_LOCK = { level: 'seviye', bar: 'bar (toplam harcanan puan)', row: 'o satıra harcanan puan', passive: 'pasif satırına harcanan puan' };

  const ST = { v: 1, c: 'w', lv: 30, states: {}, tip: null, fail: null, pinned: null, clean: false };
  const rows = () => CLS[ST.c].rows;
  const shape = () => SH[ST.v];
  const sOf = () => { const k = ST.v + ST.c; return ST.states[k] || (ST.states[k] = MC.newState()); };
  const dataOf = () => (window.SMV_DATA && window.SMV_DATA[ST.v] && window.SMV_DATA[ST.v][ST.c]) || null;

  /* ---------- icerik erisimi (eksik = yer tutucu) ---------- */
  function nodeInfo(key) {
    const nd = shape().byKey[key], D = dataOf(); let e = null;
    if (D) { if (nd.bridge) e = D.bridges && D.bridges[nd.id]; else { const r = D.rows && D.rows[nd.i]; e = r && r.n && r.n[nd.id]; } }
    if (!e || !e[0]) return { name: 'Node ' + nd.id, eff: '(content missing)', nw: !!(e && e[2]), ph: true };
    return { name: e[0], eff: e[1] || '(content missing)', nw: !!e[2], ph: false };
  }
  MC.setNamer((key) => nodeInfo(key).name);
  function laneName(i, side) { const D = dataOf(), r = D && D.rows && D.rows[i], sh = shape(); return (r && r.lanes && r.lanes[side]) || (sh.laneDefault && sh.laneDefault[side]) || ''; }
  function barInfo(i) { const D = dataOf(), b = D && D.bar && D.bar[i]; return b && b[0] ? { name: b[0], eff: b[1] || '(content missing)', ph: false } : { name: 'Bonus ' + MC.THR[i], eff: '(content missing)', ph: true }; }
  const masteryName = () => { const D = dataOf(); return (D && D.mastery) || CLS[ST.c].mastery; };

  /* ---------- yerlesim ---------- */
  const G = { COLW: 104, LANEH: 76, STRIP: 44, PADX: 14, GUT: 100 };
  const ABOVE = { F: 24, E: 24, M: 32, V: 54 }, BELOW = { F: 40, E: 24, M: 60, V: 80 }, RAD = { F: 24, E: 24, M: 30, V: 52 };
  function extent(def, extraTop) {
    let lo = 1e9, hi = -1e9;
    def.nodes.forEach((n) => { lo = Math.min(lo, n.lane * G.LANEH - ABOVE[n.kind]); hi = Math.max(hi, n.lane * G.LANEH + BELOW[n.kind]); });
    const pt = 8 + (extraTop || 0), pb = 6; return { y0: pt - lo, h: hi - lo + pt + pb };
  }
  function tierRanges(def) {
    const m = {}; def.nodes.forEach((n) => { const t = m[n.tier] || (m[n.tier] = { tier: n.tier, c0: n.col, c1: n.col }); t.c0 = Math.min(t.c0, n.col); t.c1 = Math.max(t.c1, n.col); });
    return Object.keys(m).map((k) => m[k]).sort((a, b) => a.c0 - b.c0);
  }
  function buildLayout(sh) {
    const rowKind = sh.lock === 'row' || sh.lock === 'passive';
    const gut = sh.lanes ? G.GUT : 0, colsMax = Math.max(sh.skill.cols, sh.pas.cols);
    const xc = (c) => gut + G.PADX + G.COLW * (c + 0.5), colsEnd = gut + G.PADX + G.COLW * colsMax;
    const L = { rowKind, gut, xc, colsEnd, rows: [], pos: {}, W: 0, H: 0, bondsX: [], extraTop: sh.bondsCol ? 14 : 0 };
    let y = rowKind ? 0 : G.STRIP;
    for (let i = 0; i < 5; i++) {
      const def = i === 0 ? sh.pas : sh.skill, ex = extent(def, L.extraTop); let stripY = null;
      if (rowKind) { stripY = y; y += G.STRIP; }
      const row = { i, def, top: y, h: ex.h, cy: y + ex.y0, stripY }; L.rows.push(row);
      def.nodes.forEach((n) => { L.pos[i + '.' + n.id] = { x: xc(n.col), y: row.cy + n.lane * G.LANEH, nd: sh.byKey[i + '.' + n.id] }; });
      y += ex.h;
    }
    L.H = y + 6; L.W = colsEnd + G.PADX;
    if (sh.bridges.length) {
      let q = 0;
      sh.bridges.forEach((b) => {
        const ra = L.rows[b.rows[0]], rb = L.rows[b.rows[1]], yy = (ra.cy + rb.cy) / 2; let x;
        if (b.far) { x = colsEnd + 60 + q * 88; L.bondsX.push(x); q++; } else x = xc(sh.byKey[b.req[0][0]].col);
        L.pos['B.' + b.id] = { x, y: yy, nd: sh.byKey['B.' + b.id] };
      });
      L.W = colsEnd + 60 + Math.max(0, q - 1) * 88 + 60;
    }
    return L;
  }
  /* excl rozeti: baglanti dikey (ayni sutun); engel olmayan ilk uygun yer */
  function placePill(L, row, anchors) {
    const ys = anchors.map((a) => a.y), x0 = anchors[0].x, mid = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2, pw = 54, ph = 20;
    const obs = []; row.def.nodes.forEach((n) => { const p = L.pos[row.i + '.' + n.id]; obs.push([p.x - RAD[n.kind], p.y - ABOVE[n.kind], p.x + RAD[n.kind], p.y + BELOW[n.kind]]); });
    const free = (cx, cy) => { const r = [cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2]; return !obs.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]); };
    for (const dx of [0, 58, -58, 90, -90]) if (free(x0 + dx, mid)) return { x: x0 + dx, y: mid };
    return { x: x0 + 58, y: mid };
  }
  const link = (A_, B_) => (A_.y === B_.y || A_.x === B_.x ? `M${A_.x},${A_.y} L${B_.x},${B_.y}` : `M${A_.x},${A_.y} C${(A_.x + B_.x) / 2},${A_.y} ${(A_.x + B_.x) / 2},${B_.y} ${B_.x},${B_.y}`);
  const farPath = (A_, B_) => { const rail = A_.y - 64; return `M${A_.x},${A_.y - 26} V${rail} H${B_.x} V${B_.y}`; };

  /* ---------- parca HTML'leri ---------- */
  const PL = '<svg class="pl" viewBox="0 0 12 14"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
  function nodeHTML(L, sh, key) {
    const p = L.pos[key], nd = p.nd, info = nodeInfo(key), k = nd.kind;
    let dm;
    if (nd.bridge) dm = `<span class="dm"><img class="ha" src="${A}${rows()[nd.rows[0]].ic}.webp" alt="" draggable="false"><img class="hb" src="${A}${rows()[nd.rows[1]].ic}.webp" alt="" draggable="false"></span>`;
    else if (k === 'M' || k === 'V') dm = `<span class="dm"><img src="${A}${rows()[nd.i].ic}.webp" alt="" draggable="false"></span>`;
    else dm = '<span class="dm"></span>';
    const pp = k === 'F' ? '<span class="pp"></span>' : '', lb = k === 'M' || k === 'V' ? `<span class="lb">${esc(info.name)}</span>` : '', nw = info.nw ? '<span class="nw">NEW</span>' : '';
    return `<button type="button" class="nd k-${k.toLowerCase()}${nd.bridge ? ' br' : ''}" data-key="${key}" data-tip="n:${key}" aria-label="${esc(info.name)}" style="left:${p.x}px;top:${p.y}px">${dm}${pp}${lb}${nw}</button>`;
  }
  function tierLabel(sh, tier) { return `<small>${MC.tierName(tier)}</small><b>${PL}${esc(MC.lockLabel(sh.tiers[tier]))}<em></em></b>`; }

  /* ---------- sayfa iskeleti ---------- */
  let R = null; // arayuz referanslari
  function renderTabs() {
    $('#st-tabs').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<button type="button" data-v="${v}" class="${ST.v === v ? 'on' : ''}"><b>${v}</b>${esc(SH[v].name)}</button>`).join('');
    $('#cls-sel').innerHTML = ['w', 'h'].map((c) => `<button type="button" data-cls="${c}" class="${ST.c === c ? 'on' : ''}"><img src="${A}${CLS[c].av}.webp" alt="">${CLS[c].name}</button>`).join('');
  }
  function renderInfo() {
    const sh = shape();
    const tiers = sh.tierOrder.map((t) => `${t === 'E' ? 'Evolve' : t === 'B' ? 'Bond' : t === 'P' ? 'Pasif' : t} ${MC.lockLabel(sh.tiers[t])}`).join(' · ');
    $('#st-info').innerHTML = `<h2>${sh.n} · ${esc(sh.name)}</h2><p>${esc(sh.tr)}</p><p class="m">Tier kilidi: ${TR_LOCK[sh.lock]}. ${esc(tiers)}. Evolve yalnızca L30'da, karakter başına 1 tane.</p>`;
  }
  /* kullanilabilir genislige gore kolon genisligi (104..148); dar ekranda 104 ve yatay kayar */
  function pickColw(sh) {
    const sheet = $('#sheet'), cs = getComputedStyle(sheet), inner = sheet.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const labw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--labw')) || 196, cols = Math.max(sh.skill.cols, sh.pas.cols);
    const room = inner - labw - 6 - (sh.lanes ? G.GUT : 0) - 2 * G.PADX - (sh.bondsCol ? 240 : 0);
    return Math.max(104, Math.min(148, Math.floor(room / cols)));
  }
  /* ust uste Major / Evolve varsa serit araligi artar (isim etiketi sigsin) */
  function laneHFor(sh) {
    for (const def of [sh.skill, sh.pas]) for (const a of def.nodes) for (const b of def.nodes) if (a !== b && a.col === b.col && b.lane > a.lane && b.lane - a.lane <= 1.01 && (a.kind === 'M' || a.kind === 'V') && (b.kind === 'M' || b.kind === 'V')) return 90;
    return 76;
  }
  function build() {
    G.COLW = pickColw(shape()); G.LANEH = laneHFor(shape());
    const sh = shape(), D = dataOf(), C0 = CLS[ST.c], L = buildLayout(sh);
    renderTabs(); renderInfo();
    /* mastery bar */
    const mk = MC.THR.map((t) => `<span class="mk" data-t="${t}" style="left:${t / MC.BARMAX * 100}%"><em>${t}</em><i></i></span>`).join('');
    const bns = MC.THR.map((t, i) => { const b = barInfo(i); return `<div class="bn${b.ph ? ' ph' : ''}" data-tip="b:${i}" data-i="${i}"><b>${t}</b><span class="bnm">${esc(b.name)}</span></div>`; }).join('');
    const barHTML = `<div class="barw"><div class="bar-top"><span class="bnm">${esc(masteryName())}</span><span class="bval"><b id="bval">0</b> / ${MC.BARMAX}</span></div><div class="barrow"><div class="bartrack"><div class="bf" id="bf"></div>${mk}</div></div><div class="bns">${bns}</div></div>`;
    /* agac */
    let cv = '', svg = '', labs = '';
    const strips = [];
    const addStrip = (def, y, rowIdx) => {
      tierRanges(def).forEach((t) => { const x0 = L.gut + G.PADX + G.COLW * t.c0, w = G.COLW * (t.c1 - t.c0 + 1); cv += `<div class="ts" data-tier="${t.tier}" data-row="${rowIdx}" style="left:${x0}px;top:${y}px;width:${w}px;height:${G.STRIP}px">${tierLabel(sh, t.tier)}</div>`; });
    };
    if (!L.rowKind) addStrip(sh.skill, 0, 'g');
    L.rows.forEach((row) => {
      if (L.rowKind) addStrip(row.def, row.stripY, row.i);
      tierRanges(row.def).forEach((t) => { const x0 = L.gut + G.PADX + G.COLW * t.c0, w = G.COLW * (t.c1 - t.c0 + 1); cv += `<div class="tb" data-tier="${t.tier}" data-row="${row.i}" style="left:${x0}px;top:${row.top}px;width:${w}px;height:${row.h}px"></div>`; });
      svg += `<line class="sep" x1="0" y1="${row.top + row.h}" x2="${L.W}" y2="${row.top + row.h}"/>`;
      const rr = rows()[row.i];
      labs += `<div class="rl${rr.pas ? ' pas' : ''}" data-row="${row.i}" data-tip="r:${row.i}" style="top:${row.cy - 26}px"><span class="med"><img src="${A}${rr.ic}.webp" alt=""></span><span class="rt"><b>${esc(rr.name)}</b><i>${rr.pas ? 'Passive' : 'Skill'} · <u data-pts="${row.i}">0</u> pts</i></span></div>`;
      if (sh.lanes && row.def.nodes.some((n) => n.lane !== 0)) {
        [['u', -1], ['l', 1]].forEach(([side, ln]) => { const t = laneName(row.i, side); if (t) cv += `<div class="lanelab" style="left:0;width:${L.gut - 2}px;top:${row.cy + ln * G.LANEH}px">${esc(t)}</div>`; });
      }
      /* excl baglantilari + rozet */
      Object.keys(row.def.groups).forEach((g) => {
        const sides = row.def.groups[g], anchors = Object.keys(sides).map((s) => { const n = row.def.byId[sides[s][0]]; return L.pos[row.i + '.' + n.id]; });
        const ys = anchors.map((a) => a.y), x0 = anchors[0].x, pil = placePill(L, row, anchors), n = anchors.length;
        svg += `<path class="xk" data-xg="${row.i}.${g}" d="M${x0},${Math.min.apply(null, ys)} L${x0},${Math.max.apply(null, ys)}"/>`;
        cv += `<div class="pill" data-xg="${row.i}.${g}" style="left:${pil.x}px;top:${pil.y}px">1 of ${n}</div>`;
      });
    });
    /* gerek cizgileri */
    sh.nodes.forEach((n) => {
      const B = L.pos[n.key]; n.req.forEach((term) => term.forEach((src) => {
        const Pa = L.pos[src]; const far = n.bridge && n.far;
        svg += `<path class="${term.length > 1 ? 'alt' : ''}${far ? ' far' : ''}" data-a="${src}" data-b="${n.key}" d="${far ? farPath(Pa, B) : link(Pa, B)}"/>`;
      }));
    });
    /* dugumler */
    sh.nodes.forEach((n) => { cv += nodeHTML(L, sh, n.key); });
    /* kopru basligi / basliklari (V2) */
    if (sh.bondsCol) {
      const nearTier = sh.tiers.B, farTier = sh.tiers.III;
      cv += `<div class="ts bonds" data-tier="III" data-row="g" data-bonds="1" style="left:${L.colsEnd}px;top:0;width:${L.W - L.colsEnd}px;height:${G.STRIP}px"><small>Bonds</small><b>${PL}${esc(MC.lockLabel(farTier))}<em></em></b></div>`;
      sh.bridges.filter((b) => !b.far).forEach((b) => { const p = L.pos['B.' + b.id]; cv += `<div class="bcap" data-cap="B" style="left:${p.x - 26}px;top:${p.y}px">Bond · ${esc(MC.lockLabel(nearTier))}</div>`; });
      sh.bridges.filter((b) => b.far).forEach((b) => { const p = L.pos['B.' + b.id]; void p; });
    }
    $('#sheet').innerHTML = `<div class="sh-top"><img src="${A}${C0.av}.webp" alt=""><div class="nm">${C0.name}<small id="lvline"></small></div>
      <div class="sp"><span class="sf">Spent <b id="spv">0</b></span><span class="sf">Free <b id="frv">0</b></span></div></div>
      ${barHTML}
      <div class="treewrap"><div class="labcol" style="height:${L.H}px">${labs}</div><div class="tree" id="tree"><div class="canvas" style="width:${L.W}px;height:${L.H}px"><svg class="lines" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}">${svg}</svg>${cv}</div></div></div>
      <div class="legend"><span><i class="lg lg-f"></i>Filler: küçük elmas, rank noktalı</span><span><i class="lg lg-e"></i>Edge: yuvarlak</span><span><i class="lg lg-m"></i>Major: ikonlu büyük elmas</span><span><i class="lg lg-v"></i>Evolve: altın, en büyük (L30, karakter başına 1)</span>${sh.bondsCol ? '<span><i class="lg lg-b"></i>Bond: iki skill’in ikonu, mor</span>' : ''}<span><b class="lg-n">NEW</b>motora yeni kural ister</span><span><b class="lg-p">1 of N</b>biri seçilir, kalanlar kilitlenir</span></div>
      <div class="hintln">Tık: +1 rank · sağ tık ya da uzun basma: −1 · üstüne gelince ipucu (dokunmatikte ilk dokunuş ipucu açar, + / − düğmeleri orada).</div>`;
    R = { L, nodes: {}, lines: [], bands: [], strips: [], pills: [], xk: [], pts: {}, caps: [] };
    $$('.nd').forEach((e) => { R.nodes[e.dataset.key] = { el: e, base: e.className, pp: $('.pp', e) }; });
    $$('.lines path[data-a]').forEach((e) => R.lines.push({ el: e, a: e.dataset.a, b: e.dataset.b, base: e.getAttribute('class') || '' }));
    $$('.tb').forEach((e) => R.bands.push({ el: e, tier: e.dataset.tier, row: +e.dataset.row }));
    $$('.ts').forEach((e) => R.strips.push({ el: e, tier: e.dataset.tier, row: e.dataset.row === 'g' ? 1 : +e.dataset.row, em: $('em', e) }));
    $$('.pill').forEach((e) => R.pills.push(e)); $$('.lines path.xk').forEach((e) => R.xk.push(e));
    $$('.bcap').forEach((e) => R.caps.push(e));
    $$('[data-pts]').forEach((e) => { R.pts[e.dataset.pts] = e; });
    $('#lv').value = ST.lv; hideTip(); update();
  }

  /* ---------- guncelleme (yeniden kurmadan) ---------- */
  function update() {
    if (!R) return;
    const sh = shape(), S = sOf(), lv = ST.lv, sp = MC.spent(S), fr = MC.free(lv, S);
    $('#spv').textContent = sp; const fe = $('#frv'); fe.textContent = fr; fe.className = fr === 0 ? 'z' : '';
    $('#lvline').textContent = `Level ${lv} · ${MC.pool(lv)} points`; $('#lvv').textContent = lv; $('#lvp').textContent = fr + ' / ' + MC.pool(lv);
    $('#bval').textContent = MC.barVal(S); $('#bf').style.width = (MC.barVal(S) / MC.BARMAX * 100) + '%';
    $$('.mk').forEach((e) => e.classList.toggle('rc', sp >= +e.dataset.t)); $$('.bn').forEach((e) => e.classList.toggle('on', sp >= MC.THR[+e.dataset.i]));
    for (const key in R.nodes) {
      const e = R.nodes[key], st = MC.status(sh, lv, S, key); e.st = st;
      e.el.className = e.base + ' st-' + st.st; if (e.pp) e.pp.textContent = '●'.repeat(st.rank) + '○'.repeat(st.max - st.rank);
    }
    R.lines.forEach((l) => { const ra = MC.rk(S, l.a), rb = MC.rk(S, l.b); l.el.setAttribute('class', l.base + (ra > 0 && rb > 0 ? ' on' : ra > 0 ? ' half' : '')); });
    R.bands.forEach((b) => { b.el.classList.toggle('lk', !MC.tierState(sh, lv, S, b.tier, b.row).open); });
    R.strips.forEach((s) => {
      const t = MC.tierState(sh, lv, S, s.tier, s.row); s.el.classList.toggle('lk', !t.open);
      s.em.textContent = !t.open && t.kind !== 'level' && t.need > 0 ? t.have + '/' + t.need : '';
    });
    R.caps.forEach((c) => c.classList.toggle('lk', !MC.tierState(sh, lv, S, 'B', 1).open));
    for (const i in R.pts) R.pts[i].textContent = MC.rowSpent(S, +i);
    R.xk.forEach((x) => { const g = x.dataset.xg, [ri] = g.split('.'); const grp = sh.skill.groups[g.slice(ri.length + 1)] || sh.pas.groups[g.slice(ri.length + 1)]; const sides = Object.keys(grp); const picked = sides.some((s) => grp[s].some((id) => MC.rk(S, ri + '.' + id) > 0)); x.classList.toggle('pk', picked); });
    R.pills.forEach((p) => { const g = p.dataset.xg, ri = g.split('.')[0], grp = sh.skill.groups[g.slice(ri.length + 1)] || sh.pas.groups[g.slice(ri.length + 1)]; p.classList.toggle('pk', Object.keys(grp).some((s) => grp[s].some((id) => MC.rk(S, ri + '.' + id) > 0))); });
    refreshTip();
  }

  /* ---------- ipucu (A Band) ---------- */
  const tipEl = $('#tip'); let toastT = 0, failT = 0;
  const dia = '<span class="dia"></span>';
  const line = (h) => `<div class="ln">${dia}<span class="tx">${h}</span></div>`;
  function nodeTip(key) {
    const sh = shape(), nd = sh.byKey[key], S = sOf(), lv = ST.lv, info = nodeInfo(key), st = MC.status(sh, lv, S, key), rr = nd.bridge ? null : rows()[nd.i], k = nd.kind;
    const cls = nd.bridge ? 'br' : k === 'V' ? 'ev' : rr.pas ? 'ps' : '';
    const kind = nd.bridge ? `Bond · ${rows()[nd.rows[0]].name} ↔ ${rows()[nd.rows[1]].name}` : k === 'V' ? `Evolve · ${rr.name}` : `${KN[k]} · ${rr.name}`;
    const medal = nd.bridge ? `<div class="tp-medal two"><i style="background-image:url(${A}${rows()[nd.rows[0]].ic}.webp)"></i><i style="background-image:url(${A}${rows()[nd.rows[1]].ic}.webp)"></i></div>` : `<div class="tp-medal" style="background-image:url(${A}${rr.ic}.webp)"></div>`;
    const ts = st.tier, chips = [`<span class="chip ac">${KN[k]}</span>`];
    if (nd.max > 1) chips.push(`<span class="chip">Rank ${st.rank} / ${nd.max}</span>`);
    chips.push(st.rank > 0 ? '<span class="chip ok">Taken</span>' : '<span class="chip">Not taken</span>');
    if (!(k === 'V' && nd.tier === 'E')) chips.push(`<span class="chip">${esc(MC.tierName(nd.tier))}</span>`);
    chips.push(`<span class="chip${ts.open ? ' ok' : ''}">${esc(ts.label)}</span>`);
    if (sh.lanes && !nd.bridge && nd.lane !== 0) { const ln = laneName(nd.i, nd.lane < 0 ? 'u' : 'l'); if (ln) chips.push(`<span class="chip">${esc(ln)}</span>`); }
    if (info.nw) chips.push('<span class="chip nw">NEW</span>');
    const lines = [line(esc(info.eff))];
    if (k === 'V') lines.push(line('<span class="k">Evolves in place:</span> the skill keeps its slot and gains this behaviour. Only one Evolve per hero, Lv 30.'));
    if (info.nw) lines.push(line('<span class="k">NEW:</span> needs a new engine rule.'));
    if (nd.req.length) lines.push(line('<span class="k">Needs:</span> ' + nd.req.map((term) => term.map((q) => { const met = MC.rk(S, q) > 0; return (met ? '' : '<span class="no">') + esc(nodeInfo(q).name) + (met ? '' : '</span>'); }).join(' or ')).join(' + ')));
    if (nd.excl) { const n = Object.keys(sh.skill.groups[nd.excl.g] || sh.pas.groups[nd.excl.g]).length; lines.push(line(`<span class="k">Exclusive:</span> one of ${n} in this row; picking one locks the rest.`)); }
    const fail = ST.fail && ST.fail.key === key ? ST.fail.msg : null; let foot;
    if (fail) foot = `<div class="tp-foot bad">${dia}<span class="tx">${esc(fail)}</span></div>`;
    else if (st.rank === 0 && st.check && st.check.code !== 'points') foot = `<div class="tp-foot lock">${dia}<span class="tx">Locked: ${esc(st.check.text)}</span></div>`;
    else foot = `<div class="tp-foot">${dia}<span class="tx">${st.rank > 0 ? 'Click +1 · right-click −1' : 'Click to spend 1 point'}</span></div>`;
    const ctl = `<div class="tp-ctl"><button type="button" data-act="-1" aria-label="Remove a point">−</button><span class="rk">${st.rank} / ${nd.max}</span><button type="button" data-act="1" aria-label="Add a point">+</button></div>`;
    return `<div class="tp va ${cls}"><div class="tp-head">${medal}<div class="tp-ht"><div class="tp-kind">${esc(kind)}</div><div class="tp-title">${esc(info.name)}</div></div><div class="tp-aside"><div class="big">1<small>${nd.max > 1 ? 'POINT / RANK' : 'POINT'}</small></div></div></div><div class="tp-meta">${chips.join('')}</div><div class="tp-div"></div><div class="tp-body">${lines.join('')}</div>${foot}${ctl}</div>`;
  }
  function bonusTip(i) {
    const b = barInfo(i), S = sOf(), on = MC.spent(S) >= MC.THR[i];
    return `<div class="tp va cp"><div class="tp-head"><div class="tp-ht"><div class="tp-kind">Mastery bonus · ${esc(masteryName())}</div><div class="tp-title">${esc(b.name)}</div></div><div class="tp-aside"><div class="big">${MC.THR[i]}<small>BAR</small></div></div></div>
      <div class="tp-meta"><span class="chip ac">Bar ${MC.THR[i]}</span><span class="chip${on ? ' ok' : ''}">${on ? 'Active' : 'Not reached'}</span></div><div class="tp-div"></div><div class="tp-body">${line(esc(b.eff))}</div><div class="tp-foot">${dia}<span class="tx">${on ? 'Reached: ' + MC.spent(S) + ' of ' + MC.THR[i] : 'Spend ' + (MC.THR[i] - MC.spent(S)) + ' more point' + (MC.THR[i] - MC.spent(S) === 1 ? '' : 's') + ' in the tree'}</span></div></div>`;
  }
  function rowTip(i) {
    const rr = rows()[i], S = sOf();
    return `<div class="tp va ${rr.pas ? 'ps' : ''}"><div class="tp-head"><div class="tp-medal" style="background-image:url(${A}${rr.ic}.webp)"></div><div class="tp-ht"><div class="tp-kind">${rr.pas ? 'Passive' : 'Skill'} · ${esc(CLS[ST.c].name)}</div><div class="tp-title">${esc(rr.name)}</div></div><div class="tp-aside"><div class="big">${MC.rowSpent(S, i)}<small>POINTS</small></div></div></div><div class="tp-div"></div><div class="tp-body">${line(esc(rr.d))}</div></div>`;
  }
  function tipHTML(ref) { const [t, id] = [ref.slice(0, 1), ref.slice(2)]; return t === 'n' ? nodeTip(id) : t === 'b' ? bonusTip(+id) : rowTip(+id); }
  function showTip(el, pin) {
    const ref = el.dataset.tip; ST.tip = ref; tipEl.innerHTML = tipHTML(ref); tipEl.classList.add('show'); tipEl.classList.toggle('pin', !!pin);
    tipEl.style.left = '0px'; tipEl.style.top = '0px';
    const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = r.right + 12; if (x + w > vw - 8) x = r.left - w - 12; if (x < 8) x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    let y = r.top + r.height / 2 - h / 2; if (x < r.right && x + w > r.left) y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    y = Math.max(8, Math.min(vh - h - 8, y)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.classList.remove('show', 'pin'); $$('.pin').forEach((e) => e.classList.remove('pin')); ST.pinned = null; ST.tip = null; }
  function refreshTip() { if (!ST.tip) return; const el = $(`[data-tip="${ST.tip}"]`); if (!el) { hideTip(); return; } const was = tipEl.classList.contains('pin'); const l = tipEl.style.left, t = tipEl.style.top; tipEl.innerHTML = tipHTML(ST.tip); if (was) { tipEl.style.left = l; tipEl.style.top = t; } }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function fail(key, msg) {
    ST.fail = { key, msg }; toast(msg); clearTimeout(failT); failT = setTimeout(() => { ST.fail = null; refreshTip(); }, 2600);
    const n = R && R.nodes[key]; if (n) { n.el.classList.remove('shake'); void n.el.offsetWidth; n.el.classList.add('shake'); }
  }

  /* ---------- eylemler ---------- */
  function act(key, d) {
    const sh = shape(), S = sOf(), res = d > 0 ? MC.take(sh, ST.lv, S, key) : MC.untake(sh, ST.lv, S, key);
    if (!res.ok) fail(key, res.reason); else { ST.fail = null; }
    update();
  }
  function ensureValid() { const S = sOf(); if (MC.validate(shape(), ST.lv, S)) { MC.reset(S); toast('Level lowered: tree reset'); return true; } return false; }
  function setLevel(v) { ST.lv = Math.max(1, Math.min(30, v)); ensureValid(); writeHash(); update(); }

  /* ---------- adres ---------- */
  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1)); const v = +h.get('v'), lv = +h.get('lv');
    if (v >= 1 && v <= 10) ST.v = v; if (h.get('c') === 'h' || h.get('c') === 'w') ST.c = h.get('c'); if (lv >= 1 && lv <= 30) ST.lv = lv;
    ST.clean = h.has('clean'); document.documentElement.classList.toggle('mk-clean', ST.clean);
  }
  function writeHash() { history.replaceState(null, '', '#v=' + ST.v + '&c=' + ST.c + '&lv=' + ST.lv + (ST.clean ? '&clean' : '')); }
  function rebuild() { ensureValid(); build(); }

  /* ---------- olaylar ---------- */
  let lastPtr = 'mouse', lpT = 0, suppress = false, lpX = 0, lpY = 0;
  document.addEventListener('pointerdown', (e) => {
    lastPtr = e.pointerType || 'mouse';
    if (!e.target.closest('[data-tip]') && !e.target.closest('#tip')) hideTip();
    const nd = e.target.closest('.nd');
    clearTimeout(lpT);
    if (nd && lastPtr !== 'mouse') { lpX = e.clientX; lpY = e.clientY; lpT = setTimeout(() => { suppress = true; act(nd.dataset.key, -1); }, 520); }
  }, true);
  ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => clearTimeout(lpT), true));
  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 12) clearTimeout(lpT); }, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse' || ST.pinned) return; const el = e.target.closest('[data-tip]'); if (el) showTip(el, false); });
  document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse' || ST.pinned) return; const el = e.target.closest('[data-tip]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) { tipEl.classList.remove('show'); ST.tip = null; } });
  document.addEventListener('contextmenu', (e) => { const nd = e.target.closest('.nd'); if (!nd) return; e.preventDefault(); if (lastPtr === 'mouse') act(nd.dataset.key, -1); });
  document.addEventListener('click', (e) => {
    const ctl = e.target.closest('[data-act]'); if (ctl && ST.tip && ST.tip[0] === 'n') { act(ST.tip.slice(2), +ctl.dataset.act); return; }
    const t = e.target.closest('[data-tip]');
    if (t) {
      if (suppress) { suppress = false; return; }
      const isNode = t.classList.contains('nd');
      if (lastPtr !== 'mouse') {
        if (ST.pinned !== t) { hideTip(); ST.pinned = t; t.classList.add('pin'); showTip(t, true); return; }
        if (isNode) act(t.dataset.key, 1);
        return;
      }
      if (isNode) act(t.dataset.key, 1);
      return;
    }
    const d = e.target.closest('[data-v]'); if (d) { ST.v = +d.dataset.v; writeHash(); rebuild(); return; }
    const c = e.target.closest('[data-cls]'); if (c) { ST.c = c.dataset.cls; writeHash(); rebuild(); return; }
    if (e.target.closest('#reset')) { MC.reset(sOf()); ST.fail = null; hideTip(); update(); return; }
  });
  $('#lv').addEventListener('input', (e) => setLevel(+e.target.value));
  window.addEventListener('hashchange', () => { readHash(); rebuild(); });
  let rzT = 0; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (pickColw(shape()) !== G.COLW) { const t = $('#tree'), sx = t ? t.scrollLeft : 0; build(); const t2 = $('#tree'); if (t2) t2.scrollLeft = sx; } }, 160); });
  window.addEventListener('scroll', () => { if (ST.pinned) hideTip(); }, true);

  readHash(); writeHash(); build();
  window.__SMV = { ST, sOf, build, update, MC, SH, nodeInfo, shape };
})();
