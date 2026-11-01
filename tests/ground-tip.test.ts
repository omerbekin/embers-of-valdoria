import { describe, expect, it } from 'vitest';
import { grounds, statuses } from '../src/engine/content';
import type { GroundEffect } from '../src/engine/types';
import { buildGroundTip, groundsOnCell, groundText, groundTipKeyOf } from '../src/ui/ground-tip';

const fx = (ground: string, over: Partial<GroundEffect> = {}): GroundEffect => ({ id: `g-${ground}`, ground, board: 'enemy', slots: [3], turns: 2, source: 'u1', sourceSide: 'party', amount: 5, ...over });

describe('ground texts (data/grounds.json > text)', () => {
  it('every ground has a short non-empty English text', () => {
    for (const [id, def] of Object.entries(grounds)) {
      const t = groundText(def);
      expect(t.length, id).toBeGreaterThan(10);
      expect(t.length, id).toBeLessThan(220);
      expect(t, id).toMatch(/^[\x20-\x7e]+$/);
    }
  });

  it('numbers in the texts match statuses.json / the ground data (drift check)', () => {
    const pct = (n: number) => `${Math.round(Math.abs(1 - n) * 100)}%`;
    const slow = statuses['slow']!;
    const chilled = statuses['chilled']!;
    const soaked = statuses['soaked']!;
    const poisoned = statuses['poisoned']!;
    for (const id of ['quaking_ground', 'field_of_shafts', 'root_field', 'ice_ground']) expect(groundText(grounds[id]), id).toContain(`${pct(slow.speedMult!)} less Speed`);
    expect(groundText(grounds['storm'])).toContain(`${pct(chilled.speedMult!)} less Speed`);
    expect(groundText(grounds['storm'])).toContain(`${pct(chilled.evasionMult!)} less Evasion`);
    for (const id of ['flooded', 'flooded_planks']) {
      expect(groundText(grounds[id]), id).toContain(`${pct(soaked.speedMult!)} less Speed`);
      expect(groundText(grounds[id]), id).toContain(`${pct(soaked.elementTakenMult!['fire']!)} less fire damage`);
    }
    expect(groundText(grounds['poison'])).toContain(`${pct(poisoned.healTakenMult!)} less healing`);
    expect(groundText(grounds['hall_of_silence'])).toContain(`${Math.round(grounds['hall_of_silence']!.manaBurnPct! * 100)}% of their max MP`);
  });

  it('the status named in a text is the status the ground grants', () => {
    const named: Record<string, string> = { poison: 'Poisoned', burning: 'Burning', holy_fire: 'Seared', sanctified_flame: 'Seared', holy_ground: 'Hallowed', holy_water: 'Hallowed', lingering_rain: 'Bleeding', storm: 'Chilled', flooded: 'Soaked', flooded_planks: 'Soaked', quaking_ground: 'Slowed', field_of_shafts: 'Slowed', root_field: 'Slowed', ice_ground: 'Slowed' };
    for (const [id, word] of Object.entries(named)) {
      const g = grounds[id]!;
      const status = g.status ?? g.soak;
      expect(status, id).toBeTruthy();
      expect(groundText(g), id).toContain(word);
    }
  });
});

describe('ground tip builder', () => {
  it('no ground on the cell: no tip', () => {
    expect(groundsOnCell([fx('poison')], 'enemy', 4)).toEqual([]);
    expect(groundsOnCell([fx('poison')], 'party', 3)).toEqual([]);
    expect(buildGroundTip([], grounds)).toBeNull();
  });

  it('one ground: its name is the title, its text and turns are the rows', () => {
    const tip = buildGroundTip(groundsOnCell([fx('burning')], 'enemy', 3), grounds)!;
    expect(tip.title).toBe(grounds['burning']!.name);
    expect(tip.kind).toBe('Ground');
    expect(tip.rows[0]!.text).toBe(groundText(grounds['burning']));
    expect(tip.rows[1]!.text).toBe('Lasts 2 more turns');
  });

  it('several grounds on one cell: each is shown, extra ones under a section header', () => {
    const list = groundsOnCell([fx('poison'), fx('burning', { turns: 1 }), fx('flooded', { slots: [3, 4] })], 'enemy', 3);
    expect(list.map((g) => g.ground)).toEqual(['poison', 'burning', 'flooded']);
    const tip = buildGroundTip(list, grounds)!;
    expect(tip.kind).toContain('3 effects');
    const sections = tip.rows.filter((r) => r.section).map((r) => r.text);
    expect(sections).toEqual([grounds['burning']!.name, grounds['flooded']!.name]);
    expect(tip.rows.some((r) => r.text === 'Lasts 1 more turn')).toBe(true);
  });

  it('two instances of one ground collapse into the longer one; permanent wins', () => {
    const list = groundsOnCell([fx('poison', { id: 'a', turns: 1 }), fx('poison', { id: 'b', turns: 3 })], 'enemy', 3);
    expect(list).toHaveLength(1);
    expect(list[0]!.turns).toBe(3);
    expect(groundsOnCell([fx('poison', { turns: 9 }), fx('poison', { permanent: true, turns: 1 })], 'enemy', 3)[0]!.permanent).toBe(true);
  });

  it('the change key follows the grounds and their remaining turns', () => {
    const a = groundTipKeyOf([fx('poison', { turns: 2 })]);
    expect(groundTipKeyOf([fx('poison', { turns: 1 })])).not.toBe(a);
    expect(groundTipKeyOf([fx('poison', { turns: 2 })])).toBe(a);
  });

  it('weather/tide grounds (no caster turns) show no turns row', () => {
    const tip = buildGroundTip([fx('flooded', { source: 'env', envUntilRound: 4 })], grounds)!;
    expect(tip.rows.map((r) => r.text)).toEqual([groundText(grounds['flooded'])]);
  });
});
