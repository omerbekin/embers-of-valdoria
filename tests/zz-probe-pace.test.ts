import { it } from 'vitest';
import { Battle, chooseAction, content, type Teams } from '../src/engine';
it('probe', () => {
  const cells = (m: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => m[i] ?? '');
  const teams: Teams = { party: cells({ 0: 'warrior', 1: 'mage', 3: 'druid' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 3: 'hexer' }) };
  const SAFE = new Set(['skillUsed', 'resource', 'damage', 'rage', 'turnStart', 'miss', 'dodge', 'heal', 'mpRegen', 'passive', 'shield', 'globalUsed']);
  for (const v of [0, 0.1]) {
    let ok = 0, bad = 0, long = 0, longBad = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = content.battleSetup('random-battle', seed, 'turns', teams, false);
      const b = new Battle({ ...s, formulas: { ...s.formulas, attributes: { ...s.formulas.attributes, spdVariance: v } } });
      let q8 = b.turnQueue(8); let k = 0;
      for (let i = 0; i < 200 && !b.winner; i++) {
        const u = b.currentUid!; const q = b.turnQueue();
        const r = b.applyChoice(u, chooseAction(b, u, content.aiConfig));
        if (!r.ok || b.winner) break;
        const clean = r.events.every((e) => SAFE.has(e.type));
        if (!clean) { q8 = b.turnQueue(8); k = 0; continue; }
        if (b.currentUid === q[1]) ok++; else bad++;
        k++; if (k < 8) { long++; if (q8[k] !== b.currentUid) longBad++; }
      }
    }
    console.log('v', v, 'next ok', ok, 'bad', bad, 'long', long, 'longBad', longBad);
  }
});
