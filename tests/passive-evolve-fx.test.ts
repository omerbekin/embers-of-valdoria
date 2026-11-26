import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { Teams } from '../src/engine';
import fxData from '../data/passive-evolve-fx.json';
import { mountPassiveEvolveFx, passiveEvolveFx } from '../src/game/passive-evolve-fx';

// Pasif evrimi = karakter efekti (Ömer 2026-11-23). Mage Heat Mirage > Mirage Veil: evrimliyse tetikte kısa parıltı (sürekli yok), değilse hiçbir şey çizilmez.
const cells = (units: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => units[i] ?? '');
const TEAMS: Teams = { party: cells({ 0: 'warrior', 6: 'mage' }), enemies: cells({ 0: 'warrior' }) };
const mageOf = (evolved: string[] | undefined) => {
  const t = { ...TEAMS, units: { party: { 6: evolved ? { evolved } : {} }, enemies: [] } } as Teams;
  return new Battle(content.battleSetup('random-battle', 7, 'turns', t, false)).combatants.find((c) => c.defId === 'mage')!;
};

describe('evolved bilgisi pasif evrimini içerir', () => {
  it('pasif id (heat_mirage) evolved içinde kalır', () => {
    expect(mageOf(['heat_mirage', 'fire_bolt']).evolved).toEqual(['heat_mirage', 'fire_bolt']);
  });
  it('skill listesinde de pasifte de olmayan id elenir; verilmezse alan yok', () => {
    expect(mageOf(['heat_mirage', 'nope']).evolved).toEqual(['heat_mirage']);
    expect(mageOf(undefined).evolved).toBeUndefined();
  });
});

describe('passiveEvolveFx kararı', () => {
  it('evrim yok -> null', () => {
    expect(passiveEvolveFx(mageOf(undefined))).toBeNull();
    expect(passiveEvolveFx(mageOf(['fire_bolt']))).toBeNull();
  });
  it('Mage pasifi evrimli -> spec', () => {
    expect(passiveEvolveFx(mageOf(['heat_mirage']))?.passive).toBe('heat_mirage');
  });
  it('satırı olmayan sınıf -> null', () => {
    expect(passiveEvolveFx({ defId: 'warrior', passive: { id: 'heat_mirage' }, evolved: ['heat_mirage'] })).toBeNull();
  });
});

describe('mountPassiveEvolveFx çizimi', () => {
  it('görseller sprite arkasına eklenir, destroy temizler', () => {
    const added: unknown[] = [];
    const mk = () => {
      const o: Record<string, unknown> = {};
      const self = new Proxy(o, { get: (_t, k) => (k === 'active' ? true : () => self) });
      return self;
    };
    const scene = {
      textures: { exists: () => true },
      add: { image: () => mk(), rectangle: () => mk() },
      tweens: { add: () => undefined, killTweensOf: () => undefined },
      time: { delayedCall: () => undefined },
    };
    const container = { getIndex: () => 1, addAt: (o: unknown) => added.push(o), add: () => undefined, active: true, alpha: 1 };
    const h = mountPassiveEvolveFx(scene as never, container as never, {} as never, { w: 100, h: 200 }, fxData.mage, false);
    expect(added.length).toBe(1); // yalnız tetik parıltısı; sürekli parıltı yok
    expect(h.items.length).toBe(1);
    h.burst();
    h.destroy();
  });
});
