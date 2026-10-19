// Dalgalı savaş: karşılaşma birimlerini dalgalara bölme kuralı (saf; Ömer 2026-10-19, docs/design/waves.md > 4. Açılış). Rastgelelik yok.
// Sefer ve Endless'ın elit / boss savaşları aynı kuralı kullanır. Karşılaşmanın kendi `waves` alanı varsa bu kural ÇAĞRILMAZ (veri önceliklidir).
import wavesJson from '../../data/waves.json';

/** Bölünecek birim: yalnızca bölme için gereken alanlar (karşılaşma birimi şeması; kalan alanlar aynen taşınır). */
export interface SplitUnit {
  class: string;
  slot: number;
  tier?: 'elite' | 'boss';
}

/** Dalgaların açıldığı yer ve dalga sayıları (data/waves.json > campaign / endless). */
export interface WaveOpening {
  campaign: { enabled: boolean; skipNodes: string[]; count: Record<string, number> };
  endless: { enabled: boolean; fromBattle: number; count: Record<string, number> };
}

export const waveOpening = { campaign: wavesJson.campaign, endless: wavesJson.endless } as WaveOpening;

/**
 * Birimleri en çok `count` dalgaya böler (ilk eleman = 1. dalga). Kural:
 * - Önder (rütbeli birim: elite / boss) ve sıra almayan yardımcı nesneler (inert; Iron Mooring) SON dalgadadır (önder en son gelir).
 * - Kalan eşlikçiler yuva sırasına (ön sıradan arkaya) göre dizilir ve önceki dalgalara sırayla dağıtılır (1., 2., 1., 2. ...): her dalga
 *   ön ve arka sıradan karışık birim alır, fazlası öndeki dalgalara düşer. Önder yoksa eşlikçiler `count` dalgaya, son dalga dahil dağıtılır.
 * - Birim yetmezse dalga sayısı azalır (boş dalga yok; ör. Bridge Warden + 2 Mooring eşlikçisiz olduğu için tek dalga kalır).
 * Yuvalar korunur (önceki dalga temizlendiği için çakışmaz; motor dolu yuvada en yakın boş yuvayı seçer).
 */
export function splitIntoWaves<T extends SplitUnit>(units: readonly T[], count: number, isInert: (cls: string) => boolean = () => false): T[][] {
  const n = Math.max(1, Math.floor(count));
  if (n <= 1 || units.length <= 1) return [[...units]];
  const anchors = units.filter((u) => u.tier || isInert(u.class));
  const escorts = units.filter((u) => !anchors.includes(u)).sort((a, b) => a.slot - b.slot);
  const leader = anchors.some((u) => u.tier);
  // Önder varsa eşlikçi dalgaları n-1; yoksa n (yardımcı nesneler son eşlikçi dalgasına katılır)
  const k = Math.min(leader ? n - 1 : n, escorts.length);
  if (k <= 0) return [[...units]];
  const waves: T[][] = Array.from({ length: k }, () => []);
  escorts.forEach((u, i) => waves[i % k]!.push(u));
  if (leader) waves.push([...anchors]);
  else if (anchors.length) waves[k - 1]!.push(...anchors);
  return waves.map((w) => [...w].sort((a, b) => a.slot - b.slot));
}
