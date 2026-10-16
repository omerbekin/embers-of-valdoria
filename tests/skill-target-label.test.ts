import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import type { SkillDef } from '../src/engine';
import { skillTargetLabel } from '../src/ui/skill-target-label';

const sk = (p: Partial<SkillDef>): SkillDef => ({ effects: [], ...p }) as SkillDef;

describe('birim kartı skill satırı: kısa hedef / şekil etiketi (src/ui/skill-target-label.ts)', () => {
  it('hedef türleri tek kelime', () => {
    expect(skillTargetLabel(sk({ target: 'single_enemy' }))).toBe('single');
    expect(skillTargetLabel(sk({ target: 'single_ally' }))).toBe('ally');
    expect(skillTargetLabel(sk({ target: 'self' }))).toBe('self');
    expect(skillTargetLabel(sk({ target: 'dead_ally' }))).toBe('revive');
    expect(skillTargetLabel(sk({ target: 'random_enemies', count: 4 }))).toBe('random ×4');
  });

  it('alan skill’inde şekil; dikdörtgen SATIRxSÜTUN', () => {
    expect(skillTargetLabel(sk({ target: 'area_enemies', area: { shape: 'row' } as SkillDef['area'] }))).toBe('row');
    expect(skillTargetLabel(sk({ target: 'area_enemies', area: { shape: 'column' } as SkillDef['area'] }))).toBe('column');
    expect(skillTargetLabel(sk({ target: 'area_any', area: { shape: 'plus' } as SkillDef['area'] }))).toBe('plus');
    expect(skillTargetLabel(sk({ target: 'area_enemies', area: { shape: 'rect', rows: 2, cols: 2 } as SkillDef['area'] }))).toBe('2x2');
  });

  it('çağıran skill her zaman "summon"', () => {
    expect(skillTargetLabel(sk({ target: 'self', effects: [{ type: 'summon', unit: 'x' }] as SkillDef['effects'] }))).toBe('summon');
  });

  it('tüm veri skill’lerinde boş olmayan etiket', () => {
    const empty = Object.values(content.skills).filter((s) => s.target && !skillTargetLabel(s));
    expect(empty.map((s) => s.id)).toEqual([]);
  });
});
