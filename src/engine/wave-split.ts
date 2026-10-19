// Dalgalı savaş: karşılaşmaya EK dalga (takviye) kuralı (saf; Ömer 2026-10-19 düzeltmesi, docs/design/waves.md > 0. Ekleme kuralı). Rastgelelik yok.
// Karşılaşmanın kendi düşman takımı OLDUĞU GİBİ kalır; dalgalar ona EKLENİR (bölünmez). Sefer ve Endless'ın elit / boss savaşları aynı kuralı
// kullanır. Karşılaşmanın kendi `waves` alanı varsa bu kural ÇAĞRILMAZ (veri önceliklidir).
import wavesJson from '../../data/waves.json';

/** Dalga kuralının baktığı birim alanları (karşılaşma birimi şeması; kalan alanlar aynen taşınır). */
export interface SplitUnit {
  class: string;
  slot: number;
  tier?: 'elite' | 'boss';
}

/** Dalgaların açıldığı yer, dalga sayıları ve takviye ayarı (data/waves.json > campaign / endless / reinforce). */
export interface WaveOpening {
  campaign: { enabled: boolean; skipNodes: string[]; count: Record<string, number> };
  endless: { enabled: boolean; fromBattle: number; count: Record<string, number> };
}

export interface ReinforceConfig {
  /** Takviye grubunun en az birim sayısı. */
  minSize: number;
}

export const waveOpening = { campaign: wavesJson.campaign, endless: wavesJson.endless } as WaveOpening;
export const reinforceConfig = wavesJson.reinforce as unknown as ReinforceConfig & { regionGroups?: Record<string, unknown[]> };

const CELLS = 12;
const LANES = 3;

/** Önder (rütbeli: elite / boss) var mı. */
export const hasLeader = (units: readonly SplitUnit[]): boolean => units.some((u) => !!u.tier);

/** Eşlikçiler: rütbesiz ve sıra almayan yardımcı nesne (Iron Mooring) olmayan birimler (yuva sırasıyla). */
export function escortsOf<T extends SplitUnit>(units: readonly T[], isInert: (cls: string) => boolean = () => false): T[] {
  return units.filter((u) => !u.tier && !isInert(u.class)).sort((a, b) => a.slot - b.slot);
}

/**
 * Bir takviye grubu: şablon birimlerin kopyası (aynı class / güçlendirme / yuva), en az `minSize` birim. Şablon küçükse birimleri sırayla
 * tekrar eder ve kopyayı aynı sıradaki (yoksa en yakın sıradaki) boş yuvaya koyar. Şablon boşsa boş liste.
 */
export function reinforcementGroup<T extends SplitUnit>(template: readonly T[], minSize = reinforceConfig.minSize ?? 2): T[] {
  if (!template.length) return [];
  const out: T[] = template.map((u) => ({ ...u }));
  const used = new Set(out.map((u) => u.slot));
  for (let i = 0; out.length < Math.max(1, minSize) && used.size < CELLS; i++) {
    const src = template[i % template.length]!;
    const row = Math.floor(src.slot / LANES);
    const lane = src.slot % LANES;
    const free = Array.from({ length: CELLS }, (_, c) => c)
      .filter((c) => !used.has(c))
      .sort((a, b) => Math.abs(Math.floor(a / LANES) - row) - Math.abs(Math.floor(b / LANES) - row) || Math.abs((a % LANES) - lane) - Math.abs((b % LANES) - lane) || a - b);
    const slot = free[0]!;
    used.add(slot);
    out.push({ ...src, slot });
  }
  return out.sort((a, b) => a.slot - b.slot);
}

/**
 * Karşılaşmanın dalgaları (ilk eleman = 1. dalga), en çok `count` dalga. Kural (Ömer 2026-10-19):
 * - Karşılaşmanın kendi takımı (`units`) HİÇ değişmez; dalgalar ona EKLENİR: `count - 1` takviye grubu.
 * - Takviye = karşılaşmanın eşlikçilerinin (rütbesiz, yardımcı nesne olmayan) kopyası, en az `minSize` birim. Eşlikçi yoksa `fallback`
 *   (seferde bölgenin sıradan birimleri, data/waves.json > reinforce.regionGroups); o da yoksa takviye yok (tek dalga).
 * - Önderli savaş (elit / boss): takviyeler ÖNCE gelir, önder kendi eşlikçileriyle SON dalgada (boss savaşın doruğu).
 *   Önder yoksa (normal savaş): 1. dalga karşılaşmanın kendisi, takviyeler sonra.
 */
export function buildWaves<T extends SplitUnit>(
  units: readonly T[],
  count: number,
  isInert: (cls: string) => boolean = () => false,
  fallback: readonly T[] = [],
): T[][] {
  const n = Math.max(1, Math.floor(count));
  if (n <= 1 || !units.length) return [[...units]];
  const escorts = escortsOf(units, isInert);
  const group = reinforcementGroup(escorts.length ? escorts : fallback);
  if (!group.length) return [[...units]];
  const extra = Array.from({ length: n - 1 }, () => group.map((u) => ({ ...u })));
  return hasLeader(units) ? [...extra, [...units]] : [[...units], ...extra];
}
