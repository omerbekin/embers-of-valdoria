/* C5: Garrick ilk puanda eslik (mockup, oyun kodu DEGIL). compact.js'in Gear + sutunlu agac kabugunun ustune Garrick katmani. */
'use strict';
(function () {
  const P = window.__CPT, ST = P.ST, V = P.V, MC = V.MC;
  const $ = (q, r) => (r || document).querySelector(q), $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const ui = $('#ui-root');
  const VAR = TW.v, REC = '1.f1';
  const SENT = {
    tree: 'Start with Knee Cutter. Double Strike is free, so you will swing it every single turn.',
    stat: "Put it in Strength. It is the Warrior's main stat: every point makes every hit land harder.",
  };
  const S = { view: TW.p.s === 'stat' ? 'stat' : 'tree', pts: 3, pend: { str: 0, dex: 0, int: 0, luck: 0 }, dismissed: { tree: false, stat: false }, done: { tree: false, stat: false }, tokenOpen: true };
  document.documentElement.classList.add('c5', 'c5-' + VAR);

  function reset() { ST.lv = 2; ST.S = MC.newState(); ST.P = {}; ST.gold = 120; ST.fail = null; }
  const pendStat = () => Object.values(S.pend).reduce((a, b) => a + b, 0);
  const pendSkill = () => V.GT.pendingCount(ST.P);

  /* ---------- sekme / gorunum ---------- */
  function setView(v, quiet) {
    S.view = v; ST.tab = v === 'stat' ? 'sheet' : 'tree'; ui._k = null; ov = null; P.render(); decorate();
    if (!quiet) { try { parent.postMessage({ tw: 'state', p: { s: v } }, '*'); } catch (e) { /* yok say */ } }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a^="tab:"]'); if (!b) return;
    const t = b.dataset.a.slice(4); if (t === 'hero') return;
    e.stopPropagation(); e.preventDefault(); setView(t === 'sheet' ? 'stat' : 'tree');
  }, true);

  /* ---------- Sheet: stat puani (oyundaki gibi: Main stat'a dokun = +1 bekleyen, sag tik / basili tut = -1) ---------- */
  function decorateSheet() {
    const free = S.pts - pendStat();
    const medal = $('.sh-medal span'); if (medal) medal.textContent = free;
    const med = $('.sh-medal'); if (med) med.classList.toggle('empty', free <= 0);
    const tx = $('.sh-tx'); if (tx) tx.textContent = free > 0 ? 'stat point' + (free === 1 ? '' : 's') + ' to spend' : 'All points placed';
    $$('.sh-row[data-stat]').forEach((r) => {
      const k = r.dataset.stat; if (!(k in S.pend)) return;
      r.classList.add('can-add'); r.dataset.attr = k;
      let b = $('.c5-plus', r);
      if (!b) { b = document.createElement('span'); b.className = 'c5-plus'; r.append(b); }
      const t = S.pend[k] ? '+' + S.pend[k] : '+';
      if (b.textContent !== t) b.textContent = t;
      b.classList.toggle('has', S.pend[k] > 0);
    });
  }
  document.addEventListener('click', (e) => {
    const r = e.target.closest('.sh-row.can-add'); if (!r || S.view !== 'stat') return;
    if (S.pts - pendStat() > 0) { S.pend[r.dataset.stat]++; decorate(); }
  });
  document.addEventListener('contextmenu', (e) => { const r = e.target.closest('.sh-row.can-add'); if (!r) return; e.preventDefault(); if (S.pend[r.dataset.stat] > 0) { S.pend[r.dataset.stat]--; decorate(); } });

  /* ---------- Garrick katmani ---------- */
  const face = '<span class="gk-face"><img src="garrick.webp" alt="Garrick"></span>';
  function targetEl() {
    if (S.view === 'stat') return $('.sh-row[data-stat="str"]');
    return $('.gt-nd[data-key="' + REC + '"]');
  }
  const placedRec = () => (S.view === 'tree' ? (ST.P[REC] || 0) > 0 : S.pend.str > 0);
  const placedAny = () => (S.view === 'tree' ? pendSkill() > 0 : pendStat() > 0);
  const host = () => $('.gr-panel') || ui;
  let ov = null, lastKey = '';
  function decorate() {
    if (S.view === 'stat') decorateSheet();
    const h = host();
    if (!ov || ov.parentNode !== h) { if (ov) ov.remove(); ov = document.createElement('div'); ov.id = 'gk'; ov.className = 'gk gk-' + VAR; h.append(ov); lastKey = ''; ov.addEventListener('click', onOv); }
    const t = targetEl(), v = S.view;
    const state = S.done[v] ? 'done' : placedAny() ? (placedRec() ? 'good' : 'other') : S.dismissed[v] ? 'quiet' : 'suggest';
    $$('.gk-glow, .gk-soft').forEach((e) => e.classList.remove('gk-glow', 'gk-soft'));
    if (t && state === 'suggest' || t && state === 'quiet') t.classList.add('gk-glow');
    if (t && state === 'good') t.classList.add('gk-soft');
    const key = VAR + v + state + (S.tokenOpen ? 1 : 0);
    if (key !== lastKey) { ov.innerHTML = content(v, state); lastKey = key; }
    place(t, state);
  }
  function lineFor(v, state) {
    if (state === 'good') return 'Good. Press Confirm to lock it in.';
    if (state === 'other') return 'Your call, commander. Press Confirm when you are happy with it.';
    return SENT[v];
  }
  function content(v, state) {
    if (state === 'done') return '';
    const line = lineFor(v, state);
    const nm = '<b class="gk-nm">Garrick</b>';
    if (VAR === 'a') {
      if (state === 'quiet') return '';
      return `<div class="gk-bub">${face}<div class="gk-tx">${nm}<span>${line}</span></div>${state === 'suggest' ? '<button type="button" class="el-btn gk-ok" data-gk="dismiss">Got it</button>' : ''}</div>`;
    }
    if (VAR === 'b') {
      const take = state === 'suggest' || state === 'quiet' ? '<button type="button" class="el-btn gk-take" data-gk="take">Take it</button>' : '';
      const mine = state === 'suggest' ? '<button type="button" class="el-link gk-own" data-gk="dismiss">I will choose</button>' : '';
      return `<div class="gk-rib">${face}<div class="gk-tx">${nm}<span>${state === 'quiet' ? SENT[v] : line}</span></div><div class="gk-rb">${mine}${take}</div></div>`;
    }
    const open = S.tokenOpen;
    return `<button type="button" class="gk-tok" data-gk="tok" title="Garrick's pick">${face}<span class="gk-pick">Garrick's pick</span></button>${open ? `<div class="gk-card"><div class="gk-ch"><b>Garrick</b><span>Old Border Commander</span></div><div class="gk-cb">${state === 'quiet' ? SENT[v] : line}</div></div>` : ''}`;
  }
  function onOv(e) {
    const b = e.target.closest('[data-gk]'); if (!b) return;
    const v = S.view, k = b.dataset.gk;
    if (k === 'dismiss') S.dismissed[v] = true;
    else if (k === 'take') { if (v === 'tree') P.act(REC, 1); else S.pend.str++; }
    else if (k === 'tok') S.tokenOpen = !S.tokenOpen;
    lastKey = ''; decorate();
  }
  function place(t, state) {
    const h = ov.parentNode, hr = h.getBoundingClientRect();
    ov.style.display = state === 'done' ? 'none' : '';
    const el = ov.firstElementChild; if (!el || !t) return;
    const sc = hr.width / h.offsetWidth || 1, W = h.offsetWidth, H = h.offsetHeight;
    const rel = (r) => ({ l: (r.left - hr.left) / sc, r: (r.right - hr.left) / sc, t: (r.top - hr.top) / sc, b: (r.bottom - hr.top) / sc });
    const T = rel(t.getBoundingClientRect()), cx = (T.l + T.r) / 2, cy = (T.t + T.b) / 2;
    const SHORT = document.documentElement.classList.contains('short');
    const stat = S.view === 'stat', door = stat ? $('.gt-doorpage') : null;
    const D = door ? rel(door.getBoundingClientRect()) : null;
    const X0 = D ? D.l + 10 : 0, RW = D ? Math.max(260, W - X0 - 24) : 0;
    if (VAR === 'a') {
      el.classList.toggle('side', stat);
      if (stat) { el.style.width = Math.min(640, RW) + 'px'; const hh = el.offsetHeight; el.style.left = X0 + 'px'; el.style.top = Math.max(8, Math.min(H - hh - 8, cy - hh / 2)) + 'px'; el.style.setProperty('--ty', '50%'); }
      else { el.style.width = ''; const w = el.offsetWidth, hh = el.offsetHeight; el.style.left = Math.round(W / 2 - w / 2) + 'px'; el.style.top = Math.round(H - hh - 10) + 'px'; el.style.setProperty('--tx', Math.max(24, Math.min(w - 24, cx - (W / 2 - w / 2))) + 'px'); }
    } else if (VAR === 'b' && SHORT) {
      const w = Math.min(760, W - 90); el.style.width = w + 'px'; el.style.transform = 'none'; el.style.left = Math.round(W - w - 10) + 'px'; el.style.top = Math.round(H - el.offsetHeight - 6) + 'px';
    } else if (VAR === 'b') {
      if (stat) { el.style.left = X0 + 'px'; el.style.width = Math.min(760, RW) + 'px'; el.style.top = Math.round(D.b + 28) + 'px'; el.style.transform = 'none'; }
      else {
        const hd = $('.gr-tree-head'), R = hd ? rel(hd.getBoundingClientRect()) : { t: 90, b: 120 };
        const w = Math.min(1040, W - 700); el.style.width = w + 'px'; el.style.transform = 'none'; el.style.left = Math.round(W / 2 - w / 2 + 130) + 'px'; el.style.top = Math.round((R.t + R.b) / 2 - el.offsetHeight / 2) + 'px';
      }
    } else if (VAR === 'c') {
      const tok = $('.gk-tok', ov), card = $('.gk-card', ov), tw = tok.offsetWidth;
      tok.style.left = Math.max(4, Math.min(W - tw - 4, cx - 18)) + 'px'; tok.style.top = Math.max(4, T.t - tok.offsetHeight - 4) + 'px';
      if (card) {
        const w = card.offsetWidth, hh = card.offsetHeight;
        if (SHORT) { const w2 = Math.min(600, W - 90); card.style.width = w2 + 'px'; card.style.left = Math.round(W - w2 - 10) + 'px'; card.style.top = Math.round(H - card.offsetHeight - 6) + 'px'; }
        else if (stat) { card.style.left = X0 + 'px'; card.style.top = Math.max(8, Math.min(H - hh - 8, cy - hh / 2)) + 'px'; }
        else { card.style.left = Math.max(8, Math.min(W - w - 8, cx - 18)) + 'px'; card.style.top = Math.max(8, T.t - hh - 56) + 'px'; }
      }
    }
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-a="confirm"]')) return;
    S.done[S.view] = true; setTimeout(decorate, 30);
  }, true);

  let raf = 0; const again = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(decorate); };
  new MutationObserver(again).observe(ui, { subtree: true, childList: true });
  window.addEventListener('resize', () => setTimeout(again, 250));
  window.addEventListener('hashchange', () => { const q = {}; location.hash.replace(/^#/, '').split('&').forEach((t, i) => { if (i > 0) { const k = t.split('='); q[k[0]] = k[1]; } }); const v = q.s === 'stat' ? 'stat' : 'tree'; if (v !== S.view) setView(v, true); });
  setInterval(decorate, 400);

  reset(); setView(S.view, true);
  window.__C5 = { S, setView, decorate };
})();
