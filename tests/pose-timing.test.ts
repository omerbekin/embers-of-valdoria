import { describe, expect, it } from 'vitest';
import layout from '../data/battle-layout.json';
import skills from '../data/skills.json';
import { POSE_TIMING as T, endDelay, holdEndDelay, idleRequestDelay, isHoldSkill, maxLingerAfterImpact, throwHoldDelay } from '../src/game/pose-timing';

/**
 * Poz süresi kuralı (Ömer 2026-10-13: "karakter eliyle skill atıyor ve eli 1-2 sn daha havada kalıyor"): skill pozu vuruş anından
 * kısa süre (~150-300 ms) sonra idle'a döner; yalnızca kanallı skill'ler (holdSkills) efektin sonuna dek tutar.
 */
const K = layout.animation.skillSlowdown;
const hold = (o: Partial<{ now: number; motion: string; skillId: string; lastRequestAt: number; shownAt: number }> = {}) => ({
  now: 0,
  motion: 'cast',
  skillId: 'fire_bolt',
  lastRequestAt: 0,
  shownAt: 0,
  ...o,
});

describe('pose timing (v2 skill pose -> idle)', () => {
  it('reads every value from data/battle-layout.json > animation.pose', () => {
    expect(T).toBe(layout.animation.pose);
    for (const key of ['releaseMs', 'castMinMs', 'meleeMinMs', 'throwHoldMs', 'holdReleaseMs', 'lateWindowMs', 'lateHoldMs', 'hitHoldMs'] as const) {
      expect(T[key], key).toBeGreaterThan(0);
    }
  });

  it('returns to idle ~150-300 ms after the visual impact (skill resolved), x skillSlowdown included', () => {
    // vuruş skill başından çok sonra: yalnızca releaseMs
    const late = endDelay(T, hold({ now: 5000 }), K);
    expect(late).toBeGreaterThanOrEqual(150);
    expect(late).toBeLessThanOrEqual(300);
    // melee: aynı bırakış
    expect(endDelay(T, hold({ now: 5000, motion: 'melee' }), K)).toBe(late);
    // hiçbir skill pozu (kanallı efekt süresi hariç) vuruştan sonra 300 ms'den uzun kalmaz (geç attack isteği dahil)
    expect(maxLingerAfterImpact(T, K)).toBeLessThanOrEqual(300);
    expect(T.holdReleaseMs * K).toBeGreaterThanOrEqual(100);
    expect(T.holdReleaseMs * K).toBeLessThanOrEqual(300);
  });

  it('keeps a very short spell readable (castMinMs from the last pose request), but never longer than castMinMs', () => {
    const d = endDelay(T, hold({ now: 100 }), K);
    expect(d).toBeCloseTo(T.castMinMs * K - 100, 5);
    // en kısa görünme süresi bir saniyenin altında: "1-2 sn havada" olamaz
    expect(T.castMinMs * K).toBeLessThan(1000);
    // son poz isteği (yeniden attack / cast) en kısa süreyi oradan sayar
    expect(endDelay(T, hold({ now: 1000, lastRequestAt: 900 }), K)).toBeCloseTo(T.castMinMs * K - 100, 5);
  });

  it('honours the effect\'s own idle request once the minimum hold is over (no waiting for the whole skill)', () => {
    expect(idleRequestDelay(T, hold({ now: 2000 }), K)).toBe(0);
    expect(idleRequestDelay(T, hold({ now: 200 }), K)).toBeCloseTo(T.castMinMs * K - 200, 5);
    // melee: pozun gösterildiği andan meleeMinMs
    expect(idleRequestDelay(T, hold({ now: 100, motion: 'melee', shownAt: 0 }), K)).toBeCloseTo(T.meleeMinMs * K - 100, 5);
    expect(idleRequestDelay(T, hold({ now: 1000, motion: 'melee', shownAt: 0 }), K)).toBe(0);
    // kanallı skill: skill bitene dek tutulur
    expect(idleRequestDelay(T, hold({ now: 2000, skillId: 'piercing_arrow' }), K)).toBeNull();
  });

  it('drops the throwing hand while a thrown object is still in the air (attack pose capped)', () => {
    const cap = throwHoldDelay(T, { motion: 'ranged', skillId: 'all_in' }, K);
    expect(cap).not.toBeNull();
    expect(cap!).toBeLessThanOrEqual(600);
    expect(throwHoldDelay(T, { motion: 'melee', skillId: 'melee_attack' }, K)).toBeNull();
    expect(throwHoldDelay(T, { motion: 'ranged', skillId: 'piercing_arrow' }, K)).toBeNull();
  });

  it('channelled (hold) skills end right after their effect ends', () => {
    expect(holdEndDelay(T, 0, 5000, K)).toBeCloseTo(T.holdReleaseMs * K, 5);
    expect(holdEndDelay(T, 5400, 5000, K)).toBe(400);
  });

  it('hold skills are real skills of playable classes (Pose Tester copies count too)', () => {
    const all = skills as unknown as Record<string, { id?: string }>;
    for (const id of T.holdSkills) expect(all[id]?.id, id).toBe(id);
    expect(isHoldSkill(T, 'pt_piercing_arrow')).toBe(true);
    expect(isHoldSkill(T, 'smoke_bomb')).toBe(false);
    expect(isHoldSkill(T, undefined)).toBe(false);
  });
});
