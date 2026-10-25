// Debug "Objective test" savaş verisi (src/game/rules-test-battle.ts): her tür kurulur, kural motora gider, savaş iki modda da oynanır.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import { RULES_TESTS, rulesTestBattleData } from '../src/game/rules-test-battle';

const build = (seed: number, mode: 'turns' | 'test', kind: (typeof RULES_TESTS)[number]['kind']) => {
  const d = rulesTestBattleData(seed, mode, kind);
  return new Battle(content.battleSetup(content.DEFAULT_BATTLE, d.seed, d.mode, { ...d.teams }, false));
};

describe('Objective test savaşları (debug)', () => {
  for (const t of RULES_TESTS)
    for (const mode of ['turns', 'test'] as const)
      it(`${t.kind} / ${mode}: kurulur ve biter`, () => {
        const b = build(7, mode, t.kind);
        expect(b.rules).toBeTruthy();
        if (t.kind === 'totem') expect(b.objectiveUnits()).toHaveLength(1);
        if (t.kind === 'deck' || t.kind === 'mixed') expect(b.combatants.filter((c) => b.isBlocked(c.slot))).toEqual([]);
        let i = 0;
        for (let n = 0; n < 800 && !b.winner; n++) {
          const living = b.combatants.filter((c) => c.hp > 0 && !c.inert);
          const uid = mode === 'turns' ? b.currentActor?.uid : living[i++ % living.length]?.uid;
          if (!uid) break;
          const r = b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
          if (!r.ok && mode === 'turns') break;
        }
        if (mode === 'turns') expect(b.winner).toBeTruthy();
      });
});
