// Harita 2 karşılaşma kuralları sefer katmanında (maps-2-3.md M-A / B3 / M-B / M-I / M-J): plan -> teams.rules -> motor.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { battlePlan, campaignWaveTeams, debugJumpDrownedReach, debugTeleport, DROWNED_REACH, setMapOverride, encounterWaves, ENCOUNTERS, newCampaign, resumeKey, validateEncounters } from '../src/campaign';
import { Battle, content } from '../src/engine';

beforeAll(() => setMapOverride(DROWNED_REACH, true));
afterAll(() => setMapOverride(DROWNED_REACH, null));
let base: ReturnType<typeof newCampaign> | undefined;
const planAt = (node: string) => {
  const s = base ??= debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 11 }));
  return battlePlan(debugTeleport(s, node));
};
const battleOf = (plan: ReturnType<typeof planAt>) =>
  new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false));

describe('Harita 2 karşılaşma kuralları (sefer)', () => {
  it('veri geçerli; kuralsız karşılaşmanın planında rules alanı yok', () => {
    expect(validateEncounters()).toEqual([]);
    expect(planAt('dr3').rules).toBeUndefined();
  });

  it('dr4 Drowned Mill = Tide: savaş başında ön sıralar su altında', () => {
    const plan = planAt('dr4');
    expect(plan.rules).toEqual({ condition: 'tide' });
    const b = battleOf(plan);
    expect(b.rules?.condition?.id).toBe('tide');
    expect(b.ground.filter((g) => g.ground === 'flooded').map((g) => g.board).sort()).toEqual(['enemy', 'party']);
  });

  it('dr13 Reedway = Break the Totem: tek dalga, totem işaretli, takviye grubu planda', () => {
    const plan = planAt('dr13');
    expect(encounterWaves(ENCOUNTERS.dr_13!, 'dr13', 'battle', 'II')).toHaveLength(1);
    expect(plan.waves).toBeUndefined();
    expect(plan.rules?.objective).toMatchObject({ type: 'totem' });
    expect(plan.rules?.reinforce?.enemies.filter(Boolean)).toEqual(['sunken_dead', 'sunken_dead']); // Harita 2 sürümü (open-questions 444)
    const b = battleOf(plan);
    expect(b.objectiveUnits().map((c) => c.defId)).toEqual(['hex_totem']);
    expect(b.objectiveProgress()).toEqual({ type: 'totem', current: 0, target: 1 });
  });

  it('dr17 Great Weir = Hold the Bridge, dr21 Causeway = Survive', () => {
    expect(battleOf(planAt('dr17')).rules?.objective).toEqual({ type: 'hold', row: 0 });
    expect(battleOf(planAt('dr21')).rules?.objective).toMatchObject({ type: 'survive' });
  });

  it('dr55 The Sound / dr60 The Narrows = güverte: kapalı hücrelerde kimse yok', () => {
    for (const node of ['dr55', 'dr60']) {
      const plan = planAt(node);
      expect(plan.rules?.blocked).toBe('deck');
      const b = battleOf(plan);
      expect(b.rules?.blocked).toEqual([7, 9]);
      expect(b.combatants.filter((c) => b.isBlocked(c.slot))).toEqual([]);
    }
  });

  it('kurallar sürdürme anahtarına girer; kuralsız planın anahtarı değişmez', () => {
    const plan = planAt('dr4');
    expect(resumeKey(plan)).not.toBe(resumeKey({ ...plan, rules: undefined }));
    const plain = planAt('dr3');
    expect(resumeKey(plain)).toBe(resumeKey({ ...plain }));
  });
});
