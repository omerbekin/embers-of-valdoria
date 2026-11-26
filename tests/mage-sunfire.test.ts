import { describe, expect, it } from 'vitest';
import { VFX } from '../src/game/art-v2/mage/vfx';
import audio from '../data/audio-v2/mage.json';

// Fire Bolt evolve'u (Sunfire): onaylı evolve'da kendi efekti + sesleri, değilse taban efekt AYNEN (Ömer 2026-11-12 / pilot 2026-11-23).
const firstSfx = async (evolved: string[] | undefined, skillId = 'fire_bolt'): Promise<string> => {
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
  await (VFX.fireball as (c: unknown, k: unknown) => Promise<void>)(ctx, {}).catch(() => undefined);
  return seen[0] ?? '';
};

describe('Fire Bolt / Sunfire efekt seçimi', () => {
  it('evolve yok: taban efekt (flameIgnite)', async () => {
    expect(await firstSfx(undefined)).toBe('flameIgnite');
    expect(await firstSfx([])).toBe('flameIgnite');
    expect(await firstSfx(['blizzard'])).toBe('flameIgnite');
  });
  it('fire_bolt evolve onaylı: Sunfire (sunfireIgnite)', async () => {
    expect(await firstSfx(['fire_bolt'])).toBe('sunfireIgnite');
  });
  it('Sunfire sesleri mage v2 ses dosyasında tanımlı', () => {
    for (const id of ['sunfireIgnite', 'sunfireRoar', 'sunfireBlast']) expect((audio.sfx as Record<string, unknown>)[id], id).toBeTruthy();
  });
});
