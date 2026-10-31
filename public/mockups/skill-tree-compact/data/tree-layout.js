/* SKILL AGACI (Gear taslagi): yerlesim hesabi (mockup, oyun kodu DEGIL). Saf fonksiyon, DOM yok. Tarayicida window.GL, Node'da require.
   Moments taslaginin yerlesimi (tier bandi TEK sefer en ustte, tum satirlarda ayni kolonlar, ult + sekli) parametreli:
   cfg = { colW, laneH, hdr, padX, sz:{F,E,B,N,V}, lblH (0 = dugum adi yok), ultD, coreSz }. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(require('./core.js')); else root.GL = f(root.SMM); })(this, function (MC) {
  const COLS = 8, NROWS = 4, ULT = MC.ULT;

  /* tur (F E B N V) -> yari boy; etiket yonu: Notable / Evolve ust seritte yukari, altta asagi (lane 0 asagi) */
  const labelSide = (nd) => (nd.kind === 'N' || nd.kind === 'V' ? (nd.lane < 0 ? 'up' : 'dn') : null);
  function ext(nd, cfg) {
    const half = cfg.sz[nd.kind] / 2, s = cfg.lblH ? labelSide(nd) : null;
    return [half + (s === 'up' ? cfg.lblH + 6 : 0), half + (s === 'dn' ? cfg.lblH + (nd.kind === 'V' ? 12 : 6) : nd.kind === 'F' ? 14 : 0)];
  }
  function tierRanges(tpl) {
    const m = {}; tpl.forEach((n) => { const t = m[n.tier] || (m[n.tier] = { tier: n.tier, c0: n.col, c1: n.col }); t.c0 = Math.min(t.c0, n.col); t.c1 = Math.max(t.c1, n.col); });
    return Object.keys(m).map((k) => m[k]).sort((a, b) => a.c0 - b.c0);
  }
  /* kolon genisligi: kullanilabilir genislikten (etiket sutunu ve kenar bosluklari dusulur) sinirlar icinde */
  function pickColW(avail, labW, cfg) {
    const raw = Math.floor((avail - labW - 2 * cfg.padX) / COLS);
    return Math.max(cfg.colMin, Math.min(cfg.colMax, raw));
  }
  function build(cfg) {
    const tpl = MC.NODES.filter((n) => n.i === 0);
    let lo = 1e9, hi = -1e9;
    tpl.forEach((n) => { const [a, b] = ext(n, cfg); lo = Math.min(lo, n.lane * cfg.laneH - a); hi = Math.max(hi, n.lane * cfg.laneH + b); });
    const padT = cfg.padV, padB = cfg.padV, rowH = Math.ceil(hi - lo + padT + padB), cy0 = padT - lo;
    const xc = (c) => cfg.padX + cfg.colW * (c + 0.5);
    const L = { cfg, tpl, xc, rows: [], pos: {}, W: cfg.padX * 2 + cfg.colW * COLS, H: 0, tiers: tierRanges(tpl), rowH };
    let y = cfg.hdr;
    for (let i = 0; i < NROWS; i++) {
      const row = { i, top: y, h: rowH, cy: y + cy0 }; L.rows.push(row);
      tpl.forEach((n) => { L.pos[i + '.' + n.id] = { x: xc(n.col), y: row.cy + n.lane * cfg.laneH }; });
      y += rowH;
    }
    L.H = y + 4;
    /* ult: + sekli (3 dugum / kol); ortada ult ikonu */
    const D = cfg.ultD, half = cfg.sz.N / 2, M = half + (cfg.lblH ? 22 : 12), R = 3 * D + M, UW = 2 * R, UH = 2 * R, cx = R, cy = R;
    const dirs = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] };
    L.ult = { W: UW, H: UH, cx, cy, D, pos: {} };
    MC.ARMS.forEach((arm) => [1, 2, 3].forEach((s) => { L.ult.pos[ULT + '.' + arm + s] = { x: cx + dirs[arm][0] * D * s, y: cy + dirs[arm][1] * D * s, arm, s }; }));
    return L;
  }
  const link = (P, Q) => (P.y === Q.y || P.x === Q.x ? `M${P.x},${P.y} L${Q.x},${Q.y}` : `M${P.x},${P.y} C${(P.x + Q.x) / 2},${P.y} ${(P.x + Q.x) / 2},${Q.y} ${Q.x},${Q.y}`);

  /* ayarlar: kucuk (v1 sag sayfa), orta (v2 calisma paneli + v3 sekme), telefon (dokunma: hedefler >= 44 px, tuval kendi icinde yatay kayar) */
  const PRESETS = {
    s: { name: 's', laneH: 26, hdr: 30, padX: 6, padV: 4, sz: { F: 20, E: 20, B: 22, N: 28, V: 40 }, lblH: 0, ultD: 28, coreSz: 40, colMin: 60, colMax: 96, labW: 56, hit: 24 },
    m: { name: 'm', laneH: 66, hdr: 46, padX: 14, padV: 8, sz: { F: 36, E: 30, B: 44, N: 54, V: 70 }, lblH: 28, ultD: 74, coreSz: 78, colMin: 104, colMax: 140, labW: 196, hit: 44 },
    l: { name: 'l', laneH: 30, hdr: 38, padX: 10, padV: 6, sz: { F: 28, E: 26, B: 32, N: 42, V: 56 }, lblH: 14, ultD: 50, coreSz: 62, colMin: 96, colMax: 132, labW: 210, hit: 36 },
    p: { name: 'p', laneH: 46, hdr: 38, padX: 6, padV: 6, sz: { F: 28, E: 28, B: 32, N: 42, V: 54 }, lblH: 14, ultD: 44, coreSz: 52, colMin: 54, colMax: 54, labW: 48, hit: 44 },
  };
  return { COLS, NROWS, ULT, ext, labelSide, pickColW, build, link, PRESETS };
});
