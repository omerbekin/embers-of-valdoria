import type { Attribute, Attributes, CombatantData, CombatantDef, Element, Formulas, PassiveDef, PassivePatch, Stats, SummonVariants, UnitModifiers } from './types';

/** Primary bonusu aktif mi: primary stat, dört statın en yükseğine eşit veya üstündeyse (eşitlik dahil). */
export function isPrimaryActive(attrs: Attributes, primary: Attribute | undefined): boolean {
  if (!primary) return false;
  return attrs[primary] >= Math.max(attrs.str, attrs.int, attrs.dex, attrs.luck);
}

/**
 * Hız yuvarlaması (Ömer 2026-10-31: hız artık ondalık): hız değerleri `formulas.json > attributes.spdStep` (0,001) katına yuvarlanır, yani en çok
 * 3 ondalık (15 hız -%10 = 13,5). Sıra sayacı da aynı çözünürlükte tutulur (turn-order.ts > snapCounter), birikim olmaz.
 */
/**
 * Değeri adımın katına yuvarlar, kayan nokta artığı olmadan (87 x 0,1 = 8,700000000000001 değil 8,7; Ömer 2026-10-28: ekranda uzun ondalık
 * görünmesin). Adımlı her yuvarlama bunu kullanır.
 */
export function snapToStep(v: number, step: number): number {
  const n = Math.round(v / step) * step;
  const dec = (String(step).split('.')[1] ?? '').length;
  return Number(n.toFixed(Math.min(dec + 2, 10)));
}

export function roundSpeed(v: number, formulas: Pick<Formulas, 'attributes'>): number {
  const s = formulas.attributes.spdStep ?? 1;
  return snapToStep(v, s);
}

/** Hızın alt sınırı (`attributes.spdMin`): yuvarlama adımından bağımsız, sıfır/negatif hız olmaz. */
export const speedMin = (formulas: Pick<Formulas, 'attributes'>): number => formulas.attributes.spdMin ?? 1;

/** Hızın ekran yazısı: en çok `attributes.spdShowStep` (0,01 = 2 ondalık), sondaki sıfırlar yok ("14", "13.5", "13.79"). Yalnızca gösterim. */
export const speedText = (v: number, formulas: Pick<Formulas, 'attributes'>): string => String(snapToStep(v, formulas.attributes.spdShowStep ?? 0.01));

/**
 * Tur başına hız sapması (Ömer 2026-11-07; eski kalıcı "Natural pace" zarının yerine): `seed` + `key`ten (savaş seed'i + `uid#turSırası`, bkz.
 * paceKey) türeyen çarpan, [1 - spdVariance, 1 + spdVariance] aralığında düzgün dağılımlı, 4 ondalık. Hasarın vuruş başı ±%10'u gibi, her birimin
 * hızı HER TURUNDA yeniden zarlanır. Saf hash: savaşın ana Rng akışını HİÇ tüketmez (diğer zarlar aynı kalır), sıra önizlemesi gelecek turların
 * zarını önceden bilir. spdVariance yoksa / 0 ise 1 (zar yok).
 */
export function speedRoll(seed: number, key: string, formulas: Pick<Formulas, 'attributes'>): number {
  const v = formulas.attributes.spdVariance ?? 0;
  if (!(v > 0)) return 1;
  // FNV-1a + murmur3 son karıştırma: saf, platformdan bağımsız
  let h = 2166136261;
  const str = `${seed >>> 0}:${key}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  const u = (h >>> 0) / 4294967296;
  return Math.round((1 - v + 2 * v * u) * 10000) / 10000;
}

/** Tur zarının anahtarı: birimin `turn`. turu (0 = savaşın ilk sırası; birim her turunu bitirince 1 artar). */
export const paceKey = (uid: string, turn: number): string => `${uid}#${turn}`;

/** Zarlanmış hız: SON hız x zar, spdStep'e yuvarlanır, alt sınır speedMin. Zar 1 ise hız aynen döner. */
export function rolledSpeed(spd: number, roll: number, formulas: Pick<Formulas, 'attributes'>): number {
  if (roll === 1) return spd;
  return Math.max(speedMin(formulas), roundSpeed(spd * roll, formulas));
}

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

/** Bonus olmayan durumların ortak (değişmez) sonucu. */
const NO_LEVEL_GAP = { accuracy: 0, crit: 0 } as const;

/**
 * Level farkı saldırı bonusu (Ömer 2026-11-01): saldıranın level'ı hedefinkinden yüksekse fark başına isabet ve kritik şansı (0-1 ölçeğinde yüzde puanı).
 * Fark 0, saldıran daha düşük ya da iki taraftan birinin level'ı yoksa bonus 0; düşük level'lıya ceza yok. Saf; rastgele sayı tüketmez.
 */
export function levelGapBonus(attackerLevel: number | undefined, targetLevel: number | undefined, formulas: Formulas): { readonly accuracy: number; readonly crit: number } {
  if (attackerLevel === undefined || targetLevel === undefined || attackerLevel <= targetLevel) return NO_LEVEL_GAP;
  const gap = attackerLevel - targetLevel;
  const g = formulas.hit.levelGap;
  return { accuracy: Math.round(gap * g.accuracyPerLevel * 10000) / 10000, crit: Math.round(gap * g.critPerLevel * 10000) / 10000 };
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
    ...(data.blockChance ? { blockChance: data.blockChance } : {}),
    color: data.color,
    logo: data.logo,
    frontPriority: data.frontPriority,
    ...(data.role ? { role: data.role } : {}),
    ...(data.blurb ? { blurb: data.blurb } : {}),
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
    ...(data.summonerScale ? { summonerScale: { ...data.summonerScale, attributes: { ...data.summonerScale.attributes } } } : {}),
    ...(data.overrides ? { overrides: { ...data.overrides } } : {}),
    ...(data.accuracyBase !== undefined ? { accuracyBase: data.accuracyBase } : {}),
    ...(data.boss ? { boss: data.boss } : {}),
    ...(data.touch ? { touch: data.touch } : {}),
    ...(data.inert ? { inert: true } : {}),
  };
}

const ATTRS: Attribute[] = ['str', 'int', 'dex', 'luck'];
/** UnitModifiers'ın toplamsal ekleri (madde 280). */
export const ADDITIVE = ['hpAdd', 'mpAdd', 'spdAdd', 'critAdd', 'critMultAdd', 'accuracyAdd', 'evasionAdd', 'hpRegenAdd', 'mpRegenAdd'] as const;
/** Affix ekleri (Ömer 2026-10-11): Stats'taki çarpanlara (1 + ek) ya da Lucky Escape şansına eklenir. */
export const AFFIX_ADD = ['surviveAdd', 'damageAdd', 'healPowerAdd', 'shieldPowerAdd', 'dotPowerAdd', 'potencyAdd'] as const;

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
    nonOne(mods.accuracyMult) ||
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
    spd: plus('spdAdd', derived.spd, (v) => Math.max(speedMin(formulas), roundSpeed(v, formulas))),
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
  // İsabet çarpanı (Ömer 2026-10-27, topuz örtüğü): toplam isabete (taban + accuracyAdd) oransal
  if (mods.accuracyMult !== undefined && mods.accuracyMult !== 1) stats.accuracy = Math.max(0, r4(stats.accuracy * mods.accuracyMult));
  if (mods.spdMult !== undefined && mods.spdMult !== 1) stats.spd = Math.max(speedMin(formulas), roundSpeed(stats.spd * mods.spdMult, formulas));
  if (mods.surviveAdd) stats.surviveChance = Math.min(1, r4((stats.surviveChance ?? 0) + mods.surviveAdd));
  if (mods.damageAdd) stats.damageMult = r4(1 + mods.damageAdd);
  if (mods.weaponMult !== undefined && mods.weaponMult !== 1) stats.weaponMult = r4(Math.max(0, mods.weaponMult));
  if (mods.healPowerAdd) stats.healPowerMult = r4(1 + mods.healPowerAdd);
  if (mods.shieldPowerAdd) stats.shieldPowerMult = r4(1 + mods.shieldPowerAdd);
  if (mods.dotPowerAdd) stats.dotPowerMult = r4(1 + mods.dotPowerAdd);
  if (mods.potencyAdd) stats.potencyMult = r4(1 + mods.potencyAdd);
  const elem = Object.entries(mods.elemDamageAdd ?? {}).filter(([, v]) => v);
  if (elem.length) stats.elemDamageMult = Object.fromEntries(elem.map(([k, v]) => [k, r4(1 + v!)]));
  return { ...def, attributes, stats, ...(mods.spriteScale !== undefined ? { spriteScale: mods.spriteScale } : {}) };
}

/** Çağrı varyantının stat çarpanı (varyant yoksa 1). */
export function variantMult(def: CombatantDef, variant: keyof SummonVariants | undefined): number {
  return variant ? (def.variants?.[variant].mult ?? 1) : 1;
}

/**
 * Çağrının çağırana göre statları (Ömer 2026-10-18, D1; saf): `def.summonerScale` varsa çağrının listelenen temel statları, maks canı ve can yenilenmesi
 * çağıranın `from` statından türer (bkz. SummonerScale), diğer türevler (MP, hız, kritik...) formüllerle yeniden hesaplanır; dosyadaki diğer
 * overrides korunur. Kural ya da çağıran statı yoksa tanım aynen döner. Varyant (applySummonVariant) ve Summon mastery bundan SONRA uygulanır.
 */
/**
 * Pasifin yamalı kopyası (set bonusu; saf): `patch.field` yolundaki sayıya delta eklenir. Pasif eşleşmezse ya da alan sayı değilse aynen döner.
 * Metin alanı değişmez: gösterilen sayılar skill-info > describePassive ile effect'ten üretilir.
 */
export function patchedPassive(p: PassiveDef, patch: PassivePatch | undefined): PassiveDef {
  if (!patch || p.id !== patch.passive) return p;
  const effect = JSON.parse(JSON.stringify(p.effect)) as Record<string, unknown>;
  const path = patch.field.split('.');
  let at = effect;
  for (const k of path.slice(0, -1)) {
    const next = at[k];
    if (!next || typeof next !== 'object') return p;
    at = next as Record<string, unknown>;
  }
  const key = path[path.length - 1]!;
  const cur = at[key];
  if (typeof cur !== 'number') return p;
  at[key] = Math.round((cur + patch.delta) * 1000) / 1000;
  return { ...p, effect: effect as unknown as PassiveDef['effect'] };
}

/** Primary'si olmayan çağıran için (mob, hazır çağrı) en yüksek temel stat. */
const highestAttribute = (a: Attributes): Attribute => ATTRS.reduce((best, k) => ((a[k] ?? 0) > (a[best] ?? 0) ? k : best), ATTRS[0]!);

export function applySummonerScale(def: CombatantDef, summoner: Attributes | undefined, formulas: Formulas, primary?: Attribute): CombatantDef {
  const sc = def.summonerScale;
  if (!sc || !summoner) return def;
  const src = summoner[sc.from === 'primary' ? (primary ?? highestAttribute(summoner)) : sc.from] ?? 0;
  const attributes: Attributes = { ...def.attributes };
  for (const k of ATTRS) {
    const r = sc.attributes[k];
    if (r !== undefined) attributes[k] = Math.max(0, Math.round(src * r));
  }
  // Hasar doğrudan kaynaktan (Road Hound): güç 1, STR ölçekli skill; formül STR ölçeği (scaling.str) burada geri alınır
  if (sc.damage !== undefined) attributes.str = Math.round((src * sc.damage * 1000) / (formulas.scaling.str || 1)) / 1000;
  const overrides: Partial<Stats> = { ...(def.overrides ?? {}), hp: Math.max(1, Math.round(src * sc.hp)) };
  if (sc.hpRegen !== undefined) overrides.hpRegen = Math.round(src * sc.hpRegen * 10000) / 10000;
  const stats = deriveStats(
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
      overrides,
      ...(def.passive ? { passive: def.passive } : {}),
      skills: def.skills,
    },
    formulas,
  );
  return { ...def, attributes, overrides, stats };
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
  const r1 = (v: number) => snapToStep(v * mult, S);
  const stats: Stats = { ...def.stats, hp: Math.max(1, Math.round(def.stats.hp * mult)), str: r1(def.stats.str), int: r1(def.stats.int), hpRegen: def.stats.hpRegen * mult };
  return { ...def, attributes: { ...def.attributes, str: stats.str, int: stats.int }, stats };
}

/** Statların hasar havuzu payı (Global damage + element hasarı; ikisi de "+X%" toplamsal, Ömer 2026-11-07 P1). Yoksa TAM 0. */
export function statDamageAdd(stats: Pick<Stats, 'damageMult' | 'elemDamageMult'>, element: Element | undefined): number {
  return ((stats.damageMult ?? 1) - 1) + ((stats.elemDamageMult?.[element ?? 'physical'] ?? 1) - 1);
}

/**
 * Verilen skill hasarının item / havuz çarpanı (Ömer 2026-10-11, silah 2026-10-17, havuz 2026-11-07 P1): silah gücü x (1 + havuz).
 * Havuz = Global damage + element hasarı + `extraAdd` (dealtDamage: ağaç koşulları, sıra / bitirici / aura affix'leri)
 * + `baked` (skill gücüne derleyicide işlenmiş ağaç "+X% power" payı, DamageEffect.powerAdd). `baked` güçte zaten (1 + baked) olarak
 * durduğu için bölünür. Çarpan yoksa TAM 1 (çağıran 1'de ifadeyi değiştirmez). Motor (damageSpecFor) ve skill-info aynı fonksiyonu kullanır.
 */
export function outgoingDamageMult(stats: Pick<Stats, 'damageMult' | 'elemDamageMult' | 'weaponMult'>, element: Element | undefined, extraAdd = 0, baked = 0): number {
  const add = statDamageAdd(stats, element) + extraAdd;
  const w = stats.weaponMult ?? 1;
  if (!add) return w;
  return w * (Math.max(0, 1 + baked + add) / (1 + baked));
}

/**
 * DoT miktarı çarpanı (Ömer 2026-11-02): (1 + Increased damage + DoT damage) x (1 + Potency). Silah ve element çarpanı girmez. Çarpan yoksa TAM 1.
 * Motor, önizleme, skill yazısı ve YZ aynı fonksiyonu kullanır.
 */
export function dotOutgoingMult(stats: Pick<Stats, 'damageMult' | 'dotPowerMult' | 'potencyMult'>): number {
  return ((stats.damageMult ?? 1) + (stats.dotPowerMult ?? 1) - 1) * (stats.potencyMult ?? 1);
}

/** Bir özelliğin skill gücü: değer x katsayı (hasar, şifa ve kalkan için). */
export const attributePower = (stats: Stats, scale: Attribute, formulas: Formulas): number => stats[scale] * formulas.scaling[scale] * (stats.spellPowerMult ?? 1);

/** Zırhın hasarı yüzdesel azaltma oranı (0-1): armor / (armor + k). Artan zırhta getiri azalır. */
export function armorReduction(armor: number, formulas: Formulas): number {
  return armor <= 0 ? 0 : armor / (armor + formulas.armor.k);
}
