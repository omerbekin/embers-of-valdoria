import { describe, expect, it } from 'vitest';
import { cooldownChipOf, costChipOf, rangeChipOf } from '../src/ui/skill-chips';
import { buildSkills } from '../src/wiki/catalog';

// Skill ipucu çipleri V2: DOM ipucu, Phaser takım seçimi ve Codex aynı ayrıştırıcıyı kullanır
describe('skill çipleri: tek ayrıştırıcı', () => {
  it('menzil / bedel / bekleme sayıya iner, ipucu metni tam', () => {
    expect(rangeChipOf('Range 6')).toEqual({ num: '6', tip: 'Range 6' });
    expect(rangeChipOf('Global')).toBeNull();
    expect(costChipOf('14 MP')).toMatchObject({ res: 'mp', num: '14', tip: 'Costs 14 MP' });
    expect(costChipOf('Cost 12 HP')).toMatchObject({ res: 'hp', tip: 'Costs 12 HP' });
    expect(costChipOf('RAGE 30')).toMatchObject({ res: 'rage', tip: 'Costs 30 Rage' });
    expect(costChipOf('Free')).toBeNull();
    expect(costChipOf('20% of current HP')).toBeNull();
    expect(cooldownChipOf('2 turns')?.tip).toBe('Cooldown: 2 turns');
    expect(cooldownChipOf('1 turn')?.tip).toBe('Cooldown: 1 turn');
    expect(cooldownChipOf('None')).toBeNull();
  });

  it('Codex skill kaydında menzil etiketi var (Blizzard: Range N)', () => {
    const bl = buildSkills().find((s) => s.id === 'blizzard');
    expect(bl).toBeTruthy();
    expect(rangeChipOf(bl!.rangeLabel)).not.toBeNull();
  });
});
