import { describe, expect, it } from 'vitest';
import { SUPPLIES, activeHeroes, addSupply, debugTeleport, grantLoot, newCampaign, normalizeState, rollSupplyDrop, supplyBlocked, supplyCount, supplyDef, supplyList, useSupply, type CampaignState } from '../src/campaign';
import consumables from '../data/consumables.json';

// Savaş dışı malzemeler (Ömer 2026-11-07): Healing Draught, Greater Healing Draught, Wound Salve, Revive Ally.
const base = (): CampaignState => {
  const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), 'moor');
  delete s.supplies; // teleport'taki otomatik zaferler düşürmüş olabilir
  return s;
};
const withHero = (s: CampaignState, patch: Record<string, unknown>): { s: CampaignState; id: string } => {
  const id = activeHeroes(s)[0]!.id;
  return { id, s: { ...s, roster: s.roster.map((h) => (h.id === id ? { ...h, ...patch } : h)) } };
};
const give = (s: CampaignState, id: string): CampaignState => {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  addSupply(t, id, 2);
  return t;
};

describe('supplies', () => {
  it('data: four supplies, none is for sale and every drop id exists', () => {
    expect(SUPPLIES.map((d) => d.id)).toEqual(['heal', 'greater_heal', 'cure_wound', 'revive_ally']);
    for (const row of Object.values(consumables.drops)) for (const id of Object.keys(row.weights)) expect(supplyDef(id), id).toBeTruthy();
  });

  it('Healing Draught restores HP; Greater also cures a wound if present', () => {
    const { s, id } = withHero(base(), { hpRatio: 0.3, wounds: 2 });
    const a = useSupply(give(s, 'heal'), 'heal', id);
    expect(a.roster.find((h) => h.id === id)).toMatchObject({ hpRatio: 0.7, wounds: 2 });
    expect(supplyCount(a, 'heal')).toBe(1);
    const b = useSupply(give(s, 'greater_heal'), 'greater_heal', id);
    expect(b.roster.find((h) => h.id === id)).toMatchObject({ hpRatio: 1, wounds: 1 });
    const { s: s2, id: id2 } = withHero(base(), { hpRatio: 0.5 });
    const c = useSupply(give(s2, 'greater_heal'), 'greater_heal', id2);
    expect(c.roster.find((h) => h.id === id2)!.wounds).toBeUndefined();
  });

  it('Wound Salve removes one wound; blocked without wounds', () => {
    const { s, id } = withHero(base(), { wounds: 1 });
    const t = useSupply(give(s, 'cure_wound'), 'cure_wound', id);
    expect(t.roster.find((h) => h.id === id)!.wounds).toBeUndefined();
    const clean = withHero(base(), {});
    expect(supplyBlocked(give(clean.s, 'cure_wound'), 'cure_wound', clean.id)).toBe('This hero has no wounds');
  });

  it('Revive Ally raises only a fallen hero, keeps wounds; used up leaves no empty field', () => {
    const { s, id } = withHero(base(), { alive: false, hpRatio: 0, wounds: 2 });
    let t = addOne(s, 'revive_ally');
    t = useSupply(t, 'revive_ally', id);
    expect(t.roster.find((h) => h.id === id)).toMatchObject({ alive: true, hpRatio: 0.5, wounds: 2 });
    expect(t.supplies).toBeUndefined();
    const alive = withHero(base(), {});
    expect(supplyBlocked(give(alive.s, 'revive_ally'), 'revive_ally', alive.id)).toBe('This hero has not fallen');
    expect(supplyBlocked(give(s, 'heal'), 'heal', id)).toBe('A fallen hero must be revived first');
    expect(() => useSupply(base(), 'heal', id)).toThrow(/no Healing Draught/);
  });

  it('drops: seeded, first clear only, not on replays; stored in the save and merged into the Spoils card', () => {
    const t = JSON.parse(JSON.stringify(base())) as CampaignState;
    const a = rollSupplyDrop(JSON.parse(JSON.stringify(t)), 'boss1', 'boss', 0);
    const b = rollSupplyDrop(JSON.parse(JSON.stringify(t)), 'boss1', 'boss', 0);
    expect(a).toEqual(b);
    expect(rollSupplyDrop(t, 'boss1', 'boss', 1)).toEqual({});
    // en az bir düğümde düşer, düşen kayda yazılır ve kart alanında görünür
    let hit = 0;
    for (let i = 0; i < 60 && !hit; i++) {
      const u = JSON.parse(JSON.stringify(t)) as CampaignState;
      const d = grantLoot(u, `n${i}`, 'treasure', activeHeroes(u));
      if (d.supplies) {
        hit++;
        expect(supplyList(u).length).toBeGreaterThan(0);
        expect(u.pendingLoot?.supplies).toEqual(d.supplies);
      }
    }
    expect(hit).toBe(1);
  });

  it('save: old saves load without the field; broken values are dropped', () => {
    const s = base();
    expect(normalizeState(JSON.parse(JSON.stringify(s)))!.supplies).toBeUndefined();
    const dirty = { ...JSON.parse(JSON.stringify(s)), supplies: { heal: 2.9, nope: 3, cure_wound: -1, revive_ally: 'x' } };
    expect(normalizeState(dirty)!.supplies).toEqual({ heal: 2 });
  });
});

function addOne(s: CampaignState, id: string): CampaignState {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  addSupply(t, id, 1);
  return t;
}

describe('sim bot supplies', () => {
  it('revives a fallen hero with a held Revive Ally, and leaves the stock alone when none fallen', async () => {
    const { simUseSupplies } = await import('../src/sim/campaign');
    const { s, id } = withHero(base(), { alive: false, hpRatio: 0 });
    const out = simUseSupplies(give(s, 'revive_ally'));
    expect(out.roster.find((h) => h.id === id)!.alive).toBe(true);
    expect(supplyCount(out, 'revive_ally')).toBe(1);
    const healthy = simUseSupplies(give(base(), 'revive_ally'));
    expect(supplyCount(healthy, 'revive_ally')).toBe(2);
  });
});
