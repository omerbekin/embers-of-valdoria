// Güç toplama katmanı (roadmap.md 1.1; saf, Phaser/DOM yok): savaşa girerken bir kahramanın "class temeli + item'ler (+ ileride level, ağaç)"
// gücü TEK fonksiyonda toplanır ve motorun kapılarına (UnitSetup.modifiers + itemEffects) çevrilir. Sefer ve endless aynı fonksiyonu kullanır;
// Quick Battle / multiplayer kullanmaz (Ömer kararı 2026-10-09: QB/MP dokunulmaz).
// Kural: hiçbir şey takılı değilse modifiers YOK (undefined) => savaş bugünküyle birebir aynı (tests/loadout.test.ts determinizm testi).
// Affix eşlemesi veride (items.json > affixDefs[].parts[].to; Ömer onayı 2026-10-11, items.md 1.3b).
import { classes } from '../engine/content';
import type { Attribute, Element, ItemEffects, UnitModifiers, UnitSetup } from '../engine/types';
import { ITEMS, MAGIC_ELEMENTS, SLOT_IDS, itemDef, rolledAffixes, type EffectDef, type Equipment, type RolledAffix } from './items';

/** Güç katmanının girdisi: sefer kahramanı (campaign Hero) ve endless kahramanı bu şekle uyar. */
export interface LoadoutSource {
  class: string;
  /** Aşama 2 (level sistemi) için ayrıldı; şimdilik güce etkisi yok. */
  level?: number;
  equipment?: Partial<Equipment>;
}

export interface LoadoutResult {
  /** Motora giden stat güçlendirmesi; hiçbir katkı yoksa undefined (birim bugünkü haliyle aynı). */
  modifiers?: UnitModifiers;
  /** Motora giden affix kancaları + Legendary etkileri; yoksa undefined. */
  itemEffects?: ItemEffects;
  /** Savaş sonrası toparlanma oranı (Recovery affix'i; 0-1; yalnızca takan). */
  recovery: number;
  /** Takılı item'lerin affix'leri (yuva sırasıyla; arayüz önizlemesi için). */
  affixes: RolledAffix[];
  /** Veride bulunamayan item id'leri (kayıt eski/yeni veriyle uyuşmuyorsa; yok sayılır, oyun çökmez). */
  missing: string[];
}

const ATTRS: Attribute[] = ['str', 'dex', 'int', 'luck'];
const r4 = (v: number) => Math.round(v * 10000) / 10000;

type Bag = Record<string, unknown>;

/** Tek affix parçasını toplama yazar (veri eşlemesi `to`). */
function applyPart(to: string, v: number, scale: number, ctx: { mods: Bag; fx: Bag; primary?: Attribute; acc: { recovery: number }; x?: string; below?: number; form?: string }): void {
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
    case 'prog':
      if (key === 'recovery') ctx.acc.recovery += amt;
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
  const acc = { recovery: 0 };
  const all: RolledAffix[] = [];
  const primary = classes[src.class]?.primary;
  for (const slot of SLOT_IDS) {
    const inst = src.equipment?.[slot];
    if (!inst) continue;
    if (!itemDef(inst.id)) {
      missing.push(inst.id);
      continue;
    }
    for (const a of rolledAffixes(inst, src.class)) {
      all.push(a);
      a.def.parts.forEach((p, i) => applyPart(p.to, a.values[i] ?? 0, p.scale ?? 1, { mods, fx, ...(primary ? { primary } : {}), acc, ...(a.x ? { x: a.x } : {}), ...(p.below !== undefined ? { below: p.below } : {}), ...(p.form ? { form: p.form } : {}) }));
    }
  }
  const caps = ITEMS.caps;
  const cap = (o: Bag, k: string, max: number | undefined) => {
    if (max !== undefined && typeof o[k] === 'number') o[k] = Math.min(o[k] as number, max);
  };
  cap(mods, 'critAdd', caps.crit / 100);
  cap(mods, 'accuracyAdd', caps.accuracy / 100);
  cap(mods, 'evasionAdd', caps.evasion / 100);
  cap(mods, 'spdAdd', caps.spd);
  cap(fx, 'mpCostReduce', caps.mpCost !== undefined ? caps.mpCost / 100 : undefined);
  cap(fx, 'debuffAvoid', caps.resist !== undefined ? caps.resist / 100 : undefined);
  tidy(mods);
  tidy(fx);
  // Legendary etkileri (madde 296)
  const legend = equipmentEffects(src.equipment);
  const effects = { ...fx, ...(legend ?? {}) } as ItemEffects;
  return {
    ...(Object.keys(mods).length ? { modifiers: mods as UnitModifiers } : {}),
    ...(Object.keys(effects).length ? { itemEffects: effects } : {}),
    recovery: r4(acc.recovery),
    affixes: all,
    missing,
  };
}

/** Takılı item'lerin toparlanma oranı (Recovery affix'i; sefer / Endless savaş sonrası, yalnızca takan). */
export const itemRecovery = (src: LoadoutSource): number => loadout(src).recovery;

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
export function loadoutSetup(src: LoadoutSource, o: { effects?: boolean } = {}): Pick<UnitSetup, 'modifiers' | 'itemEffects'> {
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
  return { ...(l.modifiers ? { modifiers: l.modifiers } : {}), ...(fx ? { itemEffects: fx } : {}) };
}
