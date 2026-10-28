// Skill ağacı motor kancaları (saf; docs/design/skill-tree-implementation.md 2.3 + 4.1 + 4.2, "Faz 2a notları"). Motor ağaç VERİSİNİ bilmez:
// derleyici (src/progression/skill-tree-compile.ts) kahramanın dağılımını buradaki tiplere çevirir (UnitSetup.tree: fx / fxNodes / hooks,
// yamalı skill tanımları ve SkillCost.cond). Bu dosya:
//  1) (b) unitFx kanalı: ItemEffects biçimi, item'lerden AYRI kanal (Combatant.treeFx). Okuma birleşik: sayılar toplanır, "×" yazılanlar (STACK_FORM) çarpılır,
//     bayraklar VEYA, nesne biçimli tetikler kaynak başına AYRI (her kaynağın kendi "savaşta bir kez" bayrağı); sayaçlı iki kanca
//     (nthSpellFree, moveStride) tek kaynak: item önce.
//  2) C1 koşul sözlüğü: TEK tablo COND (koşul anahtarı -> değerlendirici) + SCALE (ölçek anahtarı -> sayı). Yeni koşul = tabloya 1 satır
//     (+ gerekiyorsa CondHost'a bir okuma). Değerlendirilemeyen koşul (ör. savaş bağlamı olmayan bedel hesabı) = tutmaz.
//  3) Ölçüm: tetiklenen ağaç etkisi Battle.onTreeProc dinleyicisine { type: 'treeProc', uid, node } verir (olay akışına / kayda GİRMEZ).
import type { Combatant, Element, ItemEffects, SkillCost, SkillDef, SkillEffect } from './types';

/* ------------------------------------------------------------------ (b) unitFx kanalı ------------------------------------------------------------------ */

/** unitFx beyaz listesi: ItemEffects'in TÜM anahtarları (aşağıdaki tip denetimi eksik / fazla anahtarı derleme hatası yapar). */
export const UNIT_FX_KEYS = [
  'startShieldRatio', 'critMp', 'secondWind', 'startCharge', 'steadfast', 'debuffShorten', 'tierDamageMult', 'adjacentGuard', 'turnMp',
  'firstSkillFree', 'executeLifesteal', 'onHitDot', 'interceptLethal', 'firstAttackEcho', 'killExtraTurn', 'nthSpellFree', 'rerollMiss',
  'ignoreFirstDebuff', 'shieldRefresh', 'moveStride', 'critHealAlly', 'blockChance', 'dazeChance', 'armorPen', 'magicPen', 'mpCostReduce', 'leech', 'manaLeech',
  'debuffAvoid', 'potencyTurns', 'auraDamage', 'damageTakenReduce', 'lowHpReduce', 'ultCdReduce', 'earlyImmunity', 'summonPower', 'rageGain',
  'retortStatus', 'critStatuses', 'killRush', 'lastStand', 'openerStatus', 'restBlessing', 'vengeance', 'tierStatus',
  'elemResist', 'thorns', 'frontRowDamage', 'backRowDamage', 'tierDamageTakenReduce', 'columnGuard', 'pierceBehind', 'steadyDamage',
] as const satisfies readonly (keyof ItemEffects)[];
type MissingKey = Exclude<keyof ItemEffects, (typeof UNIT_FX_KEYS)[number]>;
const _allKeys: [MissingKey] extends [never] ? true : MissingKey = true;
void _allKeys;

/**
 * "×" yazılan etkilerin birleşme biçimi (bonus yazım kuralı, Ömer 2026-10-27: "×" yazan her şey GERÇEKTEN çarpılır; iki ×1.1 = ×1.21):
 * 'mult' = ham çarpan (1 = etkisiz): a x b; 'more' = oran, yazıda ×(1 + v): (1 + a)(1 + b) - 1; 'less' = oran, yazıda ×(1 - v): 1 - (1 - a)(1 - b).
 * Listede olmayan sayılar (şans, düz ek, "+%" yazılanlar) toplanır. Item affix'leri (loadout.ts), FARKLI ağaç düğümleri ve
 * item + ağaç kanalı (effNum / effMult) aynı tabloyu kullanır; bir düğümün rank'ları ise doğrusal toplanır (stackTimes). Nesne alanı: '<anahtar>.<alan>' (lowHpReduce.reduce); elemResist her element için 'less'.
 */
export type StackForm = 'mult' | 'more' | 'less';
export const STACK_FORM: Readonly<Record<string, StackForm>> = {
  tierDamageMult: 'mult',
  frontRowDamage: 'more',
  backRowDamage: 'more',
  auraDamage: 'more',
  steadyDamage: 'more',
  summonPower: 'more',
  rageGain: 'more',
  damageTakenReduce: 'less',
  tierDamageTakenReduce: 'less',
  adjacentGuard: 'less',
  columnGuard: 'less',
  mpCostReduce: 'less',
  'lowHpReduce.reduce': 'less',
  elemResist: 'less',
};
/** İki değeri biçimine göre birleştirir (biçimsizse toplar). */
export function stackValues(form: StackForm | undefined, a: number, b: number): number {
  if (form === 'mult') return a * b;
  if (form === 'more') return (1 + a) * (1 + b) - 1;
  if (form === 'less') return 1 - (1 - a) * (1 - b);
  return a + b;
}
/**
 * Aynı kaynağın `n` rank'ı (Ömer 2026-10-27 düzeltmesi: rank'lar BİRBİRİNİ ÇARPMAZ, rank yükselince eski bonusun yerine büyüğü gelir):
 * doğrusal; mult 1 + (v - 1) x n, more / less / biçimsiz v x n ("×1.06 per rank" 5 rank = ×1.30, "×0.96 per rank" 3 rank = ×0.88).
 */
export function stackTimes(form: StackForm | undefined, v: number, n: number): number {
  if (form === 'mult') return 1 + (v - 1) * n;
  return v * n;
}
/** Nesne biçimli etkinin sayısal alanının birleşme biçimi ('<anahtar>.<alan>' ya da tüm alanlar için '<anahtar>'). */
export const fieldStackForm = (key: string, field: string): StackForm | undefined => STACK_FORM[`${key}.${field}`] ?? STACK_FORM[key];
/** Eşik / süre / sıklık alanları: rank ile çarpılmaz, iki kaynağın nesnesi birleşirken toplanmaz (ilk kalır). */
export const FX_THRESHOLD_FIELDS: ReadonlySet<string> = new Set(['below', 'above', 'cap', 'turns', 'every', 'max', 'turnCost']);

type FxKey = keyof ItemEffects;
type NumKey = { [K in FxKey]-?: NonNullable<ItemEffects[K]> extends number ? K : never }[FxKey];
type FlagKey = { [K in FxKey]-?: NonNullable<ItemEffects[K]> extends boolean ? K : never }[FxKey];
type ArrKey = { [K in FxKey]-?: NonNullable<ItemEffects[K]> extends readonly unknown[] ? K : never }[FxKey];
export type FxSource = 'item' | 'tree';
/** Kanal sahibi (Combatant ya da yalnızca kanalları taşıyan nesne: cost.ts, arayüz). */
export type FxHolder = Partial<Pick<Combatant, 'itemEffects' | 'treeFx'>>;

/** Birimin etki kanalları (item önce). Ağaçsız birimde yalnızca item kanalı: okuma eskisiyle birebir aynı. */
export function fxBags(c: FxHolder): Array<[ItemEffects, FxSource]> {
  const out: Array<[ItemEffects, FxSource]> = [];
  if (c.itemEffects) out.push([c.itemEffects, 'item']);
  if (c.treeFx) out.push([c.treeFx, 'tree']);
  return out;
}

/** Sayısal etki (kaynaklar toplanır; "×" yazılan oranlar STACK_FORM'a göre çarpılarak birleşir; yoksa 0). Ham çarpan (tierDamageMult) için effMult. */
export function effNum(c: FxHolder, key: NumKey): number {
  const a = (c.itemEffects?.[key] as number | undefined) ?? 0;
  const t = c.treeFx ? ((c.treeFx[key] as number | undefined) ?? 0) : 0;
  return t ? stackValues(STACK_FORM[key], a, t) : a;
}

/** Ham çarpan etkisi: kaynakların çarpımı; hiç kaynak yoksa undefined. */
export function effMult(c: FxHolder, key: NumKey): number | undefined {
  const a = c.itemEffects?.[key] as number | undefined;
  const t = c.treeFx?.[key] as number | undefined;
  if (t === undefined) return a;
  if (a === undefined) return t;
  return a * t;
}

/** Bayrak (kaynaklardan biri). */
export const effFlag = (c: FxHolder, key: FlagKey): boolean => !!c.itemEffects?.[key] || !!c.treeFx?.[key];

/** Liste etkileri birleşik (item önce). */
export function effArr<K extends ArrKey>(c: FxHolder, key: K): NonNullable<ItemEffects[K]> | undefined {
  const a = c.itemEffects?.[key];
  const t = c.treeFx?.[key];
  if (!t) return a;
  if (!a) return t;
  return [...a, ...t] as unknown as NonNullable<ItemEffects[K]>;
}

/** Nesne biçimli etkinin kaynakları (tetikler kaynak başına ayrı çalışır). */
export function effList<K extends FxKey>(c: FxHolder, key: K): Array<{ v: NonNullable<ItemEffects[K]>; src: FxSource }> {
  const out: Array<{ v: NonNullable<ItemEffects[K]>; src: FxSource }> = [];
  const a = c.itemEffects?.[key];
  if (a !== undefined && a !== null) out.push({ v: a as NonNullable<ItemEffects[K]>, src: 'item' });
  const t = c.treeFx?.[key];
  if (t !== undefined && t !== null) out.push({ v: t as NonNullable<ItemEffects[K]>, src: 'tree' });
  return out;
}

/** Sayaçlı tek kaynaklı kanca (nthSpellFree, moveStride): item varsa o, yoksa ağaç. */
export function effFirst<K extends FxKey>(c: FxHolder, key: K): ItemEffects[K] | undefined {
  return c.itemEffects?.[key] ?? c.treeFx?.[key];
}

/** Element direnci (elemResist; Ömer 2026-10-26, c_res_*; yazıda "×0.95"): kanallar çarpılarak birleşir, 1 - (1 - a)(1 - t) (yoksa 0). */
export function elemResistOf(c: FxHolder, element: Element): number {
  const a = c.itemEffects?.elemResist?.[element] ?? 0;
  const t = c.treeFx?.elemResist?.[element] ?? 0;
  return t ? stackValues('less', a, t) : a;
}

/** "Savaşta bir kez" tetiklerin item kanalındaki eski bayrakları (ağaç kanalı Combatant.treeOnce'ta tutulur). */
const ONCE_FLAG: Partial<Record<FxKey, keyof Combatant>> = {
  secondWind: 'secondWindUsed',
  shieldRefresh: 'shieldRefreshed',
  lastStand: 'lastStandUsed',
  openerStatus: 'openerUsed',
};
export function onceUsed(c: Combatant, src: FxSource, key: FxKey): boolean {
  if (src === 'item') return !!c[ONCE_FLAG[key]!];
  return !!c.treeOnce?.includes(key);
}
export function markOnce(c: Combatant, src: FxSource, key: FxKey): void {
  if (src === 'item') (c as unknown as Record<string, unknown>)[ONCE_FLAG[key]!] = true;
  else (c.treeOnce ??= []).push(key);
}

/**
 * İki unitFx değerini birleştirir (derleyici: birden çok düğüm aynı anahtarı verirse). Sayı: toplam ("×" yazılanlar STACK_FORM'a göre çarpılır);
 * bayrak: VEYA; dizi: ard arda; nesne: sayısal alanlar toplanır (STACK_FORM alanı çarpılır), eşik / süre alanları (FX_THRESHOLD_FIELDS) ve metin ilk değerde kalır.
 */
export function mergeFxValue(key: string, prev: unknown, next: unknown): unknown {
  if (prev === undefined) return next;
  if (Array.isArray(prev) && Array.isArray(next)) return [...prev, ...next];
  if (typeof prev === 'boolean' || typeof next === 'boolean') return !!prev || !!next;
  if (typeof prev === 'number' && typeof next === 'number') return stackValues(STACK_FORM[key], prev, next);
  if (prev && next && typeof prev === 'object' && typeof next === 'object') {
    const p = prev as Record<string, unknown>;
    const out: Record<string, unknown> = { ...p };
    for (const [k, v] of Object.entries(next as Record<string, unknown>)) {
      if (typeof v === 'number' && typeof p[k] === 'number' && !FX_THRESHOLD_FIELDS.has(k)) out[k] = stackValues(fieldStackForm(key, k), p[k] as number, v);
      else if (!(k in p)) out[k] = v;
    }
    return out;
  }
  return next;
}

/* ------------------------------------------------------------------ C1 koşullar ------------------------------------------------------------------ */

/** Son eylem türü (Battle.lastKind; LastActionKind ile aynı değerler). */
export type ActionKindLite = 'skill' | 'rest' | 'skip' | 'move' | 'valor' | 'urn' | 'surge' | 'pass';

/** Koşul değerlendiricilerinin savaştan okuduğu her şey (Battle uygular). Yeni koşul savaş verisi isterse buraya bir okuma eklenir. */
export interface CondHost {
  /** Birimin canlı, sıra alan dostları (kendisi hariç). */
  alliesOf(c: Combatant): Combatant[];
  /** Birimin canlı, sıra alan düşmanları. */
  enemiesOf(c: Combatant): Combatant[];
  /** Geçerli zırh (aura + durum dahil: effectiveStats). */
  armorOf(c: Combatant): number;
  /** Geçerli hız (Slow / Haste dahil; geçici Skip desteği hariç). */
  speedOf(c: Combatant): number;
  /** Bu birime en son SKILL vuruşuyla vuran düşmanın uid'i (DoT / zemin sayılmaz; plan 10a). */
  lastSkillHitter(uid: string): string | undefined;
  /** `attacker`, `self`'e self'in son turundan (eyleminden) beri skill vuruşuyla vurdu mu. */
  hitSinceTurn(self: string, attacker: string): boolean;
  /** `self`'e son turundan beri herhangi bir düşman skill vuruşu isabet etti mi. */
  hitSinceTurnAny(self: string): boolean;
  /** `attacker`'ın `self`'e son turundan beri en az bir skill vuruşu ıskaladı mı (dodge / miss / blok). */
  missedSinceTurn(self: string, attacker: string): boolean;
  /** `actor` bu savaşta `target`'a daha önce isabet ettirdi mi (bu vuruştan önce). */
  hitBefore(actor: string, target: string): boolean;
  /** Birim bu savaşta en az bir eylem yaptı mı (skill, global, pas). */
  acted(uid: string): boolean;
  /** Birimin bir önceki eylemi (yoksa undefined). */
  lastAction(uid: string): ActionKindLite | undefined;
  /** Birimin bir önceki eyleminde harcadığı Rage (yoksa 0). */
  prevRageSpent(uid: string): number;
  /** Birimin bir önceki SKILL kullanımının hedefleri (yoksa boş). */
  lastTargets(uid: string): readonly string[];
  /** Birimin bir önceki skill kullanımı MP bedelli miydi (bedel > 0). */
  lastSkillCostMp(uid: string): boolean;
  /** Bu skill'i bu kullanımdan ÖNCE üst üste kaç kez kullandı (araya başka skill girince sıfırlanır; global eylemler bozmaz). */
  skillStreak(uid: string, skill: string): number;
  /** Faz 5a: birimin son kullanımda çektiği yığın sayısı (gather; Overflowing Fate). */
  gathered(uid: string): number;
  /** Faz 5a: bu kullanımda merkez hücreye gelen kritik vuruş sayısı (X Marks the Throat). */
  centerCrits(): number;
  /** Birim bu skill'i son kullanımından beri kaç düşman skill vuruşu yedi (hiç kullanmadıysa savaş başından beri). */
  hitsTakenSinceUse(uid: string, skill: string): number;
  /** `target`, `self`'in son turundan beri öldü mü (ölü dost hedef: Not Yet). */
  diedSinceTurn(self: string, target: string): boolean;
  /** Birimin hücresindeki zemin türleri. */
  groundsAt(c: Combatant): string[];
  /** Hücre sırası (0 = en ön) ve o taraftaki canlı birimlerin en ön / en arka sırası. */
  rowOf(c: Combatant): number;
  occupiedRows(c: Combatant): { front: number; back: number };
  /** Durum türü (statuses.json type; tanımsız durum: undefined). */
  statusType(kind: string): 'buff' | 'debuff' | undefined;
  /** Sıra mesafesi (Sharpshooter / longshot formülü: kullanıcının sırası + hedefin sırası). */
  distance(a: Combatant, b: Combatant): number;
  /** "beside" (plan 10a, katalog 14.30): aynı sıradaki yan şerit komşusu (formation.sideNeighbors). */
  beside(a: Combatant, b: Combatant): boolean;
  /** "next to": 4 yön komşu (aynı tahta, sıra + şerit farkı toplamı 1). */
  nextTo(a: Combatant, b: Combatant): boolean;
  /** Şu anki skill'in vurduğu / vuracağı hedefler (gerçek vuruş ya da önizleme); yoksa null. */
  castTargets(): readonly Combatant[] | null;
  /** `ally`, `owner`'ın zırh aurasının içinde mi (aura pasifi yoksa false). */
  inAura(owner: Combatant, ally: Combatant): boolean;
  /** Skill alan skill'i mi (gelen vuruşun türü; Weathered). */
  isAreaSkill(skill: SkillDef): boolean;
  /** Faz 2c: `node` kancası `self` için `target`a bu savaşta tetiklendi mi (koşul oncePerTarget; Grave Shackle). */
  firedOn(self: string, node: string, target: string): boolean;
  /** Faz 2c: birimin üst üste kaç eylemdir Move yapmadığı (son eylem Move ise 0; ölçek stillStreak, Rooted Stance). */
  stillStreak(uid: string): number;
}

/** Bu kullanımın birikmiş sonuçları (Battle.cast doldurur; kullanım sonu kancaları `done` ile görür). */
export interface CastInfo {
  skill: string;
  /** İsabet eden (Lucky Escape hariç) hedefler (uid). */
  landed: Set<string>;
  /** Bu kullanımda ölen düşman sayısı. */
  kills: number;
  /** Bahis sonucu, bahis miktarı ve kazanma şansı (bahisli skill). */
  bet?: 'won' | 'lost';
  stake?: number;
  betChance?: number;
  /** Bu kullanımda can bedeli olarak ödenen can. */
  hpPaid: number;
  /** Bu kullanımda Silence verilen düşman sayısı. */
  silenced: number;
  /** Bu kullanımda silinen buff sayısı (dispel buff). */
  buffsRemoved: number;
  /** Bu kullanımda şifa alan hedeflerin şifadan ÖNCEKİ can oranları. */
  healedRatios: number[];
  /** true: tüm etkiler bitti (kullanım sonu kancaları: cooldown, echo). */
  done?: boolean;
}

/** Vuruşa özgü bilgi (strike doldurur). */
export interface HitInfo {
  /** Hedefin bu etkideki sırası (0 = ilk vurulan). */
  index?: number;
  /** Hedef alanın tıklanan merkez hücresinde mi (alan skill'i değilse undefined). */
  center?: boolean;
  /** Merkez hücredeki kaçıncı vuruş (1 tabanlı; X şekli çift vuruş). */
  centerHit?: number;
  /** Double Hit zincirindeki sıra (0 = asıl vuruş, 1 = tekrar). */
  repeat?: number;
  /** Mana yakımından önceki MP (manaBurn noktası). */
  mpBefore?: number;
  /** Faz 5a (Thrown Stiletto): bu vuruş "fırlatma" (requiresOpenBehind gevşetilmiş skill'de arkası dolu hedef). */
  thrown?: boolean;
}

/** Vuruş dışı bağlantı yerinin bilgisi (Doom, DoT tiki, zemin tiki). */
export interface TickInfo {
  /** DoT: bu durumun bu hedefte daha önce kaç kez tiklediği (0 = ilk tik). */
  index?: number;
  /** Zemin: konduğundan beri kaç tur geçti (0 = kondu, ilk tik 1). */
  age?: number;
  /** Doom: patlamayı tetikleyen skill (detonate / tamamlayan skill; süre bitimi: yok). */
  doomSource?: string;
  /** Doom: bu Hexer'in savaştaki ilk Doom'u. */
  firstDoom?: boolean;
  /** Doom: yığın Ill Omen ile gelmiş Omen içeriyor (konakta en az 1 geçmiş Omen; katalog 14.9). */
  fromTransfer?: boolean;
}

export interface CondCtx {
  /** Kancanın sahibi (ağaçlı birim). */
  self: Pick<Combatant, 'hp' | 'maxHp' | 'rage' | 'uid'> & Partial<Combatant>;
  /** Vurulan / durum alan hedef (bedel hesabında yok). */
  target?: Combatant;
  /** Şu anki skill (sahibin). */
  skill?: SkillDef | null;
  /** Şu anki skill'in id'si (bedel koşulunda skill tanımı yoksa). */
  skillId?: string;
  /** Bu kullanımda harcanan Rage (gerçek vuruşta ödenen; önizlemede ödenecek). */
  rageSpent?: number;
  /** Sahibe gelen vuruş (savunma koşulları; Faz 4/5 uygulama noktası). */
  incoming?: { actor: Combatant; skill?: SkillDef | null; type?: 'physical' | 'magic' };
  /** Vuruşun kritik olup olmadığı (yalnızca vuruş sonrası değerlendirmede; önce: undefined = hitIsCrit tutmaz). */
  crit?: boolean;
  /** Vuruş hedefi öldürdü mü (yalnızca vuruş sonrası; killingBlow). */
  killed?: boolean;
  hit?: HitInfo;
  cast?: CastInfo;
  tick?: TickInfo;
  /** Savaş okumaları; yoksa savaşa bakan koşullar tutmaz. */
  host?: CondHost;
  /** Faz 2c: değerlendirilen kancanın düğümü (koşul oncePerTarget; Battle.heldHooks yazar). */
  node?: string;
  /** Faz 4a: tetik olayının miktarı (koşul / ölçek eventAmount). */
  amount?: number;
  /** Faz 4c: olaydan ÖNCEKİ hedef (durum anlık görüntüsü; koşul `before`: Frozen Rebuke "Slowed bir düşman vurursa"). */
  preTarget?: Combatant;
}

/** Koşul nesnesi: anahtarlar VE ile birleşir; `not` = içindeki koşul nesnesi TUTMAZSA; `any` = listeden biri tutarsa. */
export type CondWhen = { [key: string]: unknown; not?: CondWhen; any?: CondWhen[] };
/** Ölçek nesnesi: TEK anahtar (SCALE tablosu) -> değeri o anahtarın argümanı. Değişikliğin sayısı ölçekle çarpılır. */
export type CondScale = Record<string, unknown>;

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const hpRatio = (c: { hp: number; maxHp: number }): number => (c.maxHp > 0 ? c.hp / c.maxHp : 1);
const hasStatus = (c: Pick<Combatant, 'statuses'> | undefined, arg: unknown): boolean => {
  if (!c?.statuses) return false;
  const list = Array.isArray(arg) ? arg : [arg];
  return c.statuses.some((s) => list.includes(s.kind));
};
/** Savaş bağlamı gerektiren koşul: host yoksa tutmaz. */
const needHost = <T>(x: CondCtx, f: (h: CondHost) => T): T | undefined => (x.host ? f(x.host) : undefined);
/** Evet / hayır koşulu: argüman `false` ise sonuç tersine döner (`targetIsCenter: false`); değerlendirilemeyen (undefined) aynen kalır. */
const flag = (v: boolean | undefined, a: unknown): boolean | undefined => (v === undefined ? undefined : a === false ? !v : v);
const onTarget = <T>(x: CondCtx, f: (t: Combatant) => T): T | undefined => (x.target ? f(x.target) : undefined);
/** Sayı karşılaştırması: argüman sayı = "en az"; nesne { atLeast?, atMost?, eq? }. */
function cmp(v: number | undefined, a: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (num(a) !== undefined) return v >= num(a)!;
  if (!a || typeof a !== 'object') return undefined;
  const o = a as { atLeast?: number; atMost?: number; eq?: number };
  if (o.eq !== undefined && v !== o.eq) return false;
  if (o.atLeast !== undefined && v < o.atLeast) return false;
  if (o.atMost !== undefined && v > o.atMost) return false;
  return true;
}
const stacksOf = (c: Combatant | undefined, kind: unknown): number => c?.statuses.find((s) => s.kind === (typeof kind === 'string' ? kind : 'omen'))?.stacks ?? 0;
/** Opportunist pasifinin (bonusVsStatus) listesindeki bir durum hedefte var mı (pasif yoksa undefined). */
function opportunistHolds(x: CondCtx): boolean | undefined {
  const pe = x.self.passive?.effect;
  if (pe?.type !== 'bonusVsStatus' || !x.target) return undefined;
  return x.target.statuses.some((s) => pe.statuses.includes(s.kind));
}
const debuffs = (x: CondCtx, c: Combatant): number => c.statuses.filter((s) => x.host?.statusType(s.kind) === 'debuff').length;
const buffs = (x: CondCtx, c: Combatant): number => c.statuses.filter((s) => x.host?.statusType(s.kind) === 'buff').length;

/**
 * KOŞUL SÖZLÜĞÜ (plan 4.2 + katalog 12.1). Anahtar -> (bağlam, argüman) -> tutuyor mu. undefined = değerlendirilemez (tutmaz).
 * Evet / hayır koşullarında argüman `false` sonucu tersine çevirir (`true` ya da başka değer = olduğu gibi). Sayı koşulları `cmp` biçimi
 * (sayı = en az; { atLeast, atMost, eq }). Bedel hesabında (cost.ts) host / hedef YOKTUR: orada yalnızca SELF_CONDS anlamlıdır (derleyici denetler).
 * Tam liste + anlam + örnek: docs/design/skill-tree-implementation.md "Faz 2a+ notları".
 */
export const COND: Record<string, (x: CondCtx, arg: unknown) => boolean | undefined> = {
  // --- hedef durumu ---
  /** Hedefte durum var (dize ya da dizi: biri yeter). */
  targetStatus: (x, a) => onTarget(x, (t) => hasStatus(t, a)),
  /** targetStatus ile aynı (katalog adı; dizi). */
  targetStatusAny: (x, a) => onTarget(x, (t) => hasStatus(t, a)),
  /** Hedefteki durumun kalan turu en az N: { status, n }. */
  targetStatusTurnsAtLeast: (x, a) => {
    const o = a as { status?: string; n?: number } | undefined;
    return onTarget(x, (t) => t.statuses.some((s) => s.kind === o?.status && s.turns >= (o?.n ?? 1)));
  },
  /** Hedefteki yığın sayısı (Omen): { status?: 'omen', eq?, atLeast?, atMost? }. */
  targetStatusStacks: (x, a) => onTarget(x, (t) => cmp(stacksOf(t, (a as { status?: string } | undefined)?.status), { atLeast: 0, ...(a as object) })),
  /** Hedefte en az bir debuff (katalog 14.12: yalnız debuff). */
  targetHasAnyStatus: (x, a) => onTarget(x, (t) => flag(x.host ? debuffs(x, t) > 0 : undefined, a)),
  /** Hedefte en az bir buff. */
  targetHasBuff: (x, a) => onTarget(x, (t) => flag(x.host ? buffs(x, t) > 0 : undefined, a)),
  /** Hedefte Opportunist pasifinin listesindeki durumlardan biri var. */
  targetOpportunist: (x, a) => flag(opportunistHolds(x), a),
  // --- hedefin canı / MP'si / zırhı / yeri ---
  /** Hedef tam canlı. */
  targetFullHp: (x, a) => onTarget(x, (t) => flag(t.hp >= t.maxHp, a)),
  /** Hedefin canı bu oranın altında / üstünde (0-1). */
  targetHpBelow: (x, a) => (num(a) !== undefined ? onTarget(x, (t) => t.hp < num(a)! * t.maxHp) : undefined),
  targetHpAbove: (x, a) => (num(a) !== undefined ? onTarget(x, (t) => t.hp > num(a)! * t.maxHp) : undefined),
  /** Hedefin MP'si 0 (maks MP'si > 0). */
  targetMpZero: (x, a) => onTarget(x, (t) => flag(t.maxMp > 0 && t.mp <= 0, a)),
  /** Hedefin MP'si maks MP'sinin bu oranının üstünde. */
  targetMpAbove: (x, a) => (num(a) !== undefined ? onTarget(x, (t) => t.maxMp > 0 && t.mp > num(a)! * t.maxMp) : undefined),
  /** Hedefin MP'si bu kullanımın yakımından ÖNCE zaten 0'dı (manaBurn noktası). */
  targetMpZeroBefore: (x, a) => (x.hit?.mpBefore === undefined ? undefined : onTarget(x, (t) => flag(t.maxMp > 0 && x.hit!.mpBefore! <= 0, a))),
  /** Hedefin geçerli zırhı seninkinden fazla. */
  targetArmorAboveMine: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.armorOf(t) > h.armorOf(x.self as Combatant)), a)),
  /** Hedefin geçerli zırhı en az N. */
  targetArmorAtLeast: (x, a) => (num(a) !== undefined ? onTarget(x, (t) => needHost(x, (h) => h.armorOf(t) >= num(a)!)) : undefined),
  /** Sıra mesafesi (senin sıran + hedefin sırası): sayı = en az, { atLeast, atMost }. */
  targetDistance: (x, a) => onTarget(x, (t) => cmp(x.host?.distance(x.self as Combatant, t), a)),
  /** Hedef kendi tarafının en ön ('front') / en arka ('back') DOLU sırasında. */
  targetRow: (x, a) =>
    onTarget(x, (t) =>
      needHost(x, (h) => {
        const r = h.occupiedRows(t);
        return a === 'back' ? h.rowOf(t) === r.back : h.rowOf(t) === r.front;
      }),
    ),
  /** Hedefin hücresinde bu zemin var. */
  targetOnGround: (x, a) => onTarget(x, (t) => needHost(x, (h) => h.groundsAt(t).includes(String(a)))),
  /** Hedef kendinsin. */
  targetIsSelf: (x, a) => onTarget(x, (t) => flag(t.uid === x.self.uid, a)),
  /** Sen hedeften hızlısın (geçerli hız). */
  fasterThanTarget: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.speedOf(x.self as Combatant) > h.speedOf(t)), a)),
  /** "beside": hedef senin yan şerit komşun (katalog 14.30). */
  targetBeside: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.beside(x.self as Combatant, t)), a)),
  /** "next to": hedef 4 yön komşun. */
  targetNextTo: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.nextTo(x.self as Combatant, t)), a)),
  // --- hedefle geçmiş ---
  /** Hedef bu savaşta hiç eylem yapmadı. */
  targetNotActed: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => !h.acted(t.uid)), a)),
  /** Hedef sana en son skill vuruşuyla vuran düşman. */
  targetLastHitMe: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.lastSkillHitter(x.self.uid) === t.uid), a)),
  /** Hedef, senin son turundan beri sana skill vuruşuyla vurdu. */
  targetHitMeSinceMyTurn: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.hitSinceTurn(x.self.uid, t.uid)), a)),
  /** Hedef, senin son turundan beri sana bir skill vuruşu ıskaladı. */
  targetMissedMeSinceTurn: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.missedSinceTurn(x.self.uid, t.uid)), a)),
  /** Hedef, bir önceki skill kullanımının hedeflerinden biri. */
  targetIsMyLastTarget: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.lastTargets(x.self.uid).includes(t.uid)), a)),
  /** Bu düşmana bu savaştaki ilk isabetin (bu vuruştan önce hiç isabet ettirmedin). */
  firstHitOnTarget: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => !h.hitBefore(x.self.uid, t.uid)), a)),
  /** (Ölü dost) hedef senin son turundan beri öldü. */
  targetDiedSinceMyTurn: (x, a) => onTarget(x, (t) => flag(needHost(x, (h) => h.diedSinceTurn(x.self.uid, t.uid)), a)),
  // --- kendin ---
  /** Kendi canın bu oranın altında / üstünde. */
  selfHpBelow: (x, a) => (num(a) !== undefined ? x.self.hp < num(a)! * x.self.maxHp : undefined),
  selfHpAbove: (x, a) => (num(a) !== undefined ? x.self.hp > num(a)! * x.self.maxHp : undefined),
  /** Üzerinde bu durum var (dize ya da dizi). */
  selfStatus: (x, a) => (x.self.statuses ? hasStatus(x.self as Combatant, a) : undefined),
  /** Taunt'lısın. */
  selfTaunting: (x, a) => (x.self.statuses ? flag(hasStatus(x.self as Combatant, 'taunt'), a) : undefined),
  /** Üzerinde bu skill'in kancalı kalkanı (Spell Ward / Mana Barrier) ayakta. */
  selfHasShield: (x, a) => (x.self.statuses ? !!x.self.shieldHooks?.some((s) => s.skill === a && s.amount > 0) : undefined),
  /** Kendi geçerli zırhın bu değerin üstünde. */
  selfArmorAbove: (x, a) => (num(a) !== undefined ? needHost(x, (h) => h.armorOf(x.self as Combatant) > num(a)!) : undefined),
  /** Rage en az / en çok. */
  rageAtLeast: (x, a) => (x.self.rage !== undefined && num(a) !== undefined ? x.self.rage >= num(a)! : undefined),
  rageAtMost: (x, a) => (x.self.rage !== undefined && num(a) !== undefined ? x.self.rage <= num(a)! : undefined),
  /** Bu kullanımda harcanan Rage en az. */
  rageSpentAtLeast: (x, a) => (num(a) !== undefined ? (x.rageSpent ?? 0) >= num(a)! : undefined),
  /** Bir önceki eyleminde Rage harcadın. */
  rageSpentLastTurn: (x, a) => flag(needHost(x, (h) => h.prevRageSpent(x.self.uid) > 0), a),
  /** Bir önceki eylemin yürümek (Move) değildi. */
  notMovedLastTurn: (x, a) => flag(needHost(x, (h) => h.lastAction(x.self.uid) !== 'move'), a),
  /** Bu senin savaştaki ilk eylemin (henüz hiç eylem yapmadın). */
  firstTurn: (x, a) => flag(needHost(x, (h) => !h.acted(x.self.uid)), a),
  /** Faz 2c: bu kullanım savaştaki İLK cooldown'lu skill (cooldown > 0 ve daha önce cooldown'lu skill kullanılmadı: Combatant.treeCdUsed; Warm Hands, First Refrain). */
  firstCooldownSkill: (x, a) => (x.skill ? flag((x.skill.cooldown ?? 0) > 0 && !x.self.treeCdUsed, a) : undefined),
  /** Faz 2c: son kullandığın skill bu ve onu üst üste en az N kez kullandın ({ skill, atLeast }; Blind Zeal: Rising Fervor birikmiş). */
  skillStreakOf: (x, a) => {
    const o = a as { skill?: string; atLeast?: number } | undefined;
    return o?.skill ? needHost(x, (h) => h.skillStreak(x.self.uid, o.skill!) >= (o.atLeast ?? 1)) : undefined;
  },
  /** Faz 2c: bu kanca bu düşmana bu savaşta daha önce tetiklenmedi ("each enemy once per battle"; Grave Shackle). */
  oncePerTarget: (x, a) => onTarget(x, (t) => flag(x.node && x.host ? !x.host.firedOn(x.self.uid, x.node, t.uid) : undefined, a)),
  /** Bu skill'in savaştaki ilk kullanımı (bedel koşulunda da çalışır: Combatant.treeUsed). */
  firstUseOfSkill: (x, a) => {
    const id = x.skill?.id ?? x.skillId;
    return id ? flag(!x.self.treeUsed?.includes(id), a) : undefined;
  },
  /** Son turundan beri sana hiç düşman skill vuruşu isabet etmedi. */
  notHitSinceMyTurn: (x, a) => flag(needHost(x, (h) => !h.hitSinceTurnAny(x.self.uid)), a),
  /** Bir önceki skill kullanımın MP bedelliydi. */
  lastSkillCostMp: (x, a) => flag(needHost(x, (h) => h.lastSkillCostMp(x.self.uid)), a),
  /** Faz 5a (Unyielding): birim üst üste en az N eylemdir Move yapmadı (Rooted Stance sayacı; host gerekir). */
  stillStreakAtLeast: (x, a) => needHost(x, (h) => cmp(h.stillStreak(x.self.uid), a)),
  /** Herhangi bir canlı düşmanda bu durum var. */
  anyEnemyStatus: (x, a) => needHost(x, (h) => h.enemiesOf(x.self as Combatant).some((e) => hasStatus(e, a))),
  // --- bu vuruş / bu kullanım ---
  /** Bu vuruş kritik (yalnızca vuruş sonrası değerlendirilir: güç / zırh delme / lifesteal / durum). `false` = kritik değil. */
  hitIsCrit: (x, a) => flag(x.crit, a),
  /** Bu vuruş hedefi öldürdü (vuruş sonrası: lifesteal / drain / durum). */
  killingBlow: (x, a) => flag(x.killed, a),
  /** Hedef alanın tıklanan merkez hücresinde (alan skill'i değilse tutmaz). `false` = merkez dışı. */
  targetIsCenter: (x, a) => flag(x.hit?.center, a),
  /** Merkez hücredeki kaçıncı vuruş (1 tabanlı): sayı = eşit. */
  centerHitIndex: (x, a) => (x.hit?.centerHit === undefined ? undefined : x.hit.centerHit === num(a)),
  /** Double Hit zincirindeki sıra en az N (1 = tekrar vuruşu). */
  repeatIndexAtLeast: (x, a) => cmp(x.hit?.repeat ?? 0, a),
  /** Faz 5a (Thrown Stiletto): bu vuruş fırlatma (arkası dolu hedefe requiresOpenBehind'i gevşetilmiş skill). `false` = arkadan vuruş. */
  thrown: (x, a) => flag(x.hit ? !!x.hit.thrown : undefined, a),
  /** Faz 5a (X Marks the Throat): bu kullanımda merkez hücreye en az N kritik vuruş geldi. */
  centerCritsAtLeast: (x, a) => needHost(x, (h) => cmp(h.centerCrits(), a)),
  /** Faz 5a (Mass Hush): bu kullanımın hedeflerinden MP'si 0 olanların sayısı en az N. */
  castMpZeroAtLeast: (x, a) => {
    const list = x.host?.castTargets();
    return list ? cmp(list.filter((c) => c.maxMp > 0 && c.mp <= 0).length, a) : undefined;
  },
  /** Bu kullanımın hedef sayısı (kullanım sonunda: isabet eden sayısı) en az N. */
  hitCountAtLeast: (x, a) => cmp(castCount(x), a),
  /** Bu kullanımda ilk isabetin (önceki hedeflerin hiçbirine isabet etmedin). */
  firstHitThisTurn: (x, a) => (x.cast ? flag(x.cast.landed.size === 0, a) : undefined),
  /** Bu kullanımda en az bir düşman öldü (kullanım sonu kancaları). */
  killedThisCast: (x, a) => (x.cast ? flag(x.cast.kills > 0, a) : undefined),
  /** Bu kullanımda can bedeli ödendi. */
  hpPaidThisCast: (x, a) => (x.cast ? flag(x.cast.hpPaid > 0, a) : undefined),
  /** Bahis kazanıldı / kaybedildi (bahisli skill; zar atıldıktan sonra). */
  betWon: (x, a) => (x.cast?.bet ? flag(x.cast.bet === 'won', a) : undefined),
  betLost: (x, a) => (x.cast?.bet ? flag(x.cast.bet === 'lost', a) : undefined),
  /** Bahis kazanma şansı en az x (ağaç ekleri dahil). */
  betChanceAtLeast: (x, a) => (x.cast?.betChance === undefined || num(a) === undefined ? undefined : x.cast.betChance >= num(a)!),
  /** Bahse konan miktar en az N. */
  stakeAtLeast: (x, a) => (x.cast?.stake === undefined || num(a) === undefined ? undefined : x.cast.stake >= num(a)!),
  /** Bu kullanımda en az bir düşmana Silence verildi (kullanım sonu). */
  silencedAny: (x, a) => (x.cast ? flag(x.cast.silenced > 0, a) : undefined),
  /** Bu kullanımda canı oranın altındayken şifa alan hedef sayısı en az N: { below, atLeast }. */
  healedCountBelow: (x, a) => {
    const o = a as { below?: number; atLeast?: number } | undefined;
    if (!x.cast || !o || num(o.below) === undefined) return undefined;
    return x.cast.healedRatios.filter((r) => r < o.below!).length >= (o.atLeast ?? 1);
  },
  // --- vuruş dışı bağlantı yerleri ---
  /** Zemin tiki: zemin en az N turdur yerde. */
  groundAgeAtLeast: (x, a) => cmp(x.tick?.age, a),
  /** Doom: bu Hexer'in savaştaki ilk Doom'u. */
  firstDoom: (x, a) => flag(x.tick?.firstDoom, a),
  /** Doom: patlamayı bu skill tetikledi (detonate ya da yığını tamamlayan skill). */
  doomSource: (x, a) => (x.tick ? x.tick.doomSource === a : undefined),
  /** Doom: konakta Ill Omen ile gelmiş Omen var (katalog 14.9). */
  omenFromTransfer: (x, a) => flag(x.tick?.fromTransfer, a),
  // --- savunma (Faz 4/5 uygulama noktası) ---
  /** Sana gelen vuruş bir alan skill'inden (savunma bağlamı). */
  incomingArea: (x, a) => (x.incoming?.skill ? flag(needHost(x, (h) => h.isAreaSkill(x.incoming!.skill!)), a) : undefined),
  /** Faz 4a: gelen vuruşun saldıranında durum var (dize ya da dizi; C4 damageTaken / C3 tetik bağlamı). */
  incomingStatus: (x, a) => (x.incoming ? hasStatus(x.incoming.actor, a) : undefined),
  /** Faz 4a: gelen vuruş menzilli bir skill'den (motion 'melee' değil). */
  incomingRanged: (x, a) => (x.incoming?.skill ? flag(x.incoming.skill.motion !== 'melee', a) : undefined),
  /** Faz 4a: gelen vuruşun hasar türü ('physical' | 'magic'). */
  incomingType: (x, a) => (x.incoming?.type ? x.incoming.type === a : undefined),
  /** Faz 4a (tetik): olayın miktarı (sayı = en az; { atLeast, atMost }): şifa / hasar / MP / bahis miktarı. */
  eventAmount: (x, a) => cmp(x.amount, a),
};

/** Kullanımın hedef / isabet sayısı: kullanım sürerken hedef listesi (canlı), kullanım sonunda isabet edenler. */
function castCount(x: CondCtx): number | undefined {
  if (x.cast?.done) return x.cast.landed.size;
  const list = x.host?.castTargets();
  return list ? list.filter((c) => c.hp > 0 || x.cast?.landed.has(c.uid)).length : undefined;
}

/** Savaş bağlamı (host / hedef) olmadan da değerlendirilen koşullar: bedel koşulu (SkillCost.cond) yalnızca bunları kullanabilir. */
export const SELF_CONDS: ReadonlySet<string> = new Set(['selfHpBelow', 'selfHpAbove', 'rageAtLeast', 'rageAtMost', 'firstUseOfSkill', 'selfStatus', 'selfTaunting', 'selfHasShield']);
/**
 * Faz 2c (Not Yet): hedefe bağlı bedel koşulları. Bedel hedefle ve savaş okumalarıyla hesaplanınca (Battle.canUse: geçerli hedeflerden en ucuzu;
 * ödeme: seçilen hedef) değerlendirilir; hedefsiz hesapta (önizleme, YZ, tooltip) tutmaz = tam bedel.
 */
export const COST_TARGET_CONDS: ReadonlySet<string> = new Set(['targetDiedSinceMyTurn']);

/**
 * ÖLÇEK SÖZLÜĞÜ: anahtar -> (bağlam, argüman) -> sayı (değişiklik bu sayıyla çarpılır; 0 = etkisiz). Argüman biçimi anahtarın yorumunda.
 */
export const SCALE: Record<string, (x: CondCtx, arg: unknown) => number> = {
  /** Hedefteki durumun kalan turu (argüman: durum). */
  targetStatusTurns: (x, a) => (x.target ? Math.max(0, ...x.target.statuses.filter((s) => s.kind === a).map((s) => s.turns), 0) : 0),
  /** Hedefteki yığın sayısı (argüman: durum, ör. 'omen'). */
  targetStatusStacks: (x, a) => stacksOf(x.target, a),
  /** Hedefin geçerli zırhı / argüman (argüman: kaç puan başına 1; ör. 1). */
  targetArmor: (x, a) => (x.target && x.host && num(a) ? Math.max(0, Math.floor(x.host.armorOf(x.target) / num(a)!)) : 0),
  /** Kendi zırhının eşik üstü (argüman { over, per }: (zırh - over) / per, aşağı yuvarlanır). */
  selfArmorOver: (x, a) => {
    const o = a as { over?: number; per?: number } | undefined;
    if (!x.host || !o || num(o.over) === undefined || !num(o.per)) return 0;
    return Math.max(0, Math.floor((x.host.armorOf(x.self as Combatant) - o.over!) / o.per!));
  },
  /** Bu skill'in hedefleri arasında durumlu olanların sayısı (argüman: durum ya da dizi). */
  hitWithStatus: (x, a) => (x.host?.castTargets() ?? []).filter((c) => c.hp > 0 && hasStatus(c, a)).length,
  /** Zırh auranın içindeki dost sayısı (argüman: true). */
  alliesInAura: (x) => (x.host ? x.host.alliesOf(x.self as Combatant).filter((a) => x.host!.inAura(x.self as Combatant, a)).length : 0),
  /** Canı oranın altındaki dost sayısı (kendin hariç; argüman: oran, ör. 0.5). */
  alliesHpBelow: (x, a) => (x.host && num(a) !== undefined ? x.host.alliesOf(x.self as Combatant).filter((c) => hpRatio(c) < num(a)!).length : 0),
  /** Eksik canın her `argüman` oranı için 1 (ör. 0.1 = her %10). */
  missingHp: (x, a) => (num(a) ? Math.max(0, Math.floor((1 - hpRatio(x.self)) / num(a)! + 1e-9)) : 0),
  /** Hedefin eksik canının her `argüman` oranı için 1 (ör. 0.02 = her %2). */
  targetMissingHp: (x, a) => (x.target && num(a) ? Math.max(0, Math.floor((1 - hpRatio(x.target)) / num(a)! + 1e-9)) : 0),
  /** Tutulan Rage / argüman (ör. 1 = Rage puanı başına). */
  selfRage: (x, a) => (num(a) && x.self.rage !== undefined ? Math.max(0, Math.floor(x.self.rage / num(a)!)) : 0),
  /** Sıra mesafesi / argüman (argüman: kaç sıra başına 1; ör. 1). */
  targetDistance: (x, a) => (x.target && x.host ? Math.max(0, Math.floor(x.host.distance(x.self as Combatant, x.target) / (num(a) || 1))) : 0),
  /** Kullanımın hedef sayısı (kullanım sonunda isabet eden) eksi argüman ({ minus } ya da sayı; "ilkten sonraki her biri" = 1). */
  hitCount: (x, a) => Math.max(0, (castCount(x) ?? 0) - (num(a) ?? num((a as { minus?: number } | undefined)?.minus) ?? 0)),
  /** Bu skill'i üst üste kaçıncı kullanışın (önceki ardışık kullanım sayısı; ilk = 0). */
  skillStreak: (x) => (x.host && x.skill ? x.host.skillStreak(x.self.uid, x.skill.id) : 0),
  /** Faz 5a (Overflowing Fate): son kullanımda çekilen yığın sayısı eksi argüman (ör. 3 = "3'ün ötesindeki her biri"). */
  gathered: (x, a) => (x.host ? Math.max(0, x.host.gathered(x.self.uid) - (num(a) ?? 0)) : 0),
  /** Double Hit zincirindeki sıra (0 = asıl vuruş). */
  repeatIndex: (x) => x.hit?.repeat ?? 0,
  /** Bu kullanımda ödenen can / argüman (argüman: kaç can başına 1; ör. 10). */
  hpPaidAmount: (x, a) => (x.cast && num(a) ? Math.max(0, Math.floor(x.cast.hpPaid / num(a)!)) : 0),
  /** DoT tiki: bu durumun bu hedefteki önceki tik sayısı (ilk tik 0). */
  dotTickIndex: (x) => x.tick?.index ?? 0,
  /** Altıncı tur (Gnawing Rot): DoT tikinin sıra numarası (ilk tik 1, ikinci 2...). */
  dotTickNumber: (x) => (x.tick?.index ?? 0) + 1,
  /** Bu kullanımda (şimdiye kadar) silinen buff sayısı. */
  buffsRemoved: (x) => x.cast?.buffsRemoved ?? 0,
  /** Bu skill'i son kullanımından beri yediğin düşman skill vuruşu sayısı. */
  hitsTakenSinceLastUse: (x) => (x.host && x.skill ? x.host.hitsTakenSinceUse(x.self.uid, x.skill.id) : 0),
  /** Faz 2c (Eagle Eye): Sharpshooter pasifinin bu hedefe O ANKİ bonusu (perRow x sıra mesafesi; ağaç yamaları dahil) x argüman (0.5 = yarısı). Pasif yoksa 0. */
  sharpshooterBonus: (x, a) => {
    const pe = x.self.passive?.effect;
    return pe?.type === 'longshot' && x.target && x.host && num(a) !== undefined ? pe.perRow * (x.host.distance(x.self as Combatant, x.target) + (pe.extraRows ?? 0)) * num(a)! : 0;
  },
  /** Faz 2c (Rooted Stance): üst üste Move yapmadığın eylem sayısı, en çok { max } (sayı argüman da max). */
  stillStreak: (x, a) => (x.host ? Math.min(num(a) ?? num((a as { max?: number } | undefined)?.max) ?? Infinity, x.host.stillStreak(x.self.uid)) : 0),
  /** Faz 4a (tetik): olayın miktarı / argüman, aşağı yuvarlanır (Blood Glut benzeri "her X başına"). */
  eventAmount: (x, a) => (x.amount !== undefined && num(a) ? Math.max(0, Math.floor(x.amount / num(a)! + 1e-9)) : 0),
};
/** Savaş bağlamı olmadan anlamlı ölçekler (bedel koşulu). */
export const SELF_SCALES: ReadonlySet<string> = new Set(['missingHp', 'selfRage']);

/** Koşul nesnesi tutuyor mu (boş / yok = tutar). Bilinmeyen anahtar = tutmaz (derleyici zaten reddeder). */
export function condHolds(when: CondWhen | undefined, x: CondCtx): boolean {
  if (!when) return true;
  for (const [k, arg] of Object.entries(when)) {
    if (k === 'not') {
      if (condHolds(arg as CondWhen, x)) return false;
      continue;
    }
    if (k === 'any') {
      if (!(arg as CondWhen[]).some((w) => condHolds(w, x))) return false;
      continue;
    }
    if (k === 'before') {
      // Faz 4c: içteki koşullar olaydan ÖNCEKİ hedefe bakar (anlık görüntü yoksa şimdiki hedef)
      if (!condHolds(arg as CondWhen, x.preTarget ? { ...x, target: x.preTarget } : x)) return false;
      continue;
    }
    const f = COND[k];
    if (!f || f(x, arg) !== true) return false;
  }
  return true;
}

/** Koşul nesnesi vuruş SONRASI bilgisine (hitIsCrit / killingBlow) bakıyor mu (derleyici kancaya `late` yazar). */
export function whenIsLate(when: CondWhen | undefined): boolean {
  if (!when) return false;
  return Object.entries(when).some(([k, v]) => k === 'hitIsCrit' || k === 'killingBlow' || ((k === 'not' || k === 'before') && whenIsLate(v as CondWhen)) || (k === 'any' && (v as CondWhen[]).some(whenIsLate)));
}

/** Ölçek sayısı (yok = 1). */
export function scaleOf(scale: CondScale | undefined, x: CondCtx): number {
  if (!scale) return 1;
  const [k, arg] = Object.entries(scale)[0] ?? [];
  const f = k ? SCALE[k] : undefined;
  return f ? f(x, arg) : 0;
}

/* ------------------------------------------------------------------ derlenmiş kancalar ------------------------------------------------------------------ */

/** C1 değişikliğinin eklediği / uzattığı durum (addStatus: vuruş sonrası; extendStatus: hedefteki durum). */
export interface ModStatus {
  status: string;
  turns: number;
  /** 0-1 (yoksa 1): alıcı başına bağımsız zar. */
  chance?: number;
  /** true: alıcı sahibin kendisi (Hedged Bet: kendine Fortified). */
  self?: boolean;
}
export interface ModExtend {
  /** Uzatılacak durum; '*' = hedefteki debuff'lardan seed'li rastgele biri (Let It Ride). */
  status: string;
  turns: number;
  chance?: number;
}

/**
 * C1 değişiklikleri (değerler derleyicide rank ile çarpılmış; ölçek motor anında çarpar). Grup ve uygulama yeri: MOD_SPEC.
 * Çarpan biçimli olanlar (…Mul) x (1 + v·ölçek): -1 = sıfırla (costMul -1 = bedelsiz). Set biçimliler (…Set) ölçekten bağımsız değeri koyar.
 */
export interface CondMod {
  // hasar (vuruş başına; önizleme + YZ + gerçek vuruş aynı yol)
  powerMul?: number;
  critBonus?: number;
  ignoreDefense?: number;
  lifesteal?: number;
  lifestealMul?: number;
  guaranteedCrit?: boolean;
  /** Kritik çarpanı x (1 + v) (Searing Crit +%6: 0.06). */
  critDmgMul?: number;
  /** İsabet zarı atılmaz (vuruş kesin isabet; blok yine olabilir). */
  sureHit?: boolean;
  /** Kritik olamaz (guaranteedCrit'i de bozar). */
  noCrit?: boolean;
  /** Şerit falloff'una düz ek (bu hedefin falloff'u: (falloff + v)^sıra). */
  falloffAdd?: number;
  /** Zırh ve çarpanlardan SONRA eklenen düz hasar (Blood Banshee: ölçek hpPaidAmount ile). */
  flatDamage?: number;
  /** Double Hit şansına düz ek (bu hedef için). */
  repeatChance?: number;
  /** Soul Drain (Vampiric Bite) şifası x (1 + v); drainAdd = pasif oranına düz ek. */
  drainMul?: number;
  drainAdd?: number;
  /** Faz 4c (Lifeline): Soul Drain şifasının tamamı Dark Bond'lu dosta gider. */
  drainBond?: boolean;
  /** Opportunist: pasif bonusuna düz ek (yalnız pasif bu hedefe işliyorsa); opportunist: hedef listede sayılır; opportunistAlt: alternatif bonus (büyük olan). */
  passiveBonus?: number;
  opportunist?: boolean;
  opportunistAlt?: number;
  /** Rage pasifinin (Berserker) maxBonus'una düz ek (Shared Scars). */
  maxBonus?: number;
  // durum uygulama noktası (sel status:<x>)
  turns?: number;
  chance?: number;
  /** Uygulanan durumun büyüklük eki (soru 14.7 cevabı): statuses.json alanına düz ek (accuracyDelta, critDelta, damageTakenMult, speedMult, healTakenMult, evasionDelta; Jinxed: attacks, keepChance). */
  statusPotency?: Record<string, number>;
  /** Uygulanan durum süresiz (permanent bayrağı; soru 14.16). */
  permanent?: boolean;
  // vuruş sonrası (isabet eden hedef başına)
  addStatus?: ModStatus;
  /** Hedefteki bu durumu sil (Mercy Stroke: Stun, Hobbled: Slow). */
  removeStatus?: string;
  extendStatus?: ModExtend;
  // kullanım sonu (bu kullanımın cooldown'u, Spell Echo)
  cooldownSet?: number;
  cooldownDelta?: number;
  echoChance?: number;
  echoSet?: number;
  /** Faz 4c (Endless Refrain): yankı şansı x (1 + v) (ekler ve sabitten SONRA). */
  echoMul?: number;
  /** Faz 4c (Time Fold): bu kullanımın tur bedeli (0-1; en küçüğü geçer; tetik buff'ı olarak). */
  turnCost?: number;
  // bahis zarı
  winChance?: number;
  winSet?: number;
  /** Bahis miktarı x (1 + v) (Sure Thing: -1 = bedelsiz bahis). */
  stakeMul?: number;
  // mana yakma noktası (hedef başına)
  manaBurnAdd?: number;
  manaBurnMul?: number;
  emptyChance?: number;
  emptySet?: number;
  // Omen ekleme noktası (hedef başına)
  omenStacks?: number;
  omenSet?: number;
  // Dark Bond kopyası
  /** Dark Bond kopya payına düz ek (pay + v, yüzde puan; Blood Kin). */
  bondRatio?: number;
  // Mana Overflow sayacı (sahibi vurulunca)
  blockedMul?: number;
  /** Faz 2c (at 'aura'): zırh aurasının bu alıcıya verdiği paya düz ek (pay + v; Braced Stance, Tight Formation, Weathered, Rooted Stance). */
  auraPct?: number;
}

/** Değişikliğin grubu: aynı kancadaki değişiklikler uyumlu gruplardan olmalı (damage + proc birlikte olabilir). */
export type ModGroup = 'damage' | 'status' | 'proc' | 'cast' | 'bet' | 'burn' | 'omen' | 'bond' | 'overflow' | 'aura';
/** Kancanın bağlantı yeri: 'hit' (skill vuruşu / durum uygulama; varsayılan) ya da vuruş dışı noktalar. */
export type HookAt = 'hit' | 'doom' | 'dot' | 'ground' | 'passiveHeal' | 'smite' | 'aura';

/** Değişiklik sözlüğü: tür + grup + izinli bağlantı yerleri (derleyici denetler; tam liste belgede). */
export const MOD_SPEC: Record<keyof CondMod, { t: 'num' | 'bool' | 'obj' | 'str'; g: ModGroup; at?: readonly HookAt[] }> = {
  powerMul: { t: 'num', g: 'damage', at: ['hit', 'doom', 'dot', 'ground', 'passiveHeal', 'smite'] },
  critBonus: { t: 'num', g: 'damage', at: ['hit', 'doom', 'smite'] },
  ignoreDefense: { t: 'num', g: 'damage', at: ['hit', 'doom', 'smite'] },
  lifesteal: { t: 'num', g: 'damage', at: ['hit', 'doom', 'dot', 'smite'] },
  lifestealMul: { t: 'num', g: 'damage', at: ['hit', 'smite'] },
  guaranteedCrit: { t: 'bool', g: 'damage', at: ['hit', 'doom', 'smite'] },
  critDmgMul: { t: 'num', g: 'damage', at: ['hit', 'doom', 'smite'] },
  sureHit: { t: 'bool', g: 'damage', at: ['hit', 'smite'] },
  noCrit: { t: 'bool', g: 'damage', at: ['hit', 'doom', 'smite'] },
  falloffAdd: { t: 'num', g: 'damage' },
  flatDamage: { t: 'num', g: 'damage', at: ['hit', 'smite'] },
  repeatChance: { t: 'num', g: 'damage' },
  drainMul: { t: 'num', g: 'damage' },
  drainAdd: { t: 'num', g: 'damage' },
  drainBond: { t: 'bool', g: 'damage' },
  passiveBonus: { t: 'num', g: 'damage' },
  opportunist: { t: 'bool', g: 'damage' },
  opportunistAlt: { t: 'num', g: 'damage' },
  maxBonus: { t: 'num', g: 'damage' },
  turns: { t: 'num', g: 'status' },
  chance: { t: 'num', g: 'status' },
  statusPotency: { t: 'obj', g: 'status' },
  permanent: { t: 'bool', g: 'status' },
  addStatus: { t: 'obj', g: 'proc', at: ['hit', 'passiveHeal', 'smite'] },
  removeStatus: { t: 'str', g: 'proc' },
  extendStatus: { t: 'obj', g: 'proc' },
  cooldownSet: { t: 'num', g: 'cast' },
  cooldownDelta: { t: 'num', g: 'cast' },
  echoChance: { t: 'num', g: 'cast' },
  echoSet: { t: 'num', g: 'cast' },
  echoMul: { t: 'num', g: 'cast' },
  turnCost: { t: 'num', g: 'cast' },
  winChance: { t: 'num', g: 'bet' },
  winSet: { t: 'num', g: 'bet' },
  stakeMul: { t: 'num', g: 'bet' },
  manaBurnAdd: { t: 'num', g: 'burn' },
  manaBurnMul: { t: 'num', g: 'burn' },
  emptyChance: { t: 'num', g: 'burn' },
  emptySet: { t: 'num', g: 'burn' },
  omenStacks: { t: 'num', g: 'omen' },
  omenSet: { t: 'num', g: 'omen' },
  bondRatio: { t: 'num', g: 'bond' },
  blockedMul: { t: 'num', g: 'overflow' },
  auraPct: { t: 'num', g: 'aura', at: ['aura'] },
};
/** Set biçimli değişiklikler: rank / ölçekle çarpılmaz. */
export const SET_MODS: ReadonlySet<string> = new Set(['cooldownSet', 'echoSet', 'winSet', 'emptySet', 'omenSet', 'turnCost']);
/** Uygulanan durum büyüklüğünün (statusPotency) izinli alanları. */
// Altıncı tur (Weakened): damageDealtMult / magicDealtMult (verilen hasar çarpanlarına düz ek), oneAttack (> 0: bu örnek taşıyanın sıradaki hasar skill'inden sonra düşer)
export const POTENCY_FIELDS: ReadonlySet<string> = new Set(['accuracyDelta', 'evasionDelta', 'critDelta', 'damageTakenMult', 'speedMult', 'healTakenMult', 'armorMult', 'attacks', 'keepChance', 'damageDealtMult', 'magicDealtMult', 'oneAttack']);

export interface CondHook {
  h: 'cond';
  /** Düğüm kimliği '<class>:<anahtar>' (ölçüm). */
  node: string;
  /** Yalnızca bu skill'de (yoksa her skill: pasif satırı, Mastery bar). */
  skill?: string;
  /** Etki seçicisi: 'damage' | 'damage:N' | 'status' | 'status:<durum>'; yoksa değişikliğe göre (status grubu -> status, diğerleri -> damage). */
  sel?: string;
  /** Bağlantı yeri (yoksa 'hit'). */
  at?: HookAt;
  when?: CondWhen;
  scale?: CondScale;
  /** 0-1: kanca tutunca bu şansla işler (yalnızca gerçek uygulamada zar atılır; önizleme saymaz). Hasar grubu kancalarında yok. */
  procChance?: number;
  /** Koşul vuruş SONRASI bilgisine bakıyor (hitIsCrit / killingBlow): kanca vuruş sonrası değerlendirilir (derleyici yazar). */
  late?: boolean;
  mod: CondMod;
}

/** C2 Rage kancası. `on: 'hit'` = skill'in isabet eden her vuruşunda (koşul vuruştan ÖNCE hedefe bakar); `cast` = skill kullanımı bitince. */
export interface RageHook {
  h: 'rage';
  node: string;
  skill?: string;
  on?: 'hit' | 'cast';
  /** Düz Rage (x ölçek). */
  gain?: number;
  /** Rage tabanı: Rage = max(Rage, floor). */
  floor?: number;
  /** Savaşta bir kez (ilk tetiklenme). */
  once?: boolean;
  when?: CondWhen;
  scale?: CondScale;
  /** 'tallyAll': skill'in Rage kazancı yalnız en iyi hedeften değil TÜM vurulanlardan (perCastCap aynen; Reaping Wind). */
  rule?: 'tallyAll';
}

/**
 * C6 KURALLARI (Faz 2c noMove; Faz 5a tam sözlük; belge "Faz 5a notları"). Kural kancası sahibinde kalıcıdır; `when` (C1 sözlüğü, bağlam self = sahip,
 * target = olayın karşı tarafı) verilirse kural yalnızca koşul tutarken işler. Hiçbiri ağaçsız savaşta okunmaz.
 *  - noMove / noTaunt: Move global eylemi / taunt durumu veren skill kullanılamaz (`while: 'guarding'` = sahibin Guard'ı bir dostta sürerken).
 *  - immune: `statuses` sahibine işlemez; `pull: true` çekilme / itilme bağışıklığı.
 *  - shorten: sahibine gelen `statuses` `by` tur kısa (0'a inerse hiç işlemez; Iron Will: 1 turluk Stun düşer).
 *  - cheatDeath: ölümcül hasar sahibini `hp` (varsayılan 1) canda bırakır (`hpRatio` = maks canın oranı); `once` savaşta bir kez, `below` yalnızca
 *    can oranı altındayken, `notCrit` kritik vuruşta işlemez, `ready` o skill'in cooldown'u yokken, `rage` her kurtarışta Rage değişimi, `do` kurtarış
 *    sonrası tetik eylemleri (target / source = öldürecek olan).
 *  - intercept: `scope` 'guarded' (sahibin korunanı) / 'bonded' (bağlı dost) ölümcül vuruşu sahip alır (`once`).
 *  - split: sahibin korunanına gelen hasar tüm korunanlar + sahip arasında eşit bölünür (Phalanx).
 *  - ward: `skill` kullanıldıktan sonra sahibin sıradaki turuna kadar debuff işlemez.
 *  - pierce: sahibin `skill` vuruşları hedefte `statuses` (alınan hasar çarpanı) ve `shields` kalkanı yok sayar.
 *  - luck: Lucky Escape şansına düz ek (`add`).
 *  - repeatChain: Double Hit tutunca aynı şansla yeniden zarlanır (zincir; motor güvenlik sınırı 8).
 *  - actions: (çağrı) tur başına `n` eylem.
 *  - guardBehind: (çağrı) hemen arkasındaki dostu `share` payla korur (konumla Guard).
 *  - resummon: `skill` çağrısı sahibin aynı çağrısı sahadayken atılırsa eski çağrı hemen ölür; ölüm tetikleri `mult` kat güçlü.
 *  - fedNoCorpse: ceset yokken ceset tüketen çağrı `cost` ek MP ile yine beslenmiş çağırır (MP yetmezse beslenmemiş).
 *  - rest: global Rest eyleminin MP'si x `mult` (Spendthrift: 0,5).
 *  - turnedHand (Faz 5c, Hexer Turned Hand): sahibin verdiği Jinxed'i taşıyan düşmanın sıradaki saldırısı (hasar skill'i, hedefleri karşı tarafta)
 *    YZ'nin seçtiği hedef yerine kendi dostlarından seed'li rastgele birine (kendisi hariç) tek hedef olarak iner; dostu yoksa saldırı normal.
 */
export const RULE_KINDS = ['noMove', 'noTaunt', 'immune', 'shorten', 'cheatDeath', 'intercept', 'split', 'ward', 'pierce', 'luck', 'repeatChain', 'actions', 'guardBehind', 'resummon', 'fedNoCorpse', 'rest', 'turnedHand'] as const;
export type RuleKind = (typeof RULE_KINDS)[number];
export interface RuleHook {
  h: 'rule';
  node: string;
  rule: RuleKind;
  when?: CondWhen;
  while?: 'guarding';
  statuses?: string[];
  pull?: boolean;
  by?: number;
  once?: boolean;
  hp?: number;
  hpRatio?: number;
  below?: number;
  notCrit?: boolean;
  rage?: number;
  ready?: string;
  do?: TriggerAction[];
  scope?: 'guarded' | 'bonded';
  shields?: boolean;
  add?: number;
  skill?: string;
  n?: number;
  share?: number;
  mult?: number;
  cost?: number;
}

/* ------------------------------------------------------------- Faz 4a: C3 tetik + C4 şifa / kalkan / alınan hasar ------------------------------------------------------------- */

/**
 * C3 TETİK OLAYLARI (olay -> eylem). Her olayın dinleyicisi (kancanın sahibi), bağlamdaki `target`ı ve miktarı belgede (Faz 4a notları).
 * Tetikler YALNIZCA ağaçlı savaşta ve tetik kancası taşıyan birimde dinlenir; ağaçsız savaşta hiçbir nokta çalışmaz.
 */
export const TRIGGER_EVENTS = [
  'battleStart', 'turnStart', 'kill', 'enemyDied', 'allyFell', 'statusGained', 'statusApplied', 'statusEnd', 'hpBelow', 'mpBelow', 'skillUse',
  'echo', 'echoFail', 'jackpot', 'bust', 'luckyEscape', 'manaOverflow', 'crit', 'hit', 'hitTaken', 'allyHit', 'dodge', 'enemyMissed',
  'shieldAbsorb', 'shieldBreak', 'doom', 'dotTick', 'passiveHeal', 'skip', 'enemyMoved', 'enemyBuffed', 'enemyHealed', 'payHp', 'dispel',
  'mpEmptied', 'manaBurned', 'revived', 'repeat',
  // Faz 4c: zemin bitişi (sahip = zemini bırakan), çağrı öldü / süresi doldu (sahip = çağıran), çağrı sahaya indi (sahip = çağrının kendisi),
  // Double Hit zarı tutmadı, Mana Overflow bir dostu MP'ye doldurdu (sahip = Anti-Mage, hedef = dost)
  'groundEnd', 'summonDeath', 'arrive', 'repeatFail', 'allyFilled',
] as const;
export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

/** Eylemin alıcısı (yoksa 'self'). */
export const TRIGGER_TARGETS = [
  'self', 'target', 'subject', 'source', 'allEnemies', 'allAllies', 'otherAllies', 'randomEnemy', 'lowestHpAlly', 'lowestMpAlly', 'lowestHpEnemy',
  'highestHpEnemy', 'nearestEnemy', 'neighbors', 'castTargets', 'bonded', 'auraAllies',
  // Faz 4c: öznenin yanındaki (dört yön) TEK düşman (eşitlikte küçük hücre; Plague Curse), en yakın `count` düşman (tahta fark etmez; Splinter
  // Burst), öznenin (çağrının) en son vurduğu düşman (Pox Bloom), zeminin içinde duran düşmanlar (groundEnd; Day of Judgment), sahibin kendisi
  // dışındaki en düşük canlı dost (Spell Sink)
  'adjacentEnemy', 'nearestEnemies', 'lastHit', 'inGround', 'lowestHpOtherAlly',
  // Faz 5a (C5): öznenin "beside" komşuları (aynı sıra yan şerit, katalog 14.30), hemen arkasındaki birim, sırasındaki diğerleri, bu kullanımın alanı
  // dışındaki düşmanlar, alanın ön sırasındaki hedefler, alandaki en düşük (mevcut) canlı hedef, alandan rastgele hedef, savaşta sahibe en çok hasar
  // veren düşman, düşmanın ön `rows` sırası (çağrı inişi), öznenin karşısındaki (aynı şerit, en öndeki) düşman, sahip + yanındaki dostlar, mevcut
  // canı en düşük düşman ("en zayıf", katalog 14.3)
  'beside', 'behind', 'rowMates', 'outsideArea', 'castFront', 'lowestHpInCast', 'randomInCast', 'mostHurtMe', 'enemyFront', 'facing', 'selfBeside', 'weakestEnemy',
  // Faz 5a (Spreading Spite): olayın kaynağının (öldürenin) dört yön komşuları
  'sourceNeighbors',
  // Altıncı tur (Rot Bomb): bu olayda sahibin tetikle bıraktığı zeminlerin içinde duran düşmanlar
  'placedGround',
] as const;
export type TriggerTarget = (typeof TRIGGER_TARGETS)[number];

/** Eylem miktarının tabanı (yoksa eyleme göre: şifa / kalkan / can kaybı 'maxHp'). */
export const TRIGGER_BASES = [
  'maxHp', 'ownerMaxHp', 'targetMaxHp', 'currentHp', 'ownerCurrentHp', 'armor', 'ownerArmor', 'amount', 'hpPaid', 'stake', 'prevented',
  // Faz 4c: kırılan kalkanın ilk boyu (Second Ward), aura zırh bonusu (Fortress Aura), olayın verdiği hasar (Domino: öldüren vuruş; Overcharged
  // Doom: Doom hasarı), olaydaki zeminin tik gücü (Undying Flame, Wildfire Verdict), biten durumun ilk şifası (Lifebloom), ölenin yığını (Passing Bell)
  'shieldSize', 'auraBonus', 'dealt', 'ground', 'firstHeal', 'stacks',
] as const;
export type TriggerBase = (typeof TRIGGER_BASES)[number];

/**
 * C3 eylemi: TEK ana anahtar (heal / shield / status / removeStatus / damage / rage / mp / hpLoss / cooldown / sooner / buff / free / clear / charge)
 * + yardımcı alanlar. Sayılar derleyicide rank'la çarpılmış (fx rank: true). Alıcı `to` (yoksa self).
 */
export interface TriggerAction {
  to?: TriggerTarget;
  /** Şifa: taban x oran (taban `of`, yoksa alıcının maks canı). */
  heal?: number;
  /** Kalkan: taban x oran (taban `of`); `turns` verilirse süreli katman, `magic` büyü kalkanı. */
  shield?: number;
  of?: TriggerBase;
  turns?: number;
  magic?: boolean;
  /** Durum ekle (kaynak = sahip; `turns`, `chance`, yığılan durumda `stacks`; DoT'ta `power` x `stat` miktarı). */
  status?: string;
  stacks?: number;
  chance?: number;
  power?: number;
  stat?: string;
  /** Alıcıdaki durumu sil. */
  removeStatus?: string;
  /** Hasar: sahibin `stat` gücü x oran (zırh / alınan hasar uygulanır) ya da `of: 'amount'` olay miktarı x oran (düz). */
  damage?: number;
  damageType?: 'physical' | 'magic';
  element?: string;
  /** Rage / MP kazancı (düz). */
  rage?: number;
  mp?: number;
  /** Alıcı can kaybeder: taban x oran (kalkan emmez, öldürmez: en az 1 can kalır). */
  hpLoss?: number;
  /** Cooldown: sayı = delta (eksi = erken), 'reset' = sıfırla. Hangi skill: `cd` ('event' olayın skill'i, 'all', 'others', 'longest', skill id); yoksa kancanın skill'i, o da yoksa olayın skill'i. */
  cooldown?: number | 'reset';
  cd?: string;
  /** Sıradaki tur erken gelir (Skip Turn hız desteği: hız + oran, birimin sıradaki turuna kadar; turns modu). */
  sooner?: number;
  /** Güç geçici değişikliği (CondMod; hasar / durum / proc / cast / bet grupları): `uses` sonraki N skill kullanımı (varsayılan 1; 0 = savaş sonuna kadar), `turns` sahibin N turu, `skill` yalnızca o skill ('event' = olayın skill'i), `stack` tetik başına birikir. */
  buff?: CondMod;
  uses?: number;
  skill?: string;
  stack?: boolean;
  /** Sonraki skill bedelsiz (HP / MP / Rage; `uses` kadar, varsayılan 1). */
  free?: boolean;
  /** Düğümün birikmiş buff'ını ve sayacını sil (true = bu düğüm; dize = o düğüm anahtarı, ör. 'bar[2]'). */
  clear?: true | string;
  /** Mana Overflow sayacına düz ek (Anti-Mage pasifi; sayaç eşiği aşarsa pasif bir sonraki vuruşta işler). */
  charge?: number;
  // ---- Faz 4c ----
  /**
   * Bedava kullanım (freeCast): sahibin bu skill'i ('event' = olayın skill'i) bedelsiz, cooldown'suz ve tur harcamadan kullanılır; hedef = `to`
   * alıcısı (alan skill'inde hücresi merkez; yoksa olayın kullanım merkezi). `power` güç çarpanı (varsayılan 1), `crit` kesin kritik, `mod` ek C1
   * değişikliği (Thicket Wave: Stun). `delay` = sahibin N. tur başında (gecikmeli vuruş: aynı hücreler). `noChain` = bu kullanım aynı düğümü
   * yeniden tetiklemez. Kullanım, sürmekte olan eylem bittikten sonra sırayla çalışır (zincir koruması).
   */
  cast?: string;
  crit?: boolean;
  mod?: CondMod;
  delay?: number;
  noChain?: boolean;
  /** Zemin bırak (grounds.json id'si): alıcıların hücrelerine (`to: 'subject'` ölenin hücresi). Tik gücü `of` (ground = olaydaki zeminin gücü) x `power`, ya da sahibin `stat` gücü x `power`. `permanent` süresiz. */
  ground?: string;
  permanent?: boolean;
  /** Doom (Hexer): alıcıya `doom` x taban (`of`: stacks = ölenin yığını, amount = olayın Doom büyüklüğü) Omen'lik Doom patlar (sahibin canlı statıyla). */
  doom?: number;
  /** Ölenin (olaydaki durumlardan) bu durumu kalan süresi ve gücüyle alıcıya geçer (Creeping Blight). */
  spread?: string;
  /** Sahibin alıcıyı Guard'lar (pay; sahibin sıradaki turuna kadar). */
  guard?: number;
  /** Mana Overflow hemen tetiklenir (sayaç sıfırlanır; Overflow Strike). */
  overflow?: true;
  /** İşaret: sahip + düğüm için alıcı işaretlenir (`until`: 'turn' = alıcının sıradaki tur başına kadar, 'hit' = ilk vuruşu yiyene kadar). */
  mark?: true;
  until?: 'turn' | 'hit';
  /** removeStatus: yalnızca BU düğümün verdiği örnek silinir (kaynağa göre silme; Bastion Cry). */
  node?: boolean;
  /** nearestEnemies alıcısının sayısı. */
  count?: number;
  /** damage: sahibin sınıf pasifinin hasar eki (Opportunist) uygulanır. */
  passive?: boolean;
  // ---- Faz 5a ----
  /**
   * Ek vuruş (C5): sahibin `skill` ('event' / yoksa olayın skill'i) İLK hasar etkisiyle alıcıya gerçek bir vuruş (isabet / kritik / zırh / tetikler),
   * güç x oran; `hits` kez (varsayılan 1), `pierce` zırh yok sayar (X Marks the Throat).
   */
  strike?: number;
  hits?: number;
  pierce?: boolean;
  /** ground: zemin alıcının "beside" hücrelerine de yayılır (Spore Cloud). */
  wide?: 'beside';
  /** enemyFront alıcısının sıra sayısı (varsayılan 1; Oakfall 2). */
  rows?: number;
  /** damage: sahibin değil çağıranın statı (çağrının kancasında; Crashing Arrival). */
  summoner?: boolean;
  /** strike: vurulanın yanındaki (beside) henüz vurulmamış düşmana sıçrayarak toplam N kesik (Carving Arc). */
  chain?: number;
  /** strike (Faz 5c, Returning Cards): ek vuruş isabet edince skill'in randomStatus zarı o hedefe yeniden atılır (yeni, bağımsız zar). */
  rollStatus?: boolean;
  /** Alıcı süzgeci: alıcıda bu durum olmalı (Plague Tide: Omen'i olanlar). */
  ifStatus?: string;
  /** Alıcı süzgeci: MP bedelli skill'i olan ("caster"; Mark of Silence). */
  caster?: boolean;
  /** Alıcının (varsayılan target) tüm buff'larını söker, sahibin takımına sırayla dağıtır (Grand Theft). */
  steal?: boolean;
  /** Skill'in (skill / olayın skill'i) yenilenmesini (hot) alıcıya oranla verir (Spreading Roots). */
  hot?: number;
  /** Son Divine Light smite'ını aynı güçle hemen yeniden atar (Chain of Light). */
  smite?: boolean;
  /** Alıcı süzgeci: MP'si 0 olanlar (Mass Hush). */
  ifMpZero?: boolean;
  // ---- Altıncı tur ----
  /** Alıcı süzgeci: olayın hedefi seçilemez (Split Ward / Verdant Link: ikinci alıcı hep başka bir dost; yoksa eylem yok). */
  notTarget?: boolean;
  /** strike: her kesik isabet edince vurulana bu durumu verir (Carving Arc: zincirdeki her kesik Wound). */
  cutStatus?: { status: string; turns: number };
  /** Alıcıdaki bu DoT durumunun kalan tiklerinin hepsi bir anda vurur (tik miktarı x kalan tur), durum biter (Rot Bomb: 'wither'). */
  detonate?: string;
}

/**
 * C3 tetik kancası. Süzgeçler: `skill` (olayın skill'i), `status` (olayın durumu), `ground` (ölenin durduğu zemin), `end` (durum bitişi), `mine`
 * (durum sahibin uyguladığı), `who` (olayın öznesi: self / ally / any / bonded / aura), `below` (can / MP eşiği), `via` (öldürme yolu), `resource`
 * (bahis / bedel kaynağı), `near` (yürüyen düşmanın uzaklığı). Sıklık: `every` (her N. olayda), `once` (savaşta / hedef başına / tur başına /
 * kalkan başına bir kez), `procChance` (seed'li zar). `when` / `scale` ortak sözlük (bağlam: self = sahip, target = olayın hedefi, amount = miktar).
 */
export interface TriggerHook {
  h: 'trigger';
  node: string;
  on: TriggerEvent;
  skill?: string;
  status?: string;
  ground?: string;
  end?: 'broken' | 'expired' | 'dispelled';
  mine?: boolean;
  who?: 'self' | 'ally' | 'any' | 'bonded' | 'aura';
  below?: number;
  via?: 'skill' | 'dot' | 'doom' | 'ground' | 'leap' | 'smite';
  resource?: 'hp' | 'mp';
  near?: number;
  /** Faz 4c: çağrı süzgeci (summonDeath: çağrının id'si, ör. 'treant'). */
  unit?: string;
  /** Faz 4c: durumu veren skill (statusEnd; Herald of Ruin: Charge'ın Stun'u). */
  fromSkill?: string;
  /** Faz 4c: işaret süzgeci (enemyDied: ölen bu düğümün işaretini taşıyor). */
  marked?: boolean;
  /** Faz 4c: öldürenin kim olduğu (enemyDied): 'ally' = sahibin dostu (sahip hariç), 'self', 'team' (sahip dahil). */
  by?: 'ally' | 'self' | 'team';
  every?: number;
  once?: true | 'perTarget' | 'perTurn' | 'perShield';
  /** Faz 5a: kullanım başına en çok N ateş (Endless Knives: 2). */
  perCast?: number;
  procChance?: number;
  when?: CondWhen;
  scale?: CondScale;
  do: TriggerAction[];
}

/** C4 noktaları: alınan / verilen şifa çarpanı, fazla şifanın dönüşümü, alınan hasar çarpanı, büyük vuruş indirimi, Guard payı, verilen kalkan. */
export const HEAL_POINTS = ['healTaken', 'healDealt', 'overheal', 'overhealDealt', 'damageTaken', 'bigHit', 'guardShare', 'shieldDealt'] as const;
export type HealPoint = (typeof HEAL_POINTS)[number];

/**
 * C4 kancası. `mul`: çarpan x (1 + mul x ölçek) (healTaken / healDealt / damageTaken / bigHit / guardShare / shieldDealt). `into` (overheal /
 * overhealDealt): fazla şifa 'shield' (miktar x ratio, `turns` süreli) ya da 'rage' (maks canın %1'i başına ratio Rage); `cap` verilirse fazla =
 * canı bu oranın üstüne çıkaracak kısım (Red Line). `who` (damageTaken: hasarı alan self / ally / team), `status` + `mine` (alanın durumu),
 * `shield` (alanda sahibin bu skill'inden kalkan katmanı), `min` (bigHit: vuruş maks canın en az bu oranı), `skill` (healDealt / overhealDealt /
 * shieldDealt: sahibin skill'i; overheal: şifayı veren skill).
 */
export interface HealHook {
  h: 'heal';
  node: string;
  on: HealPoint;
  skill?: string;
  /**
   * damageTaken: hasarı alan self / ally / team (sahibin tarafı). Ömer 2026-10-24 (Paladin Wildfire Verdict): 'foe' = sahibin KARŞI tarafındaki
   * birim; yalnızca sahibin tarafındaki bir saldıranın (sahip, dostları, çağrıları) vuruşunda işler (karşı tarafın kendi / dost hasarı sayılmaz).
   * Saldıransız hasar (zemin / DoT tikleri, Doom) zaten damageTaken çarpanından geçmez.
   */
  who?: 'self' | 'ally' | 'team' | 'foe';
  /** Ömer 2026-10-24 (damageTaken): alan, sahibin TARAFININ bıraktığı bu zeminin hücresinde duruyor (Wildfire Verdict: holy_fire). */
  ground?: string;
  status?: string;
  mine?: boolean;
  shield?: string;
  min?: number;
  /** Faz 4c (damageTaken): alan, bu düğümün işaretini taşıyor (Iron Return: dirilenin ilk vuruşu; işaret vuruşta harcanır). */
  marked?: boolean;
  mul?: number;
  into?: 'shield' | 'rage';
  ratio?: number;
  turns?: number;
  cap?: number;
  when?: CondWhen;
  scale?: CondScale;
}

export type TreeHook = CondHook | RageHook | RuleHook | TriggerHook | HealHook;

/** Faz 4a: geçici güç / bedelsizlik (tetik eylemi buff / free). `pending`: sahibin sürmekte olan kullanımında kazanıldı (o kullanıma işlemez). */
export interface TreeBuff {
  node: string;
  mod?: CondMod;
  free?: boolean;
  skill?: string;
  /** Kalan kullanım (yoksa sınırsız). */
  uses?: number;
  /** Kalan tur (sahibin tur başında azalır; yoksa sınırsız). */
  turns?: number;
  /** Birikim (stack: tetik başına +1). */
  s: number;
  pending?: boolean;
}

/** Bedel koşulu (SkillCost.cond; yamalı skill tanımında): koşul tutarsa bedele `add` x ölçek eklenir (tam sayı, en az 0), `mul` varsa x (1 + mul). */
export interface CostCond {
  node: string;
  add: number;
  /** Bedel çarpanı: x (1 + mul) (-1 = bedelsiz: Formed Up). */
  mul?: number;
  /** Koşulun skill'i (firstUseOfSkill için). */
  skill?: string;
  when?: CondWhen;
  scale?: CondScale;
  /** Silahlanma: yalnızca bu skill kullanıldıktan sonraki İLK ödemede (Into the Fire). Durum Combatant.treeArmed. */
  after?: string;
}
/** Faz 2c: bedelin hedefe bağlı hesabı (COST_TARGET_CONDS): hedef + savaş okumaları. Yoksa hedef koşulları tutmaz. */
export interface CostEnv {
  target?: Combatant;
  host?: CondHost;
}

/** Ölçüm olayı (Battle.onTreeProc; olay akışına / kayda girmez). */
export interface TreeProcEvent {
  type: 'treeProc';
  uid: string;
  node: string;
}

/** Bedel koşullarının toplam eki ve çarpanı (cost.ts; savaş bağlamı yok: SELF_CONDS / SELF_SCALES). Koşul yoksa { add: 0, mul: 1 }. */
export function costCondEffect(cost: SkillCost, user: CondCtx['self'] | undefined, env?: CostEnv): { add: number; mul: number } {
  if (!cost.cond?.length || !user || user.maxHp === undefined) return { add: 0, mul: 1 };
  let add = 0;
  let mul = 1;
  for (const c of cost.cond) {
    if (c.after && !user.treeArmed?.includes(c.node)) continue;
    const x: CondCtx = { self: user, ...(c.skill ? { skillId: c.skill } : {}), ...(env?.target ? { target: env.target } : {}), ...(env?.host ? { host: env.host } : {}) };
    if (!condHolds(c.when, x)) continue;
    const s = scaleOf(c.scale, x);
    add += c.add * s;
    if (c.mul !== undefined && s) mul *= Math.max(0, 1 + c.mul * s);
  }
  return { add: Math.round(add), mul };
}
/** Geriye uyum: yalnızca düz ek. */
export const costCondAdd = (cost: SkillCost, user: CondCtx['self'] | undefined): number => costCondEffect(cost, user).add;

/** Etki seçicisi bu etkiye uyuyor mu (`index`: etkinin skill'deki hasar etkileri arasındaki sırası; damage değilse -1). */
export function selMatches(sel: string, effect: SkillEffect, damageIndex: number): boolean {
  const [head, arg] = sel.split(':');
  if (head === 'damage') return effect.type === 'damage' && (arg === undefined || Number(arg) === damageIndex);
  if (head === 'status') return effect.type === 'status' && (arg === undefined || effect.status === arg);
  return false;
}

/** Kancanın değişiklik grupları. */
export const modGroups = (mod: CondMod): Set<ModGroup> => new Set(Object.keys(mod).map((k) => MOD_SPEC[k as keyof CondMod]?.g).filter((g): g is ModGroup => !!g));
/** Değişikliğin varsayılan seçicisi (status grubu -> 'status', diğerleri 'damage'). */
export const defaultSel = (mod: CondMod): string => (modGroups(mod).has('status') ? 'status' : 'damage');

/** Motorun kanca sorgusu (Battle.treeMods / heldHooks): bağlantı yeri, evre, vuruş / tik bilgisi, zar izni. */
export interface TreeQuery {
  at?: HookAt;
  /** false = vuruş öncesi kancalar, true = vuruş sonrası koşullu (hitIsCrit / killingBlow); undefined = ikisi de (proc grubu). */
  late?: boolean;
  crit?: boolean;
  killed?: boolean;
  hit?: HitInfo;
  tick?: TickInfo;
  /** true: procChance'lı kancalar için zar atılır (yalnızca gerçek uygulama noktası); false / yok: o kancalar sayılmaz. */
  roll?: boolean;
}

/** Hasar + durum grubunun birikimi (Battle.treeMods). */
export interface TreeModAcc {
  power: number;
  critBonus: number;
  ignoreDefense: number;
  lifesteal: number;
  lifestealMul: number;
  guaranteedCrit: boolean;
  sureHit: boolean;
  noCrit: boolean;
  critDmg: number;
  falloffAdd: number;
  flat: number;
  repeat: number;
  drainMul: number;
  drainAdd: number;
  drainBond?: boolean;
  turns: number;
  chance: number;
  potency?: Record<string, number>;
  permanent: boolean;
  nodes: string[];
}
export const newModAcc = (): TreeModAcc => ({ power: 1, critBonus: 0, ignoreDefense: 0, lifesteal: 0, lifestealMul: 1, guaranteedCrit: false, sureHit: false, noCrit: false, critDmg: 1, falloffAdd: 0, flat: 0, repeat: 0, drainMul: 1, drainAdd: 0, turns: 0, chance: 0, permanent: false, nodes: [] });
