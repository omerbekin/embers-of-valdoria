/* SKILL AGACI Gear taslagi: ETKILESIM KATMANI (mockup, oyun kodu DEGIL). Gorunum: views.js (GV), kurallar: data/tree-logic.js (GT) + data/core.js (SMM).
   Adres: #v1 | #v2 | #v3 [&phone (telefon yatay 812x375) | &phone=740 (740x360)] [&lv=1..50] [&tab=tree (yalniz v3)] [&open (yalniz v2: calisma paneli acik)] [&clean (taslak seridini gizle; H tusu da)].
   Akis: tik = +1 BEKLEYEN puan, sag tik / uzun basis = -1 bekleyen, Reset siler, Confirm kaydeder (stat sayfasi gibi); onayli puan yalniz Respec ile geri gider.
   Dokunmatik: ilk dokunus ipucunu sabitler (+ / - dugmeleriyle), ikinci dokunus +1. */
'use strict';
(function () {
  const V = window.GV, ST = V.ST, MC = V.MC, GT = V.GT;
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const de = document.documentElement;
  const stage = $('#stage'), ui = $('#ui-root'), tipEl = $('#tip'), strip = $('#mk-strip');
  const TIP = { ref: null, pinned: null };
  let lastPtr = 'mouse', lpT = 0, lpX = 0, lpY = 0, suppress = false, toastT = 0, failT = 0, askBox = null, helpOn = false, rzT = 0;

  /* ---------- adres ---------- */
  let lastHash = null;
  function readHash() {
    lastHash = location.hash;
    const set = {};
    location.hash.slice(1).split('&').filter(Boolean).forEach((t) => { const p = t.split('='); set[p[0]] = p.length > 1 ? p[1] : true; });
    const v = ['v1', 'v2', 'v3'].find((x) => set[x]) || 'v1';
    ST.variant = v; ST.phone = set.phone ? (set.phone === '740' ? '740' : '812') : ''; ST.clean = !!set.clean;
    const lv = +set.lv; ST.lv = lv >= 1 && lv <= MC.MAXLV ? lv : 30; /* adres tum gorunumu tarif eder: lv yoksa 30 */
    ST.tab = v === 'v3' && set.tab === 'tree' ? 'tree' : 'sheet';
    ST.open = v === 'v2' && !!set.open;
  }
  function writeHash() {
    const t = [ST.variant];
    if (ST.phone) t.push(ST.phone === '740' ? 'phone=740' : 'phone'); if (ST.lv !== 30) t.push('lv=' + ST.lv);
    if (ST.variant === 'v3' && ST.tab === 'tree') t.push('tab=tree'); if (ST.open) t.push('open'); if (ST.clean) t.push('clean');
    history.replaceState(null, '', '#' + t.join('&')); lastHash = location.hash;
  }
  /* adres disaridan degisti (adres cubugu, geri tusu, baska arac): gorunumu bastan kur. hashchange + popstate + hafif yoklama (replaceState / pushState olay uretmez) */
  function syncHash() {
    if (lastHash === null || location.hash === lastHash) return;
    readHash();
    if (GT.validate(ST.lv, V.eff())) GT.fitLevel(ST.lv, ST.S, ST.P);
    render();
  }

  /* ---------- sahne olcusu: oyundaki viewport.ts gibi --gu = sahne yuksekligi / 1080 (dar ekranda genislik / 1920); html.short (<= 520) = telefon yatay; html.nw = yalniz dar + uzun pencere ---------- */
  const PHONES = { '812': [812, 375], '740': [740, 360] }; /* yatay telefon (oyunda dikey telefon sahneyi dondurur: sahne hep yatay) */
  function layout() {
    const ph = ST.phone ? PHONES[ST.phone] || PHONES['812'] : null;
    const W = ph ? ph[0] : innerWidth, H = ph ? ph[1] : innerHeight;
    stage.style.setProperty('--stage-w', W + 'px'); stage.style.setProperty('--stage-h', H + 'px');
    de.style.setProperty('--gu', Math.min(H / 1080, W / 1920) + 'px');
    ST.short = H <= 520; de.classList.toggle('short', ST.short); de.classList.toggle('compact', H <= 720); /* oyundaki html.short / html.compact: gercek kisa pencerede Phone anahtarsiz da ayni yol */
    ST.nw = W <= 620 && !ST.short; de.classList.toggle('nw', ST.nw); /* nw: yalniz gercekten dar VE uzun pencere (yedek dikey yerlesim) */
    de.classList.toggle('mk-phone', !!ST.phone); de.classList.toggle('mk-clean', !!ST.clean);
    ST.coarse = !!ST.phone || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    de.style.setProperty('--nav-k', String(ST.coarse ? 1 : Math.min(1.75, Math.max(1, Math.round(H / 640 / 0.05) * 0.05))));
    de.classList.add('close-btn-on'); /* Gear acikken sag ustte X (Menu'nun yerinde) */
  }

  /* ---------- kurulum ---------- */
  function saveScroll() {
    const g = (q, p) => { const e = $(q); return e ? e[p] : 0; };
    return { pr: g('#gt-gear .gr-page.r', 'scrollTop'), lb: g('#gt-gear .gr-lbody', 'scrollTop'), tx: g('#gt-treehost .gt-tree', 'scrollLeft'), sx: g('#gt-treehost .gt-scroll', 'scrollLeft'), sy: g('#gt-treehost .gt-scroll', 'scrollTop'), wb: g('.gt-wp-body', 'scrollTop') };
  }
  function restoreScroll(o) {
    const s = (q, p, v) => { const e = $(q); if (e && v) e[p] = v; };
    s('#gt-gear .gr-page.r', 'scrollTop', o.pr); s('#gt-gear .gr-lbody', 'scrollTop', o.lb); s('#gt-treehost .gt-tree', 'scrollLeft', o.tx); s('#gt-treehost .gt-scroll', 'scrollLeft', o.sx); s('#gt-treehost .gt-scroll', 'scrollTop', o.sy); s('.gt-wp-body', 'scrollTop', o.wb);
  }
  /* inbar: kisa ekranda islem dugmeleri agacin ust seridinde (v3 Tree sekmesi, v2 calisma paneli); v1'de sag sayfanin altinda kalir */
  function treeOpts(host, inbar) {
    const v = ST.variant, sh = ST.short;
    return { want: ST.nw ? 'p' : v === 'v1' ? 's' : v === 'v2' ? 'm' : 'l', avail: Math.max(240, host.clientWidth - 6), coarse: ST.coarse, ult: sh ? 'under' : v === 'v1' ? 'under' : v === 'v2' ? 'full' : 'side', short: sh, inbar: sh && !!inbar };
  }
  function mountTree(host, inbar) {
    const t = V.treeHTML(treeOpts(host, inbar));
    host.innerHTML = t.html;
    const uh = $('#gt-ulthost'); if (uh) uh.innerHTML = t.ultHtml || '';
    $$('.gt-nd').forEach((e) => { if (e.dataset.base === undefined) e.dataset.base = e.className; });
  }
  function mountWorkspace() {
    ui.insertAdjacentHTML('beforeend', V.workspaceHTML());
    const ov = $('#gt-wp'); ov.insertAdjacentHTML('beforeend', V.closeButtonHTML() + '<div class="gr-toast" role="status"></div>');
    ov.addEventListener('pointerdown', (e) => { if (e.target === ov) closeWorkspace(); });
    mountTree($('#gt-treehost', ov), true);
    ST.open = true;
  }
  function closeWorkspace() {
    const ov = $('#gt-wp'); if (!ov) return;
    ST.open = false; writeHash(); hideTip(); closeAsk();
    ov.classList.add('el-closing'); setTimeout(() => { ov.remove(); refresh(); }, 150);
  }
  function render() {
    hideTip(); closeAsk();
    const sc = saveScroll();
    layout();
    ui.innerHTML = V.gearHTML() + V.fsButtonHTML();
    const host = $('#gt-treehost'); if (host) mountTree(host, ST.variant === 'v3');
    if (ST.open && ST.variant === 'v2') mountWorkspace();
    refresh();
    restoreScroll(sc);
    buildStrip();
  }

  /* ---------- guncelleme (yeniden kurmadan): degisen parcalar + agac durumlari ---------- */
  const DYN = { acts: V.actsHTML, chips: V.chipsHTML, srows: V.summaryRowsHTML, card: V.cardHTML, lvl: V.lvlText, gold: V.goldHtml, spchip: V.spChipHtml, shlt: V.shltHtml };
  function refresh() {
    const E = V.eff(), free = V.freePts();
    $$('[data-dyn]').forEach((el) => { const f = DYN[el.dataset.dyn]; if (!f) return; const h = f(); if (el._h !== h) { el.innerHTML = h; el._h = h; } });
    $$('[data-badge]').forEach((b) => { b.textContent = free; b.style.display = free > 0 ? '' : 'none'; });
    refreshTree(E);
    refreshTip();
  }
  function refreshTree(E) {
    const lv = ST.lv, S = ST.S;
    $$('.gt-nd').forEach((el) => {
      const key = el.dataset.key, st = GT.status(lv, E, key);
      el.className = (el.dataset.base || 'gt-nd') + ' st-' + st.st + (ST.P[key] > 0 ? ' pend' : '') + (TIP.pinned === el ? ' pin' : '');
      const pp = $('.pp', el);
      if (pp) { const pn = ST.P[key] || 0; pp.innerHTML = '<span class="c">' + '●'.repeat(st.rank - pn) + '</span><span class="p">' + '●'.repeat(pn) + '</span>' + '○'.repeat(st.max - st.rank); }
    });
    $$('.gt-lines path[data-b]').forEach((p) => {
      if (p.dataset.cls === undefined) p.dataset.cls = p.getAttribute('class') || '';
      const a = p.dataset.a, b = p.dataset.b, rb = MC.rk(E, b), rbS = MC.rk(S, b);
      let cls = '';
      if (p.hasAttribute('data-dead')) cls = rb > 0 ? (rbS > 0 ? ' on' : ' pend') : '';
      else {
        const ra = a === 'C' ? 1 : MC.rk(E, a), raS = a === 'C' ? 1 : MC.rk(S, a);
        cls = ra > 0 && rb > 0 ? (raS > 0 && rbS > 0 ? ' on' : ' pend') : ra > 0 ? ' half' : '';
      }
      const sb = GT.status(lv, E, b).st; if (sb === 'dir') cls += ' dim';
      p.setAttribute('class', (p.dataset.cls + cls).trim());
    });
    $$('.gt-ts').forEach((s) => { const t = V.stripState(E, s.dataset.tier); $('small', s).textContent = t.small; $('.pt', s).textContent = t.pt; $('em', s).textContent = t.em; s.classList.toggle('lk', t.lk); });
    $$('.gt-tb').forEach((b) => b.classList.toggle('lk', V.stripState(E, b.dataset.tier).lk));
    $$('[data-pts],[data-pts2]').forEach((e) => { const i = +(e.dataset.pts !== undefined ? e.dataset.pts : e.dataset.pts2); e.textContent = MC.rowSpent(E, i); e.classList.toggle('pd', MC.rowSpent(E, i) !== MC.rowSpent(S, i)); });
    MC.ARMS.forEach((arm) => {
      let n = 0;
      [1, 2, 3].forEach((s) => { const key = MC.ULT + '.' + arm + s; n += MC.rk(E, key); const t = $('[data-ulv="' + key + '"]'); if (t) t.classList.toggle('lk', lv < MC.ULT_LV[s - 1]); });
      $$('[data-arm="' + arm + '"]').forEach((e) => { $('b', e).textContent = n + ' / 3'; e.classList.toggle('full', n === 3); });
    });
    const up = MC.ultSpent(E); $$('[data-upts]').forEach((e) => { e.textContent = up; if (e.parentNode) e.parentNode.classList.toggle('full', up >= MC.ULT_MAX); });
    const VIS = V.BAR_VIS, bvE = Math.min(VIS, MC.barVal(E)), bvS = Math.min(VIS, MC.barVal(S)), cE = MC.counter(E), cS = MC.counter(S);
    $$('.gt-barw').forEach((w) => {
      $('[data-bv]', w).textContent = bvE; $('[data-bp]', w).textContent = bvE > bvS ? '+' + (bvE - bvS) : '';
      $('.bf', w).style.width = (bvS / VIS * 100) + '%';
      const bp = $('.bp', w); bp.style.left = (bvS / VIS * 100) + '%'; bp.style.width = ((bvE - bvS) / VIS * 100) + '%';
      $$('.gt-mk', w).forEach((m) => { const t = +m.dataset.t; m.classList.toggle('rc', cS >= t); m.classList.toggle('rp', cE >= t && cS < t); });
      const l = $('[data-lvl]', w); if (l) l.textContent = lv;
    });
  }

  /* ---------- ipucu (A Band) ---------- */
  const tipOpts = () => ({ fail: ST.fail, touch: lastPtr !== 'mouse' });
  function place(el) {
    const sr = stage.getBoundingClientRect();
    tipEl.style.left = '0px'; tipEl.style.top = '0px';
    const r = (el.classList.contains('gt-mk') ? $('i', el) || el : el).getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = sr.width, vh = sr.height;
    const rl = r.left - sr.left, rr = r.right - sr.left, rt = r.top - sr.top, rb = r.bottom - sr.top;
    let x = rr + 12; if (x + w > vw - 8) x = rl - w - 12; if (x < 8) x = Math.max(8, Math.min(vw - w - 8, rl + r.width / 2 - w / 2));
    let y = rt + r.height / 2 - h / 2; if (x < rr && x + w > rl) y = rt - h - 8 < 8 ? rb + 8 : rt - h - 8;
    y = Math.max(8, Math.min(vh - h - 8, y)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function showTip(el, pin) {
    TIP.ref = el.dataset.tip; tipEl.innerHTML = V.tipHtml(TIP.ref, tipOpts()); tipEl.classList.add('show'); tipEl.classList.toggle('pin', !!pin); place(el);
  }
  function hideTip() { tipEl.classList.remove('show', 'pin'); $$('.pin').forEach((e) => e.classList.remove('pin')); TIP.pinned = null; TIP.ref = null; }
  function refreshTip() {
    if (!TIP.ref) return;
    const el = $('[data-tip="' + TIP.ref + '"]'); if (!el) { hideTip(); return; }
    const was = tipEl.classList.contains('pin'), l = tipEl.style.left, t = tipEl.style.top;
    tipEl.innerHTML = V.tipHtml(TIP.ref, tipOpts()); if (was) { tipEl.style.left = l; tipEl.style.top = t; }
  }
  function toast(msg, ok) {
    const t = $$('.gr-toast').pop(); if (!t) return;
    t.textContent = msg; t.classList.toggle('ok', !!ok); t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
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
    askConfirm('<b>Respec Warrior?</b> All ' + spent + ' confirmed points return to the pool and pending points are dropped. It costs <b>' + cost + ' gold</b>.<small>Placeholder price (' + GT.RESPEC_PER_LEVEL + ' gold per level): the real respec rule is still open.</small>', 'Respec', () => {
      ST.gold -= cost; GT.respec(ST.S, ST.P); ST.fail = null; refresh(); toast('Tree reset: ' + spent + ' points returned, −' + cost + ' gold', true);
    }, true);
  }
  function setTab(t) {
    if (t === 'hero') { toast('The Hero tab is the normal Gear screen: not part of this mockup'); return; }
    if (t === 'tree' && ST.variant !== 'v3') return;
    if (ST.tab === t) return;
    ST.tab = t; writeHash(); render();
  }
  function toggleFs() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    const r = de.requestFullscreen && de.requestFullscreen(); if (r && r.catch) r.catch(() => {});
  }
  function doAction(ab) {
    const a = ab.dataset.a;
    if (a.indexOf('tab:') === 0) { setTab(a.slice(4)); return; }
    if (a.indexOf('hero:') === 0) { if (a !== 'hero:warrior') toast('Only the Warrior tree is part of this mockup'); return; }
    if (ab.classList.contains('off') && a !== 'respec') return;
    if (a === 'reset') { GT.resetPending(ST.P); ST.fail = null; refresh(); }
    else if (a === 'confirm') { const n = GT.pendingCount(ST.P); GT.confirm(ST.S, ST.P); refresh(); toast(n + ' point' + (n === 1 ? '' : 's') + ' confirmed', true); }
    else if (a === 'respec') respec();
    else if (a === 'open-tree') { hideTip(); mountWorkspace(); writeHash(); refresh(); }
    else if (a === 'close') toast('In the game this closes Gear');
    else if (a === 'close-ws') closeWorkspace();
    else if (a === 'fs') toggleFs();
  }
  function applyLevel(lv) {
    ST.lv = lv;
    if (GT.validate(lv, V.eff())) { const wiped = GT.fitLevel(lv, ST.S, ST.P); toast(wiped ? 'Level lowered: tree reset' : 'Level lowered: pending points cleared'); }
    writeHash(); refresh();
  }

  /* ---------- taslak seridi (oyunun parcasi degil) ---------- */
  const NOTES = {
    v1: 'A · Whole tree on the Sheet\'s right page: small nodes (details on hover or tap), tier band once at the top, ult plus-tree under the rows.',
    v2: 'B · Right page = summary (Mastery bar, points per row, evolve status). "Open skill tree" opens the full-screen working panel.',
    v3: 'C · Third Gear tab "Tree" uses both pages: tree on the left; ult plus-tree, points and actions on the right. The Sheet tab keeps a small door.',
  };
  const HELP = 'Hover a node for its tip. Click = +1 pending point (orange ring); right-click or long-press = −1 pending; Reset clears, Confirm keeps. Touch: first tap pins the tip with − / +, second tap adds. '
    + 'Try: Deep Gash (Double Strike) = other direction chosen (Hamstring is taken); Not Today, Reaping Wind, Herald of Ruin, Dreadful Swing and the Stubborn Heart bonus = not active yet. '
    + 'Respec asks first (placeholder price). Level slider: lowering resets what no longer fits. Reset demo restores the start. '
    + 'Phone 812×375 and 740×360 = the landscape phone (the game\'s short screen, height up to 520, also a real short window): the Mastery bar is one slim strip, the tree scrolls inside its area (tier band and row icons stay in place), the ult plus-tree sits under the rows, Respec / Reset / Confirm stay in one row.';
  function buildStrip() {
    const v = ST.variant, lab = { v1: 'V1 Right page', v2: 'V2 Summary + panel', v3: 'V3 Tree tab' };
    strip.innerHTML = '<b>MOCKUP</b><button type="button" class="keep" data-s="more" aria-label="Show mockup controls">…</button>' + ['v1', 'v2', 'v3'].map((x) => '<button type="button" data-s="' + x + '" class="' + (v === x ? 'on' : '') + '">' + lab[x] + '</button>').join('')
      + '<span class="sep"></span><button type="button" data-s="phone" class="' + (ST.phone === '812' ? 'on' : '') + '">Phone 812×375</button><button type="button" data-s="phone740" class="' + (ST.phone === '740' ? 'on' : '') + '">740×360</button>'
      + '<label>Level <input id="mk-lv" type="range" min="1" max="' + MC.MAXLV + '" value="' + ST.lv + '"><b id="mk-lvv">' + ST.lv + '</b></label>'
      + '<button type="button" data-s="demo">Reset demo</button><button type="button" data-s="help" class="' + (helpOn ? 'on' : '') + '">How to test</button>'
      + '<div id="mk-note">' + NOTES[v] + '</div><div id="mk-help" class="' + (helpOn ? 'on' : '') + '">' + HELP + '</div>';
  }
  strip.addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = b.dataset.s;
    if (s === 'v1' || s === 'v2' || s === 'v3') { ST.variant = s; ST.tab = 'sheet'; ST.open = false; writeHash(); render(); }
    else if (s === 'phone' || s === 'phone740') { const want = s === 'phone' ? '812' : '740'; ST.phone = ST.phone === want ? '' : want; writeHash(); render(); }
    else if (s === 'demo') { V.reset(); writeHash(); refresh(); toast('Demo state restored', true); }
    else if (s === 'more') strip.classList.toggle('open');
    else if (s === 'help') { helpOn = !helpOn; $('#mk-help').classList.toggle('on', helpOn); b.classList.toggle('on', helpOn); }
  });
  strip.addEventListener('input', (e) => { if (e.target.id !== 'mk-lv') return; $('#mk-lvv').textContent = e.target.value; applyLevel(+e.target.value); });

  /* ---------- girdi: fare / dokunmatik / klavye ---------- */
  document.addEventListener('pointerdown', (e) => {
    lastPtr = e.pointerType || 'mouse'; suppress = false; clearTimeout(lpT);
    if (!e.target.closest('[data-tip]') && !e.target.closest('#tip')) hideTip();
    const nd = e.target.closest('.gt-nd');
    if (nd && lastPtr !== 'mouse') { lpX = e.clientX; lpY = e.clientY; lpT = setTimeout(() => { suppress = true; act(nd.dataset.key, -1); }, 520); }
  }, true);
  ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => clearTimeout(lpT), true));
  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 12) clearTimeout(lpT); }, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse' || TIP.pinned) return; const el = e.target.closest('[data-tip]'); if (el) showTip(el, false); });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || TIP.pinned) return;
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (askBox) closeAsk(); else if ($('#gt-wp')) closeWorkspace(); else hideTip(); }
    else if ((e.key === 'h' || e.key === 'H') && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) { ST.clean = !ST.clean; layout(); writeHash(); }
  });
  window.addEventListener('hashchange', syncHash); window.addEventListener('popstate', syncHash); setInterval(syncHash, 350);
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(render, 160); });
  window.addEventListener('scroll', () => { if (TIP.pinned) hideTip(); }, true);

  readHash();
  if (GT.validate(ST.lv, V.eff())) GT.fitLevel(ST.lv, ST.S, ST.P); /* adresteki dusuk level: sigmayan puanlar silinir (sessiz) */
  render();
  window.__GTM = { ST, V, render, refresh, act };
})();
