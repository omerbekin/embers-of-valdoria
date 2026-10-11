// Gear / tüccar / ödül torbasında sürükle-bırak ve çift tıklama kararları (saf; DOM'suz, testli: tests/gear-drop.test.ts).
// Ortak Inventory bileşeninin (Ömer 2026-10-11, g1) TEK kural kaynağı:
//  - torbadaki item: aynı türdeki yuvaya ya da soldaki bir kahramana bırakılınca kuşanılır (silah ailesi uymalı); çöp kutusuna bırakılınca atılır
//    (Rare+ onayı ekranda); tüccarda tezgâha bırakılınca satılır;
//  - kuşanılmış yuvadaki item torbaya bırakılınca çıkarılır (çöpe / tezgâha doğrudan gitmez: önce çıkar);
//  - tüccar malı torbaya bırakılınca satın alınır.
// Geri kalan her şey geçersiz (ikon yerine döner).
import { canEquip, itemDef, type SlotId } from '../progression';

export type DragSource =
  | { kind: 'bag'; uid: string; itemId: string }
  | { kind: 'slot'; heroId: string; slot: SlotId }
  | { kind: 'ware'; index: number; itemId: string };
export type DropTarget =
  | { kind: 'slot'; heroId: string; slot: SlotId }
  | { kind: 'hero'; heroId: string }
  | { kind: 'bag' }
  | { kind: 'trash' }
  | { kind: 'wares' };
export type DropAction =
  | { kind: 'equip'; heroId: string; uid: string }
  | { kind: 'unequip'; heroId: string; slot: SlotId }
  | { kind: 'discard'; uid: string }
  | { kind: 'buy'; index: number }
  | { kind: 'sell'; uid: string }
  | { kind: 'none'; reason?: string };

/** `classOf`: kahramanın sınıfı (yoksa undefined). */
export function dropAction(src: DragSource, target: DropTarget, classOf: (heroId: string) => string | undefined): DropAction {
  if (src.kind === 'ware') return target.kind === 'bag' ? { kind: 'buy', index: src.index } : { kind: 'none' };
  if (src.kind === 'slot') {
    if (target.kind === 'bag') return { kind: 'unequip', heroId: src.heroId, slot: src.slot };
    if (target.kind === 'trash' || target.kind === 'wares') return { kind: 'none', reason: 'Unequip first' };
    return { kind: 'none' };
  }
  if (target.kind === 'bag') return { kind: 'none' };
  if (target.kind === 'trash') return { kind: 'discard', uid: src.uid };
  if (target.kind === 'wares') return { kind: 'sell', uid: src.uid };
  const d = itemDef(src.itemId);
  const cls = classOf(target.heroId);
  if (!d || !cls) return { kind: 'none' };
  if (target.kind === 'slot' && target.slot !== d.slot) return { kind: 'none', reason: 'Wrong slot' };
  if (!canEquip(cls, d)) return { kind: 'none', reason: 'Cannot use' };
  return { kind: 'equip', heroId: target.heroId, uid: src.uid };
}

/** Çöp kutusu yalnızca torbadan sürüklenen item'de görünür (kuşanılmış item önce çıkarılır). */
export const showsTrash = (src: DragSource | null | undefined): boolean => src?.kind === 'bag';

/** Çift tıklama / çift dokunma: aynı hedefe iki dokunuş `ms` içinde mi? */
export function isDoubleTap(prev: { key: string; at: number } | null, key: string, at: number, ms = 380): boolean {
  return !!prev && prev.key === key && at - prev.at <= ms;
}

/**
 * Dokunmatik basışın durumu (saf): uzun basış (`holdMs`) önce İPUCUNU açar; ardından parmak kayarsa SÜRÜKLEME başlar. Uzun basıştan önce
 * kayma = kaydırma (iptal). Fare: 6 px kaydırınca sürükleme (ipucu üstüne gelince zaten açık).
 */
export type PressStep = 'wait' | 'tip' | 'drag' | 'cancel';
export function pressStep(o: { touch: boolean; heldMs: number; dist: number; tipShown: boolean; holdMs?: number }): PressStep {
  const hold = o.holdMs ?? 380;
  if (!o.touch) return o.dist > 6 ? 'drag' : 'wait';
  if (o.tipShown) return o.dist > 10 ? 'drag' : 'tip';
  if (o.dist > 10) return 'cancel';
  return o.heldMs >= hold ? 'tip' : 'wait';
}
