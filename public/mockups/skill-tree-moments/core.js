/* MOMENTS SKILL AGACI: KURAL MOTORU (mockup, oyun kodu DEGIL). Belge: docs/design/skill-tree-moments.md.
   Tarayicida window.SMM, Node'da require. Saf fonksiyonlar, DOM yok.
   Durum: S = { r: { 'satir.id': rank } }.  Satir 0 = pasif, 1-3 = aktif skill, 4 = ult (+ agaci).
   Puan = level - 1.  SAYAC = agaca harcanan toplam puan (her satir + ult).
   Kilitler: Tier II 5 / III 10 / IV 15 puan; Evolve I 23, Evolve II 38 (en cok 2 evolve); ult dugumleri LEVEL kilidi (5 / 10 / 15).
   Ult tavani (Omer 2026-10-21): ult + agacina TOPLAM en cok 3 puan (kollar serbest, kilitler ve ic dugum kurali ayni). */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.SMM = f(); })(this, function () {
  const MAXLV = 50, BARMAX = 49, ULT = 4;
  const BAR_THR = [5, 10, 15, 20, 25, 30, 35, 40, 45];
  const TIER_NEED = { I: 0, II: 5, III: 10, IV: 15 };
  const EVO_NEED = [23, 38], EVO_MAX = 2;
  const ULT_LV = [5, 10, 15], ULT_MAX = 3;
  const ARMS = ['u', 'r', 'd', 'l'];
  const ARM_NAME = { u: 'Up', r: 'Right', d: 'Down', l: 'Left' };
  const ROMAN = ['I', 'II', 'III', 'IV'];

  /* ---- satir sekli (belge bolum 1): id, tur, rank, tier, sutun, serit, gerek ('a|b' = biri yeter) ---- */
  const ROW_DEF = [
    ['f1', 'F', 3, 'I', 0, 0, ''], ['f2', 'F', 5, 'I', 1, 0, 'f1'], ['f3', 'F', 5, 'I', 2, 0, 'f2'],
    ['n0', 'N', 1, 'II', 3, 0, 'f3'], ['r', 'F', 3, 'III', 4, 0, 'n0'],
    ['ea', 'E', 1, 'III', 5, -1, 'r'], ['eb', 'E', 1, 'III', 5, 1, 'r'],
    ['ma', 'N', 1, 'IV', 6, -1.5, 'ea'], ['fa', 'B', 1, 'IV', 6, -0.5, 'ea'],
    ['fb', 'B', 1, 'IV', 6, 0.5, 'eb'], ['mb', 'N', 1, 'IV', 6, 1.5, 'eb'],
    ['v', 'V', 1, 'E', 7, 0, 'ma|mb'],
  ];
  /* ---- dugum tablosu ---- */
  const NODES = [], BY = {};
  for (let i = 0; i < ULT; i++) {
    ROW_DEF.forEach((d) => {
      const nd = { key: i + '.' + d[0], i, id: d[0], kind: d[1], max: d[2], tier: d[3], col: d[4], lane: d[5], arm: null, step: 0,
        req: d[6] ? d[6].split(',').map((t) => t.split('|').map((x) => i + '.' + x)) : [] };
      NODES.push(nd); BY[nd.key] = nd;
    });
  }
  ARMS.forEach((arm) => {
    for (let s = 1; s <= 3; s++) {
      const nd = { key: ULT + '.' + arm + s, i: ULT, id: arm + s, kind: s === 3 ? 'N' : 'E', max: 1, tier: 'L' + ULT_LV[s - 1], col: 0, lane: 0, arm, step: s,
        req: s > 1 ? [[ULT + '.' + arm + (s - 1)]] : [] };
      NODES.push(nd); BY[nd.key] = nd;
    }
  });

  let namer = (k) => k; // ad cozucu (app.js icerikten baglar)
  const pool = (lv) => Math.max(0, lv - 1);
  const rk = (S, key) => S.r[key] || 0;
  const spent = (S) => { let t = 0; for (const k in S.r) t += S.r[k]; return t; };
  const rowSpent = (S, i) => { let t = 0; const p = i + '.'; for (const k in S.r) if (k.indexOf(p) === 0) t += S.r[k]; return t; };
  const ultSpent = (S) => rowSpent(S, ULT);
  const free = (lv, S) => pool(lv) - spent(S);
  const newState = () => ({ r: {} });
  const reset = (S) => { S.r = {}; };
  const evoKeys = (S) => NODES.filter((n) => n.kind === 'V' && rk(S, n.key) > 0).map((n) => n.key);
  const evoCount = (S) => evoKeys(S).length;
  const termMet = (S, term) => term.some((k) => rk(S, k) > 0);
  const unmetTerm = (S, nd) => { for (const term of nd.req) if (!termMet(S, term)) return term; return null; };
  const needsText = (term) => 'Needs ' + term.map((k) => namer(k)).join(' or ');
  const tierName = (t) => (t === 'E' ? 'Evolve' : t[0] === 'L' ? 'Ult ' + t.replace('L', 'Lv ') : 'Tier ' + t);
  const ultLv = (nd) => ULT_LV[nd.step - 1];

  /* ---- bir dugume +1 rank konabilir mi? null = evet; yoksa {code, text}. noPts: puan sinirini sayma (dogrulama) ---- */
  function check(lv, S, key, noPts) {
    const nd = BY[key]; if (!nd) return { code: 'none', text: 'Unknown node' };
    if (rk(S, key) >= nd.max) return { code: 'max', text: 'Max rank' };
    if (nd.kind === 'V') {
      const n = evoCount(S);
      if (n >= EVO_MAX) return { code: 'cap', text: 'Only ' + EVO_MAX + ' Evolves per hero' };
      const um = unmetTerm(S, nd); if (um) return { code: 'needs', text: needsText(um) };
      const need = EVO_NEED[n], sp = spent(S);
      if (sp < need) return { code: 'evo', text: 'Evolve ' + ROMAN[n] + ' needs ' + need + ' points spent (have ' + sp + ')', need, have: sp };
    } else if (nd.arm) {
      if (ultSpent(S) >= ULT_MAX) return { code: 'ultcap', text: 'Ult takes ' + ULT_MAX + ' points at most' };
      const need = ultLv(nd);
      if (lv < need) return { code: 'tier', text: 'Ult node needs Lv ' + need + ' (you are Lv ' + lv + ')', need, have: lv };
      const um = unmetTerm(S, nd); if (um) return { code: 'needs', text: needsText(um) };
    } else {
      const need = TIER_NEED[nd.tier], sp = spent(S);
      if (sp < need) return { code: 'tier', text: 'Tier ' + nd.tier + ' needs ' + need + ' points spent (have ' + sp + ')', need, have: sp };
      const um = unmetTerm(S, nd); if (um) return { code: 'needs', text: needsText(um) };
    }
    if (!noPts && free(lv, S) <= 0) return { code: 'points', text: 'No points left' };
    return null;
  }
  function take(lv, S, key) {
    const c = check(lv, S, key); if (c) return { ok: false, reason: c.text, code: c.code };
    S.r[key] = rk(S, key) + 1; return { ok: true };
  }

  /* ---- gecerlilik: tum harcama bos agactan yasal sirayla kurulabilir mi (acgozlu kurulum). Geri alma + level dususu bunu kullanir ---- */
  function validate(lv, S) {
    const keys = Object.keys(S.r).filter((k) => S.r[k] > 0);
    if (spent(S) > pool(lv)) return { key: keys[0] || null, text: 'Too many points for this level', code: 'points' };
    const T = newState(), rem = {}; keys.forEach((k) => { rem[k] = S.r[k]; });
    let progress = true;
    while (progress) {
      progress = false;
      for (const k of keys) while (rem[k] > 0) { if (check(lv, T, k, true)) break; T.r[k] = rk(T, k) + 1; rem[k]--; progress = true; }
    }
    for (const k of keys) if (rem[k] > 0) { const c = check(lv, T, k, true); return { key: k, text: c ? c.text : 'Invalid', code: c ? c.code : 'x', need: c && c.need }; }
    return null;
  }
  function untake(lv, S, key) {
    if (!(rk(S, key) > 0)) return { ok: false, reason: 'Nothing to remove' };
    S.r[key]--; const v = validate(lv, S);
    if (v) {
      let reason;
      /* dogrudan bagli bir dugum varsa: 'Needed by X' */
      const dep = rk(S, key) === 0 ? NODES.find((d) => rk(S, d.key) > 0 && d.req.some((term) => term.indexOf(key) >= 0 && !termMet(S, term))) : null;
      if (dep) reason = 'Needed by ' + namer(dep.key);
      else if (v.code === 'tier') reason = 'Tier ' + BY[v.key].tier + ' (' + TIER_NEED[BY[v.key].tier] + ' pts) still needed by ' + namer(v.key);
      else if (v.code === 'evo') reason = 'Counter ' + v.need + ' still needed by ' + namer(v.key);
      else reason = 'Needed by ' + namer(v.key);
      S.r[key]++;
      return { ok: false, reason, by: v.key, detail: v.text };
    }
    if (S.r[key] === 0) delete S.r[key];
    return { ok: true };
  }

  /* ---- dugumun arayuz durumu: max / part / av (alinabilir) / tlk (kilitli) / rq (gerek eksik) / xl (evolve ya da ult siniri) ---- */
  function status(lv, S, key) {
    const nd = BY[key], r = rk(S, key), c = check(lv, S, key);
    let st;
    if (r >= nd.max) st = 'max'; else if (r > 0) st = 'part';
    else if (!c || c.code === 'points') st = 'av';
    else st = c.code === 'tier' || c.code === 'evo' ? 'tlk' : c.code === 'cap' || c.code === 'ultcap' ? 'xl' : 'rq';
    return { rank: r, max: nd.max, st, check: c };
  }
  /* herhangi bir dugum alinabilir mi (puan sayilmadan degil, puanla) */
  const anyOpen = (lv, S) => NODES.some((n) => !check(lv, S, n.key));

  /* ---- bar ---- */
  const barVal = (S) => Math.min(BARMAX, spent(S));
  const bonusReached = (S) => BAR_THR.map((t) => spent(S) >= t);

  /* ---- Evolve durumu (sayac): sonraki evolve kacinci, kac puan ister, simdi acik mi ---- */
  function evoState(S) {
    const n = evoCount(S), sp = spent(S);
    if (n >= EVO_MAX) return { n, capped: true, need: null, open: false, have: sp, label: 'Evolve' };
    return { n, capped: false, need: EVO_NEED[n], open: sp >= EVO_NEED[n], have: sp, label: 'Evolve ' + ROMAN[n] };
  }

  /* ---- FOCUS CHECK: iki satira odaklanan oyuncu level level harcar (belge bolum 3) ----
     A: 1. satir (once doldurulur, sonra evolve), B: 2. satir (once yol dugumleri, sonra rank'lar, sayac 38 olunca evolve).
     Her adimda "sirada acik olan ilk dugum" secilir; kural motoru check() ile ayni. */
  const PRI_A = ['n0', 'ma', 'fa', 'mb', 'fb', 'ea', 'eb', 'r', 'f3', 'f2', 'f1'];
  const PATH_B = ['f1', 'f2', 'f3', 'n0', 'r', 'ea', 'ma'];
  const EXTRA_B = ['f3', 'f2', 'f1', 'r', 'fa', 'eb', 'fb', 'mb', 'ea'];
  function nextFocusKey(lv, S, A, B) {
    for (const R of [A, B]) { const vk = R + '.v'; if (!rk(S, vk) && !check(lv, S, vk)) return vk; }
    for (const id of PRI_A) { const k = A + '.' + id; if (!check(lv, S, k)) return k; }
    for (const id of PATH_B) { const k = B + '.' + id; if (rk(S, k) < 1 && !check(lv, S, k)) return k; }
    for (const id of EXTRA_B) { const k = B + '.' + id; if (!check(lv, S, k)) return k; }
    return null;
  }
  function focusPlan(A, B) {
    const S = newState(), steps = [], events = [], nulls = [], seen = {};
    for (let lv = 2; lv <= MAXLV; lv++) {
      const key = nextFocusKey(lv, S, A, B);
      if (!key) { steps.push({ lv, key: null }); nulls.push(lv); continue; }
      const res = take(lv, S, key); if (!res.ok) throw new Error('focus step rejected: ' + key + ' ' + res.reason);
      steps.push({ lv, key });
      const nd = BY[key], tag = (what) => { if (!seen[what]) { seen[what] = 1; return true; } return false; };
      if (nd.id === 'n0' && nd.i === A && tag('n0')) events.push({ lv, kind: 'notable', text: 'Notable n0', row: A, key });
      if (nd.i === A && nd.tier === 'III' && tag('t3')) events.push({ lv, kind: 'tier', text: 'Tier III', row: A, key });
      if (nd.i === A && nd.tier === 'IV' && tag('t4')) events.push({ lv, kind: 'tier', text: 'Tier IV', row: A, key });
      if (nd.id === 'v' && nd.i === A) events.push({ lv, kind: 'evolve', text: 'Evolve I', row: A, key });
      if (nd.i === B && nd.kind === 'N' && nd.id !== 'n0' && tag('bn')) events.push({ lv, kind: 'notable', text: 'Notable ' + nd.id, row: B, key });
      if (nd.id === 'v' && nd.i === B) events.push({ lv, kind: 'evolve', text: 'Evolve II', row: B, key });
    }
    events.sort((a, b) => a.lv - b.lv);
    const ev = (t) => { const e = events.find((x) => x.text === t); return e ? e.lv : null; };
    return { A, B, steps, events, nulls, e1: ev('Evolve I'), e2: ev('Evolve II'), live: true };
  }
  /* planin level 'lv' aninda ulasilan durumu (puan = lv - 1, ilk adim L2) */
  function replay(plan, lv) {
    const S = newState();
    for (const st of plan.steps) { if (st.lv > lv) break; if (st.key) S.r[st.key] = rk(S, st.key) + 1; }
    return S;
  }

  return { MAXLV, BARMAX, ULT, BAR_THR, TIER_NEED, EVO_NEED, EVO_MAX, ULT_LV, ULT_MAX, ARMS, ARM_NAME, ROMAN, ROW_DEF, NODES, BY,
    pool, rk, spent, rowSpent, ultSpent, free, newState, reset, evoKeys, evoCount, evoState, termMet, unmetTerm, needsText, tierName, ultLv,
    check, take, validate, untake, status, anyOpen, barVal, bonusReached, focusPlan, replay, setNamer: (f) => { namer = f; } };
});
