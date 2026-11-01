// Harita 3 savaş koşulları, 1. dilim (maps-2-3.md M-F, M-G, M-H; veri data/battle-rules.json): Heat, Cave-in, Darkness + Lantern. Sayılar veriden okunur.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { CaveInRule, Combatant, Side, Teams } from '../src/engine';
import encounters from '../data/campaign/hollow-crown-encounters.json';

const R = content.battleRulesData;
const heatRule = R.conditions['heat']!.heat!;
const dark = R.conditions['darkness']!.darkness!;
const cave = R.hazards['cave_in']!;

const empty = (): string[] => Array.from({ length: content.CELL_COUNT }, () => '');
const cells = (at: Record<number, string>): string[] => {
  const out = empty();
  for (const [k, v] of Object.entries(at)) out[Number(k)] = v;
  return out;
};

function make(rules: Teams['rules'], party: Record<number, string>, enemies: Record<number, string>, mode: 'turns' | 'test' = 'turns', seed = 7): Battle {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), rules };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
}

/** Sırayı dolaştırır: her birim pas geçer (Skip), `until` doğru olana kadar. */
function spin(b: Battle, until: () => boolean, max = 200): void {
  for (let i = 0; i < max && !until() && !b.winner; i++) if (!b.skipTurn().ok) return;
}

const of = (b: Battle, side: Side): Combatant[] => b.combatants.filter((c) => c.side === side && c.hp > 0);
const P = { 0: 'warrior', 1: 'druid', 3: 'archer', 4: 'mage' };
const E = { 0: 'drowned', 2: 'drowned', 6: 'fen_witchling', 8: 'will_o_wisp' };

describe('kuralsız savaş', () => {
  it('tehlike yok, Lantern yok, karanlık yok', () => {
    const b = make(undefined, P, E);
    expect(b.hazards).toEqual([]);
    expect(b.isDark()).toBe(false);
    expect(b.combatants.some((c) => c.lightSource)).toBe(false);
  });
});

describe('M-H Heat', () => {
  it('savaş başında bir sıra işaretli; sonraki Round o sıra veri süresince Burning, içindeki yanar, Round bitince söner', () => {
    const b = make({ condition: 'heat' }, P, E);
    expect(b.hazards).toHaveLength(1);
    const h = b.hazards[0]!;
    expect(h.kind).toBe('heat');
    expect(h.cells.length).toBe(content.formulas.formation.lanes);
    expect(b.ground).toHaveLength(0);
    spin(b, () => b.round === 2);
    const g = b.ground.find((x) => x.ground === heatRule.ground && x.board === h.board);
    expect(g?.slots).toEqual(h.cells);
    expect(g?.source).toBe('env');
    expect(g?.amount).toBeGreaterThan(0);
    const inside = of(b, h.board).filter((c) => h.cells.includes(c.slot));
    expect(inside.length).toBeGreaterThan(0); // aimAtUnits
    for (const c of inside) expect(c.statuses.some((s) => s.kind === 'burning' && s.fromGround)).toBe(true);
    const from = g!.envUntilRound!;
    expect(from).toBe(2 + heatRule.rounds);
    spin(b, () => b.round === from);
    expect(b.ground.some((x) => x.id === g!.id)).toBe(false);
  });

  it('aynı seed aynı sıra; farklı seed zamanla farklı', () => {
    const rows = (seed: number) => make({ condition: 'heat' }, P, E, 'turns', seed).hazards[0]!;
    expect(rows(5)).toEqual(rows(5));
    const seen = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => JSON.stringify(rows(s))));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('Heat savaşında Chilled tutmaz', () => {
    const b = make({ condition: 'heat' }, P, E);
    const c = of(b, 'party')[0]!;
    b.debugAddStatus(c.uid, 'chilled', 2);
    expect(c.statuses.some((s) => s.kind === 'chilled')).toBe(false);
    expect(b.statusBlocked(c, 'chilled')).toBe(true);
  });

  it('test modunda da işler', () => {
    const b = make({ condition: 'heat' }, P, E, 'test');
    expect(b.hazards).toHaveLength(1);
    let i = 0;
    for (let n = 0; n < 60 && b.round < 2 && !b.winner; n++) {
      const living = b.combatants.filter((c) => c.hp > 0 && !c.inert);
      const uid = living[i++ % living.length]!.uid;
      b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
    }
    expect(b.round).toBeGreaterThanOrEqual(2);
    expect(b.ground.some((g) => g.source === 'env')).toBe(true);
  });
});

describe('M-G Cave-in', () => {
  it('işaretli hücre sonraki Round çöker: birim hasar + durum alır, başka hücreye atılır; hücre kapalı (iki tahtada ritim veriden)', () => {
    const b = make({ caveIn: 'cave_in' }, P, E);
    expect(b.hazards.map((h) => h.board).sort()).toEqual([...cave.boards].sort());
    const h = b.hazards.find((x) => x.board === 'party')!;
    expect(h.cells).toHaveLength(cave.cells);
    const slot = h.cells[0]!;
    const v = of(b, 'party').find((c) => c.slot === slot)!;
    expect(v).toBeTruthy(); // aimAtUnits
    const hp0 = v.hp;
    expect(b.hazardThreat(v)).toBeGreaterThan(0);
    spin(b, () => b.round === 2);
    expect(v.hp).toBeLessThan(hp0);
    expect(v.slot).not.toBe(slot);
    expect(v.statuses.some((s) => s.kind === cave.status)).toBe(true);
    expect(b.closedCells.party).toContain(slot);
    expect(b.isBlocked(slot, 'party')).toBe(true);
    expect(b.freeSlots('party')).not.toContain(slot);
    expect(b.log.some((e) => e.type === 'cellsClosed' && e.board === 'party')).toBe(true);
  });

  it('kapalı hücreye kimse Move ile giremez; kapanan hücre yalnızca o tahtada', () => {
    const b = make({ caveIn: 'cave_in' }, P, E);
    const h = b.hazards.find((x) => x.board === 'party')!;
    spin(b, () => b.round === 2);
    const uid = b.currentUid!;
    if (b.get(uid)!.side === 'party') expect(b.freeTiles(uid)).not.toContain(h.cells[0]);
    const onlyEnemyClosed = b.closedCells.enemy.filter((s) => !b.closedCells.party.includes(s));
    for (const s of onlyEnemyClosed) expect(b.isBlocked(s, 'party')).toBe(false);
  });

  it('warnCaveIn tek kanca: dışarıdan verilen hücre ve parametre (boss ultu yolu)', () => {
    const b = make({ condition: 'darkness' }, P, E);
    expect(b.hazards).toHaveLength(0);
    b.debugCaveIn('party', [11], { ...cave, id: 'boss_test', damageRatio: 0.5 } as CaveInRule);
    expect(b.hazards[0]?.caveIn?.damageRatio).toBe(0.5);
    spin(b, () => b.round === 2);
    expect(b.closedCells.party).toEqual([11]);
  });

  it('kapalı hücre sınırı aşılmaz', () => {
    const b = make({ caveIn: 'cave_in_heavy' }, P, E);
    const lim = R.hazards['cave_in_heavy']!.maxClosed;
    spin(b, () => b.round >= 20, 200);
    expect(b.closedCells.party.length).toBeLessThanOrEqual(lim);
    expect(b.closedCells.enemy.length).toBeLessThanOrEqual(lim);
  });

  it('çöküş son birimi öldürürse savaş biter', () => {
    const b = make({ caveIn: 'cave_in' }, { 0: 'warrior' }, E);
    const c = of(b, 'party')[0]!;
    const h = b.hazards.find((x) => x.board === 'party')!;
    expect(h.cells).toContain(c.slot);
    c.hp = 1;
    c.shield = 0;
    spin(b, () => !!b.winner, 30);
    expect(b.winner).toBe('enemy');
    expect(b.log.filter((e) => e.type === 'battleEnd')).toHaveLength(1);
  });

  it('yapay zeka: işaretli hücredeki birim, hamlesi zayıfken kaçar', () => {
    const b = make({ caveIn: 'cave_in_heavy' }, { 0: 'warrior', 1: 'druid' }, { 0: 'drowned' });
    const uid = b.currentUid!;
    const me = b.get(uid)!;
    b.hazards.length = 0;
    b.debugCaveIn(me.board, [me.slot], { ...cave, id: 'big', damageRatio: 5 });
    me.mp = 0;
    const choice = chooseAction(b, uid, content.aiConfig);
    expect(choice?.skillId).toBe('move_tile');
    expect(choice?.slot).not.toBe(me.slot);
  });
});

describe('M-F Darkness + Lantern', () => {
  const rear = (b: Battle) => of(b, 'enemy').find((c) => b.rowOf(c.slot) > b.frontOccupiedRow('enemy') + dark.depth)!;
  const attack = (b: Battle, uid: string) => b.get(uid)!.skills.find((id) => b.skill(id, uid)?.target === 'single_enemy')!;

  it('kahraman arka sırayı seçemez, ön + 1 arkası seçilebilir; mob kısıtsız', () => {
    const b = make({ condition: 'darkness' }, { 0: 'archer', 3: 'mage' }, { 0: 'drowned', 3: 'drowned', 6: 'fen_witchling' });
    expect(b.isDark()).toBe(true);
    const hero = of(b, 'party').find((c) => c.defId === 'archer')!;
    const sk = attack(b, hero.uid);
    const far = rear(b);
    expect(far).toBeTruthy();
    expect(b.darkBlocks(hero, b.skill(sk, hero.uid)!, far.board, far.slot)).toBe(true);
    expect(b.validTargets(hero.uid, sk).some((c) => c.uid === far.uid)).toBe(false);
    expect(b.targetProblem(hero.uid, sk, far.uid)).toBe('Too dark to see');
    const mob = of(b, 'enemy')[0]!;
    const foe = of(b, 'party')[0]!;
    const anySkill = b.skill(mob.skills[0]!, mob.uid)!;
    expect(b.darkBlocks(mob, anySkill, foe.board, 11)).toBe(false);
  });

  it('ateş skill i herhangi bir taraftan aydınlatır (fireRounds), sonra karanlık döner', () => {
    const b = make({ condition: 'darkness' }, { 0: 'mage', 3: 'archer' }, { 0: 'drowned', 3: 'drowned', 6: 'fen_witchling' }, 'turns', 3);
    spin(b, () => b.get(b.currentUid!)?.defId === 'mage');
    const uid = b.currentUid!;
    const fire = b.get(uid)!.skills.find((id) => b.isFireSkill(b.skill(id, uid)!) && b.canUse(uid, id).ok);
    expect(fire).toBeTruthy();
    const sk = b.skill(fire!, uid)!;
    const tgt = sk.target === 'single_enemy' ? b.validTargets(uid, fire!)[0]!.uid : undefined;
    const anchor = sk.target !== 'single_enemy' ? b.shapeAnchors(uid, fire!)[0] : undefined;
    const round0 = b.round;
    const r = b.useSkill(uid, fire!, tgt, anchor);
    expect(r.ok).toBe(true);
    expect(b.isDark()).toBe(false);
    expect(b.log.some((e) => e.type === 'light' && e.lit)).toBe(true);
    spin(b, () => b.round >= round0 + dark.fireRounds);
    if (!b.winner) {
      expect(b.isDark()).toBe(true);
      expect(b.log.some((e) => e.type === 'light' && !e.lit)).toBe(true);
    }
  });

  it('aydınlat kancası (Thunderflash yolu)', () => {
    const b = make({ condition: 'darkness' }, P, E);
    b.debugLightUp(3);
    expect(b.isDark()).toBe(false);
    expect(b.litRoundsLeft()).toBe(3);
  });

  it('Lantern: oyuncu tarafında inert, sıra almaz; ayaktayken aydınlık, kırılınca karanlık; savaş sonucunu etkilemez', () => {
    const b = make({ condition: 'darkness', lantern: 'lantern' }, P, E);
    const l = b.combatants.find((c) => c.lightSource)!;
    expect(l.side).toBe('party');
    expect(l.inert).toBe(true);
    expect(b.turnQueue()).not.toContain(l.uid);
    expect(b.isDark()).toBe(false);
    const heroes = of(b, 'party').filter((c) => !c.inert);
    const mean = heroes.reduce((t, c) => t + c.maxHp, 0) / heroes.length;
    expect(l.maxHp).toBe(Math.round(mean * R.lanterns['lantern']!.hpRatio));
  });

  it('Lantern kırılınca light olayı (lantern_broken) ve kısıt geri gelir', () => {
    const b = make({ condition: 'darkness', lantern: 'lantern' }, { 0: 'archer' }, { 0: 'drowned', 3: 'drowned', 6: 'fen_witchling' });
    const l = b.combatants.find((c) => c.lightSource)!;
    expect(b.isDark()).toBe(false);
    expect(b.debugKill(l.uid).ok).toBe(true);
    expect(l.hp).toBe(0);
    expect(b.isDark()).toBe(true);
    expect(b.log.some((e) => e.type === 'light' && e.cause === 'lantern_broken')).toBe(true);
  });

  it('kahraman takımı ölünce Lantern savaşı sürdürmez', () => {
    const b = make({ condition: 'darkness', lantern: 'lantern' }, { 0: 'warrior' }, E);
    expect(b.fighting('party').map((c) => c.defId)).not.toContain('lantern');
  });

  const withDark = (fireLight: number, lanternBreak: number) => ({ ...content.aiConfig, value: { ...content.aiConfig.value, darkness: { fireLight, lanternBreak } } }) as typeof content.aiConfig;

  it('yapay zeka: veride değer var; kahraman saklı düşmanı hedef seçmez', () => {
    expect(content.aiConfig.value?.darkness?.fireLight).toBeGreaterThan(0);
    expect(content.aiConfig.value?.darkness?.lanternBreak).toBeGreaterThan(0);
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const b = make({ condition: 'darkness' }, { 0: 'archer' }, { 0: 'drowned', 9: 'fen_witchling' }, 'turns', seed);
      spin(b, () => b.get(b.currentUid!)?.defId === 'archer');
      const choice = chooseAction(b, b.currentUid!, content.aiConfig);
      expect(choice).toBeTruthy();
      if (choice?.targetUid) expect(b.get(choice.targetUid)?.defId).not.toBe('fen_witchling');
    }
  });

  it('yapay zeka: saklı düşman varken kahraman ateşe yönelir, karanlıkta saklanan taraf ateşten kaçınır', () => {
    const hero = make({ condition: 'darkness' }, { 0: 'mage' }, { 0: 'drowned', 9: 'fen_witchling' }, 'turns', 11);
    spin(hero, () => hero.get(hero.currentUid!)?.defId === 'mage');
    const pick = chooseAction(hero, hero.currentUid!, withDark(100, 0));
    expect(hero.isFireSkill(hero.skill(pick!.skillId!, hero.currentUid!)!)).toBe(true);
    const foe = make({ condition: 'darkness' }, { 0: 'warrior' }, { 0: 'drowned', 9: 'mage' }, 'turns', 11);
    spin(foe, () => foe.get(foe.currentUid!)?.defId === 'mage');
    const pick2 = chooseAction(foe, foe.currentUid!, withDark(100, 0));
    if (pick2?.skillId && foe.skill(pick2.skillId, foe.currentUid!)) expect(foe.isFireSkill(foe.skill(pick2.skillId, foe.currentUid!)!)).toBe(false);
  });

  it('yapay zeka: düşman Lantern kırmanın değerini görür', () => {
    const b = make({ condition: 'darkness', lantern: 'lantern' }, { 0: 'warrior', 3: 'archer' }, { 0: 'corsair_slinger' });
    spin(b, () => b.get(b.currentUid!)?.side === 'enemy');
    const uid = b.currentUid!;
    const pick = chooseAction(b, uid, withDark(0, 100));
    expect(b.get(pick!.targetUid!)?.lightSource).toBe(true);
  });

  it('Lantern varken düşman yapay zekası nesneyi hedefleyebilir (geçerli hedef)', () => {
    const b = make({ condition: 'darkness', lantern: 'lantern' }, { 0: 'warrior', 3: 'archer' }, { 0: 'corsair_slinger' });
    const mob = of(b, 'enemy')[0]!;
    const sk = mob.skills.find((id) => b.skill(id, mob.uid)?.target === 'single_enemy')!;
    expect(b.validTargets(mob.uid, sk).some((c) => c.lightSource)).toBe(true);
  });
});

describe('Harita 3 karşılaşma bağları (belge 4.2)', () => {
  const E2 = encounters as unknown as Record<string, { condition?: string; caveIn?: string; lantern?: string }>;
  it('Heat, Darkness, Cave-in düğümleri bağlı', () => {
    expect(E2.hc_58?.condition).toBe('heat');
    expect(E2.hc_81?.condition).toBe('heat');
    expect(E2.hc_32?.condition).toBe('darkness');
    expect(E2.hc_43?.lantern).toBe('lantern');
    expect(E2.hc_hollow_king?.condition).toBe('darkness');
    expect(E2.hc_9?.caveIn).toBe('cave_in');
    expect(E2.hc_36?.caveIn).toBe('cave_in_heavy');
    expect(E2.hc_53?.caveIn).toBe('cave_in_heavy');
  });
  it('tüm kural girdileri çözülür', () => {
    for (const [k, def] of Object.entries(E2)) {
      if (k === '_not') continue;
      expect(() => content.resolveBattleRules({ ...(def.condition ? { condition: def.condition } : {}), ...(def.caveIn ? { caveIn: def.caveIn } : {}), ...(def.lantern ? { lantern: def.lantern } : {}) })).not.toThrow();
    }
  });
});
