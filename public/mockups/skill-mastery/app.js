/* MASTERY BAR taslagi arayuzu (mockup, oyun kodu DEGIL). Mantik: core.js (MC). Brief: docs/design/skill-tree-mastery.md */
'use strict';
(function () {
  const MC = window.MC, C = MC.CLASSES;
  const $ = (q) => document.querySelector(q);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const INFO = {
    1: ['Classic', 'Bar yatay üstte (harcanan toplam). 5 satır soldan sağa zincir. Referans varyant.'],
    2: ['Manual Bar', "Bar'a puan elle konur (en çok 15; eşikler 3/6/10/15, sabit bonuslar aynı). Satırdaki düğüm kademeleri bara bağlı: Filler A her zaman, Edge bar 3, Filler B bar 6, Major bar 10, Evolve bar 15. Grim Dawn kararı: bara mı skill'e mi."],
    3: ['Forked Rows', 'Her satırda Edge iki seçenekli (A/B; biri alınınca diğeri kilitli).'],
    4: ['Spine', 'Bar dikey ortada; sol tarafta 2 satır, sağ tarafta 2 satır, pasif ortada barın altında. Eşik işaretleri iki tarafa çizgi atar.'],
    5: ['Free Order', 'Satır içinde sıra yok: Filler ve Edge her zaman; Major o satırda ≥3 puan ister; Evolve Major + bar 25.'],
    6: ['Milestone Choice', 'Bar eşiklerinde bonus 2 seçenekten 1 (kartlara tıkla). Satırlar Classic.'],
    7: ['Tiered Grid', 'Satırlar 3 kademe sütunu: T1 (Filler A + Edge), T2 (Filler B + Major), T3 (Evolve). T2 bar 10, T3 bar 25 ile açılır; kademede sıra yok.'],
    8: ['Phone Cards', 'Her satır bir kart; başlıkta ikon + ad + harcanan; dokununca kart açılır, düğümler yatay kayar. Bar halka olarak sol üstte. 844x390 odaklı.'],
    9: ['Medallions', 'Bar dikey solda, satırlar sağda; Major ve Evolve büyük madalyon (ikonlu), filler\'lar madalyonun altında küçük çentik sayacı (●●●○○).'],
    10: ['Sigil Wheel', 'Pasif ortada, bar halka olarak etrafında; 4 skill satırı dört yöne ışın gibi uzanır (Filler → Edge → Filler → Major → Evolve dışa doğru).'],
  };
  const ST = { v: 1, c: 'w', l50: false, states: {}, open: 0, fail: null, phone: false, clean: false, tipKey: null };
  const sOf = () => { const k = ST.v + ST.c; return ST.states[k] || (ST.states[k] = MC.newState(ST.v, ST.c, ST.l50)); };

  /* ---------- hash ---------- */
  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1)); const v = +h.get('v');
    if (v >= 1 && v <= 10) ST.v = v; if (h.get('c') === 'h' || h.get('c') === 'w') ST.c = h.get('c');
    ST.l50 = h.has('l50'); ST.phone = h.has('phone'); ST.clean = h.has('clean');
    document.documentElement.classList.toggle('mk-phone', ST.phone); document.documentElement.classList.toggle('mk-clean', ST.clean);
    const s = ST.states[ST.v + ST.c]; if (s && s.l50 !== ST.l50 && h.has('l50') !== s.l50) { /* hash bilgisi: yalnizca yeni durum icin */ }
  }
  function writeHash() { const s = sOf(); const h = `v=${ST.v}&c=${ST.c}${s.l50 ? '&l50' : ''}${ST.phone ? '&phone' : ''}${ST.clean ? '&clean' : ''}`; history.replaceState(null, '', '#' + h); }

  /* ---------- parcalar ---------- */
  const rowKeys = (s) => ['a', 'e', 'e2', 'b', 'm', 'v', 'c', 'm2'].filter((k) => MC.exists(s, k));
  const rowSpent = (s, i) => rowKeys(s).reduce((a, k) => a + MC.rk(s, i, k), 0);
  const KC = { a: 'f', b: 'f', c: 'f', e: 'e', e2: 'e', m: 'm', m2: 'm', v: 'v' };
  function node(s, i, k, o = {}) {
    const key = i + k, row = MC.rowsOf(s)[i], r = MC.rk(s, i, k), max = MC.MAXR[k], rq = MC.req(s, key), kc = KC[k];
    const st = r > 0 ? (r >= max ? 'max' : 'part') : rq ? 'lk' : 'av';
    const l50 = k === 'c' || k === 'm2';
    const showIc = kc === 'm' || kc === 'v';
    const pips = max > 1 ? `<span class="pp">${(ST.phone || s.v === 8 || o.num) ? r + '/' + max : '●'.repeat(r) + '○'.repeat(max - r)}</span>` : '';
    const nmn = l50 ? (k === 'c' ? 'Tier II' : 'Major II') : row[k].n;
    const lb = (kc === 'm' || kc === 'v') && !o.nolb ? `<span class="lb">${esc(l50 ? nmn : kc === 'v' ? row[k].n : row[k].n)}</span>` : '';
    const img = showIc ? `<img src="${row.ic}.webp" alt="" draggable="false">` : '';
    return `<button type="button" class="nd k-${kc} st-${st}${l50 ? ' l50' : ''}${o.circ ? ' circ' : ''}${rq && r === 0 ? ' rq' : ''}${s.v === 7 && k === 'e' ? '' : ''}" data-key="${key}" aria-label="${esc(nmn)}" style="${o.style || ''}"><span class="dm">${img}</span>${pips}${lb}</button>`;
  }
  const cn = (on, dash) => `<i class="cn${on ? ' on' : ''}${dash ? ' d' : ''}"></i>`;
  function fork(s, i, o) {
    return `<span class="fk">${node(s, i, 'e', o)}${node(s, i, 'e2', o)}</span>`;
  }
  /* satir zinciri: [{k,html}] sirasi */
  function chain(s, i, o = {}) {
    const parts = []; const keys = ['a', 'e', 'b', 'm', 'v']; if (s.l50) keys.push('c', 'm2');
    keys.forEach((k) => {
      if (k === 'e' && MC.rule(s).fork) parts.push({ k, on: MC.rk(s, i, 'e') + MC.rk(s, i, 'e2') > 0, html: fork(s, i, o) });
      else parts.push({ k, on: MC.rk(s, i, k) > 0, html: node(s, i, k, o) });
    });
    if (o.rev) parts.reverse();
    let h = '';
    parts.forEach((p, q) => {
      if (q) { const nextOn = o.rev ? parts[q - 1].on : p.on; h += cn(nextOn, p.k === 'c' && !o.rev || (o.rev && parts[q - 1].k === 'c')); }
      h += p.html;
    });
    return h;
  }
  function label(s, i, o = {}) {
    const row = MC.rowsOf(s)[i];
    return `<div class="rl${row.pas ? ' pas' : ''}${o.cls ? ' ' + o.cls : ''}"><span class="med"><img src="${row.ic}.webp" alt=""></span><span class="rt"><b>${esc(row.name)}</b><i>${row.pas ? 'Passive' : 'Skill'} · <u>${rowSpent(s, i)}</u> pts</i></span></div>`;
  }
  /* ---- bar ---- */
  function uniqMarks(s) {
    const out = []; MC.marks(s).forEach((m) => { const p = out.find((x) => x.t === m.t); if (p) { p.evo = p.evo || m.evo; } else out.push(Object.assign({}, m)); }); return out;
  }
  function barH(s) {
    const max = MC.barMax(s), bar = MC.barVal(s), pct = Math.min(1, bar / max) * 100, C0 = C[s.c], man = MC.rule(s).manual;
    const mk = uniqMarks(s).map((m) => `<span class="mk${m.reached ? ' rc' : ''}${m.tbd ? ' tbd' : ''}${m.evo ? ' evo' : ''}" style="left:${m.t / max * 100}%"><em>${m.t}</em><i></i></span>`).join('');
    const track = `<div class="bartrack${man ? ' man' : ''}" ${man ? 'data-bartrack="1"' : ''}><div class="bf" style="width:${pct}%"></div>${mk}</div>`;
    const ctrl = man ? `<button type="button" class="bb" data-bar="-1" aria-label="Remove bar point">−</button>${track}<button type="button" class="bb" data-bar="1" aria-label="Add bar point">+</button>` : track;
    return `<div class="barw"><div class="bar-top"><span class="bnm">${C0.mastery}</span><span class="bval"><b>${bar}</b> / ${max}</span>${man ? '<span class="bhint">spend points on the bar by hand · max 15</span>' : ''}</div><div class="barrow">${ctrl}</div></div>`;
  }
  function barV(s, H) {
    const max = MC.barMax(s), bar = MC.barVal(s), pct = Math.min(1, bar / max) * 100;
    const mk = uniqMarks(s).map((m) => `<span class="vmk${m.reached ? ' rc' : ''}${m.tbd ? ' tbd' : ''}${m.evo ? ' evo' : ''}" style="bottom:${m.t / max * 100}%"><i></i><em>${m.t}</em></span>`).join('');
    return `<div class="vbar" style="height:${H}px"><div class="vtr"><div class="vf" style="height:${pct}%"></div></div>${mk}<div class="vval"><b>${bar}</b>/${max}</div></div>`;
  }
  function bonusList(s) {
    const C0 = C[s.c], R = MC.rule(s); const ms = uniqMarks(s);
    if (R.choice) {
      let h = '<div class="mcs">';
      ms.forEach((m) => {
        if (m.tbd) return;
        if (m.evo) { h += `<div class="bn${m.reached ? ' on' : ''}"><b>${m.t}</b><span class="bnm">${C0.bonus[4][0]}</span><span class="bd">${C0.bonus[4][1]}</span></div>`; return; }
        const p = s.picks[m.idx];
        h += `<div class="mc${m.reached ? ' rc' : ''}"><b class="mt">${m.t}</b>` + [0, 1].map((o) => {
          const d = o ? C0.alt[m.idx] : C0.bonus[m.idx];
          return `<button type="button" class="opt${p === o ? ' pick' : ''}${m.reached ? '' : ' off'}" data-pick="${m.idx}:${o}"><b>${esc(d[0])}</b><span>${esc(d[1])}</span>${d[2] ? '<em class="nw">Needs new rule</em>' : ''}</button>`;
        }).join('') + '</div>';
      });
      return h + (ms.some((m) => m.tbd) ? '<div class="bn tbd"><b>30–45</b><span class="bnm">Level 50</span><span class="bd">design TBD</span></div>' : '') + '</div>';
    }
    let h = '<div class="bns">';
    ms.forEach((m) => {
      if (m.tbd) return;
      const b = C0.bonus[Math.min(m.evo ? 4 : m.idx, 4)];
      h += `<div class="bn${m.reached ? ' on' : ''}${m.evo ? ' evo' : ''}"><b>${m.t}</b><span class="bnm">${esc(b[0])}</span><span class="bd">${esc(b[1])}</span></div>`;
    });
    if (ms.some((m) => m.tbd)) h += '<div class="bn tbd"><b>30–45</b><span class="bnm">Level 50</span><span class="bd">design TBD</span></div>';
    return h + '</div>';
  }

  /* ---------- varyant yerlesimleri ---------- */
  const EXTRA = (s) => (s.l50 ? '<span class="l50tag">L50</span>' : '');
  function rowsClassic(s) {
    let h = ''; for (let i = 0; i < 5; i++) h += `<div class="rw">${label(s, i)}<div class="rn">${chain(s, i)}</div></div>`; return h;
  }
  function layClassic(s) { return `${barH(s)}${bonusList(s)}<div class="tree"><div class="tin">${rowsClassic(s)}</div></div>`; }
  function layTier(s) {
    const bar = MC.barVal(s);
    const cols = [['T1', 'open', 1, ['a', 'e']], ['T2', 'Mastery 10', bar >= 10, ['b', 'm']], ['T3', 'Mastery 25', bar >= 25, ['v']]];
    if (s.l50) cols.push(['L50', 'design TBD', 1, ['c', 'm2']]);
    const grid = `grid-template-columns:200px ${cols.map((c) => (c[0] === 'T1' ? '1.15fr' : c[0] === 'T2' ? '1.1fr' : c[0] === 'T3' ? '.7fr' : '1.3fr')).join(' ')}`;
    let h = `<div class="tree"><div class="tin tgrid" style="${grid}"><div></div>` + cols.map((c) => `<div class="th ${c[2] ? 'open' : 'lock'}${c[0] === 'L50' ? ' l50' : ''}"><b>${c[0]}</b><small>${c[2] ? (c[1] === 'open' ? 'open' : c[1] + ' · open') : c[1] + ' · locked'}</small></div>`).join('');
    for (let i = 0; i < 5; i++) {
      h += label(s, i);
      cols.forEach((c) => {
        h += `<div class="tc ${c[2] ? 'open' : 'lock'}${c[0] === 'L50' ? ' l50' : ''}">` + c[3].map((k) => node(s, i, k)).join('') + '</div>';
      });
    }
    return `${barH(s)}${bonusList(s)}${h}</div></div>`;
  }
  function laySpine(s) {
    const RH = 124, H = RH * 2, max = MC.barMax(s);
    const side = (idxs, left) => idxs.map((i) => `<div class="srow ${left ? 'l' : 'r'}" style="height:${RH}px">${label(s, i, { cls: 'top' })}<div class="rn">${chain(s, i, { rev: left })}</div></div>`).join('');
    const guides = uniqMarks(s).map((m) => `<div class="gl${m.reached ? ' rc' : ''}${m.tbd ? ' tbd' : ''}" style="top:${H - H * m.t / max}px"></div>`).join('');
    return `${bonusList(s)}<div class="tree"><div class="tin spine"><div class="smain" style="height:${H}px">${guides}<div class="scol">${side([1, 2], true)}</div><div class="smid">${barV(s, H)}</div><div class="scol">${side([3, 4], false)}</div></div>
      <div class="spas"><div class="srow c" style="height:${RH}px">${label(s, 0, { cls: 'top' })}<div class="rn">${chain(s, 0)}</div></div></div></div></div>`;
  }
  function layPhone(s) {
    const max = MC.barMax(s), bar = MC.barVal(s), R = 42, circ = 2 * Math.PI * R, pct = Math.min(1, bar / max);
    const ticks = uniqMarks(s).map((m) => { const a = (m.t / max) * 2 * Math.PI - Math.PI / 2; const x1 = 50 + (R - 7) * Math.cos(a), y1 = 50 + (R - 7) * Math.sin(a), x2 = 50 + (R + 7) * Math.cos(a), y2 = 50 + (R + 7) * Math.sin(a); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="rt${m.reached ? ' rc' : ''}${m.tbd ? ' tbd' : ''}"/>`; }).join('');
    const ring = `<svg class="ring" viewBox="0 0 100 100" width="104" height="104"><circle cx="50" cy="50" r="${R}" class="rbg"/><circle cx="50" cy="50" r="${R}" class="rfg" stroke-dasharray="${(circ * pct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 50 50)"/>${ticks}<text x="50" y="52" class="rn1">${bar}</text><text x="50" y="66" class="rn2">/ ${max}</text></svg>`;
    let cards = '';
    for (let i = 0; i < 5; i++) {
      const row = MC.rowsOf(s)[i], op = ST.open === i;
      cards += `<div class="card${op ? ' open' : ''}${row.pas ? ' pas' : ''}"><button type="button" class="ch" data-card="${i}"><span class="med"><img src="${row.ic}.webp" alt=""></span><span class="rt"><b>${esc(row.name)}</b><i>${row.pas ? 'Passive' : 'Skill'}</i></span><span class="cp"><u>${rowSpent(s, i)}</u> pts</span><span class="chev">${op ? '▴' : '▾'}</span></button>${op ? `<div class="cs"><div class="rn">${chain(s, i, { num: true })}</div></div>` : ''}</div>`;
    }
    return `<div class="ph-top">${ring}<div class="ph-bn"><div class="bnm">${C[s.c].mastery}</div>${bonusList(s)}</div></div><div class="cards">${cards}</div>`;
  }
  function layMedal(s) {
    const RH = 116, H = RH * 5; let rows = '';
    for (let i = 0; i < 5; i++) rows += `<div class="mrow" style="height:${RH}px">${label(s, i)}<div class="rn">${chain(s, i, { circ: true })}</div></div>`;
    return `<div class="tree"><div class="tin med9"><div class="mbar">${barV(s, H - 20)}</div><div class="mrows">${rows}</div></div></div>${bonusList(s)}`;
  }
  function layWheel(s) {
    const n = s.l50 ? 7 : 5, rp = s.l50 ? 76 : 58, ringR = rp + 44, labR = ringR + 62, r0 = ringR + 106, step = 62, E = r0 + (n - 1) * step + 44, W = E * 2 + 20, cx = W / 2, cy = W / 2;
    const max = MC.barMax(s), bar = MC.barVal(s), circ = 2 * Math.PI * ringR, pct = Math.min(1, bar / max);
    const keys = ['a', 'e', 'b', 'm', 'v'].concat(s.l50 ? ['c', 'm2'] : []);
    const pos = (ang, r) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    let svg = `<circle cx="${cx}" cy="${cy}" r="${ringR}" class="rbg"/><circle cx="${cx}" cy="${cy}" r="${ringR}" class="rfg" stroke-dasharray="${(circ * pct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    uniqMarks(s).forEach((m) => { const a = (m.t / max) * 2 * Math.PI - Math.PI / 2; const [x1, y1] = pos(a, ringR - 7), [x2, y2] = pos(a, ringR + 7), [tx, ty] = pos(a, ringR + 20); svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="rt${m.reached ? ' rc' : ''}${m.tbd ? ' tbd' : ''}"/><text x="${tx}" y="${ty + 4}" class="rtx${m.reached ? ' rc' : ''}">${m.t}</text>`; });
    let nodes = '';
    // pasif: merkez cevresi
    const row0 = MC.rowsOf(s)[0];
    nodes += `<div class="wc" style="left:${cx}px;top:${cy}px"><img src="${row0.ic}.webp" alt=""><u>${rowSpent(s, 0)}</u></div>`;
    keys.forEach((k, q) => { const a = -Math.PI / 2 + q * 2 * Math.PI / keys.length; const [x, y] = pos(a, rp); nodes += node(s, 0, k, { style: `left:${x}px;top:${y}px`, num: true, nolb: true }); });
    const dirs = [[1, -Math.PI / 2], [2, 0], [3, Math.PI / 2], [4, Math.PI]];
    dirs.forEach(([i, ang]) => {
      const row = MC.rowsOf(s)[i]; const [lx, ly] = pos(ang, labR);
      nodes += `<div class="wl" style="left:${lx}px;top:${ly}px" title="${esc(row.name)}"><img src="${row.ic}.webp" alt=""><u>${rowSpent(s, i)}</u><b>${esc(row.name)}</b></div>`;
      let prev = pos(ang, labR + 22);
      keys.forEach((k, q) => {
        const [x, y] = pos(ang, r0 + q * step); const on = MC.rk(s, i, k) > 0;
        svg += `<line x1="${prev[0]}" y1="${prev[1]}" x2="${x}" y2="${y}" class="l${on ? ' on' : ''}${k === 'c' ? ' d' : ''}"/>`; prev = [x, y];
        nodes += node(s, i, k, { style: `left:${x}px;top:${y}px`, num: true, nolb: true });
      });
    });
    return `${bonusList(s)}<div class="tree wheelw" id="wheelw"><div class="wheel" style="width:${W}px;height:${W}px"><svg class="wsv" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">${svg}</svg>${nodes}<div class="wbar"><span style="left:${cx}px;top:${cy + ringR + 36}px">${C[s.c].mastery} <b>${bar}</b> / ${max}</span></div></div></div>`;
  }

  /* ---------- sayfa ---------- */
  function render() {
    const s = sOf(); const old = document.querySelector('.tree'); const sx = old ? old.scrollLeft : null, sy = old ? old.scrollTop : null, firstWheel = ST.v === 10 && !document.querySelector('.wheelw');
    document.documentElement.dataset.v = ST.v;
    $('#st-tabs').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<button type="button" data-v="${v}" class="${ST.v === v ? 'on' : ''}"><b>${v}</b>${MC.VAR[v].name}</button>`).join('');
    $('#st-info').innerHTML = `<h2>${ST.v} · ${INFO[ST.v][0]}</h2><p><b>Fark:</b> ${INFO[ST.v][1]}</p>`;
    $('#cls-sel').innerHTML = ['w', 'h'].map((c) => `<button type="button" data-cls="${c}" class="${ST.c === c ? 'on' : ''}"><img src="${C[c].av}.webp" alt="">${C[c].name}</button>`).join('');
    const body = { 1: layClassic, 2: layClassic, 3: layClassic, 4: laySpine, 5: layClassic, 6: layClassic, 7: layTier, 8: layPhone, 9: layMedal, 10: layWheel }[ST.v](s);
    $('#sheet').innerHTML = `<div class="sh-top"><img src="${C[s.c].av}.webp" alt=""><div class="nm">${C[s.c].name}<small>Level ${s.l50 ? 50 : 30} · ${MC.pool(s)} points</small></div>
      <div class="sp"><span class="sf">Spent <b id="spv">${MC.spent(s)}</b></span><span class="sf">Free <b class="fr${MC.free(s) === 0 ? ' z' : ''}">${MC.free(s)}</b></span>
      <button class="rs${s.l50 ? ' on' : ''}" type="button" data-l50="1" title="Level 50: 49 points, Tier II area (design TBD)">L50</button>
      <button class="rs" type="button" data-reset="1" title="Reset: refund every point"><img src="gold.webp" alt="">Reset</button></div></div>
      <div class="sh-body v${ST.v}">${body}</div>
      <div class="hintln">Click a node to spend 1 point, click again to refund (fillers: +1 per click, at full rank click removes one; right-click removes one). Hover (touch: tap once) for the tip.</div>`;
    const t = document.querySelector('.tree'); if (t) { if (sx != null) { t.scrollLeft = sx; t.scrollTop = sy; } else if (firstWheel) { t.scrollLeft = (t.scrollWidth - t.clientWidth) / 2; t.scrollTop = (t.scrollHeight - t.clientHeight) / 2; } }
    if (ST.v === 10 && firstWheel) { const t2 = document.querySelector('.tree'); if (t2) { t2.scrollLeft = (t2.scrollWidth - t2.clientWidth) / 2; t2.scrollTop = (t2.scrollHeight - t2.clientHeight) / 2; } }
    if (ST.fail) { const el = document.querySelector(`.nd[data-key="${ST.fail.key}"]`); if (el) { el.classList.add('shake'); } }
    if (ST.tipKey) { const el = document.querySelector(`.nd[data-key="${ST.tipKey}"]`); if (el) showTip(el); else hideTip(); }
  }

  /* ---------- ipucu (A Band) ---------- */
  const tipEl = $('#tip'); let pinned = null;
  function tipHTML(key) {
    const s = sOf(), i = +key[0], k = key.slice(1), row = MC.rowsOf(s)[i], r = MC.rk(s, i, k), max = MC.MAXR[k], l50 = k === 'c' || k === 'm2';
    const nmn = MC.nm(s, i, k), eff = l50 ? MC.TBD : row[k].e, nw = !l50 && row[k].nw, kc = MC.KIND[k];
    const cls = k === 'v' ? 'ev' : row.pas ? 'ps' : '';
    const kindLine = k === 'v' ? `Evolve · ${row.name} → ${row.v.n}` : `${kc}${l50 ? ' II' : ''} · ${row.name}`;
    const rq = MC.req(s, key), fail = ST.fail && ST.fail.key === key ? ST.fail.msg : null;
    const chips = [`<span class="chip ac">${kc}</span>`];
    if (max > 1) chips.push(`<span class="chip">Rank ${r} / ${max}</span>`);
    chips.push(r > 0 ? '<span class="chip ok">Taken</span>' : '<span class="chip">Not taken</span>');
    if (l50) chips.push('<span class="chip">Level 50</span>');
    if (nw) chips.push('<span class="chip nw">Needs new rule</span>');
    const lines = [`<div class="ln"><span class="dia"></span><span class="tx">${esc(eff)}</span></div>`];
    if (k === 'v') lines.push(`<div class="ln"><span class="dia"></span><span class="tx"><span class="k">Evolves in place:</span> ${esc(row.name)} becomes ${esc(row.v.n)}.</span></div>`);
    lines.push(`<div class="ln"><span class="dia"></span><span class="tx"><span class="k">Opens:</span> ${esc(MC.openText(s, key))}</span></div>`);
    const foot = fail ? `<div class="tp-foot bad"><span class="dia"></span><span class="tx">${esc(fail)}</span></div>` : rq && r === 0 ? `<div class="tp-foot"><span class="dia"></span><span class="tx">Locked: ${esc(rq)}</span></div>` : `<div class="tp-foot ok"><span class="dia"></span><span class="tx">${r > 0 ? 'Click to refund a point' : 'Click to spend 1 point'}</span></div>`;
    return `<div class="tp va ${cls}"><div class="tp-head"><div class="tp-medal" style="background-image:url(${row.ic}.webp)"></div><div class="tp-ht"><div class="tp-kind">${esc(kindLine)}</div><div class="tp-title">${esc(nmn)}</div></div><div class="tp-aside"><div class="big">1<small>${max > 1 ? 'POINT / RANK' : 'POINT'}</small></div></div></div>
      <div class="tp-meta">${chips.join('')}</div><div class="tp-div"></div><div class="tp-body">${lines.join('')}</div>${foot}</div>`;
  }
  function showTip(el) {
    ST.tipKey = el.dataset.key; tipEl.innerHTML = tipHTML(el.dataset.key); tipEl.classList.add('show'); tipEl.style.left = '0px'; tipEl.style.top = '0px';
    const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = r.right + 12; if (x + w > vw - 8) x = r.left - w - 12; if (x < 8) x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    let y = r.top + r.height / 2 - h / 2; if (x < r.right && x + w > r.left) y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    y = Math.max(8, Math.min(vh - h - 8, y)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.classList.remove('show'); document.querySelectorAll('.nd.pin').forEach((e) => e.classList.remove('pin')); pinned = null; ST.tipKey = null; }
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  let failT = 0;
  function failed(key, msg) { ST.fail = key ? { key, msg } : null; toast(msg); clearTimeout(failT); failT = setTimeout(() => { ST.fail = null; if (ST.tipKey) { const el = document.querySelector(`.nd[data-key="${ST.tipKey}"]`); if (el) showTip(el); } }, 2600); }

  /* ---------- olaylar ---------- */
  let lastPtr = 'mouse';
  document.addEventListener('pointerdown', (e) => { lastPtr = e.pointerType; if (!e.target.closest('.nd')) hideTip(); }, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('.nd'); if (el && !pinned) showTip(el); });
  document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse' || pinned) return; const el = e.target.closest('.nd'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) { tipEl.classList.remove('show'); ST.tipKey = null; } });
  function act(key) {
    const s = sOf(); const res = MC.click(s, key);
    if (!res.ok) { failed(key, res.reason); } else ST.fail = null;
    render();
  }
  document.addEventListener('contextmenu', (e) => {
    const el = e.target.closest('.nd'); if (!el) return; e.preventDefault();
    const res = MC.untake(sOf(), el.dataset.key); if (!res.ok) failed(el.dataset.key, res.reason); else ST.fail = null; render();
  });
  document.addEventListener('click', (e) => {
    const nd = e.target.closest('.nd');
    if (nd) {
      if (lastPtr !== 'mouse' && pinned !== nd) { hideTip(); pinned = nd; nd.classList.add('pin'); showTip(nd); return; }
      if (lastPtr !== 'mouse') { pinned = nd; ST.tipKey = nd.dataset.key; }
      act(nd.dataset.key); if (lastPtr !== 'mouse') { const n2 = document.querySelector(`.nd[data-key="${nd.dataset.key}"]`); pinned = n2; if (n2) n2.classList.add('pin'); }
      return;
    }
    const d = e.target.closest('[data-v]'); if (d) { ST.v = +d.dataset.v; hideTip(); writeHash(); render(); return; }
    const c = e.target.closest('[data-cls]'); if (c) { ST.c = c.dataset.cls; hideTip(); writeHash(); render(); return; }
    const p = e.target.closest('[data-pick]'); if (p) { const [i, o] = p.dataset.pick.split(':').map(Number); const r = MC.pick(sOf(), i, o); if (!r.ok) toast(r.reason); render(); return; }
    const b = e.target.closest('[data-bar]'); if (b) { const s = sOf(); const r = MC.setBar(s, s.bar + +b.dataset.bar); if (!r.ok) toast(r.reason); render(); return; }
    const bt = e.target.closest('[data-bartrack]'); if (bt) { const rc = bt.getBoundingClientRect(); const n = Math.round(Math.max(0, Math.min(1, (e.clientX - rc.left) / rc.width)) * 15); const r = MC.setBar(sOf(), n); if (!r.ok) toast(r.reason); render(); return; }
    const cd = e.target.closest('[data-card]'); if (cd) { const i = +cd.dataset.card; ST.open = ST.open === i ? -1 : i; render(); return; }
    if (e.target.closest('[data-reset]')) { MC.reset(sOf()); ST.fail = null; hideTip(); render(); return; }
    if (e.target.closest('[data-l50]')) { const r = MC.toggleL50(sOf()); if (!r.ok) toast(r.reason); writeHash(); render(); return; }
  });
  $('#mk-phone').onclick = () => { ST.phone = !ST.phone; document.documentElement.classList.toggle('mk-phone', ST.phone); writeHash(); render(); };
  window.addEventListener('hashchange', () => { readHash(); render(); });
  window.addEventListener('scroll', () => { if (pinned) hideTip(); }, true);

  readHash(); if (ST.l50) sOf().l50 = true; render();
  window.__MASTERY = { ST, sOf, render, tipHTML };
})();
