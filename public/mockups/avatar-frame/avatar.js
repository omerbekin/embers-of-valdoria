/* Avatar cerceve taslagi: oyun kodu degil. DOM, oyundaki savastan (Cutthroat, Quick Battle seed 3) .bh-root icinden alindi; left degerleri 1920 / 2580 / 844x390'da oyundan olculdu. */
(function () {
  const I = 'avatar-frame/img/';
  const VARS = { now: 'Today', a: 'A · Twin line', b: 'B · Plate', c: 'C · Crest', d: 'D · Corners + glow', e: 'E · Double line + glow', f: 'F · Carved', g: 'G · Rails', h: 'H · Rivets', i: 'I · Arch' };
  const SIZES = {
    '169': { W: 1920, u: 1, pas: [568, 108], sk: 684, gl: 1258, rt: [1450, 442] },
    '219': { W: 2580.66, u: 1, pas: [898.331, 108], sk: 1014.33, gl: 1588.33, rt: [1780.33, 772.331] },
    ph: { W: 2337.51, u: 0.361111, pas: [744.757, 112], sk: 864.757, gl: 1484.76, rt: [1897.76, 411.757] },
  };
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('&');
  const v = VARS[parts[0]] || (parts[0] === 'all' || parts[0] === 'all2') ? parts[0] : 'a';
  const opt = new URLSearchParams(parts.slice(1).join('&'));
  const zk = SIZES[opt.get('z')] ? opt.get('z') : '169';
  const Z = SIZES[zk];
  const clean = opt.has('clean');
  const nostrip = opt.has('nostrip');
  document.documentElement.classList.toggle('short', zk === 'ph');
  document.documentElement.classList.toggle('compact', zk === 'ph');
  document.body.classList.toggle('clean', clean);
  document.body.classList.toggle('nostrip', nostrip);
  const hs = (n) => `<img class="bh-ico" src="${I}st-${n}.webp" alt="" draggable="false">`;

  // cerceve: sinif pf-X (varyant) + en (dusman). Alt ogeler yalniz varyantlarin suslemesi icin (oyunda eklenecek ek span'ler).
  const frame = (variant, enemy) => {
    const kids = variant === 'now' ? '' : '<i class="f-a"></i><i class="f-b"></i><i class="f-c"></i><i class="f-d"></i><i class="f-ln"></i><i class="f-cr"></i>';
    return `<div class="bh-pframe${enemy ? ' en' : ''}${variant === 'now' ? '' : ' pf-v pf-' + variant}"><img class="bh-portrait" src="${I}av-cutthroat.webp" alt="" draggable="false"${enemy ? ' style="transform:scaleX(-1)"' : ''}>${kids}</div>`;
  };
  const bar = (k, val, max, en) => `<div class="bh-hpmp ${k}"><div class="bh-num">${hs(k)}${val}<span class="of">/ ${max}</span></div><div class="bh-bar ${k}${en && k === 'hp' ? ' en' : ''}"><i style="width:100%"></i></div></div>`;
  const st = (n, l, val, pri) => `<div class="bh-st${pri ? ' pri' : ''}">${hs(n)}<span class="l">${l}</span><span>${val}</span></div>`;
  const actor = (variant, enemy) => `<div class="bh-actor"><div class="bh-opener">${frame(variant, enemy)}<div class="bh-actor-info">
    <div class="bh-name"><span class="bh-n">Cutthroat</span></div><div class="bh-chips"><span class="bh-chip">Assassin</span></div>
    <div class="bh-abody"><div class="bh-hpmp-row">${bar('hp', 81, 81, enemy)}${bar('mp', 32, 32)}</div>
    <div class="bh-aside"><div class="bh-main">${st('str', 'STR', 17)}${st('dex', 'DEX', 26, 1)}${st('int', 'INT', 11)}${st('luck', 'LCK', 6)}</div><span class="bh-more">All stats</span></div></div></div></div></div>`;
  const chip = (c, n, ico) => `<span class="bp-chip ${c}"><img class="bh-ico" src="${I}${ico}.webp" alt="" draggable="false"><b>${n}</b></span>`;
  const sk = (cls, key, ico, nm, chips, tag, cdv) => `<div class="bp ${cls}">${tag ? `<span class="bp-tag"><span class="full">${tag}</span><span class="short">${tag.slice(0, 3)}</span></span>` : ''}${key ? `<span class="bp-key">${key}</span>` : ''}<div class="bp-ico"><img class="bh-ico" src="${I}sk-${ico}.webp" alt="" draggable="false">${cdv ? `<span class="cdv">${cdv}</span>` : ''}</div><span class="bp-nm">${nm}</span><div class="bp-chips">${chips}</div></div>`;
  const root = (variant, enemy, only) => {
    const a = actor(variant, enemy);
    const H = only ? only.H : 200;
    const skills = only ? '' : `<div class="bh-pasv" style="left:${Z.pas[0]}px;width:${Z.pas[1]}px"><div class="bp pas"><span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span><div class="bp-ico"><img class="bh-ico" src="${I}sk-opportunist.webp" alt="" draggable="false"></div><span class="bp-nm">Opportunist</span><div class="bp-chips"></div></div></div>
      <div class="bh-skills" style="left:${Z.sk}px">${sk('sel', 1, 'venomedge', 'Venom Edge', '<span class="bp-chip free">Free</span>')}${sk('', 2, 'saltire', 'Saltire Cut', chip('', 9, 'st-mp') + chip('cd', 2, 'ui-cooldown'))}${sk('', 3, 'smokebomb', 'Smoke Bomb', chip('', 10, 'st-mp') + chip('cd', 3, 'ui-cooldown'))}${sk('ult cdn off', 4, 'backstab', 'Backstab', chip('', 14, 'st-mp') + chip('cd', 4, 'ui-cooldown'), 'Ultimate', 3)}</div>
      <div class="bh-globs" style="left:${Z.gl}px"><div class="bh-vfade"></div><div class="bh-gcol"><div class="bh-gl off"><img class="bh-ico" src="${I}ui-rest.webp" alt="" draggable="false"><span>Rest</span></div><div class="bh-gl"><img class="bh-ico" src="${I}ui-skip.webp" alt="" draggable="false"><span>Skip</span></div><div class="bh-gl"><img class="bh-ico" src="${I}ui-move.webp" alt="" draggable="false"><span>Move</span></div></div></div>
      <div class="bh-right" style="left:${Z.rt[0]}px;width:${Z.rt[1]}px"><div class="bh-binfo"><div class="bh-links"><span class="bh-plink ico"><img class="bh-ico bh-pl-ico" src="${I}ui-combatLog.webp" alt="" draggable="false"><span class="bh-pl-t">Combat log</span></span></div></div></div>`;
    const w = only ? only.w : Z.W;
    return `<div class="vw" style="width:${w * Z.u}px;height:${H * Z.u}px"><div class="bh-root mk" style="left:0;top:${-(1080 - H) * Z.u}px;width:${Z.W}px;transform:scale(${Z.u});--bh-inv:${1 / Z.u}"><div class="bh-band"><i class="bh-dia bh-band-dia"></i></div>${a}${skills}</div></div>`;
  };
  const cap = (t, side) => `<div class="cap"><b>${t}</b><i class="${side}">${side === 'en' ? 'Enemy' : 'Ally'}</i></div>`;
  let html = '';
  if (v === 'all' || v === 'all2') {
    const only = { w: zk === 'ph' ? 520 : 340, H: zk === 'ph' ? 158 : 176 };
    html = '<div class="grid">' + (v === 'all' ? ['now', 'a', 'b', 'c', 'd'] : ['now', 'e', 'f', 'g', 'h', 'i']).map((k) => `<div class="gr-h">${VARS[k]}</div>` + [0, 1].map((e) => `<div class="gc">${root(k, !!e, only)}</div>`).join('')).join('') + '</div>';
    document.body.classList.add('all');
  } else {
    html = [0, 1].map((e) => cap(VARS[v], e ? 'en' : 'al') + root(v, !!e)).join('');
  }
  document.getElementById('page').innerHTML = html;
  document.querySelectorAll('#mk-strip a[data-z]').forEach((a) => {
    a.classList.toggle('on', a.dataset.z === zk);
    a.href = `#${v}&z=${a.dataset.z}${clean ? '&clean' : ''}`;
  });
  document.querySelectorAll('#mk-strip a[href^="#"]:not([data-z])').forEach((a) => {
    a.href = `${a.getAttribute('href')}&z=${zk}${clean ? '&clean' : ''}`;
  });
  window.addEventListener('hashchange', () => location.reload());
  document.title = 'Avatar frame · ' + (VARS[v] || 'All');
})();
