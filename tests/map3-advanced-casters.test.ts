import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, explainChoice } from '../src/engine';
import { unitLabel, type AiTrace } from '../src/engine/ai';
import { rangeOn } from './range-helpers';

/** Gelişmiş Harita 3 büyücüleri (Combat Design 2026-11-02): Hollow Runecaller, Ashborn Acolyte. Yalnız var olan etkiler; YZ Sunder terimi yeni. */
const F = content.formulas;
const L = F.formation.lanes;
const BACK = (F.formation.rows - 1) * L;
const cells = (map: Record<number, string>) => Array.from({ length: F.formation.rows * L }, (_, i) => map[i] ?? '');
const MODES = ['turns', 'test'] as const;

function make(mob: string, mode: 'turns' | 'test' = 'turns', extra: Record<number, string> = {}) {
  const b = new Battle(rangeOn(content.battleSetup('random-battle', 1, mode, { party: cells({ 0: 'warrior', 1: 'mage', [BACK]: 'druid' }), enemies: cells({ [BACK]: mob, ...extra }) }, false)));
  b.debug.dodge = 'never';
  const m = b.combatants.find((c) => c.side === 'enemy' && c.defId === mob)!;
  const h = b.combatants.find((c) => c.side === 'party' && c.defId === 'mage')!;
  if (mode === 'turns') for (let i = 0; i < 200 && b.currentUid !== m.uid; i++) b.skipTurn();
  return { b, m, h };
}
const has = (u: { statuses: { kind: string }[] }, s: string) => u.statuses.some((x) => x.kind === s);
const m3Full = 100000; // tek vuruşta ölmeyecek can

describe('kit', () => {
  it.each([['hollow_runecaller', 'rune_spark', 'glyph_of_breaking'], ['ashborn_acolyte', 'ember_toss', 'burn_the_ground']])('%s: taban kitten güçlü, imza mekaniği yok', (id, baseA, baseB) => {
    const d = content.mobs[id]!;
    const pow = (s: string) => (content.skills[s]!.effects.find((e) => e.type === 'damage') as { power: number }).power;
    expect(pow(d.skills[0]!)).toBeGreaterThan(pow(baseA));
    expect(pow(d.skills[1]!)).toBeGreaterThan(pow(baseB));
    expect(JSON.stringify(d.skills.map((s) => content.skills[s]!.effects))).not.toMatch(/omen|dark_bond/);
  });
  it('Hollow Runecaller Hollow Crown adıyla eşleşir; Ashborn Acolyte Pyre Witch ile aynı aile', () => {
    expect(JSON.stringify(content.bosses['hollow_king'])).toContain(`"${content.mobs['hollow_runecaller']!.name}"`);
    expect(content.mobs['ashborn_acolyte']!.family).toBe(content.mobs['pyre_witch']!.family);
  });
  it('Burn the Ground zemin gücü Ember Acolyte ile aynı: Kindling yığını büyümez', () => {
    const g = (id: string) => content.skills[id]!.effects.find((e) => e.type === 'ground') as { power: number; turns: number };
    expect(g('ashborn_burn_the_ground').power).toBe(g('burn_the_ground').power);
    expect(g('ashborn_burn_the_ground').turns).toBe(g('burn_the_ground').turns);
  });
});

describe.each(MODES)('%s modu', (mode) => {
  it('Rune Spark 3 MP yakar', () => {
    const { b, m, h } = make('hollow_runecaller', mode);
    h.mp = 40;
    expect(b.useSkill(m.uid, 'hollow_rune_spark', h.uid).ok).toBe(true);
    expect(b.log.some((e) => e.type === 'manaBurn' && e.target === h.uid && e.amount === 3)).toBe(true);
  });
  it('Glyph alandakilere Sunder verir, Ward-Etcher dosta kalkan verir', () => {
    const { b, m, h } = make('hollow_runecaller', mode, { 0: 'hollow_warden' });
    expect(b.useSkill(m.uid, 'hollow_glyph', h.uid).ok).toBe(true);
    expect(has(h, 'sunder')).toBe(true);
    expect(b.log.some((e) => e.type === 'passive' && e.passive === 'ward_etcher')).toBe(true);
  });
  it('Ember Toss Burning durumu verir, zemin bırakmaz', () => {
    const { b, m, h } = make('ashborn_acolyte', mode);
    expect(b.useSkill(m.uid, 'ashborn_ember_toss', h.uid).ok).toBe(true);
    expect(has(h, 'burning')).toBe(true);
    expect(b.groundCellCount('burning')).toBe(0);
  });
});

describe('YZ', () => {
  const glyphScore = (sundered: boolean) => {
    const { b, m } = make('hollow_runecaller', 'test');
    if (sundered) for (const c of b.combatants) if (c.side === 'party') b.debugAddStatus(c.uid, 'sunder', 3);
    m.mp = m.maxMp;
    b.debugClearCooldowns();
    const list = (explainChoice(b, m.uid, content.aiConfig)?.candidates ?? []).filter((c) => c.skill === 'hollow_glyph');
    expect(list.length).toBeGreaterThan(0);
    return Math.max(...list.map((c) => c.score ?? 0));
  };
  it('Sunder henüz yoksa Glyph daha değerli (zaten Sunder\'lı hedefe boşa)', () => {
    expect(glyphScore(false)).toBeGreaterThan(glyphScore(true));
  });
  it.each([['hollow_runecaller', 'hollow_rune_spark'], ['ashborn_acolyte', 'ashborn_ember_toss']])('%s: temel saldırı aday listesinde', (mob, skill) => {
    const { b, m } = make(mob, 'test');
    expect((explainChoice(b, m.uid, content.aiConfig)?.candidates ?? []).some((c) => c.skill === skill)).toBe(true);
  });
  const withKit = (over: Record<string, number>) => ({ ...content.aiConfig.value!, mobKit: { ...content.aiConfig.value!.mobKit!, ...over } });
  it('Ward-Etcher: MP bedelli skill kalkan değeri kazanır, bedelsiz temel saldırı kazanmaz', () => {
    const score = (mob: string, skill: string, wardEtch: number) => {
      const { b, m } = make(mob, 'test', { 0: 'hollow_warden' });
      m.mp = m.maxMp;
      b.debugClearCooldowns();
      const list = (explainChoice(b, m.uid, content.aiConfig, { value: withKit({ wardEtch }) })?.candidates ?? []).filter((c) => c.skill === skill);
      expect(list.length).toBeGreaterThan(0);
      return Math.max(...list.map((c) => c.score ?? 0));
    };
    expect(score('hollow_runecaller', 'hollow_glyph', 0.15)).toBeGreaterThan(score('hollow_runecaller', 'hollow_glyph', 0));
    expect(score('hollow_runecaller', 'hollow_rune_spark', 0.15)).toBe(score('hollow_runecaller', 'hollow_rune_spark', 0));
  });
  it('Last Ember: kahraman öldüreceği Acolyte\'a vurmanın bedelini görür; can yüksekken bedel yok', () => {
    const score = (hp: number, lastEmber: number) => {
      const { b, m, h } = make('ashborn_acolyte', 'test', { 0: 'warrior' });
      m.hp = hp;
      m.maxHp = Math.max(m.maxHp, hp);
      const all = explainChoice(b, h.uid, content.aiConfig, { value: withKit({ lastEmber }) })?.candidates ?? [];
      const list = all.filter((c) => c.hits.includes(unitLabel(m)));
      expect(list.length).toBeGreaterThan(0);
      return Math.max(...list.map((c) => c.score ?? 0));
    };
    expect(score(1, 0.5)).toBeLessThan(score(1, 0));
    expect(score(m3Full, 0.5)).toBe(score(m3Full, 0));
  });
  it('Ember Toss\'un Burning\'i hamle değerine girer', () => {
    const { b, m } = make('ashborn_acolyte', 'test');
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, m.uid, content.aiConfig, trace);
    const notes = trace.options.filter((o) => o.skill.id === 'ashborn_ember_toss').flatMap((o) => o.notes);
    expect(notes.some((n) => n.includes('wither'))).toBe(true);
  });
  it('Rune Spark mana yakmayı değerler: manalı hedefte burn değeri var', () => {
    const burn = (mp: number) => {
      const { b, m } = make('hollow_runecaller', 'test');
      for (const c of b.combatants) if (c.side === 'party') c.mp = mp;
      const list = (explainChoice(b, m.uid, content.aiConfig)?.candidates ?? []).filter((c) => c.skill === 'hollow_rune_spark');
      return Math.max(...list.map((c) => c.burn));
    };
    expect(burn(40)).toBeGreaterThan(0);
    expect(burn(0)).toBe(0);
  });
});
