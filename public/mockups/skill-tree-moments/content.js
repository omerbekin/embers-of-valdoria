/* MOMENTS agaci: ICERIK ESLEMESI (mockup, oyun kodu DEGIL). Belge: docs/design/skill-tree-moments.md bolum 7.
   Icerik GECICIDIR; kaynak: skill-mastery-v2/data/v3, v5, v6, v7, v8 (window.SMV_DATA[N][c] = { mastery, bar, rows[i].n[id] = [ad, etki, yeni?] }).
   Satir 0-3 (pasif + 3 skill):  f1 <- V5.n1 · f2 <- V5.n3 · f3 <- V5.n5 · n0 <- V5.n6 · r, ea, eb, ma, mb, v <- V6 ayni id · fa <- V3.p1 · fb <- V3.p3
   Ult kollari (satir 4): yukari <- V6 ea, fa, ma · sag <- V6 eb, fb, mb · asagi <- V7 ea, eb, m · sol <- V8 s1, s2, sm.  Bar <- V6.
   Tarayicida window.SMM_CONTENT, Node'da require. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.SMM_CONTENT = f(); })(this, function () {
  const SRC = { 3: 'V3 Blood Price', 5: 'V5 Long Ladder', 6: 'V6 Moments', 7: 'V7 Momentum', 8: 'V8 Reach' };
  const ULT_MAP = [['u', 6, ['ea', 'fa', 'ma']], ['r', 6, ['eb', 'fb', 'mb']], ['d', 7, ['ea', 'eb', 'm']], ['l', 8, ['s1', 's2', 'sm']]];
  const ROW_MAP = [['f1', 5, 'n1'], ['f2', 5, 'n3'], ['f3', 5, 'n5'], ['n0', 5, 'n6'], ['r', 6, 'r'], ['ea', 6, 'ea'], ['eb', 6, 'eb'],
    ['ma', 6, 'ma'], ['mb', 6, 'mb'], ['v', 6, 'v'], ['fa', 3, 'p1'], ['fb', 3, 'p3']];

  /* DATA = window.SMV_DATA, c = 'w' | 'h'. Eksik icerik null kalir (app yer tutucu gosterir). */
  function build(DATA, c) {
    const V = (n) => (DATA && DATA[n] && DATA[n][c]) || null;
    const get = (n, row, id) => {
      const d = V(n), r = d && d.rows && d.rows[row], e = r && r.n && r.n[id];
      return e && e[0] ? { name: e[0], eff: e[1] || '', nw: !!e[2], src: SRC[n] } : null;
    };
    const nodes = {};
    for (let i = 0; i < 4; i++) ROW_MAP.forEach(([id, n, from]) => { nodes[i + '.' + id] = get(n, i, from); });
    ULT_MAP.forEach(([arm, n, ids]) => ids.forEach((from, k) => { nodes['4.' + arm + (k + 1)] = get(n, 4, from); }));
    const v6 = V(6);
    return { mastery: (v6 && v6.mastery) || null, bar: (v6 && v6.bar) || [], nodes };
  }
  return { build, SRC };
});
