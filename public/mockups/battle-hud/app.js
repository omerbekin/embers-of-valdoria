/* Savas alt HUD taslagi: oyun kodu degil. Metinler/degerler oyundaki Warrior alt cubuguyla ayni. */
(function () {
  const R = 'battle-hud/';
  const $ = (s, r = document) => r.querySelector(s);
  const S = { u: 1, phone: false, clean: false, sel: 1 };
  const ui = (n) => `${R}ui/${n}.webp`, st = (n) => `${R}stats/${n}.webp`, wi = (n) => `${R}warrior/${n}.webp`;

  // Oyundaki Warrior: HP 83/129, MP 68/68, Rage 7/50; STR 32 (birincil) DEX 8 INT 12 LCK 14
  const SK = [
    { k: 'pas', name: 'Berserker', icon: wi('rage') },
    { n: 1, name: 'Double Strike', icon: wi('sword'), free: 1 },
    { n: 2, name: 'Whirlwind', icon: wi('whirlwind'), mp: 8, cd: 3 },
    { n: 3, name: 'Charge', icon: wi('charge'), mp: 10, cd: 3 },
    { n: 4, name: "Headsman's Blow", icon: wi('warcry'), k: 'ult', rage: 30, cd: 5, wait: 1 },
  ];

  /* ---------- parcalar ---------- */
  const chip = (cls, inner) => `<span class="chip ${cls}">${inner}</span>`;
  const chipsOf = (s, o = {}) => {
    let h = '';
    if (s.free) h += chip('free', 'Free');
    if (s.mp) h += chip(o.lowmp ? 'low' : '', `<img src="${st('mp')}" alt=""><b>${s.mp}</b>`);
    if (s.rage) h += chip(o.lowrage ? 'low rage' : 'rage', `<img src="${ui('rage')}" alt="">Rage <b>${s.rage}</b>`);
    if (s.cd) h += chip('', `<img src="${ui('cooldown')}" alt=""><b>${s.cd}</b>`);
    return h;
  };
  // durum: sel / cdn (beklemede, sayi ikonda) / off (yetersiz kaynak)
  function skill(s, v, o = {}) {
    const cls = [s.k || '', o.sel ? 'sel' : '', o.cdn ? 'cdn' : '', o.off ? 'off' : ''].join(' ');
    const tag = s.k === 'pas' ? 'Passive' : s.k === 'ult' ? 'Ultimate' : '';
    const wait = o.cdn ? `<span class="cdv">${o.cdn}</span>` : '';
    const bottom = s.k === 'pas' ? (v === 'vb' ? '<div class="bt">Passive</div>' : '<div class="chips"></div>') : `<div class="chips">${chipsOf(s, o)}</div>`;
    const tagH = v === 'vb' ? '' : tag ? `<span class="tag">${tag}</span>` : '';
    const key = s.n ? `<span class="key">${s.n}</span>` : '';
    return `<div class="sk ${cls}" data-n="${s.n || 0}" title="${s.name}${o.lowmp ? ' (not enough MP)' : o.lowrage ? ' (not enough Rage)' : ''}">${tagH}${key}<div class="ico"><img src="${s.icon}" alt="">${wait}</div><div class="nm">${s.name}</div>${bottom}</div>`;
  }
  const skills = (v) => `<div class="z-skills">${SK.map((s) => skill(s, v, s.n === S.sel ? { sel: 1 } : s.wait ? { cdn: 1, off: 0, lowrage: 1 } : {})).join('')}</div>`;

  const bz = `<div class="bz"><img src="${R}valor/brazier-4.webp" alt=""><img src="${R}valor/brazier-0.webp" alt=""></div>`;
  const valor = (cls = '') => `<div class="vlt ${cls}" title="Valor"> ${bz}<div class="vl">Valor</div></div>`;

  const vit = (hpCls) => `<div class="vit2">
    <div class="vt hp"><div class="v"><img src="${st('hp')}" alt="">83 <small>/ 129</small></div><div class="b"><i style="width:64%"></i></div></div>
    <div class="vt mp"><div class="v"><img src="${st('mp')}" alt="">68 <small>/ 68</small></div><div class="b"><i style="width:100%"></i></div></div>
    <div class="vt rg"><div class="v"><img src="${ui('rage')}" alt="">7 <small>/ 50</small></div><div class="b"><i style="width:14%"></i></div></div></div>`;
  const vitIn = `<div class="vit2">
    <div class="vt hp"><div class="bb"><i style="width:64%;background:linear-gradient(90deg,#4f9a32,#7fbf3f)"></i><div class="v"><img src="${st('hp')}" alt="">83 <small>/ 129</small></div></div></div>
    <div class="vt mp"><div class="bb"><i style="width:100%;background:linear-gradient(90deg,#2e6fc0,#5aa5f0)"></i><div class="v"><img src="${st('mp')}" alt="">68 <small>/ 68</small></div></div></div>
    <div class="vt rg"><div class="bb"><i style="width:14%;background:linear-gradient(90deg,#c4561c,#f08a30)"></i><div class="v"><img src="${ui('rage')}" alt="">7 <small>/ 50</small></div></div></div></div>`;
  const STA = [['str', 'STR', 32, 1], ['dex', 'DEX', 8], ['int', 'INT', 12], ['luck', 'LCK', 14]];
  const stChips = STA.map((a) => `<span class="chip ${a[3] ? 'hot' : ''}"><img src="${st(a[0])}" alt=""><span>${a[1]}</span><b>${a[2]}</b></span>`).join('');
  const allBtn = '<span class="allst" title="Open the full stat sheet"><i class="dia"></i>All stats</span>';
  const head = (kind) => `<div class="kd">${kind}</div><div class="ti">Warrior</div><div class="chips"><span class="chip">Melee Bruiser</span><span class="chip hot"><img src="${st('str')}" alt="">Strength <b>32</b> primary</span></div>`;
  const portrait = `<div class="pf"><img src="${R}warrior-avatar.webp" alt=""></div>`;

  const actorA = () => `<div class="z-actor">${portrait}<div class="ac">${head('Character').replace('<div class="kd">Character</div>', '')}${vit()}<div class="sts">${stChips}${allBtn}</div></div></div>`;
  const actorB = () => `<div class="z-actor">${portrait}<div class="ac">${head('').replace('<div class="kd"></div>', '')}<div class="body">${vit()}<div><div class="tiles">${stChips}</div>${allBtn}</div></div></div></div>`;
  const actorC = () => `<div class="z-actor">${portrait}<div class="ac"><div class="ti">Warrior</div><div class="chips"><span class="chip">Melee Bruiser</span><span class="chip hot"><img src="${st('str')}" alt="">Strength <b>32</b> primary</span></div>${vitIn}<div class="sts2">${STA.map((a) => `<span class="${a[3] ? 'p' : ''}"><img src="${st(a[0])}" alt="">${a[1]} <b>${a[2]}</b></span>`).join('')}${allBtn}</div></div></div>`;

  const em = '<span class="em"><i></i></span>';
  const glob = () => `<div class="z-glob"><div class="gb">
    <div class="g"><img src="${ui('rest')}" alt="">Rest</div><div class="g"><img src="${ui('skip')}" alt="">Skip</div>
    <div class="g"><img src="${ui('move')}" alt="">Move</div><div class="g dis" title="Needs Valor">${em}Revive</div></div></div>`;

  const rightA = () => `<div class="z-right">${valor('pl')}<div class="rc"><div class="row"><span class="sq" title="Lucky Escape"><img src="${ui('luckyEscape')}" alt=""></span><span class="sq" title="Active effect"><img src="${ui('combatLog')}" alt=""></span></div><span class="btn"><img src="${ui('combatLog')}" alt="">Combat log</span></div></div>`;
  const rightB = () => `<div class="z-right"><div class="pl one">${valor()}<div class="sep"></div><div class="rc"><div class="row"><span class="sq" title="Lucky Escape"><img src="${ui('luckyEscape')}" alt=""></span><span class="sq" title="Active effect"><img src="${ui('combatLog')}" alt=""></span></div><span class="btn"><img src="${ui('combatLog')}" alt="">Combat log</span></div></div></div>`;
  const rightC = () => `<div class="z-right"><div class="ic"><span class="sq" title="Lucky Escape"><img src="${ui('luckyEscape')}" alt=""></span><span class="sq" title="Active effect"><img src="${ui('combatLog')}" alt=""></span></div><div class="pl big">${valor()}<span class="btn"><img src="${ui('combatLog')}" alt="">Combat log</span></div></div>`;

  /* ---------- mevcut hal ---------- */
  const oc = (s, o) => {
    const cost = s.free ? '<span class="free">Free</span>' : (s.mp ? `<span><img src="${st('mp')}" alt="">${s.mp}</span>` : '') + (s.rage ? `<span class="rg"><img src="${ui('rage')}" alt="">RAGE ${s.rage}</span>` : '') + (s.cd ? `<span><img src="${ui('cooldown')}" alt="">${s.cd}</span>` : '');
    return `<div class="sk ${o.sel ? 'sel' : ''} ${o.cdn ? 'cdn' : ''}" data-n="${s.n}"><span class="key">${s.n}</span><div class="fr"><img src="${s.icon}" alt="">${o.cdn ? '<span class="cdv">1</span>' : ''}</div><div class="nm">${s.name.length > 13 ? s.name.slice(0, 12) + '…' : s.name}</div><div class="cost">${cost}</div></div>`;
  };
  const OLD = () => `<div class="bar old">
    <div class="z-actor"><div class="pf"><img src="${R}warrior-avatar.webp" alt=""></div><div><div class="t">Warrior<i>Melee Bruiser &middot; Strength 32 primary</i></div>
      <div class="vit"><div><div class="v"><img src="${st('hp')}" alt="">83 <small>/ 129</small></div><div class="b"><i style="width:64%;background:#5aa43a"></i></div></div><div><div class="v"><img src="${st('mp')}" alt="">68 <small>/ 68</small></div><div class="b"><i style="width:100%;background:#2e72c8"></i></div></div><div><div class="v"><img src="${ui('rage')}" alt="">7 <small>/ 50</small></div><div class="b"><i style="width:14%;background:#e0702a"></i></div></div></div>
      <div class="ln">${STA.map((a) => `<span><img src="${st(a[0])}" alt="">${a[1]} <b>${a[2]}</b></span>`).join('')}</div><div class="all">&#9671; ALL STATS</div></div></div>
    <div class="z-skills"><div class="pas"><div class="m"><img src="${wi('rage')}" alt=""></div><div class="l">PASSIVE</div></div>${SK.slice(1).map((s) => oc(s, s.n === S.sel ? { sel: 1 } : s.wait ? { cdn: 1 } : {})).join('')}</div>
    <div class="z-glob"><div class="gl"><img src="${ui('rest')}" alt="">REST</div><div class="gl"><img src="${ui('skip')}" alt="">SKIP</div><div class="gl"><img src="${ui('move')}" alt="">MOVE</div><div class="gl dis"><img src="${ui('luckyEscape')}" alt="">REVIVE</div></div>
    <div class="z-right">${valor()}<div class="ci"><div class="rd"><span><img src="${ui('luckyEscape')}" alt=""></span><span><img src="${ui('combatLog')}" alt=""></span></div><div class="cl"><img src="${ui('combatLog')}" alt="">Combat log</div></div></div></div>`;

  const NEW = (v, actor, right) => `<div class="bar new ${v}">${actor()}${skills(v)}${glob()}${right()}</div>`;
  const STATE_LIST = [
    ['Normal', { }], ['Hover', { hover: 1 }], ['Selected', { sel: 1 }], ['Waiting (turns left)', { cdn: 2 }], ['Not enough MP', { off: 1, lowmp: 1 }],
  ];
  const states = (v) => `<div class="states new ${v}">${STATE_LIST.map(([l, o]) => `<div class="st"><div class="z-skills">${skill({ n: 3, name: 'Charge', icon: wi('charge'), mp: 10, cd: 3 }, v, o).replace('class="sk ', o.hover ? 'class="sk hv ' : 'class="sk ')}</div><em>${l}</em></div>`).join('')}
    <div class="st"><div class="z-skills">${skill(SK[4], v, { cdn: 1, lowrage: 1 })}</div><em>Ultimate waiting</em></div>
    <div class="st"><div class="z-skills">${skill(SK[4], v, { off: 1, lowrage: 1 })}</div><em>Not enough Rage</em></div>
    <div class="st"><div class="z-skills">${skill(SK[0], v, {})}</div><em>Passive</em></div></div>`;

  const SECS = [
    { v: 'va', h: 'A · Plates', n: 'Skill ve pasif aynı plaka ailesi (ince vurgu kenarı, köşe elmasları, altın rakam, çipler). Pasif yeşilimsi bakır, ulti turuncu. Karakter bloğu karakter kartı A dilinde; REST/SKIP/MOVE/REVIVE tek çerçeveli plaka, satır üstüne gelince ember vurgusu. Sağ taraf: Valor plakası, yanında iki ikon karesi ve Combat log düğmesi.', actor: actorA, right: rightA },
    { v: 'vb', h: 'B · Icon first', n: 'Plaka yok; ikonlar büyük (74px) ve köşe elmaslı, ad/çip altta. Pasif de aynı çerçeveli ikon, altında "Passive" şeridi. Karakterde barlar dikey, statlar 2x2 karo. Global eylemler ayrı çip düğmeler. Sağ taraf: tek çerçeve içinde Valor | ayırıcı | ikonlar + Combat log.', actor: actorB, right: rightB },
    { v: 'vc', h: 'C · Rail', n: 'Pasif + 4 skill tek çerçeveli ray, elmaslı ayırıcılarla; pasif teal, ulti turuncu tonlu hücre. Karakterde rakamlar barın içinde, stat satırı tek çizgi. Global eylemler sol vurgu şeritli satırlar. Sağ taraf: ikonlar dikey, Valor büyük plaka, Combat log plakanın altında.', actor: actorC, right: rightC },
  ];

  function render() {
    $('#sections').innerHTML = `<section class="sec"><h2>Mevcut hal</h2><div class="note">Birebir yeniden çizim (oyundaki ekran görüntüsü). Skill'lerin üstüne gelin / tıklayın: seçili ve hover durumları çalışır.</div><div class="col"><label>Current<i>mevcut, birebir</i></label>${OLD()}</div></section>` +
      SECS.map((s) => `<section class="sec"><h2>${s.h}</h2><div class="note">${s.n}</div>
      <div class="col"><label>${s.h.split(' · ')[0]}<i>yeni öneri (Warrior; solda Rage 30 ultisi beklemede, skill 1 seçili)</i></label>${NEW(s.v, s.actor, s.right)}</div>
      <div class="col"><label>${s.h.split(' · ')[0]}<i>skill durumları</i></label>${states(s.v)}</div></section>`).join('');
    document.querySelectorAll('.sk').forEach((el) => {
      if (el.closest('.states') || el.classList.contains('pas') || el.querySelector('.pas')) return;
      el.addEventListener('click', () => { const n = Number(el.dataset.n); if (!n || n === 4) return; S.sel = S.sel === n ? 0 : n; apply(true); });
    });
  }
  function apply(re) {
    const r = document.documentElement;
    r.style.setProperty('--u', S.u + 'px');
    r.classList.toggle('mk-phone', S.phone);
    r.classList.toggle('mk-clean', S.clean);
    document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.classList.toggle('on', Number(b.dataset.u) === S.u));
    history.replaceState(null, '', '#u=' + S.u + (S.clean ? '&clean' : ''));
    if (re) render();
  }
  for (const p of location.hash.slice(1).split('&')) { const [k, v] = p.split('='); if (k === 'u') { S.u = Number(v) || 1; S.phone = S.u < 0.5; } if (k === 'clean') S.clean = true; }
  document.querySelectorAll('#mk-strip button[data-u]').forEach((b) => b.addEventListener('click', () => { S.u = Number(b.dataset.u); S.phone = S.u < 0.5; apply(false); }));
  render(); apply(false);
})();
