/* Town UI mockup mantigi (oyun kodu DEGIL).
   Hash: #now #a #b #c  &view=card|town  &n=town|battle (kart gorunumu)  &t=ashford|valdren (kasaba gorunumu)  &sub=inn|barracks|trade (kasaba ici ekran)
         &z=169|219|ph  &clean (cubugu gizler)
   Ornek: #a&view=card&z=ph   #b&view=town&sub=inn&t=valdren&clean */
(() => {
  const P = 'town-ui/';
  const root = document.documentElement;
  const bar = document.getElementById('mk-bar');
  const note = document.getElementById('mk-note');
  const view = document.getElementById('mk-view');
  const stage = document.getElementById('mk-stage');

  /* ---------------- hash ---------------- */
  const parts = location.hash.slice(1).split('&');
  const q = new Map();
  parts.slice(1).forEach((p) => { const [k, v] = p.split('='); if (k) q.set(k, v === undefined ? '1' : v); });
  const SIZES = { '169': { w: 1920, h: 1080, label: '16:9', gu: 1 }, '219': { w: 2580, h: 1080, label: '21:9', gu: 1 }, ph: { w: 844, h: 390, label: 'Phone', gu: Math.min(844 / 2337, 390 / 1080) } };
  const S = {
    v: ['now', 'a', 'b', 'c'].includes(parts[0]) ? parts[0] : 'a',
    view: q.get('view') === 'town' ? 'town' : 'card',
    n: q.get('n') === 'battle' ? 'battle' : 'town',
    t: q.get('t') === 'valdren' ? 'valdren' : 'ashford',
    sub: ['inn', 'barracks', 'trade'].includes(q.get('sub')) ? q.get('sub') : 'town',
    z: SIZES[q.get('z')] ? q.get('z') : (innerWidth < 900 ? 'ph' : '169'),
    clean: q.has('clean'),
  };
  if (S.clean) root.classList.add('clean');
  root.classList.add('clean-' + (S.clean ? 'on' : 'off'));

  /* ---------------- metinler (hepsi oyun verisinden; docs/design ve data/campaign) ---------------- */
  const T = {
    ashSub: 'Town · Inn, Recruits, Trade',
    valSub: 'City · Inn, Smith, Recruits, Trade',
    ashLore: 'A quiet village of thatch and smoke, the last safe hearth before the road turns north toward the ash.',
    valLore: "Valdren Keep still flies the king's banner, though its soldiers stopped waiting for his return long ago.",
    townRest: 'Towns do not heal you. Leave tired heroes at the inn: each day they recover half their health and one wound. A day passes for every two battles you win. Pick them up in the same town. The fallen stay down: only Valor can raise them.',
    first: 'Choose a companion.',
    ravLore: 'Wolves and poachers rule the shadowed Ravenwood, where ravens watch every traveller who strays from the path.',
    recruit: 'Fighters at the barracks offer their swords. Choose one companion, or come back before you leave.',
    notice: 'Notices of burned farms and missing travellers. No one here seeks to join a company. Recruits gather in the cities.',
    waiting: 'A recruit waits at the Barracks',
    innRule: "Leave a hero here and they leave your company. Each day they recover 50% health and 1 wound, and earn no experience. Only this town's inn can give them back.",
    innFoot: 'A day passes for every 2 battles you win.',
    odoName: 'Odo the Peddler',
    odoIdle: 'Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.',
  };
  const TOWNS = {
    ashford: { name: 'Ashford Village', sub: T.ashSub, lore: T.ashLore, bg: 'town-ashford', focusY: 0.58, cap: 2, svc: ['Inn', 'Recruits', 'Trade'], spots: [
      { id: 'stall', act: 'trade', label: "Odo's Stall", rect: [0, 0.3, 0.262, 0.62] },
      { id: 'burner', act: 'story', label: 'Charcoal Burner', rect: [0.29, 0.47, 0.385, 0.63] },
      { id: 'inn', act: 'inn', label: 'Inn', arch: true, rect: [0.705, 0.37, 0.772, 0.545] },
      { id: 'board', act: 'barracks', label: 'Notice Board', rect: [0.585, 0.405, 0.67, 0.58], onlyTab: true },
      { id: 'road', act: 'leave', label: 'Road Out', rect: [0.9, 0.34, 1, 0.6] },
    ] },
    valdren: { name: 'Valdren Keep', sub: T.valSub, lore: T.valLore, bg: 'town-valdren', focusY: 0.3, cap: 3, svc: ['Inn', 'Smith', 'Recruits', 'Trade'], recruitWaiting: true, spots: [
      { id: 'stall', act: 'trade', label: "Odo's Stall", rect: [0.88, 0.44, 1, 0.68] },
      { id: 'commander', act: 'story', label: 'Keep Commander', rect: [0.25, 0.29, 0.385, 0.64] },
      { id: 'inn', act: 'inn', label: 'Inn', rect: [0.505, 0.21, 0.75, 0.64] },
      { id: 'barracks', act: 'barracks', label: 'Barracks', rect: [0.385, 0.37, 0.505, 0.57] },
      { id: 'gate', act: 'leave', label: 'Castle Gate', rect: [0.78, 0.32, 0.88, 0.6] },
    ] },
  };
  const TOWN_VERB = { trade: 'trade', barracks: 'recruit', inn: 'rest' }; // CampaignMapScene.ts > TOWN_VERB
  const SPOT_ICON = { trade: 'merchant', inn: 'inn', story: 'event', barracks: 'battle' }; // taslak: mevcut dugum ikonlari
  const SVC_ICON = { Inn: 'inn', Smith: 'rest', Recruits: 'battle', Trade: 'merchant' };
  const SVC_VERB = { Inn: 'rest', Smith: 'forge your gear', Recruits: 'recruit', Trade: 'trade' };
  const CLS = {
    warrior: { name: 'Warrior', role: 'Melee Bruiser', stat: 'STR', blurb: "Frontline bruiser who turns pain into Rage and hits hardest at death's door.", color: '#c8553d' },
    paladin: { name: 'Paladin', role: 'Holy Healer', stat: 'INT', blurb: 'Holy knight who mends the most wounded each turn and raises the fallen.', color: '#e6c14a' },
    hexer: { name: 'Hexer', role: 'Curse Caster', stat: 'LUCK', blurb: 'Curse caster who piles Omens on foes and passes them on when a victim falls.', color: '#6a2f5f' },
    druid: { name: 'Druid', role: 'Nature Summoner', stat: 'INT', blurb: 'Nature summoner who calls treants to the field, mends allies and roots whoever fells one.', color: '#5a8f29' },
  };
  /* ORNEK durum (kayit degil): Warrior yolda, Paladin Inn'de dinleniyor. Altin ve fiyatlar yer tutucu. */
  const EX = {
    road: [{ cls: 'warrior', lv: 4, hp: 0.62, wounds: 1 }],
    inn: [{ cls: 'paladin', lv: 4, hp: 0.4, wounds: 1, days: 2 }],
    gold: 120,
  };
  const WARES = [
    { id: 'iron_buckler', name: 'Iron Buckler', rc: '#8a8a84', main: ['Block', '15%'], il: 2, aff: ['+2 Armor'], price: 18 },
    { id: 'leather_coif', name: 'Leather Coif', rc: '#8a8a84', il: 2, aff: ['+2 Max HP'], price: 14 },
    { id: 'soft_boots', name: 'Soft Boots', rc: '#8a8a84', il: 5, aff: ['+2% Evasion'], price: 22 },
    { id: 'wolf_tooth', name: 'Wolf-Tooth Charm', rc: '#5f8f3e', il: 5, aff: ['+11 Max MP', '+0.5 MP per turn'], price: 44 },
  ];

  /* ---------------- notlar (Turkce, tek satir) ---------------- */
  const NOTES = {
    now: '<b>Bugun:</b> kasaba kartı da savaş kartıyla aynı kalıp; uzun dinlenme kuralı 3 satırda "..." ile kesiliyor. Kasaba içinde Inn, Kışla ve Tüccar üç ayrı çerçevede.',
    a: '<b>A Hizmetler (öneri):</b> kart: kasabanın gerçek hizmetleri (Inn, Recruits, Trade) üç plaka, kural tam yazılı; kasaba içi: üç ekran tek ortak kabukta, etiketlerde ikon.',
    b: '<b>B Kartpostal:</b> kart: kasabanın kendi resminden bir şerit + tam yazı; kasaba içi: ekranlar yerin yanında küçük kart, sahne görünür kalır, etiketlerde ikinci satır.',
    c: '<b>C Tabela:</b> kart: iki sütun, solda hikâye + kural, sağda tabela listesi; kasaba içi: sağ çekmece ve üstte sekmeler, yerler madalyon + alt şerit.',
  };
  const ASSUME = '<span class="as">Varsayım: "town arayüzleri biraz farklı olsun" iki şekilde de okundu. (1) Kasaba düğümünün harita kartı savaş kartlarından ayrışsın. (2) Kasaba içindeki ekranlar (menü etiketleri, Inn, Kışla, Tüccar) birbirinden ve diğer ekranlardan ayrışsın / kendi içinde tutarlı olsun. Her varyant ikisini birlikte ele alır; sahne resmi ve sahne düzeni olduğu gibi. Kart görünümünde Ravenwood (savaş) ile karşılaştırma için "Battle" düğmesi var.</span>';

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ic = (n) => `${P}ic/${n}.webp`;
  const k = () => Number(stage.dataset.k || 1);
  let lastPtr = 'mouse';
  const touchMode = () => lastPtr === 'touch' || S.z === 'ph';

  /* ---------------- A Band ipucu ---------------- */
  const TIPS = {
    inn: { kind: 'Town · Rest', title: 'Inn', ico: 'inn', ac: '#e0702a', lines: [T.innRule, T.innFoot] },
    trade: { kind: 'Town · Trade', title: "Odo's Stall", ico: 'merchant', ac: '#9fc4a0', lines: [T.odoIdle] },
    barracks: { kind: 'Town · Recruits', title: 'Barracks', ico: 'battle', ac: '#cdb67f', lines: [T.recruit] },
    notice: { kind: 'Town · Recruits', title: 'Notice Board', ico: 'battle', ac: '#cdb67f', lines: [T.notice] },
    smith: { kind: 'Town', title: 'Smith', ico: 'rest', ac: '#d9a53a', lines: ['Forge your gear.'] },
    story: { kind: 'Town', title: 'Charcoal Burner', ico: 'event', ac: '#b99ad6', lines: ['Tap to hear his story again.'] },
  };
  const tipHtml = (t) => `<div class="bt" style="--ac:${t.ac}"><div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(&quot;${ic(t.ico)}&quot;)"></span><div class="bt-ht"><div class="bt-kind">${esc(t.kind)}</div><div class="bt-title">${esc(t.title)}</div></div></div><div class="bt-div"></div><div class="bt-body">${t.lines.map((l) => `<div class="bt-ln"><span class="dia"></span><div class="tx">${esc(l)}</div></div>`).join('')}</div></div>`;
  let tipEl = null, pinned = null;
  function showTip(key, target) {
    const t = TIPS[key];
    if (!t || !tipEl) return;
    tipEl.innerHTML = tipHtml(t);
    tipEl.classList.add('on');
    const st = stage.getBoundingClientRect(), r = target.getBoundingClientRect(), s = k();
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight, W = st.width / s, H = st.height / s;
    const tl = (r.left - st.left) / s, tr = (r.right - st.left) / s, tt = (r.top - st.top) / s, tb = (r.bottom - st.top) / s;
    let x = (tl + tr) / 2 - w / 2, y = tb + 8;
    if (y + h > H - 6) y = tt - h - 8;
    x = Math.max(6, Math.min(W - w - 6, x));
    y = Math.max(6, Math.min(H - h - 6, y));
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('on'); pinned = null; stage.querySelectorAll('.pin').forEach((e) => e.classList.remove('pin')); }

  /* ---------------- ortak parcalar ---------------- */
  const medalFor = (type) => ({ town: '#e3bf72', battle: '#cdb67f', merchant: '#9fc4a0', rest: '#f08c3c' }[type] || '#cdb67f');

  function foeTile(name, n, tier, avatar, lv) {
    const tag = tier === 'elite' ? '<i class="tg">ELITE</i>' : '';
    return `<div class="sbc-foe ${tier || ''}" tabindex="0"><div class="sbc-face"><img src="${P}av/${avatar}.webp" alt="" draggable="false">${n > 1 ? `<i class="cnt">${n}×</i>` : ''}${tag}</div><span class="sbc-nm">${esc(name)}</span><span class="sbc-lv">Lv ${lv}</span></div>`;
  }
  const head = (name, sub, icon) => `<div class="sbc-head"><div class="sbc-ntile"><img src="${ic(icon)}" alt="" draggable="false"></div><div class="tx"><h2 class="sbc-t">${esc(name)}</h2><p class="sbc-sub"><b>${esc(sub)}</b></p></div></div>`;
  const actBtn = (label) => `<div class="sbc-acts"><button class="el-btn primary ready" type="button">${esc(label)}</button></div>`;
  const firstLine = () => `<p class="sbc-then sbc-first"><b>First</b> ${esc(T.first)}</p>`;
  const cardShell = (cls, inner) => `<div class="sbc"><div class="sbc-scrim"></div><i class="sbc-ring"></i><div class="sbc-card ${cls}"><i class="sbc-notch l"></i><i class="sbc-notch r"></i>${inner}</div></div>`;

  /* ---------------- KART: Ravenwood (savaş, bugünkü gerçek kart) ---------------- */
  function battleCard() {
    const foes = `<div class="sbc-row">${foeTile('Grey Wolf', 4, '', 'grey_wolf', 1)}${foeTile('Ravenwood Poacher', 1, '', 'ravenwood_poacher', 1)}${foeTile('Raven Seer', 1, '', 'raven_seer', 1)}</div>`;
    return cardShell('', `${head('Ravenwood', 'Battle · Outlaw Pack', 'battle')}<hr class="sbc-rule">${foes}<p class="sbc-info">${esc(T.ravLore)}</p>${actBtn('Fight')}`);
  }

  /* ---------------- KART: Ashford (kasaba) ---------------- */
  function townCard() {
    const tw = TOWNS.ashford;
    const hd = head(tw.name, tw.sub, 'town');
    const rule = '<hr class="sbc-rule">';
    if (S.v === 'now') return cardShell('nofoes', `${hd}${rule}<p class="sbc-info">${esc(T.townRest)}</p>${firstLine()}${actBtn('Continue')}`);
    const svc = tw.svc.map((s) => `<button type="button" data-bt="${s === 'Recruits' ? 'barracks' : s === 'Inn' ? 'inn' : s === 'Trade' ? 'trade' : 'smith'}"><img src="${ic(SVC_ICON[s])}" alt="" draggable="false"><span><b>${s}</b><i>${SVC_VERB[s]}</i></span></button>`).join('');
    if (S.v === 'a') {
      return cardShell('nofoes', `${hd}${rule}<p class="tn-full tn-lore-ph">${esc(tw.lore)}</p><div class="tn-svc">${svc}</div><div class="tn-rest"><span class="tn-lab">Rest</span><p class="tn-full lit">${esc(T.townRest)}</p></div>${firstLine()}${actBtn('Continue')}`);
    }
    if (S.v === 'b') {
      const post = `<div class="tn-post" style="background-image:url(${P}art/town-ashford.webp)"><div class="over"><div class="sbc-ntile"><img src="${ic('town')}" alt="" draggable="false"></div><div class="tx"><h2 class="sbc-t">${esc(tw.name)}</h2><p class="sbc-sub"><b>${esc(tw.sub)}</b></p></div></div></div>`;
      return cardShell('nofoes', `${post}<p class="tn-full tn-lore-ph">${esc(tw.lore)}</p><div class="tn-rest"><span class="tn-lab">At the inn</span><p class="tn-full lit">${esc(T.townRest)}</p></div>${firstLine()}${actBtn('Continue')}`);
    }
    const list = tw.svc.map((s) => `<li tabindex="0" data-bt="${s === 'Recruits' ? 'barracks' : s === 'Inn' ? 'inn' : s === 'Trade' ? 'trade' : 'smith'}"><b>${s}</b><span>${SVC_VERB[s]}</span></li>`).join('');
    const cols = `<div class="tn-cols"><div class="col"><span class="tn-lab">The village</span><p class="tn-full lit tn-lore-ph">${esc(tw.lore)}</p><span class="tn-lab">Rest</span><p class="tn-full">${esc(T.townRest)}</p></div><div class="col"><span class="tn-lab">In town</span><ul class="tn-sign">${list}</ul></div></div>`;
    return cardShell('nofoes sign', `${hd}${rule}${cols}${firstLine()}${actBtn('Continue')}`);
  }

  /* ---------------- KART gorunumu: harita ---------------- */
  function mapView() {
    const isTown = S.n === 'town';
    const pos = isTown ? [0.1728, 0.5128] : [0.3349, 0.6117];
    const zw = SIZES[S.z].w, zh = SIZES[S.z].h;
    const iw = 1672, ih = 941, zoom = S.z === 'ph' ? 1.55 : 1.4;
    const sc = Math.max(zw / iw, zh / ih) * zoom;
    const w = iw * sc, h = ih * sc;
    // dugum, kartin solunda bir yerde dursun: kart sagina acilir
    let x = zw * (S.z === 'ph' ? 0.26 : 0.3) - pos[0] * w, y = zh * 0.5 - pos[1] * h;
    x = Math.min(0, Math.max(zw - w, x)); y = Math.min(0, Math.max(zh - h, y));
    const ax = x + pos[0] * w, ay = y + pos[1] * h;
    const nm = isTown ? 'Ashford Village' : 'Ravenwood';
    stage.innerHTML = `<div class="tn-map"><img class="bg" src="${P}art/map.webp" alt="" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="tn-marker ${isTown ? '' : 'battle'}" style="left:${ax}px;top:${ay}px"><img src="${ic(isTown ? 'town' : 'battle')}" alt=""></div><div class="tn-nname" style="left:${ax}px;top:calc(${ay}px + 36 * var(--u) + 6px)">${nm}</div></div>${isTown ? townCard() : battleCard()}<div class="tn-tip"></div>`;
    tipEl = stage.querySelector('.tn-tip');
    placeCard(ax, ay);
    requestAnimationFrame(() => placeCard(ax, ay));
    setTimeout(() => placeCard(ax, ay), 250);
  }
  function placeCard(ax, ay) {
    const wrap = stage.querySelector('.sbc');
    if (!wrap) return;
    const card = wrap.querySelector('.sbc-card'), ring = wrap.querySelector('.sbc-ring'), nl = wrap.querySelector('.sbc-notch.l'), nr = wrap.querySelector('.sbc-notch.r'), scrim = wrap.querySelector('.sbc-scrim');
    const vw = wrap.clientWidth, vh = wrap.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    const gu = SIZES[S.z].gu;
    const r = Math.max(13, 29 * gu), gap = r + Math.max(14, 20 * gu);
    let left = ax + gap, side = 'l';
    if (left + cw > vw - 10) { left = ax - gap - cw; side = 'r'; }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, ay - ch / 2));
    card.style.left = left + 'px'; card.style.top = top + 'px';
    (side === 'l' ? nr : nl).style.display = 'none';
    (side === 'l' ? nl : nr).style.display = '';
    (side === 'l' ? nl : nr).style.top = Math.max(18, Math.min(ch - 30, ay - top - 8)) + 'px';
    wrap.style.setProperty('--ax', ax + 'px'); wrap.style.setProperty('--ay', ay + 'px'); wrap.style.setProperty('--ar', Math.round(r * 1.5) + 'px');
    ring.style.left = ax + 'px'; ring.style.top = ay + 'px'; ring.style.width = ring.style.height = r * 2 + 'px';
    void scrim;
  }

  /* ---------------- KASABA ICI ---------------- */
  const IMG = { w: 2304, h: 1536 };
  function cover(zw, zh, focusY) {
    const scale = Math.max(zw / IMG.w, zh / IMG.h), w = IMG.w * scale, h = IMG.h * scale, x = (zw - w) / 2;
    const fy = Math.min(1, Math.max(0, focusY));
    const y = Math.min(0, Math.max(zh - h, zh * fy - h * fy));
    return { x, y, w, h };
  }
  function townView() {
    const tw = TOWNS[S.t], z = SIZES[S.z], u = z.gu, ph = S.z === 'ph';
    const cv = cover(z.w, z.h, tw.focusY);
    const spots = tw.spots.filter((s) => !s.onlyTab);
    const labSize = (ph ? 34 : 21) * u, pillH = labSize * 1.9;
    let html = `<div class="tn-town tn-${S.v === 'now' ? 'N' : S.v.toUpperCase()}"><img class="bg" src="${P}art/${tw.bg}.webp" alt="" style="left:${cv.x}px;top:${cv.y}px;width:${cv.w}px;height:${cv.h}px"><div class="tn-shade t"></div><div class="tn-shade b"></div>`;
    html += `<div class="tn-ttl">${esc(tw.name)}</div><div class="tn-rule"></div><div class="tn-tsub">${esc(tw.sub)}</div>`;
    if (tw.recruitWaiting && S.v !== 'c') html += `<div class="tn-band">${esc(T.waiting)}</div>`;
    for (const s of spots) {
      const rx = cv.x + s.rect[0] * cv.w, ry = cv.y + s.rect[1] * cv.h, rw = (s.rect[2] - s.rect[0]) * cv.w, rh = (s.rect[3] - s.rect[1]) * cv.h;
      const cx = rx + rw / 2;
      const badge = s.id === 'barracks' && tw.recruitWaiting;
      const bt = s.act === 'inn' ? 'inn' : s.act === 'trade' ? 'trade' : s.act === 'barracks' ? 'barracks' : s.act === 'story' ? 'story' : '';
      const attr = `data-spot="${s.act}" ${bt ? `data-bt="${bt}"` : ''}`;
      if (S.v === 'c') {
        const mx = Math.max(24, Math.min(z.w - 24, cx)), my = Math.max(150 * u + 40, ry + Math.min(rh * 0.3, 40 * u));
        if (s.act !== 'leave') html += `<button class="tn-mark" type="button" aria-label="${esc(s.label)}" style="left:${mx}px;top:${my}px" ${attr}><img src="${ic(SPOT_ICON[s.act] || 'town')}" alt="">${badge ? '<i class="bdg">!</i>' : ''}</button>`;
        continue;
      }
      const pw = Math.max(labSize * 6.2, s.label.length * labSize * 0.78 + labSize * 2.4);
      const lx = Math.max(pw / 2 + 12, Math.min(z.w - pw / 2 - 12, cx));
      const ly = Math.max(150 * u + pillH / 2, s.arch ? ry - 16 * u - pillH / 2 : ry + pillH / 2 + 4);
      let inner = esc(s.label), cls = 'tn-lab-pill';
      if (S.v === 'now' && s.act === 'inn') inner = `<img src="${ic('inn')}" alt="">${inner}`;
      if (S.v === 'a' && SPOT_ICON[s.act]) inner = `<img src="${ic(SPOT_ICON[s.act])}" alt="">${inner}`;
      if (S.v === 'b' && TOWN_VERB[s.act]) { cls += ' two'; inner = `${inner}<small>${TOWN_VERB[s.act]}</small>`; }
      html += `<button class="${cls}" type="button" style="left:${lx}px;top:${ly}px" ${attr}>${inner}${badge ? '<i class="bdg">!</i>' : ''}<span class="tap">Tap again</span></button>`;
    }
    if (S.v === 'c') {
      const strip = spots.filter((s) => s.act !== 'story').map((s) => `<button type="button" class="${s.act === 'leave' ? 'leave' : ''}" data-spot="${s.act}" ${s.act === 'inn' ? 'data-bt="inn"' : s.act === 'trade' ? 'data-bt="trade"' : s.act === 'barracks' ? 'data-bt="barracks"' : ''}>${SPOT_ICON[s.act] ? `<img src="${ic(SPOT_ICON[s.act])}" alt="">` : ''}${esc(s.label)}${s.id === 'barracks' && tw.recruitWaiting ? '<i class="bdg">!</i>' : ''}</button>`).join('');
      html += `<div class="tn-strip">${strip}</div>`;
    }
    const feet = z.h * (ph ? 0.86 : 0.9), hh = 250 * u;
    html += `<div class="tn-party" style="top:${feet - hh}px"><img src="${P}art/warrior-idle.webp" alt=""><span>Warrior</span></div>`;
    html += subScreen(tw, cv, spots);
    html += '<div class="tn-tip"></div></div>';
    stage.innerHTML = html;
    tipEl = stage.querySelector('.tn-tip');
  }

  /* ---------------- kasaba ici ekranlar ---------------- */
  const faceStyle = (c) => `background-image:url(${P}av/${c}.webp)`;
  const hpBar = (r, ghost) => `<div class="ec-hp${r < 0.4 ? ' low' : ''}">${ghost && ghost > r ? `<i class="ghost" style="left:${Math.round(r * 100)}%;width:${Math.round((Math.min(1, ghost) - r) * 100)}%"></i>` : ''}<i style="width:${Math.round(r * 100)}%"></i></div>`;
  const healLine = (d) => (d <= 0 ? 'Fully healed' : `Fully healed in ${d} day${d === 1 ? '' : 's'}`);
  const wnd = (n) => `${n} wound${n === 1 ? '' : 's'}`;
  function heroRow(h, cls, extra, btn) {
    const c = CLS[h.cls];
    return `<div class="ec-hero ${cls}"><div class="ec-face" style="${faceStyle(h.cls)}"></div><div class="ec-ht"><div class="ec-hn">${c.name}</div><div class="ec-hm">Lv ${h.lv}</div>${hpBar(h.hp, h.ghost)}<div class="ec-hm">${Math.round(h.hp * 100)}% HP · ${wnd(h.wounds)}</div>${extra}</div><div class="ec-act">${btn}</div></div>`;
  }
  const grBtn = (label, cls = '') => `<button class="gr-btn ${cls}" type="button" data-close="${cls.includes('primary') ? 1 : 0}">${esc(label)}</button>`;

  function innBody() {
    const tw = TOWNS[S.t];
    const road = EX.road.map((h) => heroRow(h, '', '', grBtn('Leave here'))).join('');
    const empties = Array.from({ length: Math.max(0, tw.cap - EX.road.length) }, () => '<div class="ec-empty">Empty slot · recruit at the barracks or travel short-handed</div>').join('');
    const inn = EX.inn.map((h) => heroRow({ ...h, ghost: Math.min(1, h.hp + 0.5) }, 'inn', `<span class="ec-heal">${healLine(h.days)}</span>`, grBtn('Take back'))).join('');
    return `<p class="ec-rule">${esc(T.innRule)}</p><div class="ec-grid2"><div class="ec-col"><h4 class="ec-lab">At the Inn · ${EX.inn.length} resting</h4>${inn}</div><div class="ec-col"><h4 class="ec-lab">On the road · ${EX.road.length} / ${tw.cap}</h4>${road}${empties}</div></div>`;
  }
  function barracksBody() {
    if (S.t === 'ashford') return `<p class="ec-rule">${esc(T.notice)}</p>`;
    const cards = ['paladin', 'hexer', 'druid'].map((c) => `<button class="ec-card" type="button"><div class="ec-card-ico"><img src="${ic(c)}" alt=""></div><h4>${CLS[c].name}</h4><p>${CLS[c].role} · ${CLS[c].stat}</p><small>${esc(CLS[c].blurb)}</small></button>`).join('');
    return `<p class="ec-rule">${esc(T.recruit)}</p><div class="tn-cards3">${cards}</div>`;
  }
  function tradeBody() {
    const wares = WARES.map(warePlate).join('');
    return `<div class="tn-odo"><div class="ec-face" style="${faceStyle('merchant')}"></div><p class="ec-rule" style="margin:0">${esc(T.odoIdle)}</p></div><h4 class="ec-lab">Wares</h4><div class="tn-wares">${wares}</div>`;
  }
  function warePlate(w) {
    const l2 = `<div class="gp-l2">${w.main ? `<span class="gp-main">${w.main[0]} <b>${w.main[1]}</b></span>` : ''}<span class="gp-il">iL <b>${w.il}</b></span>${w.aff.slice(0, 2).map((a) => `<span class="gp-aff">${a}</span>`).join('')}</div>`;
    return `<button class="gr-slot gr-plate" type="button" style="--rc:${w.rc}"><span class="gp-hint"></span><span class="gp-ico"><img class="gr-svg gr-px item-art" src="${P}items/${w.id}.webp" alt="" draggable="false" style="--sz:1.3;--glow:${w.rc}"></span><div class="gr-slot-text gp-tx"><div class="gr-slot-name">${w.name}</div>${l2}</div><span class="gp-price"><img class="gp-price-ico" src="${ic('gold')}" alt="">${w.price}</span></button>`;
  }
  const FOOT = {
    inn: { note: T.innFoot, sec: [], pri: 'Done' },
    barracks: { note: '', sec: (t) => (t === 'valdren' ? ['Not now'] : []), pri: 'Close' },
    trade: { note: '', sec: [], pri: 'Done' },
  };
  const TITLE = { inn: ['Inn', 'inn'], barracks: ['Barracks', 'battle'], trade: ["Odo's Stall", 'merchant'] };
  function bodyOf(sub) {
    if (sub === 'inn') return innBody();
    if (sub === 'barracks') return barracksBody();
    return tradeBody();
  }
  function footOf(sub) {
    const f = FOOT[sub];
    const sec = typeof f.sec === 'function' ? f.sec(S.t) : f.sec;
    const purse = sub === 'trade' ? `<span class="tn-purse"><img src="${ic('gold')}" alt="">${EX.gold}</span>` : '';
    return `<div class="tn-shell-foot">${f.note ? `<span class="ec-note">${esc(f.note)}</span>` : ''}${purse}${sec.map((s) => grBtn(s)).join('')}${grBtn(f.pri, 'primary')}</div>`;
  }

  function subScreen(tw, cv, spots) {
    if (S.sub === 'town') return '';
    const sub = S.sub;
    const [title, icon] = TITLE[sub];
    const place = spots.find((s) => s.act === sub) || tw.spots.find((s) => s.act === sub);
    if (S.v === 'now') {
      if (sub === 'barracks') return mwCard(tw, cv, place, true);
      if (sub === 'trade') return `<div class="gr-overlay el-modal ec-ov" role="dialog" aria-label="Trade"><div class="gr-panel el-modal-panel ec-panel"><div class="gr-head ec-head"><img class="ec-head-ico" src="${ic('merchant')}" alt=""><div class="gr-title">${T.odoName}</div><span class="gr-grow" style="flex:1"></span><span class="tn-purse"><img src="${ic('gold')}" alt="">${EX.gold}</span></div><div class="ec-body">${tradeBody()}${`<div class="tn-shell-foot">${grBtn('Done', 'primary')}</div>`}</div></div></div>`;
      return `<div class="gr-overlay el-modal ec-ov" role="dialog" aria-label="Inn"><div class="gr-panel el-modal-panel ec-panel"><div class="gr-head ec-head"><img class="ec-head-ico" src="${ic('inn')}" alt=""><div class="gr-title">Inn</div><span class="ec-sub">${esc(tw.name)}</span></div><div class="ec-body">${innBody()}${footOf('inn')}</div></div></div>`;
    }
    if (S.v === 'a') {
      return `<div class="gr-overlay el-modal ec-ov" role="dialog" aria-label="${esc(title)}"><div class="gr-panel el-modal-panel ec-panel"><div class="gr-head ec-head"><img class="ec-head-ico" src="${ic(icon)}" alt=""><div class="gr-title">${esc(title)}</div><span class="ec-sub">${esc(tw.name)}</span><span class="gr-grow" style="flex:1"></span><span class="tn-chip">Company ${EX.road.length} / ${tw.cap}</span><span class="tn-purse"><img src="${ic('gold')}" alt="">${EX.gold}</span></div><div class="ec-body">${bodyOf(sub)}${footOf(sub)}</div></div></div>`;
    }
    if (S.v === 'b') return mwCard(tw, cv, place, false);
    // C: sag cekmece
    const tabs = ['inn', 'barracks', 'trade'].map((s) => `<button class="bs-tab${s === sub ? ' on' : ''}" type="button" data-spot="${s}"><img class="bs-tab-ico" src="${ic(TITLE[s][1])}" alt="">${s === 'barracks' && S.t === 'ashford' ? 'Notice Board' : TITLE[s][0]}</button>`).join('');
    return `<div class="tn-drawer" role="dialog" aria-label="${esc(title)}"><div class="tn-hdr"><div class="gr-title">${esc(tw.name)}</div><span class="gr-grow" style="flex:1"></span><span class="tn-purse"><img src="${ic('gold')}" alt="">${EX.gold}</span></div><div class="bs-tabs">${tabs}</div><div class="ec-body">${bodyOf(sub)}</div>${footOf(sub)}</div>`;
  }

  /* kucuk kart (map-window C dili): B'de her ekran, Now'da yalniz Kisla */
  function mwCard(tw, cv, place, real) {
    const sub = S.sub, [title, icon] = TITLE[sub];
    const col = medalFor(sub === 'barracks' ? 'battle' : sub === 'trade' ? 'merchant' : 'rest');
    const art = `<div class="mw-art" style="background-image:url(${P}art/${tw.bg}.webp);background-position:50% 48%"></div>`;
    let bodyHtml = '';
    let acts = '';
    if (sub === 'barracks') {
      if (S.t === 'ashford') { bodyHtml = `<div class="mw-txt"><p>${esc(T.notice)}</p></div>`; acts = '<button class="el-btn primary ready" type="button" data-close="1">Close</button>'; }
      else {
        const cards = ['paladin', 'hexer', 'druid'].map((c, i) => `<button type="button" class="mw-card" style="--i:${i};--ac:${CLS[c].color};--acl:color-mix(in srgb, ${CLS[c].color} 55%, #fff)"><div class="pt"><img class="av" src="${P}av/${c}.webp" alt="" draggable="false"><img class="em" src="${ic(c)}" alt=""></div><span class="nm">${CLS[c].name}</span><div class="mw-chips"><span class="mw-chip info">${CLS[c].role}</span><span class="mw-chip gain">${CLS[c].stat}</span></div><p class="ds">${esc(CLS[c].blurb)}</p></button>`).join('');
        bodyHtml = `<div class="mw-txt"><p>${esc(T.recruit)}</p></div><div class="mw-cards">${cards}</div>`;
        acts = '<button class="el-btn" type="button" data-close="1">Not now</button><button class="el-btn primary" type="button" disabled title="Pick one companion first.">Join us</button>';
      }
    } else if (sub === 'inn') {
      const rows = [...EX.inn.map((h) => ({ h, inn: true })), ...EX.road.map((h) => ({ h, inn: false }))].map(({ h, inn }) => `<div class="mw-frow"><img class="av" src="${P}av/${h.cls}.webp" alt="" style="filter:none"><div class="tx"><b>${CLS[h.cls].name} · Lv ${h.lv}</b><span>${inn ? `At the Inn · ${healLine(h.days)}` : `On the road · ${Math.round(h.hp * 100)}% HP`} · ${wnd(h.wounds)}</span></div><button class="el-btn" type="button">${inn ? 'Take back' : 'Leave here'}</button></div>`).join('');
      bodyHtml = `<div class="mw-txt"><p>${esc(T.innRule)}</p></div><div class="mw-fallen">${rows}</div><p class="mw-lore">${esc(T.innFoot)}</p>`;
      acts = '<button class="el-btn primary ready" type="button" data-close="1">Done</button>';
    } else {
      const plates = WARES.map((w) => `<button type="button" class="mw-plate acc-gold"><span class="mw-ptag">${w.rc === '#5f8f3e' ? 'Uncommon' : 'Common'}</span><b class="mw-pnm">${w.name}</b><p class="mw-pds">${w.main ? w.main[0] + ' ' + w.main[1] + ' · ' : ''}${w.aff.join(' · ')}</p><div class="mw-chips"><span class="mw-chip gain"><img src="${ic('gold')}" alt="">${w.price}</span><span class="mw-chip dim">iL ${w.il}</span></div></button>`).join('');
      bodyHtml = `<div class="mw-txt"><p>${esc(T.odoIdle)}</p></div><div class="mw-plates">${plates}</div>`;
      acts = `<span class="tn-purse" style="margin-right:auto"><img src="${ic('gold')}" alt="">${EX.gold}</span><button class="el-btn primary ready" type="button" data-close="1">Done</button>`;
    }
    const wide = sub !== 'barracks' || S.t !== 'ashford';
    const kind = (tw.sub.split(' · ')[0]);
    return `<div class="mw mw-in anch" data-mwc="${place ? place.id : ''}"><div class="mw-scrim" data-close="1"></div><div class="mw-win mw-C${wide ? ' wide' : ''} town bd-${sub === 'barracks' ? 'cards' : 'plates'}"><div class="mw-panel" style="--ac:${col};--acr:${col === '#cdb67f' ? '205,182,127' : '227,191,114'}"><i class="mw-notch l"></i><i class="mw-notch r"></i>${art}<div class="mw-hd2"><span class="tn-medal"><img src="${ic(icon)}" alt=""></span><div class="tx"><h2 class="mw-t">${esc(title)}</h2><div class="mw-tags"><span class="mw-chip type" style="--ac:#e3bf72">${esc(kind)}</span><span class="mw-chip dim">${esc(tw.name)}</span></div></div></div><div class="mw-scroll"><div class="mw-body">${bodyHtml}<div class="mw-acts">${acts}</div></div></div></div></div></div>`;
  }
  function placeMw() {
    const w = stage.querySelector('.mw[data-mwc]');
    if (!w) return;
    const win = w.querySelector('.mw-C');
    const tw = TOWNS[S.t], z = SIZES[S.z], cv = cover(z.w, z.h, tw.focusY);
    const sp = tw.spots.find((s) => s.id === w.dataset.mwc) || tw.spots.find((s) => s.act === S.sub);
    const nl = w.querySelector('.mw-notch.l'), nr = w.querySelector('.mw-notch.r');
    if (S.v !== 'b' && S.v !== 'now') return;
    const vw = w.clientWidth, vh = w.clientHeight, cw = win.offsetWidth, ch = win.offsetHeight;
    const ax = cv.x + ((sp.rect[0] + sp.rect[2]) / 2) * cv.w, ay = cv.y + ((sp.rect[1] + sp.rect[3]) / 2) * cv.h, hw = ((sp.rect[2] - sp.rect[0]) * cv.w) / 2;
    let left = ax + hw + 20, side = 'l';
    if (left + cw > vw - 8) { left = ax - hw - 20 - cw; side = 'r'; }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, ay - ch / 2));
    win.style.left = left + 'px'; win.style.top = top + 'px';
    (side === 'l' ? nr : nl).style.display = 'none';
    (side === 'l' ? nl : nr).style.display = '';
    (side === 'l' ? nl : nr).style.top = Math.max(18, Math.min(ch - 30, ay - top - 8)) + 'px';
  }

  /* ---------------- cubuk, boyutlama, olaylar ---------------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  function buildBar() {
    bar.replaceChildren();
    if (S.clean) { bar.style.display = 'none'; note.style.display = 'none'; return; }
    const add = (label, on, fn, dis, title) => { const b = el('button', on ? 'on' : '', label); if (dis) b.disabled = true; if (title) b.title = title; b.onclick = fn; bar.append(b); };
    for (const [v, l] of [['a', 'A'], ['b', 'B'], ['c', 'C'], ['now', 'Now']]) add(l, S.v === v, () => go({ v }));
    bar.append(el('span', 'sep'));
    add('Map card', S.view === 'card', () => go({ view: 'card' }));
    add('In town', S.view === 'town', () => go({ view: 'town' }));
    bar.append(el('span', 'sep'));
    if (S.view === 'card') {
      add('Ashford (town)', S.n === 'town', () => go({ n: 'town' }));
      add('Ravenwood (battle)', S.n === 'battle', () => go({ n: 'battle' }));
    } else {
      for (const [t, l] of [['ashford', 'Ashford'], ['valdren', 'Valdren']]) add(l, S.t === t, () => go({ t }));
      bar.append(el('span', 'sep'));
      for (const [s, l] of [['town', 'Town'], ['inn', 'Inn'], ['barracks', S.t === 'ashford' ? 'Notice Board' : 'Barracks'], ['trade', 'Trade']]) add(l, S.sub === s, () => go({ sub: s }));
    }
    bar.append(el('span', 'sep'));
    for (const z of ['169', '219', 'ph']) add(SIZES[z].label, S.z === z, () => go({ z }));
    note.innerHTML = NOTES[S.v] + ASSUME;
  }
  function go(o) {
    Object.assign(S, o);
    if (o.view || o.t) { if (o.view === 'card') S.sub = 'town'; }
    history.replaceState(null, '', `#${S.v}&view=${S.view}&n=${S.n}&t=${S.t}&sub=${S.sub}&z=${S.z}${S.clean ? '&clean' : ''}`);
    render();
  }
  function fit() {
    const z = SIZES[S.z];
    view.style.top = S.clean ? '0px' : (48 + note.offsetHeight) + 'px';
    stage.style.width = z.w + 'px'; stage.style.height = z.h + 'px';
    stage.style.setProperty('--gu', z.gu + 'px');
    for (const kk of ['--el', '--er', '--et', '--eb']) stage.style.setProperty(kk, '0px');
    root.classList.toggle('short', S.z === 'ph');
    root.classList.toggle('compact', S.z === 'ph');
    const kk = Math.min(view.clientWidth / z.w, view.clientHeight / z.h, S.z === 'ph' ? 2.4 : 1);
    stage.style.transform = `scale(${kk})`;
    stage.dataset.k = String(kk);
  }
  function render() {
    buildBar(); fit(); pinned = null;
    if (S.view === 'card') mapView(); else townView();
    wire();
    if (S.view === 'town') { placeMw(); requestAnimationFrame(placeMw); setTimeout(placeMw, 250); }
  }
  function wire() {
    const bts = stage.querySelectorAll('[data-bt]');
    bts.forEach((e) => {
      e.addEventListener('mouseenter', () => { if (!touchMode()) showTip(e.dataset.bt, e); });
      e.addEventListener('mouseleave', () => { if (!touchMode() && pinned !== e.dataset.bt) tipEl && tipEl.classList.remove('on'); });
      e.addEventListener('focus', () => showTip(e.dataset.bt, e));
      e.addEventListener('blur', () => tipEl && tipEl.classList.remove('on'));
    });
    stage.querySelectorAll('[data-spot]').forEach((e) => {
      e.addEventListener('click', (ev) => {
        const act = e.dataset.spot;
        if (touchMode() && e.matches('.tn-lab-pill, .tn-mark, .tn-strip button') && pinned !== act) {
          ev.stopPropagation(); hideTip(); pinned = act; e.classList.add('pin');
          if (e.dataset.bt) showTip(e.dataset.bt, e);
          return;
        }
        hideTip();
        if (act === 'inn' || act === 'barracks' || act === 'trade') go({ sub: act });
      });
    });
    // karttaki hizmet plakalari / tabela: yalniz ipucu (dokunmatikte dokununca sabitlenir)
    stage.querySelectorAll('.tn-svc button, .tn-sign li').forEach((e) => {
      e.addEventListener('click', () => { if (!touchMode()) return; const was = pinned === e.dataset.bt; hideTip(); if (!was) { pinned = e.dataset.bt; e.classList.add('pin'); showTip(e.dataset.bt, e); } });
    });
    stage.querySelectorAll('[data-close]').forEach((e) => e.addEventListener('click', () => { if (e.disabled) return; go({ sub: 'town' }); }));
    stage.querySelectorAll('.gr-overlay').forEach((o) => o.addEventListener('click', (ev) => { if (ev.target === o) go({ sub: 'town' }); }));
  }
  stage.addEventListener('pointerdown', (ev) => { lastPtr = ev.pointerType === 'touch' ? 'touch' : 'mouse'; if (touchMode() && !ev.target.closest('[data-bt],[data-spot]')) hideTip(); });
  window.addEventListener('resize', () => { fit(); if (S.view === 'town') placeMw(); });
  window.addEventListener('hashchange', () => location.reload());
  render();
})();
