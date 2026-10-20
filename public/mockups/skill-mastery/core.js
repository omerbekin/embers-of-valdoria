/* MASTERY BAR ortak motoru (mockup, oyun kodu DEGIL). Saf fonksiyonlar: tarayicida window.MC, Node'da require. Brief: docs/design/skill-tree-mastery.md */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.MC = f(); })(this, function () {
  const MAXR = { a: 5, e: 1, e2: 1, b: 3, m: 1, v: 1, c: 5, m2: 1 };
  const KIND = { a: 'Filler', e: 'Edge', e2: 'Edge', b: 'Filler', m: 'Major', v: 'Evolve', c: 'Filler', m2: 'Major' };
  const ORDER = ['a', 'e', 'e2', 'b', 'm', 'v', 'c', 'm2'];
  const THR = [5, 10, 15, 20, 25], THR50 = [30, 35, 40, 45];
  const VAR = {
    1: { name: 'Classic', order: 'chain' }, 2: { name: 'Manual Bar', order: 'bar', manual: true }, 3: { name: 'Forked Rows', order: 'chain', fork: true },
    4: { name: 'Spine', order: 'chain' }, 5: { name: 'Free Order', order: 'free' }, 6: { name: 'Milestone Choice', order: 'chain', choice: true },
    7: { name: 'Tiered Grid', order: 'tier' }, 8: { name: 'Phone Cards', order: 'chain' }, 9: { name: 'Medallions', order: 'chain' }, 10: { name: 'Sigil Wheel', order: 'chain' },
  };
  const BAR2 = [3, 6, 10, 15, 15]; // varyant 2: 4 bonus + evolve ayni 15'te
  /* ---- VERI ---- */
  const N = (n, e, nw) => ({ n, e, nw: !!nw });
  const CLASSES = {
    w: { name: 'Warrior', av: 'warrior', mastery: 'Fury Mastery',
      bonus: [['Hot Blood', 'Start every battle with 10 Rage'], ['Deep Well', 'Rage cap 50 → 60'], ['Taste of Iron', 'Your critical hits grant +5 Rage'], ['Thick Skin', 'While above 40 Rage, damage taken -10%'], ['Evolve unlocked', 'Choose one skill to evolve']],
      alt: [['Cold Fury', 'Start with 0 Rage but +10% power on turn 1'], ['Steady Burn', 'Rage never decays', 1], ['Trophy Hunter', 'Kills grant 10 Rage'], ['Last Stand', 'Below 25% HP, +1 Armor per 10 Rage']],
      rows: [
        { sk: 'pw', ic: 'rage', name: 'Berserker', pas: 1, a: N('Thick Blood', 'Rage gained from losing HP +10% per rank'), e: N('Smell of Iron', 'The first time you drop below 50% HP in a battle, gain 15 Rage'), e2: N('Iron Will', 'Stun on you lasts 1 turn less'), b: N('Bloodlust', 'While below 50% HP, +4% lifesteal on all attacks per rank'), m: N('Death Wish', 'While below 25% HP you cannot be Stunned and your attacks cannot miss'), v: N('Crimson Pact', 'The Berserker bonus also reduces damage taken (half its value, up to -40%); at the brink of death all cooldowns are 1 shorter') },
        { sk: 'ds', ic: 'sword', name: 'Double Strike', a: N('Axe Drill', 'Each hit +4% power per rank'), e: N('Follow-Through', 'If the first hit kills, the second hit strikes the next enemy in that row'), e2: N('Sure Hand', 'The first hit cannot miss'), b: N('Grip of Fury', '+1 Rage per hit per rank'), m: N('Hack and Hew', 'Both hits are critical against a Stunned target'), v: N("Reaper's Rhythm", 'Each consecutive Double Strike on the same target adds one more hit (up to 4); switching target resets it') },
        { sk: 'ww', ic: 'whirlwind', name: 'Whirlwind', a: N('Wider Swing', '+3% power per rank'), e: N('Blood Tithe', 'Grants 3 Rage per enemy hit'), e2: N('Low Sweep', 'Hit enemies lose 1 Speed for 1 turn', 1), b: N('Keen Edge', 'Lifesteal +5% per rank'), m: N('Scything Arc', 'Also hits the back row at 50%'), v: N('Harvest Moon', 'While below 50% HP Whirlwind has no cooldown, but costs 15 Rage instead of MP') },
        { sk: 'ch', ic: 'charge', name: 'Charge', a: N('Running Start', '+4% power per rank'), e: N('Headlong', 'Costs no MP while you are below 50% HP'), e2: N('Shield Splinter', 'Target loses 3 Armor for 2 turns'), b: N('Opening Blow', '+8% damage per rank against targets at full HP'), m: N('Marked Prey', 'The Charged target takes +20% damage from you for 2 turns'), v: N('Avalanche', 'Strikes every enemy between you and the target for 50%, and the Stun lasts 2 turns') },
        { sk: 'hb', ic: 'warcry', name: "Headsman's Blow", a: N('Heavier Axe', '+3% power per rank'), e: N('Patience', 'Minimum Rage 30 → 20'), e2: N('Mercy Stroke', 'If the target survives, refund 10 Rage'), b: N("Executioner's Habit", 'On a kill, refund 5 Rage per rank'), m: N('Head on a Pike', 'A kill frightens the remaining enemies: -15% damage dealt for 2 turns', 1), v: N('Judgement', 'Never misses, ignores Armor; a kill resets its cooldown') },
      ] },
    h: { name: 'Hexer', av: 'hexer', mastery: 'Hex Mastery',
      bonus: [['First Portent', 'Your first curse each battle applies +1 Omen'], ['Long Shadow', 'Omen lasts 4 turns instead of 3'], ['Dread Certainty', 'Doom +10% critical chance'], ['Deeper Misfortune', 'Misfortune also -2% hit per Omen'], ['Evolve unlocked', 'Choose one skill to evolve']],
      alt: [['Deep Pockets', 'Start with 10 extra MP'], ['Short Fuse', 'Omen lasts 2 turns but Doom +20%'], ['No Escape', 'Doom cannot be dodged'], ['Cold Dread', 'Misfortune also -1 Speed at 3 Omens', 1]],
      rows: [
        { sk: 'ph', ic: 'soul', name: 'Ill Omen', pas: 1, a: N('Black Candle', 'Doom damage +4% per rank'), e: N('Second Shadow', 'Passed Omens split between the two nearest enemies'), e2: N('Mourning Veil', 'Passed Omens last 1 turn longer'), b: N('Evil Hour', 'Misfortune -1% more crit per Omen per rank'), m: N('Funeral Toll', 'When Doom kills, you regain 8 MP'), v: N('Plague of Crows', 'Passed Omens can now trigger Doom') },
        { sk: 'ee', ic: 'eye', name: 'Evil Eye', a: N('Sharper Gaze', '+4% power per rank'), e: N('Unblinking', 'Cannot miss a target that carries an Omen'), e2: N('Cold Stare', '+1 Omen on a kill to the nearest enemy'), b: N('Nazar', '+4% critical chance per rank'), m: N('Gaze of the Gallows', '+40% damage against a target with 2 Omens'), v: N('Eye of the Abyss', 'Also strikes a second Omen-bearing enemy at 60%') },
        { sk: 'wc', ic: 'drainfield', name: 'Withering Curse', a: N('Rank Soil', 'Initial hit +4% power per rank'), e: N('Cheap Spell', 'Costs 14 → 10 MP'), e2: N('Creeping Edge', 'Area shifts one row deeper'), b: N('Long Winter', 'Wither lasts +1 turn per rank'), m: N('Blighted Ground', 'Area grows to 3x3'), v: N('Pestilence', 'Each Wither tick has a 25% chance to add an Omen', 1) },
        { sk: 'jx', ic: 'clover', name: 'Jinx', a: N('Knotted Thread', '+4% power per rank'), e: N('Tangled', 'Jinxed lasts +1 turn'), e2: N('Ill Luck', "Jinxed target's crit is yours (+5%)"), b: N('Lucky Pin', '+5% critical chance per rank'), m: N('Shared Fate', 'When a Jinxed enemy misses, the nearest other enemy gains 1 Omen'), v: N('Hex of Mirrors', "A Jinxed enemy's miss hurts itself for 30% of the intended damage", 1) },
        { sk: 'dm', ic: 'voidstrike', name: 'Doom Mark', a: N('Heavier Doom', 'Its Doom +5% per rank'), e: N('Hasty Verdict', 'Cooldown 4 → 3'), e2: N('Quiet Verdict', 'No initial cooldown'), b: N('Grim Harvest', 'On a kill, refund 4 MP per rank'), m: N('Omen Thief', 'Also pulls the Omens of adjacent enemies into the blast'), v: N('Final Hour', 'A kill passes its Omens on after all, and the Doom echoes on the next enemy at 50%') },
      ] },
  };
  const TBD = 'Design TBD (Level 50 placeholder)';

  /* ---- durum ---- */
  const newState = (variant, cls, l50) => ({ v: variant, c: cls, l50: !!l50, r: {}, bar: 0, picks: {} });
  const rule = (S) => VAR[S.v];
  const rowsOf = (S) => CLASSES[S.c].rows;
  const rk = (S, i, k) => S.r[i + k] || 0;
  const pool = (S) => (S.l50 ? 49 : 29);
  const nodeSpent = (S) => Object.values(S.r).reduce((a, b) => a + b, 0);
  const spent = (S) => nodeSpent(S) + (rule(S).manual ? S.bar : 0);
  const free = (S) => pool(S) - spent(S);
  const barVal = (S) => (rule(S).manual ? S.bar : nodeSpent(S));
  const barMax = (S) => (rule(S).manual ? 15 : S.l50 ? 45 : 25);
  const thresholds = (S) => (rule(S).manual ? BAR2.slice() : THR.slice());
  const thr50 = (S) => (rule(S).manual ? [] : THR50);
  const parse = (key) => ({ i: +key[0], k: key.slice(1) });
  const exists = (S, k) => (k === 'e2' ? !!rule(S).fork : (k === 'c' || k === 'm2') ? S.l50 : true);
  const evolvedKey = (S) => { for (let i = 0; i < 5; i++) if (rk(S, i, 'v') > 0) return i + 'v'; return null; };
  const nm = (S, i, k) => { const r = rowsOf(S)[i]; if (k === 'c') return r.name + ' Mastery (Tier II)'; if (k === 'm2') return r.name + ' Major II'; return r[k].n; };
  const rowPts = (S, i) => ['a', 'e', 'e2', 'b'].reduce((s, k) => s + rk(S, i, k), 0) + rk(S, i, 'm');

  /* Bir dugum SU AN tutulabilir mi (kendi rank'ini saymadan)? null = evet, yoksa neden */
  function req(S, key) {
    const { i, k } = parse(key); const R = rule(S), bar = barVal(S), o = R.order;
    const edgeTaken = rk(S, i, 'e') + rk(S, i, 'e2') > 0;
    if (!exists(S, k)) return 'Not available';
    switch (k) {
      case 'a': return null;
      case 'e': case 'e2': {
        if (R.fork && rk(S, i, k === 'e' ? 'e2' : 'e') > 0) return 'Other Edge taken';
        if (o === 'chain') return rk(S, i, 'a') >= 1 ? null : 'Needs ' + nm(S, i, 'a');
        if (o === 'bar') return bar >= 3 ? null : 'Bar needs 3 points';
        return null;
      }
      case 'b':
        if (o === 'chain') return edgeTaken ? null : 'Needs Edge';
        if (o === 'bar') return bar >= 6 ? null : 'Bar needs 6 points';
        if (o === 'tier') return bar >= 10 ? null : 'Tier 2 needs bar 10';
        return null;
      case 'm':
        if (o === 'chain') return rk(S, i, 'b') >= 1 ? null : 'Needs ' + nm(S, i, 'b');
        if (o === 'free') return ['a', 'e', 'e2', 'b'].reduce((s, q) => s + rk(S, i, q), 0) >= 3 ? null : 'Needs 3 points in this row';
        if (o === 'bar') return bar >= 10 ? null : 'Bar needs 10 points';
        if (o === 'tier') return bar >= 10 ? null : 'Tier 2 needs bar 10';
        return null;
      case 'v': {
        const ev = evolvedKey(S);
        if (ev && ev !== key) return 'Evolved: ' + nm(S, +ev[0], 'v');
        if (rk(S, i, 'm') < 1) return 'Needs Major';
        if (R.manual) return bar >= 15 ? null : 'Bar needs 15 points';
        return bar >= 25 ? null : 'Mastery 25 required';
      }
      case 'c': return rk(S, i, 'm') >= 1 ? null : 'Needs Major';
      case 'm2': return rk(S, i, 'c') >= 1 ? null : 'Needs Tier II Filler';
    }
    return null;
  }
  /* acilma sartinin sabit metni (ipucu) */
  function openText(S, key) {
    const { i, k } = parse(key); const R = rule(S), o = R.order;
    const A = nm(S, i, 'a'), Bn = nm(S, i, 'b');
    switch (k) {
      case 'a': return 'Always open';
      case 'e': case 'e2': return (R.fork ? 'Exclusive with the other Edge. ' : '') + (o === 'chain' ? 'Opens after 1+ rank of ' + A : o === 'bar' ? 'Opens at bar 3' : 'Always open');
      case 'b': return o === 'chain' ? 'Opens after an Edge' : o === 'bar' ? 'Opens at bar 6' : o === 'tier' ? 'Tier 2: opens at Mastery 10' : 'Always open';
      case 'm': return o === 'chain' ? 'Opens after 1+ rank of ' + Bn : o === 'free' ? 'Needs 3+ points in this row' : o === 'bar' ? 'Opens at bar 10' : 'Tier 2: opens at Mastery 10';
      case 'v': return 'Needs this row’s Major and ' + (R.manual ? 'bar 15' : 'Mastery 25') + '. Only one Evolve per character.';
      case 'c': return 'Level 50 · opens after this row’s Major';
      case 'm2': return 'Level 50 · opens after Tier II Filler';
    }
    return '';
  }
  /* tum alinmis dugumler hala gecerli mi? ilk ihlali dondur */
  function violation(S) {
    for (let i = 0; i < 5; i++) for (const k of ORDER) {
      if (rk(S, i, k) > 0) { const r = req(S, i + k); if (r) return { key: i + k, reason: r }; }
    }
    return null;
  }
  function why(S, key) { // alinabilir mi (rank +1)
    const { i, k } = parse(key);
    if (!exists(S, k)) return 'Not available';
    if (rk(S, i, k) >= MAXR[k]) return 'Rank is full';
    if (free(S) <= 0) return 'No points left';
    return req(S, key);
  }
  function take(S, key) {
    const w = why(S, key); if (w) return { ok: false, reason: w };
    S.r[key] = (S.r[key] || 0) + 1; return { ok: true };
  }
  function untake(S, key) {
    if (!(S.r[key] > 0)) return { ok: false, reason: 'Nothing to remove' };
    S.r[key]--; const v = violation(S);
    if (v) { S.r[key]++; return { ok: false, reason: 'Needed by ' + nm(S, +v.key[0], v.key.slice(1)) + ' (' + v.reason + ')' }; }
    if (S.r[key] === 0) delete S.r[key];
    return { ok: true };
  }
  function click(S, key) { // fillerda +1, tavanda -1; digerlerinde ac/kapa
    const { i, k } = parse(key); const r = rk(S, i, k);
    if (MAXR[k] > 1) return r < MAXR[k] ? take(S, key) : untake(S, key);
    return r > 0 ? untake(S, key) : take(S, key);
  }
  function setBar(S, n) { // varyant 2: bar 0..15, adim adim
    if (!rule(S).manual) return { ok: false, reason: 'Bar follows spent points' };
    n = Math.max(0, Math.min(15, n)); let res = { ok: true };
    while (S.bar !== n) {
      if (S.bar < n) { if (free(S) <= 0) { res = { ok: false, reason: 'No points left' }; break; } S.bar++; }
      else { S.bar--; const v = violation(S); if (v) { S.bar++; res = { ok: false, reason: 'Needed by ' + nm(S, +v.key[0], v.key.slice(1)) + ' (' + v.reason + ')' }; break; } }
    }
    return res;
  }
  function reset(S) { S.r = {}; S.bar = 0; S.picks = {}; }
  function toggleL50(S) {
    if (!S.l50) { S.l50 = true; return { ok: true }; }
    let keep = 0; for (const k in S.r) { const q = k.slice(1); if (q !== 'c' && q !== 'm2') keep += S.r[k]; }
    if (keep + (rule(S).manual ? S.bar : 0) > 29) return { ok: false, reason: 'Spend 29 or fewer points first' };
    for (const k of Object.keys(S.r)) { const q = k.slice(1); if (q === 'c' || q === 'm2') delete S.r[k]; }
    S.l50 = false; return { ok: true };
  }
  /* bar esikleri: {t, reached, idx, evo, tbd} */
  function marks(S) {
    const bar = barVal(S), t = thresholds(S); const out = t.map((v, idx) => ({ t: v, idx, evo: idx === 4, reached: bar >= v, tbd: false }));
    if (S.l50) thr50(S).forEach((v, q) => out.push({ t: v, idx: 5 + q, evo: false, reached: bar >= v, tbd: true }));
    return out;
  }
  function pick(S, idx, opt) {
    if (!rule(S).choice) return { ok: false, reason: 'No choices in this variant' };
    if (idx > 3) return { ok: false, reason: 'No choice here' };
    if (barVal(S) < THR[idx]) return { ok: false, reason: 'Mastery ' + THR[idx] + ' required' };
    S.picks[idx] = opt; return { ok: true };
  }
  /* aktif bonus adlari (test/ozet) */
  function activeBonuses(S) {
    const C = CLASSES[S.c], out = []; marks(S).forEach((m) => {
      if (!m.reached || m.tbd) return;
      if (m.evo) { out.push(C.bonus[4][0]); return; }
      if (rule(S).choice) { if (S.picks[m.idx] === 1) out.push(C.alt[m.idx][0]); else if (S.picks[m.idx] === 0) out.push(C.bonus[m.idx][0]); }
      else out.push(C.bonus[m.idx][0]);
    }); return out;
  }
  return { MAXR, KIND, ORDER, THR, THR50, VAR, CLASSES, TBD, newState, rule, rowsOf, rk, pool, nodeSpent, spent, free, barVal, barMax, thresholds, exists, evolvedKey, nm, rowPts, req, openText, violation, why, take, untake, click, setBar, reset, toggleL50, marks, pick, activeBonuses };
});
