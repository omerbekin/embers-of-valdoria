// Settings > Sounds > Sound Effects (Ömer 2026-10-13): savaş / skill seslerinin (src/game/audio.ts > playSfxDef, WebAudio sentezi) ayrı
// seviyesi. Diğer ses kaydırıcılarıyla aynı ölçek: 0-20 adım = %0-100 (%5), 0 = kapalı (src/ui/volume-steps.ts). Master Volume yine her şeyi
// çarpar: skill sesi kazancı = Master x Sound Effects. Varsayılan %100 (eski davranış: yalnızca Master). Saf kısımlar testli (tests/sfx-volume.test.ts).
import { VOLUME_DEFAULTS, clampStep, readStepLevel, stepFraction, stepRecord } from './volume-steps';

const KEY = 'proto.sfxVolume.v1';
/** Varsayılan adım (data/audio-volume.json; dB eğrisi, 2026-10-23). */
export const DEFAULT_SFX_LEVEL: number = VOLUME_DEFAULTS.sfx;

const listeners = new Set<(level: number) => void>();

/** Kayıtlı Sound Effects seviyesi 0..20 adım (kayıt yoksa / bozuksa varsayılan). */
export function loadSfxLevel(): number {
  try {
    return readStepLevel(globalThis.localStorage?.getItem(KEY), 'level', DEFAULT_SFX_LEVEL);
  } catch {
    return DEFAULT_SFX_LEVEL;
  }
}

let level = loadSfxLevel();

export function sfxLevel(): number {
  return level;
}

export function setSfxLevel(v: number): void {
  level = clampStep(v);
  try {
    globalThis.localStorage?.setItem(KEY, stepRecord('level', level));
  } catch {
    /* saklama kapalı: yalnızca bu oturum */
  }
  for (const fn of listeners) fn(level);
}

/** Seviye değişince haber ver (kaldırma işlevi döner). */
export function onSfxLevelChange(fn: (level: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Skill sesinin toplam oranı 0..1: Master (adım) x Sound Effects (adım). */
export const sfxGain = (masterStep: number, sfxStep: number): number => stepFraction(masterStep) * stepFraction(sfxStep);
