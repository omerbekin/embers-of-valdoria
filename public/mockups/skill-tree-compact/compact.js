/* SKILL AGACI SIKISTIRMA taslagi: ETKILESIM KATMANI (mockup, oyun kodu DEGIL). Gorunum: views.js (GV) + layouts.js (CL); kurallar: data/tree-logic.js (GT) + data/core.js (SMM).
   Adres: #v1 .. #v5 [&lv=1..50] [&ult (v3: ult paneli acik; v4: ult gorunumu)] [&sel=0..3 (v3 secili skill)].
   Akis (oyundaki gibi): tik = +1 BEKLEYEN puan, sag tik / uzun basis = -1 bekleyen, Reset siler, Confirm kaydeder; onayli puan yalniz Respec ile geri gider. Dokunmatik: ilk dokunus ipucunu sabitler, ikinci +1. */
'use strict';
(function () {
  const V = window.GV, ST = V.ST, MC = V.MC, GT = V.GT, CL = window.CL, CV = CL.CV;
  ST.variant = 'v4'; ST.tab = 'tree'; /* Gear kabugu: Tree sekmesi acik (views.js gearHTML v4 yolu) */
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const de = document.documentElement;
  const stage = $('#stage'), ui = $('#ui-root'), tipEl = $('#tip');
  const TIP = { ref: null, pinned: null };
  const VARS = ['v1', 'v2', 'v3', 'v4', 'v5'];
  const NAMES = { v1: 'Columns', v2: 'Strips', v3: 'Picker', v4: 'Grid', v5: 'Spine' };
  const NOTES = {
    v1: 'V1 Dikey sutunlar: her skill bir sutun, tier\'lar tek ortak sol bantta asagi iner, ulti altta genis bant. Arti: hepsi tek bakista, evolve + tier kilidi hizali. Eksi: dar telefonda satirlar 30 px civari, dokunma hedefi 44 px olmaz.',
    v2: 'V2 Yatay seritler: her skill bir satir, dugumler sagda, ulti sagda dar dikey panel. Arti: bugunku okuma duzenine en yakin (soldan saga). Eksi: 4 serit x 4 yan yana dugum telefonda cok dar, ulti paneli kolonlari 40 px altinda.',
    v3: 'V3 Secmeli: sol sutunda 4 skill ozeti + ult madalyonu, secileni buyuk bir dal olarak acilir (adli); ulti madalyondan acilan panel. Arti: tek dal buyuk ve rahat, telefonda 44 px saglayan tek yapi. Eksi: tum agaci ayni anda gormek icin tiklamak gerekir.',
    v4: 'V4 Siki izgara: 4 satir x 12 sutun kucuk dugum, ayrinti sabit aciklama alaninda, ult ayri gorunum. Arti: en az yer, her sey sabit yerde. Eksi: bagi okumak zorlasir, telefonda aciklama 60 px seride sikisir.',
    v5: 'V5 Merkez omurga: ortada tier kapilari, skill dallari iki yana, dort evolve omurgada toplanir, ult omurganin dibinde haca (+). Arti: evolve + ult ortak merkezde, ayna duzeni. Eksi: V1e en yakin yapi; telefonda satirlar 20 px civari.',
  };
  let lastPtr = 'mouse', lpT = 0, lpX = 0, lpY = 0, suppress = false, toastT = 0, failT = 0, askBox = null, rzT = 0, lastHash = null, noteOn = false;

  /* ---------- adres ---------- */
  function readHash() {
    lastHash = location.hash;
    const set = {}; location.hash.slice(1).split('&').filter(Boolean).forEach((t) => { const p = t.split('='); set[p[0]] = p.length > 1 ? p[1] : true; });
    CV.v = VARS.find((x) => set[x]) || 'v1';
    const lv = +set.lv; ST.lv = lv >= 1 && lv <= MC.MAXLV ? lv : 30;
    CV.ult = CV.v === 'v3' && !!set.ult; CV.view = CV.v === 'v4' && set.ult ? 'ult' : 'skills';
    const sel = set.sel !== undefined ? +set.sel : 1; CV.sel = sel >= 0 && sel <= 3 ? sel : 1;
  }
  function writeHash() {
    const t = [CV.v]; if (ST.lv !== 30) t.push('lv=' + ST.lv);
    if (CV.v === 'v3') { if (CV.sel !== 1) t.push('sel=' + CV.sel); if (CV.ult) t.push('ult'); }
    if (CV.v === 'v4' && CV.view === 'ult') t.push('ult');
    history.replaceState(null, '', '#' + t.join('&')); lastHash = location.hash;
  }
  function syncHash() { if (lastHash === null || location.hash === lastHash) return; readHash(); if (GT.validate(ST.lv, V.eff())) GT.fitLevel(ST.lv, ST.S, ST.P); render(); }

  /* ---------- sahne olcusu (oyundaki viewport.ts gibi) ---------- */
  function layout() {
    const W = innerWidth, H = innerHeight;
    stage.style.setProperty('--stage-w', W + 'px'); stage.style.setProperty('--stage-h', H + 'px');
    ST.u = Math.min(H / 1080, W / 1920); de.style.setProperty('--gu', ST.u + 'px');
    ST.short = H <= 520; de.classList.toggle('short', ST.short); de.classList.toggle('compact', H <= 720);
    ST.nw = false; de.classList.remove('nw');
    ST.coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ST.short;
    de.style.setProperty('--nav-k', String(ST.coarse ? 1 : Math.min(1.75, Math.max(1, Math.round(H / 640 / 0.05) * 0.05))));
    ST.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); de.classList.toggle('reduced-motion', ST.reduced);
    de.classList.add('close-btn-on');
  }

  /* ---------- kurulum ---------- */
  function topHTML() {
    const sh = ST.short;
    let t = '';
    if (CV.v === 'v4') t += `<div class="cp-tabs"><button type="button" class="cp-tab${CV.view === 'skills' ? ' on' : ''}" data-a="view:skills">Skills</button><button type="button" class="cp-tab${CV.view === 'ult' ? ' on' : ''}" data-a="view:ult" data-tip="p:4">Ultimate <b data-upts>0</b>/${MC.ULT_MAX}</button></div>`;
    t += V.barHTML(true);
    if (sh) t += `<div class="gt-acts gt-inbar" data-dyn="acts">${V.actsHTML()}</div>`;
    return `<div class="cp-top">${t}</div>`;
  }
  function mountTree() {
    const host = $('#gt-treehost'); if (!host) return;
    host.innerHTML = `<div class="gt q4 cs cp ${CV.v}" id="cp">${topHTML()}<div class="cp-body" id="cp-body"></div></div>`;
    const body = $('#cp-body'), cp = $('#cp');
    const res = CL.L[CV.v](body.clientWidth, body.clientHeight, ST.short);
    cp.style.cssText += res.vars; body.innerHTML = res.html; ST.meta = res.meta;
    $$('.gt-nd').forEach((e) => { if (e.dataset.base === undefined) e.dataset.base = e.className; });
  }
  function buildHead() {
    const g = $('.gr-head'); if (!g) return;
    const bs = VARS.map((x, i) => `<button type="button" class="cp-vb${CV.v === x ? ' on' : ''}" data-a="var:${x}" title="${x.toUpperCase()} ${NAMES[x]}"><b>${i + 1}</b><span>${NAMES[x]}</span></button>`).join('');
    const el = document.createElement('div'); el.className = 'cp-vs';
    el.innerHTML = `${bs}<span class="cp-sep"></span><button type="button" class="cp-vb sm" data-a="lv:-5" aria-label="Level down">Lv−</button><b class="cp-lv" data-dyn="lvn">${ST.lv}</b><button type="button" class="cp-vb sm" data-a="lv:5" aria-label="Level up">Lv+</button><button type="button" class="cp-vb sm" data-a="demo" title="Reset demo">↺</button><button type="button" class="cp-vb sm nt${noteOn ? ' on' : ''}" data-a="note" title="Note">i</button>`;
    g.insertBefore(el, $('.gr-grow', g));
  }
  function buildNote() {
    let n = $('#cp-note'); if (!n) { n = document.createElement('div'); n.id = 'cp-note'; document.body.appendChild(n); }
    n.textContent = NOTES[CV.v]; n.classList.toggle('on', noteOn || (!ST.short && innerHeight >= 900));
  }
  function render() {
    hideTip(); closeAsk();
    layout();
    const key = ST.short ? 's' : 'd'; /* kabuk yalniz ilk acilista / kisa-uzun degisince kurulur (giris animasyonu her varyant degisiminde tekrarlanmasin) */
    if (!$('#gt-gear') || ui._k !== key) { ui.innerHTML = V.gearHTML(); ui._k = key; buildHead(); }
    else $$('.cp-vb[data-a^="var:"]').forEach((b) => b.classList.toggle('on', b.dataset.a === 'var:' + CV.v));
    mountTree(); buildNote();
    refresh();
    showDetail(CV.v === 'v4' ? (CV.view === 'ult' ? 'p:4' : 'p:1') : null, true);
  }

  /* ---------- guncelleme ---------- */
  const DYN = { acts: V.actsHTML, lvl: V.lvlText, gold: V.goldHtml, spchip: V.spChipHtml, shlt: V.shltHtml, rail: () => CL.railHTML(ST.short), lvn: () => String(ST.lv) };
  function refresh() {
    const E = V.eff(), free = V.freePts();
    $$('[data-dyn]').forEach((el) => { const f = DYN[el.dataset.dyn]; if (!f) return; const h = f(); if (el._h !== h) { el.innerHTML = h; el._h = h; } });
    $$('[data-badge]').forEach((b) => { b.textContent = free; b.style.display = free > 0 ? '' : 'none'; });
    refreshTree(E); refreshTip();
  }
  const FXC = ['anim-fill', 'anim-evolve', 'anim-reset', 'anim-confirm', 'anim-dim', 'anim-awaken', 'anim-evoready'];
  function playFx(el, names, ms) { FXC.forEach((c) => el.classList.remove(c)); void el.offsetWidth; names.split(' ').forEach((c) => el.classList.add(c)); clearTimeout(el._at); el._at = setTimeout(() => FXC.forEach((c) => el.classList.remove(c)), ms || 1500); }
  function nodeFx(el, st, pn) {
    const old = el._fx; el._fx = { rank: st.rank, pn, st: st.st };
    if (!old || ST.reduced) return;
    const isV = el.classList.contains('k-v'), shut = (x) => x === 'tlk' || x === 'rq' || x === 'dir';
    if (st.rank < old.rank) playFx(el, 'anim-reset', 700);
    else if (st.rank > old.rank) playFx(el, 'anim-fill' + (isV ? ' anim-evolve' : ''), isV ? 1800 : 1000);
    else if (old.pn > 0 && pn === 0) playFx(el, 'anim-confirm', 1000);
    else if (st.st === 'dir' && old.st !== 'dir') playFx(el, 'anim-dim', 600);
    else if (isV && st.st === 'av' && old.st !== 'av') playFx(el, 'anim-evoready', 1800);
    else if (shut(old.st) && !shut(st.st)) playFx(el, 'anim-awaken', 900);
  }
  const LVL = { '': 0, half: 1, pend: 2, on: 2 };
  function refreshTree(E) {
    const lv = ST.lv, S = ST.S;
    $$('.gt-nd').forEach((el) => {
      const key = el.dataset.key, st = GT.status(lv, E, key), keep = (el.className.match(/anim-\S+/g) || []).join(' ');
      el.className = (el.dataset.base || 'gt-nd') + ' st-' + st.st + (ST.P[key] > 0 ? ' pend' : '') + (TIP.pinned === el ? ' pin' : '') + (keep ? ' ' + keep : '');
      nodeFx(el, st, ST.P[key] || 0);
      const pp = $('.pp', el);
      if (pp) { const pn = ST.P[key] || 0; pp.innerHTML = '<span class="c">' + '●'.repeat(st.rank - pn) + '</span><span class="p">' + '●'.repeat(pn) + '</span>' + '○'.repeat(st.max - st.rank); }
    });
    $$('.gt-lines path[data-b]').forEach((p) => {
      if (p.dataset.cls === undefined) p.dataset.cls = p.getAttribute('class') || '';
      const a = p.dataset.a, b = p.dataset.b, rb = MC.rk(E, b), rbS = MC.rk(S, b);
      let cls = '';
      if (p.hasAttribute('data-dead')) cls = rb > 0 ? (rbS > 0 ? ' on' : ' pend') : '';
      else { const ra = a === 'C' ? 1 : MC.rk(E, a), raS = a === 'C' ? 1 : MC.rk(S, a); cls = ra > 0 && rb > 0 ? (raS > 0 && rbS > 0 ? ' on' : ' pend') : ra > 0 ? ' half' : ''; }
      const lvl = cls.trim(), wasFlow = p.classList.contains('flow');
      if (GT.status(lv, E, b).st === 'dir') cls += ' dim';
      p.setAttribute('class', (p.dataset.cls + cls + (wasFlow ? ' flow' : '')).trim());
      if (p._lv !== undefined && !ST.reduced && LVL[lvl] > LVL[p._lv]) {
        let len = 80; try { if (p.getTotalLength) len = Math.ceil(p.getTotalLength()) || 80; } catch (e) { /* yok say */ }
        p.style.setProperty('--len', String(len)); p.classList.remove('flow'); void (p.getBoundingClientRect && p.getBoundingClientRect()); p.classList.add('flow');
        clearTimeout(p._ft); p._ft = setTimeout(() => p.classList.remove('flow'), 1100);
      }
      p._lv = lvl;
    });
    $$('.gt-ts').forEach((s) => { const t = V.stripState(E, s.dataset.tier); $('small', s).textContent = t.small; $('.pt', s).textContent = t.pt; $('em', s).textContent = t.em; s.classList.toggle('lk', t.lk); });
    $$('.gt-tb').forEach((b) => { if (b.dataset.tier !== 'L') b.classList.toggle('lk', V.stripState(E, b.dataset.tier).lk); });
    $$('[data-ulh]').forEach((h) => h.classList.toggle('lk', lv < MC.ULT_LV[+h.dataset.ulh - 1]));
    $$('[data-pts]').forEach((e) => { const i = +e.dataset.pts; e.textContent = MC.rowSpent(E, i); e.classList.toggle('pd', MC.rowSpent(E, i) !== MC.rowSpent(S, i)); });
    const uarm = MC.ultArm(E);
    MC.ARMS.forEach((arm) => {
      let n = 0;
      [1, 2, 3].forEach((s) => { const key = MC.ULT + '.' + arm + s; n += MC.rk(E, key); const t = $('[data-ulv="' + key + '"]'); if (t) t.classList.toggle('lk', lv < MC.ULT_LV[s - 1]); });
      const off = !!uarm && arm !== uarm;
      $$('[data-arm="' + arm + '"]').forEach((e) => { $('b', e).textContent = off ? 'closed' : n + ' / 3'; e.classList.toggle('full', n === 3); e.classList.toggle('off', off); e.title = off ? 'One ult path only: the ' + MC.ARM_NAME[uarm] + ' arm is chosen' : ''; });
    });
    const up = MC.ultSpent(E); $$('[data-upts]').forEach((e) => { e.textContent = up; if (e.parentNode) e.parentNode.classList.toggle('full', up >= MC.ULT_MAX); });
    const VIS = V.BAR_VIS, bvE = Math.min(VIS, MC.barVal(E)), bvS = Math.min(VIS, MC.barVal(S)), cE = MC.counter(E), cS = MC.counter(S);
    $$('.gt-barw').forEach((w) => {
      $('[data-bv]', w).textContent = bvE; $('[data-bp]', w).textContent = bvE > bvS ? '+' + (bvE - bvS) : '';
      $('.bf', w).style.width = (bvS / VIS * 100) + '%';
      const bp = $('.bp', w); bp.style.left = (bvS / VIS * 100) + '%'; bp.style.width = ((bvE - bvS) / VIS * 100) + '%';
      $$('.gt-mk', w).forEach((m) => { const t = +m.dataset.t; m.classList.toggle('rc', cS >= t); m.classList.toggle('rp', cE >= t && cS < t); });
    });
  }

  /* ---------- ipucu (A Band) ya da v4'te sabit aciklama alani ---------- */
  const tipOpts = () => ({ fail: ST.fail, touch: lastPtr !== 'mouse' });
  const detailMode = () => CV.v === 'v4';
  function place(el) {
    const sr = stage.getBoundingClientRect();
    tipEl.style.left = '0px'; tipEl.style.top = '0px';
    const r = (el.classList.contains('gt-mk') ? $('i', el) || el : el).getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = sr.width, vh = sr.height;
    const rl = r.left - sr.left, rr = r.right - sr.left, rt = r.top - sr.top, rb = r.bottom - sr.top;
    let x = rr + 12; if (x + w > vw - 8) x = rl - w - 12; if (x < 8) x = Math.max(8, Math.min(vw - w - 8, rl + r.width / 2 - w / 2));
    let y = rt + r.height / 2 - h / 2; if (x < rr && x + w > rl) y = rt - h - 8 < 8 ? rb + 8 : rt - h - 8;
    y = Math.max(8, Math.min(vh - h - 8, y)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function stateLine(key) {
    const nd = MC.BY[key], E = V.eff(), st = GT.status(ST.lv, E, key), pend = ST.P[key] || 0, committed = st.rank - pend, fl = ST.fail && ST.fail.key === key ? ST.fail.msg : null;
    if (fl) return { t: fl, c: 'bad' };
    if (st.rank === 0 && st.check && st.check.code === 'points') return { t: 'No points left', c: '' };
    if (st.rank === 0 && st.check) return { t: (['ultcap', 'ultarm', 'direction'].indexOf(st.check.code) >= 0 ? '' : 'Locked: ') + st.check.text, c: 'lock' };
    if (pend > 0) return { t: 'Pending +' + pend + ': Confirm keeps it', c: 'pend' };
    if (committed > 0) return { t: 'Confirmed: only a respec takes it back', c: '' };
    return { t: lastPtr !== 'mouse' ? 'Tap again to add 1 pending point' : 'Click to add 1 pending point', c: '' };
  }
  function miniDetail(ref) {
    const t = ref[0], id = ref.slice(2);
    if (t !== 'n') { const i = t === 'p' || t === 'r' ? +id : -1, rr = V.ROWS[i]; return rr ? `<div class="mt"><b>${V.esc(rr.name)}</b><span>${V.esc(rr.d)}</span></div>` : '<div class="mt"><b>Mastery bonus</b><span>Hover a bonus on the bar.</span></div>'; }
    const nd = MC.BY[id], info = V.nodeInfo(id), st = GT.status(ST.lv, V.eff(), id), sl = stateLine(id), pend = ST.P[id] || 0;
    const canAdd = !GT.check(ST.lv, V.eff(), id), canSub = pend > 0;
    return `<div class="mt"><div class="mh"><b>${V.esc(info.name)}</b><i>${V.KN[nd.kind]} · ${V.ROWS[nd.i].name}${nd.max > 1 ? ' · Rank ' + st.rank + ' / ' + nd.max : ''}</i></div><span class="mx">${V.esc(info.eff)}</span><span class="ms ${sl.c}">${V.esc(sl.t)}</span></div><div class="gt-ctl"><button type="button" data-act="-1" aria-label="Take back a pending point"${canSub ? '' : ' disabled'}>−</button><span class="rk">${st.rank} / ${nd.max}</span><button type="button" data-act="1" aria-label="Add a pending point"${canAdd ? '' : ' disabled'}>+</button></div>`;
  }
  function detailHtml(ref) { return ST.short ? miniDetail(ref) : V.tipHtml(ref, tipOpts()); }
  function showDetail(ref, force) {
    const d = $('[data-dt]'); if (!d || !ref) return;
    if (!force && TIP.ref === ref && d._r === ref && d._o === JSON.stringify(ST.fail)) { /* ayni */ }
    TIP.ref = ref; d._r = ref; d.innerHTML = detailHtml(ref);
  }
  function showTip(el, pin) {
    if (detailMode()) { showDetail(el.dataset.tip, true); return; }
    TIP.ref = el.dataset.tip; tipEl.innerHTML = V.tipHtml(TIP.ref, tipOpts()); tipEl.classList.add('show'); tipEl.classList.toggle('pin', !!pin); place(el);
  }
  function hideTip() { tipEl.classList.remove('show', 'pin'); $$('.pin').forEach((e) => e.classList.remove('pin')); TIP.pinned = null; if (!detailMode()) TIP.ref = null; }
  function refreshTip() {
    if (!TIP.ref) return;
    if (detailMode()) { const d = $('[data-dt]'); if (d) d.innerHTML = detailHtml(TIP.ref); return; }
    const el = $('[data-tip="' + TIP.ref + '"]'); if (!el) { hideTip(); return; }
    const was = tipEl.classList.contains('pin'), l = tipEl.style.left, t = tipEl.style.top;
    tipEl.innerHTML = V.tipHtml(TIP.ref, tipOpts()); if (was) { tipEl.style.left = l; tipEl.style.top = t; }
  }
  function toast(msg, ok) { const t = $$('.gr-toast').pop(); if (!t) return; t.textContent = msg; t.classList.toggle('ok', !!ok); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
  function shake(key) { $$('.gt-nd[data-key="' + key + '"]').forEach((n) => { n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); }); }

  /* ---------- eylemler ---------- */
  function act(key, d) {
    const res = d > 0 ? GT.addPending(ST.lv, ST.S, ST.P, key) : GT.removePending(ST.lv, ST.S, ST.P, key);
    if (res.ok) ST.fail = null;
    else { ST.fail = { key, msg: res.reason }; toast(res.reason); clearTimeout(failT); failT = setTimeout(() => { ST.fail = null; refreshTip(); }, 2600); }
    refresh(); if (!res.ok) shake(key);
  }
  function askConfirm(html, ok, run, danger) {
    closeAsk();
    const host = $$('.gr-overlay').pop(); if (!host) return;
    const box = document.createElement('div'); box.className = 'gr-confirm';
    box.innerHTML = '<div class="gr-confirm-card"><div class="gr-confirm-text">' + html + '</div><div class="gr-confirm-row"><button type="button" class="gr-btn" data-c="no">Cancel</button><button type="button" class="gr-btn primary' + (danger ? ' danger' : '') + '" data-c="ok">' + ok + '</button></div></div>';
    box.addEventListener('pointerdown', (e) => { if (e.target === box) closeAsk(); });
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; const go = b.dataset.c === 'ok'; closeAsk(); if (go) run(); });
    host.append(box); askBox = box;
  }
  function closeAsk() { if (askBox) { askBox.remove(); askBox = null; } }
  function respec() {
    const spent = MC.spent(ST.S), cost = GT.respecCost(ST.lv);
    if (!spent) { toast('No confirmed points to take back'); return; }
    if (ST.gold < cost) { toast('Not enough gold (' + ST.gold + ' of ' + cost + ')'); return; }
    askConfirm('<b>Respec Warrior?</b> All ' + spent + ' confirmed points return to the pool and pending points are dropped. It costs <b>' + cost + ' gold</b>.<small>Placeholder price (' + GT.RESPEC_PER_LEVEL + ' gold per level): the real respec rule is still open.</small>', 'Respec', () => { ST.gold -= cost; GT.respec(ST.S, ST.P); ST.fail = null; refresh(); toast('Tree reset: ' + spent + ' points returned, −' + cost + ' gold', true); }, true);
  }
  function setVar(v) { if (CV.v === v) return; CV.v = v; CV.ult = false; CV.view = 'skills'; writeHash(); render(); }
  function doAction(ab) {
    const a = ab.dataset.a;
    if (a.indexOf('var:') === 0) { setVar(a.slice(4)); return; }
    if (a.indexOf('tab:') === 0) { if (a === 'tab:hero' || a === 'tab:sheet') toast('Only the Tree tab is part of this mockup'); return; }
    if (a.indexOf('hero:') === 0) { if (a !== 'hero:warrior') toast('Only the Warrior tree is part of this mockup'); return; }
    if (a.indexOf('sel:') === 0) { CV.sel = +a.slice(4); CV.ult = false; hideTip(); writeHash(); render(); return; }
    if (a === 'ult:toggle') { CV.ult = !CV.ult; hideTip(); writeHash(); render(); return; }
    if (a === 'ult:close') { CV.ult = false; hideTip(); writeHash(); render(); return; }
    if (a.indexOf('view:') === 0) { CV.view = a.slice(5); hideTip(); writeHash(); render(); return; }
    if (a.indexOf('lv:') === 0) { applyLevel(clampLv(ST.lv + +a.slice(3))); return; }
    if (a === 'demo') { V.reset(); writeHash(); render(); toast('Demo state restored', true); return; }
    if (a === 'note') { noteOn = !noteOn; buildNote(); ab.classList.toggle('on', noteOn); return; }
    if (ab.classList.contains('off') && a !== 'respec') return;
    if (a === 'reset') { GT.resetPending(ST.P); ST.fail = null; refresh(); }
    else if (a === 'confirm') { const n = GT.pendingCount(ST.P); GT.confirm(ST.S, ST.P); refresh(); toast(n + ' point' + (n === 1 ? '' : 's') + ' confirmed', true); }
    else if (a === 'respec') respec();
    else if (a === 'close') toast('In the game this closes Gear');
  }
  const clampLv = (x) => Math.max(1, Math.min(MC.MAXLV, x));
  function applyLevel(lv) {
    ST.lv = lv;
    if (GT.validate(lv, V.eff())) { const wiped = GT.fitLevel(lv, ST.S, ST.P); toast(wiped ? 'Level lowered: tree reset' : 'Level lowered: pending points cleared'); }
    writeHash(); render();
  }

  /* ---------- girdi ---------- */
  document.addEventListener('pointerdown', (e) => {
    lastPtr = e.pointerType || 'mouse'; suppress = false; clearTimeout(lpT);
    if (!e.target.closest('[data-tip]') && !e.target.closest('#tip') && !e.target.closest('[data-dt]')) hideTip();
    const nd = e.target.closest('.gt-nd');
    if (nd && lastPtr !== 'mouse') { lpX = e.clientX; lpY = e.clientY; lpT = setTimeout(() => { suppress = true; act(nd.dataset.key, -1); }, 520); }
  }, true);
  ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => clearTimeout(lpT), true));
  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 12) clearTimeout(lpT); }, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse' || TIP.pinned) return; const el = e.target.closest('[data-tip]'); if (el) showTip(el, false); });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || TIP.pinned || detailMode()) return;
    const el = e.target.closest('[data-tip]');
    if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) { tipEl.classList.remove('show'); TIP.ref = null; }
  });
  document.addEventListener('contextmenu', (e) => { const nd = e.target.closest('.gt-nd'); if (!nd) return; e.preventDefault(); if (lastPtr === 'mouse') act(nd.dataset.key, -1); });
  document.addEventListener('click', (e) => {
    const t = e.target;
    const ctl = t.closest('[data-act]');
    if (ctl) { if (TIP.ref && TIP.ref[0] === 'n' && !ctl.disabled) act(TIP.ref.slice(2), +ctl.dataset.act); return; }
    const ab = t.closest('[data-a]'); if (ab) { doAction(ab); return; }
    const tt = t.closest('[data-tip]'); if (!tt) return;
    if (suppress) { suppress = false; return; }
    const isNode = tt.classList.contains('gt-nd');
    if (lastPtr !== 'mouse') {
      if (TIP.pinned !== tt) { hideTip(); TIP.pinned = tt; tt.classList.add('pin'); showTip(tt, true); return; }
      if (isNode) act(tt.dataset.key, 1);
      return;
    }
    if (isNode) act(tt.dataset.key, 1);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (askBox) closeAsk(); else if (CV.ult) { CV.ult = false; writeHash(); render(); } else hideTip(); } });
  window.addEventListener('hashchange', syncHash); window.addEventListener('popstate', syncHash); setInterval(syncHash, 350);
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(render, 160); });

  readHash();
  if (GT.validate(ST.lv, V.eff())) GT.fitLevel(ST.lv, ST.S, ST.P);
  render();
  window.__CPT = { ST, V, CV, render, refresh, act };
})();

/* Olcum yardimcisi (yalniz test; taslak kontrolu): window.__M() -> sayfa kaymasi, dugum dokunma kutusu, ust uste binen dugumler. */
window.__M = function () {
  const de = document.documentElement, $$ = (q) => Array.from(document.querySelectorAll(q));
  const nd = $$('.cp-body .gt-nd').filter((e) => e.offsetParent !== null);
  const R = nd.map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.key, l: r.left, t: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2, s: parseFloat(getComputedStyle(e).getPropertyValue('--s')) || 0 }; });
  let minHit = 1e9, minK = '', hitOv = 0, minDist = 1e9; const visOv = [];
  R.forEach((r) => { const m = Math.min(r.w, r.h); if (m < minHit) { minHit = m; minK = r.k; } });
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j], iw = Math.min(a.l + a.w, b.l + b.w) - Math.max(a.l, b.l), ih = Math.min(a.t + a.h, b.t + b.h) - Math.max(a.t, b.t); if (iw > 1 && ih > 1) hitOv++; const d = Math.hypot(a.cx - b.cx, a.cy - b.cy); if (d < minDist) minDist = d; if (d < (a.s + b.s) / 2 * 0.8) visOv.push(a.k + '~' + b.k); }
  const br = document.querySelector('#cp-body').getBoundingClientRect();
  const out = R.filter((r) => r.l < br.left - 1 || r.t < br.top - 1 || r.l + r.w > br.right + 1 || r.t + r.h > br.bottom + 1).map((r) => r.k);
  const other = $$('.cp-body [data-tip]:not(.gt-nd),.cp-tab,.cp-card,.cp-umed,.cp-uclose,.cp-top .sh-btn,.gr-foot .sh-btn,.gt-foot .sh-btn,.cp-dt .gt-ctl button').filter((e) => e.offsetParent !== null).map((e) => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); });
  return { v: location.hash, vw: innerWidth, vh: innerHeight, scrollH: de.scrollHeight, scrollW: de.scrollWidth, n: R.length, minHit: Math.round(minHit), minK, hitOv, minDist: Math.round(minDist), visOvN: visOv.length, visOv: visOv.slice(0, 5), outN: out.length, out: out.slice(0, 5), minOther: other.length ? Math.min.apply(null, other) : null, body: [Math.round(br.width), Math.round(br.height)] };
};
