// Item verisi ve kuralları (saf TypeScript; Phaser/DOM yok). Tasarım: docs/design/progression/items.md (affix kademeleri: 1.3b, Ömer onayı 2026-10-11).
// Katalog = taban item'ler; nadirlik = affix sayısı (C / C,C / C,C,B / C,C,B,A / Legendary C,C,B,A + etki); affix değeri yalnızca item seviyesiyle büyür.
import itemsJson from '../../data/items.json';
import { classes, randomPool, statuses as statusDefs } from '../engine/content';
import { affixFit, classElements } from './affix-fit';
import { Rng } from '../engine/rng';
import { STACK_FORM } from '../engine/tree-hooks';
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

/** Elementler (affix hedefi `elem:<element>`; `elem:*` = fiziksel dışı tümü). */
export const ELEMENTS: readonly Element[] = ['physical', 'fire', 'ice', 'holy', 'dark', 'nature', 'arcane', 'lightning'];
export const MAGIC_ELEMENTS: readonly Element[] = ['fire', 'ice', 'holy', 'dark', 'nature', 'arcane', 'lightning'];

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
  /** fx alanı ham çarpan biçiminde (Π(1 + değer); tierDamageMult). */
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
  /** Equip best sınıf uyumu ipucu: element:<x> | element:magic | mp | shield | dot | debuff | support | summon | melee | ranged. */
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
  /** Ailenin varsayılan silah tipi (Ömer 2026-10-27; taban `type` alanı ezer: Axes & Swords ailesinde kılıçlar `type: sword`). */
  type?: WeaponType;
}

/** Silah tipi (Ömer 2026-10-27, open-questions 443): örtük stat ve güç / hız profili tipe göre. */
export const WEAPON_TYPES = ['sword', 'axe', 'mace', 'hammer', 'dagger', 'bow', 'staff', 'charm'] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

/** Tipin güç / hız profili (items.json > weaponTypes). */
export interface WeaponTypeDef {
  name: string;
  /** Silah gücü çarpanı (yoksa 1). */
  power?: number;
  /** Hız cezası, yüzde (5 = "5% less Speed" = ×0,95; mult:spdMult gibi çarpılır, kişisel hız zarından ÖNCE). */
  spdLess?: number;
}

/** Çift el YAKIN DÖVÜŞ (items.json > twoHandMelee): grip two + types listesindeki tip (asa / yay değil). */
export interface TwoHandMeleeDef {
  /** Ek hız cezası satırının adı ("Heavy grip"). */
  name: string;
  types: WeaponType[];
  /** Güç çarpanı (grip.two ile çarpılır: 1,45 x 1,15). */
  power: number;
  /** Ek hız cezası, yüzde. */
  spdLess: number;
}

/** Silah taban gücü kuralları (items.json > weaponPower). */
export interface WeaponPowerRules {
  base: number;
  perIlvl: number;
  step: number;
  /** Tutuş çarpanı (tek el 1; çift el / yay ~1,35; tılsım arada). */
  grip: Record<Grip, number>;
  /** İkinci eldeki silahın (hançer) gücünün sayılan oranı. */
  offhandShare: number;
  /** 1 güç puanının Item Points değeri. */
  ip: number;
  /** 1 % hız cezasının Item Points değeri (tip / Heavy grip cezası IP'den düşülür). */
  spdIp?: number;
}

/** Taban örtük statı (zarsız; affix gibi parçalı, kademesiz). */
export interface ImplicitDef {
  name: string;
  text: string;
  icon?: string;
  desc?: string;
  parts: AffixPart[];
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
  /** Silah tipi (Ömer 2026-10-27); yoksa ailesinin `type`ı. Yalnızca ailenin tipinden farklıysa yazılır (Arming Sword: sword). */
  type?: WeaponType;
  /** Varsayılan nadirlik (örnek kendi nadirliğini taşır: ItemRoll.rarity). Legendary taban yalnızca Legendary olur. */
  rarity: RarityId;
  ilvl: number;
  /** Ana (ilk) C affix'i; silahta yok (aile listesinden). */
  main?: string;
  /** Legendary: dört sabit affix (C, C, B, A). */
  affixes?: string[];
  /** Legendary: sabit affix'lerden birinin değer çarpanı (affix id -> çarpan, 1-3; Ömer 2026-10-12, zayıf Legendary'lerin en zayıf statı). */
  boost?: Record<string, number>;
  /** İsteğe bağlı ikon adı (src/game/item-icons.ts > ITEM_ICONS); yoksa silah ailesinin / yuvanın ikonu. */
  icon?: string;
  /** Legendary etkisi (items.json > effects). */
  effect?: string;
  /** Yalnızca bu sınıflar takabilir (Legendary "Usable by"; silah ailesine ek kısıt). */
  usableBy?: string[];
  /** Bu bölümden önce ortaya çıkmaz (Legendary; Valdoria = 1). */
  minChapter?: number;
  /** Yalnızca olaydan gelir (Clapper of the Sunken Bell, dr19): nadir düşüş ve Endless Legendary havuzunda yok (rare.ts > legendaryPool). */
  eventOnly?: boolean;
  /** Legendary hikâye satırı (İngilizce, italik). */
  flavor?: string;
  /**
   * Taban başına sabit örtük değer (parça sırasıyla; Ömer 2026-10-18: kalkanın taban blok şansı %15-20, item seviyesiyle DEĞİŞMEZ). Verilirse
   * örtük parçanın `base + perIlvl x ilvl` değerinin yerine geçer (zarsız; kayda yazılmaz, veriden okunur).
   */
  implicitBase?: number[];
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
  caps: { crit: number; accuracy: number; evasion: number; spd: number; mpCost?: number; resist?: number; recovery?: number; aAffixCopies?: number; block?: number };
  weaponFamilies: WeaponFamilyDef[];
  /** Silah taban gücü (Item Güçlendirme x1-x3, Ömer 2026-10-17; items.md 1.12). */
  weaponPower: WeaponPowerRules;
  /** Silah tiplerinin güç / hız profili (Ömer 2026-10-27). */
  weaponTypes: Record<WeaponType, WeaponTypeDef>;
  /** Çift el yakın dövüş kuralı (Ömer 2026-10-27). */
  twoHandMelee?: TwoHandMeleeDef;
  /** Taban örtük statları: silah TİPİ (sword, axe...; Ömer 2026-10-27) ya da 'shield' (ikinci el kalkanı) -> zarsız stat (x3, x4). */
  implicits: Record<string, ImplicitDef>;
  /** Takma seviye şartı = max(min, ilvl - offset) (x6). */
  levelReq: { offset: number; min: number };
  /** Sınıf başına başlangıç silahı (x5): katalog id'si, örnek seviyesi `ilvl`. */
  starterWeapons: { ilvl: number; classes: Record<string, string> };
  /** Sınıf başına başlangıç ikinci el item'i (Ömer 2026-10-23): kalkan ya da ikinci el silahı; örnek seviyesi starterWeapons.ilvl. Yoksa boş. */
  starterOffhands?: { classes: Record<string, string> };
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
  /** Sefer item düşüşü çarpanı (Ömer 2026-10-18, TUR 1 madde 8: 0,65); beklenen sayıya çarpılır, minItems aynen. Yoksa 1. */
  dropMult?: number;
  /** Kaynağın her item'inin nadirlik tabanı (TUR 1 madde 8: elit en az Uncommon, boss en az Rare). */
  rarityFloor?: Partial<Record<LootKind, RarityId>>;
  /** Taban seçiminde tutuş ağırlığı (Ömer 2026-10-19: çift el az düşüyordu); yoksa / yazılmayan tutuş = 1 (eşit seçim). */
  gripWeight?: Partial<Record<Grip, number>>;
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
  /** Demircide kaç kez Reforge edildi (sefer; TUR 1 madde 7: her tekrarda fiyat artar). Yoksa 0. */
  reforges?: number;
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
export function partValue(p: AffixPart, ilvl: number, q: number, mult = 1): number {
  const mid = partMid(p, ilvl) * mult;
  if (p.fixed || p.noRoll || p.floor) return Math.max(p.step, snap(mid, p.step));
  const qq = Math.min(1, Math.max(0, Number.isFinite(q) ? q : 0.5));
  return Math.max(p.step, snap(mid * (1 + ITEMS.rolls.spread * (2 * qq - 1)), p.step));
}

/** Parçanın görünür aralığı [en az, en çok] (zarsızda iki uç aynı). */
export const partRange = (p: AffixPart, ilvl: number, floor = 0, mult = 1): [number, number] => [partValue(p, ilvl, floor, mult), partValue(p, ilvl, 1, mult)];

/** Legendary'nin sabit affix çarpanı (items.json > items[].boost; yoksa 1). */
export const affixBoost = (d: Pick<ItemDef, 'rarity' | 'boost'> | undefined, id: string): number => (d?.rarity === 'legendary' ? (d.boost?.[id] ?? 1) : 1);

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

/** Bu affix bu yuvada RASTGELE çekilebilir mi (yuva kimliği, Ömer 2026-10-13 itemfix: her stat 2-3 yuvada; items.json > affixDefs[].slots). */
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

/** Taban item'in ana affix adayları: `main` varsa o (kalkanlar: Armor; itemfix 2026-10-13), yoksa silahta ailenin listesi. */
export function mainCandidates(d: ItemDef): string[] {
  if (d.main) return [d.main];
  if (d.family) return ITEMS.weaponFamilies.find((f) => f.id === d.family)?.mains ?? ['c_phys'];
  return [];
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
    const m = affixBoost(d, a.id);
    const ranges = def.parts.map((p): [number, number] => {
      const [lo, hi] = partRange(p, ilvl, floor, m);
      return [Math.min(lo, partValue(p, ilvl, a.q, m)), hi];
    });
    out.push({ id: a.id, def, tier: def.tier, values: def.parts.map((p) => partValue(p, ilvl, a.q, m)), ranges, ...(a.x ? { x: a.x } : {}) });
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
  const ip = rolledAffixes(inst).reduce((s, a) => s + affixIP(a.id, a.values), 0) + effectIP(d) + baseIP(d, instanceIlvl(inst));
  return Math.round(ip * 1000) / 1000;
};

/** Bir affix'in seviyedeki ORTA IP'si. */
const midIP = (id: string, ilvl: number, mult = 1): number => {
  const a = affixDef(id);
  return a ? a.parts.reduce((s, p) => s + partValue(p, ilvl, 0.5, mult) * p.ip, 0) : 0;
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
  if (r === 'legendary' && d.affixes?.length) ip = d.affixes.reduce((s, id) => s + midIP(id, ilvl, affixBoost(d, id)), 0);
  else {
    const mains = mainCandidates(d).filter((id) => affixDef(id));
    rarityDef(r).tiers.forEach((tier, i) => {
      ip += i === 0 && mains.length ? mains.reduce((s, id) => s + midIP(id, ilvl), 0) / mains.length : tierMeanIP(tier, d.slot, ilvl);
    });
  }
  return Math.round((ip + effectIP(d) + baseIP(d, ilvl)) * 1000) / 1000;
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

// ------------------------------------------------------------ taban gücü, örtük stat, seviye şartı (Item Güçlendirme, Ömer 2026-10-17)

/** Tipi çözmek için gereken taban alanları. */
type TypeSrc = Pick<ItemDef, 'slot' | 'grip' | 'family' | 'type'>;

/** Silahın tipi (Ömer 2026-10-27): tabanın `type`ı, yoksa ailesinin `type`ı. Silah değilse undefined. */
export function weaponTypeOf(d: Partial<TypeSrc>): WeaponType | undefined {
  if (d.slot !== 'weapon') return undefined;
  return d.type ?? ITEMS.weaponFamilies.find((f) => f.id === d.family)?.type;
}

/** Tipin güç / hız profili (yoksa undefined). */
export const weaponTypeDef = (t: WeaponType | undefined): WeaponTypeDef | undefined => (t ? ITEMS.weaponTypes?.[t] : undefined);

/** Çift el YAKIN DÖVÜŞ silahı mı (grip two + twoHandMelee.types; asa ve yay değil)? */
export function isTwoHandMelee(d: Partial<TypeSrc>): boolean {
  const t = weaponTypeOf(d);
  return d.slot === 'weapon' && (d.grip ?? 'one') === 'two' && !!t && !!ITEMS.twoHandMelee?.types.includes(t);
}

/** Çift el yakın dövüşün örtük çarpanı: grip.two x twoHandMelee.power (1,45 x 1,15 = 1,6675); değilse 1. */
export function implicitGripMult(d: Partial<TypeSrc>): number {
  return isTwoHandMelee(d) ? (ITEMS.weaponPower?.grip.two ?? 1) * (ITEMS.twoHandMelee?.power ?? 1) : 1;
}

/** Silahın hız cezaları, sırayla (tip profili, sonra Heavy grip): yüzde değerler (5 = "5% less Speed"). Yoksa boş. */
export function weaponSpeedPenalties(d: Partial<TypeSrc>): Array<{ name: string; pct: number; heavy?: true }> {
  const out: Array<{ name: string; pct: number; heavy?: true }> = [];
  const td = weaponTypeDef(weaponTypeOf(d));
  if (td?.spdLess) out.push({ name: td.name, pct: td.spdLess });
  if (isTwoHandMelee(d) && ITEMS.twoHandMelee?.spdLess) out.push({ name: ITEMS.twoHandMelee.name, pct: ITEMS.twoHandMelee.spdLess, heavy: true });
  return out;
}

/** Silahın taban gücü (x1-x3): (base + perIlvl x ilvl) x tutuş x tip (x çift el yakın dövüş), adıma yuvarlanır. Silah değilse 0. */
export function weaponPowerOf(d: TypeSrc, ilvl: number): number {
  if (d.slot !== 'weapon') return 0;
  const w = ITEMS.weaponPower;
  if (!w) return 0;
  const melee2 = isTwoHandMelee(d) ? (ITEMS.twoHandMelee?.power ?? 1) : 1;
  const raw = (w.base + w.perIlvl * Math.max(1, ilvl)) * (w.grip[gripOf(d) ?? 'one'] ?? 1) * (weaponTypeDef(weaponTypeOf(d))?.power ?? 1) * melee2;
  return Math.max(0, snap(raw, w.step || 1));
}

/** Örneğin silah gücü (örnek seviyesiyle). Bilinmeyen / silah değil: 0. */
export const instanceWeaponPower = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): number => {
  const d = itemDef(inst.id);
  return d ? weaponPowerOf(d, instanceIlvl(inst)) : 0;
};

/** Tabanın örtük statı (x3, x4): kalkan (ikinci el yuvası) -> 'shield', silah -> TİPİNİN örtüğü (Ömer 2026-10-27). Yoksa undefined. */
export function implicitDefOf(d: Partial<TypeSrc>): ImplicitDef | undefined {
  const key = d.slot === 'offhand' ? 'shield' : weaponTypeOf(d);
  return key ? ITEMS.implicits?.[key] : undefined;
}

/**
 * Örtük statın seviyedeki değerleri (parça sırasıyla; zarsız). `d`: tabanın sabit örtük değeri (`implicitBase`) varsa o; çift el yakın dövüşte
 * değer aynı tipin tek el değeri x implicitGripMult (Ömer 2026-10-27; yuvarlama çarpımdan sonra).
 */
export const implicitValues = (imp: ImplicitDef, ilvl: number, d?: Partial<TypeSrc & Pick<ItemDef, 'implicitBase'>>): number[] => {
  const mult = d ? implicitGripMult(d) : 1;
  return imp.parts.map((p, i) => {
    const fixed = d?.implicitBase?.[i];
    return typeof fixed === 'number' ? Math.max(p.step, snap(fixed, p.step)) : partValue(p, ilvl, 0.5, mult);
  });
};

/**
 * Kalkanın TABAN blok şansı, yüzde (Ömer 2026-10-18; ör. 18 = %18): örtük parçası `fx:blockChance` olan tabanda (kalkan) `implicitBase` ya da
 * parçanın değeri; item seviyesiyle değişmez. Kalkan değilse 0. Affix (c_block) HARİÇ; toplam blok `loadout().itemEffects.blockChance` (oran).
 */
export function baseBlockChance(d: Partial<TypeSrc> & Pick<ItemDef, 'implicitBase'>, ilvl = 1): number {
  const imp = implicitDefOf(d);
  const i = imp ? imp.parts.findIndex((p) => p.to === 'fx:blockChance') : -1;
  return imp && i >= 0 ? (implicitValues(imp, ilvl, d)[i] ?? 0) : 0;
}

/** Örneğin taban blok şansı (yüzde; bilinmeyen / kalkan değil: 0). */
export const instanceBaseBlockChance = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): number => {
  const d = itemDef(inst.id);
  return d ? baseBlockChance(d, instanceIlvl(inst)) : 0;
};

/** Taban değerinin Item Points'i: silah gücü x ip (+ örtük stat, - hız cezaları). `share`: ikinci eldeki silahın sayılan oranı (Equip best). */
export function baseIP(d: TypeSrc & Pick<ItemDef, 'implicitBase'>, ilvl: number, share = 1): number {
  let ip = weaponPowerOf(d, ilvl) * (ITEMS.weaponPower?.ip ?? 0) * share;
  const imp = implicitDefOf(d);
  if (imp) implicitValues(imp, ilvl, d).forEach((v, i) => (ip += v * (imp.parts[i]?.ip ?? 0)));
  for (const s of weaponSpeedPenalties(d)) ip -= s.pct * (ITEMS.weaponPower?.spdIp ?? 0);
  return Math.round(ip * 1000) / 1000;
}

/** Takma seviye şartı (x6): max(min, ilvl - offset). Item Level 12 -> Level 9. */
export const levelRequirement = (ilvl: number): number => Math.max(ITEMS.levelReq?.min ?? 1, Math.round(ilvl) - (ITEMS.levelReq?.offset ?? 0));

/** Örneğin seviye şartı (örnek seviyesinden). */
export const instanceLevelReq = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): number => levelRequirement(instanceIlvl(inst));

/** Kahraman (seviyesi yoksa 1) bu örneği seviyece takabilir mi? */
export const meetsLevel = (level: number | undefined, inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): boolean => (level ?? 1) >= instanceLevelReq(inst);

/** Seviye şartı hata mesajı (Gear, sürükle-bırak; ipucunda kırmızı satır). */
export const levelReqMsg = (req: number): string => `Requires Level ${req}`;

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

/**
 * Ana el boşken ikinci eldeki silah (hançer) ana ele geçer (Ömer 2026-10-14: silah ana el boşken ikinci elde durmaz). Ana el çıkarılınca ve
 * kayıt okunurken çalışır; ekipmanı yerinde değiştirir (ikinci el null olur). Taşındıysa true.
 */
export function promoteOffhand(equipment: EquipMap | null | undefined): boolean {
  if (!equipment || equipment.weapon) return false;
  const o = equipment.offhand;
  const d = o && typeof o === 'object' && typeof o.id === 'string' ? itemDef(o.id) : undefined;
  if (!o || !d || !offhandWeapon(d)) return false;
  equipment.weapon = o;
  equipment.offhand = null;
  return true;
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
 * Takma planı + kurallar (sefer, Endless, Gear sürükle-bırak): seviye şartı (`o.level`; verilmezse denetlenmez), sınıf / aile, yuva uyumu, ikinci el kapalı
 * mı, kahraman başına 1 Legendary (çıkacak item'ler sayılmaz). `slot` verilmezse defaultEquipSlot. Hata mesajı ya da plan. Torba yeri çağıranın işidir (displaced torbaya döner).
 */
export function planEquip(classId: string, equipment: EquipMap, inst: ItemInstance, slot?: SlotId, o: { level?: number } = {}): EquipPlan | { error: string } {
  const d = itemDef(inst.id);
  if (!d) return { error: `Unknown item: ${inst.id}` };
  // Seviye şartı (x6, Ömer 2026-10-17): kahramanın seviyesi item seviyesi - 3'ten düşükse takılamaz (sefer / Endless / arayüz seviyeyi HEP verir;
  // verilmezse yalnızca kural testi: denetlenmez)
  if (o.level !== undefined && !meetsLevel(o.level, inst)) return { error: levelReqMsg(instanceLevelReq(inst)) };
  if (!canEquip(classId, d)) return { error: d.usableBy && !d.usableBy.includes(classId) ? `${d.name} can only be used by ${d.usableBy.join(', ')}` : `${classId} cannot use ${d.family ?? d.slot}` };
  // Ana el boşken silah ikinci ele girmez (Ömer 2026-10-14): ikinci ele bırakılan / "Off-hand" ile takılan hançer de ana ele gider
  const at = slot === 'offhand' && offhandWeapon(d) && !equipment.weapon ? 'weapon' : (slot ?? defaultEquipSlot(equipment, d));
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

/**
 * Kayıt taşıma (Ömer 2026-10-28, silah aileleri değişince; örn. war_maul maces -> hammers, Warrior artık kullanamaz): kahramanın sınıfının
 * artık takamadığı her item (ikinci el dahil; canEquip) yuvadan çıkar ve `overflow`a eklenir, çağıran torbaya koyar (torba sınırı aşılabilir,
 * migrateOffhand ile aynı kural: kayıt okunurken item kaybolmaz). Tanımı olmayan item'e dokunmaz. Yuva null olur; boşalan yuvalar döner.
 * Başlangıç silahı verilmez (silahsız kalan kahraman normal "silahsız" kurallarıyla savaşır). Her okumada çalışabilir (idempotent).
 */
export function stripUnusable(classId: string, equipment: EquipMap | null | undefined, overflow: ItemInstance[]): SlotId[] {
  const out: SlotId[] = [];
  if (!equipment || typeof equipment !== 'object' || typeof classId !== 'string') return out;
  for (const k of SLOT_IDS) {
    const inst = equipment[k];
    const d = inst && typeof inst === 'object' && typeof inst.id === 'string' ? itemDef(inst.id) : undefined;
    if (!inst || !d || canEquip(classId, d)) continue;
    overflow.push(inst);
    equipment[k] = null;
    out.push(k);
  }
  return out;
}

// ------------------------------------------------------------ doğrulama

const TARGET_RE = /^(mod|mult|fx|elem|res|attr|prog):[\w*]+$/;

/**
 * Bonus yazım kuralı (Ömer 2026-10-27; src/engine/bonus-text.ts): affix parçasının hedefi motorda nasıl birleşir?
 * 'add' = toplamsal havuz (UnitModifiers *Add) ya da çarpan olmayan değer (şans, oran, düz sayı): yazıda "{0}" ("+5% Crit chance").
 * 'more' = ayrı çarpan x(1 + değer): yazıda "{m0}" ("×1.05 Fire damage"). 'less' = ayrı çarpan x(1 - değer): yazıda "{l0}" ("×0.95 damage taken").
 * Kaynak: stats.ts (elemDamageMult, spdMult, hpMult, mpMult), battle.ts (dealtDamageMult, damageTakenMult, rage kazancı, çağrı gücü), cost.ts (MP bedeli).
 */
export type BonusForm = 'add' | 'more' | 'less';
// Yazı biçimi ile motordaki birleşme TEK tablodan (tree-hooks.ts > STACK_FORM; 2026-10-27: "×" yazılanlar çarpılarak birleşir, loadout.ts)
export function partBonusForm(to: string): BonusForm {
  const [kind, key = ''] = to.split(':');
  if (kind === 'elem' || kind === 'mult') return 'more';
  if (kind === 'res') return 'less';
  const f = kind === 'fx' ? (STACK_FORM[key] ?? STACK_FORM[`${key}.reduce`]) : undefined;
  if (f === 'mult' || f === 'more') return 'more';
  if (f === 'less') return 'less';
  return 'add';
}
/** Parça `i`nin yazıdaki yer tutucusu biçime uyuyor mu ({i} / {mi} / {li}; {mi:3} gibi katlı biçim de sayılır). */
export function templateShowsPart(text: string, i: number, form: BonusForm): boolean {
  const tag = form === 'more' ? 'm' : form === 'less' ? 'l' : '';
  return new RegExp(`\\{${tag}${i}(:\\d+)?\\}`).test(text);
}

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
      if (p.to.startsWith('res:') && !(ELEMENTS as readonly string[]).includes(p.to.slice(4))) errors.push(`${at}: unknown element ${p.to}`);
    });
    if (a.slots) for (const s of a.slots) if (!slotIds.includes(s)) errors.push(`${at}: unknown slot ${s}`);
    if (a.choices) for (const c of a.choices) if (!statusDefs[c]) errors.push(`${at}: unknown status ${c}`);
    if (a.text.includes('{x}') && !a.choices?.length) errors.push(`${at}: {x} needs choices`);
    if (a.parts?.length && !a.parts[0]!.fixed && !/\{[ml]?0(:\d+)?\}/.test(a.text)) errors.push(`${at}: text must show its value ({0})`);
    // Bonus yazım kuralı (2026-10-27): ayrı çarpan "×" ({m0} / {l0}), toplamsal "+%" ({0})
    a.parts?.forEach((p, i) => {
      if (p.fixed) return;
      const form = partBonusForm(p.to);
      if (new RegExp(`\\{[ml]?${i}(:\\d+)?\\}`).test(a.text) && !templateShowsPart(a.text, i, form)) errors.push(`${at}: part ${i} (${p.to}) must be written as ${form === 'add' ? `{${i}}` : `{${form === 'more' ? 'm' : 'l'}${i}}`} (bonus wording rule)`);
    });
  }
  for (const t of TIER_IDS) for (const s of SLOT_IDS) if (!tierPool(t, s).length) errors.push(`tier ${t}: no affix allowed on ${s}`);
  // Zar hiç boş kalmasın (itemfix): her taban, ana affix'i dışında en az bir C daha çekebilmeli (Uncommon+; taban nadirlikten bağımsız Epic olabilir)
  for (const d of data.items)
    if (d.rarity !== 'legendary' && !Object.entries(data.affixDefs).some(([id, a]) => a.tier === 'C' && (!a.slots || a.slots.includes(d.slot)) && !(d.main ? [d.main] : (data.weaponFamilies.find((f) => f.id === d.family)?.mains ?? [])).includes(id)))
      errors.push(`item ${d.id}: its slot pool has no second C affix`);
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
          // Yuva havuzu (slots) yalnızca rastgele zarı yönetir; Legendary'nin el seçimi affix'leri ondan muaf (itemfix 2026-10-13)
        });
      if (d.affixes && new Set(d.affixes).size !== d.affixes.length) errors.push(`${at}: duplicate affix`);
      for (const [id, m] of Object.entries(d.boost ?? {}))
        if (!d.affixes?.includes(id) || !(typeof m === 'number' && m >= 1 && m <= 3)) errors.push(`${at}: boost ${id} must name one of its affixes with a multiplier 1-3`);
    } else {
      if (d.boost !== undefined) errors.push(`${at}: only Legendary items carry a boost`);
      if (d.effect !== undefined) errors.push(`${at}: only Legendary items carry an effect`);
      if (d.affixes !== undefined) errors.push(`${at}: only Legendary items list fixed affixes`);
      // Ana affix tabanın örtük statıdır (yuva havuzundan muaf: Studded Gauntlets / Hobnailed Boots Armor taşır). Kalkan `main` taşıyabilir (Armor).
      if (!d.family || d.slot === 'offhand') {
        const m = d.main ? data.affixDefs[d.main] : undefined;
        if (d.main !== undefined || !d.family) if (!m || m.tier !== 'C') errors.push(`${at}: needs a C main affix`);
      } else if (d.main !== undefined) errors.push(`${at}: a weapon's main affix comes from its family`);
    }
    if (d.usableBy) for (const c of d.usableBy) if (!classes[c]) errors.push(`${at}: usableBy has unknown class ${c}`);
    if (d.minChapter !== undefined && (!Number.isInteger(d.minChapter) || d.minChapter < 1)) errors.push(`${at}: bad minChapter`);
    if (d.implicitBase !== undefined) {
      const key = d.slot === 'offhand' ? 'shield' : d.slot === 'weapon' ? (d.type ?? data.weaponFamilies.find((fd) => fd.id === d.family)?.type) : undefined;
      const imp = key ? data.implicits?.[key] : undefined;
      if (!imp || !Array.isArray(d.implicitBase) || d.implicitBase.length > imp.parts.length || d.implicitBase.some((v) => !(typeof v === 'number' && v > 0))) errors.push(`${at}: implicitBase needs positive numbers for its base's implicit parts`);
    }
  }
  // Item Güçlendirme (2026-10-17): taban gücü, örtük statlar, seviye şartı, başlangıç silahları
  const wp = data.weaponPower;
  if (!wp || !(wp.base >= 0) || !(wp.perIlvl > 0) || !(wp.step > 0) || !(wp.ip >= 0) || !(wp.offhandShare >= 0 && wp.offhandShare <= 1)) errors.push('weaponPower: needs base, perIlvl, step, ip and offhandShare (0-1)');
  for (const g of GRIP_IDS) if (!(wp?.grip?.[g] > 0)) errors.push(`weaponPower.grip: needs a positive ${g}`);
  if (wp && wp.grip.two <= wp.grip.one) errors.push('weaponPower.grip: two-handed must be stronger than one-handed');
  // Silah tipleri (Ömer 2026-10-27): her tipin profili ve örtüğü, çift el yakın dövüş kuralı, her silahın bir tipi
  const isType = (t: unknown): t is WeaponType => (WEAPON_TYPES as readonly unknown[]).includes(t);
  for (const t of WEAPON_TYPES) {
    const td = data.weaponTypes?.[t];
    if (!td?.name || (td.power !== undefined && !(td.power > 0)) || (td.spdLess !== undefined && !(td.spdLess > 0 && td.spdLess < 100))) errors.push(`weaponTypes.${t}: needs a name, power > 0, spdLess 0-100`);
    if (!data.implicits?.[t]) errors.push(`weapon type ${t}: needs an implicit`);
  }
  const thm = data.twoHandMelee;
  if (thm && (!thm.name || !(thm.power > 0) || !(thm.spdLess > 0 && thm.spdLess < 100) || !thm.types?.length || thm.types.some((t) => !isType(t)))) errors.push('twoHandMelee: needs name, power > 0, spdLess 0-100 and known types');
  for (const fd of data.weaponFamilies) if (fd.type !== undefined && !isType(fd.type)) errors.push(`family ${fd.id}: unknown type ${String(fd.type)}`);
  for (const d of data.items) {
    if (d.type !== undefined && (d.slot !== 'weapon' || !isType(d.type))) errors.push(`item ${d.id}: type must be a known weapon type, weapons only`);
    if (d.slot === 'weapon' && !isType(d.type ?? data.weaponFamilies.find((fd) => fd.id === d.family)?.type)) errors.push(`item ${d.id}: weapon needs a type (its own or its family's)`);
  }
  for (const [k, imp] of Object.entries(data.implicits ?? {})) {
    if (k !== 'shield' && !isType(k)) errors.push(`implicit ${k}: must be a weapon type or shield`);
    if (!imp.name || !/\{[ml]?0\}/.test(imp.text ?? '') || !imp.parts?.length) errors.push(`implicit ${k}: needs name, text with {0} and parts`);
    imp.parts?.forEach((p, i) => {
      if (!templateShowsPart(imp.text ?? '', i, partBonusForm(p.to))) errors.push(`implicit ${k}: part ${i} (${p.to}) breaks the bonus wording rule`);
    });
    for (const p of imp.parts ?? []) if (!TARGET_RE.test(p.to) || !(p.step > 0) || !p.noRoll || !p.noPower) errors.push(`implicit ${k}: parts need a target, step, noRoll and noPower`);
  }
  if (!(Number.isInteger(data.levelReq?.offset) && data.levelReq.offset >= 0 && Number.isInteger(data.levelReq.min) && data.levelReq.min >= 1)) errors.push('levelReq: needs integer offset >= 0 and min >= 1');
  const st = data.starterWeapons;
  if (!st || !Number.isInteger(st.ilvl) || st.ilvl < 1) errors.push('starterWeapons: needs ilvl >= 1');
  for (const c of randomPool) {
    const id = st?.classes?.[c];
    const d = id ? data.items.find((x) => x.id === id) : undefined;
    if (!d) errors.push(`class ${c} has no starter weapon`);
    else if (d.slot !== 'weapon' || d.rarity !== 'common' || !(data.weaponFamilies.find((f) => f.id === d.family)?.classes.includes(c) ?? false)) errors.push(`starter ${id} (${c}): must be a Common weapon of the class's family`);
  }
  for (const [c, id] of Object.entries(data.starterOffhands?.classes ?? {})) {
    const d = data.items.find((x) => x.id === id);
    const w = data.items.find((x) => x.id === st?.classes?.[c]);
    const fam = d?.family ? data.weaponFamilies.find((f) => f.id === d.family) : undefined;
    const offOk = d && (d.slot === 'offhand' || (d.slot === 'weapon' && (d.grip ?? 'one') === 'one' && !!fam?.offhand));
    if (!d || !offOk || d.rarity !== 'common') errors.push(`starter off-hand ${id} (${c}): must be a Common off-hand item`);
    else if (d.family && !(fam?.classes.includes(c) ?? false)) errors.push(`starter off-hand ${id} (${c}): not usable by the class`);
    if (!w || (w.grip ?? 'one') !== 'one') errors.push(`starter off-hand ${id} (${c}): the class's starter weapon must be one-handed`);
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

/**
 * Kuşanılmış item'i aynı kahramanın başka yuvasına taşır (Gear sürükle-bırak, Ömer 2026-10-23; saf): hedef doluysa yer değiştirir. Taşınan item hedefe
 * uymalı (fitsSlot, örn. hançer ana el <-> ikinci el); hedefteki item kaynağa uyuyorsa (ve sınıf kullanabiliyorsa) oraya geçer, uymuyorsa
 * `toBag` ile torbaya döner (çağıran yer ayırır). İkinci el kuralları aynı: ana el boşken ya da çift el silah varken silah ikinci ele girmez.
 * Hata: mesaj. Seviye / Legendary sayısı değişmez (aynı item'ler).
 */
export function planMoveEquipped(classId: string, equipment: EquipMap, from: SlotId, to: SlotId): { equipment: EquipMap; toBag: ItemInstance[] } | { error: string } {
  const a = equipment[from];
  const da = a ? itemDef(a.id) : undefined;
  if (!a || !da) return { error: 'Nothing to move' };
  if (from === to) return { error: 'Same slot' };
  if (!fitsSlot(da, to)) return { error: `${da.name} does not go in the ${slotDef(to)?.name ?? to} slot` };
  const b = equipment[to];
  const db = b ? itemDef(b.id) : undefined;
  const eq: EquipMap = { ...equipment, [from]: null, [to]: null };
  const toBag: ItemInstance[] = [];
  if (b && db) {
    if (fitsSlot(db, from) && canEquip(classId, db)) eq[from] = b;
    else toBag.push(b);
  }
  if (to === 'offhand') {
    if (!eq.weapon) return { error: 'The main hand is empty: a weapon does not go in the off-hand' };
    const w = offhandBlocker(eq);
    if (w) return { error: offhandBlockedMsg(w) };
  }
  const plan = equipInto(eq, a, to);
  toBag.push(...plan.displaced);
  const out = plan.equipment;
  promoteOffhand(out);
  return { equipment: out, toBag };
}
