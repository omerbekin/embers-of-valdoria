// Item metinleri ve karşılaştırma (saf; kuşanma ekranı, loot kartı, tüccar, wiki aynı fonksiyonu kullanır). Oyun içi metinler İngilizce.
// Affix satırları kademesiyle (C / B / A) gelir (Ömer onayı 2026-10-11, items.md 1.3b).
import { classes, formulas, statuses as statusDefs } from '../engine/content';
import { applyUnitModifiers } from '../engine/stats';
import type { Stats } from '../engine/types';
import {
  ITEMS,
  affixDef,
  instanceRarity,
  itemDef,
  partMid,
  partValue,
  rarityDef,
  rolledAffixes,
  slotDef,
  type AffixTier,
  type Equipment,
  type ItemDef,
  type ItemInstance,
  type RarityId,
  type RolledAffix,
} from './items';
import { loadout, type LoadoutSource } from './loadout';

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 10) / 10));
const ATTR_NAME: Record<string, string> = { str: 'STR', dex: 'DEX', int: 'INT', luck: 'LUCK' };

/** Satırın stat ikonu / ipucu kimliği (Gear paneli ve stat-tips kimlikleri; yoksa affix'in kendi ikonu). */
const ICON_STAT: Record<string, string> = {
  armor: 'armor',
  hp: 'hp',
  accuracy: 'accuracy',
  evasion: 'evasion',
  mp: 'mp',
  hpRegen: 'hpRegen',
  mpRegen: 'mpRegen',
  crit: 'crit',
  critMult: 'critMult',
  spd: 'spd',
  magicArmor: 'magicArmor',
  damage: 'damage',
  luck: 'luck',
};

/** Affix'in oyun içi yazısı ("+4 Armor", "+5% Crit chance, +25% Crit damage", "Immune to Stun for your first 2 turns"). */
export function affixText(a: Pick<RolledAffix, 'def' | 'values' | 'x'>, classId?: string): string {
  const primary = classId ? classes[classId]?.primary : undefined;
  return a.def.text
    .replace(/\{(\d)\}/g, (_, i: string) => fmt(a.values[Number(i)] ?? 0))
    .replace('{x}', a.x ? (statusDefs[a.x]?.name ?? a.x) : 'a debuff')
    .replace('{primary}', primary ? (ATTR_NAME[primary] ?? primary.toUpperCase()) : 'primary attribute');
}

/** Affix'in görünür aralığı ("3–5"; çok parçalıda "4.5–5.5 / 20–30"); zarsızsa ''. */
export function affixRangeText(a: Pick<RolledAffix, 'ranges'>): string {
  const parts = a.ranges.filter(([lo, hi]) => lo !== hi).map(([lo, hi]) => `${fmt(lo)}–${fmt(hi)}`);
  return parts.join(' / ');
}

/** Kartlarda / ipuçlarında bir affix satırı. */
export interface AffixLine {
  id: string;
  tier: AffixTier;
  /** "+4 Armor" */
  text: string;
  /** "3–5" (zarsızsa ''). */
  range: string;
  /** Stat ikonu / ipucu kimliği (Gear paneli kimlikleri: armor, hp, crit...; yoksa undefined: affix açıklaması gösterilir). */
  stat?: string;
  /** Affix ikonu ipucu (items.json > affixDefs[].icon: stat adı ya da element:<x>). */
  icon?: string;
  /** Açıklama (ipucu): affix adı + desc. */
  name: string;
  desc?: string;
  values: number[];
}

const toLine = (a: RolledAffix, classId?: string): AffixLine => ({
  id: a.id,
  tier: a.tier,
  text: affixText(a, classId),
  range: affixRangeText(a),
  ...(a.def.icon && ICON_STAT[a.def.icon] ? { stat: ICON_STAT[a.def.icon] } : {}),
  ...(a.def.icon ? { icon: a.def.icon } : {}),
  name: a.def.name,
  ...(a.def.desc ? { desc: a.def.desc } : {}),
  values: a.values,
});

/** Örneğin affix satırları (zar sırasıyla; ilki ana affix). `classId`: {primary} ve ana affix seçimi için takan sınıf. */
export function affixLines(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string): AffixLine[] {
  return rolledAffixes(inst, classId).map((a) => toLine(a, classId));
}

/** Kademe etiketi (satır öneki): "C", "B", "A". */
export const tierTag = (t: AffixTier): string => t;

/** Kademe etiketinin rengi (Gear, tüccar, ödül kartı, Codex aynı): C soluk bronz, B soğuk mavi, A kor altını. */
export const TIER_COLOR: Record<AffixTier, string> = { C: '#b9a98a', B: '#8fb8e8', A: '#f0b04a' };

/** Tek satır yazısı: "[B] +6% Crit chance (5–7)". */
export const affixLineText = (l: AffixLine, withRange = true): string => `[${l.tier}] ${l.text}${withRange && l.range ? ` (${l.range})` : ''}`;

/** Örneğin satırları (kademe etiketi + değer + aralık) + Legendary etkisi (varsa, en sonda). Kuşanma kartı, ipuçları. */
export function instanceLines(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string): string[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const lines = affixLines(inst, classId).map((l) => affixLineText(l));
  const fx = effectLine(d);
  return fx ? [...lines, fx] : lines;
}

/** Kısa özet (kuşanma yuvası alt yazısı): kademe etiketli değerler, aralıksız ("[C] +4 Armor, [C] +3 Max HP"). */
export const instanceSummary = (inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string): string =>
  affixLines(inst, classId).map((l) => affixLineText(l, false)).join(', ');

/** Legendary etkisinin oyun içi metni: "Emberbrand: Your hits set the target Burning for 2 turns." (yer tutucular veriden). Etki yoksa null. */
export function effectLine(d: Pick<ItemDef, 'effect'>): string | null {
  const e = d.effect ? ITEMS.effects[d.effect] : undefined;
  if (!e) return null;
  const pct = (x: number) => `${Math.round((x > 1 ? x - 1 : x) * 1000) / 10}%`;
  const RAW = new Set(['value', 'mp', 'turns', 'every', 'max']); // ham sayı gösterilen alanlar; diğerleri yüzde (1'den büyükse fazlası: x1,25 -> 25%)
  const v = e.value;
  const obj = (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | number | boolean | undefined;
  const fill = (key: string): string => {
    if (key === 'pct') return typeof obj === 'number' ? pct(obj) : obj && typeof obj === 'object' ? pct(Number(Object.values(obj).find((x) => typeof x === 'number') ?? 0)) : '';
    if (key === 'value') return String(v);
    const x = obj && typeof obj === 'object' ? obj[key] : undefined;
    if (x === undefined) return `{${key}}`;
    return typeof x === 'string' || RAW.has(key) ? String(x) : typeof x === 'number' ? pct(x) : String(x);
  };
  return `${e.name}: ${e.text.replace(/\{(\w+)\}/g, (_, k: string) => fill(k))}`;
}

/**
 * Taban item'in (zarsız) satırları: ana affix (orta değer) + kalan kademeler "Random B affix"; Legendary'de dört sabit affix (orta değer) +
 * etkisi. Wiki ve örneği olmayan önizlemeler.
 */
export function itemLines(d: ItemDef, rarity: RarityId = d.rarity): string[] {
  const mid = (id: string): string | null => {
    const a = affixDef(id);
    if (!a) return null;
    return `[${a.tier}] ${affixText({ def: a, values: a.parts.map((p) => partValue(p, d.ilvl, 0.5)) })}`;
  };
  const out: string[] = [];
  if (d.rarity === 'legendary' && d.affixes) for (const id of d.affixes) out.push(mid(id) ?? id);
  else {
    const tiers = rarityDef(rarity === 'legendary' ? 'epic' : rarity).tiers;
    const mains = d.slot === 'weapon' ? (ITEMS.weaponFamilies.find((f) => f.id === d.family)?.mains ?? []) : d.main ? [d.main] : [];
    tiers.forEach((t, i) => {
      if (i === 0 && mains.length === 1) out.push(mid(mains[0]!) ?? mains[0]!);
      else if (i === 0 && mains.length > 1) out.push(`[C] One of: ${mains.map((m) => affixDef(m)?.name ?? m).join(', ')}`);
      else out.push(`[${t}] Random ${t} affix`);
    });
  }
  const fx = effectLine(d);
  return fx ? [...out, fx] : out;
}

/** Alt başlık: "Rare Gloves · Item level 9" (silahta aile adı). Örneğin nadirliği / seviyesi verilebilir. */
export function itemSubtitle(d: ItemDef, rarity: RarityId = d.rarity, ilvl: number = d.ilvl): string {
  const fam = d.family ? ITEMS.weaponFamilies.find((f) => f.id === d.family)?.name : undefined;
  return `${rarityDef(rarity).name} ${fam ?? slotDef(d.slot).name} · Item level ${ilvl}`;
}

/** Örneğin alt başlığı (nadirliği zarından). */
export const instanceSubtitle = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): string => {
  const d = itemDef(inst.id);
  return d ? itemSubtitle(d, instanceRarity(inst)) : '';
};

/** Örneğin nadirlik rengi. */
export const instanceColor = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): string => rarityDef(instanceRarity(inst)).color;

/** Kuşanma ekranının stat paneli: gösterilen değerler (oyun içi kısaltmalar, alt bar stat bloğuyla aynı dil). */
export interface HeroPanelStat {
  id: string;
  label: string;
  value: number;
  /** Gösterim: tam sayı, yüzde ya da 1 ondalık. */
  fmt: 'int' | 'pct' | 'dec';
}

/** Kahramanın savaşa gireceği motor statları (temel + item'ler; güç katmanıyla AYNI hesap). Class yoksa null. */
export function heroStats(src: LoadoutSource): Stats | null {
  const def = classes[src.class];
  return def ? applyUnitModifiers(def, loadout(src).modifiers, formulas).stats : null;
}

/** Kahramanın savaşa gireceği statlar (temel + item'ler; güç katmanıyla AYNI hesap). DMG = Global damage affix'lerinin toplamı. */
export function heroPanel(src: LoadoutSource): HeroPanelStat[] {
  const st = heroStats(src);
  if (!st) return [];
  return [
    { id: 'hp', label: 'HP', value: st.hp, fmt: 'int' },
    { id: 'mp', label: 'MP', value: st.mp, fmt: 'int' },
    { id: 'str', label: 'STR', value: st.str, fmt: 'dec' },
    { id: 'dex', label: 'DEX', value: st.dex, fmt: 'dec' },
    { id: 'int', label: 'INT', value: st.int, fmt: 'dec' },
    { id: 'luck', label: 'LUCK', value: st.luck, fmt: 'dec' },
    { id: 'damage', label: 'DMG', value: (st.damageMult ?? 1) - 1, fmt: 'pct' },
    { id: 'armor', label: 'ARM', value: st.armor, fmt: 'int' },
    { id: 'magicArmor', label: 'M.ARM', value: st.magicArmor, fmt: 'int' },
    { id: 'crit', label: 'CRIT', value: st.critChance, fmt: 'pct' },
    { id: 'critMult', label: 'CDMG', value: st.critMult, fmt: 'dec' },
    { id: 'accuracy', label: 'ACC', value: st.accuracy, fmt: 'pct' },
    { id: 'evasion', label: 'EVA', value: st.evasion, fmt: 'pct' },
    { id: 'spd', label: 'SPD', value: st.spd, fmt: 'dec' },
    { id: 'hpRegen', label: 'HP+/t', value: st.hpRegen, fmt: 'dec' },
    { id: 'mpRegen', label: 'MP+/t', value: st.mpRegen, fmt: 'int' },
  ];
}

export function fmtPanel(s: Pick<HeroPanelStat, 'value' | 'fmt'>): string {
  if (s.fmt === 'pct') return `${Math.round(s.value * 1000) / 10}%`;
  if (s.fmt === 'dec') return String(Math.round(s.value * 10) / 10);
  return String(Math.round(s.value));
}

/** Bu item takılırsa panelde değişen statlar (fark: + / -). */
export function equipDiff(src: LoadoutSource & { equipment: Equipment }, inst: ItemInstance): Array<HeroPanelStat & { delta: number }> {
  const d = itemDef(inst.id);
  if (!d) return [];
  const now = heroPanel(src);
  const after = heroPanel({ ...src, equipment: { ...src.equipment, [d.slot]: inst } });
  return after
    .map((a, i) => ({ ...a, delta: Math.round((a.value - now[i]!.value) * 10000) / 10000 }))
    .filter((x) => x.delta !== 0);
}

/**
 * İki örneğin affix karşılaştırması (tüccar / ödül kartı): aynı affix (aynı seçimle) iki yanda varsa fark, yalnızca birinde varsa tek taraf.
 * Satır sırası: yenisinin affix'leri, sonra yalnızca eskide olanlar. `now` boş = boş yuva.
 */
export interface AffixDelta {
  id: string;
  tier: AffixTier;
  name: string;
  /** İlk parça değerleri (yoksa 0) ve yazıları. */
  now: number;
  after: number;
  diff: number;
  /** Yeni satırın yazısı (yoksa eskinin). */
  text: string;
  stat?: string;
  icon?: string;
  /** Değer yüzde mi (yazıda %). */
  pct: boolean;
}

export function affixDiff(
  after: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown },
  now: (Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }) | null | undefined,
  classId?: string,
): AffixDelta[] {
  const a = rolledAffixes(after, classId);
  const b = now ? rolledAffixes(now, classId) : [];
  const key = (x: RolledAffix) => `${x.id}|${x.x ?? ''}`;
  const out: AffixDelta[] = [];
  const row = (n: RolledAffix | undefined, o: RolledAffix | undefined): AffixDelta => {
    const ref = (n ?? o)!;
    const nv = n?.values[0] ?? 0;
    const ov = o?.values[0] ?? 0;
    const line = toLine(ref, classId);
    return {
      id: ref.id,
      tier: ref.tier,
      name: ref.def.name,
      now: ov,
      after: nv,
      diff: Math.round((nv - ov) * 1000) / 1000,
      text: line.text,
      ...(line.stat ? { stat: line.stat } : {}),
      ...(line.icon ? { icon: line.icon } : {}),
      pct: ref.def.text.includes('{0}%'),
    };
  };
  for (const n of a) out.push(row(n, b.find((o) => key(o) === key(n))));
  for (const o of b) if (!a.some((n) => key(n) === key(o))) out.push(row(undefined, o));
  return out;
}

/** Bir sayının imzalı yazısı (affix biriminde): "+3", "-1.5%". */
export const signedText = (v: number, pct: boolean): string => `${v > 0 ? '+' : v < 0 ? '-' : ''}${fmt(Math.abs(v))}${pct ? '%' : ''}`;

/** Affix ipucu (stat kimliği olmayan satırlar için): başlık + açıklama + kademe. */
export function affixTip(l: Pick<AffixLine, 'name' | 'desc' | 'tier' | 'text' | 'range'>): { title: string; lines: string[]; titleDiff?: { text: string; dir: 'up' | 'down' } } {
  const lines = [l.text + (l.range ? ` (roll range ${l.range})` : '')];
  if (l.desc) lines.push(l.desc);
  lines.push(`Tier ${l.tier} affix. Values grow with item level only.`);
  return { title: l.name, lines };
}

/** Orta değer (seviyede): wiki affix tablosu. */
export const affixMidText = (id: string, ilvl: number): string => {
  const a = affixDef(id);
  return a ? affixText({ def: a, values: a.parts.map((p) => Math.round(partMid(p, ilvl) * 10) / 10) }) : id;
};

/** Primary bonusunun oyun içi adı (uyarı metni). */
export const PRIMARY_BONUS_NAME: Record<string, string> = { str: 'Resilience', dex: "Hunter's Mark", int: 'Mana Echo', luck: 'Lucky Escape' };
