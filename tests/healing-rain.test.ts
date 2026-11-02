/**
 * Druid Healing Rain (Ömer 2026-11-01; iç id rejuvenate): tek hücre, anlık şifa + 3 turluk şifa zemini (Hallowed). Zemin su sayılır: tepkimelerde ve söndürmede
 * Flooded gibi, ama Soaked vermez, yalnız dostu iyileştirir, Live Water / isWaterSkill onu su saymaz. Ağaç düğümleri ilk şifa / zemin ayrımıyla çalışır.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type GroundEffect, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import { buildMechanics } from '../src/wiki/catalog';

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, mode: BattleMode = 'turns'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  const b = new Battle(content.battleSetup('random-battle', 11, mode, teams, false));
  b.debug.crit = 'never';
  b.debug.dodge = 'never';
  for (const c of b.combatants) {
    c.stats.hpRegen = 0;
    c.maxHp = 2000;
    c.hp = 1000;
  }
  return b;
};
function only(ranks: Record<string, number>): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf('druid')!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((x) => (x.fx = null));
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function untilTurn(b: Battle, c: Combatant): void {
  for (let i = 0; i < 40 && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
}
function rain(b: Battle, me: Combatant, target?: Combatant, slot?: number): BattleEvent[] {
  if (b.mode === 'turns') untilTurn(b, me);
  me.cooldowns.rejuvenate = 0;
  me.mp = me.maxMp;
  const from = b.log.length;
  const r = b.useSkill(me.uid, 'rejuvenate', target?.uid, slot, slot !== undefined ? 'party' : undefined);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return b.log.slice(from);
}
const firstHeal = (evs: BattleEvent[], uid: string): number => evs.filter((e) => e.type === 'heal' && e.target === uid && e.cause !== 'healing_rain').reduce((s, e) => s + (e.type === 'heal' ? e.amount : 0), 0);
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const at = (b: Battle, board: 'party' | 'enemy', slot: number): GroundEffect[] => b.ground.filter((g) => g.board === board && g.slots.includes(slot));
const typesAt = (b: Battle, board: 'party' | 'enemy', slot: number): string[] => at(b, board, slot).map((g) => g.ground).sort();
const place = (b: Battle, by: string, ground: string, board: 'party' | 'enemy', slots: number[], turns = 3): void => {
  const r = b.debugPlaceGround(by, ground, board, slots, turns);
  expect(r.ok, r.ok ? '' : r.reason).toBe(true);
};
const reactions = (b: Battle): string[] => b.log.flatMap((e) => (e.type === 'groundReaction' ? [e.reaction] : []));

describe('Healing Rain: veri', () => {
  it('görünen ad her yerde Healing Rain; Druid ve pose tester aynı kalıp, sayılar', () => {
    const s = content.skills.rejuvenate!;
    expect(s).toMatchObject({ name: 'Healing Rain', target: 'area_any', area: { shape: 'rect', rows: 1, cols: 1, emptyOwn: true }, cooldown: 3, cost: { amount: 12 } });
    expect(s.effects.map((e) => [e.type, 'power' in e ? e.power : 0, 'side' in e ? e.side : ''])).toEqual([['heal', 0.675, 'allies'], ['ground', 0.225, 'allies']]);
    expect(s.effects.some((e) => e.type === 'hot')).toBe(false);
    expect(content.skills.pt_rejuvenate!.name).toBe('Healing Rain');
    expect(treeOf('druid')!.rows[3]!.name).toBe('Healing Rain');
    const T = JSON.stringify(treeOf('druid')!);
    expect(T).not.toContain('Rejuvenate');
    expect(T).not.toContain('"hot');
    expect(checkTreeFx(treeOf('druid')!)).toEqual([]);
  });

  it('zemin: şifa, Hallowed, su, Burning söndürür; Soaked vermez; metin bunları söyler', () => {
    const g = content.grounds.healing_rain!;
    expect(g).toMatchObject({ heal: true, status: 'hallowed', water: true, quenches: ['burning'], icon: 'rejuvenate' });
    expect(g.soak).toBeUndefined();
    const text = (g as unknown as { text: string }).text;
    expect(text).toMatch(/water/);
    expect(text).toMatch(/Burning Ground/);
    expect(text).toMatch(/does not soak/);
  });

  it('wiki: heal zemini ve su satırı Healing Rain\'i adıyla geçirir', () => {
    const text = JSON.stringify(buildMechanics());
    expect(text).toContain('Healing Rain');
    expect(text).toContain('does not soak');
  });
});

describe('Healing Rain: motor', () => {
  it('düşman tahtasında geçerli hücre yok; kendi boş hücresine atılır', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' });
    const me = P(b);
    untilTurn(b, me);
    for (const s of [0, 1, 2]) {
      expect(b.shapePreviewCells(me.uid, 'rejuvenate', s, 'enemy').valid, `cell ${s}`).toBe(false);
      expect(b.useSkill(me.uid, 'rejuvenate', undefined, s, 'enemy').ok, `cell ${s}`).toBe(false);
    }
    expect(b.useSkill(me.uid, 'rejuvenate', E(b).uid).ok).toBe(false);
    const empty = rain(b, me, undefined, 2);
    expect(empty.filter((e) => e.type === 'heal')).toEqual([]);
    expect(typesAt(b, 'party', 2)).toEqual(['healing_rain']);
    expect(b.ground.every((g) => g.board === 'party')).toBe(true);
  });

  it('anlık şifa + zemin; tur başında tik; çıkınca Hallowed kalkar ve tik durur', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' });
    const me = P(b);
    const ally = P(b, 1);
    const hp0 = ally.hp;
    const evs = rain(b, me, ally);
    const first = firstHeal(evs, ally.uid);
    expect(first).toBeGreaterThan(0);
    expect(typesAt(b, 'party', 1)).toEqual(['healing_rain']);
    expect(has(ally, 'hallowed')).toBe(true);
    const amount = at(b, 'party', 1)[0]!.amount;
    const before = b.log.length;
    untilTurn(b, ally);
    const ticks = b.log.slice(before).filter((e) => e.type === 'heal' && e.target === ally.uid && e.cause === 'healing_rain');
    expect(ticks.length).toBe(1);
    expect(ticks[0]!.type === 'heal' && ticks[0]!.amount).toBe(amount);
    expect(ally.hp).toBe(hp0 + first + amount);
    expect(b.useGlobal(ally.uid, 'move_tile', 2).ok).toBe(true);
    expect(has(ally, 'hallowed')).toBe(false);
    const hp = ally.hp;
    b.skipTurn();
    untilTurn(b, ally);
    expect(ally.hp).toBe(hp);
  });

  it('düşman yağmurda iyileşmez, hasar da almaz; Soaked yok', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' });
    const me = P(b);
    const foe = E(b);
    place(b, me.uid, 'healing_rain', 'enemy', [0]);
    expect(has(foe, 'hallowed')).toBe(false);
    const hp = foe.hp;
    untilTurn(b, foe);
    expect(foe.hp).toBe(hp);
    expect(has(foe, 'soaked')).toBe(false);
    const ally = P(b, 1);
    rain(b, me, ally);
    expect(has(ally, 'soaked')).toBe(false);
  });
});

describe('Healing Rain: ağaç', () => {
  const dryFirst = (tree?: UnitSetup['tree']): { first: number; ground: number } => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' }, tree ? withTree(0, tree) : {});
    const evs = rain(b, P(b), P(b, 1));
    return { first: firstHeal(evs, P(b, 1).uid), ground: b.ground.find((g) => g.ground === 'healing_rain')?.amount ?? 0 };
  };

  it('Tender Sap yalnız ilk şifa, Long Bloom yalnız zemin', () => {
    const base = dryFirst();
    const f1 = dryFirst(only({ '3.f1': 3 }));
    expect(f1.first).toBeGreaterThan(base.first);
    expect(f1.ground).toBe(base.ground);
    const f2 = treeOf('druid')!.nodes['3.f2']!;
    expect(f2.fx![0]).toMatchObject({ sel: 'ground:healing_rain' });
    const t2 = only({ '3.f2': 5 })!.skills!.rejuvenate!.effects;
    expect((t2.find((e) => e.type === 'ground') as { power: number }).power).toBeCloseTo(0.225 * 1.2, 6);
    expect((t2.find((e) => e.type === 'heal') as { power: number }).power).toBeCloseTo(0.675, 6);
  });

  it('Desperate Sap: zemin yok, %125 güçlü, boş hücre yok; Spreading Roots ile birlikte çökmeden derlenir', () => {
    const tree = only({ '3.fb': 1 })!;
    const s = tree.skills!.rejuvenate!;
    expect(s.effects.map((e) => e.type)).toEqual(['heal']);
    expect((s.effects[0] as { power: number }).power).toBeCloseTo(0.675 * 2.25, 6);
    expect(s.cooldown).toBe(4);
    expect(s.area?.emptyOwn).toBe(false);
    const both = only({ '3.fb': 1, '3.ea': 1 })!;
    expect(both.skills!.rejuvenate!.effects.some((e) => e.type === 'ground')).toBe(false);
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, tree));
    untilTurn(b, P(b));
    expect(b.useSkill(P(b).uid, 'rejuvenate', undefined, 2, 'party').ok).toBe(false);
    rain(b, P(b), P(b, 1));
    expect(b.ground).toEqual([]);
  });

  it('Grove Bloom: ilk şifa hedefin sırasına da, zemin yalnız hedefin hücresinde', () => {
    const b = make({ 0: 'druid', 1: 'warrior', 2: 'warrior', 3: 'warrior' }, { 0: 'warrior' }, withTree(0, only({ '3.ma': 1 })));
    const hp2 = P(b, 2).hp;
    const hp3 = P(b, 3).hp;
    rain(b, P(b), P(b, 1));
    expect(P(b, 2).hp).toBeGreaterThan(hp2);
    expect(P(b, 3).hp).toBe(hp3);
    expect(typesAt(b, 'party', 2)).toEqual([]);
  });

  it('Verdant Link: hedef ve en düşük canlı öteki dost tam şifa + zemin', () => {
    const b = make({ 0: 'druid', 1: 'warrior', 5: 'mage' }, { 0: 'warrior' }, withTree(0, only({ '3.v': 1 })));
    const me = P(b);
    const a = P(b, 1);
    const low = P(b, 5);
    low.hp = 200;
    const evs = rain(b, me, a);
    expect(firstHeal(evs, a.uid)).toBeGreaterThan(0);
    expect(firstHeal(evs, low.uid)).toBe(firstHeal(evs, a.uid));
    expect(typesAt(b, 'party', 1)).toEqual(['healing_rain']);
    expect(typesAt(b, 'party', 5)).toEqual(['healing_rain']);
  });

  it('zemin tikleri ilk şifa kancalarından geçmez (Soft Hands, Emergency Bloom, Overflowing Cup)', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, only({ '3.f3': 3, '3.eb': 1, '3.n0': 1 })));
    const ally = P(b, 1);
    rain(b, P(b), ally, undefined);
    const amount = at(b, 'party', 1)[0]!.amount;
    // %30 altında: ilk şifa kancası çalışsa tik büyürdü
    ally.hp = 100;
    const from = b.log.length;
    untilTurn(b, ally);
    const tick = b.log.slice(from).find((e) => e.type === 'heal' && e.target === ally.uid && e.cause === 'healing_rain');
    expect(tick && tick.type === 'heal' && tick.amount).toBe(amount);
    // Tam canda: taşan tik kalkan olmaz
    b.skipTurn();
    ally.hp = ally.maxHp;
    const sh = ally.shield;
    untilTurn(b, ally);
    expect(ally.shield).toBe(sh);
  });
});

describe('Healing Rain: su sayılır (tepkime tablosu)', () => {
  const arena = () => {
    const b = make({ 0: 'mage', 1: 'paladin', 2: 'warrior' }, { 0: 'warrior', 1: 'warrior' });
    return { b, me: P(b, 1).uid };
  };

  it('Spread: zehir yağmurun bağlı hücrelerine akar, yağmur kalır (kurulum ve tetik)', () => {
    const s = arena();
    place(s.b, s.me, 'healing_rain', 'party', [0, 1, 2]);
    place(s.b, E(s.b).uid, 'poison', 'party', [1]);
    expect(reactions(s.b)).toEqual(['spread']);
    for (const c of [0, 1, 2]) expect(typesAt(s.b, 'party', c), `cell ${c}`).toEqual(['healing_rain', 'poison']);
    const t = arena();
    place(t.b, E(t.b).uid, 'poison', 'party', [1]);
    place(t.b, t.me, 'healing_rain', 'party', [1]);
    expect(reactions(t.b)).toEqual(['spread']);
    expect(typesAt(t.b, 'party', 1)).toEqual(['healing_rain', 'poison']);
    // Yağmur ve Flooded aynı ağ
    const m = arena();
    place(m.b, m.me, 'healing_rain', 'party', [0]);
    place(m.b, m.me, 'flooded', 'party', [1]);
    place(m.b, E(m.b).uid, 'poison', 'party', [0]);
    expect(typesAt(m.b, 'party', 1)).toContain('poison');
  });

  it('Frozen: Chill Ground yağmuru buza çevirir, iki yönde', () => {
    for (const [a, c] of [['healing_rain', 'storm'], ['storm', 'healing_rain']] as const) {
      const s = arena();
      place(s.b, s.me, a, 'party', [1]);
      place(s.b, s.me, c, 'party', [1]);
      expect(reactions(s.b), a).toEqual(['frozen']);
      expect(typesAt(s.b, 'party', 1), a).toEqual(['ice_ground']);
    }
  });

  it('Holy Water: kutsal zeminler kendi tahtada yağmurla Holy Water olur, iki yönde; tutarı tetiğin', () => {
    for (const [react, holy] of [['holy_water', 'holy_fire'], ['holy_water', 'sanctified_flame'], ['holy_water_ground', 'holy_ground']] as const) {
      for (const first of ['healing_rain', holy]) {
        const s = arena();
        place(s.b, s.me, first, 'party', [1]);
        place(s.b, s.me, first === holy ? 'healing_rain' : holy, 'party', [1]);
        expect(reactions(s.b), `${holy} ${first}`).toEqual([react]);
        expect(typesAt(s.b, 'party', 1), `${holy} ${first}`).toEqual(['holy_water']);
      }
    }
  });

  it('Evaporate: karşı tahtada kutsal ateş yağmuru buharlaştırır, iki yönde', () => {
    for (const first of ['healing_rain', 'holy_fire']) {
      const s = arena();
      place(s.b, s.me, first, 'enemy', [1]);
      place(s.b, s.me, first === 'holy_fire' ? 'healing_rain' : 'holy_fire', 'enemy', [1]);
      expect(reactions(s.b), first).toEqual(['evaporate']);
      expect(typesAt(s.b, 'enemy', 1), first).not.toContain('healing_rain');
    }
  });

  it('Burning Ground söner, iki yönde; yağmur kalır', () => {
    for (const first of ['healing_rain', 'burning']) {
      const s = arena();
      place(s.b, E(s.b).uid, first, 'party', [1]);
      place(s.b, E(s.b).uid, first === 'burning' ? 'healing_rain' : 'burning', 'party', [1]);
      expect(typesAt(s.b, 'party', 1), first).toEqual(['healing_rain']);
    }
  });

  it('isWaterSkill ve Live Water yağmuru su saymaz: ıslatmaz, şimşek zincirlemez', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'warrior' });
    place(b, P(b).uid, 'healing_rain', 'party', [1]);
    expect(has(P(b, 1), 'soaked')).toBe(false);
    expect(reactions(b)).toEqual([]);
    expect((b as unknown as { conductingCells(s: string): Set<number> }).conductingCells('party').size).toBe(0);
  });
});

describe('Soaked hangi yoldan gelirse gelsin Burning söner (Ömer 2026-11-01)', () => {
  const burn = (b: Battle, c: Combatant) => expect(b.debugAddStatus(c.uid, 'burning', 3).ok).toBe(true);

  it('Skill Soaked (Nature\'s Wrath verisi) ve mob Soaked: Burning anında kalkar, bitti olayı gider', () => {
    const b = make({ 0: 'druid' }, { 0: 'warrior' });
    const foe = E(b);
    burn(b, foe);
    expect(b.debugAddStatus(foe.uid, 'soaked', 2).ok).toBe(true);
    expect(has(foe, 'burning')).toBe(false);
    expect(b.log.some((e) => e.type === 'statusEnd' && e.target === foe.uid && e.status === 'burning')).toBe(true);
    // Gerçek mob skill'i: Rime Witch sodden_hex
    const hexId = 'sodden_hex';
    const m = make({ 0: 'warrior' }, { 0: 'rime_witch' });
    const witch = E(m);
    const hero = P(m);
    burn(m, hero);
    untilTurn(m, witch);
    witch.mp = witch.maxMp;
    witch.cooldowns[hexId] = 0;
    const r = m.useSkill(witch.uid, hexId, hero.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(has(hero, 'soaked')).toBe(true);
    expect(has(hero, 'burning')).toBe(false);
  });

  it('Burning Ground köşesi: Soaked birim Burning\'i geri almaz; Soaked bitince zemin yeniden yakar; zemin sönmez', () => {
    const b = make({ 0: 'warrior' }, { 0: 'warrior' });
    const me = P(b);
    place(b, E(b).uid, 'burning', 'party', [0]);
    expect(has(me, 'burning')).toBe(true);
    expect(b.debugAddStatus(me.uid, 'soaked', 1).ok).toBe(true);
    expect(has(me, 'burning')).toBe(false);
    expect(typesAt(b, 'party', 0)).toEqual(['burning']);
    for (let i = 0; i < 30 && has(me, 'soaked'); i++) b.skipTurn();
    expect(has(me, 'soaked')).toBe(false);
    expect(has(me, 'burning')).toBe(true);
  });

  it('Reddedilen Soaked söndürmez (bağışıklık yolu temizlemeye girmez)', () => {
    const b = make({ 0: 'druid' }, { 0: 'warrior' });
    const foe = E(b);
    burn(b, foe);
    const priv = b as unknown as { statusBlocked(c: Combatant, kind: string): boolean; addStatus(c: Combatant, s: object, e: () => void): void };
    priv.statusBlocked = () => true;
    priv.addStatus(foe, { kind: 'soaked', turns: 2, source: P(b).uid, origin: 'skill' }, () => {});
    expect(has(foe, 'soaked')).toBe(false);
    expect(has(foe, 'burning')).toBe(true);
  });
});
