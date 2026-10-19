/* Primary bonus taslagi (sade, 2026-10-19). Oyun kodu DEGIL. Metinler src/engine/stat-info.ts'ten. */
(function () {
  const esc = MK.esc;
  const rich = (t) => esc(t).replace(/(\d+(?:[.,]\d+)?%?)/g, '<span class="n">$1</span>');
  const ST = { str: { name: 'Strength', ac: '#ff9f43', icon: 'str' }, int: { name: 'Intelligence', ac: '#7dc4ff', icon: 'int' } };
  const FULL = 'every debuff applied to you has a 35% chance to last 1 turn less (never below 1 turn)';
  const SHORT = '35% chance for debuffs on you to last 1 turn less';
  const STR_L = ['Max HP +3 per point', 'HP regen +0.125 per point at the start of each turn', 'Strength skills deal 1x of STR as base damage'];
  const INT_L = ['Max MP 30 base + 1 per point', 'MP regen +0.165 per point at the start of each turn (0 INT = none)', 'Intelligence skills (magic damage, heals, magic shields) use 1x of INT'];
  const CASES = [
    { k: 'str', pts: 26, pri: true, cap: 'Warrior STR <b>26</b> - primary', lines: STR_L, nows: ['now 108', 'now 3', ''] },
    { k: 'int', pts: 3, pri: false, cap: 'Warrior INT <b>3</b> - not primary', lines: INT_L, nows: ['now 33', 'now 0', ''] },
  ];
  const ln = (t, now, cls) => `<div class="bt-ln${now ? ' has-now' : ''}${cls ? ' ' + cls : ''}">${now ? `<div class="main"><span class="dia"></span><div class="tx">${rich(t)}</div></div><span class="now bt-chip v">${rich(now)}</span>` : `<span class="dia"></span><div class="tx">${rich(t)}</div>`}</div>`;
  const bonusRow = (cls) => ln(`Primary bonus: Resilience - ${FULL}`, '', cls).replace('Primary bonus: Resilience', '<span class="pb-gold">Primary bonus: Resilience</span>');
  const body = (c, first, last) => `<div class="bt-div"></div><div class="bt-body">${first || ''}${c.lines.map((l, i) => ln(l, c.nows[i])).join('')}${last || ''}</div>`;
  const head = (c, sub, aside) => {
    const s = ST[c.k];
    return `<div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(${MK.st(s.icon)})"></span><div class="bt-ht"><div class="bt-kind">Attribute</div><div class="bt-title">${s.name}</div>${sub || ''}</div><div class="bt-aside"><div class="bt-big">${c.pts}<small>points</small></div>${aside || ''}</div></div>`;
  };
  const wrap = (c, inner, cls) => `<div class="bt ${cls || ''}" style="--ac:${ST[c.k].ac}">${inner}</div>`;

  const builders = {
    cur: (c) => wrap(c, head(c) + body(c, '', c.pri ? bonusRow() : '')),
    // V1: basligin altinda tek duz satir
    v1: (c) => wrap(c, head(c, c.pri ? `<div class="pb-sub"><span class="pb-gold">Primary:</span> ${rich(SHORT)}</div>` : '') + body(c)),
    // V2: degerin altinda kucuk "Primary" etiketi; bonus maddesi sirasinda
    v2: (c) => wrap(c, head(c, '', c.pri ? '<span class="pb-tag">Primary</span>' : '') + body(c, '', c.pri ? bonusRow() : '')),
    // V3: bonus tek satir, govdenin ilk satiri, ince altin kenarli
    v3: (c) => wrap(c, head(c) + body(c, c.pri ? bonusRow('pb-hl') : ''), 'pb-first'),
  };
  const mk = (key) => (host) => {
    const row = document.createElement('div');
    row.className = 'pb-row';
    row.innerHTML = CASES.map((c) => `<div class="pb-cell"><div class="pb-cap">${c.cap}</div>${builders[key](c)}</div>`).join('');
    host.append(row);
  };
  MK.mount({
    title: 'Primary bonus tooltips',
    sections: [
      { id: 'cur', h: 'Current (A Band, as in game)', note: 'Bonus is the last bullet, one long sentence; nothing on non-primary stats.', build: mk('cur') },
      { id: 'v1', h: 'V1 - One plain line under the stat name', note: '"Primary: 35% chance for debuffs on you to last 1 turn less" right under Strength. Body unchanged, long bullet removed.', build: mk('v1') },
      { id: 'v2', h: 'V2 - Small "Primary" tag under the value', note: 'Just a small gold word under the point count; the bonus bullet stays at the bottom as today.', build: mk('v2') },
      { id: 'v3', h: 'V3 - Bonus as the first row', note: 'Same bullet as today, moved to the top of the list with a thin gold edge and gold name.', build: mk('v3') },
    ],
  });
})();
