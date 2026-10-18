/**
 * Sefer haritası düğüm çerçeveleri (Ömer 2026-10-18, mockup public/mockups/map-nodes.html varyant C "Madalyon + kurdele").
 * Hepsi yuvarlak; event / treasure / rest / merchant yan flamalı, town bayraklı + kuleli, elit boynuz yaylı + kızıl mücevherli,
 * boss alev kanatlı + taçlı. Geometri mockup'tan alındı ve FRAME_K ile küçültüldü (ikon boyu değişmez: çerçeve ikon çevresinde ince kalır).
 * Phaser'a bağımlı yalnızca `Graphics` çizimi; çizim bir kez yapılır (durum değişince harita yeniden kurulur), animasyon tween ile.
 */
import Phaser from 'phaser';
import type { NodeType } from '../campaign/types';

/** Mockup ölçeğinin kaçı (Ömer: "hafif küçült", ~%80-85). */
export const FRAME_K = 0.82;
/** Boss çerçevesi: ikon bugünkü gibi 55 px kaldığı için biraz daha sıkı. */
const BOSS_K = 0.76;

/** Tür rengi (mockup COL). */
export const FRAME_COL: Record<string, number> = {
  battle: 0xcdb67f, event: 0xb99ad6, treasure: 0xefc85a, rest: 0xf08c3c, merchant: 0x9fc4a0, town: 0xe3bf72, elite: 0xd9562c, boss: 0xff7a2a, start: 0xcdb67f,
};
/** Etiket şeridinin sol çizgisi için aynı renkler (CSS rengi değil sayı). */
export const frameColor = (t: string): number => FRAME_COL[t] ?? FRAME_COL.battle!;

export type FrameKind = 'battle' | 'tab' | 'town' | 'elite' | 'boss';
export const frameKind = (t: NodeType | string): FrameKind => (t === 'battle' || t === 'start' ? 'battle' : t === 'town' ? 'town' : t === 'elite' ? 'elite' : t === 'boss' ? 'boss' : 'tab');

export interface FrameSpec {
  /** Etiket / rozet mesafesi (merkezden). */
  R: number;
  /** Parıltı yarıçapı. */
  glowR: number;
  /** İkon kenarı (bugünkü boy: 44, boss 55). */
  icon: number;
  boss: boolean;
}

const BASE: Record<FrameKind, { R: number; glowR: number }> = {
  battle: { R: 33, glowR: 40 },
  tab: { R: 36, glowR: 46 },
  town: { R: 48, glowR: 56 },
  elite: { R: 50, glowR: 60 },
  boss: { R: 64, glowR: 84 },
};

export function frameSpec(type: NodeType | string): FrameSpec {
  const k = frameKind(type);
  const f = k === 'boss' ? BOSS_K : FRAME_K;
  const b = BASE[k];
  // Battle çerçevesi bugünkü yarıçapla (24) başlar: R en az ikon yarısı + pay
  return { R: Math.round(b.R * f), glowR: Math.round(b.glowR * f), icon: k === 'boss' ? 55 : 44, boss: k === 'boss' };
}

type Pt = { x: number; y: number };

/** Mini yol çözümleyici: M L Q Z (mutlak), Q 8 adımda örneklenir; hepsi `k` ile ölçeklenir. */
function pathPts(d: string, k: number): Pt[] {
  const t = d.match(/[MLQZ]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cur: Pt = { x: 0, y: 0 };
  const num = () => Number(t[i++]);
  while (i < t.length) {
    const c = t[i++]!;
    if (c === 'M' || c === 'L') {
      cur = { x: num() * k, y: num() * k };
      pts.push(cur);
    } else if (c === 'Q') {
      const cx = num() * k;
      const cy = num() * k;
      const x = num() * k;
      const y = num() * k;
      for (let s = 1; s <= 8; s++) {
        const u = s / 8;
        pts.push({ x: (1 - u) * (1 - u) * cur.x + 2 * (1 - u) * u * cx + u * u * x, y: (1 - u) * (1 - u) * cur.y + 2 * (1 - u) * u * cy + u * u * y });
      }
      cur = { x, y };
    }
  }
  return pts;
}

function shape(g: Phaser.GameObjects.Graphics, d: string, k: number, fill: number, fa: number, line: number, lw: number, la = 1): void {
  const pts = pathPts(d, k);
  g.fillStyle(fill, fa).fillPoints(pts, true, true);
  if (lw > 0) g.lineStyle(lw, line, la).strokePoints(pts, true, true);
}

function disc(g: Phaser.GameObjects.Graphics, r: number, line: number, lw: number): void {
  g.fillStyle(0x0d0805, 1).fillCircle(0, 0, r);
  g.fillStyle(0x2a1d11, 0.95).fillCircle(0, -r * 0.18, r * 0.66);
  g.fillStyle(0x1a110a, 0.9).fillCircle(0, -r * 0.1, r * 0.4);
  g.lineStyle(lw, line, 1).strokeCircle(0, 0, r);
}

/** Dönen seçim halkası için kesik daire (bir kez çizilir; tween döndürür). */
export function drawDashRing(g: Phaser.GameObjects.Graphics, r: number, color: number, lw: number): void {
  const n = 14;
  g.lineStyle(lw, color, 1);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    g.beginPath().arc(0, 0, r, a0, a0 + (Math.PI * 2 * 0.58) / n, false).strokePath();
  }
}

/** Çerçeveyi (ikon hariç) `g` içine çizer. Çizim ikonun ALTINDA kalır. */
export function drawFrame(g: Phaser.GameObjects.Graphics, type: NodeType | string): void {
  const kind = frameKind(type);
  const c = frameColor(type);
  const k = kind === 'boss' ? BOSS_K : FRAME_K;
  const S = (n: number) => n * k;
  if (kind === 'battle') {
    g.lineStyle(1, c, 0.3).strokeCircle(0, 0, S(31.5));
    disc(g, Math.max(S(28), 23.5), c, 2);
    return;
  }
  if (kind === 'tab') {
    for (const s of [-1, 1]) shape(g, `M${s * 30} -7 L${s * 46} 0 L${s * 30} 7 L${s * 34} 0`, k, c, 1, 0x000000, 1, 0.5);
    disc(g, S(29), c, 2.4);
    g.lineStyle(1, c, 0.4).strokeCircle(0, 0, S(25));
    return;
  }
  if (kind === 'town') {
    for (const s of [-1, 1]) {
      g.lineStyle(2, c, 1).lineBetween(S(s * 40), S(-12), S(s * 40), S(16));
      shape(g, `M${s * 40} -12 L${s * 58} -6 L${s * 40} 0`, k, 0x8c2b1c, 1, c, 1.6);
    }
    shape(g, 'M-14 -44 L-14 -52 L-8 -52 L-8 -47 L-3 -47 L-3 -52 L3 -52 L3 -47 L8 -47 L8 -52 L14 -52 L14 -44', k, c, 1, 0x000000, 1, 0.5);
    disc(g, S(34), c, 2.6);
    g.lineStyle(1.2, c, 0.6).strokeCircle(0, 0, S(39));
    return;
  }
  if (kind === 'elite') {
    for (const s of [-1, 1]) shape(g, `M${s * 30} -22 Q${s * 52} -26 ${s * 50} -50 Q${s * 42} -36 ${s * 24} -32`, k, 0x8f2f17, 1, 0xe5703a, 1.4);
    // kesik halka
    const r = S(39);
    g.lineStyle(2, 0x9b3a1c, 1);
    for (let i = 0; i < 22; i++) {
      const a0 = (i / 22) * Math.PI * 2;
      g.beginPath().arc(0, 0, r, a0, a0 + 0.17, false).strokePath();
    }
    disc(g, S(33), 0xe06a3a, 2.8);
    shape(g, 'M0 -44 L7 -37 L0 -30 L-7 -37', k, 0xe8352a, 1, 0xffcf7a, 1.3);
    return;
  }
  // boss: alev kanatlar + taç
  for (const s of [-1, 1]) {
    shape(g, `M${s * 40} -10 Q${s * 62} -34 ${s * 76} -62 Q${s * 70} -34 ${s * 82} -22 Q${s * 66} -16 ${s * 74} 4 Q${s * 58} -2 ${s * 56} 18 Q${s * 46} 6 ${s * 42} 12`, k, 0xd8501a, 1, 0xffcf7a, 1.2);
    shape(g, `M${s * 41} -6 Q${s * 58} -26 ${s * 68} -48 Q${s * 62} -24 ${s * 70} -12 Q${s * 58} -6 ${s * 52} 8 Q${s * 46} 0 ${s * 43} 6`, k, 0xff8a2a, 0.85, 0, 0);
  }
  disc(g, S(46), 0xf0c25a, 3);
  g.lineStyle(1.6, 0xff7a2a, 1).strokeCircle(0, 0, S(41));
  [-18, 0, 18].forEach((x, i) => shape(g, `M${x - 7} -48 L${x} ${-64 - (i === 1 ? 6 : 0)} L${x + 7} -48`, k, 0xf0c25a, 1, 0x7a4a10, 1));
  g.fillStyle(0xe8352a, 1).fillCircle(0, S(-54), 2.6);
}

/** Durum rozetleri (sağ alt): temizlendi = onay, ulaşılamaz = çarpı, sis / kilitli = kilit. */
export function drawBadge(g: Phaser.GameObjects.Graphics, kind: 'check' | 'x' | 'lock', x: number, y: number): void {
  if (kind === 'check') {
    g.fillStyle(0x1b2a14, 1).fillCircle(x, y, 10).lineStyle(1.6, 0xe3bf72, 1).strokeCircle(x, y, 10);
    g.lineStyle(2.4, 0xf3d999, 1).beginPath().moveTo(x - 4.5, y + 0.5).lineTo(x - 1.5, y + 3.6).lineTo(x + 5, y - 3.6).strokePath();
  } else if (kind === 'x') {
    g.fillStyle(0x241512, 1).fillCircle(x, y, 9).lineStyle(1.4, 0x8a6a5a, 1).strokeCircle(x, y, 9);
    g.lineStyle(2, 0xb89a88, 1).lineBetween(x - 3.6, y - 3.6, x + 3.6, y + 3.6).lineBetween(x + 3.6, y - 3.6, x - 3.6, y + 3.6);
  } else {
    g.fillStyle(0x1a130d, 1).fillCircle(x, y, 9).lineStyle(1.4, 0x8d7d5e, 1).strokeCircle(x, y, 9);
    g.fillStyle(0xb8a77f, 1).fillRect(x - 3.6, y - 1, 7.2, 5.4);
    g.lineStyle(1.5, 0xb8a77f, 1).beginPath().moveTo(x - 2.4, y - 1).lineTo(x - 2.4, y - 3).arc(x, y - 3, 2.4, Math.PI, 0, false).lineTo(x + 2.4, y - 1).strokePath();
  }
}
