// Harita 3 Ömer seçimleri (maps-2-3.md; 2026-11-01): 3 elit kit (Brannoc, Standard-Bearer, Oathkeeper) + kural değişiklikleri (Forge-Master çekirdeği, Frost Bite, Grave Cold, Pyre Bolt). Bayrak kapalı.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, describeSkill } from '../src/engine';
import type { AiTrace } from '../src/engine/ai';
import type { BattleMode, Combatant, Side, Teams } from '../src/engine';
import { TOUCH_TESTS, touchTestBattleData } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';
import { ENCOUNTERS } from '../src/campaign/data';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];
const HEROES = { 0: 'warrior', 1: 'warrior', 3: 'druid', 7: 'mage' };
function make(enemies: Record<number, string>, mode: BattleMode = 'test', party: Record<number, string> = HEROES, seed = 5): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies) }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
function turnOf(b: Battle, uid: string): void {
  if (b.mode !== 'turns') return;
  for (let i = 0; i < 200 && b.currentUid !== uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}
const groundCells = (b: Battle, ground: string, board: Side) => [...new Set(b.ground.filter((g) => g.ground === ground && g.board === board).flatMap((g) => g.slots))].sort((x, y) => x - y);
const lock = (u: Combatant, ...ids: string[]) => { for (const id of ids) u.cooldowns[id] = 5; };
const pickIn = (enemies: Record<number, string>, slot: number, set: (b: Battle, u: Combatant) => void) => {
  const b = make(enemies, 'turns');
  const u = at(b, 'enemy', slot);
  turnOf(b, u.uid);
  u.mp = u.maxMp;
  set(b, u);
  return chooseAction(b, u.uid, content.aiConfig);
};

describe.each(MODES)('%s modu', (mode) => {
  describe('Clan Chief Brannoc', () => {
    const SET = { 1: 'clan_chief_brannoc', 0: 'clan_axeman', 2: 'clan_axeman', 7: 'clan_skald' };
    it('Highland Fury: Chilled ve Frozen tutmaz; can yarının altında +%20', () => {
      const b = make(SET, mode);
      const c = at(b, 'enemy', 1);
      const h = at(b, 'party', 0);
      expect(b.statusBlocked(c, 'chilled')).toBe(true);
      expect(b.statusBlocked(c, 'frozen')).toBe(true);
      expect(b.passiveDealtMult(c, h)).toBe(1);
      c.hp = Math.floor(c.maxHp * 0.4);
      expect(b.passiveDealtMult(c, h)).toBeCloseTo(1.2, 5);
    });
    it('Rally the Clan: seçilen dost sırası 2 tur Haste, başka sıra almaz', () => {
      const b = make(SET, mode);
      const c = at(b, 'enemy', 1);
      turnOf(b, c.uid);
      expect(b.useSkill(c.uid, 'rally_the_clan', undefined, 1, 'enemy').ok).toBe(true);
      for (const s of [0, 1, 2]) expect(at(b, 'enemy', s).statuses.find((x) => x.kind === 'haste')?.turns, `${s}`).toBe(2);
      expect(has(at(b, 'enemy', 7), 'haste')).toBe(false);
      for (const s of [0, 1, 3, 7]) expect(has(at(b, 'party', s), 'haste')).toBe(false);
    });
    it('Great Axe bedelsiz; Skullsplitter Sunder verir', () => {
      const b = make(SET, mode);
      const c = at(b, 'enemy', 1);
      const h = at(b, 'party', 1);
      expect(content.skills['great_axe']!.cost.amount).toBe(0);
      turnOf(b, c.uid);
      expect(b.useSkill(c.uid, 'skullsplitter', h.uid).ok).toBe(true);
      expect(has(h, 'sunder')).toBe(true);
    });
  });

  describe('Frozen Halberdier ve Crossbowman (hc_18)', () => {
    const SET = { 1: 'frozen_standard_bearer', 0: 'frozen_halberdier', 2: 'frozen_halberdier', 7: 'frozen_crossbowman' };
    it('kendi Frozen Ranks: Chilled tutmaz, sıra koruması birikmez, taşıyan ölünce de kalır', () => {
      const b = make(SET, mode);
      const bearer = at(b, 'enemy', 1);
      const hal = at(b, 'enemy', 0);
      const bow = at(b, 'enemy', 7);
      expect(b.statusBlocked(hal, 'chilled')).toBe(true);
      expect(b.statusBlocked(bow, 'chilled')).toBe(true);
      const per = content.mobs['frozen_halberdier']!.passive!.effect as { perAlly: number };
      expect(b.passiveTakenMult(hal, 'physical')).toBeCloseTo(1 - per.perAlly * 2, 5);
      bearer.hp = 0;
      expect(b.statusBlocked(hal, 'chilled')).toBe(true);
      expect(b.statusBlocked(bow, 'chilled')).toBe(true);
      expect(b.statusBlocked(hal, 'frozen')).toBe(false);
      expect(describePassive(hal.passive!, content.mobs['frozen_halberdier']!.stats, content.formulas)).toContain('cannot be Chilled');
    });
  });

  describe('The Frozen Standard-Bearer', () => {
    const SET = { 1: 'frozen_standard_bearer', 0: 'morvane_halberdier', 2: 'rime_hound', 7: 'bandit_crossbowman' };
    it('Frozen Ranks: dostlar Chilled tutmaz, taşıyan tutar ve donar; taşıyan ölünce biter', () => {
      const b = make(SET, mode, { 0: 'pack_mother' });
      const s = at(b, 'enemy', 1);
      const ally = at(b, 'enemy', 2);
      const h = at(b, 'party', 0);
      expect(b.statusBlocked(ally, 'chilled')).toBe(true);
      expect(b.statusBlocked(s, 'chilled')).toBe(false);
      expect(b.statusBlocked(s, 'frozen')).toBe(false);
      for (const target of [ally, s, s]) {
        turnOf(b, h.uid);
        h.cooldowns = {};
        expect(b.useSkill(h.uid, 'frost_fang', target.uid).ok).toBe(true);
      }
      expect(has(ally, 'chilled')).toBe(false);
      expect(has(s, 'frozen')).toBe(true);
      b.debugKill(s.uid);
      expect(b.statusBlocked(ally, 'chilled')).toBe(false);
    });
    it('Close Ranks tüm dostlara, kendi Close Ranks iki kez sayılmaz, taşıyan ölünce biter', () => {
      const b = make(SET, mode);
      const s = at(b, 'enemy', 1);
      const own = at(b, 'enemy', 0);
      const ally = at(b, 'enemy', 2);
      const back = at(b, 'enemy', 7);
      expect(b.passiveTakenMult(s, 'physical')).toBeCloseTo(0.76, 5);
      expect(b.passiveTakenMult(ally, 'physical')).toBeCloseTo(0.76, 5);
      expect(b.passiveTakenMult(own, 'physical')).toBeCloseTo(0.76, 5);
      expect(b.passiveTakenMult(back, 'physical')).toBe(1);
      b.debugKill(s.uid);
      expect(b.passiveTakenMult(ally, 'physical')).toBe(1);
      expect(b.passiveTakenMult(own, 'physical')).toBeCloseTo(0.88, 5); // kendi pasifi kalır
    });
    it('Cold Command: bir dosta 2 tur Haste, kendine atılmaz', () => {
      const b = make(SET, mode);
      const s = at(b, 'enemy', 1);
      const ally = at(b, 'enemy', 0);
      expect(b.validTargets(s.uid, 'cold_command').map((c) => c.uid)).not.toContain(s.uid);
      turnOf(b, s.uid);
      expect(b.useSkill(s.uid, 'cold_command', ally.uid).ok).toBe(true);
      expect(ally.statuses.find((x) => x.kind === 'haste')?.turns).toBe(2);
    });
    it('Frost Banner: işaretli 2x2, sonra Chill Ground', () => {
      const b = make(SET, mode);
      const s = at(b, 'enemy', 1);
      turnOf(b, s.uid);
      expect(b.useSkill(s.uid, 'frost_banner', undefined, 0, 'party').ok).toBe(true);
      expect(b.telegraphs[0]!.cells).toHaveLength(4);
      expect(groundCells(b, 'storm', 'party')).toEqual([]);
      const marked = [...b.telegraphs[0]!.cells].sort((x, y) => x - y);
      if (mode === 'turns') for (let i = 0; i < 120 && b.telegraphs.length; i++) b.skipTurn();
      else { s.cooldowns = {}; b.useSkill(s.uid, 'standard_pole', b.validTargets(s.uid, 'standard_pole')[0]?.uid); }
      expect(groundCells(b, 'storm', 'party')).toEqual(marked);
    });
  });

  describe('The Oathkeeper', () => {
    const SET = { 1: 'oathkeeper', 0: 'stonebound_warden', 2: 'stonebound_warden', 7: 'deep_runecaller' };
    it('Stone Oath: dost ölümü başına kalıcı +6 zırh ve +6 büyü zırhı; MP zırh vermez', () => {
      const b = make(SET, mode);
      const o = at(b, 'enemy', 1);
      const armor = () => b.effectiveStats(o).armor;
      const magic = () => b.effectiveStats(o).magicArmor;
      const [a0, m0] = [armor(), magic()];
      o.mp = 0;
      expect(armor()).toBe(a0); // Deep Hoard yok
      b.debugKill(at(b, 'enemy', 0).uid);
      expect(armor()).toBe(a0 + 6);
      expect(magic()).toBe(m0 + 6);
      b.debugKill(at(b, 'enemy', 2).uid);
      expect(armor()).toBe(a0 + 12);
      expect(magic()).toBe(m0 + 12);
    });
    it('Verdict Sunder verir; Thane değişmedi', () => {
      const b = make(SET, mode);
      const o = at(b, 'enemy', 1);
      const h = at(b, 'party', 1);
      turnOf(b, o.uid);
      expect(b.useSkill(o.uid, 'verdict', h.uid).ok).toBe(true);
      expect(has(h, 'sunder')).toBe(true);
      expect(content.mobs['thane_of_the_deep']!.passive!.effect.type).toBe('deepHoard');
      expect(content.mobs['thane_of_the_deep']!.skills).toEqual(['pick_of_the_deep', 'oath_of_stone', 'shield_wall']);
      expect(content.mobs['oathkeeper']!.skills).toEqual(['pick_of_the_deep', 'oath_of_stone', 'verdict']);
    });
  });

  describe('kural değişiklikleri', () => {
    it('Forge-Master çekirdeği kahraman tahtasına: aynı hücre + komşular, 4 tur, kahramanı yakar; kendi tahtası boş', () => {
      const b = make({ 1: 'forge_master_golem', 8: 'wight' }, mode, { 0: 'warrior', 7: 'mage' });
      const g = at(b, 'enemy', 1);
      b.debugKill(g.uid);
      expect(groundCells(b, 'burning', 'enemy')).toEqual([]);
      const f = b.ground.find((x) => x.ground === 'burning')!;
      expect(f.board).toBe('party');
      expect(f.turns).toBe(4);
      expect([...f.slots].sort((x, y) => x - y)).toEqual([0, 1, 2, 4]);
      expect(has(at(b, 'party', 0), 'burning')).toBe(true);
      expect(has(at(b, 'party', 7), 'burning')).toBe(false);
    });
    it('Forge Golem çekirdeği yerinde kaldı', () => {
      const b = make({ 1: 'forge_golem', 8: 'wight' }, mode);
      b.debugKill(at(b, 'enemy', 1).uid);
      const f = b.ground.find((x) => x.ground === 'burning')!;
      expect(f.board).toBe('enemy');
      expect(f.turns).toBe(2);
    });
    it('Frost Bite: %35 zar; tutmazsa durum değişmez, tutarsa Chilled hedef donar. Rime Bite ve Ice Shot kesin', () => {
      const e = content.skills['frost_bite']!.effects.find((x) => x.type === 'status')!;
      expect(e.type === 'status' && e.chance).toBe(0.35);
      for (const id of ['rime_bite', 'ice_shot']) {
        const s = content.skills[id]!.effects.find((x) => x.type === 'status')!;
        expect(s.type === 'status' && s.chance, id).toBeUndefined();
      }
      let chilled = 0;
      let frozen = 0;
      let clean = 0;
      let held = 0;
      const N = 200;
      for (let seed = 1; seed <= N; seed++) {
        const b = make({ 0: 'snow_wolf' }, mode, { 0: 'warrior' }, seed);
        const w = at(b, 'enemy', 0);
        const h = at(b, 'party', 0);
        turnOf(b, w.uid);
        const first = b.useSkill(w.uid, 'frost_bite', h.uid);
        expect(first.ok).toBe(true);
        const gave = (r: typeof first, kind: string, uid: string) => r.ok && r.events.some((e) => e.type === 'status' && e.status === kind && e.target === uid);
        if (gave(first, 'chilled', h.uid)) chilled++;
        else clean++;
        // zaten Chilled: tutarsa Frozen, tutmazsa Chilled aynen
        const b2 = make({ 0: 'snow_wolf' }, mode, { 0: 'warrior' }, seed);
        const w2 = at(b2, 'enemy', 0);
        const h2 = at(b2, 'party', 0);
        turnOf(b2, w2.uid);
        b2.debugAddStatus(h2.uid, 'chilled', 3);
        const second = b2.useSkill(w2.uid, 'frost_bite', h2.uid);
        expect(second.ok).toBe(true);
        // Frozen turns modunda kahramanın hemen gelen turunda bitebilir: olaydan okunur
        if (gave(second, 'frozen', h2.uid)) frozen++;
        else {
          held++;
          expect(has(h2, 'chilled')).toBe(true);
          expect(gave(second, 'chilled', h2.uid)).toBe(false);
        }
      }
      expect(chilled + clean).toBe(N);
      expect(chilled / N).toBeGreaterThan(0.25);
      expect(chilled / N).toBeLessThan(0.45);
      expect(frozen / N).toBeGreaterThan(0.25);
      expect(frozen / N).toBeLessThan(0.45);
      expect(frozen + held).toBe(N);
    });
    it('Grave Cold: 2 tur Chilled, dondurmaz', () => {
      const b = make({ 0: 'wight' }, mode, { 0: 'warrior' });
      const w = at(b, 'enemy', 0);
      const h = at(b, 'party', 0);
      turnOf(b, w.uid);
      expect(b.useSkill(w.uid, 'gnaw', h.uid).ok).toBe(true);
      expect(h.statuses.find((s) => s.kind === 'chilled')?.turns).toBe(2);
      turnOf(b, w.uid);
      expect(b.useSkill(w.uid, 'gnaw', h.uid).ok).toBe(true);
      expect(has(h, 'frozen')).toBe(false);
    });
    it('Pyre Bolt hedefin hücresine 1 tur Burning bırakır; Witch ve Matriarch ortak', () => {
      for (const id of ['pyre_witch', 'pyre_matriarch']) {
        const b = make({ 6: id }, mode, { 1: 'warrior', 3: 'archer' });
        const w = at(b, 'enemy', 6);
        const h = at(b, 'party', 1);
        turnOf(b, w.uid);
        expect(b.useSkill(w.uid, 'pyre_bolt', h.uid).ok, id).toBe(true);
        expect(groundCells(b, 'burning', 'party'), id).toEqual([1]);
        expect(b.ground.find((g) => g.ground === 'burning')!.turns, id).toBe(1);
      }
    });
  });
});

describe('Pyre Bolt zamanlaması (turns)', () => {
  it('Witch kendi Bolt zemininden Spread the Flame atar; atmazsa zemin sonraki tur başında tik vermeden kalkar', () => {
    const b = make({ 6: 'pyre_witch' }, 'turns', { 1: 'warrior', 4: 'archer' });
    const w = at(b, 'enemy', 6);
    const h = at(b, 'party', 1);
    turnOf(b, w.uid);
    expect(b.useSkill(w.uid, 'pyre_bolt', h.uid).ok).toBe(true);
    turnOf(b, w.uid);
    expect(groundCells(b, 'burning', 'party')).toEqual([1]);
    expect(b.shapeAnchorCells(w.uid, 'spread_the_flame').some((c) => c.board === 'party' && c.slot === 1)).toBe(true);
    w.mp = w.maxMp;
    expect(chooseAction(b, w.uid, content.aiConfig)?.skillId).toBe('spread_the_flame');
    expect(b.useSkill(w.uid, 'spread_the_flame', undefined, 1, 'party').ok).toBe(true);
    expect(groundCells(b, 'burning', 'party').length).toBeGreaterThan(1);
  });
  it('Bolt zemini kahramana bir tur boyunca tek tik verir', () => {
    const b = make({ 6: 'pyre_witch' }, 'turns', { 1: 'warrior' });
    const w = at(b, 'enemy', 6);
    const h = at(b, 'party', 1);
    turnOf(b, w.uid);
    expect(b.useSkill(w.uid, 'pyre_bolt', h.uid).ok).toBe(true);
    let ticks = 0;
    const before = () => h.hp;
    for (let i = 0; i < 12; i++) {
      const uid = b.currentUid;
      const hp = before();
      b.skipTurn();
      if (uid === w.uid) continue;
      if (b.currentUid !== h.uid && h.hp < hp) ticks++;
      if (b.currentUid === h.uid && h.hp < hp) ticks++;
    }
    expect(ticks).toBeLessThanOrEqual(1);
    expect(groundCells(b, 'burning', 'party')).toEqual([]);
  });
});

describe('YZ', () => {
  const scoreOn = (b: Battle, c: Combatant, skill: string, target: string, key: string, weight: number): number => {
    const value = content.aiConfig.value!;
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, c.uid, content.aiConfig, trace, { value: { ...value, bossTouch: { ...value.bossTouch!, [key]: weight } } });
    const hit = trace.options.filter((o) => o.skill.id === skill && o.targetUid === target);
    expect(hit.length, skill).toBeGreaterThan(0);
    return Math.max(...hit.map((o) => o.score));
  };
  const killSetup = (enemies: Record<number, string>, slot: number) => {
    const b = make(enemies, 'turns', { 0: 'warrior' });
    const foe = at(b, 'enemy', slot);
    foe.hp = 1;
    const hero = at(b, 'party', 0);
    turnOf(b, hero.uid);
    return { b, foe, hero };
  };
  it('Oyuncu vekili: Forge-Master öldürmenin bedeli altındaki hücre için sayılır', () => {
    const { b, foe, hero } = killSetup({ 0: 'forge_master_golem' }, 0);
    expect(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'coreBurn', 5)).toBeLessThan(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'coreBurn', 0));
  });
  it('Oyuncu vekili: Standard-Bearer düşünce sıra koruması biter, öldürmek değerli', () => {
    const { b, foe, hero } = killSetup({ 0: 'frozen_standard_bearer', 1: 'morvane_halberdier', 2: 'clan_axeman' }, 0);
    expect(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'ranks', 5)).toBeGreaterThan(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'ranks', 0));
  });
  it('Oyuncu vekili: Oathkeeper dostunu öldürmek kalıcı zırh bedeli', () => {
    const { b, foe, hero } = killSetup({ 0: 'stonebound_warden', 1: 'oathkeeper' }, 0);
    expect(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'oath', 5)).toBeLessThan(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'oath', 0));
  });
  it('Oyuncu vekili: Brannoc öldürmek War-Chant kadar değerli', () => {
    const score = (keep: boolean) => {
      const b = make({ 0: 'clan_chief_brannoc', 1: 'clan_axeman', 2: 'clan_axeman' }, 'turns', { 0: 'warrior' });
      const s = at(b, 'enemy', 0);
      s.hp = 1;
      if (!keep) { const e = s.passive!.effect; if (e.type === 'highlandFury') delete e.chant; }
      const h = at(b, 'party', 0);
      turnOf(b, h.uid);
      const value = content.aiConfig.value!;
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, h.uid, content.aiConfig, trace, { value });
      return Math.max(...trace.options.filter((o) => o.targetUid === s.uid && o.skill.id === h.skills[0]).map((o) => o.score));
    };
    const withChant = score(true);
    const passive = content.mobs['clan_chief_brannoc']!.passive!.effect;
    const saved = passive.type === 'highlandFury' ? passive.chant : undefined;
    const without = score(false);
    if (passive.type === 'highlandFury' && saved) passive.chant = saved;
    expect(withChant).toBeGreaterThan(without);
  });
  it('Frozen Halberdier: Chop yoksa Pike Thrust kopyasını atar', () => {
    const c = pickIn({ 1: 'frozen_standard_bearer', 0: 'frozen_halberdier', 2: 'frozen_halberdier' }, 0, (_, u) => lock(u, 'halberd_chop'));
    expect(c?.skillId).toBe('frozen_pike_thrust');
  });
  it('Cold Command Haste almamış dosta', () => {
    const c = pickIn({ 1: 'frozen_standard_bearer', 0: 'morvane_halberdier', 2: 'morvane_halberdier' }, 1, (_, u) => lock(u, 'frost_banner'));
    expect(c?.skillId).toBe('cold_command');
  });

  const uses = (enemies: Record<number, string>, carrier: string, rounds = 90, seeds = [1, 2, 3]): Set<string> => {
    const out = new Set<string>();
    for (const seed of seeds) {
      const b = make(enemies, 'turns', HEROES, seed);
      for (const c of b.combatants) if (c.side === 'party') { c.maxHp *= 40; c.hp = c.maxHp; }
      for (const c of b.combatants) if (c.side === 'enemy') { c.maxHp *= 20; c.hp = c.maxHp; }
      for (let i = 0; i < rounds && !b.winner; i++) {
        const uid = b.currentUid;
        if (!uid) break;
        const actor = b.get(uid)!;
        const pick = chooseAction(b, uid, content.aiConfig);
        const r = b.applyChoice(uid, pick);
        if (!r.ok) break;
        if (pick && actor.defId === carrier) out.add(pick.skillId);
        if (pick?.skillId === 'rally_the_clan') expect(pick.board).toBe('enemy'); // yalnız kendi tahtası
      }
    }
    return out;
  };
  it.each([
    ['clan_chief_brannoc', { 1: 'clan_chief_brannoc', 0: 'clan_axeman', 2: 'clan_axeman', 7: 'clan_skald' }, ['great_axe', 'rally_the_clan', 'skullsplitter']],
    ['frozen_standard_bearer', { 1: 'frozen_standard_bearer', 0: 'morvane_halberdier', 2: 'morvane_halberdier', 7: 'bandit_crossbowman' }, ['standard_pole', 'cold_command', 'frost_banner']],
    ['oathkeeper', { 1: 'oathkeeper', 0: 'stonebound_warden', 2: 'stonebound_warden', 7: 'deep_runecaller' }, ['pick_of_the_deep', 'oath_of_stone', 'verdict']],
    ['frozen_halberdier', { 1: 'frozen_standard_bearer', 0: 'frozen_halberdier', 2: 'frozen_halberdier', 7: 'frozen_crossbowman' }, ['halberd_chop']],
    ['frozen_crossbowman', { 1: 'frozen_standard_bearer', 0: 'frozen_halberdier', 2: 'frozen_halberdier', 7: 'frozen_crossbowman' }, ['crossbow_bolt', 'ice_shot']],
    ['pyre_witch', { 6: 'pyre_witch', 1: 'cinder_knight' }, ['pyre_bolt', 'spread_the_flame']],
  ] as [string, Record<number, string>, string[]][])('%s imzalarını gerçek savaşta atar', (id, enemies, need) => {
    // Pyre Witch: Spread yalnız yerde Burning varken; tur başına hız zarıyla (Ömer 2026-11-07) 1-3 seed'lerinde denk gelmiyor, 5 eklendi
    const seen = uses(enemies, id, 90, id === 'pyre_witch' ? [1, 2, 3, 5] : [1, 2, 3]);
    for (const s of need) expect([...seen], `${id} ${s}`).toContain(s);
  }, 120000);
});

describe('içerik', () => {
  const THREE = ['clan_chief_brannoc', 'frozen_standard_bearer', 'oathkeeper'];
  it('karşılaşmalar: elitler kendi sınıfında, kadrolar seçime göre', () => {
    const names = (k: string) => ENCOUNTERS[k]!.units.map((u) => u.name ?? content.mobs[u.class]!.name).sort();
    const cls = (k: string, n: string) => ENCOUNTERS[k]!.units.find((u) => u.name === n)!.class;
    expect(cls('hc_12', 'Clan Chief Brannoc')).toBe('clan_chief_brannoc');
    expect(cls('hc_18', 'The Frozen Standard-Bearer')).toBe('frozen_standard_bearer');
    expect(cls('hc_35', 'The Oathkeeper')).toBe('oathkeeper');
    expect(names('hc_12')).toEqual(['Clan Axeman', 'Clan Axeman', 'Clan Chief Brannoc', 'Clan Skald']);
    expect(names('hc_18')).toEqual(['Frozen Crossbowman', 'Frozen Halberdier', 'Frozen Halberdier', 'The Frozen Standard-Bearer']);
    // eşlikçiler kendi sınıfında (Ömer 2026-11-02); hc_12 sprite yerine kendi kiti, hc_18 yer tutucunun statı ve çizimi
    expect(ENCOUNTERS['hc_12']!.units.map((u) => u.class).sort()).toEqual(['clan_axeman', 'clan_axeman', 'clan_chief_brannoc', 'clan_skald']);
    expect(ENCOUNTERS['hc_18']!.units.map((u) => u.class).sort()).toEqual(['frozen_crossbowman', 'frozen_halberdier', 'frozen_halberdier', 'frozen_standard_bearer']);
    for (const [id, was] of [['frozen_halberdier', 'morvane_halberdier'], ['frozen_crossbowman', 'bandit_crossbowman']] as const) {
      const d = content.mobs[id]!;
      const p = content.mobs[was]!;
      expect(d.spriteId, id).toBe(id); // kendi çizimi (2026-11-02); yer tutucunun statları aynı kalır
      expect(d.attributes, id).toEqual(p.attributes);
      expect(d.stats, id).toEqual(p.stats);
    }
    expect(ENCOUNTERS['hc_35']!.units.map((u) => u.class).sort()).toEqual(['deep_runecaller', 'oathkeeper', 'shardwalker', 'stonebound_warden']);
  });
  it('kendi idle çizimi; pasif ve skill metni okunur, "support" yok; ilk skill bedelsiz', () => {
    for (const id of THREE) {
      const d = content.mobs[id]!;
      expect(d.spriteId).toBe(id);
      expect(content.skills[d.skills[0]!]!.cost.amount, id).toBe(0);
      const text = describePassive(d.passive!, d.stats, content.formulas);
      expect(text.length, id).toBeGreaterThan(0);
      expect(text.toLowerCase(), id).not.toContain('support');
      for (const s of d.skills) {
        const lines = describeSkill(content.skills[s]!, d.stats, content.formulas).lines.join(' ');
        expect(lines.length, s).toBeGreaterThan(0);
        expect(lines.toLowerCase(), s).not.toContain('support');
      }
    }
    expect(describeSkill(content.skills['frost_bite']!, content.mobs['snow_wolf']!.stats, content.formulas).lines.join(' ')).toContain('35%');
  });
  it('debug savaşları kurulur, wiki yeni kuralları yazar', () => {
    for (const kind of ['brannoc', 'bearer', 'oathkeeper'] as const) {
      expect(TOUCH_TESTS.some((t) => t.kind === kind)).toBe(true);
      const data = touchTestBattleData(21, 'turns', kind);
      const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, data.seed, 'turns', { ...data.teams } as Teams, false));
      expect(b.combatants.some((c) => c.side === 'enemy')).toBe(true);
    }
    const text = JSON.stringify(buildMechanics());
    for (const w of ['Frozen Ranks', 'Stone Oath', 'War-chief']) expect(text).toContain(w);
  });
});
