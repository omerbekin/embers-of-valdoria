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
 * Görünür sahneyi (stageW x stageH) "cover" ile kaplar; zemin çizgisi ölçülmüşse görsel dikeyde zemin çizgisi `floorLineMaxY()`'ye
 * oturacak şekilde konur (yalnızca sığmayan kısım kırpılır; üst / alt kenar ekranın dışında kalır, boşluk açılmaz).
 * Uzun (1536x1024 gibi) görsellerde 16:9'da az, geniş ekranda (telefon yatay) daha çok dikey kırpılır; kırpma zemin çevresine göre.
 * Kaplama ölçeğinde zemin hâlâ arka sıranın ayağına çok yakınsa (eski dar şerit görseller, castle-hall) alt kenar korunarak o kadar
 * yakınlaştırılır. Ölçülmemiş ya da `offsetY` verilmiş arka plan eskisi gibi ortalanır. Tahtaya dokunmaz.
 */
export function backgroundPlacement(id: string, imgW: number, imgH: number, stageW: number, stageH: number): { y: number; scale: number } {
  const cover = Math.max(stageW / imgW, stageH / imgH);
  const dy = backgroundOffsetY(id);
  const f = backgroundFloor(id);
  if (f === null || dy !== 0 || f >= 1) return { y: stageH / 2 + dy, scale: Math.max(cover, (stageH + 2 * Math.abs(dy)) / imgH) };
  const target = floorLineMaxY();
  // Alt kenar ekranın altında kalırken zeminin target'a inebilmesi için gereken en küçük ölçek: target + (1 - f)*imgH*s >= stageH
  const scale = Math.max(cover, (stageH - target) / ((1 - f) * imgH));
  const h = imgH * scale;
  const want = target - (f - 0.5) * h; // zemin tam target'ta
  const y = Math.min(h / 2, Math.max(stageH - h / 2, want)); // üst <= 0, alt >= stageH
  return { y, scale };
}

export const backgroundPool = (pool: BackgroundPool): readonly string[] => POOLS[pool] ?? [];
