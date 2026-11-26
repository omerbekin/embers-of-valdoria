// Set item kuralları (Ömer 2026-11-03, docs/design/progression/item-design-plan.md "Set kuralları"; pilot: Ashguard Vigil + Wayfarer's Oath). Saf.
// Tüm sayılar data/items.json > sets. Bonuslar parçayı taşıyan herkeste çalışır; setsEnabled düşüşü ve Codex'i açar (AÇILDI Ömer 2026-11-26; parçalar nadir düşüşten ve Debug > Give pilot sets'ten gelir).
import { classes, grounds, skills, statuses } from '../engine/content';
import type { Attribute, ItemEffects, PassivePatch } from '../engine/types';
import { affixFit } from './affix-fit';
import { ITEMS, SLOT_IDS, canEquip, itemDef, type Equipment, type ItemDef } from './items';

/** 3 parça sınıf satırı: pasifin bir alanı `from` -> `to` (Ağaç üstüne farkı eklenir: PassivePatch). */
export interface SetClassRow {
  passive: string;
  field: string;
  from: number;
  to: number;
  /** Aynı pasifte ek alanlar (Ashguard Warrior, Ömer 2026-11-23: Rage + fullAt). Pasifte olmayan alanın `from`u 0. */
  also?: Array<{ field: string; from: number; to: number }>;
}

export interface SetBonus {
  mods?: Record<string, number>;
  byClass?: Record<string, SetClassRow>;
  rule?: 'banked_coals' | 'road_hound' | 'unseen' | 'hangmans_rope' | 'conclave_answers' | 'royal_command' | 'refrain' | 'martyrs_bequest' | 'pilgrims_burden';
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
  /** Martyr's Bequest (Tur 28-29): taşıyan ölünce en yakın dosta verilen durumlar (`turns` tur). */
  statuses?: string[];
  /**
   * The Conclave Answers (Ömer 2026-11-23 r41 Seçenek B): saldıranın altına çıkan zemin (`ground`, `turns` tur, tik = taşıyanın `scale` statı x `power`),
   * taşıyanın turları arası sınır (`perTurn`); hücre zaten yanıyorsa zemin yerine `status` (`statusTurns` tur).
   */
  power?: number;
  perTurn?: number;
  ground?: string;
  scale?: Attribute;
  statusTurns?: number;
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
export type SetEffects = Pick<ItemEffects, 'bankedCoals' | 'roadHound' | 'dodgeCrit' | 'escapeStatus' | 'counterGround' | 'allyTurn' | 'refrain' | 'deathBequest' | 'healShorten'>;
export function setContribution(equipment: Partial<Equipment> | undefined, classId: string): { mods: Record<string, number>; effects: SetEffects; passivePatch?: PassivePatch } {
  const mods: Record<string, number> = {};
  const effects: SetEffects = {};
  let passivePatch: PassivePatch | undefined;
  for (const { bonus } of activeSetBonuses(equipment)) {
    for (const [k, v] of Object.entries(bonus.mods ?? {})) mods[k] = (mods[k] ?? 0) + v;
    const row = bonus.byClass?.[classId];
    const d = (x: { from: number; to: number }) => Math.round((x.to - x.from) * 1000) / 1000;
    if (row) passivePatch = { passive: row.passive, field: row.field, delta: d(row), ...(row.also?.length ? { also: row.also.map((x) => ({ field: x.field, delta: d(x) })) } : {}) };
    if (bonus.rule === 'banked_coals') effects.bankedCoals = { share: bonus.bankShare ?? 0, ticks: bonus.ticks ?? 1 };
    if (bonus.rule === 'road_hound') effects.roadHound = { unit: 'road_hound' };
    if (bonus.rule === 'unseen') effects.dodgeCrit = true;
    if (bonus.rule === 'hangmans_rope' && bonus.status) effects.escapeStatus = { status: bonus.status, turns: bonus.turns ?? 1 };
    if (bonus.rule === 'conclave_answers' && bonus.ground && bonus.status)
      effects.counterGround = { ground: bonus.ground, scale: bonus.scale ?? 'int', power: bonus.power ?? 0, turns: bonus.turns ?? 1, perTurn: bonus.perTurn ?? 1, status: bonus.status, statusTurns: bonus.statusTurns ?? 1 };
    if (bonus.rule === 'royal_command') effects.allyTurn = true;
    if (bonus.rule === 'refrain' && bonus.status) effects.refrain = { status: bonus.status, turns: bonus.turns ?? 1 };
    if (bonus.rule === 'martyrs_bequest' && bonus.statuses?.length) effects.deathBequest = { statuses: [...bonus.statuses], turns: bonus.turns ?? 1 };
    if (bonus.rule === 'pilgrims_burden') effects.healShorten = { turns: bonus.turns ?? 1 };
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
export const MOD_FMT: Record<string, [string, boolean]> = {
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
  // Affix havuzları (stats.ts > AFFIX_ADD): Odran 2 parça Potency (2026-11-26, set açılışı denetimi: ipucu ham anahtar yazıyordu)
  damageAdd: ['Damage', true],
  healPowerAdd: ['Healing given', true],
  shieldPowerAdd: ['Shields given', true],
  dotPowerAdd: ['Damage over time', true],
  potencyAdd: ['Potency', true],
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
  // Ashguard Warrior (Ömer 2026-11-23): Rage katı + tam bonusun geldiği can oranı tek cümlede (sayılar veriden)
  const fullAt = row.also?.find((x) => x.field === 'fullAt');
  if (row.field === 'rageOnHurt.perHpPercent' && fullAt) {
    const k = Math.round((row.to / row.from) * 1000) / 1000;
    const times = k === 2 ? 'doubled' : k === 3 ? 'tripled' : `x${k}`;
    return `${head}: Rage from losing HP is ${times}, and the damage bonus reaches its maximum at ${pctText(fullAt.to)} HP`;
  }
  if (row.field === 'rageOnHurt.perHpPercent') return `${head}: ${row.from} → ${row.to} Rage per 1% HP lost`;
  if (row.field === 'pct') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} of your armor`;
  if (key === 'divine_light.power') return `${head}: heals ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  if (key === 'heat_mirage.power') return `${head}: the ground it leaves burns for ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  if (key === 'natures_grudge.power') return `${head}: the Withering it spreads hits for ${pctText(row.from)} → ${pctText(row.to)} of INT`;
  if (key === 'vampiric_bite.ratio') return `${head}: drains ${pctText(row.from)} → ${pctText(row.to)}`;
  if (key === 'pealing_bells.perBell') return `${head}: each bell adds ${pctText(row.from)} → ${pctText(row.to)}`;
  if (key === 'opportunist.bonus') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} more damage against Wounded, Hobbled, Stunned or Withering targets`;
  if (key === 'sharpshooter.perRow') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} more damage per row of distance`;
  // Blood Tithe (Ömer 2026-11-18): bloodAdvance tabandır, üstüne DEX payı gelir (DEX payı değişmez)
  if (key === 'spellbreaker_instinct.bloodAdvance') return `${head}: +${pctText(row.to - row.from)} turn bar jump at a full blood bar (base ${pctText(row.from)} → ${pctText(row.to)}, plus the DEX part)`;
  if (key === 'spellbreaker_instinct.advance') return `${head}: your next turn comes ${pctText(row.from)} → ${pctText(row.to)} sooner`;
  if (key === 'ill_omen.maxOnArrival') return `${head}: passed Omens arrive up to ${row.from} → ${row.to}`;
  if (key === 'conductor.bonus') return `${head}: your lightning deals ${pctText(row.from)} → ${pctText(row.to)} more damage to Hobbled, Stunned or Shocked targets`;
  if (key === 'double_or_nothing.chance') return `${head}: ${pctText(row.from)} → ${pctText(row.to)} chance for a skill to go once more`;
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

const turnsText = (n: number) => `${n} turn${n === 1 ? '' : 's'}`;

/** The Conclave Answers metni (ipucu + Codex; zemin ve durum adları veriden). */
export function conclaveAnswersText(b: SetBonus): string {
  const n = b.perTurn ?? 1;
  const ground = grounds[b.ground ?? '']?.name ?? b.ground ?? 'ground';
  const st = statuses[b.status ?? ''];
  const more = st?.damageTakenMult !== undefined && st.damageTakenMult > 1 ? ` (takes ${pctText(st.damageTakenMult - 1)} more damage)` : '';
  return `${b.name}: When an enemy uses a skill on you, ${ground} appears under it for ${turnsText(b.turns ?? 1)}, burning for ${pctText(b.power ?? 0)} of your ${(b.scale ?? 'int').toUpperCase()}. If its cell is already burning, it becomes ${st?.name ?? b.status}${more} for ${turnsText(b.statusTurns ?? 1)} instead. ${n === 1 ? 'At most once' : `At most ${n} times`} between your turns.`;
}

/** Royal Command metni (ipucu + Codex). */
export function royalCommandText(b: SetBonus): string {
  return `${b.name}: Once per battle, spend your turn to give an ally an extra turn right away. Their own next turn still comes as usual.`;
}

/** Refrain metni (ipucu + Codex). `statusName`: durumun oyun içi adı. */
export function refrainText(b: SetBonus, statusName = 'Empowered'): string {
  const n = b.turns ?? 1;
  return `${b.name}: When your lightning makes an enemy Shocked, the first ally to hit that enemy next becomes ${statusName} for ${n} turn${n === 1 ? '' : 's'}. Once per Shocked.`;
}

/** Martyr's Bequest metni (ipucu + Codex). `names`: durumların oyun içi adları. */
export function martyrsBequestText(b: SetBonus, names: string[] = b.statuses ?? []): string {
  const n = b.turns ?? 1;
  return `${b.name}: When you fall, your nearest living ally becomes ${names.join(' and ')} for ${n} turn${n === 1 ? '' : 's'}.`;
}

/** Pilgrim's Burden metni (ipucu + Codex). */
export function pilgrimsBurdenText(b: SetBonus): string {
  const n = b.turns ?? 1;
  return `${b.name}: When your skill heals an ally, their longest-lasting debuff that can be removed lasts ${n} turn${n === 1 ? '' : 's'} less (one with ${n === 1 ? '1 turn' : `${n} turns`} left ends).`;
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
  if (b.rule === 'refrain') out.push({ text: `(${t}) ${refrainText(b, statuses[b.status ?? '']?.name)}`, on: reached });
  if (b.rule === 'martyrs_bequest') out.push({ text: `(${t}) ${martyrsBequestText(b, (b.statuses ?? []).map((x) => statuses[x]?.name ?? x))}`, on: reached });
  if (b.rule === 'pilgrims_burden') out.push({ text: `(${t}) ${pilgrimsBurdenText(b)}`, on: reached });
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
 * Set bonusu stat'ının sınıfa uyumu: o stat'ı taşıyan ilk affix'in `needs` kuralı (affixFit; ör. MP yenilenmesi MP'siz sınıfa 0,3).
 * items.json > setValue.modFit true değilse 1 (eski davranış). r51 equip-final (2026-11-26).
 */
function modFit(key: string, classId: string): number {
  if (!ITEMS.setValue?.modFit) return 1;
  for (const [id, a] of Object.entries(ITEMS.affixDefs))
    for (const p of a.parts) if (p.to === `mod:${key}`) return affixFit(classId, { id, def: a });
  return 1;
}

/** Sınıfın kitinde dosta şifa veren skill var mı (Pilgrim's Burden değeri). */
function healsAllies(classId: string): boolean {
  return (classes[classId]?.skills ?? []).some((id) => {
    const sk = skills[id];
    return !!sk && sk.target !== 'self' && sk.effects.some((e) => e.type === 'heal');
  });
}

/**
 * Takılı set bonuslarının sınıfa değeri (Item Points; Equip best): stat bonusları affix IP'leriyle, sınıfın pasif satırı ve motor kuralı
 * items.json > setValue düz değerleriyle. Yalnızca seçim içindir (güç loadout'tan gelir).
 */
export function setBonusScore(equipment: Partial<Equipment> | undefined, classId: string): number {
  const v: { classRowIP: number; ruleIP: number; ruleNeedsHeal?: string[]; ruleIPBy?: Record<string, number> } = ITEMS.setValue ?? { classRowIP: 0, ruleIP: 0 };
  let ip = 0;
  for (const { bonus } of activeSetBonuses(equipment)) {
    for (const [k, x] of Object.entries(bonus.mods ?? {})) ip += modIP(k, x) * modFit(k, classId);
    if (bonus.byClass?.[classId]) ip += v.classRowIP;
    // Pilgrim's Burden gibi şifa kuralı (setValue.ruleNeedsHeal): dosta şifa skill'i olmayan sınıfa değersiz
    // Kural değeri (r51 equip-final): setValue.ruleIPBy[kural] varsa o, yoksa düz ruleIP (her kuralın savaş değeri farklı; yalnız seçim)
    if (bonus.rule && (!v.ruleNeedsHeal?.includes(bonus.rule) || healsAllies(classId))) ip += v.ruleIPBy?.[bonus.rule] ?? v.ruleIP;
  }
  return Math.round(ip * 1000) / 1000;
}
