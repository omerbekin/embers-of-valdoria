import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { HealHook, TreeHook, TriggerHook } from '../src/engine/tree-hooks';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData, TreeFx } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 4a (docs/design/skill-tree-implementation.md "Faz 4a notları"): C3 tetik (olay -> eylem) ve C4 şifa / kalkan / alınan hasar kancaları.
// Her test YALNIZCA verilen düğümlerin fx'iyle derler; beklenen sayılar düğüm metninden birebir.

const CLASSES = ['antimage', 'archer', 'cutthroat', 'defender', 'druid', 'gambler', 'hexer', 'mage', 'paladin', 'undead', 'warrior'];
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(cls: string, ranks: Record<string, number>, bar?: number): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b, i) => {
    if (i !== bar) b.fx = null;
  });
  const r: Record<string, number> = { ...ranks };
  if (bar !== undefined) r['zz.fill'] = (bar + 1) * 5;
  return compileTree(t, { v: t.version, r });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
/** Düğüm / bar fx sayısı veriden ('bar3' = mastery.bar[3]; yol örn. '0.do.0.heal'); denge turunda değişebilir, test mekanizmayı ölçer. */
const num = (cls: string, key: string, path: string): number => {
  const t = treeOf(cls)!;
  const fx = key.startsWith('bar') ? t.mastery.bar[Number(key.slice(3))]!.fx : t.nodes[key]!.fx;
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], fx) as number;
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant): BattleEvent[] {
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const hooksOf = (tree: UnitSetup['tree'], node: string): TreeHook[] => (tree?.hooks ?? []).filter((h) => h.node === node);
const trigOf = (tree: UnitSetup['tree'], node: string): TriggerHook => hooksOf(tree, node).find((h) => h.h === 'trigger') as TriggerHook;
const healOf = (tree: UnitSetup['tree'], node: string): HealHook => hooksOf(tree, node).find((h) => h.h === 'heal') as HealHook;
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const healBy = (evs: BattleEvent[], node: string): number => evs.reduce((s, e) => s + (e.type === 'heal' && e.cause === node ? e.amount : 0), 0);
function seeds(what: string, fn: (seed: number) => boolean, n = 80): void {
  for (let s = 1; s <= n; s++) if (fn(s)) return;
  throw new Error(`${what}: hiçbir seed'de olmadı`);
}
/** Motorun iç noktalarına test erişimi (olay doğrudan kayda yazılır). */
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Combatant['statuses'][number], emit: (e: BattleEvent) => void, cause?: string): void;
  applyHeal(s: Combatant, t: Combatant, amount: number, crit: boolean, emit: (e: BattleEvent) => void, cause?: string): number;
  bigHitCut(t: Combatant, a: Combatant, amount: number): number;
  guardShareCut(g: Combatant, amount: number, a: Combatant): number;
  hpCrossTrig(t: Combatant, hp0: number, a: Combatant, emit: (e: BattleEvent) => void): void;
  trig(owners: Combatant[], ev: Record<string, unknown>, emit: (e: BattleEvent) => void): void;
  effectiveStats(c: Combatant): { armor: number };
}
const X = (b: Battle): Priv => b as unknown as Priv;
const emitOf = (b: Battle) => (e: BattleEvent) => X(b).record(e);
/** turns modu: `c`'nin turu gelene kadar pas geçer (dönen: aradaki olaylar). */
function untilTurn(b: Battle, c: Combatant, max = 30): BattleEvent[] {
  const from = b.log.length;
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
  return b.log.slice(from);
}

describe('Faz 4a: veri ve derleyici', () => {
  it('11 ağacın tüm fx\'leri temiz derlenir', () => {
    for (const c of CLASSES) expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
  });

  it('rank: eylem sayıları ve C4 çarpanı rank ile çarpılır; süre / eşik çarpılmaz', () => {
    expect(trigOf(only('warrior', { '0.r': 3 }), 'warrior:0.r').do[0]!.heal).toBeCloseTo(3 * num('warrior', '0.r', '0.do.0.heal'), 9);
    expect(trigOf(only('defender', { '2.f3': 4 }), 'defender:2.f3').do[0]!.shield).toBeCloseTo(4 * num('defender', '2.f3', '0.do.0.shield'), 9);
    expect(trigOf(only('mage', { '0.f3': 5 }), 'mage:0.f3').do[0]!.sooner).toBeCloseTo(0.2, 9);
    expect(healOf(only('warrior', { '0.f2': 3 }), 'warrior:0.f2').mul).toBeCloseTo(3 * num('warrior', '0.f2', '0.mul'), 9);
    expect(healOf(only('defender', { '3.f3': 5 }), 'defender:3.f3').mul).toBeCloseTo(-0.15, 9);
    const t = trigOf(only('warrior', { '0.n0': 1 }), 'warrior:0.n0');
    expect(t).toMatchObject({ on: 'hpBelow', below: 0.5, once: true, do: [{ status: 'stun', turns: 1, to: 'target' }] });
  });

  it('skill kapsamı: satırın skill\'i varsayılan (kill / skillUse / C4 dealt), pasif satırda ve barda kapsam yok', () => {
    expect(trigOf(only('warrior', { '4.u3': 1 }), 'warrior:4.u3').skill).toBe('headsmans_blow');
    expect(trigOf(only('defender', { '2.f3': 1 }), 'defender:2.f3').skill).toBe('taunt');
    expect(healOf(only('druid', { '3.f3': 1 }), 'druid:3.f3').skill).toBe('rejuvenate');
    expect(healOf(only('warrior', { '2.ma': 1 }), 'warrior:2.ma').skill).toBe('whirlwind');
    expect(trigOf(only('mage', {}, 1), 'mage:bar[1]').skill).toBeUndefined();
    expect(trigOf(only('mage', { '0.f3': 1 }), 'mage:0.f3').skill).toBeUndefined();
  });

  it('hatalı fx açık hata verir', () => {
    const bad = (cls: string, fx: unknown): string[] => {
      const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
      t.nodes['0.n0']!.fx = [fx as TreeFx];
      return checkTreeFx(t).map((e) => String(e));
    };
    const T = (o: object) => ({ k: 'hook', h: 'trigger', ...o });
    const H = (o: object) => ({ k: 'hook', h: 'heal', ...o });
    const cases: [string, unknown, RegExp][] = [
      ['warrior', T({ on: 'nope', do: [{ heal: 0.1 }] }), /unknown trigger event/],
      ['warrior', T({ on: 'hpBelow', do: [{ heal: 0.1 }] }), /below/],
      ['warrior', T({ on: 'turnStart', skill: 'whirlwind', do: [{ heal: 0.1 }] }), /skill/],
      ['warrior', T({ on: 'hit', once: 'perShield', do: [{ heal: 0.1 }] }), /perShield/],
      ['warrior', T({ on: 'kill', do: [] }), /non-empty/],
      ['warrior', T({ on: 'kill', do: [{ heal: 0.1, mp: 2 }] }), /exactly one/],
      ['warrior', T({ on: 'kill', do: [{ status: 'omen', turns: 2 }] }), /stacks/],
      ['warrior', T({ on: 'kill', do: [{ damage: 0.5 }] }), /stat/],
      ['mage', T({ on: 'kill', do: [{ rage: 5 }] }), /no Rage/],
      ['warrior', T({ on: 'kill', do: [{ cooldown: 'reset', cd: 'fire_bolt' }] }), /not a warrior skill/],
      ['warrior', T({ on: 'kill', do: [{ heal: 0.1, to: 'everyone' }] }), /target/],
      ['warrior', H({ on: 'overheal', ratio: 1 }), /into/],
      ['warrior', H({ on: 'healTaken', mul: 0.1, cap: 0.5 }), /only for overheal/],
      ['warrior', H({ on: 'bigHit', mul: -0.2 }), /min/],
      ['warrior', H({ on: 'healTaken', mul: 0.1, who: 'ally' }), /damageTaken/],
    ];
    for (const [cls, fx, re] of cases) {
      const errs = bad(cls, fx);
      expect(errs.length, JSON.stringify(fx)).toBeGreaterThan(0);
      expect(errs.join(' | '), JSON.stringify(fx)).toMatch(re);
    }
  });
});

describe('Faz 4a: Warrior', () => {
  it('Stubborn Heart: %25 altında tur başında maks canın %3\'ü', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', {}, 3)), 5, 'turns');
    const me = P(b);
    me.hp = Math.floor(me.maxHp * 0.2);
    untilTurn(b, E(b));
    const evs = untilTurn(b, me);
    expect(healBy(evs, 'warrior:bar[3]')).toBe(Math.round(me.maxHp * num('warrior', 'bar3', '0.do.0.heal')));
    // %25 üstünde iyileştirmez
    me.hp = me.maxHp - 1;
    untilTurn(b, E(b));
    expect(healBy(untilTurn(b, me), 'warrior:bar[3]')).toBe(0);
  });

  it('Iron Retort: seni %50 altına düşüren İLK düşman 1 tur Stun; ikinci kez olmaz', () => {
    seeds('Iron Retort', (s) => {
      const b = make({ 0: 'warrior' }, { 0: 'warrior' }, withTree(0, only('warrior', { '0.n0': 1 })), s);
      const me = P(b);
      me.hp = Math.floor(me.maxHp * 0.5) + 1;
      cast(b, E(b), 'melee_attack', me);
      if (me.hp >= me.maxHp * 0.5 || me.hp <= 0) return false;
      const st = E(b).statuses.find((x) => x.kind === 'stun');
      expect(st?.turns).toBe(1);
      expect(procs(b, 'warrior:0.n0')).toBe(1);
      E(b).statuses = [];
      me.hp = me.maxHp;
      me.hp = Math.floor(me.maxHp * 0.5) + 1;
      cast(b, E(b), 'melee_attack', me);
      expect(has(E(b), 'stun')).toBe(false);
      expect(procs(b, 'warrior:0.n0')).toBe(1);
      return true;
    });
  });

  it('Hardened: her Fortified oluşta rank başına maks canın %2\'si', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.r': 3 })));
    const me = P(b);
    me.hp = Math.floor(me.maxHp / 2);
    const from = b.log.length;
    X(b).addStatus(me, { kind: 'fortify', turns: 1, source: me.uid }, emitOf(b));
    expect(healBy(b.log.slice(from), 'warrior:0.r')).toBe(Math.round(me.maxHp * 3 * num('warrior', '0.r', '0.do.0.heal')));
  });

  it('Grave Robber + Terror: Headsman\'s Blow öldürürse %25 şifa + 1 tur Fortified, her düşman Jinxed', () => {
    seeds('Headsman kill', (s) => {
      const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('warrior', { '4.u3': 1, '4.l3': 1 })), s);
      const me = P(b);
      me.hp = Math.floor(me.maxHp * 0.3);
      me.rage = me.maxRage;
      E(b).hp = 1;
      const evs = cast(b, me, 'headsmans_blow', E(b));
      if (E(b).hp > 0) return false;
      expect(healBy(evs, 'warrior:4.u3')).toBe(Math.round(me.maxHp * num('warrior', '4.u3', '0.do.0.heal')));
      expect(me.statuses.find((x) => x.kind === 'fortify')?.turns).toBe(1);
      expect(has(E(b, 1), 'jinxed')).toBe(true);
      return true;
    });
  });

  it('Grit / Measured Mending: alınan şifa çarpanı', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.f2': 3, '0.ea': 1 })));
    const me = P(b);
    me.hp = Math.floor(me.maxHp * 0.2);
    const grit = 1 + 3 * num('warrior', '0.f2', '0.mul');
    const mend = 1 + num('warrior', '0.ea', '0.mul');
    expect(b.treeHealMult(me, me, null)).toBeCloseTo(grit * mend, 9);
    me.hp = Math.floor(me.maxHp * 0.4);
    expect(b.treeHealMult(me, me, null)).toBeCloseTo(mend, 9);
    me.hp = Math.ceil(me.maxHp * 0.6);
    expect(b.treeHealMult(me, me, null)).toBeCloseTo(0.5, 9);
  });

  it('Stand Firm: maks canın %30+\'ı tek vuruş %25 azalır, altı değişmez', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.eb': 1 })));
    const me = P(b);
    const big = Math.ceil(me.maxHp * 0.3);
    expect(X(b).bigHitCut(me, E(b), big)).toBe(Math.round(big * 0.75));
    expect(X(b).bigHitCut(me, E(b), big - 1)).toBe(big - 1);
  });

  it('Red Line: canı %50 üstüne çıkaracak şifa 2 turluk kalkana döner', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.ma': 1 })));
    const me = P(b);
    me.hp = Math.floor(me.maxHp * 0.4);
    const room = Math.round(me.maxHp * 0.5) - me.hp;
    const wanted = Math.round(me.maxHp * 0.3);
    const sh0 = me.shield;
    X(b).applyHeal(E(b), me, wanted, false, emitOf(b));
    expect(me.hp).toBe(Math.round(me.maxHp * 0.5));
    expect(me.shield - sh0).toBe(wanted - room);
    expect(me.shieldHooks?.find((h) => h.skill === 'warrior:0.ma')?.turns).toBe(2);
  });

  it('Spin Recovery + Blood Glut: Whirlwind vurduğu her düşman için %1 x rank şifa; tam candaki fazlası %1 başına 1 Rage', () => {
    const run = (ranks: Record<string, number>) => {
      const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage', 2: 'mage' }, withTree(0, only('warrior', ranks)), 7);
      for (const e of b.combatants) if (e.side === 'enemy') e.hp = e.maxHp = 99999;
      P(b).rage = 0;
      cast(b, P(b), 'whirlwind', E(b));
      return b;
    };
    const plain = run({ '2.f2': 5 });
    const glut = run({ '2.f2': 5, '2.ma': 1 });
    const hits = procs(glut, 'warrior:2.f2');
    expect(hits).toBeGreaterThan(0);
    expect(procs(plain, 'warrior:2.f2')).toBe(hits);
    // Blood Glut Whirlwind kullanımındaki TÜM şifaların fazlasını çevirir (Berserker can çalma dahil); Spin Recovery'nin her şifası en az 5 Rage
    expect(procs(glut, 'warrior:2.ma')).toBeGreaterThanOrEqual(hits);
    expect((P(glut).rage ?? 0) - (P(plain).rage ?? 0)).toBeGreaterThanOrEqual(5 * hits);
    // Can eksikken şifa verir: vurulan düşman başına %5
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '2.f2': 5 })), 7);
    E(b).hp = E(b).maxHp = 99999;
    P(b).hp = 10;
    const evs = cast(b, P(b), 'whirlwind', E(b));
    expect(healBy(evs, 'warrior:2.f2')).toBe(procs(b, 'warrior:2.f2') * Math.round(P(b).maxHp * 0.05));
  });
});

describe('Faz 4a: Defender', () => {
  it('Second Breath + Weathered the Storm: Taunt bitince %3 x rank şifa; kırılmadan biterse 1 tur Fortified', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '2.f2': 2, '2.ma': 1 })), 3, 'turns');
    const me = P(b);
    untilTurn(b, me);
    expect(b.useSkill(me.uid, 'taunt').ok).toBe(true);
    me.hp = Math.floor(me.maxHp / 2);
    const from = b.log.length;
    for (let i = 0; i < 30 && has(me, 'taunt'); i++) b.skipTurn();
    const evs = b.log.slice(from);
    expect(evs.some((e) => e.type === 'statusEnd' && e.target === me.uid && e.status === 'taunt')).toBe(true);
    expect(healBy(evs, 'defender:2.f2')).toBe(Math.round(me.maxHp * 2 * num('defender', '2.f2', '0.do.0.heal')));
    expect(procs(b, 'defender:2.ma')).toBe(1);
    expect(evs.some((e) => e.type === 'status' && e.target === me.uid && e.status === 'fortify')).toBe(true);
  });

  it('Refused to Fall: Taunt kırılınca cooldown sıfırlanır, zırhın %30\'u kalkan; Weathered tetiklenmez', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '2.mb': 1, '2.ma': 1 })));
    const me = P(b);
    cast(b, me, 'taunt');
    me.cooldowns.taunt = 4;
    const sh0 = me.shield;
    X(b).addStatus(me, { kind: 'stun', turns: 1, source: E(b).uid }, emitOf(b));
    expect(has(me, 'taunt')).toBe(false);
    expect(me.cooldowns.taunt).toBeUndefined();
    expect(me.shield - sh0).toBe(Math.round(X(b).effectiveStats(me).armor * num('defender', '2.mb', '0.do.1.shield')));
    expect(procs(b, 'defender:2.ma')).toBe(0);
  });

  it('Thick Skull: Taunt maks canın %3 x rank\'ı kalkan verir', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '2.f3': 3 })));
    const me = P(b);
    const sh0 = me.shield;
    cast(b, me, 'taunt');
    expect(me.shield - sh0).toBe(Math.round(me.maxHp * 3 * num('defender', '2.f3', '0.do.0.shield')));
  });

  it('Cover Them: bir dost %30 altına düşünce Taunt cooldown\'u sıfırlanır (kendin sayılmaz)', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('defender', { '2.n0': 1 })));
    const me = P(b);
    const ally = P(b, 1);
    me.cooldowns.taunt = 3;
    me.hp = Math.floor(me.maxHp * 0.2);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.5), E(b), emitOf(b));
    expect(me.cooldowns.taunt).toBe(3);
    ally.hp = Math.floor(ally.maxHp * 0.25);
    X(b).hpCrossTrig(ally, Math.floor(ally.maxHp * 0.5), E(b), emitOf(b));
    expect(me.cooldowns.taunt).toBeUndefined();
  });

  it('Linked Plates: Close Ranks aktarımı rank başına %3 azalır', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '3.f3': 4 })));
    expect(X(b).guardShareCut(P(b), 100, E(b))).toBe(88);
  });

  it('Forge Again: Fist Crush öldürürse cooldown\'u sıfırlanır (turns modu)', () => {
    const run = (tree?: UnitSetup['tree']) => {
      let out: number | undefined = -1;
      seeds('Fist Crush kill', (s) => {
        const b = make({ 0: 'defender' }, { 0: 'mage' }, tree ? withTree(0, tree) : {}, s, 'turns');
        const me = P(b);
        untilTurn(b, me);
        E(b).hp = 1;
        me.mp = me.maxMp;
        me.cooldowns = {};
        const r = b.useSkill(me.uid, 'fist_crush', E(b).uid);
        expect(r.ok, JSON.stringify(r)).toBe(true);
        if (E(b).hp > 0) return false;
        out = me.cooldowns.fist_crush;
        return true;
      });
      return out;
    };
    expect(run()).toBeGreaterThan(0);
    expect(run(only('defender', { '4.l3': 1 }))).toBeUndefined();
  });
});

describe('Faz 4a: Mage', () => {
  it('Ice Mirror: Mana Barrier\'ın emdiği İLK vuruş saldıranı 2 tur Slow\'lar (kalkan başına bir kez)', () => {
    seeds('Ice Mirror', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '3.n0': 1 })), s);
      const me = P(b);
      cast(b, me, 'mana_barrier', me);
      const evs = cast(b, E(b), 'melee_attack', me);
      const absorbed = evs.filter((e) => e.type === 'damage' && e.target === me.uid && e.absorbed > 0).length;
      if (absorbed < 2) return false;
      expect(evs.filter((e) => e.type === 'status' && e.target === E(b).uid && e.status === 'slow').length).toBe(1);
      expect(E(b).statuses.find((x) => x.kind === 'slow')?.turns).toBe(2);
      expect(procs(b, 'mage:3.n0')).toBe(1);
      return true;
    });
  });

  it('Hot Streak: kritik Fire Bolt sonraki Fire Bolt\'u kesin kritik yapar', () => {
    seeds('Fire Bolt crit', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '1.ma': 1 })), s);
      E(b).hp = E(b).maxHp = 99999;
      const evs = cast(b, P(b), 'fire_bolt', E(b));
      if (!evs.some((e) => e.type === 'damage' && e.target === E(b).uid && e.crit)) return false;
      expect(P(b).treeBuffs?.find((x) => x.node === 'mage:1.ma')).toMatchObject({ skill: 'fire_bolt', uses: 1 });
      expect(P(b).treeBuffs?.[0]?.pending).toBeUndefined();
      // Başka büyü buff'ı harcamaz
      cast(b, P(b), 'blizzard', E(b));
      expect(P(b).treeBuffs?.some((x) => x.node === 'mage:1.ma')).toBe(true);
      for (let i = 0; i < 3; i++) {
        const next = cast(b, P(b), 'fire_bolt', E(b));
        const dmg = next.filter((e) => e.type === 'damage' && e.target === E(b).uid);
        if (!dmg.length) continue; // ıska: buff kullanımla harcanır, ama kritik sınanamaz
        expect(dmg.every((e) => e.type === 'damage' && e.crit)).toBe(true);
        return true;
      }
      return false;
    });
  });

  it('Momentum: öldürünce sonraki büyü +%15 hasar (öldüren kullanım harcamaz, sonraki harcar)', () => {
    seeds('Fire Bolt kill', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('mage', {}, 3)), s);
      E(b).hp = 1;
      cast(b, P(b), 'fire_bolt', E(b));
      if (E(b).hp > 0) return false;
      const bf = P(b).treeBuffs?.find((x) => x.node === 'mage:bar[3]');
      expect(bf).toMatchObject({ mod: { powerMul: num('mage', 'bar3', '0.do.0.buff.powerMul') }, uses: 1 });
      expect(bf?.pending).toBeUndefined();
      cast(b, P(b), 'fire_bolt', E(b, 1));
      expect(P(b).treeBuffs?.some((x) => x.node === 'mage:bar[3]')).toBe(false);
      return true;
    });
  });

  it('Momentum önizlemesi: buff varken önizleme hasarı x1,15', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', {}, 3)));
    E(b).hp = E(b).maxHp = 99999;
    const pv = () => previewSkill(b, P(b).uid, 'fire_bolt', E(b).uid);
    const base = pv();
    P(b).treeBuffs = [{ node: 'mage:bar[3]', s: 1, mod: { powerMul: 0.15 }, uses: 1 }];
    const boosted = pv();
    const lo = (p: typeof base) => p.find((t) => t.uid === E(b).uid)?.damage?.avg ?? 0;
    expect(lo(boosted)).toBeGreaterThan(lo(base));
    expect(lo(boosted) / lo(base)).toBeCloseTo(1.15, 1);
  });

  it('Low Tide: MP %25 altına inince (savaşta bir kez) sonraki büyü bedelsiz', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', {}, 2)));
    const me = P(b);
    E(b).hp = E(b).maxHp = 99999;
    me.mp = Math.ceil(me.maxMp * 0.25) + 1;
    expect(b.useSkill(me.uid, 'fire_bolt', E(b).uid).ok).toBe(true);
    expect(me.treeBuffs?.find((x) => x.free)?.pending).toBeUndefined();
    expect(skillCostAmount(content.skills.blizzard!.cost, me)).toBe(0);
    const mp = me.mp;
    expect(b.useSkill(me.uid, 'blizzard', E(b).uid).ok).toBe(true);
    expect(me.mp).toBe(mp);
    expect(me.treeBuffs?.some((x) => x.free) ?? false).toBe(false);
    // ikinci kez olmaz
    me.mp = me.maxMp;
    me.mp = Math.ceil(me.maxMp * 0.25) + 1;
    expect(b.useSkill(me.uid, 'fire_bolt', E(b).uid).ok).toBe(true);
    expect(me.treeBuffs?.some((x) => x.free) ?? false).toBe(false);
  });

  it('Resonant Kill: öldürünce en uzun cooldown 1 düşer', () => {
    seeds('kill', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('mage', {}, 1)), s);
      E(b).hp = 1;
      const me = P(b);
      me.cooldowns.fire_bolt = 0;
      me.mp = me.maxMp;
      me.cooldowns = { meteor: 5, blizzard: 2 };
      expect(b.useSkill(me.uid, 'fire_bolt', E(b).uid).ok).toBe(true);
      if (E(b).hp > 0) return false;
      expect(me.cooldowns).toEqual({ meteor: 4, blizzard: 2 });
      return true;
    });
  });

  it('Sympathy: Spell Echo tetiklenince öbür cooldown\'lu büyüler 1 düşer', () => {
    seeds('echo', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '0.eb': 1 })), s, 'turns');
      E(b).hp = E(b).maxHp = 99999;
      const me = P(b);
      untilTurn(b, me);
      me.cooldowns = { meteor: 4, mana_barrier: 2 };
      me.mp = me.maxMp;
      expect(b.useSkill(me.uid, 'blizzard', E(b).uid).ok).toBe(true);
      if (!procs(b, 'mage:0.eb')) return false;
      expect(me.cooldowns.meteor).toBe(3);
      expect(me.cooldowns.mana_barrier).toBe(1);
      return true;
    });
  });
});

describe('Faz 4a: öbür sınıflar', () => {
  it('Gambler barları: Jackpot -> 1 tur Haste; HP\'li Bust -> sonraki skill +%15; Lucky Escape -> %10 şifa', () => {
    const b = make({ 0: 'gambler' }, { 0: 'mage' }, withTree(0, only('gambler', {}, 1)));
    X(b).trig([P(b)], { on: 'jackpot', resource: 'mp', amount: 5 }, emitOf(b));
    expect(P(b).statuses.find((x) => x.kind === 'haste')?.turns).toBe(1);
    const b2 = make({ 0: 'gambler' }, { 0: 'mage' }, withTree(0, only('gambler', {}, 2)));
    X(b2).trig([P(b2)], { on: 'bust', resource: 'mp', amount: 5 }, emitOf(b2));
    expect(P(b2).treeBuffs ?? []).toEqual([]);
    X(b2).trig([P(b2)], { on: 'bust', resource: 'hp', amount: 5 }, emitOf(b2));
    expect(P(b2).treeBuffs?.[0]).toMatchObject({ mod: { powerMul: num('gambler', 'bar2', '0.do.0.buff.powerMul') }, uses: 1 });
    const b3 = make({ 0: 'gambler' }, { 0: 'mage' }, withTree(0, only('gambler', {}, 4)));
    P(b3).hp = 1;
    const from = b3.log.length;
    X(b3).trig([P(b3)], { on: 'luckyEscape', target: P(b3), source: P(b3) }, emitOf(b3));
    expect(healBy(b3.log.slice(from), 'gambler:bar[4]')).toBe(Math.round(P(b3).maxHp * num('gambler', 'bar4', '0.do.0.heal')));
  });

  it('Hex Ward: herhangi bir düşman Jinxed iken rank başına %3 az hasar', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior' }, withTree(0, only('hexer', { '3.f3': 3 })));
    expect(b.treeTakenMult(P(b), E(b))).toBe(1);
    E(b).statuses.push({ kind: 'jinxed', turns: 2, source: P(b).uid });
    expect(b.treeTakenMult(P(b), E(b))).toBeCloseTo(0.91, 9);
  });

  it('Woeful Turn: ıskalayan Jinxed düşman sıradaki eylemini kaybeder', () => {
    seeds('Jinxed miss', (s) => {
      const b = make({ 0: 'hexer' }, { 0: 'warrior' }, withTree(0, only('hexer', { '3.ma': 1 })), s, 'turns');
      P(b).hp = P(b).maxHp = 99999;
      untilTurn(b, E(b));
      E(b).statuses.push({ kind: 'jinxed', turns: 2, source: P(b).uid });
      const from = b.log.length;
      expect(b.useSkill(E(b).uid, 'melee_attack', P(b).uid).ok).toBe(true);
      const evs = b.log.slice(from);
      if (!evs.some((e) => (e.type === 'miss' || e.type === 'dodge') && e.target === P(b).uid)) return false;
      expect(has(E(b), 'staggered')).toBe(true);
      return true;
    }, 200);
  });

  it('Soft Hands / Emergency Bloom: Rejuvenate %50 altındaki dosta +%4 x rank, %30 altındakine ayrıca +%50', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('druid', { '3.f3': 2, '3.eb': 1 })));
    const ally = P(b, 1);
    const rj = content.skills.rejuvenate!;
    ally.hp = Math.floor(ally.maxHp * 0.4);
    const soft = 1 + 2 * num('druid', '3.f3', '0.mul');
    expect(b.treeHealMult(P(b), ally, rj)).toBeCloseTo(soft, 9);
    ally.hp = Math.floor(ally.maxHp * 0.2);
    expect(b.treeHealMult(P(b), ally, rj)).toBeCloseTo(soft * (1 + num('druid', '3.eb', '0.mul')), 9);
    expect(b.treeHealMult(P(b), ally, null)).toBe(1);
  });

  it('Overflowing Cup: Rejuvenate\'in tam canı aşan şifası aynı boyda kalkan olur', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('druid', { '3.n0': 1 })));
    const ally = P(b, 1);
    ally.hp = ally.maxHp - 5;
    const sh0 = ally.shield;
    const evs = cast(b, P(b), 'rejuvenate', ally);
    const healed = evs.reduce((s, e) => s + (e.type === 'heal' && e.target === ally.uid ? e.amount : 0), 0);
    expect(healed).toBe(5);
    const shieldEv = evs.find((e) => e.type === 'shield' && e.target === ally.uid);
    expect(shieldEv && shieldEv.type === 'shield' ? shieldEv.amount : 0).toBe(ally.shield - sh0);
    expect(ally.shield - sh0).toBeGreaterThan(0);
  });

  it('Reaping Dawn: Radiance\'ın öldürdüğü her düşman 5 MP', () => {
    const run = (tree?: UnitSetup['tree']) => {
      const b = make({ 0: 'paladin' }, { 0: 'mage', 1: 'mage' }, tree ? withTree(0, tree) : {}, 4);
      E(b).hp = 1;
      E(b, 1).hp = 1;
      cast(b, P(b), 'radiance');
      expect(E(b).hp + E(b, 1).hp).toBe(0);
      return P(b).mp;
    };
    expect(run(only('paladin', { '4.r2': 1 })) - run()).toBe(10);
  });

  it('Trophy / Next in Line: Aimed Shot öldürürse cooldown sıfırlanır; sonraki skill +%50 ve ıskalamaz', () => {
    seeds('Aimed kill', (s) => {
      const b = make({ 0: 'archer' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('archer', { '4.r3': 1 })), s);
      E(b).hp = 1;
      cast(b, P(b), 'aimed_shot', E(b));
      if (E(b).hp > 0) return false;
      expect(P(b).treeBuffs?.[0]).toMatchObject({ mod: { powerMul: num('archer', '4.r3', '0.do.0.buff.powerMul'), sureHit: true }, uses: 1 });
      expect(P(b).treeBuffs?.[0]?.pending).toBeUndefined();
      return true;
    });
    expect(trigOf(only('archer', { '4.r1': 1 }), 'archer:4.r1')).toMatchObject({ on: 'kill', skill: 'aimed_shot', do: [{ cooldown: 'reset' }] });
  });

  it('Overflow Spill: her Mana Overflow en az MP\'li dosta rank başına 1 MP', () => {
    const b = make({ 0: 'antimage', 1: 'mage', 2: 'warrior' }, { 0: 'mage' }, withTree(0, only('antimage', { '0.f3': 3 })));
    P(b, 1).mp = 2;
    const before = P(b, 1).mp;
    X(b).trig([P(b)], { on: 'manaOverflow', target: P(b), source: P(b), amount: 1 }, emitOf(b));
    expect(P(b, 1).mp - before).toBe(3);
  });

  it('Light Step / Reaper\'s Due: kaçınma 2 MP; ilk öldürme öbür cooldown\'ları sıfırlar (savaşta bir kez)', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'mage' }, withTree(0, only('cutthroat', {}, 1)));
    P(b).mp = 0;
    X(b).trig([P(b)], { on: 'dodge', target: E(b), source: E(b), subject: P(b) }, emitOf(b));
    expect(P(b).mp).toBe(2);
    seeds('Venom Edge kill', (s) => {
      const c = make({ 0: 'cutthroat' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('cutthroat', {}, 4)), s);
      const me = P(c);
      E(c).hp = 1;
      me.mp = me.maxMp;
      me.cooldowns = { x_cut: 3, smoke_bomb: 2 };
      expect(c.useSkill(me.uid, 'venom_edge', E(c).uid).ok).toBe(true);
      if (E(c).hp > 0) return false;
      expect(me.cooldowns).toEqual({});
      me.cooldowns = { x_cut: 3 };
      E(c, 1).hp = 1;
      me.mp = me.maxMp;
      c.useSkill(me.uid, 'venom_edge', E(c, 1).uid);
      expect(me.cooldowns).toEqual({ x_cut: 3 });
      return true;
    });
  });

  it('Red Reserve: savaşta ilk kez %50 altına düşünce sonraki skill bedelsiz', () => {
    const b = make({ 0: 'undead' }, { 0: 'mage' }, withTree(0, only('undead', {}, 1)));
    const me = P(b);
    const sk = content.skills.wail_of_the_dead!;
    expect(skillCostAmount(sk.cost, me)).toBeGreaterThan(0);
    me.hp = Math.floor(me.maxHp * 0.45);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.55), E(b), emitOf(b));
    expect(skillCostAmount(sk.cost, me)).toBe(0);
  });
});

describe('Faz 4a: motor güvenliği', () => {
  it('zincir koruması: kendini besleyen tetik sonlu kalır (derinlik sınırı)', () => {
    const tree = { hooks: [{ h: 'trigger', node: 'warrior:loop', on: 'statusGained', status: 'haste', do: [{ status: 'haste', turns: 1 }] }] } as unknown as UnitSetup['tree'];
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, tree));
    X(b).addStatus(P(b), { kind: 'haste', turns: 1, source: P(b).uid }, emitOf(b));
    const n = procs(b, 'warrior:loop');
    expect(n).toBeGreaterThan(1);
    expect(n).toBeLessThanOrEqual(8);
  });

  it('ağaçsız savaş: tetik / C4 yolu kapalı, çarpanlar 1', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' });
    expect(b.treeTakenMult(P(b), E(b))).toBe(1);
    expect(b.treeHealMult(P(b), P(b), null)).toBe(1);
    expect(b.treeShieldMult(P(b), P(b), null)).toBe(1);
    expect(b.treeProcs()).toEqual([]);
  });

  it('aynı seed + aynı ağaç = birebir aynı savaş (seed\'li zar)', () => {
    const run = () => {
      const t = only('warrior', { '0.n0': 1, '2.f2': 5, '0.ma': 1 }, 3);
      const b = make({ 0: 'warrior' }, { 0: 'warrior' }, withTree(0, t), 9);
      P(b).hp = Math.floor(P(b).maxHp * 0.51);
      cast(b, E(b), 'melee_attack', P(b));
      cast(b, P(b), 'whirlwind', E(b));
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });
});
