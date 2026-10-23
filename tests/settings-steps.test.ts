import { describe, expect, it } from 'vitest';
import { CURVE_VERSION, migrateLinearStep, VOLUME_STEPS, stepDb, clampStep, readStepLevel, stepFraction, stepRecord, volumeLabel } from '../src/ui/volume-steps';
import { DEFAULT_VOLUME } from '../src/ui/settings';
import { DEFAULT_MUSIC_LEVEL } from '../src/ui/music';
import { UI_AUDIO } from '../src/ui/ui-sound';

// Settings ses kaydırıcıları (Ömer 2026-10-10): %0-100, %5'lik 20 adım; 0 = Off; eski 0-10 kayıtlar en yakın adıma (x2).
describe('Ses kaydırıcıları: 20 adım ve kayıt göçü', () => {
  it('20 adım, %5; yazı Off / 5% / 100%; oran 0..1', () => {
    expect(VOLUME_STEPS).toBe(20);
    expect(volumeLabel(0)).toBe('Off');
    expect(volumeLabel(1)).toBe('5%');
    expect(volumeLabel(13)).toBe('65%');
    expect(volumeLabel(20)).toBe('100%');
    expect(stepFraction(0)).toBe(0);
    expect(stepFraction(10)).toBeCloseTo(10 ** (-20 / 20)); // -20 dB (dB eğrisi: adım başına -2 dB)
    expect(stepDb(19)).toBe(-2);
    expect(stepDb(0)).toBe(-Infinity);
    expect(stepFraction(18) / stepFraction(19)).toBeCloseTo(10 ** (-2 / 20)); // her adım eşit dB
    expect(stepFraction(20)).toBe(1);
    expect(clampStep(-4)).toBe(0);
    expect(clampStep(25)).toBe(20);
    expect(clampStep(7.6)).toBe(8);
    expect(clampStep(NaN)).toBe(0);
  });

  it('yeni biçim aynen okunur; eski 0-10 biçimi x2 en yakın adıma; bozuk kayıt varsayılan', () => {
    expect(readStepLevel(stepRecord('volume', 13), 'volume', 14)).toBe(13);
    expect(readStepLevel(stepRecord('level', 0), 'level', 10)).toBe(0);
    expect(readStepLevel('{"volume":7}', 'volume', 14)).toBe(18); // eski Sound volume 7 -> doğrusal 14 -> dB adımı 18
    expect(readStepLevel('{"volume":10}', 'volume', 14)).toBe(20);
    expect(readStepLevel('{"volume":0}', 'volume', 14)).toBe(0);
    expect(readStepLevel('{"level":5}', 'level', 10)).toBe(17); // eski UI sounds 5 -> doğrusal 10 -> dB 17
    expect(readStepLevel('{"level":6}', 'level', 12)).toBe(18); // eski Music 6 -> doğrusal 12 -> dB 18
    expect(readStepLevel('{"level":15}', 'level', 12)).toBe(20); // eski ölçekte aralık dışı: sınırda
    expect(readStepLevel(null, 'level', 12)).toBe(12);
    expect(readStepLevel('', 'level', 12)).toBe(12);
    expect(readStepLevel('not json', 'level', 12)).toBe(12);
    expect(readStepLevel('{"other":3}', 'level', 12)).toBe(12);
    expect(JSON.parse(stepRecord('volume', 9))).toEqual({ volume: 9, steps: 20, curve: 2 });
  });

  it('varsayılanlar eski ölçekteki değerlerin aynısı: Master %70, Music %60, UI sounds %50', () => {
    expect(DEFAULT_VOLUME).toBe(18);
    expect(DEFAULT_MUSIC_LEVEL).toBe(19);
    expect(UI_AUDIO.defaultLevel).toBe(19);
  });

  it('dB eğrisi göçü: eski doğrusal adım aynı yükseklikte dB adımına, damgalı kayıt bir daha çevrilmez', () => {
    expect(migrateLinearStep(14)).toBe(18);
    expect(migrateLinearStep(16)).toBe(19);
    expect(migrateLinearStep(10)).toBe(17);
    expect(migrateLinearStep(1)).toBe(7);
    expect(migrateLinearStep(20)).toBe(20);
    expect(migrateLinearStep(0)).toBe(0);
    // damgasız (eski) kayıt çevrilir, damgalı olan aynen okunur; yeniden yazılan kayıt damgalıdır -> bir kez çalışır
    const old = JSON.stringify({ level: 14, steps: 20 });
    const once = readStepLevel(old, 'level', 5);
    expect(once).toBe(18);
    const saved = stepRecord('level', once);
    expect(JSON.parse(saved).curve).toBe(CURVE_VERSION);
    expect(readStepLevel(saved, 'level', 5)).toBe(18);
    expect(readStepLevel(JSON.stringify({ level: 0, steps: 20 }), 'level', 5)).toBe(0);
    expect(readStepLevel(null, 'level', 19)).toBe(19); // yeni oyuncu: varsayılan dokunulmaz
  });
});
