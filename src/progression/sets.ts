// Set item kuralları (Ömer 2026-11-03, docs/design/progression/item-design-plan.md "Set kuralları"; pilot: Ashguard Vigil + Wayfarer's Oath). Saf.
// Tüm sayılar data/items.json > sets. Bonuslar parçayı taşıyan herkeste çalışır; setsEnabled yalnızca düşüşü ve Codex'i açar (parçalar bugün yalnızca debug'dan gelir).
import { classes } from '../engine/content';
import type { ItemEffects, PassivePatch } from '../engine/types';
import { ITEMS, SLOT_IDS, canEquip, itemDef, type Equipment, type ItemDef } from './items';

/** 3 parça sınıf satırı: pasifin bir alanı `from` -> `to` (Ağaç üstüne farkı eklenir: PassivePatch). */
export interface SetClassRow {
  passive: string;
  field: string;
  from: number;
  to: number;
}

export interface SetBonus {
  mods?: Record<string, number>;
  byClass?: Record<string, SetClassRow>;
  rule?: 'banked_coals' | 'road_hound';
  name?: string;
  bankShare?: number;
  ticks?: number;
  hpPerPrimary?: number;
  damagePerPrimary?: number;
  spd?: number;
  ai?: string;
}

export interface SetDef {
  id: string;
  name: string;
  kind: 'class' | 'neutral';
  /** Düştüğü harita (power-budget > chapters[].name). */
  map: string;
  /** Asıl düşüren elit düğümün adı. */
  dropper: string;
  slots: string[];
  pieceNames: string[];
  thresholds: number[];
  bonuses: Record<string, SetBonus>;
}

export const SETS: SetDef[] = ITEMS.sets as SetDef[];
export const SET_ITEMS: ItemDef[] = ITEMS.setItems ?? [];

export const setDef = (id: string | undefined): SetDef | undefined => (id ? SETS.find((s) => s.id === id) : undefined);
export const setOfItem = (d: Pick<ItemDef, 'set'> | undefined): SetDef | undefined => setDef(d?.set);
export const setPieces = (id: string): ItemDef[] => SET_ITEMS.filter((d) => d.set === id);

/** Takılı farklı parça sayısı (set id -> adet). Aynı parçanın ikinci kopyası sayılmaz. */
export function equippedSetCounts(equipment: Partial<Equipment> | undefined): Record<string, number> {
  const seen: Record<string, Set<string>> = {};
  for (const slot of SLOT_IDS) {
    const inst = equipment?.[slot];
    const set = inst ? itemDef(inst.id)?.set : undefined;
    if (set) (seen[set] ??= new Set()).add(inst!.id);
  }
  return Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, v.size]));
}

/** Takılı setlerin ulaşılmış eşikleri (küçükten büyüğe). */
export function activeSetBonuses(equipment: Partial<Equipment> | undefined): Array<{ set: SetDef; threshold: number; bonus: SetBonus }> {
  const counts = equippedSetCounts(equipment);
  const out: Array<{ set: SetDef; threshold: number; bonus: SetBonus }> = [];
  for (const set of SETS) {
    for (const t of set.thresholds) {
      const bonus = set.bonuses[String(t)];
      if (bonus && (counts[set.id] ?? 0) >= t) out.push({ set, threshold: t, bonus });
    }
  }
  return out;
}

/** Güç katmanına giden set katkısı: düz stat ekleri + motor kuralları + sınıfın pasif yaması. */
export function setContribution(equipment: Partial<Equipment> | undefined, classId: string): { mods: Record<string, number>; effects: Pick<ItemEffects, 'bankedCoals' | 'roadHound'>; passivePatch?: PassivePatch } {
  const mods: Record<string, number> = {};
  const effects: Pick<ItemEffects, 'bankedCoals' | 'roadHound'> = {};
  let passivePatch: PassivePatch | undefined;
  for (const { bonus } of activeSetBonuses(equipment)) {
    for (const [k, v] of Object.entries(bonus.mods ?? {})) mods[k] = (mods[k] ?? 0) + v;
    const row = bonus.byClass?.[classId];
    if (row) passivePatch = { passive: row.passive, field: row.field, delta: Math.round((row.to - row.from) * 1000) / 1000 };
    if (bonus.rule === 'banked_coals') effects.bankedCoals = { share: bonus.bankShare ?? 0, ticks: bonus.ticks ?? 1 };
    if (bonus.rule === 'road_hound') effects.roadHound = { unit: 'road_hound' };
  }
  return { mods, effects, ...(passivePatch ? { passivePatch } : {}) };
}

/**
 * Bir düğümün set havuzları: `dropper` = düğüm setin asıl düşüreniyse onun parçaları; `map` = haritanın tüm setlerinin parçaları. Sınıf seti yalnızca
 * takımda onu takabilen sınıf varken düşer (Ömer planı: boşa düşmesin).
 */
export function setDropPools(mapName: string, nodeName: string | undefined, partyClasses: readonly string[]): { dropper: ItemDef[]; map: ItemDef[] } {
  const fits = (d: ItemDef) => partyClasses.some((c) => canEquip(c, d));
  const onMap = SETS.filter((s) => s.map === mapName);
  return {
    dropper: onMap.filter((s) => s.dropper === nodeName).flatMap((s) => setPieces(s.id)).filter(fits),
    map: onMap.flatMap((s) => setPieces(s.id)).filter(fits),
  };
}

const MOD_NAME: Record<string, string> = { armorAdd: 'Armor', magicArmorAdd: 'Magic Armor', hpRegenAdd: 'HP Regen' };
const pctText = (x: number) => `${Math.round(x * 1000) / 10}%`;

function classRowText(classId: string, row: SetClassRow): string {
  const def = classes[classId];
  const head = `${def?.name ?? classId}, ${def?.passive?.name ?? row.passive}`;
  if (row.field === 'rageOnHurt.perHpPercent') return `${head}: ${row.from} → ${row.to} Rage per 1% HP lost`;
  if (row.field === 'pct') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} of your armor`;
  if (row.field === 'power') return `${head}: heals ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  return `${head}: ${row.from} → ${row.to}`;
}

/** Banked Coals metni (ipucu + Codex). */
export function bankedCoalsText(b: SetBonus): string {
  return `${b.name}: ${pctText(b.bankShare ?? 0)} of the damage you take from enemy skills is held back, then burns you evenly over your next ${b.ticks} turns. Fortified and Blessed do not reduce it, and it can kill.`;
}

/** Road Hound metni (ipucu + Codex). */
export function roadHoundText(b: SetBonus): string {
  return `${b.name}: A hound joins you at the start of each battle, next to you, and does not come back if it falls. It has ${b.hpPerPrimary} HP and ${b.damagePerPrimary} damage per point of your primary stat (items not counted), speed ${b.spd}.`;
}

export interface SetTipRow {
  text: string;
  /** Bu eşik (ve sınıf satırında bu sınıf) etkin mi. */
  on: boolean;
}

/** Bir eşiğin metin satırları; sınıf satırları tek tek (taşıyanın satırı `classId` ile eşleşir). */
function thresholdRows(set: SetDef, t: number, count: number, classId?: string): SetTipRow[] {
  const b = set.bonuses[String(t)];
  if (!b) return [];
  const reached = count >= t;
  const out: SetTipRow[] = [];
  if (b.mods) {
    const parts = Object.entries(b.mods).map(([k, v]) => `+${v} ${MOD_NAME[k] ?? k}`);
    out.push({ text: `(${t}) ${parts.join(', ')}`, on: reached });
  }
  if (b.byClass) for (const [c, row] of Object.entries(b.byClass)) out.push({ text: `(${t}) ${classRowText(c, row)}`, on: reached && c === classId });
  if (b.rule === 'banked_coals') out.push({ text: `(${t}) ${bankedCoalsText(b)}`, on: reached });
  if (b.rule === 'road_hound') out.push({ text: `(${t}) ${roadHoundText(b)}`, on: reached });
  return out;
}

/** Set ipucu bloğu: başlık ("Ashguard Vigil (2/4)") + eşik satırları. `equipment` verilmezse sayaç 0 (Codex, önizleme). Set parçası değilse null. */
export function setTip(d: Pick<ItemDef, 'set'> | undefined, classId?: string, equipment?: Partial<Equipment>): { title: string; rows: SetTipRow[] } | null {
  const set = setOfItem(d);
  if (!set) return null;
  const count = equippedSetCounts(equipment)[set.id] ?? 0;
  return { title: `${set.name} (${count}/${set.slots.length})`, rows: set.thresholds.flatMap((t) => thresholdRows(set, t, count, classId)) };
}
