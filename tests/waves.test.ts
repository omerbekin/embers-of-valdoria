import { describe, expect, it } from 'vitest';
import { Battle, battleSummary, chooseAction, content } from '../src/engine';
import { DEFAULT_WAVE_RULES } from '../src/engine/battle';
import type { BattleEvent, BattleMode, GroundEffect, Teams, WaveRules } from '../src/engine';
import wavesJson from '../data/waves.json';

/**
 * Dalgalı savaş (Ömer 2026-10-19, docs/design/waves.md): BattleSetup.waves = sonraki dalgalar. Mevcut dalganın tüm savaşan düşmanları düşünce sıradaki
 * dalga dizilir; kahramanların durumu sürer; önceki dalganın cesetleri / düşman zemin etkileri temizlenir; savaş ancak son dalga bitince kazanılır.
 * Dalga verilmezse savaş birebir eskisi. Kurallar data/waves.json'dan.
 */
const BATTLE = 'random-battle';
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

const BASE: Teams = {
  party: cells({ 0: 'warrior', 1: 'defender', 3: 'undead', 6: 'paladin' }),
  enemies: cells({ 0: 'warrior', 2: 'cutthroat' }),
};
const WAVE2 = { enemies: cells({ 0: 'paladin', 1: 'defender', 4: 'mage' }) };
const WAVE3 = { enemies: cells({ 1: 'archer' }) };

const make = (seed: number, mode: BattleMode, teams: Teams, rules?: Partial<WaveRules>): Battle => {
  const setup = content.battleSetup(BATTLE, seed, mode, teams, false);
  if (rules && setup.waveRules) setup.waveRules = { ...setup.waveRules, ...rules };
  return new Battle(setup);
};

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

const killSide = (b: Battle) => {
  for (const c of b.combatants.filter((x) => x.side === 'enemy' && x.hp > 0 && !x.inert)) b.debugKill(c.uid);
};

describe('dalgasız savaş birebir aynı', () => {
  for (const mode of MODES)
    it(`${mode}: waves yok / boş = aynı kurulum ve aynı olaylar`, () => {
      for (const seed of [1, 9, 33]) {
        const plain = content.battleSetup(BATTLE, seed, mode, BASE, false);
        expect(plain.waves).toBeUndefined();
        expect(plain.waveRules).toBeUndefined();
        const empty = content.battleSetup(BATTLE, seed, mode, { ...BASE, waves: [{ enemies: cells({}) }] }, false);
        expect(empty.waves).toBeUndefined();
        const a = playOut(new Battle(plain));
        expect(playOut(new Battle(empty))).toEqual(a);
        expect(a.some((e) => e.type === 'waveStart' || e.type === 'waveCleared')).toBe(false);
        expect(new Battle(plain).waveCount).toBe(1);
      }
    });

  it('motorun varsayılan kuralları data/waves.json ile aynı', () => {
    expect(DEFAULT_WAVE_RULES).toEqual(wavesJson.rules);
    expect(content.battleSetup(BATTLE, 1, 'turns', { ...BASE, waves: [WAVE2] }, false).waveRules).toEqual(wavesJson.rules);
  });
});

describe('dalga geçişi', () => {
  for (const mode of MODES)
    it(`${mode}: son düşman düşünce waveCleared + waveStart; savaş sürer, eski cesetler kalkar`, () => {
      const b = make(3, mode, { ...BASE, waves: [WAVE2, WAVE3] });
      expect(b.waveCount).toBe(3);
      expect(b.waveIndex).toBe(0);
      expect(ofType(b.log, 'waveStart')[0]).toMatchObject({ index: 0, total: 3, combatants: [] });
      expect(b.upcomingWaves().map((w) => w.map((d) => d.id))).toEqual([['paladin', 'defender', 'mage'], ['archer']]);
      killSide(b);
      expect(b.winner).toBeNull();
      expect(b.waveIndex).toBe(1);
      const cleared = ofType(b.log, 'waveCleared');
      expect(cleared).toEqual([{ type: 'waveCleared', index: 0, total: 3 }]);
      const ws = ofType(b.log, 'waveStart')[1]!;
      expect(ws.index).toBe(1);
      expect(ws.combatants.map((c) => [c.uid, c.defId, c.slot])).toEqual([
        ['enemy-w2-0', 'paladin', 0],
        ['enemy-w2-1', 'defender', 1],
        ['enemy-w2-2', 'mage', 4],
      ]);
      expect(ws.removed).toEqual(['enemy-0', 'enemy-1']);
      expect(b.log.indexOf(cleared[0]!)).toBeLessThan(b.log.indexOf(ws));
      expect(b.get('enemy-0')!.removed).toBe(true);
      expect(b.corpses('enemy')).toEqual([]);
      expect(b.corpseOf('enemy-0')).toBeNull();
      expect(b.living('enemy').map((c) => c.wave)).toEqual([1, 1, 1]);
      if (mode === 'turns') {
        expect(ws.queue.length).toBeGreaterThan(0);
        expect(ws.queue.some((u) => u.startsWith('enemy-w2-'))).toBe(true);
        expect(b.turnQueue().some((u) => u.startsWith('enemy-w2-'))).toBe(true);
      } else expect(ws.queue).toEqual([]);
      killSide(b);
      expect(b.waveIndex).toBe(2);
      expect(b.winner).toBeNull();
      killSide(b);
      expect(b.winner).toBe('party');
      expect(ofType(b.log, 'waveCleared').map((e) => e.index)).toEqual([0, 1, 2]);
      const end = b.log.findIndex((e) => e.type === 'battleEnd');
      expect(b.log.findIndex((e) => e.type === 'waveCleared' && e.index === 2)).toBeLessThan(end);
      // özet: her dalganın düşmanı sayılır (XP / öldürme)
      const sum = battleSummary(b);
      expect(sum.units.filter((u) => u.side === 'enemy' && !u.alive).length).toBe(2 + 3 + 1);
    });

  it('kahramanların can / MP / Rage / cooldown / durumları sürer (varsayılan: dalga arası yenilenme yok)', () => {
    const b = make(5, 'turns', { ...BASE, waves: [WAVE2] });
    const w = b.get('party-0')!;
    b.debugSetResource('party-0', 'hp', 37);
    b.debugSetResource('party-0', 'mp', 3);
    b.debugSetResource('party-0', 'rage', 11);
    b.debugAddStatus('party-0', 'haste', 4);
    w.cooldowns['whirlwind'] = 2;
    killSide(b);
    expect(b.waveIndex).toBe(1);
    expect(w.hp).toBe(37);
    expect(w.mp).toBe(3);
    expect(w.rage).toBe(11);
    expect(w.cooldowns['whirlwind']).toBe(2);
    expect(w.statuses.find((s) => s.kind === 'haste')?.turns).toBe(4);
  });

  it('dalga arası yenilenme oranı (healRatio / mpRatio) veriden', () => {
    const b = make(5, 'test', { ...BASE, waves: [WAVE2] }, { healRatio: 0.25, mpRatio: 0.5 });
    const p = b.get('party-1')!;
    b.debugSetResource('party-1', 'hp', 10);
    b.debugSetResource('party-1', 'mp', 0);
    killSide(b);
    expect(p.hp).toBe(Math.min(p.maxHp, 10 + Math.round(p.maxHp * 0.25)));
    expect(p.mp).toBe(Math.round(p.maxMp * 0.5));
    expect(ofType(b.log, 'heal').some((e) => e.target === 'party-1' && e.cause === 'wave')).toBe(true);
    expect(ofType(b.log, 'mpRegen').some((e) => e.actor === 'party-1' && e.cause === 'wave')).toBe(true);
  });

  it("turnOrder 'reset': yeni dalgada herkesin sıra sayacı sıfırlanır; 'keep': kahraman sayacı korunur", () => {
    const reset = make(8, 'turns', { ...BASE, waves: [WAVE2] });
    reset.get('party-0')!.turnCounter = 55;
    killSide(reset);
    expect(reset.living('party').every((c) => c.turnCounter === 0)).toBe(true);
    const keep = make(8, 'turns', { ...BASE, waves: [WAVE2] }, { turnOrder: 'keep' });
    keep.get('party-0')!.turnCounter = 55;
    killSide(keep);
    expect(keep.get('party-0')!.turnCounter).toBe(55);
    expect(keep.living('enemy').every((c) => c.turnCounter === 0)).toBe(true);
  });

  it("yeni dalganın ultimate'ı başlangıç cooldown'uyla gelir (turns)", () => {
    const b = make(2, 'turns', { ...BASE, waves: [WAVE2] });
    killSide(b);
    const mage = b.get('enemy-w2-2')!;
    const ult = mage.skills[mage.skills.length - 1]!;
    expect(mage.cooldowns[ult] ?? 0).toBeGreaterThan(0);
  });

  it('dalga birim kurulumları (güçlendirme, özel ad, rütbe) uygulanır', () => {
    const b = make(2, 'test', { ...BASE, waves: [{ enemies: cells({ 0: 'paladin' }), units: { 0: { modifiers: { hpMult: 2 }, displayName: 'Wave Captain', tier: 'elite' } } }] });
    killSide(b);
    const cap = b.get('enemy-w2-0')!;
    expect(cap.displayName).toBe('Wave Captain');
    expect(cap.tier).toBe('elite');
    expect(cap.maxHp).toBe(Math.round(content.classes.paladin!.stats.hp * 2));
  });
  it("boss dalgası: faz 1 ve bağlı yardımcı rozeti (Bridge Warden + Iron Mooring) yeni dalgada kurulur", () => {
    const b = make(2, 'turns', { ...BASE, waves: [{ enemies: cells({ 1: 'bridge_warden', 0: 'iron_mooring', 2: 'iron_mooring' }) }] });
    killSide(b);
    const boss = b.combatants.find((c) => c.defId === 'bridge_warden')!;
    expect(boss.phase).toBe(1);
    expect(boss.statuses.find((s) => s.kind === 'anchored')?.stacks).toBe(2);
    // yardımcılar (inert) savaşın bitişinde sayılmaz: boss düşünce savaş biter
    b.debugKill(boss.uid);
    expect(b.winner).toBe('party');
  });
});

describe('kazanma / kaybetme', () => {
  it('zayıf dalgalar: oyuncu ancak son dalgayı bitirince kazanır (YZ ile, turns)', () => {
    const weak = { 0: { startHpRatio: 0.05 }, 1: { startHpRatio: 0.05 }, 2: { startHpRatio: 0.05 }, 4: { startHpRatio: 0.05 } };
    const b = make(4, 'turns', { ...BASE, units: { enemies: weak }, waves: [{ ...WAVE2, units: weak }, { ...WAVE3, units: weak }] });
    const log = playOut(b);
    expect(b.winner).toBe('party');
    expect(ofType(log, 'waveStart').map((e) => e.index)).toEqual([0, 1, 2]);
    const firstEnd = log.findIndex((e) => e.type === 'battleEnd');
    expect(ofType(log, 'battleEnd')).toHaveLength(1);
    expect(log.findIndex((e) => e.type === 'waveStart' && e.index === 2)).toBeLessThan(firstEnd);
  });

  it('güçlü ikinci dalga: oyuncu dalga 2de kaybeder', () => {
    const big = { modifiers: { hpMult: 6, powerMult: 6 } };
    const b = make(4, 'turns', {
      ...BASE,
      units: { enemies: { 0: { startHpRatio: 0.05 }, 2: { startHpRatio: 0.05 } } },
      waves: [{ enemies: cells({ 0: 'warrior', 1: 'defender', 3: 'mage', 4: 'archer' }), units: { 0: big, 1: big, 3: big, 4: big } }, WAVE3],
    });
    playOut(b);
    expect(b.winner).toBe('enemy');
    expect(b.waveIndex).toBe(1);
  });

  it('düşman dalgası ve oyuncu tarafı aynı anda biterse (sonraki dalga varken) düşman kazanır', () => {
    const b = make(4, 'test', { ...BASE, waves: [WAVE2] });
    for (const c of b.combatants.filter((x) => x.side === 'party')) b.debugKill(c.uid, false);
    killSide(b);
    expect(b.winner).toBe('enemy');
    expect(b.waveIndex).toBe(0);
  });
});

describe('determinizm', () => {
  for (const mode of MODES)
    it(`${mode}: aynı seed + aynı dalgalar = aynı savaş`, () => {
      const teams: Teams = { ...BASE, units: { enemies: { 0: { startHpRatio: 0.2 }, 2: { startHpRatio: 0.2 } } }, waves: [WAVE2, WAVE3] };
      for (const seed of [11, 12]) {
        const a = playOut(make(seed, mode, teams));
        const b = playOut(make(seed, mode, teams));
        expect(b).toEqual(a);
        expect(a.some((e) => e.type === 'waveStart' && e.index > 0) || a.some((e) => e.type === 'battleEnd')).toBe(true);
      }
    });
});

describe('çağrılar ve cesetlerle çakışma', () => {
  it('oyuncunun çağrıları sonraki dalgaya taşınır', () => {
    const b = make(6, 'test', { party: cells({ 0: 'warrior', 3: 'undead', 1: 'skeleton' }), enemies: cells({ 0: 'archer' }), waves: [WAVE2] });
    const sk = b.combatants.find((c) => c.side === 'party' && c.defId === 'skeleton')!;
    killSide(b);
    expect(b.waveIndex).toBe(1);
    expect(sk.hp).toBeGreaterThan(0);
    expect(sk.removed).toBeUndefined();
  });

  it('düşmanın sahipsiz hazır çağrısı da düşmeden dalga bitmez; sahipli çağrı sahibiyle ölür', () => {
    const b = make(6, 'test', { ...BASE, enemies: cells({ 0: 'skeleton', 4: 'undead' }), waves: [WAVE2] });
    b.freeMp = true;
    const undead = b.combatants.find((c) => c.side === 'enemy' && c.defId === 'undead')!;
    const pre = b.combatants.find((c) => c.side === 'enemy' && c.defId === 'skeleton')!;
    const r = b.useSkill(undead.uid, 'raise_dead', undefined, b.summonSlotFor(undead.uid, 'raise_dead')!);
    expect(r.ok).toBe(true);
    const raised = b.combatants.find((c) => c.side === 'enemy' && c.owner === undead.uid)!;
    b.debugKill(undead.uid);
    expect(raised.hp).toBe(0);
    expect(b.waveIndex).toBe(0); // hazır (sahipsiz) iskelet hâlâ savaşıyor
    b.debugKill(pre.uid);
    expect(b.waveIndex).toBe(1);
    expect(raised.removed).toBe(true);
  });

  it('Raise Dead önceki dalganın cesedini tüketemez; düşman diriltici eski dalgayı kaldıramaz', () => {
    const b = make(6, 'test', { ...BASE, waves: [{ enemies: cells({ 0: 'paladin', 1: 'warrior' }) }] });
    b.freeMp = true;
    killSide(b);
    expect(b.corpseChoices('party-2', 'raise_dead')).toEqual([]);
    const sk = b.summonPreview('party-2', 'raise_dead');
    expect(sk.corpse).toBeNull();
    // yeni dalganın paladin'i: dalga 1'in ölüleri diriltilemez; kendi dalgasının ölüsü diriltilebilir
    expect(b.reviveBlockReason('enemy-w2-0', 'enemy-0')).toBe('Not a fallen ally');
    expect(b.validTargets('enemy-w2-0', 'resurrection').map((c) => c.uid)).toEqual([]);
    b.debugKill('enemy-w2-1');
    expect(b.validTargets('enemy-w2-0', 'resurrection').map((c) => c.uid)).toEqual(['enemy-w2-1']);
    expect(b.debugRevive('enemy-0')).toEqual({ ok: false, reason: 'Unit left the battle' });
  });

  it('clearCorpses false: eski dalganın cesetleri kalır (yeni birim cesedin üstüne dizilir)', () => {
    const b = make(6, 'test', { ...BASE, waves: [WAVE2] }, { clearCorpses: false });
    killSide(b);
    expect(b.corpses('enemy').map((c) => c.uid)).toEqual(['enemy-0', 'enemy-1']);
    expect(ofType(b.log, 'waveStart')[1]!.removed).toEqual([]);
    expect(b.get('enemy-w2-0')!.slot).toBe(0);
  });

  it('düşman tahtasındaki / düşmanın bıraktığı zemin etkileri silinir, oyuncu tahtasındaki oyuncu zemini kalır', () => {
    const b = make(6, 'test', { ...BASE, waves: [WAVE2] });
    const g = (id: string, board: 'party' | 'enemy', source: string, sourceSide: 'party' | 'enemy'): GroundEffect => ({ id, ground: Object.keys(content.grounds)[0]!, board, slots: [0], turns: 3, source, sourceSide, amount: 5, scale: 'int', sourceStat: 10, power: 1 });
    b.ground.push(g('gx1', 'enemy', 'party-0', 'party'), g('gx2', 'party', 'enemy-0', 'enemy'), g('gx3', 'party', 'party-0', 'party'));
    killSide(b);
    expect(b.ground.map((x) => x.id)).toEqual(['gx3']);
    expect(ofType(b.log, 'groundEnd').map((e) => e.id)).toEqual(['gx1', 'gx2']);
  });

  it('yuva doluysa (canlı yardımcı nesne) yeni birim en yakın boş yuvaya gelir', () => {
    const b = make(6, 'test', { ...BASE, enemies: cells({ 2: 'warrior' }), waves: [{ enemies: cells({ 0: 'paladin' }) }] });
    // yuva 0'da sıra almayan canlı yardımcı nesne (inert): savaşın bitişinde sayılmaz ama yuvayı tutar
    b.combatants.push({ ...b.get('enemy-0')!, uid: 'inert-x', slot: 0, inert: true, statuses: [], cooldowns: {} });
    killSide(b);
    expect(b.waveIndex).toBe(1);
    expect(b.get('enemy-w2-0')!.slot).toBe(1);
  });
});

describe('maç kaydı', () => {
  it('dalga olayları maç kaydında okunur satır verir', async () => {
    const { describeEvent } = await import('../src/engine/match-log');
    const b = make(3, 'test', { ...BASE, waves: [WAVE2] });
    killSide(b);
    const lines = b.log.filter((e) => e.type === 'waveStart' || e.type === 'waveCleared').map((e) => describeEvent(b, e));
    expect(lines).toEqual(['WAVE 1/2', 'WAVE 1/2 CLEARED', expect.stringMatching(/^WAVE 2\/2 ARRIVES: /)]);
  });
});
