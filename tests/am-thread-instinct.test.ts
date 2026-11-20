import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive, explainChoice, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type Teams } from '../src/engine';

// Redtithe pasifi Blood Tithe (id spellbreaker_instinct; eski Spellbreaker's Instinct, open-questions 456; Ömer 2026-11-17): MP'li düşman skill'i
// Redtithe'in takımına -> Redtithe'in sıra sayacı eşik x (bloodAdvance x kan / maks kan) öne. Ley Thread kitten çıktı (testleri silindi). Sayılar veriden.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: {}, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const INSTINCT = content.classes.antimage!.passive!.effect as Extract<NonNullable<NonNullable<(typeof content.classes)[string]>['passive']>['effect'], { type: 'spellbreakerInstinct' }>;

describe("Blood Tithe (Spellbreaker's Instinct kuralı)", () => {
  const T = content.formulas.turn.threshold;
  /** Öne alma = eşik x (advance + bloodAdvance x kan / maks kan); başlangıç kanıyla (formulas.bloodBar.start) motorun instinctAdvance'ı. */
  const shiftOf = (b: Battle, am: Combatant) => Math.round(T * b.instinctAdvance(am) * 1000) / 1000;
  /** Düşman Mage'in sırası (sayacı çok yüksek: sonraki tur da onun, ilerleme tiki 0) -> AM'in sayaç farkı yalnızca pasiften. */
  const setup = (party: Record<number, string> = { 0: 'antimage', 1: 'warrior' }, enemy = 'mage') => {
    const b = make(party, { 0: enemy }, 11, 'turns');
    const foe = E(b);
    foe.turnCounter = T * 20;
    b.currentUid = foe.uid;
    foe.mp = foe.maxMp;
    return { b, foe, am: P(b) };
  };
  const cast = (b: Battle, foe: Combatant, skill: string, target?: string, slot?: number): BattleEvent[] => {
    const from = b.log.length;
    b.currentUid = foe.uid;
    foe.cooldowns[skill] = 0;
    foe.mp = foe.maxMp;
    const r = b.useSkill(foe.uid, skill, target, slot);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return b.log.slice(from);
  };

  it('veri: Redtithe pasifi Blood Tithe (id spellbreaker_instinct; advance 0, bloodAdvance veriden), metinde bar ölçeği yazılır', () => {
    const pas = content.classes.antimage!.passive!;
    expect(pas.id).toBe('spellbreaker_instinct');
    expect(INSTINCT.type).toBe('spellbreakerInstinct');
    expect(INSTINCT.advance).toBe(0);
    expect(INSTINCT.bloodAdvance).toBeGreaterThan(0);
    expect(describePassive(pas, P(make({ 0: 'antimage' }, { 0: 'mage' })).stats, content.formulas)).toContain(`${Math.round(INSTINCT.bloodAdvance! * 100)}%`);
  });

  it("MP'li düşman skill'i AM'in dostuna: AM'in sayacı eşik x advance öne, pasif olayı", () => {
    const { b, foe, am } = setup();
    const before = am.turnCounter;
    const shift = shiftOf(b, am);
    expect(shift).toBeGreaterThan(0);
    const evs = cast(b, foe, 'fire_bolt', P(b, 1).uid);
    expect(skillCostAmount(content.skills.fire_bolt!.cost, foe)).toBeGreaterThan(0);
    expect(am.turnCounter - before).toBeCloseTo(shift, 6);
    expect(evs.some((e) => e.type === 'passive' && e.actor === am.uid && e.passive === 'spellbreaker_instinct')).toBe(true);
  });

  it('AM\'in kendisine atılan MP\'li skill de sayar', () => {
    const { b, foe, am } = setup();
    const before = am.turnCounter;
    const shift = shiftOf(b, am);
    cast(b, foe, 'fire_bolt', am.uid);
    expect(am.turnCounter - before).toBeCloseTo(shift, 6);
  });

  it('bedava skill (MP bedeli 0) tetiklemez', () => {
    const { b, foe, am } = setup(undefined, 'antimage'); // düşman Redtithe'in Tithe Cut'ı bedava
    const free = foe.skills.find((id) => { const sk = b.skill(id, foe.uid); return !!sk && skillCostAmount(sk.cost, foe) === 0 && sk.target === 'single_enemy'; });
    const before = am.turnCounter;
    expect(free, 'Redtithe kitinde bedava tek hedefli skill (Tithe Cut)').toBeDefined();
    const evs = cast(b, foe, free!, P(b, 1).uid);
    expect(am.turnCounter).toBe(before);
    expect(evs.some((e) => e.type === 'passive' && e.passive === 'spellbreaker_instinct')).toBe(false);
  });

  it('turda bir kez: AM oynamadan ikinci MP\'li skill sayacı yeniden kaydırmaz; AM oynayınca yeniden açılır', () => {
    const { b, foe, am } = setup();
    const before = am.turnCounter;
    const shift = shiftOf(b, am);
    cast(b, foe, 'fire_bolt', P(b, 1).uid);
    cast(b, foe, 'fire_bolt', P(b, 1).uid);
    expect(am.turnCounter - before).toBeCloseTo(shift, 6);
    expect(am.instinctUsed).toBe(true);
    // AM'in eylemi bitince sıfırlanır
    b.currentUid = am.uid;
    am.turnCounter = T;
    expect(b.skipTurn().ok).toBe(true);
    expect(am.instinctUsed).toBeFalsy();
    const again = am.turnCounter;
    const shift2 = shiftOf(b, am);
    cast(b, foe, 'fire_bolt', P(b, 1).uid);
    expect(am.turnCounter - again).toBeCloseTo(shift2, 6);
  });

  it('test modunda (sırasız) çalışmaz', () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' });
    const am = P(b);
    const foe = E(b);
    foe.mp = foe.maxMp;
    const before = am.turnCounter;
    expect(b.useSkill(foe.uid, 'fire_bolt', P(b, 1).uid).ok).toBe(true);
    expect(am.turnCounter).toBe(before);
  });

});

describe("Spellbreaker's Instinct: yapay zeka", () => {
  // Düşman Mage'in sırası; rakip takımda (party) Instinct'li AM var. MP'li Fire Bolt AM'in takımına: instinct terimi = -(advance x AM tur değeri x instinctShare)
  const setup = () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, 11, 'turns');
    const foe = E(b);
    b.currentUid = foe.uid;
    foe.mp = foe.maxMp;
    foe.cooldowns.fire_bolt = 0;
    return { b, foe, am: P(b) };
  };
  const instinctOf = (b: Battle, uid: string) => explainChoice(b, uid, content.aiConfig)!.candidates.filter((c) => c.skill === 'fire_bolt').map((c) => c.terms?.instinct ?? 0);

  it('MP bedelli skill AM takımına: instinct terimi negatif; tetik hakkı kullanıldıysa 0; ayar instinctShare data/ai.json', () => {
    const { b, foe, am } = setup();
    expect(content.aiConfig.value?.instinctShare).toBe(1);
    const fresh = instinctOf(b, foe.uid);
    expect(fresh.length).toBeGreaterThan(0);
    for (const v of fresh) expect(v).toBeLessThan(0);
    am.instinctUsed = true;
    for (const v of instinctOf(b, foe.uid)) expect(v).toBe(0);
  });

  it('AM ölüyse ya da test modunda bedel yok; aynı taraftaki AM için bedel yok (simetrik)', () => {
    const { b, foe, am } = setup();
    am.hp = 0;
    for (const v of instinctOf(b, foe.uid)) expect(v).toBe(0);
    const t = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' });
    E(t).mp = E(t).maxMp;
    for (const v of instinctOf(t, E(t).uid)) expect(v).toBe(0);
    // Mage dost AM'in takımında: kendi takımındaki AM için bedel yok
    const s = make({ 0: 'mage', 1: 'antimage' }, { 0: 'warrior' }, 11, 'turns');
    s.currentUid = P(s, 0).uid;
    P(s, 0).mp = P(s, 0).maxMp;
    for (const v of instinctOf(s, P(s, 0).uid)) expect(v).toBe(0);
  });
});
