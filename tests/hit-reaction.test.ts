import { describe, expect, it } from 'vitest';
import layout from '../data/battle-layout.json';
import { HIT_REACTION as C, hitOrder, hitReaction, hitTier } from '../src/game/hit-reaction';

/** Darbe tepkisi kademeleri (Ömer 2026-10-14: "1 hasar ile 50 hasar aynı animasyonu oynuyor"). Yalnızca sunum. */
const hp = 1000;
const at = (pct: number, o: Record<string, unknown> = {}) => ({ amount: Math.round(hp * pct), maxHp: hp, ...o });

describe('hit reaction tiers', () => {
  it('reads every number from data/battle-layout.json > animation.hitReaction', () => {
    expect(C).toBe(layout.animation.hitReaction);
    expect(C.lightBelow).toBeLessThan(C.heavyAbove);
    expect(C.shake.minRatio).toBeGreaterThanOrEqual(C.heavyAbove);
  });

  it('light < 8%, medium 8-25%, heavy > 25% of max HP', () => {
    expect(hitTier(C, { amount: 1, maxHp: hp })).toBe('light');
    expect(hitTier(C, at(0.05))).toBe('light');
    expect(hitTier(C, at(0.1))).toBe('medium');
    expect(hitTier(C, at(0.25))).toBe('medium');
    expect(hitTier(C, at(0.3))).toBe('heavy');
    expect(hitTier(C, at(0.9))).toBe('heavy');
  });

  it('fully absorbed by a shield is light', () => {
    expect(hitTier(C, { amount: 0, absorbed: 400, maxHp: hp })).toBe('light');
    expect(hitTier(C, { amount: 0, absorbed: 400, maxHp: hp, crit: true })).toBe('light');
  });

  it('a crit bumps one tier', () => {
    expect(hitTier(C, at(0.05, { crit: true }))).toBe('medium');
    expect(hitTier(C, at(0.15, { crit: true }))).toBe('heavy');
    expect(hitTier(C, at(0.5, { crit: true }))).toBe('heavy');
  });

  it('multi-hit: only the last hit on the same target may be heavy', () => {
    expect(hitTier(C, at(0.4, { crit: true, hitIndex: 0, hitCount: 2 }))).toBe('medium');
    expect(hitTier(C, at(0.4, { hitIndex: 1, hitCount: 2 }))).toBe('heavy');
    expect(hitTier(C, at(0.03, { hitIndex: 0, hitCount: 3 }))).toBe('light');
  });

  it('status / ground ticks never go heavy', () => {
    expect(hitTier(C, at(0.6, { tick: true }))).toBe('medium');
    expect(hitTier(C, at(0.02, { tick: true }))).toBe('light');
  });

  it('tiers get visibly stronger: recoil, knockback, flash, pose time', () => {
    const [l, m, h] = [C.light, C.medium, C.heavy];
    expect(l.pose).toBe(false);
    expect(l.recoilPx).toBeGreaterThanOrEqual(2);
    expect(l.recoilPx).toBeLessThanOrEqual(4);
    for (const k of ['recoilPx', 'recoilMs', 'flashMs', 'leanMult', 'crouchMult'] as const) {
      expect(l[k], k).toBeLessThan(m[k]);
      expect(m[k], k).toBeLessThan(h[k]);
    }
    expect(m.poseMs).toBeLessThan(h.poseMs);
    expect(h.knockPx).toBeGreaterThan(0);
    expect(h.dust).toBe(true);
  });

  it('screen shake: only the heaviest, once per skill use, never in reduced motion / perf mode', () => {
    expect(hitReaction(C, at(0.5)).shake).not.toBeNull();
    expect(hitReaction(C, at(0.3)).shake).toBeNull(); // heavy but below shake.minRatio
    expect(hitReaction(C, at(0.15, { crit: true })).shake).toBeNull();
    expect(hitReaction(C, at(0.5, { shakeUsed: true })).shake).toBeNull();
    const calm = hitReaction(C, at(0.5, { calm: true }));
    expect(calm.shake).toBeNull();
    expect(calm.dust).toBe(false);
    expect(calm.tier).toBe('heavy');
  });

  it('hitOrder counts hits on the same target within a skill use', () => {
    const a1 = { type: 'damage', target: 'a' };
    const b1 = { type: 'damage', target: 'b' };
    const a2 = { type: 'damage', target: 'a' };
    const evs = [a1, { type: 'status', target: 'a' }, b1, a2];
    expect(hitOrder(evs, a1)).toEqual({ hitIndex: 0, hitCount: 2 });
    expect(hitOrder(evs, a2)).toEqual({ hitIndex: 1, hitCount: 2 });
    expect(hitOrder(evs, b1)).toEqual({ hitIndex: 0, hitCount: 1 });
    expect(hitOrder(evs, { type: 'damage', target: 'c' })).toEqual({ hitIndex: 0, hitCount: 1 });
  });
});
