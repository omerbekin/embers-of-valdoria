/* Valor penceresi v4 taslagi: oyun kodu DEGIL. V2 Nobet + kor/ates hissi (3 varyant). Metin / sayilar oyundan (cap 8, mangal basina 4, savas disi diriltme 4, %50 can). */
(function () {
  const { esc, tip } = MK;
  const COST = 4, BATTLE = 6, CAP = 8, HP = 50, HOLD_MS = 900;
  const HEROES = [
    { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 4 },
    { id: 'archer', name: 'Archer', role: 'Marksman', lv: 4 },
  ];
  const H = (id) => HEROES.find((h) => h.id === id);
  const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M6 9h12"/></svg>';
  const DIA = '<i class="vz-dia"></i>';
  const STATES = [
    { cap: 'İki düşmüş · Valor 6 / 8 (yeter: basılı tut)', valor: 6, fallen: ['warrior', 'archer'] },
    { cap: 'Bir düşmüş · Valor 2 / 8 (yetmiyor)', valor: 2, fallen: ['archer'] },
    { cap: 'Kimse düşmemiş · Valor 5 / 8', valor: 5, fallen: [] },
  ];
  const fresh = (st) => ({ valor: st.valor, fallen: st.fallen.slice(), msg: '' });
  const reduced = () => document.documentElement.classList.contains('reduced-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const valorTip = (v) =>
    tip({ kind: 'Outside battle', title: 'Valor', icon: MK.brazier('brazier-ready'), value: `${v}/${CAP}`, valueLabel: 'embers',
      lines: ['Win battles to light more embers (+1, +2 elite, +3 boss).', `A revive costs ${COST} embers outside battle and ${BATTLE} in battle.`, `The fallen hero rises with ${HP}% HP.`] });
  const reviveTip = (h, v) =>
    tip({ kind: 'Revive', title: h.name, icon: MK.av(h.id), iconShape: 'portrait', value: `${COST}`, valueLabel: 'embers',
      lines: [`Rises again with ${HP}% HP.`].concat(v >= COST ? ['Hold to revive.'] : [`Needs ${COST} embers (you have ${v}).`]) });
  const brz = (v, idx, h) => {
    const lit = Math.max(0, Math.min(4, v - 4 * idx));
    const ready = lit >= 4 && v >= COST;
    return `<span class="vl-meter${ready ? ' vl-ready' : ''}" style="--vl-h:${h}"><span class="vl-brs"><span class="vl-br${ready ? ' on' : ''}"><img class="vl-img" src="${MK.brazier('brazier-' + lit)}" alt=""><img class="vl-flame" src="${MK.brazier('brazier-ready')}" alt=""></span></span></span>`;
  };
  const sparks = () => '<div class="vz-sparks">' + Array.from({ length: 16 }, (_, i) => `<i style="left:${(i * 37 + 11) % 100}%;animation-delay:${-((i * 53) % 90) / 10}s;animation-duration:${7 + (i % 5)}s;--dx:${((i * 29) % 40) - 20}px"></i>`).join('') + '</div>';
  const closeBtn = (cls) => `<button class="el-btn ${cls || ''}" type="button">Close</button>`;

  function revive(f, id) {
    const s = f.state;
    if (s.valor < COST || !s.fallen.includes(id)) return;
    s.valor -= COST;
    s.fallen = s.fallen.filter((x) => x !== id);
    s.msg = `${H(id).name} rises again.`;
    f.redraw();
  }

  /* ---------- deger gurultusu (zamanli) ---------- */
  const hash = (x, y, z) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const sm = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function vn(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
    const a = lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), fx), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), fx), fy);
    const b = lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), fx), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), fx), fy);
    return lerp(a, b, fz);
  }
  const fbm = (x, y, z) => vn(x, y, z) * 0.62 + vn(x * 2.1 + 7, y * 2.1 + 3, z * 1.3) * 0.38;
  const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- 3 yanma cizici: d = yanma cizgisinin ne kadar "arkasinda" (d>0 yanmis) ---------- */
  const W = 56, HH = 98;
  const AMP = { 1: 0.55, 2: 0.42, 3: 0.3 };
  const FX = {
    1(px, p, t, quiet) { // yanan kenar
      const amp = AMP[1], s = p * (1 + amp) - amp / 2;
      for (let y = 0; y < HH; y++) {
        const yb = 1 - y / (HH - 1);
        for (let x = 0; x < W; x++) {
          const n = fbm(x * 0.1, y * 0.05, t * 0.9);
          const d = s - (yb + (n - 0.5) * amp);
          const i = (y * W + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          if (p > 0 && d > -0.07) {
            const fl = quiet ? 0.9 : 0.72 + 0.28 * vn(t * 9, x * 0.35, 5);
            if (d < 0) { r = 255; g = 130; b = 40; a = (1 + d / 0.07) * 0.35 * fl; }
            else if (d < 0.045) { r = 255; g = 225; b = 140; a = 0.95 * fl; }
            else if (d < 0.17) { const u = (d - 0.045) / 0.125; r = 255; g = 170 - 70 * u; b = 50 - 20 * u; a = (0.8 - 0.4 * u) * fl; }
            else { const hole = vn(x * 0.45, y * 0.3, t * 2.5); a = hole > 0.68 ? 0.05 : Math.max(0.1, 0.34 * Math.exp(-(d - 0.17) * 4)) * fl; r = 235; g = 95; b = 30; }
          }
          px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.min(255, a * 255);
        }
      }
    },
    2(px, p, t, quiet) { // kor kumas
      const amp = AMP[2], s = p * (1 + amp) - amp / 2;
      for (let y = 0; y < HH; y++) {
        const yb = 1 - y / (HH - 1);
        for (let x = 0; x < W; x++) {
          const n = fbm(x * 0.16, y * 0.1, t * 0.35);
          const d = s - (yb + (n - 0.5) * amp);
          const n2 = fbm(x * 0.34 + 20, y * 0.26, t * 1.1 + 9);
          const pulse = quiet ? 1 : 0.82 + 0.18 * Math.sin(t * 4 + n2 * 9);
          const i = (y * W + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          if (p > 0) {
            if (d < 0 && d > -0.2) { const u = 1 + d / 0.2; r = 14; g = 7; b = 4; a = 0.82 * u * u * (0.55 + 0.45 * ss(0.2, 0.6, n2)); }
            else if (d >= 0 && d < 0.075) {
              const gl = ss(0.32, 0.72, n2) * (1 - d / 0.075) * pulse;
              r = 255; g = 60 + 120 * gl; b = 15 + 25 * gl; a = Math.min(0.95, 0.28 + 0.85 * gl);
            } else if (d >= 0.075) {
              const sp = ss(0.74, 0.9, fbm(x * 0.5 + 3, y * 0.4, t * 0.3)) * Math.exp(-(d - 0.075) * 3.2) * pulse;
              r = 255; g = 110; b = 30; a = sp * 0.75;
            }
          }
          px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.min(255, a * 255);
        }
      }
    },
    3(px, p, t, quiet) { // nefes alan komur
      const amp = AMP[3], s = p * (1 + amp) - amp / 2 + 0.08;
      for (let y = 0; y < HH; y++) {
        const yb = 1 - y / (HH - 1);
        for (let x = 0; x < W; x++) {
          const n = fbm(x * 0.12, y * 0.07, t * 0.4);
          const d = s - (yb + (n - 0.5) * amp);
          const i = (y * W + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          if (p > 0 && d > -0.08) {
            const c = fbm(x * 0.2 + 40, y * 0.19, t * 0.18);
            const br = ss(0.34, 0.78, c) * (quiet ? 0.85 : 0.62 + 0.38 * Math.sin(t * 2.6 + c * 10));
            const k = ss(-0.08, 0.1, d) * (1 - 0.35 * yb);
            if (br < 0.12) { r = 58; g = 44; b = 40; a = 0.3 * k; } // kul
            else { r = 120 + 135 * br; g = 28 + 150 * br; b = 8 + 55 * br * br; a = (0.28 + 0.62 * br) * k; }
          }
          px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.min(255, a * 255);
        }
      }
    },
  };

  /* kivilcim / kul parcaciklari (dusuk cozunurluk koordinatinda) */
  function spawn(list, v, p) {
    const edgeY = HH * (1 - Math.min(1, p));
    if (v === 1 && Math.random() < 0.16) list.push({ x: Math.random() * W, y: edgeY + Math.random() * 6, vx: (Math.random() - 0.5) * 14, vy: -(26 + Math.random() * 30), life: 0, max: 0.6 + Math.random() * 0.5, c: 0 });
    if (v === 3 && Math.random() < 0.3) list.push({ x: Math.random() * W, y: edgeY + Math.random() * (HH - edgeY), vx: (Math.random() - 0.5) * 8, vy: -(10 + Math.random() * 16), life: 0, max: 0.9 + Math.random() * 0.9, c: Math.random() < 0.55 ? 2 : 0, ph: Math.random() * 6 });
  }
  function drawParts(ctx, list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.life += dt;
      if (q.life > q.max) { list.splice(i, 1); continue; }
      q.x += (q.vx + (q.ph !== undefined ? Math.sin(q.life * 5 + q.ph) * 6 : 0)) * dt;
      q.y += q.vy * dt;
      const u = 1 - q.life / q.max;
      ctx.fillStyle = q.c === 2 ? `rgba(170,150,140,${0.55 * u})` : `rgba(255,${Math.round(150 + 90 * u)},${Math.round(50 + 60 * u)},${0.95 * u})`;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    }
  }

  /* ======================= V2 NOBET + ates hissi ======================= */
  const mk = (variant) => (ui, f) => {
    const s = f.state;
    const can = s.valor >= COST;
    const banners = s.fallen.map((id) => {
      const h = H(id);
      return `<div class="bn-wrap k-tipwrap"><span class="rope"></span><div class="bn fx${variant}${can ? ' can' : ''}" data-hold="${id}" tabindex="0" style="--hold:0"><div class="bn-in">
        <div class="pt"><img src="${MK.av(id)}" alt=""><i class="cross">${CROSS}</i><span class="lv">Lv ${h.lv}</span></div>
        <div class="nm">${h.name}</div><div class="rl">${h.role}</div>
        <div class="pill${can ? '' : ' low'}">${DIA}Revive · ${COST}</div><canvas class="fire" width="${W}" height="${HH}"></canvas></div></div><div class="k-tip">${reviveTip(h, s.valor)}</div></div>`;
    }).join('');
    const hang = s.fallen.length
      ? `<div class="vg-hang"><div class="vg-bar"><i></i><i></i></div><div class="vg-banners">${banners}</div></div>`
      : `<div class="vg-hang none"><div class="vg-bar"><i></i><i></i></div><div class="vg-empty"><div class="t1">No hero has fallen.</div><div class="t2">Keep your embers for the battles ahead.</div></div></div>`;
    ui.innerHTML = `<div class="vz-ov el-modal">${sparks()}<div class="vg"><h2 class="el-title">Valor</h2>
      <div class="vg-row">
        <div class="vg-br k-tipwrap">${brz(s.valor, 0, 'calc(130px * var(--k))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
        ${hang}
        <div class="vg-br k-tipwrap">${brz(s.valor, 1, 'calc(130px * var(--k))')}<div class="k-tip">${valorTip(s.valor)}</div></div>
      </div>
      <div class="vg-count"><b>${s.valor}</b> / ${CAP} <span>embers</span></div>
      <div class="vz-foot center"><span class="vz-msg">${esc(s.msg)}</span>${closeBtn('primary')}</div></div></div>`;
    ui.querySelectorAll('.bn.can').forEach((bn) => {
      const cv = bn.querySelector('canvas'), ctx = cv.getContext('2d');
      const img = ctx.createImageData(W, HH);
      const parts = [];
      let raf = 0, t0 = 0, last = 0;
      const draw = (p, now) => {
        const quiet = reduced();
        const t = quiet ? 0 : now / 1000;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        FX[variant](img.data, p, t, quiet);
        ctx.putImageData(img, 0, 0);
        if (!quiet) { spawn(parts, variant, p); drawParts(ctx, parts, dt); }
      };
      const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; parts.length = 0; ctx.clearRect(0, 0, W, HH); bn.style.setProperty('--hold', '0'); bn.classList.remove('holding'); };
      const step = (t) => {
        const p = Math.min(1, (t - t0) / HOLD_MS);
        bn.style.setProperty('--hold', String(p));
        draw(p, t);
        if (p >= 1) { raf = 0; revive(f, bn.dataset.hold); return; }
        raf = requestAnimationFrame(step);
      };
      const still = /still=([\d.]+)/.exec(location.hash); // onizleme: #v1&still=0.5 ilk sancagi o ilerlemede dondurur
      if (still && bn === ui.querySelector('.bn.can')) { const p = +still[1]; bn.classList.add('holding'); bn.style.setProperty('--hold', String(p)); draw(p, 2000); draw(p, 2016); return; }
      bn.addEventListener('pointerdown', (e) => { if (e.button) return; bn.setPointerCapture(e.pointerId); bn.classList.add('holding'); t0 = performance.now(); raf = requestAnimationFrame(step); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => bn.addEventListener(ev, () => { if (raf) stop(); }));
      bn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revive(f, bn.dataset.hold); } });
    });
  };

  const mkFrames = (render) => (host) => STATES.forEach((st) => MK.addFrame(host, { cap: st.cap, bg: MK.bg('valdoria'), state: fresh(st), render }));
  MK.mount({
    title: 'Valor window v4',
    sections: [
      { id: 'v1', tab: 'V1 Yanan kenar', h: 'V1 · Yanan kenar', note: 'Sancağa BASILI TUT (≈1 sn): tırtıklı, düzensiz bir yanma çizgisi alttan sürünerek yükselir; parlaklığı titrer, birkaç kıvılcım uçar.', build: mkFrames(mk(1)) },
      { id: 'v2', tab: 'V2 Kor kumaş', h: 'V2 · Kor kumaş', note: 'Basılı tut: yanma çizgisinin önünde kömürleşmiş koyu kenar, çizgide düzensiz parlayan kor, arkada kor benekleri; kahramanın üstünde ısı dalgalanması.', build: mkFrames(mk(2)) },
      { id: 'v3', tab: 'V3 Nefes alan kömür', h: 'V3 · Nefes alan kömür', note: 'Basılı tut: dolgu parlayıp sönen kömür gibi; küçük kül ve kıvılcım yükselir, sancağın üstünde sıcak ışık titrer. Basmadan önce altta soluk bir kor nefes alır.', build: mkFrames(mk(3)) },
    ],
  });
})();
