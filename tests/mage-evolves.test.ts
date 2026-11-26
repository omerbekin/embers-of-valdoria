import { describe, expect, it } from 'vitest';
import { VFX } from '../src/game/art-v2/mage/vfx';
import audio from '../data/audio-v2/mage.json';

// Mage evolve efektleri (Blizzard > Eternal Winter, Ice Crater > Glacier Crater): onaylı evolve'da kendi efekti + sesleri, değilse taban efekt AYNEN
// (Ömer 2026-11-23: "hepsi böyle yapılsın"). Sunfire için tests/mage-sunfire.test.ts.
const firstSfx = async (vfxKey: string, skillId: string, evolved: string[] | undefined): Promise<string> => {
  const seen: string[] = [];
  const ctx = {
    actor: { combatant: { side: 'party', ...(evolved ? { evolved } : {}) }, container: { x: 0, y: 0 }, w: 100, h: 200, castPoint: () => ({ x: 10, y: 10 }), play: () => undefined },
    skill: { id: skillId },
    targets: [],
    sfx: (id: string) => {
      seen.push(id);
      throw new Error('stop');
    },
  };
  const kit = { sheetsReady: async () => undefined };
  await (VFX[vfxKey] as (c: unknown, k: unknown) => Promise<void>)(ctx, kit).catch(() => undefined);
  return seen[0] ?? '';
};

describe('Blizzard / Eternal Winter efekt seçimi', () => {
  it('evolve yok: taban efekt (windHowl)', async () => {
    expect(await firstSfx('blizzard', 'blizzard', undefined)).toBe('windHowl');
    expect(await firstSfx('blizzard', 'blizzard', [])).toBe('windHowl');
    expect(await firstSfx('blizzard', 'blizzard', ['fire_bolt'])).toBe('windHowl');
  });
  it('blizzard evolve onaylı: Eternal Winter (eternalWinterHowl)', async () => {
    expect(await firstSfx('blizzard', 'blizzard', ['blizzard'])).toBe('eternalWinterHowl');
  });
});

describe('Ice Crater / Glacier Crater efekt seçimi', () => {
  it('evolve yok: taban efekt (iceCrack)', async () => {
    expect(await firstSfx('ice_crater', 'ice_crater', undefined)).toBe('iceCrack');
    expect(await firstSfx('ice_crater', 'ice_crater', ['blizzard'])).toBe('iceCrack');
  });
  it('ice_crater evolve onaylı: Glacier Crater (glacierCrack)', async () => {
    expect(await firstSfx('ice_crater', 'ice_crater', ['ice_crater'])).toBe('glacierCrack');
  });
});

describe('evolve sesleri', () => {
  const sfx = audio.sfx as Record<string, { gain: number; layers: Array<{ type: string; wave?: string; f0: number }> }>;
  for (const id of ['eternalWinterHowl', 'eternalWinterHail', 'eternalWinterShatter', 'glacierCrack', 'glacierSlam']) {
    it(`${id}: mage v2 ses dosyasında, çan yok (sinüs yalnız alçak gövde darbesi)`, () => {
      const d = sfx[id];
      expect(d, id).toBeTruthy();
      expect(d!.layers.length).toBeGreaterThan(2);
      for (const l of d!.layers) if (l.type === 'tone') expect(l.f0, `${id} tone`).toBeLessThanOrEqual(200);
    });
  }
});
