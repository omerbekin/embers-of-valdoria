// Set item kuralları (Ömer 2026-11-03, docs/design/progression/item-design-plan.md "Set kuralları"; pilot: Ashguard Vigil + Wayfarer's Oath). Saf.
// Tüm sayılar data/items.json > sets. Bonuslar parçayı taşıyan herkeste çalışır; setsEnabled yalnızca düşüşü ve Codex'i açar (parçalar bugün yalnızca debug'dan gelir).
import { classes, statuses } from '../engine/content';
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
  rule?: 'banked_coals' | 'road_hound' | 'unseen' | 'hangmans_rope' | 'conclave_answers' | 'royal_command';
  name?: string;
  bankShare?: number;
  ticks?: number;
  hpPerPrimary?: number;
  damagePerPrimary?: number;
  spd?: number;
  ai?: string;
  /** Hangman's Rope: Lucky Escape sonrası durum ve süresi. */
  status?: string;
  turns?: number;
  /** The Conclave Answers: karşılığın hasar çarpanı ve taşıyanın turları arası sınırı. */
  power?: number;
  perTurn?: number;
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
export type SetEffects = Pick<ItemEffects, 'bankedCoals' | 'roadHound' | 'dodgeCrit' | 'escapeStatus' | 'counterAttack' | 'allyTurn'>;
export function setContribution(equipment: Partial<Equipment> | undefined, classId: string): { mods: Record<string, number>; effects: SetEffects; passivePatch?: PassivePatch } {
  const mods: Record<string, number> = {};
  const effects: SetEffects = {};
  let passivePatch: PassivePatch | undefined;
  for (const { bonus } of activeSetBonuses(equipment)) {
    for (const [k, v] of Object.entries(bonus.mods ?? {})) mods[k] = (mods[k] ?? 0) + v;
    const row = bonus.byClass?.[classId];
    if (row) passivePatch = { passive: row.passive, field: row.field, delta: Math.round((row.to - row.from) * 1000) / 1000 };
    if (bonus.rule === 'banked_coals') effects.bankedCoals = { share: bonus.bankShare ?? 0, ticks: bonus.ticks ?? 1 };
    if (bonus.rule === 'road_hound') effects.roadHound = { unit: 'road_hound' };
    if (bonus.rule === 'unseen') effects.dodgeCrit = true;
    if (bonus.rule === 'hangmans_rope' && bonus.status) effects.escapeStatus = { status: bonus.status, turns: bonus.turns ?? 1 };
    if (bonus.rule === 'conclave_answers') effects.counterAttack = { power: bonus.power ?? 1, perTurn: bonus.perTurn ?? 1 };
    if (bonus.rule === 'royal_command') effects.allyTurn = true;
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

/** Set bonusu stat adları: [ad, yüzde mi (0-1 oran -> %)]. Yeni anahtar = buraya satır. */
const MOD_FMT: Record<string, [string, boolean]> = {
  armorAdd: ['Armor', false],
  magicArmorAdd: ['Magic Armor', false],
  hpRegenAdd: ['HP Regen', false],
  mpRegenAdd: ['MP Regen', false],
  hpAdd: ['Max HP', false],
  mpAdd: ['Max MP', false],
  spdAdd: ['Speed', false],
  evasionAdd: ['Evasion', true],
  critAdd: ['Crit chance', true],
  critMultAdd: ['Crit damage', true],
  accuracyAdd: ['Accuracy', true],
  surviveAdd: ['Lucky Escape chance', true],
};
const pctText = (x: number) => `${Math.round(x * 1000) / 10}%`;
const signed = (v: number, text: string) => `${v < 0 ? '-' : '+'}${text}`;
const modText = (k: string, v: number): string => {
  const [name, pct] = MOD_FMT[k] ?? [k, false];
  return `${signed(v, pct ? pctText(Math.abs(v)) : String(Math.abs(v)))} ${name}`;
};

function classRowText(classId: string, row: SetClassRow): string {
  const def = classes[classId];
  const head = `${def?.name ?? classId}, ${def?.passive?.name ?? row.passive}`;
  const key = `${row.passive}.${row.field}`;
  if (row.field === 'rageOnHurt.perHpPercent') return `${head}: ${row.from} → ${row.to} Rage per 1% HP lost`;
  if (row.field === 'pct') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} of your armor`;
  if (key === 'divine_light.power') return `${head}: heals ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  if (key === 'heat_mirage.power') return `${head}: the ground it leaves burns for ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  if (key === 'natures_grudge.power') return `${head}: the Wither it spreads hits for ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  if (key === 'vampiric_bite.ratio') return `${head}: drains ${pctText(row.from)} → ${pctText(row.to)}`;
  if (key === 'pealing_bells.perBell') return `${head}: each bell adds ${pctText(row.from)} → ${pctText(row.to)}`;
  if (key === 'opportunist.bonus') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} more damage against Wounded, Slowed, Stunned or Withered targets`;
  if (key === 'sharpshooter.perRow') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} more damage per row of distance`;
  if (key === 'spellbreaker_instinct.advance') return `${head}: your next turn comes ${pctText(row.from)} → ${pctText(row.to)} sooner`;
  if (key === 'ill_omen.maxOnArrival') return `${head}: passed Omens arrive up to ${row.from} → ${row.to}`;
  if (key === 'double_or_nothing.chance') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} chance to be ready again`;
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

/** Unseen metni (ipucu + Codex). */
export function unseenText(b: SetBonus): string {
  return `${b.name}: After you dodge an enemy's attack, your next attack is a sure critical hit.`;
}

/** Hangman's Rope metni (ipucu + Codex). `statusName`: durumun oyun içi adı. */
export function hangmansRopeText(b: SetBonus, statusName = 'Fortified'): string {
  return `${b.name}: When Lucky Escape saves you from death, you become ${statusName} for ${b.turns ?? 1} turn${(b.turns ?? 1) === 1 ? '' : 's'}.`;
}

/** The Conclave Answers metni (ipucu + Codex). */
export function conclaveAnswersText(b: SetBonus): string {
  const n = b.perTurn ?? 1;
  return `${b.name}: When an enemy uses a skill on you, you strike back with your basic attack for free, dealing ${pctText(1 - (b.power ?? 1))} less damage. ${n === 1 ? 'Once' : `${n} times`} between your turns, and only if your basic attack can reach them.`;
}

/** Royal Command metni (ipucu + Codex). */
export function royalCommandText(b: SetBonus): string {
  return `${b.name}: Once per battle, spend your turn to give an ally an extra turn right away. Their own next turn still comes as usual.`;
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
    const parts = Object.entries(b.mods).map(([k, v]) => modText(k, v));
    out.push({ text: `(${t}) ${parts.join(', ')}`, on: reached });
  }
  if (b.byClass) for (const [c, row] of Object.entries(b.byClass)) out.push({ text: `(${t}) ${classRowText(c, row)}`, on: reached && c === classId });
  if (b.rule === 'banked_coals') out.push({ text: `(${t}) ${bankedCoalsText(b)}`, on: reached });
  if (b.rule === 'road_hound') out.push({ text: `(${t}) ${roadHoundText(b)}`, on: reached });
  if (b.rule === 'unseen') out.push({ text: `(${t}) ${unseenText(b)}`, on: reached });
  if (b.rule === 'hangmans_rope') out.push({ text: `(${t}) ${hangmansRopeText(b, statuses[b.status ?? '']?.name)}`, on: reached });
  if (b.rule === 'conclave_answers') out.push({ text: `(${t}) ${conclaveAnswersText(b)}`, on: reached });
  if (b.rule === 'royal_command') out.push({ text: `(${t}) ${royalCommandText(b)}`, on: reached });
  return out;
}

/** Set ipucu bloğu: başlık ("Ashguard Vigil (2/4)") + eşik satırları. `equipment` verilmezse sayaç 0 (Codex, önizleme). Set parçası değilse null. */
export function setTip(d: Pick<ItemDef, 'set'> | undefined, classId?: string, equipment?: Partial<Equipment>): { title: string; rows: SetTipRow[] } | null {
  const set = setOfItem(d);
  if (!set) return null;
  const count = equippedSetCounts(equipment)[set.id] ?? 0;
  return { title: `${set.name} (${count}/${set.slots.length})`, rows: set.thresholds.flatMap((t) => thresholdRows(set, t, count, classId)) };
}

/** Stat bonusunun Item Points değeri: anahtarı veren affix'in birim IP'si (items.json > affixDefs, parça `to: mod:<anahtar>`), yoksa 0. */
export function modIP(key: string, value: number): number {
  for (const a of Object.values(ITEMS.affixDefs))
    for (const p of a.parts) if (p.to === `mod:${key}`) return (value / (p.scale || 1)) * p.ip;
  return 0;
}

/**
 * Takılı set bonuslarının sınıfa değeri (Item Points; Equip best): stat bonusları affix IP'leriyle, sınıfın pasif satırı ve motor kuralı
 * items.json > setValue düz değerleriyle. Yalnızca seçim içindir (güç loadout'tan gelir).
 */
export function setBonusScore(equipment: Partial<Equipment> | undefined, classId: string): number {
  const v = ITEMS.setValue ?? { classRowIP: 0, ruleIP: 0 };
  let ip = 0;
  for (const { bonus } of activeSetBonuses(equipment)) {
    for (const [k, x] of Object.entries(bonus.mods ?? {})) ip += modIP(k, x);
    if (bonus.byClass?.[classId]) ip += v.classRowIP;
    if (bonus.rule) ip += v.ruleIP;
  }
  return Math.round(ip * 1000) / 1000;
}
