import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, BattleMode, Teams } from '../src/engine';
import { stateHash } from '../src/net/state-hash';
import rules from '../data/battle-rules.json';
import { firstFireArticle } from '../src/wiki/catalog';

/**
 * The First Fire's Verdict (Ömer 2026-11-21, form r40 + r41): hamle sayacı afterMoves'u geçince her tur sonunda vuruş çifti (önce seed'le seçilen
 * takımdan, sonra öbüründen rastgele yaşayan birim), hasar damage'den başlar ve her çiftten sonra +damageStep; saf hasar. Tetikten warnFirst ve
 * warnFinal hamle önce iki ayrı uyarı olayı. Tur = en yavaş yaşayan birimin TEMEL hızıyla bir sıra turu (test modunda yaşayan birim sayısı kadar eylem).
 * Sayılar data/battle-rules.json > firstFire'dan okunur.
 */
const R = rules.firstFire;
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const BASE: Teams = { party: cells({ 0: 'warrior', 1: 'defender', 3: 'mage' }), enemies: cells({ 0: 'warrior', 2: 'cutthroat', 4: 'archer' }) };
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;

function make(mode: BattleMode, seed = 7, opts: { rule?: boolean; draw?: boolean } = {}): Battle {
  const setup = content.battleSetup('random-battle', seed, mode, BASE, false);
  const s = { ...setup, ...(opts.draw ? { drawOnMutualEnd: true } : {}) };
  if (opts.rule === false) delete (s as { firstFire?: unknown }).firstFire;
  return new Battle(s);
}
const alive = (b: Battle) => b.combatants.filter((c) => c.hp > 0 && !c.inert);
let cursor = 0;
/** Zarar vermeyen bir hamle: turns modunda pas, test modunda sıradaki yaşayan birim boş yuvaya geçer. */
function step(b: Battle): BattleEvent[] {
  if (b.mode === 'turns') {
    const r = b.skipTurn();
    expect(r.ok).toBe(true);
    return r.ok ? r.events : [];
  }
  const units = alive(b).filter((c) => !c.summoned && b.freeTiles(c.uid).length);
  const u = units[cursor++ % units.length]!;
  const r = b.useGlobal(u.uid, 'move_tile', b.freeTiles(u.uid)[0]);
  expect(r.ok).toBe(true);
  return r.ok ? r.events : [];
}
/** Hamle sayacı n'ye gelene dek zararsız hamle. */
function driveTo(b: Battle, n: number): void {
  while (b.turnsTaken < n && !b.winner) step(b);
}
/** Bütün birimleri dayanıklı yapar (kural uzun sürsün, vuruş dizisi gözlensin). */
function tough(b: Battle): void {
  for (const c of b.combatants) {
    c.maxHp = 100000;
    c.hp = 100000;
  }
}
const strikes = (b: Battle) => b.log.filter((e): e is Ev<'firstFireStrike'> => e.type === 'firstFireStrike');

describe("The First Fire's Verdict", () => {
  it('sayılar veride (battle-rules.json > firstFire) ve kurulum kuralı verir', () => {
    expect(R.afterMoves).toBeGreaterThan(R.warnFirst);
    expect(R.warnFirst).toBeGreaterThan(R.warnFinal);
    expect(content.battleSetup('random-battle', 1, 'turns', BASE, false).firstFire).toMatchObject({ afterMoves: R.afterMoves, damage: R.damage, damageStep: R.damageStep });
  });

  for (const mode of MODES) {
    it(`${mode}: ilk uyarı tetikten warnFirst, son uyarı warnFinal hamle önce; kural afterMoves geçilince başlar`, () => {
      const b = make(mode);
      tough(b);
      const warns: { at: number; e: Ev<'firstFireWarn'> }[] = [];
      let startAt = -1;
      while (b.turnsTaken <= R.afterMoves) {
        for (const e of step(b)) {
          if (e.type === 'firstFireWarn') warns.push({ at: b.turnsTaken, e });
          if (e.type === 'firstFireStart') startAt = b.turnsTaken;
        }
        if (b.turnsTaken <= R.afterMoves) expect(b.firstFire).toBeNull();
      }
      expect(warns.map((w) => [w.at, w.e.warning, w.e.movesLeft, w.e.triggerAt])).toEqual([
        [R.afterMoves - R.warnFirst, 'first', R.warnFirst, R.afterMoves],
        [R.afterMoves - R.warnFinal, 'final', R.warnFinal, R.afterMoves],
      ]);
      expect(startAt).toBe(R.afterMoves + 1);
      expect(b.firstFire).toMatchObject({ damage: R.damage, round: 0 });
      expect(strikes(b)).toEqual([]); // başlangıç hamlesinde vuruş yok; ilk vuruş ilk tur sonunda
    });

    it(`${mode}: vuruşlar çift çift; önce seçilen takım, sonra öbürü (sıra sabit); hasar her çiftten sonra +damageStep`, () => {
      const b = make(mode);
      tough(b);
      driveTo(b, R.afterMoves + 1);
      const first = b.firstFire!.first;
      let guard = 0;
      while (strikes(b).length < 8 && guard++ < 500) step(b);
      const s = strikes(b).slice(0, 8);
      expect(s).toHaveLength(8);
      s.forEach((e, i) => {
        const pair = Math.floor(i / 2);
        expect(e.side).toBe(i % 2 === 0 ? first : first === 'party' ? 'enemy' : 'party');
        expect(e.amount).toBe(R.damage + pair * R.damageStep);
        expect(e.round).toBe(pair + 1);
      });
    });

    it(`${mode}: saf hasar: kalkan, zırh ve hasar azaltma vuruşu düşürmez; doğrudan cana`, () => {
      const b = make(mode);
      tough(b);
      driveTo(b, R.afterMoves + 1);
      for (const c of b.combatants) {
        c.shield = 5000;
        c.magicShield = 5000;
        if (c.hp > 0) b.debugAddStatus(c.uid, 'fortify', 99);
      }
      let guard = 0;
      while (strikes(b).length < 2 && guard++ < 500) step(b);
      const s = strikes(b);
      expect(s.map((e) => e.amount)).toEqual([R.damage, R.damage]);
      // vuruşun hasar olayı: tam hasar, kalkan emmedi (absorbed 0, kalkanlar el değmemiş), can tam hasar kadar düştü
      const dmg = b.log.filter((e): e is Ev<'damage'> => e.type === 'damage' && e.cause === 'first_fire');
      expect(dmg).toHaveLength(2);
      for (const [i, d] of dmg.entries()) {
        expect(d.target).toBe(s[i]!.target);
        expect(d.amount).toBe(R.damage);
        expect(d.absorbed).toBe(0);
        expect(d.shieldAfter).toBe(5000);
        expect(d.magicShieldAfter).toBe(5000);
      }
      // can farkı: vuruştan hemen önceki can (olay sırası) - hpAfter = hasar
      const idx = b.log.indexOf(dmg[0]!);
      const prev = [...b.log.slice(0, idx)].reverse().find((e): e is Ev<'damage'> => (e.type === 'damage' || e.type === 'heal') && 'target' in e && e.target === dmg[0]!.target && 'hpAfter' in e);
      if (prev) expect(prev.hpAfter - dmg[0]!.hpAfter).toBe(R.damage);
    });

    for (const draw of [false, true]) {
      it(`${mode}: iki takımın sonuncusu aynı çiftte ölürse ${draw ? 'çok oyunculu: beraberlik' : 'tek oyunculu: oyuncu kaybeder'}`, () => {
        const b = make(mode, 7, { draw });
        tough(b);
        driveTo(b, R.afterMoves + 1);
        for (const side of ['party', 'enemy'] as const) {
          const mine = alive(b).filter((c) => c.side === side);
          mine.slice(1).forEach((c) => b.debugKill(c.uid, false));
          mine[0]!.hp = 1;
        }
        let guard = 0;
        while (!b.winner && guard++ < 50) step(b);
        expect(strikes(b)).toHaveLength(2);
        expect(b.winner).toBe(draw ? 'draw' : 'enemy');
        expect(b.log.filter((e) => e.type === 'battleEnd')).toHaveLength(1);
      });
    }

    it(`${mode}: aynı seed + aynı girdi = birebir aynı savaş (vuruş hedefleri dahil)`, () => {
      const run = () => {
        const b = make(mode, 11);
        tough(b);
        cursor = 0;
        driveTo(b, R.afterMoves + 40);
        return JSON.stringify(b.log);
      };
      expect(run()).toBe(run());
    });

    it(`${mode}: kural başlamadan önce savaş kuralsız savaşla birebir aynı (uyarı olayları hariç)`, () => {
      const play = (rule: boolean) => {
        const b = make(mode, 5, { rule });
        cursor = 0;
        driveTo(b, R.afterMoves);
        return { log: JSON.stringify(b.log.filter((e) => e.type !== 'firstFireWarn')), hash: stateHash(b) };
      };
      const on = play(true);
      const off = play(false);
      expect(on.log).toBe(off.log);
      expect(on.hash).toBe(off.hash); // kural başlamadan durum özeti değişmez (eski maç kayıtları uyumlu)
    });
  }

  it('turns: tur süresi en yavaş birimin TEMEL hızından; Slow / Chilled / Stun turu uzatmaz', () => {
    const b = make('turns');
    const len = b.firstFireRoundTime();
    const slowest = alive(b).reduce((m, c) => (c.stats.spd < m.stats.spd ? c : m));
    expect(len).toBeGreaterThan(0);
    expect(len).toBeLessThan(Infinity);
    for (const kind of ['slow', 'chilled', 'stun']) b.debugAddStatus(slowest.uid, kind, 5);
    expect(b.firstFireRoundTime()).toBe(len);
    // en yavaş birim ölürse tur sıradaki en yavaşa göre kısalır (ya da aynı kalır)
    b.debugKill(slowest.uid, false);
    expect(b.firstFireRoundTime()).toBeLessThanOrEqual(len);
  });

  it('turns: yavaşlatılmış birim vuruş sıklığını değiştirmez (ilk iki çift arası hamle sayısı aynı)', () => {
    const gap = (slowAll: boolean) => {
      const b = make('turns', 3);
      tough(b);
      driveTo(b, R.afterMoves + 1);
      const slowest = alive(b).reduce((m, c) => (c.stats.spd < m.stats.spd ? c : m));
      if (slowAll) b.debugAddStatus(slowest.uid, 'slow', 99);
      const at: number[] = [];
      let guard = 0;
      while (at.length < 2 && guard++ < 500) {
        if (step(b).some((e) => e.type === 'firstFireStrike')) at.push(b.turnsTaken);
      }
      return { len: b.firstFireRoundTime(), n: at.length };
    };
    const a = gap(false);
    const s = gap(true);
    expect(s.len).toBe(a.len);
    expect(s.n).toBe(2);
  });

  it('durum özeti (çok oyunculu desync denetimi) kural durumunu içerir', () => {
    const b = make('turns');
    tough(b);
    driveTo(b, R.afterMoves + 1);
    const h = stateHash(b);
    b.firstFire!.damage += 1;
    expect(stateHash(b)).not.toBe(h);
  });

  it('test modu: tur = yaşayan birim sayısı kadar eylem', () => {
    const b = make('test');
    tough(b);
    cursor = 0;
    driveTo(b, R.afterMoves + 1);
    const n = alive(b).length;
    const at: number[] = [];
    let guard = 0;
    while (at.length < 2 && guard++ < 500) {
      if (step(b).some((e) => e.type === 'firstFireStrike')) at.push(b.turnsTaken);
    }
    expect(at[0]).toBe(R.afterMoves + 1 + n);
    expect(at[1]! - at[0]!).toBe(n);
  });

  it('test: dalgayı temizleyen hamle savaşı bitirmez: o hamledeki uyarı yine gelir, sıradaki dalgayla sayaç sürer', () => {
    const setup = content.battleSetup('random-battle', 7, 'test', { ...BASE, waves: [{ enemies: cells({ 0: 'warrior' }) }] }, false);
    const b = new Battle(setup);
    tough(b);
    cursor = 0;
    driveTo(b, R.afterMoves - R.warnFirst - 1);
    const foes = alive(b).filter((c) => c.side === 'enemy');
    const last = foes.find((c) => c.slot === 0)!;
    foes.filter((c) => c !== last).forEach((c) => b.debugKill(c.uid, false));
    last.hp = 1;
    Object.assign(b.debug, { miss: 'never', dodge: 'never' });
    const me = alive(b).find((c) => c.side === 'party' && c.defId === 'warrior')!;
    me.cooldowns[me.skills[0]!] = 0;
    me.mp = me.maxMp;
    const r = b.useSkill(me.uid, me.skills[0]!, last.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const evs = r.ok ? r.events : [];
    expect(evs.some((e) => e.type === 'waveStart')).toBe(true);
    expect(b.winner).toBeNull();
    expect(evs.filter((e): e is Ev<'firstFireWarn'> => e.type === 'firstFireWarn').map((e) => e.warning)).toEqual(['first']);
  });

  for (const mode of MODES) {
    it(`${mode}: vuruş tipi pure: element yok; Soaked / Burning / Shocked hedefte tepkime ve durum değişimi yok`, () => {
      const b = make(mode);
      tough(b);
      driveTo(b, R.afterMoves + 1);
      // her birime tek durum (iki durum birbiriyle tepkimeye girerdi); ateş / şimşek vuruşu bunlarla tepkimeye girerdi, pure girmez
      const KINDS = ['soaked', 'burning', 'shocked'];
      const given = new Map<string, string>();
      alive(b).forEach((c, i) => {
        b.debugAddStatus(c.uid, KINDS[i % 3]!, 99);
        given.set(c.uid, KINDS[i % 3]!);
      });
      let evs: BattleEvent[] = [];
      let guard = 0;
      while (!evs.some((e) => e.type === 'firstFireStrike') && guard++ < 500) evs = step(b);
      const i0 = evs.findIndex((e) => e.type === 'firstFireStrike');
      const pair = evs.slice(i0, i0 + 4);
      expect(pair.map((e) => e.type)).toEqual(['firstFireStrike', 'damage', 'firstFireStrike', 'damage']);
      for (const d of pair.filter((e): e is Ev<'damage'> => e.type === 'damage')) {
        expect(d.damageType).toBe('pure');
        expect(d.element).toBeUndefined();
        expect(d.reaction).toBeUndefined();
        expect(d.amount).toBe(R.damage);
        // vurulan birimin durumları vuruşla değişmedi (tepkime yok); karşılaştırma vuruş anında, tur sonu tikleri hariç
        const t = b.get(d.target)!;
        expect(t.statuses.map((x) => x.kind)).toContain(given.get(t.uid));
      }
    });
  }

  it('Wiki (Basics) maddesi sayıları veriden yazar', () => {
    const text = JSON.stringify(firstFireArticle());
    for (const n of [R.afterMoves, R.warnFirst, R.warnFinal, R.damage, R.damageStep]) expect(text).toContain(String(n));
    expect(text).toContain(R.name);
    expect(text).toContain('pure damage');
  });
});
