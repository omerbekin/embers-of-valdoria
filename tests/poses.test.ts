import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { POSES, cycleFrames, frameExtent, gripFrames, itemPlacement, keyFrame, placementPoint, poseBounds, poseClass, poseGrip, poseItems, poseSkill, realPosesV2, resolvePose, setRealPosesV2, skillPoses, statePose, toneImageData, rarityToneOf, validatePoses, weaponFor, weaponKey } from '../src/game/poses';
import { POSE_TESTER_GEAR, classDefaultGear, offhandItem, partyWeapons, unitWeaponPick, weaponItem } from '../src/game/pose-weapons';

// Poz kütüphanesi (Ömer 2026-10-11, Warrior denemesi; v2 tek el + çift el takımı 2026-10-12, yalnızca Pose Tester'lar; src/game/poses.ts,
// data/poses.json, tools/make-poses.mjs + tools/make-poses-v2.mjs). Yalnızca sunum: motor `pose` alanını okumaz (golden kayıtlar aynı).

const root = join(__dirname, '..');
const pngs = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')).sort() : []);
const inst = (id: string) => ({ uid: id, id });
/** Debug karşılaştırması: gerçek sınıflar eski (v1) çizimde (Warrior v1 pozları, diğerleri pozsuz). */
const v1 = (fn: () => void) => {
  setRealPosesV2(false);
  try {
    fn();
  } finally {
    setRealPosesV2(true);
  }
};

describe('poz kütüphanesi verisi', () => {
  it('veri geçerli (durumlar, döngüler, tutuş takımları, el noktaları, varsayılan silah, item eşlemeleri)', () => {
    expect(validatePoses()).toEqual([]);
  });

  it('her poz ve silah görünümünün dosyası (tam + small) diskte; diskte bağlantısız dosya yok', () => {
    for (const def of Object.values(POSES.classes)) {
      const names = [...Object.keys(def.poses), ...Object.values(def.poses).flatMap((p) => (p.fingers ? [p.fingers] : []))].sort(); // + ön parmak katmanları
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

  it('Warrior (v1, değişmedi): 12 poz, spin 3 karelik döngü; genel durumlar (idle, step, hit, death) pozlara bağlı', () => {
    const def = POSES.classes['warrior']!;
    expect(def.grips).toBeUndefined();
    expect(Object.keys(def.poses)).toHaveLength(12);
    expect(cycleFrames(def, 'spin')).toEqual(['spin1', 'spin2', 'spin3']);
    expect(keyFrame(def, 'spin')).toBe('spin2'); // Reduced motion: tek anahtar kare
    expect(statePose(def, 'idle')).toBe('idle');
    expect(statePose(def, 'step')).toBe('step');
    expect(statePose(def, 'hit')).toBe('idle'); // isabet: boşta pozu + kodla geri eğilme (hit görseli arkadan darbe gibi okunuyordu)
    expect(def.hitRecoil?.leanDeg).toBeGreaterThan(0);
    expect(statePose(def, 'death')).toBe('kneel');
    // tutuş v1'de yok sayılır (tek takım)
    expect(statePose(def, 'idle', 'two')).toBe('idle');
  });

  it('Warrior skill -> poz eşlemesi skills.json > pose alanından (her poz adı bir sınıfta çözülüyor)', () => v1(() => {
    const s = content.skills;
    expect(skillPoses('warrior', s['melee_attack'])).toEqual(['overhead', 'slash']);
    expect(skillPoses('warrior', s['whirlwind'])).toEqual(['spin']);
    expect(skillPoses('warrior', s['charge'])).toEqual(['step', 'slash']);
    expect(skillPoses('warrior', s['headsmans_blow'])).toEqual(['overhead', 'slash']); // yer tutucu (Abyssal Cry'ın yerine, 2026-10-17)
    for (const skill of Object.values(s)) {
      const list = skill.pose === undefined ? [] : Array.isArray(skill.pose) ? skill.pose : [skill.pose];
      for (const p of list)
        expect(
          Object.values(POSES.classes).some((d) => (['one', 'two'] as const).some((g) => d.poses[resolvePose(d, p, g)] || d.cycles[resolvePose(d, p, g)])),
          `${skill.id}: poz ${p}`,
        ).toBe(true);
    }
    // pozu olmayan sınıf: boş (bugünkü davranış)
    expect(skillPoses('mage', s['melee_attack'])).toEqual([]);
    expect(poseClass('mage')).toBeNull();
  }));

  it('ortak kare her pozun sınırını (gövde + silah + ikinci el) kapsar; ayaklar alt-ortada', () => {
    const picks = [null, { family: 'swords', look: 'ornate', glow: '#fff' }, { family: 'axes', look: 'ornate' }, { family: 'maces', look: 'flanged', offhand: { family: 'shields', look: 'tower' } }, { family: 'greataxes', look: 'double', grip: 'two' as const }, { family: 'staves', look: 'rune', grip: 'two' as const }];
    for (const def of Object.values(POSES.classes))
      for (const w of picks) {
        const { halfW, up } = frameExtent(def, w);
        for (const name of gripFrames(def, w?.grip)) {
          const b = poseBounds(def, name, w);
          expect(b.x0).toBeGreaterThanOrEqual(def.canvas.footX - halfW - 1e-6);
          expect(b.x1).toBeLessThanOrEqual(def.canvas.footX + halfW + 1e-6);
          expect(b.y0).toBeGreaterThanOrEqual(def.canvas.footY - up - 1e-6);
          expect(b.y1).toBeLessThanOrEqual(def.canvas.footY);
        }
      }
  });
});

describe('v2 poz takımı: tutuşa göre seçim (warrior_v2, Pose Tester\'lar)', () => {
  const def = POSES.classes['warrior_v2']!;
  it('13 ortak poz: silah pozları tek el (…1) ve çift el (…2), ortaklar tek + yay (bow_shot, bow_sky); 26 kare', () => {
    expect(Object.keys(def.poses)).toHaveLength(26);
    for (const n of ['idle', 'step', 'slash', 'overhead', 'thrust', 'guard']) {
      expect(resolvePose(def, n, 'one')).toBe(`${n}1`);
      expect(resolvePose(def, n, 'two')).toBe(`${n}2`);
    }
    expect(cycleFrames(def, 'spin', 'one')).toEqual(['spin1a', 'spin1b', 'spin1c']);
    expect(cycleFrames(def, 'spin', 'two')).toEqual(['spin2a', 'spin2b', 'spin2c']);
    for (const n of ['raise', 'channel', 'point', 'throw', 'hit', 'kneel']) for (const g of ['one', 'two'] as const) expect(resolvePose(def, n, g)).toBe(n);
  });

  it('grip one / silahsız -> tek el; two -> çift el; bow -> yay takımı (tek el + bow_shot / bow_sky); charm -> tek el', () => {
    expect(poseGrip(def, undefined)).toBe('one');
    expect(poseGrip(def, 'two')).toBe('two');
    expect(poseGrip(def, 'bow')).toBe('bow');
    // yatay atış (shot) ve göğe atış (sky): yayda kendi kareleri, başka tutuşta thrust / raise
    expect(resolvePose(def, 'shot', 'bow')).toBe('bow_shot');
    expect(resolvePose(def, 'thrust', 'bow')).toBe('bow_shot');
    expect(resolvePose(def, 'sky', 'bow')).toBe('bow_sky');
    expect(resolvePose(def, 'shot', 'one')).toBe('thrust1');
    expect(resolvePose(def, 'shot', 'two')).toBe('thrust2');
    expect(resolvePose(def, 'sky', 'two')).toBe('raise');
    expect(poseGrip(def, 'charm')).toBe('one');
    expect(statePose(def, 'idle', 'two')).toBe('idle2');
    expect(statePose(def, 'idle', 'bow')).toBe('idle1');
  });

  it('durumlar: idle, step, attack = slash, cast = raise, defend = guard1/guard2, hit = önden isabet, death = diz çökme', () => {
    const want: Record<string, [string, string]> = { idle: ['idle1', 'idle2'], step: ['step1', 'step2'], attack: ['slash1', 'slash2'], cast: ['raise', 'raise'], defend: ['guard1', 'guard2'], hit: ['hit', 'hit'], death: ['kneel', 'kneel'] };
    for (const [state, [one, two]] of Object.entries(want)) {
      expect(statePose(def, state, 'one'), state).toBe(one);
      expect(statePose(def, state, 'two'), state).toBe(two);
    }
  });

  it('pişen kareler tutuşun takımı + ortaklar (öteki takımın kareleri yok)', () => {
    const one = gripFrames(def, 'one');
    const two = gripFrames(def, 'two');
    expect(one).toHaveLength(15); // 9 tutuş karesi + 6 ortak
    expect(two).toHaveLength(15);
    expect(one).toContain('idle1');
    expect(one).not.toContain('idle2');
    expect(two).toContain('spin2b');
    expect(two).toContain('point');
    expect(gripFrames(def, 'charm')).toEqual(one);
    expect(one).not.toContain('bow_shot');
    const bow = gripFrames(def, 'bow');
    expect(bow).toHaveLength(16); // 8 tek el karesi (thrust1 yerine bow_shot) + 2 yay + 6 ortak
    expect(bow).toEqual(expect.arrayContaining(['bow_shot', 'bow_sky', 'idle1']));
    expect(bow).not.toContain('thrust1');
    // her karede ikinci el noktası (kalkan / ikinci hançer / kabzadaki el)
    for (const [n, p] of Object.entries(def.poses)) expect(p.offhand, n).toBeDefined();
  });
});

describe('silah görseli seçimi (aile + nadirlik + tutuş + ikinci el)', () => {
  it('Common/Uncommon sade, Rare orta + ışıltı, Epic/Legendary süslü + ışıltı; item eşlemesi aileden önce gelir (v1 Warrior)', () => v1(() => {
    expect(weaponFor('warrior', { id: 'woodcutters_axe', family: 'axes', rarity: 'common' })).toEqual({ family: 'axes', look: 'plain' });
    expect(weaponFor('warrior', { id: 'bearded_axe', family: 'axes', rarity: 'uncommon' })).toEqual({ family: 'axes', look: 'plain' });
    expect(weaponFor('warrior', { id: 'bearded_axe', family: 'axes', rarity: 'rare' })).toEqual({ family: 'axes', look: 'bearded', glow: POSES.rarityGlow['rare'] });
    // v1 Warrior tek takımlı: çift el balta da tek el balta görseli (eski görünüm)
    expect(weaponFor('warrior', { id: 'dane_axe', family: 'axes', rarity: 'epic', grip: 'two' })).toEqual({ family: 'axes', look: 'ornate', glow: POSES.rarityGlow['epic'] });
    // 'Axes & Swords' ailesindeki kılıçlar kılıç görseli alır
    expect(weaponFor('warrior', { id: 'arming_sword', family: 'axes', rarity: 'rare' })).toEqual({ family: 'swords', look: 'engraved', glow: POSES.rarityGlow['rare'] });
    expect(weaponFor('warrior', { id: 'emberbrand', family: 'axes', rarity: 'legendary' })).toEqual({ family: 'swords', look: 'ornate', glow: POSES.rarityGlow['legendary'] });
  }));

  it('silahsız: sınıfın varsayılan silahı; gürzler artık kendi görseli; pozsuz sınıf: null (v1 çizimi)', () => v1(() => {
    expect(weaponFor('warrior', null)).toEqual(POSES.classes['warrior']!.defaultWeapon);
    expect(weaponFor('warrior', { id: 'flanged_mace', family: 'maces', rarity: 'common' })).toEqual({ family: 'maces', look: 'flanged' });
    expect(weaponFor('mage', { id: 'ash_staff', family: 'staves', rarity: 'common' })).toBeNull();
    expect(weaponFor('skeleton', null)).toBeNull();
  }));

  it('v2 (Pose Tester): çift el item çift el takımı + çift el görseli (Dane Axe, Avenger\'s Maul, asalar)', () => {
    const pt = 'pose_tester_1';
    expect(weaponFor(pt, weaponItem(inst('dane_axe')))).toEqual({ family: 'greataxes', look: 'dane', glow: POSES.rarityGlow['epic'], tone: 'epic', grip: 'two' });
    expect(weaponFor(pt, weaponItem(inst('avengers_maul')))).toMatchObject({ family: 'mauls', grip: 'two' });
    expect(weaponFor(pt, weaponItem(inst('rune_staff')))).toMatchObject({ family: 'staves', look: 'rune', grip: 'two' });
    expect(weaponFor(pt, weaponItem(inst('arming_sword')))).toMatchObject({ family: 'swords' });
    expect(weaponFor(pt, weaponItem(inst('arming_sword')))?.grip).toBeUndefined();
    expect(weaponFor(pt, weaponItem(inst('hunting_bow')))).toMatchObject({ family: 'bows', grip: 'bow' });
    // tılsımlar item'e göre görünüm
    expect(weaponFor(pt, weaponItem(inst('hex_doll')))).toMatchObject({ family: 'charms', look: 'doll', grip: 'charm' });
    expect(weaponFor(pt, weaponItem(inst('worn_deck')))).toMatchObject({ family: 'charms', look: 'cards' });
    expect(weaponFor(pt, weaponItem(inst('gamblers_last_coin')))).toMatchObject({ family: 'charms', look: 'coin' });
  });

  it('çift el yakın dövüş tabanları (Greataxe, Greatsword, War Maul): taban başına tek görünüm, nadirlik yalnızca ton (Ömer 2026-10-17)', () => {
    const pt = 'pose_tester_1';
    const at = (id: string, rarity: 'common' | 'uncommon' | 'rare' | 'epic') => weaponFor(pt, weaponItem({ uid: id, id, rolls: { rarity, affixes: [] } }))!;
    for (const id of ['greataxe', 'greatsword', 'war_maul']) {
      const looks = new Set((['common', 'uncommon', 'rare', 'epic'] as const).map((r) => `${at(id, r).family}/${at(id, r).look}`));
      expect(looks.size, id).toBe(1); // tek çizim
      expect(at(id, 'common').grip).toBe('two');
      expect(at(id, 'common').tone).toBe('common');
      expect(at(id, 'uncommon').tone).toBe('uncommon');
      expect(at(id, 'rare').tone).toBeUndefined(); // Rare = çizimin kendisi
      expect(at(id, 'epic').tone).toBe('epic');
      // ton atlas anahtarına girer (farklı nadirlik = ayrı pişmiş doku)
      expect(weaponKey(at(id, 'common'))).not.toBe(weaponKey(at(id, 'epic')));
    }
    // Paket 8: üç tabanın kendi çizimi (greataxes/greataxe, greatswords/greatsword, mauls/warmaul)
    expect(at('greataxe', 'rare')).toMatchObject({ family: 'greataxes', look: 'greataxe' });
    expect(at('war_maul', 'rare')).toMatchObject({ family: 'mauls', look: 'warmaul' });
    expect(at('greatsword', 'rare')).toMatchObject({ family: 'greatswords', look: 'greatsword' });
    // Legendary tonlanmaz (kendi çizimi)
    expect(weaponFor(pt, weaponItem(inst('avengers_maul')))?.tone).toBeUndefined();
  });

  it('nadirlik tonu: pikselleri soldurur / parlatır, alfa ve saydam piksel değişmez', () => {
    const px = new Uint8ClampedArray([200, 100, 50, 255, 9, 9, 9, 0]);
    toneImageData(px, POSES.rarityTone!['common']!);
    expect(px[0]).toBeLessThan(200);
    expect(px[0]! - px[2]!).toBeLessThan(150); // doygunluk düştü
    expect(px[3]).toBe(255);
    expect([px[4], px[5], px[6], px[7]]).toEqual([9, 9, 9, 0]);
    const ep = new Uint8ClampedArray([100, 80, 60, 255]);
    toneImageData(ep, POSES.rarityTone!['epic']!);
    expect(ep[0]).toBeGreaterThan(100);
    expect(rarityToneOf('legendary')).toBeUndefined();
    expect(rarityToneOf('rare')).toBeUndefined();
  });

  it('ikinci el: tek el silahla kalkan / hançer çizilir; çift el, yay ve tılsım ikinci eli kapatır; anahtar ikinci eli içerir', () => {
    const pt = 'pose_tester_2';
    const mace = weaponItem(inst('flanged_mace'));
    const shield = weaponFor(pt, mace, offhandItem(inst('oak_shield')))!;
    expect(shield.offhand).toEqual({ family: 'shields', look: 'tower', tone: 'uncommon' });
    expect(weaponFor(pt, mace, offhandItem(inst('misericorde')))?.offhand).toEqual({ family: 'daggers', look: 'plain' });
    expect(weaponFor(pt, weaponItem(inst('dane_axe')), offhandItem(inst('oak_shield')))?.offhand).toBeUndefined();
    expect(weaponFor(pt, weaponItem(inst('hunting_bow')), offhandItem(inst('oak_shield')))?.offhand).toBeUndefined();
    expect(weaponFor(pt, null, offhandItem(inst('oak_shield')))?.offhand).toEqual({ family: 'shields', look: 'tower', tone: 'uncommon' }); // silahsız + kalkan
    expect(weaponKey(shield)).not.toBe(weaponKey({ family: 'maces', look: 'flanged' }));
    // v1 Warrior ikinci eli çizmez (eski görünüm)
    v1(() => expect(weaponFor('warrior', mace, offhandItem(inst('oak_shield')))?.offhand).toBeUndefined());
  });

  it('sefer / Endless donanımı: party-i = heroOrder[i]; örneğin kendi nadirliği katalogdan önce; tutuş ve ikinci el taşınır', () => {
    expect(weaponItem({ uid: 'a', id: 'bearded_axe', rolls: { rarity: 'epic', affixes: [] } })).toEqual({ id: 'bearded_axe', family: 'axes', rarity: 'epic', grip: 'one' });
    expect(weaponItem({ uid: 'b', id: 'arming_sword' })).toEqual({ id: 'arming_sword', family: 'axes', rarity: 'rare', grip: 'one' });
    expect(weaponItem(null)).toBeNull();
    const eq: Record<string, { uid: string; id: string } | null> = { h1: { uid: 'x', id: 'woodcutters_axe' }, h2: null };
    expect(partyWeapons(['h1', '', 'h2'], (id) => eq[id])).toEqual({ 'party-0': { id: 'woodcutters_axe', family: 'axes', rarity: 'common', grip: 'one' } });
    const off: Record<string, { uid: string; id: string } | null> = { h1: { uid: 's', id: 'oak_shield' }, h2: null };
    expect(partyWeapons(['h1'], (id) => eq[id], (id) => off[id])['party-0']?.offhand).toMatchObject({ id: 'oak_shield', shield: true });
  });
});

describe('Pose Tester I ... XI (gizli debug class\'ları, v2 pozlar)', () => {
  const ids = Array.from({ length: 11 }, (_, i) => `pose_tester_${i + 1}`);
  const realOf = ['warrior', 'defender', 'paladin', 'archer', 'cutthroat', 'mage', 'druid', 'undead', 'antimage', 'gambler', 'hexer'];

  it('testOnly + hidden: rastgele havuz, sim, takım seçimi, sefer ve Endless dışı; Test Mode seçicisinde var; adında sınıfı', async () => {
    const { testClassIds } = await import('../src/game/test-mode');
    ids.forEach((id, i) => {
      const c = content.classes[id]!;
      expect(c.testOnly && c.hidden, id).toBe(true);
      expect(content.randomPool).not.toContain(id);
      expect(content.selectableClasses).not.toContain(id);
      expect(content.battles['random-battle']!.random!.pool).not.toContain(id);
      expect(testClassIds()).toContain(id);
      expect(c.skills).toHaveLength(4);
      expect(c.name).toContain(`(${content.classes[realOf[i]!]!.name})`);
      expect(POSE_TESTER_GEAR[id], id).toBeDefined();
    });
  });

  it('oyundaki tüm sınıf skill\'leri kapsanıyor; kopyalar: sanat sahibi gerçek sınıf, bedel 0, cooldown yok, ~1 hasar; v2 poz kütüphanesi', async () => {
    const { ownerOfSkill } = await import('../src/game/asset-versions');
    const poses = new Set<string>();
    const covered = new Set<string>();
    for (const id of ids) {
      // kendi v2 gövdesi varsa o (tools/make-poses-v2.mjs --class=<sınıf>), yoksa Warrior v2
      const own = `${realOf[ids.indexOf(id)]}_v2`;
      expect(poseClass(id)).toBe(POSES.classes[POSES.classes[own] ? own : 'warrior_v2']);
      for (const sid of content.classes[id]!.skills) {
        const s = content.skills[sid]!;
        const real = content.skills[s.artOf!]!;
        expect(real, sid).toBeDefined();
        covered.add(real.id);
        expect(s.name).toBe(real.name);
        expect(s.vfx).toBe(real.vfx);
        expect(s.target).toBe(real.target);
        expect(s.area).toEqual(real.area);
        expect(s.effects.map((e) => e.type)).toEqual(real.effects.map((e) => e.type));
        expect(s.cost.amount).toBe(0);
        expect(s.cooldown ?? 0).toBe(0);
        expect(s.initialCooldown ?? 0).toBe(0);
        for (const e of s.effects) if ('power' in e && typeof e.power === 'number') expect(e.power).toBeLessThanOrEqual(0.05);
        expect(ownerOfSkill(sid)).toBe(ownerOfSkill(real.id));
        expect(s.note).toMatch(/pose/i);
        const list = skillPoses(id, s);
        expect(list.length, sid).toBeGreaterThan(0);
        expect(s.pose, `${sid} açık poz`).toBeDefined();
        list.forEach((p) => poses.add(p));
      }
    }
    for (const cls of realOf) for (const sid of content.classes[cls]!.skills) expect(covered, sid).toContain(sid);
    // v2'nin her eylem pozu en az bir skill'le denenebilir (idle/hit/kneel: durumlar ve debug tepkileri)
    for (const p of ['slash', 'overhead', 'thrust', 'spin', 'step', 'guard', 'raise', 'channel', 'point', 'throw']) expect(poses, p).toContain(p);
    expect(skillPoses('pose_tester_5', content.skills['pt_backstab'])).toEqual(['thrust']);
    expect(skillPoses('pose_tester_6', content.skills['pt_fire_bolt'])).toEqual(['thrust']); // asa öne uzanır, ok asanın ucundan (2026-10-12 denetim)
    expect(skillPoses('pose_tester_4', content.skills['pt_quick_shot'])).toEqual(['shot']); // yayda bow_shot (kiriş eli yanakta)
    expect(skillPoses('pose_tester_4', content.skills['pt_arrow_rain'])).toEqual(['sky']); // yayda bow_sky
    expect(skillPoses('pose_tester_2', content.skills['pt_close_ranks'])).toEqual(['guard']); // gerçek koruma pozu (eski kodla savunma hareketi yok)
    expect(POSES.braceSkills ?? []).not.toContain('pt_close_ranks');
  });
});

describe('v2 aile x poz yerleşimi (itemPoses; 2026-10-12 poz denetimi, yeni çizim yok)', () => {
  const def = POSES.classes['warrior_v2']!;
  const lowest = (pose: string, family: string, look: string) => {
    const pl = itemPlacement(def, pose, { family, look }, 'main')!;
    return Math.max(...[[0, 0], [pl.w, 0], [0, pl.h], [pl.w, pl.h]].map(([x, y]) => placementPoint(pl, x!, y!).y));
  };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it('gerçek Warrior (v1) ayarsız: yerleşim el noktası + açı aynen', () => {
    const v1 = POSES.classes['warrior']!;
    expect(v1.itemPoses).toBeUndefined();
    for (const pose of Object.keys(v1.poses)) {
      const pl = itemPlacement(v1, pose, v1.defaultWeapon, 'main');
      if (!pl) continue;
      expect([pl.x, pl.y, pl.angle]).toEqual([v1.poses[pose]!.anchor.x, v1.poses[pose]!.anchor.y, v1.poses[pose]!.anchor.angle]);
    }
  });

  it('uzun çift el silahlar idle2 / fırlatma / isabette yere gömülmez (alt uç taban çizgisinde ya da üstünde)', () => {
    for (const [family, look] of [['staves', 'rune'], ['greataxes', 'dane'], ['mauls', 'maul']] as const)
      for (const pose of ['idle2', 'throw', 'point', 'hit']) expect(lowest(pose, family, look), `${family} ${pose}`).toBeLessThanOrEqual(def.canvas.footY + 2);
  });

  it("açık el (point / throw): tılsım fırlatışta elden çıkar, point'te açık elde; silah öteki yumrukta; ikinci el hançeri / kılıcı açık elde çizilmez", () => {
    expect(def.poses['point']!.open).toBe('off');
    expect(def.poses['throw']!.open).toBe('off');
    expect(itemPlacement(def, 'throw', { family: 'charms', look: 'cards' }, 'main')).toBeNull();
    expect(itemPlacement(def, 'point', { family: 'charms', look: 'doll' }, 'main')!.hand).toBe('off');
    const duo = { family: 'daggers', look: 'rondel', offhand: { family: 'daggers', look: 'plain' } };
    for (const pose of ['point', 'throw']) expect(poseItems(def, pose, duo).map((p) => p.slot), pose).toEqual(['main']);
    expect(poseItems(def, 'channel', duo).map((p) => p.slot)).toEqual(['main', 'off']);
  });

  it("kalkan: point / throw'da açık elin üstünde değil (önkolda), isabet ve diz çökmede gövdenin arkasında; kule kalkanı küçüldü", () => {
    const pick = { family: 'maces', look: 'flanged', offhand: { family: 'shields', look: 'tower' } };
    for (const pose of ['point', 'throw']) {
      const sh = poseItems(def, pose, pick).find((p) => p.slot === 'off')!;
      expect(dist(sh, def.poses[pose]!.offhand!), pose).toBeGreaterThan(50);
    }
    for (const pose of ['hit', 'kneel']) expect(poseItems(def, pose, pick).find((p) => p.slot === 'off')!.back, pose).toBe(true);
    expect(POSES.weapons['shields']!.looks['tower']!.length).toBeLessThanOrEqual(165);
  });

  it('yay: bow_shot öne uzanmış elde dik, bow_sky göğe eğik; ikinci el (kiriş eli) yanakta, kavrayan elin gerisinde', () => {
    expect(itemPlacement(def, 'bow_shot', { family: 'bows', look: 'hunting' }, 'main')!.angle).toBe(0);
    expect(itemPlacement(def, 'bow_sky', { family: 'bows', look: 'hunting' }, 'main')!.angle).toBeLessThan(-20);
    for (const pose of ['bow_shot', 'bow_sky']) expect(def.poses[pose]!.offhand!.x, pose).toBeLessThan(def.poses[pose]!.anchor.x - 100);
  });

  it("yay: thrust1 öne uzanmış elde dik (kiriş çekişi), raise'de göğe eğik", () => {
    expect(itemPlacement(def, 'thrust1', { family: 'bows', look: 'hunting' }, 'main')!.angle).toBe(0);
    expect(itemPlacement(def, 'raise', { family: 'bows', look: 'hunting' }, 'main')!.angle).toBeLessThan(-20);
  });
});

describe('gerçek sınıflar v2 gövdeyle (Ömer 2026-10-13; debug > Characters > Poses ile v1 karşılaştırması)', () => {
  const real = ['warrior', 'defender', 'paladin', 'archer', 'cutthroat', 'mage', 'druid', 'undead', 'antimage', 'gambler', 'hexer'];

  it('varsayılan v2: her oynanabilir sınıf kendi <id>_v2 gövdesi; çağrılar pozsuz; v1 seçiliyken eski görünüm', () => {
    expect(realPosesV2()).toBe(true);
    for (const id of real) expect(poseClass(id), id).toBe(POSES.classes[`${id}_v2`]);
    for (const id of Object.keys(content.summons)) expect(poseClass(id), id).toBeNull();
    v1(() => {
      expect(poseClass('warrior')).toBe(POSES.classes['warrior']);
      for (const id of real.filter((c) => c !== 'warrior')) expect(poseClass(id), id).toBeNull();
    });
  });

  it("skill -> poz: gerçek skill Pose Tester kopyasının (pt_<id>) pozunu kullanır; her sınıf skill'i bir poza çözülür", () => {
    const look = (id: string) => content.skills[id];
    for (const cls of real)
      for (const sid of content.classes[cls]!.skills) {
        const s = poseSkill(cls, content.skills[sid]!, look);
        expect(s.pose, sid).toEqual(content.skills[`pt_${sid}`]!.pose);
        expect(skillPoses(cls, s).length, sid).toBeGreaterThan(0);
      }
    expect(skillPoses('warrior', poseSkill('warrior', content.skills['charge']!, look))).toEqual(['step', 'thrust']);
    expect(skillPoses('archer', poseSkill('archer', content.skills['arrow_rain']!, look))).toEqual(['sky']);
    // kopyası olmayan skill aynen; v1 çiziminde gerçek skill'in kendi pozu
    const rest = { id: 'rest', motion: 'self' };
    expect(poseSkill('mage', rest, look)).toBe(rest);
    v1(() => expect(poseSkill('warrior', content.skills['charge']!, look).pose).toEqual(['step', 'slash']));
  });

  it('Cutthroat Saltire Cut -> cross_cut (sınıfa özel ek poz: iki kol X, iki hançer); başka gövdede yok -> attack (slash)', () => {
    const look = (id: string) => content.skills[id];
    expect(content.skills['pt_x_cut']!.pose).toBe('cross_cut');
    expect(skillPoses('cutthroat', poseSkill('cutthroat', content.skills['x_cut']!, look))).toEqual(['cross_cut']);
    expect(skillPoses('pose_tester_5', content.skills['pt_x_cut'])).toEqual(['cross_cut']);
    const def = POSES.classes['cutthroat_v2']!;
    expect((def.poses['cross_cut'] as { src?: string }).src).toBe('cutthroat-v2/extra-cross_cut.png');
    for (const g of ['one', 'two'] as const) expect(gripFrames(def, g), g).toContain('cross_cut');
    // iki hançer: ana el alttaki yumrukta, ikinci el üstteki; ikisi de çizilir, X boyunca farklı yönlere
    const duo = { family: 'daggers', look: 'rondel', offhand: { family: 'daggers', look: 'plain' } };
    const items = poseItems(def, 'cross_cut', duo);
    expect(items.map((p) => p.slot)).toEqual(['main', 'off']);
    expect(def.poses['cross_cut']!.anchor.y).toBeGreaterThan(def.poses['cross_cut']!.offhand!.y);
    expect(items[0]!.angle).toBeGreaterThan(0);
    expect(items[1]!.angle).toBeLessThan(0);
    // diğer gövdeler: bilinmeyen poz -> sınıfın attack durumu
    expect(skillPoses('warrior', { pose: 'cross_cut', motion: 'ranged' })).toEqual(['slash']);
  });

  it('Hexer Doom Mark -> doll_stab (bebek + iğne kareye boyalı: tılsım / silah katmanı çizilmez; efekt çıkışı bebeği tutan sol el)', () => {
    const look = (id: string) => content.skills[id];
    expect(content.skills['pt_doom_mark']!.pose).toBe('doll_stab');
    expect(skillPoses('hexer', poseSkill('hexer', content.skills['doom_mark']!, look))).toEqual(['doll_stab']);
    expect(skillPoses('pose_tester_11', content.skills['pt_doom_mark'])).toEqual(['doll_stab']);
    const def = POSES.classes['hexer_v2']!;
    const p = def.poses['doll_stab']!;
    expect(p.hidden).toBe(true);
    expect(poseItems(def, 'doll_stab', { family: 'charms', look: 'doll', grip: 'charm' })).toEqual([]);
    expect(poseItems(def, 'doll_stab', { family: 'maces', look: 'flanged', offhand: { family: 'shields', look: 'round' } })).toEqual([]);
    // iğneli sağ yumruk bebeğin üstünde
    expect(p.anchor.y).toBeLessThan(p.offhand!.y);
    expect(skillPoses('warrior', { pose: 'doll_stab', motion: 'cast' })).toEqual(['raise']);
  });

  it('varsayılan donanım: Quick Battle / düşman = Pose Tester silahı; sefer / Endless kahramanı gerçek donanım (boş yuva: yalnızca ana el)', () => {
    real.forEach((cls, i) => {
      const gear = POSE_TESTER_GEAR[`pose_tester_${i + 1}`]!;
      expect(classDefaultGear(cls), cls).toEqual(gear);
      expect(unitWeaponPick(cls, undefined), cls).toEqual(weaponFor(cls, weaponItem(inst(gear[0])), offhandItem(gear[1] ? inst(gear[1]) : null)));
    });
    expect(unitWeaponPick('warrior', undefined)).toMatchObject({ family: 'greataxes', grip: 'two' });
    expect(unitWeaponPick('defender', undefined)?.offhand).toMatchObject({ family: 'shields' });
    // sefer: boş silah yuvası -> varsayılan ana el, kalkan yalnızca takılıysa
    expect(unitWeaponPick('defender', undefined, true)?.offhand).toBeUndefined();
    expect(unitWeaponPick('defender', { id: '', offhand: offhandItem(inst('oak_shield'))! }, true)?.offhand).toMatchObject({ family: 'shields' });
    // takılı item her zaman önce; çift el ikinci eli kapatır
    const maul = { ...weaponItem(inst('avengers_maul'))!, offhand: offhandItem(inst('oak_shield'))! };
    expect(unitWeaponPick('paladin', maul, true)).toMatchObject({ family: 'mauls', grip: 'two' });
    expect(unitWeaponPick('paladin', maul, true)?.offhand).toBeUndefined();
    expect(unitWeaponPick('skeleton', undefined)).toBeNull();
    // v1 çiziminde eski davranış birebir
    v1(() => {
      expect(classDefaultGear('warrior')).toBeNull();
      expect(unitWeaponPick('warrior', undefined)).toEqual(POSES.classes['warrior']!.defaultWeapon);
      expect(unitWeaponPick('mage', undefined)).toBeNull();
    });
  });
});

describe('balta ağzı / çekiç yüzü öne bakar (Ömer 2026-10-13 "Warrior baltayı ters tutuyor"; weapons.<aile>.edge)', () => {
  // ağız noktası - sap noktası (baş hizasında), gövde tuvalinde: karakter sağa (düşmana) bakar
  const edgeDir = (pl: NonNullable<ReturnType<typeof itemPlacement>>, side: 'left' | 'right') => {
    const y = pl.h * 0.12;
    const a = placementPoint(pl, side === 'left' ? 0 : pl.w, y);
    const b = placementPoint(pl, pl.grip.x, y);
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    return { x: (a.x - b.x) / d, y: (a.y - b.y) / d };
  };
  const v2 = Object.keys(POSES.classes).filter((id) => POSES.classes[id]!.grips);

  it('ağzı olan her görünümde ağız tarafı tanımlı ve görünüm var', () => {
    expect(Object.keys(POSES.weapons['axes']!.edge ?? {}).sort()).toEqual([...POSES.weapons['axes']!.order].sort());
    for (const l of ['dane', 'bearded']) expect(POSES.weapons['greataxes']!.edge?.[l]).toBe('left');
    expect(validatePoses()).toEqual([]);
  });

  it('tüm v2 gövdelerde, tüm pozlarda: baş yukarıdayken ve elde sarkarken ağız öne (düşmana) bakar', () => {
    for (const id of v2) {
      const def = POSES.classes[id]!;
      for (const [family, grip] of [['axes', 'one'], ['greataxes', 'two'], ['mauls', 'two']] as const) {
        const fam = POSES.weapons[family]!;
        for (const [look, side] of Object.entries(fam.edge ?? {}))
          for (const pose of gripFrames(def, grip)) {
            const pl = itemPlacement(def, pose, { family, look }, 'main');
            if (!pl) continue;
            const a = (pl.angle * Math.PI) / 180;
            const up = Math.cos(a) > 0.3; // baş elin üstünde
            const hangs = Math.cos(a) < -0.77; // baş aşağı sarkıyor (hangsDown)
            if (!up && !hangs) continue; // yatay savuruş / spin: ağız aşağı ya da yukarı, ikisi de doğru
            expect(edgeDir(pl, side as 'left' | 'right').x, `${id} ${pose} ${family}/${look} (açı ${pl.angle})`).toBeGreaterThan(0.2);
          }
      }
    }
  });

  it('v1 Warrior (debug karşılaştırması) ayrı: ayna yok', () => {
    const v1 = POSES.classes['warrior']!;
    for (const pose of Object.keys(v1.poses)) expect(itemPlacement(v1, pose, { family: 'axes', look: 'bearded' }, 'main')?.flip ?? false).toBe(false);
  });
});

describe('hazır tutuş: ağızlı silah YUKARI ve hafif öne (Ömer 2026-10-13 "tek elli kılıç böyle mi tutulur"; hançer istisna: ucu öne)', () => {
  const v2 = Object.entries(POSES.classes).filter(([, d]) => d.grips);
  it('tek el: axes / swords / maces idle1, step1, guard1 açısı 15..50 (yukarı-öne); daggers 40..90 (ucu öne-yukarı)', () => {
    for (const [id, def] of v2)
      for (const family of ['axes', 'swords', 'maces', 'daggers'])
        for (const pose of ['idle1', 'step1', 'guard1']) {
          const look = POSES.weapons[family]!.order[0]!;
          const pl = itemPlacement(def, pose, { family, look }, 'main')!;
          const [lo, hi] = family === 'daggers' ? [40, 90] : [14, 50]; // 14: Warrior baltası (Ömer 2026-10-18: kural 15 +-1 içinde kalır)
          expect(pl.angle, `${id} ${family} ${pose}`).toBeGreaterThanOrEqual(lo);
          expect(pl.angle, `${id} ${family} ${pose}`).toBeLessThanOrEqual(hi);
        }
  });
  it('çift el: greataxes / mauls / staves idle2 ve guard2 başı yukarıda (-10..60)', () => {
    for (const [id, def] of v2)
      for (const family of ['greataxes', 'mauls', 'staves'])
        for (const pose of ['idle2', 'guard2']) {
          const look = POSES.weapons[family]!.order[0]!;
          const pl = itemPlacement(def, pose, { family, look }, 'main')!;
          expect(pl.angle, `${id} ${family} ${pose}`).toBeGreaterThanOrEqual(-10);
          expect(pl.angle, `${id} ${family} ${pose}`).toBeLessThanOrEqual(60);
        }
  });
});

describe('eller yer değiştirmez: main = SAĞ el (arkadaki kol, resimde solda), off = SOL el (Ömer 2026-10-13)', () => {
  it('tüm v2 gövdelerde ayakta / adım / koruma / büyü / atış karelerinde ana el ikinci elin solunda (arkasında)', () => {
    for (const [id, def] of Object.entries(POSES.classes).filter(([, d]) => d.grips))
      for (const pose of ['idle1', 'step1', 'guard1', 'raise', 'point', 'throw', 'spin1a', 'spin1c']) {
        const p = def.poses[pose]!;
        expect(p.anchor.x, `${id} ${pose}`).toBeLessThan(p.offhand!.x);
      }
  });
});
