/* MASTERY BAR v2: 10 varyantin SEKLI (mockup, oyun kodu DEGIL). Brief: docs/design/skill-tree-mastery-v2.md bolum 2.
   Tarayicida window.SMV_SHAPES, Node'da require. Satir notasyonu belgedekiyle ayni:
     id TUR tier sutun serit gerek [excl:G/x]      TUR: F3 / F5 (filler), E (edge), M (major), V (evolve)
     gerek: '-' yok; a,b = ikisi de (VE); a|b = biri yeterli. excl:G/x = ayni satirda G grubunda yalnizca x tarafi.
   NOT: V5'te belge serit sutununu yazmamis (duz zincir); burada serit 0 olarak acik yazildi.
   Tier kilidi turleri: level (seviye), bar (toplam harcanan), row (o satira harcanan), passive (pasif satirina harcanan), open. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.SMV_SHAPES = f(); })(this, function () {
  const KIND = { F3: ['F', 3], F5: ['F', 5], E: ['E', 1], M: ['M', 1], V: ['V', 1] };
  /* ---- notasyon ayristirici ---- */
  function parseNode(line) {
    const t = line.trim().split(/\s+/); const [id, kd, tier, col, lane, req] = t; const rest = t.slice(6);
    const [kind, max] = KIND[kd]; if (!kind) throw new Error('bad kind ' + kd + ' in ' + line);
    let excl = null; rest.forEach((x) => { if (x.indexOf('excl:') === 0) { const [g, side] = x.slice(5).split('/'); excl = { g, side }; } });
    return { id, kind, max, tier, col: +col.slice(1), lane: +lane, req: !req || req === '-' ? [] : req.split(',').map((term) => term.split('|')), excl };
  }
  function mkDef(lines) {
    const nodes = lines.map(parseNode), byId = {}; nodes.forEach((n) => { byId[n.id] = n; });
    const groups = {}; nodes.forEach((n) => { if (n.excl) { const g = (groups[n.excl.g] = groups[n.excl.g] || {}); (g[n.excl.side] = g[n.excl.side] || []).push(n.id); } });
    return { nodes, byId, groups, cols: 1 + Math.max.apply(null, nodes.map((n) => n.col)) };
  }
  /* kopru: 'b01 E B 0-1 0.e,1.e'  (satir a-b, gerek tam anahtarlar) */
  function parseBridge(line) {
    const [id, kd, tier, rows, req] = line.trim().split(/\s+/); const [kind, max] = KIND[kd]; const [a, b] = rows.split('-').map(Number);
    return { id, kind, max, tier, rows: [a, b], far: b - a > 1, req: req.split(',').map((k) => [k]) };
  }
  const L = (v) => ({ k: 'level', v }), BAR = (v) => ({ k: 'bar', v }), ROW = (v) => ({ k: 'row', v }), PAS = (v) => ({ k: 'passive', v }), OPEN = { k: 'open', v: 0 };
  const S = {};
  function add(n, o) {
    const sh = { n, name: o.name, tr: o.tr, tiers: o.tiers, tierOrder: Object.keys(o.tiers), lock: o.lock, lanes: !!o.lanes, laneDefault: o.laneDefault || null, bondsCol: !!(o.bridges && o.bridges.length) };
    sh.skill = mkDef(o.skill); sh.pas = o.pas ? mkDef(o.pas) : sh.skill; sh.bridges = (o.bridges || []).map(parseBridge);
    /* duz liste: anahtar 'satir.id' (kopru: 'B.id') */
    sh.nodes = []; sh.byKey = {};
    for (let i = 0; i < 5; i++) {
      const def = i === 0 ? sh.pas : sh.skill;
      def.nodes.forEach((d) => { const r = Object.assign({}, d, { key: i + '.' + d.id, i, bridge: false, req: d.req.map((term) => term.map((x) => i + '.' + x)) }); sh.nodes.push(r); sh.byKey[r.key] = r; });
    }
    sh.bridges.forEach((b) => { const r = Object.assign({}, b, { key: 'B.' + b.id, i: -1, bridge: true }); sh.nodes.push(r); sh.byKey[r.key] = r; });
    S[n] = sh;
  }

  /* V1 Two Paths: iki yol. Tier: seviye I L1 / II L8 / III L16 / E L30 */
  add(1, {
    name: 'Two Paths', lock: 'level', lanes: true, laneDefault: { u: 'Path A', l: 'Path B' },
    tiers: { I: L(1), II: L(8), III: L(16), E: L(30) },
    tr: "Tema: her skill iki oyun tarzına ayrılır, seçilen yol satırın kimliği olur. Diziliş: ortak kök, sonra üstte ve altta iki paralel yol; yalnızca biri alınır, her yolun kendi Evolve'u var.",
    skill: ['t F3 I c0 0 -', 'ua E II c1 -1 t excl:path/u', 'ub F3 II c2 -1 ua excl:path/u', 'um M III c3 -1 ub excl:path/u', 'uv V E c4 -1 um excl:path/u',
      'la E II c1 1 t excl:path/l', 'lb F3 II c2 1 la excl:path/l', 'lm M III c3 1 lb excl:path/l', 'lv V E c4 1 lm excl:path/l'],
  });
  /* V2 Bonds: baglar. Tier: bar I 0 / II 4 / B 10 / III 15 / E L30 */
  add(2, {
    name: 'Bonds', lock: 'bar',
    tiers: { I: BAR(0), II: BAR(4), B: BAR(10), III: BAR(15), E: L(30) },
    tr: "Tema: skill'ler birbirini besler; asıl güç satırlar arasındaki köprülerde, bar bonusları farklı skill'leri sırayla kullanmaya bağlı. Diziliş: dört düğümlük kısa satırlar; komşu köprüler iki satırın arasında, uzak köprüler sağdaki Bonds sütununda.",
    skill: ['a F5 I c0 0 -', 'e E II c1 0 a', 'm M III c2 0 e', 'v V E c3 0 m'],
    bridges: ['b01 E B 0-1 0.e,1.e', 'b12 E B 1-2 1.e,2.e', 'b23 E B 2-3 2.e,3.e', 'b34 E B 3-4 3.e,4.e', 'b13 M III 1-3 1.m,3.m', 'b24 M III 2-4 2.m,4.m'],
  });
  /* V3 Blood Price: bedel. Tier: seviye I L1 / II L10 / III L20 / E L30 */
  add(3, {
    name: 'Blood Price', lock: 'level',
    tiers: { I: L(1), II: L(10), III: L(20), E: L(30) },
    tr: 'Tema: her Edge ve Major hem kazanç hem bedel taşır, omurga filler\'ları küçük ve bedelsizdir; denge bedelle kurulur. Diziliş: ortada omurga, üstte Edge dikenleri, altta Major dikenleri.',
    skill: ['s1 F3 I c0 0 -', 'p1 E I c0 -1 s1', 's2 F3 II c1 0 s1', 'p2 M II c1 1 s2', 's3 F3 III c2 0 s2', 'p3 E III c2 -1 s3', 'p4 M III c2 1 s3', 'v V E c3 0 s3,p2|p4'],
  });
  /* V4 Few Big Choices: az ama buyuk. Tier: seviye I L1 / II L6 / III L15 / E L30 */
  add(4, {
    name: 'Few Big Choices', lock: 'level',
    tiers: { I: L(1), II: L(6), III: L(15), E: L(30) },
    tr: 'Tema: filler az, her satırda büyük seçim var; kimlik seçimlerden gelir. Diziliş: bir filler, sonra 3 Major\'dan 1\'i, sonra 2 Edge\'den 1\'i, en sonda Evolve.',
    skill: ['f F5 I c0 0 -', 'ma M II c1 -1 f excl:maj/a', 'mb M II c1 0 f excl:maj/b', 'mc M II c1 1 f excl:maj/c', 'ea E III c2 -0.5 ma|mb|mc excl:edg/a', 'eb E III c2 0.5 ma|mb|mc excl:edg/b', 'v V E c3 0 ea|eb'],
  });
  /* V5 Long Ladder: uzun merdiven. Tier: satir puani I 0 / II 4 / III 8 / IV 14 / E L30 */
  add(5, {
    name: 'Long Ladder', lock: 'row',
    tiers: { I: ROW(0), II: ROW(4), III: ROW(8), IV: ROW(14), E: L(30) },
    tr: "Tema: çok sayıda küçük adım; bir skill'e derin giden oyuncu uzman olur, her tier sonunda ödül var. Diziliş: tek uzun düz zincir (19 puan); 29 puanla bir satır sonuna kadar gider.",
    skill: ['n1 F3 I c0 0 -', 'n2 E I c1 0 n1', 'n3 F3 II c2 0 n2', 'n4 E II c3 0 n3', 'n5 F5 III c4 0 n4', 'n6 M III c5 0 n5', 'n7 F3 IV c6 0 n6', 'n8 M IV c7 0 n7', 'v V E c8 0 n8'],
  });
  /* V6 Moments: anlar. Tier: seviye I L1 / II L8 / III L18 / E L30 */
  add(6, {
    name: 'Moments', lock: 'level',
    tiers: { I: L(1), II: L(8), III: L(18), E: L(30) },
    tr: 'Tema: her düğüm belirli bir anda çalışır (ilk tur, can %50 altı, öldürme sonrası, tek düşman kalınca, ön/arka sıra...). Diziliş: dallanan ağaç, 1 → 2 → 4, sonra Evolve.',
    skill: ['r F3 I c0 0 -', 'ea E II c1 -1 r', 'eb E II c1 1 r', 'ma M III c2 -1.5 ea', 'fa F3 III c2 -0.5 ea', 'fb F3 III c2 0.5 eb', 'mb M III c2 1.5 eb', 'v V E c3 0 ma|mb'],
  });
  /* V7 Momentum: ivme. Tier: bar I 0 / II 5 / III 10 / IV 15 / E L30 */
  add(7, {
    name: 'Momentum', lock: 'bar',
    tiers: { I: BAR(0), II: BAR(5), III: BAR(10), IV: BAR(15), E: L(30) },
    tr: 'Tema: savaş içinde biriken ivme (art arda kullanım, tur sayısı, yük harcayıp patlatma); bar bonusları da yük temalı. Diziliş: elmas: filler → iki Edge → Major → filler ve Evolve.',
    skill: ['f1 F3 I c0 0 -', 'ea E II c1 -1 f1', 'eb E II c1 1 f1', 'm M III c2 0 ea|eb', 'f2 F5 IV c3 0 m', 'v V E c4 0 m'],
  });
  /* V8 Reach: menzil ve sekil. Tier: seviye I L1 / II L9 / III L18 / E L30 */
  add(8, {
    name: 'Reach', lock: 'level', lanes: true, laneDefault: { u: 'Shape', l: 'Power' },
    tiers: { I: L(1), II: L(9), III: L(18), E: L(30) },
    tr: 'Tema: üst şerit hedeflemeyi ve şekli değiştirir (alan, delme, itme, sekme...), alt şerit gücü artırır. Diziliş: iki paralel şerit, ikisi de alınabilir; tek Evolve, iki Major\'dan biri yeter.',
    skill: ['s1 E I c0 -1 -', 's2 E II c1 -1 s1', 'sm M III c2 -1 s2', 'p1 F5 I c0 1 -', 'p2 F3 II c1 1 p1', 'pm M III c2 1 p2', 'v V E c3 0 sm|pm'],
  });
  /* V9 Marks: damga. Tier: satir puani I 0 / II 2 / III 5 / E L30 */
  add(9, {
    name: 'Marks', lock: 'row',
    tiers: { I: ROW(0), II: ROW(2), III: ROW(5), E: L(30) },
    tr: "Tema: durum ekosistemi: uygula → büyüt → tüket (Warrior mevcut durumlarla, Hexer Omen / Wither / Jinx ile). Diziliş: tier içinde serbest, bağ çizgisi yok; 3. tier'da iki Major'dan biri.",
    skill: ['a1 F3 I c0 -1 -', 'a2 E I c0 1 -', 'b1 F3 II c1 -1 -', 'b2 E II c1 1 -', 'c1 M III c2 -1 - excl:con/a', 'c2 M III c2 1 - excl:con/b', 'v V E c3 0 c1|c2'],
  });
  /* V10 Warband: takim. Tier: pasif puani P acik / I 0 / II 3 / III 6 / E L30; pasif satiri kendi omurgasi */
  add(10, {
    name: 'Warband', lock: 'passive', lanes: true, laneDefault: { u: 'Self', l: 'Warband' },
    tiers: { P: OPEN, I: PAS(0), II: PAS(3), III: PAS(6), E: L(30) },
    tr: "Tema: skill'ler takıma da hizmet edebilir (koru, Rage / MP ver, işaretle, öldürünce iyileştir). Diziliş: üstte pasifin kendi omurgası; skill satırlarında Self / Warband seçimi, sonra Major.",
    pas: ['p1 F5 P c0 0 -', 'p2 E P c1 0 p1', 'p3 F3 P c2 0 p2', 'p4 M P c3 0 p3', 'pv V E c4 0 p4'],
    skill: ['f F3 I c0 0 -', 'es E II c1 -1 f excl:side/s', 'et E II c1 1 f excl:side/t', 'm M III c2 0 es|et', 'f2 F3 III c3 0 m', 'v V E c4 0 m'],
  });
  return S;
});
