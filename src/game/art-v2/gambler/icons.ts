/**
 * Gambler - SÜRÜM 2 İKONLARI. Kılavuz: docs/design/art-v2.md
 *
 * Karakter referansı (assets/sprites/gambler/idle.png): bordo-mor çizgili yelek, tüylü kırmızı şapka, bir elinde yelpaze gibi
 * açılmış üç oyun kartı (karo, maça, kırmızı daire), öbür elinde beyaz kemik zarlar, kemerinde altın paralar ve kese. Silahı şans:
 * zar, kart, para; bahsi kendi canı ve manasıyla oynar. İkonlar bu gerçek nesnelerden kurulur (fildişi zar 'w'/'l'/'m' + siyah
 * nokta 'o', altın para 'y'/'Y', kart 'w' + kırmızı 'r' / siyah 'o' takım işaretleri, bordo 'R').
 *
 * Bu class'ın v1 ikon adları (ICONS anahtarları): gamblerlogo (logo), doubleornothing (pasif), loadeddice, highstakes, cardtrick, allin
 * SPRITES: v2 efektlerinin zar (dönme kareleri), para, kart, hançer çizimleri.
 */
import type { V2SpriteEntry } from '../types';
import { blade, sparkle, type PxGrid } from '../../pixel-art';

type P = [number, number];

// ---------------------------------------------------------------- ortak parçalar

/** Standart zar nokta düzeni (yüz uv uzayında 0..1). */
const PIPS: Record<number, P[]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.27, 0.5], [0.27, 0.78], [0.73, 0.22], [0.73, 0.5], [0.73, 0.78]],
};

interface DieLook {
  top: string;
  left: string;
  right: string;
  pip: string;
  /** Nokta yarıçapı (kenar boyunun oranı). */
  pipR?: number;
  /** Özel nokta: [yüz, sıra, renk] (ör. kurşun tıkaç). */
  special?: ['top' | 'left' | 'right', number, string];
}

/** 3/4 görünüşte zar: üst eşkenar dörtgen + sol + sağ yüz, yüzlerde noktalar. (cx,cy) = üst yüzün alt köşesi; s = kenar. */
function die3d(g: PxGrid, cx: number, cy: number, s: number, faces: { top: number; left: number; right: number }, look: DieLook): void {
  const w = s * 0.87;
  const T0: P = [cx, cy - s];
  const T1: P = [cx + w, cy - s * 0.5];
  const T2: P = [cx, cy];
  const T3: P = [cx - w, cy - s * 0.5];
  const L2: P = [cx, cy + s];
  const L3: P = [cx - w, cy + s * 0.5];
  const R2: P = [cx + w, cy + s * 0.5];
  g.poly([...T3, ...T2, ...L2, ...L3], look.left);
  g.poly([...T2, ...T1, ...R2, ...L2], look.right);
  g.poly([...T3, ...T0, ...T1, ...T2], look.top);
  // yuvarlatılmış kenar parlaması
  g.line(T3[0] + 0.4, T3[1] + 0.2, T2[0], T2[1] - 0.4, 'w', 0.25).line(T2[0], T2[1] + 0.2, T1[0] - 0.4, T1[1] + 0.2, 'w', 0.25);
  const face = (o: P, u: P, v: P, n: number, which: 'top' | 'left' | 'right') => {
    PIPS[n]!.forEach(([a, b], i) => {
      const x = o[0] + (u[0] - o[0]) * a + (v[0] - o[0]) * b;
      const y = o[1] + (u[1] - o[1]) * a + (v[1] - o[1]) * b;
      const sp = look.special && look.special[0] === which && look.special[1] === i;
      g.disc(x, y, s * (look.pipR ?? 0.11), sp ? look.special![2] : look.pip);
      if (sp) g.disc(x - s * 0.04, y - s * 0.04, s * 0.04, 'w');
    });
  };
  face(T3, T0, T2, faces.top, 'top');
  face(T3, T2, L3, faces.left, 'left');
  face(T2, T1, L2, faces.right, 'right');
}

/** Yüzü dönük altın para: kenar bandı, iç halka, kabartma (taç). */
function coinFace(g: PxGrid, cx: number, cy: number, r: number, body = 'y', rim = 'Y', mark = true): void {
  g.disc(cx, cy, r, rim);
  g.disc(cx - r * 0.06, cy - r * 0.06, r * 0.84, body);
  g.ring(cx - r * 0.06, cy - r * 0.06, r * 0.66, rim, Math.max(0.25, r * 0.1));
  if (mark) {
    // taç kabartması
    const k = r * 0.32;
    g.poly([cx - k * 1.2, cy + k * 0.6, cx - k * 1.2, cy - k * 0.4, cx - k * 0.6, cy + k * 0.1, cx, cy - k * 0.9, cx + k * 0.6, cy + k * 0.1, cx + k * 1.2, cy - k * 0.4, cx + k * 1.2, cy + k * 0.6], rim);
  }
}

/** Döndürülmüş oyun kartı: merkez, genişlik, yükseklik, açı; yüz ya da arka. */
function card(g: PxGrid, cx: number, cy: number, w: number, h: number, ang: number, suit: 'diamond' | 'spade' | 'heart' | 'club' | 'back', o: { corner?: boolean } = {}): void {
  const T = (x: number, y: number): P => [cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)];
  const rect = (hw: number, hh: number, c: number) => {
    const pts = [T(-hw + c, -hh), T(hw - c, -hh), T(hw, -hh + c), T(hw, hh - c), T(hw - c, hh), T(-hw + c, hh), T(-hw, hh - c), T(-hw, -hh + c)];
    return pts.flat();
  };
  g.poly(rect(w / 2, h / 2, 0.8), suit === 'back' ? 'R' : 'l');
  g.poly(rect(w / 2 - 0.5, h / 2 - 0.5, 0.5), suit === 'back' ? 'r' : 'w');
  if (suit === 'back') {
    // arka desen: bordo kafes
    g.poly(rect(w / 2 - 1.3, h / 2 - 1.3, 0.3), 'R');
    for (let i = -2; i <= 2; i++) {
      const a = T(i * w * 0.16, -h / 2 + 1.8);
      const b = T(i * w * 0.16, h / 2 - 1.8);
      g.line(a[0], a[1], b[0], b[1], 'r', 0.25);
    }
    const c = T(0, 0);
    g.disc(c[0], c[1], Math.min(w, h) * 0.16, 'y');
    return;
  }
  const s = Math.min(w, h * 0.7) * 0.36;
  const c = T(0, 0);
  suitShape(g, c[0], c[1], s, suit, ang);
  if (o.corner !== false) {
    const k = T(-w / 2 + 2.1, -h / 2 + 2.6);
    suitShape(g, k[0], k[1], s * 0.38, suit, ang);
  }
}

/** Takım işaretleri (karo / maça / kupa / sinek). */
function suitShape(g: PxGrid, x: number, y: number, s: number, suit: 'diamond' | 'spade' | 'heart' | 'club', ang = 0): void {
  const T = (u: number, v: number): P => [x + (u * Math.cos(ang) - v * Math.sin(ang)) * s, y + (u * Math.sin(ang) + v * Math.cos(ang)) * s];
  const poly = (pts: P[], t: string) => g.poly(pts.flat(), t);
  if (suit === 'diamond') poly([T(0, -1.2), T(0.8, 0), T(0, 1.2), T(-0.8, 0)], 'r');
  else if (suit === 'heart') {
    const a = T(-0.45, -0.35);
    const b = T(0.45, -0.35);
    g.disc(a[0], a[1], s * 0.52, 'r').disc(b[0], b[1], s * 0.52, 'r');
    poly([T(-0.95, -0.15), T(0.95, -0.15), T(0, 1.1)], 'r');
  } else if (suit === 'spade') {
    const a = T(-0.42, 0.18);
    const b = T(0.42, 0.18);
    g.disc(a[0], a[1], s * 0.5, 'o').disc(b[0], b[1], s * 0.5, 'o');
    poly([T(-0.9, 0.05), T(0, -1.15), T(0.9, 0.05)], 'o');
    poly([T(0, 0.3), T(0.4, 1.1), T(-0.4, 1.1)], 'o');
  } else {
    for (const [u, v] of [[0, -0.5], [-0.5, 0.2], [0.5, 0.2]] as P[]) {
      const p = T(u, v);
      g.disc(p[0], p[1], s * 0.42, 'o');
    }
    poly([T(0, 0), T(0.35, 1.1), T(-0.35, 1.1)], 'o');
  }
}

/** Kan damlası (sivri üst, yuvarlak alt). */
function drop(g: PxGrid, x: number, y: number, r: number): void {
  g.disc(x, y, r, 'R');
  g.disc(x - r * 0.12, y - r * 0.12, r * 0.82, 'r');
  g.poly([x - r * 0.86, y - r * 0.35, x, y - r * 2.3, x + r * 0.86, y - r * 0.35], 'r');
  g.disc(x - r * 0.4, y - r * 0.3, Math.max(0.25, r * 0.22), 'w');
}

// ---------------------------------------------------------------- ikonlar

export const ICONS: Record<string, V2SpriteEntry> = {
  // ChatGPT boyalı ikonlar (gambler-sheet.png -> tools/make-class-icons.py); eski kodla çizimler kaldırıldı.
  loadeddice: { image: 'gambler/loadeddice' },
  highstakes: { image: 'gambler/highstakes' },
  cardtrick: { image: 'gambler/cardtrick' },
  allin: { image: 'gambler/allin' },
  doubleornothing: { image: 'gambler/doubleornothing' },
  /** LOGO: eğik duran maça ası + önünde altın para. 15 px'te bile: beyaz kart, siyah maça, sarı para. */
  gamblerlogo: (g) => {
    card(g, 13.6, 14, 15, 21, -0.22, 'spade');
    coinFace(g, 22.4, 23.2, 6.4);
    sparkle(g, 27.6, 16.8, 2.2, 'w');
  },





};

// ---------------------------------------------------------------- efekt sprite'ları

const dieSprite = (top: number, left: number, right: number, gold = false): V2SpriteEntry => ({
  size: 96,
  draw: (g) => die3d(g, 16, 16.5, 11.4, { top, left, right }, gold ? { top: 'y', left: 'a', right: 'Y', pip: 'R', pipR: 0.11 } : { top: 'w', left: 'l', right: 'm', pip: 'o', pipR: 0.105 }),
});

export const SPRITES: Record<string, V2SpriteEntry> = {
  // Kemik zar: dönerken sırayla değişen kareler (gerçek zar düzeni: komşu yüzler)
  die_a: dieSprite(1, 2, 3),
  die_b: dieSprite(4, 5, 1),
  die_c: dieSprite(3, 6, 5),
  /** Hileli zar oturdu: üstte 6. */
  die_six: dieSprite(6, 3, 2),
  // Altın zar (All In)
  gdie_a: dieSprite(2, 3, 1, true),
  gdie_b: dieSprite(5, 4, 6, true),
  gdie_c: dieSprite(1, 5, 4, true),
  gdie_six: dieSprite(6, 5, 4, true),
  /** Kaybedilen bahis: üstte 1 (tek göz). */
  gdie_one: dieSprite(1, 3, 5, true),
  /** Yüzü dönük altın para. */
  coin: { size: 64, draw: (g) => coinFace(g, 16, 16, 13) },
  /** Kararmış, çizik para (kaybedilen bahis). */
  coindark: { size: 64, draw: (g) => {
    coinFace(g, 16, 16, 13, 'm', 'd');
    g.line(8, 9, 19, 22, 'o', 0.6).line(19, 22, 23, 21, 'o', 0.6);
  } },
  /** Yandan (kenarı) görünen para: dönüş karesi. */
  coinedge: { size: 64, draw: (g) => {
    g.rect(14.4, 3, 3.2, 26, 'Y');
    g.rect(15.2, 3.4, 1.2, 25, 'y');
  } },
  /** Oyun kartları (yüz) ve arka. */
  card_d: { size: 96, draw: (g) => card(g, 16, 16, 18, 26, 0, 'diamond') },
  card_s: { size: 96, draw: (g) => card(g, 16, 16, 18, 26, 0, 'spade') },
  card_h: { size: 96, draw: (g) => card(g, 16, 16, 18, 26, 0, 'heart') },
  card_c: { size: 96, draw: (g) => card(g, 16, 16, 18, 26, 0, 'club') },
  card_back: { size: 96, draw: (g) => card(g, 16, 16, 18, 26, 0, 'back') },
  /** Hançer (yatay, uç SAĞDA): bordo sargı, yakut topuz. */
  dagger: { size: 96, draw: (g) => {
    blade(g, 12, 16, 31, 16, 3.6, 'l', 'm');
    g.line(11, 11.6, 11, 20.4, 'y', 1.6);
    g.line(10.2, 16, 4.4, 16, 'R', 2.3);
    for (let i = 0; i < 3; i++) g.line(9 - i * 1.6, 15, 9 - i * 1.6, 17, 'k', 0.25);
    g.disc(3.2, 16, 1.9, 'r').disc(2.8, 15.5, 0.55, 'w');
  } },
  /** Kan damlası (bahis). */
  blood: { size: 64, draw: (g) => drop(g, 16, 20, 6.4) },
};
