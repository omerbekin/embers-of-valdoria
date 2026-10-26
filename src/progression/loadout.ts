// Güç toplama katmanı (roadmap.md 1.1; saf, Phaser/DOM yok): savaşa girerken bir kahramanın "class temeli + item'ler (+ ileride level, ağaç)"
// gücü TEK fonksiyonda toplanır ve motorun kapılarına (UnitSetup.modifiers + itemEffects) çevrilir. Sefer ve endless aynı fonksiyonu kullanır;
// Quick Battle / multiplayer kullanmaz (Ömer kararı 2026-10-09: QB/MP dokunulmaz; QB kahramanı başlangıç silahını taşır sayılır, gücü katlanmış = 1).
// Kural: başlangıç silahı olmayan (test) sınıfta hiçbir şey takılı değilse modifiers YOK (undefined) => savaş bugünküyle birebir aynı; oynanabilir
// sınıfta silahsız kahraman silah çarpanı < 1 alır (Item Güçlendirme 2026-10-17: başlangıç silahı sıfır noktası).
// Affix eşlemesi veride (items.json > affixDefs[].parts[].to; Ömer onayı 2026-10-11, items.md 1.3b).
import { classes, formulas } from '../engine/content';
import { applyUnitModifiers, speedRoll } from '../engine/stats';
import type { Attribute, Attributes, Element, ItemEffects, UnitModifiers, UnitSetup } from '../engine/types';
import { ITEMS, MAGIC_ELEMENTS, SLOT_IDS, affixIP, canEquip, defaultEquipSlot, equipInto, implicitDefOf, implicitValues, instanceIlvl, itemDef, rolledAffixes, type EffectDef, type Equipment, type ItemInstance, type RolledAffix, type SlotId } from './items';
import { equippedWeaponPower, weaponMultFor } from './weapon';
import { LEVELS, heroGrowthMult, type StatAlloc } from './levels';
import type { TreeAlloc } from './skill-tree';
import { treeSetupFor } from './skill-tree-compile';
import { evolvedSkillIds } from './skill-tree-evolve';
import type { TreeMode } from './skill-tree-data';

/** Güç katmanının girdisi: sefer kahramanı (campaign Hero) ve endless kahramanı bu şekle uyar. */
export interface LoadoutSource {
  class: string;
  /** Kahraman level'ı (item seviye şartı + D1 level büyümesi: maks can / MP çarpanı, levels.json > heroGrowth; stat gücü dağıtılmış puanlardan, `alloc`). */
  level?: number;
  equipment?: Partial<Equipment>;
  /** Level sistemi (Ömer 2026-10-17): dağıtılmış temel stat puanları (puan x levels.json > statPerPoint temel stata eklenir). */
  alloc?: StatAlloc;
  /** Skill ağacı dağılımı (docs/design/skill-tree-implementation.md): sefer Hero / Endless kahramanının kayıttaki `tree` alanı (Faz 1b). Yalnızca `mode` verilip açıksa savaşa girer. */
  tree?: TreeAlloc;
  /** Kişisel hız zarı (Ömer 2026-10-24): kahramanın kalıcı çarpanı (Hero / EndlessHero.spdRoll; heroSpeedRoll). Verilince her stat gösterimi ve savaş aynı hızı görür. */
  spdRoll?: number;
}

export interface LoadoutResult {
  /** Motora giden stat güçlendirmesi; hiçbir katkı yoksa undefined (birim bugünkü haliyle aynı). */
  modifiers?: UnitModifiers;
  /** Motora giden affix kancaları + Legendary etkileri; yoksa undefined. */
  itemEffects?: ItemEffects;
  /** Savaş sonrası toparlanma oranı (Recovery affix'i; 0-1; yalnızca takan). */
  recovery: number;
  /** Savaş altını bonusu (c_gold; oran, 0,1 = +%10; yalnızca > 0 iken). Sefer ve Endless: savaşa giren kahramanların toplamı altına çarpılır. */
  goldBonus?: number;
  /** XP bonusu (c_xp; oran; yalnızca takan, yalnızca > 0 iken). Sefer savaş XP'si ve Endless dalga XP'si. */
  xpBonus?: number;
  /** Yara yumuşatma (b_wound_soft; oran 0-1, yalnızca > 0 iken): yaraların maks can kaybı bu oran az (src/progression/wounds.ts). */
  woundSoft?: number;
  /** Takılı item'lerin affix'leri (yuva sırasıyla; arayüz önizlemesi için). */
  affixes: RolledAffix[];
  /** Etkisiz affix'ler (`<yuva>:<sıra>`): aynı A kademe affix'i aCopies'ten fazla item'deyse en zayıflar (Ömer 2026-10-13, itemcaps m2). */
  inactive: string[];
  /** Toplamı tavana ulaşan / aşan statlar (CAP_KEYS; fazlası kaybolur; arayüz "max" gösterir). */
  capped: CapKey[];
  /** Veride bulunamayan item id'leri (kayıt eski/yeni veriyle uyuşmuyorsa; yok sayılır, oyun çökmez). */
  missing: string[];
  /** Silah güç toplamı (ana el + ikinci eldeki hançerin payı; Item Güçlendirme x1). */
  weaponPower: number;
  /** Motora giden silah çarpanı (başlangıç silahına göre katlanmış; 1 = başlangıç silahı). */
  weaponMult: number;
}

/** Tavanlı statlar (items.json > caps) ve affix eşlemesindeki hedefleri (`to`). Ömer 2026-10-13 (itemcaps m1): tavan sert, fazlası kaybolur. */
export const CAP_TARGETS = {
  crit: 'mod:critAdd',
  accuracy: 'mod:accuracyAdd',
  evasion: 'mod:evasionAdd',
  spd: 'mod:spdAdd',
  mpCost: 'fx:mpCostReduce',
  resist: 'fx:debuffAvoid',
  recovery: 'prog:recovery',
  // Eskiden motorda gizli olan sınırlar (Ömer 2026-10-13, itemfix m4; aynı değerler, motor da data'dan okur: src/engine/item-caps.ts)
  initiative: 'fx:startCharge',
  armorPen: 'fx:armorPen',
  magicPen: 'fx:magicPen',
  damageTaken: 'fx:damageTakenReduce',
  // Kalkan blok şansı (Ömer 2026-10-18): taban + kalkan C affix'i toplamı
  block: 'fx:blockChance',
} as const;
export type CapKey = keyof typeof CAP_TARGETS;
/** Tavan (oyun birimi: yüzde puan; spd düz). Tanımsızsa tavan yok. */
export const capOf = (k: CapKey): number | undefined => (ITEMS.caps as Record<string, number | undefined>)[k];
/** Affix'in tavanlı hedefleri. */
export const affixCapKeys = (def: { parts: Array<{ to: string }> }): CapKey[] =>
  (Object.keys(CAP_TARGETS) as CapKey[]).filter((k) => def.parts.some((p) => p.to === CAP_TARGETS[k]));

/**
 * Aynı A kademe affix'i bir kahramanda en çok `caps.aAffixCopies` (2) item'de sayılır (Ömer 2026-10-13, itemcaps m2): fazlasında en güçlü
 * örnekler (affix IP'si; eşitlikte yuva sırası) işler, gerisi etkisizdir. Dönüş: etkisiz affix anahtarları `<yuva>:<affix sırası>`.
 */
export function inactiveAffixes(equipment: Partial<Equipment> | undefined, classId?: string): Set<string> {
  const max = ITEMS.caps.aAffixCopies;
  const out = new Set<string>();
  if (!equipment || max === undefined) return out;
  const byId = new Map<string, Array<{ key: string; ip: number }>>();
  for (const slot of SLOT_IDS) {
    const inst = equipment[slot];
    if (!inst || !itemDef(inst.id)) continue;
    rolledAffixes(inst, classId).forEach((a, i) => {
      if (a.tier !== 'A') return;
      const list = byId.get(a.id) ?? [];
      list.push({ key: `${slot}:${i}`, ip: affixIP(a.id, a.values) });
      byId.set(a.id, list);
    });
  }
  for (const list of byId.values()) {
    if (list.length <= max) continue;
    list.map((x, n) => ({ ...x, n })).sort((a, b) => b.ip - a.ip || a.n - b.n).slice(max).forEach((x) => out.add(x.key));
  }
  return out;
}

const ATTRS: Attribute[] = ['str', 'dex', 'int', 'luck'];
const r4 = (v: number) => Math.round(v * 10000) / 10000;

type Bag = Record<string, unknown>;

/** Tek affix parçasını toplama yazar (veri eşlemesi `to`). */
/** Savaş dışı (prog:) toplamlar: Recovery; altın / XP bonusu ve yara yumuşatma (Ömer 2026-10-26: c_gold, c_xp, b_wound_soft). */
type ProgAcc = { recovery: number; gold: number; xp: number; woundSoft: number };

function applyPart(to: string, v: number, scale: number, ctx: { mods: Bag; fx: Bag; primary?: Attribute; acc: ProgAcc; x?: string; below?: number; form?: string }): void {
  const [kind, key = ''] = to.split(':') as [string, string];
  const amt = v * scale;
  const add = (o: Bag, k: string, a: number) => (o[k] = ((o[k] as number | undefined) ?? 0) + a);
  switch (kind) {
    case 'mod':
      add(ctx.mods, key, amt);
      break;
    case 'mult':
      ctx.mods[key] = ((ctx.mods[key] as number | undefined) ?? 1) + amt;
      break;
    case 'elem': {
      const els: readonly Element[] = key === '*' ? MAGIC_ELEMENTS : [key as Element];
      const rec = ((ctx.mods.elemDamageAdd as Bag | undefined) ??= {}) as Bag;
      for (const el of els) add(rec, el, amt);
      break;
    }
    case 'attr': {
      const rec = ((ctx.mods.attrAdd as Bag | undefined) ??= {}) as Bag;
      if (key === 'all') for (const a of ATTRS) add(rec, a, amt);
      else if (ctx.primary) add(rec, ctx.primary, amt);
      break;
    }
    case 'res': {
      // Element direnci (Ömer 2026-10-26, c_res_*): ItemEffects.elemResist[element]
      const rec = ((ctx.fx.elemResist as Bag | undefined) ??= {}) as Bag;
      add(rec, key, amt);
      break;
    }
    case 'prog':
      if (key === 'recovery' || key === 'gold' || key === 'xp' || key === 'woundSoft') ctx.acc[key] += amt;
      break;
    case 'fx':
      if (key === 'earlyImmunity') {
        if (!ctx.x) break;
        const list = ((ctx.fx.earlyImmunity as Array<{ status: string; turns: number }> | undefined) ??= []);
        const same = list.find((e) => e.status === ctx.x);
        if (same) same.turns = Math.max(same.turns, Math.round(amt));
        else list.push({ status: ctx.x, turns: Math.round(amt) });
      } else if (key === 'lowHpReduce') {
        const cur = ctx.fx.lowHpReduce as { below: number; reduce: number } | undefined;
        ctx.fx.lowHpReduce = { below: ctx.below ?? cur?.below ?? 0.3, reduce: (cur?.reduce ?? 0) + amt };
      } else if (ctx.form === 'mult') ctx.fx[key] = ((ctx.fx[key] as number | undefined) ?? 1) + amt;
      else add(ctx.fx, key, amt);
      break;
  }
}

/** Sayısal alanları 4 ondalığa yuvarlar (iç içe kayıtlarda da). */
function tidy(o: Bag): void {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number') o[k] = r4(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) tidy(v as Bag);
  }
}

/**
 * Kahramanın savaş gücü -> motor güçlendirmesi + kancaları. Her affix parçası veri eşlemesiyle toplanır (mod: toplamsal ek, mult: 1 + toplam,
 * elem: element hasarı, attr: ana stat / tüm statlar, fx: kanca, prog: savaş dışı). Tavanlar (kritik, isabet, kaçınma, hız; MP bedeli, debuff
 * direnci) toplamdan sonra. Legendary etkileri ayrıca birleşir (effectRules.stack). Primary bonusu NORMAL kurala göre işler (madde 278).
 */
export function loadout(src: LoadoutSource): LoadoutResult {
  const missing: string[] = [];
  const mods: Bag = {};
  const fx: Bag = {};
  const acc: ProgAcc = { recovery: 0, gold: 0, xp: 0, woundSoft: 0 };
  const all: RolledAffix[] = [];
  const primary = classes[src.class]?.primary;
  const off = inactiveAffixes(src.equipment, src.class);
  for (const slot of SLOT_IDS) {
    const inst = src.equipment?.[slot];
    if (!inst) continue;
    if (!itemDef(inst.id)) {
      missing.push(inst.id);
      continue;
    }
    for (const [ai, a] of rolledAffixes(inst, src.class).entries()) {
      all.push(a);
      if (off.has(`${slot}:${ai}`)) continue;
      a.def.parts.forEach((p, i) => applyPart(p.to, a.values[i] ?? 0, p.scale ?? 1, { mods, fx, ...(primary ? { primary } : {}), acc, ...(a.x ? { x: a.x } : {}), ...(p.below !== undefined ? { below: p.below } : {}), ...(p.form ? { form: p.form } : {}) }));
    }
  }
  // Taban örtük statları (Item Güçlendirme x3/x4: hançer kritik, tılsım hız; kalkan blok şansı (Ömer 2026-10-18, taban başına sabit); zarsız, tavanlara dahil)
  for (const slot of ['weapon', 'offhand'] as const) {
    const inst = src.equipment?.[slot];
    const d = inst ? itemDef(inst.id) : undefined;
    const imp = d ? implicitDefOf(d) : undefined;
    if (!inst || !imp) continue;
    implicitValues(imp, instanceIlvl(inst), d).forEach((v, i) => {
      const p = imp.parts[i]!;
      applyPart(p.to, v, p.scale ?? 1, { mods, fx, ...(primary ? { primary } : {}), acc, ...(p.form ? { form: p.form } : {}) });
    });
  }
  // Level puanları (levels.md): temel stata düz ek (item'lerin attr ekleriyle aynı kapı: UnitModifiers.attrAdd)
  for (const a of ATTRS) {
    const pts = Math.max(0, Math.floor(src.alloc?.[a] ?? 0));
    if (!pts) continue;
    const rec = ((mods.attrAdd as Bag | undefined) ??= {}) as Bag;
    rec[a] = ((rec[a] as number | undefined) ?? 0) + pts * LEVELS.statPerPoint;
  }
  // Silah gücü (x1): hasar x (1 + güç/100), sınıfın başlangıç silahına göre katlanmış (başlangıç silahı = 1; silahsız < 1)
  const weaponPower = equippedWeaponPower(src.equipment);
  const weaponMult = weaponMultFor(src.class, src.equipment);
  if (weaponMult !== 1) mods.weaponMult = weaponMult;
  // Tavanlar (items.json > caps; sert: fazlası kaybolur). Tavana ulaşan statlar `capped` ile arayüze (Ömer 2026-10-13, itemcaps m1)
  const capped: CapKey[] = [];
  const bags: Record<string, Bag> = { mod: mods, fx, prog: acc as unknown as Bag };
  for (const k of Object.keys(CAP_TARGETS) as CapKey[]) {
    const c = capOf(k);
    if (c === undefined) continue;
    const max = k === 'spd' ? c : c / 100;
    const [kind, key] = CAP_TARGETS[k].split(':') as [string, string];
    const o = bags[kind]!;
    if (typeof o[key] !== 'number') continue;
    if ((o[key] as number) >= max - 1e-9) capped.push(k);
    o[key] = Math.min(o[key] as number, max);
  }
  // Level büyümesi (D1 2026-10-24, levels.json > heroGrowth): maks can / MP çarpanı, item'in can / MP yüzdesiyle çarpılır (yalnız kahraman)
  const grow = heroGrowthMult(src.level);
  if (grow.hp !== 1) mods.hpMult = ((mods.hpMult as number | undefined) ?? 1) * grow.hp;
  if (grow.mp !== 1) mods.mpMult = ((mods.mpMult as number | undefined) ?? 1) * grow.mp;
  tidy(mods);
  tidy(fx);
  // Kişisel hız zarı (Ömer 2026-10-24): son hıza en sonda uygulanır (applyUnitModifiers); 1 de yazılır ki savaş ayrıca zar atmasın
  if (typeof src.spdRoll === 'number' && Number.isFinite(src.spdRoll)) mods.spdRoll = src.spdRoll;
  // Legendary etkileri (madde 296)
  const legend = equipmentEffects(src.equipment);
  const effects = { ...fx, ...(legend ?? {}) } as ItemEffects;
  return {
    ...(Object.keys(mods).length ? { modifiers: mods as UnitModifiers } : {}),
    ...(Object.keys(effects).length ? { itemEffects: effects } : {}),
    recovery: r4(acc.recovery),
    ...(acc.gold > 0 ? { goldBonus: r4(acc.gold) } : {}),
    ...(acc.xp > 0 ? { xpBonus: r4(acc.xp) } : {}),
    ...(acc.woundSoft > 0 ? { woundSoft: r4(Math.min(1, acc.woundSoft)) } : {}),
    affixes: all,
    inactive: [...off],
    capped,
    missing,
    weaponPower,
    weaponMult,
  };
}

/**
 * İpucu bağlamı (Ömer 2026-10-13, itemcaps): örnek kahramanın `slot`una takılıyken (takılı değilse takılmış varsayılır; verilmezse varsayılan
 * yuva) hangi affix'leri etkisiz (sıra numarası) ve kahramanın hangi tavanlı statları dolu. Kahraman takamıyorsa null.
 */
export function affixContext(src: LoadoutSource, inst: ItemInstance, slot?: SlotId): { inactive: Set<number>; capped: Set<CapKey> } | null {
  const d = itemDef(inst.id);
  if (!d || !canEquip(src.class, d)) return null;
  const eq = (src.equipment ?? {}) as Equipment;
  const at = slot ?? (SLOT_IDS.find((k) => eq[k]?.uid !== undefined && eq[k]?.uid === inst.uid) ?? defaultEquipSlot(eq, d));
  const equipment = eq[at]?.uid !== undefined && eq[at]?.uid === inst.uid ? eq : (equipInto(eq, inst, at).equipment as Equipment);
  const l = loadout({ ...src, equipment });
  const inactive = new Set(l.inactive.filter((k) => k.startsWith(`${at}:`)).map((k) => Number(k.slice(at.length + 1))));
  return { inactive, capped: new Set(l.capped) };
}

/**
 * Bir örneğin `slot`a takılmasının A affix sınırı yüzünden kaybettirdiği değer (Equip best / kazanç; 2'den fazla aynı A affix'te etkisiz kalan
 * örneklerin değeri sayılmaz). `value(a)` affix başına değer (IP x sınıf uyumu). Yuva boşken ve örnekle dolu haldeki etkisiz değer farkı.
 */
export function inactivePenalty(classId: string, equipment: Partial<Equipment>, inst: ItemInstance | null | undefined, slot: SlotId, value: (a: RolledAffix) => number): number {
  const sum = (eq: Partial<Equipment>): number => {
    const off = inactiveAffixes(eq, classId);
    if (!off.size) return 0;
    let t = 0;
    for (const k of SLOT_IDS) {
      const it = eq[k];
      if (it && itemDef(it.id)) rolledAffixes(it, classId).forEach((a, i) => off.has(`${k}:${i}`) && (t += value(a)));
    }
    return t;
  };
  const without = { ...equipment, [slot]: null } as Partial<Equipment>;
  if (!inst) return 0;
  return Math.round((sum({ ...without, [slot]: inst }) - sum(without)) * 1000) / 1000;
}

/**
 * Kahramanın kalıcı kişisel hız zarı (Ömer 2026-10-24): sefer / Endless seed'i + kahraman id'sinden, deterministik (stats.ts > speedRoll).
 * Kahraman yaratılırken yazılır; eski kayıtta normalizasyon aynı fonksiyonla tamamlar (aynı kahraman = aynı zar).
 */
export const heroSpeedRoll = (seed: number, heroId: string): number => speedRoll(seed, `hero:${heroId}`, formulas);

/** Kayıt onarımı (sürüm artmaz; her okumada, idempotent): zarı olmayan / bozuk kahramana heroSpeedRoll yazılır, geçerli zar korunur. */
export function normalizeSpdRoll(h: { id: string; spdRoll?: number }, seed: number): void {
  if (typeof h.spdRoll !== 'number' || !Number.isFinite(h.spdRoll) || h.spdRoll <= 0) h.spdRoll = heroSpeedRoll(seed, h.id);
}

/** Takılı item'lerin toparlanma oranı (Recovery affix'i; sefer / Endless savaş sonrası, yalnızca takan). */
export const itemRecovery = (src: LoadoutSource): number => loadout(src).recovery;

/** Takılı item'lerin savaş altını bonusu (c_gold; oran; yoksa 0). */
export const itemGoldBonus = (src: LoadoutSource): number => loadout(src).goldBonus ?? 0;

/** Takımın savaş altını çarpanı: savaşa giren kahramanların c_gold toplamı (1 = bonus yok). Sefer zafer loot'u ve Endless altın kartı. */
export const partyGoldMult = (party: readonly LoadoutSource[]): number => r4(1 + party.reduce((t, h) => t + itemGoldBonus(h), 0));

/** Takılı item'lerin XP bonusu (c_xp; oran; yoksa 0; yalnızca takan). */
export const itemXpBonus = (src: LoadoutSource): number => loadout(src).xpBonus ?? 0;

/** Takılı item'lerin yara yumuşatması (b_wound_soft; oran 0-1; yoksa 0). */
export const itemWoundSoft = (src: LoadoutSource): number => loadout(src).woundSoft ?? 0;

/**
 * Takılı item'lerin Legendary etkileri -> motor kancaları (UnitSetup.itemEffects). effectRules.stack kapalıysa (varsayılan) aynı etki iki item'den
 * gelse de bir kez uygulanır (en yüksek değer); açıksa sayısal değerler toplanır. Etki yoksa undefined.
 */
export function equipmentEffects(equipment: Partial<Equipment> | undefined): ItemEffects | undefined {
  const out: Record<string, unknown> = {};
  const stack = !!ITEMS.effectRules?.stack;
  for (const slot of SLOT_IDS) {
    const inst = equipment?.[slot];
    const id = inst ? itemDef(inst.id)?.effect : undefined;
    const e: EffectDef | undefined = id ? ITEMS.effects[id] : undefined;
    if (!e) continue;
    out[e.hook] = mergeEffect(out[e.hook], e.value, stack);
  }
  return Object.keys(out).length ? (out as ItemEffects) : undefined;
}

/** İki etki değerini birleştirir: sayı (en yüksek ya da toplam), boolean (ya da), dizi (ilki), nesne (alan alan aynı kural; eşik alanları değişmez). */
function mergeEffect(prev: unknown, next: EffectDef['value'], stack: boolean): unknown {
  if (Array.isArray(next)) return prev ?? next.map((x) => (x && typeof x === 'object' ? { ...(x as object) } : x));
  if (prev === undefined) return typeof next === 'object' ? JSON.parse(JSON.stringify(next)) : next;
  if (typeof next === 'boolean') return !!prev || next;
  if (typeof next === 'number') return stack ? (prev as number) + next : Math.max(prev as number, next);
  const p = prev as Record<string, number>;
  const thr = new Set(['below', 'above', 'cap', 'turns', 'every', 'max']); // eşik / süre / sıklık alanları toplanmaz; metin ve liste alanları aynen
  return Object.fromEntries(
    Object.entries(next).map(([k, v]) => [k, typeof v !== 'number' || thr.has(k) ? v : stack ? (p[k] ?? 0) + v : Math.max(p[k] ?? 0, v)]),
  );
}

/**
 * Kahramanın savaş kurulumu (UnitSetup) parçası: statlar (modifiers) + affix kancaları ve Legendary etkileri (itemEffects); yoksa boş nesne.
 * Çağıran başka alanlarla (startHpRatio...) birleştirir. `effects: false` = Legendary etkileri verilmez (Endless'ta effectRules.endless kapalıysa);
 * affix kancaları her zaman verilir (affix'ler item'in statlarıdır).
 */
/**
 * Çağrıların türediği temel statlar (Ömer 2026-10-18, summon yeniden tasarımı): sınıf tabanı + level puanları, item HARİÇ (q3: item statları
 * çağrıya geçmez). Sınıf yoksa undefined.
 */
export function summonBaseOf(src: LoadoutSource): Attributes | undefined {
  const def = classes[src.class];
  if (!def) return undefined;
  const out: Attributes = { ...def.attributes };
  for (const a of ATTRS) out[a] += Math.max(0, Math.floor(src.alloc?.[a] ?? 0)) * LEVELS.statPerPoint;
  return out;
}

/**
 * `mode`: skill ağacının modu (sefer 'campaign', Endless 'endless'); verilmezse ağaç YOK (arayüz önizlemeleri, golden kayıtlar, QB). Ağaç ancak
 * _rules.json ana şalteri + mod bayrağı açıksa (ya da debug odaklı kurulum açıksa) `tree` olarak eklenir (skill-tree-compile.ts > treeSetupFor).
 */
export function loadoutSetup(src: LoadoutSource, o: { effects?: boolean; mode?: TreeMode } = {}): Pick<UnitSetup, 'modifiers' | 'itemEffects' | 'level' | 'summonBase' | 'tree' | 'evolved'> {
  const l = loadout(src);
  let fx = l.itemEffects;
  if (fx && o.effects === false) {
    const legend = equipmentEffects(src.equipment);
    if (legend) {
      fx = { ...fx };
      for (const k of Object.keys(legend)) delete (fx as Record<string, unknown>)[k];
    }
    if (!Object.keys(fx).length) fx = undefined;
  }
  // Çağrı tabanı: yalnızca item'ler temel statı değiştirdiyse verilir (yoksa motor birimin kendi statını kullanır, sonuç aynı); level L2+'da
  const base = summonBaseOf(src);
  const final = base ? applyUnitModifiers(classes[src.class]!, l.modifiers, formulas).attributes : undefined;
  const differs = !!base && !!final && ATTRS.some((a) => base[a] !== final[a]);
  const level = Math.floor(src.level ?? 1);
  const tree = o.mode ? treeSetupFor(src, o.mode) : undefined;
  const evolved = o.mode ? evolvedSkillIds(src, o.mode) : []; // yalnızca sunum: evolve onaylı skill'ler (ikon animasyonu)
  return { ...(l.modifiers ? { modifiers: l.modifiers } : {}), ...(fx ? { itemEffects: fx } : {}), ...(level > 1 ? { level } : {}), ...(differs ? { summonBase: base } : {}), ...(tree ? { tree } : {}), ...(evolved.length ? { evolved } : {}) };
}
