/* Harita 2 / 3 düğüm görünümleri B, C, D (mockup, oyun kodu DEĞİL). Stil A = m.js içindeki mevcut hali (dokunulmadı).
   Veri (data.js) ve yerleşim aynı; yalnızca çizim katmanı değişir. m.js bu dosyayı window.MSTYLE.render(stil, harita, ctx) ile çağırır.
   Ortak: kıvrımlı yollar (kenar kimliğinden türeyen sabit tohum), kurdele bölge etiketleri, plaka düğüm adları. */
(function () {
  'use strict';
  const GOLD = '#f3d999';
  const f1 = (v) => +v.toFixed(1);
  const hash = (a, b) => (((a * 73856093) ^ (b * 19349663) ^ 0x9e3779b9) >>> 0);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shade(hex, k) { // k>0 açar, k<0 koyulaştırır
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const stops = (a) => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const radial = (id, a, extra) => `<radialGradient id="${id}"${extra || ''}>${stops(a)}</radialGradient>`;
  const linear = (id, a, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 == null ? 1 : x2}" y2="${y2 == null ? 1 : y2}">${stops(a)}</linearGradient>`;

  /* ---------- yol geometrisi: Catmull-Rom ile yumuşak S kıvrımları ---------- */
  function catmull(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      segs.push([[p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]);
    }
    return segs;
  }
  function geom(A, B, e, key, W, H) {
    let segs;
    if (e && e.ctrl) {
      const q = [e.ctrl[0] * W, e.ctrl[1] * H];
      segs = [[[A[0] + (2 / 3) * (q[0] - A[0]), A[1] + (2 / 3) * (q[1] - A[1])], [B[0] + (2 / 3) * (q[0] - B[0]), B[1] + (2 / 3) * (q[1] - B[1])], B]];
    } else {
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux;
      const r = rng(key), sg = r() < 0.5 ? 1 : -1, k = d > 260 ? 3 : 2;
      const off = Math.min(d * (0.1 + r() * 0.045), 56);
      const pts = [A];
      for (let i = 1; i <= k; i++) {
        const t = i / (k + 1), o = off * (i % 2 ? 1 : -1) * sg * (0.85 + r() * 0.3);
        pts.push([A[0] + dx * t + px * o, A[1] + dy * t + py * o]);
      }
      pts.push(B);
      segs = catmull(pts);
    }
    let d = `M${f1(A[0])} ${f1(A[1])}`;
    const poly = [{ x: A[0], y: A[1] }];
    let cur = A;
    for (const [c1, c2, p] of segs) {
      d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p[0])} ${f1(p[1])}`;
      for (let i = 1; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        poly.push({ x: u * u * u * cur[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0], y: u * u * u * cur[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1] });
      }
      cur = p;
    }
    const cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y));
    return { d, poly, cum, len: cum[cum.length - 1] };
  }
  function pointAt(g, s) { // yay uzunluğu s: konum + birim teğet
    let i = 1;
    while (i < g.poly.length - 1 && g.cum[i] < s) i++;
    const a = g.poly[i - 1], b = g.poly[i], seg = g.cum[i] - g.cum[i - 1] || 1, t = Math.max(0, Math.min(1, (s - g.cum[i - 1]) / seg));
    const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
    return { x: a.x + tx * t, y: a.y + ty * t, tx: tx / tl, ty: ty / tl };
  }
  function wavePath(g, amp, lam, phase) {
    let d = '';
    for (let s = 0; s <= g.len; s += 3) {
      const p = pointAt(g, s), o = amp * Math.sin((s / lam) * Math.PI * 2 + phase);
      d += `${s === 0 ? 'M' : 'L'}${f1(p.x - p.ty * o)} ${f1(p.y + p.tx * o)}`;
    }
    return d;
  }

  /* aşınmış toprak yol: kalın koyu alt çizgi + ince açık üst çizgi + seyrek kesik; cep soluk-kesik; deniz dalgalı mavi; asansör noktalı */
  function roadSvg(g, e) {
    const o = e && e.optional, sea = e && e.sea, lift = e && e.lift, d = g.d;
    const P = (w, c, a, extra) => `<path d="${extra && extra.d ? extra.d : d}" fill="none" stroke="${c}" stroke-opacity="${a}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra && extra.dash ? ` stroke-dasharray="${extra.dash}"` : ''}${extra && extra.tr ? ` transform="${extra.tr}"` : ''}/>`;
    if (sea) return P(8.5, '#04121a', 0.42) + P(2.7, '#9fe0f0', 0.9, { d: wavePath(g, 2.8, 24, 0) }) + P(1.5, '#d6f4fb', 0.5, { d: wavePath(g, 2.2, 24, 2.4) });
    if (lift) return P(8.5, '#080503', 0.4) + P(4.6, '#cdb67f', 0.92, { dash: '0.1 9.5' }) + P(1.6, '#fff1c8', 0.55, { dash: '0.1 9.5' });
    if (o) return P(9.5, '#060302', 0.3, { tr: 'translate(0 1.6)' }) + P(7, '#2b1d10', 0.5) + P(3.2, '#d9c48f', 0.55, { dash: '9 8' });
    return P(10, '#060302', 0.42, { tr: 'translate(0 1.8)' }) + P(7.6, '#2b1d10', 0.88) + P(3.5, '#e8d7a8', 0.78) + P(1.7, '#4a3418', 0.7, { dash: '9 22' });
  }

  /* ---------- ortak parçalar ---------- */
  const shieldSvg = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s || 1})"><path d="M-6 -7 L6 -7 L6 1 Q6 6 0 9 Q-6 6 -6 1Z" fill="#1a0f08" stroke="#efc85a" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -4 L0 5" stroke="#efc85a" stroke-width="1.4"/></g>`;
  const pulSvg = (n, x, y, r, col) => `<g class="numchip" transform="translate(${f1(x)},${f1(y)})"><circle r="${r}" fill="url(#pulg)" stroke="${col}" stroke-width="1.6"/><circle r="${f1(r - 2.6)}" fill="none" stroke="rgba(243,217,153,.28)"/><text y="${f1(r * 0.37)}" text-anchor="middle" style="font:700 ${f1(r * 1.08)}px Cinzel" fill="${GOLD}">${n}</text></g>`;
  const COMMON_DEFS = () => `${radial('pulg', [[0, '#4a3622'], [1, '#150d07']])}${radial('sootb', [[0, '#0a0603', 0.62], [0.6, '#0a0603', 0.3], [1, '#0a0603', 0]])}${radial('shadb', [[0, '#000', 0.6], [0.7, '#000', 0.3], [1, '#000', 0]])}${radial('discb', [[0, '#4a3622'], [0.7, '#1c130b'], [1, '#0b0704']], ' cx="50%" cy="42%" r="65%"')}${linear('goldb', [[0, '#fff0b8'], [0.4, '#e0b24a'], [1, '#8a5a1c']], 0, 1)}${linear('hornb', [[0, '#f1e3bd'], [0.6, '#b89a62'], [1, '#4a3418']], 0, 1)}${linear('flameg', [[0, '#b8260e'], [0.6, '#ff6a1c'], [1, '#ffd27a']], 0, 1)}`;

  /* kurdele bölge etiketi (B / C / D ortak; temaya göre renk) */
  function ribbonSvg(X, r, count, th) {
    const t = `${r.name} · ${count}`.toUpperCase();
    const tw = X.measure(t, '600 14px Cinzel', 0) + t.length * 2.2, w = tw + 84, h = 28;
    const cx = Math.max(w / 2 + 22, Math.min(X.W - w / 2 - 22, r.x * X.W)), cy = Math.max(22, Math.min(X.H - 26, r.y * X.H));
    const tail = (s) => `<path d="M${s * (w / 2 - 12)} ${-h / 2 + 6} L${s * (w / 2 + 16)} ${-h / 2 + 6} L${s * (w / 2 + 6)} 6 L${s * (w / 2 + 16)} ${h / 2 + 6} L${s * (w / 2 - 12)} ${h / 2 + 6}Z" fill="${th.dark}" stroke="${th.edge}" stroke-opacity=".5"/><path d="M${s * (w / 2)} ${h / 2} L${s * (w / 2 - 12)} ${h / 2} L${s * (w / 2 - 12)} ${h / 2 + 6}Z" fill="#000" fill-opacity=".45"/>`;
    return `<g transform="translate(${f1(cx)},${f1(cy)})"><path d="M${-w / 2} ${h / 2 + 5} H${w / 2}" stroke="#000" stroke-opacity=".3" stroke-width="5"/>${tail(-1)}${tail(1)}<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="url(#${th.id})" stroke="${th.edge}" stroke-opacity=".85"/><path d="M${-w / 2 + 3} ${-h / 2 + 3.5} H${w / 2 - 3} M${-w / 2 + 3} ${h / 2 - 3.5} H${w / 2 - 3}" stroke="${th.edge}" stroke-opacity=".38"/><text x="${f1(16)}" y="5.2" text-anchor="middle" style="font:600 14px Cinzel;letter-spacing:.14em" fill="${th.text}" stroke="rgba(0,0,0,.5)" stroke-width="2.4" paint-order="stroke">${X.esc(t)}</text><circle cx="${-w / 2 + 8}" r="16.5" fill="url(#pulg)" stroke="${th.edge}" stroke-width="2.2"/><circle cx="${-w / 2 + 8}" r="12.5" fill="none" stroke="${th.edge}" stroke-opacity=".4"/><text x="${-w / 2 + 8}" y="5.6" text-anchor="middle" style="font:700 15px Cinzel" fill="${GOLD}">${r.id}</text></g>`;
  }
  const ribbonDefs = (themes) => themes.map((t) => linear(t.id, [[0, t.c1], [1, t.c2]], 0, 1)).join('');
  function regionsSvg(X, m, th) {
    return '<g class="regl" pointer-events="none">' + m.regions.map((r) => ribbonSvg(X, r, r.to - r.from + 1, typeof th === 'function' ? th(r) : th)).join('') + '</g>';
  }

  /* plaka (metal şerit) adı: B ve D */
  function platePlace(nodes, boxOf, plateOf, X, coreOf) {
    const W = X.W, H = X.H, rects = [], out = {};
    const nb = nodes.map((n) => { const b = (coreOf || boxOf)(n); return { n: n.n, x0: n.px + b.x0, x1: n.px + b.x1, y0: n.py + b.y0, y1: n.py + b.y1 }; });
    const hit = (r, self) => rects.some((q) => !(r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1)) || nb.some((q) => q.n !== self && !(r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1));
    const order = [...nodes].sort((a, b) => (boxOf(b).y1 - boxOf(b).y0) - (boxOf(a).y1 - boxOf(a).y0));
    for (const n of order) {
      const { w, h } = plateOf(n), c0 = nb.find((q) => q.n === n.n), ob = boxOf(n), b = { x0: n.px + ob.x0, x1: n.px + ob.x1, y0: n.py + ob.y0, y1: n.py + ob.y1 }, g = 2;
      const mk = (cx, cy) => ({ cx, cy, r: { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 } });
      const cand = [
        mk(n.px, b.y1 + h / 2 + g), mk(n.px, b.y0 - h / 2 - g), mk(b.x1 + w / 2 + g, n.py + 2), mk(b.x0 - w / 2 - g, n.py + 2),
        mk(n.px + w * 0.32, b.y1 + h / 2 + g), mk(n.px - w * 0.32, b.y1 + h / 2 + g), mk(n.px + w * 0.32, b.y0 - h / 2 - g), mk(n.px - w * 0.32, b.y0 - h / 2 - g),
        mk(b.x1 + w / 2 + g, n.py + h + 2), mk(b.x1 + w / 2 + g, n.py - h - 2), mk(b.x0 - w / 2 - g, n.py + h + 2), mk(b.x0 - w / 2 - g, n.py - h - 2),
        mk(b.x1 + w / 2 - 14, b.y1 + h / 2 - 8), mk(b.x0 - w / 2 + 14, b.y1 + h / 2 - 8), mk(b.x1 + w / 2 - 14, b.y0 - h / 2 + 8), mk(b.x0 - w / 2 + 14, b.y0 - h / 2 + 8),
      ].filter((c) => c.r.x0 > 2 && c.r.x1 < W - 2 && c.r.y0 > 2 && c.r.y1 < H - 2);
      let pick = cand.find((c) => !hit(c.r, n.n));
      const dim = !pick;
      if (!pick) { const area = (r) => [...rects, ...nb.filter((q) => q.n !== n.n)].reduce((a, q) => a + Math.max(0, Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0)) * Math.max(0, Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0)), 0); pick = cand.slice().sort((p, q) => area(p.r) - area(q.r))[0] || mk(n.px, b.y1 + h / 2 + g); }
      rects.push(pick.r);
      out[n.n] = { ...pick, dim, w, h };
    }
    return out;
  }
  function plateSvg(n, p, accent, X) {
    const { w, h } = p, boss = n.type === 'boss', x = f1(p.cx - w / 2), y = f1(p.cy - h / 2), e = f1(p.cx - w / 2 + 6), e2 = f1(p.cx + w / 2 - 6);
    return `<g class="lbl${p.dim ? ' dim' : ''}" pointer-events="none"><rect x="${x}" y="${y + 2}" width="${w}" height="${h}" rx="2" fill="#000" fill-opacity=".4"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#plateg)" stroke="${accent}" stroke-opacity=".8"/><path d="M${x + 3} ${y + 2.5} H${f1(x + w - 3)}" stroke="rgba(255,236,180,.28)"/><path d="M${e} ${f1(p.cy - 2.6)} l2.6 2.6 l-2.6 2.6 l-2.6 -2.6Z M${e2} ${f1(p.cy - 2.6)} l2.6 2.6 l-2.6 2.6 l-2.6 -2.6Z" fill="${accent}" fill-opacity=".85"/><text x="${f1(p.cx)}" y="${f1(p.cy + 4)}" text-anchor="middle" style="font:600 ${boss ? 12 : 10.5}px Cinzel;letter-spacing:.03em" fill="${boss ? '#ffd9a0' : '#f1e4c2'}">${X.esc(n.name)}</text></g>`;
  }
  const plateDefs = () => linear('plateg', [[0, '#2e2012'], [1, '#150d07']], 0, 1);
  const plateDim = (X) => (n) => ({ w: Math.ceil(X.measure(n.name, `600 ${n.type === 'boss' ? 12 : 10.5}px Cinzel`, 0)) + 22, h: 16 });

  /* ---------- paylaşılan rozet süsleri (B ve D) ---------- */
  function ornament(k, R) {
    let back = '', front = '';
    if (k === 'boss') {
      const horn = (s) => `<path d="M${f1(s * R * 0.78)} ${f1(-R * 0.62)} Q${f1(s * R * 1.52)} ${f1(-R * 0.72)} ${f1(s * R * 1.3)} ${f1(-R * 1.45)} Q${f1(s * R * 1.12)} ${f1(-R * 0.98)} ${f1(s * R * 0.55)} ${f1(-R * 0.86)}Z" fill="url(#hornb)" stroke="#3a2410" stroke-width="1.6" stroke-linejoin="round"/>`;
      const flame = (x, h) => `<path class="flick" d="M${f1(x - h * 0.22)} 0 Q${f1(x - h * 0.3)} ${f1(-h * 0.5)} ${f1(x)} ${f1(-h)} Q${f1(x + h * 0.05)} ${f1(-h * 0.5)} ${f1(x + h * 0.26)} ${f1(-h * 0.25)} Q${f1(x + h * 0.3)} ${f1(-h * 0.05)} ${f1(x + h * 0.2)} 0Z" fill="url(#flameg)" stroke="#ffcf7a" stroke-opacity=".6" stroke-width="1" stroke-linejoin="round"/>`;
      back = `<g transform="translate(0,${f1(R * 0.86)})">${[-1.5, -1.1, -0.72, 0.72, 1.1, 1.5].map((s, i) => flame(s * R, R * (0.62 - (i % 3) * 0.09))).join('')}</g>${horn(-1)}${horn(1)}`;
      const w = R * 0.95, h = R * 0.5;
      front = `<g transform="translate(0,${f1(-(R + 4))})"><path d="M${f1(-w / 2)} 0 L${f1(-w / 2)} ${f1(-h * 0.6)} L${f1(-w * 0.27)} ${f1(-h * 0.32)} L0 ${f1(-h)} L${f1(w * 0.27)} ${f1(-h * 0.32)} L${f1(w / 2)} ${f1(-h * 0.6)} L${f1(w / 2)} 0Z" fill="url(#goldb)" stroke="#5a3510" stroke-width="1.5" stroke-linejoin="round"/><rect x="${f1(-w / 2)}" y="${f1(-h * 0.22)}" width="${f1(w)}" height="${f1(h * 0.22)}" fill="#8a5a1c" fill-opacity=".55"/><circle cy="${f1(-h * 0.38)}" r="${f1(R * 0.07)}" fill="#e8352a" stroke="#ffcf7a"/><circle cx="${f1(-w * 0.3)}" cy="${f1(-h * 0.22)}" r="${f1(R * 0.045)}" fill="#7fd0e8"/><circle cx="${f1(w * 0.3)}" cy="${f1(-h * 0.22)}" r="${f1(R * 0.045)}" fill="#7fd0e8"/></g>`;
    } else if (k === 'elite') {
      const horn = (s) => `<path d="M${f1(s * R * 0.62)} ${f1(-R * 0.7)} Q${f1(s * R * 1.22)} ${f1(-R * 0.75)} ${f1(s * R * 1.12)} ${f1(-R * 1.28)} Q${f1(s * R * 0.92)} ${f1(-R * 0.92)} ${f1(s * R * 0.45)} ${f1(-R * 0.88)}Z" fill="#8f2f17" stroke="#e5703a" stroke-width="1.4" stroke-linejoin="round"/>`;
      back = horn(-1) + horn(1);
      front = `<path d="M0 ${f1(-R - 16)} l6 7 l-6 7 l-6 -7Z" fill="#e8352a" stroke="#ffcf7a" stroke-width="1.4" stroke-linejoin="round"/>`;
    } else if (k === 'town') {
      const w = R * 1.05, y = -(R + 3), m = w / 5;
      front = `<g fill="url(#goldb)" stroke="#5a3510" stroke-width="1.2" stroke-linejoin="round"><rect x="${f1(-w / 2)}" y="${f1(y - 3)}" width="${f1(w)}" height="6" rx="1"/>${[-2, 0, 2].map((i) => `<rect x="${f1(i * m - m / 2)}" y="${f1(y - 11)}" width="${f1(m)}" height="9"/>`).join('')}</g>`;
      const flag = (s) => `<path d="M${f1(s * R * 1.28)} ${f1(R * 0.35)} V${f1(-R * 0.55)} M${f1(s * R * 1.28)} ${f1(-R * 0.55)} L${f1(s * R * 1.72)} ${f1(-R * 0.4)} L${f1(s * R * 1.28)} ${f1(-R * 0.22)}" stroke="#e3bf72" stroke-width="1.8" fill="#8c2b1c" stroke-linejoin="round"/>`;
      back = flag(-1) + flag(1);
    }
    return { back, front };
  }

  /* ======================================================= STİL B: EPIC SEAL ======================================================= */
  const SEAL_R = { battle: 20, tab: 21, crossing: 22, town: 28, elite: 27, boss: 52 };
  const AURA = { battle: ['#ff7a2a'], event: ['#a78bd9'], treasure: ['#ffe27a'], rest: ['#35c4c0'], merchant: ['#9fd0a0'], town: ['#ffd36a'], crossing: ['#6cc8e6'], elite: ['#ff6a3a', '#b43fd0'], boss: ['#ff4a1c', '#ff2a10'] };
  const sealKey = (n) => (n.type === 'crossing' ? 'crossing' : null);
  function defsB() {
    let d = COMMON_DEFS() + plateDefs();
    for (const t in AURA) {
      const c = AURA[t];
      d += radial('ab-' + t, c.length === 1 ? [[0, c[0], 0.9], [0.5, c[0], 0.38], [1, c[0], 0]] : [[0, c[0], 0.95], [0.5, c[1], 0.5], [1, c[1], 0]]);
    }
    d += linear('ringbr', [[0, '#f1c984'], [0.4, '#b3763a'], [0.7, '#5e3a18'], [1, '#d09a54']]);
    d += linear('ringgo', [[0, '#fff0b8'], [0.35, '#d8a640'], [0.7, '#7a4e16'], [1, '#f0c868']]);
    d += linear('ringel', [[0, '#e07a4a'], [0.4, '#7a3a24'], [0.7, '#3a1a12'], [1, '#c8602e']]);
    d += ribbonDefs([{ id: 'rbB', c1: '#7a2a18', c2: '#3b120a' }]);
    return `<defs>${d}</defs>`;
  }
  const rivets = (r, count, col) => `<circle r="${f1(r)}" fill="none" stroke="${col}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="0.01 ${f1((2 * Math.PI * r) / count)}" stroke-opacity=".9"/>`;
  function sealB(X, n) {
    const k = X.kindOf(n.type), t = n.type, R = SEAL_R[t === 'crossing' ? 'crossing' : k] || 23;
    const ak = t, col = X.COL[t];
    const ring = k === 'elite' ? 'ringel' : (k === 'boss' || k === 'town') ? 'ringgo' : 'ringbr';
    const orn = ornament(k, R);
    let lugs = '';
    if (k === 'tab') lugs = [-1, 1].map((s) => `<path d="M${s * (R + 3)} -7 L${s * (R + 17)} 0 L${s * (R + 3)} 7 L${s * (R + 7)} 0Z" fill="${col}" stroke="rgba(0,0,0,.6)" stroke-width="1.2" stroke-linejoin="round"/>`).join('');
    const rim = R + 6, ang = (135 * Math.PI) / 180;
    const emblem = t === 'crossing' ? `<g transform="scale(${f1((R / 29) * 1.05)})">${X.boat(col)}</g>` : `<image href="${X.node(t)}" x="${f1(-R * 1.03)}" y="${f1(-R * 1.03 - 1)}" width="${f1(R * 2.06)}" height="${f1(R * 2.06)}"/>`;
    const aura = `<g pointer-events="none"><ellipse cy="${f1(R * 0.8)}" rx="${f1(R * 2.1)}" ry="${f1(R * 0.85)}" fill="url(#sootb)"/><ellipse cy="${f1(R * 0.78)}" rx="${f1(R * 1.65)}" ry="${f1(R * 0.62)}" fill="url(#ab-${ak})"/>${k === 'boss' ? `<ellipse class="pulse" cy="${f1(R * 0.7)}" rx="${f1(R * 1.9)}" ry="${f1(R * 0.8)}" fill="url(#ab-boss)" fill-opacity=".7"/>` : ''}<ellipse cx="${f1(R * 0.22)}" cy="${f1(R + 7)}" rx="${f1(R * 1.12)}" ry="${f1(R * 0.3)}" fill="url(#shadb)"/></g>`;
    let sparkle = '';
    if (t === 'treasure') sparkle = [[-1.25, -0.85, 5], [1.35, -0.4, 4], [0.9, -1.2, 3.4]].map(([x, y, s], i) => `<path class="tw" style="animation-delay:${i * 0.7}s" d="M${f1(R * x)} ${f1(R * y - s)} L${f1(R * x + s * 0.3)} ${f1(R * y - s * 0.3)} L${f1(R * x + s)} ${f1(R * y)} L${f1(R * x + s * 0.3)} ${f1(R * y + s * 0.3)} L${f1(R * x)} ${f1(R * y + s)} L${f1(R * x - s * 0.3)} ${f1(R * y + s * 0.3)} L${f1(R * x - s)} ${f1(R * y)} L${f1(R * x - s * 0.3)} ${f1(R * y - s * 0.3)}Z" fill="#fff3b8"/>`).join('');
    const seal = `${orn.back}<circle cy="5" r="${R + 8.5}" fill="#24170c" stroke="#0a0603" stroke-width="1.4"/>${lugs}<circle r="${R + 5.5}" fill="none" stroke="url(#${ring})" stroke-width="6.5"/><circle r="${R + 2.2}" fill="none" stroke="#120a05" stroke-opacity=".9" stroke-width="1.4"/>${rivets(R + 5.5, k === 'boss' ? 16 : k === 'battle' || k === 'tab' ? 6 : 10, '#fff0c0')}<circle r="${R - 0.5}" fill="url(#discb)" stroke="#e0b861" stroke-opacity=".9" stroke-width="1.8"/><circle r="${R - 2}" fill="url(#ab-${ak})" fill-opacity=".34"/><circle r="${R - 4.6}" fill="none" stroke="${col}" stroke-opacity=".55" stroke-width="1.3"/>${emblem}${orn.front}${sparkle}`;
    let extra = '';
    if (n.roaming) extra += `<circle r="${R + 15}" fill="none" stroke="#f08a6a" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`;
    if (n.guarded) extra += shieldSvg(f1(rim * 0.74), f1(-rim * 0.74), k === 'boss' ? 1.4 : 1.1);
    extra += pulSvg(n.n, f1(rim * Math.cos(ang)), f1(rim * Math.sin(ang)), k === 'boss' ? 11 : 9.5, GOLD);
    return {
      R, aura, body: seal + extra, selR: R + 17,
      hit: Math.max(26, R + 10), box: { x0: -(R + 9), x1: R + 9, y0: -(R + (k === 'boss' ? 0.6 * R + 14 : k === 'elite' ? 20 : k === 'town' ? 15 : 9)), y1: R + 16 }, accent: '#d9b26a',
    };
  }

  /* ======================================================= STİL C: BANNER & LANDMARK ======================================================= */
  const CLOTH = { battle: '#c9a24a', event: '#9d78cc', treasure: '#e6b52e', rest: '#e07a2a', merchant: '#6fae78', town: '#d9a93f', elite: '#c4401c', boss: '#d8321a', crossing: '#3f9cbd' };
  const FL = { battle: { w: 34, h: 28, sh: 'swallow', ic: 24 }, elite: { w: 40, h: 34, sh: 'swallow', ic: 28 }, event: { w: 33, h: 27, sh: 'pennon', ic: 22 }, treasure: { w: 33, h: 27, sh: 'pennon', ic: 22 }, rest: { w: 32, h: 29, sh: 'scallop', ic: 23 }, merchant: { w: 32, h: 29, sh: 'scallop', ic: 23 }, crossing: { w: 34, h: 28, sh: 'swallow', ic: 24 } };
  function defsC() {
    let d = COMMON_DEFS() + plateDefs();
    for (const t in CLOTH) d += linear('cl-' + t, [[0, shade(CLOTH[t], 0.12)], [0.55, CLOTH[t]], [1, shade(CLOTH[t], -0.5)]], 0, 1);
    d += linear('wood', [[0, '#5a3d22'], [0.5, '#8a6238'], [1, '#2e1d0e']], 1, 0);
    d += ribbonDefs([{ id: 'rbC', c1: '#5a4326', c2: '#2c1f0f' }]);
    return `<defs>${d}</defs>`;
  }
  function flagPath(sh, x0, y0, w, h) { // direğin sağına dalgalanan flama
    const wv = h * 0.1;
    if (sh === 'pennon') return `M${x0} ${y0} C${f1(x0 + w * 0.35)} ${f1(y0 - wv)} ${f1(x0 + w * 0.7)} ${f1(y0 + h * 0.3 + wv)} ${f1(x0 + w)} ${f1(y0 + h * 0.5)} C${f1(x0 + w * 0.7)} ${f1(y0 + h * 0.7 - wv)} ${f1(x0 + w * 0.35)} ${f1(y0 + h + wv)} ${x0} ${f1(y0 + h)}Z`;
    if (sh === 'scallop') { const q = w / 3; return `M${x0} ${y0} C${f1(x0 + w * 0.3)} ${f1(y0 - wv)} ${f1(x0 + w * 0.7)} ${f1(y0 + wv)} ${f1(x0 + w)} ${y0} V${f1(y0 + h - 7)} q${f1(-q / 2)} 8 ${f1(-q)} 0 q${f1(-q / 2)} 8 ${f1(-q)} 0 q${f1(-q / 2)} 8 ${f1(-q)} 0Z`; }
    return `M${x0} ${y0} C${f1(x0 + w * 0.3)} ${f1(y0 - wv)} ${f1(x0 + w * 0.7)} ${f1(y0 + wv)} ${f1(x0 + w)} ${y0} L${f1(x0 + w * 0.8)} ${f1(y0 + h / 2)} L${f1(x0 + w)} ${f1(y0 + h)} C${f1(x0 + w * 0.7)} ${f1(y0 + h + wv)} ${f1(x0 + w * 0.3)} ${f1(y0 + h - wv)} ${x0} ${f1(y0 + h)}Z`;
  }
  function hangPath(x0, y0, w, h, notch) { return `M${f1(x0)} ${f1(y0)} H${f1(x0 + w)} V${f1(y0 + h)} L${f1(x0 + w / 2)} ${f1(y0 + h - notch)} L${f1(x0)} ${f1(y0 + h)}Z`; }
  function emblemOn(X, t, cx, cy, size) {
    const back = `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(size / 2 + 1.8)}" fill="rgba(14,9,5,.78)" stroke="${GOLD}" stroke-opacity=".75" stroke-width="1.1"/>`;
    if (t === 'crossing') return back + `<g transform="translate(${f1(cx)},${f1(cy)}) scale(${f1(size / 52)})">${X.boat(X.COL.crossing)}</g>`;
    return back + `<image href="${X.node(t)}" x="${f1(cx - size / 2)}" y="${f1(cy - size / 2)}" width="${size}" height="${size}"/>`;
  }
  function bannerC(X, n) {
    const k = X.kindOf(n.type), t = n.type, cloth = `url(#cl-${t})`, edge = GOLD;
    let baseY, shapes = [], body = '', box;
    const stones = (s) => `<ellipse cy="2" rx="${f1(11 * s)}" ry="${f1(4.4 * s)}" fill="#000" fill-opacity=".45"/><ellipse cx="${f1(-5 * s)}" cy="0" rx="${f1(6 * s)}" ry="${f1(3.2 * s)}" fill="#7d7468" stroke="#231d16" stroke-width="1"/><ellipse cx="${f1(5 * s)}" cy="0.5" rx="${f1(5.4 * s)}" ry="${f1(3 * s)}" fill="#6a6258" stroke="#231d16" stroke-width="1"/><ellipse cx="0" cy="-2.4" rx="${f1(5 * s)}" ry="${f1(2.8 * s)}" fill="#968c7e" stroke="#231d16" stroke-width="1"/>`;
    const pole = (Hp, wd) => { shapes.push(`<rect x="${-wd / 2}" y="${-Hp}" width="${wd}" height="${Hp}"/>`); return `<rect x="${-wd / 2}" y="${-Hp}" width="${wd}" height="${Hp}" rx="1" fill="url(#wood)" stroke="#1a0f06" stroke-width="1"/>`; };
    if (k === 'boss' || k === 'town') {
      const boss = k === 'boss', Hp = boss ? 122 : 92, cross = boss ? 60 : 42, gap = boss ? 7 : 5, bw = boss ? 46 : 32, bh = boss ? 84 : 58, ic = boss ? 38 : 27, top = -Hp + (boss ? 16 : 13);
      baseY = boss ? 32 : 24;
      shapes.push(`<rect x="${-cross}" y="${-Hp + 8}" width="${cross * 2}" height="5"/>`);
      let b = pole(Hp, boss ? 5 : 4) + `<rect x="${-cross}" y="${-Hp + 8}" width="${cross * 2}" height="5" rx="1" fill="url(#wood)" stroke="#1a0f06"/>`;
      for (const s of [-1, 1]) {
        const x0 = s > 0 ? gap : -gap - bw, p = hangPath(x0, top, bw, bh, boss ? 18 : 12);
        shapes.push(`<path d="${p}"/>`);
        b += `<path d="M${f1(x0 + 3)} ${f1(-Hp + 13)} V${f1(top)} M${f1(x0 + bw - 3)} ${f1(-Hp + 13)} V${f1(top)}" stroke="#2a1a0c" stroke-width="1.4"/><path d="${p}" fill="${cloth}" stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${f1(x0 + 3)} ${f1(top + 3)} H${f1(x0 + bw - 3)}" stroke="${edge}" stroke-opacity=".6" stroke-width="1.6"/><path d="M${f1(x0 + 4)} ${f1(top + 6)} V${f1(top + bh - (boss ? 24 : 16))} M${f1(x0 + bw - 4)} ${f1(top + 6)} V${f1(top + bh - (boss ? 24 : 16))}" stroke="${edge}" stroke-opacity=".28" stroke-width="1"/>${emblemOn(X, t, x0 + bw / 2, top + bw * 0.62 + 4, ic)}`;
      }
      if (boss) {
        const horn = (s) => `<path d="M${s * (cross - 4)} ${-Hp + 8} Q${s * (cross + 12)} ${-Hp + 6} ${s * (cross + 8)} ${-Hp - 14} Q${s * (cross + 2)} ${-Hp - 2} ${s * (cross - 14)} ${-Hp + 3}Z" fill="url(#hornb)" stroke="#3a2410" stroke-width="1.4" stroke-linejoin="round"/>`;
        b += horn(-1) + horn(1) + `<g transform="translate(0,${-Hp - 3})"><path d="M-10 0 L-10 -8 L-5 -4 L0 -13 L5 -4 L10 -8 L10 0Z" fill="url(#goldb)" stroke="#5a3510" stroke-width="1.3" stroke-linejoin="round"/><circle cy="-5" r="2" fill="#e8352a"/></g>`;
      } else b += `<path d="M0 ${-Hp - 14} L5 ${-Hp - 2} L0 ${-Hp + 2} L-5 ${-Hp - 2}Z" fill="url(#goldb)" stroke="#5a3510" stroke-width="1.2" stroke-linejoin="round"/>` + [-1, 1].map((s) => `<circle cx="${s * cross}" cy="${-Hp + 10.5}" r="3.4" fill="url(#goldb)" stroke="#5a3510"/>`).join('');
      body = b; box = { x0: -(cross + 14), x1: cross + 14, y0: -(Hp - baseY + 16), y1: baseY + 9 };
      body = `<g class="${boss ? 'flap2' : 'flap2 slow'}">${body}</g>`;
      var stoneS = boss ? 1.7 : 1.3;
    } else {
      const tall = k === 'elite', Hp = tall ? 72 : 60, d = FL[t] || FL.battle, y0 = -Hp + 5;
      baseY = tall ? 22 : 18;
      const fp = flagPath(d.sh, 1.5, y0, d.w, d.h);
      shapes.push(`<path d="${fp}"/>`);
      let b = pole(Hp, 3.6);
      b += `<g class="flag"><path d="${fp}" fill="${cloth}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${f1(1.5)} ${f1(y0 + 3)} Q${f1(d.w / 2)} ${f1(y0 + 1)} ${f1(d.w - 1)} ${f1(y0 + 3)}" fill="none" stroke="${edge}" stroke-opacity=".5"/>${emblemOn(X, t, d.w * 0.46 + 1.5, y0 + d.h / 2, d.ic)}</g>`;
      b += tall ? `<path d="M0 ${-Hp - 13} L4.6 ${-Hp - 1} L0 ${-Hp + 2} L-4.6 ${-Hp - 1}Z" fill="#e8352a" stroke="#ffcf7a" stroke-width="1.1" stroke-linejoin="round"/>` : `<circle cy="${-Hp - 2}" r="3.5" fill="url(#goldb)" stroke="#5a3510" stroke-width="1.1"/>`;
      body = b; box = { x0: -9, x1: d.w + 10, y0: -(Hp - baseY + 14), y1: baseY + 9 };
      var stoneS = 1;
    }
    const sh = `<g transform="matrix(1 0 -0.46 -0.22 0 0)" fill="#000" fill-opacity=".34" pointer-events="none">${shapes.join('')}</g>`;
    const g = `<g transform="translate(0,${baseY})"><ellipse class="selring2" rx="${f1(20 * stoneS)}" ry="${f1(8 * stoneS)}" fill="none" stroke="#ffb35a" stroke-width="2.2" stroke-dasharray="7 5"/>${sh}${stones(stoneS)}<g class="body">${body}</g></g>`;
    let extra = '';
    const rr = k === 'boss' ? 64 : k === 'town' ? 46 : 34;
    if (n.roaming) extra += `<ellipse cy="${baseY}" rx="${rr * 0.7}" ry="${rr * 0.28}" fill="none" stroke="#f08a6a" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`;
    const py = baseY - (k === 'boss' ? 17 : 14);
    extra += pulSvg(n.n, 0, py, k === 'boss' ? 10 : 9, GOLD);
    if (n.guarded) extra += shieldSvg(k === 'boss' ? 19 : 15, py + 1, k === 'boss' ? 1.3 : 1.05);
    return { body: g + extra, hit: null, box, baseY, hx0: box.x0, hx1: box.x1, hy0: box.y0, hy1: box.y1, accent: '#d9b26a', R: 0 };
  }

  /* C: yol boyunca taş işaretleri */
  function stoneMarks(X, edges, geoms, nodes) {
    let h = '';
    edges.forEach(([a, b, e], i) => {
      const g = geoms[i];
      if (g.len < 80 || (e && (e.sea || e.lift))) return;
      const r = rng(hash(a, b) ^ 0x5bd1e995), cnt = g.len > 250 ? 2 : 1;
      for (let c = 0; c < cnt; c++) {
        const t = cnt === 1 ? 0.4 + r() * 0.2 : c === 0 ? 0.3 + r() * 0.1 : 0.62 + r() * 0.1, p = pointAt(g, g.len * t), side = r() < 0.5 ? 1 : -1;
        const x = p.x - p.ty * 9 * side, y = p.y + p.tx * 9 * side;
        if (nodes.some((n) => Math.hypot(n.px - x, n.py - y) < 40)) continue;
        const kind = r() < 0.5;
        h += kind
          ? `<g transform="translate(${f1(x)},${f1(y)})"><ellipse cx="2" cy="1" rx="5" ry="2" fill="#000" fill-opacity=".35"/><path d="M-3.4 0 L-2.6 -9 Q0 -11 2.6 -9 L3.4 0Z" fill="#9a9183" stroke="#2a241d" stroke-width="1" stroke-linejoin="round"/><path d="M-1 -8 V-1" stroke="#cfc7b6" stroke-opacity=".6"/></g>`
          : `<g transform="translate(${f1(x)},${f1(y)})"><ellipse cy="1" rx="6" ry="2.2" fill="#000" fill-opacity=".35"/><ellipse cx="-2" cy="-1" rx="3.8" ry="2.3" fill="#8a8174" stroke="#2a241d"/><ellipse cx="2.4" cy="-1" rx="3.2" ry="2" fill="#766e62" stroke="#2a241d"/><ellipse cy="-3.4" rx="2.8" ry="1.8" fill="#a39a8a" stroke="#2a241d"/></g>`;
      }
    });
    return `<g pointer-events="none">${h}</g>`;
  }

  /* ======================================================= STİL D: REALM MATERIALS ======================================================= */
  const MATBY = { m2: { I: 'moss', II: 'moss', III: 'salt', IV: 'wreck', V: 'coral', VI: 'coral' }, m3: { I: 'frost', II: 'frost', III: 'iron', IV: 'iron', V: 'ember', VI: 'ember' } };
  const MATGLOW = { moss: '#8fbf4e', salt: '#cfeef8', wreck: '#d9a860', coral: '#4fd0b8', frost: '#a8dcf4', iron: '#9aa0aa', ember: '#ff7a1c' };
  const MATACC = { moss: '#b9a45a', salt: '#bfe3ee', wreck: '#c9a060', coral: '#58c8b0', frost: '#b8e0f2', iron: '#b8924a', ember: '#e8722a' };
  const D_R = { battle: 19, tab: 20, crossing: 21, town: 26, elite: 25, boss: 48 };
  function defsD() {
    let d = COMMON_DEFS() + plateDefs();
    for (const m in MATGLOW) d += radial('gd-' + m, [[0, MATGLOW[m], 0.7], [0.5, MATGLOW[m], 0.28], [1, MATGLOW[m], 0]]);
    d += linear('gm', [[0, '#d6b46a'], [0.45, '#8a9a46'], [1, '#3d5a2a']]);
    d += linear('gs', [[0, '#f2fbff'], [0.5, '#9fc2d0'], [1, '#5e7e8c']]);
    d += linear('gw', [[0, '#8a6238'], [0.5, '#4a2e18'], [1, '#6a4a28']]);
    d += linear('gc', [[0, '#7fe0c8'], [0.5, '#2f8f86'], [1, '#164a50']]);
    d += linear('gf', [[0, '#f4fbff'], [0.5, '#9cc4dc'], [1, '#4a6e88']]);
    d += linear('gi', [[0, '#8a8e96'], [0.5, '#3a3d44'], [1, '#6a6e76']]);
    d += radial('emb', [[0, '#ff8a2a', 0.9], [0.6, '#ff4a10', 0.4], [1, '#ff4a10', 0]]);
    d += ribbonDefs([{ id: 'rbDm2', c1: '#1f5a58', c2: '#0e3034' }, { id: 'rbDm3', c1: '#33495e', c2: '#1a2733' }]);
    return `<defs>${d}</defs>`;
  }
  function shardsD(R, rr, count, a0, a1, lenMin, lenMax, wd, cLight, cDark, seedBias) {
    let h = '';
    for (let i = 0; i < count; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.2 + rr() * 0.6)) / count, L = (lenMin + rr() * (lenMax - lenMin)) * (R / 22), r0 = R + 3.5, ca = Math.cos(a), sa = Math.sin(a);
      const bx = ca * r0, by = sa * r0, px = -sa, py = ca, tw = wd * (0.8 + rr() * 0.5) * (R / 22 > 1.6 ? 1.5 : 1), tilt = (rr() - 0.5) * 0.35;
      const tx = Math.cos(a + tilt) * (r0 + L), ty = Math.sin(a + tilt) * (r0 + L);
      h += `<path d="M${f1(bx - px * tw)} ${f1(by - py * tw)} L${f1(tx)} ${f1(ty)} L${f1(bx)} ${f1(by)}Z" fill="${cLight}" stroke="rgba(10,20,30,.55)" stroke-width="1" stroke-linejoin="round"/><path d="M${f1(bx + px * tw)} ${f1(by + py * tw)} L${f1(tx)} ${f1(ty)} L${f1(bx)} ${f1(by)}Z" fill="${cDark}" stroke="rgba(10,20,30,.55)" stroke-width="1" stroke-linejoin="round"/>`;
    }
    return h;
  }
  function matFrame(mat, R, rr, big) {
    const rim = R + 4.5, D = Math.PI / 180;
    if (mat === 'moss') {
      let h = `<circle cy="4" r="${R + 8}" fill="#1b2610" stroke="#0a0d05"/><circle r="${rim}" fill="none" stroke="url(#gm)" stroke-width="6.8"/><circle r="${R + 1.8}" fill="none" stroke="#1a1208" stroke-opacity=".8" stroke-width="1.2"/>`;
      const n = big ? 12 : 6;
      for (let i = 0; i < n; i++) { const a = (-175 + (160 * (i + rr() * 0.8)) / n) * D, x = Math.cos(a) * rim, y = Math.sin(a) * rim, s = (big ? 1.8 : 1) * (0.9 + rr() * 0.5); h += `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(s)})"><circle cx="-2" cy="1" r="3.4" fill="#4d7a2c"/><circle cx="2.4" cy="0" r="3.1" fill="#6f9a3a"/><circle cx="0" cy="-2.4" r="2.9" fill="#8fbc50"/><circle cx="-0.8" cy="-3" r="1.1" fill="#c8e08a" fill-opacity=".7"/></g>`; }
      const m = big ? 6 : 3;
      for (let i = 0; i < m; i++) { const a = (25 + (130 * (i + rr() * 0.7)) / m) * D, x = Math.cos(a) * rim, y = Math.sin(a) * rim, L = (big ? 22 : 11) * (0.7 + rr() * 0.6); h += `<path d="M${f1(x)} ${f1(y)} q${f1(2 + rr() * 2)} ${f1(L * 0.5)} ${f1(-1.5)} ${f1(L)}" fill="none" stroke="#5d8a38" stroke-width="${big ? 3.2 : 2}" stroke-linecap="round"/><circle cx="${f1(x - 1.5)}" cy="${f1(y + L)}" r="${big ? 2.6 : 1.8}" fill="#8fbc50"/>`; }
      return h;
    }
    if (mat === 'salt') {
      return `<g>${shardsD(R, rr, big ? 16 : 10, 0, Math.PI * 2, 8, 15, 3.4, '#f2fbff', '#8db4c4')}</g><circle cy="4" r="${R + 8}" fill="#1c2a33" stroke="#0a1218"/><circle r="${rim}" fill="none" stroke="url(#gs)" stroke-width="6"/><circle r="${R + 1.8}" fill="none" stroke="#0e1a22" stroke-opacity=".7" stroke-width="1.2"/>${[0, 1, 2].map((i) => { const a = (60 + i * 32) * D, x = Math.cos(a) * (rim + 2), y = Math.sin(a) * (rim + 2); return `<path d="M${f1(x)} ${f1(y)} l-2 -5 l3 -6 l3 6 l-2 5Z" fill="#e6f6fb" stroke="#4a6a78" stroke-width=".9" stroke-linejoin="round"/>`; }).join('')}`;
    }
    if (mat === 'wreck') {
      let h = `<circle cy="4" r="${R + 8}" fill="#1a0f08" stroke="#0a0603"/><circle r="${rim}" fill="none" stroke="#3a2412" stroke-width="7.6"/><circle r="${rim}" fill="none" stroke="url(#gw)" stroke-width="6.2" stroke-dasharray="${f1((2 * Math.PI * rim) / 18 - 1.8)} 1.8"/>`;
      for (const a of [45, 135, 225, 315]) h += `<rect x="-2.8" y="${-(rim + 5)}" width="5.6" height="10" rx="1" transform="rotate(${a + 90})" fill="#6a3a22" stroke="#1e100a" stroke-width="1.1"/>`;
      h += `<circle r="${R + 1}" fill="none" stroke="#cdb882" stroke-width="2.2" stroke-dasharray="2.6 2.4" stroke-opacity=".9"/>`;
      const bn = big ? 9 : 5;
      for (let i = 0; i < bn; i++) { const a = (20 + (140 * (i + rr() * 0.8)) / bn) * D, x = Math.cos(a) * (rim + 3), y = Math.sin(a) * (rim + 3); h += `<g transform="translate(${f1(x)},${f1(y)})"><circle cx="-1.5" r="2" fill="#d8d4c8" stroke="#3a342a" stroke-width=".8"/><circle cx="1.6" cy="-1" r="1.6" fill="#c4c0b2" stroke="#3a342a" stroke-width=".8"/></g>`; }
      return h;
    }
    if (mat === 'coral') {
      let h = `<circle cy="4" r="${R + 8}" fill="#0f2a2c" stroke="#06100f"/>`;
      const n = big ? 9 : 5;
      for (let i = 0; i < n; i++) { const a = (-165 + (150 * (i + rr() * 0.7)) / n); const L = (9 + rr() * 8) * (R / 22 > 1.6 ? 1.7 : 1); h += `<g transform="rotate(${f1(a + 90)}) translate(0,${-(rim + 1)})"><path d="M0 0 L0 ${-L} M0 ${f1(-L * 0.45)} L${f1(-L * 0.35)} ${f1(-L * 0.8)} M0 ${f1(-L * 0.6)} L${f1(L * 0.35)} ${f1(-L * 0.95)}" fill="none" stroke="#c4553c" stroke-width="3.6" stroke-linecap="round"/><path d="M0 0 L0 ${-L} M0 ${f1(-L * 0.45)} L${f1(-L * 0.35)} ${f1(-L * 0.8)} M0 ${f1(-L * 0.6)} L${f1(L * 0.35)} ${f1(-L * 0.95)}" fill="none" stroke="#f08a6a" stroke-width="1.6" stroke-linecap="round"/></g>`; }
      h += `<circle r="${rim}" fill="none" stroke="url(#gc)" stroke-width="6.6"/><circle r="${R + 1.8}" fill="none" stroke="#08201f" stroke-opacity=".8" stroke-width="1.2"/>`;
      for (let i = 0; i < 4; i++) { const a = (35 + i * 36 + rr() * 8) * D, x = Math.cos(a) * rim, y = Math.sin(a) * rim; h += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2.2 + rr())}" fill="#f4efe0" stroke="#8a8272" stroke-width=".8"/>`; }
      return h;
    }
    if (mat === 'frost') {
      let h = `<g>${shardsD(R, rr, big ? 12 : 7, -Math.PI * 1.04, -Math.PI * -0.04, 9, 18, 2.8, '#e8f6fd', '#8fb6cc')}</g><circle cy="4" r="${R + 8}" fill="#14202a" stroke="#080e14"/><circle r="${rim}" fill="none" stroke="url(#gf)" stroke-width="6"/><circle r="${R + 1.8}" fill="none" stroke="#0e1c28" stroke-opacity=".7" stroke-width="1.2"/>`;
      const n = big ? 10 : 6;
      for (let i = 0; i < n; i++) { const a = (15 + (150 * (i + rr() * 0.7)) / n) * D, x = Math.cos(a) * (rim + 1), L = (6 + rr() * 7) * (big ? 1.7 : 1), y = Math.sin(a) * (rim + 1); h += `<path d="M${f1(x - 2.2)} ${f1(y)} L${f1(x)} ${f1(y + L)} L${f1(x + 2.2)} ${f1(y)}Z" fill="#cfe9f5" stroke="#4a6e88" stroke-width=".9" stroke-linejoin="round"/>`; }
      h += [[-1.1, -0.9], [1.2, -0.6]].map(([x, y]) => `<path class="tw" d="M${f1(R * x)} ${f1(R * y - 4)} L${f1(R * x + 1.2)} ${f1(R * y - 1.2)} L${f1(R * x + 4)} ${f1(R * y)} L${f1(R * x + 1.2)} ${f1(R * y + 1.2)} L${f1(R * x)} ${f1(R * y + 4)} L${f1(R * x - 1.2)} ${f1(R * y + 1.2)} L${f1(R * x - 4)} ${f1(R * y)} L${f1(R * x - 1.2)} ${f1(R * y - 1.2)}Z" fill="#fff"/>`).join('');
      return h;
    }
    if (mat === 'iron') {
      const cnt = big ? 14 : 8;
      let h = `<circle cy="4" r="${R + 9}" fill="#0c0d10" stroke="#050506"/><circle r="${R + 5}" fill="none" stroke="#17181c" stroke-width="9.4"/><circle r="${R + 5}" fill="none" stroke="url(#gi)" stroke-width="8"/><circle r="${R + 5}" fill="none" stroke="#b8924a" stroke-opacity=".85" stroke-width="1.3" stroke-dasharray="6 3.5"/>${rivets(R + 5, cnt, '#cfd3da')}`;
      for (const a of [45, 135, 225, 315]) h += `<rect x="-5" y="${-(R + 11)}" width="10" height="7" rx="1.4" transform="rotate(${a})" fill="#4a4e55" stroke="#101114" stroke-width="1.2"/>`;
      h += `<circle r="${R + 1.6}" fill="none" stroke="#0a0b0d" stroke-opacity=".9" stroke-width="1.4"/>`;
      return h;
    }
    // ember: kor taşı
    const nP = big ? 18 : 12, pts = [];
    for (let i = 0; i < nP; i++) { const a = (i / nP) * Math.PI * 2, r = R + 5 + (rr() - 0.4) * (big ? 7 : 4.4); pts.push([f1(Math.cos(a) * r), f1(Math.sin(a) * r)]); }
    let h = `<circle r="${R + 13}" fill="url(#emb)"/><polygon points="${pts.map((p) => p.join(',')).join(' ')}" transform="translate(0,4)" fill="#120c0a" stroke="#050302"/><polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="#2b2420" stroke="#5a463a" stroke-width="2" stroke-linejoin="round"/>`;
    const cr = big ? 8 : 5;
    for (let i = 0; i < cr; i++) {
      const a = ((i + rr() * 0.8) / cr) * Math.PI * 2, r0 = R + 8, r1 = R + 0.4, mid = (r0 + r1) / 2, wob = (rr() - 0.5) * 0.3;
      const p = `M${f1(Math.cos(a) * r0)} ${f1(Math.sin(a) * r0)} L${f1(Math.cos(a + wob) * mid)} ${f1(Math.sin(a + wob) * mid)} L${f1(Math.cos(a - wob * 0.5) * r1)} ${f1(Math.sin(a - wob * 0.5) * r1)}`;
      h += `<path d="${p}" fill="none" stroke="#ff3a10" stroke-opacity=".45" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${p}" fill="none" stroke="#ffb040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    h += `<circle r="${R + 0.6}" fill="none" stroke="#ff7a1c" stroke-opacity=".6" stroke-width="1.6"/>`;
    return h;
  }
  function sealD(X, m, n) {
    const k = X.kindOf(n.type), t = n.type, R = D_R[t === 'crossing' ? 'crossing' : k] || 22, mat = MATBY[m.id][n.region] || 'moss', col = X.COL[t];
    const rr = rng(hash(n.n, m.id === 'm2' ? 2 : 3)), big = R > 40;
    const orn = ornament(k, R);
    const emblem = t === 'crossing' ? `<g transform="scale(${f1((R / 29) * 1.05)})">${X.boat(col)}</g>` : `<image href="${X.node(t)}" x="${f1(-R * 1.03)}" y="${f1(-R * 1.03 - 1)}" width="${f1(R * 2.06)}" height="${f1(R * 2.06)}"/>`;
    const aura = `<g pointer-events="none"><ellipse cy="${f1(R * 0.8)}" rx="${f1(R * 2)}" ry="${f1(R * 0.8)}" fill="url(#sootb)"/><ellipse cy="${f1(R * 0.8)}" rx="${f1(R * 1.7)}" ry="${f1(R * 0.62)}" fill="url(#gd-${mat})"/><ellipse cx="${f1(R * 0.22)}" cy="${f1(R + 7)}" rx="${f1(R * 1.1)}" ry="${f1(R * 0.3)}" fill="url(#shadb)"/></g>`;
    const rim = R + 7, ang = (135 * Math.PI) / 180, acc = MATACC[mat];
    const seal = `${orn.back}${matFrame(mat, R, rr, big)}<circle r="${R - 0.5}" fill="url(#discb)" stroke="${acc}" stroke-opacity=".85" stroke-width="1.6"/><circle r="${R - 4.4}" fill="none" stroke="${col}" stroke-opacity=".6" stroke-width="1.3"/>${emblem}${orn.front}`;
    let extra = '';
    if (n.roaming) extra += `<circle r="${R + 17}" fill="none" stroke="#f08a6a" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`;
    if (n.guarded) extra += shieldSvg(f1(rim * 0.74), f1(-rim * 0.74), k === 'boss' ? 1.4 : 1.1);
    extra += pulSvg(n.n, f1(rim * Math.cos(ang)), f1(rim * Math.sin(ang)), k === 'boss' ? 11 : 9.5, acc);
    return { R, aura, body: seal + extra, selR: R + 19, hit: Math.max(26, R + 12), box: { x0: -(R + 17), x1: R + 17, y0: -(R + (k === 'boss' ? 0.55 * R + 12 : k === 'elite' ? 20 : k === 'town' ? 16 : 16)), y1: R + 16 }, accent: acc, mat };
  }

  /* ======================================================= ANA ÇİZİM ======================================================= */
  const NOTE = {
    b: 'Epic Seal: heavy forged medallions with a soot-and-ember glow on the map, a short cast shadow, plaque names and ribbon regions. Boss is twice the old size (crown, horns, flames), elite 1.4x.',
    c: 'Banner & Landmark: every stop is a banner pole planted in the map with a pennant in its type colour and emblem; boss and town raise large paired banners. Small waystones sit along the roads.',
    d: 'Realm Materials: the frame is made of the land it stands in. Drowned Reach: mossed bronze (Valdren, Saltmarsh), salt crystal (Saltmere), wreck-iron and rope (Wrecking Coast), coral verdigris (Isles, Sunken Court). Hollow Crown: frost (Snowline, Windwall), black iron (Dwarf Road, Deep Halls), ember stone (Ashborn, Forge-Heart).',
  };
  function render(style, m, X) {
    const W = X.W, H = X.H;
    const nodes = m.nodes.map((n) => ({ ...n, px: n.x * W, py: n.y * H }));
    const byN = Object.fromEntries(nodes.map((n) => [n.n, n]));
    const defs = style === 'b' ? defsB() : style === 'c' ? defsC() : defsD();
    X.ctx = { W, H, esc: X.esc, measure: X.measure, COL: X.COL, node: X.node, kindOf: X.kindOf, boat: X.boat };
    const C = X.ctx;
    let h = defs + `<image href="${m.img}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/><rect width="${W}" height="${H}" fill="rgba(4,6,10,.12)"/>`;
    // bölge kurdeleri
    h += regionsSvg(C, m, style === 'b' ? { id: 'rbB', dark: '#2b0d07', edge: '#d9b26a', text: GOLD } : style === 'c' ? { id: 'rbC', dark: '#1f160a', edge: '#d9b26a', text: GOLD } : () => (m.id === 'm2' ? { id: 'rbDm2', dark: '#0a2224', edge: '#7fd6c4', text: '#e4f7f1' } : { id: 'rbDm3', dark: '#121b25', edge: '#9cc4dc', text: '#e8f4fb' }));
    // yollar (kıvrımlı, sabit tohum)
    const geoms = m.edges.map(([a, b, e]) => geom([byN[a].px, byN[a].py], [byN[b].px, byN[b].py], e, hash(a, b), W, H));
    if (m.roam) {
      const a = byN[m.roam.n];
      h += '<g pointer-events="none">' + m.roam.stops.map((s) => { const b = byN[s], g = geom([a.px, a.py], [b.px, b.py], null, hash(m.roam.n + 500, s), W, H); return `<path d="${g.d}" fill="none" stroke="#04121a" stroke-opacity=".4" stroke-width="5" stroke-linecap="round"/><path d="${g.d}" fill="none" stroke="#f08a6a" stroke-opacity=".85" stroke-width="2.4" stroke-dasharray="1.5 7" stroke-linecap="round"/>`; }).join('') + '</g>';
    }
    h += '<g id="roads">' + m.edges.map(([a, b, e], i) => `<g class="rd" data-a="${a}" data-b="${b}">${roadSvg(geoms[i], e)}<g class="hl"><path d="${geoms[i].d}" fill="none" stroke="#ffb35a" stroke-width="3.2" stroke-opacity=".95" stroke-linecap="round"/></g></g>`).join('') + '</g>';
    if (style === 'c') h += stoneMarks(X, m.edges, geoms, nodes);
    // düğümler (alttakiler üstte kalacak şekilde y sırası)
    const parts = {};
    for (const n of nodes) parts[n.n] = style === 'b' ? sealB(C, n) : style === 'c' ? bannerC(C, n) : sealD(C, m, n);
    let ns = '';
    for (const n of [...nodes].sort((a, b) => a.py - b.py)) {
      const p = parts[n.n];
      let inner;
      if (style === 'c') {
        inner = `<g class="nodebody">${p.body}</g><rect x="${f1(p.hx0)}" y="${f1(p.hy0)}" width="${f1(p.hx1 - p.hx0)}" height="${f1(p.hy1 - p.hy0)}" fill="transparent"/>`;
      } else {
        inner = `<g class="nodebody">${p.aura}<g class="body">${p.body}</g><circle class="selring" r="${p.selR}" fill="none" stroke="#ffb35a" stroke-width="2.6" stroke-dasharray="8 6"/></g><circle r="${p.hit}" fill="transparent"/>`;
      }
      ns += `<g class="node${n.optional ? ' pocket' : ''}" data-n="${n.n}" transform="translate(${f1(n.px)},${f1(n.py)})">${inner}</g>`;
    }
    h += `<g id="nodes">${ns}</g>`;
    // adlar: B ve D plaka; C parşömen-sancak altı plaka
    const boxOf = (n) => { const p = parts[n.n]; return style === 'c' ? { x0: p.box.x0, x1: p.box.x1, y0: p.box.y0, y1: p.box.y1 } : p.box; };
    const coreOf = style === 'c' ? boxOf : (n) => { const R = parts[n.n].R; return { x0: -(R + 9), x1: R + 9, y0: -(R + 9), y1: R + 13 }; };
    const lp = platePlace(nodes, boxOf, plateDim(C), C, coreOf);
    const accOf = (n) => (style === 'd' ? parts[n.n].accent : '#d9b26a');
    h += '<g id="labels" pointer-events="none">' + nodes.map((n) => plateSvg(n, lp[n.n], accOf(n), C)).join('') + '</g>';
    return h;
  }
  function ext(style, n) { // ipucu kutusunun düğümden uzaklığı (ekran yerine mantıksal birim)
    const k = n.type === 'battle' ? 'battle' : n.type === 'town' ? 'town' : n.type === 'elite' ? 'elite' : n.type === 'boss' ? 'boss' : 'tab';
    if (style === 'b') return (SEAL_R[n.type === 'crossing' ? 'crossing' : k] || 23) + 18;
    if (style === 'd') return (D_R[n.type === 'crossing' ? 'crossing' : k] || 22) + 20;
    return k === 'boss' ? 70 : k === 'town' ? 50 : 44;
  }
  window.MSTYLE = { render, ext, note: (s) => NOTE[s] || '' };
})();
