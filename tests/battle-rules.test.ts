import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { BattleEvent, BattleMode, Teams } from '../src/engine';
import rulesJson from '../data/battle-rules.json';

/**
 * Karşılaşma kuralları (Harita 2-3 savaş katmanı; docs/design/campaign/maps-2-3.md M-A koşul, B3 hedef, M-B Tide / Flooded / Soaked, M-I kapalı
 * hücre, M-J crossing güvertesi). Kural verilmezse savaş birebir eskisi. Sayılar data/battle-rules.json'dan okunur.
 */
const BATTLE = 'random-battle';
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const ofType = <T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);
const TIDE = rulesJson.conditions.tide.flood;
const LANES = content.formulas.formation.lanes;

const BASE: Teams = {
  party: cells({ 0: 'warrior', 1: 'defender', 3: 'undead', 6: 'paladin' }),
  enemies: cells({ 0: 'warrior', 2: 'cutthroat', 4: 'mage' }),
};

const make = (seed: number, mode: BattleMode, teams: Teams): Battle => new Battle(content.battleSetup(BATTLE, seed, mode, teams, false));

/** İki taraf da YZ ile oynar (turns: sıraya göre; test: canlı birimler sırayla). */
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

/** turns modunda sıradaki birim pas geçer (Skip yerine motorun pas yolu: skipTurn). */
const passTurns = (b: Battle, n: number) => {
  for (let k = 0; k < n && !b.winner; k++) b.skipTurn();
};

describe('kuralsız savaş birebir aynı', () => {
  for (const mode of MODES)
    it(`${mode}: rules yok / boş = aynı kurulum ve aynı olaylar`, () => {
      for (const seed of [1, 9, 33]) {
        const plain = content.battleSetup(BATTLE, seed, mode, BASE, false);
        expect(plain.rules).toBeUndefined();
        const empty = content.battleSetup(BATTLE, seed, mode, { ...BASE, rules: {} }, false);
        expect(empty.rules).toBeUndefined();
        const a = playOut(new Battle(plain));
        const b = playOut(new Battle(empty));
        expect(JSON.stringify(b)).toBe(JSON.stringify(a));
        expect(a.some((e) => e.type === 'round' || e.type === 'objective' || e.type === 'reinforce')).toBe(false);
      }
    });

  it('kurallı savaş da belirleyici (aynı seed = aynı olaylar)', () => {
    const teams: Teams = { ...BASE, rules: { condition: 'tide', objective: 'survive', blocked: 'deck' } };
    for (const mode of MODES) expect(JSON.stringify(playOut(make(5, mode, teams)))).toBe(JSON.stringify(playOut(make(5, mode, teams))));
  });

  it('bilinmeyen koşul / düzen / hedef veri hatasıdır', () => {
    expect(() => content.resolveBattleRules({ condition: 'nope' })).toThrow();
    expect(() => content.resolveBattleRules({ blocked: 'nope' })).toThrow();
    expect(() => content.resolveBattleRules({ objective: 'nope' as never })).toThrow();
  });
});

describe('M-B Tide: Flooded + Soaked', () => {
  const teams: Teams = { ...BASE, rules: { condition: 'tide' } };

  for (const mode of MODES)
    it(`${mode}: savaş başında iki tarafın ön sırası su altında, ön sıradakiler Soaked`, () => {
      const b = make(3, mode, teams);
      const floods = ofType(b.log, 'ground').filter((g) => g.ground === TIDE.ground);
      expect(floods.map((g) => g.board).sort()).toEqual([...TIDE.boards].sort());
      for (const g of floods) expect(g.slots).toEqual(TIDE.rows.flatMap((r) => Array.from({ length: LANES }, (_, l) => r * LANES + l)));
      for (const c of b.combatants) {
        const front = TIDE.rows.includes(b.rowOf(c.slot));
        expect(c.statuses.some((s) => s.kind === TIDE.soak), `${c.uid} @${c.slot}`).toBe(front);
      }
    });

  it('Soaked: alınan ateş hasarı veri çarpanıyla, hız düşer, Burning söner; diğer elementler aynı', () => {
    const b = make(3, 'turns', teams);
    const wet = b.combatants.find((c) => c.statuses.some((s) => s.kind === TIDE.soak))!;
    const def = content.statuses[TIDE.soak]!;
    expect(b.statusElementMult(wet, 'fire')).toBe(def.elementTakenMult!.fire);
    expect(b.statusElementMult(wet, 'holy')).toBe(1);
    expect(b.damageTakenMult(wet, undefined, 'magic', null, 'fire') / b.damageTakenMult(wet, undefined, 'magic', null, 'ice')).toBeCloseTo(def.elementTakenMult!.fire!, 6);
    expect(b.statusMult(wet, 'speedMult')).toBeCloseTo(def.speedMult!, 6);
    expect(def.cleanses).toContain('burning');
  });

  it('su tahtadan tahtaya yenilenir: 2 tur sonra çekilir, her 4 turda bir yeniden basar', () => {
    const b = make(3, 'turns', teams);
    for (let n = 0; n < 400 && b.round < 1 + TIDE.everyRounds && !b.winner; n++) b.skipTurn();
    expect(b.winner).toBeNull();
    const rounds = ofType(b.log, 'round').map((e) => e.round);
    expect(rounds[0]).toBe(2);
    // round 1 + rounds'ta su çekildi, round 1 + everyRounds'ta yeniden bastı
    const idxOf = (r: number) => b.log.findIndex((e) => e.type === 'round' && e.round === r);
    const after = (r: number) => b.log.slice(idxOf(r), idxOf(r + 1) < 0 ? undefined : idxOf(r + 1));
    expect(ofType(after(1 + TIDE.rounds), 'groundEnd').length).toBeGreaterThanOrEqual(TIDE.boards.length);
    expect(ofType(after(1 + TIDE.everyRounds), 'ground').filter((g) => g.ground === TIDE.ground)).toHaveLength(TIDE.boards.length);
  });

  it('Flooded hücredeki Burning Ground söner (yalnızca ıslak hücreler)', () => {
    const b = make(3, 'turns', teams);
    // Burning ground: ön sıra + ikinci sıra; Tide yeniden basınca ön sıra hücreleri söner
    const g = { id: 'gx', ground: 'burning', board: 'enemy' as const, slots: [0, 1, 3], turns: 5, source: 'party-0', sourceSide: 'party' as const, amount: 5 };
    b.ground.push(g);
    (b as unknown as { applyEnvironment(e: (x: BattleEvent) => void): void }).applyEnvironment(() => {});
    const left = b.ground.find((x) => x.ground === 'burning');
    expect(left?.slots).toEqual([3]);
  });
});

describe('B3 Survive N Rounds', () => {
  const N = 2;
  for (const mode of MODES)
    it(`${mode}: N tur dolunca bölük kaçar (zafer), olaylar sayacı taşır`, () => {
      const b = make(7, mode, { ...BASE, rules: { objective: { type: 'survive', rounds: N } } });
      expect(b.objectiveProgress()).toEqual({ type: 'survive', current: 1, goal: undefined, target: N });
      if (mode === 'turns') passTurns(b, 200);
      else
        for (let n = 0; n < 200 && !b.winner; n++) {
          // test modu: herkes sırayla boş bir hücreye yürür (kimse ölmez)
          const living = b.combatants.filter((c) => c.hp > 0 && !c.inert);
          const u = living[n % living.length]!;
          b.useSkill(u.uid, 'move_tile', undefined, b.freeTiles(u.uid)[0]);
        }
      expect(b.winner).toBe('party');
      const obj = ofType(b.log, 'objective');
      expect(obj.at(-1)).toMatchObject({ objective: 'survive', state: 'done', current: N, goal: N });
      expect(b.log.at(-1)).toMatchObject({ type: 'battleEnd', winner: 'party' });
      expect(b.fighting('enemy').length).toBeGreaterThan(0); // kimse ölmeden kazanıldı
    });

  it('varsayılan tur sayısı veriden', () => {
    expect(content.resolveBattleRules({ objective: 'survive' })?.objective).toEqual({ type: 'survive', rounds: rulesJson.objectives.survive.rounds });
  });
});

describe('B3 Break the Totem', () => {
  const teams = (): Teams => ({
    party: BASE.party,
    enemies: cells({ 0: 'warrior', 7: 'iron_mooring' }),
    units: { enemies: { 7: { objective: true, displayName: 'Drowned Totem' } } },
    rules: { objective: { type: 'totem', every: 1, maxEnemies: 3 }, reinforce: { enemies: cells({ 1: 'cutthroat', 2: 'archer' }) } },
  });

  for (const mode of MODES)
    it(`${mode}: nesne dururken düşmanlar ölse de zafer yok; nesne kırılınca zafer`, () => {
      const b = make(11, mode, teams());
      const totem = b.objectiveUnits()[0]!;
      expect(totem.displayName).toBe('Drowned Totem');
      for (const c of b.fighting('enemy')) b.debugKill(c.uid);
      expect(b.winner).toBeNull();
      expect(b.objectiveProgress()).toMatchObject({ type: 'totem', current: 0, target: 1 });
      b.debugKill(totem.uid);
      expect(b.winner).toBe('party');
      expect(ofType(b.log, 'objective').at(-1)).toMatchObject({ objective: 'totem', state: 'done' });
    });

  it('nesne dururken her `every` turda takviye gelir (savaşan düşman maxEnemies kadar)', () => {
    const b = make(11, 'turns', teams());
    passTurns(b, 60);
    const r = ofType(b.log, 'reinforce');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.combatants.every((c) => c.side === 'enemy' && c.uid.startsWith('enemy-r'))).toBe(true);
    expect(b.fighting('enemy').length).toBeLessThanOrEqual(3);
  });

  it('nesne kırılınca takviye durur', () => {
    const b = make(11, 'turns', teams());
    b.debugKill(b.objectiveUnits()[0]!.uid);
    passTurns(b, 40);
    expect(ofType(b.log, 'reinforce')).toHaveLength(0);
  });
});

describe('B3 Hold the Bridge', () => {
  for (const mode of MODES)
    it(`${mode}: oyuncunun ön sırası boşalınca savaş kaybedilir`, () => {
      const b = make(13, mode, { ...BASE, rules: { objective: 'hold' } });
      const front = b.combatants.filter((c) => c.side === 'party' && b.rowOf(c.slot) === 0);
      expect(front.length).toBeGreaterThan(0);
      front.forEach((c, i) => {
        if (i < front.length - 1) b.debugKill(c.uid);
      });
      expect(b.winner).toBeNull();
      b.debugKill(front.at(-1)!.uid);
      expect(b.winner).toBe('enemy');
      expect(ofType(b.log, 'objective').at(-1)).toMatchObject({ objective: 'hold', state: 'failed' });
    });

  it('yapay zeka ön sıranın son savunanını sıradan çekmez (breaksHold süzgeci)', () => {
    const b = make(13, 'turns', { ...BASE, party: cells({ 1: 'mage', 4: 'archer' }), rules: { objective: 'hold' } });
    const mage = b.combatants.find((c) => c.side === 'party' && c.defId === 'mage')!;
    expect(b.breaksHold(mage.uid, 7)).toBe(true);
    expect(b.breaksHold(mage.uid, 0)).toBe(false);
    const archer = b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
    expect(b.breaksHold(archer.uid, 10)).toBe(false);
    // kuralsız savaşta hiçbir hamle "kırmaz"
    expect(make(13, 'turns', BASE).breaksHold('party-0', 9)).toBe(false);
  });

  it('ön sırası boş başlayan bölükte en öndeki birim öne geçer', () => {
    const b = make(13, 'turns', { ...BASE, party: cells({ 6: 'archer', 9: 'mage' }), rules: { objective: 'hold' } });
    const archer = b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
    expect(b.rowOf(archer.slot)).toBe(0);
    expect(b.objectiveProgress()).toMatchObject({ type: 'hold', current: 1 });
  });
});

describe('M-I kapalı hücre (güverte) / M-J crossing', () => {
  const blocked = rulesJson.layouts.deck.blocked;
  const teams: Teams = { party: cells({ 0: 'warrior', [blocked[0]!]: 'mage' }), enemies: cells({ 0: 'warrior', [blocked[1]!]: 'archer' }), rules: { blocked: 'deck' } };

  it('kapalı hücrede başlayan birim en yakın açık hücreye geçer; boş hücre listelerinde kapalı hücre yok', () => {
    const b = make(17, 'turns', teams);
    expect(b.rules?.layout).toBe('deck');
    for (const c of b.combatants) expect(blocked).not.toContain(c.slot);
    for (const side of ['party', 'enemy'] as const) for (const s of blocked) expect(b.freeSlots(side)).not.toContain(s);
    const actor = b.currentActor!;
    if (actor.side === 'party') for (const s of blocked) expect(b.freeTiles(actor.uid)).not.toContain(s);
  });

  for (const mode of MODES)
    it(`${mode}: tam savaşta kimse kapalı hücreye girmez`, () => {
      const b = make(19, mode, { ...BASE, rules: { blocked: 'deck', condition: 'tide' } });
      playOut(b);
      for (const c of b.combatants) if (c.hp > 0) expect(blocked).not.toContain(c.slot);
    });
});
