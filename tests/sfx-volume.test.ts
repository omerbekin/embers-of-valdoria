import { afterEach, describe, expect, it } from 'vitest';
import audioData from '../data/audio.json';
import { audioSettings, playSfxDef, type SfxDef } from '../src/game/audio';
import { DEFAULT_SFX_LEVEL, loadSfxLevel, onSfxLevelChange, setSfxLevel, sfxGain, sfxLevel } from '../src/ui/sfx-volume';

// Settings > Sounds > Sound Effects (Ömer 2026-10-13): savaş/skill sesleri için ayrı 20 adımlı kaydırıcı; Master hepsini çarpar.

/** Yalnızca kazanç düğümlerini kaydeden sahte AudioContext (katmansız tarif: synthSfx başka düğüm kurmaz). */
function fakeCtx() {
  const gains: number[] = [];
  const node = () => ({ connect: (n: unknown) => n });
  const ctx = {
    currentTime: 0,
    destination: node(),
    resume: () => Promise.resolve(),
    createGain() {
      const g = { ...node(), gain: { value: 1 } };
      gains.push(-1);
      const i = gains.length - 1;
      return new Proxy(g, {
        get(t, k) {
          if (k === 'gain') return new Proxy(t.gain, { set: (o, p, v) => ((gains[i] = v), Reflect.set(o, p, v)) });
          return Reflect.get(t, k);
        },
      });
    },
  };
  return { ctx: ctx as unknown as AudioContext, gains };
}
const EMPTY: SfxDef = { gain: 1, layers: [] } as unknown as SfxDef;

describe('Sound Effects seviyesi', () => {
  afterEach(() => {
    audioSettings.volume = 0.7;
    audioSettings.sfx = 1;
    setSfxLevel(DEFAULT_SFX_LEVEL);
  });

  it('varsayılan %100 (eski ses düzeyi korunur); kayıt yoksa varsayılan', () => {
    expect(DEFAULT_SFX_LEVEL).toBe(14);
    expect(loadSfxLevel()).toBe(DEFAULT_SFX_LEVEL);
  });

  it('20 adıma sıkıştırılır ve dinleyicilere haber verir', () => {
    const seen: number[] = [];
    const off = onSfxLevelChange((n) => seen.push(n));
    setSfxLevel(7.4);
    setSfxLevel(99);
    setSfxLevel(-3);
    off();
    setSfxLevel(5);
    expect(seen).toEqual([7, 20, 0]);
    expect(sfxLevel()).toBe(5);
  });

  it('toplam oran = Master x Sound Effects', () => {
    expect(sfxGain(20, 20)).toBe(1);
    expect(sfxGain(10, 20)).toBe(0.5);
    expect(sfxGain(20, 10)).toBe(0.5);
    expect(sfxGain(14, 10)).toBeCloseTo(0.35);
    expect(sfxGain(0, 20)).toBe(0);
    expect(sfxGain(20, 0)).toBe(0);
  });

  it('skill sesi kazancı Master x Sound Effects ile çarpılır; Sound Effects 0 ise hiç çalmaz', () => {
    audioSettings.volume = 0.5;
    audioSettings.sfx = 0.5;
    const a = fakeCtx();
    playSfxDef(a.ctx, EMPTY);
    expect(a.gains[0]).toBeCloseTo(audioData.master * 0.25);

    audioSettings.sfx = 0;
    const b = fakeCtx();
    playSfxDef(b.ctx, EMPTY);
    expect(b.gains).toEqual([]);
  });
});
