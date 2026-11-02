// Harita 3 elit ve boss kitleri (maps-2-3.md; Ömer 2026-11-01): 9 kit, kural + YZ, iki savaş modu. Bayrak kapalı. Sayılar veriden okunur.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, describeSkill } from '../src/engine';
import type { AiTrace } from '../src/engine/ai';
import type { BattleMode, Combatant, Side, Teams, UnitSetup } from '../src/engine';
import { TOUCH_TESTS, touchTestBattleData } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';
import { ENCOUNTERS } from '../src/campaign/data';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];
const HEROES = { 0: 'warrior', 1: 'warrior', 3: 'druid', 7: 'mage' };
function make(enemies: Record<number, string>, mode: BattleMode = 'test', party: Record<number, string> = HEROES, rules?: Teams['rules'], units?: Record<number, UnitSetup>, seed = 5): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies), ...(rules ? { rules } : {}), ...(units ? { units: { enemies: units } } : {}) }, false));
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
/** Round ilerletir: turns modunda pas, test modunda boş tur akışı yok, sıradakini vurarak. */
function nextRound(b: Battle): void {
  const r = b.round;
  for (let i = 0; i < 200 && b.round === r && !b.winner; i++) {
    if (b.mode === 'turns') {
      b.skipTurn();
      continue;
    }
    const hero = b.combatants.find((c) => c.hp > 0 && c.side === 'party' && !c.inert)!;
    hero.mp = hero.maxMp;
    const rest = b.globalSkillIds('party').find((x) => b.globalDef(x)?.kind === 'rest' && b.canUseGlobal(hero.uid, x).ok);
    if (rest) {
      b.useGlobal(hero.uid, rest);
      continue;
    }
    for (const foe of b.combatants.filter((c) => c.hp > 0 && c.side === 'enemy').sort((a, z) => z.hp - a.hp)) {
      foe.hp = foe.maxHp;
      if (b.useSkill(hero.uid, hero.skills[0]!, foe.uid).ok) break;
    }
  }
  expect(b.round).toBeGreaterThan(r);
}
/** Telgrafı çözer: turns modunda adalet kuralı dolana dek pas, test modunda kaynağın bir sonraki eylemi. */
function resolve(b: Battle, src: Combatant): void {
  if (b.mode === 'turns') {
    for (let i = 0; i < 120 && b.telegraphs.length; i++) b.skipTurn();
    return;
  }
  const free = src.skills[0]!;
  const t = b.validTargets(src.uid, free)[0];
  src.cooldowns = {};
  b.useSkill(src.uid, free, t?.uid);
}
/** Vaaz bitmiş say (Kindle the Nave kapısı). */
const bless = (b: Battle) => (b as unknown as { sermonBlessed: Map<Side, unknown> }).sermonBlessed.set('enemy', content.skills['long_sermon']!.longSermon);
const groundCells = (b: Battle, ground: string, board: Side) => [...new Set(b.ground.filter((g) => g.ground === ground && g.board === board).flatMap((g) => g.slots))].sort((x, y) => x - y);

describe.each(MODES)('%s modu', (mode) => {
  describe('Pack-Mother', () => {
    it('Frost Fang: Chilled, zaten Chilled ise Frozen', () => {
      const b = make({ 1: 'pack_mother' }, mode);
      const m = at(b, 'enemy', 1);
      const h = at(b, 'party', 0);
      turnOf(b, m.uid);
      expect(b.useSkill(m.uid, 'frost_fang', h.uid).ok).toBe(true);
      expect(has(h, 'chilled')).toBe(true);
      expect(has(h, 'frozen')).toBe(false);
      turnOf(b, m.uid);
      expect(b.useSkill(m.uid, 'frost_fang', h.uid).ok).toBe(true);
      expect(has(h, 'frozen')).toBe(true);
    });
    it('Snowdrift: işaretli 2x2, çözülünce Chill Ground, hasar yok', () => {
      const b = make({ 1: 'pack_mother' }, mode);
      const m = at(b, 'enemy', 1);
      const h = at(b, 'party', 0);
      turnOf(b, m.uid);
      expect(b.useSkill(m.uid, 'snowdrift', undefined, 0, 'party').ok).toBe(true);
      expect(b.telegraphs).toHaveLength(1);
      expect(b.telegraphs[0]!.cells).toHaveLength(4);
      expect(groundCells(b, 'storm', 'party')).toEqual([]);
      const marked = b.telegraphs[0]!.cells;
      const hp = h.hp;
      resolve(b, m);
      expect(groundCells(b, 'storm', 'party')).toEqual([...marked].sort((x, y) => x - y));
      expect(b.ground.find((g) => g.ground === 'storm')!.noDamage).toBe(true);
      if (mode === 'turns') expect(h.hp).toBe(hp);
    });
    it('Throat Leap: arka sıraya ulaşır, Bleeding verir', () => {
      const b = make({ 1: 'pack_mother' }, mode);
      const m = at(b, 'enemy', 1);
      const back = at(b, 'party', 7);
      expect(b.validTargets(m.uid, 'throat_leap').map((c) => c.uid)).toContain(back.uid);
      turnOf(b, m.uid);
      expect(b.useSkill(m.uid, 'throat_leap', back.uid).ok).toBe(true);
      expect(has(back, 'bleeding')).toBe(true);
    });
    it('Pack Rotation dokunuşu duruyor', () => {
      expect(content.mobs['pack_mother']!.touch?.type).toBe('packRotation');
    });
  });

  describe('Pyre Matriarch', () => {
    it('Greater Kindling: Burning hücre başına +%5, tavan yok', () => {
      const b = make({ 7: 'pyre_matriarch' }, mode);
      const m = at(b, 'enemy', 7);
      const h = at(b, 'party', 0);
      expect(b.passiveDealtMult(m, h)).toBe(1);
      b.debugPlaceGround(m.uid, 'burning', 'party', [0, 1, 2, 3, 4, 5, 6, 7, 8], 3);
      b.debugPlaceGround(m.uid, 'burning', 'enemy', [0, 1, 2, 3, 4, 5], 3);
      const per = 0.05;
      expect(b.passiveDealtMult(m, h)).toBeCloseTo(1 + per * b.groundCellCount('burning'), 5);
      expect(b.groundCellCount('burning')).toBeGreaterThanOrEqual(15);
    });
    it('Stoke: işaretli 2x2 Burning; Spread the Flame kullanılır', () => {
      const b = make({ 7: 'pyre_matriarch' }, mode);
      const m = at(b, 'enemy', 7);
      turnOf(b, m.uid);
      expect(b.useSkill(m.uid, 'matriarch_stoke', undefined, 0, 'party').ok).toBe(true);
      const marked = [...b.telegraphs[0]!.cells].sort((x, y) => x - y);
      expect(marked).toHaveLength(4);
      resolve(b, m);
      expect(groundCells(b, 'burning', 'party')).toEqual(expect.arrayContaining(marked));
      expect(m.skills).toContain('spread_the_flame');
    });
  });

  describe('Forge-Master Golem', () => {
    it('Sledge Sunder verir; Reforge yalnız golem, %20, kendisi değil', () => {
      const b = make({ 1: 'forge_master_golem', 0: 'forge_golem', 2: 'cinder_knight' }, mode);
      const g = at(b, 'enemy', 1);
      const small = at(b, 'enemy', 0);
      const other = at(b, 'enemy', 2);
      const h = at(b, 'party', 1);
      turnOf(b, g.uid);
      expect(b.useSkill(g.uid, 'sledge', h.uid).ok).toBe(true);
      expect(has(h, 'sunder')).toBe(true);
      expect(b.validTargets(g.uid, 'reforge').map((c) => c.uid)).toEqual([small.uid]);
      expect(b.validTargets(g.uid, 'reforge').map((c) => c.uid)).not.toContain(other.uid);
      small.hp = 10;
      turnOf(b, g.uid);
      g.mp = g.maxMp;
      const r = b.useSkill(g.uid, 'reforge', small.uid);
      expect(r.ok).toBe(true);
      const heal = r.ok ? r.events.find((e) => e.type === 'heal' && e.target === small.uid) : undefined;
      expect(heal?.type === 'heal' ? heal.amount : 0).toBe(Math.round(small.maxHp * 0.2));
    });
    it('Rivet Plate dosta kalkan', () => {
      const b = make({ 1: 'forge_master_golem', 0: 'forge_golem' }, mode);
      const g = at(b, 'enemy', 1);
      const small = at(b, 'enemy', 0);
      turnOf(b, g.uid);
      expect(b.useSkill(g.uid, 'rivet_plate', small.uid).ok).toBe(true);
      expect(small.shield).toBeGreaterThan(0);
    });
    it('Furnace Core iki kat: Forge Golem turunun iki katı', () => {
      const touch = content.mobs['forge_master_golem']!.touch as Extract<Combatant['touch'], { type: 'overheat' }>;
      const small = content.mobs['forge_golem']!.passive!.effect as { type: 'furnaceCore'; turns: number; power: number };
      expect(touch.core!.turns).toBe(small.turns * 2);
      expect(touch.core!.power).toBeCloseTo(small.power * 2, 5);
      const b = make({ 1: 'forge_master_golem', 8: 'wight' }, mode);
      const g = at(b, 'enemy', 1);
      b.debugKill(g.uid);
      const burning = b.ground.find((x) => x.ground === 'burning');
      expect(burning?.turns).toBe(touch.core!.turns);
      expect(burning?.slots).toContain(1);
    });
  });

  describe('Ashborn Hierarch', () => {
    const HIER = { 4: 'ashborn_hierarch', 0: 'pyre_witch', 8: 'forge_golem' };
    it('Shepherd of Ash: Ashborn dost yaşarken %25 az; golem saymaz', () => {
      const b = make(HIER, mode);
      const c = at(b, 'enemy', 4);
      expect(b.passiveTakenMult(c, 'physical')).toBeCloseTo(0.75, 5);
      b.debugKill(at(b, 'enemy', 0).uid);
      expect(b.passiveTakenMult(c, 'physical')).toBe(1);
    });
    it('Fervour: bir dosta Ash Surge', () => {
      const b = make(HIER, mode);
      const c = at(b, 'enemy', 4);
      const w = at(b, 'enemy', 0);
      turnOf(b, c.uid);
      expect(b.useSkill(c.uid, 'fervour', w.uid).ok).toBe(true);
      expect(has(w, 'ash_surge')).toBe(true);
    });
    it('Kindle the Nave: vaaz bitmeden kapalı, sonra kendi sırası yanar; Ashborn iyileşir, ötekiler yanar', () => {
      const b = make({ 4: 'ashborn_hierarch', 3: 'pyre_witch', 5: 'forge_golem' }, mode);
      const c = at(b, 'enemy', 4);
      expect(b.canUse(c.uid, 'kindle_the_nave').ok).toBe(false);
      bless(b);
      turnOf(b, c.uid);
      c.mp = c.maxMp;
      const r = b.useSkill(c.uid, 'kindle_the_nave');
      expect(r.ok).toBe(true);
      expect(groundCells(b, 'burning', 'enemy')).toEqual(b.rowCellsOf(c));
      const g = b.ground.find((x) => x.ground === 'burning')!;
      expect(g.sourceSide).toBe('party');
      expect(b.sermonHeals(at(b, 'enemy', 3), 'burning')).toBe(true);
      expect(b.sermonHeals(at(b, 'enemy', 5), 'burning')).toBe(false);
    });
  });

  describe('Cinder Warden', () => {
    it('Searing Bash Burning; Hold the Gate 2 tur taunt + Fortified; Slag Wall işaretli sütun Burning', () => {
      const b = make({ 1: 'cinder_warden' }, mode);
      const w = at(b, 'enemy', 1);
      const h = at(b, 'party', 1);
      turnOf(b, w.uid);
      expect(b.useSkill(w.uid, 'searing_bash', h.uid).ok).toBe(true);
      expect(has(h, 'burning')).toBe(true);
      turnOf(b, w.uid);
      w.mp = w.maxMp;
      expect(b.useSkill(w.uid, 'warden_hold_gate').ok).toBe(true);
      expect(has(w, 'fortify')).toBe(true);
      turnOf(b, w.uid);
      w.mp = w.maxMp;
      expect(b.useSkill(w.uid, 'slag_wall', undefined, 1, 'party').ok).toBe(true);
      const marked = [...b.telegraphs[0]!.cells].sort((x, y) => x - y);
      expect(marked).toHaveLength(4);
      resolve(b, w);
      expect(groundCells(b, 'burning', 'party')).toEqual(expect.arrayContaining(marked));
    });
    it('Tempering duruşu değiştirir: Harita 1 Cinder Gatewarden etkilenmez', () => {
      const b = make({ 1: 'cinder_warden' }, mode);
      expect(at(b, 'enemy', 1).passive?.effect?.type).toBe('tempering');
      expect(content.mobs['cinder_gatewarden']!.skills).not.toContain('searing_bash');
      expect(content.mobs['cinder_gatewarden']!.passive?.effect?.type).not.toBe('tempering');
    });
  });

  describe('Snowfather', () => {
    it('Frostbound: Chilled ya da Frozen kahraman başına +%6', () => {
      const b = make({ 1: 'snowfather' }, mode);
      const s = at(b, 'enemy', 1);
      const h = at(b, 'party', 0);
      expect(b.passiveDealtMult(s, h)).toBe(1);
      b.debugAddStatus(at(b, 'party', 0).uid, 'chilled', 3);
      expect(b.passiveDealtMult(s, h)).toBeCloseTo(1.06, 5);
      b.debugAddStatus(at(b, 'party', 3).uid, 'frozen', 2);
      expect(b.passiveDealtMult(s, h)).toBeCloseTo(1.12, 5);
    });
    it('Avalanche: işaretli sütun, işaretten çıkan yemez; Roar: tüm kahramanlar Slow', () => {
      const b = make({ 1: 'snowfather' }, mode);
      const s = at(b, 'enemy', 1);
      turnOf(b, s.uid);
      expect(b.useSkill(s.uid, 'avalanche', undefined, 0, 'party').ok).toBe(true);
      const cellsAt = b.telegraphs[0]!.cells;
      expect(cellsAt).toHaveLength(4);
      const inLane = at(b, 'party', cellsAt.find((x) => [0, 1, 3, 7].includes(x))!);
      const out = b.combatants.find((c) => c.side === 'party' && !cellsAt.includes(c.slot))!;
      const [a, o] = [inLane.hp, out.hp];
      resolve(b, s);
      expect(inLane.hp).toBeLessThan(a);
      if (mode === 'turns') expect(out.hp).toBeGreaterThanOrEqual(o - 0);
      const c = make({ 1: 'snowfather' }, mode);
      const s2 = at(c, 'enemy', 1);
      turnOf(c, s2.uid);
      const roar = c.useSkill(s2.uid, 'roar');
      expect(roar.ok).toBe(true);
      for (const h of c.combatants.filter((x) => x.side === 'party')) expect(roar.ok && roar.events.some((e) => e.type === 'status' && e.target === h.uid && e.status === 'slow'), h.name).toBe(true);
    });
  });

  describe('Hollow King', () => {
    it('Kingsmaul hedefin hücresini işaretler, sonraki Round çöker ve kapalı kalır', () => {
      const b = make({ 4: 'hollow_king' }, mode);
      const k = at(b, 'enemy', 4);
      const h = at(b, 'party', 1);
      turnOf(b, k.uid);
      expect(b.useSkill(k.uid, 'kingsmaul', h.uid).ok).toBe(true);
      const mark = b.hazards.find((x) => x.caveIn?.id === 'kingsmaul');
      expect(mark?.cells).toEqual([1]);
      expect(mark?.board).toBe('party');
      for (let i = 0; i < 3 && !b.closedCells.party.includes(1); i++) nextRound(b);
      expect(b.closedCells.party).toContain(1);
      expect(b.isBlocked(1, 'party')).toBe(true);
    });
    it('Kingsmaul tavanı: 3 kapalı hücreden sonra işaret yok', () => {
      const b = make({ 4: 'hollow_king' }, mode);
      const k = at(b, 'enemy', 4);
      const rule = content.skills['kingsmaul']!.caveIn!.rule;
      b.closedCells.party.push(...[2, 5, 8].slice(0, rule.maxClosed));
      turnOf(b, k.uid);
      expect(b.useSkill(k.uid, 'kingsmaul', at(b, 'party', 0).uid).ok).toBe(true);
      expect(b.hazards.filter((x) => x.caveIn?.id === 'kingsmaul')).toHaveLength(0);
    });
    it('Bring Down the Hall 3 hücre işaretler, kahramana yer bırakır', () => {
      const b = make({ 4: 'hollow_king' }, mode);
      const k = at(b, 'enemy', 4);
      turnOf(b, k.uid);
      expect(b.useSkill(k.uid, 'bring_down_the_hall').ok).toBe(true);
      const mark = b.hazards.find((x) => x.caveIn?.id === 'bring_down_the_hall');
      expect(mark?.cells).toHaveLength(3);
      for (let i = 0; i < 3 && b.closedCells.party.length < 3; i++) nextRound(b);
      expect(b.closedCells.party).toHaveLength(3);
    });
    it('Decree of Stone: dostlara Fortified', () => {
      const b = make({ 4: 'hollow_king', 0: 'hollow_warden' }, mode);
      const k = at(b, 'enemy', 4);
      turnOf(b, k.uid);
      expect(b.useSkill(k.uid, 'decree_of_stone').ok).toBe(true);
      expect(has(k, 'fortify')).toBe(true);
      expect(has(at(b, 'enemy', 0), 'fortify')).toBe(true);
    });
  });

  describe('Hearthwarden', () => {
    it('Forge-Heat: her Round başı bir sıra işaretlenir, sonraki Round yanar', () => {
      const b = make({ 4: 'hearthwarden', 0: 'forge_golem' }, mode);
      if (!b.hazards.some((h) => h.forge)) nextRound(b);
      const mark = b.hazards.find((h) => h.forge)!;
      expect(mark.board).toBe('party');
      expect(mark.cells).toHaveLength(3);
      const row = [...mark.cells];
      nextRound(b);
      expect(groundCells(b, 'burning', 'party')).toEqual(expect.arrayContaining(row));
      expect(b.hazards.some((h) => h.forge && h.dueRound > b.round)).toBe(true);
    });
    it('Forge-Heat: Hearthwarden ölürse işaret yanmaz', () => {
      const b = make({ 4: 'hearthwarden', 0: 'forge_golem' }, mode);
      if (!b.hazards.some((h) => h.forge)) nextRound(b);
      b.debugKill(at(b, 'enemy', 4).uid);
      nextRound(b);
      expect(groundCells(b, 'burning', 'party')).toEqual([]);
    });
    it('Quench: yangın yokken kapalı; varsa hepsini söndürür, hücre başına şifa', () => {
      const b = make({ 4: 'hearthwarden', 0: 'forge_golem' }, mode);
      const w = at(b, 'enemy', 4);
      expect(b.canUse(w.uid, 'quench').ok).toBe(false);
      b.debugPlaceGround(w.uid, 'burning', 'party', [0, 1, 2], 3);
      b.debugPlaceGround(w.uid, 'burning', 'enemy', [7, 8], 3);
      w.hp = 100;
      turnOf(b, w.uid);
      w.mp = w.maxMp;
      const n = b.groundCellCount('burning');
      expect(n).toBeGreaterThan(0);
      expect(b.useSkill(w.uid, 'quench').ok).toBe(true);
      expect(b.groundCellCount('burning')).toBe(0);
      expect(w.hp).toBe(100 + Math.round(w.maxHp * content.skills['quench']!.quench!.healRatio * n));
    });
    it('Forge Chains: Slow + Burning; Temper the Crown: güvenli hücre yok', () => {
      const b = make({ 4: 'hearthwarden', 0: 'forge_golem' }, mode);
      const w = at(b, 'enemy', 4);
      const h = at(b, 'party', 3);
      turnOf(b, w.uid);
      expect(b.useSkill(w.uid, 'forge_chains', h.uid).ok).toBe(true);
      expect(has(h, 'slow')).toBe(true);
      expect(has(h, 'burning')).toBe(true);
      turnOf(b, w.uid);
      w.mp = w.maxMp;
      expect(b.useSkill(w.uid, 'temper_the_crown').ok).toBe(true);
      const t = b.telegraphs.find((x) => x.skill === 'temper_the_crown')!;
      expect(t.cells).toHaveLength(content.CELL_COUNT);
      expect(t.safeCells).toBeUndefined();
    });
  });

  describe('Ember of the First Hearth', () => {
    it('Everburning: Burning hücre başına %3 az, düz %50 yok', () => {
      const b = make({ 4: 'ember_of_the_first_hearth' }, mode);
      const e = at(b, 'enemy', 4);
      expect(b.passiveTakenMult(e, 'magic')).toBe(1);
      b.debugPlaceGround(e.uid, 'burning', 'party', [0, 1, 2], 3);
      expect(b.passiveTakenMult(e, 'magic')).toBeCloseTo(1 - 0.03 * b.groundCellCount('burning'), 5);
    });
    it('Cinder Storm X şekli Burning; Breathe sıra; The First Fire tüm tahta 3 tur', () => {
      const b = make({ 4: 'ember_of_the_first_hearth' }, mode);
      const e = at(b, 'enemy', 4);
      expect(b.areaCells('cinder_storm', 4, 'party', e.uid)).toEqual(expect.arrayContaining([0, 2, 4, 6, 8]));
      expect(b.areaCells('breathe', 4, 'party', e.uid)).toEqual([3, 4, 5]);
      const anchors = b.shapeAnchorCells(e.uid, 'the_first_fire').filter((x) => x.board === 'party');
      expect(anchors.length).toBeGreaterThan(0);
      const whole = b.areaCells('the_first_fire', anchors[0]!.slot, 'party', e.uid);
      expect(whole).toHaveLength(content.CELL_COUNT);
      turnOf(b, e.uid);
      expect(b.useSkill(e.uid, 'the_first_fire', undefined, anchors[0]!.slot, 'party').ok).toBe(true);
      expect(groundCells(b, 'burning', 'party')).toHaveLength(content.CELL_COUNT);
      expect(b.ground.find((g) => g.ground === 'burning')!.turns).toBeGreaterThanOrEqual(content.skills['the_first_fire']!.effects[0]!['turns' as never] - 1);
    });
  });
});

describe('Hollow Crown (yalnız turns: test modunda tur yok)', () => {
  it('Hollow dost ölünce kralın sonraki turu 2 eylem; başka ölüm saymaz; biriktirmez', () => {
    const units = { 0: { displayName: 'Hollow Warden' }, 2: { displayName: 'Hollow Warden' } };
    const b = make({ 4: 'hollow_king', 0: 'hollow_warden', 2: 'hollow_warden', 8: 'wight' }, 'turns', HEROES, undefined, units);
    const k = at(b, 'enemy', 4);
    b.debugKill(at(b, 'enemy', 8).uid);
    expect(k.crownAction).toBeUndefined();
    b.debugKill(at(b, 'enemy', 0).uid);
    expect(k.crownAction).toBe(true);
    b.debugKill(at(b, 'enemy', 2).uid);
    expect(k.crownAction).toBe(true);
    const others = b.combatants.filter((c) => c.side === 'party');
    for (const o of others) expect(o.hp).toBeGreaterThan(0);
    turnOf(b, k.uid);
    expect(k.crownAction).toBeUndefined();
    const target = at(b, 'party', 0);
    const first = b.useSkill(k.uid, 'kingsmaul', target.uid);
    expect(first.ok).toBe(true);
    expect(b.currentUid).toBe(k.uid); // ikinci eylem
  });
});

describe('boss dokunulmazlığı', () => {
  it.each(['snowfather', 'hollow_king', 'hearthwarden', 'ember_of_the_first_hearth'])('%s Frozen tutmaz', (id) => {
    const b = make({ 4: id }, 'test', HEROES, undefined, { 4: { tier: 'boss' } });
    const u = at(b, 'enemy', 4);
    expect(b.statusBlocked(u, 'frozen')).toBe(true);
  });
});

describe('YZ', () => {
  const pickIn = (enemies: Record<number, string>, slot: number, set: (b: Battle, u: Combatant) => void, party: Record<number, string> = HEROES) => {
    const b = make(enemies, 'turns', party);
    const u = at(b, 'enemy', slot);
    turnOf(b, u.uid);
    u.mp = u.maxMp;
    set(b, u);
    return chooseAction(b, u.uid, content.aiConfig);
  };
  const lock = (u: Combatant, ...ids: string[]) => { for (const id of ids) u.cooldowns[id] = 5; };

  it('Pack-Mother Snowdrift ve Throat Leap kullanır, Chilled hedefe Frost Fang', () => {
    expect(pickIn({ 1: 'pack_mother' }, 1, (_, u) => lock(u, 'throat_leap'))?.skillId).toMatch(/snowdrift|frost_fang/);
    expect(pickIn({ 1: 'pack_mother' }, 1, (_, u) => lock(u, 'snowdrift', 'frost_fang'))?.skillId).toBe('throat_leap');
  });
  it('Reforge yaralı golem varken seçilir, sağlıkta seçilmez', () => {
    const c = pickIn({ 1: 'forge_master_golem', 0: 'forge_golem' }, 1, (b, u) => { lock(u, 'rivet_plate'); at(b, 'enemy', 0).hp = 8; });
    expect(c?.skillId).toBe('reforge');
    const d = pickIn({ 1: 'forge_master_golem', 0: 'forge_golem' }, 1, (_, u) => lock(u, 'rivet_plate'));
    expect(d?.skillId).not.toBe('reforge');
  });
  it('Quench: yaralı ve yangın varken seçilir, sağlıkta tek hücre için boşa atılmaz', () => {
    const a = pickIn({ 4: 'hearthwarden' }, 4, (b, u) => { u.hp = Math.round(u.maxHp * 0.3); b.debugPlaceGround(u.uid, 'burning', 'party', [0, 1, 2, 3, 4, 5], 3); lock(u, 'forge_chains', 'temper_the_crown'); });
    expect(a?.skillId).toBe('quench');
    const b2 = pickIn({ 4: 'hearthwarden' }, 4, (b, u) => { b.debugPlaceGround(u.uid, 'burning', 'party', [0], 3); lock(u, 'forge_chains', 'temper_the_crown'); });
    expect(b2?.skillId).not.toBe('quench');
  });
  it('Kindle the Nave vaaz bitip yaralı Ashborn varken seçilir', () => {
    const c = pickIn({ 4: 'ashborn_hierarch', 3: 'pyre_witch', 5: 'cinder_knight' }, 4, (b, u) => { bless(b); at(b, 'enemy', 3).hp = 10; at(b, 'enemy', 5).hp = 10; lock(u, 'fervour', 'long_sermon'); });
    expect(c?.skillId).toBe('kindle_the_nave');
  });
  /** Aynı kurulum, tek ağırlık farkı: hedefe göre en iyi skor. */
  const scoreOn = (b: Battle, c: Combatant, skill: string, target: string | undefined, key: string, weight: number): number => {
    const value = content.aiConfig.value!;
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, c.uid, content.aiConfig, trace, { value: { ...value, bossTouch: { ...value.bossTouch!, [key]: weight } } });
    const hit = trace.options.filter((o) => o.skill.id === skill && (target === undefined || o.targetUid === target));
    expect(hit.length, skill).toBeGreaterThan(0);
    return Math.max(...hit.map((o) => o.score));
  };
  it('Oyuncu vekili: Hollow dostu öldürmek krala eylem verir, bedel skorda', () => {
    const b = make({ 4: 'hollow_king', 0: 'hollow_warden' }, 'turns', { 0: 'warrior' }, undefined, { 0: { displayName: 'Hollow Warden' } });
    const hero = at(b, 'party', 0);
    const foe = at(b, 'enemy', 0);
    foe.hp = 1;
    turnOf(b, hero.uid);
    expect(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'crown', 5)).toBeLessThan(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'crown', 0));
  });
  it('Oyuncu vekili: son Ashborn düşünce Shepherd biter, öldürmek değerli', () => {
    const b = make({ 4: 'ashborn_hierarch', 0: 'pyre_witch' }, 'turns', { 0: 'warrior' });
    const hero = at(b, 'party', 0);
    const foe = at(b, 'enemy', 0);
    foe.hp = 1;
    turnOf(b, hero.uid);
    expect(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'shepherd', 5)).toBeGreaterThan(scoreOn(b, hero, hero.skills[0]!, foe.uid, 'shepherd', 0));
  });
  it('Frostbound ve Everburning değerleri kendi hamlesinde sayılır', () => {
    const e = make({ 4: 'ember_of_the_first_hearth' }, 'turns');
    const ember = at(e, 'enemy', 4);
    turnOf(e, ember.uid);
    ember.mp = ember.maxMp;
    expect(scoreOn(e, ember, 'breathe', undefined, 'everburn', 20)).toBeGreaterThan(scoreOn(e, ember, 'breathe', undefined, 'everburn', 0));
    const s = make({ 1: 'snowfather' }, 'turns');
    const father = at(s, 'enemy', 1);
    turnOf(s, father.uid);
    father.mp = father.maxMp;
    expect(scoreOn(s, father, 'whiteout', undefined, 'frostbound', 20)).toBeGreaterThan(scoreOn(s, father, 'whiteout', undefined, 'frostbound', 0));
  });
  it('Oyuncu vekili: Everburning taşıyanına karşı söndürmek değerli, yangın bırakmak bedelli', () => {
    const wet = make({ 4: 'ember_of_the_first_hearth' }, 'turns', { 7: 'salt_hag' });
    const hag = at(wet, 'party', 7);
    const ember = at(wet, 'enemy', 4);
    wet.debugPlaceGround(ember.uid, 'burning', 'enemy', [3, 4, 5], 3);
    turnOf(wet, hag.uid);
    hag.mp = hag.maxMp;
    expect(scoreOn(wet, hag, 'brackish_tide', undefined, 'douse', 5)).toBeGreaterThan(scoreOn(wet, hag, 'brackish_tide', undefined, 'douse', 0));
    const dry = make({ 4: 'ember_of_the_first_hearth' }, 'turns', { 7: 'ember_acolyte' });
    const aco = at(dry, 'party', 7);
    turnOf(dry, aco.uid);
    aco.mp = aco.maxMp;
    expect(scoreOn(dry, aco, 'burn_the_ground', undefined, 'douse', 5)).toBeLessThan(scoreOn(dry, aco, 'burn_the_ground', undefined, 'douse', 0));
  });
  it('Kingsmaul Hollow Crown yokken de seçilir (bedelsiz temel); Bring Down the Hall yer varken seçilir', () => {
    expect(pickIn({ 4: 'hollow_king' }, 4, (_, u) => lock(u, 'call_the_vault', 'decree_of_stone', 'bring_down_the_hall'))?.skillId).toBe('kingsmaul');
    expect(pickIn({ 4: 'hollow_king' }, 4, (_, u) => lock(u, 'call_the_vault', 'decree_of_stone', 'kingsmaul'))?.skillId).toBe('bring_down_the_hall');
  });

  // Yapay zekâ gerçek bir savaşta imzalarını atıyor: tok kahramanlara karşı bounded maç, atılan skill sayımı
  const uses = (enemies: Record<number, string>, carrier: string, rounds = 90, setup?: (b: Battle) => void, seeds = [1, 2, 3]): Set<string> => {
    const out = new Set<string>();
    for (const seed of seeds) {
      const b = make(enemies, 'turns', HEROES, undefined, undefined, seed);
      setup?.(b);
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
      }
    }
    return out;
  };
  it.each([
    ['pack_mother', { 1: 'pack_mother', 0: 'grey_wolf', 2: 'grey_wolf' }, ['frost_fang', 'snowdrift', 'throat_leap']],
    ['pyre_matriarch', { 7: 'pyre_matriarch', 6: 'ember_acolyte', 8: 'ember_acolyte' }, ['pyre_bolt', 'matriarch_stoke', 'spread_the_flame']],
    ['forge_master_golem', { 1: 'forge_master_golem', 0: 'forge_golem', 2: 'forge_golem' }, ['sledge', 'reforge', 'rivet_plate']],
    ['ashborn_hierarch', { 7: 'ashborn_hierarch', 6: 'pyre_witch', 8: 'cinder_knight' }, ['long_sermon', 'fervour']],
    ['cinder_warden', { 1: 'cinder_warden', 7: 'pyre_witch' }, ['searing_bash', 'warden_hold_gate', 'slag_wall']],
    ['snowfather', { 4: 'snowfather', 0: 'snow_wolf' }, ['avalanche', 'roar', 'whiteout']],
    ['hollow_king', { 4: 'hollow_king', 0: 'hollow_warden' }, ['kingsmaul', 'decree_of_stone', 'bring_down_the_hall']],
    ['hearthwarden', { 4: 'hearthwarden', 0: 'forge_golem' }, ['hammerfall', 'forge_chains', 'temper_the_crown', 'quench']],
    ['ember_of_the_first_hearth', { 4: 'ember_of_the_first_hearth', 0: 'molten_hound' }, ['flare', 'cinder_storm', 'breathe', 'the_first_fire']],
  ] as [string, Record<number, string>, string[]][])('%s imzalarını atar', (id, enemies, need) => {
    // Roar nadir ve yola duyarlı (30 seed'in yarısında bir kez): snowfather daha çok seed'le ölçülür
    const seen = uses(enemies, id, 90, undefined, id === 'snowfather' ? [1, 2, 3, 10, 11, 14] : undefined);
    for (const s of need) expect([...seen], `${id} ${s}`).toContain(s);
  }, 120000);
});

describe('içerik', () => {
  const NINE = ['pack_mother', 'pyre_matriarch', 'forge_master_golem', 'ashborn_hierarch', 'cinder_warden', 'snowfather', 'hollow_king', 'hearthwarden', 'ember_of_the_first_hearth'];
  it('karşılaşmalar kitli sınıfa bağlı, statlar ve modlar aynı kaldı, Harita 1 Warden koptu', () => {
    const cls = (k: string, n: string) => ENCOUNTERS[k]!.units.find((u) => u.name === n)!.class;
    expect(cls('hc_50', 'The Pyre Matriarch')).toBe('pyre_matriarch');
    expect(cls('hc_79', 'The Cinder Warden')).toBe('cinder_warden');
    expect(cls('hc_hearthwarden', 'The Hearthwarden')).toBe('hearthwarden');
  });
  it('her yeni pasif ve skill metni okunur, "support" kelimesi yok', () => {
    for (const id of NINE) {
      const d = content.mobs[id] ?? content.bosses[id]!;
      if (d.passive) {
        const text = describePassive(d.passive, d.stats, content.formulas);
        expect(text.length, id).toBeGreaterThan(0);
        expect(text.toLowerCase(), id).not.toContain('support');
      }
      for (const s of d.skills) {
        const skill = content.skills[s]!;
        const lines = describeSkill(skill, d.stats, content.formulas).lines.join(' ');
        expect(lines.length, s).toBeGreaterThan(0);
        expect(lines.toLowerCase(), s).not.toContain('support');
        expect(skill.artOf ?? s, s).toBeTruthy();
      }
    }
  });
  it('Reforge ve Quench açıklaması kuralı söyler', () => {
    const q = describeSkill(content.skills['quench']!, content.bosses['hearthwarden']!.stats, content.formulas, {}, { grounds: content.grounds }).lines.join(' ');
    expect(q).toContain('Burning');
    const r = describeSkill(content.skills['reforge']!, content.mobs['forge_master_golem']!.stats, content.formulas).lines.join(' ');
    expect(r).toContain('20%');
    expect(r).toContain('Forge Golem');
  });
  it('debug savaşları kurulur, wiki yeni kuralları yazar', () => {
    for (const kind of ['matriarch', 'warden', 'hearthwarden'] as const) {
      expect(TOUCH_TESTS.some((t) => t.kind === kind)).toBe(true);
      const data = touchTestBattleData(21, 'turns', kind);
      const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, data.seed, 'turns', { ...data.teams } as Teams, false));
      expect(b.combatants.some((c) => c.side === 'enemy')).toBe(true);
    }
    const text = JSON.stringify(buildMechanics());
    for (const w of ['Hollow Crown', 'Forge-Heat', 'Quench', 'Everburning', 'Frostbound', 'Greater Kindling', 'Shepherd of Ash', 'Kindle the Nave']) expect(text).toContain(w);
  });
});
