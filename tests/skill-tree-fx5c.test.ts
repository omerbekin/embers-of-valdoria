import { describe, expect, it } from 'vitest';
import { Battle, betStakeParts, chooseAction, content, previewSkill, skillCostLabel, skillCostPay, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 5c (engine-dev): Faz 5b'de motor eksiği yüzünden null kalan 4 düğüm: Paladin 2.n0 Soul Exchange (yedek can bedeli), Gambler 3.v
// Returning Cards (ek vuruş + yeni durum zarı), Gambler 4.u2 Mortgage (bahiste can), Hexer 3.v Turned Hand (Jinxed saldırı dosta döner).

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(cls: string, ranks: Record<string, number>, edit?: (t: TreeData) => void): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  edit?.(t);
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
function use(b: Battle, actor: Combatant, skill: string, target?: Combatant): BattleEvent[] {
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  const r = b.useSkill(actor.uid, skill, target?.uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Combatant['statuses'][number], emit: (e: BattleEvent) => void, cause?: string): void;
}
const X = (b: Battle): Priv => b as unknown as Priv;
const debuff = (b: Battle, t: Combatant, kind: string, turns: number, src: Combatant): void =>
  X(b).addStatus(t, { kind, turns, source: src.uid } as Combatant['statuses'][number], (e) => X(b).record(e));
const bad = (cls: string, key: string, fx: unknown): string[] => {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  t.nodes[key]!.fx = fx as TreeData['nodes'][string]['fx'];
  return checkTreeFx(t);
};

describe('Faz 5c: derleyici', () => {
  it('yedek can bedeli yalnızca MP bedelli skill\'de, ek can bahsi yalnızca MP bahsinde; oran (0, 1)', () => {
    expect(bad('paladin', '2.n0', [{ k: 'skill', sel: 'self', f: 'cost.hpFallback', op: 'set', v: 0.25 }])).toEqual([]);
    expect(bad('paladin', '2.n0', [{ k: 'skill', sel: 'self', f: 'cost.hpFallback', op: 'set', v: 1.5 }]).length).toBeGreaterThan(0);
    expect(bad('gambler', '4.u2', [{ k: 'skill', sel: 'bet', f: 'hpStake', op: 'set', v: 0.1 }])).toEqual([]);
    expect(bad('gambler', '4.u2', [{ k: 'skill', sel: 'bet', f: 'hpStake', op: 'set', v: 0 }]).length).toBeGreaterThan(0);
    expect(bad('gambler', '3.v', [{ k: 'hook', h: 'trigger', on: 'skillUse', do: [{ strike: 0.6, to: 'castTargets', rollStatus: 1 }] }]).length).toBeGreaterThan(0);
    expect(bad('hexer', '3.v', [{ k: 'hook', h: 'rule', rule: 'turnedHand', add: 0.1 }]).length).toBeGreaterThan(0);
  });
});

describe('Faz 5c: Paladin 2.n0 Soul Exchange', () => {
  const setup = (tree: boolean, edit?: (t: TreeData) => void) => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, tree ? withTree(0, only('paladin', { '2.n0': 1 }, edit)) : {});
    const me = P(b);
    const ally = P(b, 1);
    ally.hp = 0;
    return { b, me, ally };
  };
  it('etiket ve bedel: "16 MP or 25% of current HP"; MP yetiyorsa MP, yetmiyorsa mevcut canın %25\'i', () => {
    const { b, me } = setup(true);
    const sk = b.skill('resurrection', me.uid)!;
    expect(sk.cost.hpFallback).toBe(0.25);
    expect(skillCostLabel(sk.cost)).toBe('16 MP or 25% of current HP');
    expect(skillCostLabel(content.skills.resurrection!.cost)).toBe('16 MP');
    me.mp = 16;
    expect(skillCostPay(sk.cost, me)).toEqual({ resource: 'mp', amount: 16 });
    me.mp = 15;
    expect(skillCostPay(sk.cost, me)).toEqual({ resource: 'hp', amount: Math.round(me.hp * 0.25), fallback: true });
    expect(skillCostPay(sk.cost, me, undefined, true)).toEqual({ resource: 'mp', amount: 16 }); // Unlimited MP debug'ı
  });
  it('ağaçsız: MP yetmezse kullanılamaz; ağaçlı: candan öder, MP aynen kalır, dost dirilir', () => {
    const plain = setup(false);
    plain.me.mp = 3;
    expect(plain.b.canUse(plain.me.uid, 'resurrection')).toEqual({ ok: false, reason: 'Not enough MP' });

    const { b, me, ally } = setup(true);
    me.mp = 3;
    const hp0 = me.hp;
    expect(b.canUse(me.uid, 'resurrection').ok).toBe(true);
    const evs = use(b, me, 'resurrection', ally);
    const pay = Math.round(hp0 * 0.25);
    expect(me.mp).toBe(3);
    expect(me.hp).toBe(hp0 - pay);
    expect(evs.some((e) => e.type === 'resource' && e.actor === me.uid && e.resource === 'hp' && e.amount === pay)).toBe(true);
    expect(evs.some((e) => e.type === 'resource' && e.actor === me.uid && e.resource === 'mp')).toBe(false);
    expect(ally.hp).toBeGreaterThan(0);
  });
  it('MP yetiyorsa MP öder (can aynen); can 1 iken yedek bedel ödenemez', () => {
    const { b, me, ally } = setup(true);
    me.mp = me.maxMp;
    const hp0 = me.hp;
    use(b, me, 'resurrection', ally);
    expect(me.hp).toBe(hp0);
    expect(me.mp).toBe(me.maxMp - 16);
    const r = setup(true);
    r.me.mp = 0;
    r.me.hp = 1;
    expect(r.b.canUse(r.me.uid, 'resurrection')).toEqual({ ok: false, reason: 'Not enough MP' });
  });
  it('payHp tetiği ve hpPaid: yedek can ödemesi can bedeli gibi sayılır', () => {
    const { b, me, ally } = setup(true, (t) => {
      t.nodes['2.n0']!.fx = [
        { k: 'skill', sel: 'self', f: 'cost.hpFallback', op: 'set', v: 0.25 },
        { k: 'hook', h: 'trigger', on: 'payHp', do: [{ status: 'blessed', turns: 2, to: 'self' }] },
      ] as TreeData['nodes'][string]['fx'];
    });
    me.mp = 0;
    use(b, me, 'resurrection', ally);
    expect(me.statuses.some((s) => s.kind === 'blessed')).toBe(true);
    expect(procs(b, 'paladin:2.n0')).toBe(1);
  });
  it('yapay zeka: MP yokken ölü dost için Resurrection seçebilir ve kullanım geçerli', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('paladin', { '2.n0': 1 })), 11, 'turns');
    const me = P(b);
    for (let i = 0; i < 30 && b.currentActor !== me; i++) b.skipTurn();
    expect(b.currentActor).toBe(me);
    P(b, 1).hp = 0;
    me.mp = 0;
    me.cooldowns.resurrection = 0;
    const act = chooseAction(b, me.uid, content.aiConfig);
    expect(act?.skillId).toBe('resurrection');
    const hp0 = me.hp;
    expect(b.useSkill(me.uid, act!.skillId, act!.targetUid, act!.slot).ok).toBe(true);
    expect(me.hp).toBe(hp0 - Math.round(hp0 * 0.25));
  });
});

describe('Faz 5c: Gambler 3.v Returning Cards', () => {
  it('her kart %60 güçle ikinci kez vurur; isabet eden dönüş durum zarını yeniden atar', () => {
    let checked = 0;
    for (let seed = 1; seed < 60 && checked < 3; seed++) {
      const b = make({ 0: 'gambler' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('gambler', { '3.v': 1 })), seed);
      const me = P(b);
      me.mp = me.maxMp;
      for (const e of [E(b, 0), E(b, 1)]) e.hp = e.maxHp = 9999;
      const evs = use(b, me, 'card_trick');
      const hits = evs.filter((e) => e.type === 'damage' && e.source === me.uid && e.target !== me.uid);
      const misses = evs.filter((e) => (e.type === 'miss' || e.type === 'dodge') && 'source' in e && e.source === me.uid);
      if (misses.length || hits.length !== 4) continue;
      checked++;
      // her hedefe 2 vuruş (kart + dönüş), dönüş daha zayıf
      for (const t of [E(b, 0), E(b, 1)]) {
        const ds = hits.filter((e) => e.type === 'damage' && e.target === t.uid).map((e) => (e.type === 'damage' ? e.amount + e.absorbed : 0));
        expect(ds.length).toBe(2);
      }
      // iki kart + iki dönüş = 4 durum zarı (aynı durum yenilense de olay çıkar)
      const sts = evs.filter((e) => e.type === 'status' && e.source === me.uid && ['slow', 'wound', 'stun'].includes(e.status));
      expect(sts.length).toBe(4);
      expect(procs(b, 'gambler:3.v')).toBe(1);
    }
    expect(checked).toBeGreaterThan(0);
  });
  it('ağaçsız Card Trick: tek vuruş, tek zar', () => {
    for (let seed = 1; seed < 30; seed++) {
      const b = make({ 0: 'gambler' }, { 0: 'warrior', 1: 'warrior' }, {}, seed);
      const me = P(b);
      me.mp = me.maxMp;
      const evs = use(b, me, 'card_trick');
      const per = new Map<string, number>();
      for (const e of evs) if (e.type === 'damage' && e.source === me.uid) per.set(e.target, (per.get(e.target) ?? 0) + 1);
      for (const n of per.values()) expect(n).toBe(1);
    }
  });
});

describe('Faz 5c: Gambler 4.u2 Mortgage', () => {
  it('betStakeParts: ek can bahsi kazançta MP sayılır, canı en az 1 bırakır; hpStake yoksa eskisi', () => {
    const bet = { resource: 'mp' as const, ratio: 1, winChance: 0.75, winMult: 1.8, loseMult: 0.6, perStake: 0.0667 };
    expect(betStakeParts(bet, 200, 150, 20)).toEqual({ main: 20, hp: 0 });
    expect(betStakeParts({ ...bet, hpStake: 0.1 }, 200, 150, 20)).toEqual({ main: 20, hp: 20 });
    expect(betStakeParts({ ...bet, hpStake: 0.1 }, 200, 5, 20)).toEqual({ main: 20, hp: 4 });
  });
  it('kayıpta MP bahsi MP\'den, can bahsi candan düşer; kazançta hiçbiri düşmez; önizleme kazancı büyür', () => {
    let lost = false;
    let won = false;
    for (let seed = 1; seed < 80 && !(lost && won); seed++) {
      const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '4.u2': 1 })), seed);
      const me = P(b);
      expect(b.skill('all_in', me.uid)!.effects.find((e) => e.type === 'damage' && e.bet)).toMatchObject({ bet: { hpStake: 0.1 } });
      me.mp = me.maxMp;
      const hp0 = me.hp;
      const evs = use(b, me, 'all_in', E(b));
      const mpLeft = me.maxMp - 8;
      const bust = evs.some((e) => e.type === 'passive' && e.passive === 'gamble_lose');
      if (bust) {
        lost = true;
        expect(me.mp).toBe(0);
        expect(hp0 - me.hp).toBe(Math.min(hp0 - 1, Math.round(me.maxHp * 0.1)));
      } else {
        won = true;
        expect(me.hp).toBe(hp0);
        expect(me.mp).toBe(mpLeft);
      }
    }
    expect(lost && won).toBe(true);
    const plain = make({ 0: 'gambler' }, { 0: 'warrior' });
    const tree = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '4.u2': 1 })));
    for (const b of [plain, tree]) P(b).mp = P(b).maxMp;
    const hi = (b: Battle): number => previewSkill(b, P(b).uid, 'all_in', E(b).uid).find((p) => p.uid === E(b).uid)!.damage!.max;
    expect(hi(tree)).toBeGreaterThan(hi(plain));
  });
});

describe('Faz 5c: Hexer 3.v Turned Hand', () => {
  const setup = (tree: boolean, enemies: Record<number, string> = { 0: 'mage', 1: 'warrior' }) => {
    const b = make({ 0: 'hexer' }, enemies, tree ? withTree(0, only('hexer', { '3.v': 1 })) : {});
    const me = P(b);
    const foe = E(b);
    debuff(b, foe, 'jinxed', 2, me);
    return { b, me, foe };
  };
  it('Jinxed düşmanın saldırısı YZ\'nin seçtiği hedef yerine kendi dostuna iner; Jinxed düşer', () => {
    const { b, me, foe } = setup(true);
    const mate = E(b, 1);
    const hp0 = me.hp;
    const evs = use(b, foe, 'fire_bolt', me);
    const used = evs.find((e) => e.type === 'skillUsed');
    expect(used && used.type === 'skillUsed' ? used.targets : []).toEqual([mate.uid]);
    expect(me.hp).toBe(hp0);
    expect(evs.some((e) => (e.type === 'damage' && e.target === mate.uid) || ((e.type === 'miss' || e.type === 'dodge') && e.target === mate.uid))).toBe(true);
    expect(foe.statuses.some((s) => s.kind === 'jinxed')).toBe(false);
    expect(procs(b, 'hexer:3.v')).toBe(1);
    // sıradaki saldırı artık normal
    const next = use(b, foe, 'fire_bolt', me);
    const u2 = next.find((e) => e.type === 'skillUsed');
    expect(u2 && u2.type === 'skillUsed' ? u2.targets : []).toEqual([me.uid]);
  });
  it('ağaçsız ya da dostu yokken saldırı normal', () => {
    const plain = setup(false);
    const e1 = use(plain.b, plain.foe, 'fire_bolt', plain.me).find((e) => e.type === 'skillUsed');
    expect(e1 && e1.type === 'skillUsed' ? e1.targets : []).toEqual([plain.me.uid]);
    const alone = setup(true, { 0: 'mage' });
    const e2 = use(alone.b, alone.foe, 'fire_bolt', alone.me).find((e) => e.type === 'skillUsed');
    expect(e2 && e2.type === 'skillUsed' ? e2.targets : []).toEqual([alone.me.uid]);
    expect(procs(alone.b, 'hexer:3.v')).toBe(0);
  });
  it('başkasının verdiği Jinxed çevirmez', () => {
    const b = make({ 0: 'hexer', 1: 'warrior' }, { 0: 'mage', 1: 'warrior' }, withTree(0, only('hexer', { '3.v': 1 })));
    const foe = E(b);
    debuff(b, foe, 'jinxed', 2, P(b, 1));
    const ev = use(b, foe, 'fire_bolt', P(b)).find((e) => e.type === 'skillUsed');
    expect(ev && ev.type === 'skillUsed' ? ev.targets : []).toEqual([P(b).uid]);
  });
});
