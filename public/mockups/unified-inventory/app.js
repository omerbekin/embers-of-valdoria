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
  const MODES = ['campaign', 'town', 'merchant', 'reward'];
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
      v: S?.v ?? 'v1', mode: S?.mode ?? 'campaign', hero: 'h1', heroes, bag: [...D.bag], wares: [...D.wares], buyback: [], gold: 240, sel: null, filter: false,
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
      return `<button class="gr-slot empty gr-slot-${slot}${tap}" type="button" data-drop="slot:${hid}:${slot}" style="--rc:#5b4a33"><img class="gr-svg gr-px dim" src="${D.glyph[slot]}" alt="" style="--sz:1.3"><div class="gr-slot-text"><div class="gr-slot-name">${sname}</div><div class="gr-slot-sub">${sub}</div></div></button>`;
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
    return `<button class="gr-item empty mk-tile${tap}" type="button" data-drop="slot:${hid}:${slot}" data-tipt="${sname}" data-tipi="${sub}"><img class="gr-svg gr-px dim" src="${D.glyph[slot]}" alt=""></button>`;
  }
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
      return `<div class="gr-stat${cls}" data-tipt="${esc(STAT_NAME[id] ?? p.label)}" data-stat="${id}"${ATTR.includes(id) ? ` data-attr="${id}"` : ''}><img class="gr-sico" src="${statIco(id)}" alt="" draggable="false"><span class="gr-stat-k">${p.label}</span><span class="gr-stat-v">${fmt(now[id], p.fmt)}</span>${pm}<span class="gr-stat-d ${d ? (d > 0 ? 'up' : 'down') : ''}">${d ? fmtD(d, p.fmt) : ''}</span></div>`;
    };
    const grp = (cls, ids) => `<div class="gr-sgrp ${cls}">${ids.map(row).join('')}</div>`;
    return `<div class="gr-sgroups">${grp('vitals', D.groups.vitals)}${D.groups.panel.map((ids, i) => grp(['base', 'attack', 'defense'][i], ids)).join('')}</div>`;
  }
  const skillsBlock = (hid) => `<div class="gr-skills"><div class="gr-sec">Skills</div>${meta(hid).skillBar}</div>`;

  // ---- skill ağacı (YER TUTUCU: düğüm adları / bedeller / kurallar tasarlanmadı; görsel oyun dilinde, ikonlar oyunun skill / durum ikonları)
  const TREE_EXTRA = { warrior: ['wound', 'fortify', 'staggered', 'haste', 'anchored', 'blessed'], mage: ['ash_brand', 'slow', 'shrouded', 'haste', 'silence', 'blessed'], archer: ['wound', 'haste', 'blinded', 'slow', 'staggered', 'fortify'], hexer: ['jinxed', 'omen', 'doom', 'wither', 'dark_bond', 'abyssal_fury'] };
  const TREE_WORDS = [['Honed', 'Swift'], ['Steady', 'Deep'], ['Hardened', 'Keen']];
  function treeNodes(hid) {
    const m = meta(hid);
    const icons = [...m.skillBar.matchAll(/<div class="fr">\s*<img class="bh-ico" src="([^"]+)"/g)].map((x) => x[1]);
    const names = [...m.skillBar.matchAll(/<span class="nm">([^<]+)<\/span>/g)].map((x) => x[1]);
    const pas = (m.skillBar.match(/bh-medal lg">\s*<img class="bh-ico" src="([^"]+)"/) || [])[1];
    const ex = TREE_EXTRA[m.class] ?? TREE_EXTRA.warrior;
    return [0, 1, 2].map((b) => ({
      name: names[b] ?? `Path ${b + 1}`,
      nodes: [
        { id: `${b}r`, name: names[b], icon: icons[b], need: null, tier: 'root' },
        { id: `${b}a`, name: `${TREE_WORDS[b][0]} ${names[b]}`, icon: A + `misc-icons/status/${ex[b * 2]}.webp`, need: `${b}r` },
        { id: `${b}b`, name: `${TREE_WORDS[b][1]} ${names[b]}`, icon: A + `misc-icons/status/${ex[b * 2 + 1]}.webp`, need: `${b}r` },
        { id: `${b}c`, name: b === 2 ? m.passive : names[3], icon: b === 2 ? pas : icons[3], need: [`${b}a`, `${b}b`], tier: 'cap' },
      ],
    }));
  }
  function treeBlock(hid) {
    const h = hero(hid);
    const learned = (id) => !!h.tree[id];
    const ready = (n) => !learned(n.id) && (!n.need || (Array.isArray(n.need) ? n.need.some(learned) : learned(n.need)));
    const node = (n) => {
      const cost = n.tier === 'cap' ? 2 : 1;
      const st = learned(n.id) ? 'lrn' : ready(n) && h.skillPoints >= cost ? 'can' : 'off';
      const tip = `<div class="bh-tt"><img class="bh-ico bh-tt-ico" src="${n.icon}" alt=""><span class="bh-tt-name" style="color:#f4ede1">${esc(n.name)}</span>${n.tier === 'cap' ? '<span class="bh-tag">Major</span>' : ''}</div><div class="bh-fade"></div><ul class="bh-rows"><li>Placeholder node: the skill tree is not designed yet.</li><li style="color:#b9ab94">${learned(n.id) ? 'Learned' : `Costs ${cost} skill point${cost > 1 ? 's' : ''}${n.need ? ' · needs the node above' : ''}`}</li></ul>`;
      return `<div class="bh-sk ${n.tier === 'cap' ? 'ult' : ''} ${st}" data-node="${n.id}" data-cost="${cost}"><div class="fr"><img class="bh-ico" src="${n.icon}" alt="" draggable="false"></div><span class="nm">${esc(n.name)}</span><span class="cost">${learned(n.id) ? 'Learned' : `<span>${cost} pt</span>`}</span><div class="bh-sktip bh-panel bh-corners">${tip}</div></div>`;
    };
    const link = (lit) => `<div class="mk-link${lit ? ' lit' : ''}"></div>`;
    const br = treeNodes(hid).map((b) => {
      const [r, a, bb, c] = b.nodes;
      return `<div class="mk-branch"><div class="gr-sec">${esc(b.name)}</div><div class="bh-kit"><div class="mk-row">${node(r)}</div>${link(learned(r.id))}<div class="mk-row">${node(a)}${node(bb)}</div>${link(learned(a.id) || learned(bb.id))}<div class="mk-row">${node(c)}</div></div></div>`;
    });
    return `<div class="mk-tree-head gr-sec mk-flex">Skill tree ${skBadge(hid)}<span class="mk-r mk-note">Draft · placeholder nodes</span></div><div class="mk-tree" data-zk="${{ v1: 0.76, v2: 0.92, v3: 0.7, v4: 0.9, v5: 0.62 }[S.v]}">${br.join('')}</div>`;
  }
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
    return `<div class="mk-ctx"><div class="gr-sec">Ashford Village</div>
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
      ${party.map((hid) => `<div class="mk-heal-row">${face(hid)}<div><span>${esc(meta(hid).name)} · Lv ${hero(hid).level}</span><div class="mk-hpbar"><i style="width:${Math.round(hero(hid).hp * 100)}%"></i></div></div><span>${ptBadge(hid) || '&nbsp;'}</span></div>`).join('')}
      <div class="mk-note">${pts ? `${pts} stat points and ` : ''}${sk} skill points wait to be spent.</div></div>`;
  }
  function merchantCtx(o = {}) {
    const wares = S.wares.map((uid) => `<div class="gr-cellw">${uid ? itemCell(uid, { src: 'ware', hid: S.hero }) + price(item(uid).value, item(uid).value > S.gold) : `<div class="gr-item empty sold"></div><div class="gr-price">Sold</div>`}</div>`).join('');
    const bb = S.buyback.length ? S.buyback.map((uid) => `<div class="gr-cellw">${itemCell(uid, { src: 'bb', hid: S.hero })}${price(item(uid).sell, item(uid).sell > S.gold)}</div>`).join('') : '<div class="gr-card-empty">Sold something by mistake? Buy it back here until you leave.</div>';
    return `<div class="mk-ctx gr-stall mk-stall mk-drop" data-drop="stall"><div class="gr-odo"><div class="gr-face" style="background-image:url('${D.extra.merchant_av}')"></div><div class="gr-odo-line">Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.</div></div>
      <div class="gr-wares" style="--ware-cols:${o.cols ?? 3}">${wares}</div>
      <button class="gr-btn sm gr-reroll" type="button" data-act="reroll" ${S.gold < 15 ? 'disabled' : ''}>Reroll wares<span class="gr-cost"><img class="gr-price-ico" src="${D.extra.gold}" alt="">15</span></button>
      <div class="gr-buyback"><div class="gr-sec">Buy back · this visit</div><div class="gr-bb-row">${bb}</div></div>
      <div class="mk-note">Drag a bag item here to sell it for half its worth.</div></div>`;
  }
  function rewardCards(o = {}) {
    const R = S.reward;
    const uid = D.reward[0];
    const it = item(uid);
    const target = R.target ?? Object.keys(S.heroes).find((hid) => usable(hid, uid).ok) ?? null;
    const taken = R.taken;
    const who = Object.keys(S.heroes).map((hid) => {
      const u = usable(hid, uid);
      const d = diffFor(hid, uid);
      const best = d ? Object.entries(d).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0] : null;
      return `<button class="gr-hero${hid === target ? ' on' : ''}${u.ok ? '' : ' no'}" type="button" data-target="${hid}" data-drop="hero:${hid}" data-tipt="${esc(meta(hid).name)}" data-tipi="${esc(u.ok ? (best ? `${fmtD(best[1], PANEL_META[best[0]].fmt)} ${PANEL_META[best[0]].label}` : 'No change') : u.why)}">${face(hid)}${best ? `<span class="mk-d ${best[1] > 0 ? 'gr-tip-d up' : 'gr-tip-d down'}">${fmtD(best[1], PANEL_META[best[0]].fmt)} ${PANEL_META[best[0]].label}</span>` : ''}</button>`;
    }).join('');
    const lines = (it.tip.h1.match(/<div class="it-lines">[\s\S]*?<\/div><\/div>(?=<div class="it-(value|effect)")/) || [''])[0];
    const card1 = `<div class="mk-card${taken === 0 ? ' taken' : taken !== null ? ' dim' : ''}" style="--ac:${it.color}" data-card="0"><div class="mk-sell"><span>Sell: ${it.sell}</span><img src="${D.extra.gold}" alt=""></div><div class="mk-kick">Spoils</div>
      <div class="mk-medal" data-drag="reward:${uid}" data-tip="${uid}" data-src="reward"><img src="${it.icon}" alt="" style="image-rendering:pixelated"></div><div class="mk-cn" style="color:${it.color}">${esc(it.name)}</div><div class="mk-cs">${esc(it.sub)}</div><div class="mw-stats">${lines}</div>
      <div class="mk-who"><div class="mk-kick">${taken === 0 ? 'Given to' : 'Give to'}</div><div class="mk-who-row">${who}</div></div></div>`;
    const gold = 38;
    const card2 = `<div class="mk-card${taken === 1 ? ' taken' : taken !== null ? ' dim' : ''}" style="--ac:#c9a050" data-card="1"><div class="mk-kick">Coin</div><div class="mk-medal"><img src="${D.extra.gold}" alt=""></div><div class="mk-big">+${gold}</div><div class="mk-kick" style="letter-spacing:.2em">Gold</div><div class="mk-ct">Coin for the merchant who comes after every 5th wave.</div><div class="mk-ct" style="margin-top:auto">Purse ${S.gold} → ${S.gold + (taken === 1 ? 0 : gold)}</div></div>`;
    const card3 = `<div class="mk-card${taken === 2 ? ' taken' : taken !== null ? ' dim' : ''}" style="--ac:#d96a5a" data-card="2"><div class="mk-kick">Rest</div><div class="mk-medal"><img src="${D.extra.heal}" alt=""></div><div class="mk-big">+20%</div><div class="mk-ct">Every hero recovers 20% of their health.</div>
      <div class="mk-heal-rows">${Object.keys(S.heroes).map((hid) => { const h = hero(hid); const a = Math.round(h.hp * 100), b = Math.min(100, a + (taken === 2 ? 0 : 20)); return `<div class="mk-heal-row">${face(hid)}<div><span>${esc(meta(hid).name)}</span><div class="mk-hpbar"><i style="width:${a}%"></i></div></div><span>${a}% → ${b}%</span></div>`; }).join('')}</div></div>`;
    return `<div class="mk-cards${o.rows ? ' rows' : ''}${o.compact ? ' compact' : ''}"${o.style ? ` style="${o.style}"` : ''}>${card1}${card2}${card3}</div>`;
  }
  const modeTitle = () => ({ campaign: ['Gear', ''], town: ['Ashford Village', 'Town · Rest, Recruits, Trade'], merchant: ['Odo the Peddler', 'Travelling merchant · follows the company'], reward: ['Victory', 'Wave 6 cleared. Choose one reward.'] })[S.mode];
  const ctxFor = (o) => (S.mode === 'town' ? townCtx() : S.mode === 'merchant' ? merchantCtx(o) : S.mode === 'reward' ? rewardCards({ style: 'grid-template-columns:1fr;' }) : campaignCtx());
  const ctxIcon = () => ({ campaign: D.extra.gear, town: D.extra.rest, merchant: D.extra.gold, reward: D.extra.feast })[S.mode];
  const ctxName = () => ({ campaign: 'Journey', town: 'Town', merchant: 'Wares', reward: 'Reward' })[S.mode];
  const head = () => {
    const [t, sub] = modeTitle();
    return `<div class="gr-head"><div class="gr-head-l"><div class="gr-title">${t}</div>${sub ? `<div class="gr-shop-sub">${sub}</div>` : ''}</div>${goldHead()}</div>`;
  };
  function foot(extraLeft = '') {
    const done = S.mode === 'merchant' ? 'Move on' : S.mode === 'reward' ? (S.reward.taken !== null ? 'Continue' : 'Skip reward') : S.mode === 'town' ? 'Road out' : 'Done';
    const hint = S.sel ? `Selected: <b style="color:${item(S.sel.uid).color}">${esc(item(S.sel.uid).name)}</b> · tap a hero or a slot to equip` : S.mode === 'merchant' ? 'Drag to buy or sell · tap an item for actions' : 'Drag items onto a hero or a slot · double-click equips';
    return `<div class="gr-foot"><div class="mk-hint">${extraLeft}${hint}</div><button class="gr-btn${S.mode === 'reward' && S.reward.taken === null ? '' : ' primary'}" type="button" data-act="done">${done}</button></div>`;
  }

  // ---------------------------------------------------------------- düzenler
  const L = {};
  L.v1 = () => {
    const tab = S.tab.v1;
    const tabs = `<div class="gr-tabs" role="tablist"><button class="gr-tab${tab === 'stats' ? ' on' : ''}" type="button" data-tab="v1:stats">Stats</button><button class="gr-tab${tab === 'skills' ? ' on' : ''}" type="button" data-tab="v1:skills">Skills</button><button class="gr-tab${tab === 'tree' ? ' on' : ''}" type="button" data-tab="v1:tree">Skill tree ${skBadge(S.hero)}</button></div>`;
    const lower = tab === 'stats' ? levelBlock(S.hero) + statsBlock(S.hero) : tab === 'skills' ? skillsBlock(S.hero) : treeBlock(S.hero);
    const right = S.mode === 'merchant' ? bagBlock({ priced: true, cols: 5 }) : bagBlock({ cols: 5 });
    const left = S.mode === 'reward' ? `<div class="mk-col">${heroList({})}</div>` : `<div class="mk-col mk-c1 mk-scroll">${heroList({})}${S.mode === 'merchant' ? '' : ctxFor({})}</div>`;
    const mid = S.mode === 'reward' ? `<div class="mk-col mk-scroll">${rewardCards({ rows: true })}</div>` : S.mode === 'merchant' ? `<div class="mk-col mk-scroll">${merchantCtx({ cols: 4 })}<div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}</div>` : `<div class="mk-col mk-c2 mk-scroll"><div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}${tabs}${lower}</div>`;
    return `<div class="gr-panel gr-gear mk mk-v1">${head()}<div class="gr-body">${left}${mid}<div class="mk-col">${right}</div></div>${foot()}</div>`;
  };
  L.v2 = () => {
    const tab = S.tab.v2;
    const rail = `<div class="mk-rail">${Object.keys(S.heroes).map((hid) => heroCard(hid, {})).join('')}</div>`;
    const tb = (id, icon, name, badge = '') => `<button class="mk-ib${tab === id ? ' on sel' : ''}" type="button" data-tab="v2:${id}" data-tipt="${name}"><img src="${icon}" alt="">${badge}</button>`;
    const vt = `<div class="mk-vtabs">${tb('equip', D.extra.gear, 'Equipment')}${tb('attr', statIco('str'), 'Attributes', ptBadge(S.hero))}${tb('tree', D.extra.passive, 'Skill tree', skBadge(S.hero))}${S.mode !== 'campaign' ? tb('ctx', ctxIcon(), ctxName()) : ''}</div>`;
    let pane;
    if (tab === 'equip') pane = `<div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}${skillsBlock(S.hero)}`;
    else if (tab === 'attr') pane = levelBlock(S.hero) + `<div class="gr-sec">Stats</div>` + statsBlock(S.hero);
    else if (tab === 'tree') pane = treeBlock(S.hero);
    else pane = S.mode === 'reward' ? rewardCards({ compact: true }) : ctxFor({ cols: 6 });
    return `<div class="gr-panel gr-gear mk mk-v2">${head()}<div class="gr-body">${rail}${vt}<div class="mk-col mk-pane mk-scroll">${pane}</div><div class="mk-col">${bagBlock({ priced: S.mode === 'merchant', cols: 6 })}</div></div>${foot()}</div>`;
  };
  L.v3 = () => {
    const tab = S.tab.v3;
    const marks = `<div class="mk-marks">${Object.keys(S.heroes).map((hid) => `<button class="mk-mark${hid === S.hero ? ' on' : ''}" type="button" data-hero="${hid}" data-drop="hero:${hid}" data-tipt="${esc(meta(hid).name)}" data-tipi="${esc(heroLine(hid, focusUid()).html.replace(/<[^>]+>/g, ''))}">${face(hid)}${ptBadge(hid)}</button>`).join('')}</div>`;
    const ctxLabel = { campaign: 'Journey', town: 'Town', merchant: 'Wares', reward: 'Reward' }[S.mode];
    const tabs = `<div class="gr-tabs" role="tablist" style="grid-column:2 / -1">${[['hero', 'Hero'], ['sheet', 'Sheet'], ['ctx', ctxLabel]].map(([k, n]) => `<button class="gr-tab${tab === k ? ' on' : ''}" type="button" data-tab="v3:${k}">${n}${k === 'sheet' ? ' ' + skBadge(S.hero) : ''}</button>`).join('')}</div>`;
    let l, r;
    if (tab === 'hero') { l = `<div class="gr-sec">${esc(meta().name)} · ${esc(meta().families)}</div>${slotsGrid(S.hero)}${skillsBlock(S.hero)}`; r = bagBlock({ priced: S.mode === 'merchant', cols: 6 }); }
    else if (tab === 'sheet') { l = levelBlock(S.hero) + `<div class="gr-sec">Stats</div>` + statsBlock(S.hero); r = treeBlock(S.hero); }
    else { l = S.mode === 'reward' ? rewardCards({ rows: true }) : ctxFor({ cols: 4 }); r = bagBlock({ priced: S.mode === 'merchant', cols: 6 }); }
    const n = { hero: [1, 2], sheet: [3, 4], ctx: [5, 6] }[tab];
    return `<div class="gr-panel gr-gear mk mk-v3">${head()}<div class="gr-body" style="grid-template-rows:auto minmax(0,1fr)"><div></div>${tabs}${marks}<div class="mk-col mk-page mk-scroll">${l}<div class="mk-folio">· ${n[0]} ·</div></div><div class="mk-spine"></div><div class="mk-col mk-page r mk-scroll">${r}<div class="mk-folio">· ${n[1]} ·</div></div></div>${foot()}</div>`;
  };
  L.v4 = () => {
    const ids = D.slots.map((s) => s.id);
    const doll = `<div class="mk-doll"><div class="mk-dcol">${['helm', 'armor', 'gloves', 'boots'].map((s) => slotBtn(S.hero, s)).join('')}</div><div class="mk-portrait" style="background-image:url('${meta().avatar}')"><div class="mk-pname">${esc(meta().name)}</div></div><div class="mk-dcol">${['weapon', 'offhand', 'trinket'].map((s) => slotBtn(S.hero, s)).join('')}</div></div>`;
    const heroes = Object.keys(S.heroes).map((hid) => heroCard(hid, { compact: true, tipName: true })).join('');
    const left = `<div class="mk-col mk-scroll mk-narrow">${levelBlock(S.hero)}${statsBlock(S.hero)}</div>`;
    const center = `<div class="mk-col mk-center mk-scroll"><div class="mk-herorow">${heroes}<button class="gr-btn sm" type="button" data-act="sheet">Hero sheet ${skBadge(S.hero)}</button></div>${doll}</div>`;
    const right = `<div class="mk-col mk-scroll">${S.mode === 'reward' ? rewardCards({ rows: true }) : ctxFor({ cols: 3 })}</div>`;
    const shelf = `<div class="mk-shelf">${bagBlock({ priced: S.mode === 'merchant', cols: S.mode === 'merchant' ? 18 : 15 })}</div>`;
    const sheet = S.sheet ? `<div class="mk-sheet"><div class="gr-head"><div class="gr-head-l"><div class="gr-title">${esc(meta().name)}</div><div class="gr-shop-sub">Hero sheet · Level ${hero().level}</div></div><button class="gr-btn primary" type="button" data-act="sheet">Close</button></div><div class="mk-sheet-b"><div class="mk-col mk-scroll">${levelBlock(S.hero)}${statsBlock(S.hero)}</div><div class="mk-col mk-scroll">${treeBlock(S.hero)}${skillsBlock(S.hero)}</div></div></div>` : '';
    return `<div class="gr-panel gr-gear mk mk-v4" style="position:relative">${head()}<div class="gr-body">${left}${center}${right}${shelf}</div>${foot()}${sheet}</div>`;
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
        const dots = `<div class="mk-dots">${D.slots.map((s) => (h.equip[s.id] ? itemCell(h.equip[s.id], { src: 'x' }) : `<div class="gr-item empty"></div>`)).join('')}</div>`;
        const p = panel(hid);
        const mini = `<div class="mk-mini-stats gr-sgroups">${['hp', 'mp', 'armor', 'spd'].map((id) => `<div class="gr-stat"><img class="gr-sico" src="${statIco(id)}" alt=""><span class="gr-stat-k">${PANEL_META[id].label}</span><span class="gr-stat-v">${fmt(p[id], PANEL_META[id].fmt)}</span></div>`).join('')}</div>`;
        return `<div class="mk-sq${tap} mk-drop" data-hero="${hid}" data-drop="hero:${hid}">${hdr}${dots}${mini}</div>`;
      }
      const sub = tab === 'gear' ? `<div class="mk-col" style="display:grid;grid-template-columns:calc(290 * var(--u)) minmax(0,1fr);gap:calc(18 * var(--u))"><div class="mk-tiles">${D.slots.map((x) => slotTile(hid, x.id)).join('')}</div><div class="mk-narrow">${levelBlock(hid, { noSkill: true })}${statsBlock(hid)}</div></div>` : `<div class="mk-col">${treeBlock(hid)}${skillsBlock(hid)}</div>`;
      return `<div class="mk-sq on mk-scroll" data-drop="hero:${hid}">${hdr}<div class="mk-sqtabs gr-tabs"><button class="gr-tab${tab === 'gear' ? ' on' : ''}" type="button" data-tab="v5:gear">Gear</button><button class="gr-tab${tab === 'skills' ? ' on' : ''}" type="button" data-tab="v5:skills">Skills &amp; tree</button></div>${sub}</div>`;
    }).join('');
    const rw = S.mode === 'reward';
    const bottomL = rw ? rewardCards({ compact: true }) : bagBlock({ priced: S.mode === 'merchant', cols: S.mode === 'merchant' ? 10 : 15 });
    const bottomR = rw ? bagBlock({ cols: 6 }) : S.mode === 'campaign' ? campaignCtx() : ctxFor({ cols: 4 });
    return `<div class="gr-panel gr-gear mk mk-v5${rw ? ' rw' : ''}">${head()}<div class="gr-body"><div class="mk-squad" style="grid-template-columns:${cols}">${cards}</div><div class="mk-bottom mk-col">${bottomL}</div><div class="mk-col mk-scroll">${bottomR}</div></div>${foot()}</div>`;
  };

  // ---------------------------------------------------------------- sahne
  const stage = $('#stage');
  const root = $('#ui-root');
  let overlay;
  const focusUid = () => S.hover ?? S.drag?.uid ?? S.sel?.uid ?? null;
  function render() {
    const keep = [...document.querySelectorAll('.mk-scroll, .gr-bag')].map((e) => e.scrollTop);
    const bg = { campaign: 'bg/map.webp', town: 'bg/town.webp', merchant: 'bg/town.webp', reward: 'bg/endless.webp' }[S.mode];
    $('#bgimg').style.backgroundImage = `url('${A}${bg}')`;
    const st = { campaign: ['Valdoria', 'I · The Border Road'], town: ['Ashford Village', 'Town · Rest, Recruits, Trade'], merchant: ['Ashford Village', "Odo's stall"], reward: ['Endless', 'Wave 6'] }[S.mode];
    const html = `<div class="mk-scene-title"><b>${st[0]}</b><i>${st[1]}</i></div><div class="gr-overlay el-modal mk-ov" role="dialog">${L[S.v]()}<div class="el-tip item-tip" role="tooltip"></div><div class="mk-tip"></div><div class="mk-toast"></div>
      <div class="gr-trash" data-drop="trash" data-tipt="Discard"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div></div>
      <button class="nav-btn settings-toggle fullscreen-toggle" type="button" title="Fullscreen" aria-label="Fullscreen" data-act="fs">${D.nav['fs-enter']}</button>
      <button class="nav-btn settings-toggle menu-toggle" type="button" title="Menu (Esc)" aria-label="Menu (Esc)" data-act="menu">${D.nav.menu}</button>`;
    root.innerHTML = html;
    overlay = $('.mk-ov');
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
    root.querySelectorAll('.gr-skillbar').forEach((e) => fit(e, gu));
    root.querySelectorAll('.mk-tree').forEach((e) => fit(e, gu * 0.95));
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
      const t = R.target ?? Object.keys(S.heroes).find((hid) => usable(hid, uid).ok);
      if (t && usable(t, uid).ok) { S.bag.push(uid); equip(t, uid); toast(`${item(uid).name} → ${meta(t).name}`); }
      else if (S.bag.length < BAG_SIZE) { S.bag.push(uid); toast(`${item(uid).name} → bag`); }
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
    else if (src === 'reward') a.push([`Take for ${meta(hid).name}`, 'rtake', !u.ok]);
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
    press = { kind, uid, el: dragEl, x: e.clientX, y: e.clientY, moved: false, pointerType: e.pointerType, id: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => {
    if (press && !press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 7) {
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
      overlay.querySelector('.mk').classList.add('gr-dragging');
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
    hoverChange.t = setTimeout(() => { if (!press) render(); }, 0);
  }
  document.addEventListener('pointerup', (e) => {
    if (!press) return;
    const p = press;
    press = null;
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
  document.addEventListener('pointercancel', () => { if (press?.ghost) press.ghost.remove(); press = null; S.drag = null; render(); });
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
      else if (k === 'buy') buy(uid); else if (k === 'buyeq') buy(uid, { hid: S.hero }); else if (k === 'bb') buyBack(uid); else if (k === 'rtake') { S.reward.target = S.hero; takeReward(0); }
      return render();
    }
    if (t.closest('.item-tip.pinned')) return;
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
      else if (a === 'done') { toast(S.mode === 'reward' && S.reward.taken === null ? 'Skipped (mockup)' : 'Closes the window (mockup)'); return; }
      else if (a === 'menu') { toast('Menu (Esc): Resume · Save · Codex · Settings · Main Menu'); return; }
      else if (a === 'fs') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); return; }
      else if (a === 'toast') { toast(act.dataset.msg); return; }
      return render();
    }
    // boşluğa dokunma: seçim ve sabit ipucu kalkar
    if (S.sel || S.pinned) { S.sel = null; unpin(); render(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (S.pinned || S.sel) { S.sel = null; unpin(); render(); } else if (S.sheet) { S.sheet = false; render(); } }
  });

  // ---------------------------------------------------------------- adres (#v2&mode=merchant&clean) + taslak şeridi
  function readHash() {
    const parts = location.hash.replace(/^#/, '').split('&').filter(Boolean);
    for (const p of parts) {
      if (VS.includes(p)) S.v = p;
      const [k, v] = p.split('=');
      if (k === 'mode' && MODES.includes(v)) S.mode = v;
      if (k === 'tab' && v) { const [lv, tv] = v.split('.'); if (lv && tv) S.tab[lv] = tv; }
    }
    document.documentElement.classList.toggle('mk-clean', parts.includes('clean'));
  }
  function writeHash() {
    const clean = document.documentElement.classList.contains('mk-clean');
    history.replaceState(null, '', `#${S.v}&mode=${S.mode}${clean ? '&clean' : ''}`);
  }
  function setMode(m) { S.mode = m; S.sel = null; S.sheet = false; unpin(); if (S.v === 'v2' && S.tab.v2 === 'ctx' && m === 'campaign') S.tab.v2 = 'equip'; if (S.v === 'v2' && m !== 'campaign') S.tab.v2 = 'ctx'; S.tab.v3 = m === 'campaign' ? 'hero' : 'ctx'; writeHash(); render(); }
  function strip() {
    const s = document.createElement('div');
    s.id = 'mk-strip';
    s.innerHTML = `<b class="keep">MOCKUP</b>${VS.map((v) => `<button type="button" data-v="${v}" title="${VNAME[v]}">${v} ${VNAME[v]}</button>`).join('')}<span class="sep"></span>${MODES.map((m) => `<button type="button" data-m="${m}">${m}</button>`).join('')}<span class="sep"></span><button type="button" data-x="xp" title="Give every hero XP (level up)">+XP</button><button type="button" data-x="reset">Reset</button><button type="button" data-x="clean" title="Hide this strip (for screenshots); press H to show">Hide</button><button class="keep x" type="button" data-x="min" title="Fold">–</button>`;
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
  if (S.mode !== 'campaign' && !/tab=/.test(location.hash)) { S.tab.v2 = 'ctx'; S.tab.v3 = 'ctx'; }
  strip();
  layout();
  render();
  window.addEventListener('resize', () => { layout(); render(); });
  window.addEventListener('hashchange', () => { readHash(); render(); });
  window.__mk = { S: () => S, render, addXp };
})();
