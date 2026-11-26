import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive, previewSkill, rageMissFrac } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, UnitSetup } from '../src/engine';
import { passiveDamageMult } from '../src/engine/ai-value';
import { compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take } from '../src/progression/skill-tree';
import { emptyEquipment, itemDef, makeItem, type Equipment } from '../src/progression/items';
import { loadoutSetup } from '../src/progression/loadout';
import { SETS, setPieces, setTip, type SetClassRow } from '../src/progression/sets';
import { Rng } from '../src/engine/rng';

// Ashguard Vigil 3 parça Warrior satırı (Ömer 2026-11-23): Rage 2 kat (0,4 -> 0,8) + Berserker bonusu can fullAt'e inince tam.
// Sayılar veriden; Defender / Paladin satırları değişmedi.

const ASH = SETS.find((s) => s.id === 'ashguard_vigil')!;
const ROWS = ASH.bonuses['3']!.byClass!;
const WR = ROWS.warrior! as SetClassRow;
const FULL_AT = WR.also!.find((x) => x.field === 'fullAt')!.to;
const RAGE = content.classes.warrior!.passive!.effect as { type: 'rage'; maxBonus: number; fullAt?: number; rageOnHurt: { perHpPercent: number } };
const MB = RAGE.maxBonus;
const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');

function wearing(ids: string[]): Equipment {
  const eq = emptyEquipment();
  ids.forEach((id, i) => {
    (eq as Record<string, unknown>)[itemDef(id)!.slot] = makeItem(id, `u${i}`, new Rng(i + 1));
  });
  return eq;
}
const ash3 = () => wearing(setPieces('ashguard_vigil').slice(0, 3).map((d) => d.id));
const setUnit = (): UnitSetup => loadoutSetup({ class: 'warrior', equipment: ash3() });

function arena(unit: UnitSetup, mode: BattleMode = 'test', party: Record<number, string> = { 3: 'warrior' }, units: Record<number, UnitSetup> = { 3: unit }): { b: Battle; hero: Combatant; enemy: Combatant } {
  const b = new Battle(content.battleSetup('random-battle', 4, mode, { party: cells(party), enemies: cells({ 0: 'defender' }), units: { party: units } }, false));
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0, surviveChance: 0, armor: 0, magicArmor: 0 });
  b.debugClearCooldowns();
  const hero = b.combatants.find((c) => c.side === 'party' && c.slot === 3)!;
  hero.maxHp = 1000;
  hero.hp = 1000;
  hero.shield = 0;
  hero.stats.str *= 200; // büyük hasar: önizleme ortalaması tam sayıya yuvarlanır, oran hassas çıksın
  return { b, hero, enemy: b.combatants.find((c) => c.side === 'enemy')! };
}
const strike = (b: Battle, hero: Combatant, enemy: Combatant): string =>
  hero.skills.find((s) => content.skills[s]!.target === 'single_enemy' && content.skills[s]!.effects.some((e) => e.type === 'damage') && b.validTargets(hero.uid, s).some((t) => t.uid === enemy.uid))!;
const avgAt = (d: { b: Battle; hero: Combatant; enemy: Combatant }, hp: number): number => {
  d.hero.hp = hp;
  return previewSkill(d.b, d.hero.uid, strike(d.b, d.hero, d.enemy), d.enemy.uid).find((p) => p.uid === d.enemy.uid)!.damage!.avg;
};

describe('Ashguard Warrior satırı: veri', () => {
  it('Rage satırı + ek alan fullAt (pasifte yok: 0)', () => {
    expect(WR).toMatchObject({ passive: 'berserker', field: 'rageOnHurt.perHpPercent' });
    expect(WR.from).toBeCloseTo(RAGE.rageOnHurt.perHpPercent, 6);
    expect(WR.to).toBeGreaterThan(WR.from);
    expect(RAGE.fullAt).toBeUndefined();
    expect(WR.also).toEqual([{ field: 'fullAt', from: 0, to: FULL_AT }]);
    expect(FULL_AT).toBeGreaterThan(0);
    expect(FULL_AT).toBeLessThan(1);
  });

  it('Defender ve Paladin satırları değişmedi (tek alan, ek alan yok)', () => {
    // yapı sabit, sayılar denge turunda değişebilir: tek alan, from = pasifin bugünkü değeri
    const pe = (c: string) => content.classes[c]!.passive!.effect as unknown as Record<string, number>;
    expect(ROWS.defender).toEqual({ passive: 'bulwark_aura', field: 'pct', from: pe('defender').pct, to: expect.any(Number) });
    expect(ROWS.paladin).toEqual({ passive: 'divine_light', field: 'power', from: pe('paladin').power, to: expect.any(Number) });
    expect(setUnit().passivePatch?.also).toEqual([{ field: 'fullAt', delta: FULL_AT }]);
    expect(loadoutSetup({ class: 'defender', equipment: ash3() }).passivePatch?.also).toBeUndefined();
    expect(loadoutSetup({ class: 'paladin', equipment: ash3() }).passivePatch?.also).toBeUndefined();
  });

  it('set metni iki etkiyi söyler (veriden)', () => {
    const rows = setTip(itemDef('ashguard_helm'), 'warrior', ash3())!.rows.map((r) => r.text);
    const k = Math.round((WR.to / WR.from) * 1000) / 1000;
    const line = `(3) Warrior, Berserker: Rage from losing HP is ${k === 2 ? 'doubled' : k === 3 ? 'tripled' : `x${k}`}, and the damage bonus reaches its maximum at ${Math.round(FULL_AT * 1000) / 10}% HP`;
    expect(rows).toContain(line);
    expect(line).not.toMatch(/—/);
  });
});

describe('rageMissFrac: tek formül', () => {
  it('fullAt yokken eski oran birebir (1 - can / maksCan)', () => {
    for (const hp of [0, 1, 137, 250, 625, 999, 1000]) expect(rageMissFrac({}, hp, 1000)).toBe(1 - hp / 1000);
    expect(rageMissFrac({ fullAt: 0 }, 400, 1000)).toBe(1 - 400 / 1000);
    expect(rageMissFrac({}, 0, 0)).toBe(0);
  });

  it(`fullAt ${FULL_AT}: can fullAt ve altında tam, araları doğrusal`, () => {
    const pe = { fullAt: FULL_AT };
    expect(rageMissFrac(pe, 1000, 1000)).toBe(0);
    expect(rageMissFrac(pe, FULL_AT * 1000, 1000)).toBeCloseTo(1, 9);
    expect(rageMissFrac(pe, 100, 1000)).toBe(1);
    // yarı yol: can = fullAt + (1 - fullAt) / 2 (fullAt 0,25 -> %62,5)
    expect(rageMissFrac(pe, (FULL_AT + (1 - FULL_AT) / 2) * 1000, 1000)).toBeCloseTo(0.5, 9);
  });
});

describe('Ashguard Warrior satırı: motor, önizleme, YZ, açıklama', () => {
  const half = (FULL_AT + (1 - FULL_AT) / 2) * 1000;

  it('setli Warrior pasifi: Rage kazanımı to, fullAt veriden; setsiz Warrior aynı', () => {
    const worn = arena(setUnit()).hero.passive!.effect as typeof RAGE;
    expect(worn.rageOnHurt.perHpPercent).toBeCloseTo(WR.to, 6);
    expect(worn.fullAt).toBeCloseTo(FULL_AT, 6);
    const bare = arena({}).hero.passive!.effect as typeof RAGE;
    expect(bare.rageOnHurt.perHpPercent).toBeCloseTo(WR.from, 6);
    expect(bare.fullAt).toBeUndefined();
  });

  it('can kaybı Rage verir: maks canın %1i başına to', () => {
    const { b, hero, enemy } = arena(setUnit());
    const r = (b as unknown as { hurtRageGain: (a: unknown, t: unknown, l: number) => number }).hurtRageGain(enemy, hero, 50);
    expect(r).toBe(Math.round(Math.min((RAGE.rageOnHurt as { perHitCap?: number }).perHitCap ?? Infinity, 5 * WR.to)));
  });

  it('önizleme: fullAt ve altında tam bonus, yarı yolda yarısı; setsiz eski doğrusal', () => {
    const worn = arena(setUnit());
    const full = avgAt(worn, 1000);
    expect(avgAt(worn, FULL_AT * 1000) / full).toBeCloseTo(1 + MB, 3);
    expect(avgAt(worn, 100) / full).toBeCloseTo(1 + MB, 3);
    expect(avgAt(worn, half) / full).toBeCloseTo(1 + MB * 0.5, 3);
    const bare = arena({});
    const f0 = avgAt(bare, 1000);
    expect(avgAt(bare, FULL_AT * 1000) / f0).toBeCloseTo(1 + MB * (1 - FULL_AT), 3);
    expect(avgAt(bare, half) / f0).toBeCloseTo(1 + MB * (1 - half / 1000), 3);
  });

  for (const mode of ['test', 'turns'] as const) {
    it(`gerçek vuruş önizleme aralığında (can %20, ${mode})`, () => {
      const d = arena(setUnit(), mode);
      for (let i = 0; i < 40 && mode === 'turns' && d.b.currentUid !== d.hero.uid; i++) d.b.skipTurn();
      d.b.debugClearCooldowns(d.hero.uid);
      d.hero.hp = 200;
      d.enemy.maxHp = d.enemy.hp = 100000;
      const sk = strike(d.b, d.hero, d.enemy);
      const pv = previewSkill(d.b, d.hero.uid, sk, d.enemy.uid).find((p) => p.uid === d.enemy.uid)!.damage!;
      const r = d.b.useSkill(d.hero.uid, sk, d.enemy.uid);
      if (!r.ok) throw new Error(r.reason);
      const hits = r.events.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.target === d.enemy.uid);
      const total = hits.reduce((s, e) => s + e.amount + (e.absorbed ?? 0), 0);
      expect(total).toBeGreaterThanOrEqual(pv.min);
      expect(total).toBeLessThanOrEqual(pv.max);
    });
  }

  it('YZ hasar çarpanı aynı formül (passiveDamageMult)', () => {
    const worn = arena(setUnit());
    worn.hero.hp = half;
    expect(passiveDamageMult(worn.b, worn.hero, {})).toBeCloseTo(1 + MB * 0.5, 9);
    worn.hero.hp = 100;
    expect(passiveDamageMult(worn.b, worn.hero, {})).toBeCloseTo(1 + MB, 9);
    const bare = arena({});
    bare.hero.hp = half;
    expect(passiveDamageMult(bare.b, bare.hero, {})).toBe(1 + MB * (1 - half / 1000));
  });

  it('açıklama: setli "at 25% HP or lower", setsiz "at the brink of death"', () => {
    const st = content.classes.warrior!.stats;
    const worn = describePassive(arena(setUnit()).hero.passive!, st, content.formulas);
    expect(worn).toContain(`at ${Math.round(FULL_AT * 1000) / 10}% HP or lower`);
    expect(worn).not.toContain('brink of death');
    expect(describePassive(content.classes.warrior!.passive!, st, content.formulas)).toContain('at the brink of death');
  });

  it('ağaç Shared Scars (maxBonus eki) set eğrisiyle: doymuş bölgede oran (1 + mb + ek) / (1 + mb), yarı yolda aynı ek', () => {
    const W = treeOf('warrior')!;
    let a = emptyAlloc(W);
    // Shared Scars önkoşulu Grit (o da Thick Hide); ikisi hasar vermez (alınan hasar / şifa)
    for (const key of ['0.f1', '0.f2', '0.f3'])
      for (let i = 0; i < 5; i++) {
        const r = take(W, 30, a, key);
        if (!r.ok) break;
        a = r.alloc;
      }
    expect(a.r['0.f3']).toBeGreaterThan(0);
    const tree = compileTree(W, a)!;
    const party = { 3: 'warrior', 4: 'warrior' };
    const mkd = (u: UnitSetup) => {
      const d = arena(u, 'test', party, { 3: u });
      const ally = d.b.combatants.find((c) => c.side === 'party' && c.slot === 4)!;
      ally.hp = Math.max(1, Math.floor(ally.maxHp * 0.2)); // dost %50 altında: Shared Scars açık
      return d;
    };
    const plain = mkd(setUnit());
    const treed = mkd({ ...setUnit(), tree });
    const r1 = avgAt(treed, 200) / avgAt(plain, 200);
    expect(r1).toBeGreaterThan(1);
    expect(avgAt(treed, 100) / avgAt(plain, 100)).toBeCloseTo(r1, 3);
    const ek = r1 * (1 + MB) - (1 + MB);
    expect(avgAt(treed, half) / avgAt(plain, half)).toBeCloseTo((1 + (MB + ek) * 0.5) / (1 + MB * 0.5), 3);
  });
});
