import { describe, expect, it } from 'vitest';
import { blessingIcon, campaignEffects } from '../src/game/battle-effects';
import { WAYSHRINES } from '../src/campaign';
import type { CampaignState } from '../src/campaign';

describe('battle effects (campaign)', () => {
  const base = { difficulty: 'normal', mapId: 'drowned_reach', at: 'dr31', boons: [] } as unknown as CampaignState;
  it('no difficulty / chapter strength entries', () => {
    const names = campaignEffects({ ...base, boons: Object.keys(WAYSHRINES) } as CampaignState).map((e) => e.name);
    expect(names.some((n) => /difficulty|Chapter strength/i.test(n))).toBe(false);
  });
  it('lists every carried blessing with icon and effect', () => {
    const ids = Object.keys(WAYSHRINES);
    const list = campaignEffects({ ...base, boons: ids } as CampaignState);
    expect(list.map((e) => e.name)).toEqual(ids.map((i) => WAYSHRINES[i]!.name));
    for (const e of list) { expect(e.icon).toBeTruthy(); expect(e.text).toContain('Every hero'); }
  });
  it('each blessing has its own painted icon, unknown falls back to generic', () => {
    const ids = Object.keys(WAYSHRINES);
    const list = campaignEffects({ ...base, boons: ids } as CampaignState);
    list.forEach((e, i) => expect(e.icon).toBe(`blessing:${ids[i]!.replace(/^.*_shrine_/, '')}`));
    expect(new Set(list.map((e) => e.icon)).size).toBe(ids.length);
    expect(blessingIcon('dr_shrine_unknown_new')).toBe('blessing:blessing');
  });
  it('empty without blessings', () => {
    expect(campaignEffects(base)).toEqual([]);
  });
});
