/* Skill tip shortening rules (mockup, not game code). Works on the REAL generated lines of describeSkill (+ ground reaction hint).
   Input rows: { t: text, k: kind|null, hint?: true, initcd?: true }.  Output per variant: { t1, t2, chips, gone }.
   The same file runs in the page and in the node stats script. In the game the same split would be made inside describeSkill's add()
   (each effect type already knows its parts), not by parsing text; the text parsing here only proves the rule on all skills. */
(function (root) {
  'use strict';
  var NUM = /(\d+% [A-Z]+ \(\d+\))/;
  var PERTURN = /start of (each|every)|each of (its|their) turns|every turn/;

  function parse(r) {
    var t = r.t, m;
    if (r.hint) return { type: 'reaction', t: t };
    if (r.initcd) return { type: 'initcd', t: t };
    if ((m = /^Damage over time: (.+?) for (\d+) turns?: (.*)$/.exec(t))) return { type: 'dot', name: m[1], turns: +m[2], clause: m[3], t: t, k: r.k };
    if ((m = /^Leaves (.+?) on the area(?: \(([^)]*)\))? for (\d+) turns?(?:: (.*))?$/.exec(t))) return { type: 'ground', name: m[1], side: (m[2] || '').replace(/ only$/, ''), turns: +m[3], clause: m[4] || '', t: t, k: r.k };
    if ((m = /^You gain (.+?) for (\d+) turns?(?:: (.*))?$/.exec(t))) return { type: 'status', verb: 'You gain', name: m[1], turns: +m[2], clause: m[3] || '', t: t, k: r.k };
    if ((m = /^Applies (.+?) for (\d+) turns?(?:: (.*))?$/.exec(t))) return { type: 'status', verb: 'Applies', name: m[1], turns: +m[2], clause: m[3] || '', t: t, k: r.k };
    if (/^(Damage|Heal|Magic shield|Shield|Heals you)\b/.test(t)) return { type: 'effect', t: t, k: r.k };
    if (/^(Needs|Cannot|Can also|Only from|Choose a|If you are not)/.test(t)) return { type: 'cond', t: t, k: r.k };
    return { type: 'other', t: t, k: r.k };
  }
  function shortAudience(t) { return t.replace(/\(on the enemy side: enemies\)/, '(enemies)').replace(/\(on your side: allies\)/, '(allies)'); }
  function isMod(p) { return p.type === 'other' && /\d/.test(p.t) && p.t.length <= 60; }
  function turnsWord(n) { return n + (n === 1 ? ' turn' : ' turns'); }
  function perNum(p) { var m = NUM.exec(p.clause || ''); return m ? m[1] + (PERTURN.test(p.clause) ? ' per turn' : '') : ''; }

  /* ground reactions: split every "Label (with X)" entry, drop exact duplicates, one line */
  function mergeReactions(items) {
    var seen = {}, out = [];
    items.forEach(function (p) {
      var body = p.t.replace(/^Ground reactions: /, ''), re = /([^,()]+? \(with [^)]*\))/g, m;
      while ((m = re.exec(body))) { var e = m[1].trim(); if (!seen[e]) { seen[e] = 1; out.push(e); } }
    });
    return out.length ? { t: 'Ground reactions: ' + out.join(', '), k: null } : null;
  }

  function withK(rows) { return rows.map(function (r) { var p = parse(r); p.k = r.k; return p; }); }

  /* the text the game shows today, only with the reaction lines merged (the generation fix, shared by all variants) */
  function now(rows) {
    var ps = withK(rows), out = [], reacts = [];
    ps.forEach(function (p) { if (p.type === 'reaction') reacts.push(p); else out.push({ t: p.t, k: p.k }); });
    var mr = mergeReactions(reacts); if (mr) out.push(mr);
    return out;
  }

  /* A: short list in the tip, the rest behind "More" */
  function A(rows) {
    var t1 = [], t2 = [], reacts = [], seenOther = false;
    withK(rows).forEach(function (p) {
      if (p.type === 'effect') { var s = shortAudience(p.t); t1.push({ t: s, k: p.k }); if (s !== p.t) t2.push({ t: p.t, k: p.k }); }
      else if (p.type === 'status') { t1.push({ t: p.verb + ' ' + p.name + ' for ' + turnsWord(p.turns), k: p.k }); if (p.clause) t2.push({ t: p.t, k: p.k }); }
      else if (p.type === 'ground') { var n = perNum(p); t1.push({ t: 'Leaves ' + p.name + ' for ' + turnsWord(p.turns) + (p.side ? ' (' + p.side + ')' : '') + (n ? ': ' + n : ''), k: p.k }); if (p.clause) t2.push({ t: p.t, k: p.k }); }
      else if (p.type === 'dot') { var n2 = perNum(p); t1.push({ t: p.name + ' for ' + turnsWord(p.turns) + (n2 ? ': ' + n2 : ''), k: p.k }); t2.push({ t: p.t, k: p.k }); }
      else if (p.type === 'reaction') reacts.push(p);
      else if (isMod(p)) t1.push({ t: p.t, k: p.k });
      else if (!t1.length && !seenOther) { seenOther = true; t1.push({ t: p.t, k: p.k }); }
      else t2.push({ t: p.t, k: p.k });
    });
    // T1 is capped at 4 lines; the overflow goes to the second tier in full
    while (t1.length > 4) { var last = t1.pop(); t2.unshift({ t: last.t, k: last.k }); }
    var mr = mergeReactions(reacts); if (mr) t2.push(mr);
    return { t1: t1, t2: t2, chips: null, gone: [] };
  }

  /* B: number lines in the tip, every status / ground / damage-over-time effect becomes a named chip with its own small tip */
  function B(rows) {
    var t1 = [], chips = [], gone = [], reacts = [], haveCond = false;
    withK(rows).forEach(function (p) {
      if (p.type === 'effect') t1.push({ t: shortAudience(p.t), k: p.k });
      else if (p.type === 'status' || p.type === 'ground' || p.type === 'dot') {
        chips.push({ type: p.type, name: p.name, turns: p.turns, side: p.side || '', num: p.type === 'status' ? '' : perNum(p), detail: p.t, k: p.k });
      } else if (isMod(p)) t1.push({ t: p.t, k: p.k });
      else if (p.type === 'cond' && !haveCond && p.t.length <= 90) { haveCond = true; t1.push({ t: p.t, k: p.k }); }
      else if (p.type === 'reaction') reacts.push(p);
      else gone.push({ t: p.t, k: p.k });
    });
    var mr = mergeReactions(reacts); if (mr) gone.push(mr);
    if (!t1.length && !chips.length && gone.length) t1.push(gone.shift());
    return { t1: t1, t2: [], chips: chips, gone: gone };
  }

  /* C: three lines at most, no second tier. Same-kind numbers share a line; only one cast condition keeps a sentence. */
  function C(rows) {
    var eff = [], fx = [], cond = null, gone = [], reacts = [];
    withK(rows).forEach(function (p) {
      if (p.type === 'effect') eff.push(p);
      else if (p.type === 'status') fx.push(p.name + ' ' + p.turns + 't');
      else if (p.type === 'ground') { var n = perNum(p); fx.push(p.name + ' ' + p.turns + 't' + (p.side ? ' (' + p.side + ')' : '') + (n ? ' ' + n : '')); }
      else if (p.type === 'dot') { var n2 = perNum(p); fx.push(p.name + ' ' + p.turns + 't' + (n2 ? ' ' + n2 : '')); }
      else if ((p.type === 'cond' && p.t.length <= 90 || isMod(p)) && !cond) cond = p;
      else if (p.type === 'reaction') reacts.push(p);
      else gone.push({ t: p.t, k: p.k });
    });
    var t1 = [];
    if (eff.length === 2 && eff.every(function (e) { return e.t.length < 60; })) t1.push({ t: shortAudience(eff[0].t) + '  ·  ' + shortAudience(eff[1].t), k: eff[0].k });
    else eff.slice(0, 2).forEach(function (e) { t1.push({ t: shortAudience(e.t), k: e.k }); });
    eff.slice(2).forEach(function (e) { gone.push({ t: e.t, k: e.k }); });
    if (fx.length) t1.push({ t: fx.join('  ·  '), k: null });
    if (cond && t1.length < 3) t1.push({ t: cond.t, k: cond.k }); else if (cond) gone.push({ t: cond.t, k: cond.k });
    var mr = mergeReactions(reacts); if (mr) gone.push(mr);
    if (!t1.length && gone.length) t1.push(gone.shift());
    while (t1.length > 3) { var l = t1.pop(); gone.push(l); }
    return { t1: t1, t2: [], chips: null, gone: gone };
  }

  var api = { parse: parse, now: now, A: A, B: B, C: C, mergeReactions: mergeReactions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TipRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
