import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type BattleMode, type Teams, type UnitSetup } from '../src/engine';
import { ITEM_HOOK_CAPS } from '../src/engine/item-caps';
import { describeEvent } from '../src/engine/match-log';
import { CombatLog } from '../src/game/combat-log';
import { ITEMS } from '../src/progression';
import { buildMechanics } from '../src/wiki/catalog';

// Kalkan bloğu (Ömer 2026-10-18): kalkanlı hedef düşmanın DOĞRUDAN FİZİKSEL skill vuruşunu tamamen bloklar (hasar 0, ek etkiler yok).
// Büyü, Backstab (unblockable) bloklanmaz; tavan items.json > caps.block; önizleme / YZ isabet şansını x(1 - blok) ile çarpar.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, enemyUnits: Record<number, UnitSetup> = {}, seed = 1, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: {}, enemies: enemyUnits } };
  const b = new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
  b.debug.dodge = 'never'; // isabet zarı hep isabet: blok zarı ayrı ve debug'dan etkilenmez
  return b;
};
const shield = (chance: number): UnitSetup => ({ itemEffects: { blockChance: chance } });
const CAP = ITEM_HOOK_CAPS.block;

/** venom_edge: Cutthroat'ın fiziksel yakın dövüş saldırısı + Wound (ek etki). */
const PHYS = 'venom_edge';

describe('kalkan bloğu: motor', () => {
  it('veri: kural sayıları ve Backstab bloklanamaz', () => {
    expect(content.skills[PHYS]!.effects.some((e) => e.type === 'damage' && e.damageType === 'physical')).toBe(true);
    expect(content.skills[PHYS]!.effects.some((e) => e.type === 'status' && e.status === 'wound')).toBe(true);
    const bs = content.skills.backstab!.effects.find((e) => e.type === 'damage')!;
    expect(bs.type === 'damage' && bs.unblockable).toBe(true);
    expect(CAP).toBeCloseTo((ITEMS.caps.block ?? 0) / 100, 9);
    expect(CAP).toBeGreaterThanOrEqual(0.3);
  });

  it('fiziksel vuruş bloklanır: hasar 0, ek etki (Wound) uygulanmaz, "block" olayı; oran tavana uyar', () => {
    let blocks = 0;
    const N = 300;
    for (let seed = 1; seed <= N; seed++) {
      const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: shield(0.9) }, seed);
      const def = b.get('enemy-0')!;
      const hp = def.hp;
      const r = b.useSkill('party-0', PHYS, 'enemy-0');
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const blocked = r.events.some((e) => e.type === 'block' && e.target === 'enemy-0' && e.source === 'party-0');
      if (blocked) {
        blocks++;
        expect(r.events.some((e) => e.type === 'damage' && e.target === 'enemy-0'), `seed ${seed}`).toBe(false);
        expect(def.hp).toBe(hp);
        expect(def.statuses.some((s) => s.kind === 'wound'), `seed ${seed}`).toBe(false);
      } else {
        expect(r.events.some((e) => e.type === 'damage' && e.target === 'enemy-0')).toBe(true);
        expect(def.statuses.some((s) => s.kind === 'wound')).toBe(true);
      }
    }
    // 0,9 istendi, tavan (0,3) işler
    expect(blocks / N).toBeGreaterThan(CAP - 0.1);
    expect(blocks / N).toBeLessThan(CAP + 0.1);
  });

  it('büyü bloklanmaz; Backstab bloklanmaz; dost vuruşu ve kalkansız hedef blok zarı atmaz', () => {
    const mageSkill = content.classes.mage!.skills.find((id) => content.skills[id]!.target === 'single_enemy' && content.skills[id]!.effects.some((e) => e.type === 'damage' && e.damageType === 'magic'))!;
    for (let seed = 1; seed <= 120; seed++) {
      const m = make({ 0: 'mage' }, { 0: 'defender' }, { 0: shield(0.3) }, seed);
      const r = m.useSkill('party-0', mageSkill, 'enemy-0');
      expect(r.ok && r.events.some((e) => e.type === 'block'), `büyü seed ${seed}`).toBe(false);
      const c = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: shield(0.3) }, seed);
      const rb = c.useSkill('party-0', 'backstab', 'enemy-0');
      expect(rb.ok, `backstab seed ${seed}`).toBe(true);
      expect(rb.ok && rb.events.some((e) => e.type === 'block'), `backstab seed ${seed}`).toBe(false);
    }
    const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: shield(0.3) });
    const backstab = content.skills.backstab!.effects.find((e) => e.type === 'damage')!;
    const phys = content.skills[PHYS]!.effects.find((e) => e.type === 'damage')!;
    const mage = content.skills[mageSkill]!.effects.find((e) => e.type === 'damage')!;
    const a = b.get('party-0')!;
    const t = b.get('enemy-0')!;
    if (backstab.type !== 'damage' || phys.type !== 'damage' || mage.type !== 'damage') throw new Error('damage effect');
    expect(b.blockChance(a, t, phys)).toBeCloseTo(0.3, 9);
    expect(b.blockChance(a, t, backstab)).toBe(0);
    expect(b.blockChance(a, t, mage)).toBe(0);
    expect(b.blockChance(t, t, phys)).toBe(0); // aynı taraf
    expect(b.blockChance(t, a, phys)).toBe(0); // kalkansız hedef
  });

  it('kalkansız savaş aynı seed ile birebir aynı (blok zarı rastgele sayı tüketmez)', () => {
    const run = (units: Record<number, UnitSetup>) => {
      const b = make({ 0: 'mage' }, { 0: 'defender' }, units, 7);
      const r = b.useSkill('party-0', content.classes.mage!.skills[0]!, 'enemy-0');
      return JSON.stringify(r.ok ? r.events : r);
    };
    // büyüye blok işlemez: kalkanlı hedef de aynı olay akışını üretir (zar atılmadı)
    expect(run({ 0: shield(0.3) })).toBe(run({}));
  });

  it('Guard: korumacının payı kendi vuruşu, kalkanı varsa o pay bloklanır; asıl hedef payını ve ek etkileri alır', () => {
    let seen = 0;
    for (let seed = 1; seed <= 200 && seen < 3; seed++) {
      const b = make({ 0: 'cutthroat' }, { 0: 'mage', 1: 'defender' }, { 1: shield(0.3) }, seed);
      const g = b.useSkill('enemy-1', 'guard', 'enemy-0');
      expect(g.ok, 'guard').toBe(true);
      const guardian = b.get('enemy-1')!;
      const ghp = guardian.hp;
      const r = b.useSkill('party-0', PHYS, 'enemy-0');
      if (!r.ok) throw new Error(r.reason);
      const ev = r.events.find((e): e is Extract<BattleEvent, { type: 'block' }> => e.type === 'block');
      if (!ev) continue;
      seen++;
      expect(ev.target).toBe('enemy-1');
      expect(ev.guard).toBe(true);
      expect(guardian.hp).toBe(ghp);
      expect(r.events.some((e) => e.type === 'damage' && e.target === 'enemy-0')).toBe(true);
      expect(b.get('enemy-0')!.statuses.some((s) => s.kind === 'wound')).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('önizleme / YZ: fiziksel vuruşta isabet şansı x(1 - blok); büyüde ve Backstab\'da aynı', () => {
    const plain = make({ 0: 'cutthroat' }, { 0: 'defender' });
    const block = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: shield(0.9) });
    const hit = (b: Battle, sk: string) => previewSkill(b, 'party-0', sk, 'enemy-0')[0]!.damage!.hitChance;
    expect(hit(block, PHYS)).toBeCloseTo(hit(plain, PHYS) * (1 - CAP), 9);
    expect(hit(block, 'backstab')).toBeCloseTo(hit(plain, 'backstab'), 9);
    const exp = (b: Battle, sk: string) => previewSkill(b, 'party-0', sk, 'enemy-0')[0]!.damage!.expected;
    expect(exp(block, PHYS)).toBeLessThan(exp(plain, PHYS));
    const ms = make({ 0: 'mage' }, { 0: 'defender' }, { 0: shield(0.3) });
    const mp = make({ 0: 'mage' }, { 0: 'defender' });
    const sk = content.classes.mage!.skills[0]!;
    expect(previewSkill(ms, 'party-0', sk, 'enemy-0')[0]!.damage!.hitChance).toBeCloseTo(previewSkill(mp, 'party-0', sk, 'enemy-0')[0]!.damage!.hitChance, 9);
  });

  it('maç kaydı ve savaş günlüğü: "BLOCKED" / "(blocked)"', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: shield(0.3) }, seed);
      const log = new CombatLog({ unit: (uid: string) => ({ name: uid, side: uid.startsWith('party') ? 'party' : 'enemy' }), skill: (id: string) => id, status: (id: string) => id, ground: (id: string) => id, globalKind: () => 'rest' });
      const events: BattleEvent[] = [];
      b.on((e) => {
        events.push(e);
        log.push(e);
      });
      b.useSkill('party-0', PHYS, 'enemy-0');
      if (!events.some((e) => e.type === 'block')) continue;
      expect(events.map((e) => describeEvent(b, e) ?? '').some((l) => l.includes('BLOCKED'))).toBe(true);
      expect(JSON.stringify(log.entries())).toContain('(blocked)');
      return;
    }
    throw new Error('blok görülmedi');
  });
});

describe('kalkan bloğu: Codex', () => {
  it('Hit chance makalesi ve Items makalesi bloğu anlatır (sayılar veriden)', () => {
    const text = JSON.stringify(buildMechanics());
    expect(text).toContain('Block: a hero with a shield');
    expect(text).toContain('Backstab cannot be blocked');
    expect(text).toContain("A shield's base value is its block chance");
  });
});
