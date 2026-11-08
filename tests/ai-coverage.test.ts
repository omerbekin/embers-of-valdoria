/**
 * YZ KAPSAMI (engine-dev 2026-10-29, open-questions 458; scratchpad ai-coverage.md B / C satırları): YZ'nin önceden değer vermediği mekanikler artık
 * terazide. Her mekanik için terim olması gerektiğinde sıfırdan farklı, olmaması gerektiğinde yok. Ağırlıklar data/ai.json > value.aiCov (PROVİZYON).
 */
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, explainChoice, previewSkill } from '../src/engine';
import type { AiConfig, Combatant, CombatantDef, Teams, UnitSetup } from '../src/engine';
import { aiCoverageInternals as AC } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext, coverageOf } from '../src/engine/ai-value';
import { compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

const ai: AiConfig = { ...content.aiConfig, global: undefined };
const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
function arena(party: [string, number][], enemies: [string, number][], mode: 'test' | 'turns' = 'test'): Battle {
  const base = content.battleSetup('random-battle', 1, mode, { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
  b.debug.crit = 'never';
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0, critChance: 0 });
    c.mp = c.maxMp;
  }
  return b;
}
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
function withTrees(party: Record<number, string>, enemies: Record<number, string>, units: { party?: Record<number, UnitSetup>; enemies?: Record<number, UnitSetup> }): Battle {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units.party ?? {}, enemies: units.enemies ?? {} } };
  const b = new Battle(content.battleSetup('random-battle', 11, 'test', teams, false));
  b.debug.crit = 'never';
  b.debugClearCooldowns();
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  return b;
}
function alloc(tree: TreeData, level: number, steps: string[]): TreeAlloc {
  let a = emptyAlloc(tree);
  for (const s of steps) {
    const [key, times] = s.split('*');
    for (let i = 0; i < Number(times ?? 1); i++) {
      const r = take(tree, level, a, key!);
      if (!r.ok) throw new Error(`${key}: ${r.block.text}`);
      a = r.alloc;
    }
  }
  return a;
}
const tree = (cls: string, steps: string[], level = 30) => compileTree(treeOf(cls)!, alloc(treeOf(cls)!, level, steps))!;
const vcOf = () => ({ ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) });
const ctxOf = (b: Battle, actor: Combatant) => new ValueContext(b, actor, vcOf(), (c) => content.aiConfig.profiles[c.ai ?? content.aiConfig.defaultProfile]?.focus ?? 'lowest_ratio');
const cand = (b: Battle, uid: string, skill: string) => explainChoice(b, uid, ai)!.candidates.filter((c) => c.skill === skill);
const P = (b: Battle, i = 0) => b.combatants.filter((c) => c.side === 'party')[i]!;
const E = (b: Battle, i = 0) => b.combatants.filter((c) => c.side === 'enemy')[i]!;

describe('ai.json: kapsam ağırlıkları veriden', () => {
  it('value.aiCov okunur (varsayılanlarla birleşir)', () => {
    const cov = coverageOf(vcOf());
    expect(cov.groundStayShare).toBe(content.aiConfig.value!.aiCov!.groundStayShare);
    expect(cov.bell.horizon).toBe(2);
    expect(cov.push.reachShare).toBe(0.5);
    expect(cov.tree.cooldownShare).toBeGreaterThan(0);
  });
});

describe('1. zemin konumlanması (genel zemin kuralı)', () => {
  it('düşman Burning zemininde duran birim için zeminsiz hücreye geçmek artı; zemin yoksa 0', () => {
    const b = arena([['archer', 0]], [['warrior', 0]]);
    const me = P(b);
    const ctx0 = ctxOf(b, me);
    expect(AC.cellDelta(ctx0, me, 'party', 1)).toBe(0);
    expect(b.debugPlaceGround(E(b).uid, 'burning', 'party', [0], 3, 0.5).ok).toBe(true);
    const ctx = ctxOf(b, me);
    expect(AC.cellWorth(ctx, me, 'party', 0)).toBeLessThan(0);
    expect(AC.cellDelta(ctx, me, 'party', 1)).toBeGreaterThan(0);
  });

  it('ilk tik kesin, sonrakiler groundStayShare payıyla', () => {
    const b = arena([['archer', 0]], [['warrior', 0]]);
    const ctx = ctxOf(b, P(b));
    expect(AC.stayTicks(ctx, P(b), 1)).toBe(1);
    expect(AC.stayTicks(ctx, P(b), 3)).toBeCloseTo(1 + 2 * coverageOf(ctx.vc).groundStayShare);
  });

  it('Slow / Chilled durumu birim için eksi; Soaked üstündeki Burning\'i söndürür (artı pay)', () => {
    const b = arena([['archer', 0]], [['warrior', 0]]);
    const me = P(b);
    const ctx = ctxOf(b, me);
    expect(AC.statusEffectWorth(ctx, me, 'slow', 2)).toBeLessThan(0);
    expect(AC.statusEffectWorth(ctx, me, 'chilled', 2)).toBeLessThan(0);
    const plain = AC.statusEffectWorth(ctx, me, 'soaked', 1);
    me.statuses.push({ kind: 'burning', turns: 2, source: E(b).uid, amount: 30 } as Combatant['statuses'][number]);
    expect(AC.statusEffectWorth(ctx, me, 'soaked', 1)).toBeGreaterThan(plain);
  });

  it('Nature\'s Wrath Soaked: ateşçi dost varken kontrol değeri düşer (kendi takımına zarar), ateşsiz takımda bedel yok', () => {
    const b = arena([['druid', 4], ['mage', 5]], [['warrior', 0], ['warrior', 1]]);
    const noFire = arena([['druid', 4], ['archer', 5]], [['warrior', 0], ['warrior', 1]]);
    const soaked = b.statusDef('soaked')!;
        const ctx = ctxOf(b, P(b));
    expect(b.combatants.filter((c) => c.side === 'enemy').reduce((a, c) => a + AC.ownElementLoss(ctx, c, soaked, 2), 0)).toBeGreaterThan(0);
    expect(AC.ownElementLoss(ctxOf(noFire, P(noFire)), E(noFire), soaked, 2)).toBe(0);
    const control = (x: Battle) => Math.max(...cand(x, P(x).uid, 'natures_wrath').map((c) => c.terms?.control ?? 0));
    expect(control(b)).toBeLessThan(control(noFire));
  });

  it('kendi DoT / zemin tiki bir sonraki turumuzdan önceki tehlikeye girer', () => {
    const b = arena([['archer', 0]], [['warrior', 0]]);
    const me = P(b);
    const hitsOnly = ctxOf(b, me).before.get(me.uid) ?? 0;
    me.statuses.push({ kind: 'burning', turns: 2, source: E(b).uid, amount: 30 } as Combatant['statuses'][number]);
    expect(ctxOf(b, me).before.get(me.uid) ?? 0).toBeCloseTo(hitsOnly + b.statusTickDamage(me, me.statuses.at(-1)!));
    expect(b.statusTickDamage(me, me.statuses.at(-1)!)).toBeGreaterThan(0);
  });
});

describe('2. zemin bırakmanın değeri: gerçek tik + durum yan etkileri + tepkime', () => {
  it('Poison zemini (Wail): şifacısı olan düşmanda Poisoned şifa kesintisi ground terimi; şifacı yoksa yok', () => {
    const heal = arena([['undead', 0]], [['paladin', 0], ['warrior', 1]]);
    const w = cand(heal, P(heal).uid, 'wail_of_the_dead').filter((c) => (c.terms?.damage ?? 0) > 0);
    expect(w.some((c) => (c.terms?.ground ?? 0) > 0)).toBe(true);
    const none = arena([['undead', 0]], [['warrior', 0], ['warrior', 1]]);
    expect(cand(none, P(none).uid, 'wail_of_the_dead').every((c) => !c.terms?.ground)).toBe(true);
  });

  it('Meteor (Burning) Poison zeminine: Explosion tepkimesi reaction terimi; zehir yoksa yok', () => {
    const plain = arena([['mage', 7]], [['warrior', 4]]);
    expect(cand(plain, P(plain).uid, 'meteor').every((c) => !c.terms?.reaction)).toBe(true);
    const b = arena([['mage', 7]], [['warrior', 4]]);
    expect(b.debugPlaceGround(P(b).uid, 'poison', 'enemy', [E(b).slot], 3, 0.3).ok).toBe(true);
    expect(cand(b, P(b).uid, 'meteor').some((c) => (c.terms?.reaction ?? 0) > 0)).toBe(true);
  });
});

describe('3. Heat Mirage: Mage\'e yakın dövüş bedeli', () => {
  it('melee vuruş: mirage eksi; Mage bu tur kullandıysa ya da vuruş menzilliyse yok', () => {
    const b = arena([['warrior', 0]], [['mage', 0]]);
    expect(cand(b, P(b).uid, 'melee_attack')[0]!.terms?.mirage ?? 0).toBeLessThan(0);
    E(b).mirageUsed = true;
    expect(cand(b, P(b).uid, 'melee_attack')[0]!.terms?.mirage).toBeUndefined();
    const r = arena([['archer', 0]], [['mage', 0]]);
    expect(cand(r, P(r).uid, 'quick_shot')[0]!.terms?.mirage).toBeUndefined();
  });
});

describe('4. Berserker: pasif çarpanı tur değerinde, vurulunca kazandığı Rage bedel', () => {
  it('düşman Warrior\'a vurmak rage eksi; Archer\'a vurmak yok', () => {
    const b = arena([['archer', 0]], [['warrior', 0]]);
    E(b).rage = 0;
    expect(cand(b, P(b).uid, 'quick_shot')[0]!.terms?.rage ?? 0).toBeLessThan(0);
    const a = arena([['archer', 0]], [['archer', 0]]);
    expect(cand(a, P(a).uid, 'quick_shot')[0]!.terms?.rage).toBeUndefined();
  });

  it('yaralı Berserker\'in tur değeri pasif çarpanıyla büyür', () => {
    const b = arena([['archer', 0]], [['warrior', 0]]);
    const w = E(b);
    w.rage = w.maxRage ?? 100;
    const full = ctxOf(b, P(b)).turnValue(w);
    w.hp = Math.round(w.maxHp * 0.2);
    expect(ctxOf(b, P(b)).turnValue(w)).toBeGreaterThan(full);
  });
});

describe('5. Divine Light: tur değeri ve Paladin şifası', () => {
  it('Divine Light tur değerine eklenir', () => {
    const b = arena([['paladin', 0]], [['warrior', 0]]);
    const pal = P(b);
    const withDl = ctxOf(b, pal).turnValue(pal);
    const pe = pal.passive!;
    pal.passive = undefined;
    const without = ctxOf(b, pal).turnValue(pal);
    pal.passive = pe;
    expect(withDl).toBeGreaterThan(without);
  });

  it('başka yaralı yokken şifa bedava şifayı boşa düşürür: divineLight eksi; ağır yaralı varken yok', () => {
    const b = arena([['paladin', 0], ['warrior', 1]], [['warrior', 0]]);
    const w = P(b, 1);
    w.hp = w.maxHp - 8;
    const heals = () => explainChoice(b, P(b).uid, ai)!.candidates.filter((c) => c.heal > 0);
    expect(heals().length).toBeGreaterThan(0);
    expect(heals().some((c) => (c.terms?.divineLight ?? 0) < 0)).toBe(true);
    w.hp = Math.round(w.maxHp * 0.2);
    expect(heals().every((c) => c.terms?.divineLight === undefined)).toBe(true);
  });
});

describe('6. Spell Ward saldıran tarafından', () => {
  it('kancalı büyü kalkanına büyü vuruşu: ward eksi; kanca yoksa yok', () => {
    const b = arena([['mage', 0]], [['warrior', 0], ['antimage', 1]]);
    const am = E(b, 1);
    const foe = E(b, 0);
    expect(cand(b, P(b).uid, 'fire_bolt').find((c) => c.target?.includes('Warrior'))?.terms?.ward).toBeUndefined();
    expect(b.useSkill(am.uid, 'spell_ward', foe.uid).ok).toBe(true);
    expect(foe.shieldHooks?.length ?? 0).toBeGreaterThan(0);
    const t = cand(b, P(b).uid, 'fire_bolt').find((c) => c.terms && c.terms.ward !== undefined);
    expect(t?.terms?.ward ?? 0).toBeLessThan(0);
  });
});

describe('7. Vesper çan büyümesi', () => {
  it('ringsBell skill\'i bell artı; çan çalmayan skill\'de yok', () => {
    const b = arena([['vesper', 0]], [['warrior', 0]]);
    expect(cand(b, P(b).uid, 'toll')[0]!.terms?.bell ?? 0).toBeGreaterThan(0);
    const m = arena([['mage', 0]], [['warrior', 0]]);
    expect(cand(m, P(m).uid, 'fire_bolt')[0]!.terms?.bell).toBeUndefined();
  });
});

describe('7c. Skald ağacı: her tetik / etki terazide', () => {
  // Ağaç v1 (2026-11-08, docs/design/classes/skald.md): her tetik düğümü YZ değerine girer (memory: ai-side-for-new-content); koşul tutunca artı, tutmayınca 0.
  const T = treeOf('skald')!;
  const st = (r: Record<string, number>) => compileTree(T, { v: T.version, r })!;
  const K = (b: Battle) => b.combatants.find((c) => c.side === 'party' && c.defId === 'skald')!;
  const fight = (r: Record<string, number>, enemies: Record<number, string> = { 1: 'warrior', 4: 'warrior' }, allies: Record<number, string> = {}, mode: 'test' | 'turns' = 'test') => {
    const teams: Teams = { party: cells({ 4: 'skald', ...allies }), enemies: cells(enemies), units: { party: { 4: { tree: st(r) } }, enemies: {} } };
    const b = new Battle(content.battleSetup('random-battle', 11, mode, teams, false));
    b.debug.crit = 'never';
    b.debugClearCooldowns();
    for (const c of b.combatants) {
      Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
      c.hp = c.maxHp = 5000;
    }
    const me = K(b);
    me.mp = Math.max(0, me.maxMp - 8); // MP kazancı değerli olsun, Stormcall (18 MP) da atılabilsin
    if (mode === 'turns') b.currentUid = me.uid; // turns modunda açıklama yalnız sırası gelen birimde
    return b;
  };
  const term = (b: Battle, skill: string, k: string) => Math.max(0, ...cand(b, K(b).uid, skill).map((c) => c.terms?.[k] ?? 0));
  type Opt = { enemies?: Record<number, string>; allies?: Record<number, string>; mode?: 'test' | 'turns' };
  const treeOn = (r: Record<string, number>, skill: string, prep?: (b: Battle) => void, o: Opt = {}) => {
    const b = fight(r, o.enemies, o.allies, o.mode);
    prep?.(b);
    return term(b, skill, 'tree');
  };
  const foesWith = (kind: string) => (b: Battle) => b.combatants.filter((c) => c.side === 'enemy').forEach((c) => b.debugAddStatus(c.uid, kind, 2));
  const lowFoes = (b: Battle) => b.combatants.filter((c) => c.side === 'enemy').forEach((c) => (c.hp = 1));
  const lowMp = (b: Battle) => (K(b).mp = 10); // MP kazancı ancak MP azken değerli
  const cd = (skill: string, n = 3) => (b: Battle) => (K(b).cooldowns[skill] = n);
  const both = (...fs: Array<(b: Battle) => void>) => (b: Battle) => fs.forEach((f) => f(b));

  it('ağaçsız Skald: tree terimi yok', () => {
    for (const s of ['hammer_spark', 'thunder_strike', 'war_drum', 'stormcall']) expect(treeOn({}, s, foesWith('slow')), s).toBe(0);
  });
  it('hit tetikleri durum koşullu (Static Recall, Rolling Thunder, Storm Tempo, Earthed Bolt): koşul tutunca artı, tutmayınca 0', () => {
    const turns: Opt = { mode: 'turns' };
    const rows: Array<[Record<string, number>, string, string, ((b: Battle) => void) | undefined, Opt]> = [
      [{ '0.f2': 3 }, 'hammer_spark', 'shocked', lowMp, {}],
      [{ '0.ea': 1 }, 'hammer_spark', 'shocked', undefined, turns],
      [{ '0.ma': 1 }, 'hammer_spark', 'slow', cd('thunder_strike'), {}],
      [{ '2.r': 3 }, 'thunder_strike', 'slow', lowMp, {}],
    ];
    for (const [r, skill, kind, prep, o] of rows) {
      const k = JSON.stringify(r);
      expect(treeOn(r, skill, prep, o), k).toBe(0);
      expect(treeOn(r, skill, prep ? both(prep, foesWith(kind)) : foesWith(kind), o), k).toBeGreaterThan(0);
    }
  });
  it('First Spark: ilk vuruş Slow tree artı', () => {
    expect(treeOn({ '0.n0': 1 }, 'hammer_spark')).toBeGreaterThan(0);
  });
  it('kill tetikleri (Living Storm durumlu ölüde, Grounding, Storm Breaker, Final Verse): öldürme ihtimalinde artı, yoksa 0', () => {
    expect(treeOn({ '0.v': 1 }, 'hammer_spark', lowFoes)).toBe(0); // durumsuz ölü: koşul tutmaz
    expect(treeOn({ '0.v': 1 }, 'hammer_spark', both(lowFoes, foesWith('slow')))).toBeGreaterThan(0);
    const rows: Array<[Record<string, number>, string, Opt]> = [
      [{ '2.f3': 3 }, 'thunder_strike', {}],
      [{ '4.u3': 1 }, 'stormcall', {}],
      [{ '4.l3': 1 }, 'stormcall', { mode: 'turns', allies: { 1: 'warrior' } }],
    ];
    for (const [r, skill, o] of rows) {
      expect(treeOn(r, skill, undefined, o), skill).toBe(0);
      expect(treeOn(r, skill, lowFoes, o), skill).toBeGreaterThan(0);
    }
  });
  it('Stun tetikleri (Struck Senseless, Grounded Storm, Thunder Memory): koşullu Stun şansıyla artı, Slow yokken daha az', () => {
    const memory = T.mastery.bar.find((x) => x.name === 'Thunder Memory')!.at;
    const rows: Array<[Record<string, number>, string]> = [
      [{ '2.ma': 1, '0.mb': 1 }, 'thunder_strike'],
      [{ '4.d2': 1, '4.d3': 1 }, 'stormcall'],
      [{ '2.ma': 1, '1.f1': 3, '1.f2': 5, '1.f3': memory - 8 }, 'thunder_strike'],
    ];
    for (const [r, skill] of rows) {
      const prep = both(cd('stormcall'), cd('thunder_strike', 0), ...(skill === 'stormcall' ? [] : [lowMp])); // Stormcall 18 MP ister
      expect(treeOn(r, skill, both(prep, foesWith('slow'))), JSON.stringify(r)).toBeGreaterThan(treeOn(r, skill, prep));
    }
  });
  it('skillUse tetikleri (Hammer and Anvil, Returning Hammer, Second Thunder, Saga of Storms, Thunder Tempo, Rolling Drums, Storm Drum, Thunder Drum): artı', () => {
    expect(treeOn({ '1.n0': 1 }, 'hammer_spark')).toBeGreaterThan(0); // every 3: ortalama 1/3 pay (trigEventValue)
    expect(treeOn({ '1.v': 1 }, 'hammer_spark')).toBeGreaterThan(0);
    expect(treeOn({ '2.v': 1 }, 'thunder_strike')).toBeGreaterThan(0);
    expect(treeOn({ '3.v': 1 }, 'war_drum')).toBeGreaterThan(0);
    expect(treeOn({ '4.r2': 1 }, 'stormcall', undefined, { mode: 'turns' })).toBeGreaterThan(0);
    // cooldown eylemi o anki cooldown'a bakmaz (trigEventValue: tur değeri x cooldownShare); Thunder Drum'un -2'si Storm Drum'un -1'inden büyük
    expect(treeOn({ '4.r3': 1 }, 'stormcall', cd('war_drum'))).toBeGreaterThan(0);
    const drum = treeOn({ '3.eb': 1 }, 'war_drum', cd('stormcall'));
    expect(drum).toBeGreaterThan(0);
    expect(treeOn({ '3.eb': 1, '3.fb': 1 }, 'war_drum', cd('stormcall'))).toBeGreaterThan(drum);
  });
  it('War Drum hedef sayısı (Marching Beat, Full Chorus, Call and Answer): dostlar alandayken artı, yalnızken 0', () => {
    const two: Opt = { allies: { 1: 'warrior', 7: 'mage' } };
    expect(treeOn({ '3.f2': 3 }, 'war_drum')).toBe(0);
    expect(treeOn({ '3.f2': 3 }, 'war_drum', undefined, two)).toBeGreaterThan(0);
    expect(treeOn({ '3.ma': 1 }, 'war_drum', cd('thunder_strike'), { allies: { 1: 'warrior' } })).toBe(0);
    expect(treeOn({ '3.ma': 1 }, 'war_drum', cd('thunder_strike'), two)).toBeGreaterThan(0);
    expect(treeOn({ '3.n0': 1 }, 'war_drum', undefined, { ...two, mode: 'turns' })).toBeGreaterThan(0);
  });
  it('Rolling Hammer: Through the Line sıçraması 2 düşmana değince artı, arkada düşman yokken 0', () => {
    expect(treeOn({ '1.ea': 1, '1.ma': 1 }, 'hammer_spark', undefined, { mode: 'turns' })).toBeGreaterThan(0);
    expect(treeOn({ '1.ea': 1, '1.ma': 1 }, 'hammer_spark', undefined, { mode: 'turns', enemies: { 1: 'warrior' } })).toBe(0);
  });
  it('Last Saga (bar 25): düşman Skald’ın dostunu öldürmek bedel (retaliation eksi)', () => {
    const at = T.mastery.bar.find((x) => x.name === 'Last Saga')!.at;
    const r = { '1.f1': 3, '1.f2': 5, '1.f3': 5, '2.f1': 3, '2.f2': 5, '2.f3': at - 21 };
    const teams: Teams = { party: cells({ 7: 'mage' }), enemies: cells({ 1: 'warrior', 4: 'skald' }), units: { party: {}, enemies: { 4: { tree: st(r) } } } };
    const b = new Battle(content.battleSetup('random-battle', 11, 'test', teams, false));
    b.debug.crit = 'never';
    b.debugClearCooldowns();
    for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
    const m = b.combatants.find((c) => c.side === 'party')!;
    const w = b.combatants.find((c) => c.side === 'enemy' && c.defId === 'warrior')!;
    w.hp = 1;
    expect(cand(b, m.uid, 'fire_bolt').some((x) => (x.terms?.retaliation ?? 0) < 0)).toBe(true);
    w.hp = w.maxHp;
    expect(cand(b, m.uid, 'fire_bolt').every((x) => (x.terms?.retaliation ?? 0) === 0)).toBe(true);
  });
  it('koşullu eklenen durumlar treeStatus artı (Iron Drag, Thunderclap Slow’luda, Thunder Anvil Shocked’ta); koşulsuz 0', () => {
    const ts = (r: Record<string, number>, skill: string, prep?: (b: Battle) => void) => {
      const b = fight(r);
      prep?.(b);
      return term(b, skill, 'treeStatus');
    };
    expect(ts({}, 'hammer_spark')).toBe(0);
    expect(ts({ '1.f3': 5 }, 'hammer_spark')).toBeGreaterThan(0);
    expect(ts({ '0.eb': 1 }, 'hammer_spark')).toBe(0);
    expect(ts({ '0.eb': 1 }, 'hammer_spark', foesWith('slow'))).toBeGreaterThan(0);
    expect(ts({ '1.mb': 1 }, 'hammer_spark')).toBe(0);
    expect(ts({ '1.mb': 1 }, 'hammer_spark', foesWith('shocked'))).toBeGreaterThan(0);
  });
  it('War Drum buff ekleri (Taut Skin hız, War Song hasar, Battle Rhythm koruma) control terimini büyütür', () => {
    const ctl = (r: Record<string, number>) => term(fight(r, undefined, { 1: 'warrior' }), 'war_drum', 'control');
    const base = ctl({});
    expect(base).toBeGreaterThan(0);
    for (const r of [{ '3.f1': 3 }, { '3.r': 3 }, { '3.f3': 5 }] as Record<string, number>[]) expect(ctl(r), JSON.stringify(r)).toBeGreaterThan(base);
  });
  it('bedel: Chorus Stormcall’da kurtarılan War Drum MP’si (armedCost), silahlıyken yok', () => {
    const b = fight({ '4.l2': 1 });
    expect(term(b, 'stormcall', 'armedCost')).toBeGreaterThan(0);
    (K(b).treeArmed ??= []).push('skald:4.l2');
    expect(term(b, 'stormcall', 'armedCost')).toBe(0);
  });
});

describe('8. küçük kalemler', () => {
  it('Soul Drain: Undead vuruşu selfHeal (yaralıyken)', () => {
    const b = arena([['undead', 0]], [['warrior', 0]]);
    P(b).hp = Math.round(P(b).maxHp * 0.5);
    expect(cand(b, P(b).uid, 'bone_throw')[0]!.terms?.selfHeal ?? 0).toBeGreaterThan(0);
    const full = arena([['undead', 0]], [['warrior', 0]]);
    expect(cand(full, P(full).uid, 'bone_throw')[0]!.terms?.selfHeal).toBeUndefined();
  });

  it('Mana Steal (gainRatio): MP doluyken manaGain yok; MP kazancının değeri MP skill\'i olan birimde artı (manaDenial\'ın tersi)', () => {
    const b = arena([['antimage', 0]], [['mage', 0]]);
    const am = P(b);
    expect(cand(b, am.uid, 'mana_burn')[0]!.terms?.manaGain).toBeUndefined();
    const m = arena([['mage', 0]], [['warrior', 0]]);
    const mage = P(m);
    mage.mp = 0;
    const ctx = ctxOf(m, mage);
    expect(ctx.manaGain(mage, 20)).toBeCloseTo(ctx.manaDenial(Object.assign(mage, { mp: 20 }), 20));
    mage.mp = 0;
    expect(ctx.manaGain(mage, 20)).toBeGreaterThan(0);
    mage.mp = mage.maxMp;
    expect(ctx.manaGain(mage, 20)).toBe(0);
  });

  it('Spell Echo: Gambler hasar skill\'inin cooldown bedeli şansla azalır', () => {
    const b = arena([['gambler', 0]], [['warrior', 0]], 'turns');
    const g = P(b);
    const pick = () => cand(b, g.uid, 'all_in').concat(cand(b, g.uid, 'high_stakes')).find((c) => c.terms?.cooldown !== undefined);
    const withEcho = pick()!;
    expect(withEcho).toBeDefined();
    const pe = g.passive!;
    g.passive = undefined;
    const without = pick()!;
    g.passive = pe;
    expect(Math.abs(withEcho.terms!.cooldown!)).toBeLessThan(Math.abs(without.terms!.cooldown!) + 1e-9);
  });

  it('Opportunist kurulumu: Cutthroat dostken Charge Stun\'u setup artı; Cutthroat yoksa yok', () => {
    const b = arena([['warrior', 0], ['cutthroat', 1]], [['warrior', 0]]);
    expect(cand(b, P(b).uid, 'charge')[0]!.terms?.setup ?? 0).toBeGreaterThan(0);
    const a = arena([['warrior', 0], ['archer', 1]], [['warrior', 0]]);
    expect(cand(a, P(a).uid, 'charge')[0]!.terms?.setup).toBeUndefined();
  });

  it('Nature\'s Grudge: Druid takımından birini öldürmek grudge eksi', () => {
    const b = arena([['warrior', 0]], [['archer', 0], ['druid', 1]]);
    const foe = E(b, 0);
    foe.hp = 5;
    expect(cand(b, P(b).uid, 'melee_attack').find((c) => c.target?.includes('Archer'))!.terms?.grudge ?? 0).toBeLessThan(0);
    const n = arena([['warrior', 0]], [['archer', 0], ['warrior', 1]]);
    E(n, 0).hp = 5;
    expect(cand(n, P(n).uid, 'melee_attack').find((c) => c.target?.includes('Archer'))!.terms?.grudge).toBeUndefined();
  });

  it('Ill Omen: Omen\'li düşmanı öldürmek yığının geçişini değerler', () => {
    const b = arena([['hexer', 0]], [['archer', 0], ['archer', 1]]);
    const hx = P(b);
    const foe = E(b, 0);
    foe.statuses.push({ kind: 'omen', turns: 3, source: hx.uid, stacks: 2 } as Combatant['statuses'][number]);
    foe.hp = 5;
    const c = cand(b, hx.uid, 'evil_eye').find((x) => x.target?.includes('Archer') && (x.terms?.kill ?? 0) > 0);
    expect(c?.terms?.omenTransfer ?? 0).toBeGreaterThan(0);
  });

  it('Resurrection yenilenmesi dirilenin değerine girer', () => {
    // savaş açık (madde 258: belli savaşta diriltme değeri 0): 3'e 3
    const b = new Battle(content.battleSetup('random-battle', 1, 'test', { party: cells({ 0: 'warrior', 1: 'paladin', 2: 'archer', 4: 'mage' }), enemies: cells({ 0: 'warrior', 1: 'paladin', 2: 'archer', 4: 'mage' }) }, false));
    b.debugClearCooldowns();
    for (const c of b.combatants) Object.assign(c.stats, { critChance: 0 });
    b.debugKill('party-0', false);
    b.debugKill('enemy-0', false);
    const pal = b.get('party-1')!;
    const r = cand(b, pal.uid, 'resurrection')[0];
    expect(r?.terms?.revive ?? 0).toBeGreaterThan(0);
    const eff = content.skills.resurrection!.effects.find((e) => e.type === 'revive') as { regen?: unknown };
    const regen = eff.regen;
    delete eff.regen;
    try {
      const r0 = cand(b, pal.uid, 'resurrection')[0];
      expect(r?.terms?.revive ?? 0).toBeGreaterThan(r0?.terms?.revive ?? 0);
    } finally {
      eff.regen = regen;
    }
  });
});

describe('9. skill ağacı tetikleri (veri güdümlü)', () => {
  const RIME = ['0.f1*3', '0.f2*5', '0.f3*5', '0.n0', '0.r*3', '0.eb'];
  it('Rime Skin (hitTaken): Mage\'e yakın dövüş vuruşu retaliation eksi; ağaçsız Mage\'de yok', () => {
    const b = withTrees({ 1: 'warrior' }, { 1: 'mage' }, { enemies: { 1: { tree: tree('mage', RIME) } } });
    expect(cand(b, P(b).uid, 'melee_attack')[0]!.terms?.retaliation ?? 0).toBeLessThan(0);
    const n = withTrees({ 1: 'warrior' }, { 1: 'mage' }, {});
    expect(cand(n, P(n).uid, 'melee_attack')[0]!.terms?.retaliation).toBeUndefined();
  });

  it('Crashing Halt (3.fa, crash -> Stun): çarpma yönü tree artı ve önizlemede Stun satırı', () => {
    const t = tree('mage', ['3.f1*3', '3.f2*5', '3.f3*5', '3.n0', '3.r', '3.ea', '3.fa']);
    const b = withTrees({ 7: 'mage' }, { 4: 'warrior', 1: 'warrior' }, { party: { 7: { tree: t } } });
    const foe = b.combatants.find((c) => c.side === 'enemy' && c.slot === 4)!;
    const crash = cand(b, P(b).uid, 'ice_crater').filter((c) => c.dir === 'forward');
    expect(crash.some((c) => (c.terms?.tree ?? 0) > 0)).toBe(true);
    const pv = previewSkill(b, P(b).uid, 'ice_crater', foe.uid, undefined, undefined, undefined, 'forward');
    expect(JSON.stringify(pv)).toContain('Crash: Stun');
  });
});

describe('7b. Vesper ağacı: her tetik / etki terazide', () => {
  // Ağaç v3 (2026-11-08): her tetik düğümü YZ değerine girer (memory: ai-side-for-new-content). cond cooldownDelta / cooldownSet (4.u3) ve
  // statusPotency (1.r, 2.f3) da değerlenir: aşağıdaki "10. YZ düzeltmeleri" bloğu.
  const T = treeOf('vesper')!;
  const vt = (r: Record<string, number>) => compileTree(T, { v: T.version, r })!;
  const fight = (r: Record<string, number>, enemies: Record<number, string> = { 1: 'warrior', 4: 'warrior' }) => {
    const b = withTrees({ 7: 'vesper' }, enemies, { party: { 7: { tree: vt(r) } } });
    b.debugClearCooldowns();
    return b;
  };
  const V = (b: Battle) => b.combatants.find((c) => c.side === 'party' && c.defId === 'vesper')!;
  const term = (b: Battle, uid: string, skill: string, k: string) => cand(b, uid, skill)[0]?.terms?.[k];
  const treeOn = (r: Record<string, number>, skill: string, prep?: (b: Battle) => void, enemies?: Record<number, string>) => {
    const b = fight(r, enemies);
    prep?.(b);
    return term(b, V(b).uid, skill, 'tree') ?? 0;
  };
  const lowMp = (b: Battle) => (V(b).mp = Math.max(30, Math.round(V(b).maxMp / 2)));
  const blindAll = (b: Battle) => b.combatants.filter((c) => c.side === 'enemy').forEach((c) => b.debugAddStatus(c.uid, 'blinded', 2));

  it('bellRung tetikleri (Counted Strokes MP, Quickening Peal, Call to Prayer, Racing Peal, Cathedral Choir): çan çalan skill\'de tree artı, çalmayanda yok', () => {
    expect(treeOn({}, 'toll')).toBe(0);
    for (const r of [{ '0.f2': 5 }, { '0.ea': 1 }, { '0.ma': 1 }, { '0.ea': 1, '0.fa': 1 }, { '0.v': 1 }] as Record<string, number>[]) {
      expect(treeOn(r, 'toll', lowMp), JSON.stringify(r)).toBeGreaterThan(0);
      expect(treeOn(r, 'cracked_bell', lowMp), JSON.stringify(r)).toBe(0);
    }
  });
  it('skillUse tetikleri: Triple Peal, Forked Peal, Storm Tower, Evensong tree artı', () => {
    expect(treeOn({ '1.n0': 1 }, 'toll')).toBeGreaterThan(0);
    expect(treeOn({ '2.v': 1 }, 'thunderpeal')).toBeGreaterThan(0);
    expect(treeOn({ '4.l3': 1 }, 'great_bell_of_valdoria')).toBeGreaterThan(0);
    expect(treeOn({}, 'great_bell_of_valdoria')).toBe(0);
    // Forked Peal: ön sıra vurulunca arkada düşman var (artı); arka sıra vurulunca onun arkası boş (terim yok)
    const b = fight({ '2.ea': 1 });
    const treeBy = cand(b, V(b).uid, 'thunderpeal').map((x) => x.terms?.tree ?? 0);
    expect(treeBy.filter((t) => t > 0).length).toBe(1);
    expect(treeBy.filter((t) => t === 0).length).toBe(1);
  });
  it('Endless Toll: yalnız üçüncü art arda Toll\'da (seri koşulu) tree artı', () => {
    const b = fight({ '1.ma': 1 });
    const v = V(b);
    v.cooldowns = { great_bell_of_valdoria: 4 };
    expect(term(b, v.uid, 'toll', 'tree') ?? 0).toBe(0);
    for (let i = 0; i < 2; i++) expect(b.useSkill(v.uid, 'toll').ok).toBe(true);
    v.cooldowns = { great_bell_of_valdoria: 4 };
    expect(term(b, v.uid, 'toll', 'tree') ?? 0).toBeGreaterThan(0);
  });
  it('enemyMissed çanı (Blind\'lı düşman ıskalayınca 1 çan): Thunderpeal\'in Blind\'ı kurulum değeri alır; Blind\'lı düşmanın saldırısı bedel öder', () => {
    const MISS = { h: 'trigger', node: 'vesper:missBell', on: 'enemyMissed', when: { targetStatus: 'blinded' }, do: [{ bell: 1 }] };
    const withMiss = (on: boolean) => {
      const base = vt({}) as unknown as { hooks?: unknown[] } | null;
      const tree = { ...(base ?? {}), hooks: [...(base?.hooks ?? []), ...(on ? [MISS] : [])] } as never;
      const b = withTrees({ 7: 'vesper' }, { 1: 'archer' }, { party: { 7: { tree } } });
      for (const c of b.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.9;
      return b;
    };
    // Kurulum: aynı Thunderpeal, kanca varken tree terimi artı, yokken 0
    const on = withMiss(true);
    expect(term(on, V(on).uid, 'thunderpeal', 'tree') ?? 0).toBeGreaterThan(0);
    const off = withMiss(false);
    expect(term(off, V(off).uid, 'thunderpeal', 'tree') ?? 0).toBe(0);
    // Toll Blind vermez: kurulum yok
    expect(term(on, V(on).uid, 'toll', 'tree') ?? 0).toBe(0);
    // Karşılık: Blind'lı okçunun Vesper'e atışı bedel (retaliation eksi); Blind'sızken 0
    const r = withMiss(true);
    const archer = E(r);
    expect(cand(r, archer.uid, 'quick_shot')[0]?.terms?.retaliation ?? 0).toBe(0);
    r.debugAddStatus(archer.uid, 'blinded', 2);
    expect(cand(r, archer.uid, 'quick_shot')[0]?.terms?.retaliation ?? 0).toBeLessThan(0);
  });
  it('Storm Front: 3 düşmana isabette tree artı, tek düşmanda yok', () => {
    expect(treeOn({ '2.ma': 1 }, 'thunderpeal', undefined, { 0: 'warrior', 1: 'warrior', 2: 'warrior' })).toBeGreaterThan(0);
    expect(treeOn({ '2.ma': 1 }, 'thunderpeal', undefined, { 1: 'warrior' })).toBe(0);
  });
  it('kill tetikleri (Passing Bell, Death Knell, Final Toll): öldürme ihtimalinde tree artı, yoksa yok', () => {
    for (const [r, skill] of [[{ '1.mb': 1 }, 'toll'], [{ '1.v': 1 }, 'toll'], [{ '4.d3': 1 }, 'great_bell_of_valdoria']] as const) {
      expect(treeOn(r, skill), skill).toBe(0);
      expect(treeOn(r, skill, (b) => (E(b).hp = 1)), skill).toBeGreaterThan(0);
    }
  });
  it('Stun tetikleri (Ringing Skull, Aftershock, Resounding Crack, Death Bell): Cracked Bell Stun şansıyla tree artı', () => {
    expect(treeOn({}, 'cracked_bell')).toBe(0);
    for (const k of ['3.n0', '3.r', '3.ea', '3.ma']) {
      expect(treeOn({ [k]: 1 }, 'cracked_bell', (b) => { lowMp(b); V(b).cooldowns = {}; for (const c of b.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.8; }), k).toBeGreaterThan(0);
    }
  });
  it('Thunder After (bar 15, Ömer 2026-11-08: Blinded düşman ıskalayınca çan): veri düğümüyle Thunderpeal kurulum değeri artı', () => {
    const at = T.mastery.bar.find((x) => x.name === 'Thunder After')!.at;
    const mk = (r: Record<string, number>) => {
      const b = withTrees({ 7: 'vesper' }, { 1: 'archer' }, { party: { 7: { tree: vt(r) } } });
      for (const c of b.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.9;
      return b;
    };
    const on = mk({ '1.f1': at });
    expect(term(on, V(on).uid, 'thunderpeal', 'tree') ?? 0).toBeGreaterThan(0);
    const off = mk({});
    expect(term(off, V(off).uid, 'thunderpeal', 'tree') ?? 0).toBe(0);
  });
  it('Vigil (bar 10): düşman Vesper\'in dostunu öldürmek bedel (retaliation eksi)', () => {
    const at = T.mastery.bar.find((x) => x.name === 'Vigil')!.at;
    const b = withTrees({ 7: 'mage' }, { 1: 'warrior', 7: 'vesper' }, { enemies: { 7: { tree: vt({ '1.f1': at }) } } });
    const m = b.combatants.find((c) => c.side === 'party')!;
    const w = b.combatants.find((c) => c.side === 'enemy' && c.defId === 'warrior')!;
    w.hp = 1;
    expect(cand(b, m.uid, 'fire_bolt').some((x) => (x.terms?.retaliation ?? 0) < 0)).toBe(true);
    w.hp = w.maxHp;
    expect(cand(b, m.uid, 'fire_bolt').every((x) => (x.terms?.retaliation ?? 0) === 0)).toBe(true);
  });
  it('eklenen durumlar treeStatus artı (Ringing Ears, Unbroken Rope serisi, Thunderstruck, Shaking Peal, Crown of Lightning, Judgement Peal); düğümsüz yok', () => {
    // Skill'e eklenen durum (addEffect) skill'in kendi etkisi gibi 'mitigation' teriminde; koşullu eklenen (cond addStatus) 'treeStatus'ta
    const st = (r: Record<string, number>, skill: string, k: string, prep?: (b: Battle) => void) => {
      const b = fight(r);
      for (const c of b.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.8; // isabet cezası ancak %100'ün altında işe yarar
      prep?.(b);
      return term(b, V(b).uid, skill, k) ?? 0;
    };
    expect(st({}, 'toll', 'mitigation')).toBe(0);
    expect(st({}, 'toll', 'treeStatus')).toBe(0);
    expect(st({ '1.f2': 5 }, 'toll', 'mitigation')).toBeGreaterThan(0);
    expect(st({ '4.d1': 1 }, 'great_bell_of_valdoria', 'mitigation')).toBeGreaterThan(0);
    expect(st({ '4.r1': 1 }, 'great_bell_of_valdoria', 'mitigation')).toBeGreaterThan(0);
    expect(st({ '1.ea': 1 }, 'toll', 'treeStatus')).toBe(0);
    expect(st({ '1.ea': 1 }, 'toll', 'treeStatus', (b) => { for (let i = 0; i < 2; i++) b.useSkill(V(b).uid, 'toll'); })).toBeGreaterThan(0);
    expect(st({ '2.eb': 1 }, 'thunderpeal', 'treeStatus', blindAll)).toBeGreaterThan(0);
    expect(st({ '4.r3': 1 }, 'great_bell_of_valdoria', 'treeStatus', blindAll)).toBeGreaterThan(0);
  });
  it('çan değeri: Struck Bronze Cracked Bell\'e, Cracked Throat iki çan, Echoing Hall ult\'e', () => {
    const one = fight({});
    expect(term(one, V(one).uid, 'cracked_bell', 'bell')).toBeUndefined();
    const sb = fight({ '0.eb': 1 });
    const ct = fight({ '0.eb': 1, '0.fb': 1 });
    expect(term(sb, V(sb).uid, 'cracked_bell', 'bell') ?? 0).toBeGreaterThan(0);
    expect(term(ct, V(ct).uid, 'cracked_bell', 'bell')!).toBeCloseTo(term(sb, V(sb).uid, 'cracked_bell', 'bell')! * 2, 1);
    const hall = fight({ '4.u1': 1 });
    expect(term(hall, V(hall).uid, 'great_bell_of_valdoria', 'bell') ?? 0).toBeGreaterThan(0);
  });
  it('bedel: Angelus 8 çanda ucuz; Bell of Kings Great Bell\'de kurtarılan MP (silahlıyken yok)', () => {
    const cost = (bells: number) => {
      const b = fight({ '0.mb': 1 });
      V(b).bells = bells;
      return -(term(b, V(b).uid, 'toll', 'cost') ?? 0);
    };
    expect(cost(8)).toBeLessThan(cost(7));
    const b = fight({ '4.l2': 1 });
    const v = V(b);
    v.mp = v.maxMp - 5;
    expect(term(b, v.uid, 'great_bell_of_valdoria', 'armedCost') ?? 0).toBeGreaterThan(0);
    (v.treeArmed ??= []).push('vesper:4.l2');
    expect(term(b, v.uid, 'great_bell_of_valdoria', 'armedCost') ?? 0).toBe(0);
  });
  it('koşullu güçler önizlemeden YZ hasarına geçer (Knell, Dread Peal, Afterglare, Toll for One, Verdict, Last Peal, Glaring Peal, Prime); Full Peal önizleme kritiğinde', () => {
    const dmg = (r: Record<string, number>, skill: string, set?: (b: Battle) => void) => {
      const b = fight(r);
      for (const c of b.combatants) c.hp = c.maxHp = 50000;
      V(b).stats.int = 2000;
      set?.(b);
      return cand(b, V(b).uid, skill)[0]!.terms!.damage!;
    };
    const half = (b: Battle) => { E(b, 0).hp = 20000; E(b, 1).hp = 20000; };
    const elite = (b: Battle) => { E(b, 0).tier = 'elite'; E(b, 1).tier = 'elite'; V(b).bells = 10; };
    const shake = (b: Battle) => b.combatants.filter((c) => c.side === 'enemy').forEach((c) => b.debugAddStatus(c.uid, 'shaken', 2));
    expect(dmg({ '1.eb': 1 }, 'toll')).toBeGreaterThan(dmg({}, 'toll'));
    expect(dmg({ '1.f3': 5 }, 'toll', shake)).toBeGreaterThan(dmg({}, 'toll', shake));
    expect(dmg({ '0.r': 3 }, 'toll')).toBeGreaterThan(dmg({}, 'toll'));
    expect(dmg({ '2.f1': 5 }, 'thunderpeal', blindAll)).toBeGreaterThan(dmg({}, 'thunderpeal', blindAll));
    expect(dmg({ '3.eb': 1 }, 'cracked_bell', elite)).toBeGreaterThan(dmg({}, 'cracked_bell', elite));
    expect(dmg({ '3.mb': 1 }, 'cracked_bell', elite)).toBeGreaterThan(dmg({}, 'cracked_bell', elite));
    expect(dmg({ '4.d2': 1 }, 'great_bell_of_valdoria', half)).toBeGreaterThan(dmg({}, 'great_bell_of_valdoria', half));
    expect(dmg({ '4.r2': 1 }, 'great_bell_of_valdoria', blindAll)).toBeGreaterThan(dmg({}, 'great_bell_of_valdoria', blindAll));
    const crit = (r: Record<string, number>) => {
      const b = fight(r);
      V(b).bells = 5;
      return previewSkill(b, V(b).uid, 'toll')[0]!.damage!.critChance;
    };
    expect(crit({ '0.f3': 5 })).toBeGreaterThan(crit({}));
  });
});

describe('10. YZ düzeltmeleri (2026-11-08): cast işareti, ağaç durumlarının isabet cezası, statusPotency, cooldownDelta', () => {
  const tv = (cls: string, r: Record<string, number>) => compileTree(treeOf(cls)!, { v: treeOf(cls)!.version, r })!;
  const fightOf = (cls: string, r: Record<string, number>, mode: 'test' | 'turns' = 'test', enemies: Record<number, string> = { 1: 'warrior', 4: 'warrior' }) => {
    const teams: Teams = { party: cells({ 7: cls }), enemies: cells(enemies), units: { party: { 7: { tree: tv(cls, r) } }, enemies: {} } };
    const b = new Battle(content.battleSetup('random-battle', 11, mode, teams, false));
    b.debug.crit = 'never';
    b.debugClearCooldowns();
    for (const c of b.combatants) {
      Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
      c.mp = c.maxMp;
    }
    return b;
  };
  const hero = (b: Battle) => b.combatants.find((c) => c.side === 'party')!;
  const term = (b: Battle, skill: string, k: string) => cand(b, hero(b).uid, skill)[0]?.terms?.[k];
  const trees = (b: Battle, skill: string) => cand(b, hero(b).uid, skill).map((c) => c.terms?.tree ?? 0);

  it('cast eylemi (Mage 1.mb Rolling Doom, to: lowestHpEnemy): öldüren Fire Bolt da tree ARTI (eskiden alıcı işareti iki kez: eksi)', () => {
    const b = fightOf('mage', { '1.mb': 1 });
    const foe = E(b, 0);
    foe.hp = 1;
    const t = trees(b, 'fire_bolt');
    expect(Math.max(...t)).toBeGreaterThan(0); // öldürme ihtimali olan hedefte
    expect(Math.min(...t)).toBeGreaterThanOrEqual(0); // hiçbir adayda eksi yok
    const n = fightOf('mage', {});
    E(n, 0).hp = 1;
    expect(trees(n, 'fire_bolt').every((x) => x === 0)).toBe(true);
  });

  it('statusEffectWorth isabet cezası: Shaken / Blinded taşıyana eksi (ağaç tetiklerinin verdiği durum da), potency büyütür, noHitLoss sıfırlar', () => {
    const b = fightOf('vesper', {});
    for (const c of b.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.8; // isabet cezası ancak %100'ün altında işe yarar
    const ctx = ctxOf(b, hero(b));
    const foe = E(b, 0);
    const shaken = AC.statusEffectWorth(ctx, foe, 'shaken', 1);
    const blinded = AC.statusEffectWorth(ctx, foe, 'blinded', 1);
    expect(shaken).toBeLessThan(0);
    expect(blinded).toBeLessThan(shaken); // -%30 > -%10
    expect(AC.statusEffectWorth(ctx, foe, 'shaken', 1, { pot: { accuracyDelta: -0.1 } })).toBeLessThan(shaken);
    expect(AC.statusEffectWorth(ctx, foe, 'shaken', 1, { noHitLoss: true })).toBe(0);
    expect(AC.statusEffectWorth(ctx, foe, 'shaken', 2)).toBeCloseTo(shaken * 2, 5);
  });

  it('statusPotency: Lingering Ears (1.r) Toll Shaken, Searing Flash (2.f3) Thunderpeal Blind mitigation değerini büyütür', () => {
    const mit = (r: Record<string, number>, skill: string) => {
      const b = fightOf('vesper', r);
      for (const c of b.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.8;
      return term(b, skill, 'mitigation') ?? 0;
    };
    const base = mit({ '1.f2': 5 }, 'toll');
    expect(base).toBeGreaterThan(0);
    expect(mit({ '1.f2': 5, '1.r': 5 }, 'toll')).toBeGreaterThan(base);
    const flash = mit({}, 'thunderpeal');
    expect(flash).toBeGreaterThan(0);
    expect(mit({ '2.f3': 5 }, 'thunderpeal')).toBeGreaterThan(flash);
  });

  it('cooldownDelta: Peal of Ages (4.u3) 10+ çanda Great Bell cooldown bedelini küçültür (yalnız turns modunda, koşul tutunca)', () => {
    const cost = (r: Record<string, number>, bells: number) => {
      const b = fightOf('vesper', r, 'turns');
      hero(b).bells = bells;
      b.currentUid = hero(b).uid; // turns modunda açıklama yalnız sırası gelen birimde
      return term(b, 'great_bell_of_valdoria', 'cooldown') ?? 0;
    };
    const plain = cost({}, 10);
    expect(plain).toBeLessThan(0);
    expect(cost({ '4.u3': 1 }, 10)).toBeGreaterThan(plain); // eksi bedel küçüldü
    expect(cost({ '4.u3': 1 }, 9)).toBeCloseTo(cost({}, 9), 5); // koşul tutmaz
    const b = fightOf('vesper', { '4.u3': 1 }, 'turns');
    const v = hero(b);
    v.bells = 10;
    const gb = b.skill('great_bell_of_valdoria', v)!;
    expect(b.aiCastCooldown(v, gb, gb.cooldown ?? 0)).toBe((gb.cooldown ?? 0) - 1);
  });
});

describe('YZ: Healing Rain (Ömer 2026-11-01)', () => {
  const setup = () => {
    const b = arena([['druid', 0], ['warrior', 1], ['warrior', 2]], [['warrior', 0]], 'turns');
    b.debug.dodge = 'never';
    for (const c of b.combatants) { c.stats.hpRegen = 0; c.maxHp = 2000; c.hp = 2000; c.statuses = []; }
    for (let i = 0; i < 40 && b.currentUid !== P(b).uid; i++) b.skipTurn();
    P(b).mp = P(b).maxMp;
    P(b).cooldowns = {};
    return b;
  };
  const rainAt = (b: Battle, slot: number) => cand(b, P(b).uid, 'rejuvenate').find((c) => c.center === slot && c.board === 'own');
  const foeBoard = (b: Battle) => cand(b, P(b).uid, 'rejuvenate').filter((c) => c.board === 'foe');

  it('yaralı dosta değer verir ve atar; düşman tahtası aday değil', () => {
    const b = setup();
    const hurt = P(b, 1);
    hurt.hp = 300;
    expect(foeBoard(b)).toEqual([]);
    expect(rainAt(b, hurt.slot)!.score!).toBeGreaterThan(0);
    expect(chooseAction(b, P(b).uid, ai)).toMatchObject({ skillId: 'rejuvenate' });
    const pick = chooseAction(b, P(b).uid, ai)!;
    expect(pick.targetUid ?? pick.slot).toBe(pick.targetUid ? hurt.uid : hurt.slot);
  });

  it('boş hücre: yaralı dost varken ondan düşük; herkes tam canken atılmaz', () => {
    const b = setup();
    P(b, 1).hp = 300;
    const empty = rainAt(b, 5);
    if (empty) expect(empty.score!).toBeLessThan(rainAt(b, 1)!.score!);
    const full = setup();
    expect(chooseAction(full, P(full).uid, ai)?.skillId).not.toBe('rejuvenate');
  });

  it('kendi Burning Ground\'unun üstüne yağmur: söndürme kazancı (zemin terimi artar)', () => {
    const groundTerm = (burn: boolean) => {
      const b = setup();
      const a = P(b, 1);
      a.hp = 1000;
      if (burn) { b.debugPlaceGround(E(b).uid, 'burning', 'party', [1], 3); a.hp = 1000; }
      return rainAt(b, 1)!.terms?.ground ?? 0;
    };
    expect(groundTerm(true)).toBeGreaterThan(groundTerm(false));
  });

  it('düşman zehrinin üstüne yağmur: su ağındaki dosta zehir akar, tepkime eksi', () => {
    const b = setup();
    b.debugPlaceGround(P(b).uid, 'healing_rain', 'party', [1], 3); // dost 1 yağmurda
    b.debugPlaceGround(E(b).uid, 'poison', 'party', [2], 3); // zehir bitişik hücrede, dost 2 üstünde
    expect(b.get(P(b, 1).uid)!.statuses.some((s) => s.kind === 'poisoned')).toBe(false);
    P(b, 2).hp = 1000;
    expect(rainAt(b, 2)!.terms?.reaction ?? 0).toBeLessThan(0);
    // Aynı dost, zehirsiz hücre: tepkime yok
    const clean = setup();
    clean.debugPlaceGround(P(clean).uid, 'healing_rain', 'party', [1], 3);
    P(clean, 2).hp = 1000;
    expect(rainAt(clean, 2)!.terms?.reaction ?? 0).toBe(0);
  });

  it('Chill Ground üstüne yağmur: buza döner, tik sayılmaz', () => {
    const heal = (chill: boolean) => {
      const b = setup();
      P(b, 1).hp = 300;
      if (chill) b.debugPlaceGround(E(b).uid, 'storm', 'party', [1], 3);
      P(b, 1).hp = 300;
      return rainAt(b, 1)!.terms?.heal ?? 0;
    };
    expect(heal(true)).toBeLessThan(heal(false));
  });

  it('Thin Sap (tüm dostlar) adayı atanır ve zemini sayılır; ham şifa değeri zemini de katar', () => {
    const raw = JSON.parse(JSON.stringify(treeOf('druid')!)) as TreeData;
    for (const k of Object.keys(raw.nodes)) if (k !== '3.fa') raw.nodes[k]!.fx = null;
    raw.mastery.bar.forEach((x) => (x.fx = null));
    const t = compileTree(raw, { v: raw.version, r: { '3.fa': 1 } })!;
    const b = withTrees({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' }, { party: { 0: { tree: t } } });
    P(b, 1).hp = Math.round(P(b, 1).maxHp * 0.3);
    P(b).hp = Math.round(P(b).maxHp * 0.3);
    P(b).mp = P(b).maxMp;
    const c = cand(b, P(b).uid, 'rejuvenate');
    expect(c.length).toBe(1);
    expect(c[0]!.terms?.heal ?? 0).toBeGreaterThan(0);
  });
});

describe('YZ: Soaked Burning söndürür (Ömer 2026-11-01)', () => {
  it('düşmanın üstündeki Burning\'i söndürmek bedel: cleansedDotLoss, tik x kalan tur', () => {
    const b = arena([['druid', 0]], [['warrior', 0]]);
    const foe = E(b);
    const ctx = ctxOf(b, P(b));
    const soaked = b.statusDef('soaked')!;
    expect(AC.cleansedDotLoss(ctx, foe, soaked)).toBe(0);
    foe.statuses.push({ kind: 'burning', turns: 2, source: P(b).uid, amount: 30 } as Combatant['statuses'][number]);
    expect(AC.cleansedDotLoss(ctx, foe, soaked)).toBeGreaterThan(0);
    const slow = b.statusDef('slow')!;
    expect(AC.cleansedDotLoss(ctx, foe, slow)).toBe(0);
  });
});
