/* Karakter karti taslagi: oyun kodu degil. Metinler oyundaki Warrior kartiyla ayni. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const S = { u: 1, phone: false, clean: false };
  const ic = (n) => `character-card/stats/${n}.webp`;
  const G = [
    ['Main', [['str', 'Strength', '32', 1], ['dex', 'Dexterity', '8'], ['int', 'Intelligence', '12'], ['luck', 'Luck', '14']]],
    ['Attack', [['critChance', 'Crit chance', '8.5%'], ['critMult', 'Crit damage', 'x1.5'], ['accuracy', 'Accuracy', '88%'], ['spd', 'Speed', '17']]],
    ['Defense', [['armor', 'Armor', '28'], ['magicArmor', 'Magic armor', '6'], ['evasion', 'Evasion', '3%'], ['hpRegen', 'HP regen', '5/t'], ['mpRegen', 'MP regen', '3/t']]],
  ];
  const R = 'character-card/';
  const DESC_PLAIN = 'The lower your HP, the harder you hit: up to <b>+80%</b> damage at the brink of death. Losing HP gives Rage: <b>0.5</b> per 1% of your max HP lost (at most <b>15</b> per hit; shields absorbing the hit give none).';
  const DESC_OLD = 'The lower your HP, the harder you hit: up to +80% damage at the brink of death. Losing HP gives Rage: 0.5 per 1% of your max HP lost (at most 15 per hit; shields absorbing the hit give none).';

  const OLD = `<div class="old"><div class="top"><span class="t">Warrior</span><span class="sub">Melee Bruiser &middot; Strength 32 primary</span><span class="lbl">Character</span></div>
    <div class="cols">${G.map((g) => `<div><div class="h">${g[0]}</div>${g[1].map((r) => `<div class="r ${r[3] ? 'p' : ''}"><img src="${ic(r[0])}" alt=""><span>${r[1]}</span><b>${r[2]}</b></div>`).join('')}</div>`).join('')}</div>
    <div class="ps"><div class="pr"><span class="pi"><img src="${R}rage.webp" alt=""></span><span class="pn">Berserker</span></div><div class="pd">${DESC_OLD}</div></div>
    <div class="ft">Resilience (primary bonus): 35% debuff -1 turn</div></div>`;

  const chips = `<div class="chips"><span class="chip">Melee Bruiser</span><span class="chip hot"><img src="${ic('str')}" alt="">Strength <b>32</b> primary</span></div>`;
  const head = () => `<div class="hd"><div class="ico"><img src="${R}warrior.webp" alt=""></div><div class="ht"><div class="kind">Character</div><div class="title">Warrior</div>${chips}</div></div>`;
  const rows = (g) => g[1].map((r) => `<div class="sr ${r[3] ? 'p' : ''}"><img src="${ic(r[0])}" alt=""><span class="k">${r[1]}</span><span class="n">${r[2]}</span></div>`).join('');
  const col = (g) => `<div><div class="sl">${g[0]}</div>${rows(g)}</div>`;
  const plate = () => `<div class="pp"><span class="tag">Passive</span><div class="ico"><img src="${R}rage.webp" alt=""></div><div><div class="pn">Berserker</div><p>${DESC_PLAIN}</p></div></div>`;
  const res = '<div class="res"><i></i><span class="rn">Resilience</span><span class="rt">Primary bonus</span><span class="rv"><b>35%</b> debuff -1 turn</span></div>';

  const A = () => `<div class="cc va card">${head()}<div class="dv"></div><div class="cols">${G.map(col).join('')}</div><div class="pw"><div class="dv"></div>${plate()}</div>${res}</div>`;
  const B = () => `<div class="cc vb card"><div class="main"><div class="hero"><div class="ico"><img src="${R}warrior.webp" alt=""></div><div class="kind">Character</div><div class="title">Warrior</div><div class="dv"></div>${chips}</div>
    <div class="plates">${G.map((g) => `<div class="plate">${col(g)}</div>`).join('')}</div></div><div class="pw">${plate()}</div>${res}</div>`;
  const tile = (r) => `<div class="tile ${r[3] ? 'p' : ''}"><img src="${ic(r[0])}" alt=""><div class="tx"><span class="n">${r[2]}</span><span class="k">${r[1]}</span></div></div>`;
  const C = () => `<div class="cc vc card">${head()}<div class="dv"></div><div class="body">${G.map((g) => `<div class="grp"><div class="gl">${g[0]}</div><div class="tiles">${g[1].map(tile).join('')}</div></div>`).join('')}</div><div class="pw">${plate()}</div>${res}</div>`;

  const SECS = [
    { h: 'A · Band (önerim)', n: 'A-Band başlık şeridi (amblem solda, tür etiketi, Cinzel başlık, rol ve primary çipi), altın elmas ayırıcı, üç hizalı sütun: etiket soluk, rakam altın, primary satırı turuncu zeminli. Altta Skills "Plates" pasif plakası ve Resilience alt bilgi çubuğu. Düzen bugünküne en yakın.', v: A },
    { h: 'B · Plates', n: 'Solda büyük amblemli kahraman plakası (başlık ve çipler), sağda üç ayrı stat plakası, altta tam genişlik pasif plakası ve Resilience çubuğu. Her bölüm kendi kutusunda; en "oyun" hissi, ama en çok yer ister.', v: B },
    { h: 'C · Tiles', n: 'Statlar karo: ikon, büyük altın rakam, altında etiket; sol kenarda dikey bölüm adı. Primary karosu turuncu parlar. Rakamlar en hızlı taranan düzen; telefon yatayda en rahat sığan.', v: C },
  ];
  function render() {
    $('#sections').innerHTML = SECS.map((s) => `<section class="sec"><h2>${s.h}</h2><div class="note">${s.n}</div><div class="row">` +
      `<div class="col"><label>Current<i>mevcut, birebir</i></label><div class="scene"><div class="card">${OLD}</div></div></div>` +
      `<div class="col"><label>${s.h.split(' (')[0]}<i>yeni öneri, Warrior</i></label><div class="scene">${s.v()}</div></div></div></section>`).join('');
  }
  function apply() {
    const r = document.documentElement;
    r.style.setProperty('--u', S.u + 'px');
    r.classList.toggle('mk-phone', S.phone);
    r.classList.toggle('mk-clean', S.clean);
    document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.classList.toggle('on', Number(b.dataset.u) === S.u));
    history.replaceState(null, '', '#u=' + S.u + (S.clean ? '&clean' : ''));
  }
  for (const p of location.hash.slice(1).split('&')) { const [k, v] = p.split('='); if (k === 'u') { S.u = Number(v) || 1; S.phone = S.u < 0.5; } if (k === 'clean') S.clean = true; }
  document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.addEventListener('click', () => { S.u = Number(b.dataset.u); S.phone = S.u < 0.5; apply(); }));
  render(); apply();
})();
