import { describe, expect, it } from 'vitest';
import { levelBannerText } from '../src/ui/level-banner';

describe('Level atlama şeridi (Ömer 2026-10-18: pencere yok, kısa şerit)', () => {
  it('"Warrior reached Level 2 · 3 stat points · fully healed"', () => {
    expect(levelBannerText({ name: 'Warrior', to: 2, gained: 1, points: 3, healed: true })).toBe('Warrior reached Level 2 · 3 stat points · fully healed');
  });
  it('birden çok level (+n), tek puan tekil, düşmüş kahramanda "fully healed" yok', () => {
    expect(levelBannerText({ name: 'Mage', to: 5, gained: 2, points: 6, healed: false })).toBe('Mage reached Level 5 (+2) · 6 stat points');
    expect(levelBannerText({ name: 'Archer', to: 3, gained: 1, points: 1, healed: false })).toBe('Archer reached Level 3 · 1 stat point');
  });
});
