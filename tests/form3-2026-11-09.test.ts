/**
 * Ömer onaylı 2026-11-09 (form 3) kararları:
 * 1) Slow artık CC değil (Chilled gibi): boss %25, elit %50 güçte işler (ccImmunity.debuffStrength).
 * 2) Blinded / Jinxed / Shaken: boss bağışıklığı kalktı (ccImmunity.accuracyCrit false); ayrıntı tests/boss-acc-crit-immunity.test.ts.
 * 3) Cutthroat Opportunist Chilled, Soaked, Shocked'ta da tetiklenir (YZ: Shocked veren şimşek skill'i kurulum değeri alır).
 * 4) Nature's Wrath adı Tidal Wrath (id aynı, hasar doğa).
 * 5) Buhar bulutu yok (zemin verisinde steam / bulut yok).
 * 6) Kingsfall Regalia stat bonusu Ashguard düzeyine indi; Royal Command aynı.
 * Sayılar veriden okunur.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive, explainChoice, previewSkill } from '../src/engine';
import type { PassiveEffect, Status } from '../src/engine';
import { SETS, modIP, setPieces } from '../src/progression/sets';
import { ITEMS, affixBoost, instanceIP, itemIP, makeItem, validateItems } from '../src/progression/items';
import { Rng } from '../src/engine/rng';
import grounds from '../data/grounds.json';
import druidTree from '../data/skill-trees/druid.json';
import tutorial from '../data/tutorial.json';

const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');
const STR = content.formulas.ccImmunity!.debuffStrength!;
type Priv = { addStatus(t: unknown, s: Status, emit: unknown, cause?: string): void; debugEmit: unknown };

function mk(party: Record<number, string>, enemies: Record<number, string>, tiers: Record<number, { tier: 'boss' | 'elite' }> = {}) {
  const b = new Battle(content.battleSetup('random-battle', 1, 'test', { party: cells(party), enemies: cells(enemies), units: { enemies: tiers } }, false));
  b.freeMp = true;
  b.debugClearCooldowns();
  for (const c of b.combatants) Object.assign(c.stats, { resilience: 0 });
  return b;
}
const give = (b: Battle, uid: string, kind: string, by: string) =>
  (b as unknown as Priv).addStatus(b.get(uid)!, { kind: kind as Status['kind'], turns: 3, source: by }, (b as unknown as Priv).debugEmit);

describe('form 3: Slow CC değil', () => {
  it('veri: Slow cc değil; boss ve elit Slow yer, hız büyüklüğü debuffStrength kadar; YZ gücü aynı', () => {
    expect(content.statuses.slow!.cc).toBeFalsy();
    const b = mk({ 0: 'warrior' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, { 0: { tier: 'boss' }, 1: { tier: 'elite' } });
    const m = content.statuses.slow!.speedMult!;
    for (const uid of ['enemy-0', 'enemy-1', 'enemy-2']) give(b, uid, 'slow', 'party-0');
    expect(b.statusBlocked(b.get('enemy-0')!, 'slow')).toBe(false);
    expect(b.statusMult(b.get('enemy-0')!, 'speedMult')).toBeCloseTo(1 + (m - 1) * STR.boss!, 6);
    expect(b.statusMult(b.get('enemy-1')!, 'speedMult')).toBeCloseTo(1 + (m - 1) * STR.elite!, 6);
    expect(b.statusMult(b.get('enemy-2')!, 'speedMult')).toBeCloseTo(m, 6);
    expect(b.debuffStrength(b.get('enemy-0')!, 'slow', 'party')).toBe(STR.boss);
    // Stun hâlâ CC: boss yemez
    give(b, 'enemy-0', 'stun', 'party-0');
    expect(b.get('enemy-0')!.statuses.some((s) => s.kind === 'stun')).toBe(false);
  });
});

describe('form 3: Opportunist Chilled / Soaked / Shocked', () => {
  const pe = content.classes.cutthroat!.passive!.effect as Extract<PassiveEffect, { type: 'bonusVsStatus' }>;

  it('veri ve açıklama: yeni üç durum listede, metin veriden', () => {
    for (const k of ['chilled', 'soaked', 'shocked']) expect(pe.statuses).toContain(k);
    const txt = describePassive(content.classes.cutthroat!.passive!, content.classes.cutthroat!.stats, content.formulas);
    for (const k of ['chilled', 'soaked', 'shocked']) expect(txt).toContain(content.statuses[k]!.name);
    for (const k of ['Chilled', 'Soaked', 'Shocked']) expect(content.classes.cutthroat!.passive!.text).toContain(k);
  });

  it('motor (önizleme, gerçek vuruşla aynı yol): Chilled, Soaked ya da Shocked hedefe hasar x(1 + bonus)', () => {
    for (const k of ['chilled', 'soaked', 'shocked']) {
      const b = mk({ 0: 'cutthroat' }, { 0: 'defender' });
      b.get('party-0')!.stats.dex = 200; // büyük sayılar: yuvarlama payı küçük
      const base = previewSkill(b, 'party-0', 'venom_edge', 'enemy-0')[0]!.damage!.avg;
      give(b, 'enemy-0', k, 'party-0');
      expect(b.get('enemy-0')!.statuses.some((s) => s.kind === k), k).toBe(true);
      const boosted = previewSkill(b, 'party-0', 'venom_edge', 'enemy-0')[0]!.damage!.avg;
      expect(Math.abs(boosted - base * (1 + pe.bonus)), k).toBeLessThanOrEqual(1);
    }
  });

  it('YZ: Shocked veren şimşek skill\'i dost Cutthroat varken daha çok kurulum değeri alır', () => {
    const setupOf = (withShock: boolean) => {
      const b = mk({ 0: 'skald', 1: 'cutthroat' }, { 1: 'warrior' });
      const ct = b.get('party-1')!;
      if (!withShock) ct.passive = { ...ct.passive!, effect: { ...pe, statuses: pe.statuses.filter((s) => s !== content.formulas.thunder.badge) } };
      const c = explainChoice(b, 'party-0', content.aiConfig)!.candidates.find((x) => x.skill === 'thunder_strike')!;
      expect(content.skills.thunder_strike!.thunder?.shocks).toBe(true);
      return (c.terms as Record<string, number>).setup ?? 0;
    };
    expect(setupOf(true)).toBeGreaterThan(setupOf(false));
  });
});

describe('form 3: Tidal Wrath adı, buhar yok', () => {
  it('Nature\'s Wrath adı Tidal Wrath; id ve doğa hasarı aynı; oyun metinlerinde eski ad yok', () => {
    const s = content.skills.natures_wrath!;
    expect(s.name).toBe('Tidal Wrath');
    expect(s.effects.find((e) => e.type === 'damage')).toMatchObject({ element: 'nature' });
    const blob = JSON.stringify([druidTree, tutorial, Object.values(content.skills).map((x) => x.name)]);
    expect(blob).not.toContain("Nature's Wrath");
  });

  it('buhar bulutu yok: zemin verisinde steam / cloud yok', () => {
    expect(JSON.stringify(Object.keys(grounds)).toLowerCase()).not.toMatch(/steam|cloud/);
  });
});

describe('form 3: Kingsfall Regalia Ashguard düzeyinde', () => {
  const ip = (mods: Record<string, number> | undefined) => Object.entries(mods ?? {}).reduce((a, [k, v]) => a + modIP(k, v), 0);
  const king = SETS.find((s) => s.id === 'kingsfall_regalia')!;
  const ash = SETS.find((s) => s.id === 'ashguard_vigil')!;
  it('stat bonusu IP\'si Ashguard\'ın stat + sınıf satırı değerine yakın (en çok 1 IP fark); Royal Command aynı', () => {
    const kIP = Object.values(king.bonuses).reduce((a, b) => a + ip(b.mods), 0);
    const aIP = Object.values(ash.bonuses).reduce((a, b) => a + ip(b.mods), 0) + (ITEMS.setValue?.classRowIP ?? 0);
    expect(Math.abs(kIP - aIP)).toBeLessThanOrEqual(1);
    expect(king.bonuses['3']!.rule).toBe('royal_command');
    // kendi tadı: HP + büyü zırhı, bedeli yavaşlık
    expect(king.bonuses['3']!.mods!.hpAdd).toBeGreaterThan(0);
    expect(king.bonuses['3']!.mods!.magicArmorAdd).toBeGreaterThan(0);
    expect(king.bonuses['3']!.mods!.spdAdd).toBeLessThan(0);
  });
});

describe('zayıf setler sıradan Epic düzeyinde (Ömer onaylı 2026-11-09)', () => {
  it('Conclave, Gallows, Wayfarer parçalarının ortalama IP\'si aynı yuva + seviyedeki sıradan Epic ortalamasına %5 içinde; boost geçerli', () => {
    expect(validateItems()).toEqual([]);
    for (const sid of ['conclave_of_embers', 'gallows_pact', 'wayfarers_oath']) {
      for (const p of setPieces(sid)) {
        expect(p.boost, p.id).toBeDefined();
        expect(affixBoost(p, p.affixes![0]!)).toBe(p.boost![p.affixes![0]!]);
        let sum = 0;
        for (let i = 0; i < 200; i++) sum += instanceIP(makeItem(p.id, `x${i}`, new Rng(i + 1)));
        const pool = ITEMS.items.filter((d) => d.slot === p.slot && d.rarity !== 'legendary' && !d.set);
        const g = pool.reduce((a, d) => a + itemIP(d, 'epic', p.ilvl), 0) / pool.length;
        expect(Math.abs(sum / 200 / g - 1), p.id).toBeLessThan(0.05);
      }
    }
  });
});
