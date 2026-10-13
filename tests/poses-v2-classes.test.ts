import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POSES, poseClass, validatePoses } from '../src/game/poses';

/**
 * Sınıf başına v2 gövdeleri (tools/make-poses-v2.mjs --class=<id> -> data/poses.json > classes.<id>_v2, assets/poses/<id>-v2/):
 * hepsi aynı kare listesi (24 + yay kullanan sınıfta bow_shot / bow_sky), her karede iki el noktası, dosyası diskte, Warrior v2 ile aynı ölçek.
 */
const BASE = [
  'idle1', 'step1', 'slash1', 'overhead1', 'thrust1', 'spin1a', 'spin1b', 'spin1c', 'guard1', 'raise', 'channel', 'point',
  'idle2', 'step2', 'slash2', 'overhead2', 'thrust2', 'spin2a', 'spin2b', 'spin2c', 'guard2', 'throw', 'hit', 'kneel',
];
const BOW = ['bow_shot', 'bow_sky'];
/** Sınıfa özel ek pozlar (assets/source/poses/<id>-v2/extra-<poz>.png; tools/make-poses-v2.mjs). */
const EXTRA: Record<string, string[]> = { cutthroat_v2: ['cross_cut'], hexer_v2: ['doll_stab'] };
const v2 = Object.entries(POSES.classes).filter(([id]) => id.endsWith('_v2'));

describe('v2 sınıf gövdeleri (classes.*_v2)', () => {
  it('warrior_v2 referans gövde var ve 26 kare (yay dahil)', () => {
    expect(Object.keys(POSES.classes['warrior_v2']!.poses).sort()).toEqual([...BASE, ...BOW].sort());
  });

  it('poz verisi geçerli', () => {
    expect(validatePoses()).toEqual([]);
  });

  for (const [id, def] of v2)
    describe(id, () => {
      const bow = !!def.grips?.bow;
      it(`tüm kareler (${bow ? 26 : 24}${EXTRA[id] ? ` + ${EXTRA[id]!.join(', ')}` : ''}) ve her karede ana el + ikinci el noktası, kutu tuvalin içinde`, () => {
        expect(Object.keys(def.poses).sort()).toEqual([...BASE, ...(bow ? BOW : []), ...(EXTRA[id] ?? [])].sort());
        for (const [n, p] of Object.entries(def.poses)) {
          for (const h of [p.anchor, p.offhand]) {
            expect(h, `${id}/${n}`).toBeDefined();
            expect(h!.x >= 0 && h!.y >= 0 && h!.x <= def.canvas.w && h!.y <= def.canvas.h, `${id}/${n} hand inside canvas`).toBe(true);
          }
          expect(Number.isFinite(p.anchor.angle), `${id}/${n} angle`).toBe(true);
          expect(p.box, `${id}/${n} box`).toBeDefined();
          // ayaklar tabanda: kutunun altı taban çizgisinde
          expect(p.box!.y + p.box!.h, `${id}/${n} on baseline`).toBe(def.canvas.footY);
        }
      });

      it('kare dosyaları diskte (assets/poses/<dir>/ + small/)', () => {
        for (const n of Object.keys(def.poses)) {
          expect(existsSync(`assets/poses/${def.dir}/${n}.png`), `${def.dir}/${n}.png`).toBe(true);
          expect(existsSync(`assets/poses/${def.dir}/small/${n}.png`), `${def.dir}/small/${n}.png`).toBe(true);
        }
      });

      it('Warrior v2 ile aynı ölçek (figür boyu %15 içinde) ve yay yoksa yay tutuşu tek el takımına düşer', () => {
        const ref = POSES.classes['warrior_v2']!;
        expect(Math.abs(def.figure.h / ref.figure.h - 1)).toBeLessThan(0.15);
        if (!bow) expect(def.gripFallback?.bow).toBe('one');
      });
    });

  it("Pose Tester takma adı: sınıfın kendi gövdesi varsa o, yoksa warrior_v2", () => {
    for (const [alias, owner] of Object.entries(POSES.classAliases ?? {})) {
      expect(owner.endsWith('_v2'), alias).toBe(true);
      expect(poseClass(alias), alias).toBe(POSES.classes[owner]);
    }
  });
});
