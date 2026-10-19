/**
 * "Görkem" katmanları: mevcut efektin ÜSTÜNE eklenen ölçülü parçalar (Ömer 2026-10-20: "mevcut çizgilere ekleme yap").
 *   top        : çizim derinliği; HER ZAMAN tüm birimlerin üstünde (karakterlerin arasına sıkışmaz). Yalnızca zemine yatan desen k.FLOOR_FX'te.
 *   floorGlow  : zeminde soluk, basık ışık / kor havuzu (hücre başına, vuruşta doruk).
 *   condense   : doruktan hemen önce merkeze toplanan zerreler + doruğda kısa yumuşak parlama.
 * ADD yalnızca düşük alfada; neon / aşırı parlama yok.
 */
import { C, FLAT, TAU, after, clamp01, ei, eo, glow, layer, type Pt, type VfxCtx, type VfxKit } from './core';

/** Tüm birimlerin üstü (VfxKit.DEPTH + n). */
export const top = (k: VfxKit, n = 0): number => k.DEPTH + n;

export interface GlowItem {
  p: Pt;
  /** Doruk anı (ms, windUp başından; slow uygulanmış). */
  at: number;
}

/** Zemin parıltısı: iç içe üç basık elips; `pre` kadar önce belirir, `at`ta doruk, `hold` tutar, `fade` söner. Hücre başına tek elips yığını, tek Graphics. */
export function floorGlow(
  c: VfxCtx,
  k: VfxKit,
  items: GlowItem[],
  o: { rx: number; hex: string; core?: string; a?: number; pre?: number; hold?: number; fade?: number; pulse?: number; depth?: number },
): void {
  if (!items.length) return;
  const pre = k.slow(o.pre ?? 160);
  const hold = k.slow(o.hold ?? 420);
  const fade = k.slow(o.fade ?? 700);
  const end = Math.max(...items.map((i) => i.at)) + hold + fade;
  const col = C(o.hex);
  const core = C(o.core ?? o.hex);
  const A = o.a ?? 0.2;
  layer(
    c,
    end,
    o.depth ?? k.FLOOR_FX + 5,
    (g, tm) => {
      for (const it of items) {
        const t = tm - it.at;
        if (t < -pre || t > hold + fade) continue;
        const env = t < 0 ? eo((t + pre) / pre, 2) : t < hold ? 1 : (1 - (t - hold) / fade) ** 1.4;
        const pul = 1 + (o.pulse ?? 0) * Math.sin(tm / 90 + it.p.x * 0.05);
        const a = A * env * pul;
        const rx = o.rx * (0.8 + 0.2 * env);
        g.fillStyle(col, a * 0.5).fillEllipse(it.p.x, it.p.y, rx * 2.1, rx * 2.1 * FLAT);
        g.fillStyle(col, a * 0.8).fillEllipse(it.p.x, it.p.y, rx * 1.4, rx * 1.4 * FLAT);
        g.fillStyle(core, a).fillEllipse(it.p.x, it.p.y, rx * 0.7, rx * 0.7 * FLAT);
      }
    },
    true,
  );
}

/** Doruk öncesi yoğunlaşma: zerreler `r` yarıçapından merkeze (basık elips) toplanır, `at`ta sönerken yumuşak bir parlama açılır. */
export function condense(
  c: VfxCtx,
  k: VfxKit,
  p: Pt,
  o: { hex: string[]; at: number; r: number; depth: number; n?: number; life?: number; flat?: number; size?: [number, number]; flash?: { hex: string; w: number; h?: number; a?: number } },
): void {
  const n = o.n ?? 14;
  const L = Math.min(o.at, k.slow(o.life ?? 420));
  if (L > 20) {
    const list = Array.from({ length: n }, () => ({ an: k.rnd(0, TAU), r: o.r * k.rnd(0.65, 1), lag: k.rnd(0, 0.35), s: k.rnd(o.size?.[0] ?? 1.6, o.size?.[1] ?? 2.8), col: C(k.pick(o.hex)) }));
    layer(
      c,
      o.at + 20,
      o.depth,
      (g, tm) => {
        const u0 = (tm - (o.at - L)) / L;
        if (u0 < 0 || u0 > 1.05) return;
        for (const q of list) {
          const u = clamp01((u0 - q.lag) / (1 - q.lag));
          if (u <= 0 || u >= 1) continue;
          const rr = q.r * (1 - ei(u, 1.6) * 0.92);
          const x = p.x + Math.cos(q.an + u * 1.2) * rr;
          const y = p.y + Math.sin(q.an + u * 1.2) * rr * (o.flat ?? 0.7);
          const a = Math.sin(Math.PI * u) ** 0.8;
          g.fillStyle(q.col, a * 0.3).fillCircle(x, y, q.s * 2.1);
          g.fillStyle(q.col, a * 0.9).fillCircle(x, y, q.s);
        }
      },
      true,
    );
  }
  if (o.flash) {
    const f = o.flash;
    after(c, o.at, () => glow(c, k, p, f.w, f.h ?? f.w * 0.8, f.hex, { alpha: f.a ?? 0.45, dur: 300, grow: 1.5, depth: o.depth }));
  }
}
