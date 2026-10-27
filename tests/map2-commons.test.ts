import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import encounters from '../data/campaign/drowned-reach-encounters.json';
import valdoriaEncounters from '../data/campaign/encounters.json';
import reach from '../data/campaign/drowned-reach.json';
import { MOB_SKILL_SOUNDS, mobSoundsOf } from '../src/game/mob-sfx';
import { MUSIC_TRACK_IDS, trackConfig, type MusicTrackId } from '../src/game/music';
import { battleTrack, mapSceneTrack } from '../src/ui/music';

// Harita 2 sıradan mobları kendi id'leriyle (content-designer 2026-10-27; Ömer: "Harita 2'de ödünç hiçbir şey kalmasın"; open-questions 442).
// yeni id -> [Harita 1 karşılığı, görünen ad, kit]
const OWN: Record<string, [string, string, string[]]> = {
  dock_rat: ['road_thug', 'Dock Rat', ['belaying_pin', 'cargo_net']],
  reef_hound: ['ash_hound', 'Reef Hound', ['brine_bite', 'breaker_rush']],
  salt_hag: ['fen_witchling', 'Salt Hag', ['salt_hex', 'brackish_tide']],
  tide_caller: ['grave_chanter', 'Tide Caller', ['tide_dirge', 'rise_from_the_deep']],
  marsh_light: ['will_o_wisp', 'Marsh Light', ['bog_spark', 'fen_glimmer']],
  wreck_ghoul: ['ghoul', 'Wreck Ghoul', ['barnacle_claw', 'wreck_feast']],
};
/** Belgede (maps-2-3.md 3.2 / 3.3) düz Harita 1 birimi olarak yazılanlar: Harita 2'de kalabilir. */
const CARRY_OVER = ['ember_acolyte', 'charcoal_burner', 'drowned', 'ghoul', 'fen_witchling', 'cutpurse', 'oathsworn_brother', 'censer_monk'];

type Unit = { class: string; name?: string };
type Enc = { units: Unit[]; waves?: Array<{ units: Unit[] }> };
const unitsOf = (all: Record<string, unknown>): Array<[string, Unit]> =>
  Object.entries(all)
    .filter(([k]) => !k.startsWith('_'))
    .flatMap(([k, e]) => [...(e as Enc).units, ...((e as Enc).waves ?? []).flatMap((w) => w.units)].map((u) => [k, u] as [string, Unit]));
const map2Units = unitsOf(encounters as Record<string, unknown>);
const map1Classes = new Set(unitsOf(valdoriaEncounters as Record<string, unknown>).map(([, u]) => u.class));
const map1Skills = new Set([...map1Classes].flatMap((c) => content.mobs[c]?.skills ?? []));

describe('Harita 2 sıradan mobları kendi id / kit / sesleriyle', () => {
  it('Harita 2 adlı her birim kendi id\'sinde; eski Harita 1 sınıfı yalnızca belgedeki düz birimler için kalır', () => {
    for (const [k, u] of map2Units) {
      const own = Object.entries(OWN).find(([, [, name]]) => name === u.name);
      if (own) expect(u.class, `${k} ${u.name}`).toBe(own[0]);
      if (map1Classes.has(u.class) && content.mobs[u.class]) expect(CARRY_OVER, `${k} ${u.class}`).toContain(u.class);
    }
    for (const id of Object.keys(OWN)) expect(map2Units.some(([, u]) => u.class === id), id).toBe(true);
    // Chandlers' Row (dr_30): belgede "Dock Rats"
    expect((encounters as unknown as Record<string, Enc>).dr_30!.units.filter((u) => u.class === 'dock_rat')).toHaveLength(2);
  });

  it('statlar Harita 1 karşılığıyla aynı (karşılaşma gücü değişmez); kit kendi, aynı rol; çizim yer tutucu', () => {
    for (const [id, [src, name, kit]] of Object.entries(OWN)) {
      const m = content.mobs[id]!;
      const s = content.mobs[src]!;
      expect(m.name, id).toBe(name);
      expect(m.skills, id).toEqual(kit);
      expect(m.attributes, id).toEqual(s.attributes);
      expect(m.stats, id).toEqual(s.stats);
      expect([m.range, m.ai, m.family], id).toEqual([s.range, s.ai, s.family]);
      expect(m.passive?.effect.type, id).toBe(s.passive?.effect.type);
      expect(m.spriteId, `${id} yer tutucu çizim`).toBe(s.spriteId);
      for (const sk of kit) {
        expect(map1Skills.has(sk), `${sk} Harita 1 skill'i olmamalı`).toBe(false);
        expect(content.skills[sk]!.artOf, sk).toBeTruthy();
      }
    }
    // Grudge kendi temel saldırısına bağlı
    expect(content.mobs.dock_rat!.passive?.effect).toMatchObject({ type: 'grudge', skill: 'belaying_pin' });
  });

  it('River Reaver ve Cliff Crossbowman ödünç Harita 1 skill\'i kullanmaz; River Reaver Undertow alır (maps-2-3.md 3.3)', () => {
    for (const id of ['river_reaver', 'cliff_crossbowman']) for (const sk of content.mobs[id]!.skills) expect(map1Skills.has(sk), `${id} ${sk}`).toBe(false);
    expect(content.mobs.river_reaver!.passive?.effect.type).toBe('undertow');
    expect(content.skills.boat_hook!).toMatchObject({ target: 'single_enemy', reach: 1 });
    expect(content.skills.brackish_tide!.effects.some((e) => e.type === 'ground' && e.ground === 'flooded')).toBe(true);
  });

  it('her yeni skill\'in kendi sesi var (Harita 1 sesi paylaşılmaz); hero-only Omen / Dark Bond yok', () => {
    const skills = [...Object.values(OWN).flatMap(([, , k]) => k), ...content.mobs.river_reaver!.skills, ...content.mobs.cliff_crossbowman!.skills];
    expect(skills).toHaveLength(16);
    for (const sk of skills) {
      expect(MOB_SKILL_SOUNDS[sk], sk).toBeDefined();
      expect(mobSoundsOf(sk).length, sk).toBeGreaterThan(0);
      for (const e of content.skills[sk]!.effects) if (e.type === 'status') expect(['omen', 'dark_bond'], sk).not.toContain(e.status);
    }
  });
});

describe('Harita 2 müzikleri (kendi harita / kasaba / savaş parçaları + Weir-Wyrm / Vane fazları)', () => {
  const own: MusicTrackId[] = ['map_reach', 'town_reach', 'battle_reach'];

  it('harita verisi kendi parçalarını gösterir; Harita 1 ortak parçada kalır', () => {
    expect(reach.music).toEqual({ map: 'map_reach', town: 'town_reach', battle: 'battle_reach' });
    for (const t of Object.values(reach.music)) expect(MUSIC_TRACK_IDS).toContain(t);
    expect(mapSceneTrack(reach.music, 'town')).toBe('town_reach');
    expect(mapSceneTrack(undefined, 'map')).toBe('map');
    expect(battleTrack([{ defId: 'dock_rat' }], 'battle_reach')).toBe('battle_reach');
    expect(battleTrack([{ defId: 'weir_wyrm', tier: 'boss' }], 'battle_reach')).toBe('boss_wyrm');
  });

  it('aynı yapı ve seviye: Harita 1 karşılığıyla aynı ölçek, ama farklı anahtar / kip ve ezgiler', () => {
    const pairs: Array<[MusicTrackId, MusicTrackId]> = [['map_reach', 'map'], ['town_reach', 'town'], ['battle_reach', 'battle']];
    for (const [n, o] of pairs) {
      const a = trackConfig(n);
      const b = trackConfig(o);
      expect(a.master, n).toBe(b.master);
      expect(a.beatsPerBar, n).toBe(b.beatsPerBar);
      expect(a.form.length, n).toBe(b.form.length);
      expect(a.cycles.length, n).toBeGreaterThanOrEqual(4);
      expect(Math.abs(a.voices.drum.gain - b.voices.drum.gain), n).toBeLessThanOrEqual(0.02);
      expect(`${a.tonic}/${a.mode}`, n).not.toBe(`${b.tonic}/${b.mode}`);
      expect(a.harpPatterns, n).not.toEqual(b.harpPatterns);
    }
    expect(trackConfig('battle_reach').voices.harp.shift).toBe(-12);
    for (const t of own) expect(trackConfig(t).sections, t).toBeDefined();
  });

  it('Weir-Wyrm ve Admiral Vane fazları aynı parçanın hızlanan hâli', () => {
    for (const b of ['boss_wyrm', 'boss_vane'] as const) {
      const [p1, p2, p3] = [trackConfig(b), trackConfig(`${b}2` as MusicTrackId), trackConfig(`${b}3` as MusicTrackId)];
      expect(p2.bpm, b).toBeGreaterThan(p1.bpm);
      expect(p3.bpm, b).toBeGreaterThan(p2.bpm);
      expect([p2.tonic, p3.mode, p3.beatsPerBar], b).toEqual([p1.tonic, p1.mode, p1.beatsPerBar]);
      expect(p3.voices.drum.gain, b).toBeGreaterThan(p1.voices.drum.gain);
      expect(p3.themes, b).toEqual(p1.themes);
    }
    expect(battleTrack([{ defId: 'admiral_vane', tier: 'boss', phase: 3 }])).toBe('boss_vane3');
    expect(battleTrack([{ defId: 'weir_wyrm', tier: 'boss', phase: 2 }])).toBe('boss_wyrm2');
  });
});
