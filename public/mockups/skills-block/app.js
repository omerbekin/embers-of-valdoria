/* Skills blogu taslagi: oyun kodu degil. Metinler oyundaki Warrior Skills bolumunun ekran goruntusuyle ayni. */
(function () {
  const U = 'unified-inventory/', B = 'skills-block/';
  const $ = (s, r = document) => r.querySelector(s);
  const S = { u: 1, phone: false, clean: false };
  const mp = (n) => `<span class="chip"><img src="${U}stat-icons/mp.webp" alt=""><b>${n}</b></span>`;
  const cd = (n) => `<span class="chip"><img src="${U}ui-icons/cooldown.webp" alt=""><b>${n}</b></span>`;

  // kind: '' | 'pas' | 'ult'; st: [etiket, deger, birim]
  const WAR = [
    { k: 'pas', name: 'Berserker', icon: B + 'rage.webp', chips: '', st: [['Max bonus', '+80%'], ['Rage per 1% HP lost', '0.5']] },
    { k: '', name: 'Double Strike', icon: B + 'sword.webp', chips: '<span class="chip free">Free</span>', st: [['Damage', '13 x2']] },
    { k: '', name: 'Whirlwind', icon: B + 'whirlwind.webp', chips: mp(8) + cd(3), st: [['Damage', '29']] },
    { k: '', name: 'Charge', icon: B + 'charge.webp', chips: mp(10) + cd(3), st: [['Damage', '22'], ['Stun', '1', 'turn']] },
    { k: 'ult', name: "Headsman's Blow", icon: B + 'warcry.webp', chips: `<span class="chip rage"><img src="${U}ui-icons/rage.webp" alt="">Rage <b>30</b></span>` + cd(5), st: [['Damage', '16']] },
  ];
  // Hexer: yalniz iki gercek piksel ikon var; digerleri yer tutucu (metin de yer tutucu)
  const HEX = [
    { k: 'pas', name: 'Hexer passive', icon: null, chips: '', st: [['Placeholder', '-']] },
    { k: '', name: 'Venom Edge', icon: B + 'skill-venomedge.png', px: 1, chips: '<span class="chip free">Free</span>', st: [['Damage', '100% DEX (26)']] },
    { k: '', name: 'Withering Curse', icon: B + 'skill-witheringcurse.png', px: 1, chips: mp(14) + cd(3), st: [['Damage', '30% LUCK (10)']] },
  ];

  const TAG = { pas: 'Passive', ult: 'Ultimate' };
  const icoHtml = (s) => s.icon ? `<div class="ico"><img class="${s.px ? 'px' : ''}" src="${s.icon}" alt=""></div>` : `<div class="ico ph">?</div>`;
  const stLines = (s) => s.st.map((x) => `<div class="sl"><span class="k">${x[0]}</span><span class="n">${x[1]}${x[2] ? `<small>${x[2]}</small>` : ''}</span></div>`).join('');
  const tag = (s) => s.k ? `<span class="tag">${TAG[s.k]}</span>` : '';

  const A = (d, x = '') => `<div class="va ${x}">${d.map((s) => `<div class="cd ${s.k}">${tag(s)}${icoHtml(s)}<div class="nm">${s.name}</div><div class="dv"></div><div class="chips">${s.chips}</div><div class="sls">${stLines(s)}</div></div>`).join('')}</div>`;
  const Bv = (d, x = '') => `<div class="vb ${x}">${d.map((s) => `<div class="cd ${s.k}">${tag(s)}${icoHtml(s)}<div class="nm">${s.name}</div><div class="chips">${s.chips}</div><div class="sls">${stLines(s)}</div></div>`).join('')}</div>`;
  const C = (d, x = '') => {
    const order = d.filter((s) => s.k !== 'ult').concat(d.filter((s) => s.k === 'ult'));
    return `<div class="vc ${x}">${order.map((s) => `<div class="cd ${s.k}">${icoHtml(s)}<div class="tx"><div class="kind">${TAG[s.k] || 'Skill'}</div><div class="nm">${s.name}</div>${s.chips ? `<div class="chips">${s.chips}</div>` : ''}<div class="sls">${stLines(s)}</div></div></div>`).join('')}</div>`;
  };

  const OLD = `<div class="old">
    <div class="c"><div class="pas"><img src="${B}rage.webp" alt=""></div><div class="nm">Berserker</div><div class="kd">PASSIVE</div><div class="st">Max bonus <b>+80%</b><br>Rage per 1% HP lost <b>0.5</b></div></div>
    <div class="c"><div class="box"><img src="${B}sword.webp" alt=""></div><div class="nm">Double Strike</div><div class="ct">Free</div><div class="st">Damage <b>13 x2</b></div></div>
    <div class="c"><div class="box"><img src="${B}whirlwind.webp" alt=""></div><div class="nm">Whirlwind</div><div class="ct"><span><img src="${U}stat-icons/mp.webp" alt="">8</span><span><img src="${U}ui-icons/cooldown.webp" alt="">3</span></div><div class="st">Damage <b>29</b></div></div>
    <div class="c"><div class="box"><img src="${B}charge.webp" alt=""></div><div class="nm">Charge</div><div class="ct"><span><img src="${U}stat-icons/mp.webp" alt="">10</span><span><img src="${U}ui-icons/cooldown.webp" alt="">3</span></div><div class="st">Damage <b>22</b><br>Stun <b>1</b> turn</div></div>
    <div class="c"><div class="box"><img src="${B}warcry.webp" alt=""></div><div class="nm">Headsman's Blow</div><div class="ct"><span class="rg"><img src="${U}ui-icons/rage.webp" alt="">RAGE 30</span><span><img src="${U}ui-icons/cooldown.webp" alt="">5</span></div><div class="st">Damage <b>16</b></div></div>
  </div>`;

  const blk = (inner) => `<div class="sk"><div class="sk-h">Skills</div>${inner}</div>`;
  const HINT = '<div class="sk-hint">Hover (desktop) or long press (touch) on a skill opens the A-Band skill tooltip.</div>';
  const hex = (inner) => `<div class="hx"><span>Hexer (piksel ikon + yer tutucu)</span>${inner}</div>`;

  const SECS = [
    { h: 'A · Plates (önerim)', n: 'Beş eşit plaka. İkon 116px, ince vurgu kenarı + iç ışık. Pasif yeşilimsi bakır şeritli, ulti turuncu kenar ve ışımalı. Ad, ayırıcı, çipler, hasar satırı hep aynı sıralamada, her kartta aynı yükseklikte.', v: (d, x) => A(d, x) },
    { h: 'B · Icon first', n: 'İkon 120px (ulti 144px), plaka yok, ikonun üstünü hiçbir şey örtmüyor (ad altta, şerit yok). İkonlar en çok burada görünür. Çipler ve hasar altta ortalı.', v: (d, x) => Bv(d, x) },
    { h: 'C · Rows', n: 'İki sütunlu yatay kartlar, sol kenarda vurgu şeridi; pasif ilk, ulti en altta tüm genişlikte ve daha büyük. Tooltip A-Band başlık diline en yakını.', v: (d, x) => C(d, x) },
  ];

  function render() {
    $('#sections').innerHTML = SECS.map((s) => `<section class="sec"><h2>${s.h}</h2><div class="note">${s.n}</div>` +
      `<div class="col"><label>Current<i>mevcut, birebir</i></label>${blk(OLD)}</div>` +
      `<div class="col"><label>${s.h.split(' (')[0]}<i>yeni öneri, Warrior</i></label>${blk(s.v(WAR) + HINT + hex(s.v(HEX, 'hex')))}</div></section>`).join('');
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
