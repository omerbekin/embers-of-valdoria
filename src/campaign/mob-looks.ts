/**
 * Mob görünüş varyasyonları (Ömer 2026-10-26; data/mob-looks.json): aynı mobun ikinci çizimi (Harita 2 kadın varyasyonları). Saf ve seed'li:
 * seçim savaş seed'i + dalga + hücreden türetilen AYRI bir hash'tir (src/campaign/seed.ts > hashSeed), savaşın RNG'sini tüketmez; aynı seed =
 * aynı görünüş, sim / golden sonuçları değişmez. Yalnızca sıradan birimler: rütbeli (elit / boss), hedef nesne ve özel çizimli birim kendi
 * görünüşünde kalır.
 */
import data from '../../data/mob-looks.json';
import { hashSeed } from './seed';
import type { EncounterUnit } from './types';

const VARIANTS: Readonly<Record<string, readonly string[]>> = data.variants;
const RATIO = data.ratio;

/** Mobun görünüş varyasyonları (yoksa boş). */
export const mobLookVariants = (cls: string): readonly string[] => VARIANTS[cls] ?? [];

/** Mobu varyasyonlarıyla birlikte çizen tüm sprite kimlikleri (temel + varyasyonlar). */
export const mobLookSprites = (cls: string, base: string): string[] => [base, ...mobLookVariants(cls)];

/**
 * Bu savaştaki birimin varyasyon çizimi; temel görünüşte kalıyorsa undefined. `seed` savaş seed'i, `wave` dalga sırası (0 = ilk), `slot` hücre.
 */
export function mobLook(u: Pick<EncounterUnit, 'class' | 'tier' | 'boss' | 'objective' | 'sprite' | 'slot'>, seed: number, wave: number): string | undefined {
  const list = VARIANTS[u.class];
  if (!list?.length || u.tier || u.boss || u.objective || u.sprite) return undefined;
  const h = hashSeed(seed, 'look', wave, u.slot);
  if ((h % 10_000) / 10_000 >= RATIO) return undefined;
  return list[Math.floor(h / 10_000) % list.length];
}
