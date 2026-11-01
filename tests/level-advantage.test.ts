import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, explainChoice, hitChance, previewForTargets, type Teams, type UnitSetup } from '../src/engine';
import { battlePlan, debugTeleport, newCampaign } from '../src/campaign';
import { battleFor, newRun, wavePlan } from '../src/endless';
import { buildMechanics } from '../src/wiki/catalog';

// Level farkı saldırı bonusu (Ömer 2026-11-01): fark başına +%2 isabet, +%1 kritik; yalnız yüksek level'lı saldıran, düşük level'lı düşmana vururken.
// (Düğüm tehlike göstergesi ayrı: tests/level-gap.test.ts.)

const G = content.formulas.hit.levelGap;
const SKILL = 'melee_attack';
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (partyUnit: UnitSetup, enemyUnit: UnitSetup, mode: 'turns' | 'test' = 'test', seed = 1): Battle => {
  const teams: Teams = { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: partyUnit }, enemies: { 0: enemyUnit } } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const unitsOf = (b: Battle) => ({ hero: b.get('party-0')!, foe: b.get('enemy-0')! });
/** Hedef önizlemesindeki hasar satırı (arayüzün gösterdiği isabet / kritik buradan). */
const previewOf = (b: Battle, uid: string, target: string) => {
  const d = previewForTargets(b, b.get(uid)!, SKILL, [b.get(target)!]).find((p) => p.uid === target)?.damage;
  if (!d) throw new Error('önizleme yok');
  return d;
};
/** Savaşı YZ ile oynatır (golden harness ile aynı döngü); olay akışı karşılaştırma için. */
const playOut = (b: Battle): unknown[] => {
  const log: unknown[] = [];
  while (!b.winner && b.turnsTaken < 120) {
    const u = b.currentUid;
    if (!u) break;
    const r = b.applyChoice(u, chooseAction(b, u, content.aiConfig));
    if (!r.ok) break;
    log.push(r.events);
  }
  return log;
};

describe('Level farkı saldırı bonusu: motor', () => {
  it('sayılar veride: fark başına %2 isabet, %1 kritik', () => {
    expect(G).toEqual({ accuracyPerLevel: 0.02, critPerLevel: 0.01 });
  });

  it('yüksek level düşüğe vurur: fark başına yüzde puanı', () => {
    const b = make({ level: 5 }, { level: 2 });
    const { hero, foe } = unitsOf(b);
    expect(b.levelGap(hero, foe).accuracy).toBeCloseTo(0.06, 9);
    expect(b.levelGap(hero, foe).crit).toBeCloseTo(0.03, 9);
    expect(b.hitStats(hero, null, foe).accuracy).toBeCloseTo(hero.stats.accuracy + 0.06, 6);
  });

  it('düşük level yükseğe vurur: bonus yok, ceza yok', () => {
    const b = make({ level: 2 }, { level: 5 });
    const { hero, foe } = unitsOf(b);
    expect(b.levelGap(hero, foe)).toEqual({ accuracy: 0, crit: 0 });
    expect(b.hitStats(hero, null, foe)).toBe(b.effectiveStats(hero));
    expect(previewOf(b, hero.uid, foe.uid).critChance).toBeCloseTo(hero.stats.critChance, 6);
  });

  it('eşit level: bonus yok', () => {
    const b = make({ level: 4 }, { level: 4 });
    const { hero, foe } = unitsOf(b);
    expect(b.levelGap(hero, foe)).toEqual({ accuracy: 0, crit: 0 });
  });

  it("level'sız birim (Quick Battle): iki yönde de bonus yok", () => {
    const b = make({ level: 9 }, {});
    const { hero, foe } = unitsOf(b);
    expect(b.levelGap(hero, foe)).toEqual({ accuracy: 0, crit: 0 });
    expect(b.levelGap(foe, hero)).toEqual({ accuracy: 0, crit: 0 });
    const none = make({}, {});
    expect(none.levelGap(unitsOf(none).hero, unitsOf(none).foe)).toEqual({ accuracy: 0, crit: 0 });
  });

  it('iki yön: kahraman -> mob ve mob -> kahraman aynı kural', () => {
    const up = make({ level: 7 }, { level: 3 });
    expect(up.levelGap(unitsOf(up).hero, unitsOf(up).foe).accuracy).toBeCloseTo(0.08, 9);
    expect(up.levelGap(unitsOf(up).foe, unitsOf(up).hero).accuracy).toBe(0);
    const down = make({ level: 3 }, { level: 7 });
    expect(down.levelGap(unitsOf(down).foe, unitsOf(down).hero).accuracy).toBeCloseTo(0.08, 9);
    expect(down.levelGap(unitsOf(down).foe, unitsOf(down).hero).crit).toBeCloseTo(0.04, 9);
    expect(down.levelGap(unitsOf(down).hero, unitsOf(down).foe).crit).toBe(0);
  });

  it('dost hedefte bonus yok', () => {
    const teams: Teams = { party: cells({ 0: 'warrior', 1: 'mage' }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: { level: 9 }, 1: { level: 1 } } } };
    const b = new Battle(content.battleSetup('random-battle', 1, 'test', teams, false));
    expect(b.levelGap(b.get('party-0')!, b.get('party-1')!)).toEqual({ accuracy: 0, crit: 0 });
  });

  it('gerçek vuruş bonusu kullanır: kritik ve isabet sayısı level farkıyla artar', () => {
    // Fark 40: isabet +%80, kritik +%40. Aynı tohumlarda sayılar kıyaslanır
    const tally = (lv: number) => {
      let fails = 0;
      let crits = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const b = make({ level: lv }, { level: 10 }, 'test', seed);
        const r = b.useSkill('party-0', SKILL, 'enemy-0');
        if (!r.ok) throw new Error(r.reason);
        for (const e of r.events) {
          if ((e.type === 'miss' || e.type === 'dodge') && e.source === 'party-0') fails++;
          if (e.type === 'damage' && e.origin === 'skill' && e.source === 'party-0' && e.crit) crits++;
        }
      }
      return { fails, crits };
    };
    const high = tally(50);
    const even = tally(10);
    expect(high.fails).toBe(0); // isabet %100'e çıktı: hiç iska yok
    expect(even.fails).toBeGreaterThan(0);
    expect(high.crits).toBeGreaterThan(even.crits);
  });

  it('iki modda da çalışır (turns ve test)', () => {
    for (const mode of ['turns', 'test'] as const) {
      const b = make({ level: 6 }, { level: 1 }, mode);
      const { hero, foe } = unitsOf(b);
      expect(b.levelGap(hero, foe).accuracy).toBeCloseTo(0.1, 9);
      expect(previewOf(b, hero.uid, foe.uid).critChance).toBeCloseTo(hero.stats.critChance + 0.05, 6);
    }
  });

  it("aynı seed aynı sonuç; level eşit ya da yoksa savaş birebir aynı", () => {
    const a = playOut(make({ level: 8 }, { level: 2 }, 'turns', 7));
    expect(a.length).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(playOut(make({ level: 8 }, { level: 2 }, 'turns', 7))));
    expect(JSON.stringify(playOut(make({ level: 4 }, { level: 4 }, 'turns', 7)))).toBe(JSON.stringify(playOut(make({}, {}, 'turns', 7))));
  });
});

describe('Level farkı saldırı bonusu: önizleme ve YZ', () => {
  it('hedef önizlemesi isabet ve kritiğe bonusu katar, gerçek hesapla aynı', () => {
    const b = make({ level: 6 }, { level: 1 });
    const { hero, foe } = unitsOf(b);
    const d = previewOf(b, hero.uid, foe.uid);
    const flat = make({}, {});
    const f = previewOf(flat, 'party-0', 'enemy-0');
    expect(d.critChance).toBeCloseTo(f.critChance + 0.05, 6);
    expect(d.hitChance).toBeCloseTo(Math.min(content.formulas.hit.max, f.hitChance + 0.1), 6);
    expect(d.hitChance).toBeCloseTo(hitChance(b.hitStats(hero, null, foe), b.effectiveStats(foe), content.formulas), 6);
  });

  it('YZ beklenen hasarı bonusla görür: tek fark level iken düşük level hedefi seçer', () => {
    const build = (units: Record<number, UnitSetup>): Battle => {
      const teams: Teams = { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'warrior', 1: 'warrior' }), units: { party: { 0: { level: 30 } }, enemies: units } };
      return new Battle(content.battleSetup('random-battle', 3, 'test', teams, false));
    };
    const pick = (b: Battle) => chooseAction(b, 'party-0', content.aiConfig)?.targetUid;
    expect(pick(build({ 0: { level: 1 }, 1: { level: 30 } }))).toBe('enemy-0');
    expect(pick(build({ 0: { level: 30 }, 1: { level: 1 } }))).toBe('enemy-1');
  });

  it('YZ: Blinded değeri bonuslu isabetle ölçülür; level farkı önlenen kaybı şişirmez', () => {
    // Blinded isabeti sabit puan düşürür: tavana değmeyen farkta önlenen hasar, eşit level'la aynıdır
    const mitigationOf = (foeLevel: number) => {
      const teams: Teams = { party: cells({ 0: 'cutthroat' }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: { level: 6 } }, enemies: { 0: { level: foeLevel } } } };
      const b = new Battle(content.battleSetup('random-battle', 1, 'test', teams, false));
      const c = explainChoice(b, 'party-0', content.aiConfig)!.candidates.filter((x) => x.skill === 'smoke_bomb' && (x.mitigation ?? 0) > 0);
      expect(c.length).toBeGreaterThan(0);
      return Math.max(...c.map((x) => x.mitigation!));
    };
    // Düşman yukarıda (+%10 isabet) ile eşit level: önlenen kayıp aynı olmalı (ters yöndeki düşman da eşitliği bozmaz)
    expect(mitigationOf(11)).toBeCloseTo(mitigationOf(6), 1);
  });
});

describe('Level farkı saldırı bonusu: Codex', () => {
  it('Mechanics metni kuralı veriden sayılarla yazar', () => {
    const text = JSON.stringify(buildMechanics().find((a) => a.id === 'hit-chance'));
    expect(text).toContain('Level advantage');
    expect(text).toContain('+2% accuracy');
    expect(text).toContain('+1% crit chance');
  });
});

describe('Level farkı saldırı bonusu: level kaynağı', () => {
  it('sefer: kahraman (L1 dahil) ve düşman savaşa level ile girer', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4 }), '3');
    const plan = battlePlan(s);
    const party = Object.values(plan.units.party);
    expect(party.length).toBeGreaterThan(0);
    for (const u of party) expect(u.level).toBeGreaterThanOrEqual(1);
    const foes = Object.values(plan.units.enemies);
    expect(foes.length).toBeGreaterThan(0);
    for (const u of foes) expect(u.level).toBe(plan.enemyLevel);
  });

  it('Endless: kahraman ve düşman savaşa level ile girer', () => {
    const plan = wavePlan(newRun(7, ['warrior', 'mage', 'archer', 'druid'], '2026-10-09T00:00:00.000Z'));
    for (const u of Object.values(plan.units.party)) expect(u.level).toBeGreaterThanOrEqual(1);
    for (const u of Object.values(plan.units.enemies)) expect(u.level).toBe(plan.enemyLevel);
    const b = battleFor(plan);
    for (const c of b.combatants) expect(c.level).toBeGreaterThanOrEqual(1);
  });

  it("Quick Battle kurulumu: kimsenin level'ı yok", () => {
    const b = new Battle(content.battleSetup('random-battle', 5, 'turns'));
    for (const c of b.combatants) expect(c.level).toBeUndefined();
  });
});
