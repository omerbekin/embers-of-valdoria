/* Ortak envanter / karakter ekranı taslağı (ui-dev, 2026-10-18). Oyun kodu DEĞİL; görünüm oyunun CSS'i + oyunun ürettiği işaretleme ve görsellerdir
   (data.js: src/progression, character-panel > skillBar, item-tip > itemTipNodes, inventory > itemIcon çıktısı). Statlar data/formulas.json ile
   oyunun heroPanel hesabından üretilen eğrilerden; level eğrisi data/levels.json (xpToNext = round(20 x L^1.6), level başına 3 stat + 1 skill puanı). */
(() => {
  'use strict';
  const D = window.UI_DATA;
  const A = 'unified-inventory/';
  const ATTR = ['str', 'dex', 'int', 'luck'];
  const BAG_SIZE = 30;
  const FAM = { axes: 'Axes', maces: 'Maces', staves: 'Staves', bows: 'Bows', charms: 'Charms', daggers: 'Daggers' };
  const MODES = ['none', 'map', 'town', 'merchant', 'reward'];
  const VS = ['v1', 'v2', 'v3', 'v4', 'v5'];
  const VNAME = { v1: 'Triptych', v2: 'Workbench', v3: 'Ledger', v4: 'Stage', v5: 'Squad' };
  const $ = (sel, r = document) => r.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PANEL_IDS = D.heroes.h1.panel.map((p) => p.id);
  const PANEL_META = Object.fromEntries(D.heroes.h1.panel.map((p) => [p.id, p]));
  const fmt = (v, f) => (f === 'pct' ? `${Math.round(v * 1000) / 10}%` : f === 'dec' ? String(Math.round(v * 10) / 10) : String(Math.round(v)));
  const fmtD = (v, f) => `${v > 0 ? '+' : ''}${fmt(v, f)}`;
  const xpToNext = (L) => (L >= 50 ? 0 : Math.round(20 * Math.pow(L, 1.6)));

  // ---------------------------------------------------------------- durum
  let S;
  function fresh() {
    const heroes = {};
    for (const h of Object.values(D.heroes))
      heroes[h.id] = { id: h.id, level: h.level, xp: h.xp, statPoints: h.statPoints, skillPoints: h.skillPoints, extra: {}, pending: {}, equip: { ...h.equip }, tree: {}, hp: h.id === 'h1' ? 0.62 : h.id === 'h3' ? 0.81 : h.id === 'h4' ? 0.45 : 1 };
    return {
      v: S?.v ?? 'v3', mode: S?.mode ?? 'none', invOpen: !['town', 'reward', 'map'].includes(S?.mode ?? 'none'), dlg: null, rbag: false, shopTab: 'sell', fsel: null,
      form: { h1: [3, 1], h2: [1, 1], h3: [2, 0], h4: [2, 2] }, hero: 'h1', heroes, bag: [...D.bag], wares: [...D.wares], buyback: [], gold: 240, sel: null, filter: false,
      tab: { v1: 'stats', v2: 'equip', v3: 'hero', v5: 'gear' }, sheet: false, reward: { taken: null, target: null }, rested: false, rerolls: 0,
    };
  }
  S = fresh();
  const hero = (id = S.hero) => S.heroes[id];
  const meta = (id = S.hero) => D.heroes[id];
  const item = (uid) => D.items[uid];
  const twoHand = (uid) => !!uid && /Two-handed/.test(item(uid).sub);

  // ---------------------------------------------------------------- statlar (oyunun heroPanel eğrileri + item katkıları)
  function attrs(hid, withPending = true) {
    const m = meta(hid), h = hero(hid);
    const o = {};
    for (const k of ATTR) o[k] = m.baseAttrs[k] + (m.alloc[k] ?? 0) + (h.extra[k] ?? 0) + (withPending ? h.pending[k] ?? 0 : 0);
    return o;
  }
  const ruleOk = (a) => { const s = ATTR.reduce((t, k) => t + a[k], 0); return ATTR.every((k) => a[k] <= s - a[k]); };
  function canAdd(hid, k) {
    const h = hero(hid);
    if (free(hid) <= 0) return false;
    const a = attrs(hid);
    a[k] += 1;
    return ruleOk(a);
  }
  const pendCount = (hid) => ATTR.reduce((t, k) => t + (hero(hid).pending[k] ?? 0), 0);
  const free = (hid) => hero(hid).statPoints - pendCount(hid);
  function panel(hid, equip = hero(hid).equip, withPending = true) {
    const m = meta(hid), h = hero(hid);
    const v = m.panel.map((p) => p.value);
    for (const k of ATTR) {
      const q = Math.min(30, (h.extra[k] ?? 0) + (withPending ? h.pending[k] ?? 0 : 0));
      if (q) m.curves[k][q].forEach((d, i) => (v[i] += d));
    }
    for (const uid of Object.values(equip)) {
      if (!uid) continue;
      const dl = item(uid).per[hid]?.delta ?? {};
      for (const [id, d] of Object.entries(dl)) v[PANEL_IDS.indexOf(id)] += d;
    }
    return Object.fromEntries(PANEL_IDS.map((id, i) => [id, Math.round(v[i] * 10000) / 10000]));
  }
  /** item takılırsa (yuvası, ikinci el boşalması dahil) yeni kuşanım */
  function equipAfter(hid, uid) {
    const it = item(uid);
    const eq = { ...hero(hid).equip };
    const slot = it.slot;
    eq[slot] = uid;
    if (slot === 'weapon' && twoHand(uid)) delete eq.offhand;
    if (slot === 'offhand' && twoHand(eq.weapon)) delete eq.weapon;
    return eq;
  }
  function usable(hid, uid) {
    const it = item(uid), p = it.per[hid];
    if (p?.err) { const f = (p.err.match(/use (\w+)/) || [])[1]; return { ok: false, why: it.slot === 'offhand' ? "Can't use Shields" : `Can't use ${FAM[f] ?? f}` }; }
    if (it.slot === 'offhand' && !meta(hid).offhand) return { ok: false, why: "Can't use Shields" };
    if (it.req > hero(hid).level) return { ok: false, why: `Requires Level ${it.req}`, lvl: true };
    return { ok: true };
  }
  function diffFor(hid, uid) {
    if (!uid || !usable(hid, uid).ok) return null;
    if (Object.values(hero(hid).equip).includes(uid)) return null;
    const a = panel(hid), b = panel(hid, equipAfter(hid, uid));
    const out = {};
    for (const id of PANEL_IDS) { const d = Math.round((b[id] - a[id]) * 10000) / 10000; if (d) out[id] = d; }
    return out;
  }
  function heroLine(hid, focus) {
    const h = hero(hid);
    const n = Object.values(h.equip).filter(Boolean).length;
    const idle = { tone: 'idle', html: `Level ${h.level} · ${n}/7 items` };
    if (!focus) return idle;
    if (Object.values(h.equip).includes(focus)) return { tone: 'none', html: 'Equipped' };
    const u = usable(hid, focus);
    if (!u.ok) return { tone: 'no', html: esc(u.why) };
    const d = diffFor(hid, focus) ?? {};
    const keys = Object.keys(d).sort((x, y) => Math.abs(d[y] / (PANEL_META[y].fmt === 'pct' ? 0.01 : 1)) - Math.abs(d[x] / (PANEL_META[x].fmt === 'pct' ? 0.01 : 1))).slice(0, 3);
    if (!keys.length) return { tone: 'none', html: 'No change' };
    const ups = keys.filter((k) => d[k] > 0).length;
    const tone = ups === keys.length ? 'up' : ups === 0 ? 'down' : 'mixed';
    return { tone, html: keys.map((k) => `<span class="gr-tip-d ${d[k] > 0 ? 'up' : 'down'}">${fmtD(d[k], PANEL_META[k].fmt)} ${PANEL_META[k].label}</span>`).join(' · ') };
  }

  // ---------------------------------------------------------------- küçük çizim yardımcıları
  const STAT_NAME = { hp: 'Health', mp: 'Mana', str: 'Strength', dex: 'Dexterity', int: 'Intellect', luck: 'Luck', damage: 'Damage bonus', crit: 'Crit chance', critMult: 'Crit damage', accuracy: 'Accuracy', spd: 'Speed', armor: 'Armor', magicArmor: 'Magic armor', evasion: 'Evasion', hpRegen: 'HP per turn', mpRegen: 'MP per turn' };
  const statIco = (id) => D.statTips[id] ?? '';
  const face = (hid, cls = 'gr-face') => `<div class="${cls}" style="background-image:url('${meta(hid).avatar}')"></div>`;
  const ptBadge = (hid) => (hero(hid).statPoints > 0 ? `<span class="mk-pt" data-tipt="Stat points to spend">${hero(hid).statPoints}</span>` : '');
  const skBadge = (hid) => (hero(hid).skillPoints > 0 ? `<span class="mk-pt sk" data-tipt="Skill points">${hero(hid).skillPoints}</span>` : '');
  function itemCell(uid, o = {}) {
    if (!uid) return `<div class="gr-item empty"${o.drop ? ` data-drop="${o.drop}"` : ''}></div>`;
    const it = item(uid);
    const no = o.hid && !usable(o.hid, uid).ok;
    const cls = `gr-item k${it.k}${no ? ' no' : ''}${S.sel?.uid === uid ? ' on' : ''}${o.filtered ? ' filtered' : ''}`;
    return `<button class="${cls}" type="button"${o.drop ? ` data-drop="${o.drop}"` : ''} data-drag="${o.src}:${uid}" data-tip="${uid}" data-src="${o.src}" aria-label="${esc(it.name)}" style="--rc:${it.color}"><img class="gr-svg gr-px item-art" src="${it.icon}" alt="" draggable="false" style="--sz:1;--glow:${it.color}"></button>`;
  }
  const price = (n, bad) => `<div class="gr-price${bad ? ' bad' : ''}"><img class="gr-price-ico" src="${D.extra.gold}" alt="">${n}</div>`;
  function heroCard(hid, o = {}) {
    const line = heroLine(hid, focusUid());
    const on = hid === S.hero ? ' on' : '';
    const tap = S.sel && S.sel.src !== 'slot' && usable(hid, S.sel.uid).ok ? ' tap-ok' : '';
    return `<button class="gr-hero${on}${tap}" type="button" data-hero="${hid}" data-drop="hero:${hid}"${o.tipName ? ` data-tipt="${esc(meta(hid).name)}" data-tipi="${esc(line.html.replace(/<[^>]+>/g, ''))}"` : ''}>${face(hid)}${o.compact ? '' : `<div class="gr-hero-meta"><div class="gr-hero-name">${esc(meta(hid).name)}</div><div class="gr-hero-sub tone-${line.tone}">${line.html}</div></div>`}${o.badge !== false ? `<span class="gr-badge">${ptBadge(hid)}</span>` : ''}</button>`;
  }
  const heroList = (o) => `<div class="gr-heroes">${Object.keys(S.heroes).map((hid) => heroCard(hid, o)).join('')}</div>`;
  function slotBtn(hid, slot) {
    const h = hero(hid), m = meta(hid);
    const uid = h.equip[slot];
    const sname = D.slots.find((s) => s.id === slot).name;
    if (slot === 'offhand' && !uid && twoHand(h.equip.weapon)) {
      const w = item(h.equip.weapon);
      return `<button class="gr-slot empty blocked gr-slot-offhand" type="button" disabled style="--rc:#5b4a33"><img class="gr-svg gr-px gr-silhouette" src="${w.icon}" alt="" style="--sz:1.3"><div class="gr-slot-text"><div class="gr-slot-name">${sname}</div><div class="gr-slot-sub gr-hands-hint">2H</div></div></button>`;
    }
    const sel = S.sel && !S.sel.src.startsWith('slot') ? item(S.sel.uid) : null;
    const tap = sel && sel.slot === slot && usable(hid, S.sel.uid).ok ? ' tap-ok' : '';
    if (!uid) {
      const sub = slot === 'offhand' && !m.offhand ? 'No shield or dagger' : 'Empty';
      return `<button class="gr-slot empty gr-slot-${slot}${tap}" type="button" data-drop="slot:${hid}:${slot}" style="--rc:#5b4a33">${slotGlyph(slot)}<div class="gr-slot-text"><div class="gr-slot-name">${sname}</div><div class="gr-slot-sub">${sub}</div></div></button>`;
    }
    const it = item(uid);
    return `<button class="gr-slot gr-slot-${slot}${tap}${S.sel?.uid === uid ? ' on' : ''}" type="button" data-drop="slot:${hid}:${slot}" data-drag="slot:${uid}" data-tip="${uid}" data-src="slot" style="--rc:${it.color}"><img class="gr-svg gr-px item-art" src="${it.icon}" alt="" draggable="false" style="--sz:1.3;--glow:${it.color}"><div class="gr-slot-text"><div class="gr-slot-name" style="color:${it.color}">${esc(it.name)}</div></div></button>`;
  }
  // yazısız yuva karosu (v5): ikon + nadirlik çerçevesi; yuva adı ipucunda
  function slotTile(hid, slot) {
    const uid = hero(hid).equip[slot];
    const sname = D.slots.find((s) => s.id === slot).name;
    const sel = S.sel && S.sel.src !== 'slot' ? item(S.sel.uid) : null;
    const tap = sel && sel.slot === slot && usable(hid, S.sel.uid).ok ? ' tap-ok' : '';
    if (uid) return itemCell(uid, { src: 'slot', drop: `slot:${hid}:${slot}` }).replace('class="gr-item', `class="gr-item mk-tile${tap}`);
    if (slot === 'offhand' && twoHand(hero(hid).equip.weapon)) return `<div class="gr-item empty mk-tile" data-tipt="${sname}" data-tipi="Two-handed weapon"><img class="gr-svg gr-px gr-silhouette" src="${item(hero(hid).equip.weapon).icon}" alt=""></div>`;
    const sub = slot === 'offhand' && !meta(hid).offhand ? 'No shield or dagger' : 'Empty';
    return `<button class="gr-item empty mk-tile${tap}" type="button" data-drop="slot:${hid}:${slot}" data-tipt="${sname}" data-tipi="${sub}">${slotGlyph(slot).replace(' style="--sz:1.3"', '')}</button>`;
  }
  // boş yuva simgesi (art-pipeline): slot-icons/<slot>.webp varsa o (soluk), yoksa eski gölge simge
  const SLOT_ICON = {};
  for (const sl of D.slots) { const im = new Image(); im.onload = () => { SLOT_ICON[sl.id] = im.src; render(); }; im.src = `${A}slot-icons/${sl.id}.webp`; }
  const slotGlyph = (slot) => (SLOT_ICON[slot] ? `<img class="gr-svg mk-sloticon" src="${SLOT_ICON[slot]}" alt="" draggable="false" style="--sz:1.3">` : `<img class="gr-svg gr-px dim" src="${D.glyph[slot]}" alt="" style="--sz:1.3">`);
  const slotsGrid = (hid, ids = D.slots.map((s) => s.id)) => `<div class="gr-slots">${ids.map((s) => slotBtn(hid, s)).join('')}</div>`;
  function levelBlock(hid, o = {}) {
    const h = hero(hid);
    const need = xpToNext(h.level);
    const pend = pendCount(hid), fr = free(hid);
    const idle = fr <= 0 && pend <= 0;
    let warn = '';
    if (pend) {
      const a = attrs(hid), prim = meta(hid).class === 'warrior' ? 'str' : meta(hid).class === 'mage' ? 'int' : meta(hid).class === 'archer' ? 'dex' : 'luck';
      if (ATTR.some((k) => k !== prim && a[k] > a[prim])) warn = `<div class="gr-pts-warn">${esc(D.primaryName[prim])} turns off while another base stat is above ${prim.toUpperCase()}.</div>`;
    }
    return `<div class="gr-lvl"><div class="gr-lvl-head"><span class="gr-lvl-n">Level ${h.level}</span><span class="gr-lvl-xp">${need ? `${h.xp} / ${need} XP` : 'Max level'}</span></div>
      <div class="gr-xpbar"><i style="width:${need ? Math.min(100, Math.round((h.xp / need) * 100)) : 100}%"></i></div>
      <div class="gr-pts${idle ? ' gr-pts-idle' : ''}"${idle ? ' aria-hidden="true"' : ''}><span class="gr-pts-chip${fr > 0 ? '' : ' empty'}" ${fr > 0 ? 'data-ptdrag="1"' : ''} title="Drag onto a stat, or tap + next to it">${fr}</span><span class="gr-pts-text">${fr > 0 ? `stat point${fr === 1 ? '' : 's'} to spend` : 'All points placed'}</span>
      <span class="gr-pts-acts" style="visibility:${pend > 0 ? 'visible' : 'hidden'}"><button class="gr-btn sm" type="button" data-act="reset">Reset</button><button class="gr-btn sm primary" type="button" data-act="confirm">Confirm</button></span></div>${warn}
      ${o.noSkill ? '' : `<div class="gr-pts-skill">${h.skillPoints > 0 ? `${h.skillPoints} skill point${h.skillPoints === 1 ? '' : 's'} for the skill tree` : 'No skill points left'}</div>`}</div>`;
  }
  function statsBlock(hid, o = {}) {
    const h = hero(hid);
    const now = panel(hid);
    const committed = panel(hid, h.equip, false);
    const f = focusUid();
    const dItem = f ? diffFor(hid, f) : null;
    const fr = free(hid);
    const row = (id) => {
      const p = PANEL_META[id];
      const d = dItem ? dItem[id] ?? 0 : Math.round((now[id] - committed[id]) * 10000) / 10000;
      let pm = '';
      if (ATTR.includes(id)) {
        const pendK = h.pending[id] ?? 0;
        const can = canAdd(hid, id);
        // iki düğme yuvası HER ZAMAN yer kaplar: + yerinden oynamaz, puan bitince − + nın yerine geçmez (Ömer 2026-10-18)
        const sub = `<button class="gr-pm-b${pendK > 0 ? '' : ' gr-pm-off'}" type="button" ${pendK > 0 ? `data-sub="${id}" title="Take back a point from ${p.label}"` : 'disabled tabindex="-1" aria-hidden="true"'}>−</button>`;
        const add = `<button class="gr-pm-b${fr > 0 ? '' : ' gr-pm-off'}" type="button" ${fr > 0 ? (can ? `data-add="${id}" title="Add a point to ${p.label}"` : 'disabled title="A base stat can never exceed the sum of the other three"') : 'disabled tabindex="-1" aria-hidden="true"'}>+</button>`;
        pm = `<span class="gr-pm">${sub}${add}</span>`;
      }
      const cls = ATTR.includes(id) && fr > 0 && canAdd(hid, id) ? ' can-add' : '';
      return `<div class="gr-stat${cls}" data-tipt="${esc(STAT_NAME[id] ?? p.label)}" data-stat="${id}"${ATTR.includes(id) ? ` data-attr="${id}"` : ''}><img class="gr-sico" src="${statIco(id)}" alt="" draggable="false"><span class="gr-stat-k">${p.label}</span><span class="gr-stat-v">${fmt(now[id], p.fmt)}</span><span class="gr-stat-d ${d ? (d > 0 ? 'up' : 'down') : ''}">${d ? fmtD(d, p.fmt) : ''}</span>${pm}</div>`;
    };
    // Sheet: HP / MP satırının altında oyunun savaş HUD çubuğu (can yeşil, mana mavi); can = kahramanın şu anki canı
    const vital = (id) => { const f = id === 'hp' ? h.hp : 1; const cur = Math.round(now[id] * f); return `<div class="mk-vital" data-tipt="${id === 'hp' ? 'Health' : 'Mana'}">${row(id).replace(' data-tipt="', ' data-x="').replace(/<span class="gr-stat-v">([^<]*)<\/span>/, `<span class="gr-stat-v mk-cur">${cur} / $1</span>`)}<div class="bh-bar ${id} mk-vbar"><i style="width:${Math.round(f * 100)}%"></i></div></div>`; };
    const grp = (cls, ids) => `<div class="gr-sgrp ${cls}">${ids.map(row).join('')}</div>`;
    return `<div class="gr-sgroups"><div class="gr-sgrp vitals">${D.groups.vitals.map(vital).join('')}</div>${D.groups.panel.map((ids, i) => grp(['base', 'attack', 'defense'][i], ids)).join('')}</div>`;
  }
  const skillsBlock = (hid) => `<div class="gr-skills"><div class="gr-sec">Skills</div>${meta(hid).skillBar}</div>`;

  // ---- skill ağacı (Ömer 2026-10-18): yer tutucu düğüm YOK; kap aynı kalır, ortada "Coming soon"
  const treeBlock = (hid) => `<div class="mk-tree-head gr-sec mk-flex">Skill tree ${skBadge(hid)}</div><div class="mk-tree mk-soon"><span>Coming soon</span></div>`;
  // ---- torba
  function bagBlock(o = {}) {
    const cells = [];
    const hid = S.hero;
    for (let i = 0; i < BAG_SIZE; i++) {
      const uid = S.bag[i];
      const filt = S.filter && uid && !usable(hid, uid).ok;
      const c = uid ? itemCell(uid, { src: 'bag', hid, filtered: filt }) : itemCell(null);
      cells.push(o.priced ? `<div class="gr-cellw">${c}${uid ? price(item(uid).sell) : '<div class="gr-price">&nbsp;</div>'}</div>` : c);
    }
    const title = o.title ?? '';
    return `<div class="gr-inv"><div class="gr-bag-head"><div class="gr-sec gr-has-ico mk-flex" data-tipt="Bag"><img class="gr-ui-ico" src="${D.extra.bag}" alt="" draggable="false">${title}${S.bag.length} / ${BAG_SIZE}</div>
      <button class="gr-chip${S.filter ? ' on' : ''}" type="button" data-act="filter">${S.filter ? `Usable: ${esc(meta().name)}` : 'All items'}</button></div>
      <div class="gr-bag${o.priced ? ' priced' : ''}" data-drop="bag" style="${o.cols ? `--bag-cols:${o.cols}` : ''}">${cells.join('')}</div></div>`;
  }
  // ---- bağlamlar
  const goldHead = () => `<div class="gr-gold gr-has-ico" data-tipt="Gold"><img src="${D.extra.gold}" alt="">${S.gold}</div>`;
  function townCtx() {
    const party = Object.keys(S.heroes);
    const hurt = party.some((hid) => hero(hid).hp < 1);
    return `<div class="mk-ctx">
      <div class="mk-svc"><img class="big" src="${D.extra.rest}" alt=""><div class="mk-svc-t"><div class="mk-svc-n">Rest at the inn</div><div class="mk-svc-s">${S.rested ? 'The company is rested.' : hurt ? 'Every hero recovers all health.' : 'Everyone is at full health.'}</div></div><button class="gr-btn sm${!S.rested && hurt ? ' primary' : ''}" type="button" data-act="rest" ${S.rested || !hurt ? 'disabled' : ''}>Rest</button></div>
      ${party.map((hid) => `<div class="mk-heal-row">${face(hid)}<div><span>${esc(meta(hid).name)}</span><div class="mk-hpbar"><i style="width:${Math.round(hero(hid).hp * 100)}%"></i></div></div><span>${Math.round(hero(hid).hp * 100)}%</span></div>`).join('')}
      <div class="mk-svc"><img class="big" src="${D.extra.formation}" alt=""><div class="mk-svc-t"><div class="mk-svc-n">Formation</div><div class="mk-svc-s">Who stands in front.</div></div><button class="gr-btn sm" type="button" data-act="toast" data-msg="Formation opens here (same window as on the map)">Open</button></div>
      <div class="mk-svc"><div class="mk-recruits"><div class="gr-face" style="background-image:url('${D.extra.paladin_av}')"></div><div class="gr-face" style="background-image:url('${D.extra.druid_av}')"></div></div><div class="mk-svc-t"><div class="mk-svc-n">Recruits</div><div class="mk-svc-s">Party full (4 / 4)</div></div></div>
      <div class="mk-svc"><img class="big" src="${D.extra.merchant_av}" alt="" style="image-rendering:pixelated"><div class="mk-svc-t"><div class="mk-svc-n">Odo's stall</div><div class="mk-svc-s">Trade in the same window.</div></div><button class="gr-btn sm" type="button" data-mode="merchant">Trade</button></div></div>`;
  }
  function campaignCtx() {
    const party = Object.keys(S.heroes);
    const pts = party.reduce((t, hid) => t + hero(hid).statPoints, 0);
    const sk = party.reduce((t, hid) => t + hero(hid).skillPoints, 0);
    return `<div class="mk-ctx"><div class="gr-sec">The Border Road</div><div class="mk-note">Stop 6 of 11 · next: Bandit camp (Elite)</div>
      ${party.map((hid) => `<button class="mk-heal-row mk-herobtn${S.invOpen && hid === S.hero ? ' on' : ''}" type="button" data-openhero="${hid}">${face(hid)}<div><span>${esc(meta(hid).name)} · Lv ${hero(hid).level}</span><div class="mk-hpbar"><i style="width:${Math.round(hero(hid).hp * 100)}%"></i></div></div><span>${ptBadge(hid) || '&nbsp;'}</span></button>`).join('')}
      <div class="mk-note">${pts ? `${pts} stat points and ` : ''}${sk} skill points wait to be spent.</div></div>`;
  }
  function merchantCtx(o = {}) {
    const wares = S.wares.map((uid) => `<div class="gr-cellw">${uid ? itemCell(uid, { src: 'ware', hid: S.hero }) + price(item(uid).value, item(uid).value > S.gold) : `<div class="gr-item empty sold"></div><div class="gr-price">Sold</div>`}</div>`).join('');
    const tab = S.shopTab === 'buyback' ? 'buyback' : 'sell';
    const tabs = `<div class="gr-tabs mk-shoptabs" role="tablist">${[['sell', 'Buy &amp; Sell'], ['buyback', 'Buyback']].map(([k, n]) => `<button class="gr-tab${tab === k ? ' on' : ''}" type="button" data-shoptab="${k}">${n}${k === 'buyback' && S.buyback.length ? ` <span class="mk-pt sk">${S.buyback.length}</span>` : ''}</button>`).join('')}</div>`;
    const pane = tab === 'sell'
      ? `<div class="mk-sellbox mk-drop" data-drop="stall"><img src="${D.extra.gold}" alt=""><div>Drag an item here from the bag or a hero to sell it for half its worth.<i>Or tap the item and choose Sell.</i></div></div>`
      : S.buyback.length ? `<div class="gr-bb-row">${S.buyback.map((uid) => `<div class="gr-cellw">${itemCell(uid, { src: 'bb', hid: S.hero })}${price(item(uid).sell, item(uid).sell > S.gold)}</div>`).join('')}</div><div class="mk-note">Sold this visit. Buy back for the price you sold at, until you leave.</div>`
      : '<div class="gr-card-empty">Sold something by mistake? It waits here until you leave.</div>';
    const buy = `<div class="gr-sec mk-flex">Wares<button class="gr-btn sm gr-reroll mk-r" type="button" data-act="reroll" title="Reroll wares" aria-label="Reroll wares" data-tipt="Reroll wares" ${S.gold < 15 ? 'disabled' : ''}>${REROLL_SVG}<span class="gr-cost"><img class="gr-price-ico" src="${D.extra.gold}" alt="">15</span></button></div>
      <div class="gr-wares" style="--ware-cols:${o.cols ?? 3}">${wares}</div>`;
    return `<div class="mk-ctx gr-stall mk-stall" data-drop="stall"><div class="gr-odo"><div class="gr-face" style="background-image:url('${D.extra.merchant_av}')"></div><div class="gr-odo-line">Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.</div></div>
      ${tabs}<div class="mk-shoppane">${tab === 'sell' ? buy : ''}${pane}</div></div>`;
  }
  function rewardCards(o = {}) {
    const R = S.reward;
    const uid = D.reward[0];
    const it = item(uid);
    const taken = R.taken;
    // oyundaki kart (EndlessScene > usableRow): silahsa takabilenlerin küçük portreleri (ad yok), değilse "Any hero"
    const ok = Object.keys(S.heroes).filter((hid) => usable(hid, uid).ok || usable(hid, uid).lvl);
    const who = it.slot !== 'weapon' ? '<div class="mk-cs">Any hero</div>' : ok.length ? ok.map((hid) => face(hid)).join('') : '<div class="mk-cs" style="color:#e0907a">No one in your party can wield this</div>';
    const lines = (it.tip.h1.match(/<div class="it-lines">[\s\S]*?<\/div><\/div>(?=<div class="it-(value|effect)")/) || [''])[0];
    const card1 = `<div class="mk-card${taken === 0 ? ' taken' : taken !== null ? ' dim' : ''}" style="--ac:${it.color}" data-card="0"><div class="mk-sell"><span>Sell: ${it.sell}</span><img src="${D.extra.gold}" alt=""></div><div class="mk-kick">Spoils</div>
      <div class="mk-medal" data-tip="${uid}" data-src="reward"><img src="${it.icon}" alt="" style="image-rendering:pixelated"></div><div class="mk-cn" style="color:${it.color}">${esc(it.name)}</div><div class="mk-cs">${esc(it.sub)}</div><div class="mw-stats">${lines}</div>
      <div class="mk-who"><div class="mk-kick">Usable by</div><div class="mk-who-row mk-usable">${who}</div></div></div>`;
    const gold = 38;
    const card2 = `<div class="mk-card${taken === 1 ? ' taken' : taken !== null ? ' dim' : ''}" style="--ac:#c9a050" data-card="1"><div class="mk-kick">Coin</div><div class="mk-medal"><img src="${D.extra.gold}" alt=""></div><div class="mk-big">+${gold}</div><div class="mk-kick" style="letter-spacing:.2em">Gold</div><div class="mk-ct">Coin for the merchant who comes after every 5th wave.</div><div class="mk-ct" style="margin-top:auto">Purse ${S.gold} → ${S.gold + (taken === 1 ? 0 : gold)}</div></div>`;
    const card3 = `<div class="mk-card${taken === 2 ? ' taken' : taken !== null ? ' dim' : ''}" style="--ac:#d96a5a" data-card="2"><div class="mk-kick">Rest</div><div class="mk-medal"><img src="${D.extra.heal}" alt=""></div><div class="mk-big">+20%</div><div class="mk-ct">Every hero recovers 20% of their health.</div>
      <div class="mk-heal-rows">${Object.keys(S.heroes).map((hid) => { const h = hero(hid); const a = Math.round(h.hp * 100), b = Math.min(100, a + (taken === 2 ? 0 : 20)); return `<div class="mk-heal-row">${face(hid)}<div><span>${esc(meta(hid).name)}</span><div class="mk-hpbar"><i style="width:${a}%"></i></div></div><span>${a}% → ${b}%</span></div>`; }).join('')}</div></div>`;
    return `<div class="mk-cards${o.rows ? ' rows' : ''}${o.compact ? ' compact' : ''}"${o.style ? ` style="${o.style}"` : ''}>${card1}${card2}${card3}</div>`;
  }
  // Envanter yalnızca karakterle ilgilidir (Ömer 2026-10-18): başlık hep "Gear"; dış etmenler (harita, kasaba, tüccar, ödül) kendi penceresinde
  const head = () => `<div class="gr-head"><div class="gr-head-l"><div class="gr-title">Gear</div></div>${S.mode === 'merchant' && S.invOpen ? '' : goldHead()}</div>`;
  function foot() {
    const hint = S.sel ? `Selected: <b style="color:${item(S.sel.uid).color}">${esc(item(S.sel.uid).name)}</b> · tap a hero or a slot to equip` : S.mode === 'merchant' ? 'Drag between the stall and the bag to buy or sell' : S.mode === 'reward' ? 'Tap a reward on the left to take it · drag an item to the trash to make room' : 'Drag items onto a hero or a slot · double-click equips';
    return `<div class="gr-foot"><div class="mk-hint">${hint}</div><button class="gr-btn primary" type="button" data-act="done">${S.mode === 'none' ? 'Done' : S.mode === 'reward' ? 'Close bag' : 'Close'}</button></div>`;
  }
  // ---- dış pencereler (envanterden AYRI; envanter yanında açık kalabilir)
  const gearToggle = () => `<button class="mk-ib${S.invOpen ? ' on sel' : ''}" type="button" data-act="inv" data-tipt="Gear" data-tipi="${S.invOpen ? 'Hide the gear window' : 'Open heroes and bag'}"><img src="${D.extra.gear}" alt=""></button>`;
  const formBtn = () => `<button class="mk-ib${S.dlg?.kind === 'formation' ? ' on sel' : ''}" type="button" data-act="formation" data-tipt="Formation" data-tipi="Who stands in front"><img src="${D.extra.formation}" alt=""></button>`;
  const encFoot = (primary, extra = '') => `<div class="gr-foot"><div class="mk-hint">${extra}</div><button class="gr-btn primary" type="button" data-act="encdone">${primary}</button></div>`;
  function encWindow() {
    const m = S.mode;
    if (m === 'none') return '';
    if (m === 'merchant') return `<div class="gr-panel gr-gear gr-shop mk-enc mk-enc-shop"><div class="gr-head"><div class="gr-head-l"><div class="gr-title">Odo the Peddler</div></div>${goldHead()}</div><div class="gr-shop-sub" style="margin-top:calc(-6 * var(--u))">Travelling merchant · follows the company</div><div class="mk-enc-b mk-scroll">${merchantCtx({ cols: 3 })}</div></div>`;
    return ''; // kasaba ve ödül: pencere değil, sahnenin kendisi (townLayer / rewardLayer)
  }
  const priced = () => S.mode === 'merchant';
  // sefer haritası: haritanın kendi sol takım sütunu (oyundaki "war table"); envanter bunun ÜSTÜNE tam sayfa açılır (Ömer 2026-10-18)
  const mapLayer = () => `<div class="mk-layer mk-maplayer"><div class="mk-enc mk-enc-map"><div class="mk-maphead"><b>I · The Border Road</b><i>Normal · Medium</i></div>${campaignCtx().replace('<div class="gr-sec">The Border Road</div>', '<div class="gr-sec">Your party</div>')}<div class="mk-note">Tap a hero to open their gear.</div></div></div>`;
  // Gear + Formation: seferin HER ekranında aynı yerde (sol alt; Ömer 2026-10-18 "global olsun"); envanter ya da küçük pencere açıkken gizli
  const campHud = () => (['map', 'town', 'merchant'].includes(S.mode) && !S.invOpen && !S.dlg ? `<div class="mk-camphud">${gearToggle()}${formBtn()}</div>` : '');
  // sağ üst X (nav-icons.ts dilinde: aynı 44 px alan, 30 px çerçeve, 1.6 çizgi); envanterin Close / Done düğmesi ve alt çubuğu yerine
  // pencerenin kendi sağ üst köşesindeki X (tüccar, küçük pencereler): sağ üst nav düğmeleriyle aynı kare dil
  const winX = (act, tip) => `<button class="nav-btn mk-x" type="button" title="${tip}" aria-label="${tip}" data-act="${act}">${X_SVG}</button>`;
  const REROLL_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M19.5 4v4.5H15"/></svg>';
  const X_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';
  const invShown = () => S.v === 'v3' && !S.dlg && (S.mode === 'none' || S.invOpen && S.mode !== 'reward' || S.mode === 'reward' && S.rbag);
  // ---- kasaba sahnesi (oyundaki TownScreen, src/game/town-screen.ts): tam ekran görsel, resimdeki yerler (valdoria.json > Ashford scene.hotspots)
  //      tıklanınca KENDİ küçük penceresini açar; önde takım (dokun = o kahramanın envanteri). Sol altta Gear + Formation (Ömer 2026-10-18).
  const TOWN = { w: 1599, h: 1066, focusY: 0.58, spots: [
    { id: 'stall', act: 'trade', label: "Odo's Stall", r: [0, 0.3, 0.262, 0.62] },
    { id: 'burner', act: 'story', label: 'Charcoal Burner', r: [0.29, 0.47, 0.385, 0.63] },
    { id: 'campfire', act: 'rest', label: 'Campfire', r: [0.385, 0.42, 0.57, 0.63] },
    { id: 'board', act: 'recruit', label: 'Notice Board', r: [0.585, 0.405, 0.67, 0.58], note: 'Notices of burned farms and missing travellers. No one here seeks to join a company. Recruits gather in the cities.' },
    { id: 'road', act: 'leave', label: 'Road Out', r: [0.9, 0.34, 1, 0.6] },
  ] };
  function townLayer() {
    const w = window.innerWidth, h = window.innerHeight;
    const gu = Math.min(h / 1080, w / 1920);
    const phone = h <= 720;
    const sc = Math.max(w / TOWN.w, h / TOWN.h);
    const ox = (w - TOWN.w * sc) / 2, oy = (h - TOWN.h * sc) * TOWN.focusY;
    const fs = Math.max(12, (phone ? 34 : 21) * gu);
    const spots = TOWN.spots.map((t) => {
      const x = ox + t.r[0] * TOWN.w * sc, y = oy + t.r[1] * TOWN.h * sc, rw = (t.r[2] - t.r[0]) * TOWN.w * sc, rh = (t.r[3] - t.r[1]) * TOWN.h * sc;
      const lx = Math.min(w - 70, Math.max(70, x + rw / 2)), ly = Math.max(150 * gu, y + 4);
      return `<button class="mk-hot" type="button" data-hot="${t.id}" aria-label="${esc(t.label)}" style="left:${x}px;top:${y}px;width:${rw}px;height:${rh}px"></button>
        <button class="mk-hotlab" type="button" data-hot="${t.id}" style="left:${lx}px;top:${ly}px;font-size:${fs}px">${esc(t.label)}</button>`;
    }).join('');
    const ids = Object.keys(S.heroes);
    const k = phone ? 1.15 : 1;
    const hh = 250 * gu * k, gap = 230 * gu * k, feet = h * (phone ? 0.86 : 0.9);
    const heroes = ids.map((hid, i) => {
      const x = w / 2 + (i - (ids.length - 1) / 2) * gap;
      return `<button class="mk-thero" type="button" data-openhero="${hid}" style="left:${x - gap * 0.42}px;top:${feet - hh}px;width:${gap * 0.84}px;height:${hh + Math.max(18, 30 * gu)}px"><img src="${A}poses/${meta(hid).class}.webp" alt="" draggable="false" style="height:${hh}px"><span class="mk-thn" style="font-size:${Math.max(11, 18 * gu)}px">${esc(meta(hid).name)}</span>${ptBadge(hid)}</button>`;
    }).join('');
    return `<div class="mk-layer mk-town">${spots}${heroes}</div>`;
  }
  function townHot(id) {
    const t = TOWN.spots.find((x) => x.id === id);
    if (!t) return;
    if (t.act === 'trade') return setMode('merchant');
    if (t.act === 'rest') S.dlg = { kind: 'note', title: t.label, text: 'Your company has rested: everyone healed and revived.' };
    else if (t.act === 'recruit') S.dlg = { kind: 'note', title: t.label, text: t.note };
    else if (t.act === 'story') return toast('The Charcoal Burner scene plays again (mockup)');
    else return toast('Leaves Ashford for the road (mockup)');
    S.invOpen = false; unpin(); render();
  }
  // ---- küçük pencereler (oyundaki openModal / townNote): başlık, kısa metin, Close; zemine dokunmak kapatır
  function dlgHtml() {
    const d = S.dlg;
    const sub = S.mode === 'map' ? 'I · The Border Road' : 'Ashford Village';
    if (d.kind === 'note') return `<div class="gr-panel mk-dlg" data-dlg="1"><div class="gr-title">${esc(d.title)}</div><div class="gr-shop-sub">${sub}</div><p class="mk-dlg-t">${esc(d.text)}</p></div>`;
    // Formation (oyundaki campaign-panels > openFormation): 4 x 3 ızgara, ön sıra SAĞDA; sürükle ya da dokun-dokun
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const who = Object.keys(S.form).find((hid) => S.form[hid][0] === c && S.form[hid][1] === r);
      cells.push(`<div class="mk-fcell${c === 3 ? ' front' : ''}${S.fsel && S.fsel !== who ? ' tap-ok' : ''}" data-fcell="${c},${r}">${who ? `<button class="mk-fhero${S.fsel === who ? ' on' : ''}" type="button" data-fhero="${who}" data-tipt="${esc(meta(who).name)}">${face(who)}</button>` : ''}</div>`);
    }
    return `<div class="gr-panel mk-dlg mk-form" data-dlg="1"><div class="gr-title">Formation</div><div class="gr-shop-sub">Drag a hero to a new place, or tap a hero and then a cell.</div>
      <div class="mk-fgrid">${cells.join('')}</div><div class="mk-frow"><span>Back</span><span>Front</span></div></div>`;
  }
  function moveForm(hid, c, r) {
    const other = Object.keys(S.form).find((x) => x !== hid && S.form[x][0] === c && S.form[x][1] === r);
    if (other) S.form[other] = [...S.form[hid]];
    S.form[hid] = [c, r];
    S.fsel = null;
  }
  // ---- ödül (oyundaki EndlessScene > drawReward): başlık + kartlar (bütün kart = al) + "View bag"; yapı DEĞİŞMEDİ
  function rewardLayer() {
    const taken = S.reward.taken;
    return `<div class="mk-layer mk-rw"><div class="mk-rw-head"><div class="mk-rw-t">Victory</div><div class="mk-rw-s">Wave 6 cleared. Choose one reward.</div></div>${rewardCards({})}
      <div class="mk-rw-foot"><button class="gr-btn" type="button" data-act="viewbag"><img class="gr-ui-ico" src="${D.extra.bag}" alt="">View bag · ${S.bag.length}/${BAG_SIZE}</button>${taken !== null ? '<button class="gr-btn primary" type="button" data-act="encdone">Continue</button>' : ''}</div></div>`;
  }
  // View bag: kartlar küçük ikon olarak SOLDA (oyundaki reward-bag.ts rb-tiles); sağda artık ortak envanter (v3). İkona dokunmak = o ödülü al
  function rbTiles() {
    const uid = D.reward[0], it = item(uid), taken = S.reward.taken;
    const tiles = [
      `<span class="rb-medal" style="--rc:${it.color}"><img class="gr-svg gr-px" src="${it.icon}" alt=""></span><span class="rb-label" style="color:${it.color}">${esc(it.name)}</span>`,
      `<span class="rb-medal" style="--rc:#ecc878"><img class="rb-emblem" src="${D.extra.gold}" alt=""></span><span class="rb-label">+38 gold</span>`,
      `<span class="rb-medal" style="--rc:#d96a5a"><img class="rb-emblem" src="${D.extra.heal}" alt=""></span><span class="rb-label">Heal 20%</span>`,
    ];
    const tipOf = (i) => (i === 0 ? ` data-tip="${uid}" data-src="reward"` : ` data-tipt="${i === 1 ? '+38 gold' : 'Heal 20%'}" data-tipi="${i === 1 ? 'Coin for the merchant' : 'Every hero recovers 20% of their health'}"`);
    return `<div class="rb-tiles mk-rbtiles"><div class="gr-sec">Rewards</div>${tiles.map((t, i) => `<button class="rb-tile${taken !== null ? ' blocked' : ''}" type="button" data-rbtake="${i}" style="--i:${i}"${tipOf(i)}>${t}</button>`).join('')}</div>`;
  }


  // ---------------------------------------------------------------- düzenler (yalnızca kahramanlar, yuvalar, level / statlar, skill'ler, ağaç, torba)
  const L = {};
  L.v1 = () => {
    const tab = S.tab.v1;
    const tabs = `<div class="gr-tabs" role="tablist"><button class="gr-tab${tab === 'stats' ? ' on' : ''}" type="button" data-tab="v1:stats">Stats</button><button class="gr-tab${tab === 'skills' ? ' on' : ''}" type="button" data-tab="v1:skills">Skills</button><button class="gr-tab${tab === 'tree' ? ' on' : ''}" type="button" data-tab="v1:tree">Skill tree ${skBadge(S.hero)}</button></div>`;
    const lower = tab === 'stats' ? levelBlock(S.hero) + statsBlock(S.hero) : tab === 'skills' ? skillsBlock(S.hero) : treeBlock(S.hero);
    return `<div class="gr-panel gr-gear mk mk-v1">${head()}<div class="gr-body"><div class="mk-col mk-c1 mk-scroll">${heroList({})}</div><div class="mk-col mk-c2 mk-scroll"><div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}${tabs}${lower}</div><div class="mk-col">${bagBlock({ priced: priced(), cols: 5 })}</div></div>${foot()}</div>`;
  };
  L.v2 = () => {
    let tab = S.tab.v2;
    if (!['equip', 'attr', 'tree'].includes(tab)) tab = S.tab.v2 = 'equip';
    const rail = `<div class="mk-rail">${Object.keys(S.heroes).map((hid) => heroCard(hid, {})).join('')}</div>`;
    const tb = (id, icon, name, badge = '') => `<button class="mk-ib${tab === id ? ' on sel' : ''}" type="button" data-tab="v2:${id}" data-tipt="${name}"><img src="${icon}" alt="">${badge}</button>`;
    const vt = `<div class="mk-vtabs">${tb('equip', D.extra.gear, 'Equipment')}${tb('attr', statIco('str'), 'Attributes', ptBadge(S.hero))}${tb('tree', D.extra.passive, 'Skill tree', skBadge(S.hero))}</div>`;
    const pane = tab === 'equip' ? `<div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}${skillsBlock(S.hero)}` : tab === 'attr' ? levelBlock(S.hero) + `<div class="gr-sec">Stats</div>` + statsBlock(S.hero) : treeBlock(S.hero);
    return `<div class="gr-panel gr-gear mk mk-v2">${head()}<div class="gr-body">${rail}${vt}<div class="mk-col mk-pane mk-scroll">${pane}</div><div class="mk-col">${bagBlock({ priced: priced(), cols: 6 })}</div></div>${foot()}</div>`;
  };
  L.v3 = () => {
    let tab = S.tab.v3;
    if (!['hero', 'sheet'].includes(tab)) tab = S.tab.v3 = 'hero';
    const marks = `<div class="mk-marks">${Object.keys(S.heroes).map((hid) => `<button class="mk-mark${hid === S.hero ? ' on' : ''}" type="button" data-hero="${hid}" data-drop="hero:${hid}" data-tipt="${esc(meta(hid).name)}" data-tipi="${esc(heroLine(hid, focusUid()).html.replace(/<[^>]+>/g, ''))}">${face(hid)}${ptBadge(hid)}</button>`).join('')}</div>`;
    const tabs = `<div class="gr-tabs mk-headtabs" role="tablist">${[['hero', 'Hero'], ['sheet', 'Sheet']].map(([k, n]) => `<button class="gr-tab${tab === k ? ' on' : ''}" type="button" data-tab="v3:${k}">${n}${k === 'sheet' ? ' ' + skBadge(S.hero) : ''}</button>`).join('')}</div>`;
    const l = tab === 'hero' ? `<div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}${skillsBlock(S.hero)}` : levelBlock(S.hero) + `<div class="gr-sec">Stats</div>` + statsBlock(S.hero);
    const narrow = document.documentElement.classList.contains('short') && (S.mode === 'merchant' || S.rbag);
    const r = tab === 'hero' ? bagBlock({ priced: priced(), cols: narrow ? 4 : 6 }) : treeBlock(S.hero);
    const n = tab === 'hero' ? [1, 2] : [3, 4];
    const hd = `<div class="gr-head mk-v3head"><div class="gr-title">Gear</div>${tabs}<span class="mk-grow"></span>${S.mode === 'merchant' && S.invOpen ? '' : goldHead()}</div>`;
    return `<div class="gr-panel gr-gear mk mk-v3">${hd}<div class="gr-body" style="grid-template-rows:minmax(0,1fr)">${marks}<div class="mk-col mk-page mk-scroll">${l}<div class="mk-folio">· ${n[0]} ·</div></div><div class="mk-spine"></div><div class="mk-col mk-page r mk-scroll">${r}<div class="mk-folio">· ${n[1]} ·</div></div></div></div>`;
  };
  L.v4 = () => {
    const doll = `<div class="mk-doll"><div class="mk-dcol">${['helm', 'armor', 'gloves', 'boots'].map((x) => slotBtn(S.hero, x)).join('')}</div><div class="mk-portrait" style="background-image:url('${meta().avatar}')"><div class="mk-pname">${esc(meta().name)}</div></div><div class="mk-dcol">${['weapon', 'offhand', 'trinket'].map((x) => slotBtn(S.hero, x)).join('')}</div></div>`;
    const heroes = Object.keys(S.heroes).map((hid) => heroCard(hid, { compact: true, tipName: true })).join('');
    const left = `<div class="mk-col mk-scroll mk-narrow">${levelBlock(S.hero)}${statsBlock(S.hero)}</div>`;
    const center = `<div class="mk-col mk-center mk-scroll"><div class="mk-herorow">${heroes}<button class="gr-btn sm" type="button" data-act="sheet">Hero sheet ${skBadge(S.hero)}</button></div>${doll}</div>`;
    const shelf = `<div class="mk-shelf">${bagBlock({ priced: priced(), cols: 15 })}</div>`;
    const sheet = S.sheet ? `<div class="mk-sheet"><div class="gr-head"><div class="gr-head-l"><div class="gr-title">${esc(meta().name)}</div><div class="gr-shop-sub">Hero sheet · Level ${hero().level}</div></div><button class="gr-btn primary" type="button" data-act="sheet">Close</button></div><div class="mk-sheet-b"><div class="mk-col mk-scroll">${levelBlock(S.hero)}${statsBlock(S.hero)}</div><div class="mk-col mk-scroll">${treeBlock(S.hero)}${skillsBlock(S.hero)}</div></div></div>` : '';
    return `<div class="gr-panel gr-gear mk mk-v4" style="position:relative">${head()}<div class="gr-body">${left}${center}${shelf}</div>${foot()}${sheet}</div>`;
  };
  L.v5 = () => {
    const tab = S.tab.v5;
    const cols = Object.keys(S.heroes).map((hid) => (hid === S.hero ? '2.2fr' : '1fr')).join(' ');
    const cards = Object.keys(S.heroes).map((hid) => {
      const on = hid === S.hero;
      const h = hero(hid);
      const line = heroLine(hid, focusUid());
      const tap = S.sel && S.sel.src !== 'slot' && usable(hid, S.sel.uid).ok ? ' tap-ok' : '';
      const hdr = `<div class="mk-sq-h">${face(hid)}<div class="gr-hero-meta"><div class="gr-hero-name">${esc(meta(hid).name)}</div><div class="gr-hero-sub tone-${line.tone}">${line.html}</div></div><span style="margin-left:auto;display:flex;gap:4px">${ptBadge(hid)}${skBadge(hid)}</span></div>
        <div><div class="mk-hpbar"><i style="width:${Math.round(h.hp * 100)}%"></i></div><div class="gr-xpbar"><i style="width:${Math.round((h.xp / xpToNext(h.level)) * 100)}%"></i></div></div>`;
      if (!on) {
        const dots = `<div class="mk-dots">${D.slots.map((x) => (h.equip[x.id] ? itemCell(h.equip[x.id], { src: 'x' }) : `<div class="gr-item empty"></div>`)).join('')}</div>`;
        const p = panel(hid);
        const mini = `<div class="mk-mini-stats gr-sgroups">${['hp', 'mp', 'armor', 'spd'].map((id) => `<div class="gr-stat"><img class="gr-sico" src="${statIco(id)}" alt=""><span class="gr-stat-k">${PANEL_META[id].label}</span><span class="gr-stat-v">${fmt(p[id], PANEL_META[id].fmt)}</span></div>`).join('')}</div>`;
        return `<div class="mk-sq${tap} mk-drop" data-hero="${hid}" data-drop="hero:${hid}">${hdr}${dots}${mini}</div>`;
      }
      const sub = tab === 'gear' ? `<div class="mk-col" style="display:grid;grid-template-columns:calc(290 * var(--u)) minmax(0,1fr);gap:calc(18 * var(--u))"><div class="mk-tiles">${D.slots.map((x) => slotTile(hid, x.id)).join('')}</div><div class="mk-narrow">${levelBlock(hid, { noSkill: true })}${statsBlock(hid)}</div></div>` : `<div class="mk-col">${treeBlock(hid)}${skillsBlock(hid)}</div>`;
      return `<div class="mk-sq on mk-scroll" data-drop="hero:${hid}">${hdr}<div class="mk-sqtabs gr-tabs"><button class="gr-tab${tab === 'gear' ? ' on' : ''}" type="button" data-tab="v5:gear">Gear</button><button class="gr-tab${tab === 'skills' ? ' on' : ''}" type="button" data-tab="v5:skills">Skills &amp; tree</button></div>${sub}</div>`;
    }).join('');
    return `<div class="gr-panel gr-gear mk mk-v5">${head()}<div class="gr-body"><div class="mk-squad" style="grid-template-columns:${cols}">${cards}</div><div class="mk-bottom mk-col">${bagBlock({ priced: priced(), cols: 15 })}</div></div>${foot()}</div>`;
  };

  // ---------------------------------------------------------------- sahne
  const stage = $('#stage');
  const root = $('#ui-root');
  let overlay;
  const focusUid = () => S.hover ?? S.drag?.uid ?? S.sel?.uid ?? null;
  function render() {
    const keep = [...document.querySelectorAll('.mk-scroll, .gr-bag')].map((e) => e.scrollTop);
    const bg = { none: 'bg/map.webp', map: 'bg/map.webp', town: 'bg/town.webp', merchant: 'bg/town.webp', reward: 'bg/endless.webp' }[S.mode];
    $('#bgimg').style.backgroundImage = `url('${A}${bg}')`;
    const st = { none: ['Valdoria', 'I · The Border Road'], map: ['Valdoria', 'I · The Border Road'], town: ['Ashford Village', 'Town · Rest, Recruits, Trade'], merchant: ['Ashford Village', "Odo's stall"], reward: ['Endless', 'Wave 6'] }[S.mode];
    // sahnenin kendisi (kasaba / ödül ekranı) örtünün ALTINDA; örtü yalnızca bir pencere açıkken kararır
    const layer = S.mode === 'town' ? townLayer() : S.mode === 'map' ? mapLayer() : S.mode === 'reward' && !S.rbag ? rewardLayer() : '';
    let inner;
    if (S.mode === 'town' || S.mode === 'map') inner = S.invOpen ? `<div class="mk-duo">${L[S.v]()}</div>` : '';
    else if (S.mode === 'reward') inner = S.rbag ? `<div class="mk-duo pair mk-rbduo">${rbTiles()}${L[S.v]()}</div>` : '';
    else inner = `<div class="mk-duo${S.mode === 'none' ? '' : S.invOpen ? ' pair' : ' solo'}">${encWindow()}${S.mode === 'none' || S.invOpen ? L[S.v]() : ''}</div>`;
    // küçük pencere (Formation / not) açık olanın ÜSTÜNE gelir; haritanın sol sütunu arkada görünür kalır
    if (S.dlg) inner = (inner || '') + `<div class="mk-duo mk-dlgwrap${inner ? ' over' : ''}">${dlgHtml()}</div>`;
    // bir pencere açıkken X, Menu'nün yerinde durur (Menu gizli); en üstteki pencereyi kapatır
    const winOpen = !!S.dlg || invShown() || S.mode === 'merchant';
    const closeAct = S.dlg ? 'dlgclose' : invShown() ? 'done' : 'encdone';
    const html = `${S.mode === 'reward' ? '' : `<div class="mk-scene-title"><b>${st[0]}</b><i>${st[1]}</i></div>`}${layer}<div class="gr-overlay el-modal mk-ov enc-${S.mode}${inner ? '' : ' mk-empty'}${invShown() ? ' mk-top' : ''}" role="dialog">${inner}<div class="el-tip item-tip" role="tooltip"></div><div class="mk-tip"></div><div class="mk-toast"></div>
      <div class="gr-trash" data-drop="trash" data-tipt="Discard"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div></div>
      ${campHud()}
      <button class="nav-btn settings-toggle fullscreen-toggle" type="button" title="Fullscreen" aria-label="Fullscreen" data-act="fs">${D.nav['fs-enter']}</button>
      ${winOpen ? `<button class="nav-btn settings-toggle mk-close" type="button" title="Close" aria-label="Close" data-act="${closeAct}">${X_SVG}</button>` : `<button class="nav-btn settings-toggle menu-toggle" type="button" title="Menu (Esc)" aria-label="Menu (Esc)" data-act="menu">${D.nav.menu}</button>`}`;
    root.innerHTML = html;
    overlay = $('.mk-ov');
    // açılış solması (oyunun .el-modal animasyonu) yalnızca ilk açılışta / düzen ya da mod değişince oynasın;
    // yoksa her yeniden çizimde (ör. item üstüne gelince) tüm pencere 0 opaklıktan yeniden solup yanıp söner
    const sceneKey = `${S.v}|${S.mode}|${S.invOpen}|${S.rbag}|${S.dlg?.kind ?? ''}`;
    if (sceneKey === render.key) overlay.classList.add('mk-still');
    render.key = sceneKey;
    // savaş HUD birimi: oyundaki gibi skill çubuğu zoom = --gu (character-panel.ts > hudScale); ağaç aynı hücre, biraz küçük
    const gu = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu')) || 1;
    const fit = (e, max) => {
      e.style.zoom = String(max);
      const w0 = e.style.width;
      e.style.width = 'max-content';
      const need = e.getBoundingClientRect().width, have = e.parentElement.clientWidth;
      e.style.width = w0;
      if (need > have && have > 0) e.style.zoom = String(max * (have / need) * 0.98);
    };
    root.querySelectorAll('.gr-skills .gr-skillbar').forEach((b) => { const p = b.querySelector('.bh-sk-pasv'); if (p) b.prepend(p); });
    root.querySelectorAll('.gr-skillbar').forEach((e) => fit(e, gu));
    [...document.querySelectorAll('.mk-scroll, .gr-bag')].forEach((e, i) => (e.scrollTop = keep[i] ?? 0));
    stripSync();
    if (S.pinned) { const a = overlay.querySelector(`[data-tip="${S.pinned}"]`); if (a) pinTip(S.pinned, a); else S.pinned = null; }
  }
  // sahne ölçüsü: oyundaki gibi --gu = sahne yüksekliği / 1080 (16:9'dan dar ekranda genişlik / 1920); kısa ekran sınıfları
  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    const gu = Math.min(h / 1080, w / 1920);
    const de = document.documentElement;
    de.style.setProperty('--gu', `${gu}px`);
    de.classList.toggle('short', h <= 520);
    de.classList.toggle('compact', h <= 720);
    de.classList.add('menu-btn-on');
    const coarse = matchMedia('(pointer: coarse)').matches;
    const k = coarse ? 1 : Math.min(1.75, Math.max(1, Math.round((h / 640) / 0.05) * 0.05));
    de.style.setProperty('--nav-k', String(k));
  }

  // ---------------------------------------------------------------- eylemler
  const toast = (msg, bad) => { const t = $('.mk-toast'); if (!t) return; t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1700); };
  const removeFrom = (arr, uid) => { const i = arr.indexOf(uid); if (i >= 0) arr.splice(i, 1); return i >= 0; };
  const ownerOf = (uid) => { for (const [hid, h] of Object.entries(S.heroes)) for (const [s, u] of Object.entries(h.equip)) if (u === uid) return { hid, slot: s }; return null; };
  function equip(hid, uid, viaSlot) {
    const it = item(uid);
    if (viaSlot && viaSlot !== it.slot) return toast(`${it.name} goes in the ${D.slots.find((s) => s.id === it.slot).name} slot`, true), false;
    const u = usable(hid, uid);
    if (!u.ok) return toast(`${meta(hid).name}: ${u.why}`, true), false;
    const h = hero(hid);
    const old = ownerOf(uid);
    const out = [];
    const prev = h.equip[it.slot];
    if (prev && prev !== uid) out.push(prev);
    if (it.slot === 'weapon' && twoHand(uid) && h.equip.offhand) out.push(h.equip.offhand);
    if (it.slot === 'offhand' && twoHand(h.equip.weapon)) out.push(h.equip.weapon);
    const fromBag = S.bag.includes(uid);
    const room = BAG_SIZE - S.bag.length + (fromBag ? 1 : 0);
    if (out.length > room && !(old && out.length === 1)) return toast('The bag is full', true), false;
    if (fromBag) removeFrom(S.bag, uid);
    if (old) delete S.heroes[old.hid].equip[old.slot];
    for (const o of out) { for (const s of Object.keys(h.equip)) if (h.equip[s] === o) delete h.equip[s]; if (old && out.length === 1 && old.hid !== hid) S.heroes[old.hid].equip[old.slot] = o; else S.bag.push(o); }
    h.equip = equipAfter(hid, uid);
    for (const o of out) for (const s of Object.keys(h.equip)) if (h.equip[s] === o) delete h.equip[s];
    S.hero = hid;
    return true;
  }
  function unequip(uid) {
    const o = ownerOf(uid);
    if (!o) return;
    if (S.bag.length >= BAG_SIZE) return toast('The bag is full', true);
    delete S.heroes[o.hid].equip[o.slot];
    S.bag.push(uid);
  }
  function buy(uid, then) {
    const it = item(uid);
    if (it.value > S.gold) return toast(`Not enough gold (${it.value})`, true), false;
    if (!then && S.bag.length >= BAG_SIZE) return toast('The bag is full', true), false;
    if (then) { const u = usable(then.hid, uid); if (!u.ok) return toast(`${meta(then.hid).name}: ${u.why}`, true), false; }
    S.gold -= it.value;
    S.wares[S.wares.indexOf(uid)] = null;
    S.bag.push(uid);
    if (then) equip(then.hid, uid);
    toast(`Bought ${it.name}`);
    return true;
  }
  function buyBack(uid, then) {
    const it = item(uid);
    if (it.sell > S.gold) return toast('Not enough gold', true);
    S.gold -= it.sell; removeFrom(S.buyback, uid); S.bag.push(uid);
    if (then) equip(then.hid, uid);
  }
  function sell(uid) {
    if (S.mode !== 'merchant') return;
    const o = ownerOf(uid);
    if (o) delete S.heroes[o.hid].equip[o.slot]; else removeFrom(S.bag, uid);
    S.gold += item(uid).sell; S.buyback.unshift(uid); S.buyback = S.buyback.slice(0, 4);
    toast(`Sold ${item(uid).name} for ${item(uid).sell} gold`);
  }
  function discard(uid) {
    const it = item(uid);
    const go = () => { const o = ownerOf(uid); if (o) delete S.heroes[o.hid].equip[o.slot]; else removeFrom(S.bag, uid); S.sel = null; render(); toast(`Discarded ${it.name}`); };
    if (it.k >= 2) return confirmIn(`Discard ${it.name}? It is gone for good.`, 'Discard', go);
    go();
  }
  function confirmIn(text, ok, run) {
    const box = document.createElement('div');
    box.className = 'gr-confirm';
    box.innerHTML = `<div class="gr-confirm-card"><div class="gr-confirm-text">${esc(text)}</div><div class="gr-confirm-row"><button class="gr-btn" type="button">Cancel</button><button class="gr-btn primary danger" type="button">${esc(ok)}</button></div></div>`;
    const [c, y] = box.querySelectorAll('button');
    c.onclick = () => box.remove();
    y.onclick = () => { box.remove(); run(); };
    box.addEventListener('pointerdown', (e) => { if (e.target === box) box.remove(); });
    overlay.append(box);
  }
  function takeReward(i) {
    const R = S.reward;
    if (R.taken !== null) return;
    if (i === 0) {
      const uid = D.reward[0];
      if (S.bag.length < BAG_SIZE) { S.bag.push(uid); toast(`${item(uid).name} → bag`); }
      else return toast('The bag is full', true);
    } else if (i === 1) { S.gold += 38; toast('+38 gold'); }
    else { for (const h of Object.values(S.heroes)) h.hp = Math.min(1, h.hp + 0.2); toast('Every hero recovers 20% health'); }
    R.taken = i;
  }
  function addXp(n) {
    for (const h of Object.values(S.heroes)) {
      h.xp += n;
      let need = xpToNext(h.level);
      while (need && h.xp >= need) { h.xp -= need; h.level++; h.statPoints += 3; h.skillPoints += 1; h.hp = 1; need = xpToNext(h.level); }
    }
  }

  // ---------------------------------------------------------------- ipucu (item) + kısa ipucu (ikon)
  function tipHtml(uid) {
    const it = item(uid);
    const hid = S.hero;
    let html = it.tip[hid] ?? it.tip.h1;
    // seçili kahramanda takılı olanla karşılaştırma
    const o = ownerOf(uid);
    const u = usable(hid, uid);
    let cmp = '';
    if (o && o.hid === hid) cmp = `<div class="mk-cmp"><div class="mk-cmp-h">Equipped on <b>${esc(meta(hid).name)}</b></div></div>`;
    else if (!u.ok) cmp = `<div class="mk-cmp"><div class="mk-cmp-h">${esc(meta(hid).name)}: <b style="color:#e0907a">${esc(u.why)}</b></div></div>`;
    else {
      const cur = hero(hid).equip[it.slot];
      const d = diffFor(hid, uid) ?? {};
      const rows = Object.entries(d).map(([k, v]) => `<div class="mk-cmp-row"><img src="${statIco(k)}" alt=""><span class="k">${PANEL_META[k].label}</span><span class="v">${fmt(panel(hid)[k], PANEL_META[k].fmt)} → ${fmt(panel(hid)[k] + v, PANEL_META[k].fmt)}</span><span class="${v > 0 ? 'it-up' : 'it-down'}">(${fmtD(v, PANEL_META[k].fmt)})</span></div>`).join('');
      cmp = `<div class="mk-cmp"><div class="mk-cmp-h">${cur ? `vs <b style="--cmp-c:${item(cur).color};color:${item(cur).color}">${esc(item(cur).name)}</b>` : `${esc(D.slots.find((s) => s.id === it.slot).name)} slot empty`} · ${esc(meta(hid).name)}</div>${rows || '<div class="mk-cmp-row"><span class="v">No change</span></div>'}</div>`;
    }
    if (S.mode === 'merchant') html += `<div class="it-value" style="color:#f3d999">${S.wares.includes(uid) ? `Price ${it.value} gold` : `Sells for ${it.sell} gold`}</div>`;
    return html + cmp;
  }
  function showTip(uid, x, y) {
    const t = $('.item-tip');
    if (!t || S.pinned) return;
    t.innerHTML = tipHtml(uid);
    t.classList.add('on');
    t.classList.remove('pinned');
    const r = overlay.getBoundingClientRect();
    let left = x - r.left + 18, top = y - r.top + 18;
    const tw = t.offsetWidth, th = t.offsetHeight;
    if (left + tw > r.width - 6) left = x - r.left - tw - 14;
    if (top + th > r.height - 6) top = Math.max(6, r.height - th - 6);
    t.style.left = `${left}px`; t.style.top = `${top}px`;
  }
  function hideTip() { const t = $('.item-tip'); if (t && !S.pinned) t.classList.remove('on'); }
  function actionsFor(uid, src) {
    const hid = S.hero;
    const it = item(uid);
    const u = usable(hid, uid);
    const a = [];
    if (src === 'ware') { a.push(['Buy', 'buy', it.value > S.gold]); a.push([`Buy & equip`, 'buyeq', it.value > S.gold || !u.ok]); }
    else if (src === 'bb') a.push(['Buy back', 'bb', it.sell > S.gold]);
    else if (src === 'reward') a.push(['Take', 'rtake', S.reward.taken !== null]);
    else if (src === 'slot') { a.push(['Unequip', 'uneq', false]); if (S.mode === 'merchant') a.push([`Sell ${it.sell}g`, 'sell', false]); }
    else { a.push([`Equip: ${meta(hid).name}`, 'eq', !u.ok]); if (S.mode === 'merchant') a.push([`Sell ${it.sell}g`, 'sell', false]); else a.push(['Discard', 'disc', false]); }
    return a;
  }
  function pinTip(uid, anchor) {
    const t = $('.item-tip');
    const src = anchor.dataset.src;
    S.pinned = uid;
    t.innerHTML = tipHtml(uid) + `<div class="it-acts">${actionsFor(uid, src).map(([n, k, dis], i, arr) => `<button class="gr-btn sm${i === arr.length - 1 && k !== 'disc' ? ' primary' : ''}" type="button" data-tipact="${k}" data-uid="${uid}" ${dis ? 'disabled' : ''}>${esc(n)}</button>`).join('')}</div>`;
    t.classList.add('on', 'pinned');
    const r = overlay.getBoundingClientRect(), a = anchor.getBoundingClientRect();
    const tw = t.offsetWidth, th = t.offsetHeight;
    let left = a.right - r.left + 8, top = a.top - r.top;
    if (left + tw > r.width - 6) left = a.left - r.left - tw - 8;
    if (left < 6) { left = Math.min(r.width - tw - 6, Math.max(6, a.left - r.left)); top = a.bottom - r.top + 8; }
    if (top + th > r.height - 6) top = Math.max(6, r.height - th - 6);
    t.style.left = `${left}px`; t.style.top = `${top}px`;
  }
  function unpin() { S.pinned = null; const t = $('.item-tip'); if (t) t.classList.remove('on', 'pinned'); }
  function miniTip(el, x, y) {
    const t = $('.mk-tip');
    if (!t) return;
    const name = el.dataset.tipt;
    t.innerHTML = `${esc(name)}${el.dataset.tipi ? `<i>${esc(el.dataset.tipi)}</i>` : ''}`;
    t.classList.add('on');
    const r = overlay.getBoundingClientRect(), a = el.getBoundingClientRect();
    let left = a.left - r.left + a.width / 2 - t.offsetWidth / 2, top = a.bottom - r.top + 8;
    if (top + t.offsetHeight > r.height - 4) top = a.top - r.top - t.offsetHeight - 8;
    t.style.left = `${Math.max(4, Math.min(r.width - t.offsetWidth - 4, left))}px`; t.style.top = `${top}px`;
  }
  const hideMini = () => $('.mk-tip')?.classList.remove('on');

  // ---------------------------------------------------------------- giriş: sürükle-bırak (fare + dokunma), dokunarak seç, çift tık
  let press = null;
  let lastPt = null;
  function dropTargets(srcKind, uid) {
    const out = [];
    const it = item(uid);
    overlay.querySelectorAll('[data-drop]').forEach((el) => {
      const d = el.dataset.drop;
      let ok = false;
      if (d.startsWith('slot:')) { const [, hid, slot] = d.split(':'); ok = srcKind !== 'x' && slot === it.slot && usable(hid, uid).ok; }
      else if (d.startsWith('hero:')) ok = usable(d.slice(5), uid).ok && !Object.values(hero(d.slice(5)).equip).includes(uid);
      else if (d === 'bag') ok = srcKind === 'slot' || srcKind === 'ware' || srcKind === 'bb' || srcKind === 'reward';
      else if (d === 'stall') ok = S.mode === 'merchant' && (srcKind === 'bag' || srcKind === 'slot');
      else if (d === 'trash') ok = (srcKind === 'bag' || srcKind === 'slot') && S.mode !== 'merchant';
      if (ok) out.push(el);
    });
    return out;
  }
  function doDrop(srcKind, uid, d) {
    if (!d) return false;
    const target = d.startsWith('slot:') ? { hid: d.split(':')[1], slot: d.split(':')[2] } : d.startsWith('hero:') ? { hid: d.slice(5) } : null;
    if (srcKind === 'ware') { if (d === 'bag') return buy(uid); if (target) return buy(uid, target); return false; }
    if (srcKind === 'bb') { if (d === 'bag') return buyBack(uid); if (target) return buyBack(uid, target); return false; }
    if (srcKind === 'reward') { if (target) S.reward.target = target.hid; takeReward(0); return true; }
    if (d === 'stall') return sell(uid), true;
    if (d === 'trash') return discard(uid), true;
    if (d === 'bag' && srcKind === 'slot') return unequip(uid), true;
    if (target) return equip(target.hid, uid, target.slot);
    return false;
  }
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (t.closest('#mk-strip')) return;
    if (t.closest('.item-tip.pinned')) return;
    if (t.closest('[data-ptdrag]')) return ptDrag(e);
    const dragEl = t.closest('[data-drag]');
    if (!dragEl || dragEl.closest('.mk-dots')) return;
    const [kind, uid] = [dragEl.dataset.drag.split(':')[0], dragEl.dataset.drag.split(':').slice(1).join(':')];
    press = { kind, uid, el: dragEl, x: e.clientX, y: e.clientY, moved: false, pointerType: e.pointerType, id: e.pointerId, held: e.pointerType !== 'touch' };
    if (e.pointerType === 'touch') press.timer = setTimeout(() => { if (!press || press.moved) return; press.held = true; S.sel = { uid: press.uid, src: press.kind }; pinTip(press.uid, press.el); }, 380);
  });
  document.addEventListener('touchmove', (e) => { if (press?.moved || press?.held) e.preventDefault(); }, { passive: false });
  // tarayıcının yerel resim sürüklemesi işaretçi olaylarını keser (oyunda da img draggable=false)
  document.addEventListener('dragstart', (e) => e.preventDefault());
  document.addEventListener('pointermove', (e) => {
    if (press && !press.moved && !press.held && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.timer); press = null; return; }
    if (press && !press.moved && press.held && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 7) {
      press.moved = true;
      unpin(); hideTip();
      const it = item(press.uid);
      S.drag = { uid: press.uid, kind: press.kind };
      const g = document.createElement('div');
      g.className = 'gr-ghost';
      g.style.setProperty('--rc', it.color);
      g.innerHTML = `<img class="gr-svg gr-px item-art" src="${it.icon}" alt="" style="--glow:${it.color}">`;
      overlay.append(g);
      press.ghost = g;
      overlay.querySelector('.mk')?.classList.add('gr-dragging');
      overlay.classList.add('gr-dragging');
      if (press.kind === 'bag' || press.kind === 'slot') overlay.classList.toggle('gr-trash-on', S.mode !== 'merchant');
      press.targets = dropTargets(press.kind, press.uid);
      press.targets.forEach((el) => el.classList.add('drop-ok'));
      overlay.style.setProperty('--drag-rc', it.color);
    }
    if (press?.moved) {
      const r = overlay.getBoundingClientRect();
      press.ghost.style.left = `${e.clientX - r.left}px`;
      press.ghost.style.top = `${e.clientY - r.top}px`;
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find((x) => press.targets.includes(x));
      press.targets.forEach((x) => x.classList.toggle('drop-on', x === hit));
      return;
    }
    if (!press && e.pointerType === 'mouse') {
      lastPt = { x: e.clientX, y: e.clientY };
      const tipEl = e.target.closest('[data-tip]');
      if (tipEl) { if (S.hover !== tipEl.dataset.tip) hoverChange(tipEl.dataset.tip); showTip(tipEl.dataset.tip, e.clientX, e.clientY); }
      else if (S.hover) { hoverChange(null); hideTip(); }
      const m = e.target.closest('[data-tipt]');
      if (m) miniTip(m, e.clientX, e.clientY); else hideMini();
    }
  });
  // üstüne gelinen item: kahraman satırları + stat farkı canlı (yalnızca o parçaları yeniden çiz)
  function hoverChange(uid) {
    S.hover = uid;
    clearTimeout(hoverChange.t);
    hoverChange.t = setTimeout(() => {
      if (press) return;
      render();
      // render() ipucu kutusunu da yeniden kurar: açık ipucunu aynı yerde geri koy (fare durunca kaybolmasın)
      if (S.hover && lastPt) showTip(S.hover, lastPt.x, lastPt.y);
    }, 0);
  }
  document.addEventListener('pointerup', (e) => {
    if (!press) return;
    const p = press;
    press = null;
    clearTimeout(p.timer);
    // uzun basıştan sonra parmak kalktı: ipucu açık kalır (oyundaki gibi)
    if (!p.moved && p.pointerType === 'touch' && p.held) { S.suppressClick = true; return; }
    if (p.moved) {
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find((x) => p.targets.includes(x));
      p.ghost.remove();
      overlay.classList.remove('gr-dragging', 'gr-trash-on');
      S.drag = null;
      const ok = hit ? doDrop(p.kind, p.uid, hit.dataset.drop) : false;
      if (hit) S.sel = null;
      if (!hit && p.kind) {/* yerine döner */}
      render();
      return void ok;
    }
    // seçili item varken başka bir hücreye (dolu yuva / kahraman) dokunmak = oraya tak
    if (S.sel && S.sel.uid !== p.uid) {
      const dz = p.el.closest('[data-drop]');
      if (dz && dropTargets(S.sel.src, S.sel.uid).includes(dz)) { doDrop(S.sel.src, S.sel.uid, dz.dataset.drop); S.sel = null; unpin(); S.suppressClick = true; return render(); }
    }
    // çift tık / çift dokunuş: tak (torba) / çıkar (yuva) / satın al (tezgâh)
    const now = Date.now();
    if (S.lastTap && S.lastTap.uid === p.uid && now - S.lastTap.t < 380) {
      S.lastTap = null; S.suppressClick = true; unpin();
      if (p.kind === 'bag') equip(S.hero, p.uid); else if (p.kind === 'slot') unequip(p.uid); else if (p.kind === 'ware') buy(p.uid);
      S.sel = null; return render();
    }
    S.lastTap = { uid: p.uid, t: now };
    // dokunma / tık: seç; dokunmatikte ipucu sabitlenir + eylem düğmeleri
    const same = S.sel?.uid === p.uid;
    S.sel = same && p.pointerType === 'mouse' ? null : { uid: p.uid, src: p.kind };
    S.suppressClick = true;
    if (p.kind === 'slot' && !same) S.hero = ownerOf(p.uid)?.hid ?? S.hero;
    render();
    if (p.pointerType !== 'mouse' || p.kind === 'ware' || p.kind === 'bb' || p.kind === 'reward') { const a = overlay.querySelector(`[data-tip="${p.uid}"]`); if (a && S.sel) pinTip(p.uid, a); }
  });
  document.addEventListener('pointercancel', () => {
    if (press) clearTimeout(press.timer);
    const was = press?.moved;
    if (press?.ghost) press.ghost.remove();
    press = null; S.drag = null;
    if (was) { overlay.classList.remove('gr-dragging', 'gr-trash-on'); render(); }
  });
  document.addEventListener('pointerdown', (e) => {
    const fh = e.target.closest?.('[data-fhero]');
    if (!fh || S.dlg?.kind !== 'formation') return;
    const hid = fh.dataset.fhero, x0 = e.clientX, y0 = e.clientY;
    let g = null;
    const cellAt = (x, y) => document.elementsFromPoint(x, y).find((el) => el.dataset?.fcell);
    const mv = (ev) => {
      if (!g && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 7) { g = document.createElement('div'); g.className = 'mk-fghost'; g.innerHTML = face(hid); document.body.append(g); fh.classList.add('lift'); }
      if (!g) return;
      g.style.left = `${ev.clientX}px`; g.style.top = `${ev.clientY}px`;
      const c = cellAt(ev.clientX, ev.clientY);
      document.querySelectorAll('.mk-fcell').forEach((x) => x.classList.toggle('drop-on', x === c));
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', up, true);
      if (!g) return;
      g.remove();
      const c = cellAt(ev.clientX, ev.clientY);
      if (c) { const [cc, rr] = c.dataset.fcell.split(',').map(Number); moveForm(hid, cc, rr); }
      S.fjust = true; setTimeout(() => (S.fjust = false), 50);
      render();
    };
    window.addEventListener('pointermove', mv, true);
    window.addEventListener('pointerup', up, true);
  });
  // puan taşı sürükleme (oyundaki gibi: stat satırına bırak)
  function ptDrag(e) {
    e.preventDefault();
    const g = document.createElement('div');
    g.className = 'gr-pts-ghost'; g.textContent = '+1';
    document.body.append(g);
    const targets = [...overlay.querySelectorAll('.gr-stat.can-add')];
    targets.forEach((x) => x.classList.add('drop-ok'));
    const at = (x, y) => targets.find((t) => { const r = t.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
    const mv = (ev) => { g.style.left = `${ev.clientX}px`; g.style.top = `${ev.clientY}px`; const h = at(ev.clientX, ev.clientY); targets.forEach((t) => t.classList.toggle('drop-on', t === h)); };
    const up = (ev) => { window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', up, true); g.remove(); const h = at(ev.clientX, ev.clientY); if (h) addPoint(h.dataset.attr); else render(); };
    mv(e);
    window.addEventListener('pointermove', mv, true);
    window.addEventListener('pointerup', up, true);
  }
  function addPoint(k) { const h = hero(); if (canAdd(S.hero, k)) h.pending[k] = (h.pending[k] ?? 0) + 1; render(); }

  // uzun basış: ikon düğmelerinin kısa ipucu (dokunmatik)
  let lp;
  document.addEventListener('touchstart', (e) => { const m = e.target.closest?.('[data-tipt]'); if (!m) return; lp = setTimeout(() => miniTip(m), 450); }, { passive: true });
  document.addEventListener('touchend', () => { clearTimeout(lp); setTimeout(hideMini, 900); }, { passive: true });

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('#mk-strip')) return;
    const ta = t.closest('[data-tipact]');
    if (ta) {
      const uid = ta.dataset.uid, k = ta.dataset.tipact;
      unpin(); S.sel = null;
      if (k === 'eq') equip(S.hero, uid); else if (k === 'uneq') unequip(uid); else if (k === 'sell') sell(uid); else if (k === 'disc') return discard(uid);
      else if (k === 'buy') buy(uid); else if (k === 'buyeq') buy(uid, { hid: S.hero }); else if (k === 'bb') buyBack(uid); else if (k === 'rtake') { takeReward(0); S.rbag = false; }
      return render();
    }
    if (t.closest('.item-tip.pinned')) return;
    const oh = t.closest('[data-openhero]');
    if (oh) { S.hero = oh.dataset.openhero; S.invOpen = true; S.tab.v3 = 'hero'; S.dlg = null; S.sel = null; unpin(); return render(); }
    const hot = t.closest('[data-hot]'); if (hot) return townHot(hot.dataset.hot);
    const stb = t.closest('[data-shoptab]'); if (stb) { S.shopTab = stb.dataset.shoptab; return render(); }
    const rbt = t.closest('[data-rbtake]');
    if (rbt) { if (S.reward.taken !== null) return toast('Reward already taken', true); takeReward(+rbt.dataset.rbtake); S.rbag = false; unpin(); return render(); }
    if (S.dlg?.kind === 'formation') {
      if (S.fjust) { S.fjust = false; return; }
      const fh = t.closest('[data-fhero]'), fc = t.closest('[data-fcell]');
      if (fh && S.fsel !== fh.dataset.fhero && !S.fsel) { S.fsel = fh.dataset.fhero; return render(); }
      if (fc && S.fsel) { const [c, r] = fc.dataset.fcell.split(',').map(Number); if (S.form[S.fsel][0] === c && S.form[S.fsel][1] === r) S.fsel = null; else moveForm(S.fsel, c, r); return render(); }
    }
    if (S.dlg && !t.closest('[data-dlg]')) { S.dlg = null; S.fsel = null; return render(); }
    if (S.suppressClick) { S.suppressClick = false; if (t.closest('[data-drag]')) return; }
    // seçili item varken kahramana / yuvaya dokun = tak (dokunarak takma)
    const target = t.closest('[data-drop]');
    if (S.sel && target && !t.closest('[data-drag]')) {
      const d = target.dataset.drop;
      if (d.startsWith('slot:') || d.startsWith('hero:') || d === 'stall' || d === 'bag') {
        const ok = doDrop(S.sel.src, S.sel.uid, d);
        if (ok !== false) { S.sel = null; unpin(); return render(); }
        if (d.startsWith('hero:')) { S.hero = d.slice(5); unpin(); return render(); }
        return;
      }
    }
    const node = t.closest('[data-node]');
    if (node) { const h = hero(); const id = node.dataset.node, cost = +node.dataset.cost; if (node.classList.contains('can')) { h.tree[id] = true; h.skillPoints -= cost; render(); } else if (!h.tree[id]) toast(h.skillPoints < cost ? 'Not enough skill points' : 'Learn the node above first', true); return; }
    const sk = t.closest('.gr-skills .bh-sk');
    if (sk) { sk.parentElement.querySelectorAll('.bh-sk.tip').forEach((x) => x !== sk && x.classList.remove('tip')); sk.classList.toggle('tip'); return; }
    const add = t.closest('[data-add]'); if (add) return addPoint(add.dataset.add);
    const sub = t.closest('[data-sub]'); if (sub) { const h = hero(); const k = sub.dataset.sub; h.pending[k] = Math.max(0, (h.pending[k] ?? 0) - 1); return render(); }
    const tg = t.closest('[data-target]'); if (tg) { S.reward.target = tg.dataset.target; if (S.reward.taken === null && !t.closest('[data-card]')?.classList.contains('dim')) { /* yalnızca seçim */ } return render(); }
    const card = t.closest('[data-card]'); if (card && !t.closest('[data-drag]')) { takeReward(+card.dataset.card); return render(); }
    const heroEl = t.closest('[data-hero]'); if (heroEl) { S.hero = heroEl.dataset.hero; unpin(); return render(); }
    const tab = t.closest('[data-tab]'); if (tab) { const [v, k] = tab.dataset.tab.split(':'); S.tab[v] = k; return render(); }
    const md = t.closest('[data-mode]'); if (md) return setMode(md.dataset.mode);
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'reset') { hero().pending = {}; }
      else if (a === 'confirm') { const h = hero(); for (const k of ATTR) h.extra[k] = (h.extra[k] ?? 0) + (h.pending[k] ?? 0); h.statPoints -= pendCount(S.hero); h.pending = {}; toast('Points placed'); }
      else if (a === 'filter') S.filter = !S.filter;
      else if (a === 'rest') { for (const h of Object.values(S.heroes)) h.hp = 1; S.rested = true; toast('The company rests. Everyone is healed.'); }
      else if (a === 'reroll') { if (S.gold >= 15) { S.gold -= 15; S.rerolls++; S.wares = [...S.wares.slice(1), S.wares[0]].map((x, i) => x ?? D.wares[(i + S.rerolls) % D.wares.length]); S.wares = S.wares.filter((x, i, a) => a.indexOf(x) === i && !S.bag.includes(x) && !ownerOf(x)); while (S.wares.length < 9) S.wares.push(null); toast('Odo lays out new wares'); } }
      else if (a === 'sheet') S.sheet = !S.sheet;
      else if (a === 'done') { if (S.mode === 'none') { toast('Closes the gear window (mockup)'); return; } if (S.mode === 'reward') S.rbag = false; else S.invOpen = false; S.sel = null; S.sheet = false; unpin(); }
      else if (a === 'inv') { S.invOpen = !S.invOpen; S.dlg = null; S.sel = null; S.sheet = false; unpin(); }
      else if (a === 'formation') { S.dlg = S.dlg?.kind === 'formation' ? null : { kind: 'formation' }; S.fsel = null; if (S.mode === 'town') S.invOpen = false; unpin(); }
      else if (a === 'dlgclose') { S.dlg = null; S.fsel = null; }
      else if (a === 'viewbag') { S.rbag = true; S.sel = null; unpin(); }
      else if (a === 'encdone' && S.mode === 'merchant') { setMode('town'); return; }
      else if (a === 'encdone') { toast(S.mode === 'reward' && S.reward.taken === null ? 'Reward skipped (mockup)' : 'Leaves this place (mockup)'); return; }
      else if (a === 'menu') { toast('Menu (Esc): Resume · Save · Codex · Settings · Main Menu'); return; }
      else if (a === 'fs') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); return; }
      else if (a === 'toast') { toast(act.dataset.msg); return; }
      return render();
    }
    // boşluğa dokunma: seçim ve sabit ipucu kalkar
    if (S.sel || S.pinned) { S.sel = null; unpin(); render(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (S.dlg) { S.dlg = null; S.fsel = null; render(); } else if (S.pinned || S.sel) { S.sel = null; unpin(); render(); } else if (S.sheet) { S.sheet = false; render(); } else if (invShown() && S.mode !== 'none') { if (S.mode === 'reward') S.rbag = false; else S.invOpen = false; render(); } }
  });

  // ---------------------------------------------------------------- adres (#v2&mode=merchant&clean) + taslak şeridi
  function readHash() {
    const parts = location.hash.replace(/^#/, '').split('&').filter(Boolean);
    for (const p of parts) {
      if (VS.includes(p)) S.v = p;
      const [k, v] = p.split('=');
      if ((k === 'enc' || k === 'mode') && v) S.mode = MODES.includes(v) ? v : v === 'campaign' ? 'map' : 'none';
      if (k === 'tab' && v) { const [lv, tv] = v.split('.'); if (lv && tv) S.tab[lv] = tv; }
    }
    document.documentElement.classList.toggle('mk-clean', parts.includes('clean'));
    if (['town', 'reward', 'map'].includes(S.mode) && readHash.mode !== S.mode) { S.invOpen = false; S.rbag = false; S.dlg = null; }
    readHash.mode = S.mode;
  }
  function writeHash() {
    const clean = document.documentElement.classList.contains('mk-clean');
    history.replaceState(null, '', `#${S.v}&enc=${S.mode}${clean ? '&clean' : ''}`);
  }
  function setMode(m) { S.mode = m; S.invOpen = !['town', 'reward', 'map'].includes(m); S.rbag = false; S.dlg = null; S.sel = null; S.sheet = false; unpin(); writeHash(); render(); }
  function strip() {
    const s = document.createElement('div');
    s.id = 'mk-strip';
    s.innerHTML = `<b class="keep">MOCKUP</b>${VS.map((v) => `<button type="button" data-v="${v}" title="${VNAME[v]}">${v} ${VNAME[v]}</button>`).join('')}<span class="sep"></span><b>ENC</b>${MODES.map((m) => `<button type="button" data-m="${m}" title="Which outside window the gear opens next to">${m}</button>`).join('')}<span class="sep"></span><button type="button" data-x="xp" title="Give every hero XP (level up)">+XP</button><button type="button" data-x="reset">Reset</button><button type="button" data-x="clean" title="Hide this strip (for screenshots); press H to show">Hide</button><button class="keep x" type="button" data-x="min" title="Fold">–</button>`;
    s.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.v) { S.v = b.dataset.v; S.sel = null; S.sheet = false; unpin(); writeHash(); render(); }
      else if (b.dataset.m) setMode(b.dataset.m);
      else if (b.dataset.x === 'xp') { addXp(Math.max(...Object.values(S.heroes).map((h) => xpToNext(h.level))) ); render(); toast('Level up: +3 stat points, +1 skill point, full health'); }
      else if (b.dataset.x === 'reset') { const v = S.v, m = S.mode; S = fresh(); S.v = v; S.mode = m; render(); }
      else if (b.dataset.x === 'clean') { document.documentElement.classList.add('mk-clean'); writeHash(); }
      else if (b.dataset.x === 'min') document.documentElement.classList.toggle('mk-strip-min');
    });
    document.body.append(s);
    document.addEventListener('keydown', (e) => { if (e.key === 'h' || e.key === 'H') { document.documentElement.classList.toggle('mk-clean'); writeHash(); } });
  }
  function stripSync() {
    document.querySelectorAll('#mk-strip [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v));
    document.querySelectorAll('#mk-strip [data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === S.mode));
  }
  readHash();
  strip();
  layout();
  render();
  window.addEventListener('resize', () => { layout(); render(); });
  window.addEventListener('hashchange', () => { readHash(); render(); });
  window.__mk = { S: () => S, render, addXp };
})();
