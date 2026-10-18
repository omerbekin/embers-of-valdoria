/**
 * Tek el silah elde mi (Ömer 2026-10-18 "balta elinden çıkmış"): 0.8.2.1'de Warrior v2'nin balta / topuz duruşuna yüzü kapatmasın diye
 * `itemPoses` ile yana kaydırma (dx -16) verilmişti; sap yumruğun yanından geçiyor, silah elden kopuk görünüyordu. Bu test her tutuş
 * takımlı sınıfta, tek el tutuşun her karesinde, tek el ailelerinin (kılıç, balta, topuz, hançer) her görünümünde elin noktasının
 * sapın orta çizgisinde olduğunu ve sapın yumruğun iki yanında da göründüğünü denetler. Yüzden uzak tutmak için kaydırma değil açı kullanılır.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { POSES, gripFrames, itemPlacement, type ItemPlacement } from '../src/game/poses';

/** En küçük PNG okuyucu: yalnızca 8 bit RGBA, taramasız (assets/weapons hep böyle). Dönen: alfa kanalı. */
function pngAlpha(path: string): { w: number; h: number; a: Uint8Array } {
  const b = readFileSync(path);
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6 || b[28] !== 0) throw new Error(`${path}: 8 bit RGBA taramasız değil`);
  const idat: Buffer[] = [];
  for (let o = 8; o < b.length; ) {
    const len = b.readUInt32BE(o);
    if (b.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const px = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x]!;
      const left = x >= bpp ? px[y * stride + x - bpp]! : 0;
      const up = y > 0 ? px[(y - 1) * stride + x]! : 0;
      const ul = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp]! : 0;
      let pred = 0;
      if (f === 1) pred = left;
      else if (f === 2) pred = up;
      else if (f === 3) pred = (left + up) >> 1;
      else if (f === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - ul);
        pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
      }
      px[y * stride + x] = (v + pred) & 255;
    }
  }
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = px[i * 4 + 3]!;
  return { w, h, a };
}

const alphaCache = new Map<string, ReturnType<typeof pngAlpha>>();
const alphaOf = (family: string, look: string) => {
  const k = `${family}/${look}`;
  if (!alphaCache.has(k)) alphaCache.set(k, pngAlpha(`assets/weapons/${k}.png`));
  return alphaCache.get(k)!;
};

/**
 * Yumruk sapı TAM kavrıyor mu (Ömer 2026-10-18 "yumrukla tam tutuyormuş gibi görünmüyor"): elin noktası silah görselinde (placementPoint'in
 * tersi) sapın orta çizgisinde (en çok `tol` görsel pikseli) ve sap yumruk yamasının üstünde de altında da dolu (iki yanda sap görünür).
 * Dönen: sorun metni ya da null.
 */
function gripProblem(pl: ItemPlacement, fistR: number, tol: number): string | null {
  const img = alphaOf(pl.family, pl.look);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.a[y * img.w + x]! > 128;
  const a = (pl.angle * Math.PI) / 180;
  const dx = pl.hx - pl.x;
  const dy = pl.hy - pl.y;
  let lx = dx * Math.cos(a) + dy * Math.sin(a);
  const ly = -dx * Math.sin(a) + dy * Math.cos(a);
  if (pl.flip) lx = -lx;
  const px = Math.round(lx / pl.k + pl.grip.x);
  const py = Math.round(ly / pl.k + pl.grip.y);
  if (!solid(px, py)) return `el sapın dışında (${px},${py})`;
  let l = px;
  let r = px;
  while (solid(l - 1, py)) l--;
  while (solid(r + 1, py)) r++;
  const off = Math.abs(px - (l + r) / 2);
  if (off > tol) return `el sap ortasından ${off.toFixed(1)} px yanda`;
  const reach = Math.round(fistR / pl.k) + 2;
  // yumruğun hemen dışında (birkaç piksellik bant: sapta süs oyuğu olabilir, ör. rondel hançer) sap dolu
  const shows = (sign: number) => {
    for (let d = reach - 6; d <= reach; d++) for (let x = px - 4; x <= px + 4; x++) if (solid(x, py + sign * d)) return true;
    return false;
  };
  if (!shows(-1) || !shows(1)) return 'sap yumruğun bir yanında görünmüyor';
  return null;
}

describe('Tek el silah elde (sap yumruktan geçer)', () => {
  it('tutuş takımlı her sınıfta tek el ailelerinin her karede yumruk sapı ortasından kavrar, sap iki yanda görünür', () => {
    const families = Object.entries(POSES.weapons).filter(([, f]) => !f.hold || f.hold === 'one');
    expect(families.map(([n]) => n).sort()).toEqual(['axes', 'daggers', 'maces', 'swords']);
    const bad: string[] = [];
    for (const [id, def] of Object.entries(POSES.classes)) {
      if (!def.grips) continue;
      for (const pose of gripFrames(def, 'one'))
        for (const [family, fam] of families)
          for (const look of Object.keys(fam.looks)) {
            const pl = itemPlacement(def, pose, { family, look }, 'main');
            const why = pl && gripProblem(pl, def.poses[pose]!.fist ?? POSES.fistRadius, 3);
            if (why) bad.push(`${id} ${pose} ${family}/${look}: ${why}`);
          }
    }
    expect(bad, 'silah yumrukta değil: itemPoses içinde yana kaydırma (dx/dy) yerine açı kullan').toEqual([]);
  });
});
