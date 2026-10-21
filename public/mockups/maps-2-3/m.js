/* Harita 2 / 3 düğüm yerleşimi taslağı: oyun kodu DEGIL. Veri: data.js (window.MAPS). Rozet çerçeveleri map-roads taslağından (src/game/map-frames.ts geometrisi). */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const W = 1672, H = 941;
  const COL = { battle: '#cdb67f', event: '#b99ad6', treasure: '#efc85a', rest: '#f08c3c', merchant: '#9fc4a0', town: '#e3bf72', elite: '#d9562c', boss: '#ff7a2a', crossing: '#7fc3d9' };
  const KIND = { battle: 'Battle', event: 'Event', treasure: 'Treasure', rest: 'Rest point', merchant: 'Merchant', town: 'Town', elite: 'Elite', boss: 'Boss', crossing: 'Crossing (deck battle)' };
  const BASE = { battle: 33, tab: 36, town: 48, elite: 50, boss: 64 };
  const kindOf = (t) => (t === 'battle' ? 'battle' : t === 'town' ? 'town' : t === 'elite' ? 'elite' : t === 'boss' ? 'boss' : 'tab');
  const SC = 0.62; // rozet ölçeği (1672 birimi)
  const DISC = 'url(#discg)';
  const node = (t) => `maps-2-3/n/${t}.webp`;
  const LEG = ['battle', 'elite', 'boss', 'town', 'treasure', 'event', 'rest', 'merchant', 'crossing'];

  const cv = document.createElement('canvas').getContext('2d');
  const measure = (t, font, ls) => { cv.font = font; return cv.measureText(t).width + (ls || 0) * t.length; };

  const img = (t, s) => `<image href="${node(t)}" x="${-s / 2}" y="${-s / 2 - 1}" width="${s}" height="${s}"/>`;
  const boat = (c) => `<g transform="translate(0,-1)"><path d="M-17 7 L17 7 L11 17 L-11 17Z" fill="${c}" stroke="rgba(0,0,0,.6)" stroke-width="1.4" stroke-linejoin="round"/><path d="M0 -20 L0 6" stroke="#e8d6a4" stroke-width="2.4"/><path d="M2 -19 L15 3 L2 3Z" fill="#e8d6a4" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/><path d="M-2 -13 L-12 3 L-2 3Z" fill="#cdbb92" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/><path d="M-22 21 q5.5 -5 11 0 t11 0 t11 0 t11 0" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity=".85"/></g>`;
  function frame(t) {
    const c = COL[t];
    const tab = (k) => `<path d="M${k * 30} -7 L${k * 46} 0 L${k * 30} 7 L${k * 34} 0Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>`;
    if (t === 'battle') return `<circle r="28" fill="${DISC}" stroke="${c}" stroke-width="2"/><circle r="31.5" fill="none" stroke="${c}" stroke-opacity=".3"/>${img(t, 54)}`;
    if (t === 'crossing') return `${tab(-1)}${tab(1)}<circle r="29" fill="${DISC}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>${boat(c)}`;
    if (['event', 'treasure', 'rest', 'merchant'].includes(t)) return `${tab(-1)}${tab(1)}<circle r="29" fill="${DISC}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>${img(t, 54)}`;
    if (t === 'town') {
      const flag = (k) => `<path d="M${k * 40} -12 L${k * 40} 16 M${k * 40} -12 L${k * 58} -6 L${k * 40} 0" stroke="${c}" stroke-width="2" fill="#8c2b1c" stroke-linejoin="round"/>`;
      return `${flag(-1)}${flag(1)}<path d="M-14 -44 v-8 h6 v5 h5 v-5 h6 v5 h5 v-5 h6 v8Z" fill="${c}" stroke="rgba(0,0,0,.5)"/><circle r="34" fill="${DISC}" stroke="${c}" stroke-width="3.2"/><circle r="39" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="1.4"/>${img(t, 60)}`;
    }
    if (t === 'elite') {
      const arc = (k) => `<path d="M${k * 30} -22 Q${k * 52} -26 ${k * 50} -50 Q${k * 42} -36 ${k * 24} -32Z" fill="#8f2f17" stroke="#e5703a" stroke-width="1.5" stroke-linejoin="round"/>`;
      return `${arc(-1)}${arc(1)}<circle r="39" fill="none" stroke="#9b3a1c" stroke-width="2.4" stroke-dasharray="3 4"/><circle r="33" fill="${DISC}" stroke="#e06a3a" stroke-width="3.4"/><path d="M0 -44 l7 7 l-7 7 l-7 -7Z" fill="#e8352a" stroke="#ffcf7a" stroke-width="1.5" stroke-linejoin="round"/>${img(t, 60)}`;
    }
    const wing = (k) => `<path d="M${k * 40} -10 Q${k * 62} -34 ${k * 76} -62 Q${k * 70} -34 ${k * 82} -22 Q${k * 66} -16 ${k * 74} 4 Q${k * 58} -2 ${k * 56} 18 Q${k * 46} 6 ${k * 42} 12Z" fill="url(#flameg)" stroke="#ffcf7a" stroke-width="1.2" stroke-linejoin="round"/>`;
    return `<circle r="76" fill="url(#bossg)"/>${wing(-1)}${wing(1)}<circle r="46" fill="${DISC}" stroke="#f0c25a" stroke-width="4"/><circle r="41" fill="none" stroke="#ff7a2a" stroke-width="2"/>${[-18, 0, 18].map((x, i) => `<path d="M${x - 7} -48 L${x} ${-64 - (i === 1 ? 6 : 0)} L${x + 7} -48Z" fill="#f0c25a" stroke="#7a4a10" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}<circle cx="0" cy="-54" r="3" fill="#e8352a"/>${img('boss', 78)}`;
  }
  const defs = `<defs>
   <radialGradient id="discg" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="#4a3622"/><stop offset=".7" stop-color="#1c130b"/><stop offset="1" stop-color="#0d0805"/></radialGradient>
   <radialGradient id="bossg"><stop offset=".5" stop-color="rgba(255,100,30,0)"/><stop offset=".78" stop-color="rgba(255,100,30,.5)"/><stop offset="1" stop-color="rgba(255,100,30,0)"/></radialGradient>
   <linearGradient id="flameg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8260e"/><stop offset=".6" stop-color="#ff6a1c"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
  </defs>`;

  /* yollar: oyundaki çift ince çizgi (map-roads "visible" stili, 1672 ölçeğine küçültülmüş); cep = kesikli, deniz = kesik mavi, asansör = noktalı */
  function curveD(a, b, e) {
    if (e && e.ctrl) return `M${a.px} ${a.py} Q${e.ctrl[0] * W} ${e.ctrl[1] * H} ${b.px} ${b.py}`;
    const dx = b.px - a.px, dy = b.py - a.py, d = Math.hypot(dx, dy);
    const k = ((a.n + b.n) % 2 ? 1 : -1) * (d > 260 ? 0.035 : 0.07);
    return `M${a.px} ${a.py} Q${((a.px + b.px) / 2 - dy * k).toFixed(1)} ${((a.py + b.py) / 2 + dx * k).toFixed(1)} ${b.px} ${b.py}`;
  }
  function roadSvg(d, e) {
    const o = (e && e.optional) ? 1 : 0, sea = e && e.sea, lift = e && e.lift;
    const dash = sea ? [10, 9] : o ? [7, 7] : lift ? [2, 8] : null;
    const L = sea ? [[7.5, '#04121a', 0.45], [3.4, '#9fe0f0', 0.85, dash]] : lift ? [[7.5, '#080503', 0.4], [4.2, '#cdb67f', 0.9, dash, 'round']] : [[7.5, '#080503', 0.38], [4.8, '#eadcb4', o ? 0.55 : 0.7, dash], [2.3, '#2a1d10', o ? 0.4 : 0.65, dash]];
    return L.map(([w, c, a, ds, cap]) => `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${a}" stroke-width="${w}"${ds ? ` stroke-dasharray="${ds.join(' ')}"` : ''}${cap ? ` stroke-linecap="${cap}"` : ''}/>`).join('');
  }

  const shield = (x, y) => `<g transform="translate(${x},${y})"><path d="M-6 -7 L6 -7 L6 1 Q6 6 0 9 Q-6 6 -6 1Z" fill="#1a0f08" stroke="#efc85a" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -4 L0 5" stroke="#efc85a" stroke-width="1.4"/></g>`;
  const numChip = (n, x, y) => { const t = String(n), w = Math.max(15, measure(t, '700 10.5px Cinzel', 0) + 9); return `<g class="numchip" transform="translate(${x},${y})"><rect x="${-w / 2}" y="-8" width="${w}" height="16" rx="2" fill="rgba(13,9,6,.94)" stroke="rgba(243,217,153,.75)"/><text y="4" text-anchor="middle" style="font:700 10.5px Cinzel" fill="#f3d999">${t}</text></g>`; };

  function radius(n) { const k = kindOf(n.type); return (k === 'boss' ? 46 : k === 'town' ? 39 : k === 'elite' ? 39 : 31) * SC; }
  function extent(n) { const k = kindOf(n.type); return (k === 'boss' ? 60 : k === 'town' ? 50 : k === 'elite' ? 42 : 34) * SC; }

  /* etiket yerleşimi: alt, üst, sağ, sol sırasıyla; başka etiket ya da rozetle çakışmayan ilk yer */
  function placeLabels(nodes) {
    const rects = [], out = {};
    const circles = nodes.map((n) => ({ x: n.px, y: n.py, r: extent(n) + 2 }));
    const hit = (r) => rects.some((q) => !(r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1)) || circles.some((c) => r.x1 > c.x - c.r && r.x0 < c.x + c.r && r.y1 > c.y - c.r && r.y0 < c.y + c.r);
    const order = [...nodes].sort((a, b) => radius(b) - radius(a));
    for (const n of order) {
      const t = n.name, w = measure(t, '600 11.5px Cinzel', 0.46 * t.length * 0) + 4, h = 14, R = extent(n) + 3;
      const cand = [
        { a: 'middle', x: n.px, y: n.py + R + 11, r: { x0: n.px - w / 2, x1: n.px + w / 2, y0: n.py + R, y1: n.py + R + h } },
        { a: 'middle', x: n.px, y: n.py - R - 4, r: { x0: n.px - w / 2, x1: n.px + w / 2, y0: n.py - R - h, y1: n.py - R } },
        { a: 'start', x: n.px + R + 3, y: n.py + 4, r: { x0: n.px + R, x1: n.px + R + w + 4, y0: n.py - 8, y1: n.py + 8 } },
        { a: 'end', x: n.px - R - 3, y: n.py + 4, r: { x0: n.px - R - w - 4, x1: n.px - R, y0: n.py - 8, y1: n.py + 8 } },
      ].filter((c) => c.r.x0 > 2 && c.r.x1 < W - 2 && c.r.y0 > 2 && c.r.y1 < H - 2);
      let pick;
      const test = (c) => !hit({ x0: c.r.x0, x1: c.r.x1, y0: c.r.y0, y1: c.r.y1 });
      pick = cand.find(test);
      const dim = !pick;
      if (!pick) pick = cand[0] || { a: 'middle', x: n.px, y: n.py + R + 11, r: { x0: n.px - w / 2, x1: n.px + w / 2, y0: n.py + R, y1: n.py + R + h } };
      rects.push({ x0: pick.r.x0, x1: pick.r.x1, y0: pick.r.y0, y1: pick.r.y1 });
      out[n.n] = { ...pick, dim };
    }
    return out;
  }

  let M, cur = 'm2', style = 'a', S = { names: true, nums: true, reg: true }, sel = null;
  const stageEl = document.getElementById('stage'), tip = document.getElementById('tip');

  function mapSvg(m) {
    if (style !== 'a') return window.MSTYLE.render(style, m, { W, H, COL, kindOf, measure, esc, node, boat });
    const nodes = m.nodes.map((n) => ({ ...n, px: n.x * W, py: n.y * H }));
    const byN = Object.fromEntries(nodes.map((n) => [n.n, n]));
    let h = defs + `<image href="${m.img}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/><rect width="${W}" height="${H}" fill="rgba(4,6,10,.12)"/>`;
    // bölge etiketleri
    h += '<g class="regl" pointer-events="none">' + m.regions.map((r) => {
      const cnt = r.to - r.from + 1, t = `${r.name} · ${cnt}`.toUpperCase();
      const w = measure(t, '600 17px Cinzel', 3.4 * t.length * 0.0) + t.length * 3.4 + 54;
      return `<g transform="translate(${r.x * W},${r.y * H})"><rect x="${-w / 2}" y="-17" width="${w}" height="34" fill="rgba(10,7,4,.72)" stroke="rgba(217,178,106,.55)"/><rect x="${-w / 2}" y="-17" width="4" height="34" fill="#d9b26a"/><text x="${-w / 2 + 16}" y="6" style="font-size:19px" fill="#f3d999">${r.id}</text><text x="${-w / 2 + 38}" y="5.5" style="font-size:14.5px" fill="#e6d8b4">${esc(t)}</text></g>`;
    }).join('') + '</g>';
    // gezici elit çizgileri
    if (m.roam) {
      const a = byN[m.roam.n];
      h += '<g pointer-events="none">' + m.roam.stops.map((s) => { const b = byN[s]; const dx = b.px - a.px, dy = b.py - a.py; const d = `M${a.px} ${a.py} Q${(a.px + b.px) / 2 - dy * 0.12} ${(a.py + b.py) / 2 + dx * 0.12} ${b.px} ${b.py}`; return `<path d="${d}" fill="none" stroke="#04121a" stroke-opacity=".4" stroke-width="5"/><path d="${d}" fill="none" stroke="#f08a6a" stroke-opacity=".85" stroke-width="2.4" stroke-dasharray="1.5 7" stroke-linecap="round"/>`; }).join('') + '</g>';
    }
    // yollar
    h += '<g id="roads">' + m.edges.map(([a, b, e]) => `<g class="rd" data-a="${a}" data-b="${b}">${roadSvg(curveD(byN[a], byN[b], e), e)}<g class="hl"><path d="${curveD(byN[a], byN[b], e)}" fill="none" stroke="#ffb35a" stroke-width="3" stroke-opacity=".95"/></g></g>`).join('') + '</g>';
    // rozetler
    let ns = '';
    for (const n of nodes) {
      const k = kindOf(n.type), S0 = SC, R = radius(n);
      let body = `<g transform="scale(${S0})"><g class="body">${frame(n.type)}</g></g>`;
      body += `<circle class="selring" r="${R + 8}" fill="none" stroke="#ffb35a" stroke-width="2.5" stroke-dasharray="8 6"/>`;
      const ex = extent(n);
      if (n.guarded) body += shield(R * 0.78, -R * 0.78);
      if (n.roaming) body += `<circle r="${R + 5}" fill="none" stroke="#f08a6a" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`;
      body += numChip(n.n, -R * 0.8 - 1, -R * 0.95 - (k === 'boss' ? 6 : 0));
      ns += `<g class="node${n.optional ? ' pocket' : ''}" data-n="${n.n}" transform="translate(${n.px},${n.py})"><g class="nodebody">${body}</g><circle r="${Math.max(24, ex)}" fill="transparent"/></g>`;
    }
    h += `<g id="nodes">${ns}</g>`;
    // adlar
    const lp = placeLabels(nodes);
    h += '<g id="labels" pointer-events="none">' + nodes.map((n) => { const p = lp[n.n]; return `<text class="lbl${p.dim ? ' dim' : ''}" x="${p.x}" y="${p.y}" text-anchor="${p.a}" fill="${n.type === 'boss' ? '#ffd9a0' : '#ece0c0'}" stroke="rgba(6,4,2,.95)" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke">${esc(n.name)}</text>`; }).join('') + '</g>';
    return h;
  }

  /* A Band ipucu (mockups/tooltips.html varyant A, kit-v2/mk.js MK.tip ile aynı işaretleme) */
  const rich = (t) => esc(t).replace(/(\d+(?:[.,]\d+)?%?)/g, '<span class="n">$1</span>');
  function tipHtml(n) {
    const reg = M.regions.find((r) => r.id === n.region);
    const tags = [];
    if (n.optional) tags.push('<span class="bt-chip ac">Optional pocket</span>');
    if (n.guarded) tags.push('<span class="bt-chip ac">Guarded</span>');
    if (n.roaming) tags.push('<span class="bt-chip warn">Roams</span>');
    const lines = [];
    if (n.units) lines.push(`<div class="bt-ln"><span class="dia"></span><div class="tx"><span class="k">${/^(Choice|Lore|Storm|Rumours|Eel-wives|Empty|Save|Repair|Bargain|Morvane|The lantern|Stone|Ending|Descent|Charter|Lighthouse|FACTION|Order side|Order or)/.test(n.units) ? 'Event' : 'Enemies'}</span> · ${rich(n.units)}</div></div>`);
    if (n.note) lines.push(`<div class="bt-ln"><span class="dia"></span><div class="tx">${rich(n.note)}</div></div>`);
    const col = COL[n.type];
    return `<div class="bt" style="--ac:${col}"><div class="bt-head"><span class="bt-medal ico frm round" style="background-image:url(&quot;${node(n.type === 'crossing' ? 'battle' : n.type)}&quot;)"></span><div class="bt-ht"><div class="bt-kind">${esc(KIND[n.type])}</div><div class="bt-title">${esc(n.name)}</div></div><div class="bt-aside"><div class="bt-big">${n.n}<small>of ${M.nodes.length}</small></div></div></div><div class="bt-meta"><span class="bt-chip">Region ${reg.id} · ${esc(reg.name)}</span>${tags.join('')}</div>${lines.length ? `<div class="bt-div"></div><div class="bt-body">${lines.join('')}</div>` : ''}</div>`;
  }
  function showTip(n, ev) {
    tip.innerHTML = tipHtml(n);
    tip.classList.add('on');
    const sr = stageEl.getBoundingClientRect();
    const nx = (n.x * sr.width), ny = (n.y * sr.height);
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const gap = style === 'a' ? 28 : Math.max(28, window.MSTYLE.ext(style, n) * (sr.width / W) + 10);
    let x = nx + gap, y = ny - th / 2;
    if (x + tw > sr.width - 6) x = nx - tw - gap;
    if (x < 6) x = Math.max(6, Math.min(sr.width - tw - 6, nx - tw / 2));
    y = Math.max(6, Math.min(sr.height - th - 6, y));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => { if (!sel) tip.classList.remove('on'); };

  function wire() {
    const svg = stageEl.querySelector('svg');
    const byN = Object.fromEntries(M.nodes.map((n) => [n.n, n]));
    const hot = (n, on) => svg.querySelectorAll('.rd').forEach((g) => { if (+g.dataset.a === n || +g.dataset.b === n) g.classList.toggle('hot', on); });
    svg.querySelectorAll('.node').forEach((g) => {
      const n = byN[+g.dataset.n];
      g.addEventListener('mouseenter', (ev) => { if (!sel) showTip(n, ev); hot(n.n, true); });
      g.addEventListener('mouseleave', () => { hideTip(); if (sel !== n.n) hot(n.n, false); });
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        svg.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
        svg.querySelectorAll('.rd.hot').forEach((x) => x.classList.remove('hot'));
        if (sel === n.n) { sel = null; tip.classList.remove('on'); return; }
        sel = n.n; g.classList.add('sel'); hot(n.n, true); showTip(n, ev);
      });
    });
    svg.addEventListener('click', () => { sel = null; svg.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel')); svg.querySelectorAll('.rd.hot').forEach((x) => x.classList.remove('hot')); tip.classList.remove('on'); });
  }

  function legend() {
    const has = (t) => M.nodes.some((n) => n.type === t);
    const items = LEG.filter(has).map((t) => `<span class="it"><img src="${node(t === 'crossing' ? 'battle' : t)}" alt="">${KIND[t].replace(' (deck battle)', '')}</span>`);
    const extra = [
      '<span class="it"><span class="sw solid"></span>Road</span>',
      '<span class="it"><span class="sw"></span>Optional pocket (dead end, faded badge)</span>',
      '<span class="it"><svg class="gd" viewBox="-8 -9 16 20"><path d="M-6 -7 L6 -7 L6 1 Q6 6 0 9 Q-6 6 -6 1Z" fill="#1a0f08" stroke="#efc85a" stroke-width="1.6"/></svg>Guarded treasure</span>',
    ];
    if (cur === 'm2') extra.push('<span class="it"><span class="sw sea"></span>Sea lane (needs a ship)</span>', '<span class="it"><span class="sw roam"></span>Black Caravel route</span>');
    else extra.push('<span class="it"><span class="sw" style="border-top:3px dotted #cdb67f"></span>Lift (vertical road between floors)</span>');
    const cnt = (f) => M.nodes.filter(f).length;
    const stats = `<b>${M.nodes.length}</b> nodes · <b>${cnt((n) => n.type === 'boss')}</b> boss · <b>${cnt((n) => n.type === 'elite')}</b> elite · <b>${cnt((n) => n.type === 'town')}</b> town · <b>${cnt((n) => n.optional)}</b> optional pockets · <b>${M.edges.length}</b> roads`;
    document.getElementById('legend').innerHTML = items.concat(extra).join('');
    document.getElementById('stats').innerHTML = stats;
  }

  function render() {
    M = window.MAPS[cur];
    sel = null; tip.classList.remove('on');
    stageEl.querySelector('svg')?.remove();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = mapSvg(M);
    stageEl.insertBefore(svg, tip);
    wire(); legend();
    document.getElementById('ttl').innerHTML = `${esc(M.name)}<small>${esc(M.sub)}</small>`;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.v === cur));
    document.querySelectorAll('.stab').forEach((b) => b.classList.toggle('on', b.dataset.s === style));
    stageEl.classList.remove('sa', 'sb', 'sc', 'sd'); stageEl.classList.add('s' + style);
    const sn = document.getElementById('snote'); if (sn) sn.textContent = style === 'a' ? '' : window.MSTYLE.note(style);
    document.title = `${M.name}: node layout`;
    applyToggles();
  }
  function applyToggles() {
    stageEl.classList.toggle('hidenames', !S.names);
    stageEl.classList.toggle('nonum', !S.nums);
    stageEl.classList.toggle('hidereg', !S.reg);
    document.querySelectorAll('.stab').forEach((b) => b.addEventListener('click', () => { style = b.dataset.s; writeHash(); render(); }));
  document.querySelectorAll('.tog').forEach((b) => b.classList.toggle('on', S[b.dataset.t]));
  }
  function readHash() {
    const p = location.hash.replace(/^#/, '').split('&');
    cur = p.includes('v2') ? 'm3' : 'm2';
    const sp = p.find((x) => /^s=[abcd]$/.test(x)); style = sp ? sp[2] : 'a';
    if (p.includes('clean')) { S.names = false; S.nums = false; S.reg = false; }
    if (p.includes('nonames')) S.names = false;
  }
  function writeHash() { history.replaceState(null, '', '#' + (cur === 'm3' ? 'v2' : 'v1') + (style === 'a' ? '' : '&s=' + style)); }

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { cur = b.dataset.v; writeHash(); render(); }));
  document.querySelectorAll('.tog').forEach((b) => b.addEventListener('click', () => { S[b.dataset.t] = !S[b.dataset.t]; applyToggles(); }));
  window.addEventListener('hashchange', () => { readHash(); render(); });
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 12px Cinzel'), document.fonts.load("16px 'EB Garamond'")]).catch(() => 0) : Promise.resolve();
  const wait = Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]);
  wait.then(() => { readHash(); render(); });
})();
