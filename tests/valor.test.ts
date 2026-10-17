import { describe, expect, it } from 'vitest';
import { addValor, Battle, battleSummary, brazierFill, canReviveOutside, chooseAction, content, describeGlobalSkill, valorEarned } from '../src/engine';
import type { BattleEvent, BattleMode } from '../src/engine';

/**
 * Valor (Ömer 2026-10-13, data/valor.json): kazanma kuralları, savaşta global diriltme (bedel, %50 can, hücre, tur harcanır, iki mod, belirleyicilik),
 * yalnızca Valor verilen taraf, yapay zeka.
 */
const R = content.valorRules;
const COST = R.revive.battleCost;
const OUT = R.revive.outsideCost;
const PB = R.perBrazier;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

function mk(party: Record<number, string>, enemies: Record<number, string>, o: { mode?: BattleMode; seed?: number; valor?: number } = {}): Battle {
  const b = new Battle(
    content.battleSetup('random-battle', o.seed ?? 1, o.mode ?? 'test', { party: cells(party), enemies: cells(enemies), ...(o.valor !== undefined ? { valor: { party: o.valor } } : {}) }, false),
  );
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0 });
  return b;
}
const unitAt = (b: Battle, side: 'party' | 'enemy', slot: number) => b.combatants.find((c) => c.side === side && c.slot === slot)!;

describe('Valor kazanma (saf)', () => {
  it('veri: iki mangal = cap; savaşta diriltme savaş dışından pahalı; %50 can', () => {
    expect(R.cap).toBe(R.perBrazier * 2);
    expect(R.revive.outsideCost).toBeLessThan(R.revive.battleCost);
    expect(R.revive.hpRatio).toBe(0.5);
    expect(R.campaign.introNode).toBe('7');
  });

  it('zafer +1, kusursuz +flawless daha; elit +2, boss +3 (win YERİNE), kusursuz eki yine +flawless (Ömer 2026-10-13: flawless 0)', () => {
    const F = R.earn.flawless;
    expect(valorEarned(R, 'normal', false)).toBe(1);
    expect(valorEarned(R, 'normal', true)).toBe(1 + F);
    expect(valorEarned(R, 'elite', false)).toBe(2);
    expect(valorEarned(R, 'elite', true)).toBe(2 + F);
    expect(valorEarned(R, 'boss', false)).toBe(3);
    expect(valorEarned(R, 'boss', true)).toBe(3 + F);
    expect(valorEarned({ ...R, earn: { ...R.earn, flawless: 1 } }, 'boss', true)).toBe(4);
  });

  it('üst sınır cap; negatif olmaz; savaş dışı diriltme outsideCost ister; mangal dolumu soldan', () => {
    expect(addValor(R, R.cap - 1, 4)).toBe(R.cap);
    expect(addValor(R, R.cap, 1)).toBe(R.cap);
    expect(addValor(R, 0, -3)).toBe(0);
    expect(canReviveOutside(R, OUT - 1)).toBe(false);
    expect(canReviveOutside(R, OUT)).toBe(true);
    expect(brazierFill(R, 0)).toEqual({ embers: [0, 0], ready: 0 });
    expect(brazierFill(R, PB + 2)).toEqual({ embers: [PB, 2], ready: 1 });
    expect(brazierFill(R, R.cap)).toEqual({ embers: [PB, PB], ready: 2 });
  });
});

describe('Valor savaşta: global diriltme', () => {
  it('veri: valor_revive global eylemi (kind valor, hedef dead_ally); açıklama bedeli ve %50 canı veriden yazar', () => {
    const g = content.globalSkills.valor_revive!;
    expect(g.kind).toBe('valor');
    expect(g.target).toBe('dead_ally');
    const info = describeGlobalSkill(g, content.formulas, R);
    expect(info.cost).toBe(`${COST} Valor`);
    expect(info.lines.join(' ')).toContain('50% HP');
  });

  it('Valor verilmeyen savaşta (hızlı savaş) eylem hiç görünmez; düşman tarafında da yok', () => {
    const qb = mk({ 0: 'warrior', 1: 'mage' }, { 0: 'archer' });
    expect(qb.valorOf('party')).toBeNull();
    expect(qb.globalSkillIds('party')).not.toContain('valor_revive');
    expect(qb.listActions('party-0').map((a) => a.id)).not.toContain('valor_revive');
    const b = mk({ 0: 'warrior', 1: 'mage' }, { 0: 'archer', 1: 'druid' }, { valor: 5 });
    expect(b.valorOf('enemy')).toBeNull();
    expect(b.listActions('enemy-0').map((a) => a.id)).not.toContain('valor_revive');
    b.debugKill('enemy-1');
    expect(b.canUseGlobal('enemy-0', 'valor_revive').ok).toBe(false);
  });

  it('test modu: battleCost Valor harcanır, düşen %50 canla cesedinin hücresinde kalkar; olaylar valor + revive (cause valor)', () => {
    const b = mk({ 0: 'warrior', 4: 'mage' }, { 0: 'archer' }, { valor: COST + 2 });
    const mage = unitAt(b, 'party', 4);
    b.debugKill(mage.uid);
    const list = b.listActions('party-0').find((a) => a.id === 'valor_revive')!;
    expect(list.ok).toBe(true);
    expect(list.targets).toEqual([mage.uid]);
    const r = b.useGlobal('party-0', 'valor_revive', undefined, mage.uid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(mage.hp).toBe(Math.round(mage.maxHp * 0.5));
    expect(mage.slot).toBe(4);
    expect(b.valorOf('party')).toBe(2);
    expect(ofType(r.events, 'valor')[0]).toMatchObject({ side: 'party', spent: COST, after: 2 });
    expect(ofType(r.events, 'revive')[0]).toMatchObject({ target: mage.uid, cause: 'valor', slot: 4 });
    expect(b.corpseOf(mage.uid)).toBeFalsy();
  });

  it('yetersiz Valor, düşmüş dost yok, yanlış hedef: kullanılamaz (neden yazılı)', () => {
    const b = mk({ 0: 'warrior', 4: 'mage' }, { 0: 'archer' }, { valor: COST - 1 });
    expect((b.canUseGlobal('party-0', 'valor_revive') as { reason?: string }).reason).toBe(`Needs ${COST} Valor (you have ${COST - 1})`);
    b.debugSetValor('party', COST);
    expect((b.canUseGlobal('party-0', 'valor_revive') as { reason?: string }).reason).toBe('No fallen ally to revive');
    b.debugKill(unitAt(b, 'party', 4).uid);
    expect(b.canUseGlobal('party-0', 'valor_revive', undefined, 'enemy-0').ok).toBe(false);
    expect(b.useGlobal('party-0', 'valor_revive').ok).toBe(false); // hedefsiz
  });

  it('ceset hücresi doluysa (Move ile üstüne geçilmiş) en yakın boş hücreye kalkar (Resurrection kuralı)', () => {
    const b = mk({ 0: 'warrior', 4: 'mage', 7: 'archer' }, { 0: 'archer' }, { valor: R.cap });
    const mage = unitAt(b, 'party', 4);
    b.debugKill(mage.uid);
    expect(b.useGlobal(unitAt(b, 'party', 7).uid, 'move_tile', 4).ok).toBe(true);
    const spot = b.valorSlotFor(mage.uid);
    expect(spot).not.toBe(4);
    expect(spot).toBe(b.reviveSlotFor('party-0', 'resurrection', mage.uid) ?? spot); // aynı en-yakın kuralı
    expect(b.useGlobal('party-0', 'valor_revive', undefined, mage.uid).ok).toBe(true);
    expect(mage.slot).toBe(spot);
    expect(b.valorOf('party')).toBe(R.cap - COST);
  });

  it('turns modu: aktörün turu harcanır (sıra ilerler, tur sayısı artar); BattleAction ile de çalışır', () => {
    const b = mk({ 0: 'warrior', 4: 'mage' }, { 0: 'archer' }, { mode: 'turns', valor: COST });
    const mage = unitAt(b, 'party', 4);
    b.debugKill(mage.uid);
    for (let i = 0; i < 50 && b.currentUid !== 'party-0'; i++) b.skipTurn();
    expect(b.currentUid).toBe('party-0');
    const before = b.turnsTaken;
    const r = b.act('party-0', { kind: 'global', id: 'valor_revive', targetUid: mage.uid });
    expect(r.ok).toBe(true);
    expect(b.turnsTaken).toBe(before + 1);
    expect(b.currentUid).not.toBe('party-0');
    expect(mage.hp).toBeGreaterThan(0);
    expect(b.valorOf('party')).toBe(0);
  });

  it('belirleyici: aynı seed + aynı eylemler = aynı olay günlüğü', () => {
    const run = () => {
      const b = mk({ 0: 'warrior', 4: 'mage' }, { 0: 'archer', 1: 'druid' }, { mode: 'turns', valor: COST + 1, seed: 42 });
      const mage = unitAt(b, 'party', 4);
      b.debugKill(mage.uid);
      for (let i = 0; i < 50 && b.currentUid !== 'party-0'; i++) b.skipTurn();
      b.act('party-0', { kind: 'global', id: 'valor_revive', targetUid: mage.uid });
      for (let i = 0; i < 40 && !b.winner; i++) b.applyChoice(b.currentUid!, chooseAction(b, b.currentUid!, content.aiConfig));
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });

  it('özet: kalan Valor ve kusursuz zafer (düşen varsa false; savaşa ceset giren sayılmaz); Valor yoksa alan yok', () => {
    const b = mk({ 0: 'warrior', 4: 'mage' }, { 0: 'archer' }, { valor: 3 });
    expect(battleSummary(b).valor).toEqual({ left: 3, flawless: true });
    b.debugKill(unitAt(b, 'party', 4).uid);
    expect(battleSummary(b).valor).toEqual({ left: 3, flawless: false });
    const dead = new Battle(content.battleSetup('random-battle', 1, 'test', { party: cells({ 0: 'warrior', 4: 'mage' }), enemies: cells({ 0: 'archer' }), units: { party: { 4: { startDead: 'revivable' } } }, valor: { party: 5 } }, false));
    expect(battleSummary(dead).valor).toEqual({ left: 5, flawless: true });
    expect(dead.valorTargets('party-0').map((c) => c.slot)).toEqual([4]); // savaşa ceset giren de diriltilebilir
    expect(battleSummary(mk({ 0: 'warrior' }, { 0: 'archer' })).valor).toBeUndefined();
  });

  it('yapay zeka: Valor yoksa hiç seçmez; değerli düşmüş dost varken ve savaş belli değilken diriltir', () => {
    // Valor'suz aynı durum: seçim valor_revive olamaz
    const mkCase = (valor?: number) => {
      const b = new Battle(content.battleSetup('random-battle', 1, 'test', { party: cells({ 0: 'warrior', 1: 'defender', 3: 'archer', 4: 'mage' }), enemies: cells({ 0: 'warrior', 1: 'archer', 2: 'druid' }), ...(valor !== undefined ? { valor: { party: valor } } : {}) }, false));
      b.debugKill(unitAt(b, 'party', 4).uid);
      // Rage yok: Whirlwind/Charge/Headsman's Blow seçilemez (0.8.4: güçlenen Whirlwind dirilişin önüne geçiyordu); revive bedelsiz Strike ile yarışır
      unitAt(b, 'party', 0).mp = 0;
      return b;
    };
    const none = mkCase();
    expect(chooseAction(none, 'party-0', content.aiConfig)?.skillId).not.toBe('valor_revive');
    const b = mkCase(R.cap);
    const pick = chooseAction(b, 'party-0', content.aiConfig);
    expect(pick?.skillId).toBe('valor_revive');
    expect(b.valorTargets('party-0').map((c) => c.uid)).toContain(pick!.targetUid);
    expect(b.applyChoice('party-0', pick).ok).toBe(true);
    expect(b.valorOf('party')).toBe(R.cap - COST);
  });
});
