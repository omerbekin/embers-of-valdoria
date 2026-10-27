// Bonus yazım kuralı (Ömer kararı 2026-10-27; docs/design/ui-design-language.md > Bonus yazımı). Saf; motor, arayüz ve Codex aynı yazıyı kullanır.
// - TOPLAMSAL (aynı havuzda toplanan) bonus: "+12% damage" (item Global damage, Hero Oath, Wayshrine nimeti: hepsi UnitModifiers.damageAdd havuzunda).
// - AYRI ÇARPAN (diğer bonuslarla çarpılan) bonus: "×1.2 damage"; 1'in altındaysa "×0.8" (durumlar, pasifler, element hasarı, kritik...).
// Hesap yazıya uyar (2026-10-27): ayrı "×" kaynaklar ÇARPILIR (tree-hooks.ts > STACK_FORM), bir düğümün rank'ları tek çarpanda toplanır, "+%" yazılanlar toplanır.

/** Çarpanın sayısı: en çok 3 ondalık, sondaki sıfırlar atılır (1.25, 0.7, 1.875). */
const trim = (v: number): string => String(Number(v.toFixed(3)));

/** Ayrı çarpan: 1.2 -> "×1.2", 0.85 -> "×0.85". */
export const multText = (m: number): string => `×${trim(m)}`;

/** Artış oranından ayrı çarpan: 0.2 -> "×1.2" (= 1 + oran). */
export const moreText = (r: number): string => multText(1 + r);

/** Azalış oranından ayrı çarpan: 0.3 -> "×0.7" (= 1 - oran). */
export const lessText = (r: number): string => multText(1 - r);

/** Toplamsal yüzde (oran 0-1): 0.12 -> "+12%", -0.08 -> "-8%". */
export const addPctText = (r: number): string => `${r < 0 ? '-' : '+'}${trim(Math.abs(r) * 100)}%`;

/** Yazının ayrı çarpan biçiminde olup olmadığı ("×1.2 ..."). */
export const isMultText = (s: string): boolean => /×\d/.test(s);

/**
 * Toplamsal havuzlar (UnitModifiers *Add alanları; stats.ts > applyUnitModifiers): her kaynak (item affix'i, Hero Oath, Wayshrine nimeti, level)
 * aynı alana eklenir, toplam bir kez uygulanır. Kayıt tipi stats.ts'teki listelerle eşleşir (eksik alan derlemede hata verir).
 */
export const ADDITIVE_LABEL = {
  hpAdd: 'Max HP (flat)',
  mpAdd: 'Max MP (flat)',
  spdAdd: 'Speed (flat)',
  critAdd: 'Crit chance',
  critMultAdd: 'Crit damage (added to the crit multiplier)',
  accuracyAdd: 'Accuracy',
  evasionAdd: 'Evasion',
  hpRegenAdd: 'HP per turn',
  mpRegenAdd: 'MP per turn',
  surviveAdd: 'Lucky Escape chance',
  damageAdd: 'Damage',
  healPowerAdd: 'Healing given',
  shieldPowerAdd: 'Shields given',
  dotPowerAdd: 'Damage over time',
} as const;
export type AdditiveKey = keyof typeof ADDITIVE_LABEL;

/**
 * Ayrı çarpan veren pasif türleri (battle.ts > passiveDealtMult / passiveTakenMult / mireSpeedMult / effectiveStats, spec.ts > damageSpecFor):
 * açıklamaları "×" yazar (tests/bonus-text.test.ts kilitler; Codex "How bonuses combine" listesi).
 */
export const MULT_PASSIVES = ['rage', 'longshot', 'bonusVsStatus', 'grudge', 'packTactics', 'sharesOfDead', 'bloodScent', 'boneWard', 'flockShield', 'closeRanks', 'mireBound', 'shell'] as const;
