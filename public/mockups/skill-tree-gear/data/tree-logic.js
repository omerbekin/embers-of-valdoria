/* SKILL AGACI (Gear taslagi): oyun-ici kurallar katmani (mockup, oyun kodu DEGIL).
   core.js (SMM) kurallarinin ustune: (1) ea / eb TEK YON (biri alinca oteki yonun edge + notable + blood price kilitlenir),
   (2) onaysiz NEW dugum ("Awaiting approval"), (3) BEKLEYEN puan akisi (stat sayfasi gibi: tik +1 bekleyen, sag tik / uzun basis -1 bekleyen,
   Reset siler, Confirm kaydeder), (4) respec (yer tutucu bedel). Saf fonksiyonlar, DOM yok. Tarayicida window.GT, Node'da require. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(require('./core.js')); else root.GT = f(root.SMM); })(this, function (MC) {
  const BY = MC.BY;
  const rk = (S, k) => S.r[k] || 0;
  const DIR = { ea: 'a', ma: 'a', fa: 'a', eb: 'b', mb: 'b', fb: 'b' }; // hangi yonun dugumu
  let approved = () => true;
  const setApproved = (fn) => { approved = fn; };

  const clone = (S) => ({ r: Object.assign({}, S.r) });
  /* etkin dagilim E = onayli S + bekleyen P */
  function merge(S, P) { const E = clone(S); for (const k in P) E.r[k] = (E.r[k] || 0) + P[k]; return E; }
  const pendingCount = (P) => { let n = 0; for (const k in P) n += P[k]; return n; };

  /* karsi yon alinmis mi (yalniz satir 0-3'un ea / eb ailesi) */
  function dirBlocked(E, key) {
    const nd = BY[key]; if (!nd || nd.arm || !DIR[nd.id]) return false;
    return rk(E, nd.i + '.' + (DIR[nd.id] === 'a' ? 'eb' : 'ea')) > 0;
  }
  /* +1 rank konabilir mi: null = evet, yoksa { code, text } (metin Ingilizce, arayuz aynen gosterir) */
  function check(lv, E, key, noPts) {
    const nd = BY[key]; if (!nd) return { code: 'none', text: 'Unknown node' };
    if (rk(E, key) >= nd.max) return MC.check(lv, E, key, noPts);
    if (!approved(key)) return { code: 'unapproved', text: 'Awaiting approval' };
    if (dirBlocked(E, key)) return { code: 'direction', text: 'Other direction chosen' };
    return MC.check(lv, E, key, noPts);
  }
  /* arayuz durumu: max / part / av / tlk (tier ya da evolve sayaci) / rq (gerek eksik) / xl (sinir) / dir (diger yon) / new (onay bekliyor) */
  function status(lv, E, key) {
    const nd = BY[key], r = rk(E, key), c = check(lv, E, key);
    let st;
    if (r >= nd.max) st = 'max'; else if (r > 0) st = 'part';
    else if (!c || c.code === 'points') st = 'av';
    else if (c.code === 'unapproved') st = 'new';
    else if (c.code === 'direction') st = 'dir';
    else st = c.code === 'tier' || c.code === 'evo' ? 'tlk' : c.code === 'cap' || c.code === 'ultcap' ? 'xl' : 'rq';
    return { rank: r, max: nd.max, st, check: c };
  }
  /* gecerlilik: core.validate + ea/eb birlikte olamaz + onaysiz dugum olamaz */
  function validate(lv, E) {
    for (const k in E.r) if (E.r[k] > 0) { if (!BY[k]) return { key: k, text: 'Unknown node' }; if (!approved(k)) return { key: k, text: 'Awaiting approval' }; }
    for (let i = 0; i < 4; i++) if (rk(E, i + '.ea') > 0 && rk(E, i + '.eb') > 0) return { key: i + '.eb', text: 'Other direction chosen' };
    return MC.validate(lv, E);
  }

  /* BEKLEYEN: tik = +1 bekleyen puan */
  function addPending(lv, S, P, key) {
    const c = check(lv, merge(S, P), key);
    if (c) return { ok: false, reason: c.text, code: c.code };
    P[key] = (P[key] || 0) + 1; return { ok: true };
  }
  /* sag tik / uzun basis = -1 yalniz BEKLEYEN; onayli puan icin Respec */
  function removePending(lv, S, P, key) {
    if (!(P[key] > 0)) return { ok: false, reason: rk(S, key) > 0 ? 'Confirmed points need a respec' : 'Nothing to remove', code: 'confirmed' };
    const E = merge(S, P), res = MC.untake(lv, E, key);
    if (!res.ok) return { ok: false, reason: res.reason };
    P[key]--; if (!P[key]) delete P[key]; return { ok: true };
  }
  function confirm(S, P) { for (const k in P) S.r[k] = (S.r[k] || 0) + P[k]; for (const k in P) delete P[k]; }
  function resetPending(P) { for (const k in P) delete P[k]; }
  /* respec (kural hala acik): bedel YER TUTUCU, level basina 20 altin */
  const RESPEC_PER_LEVEL = 20;
  const respecCost = (lv) => RESPEC_PER_LEVEL * lv;
  function respec(S, P) { S.r = {}; resetPending(P); }
  /* level degisince: bekleyen silinir, onayli dagilim gecersizse tamami iade */
  function fitLevel(lv, S, P) {
    resetPending(P);
    if (validate(lv, S)) { S.r = {}; return true; }
    return false;
  }

  return { MC, BY, rk, DIR, clone, merge, pendingCount, dirBlocked, check, status, validate, addPending, removePending, confirm, resetPending,
    respecCost, respec, fitLevel, setApproved, RESPEC_PER_LEVEL };
});
