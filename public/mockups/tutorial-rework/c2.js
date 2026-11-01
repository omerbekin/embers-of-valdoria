'use strict';
(function () {
  const V = KIT.q.v || 'a', S = KIT.q.s === 'none' ? 'none' : 'notes';
  const NOTES = [
    ['Reading a Fighter', 'Tap or hover over any fighter to read their stats, passive and cooldowns.'],
    ['Statuses', 'Icons beside a health bar are statuses, like Slow or Wound. Tap the unit to read what they do.'],
    ['Area Shapes', 'Area skills hit a fixed shape of cells. The lit cells show exactly who gets caught.'],
  ].slice(0, Math.max(1, Math.min(3, Number(KIT.q.n) || 3)));
  const have = S === 'notes' && NOTES.length > 0;
  const st = { open: !!KIT.q.o, toast: false };
  const stage = document.getElementById('stage');
  const av = (k) => 'art/av/' + k + '.webp', ic = (k) => 'art/ic/' + k + '.webp';
  const face = '<span class="gf"><img src="garrick.webp" alt="Garrick"></span>';
  const num = (n, c) => (n > 0 ? `<span class="${c}">${n}</span>` : '<span class="zero">-</span>');
  const row = (n, k, tag, d, t, h) => `<div class="u"><span class="pf"><img src="${av(k)}" alt=""></span><div class="id">${n}${tag ? `<em>${tag}</em>` : ''}</div><div class="m">${num(d, 'dealt')}</div><div class="m">${num(t, 'taken')}</div><div class="m">${num(h, 'healed')}</div></div>`;
  const panel = (title, rows) => `<div class="panelx"><i class="cn tl"></i><i class="cn br"></i><div class="hd">${title}</div><div class="colh"><span>Dealt</span><span>Taken</span><span>Healed</span></div>${rows}</div>`;
  const strip = () => `<div class="panelx strip"><i class="cn tl"></i><i class="cn br"></i>
    <div><img src="${ic('str')}" alt=""><span><small>Damage dealt</small><b class="dealt">412</b></span></div>
    <div><img src="${ic('armor')}" alt=""><span><small>Damage taken</small><b class="taken">187</b></span></div>
    <div><img src="${ic('might')}" alt=""><span><small>Biggest hit</small><b>46</b></span></div>
    <div><img src="${ic('critChance')}" alt=""><span><small>Critical hits</small><b>5</b></span></div></div>`;
  const list = () => NOTES.map((n) => `<div class="it"><span class="nt-t">${n[0]}</span><span class="nt-x">${n[1]}</span></div>`).join('');
  const sentence = NOTES.length === 1 ? '1 lesson waited for you' : NOTES.length + ' lessons waited for you';

  function notesA() { return `<div class="panelx nA"><i class="cn tl"></i><i class="cn br"></i><div class="head">${face}<div><div class="nt-h">Garrick's notes</div><div class="nt-s">${sentence}</div></div></div><div class="cards">${NOTES.map((n) => `<div class="card"><div class="nt-t">${n[0]}</div><div class="nt-x">${n[1]}</div></div>`).join('')}</div></div>`; }
  function notesB() { return `<div class="nB"><button class="nBt" data-a="drw" aria-expanded="${st.open}">${face}<span>Garrick's notes &middot; ${NOTES.length}</span></button>${st.open ? `<div class="panelx drw"><i class="cn tl"></i><i class="cn br"></i><div class="nt-h">Garrick's notes</div>${list()}<div class="ft">Saved in Codex &gt; Lessons. Tap outside to close.</div></div>` : ''}</div>`; }
  function notesC() { return `<div class="nC"><button class="nCl" data-a="toast">${face}<span>${sentence}: <i>${NOTES.map((n) => n[0]).join(', ')}</i> &middot; Open in Codex</span></button></div>`; }

  function draw() {
    stage.style.setProperty('--W', KIT.W + 'px');
    const party = row('Warrior', 'warrior', 'MVP', 214, 96, 0) + row('Archer', 'archer', '', 143, 31, 0) + row('Druid', 'druid', '', 55, 60, 128);
    const foe = row('Cutpurse', 'cutpurse', '', 60, 118, 0) + row('Bandit Chief', 'bandit_chief', '', 98, 169, 14) + row('Grey Wolf', 'grey_wolf', '', 29, 125, 0);
    const mid = have && V === 'b' ? notesB() : have && V === 'c' ? notesC() : '<span></span>';
    stage.innerHTML = `<div class="panelx pl"><i class="cn tl"></i><i class="cn br"></i><div class="pl-top"><span>Battle result</span><span>Campaign</span></div>
      <div class="pl-main"><div><h1>Victory</h1><p>The enemy line is broken</p></div><div><div class="pv"><img src="${ic('cooldown')}" alt=""><div><b>9</b><small>Turns</small></div></div><div class="pv"><img src="${ic('hp')}" alt=""><div><b>3 / 3</b><small>Standing</small></div></div></div></div></div>
      <div class="area"><div class="two">${panel('Your party', party)}${panel('Enemy', foe)}</div>${strip()}${have && V === 'a' ? notesA() : ''}</div>
      <div class="bar"><button class="cp"><img src="${ic('combatLog')}" alt=""><span>Copy match data</span></button>${mid}<button class="cont">Continue</button></div>
      ${st.toast ? '<div class="panelx toast">Opens the Codex, Lessons page (mockup).</div>' : ''}`;
  }
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (b && b.dataset.a === 'drw') { st.open = !st.open; draw(); return; }
    if (b && b.dataset.a === 'toast') { st.toast = true; draw(); setTimeout(() => { st.toast = false; draw(); }, 1800); return; }
    if (st.open && !e.target.closest('.drw')) { st.open = false; draw(); }
  });
  KIT.start(() => draw());
})();
