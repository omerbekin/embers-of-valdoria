/**
 * KODLA ARA KARE (Ömer 2026-10-18: ChatGPT mob animasyonlarında "kareler arasında boşluk kalıyor"): 8 karelik sheet'ten, aynı sürede
 * `sub` kat daha fazla kare üretir. Phaser'sız (yalnızca canvas); hem test sayfası (src/ui/debug-vfx-frames.ts) hem mob efekt oynatıcısı
 * (src/game/vfx-sheets.ts > inbetween seçeneği, varsayılan KAPALI) kullanır. Yöntemler ve ayarlar data/vfx-inbetween.json.
 *   crossfade          i. kare (1-u) ve i+1. kare (u) şeffaflığıyla toplanır (premultiplied 'lighter' = doğru doğrusal karışım).
 *   crossfade+motion   aynı karışım, ama iki kare de içeriğinin ağırlık merkezi / boyutu ara değere kaydırılıp ölçeklenir: çift görüntü
 *                      (hayalet) yerine tek bir şey ilerliyor gibi okunur. İçerik yoksa / çok küçükse (kıvılcım) ölçek uygulanmaz.
 * Çıktı N*sub kare: j. kare = zaman j/sub (j=0 asıl 0. kare; sub'ın katları asıl kareler). Son karenin ardından karışacak kare yok: tekrarlanır.
 */
import cfg from '../../data/vfx-inbetween.json';

export interface IbMethodCfg {
  label: string;
  motion: number;
  scale: number;
  scaleMin?: number;
  scaleMax?: number;
  minSize?: number;
  alphaMin?: number;
}

export const IB_CFG = cfg as unknown as {
  player: { enabled: boolean; method: string; sub: number };
  subOptions: number[];
  methods: Record<string, IbMethodCfg>;
  battleTest: { dummy: string; background: string; casterSlot: number; dummySlot: number; loopGapMs: number; speeds: number[] };
  test: {
    background: string;
    logical: [number, number];
    groundY: number;
    targetX: number;
    spriteHeight: number;
    scale: number;
    loopGapMs: number;
    speeds: number[];
    tweenDir: string;
    skills: Array<{ skill: string; label: string; target: string }>;
  };
};

export const IB_METHODS: readonly string[] = Object.keys(IB_CFG.methods);

interface Stat {
  cx: number;
  cy: number;
  size: number;
  empty: boolean;
}

function statsOf(c: HTMLCanvasElement, alphaMin: number): Stat {
  const w = c.width;
  const h = c.height;
  const px = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  let sa = 0;
  let sx = 0;
  let sy = 0;
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * 4 + 3]!;
      if (a < alphaMin) continue;
      sa += a;
      sx += a * x;
      sy += a * y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  if (sa <= 0 || x1 < 0) return { cx: w / 2, cy: h / 2, size: 0, empty: true };
  return { cx: sx / sa, cy: sy / sa, size: Math.sqrt((x1 - x0 + 1) * (y1 - y0 + 1)), empty: false };
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/** Tek bir ara kare: i. ve (i+1). kare arasında u (0-1). */
export function blendFrame(frames: readonly HTMLCanvasElement[], stats: readonly Stat[], i: number, u: number, m: IbMethodCfg): HTMLCanvasElement {
  const a = frames[i]!;
  const out = document.createElement('canvas');
  out.width = a.width;
  out.height = a.height;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'lighter';
  const j = Math.min(frames.length - 1, i + 1);
  if (u <= 0 || j === i) {
    ctx.drawImage(a, 0, 0);
    return out;
  }
  const sa = stats[i]!;
  const sb = stats[j]!;
  const motion = !sa.empty && !sb.empty && (m.motion > 0 || m.scale > 0);
  const tx = lerp(sa.cx, sb.cx, u);
  const ty = lerp(sa.cy, sb.cy, u);
  const ts = lerp(sa.size, sb.size, u);
  const draw = (img: HTMLCanvasElement, s: Stat, alpha: number): void => {
    ctx.globalAlpha = alpha;
    if (!motion) {
      ctx.drawImage(img, 0, 0);
      return;
    }
    const dx = (tx - s.cx) * m.motion;
    const dy = (ty - s.cy) * m.motion;
    let k = 1;
    if (m.scale > 0 && s.size >= (m.minSize ?? 0) && ts >= (m.minSize ?? 0)) {
      k = 1 + (Math.min(m.scaleMax ?? 1.35, Math.max(m.scaleMin ?? 0.75, ts / s.size)) - 1) * m.scale;
    }
    ctx.save();
    ctx.translate(s.cx + dx, s.cy + dy);
    ctx.scale(k, k);
    ctx.translate(-s.cx, -s.cy);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  };
  draw(a, sa, 1 - u);
  draw(frames[j]!, sb, u);
  ctx.globalAlpha = 1;
  return out;
}

/** N kareden N*sub kare üretir (sub=1: aynı kareler). */
export function buildInbetween(frames: readonly HTMLCanvasElement[], method: string, sub: number): HTMLCanvasElement[] {
  const m = IB_CFG.methods[method] ?? IB_CFG.methods[IB_METHODS[0]!]!;
  const stats = frames.map((f) => statsOf(f, m.alphaMin ?? 24));
  const out: HTMLCanvasElement[] = [];
  const n = Math.max(1, Math.round(sub));
  for (let i = 0; i < frames.length; i++) for (let s = 0; s < n; s++) out.push(blendFrame(frames, stats, i, s / n, m));
  return out;
}

/** Bir görüntüden yatay/ızgara sheet kareleri (satır sıralı) canvas dizisi olarak. */
export function sliceSheet(img: CanvasImageSource, frames: number, fw: number, fh: number, cols: number): HTMLCanvasElement[] {
  const list: HTMLCanvasElement[] = [];
  for (let i = 0; i < frames; i++) {
    const c = document.createElement('canvas');
    c.width = fw;
    c.height = fh;
    c.getContext('2d')!.drawImage(img, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh, 0, 0, fw, fh);
    list.push(c);
  }
  return list;
}

/** Bir karenin dayanak noktaları (src/game/vfx-sheets.ts > vfxSheetAnchors ile aynı kural, canvas'tan): core = ağırlık merkezi, base = alt %25 bandının merkezi. */
export function canvasAnchors(c: HTMLCanvasElement): { core: [number, number]; baseX: number; baseY: number } | null {
  const w = c.width;
  const h = c.height;
  const px = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const rowSum = new Float64Array(h);
  let sa = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * 4 + 3]!;
      rowSum[y]! += a;
      sa += a;
      sx += a * x;
      sy += a * y;
    }
  let top = -1;
  let bot = -1;
  for (let y = 0; y < h; y++)
    if (rowSum[y]! > 255 * 3) {
      if (top < 0) top = y;
      bot = y;
    }
  if (sa <= 0 || top < 0) return null;
  let ba = 0;
  let by = 0;
  let bx = 0;
  for (let y = Math.ceil(bot - (bot - top) * 0.25); y <= bot; y++) {
    ba += rowSum[y]!;
    by += rowSum[y]! * y;
    for (let x = 0; x < w; x++) bx += px[(y * w + x) * 4 + 3]! * x;
  }
  return { core: [sx / sa, sy / sa], baseX: ba > 0 ? bx / ba : sx / sa, baseY: ba > 0 ? by / ba : bot };
}
