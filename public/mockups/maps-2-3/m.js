/* Harita 1 / 2 / 3 (#v0 / #v1 / #v2): bölge bazlı yakınlaşma taslağı (mockup, oyun kodu DEĞİL). Veri: data.js (window.MAPS).
   Uzak görünüm: yalnızca 6 bölge işareti + ana yol. Bölgeye tıkla = yakınlaş, düğümler ve yollar belirir.
   Rozet dili map-roads taslağından (sade: küçük altın-is çerçeve + tür ikonu), yollar kıvrımlı (kenar kimliğinden sabit tohum). */
(function () {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const W = 1672, H = 941;
  const f1 = (v) => +v.toFixed(1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const COL = { battle: '#cdb67f', event: '#b99ad6', treasure: '#efc85a', rest: '#f08c3c', merchant: '#9fc4a0', town: '#e3bf72', elite: '#d9562c', boss: '#f0c25a', crossing: '#7fc3d9' };
  const KIND = { battle: 'Battle', event: 'Event', treasure: 'Treasure', rest: 'Rest point', merchant: 'Merchant', town: 'Town', elite: 'Elite', boss: 'Boss', crossing: 'Crossing (deck battle)' };
  const kindOf = (t) => (t === 'battle' ? 'battle' : t === 'town' ? 'town' : t === 'elite' ? 'elite' : t === 'boss' ? 'boss' : 'tab');
  const SC = 0.46; // rozet ölçeği (1672 birimi; yakınlaşınca ekranda ~2x büyür)
  const EXT = { battle: 32, tab: 42, town: 46, elite: 44, boss: 56 };
  const RAD = { battle: 31, tab: 31, town: 39, elite: 39, boss: 46 };
  const DISC = 'url(#discg)';
  const node = (t) => `maps-2-3/n/${t}.webp`;
  const LEG = ['battle', 'elite', 'boss', 'town', 'treasure', 'event', 'rest', 'merchant', 'crossing'];

  const cv = document.createElement('canvas').getContext('2d');
  const measure = (t, font) => { cv.font = font; return cv.measureText(t).width; };
  const hash = (a, b) => (((a * 73856093) ^ (b * 19349663) ^ 0x9e3779b9) >>> 0);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- yol geometrisi: Catmull-Rom ile yumuşak S kıvrımları ---------- */
  function catmull(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      segs.push([[p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]);
    }
    return segs;
  }
  function geomFromSegs(A, segs) {
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
  const quad = (A, B, q) => [[[A[0] + (2 / 3) * (q[0] - A[0]), A[1] + (2 / 3) * (q[1] - A[1])], [B[0] + (2 / 3) * (q[0] - B[0]), B[1] + (2 / 3) * (q[1] - B[1])], B]];
  /* opt: spoke = hub yolu (derece >= 5): tek yumuşak kavis, ortada en çok uzunluğun %8'i sapma; add = kıvrım tohumu kaydırması (kesişim kontrolü); amp = sapma çarpanı */
  function geom(A, B, e, key, opt) {
    let segs;
    const o = opt || {}, amp = o.amp == null ? 1 : o.amp, k0 = key + (o.add || 0) * 7919;
    if (e && e.ctrl) {
      segs = quad(A, B, [e.ctrl[0] * W, e.ctrl[1] * H]);
    } else if (o.spoke && !(window.MAPFLAGS && window.MAPFLAGS.off)) {
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, sg = rng(k0)() < 0.5 ? 1 : -1, h = d * 0.16 * amp * sg; // ortada sapma = h / 2 = %8 (Ömer 2026-10-22: %3 çok düzdü)
      segs = quad(A, B, [(A[0] + B[0]) / 2 - (dy / d) * h, (A[1] + B[1]) / 2 + (dx / d) * h]);
    } else {
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux;
      const r = rng(k0), sg = r() < 0.5 ? 1 : -1, k = d > 260 ? 3 : 2;
      const off = Math.min(d * (0.1 + r() * 0.045), 56) * amp;
      const pts = [A];
      for (let i = 1; i <= k; i++) {
        const t = i / (k + 1), o = off * (i % 2 ? 1 : -1) * sg * (0.85 + r() * 0.3);
        pts.push([A[0] + dx * t + px * o, A[1] + dy * t + py * o]);
      }
      pts.push(B);
      segs = catmull(pts);
    }
    return geomFromSegs(A, segs);
  }
  function pointAt(g, s) {
    let i = 1;
    while (i < g.poly.length - 1 && g.cum[i] < s) i++;
    const a = g.poly[i - 1], b = g.poly[i], seg = g.cum[i] - g.cum[i - 1] || 1, t = clamp((s - g.cum[i - 1]) / seg, 0, 1);
    const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
    return { x: a.x + tx * t, y: a.y + ty * t, tx: tx / tl, ty: ty / tl };
  }
  function subGeom(g, s0, s1) { // yayın [s0, s1] aralığı: kısa doğrularla örneklenmiş yeni geometri
    const poly = [], n = Math.max(2, Math.ceil((s1 - s0) / 3));
    for (let i = 0; i <= n; i++) { const p = pointAt(g, s0 + ((s1 - s0) * i) / n); poly.push({ x: p.x, y: p.y }); }
    const cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y));
    return { d: poly.map((p, i) => `${i ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`).join(''), poly, cum, len: cum[cum.length - 1] };
  }
  function wavePath(g, amp, lam, phase) {
    let d = '';
    for (let s = 0; s <= g.len; s += 2.5) {
      const p = pointAt(g, s), o = amp * Math.sin((s / lam) * Math.PI * 2 + phase);
      d += `${s === 0 ? 'M' : 'L'}${f1(p.x - p.ty * o)} ${f1(p.y + p.tx * o)}`;
    }
    return d;
  }
  /* yol: oyundaki çift çizgi (koyu alt + açık üst + ince koyu iç çizgi); cep = kesik, deniz = dalgalı mavi, asansör = noktalı. rs = çizgi ölçeği */
  function roadSvg(g, e, rs, cap) {
    const o = e && e.optional, sea = e && e.sea, lift = e && e.lift;
    const P = (w, c, a, x) => `<path d="${(x && x.d) || g.d}" fill="none" stroke="${c}" stroke-opacity="${a}" stroke-width="${f1(w * rs)}" stroke-linecap="${(x && x.cap) || cap || 'round'}" stroke-linejoin="round"${x && x.dash ? ` stroke-dasharray="${x.dash.map((v) => f1(v * rs)).join(' ')}"` : ''}/>`;
    if (sea) return P(4.6, '#04121a', 0.45) + P(2, '#9fe0f0', 0.88, { d: wavePath(g, 1.7 * rs, 15 * rs, 0) }) + P(1, '#d6f4fb', 0.45, { d: wavePath(g, 1.3 * rs, 15 * rs, 2.4) });
    if (lift) return P(4.6, '#080503', 0.4) + P(2.8, '#cdb67f', 0.92, { dash: [0.1, 6], cap: 'round' });
    if (o) return P(4.6, '#080503', 0.34) + P(3, '#eadcb4', 0.5, { dash: [6, 6], cap: 'butt' }) + P(1.4, '#2a1d10', 0.4, { dash: [6, 6], cap: 'butt' });
    return P(4.6, '#080503', 0.4) + P(3, '#eadcb4', 0.72) + P(1.4, '#2a1d10', 0.65);
  }

  /* ---------- rozet çerçevesi (sade: altın-is; parlama / alev yok) ---------- */
  const img = (t, s) => `<image href="${node(t)}" x="${-s / 2}" y="${-s / 2 - 1}" width="${s}" height="${s}"/>`;
  const boat = (c) => `<g transform="translate(0,-1)"><path d="M-17 7 L17 7 L11 17 L-11 17Z" fill="${c}" stroke="rgba(0,0,0,.6)" stroke-width="1.4" stroke-linejoin="round"/><path d="M0 -20 L0 6" stroke="#e8d6a4" stroke-width="2.4"/><path d="M2 -19 L15 3 L2 3Z" fill="#e8d6a4" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/><path d="M-2 -13 L-12 3 L-2 3Z" fill="#cdbb92" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/></g>`;
  function frame(t) {
    const c = COL[t];
    const tab = (k) => `<path d="M${k * 30} -7 L${k * 46} 0 L${k * 30} 7 L${k * 34} 0Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>`;
    if (t === 'battle') return `<circle r="28" fill="${DISC}" stroke="${c}" stroke-width="2.4"/><circle r="31.5" fill="none" stroke="${c}" stroke-opacity=".3"/>${img(t, 54)}`;
    if (t === 'crossing') return `${tab(-1)}${tab(1)}<circle r="29" fill="${DISC}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>${boat(c)}`;
    if (['event', 'treasure', 'rest', 'merchant'].includes(t)) return `${tab(-1)}${tab(1)}<circle r="29" fill="${DISC}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>${img(t, 54)}`;
    if (t === 'town') return `<path d="M-14 -44 v-8 h6 v5 h5 v-5 h6 v5 h5 v-5 h6 v8Z" fill="${c}" stroke="rgba(0,0,0,.5)"/><circle r="34" fill="${DISC}" stroke="${c}" stroke-width="3.2"/><circle r="39" fill="none" stroke="${c}" stroke-opacity=".55" stroke-width="1.4"/>${img(t, 60)}`;
    if (t === 'elite') return `<circle r="40" fill="none" stroke="#9b3a1c" stroke-opacity=".8" stroke-width="2"/><circle r="33" fill="${DISC}" stroke="#e06a3a" stroke-width="3.6"/><path d="M0 -47 l6 6 l-6 6 l-6 -6Z" fill="#c8402a" stroke="#ffcf7a" stroke-width="1.4" stroke-linejoin="round"/>${img(t, 60)}`;
    return `<circle r="52" fill="none" stroke="#f0c25a" stroke-opacity=".45" stroke-width="1.6"/><circle r="46" fill="${DISC}" stroke="#f0c25a" stroke-width="4.2"/><circle r="41" fill="none" stroke="#c8802a" stroke-opacity=".8" stroke-width="1.6"/>${[-16, 0, 16].map((x, i) => `<path d="M${x - 6} -53 L${x} ${-64 - (i === 1 ? 5 : 0)} L${x + 6} -53Z" fill="#f0c25a" stroke="#7a4a10" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}${img('boss', 78)}`;
  }
  const defs = `<defs>
   <radialGradient id="discg" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="#4a3622"/><stop offset=".7" stop-color="#1c130b"/><stop offset="1" stop-color="#0d0805"/></radialGradient>
   <filter id="zblur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>`;
  const shield = (x, y, s) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(s)})"><path d="M-6 -7 L6 -7 L6 1 Q6 6 0 9 Q-6 6 -6 1Z" fill="#1a0f08" stroke="#efc85a" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -4 L0 5" stroke="#efc85a" stroke-width="1.4"/></g>`;
  function numChip(n, x, y, u) {
    const t = String(n), fs = 7.4 * u, w = Math.max(10 * u, measure(t, `700 ${fs}px Cinzel`) + 6 * u), h = 11 * u;
    return `<g class="numchip" transform="translate(${f1(x)},${f1(y)})"><rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(1.5 * u)}" fill="rgba(13,9,6,.94)" stroke="rgba(243,217,153,.7)" stroke-width="${f1(0.7 * u)}"/><text y="${f1(fs * 0.36)}" text-anchor="middle" style="font:700 ${f1(fs)}px Cinzel" fill="#f3d999">${t}</text></g>`;
  }

  /* ---------- durum ---------- */
  let M, cur = 'm2', S = { names: true, nums: true }, zoomed = null /* bölge kimliği ya da null */, sel = null;
  let fitK = 1, view = { k: 1, tx: 0, ty: 0 }, regTimer = 0, uid = 0;
  const stageEl = document.getElementById('stage'), worldEl = document.getElementById('world'), tip = document.getElementById('tip');
  const backBtn = document.getElementById('back'), crumb = document.getElementById('crumb');
  const sw = () => stageEl.clientWidth, sh = () => stageEl.clientHeight;

  const nodesOf = (rid) => M.nodes.filter((n) => n.region === rid).map((n) => ({ ...n, px: n.x * W, py: n.y * H }));
  const regionOf = (id) => M.regions.find((r) => r.id === id);

  /* ---------- UZAK GÖRÜNÜM: bölge alanı, ana yol, bölge işaretleri ---------- */
  const FN = '600 15px Cinzel', FS = "15px 'EB Garamond'";
  let regInfo = [];
  function farLayout() {
    regInfo = M.regions.map((r) => {
      const ns = nodesOf(r.id), cx = ns.reduce((a, n) => a + n.px, 0) / ns.length, cy = ns.reduce((a, n) => a + n.py, 0) / ns.length;
      const bosses = ns.filter((n) => n.type === 'boss').length, towns = ns.filter((n) => n.type === 'town').length;
      const sub = `${ns.length} stops${bosses ? ` · ${bosses} boss` : ''}`;
      const name = r.name.toUpperCase();
      const nw = measure(name, FN) + name.length * 1.5, subw = measure(sub, FS) + (bosses ? 24 : 0) + (towns ? 24 : 0);
      const tw = Math.max(nw, subw), w = tw + 44 + 18; // medalyon payı + yazı + sağ boşluk
      return { r, ns, cx: clamp(cx, w / 2 + 8, W - w / 2 - 8), cy: clamp(cy, 44, H - 44), bosses, towns, sub, name, w, subw };
    });
    // işaretler birbirine binmesin: çakışanlar en az kayacak eksende ayrılır
    const s = markS(), pad = 12;
    for (let it = 0; it < 80; it++) {
      let any = false;
      for (let i = 0; i < regInfo.length; i++) for (let j = i + 1; j < regInfo.length; j++) {
        const a = regInfo[i], b = regInfo[j], hw = ((a.w + b.w) / 2) * s + pad, hh = 27 * 2 * s + pad;
        const dx = b.cx - a.cx, dy = b.cy - a.cy, ox = hw - Math.abs(dx), oy = hh - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        any = true;
        if (oy <= ox) { const m = (oy / 2 + 0.5) * (dy >= 0 ? 1 : -1); a.cy -= m; b.cy += m; } else { const m = (ox / 2 + 0.5) * (dx >= 0 ? 1 : -1); a.cx -= m; b.cx += m; }
      }
      for (const x of regInfo) { x.cx = clamp(x.cx, (x.w / 2 + 8) * s, W - (x.w / 2 + 8) * s); x.cy = clamp(x.cy, 30 * s, H - 30 * s); }
      if (!any) break;
    }
  }
  function mainRoad() {
    const c = regInfo.map((x) => [x.cx, x.cy]);
    if (c.length < 2) return '';
    const pts = [c[0]];
    for (let i = 1; i < c.length; i++) {
      const a = c[i - 1], b = c[i], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = rng(hash(i, M.nodes.length)), o = d * (0.1 + r() * 0.07) * (i % 2 ? 1 : -1);
      pts.push([(a[0] + b[0]) / 2 - (dy / d) * o, (a[1] + b[1]) / 2 + (dx / d) * o], b);
    }
    const g = geomFromSegs(pts[0], catmull(pts));
    const P = (w, col, a) => `<path d="${g.d}" fill="none" stroke="${col}" stroke-opacity="${a}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    let h = P(15, '#060302', 0.32) + P(9, '#eadcb4', 0.34) + P(3.4, '#2a1d10', 0.3);
    for (let i = 1; i < pts.length - 1; i += 2) { // iki bölge arasının ortasında küçük yön oku
      const at = pointAt(g, g.cum[i * 16]), ang = (Math.atan2(at.ty, at.tx) * 180) / Math.PI;
      h += `<path transform="translate(${f1(at.x)},${f1(at.y)}) rotate(${f1(ang)})" d="M-7 -8 L5 0 L-7 8" fill="none" stroke="#f3d999" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return h;
  }
  function markerSvg(x) {
    const r = x.r, h = 46, xl = -x.w / 2, xt = xl + 36; // medalyonun sağında yazı
    const ic = (t, px) => `<image href="${node(t)}" x="${f1(px)}" y="4" width="20" height="20"/>`;
    let icx = xt + x.subw - (x.bosses ? 24 : 0) - (x.towns ? 24 : 0) + 6, icons = '';
    if (x.bosses) { icons += ic('boss', icx); icx += 24; }
    if (x.towns) icons += ic('town', icx);
    const mx = xl + 22;
    return `<g class="mk" data-r="${r.id}" data-cx="${f1(x.cx)}" data-cy="${f1(x.cy)}" transform="translate(${f1(x.cx)},${f1(x.cy)})" style="cursor:pointer">
      <rect class="mkbg" x="${f1(xl + 14)}" y="${-h / 2}" width="${f1(x.w - 14)}" height="${h}" rx="3" fill="rgba(10,7,4,.82)" stroke="rgba(217,178,106,.55)"/>
      <path d="M${f1(xl + 42)} ${-h / 2 + 4} H${f1(xl + x.w - 6)} M${f1(xl + 42)} ${h / 2 - 4} H${f1(xl + x.w - 6)}" stroke="rgba(217,178,106,.2)"/>
      <text x="${f1(xt + 8)}" y="-4" style="font:${FN};letter-spacing:.1em" fill="#f3d999">${esc(x.name)}</text>
      <text x="${f1(xt + 8)}" y="17" style="font:${FS}" fill="#cfbf9a">${esc(x.sub)}</text>
      ${icons.replace(/x="([\d.-]+)"/g, (m, v) => `x="${f1(+v + 8)}"`)}
      <circle cx="${f1(mx)}" r="25" fill="${DISC}" stroke="#f0c25a" stroke-width="2.6"/><circle cx="${f1(mx)}" r="20.5" fill="none" stroke="#f3d999" stroke-opacity=".35"/>
      <text x="${f1(mx)}" y="6.4" text-anchor="middle" style="font:700 ${r.id.length > 2 ? 14 : 18}px Cinzel" fill="#f3d999">${r.id}</text>
      <rect x="${f1(xl - 4)}" y="-28" width="${f1(x.w + 8)}" height="56" fill="transparent"/></g>`;
  }
  function farSvg() {
    farLayout();
    const blob = regInfo.map((x) => `<g class="blob" data-r="${x.r.id}" filter="url(#zblur)" pointer-events="none">${x.ns.map((n) => `<circle cx="${f1(n.px)}" cy="${f1(n.py)}" r="66" fill="#f3d999"/>`).join('')}</g>`).join('');
    const hit = regInfo.map((x) => `<g class="zhit" data-r="${x.r.id}" style="cursor:pointer">${x.ns.map((n) => `<circle cx="${f1(n.px)}" cy="${f1(n.py)}" r="52" fill="transparent"/>`).join('')}</g>`).join('');
    return `<g id="main" pointer-events="none">${mainRoad()}</g><g id="blobs">${blob}</g><g id="hits">${hit}</g><g id="marks">${regInfo.map(markerSvg).join('')}</g>`;
  }

  /* ---------- YAKIN GÖRÜNÜM: bölgenin düğümleri, yolları, komşu bölgeye çıkış okları ---------- */
  /* hub bölgesi (derece >= 8 olan düğüm): etiketler hub'ın dışına bakar ve yollara değmemeye çalışır; hub'ın kendi etiketi yollara en az değen yöne konur */
  function placeLabels(nodes, extOf, fs, preRects, hubs, pts) {
    const rects = preRects.slice(), out = {}, h = fs * 1.3;
    const circles = nodes.map((n) => ({ x: n.px, y: n.py, r: extOf(n) + 2 }));
    const hit = (r) => rects.some((q) => !(r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1)) || circles.some((c) => r.x1 > c.x - c.r && r.x0 < c.x + c.r && r.y1 > c.y - c.r && r.y0 < c.y + c.r);
    const roadHits = (r) => (pts && pts.length ? pts.reduce((k, p) => k + (p.x > r.x0 - 2 && p.x < r.x1 + 2 && p.y > r.y0 - 2 && p.y < r.y1 + 2 ? 1 : 0), 0) : 0);
    const hubSet = new Set((hubs || []).map((x) => x.n));
    for (const n of [...nodes].sort((a, b) => extOf(b) - extOf(a))) {
      const w = measure(n.name, `600 ${fs}px Cinzel`) + 4, R = extOf(n) + fs * 0.4;
      const cand = [
        { a: 'middle', x: n.px, y: n.py + R + fs, r: { x0: n.px - w / 2, x1: n.px + w / 2, y0: n.py + R, y1: n.py + R + h } },
        { a: 'middle', x: n.px, y: n.py - R - fs * 0.3, r: { x0: n.px - w / 2, x1: n.px + w / 2, y0: n.py - R - h, y1: n.py - R } },
        { a: 'start', x: n.px + R + 3, y: n.py + fs * 0.35, r: { x0: n.px + R, x1: n.px + R + w + 4, y0: n.py - h / 2, y1: n.py + h / 2 } },
        { a: 'end', x: n.px - R - 3, y: n.py + fs * 0.35, r: { x0: n.px - R - w - 4, x1: n.px - R, y0: n.py - h / 2, y1: n.py + h / 2 } },
      ].filter((c) => c.r.x0 > 2 && c.r.x1 < W - 2 && c.r.y0 > 2 && c.r.y1 < H - 2);
      let pick;
      if (hubs && hubs.length) {
        if (hubSet.has(n.n)) { // hub: 8 yönden yollara en az değen çakışmasız yer
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
          const c8 = dirs.map(([dx, dy]) => {
            const a = Math.abs(dx) > 0.5 ? (dx > 0 ? 'start' : 'end') : 'middle';
            const x0 = a === 'start' ? n.px + R : a === 'end' ? n.px - R - w : n.px - w / 2, x1 = x0 + w, y0 = dy === 0 ? n.py - h / 2 : dy > 0 ? n.py + R : n.py - R - h, y1 = y0 + h;
            return { a, x: a === 'start' ? n.px + R + 3 : a === 'end' ? n.px - R - 3 : n.px, y: (y0 + y1) / 2 + fs * 0.35, r: { x0, x1, y0, y1 } };
          }).filter((c) => c.r.x0 > 2 && c.r.x1 < W - 2 && c.r.y0 > 2 && c.r.y1 < H - 2 && !hit(c.r));
          c8.sort((p, q) => roadHits(p.r) - roadHits(q.r));
          pick = c8[0];
        } else {
          const hb = hubs.reduce((b, q) => (Math.hypot(n.px - q.px, n.py - q.py) < Math.hypot(n.px - b.px, n.py - b.py) ? q : b), hubs[0]);
          const vx = n.px - hb.px, vy = n.py - hb.py, vl = Math.hypot(vx, vy) || 1, dot = (c) => (c.a === 'middle' ? (c.y > n.py ? 1 : -1) * vy : (c.a === 'start' ? 1 : -1) * vx) / vl;
          cand.sort((p, q) => dot(q) - dot(p)); // dışa bakan yön önce
          pick = cand.find((c) => !hit(c.r) && !roadHits(c.r)) || cand.find((c) => !hit(c.r));
        }
      } else pick = cand.find((c) => !hit(c.r));
      const dim = !pick, p = pick || cand[0] || { a: 'middle', x: n.px, y: n.py + R + fs, r: { x0: n.px - w / 2, x1: n.px + w / 2, y0: n.py + R, y1: n.py + R + h } };
      rects.push(p.r);
      out[n.n] = { ...p, dim };
    }
    return out;
  }
  const rectsHit = (a, b) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);

  function layout(rid, ns) {
    const u = ns, sc = SC * ns, rs = Math.sqrt(ns);
    const nodes = nodesOf(rid), set = new Set(nodes.map((n) => n.n)), all = Object.fromEntries(M.nodes.map((n) => [n.n, { ...n, px: n.x * W, py: n.y * H }]));
    const extOf = (n) => EXT[kindOf(n.type)] * sc, radOf = (n) => RAD[kindOf(n.type)] * sc;
    const roads = [], stubs = [], deg = {};
    for (const [a, b] of M.edges) { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }
    const off = !!(window.MAPFLAGS && window.MAPFLAGS.off); // karşılaştırma için: eski çizim
    const spokeOf = (a, b) => !off && (deg[a] >= 5 || deg[b] >= 5);
    for (const [a, b, e] of M.edges) {
      const ia = set.has(a), ib = set.has(b);
      if (ia && ib) roads.push({ a, b, e, key: hash(a, b), spoke: spokeOf(a, b), add: 0, amp: 1, A: [all[a].px, all[a].py], B: [all[b].px, all[b].py] });
      else if (ia || ib) {
        const inn = ia ? all[a] : all[b], out = ia ? all[b] : all[a];
        stubs.push({ a: inn.n, b: out.n, inn, out, e, key: hash(Math.min(a, b), Math.max(a, b)), spoke: spokeOf(a, b), add: 0, amp: 1, A: [inn.px, inn.py], B: [out.px, out.py], nr: out.region, stub: true });
      }
    }
    const items = roads.concat(stubs);
    for (const it of items) it.g = geom(it.A, it.B, it.e, it.key, it);
    const stat = { before: 0, after: 0, hubBefore: 0, hubAfter: 0, nodeHitsBefore: 0, nodeHitsAfter: 0, changed: 0 };
    let recount = null;
    {
      const cls = nodes.map((n) => ({ n: n.n, x: n.px, y: n.py, r: extOf(n) * 0.9 }));
      const pre = (it) => { // çizilen kısım (yön ucu: en çok 230*u ya da %90)
        const lim = it.stub ? Math.min(it.g.len * 0.9, 230 * u) : 1e9, p = [];
        for (let i = 0; i < it.g.poly.length; i++) { p.push(it.g.poly[i]); if (it.g.cum[i] > lim) break; }
        return p;
      };
      const segX = (p1, p2, p3, p4) => { const d1x = p2.x - p1.x, d1y = p2.y - p1.y, d2x = p4.x - p3.x, d2y = p4.y - p3.y, den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) return false; const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / den, s = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / den; return t >= 0 && t <= 1 && s >= 0 && s <= 1; };
      const crossPoly = (P, Q) => { for (let i = 1; i < P.length; i++) for (let j = 1; j < Q.length; j++) if (segX(P[i - 1], P[i], Q[j - 1], Q[j])) return true; return false; };
      const nearPoly = (P, c) => { for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / l2, 0, 1); if (Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y) < c.r) return true; } return false; };
      const polys = items.map(pre);
      const share = (p, q) => p.a === q.a || p.a === q.b || p.b === q.a || p.b === q.b;
      const sharedId = (p, q) => (p.a === q.a || p.a === q.b ? p.a : p.b); // ortak düğüm
      const crossSh = (it, P, jt, Q) => { // ortak düğümü paylaşan iki yol, ortak düğümden başka yerde kesişiyor mu
        const s = sharedId(it, jt), p0 = it.a === s ? 1 : 0, q0 = jt.a === s ? 1 : 0, pl = P.length - 1, ql = Q.length - 1;
        for (let i = 1; i <= pl; i++) { if ((p0 && i === 1) || (!p0 && i === pl)) continue; for (let j = 1; j <= ql; j++) { if ((q0 && j === 1) || (!q0 && j === ql)) continue; if (segX(P[i - 1], P[i], Q[j - 1], Q[j])) return true; } }
        return false;
      };
      const costOf = (i, P) => { let c = 0; for (let j = 0; j < items.length; j++) if (j !== i && (share(items[i], items[j]) ? crossSh(items[i], P, items[j], polys[j]) : crossPoly(P, polys[j]))) c++; for (const cl of cls) if (cl.n !== items[i].a && cl.n !== items[i].b && nearPoly(P, cl)) c++; return c; };
      const total = () => { let c = 0, h = 0, nh = 0; for (let i = 0; i < items.length; i++) { for (let j = i + 1; j < items.length; j++) if (share(items[i], items[j]) ? crossSh(items[i], polys[i], items[j], polys[j]) : crossPoly(polys[i], polys[j])) { c++; if (items[i].spoke && items[j].spoke) h++; } for (const cl of cls) if (cl.n !== items[i].a && cl.n !== items[i].b && nearPoly(polys[i], cl)) nh++; } return { c, h, nh }; };
      const t0 = total(); stat.before = t0.c; stat.hubBefore = t0.h; stat.nodeHitsBefore = t0.nh;
      if (!off) for (let pass = 0; pass < 2; pass++) for (let i = 0; i < items.length; i++) {
        const it = items[i]; if (it.e && it.e.ctrl) continue; // elle çizilmiş eğri
        let best = { c: costOf(i, polys[i]), add: it.add, amp: it.amp, g: it.g, P: polys[i] };
        if (best.c === 0) continue;
        const tryOne = (add, amp) => { const g = geom(it.A, it.B, it.e, it.key, { spoke: it.spoke, add, amp }), old = it.g; it.g = g; const P = pre(it); it.g = old; const c = costOf(i, P); if (c < best.c) best = { c, add, amp, g, P }; };
        if (!it.spoke) for (let add = 1; add <= 6 && best.c > 0; add++) tryOne(add, 1); // en çok 6 farklı tohum
        for (const amp of [0.55, 0.3, 0]) { if (best.c === 0) break; tryOne(best.add, amp); } // olmazsa sapmayı küçült
        if (best.g !== it.g) { it.g = best.g; it.add = best.add; it.amp = best.amp; polys[i] = best.P; stat.changed++; }
      }
      const t1 = total(); stat.after = t1.c; stat.hubAfter = t1.h; stat.nodeHitsAfter = t1.nh;
      recount = () => { for (let i = 0; i < items.length; i++) polys[i] = pre(items[i]); const t = total(); stat.after = t.c; stat.hubAfter = t.h; stat.nodeHitsAfter = t.nh; };
    }
    // komşu bölge okları: her komşu için tek etiket; çakışmasız yer seçilir
    const fsP = 9 * u, hP = fsP * 2, pills = [], used = {};
    const nodeCircles = nodes.map((n) => ({ x: n.px, y: n.py, r: extOf(n) + 3 }));
    const rectBad = (r) => r.x0 < 4 || r.x1 > W - 4 || r.y0 < 4 || r.y1 > H - 4 || nodeCircles.some((c) => r.x1 > c.x - c.r && r.x0 < c.x + c.r && r.y1 > c.y - c.r && r.y0 < c.y + c.r) || pills.some((p) => rectsHit(r, p.r));
    for (const s of stubs) {
      const L0 = [150, 115, 190, 85, 230].map((v) => v * u), nreg = regionOf(s.nr), label = `${nreg.id} · ${nreg.name}`;
      const w = measure(label, `600 ${fsP}px Cinzel`) + fsP * 1.8;
      let best = null;
      for (const L of L0) {
        const len = Math.min(s.g.len * 0.9, L), tip = pointAt(s.g, len), hor = Math.abs(tip.tx) >= Math.abs(tip.ty), gap = 6 * u;
        const cx = hor ? tip.x + Math.sign(tip.tx || 1) * (w / 2 + gap) : tip.x, cy = hor ? tip.y : tip.y + Math.sign(tip.ty || 1) * (hP / 2 + gap);
        const r = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - hP / 2, y1: cy + hP / 2 };
        const cand = { len, tip, cx, cy, w, r, label, nreg };
        if (!best) best = cand;
        if (!rectBad(r)) { best = cand; break; }
      }
      s.len = best.len; s.tip = best.tip;
      if (!used[s.nr]) { used[s.nr] = 1; pills.push(best); }
    }
    const fs = 8 * u;
    const hubs = off ? [] : nodes.filter((n) => deg[n.n] >= 8);
    const ptsOf = () => { const q = []; for (const r of roads) { const g = r.g; for (let s = 0; s <= g.len; s += 6) { const p = pointAt(g, s); q.push({ x: p.x, y: p.y, r }); } } return q; };
    let roadPts = hubs.length ? ptsOf() : [], lab = placeLabels(nodes, extOf, fs, pills.map((p) => p.r), hubs, roadPts);
    for (let pass = 0; hubs.length && pass < 2; pass++) { // etiketin üstüne kıvrılan (hub dışı) yolun sapması küçülür, etiketler yeniden yerleşir
      let ch = false;
      for (const n of nodes) {
        if (hubs.includes(n)) continue;
        const l = lab[n.n];
        for (const p of roadPts) if (p.x > l.r.x0 - 2 && p.x < l.r.x1 + 2 && p.y > l.r.y0 - 2 && p.y < l.r.y1 + 2 && !p.r.spoke && !(p.r.e && p.r.e.ctrl) && p.r.amp > 0.3) { p.r.amp = 0.3; p.r.g = geom(p.r.A, p.r.B, p.r.e, p.r.key, p.r); ch = true; }
      }
      if (!ch) break;
      roadPts = ptsOf(); lab = placeLabels(nodes, extOf, fs, pills.map((p) => p.r), hubs, roadPts);
      if (recount) recount();
    }
    // sınırlar (dünya birimi)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const grow = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
    for (const n of nodes) { const e = extOf(n); grow(n.px - e, n.py - e, n.px + e, n.py + e); const l = lab[n.n]; if (l) grow(l.r.x0, l.r.y0, l.r.x1, l.r.y1); }
    for (const p of pills) grow(p.r.x0, p.r.y0, p.r.x1, p.r.y1);
    for (const s of stubs) grow(s.tip.x - 4, s.tip.y - 4, s.tip.x + 4, s.tip.y + 4);
    return { rid, ns, u, sc, rs, nodes, all, roads, stubs, pills, lab, extOf, radOf, fs, stat, bounds: { x0, y0, x1, y1 } };
  }

  function regionSvg(L, k) {
    const byN = L.all, rid = L.rid, id0 = ++uid;
    let h = '';
    // gezici elit rotası (yalnız bölge içinde kalan duraklar)
    if (M.roam && byN[M.roam.n].region === rid) {
      const a = byN[M.roam.n];
      h += '<g pointer-events="none">' + M.roam.stops.filter((s) => byN[s].region === rid).map((s) => { const b = byN[s], dx = b.px - a.px, dy = b.py - a.py, d = `M${a.px} ${a.py} Q${f1((a.px + b.px) / 2 - dy * 0.12)} ${f1((a.py + b.py) / 2 + dx * 0.12)} ${b.px} ${b.py}`; return `<path d="${d}" fill="none" stroke="#04121a" stroke-opacity=".4" stroke-width="${f1(3 * L.rs)}"/><path d="${d}" fill="none" stroke="#f08a6a" stroke-opacity=".85" stroke-width="${f1(1.6 * L.rs)}" stroke-dasharray="1 5" stroke-linecap="round"/>`; }).join('') + '</g>';
    }
    h += '<g class="roads">' + L.roads.map((r) => `<g class="rd" data-a="${r.a}" data-b="${r.b}">${roadSvg(r.g, r.e, L.rs)}<path class="hl" d="${r.g.d}" fill="none" stroke="#ffb35a" stroke-width="${f1(2 * L.rs)}" stroke-opacity=".95"/></g>`).join('') + '</g>';
    // komşu bölgeye çıkan yollar: bölge sınırında soluklaşır
    let sd = '', sg = '';
    L.stubs.forEach((s, i) => {
      const sub = subGeom(s.g, 0, s.len), a = s.g.poly[0], t = s.tip, id = `${id0}_${i}`;
      const m = 14 * L.u;
      const bx0 = Math.min(a.x, t.x) - m, by0 = Math.min(a.y, t.y) - m, bw = Math.abs(t.x - a.x) + 2 * m, bh = Math.abs(t.y - a.y) + 2 * m;
      sd += `<linearGradient id="fg${id}" gradientUnits="userSpaceOnUse" x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(t.x)}" y2="${f1(t.y)}"><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="fm${id}" maskUnits="userSpaceOnUse" x="${f1(bx0)}" y="${f1(by0)}" width="${f1(bw)}" height="${f1(bh)}"><rect x="${f1(bx0)}" y="${f1(by0)}" width="${f1(bw)}" height="${f1(bh)}" fill="url(#fg${id})"/></mask>`;
      sg += `<g class="rd" data-a="${s.inn.n}" data-b="${s.out.n}"><g mask="url(#fm${id})">${roadSvg(sub, s.e, L.rs, 'butt')}</g></g>`;
    });
    h += `<defs>${sd}</defs><g class="stubs">${sg}</g>`;
    // yön okları + komşu bölge etiketleri (tıkla = o bölgeye geç)
    const done = new Set();
    for (const s of L.stubs) {
      const key = s.nr + ':' + f1(s.tip.x) + ':' + f1(s.tip.y);
      if (done.has(key)) continue;
      done.add(key);
      const t = s.tip, ang = (Math.atan2(t.ty, t.tx) * 180) / Math.PI;
      h += `<path pointer-events="none" transform="translate(${f1(t.x)},${f1(t.y)}) rotate(${f1(ang)}) scale(${f1(L.u)})" d="M-5 -5 L3 0 L-5 5" fill="none" stroke="#f3d999" stroke-opacity=".85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    for (const p of L.pills) {
      const q = L.u, fs = 9 * q;
      h += `<g class="pill" data-go="${p.nreg.id}" transform="translate(${f1(p.cx)},${f1(p.cy)})" style="cursor:pointer"><rect x="${f1(-p.w / 2)}" y="${f1(-fs)}" width="${f1(p.w)}" height="${f1(fs * 2)}" rx="${f1(2 * q)}" fill="rgba(10,7,4,.86)" stroke="rgba(217,178,106,.6)" stroke-width="${f1(0.8 * q)}"/><text y="${f1(fs * 0.36)}" text-anchor="middle" style="font:600 ${f1(fs)}px Cinzel;letter-spacing:.04em" fill="#f3d999">${esc(p.label)}</text></g>`;
    }
    // rozetler
    let ns = '';
    for (const n of L.nodes) {
      const k0 = kindOf(n.type), R = L.radOf(n), ex = L.extOf(n);
      let body = `<g transform="scale(${f1(L.sc * 1000) / 1000})"><g class="body">${frame(n.type)}</g></g>`;
      body += `<circle class="selring" r="${f1(R + 4 * L.u)}" fill="none" stroke="#ffb35a" stroke-width="${f1(1.4 * L.u)}" stroke-dasharray="${f1(4 * L.u)} ${f1(3 * L.u)}"/>`;
      if (n.guarded) body += shield(R * 0.8, -R * 0.8, L.u * 0.62);
      if (n.roaming) body += `<circle r="${f1(R + 3 * L.u)}" fill="none" stroke="#f08a6a" stroke-width="${f1(1.2 * L.u)}" stroke-dasharray="1 3" stroke-linecap="round"/>`;
      body += numChip(n.n, -R * 0.85, -R * 0.95 - (k0 === 'boss' ? 4 * L.u : 0), L.u);
      ns += `<g class="node${n.optional ? ' pocket' : ''}" data-n="${n.n}" transform="translate(${f1(n.px)},${f1(n.py)})"><g class="nodebody">${body}</g><circle r="${f1(Math.max(ex, 22 / k))}" fill="transparent"/></g>`;
    }
    h += `<g class="nodes">${ns}</g>`;
    h += '<g class="labels" pointer-events="none">' + L.nodes.map((n) => { const p = L.lab[n.n]; return `<text class="lbl${p.dim ? ' dim' : ''}" x="${f1(p.x)}" y="${f1(p.y)}" text-anchor="${p.a}" fill="${n.type === 'boss' ? '#ffd9a0' : '#ece0c0'}" stroke="rgba(6,4,2,.95)" stroke-width="${f1(2.8 * L.u)}" stroke-linejoin="round" paint-order="stroke" style="font:600 ${f1(L.fs)}px Cinzel">${esc(n.name)}</text>`; }).join('') + '</g>';
    return h;
  }

  /* ---------- kamera ---------- */
  const markS = () => f1(clamp(0.8 / farView().k, 1, 1.9));
  const farView = () => { const k = Math.min(sw() / W, sh() / H); return { k, tx: (sw() - W * k) / 2, ty: (sh() - H * k) / 2 }; };
  function fitView(b) {
    const top = 58, pad = 20, wp = M.pad || 26; // az bölgeli haritada (Harita 1) bölge sınırına daha geniş boşluk
    const bw = b.x1 - b.x0 + wp * 2, bh = b.y1 - b.y0 + wp * 2;
    const k = Math.min((sw() - pad * 2) / bw, (sh() - top - pad) / bh, M.maxK || 7);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, ax = sw() / 2, ay = top + (sh() - top - pad) / 2;
    return { k, tx: ax - cx * k, ty: ay - cy * k };
  }
  function applyView(v, anim) {
    view = v;
    worldEl.classList.toggle('nt', !anim);
    worldEl.style.transform = `translate(${f1(v.tx)}px,${f1(v.ty)}px) scale(${v.k})`;
  }
  const clearSel = () => { sel = null; tip.classList.remove('on'); worldEl.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel')); worldEl.querySelectorAll('.rd.hot').forEach((x) => x.classList.remove('hot')); };
  function markScale() { const s = markS(); worldEl.querySelectorAll('.mk').forEach((m) => m.setAttribute('transform', 'translate(' + m.dataset.cx + ',' + m.dataset.cy + ') scale(' + s + ')')); }

  function setRegion(rid, anim) {
    clearSel(); clearTimeout(regTimer);
    const layer = worldEl.querySelector('#reg');
    if (!rid) {
      zoomed = null; stageEl.classList.remove('zoomed');
      layer.querySelectorAll('.rgc').forEach((g) => g.classList.remove('on'));
      regTimer = setTimeout(() => { layer.innerHTML = ''; }, anim === false ? 0 : 700);
      applyView(farView(), anim !== false); fitK = view.k;
      backBtn.setAttribute('aria-hidden', 'true'); crumb.innerHTML = '';
      writeHash(); return;
    }
    zoomed = rid;
    // iki geçiş: rozet ölçeği küçük ekranda büyütülür (dokunma hedefi)
    let ns = 1, L = layout(rid, 1), v = fitView(L.bounds);
    const want = clamp(21 / (v.k * 14.2), 1, 3.4);
    if (want > 1.06) { ns = want; L = layout(rid, ns); v = fitView(L.bounds); }
    layer.innerHTML = `<g class="rgc" data-r="${rid}">${regionSvg(L, v.k)}</g>`;
    wireRegion();
    stageEl.classList.add('zoomed');
    const r = regionOf(rid);
    crumb.innerHTML = `<span class="cm">${esc(r.id)}</span><span class="cn">${esc(r.name)}</span>`;
    backBtn.removeAttribute('aria-hidden');
    applyView(v, anim !== false); fitK = v.k;
    requestAnimationFrame(() => requestAnimationFrame(() => layer.querySelector('.rgc')?.classList.add('on')));
    writeHash();
  }

  /* ---------- A Band ipucu ---------- */
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
  function showTip(n, g) {
    tip.innerHTML = tipHtml(n);
    tip.classList.add('on');
    const sr = stageEl.getBoundingClientRect(), br = g.querySelector('.body').getBoundingClientRect();
    const nx = br.left + br.width / 2 - sr.left, ny = br.top + br.height / 2 - sr.top, gap = br.width / 2 + 12;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = nx + gap, y = ny - th / 2;
    if (x + tw > sr.width - 6) x = nx - tw - gap;
    if (x < 6) x = clamp(nx - tw / 2, 6, Math.max(6, sr.width - tw - 6));
    y = clamp(y, 6, Math.max(6, sr.height - th - 6));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  /* ---------- olaylar ---------- */
  let drag = null, moved = false;
  function wireRegion() {
    const byN = Object.fromEntries(M.nodes.map((n) => [n.n, n]));
    const hot = (n, on) => worldEl.querySelectorAll('.rd').forEach((g) => { if (+g.dataset.a === n || +g.dataset.b === n) g.classList.toggle('hot', on); });
    worldEl.querySelectorAll('.node').forEach((g) => {
      const n = byN[+g.dataset.n];
      g.addEventListener('mouseenter', () => { if (!sel) showTip(n, g); hot(n.n, true); });
      g.addEventListener('mouseleave', () => { if (!sel) tip.classList.remove('on'); if (sel !== n.n) hot(n.n, false); });
      g.addEventListener('click', (ev) => {
        ev.stopPropagation(); if (moved) return;
        const was = sel === n.n; clearSel();
        if (was) return;
        sel = n.n; g.classList.add('sel'); hot(n.n, true); showTip(n, g);
      });
    });
    worldEl.querySelectorAll('.pill').forEach((g) => g.addEventListener('click', (ev) => { ev.stopPropagation(); if (!moved) setRegion(g.dataset.go); }));
  }
  function wireFar() {
    const hov = (id, on) => worldEl.querySelectorAll(`[data-r="${id}"]`).forEach((e) => e.classList.toggle('hov', on));
    worldEl.querySelectorAll('.zhit, .mk').forEach((g) => {
      g.addEventListener('mouseenter', () => hov(g.dataset.r, true));
      g.addEventListener('mouseleave', () => hov(g.dataset.r, false));
      g.addEventListener('click', (ev) => { ev.stopPropagation(); if (!moved) setRegion(g.dataset.r); });
    });
  }
  backBtn.addEventListener('click', (ev) => { ev.stopPropagation(); setRegion(null); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomed) { if (sel) clearSel(); else setRegion(null); } });
  stageEl.addEventListener('click', (ev) => { if (moved) { moved = false; return; } if (zoomed) { if (sel) clearSel(); else if (!ev.target.closest('.back, .tipbox')) setRegion(null); } });
  stageEl.addEventListener('wheel', (e) => {
    if (!zoomed) return;
    e.preventDefault();
    const sr = stageEl.getBoundingClientRect(), px = e.clientX - sr.left, py = e.clientY - sr.top;
    const k2 = clamp(view.k * Math.exp(-e.deltaY * 0.0014), fitK * 0.9, fitK * 2.4), f = k2 / view.k;
    clearSel(); applyView({ k: k2, tx: px - (px - view.tx) * f, ty: py - (py - view.ty) * f }, false);
  }, { passive: false });
  stageEl.addEventListener('pointerdown', (e) => { if (zoomed && e.button === 0 && !e.target.closest('.back')) { drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }; moved = false; } });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 7) return;
    if (!moved) { moved = true; clearSel(); }
    applyView({ k: view.k, tx: drag.tx + dx, ty: drag.ty + dy }, false);
  });
  window.addEventListener('pointerup', () => { if (drag) { drag = null; setTimeout(() => { moved = false; }, 0); } });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!M) return; const z = zoomed; render(); if (z) setRegion(z, false); }, 120); });

  /* ---------- sayfa ---------- */
  function legend() {
    const has_opt = () => M.nodes.some((n) => n.optional);
    const has = (t) => M.nodes.some((n) => n.type === t);
    const items = LEG.filter(has).map((t) => `<span class="it"><img src="${node(t === 'crossing' ? 'battle' : t)}" alt="">${KIND[t].replace(' (deck battle)', '')}</span>`);
    const extra = [
      '<span class="it"><span class="sw solid"></span>Road</span>',
      ...(has_opt() ? ['<span class="it"><span class="sw"></span>Optional pocket (dead end, faded badge)</span>'] : []),
      '<span class="it"><svg class="gd" viewBox="-8 -9 16 20"><path d="M-6 -7 L6 -7 L6 1 Q6 6 0 9 Q-6 6 -6 1Z" fill="#1a0f08" stroke="#efc85a" stroke-width="1.6"/></svg>Guarded treasure</span>',
    ];
    if (cur === 'm1') { /* Valdoria: özel yol türü yok */ } else if (cur === 'm2') extra.push('<span class="it"><span class="sw sea"></span>Sea lane (needs a ship)</span>', '<span class="it"><span class="sw roam"></span>Black Caravel route</span>');
    else extra.push('<span class="it"><span class="sw" style="border-top:3px dotted #cdb67f"></span>Lift (vertical road between floors)</span>');
    const cnt = (f) => M.nodes.filter(f).length;
    document.getElementById('legend').innerHTML = items.concat(extra).join('');
    document.getElementById('stats').innerHTML = `<b>${M.nodes.length}</b> nodes · <b>${cnt((n) => n.type === 'boss')}</b> boss · <b>${cnt((n) => n.type === 'elite')}</b> elite · <b>${cnt((n) => n.type === 'town')}</b> town · ${has_opt() ? `<b>${cnt((n) => n.optional)}</b> optional pockets · ` : ''}<b>${M.edges.length}</b> roads · <b>${M.regions.length}</b> regions`;
  }
  function render() {
    M = window.MAPS[cur];
    clearSel(); zoomed = null; stageEl.classList.remove('zoomed');
    worldEl.querySelector('svg')?.remove();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = `${defs}<image href="${M.img}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/><rect width="${W}" height="${H}" fill="rgba(4,6,10,.18)"/>${farSvg()}<g id="reg"></g>`;
    worldEl.appendChild(svg);
    markScale(); wireFar(); legend();
    document.getElementById('ttl').innerHTML = `${esc(M.name)}<small>${esc(M.sub)}</small>`;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.v === cur));
    applyToggles();
    setRegion(null, false);
  }
  function applyToggles() {
    stageEl.classList.toggle('hidenames', !S.names);
    stageEl.classList.toggle('nonum', !S.nums);
    document.querySelectorAll('.tog').forEach((b) => b.classList.toggle('on', S[b.dataset.t]));
  }
  let startRegion = null;
  function readHash() {
    const p = location.hash.replace(/^#/, '').split('&');
    cur = p.includes('v0') ? 'm1' : p.includes('v2') ? 'm3' : 'm2';
    const rp = p.find((x) => /^r=/.test(x)); startRegion = rp ? rp.slice(2) : null;
    if (p.includes('clean')) { S.names = false; S.nums = false; }
    if (p.includes('nonames')) S.names = false;
  }
  function writeHash() { history.replaceState(null, '', '#' + ({ m1: 'v0', m2: 'v1', m3: 'v2' }[cur]) + (zoomed ? '&r=' + zoomed : '')); }
  function boot() { render(); if (startRegion && regionOf(startRegion)) setRegion(startRegion, false); }

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { cur = b.dataset.v; render(); }));
  document.querySelectorAll('.tog').forEach((b) => b.addEventListener('click', () => { S[b.dataset.t] = !S[b.dataset.t]; applyToggles(); }));
  window.addEventListener('hashchange', () => { readHash(); boot(); });
  window.MAPDBG = { layout: (r, n) => layout(r, n || 1), get M() { return M; }, setRegion, get view() { return view; } };
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 12px Cinzel'), document.fonts.load("16px 'EB Garamond'")]).catch(() => 0) : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]).then(() => { readHash(); boot(); });
})();
