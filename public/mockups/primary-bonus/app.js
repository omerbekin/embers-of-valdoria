/* Primary bonus taslagi (ui-dev, 2026-10-19). Oyun kodu DEGIL. Metinler src/engine/stat-info.ts'ten. */
(function () {
  const esc = MK.esc;
  const rich = (t) => esc(t).replace(/(\d+(?:[.,]\d+)?%?)/g, '<span class="n">$1</span>');
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const ST = { str: { name: 'Strength', ac: '#ff9f43', icon: 'str' }, int: { name: 'Intelligence', ac: '#7dc4ff', icon: 'int' } };
  const BON = {
    str: { name: 'Resilience', val: '35%', short: '35% debuff -1 turn', full: 'every debuff applied to you has a 35% chance to last 1 turn less (never below 1 turn)', who: 'Warrior, Defender' },
    int: { name: 'Mana Echo', val: '20%', short: '20% refund half MP', full: 'after each skill, 20% chance to get back half of its MP cost (rounded up, at least 1)', who: 'Mage, Paladin, Druid +2' },
  };
  const STR_L = ['Max HP +3 per point', 'HP regen +0.125 per point at the start of each turn', 'Strength skills deal 1x of STR as base damage'];
  const INT_L = ['Max MP 30 base + 1 per point', 'MP regen +0.165 per point at the start of each turn (0 INT = none)', 'Intelligence skills (magic damage, heals, magic shields) use 1x of INT'];
  const CASES = [
    { k: 'str', pts: 26, pri: true, on: true, cap: 'Warrior STR <b>26</b> - primary, bonus on', lines: STR_L, nows: ['now 108', 'now 3', ''] },
    { k: 'str', pts: 12, pri: true, on: false, cap: 'Warrior STR <b>12</b> - primary, bonus off (INT 14 is higher)', lines: STR_L, nows: ['now 66', 'now 2', ''] },
    { k: 'int', pts: 3, pri: false, on: false, cap: 'Warrior INT <b>3</b> - not primary', lines: INT_L, nows: ['now 33', 'now 0', ''] },
    { k: 'int', pts: 18, pri: true, on: true, cap: 'Druid INT <b>18</b> - primary, bonus on', lines: INT_L, nows: ['now 48', 'now 3', ''] },
  ];
  const ln = (t, now, cls) => `<div class="bt-ln${now ? ' has-now' : ''}${cls ? ' ' + cls : ''}">${now ? `<div class="main"><span class="dia"></span><div class="tx">${rich(t)}</div></div><span class="now bt-chip v">${rich(now)}</span>` : `<span class="dia"></span><div class="tx">${rich(t)}</div>`}</div>`;
  const body = (c, extra, tail) => `<div class="bt-div"></div><div class="bt-body">${extra || ''}${c.lines.map((l, i) => ln(l, c.nows[i])).join('')}${tail || ''}</div>`;
  const offNote = (st) => `<div class="pb-offnote"${st || ''}>Inactive: this is not the unit's highest stat</div>`;
  const head = (c, kind, sub) => {
    const s = ST[c.k];
    return `<div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(${MK.st(s.icon)})"></span><div class="bt-ht"><div class="bt-kind">${esc(kind)}</div><div class="bt-title">${s.name}</div>${sub || ''}</div><div class="bt-aside"><div class="bt-big">${c.pts}<small>points</small></div></div></div>`;
  };
  const wrap = (c, inner, cls) => `<div class="bt pb-em ${cls || ''}" style="--ac:${ST[c.k].ac}">${inner}</div>`;
  const kindOf = (c) => (c.pri ? `Primary · ${BON[c.k].name}` : 'Attribute');

  const builders = {
    cur(c) {
      const b = BON[c.k];
      const tail = c.pri ? ln(`Primary bonus: ${b.name} - ${b.full}`) + (c.on ? '' : `<div class="bt-ln"><span class="dia"></span><div class="tx pb-offnote">Inactive: this is not the unit's highest stat</div></div>`) : '';
      return wrap(c, head(c, kindOf(c)) + body(c, '', tail));
    },
    v1(c) {
      const b = BON[c.k];
      const plate = c.pri ? `<div class="pb-plate${c.on ? '' : ' off'}"><div class="t"><span class="pb-dia"></span><span class="pb-lab">Primary bonus</span>${c.on ? '' : '<span class="pb-off">Off</span>'}<span class="pb-name">${b.name}</span></div><div class="pb-eff">${rich(cap1(b.full))}${c.on ? '' : offNote()}</div></div>` : '';
      return wrap(c, head(c, kindOf(c)) + body(c, plate), 'v1');
    },
    v2(c) {
      const b = BON[c.k];
      const sec = c.pri ? `<div class="bt-div"></div><div class="pb-sec${c.on ? '' : ' off'}"><div class="hd"><span class="pb-dia"></span><span class="pb-lab">Primary bonus</span>${c.on ? '' : '<span class="pb-off">Off</span>'}</div><div class="nm"><span class="val">${b.val}</span><span class="pb-name">${b.name}</span></div><div class="eff pb-eff">${rich(cap1(b.full))}</div>${c.on ? '' : offNote(' style="margin-top:.35em"')}</div>` : '';
      return wrap(c, head(c, kindOf(c)) + body(c) + sec, 'v2');
    },
    v3(c) {
      const b = BON[c.k];
      const lock = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>';
      let sub, tail = '';
      if (c.pri) {
        sub = `<div class="pb-chip${c.on ? '' : ' lock'}">${c.on ? '<span class="pb-dia"></span>' : lock}${b.name}${c.on ? '' : ' · off'}</div><div class="pb-sub${c.on ? '' : ' lock'}">${rich(b.short)}${c.on ? '' : ' · not your highest stat'}</div>`;
        tail = ln(cap1(b.full), '', 'long');
      } else {
        sub = `<div class="pb-chip lock">${lock}${b.name}</div><div class="pb-sub lock">Primary for ${b.who}</div>`;
      }
      return wrap(c, head(c, c.pri ? 'Primary stat' : 'Attribute', sub) + body(c, '', tail), 'v3');
    },
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
      { id: 'cur', h: 'Current (A Band, as in game)', note: 'Bonus is the last plain bullet, one long sentence. Not shown at all on non-primary stats.', build: mk('cur') },
      { id: 'v1', h: 'V1 - Ember plate on top of the body', note: 'A highlighted ember plate opens the body: small PRIMARY BONUS label, bonus name in gold on the right, the effect underneath. Off state greys the plate and adds an OFF chip. Non-primary stat unchanged (no plate).', build: mk('v1') },
      { id: 'v2', h: 'V2 - Separate section under a divider', note: 'After the stat lines, a divider, then an ember diamond + PRIMARY BONUS label, big ember value box (35% / 20%), name in gold, effect text. Off state greys it. Non-primary stat unchanged.', build: mk('v2') },
      { id: 'v3', h: 'V3 - Gold chip in the header', note: 'Bonus name as a chip right under the stat name, one-line effect below it; the full rule stays as a dim last line. Non-primary stats show a locked chip with "Primary for ..." (new information).', build: mk('v3') },
    ],
  });
})();
