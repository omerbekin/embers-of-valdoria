import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOB_VFX_SPECS } from '../src/game/mob-vfx';
import { MOB_IMAGE_FILES } from '../src/game/icon-image-files';
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
  // Harita 2'de kalan son Harita 1 birimleri de kendi sürümünde (content-designer 2026-10-27; Ömer: "evet lütfen hepsini yap artık"; open-questions 446)
  cinder_exile: ['ember_acolyte', 'Cinder Exile', ['pitch_brand', 'tar_blaze']],
  pitch_boiler: ['charcoal_burner', 'Pitch Boiler', ['hot_pitch', 'caulkers_smoke']],
  sunken_dead: ['drowned', 'Sunken Dead', ['waterlogged_grip', 'pull_beneath']],
  mire_ghoul: ['ghoul', 'Mire Ghoul', ['silt_rake', 'mire_gorge']],
  reed_witch: ['fen_witchling', 'Reed Witch', ['reed_hex', 'fen_rot']],
  mudlark: ['cutpurse', 'Mudlark', ['gutting_knife', 'bilge_splash']],
  inquisition_brother: ['oathsworn_brother', 'Inquisition Brother', ['salt_scourge', 'brann_vigil']],
  salt_chaplain: ['censer_monk', 'Salt Chaplain', ['blessed_salt', 'salted_ground']],
};

const OWN_ART = ['dock_rat', 'reef_hound', 'salt_hag', 'tide_caller', 'marsh_light', 'wreck_ghoul', 'cinder_exile', 'pitch_boiler', 'sunken_dead', 'mire_ghoul', 'reed_witch', 'mudlark', 'inquisition_brother', 'salt_chaplain'];
// river_reaver / cliff_crossbowman yalnız skill sanatı alır (kendi sprite'ları sonraki turda)
const OWN_ART_SKILLS = [...OWN_ART.flatMap((id) => OWN[id]![2]), 'raid_cut', 'boat_hook', 'cliff_bolt', 'plunging_volley', 'sodden_strike', 'riptide_slash'];

type Unit = { class: string; name?: string };
type Enc = { units: Unit[]; waves?: Array<{ units: Unit[] }>; objective?: string | { units?: Unit[] } };
const unitsOf = (all: Record<string, unknown>): Array<[string, Unit]> =>
  Object.entries(all)
    .filter(([k]) => !k.startsWith('_'))
    .flatMap(([k, e]) => {
      const enc = e as Enc;
      const reinforce = typeof enc.objective === 'object' ? (enc.objective.units ?? []) : []; // Break the Totem takviyesi
      return [...enc.units, ...(enc.waves ?? []).flatMap((w) => w.units), ...reinforce].map((u) => [k, u] as [string, Unit]);
    });
const map2Units = unitsOf(encounters as Record<string, unknown>);
const map1Classes = new Set(unitsOf(valdoriaEncounters as Record<string, unknown>).map(([, u]) => u.class));
const map1Skills = new Set([...map1Classes].flatMap((c) => content.mobs[c]?.skills ?? []));
const unitDef = (id: string) => content.mobs[id] ?? content.bosses[id] ?? content.summons[id];
/** Bir birimin savaşta tahtaya getirebildiği başka birimler: skill çağrıları + boss kuralları (bağlı nesne, faz dirilişi...). */
const spawnsOf = (id: string): string[] => {
  const def = unitDef(id);
  if (!def) return [];
  const fromSkills = def.skills.flatMap((s) => content.skills[s]!.effects.flatMap((e) => (e.type === 'summon' ? [e.unit] : [])));
  const fromRules = [...JSON.stringify((def as { boss?: unknown }).boss ?? {}).matchAll(/"unit":"([a-z_]+)"/g)].map((m) => m[1]!);
  return [...fromSkills, ...fromRules];
};

describe('Harita 2 sıradan mobları kendi id / kit / sesleriyle', () => {
  it('Harita 2\'nin HİÇBİR doğumunda (birim, dalga, totem takviyesi, çağrı, boss kuralı) Harita 1 birim id\'si yok', () => {
    const seen = new Set<string>();
    const queue = map2Units.map(([, u]) => u.class);
    while (queue.length) {
      const id = queue.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...spawnsOf(id));
    }
    const map1 = [...map1Classes, 'skeleton'];
    for (const id of seen) expect(map1, `Harita 2'de Harita 1 birimi: ${id}`).not.toContain(id);
    expect(seen).toContain('risen_drowned');
    expect(seen).toContain('hex_totem');
  });

  it('Harita 2 adlı her birim kendi id\'sinde', () => {
    for (const [k, u] of map2Units) {
      const own = Object.entries(OWN).find(([, [, name]]) => name === u.name);
      if (own) expect(u.class, `${k} ${u.name}`).toBe(own[0]);
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
      // art turu (2026-10-28): OWN_ART birimleri ve OWN_ART_SKILLS skill'leri kendi sanatında; kalanı hâlâ yer tutucu
      if (OWN_ART.includes(id)) expect(m.spriteId, `${id} kendi çizimi`).toBe(id);
      else expect(m.spriteId, `${id} yer tutucu çizim`).toBe(s.spriteId);
      for (const sk of kit) {
        expect(map1Skills.has(sk), `${sk} Harita 1 skill'i olmamalı`).toBe(false);
        if (OWN_ART_SKILLS.includes(sk)) expect(content.skills[sk]!.artOf, `${sk} ödünç sanat yasak`).toBeUndefined();
        else expect(content.skills[sk]!.artOf, sk).toBeTruthy();
      }
    }
    // Grudge kendi temel saldırısına bağlı
    expect(content.mobs.dock_rat!.passive?.effect).toMatchObject({ type: 'grudge', skill: 'belaying_pin' });
    // Zırh / büyü zırhı (stats içinde) ve pasifin tamamı da birebir (open-questions 446 birimleri)
    for (const id of ['cinder_exile', 'pitch_boiler', 'sunken_dead', 'mire_ghoul', 'reed_witch', 'mudlark', 'inquisition_brother', 'salt_chaplain']) {
      const [src] = OWN[id]!;
      expect([content.mobs[id]!.stats.armor, content.mobs[id]!.stats.magicArmor, content.mobs[id]!.passive], id).toEqual([content.mobs[src]!.stats.armor, content.mobs[src]!.stats.magicArmor, content.mobs[src]!.passive]);
      expect(content.mobs[id]!.stats.armor, id).toBeGreaterThan(0);
    }
  });

  it('Order birimleri Brann\'s Order ailesinde; Order karşılaşmaları (dr_27, Vell, Monk\'s Isle) yeni id\'lerle', () => {
    for (const id of ['inquisition_brother', 'salt_chaplain']) expect(content.mobs[id]!.family, id).toBe('branns_order');
    const enc = encounters as unknown as Record<string, Enc>;
    for (const k of ['dr_27', 'dr_32_vell', 'dr_monks_guard']) {
      const classes = enc[k]!.units.map((u) => u.class);
      expect(classes, k).toContain('inquisition_brother');
      expect(classes, k).toContain('salt_chaplain');
    }
  });

  it('Tide Caller Rise from the Deep kendi çağrısını (Risen Drowned) çağırır: Skeleton ile aynı statlar, kendi kit; Hex Totem kendi nesnesi', () => {
    expect(content.skills.rise_from_the_deep!.effects).toContainEqual(expect.objectContaining({ type: 'summon', unit: 'risen_drowned', lifespan: 3, consumeCorpse: true }));
    const r = content.summons.risen_drowned!;
    const s = content.summons.skeleton!;
    expect(r.name).toBe('Risen Drowned');
    const scale = (d: object) => [(d as { summonerScale?: unknown }).summonerScale, (d as { variants?: unknown }).variants];
    expect([r.attributes, r.stats, r.range, r.ai, r.tags, ...scale(r)], 'risen_drowned').toEqual([s.attributes, s.stats, s.range, s.ai, s.tags, ...scale(s)]);
    expect(scale(r)[0], 'çağıran ölçeği').toBeTruthy();
    expect(r.skills).toEqual(['sodden_strike', 'riptide_slash']);
    expect(r.spriteId, 'kendi sprite').toBe('risen_drowned');
    // Grave Chanter (Harita 1) hâlâ Skeleton çağırır
    expect(content.skills.call_the_buried!.effects).toContainEqual(expect.objectContaining({ type: 'summon', unit: 'skeleton' }));
    const t = content.bosses.hex_totem!;
    const m = content.bosses.iron_mooring!;
    expect([t.name, t.inert, t.stats, t.skills]).toEqual(['Hex Totem', true, m.stats, []]);
    expect((encounters as unknown as Record<string, Enc>).dr_13!.units.find((u) => (u as { objective?: boolean }).objective)?.class).toBe('hex_totem');
  });

  it('River Reaver ve Cliff Crossbowman ödünç Harita 1 skill\'i kullanmaz; River Reaver Undertow alır (maps-2-3.md 3.3)', () => {
    for (const id of ['river_reaver', 'cliff_crossbowman']) for (const sk of content.mobs[id]!.skills) expect(map1Skills.has(sk), `${id} ${sk}`).toBe(false);
    expect(content.mobs.river_reaver!.passive?.effect.type).toBe('undertow');
    expect(content.skills.boat_hook!).toMatchObject({ target: 'single_enemy', reach: 1 });
    expect(content.skills.brackish_tide!.effects.some((e) => e.type === 'ground' && e.ground === 'flooded')).toBe(true);
  });

  it('her yeni skill\'in kendi sesi var (Harita 1 sesi paylaşılmaz); hero-only Omen / Dark Bond yok', () => {
    const skills = [...Object.values(OWN).flatMap(([, , k]) => k), ...content.mobs.river_reaver!.skills, ...content.mobs.cliff_crossbowman!.skills, ...content.summons.risen_drowned!.skills];
    expect(skills).toHaveLength(34);
    expect(new Set(skills.flatMap((sk) => mobSoundsOf(sk))).size, 'her ses tarifi tek skill\'e ait').toBe(skills.flatMap((sk) => mobSoundsOf(sk)).length);
    for (const sk of skills) {
      expect(MOB_SKILL_SOUNDS[sk], sk).toBeDefined();
      expect(mobSoundsOf(sk).length, sk).toBeGreaterThan(0);
      for (const e of content.skills[sk]!.effects) if (e.type === 'status') expect(['omen', 'dark_bond'], sk).not.toContain(e.status);
    }
  });
});

describe('Harita 2 sıradan mob sanatı: kendi sprite / avatar / ikon / VFX (ödünç yok)', () => {
  it('6 mobun kendi idle + avatar dosyası ve kaynağı var', () => {
    for (const id of OWN_ART) {
      for (const f of [`assets/sprites/${id}/idle.png`, `assets/avatars/${id}.png`, `assets/source/mobs/${id}.png`]) expect(existsSync(f), f).toBe(true);
    }
  });

  it('34 skill: kendi VFX sayfası (8 kare) + kaynak + ikon, kendi mob satırı, v2 seçilir, artOf yok', () => {
    expect(OWN_ART_SKILLS).toHaveLength(34);
    for (const s of OWN_ART_SKILLS) {
      const spec = MOB_VFX_SPECS[s];
      expect(spec, `${s} MOB_VFX_SPECS`).toBeDefined();
      expect(content.skills[s]!.artOf, `${s} artOf`).toBeUndefined();
      expect(existsSync(`assets/source/mob-vfx/${spec!.mob}-${s}.png`), `${s} kaynak sayfa`).toBe(true);
      expect(existsSync(`assets/mob-vfx/${spec!.mob}/${s}.png`), `${s} sayfa`).toBe(true);
      expect(MOB_IMAGE_FILES[s], `${s} ikon`).toBeDefined();
      expect(existsSync(`assets/mob-icons/${s}.png`), `${s} ikon dosyası`).toBe(true);
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
