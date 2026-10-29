import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import type { GroundEffect } from '../src/engine/types';

// Skill ağacı Faz 4c (engine-dev): bedava kullanım (freeCast), gecikmeli vuruş, ağaç zeminleri, çağrı / durum / Doom aktarımı, tek tek boşluklar
// ve hata düzeltmeleri. Her test YALNIZCA verilen düğümlerin fx'iyle derler.

const ALL = ['warrior', 'defender', 'paladin', 'archer', 'cutthroat', 'mage', 'druid', 'undead', 'hexer', 'antimage', 'gambler'];
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
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant, slot?: number): BattleEvent[] {
  if (b.mode === 'turns') untilTurn(b, actor);
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid, slot, slot !== undefined ? 'enemy' : undefined);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const uses = (evs: BattleEvent[], actor: Combatant, skill: string): number => evs.filter((e) => e.type === 'skillUsed' && e.actor === actor.uid && e.skill === skill).length;
function seeds(what: string, fn: (seed: number) => boolean, n = 80): void {
  for (let s = 1; s <= n; s++) if (fn(s)) return;
  throw new Error(`${what}: hiçbir seed'de olmadı`);
}
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Combatant['statuses'][number], emit: (e: BattleEvent) => void, cause?: string): void;
  ground: GroundEffect[];
}
const X = (b: Battle): Priv => b as unknown as Priv;
const emitOf = (b: Battle) => (e: BattleEvent) => X(b).record(e);
function untilTurn(b: Battle, c: Combatant, max = 30): BattleEvent[] {
  const from = b.log.length;
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
  return b.log.slice(from);
}
/** Bir sonraki turuna kadar (şu an sıradaysa bir tur geçip yeniden gelene kadar). */
function nextTurn(b: Battle, c: Combatant): BattleEvent[] {
  const from = b.log.length;
  if (b.currentActor === c) expect(b.skipTurn().ok).toBe(true);
  untilTurn(b, c);
  return b.log.slice(from);
}
const grounds = (b: Battle, id: string): GroundEffect[] => X(b).ground.filter((g) => g.ground === id);

describe('Faz 4c: veri ve derleyici', () => {
  it('11 ağacın tüm fx\'leri temiz derlenir', () => {
    for (const c of ALL) expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
  });

  it('derleyici: cast sınıf skill\'i ister; zemin / durum / before sözlükte', () => {
    const bad = (cls: string, fx: unknown) => {
      const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
      const k = Object.keys(t.nodes)[0]!;
      delete t.nodes[k]!.inactive; // Mage 0.* pasif (2026-10-29); denetim pasif düğümü atlar
      t.nodes[k]!.fx = fx as TreeData['nodes'][string]['fx'];
      return checkTreeFx(t).length > 0;
    };
    expect(bad('mage', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ cast: 'quick_shot' }] }])).toBe(true);
    expect(bad('mage', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ cast: 'fire_bolt', delay: 0 }] }])).toBe(true);
    expect(bad('paladin', [{ k: 'hook', h: 'trigger', on: 'groundEnd', ground: 'nope', do: [{ rage: 1 }] }])).toBe(true);
    expect(bad('druid', [{ k: 'groundStatus', skill: 'natures_wrath', ground: 'root_field', status: 'nope' }])).toBe(true);
    expect(bad('mage', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ cast: 'fire_bolt', to: 'lowestHpEnemy' }] }])).toBe(false);
    expect(bad('mage', [{ k: 'hook', h: 'trigger', on: 'shieldAbsorb', when: { before: { targetStatus: 'slow' } }, do: [{ status: 'stun', turns: 1, to: 'target' }] }])).toBe(false);
  });
});

describe('Faz 4c: bedava kullanım (freeCast) ve gecikmeli vuruş', () => {
  it('Range Keeper: 3 uzaklığa yürüyen düşmana bedava Quick Shot, turlar arasında bir kez', () => {
    const b = make({ 0: 'archer' }, { 3: 'warrior', 4: 'warrior' }, withTree(0, only('archer', { '0.mb': 1 })));
    const me = P(b);
    const w1 = E(b, 3);
    const w2 = E(b, 4);
    const from = b.log.length;
    expect(b.useSkill(w1.uid, 'move_tile', undefined, 0).ok).toBe(true);
    expect(b.useSkill(w2.uid, 'move_tile', undefined, 1).ok).toBe(true);
    const evs = b.log.slice(from);
    expect(uses(evs, me, 'quick_shot')).toBe(1);
    expect(me.cooldowns.quick_shot ?? 0).toBe(0);
  });

  it('Rolling Doom: Fire Bolt öldürürse en düşük canlı düşmana bedava yeniden, her öldürmede', () => {
    seeds('Rolling Doom zinciri', (seed) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, withTree(0, only('mage', { '1.mb': 1 })), seed);
      const me = P(b);
      for (const s of [0, 1, 2]) E(b, s).hp = 1;
      E(b, 2).hp = 500;
      const evs = cast(b, me, 'fire_bolt', E(b, 0));
      if (E(b, 0).hp > 0 || E(b, 1).hp > 0) return false;
      expect(uses(evs, me, 'fire_bolt')).toBeGreaterThanOrEqual(2);
      // üçüncü düşman ölmediyse zincir durur (kuyruk sonsuz değil)
      expect(uses(evs, me, 'fire_bolt')).toBeLessThanOrEqual(3);
      return true;
    });
  });

  // Ömer 2026-10-29 Mage reworkü: bu düğüm(ler) pasif (inactive; Spell Echo / Mana Barrier kitten çıktı). Düğüm yeniden tasarlanınca test açılır.
  it.skip('Shatter Aegis: Mana Barrier kırılınca saldırana kesin kritik bedava Fire Bolt', () => {
    seeds('Shatter Aegis', (seed) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '3.v': 1 })), seed);
      const me = P(b);
      const w = E(b);
      cast(b, me, 'mana_barrier', me);
      const hook = me.shieldHooks!.find((h) => h.skill === 'mana_barrier')!;
      me.magicShield -= hook.amount - 1;
      me.shield -= hook.magic ? 0 : hook.amount - 1;
      hook.amount = 1;
      const evs = cast(b, w, 'melee_attack', me);
      if (!evs.some((e) => e.type === 'damage' && e.target === me.uid)) return false;
      expect(uses(evs, me, 'fire_bolt')).toBe(1);
      const bolt = evs.filter((e) => e.type === 'damage' && e.source === me.uid && e.target === w.uid);
      if (!bolt.length) return false; // Fire Bolt ıskaladı
      expect(bolt[0]!.type === 'damage' && bolt[0]!.crit).toBe(true);
      expect(me.cooldowns.fire_bolt ?? 0).toBe(0);
      return true;
    });
  });

  it('Run It Back: Double or Nothing tetiklenince skill hemen %60 güçle yeniden', () => {
    seeds('Run It Back', (seed) => {
      const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '0.v': 1 })), seed, 'turns');
      const me = P(b);
      const evs = cast(b, me, 'all_in', E(b));
      if (!evs.some((e) => e.type === 'passive' && e.actor === me.uid && e.passive === 'double_or_nothing')) return false;
      expect(uses(evs, me, 'all_in')).toBe(2);
      return true;
    });
  });

  it('Twin Meteors: bir tur sonra aynı hücrelere %50 ikinci meteor (zincirlenmez)', () => {
    const b = make({ 0: 'mage' }, { 4: 'warrior', 1: 'warrior' }, withTree(0, only('mage', { '4.d3': 1 })), 11, 'turns');
    const me = P(b);
    const a = cast(b, me, 'meteor', E(b, 4), 4);
    expect(uses(a, me, 'meteor')).toBe(1);
    const t = nextTurn(b, me);
    expect(uses(t, me, 'meteor')).toBe(1);
    const second = t.find((e) => e.type === 'skillUsed' && e.skill === 'meteor');
    expect(second && second.type === 'skillUsed' && second.center).toBe(4);
    const t2 = nextTurn(b, me);
    expect(uses(t2, me, 'meteor')).toBe(0);
  });

  it('Thicket Wave: Nature\'s Wrath bir tur sonra aynı hücrelere %50 vuruş + 1 tur Stun', () => {
    seeds('Thicket Wave', (seed) => {
      const b = make({ 0: 'druid' }, { 0: 'defender' }, withTree(0, only('druid', { '2.v': 1 })), seed, 'turns');
      const me = P(b);
      const d = E(b);
      d.hp = d.maxHp = 9999;
      cast(b, me, 'natures_wrath', d, 0);
      const t = nextTurn(b, me);
      expect(uses(t, me, 'natures_wrath')).toBe(1);
      if (!t.some((e) => e.type === 'damage' && e.source === me.uid && e.target === d.uid)) return false;
      expect(has(d, 'stun')).toBe(true);
      return true;
    });
  });
});

describe('Faz 4c: ağaç zeminleri', () => {
  it('Aftershock Ground + Sinking Earth: Tremor Slam satırına sarsıntı zemini; tur başında Slow ve %15 STR hasar', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '1.eb': 1, '1.mb': 1 })), 11, 'turns');
    const me = P(b);
    const m = E(b);
    cast(b, me, 'tremor_slam', m);
    const g = grounds(b, 'quaking_ground');
    expect(g).toHaveLength(1);
    expect(g[0]!.slots).toContain(0);
    expect(g[0]!.amount).toBeGreaterThan(0);
    m.statuses = m.statuses.filter((s) => s.kind !== 'slow');
    const hp0 = m.hp;
    nextTurn(b, m);
    expect(has(m, 'slow')).toBe(true);
    expect(m.hp).toBeLessThan(hp0);
  });

  it('yalnızca Aftershock Ground: zemin hasar vermez (güç 0), Endless Tremor süreyi 4 yapar', () => {
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '1.eb': 1, '1.fb': 1 })));
    cast(b, P(b), 'tremor_slam', E(b));
    const g = grounds(b, 'quaking_ground')[0]!;
    expect(g.noDamage).toBe(true);
    expect(g.turns).toBe(4);
  });

  it('Spent Arrows + Killing Field: ok yağmuru zemini düşmanı tur başında yavaşlatır ve kör eder', () => {
    const b = make({ 0: 'archer' }, { 0: 'mage' }, withTree(0, only('archer', { '3.ea': 1, '3.ma': 1 })), 11, 'turns');
    const me = P(b);
    const m = E(b);
    cast(b, me, 'arrow_rain', m, 0);
    expect(grounds(b, 'field_of_shafts')).toHaveLength(1);
    grounds(b, 'field_of_shafts')[0]!.turns = 9; // hız farkı: okçu iki kez oynarsa 2 turluk zemin biterdi
    nextTurn(b, m);
    expect(has(m, 'slow')).toBe(true);
    expect(has(m, 'blinded')).toBe(true);
  });

  it('Lingering Hail + Endless Hail: 4 tur süren yağmur, tur başında hasar; cooldown 5', () => {
    const b = make({ 0: 'archer' }, { 0: 'mage' }, withTree(0, only('archer', { '3.eb': 1, '3.fb': 1 })), 11, 'turns');
    const me = P(b);
    const m = E(b);
    me.stats = { ...me.stats, dex: me.stats.dex * 4 }; // düşük güçte (denge turu) tik zırhla 0'a yuvarlanmasın
    cast(b, me, 'arrow_rain', m, 0);
    const g = grounds(b, 'lingering_rain')[0]!;
    expect(g.turns).toBe(4);
    expect(g.amount).toBeGreaterThan(0);
    expect(me.cooldowns.arrow_rain).toBeGreaterThanOrEqual(5);
    const hp0 = m.hp;
    nextTurn(b, m);
    expect(m.hp).toBeLessThan(hp0);
  });

  it('Root Field + Hushing Moss + Overgrown Field: kök tarlası 4 tur, tur başında Slow + Silence + doğa hasarı', () => {
    const b = make({ 0: 'druid' }, { 0: 'mage' }, withTree(0, only('druid', { '2.n0': 1, '2.ea': 1, '2.ma': 1 })), 11, 'turns');
    const me = P(b);
    const m = E(b);
    m.hp = m.maxHp = 9999;
    cast(b, me, 'natures_wrath', m, 0);
    const g = grounds(b, 'root_field')[0]!;
    expect(g.turns).toBe(4);
    expect(g.amount).toBeGreaterThan(0);
    const hp0 = m.hp;
    nextTurn(b, m);
    expect(has(m, 'slow')).toBe(true);
    expect(has(m, 'silence')).toBe(true);
    expect(m.hp).toBeLessThan(hp0);
  });

  it('Eternal Winter: Blizzard alanında 2 tur Chill Ground, tur başında Chilled (Ömer 2026-10-29; eskiden Slow)', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '2.v': 1 })), 11, 'turns');
    const w = E(b);
    w.hp = w.maxHp = 9999;
    cast(b, P(b), 'blizzard', w, 0);
    // Genel zemin kuralı (Ömer 2026-10-29): içindeki düşman Chilled'ı zemin konunca o an alır (yavaşladığı için Mage bir tur daha oynayabilir: süre 1-2)
    expect(has(w, 'chilled')).toBe(true);
    expect(grounds(b, 'storm')[0]!.turns).toBeGreaterThanOrEqual(1);
    grounds(b, 'storm')[0]!.turns = 9;
    nextTurn(b, w);
    expect(has(w, 'chilled')).toBe(true);
    expect(has(w, 'slow')).toBe(false);
  });

  // 2026-10-27: eski Drain Field ağaç testi kaldırıldı (Ley Brand; yeni düğüm testleri tests/skill-tree-fx-leybrand.test.ts)

  it('Molten Core: Meteor\'un yanan zemini merkez hücrede iki kat', () => {
    const b = make({ 0: 'mage' }, { 4: 'warrior' }, withTree(0, only('mage', { '4.l2': 1 })));
    cast(b, P(b), 'meteor', E(b, 4), 4);
    const g = grounds(b, 'burning')[0]!;
    expect(g.cellMult?.[4]).toBe(2);
    expect(g.cellMult?.[1]).toBeUndefined();
  });

  it('Fire on Fire: Judgment yanan hücreye atılınca orada iki kat; eski zemin o hücreleri bırakır', () => {
    const b = make({ 0: 'paladin' }, { 4: 'warrior' }, withTree(0, only('paladin', { '3.ma': 1 })));
    const me = P(b);
    cast(b, me, 'judgment', E(b, 4), 4);
    const first = grounds(b, 'holy_fire')[0]!;
    const cellsA = [...first.slots];
    cast(b, me, 'judgment', E(b, 4), 5);
    const all = grounds(b, 'holy_fire');
    const second = all[all.length - 1]!;
    const shared = cellsA.filter((s) => second.slots.includes(s));
    expect(shared.length).toBeGreaterThan(0);
    for (const s of shared) expect(second.cellMult?.[s]).toBe(2);
    for (const g of all) if (g !== second) for (const s of shared) expect(g.slots).not.toContain(s);
  });

  it('Undying Flame: kutsal ateşte ölen düşmanın hücresi süresiz yarım güçle yanar (Wildfire Verdict sıçraması 2026-10-24 kaldırıldı)', () => {
    const b = make({ 0: 'paladin' }, { 4: 'warrior', 0: 'warrior' }, withTree(0, only('paladin', { '3.ea': 1 })), 11, 'turns');
    const me = P(b);
    const v = E(b, 4);
    const far = E(b, 0);
    cast(b, me, 'judgment', v, 7);
    const base = grounds(b, 'holy_fire')[0]!;
    expect(base.slots).toContain(4);
    expect(base.slots).not.toContain(0);
    v.hp = 1;
    for (let i = 0; i < 20 && v.hp > 0; i++) expect(b.skipTurn().ok).toBe(true);
    expect(v.hp).toBe(0);
    const perm = grounds(b, 'holy_fire').find((g) => g.permanent && g.slots.includes(4));
    expect(perm).toBeDefined();
    expect(perm!.amount).toBe(Math.round(base.amount * 0.5));
    expect(grounds(b, 'holy_fire').some((g) => g.slots.includes(far.slot))).toBe(false);
  });

  it('Day of Judgment: kutsal ateş bitince içinde kalan düşmanlara %60 INT kutsal hasar', () => {
    const b = make({ 0: 'paladin' }, { 4: 'defender' }, withTree(0, only('paladin', { '3.v': 1 })), 11, 'turns');
    const me = P(b);
    const d = E(b, 4);
    d.hp = d.maxHp = 9999;
    cast(b, me, 'judgment', d, 4);
    const g = grounds(b, 'holy_fire')[0]!;
    g.turns = 1;
    const t = nextTurn(b, me);
    expect(grounds(b, 'holy_fire')).toHaveLength(0);
    const hits = t.filter((e) => e.type === 'damage' && e.source === me.uid && e.target === d.uid && e.origin !== 'ground');
    expect(hits.length).toBe(1);
  });
});

describe('Faz 4c: hata düzeltmeleri', () => {
  it('Blood Hymn: bağlı dost Wail için ödenen can kadar iyileşir (of hpPaid)', () => {
    const b = make({ 0: 'undead', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('undead', { '2.eb': 1 })));
    const me = P(b);
    const ally = P(b, 1);
    cast(b, me, 'dark_bond', ally);
    ally.hp = Math.round(ally.maxHp / 2);
    const hp0 = me.hp;
    const a0 = ally.hp;
    const evs = cast(b, me, 'wail_of_the_dead', E(b));
    const paid = evs.find((e) => e.type === 'resource' && e.actor === me.uid && e.resource === 'hp');
    expect(paid).toBeDefined();
    const cost = paid!.type === 'resource' ? paid!.amount : 0;
    expect(cost).toBeGreaterThan(0);
    const heal = evs.filter((e) => e.type === 'heal' && e.target === ally.uid && e.cause === 'undead:2.eb');
    expect(heal.length).toBe(1);
    expect(heal[0]!.type === 'heal' && heal[0]!.amount).toBe(Math.min(cost, ally.maxHp - a0));
    expect(ally.hp).toBeGreaterThan(a0);
    expect(me.hp).toBeLessThanOrEqual(hp0);
  });

  it('Bastion Cry: Taunt bitince düğümün Fortified\'ı kalkar; Weathered the Storm\'un Fortified\'ı kalır', () => {
    const solo = make({ 0: 'defender' }, { 0: 'warrior' }, withTree(0, only('defender', { '2.v': 1 })), 11, 'turns');
    const a = P(solo);
    cast(solo, a, 'taunt');
    expect(has(a, 'fortify')).toBe(true);
    for (let i = 0; i < 6 && has(a, 'taunt'); i++) nextTurn(solo, a);
    expect(has(a, 'taunt')).toBe(false);
    expect(has(a, 'fortify')).toBe(false);

    const both = make({ 0: 'defender' }, { 0: 'warrior' }, withTree(0, only('defender', { '2.ma': 1, '2.v': 1 })), 11, 'turns');
    const d = P(both);
    cast(both, d, 'taunt');
    for (let i = 0; i < 6 && has(d, 'taunt'); i++) nextTurn(both, d);
    expect(has(d, 'taunt')).toBe(false);
    const f = d.statuses.find((s) => s.kind === 'fortify');
    expect(f).toBeDefined();
    expect(f!.permanent).toBeFalsy();
  });

  // Ömer 2026-10-29 Mage reworkü: bu düğüm(ler) pasif (inactive; Spell Echo / Mana Barrier kitten çıktı). Düğüm yeniden tasarlanınca test açılır.
  it.skip('Frozen Rebuke: koşul vuruştan ÖNCEKİ hedefe bakar (before); yavaşlamış saldıran sersemler', () => {
    const t = only('mage', { '3.ma': 1 })!;
    const h = t.hooks!.find((x) => x.node === 'mage:3.ma')!;
    expect(h.h === 'trigger' && h.when).toEqual({ before: { targetStatus: 'slow' } });
    seeds('Frozen Rebuke', (seed) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, t), seed);
      const me = P(b);
      const w = E(b);
      cast(b, me, 'mana_barrier', me);
      X(b).addStatus(w, { kind: 'slow', turns: 3, source: me.uid }, emitOf(b));
      const evs = cast(b, w, 'melee_attack', me);
      if (!evs.some((e) => e.type === 'damage' && e.target === me.uid && e.absorbed > 0)) return false;
      expect(has(w, 'stun')).toBe(true);
      return true;
    });
  });

  it('Plague Curse: Wither tiki konağın YANINDAKİ düşmana bulaşır', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'warrior', 8: 'warrior' }, withTree(0, only('hexer', { '2.v': 1 })), 11, 'turns');
    const me = P(b);
    const host = E(b, 0);
    host.hp = host.maxHp = 9999;
    X(b).addStatus(host, { kind: 'wither', turns: 3, source: me.uid, amount: 5 }, emitOf(b));
    nextTurn(b, host);
    expect(has(E(b, 1), 'wither')).toBe(true);
    expect(has(E(b, 8), 'wither')).toBe(false);
  });

  it('Second Ward: Spell Ward kırılınca en düşük canlı dosta kırılan kalkanın ilk boyunun %50\'si', () => {
    seeds('Second Ward', (seed) => {
      const b = make({ 0: 'antimage', 1: 'warrior', 2: 'mage' }, { 0: 'mage' }, withTree(0, only('antimage', { '3.ma': 1 })), seed);
      const me = P(b);
      const tank = P(b, 1);
      const low = P(b, 2);
      low.hp = 5;
      cast(b, me, 'spell_ward', tank);
      const hook = tank.shieldHooks!.find((h) => h.skill === 'spell_ward')!;
      const size = hook.size!;
      expect(size).toBe(hook.amount);
      const w = E(b);
      const ms0 = low.magicShield;
      // kalkanı neredeyse tüket: sonraki vuruş kırar
      tank.magicShield -= hook.amount - 1;
      hook.amount = 1;
      const evs = cast(b, w, 'fire_bolt', tank);
      if (!evs.some((e) => e.type === 'damage' && e.target === tank.uid && e.absorbed > 0)) return false;
      expect(low.magicShield - ms0).toBe(Math.round(size * num('antimage', '3.ma', '0.do.0.shield')));
      return true;
    });
  });
});

interface Priv2 {
  applyHeal(s: Combatant, t: Combatant, n: number, crit: boolean, emit: (e: BattleEvent) => void, cause?: string): number;
  triggerDoom(t: Combatant, st: Combatant['statuses'][number], mult: number, cause: 'detonate', trigger: Combatant, emit: (e: BattleEvent) => void): void;
}
const Y = (b: Battle): Priv2 => b as unknown as Priv2;
const omen = (src: Combatant, n: number): Combatant['statuses'][number] => ({ kind: 'omen', turns: 3, source: src.uid, stacks: n });
const dooms = (evs: BattleEvent[], t: Combatant) => evs.filter((e): e is Extract<BattleEvent, { type: 'doom' }> => e.type === 'doom' && e.target === t.uid);

describe('Faz 4c: durum / Doom aktarımı', () => {
  it('Passing Bell: lanetli düşman ölünce en yakın düşmana ölenin Omen sayısı kadar Doom', () => {
    seeds('Passing Bell', (seed) => {
      const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'defender' }, withTree(0, only('hexer', { '0.v': 1 })), seed);
      const me = P(b);
      const v = E(b, 0);
      const n = E(b, 1);
      n.hp = n.maxHp = 9999;
      X(b).addStatus(v, omen(me, 3), emitOf(b));
      v.hp = 1;
      const evs = cast(b, me, 'evil_eye', v);
      if (v.hp > 0) return false;
      const d = dooms(evs, n);
      expect(d.length).toBe(1);
      expect(d[0]!.omens).toBeGreaterThanOrEqual(3);
      return true;
    });
  });

  it('Leaping Mark + Unending Mark: Doom öldürürse (veriden oranla) sıçrar; sıçrayan Doom öldürürse yeniden', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'warrior', 2: 'defender' }, withTree(0, only('hexer', { '4.u1': 1, '4.u3': 1 })));
    const me = P(b);
    const [a, c, d] = [E(b, 0), E(b, 1), E(b, 2)];
    a.hp = 1;
    c.hp = 1;
    d.hp = d.maxHp = 9999;
    X(b).addStatus(a, omen(me, 4), emitOf(b));
    const from = b.log.length;
    // Doom Mark kullanımının içindeymiş gibi (öldürme olayının skill'i = doom_mark)
    Object.assign(b, { castingActor: me, castingSkill: content.skills.doom_mark });
    Y(b).triggerDoom(a, a.statuses.find((s) => s.kind === 'omen')!, 1.65, 'detonate', me, emitOf(b));
    Object.assign(b, { castingActor: undefined, castingSkill: undefined });
    const evs = b.log.slice(from);
    expect(a.hp).toBe(0);
    const leap1 = dooms(evs, c);
    expect(leap1.length).toBe(1);
    const leapPct = (treeOf('hexer')!.nodes['4.u1']!.fx![0] as { do: { doom: number }[] }).do[0]!.doom;
    expect(leap1[0]!.omens).toBe(Math.round(4 * 1.65 * leapPct));
    expect(c.hp).toBe(0);
    const leap2 = dooms(evs, d);
    expect(leap2.length).toBe(1);
    expect(leap2[0]!.omens).toBe(Math.round(leap1[0]!.omens * leapPct));
  });

  it('Hungry Leap: sıçrama Leaping Mark yerine geçer (Unending Mark da aynı oran; veriden)', () => {
    const t = only('hexer', { '4.u1': 1, '4.u2': 1, '4.u3': 1 })!;
    const leaps = t.hooks!.filter((h) => h.h === 'trigger' && h.on === 'kill');
    const hungry = (treeOf('hexer')!.nodes['4.u2']!.fx![0] as { do: { doom: number }[] }).do[0]!.doom;
    expect(leaps.map((h) => h.h === 'trigger' && [h.via, h.do[0]!.doom])).toEqual([['doom', hungry], ['leap', hungry]]);
  });

  it('Creeping Blight: Withering düşman ölünce Withering kalan süresiyle en yakın düşmana geçer', () => {
    seeds('Creeping Blight', (seed) => {
      const b = make({ 0: 'druid' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('druid', { '0.ea': 1 })), seed);
      const me = P(b);
      const v = E(b, 0);
      const n = E(b, 1);
      X(b).addStatus(v, { kind: 'wither', turns: 2, source: me.uid, amount: 7 }, emitOf(b));
      v.hp = 1;
      cast(b, me, 'thorn_whip', v);
      if (v.hp > 0) return false;
      expect(n.statuses.find((s) => s.kind === 'wither')).toMatchObject({ turns: 2, source: me.uid, amount: 7 });
      return true;
    });
  });

  it('Herald of Ruin: Charge Stun\'ı bitince 10 Rage; tutulan Rage başına +%1 güç kancası', () => {
    const t = only('warrior', { '3.v': 1 })!;
    expect(t.hooks!.some((h) => h.h === 'cond' && JSON.stringify(h.scale) === '{"selfRage":1}')).toBe(true);
    seeds('Herald of Ruin', (seed) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, withTree(0, t), seed, 'turns');
      const me = P(b);
      const d = E(b);
      d.hp = d.maxHp = 9999;
      cast(b, me, 'charge', d);
      const st = d.statuses.find((s) => s.kind === 'stun');
      if (!st) return false;
      expect(st.fromSkill).toBe('charge');
      const r0 = me.rage ?? 0;
      for (let i = 0; i < 5 && has(d, 'stun'); i++) nextTurn(b, d);
      expect(has(d, 'stun')).toBe(false);
      expect((me.rage ?? 0) - r0).toBeGreaterThanOrEqual(10);
      return true;
    });
  });
});

describe('Faz 4c: tek tek boşluklar', () => {
  it('Rot to the Core: druidin Withering\'i bitince taşıyan verdiği toplam hasarın yarısını bir kez daha yer', () => {
    const b = make({ 0: 'druid' }, { 0: 'defender' }, withTree(0, only('druid', { '0.mb': 1 })), 11, 'turns');
    const me = P(b);
    const d = E(b);
    d.hp = d.maxHp = 9999;
    X(b).addStatus(d, { kind: 'wither', turns: 2, source: me.uid, amount: 20 }, emitOf(b));
    const from = b.log.length;
    for (let i = 0; i < 4 && has(d, 'wither'); i++) nextTurn(b, d);
    expect(has(d, 'wither')).toBe(false);
    const evs = b.log.slice(from);
    const ticks = evs.filter((e) => e.type === 'damage' && e.target === d.uid && e.origin === 'status' && e.status === 'wither');
    const sum = ticks.reduce((s, e) => s + (e.type === 'damage' ? e.amount : 0), 0);
    expect(ticks.length).toBe(2);
    const burst = evs.filter((e) => e.type === 'damage' && e.target === d.uid && e.source === me.uid && !e.status);
    expect(burst.length).toBe(1);
    expect(burst[0]!.type === 'damage' && burst[0]!.amount + burst[0]!.absorbed).toBe(Math.round(sum * 0.5));
  });

  it('Lifebloom: Rejuvenate yenilenmesi bitince dost ilk şifa kadar bir kez daha iyileşir', () => {
    const b = make({ 0: 'druid', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('druid', { '3.mb': 1 })), 11, 'turns');
    const me = P(b);
    const ally = P(b, 1);
    ally.maxHp = 9999;
    ally.hp = 100;
    const evs = cast(b, me, 'rejuvenate', ally);
    const first = evs.find((e) => e.type === 'heal' && e.target === ally.uid && e.source === me.uid);
    const reg = ally.statuses.find((s) => s.kind === 'regen');
    expect(reg?.first).toBe(first && first.type === 'heal' ? first.amount : -1);
    expect(reg?.fromSkill).toBe('rejuvenate');
    reg!.turns = 1;
    const t = nextTurn(b, ally);
    const bloom = t.filter((e) => e.type === 'heal' && e.target === ally.uid && e.cause === 'druid:3.mb');
    expect(bloom.length).toBe(1);
    expect(bloom[0]!.type === 'heal' && bloom[0]!.amount).toBe(reg!.first);
  });

  // Ömer 2026-10-29 Mage reworkü: bu düğüm(ler) pasif (inactive; Spell Echo / Mana Barrier kitten çıktı). Düğüm yeniden tasarlanınca test açılır.
  it.skip('Time Fold + Endless Refrain: Spell Echo sonrası o skill\'in sonraki kullanımı yarım tur ve iki kat yankı şansı', () => {
    seeds('Spell Echo', (seed) => {
      const b = make({ 0: 'mage' }, { 0: 'defender' }, withTree(0, only('mage', { '0.ma': 1, '0.mb': 1 })), seed, 'turns');
      const me = P(b);
      E(b).hp = E(b).maxHp = 9999;
      const evs = cast(b, me, 'blizzard', E(b), 0);
      if (!evs.some((e) => e.type === 'passive' && e.actor === me.uid && e.passive === 'spell_echo')) return false;
      const fold = me.treeBuffs!.find((x) => x.node === 'mage:0.mb')!;
      const refrain = me.treeBuffs!.find((x) => x.node === 'mage:0.ma')!;
      expect(fold).toMatchObject({ skill: 'blizzard', uses: 1, mod: { turnCost: 0.5 } });
      expect(refrain).toMatchObject({ skill: 'blizzard', uses: 1, mod: { echoMul: 1 } });
      expect(fold.pending).toBeFalsy();
      cast(b, me, 'blizzard', E(b), 0);
      expect(me.treeBuffs!.includes(fold)).toBe(false);
      return true;
    });
  });

  it('Crimson Tide: her can ödemesi savaş sonuna kadar +%5 can çalma (birikir)', () => {
    const b = make({ 0: 'undead' }, { 0: 'defender' }, withTree(0, only('undead', { '0.v': 1 })));
    const me = P(b);
    E(b).hp = E(b).maxHp = 9999;
    cast(b, me, 'wail_of_the_dead', E(b));
    cast(b, me, 'wail_of_the_dead', E(b));
    const tide = me.treeBuffs!.find((x) => x.node === 'undead:0.v')!;
    expect(tide.mod).toEqual({ drainAdd: num('undead', '0.v', '0.do.0.buff.drainAdd') });
    expect(tide.s).toBe(2);
  });

  it('Fortress Aura: tur başında Bulwark Aura\'nın zırh bonusu kadar 1 turluk kalkan', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('defender', { '0.v': 1 })), 11, 'turns');
    const me = P(b);
    untilTurn(b, me);
    expect(me.shield).toBeGreaterThan(0);
    expect(me.shieldHooks?.some((h) => h.turns === 1)).toBe(true);
  });

  it('Lifeline: bağlı dost %30 altına inince sonraki vuruş iki kat çalar ve ona yollar', () => {
    seeds('Lifeline', (seed) => {
      const b = make({ 0: 'undead', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('undead', { '3.n0': 1 })), seed);
      const me = P(b);
      const ally = P(b, 1);
      cast(b, me, 'dark_bond', ally);
      ally.hp = Math.round(ally.maxHp * 0.32);
      cast(b, E(b), 'fire_bolt', ally);
      if (ally.hp <= 0 || ally.hp >= ally.maxHp * 0.3) return false;
      expect(me.treeBuffs!.find((x) => x.node === 'undead:3.n0')).toMatchObject({ mod: { drainMul: 1, drainBond: true }, uses: 1 });
      return true;
    });
  });

  it('Overflow Strike + Brimming Ally + Spell Sink: Void Strike Mana Overflow tetikler; dolan dosta Haste; en düşük canlı dosta Guard', () => {
    const b = make({ 0: 'antimage', 1: 'mage', 2: 'warrior' }, { 0: 'defender' }, withTree(0, only('antimage', { '4.d3': 1, '0.ma': 1, '0.mb': 1 })));
    const me = P(b);
    const m = P(b, 1);
    const w = P(b, 2);
    E(b).hp = E(b).maxHp = 9999;
    m.mp = m.maxMp - 1;
    w.hp = 3;
    const evs = cast(b, me, 'void_strike', E(b));
    expect(evs.some((e) => e.type === 'passive' && e.actor === me.uid && e.passive === 'mana_overflow')).toBe(true);
    expect(m.mp).toBe(m.maxMp);
    expect(has(m, 'haste')).toBe(true);
    expect(w.statuses.some((s) => s.kind === 'guard' && s.source === me.uid)).toBe(true);
  });

  it('Feeding Frenzy: Void Strike hedefini dost sıradaki turundan önce öldürürse takım 15 MP', () => {
    seeds('Feeding Frenzy', (seed) => {
      const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'defender' }, withTree(0, only('antimage', { '4.r3': 1 })), seed);
      const me = P(b);
      const w = P(b, 1);
      const d = E(b);
      d.hp = d.maxHp = 9999;
      const hit = cast(b, me, 'void_strike', d);
      if (!hit.some((e) => e.type === 'damage' && e.source === me.uid && e.target === d.uid)) return false;
      d.hp = 1;
      cast(b, w, 'melee_attack', d);
      if (d.hp > 0) return false;
      me.mp = 0;
      return true;
    });
    // MP kazancı ölüm anında: ayrı kurulumla ölç
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'defender' }, withTree(0, only('antimage', { '4.r3': 1 })));
    const me = P(b);
    const w = P(b, 1);
    const d = E(b);
    let ok = false;
    for (let i = 0; i < 10 && !ok; i++) {
      d.hp = d.maxHp = 9999;
      ok = cast(b, me, 'void_strike', d).some((e) => e.type === 'damage' && e.source === me.uid && e.target === d.uid);
    }
    expect(ok).toBe(true);
    d.hp = 1;
    me.mp = 0;
    for (let i = 0; i < 10 && d.hp > 0; i++) {
      w.cooldowns.melee_attack = 0;
      b.useSkill(w.uid, 'melee_attack', d.uid);
    }
    expect(d.hp).toBe(0);
    expect(me.mp).toBe(Math.min(15, me.maxMp));
  });

  it('Iron Return: dirilen dostun ilk aldığı vuruş rank başına %10 zayıf; işaret vuruşta harcanır', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('paladin', { '2.r': 3 })));
    const me = P(b);
    const ally = P(b, 1);
    ally.hp = 0;
    cast(b, me, 'resurrection', ally);
    expect(ally.hp).toBeGreaterThan(0);
    expect(b.treeTakenMult(ally, E(b))).toBeCloseTo(0.7, 9);
    expect(b.treeTakenMult(me, E(b))).toBe(1);
    let landed = false;
    for (let i = 0; i < 10 && !landed; i++) landed = cast(b, E(b), 'fire_bolt', ally).some((e) => e.type === 'damage' && e.target === ally.uid);
    expect(landed).toBe(true);
    expect(b.treeTakenMult(ally, E(b))).toBe(1);
  });

  it('Counter Cut / Reckless Grace / Turned Blade: birleşime göre tek karşı kesik ailesi', () => {
    const dmg = (r: Record<string, number>) =>
      only('cutthroat', r)
        ?.hooks?.filter((h) => h.h === 'trigger' && h.on === 'enemyMissed')
        .map((h) => (h.h === 'trigger' ? `${h.do[0]!.damage}${h.do[0]!.crit ? 'c' : ''}${h.do.some((a) => a.removeStatus) ? 's' : ''}` : '')) ?? [];
    const cut = num('cutthroat', '0.eb', '0.do.0.damage'); // karşı kesik (veriden); Reckless Grace iki katı
    expect(num('cutthroat', '0.fb', '0.do.0.damage')).toBeCloseTo(2 * cut, 9);
    expect(dmg({ '0.eb': 1 })).toEqual([`${cut}`]);
    expect(dmg({ '0.eb': 1, '0.fb': 1 })).toEqual([`${2 * cut}s`]);
    expect(dmg({ '0.eb': 1, '0.mb': 1 }).sort()).toEqual([`${cut}`, `${cut}c`]);
    expect(dmg({ '0.eb': 1, '0.fb': 1, '0.mb': 1 }).sort()).toEqual([`${2 * cut}cs`, `${2 * cut}s`]);
    expect(dmg({ '0.mb': 1 })).toEqual([]);
  });

  it('Counter Cut: yakın dövüş düşmanı ıskalayınca %40 DEX karşı kesik', () => {
    seeds('Counter Cut', (seed) => {
      const b = make({ 0: 'cutthroat' }, { 0: 'warrior' }, withTree(0, only('cutthroat', { '0.eb': 1 })), seed);
      const me = P(b);
      const w = E(b);
      const evs = cast(b, w, 'melee_attack', me);
      if (evs.some((e) => e.type === 'damage' && e.source === w.uid && e.target === me.uid)) return false;
      expect(evs.some((e) => e.type === 'damage' && e.source === me.uid && e.target === w.uid)).toBe(true);
      return true;
    }, 300);
  });

  it('Stolen Remedy: Yaraladığın düşman iyileşince Wound\'un engellediği kadar iyileşirsin', () => {
    const b = make({ 0: 'undead' }, { 0: 'warrior', 1: 'paladin' }, withTree(0, only('undead', { '0.mb': 1 })));
    const me = P(b);
    me.hp = 10;
    const v = E(b);
    v.hp = 10;
    X(b).addStatus(v, { kind: 'wound', turns: 3, source: me.uid }, emitOf(b));
    const from = b.log.length;
    Y(b).applyHeal(E(b, 1), v, 100, false, emitOf(b));
    const back = b.log.slice(from).filter((e) => e.type === 'heal' && e.target === me.uid && e.cause === 'undead:0.mb');
    expect(back.length).toBe(1);
    expect(back[0]!.type === 'heal' && back[0]!.amount).toBeGreaterThan(0);
  });

  it('Exposed Perch: Sharpshooter 2 ek sıra sayar; menzilli skill\'lerden %20 fazla hasar', () => {
    const t = only('archer', { '0.fb': 1 })!;
    expect(t.passive?.effect).toMatchObject({ type: 'longshot', extraRows: 2 });
    const b = make({ 0: 'archer' }, { 0: 'archer', 1: 'warrior' }, withTree(0, t));
    const me = P(b);
    expect(b.treeTakenMult(me, E(b, 0), 'physical', content.skills.quick_shot)).toBeCloseTo(1 + num('archer', '0.fb', '1.mul'), 9);
    expect(b.treeTakenMult(me, E(b, 1), 'physical', content.skills.melee_attack)).toBe(1);
  });

  it('Overcharged Doom: Doom +%30, verdiği hasarın %10\'unu sen kaybedersin', () => {
    const b = make({ 0: 'hexer' }, { 0: 'defender' }, withTree(0, only('hexer', { '0.fa': 1 })));
    const me = P(b);
    const d = E(b);
    d.hp = d.maxHp = 9999;
    X(b).addStatus(d, omen(me, 4), emitOf(b));
    const hp0 = me.hp;
    const from = b.log.length;
    Y(b).triggerDoom(d, d.statuses.find((s) => s.kind === 'omen')!, 1, 'detonate', me, emitOf(b));
    const hit = b.log.slice(from).find((e) => e.type === 'damage' && e.target === d.uid);
    const dealt = hit && hit.type === 'damage' ? hit.amount : 0;
    expect(dealt).toBeGreaterThan(0);
    expect(hp0 - me.hp).toBe(Math.max(1, Math.round(dealt * 0.1)));
  });

  it('Clean Sweep + Domino: All In öldürürse yatırılan MP geri; rastgele düşmana hasarının %60\'ı', () => {
    seeds('All In öldürme', (seed) => {
      const b = make({ 0: 'gambler' }, { 0: 'warrior', 1: 'defender' }, withTree(0, only('gambler', { '4.r2': 1, '4.r3': 1 })), seed);
      const me = P(b);
      const v = E(b, 0);
      const o = E(b, 1);
      o.hp = o.maxHp = 9999;
      v.hp = 1;
      const evs = cast(b, me, 'all_in', v);
      if (v.hp > 0) return false;
      expect(evs.some((e) => e.type === 'mpRegen' && e.actor === me.uid)).toBe(true);
      expect(evs.some((e) => e.type === 'damage' && e.source === me.uid && e.target === o.uid)).toBe(true);
      return true;
    });
  });

  it('Rolling Dice: her Double Hit Loaded Dice\'a rank başına +%1 güç (birikir); Double Hit olmayan atış sıfırlar', () => {
    let grew = false;
    let reset = false;
    seeds('Rolling Dice', (seed) => {
      const b = make({ 0: 'gambler' }, { 0: 'defender' }, withTree(0, only('gambler', { '1.f3': 3 })), seed);
      const me = P(b);
      E(b).hp = E(b).maxHp = 99999;
      for (let i = 0; i < 12; i++) {
        const evs = cast(b, me, 'loaded_dice', E(b));
        const hit = evs.some((e) => e.type === 'damage' && e.source === me.uid);
        const rep = evs.some((e) => e.type === 'passive' && e.passive === 'gamble_double');
        const buff = me.treeBuffs?.find((x) => x.node === 'gambler:1.f3');
        if (rep && buff) {
          expect(buff.mod!.powerMul).toBeCloseTo(3 * num('gambler', '1.f3', '0.do.0.buff.powerMul'), 9); // değer veriden (D9 2026-10-23)
          grew = true;
        } else if (hit && !rep) {
          expect(buff).toBeUndefined();
          reset = true;
        }
      }
      return grew && reset;
    });
  });

  it('Bedside Watch: Divine Light %50 altındaki dostları rank başına %4 fazla iyileştirir', () => {
    const h = only('paladin', { '0.f3': 3 })!.hooks!.find((x) => x.node === 'paladin:0.f3')!;
    expect(h).toMatchObject({ h: 'cond', at: 'passiveHeal', when: { targetHpBelow: 0.5 }, mod: { powerMul: 3 * num('paladin', '0.f3', '0.mod.powerMul') } });
  });
});

describe('Faz 4c: çağrı aktarımı (Treant / Skeleton)', () => {
  interface Priv3 {
    summonTree(a: Combatant, unit: string, fed: boolean | undefined): { skills?: Record<string, { cooldown?: number }>; hooks?: unknown[] } | undefined;
  }
  const summonOf = (b: Battle, owner: Combatant): Combatant => b.combatants.find((c) => c.summoned && c.owner === owner.uid && c.hp > 0)!;
  const spawn = (b: Battle, owner: Combatant, skill: string): Combatant => {
    cast(b, owner, skill);
    const s = summonOf(b, owner);
    expect(s, skill).toBeTruthy();
    return s;
  };
  const dealtTo = (evs: BattleEvent[], t: Combatant): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === t.uid ? e.amount + e.absorbed : 0), 0);

  it('derleyici: summon yalnızca sınıfın çağırdığı birime; fed yalnızca ceset tüketen çağrıya; armorAdd yalnızca çağrıya', () => {
    const bad = (cls: string, fx: unknown) => {
      const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
      t.nodes['4.r1']!.fx = fx as TreeData['nodes'][string]['fx'];
      return checkTreeFx(t).length > 0;
    };
    expect(bad('mage', [{ summon: 'treant', k: 'stat', f: 'hpMult', op: 'mul', v: 0.1 }])).toBe(true);
    expect(bad('druid', [{ summon: 'treant', fed: true, k: 'stat', f: 'hpMult', op: 'mul', v: 0.1 }])).toBe(true);
    expect(bad('druid', [{ summon: 'treant', k: 'passive', f: 'dotTurns', op: 'add', v: 1 }])).toBe(true);
    expect(bad('undead', [{ k: 'stat', f: 'armorAdd', op: 'add', v: 5 }])).toBe(true);
    expect(bad('druid', [{ summon: 'treant', k: 'skill', skill: 'fire_bolt', sel: 'damage', f: 'power', op: 'pct', v: 0.2 }])).toBe(true);
    expect(bad('druid', [{ summon: 'treant', k: 'stat', f: 'hpMult', op: 'mul', v: 0.1 }])).toBe(false);
    const s = only('undead', { '4.d1': 1 })!;
    expect(Object.keys(s.summons!)).toEqual(['skeleton#fed']);
    expect(s.summons!['skeleton#fed']!.hpMult).toBeCloseTo(1.15);
  });

  it('Heavy Boughs / Heavy Smash: Treant Root Smash yamalı (+%20) ve yavaş / sersem hedefe +%25 koşullu', () => {
    const b = make({ 3: 'druid' }, { 0: 'warrior' }, withTree(3, only('druid', { '4.r1': 1, '4.r2': 1 })));
    const t = spawn(b, P(b, 3), 'summon_treant');
    const rs = t.skillDefs!.root_smash!.effects.find((e) => e.type === 'damage') as { power: number };
    expect(rs.power).toBeCloseTo(0.575 * (1 + num('druid', '4.r1', '0.v')), 4);
    expect(t.treeHooks).toEqual([expect.objectContaining({ h: 'cond', skill: 'root_smash', mod: { powerMul: num('druid', '4.r2', '0.mod.powerMul') } })]);
  });

  it('Barkskin (bar 25): Treant %15 az hasar alır (aynı seed, aynı vuruş)', () => {
    const hit = (bar: boolean): number => {
      const b = make({ 3: 'druid' }, { 0: 'mage' }, withTree(3, bar ? only('druid', {}, 4) : only('druid', { '4.r1': 1 })), 5);
      const t = spawn(b, P(b, 3), 'summon_treant');
      t.hp = t.maxHp = 5000;
      return dealtTo(cast(b, E(b, 0), 'fire_bolt', t), t);
    };
    const plain = hit(false);
    expect(plain).toBeGreaterThan(0);
    expect(Math.abs(hit(true) - plain * 0.85)).toBeLessThanOrEqual(1);
  });

  it('Splinter Burst: Treant ölünce Druid en yakın 2 düşmana %60 INT doğa hasarı verir; Brittle Bark %90 ve Treant -%20 can', () => {
    for (const [ranks, mult] of [[{ '4.d1': 1 }, 0.6], [{ '4.d1': 1, '4.d2': 1 }, 0.9]] as const) {
      const b = make({ 3: 'druid' }, { 0: 'mage', 1: 'warrior', 2: 'warrior' }, withTree(3, only('druid', ranks)));
      const d = P(b, 3);
      const base = make({ 3: 'druid' }, { 0: 'warrior' });
      const t0 = spawn(base, P(base, 3), 'summon_treant');
      const t = spawn(b, d, 'summon_treant');
      expect(t.maxHp).toBe(mult === 0.9 ? Math.max(1, Math.round(t0.maxHp * 0.8)) : t0.maxHp);
      t.hp = 1;
      let evs: BattleEvent[] = [];
      for (let i = 0; i < 10 && t.hp > 0; i++) evs = cast(b, E(b, 0), 'fire_bolt', t);
      expect(t.hp).toBe(0);
      const burst = evs.filter((e) => e.type === 'damage' && e.source === d.uid && e.target !== t.uid);
      expect(new Set(burst.map((e) => (e.type === 'damage' ? e.target : ''))).size, String(mult)).toBe(2);
    }
  });

  it('Shieldbark / Thornbark: Treant Taunt ile iner; ona vuran %15 INT doğa hasarı alır', () => {
    const b = make({ 3: 'druid' }, { 0: 'mage' }, withTree(3, only('druid', { '4.l1': 1, '4.l2': 1 })));
    const t = spawn(b, P(b, 3), 'summon_treant');
    expect(t.statuses.find((s) => s.kind === 'taunt')).toMatchObject({ turns: 1, source: t.uid });
    t.hp = t.maxHp = 5000;
    const w = E(b, 0);
    let back = false;
    for (let i = 0; i < 10 && !back; i++) back = cast(b, w, 'fire_bolt', t).some((e) => e.type === 'damage' && e.source === t.uid && e.target === w.uid);
    expect(back).toBe(true);
  });

  it('Grasping Hands / Grave Grasp: Skeleton vuruşu yavaşlatır; ilk vuruşu (bir kez) sersemletir', () => {
    const b = make({ 3: 'undead' }, { 0: 'warrior' }, withTree(3, only('undead', { '4.u1': 1, '4.u3': 1 })));
    const s = spawn(b, P(b, 3), 'raise_dead');
    const w = E(b, 0);
    w.hp = w.maxHp = 9000;
    const swing = () => {
      for (let i = 0; i < 20; i++) if (cast(b, s, 'skeleton_strike', w).some((e) => e.type === 'damage' && e.source === s.uid && e.target === w.uid)) return;
      throw new Error('iskelet hiç vuramadı');
    };
    swing();
    expect(has(w, 'slow')).toBe(true);
    expect(has(w, 'stun')).toBe(true);
    w.statuses = [];
    swing();
    expect(has(w, 'slow')).toBe(true);
    expect(has(w, 'stun')).toBe(false);
  });

  it('Cold Grip: Skeleton yavaşlamış hedefe +%20 (koşullu kanca çağrıda)', () => {
    const b = make({ 3: 'undead' }, { 0: 'warrior' }, withTree(3, only('undead', { '4.u2': 1 })));
    const s = spawn(b, P(b, 3), 'raise_dead');
    expect(s.treeHooks).toEqual([expect.objectContaining({ h: 'cond', when: { targetStatus: 'slow' }, mod: { powerMul: num('undead', '4.u2', '0.mod.powerMul') } })]);
  });

  it('Pox Bloom: Skeleton ölünce son vurduğu düşmanın altına zehir zemini (2 tur)', () => {
    const b = make({ 3: 'undead' }, { 0: 'warrior', 1: 'mage' }, withTree(3, only('undead', { '4.r1': 1 })));
    const s = spawn(b, P(b, 3), 'raise_dead');
    const w = E(b, 0);
    w.hp = w.maxHp = 9000;
    let hit = false;
    for (let i = 0; i < 20 && !hit; i++) hit = cast(b, s, 'skeleton_strike', w).some((e) => e.type === 'damage' && e.source === s.uid);
    expect(hit).toBe(true);
    s.hp = 1;
    for (let i = 0; i < 10 && s.hp > 0; i++) cast(b, E(b, 1), 'fire_bolt', s);
    expect(s.hp).toBe(0);
    const g = grounds(b, 'poison');
    expect(g.length).toBe(1);
    expect(g[0]!.slots).toContain(w.slot);
    expect(g[0]!.turns).toBe(2);
  });

  it('Fresh Meat / Tomb Knight: yalnızca beslenmiş Skeleton +%15 can, +%15 güç ve Bone Slash bekleme süresiz', () => {
    const b = make({ 3: 'undead' }, { 0: 'warrior' }, withTree(3, only('undead', { '4.d1': 1, '4.d3': 1 })));
    const u = P(b, 3);
    const def = content.summons.skeleton!;
    const plain = make({ 3: 'undead' }, { 0: 'warrior' });
    expect(b.summonDefFor(u, def, true).stats.hp).toBe(Math.max(1, Math.round(plain.summonDefFor(P(plain, 3), def, true).stats.hp * 1.15)));
    expect(b.summonDefFor(u, def, false).stats.hp).toBe(plain.summonDefFor(P(plain, 3), def, false).stats.hp);
    const pv = b as unknown as Priv3;
    expect(pv.summonTree(u, 'skeleton', true)!.skills!.skeleton_slash!.cooldown).toBe(0);
    expect(pv.summonTree(u, 'skeleton', false)).toBeUndefined();
  });

  it('Hulking Frame / Grave Plate: Skeleton +%20 can, 1 tur fazla yaşar, +10 zırh ve Fortified iner; Bone Champion ile süresiz kalır', () => {
    const b = make({ 3: 'undead' }, { 0: 'warrior' }, withTree(3, only('undead', { '4.l1': 1, '4.l2': 1 })));
    const plain = make({ 3: 'undead' }, { 0: 'warrior' });
    const s0 = spawn(plain, P(plain, 3), 'raise_dead');
    const s = spawn(b, P(b, 3), 'raise_dead');
    expect(s.lifespan).toBe((s0.lifespan ?? 0) + 1);
    expect(s.maxHp).toBe(Math.max(1, Math.round(s0.maxHp * 1.2)));
    expect(s.stats.armor).toBe(s0.stats.armor + 10);
    expect(has(s, 'fortify')).toBe(true);
    const c = make({ 3: 'undead' }, { 0: 'warrior' }, withTree(3, only('undead', { '4.l1': 1, '4.l3': 1 })));
    expect(spawn(c, P(c, 3), 'raise_dead').lifespan).toBeUndefined();
  });

  it('ağaçsız çağrı aynı: kanca / yama / tetik yok', () => {
    const b = make({ 3: 'druid' }, { 0: 'warrior' });
    const t = spawn(b, P(b, 3), 'summon_treant');
    expect(t.skillDefs).toBeUndefined();
    expect(t.treeHooks).toBeUndefined();
    expect(t.statuses).toEqual([]);
  });
});
