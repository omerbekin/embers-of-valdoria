import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { POSES, cycleFrames, frameExtent, keyFrame, poseBounds, poseClass, skillPoses, statePose, validatePoses, weaponFor } from '../src/game/poses';
import { partyWeapons, weaponItem } from '../src/game/pose-weapons';

// Poz kütüphanesi (Ömer 2026-10-11, Warrior denemesi; src/game/poses.ts, data/poses.json, tools/make-poses.mjs). Yalnızca sunum: motor
// `pose` alanını okumaz (golden kayıtlar aynı kalır: tests/golden.test.ts).

const root = join(__dirname, '..');
const pngs = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')).sort() : []);

describe('poz kütüphanesi verisi', () => {
  it('veri geçerli (durumlar, döngüler, el noktaları, varsayılan silah, item eşlemeleri)', () => {
    expect(validatePoses()).toEqual([]);
  });

  it('her poz ve silah görünümünün dosyası (tam + small) diskte; diskte bağlantısız dosya yok', () => {
    for (const def of Object.values(POSES.classes)) {
      const names = Object.keys(def.poses).sort();
      expect(pngs(join(root, 'assets/poses', def.dir))).toEqual(names);
      expect(pngs(join(root, 'assets/poses', def.dir, 'small'))).toEqual(names);
    }
    for (const [fam, f] of Object.entries(POSES.weapons)) {
      expect(pngs(join(root, 'assets/weapons', fam))).toEqual([...f.order].sort());
      expect(pngs(join(root, 'assets/weapons', fam, 'small'))).toEqual([...f.order].sort());
    }
    expect(readdirSync(join(root, 'assets/weapons')).sort()).toEqual(Object.keys(POSES.weapons).sort());
    expect(readdirSync(join(root, 'assets/poses')).sort()).toEqual(Object.values(POSES.classes).map((c) => c.dir).sort());
  });

  it('Warrior: 12 poz, spin 3 karelik döngü; genel durumlar (idle, step, hit, death) pozlara bağlı', () => {
    const def = poseClass('warrior')!;
    expect(Object.keys(def.poses)).toHaveLength(12);
    expect(cycleFrames(def, 'spin')).toEqual(['spin1', 'spin2', 'spin3']);
    expect(keyFrame(def, 'spin')).toBe('spin2'); // Reduced motion: tek anahtar kare
    expect(statePose(def, 'idle')).toBe('idle');
    expect(statePose(def, 'step')).toBe('step');
    expect(statePose(def, 'hit')).toBe('hit');
    expect(statePose(def, 'death')).toBe('kneel');
  });

  it('Warrior skill -> poz eşlemesi skills.json > pose alanından (bilinmeyen poz adı yok)', () => {
    const s = content.skills;
    expect(skillPoses('warrior', s['melee_attack'])).toEqual(['overhead', 'slash']);
    expect(skillPoses('warrior', s['whirlwind'])).toEqual(['spin']);
    expect(skillPoses('warrior', s['charge'])).toEqual(['step', 'slash']);
    expect(skillPoses('warrior', s['abyssal_cry'])).toEqual(['raise', 'channel']);
    for (const skill of Object.values(s)) {
      const list = skill.pose === undefined ? [] : Array.isArray(skill.pose) ? skill.pose : [skill.pose];
      for (const p of list) expect(Object.values(POSES.classes).some((d) => d.poses[p] || d.cycles[p]), `${skill.id}: poz ${p}`).toBe(true);
    }
    // pozu olmayan sınıf: boş (bugünkü davranış)
    expect(skillPoses('mage', s['melee_attack'])).toEqual([]);
    expect(poseClass('mage')).toBeNull();
  });

  it('ortak kare her pozun sınırını (gövde + silah) kapsar; ayaklar alt-ortada', () => {
    const def = poseClass('warrior')!;
    for (const w of [null, { family: 'swords', look: 'ornate', glow: '#fff' }, { family: 'axes', look: 'ornate' }]) {
      const { halfW, up } = frameExtent(def, w);
      for (const name of Object.keys(def.poses)) {
        const b = poseBounds(def, name, w);
        expect(b.x0).toBeGreaterThanOrEqual(def.canvas.footX - halfW - 1e-6);
        expect(b.x1).toBeLessThanOrEqual(def.canvas.footX + halfW + 1e-6);
        expect(b.y0).toBeGreaterThanOrEqual(def.canvas.footY - up - 1e-6);
        expect(b.y1).toBeLessThanOrEqual(def.canvas.footY);
      }
    }
  });
});

describe('silah görseli seçimi (aile + nadirlik)', () => {
  it('Common/Uncommon sade, Rare orta + ışıltı, Epic/Legendary süslü + ışıltı; item eşlemesi aileden önce gelir', () => {
    expect(weaponFor('warrior', { id: 'woodcutters_axe', family: 'axes', rarity: 'common' })).toEqual({ family: 'axes', look: 'plain' });
    expect(weaponFor('warrior', { id: 'bearded_axe', family: 'axes', rarity: 'uncommon' })).toEqual({ family: 'axes', look: 'plain' });
    expect(weaponFor('warrior', { id: 'bearded_axe', family: 'axes', rarity: 'rare' })).toEqual({ family: 'axes', look: 'bearded', glow: POSES.rarityGlow['rare'] });
    expect(weaponFor('warrior', { id: 'dane_axe', family: 'axes', rarity: 'epic' })).toEqual({ family: 'axes', look: 'ornate', glow: POSES.rarityGlow['epic'] });
    // 'Axes & Swords' ailesindeki kılıçlar kılıç görseli alır
    expect(weaponFor('warrior', { id: 'arming_sword', family: 'axes', rarity: 'rare' })).toEqual({ family: 'swords', look: 'engraved', glow: POSES.rarityGlow['rare'] });
    expect(weaponFor('warrior', { id: 'emberbrand', family: 'axes', rarity: 'legendary' })).toEqual({ family: 'swords', look: 'ornate', glow: POSES.rarityGlow['legendary'] });
  });

  it('silahsız ya da görseli olmayan aile (gürzler): sınıfın varsayılan silahı; pozsuz sınıf: null', () => {
    expect(weaponFor('warrior', null)).toEqual(POSES.classes['warrior']!.defaultWeapon);
    expect(weaponFor('warrior', { id: 'flanged_mace', family: 'maces', rarity: 'rare' })).toEqual(POSES.classes['warrior']!.defaultWeapon);
    expect(weaponFor('mage', { id: 'ash_staff', family: 'staves', rarity: 'common' })).toBeNull();
  });

  it('sefer / Endless donanımı: party-i = heroOrder[i]; örneğin kendi nadirliği katalogdan önce; silah olmayan yuva atlanır', () => {
    expect(weaponItem({ uid: 'a', id: 'bearded_axe', rolls: { rarity: 'epic', affixes: [] } })).toEqual({ id: 'bearded_axe', family: 'axes', rarity: 'epic' });
    expect(weaponItem({ uid: 'b', id: 'arming_sword' })).toEqual({ id: 'arming_sword', family: 'axes', rarity: 'rare' });
    expect(weaponItem(null)).toBeNull();
    const eq: Record<string, { uid: string; id: string } | null> = { h1: { uid: 'x', id: 'woodcutters_axe' }, h2: null };
    expect(partyWeapons(['h1', '', 'h2'], (id) => eq[id])).toEqual({ 'party-0': { id: 'woodcutters_axe', family: 'axes', rarity: 'common' } });
  });
});

describe('Pose Tester I / II (gizli debug class\'ları)', () => {
  const ids = ['pose_tester_1', 'pose_tester_2'];
  it('testOnly + hidden: rastgele havuz, sim, takım seçimi, sefer ve Endless dışı; Test Mode seçicisinde var', async () => {
    const { testClassIds } = await import('../src/game/test-mode');
    for (const id of ids) {
      const c = content.classes[id]!;
      expect(c.testOnly && c.hidden, id).toBe(true);
      expect(content.randomPool).not.toContain(id);
      expect(content.selectableClasses).not.toContain(id);
      expect(content.battles['random-battle']!.random!.pool).not.toContain(id);
      expect(testClassIds()).toContain(id);
      expect(c.skills).toHaveLength(4);
    }
  });

  it('skill\'ler gerçek skill kopyası: sanat sahibi gerçek sınıf, bedel 0, cooldown yok, ~1 hasar, tek poz; Warrior poz kütüphanesi', async () => {
    const { ownerOfSkill } = await import('../src/game/asset-versions');
    const poses = new Set<string>();
    for (const id of ids) {
      expect(poseClass(id)).toBe(poseClass('warrior'));
      for (const sid of content.classes[id]!.skills) {
        const s = content.skills[sid]!;
        const real = content.skills[s.artOf!]!;
        expect(real, sid).toBeDefined();
        expect(s.name).toBe(real.name);
        expect(s.vfx).toBe(real.vfx);
        expect(s.target).toBe(real.target);
        expect(s.area).toEqual(real.area);
        expect(s.cost.amount).toBe(0);
        expect(s.cooldown ?? 0).toBe(0);
        expect(s.initialCooldown ?? 0).toBe(0);
        for (const e of s.effects) if ('power' in e && typeof e.power === 'number') expect(e.power).toBeLessThanOrEqual(0.05);
        expect(ownerOfSkill(sid)).toBe(ownerOfSkill(real.id));
        expect(s.note).toMatch(/pose/i);
        const list = skillPoses(id, s);
        expect(list.length, sid).toBeGreaterThan(0);
        list.forEach((p) => poses.add(p));
      }
    }
    // kütüphanedeki her eylem pozu (idle/kneel hariç) en az bir skill'le denenebilir
    for (const p of ['slash', 'overhead', 'spin', 'step', 'raise', 'channel', 'throw', 'hit']) expect(poses, p).toContain(p);
  });
});
