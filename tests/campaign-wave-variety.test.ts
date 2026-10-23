// Dolgu savaşı dalga çeşitliliği (Ömer 2026-10-21; docs/design/waves.md > Dolgu savaşı çeşitliliği): 2. dalga 1. dalganın kopyası değil.
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, getMap, validateEncounters } from '../src/campaign';

const sig = (units: { class: string; mods?: { hpMult?: number; powerMult?: number } }[]) =>
  units.map((u) => `${u.class}:${u.mods?.hpMult ?? 1}:${u.mods?.powerMult ?? 1}`).sort().join('|');

describe('sefer dolgu savaşları: dalgalar çeşitli', () => {
  const map = getMap('valdoria');
  const fillers = map.nodes.filter((n) => n.encounter && ['battle', 'treasure', 'event'].includes(n.type) && !['1', '2'].includes(n.id));

  it('her dolgu savaşının elle yazılmış 2. dalgası var, 1. dalgadan farklı, 2-5 birim', () => {
    expect(fillers.length).toBeGreaterThanOrEqual(12);
    for (const n of fillers) {
      const enc = ENCOUNTERS[n.encounter!]!;
      expect(enc.waves?.length, n.id).toBe(1);
      const w2 = enc.waves![0]!.units;
      expect(sig(w2), n.id).not.toBe(sig(enc.units));
      // İstisna: Dwarven Mine 2. dalgası tek Stonebound Warden (playtest 2026-10-23 D2, Ömer seçti: Crossbowman'ler silindi)
      expect(w2.length, n.id).toBeGreaterThanOrEqual(n.id === '6B' ? 1 : 2);
      expect(w2.length, n.id).toBeLessThanOrEqual(5);
      expect(w2.some((u) => u.tier), n.id).toBe(false);
    }
    expect(validateEncounters()).toEqual([]);
  });

  it('kalıplar karışık: hem az birimli hem çok birimli 2. dalgalar var', () => {
    const d = fillers.map((n) => ENCOUNTERS[n.encounter!]!).map((e) => e.waves![0]!.units.length - e.units.length);
    expect(d.some((x) => x < 0)).toBe(true);
    expect(d.some((x) => x > 0)).toBe(true);
    expect(d.some((x) => x === 0)).toBe(true);
  });

  it("Witch's Hut düellosu: Morwen 2. dalgada tekrar gelmez", () => {
    expect(ENCOUNTERS.morwen_duel!.waves![0]!.units.some((u) => u.class === 'hedge_witch_morwen')).toBe(false);
  });
  it('elit savaşlar (tutorial Watchtower hariç): elle yazılmış takviye dalgası önce, lider kendi takımıyla SON dalgada; takviye eşlikçi kopyası değil', () => {
    const elites = map.nodes.filter((n) => n.type === 'elite' && n.encounter && n.id !== '3');
    expect(elites.length).toBeGreaterThanOrEqual(2);
    for (const n of elites) {
      const enc = ENCOUNTERS[n.encounter!]!;
      expect(enc.waves?.length, n.id).toBe(1);
      const last = enc.waves![0]!.units;
      expect(enc.units.some((u) => u.tier), n.id).toBe(false);
      expect(last.filter((u) => u.tier === 'elite').length, n.id).toBe(1);
      expect(enc.units.length, n.id).toBeGreaterThanOrEqual(2);
      expect(enc.units.length, n.id).toBeLessThanOrEqual(5);
      expect(sig(enc.units), n.id).not.toBe(sig(last.filter((u) => !u.tier)));
    }
    // Watchtower (tutorial) eski ekleme kuralında kalır
    expect(ENCOUNTERS.watchtower_tutorial!.waves).toBeUndefined();
  });
});
