/**
 * Poz atlasları (assets/pose-atlas; tools/pack-pose-atlases.py): savaş tek tek ~130 dosya yerine birkaç atlas indirir (Ömer 2026-10-18).
 * Bir araç poz / silah PNG'sini ya da tutuş gruplarını değiştirip atlası yeniden üretmeyi unutursa oyun ESKİ görseli gösterirdi: bu test
 * (1) kaynak PNG özetlerinin güncel olduğunu, (2) her kare için atlas konumu olduğunu ve boyutunun PNG ile aynı olduğunu, (3) gruplamanın
 * src/game/poses.ts > gripFrames ile uyuştuğunu (bir birim kendi tutuşunun dışında kare indirmez) denetler. Kırmızıysa: python tools/pack-pose-atlases.py
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POSE_ATLASES, poseBodyFrame, weaponFrame } from '../src/game/pose-files';
import { POSES, gripFiles, gripFrames, type Grip } from '../src/game/poses';

const FIX = 'python tools/pack-pose-atlases.py';
const manifest = JSON.parse(readFileSync('assets/pose-atlas/manifest.json', 'utf8')) as { sources: Record<string, string> };
const GRIPS: Array<Grip | undefined> = [undefined, 'one', 'two', 'bow', 'charm'];

const sha = (buf: Buffer) => createHash('sha1').update(buf).digest('hex').slice(0, 16);
const pngSize = (path: string): [number, number] => {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const bodyPng = (dir: string, pose: string, small: boolean) => `assets/poses/${dir}/${small ? 'small/' : ''}${pose}.png`;
const weaponPng = (family: string, look: string, small: boolean) => `assets/weapons/${family}/${small ? 'small/' : ''}${look}.png`;

describe('Poz atlasları (tools/pack-pose-atlases.py)', () => {
  it('kaynak PNG özetleri güncel: değişen / eklenen / silinen PNG atlası yeniden üretmeyi gerektirir', () => {
    const stale: string[] = [];
    for (const [path, h] of Object.entries(manifest.sources)) if (!existsSync(path) || sha(readFileSync(path)) !== h) stale.push(path);
    const expected: string[] = [];
    for (const def of Object.values(POSES.classes))
      for (const pose of [...Object.keys(def.poses), ...Object.values(def.poses).flatMap((p) => (p.fingers ? [p.fingers] : []))]) for (const small of [false, true]) if (existsSync(bodyPng(def.dir, pose, small))) expected.push(bodyPng(def.dir, pose, small));
    for (const fam of readdirSync('assets/weapons')) {
      for (const look of readdirSync(`assets/weapons/${fam}`).filter((f) => f.endsWith('.png'))) expected.push(weaponPng(fam, look.replace(/\.png$/, ''), false));
      if (existsSync(`assets/weapons/${fam}/small`)) for (const look of readdirSync(`assets/weapons/${fam}/small`).filter((f) => f.endsWith('.png'))) expected.push(weaponPng(fam, look.replace(/\.png$/, ''), true));
    }
    const missing = expected.filter((p) => !(p in manifest.sources));
    expect(stale, `atlas eski (çalıştır: ${FIX})`).toEqual([]);
    expect(missing, `atlasa girmemiş PNG (çalıştır: ${FIX})`).toEqual([]);
  });

  it('her gövde karesi ve silah görünümü bir atlasta; kare boyu PNG ile aynı, atlas içinde ve çakışmasız', () => {
    const bad: string[] = [];
    for (const def of Object.values(POSES.classes))
      for (const pose of [...Object.keys(def.poses), ...Object.values(def.poses).flatMap((p) => (p.fingers ? [p.fingers] : []))])
        for (const small of [false, true]) {
          const png = bodyPng(def.dir, pose, small);
          if (!existsSync(png)) continue;
          const f = poseBodyFrame(def.dir, pose, small);
          if (!f) bad.push(`${png}: atlasta yok`);
          else if (pngSize(png).join('x') !== `${f.rect[2]}x${f.rect[3]}`) bad.push(`${png}: boyut ${pngSize(png).join('x')} != atlas ${f.rect[2]}x${f.rect[3]}`);
        }
    for (const [fam, art] of Object.entries(POSES.weapons))
      for (const look of Object.keys(art.looks))
        for (const small of [false, true]) {
          const png = weaponPng(fam, look, small);
          if (!existsSync(png)) continue;
          const f = weaponFrame(fam, look, small);
          if (!f) bad.push(`${png}: atlasta yok`);
          else if (pngSize(png).join('x') !== `${f.rect[2]}x${f.rect[3]}`) bad.push(`${png}: boyut değişti`);
        }
    for (const [id, a] of Object.entries(POSE_ATLASES)) {
      expect(existsSync(`assets/pose-atlas/${id}.webp`), `${id}.webp yok`).toBe(true);
      expect(Math.max(a.w, a.h), `${id}: sayfa kenarı telefon sınırını (4096) aşıyor`).toBeLessThanOrEqual(4096);
      const r = Object.entries(a.frames);
      for (const [n, [x, y, w, h]] of r) if (x < 0 || y < 0 || x + w > a.w || y + h > a.h) bad.push(`${id}/${n}: atlas dışında`);
      for (let i = 0; i < r.length; i++)
        for (let j = i + 1; j < r.length; j++) {
          const [, [x1, y1, w1, h1]] = r[i]!;
          const [, [x2, y2, w2, h2]] = r[j]!;
          if (x1 < x2 + w2 && x2 < x1 + w1 && y1 < y2 + h2 && y2 < y1 + h1) bad.push(`${id}: ${r[i]![0]} ile ${r[j]![0]} çakışıyor`);
        }
    }
    expect(bad, `çalıştır: ${FIX}`).toEqual([]);
  });

  it('gruplama gripFrames ile uyumlu: bir tutuşun indirdiği atlaslar o tutuşun dışında kare içermez; her kare indirilir', () => {
    const bad: string[] = [];
    for (const def of Object.values(POSES.classes))
      for (const grip of GRIPS)
        for (const small of [false, true]) {
          const want = new Set(gripFiles(def, grip).filter((p) => existsSync(bodyPng(def.dir, p, small))));
          const atlases = new Set(Array.from(want, (p) => poseBodyFrame(def.dir, p, small)?.atlas).filter((a): a is string => !!a));
          for (const id of atlases) for (const name of Object.keys(POSE_ATLASES[id]!.frames)) if (!want.has(name)) bad.push(`${def.dir} ${grip ?? 'varsayılan'}${small ? ' small' : ''}: ${id} fazladan ${name} indirir`);
        }
    expect(bad, `çalıştır: ${FIX}`).toEqual([]);
  });

  it('savaş başına dosya sayısı küçük: 4 sınıflı takım en çok 12 atlas', () => {
    const classes = Object.values(POSES.classes).filter((d) => d.dir.endsWith('-v2')).slice(0, 4);
    const files = new Set<string>();
    for (const def of classes) {
      for (const p of gripFrames(def, 'two')) files.add(poseBodyFrame(def.dir, p, false)?.atlas ?? p);
      for (const fam of ['swords', 'shields']) files.add(weaponFrame(fam, Object.keys(POSES.weapons[fam]!.looks)[0]!, false)?.atlas ?? fam);
    }
    expect(files.size).toBeLessThanOrEqual(12);
  });
});
