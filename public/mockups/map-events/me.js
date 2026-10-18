/* HARITA OLAY PENCERELERI taslagi: oyun kodu DEGIL. Metinler oyunun verisinden (data/campaign/events.json, valdoria.json, campaign.json, data/classes).
   Ornek durum (altin 128, dusen kahramanlar Mage + Archer, diriltme 44) gercekte sefer durumundan gelir. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#ui-root'), stage = $('#stage');
  const UI = 'unified-inventory/ui-icons/', ST = 'unified-inventory/stat-icons/', AV = 'unified-inventory/avatars/', CL = 'map-events/cls/', ND = 'map-events/n/', SC = 'map-events/scenes/';
  const ICON = { gold: UI + 'gold.webp', gear: UI + 'gear.webp', bag: UI + 'bag.webp', rest: UI + 'rest.webp', hp: ST + 'hp.webp', sword: ND + 'battle.webp', str: ST + 'str.webp', dex: ST + 'dex.webp', int: ST + 'int.webp', luck: ST + 'luck.webp' };
  const SVG = {
    menu: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16 M4 12h5 M15 12h5 M4 18h16"/><path d="M12 9.2 l2.8 2.8 -2.8 2.8 -2.8 -2.8 z" stroke="#e0904a" fill="#e0702a" stroke-width="1"/></svg>',
    fs: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="round"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/></svg>',
    check: '<svg class="ck" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5 L5 9.5 L10 3"/></svg>',
    crown: '<svg class="crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 19V8l5 5 4-8 4 8 5-5v11z"/><circle cx="12" cy="15.5" r="1.3" fill="#e0702a" stroke="none"/></svg>',
  };
  const REG = { I: 'I · The Borderlands', II: 'II · Valdren Vale', III: 'III · The Northern Heights' };
  const COL = { treasure: '#efc85a', event: '#b99ad6', rest: '#f08c3c', merchant: '#9fc4a0', town: '#e3bf72', battle: '#cdb67f', start: '#cdb67f' };
  const NODES = { '1': ['Mill Road', 'start', .146, .846], '4': ['Ashford Village', 'town', .229, .231], '7': ['Valdren Keep', 'town', .448, .554], '6B': ['Dwarven Mine', 'treasure', .536, .5],
    '6A': ["Witch's Hut", 'event', .503, .606], '8A': ["St. Brann's Abbey", 'treasure', .674, .259], river: ['Riverside Camp', 'rest', .703, .477], fold: ["Shepherd's Fold", 'event', .945, .556] };

  // ---------- veri (oyun verisinden) ----------
  const CLS = {
    warrior: { name: 'Warrior', role: 'Melee Bruiser', stat: 'str', desc: 'A front-row fighter. Hits hard up close and holds the line.' },
    archer: { name: 'Archer', role: 'Marksman', stat: 'dex', desc: 'A back-row shooter. Picks off targets from a distance.' },
    paladin: { name: 'Paladin', role: 'Holy Healer', stat: 'int', desc: 'Mends wounds and shields the company with holy light.' },
    hexer: { name: 'Hexer', role: 'Curse Caster', stat: 'luck', desc: 'Withers enemies with curses and gambles on bad luck.' },
    druid: { name: 'Druid', role: 'Nature Summoner', stat: 'int', desc: 'Calls beasts and roots of the wild to fight beside you.' },
  };
  const INTRO = 'The Ash Curse spreading from Castle Morvane in the north swallows a little more of Valdoria each day. Your journey begins on Mill Road, on the western coast, and ends at Morvane\'s gate. Each stop is an encounter. You may only take one of the roads leading on from where you stand, and there is no turning back.';
  const EV = {
    fold: { node: 'fold', type: 'event', kind: 'Event', place: "Shepherd's Fold", sub: 'Rest', region: 'III', art: 'shepherds_fold', title: 'The Scattered Flock', lore: 'Shepherds huddle in a stone fold beneath the heights, their flocks scattered by beasts from the road.',
      paras: ['Shepherds huddle around a dying fire. Their flock scattered when the ash-hounds came down from the road. "Lord Morvane\'s beasts," the eldest mutters. "And his gate is worse."', 'Your company will make camp here whatever you choose.'],
      options: [
        { id: 'search', label: 'Search for the flock', tag: 'Fight', acc: 'ember', desc: 'Fight the ash-hounds that scattered the flock.', hint: "Fight the ash-hounds. Win: gold and the shepherds' gift. Then rest.", battle: true,
          chips: [['info', 'sword', 'Battle'], ['gain', 'gold', 'Win: 30 gold'], ['gain', 'gear', "Win: shepherds' gift"]] },
        { id: 'castle', label: 'Ask about the castle', tag: 'Talk', acc: 'violet', desc: 'Hear what the shepherds know about the gate tower.', hint: 'Hear what the shepherds know. Then rest.',
          chips: [['info', '', 'Learn about the enemy']], res: '"The gate tower never sleeps," the eldest says. "Knights in black plate stand on the wall, cracks of fire in their armour. Cinder Knights, we call them. They shield the witches behind them, and the witches set the ground alight. Strike the ones in the back first, if you can reach them."',
          resChips: [['info', '', 'Learned: Cinder Knights shield the witches']] },
        { id: 'bread', label: 'Share your bread', tag: 'Gift', acc: 'gold', desc: "Share your supplies. Tonight's rest heals everyone fully.", hint: "Pay 40 gold. Tonight's rest heals fully.", cost: 40,
          chips: [['loss', 'gold', '40 gold'], ['heal', 'rest', 'Rest heals 100%']], res: 'You share your supplies with the shepherds. Bellies full and spirits lifted, your company sleeps soundly by the fire.',
          resChips: [['loss', 'gold', '-40 gold'], ['heal', 'rest', "Tonight's rest heals 100%"]] },
        { id: 'rest', label: 'Just rest', tag: 'Free', acc: 'green', desc: 'Make camp as usual.', hint: 'Make camp as usual.',
          chips: [['heal', 'rest', 'Rest heals 50%']], res: 'You nod to the shepherds and make camp beside them.', resChips: [['heal', 'rest', 'Rest heals 50%']] },
      ] },
    witch: { node: '6A', type: 'event', kind: 'Event', place: "Witch's Hut", sub: 'Guarded', region: 'II', art: 'witchs_hut', title: "The Hedge Witch's Bargain", lore: 'Deep in the reeds a crooked hut steams with strange brews, and the hedge witch always names a price.',
      paras: ['"Your thralls are mud again," the witch says, not looking up from the pot. "No matter. Travellers always want something. So do I."', 'Beside the cauldron stands an iron-bound chest.'],
      options: [
        { id: 'pay', label: 'Pay her price', tag: 'Gold', acc: 'gold', desc: 'She gives you one item from her chest and a few coins.', hint: 'Pay 60 gold. She gives you one item from her chest and a few coins.', cost: 60,
          chips: [['loss', 'gold', '60 gold'], ['gain', 'gear', '1 item'], ['gain', 'gold', '25 gold']], res: 'The witch weighs the coins, grins, and rummages in the chest. She tosses you one piece and a few coppers. "That\'s what your gold buys."',
          resChips: [['loss', 'gold', '-60 gold'], ['gain', 'gear', '1 item from the chest'], ['gain', 'gold', '+25 gold']] },
        { id: 'blood', label: 'Pay in blood', tag: 'Blood', acc: 'red', desc: 'Every hero gives a drop of blood. No one dies.', hint: 'Every hero loses 20% of their current HP (no one dies). She gives you one item from her chest and a few coins.',
          chips: [['loss', 'hp', '-20% HP, every hero'], ['gain', 'gear', '1 item'], ['gain', 'gold', '25 gold']], res: 'A silver needle, a drop from each of you into the pot. The brew hisses. "Fair," she says, and hands you one piece from the chest and a few coins.',
          resChips: [['loss', 'hp', '-20% current HP, every hero'], ['gain', 'gear', '1 item from the chest'], ['gain', 'gold', '+25 gold']] },
        { id: 'steal', label: 'Steal her ingredients', tag: 'Fight', acc: 'ember', desc: 'Fight the witch for her chest.', hint: 'Fight the witch. Win: her chest and some gold.', battle: true,
          chips: [['info', 'sword', 'Battle'], ['gain', 'gear', 'Win: her chest'], ['gain', 'gold', 'Win: 25 gold']] },
        { id: 'leave', label: 'Leave', tag: 'Free', acc: 'dim', desc: 'Walk away with nothing.', hint: 'Walk away with nothing.', chips: [['dim', '', 'No change']],
          res: 'You leave the witch to her pot. Her laughter follows you into the reeds.', resChips: [['dim', '', 'Nothing gained, nothing lost']] },
      ] },
  };
  const TOWN = { ashford: { node: '4', bg: 'ashford', focusY: .58 }, valdren: { node: '7', bg: 'valdren', focusY: .5 } };
  const SCENES = {
    hero: { type: 'start', node: '1', kind: 'Journey', place: 'Mill Road', region: 'I', art: null, title: 'Choose your hero', paras: [INTRO], body: 'cards', group: 'hero', cards: ['warrior', 'archer'], leader: true,
      acts: [{ t: 'Begin the journey', p: 1, a: 'go', need: 'hero' }], toast: 'The journey begins at Mill Road...', cur: { w: 1300, h: 640 }, capText: 'Your company', lore: 'The first road of the journey.' },
    treasure: { type: 'treasure', node: '8A', kind: 'Treasure', place: 'Relic Vault', region: 'II', art: 'relic_vault', title: "St. Brann's Abbey", lore: 'Sworn brothers keep St. Brann\'s relic vault, sealed and untouched for a hundred years.',
      paras: ["Beyond the vault keepers lies the abbey's relic vault, untouched for a hundred years."], chipsCap: 'Inside', chips: [['gain', 'gear', 'Gear'], ['gain', 'gold', 'Gold'], ['info', 'check', 'Vault keepers defeated']],
      acts: [{ t: 'Open the chest', p: 1, a: 'go' }], toast: 'The chest opens: the Spoils card shows the gear and gold.', cur: { w: 980, h: 500, title: 'Treasure', sub: "St. Brann's Abbey", text: "Beyond the vault keepers lies the abbey's relic vault, untouched for a hundred years.\n\nOpen the vault to claim its gear and gold." } },
    mine: { type: 'treasure', node: '6B', kind: 'Treasure', place: 'Guarded', region: 'II', art: 'dwarven_mine', title: 'Dwarven Mine', lore: 'The dwarves left their mine long ago, but its wardens never stopped guarding what lies in the dark.',
      paras: ['The wardens have fallen. Deep in the mine you find a sealed dwarven chest.'], chipsCap: 'Inside', chips: [['gain', 'gear', 'Gear'], ['gain', 'gold', 'Gold'], ['info', 'check', 'Wardens defeated']],
      acts: [{ t: 'Open the chest', p: 1, a: 'go' }], toast: 'The chest opens: the Spoils card shows the gear and gold.', cur: { w: 980, h: 500, title: 'Treasure', sub: 'Dwarven Mine', text: 'The wardens have fallen. Deep in the mine you find a sealed dwarven chest.\n\nOpen the chest to claim its gear and gold.' } },
    fold: { ...EV.fold, ev: 'fold', body: 'plates', cur: { w: 1240, h: 760 } },
    witch: { ...EV.witch, ev: 'witch', body: 'plates', cur: { w: 1240, h: 760 } },
    rest: { type: 'rest', node: 'river', kind: 'Rest', place: 'Camp, Revive', region: 'II', art: 'river', title: 'Riverside Camp', lore: 'A sheltered bend in the river where weary companies light their fires and tend to their fallen.',
      paras: ['Your company makes camp. Resting is free.'], chipsCap: 'Rest', chips: [['heal', 'rest', 'Every living hero recovers 50% max HP'], ['info', 'gold', 'Free']], body: 'fallen', dismiss: false,
      acts: [{ t: 'Gear', a: 'gear' }, { t: 'Rest', p: 1, a: 'go' }], toast: 'The company rests: living heroes recover 50% of max HP.',
      cur: { w: 980, h: 500, title: 'Riverside Camp', sub: 'Rest · Camp, Revive', text: 'Your company makes camp. Resting is free: every living hero recovers 50% of their max HP.\n\nFallen heroes can be revived here for 44 gold each (they rise with 50% HP). You have 128 gold.' } },
    hearth: { type: 'town', node: '4', town: 'ashford', rect: [.385, .42, .57, .63], kind: 'Town', place: 'Ashford Village', region: 'I', art: 'ashford', artPos: [.48, .52], title: 'Campfire', lore: 'A quiet village of thatch and smoke, the last safe hearth before the road turns north toward the ash.',
      paras: ['Your company has rested: everyone healed and revived.'], chipsCap: 'Rested', chips: [['heal', 'hp', 'Every hero at full HP'], ['heal', 'rest', 'Fallen revived']], dismiss: true,
      acts: [{ t: 'Close', p: 1, a: 'close' }], cur: { w: 980, h: 0, title: 'Campfire', sub: 'Ashford Village', text: 'Your company has rested: everyone healed and revived.' } },
    board: { type: 'town', node: '4', town: 'ashford', rect: [.585, .405, .67, .58], kind: 'Town', place: 'Ashford Village', region: 'I', art: 'ashford', artPos: [.63, .5], title: 'Notice Board', lore: 'A quiet village of thatch and smoke, the last safe hearth before the road turns north toward the ash.',
      paras: ['Notices of burned farms and missing travellers. No one here seeks to join a company. Recruits gather in the cities.'], chipsCap: 'Recruits', chips: [['dim', '', 'No one here seeks to join you']], dismiss: true,
      acts: [{ t: 'Close', p: 1, a: 'close' }], cur: { w: 980, h: 0, title: 'Notice Board', sub: 'Ashford Village', text: 'Notices of burned farms and missing travellers. No one here seeks to join a company. Recruits gather in the cities.' } },
    recruit: { type: 'town', node: '7', town: 'valdren', rect: [.55, .27, .815, .58], kind: 'City', place: 'Valdren Keep', region: 'II', art: 'valdren', artPos: [.68, .45], title: 'Barracks', lore: "Valdren Keep still flies the king's banner, though its soldiers stopped waiting for his return long ago.",
      paras: ['Fighters at the barracks offer their swords. Choose one companion, or come back before you leave.'], body: 'cards', group: 'recruit', cards: ['paladin', 'hexer', 'druid'], dismiss: true,
      acts: [{ t: 'Not now', a: 'close' }, { t: 'Join us', p: 1, a: 'go', need: 'recruit' }], toast: 'Joins your company (mockup).', cur: { w: 1100, h: 660, title: 'Barracks', text: 'Fighters at the barracks offer their swords. Choose one companion, or come back before you leave.' } },
  };
  const SCN = ['hero', 'treasure', 'mine', 'fold', 'witch', 'result', 'rest', 'hearth', 'recruit', 'board'];
  const VN = { cur: 'Today', a: 'A Plaque', b: 'B Scene left', c: 'C Anchored' };
  const VT = { cur: 'Windows exactly as they are in the game today', a: 'Centered plaque: title strip + scene banner + plates', b: 'Scene on the left, text and choices on the right', c: 'Small card next to the node (Start Battle language)' };
  let S = { v: 'a', s: 'treasure', ev: 'witch', r: 'blood', gold: 128, u: 0, pick: { hero: 'warrior', recruit: '' }, shut: false };
  let key = '';

  function readHash() {
    S.u = 0;
    location.hash.replace(/^#/, '').split('&').forEach((p) => {
      const [k, v] = p.split('=');
      if (['cur', 'a', 'b', 'c'].includes(k) && v === undefined) S.v = k;
      else if (k === 's' && SCN.includes(v)) S.s = v;
      else if (k === 'ev' && EV[v]) S.ev = v;
      else if (k === 'r') S.r = v;
      else if (k === 'gold') S.gold = +v || 0;
      else if (k === 'u') S.u = +v || 0;
      else if (k === 'clean') document.documentElement.classList.add('mk-clean');
    });
    S.shut = false;
  }
  function writeHash() { history.replaceState(null, '', `#${S.v}&s=${S.s}${S.s === 'result' ? `&ev=${S.ev}&r=${S.r}` : ''}${S.gold !== 128 ? '&gold=' + S.gold : ''}${S.u ? '&u=' + S.u : ''}${document.documentElement.classList.contains('mk-clean') ? '&clean' : ''}`); }

  // ---------- parcalar ----------
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  const img = (s, c = '') => `<img src="${s}" alt="" draggable="false"${c ? ` class="${c}"` : ''}>`;
  const chip = ([k, i, t], big) => `<span class="me-chip ${k}${big ? ' big' : ''}">${i === 'check' ? SVG.check : i ? img(ICON[i]) : ''}${t}</span>`;
  const chips = (l, big) => `<div class="me-chips">${l.map((c) => chip(c, big)).join('')}</div>`;
  function medal(type, size) {
    const c = COL[type] || COL.battle, D = 'url(#me-disc)';
    const tab = (k) => `<path d="M${k * 30} -7 L${k * 46} 0 L${k * 30} 7 L${k * 34} 0Z" fill="${c}" stroke="rgba(0,0,0,.5)"/>`;
    let b, isz = 54;
    if (type === 'town') {
      const flag = (k) => `<path d="M${k * 40} -12 L${k * 40} 16 M${k * 40} -12 L${k * 58} -6 L${k * 40} 0" stroke="${c}" stroke-width="2" fill="#8c2b1c" stroke-linejoin="round"/>`;
      b = `${flag(-1)}${flag(1)}<path d="M-14 -44 v-8 h6 v5 h5 v-5 h6 v5 h5 v-5 h6 v8Z" fill="${c}" stroke="rgba(0,0,0,.5)"/><circle r="34" fill="${D}" stroke="${c}" stroke-width="3.2"/><circle r="39" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="1.4"/>`; isz = 60;
    } else if (type === 'start' || type === 'battle') b = `<circle r="28" fill="${D}" stroke="${c}" stroke-width="2"/><circle r="31.5" fill="none" stroke="${c}" stroke-opacity=".3"/>`;
    else b = `${tab(-1)}${tab(1)}<circle r="29" fill="${D}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>`;
    const px = `width:max(${size[0]}px,calc(${size[1]} * var(--u)));height:max(${size[0]}px,calc(${size[1]} * var(--u)))`;
    return `<svg class="me-medal" viewBox="-62 -62 124 124" style="${px}">${b}<image href="${ND}${type}.webp" x="${-isz / 2}" y="${-isz / 2 - 1}" width="${isz}" height="${isz}"/></svg>`;
  }
  const artStyle = (c) => (c.art ? `background-image:url(${SC}${c.art}.webp);background-position:${Math.round((c.artPos ? c.artPos[0] : .5) * 100)}% ${Math.round((c.artPos ? c.artPos[1] : .5) * 100)}%` : '');
  const acc = (c) => `--ac:${COL[c.type]};--acr:${rgb(COL[c.type])}`;

  // dunya bilgisi (ornek durum)
  const reviveCost = 44;
  function plate(o, mode, st) {
    const blocked = o.cost && S.gold < o.cost;
    const need = blocked ? `<span class="need">Needs ${o.cost} gold (you have ${S.gold})</span>` : '';
    const cs = st === 'chosen' ? '' : chips(o.chips);
    const inner = mode === 'compact'
      ? `<div class="main"><b class="me-pnm">${o.label}</b><p class="me-pds">${o.desc}</p></div>${cs}${need}`
      : `<b class="me-pnm">${o.label}</b><p class="me-pds">${o.desc}</p><div class="me-pdv"></div>${cs}${need}`;
    return `<button type="button" class="me-plate acc-${o.acc}${blocked ? ' dim' : ''}${st === 'chosen' ? ' chosen' : ''}" ${st === 'chosen' ? 'tabindex="-1"' : `data-act="opt" data-id="${o.id}"`}><span class="me-ptag">${st === 'chosen' ? 'You chose' : o.tag}</span>${inner}</button>`;
  }
  function cardsHtml(c) {
    const sel = S.pick[c.group];
    return `<div class="me-cards">${c.cards.map((id) => {
      const k = CLS[id], on = sel === id;
      return `<button type="button" class="me-card cc-${id}${on ? ' sel' : ''}" data-act="pick" data-id="${id}"><div class="pt">${img(AV + id + '.webp', 'av')}${img(CL + id + '.webp', 'em')}${on && c.leader ? SVG.crown : ''}</div>
        <span class="nm">${k.name}</span>${chips([['info', '', k.role], ['gain', k.stat, k.stat.toUpperCase()]])}<p class="ds">${k.desc}</p></button>`;
    }).join('')}</div>`;
  }
  function fallenHtml() {
    const rows = ['mage', 'archer'].map((id) => { const off = S.gold < reviveCost; return `<div class="me-frow">${img(AV + id + '.webp', 'av')}<div class="tx"><b>${id[0].toUpperCase() + id.slice(1)}</b><span>Fallen. Rises with 50% HP.</span></div><button type="button" class="el-btn${off ? ' off' : ''}" data-act="revive">Revive ${reviveCost}${img(ICON.gold)}</button></div>`; }).join('');
    return `<div class="me-fallen">${rows}<div class="me-state"><span>Fallen heroes can be revived here for gold.</span><span>Gold <b>${S.gold}</b></span></div></div>`;
  }
  function acts(c) {
    if (!c.acts) return '';
    return `<div class="me-acts">${c.acts.map((a) => {
      const dis = a.need && !S.pick[a.need];
      return `<button class="el-btn${a.p ? ' primary ready' : ''}" type="button" data-act="${a.a}"${dis ? ' disabled title="Pick one first"' : ''}>${a.t}</button>`;
    }).join('')}</div>`;
  }
  const paras = (c) => `<div class="me-txt">${c.paras.map((p) => `<p>${p}</p>`).join('')}</div>`;

  // sonuc ekrani: olay secenegi -> sonuc
  function resultScene() {
    const ev = EV[S.ev] || EV.witch, o = ev.options.find((x) => x.id === S.r && x.res) || ev.options.find((x) => x.res);
    return { ...ev, result: o, kind: 'Event', title: ev.title, paras: [o.res], body: 'chosen', chipsCap: 'What changed', chips: o.resChips, ev: S.ev, dismiss: false,
      acts: [{ t: 'Continue', p: 1, a: 'go' }], toast: 'Back to the map (the Spoils card follows if there is loot).', cur: { w: 1240, h: 480, title: ev.title, sub: o.label, text: o.res } };
  }
  const bodyFor = (c, mode) => {
    if (c.body === 'plates') return `<div class="me-plates${mode === 'one' || mode === 'compact' ? ' one' : ''}${mode === 'compact' ? ' compact' : ''}">${c.options.map((o) => plate(o, mode)).join('')}</div>`;
    if (c.body === 'chosen') return `<div class="me-plates one solo${mode === 'compact' ? ' compact' : ''}">${plate(c.result, mode, 'chosen')}</div>`;
    if (c.body === 'cards') return cardsHtml(c);
    if (c.body === 'fallen') return fallenHtml();
    return '';
  };
  const chipBlock = (c, big) => (c.chips ? `${c.chipsCap ? `<h3 class="me-cap">${c.chipsCap}</h3>` : ''}${chips(c.chips, big)}` : '');
  const tags = (c) => `<div class="me-tags"><span class="me-chip type" style="--ac:${COL[c.type]}">${c.kind}</span>${c.place && c.place !== c.title ? `<span class="me-chip dim">${c.place}</span>` : ''}<span class="me-chip dim">${REG[c.region]}</span></div>`;
  const corners = '<i class="me-corner tl"></i><i class="me-corner tr"></i><i class="me-corner bl"></i><i class="me-corner br"></i>';

  function winCur(c) {
    const k = c.cur;
    let mid = '';
    if (c.body === 'plates') mid = c.options.map((o) => `<div class="crow"><button type="button" class="el-btn" data-act="opt" data-id="${o.id}">${o.label}</button><span>${o.hint}${o.cost && S.gold < o.cost ? ` (you have ${S.gold} gold)` : ''}</span></div>`).join('');
    if (c.body === 'cards') mid = `<div class="ccards">${c.cards.map((id) => `<button type="button" class="cc${S.pick[c.group] === id ? ' sel' : ''}" data-act="pick" data-id="${id}">${img(AV + id + '.webp')}<b>${CLS[id].name}</b><i>${CLS[id].stat.toUpperCase()}</i></button>`).join('')}</div>`;
    let btn;
    if (c.body === 'fallen') btn = `${['Mage', 'Archer'].map((n) => `<button class="el-btn" type="button" data-act="revive">Revive ${n} · ${reviveCost}</button>`).join('')}<button class="el-btn" type="button" data-act="gear">Gear</button><button class="el-btn primary ready" type="button" data-act="go">Rest</button>`;
    else btn = (c.acts || []).map((a) => `<button class="el-btn${a.p ? ' primary ready' : ''}" type="button" data-act="${a.a}"${a.need && !S.pick[a.need] ? ' disabled' : ''}>${a.t}</button>`).join('');
    if (c.body === 'plates') btn = '';
    const txt = k.text || c.paras.join('\n\n');
    return `<div class="me-win me-center cur"><div class="me-panel" style="width:min(100%,max(calc(${k.w} * var(--u)),560px));${k.h ? `min-height:calc(${k.h} * var(--u))` : ''}">${corners}
      <div class="head"><i></i><h2 class="me-t">${k.title || c.title}</h2><i></i></div>${k.sub ? `<p class="sub">${k.sub}</p>` : ''}<div class="tx">${txt}</div>
      <div class="mid">${mid}</div>${btn ? `<div class="acts">${btn}</div>` : '<div style="height:max(10px,calc(30 * var(--u)))"></div>'}</div></div>`;
  }
  function winA(c) {
    return `<div class="me-win me-center vA ${c.type} bd-${c.body || 'none'}"><div class="me-panel" style="${acc(c)}">${corners}
      <div class="me-hd">${medal(c.type, [44, 96])}<div class="tx"><h2 class="me-t">${c.title}</h2>${tags(c)}</div></div>
      ${c.art ? `<div class="me-art" style="${artStyle(c)}"></div>` : ''}
      <div class="me-scroll"><div class="me-body">${paras(c)}${chipBlock(c, c.body !== 'plates')}${bodyFor(c, 'grid')}${acts(c)}</div></div></div></div>`;
  }
  function winB(c) {
    return `<div class="me-win me-center vB ${c.type}"><div class="me-panel" style="${acc(c)}">${corners}
      <div class="me-side"><div class="me-art" style="${artStyle(c) || 'background:radial-gradient(circle at 50% 30%,#2a1e12,#0d0906)'}"></div><div class="cap">${medal(c.type, [56, 130])}<p class="me-lore">${c.lore || ''}</p></div></div>
      <div class="me-main"><div class="hd">${tags(c)}<h2 class="me-t">${c.title}</h2></div><div class="me-scroll"><div class="me-body">${paras(c)}${chipBlock(c, c.body !== 'plates')}${bodyFor(c, 'compact')}${acts(c)}</div></div></div></div></div>`;
  }
  function winC(c) {
    const wide = c.body === 'plates' || c.body === 'fallen' || (c.cards && c.cards.length > 2);
    return `<div class="me-win vC${wide ? ' wide' : ''} ${c.type}"><div class="me-panel" style="${acc(c)}"><i class="me-notch l"></i><i class="me-notch r"></i>
      ${c.art ? `<div class="me-art" style="${artStyle(c)}"></div>` : ''}
      <div class="me-hd2">${medal(c.type, [40, 90])}<div class="tx"><h2 class="me-t">${c.title}</h2>${tags(c)}</div></div>
      <div class="me-scroll"><div class="me-body">${paras(c)}${chipBlock(c)}${bodyFor(c, wide ? 'grid' : 'compact')}${acts(c)}</div></div></div></div>`;
  }

  // ---------- zemin: harita ya da kasaba ----------
  function backdrop(c) {
    const vw = innerWidth, vh = innerHeight;
    const cx = S.v === 'c' ? 0.3 : 0.5, cy = 0.5;
    if (c.town) {
      const T = TOWN[c.town], W = Math.max(vw, vh * 1.5), H = W / 1.5;
      const L = (vw - W) / 2, Tp = Math.min(0, Math.max(vh - H, vh * .5 - T.focusY * H));
      const [x0, y0, x1, y1] = c.rect, px = [L + (x0 + x1) / 2 * W, Tp + (y0 + y1) / 2 * H];
      return { html: `<div class="me-town" style="left:${L}px;top:${Tp}px;width:${W}px;height:${H}px;background-image:url(${SC}${T.bg}.webp);background-size:100% 100%"></div><div class="me-hot" style="left:${px[0]}px;top:${px[1]}px">${c.title}</div>`, px };
    }
    const W = Math.max(vw, vh * 1672 / 941), H = W * 941 / 1672, t = NODES[c.node];
    const L = Math.min(0, Math.max(vw - W, vw * cx - t[2] * W)), Tp = Math.min(0, Math.max(vh - H, vh * cy - t[3] * H));
    const nodes = Object.entries(NODES).map(([id, n]) => `<div class="sb-node${id === c.node ? ' target' : ''}" style="left:${n[2] * 100}%;top:${n[3] * 100}%">${img(ND + (n[1] === 'start' ? 'start' : n[1]) + '.webp')}<span class="lab">${n[0]}</span></div>`).join('');
    return { html: `<div class="sb-map" style="left:${L}px;top:${Tp}px;width:${W}px;height:${H}px">${nodes}</div>`, px: [L + t[2] * W, Tp + t[3] * H] };
  }

  function current() { return S.s === 'result' ? resultScene() : SCENES[S.s]; }
  function render() {
    const c = current();
    const k = `${S.v}|${S.s}|${S.s === 'result' ? S.ev + S.r : ''}|${S.gold}`;
    const bd = backdrop(c);
    const w = S.v === 'cur' ? winCur(c) : S.v === 'a' ? winA(c) : S.v === 'b' ? winB(c) : winC(c);
    stage.className = S.shut ? 'me-shut' : '';
    root.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="me-disc" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="#4a3622"/><stop offset=".7" stop-color="#1c130b"/><stop offset="1" stop-color="#0d0805"/></radialGradient></defs></svg>
      ${bd.html}<div class="sb-scrim" data-act="${c.dismiss ? 'close' : 'noop'}" style="background:rgba(5,3,2,${S.v === 'c' ? .42 : .62})"></div>${w}
      <button class="nav-btn settings-toggle fullscreen-toggle" type="button" title="Fullscreen" aria-label="Fullscreen" data-act="fs">${SVG.fs}</button>
      <button class="nav-btn settings-toggle" type="button" title="Menu (Esc)" aria-label="Menu" data-act="menu">${SVG.menu}</button><div class="mk-toast"></div>`;
    if (k !== key) stage.classList.add('me-in');
    key = k;
    if (S.v === 'c') place(bd.px);
    strip();
  }
  function place([nx, ny]) {
    const w = $('.me-win'), vw = innerWidth, vh = innerHeight;
    if (!w) return;
    const cw = w.offsetWidth, ch = w.offsetHeight, gu = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu')) || 1, r = Math.max(13, 29 * gu);
    const lab = $('.sb-node.target .lab'), hot = $('.me-hot'), gap = Math.max(r + 22, (lab ? lab.offsetWidth / 2 : hot ? hot.offsetWidth / 2 : 0) + 14);
    let left = nx + gap, side = 'l';
    if (left + cw > vw - 10) { left = nx - gap - cw; side = 'r'; }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, ny - ch / 2));
    w.style.left = left + 'px'; w.style.top = top + 'px';
    const notch = $(`.me-notch.${side}`, w), other = $(`.me-notch.${side === 'l' ? 'r' : 'l'}`, w);
    other.style.display = 'none';
    notch.style.top = Math.max(18, Math.min(ch - 30, ny - top - 8)) + 'px';
  }
  function layout() {
    const w = innerWidth, h = innerHeight, de = document.documentElement;
    const u = S.u || Math.min(h / 1080, w / 1920);
    de.style.setProperty('--gu', `${u}px`);
    de.classList.toggle('short', S.u ? S.u <= 0.5 : h <= 520);
    de.classList.toggle('compact', S.u ? S.u <= 0.66 : h <= 720);
    de.classList.add('menu-btn-on');
    de.style.setProperty('--nav-k', String(matchMedia('(pointer: coarse)').matches ? 1 : Math.min(1.75, Math.max(1, Math.round((h / 640) / 0.05) * 0.05))));
  }
  const toast = (m) => { const t = $('.mk-toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
  function act(a, id) {
    const c = current();
    if (a === 'noop') return toast('This window is a required choice: tapping the dark area does nothing.');
    if (a === 'close') { S.shut = true; render(); toast('Closed: back to the map / town (dark area, Esc or Close).'); }
    else if (a === 'go') { if (c.toast) toast(c.toast); }
    else if (a === 'gear') toast('Gear opens (shared Gear screen).');
    else if (a === 'revive') toast(S.gold < reviveCost ? 'Not enough gold' : `Hero revived for ${reviveCost} gold (HP 50%).`);
    else if (a === 'pick') { const c0 = current(); S.pick[c0.group] = id; render(); }
    else if (a === 'opt') {
      const ev = EV[c.ev], o = ev.options.find((x) => x.id === id);
      if (o.cost && S.gold < o.cost) return toast('Not enough gold');
      if (o.battle) return toast('The fight starts (mockup): after a win the result and loot follow.');
      S.s = 'result'; S.ev = c.ev; S.r = id; writeHash(); key = ''; render();
    }
    else if (a === 'fs') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {});
    else if (a === 'menu') toast('Menu (Esc): Resume · Save · Codex · Settings · Main Menu');
  }
  root.addEventListener('click', (ev) => { const b = ev.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b.dataset.id); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { const c = current(); c.dismiss ? act('close') : act('menu'); }
    if (e.key === 'h' || e.key === 'H') { document.documentElement.classList.toggle('mk-clean'); writeHash(); }
  });
  function strip() {
    let s = $('#mk-strip');
    if (!s) {
      s = document.createElement('div'); s.id = 'mk-strip';
      s.innerHTML = `<b class="keep">MOCKUP</b>${['cur', 'a', 'b', 'c'].map((v) => `<button type="button" data-v="${v}" title="${VT[v]}">${VN[v]}</button>`).join('')}<span class="sep"></span>${SCN.map((m) => `<button type="button" data-e="${m}">${m}</button>`).join('')}<span class="sep"></span><button type="button" data-x="gold" title="Toggle low gold (30): blocked choices">gold 30</button><button type="button" data-x="open" title="Open the window again">Reopen</button><button type="button" data-x="clean" title="Hide strip (H)">Hide</button><button class="keep" type="button" data-x="min">–</button>`;
      s.addEventListener('click', (ev) => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.v) S.v = b.dataset.v;
        else if (b.dataset.e) { if (b.dataset.e === 'result' && S.s === 'result') { const o = EV[S.ev].options.filter((x) => x.res); S.r = o[(o.findIndex((x) => x.id === S.r) + 1) % o.length].id; } S.s = b.dataset.e; }
        else if (b.dataset.x === 'gold') S.gold = S.gold === 30 ? 128 : 30;
        else if (b.dataset.x === 'clean') { document.documentElement.classList.add('mk-clean'); writeHash(); return; }
        else if (b.dataset.x === 'min') { document.documentElement.classList.toggle('mk-strip-min'); return; }
        S.shut = false; if (S.s === 'result' && !EV[S.ev].options.find((x) => x.id === S.r && x.res)) S.r = 'blood'; writeHash(); key = ''; render();
      });
      document.body.append(s);
    }
    s.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v));
    s.querySelectorAll('[data-e]').forEach((b) => b.classList.toggle('on', b.dataset.e === S.s));
    s.querySelector('[data-x=gold]').classList.toggle('on', S.gold === 30);
  }
  readHash(); layout(); render();
  addEventListener('resize', () => { layout(); render(); });
  addEventListener('hashchange', () => { readHash(); layout(); key = ''; render(); });
  window.__me = { S: () => S, render };
})();
