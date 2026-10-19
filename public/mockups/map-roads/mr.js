/* Sefer haritasi sadelestirme taslagi: oyun kodu DEGIL. Dugum konumlari / adlari / alt yazilari data/campaign/valdoria.json'dan, cerceveler src/game/map-frames.ts (C),
   kural metinleri CampaignMapScene.ts'ten. Takim ve sayilar ORNEKTIR (13/27, Pilgrim Road'dayiz, 4 kahramanda 5'er stat puani). */
(function () {
  const { esc } = MK;
  const W = 1920, H = 1080;
  const ASSET = 'map-nodes/';
  const NODES = [
    ['1', 'Mill Road', 'battle', 'Start · Battle', 0.146, 0.846],
    ['2', 'Ravenwood', 'battle', 'Battle · Outlaw Pack', 0.224, 0.639],
    ['3', 'Ruined Watchtower', 'elite', 'Elite · Bandit Chief', 0.281, 0.407],
    ['4', 'Ashford Village', 'town', 'Town · Rest, Recruits, Trade', 0.229, 0.231],
    ['moor', 'Windy Moor', 'battle', 'Battle · Moor Raiders', 0.336, 0.182, 1],
    ['cairn', 'Cairn Hill', 'battle', 'Battle · Cairn Raiders', 0.37, 0.33],
    ['5B', 'Iron Pass', 'battle', 'Battle · Ambush', 0.459, 0.38, 1],
    ['charcoal', 'Charcoal Camp', 'battle', 'Battle · Charcoal Burners', 0.336, 0.523],
    ['7', 'Valdren Keep', 'town', 'City · Rest, Recruits, Trade', 0.448, 0.554, 1],
    ['6B', 'Dwarven Mine', 'treasure', 'Treasure · Guarded', 0.536, 0.5, 1],
    ['6A', "Witch's Hut", 'event', 'Event · Guarded', 0.503, 0.606],
    ['5A', 'Misty Marsh', 'battle', 'Battle · Bog Ambush', 0.477, 0.731, 1],
    ['grave', 'Grave Field', 'battle', 'Battle · Restless Dead', 0.582, 0.623, 1],
    ['pilgrim', 'Pilgrim Road', 'battle', 'Battle · Rival Company', 0.633, 0.37],
    ['8A', "St. Brann's Abbey", 'treasure', 'Treasure · Relic Vault', 0.674, 0.259, 1],
    ['8C', 'Black Cathedral', 'elite', 'Elite · The Undying', 0.636, 0.508],
    ['river', 'Riverside Camp', 'rest', 'Rest · Camp', 0.703, 0.477, 1],
    ['9', "King's Bridge", 'boss', 'Boss · The Bridge Warden', 0.677, 0.628],
    ['10', 'Ashen Plain', 'battle', 'Battle · Cursed Ground', 0.76, 0.731],
    ['11B', 'Siege Line', 'battle', "Battle · Morvane's Vanguard", 0.839, 0.69],
    ['thorn', 'Thornwood Hollow', 'elite', 'Elite · Hidden Lair', 0.833, 0.838],
    ['camp', 'Forward Camp', 'merchant', 'Merchant · Last Supplies', 0.932, 0.731],
    ['road', 'Ember Road', 'battle', 'Battle · Outriders', 0.883, 0.583],
    ['fold', "Shepherd's Fold", 'event', 'Event · Rest', 0.945, 0.556, 1],
    ['head', 'Riverhead', 'battle', 'Battle · Spring Ambush', 0.911, 0.435],
    ['gate', 'Gate of Cinders', 'battle', 'Battle · Gatewardens', 0.945, 0.31],
    ['12', 'Castle Morvane', 'boss', 'Final Boss', 0.885, 0.176],
  ].map(([id, name, type, sub, x, y, above]) => ({ id, name, type, sub, x: Math.round(x * W), y: Math.round(y * H), above: !!above }));
  const EDGES = [['1', '2'], ['2', '3'], ['3', '4'], ['4', 'moor'], ['moor', 'cairn'], ['cairn', '5B'], ['cairn', 'charcoal'], ['5B', '7'], ['charcoal', '7'], ['7', '6B'], ['7', '6A'], ['7', '5A'],
    ['6B', 'grave'], ['6A', 'grave'], ['5A', 'grave'], ['grave', 'pilgrim'], ['pilgrim', '8A'], ['pilgrim', '8C'], ['8A', 'river'], ['8C', 'river'], ['river', '9']];
  /* cleared = gecildi, current = buradasin, reach = gidilebilir, near = gorunur (sirada degil), goal = hedef (hayalet); digerleri sisin altinda (cizilmez) */
  const ST = { 1: 'cleared', 2: 'cleared', 3: 'cleared', 4: 'cleared', moor: 'cleared', cairn: 'cleared', '5B': 'cleared', charcoal: 'cleared', 7: 'cleared', '6A': 'cleared', '5A': 'cleared', grave: 'cleared', pilgrim: 'current', '8A': 'reach', '8C': 'reach', '6B': 'near', river: 'near', 12: 'goal' };
  const PATROL = new Set(['1', '2', 'moor', 'cairn', '5B', 'charcoal', '5A', 'grave']); // gecilmis savaslar: Patrol 60%
  const STAMP = '6B'; // koruma savasi kazanildi (dugum henuz temiz degil)
  const FOGS = [[1300, 700, 250, 170], [1520, 810, 290, 200], [1740, 690, 300, 230], [1770, 450, 280, 200], [1790, 320, 240, 150], [1480, 960, 360, 140], [1650, 980, 380, 120]];
  const COL = { battle: '#cdb67f', event: '#b99ad6', treasure: '#efc85a', rest: '#f08c3c', merchant: '#9fc4a0', town: '#e3bf72', elite: '#d9562c', boss: '#ff7a2a', start: '#cdb67f' };
  const BASE = { battle: 33, tab: 36, town: 48, elite: 50, boss: 64 };
  const kindOf = (t) => (t === 'battle' ? 'battle' : t === 'town' ? 'town' : t === 'elite' ? 'elite' : t === 'boss' ? 'boss' : 'tab');
  const REGN = [0.08229, 0.00077, 0.79804, 0.94083];
  const IMG = { w: W / (REGN[2] - REGN[0]), h: H / (REGN[3] - REGN[1]) };
  IMG.x = -REGN[0] * IMG.w; IMG.y = -REGN[1] * IMG.h;
  const LEG = [['battle', 'Battle'], ['elite', 'Elite'], ['boss', 'Boss'], ['town', 'Town'], ['treasure', 'Treasure'], ['event', 'Event'], ['rest', 'Rest point'], ['merchant', 'Merchant']];
  const PARTY = [
    { id: 'warrior', name: 'Warrior', role: 'Melee Bruiser', lv: 6, hp: 1, pts: 5, lead: true },
    { id: 'archer', name: 'Archer', role: 'Marksman', lv: 6, hp: 0.7, pts: 5 },
    { id: 'druid', name: 'Druid', role: 'Nature Summoner', lv: 5, hp: 0, pts: 5, fallen: true },
    { id: 'mage', name: 'Mage', role: 'Elemental Mage', lv: 5, hp: 0.55, pts: 5 },
  ];
  const HERE = NODES.find((n) => n.id === 'pilgrim');
  const INFO = { region: 'II · Valdren Vale', chapter: 1, cleared: 13, total: 27, mode: 'Normal', diff: 'Medium', gold: 128 };
  const CROWN = '<svg class="crown" viewBox="0 0 24 24" fill="#e8c47e" stroke="#7a5a1e" stroke-width="1"><path d="M3 18 L2 7 L8 12 L12 5 L16 12 L22 7 L21 18 Z"/></svg>';
  const SKULL = '<path d="M-5.2 1.2 a5.2 5.2 0 1 1 10.4 0 v2.6 h-2 v2.2 h-6.4 v-2.2 h-2z" fill="#e9a58f"/><circle cx="-2.1" cy="0.8" r="1.4" fill="#1a0c08"/><circle cx="2.1" cy="0.8" r="1.4" fill="#1a0c08"/>';
  const DISC = 'url(#discg)';

  const cv = document.createElement('canvas').getContext('2d');
  const measure = (t, font, ls) => { cv.font = font; return cv.measureText(t).width + (ls || 0) * t.length; };

  /* ---- dugum cerceveleri: map-frames.ts / map-nodes C (geometri), yalnizca ek kapali ---- */
  const img = (t, s) => `<image class="icon" href="${MK.node(t)}" x="${-s / 2}" y="${-s / 2 - 1}" width="${s}" height="${s}"/>`;
  function frame(t, dim) {
    const c = COL[t];
    const tab = (k) => `<path d="M${k * 30} -7 L${k * 46} 0 L${k * 30} 7 L${k * 34} 0Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>`;
    if (t === 'battle') return `<circle r="28" fill="${DISC}" stroke="${c}" stroke-width="2"/><circle r="31.5" fill="none" stroke="${c}" stroke-opacity=".3"/>${img(t, 54)}`;
    if (['event', 'treasure', 'rest', 'merchant'].includes(t)) return `${tab(-1)}${tab(1)}<circle r="29" fill="${DISC}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>${img(t, 54)}`;
    if (t === 'town') {
      const flag = (k) => `<path d="M${k * 40} -12 L${k * 40} 16 M${k * 40} -12 L${k * 58} -6 L${k * 40} 0" stroke="${c}" stroke-width="2" fill="#8c2b1c" stroke-linejoin="round"/>`;
      return `${flag(-1)}${flag(1)}<path d="M-14 -44 v-8 h6 v5 h5 v-5 h6 v5 h5 v-5 h6 v8Z" fill="${c}" stroke="rgba(0,0,0,.5)"/><circle r="34" fill="${DISC}" stroke="${c}" stroke-width="3.2"/><circle r="39" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="1.4"/>${img(t, 60)}`;
    }
    if (t === 'elite') {
      const arc = (k) => `<path d="M${k * 30} -22 Q${k * 52} -26 ${k * 50} -50 Q${k * 42} -36 ${k * 24} -32Z" fill="#8f2f17" stroke="#e5703a" stroke-width="1.5" stroke-linejoin="round"/>`;
      return `${arc(-1)}${arc(1)}<circle r="39" fill="none" stroke="#9b3a1c" stroke-width="2.4" stroke-dasharray="3 4"/><circle r="33" fill="${DISC}" stroke="#e06a3a" stroke-width="3.4"/><path d="M0 -44 l7 7 l-7 7 l-7 -7Z" fill="#e8352a" stroke="#ffcf7a" stroke-width="1.5" stroke-linejoin="round"/>${img(t, 60)}`;
    }
    const wing = (k) => `<path d="M${k * 40} -10 Q${k * 62} -34 ${k * 76} -62 Q${k * 70} -34 ${k * 82} -22 Q${k * 66} -16 ${k * 74} 4 Q${k * 58} -2 ${k * 56} 18 Q${k * 46} 6 ${k * 42} 12Z" fill="url(#flameg)" stroke="#ffcf7a" stroke-width="1.2" stroke-linejoin="round"/>`;
    return `${dim ? '' : '<circle r="76" fill="url(#bossg)"/>'}${wing(-1)}${wing(1)}<circle r="46" fill="${DISC}" stroke="#f0c25a" stroke-width="4"/><circle r="41" fill="none" stroke="#ff7a2a" stroke-width="2"/>${[-18, 0, 18].map((x, i) => `<path d="M${x - 7} -48 L${x} ${-64 - (i === 1 ? 6 : 0)} L${x + 7} -48Z" fill="#f0c25a" stroke="#7a4a10" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}<circle cx="0" cy="-54" r="3" fill="#e8352a"/>${img(t, 78)}`;
  }
  const defs = () => `<defs>
   <radialGradient id="discg" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="#4a3622"/><stop offset=".7" stop-color="#1c130b"/><stop offset="1" stop-color="#0d0805"/></radialGradient>
   <radialGradient id="emberg"><stop offset=".45" stop-color="rgba(255,150,60,0)"/><stop offset=".7" stop-color="rgba(255,150,60,.55)"/><stop offset="1" stop-color="rgba(255,150,60,0)"/></radialGradient>
   <radialGradient id="bossg"><stop offset=".5" stop-color="rgba(255,100,30,0)"/><stop offset=".78" stop-color="rgba(255,100,30,.5)"/><stop offset="1" stop-color="rgba(255,100,30,0)"/></radialGradient>
   <radialGradient id="goldg"><stop offset=".5" stop-color="rgba(255,215,120,0)"/><stop offset=".78" stop-color="rgba(255,215,120,.6)"/><stop offset="1" stop-color="rgba(255,215,120,0)"/></radialGradient>
   <linearGradient id="flameg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8260e"/><stop offset=".6" stop-color="#ff6a1c"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
   <radialGradient id="fogg"><stop offset="0" stop-color="rgba(238,240,232,.72)"/><stop offset=".55" stop-color="rgba(238,240,232,.38)"/><stop offset="1" stop-color="rgba(238,240,232,0)"/></radialGradient>
  </defs>`;

  /* ---- yollar (oyundaki cift ince cizgi) ---- */
  function curve(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    const k = ((a.id.charCodeAt(0) + b.id.charCodeAt(1)) % 2 ? 1 : -1) * 0.08;
    return `M${a.x} ${a.y} Q${(mx - dy * k).toFixed(1)} ${(my + dx * k).toFixed(1)} ${b.x} ${b.y}`;
  }
  /* Yol stilleri = Phaser cizim degerleri: [genislik, renk, alpha] katmanlari ustuste (alttan uste); dash = [dash, gap] (yoksa duz) */
  const STY = {
    cur: { // CampaignMapScene.drawRoad ile birebir
      walked: { L: [[9, '#080503', 0.5], [6.5, '#f0c25a', 1], [3.2, '#2a1d10', 1]] },
      visible: { L: [[9, '#080503', 0.3], [6.5, '#eadcb4', 0.6], [3.2, '#2a1d10', 0.6]] },
      open: { L: [[14, '#e0702a', 0.16], [11, '#0a0603', 0.55], [3.6, '#ffb35a', 1, [12, 9], 'flow']] },
    },
    v1: { // tek ince yumusak cizgi
      walked: { L: [[2.5, '#e8d6a4', 0.5]] },
      visible: { L: [[2.5, '#e8d6a4', 0.32]] },
      open: { L: [[3.2, '#ffd8a0', 0.85]] },
    },
    v2: { // yurunmemis = noktali patika, yurunmus = duz yumusak, gidilebilir = kor parilti (siyah kesik yok)
      walked: { L: [[3, '#e8d6a4', 0.55]] },
      visible: { L: [[3.2, '#eadcb4', 0.5, [3, 7]]] },
      open: { L: [[10, '#e0702a', 0.1], [6, '#e0702a', 0.16], [2.6, '#ffb35a', 0.85]] },
    },
    v3: { // neredeyse gizli; bulundugun yerden cikan yollar hedef uzerine gelince / secilince belirir
      walked: { L: [[2, '#e8d6a4', 0.2]] },
      visible: { L: [[2, '#e8d6a4', 0.12]] },
      open: { L: [[2.4, '#ffb35a', 0.3]], hot: [[10, '#e0702a', 0.12], [3.4, '#ffb35a', 0.95]] },
    },
  };
  function roads(v, o) {
    const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
    const T = STY[v];
    const out = { visible: '', walked: '', open: '' };
    const lay = (d, layers, extra) => layers.map(([w, c, a, dash, cls]) => `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${a}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash.join(' ')}"` : ''}${cls ? ` class="${cls}"` : ''}${extra || ''}/>`).join('');
    for (const [a, b] of EDGES) {
      const sa = ST[a], sb = ST[b];
      if (!sa || !sb || sa === 'goal' || sb === 'goal') continue;
      const d = curve(byId[a], byId[b]);
      const walked = (sa === 'cleared' || sa === 'current') && (sb === 'cleared' || sb === 'current');
      const open = (sa === 'current' && sb === 'reach') || (sb === 'current' && sa === 'reach');
      if (walked) out.walked += lay(d, T.walked.L);
      else if (open) {
        out.open += lay(d, T.open.L);
        if (T.open.hot) { const to = sa === 'current' ? b : a; out.open += `<g class="rd-hot${o.sel === to ? ' on' : ''}" data-to="${to}">${lay(d, T.open.hot)}</g>`; }
      } else out.visible += lay(d, T.visible.L);
    }
    return out.visible + out.walked + out.open;
  }

  /* ---- ayrintilar ---- */
  const check = (x, y) => `<g transform="translate(${x},${y}) scale(1.15)"><circle r="11" fill="#1b2a14" stroke="#e3bf72" stroke-width="1.8"/><path d="M-5 .5 L-1.5 4 L5.5 -4" fill="none" stroke="#f3d999" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const loopIcon = (x, y) => `<g class="patrol-ic" transform="translate(${x},${y})"><title>Patrol 60%: cleared, fight again</title><circle r="10.5" fill="#1a0f08" stroke="#e0702a" stroke-opacity=".85" stroke-width="1.5"/><path d="M-4.2 1.2 A4.6 4.6 0 1 1 .5 4.6" fill="none" stroke="#ffb35a" stroke-width="1.8" stroke-linecap="round"/><path d="M-7 -.8 L-4 2.4 L-1.2 -1.2Z" fill="#ffb35a"/></g>`;
  const skullPin = (x, y, name) => `<g class="skull-ic" transform="translate(${x},${y})"><title>${esc(name)} defeated</title><circle r="11.5" fill="#1a0c08" stroke="#b8402f" stroke-opacity=".9" stroke-width="1.6"/>${SKULL}</g>`;
  function patrolChip(bottom) { // eski "PATROL 60%" cipi (Cinzel 11, em .12): madalyonun ustunde
    const t = 'PATROL 60%', w = measure(t, '600 11px Cinzel', 1.32) + 16, h = 18;
    return `<g transform="translate(0,${bottom})"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" fill="rgba(13,9,6,.9)" stroke="rgba(217,178,106,.6)"/><text x="0" y="${-h / 2 + 4}" text-anchor="middle" style="font:600 11px Cinzel;letter-spacing:.12em" fill="#f3d999">${t}</text></g>`;
  }
  function stampRibbon(name, R, above) { // eski "<ad> DEFEATED" kurdelesi
    const t = `${name} DEFEATED`.toUpperCase();
    const tw = measure(t, '600 12px Cinzel', 1.44), w = 10 + 20 + 6 + tw + 10, h = 26;
    return `<g transform="translate(0,${above ? R + 24 : -R - 24}) rotate(-6)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="rgba(26,12,8,.93)" stroke="#b8402f" stroke-opacity=".95" stroke-width="2"/><rect x="${-w / 2 + 3}" y="${-h / 2 + 3}" width="${w - 6}" height="${h - 6}" fill="none" stroke="#b8402f" stroke-opacity=".45"/><g transform="translate(${-w / 2 + 20},0) scale(1.05)">${SKULL}</g><text x="${-w / 2 + 36}" y="4" style="font:600 12px Cinzel;letter-spacing:.12em" fill="#e9a58f">${t}</text></g>`;
  }

  /* ---- ana cizim: v = cur | v1 | v2 | v3 ---- */
  function mapSvg(v, o) {
    const phone = o.phone, calm = true, pin = false;
    const K = phone ? 1.3 : 1;                       // dugum olcegi: telefonda parmakla secilecek kadar buyuk
    const fs = phone ? 25 : 15, fsub = fs * 0.87;
    const sel = o.sel;
    let h = defs();
    h += `<image href="${ASSET}map.webp" x="${IMG.x}" y="${IMG.y}" width="${IMG.w}" height="${IMG.h}" preserveAspectRatio="none"/>`;
    h += `<g id="roads">${roads(v, o)}</g>`;
    h += FOGS.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#fogg)" opacity="${calm ? 0.62 : 1}"/>`).join('');
    let nodes = '', labels = '', hero = '';
    for (const n of NODES) {
      const st = ST[n.id];
      if (!st) continue;
      const k = kindOf(n.type);
      const S = (k === 'boss' ? 0.76 : 0.82) * K;
      const done = st === 'cleared';
      const small = pin && done;           // V3: gecilenler kucuk igne
      const R = small ? 15 * K : BASE[k] * S;
      const patrol = PATROL.has(n.id);
      const stamped = n.id === STAMP;
      const alone = st === 'current' || st === 'reach';
      const cls = `node st-${st}${calm ? ' calm' : ''}${n.id === sel ? ' sel' : ''}${small ? ' pinned' : ''}`;
      let body = '';
      const gR = BASE[k] * S * 1.3;
      if (st === 'reach' || (k === 'boss' && st !== 'goal' && !calm)) body += `<circle class="glow" r="${gR + 12}" fill="url(#emberg)"/>`;
      if (st === 'current') body += `<circle r="${gR + 14}" fill="url(#goldg)"/>`;
      if (small) {
        body += `<g class="body"><circle r="14" fill="${DISC}" stroke="rgba(217,178,106,.55)" stroke-width="2"/>${img(n.type === 'boss' ? 'boss' : n.type, 20)}</g>`;
        body = `<g transform="scale(${K})">${body}</g>`;
      } else {
        body += `<g transform="scale(${S})"><g class="body">${frame(n.type, calm)}</g></g>`;
        if (st === 'current') body += `<circle r="${BASE[k] * S * 1.25}" fill="none" stroke="#f3d999" stroke-width="3" stroke-opacity="${calm ? 0.85 : 0.95}"/>${calm ? '' : `<circle r="${BASE[k] * S * 1.25 + 5}" fill="none" stroke="rgba(243,217,153,.4)" stroke-width="1.5"/>`}`;
        body += `<circle class="selring" r="${BASE[k] * S * 1.25 + 7}" fill="none" stroke="#ffb35a" stroke-width="3" stroke-dasharray="10 7"/>`;
      }
      const bx = R * 0.72;
      if (!calm && done) body += check(bx, bx);
      if (calm && patrol) body += loopIcon(small ? 14 * K : R * 0.74, small ? -14 * K : -R * 0.74);
      if (calm && stamped) body += skullPin(R * 0.78, R * 0.78, 'Mine Wardens');
      const stampBig = !calm && stamped;
      const labelAbove = n.above;
      let patrolChipSvg = '';
      if (!calm && patrol) patrolChipSvg = patrolChip(-R + 2);
      const vis = st === 'goal' ? 0.75 : 1;
      nodes += `<g class="${cls}" data-id="${n.id}" transform="translate(${n.x},${n.y})" opacity="${vis}"><g class="nodebody">${body}</g>${patrolChipSvg}${stampBig ? stampRibbon('Mine Wardens', R, labelAbove) : ''}<circle class="cm-hit" r="${Math.max(30, R + 4)}" fill="transparent"/></g>`;
      if (st === 'current') {
        const hs = 118 * Math.max(1, K * 0.9);
        hero += `<g transform="translate(${n.x},${n.y - 30 * S})" pointer-events="none"><image class="hero" href="${ASSET}hero.webp" x="${-hs * 0.5}" y="${-hs * 0.86}" width="${hs}" height="${(hs * 466) / 495}"/></g>`;
      }
      /* etiket */
      const name = n.name.toUpperCase();
      const subParts = [n.sub];
      if (calm && patrol) subParts.push('Patrol 60%');
      if (calm && stamped) subParts.push('Wardens defeated');
      const subTxt = subParts.join(' · ');
      const nameW = measure(name, `600 ${fs}px Cinzel`, fs * 0.06), subW = measure(subTxt, `${fsub}px 'EB Garamond'`, 0);
      const bw = Math.max(nameW, subW) + 22, bh = fs * 2.45;
      // eski ekranda yukari konan ad, cipin ustunde degil altta durur (patrol cipi yukarda)
      let above = labelAbove;
      if (!calm && patrol && above) above = false;
      let side = above ? 'above' : 'below';
      if (!calm && n.id === '7') side = 'right'; // eski ekrandaki durum: kurdele bu etiketin ustune biniyor
      let bx0 = -bw / 2, by0 = above ? -R - bh - 10 : R + 10;
      if (side === 'right') { bx0 = R + 12; by0 = -bh / 2; }
      const cxm = bx0 + bw / 2;
      const col = COL[n.type];
      const isHot = alone || n.id === sel;
      const nameCol = st === 'current' ? '#f3d999' : st === 'goal' ? '#a8977a' : '#d9c8a2';
      const bandSvg = `<rect x="${bx0}" y="${by0}" width="${bw}" height="${bh}" fill="rgba(13,9,6,.88)" stroke="rgba(217,178,106,.28)"/><rect x="${bx0}" y="${by0}" width="4" height="${bh}" fill="${col}"/>`
        + `<text x="${cxm + 2}" y="${by0 + fs * 1.08}" text-anchor="middle" class="lbl-name" style="font-size:${fs}px" fill="${nameCol}">${esc(name)}</text>`
        + `<text x="${cxm + 2}" y="${by0 + fs * 2.0}" text-anchor="middle" class="lbl-sub" style="font-size:${fsub}px" fill="#b9a883">${esc(subTxt)}</text>`;
      if (!calm) {
        labels += `<g class="lb on" data-id="${n.id}">${st === 'goal' ? '' : ''}<g transform="translate(${n.x},${n.y})">${bandSvg}</g></g>`;
      } else {
        // sakin: ad yalnizca (V1, telefonda yalniz yakinlar) ya da hic (V2, V3); bant yalniz buradayiz / gidilebilir / secili / ustune gelinen
        const quietOn = !phone;
        const quietY = above ? -R - 12 : R + fs + 6;
        const quiet = quietOn ? `<text class="lbl-name quiet${done ? ' dimq' : ''}" x="0" y="${quietY}" text-anchor="middle" style="font-size:${fs * 0.92}px" fill="#e6d8b4" stroke="rgba(6,4,2,.95)" stroke-width="${fs * 0.34}" stroke-linejoin="round" paint-order="stroke">${esc(name)}</text>` : '';
        const bandVisible = isHot;
        labels += `<g class="lb${bandVisible ? ' on' : ''}" data-id="${n.id}"><g transform="translate(${n.x},${n.y})"><g class="qt">${quiet}</g><g class="bd">${bandSvg}</g></g></g>`;
      }
      void isHot;
    }
    h += `<g id="nodes">${nodes}</g>${hero}<g id="labels" pointer-events="none">${labels}</g>`;
    return h;
  }

  /* ---- ortak HUD parcalari ---- */
  const navs = MK.navBtn('back', 'Back') + MK.navBtn('fs', 'Fullscreen') + MK.navBtn('menu', 'Menu');
  const brazier = (o) => `<img class="cm-brazier" src="${MK.brazier('brazier-2')}" alt="" style="${o || ''}">`;
  const gearBtns = (style) => `<div class="mh-ibtn" style="left:24px;bottom:34px;${style || ''}"><img src="${MK.ui('gear')}" alt=""></div><div class="mh-ibtn" style="left:102px;bottom:34px;${style || ''}"><img src="${MK.ui('formation')}" alt=""></div>`;
  const hpAt = (h) => (h.fallen ? 'Fallen' : `${Math.round(h.hp * 100)}%`);
  const legendTip = () => MK.tip({ kind: 'Map', title: 'Legend', chips: [...LEG.map(([t, l]) => ({ icon: MK.node(t), text: l })), { text: 'Loop icon: Patrol, cleared, fight again' }, { text: 'Skull: guards defeated' }] });
  const cluster = (extra) => `<div class="cm-cluster ${extra || ''}"><button class="cm-sq" type="button" title="Zoom out">&minus;</button><button class="cm-sq" type="button" title="Zoom in">+</button><div class="cm-q"><button class="cm-sq" type="button" title="Legend">?</button><div class="pop">${legendTip()}</div></div></div>`;
  const hud = (inner) => `<div class="cm-hud">${inner}</div>`;

  /* ---------- V1 Sakin etiket: sol sutun korunur, sade ---------- */
  const page = (rv) => (o) => {
    const rows = PARTY.map((h) => `<div class="c1-row${h.fallen ? ' fallen' : ''}"><div class="pf"><img src="${MK.av(h.id)}" alt="">${h.pts ? '<i class="k-dia on"></i>' : ''}</div><div class="tx"><div class="nm">${h.lead ? CROWN : ''}<span>${h.name}</span><b>Lv ${h.lv}</b></div><div class="bar"><i style="width:${h.hp * 100}%"></i></div><div class="meta">${h.fallen ? 'Fallen' : esc(h.role)}</div></div></div>`).join('');
    return `<svg class="cm-map" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mapSvg(rv, o)}</svg>` + hud(`
      <div class="c1-col"></div><div class="mh-top calm"></div><div class="mh-region calm">Valdoria</div>${brazier('left:64px;top:8px')}
      <div class="c1-pad hk-tl"><div class="c1-head"><span class="k">Your party</span><span class="k-chip hot c1-note"><i class="k-dia on"></i>5 points to spend each</span></div>${rows}
        <div class="c1-here"><span class="tile"><img src="${MK.node('battle')}" alt=""></span><span><span class="k">You are here</span><span class="n">${HERE.name}</span></span></div>
        <div class="c1-foot"><div class="reg"><b>${INFO.region}</b></div><div class="prog"><i style="width:${(INFO.cleared / INFO.total) * 100}%"></i></div><div class="line"><span>Cleared ${INFO.cleared}/${INFO.total}</span><span>Ch. ${INFO.chapter}</span><span>${INFO.mode} · ${INFO.diff}</span><span class="g"><img src="${MK.ui('gold')}" alt=""><b>${INFO.gold}</b></span></div></div></div>
      ${gearBtns()}${cluster()}`);
  };

  const frames = [];
  function build(fn, cap) {
    return (host) => {
      const f = MK.addFrame(host, {
        cap, dim: false, state: { sel: '8C' },
        render: (ui, fr) => {
          ui.innerHTML = `<div class="mk-stage mh-stage cm-stage">${fn({ phone: MK.S.phone, sel: fr.state.sel })}</div>${navs}`;
          wire(ui, fr);
        },
      });
      frames.push(f);
    };
  }
  function wire(ui, f) {
    const hov = (id, on) => ui.querySelectorAll(`.lb[data-id="${CSS.escape(id)}"]`).forEach((g) => g.classList.toggle('hov', on));
    ui.querySelectorAll('.node').forEach((nd) => {
      const id = nd.dataset.id;
      nd.addEventListener('mouseenter', () => { hov(id, true); ui.querySelectorAll(`.rd-hot[data-to="${CSS.escape(id)}"]`).forEach((g) => g.classList.add('hv')); });
      nd.addEventListener('mouseleave', () => { hov(id, false); ui.querySelectorAll('.rd-hot.hv').forEach((g) => g.classList.remove('hv')); });
      nd.addEventListener('click', () => {
        if (f.state.sel === undefined || f.state.sel === null) return;
        ui.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
        ui.querySelectorAll('.lb.selb').forEach((x) => x.classList.remove('selb'));
        nd.classList.add('sel');
        ui.querySelectorAll(`.lb[data-id="${CSS.escape(id)}"]`).forEach((g) => g.classList.add('selb'));
        ui.querySelectorAll('.rd-hot').forEach((g) => g.classList.toggle('on', g.dataset.to === id));
        f.state.sel = id;
      });
    });
    const q = ui.querySelector('.cm-q');
    if (q) q.querySelector('button').addEventListener('click', () => q.classList.toggle('tipon'));
  }
  const ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 15px Cinzel'), document.fonts.load("15px 'EB Garamond'")]).catch(() => 0) : Promise.resolve();
  ready.then(() => {
    let lastPhone = MK.S.phone;
    MK.onApply = (S) => {
      if (S.phone !== lastPhone) { lastPhone = S.phone; frames.forEach((f) => f.redraw()); }
    };
    MK.mount({
      title: 'Campaign map, roads',
      sections: [
        { id: 'cur', tab: 'Current', h: 'Şimdiki yollar (oyundaki gibi)', note: 'Oyundaki çizim: yürünmüş yol altın çift çizgi, görünür yol soluk çift çizgi, gidilebilir yol koyu zemin + kor rengi akan kesik çizgi + kor parıltısı. Gerisi sakin V1 ile aynı.', build: build(page('cur'), 'Şimdiki yollar') },
        { id: 'v1', tab: 'V1 Single line', h: 'V1 · Tek ince yumuşak çizgi', note: 'Bütün yollar tek ince çizgi, kesik yok. Yürünmüş biraz daha belirgin, görünür daha soluk, gidilebilir yollar ılık ve biraz daha parlak.', build: build(page('v1'), 'V1: tek ince çizgi') },
        { id: 'v2', tab: 'V2 Footpath', h: 'V2 · Patika noktaları + yumuşak kor', note: 'Yürünmemiş yollar küçük noktalı patika, yürünmüş yollar düz yumuşak çizgi. Gidilebilir yol siyah kesik olmadan hafif kor parıltısıyla öne çıkar.', build: build(page('v2'), 'V2: noktalı patika, yumuşak kor') },
        { id: 'v3', tab: 'V3 Hidden', h: 'V3 · Neredeyse gizli yollar', note: 'Yollar çok soluk. Bulunduğun düğümden çıkan yollar hafifçe seçilir; hedef düğümün üstüne gelince (telefonda dokununca) o yol yumuşakça parlar. Başlangıçta Black Cathedral seçili.', build: build(page('v3'), 'V3: gizli yollar, hover ile parlar') },
      ],
    });
  });
})();
