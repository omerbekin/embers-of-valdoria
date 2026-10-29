import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type CombatantDef, type PushDir } from '../src/engine';
import { PUSH_DIR_ORDER, crashLabel, pushArrowVector, pushOptions } from '../src/game/push-pick';

// Ice Crater yön adımı (Ömer 2026-10-29): savaş ekranındaki 4 okun saf mantığı (seçenekler, ekran yönü, ipucu metni)
const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
function arena(party: [string, number][], enemies: [string, number][]): Battle {
  const base = content.battleSetup('random-battle', 1, 'test', { party: [], enemies: [] }, false);
  return new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
}

describe('Ice Crater yön adımı (push-pick)', () => {
  it('4 yön, çapraz yok; kenar ve dolu hücre "crash", boş hücre "move"', () => {
    const b = arena([['mage', 0]], [['warrior', 0], ['warrior', 3]]); // hedef enemy 0 (ön sıra, şerit 0): geri dolu, ileri ve lanePrev kenar
    const target = b.combatants.find((c) => c.side === 'enemy' && c.slot === 0)!;
    const mage = b.combatants.find((c) => c.side === 'party')!;
    const opts = pushOptions((dir: PushDir) => previewSkill(b, mage.uid, 'ice_crater', target.uid, undefined, undefined, undefined, dir), target.uid)!;
    expect(opts.map((o) => o.dir)).toEqual([...PUSH_DIR_ORDER]);
    const by = Object.fromEntries(opts.map((o) => [o.dir, o]));
    expect(by.forward).toMatchObject({ kind: 'crash', to: null });
    expect(by.lanePrev).toMatchObject({ kind: 'crash', to: null });
    expect(by.back!.kind).toBe('crash');
    expect(by.back!.withUid).toBeDefined();
    expect(by.laneNext).toMatchObject({ kind: 'move', to: 1 });
    expect(by.back!.damage).toBeGreaterThan(0);
    expect(by.back!.withDamage).toBeGreaterThan(0); // dolu hücredeki birim de çarpma hasarı alır
    expect(crashLabel(by.back!)).toBe(`Crash ${by.back!.damage}`);
  });

  it('itilemeyen hedef (boss): yön adımı yok (null)', () => {
    const b = arena([['mage', 0]], [['warrior', 4]]);
    const target = b.combatants.find((c) => c.side === 'enemy')!;
    target.tier = 'boss';
    const mage = b.combatants.find((c) => c.side === 'party')!;
    expect(pushOptions((dir) => previewSkill(b, mage.uid, 'ice_crater', target.uid, undefined, undefined, undefined, dir), target.uid)).toBeNull();
  });

  it('ok yönü motorun hücre adımıyla aynı: ileri = -sıra, geri = +sıra, şerit = ±şerit', () => {
    const slots = Array.from({ length: 12 }, (_, i) => ({ x: 100 + Math.floor(i / 3) * 200, y: 300 + (i % 3) * 120 }));
    expect(pushArrowVector(slots, 3, 'back')).toEqual({ x: 200, y: 0 });
    expect(pushArrowVector(slots, 3, 'forward')).toEqual({ x: -200, y: -0 });
    expect(pushArrowVector(slots, 3, 'laneNext')).toEqual({ x: 0, y: 120 });
    expect(pushArrowVector(slots, 3, 'lanePrev')).toEqual({ x: -0, y: -120 });
  });
});
