/**
 * Ice Crater itme yönü adımı (Ömer 2026-10-29; SAF, Phaser'sız): hedef seçildikten sonra 4 ok (ileri / geri / şerit boyunca iki yan; çapraz yok).
 * Kural motorda (Battle.pushOutcome, preview.ts > push); burası yalnızca okların seçenekleri, yönü ve ipucu metnidir. Çarpma yönleri de
 * seçilebilir, kırmızı "Crash" olarak çizilir. Hedef itilemiyorsa (boss, steadfast) yön adımı yoktur: skill doğrudan atılır.
 */
import type { PushDir, TargetPreview } from '../engine';

export const PUSH_DIR_ORDER: readonly PushDir[] = ['forward', 'back', 'lanePrev', 'laneNext'];

export interface PushOption {
  dir: PushDir;
  kind: 'move' | 'crash';
  /** Hedefin gideceği / çarptığı hücre; null = tahta kenarı. */
  to: number | null;
  withUid?: string;
  damage?: number;
  withDamage?: number;
}

/** Önizlemeden 4 yönün seçenekleri; hedef itilemiyorsa (immune) ya da önizleme itme vermiyorsa null (yön adımı açılmaz). */
export function pushOptions(previewFor: (dir: PushDir) => TargetPreview[], targetUid: string): PushOption[] | null {
  const out: PushOption[] = [];
  for (const dir of PUSH_DIR_ORDER) {
    const p = previewFor(dir).find((x) => x.uid === targetUid)?.push;
    if (!p || p.kind === 'immune') return null;
    out.push({ dir, kind: p.kind, to: p.to, ...(p.with ? { withUid: p.with } : {}), ...(p.damage !== undefined ? { damage: p.damage } : {}), ...(p.withDamage !== undefined ? { withDamage: p.withDamage } : {}) });
  }
  return out;
}

interface Pt {
  x: number;
  y: number;
}

/** Yönün ekrandaki vektörü (bir hücre adımı): sıra adımı = slots[lanes] - slots[0], şerit adımı = slots[1] - slots[0] (motor pushCell ile aynı yön). */
export function pushArrowVector(slots: readonly Pt[], lanes: number, dir: PushDir): Pt {
  const o = slots[0] ?? { x: 0, y: 0 };
  const r = slots[lanes] ?? o;
  const l = slots[1] ?? o;
  const row = { x: r.x - o.x, y: r.y - o.y };
  const lane = { x: l.x - o.x, y: l.y - o.y };
  if (dir === 'forward') return { x: -row.x, y: -row.y };
  if (dir === 'back') return row;
  if (dir === 'lanePrev') return { x: -lane.x, y: -lane.y };
  return lane;
}

/**
 * Çarpma okunun etiketi: "Crash 5" (hedefin alacağı çarpma hasarı; dolu hücredeki birim de aynısını alır). Bağlam ipucu kutusu kullanılmaz:
 * alt çubuğun üstünde ortada çıktığı için ön sıradaki hedefin oklarını örtüyordu (ekran görüntüsüyle görüldü).
 */
export function crashLabel(o: PushOption): string {
  return o.damage !== undefined ? `Crash ${o.damage}` : 'Crash';
}
