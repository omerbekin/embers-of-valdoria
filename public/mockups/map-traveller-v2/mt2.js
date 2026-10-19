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
   <linearGradient id="clothg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a63b27"/><stop offset=".55" stop-color="#85281a"/><stop offset="1" stop-color="#5e170d"/></linearGradient>
   <linearGradient id="woodg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e130a"/><stop offset=".35" stop-color="#6a4826"/><stop offset=".6" stop-color="#4a3019"/><stop offset="1" stop-color="#170e07"/></linearGradient>
   <radialGradient id="basetop" cx="42%" cy="35%" r="75%"><stop offset="0" stop-color="#7d5a33"/><stop offset=".7" stop-color="#4a301a"/><stop offset="1" stop-color="#2c1b0e"/></radialGradient>
   <linearGradient id="foldg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
   <radialGradient id="firelit"><stop offset="0" stop-color="rgba(255,170,70,.62)"/><stop offset=".5" stop-color="rgba(255,120,40,.25)"/><stop offset="1" stop-color="rgba(255,100,30,0)"/></radialGradient>
   <filter id="blur2" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
   <filter id="inkw" x="-30%" y="-10%" width="160%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4"/></filter>
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
      const open = (sa === 'current' && sb === 'reach') || (sb === 'current' && sa === 'reach') || (o.walk && a === 'grave' && b === 'pilgrim');
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

  /* =====================================================================================================
     YOLCU MOTORU (v2): gercek poz resimleri (assets/poses/<sinif>-v2: step1 / idle1 / step2 / kneel), patika rotasi, zaman cizelgesi
     ===================================================================================================== */
  const NS = 'http://www.w3.org/2000/svg';
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const eio = (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));
  let UID2 = 0;
  const GREEN = '#7fbf6a', AMBER = '#d9a441', GREY = '#6b6560';
  const hpCol = (h) => (h.fallen ? GREY : h.hp > 0.6 ? GREEN : AMBER);
  const hpAt = (h) => (h.fallen ? 'Fallen' : `${Math.round(h.hp * 100)}%`);
  const nodeById = (id) => NODES.find((n) => n.id === id);
  const POSEDIR = 'map-traveller-v2/p/';
  const POSEN = ['step1', 'idle1', 'step2', 'kneel'];
  const MEAS = {};
  let REF = 100;
  const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  async function measurePoses() {
    const cvs = document.createElement('canvas'), cx = cvs.getContext('2d', { willReadFrequently: true });
    for (const p of PARTY) {
      MEAS[p.id] = {};
      for (const n of POSEN) {
        const im = await loadImg(`${POSEDIR}${p.id}-${n}.webp`);
        if (!im) { MEAS[p.id][n] = { cx: 250, bot: 440, top: 60, w: 495, h: 466 }; continue; }
        const w = im.naturalWidth, h = im.naturalHeight; cvs.width = w; cvs.height = h; cx.clearRect(0, 0, w, h); cx.drawImage(im, 0, 0);
        const d = cx.getImageData(0, 0, w, h).data; let x0 = w, x1 = 0, y0 = h, y1 = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        MEAS[p.id][n] = { cx: (x0 + x1) / 2, bot: y1, top: y0, w, h };
      }
    }
    REF = MEAS.warrior.idle1.bot - MEAS.warrior.idle1.top;
  }
  /* yuruyen figur: 4 poz ust uste, biri gorunur. H = savasci boyu (px, 1920'luk sahne birimi) */
  function walker(id, H, style) {
    const s = H / REF;
    const parts = POSEN.map((n) => { const m = MEAS[id][n]; return `<image data-p="${n}" href="${POSEDIR}${id}-${n}.webp" x="${(-m.cx * s).toFixed(1)}" y="${(-m.bot * s).toFixed(1)}" width="${(m.w * s).toFixed(1)}" height="${(m.h * s).toFixed(1)}" visibility="hidden"/>`; }).join('');
    return `<g class="wk" data-id="${id}" data-h="${H}"${style ? ` style="${style}"` : ''}><g class="wf">${parts}</g></g>`;
  }
  function setPose(g, pose) {
    if (!g.__imgs) { g.__imgs = {}; g.querySelectorAll('image').forEach((i) => { g.__imgs[i.dataset.p] = i; }); }
    if (g.__pose === pose) return;
    if (g.__pose) g.__imgs[g.__pose].setAttribute('visibility', 'hidden');
    g.__imgs[pose].setAttribute('visibility', 'visible'); g.__pose = pose;
  }
  const setFlip = (g, f) => { const k = f < 0 ? -1 : 1; if (g.__flip === k) return; g.__flip = k; g.firstChild.setAttribute('transform', k < 0 ? 'scale(-1,1)' : ''); };
  /* yurume dongusu: step1 -> idle1 -> step2 -> idle1; ayak yere degdiginde (step) alcak, gecerken (idle) yuksek */
  const STRIDE = 50;
  function gait(phase) { const f = ((phase % 1) + 1) % 1, i = Math.floor(f * 4); return { pose: ['step1', 'idle1', 'step2', 'idle1'][i], i, bob: -3.4 * (0.5 - 0.5 * Math.cos(f * Math.PI * 4)) }; }

  /* toz bulutu */
  function puff(layer, x, y, o) {
    if (RM || !layer) return;
    o = o || {}; const n = o.n || 4, big = o.big || 1;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', ((2 + Math.random() * 2.4) * big).toFixed(1)); c.setAttribute('cx', (x + (Math.random() - 0.5) * 12 * big).toFixed(1)); c.setAttribute('cy', (y - 1).toFixed(1));
      c.setAttribute('fill', o.col || 'rgba(228,210,172,.6)'); c.style.cssText = 'transform-box:fill-box;transform-origin:center;pointer-events:none';
      layer.appendChild(c);
      const dx = (Math.random() - 0.5) * 28 * big, dy = -(3 + Math.random() * 10) * big;
      const a = c.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.75 }, { transform: `translate(${dx}px,${dy}px) scale(1.8)`, opacity: 0 }], { duration: 480 + Math.random() * 300, easing: 'ease-out' });
      a.onfinish = () => c.remove();
    }
  }

  /* ---- rota: 6A -> Grave Field (yurulmus) -> Pilgrim Road (hedef). Yolcu son ayagi yurur; onceki ayak takipcilerin geri kalani icin ---- */
  const ROUTE = (() => {
    const a = nodeById('6A'), g = nodeById('grave'), p = nodeById('pilgrim');
    const d1 = curve(a, g), d2 = curve(g, p);
    const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('width', '0'); sv.setAttribute('height', '0'); sv.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    const mk = (d) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); sv.appendChild(e); return e; };
    document.body.appendChild(sv);
    const e1 = mk(d1), e2 = mk(d2), L1 = e1.getTotalLength(), L2 = e2.getTotalLength();
    const ptAt = (len) => {
      len = clamp(len, 0, L1 + L2);
      const first = len <= L1, e = first ? e1 : e2, l = first ? len : len - L1, ll = first ? L1 : L2;
      const p0 = e.getPointAtLength(clamp(l - 1.5, 0, ll)), p1 = e.getPointAtLength(clamp(l + 1.5, 0, ll)), q = e.getPointAtLength(l);
      return { x: q.x, y: q.y, ang: Math.atan2(p1.y - p0.y, p1.x - p0.x) };
    };
    return { L: L1 + L2, L1, L2, ptAt, d1, d2, g, p, a };
  })();

  /* ---- parti ipucu (A Band + sade satirlar) ---- */
  function partyTip() {
    const rows = PARTY.map((h) => `<div class="pt-row${h.fallen ? ' fallen' : ''}"><img src="${MK.av(h.id)}" alt=""><div class="pt-tx"><div class="pt-nm">${h.lead ? CROWN : ''}<span>${h.name}</span><b>Lv ${h.lv}</b></div><div class="pt-bar"><i style="width:${(h.fallen ? 1 : h.hp) * 100}%;background:${hpCol(h)}"></i></div></div><span class="pt-st" style="color:${h.fallen ? '#e8806a' : h.hp > 0.6 ? '#cfe8a8' : '#f0c25a'}">${hpAt(h)}</span></div>`).join('');
    return MK.tip({ kind: 'Your party', title: 'Warband of 4', chips: [{ text: '2 fit' }, { text: '1 wounded', tone: 'warn' }, { text: '1 fallen' }], bodyHtml: `<div class="pt-rows">${rows}</div>` });
  }

  /* ---- zaman cizelgesi ---- */
  const TL = { rest0: 1.5, dep: 0.85, walk: 5.6, arr: 0.95, rest1: 3.6 };
  function startRunner(ui, fr, ctor, o) {
    const over = ui.querySelector('#travOver'), under = ui.querySelector('#travUnder'), tipg = ui.querySelector('#travTip'), svgEl = ui.querySelector('svg.cm-map');
    const K = MK.S.phone ? 1.6 : 1;
    const env = { K, under, over, L: ROUTE.L, L1: ROUTE.L1, ptAt: ROUTE.ptAt, g: ROUTE.g, p: ROUTE.p, phone: MK.S.phone };
    const c = ctor(env);
    const walkT = c.walkT || TL.walk;
    const fix = (h) => h.replace(UNIQRE, `$1$2-${o.u}`);
    over.innerHTML = fix(c.svg); if (c.under) under.insertAdjacentHTML('beforeend', fix(c.under));
    c.init(over, under);
    tipg.innerHTML = `<g class="ttip" style="display:none"><foreignObject x="0" y="0" width="420" height="360"><div class="mt-tipbox">${partyTip()}</div></foreignObject></g>`;
    const tipEl = tipg.firstChild, hit = over.querySelector('.hit');
    let tipPin = false, tipHov = false;
    const showTip = () => { tipEl.style.display = tipPin || tipHov ? '' : 'none'; };
    if (hit) {
      hit.style.cursor = 'pointer'; hit.style.pointerEvents = 'all';
      hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { tipHov = true; showTip(); } });
      hit.addEventListener('pointerleave', () => { tipHov = false; showTip(); });
      hit.addEventListener('click', () => { tipPin = !tipPin; showTip(); });
    }
    const arriveEls = () => ui.querySelectorAll('.curring,.curglow'), glowEls = () => ui.querySelectorAll('.node[data-id="pilgrim"] .glow');
    let arrivedNow = null;
    const lbd = ui.querySelector('.lb[data-id="pilgrim"] .bd'), lbDy = 2 * 27.06 * K + (MK.S.phone ? 25 : 15) * 2.45 + 20;
    const setArrived = (v) => { if (!o.walk || arrivedNow === v) return; arrivedNow = v; if (lbd) lbd.style.transform = v ? `translateY(${lbDy.toFixed(1)}px)` : ''; arriveEls().forEach((e) => { e.style.opacity = v ? '1' : '0'; }); glowEls().forEach((e) => { e.style.opacity = v ? '0' : ''; }); };
    let tau = 0, last = performance.now(), moved = 0, px = null, py = null, speed = 0, flip = 1, vis = true, raf = 0, stopped = false, tclock = 0, replayStep = 0;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { vis = es[0].isIntersecting; }) : null;
    if (io) io.observe(svgEl);
    const total = TL.rest0 + TL.dep + walkT + TL.arr + TL.rest1;
    const comp = (tt) => {
      if (!o.walk) return { len: env.L, r: 1, phase: 'rest1', uw: 1 };
      if (o.freeze != null) return { len: lerp(env.L1, env.L, eio(o.freeze)), r: o.freeze > 0.985 ? 1 : o.freeze < 0.015 ? 1 : 0, phase: 'walk', uw: o.freeze };
      let u = tt;
      if (u < TL.rest0) return { len: env.L1, r: 1, phase: 'rest0', uw: 0 };
      u -= TL.rest0;
      if (u < TL.dep) return { len: env.L1, r: 1 - sm(u / TL.dep), phase: 'dep', uw: 0 };
      u -= TL.dep;
      if (u < walkT) return { len: lerp(env.L1, env.L, eio(u / walkT)), r: 0, phase: 'walk', uw: u / walkT };
      u -= walkT;
      if (u < TL.arr) return { len: env.L, r: sm(u / TL.arr), phase: 'arr', uw: 1 };
      return { len: env.L, r: 1, phase: 'rest1', uw: 1 };
    };
    const step = (dt) => {
      if (RM) tau = 0; else { tau += dt; if (o.walk && o.freeze == null && tau > total) { tau = 0; moved = 0; px = null; if (c.reset) c.reset(); setArrived(false); } }
      tclock += dt;
      const s = comp(tau);
      if (c.len) s.len = c.len(s, env);
      const b = ROUTE.ptAt(s.len), off = { x: c.restOff.x * K, y: c.restOff.y * K };
      const nodeP = s.uw < 0.5 ? env.g : env.p;
      const x = b.x + off.x * s.r, y = b.y + off.y * s.r;
      let inst = 0;
      if (px != null && dt > 0) { const d = Math.hypot(x - px, y - py); moved += d; inst = d / dt; }
      speed = speed * 0.75 + inst * 0.25; if (px == null) speed = 0;
      px = x; py = y;
      const cs = Math.cos(b.ang);
      if (s.r > 0.5) flip = 1; else if (Math.abs(cs) > 0.12) flip = cs > 0 ? 1 : -1;
      if (o.freeze != null && s.phase === 'walk' && s.r === 0) { speed = 60; moved = 30 + o.freeze * 400; }
      s.x = x; s.y = y; s.ang = b.ang; s.moved = moved; s.speed = speed; s.flip = flip; s.t = RM ? 0 : tclock; s.dt = dt; s.nx = nodeP.x; s.ny = nodeP.y; s.base = b; s.off = off;
      setArrived(s.phase === 'arr' || s.phase === 'rest1' || !o.walk || (o.freeze != null && o.freeze > 0.985));
      c.frame(s);
      if (tipEl.style.display !== 'none') {
        const sc = (MK.S.phone ? 1.8 : 1.0), w = 400 * sc, h = 340 * sc;
        const tx = clamp(x + 84 * K, 12, 1908 - w), ty = clamp(y - 150 * K, 60, 1070 - h);
        tipEl.setAttribute('transform', `translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${sc})`);
      }
    };
    const run = (now) => {
      if (stopped) return;
      raf = requestAnimationFrame(run);
      if (!vis || document.hidden || fr.paused) { last = now; return; }
      const dt = clamp((now - last) / 1000, 0, 0.1); last = now;
      step(dt);
    };
    fr.tick = (dt, n) => { for (let i = 0; i < (n || 1); i++) step(dt); };
    fr.seek = (t) => { tau = t; };
    const stop = () => { stopped = true; cancelAnimationFrame(raf); if (io) io.disconnect(); };
    fr.stop = stop;
    fr.replay = () => {
      if (RM) { replayStep = (replayStep + 1) % 3; o.freeze = [0.04, 0.5, 1][replayStep]; px = null; return; }
      tau = 0; moved = 0; px = null; if (c.reset) c.reset(); setArrived(false); o.freeze = null;
    };
    if (o.walk && RM && o.freeze == null) o.freeze = 0.55;
    raf = requestAnimationFrame(run);
  }

  /* =====================================================================================================
     V1 · SANCAKTAR KAHRAMAN: gercek yuruyus pozlari + akan parti sancagi (tek bez, kivrim golgeli), toz bulutlari
     ===================================================================================================== */
  const crownPath = 'M-12 8 L-14 -9 L-6 -3 L0 -12 L6 -3 L14 -9 L12 8Z';
  function mkV1(env) {
    const K = env.K, LH = 92, id = ++UID2, N = 12, W = 72, TOP = -166, CH = 54, POLE = -28;
    let root, cloth, folds, crest, gems, who, wk, clipP, shadow, lastI = -1, hem;
    const svg = `<g class="trav tv1"><g class="v1root">
      <ellipse class="sh" cx="-8" cy="2" rx="40" ry="7.5" fill="rgba(0,0,0,.4)"/>
      <g class="pole"><ellipse cx="${POLE}" cy="2" rx="10" ry="3" fill="rgba(0,0,0,.45)"/>
        <path d="M${POLE - 8} 3 q8 -7 16 0 l-3 -4 h-10z" fill="#4a3a2a" stroke="#1a120a" stroke-width="1"/>
        <path d="M${POLE} 0 V${TOP - 4}" stroke="#1d1209" stroke-width="5" stroke-linecap="round"/><path d="M${POLE - 1.2} -3 V${TOP - 2}" stroke="#8a6a3a" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>
        <path d="M${POLE} ${TOP - 8} l-6.5 4 l6.5 -22 l6.5 22Z" fill="#e8c47e" stroke="#6b4a14" stroke-width="1.1" stroke-linejoin="round"/><circle cx="${POLE}" cy="${TOP - 3}" r="3.4" fill="#f3d999" stroke="#6b4a14" stroke-width="1"/>
        <clipPath id="v1cl${id}"><path class="cp" d=""/></clipPath>
        <g class="cloth"><path class="cl" d="" fill="url(#clothg)"/><g class="folds" clip-path="url(#v1cl${id})"></g><path class="hem" d="" fill="none" stroke="#e8c47e" stroke-width="1.8" stroke-linejoin="round"/>
          <g class="crest"><path d="${crownPath}" transform="scale(.95)" fill="#e8c47e" stroke="#6b4a14" stroke-width="1.2" stroke-linejoin="round"/><circle cy="-14" r="0" fill="#f3d999"/></g></g>
        <g class="gems"></g></g>
      <g class="who">${walker('warrior', LH, 'filter:drop-shadow(0 3px 2px rgba(0,0,0,.55))')}</g>
      <circle class="hit" r="54" cy="-54" fill="transparent"/></g></g>`;
    const wave = (u, t, amp) => Math.sin(t * 5.2 - u * 5.6) * (1.4 + u * 7.5) * amp + Math.sin(t * 2.3 - u * 2.2) * u * 2.4 * amp;
    return {
      svg, restOff: { x: -80, y: 8 },
      init(o) {
        root = o.querySelector('.v1root'); cloth = o.querySelector('.cl'); folds = o.querySelector('.folds'); crest = o.querySelector('.crest'); hem = o.querySelector('.hem'); clipP = o.querySelector('.cp');
        who = o.querySelector('.who'); wk = who.querySelector('.wk'); shadow = o.querySelector('.sh'); gems = o.querySelector('.gems');
        let f = ''; for (let i = 0; i < N; i++) f += '<path class="fd" d="" fill="#000" fill-opacity="0"/>'; folds.innerHTML = f;
        gems.innerHTML = PARTY.map((h) => `<g class="gm"><path d="M0 0 v7" stroke="#e8c47e" stroke-width="1" opacity=".8"/><g transform="translate(0,12)"><path d="M0 -6 L5 0 L0 6 L-5 0Z" fill="${h.fallen ? '#1a1512' : hpCol(h)}" stroke="${h.fallen ? '#8a8078' : '#120b06'}" stroke-width="1.6"/>${h.fallen ? '<path d="M-2.4 -2.4 L2.4 2.4 M2.4 -2.4 L-2.4 2.4" stroke="#b8402f" stroke-width="1.3"/>' : '<path d="M0 -3.4 L2 0 L0 3.4 L-2 0Z" fill="rgba(255,255,255,.35)"/>'}</g></g>`).join('');
      },
      frame(s) {
        const walking = s.speed > 8, amp = lerp(1.0, 0.34, s.r) * (walking ? 1.25 : 1), tt = s.t * (1 + Math.min(1.2, s.speed / 70));
        root.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${(s.flip * K).toFixed(3)},${K})`);
        const g = walking ? gait(s.moved / STRIDE) : { pose: 'idle1', i: -1, bob: Math.sin(s.t * 1.9) * 0.9 };
        setPose(wk, g.pose); setFlip(wk, 1); who.setAttribute('transform', `translate(0,${g.bob.toFixed(1)})`);
        if (walking && g.i !== lastI && (g.i === 0 || g.i === 2)) puff(env.under, s.x - s.flip * 10 * K, s.y + 1, { n: 4 });
        lastI = g.i;
        const droop = s.r * 10, pts = [], pts2 = [];
        for (let i = 0; i <= N; i++) { const u = i / N, x = POLE - u * W, dy = wave(u, tt, amp) + droop * u * u; pts.push([x, TOP + dy]); pts2.push([x, TOP + CH + dy]); }
        const tipDy = pts2[N][1] - pts[N][1];
        const notch = [POLE - W + 15, (pts[N][1] + pts2[N][1]) / 2];
        const poly = pts.map((p) => p.join(' ')).join(' L') + ` L${notch.join(' ')} L` + pts2.slice().reverse().map((p) => p.join(' ')).join(' L');
        const d = 'M' + poly + 'Z';
        cloth.setAttribute('d', d); clipP.setAttribute('d', d); hem.setAttribute('d', d);
        const fd = folds.children;
        for (let i = 0; i < N; i++) {
          const a = pts[i], b = pts[i + 1], c2 = pts2[i + 1], e = pts2[i];
          fd[i].setAttribute('d', `M${a.join(' ')} L${b.join(' ')} L${c2.join(' ')} L${e.join(' ')}Z`);
          const sl = Math.cos(tt * 5.2 - (i / N) * 5.6) * amp;
          fd[i].setAttribute('fill', sl > 0 ? '#000' : '#ffd9a0'); fd[i].setAttribute('fill-opacity', (Math.abs(sl) * 0.24).toFixed(2));
        }
        const cu = 0.34, ci = Math.round(cu * N);
        crest.setAttribute('transform', `translate(${(POLE - cu * W).toFixed(1)},${((pts[ci][1] + pts2[ci][1]) / 2 + 3).toFixed(1)}) scale(${(1 - 0.12 * Math.abs(Math.sin(tt * 5.2 - cu * 5.6))).toFixed(3)},1)`);
        const gm = gems.children;
        for (let i = 0; i < gm.length; i++) { const u = 0.1 + i * 0.2, k = Math.round(u * N), x = POLE - u * W; gm[i].setAttribute('transform', `translate(${x.toFixed(1)},${(pts2[k][1] + 1 + Math.sin(tt * 4 + i) * 0.6 * amp).toFixed(1)}) rotate(${(Math.sin(tt * 4.4 - i * 0.9) * 5 * amp).toFixed(1)})`); }
        shadow.setAttribute('rx', (38 + (walking ? 2 : 0)).toFixed(1));
      },
    };
  }

  /* =====================================================================================================
     V2 · MASA MINYATURU: yuvarlak tabanda boyali figur; dugumden dugume ziplar, golge ayrilir, inerken toz halkasi.
     Taban kenar halkasi 4 parcali = parti sagligi.
     ===================================================================================================== */
  function arcPts(rx, ry, a0, a1, n) { const out = []; for (let i = 0; i <= n; i++) { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; out.push([rx * Math.cos(a), ry * Math.sin(a)]); } return out; }
  function mkV2(env) {
    const K = env.K, LH = 86, RX = 36, RY = 12;
    let root, lift, tilt, shadow, wk, who, base, land = 0, lastHop = -1, lastLand = -1, hopN = 4;
    const rim = (rx, ry) => PARTY.map((h, i) => { const c = 45 + i * 90, pts = arcPts(rx, ry, c - 31, c + 31, 10).map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L'); return `<path d="M${pts}" fill="none" stroke="${h.fallen ? '#3b342d' : hpCol(h)}" stroke-width="3.6" stroke-linecap="round"/>${h.fallen ? `<path d="M${pts}" fill="none" stroke="#6f655a" stroke-width="1" stroke-dasharray="2 3"/>` : `<path d="M${pts}" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="1" transform="translate(0,-.9)"/>`}`; }).join('');
    const svg = `<g class="trav tv2"><g class="v2root">
      <ellipse class="gsh" cx="3" cy="9" rx="${RX + 8}" ry="${RY + 3}" fill="rgba(0,0,0,.55)" filter="url(#blur2)"/>
      <g class="lift"><g class="tilt">
        <ellipse cx="0" cy="8.5" rx="${RX}" ry="${RY}" fill="#150d06"/>
        <path d="M${-RX} 0 V8 A${RX} ${RY} 0 0 0 ${RX} 8 V0Z" fill="url(#woodg)"/>
        <path d="M${-RX} 8 A${RX} ${RY} 0 0 0 ${RX} 8" fill="none" stroke="#e8c47e" stroke-opacity=".5" stroke-width="1.2"/>
        <ellipse cx="0" cy="0" rx="${RX}" ry="${RY}" fill="url(#basetop)" stroke="#f0d08a" stroke-width="1.4"/>
        <ellipse cx="0" cy="0" rx="${RX - 3.2}" ry="${RY - 1.2}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="4.6"/>
        <g transform="translate(0,0)">${rim(RX - 3.2, RY - 1.2)}</g>
        <ellipse cx="0" cy="0" rx="${RX - 9}" ry="${RY - 4}" fill="rgba(0,0,0,.22)"/>
        <g class="who"><g transform="translate(0,1)">${walker('warrior', LH, 'filter:drop-shadow(0 2px 1.5px rgba(0,0,0,.55))')}</g></g>
        <circle class="hit" r="52" cy="-44" fill="transparent"/>
      </g></g></g></g>`;
    const hopLen = 76;
    return {
      svg, restOff: { x: -74, y: 12 }, walkT: 3.9,
      len(s, e) { // ziplamalar: yurunecek mesafe hopN esit ziplamaya bolunur, her zipin %72'si ucus
        if (s.phase !== 'walk') return s.len;
        const D = e.L - e.L1; hopN = Math.max(2, Math.round(D / hopLen)); const x = s.uw * hopN, i = Math.min(hopN - 1, Math.floor(x)), f = x - i, m = clamp(f / 0.7, 0, 1);
        s.hop = i; s.hf = f; s.m = m;
        return e.L1 + ((i + eio(m)) / hopN) * D;
      },
      init(o) { root = o.querySelector('.v2root'); lift = o.querySelector('.lift'); tilt = o.querySelector('.tilt'); shadow = o.querySelector('.gsh'); who = o.querySelector('.who'); wk = who.querySelector('.wk'); },
      reset() { lastHop = -1; lastLand = -1; },
      frame(s) {
        let L = 0, tl = 0;
        if (s.phase === 'walk') { L = s.m > 0 && s.m < 1 ? Math.sin(Math.PI * s.m) * 30 : 0; tl = Math.sin(Math.PI * s.m) * 4 * s.flip; if (s.hop !== lastHop && s.hf < 0.1) { lastHop = s.hop; } if (s.m >= 1 && lastLand !== s.hop) { lastLand = s.hop; land = 1; puff(env.under, s.x, s.y + 6, { n: 6, big: 1.4 }); ring(env.under, s.x, s.y + 6); } }
        else if (s.phase === 'dep') { L = Math.sin(Math.PI * (1 - s.r)) * 22; if (s.r > 0.995) L = 0; tl = Math.sin(Math.PI * (1 - s.r)) * 4; if (s.r < 0.02 && lastLand !== 'd') { lastLand = 'd'; land = 1; puff(env.under, s.x, s.y + 6, { n: 6, big: 1.4 }); ring(env.under, s.x, s.y + 6); } }
        else if (s.phase === 'arr') { L = Math.sin(Math.PI * s.r) * 22; tl = -Math.sin(Math.PI * s.r) * 4; if (s.r > 0.985 && lastLand !== 'a') { lastLand = 'a'; land = 1; puff(env.under, s.x, s.y + 6, { n: 8, big: 1.6 }); ring(env.under, s.x, s.y + 6, 1.3); } }
        else if (s.phase === 'rest0') lastLand = -1;
        if (s.phase === 'rest0') { lastLand = -1; }
        land = Math.max(0, land - s.dt * 6.5);
        const sq = Math.sin(land * Math.PI) * 0.07;
        root.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${K})`);
        shadow.setAttribute('transform', `translate(${(L * 0.8).toFixed(1)},${(L * 0.5).toFixed(1)}) scale(${(1 - L / 120).toFixed(3)})`);
        shadow.setAttribute('opacity', (0.95 - L / 55).toFixed(2));
        lift.setAttribute('transform', `translate(0,${(-L).toFixed(1)}) scale(${(1 + sq).toFixed(3)},${(1 - sq * 1.4).toFixed(3)})`);
        tilt.setAttribute('transform', `rotate(${tl.toFixed(2)})`);
        setPose(wk, L > 4 ? 'step1' : 'idle1'); setFlip(wk, s.phase === 'walk' || s.phase === 'dep' || s.phase === 'arr' ? s.flip : 1);
        who.setAttribute('transform', `translate(0,${(Math.sin(s.t * 1.7) * 0.6).toFixed(2)})`);
      },
    };
  }
  /* inen taslarin ince halkasi */
  function ring(layer, x, y, big) {
    if (RM || !layer) return;
    const e = document.createElementNS(NS, 'ellipse'); e.setAttribute('cx', x); e.setAttribute('cy', y); e.setAttribute('rx', 30); e.setAttribute('ry', 9); e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#f3e2b4'); e.setAttribute('stroke-width', '2'); e.style.cssText = 'transform-box:fill-box;transform-origin:center;pointer-events:none';
    layer.appendChild(e); const a = e.animate([{ transform: 'scale(.7)', opacity: 0.8 }, { transform: `scale(${1.9 * (big || 1)})`, opacity: 0 }], { duration: 620, easing: 'ease-out' }); a.onfinish = () => e.remove();
  }

  /* =====================================================================================================
     V3 · SAVAS KAFILESI: lider + 3 yoldas tek sira yuruyus, dinlenince kamp atesi cevresinde otururlar (yaralilar diz coker)
     ===================================================================================================== */
  function mkV3(env) {
    const K = env.K, GAP = 54;
    const HS = [72, 66, 66, 66];
    const SLOT = [{ x: -78, y: 6, f: 1, pose: 'idle1' }, { x: -44, y: -22, f: 1, pose: 'idle1' }, { x: 46, y: -22, f: -1, pose: 'kneel' }, { x: 84, y: 8, f: -1, pose: 'kneel' }];
    const F = { x: -132, y: 10 };
    let items = [], fire, order = [], lastI = [-1, -1, -1, -1];
    const flame = (cls, sc, d, dl) => `<path class="${cls}" style="animation-delay:${dl}s" transform="scale(${sc})" d="${d}"/>`;
    const fireSvg = `<g class="fire"><ellipse cx="0" cy="3" rx="92" ry="30" fill="url(#firelit)" style="mix-blend-mode:screen"/>
      <ellipse cx="0" cy="6" rx="31" ry="9" fill="rgba(0,0,0,.32)"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => { const a = (i / 9) * Math.PI * 2; return `<ellipse cx="${(Math.cos(a) * 25).toFixed(1)}" cy="${(Math.sin(a) * 7.6 + 5).toFixed(1)}" rx="5.4" ry="3.6" fill="${i % 2 ? '#6d655a' : '#857b6c'}" stroke="#2a241d" stroke-width="1"/>`; }).join('')}
      <path d="M-20 4 L18 -3 M-18 -3 L20 5" stroke="#2c1c10" stroke-width="7" stroke-linecap="round"/><path d="M-20 3 L18 -4 M-18 -4 L20 4" stroke="#6a4a2a" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <g class="flm" fill="url(#flameg)">${flame('fl a', 1, 'M0 1 C-15 -6 -12 -26 0 -44 C3 -28 15 -22 11 -8 C9 0 4 3 0 1Z', 0)}${flame('fl b', 0.7, 'M-8 1 C-17 -4 -14 -16 -8 -26 C-6 -16 2 -12 0 -4 C-1 0 -5 2 -8 1Z', 0.25)}${flame('fl c', 0.62, 'M9 1 C2 -3 4 -14 10 -24 C12 -14 20 -10 17 -3 C16 1 12 3 9 1Z', 0.5)}</g>
      <g class="flm"><path class="fl d" d="M0 0 C-7 -3 -5 -13 0 -22 C2 -13 7 -10 5 -3 C4 0 2 1 0 0Z" fill="#ffe7a0" opacity=".9"/></g>
      ${[0, 1, 2, 3, 4].map((i) => `<circle class="spk" style="animation-delay:${i * 0.55}s" cx="${(i - 2) * 5}" cy="-18" r="1.5" fill="#ffc46a"/>`).join('')}
      <path class="smoke" d="M2 -50 C-8 -62 10 -70 0 -86 C-8 -98 8 -104 2 -118" fill="none" stroke="rgba(214,208,196,.28)" stroke-width="5" stroke-linecap="round"/></g>`;
    const mem = PARTY.map((h, i) => `<g class="mb" data-i="${i}"><ellipse class="msh" cx="0" cy="1.5" rx="${HS[i] * 0.3}" ry="${HS[i] * 0.07}" fill="rgba(0,0,0,.45)"/><g class="mw">${walker(h.id, HS[i], `filter:drop-shadow(0 2px 1.5px rgba(0,0,0,.5))${h.fallen ? ' grayscale(.92) brightness(.78)' : ''}`)}</g>
      <g class="badge" transform="translate(0,${-HS[i] - 15})">${h.fallen ? `<circle r="8.6" fill="#16100c" stroke="#b8402f" stroke-width="1.4"/><g transform="scale(.95) translate(0,-1)">${SKULL}</g>` : h.hp < 0.6 ? `<path d="M0 -7 L6 0 L0 7 L-6 0Z" fill="${AMBER}" stroke="#120b06" stroke-width="1.6"/><path d="M0 -3.4 L2.2 0 L0 3.4 L-2.2 0Z" fill="rgba(255,255,255,.4)"/>` : ''}</g></g>`).join('');
    const svg = `<g class="trav tv3"><g class="v3root">${fireSvg}${mem}<circle class="hit" cx="-30" cy="-40" r="70" fill="transparent"/></g></g>`;
    return {
      svg, restOff: F,
      init(o) {
        const r = o.querySelector('.v3root'); fire = r.querySelector('.fire');
        items = [...r.querySelectorAll('.mb')].map((g, i) => ({ g, wk: g.querySelector('.wk'), badge: g.querySelector('.badge'), msh: g.querySelector('.msh') }));
        order = [];
      },
      reset() { lastI = [-1, -1, -1, -1]; },
      frame(s) {
        const walking = s.speed > 8, spread = (1 - s.r) * sm(clamp(s.speed / 40, 0, 1));
        const nx = s.nx + s.off.x, ny = s.ny + s.off.y;
        const ys = [];
        items.forEach((it, i) => {
          const pp = env.ptAt(s.len - GAP * K * i * spread), jt = (i % 2 ? 1 : -1) * 13 * K * spread;
          const wx = pp.x - Math.sin(pp.ang) * jt, wy = pp.y + Math.cos(pp.ang) * jt;
          const sl = SLOT[i], sx = nx + sl.x * K, sy = ny + sl.y * K;
          const x = lerp(wx, sx, s.r), y = lerp(wy, sy, s.r);
          const cs = Math.cos(pp.ang), fl = s.r > 0.5 ? sl.f : cs > 0 ? 1 : cs < 0 ? -1 : 1;
          const moving = walking && s.r < 0.97;
          let g;
          if (moving) g = gait(s.moved / STRIDE + i * 0.37); else g = { pose: sl.pose, i: -1, bob: Math.sin(s.t * 1.6 + i * 1.3) * 0.7 };
          if (i === 3 && moving) g.bob *= 0.4;
          setPose(it.wk, g.pose); setFlip(it.wk, fl);
          it.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${K})`);
          it.wk.parentNode.setAttribute('transform', `translate(0,${g.bob.toFixed(1)})`);
          it.badge.setAttribute('transform', `translate(0,${(-(it.wk.dataset.h * (g.pose === 'kneel' ? 0.62 : 1)) - 15 + g.bob).toFixed(1)})`);
          if (moving && g.i !== lastI[i] && (g.i === 0 || g.i === 2) && i < 3) puff(env.under, x - fl * 9 * K, y + 1, { n: 3, big: 0.85 });
          lastI[i] = g.i;
          it.y = y; it.x = x;
          if (i === 0) { s.x = x; s.y = y; }
        });
        const fa = clamp((s.r - 0.35) / 0.65, 0, 1);
        fire.setAttribute('transform', `translate(${nx.toFixed(1)},${ny.toFixed(1)}) scale(${(K * (0.4 + 0.6 * fa)).toFixed(3)})`);
        fire.style.opacity = fa.toFixed(2);
        // derinlik sirasi: ates + uyeler y'ye gore
        const els = items.map((it) => ({ el: it.g, y: it.y })); els.push({ el: fire, y: ny + 2 });
        els.sort((a, b) => a.y - b.y);
        const key = els.map((e) => items.findIndex((it) => it.g === e.el)).join(',');
        if (key !== order.join(',')) { order = key.split(',').map(Number); els.forEach((e) => fire.parentNode.appendChild(e.el)); const hit = fire.parentNode.querySelector('.hit'); fire.parentNode.appendChild(hit); }
        const hit = fire.parentNode.querySelector('.hit'); hit.setAttribute('cx', (items[0].x + 20).toFixed(1)); hit.setAttribute('cy', (items[0].y - 40).toFixed(1));
      },
    };
  }

  /* =====================================================================================================
     V4 · AMBLEM SANCAGI: dort sinif armali (4'e bolunmus) sancak; yolda yalpalayarak yurur, arkasinda ayak izleri belirir; dinlenirken tasin icine dikilir
     ===================================================================================================== */
  function mkV4(env) {
    const K = env.K, id = ++UID2, CW = 56, CHT = 70, BARY = -128, POLE = 0;
    let root, bearer, cloth, shade, shine, clipP, lastHalf = -1, side = 1, prints, base;
    const cls = ['warrior', 'archer', 'druid', 'mage'];
    const q = [[-7.6, -7.2], [7.6, -7.2], [-7.6, 7.6], [7.6, 7.6]];
    const shield = 'M-15 -17 H15 V4 Q15 17 0 25 Q-15 17 -15 4Z';
    const crest = `<g class="crestg" transform="translate(0,${CHT * 0.42})"><clipPath id="v4sh${id}"><path d="${shield}"/></clipPath>
      <path d="${shield}" fill="#140c07" transform="translate(1.5,2)" opacity=".5"/>
      <g clip-path="url(#v4sh${id})"><rect x="-16" y="-18" width="32" height="44" fill="#1a110a"/>
      ${PARTY.map((h, i) => { const [qx, qy] = q[i]; return `<g transform="translate(${qx},${qy})"><image href="${MK.cls(h.id)}" x="-8.5" y="-8.5" width="17" height="17" style="${h.fallen ? 'filter:grayscale(1) brightness(.5)' : ''}"/>${h.fallen ? '<rect x="-9" y="-9" width="18" height="18" fill="rgba(10,8,6,.45)"/><path d="M-6 -7 L-1 -1 L-4 3 L2 8" fill="none" stroke="#c9b99a" stroke-width="1"/>' : h.hp < 0.6 ? '<rect x="-9" y="-9" width="18" height="18" fill="rgba(217,164,65,.28)"/>' : ''}</g>`; }).join('')}
      <path d="M0 -17 V26 M-16 0 H16" stroke="#e8c47e" stroke-width="1.6"/></g>
      <path d="${shield}" fill="none" stroke="#e8c47e" stroke-width="2" stroke-linejoin="round"/>
      ${PARTY.map((h, i) => `<circle cx="${(i - 1.5) * 9}" cy="31" r="2.6" fill="${h.fallen ? '#1a1512' : hpCol(h)}" stroke="${h.fallen ? '#8a8078' : '#120b06'}" stroke-width="1"/>`).join('')}</g>`;
    const svg = `<g class="trav tv4"><g class="v4root">
      <ellipse cx="0" cy="3" rx="22" ry="6" fill="rgba(0,0,0,.45)"/>
      <g class="bearer">
        <g class="cairn"><ellipse cx="-12" cy="2" rx="9" ry="4.4" fill="#6c6458" stroke="#241f19" stroke-width="1"/><ellipse cx="11" cy="3" rx="10" ry="4.6" fill="#7a7266" stroke="#241f19" stroke-width="1"/><ellipse cx="1" cy="-1" rx="9" ry="4.4" fill="#8a8173" stroke="#241f19" stroke-width="1"/><ellipse cx="-3" cy="-3.6" rx="3.6" ry="1.6" fill="rgba(255,255,255,.18)"/></g>
        <path d="M0 0 V-150" stroke="#1d1209" stroke-width="5.2" stroke-linecap="round"/><path d="M-1.3 -4 V-148" stroke="#8a6a3a" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>
        <path d="M0 -150 l-7 4 l7 -26 l7 26Z" fill="#e8c47e" stroke="#6b4a14" stroke-width="1.1" stroke-linejoin="round"/><circle cy="-148" r="3.4" fill="#f3d999" stroke="#6b4a14"/>
        <path d="M-34 ${BARY} H34" stroke="#1d1209" stroke-width="4.4" stroke-linecap="round"/><path d="M-34 ${BARY - 1.2} H34" stroke="#8a6a3a" stroke-width="1.2" opacity=".75"/>
        <circle cx="-35" cy="${BARY}" r="3.8" fill="#e8c47e" stroke="#6b4a14"/><circle cx="35" cy="${BARY}" r="3.8" fill="#e8c47e" stroke="#6b4a14"/>
        <path d="M-27 ${BARY + 2} v3 M27 ${BARY + 2} v3" stroke="#e8c47e" stroke-width="1.2"/>
        <g class="clothg" transform="translate(0,${BARY + 3})"><clipPath id="v4cl${id}"><path class="cp" d=""/></clipPath>
          <path class="cl" d="" fill="url(#clothg)"/><g clip-path="url(#v4cl${id})"><rect class="shine" x="-60" y="-4" width="12" height="${CHT + 20}" fill="#ffe2b0" opacity=".14" transform="skewX(-12)"/><rect class="shd" x="-${CW / 2}" y="-4" width="${CW}" height="${CHT + 20}" fill="url(#foldg)"/></g>
          <path class="hm" d="" fill="none" stroke="#e8c47e" stroke-width="2" stroke-linejoin="round"/>${crest}</g>
      </g><circle class="hit" r="50" cy="-70" fill="transparent"/></g></g>`;
    const under = `<g id="v4prints-${id}" class="v4prints"></g>`;
    const sway = (y, t, a) => Math.sin(t * 2.4 + y * 0.055) * a * Math.pow(y / CHT, 1.15);
    function print(x, y, ang, op, delay) {
      const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + ((ang * 180) / Math.PI + 90).toFixed(0) + ') scale(' + (1.4 * K).toFixed(2) + ')');
      g.innerHTML = '<g class="pi" style="transform-box:fill-box;transform-origin:center"><path d="M0 -6.4 C3.6 -6.4 4.6 -3 3.4 .6 C2.6 3 1.6 3.8 0 3.8 C-1.6 3.8 -2.8 2.6 -3 0 C-3.4 -3.6 -2.8 -6.4 0 -6.4Z" fill="#2a190c" stroke="rgba(246,232,196,.55)" stroke-width="1.3"/><path d="M-1.9 5.4 C-1.4 4.4 1.4 4.4 1.9 5.4 L1.7 7.6 C.8 8.4 -.8 8.4 -1.7 7.6Z" fill="#2a190c" stroke="rgba(246,232,196,.5)" stroke-width="1.1"/></g>';
      prints.appendChild(g);
      const pi = g.firstChild;
      if (!RM) pi.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: op, transform: 'scale(1)', offset: 0.12 }, { opacity: op * 0.4 }], { duration: 5200, fill: 'forwards', delay: delay || 0 }); else pi.setAttribute('opacity', op * 0.5);
    }
    return {
      svg, under, restOff: { x: -62, y: 12 },
      init(o, u) {
        root = o.querySelector('.v4root'); bearer = o.querySelector('.bearer'); cloth = o.querySelector('.cl'); clipP = o.querySelector('.cp'); shine = o.querySelector('.shine'); shade = o.querySelector('.shd');
        this.hm = o.querySelector('.hm'); prints = u.querySelector(`#v4prints-${id}`);
        // onceki ayakta (6A -> Grave) zaten yurunmus iz: soluk
        for (let l = 18, k = 0; l < env.L1 - 26; l += 27, k++) { const p = env.ptAt(l); print(p.x - Math.sin(p.ang) * (k % 2 ? 5 : -5), p.y + Math.cos(p.ang) * (k % 2 ? 5 : -5), p.ang, 0.4, 0); }
      },
      reset() { [...prints.children].forEach((c) => { if (c.dataset.new) c.remove(); }); lastHalf = -1; },
      frame(s) {
        const walking = s.speed > 8, ph = s.moved / STRIDE, half = Math.floor(ph * 2);
        const amp = walking ? 5.4 : lerp(5, 2.6, s.r);
        const bob = walking ? -Math.abs(Math.sin(ph * Math.PI * 2)) * 4.2 : 0, tilt = walking ? Math.sin(ph * Math.PI * 2) * 2.6 + 2.2 * s.flip : Math.sin(s.t * 0.9) * 0.5;
        root.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${K})`);
        bearer.setAttribute('transform', `translate(0,${bob.toFixed(1)}) rotate(${tilt.toFixed(2)})`);
        const cairn = bearer.querySelector('.cairn'); cairn.style.opacity = (s.r).toFixed(2);
        // bez: satir satir yan sallanma
        const rows = []; for (let y = 0; y <= CHT; y += 5) rows.push(y);
        const t = s.t * (walking ? 1.5 : 1), a = amp * (walking ? 0.85 : 0.6);
        const L = rows.map((y) => [-CW / 2 + sway(y, t, a) - (walking ? s.flip * y * 0.05 : 0), y]), R = rows.map((y) => [CW / 2 + sway(y, t, a) - (walking ? s.flip * y * 0.05 : 0), y]);
        const bx = (arr) => arr[arr.length - 1][0];
        const bl = bx(L), br = bx(R), by = CHT;
        const d = 'M' + L.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ` L${(bl + CW * 0.25).toFixed(1)} ${by - 14} L${((bl + br) / 2).toFixed(1)} ${by + 5} L${(br - CW * 0.25).toFixed(1)} ${by - 14} L` + R.slice().reverse().map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + 'Z';
        cloth.setAttribute('d', d); clipP.setAttribute('d', d); this.hm.setAttribute('d', d);
        shine.setAttribute('x', (-44 + ((s.t * 18) % 110)).toFixed(1));
        const crestG = bearer.querySelector('.crestg'); const cy = CHT * 0.42; crestG.setAttribute('transform', `translate(${sway(cy, t, a).toFixed(1)},${cy}) rotate(${(Math.sin(t * 2.4 + cy * 0.055) * 2.4).toFixed(1)})`);
        if (walking && half !== lastHalf) {
          if (lastHalf !== -1) { side = -side; const b = s.base; const ox = -Math.sin(b.ang) * 6.5 * K * side, oy = Math.cos(b.ang) * 6.5 * K * side; print(s.x + ox, s.y + oy + 2, b.ang, 0.78, 0); prints.lastChild.dataset.new = 1; if (!RM) puff(env.under, s.x, s.y + 2, { n: 2, big: 0.7 }); }
          lastHalf = half;
        }
      },
    };
  }

  /* =====================================================================================================
     V5 · SEYAHAT MURECCEBI: yolculuk eski bir harita notu gibi cizilir; kalemle cizilen (titreyen) murekkep cizgi, murekkepli figur, mum muhurler, el yazisi not
     ===================================================================================================== */
  function mkV5(env) {
    const K = env.K, LH = 86, id = ++UID2, d2 = ROUTE.d2, p = env.p;
    let root, wk, who, seals, line, halo, ring, noteClip, flourish, lastI = -1, dots, noteG, lineLen = 0;
    const seal = (h, i) => `<g class="sl" transform="translate(${((i - 1.5) * 22).toFixed(1)},${(-LH - 22 + (i === 0 || i === 3 ? 4 : 0)).toFixed(1)})"><circle r="10.5" fill="${h.fallen ? '#4e4740' : h.hp > 0.6 ? '#8f2f1f' : '#a2701f'}" stroke="rgba(246,232,196,.8)" stroke-width="1.4"/>
      <circle r="7.4" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1"/><image href="${MK.cls(h.id)}" x="-6.4" y="-6.4" width="12.8" height="12.8" style="filter:brightness(.38) sepia(.6) contrast(1.3);opacity:.9"/>${h.fallen ? '<path d="M-7 -3 L-1 -.5 L-4 3 L1 8" fill="none" stroke="rgba(246,232,196,.85)" stroke-width="1.2"/>' : ''}</g>`;
    const svg = `<g class="trav tv5"><g class="v5root">
      <ellipse cx="0" cy="2" rx="26" ry="5" fill="rgba(20,10,2,.35)"/><path d="M-22 3 h44 M-18 0 h36 M-14 5 h28" stroke="rgba(20,10,2,.32)" stroke-width="1" stroke-linecap="round"/>
      <g class="who">${walker('warrior', LH)}</g><g class="seals">${PARTY.map(seal).join('')}</g><circle class="hit" r="54" cy="-52" fill="transparent"/></g></g>`;
    const ringD = (() => { const R = 49, pts = []; for (let i = 0; i <= 30; i++) { const a = -2.2 + (i / 30) * (Math.PI * 2 + 0.7), rr = R + Math.sin(i * 1.3) * 1.6 + i * 0.12; pts.push([p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.97]); } return 'M' + pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L'); })();
    const nx = p.x + 62, ny = p.y + 2;
    const under = `<g class="v5ink" id="v5ink-${id}"><g filter="url(#inkw)">
        <path class="halo" d="${d2}" pathLength="1" fill="none" stroke="rgba(244,230,196,.62)" stroke-width="10.5" stroke-linecap="round" stroke-dasharray="0 1"/>
        <path class="line" d="${d2}" pathLength="1" fill="none" stroke="#2a190b" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="0 1"/>
        <path class="ring" d="${ringD}" pathLength="1" fill="none" stroke="#2a190b" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0 1"/>
        <g class="dots"></g></g>
        <path d="M${ROUTE.g.x - 7} ${ROUTE.g.y - 7} l14 14 m0 -14 l-14 14" stroke="#2a190b" stroke-width="3" stroke-linecap="round" opacity=".0" class="xmark"/>
        <clipPath id="v5nc${id}"><rect class="ncr" x="${nx - 6}" y="${ny - 36}" width="0" height="80"/></clipPath>
        <g class="note" clip-path="url(#v5nc${id})"><text x="${nx}" y="${ny}" style="font:italic 400 25px 'EB Garamond',Georgia,serif" fill="#2a190b" stroke="rgba(244,230,196,.9)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">Camp made at the pilgrim road,</text>
          <text x="${nx}" y="${ny + 25}" style="font:italic 400 22px 'EB Garamond',Georgia,serif" fill="#3b2412" stroke="rgba(244,230,196,.9)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">three fit, one fallen.</text>
          <path class="flo" d="M${nx} ${ny + 38} q40 -8 80 -1 t80 -2" fill="none" stroke="#2a190b" stroke-width="2.2" stroke-linecap="round" filter="url(#inkw)"/></g></g>`;
    return {
      svg, under, restOff: { x: -76, y: 6 },
      init(o, u) {
        root = o.querySelector('.v5root'); who = o.querySelector('.who'); wk = who.querySelector('.wk'); seals = o.querySelector('.seals');
        const g = u.querySelector(`#v5ink-${id}`); line = g.querySelector('.line'); halo = g.querySelector('.halo'); ring = g.querySelector('.ring'); dots = g.querySelector('.dots');
        noteClip = g.querySelector('.ncr'); this.xm = g.querySelector('.xmark'); this.note = g.querySelector('.note');
      },
      reset() { dots.innerHTML = ''; lastI = -1; },
      frame(s) {
        const walking = s.speed > 8;
        root.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${(s.flip * K).toFixed(3)},${K})`);
        seals.setAttribute('transform', `scale(${s.flip},1)`);
        const g = walking ? gait(s.moved / STRIDE) : { pose: 'idle1', i: -1, bob: Math.sin(s.t * 1.8) * 0.8 };
        setPose(wk, g.pose); setFlip(wk, 1); who.setAttribute('transform', `translate(0,${g.bob.toFixed(1)})`);
        // murekkep cizgisi: yurunen mesafe kadar cizilir (yolun ilerisinde kalem gibi 14 px onde)
        const prog = s.phase === 'rest0' || s.phase === 'dep' ? 0 : clamp(((s.len - env.L1) + 16 * (s.phase === 'walk' ? 1 : 0)) / (env.L - env.L1), 0, 1);
        const pr = s.phase === 'arr' || s.phase === 'rest1' ? 1 : prog;
        const da = `${pr.toFixed(4)} 1`; line.setAttribute('stroke-dasharray', da); halo.setAttribute('stroke-dasharray', da);
        this.xm.setAttribute('opacity', pr > 0.01 ? (0.85).toFixed(2) : 0.0);
        const rr = clamp((s.r - 0.45) / 0.55, 0, 1) * (s.phase === 'rest0' || s.phase === 'dep' ? 0 : 1);
        ring.setAttribute('stroke-dasharray', `${rr.toFixed(3)} 1`);
        noteClip.setAttribute('width', (rr * 330).toFixed(1));
        if (walking && g.i !== lastI && (g.i === 0 || g.i === 2)) {
          puff(env.under, s.x - s.flip * 10 * K, s.y + 1, { n: 2, big: 0.7, col: 'rgba(60,36,14,.45)' });
          const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', (s.x + (Math.random() - 0.5) * 14).toFixed(1)); c.setAttribute('cy', (s.y + 4 + Math.random() * 3).toFixed(1)); c.setAttribute('r', (1.2 + Math.random() * 1.6).toFixed(1)); c.setAttribute('fill', '#2a190b'); c.setAttribute('opacity', '.7'); dots.appendChild(c);
        }
        lastI = g.i;
      },
    };
  }

  /* =====================================================================================================
     CURRENT: oyundaki hal (lider 96 px + soluk siluetler), degismeden
     ===================================================================================================== */
  const shadowE = (rx) => `<ellipse cx="0" cy="1" rx="${rx}" ry="${rx * 0.22}" fill="rgba(0,0,0,.45)"/>`;
  const sprImg = (id, h, x, y, cls, flt) => `<image class="${cls || ''}" href="${MK.spr(id)}" x="${x - ((h * 299) / 388) / 2}" y="${y - h}" width="${(h * 299) / 388}" height="${h}" style="${flt || ''}"/>`;
  function figCur(walk) {
    const oy = walk ? 12 : -4, ox = walk ? 34 : 0;
    let h = '';
    for (let i = PARTY.length - 1; i >= 0; i--) {
      const p = PARTY[i], x = ox - 34 - i * 28;
      h += i === 0 ? sprImg(p.id, 96, x, oy, 'tr-lead', 'filter:drop-shadow(0 4px 3px rgba(0,0,0,.6))') : sprImg(p.id, 96 * 0.85, x, oy, '', 'filter:brightness(.16) sepia(.6);opacity:.55');
    }
    return h;
  }
  function mkCur(env) {
    const K = env.K; let a, b;
    return {
      svg: `<g class="trav tv-cur"><g class="cu"><g class="ca">${figCur(true)}</g><g class="cb">${figCur(false)}</g><circle class="hit" cx="-34" cy="-40" r="56" fill="transparent"/></g></g>`,
      restOff: { x: 0, y: 0 },
      init(o) { a = o.querySelector('.ca'); b = o.querySelector('.cb'); this.cu = o.querySelector('.cu'); },
      frame(s) { this.cu.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${K})`); const rest = s.r > 0.5; a.style.display = rest ? 'none' : ''; b.style.display = rest ? '' : 'none'; },
    };
  }
  const CTORS = { cur: mkCur, v1: mkV1, v2: mkV2, v3: mkV3, v4: mkV4, v5: mkV5 };

  function setWalk(w) { // yururken: hedef (Pilgrim Road) henuz "gidilebilir", cikis (Grave Field) gecilmis
    ST.pilgrim = w ? 'reach' : 'current';
    ST['8A'] = ST['8C'] = w ? 'near' : 'reach';
  }
  /* ---- ana cizim ---- */
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
    NODES.find((q) => q.id === 'pilgrim').above = !!o.walk; // yururken hedef adi yukarida: yolcu adin ustune binmez
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
      if (o.walk && n.id === 'pilgrim') body += `<circle class="curglow" r="${gR + 14}" fill="url(#goldg)" style="opacity:0"/>`;
      if (small) {
        body += `<g class="body"><circle r="14" fill="${DISC}" stroke="rgba(217,178,106,.55)" stroke-width="2"/>${img(n.type === 'boss' ? 'boss' : n.type, 20)}</g>`;
        body = `<g transform="scale(${K})">${body}</g>`;
      } else {
        body += `<g transform="scale(${S})"><g class="body">${frame(n.type, calm)}</g></g>`;
        if (o.walk && n.id === 'pilgrim') body += `<circle class="curring" r="${BASE[k] * S * 1.25}" fill="none" stroke="#f3d999" stroke-width="3" stroke-opacity=".85" style="opacity:0"/>`;
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
    h += `<g id="travUnder" pointer-events="none"></g><g id="nodes">${nodes}</g><g id="travOver"></g><g id="labels" pointer-events="none">${labels}</g><g id="travTip"></g>`;
    return h;
  }

  /* ---- ortak HUD parcalari ---- */
  const navs = MK.navBtn('back', 'Back') + MK.navBtn('fs', 'Fullscreen') + MK.navBtn('menu', 'Menu');
  const brazier = (o) => `<img class="cm-brazier" src="${MK.brazier('brazier-2')}" alt="" style="${o || ''}">`;
  const gearBtns = (style) => `<div class="mh-ibtn" style="left:24px;bottom:34px;${style || ''}"><img src="${MK.ui('gear')}" alt=""></div><div class="mh-ibtn" style="left:102px;bottom:34px;${style || ''}"><img src="${MK.ui('formation')}" alt=""></div>`;
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

  const frames = []; window.__tvFrames = frames;
  let UID = 0;
  let LASTU = 0; const UNIQRE = /(id="|url\(#)(discg|emberg|bossg|goldg|flameg|fogg|clothg|woodg|basetop|foldg|firelit|blur2|inkw|mtclip\w|mtp\d\w)/g;
  const uniq = (h) => { const u = ++UID; LASTU = u; return h.replace(UNIQRE, `$1$2-${u}`); };
  const uniqOld = (h) => { const u = ++UID; return h.replace(/(id="|url\(#)(discg|emberg|bossg|goldg|flameg|fogg|clothg|woodg|basetop|foldg|firelit|blur2|inkw|mtclip\w|mtp\d\w)/g, `$1$2-${u}`); }; // her svg kendi gradient / kirpma kimligi (gizli bolumde ayni kimlik bozar)
  function build(fn, cap, ex) {
    return (host) => {
      const f = MK.addFrame(host, {
        cap, dim: false, state: { sel: null },
        render: (ui, fr) => {
          if (fr.stop) fr.stop();
          setWalk(!!ex.walk);
          ui.innerHTML = `<div class="mk-stage mh-stage cm-stage">${uniq(fn({ phone: MK.S.phone, sel: null, variant: ex.variant, walk: !!ex.walk }))}</div>${navs}${ex.walk ? '<button class="mt-play" type="button">Replay walk</button>' : ''}`;
          wire(ui, fr);
          const fz = ex.walk ? (MK.S.extra.t != null ? +MK.S.extra.t : ex.freeze != null ? ex.freeze : null) : null;
          startRunner(ui, fr, CTORS[ex.variant], { walk: !!ex.walk, freeze: fz, u: LASTU });
          const btn = ui.querySelector('.mt-play'); if (btn) btn.addEventListener('click', () => fr.replay());
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
  const ready = (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 15px Cinzel'), document.fonts.load("15px 'EB Garamond'"), document.fonts.load("italic 15px 'EB Garamond'")]).catch(() => 0) : Promise.resolve()).then(() => measurePoses());
  ready.then(() => {
    let lastPhone = MK.S.phone;
    MK.onApply = (S) => {
      if (S.phone !== lastPhone) { lastPhone = S.phone; frames.forEach((f) => f.redraw()); }
    };
    const two = (variant, extra) => (host) => {
      build(page('v2'), 'At the node (resting)', { variant, walk: false })(host);
      build(page('v2'), 'Walking the footpath (loops; Replay walk restarts)', Object.assign({ variant, walk: true }, extra || {}))(host);
    };
    MK.mount({
      title: 'Campaign map, who travels (v2)',
      sections: [
        { id: 'cur', tab: 'Current', h: 'Şimdiki hal (oyundaki gibi): lider + soluk siluetler', note: 'Lider 96 px, diğer üçü koyu yarı saydam siluet; boy düğümü ve adı örtüyor. Yeni seçeneklerle karşılaştırmak için aynen duruyor.', build: two('cur', { freeze: 0.62 }) },
        { id: 'v1', tab: 'V1 Banner hero', h: 'V1 · Sancaktar kahraman: gerçek yürüyüş pozları + rüzgârda dalgalanan parti sancağı', note: 'Lider savaştaki gerçek adım pozlarıyla yürür (ayak yere basınca toz kalkar), omzunda uzun direkte kırmızı-altın parti sancağı dalgalanır. Sancağın altında 4 küçük cam: yeşil sağlam, sarı yaralı, çarpılı gri düşmüş. Düğümde sancak yere dikilir, bez sarkar, lider dinlenir. Üstüne gelince / dokununca parti kartı açılır.', build: two('v1') },
        { id: 'v2', tab: 'V2 Tabletop', h: 'V2 · Masa minyatürü: yuvarlak tabanda boyalı figür, düğümden düğüme zıplar', note: 'Ahşap tabanlı, altın çerçeveli minyatür. Yürümez, kaldırılıp yola konur: havada gölgesi ayrılır, her inişte ezilir, toz halkası çıkar. Taban kenarındaki 4 renkli yay = parti sağlığı (yeşil / sarı / düşmüş gri kesik çizgi).', build: two('v2') },
        { id: 'v3', tab: 'V3 War-band', h: 'V3 · Savaş kafilesi: 4 kişi tek sıra yürür, dinlenince kamp ateşinin başına oturur', note: 'Dört kahraman da gerçek pozlarıyla tek sıra yolda yürür; durunca toplanıp kamp ateşi yakarlar. Yaralı büyücü ve düşmüş druid diz çöker; yürürken yaralıda sarı elmas, düşmüşte kafatası işareti görünür. Ateş ışığı yere vurur, kıvılcım ve duman çıkar.', build: two('v3') },
        { id: 'v4', tab: 'V4 Standard', h: 'V4 · Arma sancağı: dört sınıf armalı bayrak, arkasında ayak izleri belirir', note: 'Dörde bölünmüş armada dört kahramanın sınıf simgesi (düşmüş olan çatlak ve gri, yaralı olan sarımsı). Sancak yolda yalpalayarak ilerler, arkasında çamurlu bot izleri sırayla belirir; düğümde taş yığınının içine dikilir. Daha önce yürünen yolda soluk izler kalır.', build: two('v4') },
        { id: 'v5', tab: 'V5 Travel ink', h: 'V5 · Seyahat mürekkebi: eski harita notu gibi çizilen yolculuk', note: 'Yol, yürüdükçe titrek kalem çizgisiyle çizilir; figür mürekkep ve sepya tonlarında, ayağından mürekkep damlaları düşer. Varınca düğüm elle çizilmiş halkayla kuşatılır ve harita kenarına el yazısı not düşer (“three fit, one fallen”). Başının üstündeki 4 mum mühür = parti.', build: two('v5') },
      ],
    });
  });
})();
