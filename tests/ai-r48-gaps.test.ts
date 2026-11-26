import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, type AiConfig } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';

// r48 (Lead): YZ değer boşlukları. Oyun kuralı ve denge değeri değişmez; yalnız YZ terazisi.
//  - Glacier Crater (Mage 3.v): yan vuruş + Chilled ağaç tetiği (`hit` -> beside) YZ'de zaten 'tree' terimine giriyor; test bunu kilitler.
//  - Falling Oak (Druid 4.u1-u3): çağrının iniş (arrive) tetikleri eskiden hiç tartılmıyordu; artık çağrı değerine yuva bazında eklenir.
const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const comp = (cls: string, r: Record<string, number>) => {
  const t = treeOf(cls)!;
  return compileTree(t, { v: t.version, r })!;
};
const fight = (cls: string, slot: number, r: Record<string, number> | null, foes: Record<number, string>) => {
  const setup = content.battleSetup('random-battle', 3, 'test', { party: cells({ [slot]: cls }), enemies: cells(foes), units: { party: r ? { [slot]: { tree: comp(cls, r) } } : {}, enemies: {} } } as never, false);
  const b = new Battle(setup);
  b.debugClearCooldowns();
  const me = b.combatants.find((c) => c.side === 'party')!;
  me.mp = me.maxMp;
  return { b, me };
};
const cands = (b: Battle, uid: string, skill: string) => explainChoice(b, uid, ai)!.candidates.filter((c) => c.skill === skill);
const maxTerm = (b: Battle, uid: string, skill: string, term: string) => Math.max(...cands(b, uid, skill).map((c) => c.terms?.[term] ?? 0));
const FULL = { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior', 4: 'warrior', 5: 'warrior' };

describe('Glacier Crater (yan vuruş + Chilled) YZ değerinde', () => {
  it('ağaçsız Ice Crater tree terimi yok; Glacier Crater ile var ve skor yükselir', () => {
    const a = fight('mage', 7, null, FULL);
    const g = fight('mage', 7, { '3.v': 1 }, FULL);
    expect(maxTerm(a.b, a.me.uid, 'ice_crater', 'tree')).toBe(0);
    expect(maxTerm(g.b, g.me.uid, 'ice_crater', 'tree')).toBeGreaterThan(0);
    const score = (x: ReturnType<typeof fight>) => Math.max(...cands(x.b, x.me.uid, 'ice_crater').map((c) => c.score ?? 0));
    expect(score(g)).toBeGreaterThan(score(a));
  });

  it('yanında düşman olan hedef daha değerli: tek düşmanda tree terimi, kalabalıkta olandan düşük', () => {
    const lone = fight('mage', 7, { '3.v': 1 }, { 1: 'warrior' });
    const crowd = fight('mage', 7, { '3.v': 1 }, FULL);
    expect(maxTerm(lone.b, lone.me.uid, 'ice_crater', 'tree')).toBe(0);
    expect(maxTerm(crowd.b, crowd.me.uid, 'ice_crater', 'tree')).toBeGreaterThan(0);
  });

  it('YZ yan komşusu olan hedefi seçer (aynı tahtada kalabalık ve yalnız ön düşman)', () => {
    // E1 (orta şerit) iki yan komşuya sahip; E0 / E2 kenarda tek komşu. Glacier Crater en çok yan değerli hedefe gider.
    const g = fight('mage', 7, { '3.v': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    const best = cands(g.b, g.me.uid, 'ice_crater').sort((x, y) => (y.score ?? 0) - (x.score ?? 0))[0]!;
    expect(best.target).toMatch(/^E1:/);
  });
});

describe('Falling Oak (Treant iniş vuruşu + Stun) YZ değerinde', () => {
  const summon = (r: Record<string, number> | null, foes: Record<number, string> = FULL) => {
    const x = fight('druid', 7, r, foes);
    return Math.max(...cands(x.b, x.me.uid, 'summon_treant').map((c) => c.terms?.summon ?? 0));
  };
  const U1 = { '4.u1': 1 };
  const U2 = { '4.u1': 1, '4.u2': 1 };
  const U3 = { '4.u1': 1, '4.u2': 1, '4.u3': 1 };

  it('iniş hasarı çağrı değerine girer: Crashing Arrival > ağaçsız; Oakfall (2. sıra) > Crashing Arrival; Falling Oak > Oakfall', () => {
    const base = summon(null);
    const u1 = summon(U1);
    const u2 = summon(U2);
    const u3 = summon(U3);
    expect(u1).toBeGreaterThan(base);
    expect(u2).toBeGreaterThan(u1);
    expect(u3).toBeGreaterThan(u2);
  });

  it('düşman yokken iniş değeri yok (vuracak kimse yok)', () => {
    const none = fight('druid', 7, U3, { 0: 'warrior' });
    for (const c of none.b.combatants.filter((x) => x.side === 'enemy')) c.hp = 0;
    const base = fight('druid', 7, null, { 0: 'warrior' });
    for (const c of base.b.combatants.filter((x) => x.side === 'enemy')) c.hp = 0;
    const arr = none.b.aiArrival(none.me.uid, 'summon_treant', none.b.summonSlots(none.me.uid, 'summon_treant')[0] ?? 0);
    expect(arr).not.toBeNull();
    expect(arr!.triggers.every((t) => t.recipients(t.hook.do[0]!).units.length === 0)).toBe(true);
  });

  it('Stun hakkı (çağıran başına ilk Treant) kullanılınca Stun payı YZ değerinden düşer; hasar payı kalır', () => {
    const x = fight('druid', 7, U3, FULL);
    const slot = x.b.summonSlots(x.me.uid, 'summon_treant')[0]!;
    const stunTriggers = () => x.b.aiArrival(x.me.uid, 'summon_treant', slot)!.triggers.filter((t) => t.hook.do.some((a) => (a as { status?: string }).status === 'stun')).length;
    expect(stunTriggers()).toBe(1);
    const before = Math.max(...cands(x.b, x.me.uid, 'summon_treant').map((c) => c.terms?.summon ?? 0));
    const hk = x.b.aiArrival(x.me.uid, 'summon_treant', slot)!.triggers.find((t) => t.hook.once === 'perSummoner')!.hook;
    (x.b as unknown as { firedOnSet: Set<string> }).firedOnSet.add(`${x.me.uid}|${hk.node}|^summoner`);
    expect(stunTriggers()).toBe(0);
    const after = Math.max(...cands(x.b, x.me.uid, 'summon_treant').map((c) => c.terms?.summon ?? 0));
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(summon(null));
  });

  it('aiArrival savaşı değiştirmez (birim eklenmez, sayaç artmaz) ve ağaçsız / çağrısız skill için boş', () => {
    const x = fight('druid', 7, U3, FULL);
    const n = x.b.combatants.length;
    const slot = x.b.summonSlots(x.me.uid, 'summon_treant')[0]!;
    expect(x.b.aiArrival(x.me.uid, 'summon_treant', slot)).not.toBeNull();
    expect(x.b.combatants.length).toBe(n);
    const plain = fight('druid', 7, null, FULL);
    expect(plain.b.aiArrival(plain.me.uid, 'summon_treant', slot)).toBeNull();
    expect(x.b.aiArrival(x.me.uid, 'root_smash', slot)).toBeNull();
  });
});
