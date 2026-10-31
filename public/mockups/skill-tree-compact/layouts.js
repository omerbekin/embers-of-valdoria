/* SKILL AGACI SIKISTIRMA taslagi: 5 YAPI (mockup, oyun kodu DEGIL). Her yerlesim (W, H, sh) -> { html, vars } uretir; hepsi gercek dugum isaretlemesini (views.js > nodeHTML),
   gercek kural motorunu (data/core.js + tree-logic.js) ve gercek tier / ult kurallarini kullanir. Mutlak koordinat: govde (.cp-body) W x H px.
   Tarayicida window.CL. Oyun metinleri Ingilizce. */
(function (root) {
  'use strict';
  const V = root.GV, MC = V.MC, GT = V.GT, GL = root.GL, ROWS = V.ROWS, A = V.A, esc = V.esc;
  const CV = { v: 'v1', ult: false, sel: 1, view: 'skills' };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const px = (n) => Math.round(n * 10) / 10;

  /* ---------- kucuk uretici parcalar ---------- */
  const sizes = (k, hit) => { const s = { F: 30, E: 26, B: 34, N: 40, V: 54 }; return `--sF:${px(s.F * k)}px;--sE:${px(s.E * k)}px;--sB:${px(s.B * k)}px;--sN:${px(s.N * k)}px;--sV:${px(s.V * k)}px;--hit:${px(hit)}px;`; };
  const vflow = (a, b) => (a.x === b.x || a.y === b.y ? `M${px(a.x)},${px(a.y)} L${px(b.x)},${px(b.y)}` : `M${px(a.x)},${px(a.y)} C${px(a.x)},${px((a.y + b.y) / 2)} ${px(b.x)},${px((a.y + b.y) / 2)} ${px(b.x)},${px(b.y)}`);
  const hflow = (a, b) => GL.link({ x: px(a.x), y: px(a.y) }, { x: px(b.x), y: px(b.y) });
  const autoflow = (a, b) => (Math.abs(b.y - a.y) > Math.abs(b.x - a.x) ? vflow(a, b) : hflow(a, b));
  const stubV = (p, h) => `M${px(p.x)},${px(p.y + h)} V${px(p.y + h + 9)} M${px(p.x - 6)},${px(p.y + h + 9)} H${px(p.x + 6)}`;
  const stubH = (p, h) => `M${px(p.x + h)},${px(p.y)} H${px(p.x + h + 10)} M${px(p.x + h + 10)},${px(p.y - 6)} V${px(p.y + 6)}`;
  const place = (html, x, y, w, h, cls, extra) => `<div class="${cls}" style="left:${px(x)}px;top:${px(y)}px;${w != null ? `width:${px(w)}px;` : ''}${h != null ? `height:${px(h)}px;` : ''}${extra || ''}"${''}>${html}</div>`;
  const tierChip = (t, x, y, w, h) => `<div class="gt-ts${t === 'E' ? ' evo' : ''}" data-tier="${t}" data-tn="${t}" style="left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px"><small></small><b>${V.PL}<span class="pt"></span><em></em></b></div>`;
  const band = (t, x, y, w, h) => `<div class="gt-tb" data-tier="${t}" style="left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px"></div>`;
  const KIND_TAG = (i) => (ROWS[i].pas ? 'Passive' : ROWS[i].ult ? 'Ultimate' : 'Skill');
  const PTS = (i) => (i === 4 ? `<span class="pts"><b data-pts="4">0</b><small>/ ${MC.ULT_MAX}</small></span>` : `<span class="pts"><b data-pts="${i}">0</b><small>pts</small></span>`);
  /* satir basligi: ikon + ad + etiket + (masaustunde) bedel cipleri + puan. mode: col | row | tall | mini */
  function head(i, mode, x, y, w, h) {
    const rr = ROWS[i], p = V.PLATE[i];
    const chips = mode !== 'mini' && p.chips ? `<span class="chips">${p.chips}</span>` : '';
    const tx = mode === 'mini' ? '' : `<span class="tx"><b class="nm">${esc(rr.name)}</b><i class="tg">${KIND_TAG(i)}</i></span>`;
    return `<div class="cp-sk ${mode}${rr.pas ? ' pas' : ''}${rr.ult ? ' ult' : ''}" data-tip="p:${i}" style="left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px"><span class="med"><img src="${A}${rr.ic}" alt="" draggable="false"></span>${tx}${chips}${PTS(i)}</div>`;
  }
  const armChip = (arm, x, y, w) => `<span class="cp-arm${w && w < 64 ? ' nar' : ''}" data-arm="${arm}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}"><i>${w && w < 64 ? MC.ARM_NAME[arm][0] : MC.ARM_NAME[arm]}</i><b>0 / 3</b></span>`;
  const lvTag = (key, x, y) => `<span class="gt-ulv" data-ulv="${key}" style="left:${px(x)}px;top:${px(y)}px">Lv ${MC.ULT_LV[+key.slice(-1) - 1]}</span>`;
  const core = (x, y, d) => `<div class="gt-ucore" data-tip="p:4" style="left:${px(x)}px;top:${px(y)}px;width:${px(d)}px;height:${px(d)}px"><span class="ud"></span><img src="${A}${ROWS[4].ic}" alt="${esc(ROWS[4].name)}"></div>`;
  const NCFG = { lblH: 0, q4: true };

  function Bld() {
    const o = { svg: '', nds: '', pos: {}, keys: [], flow: autoflow, stub: stubV };
    o.at = (key, x, y) => { o.pos[key] = { x, y }; o.keys.push(key); return o; };
    o.build = (hs) => {
      o.keys.forEach((key) => {
        const nd = MC.BY[key], p = o.pos[key];
        nd.req.forEach((term) => term.forEach((src) => { const a = o.pos[src]; if (a) o.svg += `<path class="${term.length > 1 ? 'alt' : ''}" data-a="${src}" data-b="${key}" d="${(o.flowFor || o.flow)(a, p, src, key)}"/>`; }));
        if (nd.kind === 'B') o.svg += `<path class="dead" data-b="${key}" data-dead="1" d="${o.stub(p, hs)}"/>`;
        o.nds += V.nodeHTML(key, p, NCFG);
      });
      return o;
    };
    return o;
  }
  const svgBox = (W, H, inner) => `<svg class="gt-lines" width="${px(W)}" height="${px(H)}" viewBox="0 0 ${px(W)} ${px(H)}">${inner}</svg>`;

  /* ================= V1: dikey sutunlar (her skill bir sutun, tier'lar asagi; ult en altta genis bant) ================= */
  function L1(W, H, sh) {
    const labW = sh ? 30 : 84, hh = sh ? 32 : 64, ultH = sh ? 66 : 124, cw = (W - labW) / 4, p = Math.min(96, (H - hh - ultH) / 6), k = clamp(p / 58, 0.42, 1);
    const yk = (n) => hh + p * (n + 0.5), b = Bld(); let tx = '', bands = '';
    for (let i = 0; i < 4; i++) {
      const x0 = labW + cw * i, c = x0 + cw / 2, at = (id, t, n) => b.at(i + '.' + id, x0 + cw * t, yk(n));
      at('f1', 0.2, 0); at('f2', 0.5, 0); at('f3', 0.8, 0); at('n0', 0.5, 1); at('r', 0.5, 2); at('ea', 0.25, 3); at('eb', 0.75, 3);
      at('ma', 0.125, 4); at('fa', 0.375, 4); at('fb', 0.625, 4); at('mb', 0.875, 4); at('v', 0.5, 5);
      tx += head(i, 'col', x0 + 2, 0, cw - 4, hh);
      if (i) tx += `<i class="cp-vsep" style="left:${px(x0)}px;top:0;height:${px(hh + p * 6)}px"></i>`;
    }
    [['I', 0, 1], ['II', 1, 1], ['III', 2, 2], ['IV', 4, 1], ['E', 5, 1]].forEach(([t, n0, n]) => { tx += tierChip(t, 0, hh + p * n0, labW, p * n); bands += band(t, labW, hh + p * n0, W - labW, p * n); });
    /* ult bandi */
    const y0 = H - ultH, ny = y0 + ultH * 0.62, usz = (sh ? 26 : 44);
    let ut = `<div class="cp-hr" style="top:${px(y0)}px"></div>` + core(labW / 2, y0 + ultH * 0.46, usz) + `<span class="cp-upts" style="left:${px(labW / 2)}px;top:${px(y0 + ultH * 0.46 + usz / 2 + (sh ? 6 : 9))}px"><b data-upts>0</b>/${MC.ULT_MAX}</span>`;
    MC.ARMS.forEach((arm, j) => {
      const x0 = labW + cw * j;
      ut += armChip(arm, x0 + cw / 2 - (sh ? 36 : 50), y0 + (sh ? 3 : 6), sh ? 72 : 100);
      [1, 2, 3].forEach((s) => { const x = x0 + cw * [0.2, 0.5, 0.8][s - 1]; b.at(MC.ULT + '.' + arm + s, x, ny); ut += lvTag(MC.ULT + '.' + arm + s, x, ny + (s === 3 ? 18 : 14) * (sh ? 0.8 : 1) + k * 8); });
    });
    b.build(14 * k);
    return { vars: sizes(k, clamp(p - 1, 20, 44)), html: `${bands}${svgBox(W, H, b.svg)}${tx}${ut}${b.nds}`, meta: { pitch: p } };
  }

  /* ================= V2: yatay seritler (her skill bir satir, dugumler sagda; ult sagda dar dikey panel) ================= */
  function L2(W, H, sh) {
    const labW = sh ? 96 : 184, uw = sh ? 160 : 220, g = 8, hdr = sh ? 18 : 26, nx = labW, nw = W - labW - uw - g, cw = nw / 8, rh = (H - hdr) / 4;
    const lane = Math.min(46, (rh * 0.9 - 26) / 3), k = clamp(lane / 30, 0.25, 1.1), b = Bld(); b.flow = hflow; b.stub = stubH; let tx = '', bands = '';
    for (let i = 0; i < 4; i++) {
      const cy = hdr + rh * (i + 0.5);
      MC.NODES.filter((n) => n.i === i).forEach((n) => b.at(n.key, nx + cw * (n.col + 0.5), cy + lane * n.lane));
      tx += head(i, 'row', 2, hdr + rh * i + 2, labW - 8, rh - 4) + `<i class="cp-hsep" style="left:0;width:${px(W - uw - g)}px;top:${px(hdr + rh * (i + 1))}px"></i>`;
    }
    [['I', 0, 3], ['II', 3, 1], ['III', 4, 2], ['IV', 6, 1], ['E', 7, 1]].forEach(([t, c0, n]) => { tx += tierChip(t, nx + cw * c0, 0, cw * n, hdr); bands += band(t, nx + cw * c0, 0, cw * n, hdr + rh * 4); });
    /* ult paneli */
    const ux = W - uw, cx0 = ux + uw / 2, usz = sh ? 30 : 46, colW = (uw - 8) / 4, cyc = hdr + 6 + usz / 2, ay = hdr + 6 + usz + (sh ? 22 : 30), pit = Math.min(100, (H - ay - (sh ? 14 : 22)) / 3);
    let ut = `<div class="cp-vr" style="left:${px(ux - g / 2)}px;top:0;height:${px(H)}px"></div>` + core(cx0, cyc, usz) + `<span class="cp-upts side" style="left:${px(cx0 + usz / 2 + 6)}px;top:${px(cyc)}px"><b data-upts>0</b>/${MC.ULT_MAX}</span>`;
    ut += `<span class="cp-uhd" style="left:${px(ux)}px;top:0;width:${px(uw)}px;height:${hdr}px">Ult tree</span>`;
    MC.ARMS.forEach((arm, j) => {
      const x = ux + 4 + colW * (j + 0.5);
      ut += armChip(arm, x - colW / 2, ay - (sh ? 20 : 26), colW);
      [1, 2, 3].forEach((s) => { const y = ay + pit * (s - 0.5) * (1); b.at(MC.ULT + '.' + arm + s, x, y); ut += lvTag(MC.ULT + '.' + arm + s, x, y + (s === 3 ? 22 : 17) * k * 0.9 + 4); });
      b.svg += `<path data-a="C" data-b="${MC.ULT}.${arm}1" d="${vflow({ x: cx0, y: cyc + usz * 0.4 }, { x, y: ay + pit * 0.5 })}"/>`;
    });
    b.flowFor = vflow; b.build(14 * k);
    return { vars: sizes(k, clamp(Math.min(lane, colW) - 1, 18, 44)), html: `${bands}${svgBox(W, H, b.svg)}${tx}${ut}${b.nds}`, meta: { pitch: lane, colW } };
  }

  /* ================= V3: secmeli (bir skill secilir, yalniz onun yukaridan asagi dali acilir; ulti ustte madalyon + acilir panel) ================= */
  const dotCls = (key, E) => { const st = GT.status(ST().lv, E, key), pd = ST().P[key] > 0 && MC.rk(ST().S, key) === 0, on = st.rank > 0; return `${on ? (pd ? 'pd' : 'on') : ''}${!on && ['tlk', 'xl', 'dir'].indexOf(st.st) >= 0 ? ' lk' : ''}`.trim(); };
  const ST = () => V.ST;
  function railHTML(sh) {
    const E = V.eff(), up = MC.ultSpent(E);
    const med = `<button type="button" class="cp-umed${CV.ult ? ' on' : ''}" data-a="ult:toggle" data-tip="p:4" aria-label="Ultimate tree"><span class="mi"><img src="${A}${ROWS[4].ic}" alt="" draggable="false"></span>${sh ? '' : `<span class="tx"><b>${esc(ROWS[4].name)}</b><i>Ult tree ${up} / ${MC.ULT_MAX}</i></span>`}<span class="bd">${up}</span></button>`;
    let cards = '';
    for (let i = 0; i < 4; i++) {
      const rr = ROWS[i], pts = MC.rowSpent(E, i), pend = pts - MC.rowSpent(ST().S, i);
      let chain = '';
      if (!sh) {
        ['f1', 'f2', 'f3', 'n0', 'r'].forEach((id) => { chain += `<i class="${dotCls(i + '.' + id, E)}"></i>`; });
        chain += `<i class="${dotCls(MC.rk(E, i + '.eb') > 0 ? i + '.eb' : i + '.ea', E)}"></i>`;
        const t4 = ['ma', 'fa', 'fb', 'mb'].map((id) => i + '.' + id).find((q) => MC.rk(E, q) > 0) || i + '.ma';
        chain += `<i class="${dotCls(t4, E)}"></i><i class="ev ${dotCls(i + '.v', E)}"></i>`;
      }
      const vst = GT.status(ST().lv, E, i + '.v'), evs = vst.rank > 0 ? 'Evolved' : vst.st === 'av' ? 'Evolve ready' : '';
      cards += `<button type="button" class="cp-card${CV.sel === i && !CV.ult ? ' on' : ''}${rr.pas ? ' pas' : ''}" data-a="sel:${i}" data-tip="p:${i}" aria-label="${esc(rr.name)}"><span class="mi"><img src="${A}${rr.ic}" alt="" draggable="false"></span>${sh ? '' : `<span class="tx"><b class="nm">${esc(rr.name)}</b><i class="tg">${KIND_TAG(i)}${evs ? ' · ' + evs : ''}</i><span class="ch">${chain}</span></span>`}<span class="pts"><b>${pts}</b>${pend ? `<u>+${pend}</u>` : ''}</span></button>`;
    }
    return med + cards;
  }
  function L3(W, H, sh) {
    const railW = sh ? 60 : 270, g = sh ? 8 : 14, rx = railW + g, rw = W - rx, tl = sh ? 32 : 96, nodeW = rw - tl, p = H / 5, k = clamp(p / 56, 0.5, 1.3), u = Math.min(sh ? 116 : 130, nodeW / 5.3), c = rx + tl + nodeW / 2;
    const i = CV.sel, yk = (n) => p * (n + 0.5), b = Bld(), at = (id, x, n, dy) => b.at(i + '.' + id, x, yk(n) + (dy || 0));
    at('f1', c - u, 0); at('f2', c, 0); at('f3', c + u, 0); at('n0', c, 1); at('r', c, 2); at('ea', c - 1.5 * u, 2); at('eb', c + 1.5 * u, 2);
    at('ma', c - 2.25 * u, 3); at('fa', c - 0.75 * u, 3); at('fb', c + 0.75 * u, 3); at('mb', c + 2.25 * u, 3); at('v', c, 4);
    let tx = '', bands = '', caps = '';
    [['I', 0, 1], ['II', 1, 1], ['III', 2, 1], ['IV', 3, 1], ['E', 4, 1]].forEach(([t, n0, n]) => { tx += tierChip(t, rx, p * n0, tl, p * n); bands += band(t, rx + tl, p * n0, nodeW, p * n); });
    b.build(18 * k);
    if (!sh) b.keys.forEach((key) => { const q = b.pos[key], nd = MC.BY[key], z = { F: 30, E: 26, B: 34, N: 40, V: 54 }[nd.kind] * k; caps += `<span class="cp-cap" style="left:${px(q.x)}px;top:${px(q.y + z / 2 + (nd.kind === 'B' ? 12 : 5))}px">${esc(V.nodeInfo(key).name)}</span>`; });
    /* acilir ult paneli */
    let up = '';
    if (CV.ult) {
      const hdU = sh ? 38 : 56, pit = Math.min(96, (H - hdU - 6) / 4), ux = rx + tl, uw = nodeW, ny0 = hdU, x1 = ux + (sh ? 150 : 250), dx = Math.min(180, (rw - (x1 - rx) - 30) / 2), ub = Bld(); ub.flow = hflow; ub.stub = stubH;
      up += `<div class="cp-up" style="left:${px(rx)}px;top:0;width:${px(rw)}px;height:${px(H)}px"></div>`;
      up += `<div class="cp-uhead" style="left:${px(rx + 10)}px;top:0;width:${px(rw - 70)}px;height:${hdU}px"><b>Ultimate · ${esc(ROWS[4].name)}</b><span>Ult points <b data-upts>0</b> / ${MC.ULT_MAX}</span><span>Levels 5 · 10 · 15</span><span>One arm only</span></div>`;
      up += `<button type="button" class="cp-uclose" data-a="ult:close" aria-label="Close the ult tree" style="left:${px(rx + rw - 48)}px;top:${px(Math.max(0, hdU / 2 - 22))}px"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button>`;
      const cyc = ny0 + (pit * 4) / 2, csz = sh ? 44 : 64;
      up += core(rx + (sh ? 34 : 70), cyc, csz);
      MC.ARMS.forEach((arm, j) => {
        const y = ny0 + pit * (j + 0.5);
        up += armChip(arm, ux + (sh ? 50 : 86), y - 15, sh ? 78 : 100);
        [1, 2, 3].forEach((s) => { const x = x1 + dx * (s - 1) + (s - 1) * 0; ub.at(MC.ULT + '.' + arm + s, x, y); up += lvTag(MC.ULT + '.' + arm + s, x, y + (sh ? 22 : 30)); });
        ub.svg += `<path data-a="C" data-b="${MC.ULT}.${arm}1" d="${hflow({ x: rx + (sh ? 34 : 70) + csz * 0.4, y: cyc }, { x: x1, y })}"/>`;
      });
      ub.build(14 * k);
      up += `<div class="cp-upwrap" style="left:0;top:0;width:${px(W)}px;height:${px(H)}px">${svgBox(W, H, ub.svg)}${ub.nds}</div>`;
    }
    const branch = `<div class="cp-branch${CV.ult ? ' hid' : ''}" style="left:0;top:0;width:${px(W)}px;height:${px(H)}px">${bands}${svgBox(W, H, b.svg)}${tx}${caps}${b.nds}</div>`;
    const rail = `<div class="cp-rail" data-dyn="rail" style="left:0;top:0;width:${px(railW)}px;height:${px(H)}px">${railHTML(sh)}</div>`;
    return { vars: sizes(k, clamp(p - 1, 20, 44)), html: rail + `<i class="cp-vr" style="left:${px(railW + g / 2)}px;top:0;height:${px(H)}px"></i>` + branch + up, meta: { pitch: p } };
  }

  /* ================= V4: siki izgara (kucuk dugumler, sabit aciklama alani; ult ayri gorunum) ================= */
  function L4(W, H, sh) {
    const dh = sh ? 60 : 0, dw = sh ? 0 : Math.min(450, Math.max(380, W * 0.3)), g = sh ? 0 : 16, gw = W - dw - g, rhw = sh ? 58 : 156, hdr = sh ? 18 : 36, gh = H - dh;
    const ultV = CV.view === 'ult', rows = 4, pitch = Math.floor(Math.min(sh ? 60 : 118, (gh - hdr) / rows)), k = clamp(pitch / 52, 0.55, 1.1), b = Bld(); b.flow = hflow; b.stub = stubH;
    let tx = '', bands = '', ut = '';
    const cell = (col, ncols) => rhw + ((gw - rhw) / ncols) * (col + 0.5);
    if (!ultV) {
      const cw = (gw - rhw) / 12, COL = { f1: 0, f2: 1, f3: 2, n0: 3, r: 4, ea: 5, eb: 6, ma: 7, fa: 8, fb: 9, mb: 10, v: 11 };
      for (let i = 0; i < 4; i++) {
        const cy = hdr + pitch * (i + 0.5);
        Object.keys(COL).forEach((id) => b.at(i + '.' + id, cell(COL[id], 12), cy));
        tx += head(i, sh ? 'mini' : 'tall', 2, hdr + pitch * i + (sh ? 0 : 2), rhw - 6, pitch - (sh ? 0 : 4)) + `<i class="cp-hsep" style="left:0;width:${px(gw)}px;top:${px(hdr + pitch * (i + 1))}px"></i>`;
      }
      b.flowFor = (a, c2, sa, sb) => { const ida = sa.split('.')[1], idb = sb.split('.')[1]; if (Math.abs(COL[idb] - COL[ida]) <= 1) return hflow(a, c2); const up2 = ['ea', 'ma', 'fa'].indexOf(ida) >= 0 && idb !== 'v' ? 1 : ida === 'ma' ? 1 : -1, amp = Math.min(pitch * 0.42, 8 + 5 * Math.abs(COL[idb] - COL[ida])) * -up2 * (up2 === 1 ? 1 : 1); return `M${px(a.x)},${px(a.y)} Q${px((a.x + c2.x) / 2)},${px(a.y + amp * 1.9)} ${px(c2.x)},${px(c2.y)}`; };
      [['I', 0, 3], ['II', 3, 1], ['III', 4, 3], ['IV', 7, 4], ['E', 11, 1]].forEach(([t, c0, n]) => { const x0 = rhw + cw * c0; tx += tierChip(t, x0, 0, cw * n, hdr); bands += band(t, x0, 0, cw * n, hdr + pitch * rows); });
      b.build(14 * k);
    } else {
      const cw = (gw - rhw) / 3;
      for (let j = 0; j < 4; j++) {
        const arm = MC.ARMS[j], cy = hdr + pitch * (j + 0.5);
        ut += armChip(arm, 4, cy - (sh ? 15 : 17), rhw - 10);
        [1, 2, 3].forEach((s) => b.at(MC.ULT + '.' + arm + s, cell(s - 1, 3), cy));
        ut += `<i class="cp-hsep" style="left:0;width:${px(gw)}px;top:${px(hdr + pitch * (j + 1))}px"></i>`;
      }
      [1, 2, 3].forEach((s) => { const x0 = rhw + cw * (s - 1); ut += `<div class="cp-ulh" data-ulh="${s}" style="left:${px(x0)}px;top:0;width:${px(cw)}px;height:${hdr}px"><small>Level</small><b>${MC.ULT_LV[s - 1]}</b></div>` + band('L', x0, 0, cw, hdr + pitch * rows); });
      if (!sh) ut += core(rhw / 2, hdr / 2 + 4, 40) + `<span class="cp-upts" style="left:${px(rhw / 2 + 28)}px;top:${px(hdr / 2 + 4)}px"><b data-upts>0</b>/${MC.ULT_MAX}</span>`;
      b.build(14 * k);
    }
    const dt = sh ? `<div class="cp-dt mini" data-dt style="left:0;top:${px(gh + 2)}px;width:${px(W)}px;height:${px(dh - 2)}px"></div>` : `<div class="cp-dt" data-dt style="left:${px(gw + g)}px;top:0;width:${px(dw)}px;height:${px(H)}px"></div>`;
    return { vars: sizes(k, clamp(Math.floor(Math.min(pitch, (gw - rhw) / (ultV ? 3 : 12))), 20, 44)), html: `${bands}${svgBox(gw, gh, b.svg)}${tx}${ut}${b.nds}${dt}`, meta: { pitch, cell: (gw - rhw) / (ultV ? 3 : 12) } };
  }

  /* ================= V5: merkez omurga (ortada asagi inen tier cizgisi, skill dallari iki yana; evolve'lar omurgada toplanir, ult omurganin dibinde haca) ================= */
  function L5(W, H, sh) {
    const hh = sh ? 30 : 54, crest = sh ? 110 : 318, gateW = sh ? 38 : 100, cx = W / 2, edge = sh ? 3 : 8, cw = (W / 2 - gateW / 2 - edge) / 2;
    const rows = 6, p = Math.min(86, (H - hh - crest) / rows), k = clamp(p / 58, 0.42, 1), yk = (n) => hh + p * (n + 0.5), b = Bld();
    let tx = '', bands = '';
    const COLX = [cx - gateW / 2 - cw * 1.5, cx - gateW / 2 - cw * 0.5, cx + gateW / 2 + cw * 0.5, cx + gateW / 2 + cw * 1.5];
    const evx = sh ? 36 : 84;
    for (let i = 0; i < 4; i++) {
      const c = COLX[i], at = (id, t, n) => b.at(i + '.' + id, c + cw * (t - 0.5), yk(n));
      at('f1', 0.2, 0); at('f2', 0.5, 0); at('f3', 0.8, 0); at('n0', 0.5, 1); at('r', 0.5, 2); at('ea', 0.25, 3); at('eb', 0.75, 3);
      at('ma', 0.125, 4); at('fa', 0.375, 4); at('fb', 0.625, 4); at('mb', 0.875, 4);
      b.at(i + '.v', cx + (i - 1.5) * evx, yk(5));
      tx += head(i, 'col', c - cw / 2 + 1, 0, cw - 2, hh);
    }
    [['I', 0, 1], ['II', 1, 1], ['III', 2, 2], ['IV', 4, 1]].forEach(([t, n0, n]) => { tx += tierChip(t, cx - gateW / 2, hh + p * n0 + p * 0.1, gateW, p * n - p * 0.2); bands += band(t, 0, hh + p * n0, W, p * n); });
    if (!sh) tx += tierChip('E', cx - gateW / 2 - 14, hh + p * 5 + p * 0.5 + 30, gateW + 28, 34); bands += band('E', 0, hh + p * 5, W, p);
    const spineEnd = hh + p * 6 + (sh ? 22 : 38);
    b.flowFor = (a, c2) => (c2.x === a.x ? vflow(a, c2) : `M${px(a.x)},${px(a.y)} C${px(a.x)},${px(a.y + (c2.y - a.y) * 0.7)} ${px(c2.x)},${px(a.y + (c2.y - a.y) * 0.3)} ${px(c2.x)},${px(c2.y)}`);
    b.build(14 * k);
    /* ult tepesi: + sekli, yatay kollar uzun, dikey kollar kisa */
    const ucy = H - crest / 2 - 2, hx = sh ? [28, 54, 80] : [66, 122, 178], vy = sh ? [16, 30, 44] : [46, 90, 134], ub = Bld(); ub.flowFor = (a, c2) => `M${px(a.x)},${px(a.y)} L${px(c2.x)},${px(c2.y)}`; let ut = '';
    const D = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] };
    MC.ARMS.forEach((arm) => {
      const d = D[arm];
      [1, 2, 3].forEach((s) => { const x = cx + d[0] * hx[s - 1], y = ucy + d[1] * vy[s - 1]; ub.at(MC.ULT + '.' + arm + s, x, y); if (!sh) ut += `<span class="gt-ulv" data-ulv="${MC.ULT}.${arm}${s}" style="left:${px(d[0] ? x : x + (sh ? 20 : 30))}px;top:${px(d[0] ? y + (sh ? 15 : 22) : y)}px">Lv ${MC.ULT_LV[s - 1]}</span>`; });
      const ex = d[0] ? cx + d[0] * (hx[2] + (sh ? 40 : 82)) : cx + (sh ? 56 : 88), ey = d[0] ? ucy : ucy + d[1] * (vy[2] + 2);
      if (!sh) ut += armChip(arm, ex - 46, ey - 11, 92);
    });
    ub.build(14 * k); b.svg += ub.svg; b.nds += ub.nds;
    ut += core(cx, ucy, sh ? 30 : 48) + `<span class="cp-upts" style="left:${px(cx + (sh ? 22 : 36))}px;top:${px(ucy + (sh ? 14 : 22))}px"><b data-upts>0</b>/${MC.ULT_MAX}</span>`;
    const spine = `<line class="spine" x1="${px(cx)}" y1="${px(hh)}" x2="${px(cx)}" y2="${px(spineEnd)}"/><line class="spine" x1="${px(cx)}" y1="${px(spineEnd)}" x2="${px(cx)}" y2="${px(ucy - vy[2] - (sh ? 6 : 12))}" stroke-dasharray="3 5"/>`;
    return { vars: sizes(k, clamp(p - 1, 18, 44)), html: `${bands}${svgBox(W, H, spine + b.svg)}${tx}${ut}${b.nds}`, meta: { pitch: p } };
  }

  root.CL = { CV, L: { v1: L1, v2: L2, v3: L3, v4: L4, v5: L5 }, railHTML, head, tierChip };
})(window);
