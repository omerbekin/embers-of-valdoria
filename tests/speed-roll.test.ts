import { describe, expect, it } from 'vitest';
import { Battle, content, describeStat, rolledSpeed, speedRoll, type Teams } from '../src/engine';
import { newCampaign, pickHero } from '../src/campaign/state';
import { normalizeState } from '../src/campaign/save';
import { newRun } from '../src/endless/run';
import { parseRun } from '../src/endless/save';
import { heroSpeedRoll, loadout, loadoutSetup } from '../src/progression/loadout';
import { heroStats } from '../src/progression/item-text';

// Kişisel hız zarı (Ömer 2026-10-24, "Natural pace"): her birimin SON hızı ±spdVariance zarıyla; kahramanda kalıcı, düşmanda hash(seed, uid).

const f = content.formulas;
const V = f.attributes.spdVariance!;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const make = (seed: number, teams: Teams) => new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));

describe('kişisel hız zarı', () => {
  it('veri: spdVariance 0,1; zar aralıkta, deterministik ve çeşitli', () => {
    expect(V).toBe(0.1);
    const rolls = Array.from({ length: 200 }, (_, i) => speedRoll(7, `enemy-${i}`, f));
    for (const r of rolls) expect(r).toBeGreaterThanOrEqual(1 - V), expect(r).toBeLessThanOrEqual(1 + V);
    expect(speedRoll(7, 'enemy-3', f)).toBe(rolls[3]);
    expect(new Set(rolls).size).toBeGreaterThan(150);
    expect(rolls.some((r) => r < 0.95) && rolls.some((r) => r > 1.05)).toBe(true);
    // zarsız formül (spdVariance yok / 0) = 1, hız aynen
    expect(speedRoll(7, 'x', { attributes: { ...f.attributes, spdVariance: 0 } })).toBe(1);
    expect(rolledSpeed(17, 1, f)).toBe(17);
    expect(rolledSpeed(17, 1.06, f)).toBe(18);
    expect(rolledSpeed(1, 0.9, f)).toBe(1); // alt sınır speedMin
  });

  it('savaş: her birim zarlı tam sayı hız; aynı seed = aynı hızlar; ana Rng akışı tüketilmez', () => {
    const teams: Teams = { party: cells({ 0: 'warrior', 1: 'mage' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 2: 'warrior' }) };
    const a = make(5, teams);
    const b = make(5, teams);
    for (const c of a.combatants) {
      const roll = speedRoll(5, c.uid, f);
      expect(c.stats.spdRoll).toBe(roll);
      expect(c.stats.spd).toBe(rolledSpeed(content.classes[c.defId]!.stats.spd, roll, f));
      expect(Number.isInteger(c.stats.spd)).toBe(true);
    }
    expect(a.combatants.map((c) => c.stats.spd)).toEqual(b.combatants.map((c) => c.stats.spd));
    // aynı sınıf, farklı uid: hızlar farklılaşabilir (seed'ler arasında en az bir fark)
    const spreads = [1, 2, 3, 4, 5, 6].map((s) => new Set(make(s, teams).combatants.filter((c) => c.side === 'enemy').map((c) => c.stats.spd)).size);
    expect(Math.max(...spreads)).toBeGreaterThan(1);
    // ana Rng: zarsız kurulumla aynı sıradaki ilk sayı
    const flat = content.battleSetup('random-battle', 5, 'turns', teams, false);
    const c = new Battle({ ...flat, formulas: { ...flat.formulas, attributes: { ...flat.formulas.attributes, spdVariance: 0 } } });
    const rngOf = (x: Battle) => (x as unknown as { rng: { next(): number } }).rng.next();
    expect(rngOf(a)).toBe(rngOf(c));
  });

  it('kahraman zarı kalıcı: sefer + Endless yaratılırken yazılır, eski kayıtta aynı değerle tamamlanır', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 42, difficulty: 'medium' }), 'warrior');
    expect(s.roster.length).toBeGreaterThan(0);
    for (const h of s.roster) expect(h.spdRoll).toBe(heroSpeedRoll(42, h.id));
    const old = JSON.parse(JSON.stringify(s)) as typeof s;
    for (const h of old.roster) delete h.spdRoll;
    const back = normalizeState(old)!;
    expect(back.roster.map((h) => h.spdRoll)).toEqual(s.roster.map((h) => h.spdRoll));
    // Endless
    const run = newRun(9, ['warrior', 'mage']);
    for (const h of run.heroes) expect(h.spdRoll).toBe(heroSpeedRoll(9, h.id));
    const raw = JSON.parse(JSON.stringify(run)) as typeof run;
    for (const h of raw.heroes) delete h.spdRoll;
    const parsed = parseRun(JSON.stringify({ version: 6, run: raw }))!;
    expect(parsed.heroes.map((h) => h.spdRoll)).toEqual(run.heroes.map((h) => h.spdRoll));
  });

  it('kahraman sayfası = savaş: aynı zarlı hız; ipucunda Natural pace', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 42, difficulty: 'medium' }), 'warrior');
    const h = s.roster[0]!;
    expect(loadout(h).modifiers?.spdRoll).toBe(h.spdRoll);
    const sheet = heroStats(h)!;
    expect(sheet.spdRoll).toBe(h.spdRoll);
    const teams: Teams = { party: cells({ 0: h.class }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: loadoutSetup(h) } } };
    for (const seed of [1, 2, 3]) expect(make(seed, teams).get('party-0')!.stats.spd).toBe(sheet.spd);
    const tip = describeStat('spd', { ...sheet, spdRoll: 1.0634 }, f);
    expect(tip.title).toBe(`Speed ${sheet.spd}`);
    expect(tip.lines).toContain('Natural pace: +6%');
    expect(describeStat('spd', { ...sheet, spdRoll: 0.96 }, f).lines).toContain('Natural pace: -4%');
    expect(describeStat('spd', { ...sheet, spdRoll: 1.002 }, f).lines).toContain('Natural pace: ±0%');
    expect(describeStat('spd', { ...sheet, spdRoll: undefined }, f).lines.some((l) => l.startsWith('Natural pace'))).toBe(false);
  });
});
