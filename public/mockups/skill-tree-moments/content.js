/* MOMENTS agaci: ICERIK COZUCU (mockup, oyun kodu DEGIL). Belgeler: docs/design/skill-tree-moments.md, skill-tree-moments-variants.md (veri sozlesmesi bolum 3).
   Iki kaynak:
   - Class varyanti: variants/<cls>.js -> window.SMM_VARIANTS[cls] = { rows[4], ult, variants[5]: { title, theme, tr, mastery, bar[5], nodes{ '0.f1': [ad, etki, yeni?] ... 60 anahtar } } }
   - Omer'in secimi (yalniz Warrior): picks-warrior.js -> window.SMM_PICKS.w.nodes (null / eksik = bos yuva); Mastery adi + bar asagidaki PICK_BAR (eski V6 Moments).
   Cikti (node basina): { name, eff, nw, src, note, empty }. Eksik / bozuk anahtar = bos yuva ('Open slot'), sayfa cokmez.
   Tarayicida window.SMM_CONTENT, Node'da require. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.SMM_CONTENT = f(); })(this, function () {
  const RK = ['f1', 'f2', 'f3', 'n0', 'r', 'ea', 'eb', 'ma', 'fa', 'fb', 'mb', 'v'];
  const UK = ['u1', 'u2', 'u3', 'r1', 'r2', 'r3', 'd1', 'd2', 'd3', 'l1', 'l2', 'l3'];
  const ALL_KEYS = [];
  for (let i = 0; i < 4; i++) RK.forEach((id) => ALL_KEYS.push(i + '.' + id));
  UK.forEach((id) => ALL_KEYS.push('4.' + id));

  const EMPTY_EFF = 'Not picked yet: choose one in the form.';
  const EMPTY_EFF_VAR = 'No content for this slot yet.';

  /* Omer'in Warrior secimi icin Mastery adi + bar (eski V6 Moments, skill-mastery-v2/data/v6.js warrior; bagimlilik kalmasin diye buraya alindi) */
  const PICK_MASTERY = 'Bloodhour Mastery';
  const PICK_BAR = [
    ['Opening Roar', 'On your first turn of each battle, gain 10 Rage.'],
    ['Red Mist', 'The first time you drop below 50% HP in a battle, your next skill costs no MP.'],
    ['Spoils of the Kill', 'Each time you kill an enemy, gain 8 Rage.'],
    ['Oathkeeper', 'When an ally falls, your next skill deals +25% damage.'],
    ["Death's Door", 'Once per battle, when you drop below 25% HP, all your cooldowns drop by 1.'],
  ];

  const empty = (eff) => ({ empty: true, name: 'Open slot', eff, nw: false, src: '', note: null });

  /* Varyant dosyasi yapi denetimi: bozuksa metin dondurur (app 'Variants coming' gosterir), saglamsa null. */
  function validateFile(D, cls) {
    if (!D || typeof D !== 'object') return 'no data';
    if (!Array.isArray(D.rows) || D.rows.length < 4) return 'rows missing';
    if (!D.ult || !D.ult.name) return 'ult missing';
    if (!Array.isArray(D.variants) || !D.variants.length) return 'variants missing';
    if (D.variants.some((v) => !v || typeof v !== 'object' || !v.nodes || typeof v.nodes !== 'object')) return 'variant nodes missing';
    return null;
  }

  /* Class dosyasinin vi. varyanti -> icerik. */
  function fromVariant(D, vi) {
    const v = D.variants[vi], nodes = {};
    const src = 'V' + (vi + 1) + ' · ' + (v.title || '');
    ALL_KEYS.forEach((key) => {
      const e = v.nodes[key];
      nodes[key] = Array.isArray(e) && typeof e[0] === 'string' && e[0]
        ? { name: e[0], eff: typeof e[1] === 'string' && e[1] ? e[1] : '(content missing)', nw: e[2] === true, src, note: null, empty: false }
        : empty(EMPTY_EFF_VAR);
    });
    const bar = Array.isArray(v.bar) ? v.bar : [];
    return { mastery: v.mastery || null, bar, nodes, title: v.title || '', theme: v.theme || '', tr: v.tr || '', pick: false };
  }

  /* Omer'in Warrior secimi (SMM_PICKS.w) -> icerik. */
  function fromPick(P) {
    const pk = P && P.w && P.w.nodes, nodes = {};
    ALL_KEYS.forEach((key) => {
      const p = pk && pk[key];
      nodes[key] = p && p.name ? { name: p.name, eff: p.eff || '', nw: !!p.nw, src: p.src || '', note: p.note || null, empty: false } : empty(EMPTY_EFF);
    });
    return { mastery: PICK_MASTERY, bar: PICK_BAR, nodes, title: 'Ömer\'s pick',
      theme: 'Ömer\'s own picks from the Warrior form. Slots he has not picked yet show as Open slot.',
      tr: 'Ömer\'in formdan seçtikleri; seçilmemiş yuvalar "Open slot" olarak görünür.', pick: true };
  }

  return { ALL_KEYS, RK, UK, validateFile, fromVariant, fromPick, PICK_BAR, PICK_MASTERY };
});
