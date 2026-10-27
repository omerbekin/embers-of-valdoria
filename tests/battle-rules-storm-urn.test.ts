import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, hitChance, previewSkill, urnChoice } from '../src/engine';
import { describeEvent } from '../src/engine/match-log';
import type { BattleEvent, BattleMode, Teams } from '../src/engine';
import rulesJson from '../data/battle-rules.json';
import globalJson from '../data/global-skills.json';

/**
 * Harita 2 savaş kuralları M-C Storm (menzilli isabet eki) ve M-N3 Tidewater Urn (oyuncu tarafında etkileşimli nesne; maps-2-3.md bölüm 5,
 * open-questions 430). Sayılar data/battle-rules.json'dan okunur.
 */
const BATTLE = 'random-battle';
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const ofType = <T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);
const STORM = rulesJson.conditions.storm.rangedAccuracy;
const URN = rulesJson.devices.tidewater_urn;
const URN_ID = globalJson.tidewater_urn.id;
const LANES = content.formulas.formation.lanes;
const make = (seed: number, mode: BattleMode, teams: Teams): Battle => new Battle(content.battleSetup(BATTLE, seed, mode, teams, false));

function playOut(b: Battle, maxMoves = 600): BattleEvent[] {
  let i = 0;
  for (let n = 0; n < maxMoves && !b.winner; n++) {
    let uid: string | undefined;
    if (b.mode === 'turns') uid = b.currentActor?.uid;
    else {
      const living = b.combatants.filter((c) => c.hp > 0 && !c.inert);
      uid = living[i++ % living.length]?.uid;
    }
    if (!uid) break;
    const r = b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
    if (!r.ok && b.mode === 'turns') break;
  }
  return b.log;
}

describe('M-C Storm', () => {
  const party = cells({ 0: 'warrior', 3: 'archer', 4: 'defender', 6: 'paladin' });
  const enemies = cells({ 0: 'warrior', 1: 'defender', 2: 'cutthroat', 4: 'mage' });
  const plain: Teams = { party, enemies };
  const storm: Teams = { party, enemies, rules: { condition: 'storm' } };

  it('veri: koşul menzilli isabet ekini taşır', () => {
    const r = content.resolveBattleRules({ condition: 'storm' })!;
    expect(r.condition?.rangedAccuracy).toEqual(STORM);
    expect(STORM.delta).toBeLessThan(0);
  });

  it('isabet eki yalnızca listelenen hareketlerde (ranged); yakın dövüşte 0; koşulsuz savaşta 0', () => {
    const b = make(1, 'test', storm);
    const n = make(1, 'test', plain);
    const archer = b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
    const ranged = archer.skills.map((id) => b.skill(id, archer)!).find((s) => STORM.motions.includes(s.motion))!;
    const melee = content.skills['melee_attack']!;
    expect(ranged).toBeTruthy();
    expect(b.conditionAccuracy(ranged)).toBe(STORM.delta);
    expect(b.conditionAccuracy(melee)).toBe(0);
    expect(n.conditionAccuracy(ranged)).toBe(0);
    expect(b.hitStats(archer, ranged).accuracy).toBeCloseTo(Math.max(0, b.effectiveStats(archer).accuracy + STORM.delta), 6);
    expect(b.hitStats(archer, melee)).toEqual(b.effectiveStats(archer));
  });

  it('önizleme isabet şansı Storm ekiyle aynı formül', () => {
    const b = make(2, 'test', storm);
    const archer = b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
    const ranged = archer.skills.map((id) => b.skill(id, archer)!).find((s) => STORM.motions.includes(s.motion) && s.effects.some((e) => e.type === 'damage') && s.target === 'single_enemy')!;
    const t = b.validTargets(archer.uid, ranged.id)[0]!;
    const p = previewSkill(b, archer.uid, ranged.id, t.uid).find((x) => x.uid === t.uid)!;
    const exp = hitChance(b.hitStats(archer, ranged), b.effectiveStats(t), content.formulas) * (1 - b.blockChance(archer, t, ranged.effects.find((e) => e.type === 'damage') as never, ranged));
    expect(p.damage!.hitChance).toBeCloseTo(exp, 6);
  });

  it('gerçek zar: aynı seed ve aynı zarla Storm vuruşu yalnızca ıskaya çevirir (tersi olmaz); yakın dövüş birebir aynı', () => {
    let flipped = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const shot = (teams: Teams) => {
        const b = make(seed, 'test', teams);
        const archer = b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
        const sk = archer.skills.map((id) => b.skill(id, archer)!).find((s) => STORM.motions.includes(s.motion) && s.target === 'single_enemy' && s.effects.some((e) => e.type === 'damage'))!;
        const t = b.validTargets(archer.uid, sk.id)[0]!;
        const r = b.useSkill(archer.uid, sk.id, t.uid);
        expect(r.ok).toBe(true);
        return (r as { events: BattleEvent[] }).events.some((e) => e.type === 'damage' && e.source === archer.uid);
      };
      const a = shot(plain);
      const s = shot(storm);
      expect(s && !a).toBe(false);
      if (a && !s) flipped++;
      const melee = (teams: Teams) => {
        const b = make(seed, 'test', teams);
        const w = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
        const t = b.validTargets(w.uid, 'melee_attack')[0]!;
        return JSON.stringify((b.useSkill(w.uid, 'melee_attack', t.uid) as { events: BattleEvent[] }).events.filter((e) => e.type !== 'round'));
      };
      expect(melee(storm)).toBe(melee(plain));
    }
    expect(flipped).toBeGreaterThan(0);
  });

  for (const mode of MODES)
    it(`${mode}: tam savaş belirleyici ve biter`, () => {
      const a = playOut(make(7, mode, storm));
      expect(JSON.stringify(playOut(make(7, mode, storm)))).toBe(JSON.stringify(a));
    });
});

describe('M-N3 Tidewater Urn', () => {
  // Urn hücresinin (veri: slot) dört komşusunda kahraman; Urn hücresinde başlayan kahraman kenara geçer
  const around = (slot: number) => {
    const out = [slot - LANES, slot + LANES].filter((s) => s >= 0 && s < content.CELL_COUNT);
    if (slot % LANES > 0) out.push(slot - 1);
    if (slot % LANES < LANES - 1) out.push(slot + 1);
    return out;
  };
  const near = around(URN.slot);
  const party = cells({ [near[0]!]: 'warrior', [near[1]!]: 'archer', [near[2]!]: 'defender', [near[3] ?? 11]: 'paladin' });
  const enemies = cells({ 0: 'corsair_cutlass', 2: 'moor_raider', 6: 'corsair_slinger', 8: 'reaver_archer' });
  const teams: Teams = { party, enemies, rules: { device: 'tidewater_urn' } };

  it('veri: Urn kuralı çözümlenir; bilinmeyen nesne hatadır', () => {
    const r = content.resolveBattleRules({ device: 'tidewater_urn' })!;
    expect(r.urn).toMatchObject({ id: 'tidewater_urn', side: URN.side, slot: URN.slot, uses: URN.uses, ground: URN.ground, rounds: URN.rounds, soak: URN.soak });
    expect(content.resolveBattleRules({ device: { id: 'tidewater_urn', slot: 7 } })!.urn!.slot).toBe(7);
    expect(() => content.resolveBattleRules({ device: 'nope' })).toThrow();
  });

  it('Urn hücresi yalnızca kendi tahtasında kapalı; orada başlayan kahraman kenara geçer', () => {
    const b = make(1, 'test', { ...teams, party: cells({ [URN.slot]: 'warrior', [near[0]!]: 'archer' }) });
    expect(b.freeSlots(URN.side as 'party')).not.toContain(URN.slot);
    expect(b.freeSlots('enemy')).toContain(URN.slot);
    expect(b.combatants.some((c) => c.side === 'party' && c.slot === URN.slot)).toBe(false);
  });

  it('eylem yalnızca Urn varken ve yalnızca Urn tarafında listelenir', () => {
    const b = make(1, 'test', teams);
    expect(b.globalSkillIds('party')).toContain(URN_ID);
    expect(b.globalSkillIds('enemy')).not.toContain(URN_ID);
    const n = make(1, 'test', { party, enemies });
    expect(n.globalSkillIds('party')).not.toContain(URN_ID);
    expect(n.globalSkillIds()).not.toContain(URN_ID);
  });

  it('yalnızca bitişik kahraman kullanır; satır seçimi zorunlu', () => {
    const b = make(1, 'test', { ...teams, party: cells({ [near[0]!]: 'warrior', 11: 'archer' }) });
    const adj = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
    const far = b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
    expect(b.nextToUrn(adj)).toBe(true);
    expect(b.nextToUrn(far)).toBe(false);
    expect(b.canUseGlobal(far.uid, URN_ID)).toEqual({ ok: false, reason: 'Stand next to the urn' });
    expect(b.canUseGlobal(adj.uid, URN_ID).ok).toBe(true);
    expect(b.useGlobal(adj.uid, URN_ID).ok).toBe(false);
  });

  for (const mode of MODES)
    it(`${mode}: sıra su basar, sudakiler Soaked, ${URN.uses} kullanım sonra boş`, () => {
      const b = make(3, mode, teams);
      const party0 = () => {
        if (mode === 'test') return b.combatants.find((c) => c.side === 'party' && c.hp > 0 && b.nextToUrn(c))!;
        for (let k = 0; k < 40 && b.currentActor?.side !== 'party'; k++) b.skipTurn();
        return b.currentActor!;
      };
      for (let use = 1; use <= URN.uses; use++) {
        const actor = party0();
        expect(b.nextToUrn(actor)).toBe(true);
        const row = (use - 1) % b.urnRows().length;
        const slot = b.urnRowCells(row)[0]!;
        const r = b.useGlobal(actor.uid, URN_ID, slot);
        expect(r.ok, (r as { reason?: string }).reason).toBe(true);
        const ev = (r as { events: BattleEvent[] }).events;
        const u = ofType(ev, 'urn')[0]!;
        expect(u).toMatchObject({ actor: actor.uid, row, left: URN.uses - use });
        expect(u.slots).toEqual(b.urnRowCells(row));
        expect(u.slots).not.toContain(URN.slot);
        const g = ofType(ev, 'ground').find((x) => x.ground === URN.ground)!;
        expect(g.board).toBe(URN.side);
        expect(g.slots).toEqual(u.slots);
        for (const c of b.combatants.filter((x) => x.hp > 0 && x.board === URN.side && u.slots.includes(x.slot))) expect(c.statuses.some((s) => s.kind === URN.soak)).toBe(true);
        expect(describeEvent(b, u)).toContain('TIDEWATER URN');
      }
      expect(b.urnState()!.left).toBe(0);
      const actor = party0();
      expect(b.canUseGlobal(actor.uid, URN_ID)).toEqual({ ok: false, reason: 'The urn is empty' });
    });

  it('Urn suyu Burning Ground söndürür ve veri süresi kadar (savaş turu) kalır', () => {
    const b = make(4, 'turns', teams);
    for (let k = 0; k < 40 && b.currentActor?.side !== 'party'; k++) b.skipTurn();
    const actor = b.currentActor!;
    b.ground.push({ id: 'gx', ground: 'burning', board: 'party', slots: [0, 1, 2, 3], turns: 9, source: 'enemy-0', sourceSide: 'enemy', amount: 5 });
    const startRound = b.round;
    expect(b.useGlobal(actor.uid, URN_ID, 0).ok).toBe(true);
    expect(b.ground.find((x) => x.ground === 'burning')?.slots).toEqual([3]);
    const water = b.ground.find((x) => x.ground === URN.ground)!;
    expect(water.envUntilRound).toBe(startRound + URN.rounds);
    for (let n = 0; n < 400 && b.round < startRound + URN.rounds && !b.winner; n++) b.skipTurn();
    expect(b.ground.some((x) => x.ground === URN.ground)).toBe(false);
  });

  it('Tide yeniden basınca Urn suyuna dokunmaz', () => {
    const b = make(5, 'test', { ...teams, rules: { device: 'tidewater_urn', condition: 'tide' } });
    const actor = b.combatants.find((c) => c.side === 'party' && b.nextToUrn(c))!;
    const back = b.urnRows()[b.urnRows().length - 1]!;
    expect(b.useGlobal(actor.uid, URN_ID, b.urnRowCells(back)[0]!).ok).toBe(true);
    (b as unknown as { flood(r: unknown, e: (x: BattleEvent) => void): void }).flood(b.rules!.condition!.flood, () => {});
    expect(b.ground.filter((x) => x.ground === URN.ground && x.board === 'party').map((x) => x.envCause).sort()).toEqual(['tide', 'tidewater_urn']);
  });

  it('YZ kuralı: kendi sırasında Burning zemin / yanan kahraman puanı eşiği geçerse Urn, yoksa hayır', () => {
    const b = make(6, 'test', teams);
    const actor = b.combatants.find((c) => c.side === 'party' && b.nextToUrn(c))!;
    expect(urnChoice(b, actor)).toBeNull();
    const row = b.urnRows()[0]!;
    const rowCells = b.urnRowCells(row);
    b.ground.push({ id: 'gx', ground: URN.ai.burningGround, board: 'party', slots: rowCells.slice(0, Math.ceil(URN.ai.minScore / URN.ai.burningCell)), turns: 3, source: 'enemy-0', sourceSide: 'enemy', amount: 5 });
    const u = urnChoice(b, actor)!;
    expect(u.choice).toMatchObject({ skillId: URN_ID, reason: 'urn' });
    expect(b.rowOf(u.choice.slot!)).toBe(row);
    expect(chooseAction(b, actor.uid, content.aiConfig)).toMatchObject({ skillId: URN_ID });
    const enemy = b.combatants.find((c) => c.side === 'enemy' && c.hp > 0)!;
    expect(urnChoice(b, enemy)).toBeNull();
  });

  for (const mode of MODES)
    it(`${mode}: tam YZ savaşı belirleyici ve biter (ateş atan düşmanlara karşı)`, () => {
      const a = playOut(make(8, mode, teams));
      expect(JSON.stringify(playOut(make(8, mode, teams)))).toBe(JSON.stringify(a));
      expect(a.some((e) => e.type === 'battleEnd')).toBe(true);
    });

  it('sefer verisi: Storm ve Urn karşılaşmaları doğrulanır', async () => {
    const enc = (await import('../data/campaign/drowned-reach-encounters.json')).default as Record<string, { condition?: string; device?: string }>;
    const storm = Object.entries(enc).filter(([, e]) => e?.condition === 'storm').map(([k]) => k);
    const urn = Object.entries(enc).filter(([, e]) => e?.device === 'tidewater_urn').map(([k]) => k);
    expect(storm.length).toBeGreaterThanOrEqual(2);
    expect(storm.length).toBeLessThanOrEqual(4);
    expect(urn.length).toBeGreaterThanOrEqual(1);
    expect(urn.length).toBeLessThanOrEqual(2);
  });
});
