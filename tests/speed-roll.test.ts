import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeStat, paceKey, rolledSpeed, roundSpeed, speedMin, speedRoll, speedText, type Teams } from '../src/engine';
import { predictQueue } from '../src/engine/turn-order';
import { newCampaign, pickHero } from '../src/campaign/state';
import { normalizeState } from '../src/campaign/save';
import { newRun } from '../src/endless/run';
import { parseRun } from '../src/endless/save';
import { loadout, loadoutSetup } from '../src/progression/loadout';
import { heroStats } from '../src/progression/item-text';

// Tur başına hız zarı (Ömer 2026-11-07; eski kalıcı "Natural pace" zarının yerine): hasarın vuruş başı ±%10'u gibi, her birimin sıra hızı
// HER TURUNDA ±spdVariance yeniden zarlanır; zar saf hash (savaş seed'i + uid + tur sırası), sıra çubuğu gerçek sırayla aynı.

const f = content.formulas;
const V = f.attributes.spdVariance!;
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const setupOf = (seed: number, teams: Teams, v = V) => {
  const s = content.battleSetup('random-battle', seed, 'turns', teams, false);
  return { ...s, formulas: { ...s.formulas, attributes: { ...s.formulas.attributes, spdVariance: v } } };
};
const make = (seed: number, teams: Teams, v = V) => new Battle(setupOf(seed, teams, v));
const TEAMS: Teams = { party: cells({ 0: 'warrior', 1: 'mage', 3: 'druid' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 3: 'hexer' }) };

describe('tur başına hız zarı', () => {
  it('veri: spdVariance 0,1 (Ömer 2026-11-07); zar aralıkta, deterministik ve çeşitli', () => {
    expect(V).toBe(0.1);
    const rolls = Array.from({ length: 200 }, (_, i) => speedRoll(7, paceKey('enemy-0', i), f));
    for (const r of rolls) expect(r).toBeGreaterThanOrEqual(1 - V), expect(r).toBeLessThanOrEqual(1 + V);
    expect(speedRoll(7, paceKey('enemy-0', 3), f)).toBe(rolls[3]);
    expect(new Set(rolls).size).toBeGreaterThan(150);
    expect(rolls.some((r) => r < 0.95) && rolls.some((r) => r > 1.05)).toBe(true);
    expect(speedRoll(7, 'x', { attributes: { ...f.attributes, spdVariance: 0 } })).toBe(1);
    expect(rolledSpeed(17, 1, f)).toBe(17);
    expect(rolledSpeed(17, 1.06, f)).toBe(18.02);
    expect(rolledSpeed(1, 0.9, f)).toBe(speedMin(f));
  });

  it('stat zarsız (kendi temel hızı); sıra hızı = stat x bu turun zarı; birim turunu bitirince zar yenilenir', () => {
    const b = make(5, TEAMS);
    for (const c of b.combatants) {
      expect(c.stats.spd).toBe(content.classes[c.defId]!.stats.spd);
      expect(b.paceOf(c)).toBe(speedRoll(5, paceKey(c.uid, 0), f));
      expect(b.speedOf(c)).toBe(Math.max(speedMin(f), roundSpeed(c.stats.spd * b.paceOf(c), f)));
    }
    const first = b.currentUid!;
    const actor = b.get(first)!;
    const before = b.paceOf(actor);
    expect(b.applyChoice(first, chooseAction(b, first, content.aiConfig)).ok).toBe(true);
    expect(actor.paceTurn).toBe(1);
    expect(b.paceOf(actor)).toBe(speedRoll(5, paceKey(first, 1), f));
    // farklı turlarda farklı zar (en az bir fark)
    expect(Array.from({ length: 8 }, (_, t) => b.paceOf(actor, t)).some((p) => p !== before)).toBe(true);
    // oynamayanların zarı değişmedi
    for (const c of b.combatants) if (c.uid !== first && !c.paceTurn) expect(b.paceOf(c)).toBe(speedRoll(5, paceKey(c.uid, 0), f));
  });

  it('aynı seed = aynı savaş; ana Rng akışı tüketilmez (zarsız kurulumla aynı ilk sayı)', () => {
    const run = (v: number) => {
      const b = make(9, TEAMS, v);
      const actors: string[] = [];
      for (let i = 0; i < 60 && !b.winner; i++) {
        const u = b.currentUid!;
        actors.push(u);
        if (!b.applyChoice(u, chooseAction(b, u, content.aiConfig)).ok) break;
      }
      return actors.join(',');
    };
    expect(run(V)).toBe(run(V));
    const rngOf = (x: Battle) => (x as unknown as { rng: { next(): number } }).rng.next();
    expect(rngOf(make(5, TEAMS))).toBe(rngOf(make(5, TEAMS, 0)));
  });

  it('sıra çubuğu önizlemesi gerçek sırayla aynı (ölüm / durum / çağrı gibi önceden bilinemeyen olaysız adımlarda)', () => {
    const SAFE = new Set(['skillUsed', 'resource', 'damage', 'rage', 'turnStart', 'miss', 'dodge', 'heal', 'mpRegen', 'passive', 'shield', 'globalUsed']);
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const b = make(seed, TEAMS);
      let q8 = b.turnQueue(8);
      let k = 0;
      for (let i = 0; i < 120 && !b.winner; i++) {
        const u = b.currentUid!;
        const q = b.turnQueue();
        const r = b.applyChoice(u, chooseAction(b, u, content.aiConfig));
        if (!r.ok || b.winner) break;
        if (!r.events.every((e) => SAFE.has(e.type))) {
          q8 = b.turnQueue(8);
          k = 0;
          continue;
        }
        expect(b.currentUid).toBe(q[1]);
        k++;
        if (k < 8) expect(b.currentUid).toBe(q8[k]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it('predictQueue: respeed her tahmini turdan sonra uygulanır (şu anki aktör dahil)', () => {
    const slots = [
      { uid: 'a', side: 'party' as const, slot: 0, spd: 10, counter: 100, respeed: () => 50 },
      { uid: 'b', side: 'enemy' as const, slot: 0, spd: 20, counter: 0 },
    ];
    // a şimdi oynuyor; sonraki turları 50 hızla: b'den (20) önce iki kez gelir
    expect(predictQueue(slots, 100, 4, 'a', 'party')).toEqual(['a', 'a', 'a', 'b']);
    expect(predictQueue(slots.map(({ respeed: _r, ...s }) => s), 100, 3, 'a', 'party')).toEqual(['a', 'b', 'a']);
  });

  it('eski kayıt yüklenir: kalıcı zar alanı (spdRoll) silinir, yeni kahramanda yok', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 42, difficulty: 'medium' }), 'warrior');
    expect(JSON.stringify(s)).not.toContain('spdRoll');
    const old = JSON.parse(JSON.stringify(s)) as typeof s;
    for (const h of old.roster) (h as { spdRoll?: number }).spdRoll = 1.0412;
    const back = normalizeState(old)!;
    expect(JSON.stringify(back)).not.toContain('spdRoll');
    expect(heroStats(back.roster[0]!)!.spd).toBe(heroStats(s.roster[0]!)!.spd);
    const run = newRun(9, ['warrior', 'mage']);
    expect(JSON.stringify(run)).not.toContain('spdRoll');
    const raw = JSON.parse(JSON.stringify(run)) as typeof run;
    for (const h of raw.heroes) (h as { spdRoll?: number }).spdRoll = 0.97;
    const parsed = parseRun(JSON.stringify({ version: 6, run: raw }))!;
    expect(parsed).not.toBeNull();
    expect(JSON.stringify(parsed)).not.toContain('spdRoll');
  });

  it('kahraman sayfası = savaş statı (zarsız); ipucu kendi temel hızını gösterir, Natural pace satırı yok', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 42, difficulty: 'medium' }), 'warrior');
    const h = s.roster[0]!;
    const mods = loadout(h).modifiers;
    expect(mods !== undefined && 'spdRoll' in mods).toBe(false);
    const sheet = heroStats(h)!;
    const teams: Teams = { party: cells({ 0: h.class }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: loadoutSetup(h) } } };
    for (const seed of [1, 2, 3]) expect(make(seed, teams).get('party-0')!.stats.spd).toBe(sheet.spd);
    const tip = describeStat('spd', sheet, f);
    expect(tip.title).toBe(`Speed ${speedText(sheet.spd, f)}`);
    expect(tip.lines.some((l) => l.includes('Natural pace'))).toBe(false);
  });
});
