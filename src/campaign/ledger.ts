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
