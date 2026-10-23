import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { TriggerHook } from '../src/engine/tree-hooks';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { focusBuild } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 4b parça 2/3 (Mage, Druid, Cutthroat, Undead): veriye yazılan C3 tetik / C4 şifa-kalkan fx'leri.
// Her test YALNIZCA verilen düğümlerin fx'iyle derler (only); beklenen sayılar düğüm metninden birebir.

const MINE = ['mage', 'druid', 'cutthroat', 'undead'];
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
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const healBy = (evs: BattleEvent[], node: string, uid?: string): number => evs.reduce((s, e) => s + (e.type === 'heal' && e.cause === node && (!uid || e.target === uid) ? e.amount : 0), 0);
const mpBy = (evs: BattleEvent[], node: string): number => evs.reduce((s, e) => s + (e.type === 'mpRegen' && e.cause === node ? e.amount : 0), 0);
const trigOf = (tree: UnitSetup['tree'], node: string): TriggerHook => (tree?.hooks ?? []).find((h) => h.node === node && h.h === 'trigger') as TriggerHook;
function seeds(what: string, fn: (seed: number) => boolean, n = 120): void {
  for (let s = 1; s <= n; s++) if (fn(s)) return;
  throw new Error(`${what}: hiçbir seed'de olmadı`);
}
interface Priv {
  record(e: BattleEvent): void;
  hpCrossTrig(t: Combatant, hp0: number, a: Combatant, emit: (e: BattleEvent) => void): void;
  trig(owners: Combatant[], ev: Record<string, unknown>, emit: (e: BattleEvent) => void): void;
}
const X = (b: Battle): Priv => b as unknown as Priv;
const emitOf = (b: Battle) => (e: BattleEvent) => X(b).record(e);
function untilTurn(b: Battle, c: Combatant, max = 30): BattleEvent[] {
  const from = b.log.length;
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
  return b.log.slice(from);
}

describe('Faz 4b (M/D/Cu/U): veri ve derleyici', () => {
  it('4 ağacın fx\'leri temiz; her satır / yön / ult kolu birleşimi derlenir', () => {
    for (const c of MINE) {
      const T = treeOf(c)!;
      expect(checkTreeFx(T), c).toEqual([]);
      for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
        for (const dir of ['a', 'b'] as const)
          for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult })), `${c} ${rows} ${dir} ${ult}`).not.toThrow();
    }
  });

  it('yerine geçen düğümler (drop): Frayed Threads, Brittle Shell, Cutting Haste, Bitter Gift, Bled Dry tek kanca bırakır', () => {
    const one = (cls: string, ranks: Record<string, number>, gone: string, node: string) => {
      const t = only(cls, ranks);
      expect((t?.hooks ?? []).some((h) => h.node === `${cls}:${gone}`), `${cls}:${gone}`).toBe(false);
      return trigOf(t, `${cls}:${node}`);
    };
    expect(one('mage', { '0.eb': 1, '0.fb': 1 }, '0.eb', '0.fb').do).toEqual([{ cooldown: -2, cd: 'others' }]);
    expect(one('mage', { '3.ea': 1, '3.fa': 1 }, '3.ea', '3.fa').do).toEqual([{ status: 'slow', turns: 2, to: 'target' }]);
    expect(one('druid', { '1.eb': 1, '1.fb': 1 }, '1.eb', '1.fb').do).toEqual([{ mp: num('druid', '1.fb', '0.do.0.mp') }]);
    expect(one('undead', { '2.eb': 1, '2.fb': 1 }, '2.eb', '2.fb').do[0]).toMatchObject({ heal: 2, of: 'hpPaid', to: 'bonded' });
    expect(one('undead', { '3.ea': 1, '3.fa': 1 }, '3.ea', '3.fa').do[0]).toMatchObject({ heal: 0.3 });
    // pasif / skill yamaları
    expect((only('mage', { '0.f1': 3, '0.fb': 1 })!.passive!.effect as { chance: number }).chance).toBeCloseTo(0.18 + 3 * num('mage', '0.f1', '0.v'), 9); // base 0,18 + Resonance 3 x rank değeri (veriden, D9 2026-10-23)
    expect(only('undead', { '3.fa': 1 })!.skills!.dark_bond!.cooldown).toBe(3);
  });
});

describe('Faz 4b: Mage', () => {
  it('Encore (bar 25): %40 altına ilk inişte tüm cooldown\'lar sıfır, ikinci kez olmaz', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', {}, 4)));
    const me = P(b);
    me.cooldowns = { meteor: 4, blizzard: 2 };
    me.hp = Math.floor(me.maxHp * 0.35);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.45), E(b), emitOf(b));
    expect(me.cooldowns).toEqual({});
    me.cooldowns = { meteor: 4 };
    me.hp = Math.floor(me.maxHp * 0.3);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.45), E(b), emitOf(b));
    expect(me.cooldowns).toEqual({ meteor: 4 });
  });

  it('Frost Armor + Frozen Reserve: emilen her vuruş saldıranı 1 tur Slow\'lar; Slowed saldırandan emilen her vuruş rank başına 1 MP', () => {
    seeds('two absorbed hits', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '3.r': 3, '3.ea': 1 })), s);
      const me = P(b);
      cast(b, me, 'mana_barrier', me);
      me.mp = 0;
      const evs = cast(b, E(b), 'melee_attack', me);
      const absorbed = evs.filter((e) => e.type === 'damage' && e.target === me.uid && e.absorbed > 0).length;
      if (absorbed < 2) return false;
      expect(procs(b, 'mage:3.ea')).toBe(absorbed);
      expect(E(b).statuses.find((x) => x.kind === 'slow')?.turns).toBe(1);
      // ilk vuruşta saldıran henüz Slowed değildi (Frozen Reserve önce bakar), sonrakilerde 3 MP
      expect(mpBy(evs, 'mage:3.r')).toBe(3 * (absorbed - 1));
      return true;
    });
  });

  it('Rimeguard / Numbing Touch: ön sıradaki dosta kalkan +%5 x rank; Mana Barrier sürerken Slowed saldıran %3 x rank az vurur', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '3.f1': 5, '3.f3': 5 })));
    const me = P(b);
    expect(b.treeShieldMult(me, me, content.skills.mana_barrier!)).toBeCloseTo(1 + 5 * num('mage', '3.f1', '0.mul'), 9);
    expect(b.treeShieldMult(me, me, content.skills.fire_bolt!)).toBe(1);
    expect(b.treeTakenMult(me, E(b))).toBe(1);
    cast(b, me, 'mana_barrier', me);
    expect(b.treeTakenMult(me, E(b))).toBe(1); // saldıran Slowed değil
    E(b).statuses.push({ kind: 'slow', turns: 2, source: me.uid });
    expect(b.treeTakenMult(me, E(b))).toBeCloseTo(1 + 5 * num('mage', '3.f3', '0.mul'), 9); // değer veriden (D9 2026-10-23)
  });

  it('Cauterize: Mana Barrier\'ın sildiği her debuff dosta rank başına maks canın %2\'si şifa', () => {
    const b = make({ 0: 'mage', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, only('mage', { '3.f2': 2 })));
    const ally = P(b, 1);
    ally.hp = Math.floor(ally.maxHp / 2);
    ally.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid }, { kind: 'wound', turns: 2, source: E(b).uid });
    const evs = cast(b, P(b), 'mana_barrier', ally);
    const one = Math.max(1, Math.round(ally.maxHp * 0.04));
    expect(healBy(evs, 'mage:3.f2', ally.uid)).toBeGreaterThanOrEqual(one); // ilk şifa Wound altında olabilir
    expect(procs(b, 'mage:3.f2')).toBe(2);
  });

  it('Overload / Echo Chamber / Arcane Overload / Unstable Weave: yankı ve yankı ıskası (turns modu)', () => {
    let echoed = false;
    let failed = false;
    for (let s = 1; s <= 150 && !(echoed && failed); s++) {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '0.n0': 1, '0.ea': 1, '0.fa': 1, '0.v': 1 })), s, 'turns');
      E(b).hp = E(b).maxHp = 99999;
      const me = P(b);
      untilTurn(b, me);
      me.cooldowns = { meteor: 4, mana_barrier: 2 };
      me.mp = me.maxMp;
      expect(b.useSkill(me.uid, 'blizzard', E(b).uid).ok).toBe(true);
      if (procs(b, 'mage:0.v')) {
        echoed = true;
        expect(me.cooldowns).toEqual({}); // Arcane Overload: hepsi sıfır
        const buffs = me.treeBuffs ?? [];
        expect(buffs.find((x) => x.node === 'mage:0.n0')).toMatchObject({ mod: { guaranteedCrit: true }, skill: 'blizzard', uses: 1 });
        expect(buffs.find((x) => x.node === 'mage:0.fa')).toMatchObject({ mod: { powerMul: num('mage', '0.fa', '0.do.0.buff.powerMul') }, skill: 'blizzard' });
        expect(buffs.find((x) => x.node === 'mage:0.v')).toMatchObject({ mod: { powerMul: num('mage', '0.v', '0.do.1.buff.powerMul') }, skill: 'blizzard' });
        const ch = buffs.find((x) => x.node === 'mage:0.ea');
        expect(ch).toMatchObject({ mod: { echoChance: num('mage', '0.ea', '0.do.0.buff.echoChance') }, s: 1 });
        expect(ch!.uses).toBeUndefined(); // savaş boyu
      } else if (procs(b, 'mage:0.fa')) {
        failed = true;
        expect(me.cooldowns.blizzard).toBe((content.skills.blizzard!.cooldown ?? 0) + 1);
      }
    }
    expect(echoed && failed).toBe(true);
  });

  it('Lost in the Snow: ıskalayan Blinded düşman 1 tur Stun', () => {
    seeds('Blinded miss', (s) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '2.mb': 1 })), s);
      P(b).hp = P(b).maxHp = 99999;
      E(b).statuses.push({ kind: 'blinded', turns: 2, source: P(b).uid });
      const evs = cast(b, E(b), 'melee_attack', P(b));
      if (!evs.some((e) => (e.type === 'miss' || e.type === 'dodge') && e.target === P(b).uid)) return false;
      expect(E(b).statuses.find((x) => x.kind === 'stun')?.turns).toBe(1);
      return true;
    }, 200);
  });
});

describe('Faz 4b: Druid', () => {
  it('Reaping Vine / Endless Lash: Thorn Whip öldürürse 6 MP ve sıradaki tur iki kat hızlı; Cutting Haste 15 MP', () => {
    const lowMp = (ranks: Record<string, number>) => {
      let got = -1;
      seeds('kill', (s) => {
        const b = make({ 0: 'druid' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('druid', ranks)), s);
        const me = P(b);
        E(b).hp = 1;
        me.cooldowns = {};
        me.mp = 0;
        const from = b.log.length;
        expect(b.useSkill(me.uid, 'thorn_whip', E(b).uid).ok).toBe(true);
        if (E(b).hp > 0) return false;
        got = mpBy(b.log.slice(from), ranks['1.fb'] ? 'druid:1.fb' : 'druid:1.eb');
        return true;
      });
      return got;
    };
    expect(lowMp({ '1.eb': 1 })).toBe(num('druid', '1.eb', '0.do.0.mp'));
    expect(lowMp({ '1.eb': 1, '1.fb': 1 })).toBe(num('druid', '1.fb', '0.do.0.mp'));
    expect(trigOf(only('druid', { '1.mb': 1 }), 'druid:1.mb')).toMatchObject({ on: 'kill', skill: 'thorn_whip', do: [{ sooner: num('druid', '1.mb', '0.do.0.sooner') }] });
  });

  it('Cutting Haste: Thorn Whip %50 üstündeki hedefe %20 az vurur', () => {
    const b = make({ 0: 'druid' }, { 0: 'mage' }, withTree(0, only('druid', { '1.eb': 1, '1.fb': 1 })));
    const tw = content.skills.thorn_whip!;
    expect(b.dealtDamageMult(P(b), E(b), tw)).toBeCloseTo(1 + num('druid', '1.fb', '1.mod.powerMul'), 9);
    E(b).hp = Math.floor(E(b).maxHp * 0.4);
    expect(b.dealtDamageMult(P(b), E(b), tw)).toBeCloseTo(1, 9);
  });

  it('Rot Remembers: bir dostu %30 altına düşüren düşman 3 tur Withering (Nature\'s Grudge gücü); kendin sayılmaz', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, only('druid', { '0.n0': 1 })));
    const ally = P(b, 1);
    ally.hp = Math.floor(ally.maxHp * 0.25);
    X(b).hpCrossTrig(ally, Math.floor(ally.maxHp * 0.35), E(b), emitOf(b));
    const w = E(b).statuses.find((x) => x.kind === 'wither');
    expect(w?.turns).toBe(3);
    expect(w?.amount).toBeGreaterThan(0);
    E(b).statuses = [];
    P(b).hp = Math.floor(P(b).maxHp * 0.25);
    X(b).hpCrossTrig(P(b), Math.floor(P(b).maxHp * 0.35), E(b), emitOf(b));
    expect(has(E(b), 'wither')).toBe(false);
  });

  it('Ever-Rot: her turunun başında canı en yüksek düşman 2 tur Withering (turns modu)', () => {
    const b = make({ 0: 'druid' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('druid', { '0.v': 1 })), 5, 'turns');
    E(b, 1).hp = Math.floor(E(b, 1).maxHp / 2);
    untilTurn(b, P(b));
    const w = E(b).statuses.find((x) => x.kind === 'wither');
    expect(w?.turns).toBe(2);
    expect(has(E(b, 1), 'wither')).toBe(false);
    expect(procs(b, 'druid:0.v')).toBeGreaterThan(0);
  });

  it('Bitter Balm: Withering tiki canı en düşük dosta tikin %20 x rank\'ı kadar şifa (turns modu)', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('druid', { '0.r': 3 })), 5, 'turns');
    const ally = P(b, 1);
    ally.hp = Math.floor(ally.maxHp / 3);
    E(b).hp = E(b).maxHp = 99999;
    E(b).statuses.push({ kind: 'wither', turns: 3, source: P(b).uid, amount: 50 });
    const evs = untilTurn(b, E(b));
    const tick = evs.find((e) => e.type === 'damage' && e.target === E(b).uid);
    expect(tick).toBeTruthy();
    const amt = tick && tick.type === 'damage' ? tick.amount : 0;
    expect(healBy(evs, 'druid:0.r', ally.uid)).toBe(Math.max(1, Math.round(amt * 3 * num('druid', '0.r', '0.do.0.heal'))));
  });

  it('Rot Bloom: ölen Withering düşmanın komşularına %40 INT doğa hasarı ve 2 tur Withering', () => {
    const b = make({ 0: 'druid' }, { 0: 'mage', 1: 'mage', 3: 'mage', 4: 'mage' }, withTree(0, only('druid', { '0.ma': 1 })));
    E(b).statuses.push({ kind: 'wither', turns: 3, source: P(b).uid, amount: 5 });
    E(b).hp = 1;
    const from = b.log.length;
    seeds('Thorn Whip kill', () => {
      P(b).cooldowns = {};
      b.useSkill(P(b).uid, 'thorn_whip', E(b).uid);
      return E(b).hp <= 0;
    });
    const evs = b.log.slice(from);
    for (const n of [E(b, 1), E(b, 3)]) {
      expect(n.statuses.find((x) => x.kind === 'wither')?.turns, `slot ${n.slot}`).toBe(2);
      expect(evs.some((e) => e.type === 'damage' && e.target === n.uid && e.source === P(b).uid)).toBe(true);
    }
    expect(has(E(b, 4), 'wither')).toBe(false); // çapraz komşu değil
    expect(procs(b, 'druid:0.ma')).toBe(1);
  });

  it('Grief\'s Toll: Withering gücü x2; her dost düşüşünde maks canın %10\'u kaybedilir', () => {
    const t = only('druid', { '0.fb': 1 });
    expect(t!.passive!.effect).toMatchObject({ power: 0.3 });
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, t));
    const hp = P(b).hp;
    expect(b.debugKill(P(b, 1).uid, false).ok).toBe(true);
    expect(hp - P(b).hp).toBe(Math.round(P(b).maxHp * 0.1));
  });

  it('Dewdrop Shield: Overflowing Cup kalkanı rank başına +%10', () => {
    const shieldOf = (ranks: Record<string, number>) => {
      const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('druid', ranks)));
      const ally = P(b, 1);
      ally.hp = ally.maxHp - 5;
      const sh0 = ally.shield;
      cast(b, P(b), 'rejuvenate', ally);
      return ally.shield - sh0;
    };
    const base = shieldOf({ '3.n0': 1 });
    expect(base).toBeGreaterThan(0);
    expect(shieldOf({ '3.n0': 1, '3.r': 3 })).toBe(base + Math.round(base * 0.3));
  });
});

describe('Faz 4b: Cutthroat', () => {
  it('Clean Kill: Venom Edge öldürürse MP (veriden) ve Backstab cooldown\'u 1 düşer', () => {
    seeds('Venom Edge kill', (s) => {
      const b = make({ 0: 'cutthroat' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('cutthroat', { '1.ma': 1 })), s);
      const me = P(b);
      E(b).hp = 1;
      me.cooldowns = { backstab: 3 };
      me.mp = 0;
      const from = b.log.length;
      expect(b.useSkill(me.uid, 'venom_edge', E(b).uid).ok).toBe(true);
      if (E(b).hp > 0) return false;
      expect(mpBy(b.log.slice(from), 'cutthroat:1.ma')).toBe((treeOf('cutthroat')!.nodes['1.ma']!.fx![0] as { do: { mp: number }[] }).do[0]!.mp);
      expect(me.cooldowns.backstab).toBe(2);
      return true;
    });
  });

  it('Finishing Cross: Saltire Cut öldürürse cooldown\'u sıfırlanır (turns modu; ağaçsızda cooldown kalır)', () => {
    const run = (tree?: UnitSetup['tree']) => {
      let out: number | undefined = -1;
      seeds('Saltire kill', (s) => {
        const b = make({ 0: 'cutthroat' }, { 0: 'mage' }, tree ? withTree(0, tree) : {}, s, 'turns');
        const me = P(b);
        untilTurn(b, me);
        E(b).hp = 1;
        me.mp = me.maxMp;
        me.cooldowns = {};
        expect(b.useSkill(me.uid, 'x_cut', E(b).uid).ok).toBe(true);
        if (E(b).hp > 0) return false;
        out = me.cooldowns.x_cut;
        return true;
      });
      return out;
    };
    expect(run()).toBeGreaterThan(0);
    expect(run(only('cutthroat', { '2.n0': 1 }))).toBeUndefined();
  });

  it('Notched Blade (bar 20): her öldürme savaş boyu kritik hasarına +%3 ekler (birikir)', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('cutthroat', {}, 3)));
    for (const e of [E(b), E(b, 1)]) X(b).trig([P(b)], { on: 'kill', target: e, subject: e, source: P(b), via: 'skill' }, emitOf(b));
    const bf = P(b).treeBuffs?.find((x) => x.node === 'cutthroat:bar[3]');
    expect(bf).toMatchObject({ mod: { critDmgMul: num('cutthroat', 'bar3', '0.do.0.buff.critDmgMul') }, s: 2 });
    expect(bf!.uses).toBeUndefined();
  });

  it('Feinting Step: kaçınılan her saldırı sonraki vuruşa rank başına +%2 Opportunist bonusu (birikir, kullanımda harcanır)', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'mage' }, withTree(0, only('cutthroat', { '0.f3': 3 })));
    const ev = { on: 'dodge', target: E(b), source: E(b), subject: P(b) };
    X(b).trig([P(b)], ev, emitOf(b));
    X(b).trig([P(b)], ev, emitOf(b));
    expect(P(b).treeBuffs?.find((x) => x.node === 'cutthroat:0.f3')).toMatchObject({ mod: { passiveBonus: 3 * num('cutthroat', '0.f3', '0.do.0.buff.passiveBonus') }, s: 2, uses: 1 });
    cast(b, P(b), 'venom_edge', E(b));
    expect(P(b).treeBuffs?.some((x) => x.node === 'cutthroat:0.f3') ?? false).toBe(false);
  });

  it('Lost in Smoke: ıskalayan Blinded düşman sıradaki eylemini kaybeder (turns modu)', () => {
    seeds('Blinded miss', (s) => {
      const b = make({ 0: 'cutthroat' }, { 0: 'warrior' }, withTree(0, only('cutthroat', { '3.ma': 1 })), s, 'turns');
      P(b).hp = P(b).maxHp = 99999;
      untilTurn(b, E(b));
      E(b).statuses.push({ kind: 'blinded', turns: 2, source: P(b).uid });
      const from = b.log.length;
      expect(b.useSkill(E(b).uid, 'melee_attack', P(b).uid).ok).toBe(true);
      const evs = b.log.slice(from);
      if (!evs.some((e) => (e.type === 'miss' || e.type === 'dodge') && e.target === P(b).uid)) return false;
      expect(has(E(b), 'staggered')).toBe(true);
      expect(procs(b, 'cutthroat:3.ma')).toBeGreaterThan(0);
      return true;
    }, 200);
  });
});

describe('Faz 4b: Undead', () => {
  const bonded = (ranks: Record<string, number>, bar?: number) => {
    const b = make({ 0: 'undead', 1: 'warrior' }, { 0: 'mage', 1: 'mage', 2: 'mage', 3: 'mage', 4: 'mage', 5: 'mage' }, withTree(0, only('undead', ranks, bar)));
    for (const e of b.combatants.filter((c) => c.side === 'enemy')) e.hp = e.maxHp = 99999;
    return b;
  };

  it('Kindred Pulse / Soul Shield / Transfusion: Dark Bond başlarken dosta şifa, kalkan ve mevcut canın %15\'i', () => {
    const b = bonded({ '3.f2': 3, '3.eb': 1, '3.ea': 1 });
    const me = P(b);
    const ally = P(b, 1);
    ally.hp = 10;
    const hp0 = me.hp;
    const sh0 = ally.shield;
    const evs = cast(b, me, 'dark_bond', ally);
    expect(healBy(evs, 'undead:3.f2', ally.uid)).toBe(Math.round(me.maxHp * 3 * num('undead', '3.f2', '0.do.0.heal')));
    expect(ally.shield - sh0).toBe(Math.round(me.maxHp * num('undead', '3.eb', '0.do.0.shield')));
    expect(healBy(evs, 'undead:3.ea', ally.uid)).toBe(Math.round(hp0 * 0.15));
    expect(hp0 - me.hp).toBe(Math.round(hp0 * 0.15));
  });

  it('First Thread (bar 20): yalnızca ilk Dark Bond dosta maks canının %10\'u şifa', () => {
    const b = bonded({}, 3);
    const ally = P(b, 1);
    ally.hp = 10;
    expect(healBy(cast(b, P(b), 'dark_bond', ally), 'undead:bar[3]', ally.uid)).toBe(Math.round(ally.maxHp * num('undead', 'bar3', '0.do.0.heal')));
    ally.hp = 10;
    expect(healBy(cast(b, P(b), 'dark_bond', ally), 'undead:bar[3]', ally.uid)).toBe(0);
  });

  it('Blood Hymn / Bitter Gift: Wail bağlı dostu ödenen can kadar (Bitter Gift: iki katı) iyileştirir', () => {
    const run = (ranks: Record<string, number>, node: string) => {
      const b = bonded(ranks);
      const me = P(b);
      const ally = P(b, 1);
      cast(b, me, 'dark_bond', ally);
      ally.hp = 10;
      const evs = cast(b, me, 'wail_of_the_dead', E(b));
      const paid = evs.reduce((s, e) => s + (e.type === 'resource' && e.actor === me.uid && e.resource === 'hp' ? e.amount : 0), 0);
      return { paid, healed: healBy(evs, node, ally.uid) };
    };
    const a = run({ '2.eb': 1 }, 'undead:2.eb');
    expect(a.paid).toBeGreaterThan(0);
    expect(a.healed).toBe(a.paid);
    const g = run({ '2.eb': 1, '2.fb': 1 }, 'undead:2.fb');
    expect(g.healed).toBe(2 * g.paid);
  });

  it('Tithe Refund / Gorging Howl: vurulan her düşman için bedelin %4 x rank\'ı; 3+ düşman vurursa bedelin tamamı geri', () => {
    seeds('Wail hits 3', (s) => {
      const b = make({ 0: 'undead' }, { 0: 'mage', 1: 'mage', 2: 'mage', 3: 'mage', 4: 'mage' }, withTree(0, only('undead', { '2.r': 2, '2.mb': 1 })), s);
      for (const e of b.combatants.filter((c) => c.side === 'enemy')) e.hp = e.maxHp = 99999;
      const me = P(b);
      me.hp = Math.floor(me.maxHp / 3); // şifalar can tavanına takılmasın (Vampiric Bite da iyileştirir)
      const evs = cast(b, me, 'wail_of_the_dead', E(b, 1));
      const paid = evs.reduce((t, e) => t + (e.type === 'resource' && e.actor === me.uid && e.resource === 'hp' ? e.amount : 0), 0);
      const hit = new Set(evs.filter((e) => e.type === 'damage' && e.source === me.uid && e.target !== me.uid).map((e) => (e.type === 'damage' ? e.target : ''))).size;
      if (hit < 3 || !paid) return false;
      expect(procs(b, 'undead:2.r')).toBeGreaterThanOrEqual(hit);
      const per = evs.filter((e) => e.type === 'heal' && e.cause === 'undead:2.r');
      expect(per.length).toBeGreaterThanOrEqual(hit);
      for (const e of per) expect(e.type === 'heal' ? e.amount : 0).toBe(Math.max(1, Math.round(paid * 0.08)));
      expect(procs(b, 'undead:2.mb')).toBe(1);
      expect(healBy(evs, 'undead:2.mb')).toBe(paid); // tam bedel
      return true;
    });
  });

  it('Kindred Guard: bağlı dost rank başına %2 az hasar alır (bağsız dost değil)', () => {
    const b = bonded({ '3.f3': 3 });
    const ally = P(b, 1);
    expect(b.treeTakenMult(ally, E(b))).toBe(1);
    cast(b, P(b), 'dark_bond', ally);
    expect(b.treeTakenMult(ally, E(b))).toBeCloseTo(1 + 3 * num('undead', '3.f3', '0.mul'), 9); // değer veriden (D9 2026-10-23)
    expect(b.treeTakenMult(P(b), E(b))).toBe(1);
  });

  it('Brink Walker (bar 25): %25 altına ilk inişte Wail cooldown\'u sıfır', () => {
    const b = make({ 0: 'undead' }, { 0: 'mage' }, withTree(0, only('undead', {}, 4)));
    const me = P(b);
    me.cooldowns = { wail_of_the_dead: 3, dark_bond: 2 };
    me.hp = Math.floor(me.maxHp * 0.2);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.3), E(b), emitOf(b));
    expect(me.cooldowns).toEqual({ dark_bond: 2 });
  });
});
