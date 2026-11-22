/**
 * Sefer defteri sayaçları (Ömer 2026-11-07 endstats; Harita 1 bitiş ekranı): `stats.goldEarned` (kazanılan toplam altın: loot, sandık, olay
 * ödülü, Pit kademesi; tüccara satış ve debug altını SAYILMAZ), `stats.playMs` (oynama süresi, ms) ve `stats.fallen` (kazanılan / geri çekilinen
 * savaşı düşmüş bitiren kahraman sayısı; zaten düşmüş girip düşmüş kalan sayılmaz). Hepsi isteğe bağlı alan, sürüm değişmez: eski kayıt 0'dan başlar.
 */
import type { CampaignState } from './types';

type Stats = CampaignState['stats'];

/** Altın kazancı (YERİNDE): kesesine ekler ve sayaca yazar. Eksi / 0 sayılmaz. */
export function earnGold(t: CampaignState, amount: number): void {
  if (!(amount > 0)) return;
  t.gold += amount;
  t.stats.goldEarned = (t.stats.goldEarned ?? 0) + amount;
}

/** Savaşı düşmüş bitiren kahraman (YERİNDE). */
export function countFallen(t: CampaignState, n = 1): void {
  if (n > 0) t.stats.fallen = (t.stats.fallen ?? 0) + n;
}

/** Oynama süresi tek adımda en çok bu kadar eklenir (sekme açık kalıp boşta beklenirse süre şişmesin). */
export const PLAY_STEP_CAP_MS = 15 * 60 * 1000;

/** Oynama süresi ekler (saf): yeni nesne, `stats` kopyası. */
export function addPlayTime(s: CampaignState, ms: number): CampaignState {
  const add = Math.min(PLAY_STEP_CAP_MS, Math.max(0, Math.round(ms)));
  if (!add) return s;
  return { ...s, stats: { ...s.stats, playMs: (s.stats.playMs ?? 0) + add } };
}

/** Kayıttaki defter alanlarını onarır (YERİNDE): bozuk / eksi değer silinir (= 0). */
export function normalizeLedger(st: Stats): void {
  for (const k of ['goldEarned', 'playMs', 'fallen'] as const) {
    const v = st[k];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) delete st[k];
    else st[k] = Math.round(v);
  }
}

/** Ekran yazısı: "45m", "3h 12m". */
export function playTimeText(ms: number | undefined): string {
  const m = Math.floor((ms ?? 0) / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

type MapStart = NonNullable<CampaignState['mapStart']>;
const MAP_START_KEYS = ['victories', 'defeats', 'goldEarned', 'playMs', 'fallen', 'day'] as const;

/** Şimdiki sefer toplamlarının anlık görüntüsü (harita geçişinde yeni haritanın başlangıcı olarak yazılır). */
export function snapshotMapStart(s: Pick<CampaignState, 'stats' | 'day'>): MapStart {
  return {
    victories: s.stats.victories,
    defeats: s.stats.defeats,
    goldEarned: s.stats.goldEarned ?? 0,
    playMs: s.stats.playMs ?? 0,
    fallen: s.stats.fallen ?? 0,
    day: typeof s.day === 'number' && Number.isInteger(s.day) && s.day >= 1 ? s.day : 1,
  };
}

/** Kayıt okuması (YERİNDE): bozuk `mapStart` atılır (= sıfırdan sayılır). */
export function normalizeMapStart(s: { mapStart?: unknown }): void {
  const m = s.mapStart as Record<string, unknown> | undefined;
  if (m === undefined) return;
  if (!m || typeof m !== 'object' || !MAP_START_KEYS.every((k) => typeof m[k] === 'number' && Number.isFinite(m[k] as number) && (m[k] as number) >= 0)) delete s.mapStart;
}

/** Yalnız ŞU HARİTANIN sayıları (sefer toplamı - harita başlangıcı); `mapStart` yoksa toplamın kendisi (Harita 1). Negatif çıkmaz. */
export function mapOnlyStats(s: Pick<CampaignState, 'stats' | 'day' | 'mapStart'>): { victories: number; defeats: number; days: number; goldEarned: number; playMs: number; fallen: number } {
  const now = snapshotMapStart(s);
  const b = s.mapStart ?? { victories: 0, defeats: 0, goldEarned: 0, playMs: 0, fallen: 0, day: 1 };
  const d = (k: keyof MapStart): number => Math.max(0, now[k] - b[k]);
  return { victories: d('victories'), defeats: d('defeats'), days: Math.max(1, now.day - b.day + 1), goldEarned: d('goldEarned'), playMs: d('playMs'), fallen: d('fallen') };
}
