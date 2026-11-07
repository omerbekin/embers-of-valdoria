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
  const T = treeOf('vesper')!;
  const vt = (r: Record<string, number>) => compileTree(T, { v: T.version, r })!;
  const fight = (r: Record<string, number>, enemies: Record<number, string> = { 1: 'warrior', 4: 'warrior' }) => withTrees({ 7: 'vesper' }, enemies, { party: { 7: { tree: vt(r) } } });
  const V = (b: Battle) => b.combatants.find((c) => c.side === 'party' && c.defId === 'vesper')!;
  const term = (b: Battle, uid: string, skill: string, k: string) => cand(b, uid, skill)[0]?.terms?.[k];

  it('Long Echo: ilk çan ek çan değerinde, hak bitince değil; çan çalmayan skill\'de yok', () => {
    const b = fight({ '0.f3': 1 });
    const v = V(b);
    b.debugClearCooldowns();
    expect(term(b, v.uid, 'toll', 'tree') ?? 0).toBeGreaterThan(0);
    expect(term(b, v.uid, 'cracked_bell', 'tree') ?? 0).toBe(0);
    (v.treeOnce ??= []).push('vesper:0.f3');
    expect(term(b, v.uid, 'toll', 'tree') ?? 0).toBe(0);
  });
  it('Quickening Peal: çan skill\'i erken tur payı alır', () => {
    const b = fight({ '0.ea': 1 });
    expect(term(b, V(b).uid, 'toll', 'tree') ?? 0).toBeGreaterThan(0);
  });
  it('Passing Bell: öldürme ihtimalinde tree artı, yoksa yok', () => {
    const b = fight({ '1.ma': 1 });
    expect(term(b, V(b).uid, 'toll', 'tree') ?? 0).toBe(0);
    E(b).hp = 1;
    expect(term(b, V(b).uid, 'toll', 'tree') ?? 0).toBeGreaterThan(0);
  });
  it('Compline: düşman Vesper\'in dostunu öldürmek bedel (retaliation eksi)', () => {
    const b = withTrees({ 7: 'mage' }, { 1: 'warrior', 7: 'vesper' }, { enemies: { 7: { tree: vt({ '0.mb': 1 }) } } });
    const m = b.combatants.find((c) => c.side === 'party')!;
    const w = b.combatants.find((c) => c.side === 'enemy' && c.defId === 'warrior')!;
    w.hp = 1;
    expect(cand(b, m.uid, 'fire_bolt').some((x) => (x.terms?.retaliation ?? 0) < 0)).toBe(true);
    w.hp = w.maxHp; // öldürme yoksa bedel yok
    expect(cand(b, m.uid, 'fire_bolt').every((x) => (x.terms?.retaliation ?? 0) === 0)).toBe(true);
  });
  it('Ringing Skull: Cracked Bell Stun şansıyla tree artı', () => {
    const b = fight({ '3.n0': 1 });
    b.debugClearCooldowns();
    expect(term(b, V(b).uid, 'cracked_bell', 'tree') ?? 0).toBeGreaterThan(0);
  });
  it('Storm Tower iki çan değerinde; Echoing Hall ult\'e çan değeri verir; Deep Peal Thunderpeal\'in çan değerini kapatır', () => {
    const one = fight({});
    const two = fight({ '2.v': 1 });
    expect(term(two, V(two).uid, 'thunderpeal', 'bell')!).toBeCloseTo(term(one, V(one).uid, 'thunderpeal', 'bell')! * 2, 1);
    const hall = fight({ '4.l1': 1 });
    hall.debugClearCooldowns();
    expect(term(hall, V(hall).uid, 'great_bell_of_valdoria', 'bell') ?? 0).toBeGreaterThan(0);
    const deep = fight({ '0.eb': 1 });
    expect(term(deep, V(deep).uid, 'thunderpeal', 'bell')).toBeUndefined();
    expect(term(deep, V(deep).uid, 'toll', 'bell') ?? 0).toBeGreaterThan(0);
  });
  it('Wide Toll ve Shaken Ranks: eklenen durum treeStatus artı; düğümsüz yok', () => {
    const no = fight({});
    expect(term(no, V(no).uid, 'toll', 'treeStatus')).toBeUndefined();
    const wide = fight({ '1.eb': 1 });
    expect(term(wide, V(wide).uid, 'toll', 'treeStatus') ?? 0).toBeGreaterThan(0);
    const shaken = fight({ '1.mb': 1 });
    for (const c of shaken.combatants) if (c.side === 'enemy') c.stats.accuracy = 0.8; // isabet cezası ancak %100'ün altında işe yarar
    expect(term(shaken, V(shaken).uid, 'toll', 'treeStatus') ?? 0).toBeGreaterThan(0);
  });
  it('Forked Peal: arkada düşman varken tree artı, yokken yok', () => {
    const b = fight({ '2.ea': 1 });
    // Ön sıra vurulunca arkada düşman var (artı); arka sıra vurulunca onun arkası boş (terim yok)
    const treeBy = cand(b, V(b).uid, 'thunderpeal').map((x) => x.terms?.tree ?? 0);
    expect(treeBy.filter((t) => t > 0).length).toBe(1);
    expect(treeBy.filter((t) => t === 0).length).toBe(1);
    const alone = fight({ '2.ea': 1 }, { 1: 'warrior' });
    expect(term(alone, V(alone).uid, 'thunderpeal', 'tree') ?? 0).toBe(0);
  });
  it('Bell of Kings: Great Bell\'de kurtarılan MP değeri (MP eksikken), silahlıyken yok', () => {
    const b = fight({ '4.l3': 1 });
    const v = V(b);
    b.debugClearCooldowns();
    v.mp = v.maxMp - 5; // MP eksik ama Great Bell'e yeter (0.9.11 mana: havuzun yarısı bedele yetmiyordu)
    expect(term(b, v.uid, 'great_bell_of_valdoria', 'armedCost') ?? 0).toBeGreaterThan(0);
    (v.treeArmed ??= []).push('vesper:4.l3');
    expect(term(b, v.uid, 'great_bell_of_valdoria', 'armedCost') ?? 0).toBe(0);
  });
  it('koşullu güçler önizlemeden YZ hasarına geçer (Funeral Toll, Knell, Toll for One, Last Peal); Cathedral Choir önizleme kritiğinde; Angelus bedelde', () => {
    const dmg = (r: Record<string, number>, skill: string, set?: (b: Battle) => void) => {
      const b = fight(r);
      b.debugClearCooldowns();
      for (const c of b.combatants) c.hp = c.maxHp = 50000;
      V(b).stats.int = 2000;
      b.debug.crit = 'auto' as never;
      set?.(b);
      return cand(b, V(b).uid, skill)[0]!.terms!.damage!;
    };
    const half = (b: Battle) => { E(b, 0).hp = 20000; E(b, 1).hp = 20000; };
    expect(dmg({ '1.n0': 1 }, 'toll', half)).toBeGreaterThan(dmg({}, 'toll', half));
    expect(dmg({ '1.ea': 1 }, 'toll')).toBeGreaterThan(dmg({}, 'toll'));
    const elite = (b: Battle) => { E(b, 0).tier = 'elite'; E(b, 1).tier = 'elite'; };
    expect(dmg({ '3.ma': 1 }, 'cracked_bell', elite)).toBeGreaterThan(dmg({}, 'cracked_bell', elite));
    expect(dmg({ '4.d3': 1 }, 'great_bell_of_valdoria', half)).toBeGreaterThan(dmg({}, 'great_bell_of_valdoria', half));
    const crit = (r: Record<string, number>) => {
      const b = fight(r);
      V(b).bells = 40;
      return previewSkill(b, V(b).uid, 'toll')[0]!.damage!.critChance;
    };
    expect(crit({ '0.v': 1 })).toBeGreaterThan(crit({}));
    // YZ kritiği öldürme ihtimalinde okur: yalnız kritik öldürürken Cathedral Choir kill terimi doğurur
    const killBy = (r: Record<string, number>) => {
      const b = fight(r);
      V(b).bells = 40;
      V(b).stats.int = 2000;
      V(b).stats.critChance = 0;
      const p = previewSkill(b, V(b).uid, 'toll')[0]!;
      for (const c of b.combatants) if (c.side === 'enemy') c.hp = c.maxHp = Math.round(p.damage!.max + 1);
      return term(b, V(b).uid, 'toll', 'kill') ?? 0;
    };
    expect(killBy({ '0.v': 1 })).toBeGreaterThan(killBy({}));
    const cost = (bells: number) => {
      const b = fight({ '0.ma': 1 });
      V(b).bells = bells;
      return -(term(b, V(b).uid, 'toll', 'cost') ?? 0);
    };
    expect(cost(5)).toBeLessThan(cost(4));
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
