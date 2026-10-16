import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, CombatantDef, PassiveEffect, Teams } from '../src/engine';
import { ENCOUNTERS, validateEncounters } from '../src/campaign';
import valdoria from '../data/campaign/valdoria.json';

// Bölge III (The Northern Heights) mob / boss pasifleri YM20-YM23 ve doğrulama maddeleri D10-D13 (docs/design/campaign/mob-plan.md 10;
// campaign-dev 2026-10-17). Sayılar veriden okunur (data/mobs, data/bosses, data/skills.json).

const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.bosses[id] ?? content.summons[id] ?? content.classes[id])!;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const effectOf = <T extends PassiveEffect['type']>(id: string, type: T) => {
  const e = unitDef(id).passive!.effect;
  expect(e.type, id).toBe(type);
  return e as Extract<PassiveEffect, { type: T }>;
};

function arena(party: [string, number][], enemies: [string, number][], mode: BattleMode = 'test', seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, mode, { party: [], enemies: [] }, false);
  return new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
}
/** Her vuruş isabet eder, kritik yok, Lucky Escape / Resilience yok; canlar büyük. */
function sure(b: Battle, hp = 5000): Battle {
  b.debug.crit = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  for (const c of b.combatants) c.hp = c.maxHp = hp;
  return b;
}
const unit = (b: Battle, uid: string): Combatant => b.get(uid)!;
const since = (b: Battle, n: number) => b.log.slice(n);
const hitOn = (b: Battle, n: number, target: string) => ofType(since(b, n), 'damage').filter((x) => x.target === target).reduce((t, x) => t + x.amount, 0);

describe('YM20 Close Ranks (Morvane Halberdier, Sworn Guard)', () => {
  it('aynı sıradaki her diğer canlı dost için alınan hasar -perAlly; başka sıradaki dost sayılmaz; dost ölünce kalkar', () => {
    const e = effectOf('morvane_halberdier', 'closeRanks');
    expect(effectOf('sworn_guard', 'closeRanks').perAlly).toBe(e.perAlly);
    const b = sure(arena([['archer', 1]], [['morvane_halberdier', 0], ['stonebound_warden', 1], ['morvane_halberdier', 2], ['bandit_crossbowman', 7]]));
    const h = unit(b, 'enemy-0');
    expect(b.rowMatesOf(h)).toBe(2);
    expect(b.passiveTakenMult(h)).toBeCloseTo(1 - 2 * e.perAlly, 10);
    expect(b.passiveTakenMult(unit(b, 'enemy-1'))).toBe(1); // Stonebound'un pasifi başka
    unit(b, 'enemy-1').hp = 0;
    expect(b.passiveTakenMult(h)).toBeCloseTo(1 - e.perAlly, 10);
    unit(b, 'enemy-2').hp = 0;
    expect(b.passiveTakenMult(h)).toBe(1);
  });

  it('gerçek vuruş da azalır (aynı seed, sıra dolu / yalnız)', () => {
    const hit = (full: boolean) => {
      const b = sure(arena([['archer', 1]], full ? [['morvane_halberdier', 0], ['morvane_halberdier', 1]] : [['morvane_halberdier', 0], ['morvane_halberdier', 4]]));
      const n = b.log.length;
      b.useSkill('party-0', 'quick_shot', 'enemy-0');
      return hitOn(b, n, 'enemy-0');
    };
    const per = effectOf('morvane_halberdier', 'closeRanks').perAlly;
    expect(Math.abs(hit(true) - hit(false) * (1 - per))).toBeLessThanOrEqual(1);
  });
});

describe('YM21 Blood Scent (Ash Hound)', () => {
  it('canı eşiğin altındaki hedefe +bonus; üstünde ve dostta yok', () => {
    const e = effectOf('ash_hound', 'bloodScent');
    const b = sure(arena([['archer', 1]], [['ash_hound', 1]]));
    const hound = unit(b, 'enemy-0');
    const hero = unit(b, 'party-0');
    expect(b.dealtDamageMult(hound, hero)).toBe(1);
    hero.hp = Math.floor(hero.maxHp * e.below) - 1;
    expect(b.dealtDamageMult(hound, hero)).toBeCloseTo(1 + e.bonus, 10);
    expect(b.passiveDealtMult(hound, hound)).toBe(1);
  });
});

describe('YM22 Molten Shed (Drake Priest)', () => {
  it('savaşta bir kez: düşman skill vuruşu canı eşiğin altına indirince tüm kahramanlara sabit ateş (origin status) + kendine Fortified', () => {
    const e = effectOf('drake_priest', 'moltenShed');
    const b = sure(arena([['archer', 1], ['mage', 7]], [['drake_priest', 7]]));
    const priest = unit(b, 'enemy-0');
    priest.hp = Math.ceil(priest.maxHp * e.below) + 5;
    let n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(priest.hp).toBeLessThan(e.below * priest.maxHp);
    const ev = since(b, n);
    expect(ofType(ev, 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'molten_shed')).toBe(true);
    for (const uid of ['party-0', 'party-1']) {
      const burst = ofType(ev, 'damage').filter((x) => x.target === uid && x.source === 'enemy-0' && x.origin === 'status');
      expect(burst.length, uid).toBe(1);
      expect(burst[0]!.amount).toBeGreaterThan(0);
    }
    expect(priest.statuses.some((s) => s.kind === e.status)).toBe(true);
    expect(priest.passiveUsed).toBe(true);
    // ikinci kez tetiklenmez
    n = b.log.length;
    b.useSkill('party-1', 'fire_bolt', 'enemy-0');
    expect(ofType(since(b, n), 'passive').some((x) => x.passive === 'molten_shed')).toBe(false);
    expect(describePassive(content.mobs.drake_priest!.passive!, content.mobs.drake_priest!.stats, content.formulas)).toContain('Once per battle');
  });
});

describe('YM23 Crown of Ash (Lord Morvane)', () => {
  it('çağrı olmayan dost ölünce maks canın oranı kadar süreli kalkan; katman yığılır; düşman ölümü tetiklemez', () => {
    const e = effectOf('lord_morvane', 'crownOfAsh');
    const b = sure(arena([['archer', 1], ['warrior', 0]], [['lord_morvane', 4], ['sworn_guard', 0], ['sworn_guard', 2]]));
    const m = unit(b, 'enemy-0');
    const amount = Math.round(m.maxHp * e.ratio);
    b.debug.damageMult = 1000;
    let n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(unit(b, 'enemy-1').hp).toBe(0);
    expect(ofType(since(b, n), 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'crown_of_ash')).toBe(true);
    expect(m.shield).toBe(amount);
    expect(m.shieldHooks?.find((h) => h.skill === 'crown_of_ash')?.turns).toBe(e.turns);
    b.useSkill('party-0', 'quick_shot', 'enemy-2');
    expect(m.shield).toBe(2 * amount);
    // kahraman ölümü Morvane'yi kalkanlamaz
    n = b.log.length;
    b.useSkill('enemy-0', 'cinder_lash', 'party-1');
    expect(unit(b, 'party-1').hp).toBe(0);
    expect(ofType(since(b, n), 'passive').some((x) => x.passive === 'crown_of_ash')).toBe(false);
  });
});

describe('D10-D12: yeni skill şekilleri var olan etkilerle', () => {
  it('D10 Run Down (ignoreReach) arka sıraya ulaşır; Halberd Chop ulaşamaz; Pike Thrust menzil +1', () => {
    const b = arena([['warrior', 1], ['mage', 7]], [['ash_hound', 1], ['morvane_halberdier', 0]]);
    expect(b.validTargets('enemy-0', 'run_down').map((c) => c.uid)).toContain('party-1');
    expect(b.validTargets('enemy-1', 'halberd_chop').map((c) => c.uid)).not.toContain('party-1');
    expect(content.skills.pike_thrust!.reach).toBe(1);
  });

  it("D11 Dragon's Breath: X şekli, kapsanan hücrelere yanan zemin", () => {
    const b = sure(arena([['warrior', 4], ['mage', 0]], [['drake_priest', 7]]));
    const n = b.log.length;
    expect(b.useSkill('enemy-0', 'dragons_breath', undefined, 4).ok).toBe(true);
    const g = ofType(since(b, n), 'ground')[0]!;
    expect(g.ground).toBe('burning');
    expect([...g.slots].sort((x, y) => x - y)).toEqual([0, 2, 4, 6, 8]);
  });

  it('D12 Iron Decree: tüm dostlara Haste', () => {
    const b = sure(arena([['archer', 1]], [['lord_morvane', 4], ['sworn_guard', 0], ['ember_hierophant', 7]]));
    expect(b.useSkill('enemy-0', 'iron_decree').ok).toBe(true);
    for (const uid of ['enemy-0', 'enemy-1', 'enemy-2']) {
      const kinds = unit(b, uid).statuses.map((s) => s.kind);
      expect(kinds, uid).toContain('haste');
    }
  });
});

describe('D13 Lord Morvane: fazlar ve telgraflar (var olan boss altyapısı)', () => {
  const cells = (units: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => units[i] ?? '');
  const TEAMS: Teams = {
    party: cells({ 0: 'warrior', 3: 'mage', 5: 'paladin', 7: 'archer' }),
    enemies: cells({ 4: 'lord_morvane', 0: 'sworn_guard', 2: 'sworn_guard', 7: 'ember_hierophant' }),
    units: { enemies: { 4: { tier: 'boss', displayName: 'Lord Morvane' } } },
  };
  const make = () => new Battle(content.battleSetup(content.DEFAULT_BATTLE, 5, 'turns', TEAMS, false));
  const morvane = (b: Battle) => b.combatants.find((c) => c.defId === 'lord_morvane')!;
  const toMorvane = (b: Battle) => {
    for (let i = 0; i < 80 && b.currentUid !== morvane(b).uid && !b.winner; i++) expect(b.skipTurn().ok).toBe(true);
    expect(b.currentUid).toBe(morvane(b).uid);
  };

  it('Ashfall: faz 1 2x2 (4 hücre), faz 2 2x3 (6 hücre); telgraflı (hasar sonraki turda); Pyre yalnız faz 3', () => {
    const b = make();
    const m = morvane(b);
    expect(b.areaCells('ashfall', 4, 'party', m.uid)).toHaveLength(4);
    m.phase = 2;
    expect(b.areaCells('ashfall', 4, 'party', m.uid)).toHaveLength(6);
    expect(b.canUse(m.uid, 'pyre_of_morvane')).toMatchObject({ ok: false });
    toMorvane(b);
    const n = b.log.length;
    expect(b.useSkill(m.uid, 'ashfall', undefined, 4).ok).toBe(true);
    expect(ofType(since(b, n), 'telegraph').length).toBe(1);
    expect(ofType(since(b, n), 'damage').filter((x) => x.source === m.uid).length).toBe(0);
  });

  it('faz 3 girişinde Pyre of Morvane telgrafı: tüm tahta, güvenli hücre yok; çözülünce her kahramana hasar + tüm tahtada yanan zemin', () => {
    const b = make();
    const m = morvane(b);
    const ph = content.bosses.lord_morvane!.boss!.phases!;
    m.phase = 2;
    m.hp = Math.round(m.maxHp * ph[1]!.at) + 2;
    b.debug.dodge = 'never';
    // bir kahraman küçük bir vuruşla eşiği geçirir
    for (let i = 0; i < 40 && m.phase < 3; i++) {
      const a = b.currentActor!;
      const id = a.side === 'party' ? a.skills.find((x) => b.canUse(a.uid, x).ok && b.validTargets(a.uid, x).some((t) => t.uid === m.uid) && content.skills[x]!.effects.some((e) => e.type === 'damage')) : undefined;
      if (id) b.useSkill(a.uid, id, m.uid, m.slot);
      else b.skipTurn();
    }
    expect(m.phase).toBe(3);
    const pyre = b.telegraphs.find((t) => t.skill === 'pyre_of_morvane')!;
    expect(pyre).toBeDefined();
    expect(pyre.safeCells ?? []).toHaveLength(0);
    expect(pyre.cells).toHaveLength(content.CELL_COUNT);
    expect(m.actionsPerTurn).toBe(ph[1]!.actionsPerTurn);
    const n = b.log.length;
    for (let i = 0; i < 80 && b.telegraphs.some((t) => t.skill === 'pyre_of_morvane') && !b.winner; i++) b.skipTurn();
    const r = ofType(since(b, n), 'telegraphResolve').find((x) => x.skill === 'pyre_of_morvane');
    expect(r).toBeDefined();
    expect(r!.hit.length).toBeGreaterThanOrEqual(3);
    for (const uid of r!.hit) expect(ofType(since(b, n), 'damage').some((x) => x.target === uid && x.source === m.uid), uid).toBe(true);
    // tüm kahraman tahtası yanan zemin olur (kaçış yok)
    const g = ofType(since(b, n), 'ground').find((x) => x.board === 'party' && x.ground === 'burning')!;
    expect(g.slots).toHaveLength(content.CELL_COUNT);
  });
});

describe('Bölge III karşılaşmaları (mob-plan.md 10.4)', () => {
  const REGION3 = ['ashen_plain', 'siege_line', 'thornwood_hollow', 'ember_road', 'riverhead', 'gate_of_cinders', 'castle_morvane'];
  it('düğümler yeni karşılaşmalara bağlı; class kopyası yok; birim kümeleri birbirinden ve Bölge I-II\'den farklı; en çok 1 caster\'sız savaş', () => {
    expect(validateEncounters()).toEqual([]);
    const nodes = valdoria.nodes.filter((n) => n.region === 'III' && 'encounter' in n).map((n) => (n as { encounter: string }).encounter);
    expect(nodes.sort()).toEqual([...REGION3].sort());
    const isCaster = (id: string) => unitDef(id).skills.some((s) => content.skills[s]!.cost.amount > 0 && content.skills[s]!.effects.some((e) => e.type === 'damage' && e.damageType === 'magic'));
    let casterless = 0;
    const sets = new Set<string>();
    for (const id of REGION3) {
      const enc = ENCOUNTERS[id]!;
      for (const u of enc.units) expect(content.classes[u.class], `${id} ${u.class}`).toBeUndefined();
      if (!enc.units.some((u) => isCaster(u.class))) casterless++;
      sets.add(enc.units.map((u) => u.class).sort().join('+'));
    }
    expect(casterless).toBeLessThanOrEqual(1);
    expect(sets.size).toBe(REGION3.length);
    // Bölge I-II karşılaşmalarından da farklı
    const other = valdoria.nodes.filter((n) => n.region !== 'III' && 'encounter' in n).map((n) => ENCOUNTERS[(n as { encounter: string }).encounter]!.units.map((u) => u.class).sort().join('+'));
    for (const s of sets) expect(other).not.toContain(s);
    // Endless'ın eski elit/boss dalgaları aynen duruyor
    expect(ENCOUNTERS.dragons_spine).toBeDefined();
    expect(ENCOUNTERS.lord_morvane).toBeDefined();
    expect(ENCOUNTERS.castle_morvane!.units.find((u) => u.tier === 'boss')!.class).toBe('lord_morvane');
  });

  it('Castle Morvane YZ ile sonuna kadar oynanır (belirleyici)', () => {
    const enc = ENCOUNTERS.castle_morvane!;
    const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const teams: Teams = {
      party: cells({ 0: 'warrior', 1: 'defender', 6: 'mage', 8: 'paladin' }),
      enemies: cells(Object.fromEntries(enc.units.map((u) => [u.slot, u.class]))),
      units: { enemies: Object.fromEntries(enc.units.map((u) => [u.slot, { ...(u.tier ? { tier: u.tier } : {}), ...(u.mods ? { modifiers: u.mods } : {}) }])) },
    };
    const run = () => {
      const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 77, 'turns', teams, false));
      for (let n = 0; n < 900 && !b.winner; n++) {
        const uid = b.currentActor?.uid;
        if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
      }
      return b;
    };
    const a = run();
    expect(a.winner).toBeTruthy();
    expect(run().log.length).toBe(a.log.length);
  });
});
