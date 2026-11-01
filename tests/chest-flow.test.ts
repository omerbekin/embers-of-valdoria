import { describe, expect, it } from 'vitest';
import { addItem, autoResolve, completeSimple, debugTeleport, discardItem, newCampaign, nextStep, pickHero, stashLoot, type CampaignState } from '../src/campaign';
import { BAG_SIZE } from '../src/progression';
import { CHEST_TIMING, ChestFlow, chestClaim, chestKey, chestPlan } from '../src/ui/chest-flow';

describe('chest flow', () => {
  it('plans one column per item, 300 ms apart, button last', () => {
    const p = chestPlan(
      [
        { color: '#5f8f3e', rank: 1 },
        { color: '#7a3f9a', rank: 3 },
      ],
      40
    );
    expect(p.steps).toHaveLength(2);
    expect(p.steps[1]!.at - p.steps[0]!.at).toBe(CHEST_TIMING.itemGapMs);
    expect(p.steps[0]!.big).toBe(false);
    expect(p.steps[1]!.big).toBe(true);
    expect(p.buttonAt).toBeGreaterThan(p.steps[1]!.at);
    expect(p.buttonAt).toBeLessThanOrEqual(3000);
  });

  it('gold only: no columns, still reaches the button', () => {
    const p = chestPlan([], 25);
    expect(p.steps).toHaveLength(0);
    expect(p.goldAt).toBeGreaterThan(0);
    expect(p.buttonAt).toBeGreaterThan(p.goldAt);
  });

  it('nothing at all still ends', () => {
    const p = chestPlan([], 0);
    expect(p.goldAt).toBe(-1);
    expect(p.buttonAt).toBeGreaterThan(0);
  });

  it('single reward: the finish fires once, even with repeated taps', () => {
    const f = new ChestFlow();
    expect(f.finish()).toBe(false); // butondan önce verilmez
    expect(f.tap()).toBe('open');
    expect(f.tap()).toBe('skip'); // animasyon sırasında dokunma = sona atla
    f.reveal();
    expect(f.tap()).toBeNull();
    expect(f.finish()).toBe(true);
    expect(f.finish()).toBe(false); // çift dokunma ikinci ödül vermez
    expect(f.phase).toBe('done');
  });

  it('skip keeps items: reveal after skip, then one finish', () => {
    const f = new ChestFlow();
    f.tap();
    f.tap();
    f.reveal();
    f.reveal();
    expect(f.finish()).toBe(true);
    expect(f.finish()).toBe(false);
  });

  it('key is stable for the same drop and differs between drops', () => {
    const a = { node: 'n1', items: ['x'], left: ['y'], gold: 5 };
    expect(chestKey(a)).toBe(chestKey({ ...a }));
    expect(chestKey(a)).not.toBe(chestKey({ ...a, gold: 6 }));
  });
});

describe('chest claim (Take all)', () => {
  const chestState = (full: boolean): CampaignState => {
    let s0 = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 9 }), 'druid'), '6B');
    while (nextStep(s0).kind !== 'treasure') s0 = autoResolve(s0);
    let s: CampaignState = { ...s0, inventory: [] };
    delete s.pendingLoot;
    if (full) for (let i = 0; i < BAG_SIZE; i++) s = addItem(s, 'turnshoes').state;
    return completeSimple(s, 'treasure');
  };

  it('everything fits: items stay in the bag, the drop record closes, no Loot screen', () => {
    const s = chestState(false);
    const bag = s.inventory.length;
    const r = chestClaim(s, true);
    expect(r.done).toBe(true);
    expect(r.state.pendingLoot).toBeUndefined();
    expect(r.state.inventory).toHaveLength(bag);
    // ikinci Take all (çift dokunma) yeni ödül vermez: kayıt yok, durum aynı
    expect(chestClaim(r.state, true)).toEqual({ state: r.state, done: false });
  });

  it('works on the stashed view too (reload path): same items end in the bag', () => {
    const s = chestState(false);
    const st = stashLoot(s);
    const r = chestClaim(st, true);
    expect(r.done).toBe(true);
    expect(r.state.inventory).toHaveLength(s.inventory.length);
  });

  it('bag full: nothing lost, Loot screen opens with the leftovers; after making room Take all finishes', () => {
    const s = chestState(true);
    const left = s.pendingLoot!.left!.length;
    expect(left).toBeGreaterThan(0);
    const r = chestClaim(s, true);
    expect(r.done).toBe(false);
    expect(r.state.pendingLoot!.left).toHaveLength(left);
    const freed = discardItem(r.state, r.state.inventory[0]!.uid);
    expect(chestClaim(freed, true).state.inventory.length).toBeGreaterThan(freed.inventory.length - 1);
  });

  it('no items (gold only): untouched, Continue opens the Loot screen', () => {
    const s = chestState(false);
    const r = chestClaim(s, false);
    expect(r.done).toBe(false);
    expect(r.state).toBe(s);
  });
});
