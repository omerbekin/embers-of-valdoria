import { describe, expect, it } from 'vitest';
import { valorWoundHealCost } from '../src/campaign';
import { woundHealButton } from '../src/ui/valor-braziers';

describe('Valor penceresi: Wounds düğmesi', () => {
  it('bedel engine kuralından gelir, engel varsa düğme pasif ve neden ipucunda', () => {
    const cost = valorWoundHealCost();
    expect(cost).toBe(3);
    expect(woundHealButton({ name: 'Knight', blocked: null }, cost)).toMatchObject({ label: 'Heal wound · 3', disabled: false });
    const b = woundHealButton({ name: 'Knight', blocked: 'Needs 3 Valor (you have 1)' }, cost)!;
    expect(b.disabled).toBe(true);
    expect(b.tip).toBe('Needs 3 Valor (you have 1)');
  });
  it('kural kapalıysa düğme yok', () => {
    expect(woundHealButton({ name: 'Knight', blocked: null }, null)).toBeNull();
  });
});
