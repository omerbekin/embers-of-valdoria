/**
 * Anti-Mage - SÜRÜM 2 İKONLARI. Kılavuz: docs/design/art-v2.md
 *
 * Karakter referansı (assets/sprites/antimage/idle.png): kapüşonlu, koyu örgü zırh + çelik plaka, mürdüm (bordo-mor) kuşak,
 * mor rünlü düz kılıç, kaldırdığı çelik eldivenin çevresinde süzülen KIRIK RÜN TABLETLERİ. Felsefe: büyücü değil, büyü avcısı;
 * büyüyü kırar, düşmanın MAVİ manasını söküp kendi MOR boşluğuna çevirir. Görsel dil: çelik + mor rün, kırık tabletler,
 * mavi mana (karşı tarafın) -> mor (onun).
 *
 * Bu class'ın v1 ikon adları (ICONS anahtarları): nullsphere, overflow, manaburn, drainfield, spellward, voidstrike
 */
import type { V2SpriteEntry } from '../types';
import type { PxGrid } from '../../pixel-art';

/** Rün tableti (sprite'taki eldivenin çevresindeki kırık parçalar): merkez, yarı boy, açı, renk. */
function tablet(g: PxGrid, cx: number, cy: number, w: number, h: number, ang: number, body = 'p', rune = 'w'): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (x: number, y: number): [number, number] => [cx + x * c - y * s, cy + x * s + y * c];
  const pts = [P(-w, -h), P(w * 0.7, -h), P(w, -h * 0.4), P(w, h), P(-w * 0.6, h), P(-w, h * 0.5)].flat();
  g.poly(pts, body);
  const [ax, ay] = P(0, -h * 0.55);
  const [bx, by] = P(0, h * 0.55);
  g.line(ax, ay, bx, by, rune, Math.min(w, h) * 0.32);
}

/** Rünlü düz kılıç (sprite'taki gibi): kabza (x0,y0) -> uç (x1,y1). */
function runeSword(g: PxGrid, x0: number, y0: number, x1: number, y1: number, w: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const dx = (x1 - x0) / len;
  const dy = (y1 - y0) / len;
  const nx = -dy;
  const ny = dx;
  const h = w / 2;
  const tx = x1 - dx * w * 1.6;
  const ty = y1 - dy * w * 1.6;
  g.poly([x0 + nx * h, y0 + ny * h, tx + nx * h, ty + ny * h, x1, y1, tx - nx * h, ty - ny * h, x0 - nx * h, y0 - ny * h], 'm');
  g.poly([x0 + nx * h, y0 + ny * h, tx + nx * h, ty + ny * h, x1, y1, x0, y0], 'l');
  // mor rünler (oluk boyunca)
  for (let k = 0.18; k < 0.8; k += 0.17) {
    const px = x0 + (x1 - x0) * k;
    const py = y0 + (y1 - y0) * k;
    g.line(px - dx * 0.7, py - dy * 0.7, px + dx * 0.7, py + dy * 0.7, 'p', 0.6);
    g.set(px + nx * 0.25 - 0.1, py + ny * 0.25 - 0.1, 'a');
  }
  // haç siper, kabza, topuz
  g.line(x0 + nx * w * 1.5, y0 + ny * w * 1.5, x0 - nx * w * 1.5, y0 - ny * w * 1.5, 'Y', 1.1);
  g.line(x0, y0, x0 - dx * 4.5, y0 - dy * 4.5, 'k', 1.2);
  g.disc(x0 - dx * 5.3, y0 - dy * 5.3, 1.2, 'Y');
}

export const ICONS: Record<string, V2SpriteEntry> = {
  // ChatGPT boyalı ikonlar (antimage-sheet.png -> tools/make-class-icons.py); eski kodla çizimler kaldırıldı.
  manaburn: { image: 'antimage/manaburn' },
  drainfield: { image: 'antimage/drainfield' },
  spellward: { image: 'antimage/spellward' },
  voidstrike: { image: 'antimage/voidstrike' },
  overflow: { image: 'antimage/overflow' },




  /** Logo: büyüyü kıran kılıç: dik rünlü kılıç, kırılarak dağılan mor rün halkasının içinden geçer. */
  nullsphere: (g) => {
    // kırık rün halkası (dört parça, aralıklı)
    for (let i = 0; i < 4; i++) g.ring(16, 15, 11.5, 'a', 2.4, (i / 4) * Math.PI * 2 + 0.28, ((i + 1) / 4) * Math.PI * 2 - 0.28);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.disc(16 + Math.cos(a) * 10.3, 15 + Math.sin(a) * 10.3, 0.7, 'z');
    }
    // kopan parçalar
    tablet(g, 27.5, 4, 1.4, 2, 0.6, 'a', 'z');
    tablet(g, 4, 26, 1.3, 1.8, -0.4, 'a', 'z');
    runeSword(g, 16, 25, 16, 1, 4.6);
  },

};

export const SPRITES: Record<string, V2SpriteEntry> = {
  /** Rün tableti (efekt parçası): açık çelik-mor, ortasında rün. */
  tablet: { size: 64, draw: (g) => tablet(g, 16, 16, 9, 13, 0, 'z', 'P') },
  /** Kırık tablet parçası. */
  shard: { size: 64, draw: (g) => {
    g.poly([6, 6, 22, 3, 27, 14, 12, 27], 'z');
    g.poly([6, 6, 22, 3, 14, 12], 'w');
    g.line(12, 18, 19, 10, 'P', 2);
  } },
  /** Mavi mana damlası (düşmanın manası). */
  bluedrop: { size: 64, draw: (g) => {
    g.poly([16, 2, 24, 17, 16, 30, 8, 17], 'u');
    g.disc(16, 20, 8, 'u');
    g.disc(16, 21, 5, 'c');
    g.disc(13.5, 18, 2, 'w');
  } },
  /** Mor boşluk iğnesi (yukarı bakar). */
  needle: { size: 96, draw: (g) => {
    g.poly([16, 1, 19.5, 20, 16, 31, 12.5, 20], 'P');
    g.poly([16, 1, 16, 31, 12.5, 20], 'p');
    g.line(15, 6, 15, 20, 'z', 0.8);
  } },
  /** Rünlü kılıç (efekt: savuruş hayaleti), yatay sağa bakar. */
  blade: { size: 128, draw: (g) => runeSword(g, 7, 16, 31, 16, 3) },
};
