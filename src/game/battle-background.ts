import layout from '../../data/battle-layout.json';

/**
 * Savaş arka planı seçimi (saf; `tests/battle-background.test.ts`). Havuzlar `data/battle-layout.json > backgrounds`.
 * Sefer savaşı kendi arka planını verir (karşılaşma > düğüm > bölge); verilmezse Quick Battle / multiplayer havuzundan seed'e göre biri.
 * Seçim yalnızca seed'den türer: çevrimiçi savaşta iki oyuncu aynı seed'i aldığı için aynı arka planı görür.
 */
export type BackgroundPool = 'quick' | 'multiplayer';

const POOLS = layout.backgrounds as unknown as Record<BackgroundPool, string[]> & { offsetY: Record<string, number> };

/** Seed'den havuz dizini (karıştırılmış; ardışık seed'ler farklı arka planlara dağılır). */
export function poolIndex(seed: number, size: number): number {
  if (size <= 0) return 0;
  const h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) % size;
}

/** Havuzdan seed'e göre arka plan kimliği; `exists` verilirse yalnızca dosyası olanlar arasından (hiçbiri yoksa null). */
export function pickBackground(pool: BackgroundPool, seed: number, exists: (id: string) => boolean = () => true): string | null {
  const list = (POOLS[pool] ?? []).filter(exists);
  return list.length ? list[poolIndex(seed, list.length)]! : null;
}

/** Savaşın arka planı: sefer açıkça verdiyse o (varsa), değilse havuzdan, o da yoksa savaşın varsayılanı. */
export function battleBackground(o: { explicit?: string; pool: BackgroundPool | null; seed: number; fallback: string; exists: (id: string) => boolean }): string {
  if (o.explicit && o.exists(o.explicit)) return o.explicit;
  if (o.pool) {
    const p = pickBackground(o.pool, o.seed, o.exists);
    if (p) return p;
  }
  return o.fallback;
}

/** Arka plan başına dikey ofset (dünya px). */
export const backgroundOffsetY = (id: string): number => POOLS.offsetY?.[id] ?? 0;

const FLOOR = (layout.backgrounds as unknown as { floor?: Record<string, number | string> }).floor ?? {};
/** En arka sıranın ayak çizgisi (tüm slotların en küçük y'si). */
const BACK_FEET_Y = Math.min(...[...layout.partySlots, ...layout.enemySlots].map((s) => s.y));

/** Zemin çizgisinin ekranda en fazla inebileceği y: arka sıra ayağının `floor.margin` px üstü. */
export const floorLineMaxY = (): number => BACK_FEET_Y - (typeof FLOOR.margin === 'number' ? FLOOR.margin : 30);

/** Arka planın zemin çizgisi (görsel yüksekliğinin kesri); ölçülmemişse null. */
export const backgroundFloor = (id: string): number | null => {
  const f = FLOOR[id];
  return typeof f === 'number' ? f : null;
};

/**
 * Savaş arka planının yerleşimi (merkez y ve ölçek; saf, `tests/battle-background.test.ts`).
 * Ekranı yüksekliğe göre kaplar; zemin çizgisi arka sıranın ayağına çok yakın/altındaysa görseli yukarı kaydırır ve
 * alt kenar boşalmasın diye o kadar yakınlaştırır (üst kenar ekranın üstünde kalır). Tahtaya dokunmaz.
 */
export function backgroundPlacement(id: string, imgW: number, imgH: number, stageW: number, stageH: number): { y: number; scale: number } {
  const cover = Math.max(stageW / imgW, stageH / imgH);
  let dy = backgroundOffsetY(id);
  const f = backgroundFloor(id);
  if (f !== null && dy === 0) {
    const a = f - 0.5;
    const target = floorLineMaxY();
    // Kaplama ölçeğinde zemin çizgisi: H/2 + a*imgH*cover
    if (stageH / 2 + a * imgH * cover > target && a < 0.5) {
      // Yukarı dy kaydırınca alt kenarı korumak için ölçek s = (H - 2dy)/imgH; zemin y = H/2 + a*H + dy*(1 - 2a) = target
      dy = Math.min(0, (target - stageH / 2 - a * stageH) / (1 - 2 * a));
    }
  }
  const scale = Math.max(cover, (stageH + 2 * Math.abs(dy)) / imgH);
  return { y: stageH / 2 + dy, scale };
}

export const backgroundPool = (pool: BackgroundPool): readonly string[] => POOLS[pool] ?? [];
