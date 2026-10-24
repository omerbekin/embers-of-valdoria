import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import type { GroundEffect } from '../src/engine/types';

// Skill ağacı Faz 5a (engine-dev): C5 hedef / alan / aura (k 'hook', h 'target': derleme anında skill / pasif kopyası yamalanır) ve C6 kural
// (h 'rule') sözlüğü + 4c'den kalan çağrı düğümleri. Her test YALNIZCA verilen düğümlerin fx'iyle derler.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(cls: string, ranks: Record<string, number>): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
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
function untilTurn(b: Battle, c: Combatant, max = 30): void {
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
}
function nextTurn(b: Battle, c: Combatant): BattleEvent[] {
  const from = b.log.length;
  if (b.currentActor === c) expect(b.skipTurn().ok).toBe(true);
  untilTurn(b, c);
  return b.log.slice(from);
}
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const dmgTo = (evs: BattleEvent[], t: Combatant): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === t.uid ? e.amount + e.absorbed : 0), 0);
const hitUids = (evs: BattleEvent[], src: Combatant): Set<string> => new Set(evs.flatMap((e) => (e.type === 'damage' && e.source === src.uid && e.amount + e.absorbed > 0 ? [e.target] : [])));
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Combatant['statuses'][number], emit: (e: BattleEvent) => void, cause?: string): void;
  ground: GroundEffect[];
}
const X = (b: Battle): Priv => b as unknown as Priv;
const emitOf = (b: Battle) => (e: BattleEvent) => X(b).record(e);
const debuff = (b: Battle, t: Combatant, kind: string, turns: number, src: Combatant): void => X(b).addStatus(t, { kind, turns, source: src.uid } as Combatant['statuses'][number], emitOf(b));
/** Alan skill'inin anchor başına en büyük hücre kümesi. */
const maxArea = (b: Battle, skill: string, uid?: string): number[] => {
  let best: number[] = [];
  for (let s = 0; s < content.CELL_COUNT; s++) {
    const c = b.areaCells(skill, s, 'enemy', uid);
    if (c.length > best.length) best = c;
  }
  return best;
};

describe('Faz 5a: derleyici', () => {
  const bad = (cls: string, key: string, fx: unknown): string[] => {
    const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
    t.nodes[key]!.fx = fx as TreeData['nodes'][string]['fx'];
    return checkTreeFx(t);
  };
  it('kural: bilinmeyen tür / alan, çağrı kuralı çağrısız, intercept kapsamsız reddedilir', () => {
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'rule', rule: 'fly' }]).length).toBeGreaterThan(0);
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'rule', rule: 'luck', add: 0.2, by: 1 }]).length).toBeGreaterThan(0);
    expect(bad('druid', '4.r3', [{ k: 'hook', h: 'rule', rule: 'actions', n: 2 }]).length).toBeGreaterThan(0);
    expect(bad('defender', '3.ma', [{ k: 'hook', h: 'rule', rule: 'intercept' }]).length).toBeGreaterThan(0);
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'rule', rule: 'immune', statuses: ['stun'], pull: true, when: { stillStreakAtLeast: 4 } }])).toEqual([]);
  });
  it('hedef: alan olmayan skill\'e alan, rastgele olmayana öncelik, taraf değiştiren hedef reddedilir', () => {
    expect(bad('druid', '1.v', [{ k: 'hook', h: 'target', area: { rows: 2 } }]).length).toBeGreaterThan(0);
    expect(bad('druid', '1.v', [{ k: 'hook', h: 'target', priority: 'armor' }]).length).toBeGreaterThan(0);
    expect(bad('druid', '1.v', [{ k: 'hook', h: 'target', target: 'all_allies' }]).length).toBeGreaterThan(0);
    expect(bad('mage', '2.fb', [{ k: 'hook', h: 'target', area: { cols: 4 } }]).length).toBeGreaterThan(0);
  });
  it('eylem: strike / rows / wide / summoner sözlükte; count yalnızca sayılı hedeflerde', () => {
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ strike: 0.5, hits: 2, pierce: true, to: 'nearestEnemy' }] }])).toEqual([]);
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ strike: 0.5, count: 2, to: 'outsideArea' }] }])).toEqual([]);
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ strike: 0.5, count: 2, to: 'target' }] }]).length).toBeGreaterThan(0);
    expect(bad('warrior', '0.mb', [{ k: 'hook', h: 'trigger', on: 'kill', do: [{ heal: 0.1, rows: 2, to: 'target' }] }]).length).toBeGreaterThan(0);
  });
});

describe('Faz 5a: C5 alan / hedef', () => {
  it('Howling Squall: Blizzard alanı 3 x 3 (ağaçlı birimin uid\'iyle), 20 MP; ağaçsız birimde alan aynı', () => {
    const b = make({ 0: 'mage', 1: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', { '2.fb': 1 })));
    const base = maxArea(b, 'blizzard', P(b, 1).uid);
    const tree = maxArea(b, 'blizzard', P(b, 0).uid);
    expect(base).toHaveLength(6);
    expect(tree).toHaveLength(9);
    expect(maxArea(b, 'blizzard')).toEqual(base);
    expect(b.skill('blizzard', P(b, 0).uid)!.cost.amount).toBe(20);
  });

  it('Broad Sentence (2026-10-24: 3.mb, Judgment hedefinin sol + sağ hücresi; open-questions 416/6); Earthsplitter satır + sütun, global, Slow 3', () => {
    const b = make({ 0: 'paladin', 1: 'paladin' }, { 0: 'warrior' }, withTree(0, only('paladin', { '3.mb': 1 })));
    expect(maxArea(b, 'judgment', P(b, 1).uid)).toHaveLength(1);
    expect(maxArea(b, 'judgment', P(b, 0).uid)).toHaveLength(3);
    const d = make({ 0: 'defender' }, { 0: 'mage', 1: 'mage', 2: 'mage', 3: 'mage', 9: 'mage' }, withTree(0, only('defender', { '1.v': 1 })));
    const me = P(d);
    const row = d.areaCells('tremor_slam', 0, 'enemy');
    const cross = d.areaCells('tremor_slam', 0, 'enemy', me.uid);
    expect(cross.length).toBeGreaterThan(row.length);
    for (const s of row) expect(cross).toContain(s);
    const evs = cast(d, me, 'tremor_slam', undefined, 0);
    const hit = hitUids(evs, me);
    const struck = d.combatants.filter((c) => c.side === 'enemy' && cross.includes(c.slot));
    expect(struck.length).toBeGreaterThan(row.filter((s) => E(d, s)).length);
    for (const c of struck) if (hit.has(c.uid)) expect(c.statuses.find((s) => s.kind === 'slow')?.turns).toBe(3);
  });

  it('Thornstorm Lash: Thorn Whip 3 rastgele düşmana %45, Wound yok; önizleme aynı yoldan', () => {
    const b = make({ 0: 'druid' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior' }, withTree(0, only('druid', { '1.v': 1 })));
    const me = P(b);
    const def = b.skill('thorn_whip', me.uid)!;
    expect(def.target).toBe('random_enemies');
    expect(def.count).toBe(3);
    expect(b.needsTargetChoice('thorn_whip', me.uid)).toBe(false);
    const evs = cast(b, me, 'thorn_whip');
    expect(evs.filter((e) => (e.type === 'damage' || e.type === 'miss' || e.type === 'dodge') && e.source === me.uid).length).toBeGreaterThanOrEqual(3);
    expect(b.combatants.some((c) => c.side === 'enemy' && has(c, 'wound'))).toBe(false);
  });

  it('Thin Plague: Withering Curse her düşmana (önizleme hepsini sayar), yarım hasar, Wither 1 tur', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior', 5: 'warrior', 11: 'warrior' }, withTree(0, only('hexer', { '2.fa': 1 })));
    const me = P(b);
    expect(b.isAreaSkill('withering_curse', me.uid)).toBe(false);
    expect(b.isAreaSkill('withering_curse')).toBe(true);
    expect(previewSkill(b, me.uid, 'withering_curse')).toHaveLength(3);
    cast(b, me, 'withering_curse');
    for (const s of [0, 5, 11]) if (has(E(b, s), 'wither')) expect(E(b, s).statuses.find((x) => x.kind === 'wither')!.turns).toBe(1);
  });

  it('Femur Chain: Bone Throw hedefe ve arkasındakine, ikisi de 3 tur Slow', () => {
    let ok = false;
    for (let seed = 1; seed <= 20 && !ok; seed++) {
      const b = make({ 0: 'undead' }, { 0: 'warrior', 3: 'warrior' }, withTree(0, only('undead', { '1.v': 1 })), seed);
      const me = P(b);
      const evs = cast(b, me, 'bone_throw', E(b, 0));
      const hit = hitUids(evs, me);
      if (hit.has(E(b, 0).uid) && hit.has(E(b, 3).uid)) {
        ok = true;
        expect(E(b, 3).statuses.find((s) => s.kind === 'slow')?.turns).toBe(3);
      }
    }
    expect(ok).toBe(true);
  });

  it('Plate Hunter: Fist Crush önce en zırhlıya (3 hedef seçimi, zar yok)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const b = make({ 0: 'defender' }, { 0: 'mage', 1: 'mage', 2: 'mage', 3: 'defender' }, withTree(0, only('defender', { '4.d1': 1 })), seed);
      const me = P(b);
      const evs = cast(b, me, 'fist_crush');
      const targeted = new Set(evs.flatMap((e) => ((e.type === 'damage' || e.type === 'miss' || e.type === 'dodge') && e.source === me.uid ? [e.target] : [])));
      expect(targeted.has(E(b, 3).uid), `seed ${seed}`).toBe(true);
    }
  });
});

describe('Faz 5a: C5 aura / Guard / fırlatma / smite', () => {
  it('Diagonal Guard: Bulwark Aura çapraz dosta da; Drilled Ranks dosta büyü zırhı (kendine değil)', () => {
    const arm = (ranks: Record<string, number>): { ally: Combatant['stats']; me: Combatant['stats'] } => {
      const b = make({ 4: 'defender', 0: 'mage' }, { 0: 'warrior' }, withTree(4, only('defender', ranks)));
      return { ally: b.effectiveStats(P(b, 0)), me: b.effectiveStats(P(b, 4)) };
    };
    const base = arm({});
    expect(arm({ '0.eb': 1 }).ally.armor).toBeGreaterThan(base.ally.armor);
    const mr = arm({ '0.eb': 1, '0.f2': 3 });
    expect(mr.ally.magicArmor ?? 0).toBeGreaterThan(arm({ '0.eb': 1 }).ally.magicArmor ?? 0);
    expect(mr.me.magicArmor ?? 0).toBe(arm({ '0.eb': 1 }).me.magicArmor ?? 0);
  });

  it('Second Chain + Interlocked: Close Ranks kendi sıradaki dostları da korur; korunana zırh', () => {
    const b = make({ 0: 'defender', 1: 'mage', 6: 'mage' }, { 0: 'warrior' }, withTree(0, only('defender', { '3.n0': 1, '3.f1': 3 })));
    const me = P(b);
    const before = b.effectiveStats(P(b, 6)).armor;
    cast(b, me, 'close_ranks', P(b, 6));
    expect(has(P(b, 6), 'guard')).toBe(true);
    expect(has(P(b, 1), 'guard')).toBe(true);
    expect(b.effectiveStats(P(b, 6)).armor).toBeGreaterThan(before);
  });

  it('Thrown Stiletto / Weighted / Death From Afar: arkası dolu hedefe Backstab; fırlatma Wound verir; l3 cezayı kaldırır', () => {
    const party = { 0: 'cutthroat' };
    const foes = { 0: 'warrior', 3: 'warrior' };
    const plain = make(party, foes);
    expect(plain.validTargets(P(plain).uid, 'backstab').map((c) => c.uid)).not.toContain(E(plain, 0).uid);
    const hit = (ranks: Record<string, number>): { dmg: number; wound: boolean } => {
      const b = make(party, foes, withTree(0, only('cutthroat', ranks)), 3);
      const t = E(b, 0);
      t.hp = t.maxHp = 9000;
      const evs = cast(b, P(b), 'backstab', t);
      return { dmg: dmgTo(evs, t), wound: has(t, 'wound') };
    };
    const l1 = hit({ '4.l1': 1 });
    const l3 = hit({ '4.l1': 1, '4.l2': 1, '4.l3': 1 });
    expect(l1.dmg).toBeGreaterThan(0);
    expect(l1.wound).toBe(false);
    expect(hit({ '4.l1': 1, '4.l2': 1 }).wound).toBe(true);
    expect(l3.wound).toBe(true);
    expect(l3.dmg).toBeGreaterThan(l1.dmg);
  });

  it('Twofold Light: Divine Light tur başında canı en düşük düşmana kutsal hasar', () => {
    const b = make({ 0: 'paladin' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('paladin', { '0.ea': 1 })), 11, 'turns');
    const me = P(b);
    E(b, 1).hp = Math.round(E(b, 1).maxHp / 2);
    const evs = nextTurn(b, me);
    const smite = evs.filter((e) => e.type === 'damage' && e.source === me.uid);
    expect(smite.length).toBeGreaterThan(0);
    expect(smite[0]!.type === 'damage' && smite[0]!.target).toBe(E(b, 1).uid);
  });
});

describe('Faz 5a: C6 kurallar', () => {
  it('Not Today: ölümcül vuruşta 1 can + Fortified 1 tur, savaşta bir kez', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.mb': 1 })));
    const me = P(b);
    const m = E(b);
    me.hp = 1;
    for (let i = 0; i < 10 && !has(me, 'fortify'); i++) cast(b, m, 'fire_bolt', me);
    expect(me.hp).toBe(1);
    expect(has(me, 'fortify')).toBe(true);
    for (let i = 0; i < 10 && me.hp > 0; i++) cast(b, m, 'fire_bolt', me);
    expect(me.hp).toBe(0);
  });

  it('Iron Will: Stun 1 tur kısa (1 turluk Stun hiç tutmaz), alınan şifa -%20', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.fb': 1 })));
    const me = P(b);
    debuff(b, me, 'stun', 1, E(b));
    expect(has(me, 'stun')).toBe(false);
    debuff(b, me, 'slow', 3, E(b));
    expect(me.statuses.find((s) => s.kind === 'slow')?.turns).toBe(2);
    expect(me.treeHooks).toEqual(expect.arrayContaining([expect.objectContaining({ h: 'heal', on: 'healTaken', mul: -0.2 })]));
  });

  it('Executioner\'s Calm: Headsman\'s Blow sonrası sıradaki turuna kadar düşman debuff\'ı tutmaz', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '4.d3': 1 })), 11, 'turns');
    const me = P(b);
    untilTurn(b, me);
    me.rage = me.maxRage ?? 100;
    cast(b, me, 'headsmans_blow', E(b));
    debuff(b, me, 'slow', 2, E(b));
    expect(has(me, 'slow')).toBe(false);
    nextTurn(b, me);
    debuff(b, me, 'slow', 2, E(b));
    expect(has(me, 'slow')).toBe(true);
  });

  it('Final Shield: korunan dost ölecekken ölümcül vuruşun tamamını Defender alır', () => {
    const b = make({ 0: 'defender', 1: 'mage' }, { 0: 'mage' }, withTree(0, only('defender', { '3.ma': 1 })));
    const me = P(b);
    const ally = P(b, 1);
    cast(b, me, 'close_ranks', ally);
    ally.hp = 1;
    const hp0 = me.hp;
    for (let i = 0; i < 10 && me.hp === hp0; i++) cast(b, E(b), 'fire_bolt', ally);
    expect(ally.hp).toBe(1);
    expect(me.hp).toBeLessThan(hp0);
  });

  it('Through the Guard: Piercing Arrow Fortified\'ı yok sayar (aynı seed, aynı hasar)', () => {
    const shot = (tree: boolean, fort: boolean, seed: number): number => {
      const b = make({ 0: 'archer' }, { 0: 'warrior' }, tree ? withTree(0, only('archer', { '2.mb': 1 })) : {}, seed);
      const t = E(b);
      t.hp = t.maxHp = 9000;
      if (fort) X(b).addStatus(t, { kind: 'fortify', turns: 3, source: t.uid } as Combatant['statuses'][number], emitOf(b));
      return dmgTo(cast(b, P(b), 'piercing_arrow', undefined, 0), t);
    };
    let seed = 1;
    while (seed < 40 && !(shot(false, false, seed) > 0 && shot(true, false, seed) > 0)) seed++;
    expect(shot(false, true, seed)).toBeLessThan(shot(false, false, seed));
    expect(shot(true, true, seed)).toBe(shot(true, false, seed));
  });

  it('Gathering Mark: Doom Mark önce 2 diğer düşmandan 1\'er Omen çeker', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, withTree(0, only('hexer', { '4.r1': 1 })));
    const me = P(b);
    for (const s of [1, 2]) X(b).addStatus(E(b, s), { kind: 'omen', turns: 99, stacks: 2, source: me.uid } as Combatant['statuses'][number], emitOf(b));
    const stacks = (c: Combatant): number => c.statuses.find((s) => s.kind === 'omen')?.stacks ?? 0;
    cast(b, me, 'doom_mark', E(b, 0));
    expect(stacks(E(b, 1))).toBe(1);
    expect(stacks(E(b, 2))).toBe(1);
  });

  it('Endless Rattle: Double Hit zinciri kuralı derlenir', () => {
    expect(only('gambler', { '1.n0': 1 })!.hooks).toEqual([expect.objectContaining({ h: 'rule', rule: 'repeatChain' })]);
  });
});

describe('Faz 5a: çağrı düğümleri (4c kalanları)', () => {
  const summonOf = (b: Battle, owner: Combatant): Combatant | undefined => b.combatants.find((c) => c.summoned && c.owner === owner.uid && c.hp > 0);

  it('Crashing Arrival / Oakfall / Falling Oak: Treant inişte ön sıra(lar)a Druid INT\'iyle doğa hasarı; Falling Oak karşısındakini sersemletir', () => {
    const foes = { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior', 4: 'warrior', 5: 'warrior' };
    const land = (ranks: Record<string, number>): { b: Battle; evs: BattleEvent[]; t: Combatant } => {
      const b = make({ 3: 'druid' }, foes, withTree(3, only('druid', ranks)));
      const evs = cast(b, P(b, 3), 'summon_treant');
      return { b, evs, t: summonOf(b, P(b, 3))! };
    };
    const u1 = land({ '4.u1': 1 });
    const front1 = hitUids(u1.evs, u1.t);
    expect(front1.has(E(u1.b, 0).uid) || front1.has(E(u1.b, 1).uid)).toBe(true);
    expect(front1.has(E(u1.b, 3).uid)).toBe(false);
    const u2 = land({ '4.u1': 1, '4.u2': 1 });
    expect(u2.t.treeHooks!.filter((h) => h.h === 'trigger')).toHaveLength(1);
    const u3 = land({ '4.u1': 1, '4.u2': 1, '4.u3': 1 });
    expect(u3.b.combatants.some((c) => c.side === 'enemy' && has(c, 'stun'))).toBe(true);
  });

  it('Wrathful Oak: Treant tur başına iki eylem, 2 tur yaşar; Living Bomb: Treant dururken yeniden çağrı eskisini patlatır', () => {
    const b = make({ 3: 'druid' }, { 0: 'warrior' }, withTree(3, only('druid', { '4.r3': 1 })));
    const t = summonOf(b, (cast(b, P(b, 3), 'summon_treant'), P(b, 3)))!;
    expect(t.actionsPerTurn).toBe(2);
    expect(b.skill('summon_treant', P(b, 3).uid)!.effects.find((e) => e.type === 'summon')).toMatchObject({ lifespan: 2 });
    const lb = make({ 3: 'druid' }, { 0: 'warrior' }, withTree(3, only('druid', { '4.d3': 1 })));
    const d = P(lb, 3);
    cast(lb, d, 'summon_treant');
    const first = summonOf(lb, d)!;
    cast(lb, d, 'summon_treant');
    expect(first.hp).toBe(0);
    expect(summonOf(lb, d)).toBeTruthy();
  });

  it('Guardian Oak: Treant arkasındaki dostun aldığı hasarın yarısını üstlenir', () => {
    const took = (tree: boolean): number => {
      const b = make({ 0: 'druid', 6: 'mage' }, { 0: 'mage' }, tree ? withTree(0, only('druid', { '4.l3': 1 })) : {}, 7);
      const d = P(b, 0);
      cast(b, d, 'summon_treant', undefined);
      const t = summonOf(b, d)!;
      t.slot = 3; // çağrı yeri dizilime bağlı: Treant'ı dostun hemen önüne koy
      const behind = P(b, 6);
      behind.hp = behind.maxHp = 9000;
      t.hp = t.maxHp = 9000;
      for (let i = 0; i < 10 && behind.hp === 9000; i++) cast(b, E(b), 'fire_bolt', behind);
      expect(behind.hp).toBeLessThan(9000);
      return 9000 - t.hp;
    };
    expect(took(false)).toBe(0);
    expect(took(true)).toBeGreaterThan(0);
  });

  it('Spore Cloud: Pox Bloom zemini son vurulanın yanındaki hücrelere de; Empty Grave cesetsiz beslenmiş Skeleton (+8 MP)', () => {
    const tree = only('undead', { '4.r1': 1, '4.r2': 1 })!;
    const h = tree.hooks!.filter((x) => x.h === 'trigger');
    expect(h).toHaveLength(1);
    expect((h[0] as { do: Array<{ wide?: string }> }).do[0]!.wide).toBe('beside');
    const b = make({ 0: 'undead' }, { 0: 'warrior' }, withTree(0, only('undead', { '4.d2': 1 })));
    const me = P(b);
    me.mp = 15;
    expect(b.summonPreview(me.uid, 'raise_dead').empowered).toBe(false); // 8 + 8 MP yetmiyor
    me.mp = me.maxMp;
    expect(b.summonPreview(me.uid, 'raise_dead').empowered).toBe(true);
    const mp0 = me.mp;
    const r = b.useSkill(me.uid, 'raise_dead');
    expect(r.ok).toBe(true);
    const s = summonOf(b, me)!;
    expect(s).toBeTruthy();
    expect(s.empowered).toBe(true);

    expect(mp0 - me.mp).toBe(content.skills.raise_dead!.cost.amount + 8); // bedel veriden (2026-10-24 mana turu: 8 -> 20) + Empty Grave 8
  });
});

describe('Faz 5a: ağaçsız birim aynı', () => {
  it('ağaçsız birimde skill / alan / önizleme tanımı temel tanımdır', () => {
    const b = make({ 0: 'mage', 1: 'defender' }, { 0: 'warrior' });
    expect(b.skill('blizzard', P(b).uid)).toBe(b.skill('blizzard'));
    expect(maxArea(b, 'tremor_slam', P(b, 1).uid)).toEqual(maxArea(b, 'tremor_slam'));
  });
});

describe('Faz 5a: ek sözlük (hitsEach, merkez kritikleri, tekrar sırası, taşma, çalma, yenilenme, Rest)', () => {
  interface Priv2 { fireOverflow(o: Combatant, a: Combatant, emit: (e: BattleEvent) => void): void }
  const acts = (evs: BattleEvent[], src: Combatant, t: Combatant): number => evs.filter((e) => (e.type === 'damage' || e.type === 'miss' || e.type === 'dodge') && e.source === src.uid && e.target === t.uid).length;
  const xFoes = { 0: 'warrior', 2: 'warrior', 4: 'warrior', 6: 'warrior', 8: 'warrior' };
  const tank = (b: Battle): void => b.combatants.filter((c) => c.side === 'enemy').forEach((c) => (c.hp = c.maxHp = 90000));

  it("Butcher's Cross: Saltire Cut X'teki her düşmana iki kez (ağaçsız: köşeye bir kez)", () => {
    for (const tree of [false, true]) {
      const b = make({ 0: 'cutthroat' }, xFoes, tree ? withTree(0, only('cutthroat', { '2.v': 1 })) : {});
      tank(b);
      const me = P(b);
      const evs = cast(b, me, 'x_cut', undefined, 4);
      for (const s of [0, 2, 6, 8]) expect(acts(evs, me, E(b, s)), `tree ${tree} slot ${s}`).toBe(tree ? 2 : 1);
      expect(acts(evs, me, E(b, 4))).toBe(2);
    }
    // önizleme aynı yoldan: köşe hasarı ağaçta (power 0.35 x 2) ağaçsızdan (0.45 x 1) büyük
    const corner = (tree: boolean): number => {
      const b = make({ 0: 'cutthroat' }, xFoes, tree ? withTree(0, only('cutthroat', { '2.v': 1 })) : {});
      tank(b);
      return previewSkill(b, P(b).uid, 'x_cut', undefined, 4, 'enemy').find((p) => p.uid === E(b, 0).uid)!.damage!.avg;
    };
    expect(corner(true) / corner(false)).toBeCloseTo((0.35 * 2) / 0.45, 1);
  });

  it('X Marks the Throat: iki merkez vuruşu da kritikse merkeze zırh delen üçüncü vuruş (kullanım başına bir)', () => {
    for (const tree of [false, true]) {
      const b = make({ 0: 'cutthroat' }, xFoes, tree ? withTree(0, only('cutthroat', { '2.ma': 1 })) : {});
      tank(b);
      Object.assign(b.debug, { crit: 'always', miss: 'never', dodge: 'never' });
      const me = P(b);
      const evs = cast(b, me, 'x_cut', undefined, 4);
      expect(acts(evs, me, E(b, 4)), `tree ${tree}`).toBe(tree ? 3 : 2);
      expect(acts(evs, me, E(b, 0))).toBe(1);
      if (tree) expect(acts(cast(b, me, 'x_cut', undefined, 4), me, E(b, 4))).toBe(3);
    }
  });

  it('Boxcars: Loaded Dice 3+ kez atınca başka bir düşmana bir vuruş (yalnız o kullanımlarda)', () => {
    const b = make({ 0: 'gambler' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('gambler', { '1.n0': 1, '1.ma': 1 })), 5);
    tank(b);
    Object.assign(b.debug, { miss: 'never', dodge: 'never' });
    const me = P(b);
    let big = 0;
    for (let i = 0; i < 150; i++) {
      const evs = cast(b, me, 'loaded_dice', E(b, 0));
      const throws = acts(evs, me, E(b, 0));
      const other = acts(evs, me, E(b, 1));
      expect(other, `cast ${i}: ${throws} throws`).toBe(throws >= 3 ? 1 : 0);
      if (throws >= 3) big++;
    }
    expect(big).toBeGreaterThan(0);
  });

  it("Conduit: Mana Overflow tüm havuzu en az MP'li dosta döker; Spillover taşanı en az MP'liye aktarır", () => {
    const party = { 0: 'antimage', 1: 'mage', 2: 'druid' };
    const run = (ranks: Record<string, number> | null): { mage: number; druid: number; mana: number } => {
      const b = make(party, { 0: 'warrior' }, ranks ? withTree(0, only('antimage', ranks)) : {});
      const me = P(b);
      const mage = P(b, 1);
      const druid = P(b, 2);
      me.mp = me.maxMp - 1;
      mage.mp = 0;
      druid.mp = druid.maxMp - 1;
      const m0 = mage.mp;
      const d0 = druid.mp;
      (b as unknown as Priv2).fireOverflow(me, E(b, 0), emitOf(b));
      const pe = me.passive!.effect as { mana: number };
      return { mage: mage.mp - m0, druid: druid.mp - d0, mana: pe.mana };
    };
    const plain = run(null);
    expect(plain.mage).toBe(plain.mana);
    expect(plain.druid).toBe(1);
    const conduit = run({ '0.ea': 1 });
    expect(conduit.mage).toBe(conduit.mana * 3);
    expect(conduit.druid).toBe(0);
    const spill = run({ '0.eb': 1 });
    expect(spill.druid).toBe(1);
    expect(spill.mage).toBe(spill.mana + (spill.mana - 1) * 2);
  });

  it("Grand Theft: Void Strike hedefin buff'larını çalıp takıma dağıtır", () => {
    const b = make({ 0: 'antimage', 1: 'mage' }, { 0: 'warrior' }, withTree(0, only('antimage', { '4.l3': 1 })));
    tank(b);
    Object.assign(b.debug, { miss: 'never', dodge: 'never' });
    const me = P(b);
    const foe = E(b, 0);
    debuff(b, foe, 'haste', 3, foe);
    debuff(b, foe, 'fortify', 3, foe);
    cast(b, me, 'void_strike', foe);
    expect(has(foe, 'haste') || has(foe, 'fortify')).toBe(false);
    expect(has(me, 'haste')).toBe(true);
    expect(has(P(b, 1), 'fortify')).toBe(true);
  });

  it('Spreading Roots: Rejuvenate yenilenmesi hedefin komşularına yarı güçte', () => {
    const b = make({ 0: 'druid', 1: 'warrior', 2: 'warrior', 4: 'warrior', 5: 'warrior' }, { 0: 'warrior' }, withTree(0, only('druid', { '3.ea': 1 })));
    const me = P(b);
    cast(b, me, 'rejuvenate', P(b, 1));
    const regen = (c: Combatant) => c.statuses.find((s) => s.kind === 'regen') as { amount?: number } | undefined;
    const full = regen(P(b, 1))!.amount!;
    expect(regen(P(b, 2))!.amount).toBe(Math.round(full / 2));
    expect(regen(P(b, 4))).toBeTruthy();
    expect(regen(P(b, 5))).toBeUndefined();
  });

  it('Spendthrift: Rest yarı MP verir; Loaded Dice 6 MP', () => {
    const rest = (tree: boolean): number => {
      const b = make({ 0: 'gambler' }, { 0: 'warrior' }, tree ? withTree(0, only('gambler', { '1.fb': 1 })) : {});
      const me = P(b);
      me.mp = 0;
      expect(b.useSkill(me.uid, 'rest').ok).toBe(true);
      return me.mp;
    };
    const full = rest(false);
    expect(full).toBeGreaterThan(0);
    expect(rest(true)).toBe(Math.round(full / 2));
    const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '1.fb': 1 })));
    expect(b.skill('loaded_dice', P(b).uid)!.cost?.amount).toBe(6);
  });

  it('Sea of Fire: Meteor zemini artıya değen hücreleri de kaplar; Flung Embers alan dışı bir düşmana hasar + Burning', () => {
    const foes = { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior', 4: 'warrior', 5: 'warrior', 9: 'warrior' };
    const cellsOf = (tree: boolean): number => {
      const b = make({ 0: 'mage' }, foes, tree ? withTree(0, only('mage', { '4.u3': 1 })) : {});
      tank(b);
      cast(b, P(b), 'meteor', undefined, 4);
      return new Set(X(b).ground.filter((g) => g.ground === 'burning').flatMap((g) => g.slots)).size;
    };
    expect(cellsOf(true)).toBeGreaterThan(cellsOf(false));
    const b = make({ 0: 'mage' }, foes, withTree(0, only('mage', { '4.d1': 1 })));
    tank(b);
    Object.assign(b.debug, { miss: 'never', dodge: 'never' });
    const me = P(b);
    const evs = cast(b, me, 'meteor', undefined, 1);
    const outside = [E(b, 3), E(b, 5), E(b, 9)].filter((c) => dmgTo(evs, c) > 0);
    expect(outside.length).toBe(1);
    expect(has(outside[0]!, 'burning')).toBe(true);
  });

  it('Pledged Plate: kendi zırhı %30 düşük, auradaki dost zırhın tamamını alır', () => {
    const party = { 0: 'defender', 1: 'mage' };
    const plain = make(party, { 0: 'warrior' });
    const b = make(party, { 0: 'warrior' }, withTree(0, only('defender', { '0.fb': 1 })));
    expect(P(b).stats.armor).toBeCloseTo(P(plain).stats.armor * 0.7, 3);
    expect(b.effectiveStats(P(b, 1)).armor - P(b, 1).stats.armor).toBeCloseTo(P(b).stats.armor, 0);
  });

  it("Mass Hush: Drain Field 3+ hedefi 0 MP'ye indirirse onları Silence'lar", () => {
    const foes = { 0: 'mage', 1: 'mage', 2: 'mage' };
    const b = make({ 0: 'antimage' }, foes, withTree(0, only('antimage', { '2.mb': 1 })));
    tank(b);
    for (const s of [0, 1, 2]) E(b, s).mp = 1;
    cast(b, P(b), 'drain_field', undefined, 0);
    for (const s of [0, 1, 2]) {
      expect(E(b, s).mp).toBe(0);
      expect(has(E(b, s), 'silence'), `slot ${s}`).toBe(true);
    }
  });

  it('Mark of Many: Doom Mark diğer her düşmandan 1 Omen çeker', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior' }, withTree(0, only('hexer', { '4.r3': 1 })));
    tank(b);
    const me = P(b);
    for (const s of [1, 2, 3]) X(b).addStatus(E(b, s), { kind: 'omen', turns: 3, source: me.uid, stacks: 1 } as Combatant['statuses'][number], emitOf(b));
    cast(b, me, 'doom_mark', E(b, 0));
    for (const s of [1, 2, 3]) expect(has(E(b, s), 'omen'), `slot ${s}`).toBe(false);
  });
});
