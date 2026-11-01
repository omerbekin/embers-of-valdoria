import { describe, expect, it } from 'vitest';
import { groundCardText, groundTurnsText, planGroundBadges } from '../src/game/ground-badges';

const burn = { id: 'g1', ground: 'burning', name: 'Burning Ground', turns: 2, grants: ['burning'] };
const hall = { id: 'g2', ground: 'hall', name: 'Hall', turns: 1, grants: [] };
const nameOf = (k: string) => k;

describe('zemin rozeti', () => {
  it('verdiği durum görünüyorsa zemin rozeti çizilmez; durum "from" kaynağını alır', () => {
    const p = planGroundBadges([burn], [{ kind: 'burning', fromGround: 'g1', groundKind: 'burning' }], nameOf);
    expect(p.badges).toEqual([]);
    expect(p.statusSource.get('burning')).toBe('Burning Ground');
  });
  it('durum vermeyen zemin rozetini korur; durum henüz görünmüyorsa da rozet kalır', () => {
    expect(planGroundBadges([hall], [], nameOf).badges).toEqual([hall]);
    expect(planGroundBadges([burn], [], nameOf).badges).toEqual([burn]);
  });
  it('yardımcı yazılar', () => {
    expect(groundTurnsText(1)).toBe('1 turn');
    expect(groundTurnsText(3)).toBe('3 turns');
    expect(groundCardText({ element: 'fire' })).toBe('Fire ground underfoot');
    expect(groundCardText({ heal: true })).toContain('Heals');
  });
});
