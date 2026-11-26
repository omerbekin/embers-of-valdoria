import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, type AiConfig, type BattleMode } from '../src/engine';
import { ValueContext } from '../src/engine/ai-value';
import { compileTree, treeOf } from '../src/progression';

// r43 (Lead, Ömer'in r42 seçeneklerinde ortak): YZ değerleme eksikleri. Oyun kuralı ve denge değeri değişmez; yalnız YZ terazisi.
const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const comp = (cls: string, r: Record<string, number>) => {
  const t = treeOf(cls)!;
  return compileTree(t, { v: t.version, r })!;
};

describe('r43 madde 1: ağaç Rage kancaları ve kendine Fortified', () => {
  const warriorBattle = (r: Record<string, number> | null) => {
    const setup = content.battleSetup('random-battle', 3, 'test', { party: cells({ 1: 'warrior' }), enemies: cells({ 1: 'mage', 4: 'archer' }), units: { party: r ? { 1: { tree: comp('warrior', r) } } : {}, enemies: {} } }, false);
    const b = new Battle(setup);
    b.debugClearCooldowns();
    const me = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
    me.mp = me.maxMp;
    return { b, me };
  };
  const best = (b: Battle, uid: string, skill: string, term: string) =>
    Math.max(0, ...explainChoice(b, uid, ai)!.candidates.filter((c) => c.skill === skill).map((c) => c.terms?.[term] ?? 0));

  it('Reckless Heat: Charge Rage kazancı değer alır; Rage tavanda iken 0 (taşan Rage değersiz)', () => {
    const { b, me } = warriorBattle({ '3.fb': 1 });
    me.rage = 0;
    const low = best(b, me.uid, 'charge', 'treeRage');
    expect(low).toBeGreaterThan(0);
    me.rage = me.maxRage!;
    expect(best(b, me.uid, 'charge', 'treeRage')).toBe(0);
    // tavana yakın: kalan boşluk kadar (tavansız 30'dan az)
    me.rage = me.maxRage! - 5;
    const near = best(b, me.uid, 'charge', 'treeRage');
    expect(near).toBeGreaterThanOrEqual(0);
    expect(near).toBeLessThan(low);
  });

  it('ağaçsız Warrior: treeRage terimi yok (eski terazi aynı)', () => {
    const { b, me } = warriorBattle(null);
    me.rage = 0;
    expect(best(b, me.uid, 'charge', 'treeRage')).toBe(0);
  });

  it('Roaring Charge (taban 30, bir kez): Rage tabanın altındayken değer, üstündeyken 0', () => {
    const { b, me } = warriorBattle({ '3.n0': 1 });
    me.rage = 0;
    expect(best(b, me.uid, 'charge', 'treeRage')).toBeGreaterThan(0);
    me.rage = me.maxRage!;
    expect(best(b, me.uid, 'charge', 'treeRage')).toBe(0);
  });

  it('Battle.aiTreeRage motorla aynı kazancı okur ve yan etkisizdir', () => {
    const { b, me } = warriorBattle({ '3.fb': 1 });
    const gain = (treeOf('warrior')!.nodes['3.fb']!.fx!.find((x) => (x as { h?: string }).h === 'rage') as unknown as { gain: number }).gain;
    const sk = b.skill('charge', me)!;
    expect(b.aiTreeRage(me, undefined, sk, 'cast').gain).toBe(gain);
    expect(b.aiTreeRage(me, undefined, sk, 'cast').gain).toBe(gain);
    expect(me.treeOnce ?? []).toEqual([]);
  });

  it("Grim Calm (Headsman's Blow kendine Fortified): saldırı skill'inin kendine koruması değer alır", () => {
    const val = (r: Record<string, number>) => {
      const { b, me } = warriorBattle(r);
      me.rage = me.maxRage!;
      return best(b, me.uid, 'headsmans_blow', 'control');
    };
    expect(val({ '4.d1': 1 })).toBeGreaterThan(val({}));
  });
});

describe('r43 madde 2: bekleyen kor (Banked Coals) gelecek hasar sayılır', () => {
  const coalBattle = (coal: number, mode: BattleMode = 'test') => {
    const setup = content.battleSetup('random-battle', 3, mode, { party: cells({ 1: 'warrior', 4: 'druid' }), enemies: cells({ 1: 'mage' }) }, false);
    const b = new Battle(setup);
    b.debugClearCooldowns();
    for (const c of b.combatants) c.hp = c.maxHp = 5000;
    const w = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
    const d = b.combatants.find((c) => c.side === 'party' && c.defId === 'druid')!;
    d.mp = d.maxMp;
    w.hp = 200;
    if (coal > 0) w.coals = [{ left: 1, per: coal, rest: coal, source: w.uid, type: 'physical' }];
    return { b, w, d };
  };

  it('coalNextTick: son tikte kalanın tamamı, öncesinde tik başı', () => {
    const { b, w } = coalBattle(0);
    w.coals = [{ left: 3, per: 10, rest: 25, source: w.uid, type: 'physical' }, { left: 1, per: 4, rest: 7, source: w.uid, type: 'physical' }];
    expect(b.coalNextTick(w)).toBe(10 + 7);
    expect(w.coals.map((c) => c.rest)).toEqual([25, 7]); // salt okunur
  });

  for (const mode of ['test', 'turns'] as const)
    it(`${mode}: taşıyanın kendi tehlike tahmini (before) sıradaki kor tiki kadar artar, inDanger döner`, () => {
      const ctxOf = (coal: number) => {
        const { b, w } = coalBattle(coal, mode);
        return { c: new ValueContext(b, w, content.aiConfig.value!, () => 'lowest_hp'), w, b };
      };
      const tick = 201; // can 200
      const base = ctxOf(0);
      const hot = ctxOf(tick);
      expect(hot.b.coalNextTick(hot.w)).toBe(tick);
      expect((hot.c.before.get(hot.w.uid) ?? 0) - (base.c.before.get(base.w.uid) ?? 0)).toBeCloseTo(tick, 6);
      expect(base.c.inDanger(base.w)).toBe(false);
      expect(hot.c.inDanger(hot.w)).toBe(true);
    });

  it("şifacı YZ'si: kor tiki canından fazlaysa taşıyanı kurtarmak 'save' değeri alır; korsuz almaz", () => {
    const save = (coal: number) => {
      const { b, d } = coalBattle(coal);
      return Math.max(0, ...explainChoice(b, d.uid, ai)!.candidates.filter((c) => c.skill === 'rejuvenate').map((c) => c.terms?.save ?? 0));
    };
    expect(save(0)).toBe(0);
    expect(save(201)).toBeGreaterThan(0); // can 200: kor tiki 201 öldürür, şifa kurtarır
  });
});
