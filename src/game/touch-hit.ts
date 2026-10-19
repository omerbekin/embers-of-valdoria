import type Phaser from 'phaser';
import { stageView } from './stage-view';
import { onStageResize } from './stage';

/**
 * Telefonda sahne küçüldüğü için (1080 birim -> ~375 px) küçük Phaser düğmelerinin dokunma alanı 44 gerçek pikselin altına düşer.
 * Bu yardımcılar GÖRÜNÜMÜ değiştirmez; yalnızca etkileşim (zone) alanını büyütür. Masaüstünde (cssScale ~1) hiçbir şey değişmez.
 */
export const MIN_TOUCH_PX = 44;

/** Verilen sahne biriminin gerçek karşılığı en az `minPx` olacak şekilde büyütülmüş değer (ör. cssScale 0,347 -> 127 birim). */
export function touchUnits(base: number, minPx = MIN_TOUCH_PX): number {
  const s = stageView.cssScale > 0 ? stageView.cssScale : 1;
  return Math.max(base, Math.ceil(minPx / s));
}

export interface TouchZoneOpts {
  /** Hangi yöne büyüsün (varsayılan her yöne eşit). Kenara yaslı ya da komşusu olan düğmede yalnızca boş tarafa büyüt. */
  growX?: 'both' | 'left' | 'right';
  growY?: 'both' | 'up' | 'down';
  /** Alanın büyüyebileceği en çok genişlik / yükseklik (yan yana düğmelerde alanı paylaştır: komşu çakışmasın). */
  maxW?: number;
  maxH?: number;
  /** Genişlikte / yükseklikte görünür ölçüye en çok eklenecek toplam birim (komşuyla paylaşım için). */
  maxExtraW?: number;
  maxExtraH?: number;
  minPx?: number;
}

/**
 * Var olan interaktif bir zone'un alanını en az 44 gerçek piksele çıkarır (görünür düğme `w` x `h` kalır, zone'un şu anki x/y'si
 * "düğme merkezi" sayılır). Ekran yeniden ölçeklenince (döndürme, pencere) kendiliğinden güncellenir.
 * Dönen işlev düğme ölçüsü değişince (ör. yazı değişti) çağrılır: `update(w, h)`.
 * Yan yana düğmelerde `maxW` ver (ör. aralarındaki boşluğun yarısı kadar fazlası) ki alanlar çakışmasın.
 */
export function growTouchZone(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, w: number, h: number, o: TouchZoneOpts = {}): (w2?: number, h2?: number) => void {
  let cw = w;
  let ch = h;
  const bx = zone.x;
  const by = zone.y;
  const apply = (): void => {
    if (!zone.scene) return;
    const nw = Math.max(cw, Math.min(o.maxW ?? Infinity, cw + (o.maxExtraW ?? Infinity), touchUnits(cw, o.minPx)));
    const nh = Math.max(ch, Math.min(o.maxH ?? Infinity, ch + (o.maxExtraH ?? Infinity), touchUnits(ch, o.minPx)));
    zone.setSize(nw, nh);
    const gx = o.growX ?? 'both';
    const gy = o.growY ?? 'both';
    zone.x = bx + (gx === 'right' ? (nw - cw) / 2 : gx === 'left' ? -(nw - cw) / 2 : 0);
    zone.y = by + (gy === 'down' ? (nh - ch) / 2 : gy === 'up' ? -(nh - ch) / 2 : 0);
  };
  apply();
  onStageResize(scene, apply);
  return (w2, h2) => {
    if (w2 !== undefined) cw = w2;
    if (h2 !== undefined) ch = h2;
    apply();
  };
}
