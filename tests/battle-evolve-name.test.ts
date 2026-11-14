// Savaş skill çubuğu / ipucu adı (BattleScene > skillName): birimin onaylı evolve listesi (Combatant.evolved) verilince evolve adı, yoksa temel ad.
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { heroSkillName } from '../src/ui/evolve-icon';

const fireBolt = content.skills['fire_bolt']!;

describe('savaşta evolve adı (evolvedIds)', () => {
  it('onaylı listede Fire Bolt varsa Sunfire', () => {
    expect(heroSkillName({ class: 'mage' }, fireBolt, undefined, ['fire_bolt'])).toBe('Sunfire');
  });
  it('listede yoksa temel ad (ağaçsız birim)', () => {
    expect(heroSkillName({ class: 'mage' }, fireBolt, undefined, [])).toBe(fireBolt.name);
  });
});
