import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { MOB_IMAGE_FILES } from '../src/game/icon-image-files';
import { resolveSprite } from '../src/game/art-registry';
import { passiveIconName, skillIconName } from '../src/ui/mob-icons';
import { MOB_VFX_SHEET_FILES, mobSheetId, vfxSheetFile } from '../src/game/vfx-sheet-files';
import { MOB_VFX_SPECS } from '../src/game/mob-vfx';
import { selectSkillVfx } from '../src/game/vfx-select';
import { MOB_POSES, mobPoseFrame } from '../src/game/mob-poses';

// Sefer mobu sanatı (Bölge II, ChatGPT 2026-10-16): boyalı skill/pasif ikonları (assets/mob-icons), 8 karelik efekt sheet'leri (assets/mob-vfx),
// poz sayfaları (assets/sprites/<id>/poses.png + data/mob-poses.json). İçe aktarma: tools/import-mob-art.mjs (+ tools/import-mobs.py çizimler).

const REGION2_SKILLS = ['billhook', 'peat_smoke', 'scatter_quarrels', 'shovel_of_embers', 'kiln_smoke', 'gatestone_slam', 'rockfall', 'pick_of_the_deep', 'oath_of_stone', 'rune_spark', 'glyph_of_breaking', 'cauldron_splash', 'hags_mark', 'clutch', 'dirge', 'call_the_buried', 'penance_flail', 'sanctuary', 'holy_ember', 'consecrate', 'bone_rite', 'requiem', 'unholy_benediction'];
const REGION2_PASSIVES = ['cut_and_run', 'last_ember', 'rebuke', 'stone_patience', 'deep_hoard', 'ward_etcher', 'mire_bound', 'flicker', 'corpse_hunger', 'bone_ward', 'martyrs_vow', 'censer_smoke', 'vessel_of_the_choir'];
const REGION1_SKILLS = ['shiv', 'sand_in_the_eyes', 'bite', 'rend', 'poachers_shot', 'tainted_bait', 'ravens_peck', 'murder_of_crows', 'chiefs_cleaver', 'toll_sweep', 'hold_the_tower'];
const REGION1_PASSIVES = ['grudge', 'head_start', 'pack_tactics', 'hide_in_the_brush', 'flock_shield', 'shares_of_the_dead'];
/** Eski mob skill'leri: ödünç sınıf ikonu yerine boyalı ikon (efekt hâlâ ödünç). */
const OLD_MOB_SKILL_ICONS = ['cudgel', 'hamstring', 'gnaw'];
const REGION1_MOBS = ['cutpurse', 'grey_wolf', 'ravenwood_poacher', 'raven_seer', 'bandit_chief'];
const mobPassiveIds = new Set(Object.values(content.mobs).flatMap((m) => (m.passive ? [m.passive.id] : [])));
const mobSkillIds = new Set(Object.values(content.mobs).flatMap((m) => m.skills));

describe('mob ikonları (assets/mob-icons)', () => {
  it('Bölge II\'nin 23 skill ve 13 pasifinin 128 + 64 px boyalı ikonu var; ikon adı görsele çözülür', () => {
    for (const id of [...REGION2_SKILLS, ...REGION2_PASSIVES]) {
      expect(MOB_IMAGE_FILES[id], id).toBeTruthy();
      expect(MOB_IMAGE_FILES[id]!.small, `${id} small`).not.toBe(MOB_IMAGE_FILES[id]!.url);
    }
    for (const id of REGION2_SKILLS) {
      const name = skillIconName(content.skills[id]!);
      expect(name).toBe(`mob:${id}`);
      expect(resolveSprite(name).image, id).toBeTruthy();
      expect(resolveSprite(name).smooth).toBe(true);
    }
    for (const id of REGION2_PASSIVES) expect(passiveIconName({ id, icon: 'eye' })).toBe(`mob:${id}`);
  });

  it('Bölge I: 11 skill + 6 pasif + eski Cudgel / Hamstring / Gnaw boyalı ikona çözülür', () => {
    for (const id of [...REGION1_SKILLS, ...OLD_MOB_SKILL_ICONS]) {
      expect(skillIconName(content.skills[id]!), id).toBe(`mob:${id}`);
      expect(resolveSprite(`mob:${id}`).image, id).toBeTruthy();
    }
    for (const id of REGION1_PASSIVES) {
      expect(mobPassiveIds.has(id), id).toBe(true);
      expect(passiveIconName({ id, icon: 'eye' })).toBe(`mob:${id}`);
    }
  });

  it('her dosya bir mob skill\'ine ya da pasifine bağlı; ikonu olmayan skill verideki ikonu korur; aslı assets/source/mob-icons', () => {
    for (const id of Object.keys(MOB_IMAGE_FILES)) expect(mobSkillIds.has(id) || mobPassiveIds.has(id), `${id} bağlantısız`).toBe(true);
    expect(skillIconName(content.skills['melee_attack']!)).toBe(content.skills['melee_attack']!.icon);
    expect(passiveIconName({ id: 'nope', icon: 'eye' })).toBe('eye');
    expect(existsSync('assets/source/mob-icons')).toBe(true);
    expect(existsSync('tools/import-mob-art.mjs')).toBe(true);
  });
});

describe('mob efekt sheet\'leri (assets/mob-vfx)', () => {
  const onDisk = readdirSync('assets/mob-vfx').flatMap((mob) => readdirSync(`assets/mob-vfx/${mob}`).filter((f) => f.endsWith('.png')).map((f) => mobSheetId(mob, f.replace(/\.png$/, ''))));

  it('diskteki her sheet listede, metası 8 kare x 256 ve bir MOB_VFX_SPECS satırına bağlı; aslı assets/source/mob-vfx', () => {
    expect(MOB_VFX_SHEET_FILES.map((f) => f.id).sort()).toEqual([...onDisk].sort());
    for (const f of MOB_VFX_SHEET_FILES) {
      expect(f.meta.frames, f.id).toBe(8);
      expect(f.meta.frame_size, f.id).toEqual([256, 256]);
      const meta = JSON.parse(readFileSync(`assets/mob-vfx/${f.owner}/${f.name}.json`, 'utf8')) as { source: string };
      expect(existsSync(meta.source), `${f.id} aslı`).toBe(true);
      expect(MOB_VFX_SPECS[f.name]?.mob, `${f.id} bağlantısız`).toBe(f.owner);
    }
  });

  it('sheet\'i olan mob skill\'i kendi efektini (v2) oynar, sesleri ödünç sahibinden; sheet\'i olmayan eski efektine düşer', () => {
    for (const [id, s] of Object.entries(MOB_VFX_SPECS)) {
      expect(mobSkillIds.has(id), id).toBe(true);
      if (!vfxSheetFile(mobSheetId(s.mob, id))) continue;
      const pick = selectSkillVfx(content.skills[id]!);
      expect(pick.version, id).toBe('v2');
      expect(s.impact).toBeGreaterThanOrEqual(0);
      expect(s.impact).toBeLessThan(8);
    }
    for (const id of REGION2_SKILLS) expect(MOB_VFX_SPECS[id], id).toBeDefined();
    for (const id of REGION1_SKILLS) {
      const s = MOB_VFX_SPECS[id];
      expect(s, id).toBeDefined();
      expect(vfxSheetFile(mobSheetId(s!.mob, id)), `${id} sheet`).toBeTruthy();
      expect(selectSkillVfx(content.skills[id]!).version, id).toBe('v2');
    }
  });
});

describe('Bölge I çizimleri', () => {
  it('beş yeni mob kendi çizimini kullanır (sprite + avatar diskte); Grey Wolf yatay çizim, spriteScale ile büyütülür', () => {
    for (const id of REGION1_MOBS) {
      expect(content.mobs[id]!.spriteId, id).toBe(id);
      expect(existsSync(`assets/sprites/${id}/idle.png`), id).toBe(true);
      expect(existsSync(`assets/avatars/${id}.png`), id).toBe(true);
    }
    expect(content.mobs['grey_wolf']!.spriteScale).toBeGreaterThan(1);
  });
});

describe('poz sayfaları (data/mob-poses.json)', () => {
  it('her kaydın dosyası var ve kareleri ızgarada', () => {
    for (const [id, def] of Object.entries(MOB_POSES)) {
      expect(existsSync(`assets/sprites/${id}/poses.png`), id).toBe(true);
      const n = def.cols * def.rows;
      for (const k of ['windup', 'release', 'channel', 'bless', 'strike', 'move', 'hit', 'defend', 'dying', 'dead'] as const) expect(def[k], `${id} ${k}`).toBeLessThan(n);
      for (const f of def.idle) expect(f).toBeLessThan(n);
    }
  });

  it('kare seçimi: hazırlık / vuruş skill türüne göre, boşta skill sürüyorsa vuruş karesi', () => {
    const d = MOB_POSES['high_priest_of_the_undying']!;
    expect(mobPoseFrame(d, 'cast', { target: 'single_enemy' })).toBe(d.windup);
    expect(mobPoseFrame(d, 'attack', { target: 'single_enemy' })).toBe(d.release);
    expect(mobPoseFrame(d, 'cast', { target: 'area_enemies' })).toBe(d.channel);
    expect(mobPoseFrame(d, 'attack', { target: 'single_ally' })).toBe(d.bless);
    expect(mobPoseFrame(d, 'attack', { motion: 'melee', target: 'single_enemy' })).toBe(d.strike);
    expect(mobPoseFrame(d, 'idle', { target: 'single_enemy' })).toBe(d.release);
    expect(mobPoseFrame(d, 'idle', null)).toBe(d.idle[0]);
    expect(mobPoseFrame(d, 'hit', null)).toBe(d.hit);
    expect(mobPoseFrame(d, 'death', null)).toBe(d.dying);
  });

  it('Bandit Chief: Cleaver 3->4, Toll Sweep 5->6 (skill\'e özel), Hold the Tower 7, darbe 9, yığılma 11->12, boşta 1/2', () => {
    const d = MOB_POSES['bandit_chief']!;
    expect(d).toBeDefined();
    const cleaver = { id: 'chiefs_cleaver', motion: 'melee', target: 'single_enemy' };
    expect(mobPoseFrame(d, 'cast', cleaver)).toBe(2);
    expect(mobPoseFrame(d, 'attack', cleaver)).toBe(3);
    const sweep = { id: 'toll_sweep', motion: 'melee', target: 'area_enemies' };
    expect(mobPoseFrame(d, 'cast', sweep)).toBe(4);
    expect(mobPoseFrame(d, 'attack', sweep)).toBe(5);
    const tower = { id: 'hold_the_tower', motion: 'cast', target: 'self' };
    expect(mobPoseFrame(d, 'cast', tower)).toBe(6);
    expect(mobPoseFrame(d, 'attack', tower)).toBe(6);
    expect(mobPoseFrame(d, 'hit', null)).toBe(8);
    expect(mobPoseFrame(d, 'death', null)).toBe(10);
    expect(d.dead).toBe(11);
    expect(d.idle).toEqual([0, 1]);
  });
});
