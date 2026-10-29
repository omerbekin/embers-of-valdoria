/**
 * YZ KAPSAMI (engine-dev 2026-10-29, open-questions 458; scratchpad ai-coverage.md B / C satırları): YZ'nin önceden değer vermediği mekanikler artık
 * terazide. Her mekanik için terim olması gerektiğinde sıfırdan farklı, olmaması gerektiğinde yok. Ağırlıklar data/ai.json > value.aiCov (PROVİZYON).
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, previewSkill } from '../src/engine';
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
