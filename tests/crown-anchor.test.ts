import { describe, expect, it } from 'vitest';
import { crownPlace } from '../src/ui/formation-board';
import anchors from '../data/crown-anchor.json';
import bust from '../data/hero-bust.json';
import battleLayout from '../data/battle-layout.json';
import skills from '../data/skills.json';

// Formation hücresinde lider tacı kafanın üstünde ortalı (Ömer 2026-10-31); itme / çekme zıplaması verisi.
describe('leader crown anchor', () => {
  it('her sınıfta taç hücrenin (128x128) içinde ve kafa merkezi x\'inde ortalı', () => {
    for (const [cls, a] of Object.entries(anchors.classes)) {
      const c = crownPlace(cls);
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.top).toBeGreaterThanOrEqual(1);
      expect(c.left + c.w).toBeLessThanOrEqual(126);
      expect(c.top + c.h).toBeLessThanOrEqual(126);
      expect(Math.abs(c.left + c.w / 2 - (10 + (a.x * 110) / 256))).toBeLessThan(0.1);
    }
  });
  it('avatarı olan her sınıfın ölçüsü var; bilinmeyen sınıf varsayılana düşer', () => {
    for (const cls of Object.keys(bust.classes)) expect(Object.keys(anchors.classes)).toContain(cls);
    expect(crownPlace('nope').left).toBeGreaterThan(0);
  });
  it('zorla yer değiştirme zıplaması veride', () => {
    const fm = battleLayout.animation.forcedMove;
    expect(fm.ms).toBeGreaterThan(0);
    expect(fm.hopPx).toBeGreaterThan(0);
    expect(fm.hops).toBeGreaterThanOrEqual(1);
    expect(fm.hopSkills).toEqual(['ice_crater']); // yalnız Mage Ice Crater itmesi zıplar; hook'lar yürür
    expect(Object.keys(skills)).toContain('ice_crater');
  });
});
