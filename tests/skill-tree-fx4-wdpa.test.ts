import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, skillTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 4b parça 1/3 (content-designer): Warrior, Defender, Paladin, Archer C3 tetik + C4 şifa / kalkan fx'leri.
// Her test YALNIZCA verilen düğümlerin fx'iyle derler; beklenen sayılar düğüm metninden birebir.

const MINE = ['warrior', 'defender', 'paladin', 'archer'];
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
function seeds(what: string, fn: (seed: number) => boolean, n = 80): void {
  for (let s = 1; s <= n; s++) if (fn(s)) return;
  throw new Error(`${what}: hiçbir seed'de olmadı`);
}
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Combatant['statuses'][number], emit: (e: BattleEvent) => void, cause?: string): void;
  hpCrossTrig(t: Combatant, hp0: number, a: Combatant, emit: (e: BattleEvent) => void): void;
  effectiveStats(c: Combatant): { armor: number };
}
const X = (b: Battle): Priv => b as unknown as Priv;
const emitOf = (b: Battle) => (e: BattleEvent) => X(b).record(e);
function untilTurn(b: Battle, c: Combatant, max = 30): BattleEvent[] {
  const from = b.log.length;
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
  return b.log.slice(from);
}

describe('Faz 4b (W/D/P/A): veri', () => {
  it('4 ağacın tüm fx\'leri temiz derlenir', () => {
    for (const c of MINE) expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
  });

  it('tüm satır yönü (a / b) x ult kolu birleşimleri derlenir ve savaş kurulur', () => {
    const { list } = skillTree.treeNodes();
    const rows = Math.max(...list.map((n) => n.row));
    for (const cls of MINE) {
      const t = treeOf(cls)!;
      for (let mask = 0; mask < 1 << rows; mask++)
        for (const arm of ['u', 'r', 'd', 'l']) {
          const r: Record<string, number> = {};
          for (const n of list) {
            if (n.row === rows) {
              if (n.id.startsWith(arm)) r[n.key] = n.max;
              continue;
            }
            const dir = (mask >> n.row) & 1 ? 'b' : 'a';
            if (!n.dir || n.dir === dir) r[n.key] = n.max;
          }
          const tree = compileTree(t, { v: t.version, r });
          expect(tree, `${cls} ${mask} ${arm}`).toBeDefined();
          if (mask === 0 || mask === (1 << rows) - 1) make({ 0: cls, 1: 'warrior' }, { 0: 'mage' }, withTree(0, tree));
        }
    }
  });

  it('katalogda C3 / C4 olup fx\'i yazılamayanlar null kalır (Faz 4a listesi + sözlük dışı)', () => {
    // Faz 4c: Herald of Ruin, Fortress Aura, Bedside Watch, Iron Return, Undying Flame, Wildfire Verdict, Day of Judgment, Exposed Perch, Range Keeper yazıldı
    // Faz 5b: Chain of Light ve Hammerfall Quake yazıldı. Faz 5c: Soul Exchange yazıldı (yedek can bedeli cost.hpFallback); bu listede null kalan yok
    expect(treeOf('paladin')!.nodes['2.n0']!.fx).toEqual([{ k: 'skill', sel: 'self', f: 'cost.hpFallback', op: 'set', v: 0.25 }]);
  });
});

describe('Faz 4b: Defender', () => {
  it('Iron Morning: ilk turunda görünen zırhın %50\'si kalkan, ikinci turda yok', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', {}, 0)), 3, 'turns');
    const me = P(b);
    untilTurn(b, me);
    expect(procs(b, 'defender:bar[0]')).toBe(1);
    expect(me.shield).toBe(Math.round(X(b).effectiveStats(me).armor * num('defender', 'bar0', '0.do.0.shield')));
    b.skipTurn();
    untilTurn(b, me);
    expect(procs(b, 'defender:bar[0]')).toBe(1);
  });

  it('Fault Line: senin Stun\'ın bitince düşman 1 tur Slowed; başkasının Stun\'ı sayılmaz', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('defender', {}, 3)), 3, 'turns');
    X(b).addStatus(E(b), { kind: 'stun', turns: 1, source: P(b).uid }, emitOf(b));
    X(b).addStatus(E(b, 1), { kind: 'stun', turns: 1, source: P(b, 1).uid }, emitOf(b));
    const from = b.log.length;
    for (let i = 0; i < 30 && (has(E(b), 'stun') || has(E(b, 1), 'stun')); i++) b.skipTurn();
    const evs = b.log.slice(from);
    const slowed = evs.filter((e) => e.type === 'status' && e.status === 'slow' && e.cause === 'defender:bar[3]');
    expect(slowed.length).toBe(1);
    expect(slowed[0]!.type === 'status' && slowed[0]!.target).toBe(E(b).uid);
    expect(slowed[0]!.type === 'status' && slowed[0]!.turns).toBe(1);
  });

  it('Shield Brothers: savaş başında auradaki dostlara Defender\'ın maks canının %10\'u kalkan', () => {
    const tree = only('defender', { '0.n0': 1 });
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }, withTree(0, tree));
    expect(P(b, 1).shield).toBe(Math.round(P(b).maxHp * num('defender', '0.n0', '0.do.0.shield')));
    expect(procs(b, 'defender:0.n0')).toBe(1);
    expect(make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }).combatants.find((c) => c.side === 'party' && c.slot === 1)!.shield).toBe(0);
  });

  it('Living Rampart: auradaki dost %30 altına inince 1 tur Fortified (dost başına bir kez)', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('defender', { '0.mb': 1 })));
    const ally = P(b, 1);
    ally.hp = Math.floor(ally.maxHp * 0.25);
    X(b).hpCrossTrig(ally, Math.floor(ally.maxHp * 0.5), E(b), emitOf(b));
    expect(ally.statuses.find((s) => s.kind === 'fortify')?.turns).toBe(1);
    ally.statuses = [];
    ally.hp = Math.floor(ally.maxHp * 0.25);
    X(b).hpCrossTrig(ally, Math.floor(ally.maxHp * 0.5), E(b), emitOf(b));
    expect(has(ally, 'fortify')).toBe(false);
  });

  it('Third Quake + Fault Strike: her 3. Tremor Slam ilk hedefi 1 tur Stun\'lar; o Stun rank başına 2 MP verir', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage', 1: 'mage', 2: 'mage' }, withTree(0, only('defender', { '1.ma': 1, '1.r': 2 })), 5);
    for (const e of b.combatants) if (e.side === 'enemy') e.hp = e.maxHp = 99999;
    const me = P(b);
    const stuns = (evs: BattleEvent[]) => evs.filter((e) => e.type === 'status' && e.status === 'stun' && e.cause === 'defender:1.ma');
    expect(stuns(cast(b, me, 'tremor_slam', E(b))).length).toBe(0);
    expect(stuns(cast(b, me, 'tremor_slam', E(b))).length).toBe(0);
    me.cooldowns.tremor_slam = 0;
    me.mp = 0;
    const from = b.log.length;
    expect(b.useSkill(me.uid, 'tremor_slam', E(b).uid).ok).toBe(true);
    const evs = b.log.slice(from);
    expect(stuns(evs).length).toBe(1);
    expect(procs(b, 'defender:1.ma')).toBe(1);
    const mp = evs.filter((e) => e.type === 'mpRegen' && e.cause === 'defender:1.r');
    expect(mp.length).toBeGreaterThanOrEqual(1);
    expect(mp[0]!.type === 'mpRegen' && mp[0]!.amount).toBe(Math.min(4, me.maxMp));
  });

  it('Bastion Cry (Faz 4c): Taunt gelince gerçek Fortified durumu (süresiz, kaynağı düğüm); alınan hasar durumdan -%50', () => {
    const b = make({ 0: 'defender' }, { 0: 'warrior' }, withTree(0, only('defender', { '2.v': 1 })));
    const me = P(b);
    expect(b.damageTakenMult(me)).toBe(1);
    cast(b, me, 'taunt');
    expect(has(me, 'taunt')).toBe(true);
    expect(me.statuses.find((s) => s.kind === 'fortify')).toMatchObject({ permanent: true, cause: 'defender:2.v' });
    expect(b.damageTakenMult(me)).toBeCloseTo(0.5, 9);
    expect(b.treeTakenMult(me, E(b))).toBe(1);
  });

  it('Shield Chain + Shield Toss + Linked Shields: Close Ranks korunan her dosta zırh oranlı kalkan, korunan dost başına sana kalkan', () => {
    const b = make({ 0: 'defender', 1: 'warrior', 2: 'mage' }, { 0: 'mage' }, withTree(0, only('defender', { '3.f2': 5, '3.eb': 1, '3.r': 3 })));
    const me = P(b);
    const allies = [P(b, 1), P(b, 2)];
    const sh0 = allies.map((a) => a.shield);
    const me0 = me.shield;
    cast(b, me, 'close_ranks', allies[0]);
    const guarded = allies.filter((a) => a.statuses.some((s) => s.kind === 'guard' && s.source === me.uid));
    expect(guarded.length).toBeGreaterThan(0);
    const A = X(b).effectiveStats(me).armor;
    allies.forEach((a, i) => {
      const want = guarded.includes(a) ? Math.round(A * 5 * num('defender', '3.f2', '0.do.0.shield')) + Math.round(A * num('defender', '3.eb', '0.do.0.shield')) : 0;
      expect(a.shield - sh0[i]!, a.uid).toBe(want);
    });
    expect(me.shield - me0).toBe(guarded.length * Math.round(A * 3 * num('defender', '3.r', '0.do.0.shield')));
  });
});

describe('Faz 4b: Paladin', () => {
  it('Life for Life + Shielded Return + Risen in Glory + Heavy Absolution: dirilen kalkan, Blessed ve +%30 ilk skill alır; bedel senin canından', () => {
    const run = (ranks?: Record<string, number>) => {
      const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, ranks ? withTree(0, only('paladin', ranks)) : {});
      seeds('dost düştü', () => {
        P(b, 1).hp = 1;
        cast(b, E(b), 'fire_bolt', P(b, 1));
        return P(b, 1).hp <= 0;
      }, 20);
      const me = P(b);
      const hp0 = me.hp;
      cast(b, me, 'resurrection', P(b, 1));
      return { b, me, ally: P(b, 1), lost: hp0 - me.hp };
    };
    const plain = run();
    const r = run({ '2.f1': 3, '2.f2': 5, '2.ma': 1, '2.fa': 1 });
    const m = r.ally.maxHp;
    expect(plain.lost).toBe(0);
    expect(r.ally.hp - plain.ally.hp).toBeGreaterThan(0);
    expect(r.lost).toBe(Math.round(m * 0.12));
    expect(r.ally.shield - plain.ally.shield).toBe(Math.round(m * 5 * num('paladin', '2.f2', '0.do.0.shield')) + Math.round(m * num('paladin', '2.fa', '0.do.0.shield')));
    expect(r.ally.statuses.find((s) => s.kind === 'blessed')?.turns).toBe(2);
    expect(r.ally.treeBuffs?.find((x) => x.node === 'paladin:2.ma')).toMatchObject({ mod: { powerMul: num('paladin', '2.ma', '0.do.1.buff.powerMul') }, uses: 1 });
    expect(r.b.skill('resurrection', r.me.uid)?.cooldown).toBe(7);
    for (const n of ['2.f1', '2.f2', '2.ma', '2.fa']) expect(procs(r.b, `paladin:${n}`), n).toBe(1);
  });

  it('Hallowed Steps: Radiance sonrası Judgment cooldown\'u sıfırlanır', () => {
    const b = make({ 0: 'paladin' }, { 0: 'mage' }, withTree(0, only('paladin', { '4.l1': 1 })));
    E(b).hp = E(b).maxHp = 99999;
    const me = P(b);
    cast(b, me, 'radiance');
    me.cooldowns.judgment = 3;
    cast(b, me, 'radiance');
    expect(me.cooldowns.judgment).toBeUndefined();
    expect(procs(b, 'paladin:4.l1')).toBe(2);
  });

  it('Sunstrike: Radiance öldürürse cooldown\'u 2 düşer (iki öldürmede de bir kez; turns modu)', () => {
    const run = (tree?: UnitSetup['tree']) => {
      let out: number | undefined = -1;
      seeds('Radiance kill', (s) => {
        const b = make({ 0: 'paladin' }, { 0: 'mage', 1: 'mage' }, tree ? withTree(0, tree) : {}, s, 'turns');
        const me = P(b);
        untilTurn(b, me);
        E(b).hp = 1;
        E(b, 1).hp = 1;
        me.mp = me.maxMp;
        me.cooldowns = {};
        expect(b.useSkill(me.uid, 'radiance').ok).toBe(true);
        if (E(b).hp > 0 || E(b, 1).hp > 0) return false;
        out = me.cooldowns.radiance ?? 0;
        return true;
      });
      return out;
    };
    const base = run();
    expect(base).toBeGreaterThan(2);
    expect(run(only('paladin', { '4.r3': 1 }))).toBe(base - 2);
  });

  it('Crusader\'s Oath: savaşta bir kez %30 altına inince sonraki skill kesin kritik', () => {
    const b = make({ 0: 'paladin' }, { 0: 'mage' }, withTree(0, only('paladin', {}, 4)));
    const me = P(b);
    me.hp = Math.floor(me.maxHp * 0.25);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.5), E(b), emitOf(b));
    expect(me.treeBuffs?.find((x) => x.node === 'paladin:bar[4]')).toMatchObject({ mod: { guaranteedCrit: true }, uses: 1 });
    me.treeBuffs = [];
    me.hp = Math.floor(me.maxHp * 0.25);
    X(b).hpCrossTrig(me, Math.floor(me.maxHp * 0.5), E(b), emitOf(b));
    expect(me.treeBuffs ?? []).toEqual([]);
  });

  it('Anointed Arms + Kindled Resolve: Divine Light\'ın iyileştirdiği dostun sonraki skill\'i +%15 ve rank başına +%2', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('paladin', { '0.eb': 1, '0.f2': 3 })), 3, 'turns');
    const me = P(b);
    const ally = P(b, 1);
    if (b.currentActor === me) b.skipTurn();
    ally.hp = Math.floor(ally.maxHp / 2);
    untilTurn(b, me);
    expect(ally.treeBuffs?.find((x) => x.node === 'paladin:0.eb')?.mod?.powerMul).toBeCloseTo(0.15, 9);
    const kr = ally.treeBuffs?.find((x) => x.node === 'paladin:0.f2');
    expect((kr?.mod?.powerMul ?? 0) * (kr?.s ?? 0)).toBeCloseTo(3 * num('paladin', '0.f2', '0.do.0.buff.powerMul'), 9);
  });

  it('Kindled Path: holy fire içinde ölen düşman Judgment cooldown\'unu 1 düşürür', () => {
    seeds('holy fire kill', (s) => {
      const b = make({ 0: 'paladin' }, { 0: 'warrior' }, withTree(0, only('paladin', {}, 3)), s);
      const me = P(b);
      cast(b, me, 'judgment', E(b));
      if (!b.ground.some((g) => g.ground === 'holy_fire')) return false;
      me.cooldowns.judgment = 3;
      E(b).hp = 1;
      me.cooldowns.holy_strike = 0;
      me.mp = me.maxMp;
      b.useSkill(me.uid, 'holy_strike', E(b).uid);
      if (E(b).hp > 0) return false;
      expect(me.cooldowns.judgment).toBe(2);
      expect(procs(b, 'paladin:bar[3]')).toBe(1);
      return true;
    });
  });
});

describe('Faz 4b: Archer', () => {
  it('Held Breath: Skip Turn sonraki skill\'i kesin kritik + zırhın %30\'unu yok sayar yapar', () => {
    const b = make({ 0: 'archer' }, { 0: 'warrior' }, withTree(0, only('archer', { '0.ma': 1 })), 3, 'turns');
    const me = P(b);
    untilTurn(b, me);
    expect(b.useGlobal(me.uid, 'skip_turn').ok).toBe(true);
    expect(procs(b, 'archer:0.ma')).toBe(1);
    expect(me.treeBuffs?.find((x) => x.node === 'archer:0.ma')).toMatchObject({ mod: { guaranteedCrit: true, ignoreDefense: num('archer', '0.ma', '0.do.0.buff.ignoreDefense') }, uses: 1 });
    expect(me.treeBuffs?.[0]?.pending).toBeUndefined();
  });

  it('Blood Rush: Aimed Shot öldürürse 2 tur Haste; ağaçsız olmaz', () => {
    seeds('Aimed kill', (s) => {
      const b = make({ 0: 'archer' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('archer', { '4.r2': 1 })), s);
      E(b).hp = 1;
      cast(b, P(b), 'aimed_shot', E(b));
      if (E(b).hp > 0) return false;
      expect(P(b).statuses.find((x) => x.kind === 'haste')?.turns).toBe(2);
      expect(procs(b, 'archer:4.r2')).toBe(1);
      return true;
    });
    seeds('Aimed kill (ağaçsız)', (s) => {
      const b = make({ 0: 'archer' }, { 0: 'mage', 1: 'mage' }, {}, s);
      E(b).hp = 1;
      cast(b, P(b), 'aimed_shot', E(b));
      if (E(b).hp > 0) return false;
      expect(has(P(b), 'haste')).toBe(false);
      return true;
    });
  });
});
