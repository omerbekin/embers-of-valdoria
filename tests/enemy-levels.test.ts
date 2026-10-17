import { describe, expect, it } from 'vitest';
import { LEVELS, baseRuleOk, enemyLevelAttrAdd, growthAlloc, withEnemyLevel, ATTRS, type LevelRules } from '../src/progression/levels';
import { bosses, classes, formulas, mobs, encounterUnit } from '../src/engine/content';
import { applyUnitModifiers } from '../src/engine/stats';
import { battlePlan, getMap, newCampaign, nodeLevel, pickHero } from '../src/campaign';
import { newRun, waveLevel, wavePlan } from '../src/endless';
import type { Attributes } from '../src/engine/types';

// Düşman level'ı (Ömer 2026-10-17, docs/design/progression/levels.md > Düşman level'ı)

const total = (a: Attributes) => ATTRS.reduce((t, k) => t + a[k], 0);
const plus = (base: Attributes, add: Partial<Attributes> | undefined): Attributes => {
  const o = { ...base };
  for (const k of ATTRS) o[k] += add?.[k] ?? 0;
  return o;
};
const units = { ...classes, ...mobs, ...bosses };

describe('düşman stat büyümesi', () => {
  it('veri: açık, kahramanla aynı puan (level başına statPointsPerLevel x statPerPoint)', () => {
    expect(LEVELS.enemies?.enabled).toBe(true);
    const add = enemyLevelAttrAdd('warrior', 10)!;
    expect(total(add as Attributes)).toBe(9 * LEVELS.statPointsPerLevel * LEVELS.statPerPoint);
    expect(enemyLevelAttrAdd('warrior', 1)).toBeUndefined();
    expect(enemyLevelAttrAdd('no_such_unit', 10)).toBeUndefined();
  });

  it('profil = birimin temel stat oranları: en yüksek temel stat en çok puanı alır (kural izin verdikçe)', () => {
    const a = growthAlloc({ str: 30, int: 20, dex: 10, luck: 10 }, 21);
    expect(ATTRS.reduce((t, k) => t + (a[k] ?? 0), 0)).toBe(60);
    expect(a.str!).toBeGreaterThan(a.int!);
    expect(a.int!).toBeGreaterThan(a.dex!);
    // veri profili temel oranların yerine geçer
    const r: LevelRules = { ...LEVELS, enemies: { enabled: true, profiles: { warrior: { luck: 1 } } } };
    expect(Object.keys(enemyLevelAttrAdd('warrior', 5, r)!)).toEqual(['luck']);
  });

  it('temel stat kuralı: hiçbir birimde, hiçbir level için puan alan stat diğer üçünün toplamını aşmaz; kurala uyan birim uymaya devam eder', () => {
    for (const [id, def] of Object.entries(units)) {
      for (const lv of [2, 5, 10, 25, 50]) {
        const add = enemyLevelAttrAdd(id, lv);
        const a = plus(def.attributes, add);
        for (const k of ATTRS) if (add?.[k]) expect(a[k], `${id} L${lv} ${k}`).toBeLessThanOrEqual(total(a) - a[k]);
        if (baseRuleOk(def.attributes)) expect(baseRuleOk(a), `${id} L${lv}`).toBe(true);
      }
    }
  });

  it('kuralı baştan aşan mob (Road Thug, STR > diğerleri): önce diğer statları büyür, puanlar yine tam verilir', () => {
    const base = encounterUnit('road_thug')!.attributes;
    expect(baseRuleOk(base)).toBe(false);
    const add2 = enemyLevelAttrAdd('road_thug', 2)!;
    expect(add2.str ?? 0).toBe(0);
    const add30 = enemyLevelAttrAdd('road_thug', 30)!;
    expect(total(add30 as Attributes)).toBe(29 * LEVELS.statPointsPerLevel * LEVELS.statPerPoint);
    const a = plus(base, add30);
    expect(baseRuleOk(a)).toBe(true);
  });

  it('can ve türev statlar statlardan türer; çarpanlar korunur, attrAdd toplanır', () => {
    const def = classes['warrior']!;
    const l1 = applyUnitModifiers(def, withEnemyLevel(undefined, 'warrior', 1), formulas);
    const l10 = applyUnitModifiers(def, withEnemyLevel(undefined, 'warrior', 10), formulas);
    expect(l1).toBe(def);
    expect(l10.stats.hp).toBeGreaterThan(def.stats.hp);
    const m = withEnemyLevel({ hpMult: 1.5, attrAdd: { luck: 2 } }, 'warrior', 3)!;
    expect(m.hpMult).toBe(1.5);
    expect(m.attrAdd!.luck! >= 2).toBe(true);
    expect(total(plus({ str: 0, int: 0, dex: 0, luck: 0 }, m.attrAdd))).toBe(2 + 2 * LEVELS.statPointsPerLevel * LEVELS.statPerPoint);
  });

  it('kapalıysa (enabled false) büyüme yok', () => {
    const r: LevelRules = { ...LEVELS, enemies: { enabled: false } };
    expect(enemyLevelAttrAdd('warrior', 20, r)).toBeUndefined();
    expect(withEnemyLevel(undefined, 'warrior', 20, r)).toBeUndefined();
  });
});

describe('sefer ve Endless planları', () => {
  it('sefer: düşman level = düğüm seviyesi; L1 düğümde ek yok, final boss düğümünde her düşman büyür', () => {
    const map = getMap('valdoria');
    const battles = map.nodes.filter((n) => n.encounter);
    const s0 = pickHero(newCampaign({ mode: 'normal', seed: 3 }), 'warrior');
    const first = battles.find((n) => nodeLevel('valdoria', n.id) === 1)!;
    const p1 = battlePlan({ ...s0, at: first.id });
    expect(p1.enemyLevel).toBe(1);
    for (const u of Object.values(p1.units.enemies)) expect(u.modifiers?.attrAdd).toBeUndefined();
    const last = [...battles].sort((a, b) => nodeLevel('valdoria', b.id) - nodeLevel('valdoria', a.id))[0]!;
    const lv = nodeLevel('valdoria', last.id);
    expect(lv).toBeGreaterThan(1);
    const p = battlePlan({ ...s0, at: last.id });
    expect(p.enemyLevel).toBe(lv);
    p.enemies.forEach((cls, slot) => {
      if (!cls) return;
      expect(p.units.enemies[slot]?.modifiers?.attrAdd, `${cls}`).toEqual(enemyLevelAttrAdd(cls, lv));
    });
  });

  it('Endless: düşman level = dalga seviyesi (1. dalga ek yok; 10. dalga her düşman büyür, dalga çarpanları korunur)', () => {
    const run = newRun(3, ['warrior', 'archer', 'mage', 'druid'], 't');
    const w1 = wavePlan(run);
    expect(w1.enemyLevel).toBe(1);
    for (const u of Object.values(w1.units.enemies)) expect(u.modifiers?.attrAdd).toBeUndefined();
    for (const wave of [7, 10]) {
      const p = wavePlan({ ...run, wave });
      expect(p.enemyLevel).toBe(waveLevel(wave));
      p.enemies.forEach((cls, slot) => {
        if (!cls) return;
        const m = p.units.enemies[slot]?.modifiers;
        expect(m?.statMult, `${wave} ${cls}`).toBeGreaterThan(1);
        expect(m?.attrAdd, `${wave} ${cls}`).toEqual(enemyLevelAttrAdd(cls, waveLevel(wave)));
      });
    }
  });
});
