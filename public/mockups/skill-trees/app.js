/* Skill agaci YAPILARI taslagi (ui-dev, 2026-10-20). Oyun kodu DEGIL. Veri: docs/design/skill-tree-structures.md (sayilar PROVIZYON). */
'use strict';

/* ================= VERI ================= */
const IC = { ds: 'sword', ww: 'whirlwind', ch: 'charge', hb: 'warcry', pw: 'rage', ee: 'eye', wc: 'drainfield', jx: 'clover', dm: 'voidstrike', ph: 'soul' };
const SKN = { ds: 'Double Strike', ww: 'Whirlwind', ch: 'Charge', hb: "Headsman's Blow", pw: 'Berserker', ee: 'Evil Eye', wc: 'Withering Curse', jx: 'Jinx', dm: 'Doom Mark', ph: 'Ill Omen' };
const isPas = (sk) => sk === 'pw' || sk === 'ph';
const CLS = { w: { name: 'Warrior', av: 'warrior', pas: 'pw' }, h: { name: 'Hexer', av: 'hexer', pas: 'ph' } };

// dugum: [kod, ad, tur(f filler|k catal|b davranis|e evolve|c kapstone), skill, rank, etki, yeniKural]
const DEF = {
  w0: { c: 'w', name: 'Carnage', sub: 'Double Strike · Whirlwind · Rage', cap: 'A9',
    lanes: [['pw', []], ['ds', [['A1'], ['A2'], ['A7']]], ['ww', [['A3'], ['A4'], ['A6a', 'A6b'], ['A5'], ['A8']]]],
    nodes: [
      ['A1', 'Heavy Hands', 'f', 'ds', 3, 'Double Strike power +6% per rank'],
      ['A2', 'Blood Rhythm', 'f', 'ds', 1, 'Double Strike grants +2 Rage per hit'],
      ['A3', 'Wide Arc', 'f', 'ww', 2, 'Whirlwind power +8% per rank'],
      ['A4', 'Red Harvest', 'f', 'ww', 1, 'Whirlwind lifesteal +6%'],
      ['A5', 'Spinning Momentum', 'b', 'ww', 1, 'Whirlwind cooldown -1 when it kills'],
      ['A6a', 'Bleeding Gale', 'k', 'ww', 1, 'Whirlwind applies Bleed (2 turns, 15% STR per turn)'],
      ['A6b', 'Iron Cyclone', 'k', 'ww', 1, 'After Whirlwind, +4 Armor for 2 turns'],
      ['A7', 'Triple Strike', 'e', 'ds', 1, 'Third blow (50% power) if the target is below half HP'],
      ['A8', 'Maelstrom', 'e', 'ww', 1, 'Whirlwind strikes the front row twice; second sweep at 40%'],
      ['A9', 'Frenzy', 'c', 'pw', 1, 'Above 30 Rage: all skills +15% power, +5% lifesteal'],
    ] },
  w1: { c: 'w', name: 'Vanguard', sub: "Charge · Headsman's Blow · Endurance", cap: 'B10',
    lanes: [['pw', [['B7']]], ['ch', [['B1'], ['B4a', 'B4b'], ['B2'], ['B3'], ['B8']]], ['hb', [['B5'], ['B6'], ['B9']]]],
    nodes: [
      ['B1', 'Long Stride', 'f', 'ch', 3, 'Charge power +6% per rank'],
      ['B2', 'Shoulder Check', 'b', 'ch', 1, 'Charge Stun lasts 2 turns on a critical hit'],
      ['B3', 'Battering Ram', 'b', 'ch', 1, 'Charge also hits one adjacent enemy for 40%'],
      ['B4a', 'Spear Point', 'k', 'ch', 1, 'Charge ignores 30% of Armor'],
      ['B4b', 'Shieldbreaker', 'k', 'ch', 1, 'Charge target loses 20% Armor for 2 turns'],
      ['B5', "Executioner's Eye", 'f', 'hb', 2, "Headsman's Blow +10% per rank vs targets below 30% HP"],
      ['B6', 'Clean Cut', 'b', 'hb', 1, "Headsman's Blow refunds 10 Rage on a kill"],
      ['B7', 'Blood Fuel', 'b', 'pw', 1, 'Healing received below 50% HP also grants 5 Rage'],
      ['B8', 'Juggernaut', 'e', 'ch', 1, 'Charge grants a shield worth 15% max HP for 2 turns'],
      ['B9', 'Verdict', 'e', 'hb', 1, "A kill resets Charge's cooldown; overkill damage splashes adjacent enemies at 30%", 1],
      ['B10', 'Unbroken', 'c', 'pw', 1, 'Once per battle, a lethal hit leaves you at 1 HP', 1],
    ] },
  h0: { c: 'h', name: 'Malice', sub: 'Evil Eye · Jinx · Omen building', cap: 'A9',
    lanes: [['ph', []], ['ee', [['A1'], ['A2'], ['A7']]], ['jx', [['A3'], ['A4'], ['A5a', 'A5b'], ['A6'], ['A8']]]],
    nodes: [
      ['A1', 'Baleful Gaze', 'f', 'ee', 3, 'Evil Eye power +6% per rank'],
      ['A2', 'Lingering Stare', 'b', 'ee', 1, 'Evil Eye critical hits apply +1 Omen'],
      ['A3', 'Crooked Luck', 'f', 'jx', 2, 'Jinx duration +1 turn per rank'],
      ['A4', 'Cheap Trick', 'f', 'jx', 1, 'Jinx costs 3 less MP'],
      ['A5a', 'Hex Knot', 'k', 'jx', 1, 'When Jinxed expires it jumps to an adjacent enemy', 1],
      ['A5b', 'Crooked Fate', 'k', 'jx', 1, 'Each miss by a Jinxed enemy restores 4 MP to you'],
      ['A6', 'Unlucky Number', 'b', 'jx', 1, 'A Jinxed enemy that misses gains 1 Omen'],
      ['A7', 'Twin Gaze', 'e', 'ee', 1, 'Evil Eye also hits a second enemy in the same row at 50%'],
      ['A8', 'Bad Star', 'e', 'jx', 1, 'Jinxed enemies take +15% damage from all sources'],
      ['A9', 'Witching Hour', 'c', 'ph', 1, 'Omen cap +1 on all enemies', 1],
    ] },
  h1: { c: 'h', name: 'Blight', sub: 'Withering Curse · Doom Mark · Omen bursting', cap: 'B9',
    lanes: [['ph', [['B6']]], ['wc', [['B1'], ['B3a', 'B3b'], ['B2'], ['B7']]], ['dm', [['B4'], ['B5'], ['B8']]]],
    nodes: [
      ['B1', 'Deeper Rot', 'f', 'wc', 3, 'Withering Curse damage +8% per rank'],
      ['B2', 'Creeping Doom', 'b', 'wc', 1, 'Each Withering tick has 20% chance to add 1 Omen', 1],
      ['B3a', 'Contagion', 'k', 'wc', 1, 'When a withered enemy dies, the curse spreads to an adjacent enemy'],
      ['B3b', 'Famine', 'k', 'wc', 1, 'Withered enemies deal 15% less damage'],
      ['B4', 'Mark of Ruin', 'f', 'dm', 2, 'Doom Mark +4% damage per Omen on the target, per rank'],
      ['B5', 'Early Doom', 'f', 'dm', 1, 'Doom Mark cooldown 4 → 3'],
      ['B6', 'Grave Echo', 'b', 'ph', 1, 'Ill Omen passes up to 3 Omens instead of 2'],
      ['B7', 'Grave Wick', 'e', 'wc', 1, 'Withered enemies receive 50% less healing'],
      ['B8', 'Seventh Night', 'e', 'dm', 1, 'A Doom kill Jinxes adjacent enemies for 2 turns'],
      ['B9', 'Harbinger', 'c', 'ph', 1, 'When Doom triggers, allies gain +10% power for 2 turns'],
    ] },
};

const NODES = {}, TREES = {};
Object.keys(DEF).forEach((tid, ti) => {
  const d = DEF[tid];
  const tr = TREES[tid] = { tid, c: d.c, idx: tid[1] | 0, name: d.name, sub: d.sub, pas: CLS[d.c].pas, cap: tid + '.' + d.cap,
    lanes: d.lanes.map(([sk, t]) => ({ sk, t: t.map((tok) => tok.map((c) => tid + '.' + c)) })) };
  d.nodes.forEach(([code, name, kind, sk, ranks, eff, nw]) => { NODES[tid + '.' + code] = { id: tid + '.' + code, tid, code, name, kind, sk, ranks, eff, nw: !!nw }; });
  tr.lanes.forEach((ln) => ln.t.forEach((tok) => { if (tok.length === 2) { NODES[tok[0]].fork = tok[1]; NODES[tok[1]].fork = tok[0]; } }));
  // L50 eklentileri (tasarim belirsiz: yalnizca varlik gosterilir)
  tr.lanes.forEach((ln) => ln.t.forEach((tok) => { const n = NODES[tok[0]]; if (n.kind === 'e') {
    NODES[n.id + 'II'] = { id: n.id + 'II', tid, code: n.code + 'II', name: n.name + ' II', kind: 'e', sk: n.sk, ranks: 1, l50: true, base: n.id, eff: 'Second evolution of ' + n.name + '. New behavior, unlocked at Level 50 (design TBD).' };
  } }));
  const cn = NODES[tr.cap];
  NODES[tr.cap + 'II'] = { id: tr.cap + 'II', tid, code: cn.code + 'II', name: cn.name + ' II', kind: 'c', sk: cn.sk, ranks: 1, l50: true, base: tr.cap, eff: 'Capstone II: strengthens ' + cn.name + '. Unlocked at Level 50 (design TBD).' };
});
const kd = (id) => NODES[id].kind;
const nonEvo = (ln) => ln.t.filter((t) => kd(t[0]) !== 'e');
const evoTok = (ln) => ln.t.find((t) => kd(t[0]) === 'e');

/* "29 puanlik tipik yapi" siralari (sonundan kirpilir). kod:rank */
const ORD = {
  w: {
    base: ['A1:3', 'B1:3', 'A2', 'A3:2', 'B2', 'A4', 'A5', 'A6a', 'B8', 'A7', 'A8', 'B5:1'],
    c13: ['A1:3', 'B1:3', 'A2', 'A3:2', 'A4', 'A6a', 'A5', 'A7', 'A8', 'B4a', 'B2', 'B5:2'],
    c4: ['A1:3', 'B1:3', 'A2', 'A3:2', 'A4', 'A7', 'B2', 'B5:1'],
    c6: ['A1:3', 'A2', 'A3:2', 'A4', 'A6a', 'A5', 'B1:3', 'B4a', 'B2', 'B3', 'A9', 'B5:2', 'B6', 'B7'],
    c10: ['A1:3', 'A2', 'A3:2', 'A4', 'B1:3', 'B5:2', 'A5', 'A6a', 'A7', 'A8', 'B2', 'B4a'],
  },
  h: {
    base: ['A1:3', 'B1:2', 'A2', 'A3:2', 'B3a', 'A4', 'A5b', 'B4:2', 'A6', 'B5', 'B2', 'A7', 'B7'],
    c13: ['A1:3', 'B1:3', 'A2', 'A3:2', 'A4', 'A5b', 'B3a', 'B2', 'A6', 'A7', 'B7', 'B4:2'],
    c4: ['A1:3', 'B1:3', 'A2', 'A3:2', 'A4', 'A7', 'B2'],
    c6: ['A1:3', 'A2', 'A3:2', 'A4', 'A5b', 'A6', 'A9', 'B1:3', 'B3a', 'B2', 'B4:2', 'B5', 'B6'],
    c10: ['A1:3', 'A3:2', 'A4', 'A2', 'A5b', 'A6', 'A7', 'B1:3', 'B4:2', 'B5', 'B2', 'B3a'],
  },
};
const BAR = { w: [6, 6], h: [6, 6] };
const LAD = { w0: [0, 5, 6], w1: [1, 7, 3], h0: [0, 5, 6], h1: [1, 6, 2] };

function unitCost(n, st) {
  if (st === 5) return 1;
  if (n.kind === 'f') return 1;
  if (n.kind === 'e') return st === 6 && !n.l50 ? 0 : 4;
  if (n.kind === 'c') return 3;
  return 2;
}
const nodeCost = (n, st, rk) => (n.kind === 'f' ? rk : 1) * unitCost(n, st);
const TKC = {};
const T = (id) => (TKC[id[0]] || {})[id] || 0;
const anyT = (ids) => ids.some((i) => T(i) > 0);

function ladderSteps(ln, cap) {
  const steps = [];
  ln.t.forEach((tok) => { const n = NODES[tok[0]];
    if (tok.length === 1 && n.kind === 'f' && n.ranks > 1) for (let u = 0; u < n.ranks; u++) steps.push({ ids: [n.id], u });
    else steps.push({ ids: tok.slice() }); });
  if (cap) steps.push({ ids: [cap] });
  return steps;
}
function ladderPlan(tid) { const tr = TREES[tid]; return tr.lanes.map((ln, i) => ladderSteps(ln, i === 0 ? tr.cap : null)); }

function buildTaken(c, st) {
  const out = {};
  if (st === 5) {
    ['0', '1'].forEach((i) => { const tid = c + i; const plan = ladderPlan(tid);
      plan.forEach((steps, li) => steps.slice(0, LAD[tid][li]).forEach((s) => { if (s.u != null) out[s.ids[0]] = s.u + 1; else out[s.ids[0]] = 1; })); });
    return out;
  }
  const key = { 1: 'c13', 3: 'c13', 4: 'c4', 6: 'c6', 10: 'c10' }[st] || 'base';
  const budget = 29 - (st === 4 ? BAR[c][0] + BAR[c][1] : 0);
  let sp = 0;
  for (const e of ORD[c][key]) {
    const [code, r] = e.split(':'); const id = c + (code[0] === 'A' ? 0 : 1) + '.' + code; const n = NODES[id]; const rk = r ? +r : 1;
    const cs = nodeCost(n, st, rk); if (sp + cs > budget) break; out[id] = rk; sp += cs;
  }
  const trs = [TREES[c + '0'], TREES[c + '1']];
  if (st === 4) trs.forEach((tr) => { const b = BAR[c][tr.idx]; tr.lanes.forEach((ln) => { const ev = evoTok(ln); if (ev && b < 6) delete out[ev[0]]; }); if (b < 12) delete out[tr.cap]; });
  if (st === 6) trs.forEach((tr) => tr.lanes.forEach((ln) => { const ev = evoTok(ln); if (!ev) return; if (lanePlanDone(ln, out)) out[ev[0]] = 1; }));
  if (st === 9) trs.forEach((tr) => tr.lanes.forEach((ln) => { const ev = evoTok(ln); if (ev && equipped(ln, out).length < 2) delete out[ev[0]]; }));
  if (st === 10) trs.forEach((tr) => { const r = rings(tr); const d1 = r[0].every((e) => (out[e.id] || 0) > e.u); const d2 = r[1].every((e) => (out[e.id] || 0) > 0 || (NODES[e.id].fork && (out[NODES[e.id].fork] || 0) > 0));
    if (!d1) r[1].forEach((e) => delete out[e.id]); if (!d1 || !d2) r[2].forEach((e) => delete out[e.id]); });
  return out;
}
function lanePlanDone(ln, out) { return nonEvo(ln).every((tok) => tok.some((id) => (out[id] || 0) >= NODES[id].ranks)); }
function equipped(ln, tk) { const res = []; nonEvo(ln).forEach((tok) => tok.forEach((id) => { if ((tk[id] || 0) > 0) res.push(id); })); return res.slice(0, 2); }
function rings(tr) {
  const inner = [], mid = [], outer = [];
  tr.lanes.forEach((ln) => ln.t.forEach((tok) => tok.forEach((id) => { const n = NODES[id];
    if (n.kind === 'f') for (let u = 0; u < n.ranks; u++) inner.push({ id, u }); else if (n.kind === 'b' || n.kind === 'k') mid.push({ id, u: 0 }); else if (n.kind === 'e') outer.push({ id, u: 0 }); })));
  outer.push({ id: tr.cap, u: 0 });
  return [inner, mid, outer];
}
function spent(tid, st) {
  const tr = TREES[tid]; let s = 0;
  Object.keys(NODES).forEach((id) => { if (NODES[id].tid === tid && T(id) > 0) s += nodeCost(NODES[id], st, T(id)); });
  if (st === 4) s += BAR[tr.c][tr.idx];
  return s;
}

/* ================= YAPI METINLERI (Turkce) ================= */
const STR = [
  null,
  { n: 'Skill Rows', rule: "Her skill kendi satırında soldan sağa açılır: Filler → Filler → Çatal → Davranış → Evolve; düğümler sırayla alınır. Pasif satırı en üstte; kapstone iki Evolve de alınınca açılır.", meta: "Bedel: filler 1 · çatal 2 · davranış 2 · evolve 4 · kapstone 3. Artı: telefonda en okunaklı, 'skill'imi büyütüyorum' hissi. Eksi: dallanma az. L50: her satıra Evolve II (4 puan) + Kapstone II." },
  { n: 'Tier Columns', rule: "Sekmede 5 sütun var; sütun o sekmeye harcanan puanla açılır: 0 / 3 / 6 / 10 / 15. Açık sütundaki her düğüm serbestçe alınır (zincir yok); Evolve'lar T4, kapstone T5.", meta: "Artı: serbest seçim, Grim Dawn hissi, ölçeklemesi kolay. Eksi: sütun kilidi 'boşa puan' hissi verebilir. L50: T6 (20) ve T7 (25) sütunları; Evolve II ve Kapstone II T7'de." },
  { n: 'Branching Tree', rule: "Kökten yukarı dallanan ağaç: düğümün önkoşulu altındaki düğüm + level kapısı (L2 / 6 / 12 / 18 / 24 / 30). Çatalda iki koldan birine girince diğeri kilitlenmez ama puan yetmez.", meta: "Artı: klasik, 'yol seçme' hissi güçlü. Eksi: ekranda en kalabalık, telefonda kaydırma ister. L50: L36 / 42 / 50 katmanları üste eklenir (Evolve II ve Kapstone II)." },
  { n: 'Mastery Bar', rule: "Her sekmenin 0-15 bir ustalık barı var: bara konan puan o sekmenin skill'lerine +1% power verir (genel stat değil) ve sütun açar. Evolve bar 6'da açılır (bar 12 = ikinci evolve eşiği; burada kapstone sütunu, varsayım). Düğümler bar dışı puanla alınır.", meta: "Artı: 'bara mı skill'e mi' kararı. Eksi: iki havuz anlatması zor. L50: bar 25'e çıkar, yeni eşikler 20 / 25 (Evolve II, Kapstone II)." },
  { n: 'Rank Ladder', rule: "Her skill'in bir basamak merdiveni var; sıra zorunlu, her basamak 1 puan: küçük basamaklar, ortada çatal, tepede Evolve. Sekme = 2 skill merdiveni + pasif merdiveni (en solda).", meta: "Artı: en basit, tek kural ('sonraki basamak'). Eksi: seçim azlığı, dallanma yalnızca çatalda. L50: basamak 11-15 eklenir (15 = Evolve II). Not: havuzda skill başına 10 düğüm yok, merdivenler kısa." },
  { n: 'Constellations', rule: "Sekme = her skill için bir takımyıldız. Yıldızlar (1 puan) herhangi sırayla alınır; takımyıldız tamamlanınca Evolve bedelsiz açılır (ödül). Kapstone, iki takımyıldız tamamlanınca açılır.", meta: "Artı: 'tamamlama' ödülü, görsel olarak güzel. Eksi: filler ağırlıklı, her yıldız küçük. L50: sekmeye 4. ve 5. takımyıldız (Evolve II'ler)." },
  { n: 'Hex Grid', rule: "Petek ızgara: merkez açık, komşusu açık olan hücre alınabilir. Köşelerde Evolve, dış halkada kapstone. Çatal yok (iki çatal hücresi de alınabilir); yol seçimi hücre komşuluğuyla.", meta: "Artı: keşif hissi, yollar doğal. Eksi: dokunmatikte küçük hücreler; dengesi zor. L50: dış halka eklenir (Evolve II köşeleri)." },
  { n: 'Choice Rows', rule: "Puan yok: her 3 level'da bir satır açılır, satırda 2-3 seçenekten 1'i seçilir. Evolve satırları hangi skill'in evrileceğini seçtirir. Sıfırlama = satır değiştirme ücreti. Sekme = satırların yarısı (A tek, B çift level).", meta: "Artı: her level'da anlamlı seçim, hiç 'boş puan' yok. Eksi: puan biriktirme hissi yok; 29 puan kuralını bırakır (satır = level). L50: L33...L48 satırları + L50 Evolve II satırı." },
  { n: 'Rune Slots', rule: "Her skill'in 2 rün yuvası var. Rün = ağaç düğümü; puanla satın alınır, yuvaya takılır (turuncu nokta = takılı), takılı olmayan rün bekler, değişim bedava. Evolve, 2 yuvası dolu skill'e açılır (4 puan).", meta: "Artı: yükleme esnekliği, sıfırlama ihtiyacı az. Eksi: yeni ekran (rün takma), en çok motor işi. L50: 3. yuva (L40) ve T4 rünler." },
  { n: 'Spiral Ring', rule: "İç içe 3 halka: iç halka (filler) tamamen alınmadan orta halkaya geçilmez; orta halka çatal + davranışlar; dış halka 2 Evolve + kapstone. Halka içinde sıra serbest.", meta: "Artı: net ilerleme hissi, telefonda tek ekran. Eksi: iç halka zorunlu, ilk puanlar seçimsiz. L50: 4. halka (Evolve II, Kapstone II). Not: rank'ler ayrı elmas; iç halka 5-7 düğüm." },
];

/* ================= YARDIMCILAR ================= */
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const SZ = { f: 34, k: 34, b: 46, e: 66, c: 82 };
const ST = { st: 1, c: 'w', t: { w: 0, h: 0 }, both: false, phone: false, clean: false };
let REQ = {};
let E = [];

function nd(id, x, y, o = {}) {
  const n = NODES[id]; const unit = o.unit;
  const t = unit != null ? (T(id) > unit ? 1 : 0) : T(id);
  const s = Math.round((o.s || SZ[n.kind]) * (o.k || 1));
  const alt = n.fork && !t && T(n.fork) > 0;
  const cls = ['nd', 'k-' + n.kind, t ? 'on' : '', n.l50 ? 'l50' : '', o.lk ? 'lk' : '', alt ? 'alt' : '', o.inl ? 'inl' : ''].filter(Boolean).join(' ');
  const style = o.inl ? `--s:${s}px` : `left:${x}px;top:${y}px;--s:${s}px`;
  const pip = n.ranks > 1 && unit == null ? `<i class="rk">${T(id)}/${n.ranks}</i>` : '';
  const showLb = o.lb != null ? o.lb : (n.kind === 'b' || n.kind === 'e' || n.kind === 'c');
  const lb = showLb ? `<em class="lb">${esc(n.name)}</em>` : '';
  const tag = n.l50 ? '<b class="l5">L50</b>' : '';
  return `<button type="button" class="${cls}" data-id="${id}"${unit != null ? ` data-u="${unit}"` : ''} style="${style}"><span class="dm"><img src="skill-trees/${IC[n.sk]}.webp" alt="" draggable="false"></span>${pip}${lb}${tag}</button>`;
}
// belirteç (tek dugum ya da catal cifti); catal ust uste iki elmas (yatay=true ise yan yana)
function tok(ids, x, y, o = {}) {
  if (ids.length === 1) return nd(ids[0], x, y, o);
  const d = o.horiz ? [[-36, 0], [36, 0]] : [[0, -22], [0, 22]];
  return nd(ids[0], x + d[0][0], y + d[0][1], { ...o, lb: false }) + nd(ids[1], x + d[1][0], y + d[1][1], { ...o, lb: false });
}
function edge(ax, ay, bx, by, on, d) { E.push(`<line class="l${on ? ' on' : ''}${d ? ' d' : ''}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`); }
function cv(w, h, body, extra = '', cls = '') {
  return `<div class="cvw"><div class="cv ${cls}" style="width:${w}px;height:${h}px"><svg class="eg" width="${w}" height="${h}">${extra}${E.join('')}</svg>${body}</div></div>`;
}
function laneLbl(sk, y, left) {
  return `<div class="ll${isPas(sk) ? ' pas' : ''}" style="top:${y}px${left != null ? `;left:${left}px` : ''}"><span class="med"><img src="skill-trees/${IC[sk]}.webp" alt=""></span><span><b>${isPas(sk) ? SKN[sk] : SKN[sk]}</b><i>${isPas(sk) ? 'Passive' : 'Skill'}</i></span></div>`;
}
const rq = (ids, text) => ids.forEach((i) => { REQ[i] = text; });
const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/* ================= 1. SKILL ROWS ================= */
function S1(tid) {
  const tr = TREES[tid]; E = []; let out = ''; const X = (i) => 230 + i * 112, RH = 110, top = 58;
  tr.lanes.forEach((ln, r) => {
    const y = top + r * RH; out += laneLbl(ln.sk, y);
    if (r) out += `<div class="band" style="top:${y - RH / 2}px"></div>`;
    const seq = nonEvo(ln).map((t, i) => ({ t, x: X(i) })); const ev = evoTok(ln);
    if (ev) { seq.push({ t: ev, x: X(4) }); seq.push({ t: [ev[0] + 'II'], x: X(5) }); }
    if (r === 0) { seq.push({ t: [tr.cap], x: X(5) }); seq.push({ t: [tr.cap + 'II'], x: X(6) }); }
    const prevMain = [];
    seq.forEach((s, i) => {
      out += tok(s.t, s.x, y);
      const isCapChain = s.t[0] === tr.cap || s.t[0] === tr.cap + 'II';
      if (isCapChain) { if (s.t[0] === tr.cap + 'II') edge(X(5) + 40, y, s.x - 40, y, false, true); rq(s.t, s.t[0] === tr.cap ? 'Opens when both Evolves of this tab are taken' : 'Level 50 only: appended to the row'); return; }
      if (i > 0 && seq[i - 1].t[0] !== tr.cap) { const p = seq[i - 1]; edge(p.x + 24, y, s.x - 24, y, anyT(p.t) && anyT(s.t), NODES[s.t[0]].l50); }
      rq(s.t, NODES[s.t[0]].l50 ? 'Level 50 only: appended to the row' : (i ? 'Take the node to its left first (row order)' : 'First node of the row: always available'));
    });
  });
  return cv(X(6) + 80, top + 3 * RH - 40, out);
}

/* ================= 2 + 4. KOLON DUZENLERI ================= */
function colLayout(tid, st) {
  const tr = TREES[tid]; E = []; let out = '', extra = ''; const sp = spent(tid, st), bar = BAR[tr.c][tr.idx]; const TS = 88;
  let cols, topY;
  if (st === 2) {
    cols = [0, 3, 6, 10, 15, 20, 25].map((p, i) => ({ x: 230 + i * 142, lab: 'T' + (i + 1), sub: p + ' pts', th: p, l50: i >= 5, open: i < 5 && sp >= p }));
    topY = 70;
  } else {
    const bx = (v) => 230 + v * 40; topY = 150;
    cols = [0, 3, 6, 12, 20, 25].map((v) => ({ x: bx(v), lab: 'Bar ' + v, sub: v === 6 ? 'Evolve' : v === 12 ? 'Capstone' : v >= 20 ? 'L50' : 'Nodes', th: v, l50: v >= 20, open: v <= bar }));
    // bar
    out += `<div class="abs" style="left:6px;top:36px;font:600 12px Cinzel;letter-spacing:.14em;color:#a8977a;width:200px">MASTERY BAR<br><span style="color:#f3d999;font-size:16px">${bar} / 15</span> <span style="font:14px 'EB Garamond';letter-spacing:0;color:#a8977a">+${bar}% power</span></div>`;
    for (let v = 0; v < 25; v++) { const l50 = v >= 15, on = v < bar;
      out += `<div class="abs" style="left:${bx(v) + 2}px;top:50px;width:36px;height:18px;border:1px ${l50 ? 'dashed' : 'solid'} ${on ? '#e8cf8f' : 'rgba(217,178,106,.3)'};background:${on ? 'linear-gradient(180deg,#f3d999,#a8823f)' : 'rgba(255,255,255,.03)'};${l50 ? 'opacity:.55' : ''}"></div>`; }
    [0, 3, 6, 12, 15, 20, 25].forEach((v) => { out += `<div class="abs" style="left:${bx(v) - 1}px;top:44px;width:2px;height:30px;background:${v >= 20 ? 'rgba(217,178,106,.5)' : '#d9b26a'}"></div><div class="abs" style="left:${bx(v) - 30}px;top:78px;width:60px;text-align:center;font:600 11px Cinzel;color:${v >= 20 ? 'rgba(243,217,153,.6)' : '#a8977a'}">${v}${v === 6 ? '<br>Evolve' : v === 12 ? '<br>Capstone' : v === 15 ? '<br>max' : v === 20 ? '<br>L50' : v === 25 ? '<br>L50 max' : ''}</div>`; });
  }
  // yerlestirme
  const lanes = tr.lanes.map((ln, li) => {
    const items = []; const non = nonEvo(ln), n = non.length;
    non.forEach((t, i) => { let col;
      if (st === 2) col = li === 0 ? 1 : Math.floor(i * 3 / n); else col = li === 0 ? 1 : (i < Math.ceil(n / 2) ? 0 : 1);
      items.push({ t, col }); });
    const ev = evoTok(ln);
    if (ev) { items.push({ t: ev, col: st === 2 ? 3 : 2 }); items.push({ t: [ev[0] + 'II'], col: st === 2 ? 6 : 4 }); }
    if (li === 0) { items.push({ t: [tr.cap], col: st === 2 ? 4 : 3 }); items.push({ t: [tr.cap + 'II'], col: st === 2 ? 6 : 5 }); }
    const cnt = {}; items.forEach((it) => { cnt[it.col] = (cnt[it.col] || 0) + 1; });
    const mx = Math.max(1, ...Object.values(cnt)); return { ln, items, cnt, h: mx * TS + 16 };
  });
  let yy = topY; lanes.forEach((L) => { L.y0 = yy; yy += L.h; });
  const H = yy + 20, W = cols[cols.length - 1].x + 90;
  cols.forEach((c, i) => { out = `<div class="colbg${c.l50 ? ' l50' : ''}${!c.open && !c.l50 ? ' lock' : ''}" style="left:${c.x - 68}px;width:136px;top:${st === 2 ? 4 : 96}px;height:${H - (st === 2 ? 4 : 96)}px"></div>` + out;
    if (st === 2) out += `<div class="th ${c.l50 ? 'l50' : c.open ? 'open' : 'lock'}" style="left:${c.x - 60}px;width:120px">${c.lab}<small>${c.sub}</small></div>`; });
  lanes.forEach((L, li) => { out += laneLbl(L.ln.sk, L.y0 + L.h / 2); if (li) out += `<div class="band" style="top:${L.y0}px"></div>`;
    const seen = {}; L.items.forEach((it) => { const k = seen[it.col] = (seen[it.col] || 0) + 1; const c = cols[it.col];
      const y = L.y0 + (L.h - L.cnt[it.col] * TS) / 2 + TS / 2 + (k - 1) * TS; const n0 = NODES[it.t[0]];
      out += tok(it.t, c.x, y, { lk: !c.open && !n0.l50 });
      rq(it.t, n0.l50 ? 'Level 50 only: new column' : (st === 2 ? `Column opens at ${c.th} points spent in this tab (you have ${sp})` : `Column opens at Mastery bar ${c.th} (this tab: ${bar})`)); }); });
  if (st === 2) out += `<div class="note-in" style="left:${cols[5].x - 66}px;top:${topY + 6}px;width:132px">T6 · new nodes TBD</div>`;
  return cv(W, H, out);
}
const S2 = (tid) => colLayout(tid, 2);
const S4 = (tid) => colLayout(tid, 4);

/* ================= 3. BRANCHING TREE ================= */
function S3(tid) {
  const tr = TREES[tid]; E = []; let out = ''; const colX = [150, 430, 710], capX = 570, BH = 92, LV = [2, 6, 12, 18, 24, 30, 36, 42, 50];
  const H = 70 + 9 * BH + 120, Y = (b) => H - 120 - b * BH, pos = {};
  for (let b = 0; b < 9; b++) { out += `<div class="band" style="top:${Y(b) + BH / 2}px"></div><div class="bl${b >= 6 ? ' l50' : ''}" style="top:${Y(b)}px">L${LV[b]}</div>`; }
  out += `<div class="abs" style="left:${colX[1] - 7}px;top:${H - 80}px;width:14px;height:14px;transform:rotate(45deg);border:1.5px solid #d9b26a;background:#0d0a06"></div>`;
  const at = (ids, x, b) => { out += tok(ids, x, Y(b), { horiz: true }); const hasEv = NODES[ids[0]]; pos[ids[0]] = { x, y: Y(b), ids }; };
  tr.lanes.forEach((ln, li) => { const x = colX[li]; out += laneLbl(ln.sk, H - 24, x - 75).replace('left:6px', ''); });
  const lanePos = [];
  tr.lanes.forEach((ln, li) => { const x = colX[li]; const pts = []; const non = nonEvo(ln);
    non.forEach((t, i) => { const b = li === 0 ? 2 : i; at(t, x, b); pts.push({ t, x, b }); });
    const ev = evoTok(ln); if (ev) { at(ev, x, 4); pts.push({ t: ev, x, b: 4 }); if (li > 0) { at([ev[0] + 'II'], x, li === 1 ? 6 : 7); } }
    lanePos.push(pts); });
  at([tr.cap], capX, 5); at([tr.cap + 'II'], capX, 8);
  tr.lanes.forEach((ln, li) => { const pts = lanePos[li]; pts.forEach((p, i) => {
      const from = i ? pts[i - 1] : null;
      if (from) edge(from.x, Y(from.b), p.x, Y(p.b), anyT(from.t) && anyT(p.t)); else if (li === 0 && !p.t.length) {} else edge(colX[1], H - 73, p.x, Y(p.b), anyT(p.t));
      const lv = LV[p.b]; rq(p.t, `Needs the node below + Level ${lv}`); });
    const ev = evoTok(ln); if (ev && li > 0) { edge(colX[li], Y(4), colX[li], Y(li === 1 ? 6 : 7), false, true); rq([ev[0] + 'II'], 'Level ' + (li === 1 ? 36 : 42) + ' layer (L50 only)'); } });
  [1, 2].forEach((li) => { const ev = evoTok(tr.lanes[li]); if (ev) { edge(colX[li], Y(4), capX, Y(5), anyT(ev) && T(tr.cap) > 0); edge(colX[li], li === 1 ? Y(6) : Y(7), capX, Y(8), false, true); } });
  edge(capX, Y(5), capX, Y(8), false, true);
  rq([tr.cap], 'Needs both Evolves + Level 30'); rq([tr.cap + 'II'], 'Level 50 layer: needs Capstone and both Evolve II');
  return cv(860, H, out);
}

/* ================= 5. RANK LADDER ================= */
function S5(tid) {
  const tr = TREES[tid]; E = []; let out = ''; const lx = [170, 470, 770], SP = 62; const plan = ladderPlan(tid);
  const maxS = Math.max(...plan.map((p) => p.length)) + 1; const H = 60 + (maxS + 1) * SP + 90, Y = (s) => H - 100 - s * SP;
  plan.forEach((steps, li) => { const x = lx[li]; const sk = tr.lanes[li].sk; out += laneLbl(sk, H - 36, x - 75).replace('left:6px', '');
    const all = steps.slice(); const ev = evoTok(tr.lanes[li]); if (ev) all.push({ ids: [ev[0] + 'II'], l50: true });
    all.forEach((s, i) => { const y = Y(i);
      const o = s.u != null ? { unit: s.u } : {};
      if (s.ids.length === 2) out += tok(s.ids, x, y, { horiz: true }); else out += nd(s.ids[0], x, y, { ...o, lb: s.u == null && kd(s.ids[0]) !== 'f' });
      out += `<div class="abs" style="left:${x - 78}px;top:${y - 8}px;width:30px;text-align:right;font:600 12px Cinzel;color:${s.l50 ? 'rgba(243,217,153,.6)' : '#a8977a'}">${i + 1}</div>`;
      if (i) edge(x, Y(i - 1), x, y, anyT(all[i - 1].ids) && (s.u != null ? T(s.ids[0]) > s.u : anyT(s.ids)) && (all[i - 1].u != null ? T(all[i - 1].ids[0]) > all[i - 1].u : true), !!s.l50);
      rq(s.ids, s.l50 ? 'Level 50 only: extends the ladder' : (i ? 'Take the previous step first (1 point per step)' : 'Step 1: always available')); });
    edge(x, H - 100 + 8, x, Y(0), false, false); });
  return cv(940, H, out, '', 'nolb-x');
}

/* ================= 6. CONSTELLATIONS ================= */
const SH = { 1: [[150, 110]], 2: [[90, 125], [215, 95]], 3: [[55, 150], [150, 70], [245, 140]], 4: [[45, 150], [115, 70], [195, 125], [255, 55]], 5: [[40, 150], [100, 75], [165, 130], [230, 70], [270, 150]], 6: [[35, 140], [90, 70], [150, 125], [205, 60], [255, 105], [215, 170]] };
function S6(tid) {
  const tr = TREES[tid]; E = []; let out = ''; const CW = 290, GAP = 440, x0 = (k) => 20 + k * GAP, Y0 = 50;
  const groups = tr.lanes.filter((ln) => nonEvo(ln).length); const evoPos = [];
  groups.forEach((ln, k) => { const non = nonEvo(ln); const sh = SH[Math.min(6, non.length)]; const ox = x0(k);
    out += `<div class="abs" style="left:${ox}px;top:${Y0 - 34}px;font:600 12px Cinzel;letter-spacing:.16em;color:#a8977a;text-transform:uppercase">Constellation ${roman[k]} · ${SKN[ln.sk]}</div>`;
    const pts = non.map((t, i) => ({ t, x: ox + sh[i][0], y: Y0 + sh[i][1] }));
    pts.forEach((p, i) => { out += tok(p.t, p.x, p.y, { lb: false }); if (i) edge(pts[i - 1].x, pts[i - 1].y, p.x, p.y, anyT(pts[i - 1].t) && anyT(p.t)); rq(p.t, 'Free star: take in any order. Complete the constellation to earn its Evolve'); });
    const done = lanePlanDone(ln, TKC[tr.c]); const ev = evoTok(ln);
    if (ev) { const ex = ox + CW + 60, ey = Y0 + 100; const last = pts[pts.length - 1]; edge(last.x, last.y, ex, ey, done, true); out += nd(ev[0], ex, ey, {}); evoPos.push({ x: ex, y: ey, ev, k }); rq(ev, done ? 'Reward: constellation complete (free)' : 'Reward: complete every star of this constellation (free)');
      const gx = ox + CW + 60, gy = Y0 + 330; out += nd(ev[0] + 'II', gx, gy, {}); rq([ev[0] + 'II'], 'Level 50 only: 4th/5th constellation reward');
      out += `<div class="abs" style="left:${ox}px;top:${gy - 78}px;font:600 12px Cinzel;letter-spacing:.16em;color:rgba(243,217,153,.6);text-transform:uppercase">Constellation ${roman[groups.length + k]} · L50</div>`;
      SH[3].forEach(([sx, sy]) => { out += `<div class="abs" style="left:${ox + sx - 7}px;top:${gy - 64 + sy / 2 + 14}px;width:14px;height:14px;transform:rotate(45deg);border:1.5px dashed rgba(217,178,106,.4)"></div>`; });
      edge(ev && ex, ey + 34, gx, gy - 36, false, true); }
  });
  const cx = evoPos.length ? evoPos.reduce((a, p) => a + p.x, 0) / evoPos.length : 300; const cy = Y0 + 230;
  out += nd(tr.cap, cx, cy, {}); rq([tr.cap], 'Opens when two constellations are complete');
  evoPos.forEach((p) => edge(p.x, p.y + 34, cx, cy - 40, anyT(p.ev) && T(tr.cap) > 0, false));
  out += nd(tr.cap + 'II', cx, cy + 190, {}); rq([tr.cap + 'II'], 'Level 50 only'); edge(cx, cy + 42, cx, cy + 190 - 42, false, true);
  return cv(20 + groups.length * GAP + 40, cy + 280, out);
}

/* ================= 7. HEX GRID ================= */
const HD = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
function ring(k) { if (!k) return [[0, 0]]; const r = []; let q = -k, rr = k; for (let i = 0; i < 6; i++) for (let j = 0; j < k; j++) { r.push([q, rr]); q += HD[i][0]; rr += HD[i][1]; } return r; }
function S7(tid) {
  const tr = TREES[tid]; E = []; let out = '', hx = ''; const R = 46, cx = 300, cy = 262; const xy = (q, r) => [cx + R * Math.sqrt(3) * (q + r / 2), cy + R * 1.5 * r];
  const r1 = ring(1), r2 = ring(2), r3 = ring(3); const cells = {}; const key = (p) => p[0] + ',' + p[1];
  const fills = []; tr.lanes.forEach((ln, li) => nonEvo(ln).forEach((t) => t.forEach((id) => fills.push({ id, li }))));
  const lastIdx = {}; const place = (p, id) => { cells[key(p)] = id; };
  fills.slice(0, 6).forEach((f, i) => { place(r1[i], f.id); lastIdx[f.li] = i; });
  const edgeOrder = [1, 7, 3, 9, 5, 11]; fills.slice(6).forEach((f, i) => place(r2[edgeOrder[i]], f.id));
  const used = new Set();
  tr.lanes.forEach((ln, li) => { const ev = evoTok(ln); if (!ev) return; let i = lastIdx[li];
    if (i == null) { const j = fills.slice(6).findIndex((f) => f.li === li); i = j >= 0 ? ((edgeOrder[j] - 1) / 2 + 1) % 6 : 0; while (used.has(2 * i)) i = (i + 1) % 6; }
    place(r2[2 * i], ev[0]); used.add(2 * i); place(r3[3 * i], ev[0] + 'II'); });
  let ci = [6, 8, 10, 0, 2, 4].find((v) => !used.has(v)); place(r2[ci], tr.cap); place(r3[3 * (ci / 2)], tr.cap + 'II');
  [[r2, false], [r3, true]].forEach(([rg, d]) => rg.forEach((p) => { const [x, y] = xy(p[0], p[1]); const id = cells[key(p)]; hx += hexPoly(x, y, R * .95, d ? 'd' : (id && T(id) > 0 ? 'on' : '')); }));
  [[0, 0]].concat(r1).forEach((p) => { const [x, y] = xy(p[0], p[1]); const id = cells[key(p)]; hx += hexPoly(x, y, R * .95, id && T(id) > 0 ? 'on' : ''); });
  const all = Object.keys(cells).map((k) => ({ p: k.split(',').map(Number), id: cells[k] })); all.push({ p: [0, 0], id: null });
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const dq = all[j].p[0] - all[i].p[0], dr = all[j].p[1] - all[i].p[1];
    if (HD.some((d) => d[0] === dq && d[1] === dr)) { const a = xy(...all[i].p), b = xy(...all[j].p); const ta = all[i].id ? T(all[i].id) > 0 : true, tb = all[j].id ? T(all[j].id) > 0 : true;
      const l50 = (all[i].id && NODES[all[i].id].l50) || (all[j].id && NODES[all[j].id].l50); edge(a[0], a[1], b[0], b[1], ta && tb, !!l50); } }
  out += `<div class="abs" style="left:${cx - 6}px;top:${cy - 6}px;width:12px;height:12px;transform:rotate(45deg);background:#e8cf8f;box-shadow:0 0 10px rgba(243,217,153,.6)"></div><div class="note-in" style="left:${cx - 40}px;top:${cy + 12}px;width:80px;font:600 10px Cinzel;letter-spacing:.2em">START</div>`;
  all.forEach((c) => { if (!c.id) return; const [x, y] = xy(...c.p); out += nd(c.id, x, y, { lb: false });
    rq([c.id], NODES[c.id].l50 ? 'Level 50 only: outer ring' : 'Take a neighbouring open cell first'); });
  return cv(600, 530, out, hx, 'nolb');
}
function hexPoly(x, y, r, cls) { const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (30 + 60 * k); pts.push((x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1)); } return `<polygon class="hx ${cls}" points="${pts.join(' ')}"/>`; }

/* ================= 8. CHOICE ROWS ================= */
const ROWS = {
  w0: [[3, ['A1', 'A2', 'A3']], [9, ['A4', 'A5']], [15, ['A6a', 'A6b']], [21, ['A7', 'A8']], [27, ['A9']]],
  w1: [[6, ['B1', 'B2', 'B3']], [12, ['B4a', 'B4b']], [18, ['B5', 'B6', 'B7']], [24, ['B8', 'B9']], [30, ['B10']]],
  h0: [[3, ['A1', 'A2', 'A3']], [9, ['A4', 'A6']], [15, ['A5a', 'A5b']], [21, ['A7', 'A8']], [27, ['A9']]],
  h1: [[6, ['B1', 'B2', 'B4']], [12, ['B3a', 'B3b']], [18, ['B5', 'B6']], [24, ['B7', 'B8']], [30, ['B9']]],
};
function S8(tid) {
  const tr = TREES[tid]; let out = '<div class="rowsx">'; const pre = tid + '.';
  ROWS[tid].forEach(([lv, codes]) => { const ids = codes.map((c) => pre + c); let pick = ids.find((i) => T(i) > 0); if (!pick) pick = ids[0]; if (ids.length === 1) pick = ids[0];
    out += `<div class="crow"><div class="lv"><span>L${lv}</span></div><div class="opts">`;
    ids.forEach((id) => { const n = NODES[id]; rq([id], `Level ${lv} row · free pick, swap fee 15 + 4 × level gold`);
      out += `<div class="opt${id === pick ? ' pick' : ''}" data-id="${id}">${nd(id, 0, 0, { inl: true, lb: false, s: 52 })}<div><b>${esc(n.name)}</b><span class="d">${esc(n.eff)}</span></div></div>`; });
    out += '</div></div>'; });
  const l50 = tr.idx === 0 ? [33, 39, 45] : [36, 42, 48];
  l50.forEach((lv) => { out += `<div class="crow l50"><div class="lv"><span>L${lv}</span></div><div class="opts"><div class="opt empty">New choice · design TBD</div><div class="opt empty">New choice · design TBD</div></div></div>`; });
  const evs = tr.lanes.map(evoTok).filter(Boolean).map((t) => t[0] + 'II');
  out += `<div class="crow l50"><div class="lv"><span>L50</span></div><div class="opts">${evs.map((id) => { rq([id], 'Level 50 row · Evolve II pick'); return `<div class="opt" data-id="${id}">${nd(id, 0, 0, { inl: true, lb: false, s: 52 })}<div><b>${esc(NODES[id].name)}</b><span class="d">Evolve II · ${esc(NODES[id].eff.split('.')[0])}.</span></div></div>`; }).join('')}</div></div>`;
  return out + '</div>';
}

/* ================= 9. RUNE SLOTS ================= */
function S9(tid) {
  const tr = TREES[tid]; let out = '<div class="runes">'; const tk = TKC[tr.c];
  tr.lanes.forEach((ln, li) => { const non = nonEvo(ln); const eq = equipped(ln, tk); const ev = evoTok(ln); const sk = ln.sk;
    const sock = (i) => { const id = eq[i]; if (id) { return `<div class="sock eq">${nd(id, 0, 0, { inl: true, lb: false, s: 38 })}</div>`; } return `<div class="sock"></div>`; };
    out += `<div class="rcard${li === 0 ? ' pas' : ''}"><div class="hd"><span class="med"><img src="skill-trees/${IC[sk]}.webp" alt=""></span><div><b>${SKN[sk]}</b><i>${li === 0 ? 'PASSIVE' : 'SKILL'}</i></div></div>
      <div class="slots"><span class="lab">Slots</span>${sock(0)}${sock(1)}<div class="sock l50" title="3rd slot at Level 40"></div></div>
      <div class="arrow"></div>
      <div class="shelf"><span class="lab">Runes</span>${non.length ? non.map((t) => t.map((id) => nd(id, 0, 0, { inl: true, lb: false, s: 38 })).join('')).join('') : '<span style="color:#a8977a;font-size:14px">No runes in this tree</span>'}</div>
      ${ev ? `<div class="evo">${nd(ev[0], 0, 0, { inl: true, lb: true, s: 62, lk: eq.length < 2 })}${nd(ev[0] + 'II', 0, 0, { inl: true, lb: false, s: 44 })}<div class="why">${eq.length < 2 ? `Needs 2 runes in ${SKN[sk]}` : 'Both slots filled: Evolve open'}</div></div>` : ''}</div>`;
    non.forEach((t) => rq(t, 'Buy with points, then socket it in Gear > Skills (free to swap)'));
    if (ev) { rq(ev, `Needs 2 runes socketed in ${SKN[sk]}`); rq([ev[0] + 'II'], 'Level 50 only'); } });
  out += `<div class="rcard rcap"><div class="hd"><span class="med"><img src="skill-trees/${IC[tr.pas]}.webp" alt=""></span><div><b>Capstone</b><i>TAB</i></div></div><div class="evo" style="margin-left:0">${nd(tr.cap, 0, 0, { inl: true, lb: true, s: 74 })}${nd(tr.cap + 'II', 0, 0, { inl: true, lb: false, s: 48 })}<div class="why">Opens when both Evolves are taken</div></div></div>`;
  rq([tr.cap], 'Opens when both Evolves are taken'); rq([tr.cap + 'II'], 'Level 50 only');
  return out + '</div>';
}

/* ================= 10. SPIRAL RING ================= */
function S10(tid) {
  const tr = TREES[tid]; E = []; let out = '', ex = ''; const C = 380, RD = [98, 180, 262, 344]; const rg = rings(tr); const tk = TKC[tr.c];
  const done1 = rg[0].every((e) => T(e.id) > e.u);
  const done2 = rg[1].every((e) => T(e.id) > 0 || (NODES[e.id].fork && T(NODES[e.id].fork) > 0));
  const locked = [false, !done1, !(done1 && done2)];
  const posOf = (ring, i, n, off) => { const a = (-90 + (i + off) * 360 / n) * Math.PI / 180; return [C + RD[ring] * Math.cos(a), C + RD[ring] * Math.sin(a)]; };
  rg.forEach((items, ri) => { const n = items.length; const doneR = ri === 0 ? done1 : ri === 1 ? done2 : items.every((e) => T(e.id) > 0);
    ex += `<circle class="rg${doneR ? ' on' : ''}" cx="${C}" cy="${C}" r="${RD[ri]}"/>`;
    items.forEach((e, i) => { const [x, y] = posOf(ri, i, n, .5); const o = { unit: NODES[e.id].kind === 'f' ? e.u : undefined, lk: locked[ri] && !T(e.id), lb: ri === 2 };
      out += nd(e.id, x, y, o); rq([e.id], ri === 0 ? 'Inner ring: always open (free order)' : ri === 1 ? 'Opens when the inner ring is complete' : 'Opens when the middle ring is complete'); }); });
  ex += `<circle class="rg d" cx="${C}" cy="${C}" r="${RD[3]}"/>`;
  rg[2].forEach((e, i) => { const [x, y] = posOf(3, i, rg[2].length, .5); const id = e.id === tr.cap ? tr.cap + 'II' : e.id + 'II'; out += nd(id, x, y, { lb: false }); rq([id], 'Level 50 only: 4th ring'); });
  const cap = (txt, r, c) => `<div class="note-in" style="left:${C - 90}px;top:${C - RD[r] - 10}px;width:180px;background:#0c0906;font:600 10px Cinzel;letter-spacing:.14em;color:${c}">${txt}</div>`;
  out += cap(done1 ? 'RING I COMPLETE' : 'RING I', 0, done1 ? '#e8cf8f' : '#a8977a') + cap(done2 ? 'RING II COMPLETE' : 'RING II · locked until I', 1, '#a8977a') + cap('RING III · locked until II', 2, '#a8977a') + cap('RING IV · L50', 3, 'rgba(243,217,153,.6)');
  out += `<div class="abs" style="left:${C - 6}px;top:${C - 6}px;width:12px;height:12px;transform:rotate(45deg);background:#e8cf8f;box-shadow:0 0 10px rgba(243,217,153,.6)"></div>`;
  return cv(C * 2, C * 2, out, ex, 'nolb-x');
}

/* ================= KABUK: sheet, ipucu, olaylar ================= */
const LAYOUT = [null, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
function sheetHTML(c) {
  const C = CLS[c], t = ST.t[c], tid = c + t, tr = TREES[tid];
  REQ = {}; TKC[c] = buildTaken(c, ST.st);
  const tabs = [0, 1].map((i) => { const id = c + i; return `<button class="t2${i === t ? ' on' : ''}" data-c="${c}" data-t="${i}"><b>${TREES[id].name}</b><small>${TREES[id].sub}</small><i>${spentTab(c, id)}</i></button>`; }).join('');
  const total = ST.st === 8 ? 0 : spent(c + '0', ST.st) + spent(c + '1', ST.st);
  const body = LAYOUT[ST.st](tid);
  return `<section class="sheet" data-c="${c}">
    <div class="sh-top"><img src="skill-trees/${C.av}.webp" alt=""><div class="nm">${C.name}<small>Level 30 · 29 points</small></div>
      <div class="sp">${ST.st === 8 ? '<b>10</b> row picks · no points' : `Spent <b>${total}</b> · Free <b>${29 - total}</b>`}</div>
      <button class="rs" type="button" title="Reset: only in towns and rest stops"><img src="skill-trees/gold.webp" alt="">Reset · 135</button></div>
    <div class="tabs2">${tabs}</div>
    <div class="sh-body">${body}</div>
    ${legend()}</section>`;
}
function spentTab(c, tid) { return ST.st === 8 ? (TREES[tid].idx ? 'L6-30' : 'L3-27') : spent(tid, ST.st); }
function legend() {
  const mk = (id, lbl) => `<span>${nd(id, 0, 0, { inl: true, lb: false, s: 22 })}${lbl}</span>`;
  const f = 'w0.A1', k = 'w0.A6a', b = 'w0.A5', e = 'w0.A7', cp = 'w0.A9';
  return `<div class="legend">${mk(f, 'Filler')}${mk(k, 'Fork (pick one)')}${mk(b, 'Behavior')}${mk(e, 'Evolve')}${mk(cp, 'Capstone')}<span style="color:#e8cf8f">◆ gold = taken (typical 29-point build)</span><span>dim = not taken</span><span><i class="l5k"></i>dashed + L50 = added at Level 50</span></div>
    <div class="hintln">Hover a node (touch: tap once to pin) for its A Band tip. Mockup: nothing is spent by clicking.</div>`;
}
function render() {
  document.documentElement.classList.toggle('mk-phone', ST.phone); document.documentElement.classList.toggle('mk-clean', ST.clean);
  const si = STR[ST.st];
  document.getElementById('st-tabs').innerHTML = STR.slice(1).map((s, i) => `<button type="button" data-s="${i + 1}" class="${ST.st === i + 1 ? 'on' : ''}"><b>${i + 1}</b>${s.n}</button>`).join('');
  document.getElementById('st-info').innerHTML = `<h2>${ST.st}. ${si.n}</h2><p>${si.rule}</p><p class="m">${si.meta}</p>`;
  document.getElementById('cls-sel').innerHTML = ST.both ? '' : ['w', 'h'].map((c) => `<button type="button" data-cls="${c}" class="${ST.c === c ? 'on' : ''}"><img src="skill-trees/${CLS[c].av}.webp" alt="">${CLS[c].name}</button>`).join('');
  const sh = document.getElementById('sheets'); sh.className = 'sheets' + (ST.both ? ' both' : '');
  sh.innerHTML = (ST.both ? ['w', 'h'] : [ST.c]).map(sheetHTML).join('');
  document.getElementById('mk-both').classList.toggle('on', ST.both); document.getElementById('mk-phone').classList.toggle('on', ST.phone);
  hideTip();
}
function writeHash() { const p = [`s=${ST.st}`, `c=${ST.c}`, `t=${ST.t[ST.c]}`]; if (ST.both) p.push('both'); if (ST.phone) p.push('phone'); if (ST.clean) p.push('clean'); history.replaceState(null, '', '#' + p.join('&')); }
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1)); const s = +h.get('s'); if (s >= 1 && s <= 10) ST.st = s;
  if (h.get('c') === 'h' || h.get('c') === 'w') ST.c = h.get('c'); if (h.has('t')) ST.t[ST.c] = h.get('t') === '1' ? 1 : 0;
  ST.both = h.has('both'); ST.phone = h.has('phone'); ST.clean = h.has('clean');
}

/* ---- ipucu (A Band) ---- */
const tipEl = document.getElementById('tip'); let pinned = null;
function tipHTML(id, u) {
  const n = NODES[id], st = ST.st, sk = SKN[n.sk]; const taken = u != null ? T(id) > +u : T(id) > 0;
  const cls = n.kind === 'e' ? 'ev' : n.kind === 'c' ? 'cp' : isPas(n.sk) ? 'ps' : '';
  const kind = { f: 'Filler', k: 'Fork · pick one', b: isPas(n.sk) ? 'Passive behavior' : 'Behavior', e: 'Evolve', c: 'Capstone' }[n.kind] + (n.l50 ? ' II' : '');
  const kindLine = n.kind === 'e' ? `${kind} · ${sk}${n.l50 ? '' : ' → ' + n.name}` : `${kind} · ${sk}`;
  const uc = unitCost(n, st); let big, small;
  if (st === 8) { big = 'FREE'; small = 'ROW PICK'; }
  else if (st === 5) { big = '1'; small = 'POINT / STEP'; }
  else if (n.kind === 'e' && st === 6 && !n.l50) { big = 'FREE'; small = 'REWARD'; }
  else { big = uc; small = n.kind === 'f' ? 'POINT / RANK' : uc === 1 ? 'POINT' : 'POINTS'; }
  const chips = [`<span class="chip ac">${{ f: 'Filler', k: 'Fork', b: 'Behavior', e: 'Evolve', c: 'Capstone' }[n.kind]}</span>`];
  if (n.ranks > 1) chips.push(`<span class="chip">${u != null ? `Rank ${+u + 1} / ${n.ranks}` : `Rank ${T(id)} / ${n.ranks}`}</span>`);
  chips.push(taken ? '<span class="chip ok">Taken</span>' : '<span class="chip">Not taken</span>');
  if (n.l50) chips.push('<span class="chip">Level 50</span>');
  if (n.nw) chips.push('<span class="chip nw">Needs new rule</span>');
  const lines = [`<div class="ln"><span class="dia"></span><span class="tx">${esc(n.eff)}</span></div>`];
  if (n.kind === 'e' && !n.l50) lines.push(`<div class="ln"><span class="dia"></span><span class="tx"><span class="k">Evolves in place:</span> ${sk} becomes ${esc(n.name)} (new icon frame, new behavior; same slot and base job).</span></div>`);
  if (n.fork) lines.push(`<div class="ln"><span class="dia"></span><span class="tx"><span class="k">Fork:</span> pick this or ${esc(NODES[n.fork].name)}.</span></div>`);
  const req = REQ[id];
  return `<div class="tp va ${cls}"><div class="tp-head"><div class="tp-medal" style="background-image:url(skill-trees/${IC[n.sk]}.webp)"></div><div class="tp-ht"><div class="tp-kind">${esc(kindLine)}</div><div class="tp-title">${esc(n.name)}</div></div><div class="tp-aside"><div class="big">${big}<small>${small}</small></div></div></div>
    <div class="tp-meta">${chips.join('')}</div><div class="tp-div"></div><div class="tp-body">${lines.join('')}</div>${req ? `<div class="tp-foot"><span class="dia"></span><span class="tx">${esc(req)}</span></div>` : ''}</div>`;
}
function showTip(el) {
  const id = el.dataset.id; if (!id) return; tipEl.innerHTML = tipHTML(id, el.dataset.u); tipEl.classList.add('show'); tipEl.style.left = '0px'; tipEl.style.top = '0px';
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = innerWidth, vh = innerHeight;
  let x = r.right + 12; if (x + w > vw - 8) x = r.left - w - 12; if (x < 8) x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  let y = r.top + r.height / 2 - h / 2; if (x < r.right && x + w > r.left) y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
  y = Math.max(8, Math.min(vh - h - 8, y)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
function hideTip() { tipEl.classList.remove('show'); document.querySelectorAll('.nd.pin').forEach((e) => e.classList.remove('pin')); pinned = null; }
let lastPtr = 'mouse';
document.addEventListener('pointerdown', (e) => { lastPtr = e.pointerType; if (!e.target.closest('.nd, .opt')) hideTip(); }, true);
document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('.nd, .opt'); if (el && !pinned) showTip(el); });
document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse' || pinned) return; const el = e.target.closest('.nd, .opt'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) tipEl.classList.remove('show'); });
document.addEventListener('click', (e) => {
  const nodeEl = e.target.closest('.nd, .opt');
  if (nodeEl) { if (pinned === nodeEl) hideTip(); else { hideTip(); pinned = nodeEl; nodeEl.classList.add('pin'); showTip(nodeEl); } return; }
  const s = e.target.closest('[data-s]'); if (s) { ST.st = +s.dataset.s; writeHash(); render(); return; }
  const t = e.target.closest('[data-t]'); if (t) { ST.t[t.dataset.c] = +t.dataset.t; ST.c = t.dataset.c; writeHash(); render(); return; }
  const c = e.target.closest('[data-cls]'); if (c) { ST.c = c.dataset.cls; writeHash(); render(); return; }
});
document.getElementById('mk-both').onclick = () => { ST.both = !ST.both; writeHash(); render(); };
document.getElementById('mk-phone').onclick = () => { ST.phone = !ST.phone; writeHash(); render(); };
window.addEventListener('hashchange', () => { readHash(); render(); });
window.addEventListener('scroll', () => { if (pinned) hideTip(); }, true);
readHash(); render();
