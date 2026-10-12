// Item verisi ve kuralları (saf TypeScript; Phaser/DOM yok). Tasarım: docs/design/progression/items.md (affix kademeleri: 1.3b, Ömer onayı 2026-10-11).
// Katalog = taban item'ler; nadirlik = affix sayısı (C / C,C / C,C,B / C,C,B,A / Legendary C,C,B,A + etki); affix değeri yalnızca item seviyesiyle büyür.
import itemsJson from '../../data/items.json';
import { classes, randomPool, statuses as statusDefs } from '../engine/content';
import { affixFit, classElements } from './affix-fit';
import { Rng } from '../engine/rng';
import type { Element } from '../engine/types';

/** 6 yuva (karar 1). Sıra veridekiyle aynı. */
export const SLOT_IDS = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'trinket'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export const RARITY_IDS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type RarityId = (typeof RARITY_IDS)[number];

/** Affix kademeleri (D yok; Ömer 2026-10-11). */
export const TIER_IDS = ['C', 'B', 'A'] as const;
export type AffixTier = (typeof TIER_IDS)[number];

export interface SlotDef {
  id: SlotId;
  name: string;
  weight: number;
}

export interface RarityDef {
  id: RarityId;
  name: string;
  color: string;
  /** Örneğin taşıdığı affix kademeleri, sırayla (ilki ana affix; Common C ... Epic C, C, B, A). */
  tiers: AffixTier[];
  /** Legendary: benzersiz etkisi var. */
  effect?: boolean;
}

/** Elementler (affix hedefi `elem:<element>`; `elem:*` = fiziksel dışı altısı). */
export const ELEMENTS: readonly Element[] = ['physical', 'fire', 'ice', 'holy', 'dark', 'nature', 'arcane'];
export const MAGIC_ELEMENTS: readonly Element[] = ['fire', 'ice', 'holy', 'dark', 'nature', 'arcane'];

/** Affix'in bir sayısı (items.json > affixDefs[].parts). */
export interface AffixPart {
  base: number;
  perIlvl: number;
  /** Yuvarlama adımı (değer bunun katı; en az bir adım). */
  step: number;
  /** 1 birimin Item Points değeri (değer, fiyat, Equip best). */
  ip: number;
  /** Motor eşlemesi: mod:<UnitModifiers alanı> | mult:<alan> | fx:<ItemEffects alanı> | elem:<element|*> | attr:primary|all | prog:recovery. */
  to: string;
  /** Gösterilen sayıdan motor birimine çarpan (yüzde -> oran: 0,01). */
  scale?: number;
  /** Zar ve seviye yok: değer = base (Ultimate -1). */
  fixed?: boolean;
  /** Seviye değeri aşağı yuvarlanır (Immunity tur sayısı). */
  floor?: boolean;
  /** Zar yok (değer seviyeye göre sabit). */
  noRoll?: boolean;
  /** affixRules.power bu parçaya işlemez (adımı iri olanlar: ana stat, tüm statlar, hız, Immunity tur sayısı). */
  noPower?: boolean;
  /** fx alanı çarpan biçiminde (1 + toplam; tierDamageMult). */
  form?: 'mult';
  /** lowHpReduce eşiği. */
  below?: number;
}

export interface AffixDef {
  tier: AffixTier;
  name: string;
  /** Oyun içi satır: {0}/{1} parça değerleri, {x} zarlanan seçim (durum adı), {primary} sınıfın ana statı. */
  text: string;
  desc?: string;
  /** Yalnızca bu yuvalarda (yoksa her yuvada). */
  slots?: SlotId[];
  /** Equip best sınıf uyumu ipucu: element:<x> | element:magic | mp | shield | dot | debuff | support | summon. */
  needs?: string;
  /** Satır ikonu ipucu (stat ikonu adı ya da element:<x>). */
  icon?: string;
  /** Zarla seçilen değer listesi (Immunity: durum id'leri). */
  choices?: string[];
  parts: AffixPart[];
}

/** Legendary etki tanımı (items.json > effects). `text` içindeki {alan} yer tutucuları `value`'dan doldurulur. */
export interface EffectDef {
  name: string;
  text: string;
  ip: number;
  /** Motor kancası (src/engine/types.ts > ItemEffects alanı). */
  hook: string;
  value: number | boolean | Record<string, unknown> | unknown[];
}

/** Kahraman başına Legendary sınırı mesajı (Gear ekranı; sefer ve Endless). */
export const LEGENDARY_LIMIT_MSG = 'Only one Legendary per hero';

export interface WeaponFamilyDef {
  id: string;
  name: string;
  classes: string[];
  /** Silahın ana affix adayları (hasar türü; Ömer 2026-10-11): örnek oluşurken biri seçilir (kimin için zarlandıysa onun elementi önce). */
  mains: string[];
  /** Ailenin TEK EL silahları ikinci el yuvasına da takılabilir (hançer; Ömer 2026-10-12). */
  offhand?: boolean;
}

/** Silah tutuşu (Ömer 2026-10-12, future-ideas 'Silah ve tutuş kuralları'): tek el, çift el, yay, tılsım. */
export const GRIP_IDS = ['one', 'two', 'bow', 'charm'] as const;
export type Grip = (typeof GRIP_IDS)[number];

/** Katalog item'i (taban): ad, yuva, aile, seviye, varsayılan nadirlik, ana affix. */
export interface ItemDef {
  id: string;
  name: string;
  slot: SlotId;
  /** Silah ve kalkanda (karar 2: silah aileleri; kalkan = Maces & Shields, ikinci el yuvası). */
  family?: string;
  /** Silah tutuşu (yalnızca silahta, zorunlu): one | two | bow | charm. two / bow / charm ikinci eli kapatır. */
  grip?: Grip;
  /** Varsayılan nadirlik (örnek kendi nadirliğini taşır: ItemRoll.rarity). Legendary taban yalnızca Legendary olur. */
  rarity: RarityId;
  ilvl: number;
  /** Ana (ilk) C affix'i; silahta yok (aile listesinden). */
  main?: string;
  /** Legendary: dört sabit affix (C, C, B, A). */
  affixes?: string[];
  /** İsteğe bağlı ikon adı (src/game/item-icons.ts > ITEM_ICONS); yoksa silah ailesinin / yuvanın ikonu. */
  icon?: string;
  /** Legendary etkisi (items.json > effects). */
  effect?: string;
  /** Yalnızca bu sınıflar takabilir (Legendary "Usable by"; silah ailesine ek kısıt). */
  usableBy?: string[];
  /** Bu bölümden önce ortaya çıkmaz (Legendary; Valdoria = 1). */
  minChapter?: number;
  /** Legendary hikâye satırı (İngilizce, italik). */
  flavor?: string;
}

export interface ItemsData {
  slots: SlotDef[];
  rarities: RarityDef[];
  setColor: string;
  budget: { goldPerIP: number; minValue: number; sellRatio: number };
  /** Affix zarı (Ömer 2026-10-10): değer = orta x (1 ± spread), adıma yuvarlanır. */
  rolls: { spread: number };
  /** power = tüm affix değerlerinin ortak çarpanı (denge düğmesi). */
  /** power = tüm affix değerlerinin ortak çarpanı (denge düğmesi); rollFloorByRarity = nadirliğe göre zarın aralıktaki alt sınırı (0-1). */
  affixRules: { power: number; rollFloorByRarity?: Partial<Record<RarityId, number>>; classFit?: { weight: number; tiers: AffixTier[] } };
  affixDefs: Record<string, AffixDef>;
  effects: Record<string, EffectDef>;
  effectRules: { stack: boolean; endless: boolean };
  /** Toplam tavanlar (yüzde ya da düz): kritik, isabet, kaçınma, hız; MP bedeli indirimi, debuff direnci. */
  caps: { crit: number; accuracy: number; evasion: number; spd: number; mpCost?: number; resist?: number };
  weaponFamilies: WeaponFamilyDef[];
  bag: number;
  items: ItemDef[];
  loot: LootConfig;
  bases: unknown[];
  affixes: unknown[];
  uniques: unknown[];
  sets: unknown[];
  traits: Record<string, unknown>;
}

export type LootKind = 'battle' | 'elite' | 'boss' | 'treasure';

/** Loot ayarları (items.json > loot; items.md 3.1-3.4). */
export interface LootConfig {
  perPartyMember: Record<'battle' | 'elite' | 'boss', number>;
  minItems: Record<LootKind, number>;
  treasureBase: number;
  treasurePerMember: number;
  smartSlotChance: number;
  usableWeaponChance: number;
  repeat: Array<{ items: number; gold: number; maxRarity: RarityId }>;
  /** Legendary düşüş şansı: 0 iken loot asla Legendary vermez (Legendary yalnızca ortak nadir düşüşten, madde 297). */
  legendaryChance?: number;
  gold: Record<LootKind, number>;
}

export const ITEMS: ItemsData = itemsJson as unknown as ItemsData;

/** Örneğin bir affix'i: id + zar (q, 0-1; değer aralığındaki yeri) + seçim (Immunity'nin durumu). */
export interface AffixRoll {
  id: string;
  q: number;
  x?: string;
}

/** Örneğin zarları (Ömer 2026-10-11): nadirlik, (ileride) item seviyesi ve affix listesi; oluşurken seed'li zarla bir kez atılır, kayda yazılır. */
export interface ItemRoll {
  rarity?: RarityId;
  ilvl?: number;
  affixes: AffixRoll[];
}

/**
 * Kayıttaki item örneği: katalog id'si + zarları. `uid` sefer / koşu içinde tekil. Eski kayıtlarda `rolls` eski stat haritası olabilir:
 * okunurken `instanceRoll` en yakın yeni biçime çevirir (kayıt göçü `migrateItemRolls`).
 */
export interface ItemInstance {
  uid: string;
  id: string;
  rolls?: ItemRoll;
}

/** Kahramanın takılı item'leri: 6 yuvanın hepsi anahtar olarak var, boş = null. */
export type Equipment = Record<SlotId, ItemInstance | null>;

export const emptyEquipment = (): Equipment => Object.fromEntries(SLOT_IDS.map((k) => [k, null])) as Equipment;

/** Torba kapasitesi (items.json > bag; 30). */
export const BAG_SIZE = ITEMS.bag;

const byId = new Map(ITEMS.items.map((d) => [d.id, d]));
export const itemDef = (id: string): ItemDef | undefined => byId.get(id);

export const slotDef = (id: SlotId): SlotDef => ITEMS.slots.find((s) => s.id === id)!;
export const rarityDef = (id: RarityId): RarityDef => ITEMS.rarities.find((r) => r.id === id) ?? ITEMS.rarities[0]!;
export const affixDef = (id: string): AffixDef | undefined => ITEMS.affixDefs[id];
export const rarityIndex = (r: RarityId): number => Math.max(0, RARITY_IDS.indexOf(r));

// ------------------------------------------------------------ affix değerleri

const snap = (v: number, step: number): number => Math.round(Math.round(v / step) * step * 1000) / 1000;

/** Parçanın seviyedeki orta değeri (power çarpanlı; fixed = base). */
export function partMid(p: AffixPart, ilvl: number): number {
  if (p.fixed) return p.base;
  const v = (p.base + p.perIlvl * Math.max(1, ilvl)) * (p.noPower ? 1 : (ITEMS.affixRules?.power ?? 1));
  return p.floor ? Math.floor(v + 1e-9) : v;
}

/** Parçanın değeri: orta x (1 + spread x (2q - 1)), adıma yuvarlanır, en az bir adım (zarsız parçada orta değer). */
export function partValue(p: AffixPart, ilvl: number, q: number): number {
  const mid = partMid(p, ilvl);
  if (p.fixed || p.noRoll || p.floor) return Math.max(p.step, snap(mid, p.step));
  const qq = Math.min(1, Math.max(0, Number.isFinite(q) ? q : 0.5));
  return Math.max(p.step, snap(mid * (1 + ITEMS.rolls.spread * (2 * qq - 1)), p.step));
}

/** Parçanın görünür aralığı [en az, en çok] (zarsızda iki uç aynı). */
export const partRange = (p: AffixPart, ilvl: number, floor = 0): [number, number] => [partValue(p, ilvl, floor), partValue(p, ilvl, 1)];

/**
 * Nadirliğin zar tabanı (Ömer 2026-10-11): yüksek nadirlik aralığın ÜST kısmından zarlar (tavan aynı). items.json > affixRules.rollFloorByRarity,
 * aralığın oranı (0 = tüm aralık). Yalnızca yeni zarlar; kayıtlı örneklerin q'su (aralıktaki yeri) değişmez.
 */
export const rollFloor = (r: RarityId | undefined): number => Math.min(1, Math.max(0, (r ? ITEMS.affixRules?.rollFloorByRarity?.[r] : 0) ?? 0));

/** Affix'in değerleri (parça sırasıyla). Bilinmeyen affix: boş. */
export function affixValues(id: string, ilvl: number, q: number): number[] {
  const a = affixDef(id);
  return a ? a.parts.map((p) => partValue(p, ilvl, q)) : [];
}

/** Affix'in IP'si (değerler x birim IP). */
export function affixIP(id: string, values: number[]): number {
  const a = affixDef(id);
  if (!a) return 0;
  return Math.round(a.parts.reduce((s, p, i) => s + (values[i] ?? 0) * p.ip, 0) * 1000) / 1000;
}

/** Bu affix bu yuvada olabilir mi (yuva sınırları: delme/kritik silah + eldiven, auralar zırh + tılsım, kaçınma bot + eldiven). */
export const affixAllowed = (id: string, slot: SlotId): boolean => {
  const a = affixDef(id);
  return !!a && (!a.slots || a.slots.includes(slot));
};

/** Kademenin bu yuvada çekilebilecek affix'leri (veri sırasıyla). */
export const tierPool = (tier: AffixTier, slot: SlotId): string[] => Object.keys(ITEMS.affixDefs).filter((id) => ITEMS.affixDefs[id]!.tier === tier && affixAllowed(id, slot));

// ------------------------------------------------------------ sınıf ipuçları (ana affix seçimi, Equip best)

/** Ana affix'in elementi (elem:<x> hedefli tek parçalı C affix'i), yoksa undefined. */
const affixElement = (id: string): Element | undefined => {
  const to = affixDef(id)?.parts[0]?.to ?? '';
  return to.startsWith('elem:') && to !== 'elem:*' ? (to.slice(5) as Element) : undefined;
};

/** Taban item'in ana affix adayları: silahta ailenin listesi, diğerlerinde `main`. */
export function mainCandidates(d: ItemDef): string[] {
  if (d.family) return ITEMS.weaponFamilies.find((f) => f.id === d.family)?.mains ?? ['c_phys'];
  return d.main ? [d.main] : [];
}

// ------------------------------------------------------------ zar (örnek oluşturma)

type IntRng = { int(min: number, max: number): number };

export interface RollOptions {
  /** Nadirlik (yoksa katalogdaki). Legendary taban her zaman Legendary; diğerleri Legendary olamaz (en çok Epic). */
  rarity?: RarityId;
  /** Kimin için zarlanıyor: silahın ana affix'i bu sınıfın kullandığı elementlerden seçilir (yoksa aile listesinden tekdüze). */
  forClass?: string;
  /** Örneğin item seviyesi (yoksa katalogdaki). */
  ilvl?: number;
}

/** Nadirliği tabana göre sıkıştırır: Legendary taban -> Legendary; diğer taban en çok Epic. */
export function clampRarity(d: ItemDef, r: RarityId | undefined): RarityId {
  if (d.rarity === 'legendary') return 'legendary';
  const want = r && (RARITY_IDS as readonly string[]).includes(r) ? r : d.rarity;
  return want === 'legendary' ? 'epic' : want;
}

const rollQ = (rng: IntRng, floor = 0): number => Math.round((floor + (rng.int(0, 100) / 100) * (1 - floor)) * 100) / 100;

function rollChoice(id: string, rng: IntRng): string | undefined {
  const ch = affixDef(id)?.choices;
  return ch?.length ? ch[rng.int(0, ch.length - 1)] : undefined;
}

/**
 * Bir taban item için seed'li zar (aynı Rng durumu = aynı örnek): ana C affix'i, sonra nadirliğin kalan kademeleri kendi havuzlarından
 * (aynı affix iki kez yok, yuva sınırları geçerli), her affix'e bir değer zarı (q) ve gerekiyorsa seçim (x). Legendary'de dört affix sabit.
 */
export function rollItem(d: ItemDef, rng: IntRng, o: RollOptions = {}): ItemRoll {
  const rarity = clampRarity(d, o.rarity);
  const affixes: AffixRoll[] = [];
  const push = (id: string) => {
    const x = rollChoice(id, rng);
    affixes.push({ id, q: rollQ(rng, rollFloor(rarity)), ...(x ? { x } : {}) });
  };
  if (rarity === 'legendary' && d.affixes?.length) {
    for (const id of d.affixes) push(id);
  } else {
    const tiers = rarityDef(rarity).tiers;
    let mains = mainCandidates(d).filter((id) => affixDef(id));
    if (o.forClass && mains.length > 1) {
      const els = classElements(o.forClass);
      const fit = mains.filter((id) => els.has(affixElement(id) ?? ('-' as Element)));
      if (fit.length) mains = fit;
    }
    const used = new Set<string>();
    tiers.forEach((tier, i) => {
      let id: string | undefined;
      if (i === 0 && mains.length) id = mains.length > 1 ? mains[rng.int(0, mains.length - 1)] : mains[0];
      if (!id) {
        const pool = tierPool(tier, d.slot).filter((a) => !used.has(a));
        if (!pool.length) return;
        id = pickFitWeighted(pool, tier, o.forClass, rng);
      }
      used.add(id);
      push(id);
    });
  }
  return { rarity, ...(o.ilvl !== undefined && o.ilvl !== d.ilvl ? { ilvl: Math.max(1, Math.round(o.ilvl)) } : {}), affixes };
}

/**
 * Rastgele affix seçimi (Ömer 2026-10-11): kimin için zarlandıysa ona yarayan affix'ler HAFİF ağırlıklı (items.json > affixRules.classFit:
 * `weight` kat, yalnızca `tiers` kademelerinde; ör. C'de 2 kat). Dışlayıcı değil; sınıf yoksa tekdüze (tek rng.int).
 */
function pickFitWeighted(pool: string[], tier: AffixTier, forClass: string | undefined, rng: IntRng): string {
  const cf = ITEMS.affixRules?.classFit;
  const w = cf && forClass && cf.tiers.includes(tier) ? Math.max(1, Math.round(cf.weight)) : 1;
  if (w === 1) return pool[rng.int(0, pool.length - 1)]!;
  const weights = pool.map((id) => (affixFit(forClass!, { id, def: affixDef(id)! }) >= 1 ? w : 1));
  let x = rng.int(0, weights.reduce((a, b) => a + b, 0) - 1);
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i]!;
    if (x < 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

/** Geriye dönük ad (eski API): örnek zarları. */
export const rollStats = rollItem;

/** Yeni item örneği, zarları atılmış (sefer loot'u loot seed'inden, Endless koşu seed'inden Rng verir). */
export function makeItem(id: string, uid: string, rng: IntRng, o: RollOptions = {}): ItemInstance {
  const d = itemDef(id);
  return d ? { uid, id, rolls: rollItem(d, rng, o) } : { uid, id };
}

/** Yeni biçimde bir zar nesnesi mi? */
export const isItemRoll = (r: unknown): r is ItemRoll => !!r && typeof r === 'object' && Array.isArray((r as ItemRoll).affixes);

// ------------------------------------------------------------ eski kayıt göçü (en yakın yeni biçim; hiçbir durumda çökmez)

/** Eski stat -> en yakın affix (kademeye göre). */
const LEGACY_AFFIX: Record<string, Partial<Record<AffixTier, string>>> = {
  str: { A: 'a_primary' },
  dex: { A: 'a_primary' },
  int: { A: 'a_primary' },
  luck: { A: 'a_primary' },
  might: { A: 'a_gdmg' },
  armor: { C: 'c_armor' },
  magicArmor: { B: 'b_marmor' },
  hp: { C: 'c_hp' },
  crit: { B: 'b_crit', A: 'a_keen' },
  critDmg: { B: 'b_critdmg', A: 'a_keen' },
  accuracy: { C: 'c_acc' },
  evasion: { C: 'c_eva' },
  spd: { B: 'b_speed', A: 'a_speedpct' },
  mp: { C: 'c_mp', A: 'a_mana' },
  mpRegen: { C: 'c_mpregen', A: 'a_mana' },
  hpRegen: { C: 'c_hpregen' },
};

/** Dize -> 32 bit tohum (FNV-1a). */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Eski (stat haritalı ya da zarsız) örnekten yeni zar: nadirlik katalogdaki; ana affix (silahta sınıfın elementi, yoksa ailenin ilki); kalan
 * kademelerde eski statlara karşılık gelen affix'ler tercih edilir, eksikler uid'den seed'li çekilir. Değerler aralığın ortası (q 0,5).
 */
export function legacyRoll(d: ItemDef, old: unknown, uid: string, classId?: string): ItemRoll {
  const rng = new Rng(hashSeed(`${uid}|${d.id}`));
  const oldKeys = old && typeof old === 'object' && !Array.isArray(old) ? Object.keys(old as object).filter((k) => typeof (old as Record<string, unknown>)[k] === 'number') : [];
  const rarity = clampRarity(d, d.rarity);
  const affixes: AffixRoll[] = [];
  const push = (id: string) => {
    const x = rollChoice(id, rng);
    affixes.push({ id, q: 0.5, ...(x ? { x } : {}) });
  };
  if (rarity === 'legendary' && d.affixes?.length) {
    for (const id of d.affixes) push(id);
    return { rarity, affixes };
  }
  let mains = mainCandidates(d).filter((id) => affixDef(id));
  if (classId && mains.length > 1) {
    const els = classElements(classId);
    const fit = mains.filter((id) => els.has(affixElement(id) ?? ('-' as Element)));
    if (fit.length) mains = fit;
  }
  const used = new Set<string>();
  rarityDef(rarity).tiers.forEach((tier, i) => {
    let id: string | undefined = i === 0 ? mains[0] : undefined;
    if (!id) id = oldKeys.map((k) => LEGACY_AFFIX[k]?.[tier]).find((a): a is string => !!a && !used.has(a) && affixAllowed(a, d.slot));
    if (!id) {
      const pool = tierPool(tier, d.slot).filter((a) => !used.has(a));
      if (!pool.length) return;
      id = pool[rng.int(0, pool.length - 1)]!;
    }
    used.add(id);
    push(id);
  });
  return { rarity, affixes };
}

/** Zar nesnesini doğrular / onarır: bilinmeyen affix'ler atılır, q [0,1]'e sıkıştırılır, nadirlik tabana göre sıkıştırılır. Bozuksa null. */
function sanitizeRoll(d: ItemDef, r: ItemRoll): ItemRoll | null {
  const affixes = r.affixes
    .filter((a): a is AffixRoll => !!a && typeof a === 'object' && typeof a.id === 'string' && !!affixDef(a.id))
    .map((a) => ({ id: a.id, q: Math.min(1, Math.max(0, typeof a.q === 'number' && Number.isFinite(a.q) ? a.q : 0.5)), ...(typeof a.x === 'string' ? { x: a.x } : {}) }));
  if (!affixes.length) return null;
  const ilvl = typeof r.ilvl === 'number' && Number.isFinite(r.ilvl) && r.ilvl >= 1 ? Math.round(r.ilvl) : undefined;
  return { rarity: clampRarity(d, r.rarity), ...(ilvl !== undefined ? { ilvl } : {}), affixes };
}

/** Örneğin geçerli zarı: yeni biçimse doğrulanmış hali, eski / bozuk / yoksa en yakın yeni biçim (seed'li; aynı uid = aynı sonuç). */
export function instanceRoll(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string): ItemRoll {
  const d = itemDef(inst.id);
  if (!d) return { affixes: [] };
  if (isItemRoll(inst.rolls)) {
    const ok = sanitizeRoll(d, inst.rolls);
    if (ok) return ok;
  }
  return legacyRoll(d, inst.rolls, inst.uid ?? inst.id, classId);
}

/** Örneğin nadirliği (zarında; yoksa katalogdaki). */
export const instanceRarity = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): RarityId => {
  const d = itemDef(inst.id);
  if (!d) return 'common';
  return isItemRoll(inst.rolls) ? clampRarity(d, inst.rolls.rarity) : d.rarity;
};

/** Örneğin item seviyesi (zarında; yoksa katalogdaki). */
export const instanceIlvl = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): number => {
  const d = itemDef(inst.id);
  const r = isItemRoll(inst.rolls) ? inst.rolls.ilvl : undefined;
  return typeof r === 'number' && r >= 1 ? r : (d?.ilvl ?? 1);
};

/** Örneğin bir affix'i, değerleri ve aralıklarıyla (arayüz ve güç katmanı). */
export interface RolledAffix {
  id: string;
  def: AffixDef;
  tier: AffixTier;
  values: number[];
  ranges: Array<[number, number]>;
  x?: string;
}

/** Örneğin affix'leri (zar sırasıyla; ilki ana affix). Bilinmeyen item: boş. */
export function rolledAffixes(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string): RolledAffix[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const roll = instanceRoll(inst, classId);
  const ilvl = roll.ilvl ?? d.ilvl;
  const out: RolledAffix[] = [];
  for (const a of roll.affixes) {
    const def = affixDef(a.id);
    if (!def) continue;
    // Aralık örneğin nadirliğine göre (zar tabanı); eski zar tabanın altındaysa alt uç kendi değeri
    const floor = rollFloor(roll.rarity);
    const ranges = def.parts.map((p): [number, number] => {
      const [lo, hi] = partRange(p, ilvl, floor);
      return [Math.min(lo, partValue(p, ilvl, a.q)), hi];
    });
    out.push({ id: a.id, def, tier: def.tier, values: def.parts.map((p) => partValue(p, ilvl, a.q)), ranges, ...(a.x ? { x: a.x } : {}) });
  }
  return out;
}

// ------------------------------------------------------------ IP, değer

/** Etkinin IP'si (yoksa 0). */
export const effectIP = (d: Pick<ItemDef, 'effect'>): number => (d.effect ? (ITEMS.effects[d.effect]?.ip ?? 0) : 0);

/** Örneğin IP'si (zarlarıyla + Legendary etkisi; Gear Score, "en zayıf yuva", Equip best). */
export const instanceIP = (inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }): number => {
  const d = itemDef(inst.id);
  if (!d) return 0;
  const ip = rolledAffixes(inst).reduce((s, a) => s + affixIP(a.id, a.values), 0) + effectIP(d);
  return Math.round(ip * 1000) / 1000;
};

/** Bir affix'in seviyedeki ORTA IP'si. */
const midIP = (id: string, ilvl: number): number => {
  const a = affixDef(id);
  return a ? a.parts.reduce((s, p) => s + partValue(p, ilvl, 0.5) * p.ip, 0) : 0;
};

/** Kademenin bu yuvadaki ortalama orta IP'si (zarlanacak affix'in beklenen değeri). */
const tierMeanIP = (tier: AffixTier, slot: SlotId, ilvl: number): number => {
  const pool = tierPool(tier, slot);
  return pool.length ? pool.reduce((s, id) => s + midIP(id, ilvl), 0) / pool.length : 0;
};

/**
 * Taban item'in (zarsız) BEKLENEN IP'si: nadirliğin kademeleri (ana affix + kademe ortalamaları; Legendary'de sabit affix'ler) + etki. `rarity`
 * verilmezse katalogdaki. Endless öneri seçimi ve zarsız fiyat bunu kullanır.
 */
export function itemIP(d: ItemDef, rarity?: RarityId, ilvl: number = d.ilvl): number {
  const r = clampRarity(d, rarity);
  let ip = 0;
  if (r === 'legendary' && d.affixes?.length) ip = d.affixes.reduce((s, id) => s + midIP(id, ilvl), 0);
  else {
    const mains = mainCandidates(d).filter((id) => affixDef(id));
    rarityDef(r).tiers.forEach((tier, i) => {
      ip += i === 0 && mains.length ? mains.reduce((s, id) => s + midIP(id, ilvl), 0) / mains.length : tierMeanIP(tier, d.slot, ilvl);
    });
  }
  return Math.round((ip + effectIP(d)) * 1000) / 1000;
}

/** Değer hesabının girdisi: taban item (beklenen) ya da örnek (zarlarıyla). */
export type ValueSource = ItemDef | (Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown });

const isDef = (x: ValueSource): x is ItemDef => 'slot' in x && 'name' in x;

/** Altın değeri = goldPerIP x IP (yuvarlanır, en az minValue). Örnek verilirse zarlarıyla; taban verilirse beklenen. */
export const itemValue = (x: ValueSource): number => Math.max(ITEMS.budget.minValue, Math.round(ITEMS.budget.goldPerIP * (isDef(x) ? itemIP(x) : instanceIP(x))));

/**
 * Satış değeri = değer x sellRatio (items.json > budget.sellRatio; 0,5), yuvarlanır, en az 1. TEK KAYNAK: tüccarda satış, Endless ödül
 * kartındaki "Sell: N" ve seferin satışı hep bunu kullanır.
 */
export const sellValue = (x: ValueSource): number => Math.max(1, Math.round(itemValue(x) * ITEMS.budget.sellRatio));

// ------------------------------------------------------------ kuşanma kuralları

/** Sınıfın kullanabildiği silah aileleri (karar 2). */
export const classWeaponFamilies = (classId: string): string[] => ITEMS.weaponFamilies.filter((f) => f.classes.includes(classId)).map((f) => f.id);

/** Bu sınıf bu item'i takabilir mi? Ailesi olan item (silah, kalkan) yalnızca o aileyi kullanan sınıfa; diğerleri herkese. */
export function canEquip(classId: string, d: ItemDef): boolean {
  if (d.usableBy && !d.usableBy.includes(classId)) return false;
  if (!d.family) return true;
  return classWeaponFamilies(classId).includes(d.family);
}

/** Silahın tutuşu (silah değilse undefined; veride eksikse tek el). */
export const gripOf = (d: Pick<ItemDef, 'slot' | 'grip'>): Grip | undefined => (d.slot === 'weapon' ? (d.grip ?? 'one') : undefined);

/** Tutuşun okunur adı (Codex / ipucu). */
export const GRIP_NAME: Record<Grip, string> = { one: 'One-handed', two: 'Two-handed', bow: 'Bow (both hands)', charm: 'Charm (both hands)' };

/** Bu silah ikinci eli kapatır mı (çift el, yay, tılsım)? */
export const blocksOffhand = (d: Pick<ItemDef, 'slot' | 'grip'>): boolean => d.slot === 'weapon' && gripOf(d) !== 'one';

/** Bu item ikinci el yuvasına takılabilen bir silah mı (ailesi `offhand` olan tek el silah: hançer)? */
export const offhandWeapon = (d: Pick<ItemDef, 'slot' | 'grip' | 'family'>): boolean =>
  d.slot === 'weapon' && gripOf(d) === 'one' && !!ITEMS.weaponFamilies.find((f) => f.id === d.family)?.offhand;

/** Item bu yuvaya girer mi (kendi yuvası; tek el hançer ikinci ele de)? Sınıf kuralı ayrı: canEquip. */
export const fitsSlot = (d: Pick<ItemDef, 'slot' | 'grip' | 'family'>, slot: SlotId): boolean => d.slot === slot || (slot === 'offhand' && offhandWeapon(d));

/** Item'in girebildiği yuvalar (SLOT_IDS sırasıyla). */
export const slotsFor = (d: Pick<ItemDef, 'slot' | 'grip' | 'family'>): SlotId[] => SLOT_IDS.filter((k) => fitsSlot(d, k));

type EquipMap = Partial<Record<SlotId, ItemInstance | null | undefined>>;

/** Ana eldeki silah ikinci eli kapatıyor mu? Kapatıyorsa silahın tanımı, değilse undefined. */
export function offhandBlocker(equipment: EquipMap): ItemDef | undefined {
  const w = equipment.weapon;
  const d = w ? itemDef(w.id) : undefined;
  return d && blocksOffhand(d) ? d : undefined;
}

/** Sınıf ikinci el yuvasını hiç kullanabilir mi (kalkan ya da ikinci el silahı olan bir ailesi var mı)? */
export const classUsesOffhand = (classId: string): boolean => ITEMS.items.some((d) => (d.slot === 'offhand' || offhandWeapon(d)) && canEquip(classId, d));

/** İkinci el kapalıyken gösterilen mesaj. */
export const offhandBlockedMsg = (w: Pick<ItemDef, 'name' | 'slot' | 'grip'>): string =>
  `${w.name} is ${gripOf(w) === 'two' ? 'two-handed' : gripOf(w) === 'bow' ? 'a bow' : 'a charm'}: no hand free for an off-hand item`;

/**
 * Torbadan takılırken varsayılan yuva (tıklama / çift dokunma / "Equip"): kendi yuvası; tek el hançer ana el boşsa ana ele, ana elde tek el silah
 * varken ikinci el boşsa ikinci ele, yoksa ana elin yerine.
 */
export function defaultEquipSlot(equipment: EquipMap, d: ItemDef): SlotId {
  if (!offhandWeapon(d)) return d.slot;
  if (!equipment.weapon) return 'weapon';
  if (!equipment.offhand && !offhandBlocker(equipment)) return 'offhand';
  return 'weapon';
}

/** Takmanın sonucu (saf): yeni ekipman, yuvadan çıkan item (yer değiştirme) ve ayrıca torbaya dönecekler (çift elin kapattığı ikinci el). */
export interface EquipPlan {
  slot: SlotId;
  equipment: EquipMap;
  replaced: ItemInstance | null;
  displaced: ItemInstance[];
}

/** `inst`i `slot`a koyar (doğrulama yok): ana ele ikinci eli kapatan silah gelirse ikinci eldeki item çıkar. */
export function equipInto(equipment: EquipMap, inst: ItemInstance, slot: SlotId): EquipPlan {
  const d = itemDef(inst.id);
  const eq: EquipMap = { ...equipment, [slot]: inst };
  const displaced: ItemInstance[] = [];
  if (slot === 'weapon' && d && blocksOffhand(d) && equipment.offhand) {
    displaced.push(equipment.offhand);
    eq.offhand = null;
  }
  return { slot, equipment: eq, replaced: equipment[slot] ?? null, displaced };
}

/**
 * Takma planı + kurallar (sefer, Endless, Gear sürükle-bırak): sınıf / aile, yuva uyumu, ikinci el kapalı mı, kahraman başına 1 Legendary
 * (çıkacak item'ler sayılmaz). `slot` verilmezse defaultEquipSlot. Hata mesajı ya da plan. Torba yeri çağıranın işidir (displaced torbaya döner).
 */
export function planEquip(classId: string, equipment: EquipMap, inst: ItemInstance, slot?: SlotId): EquipPlan | { error: string } {
  const d = itemDef(inst.id);
  if (!d) return { error: `Unknown item: ${inst.id}` };
  if (!canEquip(classId, d)) return { error: d.usableBy && !d.usableBy.includes(classId) ? `${d.name} can only be used by ${d.usableBy.join(', ')}` : `${classId} cannot use ${d.family ?? d.slot}` };
  const at = slot ?? defaultEquipSlot(equipment, d);
  if (!fitsSlot(d, at)) return { error: `${d.name} does not go in the ${slotDef(at)?.name ?? at} slot` };
  if (at === 'offhand') {
    const w = offhandBlocker(equipment);
    if (w) return { error: offhandBlockedMsg(w) };
  }
  const plan = equipInto(equipment, inst, at);
  const legend = SLOT_IDS.filter((k) => {
    const x = plan.equipment[k];
    return !!x && itemDef(x.id)?.rarity === 'legendary';
  });
  if (legend.length > 1) return { error: LEGENDARY_LIMIT_MSG };
  return plan;
}

export const isPlanError = (p: EquipPlan | { error: string }): p is { error: string } => 'error' in p;

/**
 * Kahraman başına en fazla 1 Legendary (madde 296): `d` `slot`a (varsayılan: torbadan takılırken gideceği yuva) takılırsa BAŞKA bir yuvada
 * Legendary kalıyor mu? (Aynı yuvadaki Legendary'nin yerine geçmek serbest; çift elin kapattığı ikinci el de çıkacağı için sayılmaz.)
 */
export function legendaryConflict(equipment: EquipMap, d: ItemDef, slot: SlotId = defaultEquipSlot(equipment, d)): string | null {
  if (d.rarity !== 'legendary') return null;
  for (const k of SLOT_IDS) {
    if (k === slot) continue;
    if (k === 'offhand' && slot === 'weapon' && blocksOffhand(d)) continue;
    const inst = equipment[k];
    if (inst && itemDef(inst.id)?.rarity === 'legendary') return LEGENDARY_LIMIT_MSG;
  }
  return null;
}

/**
 * Kayıt taşıma (2026-10-12, ikinci el yuvası): eski kayıtta silah yuvasındaki kalkan ikinci ele geçer (ikinci el doluysa oradaki item
 * `overflow`a eklenir, çağıran torbaya koyar). Ekipmanı yerinde değiştirir; taşınan item sayısı. Her okumada çalışabilir (idempotent).
 */
export function migrateOffhand(equipment: EquipMap | null | undefined, overflow?: ItemInstance[]): number {
  if (!equipment || typeof equipment !== 'object') return 0;
  const w = equipment.weapon;
  const d = w && typeof w === 'object' && typeof w.id === 'string' ? itemDef(w.id) : undefined;
  if (!w || !d || d.slot !== 'offhand') return 0;
  if (equipment.offhand && overflow) overflow.push(equipment.offhand);
  equipment.offhand = w;
  equipment.weapon = null;
  return 1;
}

// ------------------------------------------------------------ doğrulama

const TARGET_RE = /^(mod|mult|fx|elem|attr|prog):[\w*]+$/;

/** items.json doğrulaması (boş liste = geçerli). Test: tests/items-data.test.ts. */
export function validateItems(data: ItemsData = ITEMS): string[] {
  const errors: string[] = [];
  const slotIds = data.slots.map((s) => s.id);
  if (slotIds.join() !== SLOT_IDS.join()) errors.push(`slots must be ${SLOT_IDS.join(', ')}`);
  for (const s of data.slots) if (!(s.weight > 0) || !s.name) errors.push(`slot ${s.id}: bad weight/name`);
  if (data.rarities.map((r) => r.id).join() !== RARITY_IDS.join()) errors.push(`rarities must be ${RARITY_IDS.join(', ')}`);
  data.rarities.forEach((r, i) => {
    if (!/^#[0-9a-f]{6}$/i.test(r.color)) errors.push(`rarity ${r.id}: bad color`);
    if (!Array.isArray(r.tiers) || r.tiers.some((t) => !(TIER_IDS as readonly string[]).includes(t))) errors.push(`rarity ${r.id}: tiers must be C/B/A`);
    else if (r.tiers.length !== Math.min(i + 1, 4) || r.tiers[0] !== 'C') errors.push(`rarity ${r.id}: one more affix per rarity, the first is C`);
  });
  if (!(data.rolls?.spread >= 0 && data.rolls.spread < 0.5)) errors.push('rolls.spread must be in [0, 0.5)');
  if (!(data.affixRules?.power > 0)) errors.push('affixRules.power must be positive');
  for (const [id, a] of Object.entries(data.affixDefs ?? {})) {
    const at = `affix ${id}`;
    if (!(TIER_IDS as readonly string[]).includes(a.tier)) errors.push(`${at}: bad tier`);
    if (!id.startsWith(a.tier.toLowerCase() + '_')) errors.push(`${at}: id must start with its tier (${a.tier.toLowerCase()}_)`);
    if (!a.name || !a.text) errors.push(`${at}: needs name and text`);
    if (!a.parts?.length) errors.push(`${at}: needs parts`);
    a.parts?.forEach((p, i) => {
      if (!(p.step > 0) || !(p.ip >= 0) || !(p.base >= 0) || !(p.perIlvl >= 0)) errors.push(`${at}: part ${i} needs base, perIlvl, step and ip`);
      if (!TARGET_RE.test(p.to)) errors.push(`${at}: part ${i} has a bad target ${p.to}`);
      if (p.to.startsWith('elem:') && p.to !== 'elem:*' && !(ELEMENTS as readonly string[]).includes(p.to.slice(5))) errors.push(`${at}: unknown element ${p.to}`);
    });
    if (a.slots) for (const s of a.slots) if (!slotIds.includes(s)) errors.push(`${at}: unknown slot ${s}`);
    if (a.choices) for (const c of a.choices) if (!statusDefs[c]) errors.push(`${at}: unknown status ${c}`);
    if (a.text.includes('{x}') && !a.choices?.length) errors.push(`${at}: {x} needs choices`);
    if (a.parts?.length && !a.parts[0]!.fixed && !a.text.includes('{0}')) errors.push(`${at}: text must show its value ({0})`);
  }
  for (const t of TIER_IDS) for (const s of SLOT_IDS) if (!tierPool(t, s).length) errors.push(`tier ${t}: no affix allowed on ${s}`);
  if (!Number.isInteger(data.bag) || data.bag <= 0) errors.push('bag: must be a positive integer');
  // Silah aileleri: sınıflar var olmalı, her oynanabilir sınıfın en az bir ailesi olmalı; ana affix'ler C kademesinde
  const famIds = data.weaponFamilies.map((f) => f.id);
  if (new Set(famIds).size !== famIds.length) errors.push('weaponFamilies: duplicate ids');
  for (const f of data.weaponFamilies) for (const c of f.classes) if (!classes[c]) errors.push(`family ${f.id}: unknown class ${c}`);
  for (const f of data.weaponFamilies) {
    if (!f.mains?.length) errors.push(`family ${f.id}: needs main affixes`);
    for (const m of f.mains ?? []) if (data.affixDefs[m]?.tier !== 'C' || !affixElement(m)) errors.push(`family ${f.id}: main ${m} must be a C damage affix`);
  }
  for (const [id, e] of Object.entries(data.effects ?? {})) if (!e.name || !e.text || !(e.ip > 0) || !e.hook) errors.push(`effect ${id}: needs name, text, ip and hook`);
  for (const c of randomPool) if (!data.weaponFamilies.some((f) => f.classes.includes(c))) errors.push(`class ${c} has no weapon family`);
  // Item'ler
  const ids = data.items.map((d) => d.id);
  if (new Set(ids).size !== ids.length) errors.push('items: duplicate ids');
  const legFx = data.items.filter((d) => d.rarity === 'legendary').map((d) => d.effect);
  if (new Set(legFx).size !== legFx.length) errors.push('items: a Legendary effect is unique to one item');
  for (const d of data.items) {
    const at = `item ${d.id}`;
    if (!d.name) errors.push(`${at}: no name`);
    if (!slotIds.includes(d.slot)) errors.push(`${at}: unknown slot ${d.slot}`);
    if (!(RARITY_IDS as readonly string[]).includes(d.rarity)) errors.push(`${at}: unknown rarity ${d.rarity}`);
    if (!Number.isInteger(d.ilvl) || d.ilvl < 1) errors.push(`${at}: ilvl must be a positive integer`);
    if (d.slot === 'weapon' && !famIds.includes(d.family ?? '')) errors.push(`${at}: weapon needs a known family`);
    if (d.slot === 'offhand' && !famIds.includes(d.family ?? '')) errors.push(`${at}: an off-hand item (shield) needs a known family`);
    if (d.slot !== 'weapon' && d.slot !== 'offhand' && d.family !== undefined) errors.push(`${at}: only weapons and shields have a family`);
    if (d.slot === 'weapon' && !(GRIP_IDS as readonly string[]).includes(d.grip ?? '')) errors.push(`${at}: weapon needs a grip (${GRIP_IDS.join(' | ')})`);
    if (d.slot !== 'weapon' && d.grip !== undefined) errors.push(`${at}: only weapons have a grip`);
    if (d.rarity === 'legendary') {
      if (!d.effect || !data.effects?.[d.effect]) errors.push(`${at}: a Legendary needs its unique effect`);
      const tiers = data.rarities.find((r) => r.id === 'legendary')?.tiers ?? [];
      if (!d.affixes || d.affixes.length !== tiers.length) errors.push(`${at}: a Legendary lists exactly ${tiers.length} affixes`);
      else
        d.affixes.forEach((id, i) => {
          const a = data.affixDefs[id];
          if (!a) errors.push(`${at}: unknown affix ${id}`);
          else if (a.tier !== tiers[i]) errors.push(`${at}: affix ${i + 1} must be tier ${tiers[i]}`);
          else if (a.slots && !a.slots.includes(d.slot)) errors.push(`${at}: affix ${id} is not allowed on ${d.slot}`);
        });
      if (d.affixes && new Set(d.affixes).size !== d.affixes.length) errors.push(`${at}: duplicate affix`);
    } else {
      if (d.effect !== undefined) errors.push(`${at}: only Legendary items carry an effect`);
      if (d.affixes !== undefined) errors.push(`${at}: only Legendary items list fixed affixes`);
      if (!d.family) {
        const m = d.main ? data.affixDefs[d.main] : undefined;
        if (!m || m.tier !== 'C') errors.push(`${at}: needs a C main affix`);
        else if (m.slots && !m.slots.includes(d.slot)) errors.push(`${at}: main ${d.main} is not allowed on ${d.slot}`);
      } else if (d.main !== undefined) errors.push(`${at}: a weapon's / shield's main affix comes from its family`);
    }
    if (d.usableBy) for (const c of d.usableBy) if (!classes[c]) errors.push(`${at}: usableBy has unknown class ${c}`);
    if (d.minChapter !== undefined && (!Number.isInteger(d.minChapter) || d.minChapter < 1)) errors.push(`${at}: bad minChapter`);
  }
  return errors;
}

// ------------------------------------------------------------ kayıt göçleri

/** Eski x2 ölçek göçünün statları (yalnızca eski stat haritalı zarlarda anlamlı; 2026-10-11'den beri affix göçü bunları en yakın biçime çevirir). */
export const SCALED_ITEM_STATS: readonly string[] = ['str', 'dex', 'int', 'luck', 'armor', 'magicArmor', 'spd'];

/**
 * Eski (x1 ölçekli) kayıttaki stat haritalı zarları x2 ölçeğe taşır (yerinde; sürüm zinciri için korunur). Yeni biçimli zarlara dokunmaz.
 * Taşınan örnek sayısını döndürür.
 */
export function migrateRollsX2(root: unknown): number {
  let n = 0;
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) {
      for (const x of o) walk(x);
      return;
    }
    if (!o || typeof o !== 'object') return;
    const rec = o as Record<string, unknown>;
    if (typeof rec.uid === 'string' && typeof rec.id === 'string' && rec.rolls && typeof rec.rolls === 'object' && !isItemRoll(rec.rolls)) {
      const rolls = rec.rolls as Record<string, unknown>;
      let touched = false;
      for (const k of SCALED_ITEM_STATS) {
        const v = rolls[k];
        if (typeof v === 'number' && Number.isFinite(v)) {
          rolls[k] = v * 2;
          touched = true;
        }
      }
      if (touched) n++;
    }
    for (const v of Object.values(rec)) walk(v);
  };
  walk(root);
  return n;
}

/**
 * Affix göçü (Ömer onayı 2026-10-11): kayıt ağacındaki her item örneğinin (uid + id) ve teklif / tezgâh / nadir düşüş kaydının (itemId + rolls)
 * eski zarlarını en yakın yeni biçime çevirir (yerinde; `legacyRoll`). Kahraman nesnesinde (class + equipment) takılı silahın ana affix'i
 * kahramanın elementinden seçilir. Bilinmeyen item'lere dokunmaz. Çevrilen kayıt sayısını döndürür. Sefer ve Endless kaydı kullanır.
 */
export function migrateItemRolls(root: unknown): number {
  let n = 0;
  const fix = (rec: Record<string, unknown>, id: string, uid: string, cls?: string): void => {
    const d = itemDef(id);
    if (!d || isItemRoll(rec.rolls)) return;
    rec.rolls = legacyRoll(d, rec.rolls, uid, cls);
    n++;
  };
  const walk = (o: unknown, cls?: string): void => {
    if (Array.isArray(o)) {
      for (const x of o) walk(x, cls);
      return;
    }
    if (!o || typeof o !== 'object') return;
    const rec = o as Record<string, unknown>;
    if (typeof rec.uid === 'string' && typeof rec.id === 'string' && itemDef(rec.id)) fix(rec, rec.id, rec.uid, cls);
    else if (typeof rec.itemId === 'string' && 'rolls' in rec) fix(rec, rec.itemId, `offer|${rec.itemId}|${typeof rec.heroId === 'string' ? rec.heroId : ''}`);
    // Sefer Spoils kartı: left (id listesi) + leftRolls (aynı sırada zarlar)
    if (Array.isArray(rec.left) && Array.isArray(rec.leftRolls)) {
      rec.leftRolls = (rec.left as unknown[]).map((id, i) => {
        const r = (rec.leftRolls as unknown[])[i];
        const d = typeof id === 'string' ? itemDef(id) : undefined;
        if (!d || isItemRoll(r)) return r;
        n++;
        return legacyRoll(d, r, `left|${id}|${i}`);
      });
    }
    const heroClass = typeof rec.class === 'string' && rec.equipment && typeof rec.equipment === 'object' ? rec.class : undefined;
    for (const [k, v] of Object.entries(rec)) walk(v, k === 'equipment' ? heroClass : undefined);
  };
  walk(root);
  return n;
}

/** Tüm Legendary id'leri (katalog sırasıyla). */
export const legendaryIds = (): string[] => ITEMS.items.filter((d) => d.rarity === 'legendary').map((d) => d.id);

/** ?legendary=1 önizlemesi açık mı (Gear / Endless torbasına tüm Legendary'ler; madde 296). Tarayıcı dışında false. */
export const legendaryPreviewWanted = (search: string = typeof location !== 'undefined' ? location.search : ''): boolean => new URLSearchParams(search).has('legendary');
