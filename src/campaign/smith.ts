// Demirci (Blacksmith; Ömer 2026-10-18, ilerleme TUR 1 madde 7): kasabada, YALNIZ altınla, yeni kaynak yok. Saf; her işlem YENİ durum döndürür.
// Temper: item seviyesi bulunulan bölümün tavanına (bölüm n: n x ilvlPerChapter) kadar +1; silah gücü, örtük stat ve affix değerleri item seviyesi
// formüllerinden kendiliğinden yeniden hesaplanır (items.md 1.12 / 1.3b: değer = (base + perIlvl x ilvl) x power; zar yeri `q` aynı kalır).
// Her nadirlikte; Legendary fiyatı x legendaryMult. Seviye şartı (ilvl - 3) yükseltilmiş item'de de geçerli: takılıysa takan kahraman yeni şartı
// karşılamalı. Reforge: yalnız Epic; ana affix (ilk) dışındaki bir affix aynı kademeden seed'li yeniden zarlanır (aynı affix yeni değerle de
// gelebilir: karar 364 "Aynısı da olabilir"); her tekrarda fiyat x growth (sayaç item'in üstünde: ItemInstance.reforges). Reforge fiyatı item'in
// sefer tüccarı fiyatına (campaignPrice x 0,5; Ömer 2026-10-26), Temper fiyatı adımın değer artışına bağlı (Ömer 2026-10-23); PROVİZYON: data/campaign/campaign.json > blacksmith.
// Ömer 2026-10-26 (form econ/main): Temper artık Temper taşı + altın (taş: boss / elit ilk zaferi, loot.ts; hedef ilvl 15'in üstündeyse 2 taş; altın
// eskinin ~%30'u). Yeni mod Combine: torbadan 3 item -> 1 yeni item (nadirlik ortalama, kesir kadar bir üst ihtimali; ilvl ortalama aşağı; aynı
// tabansa aynı taban yeni affix'lerle, değilse düşüş üretecinden rastgele taban). Reforge (arayüzde 'Reroll affix' olabilir) aynen.
import type { Rng } from '../engine/rng';
import {
  affixLines,
  baseLineTexts,
  canEquip,
  instanceBaseLines,
  affixDef,
  instanceIlvl,
  instanceIP,
  instanceRarity,
  instanceRoll,
  itemDef,
  ITEMS,
  levelRequirement,
  makeItem,
  RARITY_IDS,
  rollDropBase,
  rollFloor,
  SLOT_IDS,
  tierPool,
  type ItemInstance,
  type RarityId,
  type SlotId,
} from '../progression';
import { CONFIG } from './data';
import { campaignPrice, rarityPrice } from './merchant';
import { chapterOf } from './power';
import { rngFor } from './seed';
import { activeHeroes } from './state';
import type { CampaignState, Hero } from './types';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export interface BlacksmithConfig {
  /** Bölüm başına item seviyesi tavanı (bölüm n: n x ilvlPerChapter). */
  ilvlPerChapter: number;
  /**
   * Temper fiyatı = gainRatio x item'in seviye başına ORTALAMA değer artışı (gainSpan aralığında; yuvarlama sıçramaları düzleşir) x
   * (1 + perLevelRise x (ilvl - 1)), en az minPrice; Legendary x legendaryMult (Ömer 2026-10-23, open-questions 404).
   */
  temper: {
    gainRatio: number;
    gainSpan: [number, number];
    perLevelRise: number;
    minPrice: number;
    legendaryMult: number;
    /** Adım başına Temper taşı (Ömer 2026-10-26); hedef item seviyesi highAbove'un üstündeyse highStones. Yoksa 0 (taşsız). */
    stones?: number;
    highStones?: number;
    highAbove?: number;
  };
  /** Reforge fiyatı = valueRatio x item'in tüccar fiyatı (campaignPrice) x growth ^ (önceki reforge sayısı). */
  reforge: { valueRatio: number; growth: number };
  /** Combine bedeli = valueRatio x beklenen sonucun tüccar fiyatı (merchant.ts > rarityPrice), en az minPrice (Ömer 2026-10-26; PROVİZYON). */
  combine?: { valueRatio: number; minPrice: number };
  /** Temper taşı düşüş tablosu (taş sayısı -> olasılık; loot.ts > rollTemperStones). */
  stones?: { boss: number[]; elite: number[] };
  /** Kasaba ekranındaki yer (görselin oranıyla; anahtar = kasaba görseli). Yoksa ekran kenarında yazı plakası. */
  hotspots?: Record<string, { label: string; rect: [number, number, number, number] }>;
}

export const SMITH: BlacksmithConfig = (CONFIG as unknown as { blacksmith: BlacksmithConfig }).blacksmith;

/** Item'in yeri: torba ya da bir kahramanın yuvası. */
export type ItemWhere = { where: 'bag'; index: number } | { where: 'hero'; heroId: string; slot: SlotId };

/** uid ile item'i bulur (torba ya da kadrodaki herhangi bir kahramanın yuvası). */
export function findItem(s: CampaignState, uid: string): { inst: ItemInstance; at: ItemWhere; hero?: Hero } | null {
  const i = s.inventory.findIndex((x) => x.uid === uid);
  if (i >= 0) return { inst: s.inventory[i]!, at: { where: 'bag', index: i } };
  for (const h of s.roster)
    for (const k of SLOT_IDS) {
      const it = h.equipment?.[k];
      if (it && it.uid === uid) return { inst: it, at: { where: 'hero', heroId: h.id, slot: k }, hero: h };
    }
  return null;
}

/** Durumda item'i yerinde değiştirir (`t` klonlanmış olmalı). */
function replaceItem(t: CampaignState, at: ItemWhere, inst: ItemInstance): void {
  if (at.where === 'bag') t.inventory[at.index] = inst;
  else {
    const h = t.roster.find((x) => x.id === at.heroId);
    if (h) h.equipment = { ...h.equipment, [at.slot]: inst } as Hero['equipment'];
  }
}

/** Bulunulan bölümün item seviyesi tavanı (bölüm n: n x ilvlPerChapter). */
export const smithCap = (s: Pick<CampaignState, 'mapId'>, cfg: BlacksmithConfig = SMITH): number => chapterOf(s.mapId).chapter * cfg.ilvlPerChapter;

/** Temper'in sonucu (saf önizleme): yeni item, fiyat; yapılamıyorsa `blocked` nedeni (İngilizce, arayüzde aynen). */
export interface SmithPreview {
  before: ItemInstance;
  after: ItemInstance | null;
  /** Altın bedeli. */
  price: number;
  /** Temper taşı bedeli (Ömer 2026-10-26: 1; hedef item seviyesi 15'in üstündeyse 2). */
  stones: number;
  /** Eldeki Temper taşı (CampaignState.temperStones). */
  stonesHave: number;
  blocked: string | null;
}

/** Eldeki Temper taşı (eski kayıtta alan yok = 0). */
export const temperStonesOf = (s: Pick<CampaignState, 'temperStones'>): number => Math.max(0, Math.floor(s.temperStones ?? 0));

/** Bir Temper adımının taş bedeli: hedef item seviyesi (ilvl + 1) highAbove'un üstündeyse highStones, değilse stones. */
export function temperStoneCost(inst: ItemInstance, cfg: BlacksmithConfig = SMITH): number {
  const T = cfg.temper;
  const to = instanceIlvl(inst) + 1;
  return Math.max(0, Math.floor(T.highAbove !== undefined && to > T.highAbove ? (T.highStones ?? T.stones ?? 0) : (T.stones ?? 0)));
}

/** Temper sonrası item (item seviyesi +1; zar yerleri aynı). */
const tempered = (inst: ItemInstance): ItemInstance => ({ ...inst, rolls: { ...instanceRoll(inst), ilvl: instanceIlvl(inst) + 1 } });

const atIlvl = (inst: ItemInstance, ilvl: number): ItemInstance => ({ ...inst, rolls: { ...instanceRoll(inst), ilvl } });

/**
 * Item'in seviye başına ORTALAMA değer artışı (altın): goldPerIP x (IP(hi) - IP(lo)) / (hi - lo), [lo, hi] = temper.gainSpan. Tek adımın artışı
 * affix yuvarlaması yüzünden 0 / 4 / 0 diye sıçrar; ortalama düzdür (Ömer 2026-10-23: fiyat seviyeden seviyeye sıçramasın). En az 0.
 */
export function temperGain(inst: ItemInstance, cfg: BlacksmithConfig = SMITH): number {
  if (!itemDef(inst.id)) return 0;
  const [lo, hi] = cfg.temper.gainSpan;
  if (!(hi > lo)) return 0;
  return Math.max(0, (ITEMS.budget.goldPerIP * (instanceIP(atIlvl(inst, hi)) - instanceIP(atIlvl(inst, lo)))) / (hi - lo));
}

/**
 * Temper fiyatı (Ömer 2026-10-23, open-questions 404): item'in değer artışına bağlı = gainRatio x temperGain x (1 + perLevelRise x (ilvl - 1)),
 * en az minPrice; Legendary x legendaryMult. Büyümeyen örtük statlar (kalkanın sabit bloğu) fiyata girmez; fiyat seviyeyle düzgün artar.
 */
export function temperPrice(inst: ItemInstance, cfg: BlacksmithConfig = SMITH): number {
  const T = cfg.temper;
  const p = Math.max(T.minPrice, T.gainRatio * temperGain(inst, cfg) * (1 + T.perLevelRise * (instanceIlvl(inst) - 1)));
  return Math.max(1, Math.round(p * (instanceRarity(inst) === 'legendary' ? cfg.temper.legendaryMult : 1)));
}

/** Temper önizlemesi: item seviyesi +1 (tavana kadar); takılı item'de takan kahraman yeni seviye şartını karşılamalı; altın yetmeli. */
export function temperPreview(s: CampaignState, uid: string, cfg: BlacksmithConfig = SMITH): SmithPreview | null {
  const f = findItem(s, uid);
  if (!f || !itemDef(f.inst.id)) return null;
  const from = instanceIlvl(f.inst);
  const cap = smithCap(s, cfg);
  const price = temperPrice(f.inst, cfg);
  const stones = temperStoneCost(f.inst, cfg);
  const stonesHave = temperStonesOf(s);
  if (from >= cap) return { before: f.inst, after: null, price, stones, stonesHave, blocked: `Already at this region's best (item level ${cap})` };
  const after: ItemInstance = tempered(f.inst);
  const req = levelRequirement(from + 1);
  let blocked: string | null = null;
  const lack = stones - stonesHave;
  if (f.hero && (f.hero.level ?? 1) < req) blocked = `Its wearer needs Level ${req}`;
  else if (lack > 0) blocked = `Need ${lack} more Temper Stone${lack === 1 ? '' : 's'}`;
  else if (s.gold < price) blocked = `Need ${price - s.gold} more gold`;
  return { before: f.inst, after, price, stones, stonesHave, blocked };
}

/** Temper: item seviyesi +1, altın düşer. Yapılamıyorsa Error (önizlemenin nedeni). */
export function temperItem(s: CampaignState, uid: string, cfg: BlacksmithConfig = SMITH): CampaignState {
  const p = temperPreview(s, uid, cfg);
  if (!p) throw new Error('Unknown item');
  if (p.blocked || !p.after) throw new Error(p.blocked ?? 'Cannot temper');
  const t = clone(s);
  const f = findItem(t, uid)!;
  replaceItem(t, f.at, clone(p.after));
  t.gold -= p.price;
  if (p.stones) t.temperStones = temperStonesOf(t) - p.stones;
  return t;
}

/** Reforge ('Reroll affix') fiyatı (Ömer 2026-10-26): valueRatio (0,5) x item'in sefer tüccarı fiyatı (merchant.ts > campaignPrice) x growth ^ önceki reforge sayısı (her tekrarda x1,5). */
export function reforgePrice(inst: ItemInstance, cfg: BlacksmithConfig = SMITH): number {
  const n = Math.max(0, Math.floor(inst.reforges ?? 0));
  return Math.max(1, Math.round(cfg.reforge.valueRatio * campaignPrice(inst) * Math.pow(cfg.reforge.growth, n)));
}

/** Reforge edilebilecek affix sıraları (ana affix = 0 hariç); Epic değilse boş. */
export function reforgeSlots(inst: ItemInstance): number[] {
  if (instanceRarity(inst) !== 'epic' || !itemDef(inst.id)) return [];
  return instanceRoll(inst).affixes.map((_, i) => i).filter((i) => i > 0);
}

/** Reforge'un yapılamama nedeni (yoksa null). */
export function reforgeBlocked(s: CampaignState, uid: string, index: number, cfg: BlacksmithConfig = SMITH): string | null {
  const f = findItem(s, uid);
  if (!f || !itemDef(f.inst.id)) return 'Unknown item';
  if (instanceRarity(f.inst) !== 'epic') return 'Only Epic items can be reforged';
  if (!reforgeSlots(f.inst).includes(index)) return 'The main property cannot be reforged';
  if (!reforgeChoices(f.inst, index).length) return 'No property of this tier fits';
  const price = reforgePrice(f.inst, cfg);
  if (s.gold < price) return `Need ${price - s.gold} more gold`;
  return null;
}

/**
 * Yeni affix'in çekileceği havuz: aynı kademe, bu yuvada çıkabilen, item'in DİĞER affix'lerinde olmayan. Değişen affix'in kendisi havuzda kalır
 * (Ömer 2026-10-18, karar 364: "Aynısı da olabilir"): aynı affix yeni bir değerle gelebilir.
 */
export function reforgeChoices(inst: ItemInstance, index: number): string[] {
  const d = itemDef(inst.id);
  const roll = instanceRoll(inst);
  const cur = roll.affixes[index];
  const def = cur ? affixDef(cur.id) : undefined;
  if (!d || !cur || !def) return [];
  const others = new Set(roll.affixes.filter((_, i) => i !== index).map((a) => a.id));
  return tierPool(def.tier, d.slot).filter((id) => !others.has(id));
}

/**
 * Reforge: Epic item'in `index` sıradaki (ana affix dışı) affix'i aynı kademenin havuzundan seed'li yeniden zarlanır (yeni affix + değer zarı;
 * Epic zar tabanı). Zar = hash(sefer seed'i, 'reforge', uid, kaçıncı reforge): aynı kayıttan tekrar = aynı sonuç (save-scum yok). Sayaç +1.
 */
export function reforgeItem(s: CampaignState, uid: string, index: number, cfg: BlacksmithConfig = SMITH): CampaignState {
  const why = reforgeBlocked(s, uid, index, cfg);
  if (why) throw new Error(why);
  const f = findItem(s, uid)!;
  const n = Math.max(0, Math.floor(f.inst.reforges ?? 0));
  const rng = rngFor(s.seed, 'reforge', uid, n);
  const pool = reforgeChoices(f.inst, index);
  const id = pool[rng.int(0, pool.length - 1)]!;
  const ch = affixDef(id)?.choices;
  const x = ch?.length ? ch[rng.int(0, ch.length - 1)] : undefined;
  const floor = rollFloor('epic');
  const q = Math.round((floor + (rng.int(0, 100) / 100) * (1 - floor)) * 100) / 100;
  const roll = instanceRoll(f.inst);
  const affixes = roll.affixes.map((a, i) => (i === index ? { id, q, ...(x ? { x } : {}) } : { ...a }));
  const t = clone(s);
  replaceItem(t, f.at, { ...clone(f.inst), rolls: { ...roll, affixes }, reforges: n + 1 });
  t.gold -= reforgePrice(f.inst, cfg);
  return t;
}

/** Önizleme satırı (arayüz): ad, önce, sonra (değişmediyse aynı). */
export interface SmithLine {
  label: string;
  from: string;
  to: string;
}

/**
 * Temper önizlemesinin satırları (saf; İngilizce): item seviyesi, seviye şartı, taban satırları (silah gücü / örtük stat) ve her affix'in önce -> sonra
 * değeri. Arayüz (src/ui/blacksmith-screen.ts) bunları aynen yazar.
 */
export function temperLines(before: ItemInstance, after: ItemInstance): SmithLine[] {
  const out: SmithLine[] = [{ label: 'Item level', from: String(instanceIlvl(before)), to: String(instanceIlvl(after)) }];
  const b0 = instanceBaseLines(before);
  const b1 = instanceBaseLines(after);
  out.push({ label: 'Requires level', from: String(b0.req), to: String(b1.req) });
  const t0 = baseLineTexts(b0);
  const t1 = baseLineTexts(b1);
  t0.forEach((x, i) => out.push({ label: '', from: x, to: t1[i] ?? x }));
  const a0 = affixLines(before);
  const a1 = affixLines(after);
  a0.forEach((x, i) => out.push({ label: `[${x.tier}]`, from: x.text, to: a1[i]?.text ?? x.text }));
  return out;
}

// ---------------------------------------------------------------- Combine (Ömer 2026-10-26, form econ/main)

/** Combine önizlemesi (saf). Seçim tamamlanmadıysa ya da kural dışıysa `blocked` (İngilizce, arayüzde aynen); sayılar bilinen item'lerden doldurulur. */
export interface CombinePreview {
  /** Bulunan item'ler (seçim sırasıyla; bilinmeyen uid atlanır). */
  items: ItemInstance[];
  /** Sonucun olası nadirlikleri: alt (ortalama aşağı) ve üst (bir kademe yukarı; kesir yoksa alt ile aynı); en çok Epic. */
  rarityLow: RarityId;
  rarityHigh: RarityId;
  /** Üst nadirliğe çıkma ihtimali (0..1) = 3 nadirlik sırasının ortalamasının kesri (2,33 -> 0,33). */
  upChance: number;
  /** Sonucun item seviyesi = 3 item seviyesinin ortalaması, aşağı yuvarlanmış. */
  ilvl: number;
  /** 3'ü aynı tabansa o taban (sonuç aynı taban, yeni affix'ler); değilse null (düşüş üretecinden rastgele taban). */
  sameBase: string | null;
  /** Altın bedeli. */
  price: number;
  blocked: string | null;
}

export const COMBINE_COUNT = 3;
const EPIC = RARITY_IDS.indexOf('epic');

/** Bir item'in Combine'a konamama nedeni (yoksa null): bilinmeyen, takılı, Legendary, set. */
export function combineItemBlocked(s: CampaignState, uid: string): string | null {
  const f = findItem(s, uid);
  const d = f ? itemDef(f.inst.id) : undefined;
  if (!f || !d) return 'Unknown item';
  if (f.at.where !== 'bag') return 'Unequip it first';
  if (instanceRarity(f.inst) === 'legendary') return 'Legendary items cannot be combined';
  if ((d as { set?: unknown }).set) return 'Set items cannot be combined';
  return null;
}

/** Combine bedeli: valueRatio x beklenen sonucun tüccar fiyatı (alt / üst nadirliğin olasılık ağırlıklı ortalaması), en az minPrice. */
export function combinePrice(low: RarityId, high: RarityId, upChance: number, ilvl: number, cfg: BlacksmithConfig = SMITH): number {
  const C = cfg.combine ?? { valueRatio: 0.2, minPrice: 5 };
  const expected = (1 - upChance) * rarityPrice(low, ilvl) + upChance * rarityPrice(high, ilvl);
  return Math.max(1, Math.round(Math.max(C.minPrice, C.valueRatio * expected)));
}

/**
 * Combine önizlemesi: `uids` = torbadaki 3 farklı item (takılı değil, Legendary / set değil). Nadirlik = nadirlik sıralarının ortalaması (Common 0 ..
 * Epic 3), kesir kadar bir üst ihtimali; item seviyesi = ortalama, aşağı yuvarlanmış; altın yetmeli.
 */
export function combinePreview(s: CampaignState, uids: string[], cfg: BlacksmithConfig = SMITH): CombinePreview {
  const items = uids.map((u) => findItem(s, u)?.inst).filter((x): x is ItemInstance => !!x && !!itemDef(x.id));
  const n = Math.max(1, items.length);
  const avgR = items.reduce((a, i) => a + Math.min(EPIC, RARITY_IDS.indexOf(instanceRarity(i))), 0) / n;
  const lo = Math.min(EPIC, Math.floor(avgR + 1e-9));
  const frac = lo >= EPIC ? 0 : avgR - lo;
  const upChance = frac < 1e-9 ? 0 : frac;
  const rarityLow = RARITY_IDS[lo]!;
  const rarityHigh = RARITY_IDS[upChance > 0 ? lo + 1 : lo]!;
  const ilvl = items.length ? Math.max(1, Math.floor(items.reduce((a, i) => a + instanceIlvl(i), 0) / items.length + 1e-9)) : 1;
  const sameBase = items.length === COMBINE_COUNT && items.every((i) => i.id === items[0]!.id) ? items[0]!.id : null;
  const price = combinePrice(rarityLow, rarityHigh, upChance, ilvl, cfg);
  let blocked: string | null = null;
  if (uids.length !== COMBINE_COUNT || new Set(uids).size !== COMBINE_COUNT) blocked = `Choose ${COMBINE_COUNT} different items`;
  else
    for (const u of uids) {
      blocked = combineItemBlocked(s, u);
      if (blocked) break;
    }
  if (!blocked && s.gold < price) blocked = `Need ${price - s.gold} more gold`;
  return { items, rarityLow, rarityHigh, upChance, ilvl, sameBase, price, blocked };
}

/** Combine zarı (seed'li): hash(sefer seed'i, 'combine', sıralı uid'ler, sıradaki item numarası): aynı kayıttan tekrar = aynı sonuç (save-scum yok). */
export const combineRng = (s: CampaignState, uids: string[]): Rng => rngFor(s.seed, 'combine', ...[...uids].sort(), s.nextItemId);

/**
 * Combine: 3 item yok olur, torbaya 1 yeni item girer (uid = `i${s.nextItemId}`, torbanın sonunda), altın düşer. Nadirlik zarı (rng.next < upChance
 * -> üst); aynı tabansa o taban, değilse düşüş üretecinin taban seçimi (progression > rollDropBase: smartSlotChance / usableWeaponChance, taban
 * ilvl <= sonuç ilvl'si); affix'ler o nadirlik ve seviyede zarlanır (makeItem). Yapılamıyorsa Error (önizlemenin nedeni). `rng` yoksa combineRng.
 */
export function combineItems(s: CampaignState, uids: string[], rng?: Rng, cfg: BlacksmithConfig = SMITH): CampaignState {
  const p = combinePreview(s, uids, cfg);
  if (p.blocked) throw new Error(p.blocked);
  const r = rng ?? combineRng(s, uids);
  const rarity = p.upChance > 0 && r.next() < p.upChance ? p.rarityHigh : p.rarityLow;
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  let id: string;
  let forClass: string | undefined;
  if (p.sameBase) {
    id = p.sameBase;
    const d = itemDef(id)!;
    const fits = d.family ? team.filter((h) => canEquip(h.class, d)) : [];
    forClass = fits.length ? fits[r.int(0, fits.length - 1)]!.class : undefined;
  } else {
    const pick = rollDropBase(r, team.map((h) => ({ class: h.class, equipment: h.equipment })), p.ilvl);
    if (!pick) throw new Error('Nothing to forge');
    id = pick.def.id;
    forClass = pick.forClass;
  }
  const t = clone(s);
  t.inventory = t.inventory.filter((i) => !uids.includes(i.uid));
  t.inventory.push(makeItem(id, `i${t.nextItemId++}`, r, { rarity, ilvl: p.ilvl, ...(forClass ? { forClass } : {}) }));
  t.gold -= p.price;
  return t;
}

// ---------------------------------------------------------------- bedava Temper (kampın Sharpen'ı; campaign-dev, state.ts > useCamp)

/** Bedava Temper önizlemesi (altın ve Temper taşı aranmaz; tavan ve takanın seviye şartı aynen). Kampın Sharpen seçimi kullanır. */
export function freeTemperPreview(s: CampaignState, uid: string, cfg: BlacksmithConfig = SMITH): SmithPreview | null {
  const p = temperPreview({ ...s, gold: Number.MAX_SAFE_INTEGER, temperStones: Number.MAX_SAFE_INTEGER }, uid, cfg);
  return p && { ...p, price: 0, stones: 0, stonesHave: temperStonesOf(s) };
}

/** Bedava Temper: item seviyesi +1; altın ve Temper taşı DÜŞMEZ. Yapılamıyorsa Error. */
export function freeTemperItem(s: CampaignState, uid: string, cfg: BlacksmithConfig = SMITH): CampaignState {
  const p = freeTemperPreview(s, uid, cfg);
  if (!p) throw new Error('Unknown item');
  if (p.blocked || !p.after) throw new Error(p.blocked ?? 'Cannot temper');
  const t = clone(s);
  replaceItem(t, findItem(t, uid)!.at, clone(p.after));
  return t;
}
