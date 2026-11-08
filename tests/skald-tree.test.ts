import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef, SkillDef } from '../src/engine';
import { skillCostAmount } from '../src/engine/cost';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree } from '../src/progression/skill-tree-compile';
import { treeOf, validateTreeData } from '../src/progression/skill-tree-data';

// Thunder Skald ağacı v1 (2026-11-08, docs/design/classes/skald.md bölüm 3): her düğüm bir Skald skill'inin oynanışını değiştirir, koşulu / bedeli var.
// Sayılar veriden okunur (balance agent'ı skill sayılarını değiştirebilir: taban değerler content.skills'ten).

const TREE = treeOf('skald')!;
const S = content.skills;
const PE = content.classes.skald!.passive!.effect as Extract<NonNullable<CombatantDef['passive']>['effect'], { type: 'conductor' }>;
type Fx = { k: string; h?: string; f?: string; v?: number; mod?: Record<string, unknown>; mul?: number; do?: Array<Record<string, unknown>> };
const fxOf = (key: string) => TREE.nodes[key]!.fx as unknown as Fx[];
const doOf = (key: string, i = 0) => fxOf(key).find((f) => f.h === 'trigger')!.do![i] as Record<string, number>;
const setupFor = (r: Record<string, number>) => compileTree(TREE, { v: TREE.version, r })!;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');

/** Skald ön sırada (hücre 4), ağaç dağılımı `r`; düşman / dost hücre -> sınıf. */
function treed(r: Record<string, number>, enemies: Record<number, string> = { 1: 'warrior' }, allies: Record<number, string> = {}, mode: 'test' | 'turns' = 'test'): Battle {
  const tree = setupFor(r);
  const setup = content.battleSetup('random-battle', 3, mode, { party: cells({ 4: 'skald', ...allies }), enemies: cells(enemies), units: { party: { 4: { tree } }, enemies: {} } }, false);
  const b = new Battle({ ...setup, formulas: { ...setup.formulas, damage: { ...setup.formulas.damage, variance: 0, elementVariance: {} } } });
  b.debug.crit = 'never';
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0, blockChance: 0 });
    c.hp = c.maxHp = 50000;
    c.mp = c.maxMp;
  }
  return b;
}
const skald = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === 'skald')!;
const foeAt = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
function cast(b: Battle, skill: string, target?: string, keepCd = false): BattleEvent[] {
  const me = skald(b);
  me.cooldowns[skill] = 0;
  me.mp = me.maxMp;
  const r = b.useSkill(me.uid, skill, target);
  if (!r.ok) throw new Error(`${skill}: ${r.reason}`);
  if (!keepCd) b.debugClearCooldowns();
  return r.events;
}
const dealt = (ev: BattleEvent[], uid: string) => ofType(ev, 'damage').filter((e) => e.target === uid).reduce((s, e) => s + e.amount + e.absorbed, 0);
type Priv = { speedBoostOf: (u: string) => number; delayedFree: Array<{ skill: string; power: number }>; rng: { next: () => number } };
const priv = (b: Battle) => b as unknown as Priv;
/** Şans zarlarını hep tutturur (isabet 10, kritik kapalı, zar sapması yok: yalnız durum şansları etkilenir). */
const lucky = (b: Battle) => (priv(b).rng.next = () => 0);
const statusEff = (def: SkillDef, status: string) => def.effects.find((e) => e.type === 'status' && e.status === status) as { turns: number; self?: boolean } | undefined;
const skaldTurn = (b: Battle) => {
  for (let i = 0; i < 300 && b.currentUid !== skald(b).uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(skald(b).uid);
  b.debugClearCooldowns();
};

describe('Skald ağacı: veri', () => {
  it('geçerli, 60 düğüm + 5 bar, hepsinin fx\'i var, fx denetimi temiz, oyuna kayıtlı', () => {
    expect(validateTreeData(TREE)).toEqual([]);
    expect(Object.keys(TREE.nodes).length).toBe(60);
    expect(Object.entries(TREE.nodes).filter(([, n]) => !n.fx).map(([k]) => k)).toEqual([]);
    expect(TREE.mastery.bar.length).toBe(5);
    expect(TREE.mastery.bar.filter((x) => !x.fx).map((x) => x.name)).toEqual([]);
    expect(checkTreeFx(TREE)).toEqual([]);
  });
  it('genel "+%X hasar" düğümü yok: her güç ekinin koşulu ya da ölçeği var', () => {
    const plain: string[] = [];
    for (const [k, nd] of [...Object.entries(TREE.nodes), ...TREE.mastery.bar.map((x) => [x.name, x] as const)]) {
      for (const f of (nd.fx ?? []) as unknown as Array<Fx & { when?: unknown; scale?: unknown }>) if (f.h === 'cond' && f.mod?.powerMul !== undefined && !f.when && !f.scale) plain.push(String(k));
    }
    expect(plain).toEqual([]);
  });
  it('Conductor bonusu: Copper Coil rank başı, Overdrive düşürür (Rolling Thunder yerine), Living Storm artırır', () => {
    const bonus = (r: Record<string, number>) => (setupFor(r).passive!.effect as typeof PE).bonus;
    expect(bonus({ '0.f1': 3 })).toBeCloseTo(PE.bonus + 0.03 * 3, 6);
    expect(bonus({ '0.ea': 1, '0.fa': 1 })).toBeCloseTo(PE.bonus - 0.1, 6);
    expect(setupFor({ '0.ea': 1, '0.fa': 1 }).hooks!.some((h) => h.node === 'skald:0.ea')).toBe(false);
    expect(bonus({ '0.v': 1 })).toBeCloseTo(PE.bonus + 0.1, 6);
  });
  it('skill yamaları: Hammerfall, Heavy Throw, Iron Sky, Wild Dance, Long Arc, Storm March, Saga of Storms, Returning Hammer', () => {
    const sk = (r: Record<string, number>, id: string) => setupFor(r).skills![id]!;
    const dmg = (d: SkillDef) => d.effects.find((e) => e.type === 'damage') as DamageEffect;
    expect(sk({ '0.eb': 1, '0.fb': 1 }, 'thunder_strike').cost.amount).toBe(S.thunder_strike!.cost.amount + 4);
    expect(sk({ '1.ea': 1, '1.fa': 1 }, 'hammer_spark').cost.amount).toBe(S.hammer_spark!.cost.amount + 4);
    const iron = sk({ '2.ea': 1, '2.fa': 1 }, 'thunder_strike');
    expect(statusEff(iron, 'slow')!.turns).toBe(2);
    expect(iron.cooldown).toBe((S.thunder_strike!.cooldown ?? 0) + 1);
    const wild = sk({ '3.ea': 1, '3.fa': 1 }, 'war_drum');
    expect(statusEff(wild, 'fleet')!.turns).toBe(4);
    expect(wild.cost.amount).toBe(S.war_drum!.cost.amount + 6);
    expect(dmg(sk({ '4.u1': 1 }, 'stormcall')).falloff).toBeCloseTo((dmg(S.stormcall!).falloff ?? 0) + 0.1, 6);
    expect(sk({ '4.r1': 1 }, 'stormcall').initialCooldown).toBe((S.stormcall!.initialCooldown ?? 0) - 1);
    expect(statusEff(sk({ '3.v': 1 }, 'war_drum'), 'haste')!.turns).toBe(statusEff(S.war_drum!, 'haste')!.turns + 1);
    expect(dmg(sk({ '1.v': 1 }, 'hammer_spark')).power).toBeCloseTo(dmg(S.hammer_spark!).power * 1.15, 6);
    expect(statusEff(sk({ '4.l1': 1 }, 'stormcall'), 'haste')).toMatchObject({ turns: 2, self: true });
    expect(statusEff(sk({ '4.d1': 1 }, 'stormcall'), 'slow')!.turns).toBe(1);
  });
});

describe('Skald ağacı: savaşta', () => {
  it('First Spark (0.n0): hedefe ilk vuruş 1 tur Slow, aynı hedefe ikinci vuruş vermez', () => {
    const b = treed({ '0.n0': 1 });
    const foe = foeAt(b, 1);
    cast(b, 'hammer_spark', foe.uid);
    expect(has(foe, 'slow')).toBe(true);
    foe.statuses = foe.statuses.filter((s) => s.kind !== 'slow');
    cast(b, 'hammer_spark', foe.uid);
    expect(has(foe, 'slow')).toBe(false);
    const none = treed({});
    cast(none, 'hammer_spark', foeAt(none, 1).uid);
    expect(has(foeAt(none, 1), 'slow')).toBe(false);
  });
  it('Hammer and Anvil (1.n0): her 3. Hammer Spark fazladan vuruş', () => {
    const b = treed({ '1.n0': 1 });
    const foe = foeAt(b, 1);
    const hits = [0, 1, 2].map(() => ofType(cast(b, 'hammer_spark', foe.uid), 'damage').filter((d) => d.target === foe.uid).length);
    expect(hits[2]!).toBeGreaterThan(hits[0]!);
    expect(hits[1]).toBe(hits[0]);
  });
  it('Through the Line (1.ea): Hammer Spark arkadaki düşmana da sıçrar; düğümsüz sıçramaz', () => {
    const run = (r: Record<string, number>) => {
      const b = treed(r, { 1: 'warrior', 4: 'warrior' });
      return dealt(cast(b, 'hammer_spark', foeAt(b, 1).uid), foeAt(b, 4).uid);
    };
    expect(run({ '1.ea': 1 })).toBeGreaterThan(0);
    expect(run({})).toBe(0);
  });
  it('Thunderhead (2.ea): Thunder Strike 1 tur Slow verir', () => {
    const b = treed({ '2.ea': 1 });
    cast(b, 'thunder_strike', foeAt(b, 1).uid);
    expect(has(foeAt(b, 1), 'slow')).toBe(true);
  });
  it('Storm Lock (2.ma) Stun\'u -> Struck Senseless (0.mb): MP + Stormcall cooldown kısalır', () => {
    const b = treed({ '2.ma': 1, '0.mb': 1 });
    lucky(b);
    const me = skald(b);
    const foe = foeAt(b, 1);
    b.debugAddStatus(foe.uid, 'slow', 2);
    me.cooldowns.thunder_strike = 0;
    me.mp = skillCostAmount(b.skill('thunder_strike', me)!.cost, me); // bedel ödenince 0, sonra Struck Senseless MP'si
    me.cooldowns.stormcall = 3;
    const r = b.useSkill(me.uid, 'thunder_strike', foe.uid);
    expect(r.ok).toBe(true);
    expect(has(foe, 'stun')).toBe(true);
    expect(me.mp).toBe(doOf('0.mb', 0).mp);
    expect(me.cooldowns.stormcall).toBe(2);
  });
  it('Quick Thunder (2.eb): Hasted Skald\'ın Thunder Strike cooldown\'ı 1 kısa, Haste yokken aynı', () => {
    const cd = (hasted: boolean) => {
      const b = treed({ '2.eb': 1 }, { 1: 'warrior' }, {}, 'turns'); // cooldown yalnız turns modunda işler
      skaldTurn(b);
      if (hasted) b.debugAddStatus(skald(b).uid, 'haste', 2);
      expect(b.useSkill(skald(b).uid, 'thunder_strike', foeAt(b, 1).uid).ok).toBe(true);
      return skald(b).cooldowns.thunder_strike ?? 0;
    };
    expect(cd(false)).toBeGreaterThan(0);
    expect(cd(true)).toBe(cd(false) - 1);
  });
  it('Second Thunder (2.v): Thunder Strike sonraki tura bedava Thunder Strike bırakır', () => {
    const b = treed({ '2.v': 1 });
    cast(b, 'thunder_strike', foeAt(b, 1).uid);
    expect(priv(b).delayedFree.some((f) => f.skill === 'thunder_strike')).toBe(true);
  });
  it('Marching Beat (3.f2): War Drum Haste verdiği her dost için MP', () => {
    const b = treed({ '3.f2': 2 }, { 1: 'warrior' }, { 1: 'warrior' });
    const me = skald(b);
    me.cooldowns.war_drum = 0;
    me.mp = 0;
    const before = me.mp;
    b.freeMp = true;
    expect(b.useSkill(me.uid, 'war_drum').ok).toBe(true);
    expect(me.mp - before).toBe(1 * 2); // Skald sayılmaz: 1 dost (Warrior) x rank 2
  });
  it('Full Chorus (3.ma): War Drum 3+ birime Haste verince Thunder Strike cooldown sıfırlanır, 2 birimde değil', () => {
    const cd = (allies: Record<number, string>) => {
      const b = treed({ '3.ma': 1 }, { 1: 'warrior' }, allies);
      const me = skald(b);
      me.cooldowns.thunder_strike = 3;
      me.cooldowns.war_drum = 0;
      expect(b.useSkill(me.uid, 'war_drum').ok).toBe(true);
      return me.cooldowns.thunder_strike ?? 0;
    };
    expect(cd({ 1: 'warrior', 7: 'mage' })).toBe(0);
    expect(cd({ 1: 'warrior' })).toBe(3);
  });
  it('Dancing Steps (3.ea): War Drum Fleet de verir', () => {
    const b = treed({ '3.ea': 1 }, { 1: 'warrior' }, { 1: 'warrior' });
    cast(b, 'war_drum');
    for (const c of b.combatants.filter((x) => x.side === 'party')) expect(has(c, 'fleet'), c.defId).toBe(true);
  });
  it('Thunder Drum (3.fb): War Drum yalnız Skald\'a, Stormcall cooldown 2 kısalır (Storm Drum yerine)', () => {
    const b = treed({ '3.eb': 1, '3.fb': 1 }, { 1: 'warrior' }, { 1: 'warrior' });
    const me = skald(b);
    const ally = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
    me.cooldowns.stormcall = 4;
    me.cooldowns.war_drum = 0;
    expect(b.useSkill(me.uid, 'war_drum').ok).toBe(true);
    expect(has(me, 'haste')).toBe(true);
    expect(has(ally, 'haste')).toBe(false);
    expect(me.cooldowns.stormcall).toBe(2);
  });
  it('Storm Drum (3.eb): War Drum Stormcall cooldown\'ını 1 kısaltır', () => {
    const b = treed({ '3.eb': 1 });
    const me = skald(b);
    me.cooldowns.stormcall = 4;
    me.cooldowns.war_drum = 0;
    expect(b.useSkill(me.uid, 'war_drum').ok).toBe(true);
    expect(me.cooldowns.stormcall).toBe(3);
  });
  it('Call and Answer (3.n0): War Drum Haste verdiği dostların sıradaki turu erken (turns)', () => {
    const b = treed({ '3.n0': 1 }, { 1: 'warrior' }, { 1: 'warrior' }, 'turns');
    skaldTurn(b);
    expect(b.useSkill(skald(b).uid, 'war_drum').ok).toBe(true);
    // Skald da alanın içinde (hedef listesinde); dostun desteği onun turu başlayınca harcanır, Skald'ınki sıradaki turuna kadar durur
    expect(priv(b).speedBoostOf(skald(b).uid)).toBeCloseTo(doOf('3.n0').sooner!, 6);
    const none = treed({}, { 1: 'warrior' }, { 1: 'warrior' }, 'turns');
    skaldTurn(none);
    expect(none.useSkill(skald(none).uid, 'war_drum').ok).toBe(true);
    expect(priv(none).speedBoostOf(skald(none).uid)).toBe(0);
  });
  it('Battle Rhythm (3.f3): Skald\'ın Haste\'ini taşıyan dost daha az hasar alır', () => {
    const taken = (r: Record<string, number>) => {
      const b = treed(r, { 1: 'warrior' }, { 1: 'warrior' });
      cast(b, 'war_drum');
      const ally = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
      const foe = foeAt(b, 1);
      foe.cooldowns = {};
      const ev = b.useSkill(foe.uid, foe.skills[0]!, ally.uid);
      expect(ev.ok).toBe(true);
      return dealt(ev.ok ? ev.events : [], ally.uid);
    };
    expect(taken({ '3.f3': 5 })).toBeLessThan(taken({}));
  });
  it('Saga of Thunder (4.l1): Stormcall Skald\'a Haste; Rolling Drums (4.r3): War Drum cooldown sıfırlanır', () => {
    const b = treed({ '4.l1': 1 });
    cast(b, 'stormcall', foeAt(b, 1).uid);
    expect(has(skald(b), 'haste')).toBe(true);
    const d = treed({ '4.r3': 1 });
    const me = skald(d);
    me.cooldowns.war_drum = 3;
    me.cooldowns.stormcall = 0;
    expect(d.useSkill(me.uid, 'stormcall', foeAt(d, 1).uid).ok).toBe(true);
    expect(me.cooldowns.war_drum ?? 0).toBe(0);
  });
  it('Chorus (4.l2): Stormcall sonrası ilk War Drum bedava, öncesinde değil', () => {
    const b = treed({ '4.l2': 1 });
    const me = skald(b);
    const drum = b.skill('war_drum', me)!;
    expect(skillCostAmount(drum.cost, me)).toBe(S.war_drum!.cost.amount);
    cast(b, 'stormcall', foeAt(b, 1).uid);
    expect(skillCostAmount(b.skill('war_drum', me)!.cost, me)).toBe(0);
  });
  it('Iron Magnet (4.u2): zırhlı hedefe Stormcall daha sert, zırhsıza aynı', () => {
    const mult = (r: Record<string, number>, armor: number) => {
      const b = treed(r);
      const foe = foeAt(b, 1);
      foe.stats.armor = armor;
      const def = b.skill('stormcall', skald(b))!;
      return b.dealtDamageMult(skald(b), foe, def, def.effects.find((e) => e.type === 'damage') as DamageEffect);
    };
    expect(mult({ '4.u2': 1 }, 40)).toBeGreaterThan(mult({}, 40));
    expect(mult({ '4.u2': 1 }, 0)).toBeCloseTo(mult({}, 0), 9);
  });
  it('Living Storm (0.v): Slow\'lu düşmanı öldürünce başka düşmana Thunder Strike', () => {
    const b = treed({ '0.v': 1 }, { 1: 'warrior', 4: 'warrior' });
    const foe = foeAt(b, 1);
    const other = foeAt(b, 4);
    b.debugAddStatus(foe.uid, 'slow', 2);
    foe.hp = 1;
    const ev = cast(b, 'hammer_spark', foe.uid);
    expect(foe.hp).toBe(0);
    expect(dealt(ev, other.uid)).toBeGreaterThan(0);
  });
  it('Opening Verse (bar 5): savaşın ilk War Drum\'u bedava', () => {
    const at = TREE.mastery.bar.find((x) => x.name === 'Opening Verse')!.at;
    const b = treed({ '1.f1': Math.min(3, at), '1.f2': Math.max(0, at - 3) });
    const me = skald(b);
    expect(skillCostAmount(b.skill('war_drum', me)!.cost, me)).toBe(0);
  });
});
