import { describe, expect, it } from 'vitest';
import { applyUnitModifiers, Battle, chooseAction, content, describeStat, rolledSpeed, roundSpeed, speedMin, speedText, type CombatantDef, type Teams } from '../src/engine';
import { advanceTurn, predictQueue, snapCounter, type TurnSlot } from '../src/engine/turn-order';
import { stateHash } from '../src/net/state-hash';
import { newCampaign, pickHero } from '../src/campaign/state';
import { normalizeState } from '../src/campaign/save';
import { fmtPanel, heroPanel, heroStats } from '../src/progression/item-text';
import { statRowText } from '../src/game/stat-columns';

// Ondalık hız (Ömer 2026-10-31): hız en çok 3 ondalık, ekranda en çok 2; sıra sayacı aynı çözünürlükte, kayan nokta artığı birikmez.

const f = content.formulas;
const STEP = f.attributes.spdStep!;
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const withSpd = (spd: number): CombatantDef => {
  const d = content.classes.warrior!;
  return { ...d, stats: { ...d.stats, spd }, overrides: { ...(d.overrides ?? {}), spd } };
};
/** -%10 hız örneği (eski Vesper Heavy Bronze; ağaç v3'te 2026-11-08 kalktı, ondalık hız kuralı aynı). */
const heavyBronze = -0.1;
const slot = (uid: string, spd: number, counter = 0, side: 'party' | 'enemy' = 'party', s = 0): TurnSlot => ({ uid, side, slot: s, spd, counter });

/** Battle'ı YZ ile sonuna kadar oynatır; olay dizisi + her adımın durum özeti. */
function playOut(seed: number, teams: Teams): { log: string; hashes: string[]; turns: number } {
  const b = new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
  const out: unknown[] = [];
  const hashes = [stateHash(b)];
  for (let i = 0; i < 400 && !b.winner; i++) {
    const u = b.currentUid;
    if (!u) break;
    const r = b.applyChoice(u, chooseAction(b, u, content.aiConfig));
    if (!r.ok) break;
    out.push(r.events);
    hashes.push(stateHash(b));
  }
  return { log: JSON.stringify(out), hashes, turns: b.turnsTaken };
}

describe('ondalık hız: değerler', () => {
  it('veri: adım 3 ondalık, alt sınır adımdan bağımsız 1, ekran 2 ondalık', () => {
    expect(STEP).toBe(0.001);
    expect(speedMin(f)).toBe(1);
    expect(f.attributes.spdShowStep).toBe(0.01);
    expect(f.turn.counterStep).toBeLessThanOrEqual(STEP);
  });

  it('15 hız + -%10 hız çarpanı = 13,5; tur zarı savaşta sonra uygulanır', () => {
    expect(heavyBronze).toBe(-0.1);
    expect(applyUnitModifiers(withSpd(15), { spdMult: 1 + heavyBronze }, f).stats.spd).toBe(13.5);
    expect(rolledSpeed(13.5, 1.02, f)).toBe(13.77);
  });

  it('en çok 3 ondalık; kaynaklar ondalık kalır (nitelik, item eki, durum çarpanı)', () => {
    expect(roundSpeed(14 + 0.4 * 7, f)).toBe(16.8);
    expect(roundSpeed(13.77777, f)).toBe(13.778);
    const dex7 = { ...content.classes.warrior!, overrides: undefined };
    expect(Number.isInteger(dex7.stats.spd)).toBe(Number.isInteger(14 + 0.4 * dex7.attributes.dex));
    expect(applyUnitModifiers(withSpd(15), { spdAdd: 0.1 + 0.2 }, f).stats.spd).toBe(15.3);
    const teams: Teams = { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'warrior' }) };
    const setup = content.battleSetup('random-battle', 3, 'turns', teams, false);
    const b = new Battle({ ...setup, formulas: { ...setup.formulas, attributes: { ...setup.formulas.attributes, spdVariance: 0 } } });
    const c = b.combatants[0]!;
    expect(b.speedOf(c)).toBe(c.stats.spd);
    (b as unknown as { statusMult: () => number }).statusMult = () => 0.7;
    expect(b.speedOf(c)).toBe(roundSpeed(c.stats.spd * 0.7, f));
    expect(b.speedOf(c) % 1).not.toBe(0);
  });

  it('alt sınır korunur: hız 1 altına, sıfıra ya da negatife düşmez', () => {
    expect(applyUnitModifiers(withSpd(15), { spdMult: 0.001 }, f).stats.spd).toBe(1);
    expect(applyUnitModifiers(withSpd(2), { spdAdd: -50 }, f).stats.spd).toBe(1);
    expect(rolledSpeed(1, 0.95, f)).toBe(1);
    const teams: Teams = { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'warrior' }) };
    const b = new Battle(content.battleSetup('random-battle', 3, 'turns', teams, false));
    (b as unknown as { statusMult: () => number }).statusMult = () => 0;
    expect(b.speedOf(b.combatants[0]!)).toBe(1);
  });
});

describe('ondalık hız: sıra', () => {
  it('daha hızlı ondalık birim önce ve daha sık oynar', () => {
    const q = predictQueue([slot('a', 13.5), slot('b', 13.75, 0, 'enemy')], 200, 40, null);
    expect(q[0]).toBe('b');
    const na = q.filter((u) => u === 'a').length;
    expect(q.filter((u) => u === 'b').length).toBeGreaterThanOrEqual(na);
    // 200 / 66,667 = 3 tik (200,001 eşiği geçer); 66,666 ile 4 tik
    const x = slot('x', 66.667);
    expect(advanceTurn([x], 200)?.uid).toBe('x');
    expect(x.counter).toBe(200.001);
    const y = slot('y', 66.666);
    advanceTurn([y], 200);
    expect(y.counter).toBe(266.664);
  });

  it('kayan nokta artığı eşitliği bozmaz: 0,1 + 0,2 ile 0,3 gerçekten eşittir, eşitlik kuralı karar verir', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // kural bunun için var
    for (const first of ['party', 'enemy'] as const) {
      const a = slot('a', 0.2, 0.1, 'party');
      const b = slot('b', 0.3, 0, 'enemy');
      const next = advanceTurn([a, b], 0.3, first);
      expect(a.counter).toBe(b.counter);
      expect(next?.side).toBe(first);
    }
    expect(snapCounter(0.1 + 0.2)).toBe(0.3);
    expect(Object.is(snapCounter(-0.0001), 0)).toBe(true);
  });

  it('uzun koşuda birikim yok: 200 bin tur tam sayı modelle birebir aynı, eşik asla atlanmaz', () => {
    const T = 200;
    const spds = [13.5, 13.788, 15.2, 0.1 + 0.7, 66.667, 19.999];
    const slots = spds.map((s, i) => slot(`u${i}`, roundSpeed(s, f), 0, i % 2 ? 'enemy' : 'party', i));
    const model = spds.map((s) => ({ v: Math.round(roundSpeed(s, f) * 1000), c: 0 }));
    let side: 'party' | 'enemy' = 'party';
    for (let n = 0; n < 200_000; n++) {
      const ticks = Math.min(...model.map((m) => Math.max(0, Math.ceil((T * 1000 - m.c) / m.v))));
      for (const m of model) m.c += m.v * ticks;
      const next = advanceTurn(slots, T, side);
      if (!next) throw new Error(`tur ${n}: eşiğe kimse ulaşmadı`);
      expect(next.counter).toBeGreaterThanOrEqual(T);
      if (n % 5000 === 0) slots.forEach((s, i) => expect(s.counter).toBe(model[i]!.c / 1000));
      const i = slots.indexOf(next);
      next.counter = snapCounter(next.counter - T);
      model[i]!.c -= T * 1000;
      side = next.side === 'party' ? 'enemy' : 'party';
    }
    slots.forEach((s, i) => expect(s.counter).toBe(model[i]!.c / 1000));
  });

  it('önizleme gerçek sırayla aynı', () => {
    const base = () => [slot('a', 13.5, 0, 'party', 0), slot('b', 14.25, 0, 'enemy', 1), slot('c', 13.788, 0, 'party', 2)];
    const want = predictQueue(base(), 200, 30, null);
    const live = base();
    const got: string[] = [];
    let side: 'party' | 'enemy' = 'party';
    while (got.length < 30) {
      const n: TurnSlot = advanceTurn(live, 200, side)!;
      got.push(n.uid);
      n.counter = snapCounter(n.counter - 200);
      side = n.side === 'party' ? 'enemy' : 'party';
    }
    expect(got).toEqual(want);
  });
});

describe('ondalık hız: determinizm (lockstep)', () => {
  const teams: Teams = { party: cells({ 0: 'warrior', 1: 'mage', 6: 'hexer' }), enemies: cells({ 0: 'warrior', 1: 'druid', 7: 'mage' }) };
  it('aynı seed iki kez: birebir aynı olaylar ve durum özeti; sayaç en çok 3 ondalık', () => {
    for (const seed of [5, 17, 301]) {
      const a = playOut(seed, teams);
      const b = playOut(seed, teams);
      expect(a.turns).toBeGreaterThan(0);
      expect(a.log).toBe(b.log);
      expect(a.hashes).toEqual(b.hashes);
    }
    const c = new Battle(content.battleSetup('random-battle', 5, 'turns', teams, false));
    expect(c.combatants.some((u) => !Number.isInteger(u.stats.spd))).toBe(true);
    for (let i = 0; i < 60 && !c.winner && c.currentUid; i++) {
      if (!c.applyChoice(c.currentUid, chooseAction(c, c.currentUid, content.aiConfig)).ok) break;
      for (const u of c.combatants) expect(u.turnCounter).toBe(Number(u.turnCounter.toFixed(3)));
    }
  });
});

describe('ondalık hız: kayıt ve gösterim', () => {
  it('eski kayıt yüklenir: kayıtta hız yok, aynı kahraman yeni yuvarlamayla aynı hızı görür', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 42, difficulty: 'medium' }), 'warrior');
    const before = heroStats(s.roster[0]!)!.spd;
    expect(JSON.stringify(s)).not.toContain('"spd"');
    const old = JSON.parse(JSON.stringify(s)) as typeof s;
    for (const h of old.roster) (h as { spdRoll?: number }).spdRoll = 1.04; // eski kalıcı zarlı kayıt (Ömer 2026-11-07: zar kalktı, alan yok sayılır)
    const back = normalizeState(old)!;
    expect(heroStats(back.roster[0]!)!.spd).toBe(before);
    expect(before).toBe(Number(before.toFixed(3)));
  });

  it('ekranda en çok 2 ondalık, sondaki sıfırlar yok, İngilizce nokta', () => {
    expect(speedText(14, f)).toBe('14');
    expect(speedText(13.5, f)).toBe('13.5');
    expect(speedText(13.788, f)).toBe('13.79');
    expect(speedText(16.804, f)).toBe('16.8');
    expect(fmtPanel({ value: 13.788, fmt: 'spd' })).toBe('13.79');
    const st = { ...content.classes.warrior!.stats, spd: 13.788 };
    expect(describeStat('spd', st, f).title).toBe('Speed 13.79');
    expect(statRowText('spd', st, {} as never)).toBe('SPD 13.79');
    const s = pickHero(newCampaign({ mode: 'normal', seed: 42, difficulty: 'medium' }), 'warrior');
    expect(heroPanel(s.roster[0]!).find((r) => r.id === 'spd')?.fmt).toBe('spd');
  });
});
