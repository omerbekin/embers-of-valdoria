/**
 * KODLA ÜRETİLEN ALEV DOKUSU + alev alanı sürücüsü. Çok hücreli ateşlerde (Pyre of Morvane, Fall of King's Bridge, Burn the Field...)
 * her dil Graphics çokgeni olarak çizilince WebGL'de binlerce üçgen oluyordu (aynı anda birkaç efektte kasma). Bunun yerine alev dili
 * bir kez, ilk kullanımda, canvas 2D ile (dikey renk geçişi, yumuşak bulanık kenar, yukarı kopan küçük alev parçası) 12 karelik bir
 * dokuya çizilir; her dil havuzdan gelen tek bir Image (karesi zamana göre döner, tabanından hafifçe salınır). Asset dosyası YOK.
 */
import { clamp01, eo, giveImg, takeImg, type Pt, type Scene, type VfxCtx, type VfxKit } from './core';
import type { Tongue } from './draw';

export type FlamePal = 'fire' | 'holy' | 'pyre' | 'violet';
/** Renk durakları: dipten (sıcak çekirdek) uca (koyu kızıl). */
const STOPS: Record<FlamePal, string[]> = {
  fire: ['255,236,180', '255,190,70', '240,112,32', '176,44,10', '80,16,4'],
  holy: ['255,251,232', '255,224,128', '240,184,64', '192,122,28', '106,64,16'],
  pyre: ['255,224,160', '248,160,48', '216,80,26', '144,32,8', '58,8,4'],
  violet: ['240,224,255', '192,128,255', '128,64,208', '74,26,138', '26,10,48'],
};
const FRAMES = 12;
const FW = 64;
const FH = 128;

function flameTex(k: VfxKit, sc: Scene, pal: FlamePal): string {
  const key = `fx:mh-flame-${pal}`;
  if (sc.textures.exists(key)) return key;
  const tex = sc.textures.createCanvas(key, FW * FRAMES, FH);
  if (!tex) return key;
  const ctx = tex.getContext();
  const st = STOPS[pal];
  const shape = (cx: number, base: number, H: number, W: number, ph: number) => {
    const sway = Math.sin(ph) * 6 + Math.sin(ph * 2 + 1) * 3;
    const L: Array<[number, number]> = [];
    const R: Array<[number, number]> = [];
    for (let i = 0; i <= 14; i++) {
      const s = i / 14;
      const prof = Math.sin(Math.PI * (0.16 + 0.84 * s)) ** 0.8 * (1 - s) ** 0.45;
      const rip = Math.sin(s * 10 - ph * 2) * 2.2 * s;
      const x = cx + sway * s * s;
      const y = base - H * s;
      L.push([x - (W / 2) * prof + rip, y]);
      R.push([x + (W / 2) * prof + rip * 0.6, y]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0]![0], L[0]![1]);
    for (const [x, y] of L) ctx.lineTo(x, y);
    for (const [x, y] of R.reverse()) ctx.lineTo(x, y);
    ctx.closePath();
  };
  for (let f = 0; f < FRAMES; f++) {
    const ph = (f / FRAMES) * Math.PI * 2;
    const ox = f * FW;
    const cx = ox + FW / 2;
    const base = FH - 3;
    const H = FH - 12 + Math.sin(ph * 2) * 5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, 0, FW, FH);
    ctx.clip();
    if ('filter' in ctx) ctx.filter = 'blur(1.6px)';
    // dış gövde: dipte sıcak, uçta koyu kızıl ve saydam
    const g1 = ctx.createLinearGradient(0, base, 0, base - H);
    g1.addColorStop(0, `rgba(${st[1]},0.95)`);
    g1.addColorStop(0.25, `rgba(${st[2]},0.92)`);
    g1.addColorStop(0.6, `rgba(${st[3]},0.78)`);
    g1.addColorStop(0.88, `rgba(${st[4]},0.35)`);
    g1.addColorStop(1, `rgba(${st[4]},0)`);
    ctx.fillStyle = g1;
    shape(cx, base, H, 46, ph);
    ctx.fill();
    // orta: turuncu-sarı
    const g2 = ctx.createLinearGradient(0, base, 0, base - H * 0.72);
    g2.addColorStop(0, `rgba(${st[0]},0.95)`);
    g2.addColorStop(0.35, `rgba(${st[1]},0.85)`);
    g2.addColorStop(1, `rgba(${st[2]},0)`);
    ctx.fillStyle = g2;
    shape(cx, base, H * 0.72, 28, ph + 0.7);
    ctx.fill();
    // çekirdek: dipte açık
    const g3 = ctx.createRadialGradient(cx, base - 14, 1, cx, base - 14, 22);
    g3.addColorStop(0, `rgba(${st[0]},0.95)`);
    g3.addColorStop(1, `rgba(${st[0]},0)`);
    ctx.fillStyle = g3;
    ctx.fillRect(ox, base - 40, FW, 40);
    // uçtan kopan küçük alev parçası (bazı karelerde)
    const q = (f % 6) / 6;
    if (f % 2 === 0) {
      const fy = base - H * (0.85 + 0.12 * q);
      const g4 = ctx.createRadialGradient(cx + Math.sin(ph) * 6, fy, 0, cx + Math.sin(ph) * 6, fy, 7 * (1 - q * 0.5));
      g4.addColorStop(0, `rgba(${st[2]},${0.8 * (1 - q)})`);
      g4.addColorStop(1, `rgba(${st[3]},0)`);
      ctx.fillStyle = g4;
      ctx.fillRect(ox, fy - 10, FW, 20);
    }
    ctx.restore();
    tex.add(f, 0, ox, 0, FW, FH);
  }
  tex.refresh();
  tex.setFilter(k.Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/**
 * Alev alanı: her dil bir Image (havuzdan). `frame(tm)` -> { grow 0-1, a 0-1, lean }: tüm diller ortak zaman çizgisiyle büyür / söner;
 * her dil kendi `at` payıyla gecikir, kendi tohumuyla kare / salınım alır. `dur` (ms, slow) sonunda Image'lar havuza döner.
 */
export function flameField(
  c: VfxCtx,
  k: VfxKit,
  list: Tongue[],
  dur: number,
  depth: number | ((t: Tongue) => number),
  pal: FlamePal,
  frame: (tm: number) => { grow: number; a: number; lean?: number },
  o: { add?: boolean; offset?: () => Pt; each?: (t: Tongue, tm: number) => { g: number; a: number } } = {},
): void {
  if (!list.length) return;
  const sc = c.scene;
  const key = flameTex(k, sc, pal);
  const ims = list.map((t) => takeImg(sc, key, typeof depth === 'number' ? depth : depth(t), o.add).setOrigin(0.5, 1).setAlpha(0));
  const D = Math.max(1, dur);
  sc.tweens.addCounter({
    from: 0,
    to: 1,
    duration: D,
    onUpdate: (tw) => {
      const tm = (tw.getValue() ?? 0) * D;
      const f = frame(tm);
      const off = o.offset?.() ?? { x: 0, y: 0 };
      list.forEach((t, i) => {
        const im = ims[i]!;
        const per = o.each?.(t, tm);
        const gg = per ? per.g : clamp01((f.grow - t.at * 0.5) / 0.5);
        const al = per ? per.a : f.a;
        if (gg <= 0.01 || al <= 0.01) {
          im.setAlpha(0);
          return;
        }
        const fi = Math.floor((tm / k.slow(1000)) * 16 + t.seed * 7) % FRAMES;
        im.setFrame(fi);
        const h = t.h * gg * (1 + 0.08 * Math.sin(tm / k.slow(70) + t.seed));
        const w = t.w * (0.55 + 0.45 * gg) * 1.6; // doku dili kenar boşluklu: görünen en ~ t.w
        im.setPosition(t.x + off.x, t.y + off.y + 2).setScale(w / FW, h / (FH - 12)).setAlpha(al);
        im.setRotation((f.lean ?? 0) * 0.35 + Math.sin(tm / k.slow(160) + t.seed * 3) * 0.06);
      });
    },
    onComplete: () => ims.forEach((im) => giveImg(sc, im)),
  });
}

/** Tek hücre / nokta alev yatağı için hazır zaman çizgisi: `at`ta doruk, `hold` tutar, `fade` söner. */
export function bedTimeline(k: VfxKit, at: number, o: { pre?: number; hold?: number; fade?: number; surge?: number } = {}): (tm: number) => { grow: number; a: number } {
  const pre = k.slow(o.pre ?? 90);
  const HOLD = k.slow(o.hold ?? 380);
  const FADE = k.slow(o.fade ?? 420);
  const start = Math.max(0, at - pre);
  return (tm) => {
    if (tm < start) return { grow: 0, a: 0 };
    const grow =
      tm < at ? eo((tm - start) / Math.max(1, at - start), 2) * 0.9 : tm < at + HOLD ? 0.9 + (o.surge ?? 0.1) * Math.exp(-(tm - at) / k.slow(120)) : 0.9 * (1 - (tm - at - HOLD) / FADE);
    const a = tm < at + HOLD ? 1 : 1 - clamp01((tm - at - HOLD) / FADE) ** 1.5;
    return { grow: Math.max(0, grow), a };
  };
}
