/* Corner ornament mockup: oyun kodu degil. Varyant kurallari burada uretilir: .vNN / .wNN {.bp-ico | .el-panel | .bt}::before = tek kaplama, kose arka planlari; ::after kapali.
   OLCEK KURALI (Omer 2026-11-21): susun boyu kutuyla AYNI olcekten turer (duz px: kutu nasil kuculuyorsa sus de kucuk = transform / --u). Gercek-piksel tabani (var(--rp))
   yalniz gorunmez olmayi onler: nokta en az 1,2 gercek px, cizgi en az 1 gercek px. Tabanlar masaustu orani asmayacak sekilde secilir; __measure() orani olcer. */
(function () {
  const I = 'kose-sus/img/';
  const HOSTS = ['.bp-ico', '.el-panel', '.bt'];
  const OS = 'var(--os)';
  const T = 'var(--T)';
  const BR = '#f6e8bc';
  const TK = 'max(3px, calc(1.3 * var(--rp)))';
  const TH ='max(.6px, calc(.45 * var(--rp)))';
  const GOLD = 'rgba(217,178,106,.95)';
  const LIGHT = '#f0dca8';
  const IVORY = 'rgba(236,228,204,.82)';
  const half = (v) => `calc(${v} / -2)`;
  const flat = (c) => `linear-gradient(${c},${c})`;
  const dsz = (n) => `max(${n}px, var(--fl))`; // nokta capi: n px (olcekli), en az 1,2 gercek piksel
  const dotImg = (col) => `radial-gradient(circle, ${col} 0 52%, transparent 58%)`;
  const FLAME = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 16'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='1' x2='0' y2='0'%3E%3Cstop offset='0' stop-color='%23e0702a'/%3E%3Cstop offset='1' stop-color='%23ffd98a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M6 15.4C2.4 15.4 1 12.2 2.6 9.2 3.2 10.6 4.2 10.8 4.6 9.2 4.9 6.6 6.2 4.2 7.4 1 10.2 3.6 11 7.2 10.4 10.4 10 13.4 8.2 15.4 6 15.4Z' fill='url(%23g)' stroke='%23fff0c4' stroke-width='.6'/%3E%3C/svg%3E\")";

  const L = (c, img, w, h, dx, dy) => ({ c, img, w, h, dx, dy });
  const ALL4 = ['tl', 'tr', 'bl', 'br'];
  const OPP = ['tl', 'br'];
  const TOP2 = ['tl', 'tr'];

  // kenar boyunca nokta sirasi: items = [{p: koseden uzaklik (px), n: cap (px), col, off: icerye kayma (px)}]; axis 'h' ust / alt kenar, 'v' sol / sag kenar
  const dots = (c, axis, items) => items.map((it) => {
    const d = dsz(it.n);
    const col = it.col || LIGHT;
    const off = it.off ? `calc(${it.off}px + ${d} * -.5)` : half(d);
    return axis === 'h' ? L(c, dotImg(col), d, d, `${it.p}px`, off) : L(c, dotImg(col), d, d, off, `${it.p}px`);
  });
  const edge3 = [{ p: 8, n: 4 }, { p: 16, n: 4 }, { p: 24, n: 4 }];

  const DOT = `radial-gradient(circle, #f6e8bc 0 30%, #1a1209 33% 50%, ${GOLD} 53% 62%, transparent 65%)`;
  const LONG = `calc(${OS} * 2.1)`;
  const diag = (c) => `linear-gradient(${c === 'tl' || c === 'br' ? '45deg' : '135deg'}, transparent calc(50% - .8px), ${LIGHT} calc(50% - .8px) calc(50% + .8px), transparent calc(50% + .8px))`;
  const arcCenter = { tl: '0 0', tr: '100% 0', bl: '0 100%', br: '100% 100%' };
  const chamfer = (c) => `linear-gradient(${c === 'tl' ? '135deg' : '315deg'}, #0b0806 0 calc(50% - 1.6px), ${LIGHT} calc(50% - 1.6px) 50%, transparent 50%)`;

  // ---- tur 5: oyunun kimligi (kor, ocak, tac, fener, el yazmasi); SVG tek renk fildisi, 1 birim = 1 yerel px ----
  const COL = '#f6e8bc';
  const svgImg = (vw, vh, body, tf) => 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + vw + ' ' + vh + "'><g fill='none' stroke='" + COL + "' stroke-width='SW' stroke-linecap='round' stroke-linejoin='round'" + (tf ? " transform='" + tf + "'" : '') + '>' + body + '</g></svg>') + '")';
  const FILL = "fill='" + COL + "' stroke='none'";
  const tear = (cx, cy, k) => "<path " + FILL + " d='M" + cx + ' ' + (cy - 2 * k) + ' C' + (cx + 1.2 * k) + ' ' + (cy - 0.6 * k) + ' ' + (cx + k) + ' ' + (cy + k) + ' ' + cx + ' ' + (cy + k) + ' C' + (cx - k) + ' ' + (cy + k) + ' ' + (cx - 1.2 * k) + ' ' + (cy - 0.6 * k) + ' ' + cx + ' ' + (cy - 2 * k) + "Z'/>";
  const EMBER = "M8 13 C3.5 13 3 8.5 6 6 C7.5 4.5 7.5 3 7.2 1 C11.5 3.5 13 7 12.5 9.5 C12 11.8 10.5 13 8 13Z";
  // make(ph) -> { w, h, body, tl:[dx,dy], br:[dx,dy] }; mode 'rot' = sag alt kose 180 derece doner, 'up' = sag alt dik kalir (aynalanir, kenar ustunde durur)
  const build = (m, mode, ph) => {
    const sw = ph ? 3.4 : 1.5;
    const mk = (tf) => svgImg(m.w, m.h, m.body, tf).split('SW').join(String(sw)).split('stroke-width%3D%27SW%27').join('stroke-width%3D%27' + sw + '%27');
    const rot = 'rotate(180 ' + m.w / 2 + ' ' + m.h / 2 + ')';
    const mir = 'translate(' + m.w + ' 0) scale(-1 1)';
    const brPos = mode === 'rot' ? m.tl : m.br;
    return [L('tl', mk(''), m.w + 'px', m.h + 'px', m.tl[0] + 'px', m.tl[1] + 'px'), L('br', mk(mode === 'rot' ? rot : mir), m.w + 'px', m.h + 'px', brPos[0] + 'px', brPos[1] + 'px')];
  };
  const PV = (n, t, d, mode, make) => ({ n, t, place: '2 opposite (top-left + bottom-right)', d, layers: () => build(make(false), mode, false), phLayers: () => build(make(true), mode, true) });
  const VARIANTS = [
    { n: 'v01', t: 'Rivet dots', place: '4 corners', d: 'small filled gold rivet on each corner', layers: () => ALL4.map((c) => L(c, DOT, OS, OS, half(OS), half(OS))) },
    { n: 'v02', t: 'Corner brackets', place: '4 corners', d: 'thin L brackets hugging each corner from outside', layers: () => ALL4.flatMap((c) => [L(c, flat(GOLD), LONG, T, '-4px', '-4px'), L(c, flat(GOLD), T, LONG, '-4px', '-4px')]) },
    { n: 'v03', t: 'Chamfer', place: '2 opposite (top-left + bottom-right)', d: 'cut-off corner with a gold diagonal edge', layers: () => OPP.map((c) => L(c, chamfer(c), `calc(${OS} * 1.2)`, `calc(${OS} * 1.2)`, '-1px', '-1px')) },
    { n: 'v04', t: 'Quarter arcs', place: '4 corners', d: 'small concave quarter-circle notch in each corner', layers: () => ALL4.map((c) => L(c, `radial-gradient(circle at ${arcCenter[c]}, #0b0806 0 calc(${OS} - ${T}), ${GOLD} calc(${OS} - ${T}) ${OS}, transparent calc(${OS} + .5px))`, OS, OS, '-1px', '-1px')) },
    { n: 'v05', t: 'Triple dots (reference)', place: '2 opposite (top-left + bottom-right)', d: 'three dots along the edge from the corner', layers: () => OPP.flatMap((c) => dots(c, 'h', edge3)) },
    { n: 'v06', t: 'Cross ticks', place: '4 corners', d: 'thin diagonal slash crossing each corner', layers: () => ALL4.map((c) => L(c, diag(c), `calc(${OS} * 1.15)`, `calc(${OS} * 1.15)`, half(`calc(${OS} * 1.15)`), half(`calc(${OS} * 1.15)`))) },
    {
      n: 'v07', t: 'Plus marks', place: '4 corners', d: 'small + mark centred on each corner',
      layers: () => ALL4.flatMap((c) => [L(c, flat(LIGHT), OS, `max(1px, calc(.1 * ${OS}))`, half(OS), `calc(max(1px, calc(.1 * ${OS})) / -2)`), L(c, flat(LIGHT), `max(1px, calc(.1 * ${OS}))`, OS, `calc(max(1px, calc(.1 * ${OS})) / -2)`, half(OS))]),
    },
    { n: 'v08', t: 'Ember flames', place: '2 opposite (top-left + bottom-right)', d: 'tiny ember flame (Hearth theme) on the corner', layers: () => OPP.map((c) => L(c, FLAME, `calc(${OS} * 1.5)`, `calc(${OS} * 2)`, `calc(${OS} * -.75)`, `calc(${OS} * -1.05)`)) },
    {
      n: 'v09', t: 'Square nails', place: '4 corners', d: 'small upright square nail head on each corner',
      layers: () => ALL4.flatMap((c) => { const N = `calc(${OS} * .6)`; return [L(c, flat('#1a1209'), `calc(${N} / 2)`, `calc(${N} / 2)`, `calc(${N} / -4)`, `calc(${N} / -4)`), L(c, 'linear-gradient(135deg,#f6e8bc,#b98f45)', N, N, half(N), half(N))]; }),
    },
    { n: 'v10', t: 'Heavy corners', place: '4 corners', d: 'short thickened inner corner strokes', layers: () => ALL4.flatMap((c) => [L(c, 'linear-gradient(90deg,#f0dca8,#c99a4e)', `calc(${OS} * 1.5)`, `max(3px, calc(.18 * ${OS}))`, '-1px', '-1px'), L(c, 'linear-gradient(180deg,#f0dca8,#c99a4e)', `max(3px, calc(.18 * ${OS}))`, `calc(${OS} * 1.5)`, '-1px', '-1px')]) },
    // ---- tur 2: V05 ailesi ----
    { n: 'w01', t: 'Two dots', place: '2 opposite (top-left + bottom-right)', d: 'just two slightly larger dots on the edge', layers: () => OPP.flatMap((c) => dots(c, 'h', [{ p: 9, n: 5 }, { p: 19, n: 5 }])) },
    { n: 'w02', t: 'Four dots', place: '2 opposite (top-left + bottom-right)', d: 'four tight dots on the edge', layers: () => OPP.flatMap((c) => dots(c, 'h', [{ p: 7, n: 4 }, { p: 14, n: 4 }, { p: 21, n: 4 }, { p: 28, n: 4 }])) },
    { n: 'w03', t: 'Fading five', place: '2 opposite (top-left + bottom-right)', d: 'five dots shrinking away from the corner', layers: () => OPP.flatMap((c) => dots(c, 'h', [{ p: 6, n: 6 }, { p: 16, n: 5 }, { p: 25, n: 4.4 }, { p: 32, n: 3.8 }, { p: 38, n: 3.4 }])) },
    {
      n: 'w04', t: 'L layout', place: '2 opposite (top-left + bottom-right)', d: 'bigger corner dot plus one dot along each edge',
      layers: () => OPP.flatMap((c) => [...dots(c, 'h', [{ p: 14, n: 4 }]), ...dots(c, 'v', [{ p: 14, n: 4 }]), L(c, dotImg(LIGHT), dsz(6), dsz(6), half(dsz(6)), half(dsz(6)))]),
    },
    {
      n: 'w05', t: 'Dash dot dot', place: '2 opposite (top-left + bottom-right)', d: 'short bright dash then two dots',
      layers: () => OPP.flatMap((c) => [...dots(c, 'h', [{ p: 26, n: 4 }, { p: 35, n: 4 }]), L(c, flat(LIGHT), '14px', `max(2px, var(--T))`, '5px', 'calc(max(2px, var(--T)) / -2 + .5px)')]),
    },
    { n: 'w06', t: 'Crowding dots', place: '2 opposite (top-left + bottom-right)', d: 'dots get denser toward the corner', layers: () => OPP.flatMap((c) => dots(c, 'h', [{ p: 3, n: 3.6 }, { p: 8.5, n: 3.6 }, { p: 15, n: 3.6 }, { p: 23, n: 3.6 }])) },
    { n: 'w07', t: 'Four-corner triples', place: '4 corners', d: 'three small dots at every corner', layers: () => ALL4.flatMap((c) => dots(c, 'h', [{ p: 6, n: 3.6 }, { p: 12, n: 3.6 }, { p: 18, n: 3.6 }])) },
    { n: 'w08', t: 'Top corners only', place: '2 top corners', d: 'three dots at each top corner, bottom stays clean', layers: () => TOP2.flatMap((c) => dots(c, 'h', edge3)) },
    { n: 'w09', t: 'Ivory inside', place: '2 opposite (top-left + bottom-right)', d: 'pale ivory dots sitting just inside the edge', layers: () => OPP.flatMap((c) => dots(c, 'h', [{ p: 8, n: 4, col: IVORY, off: 4 }, { p: 16, n: 4, col: IVORY, off: 4 }, { p: 24, n: 4, col: IVORY, off: 4 }])) },
    { n: 'w10', t: 'Line gap', place: '2 opposite (top-left + bottom-right)', d: 'the edge line breaks and three dots take its place', layers: () => OPP.flatMap((c) => [...dots(c, 'h', edge3), L(c, flat('#0e0a07'), '30px', 'max(3px, calc(var(--T) + 1px))', '3px', 'calc(max(3px, calc(var(--T) + 1px)) / -2 + .5px)')]) },
    // ---- tur 3: MINIMAL (Omer: V05'in sevilen yani minimalligi) ----
    { n: 'm01', t: 'Lit corner', place: '2 opposite (top-left + bottom-right)', d: 'a short stretch of the frame line itself glows brighter at the corner (no new shape)', layers: () => OPP.flatMap((c) => [L(c, flat('#fff0c4'), '14px', T, '0px', '0px'), L(c, flat('#fff0c4'), T, '14px', '0px', '0px')]) },
    { n: 'm02', t: 'Hairline gap', place: '2 opposite (top-left + bottom-right)', d: 'the frame line is cut for a few pixels right at the corner', layers: () => OPP.flatMap((c) => [L(c, flat('#0d0907'), '7px', `calc(${T} + 1px)`, '-1px', '-1px'), L(c, flat('#0d0907'), `calc(${T} + 1px)`, '7px', '-1px', '-1px')]) },
    { n: 'm03', t: 'Hair diagonal', place: '2 opposite (top-left + bottom-right)', d: 'one hairline diagonal running inward from the corner', layers: () => OPP.map((c) => L(c, `linear-gradient(45deg, transparent calc(50% - ${TH}), ${LIGHT} calc(50% - ${TH}) calc(50% + ${TH}), transparent calc(50% + ${TH}))`, '11px', '11px', '1px', '1px')) },
    { n: 'm04', t: 'Overshoot', place: '2 opposite (top-left + bottom-right)', d: 'both edge lines poke 4 px past the corner', layers: () => OPP.flatMap((c) => [L(c, flat(LIGHT), '4px', T, '-4px', '0px'), L(c, flat(LIGHT), T, '4px', '0px', '-4px')]) },
    { n: 'm05', t: 'Inner echo L', place: '2 opposite (top-left + bottom-right)', d: 'a tiny thin L just inside the corner echoes the frame', layers: () => OPP.flatMap((c) => [L(c, flat('rgba(217,178,106,.8)'), '9px', T, '3px', '3px'), L(c, flat('rgba(217,178,106,.8)'), T, '9px', '3px', '3px')]) },
    { n: 'm06', t: 'Single ring', place: '2 opposite (top-left + bottom-right)', d: 'one small hollow ring sitting on the corner', layers: () => OPP.map((c) => L(c, `radial-gradient(circle, #0b0806 0 36%, ${LIGHT} 40% 62%, transparent 66%)`, dsz(7), dsz(7), half(dsz(7)), half(dsz(7)))) },
    { n: 'm07', t: 'Rounded corner', place: '2 opposite (top-left + bottom-right)', d: 'the corner itself rounds off with a hairline arc', layers: () => OPP.map((c) => L(c, `radial-gradient(circle at ${c === 'tl' ? '100% 100%' : '0 0'}, transparent 0 calc(var(--os) * .75 - ${T}), ${GOLD} calc(var(--os) * .75 - ${T}) calc(var(--os) * .75), #0b0806 calc(var(--os) * .75))`, 'calc(var(--os) * .75)', 'calc(var(--os) * .75)', '-1px', '-1px')) },
    { n: 'm08', t: 'Near-corner dash', place: '2 opposite (top-left + bottom-right)', d: 'one short bright dash on the edge, a little away from the corner', layers: () => OPP.map((c) => L(c, flat(LIGHT), '9px', `calc(${T} * 1.6)`, '12px', `calc(${T} * -.3)`)) },
    { n: 'm09', t: 'Inward tick', place: '2 opposite (top-left + bottom-right)', d: 'one tiny perpendicular tick stepping inward from the edge', layers: () => OPP.map((c) => L(c, flat(LIGHT), T, '5px', '12px', '0px')) },
    { n: 'm10', t: 'Ivory fade', place: '2 opposite (top-left + bottom-right)', d: 'the gold frame line fades to ivory toward the corner', layers: () => OPP.flatMap((c) => [L(c, `linear-gradient(${c === 'tl' ? 90 : 270}deg, #fbf3d8, rgba(251,243,216,0))`, '28px', T, '0px', '0px'), L(c, `linear-gradient(${c === 'tl' ? 180 : 0}deg, #fbf3d8, rgba(251,243,216,0))`, T, '28px', '0px', '0px')]) },
    // ---- tur 4: minimal AMA gorunur (V05 ile ayni agirlik; uzun eksen 20-32 px, kalinlik >= V05 noktasi) ----
    { n: 'n01', t: 'Bright long corner', place: '2 opposite (top-left + bottom-right)', d: 'both edges glow bright ivory for 26 px from the corner, thicker than the frame line', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '26px', TK, '-1px', '-1px'), L(c, flat(BR), TK, '26px', '-1px', '-1px')]) },
    { n: 'n02', t: 'Double dash', place: '2 opposite (top-left + bottom-right)', d: 'two short parallel dashes on the top / bottom edge', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '24px', TK, '3px', '-1px'), L(c, flat(BR), '24px', TK, '3px', '5px')]) },
    { n: 'n03', t: 'Heavy diagonal', place: '2 opposite (top-left + bottom-right)', d: 'one short bold diagonal running inward from the corner', layers: () => OPP.map((c) => L(c, `linear-gradient(45deg, transparent calc(50% - 1.5px), ${BR} calc(50% - 1.5px) calc(50% + 1.5px), transparent calc(50% + 1.5px))`, '22px', '22px', '0px', '0px')) },
    { n: 'n04', t: 'Three dashes', place: '2 opposite (top-left + bottom-right)', d: 'three short bright dashes on the edge (dashes instead of dots)', layers: () => OPP.flatMap((c) => [4, 15, 26].map((p) => L(c, flat(BR), '7px', TK, `${p}px`, '-1px'))) },
    { n: 'n05', t: 'Dash and dot', place: '2 opposite (top-left + bottom-right)', d: 'one longer dash then a single dot', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '18px', TK, '3px', '-1px'), ...dots(c, 'h', [{ p: 26, n: 5, col: BR }])]) },
    { n: 'n06', t: 'Corner block', place: '2 opposite (top-left + bottom-right)', d: 'short bold L block hugging the corner', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '22px', `calc(${TK} + 1px)`, '-2px', '-2px'), L(c, flat(BR), `calc(${TK} + 1px)`, '22px', '-2px', '-2px')]) },
    { n: 'n07', t: 'Bold overshoot', place: '2 opposite (top-left + bottom-right)', d: 'edge lines run past the corner by 7 px and stay bright 18 px along', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '25px', TK, '-7px', '-1px'), L(c, flat(BR), TK, '25px', '-1px', '-7px')]) },
    { n: 'n08', t: 'Half disc', place: '2 opposite (top-left + bottom-right)', d: 'small filled half-disc sitting on the edge', layers: () => OPP.map((c) => L(c, `radial-gradient(circle at ${c === 'tl' ? '50% 0' : '50% 100%'}, ${BR} 0 calc(50% - .5px), transparent 50%)`, '24px', '12px', '4px', '-1px')) },
    { n: 'n09', t: 'Stair step', place: '2 opposite (top-left + bottom-right)', d: 'bright edge line that steps inward once', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '16px', TK, '-1px', '-1px'), L(c, flat(BR), TK, '7px', '15px', '-1px'), L(c, flat(BR), '16px', TK, '15px', '5px')]) },
    { n: 'n10', t: 'Heavy plus hair', place: '2 opposite (top-left + bottom-right)', d: 'thick short segment on the edge continued by a hairline', layers: () => OPP.flatMap((c) => [L(c, flat(BR), '16px', `calc(${TK} + 1px)`, '-1px', '-2px'), L(c, flat('rgba(240,220,168,.95)'), '30px', '1.5px', '-1px', '-1px'), L(c, flat(BR), `calc(${TK} + 1px)`, '16px', '-2px', '-1px'), L(c, flat('rgba(240,220,168,.95)'), '1.5px', '30px', '-1px', '-1px')]) },
    // ---- tur 5: kimlikli, minimal, gorunur ----
    PV('p01', 'Ember and spark', 'a slim ember teardrop with one spark beside it, rising from the edge', 'up', () => ({ w: 26, h: 14, body: '<path ' + FILL + " d='" + EMBER + "'/><circle " + FILL + " cx='20' cy='9' r='1.8'/>", tl: [4, -13], br: [4, -1] })),
    PV('p02', 'Crown teeth', 'three tiny crown points rising from the edge (Hearthcrown silhouette)', 'rot', () => ({ w: 28, h: 13, body: "<path d='M2 12 L6 4 L10 12 L14 2 L18 12 L22 4 L26 12'/>", tl: [2, -12] })),
    PV('p03', 'Hearth mouth', 'a small hearth arch on a base line with an ember inside (oven mouth)', 'up', () => ({ w: 28, h: 16, body: "<path d='M2 15 H26 M6 15 V11.5 A8 7.5 0 0 1 22 11.5 V15'/>" + tear(14, 12.5, 2.2), tl: [0, -15], br: [0, -1] })),
    PV('p04', 'Curled serif', 'the edge line ends in a curled serif like a Cinzel letter foot', 'rot', () => ({ w: 28, h: 14, body: "<path d='M27 3 H11 C4 3 2.5 9.5 6.5 11 C9.5 12 11.5 9.5 9.5 7.5'/>", tl: [0, -2] })),
    PV('p05', 'Hanging lantern', 'a tiny lantern on a ring and chain hanging from the edge, ember inside', 'rot', () => ({ w: 16, h: 28, body: "<circle cx='8' cy='3.2' r='2.4'/><path d='M8 5.6 V9 M4.5 9 H11.5 L12.8 21 H3.2 Z'/>" + tear(8, 16, 2.1), tl: [8, -2] })),
    PV('p06', 'Brush flourish', 'one thin manuscript flourish stroke curling off the corner', 'rot', () => ({ w: 28, h: 14, body: "<path d='M2 12 C2 5 9 2 13 6 C16.5 9.5 21 8 26 3'/>", tl: [0, -7] })),
    PV('p07', 'Ember bud', 'three tiny ember drops fanned from one stem, like a heraldic bud', 'up', () => ({ w: 24, h: 17, body: "<path d='M12 16 V11'/>" + tear(12, 7, 3.2) + "<g transform='rotate(-38 12 16)'>" + tear(12, 8.5, 2.2) + "</g><g transform='rotate(38 12 16)'>" + tear(12, 8.5, 2.2) + '</g>', tl: [3, -16], br: [3, -1] })),
    PV('p08', 'Twin embers', 'one large and one small ember drop, leaning together', 'up', () => ({ w: 26, h: 16, body: "<g transform='rotate(-10 8 13)'><path " + FILL + " d='" + EMBER + "'/></g><path " + FILL + " transform='translate(14 6) rotate(-10 4 7) scale(.62)' d='" + EMBER + "'/>", tl: [3, -15], br: [3, -1] })),
    PV('p09', 'Crown spike', 'one slim crown spike with an ember above its tip', 'up', () => ({ w: 14, h: 24, body: "<path " + FILL + " d='M7 6.5 L10 23 H4 Z'/><circle " + FILL + " cx='7' cy='2.6' r='2'/>", tl: [8, -23], br: [8, -1] })),
    PV('p10', 'Rising sparks', 'three embers shrinking as they rise from the corner', 'rot', () => ({ w: 26, h: 26, body: tear(5, 21, 3.4) + tear(12.5, 13, 2.5) + tear(19.5, 6, 1.8), tl: [-3, -23] })),
  ];
  window.__VARIANTS = VARIANTS;

  const emit = (v, ls, pre) => {
    const pos = ls.map((l) => `${l.c[1] === 'l' ? 'left' : 'right'} calc(${l.dx} + var(--ov)) ${l.c[0] === 't' ? 'top' : 'bottom'} calc(${l.dy} + var(--ov))`).join(',');
    const size = ls.map((l) => `${l.w} ${l.h}`).join(',');
    const img = ls.map((l) => l.img).join(',');
    const before = HOSTS.map((h) => `${pre}.${v.n} ${h}::before`).join(',');
    const after = HOSTS.map((h) => `${pre}.${v.n} ${h}::after`).join(',');
    return `${before}{all:unset;content:'';position:absolute;inset:calc(-1px - var(--ov));pointer-events:none;z-index:3;background-image:${img};background-position:${pos};background-size:${size};background-repeat:no-repeat}
${after}{all:unset;content:none}`;
  };
  const css = VARIANTS.map((v) => emit(v, v.layers(), '') + (v.phLayers ? String.fromCharCode(10) + emit(v, v.phLayers(), 'html.short ') : '')).join(String.fromCharCode(10));
  document.getElementById('vstyle').textContent = css;

  // ---------- sayfa ----------
  const raw = location.hash.replace(/^#/, '').split('&');
  const mode = raw[0] || 'all1';
  const opt = new URLSearchParams(raw.slice(1).join('&'));
  const zq = opt.get('z') || '';
  const phone = zq === 'ph' || zq === 'ph3';
  const K = zq === 'ph3' ? 0.3611 * 3 : 0.3611;
  document.documentElement.classList.toggle('short', phone);
  document.documentElement.classList.toggle('compact', phone);
  document.body.classList.toggle('clean', opt.has('clean'));
  const sk = (cls, key, ico, nm, chips) => `<div class="bp ${cls}"><span class="bp-key">${key}</span><div class="bp-ico"><img class="bh-ico" src="${I}sk-${ico}.webp" alt="" draggable="false"></div><span class="bp-nm">${nm}</span><div class="bp-chips">${chips}</div></div>`;
  const chip = (c, n, ico) => `<span class="bp-chip ${c}"><img class="bh-ico" src="${I}${ico}.webp" alt=""><b>${n}</b></span>`;
  const samples = () => `<div class="smps">
    <div class="bh-kit"><div class="bh-skills">${sk('sel', 1, 'venomedge', 'Venom Edge', '<span class="bp-chip free">Free</span>')}${sk('', 2, 'saltire', 'Saltire Cut', chip('', 9, 'st-mp') + chip('cd', 2, 'ui-cooldown'))}</div></div>
    <div class="el-panel corners pn"><h2 class="el-title">Guild Hall</h2><p>Saltmere is a city of two masters, and every newcomer is asked which one they serve.</p></div>
    <div class="bh-kit"><div class="bt" style="--ac:#e8e2d0"><div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(${I}sk-venomedge.webp)"></span><div class="bt-ht"><div class="bt-kind">Skill</div><div class="bt-title">Venom Edge</div></div></div><div class="bt-meta"><span class="bt-chip">Single Target</span><span class="bt-chip free">Free</span></div><div class="bt-div"></div><div class="bt-body"><div class="bt-ln"><span class="dia"></span><div class="tx"><span class="k" style="color:#e8e2d0">Damage</span> <span class="n">100%</span> DEX (<span class="n">26</span>)</div></div><div class="bt-ln"><span class="dia"></span><div class="tx"><span class="k">Wound</span> <span class="n">2</span> turns</div></div></div></div></div>
  </div>`;
  const row = (cls, name, sub) => `<div class="lbl">${name}<small>${sub}</small></div><div class="${cls}">${samples()}</div>`;
  const byN = (n) => VARIANTS.find((v) => v.n === n);
  const label = (v) => `${v.n.toUpperCase().replace('V', 'V').replace('W', 'W')} · ${v.t}`;
  const vrow = (v) => row(v.n, label(v), `${v.place}: ${v.d}`);
  const today = row('', 'Today · diamonds', 'top-left + bottom-right diamond (current)');
  const GROUPS = {
    all1: { rows: [null, 'v01', 'v02', 'v03', 'v04', 'v05'], phone: [null, 'v01', 'v02', 'v03', 'v04', 'v05'] },
    all2: { rows: ['v06', 'v07', 'v08', 'v09', 'v10'], phone: ['v06', 'v07', 'v08', 'v09', 'v10'] },
    t2a: { rows: ['v05', 'w01', 'w02', 'w03', 'w04', 'w05'], phone: ['v05', 'w01', 'w02', 'w03', 'w04', 'w05'] },
    t2b: { rows: ['w06', 'w07', 'w08', 'w09', 'w10'], phone: ['w06', 'w07', 'w08', 'w09', 'w10'] },
    t3a: { rows: ['v05', 'm01', 'm02', 'm03', 'm04', 'm05'], phone: ['v05', 'm01', 'm02', 'm03', 'm04', 'm05'] },
    t4a: { rows: ['v05', 'n01', 'n02', 'n03', 'n04', 'n05'], phone: ['v05', 'n01', 'n02', 'n03', 'n04', 'n05'] },
    t4b: { rows: ['n06', 'n07', 'n08', 'n09', 'n10'], phone: ['n06', 'n07', 'n08', 'n09', 'n10'] },
    p5a: { rows: ['v05', 'p01', 'p02', 'p03', 'p04', 'p05'], phone: ['v05', 'p01', 'p02', 'p03', 'p04', 'p05'] },
    p5b: { rows: ['p06', 'p07', 'p08', 'p09', 'p10'], phone: ['p06', 'p07', 'p08', 'p09', 'p10'] },
    t3b: { rows: ['m06', 'm07', 'm08', 'm09', 'm10'], phone: ['m06', 'm07', 'm08', 'm09', 'm10'] },
  };
  const page = document.getElementById('page');
  page.className = 'kose' + (phone ? ' ph' : '');
  if (phone) page.style.setProperty('--bh-inv', String(1 / K));
  const g = GROUPS[mode];
  if (phone) {
    // gercek telefon olcegi: HUD / pencere 0,361; 1 gercek piksel = 2,77 birim
    const names = g ? g.phone : [mode];
    const cells = names.map((n) => [n ? byN(n).n.toUpperCase() : 'NOW', n || '']);
    const st = document.createElement('style');
    const cw = Math.round(1000 * K);
    st.textContent = `.phgrid{display:grid;grid-template-columns:repeat(${zq === 'ph3' ? 1 : 2},max-content);gap:${zq === 'ph3' ? 14 : 8}px 14px}.phc{display:flex;align-items:center;gap:6px}.phl{font:600 9px Cinzel,serif;color:#f3d999;width:26px}.phw{position:relative}body{padding:6px 6px}`;
    document.head.appendChild(st);
    page.innerHTML = `<div class="phgrid">${cells.map(([lab, cls]) => `<div class="phc"><div class="phl">${zq === 'ph3' ? '' : lab}</div><div class="phw" data-w="${cw}"><div class="${cls}" style="transform:scale(${K});transform-origin:0 0;width:max-content">${samples()}</div></div></div>`).join('')}</div>`;
    // kutu boyu: olcekli bilesenin gercek (donusturulmus) boyuna gore sar
    requestAnimationFrame(() => document.querySelectorAll('.phw').forEach((w) => { const s = w.firstElementChild.getBoundingClientRect(); w.style.width = s.width + 'px'; w.style.height = s.height + 'px'; }));
  } else {
    let body;
    if (g) body = g.rows.map((n) => (n ? vrow(byN(n)) : today)).join('');
    else { const v = byN(mode) || VARIANTS[0]; document.body.classList.add('one'); body = vrow(v); }
    page.innerHTML = `<div class="grid">${body}</div>`;
  }
  document.querySelectorAll('#mk-strip a[data-z]').forEach((a) => { a.classList.toggle('on', (a.dataset.z === 'ph') === phone); a.href = `#${mode}${a.dataset.z === 'ph' ? '&z=ph' : ''}`; });
  document.querySelectorAll('#mk-strip a:not([data-z])').forEach((a) => { a.href = `${a.getAttribute('href')}${phone ? '&z=ph' : ''}`; });
  window.addEventListener('hashchange', () => location.reload());

  // ---------- oran olcumu: sus boyu (kose kumesi, gercek px) / kutu genisligi ----------
  window.__measure = () => {
    const holder = phone ? document.querySelector('.phw > div') : page;
    const probe = (style) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;${style}`; holder.appendChild(d); const r = d.getBoundingClientRect(); d.remove(); return r; };
    const px = (v, prop) => { const r = probe(prop === 'x' ? `width:${v}` : `height:${v}`); return prop === 'x' ? r.width : r.height; };
    const pos = (v) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;left:${v};top:0;width:0;height:0;visibility:hidden`; holder.appendChild(d); const o = d.getBoundingClientRect().left - holder.getBoundingClientRect().left; d.remove(); return o; };
    const hostW = {};
    const grid = document.querySelector('.phgrid, .grid');
    const sampleRoot = grid || page;
    const w = (sel) => { const e = sampleRoot.querySelector(sel); return e ? e.getBoundingClientRect().width : 0; };
    hostW['.bp-ico'] = w('.bp-ico');
    hostW['.el-panel'] = w('.el-panel');
    hostW['.bt'] = w('.bt');
    const out = {};
    for (const v of VARIANTS) {
      const ls = v.layers().filter((l) => l.c === 'tl' || l.c === 'tr');
      const byC = { tl: [], tr: [] };
      for (const l of ls) byC[l.c].push(l);
      let ext = 0;
      for (const c of ['tl', 'tr']) {
        const arr = byC[c];
        if (!arr.length) continue;
        // Cizgi kalinligi tabani orani bozmasin: yalniz katmanin UZUN ekseni sayilir (kare katmanlar iki eksen)
        const info = arr.map((l) => ({ w: px(l.w, 'x'), h: px(l.h, 'y'), ax: pos(l.dx), ay: pos(l.dy) }));
        const xr = info.filter((q) => q.w >= q.h * 0.99).map((q) => [q.ax, q.ax + q.w]);
        const yr = info.filter((q) => q.h >= q.w * 0.99).map((q) => [q.ay, q.ay + q.h]);
        const span = (r) => (r.length ? Math.max(...r.map((q) => q[1])) - Math.min(...r.map((q) => q[0])) : 0);
        ext = Math.max(ext, span(xr), span(yr));
      }
      out[v.n] = { ext: +ext.toFixed(2), plate: +(ext / hostW['.bp-ico']).toFixed(3), panel: +(ext / hostW['.el-panel']).toFixed(3), tip: +(ext / hostW['.bt']).toFixed(3) };
    }
    return { hostW, out };
  };
})();
