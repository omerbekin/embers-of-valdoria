/**
 * Birim üstü tepkimeler (Ömer 2026-11-09; data/grounds.json > reactions > unitSetup / unitTrigger / unitRemove): Poisoned birime Burning gelirse
 * Explosion (Poisoned biter, hedef + komşulara ateş hasarı = iki tikin toplamı, Burning kalır); Burning'li birime Poisoned = Toxic smoke (Blinded
 * + bir zehir tiki, zehir buharlaşır). Zemin tepkimesiyle aynı kod yolu; sayılar veriden okunur.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import type { BattleEvent, Status } from '../src/engine';

const R = content.groundReactions;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
type Priv = { addStatus(t: unknown, s: Status, emit: unknown, cause?: string): void; debugEmit: unknown };
const mk = (mode: 'turns' | 'test' = 'turns', units?: Record<number, { tier: 'boss' }>) => {
  const b = new Battle(content.battleSetup('random-battle', 7, mode, { party: cells({ 0: 'mage', 1: 'paladin' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 3: 'warrior', 4: 'warrior' }), ...(units ? { units: { enemies: units } } : {}) }, false));
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, armor: 0, magicArmor: 0, resilience: 0, evasion: 0 });
  return b;
};
const give = (b: Battle, uid: string, kind: string, amount: number, by = 'party-0') =>
  (b as unknown as Priv).addStatus(b.get(uid)!, { kind: kind as Status['kind'], turns: 3, source: by, amount }, (b as unknown as Priv).debugEmit);
const has = (b: Battle, uid: string, kind: string) => b.get(uid)!.statuses.some((s) => s.kind === kind);
const dmgOf = (b: Battle, reaction: string) => b.log.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.reaction === reaction);

describe('birim üstü tepkime', () => {
  it('Poisoned + Burning = Explosion: zehir biter, ateş kalır; hasar iki tikin TOPLAMI; komşulara adjacent oranı', () => {
    for (const mode of ['turns', 'test'] as const) {
      const b = mk(mode);
      give(b, 'enemy-0', 'poisoned', 20);
      give(b, 'enemy-0', 'burning', 30);
      expect(has(b, 'enemy-0', 'poisoned')).toBe(false);
      expect(has(b, 'enemy-0', 'burning')).toBe(true);
      const ev = b.log.filter((e) => e.type === 'groundReaction');
      expect(ev).toHaveLength(1);
      expect(ev[0]).toMatchObject({ reaction: 'explosion', label: R.explosion!.label, setup: 'poisoned', trigger: 'burning' });
      const base = Math.round((20 + 30) * R.explosion!.damage!.mult);
      const d = dmgOf(b, 'explosion');
      const c = d.find((x) => x.target === 'enemy-0')!;
      expect(c.amount + c.absorbed).toBe(b.tickDamage('fire', 'magic', base, b.get('enemy-0')!));
      const side = d.find((x) => x.target === 'enemy-1')!;
      expect(side.amount + side.absorbed).toBe(b.tickDamage('fire', 'magic', Math.round(base * R.explosion!.damage!.adjacent!), b.get('enemy-1')!));
      expect(d.some((x) => x.target === 'party-0')).toBe(false);
    }
  });

  it('Burning + Poisoned = Toxic smoke: Blinded 1 tur + bir zehir tiki; zehir buharlaşır, ateş kalır', () => {
    const b = mk();
    give(b, 'enemy-0', 'burning', 30);
    give(b, 'enemy-0', 'poisoned', 20);
    expect(has(b, 'enemy-0', 'poisoned')).toBe(false);
    expect(has(b, 'enemy-0', 'burning')).toBe(true);
    expect(has(b, 'enemy-0', 'blinded')).toBe(true);
    expect(b.get('enemy-0')!.statuses.find((s) => s.kind === 'blinded')!.turns).toBe(R.toxic_smoke!.status!.turns);
    const d = dmgOf(b, 'toxic_smoke').find((x) => x.target === 'enemy-0')!;
    expect(d.amount + d.absorbed).toBe(b.tickDamage('nature', 'magic', 20 * R.toxic_smoke!.damage!.mult, b.get('enemy-0')!));
  });

  it('tek başına Burning ya da Poisoned tepkime kurmaz; aynı taraf (kendi dostu) hasar yemez', () => {
    const b = mk();
    give(b, 'enemy-0', 'burning', 30);
    expect(b.log.some((e) => e.type === 'groundReaction')).toBe(false);
    give(b, 'party-1', 'poisoned', 10, 'party-0');
    give(b, 'party-1', 'burning', 10, 'party-0');
    expect(dmgOf(b, 'explosion').some((x) => x.target.startsWith('party'))).toBe(false);
  });

  it('boss: Blinded ccImmunity.accuracyCrit ile engelli kalır (Toxic smoke hasarı yine işler)', () => {
    const b = mk('turns', { 0: { tier: 'boss' } });
    give(b, 'enemy-0', 'burning', 30);
    give(b, 'enemy-0', 'poisoned', 20);
    expect(has(b, 'enemy-0', 'blinded')).toBe(!content.formulas.ccImmunity?.accuracyCrit);
    expect(dmgOf(b, 'toxic_smoke').some((x) => x.target === 'enemy-0')).toBe(true);
  });
});

describe('birim üstü tepkime: yapay zeka', () => {
  it('zehirli düşmana Burning veren skill (Ember Toss) tepkime hasarını görür: aday hasarı zehirsizden büyük', () => {
    const dmgWith = (poisoned: boolean) => {
      const b = mk('test');
      for (const c of b.combatants) { c.hp = c.maxHp = 5000; c.mp = c.maxMp; }
      const me = b.get('party-0')!;
      me.skills = ['ashborn_ember_toss'];
      b.debugClearCooldowns();
      if (poisoned) give(b, 'enemy-0', 'poisoned', 40);
      const ex = explainChoice(b, 'party-0', { ...content.aiConfig, global: undefined })!;
      return ex.candidates.find((c) => c.skill === 'ashborn_ember_toss' && !!c.target?.startsWith('E0'))!;
    };
    const base = dmgWith(false);
    const poisoned = dmgWith(true);
    expect(poisoned.dmg).toBeGreaterThan(base.dmg);
  });
});
