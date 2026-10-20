/* MASTERY BAR v2: KURAL MOTORU (mockup, oyun kodu DEGIL). Saf fonksiyonlar: tarayicida window.SMC, Node'da require.
   Sekiller shapes.js'te. Brief: docs/design/skill-tree-mastery-v2.md.
   Durum: S = { r: { 'satir.id': rank } }  (kopru: 'B.id'). Puan = level - 1. Evolve karakter basina 1 (tum satirlar), yalnizca L30. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(require('./shapes.js')); else root.SMC = f(root.SMV_SHAPES); })(this, function (SH) {
  const THR = [5, 10, 15, 20, 25], BARMAX = 29, MAXLV = 30;
  let namer = (k) => k; // ad cozucu (app.js icerikten baglar): 'Needs X' / 'Needed by X' metinleri icin

  const pool = (lv) => Math.max(0, lv - 1);
  const rk = (S, key) => S.r[key] || 0;
  const spent = (S) => { let t = 0; for (const k in S.r) t += S.r[k]; return t; };
  const rowSpent = (S, i) => { let t = 0; const p = i + '.'; for (const k in S.r) if (k.indexOf(p) === 0) t += S.r[k]; return t; };
  const free = (lv, S) => pool(lv) - spent(S);
  const newState = () => ({ r: {} });
  const reset = (S) => { S.r = {}; };

  /* ---- tier kilidi ---- */
  const tierName = (t) => (t === 'E' ? 'Evolve' : t === 'B' ? 'Bond' : t === 'P' ? 'Passive' : 'Tier ' + t);
  function lockLabel(lk) {
    if (lk.k === 'level') return 'Lv ' + lk.v;
    if (lk.k === 'open' || lk.v === 0) return 'Open';
    return (lk.k === 'bar' ? 'Bar ' : lk.k === 'row' ? 'Row ' : 'Passive ') + lk.v;
  }
  /* o satir icin (i) bu kilidin su anki "elimizdeki" degeri; level icin lv */
  function lockHave(lk, lv, S, i) {
    return lk.k === 'level' ? lv : lk.k === 'bar' ? spent(S) : lk.k === 'row' ? rowSpent(S, i) : lk.k === 'passive' ? rowSpent(S, 0) : 0;
  }
  /* tier acik mi? i = satir (kopruler icin -1 / kullanilmaz: bar). {open, have, need, label, text} */
  function tierState(sh, lv, S, tier, i) {
    const lk = sh.tiers[tier]; const have = lockHave(lk, lv, S, i), open = lk.k === 'open' || have >= lk.v;
    const lab = lockLabel(lk); let text;
    if (lk.k === 'level') text = tierName(tier) + ' opens at Lv ' + lk.v;
    else if (lk.v === 0 || lk.k === 'open') text = tierName(tier) + ' is always open';
    else if (lk.k === 'bar') text = tierName(tier) + ' opens at Bar ' + lk.v + ' (have ' + have + ')';
    else if (lk.k === 'row') text = tierName(tier) + ' opens at ' + lk.v + ' points in this row (have ' + have + ')';
    else text = tierName(tier) + ' opens at ' + lk.v + ' Passive points (have ' + have + ')';
    return { open, have, need: lk.v, kind: lk.k, label: lab, text };
  }

  /* ---- gerekler ---- */
  const termMet = (S, term) => term.some((k) => rk(S, k) > 0);
  function unmetTerm(S, nd) { for (const term of nd.req) if (!termMet(S, term)) return term; return null; }
  const needsText = (term) => 'Needs ' + term.map((k) => namer(k)).join(' or ');
  function exclBlocked(sh, S, nd) {
    if (!nd.excl) return false;
    for (const o of sh.nodes) if (o.i === nd.i && o.excl && o.excl.g === nd.excl.g && o.excl.side !== nd.excl.side && rk(S, o.key) > 0) return true;
    return false;
  }
  const evolveKey = (sh, S) => { for (const n of sh.nodes) if (n.kind === 'V' && rk(S, n.key) > 0) return n.key; return null; };

  /* bir dugume +1 rank konabilir mi? null = evet; yoksa {code, text}. noPts: puan sinirini sayma (dogrulama icin) */
  function check(sh, lv, S, key, noPts) {
    const nd = sh.byKey[key]; if (!nd) return { code: 'none', text: 'Unknown node' };
    if (rk(S, key) >= nd.max) return { code: 'max', text: 'Max rank' };
    if (exclBlocked(sh, S, nd)) return { code: 'excl', text: 'Other path chosen' };
    const ts = tierState(sh, lv, S, nd.tier, nd.i); if (!ts.open) return { code: 'tier', text: ts.text };
    const um = unmetTerm(S, nd); if (um) return { code: 'needs', text: needsText(um) };
    if (nd.kind === 'V') { const ev = evolveKey(sh, S); if (ev && ev !== key) return { code: 'evo', text: 'Only one Evolve per hero' }; }
    if (!noPts && free(lv, S) <= 0) return { code: 'points', text: 'No points left' };
    return null;
  }
  const why = (sh, lv, S, key) => { const c = check(sh, lv, S, key); return c ? c.text : null; };
  function take(sh, lv, S, key) {
    const c = check(sh, lv, S, key); if (c) return { ok: false, reason: c.text, code: c.code };
    S.r[key] = rk(S, key) + 1; return { ok: true };
  }

  /* ---- gecerlilik: tum harcama bos agactan yasal sirayla kurulabilir mi (acgozlu kurulum). Geri alma + level dususu bunu kullanir ---- */
  function validate(sh, lv, S) {
    const keys = Object.keys(S.r).filter((k) => S.r[k] > 0);
    if (spent(S) > pool(lv)) return { key: keys[0] || null, text: 'Too many points for this level', code: 'points' };
    const T = newState(), rem = {}; keys.forEach((k) => { rem[k] = S.r[k]; });
    let progress = true;
    while (progress) {
      progress = false;
      for (const k of keys) while (rem[k] > 0) { if (check(sh, lv, T, k, true)) break; T.r[k] = rk(T, k) + 1; rem[k]--; progress = true; }
    }
    for (const k of keys) if (rem[k] > 0) { const c = check(sh, lv, T, k, true); return { key: k, text: c ? c.text : 'Invalid', code: c ? c.code : 'x' }; }
    return null;
  }
  const MC_lock = (sh, nd) => lockLabel(sh.tiers[nd.tier]);
  function untake(sh, lv, S, key) {
    if (!(rk(S, key) > 0)) return { ok: false, reason: 'Nothing to remove' };
    S.r[key]--; const v = validate(sh, lv, S);
    if (v) {
      const nd = v.key && sh.byKey[v.key], direct = !!nd && rk(S, key) === 0 && nd.req.some((term) => term.indexOf(key) >= 0 && !termMet(S, term));
      S.r[key]++;
      /* bagli dugum (gerek): 'Needed by X'; tier kilidi (bar / satir / pasif puani) yuzunden: 'Row 4 still needed by X' */
      const reason = !direct && v.code === 'tier' && nd ? MC_lock(sh, nd) + ' still needed by ' + namer(v.key) : 'Needed by ' + namer(v.key);
      return { ok: false, reason, by: v.key, detail: v.text };
    }
    if (S.r[key] === 0) delete S.r[key];
    return { ok: true };
  }

  /* ---- dugumun arayuz durumu ---- */
  function status(sh, lv, S, key) {
    const nd = sh.byKey[key], r = rk(S, key), c = check(sh, lv, S, key);
    let st;
    if (r >= nd.max) st = 'max'; else if (r > 0) st = 'part';
    else if (!c || c.code === 'points') st = 'av';
    else st = c.code === 'tier' ? 'tlk' : c.code === 'excl' || c.code === 'evo' ? 'xl' : 'rq';
    return { rank: r, max: nd.max, st, check: c, tier: tierState(sh, lv, S, nd.tier, nd.i) };
  }

  /* ---- bar ---- */
  const barVal = (S) => Math.min(BARMAX, spent(S));
  const bonusReached = (S) => THR.map((t) => spent(S) >= t);

  return { THR, BARMAX, MAXLV, pool, rk, spent, rowSpent, free, newState, reset, tierName, lockLabel, lockHave, tierState, termMet, unmetTerm, needsText, exclBlocked, evolveKey, check, why, take, validate, untake, status, barVal, bonusReached, setNamer: (f) => { namer = f; }, SHAPES: SH };
});
