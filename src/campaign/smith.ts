// Demirci (Blacksmith; Ömer 2026-10-18, ilerleme TUR 1 madde 7): kasabada, YALNIZ altınla, yeni kaynak yok. Saf; her işlem YENİ durum döndürür.
// Temper: item seviyesi bulunulan bölümün tavanına (bölüm n: n x ilvlPerChapter) kadar +1; silah gücü, örtük stat ve affix değerleri item seviyesi
// formüllerinden kendiliğinden yeniden hesaplanır (items.md 1.12 / 1.3b: değer = (base + perIlvl x ilvl) x power; zar yeri `q` aynı kalır).
// Her nadirlikte; Legendary fiyatı x legendaryMult. Seviye şartı (ilvl - 3) yükseltilmiş item'de de geçerli: takılıysa takan kahraman yeni şartı
// karşılamalı. Reforge: yalnız Epic; ana affix (ilk) dışındaki bir affix aynı kademeden seed'li yeniden zarlanır (aynı affix yeni değerle de
// gelebilir: karar 364 "Aynısı da olabilir"); her tekrarda fiyat x growth (sayaç item'in üstünde: ItemInstance.reforges). Reforge fiyatı item'in
// tüccar fiyatına (itemValue), Temper fiyatı adımın değer artışına bağlı (Ömer 2026-10-23); PROVİZYON: data/campaign/campaign.json > blacksmith.
import {
  affixLines,
  baseLineTexts,
  instanceBaseLines,
  affixDef,
  instanceIlvl,
  instanceIP,
  instanceRarity,
  instanceRoll,
  itemDef,
  itemValue,
  ITEMS,
  levelRequirement,
  rollFloor,
  SLOT_IDS,
  tierPool,
  type ItemInstance,
  type SlotId,
} from '../progression';
import { CONFIG } from './data';
import { chapterOf } from './power';
import { rngFor } from './seed';
import type { CampaignState, Hero } from './types';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export interface BlacksmithConfig {
  /** Bölüm başına item seviyesi tavanı (bölüm n: n x ilvlPerChapter). */
  ilvlPerChapter: number;
  /**
   * Temper fiyatı = gainRatio x item'in seviye başına ORTALAMA değer artışı (gainSpan aralığında; yuvarlama sıçramaları düzleşir) x
   * (1 + perLevelRise x (ilvl - 1)), en az minPrice; Legendary x legendaryMult (Ömer 2026-10-23, open-questions 404).
   */
  temper: { gainRatio: number; gainSpan: [number, number]; perLevelRise: number; minPrice: number; legendaryMult: number };
  /** Reforge fiyatı = valueRatio x item'in tüccar fiyatı x growth ^ (önceki reforge sayısı). */
  reforge: { valueRatio: number; growth: number };
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
  price: number;
  blocked: string | null;
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
  if (from >= cap) return { before: f.inst, after: null, price, blocked: `Already at this region's best (item level ${cap})` };
  const after: ItemInstance = tempered(f.inst);
  const req = levelRequirement(from + 1);
  let blocked: string | null = null;
  if (f.hero && (f.hero.level ?? 1) < req) blocked = `Its wearer needs Level ${req}`;
  else if (s.gold < price) blocked = `Need ${price - s.gold} more gold`;
  return { before: f.inst, after, price, blocked };
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
  return t;
}

/** Reforge fiyatı: valueRatio x item'in tüccar fiyatı (itemValue; karar 364: tam fiyat) x growth ^ önceki reforge sayısı (her tekrarda x1,5). */
export function reforgePrice(inst: ItemInstance, cfg: BlacksmithConfig = SMITH): number {
  const n = Math.max(0, Math.floor(inst.reforges ?? 0));
  return Math.max(1, Math.round(cfg.reforge.valueRatio * itemValue(inst) * Math.pow(cfg.reforge.growth, n)));
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
