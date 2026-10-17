import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { rangeLabel } from '../src/engine/range';
import { skillTags } from '../src/ui/skill-tags';
import { skillRange } from '../src/wiki/catalog';

const tags = (id: string) => skillTags(content.skills[id]!).map((t) => t.text);
const R = content.formulas.range!;
const WAS = R.enabled;

describe('skill etiket satırı, menzil KAPALI (hedef · element · Melee / Ranged; tek kaynak src/ui/skill-tags.ts)', () => {
  beforeEach(() => {
    R.enabled = false;
  });
  afterEach(() => {
    R.enabled = WAS;
  });
  it('hasar skill’inde hedef türü, element ve menzil yan yana', () => {
    const all = Object.values(content.skills);
    const fire = all.find((s) => s.motion !== 'melee' && s.effects.some((e) => e.type === 'damage' && e.element === 'fire'))!;
    expect(tags(fire.id)).toContain('Fire');
    expect(tags(fire.id).at(-1)).toBe('Ranged');
    const melee = all.find((s) => s.motion === 'melee' && s.target === 'single_enemy')!;
    expect(tags(melee.id).at(-1)).toBe('Melee');
  });
  it('destek / kendine skill: element ve menzil yok; Codex aynı menzil kuralını kullanır', () => {
    const all = Object.values(content.skills);
    const heal = all.find((s) => s.target === 'single_ally' && !s.effects.some((e) => e.type === 'damage'))!;
    expect(tags(heal.id)).toHaveLength(1);
    for (const s of all) {
      const r = skillRange(s);
      const t = skillTags(s);
      expect(t.some((x) => x.kind === 'range')).toBe(r === 'Melee' || r === 'Ranged');
      expect(t[0]!.kind).toBe('target');
    }
  });
});

describe('skill etiket satırı, menzil AÇIK (range.md): "Range N" / "Global" sahibin menzilinden', () => {
  beforeEach(() => {
    R.enabled = true;
  });
  afterEach(() => {
    R.enabled = WAS;
  });
  it('sınıf menzili, skill istisnası, Global; menzilsiz dost/kendine skill etiketsiz', () => {
    expect(tags('fire_bolt').at(-1)).toBe(`Range ${content.classes.mage!.range}`);
    expect(tags('melee_attack').at(-1)).toBe(`Range ${content.classes.warrior!.range}`);
    expect(tags('charge').at(-1)).toBe(`Range ${content.skills.charge!.range}`);
    expect(tags('fist_crush').at(-1)).toBe('Global');
    expect(tags('guard').at(-1)).toBe(`Range ${content.skills.guard!.range}`);
    expect(skillTags(content.skills.rejuvenate!).some((t) => t.kind === 'range')).toBe(false);
    for (const s of Object.values(content.skills)) expect(skillTags(s).some((t) => t.kind === 'range'), s.id).toBe(rangeLabel(s, content.ownerRangeOf(s.id), content.formulas) !== '');
  });
});
