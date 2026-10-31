import formulasJson from '../../data/formulas.json';
import type { Side } from './types';

/**
 * Sayaç (ATB benzeri) sıra sistemi, saf fonksiyonlar halinde.
 * Her tikte herkesin sayacı SPD kadar dolar; eşiğe ulaşan oynar, oynayınca sayacından eşik düşer
 * (taşan kısım korunur, yani hızlı karakter daha sık oynar). Rastgelelik yok: aynı durum = aynı sıra.
 *
 * ONDALIK HIZ (Ömer 2026-10-31): sayaç hesabı `turn.counterStep` (0,001) katlarında TAM SAYIYLA yapılır, sonuç aynı ondalığın tek karşılığı olan
 * sayıya çevrilir. Böylece kayan nokta artığı birikmez: eşik atlanmaz, eşit sayaçlar gerçekten eşit kalır, iki istemci (lockstep) aynı sayıyı görür.
 */
const COUNTER_SCALE = Math.round(1 / formulasJson.turn.counterStep);

/** Sayacı çözünürlüğüne oturtur (aynı ondalık = birebir aynı sayı; -0 yok). Sayacı değiştiren her yer bunu kullanır. */
export const snapCounter = (v: number): number => Math.round(v * COUNTER_SCALE) / COUNTER_SCALE + 0;

export interface TurnSlot {
  uid: string;
  side: Side;
  slot: number;
  spd: number;
  counter: number;
  /**
   * Skip Turn hız desteği varsa, desteksiz hız. `spd` o zaman desteklidir ve destek birimin BİR SONRAKİ turuna kadar sürer:
   * tahmin (predictQueue), birim bir kez oynadıktan sonra spd'yi buna döndürür.
   */
  baseSpd?: number;
}

/**
 * Eşit sayaçta: sayacı yüksek olan, sonra `firstSide` tarafı, sonra düşük yuva, sonra uid.
 * KARIŞIK SIRA (playtest 2026-10-23 D4, Ömer seçenek 3): çağıran `firstSide`'ı SON OYNAYAN birimin karşı tarafı verir (savaşın ilk turunda
 * seed'li yazı-tura, battle.tieFirst). Böylece eşit hızlı birimler taraf taraf değil birim birim sıralanır: düşman, kahraman, düşman, kahraman...
 * Saf ve belirleyici: aynı durum = aynı sıra.
 */
function compare(a: TurnSlot, b: TurnSlot, firstSide: Side): number {
  if (a.counter !== b.counter) return b.counter - a.counter;
  if (a.side !== b.side) return a.side === firstSide ? -1 : 1;
  if (a.slot !== b.slot) return a.slot - b.slot;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/**
 * Sıradaki aktörü bulur. Sayaçları (yerinde) en erken oynayacak kişi eşiğe ulaşana kadar ilerletir;
 * seçilen aktörün sayacını DÜŞÜRMEZ (oyun bitirince düşer). SPD'si 0 olanlar hiç oynamaz.
 */
export function advanceTurn(slots: TurnSlot[], threshold: number, firstSide: Side = 'party'): TurnSlot | null {
  const movers = slots.filter((s) => s.spd > 0);
  if (movers.length === 0) return null;
  // Tam sayı birimleri (bkz. COUNTER_SCALE): tik hesabı ve eşik karşılaştırması artıksız
  const target = Math.ceil(threshold * COUNTER_SCALE);
  const units = movers.map((s) => ({ s, c: Math.round(s.counter * COUNTER_SCALE), v: Math.max(1, Math.round(s.spd * COUNTER_SCALE)) }));
  const ticks = Math.min(...units.map((u) => Math.max(0, Math.ceil((target - u.c) / u.v))));
  for (const u of units) u.s.counter = (u.c + u.v * ticks) / COUNTER_SCALE + 0;
  return movers.filter((s) => s.counter >= threshold).sort((a, b) => compare(a, b, firstSide))[0] ?? null;
}

/** Eşitlik kuralında sıradaki tarafın önceliği: son oynayanın karşı tarafı (karışık sıra, D4). */
export const tieSideAfter = (side: Side): Side => (side === 'party' ? 'enemy' : 'party');

/**
 * Sıra çubuğu için tahmin: şu anki aktör (varsa) + sonraki aktörler. Girdiyi değiştirmez.
 * Eşitlik önceliği motorla aynı: her tahmini turdan sonra son oynayanın karşı tarafı (`firstSide` yalnızca hiç oynayan yokken).
 * Ölüm/çağrı gibi gelecek olayları bilemez; her olaydan sonra yeniden hesaplanır.
 * `currentCost`: şu anki aktörün bu eyleminin turn bedeli (1 = tam turn; 0,5 = yarım turn skill: sayacından eşiğin yarısı düşer, sonraki
 * sırası yarı sürede gelir). Sonraki tahmini turlar tam turn sayılır.
 */
export function predictQueue(
  slots: TurnSlot[],
  threshold: number,
  count: number,
  currentUid: string | null,
  firstSide: Side = 'party',
  currentCost = 1,
): string[] {
  const copy = slots.map((s) => ({ ...s }));
  const queue: string[] = [];
  const current = currentUid ? copy.find((s) => s.uid === currentUid) : undefined;
  let tieSide = firstSide;
  if (current) {
    queue.push(current.uid);
    current.counter = snapCounter(current.counter - threshold * currentCost);
    tieSide = tieSideAfter(current.side);
  }
  while (queue.length < count) {
    const next = advanceTurn(copy, threshold, tieSide);
    if (!next) break;
    queue.push(next.uid);
    next.counter = snapCounter(next.counter - threshold);
    tieSide = tieSideAfter(next.side);
    if (next.baseSpd !== undefined) {
      next.spd = next.baseSpd; // Skip Turn desteği oynadığı turla biter
      next.baseSpd = undefined;
    }
  }
  return queue;
}

/** Sıra sayacının eşiğe oranı, 0-1 arası (arayüzdeki SPEED çubuğu için; salt okunur, yalnızca hesap). */
export function turnProgress(counter: number, threshold: number): number {
  if (threshold <= 0) return 1;
  return Math.min(1, Math.max(0, counter / threshold));
}
