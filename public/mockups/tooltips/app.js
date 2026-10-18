/* Tooltip ailesi taslagi: oyun kodu degil. Icerik ekran goruntulerindeki (58-62) metinlerle ayni. */
(function () {
  const U = 'unified-inventory/', T = 'tooltips/';
  const $ = (s, r = document) => r.querySelector(s);
  const ico = (p) => `<img src="${p}" alt="">`;
  const stat = (n) => ico(U + 'stat-icons/' + n + '.webp');
  const S = { u: 1, phone: false, clean: false };

  // ---------- ortak parcalar ----------
  const head = (o) => `<div class="tp-head">${o.medal}<div class="tp-ht"><div class="tp-kind">${o.kind}</div><div class="tp-title">${o.title}</div></div>${o.aside ? `<div class="tp-aside">${o.aside}</div>` : ''}</div>`;
  const tp = (v, ac, inner, w) => `<div class="tp v${v}" style="--ac:${ac};${w ? `--w:${w};` : ''}">${inner}</div>`;
  const div = '<div class="tp-div"></div>';
  const dia = '<span class="dia"></span>';
  const ln = (t, icon, now) => `<div class="ln">${icon || dia}<div class="tx">${t}</div>${now ? `<span class="now">${now}</span>` : ''}</div>`;
  const chip = (c, t, i) => `<span class="chip ${c}">${i ? ico(i) : ''}${t}</span>`;
  const grid = (on, an) => `<span class="areag">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<i class="${on.includes(i) ? 'on' : ''}${i === an ? ' an' : ''}"></i>`).join('')}</span>`;
  const gold = (t) => `<b style="color:var(--g-gold);font-family:var(--g-disp)">${t}</b>`;

  // ---------- 5 tooltip: yeni (varyant v = a|b|c) ----------
  const NEW = {
    str: (v) => tp(v, '#e0702a',
      head({ medal: `<span class="tp-medal ico ${v === 'c' ? '' : 'fr'}" style="background-image:url(${U}stat-icons/str.webp)"></span>`, kind: 'Attribute', title: 'Strength', aside: `<div class="big">18<small>points</small></div>` }) + div +
      `<div class="tp-body">` +
      ln(`<span class="k">Max HP</span> +<span class="n">3</span> per point`, stat('hp'), chip('v', 'now <b>84</b>')) +
      ln(`<span class="k">HP regen</span> +<span class="n">0.125</span> per point at the start of each turn`, stat('hpRegen'), chip('v', 'now <b>2</b>')) +
      ln(`<span class="k">Strength skills</span> deal <span class="n">1x</span> of STR as base damage`, stat('might')) +
      `</div>`, 500),
    wc: (v) => tp(v, '#b26ae0',
      head({ medal: `<span class="tp-medal fr" style="background-image:url(${T}skill-witheringcurse.png)"></span>`, kind: 'Skill', title: 'Withering Curse', aside: grid([1, 2, 4, 5, 7, 8], 4) }) +
      `<div class="tp-meta">${chip('', 'Block 2x3')}${chip('ac', 'Dark', U + 'misc-icons/element/dark.webp')}${chip('', 'Range ' + gold(5))}<span style="flex-basis:100%;height:0"></span>${chip('v', '<b>14</b> MP', U + 'stat-icons/mp.webp')}${chip('v', '<b>3</b> turns', U + 'ui-icons/cooldown.webp')}</div>` + div +
      `<div class="tp-body">` +
      ln(`<span class="k">Damage</span> <span class="n">30%</span> LUCK <span class="n">(10)</span>`) +
      ln(`<span class="k">Withering</span> for <span class="n">3</span> turns: <span class="n">10%</span> LUCK <span class="n">(3)</span> dark damage at the start of each of its turns (cannot miss or crit; recasting renews it)`, ico(U + 'misc-icons/status/wither.webp')) +
      ln(`Adds <span class="n">1</span> <span class="k">Bad Omen</span> (<span class="n">2</span> on a critical hit) to every enemy hit`, ico(U + 'misc-icons/status/omen.webp')) +
      ln(`<span class="k">Doom</span> at <span class="n">3</span> Omens: <span class="n">40%</span> LUCK <span class="n">(13)</span> dark damage per Omen`, ico(U + 'misc-icons/status/doom.webp')) +
      `</div><div class="tp-foot">${dia}<span class="tx">Sweeps row by row, front row first</span></div>`, 560),
    hero: (v) => tp(v, '#d9b26a',
      head({ medal: `<span class="tp-medal round" style="background-image:url(${T}antimage.webp)"></span>`, kind: 'Hero', title: 'Anti-Mage', aside: `<div class="big lv">Lv 3<small>Level</small></div>` }) + div +
      `<div class="tp-body"><div class="ln"><img src="${U}ui-icons/bag.webp" alt=""><div class="tx"><span class="k">Items</span> <span class="n">2/7</span></div><span class="now pips">${[1, 1, 0, 0, 0, 0, 0].map((o) => `<i class="${o ? 'on' : ''}"></i>`).join('')}</span></div></div>`, 360),
    map: (v) => tp(v, '#c9953f',
      head({ medal: `<span class="tp-medal round ico" style="background-image:url(start-battle/nodes/battle.webp);background-size:84%"></span>`, kind: 'Battle · Outlaw Pack', title: 'Ravenwood', aside: chip('ok', '&#10003; Cleared') }) + div +
      `<div class="tp-body"><div class="sec-l">Foes</div><div class="faces">` +
      `<span class="fc"><span class="fa" style="background-image:url(${T}grey_wolf.webp)"><i>3x</i></span>Grey Wolf</span>` +
      `<span class="fc"><span class="fa" style="background-image:url(${T}ravenwood_poacher.webp)"></span>Ravenwood Poacher</span>` +
      `<span class="fc"><span class="fa" style="background-image:url(${T}raven_seer.webp)"></span>Raven Seer</span></div>` +
      `<div class="sec-l" style="margin-top:.2em">Then</div><div class="faces"><span class="fc"><img class="ni" src="start-battle/nodes/elite.webp" alt="">Ruined Watchtower ${chip('warn', 'Elite')}</span></div></div>`, 580),
    venom: (v) => tp(v, '#7fbf3f',
      head({ medal: `<span class="tp-medal fr" style="background-image:url(${T}skill-venomedge.png);border-color:#7fbf3f"></span>`, kind: 'Skill', title: 'Venom Edge', aside: chip('free', 'Cost free') }) +
      `<div class="tp-meta">${chip('', 'Single target')}${chip('ac', 'Physical', U + 'stat-icons/might.webp')}${chip('', 'Range ' + gold(1))}</div>` + div +
      `<div class="tp-body">` +
      ln(`<span class="k">Damage</span> <span class="n">100%</span> DEX <span class="n">(26)</span>`) +
      ln(`Applies <span class="k">Wound</span> for <span class="n">2</span> turns: Healing received <span class="n">-25%</span>`, ico(U + 'misc-icons/status/wound.webp')) +
      `</div>`, 540),
  };

  // ---------- mevcut hal (birebir) ----------
  const OLD = {
    str: `<div class="old s1"><div class="t">Strength 18</div><em>Max HP: +3 per point (now 84)</em><em>HP regen: +0.125 per point at the start of each turn (now 2)</em><em>Strength skills deal 1x of STR as base damage</em></div>`,
    wc: `<div class="old s2"><div class="h"><img src="${T}skill-witheringcurse.png" alt=""><span class="t">Withering Curse</span><span class="grid">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<i class="${[1, 2, 4, 5, 7, 8].includes(i) ? 'on' : ''}"></i>`).join('')}</span></div><div class="mt">Block 2x3 &middot; <u>Dark</u> &middot; Range 5</div><div class="cost"><span>${ico(U + 'stat-icons/mp.webp')}14 MP</span><span>${ico(U + 'ui-icons/cooldown.webp')}3 turns</span></div><ul><li>Damage 30% LUCK (10)</li><li>Withering for 3 turns: 10% LUCK (3) dark damage at the start of each of its turns (cannot miss or crit; recasting renews it)</li><li>Adds 1 Bad Omen (2 on a critical hit) to every enemy hit</li><li>Doom at 3 Omens: 40% LUCK (13) dark damage per Omen</li><li class="n">Sweeps row by row, front row first</li></ul></div>`,
    hero: `<div class="old s3"><div class="t">Anti-Mage</div><em>Level 3 &middot; 2/7 items</em></div>`,
    map: `<div class="old s4"><div class="t">Ravenwood</div><div class="sub">Battle &middot; Outlaw Pack &middot; Cleared</div><dl><dt>Foes</dt><dd>3&times; Grey Wolf, Ravenwood Poacher, Raven Seer</dd><dt>Then</dt><dd>Ruined Watchtower (Elite)</dd></dl></div>`,
    venom: `<div class="old s5"><div class="h"><span class="ic" style="background-image:url(${T}skill-venomedge.png)"></span><div><div class="t">Venom Edge</div><div class="mt">Single target &middot; <b>Physical</b> &middot; Range 1</div></div></div><hr><div class="c">Cost free</div><p>Damage 100% DEX (26)</p><p>Applies Wound for 2 turns: Healing received -25%</p></div>`,
  };

  const SECS = [
    { k: 'str', scene: 'gear', h: '1 · Stat tooltip (Gear Sheet, STR)', n: 'Aynı bilgi. Etiket (Max HP / HP regen) vurgu renginde, rakamlar Cinzel altın, "now 84 / now 2" sağda çip. Not: "Strength 18" başlığı ile "18" iki kez yazılmıyor; büyük rakam tek yerde.',
      ctx: `<div class="ctx">${stat('str')}STR <b>18</b></div>` },
    { k: 'wc', scene: 'gear', h: '2 · Skill tooltip (Gear, Withering Curse)', n: 'Aynı bilgi. Mor metin yerine: krem metin + element renginde anahtar kelime + altın rakamlar. Alan ızgarası başlığa oturdu. <b>Tekrar notu:</b> "Block 2x3" yazısı ile alan ızgarası aynı şeyi söylüyor (oyunda ikisi de var, bırakıldı).', ctx: '' },
    { k: 'hero', scene: 'gear', h: '3 · Hero hover (Gear sol sekme)', n: 'Aynı bilgi: Level 3, 2/7 items. Madalyonda portre, seviye büyük rakam, 7 item yuvasının 2si dolu elmas olarak.', ctx: '' },
    { k: 'map', scene: 'map', h: '4 · Campaign map düğüm tooltip\'i (Ravenwood)', n: 'Aynı bilgi. Düşmanlar düz virgüllü yazı yerine portreli çipler (3x rozeti); "Cleared" durum çipi; "Then" satırında düğüm ikonu.', ctx: '' },
    { k: 'venom', scene: 'qb', h: '5 · Quick Battle takım seçimi (Venom Edge)', n: 'Aynı bilgi. "Cost free" başlığın sağında yeşil çip; hedef / element / menzil çipleri; Wound satırında durum ikonu.', ctx: '' },
  ];
  const LAB = { a: ['A · Band', 'ikon solda, renkli başlık şeridi, değer sağda'], b: ['B · Compact plate', 'bant yok, ince üst çizgi, daha dar'], c: ['C · Medallion', 'item tooltip v3 gibi ortalanmış madalyon'] };

  function render() {
    $('#sections').innerHTML = SECS.map((s) => `<section class="sec" id="s-${s.k}"><h2>${s.h}</h2><div class="note">${s.n}</div><div class="row">` +
      `<div class="col"><label>Current<i>mevcut, birebir</i></label><div class="scene ${s.scene}">${OLD[s.k]}${s.ctx}</div></div>` +
      ['a', 'b', 'c'].map((v) => `<div class="col"><label>${LAB[v][0]}<i>${LAB[v][1]}</i></label><div class="scene ${s.scene}">${NEW[s.k](v)}${s.ctx}</div></div>`).join('') +
      `</div></section>`).join('');
  }
  function apply() {
    const r = document.documentElement;
    r.style.setProperty('--u', S.u + 'px');
    r.classList.toggle('mk-phone', S.phone);
    r.classList.toggle('mk-clean', S.clean);
    document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.classList.toggle('on', Number(b.dataset.u) === S.u));
    history.replaceState(null, '', '#u=' + S.u + (S.clean ? '&clean' : ''));
  }
  for (const p of location.hash.slice(1).split('&')) { const [k, v] = p.split('='); if (k === 'u') { S.u = Number(v) || 1; S.phone = S.u < 0.4; } if (k === 'clean') S.clean = true; }
  document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.addEventListener('click', () => { S.u = Number(b.dataset.u); S.phone = S.u < 0.4; apply(); }));
  render(); apply();
})();
