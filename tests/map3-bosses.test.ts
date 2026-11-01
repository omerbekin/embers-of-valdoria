// Harita 3 boss / elit dokunuşları (maps-2-3.md E1-E6). Sayılar veriden okunur; iki savaş modunda.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, Side, Teams, UnitSetup } from '../src/engine';
import { TOUCH_TESTS, touchTestBattleData } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';
import { ENCOUNTERS } from '../src/campaign/data';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];
const GOLEM = content.mobs['forge_master_golem']!.touch as Extract<Combatant['touch'], { type: 'overheat' }>;
const SERMON = content.skills['long_sermon']!.longSermon!;

function make(enemies: Record<number, string>, mode: BattleMode, party: Record<number, string> = { 0: 'warrior', 3: 'druid', 7: 'mage' }, rules?: Teams['rules'], units?: Record<number, UnitSetup>, seed = 11): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies), ...(rules ? { rules } : {}), ...(units ? { units: { enemies: units } } : {}) } as Teams, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
function turnOf(b: Battle, uid: string): void {
  if (b.mode !== 'turns') return;
  for (let i = 0; i < 120 && b.currentUid !== uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}
function pass(b: Battle): BattleEvent[] {
  if (b.mode === 'turns') {
    const r = b.skipTurn();
    expect(r.ok).toBe(true);
    return r.ok ? r.events : [];
  }
  const hero = b.combatants.find((c) => c.hp > 0 && c.side === 'party' && !c.inert)!;
  hero.mp = hero.maxMp;
  // test modunda Rest çoğu zaman kapalı: geçerli bir hedefe vur (vaaz edene ve en yaralıya en son)
  const rest = b.globalSkillIds('party').find((x) => b.globalDef(x)?.kind === 'rest' && b.canUseGlobal(hero.uid, x).ok);
  if (rest) {
    const r = b.useGlobal(hero.uid, rest);
    return r.ok ? r.events : [];
  }
  for (const t of b.combatants.filter((c) => c.hp > 0 && c.side === 'enemy' && !c.sermon).sort((a, z) => z.hp - a.hp)) {
    const r = b.useSkill(hero.uid, hero.skills[0]!, t.uid);
    if (r.ok) return r.events;
  }
  return [];
}
function nextRound(b: Battle): BattleEvent[] {
  const r = b.round;
  const out: BattleEvent[] = [];
  for (let i = 0; i < 120 && b.round === r && !b.winner; i++) out.push(...pass(b));
  expect(b.round).toBeGreaterThan(r);
  return out;
}

describe('bağlar ve kapı', () => {
  it('kuzey düğümleri taşıyanlara bağlı, id ler korunur', () => {
    const cls = (k: string, name: string) => ENCOUNTERS[k]!.units.find((u) => u.name === name)!.class;
    expect(cls('hc_65', 'Forge-Master Golem')).toBe('forge_master_golem');
    expect(cls('hc_7', 'The Pack-Mother')).toBe('pack_mother');
    expect(cls('hc_61', 'The Ashborn Hierarch')).toBe('ashborn_hierarch');
    expect(cls('hc_snowfather', 'The Snowfather')).toBe('snowfather');
    expect(cls('hc_ember', 'The Ember of the First Hearth')).toBe('ember_of_the_first_hearth');
    expect(cls('hc_hollow_king', 'The Hollow King')).toBe('hollow_king');
    expect(cls('hc_50', 'The Pyre Matriarch')).toBe('pyre_matriarch');
    expect(cls('hc_79', 'The Cinder Warden')).toBe('cinder_warden');
    expect(cls('hc_hearthwarden', 'The Hearthwarden')).toBe('hearthwarden');
    expect(ENCOUNTERS['hc_hollow_king']!.noise).toBe('wake_the_halls');
    expect(ENCOUNTERS['hc_ember']!.device).toBe('tidewater_urn');
    expect(content.bosses['hollow_king']!.inert).toBeFalsy();
  });

  it('Omen ve Dark Bond yok, dokunuş metinleri görünür', () => {
    for (const id of ['forge_master_golem', 'pack_mother', 'ashborn_hierarch', 'snowfather', 'ember_of_the_first_hearth', 'hollow_king']) {
      const d = content.encounterUnit(id)!;
      expect(JSON.stringify(d.skills)).not.toMatch(/omen|dark_bond/i);
      expect(d.passive?.effect.type).not.toBe('darkBond');
    }
    const text = buildMechanics().map((m) => JSON.stringify(m)).join(' ');
    for (const w of ['Overheat', 'Thundersnow', 'Pack Rotation', 'The Long Sermon', 'Storm in the Chimney', 'The King Hears']) expect(text).toContain(w);
    expect(describeSkill(content.skills['long_sermon']!, content.mobs['ashborn_hierarch']!.stats, content.formulas).lines.join(' ')).toContain('Silence and Stun do not');
  });

  it('taşıyan yoksa dokunuş olayı ve durum yok', () => {
    for (const mode of MODES) {
      const b = make({ 0: 'drowned', 2: 'drowned' }, mode);
      const ev = [...pass(b), ...pass(b), ...pass(b)];
      expect(ev.some((e) => ['touchBar', 'vent', 'packRotation', 'sermonStart', 'kingHears'].includes(e.type))).toBe(false);
      expect(b.combatants.some((c) => c.heat !== undefined || c.sermon)).toBe(false);
    }
  });

  it('debug savaşları iki modda kurulur ve AI ile sonuna dek çökmeden oynanır', () => {
    for (const mode of MODES)
      for (const t of TOUCH_TESTS) {
        const data = touchTestBattleData(21, mode, t.kind);
        const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, data.seed, mode, { ...data.teams } as Teams, false));
        let i = 0;
        for (let n = 0; n < 400 && !b.winner; n++) {
          const living = b.combatants.filter((c) => c.hp > 0 && !c.inert);
          const uid = mode === 'turns' ? b.currentActor?.uid : living[i++ % living.length]?.uid;
          if (!uid) break;
          const r = b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
          if (!r.ok && mode === 'turns') break;
        }
        expect(b.combatants.length).toBeGreaterThan(0);
      }
  });
});

describe('E1 Overheat', () => {
  for (const mode of MODES) {
    it(`[${mode}] eylem doldurur, ateş hızlı, buz boşaltır`, () => {
      const b = make({ 1: 'forge_master_golem' }, mode);
      const g = at(b, 'enemy', 1);
      const mage = at(b, 'party', 7);
      expect(g.heat).toBe(0);
      turnOf(b, mage.uid);
      expect(b.useSkill(mage.uid, 'fire_bolt', g.uid).ok).toBe(true);
      expect(g.heat).toBe(GOLEM.fireHit);
      if (mode === 'test') {
        b.useSkill(g.uid, 'sledge', at(b, 'party', 0).uid);
        expect(g.heat).toBe(GOLEM.fireHit + GOLEM.perAction);
      }
      const before = g.heat!;
      turnOf(b, mage.uid);
      mage.cooldowns['ice_crater'] = 0;
      mage.mp = mage.maxMp;
      const r = b.useSkill(mage.uid, 'ice_crater', g.uid);
      expect(r.ok).toBe(true);
      expect(g.heat).toBeLessThan(before);
    });

    it(`[${mode}] dolunca Vent: tur kaybı, Armor 0, çubuk donar`, () => {
      const b = make({ 1: 'forge_master_golem' }, mode);
      const g = at(b, 'enemy', 1);
      b.debugHeat(g.uid, GOLEM.max);
      expect(g.heat).toBe(0);
      expect(g.statuses.some((s) => s.kind === GOLEM.status)).toBe(true);
      expect(b.effectiveStats(g).armor).toBe(0);
      b.debugHeat(g.uid, 2);
      expect(g.heat).toBe(0); // Vent sürerken donuk
      if (mode === 'test') {
        expect(b.canUse(g.uid, 'sledge').ok).toBe(false);
        nextRound(b);
        expect(g.statuses.some((s) => s.kind === GOLEM.status)).toBe(false);
        expect(b.canUse(g.uid, 'sledge').ok).toBe(true);
      } else {
        for (let i = 0; i < 40 && g.statuses.some((s) => s.kind === GOLEM.status); i++) b.skipTurn();
        expect(g.statuses.some((s) => s.kind === GOLEM.status)).toBe(false);
        expect(g.heat).toBe(0); // yanan tur doldurmaz
      }
    });
  }

  it('Soaked Round başında boşaltır', () => {
    const b = make({ 1: 'forge_master_golem' }, 'test');
    const g = at(b, 'enemy', 1);
    b.debugHeat(g.uid, 4);
    g.statuses.push({ kind: 'soaked', turns: 9, source: g.uid });
    nextRound(b);
    expect(g.heat).toBe(4 - GOLEM.coolHit);
  });

  it('önizleme Heat yazar; YZ dolu çubukta ateşi yeğler', () => {
    const b = make({ 1: 'forge_master_golem' }, 'turns');
    const g = at(b, 'enemy', 1);
    const mage = at(b, 'party', 7);
    turnOf(b, mage.uid);
    const lines = previewSkill(b, mage.uid, 'fire_bolt', g.uid).flatMap((p) => p.statuses ?? []);
    expect(lines.join(' ')).toContain(`Heat +${GOLEM.fireHit}`);
    g.heat = GOLEM.max - 1;
    expect(b.heatDelta(g, content.skills['fire_bolt']!)).toBe(GOLEM.fireHit);
    expect(b.heatDelta(g, content.skills['ice_crater']!)).toBe(-GOLEM.coolHit);
    const value = content.aiConfig.value!;
    const heavy = chooseAction(b, mage.uid, content.aiConfig, undefined, { value: { ...value, bossTouch: { ...value.bossTouch!, heat: 50 } } });
    expect(heavy?.skillId).toBe('fire_bolt');
  });
});

describe('E2 Thundersnow + Whiteout', () => {
  for (const mode of MODES) {
    it(`[${mode}] %50 altında sütun işaretlenir, sonraki Round iner; AI işareti okur`, () => {
      const b = make({ 1: 'snowfather' }, mode);
      const s = at(b, 'enemy', 1);
      let ev = nextRound(b);
      expect(ev.some((e) => e.type === 'hazardWarn' && e.kind === 'strike')).toBe(false);
      s.hp = Math.floor(s.maxHp * 0.4);
      ev = nextRound(b);
      const warn = ev.find((e) => e.type === 'hazardWarn' && e.kind === 'strike');
      expect(warn).toBeDefined();
      if (warn?.type !== 'hazardWarn') return;
      const lane = warn.cells[0]! % 3;
      expect(warn.cells.every((c) => c % 3 === lane)).toBe(true);
      const h = b.hazards.find((x) => x.kind === 'strike')!;
      const hero = b.combatants.find((c) => c.side === 'party')!;
      expect(b.strikeDamage(h, hero)).toBeGreaterThan(0);
      ev = nextRound(b);
      const land = ev.find((e) => e.type === 'hazardLand' && e.kind === 'strike');
      expect(land).toBeDefined();
    });
  }

  it('bir Armor farkı: ağır zırh daha çok çeker (Iron Draws)', () => {
    const b = make({ 1: 'snowfather' }, 'test', { 0: 'warrior', 1: 'warrior' });
    at(b, 'enemy', 1).hp = 1;
    const a = at(b, 'party', 0);
    const h = { id: 'x', kind: 'strike', board: 'party', cells: [0], dueRound: 9, strike: { side: 'enemy', source: at(b, 'enemy', 1).uid, skill: 'thundersnow', ratio: 0.2, iron: 0.5 } } as never;
    const noIron = { ...(h as object), strike: { side: 'enemy', source: at(b, 'enemy', 1).uid, skill: 'thundersnow', ratio: 0.2, iron: 0 } } as never;
    expect(b.strikeDamage(h, a)).toBeGreaterThan(b.strikeDamage(noIron, a));
  });

  for (const mode of MODES) {
    it(`[${mode}] Whiteout karanlık açar, süre bitince kapanır, şimşek aydınlatır`, () => {
      const b = make({ 1: 'snowfather' }, mode);
      const s = at(b, 'enemy', 1);
      expect(b.isDark()).toBe(false);
      turnOf(b, s.uid);
      const cast = b.round;
      const r = b.useSkill(s.uid, 'whiteout');
      expect(r.ok).toBe(true);
      if (b.round === cast) {
        expect(b.isDark()).toBe(true);
        nextRound(b);
      }
      expect(b.round).toBe(cast + 1);
      expect(b.isDark()).toBe(true); // sonraki Round da karanlık
      nextRound(b);
      expect(b.isDark()).toBe(false); // süre bitti
      expect(b.darkRule()).toBeUndefined();
    });

    it(`[${mode}] Whiteout karanlığında iniş Thunderflash verir`, () => {
      const b = make({ 1: 'snowfather' }, mode);
      const s = at(b, 'enemy', 1);
      s.hp = Math.floor(s.maxHp * 0.4);
      const ev: BattleEvent[] = [...nextRound(b)];
      for (const h of b.hazards) h.dueRound = b.round + 1;
      turnOf(b, s.uid);
      const r = b.useSkill(s.uid, 'whiteout');
      expect(r.ok).toBe(true);
      if (r.ok) ev.push(...r.events);
      if (!ev.some((e) => e.type === 'hazardLand' && e.kind === 'strike')) ev.push(...nextRound(b));
      expect(ev.some((e) => e.type === 'hazardLand' && e.kind === 'strike')).toBe(true);
      expect(ev.some((e) => e.type === 'thunderflash')).toBe(true);
    });
  }

  it('bosslar Frozen olmaz', () => {
    const b = make({ 1: 'snowfather' }, 'test', { 0: 'mage' });
    const s = at(b, 'enemy', 1);
    b.debugAddStatus(s.uid, 'chilled');
    const mage = at(b, 'party', 0);
    mage.mp = mage.maxMp;
    b.useSkill(mage.uid, 'ice_crater', s.uid);
    expect(s.statuses.some((x) => x.kind === 'frozen')).toBe(false);
  });

  it('YZ Whiteout u karanlık yokken değerli bulur', () => {
    const b = make({ 1: 'snowfather' }, 'turns');
    const s = at(b, 'enemy', 1);
    turnOf(b, s.uid);
    const value = content.aiConfig.value!;
    const c = chooseAction(b, s.uid, content.aiConfig, undefined, { value: { ...value, bossTouch: { ...value.bossTouch!, whiteout: 50 } } });
    expect(c?.skillId).toBe('whiteout');
  });
});

describe('E3 Pack Rotation', () => {
  for (const mode of MODES) {
    it(`[${mode}] en yaralı kurt geri, sağlam öne`, () => {
      const b = make({ 1: 'pack_mother', 0: 'grey_wolf', 3: 'grey_wolf' }, mode);
      const [front, rear] = [at(b, 'enemy', 0), at(b, 'enemy', 3)];
      front.hp = Math.floor(front.maxHp * 0.3);
      const ev = nextRound(b);
      expect(ev.some((e) => e.type === 'packRotation')).toBe(true);
      expect(front.slot).toBe(3);
      expect(rear.slot).toBe(0);
    });

    it(`[${mode}] saldırısı yaralı kurtları %5 iyileştirir, kendisi hariç`, () => {
      const b = make({ 1: 'pack_mother', 0: 'grey_wolf' }, mode);
      const [m, w] = [at(b, 'enemy', 1), at(b, 'enemy', 0)];
      w.hp = 10;
      m.hp = 20;
      turnOf(b, m.uid);
      const r = b.useSkill(m.uid, 'frost_fang', b.combatants.find((c) => c.side === 'party' && c.slot === 0)!.uid);
      expect(r.ok).toBe(true);
      const heals = r.ok ? r.events.filter((e) => e.type === 'heal' && e.cause === 'pack_rotation') : [];
      expect(heals.map((e) => (e.type === 'heal' ? [e.target, e.amount] : []))).toEqual([[w.uid, Math.max(1, Math.round(w.maxHp * 0.05))]]);
    });
  }

  it('sağlam kurt yoksa dönüş yok', () => {
    const b = make({ 1: 'pack_mother', 0: 'grey_wolf' }, 'test');
    at(b, 'enemy', 0).hp = 5;
    expect(nextRound(b).some((e) => e.type === 'packRotation')).toBe(false);
  });

  it('YZ şifa ve Mother ı indirme değerini okur', () => {
    const b = make({ 1: 'pack_mother', 0: 'grey_wolf' }, 'test');
    const [m, w] = [at(b, 'enemy', 1), at(b, 'enemy', 0)];
    w.hp = 10;
    expect(b.packHealWorth(m)).toBe(Math.max(1, Math.round(w.maxHp * 0.05)));
    expect(b.packOfTouch(m).map((x) => x.uid)).toEqual([w.uid]);
  });
});

describe('E4 The Long Sermon', () => {
  const setup = (mode: BattleMode) => {
    const b = make({ 7: 'ashborn_hierarch', 6: 'pitch_boiler' }, mode);
    const h = at(b, 'enemy', 7);
    turnOf(b, h.uid);
    expect(b.useSkill(h.uid, 'long_sermon').ok).toBe(true);
    return { b, h };
  };
  for (const mode of MODES) {
    it(`[${mode}] başlar, eylem yok, 3 Round sonunda tamamlanır, Burning şifa olur`, () => {
      const { b, h } = setup(mode);
      expect(h.sermon?.goal).toBe(Math.max(1, Math.round(h.maxHp * SERMON.breakRatio)));
      expect(b.canUse(h.uid, 'ember_toss').ok).toBe(false);
      expect(b.sermonHeals(at(b, 'enemy', 6), 'burning')).toBe(false);
      const r0 = b.round;
      const ev: BattleEvent[] = [];
      for (let i = 0; i < SERMON.rounds; i++) ev.push(...nextRound(b));
      expect(b.round).toBe(r0 + SERMON.rounds);
      expect(h.sermon).toBeUndefined();
      expect(ev.some((e) => e.type === 'sermonEnd' && e.outcome === 'done')).toBe(true);
      expect(b.sermonHeals(at(b, 'enemy', 6), 'burning')).toBe(true);
      expect(b.sermonHeals(at(b, 'party', 0), 'burning')).toBe(false);
      expect(b.sermonHeals(at(b, 'enemy', 6), 'flooded')).toBe(false);
      expect(b.canUse(h.uid, 'long_sermon').ok).toBe(false);
    });

    it(`[${mode}] yalnız hasar eşiği bozar`, () => {
      const { b, h } = setup(mode);
      h.statuses.push({ kind: 'silence', turns: 5, source: h.uid } as never);
      h.statuses.push({ kind: 'stun', turns: 5, source: h.uid } as never);
      expect(h.sermon).toBeDefined();
      h.statuses = [];
      const mage = at(b, 'party', 7);
      const goal = h.sermon!.goal;
      h.maxHp = h.hp = 99999;
      for (let i = 0; i < 40 && h.sermon; i++) {
        turnOf(b, mage.uid);
        mage.mp = mage.maxMp;
        mage.cooldowns = {};
        const r = b.useSkill(mage.uid, 'fire_bolt', h.uid);
        expect(r.ok).toBe(true);
        if (h.sermon) expect(h.sermon.taken).toBeGreaterThan(0);
      }
      expect(h.sermon).toBeUndefined();
      expect(goal).toBeGreaterThan(0);
      expect(b.sermonDone('enemy')).toBe(false);
      if (mode === 'turns') expect(h.statuses.some((s) => s.kind === 'staggered')).toBe(true);
    });
  }

  it('tamamlanınca Burning zemin tiki Ashborn u iyileştirir', () => {
    const { b, h } = setup('turns');
    for (let i = 0; i < SERMON.rounds; i++) nextRound(b);
    expect(h.sermon).toBeUndefined();
    const w = at(b, 'enemy', 6);
    expect(b.sermonFlock('enemy', SERMON).map((c) => c.uid)).toContain(w.uid);
    expect(b.groundHazardAt(w, w.board, w.slot)).toBe(0);
  });

  it('YZ vaaz değeri: sürü yoksa başlatmaz, ağırlık yüksekse başlatır', () => {
    const b = make({ 7: 'ashborn_hierarch', 6: 'pitch_boiler', 8: 'cinderleaper' }, 'turns');
    const h = at(b, 'enemy', 7);
    turnOf(b, h.uid);
    const value = content.aiConfig.value!;
    expect(chooseAction(b, h.uid, content.aiConfig, undefined, { value: { ...value, bossTouch: { ...value.bossTouch!, sermon: 50 } } })?.skillId).toBe('long_sermon');
    expect(chooseAction(b, h.uid, content.aiConfig, undefined, { value: { ...value, bossTouch: { ...value.bossTouch!, sermon: 0 } } })?.skillId).not.toBe('long_sermon');
  });
});

describe('E5 Storm in the Chimney', () => {
  for (const mode of MODES) {
    it(`[${mode}] %30 altında Flare şimşeğe döner, Urn YZ si kaçınır`, () => {
      const b = make({ 1: 'ember_of_the_first_hearth' }, mode, { 0: 'warrior', 3: 'warrior', 7: 'mage' }, { device: 'tidewater_urn' });
      const e = at(b, 'enemy', 1);
      expect(e.skills).toContain('flare');
      expect(b.thunderSkillsOf('enemy')).toHaveLength(0);
      const mage = at(b, 'party', 7);
      e.hp = Math.ceil(e.maxHp * 0.3) + 1;
      turnOf(b, mage.uid);
      mage.mp = mage.maxMp;
      b.useSkill(mage.uid, 'fire_bolt', e.uid);
      expect(e.skills).toContain('flare_storm');
      expect(e.skills).not.toContain('flare');
      expect(b.thunderSkillsOf('enemy')).toHaveLength(1);
      const r = b.useSkill(e.uid, 'flare_storm', at(b, 'party', 0).uid);
      if (mode === 'test') expect(r.ok).toBe(true);
    });
  }

  it('Urn suyu şimşeği iletir', () => {
    const b = make({ 1: 'ember_of_the_first_hearth' }, 'test', { 1: 'warrior', 0: 'druid', 7: 'mage' }, { device: 'tidewater_urn' });
    const e = at(b, 'enemy', 1);
    const hero = at(b, 'party', 1);
    const row = b.urnRows()[0]!;
    const slot = b.urnRowCells(row)[0]!;
    expect(b.useGlobal(hero.uid, 'tidewater_urn', slot).ok).toBe(true);
    e.skills = ['flare_storm'];
    const target = b.combatants.find((c) => c.side === 'party' && b.urnRowCells(row).includes(c.slot) && c.hp > 0)!;
    const r = b.useSkill(e.uid, 'flare_storm', target.uid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.events.some((x) => x.type === 'liveWater' || (x.type === 'shock' && x.stunned))).toBe(true);
  });
});

describe('E6 The King Hears', () => {
  const king = (mode: BattleMode, kingOn = true) => {
    const at0: Record<number, string> = { 7: 'deep_runecaller', 8: 'deep_runecaller' };
    if (kingOn) at0[4] = 'hollow_king';
    return make(at0, mode, undefined, { noise: 'wake_the_halls' });
  };
  for (const mode of MODES) {
    it(`[${mode}] dolunca kural Warden ı + King in bedava Warden ı`, () => {
      const b = king(mode);
      const k = at(b, 'enemy', 4);
      const n0 = b.combatants.length;
      const cd = { ...k.cooldowns };
      b.debugNoise(b.noiseState()!.rule.goal);
      expect(b.combatants.length - n0).toBe(2);
      expect(k.cooldowns).toEqual(cd); // bedava: bekleme yok
    });

    it(`[${mode}] King ölünce yalnız kural Warden ı kalkar`, () => {
      const b = king(mode);
      at(b, 'enemy', 4).hp = 0;
      const n0 = b.combatants.length;
      b.debugNoise(b.noiseState()!.rule.goal);
      expect(b.combatants.length - n0).toBe(1);
    });

    it(`[${mode}] normal Call the Vault Warden kaldırır, tavanda kapanır`, () => {
      const b = king(mode);
      const k = at(b, 'enemy', 4);
      turnOf(b, k.uid);
      const n0 = b.combatants.length;
      expect(b.useSkill(k.uid, 'call_the_vault').ok).toBe(true);
      expect(b.combatants.length).toBe(n0 + 1);
      const name = content.skills['call_the_vault']!.callVault!.name;
      expect(b.combatants.some((c) => c.displayName === name)).toBe(true);
    });
  }

  it('YZ: King ayaktayken Noise bedeli iki kat', () => {
    expect(king('test').kingListening()).toBe(true);
    expect(king('test', false).kingListening()).toBe(false);
    const b = king('turns');
    const k = at(b, 'enemy', 4);
    turnOf(b, k.uid);
    const value = content.aiConfig.value!;
    expect(chooseAction(b, k.uid, content.aiConfig, undefined, { value: { ...value, bossTouch: { ...value.bossTouch!, vault: 50 } } })?.skillId).toBe('call_the_vault');
  });
});
