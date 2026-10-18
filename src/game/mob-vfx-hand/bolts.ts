/**
 * MERMİ sürücüsü: saldırganın elinden hedefin yakın kenarına (k.contact) giden cisim. Yol ikinci derece eğri (yay yüksekliği `arc`),
 * F ms'de varır (flow.bolt'un verdiği süre: vuruş anı asıl sheet ile aynı). Geçmiş konumlar halkada tutulur (kuyruk / iz için).
 * Varıştan sonra `stuck` ile saplanmış hâli kısa süre çizilebilir (ok, kısa ok).
 */
import { clamp01, layer, lerp, type G, type Pt, type VfxCtx, type VfxKit } from './core';

export interface FlyOpt {
  from: Pt;
  to: Pt;
  /** Varış süresi (ms, slow). */
  F: number;
  /** Yay yüksekliği (px; + yukarı). */
  arc?: number;
  /** İlerleme üssü (1 = sabit hız; <1 hızlı çıkıp yavaşlar, >1 ivmelenir). */
  ease?: number;
  depth: number;
  /** Uçuş çizimi: konum, yön açısı, ilerleme (0-1), geçen ms, geçmiş konumlar (yeniden eskiye). */
  draw: (g: G, p: Pt, ang: number, q: number, tm: number, hist: Pt[]) => void;
  /** Varıştan sonra çizim süresi (ms, slow) ve çizimi (t = varıştan beri ms). */
  hold?: number;
  stuck?: (g: G, p: Pt, ang: number, t: number) => void;
  /** Geçmiş konum sayısı. */
  hist?: number;
  /** Yan salınım (px) ve frekansı (dalgalı uçuş: wisp, kuzgun). */
  wave?: number;
  waveF?: number;
}

export function pathAt(o: FlyOpt, q: number): Pt {
  const e = clamp01(q) ** (o.ease ?? 1);
  const mx = (o.from.x + o.to.x) / 2;
  const my = (o.from.y + o.to.y) / 2 - (o.arc ?? 0);
  const x = (1 - e) * (1 - e) * o.from.x + 2 * (1 - e) * e * mx + e * e * o.to.x;
  let y = (1 - e) * (1 - e) * o.from.y + 2 * (1 - e) * e * my + e * e * o.to.y;
  if (o.wave) y += Math.sin(e * Math.PI * (o.waveF ?? 2)) * o.wave * Math.sin(Math.PI * e);
  return { x, y };
}

export function fly(c: VfxCtx, k: VfxKit, o: FlyOpt): void {
  const hold = o.hold ?? 0;
  const H = o.hist ?? 10;
  const hist: Pt[] = [];
  let last = o.from;
  let lastAng = Math.atan2(o.to.y - o.from.y, o.to.x - o.from.x);
  layer(c, o.F + hold, o.depth, (g, tm) => {
    if (tm <= o.F) {
      const q = tm / Math.max(1, o.F);
      const p = pathAt(o, q);
      const nx = pathAt(o, Math.min(1, q + 0.02));
      const ang = q >= 0.999 ? lastAng : Math.atan2(nx.y - p.y, nx.x - p.x);
      hist.unshift(p);
      if (hist.length > H) hist.length = H;
      last = p;
      lastAng = ang;
      o.draw(g, p, ang, q, tm, hist);
    } else if (o.stuck) o.stuck(g, last, lastAng, tm - o.F);
  });
  void k;
}

/** İki nokta arası (ileri yönde) açı. */
export const angTo = (a: Pt, b: Pt): number => Math.atan2(b.y - a.y, b.x - a.x);
export const mid = (a: Pt, b: Pt, u = 0.5): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
