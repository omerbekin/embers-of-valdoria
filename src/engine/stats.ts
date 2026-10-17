import type { Attribute, Attributes, CombatantData, CombatantDef, Element, Formulas, Stats, SummonVariants, UnitModifiers } from './types';

/** Primary bonusu aktif mi: primary stat, dört statın en yükseğine eşit veya üstündeyse (eşitlik dahil). */
export function isPrimaryActive(attrs: Attributes, primary: Attribute | undefined): boolean {
  if (!primary) return false;
  return attrs[primary] >= Math.max(attrs.str, attrs.int, attrs.dex, attrs.luck);
}

/**
 * Hız yuvarlaması (Ömer 2026-10-17, gizli x2 stat ölçeği kaldırıldı): hız değerleri `formulas.json > attributes.spdStep` katına yuvarlanır
 * (yoksa 1 = tam sayı). Oyuncunun gördüğü hız motorun kullandığı hızdır; adım yalnızca sıra çizelgesini bugünkü hâliyle korumak için veride.
 */
export function roundSpeed(v: number, formulas: Pick<Formulas, 'attributes'>): number {
  const s = formulas.attributes.spdStep ?? 1;
  return Math.round(v / s) * s;
}

/** Hızın alt sınırı: bir hız adımı. */
export const speedMin = (formulas: Pick<Formulas, 'attributes'>): number => formulas.attributes.spdStep ?? 1;

/** Kaçınma (evasion): tam sayı adımlı (her dexPerEvasionStep Dex = +evasionPerStep), evasionMax üst sınırlı. */

export function evasionOf(dex: number, formulas: Formulas): number {
  const a = formulas.attributes;
  const steps = Math.floor(Math.max(0, dex) / a.dexPerEvasionStep);
  // Tam sayı yüzde adımı: kayan nokta artığı olmasın
  return Math.min(a.evasionMax, Math.round(steps * a.evasionPerStep * 10000) / 10000);
}

/** İsabet (accuracy): taban + Luck başına artış; negatife düşmez. */
export function accuracyOf(luck: number, formulas: Formulas, base?: number): number {
  const a = formulas.attributes;
  return Math.max(0, (base ?? a.accuracyBase) + a.accuracyPerLuck * luck);
}

/** Bir vuruşun isabet şansı (0-1): saldırganın accuracy'si - hedefin evasion'ı, [0, hit.max] arasında (alt sınır yok: %0 olabilir). */
export function hitChance(attacker: Pick<Stats, 'accuracy'>, defender: Pick<Stats, 'evasion'>, formulas: Formulas): number {
  return Math.min(formulas.hit.max, Math.max(0, attacker.accuracy - defender.evasion));
}

/**
 * Bir vuruşun üç sonucu, TEK zardan (r): r < hit şansı = 'hit'; hit şansı <= r < accuracy = 'dodge' (hedefin kaçınması yüzünden: accuracy yeterdi,
 * evasion düşürdü); r >= accuracy = 'miss' (saldıranın isabeti yetmedi). Olasılıklar: dodge = accuracy - hit şansı, miss = 1 - accuracy.
 */
export type HitOutcome = 'hit' | 'dodge' | 'miss';

export function hitOutcome(attacker: Pick<Stats, 'accuracy'>, defender: Pick<Stats, 'evasion'>, formulas: Formulas, roll: number): HitOutcome {
  const hit = hitChance(attacker, defender, formulas);
  if (roll < hit) return 'hit';
  const accuracy = Math.min(formulas.hit.max, Math.max(0, attacker.accuracy));
  return roll < accuracy ? 'dodge' : 'miss';
}

/** Temel özelliklerden türev stat'ları hesaplar (can, mana, hız, yenilenmeler, kritik, isabet, kaçınma, primary bonusu). */
export function deriveStats(data: CombatantData, formulas: Formulas): Stats {
  const a = formulas.attributes;
  const { str, int, dex, luck } = data.attributes;
  const active = isPrimaryActive(data.attributes, data.primary);
  const bonus = formulas.primaryBonus;
  const derived: Stats = {
    str,
    int,
    dex,
    luck,
    hp: Math.round(a.hpBase + a.hpPerStr * str),
    // Vessel of the Choir (YM13, mob pasifi choirVessel): maks MP'ye düz ek; pasif yoksa ifade aynı
    mp: Math.round(a.mpBase + a.mpPerInt * int) + (data.passive?.effect.type === 'choirVessel' ? data.passive.effect.mpAdd : 0),
    spd: Math.max(speedMin(formulas), roundSpeed(a.spdBase + a.spdPerDex * dex, formulas)),
    mpRegen: Math.round(a.mpRegenPerInt * int),
    hpRegen: a.hpRegenPerStr * str,
    armor: data.armor,
    magicArmor: data.magicArmor,
    critChance: a.critChanceBase + a.critChancePerLuck * luck,
    critMult: a.critMult,
    accuracy: accuracyOf(luck, formulas, data.accuracyBase),
    evasion: evasionOf(dex, formulas),
    ...(data.primary ? { primary: data.primary } : {}),
    primaryActive: active,
    resilience: active && data.primary === 'str' ? bonus.str.resilienceChance : 0,
    hunterMark: active && data.primary === 'dex' ? bonus.dex.hunterMarkMult : 0,
    manaEcho: active && data.primary === 'int' ? bonus.int.manaEchoChance : 0,
    spellPowerMult: 1,
    surviveChance: active && data.primary === 'luck' ? bonus.luck.surviveChance : 0,
  };
  return { ...derived, ...(data.overrides ?? {}) };
}

/** Veriden çalışma zamanı tanımı üretir. */
export function buildDef(data: CombatantData, formulas: Formulas): CombatantDef {
  return {
    id: data.id,
    name: data.name,
    spriteId: data.spriteId,
    ...(data.spriteScale ? { spriteScale: data.spriteScale } : {}),
    color: data.color,
    logo: data.logo,
    frontPriority: data.frontPriority,
    ...(data.role ? { role: data.role } : {}),
    ...(data.range !== undefined ? { range: data.range } : {}),
    attributes: { ...data.attributes },
    ...(data.primary ? { primary: data.primary } : {}),
    ...(data.testOnly ? { testOnly: true } : {}),
    ...(data.hidden ? { hidden: true } : {}),
    ...(data.family ? { family: data.family } : {}),
    stats: deriveStats(data, formulas),
    ...(data.resource === 'rage' ? { maxRage: formulas.rage.max } : {}),
    skills: [...data.skills],
    ...(data.tags ? { tags: [...data.tags] } : {}),
    ...(data.ai ? { ai: data.ai } : {}),
    ...(data.passive ? { passive: data.passive } : {}),
    ...(data.variants ? { variants: { fed: { ...data.variants.fed }, unfed: { ...data.variants.unfed } } } : {}),
    ...(data.overrides ? { overrides: { ...data.overrides } } : {}),
    ...(data.accuracyBase !== undefined ? { accuracyBase: data.accuracyBase } : {}),
    ...(data.boss ? { boss: data.boss } : {}),
    ...(data.inert ? { inert: true } : {}),
  };
}

const ATTRS: Attribute[] = ['str', 'int', 'dex', 'luck'];
/** UnitModifiers'ın toplamsal ekleri (madde 280). */
const ADDITIVE = ['hpAdd', 'mpAdd', 'spdAdd', 'critAdd', 'critMultAdd', 'accuracyAdd', 'evasionAdd', 'hpRegenAdd', 'mpRegenAdd'] as const;
/** Affix ekleri (Ömer 2026-10-11): Stats'taki çarpanlara (1 + ek) ya da Lucky Escape şansına eklenir. */
const AFFIX_ADD = ['surviveAdd', 'damageAdd', 'healPowerAdd', 'shieldPowerAdd', 'dotPowerAdd'] as const;

/** Güçlendirmenin statları/görseli değiştiren bir alanı var mı (yoksa tanım aynen kullanılır). */
export function hasUnitModifiers(mods: UnitModifiers | undefined): boolean {
  if (!mods) return false;
  const nonOne = (v: number | undefined) => v !== undefined && v !== 1;
  const nonZero = (v: number | undefined) => v !== undefined && v !== 0;
  return (
    nonOne(mods.hpMult) ||
    nonOne(mods.statMult) ||
    nonOne(mods.powerMult) ||
    nonZero(mods.armorAdd) ||
    nonZero(mods.magicArmorAdd) ||
    mods.spriteScale !== undefined ||
    ADDITIVE.some((k) => nonZero(mods[k])) ||
    ATTRS.some((k) => nonOne(mods.attrMult?.[k]) || nonZero(mods.attrAdd?.[k])) ||
    nonOne(mods.mpMult) ||
    nonOne(mods.spdMult) ||
    nonOne(mods.weaponMult) ||
    AFFIX_ADD.some((k) => nonZero(mods[k])) ||
    Object.values(mods.elemDamageAdd ?? {}).some((v) => nonZero(v))
  );
}

/**
 * Birim güçlendirmesi/zayıflatması uygulanmış tanım (saf; bkz. UnitModifiers). Temel statlar ölçeklenir, türev değerler `deriveStats` ile AYNI
 * formüllerle yeniden hesaplanır (veri `overrides`'ı sabit kalır), sonra maks can, zırhlar ve skill gücü ayarlanır. Değişiklik yoksa tanım aynen döner.
 * Motor (Battle kurucusu) bu fonksiyonu kullanır; yapay zeka ve önizleme birimin statlarını okuduğu için güçlendirme onlara da yansır.
 */
export function applyUnitModifiers(def: CombatantDef, mods: UnitModifiers | undefined, formulas: Formulas): CombatantDef {
  if (!mods || !hasUnitModifiers(mods)) return def;
  const attributes = { ...def.attributes };
  // Temel statlar TAM SAYIYA yuvarlanır (Ömer kararı 2026-10-09: "STR 5.5" gibi kesirli stat yok; standart yuvarlama, Math.round).
  // Türev değerler (can, MP, kritik...) aşağıda bu tam sayı statlardan formüllerle türetilir.
  for (const k of ATTRS) {
    const v = def.attributes[k] * (mods.statMult ?? 1) * (mods.attrMult?.[k] ?? 1) + (mods.attrAdd?.[k] ?? 0);
    attributes[k] = Math.max(0, Math.round(v));
  }
  const derived = deriveStats(
    {
      id: def.id,
      name: def.name,
      spriteId: def.spriteId,
      color: def.color,
      logo: def.logo,
      frontPriority: def.frontPriority,
      attributes,
      ...(def.primary ? { primary: def.primary } : {}),
      armor: def.stats.armor,
      magicArmor: def.stats.magicArmor,
      ...(def.accuracyBase !== undefined ? { accuracyBase: def.accuracyBase } : {}),
      ...(def.overrides ? { overrides: def.overrides } : {}),
      ...(def.passive ? { passive: def.passive } : {}),
      skills: def.skills,
    },
    formulas,
  );
  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  // Toplamsal ek (madde 280): ek yoksa değer türetildiği gibi KALIR (yuvarlama bile yok: bugünkü savaşlar birebir aynı)
  const plus = (k: (typeof ADDITIVE)[number], base: number, f: (v: number) => number): number => (mods[k] ? f(base + mods[k]!) : base);
  const stats: Stats = {
    ...derived,
    hp: Math.max(1, Math.round(derived.hp * (mods.hpMult ?? 1)) + Math.round(mods.hpAdd ?? 0)),
    mp: plus('mpAdd', derived.mp, (v) => Math.max(0, Math.round(v))),
    spd: plus('spdAdd', derived.spd, (v) => Math.max(speedMin(formulas), v)),
    critChance: plus('critAdd', derived.critChance, (v) => Math.max(0, r4(v))),
    critMult: plus('critMultAdd', derived.critMult, (v) => Math.max(1, r4(v))),
    accuracy: plus('accuracyAdd', derived.accuracy, (v) => Math.max(0, r4(v))),
    evasion: plus('evasionAdd', derived.evasion, (v) => Math.min(formulas.attributes.evasionMax, Math.max(0, r4(v)))),
    hpRegen: plus('hpRegenAdd', derived.hpRegen, (v) => Math.max(0, v)),
    mpRegen: plus('mpRegenAdd', derived.mpRegen, (v) => Math.max(0, Math.round(v))),
    armor: Math.max(0, derived.armor + (mods.armorAdd ?? 0)),
    magicArmor: Math.max(0, derived.magicArmor + (mods.magicArmorAdd ?? 0)),
    spellPowerMult: (derived.spellPowerMult ?? 1) * (mods.powerMult ?? 1),
  };
  // Affix ekleri (Ömer 2026-10-11): alan verilmezse stat hiç yazılmaz (bugünkü birimler birebir aynı)
  if (mods.mpMult !== undefined && mods.mpMult !== 1) stats.mp = Math.max(0, Math.round(stats.mp * mods.mpMult));
  if (mods.spdMult !== undefined && mods.spdMult !== 1) stats.spd = Math.max(speedMin(formulas), r4(stats.spd * mods.spdMult));
  if (mods.surviveAdd) stats.surviveChance = Math.min(1, r4((stats.surviveChance ?? 0) + mods.surviveAdd));
  if (mods.damageAdd) stats.damageMult = r4(1 + mods.damageAdd);
  if (mods.weaponMult !== undefined && mods.weaponMult !== 1) stats.weaponMult = r4(Math.max(0, mods.weaponMult));
  if (mods.healPowerAdd) stats.healPowerMult = r4(1 + mods.healPowerAdd);
  if (mods.shieldPowerAdd) stats.shieldPowerMult = r4(1 + mods.shieldPowerAdd);
  if (mods.dotPowerAdd) stats.dotPowerMult = r4(1 + mods.dotPowerAdd);
  const elem = Object.entries(mods.elemDamageAdd ?? {}).filter(([, v]) => v);
  if (elem.length) stats.elemDamageMult = Object.fromEntries(elem.map(([k, v]) => [k, r4(1 + v!)]));
  return { ...def, attributes, stats, ...(mods.spriteScale !== undefined ? { spriteScale: mods.spriteScale } : {}) };
}

/** Çağrı varyantının stat çarpanı (varyant yoksa 1). */
export function variantMult(def: CombatantDef, variant: keyof SummonVariants | undefined): number {
  return variant ? (def.variants?.[variant].mult ?? 1) : 1;
}

/**
 * Çağrı varyantı uygulanmış tanım (saf): maks can (tam sayıya yuvarlanır), hasar statları str ve int (0,1'e yuvarlanır) ve Str'e bağlı düz can
 * yenilenmesi `mult` ile çarpılır; diğer her şey (zırh, hız, isabet, skill'ler, hasar azaltma) aynen kalır. mult 1 ise tanım aynen döner.
 * Motor (çağrı anı), skill açıklaması, wiki ve maç kaydı bu tek fonksiyonu kullanır.
 */
export function applySummonVariant(def: CombatantDef, variant: keyof SummonVariants | undefined, formulas: Pick<Formulas, 'summon'>): CombatantDef {
  const mult = variantMult(def, variant);
  if (mult === 1) return def;
  // STR/INT summon.variantStatStep katına yuvarlanır (formulas.json; yoksa 0,1)
  const S = formulas.summon?.variantStatStep ?? 0.1;
  const r1 = (v: number) => Math.round((v * mult) / S) * S;
  const stats: Stats = { ...def.stats, hp: Math.max(1, Math.round(def.stats.hp * mult)), str: r1(def.stats.str), int: r1(def.stats.int), hpRegen: def.stats.hpRegen * mult };
  return { ...def, attributes: { ...def.attributes, str: stats.str, int: stats.int }, stats };
}

/**
 * Verilen skill hasarının item çarpanı (Global damage x silah gücü x element hasarı; Ömer 2026-10-11, silah 2026-10-17). Çarpan yoksa TAM 1 (çağıran 1'de ifadeyi değiştirmez).
 * Motor (damageSpecFor) ve skill-info aynı fonksiyonu kullanır.
 */
export function outgoingDamageMult(stats: Pick<Stats, 'damageMult' | 'elemDamageMult' | 'weaponMult'>, element: Element | undefined): number {
  return (stats.damageMult ?? 1) * (stats.weaponMult ?? 1) * (stats.elemDamageMult?.[element ?? 'physical'] ?? 1);
}

/** Bir özelliğin skill gücü: değer x katsayı (hasar, şifa ve kalkan için). */
export const attributePower = (stats: Stats, scale: Attribute, formulas: Formulas): number => stats[scale] * formulas.scaling[scale] * (stats.spellPowerMult ?? 1);

/** Zırhın hasarı yüzdesel azaltma oranı (0-1): armor / (armor + k). Artan zırhta getiri azalır. */
export function armorReduction(armor: number, formulas: Formulas): number {
  return armor <= 0 ? 0 : armor / (armor + formulas.armor.k);
}
