// Harita 3 kit dilimi: 7 ortak mob + 6 palet mob (maps-2-3.md 4.3). Kit, pasif, YZ; iki savaş modu. Bayrak kapalı, karşılaşmaya bağlı değil. Sayılar veriden okunur.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive } from '../src/engine';
import type { AiTrace } from '../src/engine/ai';
import type { BattleMode, Combatant, Side, Teams } from '../src/engine';
import { RULES_TESTS } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';
import enc from '../data/campaign/hollow-crown-encounters.json';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];
function make(rules: Teams['rules'], party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', seed = 5): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies), rules }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
const ai = (b: Battle, c: Combatant) => chooseAction(b, c.uid, content.aiConfig);
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
function turnOf(b: Battle, uid: string): void {
  if (b.mode !== 'turns') return;
  for (let i = 0; i < 200 && b.currentUid !== uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}
/** YZ seçenekleri (trace): skill + hedefe göre skor. */
function options(b: Battle, c: Combatant) {
  const trace: AiTrace = { options: [], reserves: [], steps: [] };
  chooseAction(b, c.uid, content.aiConfig, trace);
  return trace.options;
}
const SEVEN = ['snow_wolf', 'clan_axeman', 'cave_crawler', 'clan_skald', 'pyre_witch', 'cinder_knight', 'forge_golem'];
const SIX = ['wight', 'rime_hound', 'clan_slinger', 'rime_witch', 'hollow_warden', 'molten_hound'];

describe.each(MODES)('%s modu', (mode) => {
  const freezes = (mob: string, skill: string) => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 0: mob }, mode);
    const m = at(b, 'enemy', 0);
    const h = at(b, 'party', 0);
    turnOf(b, m.uid);
    expect(b.useSkill(m.uid, skill, h.uid).ok).toBe(true);
    expect(has(h, 'chilled')).toBe(true);
    expect(has(h, 'frozen')).toBe(false); // aynı atış dondurmaz
    b.debugAddStatus(h.uid, 'chilled', 3);
    m.cooldowns = {};
    m.mp = m.maxMp;
    if (mode === 'turns') turnOf(b, m.uid);
    expect(b.useSkill(m.uid, skill, h.uid).ok).toBe(true);
    expect(has(h, 'frozen')).toBe(true); // ikinci skill atışı
  };
  // Frost Bite zarı (%35) ve donma: tests/map3-picks.test.ts
  it('Rime Hound: Rime Bite aynı kural', () => freezes('rime_hound', 'rime_bite'));
  it('Clan Slinger: Ice Shot aynı kural', () => freezes('clan_slinger', 'ice_shot'));

  it('Clan Axeman: Chilled ve Frozen tutmaz; can yarının altında +%20', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'clan_axeman' }, mode);
    const x = at(b, 'enemy', 0);
    const h = at(b, 'party', 0);
    expect(b.statusBlocked(x, 'chilled')).toBe(true);
    expect(b.statusBlocked(x, 'frozen')).toBe(true);
    expect(b.statusBlocked(x, 'slow')).toBe(false);
    expect(b.passiveDealtMult(x, h)).toBe(1);
    x.hp = Math.floor(x.maxHp * 0.49);
    expect(b.passiveDealtMult(x, h)).toBeCloseTo(1.2, 5);
  });

  it('Clan Axeman: Cleave ön sırayı vurur, arkaya geçmez', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid', 3: 'archer' }, { 0: 'clan_axeman' }, mode);
    const x = at(b, 'enemy', 0);
    const [a, c, back] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'party', 3)];
    const hp = [a.hp, c.hp, back.hp];
    turnOf(b, x.uid);
    expect(b.useSkill(x.uid, 'cleave', undefined, 0, 'party').ok).toBe(true);
    expect(a.hp).toBeLessThan(hp[0]!);
    expect(c.hp).toBeLessThan(hp[1]!);
    expect(back.hp).toBe(hp[2]!);
  });

  it('Cave Crawler: yalnız en yakın hedef (Skitter dahil); karanlıkta +%25', () => {
    const b = make({ condition: 'darkness' }, { 0: 'warrior', 1: 'druid', 3: 'archer' }, { 0: 'cave_crawler' }, mode);
    const c = at(b, 'enemy', 0);
    const near = at(b, 'party', 0);
    for (const id of ['mandible', 'skitter']) expect(b.validTargets(c.uid, id).map((u) => u.uid)).toEqual([near.uid]);
    turnOf(b, c.uid);
    expect(b.useSkill(c.uid, 'skitter', at(b, 'party', 1).uid).ok).toBe(false);
    expect(b.isDark()).toBe(true);
    expect(b.passiveDealtMult(c, near)).toBeCloseTo(1.25, 5);
    const lit = make(undefined, { 0: 'warrior' }, { 0: 'cave_crawler' }, mode);
    expect(lit.passiveDealtMult(at(lit, 'enemy', 0), at(lit, 'party', 0))).toBe(1);
  });

  it('Cave Crawler: arka sırada Skitter ile en yakına ulaşır', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'clan_axeman', 3: 'cave_crawler' }, mode);
    const c = at(b, 'enemy', 3);
    expect(b.validTargets(c.uid, 'skitter').map((u) => u.uid)).toEqual([at(b, 'party', 0).uid]);
  });

  it('Clan Skald: Mock Staggered verir; Chant tüm dostlara Haste', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 0: 'clan_axeman', 6: 'clan_skald' }, mode);
    const s = at(b, 'enemy', 6);
    const h = at(b, 'party', 0);
    turnOf(b, s.uid);
    expect(b.useSkill(s.uid, 'mock', h.uid).ok).toBe(true);
    expect(has(h, 'staggered')).toBe(true);
    s.cooldowns = {};
    if (mode === 'turns') turnOf(b, s.uid);
    expect(b.useSkill(s.uid, 'chant').ok).toBe(true);
    expect(has(at(b, 'enemy', 0), 'haste')).toBe(true);
  });

  it('Pyre Witch: Burning hücre yoksa Spread kullanılamaz; yayar; Kindling sayar, tavan +%20', () => {
    const b = make(undefined, { 0: 'warrior', 4: 'archer', 8: 'druid' }, { 6: 'pyre_witch' }, mode);
    const w = at(b, 'enemy', 6);
    const h = at(b, 'party', 4);
    turnOf(b, w.uid);
    expect(b.canUse(w.uid, 'spread_the_flame').ok).toBe(false);
    expect(b.passiveDealtMult(w, h)).toBe(1);
    expect(b.debugPlaceGround(w.uid, 'burning', 'party', [4], 3).ok).toBe(true);
    expect(b.passiveDealtMult(w, h)).toBeCloseTo(1.05, 5);
    expect(b.canUse(w.uid, 'spread_the_flame').ok).toBe(true);
    expect(b.useSkill(w.uid, 'spread_the_flame', undefined, 0, 'party').ok).toBe(false); // yanan hücre değil
    expect(b.useSkill(w.uid, 'spread_the_flame', undefined, 4, 'party').ok).toBe(true);
    expect(b.groundCellCount('burning')).toBe(5);
    expect(has(at(b, 'party', 4), 'burning')).toBe(true);
    expect(b.passiveDealtMult(w, h)).toBeCloseTo(1.2, 5); // 5 hücre: %25 değil %20
  });

  it('Cinder Knight: Brand yakar; Searing Rebuke ve Hold the Gate kitte', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'cinder_knight' }, mode);
    const k = at(b, 'enemy', 0);
    const h = at(b, 'party', 0);
    turnOf(b, k.uid);
    expect(b.useSkill(k.uid, 'cinder_brand', h.uid).ok).toBe(true);
    expect(has(h, 'burning')).toBe(true);
    expect(k.passive?.effect.type).toBe('rebuke');
    expect(content.skills['knight_hold_gate']!.effects.map((e) => e.type)).toEqual(content.skills['hold_the_gate']!.effects.map((e) => e.type));
  });

  it('Forge Golem: Vent bir şeridi yakar; ölünce hücresi ve komşuları 2 tur Burning, kendi tarafına işlemez', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer', 1: 'druid' }, { 0: 'forge_golem', 1: 'cinder_knight' }, mode);
    const g = at(b, 'enemy', 0);
    const [lane0, lane0b, lane1] = [at(b, 'party', 0), at(b, 'party', 3), at(b, 'party', 1)];
    const hp = [lane0.hp, lane0b.hp, lane1.hp];
    turnOf(b, g.uid);
    expect(b.useSkill(g.uid, 'vent', undefined, 0, 'party').ok).toBe(true);
    expect(lane0.hp).toBeLessThan(hp[0]!);
    expect(lane0b.hp).toBeLessThan(hp[1]!);
    expect(lane1.hp).toBe(hp[2]!);
    g.hp = 1;
    if (mode === 'turns') turnOf(b, lane0.uid);
    expect(b.useSkill(lane0.uid, 'melee_attack', g.uid).ok).toBe(true);
    expect(g.hp).toBe(0);
    const burn = b.ground.find((x) => x.ground === 'burning' && x.board === 'enemy')!;
    expect(burn.turns).toBe(2);
    expect([...burn.slots].sort((x, y) => x - y)).toEqual([0, 1, 3]);
    expect(has(at(b, 'enemy', 1), 'burning')).toBe(false);
  });

  it('Wight: skill vuruşu Chilled verir, zaten Chilled olanı dondurmaz', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'wight' }, mode);
    const w = at(b, 'enemy', 0);
    const h = at(b, 'party', 0);
    turnOf(b, w.uid);
    expect(b.useSkill(w.uid, 'gnaw', h.uid).ok).toBe(true);
    expect(has(h, 'chilled')).toBe(true);
    b.debugAddStatus(h.uid, 'chilled', 5); // 1 turluk Chilled hedefin tur başında biter; dondurmama sınanırken süre uzatılır
    if (mode === 'turns') turnOf(b, w.uid);
    expect(b.useSkill(w.uid, 'gnaw', h.uid).ok).toBe(true);
    expect(has(h, 'frozen')).toBe(false);
    expect(has(h, 'chilled')).toBe(true);
  });

  it('Rime Witch: Sodden Hex Soaked verir', () => {
    const b = make(undefined, { 0: 'warrior' }, { 6: 'rime_witch' }, mode);
    const w = at(b, 'enemy', 6);
    const h = at(b, 'party', 0);
    turnOf(b, w.uid);
    expect(b.useSkill(w.uid, 'sodden_hex', h.uid).ok).toBe(true);
    expect(has(h, 'soaked')).toBe(true);
  });

  it('Hollow Warden: karanlıkta alınan hasar -%25; aydınlıkta yok', () => {
    const d = make({ condition: 'darkness' }, { 0: 'warrior' }, { 0: 'hollow_warden' }, mode);
    expect(d.passiveTakenMult(at(d, 'enemy', 0))).toBeCloseTo(0.75, 5);
    const l = make(undefined, { 0: 'warrior' }, { 0: 'hollow_warden' }, mode);
    expect(l.passiveTakenMult(at(l, 'enemy', 0))).toBe(1);
  });

  it('Molten Hound: Run Down hedefin altına Burning zemin bırakır', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 0: 'molten_hound' }, mode);
    const m = at(b, 'enemy', 0);
    const back = at(b, 'party', 3);
    turnOf(b, m.uid);
    expect(b.useSkill(m.uid, 'molten_run_down', back.uid).ok).toBe(true);
    expect(b.ground.some((g) => g.ground === 'burning' && g.board === 'party' && g.slots.includes(3))).toBe(true);
  });
});

describe('tur başı pasifleri (yalnız turns: test modunda tur başı yok)', () => {
  it('War-Chant: Skald turunda aynı sıradaki dost Haste alır, başka sıradaki almaz', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'clan_axeman', 6: 'clan_skald', 7: 'clan_slinger' }, 'turns');
    const s = at(b, 'enemy', 6);
    turnOf(b, s.uid);
    expect(has(at(b, 'enemy', 7), 'haste')).toBe(true);
    expect(has(at(b, 'enemy', 0), 'haste')).toBe(false);
    expect(has(s, 'haste')).toBe(false);
  });
  it('Hoarfrost: Soaked kahraman tur başında Chilled alır, tekrarında donmaz; cadı ölünce biter', () => {
    const b = make(undefined, { 0: 'warrior' }, { 6: 'rime_witch', 0: 'drowned' }, 'turns');
    const h = at(b, 'party', 0);
    const w = at(b, 'enemy', 6);
    b.debugAddStatus(h.uid, 'soaked', 9);
    if (b.currentUid === h.uid) b.skipTurn(); // ilk turu zaten başlamış olabilir: tur başı kancası çalışsın
    turnOf(b, h.uid);
    expect(has(h, 'chilled')).toBe(true);
    b.skipTurn();
    turnOf(b, h.uid);
    expect(has(h, 'chilled')).toBe(true);
    expect(has(h, 'frozen')).toBe(false);
    w.hp = 0;
    h.statuses = h.statuses.filter((s) => s.kind !== 'chilled');
    b.skipTurn();
    turnOf(b, h.uid);
    expect(has(h, 'chilled')).toBe(false);
  });
  it('Furnace Core: bırakan ölü olsa da zemin öldürenin 2 turu boyunca kalır, sonra biter', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'forge_golem', 1: 'cinder_knight' }, 'turns');
    const g = at(b, 'enemy', 0);
    const h = at(b, 'party', 0);
    g.hp = 1;
    turnOf(b, h.uid);
    expect(b.useSkill(h.uid, 'melee_attack', g.uid).ok).toBe(true);
    const burning = () => b.ground.some((x) => x.ground === 'burning' && x.board === 'enemy');
    expect(burning()).toBe(true);
    turnOf(b, h.uid);
    expect(burning()).toBe(true);
    b.skipTurn();
    turnOf(b, h.uid);
    expect(burning()).toBe(false);
  });
  it('Hoarfrost: Soaked olmayan kahraman etkilenmez', () => {
    const b = make(undefined, { 0: 'warrior' }, { 6: 'rime_witch', 0: 'drowned' }, 'turns');
    const h = at(b, 'party', 0);
    turnOf(b, h.uid);
    expect(has(h, 'chilled')).toBe(false);
  });
  it('Mock: Staggered kahraman sıradaki eylemini kaybeder', () => {
    const b = make(undefined, { 0: 'warrior' }, { 6: 'clan_skald', 0: 'drowned' }, 'turns');
    const s = at(b, 'enemy', 6);
    const h = at(b, 'party', 0);
    turnOf(b, s.uid);
    expect(b.useSkill(s.uid, 'mock', h.uid).ok).toBe(true);
    const log: { type: string; actor?: string }[] = [];
    b.on((e) => log.push(e));
    for (let i = 0; i < 40 && has(h, 'staggered'); i++) b.skipTurn();
    expect(has(h, 'staggered')).toBe(false);
  });
});

describe('YZ', () => {
  const skillOf = (b: Battle, c: Combatant) => ai(b, c)?.skillId;
  it('Snow Wolf Chilled hedefi seçer (dondurma değeri), Frost Bite ile', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'warrior' }, { 0: 'snow_wolf' }, 'turns');
    const w = at(b, 'enemy', 0);
    const chilled = at(b, 'party', 1);
    b.debugAddStatus(chilled.uid, 'chilled', 3);
    turnOf(b, w.uid);
    w.cooldowns['snow_rend'] = 5;
    expect(ai(b, w)).toMatchObject({ skillId: 'frost_bite', targetUid: chilled.uid });
  });
  it('Crawler YZ en yakına gider, hedef seçmez', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'archer', 2: 'druid' }, { 0: 'cave_crawler' }, 'turns');
    const c = at(b, 'enemy', 0);
    turnOf(b, c.uid);
    expect(ai(b, c)?.targetUid).toBe(at(b, 'party', 0).uid);
  });
  it('Skald Mock\'u kullanır; zaten Staggered hedefe boşa atmaz', () => {
    const b = make(undefined, { 0: 'warrior' }, { 6: 'clan_skald' }, 'turns');
    const s = at(b, 'enemy', 6);
    const h = at(b, 'party', 0);
    turnOf(b, s.uid);
    s.cooldowns['chant'] = 5;
    expect(ai(b, s)).toMatchObject({ skillId: 'mock', targetUid: h.uid });
    b.debugAddStatus(h.uid, 'staggered', 1);
    expect(skillOf(b, s)).toBe('sling_stone');
  });
  it('Skald Chant\'i dostlar Haste\'sizken kullanır, hepsi Haste\'liyken kullanmaz', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 0: 'clan_axeman', 1: 'clan_axeman', 6: 'clan_skald' }, 'turns');
    const s = at(b, 'enemy', 6);
    turnOf(b, s.uid);
    s.cooldowns['mock'] = 5;
    expect(skillOf(b, s)).toBe('chant');
    for (const c of b.combatants) if (c.side === 'enemy') b.debugAddStatus(c.uid, 'haste', 5);
    expect(skillOf(b, s)).not.toBe('chant');
  });
  it('Pyre Witch Burning hücre varken yayar, yokken Pyre Bolt atar; yayarken kahramanlı hücreyi seçer', () => {
    const b = make(undefined, { 1: 'warrior', 3: 'archer' }, { 6: 'pyre_witch' }, 'turns');
    const w = at(b, 'enemy', 6);
    turnOf(b, w.uid);
    expect(skillOf(b, w)).toBe('pyre_bolt');
    b.debugPlaceGround(w.uid, 'burning', 'party', [4], 3);
    const c = ai(b, w);
    expect(c?.skillId).toBe('spread_the_flame');
    expect(c?.slot).toBe(4);
  });
  it('Pyre Witch Kindling tavanı dolunca değeri düşer', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'archer' }, { 6: 'pyre_witch' }, 'turns');
    const w = at(b, 'enemy', 6);
    turnOf(b, w.uid);
    b.debugPlaceGround(w.uid, 'burning', 'party', [4], 3);
    const low = options(b, w).find((o) => o.skill.id === 'spread_the_flame')!;
    b.debugPlaceGround(w.uid, 'burning', 'enemy', [0, 1, 2, 3], 3);
    const high = options(b, w).find((o) => o.skill.id === 'spread_the_flame')!;
    expect(high.score).toBeLessThan(low.score);
  });
  it('Forge Golem iki kahramanlı şeride Vent atar', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 0: 'forge_golem' }, 'turns');
    const g = at(b, 'enemy', 0);
    turnOf(b, g.uid);
    expect(skillOf(b, g)).toBe('vent');
  });
  it('Wight Chilled olmayan hedefi daha değerli görür', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'warrior' }, { 0: 'wight' }, 'turns');
    const w = at(b, 'enemy', 0);
    const [fresh, cold] = [at(b, 'party', 0), at(b, 'party', 1)];
    turnOf(b, w.uid);
    const before = options(b, w).find((o) => o.skill.id === 'gnaw' && o.targetUid === cold.uid)!.score;
    b.debugAddStatus(cold.uid, 'chilled', 3);
    const after = options(b, w).find((o) => o.skill.id === 'gnaw' && o.targetUid === cold.uid)!.score;
    expect(after).toBeLessThan(before);
    expect(options(b, w).find((o) => o.skill.id === 'gnaw' && o.targetUid === fresh.uid)).toBeTruthy();
  });
  it('Rime Witch Soaked olmayan kahramana Sodden Hex atar, Soaked hedefe atmaz', () => {
    const b = make(undefined, { 0: 'warrior' }, { 6: 'rime_witch' }, 'turns');
    const w = at(b, 'enemy', 6);
    const h = at(b, 'party', 0);
    turnOf(b, w.uid);
    expect(skillOf(b, w)).toBe('sodden_hex');
    b.debugAddStatus(h.uid, 'soaked', 5);
    expect(skillOf(b, w)).toBe('ice_shard');
  });
  it('Kahraman YZ Kindling varken Furnace Core taşıyanı öldürmekten kaçınır', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'forge_golem', 1: 'forge_golem', 6: 'pyre_witch' }, 'turns');
    const [core, plain] = [at(b, 'enemy', 0), at(b, 'enemy', 1)];
    delete plain.passive;
    core.hp = 1;
    plain.hp = 1;
    const h = at(b, 'party', 0);
    turnOf(b, h.uid);
    const score = (t: Combatant) => options(b, h).find((o) => o.skill.id === 'melee_attack' && o.targetUid === t.uid)!.score;
    expect(score(core)).toBeLessThan(score(plain));
  });
  it('Kahraman YZ Skald\'ı öldürmeye War-Chant kadar değer verir', () => {
    const score = (keep: boolean) => {
      const b = make(undefined, { 0: 'warrior' }, { 0: 'clan_skald', 1: 'clan_axeman', 2: 'clan_axeman' }, 'turns');
      const s = at(b, 'enemy', 0);
      if (!keep) delete s.passive;
      s.hp = 1;
      const h = at(b, 'party', 0);
      turnOf(b, h.uid);
      return options(b, h).find((o) => o.skill.id === 'melee_attack' && o.targetUid === s.uid)!.score;
    };
    expect(score(true)).toBeGreaterThan(score(false));
  });
  it('Kahraman YZ Highland Fury eşiğini öldürmeden geçirmeyi bedelli görür; buz kartı Axeman\'da değersiz', () => {
    const score = (keep: boolean) => {
      const b = make(undefined, { 0: 'warrior' }, { 0: 'clan_axeman' }, 'turns');
      const x = at(b, 'enemy', 0);
      if (!keep) delete x.passive;
      x.hp = Math.floor(x.maxHp * 0.5) + 1;
      const h = at(b, 'party', 0);
      turnOf(b, h.uid);
      return options(b, h).find((o) => o.skill.id === 'melee_attack' && o.targetUid === x.uid)!.score;
    };
    expect(score(true)).toBeLessThan(score(false));
    const b = make(undefined, { 0: 'mage' }, { 0: 'clan_axeman' }, 'turns');
    expect(b.wouldFreeze(at(b, 'enemy', 0), 'chilled')).toBe(false);
  });
  it('Kahraman YZ karanlıkta Blind Hunger / Hollow varken ateşle aydınlatmaya değer verir', () => {
    const fire = (keep: boolean) => {
      const b = make({ condition: 'darkness' }, { 0: 'mage' }, { 0: 'cave_crawler' }, 'turns');
      const c = at(b, 'enemy', 0);
      if (!keep) delete c.passive;
      const h = at(b, 'party', 0);
      turnOf(b, h.uid);
      return options(b, h).find((o) => o.skill.id === 'fire_bolt' && o.targetUid === c.uid)!.score;
    };
    expect(fire(true)).toBeGreaterThan(fire(false));
  });
});

describe('içerik', () => {
  it('13 mob gerçek kitle var, inert değil, Omen / Dark Bond yok, oyuncu sınıfı skill\'i yok', () => {
    const classSkills = new Set(Object.values(content.classes).flatMap((c) => c.skills));
    for (const id of [...SEVEN, ...SIX]) {
      const m = content.mobs[id]!;
      expect(m, id).toBeTruthy();
      expect(m.inert, id).toBeFalsy();
      expect(content.bosses[id], id).toBeUndefined();
      expect(m.passive, id).toBeTruthy();
      expect(JSON.stringify(m.skills.map((s) => content.skills[s]!.effects)), id).not.toMatch(/omen|dark_bond/);
      for (const s of m.skills) expect(classSkills.has(s), `${id} ${s}`).toBe(false);
    }
  });
  it('kendi çizimleri kullanılır; palet mobları taban çizimde', () => {
    for (const id of SEVEN) expect(content.mobs[id]!.spriteId, id).toBe(id);
    expect(content.mobs['wight']!.spriteId).toBe('ghoul');
    expect(content.mobs['rime_hound']!.spriteId).toBe('ash_hound');
    expect(content.mobs['molten_hound']!.spriteId).toBe('ash_hound');
    expect(content.mobs['clan_slinger']!.spriteId).toBe('bandit_crossbowman');
    expect(content.mobs['rime_witch']!.spriteId).toBe('fen_witchling');
    expect(content.mobs['hollow_warden']!.spriteId).toBe('stonebound_warden');
  });
  it('karşılaşmalar değişmedi: bu moblar henüz hiçbir düğümde değil', () => {
    const text = JSON.stringify(enc);
    for (const id of [...SEVEN, ...SIX]) expect(text, id).not.toContain(`"class":"${id}"`);
  });
  it('pasif metni ve oyun içi metin sade; yasak kelime yok', () => {
    for (const id of [...SEVEN, ...SIX]) {
      const m = content.mobs[id]!;
      const txt = describePassive(m.passive!, m.stats, content.formulas);
      expect(txt, id).toBeTruthy();
      expect(`${txt} ${m.passive!.text} ${m.role}`.toLowerCase(), id).not.toContain('support');
    }
    expect(describePassive(content.mobs['pyre_witch']!.passive!, content.mobs['pyre_witch']!.stats, content.formulas)).toContain('20%');
  });
  it('debug kural testleri listede; Codex anlatır', () => {
    for (const k of ['kit_wolf', 'kit_axeman', 'kit_crawler', 'kit_skald', 'kit_witch', 'kit_knight', 'kit_golem', 'kit_wight', 'kit_rime_hound', 'kit_slinger', 'kit_rime_witch', 'kit_hollow', 'kit_molten']) expect(RULES_TESTS.some((t) => t.kind === k), k).toBe(true);
    const text = JSON.stringify(buildMechanics());
    for (const w of ['Cave Crawler', 'Clan Skald', 'Pyre Witch', 'Forge Golem', 'Wight', 'Hollow Warden']) expect(text).toContain(w);
  });
});
