// Ses seviyesi kaydırıcılarının ortak ölçeği (Ömer 2026-10-10): Settings'teki TÜM ses kaydırıcıları (Master Volume, Music, Sound Effects, UI sounds)
// 0-100% arası %5'lik 20 adım; 0 = kapalı ("Off"). Kayıtlar `{ <alan>: 0..20, steps: 20 }`; `steps` alanı olmayan eski kayıtlar 0-10
// ölçeğindedir ve en yakın yeni adıma (x2) taşınır. Saf; testli (tests/settings-steps.test.ts).

import volumeData from '../../data/audio-volume.json';

export const VOLUME_STEPS = 20;
export const VOLUME_DEFAULTS: { master: number; sfx: number } = volumeData.defaults;

/** 0..20 aralığına, tam adıma. */
export const clampStep = (v: number): number => Math.min(VOLUME_STEPS, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)));

/** Kazanç oranı 0..1: dB eğrisi (adım 20 = 0 dB, her adım -dbPerStep dB, 0 = sessiz). */
export const stepFraction = (n: number): number => {
  const s = clampStep(n);
  return s <= 0 ? 0 : 10 ** ((-volumeData.dbPerStep * (VOLUME_STEPS - s)) / 20);
};

/** Adımın dB karşılığı (0 = -Infinity). */
export const stepDb = (n: number): number => (clampStep(n) <= 0 ? -Infinity : -volumeData.dbPerStep * (VOLUME_STEPS - clampStep(n)));

/** Yanındaki yazı: "Off", "5%", ... "100%". */
export const volumeLabel = (n: number): string => (clampStep(n) <= 0 ? 'Off' : `${clampStep(n) * (100 / VOLUME_STEPS)}%`);

/** Kayıt eğri sürümü: yoksa eski doğrusal eğri; 2 = dB eğrisi (2026-10-23). Bu alan olmayan kayıtlar okunurken BİR KEZ dB adımına çevrilir. */
export const CURVE_VERSION = 2;

/** Eski doğrusal adımı aynı yükseklikte dB adımına çevirir: 0 -> 0, öbürleri 1..20. */
export function migrateLinearStep(old: number): number {
  const s = clampStep(old);
  if (s <= 0) return 0;
  return Math.min(VOLUME_STEPS, Math.max(1, Math.round(VOLUME_STEPS + (20 * Math.log10(s / VOLUME_STEPS)) / volumeData.dbPerStep)));
}

/** Kayıttan seviye (göçlü): yeni biçim `steps: 20`, eski biçim 0-10 (x2); `curve` yoksa doğrusaldan dB eğrisine çevrilir. Bozuk/boş kayıtta `fallback` (adım). */
export function readStepLevel(raw: string | null | undefined, field: string, fallback: number): number {
  if (!raw) return fallback;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const v = Number(o[field]);
    if (!Number.isFinite(v)) return fallback;
    const lin = o.steps === VOLUME_STEPS ? clampStep(v) : clampStep(Math.min(10, Math.max(0, v)) * 2);
    return o.curve === CURVE_VERSION ? lin : migrateLinearStep(lin);
  } catch {
    return fallback;
  }
}

/** Kayıt metni (yeni biçim, dB eğrisi damgalı). */
export const stepRecord = (field: string, n: number): string => JSON.stringify({ [field]: clampStep(n), steps: VOLUME_STEPS, curve: CURVE_VERSION });
