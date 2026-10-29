import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive, explainChoice, describeSkill, previewForTargets, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type SkillEffect, type Teams } from '../src/engine';

// Anti-Mage, Ömer 2026-10-29 (open-questions 456): Ley Thread (Mana Steal ipliği -> sonraki Ley Brand o hedefte +2 tur, 1,5x bedel yakımı) ve
// Spellbreaker's Instinct (Mana Overflow'un yerine: MP'li düşman skill'i AM'in takımına -> AM'in sıra sayacı eşiğin %10'u öne). Sayılar veriden.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: {}, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const BRAND = content.skills.drain_field!.effects.find((e) => e.type === 'brand') as Extract<SkillEffect, { type: 'brand' }>;
const THREAD = content.skills.mana_burn!.effects.find((e) => e.type === 'status' && e.status === 'ley_thread') as Extract<SkillEffect, { type: 'status' }>;
const INSTINCT = content.classes.antimage!.passive!.effect as Extract<NonNullable<NonNullable<(typeof content.classes)[string]>['passive']>['effect'], { type: 'spellbreakerInstinct' }>;
const thread = (c: Combatant) => c.statuses.find((s) => s.kind === 'ley_thread');
const branded = (c: Combatant) => c.statuses.find((s) => s.kind === 'branded');

/** Mana Steal isabet edene kadar (iska ise yeniden; test modu). */
function steal(b: Battle, me: Combatant, target: Combatant): BattleEvent[] {
  const from = b.log.length;
  for (let i = 0; i < 40; i++) {
    me.cooldowns.mana_burn = 0;
    const r = b.useSkill(me.uid, 'mana_burn', target.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (b.log.slice(from).some((e) => e.type === 'manaBurn' && e.target === target.uid)) break;
  }
  return b.log.slice(from);
}
function brand(b: Battle, me: Combatant, slot = 0): BattleEvent[] {
  const from = b.log.length;
  me.cooldowns.drain_field = 0;
  me.mp = me.maxMp;
  const r = b.useSkill(me.uid, 'drain_field', undefined, slot);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return b.log.slice(from);
}

describe('Ley Thread: veri ve metin', () => {
  it('Mana Steal 2 tur ley_thread bırakır; Ley Brand threadTurns 2, threadBurnMult 1,5; durum debuff, CC değil', () => {
    expect(THREAD?.turns).toBe(2);
    expect(BRAND.threadTurns).toBe(2);
    expect(BRAND.threadBurnMult).toBe(2);
    expect(content.statuses.ley_thread?.type).toBe('debuff');
    expect(content.statuses.ley_thread?.cc).toBeFalsy();
  });

  it('skill-info: Mana Steal ipliği, Ley Brand iplik eki yazılır', () => {
    const st = make({ 0: 'antimage' }, { 0: 'mage' });
    const defs = { statuses: content.statuses, grounds: content.grounds, skills: content.skills };
    const ms = describeSkill(content.skills.mana_burn!, P(st).stats, content.formulas, content.summons, defs).lines.join(' ');
    expect(ms).toContain('Ley Thread');
    const lb = describeSkill(content.skills.drain_field!, P(st).stats, content.formulas, content.summons, defs).lines.join(' ');
    expect(lb).toContain('On an enemy with Ley Thread, the Brand lasts 2 turns longer and burns twice as much extra MP per cast; the Ley Thread is used up');
  });
});

describe('Ley Thread: motor', () => {
  it('Mana Steal isabet edince hedefte ley_thread (2 tur, kaynak AM)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    steal(b, P(b), E(b));
    expect(thread(E(b))).toMatchObject({ turns: THREAD.turns, source: P(b).uid });
  });

  it('Ley Brand iplikli hedefte +threadTurns tur, castBurnPct x threadBurnMult; iplik tüketilir (statusEnd consumed); ipliksiz komşu normal', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage', 1: 'mage' });
    const me = P(b);
    steal(b, me, E(b, 0));
    expect(thread(E(b, 1))).toBeUndefined();
    const evs = brand(b, me, 0);
    expect(branded(E(b, 0))?.turns).toBe(BRAND.turns + BRAND.threadTurns!);
    expect(branded(E(b, 0))?.brand?.castBurnPct).toBeCloseTo(BRAND.castBurnPct! * BRAND.threadBurnMult!);
    expect(thread(E(b, 0))).toBeUndefined();
    expect(evs.some((e) => e.type === 'statusEnd' && e.target === E(b, 0).uid && e.status === 'ley_thread' && e.consumed)).toBe(true);
    expect(branded(E(b, 1))?.turns).toBe(BRAND.turns);
    expect(branded(E(b, 1))?.brand?.castBurnPct).toBe(BRAND.castBurnPct);
    // Tüketildi: ikinci Brand normal süre
    brand(b, me, 0);
    expect(branded(E(b, 0))?.turns).toBe(BRAND.turns);
    expect(branded(E(b, 0))?.brand?.castBurnPct).toBe(BRAND.castBurnPct);
  });

  it('iplikli Brand altında MP skill bedel yakımı 1,5 kat', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    steal(b, me, foe);
    brand(b, me, 0);
    foe.mp = foe.maxMp;
    foe.cooldowns.fire_bolt = 0;
    const paid = skillCostAmount(b.skill('fire_bolt', foe.uid)!.cost, foe);
    const from = b.log.length;
    expect(b.useSkill(foe.uid, 'fire_bolt', me.uid).ok).toBe(true);
    const mb = b.log.slice(from).find((e) => e.type === 'manaBurn' && e.target === foe.uid) as Extract<BattleEvent, { type: 'manaBurn' }>;
    expect(mb?.amount).toBe(Math.min(foe.maxMp - paid, Math.round(paid * BRAND.castBurnPct! * BRAND.threadBurnMult!)));
  });

  it('önizleme: iplikli hedefte Brand süresi ve yakım oranı ekli, threaded işareti', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    steal(b, me, E(b));
    me.cooldowns.drain_field = 0;
    me.mp = me.maxMp;
    const pv = previewForTargets(b, me, 'drain_field', [E(b)]).find((x) => x.uid === E(b).uid);
    expect(pv?.brand).toMatchObject({ turns: BRAND.turns + BRAND.threadTurns!, threaded: true });
    expect(pv?.brand?.castBurnPct).toBeCloseTo(BRAND.castBurnPct! * BRAND.threadBurnMult!);
  });

  it('iplik süresi: hedefin 2 turu sonunda düşer (turns modu)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, 11, 'turns');
    const me = P(b);
    const foe = E(b);
    // iplik Mana Steal'in bıraktığı örnekle aynı (uygulanışı yukarıdaki testte); burada yalnızca süresi ölçülür
    foe.statuses.push({ kind: 'ley_thread', turns: THREAD.turns, source: me.uid });
    let foeTurns = 0;
    for (let i = 0; i < 40 && thread(foe) && !b.winner; i++) {
      const cur = b.currentUid!;
      if (cur === foe.uid) foeTurns++;
      expect(b.skipTurn().ok).toBe(true);
    }
    expect(thread(foe)).toBeUndefined();
    expect(foeTurns).toBeLessThanOrEqual(THREAD.turns);
    expect(foeTurns).toBeGreaterThan(0);
  });
});

describe("Spellbreaker's Instinct", () => {
  const T = content.formulas.turn.threshold;
  const shift = Math.round(T * INSTINCT.advance * 1000) / 1000;
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

  it('veri: AM pasifi Spellbreaker\'s Instinct (advance 0,1), metin kısa; Mana Overflow AM\'de yok', () => {
    const pas = content.classes.antimage!.passive!;
    expect(pas.id).toBe('spellbreaker_instinct');
    expect(INSTINCT.type).toBe('spellbreakerInstinct');
    expect(INSTINCT.advance).toBe(0.1);
    expect(describePassive(pas, P(make({ 0: 'antimage' }, { 0: 'mage' })).stats, content.formulas)).toContain('10%');
  });

  it("MP'li düşman skill'i AM'in dostuna: AM'in sayacı eşik x advance öne, pasif olayı", () => {
    const { b, foe, am } = setup();
    const before = am.turnCounter;
    const evs = cast(b, foe, 'fire_bolt', P(b, 1).uid);
    expect(skillCostAmount(content.skills.fire_bolt!.cost, foe)).toBeGreaterThan(0);
    expect(am.turnCounter - before).toBeCloseTo(shift, 6);
    expect(evs.some((e) => e.type === 'passive' && e.actor === am.uid && e.passive === 'spellbreaker_instinct')).toBe(true);
  });

  it('AM\'in kendisine atılan MP\'li skill de sayar', () => {
    const { b, foe, am } = setup();
    const before = am.turnCounter;
    cast(b, foe, 'fire_bolt', am.uid);
    expect(am.turnCounter - before).toBeCloseTo(shift, 6);
  });

  it('bedava skill (MP bedeli 0) tetiklemez', () => {
    const { b, foe, am } = setup(undefined, 'antimage'); // düşman AM'in Mana Steal'i bedava
    const free = foe.skills.find((id) => { const sk = b.skill(id, foe.uid); return !!sk && skillCostAmount(sk.cost, foe) === 0 && sk.target === 'single_enemy'; });
    const before = am.turnCounter;
    expect(free, 'AM kitinde bedava tek hedefli skill (Mana Steal)').toBeDefined();
    const evs = cast(b, foe, free!, P(b, 1).uid);
    expect(am.turnCounter).toBe(before);
    expect(evs.some((e) => e.type === 'passive' && e.passive === 'spellbreaker_instinct')).toBe(false);
  });

  it('turda bir kez: AM oynamadan ikinci MP\'li skill sayacı yeniden kaydırmaz; AM oynayınca yeniden açılır', () => {
    const { b, foe, am } = setup();
    const before = am.turnCounter;
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
    cast(b, foe, 'fire_bolt', P(b, 1).uid);
    expect(am.turnCounter - again).toBeCloseTo(shift, 6);
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

  it("AM ağacı v4: 0. satır (Spellbreaker's Instinct / Ley Thread), 4.d3 ve Mastery 5 yeniden tasarlandı; inactive düğüm kalmadı", async () => {
    const tree = (await import('../data/skill-trees/antimage.json')).default as { version: number; rows: Array<{ skill: string }>; nodes: Record<string, { inactive?: boolean; text: string }>; mastery: { bar: Array<{ inactive?: boolean; text: string }> } };
    expect(tree.version).toBe(5);
    expect(tree.rows[0]!.skill).toBe('spellbreaker_instinct');
    for (const [k, n] of Object.entries(tree.nodes)) {
      expect(n.inactive, k).toBeUndefined();
      expect(n.text, k).not.toMatch(/Mana Overflow/);
    }
    expect(tree.mastery.bar[0]?.inactive).toBeUndefined();
    expect(tree.mastery.bar[0]?.text).not.toMatch(/Mana Overflow/);
  });
});

describe('Ley Thread: yapay zeka', () => {
  const cand = (b: Battle, uid: string, skill: string, target?: string) => explainChoice(b, uid, content.aiConfig)!.candidates.filter((c) => c.skill === skill && (!target || c.target === target));
  const turnsBattle = () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage', 1: 'mage' }, 11, 'turns');
    const me = P(b);
    b.currentUid = me.uid;
    me.mp = me.maxMp;
    for (const f of [E(b, 0), E(b, 1)]) f.mp = f.maxMp;
    return { b, me };
  };

  it('Mana Steal: Ley Brand bir sonraki turda hazırsa iplik değeri (brand terimi) > 0; Brand uzun cooldown\'daysa 0', () => {
    const { b, me } = turnsBattle();
    me.cooldowns.drain_field = 1;
    const ready = Math.max(...cand(b, me.uid, 'mana_burn').map((c) => c.terms?.brand ?? 0));
    expect(ready).toBeGreaterThan(0);
    me.cooldowns.drain_field = 3;
    const later = Math.max(0, ...cand(b, me.uid, 'mana_burn').map((c) => c.terms?.brand ?? 0));
    expect(later).toBe(0);
  });

  it('Ley Brand: iplikli MP\'li hedefi kapsayan atışın brand değeri ipliksizden yüksek (1,5x bedel yakımı)', () => {
    const { b, me } = turnsBattle();
    me.cooldowns.drain_field = 0;
    const base = Math.max(...cand(b, me.uid, 'drain_field').map((c) => c.terms?.brand ?? 0));
    E(b, 0).statuses.push({ kind: 'ley_thread', turns: THREAD.turns, source: me.uid });
    const thr = Math.max(...cand(b, me.uid, 'drain_field').map((c) => c.terms?.brand ?? 0));
    expect(thr).toBeGreaterThan(base);
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
