/* MOMENTS skill agaci arayuzu (mockup, oyun kodu DEGIL). Kurallar: core.js (SMM). Icerik: content.js (SMM_CONTENT) + classes.js (SMM_CLASSES: class tablosu, ikonlar).
   Belgeler: docs/design/skill-tree-moments.md (sema), skill-tree-moments-variants.md (class basina 5 varyant, veri sozlesmesi).
   Adres: #c=<class>&v=<1-5|pick>&lv=1..50 [&focus=A-B] [&clean].  Eski adresler: #c=w -> warrior (Omer'in secimi), #c=h -> hexer v1.
   Varyant dosyalari variants/<class>.js, class secilince script etiketiyle yuklenir (SMM_VARIANTS[class]); yoksa / bozuksa 'Variants coming' yer tutucusu. */
'use strict';
(function () {
  const MC = window.SMM, CT = window.SMM_CONTENT;
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = 'skill-tree-moments/';
  const CLASSES = window.SMM_CLASSES || [];
  const CBY = {}; CLASSES.forEach((c) => { CBY[c.id] = c; });
  const NVAR = 5;
  const KN = { F: 'Filler', E: 'Edge', N: 'Notable', B: 'Blood Price', V: 'Evolve' };
  const ULT = MC.ULT, NROWS = 4, EXPECT = { e1: 25, e2: 40 };
  /* ikon yoksa tarafsiz yedek (kirik resim gorunmesin) */
  const FB = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#120c08'/><path d='M32 9 55 32 32 55 9 32Z' fill='none' stroke='#a8803a' stroke-width='3'/><path d='M32 22 42 32 32 42 22 32Z' fill='#a8803a' opacity='.55'/></svg>");
  const FBQ = FB.replace(/'/g, '%27');
  /* tooltip madalyonu: ikon + (yuklenemezse) tarafsiz yedek, ikisi de satir ici (goreli adres belgeye gore cozulur) */
  const medalBg = (ic) => "background-image:url('" + A + ic + "'),url('" + FBQ + "')";
  document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = '1'; t.src = FB; } }, true);

  const ST = { c: 'warrior', v: 'pick', lv: 30, S: MC.newState(), plan: null, tip: null, fail: null, pinned: null, clean: false, fa: 0, fb: 1,
    vf: { state: 'loading' }, content: null, rowsC: null, tok: 0, pendingFocus: null };
  const sOf = () => ST.S;
  const planOf = () => ST.plan;
  const defaultV = (c) => (c === 'warrior' ? 'pick' : 1);
  const VCACHE = {}; // class -> varyant dosyasi verisi (basarili yukleme)

  /* ---------- varyant dosyasi yukleme (script etiketi, onload / onerror, onbellekli; eksik / bozuk = { ok: false }) ---------- */
  function loadVariants(cls) {
    return new Promise((resolve) => {
      const V = (window.SMM_VARIANTS = window.SMM_VARIANTS || {});
      const check = () => { const err = CT.validateFile(V[cls], cls); return err ? { ok: false, err } : { ok: true, data: V[cls] }; };
      if (VCACHE[cls]) { resolve({ ok: true, data: VCACHE[cls] }); return; }
      if (V[cls]) { const r = check(); if (r.ok) VCACHE[cls] = r.data; resolve(r); return; }
      let done = false; const s = document.createElement('script'); let t = 0;
      const url = A + 'variants/' + cls + '.js';
      const fin = (r) => { if (done) return; done = true; clearTimeout(t); s.onload = s.onerror = null; s.remove(); resolve(r); };
      s.onload = () => { const r = check(); if (r.ok) VCACHE[cls] = r.data; fin(r); };
      s.onerror = () => fin({ ok: false, err: 'missing' });
      t = setTimeout(() => fin({ ok: false, err: 'timeout' }), 10000);
      const inject = () => { if (done) return; s.async = true; s.src = url; document.head.appendChild(s); };
      /* once kisa yoklama: dosya yoksa bazi sunucular (Vite dev) 200 + HTML doner; script'e HTML yedirip konsola SyntaxError dusurmeyelim. Yoklama calismazsa dogrudan script. */
      if (location.protocol.indexOf('http') === 0 && typeof fetch === 'function') {
        fetch(url).then((r) => { if (!r.ok || /text\/html/i.test(r.headers.get('content-type') || '')) fin({ ok: false, err: 'missing' }); else inject(); }, inject);
      } else inject();
    });
  }

  /* ---------- satirlar (ikon / aciklama classes.js, ad varyant dosyasindan) ---------- */
  function rows() {
    if (ST.rowsC) return ST.rowsC;
    const C = CBY[ST.c], D = ST.v !== 'pick' && ST.vf.state === 'ok' ? ST.vf.data : null;
    return (ST.rowsC = C.rows.map((r, i) => { const f = D ? (i < NROWS ? D.rows[i] : D.ult) : null; return { ic: r.ic, name: (f && f.name) || r.name, d: r.d, pas: i === 0, ult: i === ULT }; }));
  }
  const ready = () => (ST.v === 'pick' ? ST.c === 'warrior' : ST.vf.state === 'ok' && !!ST.vf.data.variants[ST.v - 1]);
  const cOf = () => ST.content || (ST.content = ST.v === 'pick' ? CT.fromPick(window.SMM_PICKS) : CT.fromVariant(ST.vf.data, ST.v - 1));

  /* ---------- icerik erisimi ---------- */
  function nodeInfo(key) {
    const e = cOf().nodes[key], nd = MC.BY[key];
    if (!e) return { name: 'Node ' + nd.id, eff: '(content missing)', nw: false, src: '?', ph: true };
    if (e.empty) return { name: 'Open slot', eff: e.eff, nw: false, src: '', ph: false, empty: true, note: null };
    return { name: e.name, eff: e.eff || '(content missing)', nw: e.nw, src: e.src, ph: false, empty: false, note: e.note || null };
  }
  /* kural metinlerinde (Needs ..., Needed by ...) bos yuva turuyle ayrilir: 'Open slot (Edge)' */
  const nameOf = (key) => { const i = nodeInfo(key); return i.empty ? 'Open slot (' + KN[MC.BY[key].kind] + ')' : i.name; };
  MC.setNamer(nameOf);
  const masteryName = () => cOf().mastery || (CBY[ST.c].name + ' Mastery');
  const barSrc = () => (ST.v === 'pick' ? 'V6 Moments' : 'V' + ST.v + ' · ' + (cOf().title || ''));
  function barInfo(i) {
    const t = MC.BAR_THR[i];
    if (t > 25) return { name: 'L50: TBD', eff: 'Reserved for the Lv 50 bar (30 / 35 / 40 / 45). Content not decided yet.', tbd: true };
    const b = cOf().bar[i];
    return b && b[0] ? { name: b[0], eff: b[1] || '(content missing)', tbd: false, src: barSrc() } : { name: 'Bonus ' + t, eff: '(content missing)', tbd: false, ph: true };
  }

  /* ---------- yerlesim ---------- */
  const G = { COLW: 104, LANEH: 66, HDR: 46, PADX: 14, COLS: 8, UD: 74 };
  const HALF = { F: 22, E: 22, B: 23, N: 28, V: 36 }, LBL = 28;
  const labelSide = (nd) => (nd.kind === 'N' || nd.kind === 'V' ? (nd.lane < 0 ? 'up' : 'dn') : null);
  function ext(nd) {
    const s = labelSide(nd);
    return [HALF[nd.kind] + (s === 'up' ? LBL + 6 : 0), HALF[nd.kind] + (s === 'dn' ? LBL + (nd.kind === 'V' ? 12 : 6) : nd.kind === 'F' ? 14 : 0)];
  }
  function tierRanges(tpl) {
    const m = {}; tpl.forEach((n) => { const t = m[n.tier] || (m[n.tier] = { tier: n.tier, c0: n.col, c1: n.col }); t.c0 = Math.min(t.c0, n.col); t.c1 = Math.max(t.c1, n.col); });
    return Object.keys(m).map((k) => m[k]).sort((a, b) => a.c0 - b.c0);
  }
  /* Tier basligi (Tier I .. Evolve) TEK sefer, agacin en ustunde (G.HDR); satirlar altinda ust uste, ayni kolonlar */
  function buildLayout() {
    const tpl = MC.NODES.filter((n) => n.i === 0);
    let lo = 1e9, hi = -1e9;
    tpl.forEach((n) => { const [a, b] = ext(n); lo = Math.min(lo, n.lane * G.LANEH - a); hi = Math.max(hi, n.lane * G.LANEH + b); });
    const padT = 8, padB = 8, rowH = hi - lo + padT + padB, cy0 = padT - lo;
    const xc = (c) => G.PADX + G.COLW * (c + 0.5);
    const L = { tpl, xc, rows: [], pos: {}, W: G.PADX * 2 + G.COLW * G.COLS, H: 0, tiers: tierRanges(tpl) };
    let y = G.HDR;
    for (let i = 0; i < NROWS; i++) {
      const row = { i, top: y, h: rowH, cy: y + cy0 }; L.rows.push(row);
      tpl.forEach((n) => { L.pos[i + '.' + n.id] = { x: xc(n.col), y: row.cy + n.lane * G.LANEH }; });
      y += rowH;
    }
    L.H = y + 4;
    /* ult: + sekli */
    const D = G.UD, UW = 600, UH = 524, cx = UW / 2, cy = UH / 2, dirs = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] };
    L.ult = { W: UW, H: UH, cx, cy, pos: {} };
    MC.ARMS.forEach((arm) => [1, 2, 3].forEach((s) => { L.ult.pos[ULT + '.' + arm + s] = { x: cx + dirs[arm][0] * D * s, y: cy + dirs[arm][1] * D * s, arm, s }; }));
    return L;
  }
  const link = (P, Q) => (P.y === Q.y || P.x === Q.x ? `M${P.x},${P.y} L${Q.x},${Q.y}` : `M${P.x},${P.y} C${(P.x + Q.x) / 2},${P.y} ${(P.x + Q.x) / 2},${Q.y} ${Q.x},${Q.y}`);

  /* ---------- parca HTML'leri ---------- */
  const PL = '<svg class="pl" viewBox="0 0 12 14"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
  const DROP = '<svg class="drop" viewBox="0 0 32 38"><path class="bd" d="M16 2 C16 2 4 17 4 25 a12 12 0 0 0 24 0 C28 17 16 2 16 2Z"/><path class="bi" d="M11 26 h10"/></svg>';
  function nodeHTML(key, p) {
    const nd = MC.BY[key], info = nodeInfo(key), k = nd.kind, ic = rows()[nd.i].ic;
    let inner;
    if (k === 'B') inner = DROP;
    else if (k === 'N' || k === 'V') inner = `<span class="dm"><img src="${A}${ic}" alt="" draggable="false"></span>`;
    else inner = '<span class="dm"></span>';
    const pp = k === 'F' ? '<span class="pp"></span>' : '';
    let lb = '';
    if (k === 'N' || k === 'V') { const side = nd.arm ? (nd.arm === 'u' || nd.arm === 'd' ? 'rt' : 'dn') : labelSide(nd) === 'up' ? 'up' : 'dn'; lb = `<span class="lb ${side}">${esc(info.name)}</span>`; }
    const nw = info.nw ? '<span class="nw">NEW</span>' : '';
    return `<button type="button" class="nd k-${k.toLowerCase()}${info.empty ? ' empty' : ''}" data-key="${key}" data-tip="n:${key}" aria-label="${esc(info.name)}" style="left:${p.x}px;top:${p.y}px">${inner}${pp}${lb}${nw}</button>`;
  }
  function stripHTML(cls, style, tier) { return `<div class="ts ${cls}" data-tier="${tier}" style="${style}"><small></small><b>${PL}<span class="pt"></span><em></em></b></div>`; }

  /* ---------- sayfa iskeleti ---------- */
  let R = null; // arayuz referanslari
  const loaded = () => ST.vf.state === 'ok' ? ST.vf.data : null;
  function renderClassBar() {
    $('#cls-sel').innerHTML = CLASSES.map((c) => `<button type="button" data-cls="${c.id}" class="${ST.c === c.id ? 'on' : ''}" aria-pressed="${ST.c === c.id}"><img src="${A}${c.portrait}" alt=""><span>${esc(c.name)}</span></button>`).join('');
    const D = loaded(); let tabs = '';
    if (ST.c === 'warrior') tabs += `<button type="button" data-var="pick" class="pk${ST.v === 'pick' ? ' on' : ''}" aria-pressed="${ST.v === 'pick'}">Ömer's pick</button>`;
    for (let n = 1; n <= NVAR; n++) {
      const V = D && D.variants[n - 1];
      tabs += `<button type="button" data-var="${n}" class="${ST.v === n ? 'on' : ''}" aria-pressed="${ST.v === n}"${V ? '' : ' disabled'}>V${n}${V && V.title ? ' · ' + esc(V.title) : ''}</button>`;
    }
    const note = D ? '' : ST.vf.state === 'loading' ? 'Loading variants…' : 'Variants coming';
    $('#var-tabs').innerHTML = tabs + (note ? `<span class="vnote">${note}</span>` : '');
  }
  function renderInfoBox() {
    $('#st-info').innerHTML = `<h2>Moments şeması</h2>
      <p>Şema sabit, her satır 11 + 1 düğüm: <b>f1 → f2 → f3 → n0 (Notable) → r → ea / eb → [ma · fa | fb · mb] → Evolve</b>. Düz zincir, evolve için ma ya da mb gerekir. <b>fa</b> ve <b>fb</b> Blood Price (kazanç + bedel, çıkmaz sokak).</p>
      <p>Kilit = <b>pasif + 3 aktif skill satırına harcanan TOPLAM puan</b> (sayaç; hangi satırdan geldiği önemli değil): Tier II 5 · Tier III 10 · Tier IV 15 · <b>Evolve I 23</b> · <b>Evolve II 38</b>, en çok 2 evolve. <b>Ult puanları sayaca ve Mastery bar'a girmez</b> (ult ağacı ayrı); ult düğümleri puana değil <b>level</b>e bağlı (5 / 10 / 15), ult'a en çok 3 puan.</p>
      <p><b>11 class, her class için 5 içerik varyantı</b> var (Warrior'da ek olarak Ömer'in seçimi). Üstten class ve varyantı seç; değişince puanlar sıfırlanır. İçerik taslaktır (content-designer), varyantı henüz yazılmamış class'ta "Variants coming" görünür.</p>
      <p class="m">Puan = level − 1. Tık +1, sağ tık / uzun basma −1 (geri alma, kalan harcamalar geçerli kalıyorsa). Düğümün üstüne gelince ipucu, kaynağı ipucunun altında yazıyor.</p>`;
  }
  function renderFocus() {
    const opts = (sel) => [0, 1, 2, 3].map((i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(rows()[i].name)}${rows()[i].pas ? ' (passive)' : ''}</option>`).join('');
    $('#focus').innerHTML = `<div class="fc-top"><h2>Focus check</h2>
      <label class="fsel">1st row<select id="fc-a" aria-label="First row">${opts(ST.fa)}</select></label>
      <label class="fsel">2nd row<select id="fc-b" aria-label="Second row">${opts(ST.fb)}</select></label>
      <button type="button" class="fc-run" id="fc-run">Run focus check</button><span class="fc-rep" id="fc-rep"></span></div>
      <p class="fc-note">Tek skill'e odaklanan oyuncuyu level level oynatır: 1. satırı doldurur ve evolve alır; sonra 2. satırda önce yol düğümlerini (f1 f2 f3 n0 r Edge Notable), sonra rank'ları harcar, sayaç 38 olunca evolve alır. Beklenen: <b>Evolve I Lv 25, Evolve II Lv 40</b>. Ağaç mevcut level'daki duruma gelir; bir olaya basınca o level'a gidilir, kaydırıcı koşuyu yeniden oynatır.</p>
      <div class="fc-out" id="fc-out"></div>`;
    renderFocusOut();
  }
  function renderFocusOut() {
    const P = planOf(), out = $('#fc-out'), rep = $('#fc-rep'); if (!out) return;
    if (!P) { out.innerHTML = ''; rep.textContent = ''; return; }
    const idle = P.nulls.filter((l) => l < MC.MAXLV);
    const spare = P.nulls.filter((l) => l >= MC.MAXLV);
    const sum = [
      `<span class="${P.e1 === EXPECT.e1 ? 'ok' : 'bad'}">Evolve I · Lv ${P.e1 == null ? '-' : P.e1} · expected ${EXPECT.e1}</span>`,
      `<span class="${P.e2 === EXPECT.e2 ? 'ok' : 'bad'}">Evolve II · Lv ${P.e2 == null ? '-' : P.e2} · expected ${EXPECT.e2}</span>`,
      `<span class="${idle.length ? 'bad' : 'ok'}">Idle points · ${idle.length ? 'Lv ' + idle.join(', ') : 'none (Lv 2-49)'}</span>`,
      spare.length ? `<span class="nt">Lv ${spare.join(', ')} · ${spare.length} spare point (both rows full)</span>` : '',
    ].join('');
    const tl = P.events.map((e) => `<button type="button" class="evc ${e.kind}" data-lv="${e.lv}" title="Show the tree at Lv ${e.lv}"><b>Lv ${e.lv}</b><span>${esc(e.text)}</span><i>${esc(rows()[e.row].name)} · ${esc(nodeInfo(e.key).name)}</i></button>`).join('');
    out.innerHTML = `<div class="fc-sum">${sum}</div><div class="tl">${tl}</div>`;
    rep.textContent = P.live ? 'Replay on: slider follows the run' : 'Manual edit: slider no longer follows the run';
    rep.classList.toggle('on', !!P.live);
    markTimeline();
  }
  function markTimeline() { $$('.evc').forEach((e) => e.classList.toggle('past', +e.dataset.lv <= ST.lv)); }

  function build() {
    G.COLW = pickColw();
    const L = buildLayout(), C0 = CBY[ST.c], nds = MC.NODES, cn = cOf();
    renderClassBar(); renderFocus();
    /* mastery bar: yalniz bonus elmaslari (hover ipucu); tier / evolve yazilari ve cizgileri yok */
    const mk = MC.BAR_THR.map((t, i) => `<span class="mk${t > 25 ? ' tbd' : ''}" data-t="${t}" data-tip="b:${i}" style="left:${t / MC.BARMAX * 100}%"><em>${t}</em><i></i></span>`).join('');
    const barHTML = `<div class="barw"><div class="bar-top"><span class="bnm">${esc(masteryName())}</span><span class="bval"><b id="bval">0</b> / ${MC.BARMAX}</span></div><div class="barrow"><div class="bartrack"><div class="bf" id="bf"></div>${mk}</div></div></div>`;
    /* agac */
    let cv = '', svg = '', labs = '';
    L.tiers.forEach((t) => {
      const x0 = G.PADX + G.COLW * t.c0, w = G.COLW * (t.c1 - t.c0 + 1);
      cv += stripHTML(t.tier === 'E' ? 'evo' : '', `left:${x0}px;top:0;width:${w}px;height:${G.HDR}px`, t.tier);
    });
    L.rows.forEach((row) => {
      L.tiers.forEach((t) => {
        const x0 = G.PADX + G.COLW * t.c0, w = G.COLW * (t.c1 - t.c0 + 1);
        cv += `<div class="tb" data-tier="${t.tier}" style="left:${x0}px;top:${row.top}px;width:${w}px;height:${row.h}px"></div>`;
      });
      svg += `<line class="sep" x1="0" y1="${row.top + row.h}" x2="${L.W}" y2="${row.top + row.h}"/>`;
      const rr = rows()[row.i];
      labs += `<div class="rl${rr.pas ? ' pas' : ''}" data-row="${row.i}" data-tip="r:${row.i}" style="top:${row.cy - 26}px"><span class="med"><img src="${A}${rr.ic}" alt=""></span><span class="rt"><b>${esc(rr.name)}</b><i>${rr.pas ? 'Passive' : 'Skill'} · <u data-pts="${row.i}">0</u> pts</i></span></div>`;
    });
    nds.filter((n) => n.i < NROWS).forEach((n) => {
      const B = L.pos[n.key];
      n.req.forEach((term) => term.forEach((src) => { svg += `<path class="${term.length > 1 ? 'alt' : ''}" data-a="${src}" data-b="${n.key}" d="${link(L.pos[src], B)}"/>`; }));
      if (n.kind === 'B') svg += `<path class="dead" data-b="${n.key}" data-dead="1" d="M${B.x + 24},${B.y} H${B.x + 42} M${B.x + 42},${B.y - 7} V${B.y + 7}"/>`;
    });
    nds.filter((n) => n.i < NROWS).forEach((n) => { cv += nodeHTML(n.key, L.pos[n.key]); });
    /* ult: + sekli */
    const U = L.ult, ur = rows()[ULT];
    let usvg = '', ucv = '';
    MC.ARMS.forEach((arm) => [1, 2, 3].forEach((s) => {
      const key = ULT + '.' + arm + s, P = U.pos[key], prev = s === 1 ? { x: U.cx, y: U.cy } : U.pos[ULT + '.' + arm + (s - 1)];
      usvg += `<path data-a="${s === 1 ? 'C' : ULT + '.' + arm + (s - 1)}" data-b="${key}" d="M${prev.x},${prev.y} L${P.x},${P.y}"/>`;
      ucv += nodeHTML(key, P);
      const vert = arm === 'u' || arm === 'd', half = s === 3 ? 27 : 15;
      const lx = vert ? P.x - (half + 34) : P.x, ly = vert ? P.y : P.y - (half + 17);
      ucv += `<span class="ulv" data-ulv="${key}" style="left:${lx}px;top:${ly}px">Lv ${MC.ULT_LV[s - 1]}</span>`;
    }));
    const ultHTML = `<div class="ultsec" id="ultsec"><div class="uhead"><h3>Ult tree · ${esc(ur.name)}</h3><span>Level locks 5 · 10 · 15</span><span>Ult points <b id="upts">0</b> / ${MC.ULT_MAX}</span></div>
      <div class="uwrap"><div class="uinfo"><p>Ortada ult'un ikonu (kendisi düğüm değil), <b>4 kol</b>, her kolda ortadan dışa <b>3 düğüm</b>: 1. düğüm <b>Lv 5</b>, 2. düğüm <b>Lv 10</b>, 3. düğüm <b>Lv 15</b> ve <b>Notable</b>.</p>
        <p>Kollar serbest, ama ult'a toplam en çok <b>${MC.ULT_MAX} puan</b> verilir (1 puan / düğüm), gerek = koldaki iç düğüm. <b>Evolve yok.</b> Kilit puana değil level'a bağlı; ult puanları kilit sayacına ve Mastery bar'a <b>girmez</b>.</p>
        <div class="arms" id="arms">${MC.ARMS.map((a) => `<div data-arm="${a}">${MC.ARM_NAME[a]} arm<b>0 / 3</b></div>`).join('')}</div></div>
        <div class="uscroll"><div class="ucanvas" style="width:${U.W}px;height:${U.H}px"><svg class="lines" width="${U.W}" height="${U.H}" viewBox="0 0 ${U.W} ${U.H}">${usvg}</svg>
          <div class="ucore" data-tip="r:${ULT}" style="left:${U.cx}px;top:${U.cy}px"><span class="ud"></span><img src="${A}${ur.ic}" alt="${esc(ur.name)}"></div>${ucv}</div></div></div></div>`;
    const vinfo = `<div class="vinfo"><span class="vt">${esc(cn.title || 'Variant')}</span>${cn.theme ? `<p class="en"><b>EN</b>${esc(cn.theme)}</p>` : ''}${cn.tr ? `<p class="tr"><b>TR</b>${esc(cn.tr)}</p>` : ''}</div>`;
    $('#sheet').innerHTML = `<div class="sh-top"><img src="${A}${C0.portrait}" alt=""><div class="nm">${esc(C0.name)}<small id="lvline"></small></div>
      <div class="sp"><span class="sf">Tree <b id="spv">0</b></span><span class="sf">Ult <b id="upv">0</b></span><span class="sf">Free <b id="frv">0</b></span></div></div>
      ${vinfo}
      ${barHTML}
      <div class="legend"><span><i class="lg lg-f"></i>Filler: küçük elmas, rank noktalı</span><span><i class="lg lg-e"></i>Edge: küçük yuvarlak</span><span><i class="lg lg-n"></i>Notable: orta boy, ikonlu, adı yazılı</span><span><i class="lg lg-b"></i>Blood Price: kan damlası, koyu kırmızı, çıkmaz sokak (arkasında düğüm yok)</span><span><i class="lg lg-v"></i>Evolve: büyük, altın (I: 23 puan, II: 38 puan, en çok 2)</span><span><b class="lg-w">NEW</b>motora yeni kural ister</span></div>
      <div class="treewrap"><div class="labcol" style="height:${L.H}px">${labs}</div><div class="tree" id="tree"><div class="canvas" style="width:${L.W}px;height:${L.H}px"><svg class="lines" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}">${svg}</svg>${cv}</div></div></div>
      ${ultHTML}
      <div class="hintln">Tık: +1 rank · sağ tık ya da uzun basma: −1 · üstüne gelince ipucu (dokunmatikte ilk dokunuş ipucu açar, + / − düğmeleri orada). Kilitli sütunlar soluk, üstteki başlıkta "0/5" = sayaç / gereken puan.</div>`;
    R = { L, nodes: {}, lines: [], bands: [], strips: [], pts: {}, ulv: {}, arms: {} };
    $$('.nd').forEach((e) => { R.nodes[e.dataset.key] = { el: e, base: e.className, pp: $('.pp', e) }; });
    $$('.lines path[data-a]').forEach((e) => R.lines.push({ el: e, a: e.dataset.a, b: e.dataset.b, base: e.getAttribute('class') || '' }));
    $$('.lines path[data-dead]').forEach((e) => R.lines.push({ el: e, a: null, b: e.dataset.b, base: 'dead' }));
    $$('.tb').forEach((e) => R.bands.push({ el: e, tier: e.dataset.tier }));
    $$('.ts').forEach((e) => R.strips.push({ el: e, tier: e.dataset.tier, sm: $('small', e), pt: $('.pt', e), em: $('em', e) }));
    $$('[data-pts]').forEach((e) => { R.pts[e.dataset.pts] = e; });
    $$('.ulv').forEach((e) => { R.ulv[e.dataset.ulv] = e; });
    $$('#arms [data-arm]').forEach((e) => { R.arms[e.dataset.arm] = e; });
    $('#lv').value = ST.lv; hideTip(); update();
    if (ST.pendingFocus) { const f = ST.pendingFocus; ST.pendingFocus = null; runFocus(f[0], f[1]); }
  }
  /* varyant yok / yukleniyor: sakin yer tutucu (sayfa cokmez) */
  function buildPlaceholder() {
    R = null; hideTip(); renderClassBar(); $('#focus').innerHTML = '';
    const C0 = CBY[ST.c], loading = ST.vf.state === 'loading';
    const why = !loading && ST.vf.err && ST.vf.err !== 'missing' ? `<small>variants/${esc(ST.c)}.js could not be read (${esc(ST.vf.err)}).</small>` : '';
    $('#sheet').innerHTML = `<div class="sh-top"><img src="${A}${C0.portrait}" alt=""><div class="nm">${esc(C0.name)}</div></div>
      <div class="vsoon"><b>${loading ? 'Loading variants…' : 'Variants coming'}</b><p>${loading ? 'Fetching the five Moments variants for ' + esc(C0.name) + '.' : esc(C0.name) + ' has no variant content yet. Pick another class above; this one will appear here once its five variants are written.'}</p>${why}</div>`;
  }
  /* kullanilabilir genislige gore kolon genisligi (104..140); dar ekranda 104 ve yatay kayar */
  function pickColw() {
    const sheet = $('#sheet'), cs = getComputedStyle(sheet), inner = sheet.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const labw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--labw')) || 196;
    return Math.max(104, Math.min(140, Math.floor((inner - labw - 6 - 2 * G.PADX) / G.COLS)));
  }

  /* ---------- class / varyant secimi ---------- */
  function resolveV(c, v) {
    if (v === 'pick') return c === 'warrior' ? 'pick' : 1;
    const n = +v; return n >= 1 && n <= NVAR ? n : defaultV(c);
  }
  /* class + varyant degisir: puanlar sifirlanir, yeniden cizilir; dosya onbellekte degilse once yer tutucu, sonra yuklenince agac */
  function go(c, v, keepFocus) {
    if (!keepFocus) ST.pendingFocus = null;
    if (!CBY[c]) c = 'warrior';
    ST.c = c; ST.v = resolveV(c, v); ST.S = MC.newState(); ST.plan = null; ST.fail = null; ST.content = null; ST.rowsC = null; ST.fa = 0; ST.fb = 1;
    const tok = ++ST.tok;
    ST.vf = VCACHE[c] ? { state: 'ok', data: VCACHE[c] } : { state: 'loading' };
    writeHash(); present();
    if (!VCACHE[c]) loadVariants(c).then((r) => {
      if (tok !== ST.tok) return; /* arada baska class secildi */
      ST.vf = r.ok ? { state: 'ok', data: r.data } : { state: 'missing', err: r.err };
      ST.content = null; ST.rowsC = null;
      if (ST.v !== 'pick' && r.ok && !r.data.variants[ST.v - 1]) ST.v = 1; /* istenen varyant dosyada yok */
      if (ST.v === 'pick') renderClassBar(); /* agac zaten cizili: yalniz sekmeler (yanip sonme yok) */
      else { writeHash(); present(); }
    });
  }
  function present() { if (ready()) build(); else buildPlaceholder(); $('#lv').value = ST.lv; update(); }

  /* ---------- guncelleme (yeniden kurmadan) ---------- */
  function stripState(S, tier) {
    const sp = MC.counter(S);
    if (tier === 'E') {
      const es = MC.evoState(S);
      if (es.capped) return { small: 'Evolve', pt: '2 / 2 used', em: '', lk: true };
      return { small: es.label, pt: es.need + ' pts', em: es.open ? '' : sp + '/' + es.need, lk: !es.open };
    }
    const need = MC.TIER_NEED[tier];
    return { small: 'Tier ' + tier, pt: need === 0 ? 'open' : need + ' pts', em: sp >= need ? '' : sp + '/' + need, lk: sp < need };
  }
  function update() {
    const S = sOf(), lv = ST.lv, fr = MC.free(lv, S);
    $('#lvv').textContent = lv; $('#lvp').textContent = fr + ' / ' + MC.pool(lv);
    if (!R) return;
    const sp = MC.counter(S);
    $('#spv').textContent = sp; $('#upv').textContent = MC.ultSpent(S) + ' / ' + MC.ULT_MAX; const fe = $('#frv'); fe.textContent = fr; fe.className = fr === 0 ? 'z' : '';
    $('#lvline').textContent = `Level ${lv} · ${MC.pool(lv)} points`;
    $('#bval').textContent = MC.barVal(S); $('#bf').style.width = (MC.barVal(S) / MC.BARMAX * 100) + '%';
    $$('.mk').forEach((e) => e.classList.toggle('rc', sp >= +e.dataset.t));
    for (const key in R.nodes) {
      const e = R.nodes[key], st = MC.status(lv, S, key); e.st = st;
      e.el.className = e.base + ' st-' + st.st; if (e.pp) e.pp.textContent = '●'.repeat(st.rank) + '○'.repeat(st.max - st.rank);
    }
    R.lines.forEach((l) => {
      const rb = MC.rk(S, l.b); let cls;
      if (l.a == null) cls = rb > 0 ? ' on' : '';
      else if (l.a === 'C') cls = rb > 0 ? ' on' : '';
      else { const ra = MC.rk(S, l.a); cls = ra > 0 && rb > 0 ? ' on' : ra > 0 ? ' half' : ''; }
      l.el.setAttribute('class', l.base + cls);
    });
    R.strips.forEach((s) => {
      const t = stripState(S, s.tier); s.sm.textContent = t.small; s.pt.textContent = t.pt; s.em.textContent = t.em; s.el.classList.toggle('lk', t.lk);
    });
    R.bands.forEach((b) => { b.el.classList.toggle('lk', stripState(S, b.tier).lk); });
    for (const i in R.pts) R.pts[i].textContent = MC.rowSpent(S, +i);
    let up = 0;
    MC.ARMS.forEach((arm) => { let n = 0; [1, 2, 3].forEach((s) => { const key = ULT + '.' + arm + s; n += MC.rk(S, key); R.ulv[key].classList.toggle('lk', lv < MC.ULT_LV[s - 1]); }); up += n; const e = R.arms[arm]; e.querySelector('b').textContent = n + ' / 3'; e.classList.toggle('full', n === 3); });
    $('#upts').textContent = up; $('#upts').parentNode.classList.toggle('full', up >= MC.ULT_MAX);
    markTimeline(); refreshTip();
  }

  /* ---------- ipucu (A Band) ---------- */
  const tipEl = $('#tip'); let toastT = 0, failT = 0;
  const dia = '<span class="dia"></span>';
  const line = (h) => `<div class="ln">${dia}<span class="tx">${h}</span></div>`;
  function lockInfo(nd, S, lv) {
    if (nd.arm) { const need = MC.ultLv(nd); return { tier: 'Ult · ' + MC.ARM_NAME[nd.arm] + ' arm', lock: 'Lv ' + need, open: lv >= need }; }
    if (nd.kind === 'V') {
      if (MC.rk(S, nd.key) > 0) return { tier: 'Evolve', lock: 'Taken', open: true };
      const es = MC.evoState(S);
      return es.capped ? { tier: 'Evolve', lock: '2 / 2 used', open: false } : { tier: es.label, lock: es.need + ' pts', open: es.open };
    }
    const need = MC.TIER_NEED[nd.tier];
    return { tier: 'Tier ' + nd.tier, lock: need ? need + ' pts' : 'Open', open: MC.counter(S) >= need };
  }
  function nodeTip(key) {
    const nd = MC.BY[key], S = sOf(), lv = ST.lv, info = nodeInfo(key), st = MC.status(lv, S, key), rr = rows()[nd.i], k = nd.kind;
    const cls = k === 'V' ? 'ev' : k === 'B' ? 'bp' : nd.arm ? 'ul' : rr.pas ? 'ps' : '';
    const kind = nd.arm ? `Ult ${KN[k]} · ${rr.name}` : `${KN[k]} · ${rr.name}`;
    const li = lockInfo(nd, S, lv), chips = [`<span class="chip ac">${KN[k]}</span>`];
    if (nd.max > 1) chips.push(`<span class="chip">Rank ${st.rank} / ${nd.max}</span>`);
    chips.push(st.rank > 0 ? '<span class="chip ok">Taken</span>' : '<span class="chip">Not taken</span>');
    chips.push(`<span class="chip">${esc(li.tier)}</span>`, `<span class="chip${li.open ? ' ok' : ''}">${esc(li.lock)}</span>`);
    if (info.nw) chips.push('<span class="chip nw">NEW</span>');
    const lines = [line(esc(info.eff))];
    if (info.note) lines.push(line('<span class="k">Ömer\'in notu:</span> ' + esc(info.note)));
    if (!info.empty) { /* bos yuvada ipucu tek satir: yalniz 'Not picked yet' */
      if (k === 'V') lines.push(line('<span class="k">Evolves in place:</span> the skill keeps its slot and gains this behaviour. Evolve I needs 23 points in the passive and skill rows, Evolve II needs 38 (ult points do not count); two per hero at most.'));
      if (k === 'B') lines.push(line('<span class="k">Blood Price:</span> a gain with a cost. Dead end: nothing unlocks after it.'));
      if (nd.arm) lines.push(line('<span class="k">Ult arm:</span> arms are free, but the ult takes ' + MC.ULT_MAX + ' points at most in total (' + MC.ultSpent(S) + ' / ' + MC.ULT_MAX + ' spent). 1 point per node. Locked by level, not by points; no Evolve here. Ult points do not count toward Tier locks or the Mastery bar.'));
      if (info.nw) lines.push(line('<span class="k">NEW:</span> needs a new engine rule.'));
      if (nd.req.length) lines.push(line('<span class="k">Needs:</span> ' + nd.req.map((term) => term.map((q) => { const met = MC.rk(S, q) > 0; return (met ? '' : '<span class="no">') + esc(nameOf(q)) + (met ? '' : '</span>'); }).join(' or ')).join(' + ')));
    }
    const fl = ST.fail && ST.fail.key === key ? ST.fail.msg : null; let foot;
    if (fl) foot = `<div class="tp-foot bad">${dia}<span class="tx">${esc(fl)}</span></div>`;
    else if (st.rank === 0 && st.check && st.check.code !== 'points') foot = `<div class="tp-foot lock">${dia}<span class="tx">${st.check.code === 'ultcap' ? '' : 'Locked: '}${esc(st.check.text)}</span></div>`;
    else foot = `<div class="tp-foot">${dia}<span class="tx">${st.rank > 0 ? 'Click +1 · right-click −1' : 'Click to spend 1 point'}</span></div>`;
    const ctl = `<div class="tp-ctl"><button type="button" data-act="-1" aria-label="Remove a point">−</button><span class="rk">${st.rank} / ${nd.max}</span><button type="button" data-act="1" aria-label="Add a point">+</button></div>`;
    return `<div class="tp va ${cls}"><div class="tp-head"><div class="tp-medal" style="${medalBg(rr.ic)}"></div><div class="tp-ht"><div class="tp-kind">${esc(kind)}</div><div class="tp-title">${esc(info.name)}</div></div><div class="tp-aside"><div class="big">1<small>${nd.max > 1 ? 'POINT / RANK' : 'POINT'}</small></div></div></div><div class="tp-meta">${chips.join('')}</div><div class="tp-div"></div><div class="tp-body">${lines.join('')}</div>${foot}${ctl}${info.src ? `<div class="tp-src">from ${esc(info.src)}</div>` : ''}</div>`;
  }
  function bonusTip(i) {
    const b = barInfo(i), S = sOf(), t = MC.BAR_THR[i], sp = MC.counter(S), on = sp >= t;
    const foot = b.tbd ? `Needs ${t} points in the passive and skill rows; the Lv 50 bar. Content to be decided.` : on ? 'Reached: ' + sp + ' of ' + t : 'Spend ' + (t - sp) + ' more point' + (t - sp === 1 ? '' : 's') + ' in the passive and skill rows';
    return `<div class="tp va cp"><div class="tp-head"><div class="tp-ht"><div class="tp-kind">Mastery bonus · ${esc(masteryName())}</div><div class="tp-title">${esc(b.name)}</div></div><div class="tp-aside"><div class="big">${t}<small>BAR</small></div></div></div>
      <div class="tp-meta"><span class="chip ac">Bar ${t}</span><span class="chip${on ? ' ok' : ''}">${on ? (b.tbd ? 'Reached' : 'Active') : 'Not reached'}</span></div><div class="tp-div"></div><div class="tp-body">${line(esc(b.eff))}</div><div class="tp-foot">${dia}<span class="tx">${esc(foot)}</span></div>${b.src ? `<div class="tp-src">from ${esc(b.src)}</div>` : ''}</div>`;
  }
  function rowTip(i) {
    const rr = rows()[i], S = sOf(), kind = rr.ult ? 'Ultimate' : rr.pas ? 'Passive' : 'Skill';
    return `<div class="tp va ${rr.pas ? 'ps' : ''}"><div class="tp-head"><div class="tp-medal" style="${medalBg(rr.ic)}"></div><div class="tp-ht"><div class="tp-kind">${kind} · ${esc(CBY[ST.c].name)}</div><div class="tp-title">${esc(rr.name)}</div></div><div class="tp-aside"><div class="big">${MC.rowSpent(S, i)}<small>POINTS</small></div></div></div><div class="tp-div"></div><div class="tp-body">${line(esc(rr.d || kind))}</div></div>`;
  }
  function tipHTML(ref) { const [t, id] = [ref.slice(0, 1), ref.slice(2)]; return t === 'n' ? nodeTip(id) : t === 'b' ? bonusTip(+id) : rowTip(+id); }
  function showTip(el, pin) {
    const ref = el.dataset.tip; ST.tip = ref; tipEl.innerHTML = tipHTML(ref); tipEl.classList.add('show'); tipEl.classList.toggle('pin', !!pin);
    tipEl.style.left = '0px'; tipEl.style.top = '0px';
    const r = (el.classList.contains('mk') ? $('i', el) : el).getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = r.right + 12; if (x + w > vw - 8) x = r.left - w - 12; if (x < 8) x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    let y = r.top + r.height / 2 - h / 2; if (x < r.right && x + w > r.left) y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    y = Math.max(8, Math.min(vh - h - 8, y)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.classList.remove('show', 'pin'); $$('.pin').forEach((e) => e.classList.remove('pin')); ST.pinned = null; ST.tip = null; }
  function refreshTip() { if (!ST.tip) return; const el = $(`[data-tip="${ST.tip}"]`); if (!el) { hideTip(); return; } const was = tipEl.classList.contains('pin'); const l = tipEl.style.left, t = tipEl.style.top; tipEl.innerHTML = tipHTML(ST.tip); if (was) { tipEl.style.left = l; tipEl.style.top = t; } }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function fail(key, msg) {
    ST.fail = { key, msg }; toast(msg); clearTimeout(failT); failT = setTimeout(() => { ST.fail = null; refreshTip(); }, 2600);
    const n = R && R.nodes[key]; if (n) { n.el.classList.remove('shake'); void n.el.offsetWidth; n.el.classList.add('shake'); }
  }

  /* ---------- eylemler ---------- */
  function detach() { const P = planOf(); if (P && P.live) { P.live = false; renderFocusOut(); } }
  function act(key, d) {
    if (!R) return;
    const S = sOf(), res = d > 0 ? MC.take(ST.lv, S, key) : MC.untake(ST.lv, S, key);
    if (!res.ok) fail(key, res.reason); else { ST.fail = null; detach(); }
    update();
  }
  function ensureValid() { const S = sOf(); if (MC.validate(ST.lv, S)) { MC.reset(S); detach(); toast('Level lowered: tree reset'); return true; } return false; }
  function setLevel(v) {
    ST.lv = Math.max(1, Math.min(MC.MAXLV, v)); const P = planOf();
    if (P && P.live) ST.S = MC.replay(P, ST.lv); else ensureValid();
    $('#lv').value = ST.lv; writeHash(); update();
  }
  function runFocus(a, b) {
    if (!R) return;
    ST.fa = a; ST.fb = b; const P = MC.focusPlan(a, b); ST.plan = P;
    ST.S = MC.replay(P, ST.lv); ST.fail = null; hideTip(); renderFocus(); update();
    toast('Focus run: ' + rows()[a].name + ' + ' + rows()[b].name + ' · Evolve I Lv ' + P.e1 + ' · Evolve II Lv ' + P.e2);
  }

  /* ---------- adres ---------- */
  const OLD_C = { w: 'warrior', h: 'hexer' };
  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1)); const lv = +h.get('lv');
    let c = h.get('c'), v = h.get('v');
    if (c && OLD_C[c]) { c = OLD_C[c]; if (!v) v = c === 'warrior' ? 'pick' : '1'; } /* eski adres: #c=w -> Omer'in secimi, #c=h -> hexer v1 */
    if (!c || !CBY[c]) c = 'warrior';
    ST.c = c; ST.v = resolveV(c, v == null ? defaultV(c) : v);
    if (lv >= 1 && lv <= MC.MAXLV) ST.lv = lv;
    const f = (h.get('focus') || '').match(/^([0-3])-([0-3])$/); ST.pendingFocus = f && f[1] !== f[2] ? [+f[1], +f[2]] : null;
    ST.clean = h.has('clean'); document.documentElement.classList.toggle('mk-clean', ST.clean);
  }
  function writeHash() { history.replaceState(null, '', '#c=' + ST.c + '&v=' + ST.v + '&lv=' + ST.lv + (ST.clean ? '&clean' : '')); }

  /* ---------- olaylar ---------- */
  let lastPtr = 'mouse', lpT = 0, suppress = false, lpX = 0, lpY = 0;
  document.addEventListener('pointerdown', (e) => {
    lastPtr = e.pointerType || 'mouse';
    if (!e.target.closest('[data-tip]') && !e.target.closest('#tip')) hideTip();
    const nd = e.target.closest('.nd');
    clearTimeout(lpT);
    if (nd && lastPtr !== 'mouse') { lpX = e.clientX; lpY = e.clientY; lpT = setTimeout(() => { suppress = true; act(nd.dataset.key, -1); }, 520); }
  }, true);
  ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => clearTimeout(lpT), true));
  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 12) clearTimeout(lpT); }, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse' || ST.pinned) return; const el = e.target.closest('[data-tip]'); if (el) showTip(el, false); });
  document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse' || ST.pinned) return; const el = e.target.closest('[data-tip]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) { tipEl.classList.remove('show'); ST.tip = null; } });
  document.addEventListener('contextmenu', (e) => { const nd = e.target.closest('.nd'); if (!nd) return; e.preventDefault(); if (lastPtr === 'mouse') act(nd.dataset.key, -1); });
  document.addEventListener('click', (e) => {
    const ctl = e.target.closest('[data-act]'); if (ctl && ST.tip && ST.tip[0] === 'n') { act(ST.tip.slice(2), +ctl.dataset.act); return; }
    const t = e.target.closest('[data-tip]');
    if (t) {
      if (suppress) { suppress = false; return; }
      const isNode = t.classList.contains('nd');
      if (lastPtr !== 'mouse') {
        if (ST.pinned !== t) { hideTip(); ST.pinned = t; t.classList.add('pin'); showTip(t, true); return; }
        if (isNode) act(t.dataset.key, 1);
        return;
      }
      if (isNode) act(t.dataset.key, 1);
      return;
    }
    const c = e.target.closest('[data-cls]'); if (c) { go(c.dataset.cls, defaultV(c.dataset.cls)); return; }
    const vb = e.target.closest('[data-var]'); if (vb && !vb.disabled) { go(ST.c, vb.dataset.var === 'pick' ? 'pick' : +vb.dataset.var); return; }
    const ev = e.target.closest('.evc'); if (ev) { setLevel(+ev.dataset.lv); return; }
    if (e.target.closest('#fc-run')) { runFocus(+$('#fc-a').value, +$('#fc-b').value); return; }
    if (e.target.closest('#reset')) { MC.reset(sOf()); detach(); ST.fail = null; hideTip(); update(); return; }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'fc-a' && e.target.id !== 'fc-b') return;
    let a = +$('#fc-a').value, b = +$('#fc-b').value;
    if (a === b) { if (e.target.id === 'fc-a') b = (a + 1) % NROWS; else a = (b + 1) % NROWS; $('#fc-a').value = a; $('#fc-b').value = b; }
    ST.fa = a; ST.fb = b;
  });
  $('#lv').addEventListener('input', (e) => setLevel(+e.target.value));
  window.addEventListener('hashchange', () => { readHash(); go(ST.c, ST.v, true); });
  let rzT = 0; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (R && pickColw() !== G.COLW) { const t = $('#tree'), sx = t ? t.scrollLeft : 0; build(); const t2 = $('#tree'); if (t2) t2.scrollLeft = sx; } }, 160); });
  window.addEventListener('scroll', () => { if (ST.pinned) hideTip(); }, true);

  renderInfoBox(); readHash(); go(ST.c, ST.v, true);
  window.__SMM = { ST, sOf, build, update, MC, CT, nodeInfo, runFocus, setLevel, go, loadVariants, VCACHE, rows, present };
})();
