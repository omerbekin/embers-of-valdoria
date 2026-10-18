/**
 * REND (Grey Wolf) ve GLYPH OF BREAKING (Deep Runecaller): Ömer'in "çok iyi" bulduğu iki el yapımı efekt, OLDUĞU GİBİ korunur (2026-10-18
 * önceki src/game/mob-vfx-hand.ts'ten taşındı; kendi eski yardımcılarıyla birlikte, görünüş birebir aynı kalsın diye). Diğer tüm mob
 * efektleri bu ikisinin diliyle yazılır (core.ts / draw.ts).
 *   Rend: c.lunge -> hızlı tırmık vuruştan hemen önce başlar (en uzun tırnak gövde ortasını ~hitMs'te geçer) -> hitMs anında zerreler +
 *     kısa sarsıntı (90 ms). İzler KOYU (ADD yok), koyulaşıp söner, kalın damlalar süzülür; izler birimle birlikte kayar.
 *   Glyph of Breaking: c.windUp -> hitMs sonra tüm hücrelerde aynı anda fışkırma + kısa sarsıntı. Rün dairesi, artı kolları boyunca
 *     çatlaklar, vuruşta ışık sütunu, her hücrede taş fışkırması.
 */
import type Phaser from 'phaser';
import type { CombatantView } from '../combatant-view';
import type { VfxCtx } from '../vfx';
import type { VfxKit } from '../vfx-versions';
import type { MobHandVfx } from '../mob-vfx';

type Pt = { x: number; y: number };
type Scene = Phaser.Scene;

const ADD = 1; // Phaser.BlendModes.ADD
const CELL_DEPTH = 8;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => u * u * (3 - 2 * u);
const after = (c: VfxCtx, ms: number, fn: () => void) => c.scene.time.delayedCall(ms, fn);

/** Yumuşak beyaz ışık dokusu (renk tint ile; ADD karışımıyla kullanılır). */
function glowKey(k: VfxKit, scene: Scene): string {
  return k.softTexture(scene, 'fx:hand-glow', 64, 64, (x, y) => {
    const d = Math.hypot((x + 0.5 - 32) / 32, (y + 0.5 - 32) / 32);
    if (d >= 1) return null;
    return { c: '#ffffff', a: (1 - d) ** 1.6 };
  });
}

/** Duman dokusu: kenarı yumuşak, ortası dolgun beyaz top (tint + normal karışım). */
function puffKey(k: VfxKit, scene: Scene): string {
  return k.softTexture(scene, 'fx:hand-puff', 48, 48, (x, y) => {
    const d = Math.hypot((x + 0.5 - 24) / 24, (y + 0.5 - 24) / 24);
    if (d >= 1) return null;
    return { c: '#ffffff', a: Math.min(1, (1 - d) * 1.8) };
  });
}

/** Parlayan yumuşak ışık: büyüyüp söner. */
function glow(c: VfxCtx, k: VfxKit, p: Pt, w: number, h: number, hex: string, o: { alpha?: number; dur?: number; grow?: number; depth?: number } = {}): void {
  const img = c.scene.add.image(p.x, p.y, glowKey(k, c.scene)).setDisplaySize(w, h).setTint(k.color(hex)).setBlendMode(ADD).setAlpha(o.alpha ?? 0.9).setDepth(o.depth ?? k.DEPTH);
  const g = o.grow ?? 1.6;
  c.scene.tweens.add({ targets: img, scaleX: img.scaleX * g, scaleY: img.scaleY * g, alpha: 0, duration: k.slow(o.dur ?? 300), ease: 'Quad.easeOut', onComplete: () => img.destroy() });
}

/** Zemine yatık, genişleyen şok halkası (çift çizgi: dış renkli, iç açık). */
function groundRing(c: VfxCtx, k: VfxKit, p: Pt, r: number, cols: [string, string], dur: number, depth: number, flat = 0.3): void {
  const g = c.scene.add.graphics().setDepth(depth).setBlendMode(ADD);
  const c0 = k.color(cols[0]);
  const c1 = k.color(cols[1]);
  void k.counter(c.scene, k.slow(dur), (u) => {
    g.clear();
    const e = 1 - (1 - u) ** 2.4;
    const rr = r * (0.18 + 0.82 * e);
    const a = (1 - u) ** 1.3;
    g.lineStyle(Math.max(2, 9 * (1 - u)), c0, a * 0.8).strokeEllipse(p.x, p.y, rr * 2, rr * 2 * flat);
    g.lineStyle(Math.max(1.5, 4 * (1 - u)), c1, a).strokeEllipse(p.x, p.y, rr * 1.8, rr * 1.8 * flat);
    if (u >= 1) g.destroy();
  });
}

/** Yükselen / süzülen yumuşak duman topları. */
function puffs(c: VfxCtx, k: VfxKit, p: Pt, n: number, o: { hex: string[]; spreadX: number; spreadY?: number; rise: number; size: [number, number]; dur: [number, number]; alpha: number; depth: number; drift?: number; delay?: number }): void {
  for (let i = 0; i < n; i++) {
    const img = c.scene.add
      .image(p.x + k.rnd(-o.spreadX, o.spreadX), p.y + k.rnd(-(o.spreadY ?? 0), o.spreadY ?? 0), puffKey(k, c.scene))
      .setTint(k.color(k.pick(o.hex)))
      .setDepth(o.depth)
      .setAlpha(0);
    const s = k.rnd(o.size[0], o.size[1]);
    img.setDisplaySize(s, s);
    const sc = img.scaleX;
    const dur = k.slow(k.rnd(o.dur[0], o.dur[1]));
    const dx = k.rnd(-1, 1) * (o.drift ?? 30);
    c.scene.tweens.add({
      targets: img,
      delay: k.slow((o.delay ?? 0) + k.rnd(0, 120)),
      y: img.y - o.rise * k.rnd(0.6, 1.1),
      x: img.x + dx,
      scaleX: sc * 1.8,
      scaleY: sc * 1.8,
      duration: dur,
      ease: 'Sine.easeOut',
      onUpdate: (tw) => img.setAlpha(o.alpha * Math.sin(Math.PI * clamp01(tw.progress))),
      onComplete: () => img.destroy(),
    });
  }
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Vuruş anı (sheet sürümüyle aynı): kalan sesler + Promise çözülür. */
function land(c: VfxCtx, at: number): Promise<void> {
  const d = deferred();
  after(c, at, () => {
    for (const x of (c.skill.sfx ?? []).slice(1)) c.sfx(x);
    d.resolve();
  });
  return d.promise;
}
// ORTAK: tek Graphics'te simüle edilen dönen parçalar (taş, kemik kıymığı, kan damlası). Her biri kendi ömrü, yer çekimi ve dönüşüyle;
// fizik yavaşlatılmamış zamanda (k.slow yalnızca süreyi uzatır: yavaş çekimde parçalar da yavaş uçar).

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  /** Yerel şekil (birim boyut, merkez 0,0). */
  pts: Pt[];
  size: number;
  col: number;
  /** Ömür (ms, yavaşlatılmadan). */
  life: number;
  delay: number;
  /** İsteğe bağlı açık kenar (taşın ışık alan yüzü). */
  rim?: number;
}

/** Düzensiz taş: 5-7 köşeli, köşeleri rastgele içe/dışa. */
const rockShape = (k: VfxKit): Pt[] => {
  const n = 5 + Math.floor(k.rnd(0, 3));
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + k.rnd(-0.25, 0.25);
    const r = k.rnd(0.62, 1);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * k.rnd(0.7, 1) };
  });
};
/** Sivri yaprak / kıymık (asıl sheet'teki koyu "yaprak" kırıklar). */
const shardShape = (k: VfxKit): Pt[] => {
  const w = k.rnd(0.22, 0.36);
  return [
    { x: 1, y: 0 },
    { x: 0.1, y: w },
    { x: -1, y: k.rnd(-0.05, 0.05) },
    { x: 0.1, y: -w * 0.7 },
  ];
};

function debris(c: VfxCtx, k: VfxKit, bits: Bit[], depth: number, gravity: number): void {
  if (!bits.length) return;
  const sc = c.scene;
  const g = sc.add.graphics().setDepth(depth);
  const f = k.slow(1000) / 1000; // yavaşlatma çarpanı
  const maxMs = Math.max(...bits.map((b) => b.delay + b.life));
  void k.counter(sc, maxMs * f, (u) => {
    g.clear();
    const tMs = u * maxMs;
    for (const b of bits) {
      const t = tMs - b.delay;
      if (t < 0 || t > b.life) continue;
      const s = t / 1000;
      const x = b.x + b.vx * s;
      const y = b.y + b.vy * s + 0.5 * gravity * s * s;
      const r = b.rot + b.vr * s;
      const q = t / b.life;
      const a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
      const cs = Math.cos(r);
      const sn = Math.sin(r);
      const pts = b.pts.map((p) => ({ x: x + (p.x * cs - p.y * sn) * b.size, y: y + (p.x * sn + p.y * cs) * b.size }));
      g.fillStyle(b.col, a).fillPoints(pts, true);
      if (b.rim !== undefined) g.lineStyle(Math.max(1.5, b.size * 0.14), b.rim, a * 0.9).strokePoints(pts.slice(0, Math.ceil(pts.length / 2)), false);
    }
    if (u >= 1) g.destroy();
  });
}
// ---------------------------------------------------------------------------------------------------------------------
// REND (Grey Wolf): gerçekçi pençe tırmığı (Ömer 2026-10-18: "daha gerçekçi, pençe izleri çok parlamasın")
// Katman disiplini Glyph of Breaking gibi: tek ana çizim (yaralar + damlalar, her kare), kısa vuruş katmanı (zerre, kıl, toz).
// ADD karışımı / ak-sıcak çekirdek / kıvılcım / ışın YOK: her şey normal karışımla koyu renkte çizilir.

/** Mat kan zerreleri (koyu, parlamasız). */
const GORE = ['#2a0507', '#3e080b', '#560c10', '#6e1214'];
/** Kopan kıl / kumaş lifleri (gri kurt kılı + koyu kumaş). */
const FIBER = ['#5e554e', '#7a6f66', '#463c36', '#4a3a2c', '#5a4634'];
/** Pençeler: patiden yelpaze gibi açılan 4 tırnak. [dik kayma (px), açı sapması (rad), boy çarpanı, gecikme (ms), kalınlık (px)] */
const RAKES = [
  { off: -27, da: -0.04, len: 0.82, lag: 0, w: 6 },
  { off: -9, da: -0.012, len: 1.0, lag: 12, w: 7.5 },
  { off: 9, da: 0.016, len: 0.95, lag: 22, w: 7 },
  { off: 26, da: 0.045, len: 0.76, lag: 34, w: 5.5 },
];

/** İki rengi karıştırır (0xRRGGBB): t=0 a, t=1 b. */
function mixCol(a: number, b: number, t: number): number {
  const m = (sh: number) => Math.round(lerp((a >> sh) & 255, (b >> sh) & 255, t)) << sh;
  return m(16) | m(8) | m(0);
}

/**
 * Pençe izi şeridi: A'dan B'ye hafif bombeli; [0, head] arası görünür, kalınlık `wAt(s)` (girişte iğne, ortada dolgun, çıkışta uzun incelme),
 * `rag` yırtık kenarı (iki kenar ayrı titrer). Merkez hattını da döndürür (damlalar ve kenar ışığı için).
 */
function rakePoly(A: Pt, B: Pt, bow: number, head: number, wAt: (s: number) => number, rag: number[][]): { poly: Pt[]; mid: Pt[]; top: Pt[] } {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const N = 18;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const mid: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const s = (head * i) / N;
    const bw = Math.sin(Math.PI * s) * bow;
    const cx = A.x + dx * s + nx * bw;
    const cy = A.y + dy * s + ny * bw;
    const j = Math.min(rag[0]!.length - 1, Math.round(s * (rag[0]!.length - 1)));
    const w = wAt(s) / 2;
    mid.push({ x: cx, y: cy });
    left.push({ x: cx + nx * w * rag[0]![j]!, y: cy + ny * w * rag[0]![j]! });
    right.push({ x: cx - nx * w * rag[1]![j]!, y: cy - ny * w * rag[1]![j]! });
  }
  // üst kenar: ekranda yukarıda kalan kenar (soluk kenar ışığı yalnızca oraya düşer)
  const top = [...((left[N >> 1]?.y ?? 0) < (right[N >> 1]?.y ?? 0) ? left : right)];
  return { poly: [...left, ...right.reverse()], mid, top };
}

interface Drip {
  rake: number;
  s: number;
  t0: number;
  /** Süzülme hızı (px/s) ve en fazla boy (px). */
  v: number;
  max: number;
}

function rendOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const sc = c.scene;
  const dir = v.container.x >= c.actor.container.x ? 1 : -1; // hedef saldırganın sağında: +1
  const depth = v.container.depth;
  const body = k.spot(v);
  const mid0 = { x: body.x + dir * v.w * 0.08, y: body.y - v.h * 0.04 }; // gövdenin ortası, biraz arka tarafa (izler havada kalmasın)
  const L = Math.max(190, Math.min(260, v.h * 0.85));
  // yön: kurt tarafında yukarıdan başlar, hedefin arkasına doğru aşağı çapraz tırmıklar ("\" ya da "/" saldırgana göre)
  const ang = 1.12;
  const rakes = RAKES.map((r) => {
    const a = ang + r.da;
    const ux = dir * Math.cos(a);
    const uy = Math.sin(a);
    const o = { x: mid0.x + -uy * r.off, y: mid0.y + ux * r.off };
    const h = (L * r.len) / 2;
    const rag = [0, 1].map(() => Array.from({ length: 19 }, () => k.rnd(0.68, 1.22)));
    return { ...r, rag, A: { x: o.x - ux * h, y: o.y - uy * h }, B: { x: o.x + ux * h, y: o.y + uy * h } };
  });
  const bow = -dir * 10; // pençe yayı: hafif bombe (bilek dönüşü)
  // zamanlama: hızlı savuruş vuruştan hemen önce başlar, en uzun tırnağın ucu gövde ortasını ~T anında geçer
  const SW = Math.min(T * 0.7, k.slow(120)); // bir tırnağın boydan boya geçişi
  const start = T - SW * 0.62;
  const HOLD = k.slow(240); // izin taze (kırmızı) kaldığı süre
  const FADE = k.slow(420); // koyulaşarak sönme
  const total = T + HOLD + FADE + k.slow(80);
  const cEdge = k.color('#170705'); // yırtık kenar: kahverengi-siyah
  const cFlesh = k.color('#4a080b'); // iç: koyu kırmızı
  const cDeep = k.color('#240306'); // yarığın dibi
  const cWet = k.color('#631012'); // taze iç (biraz açık; parlamaz)
  const cDry = k.color('#160605'); // kuruyan / koyulaşan renk
  const cRim = k.color('#c9a99a'); // çok soluk kenar ışığı (yalnızca taze iz, düşük alfa)
  const cSmear = k.color('#8a7a70');
  const g = sc.add.graphics().setDepth(depth + 2);
  // izler hedefin üstünde durur: birim geri itilince (kap + sprite kayması) onunla gider
  const x0 = v.container.x;
  const sx0 = v.sprite.x;
  const drips: Drip[] = [];
  for (let i = 0; i < 6; i++) drips.push({ rake: i % RAKES.length, s: k.rnd(0.3, 0.75), t0: T + k.slow(k.rnd(90, 260)), v: k.rnd(45, 80), max: k.rnd(34, 58) });
  void k.counter(sc, total, (u) => {
    const tm = u * total;
    g.clear();
    const fx = v.container.x - x0 + (v.sprite.x - sx0);
    const post = clamp01((tm - T - HOLD) / FADE); // 0 taze, 1 tamamen söndü
    const dry = smooth(clamp01((tm - T) / (HOLD + FADE * 0.6))); // koyulaşma
    const alpha = 1 - post ** 1.4;
    for (let ri = 0; ri < rakes.length; ri++) {
      const r = rakes[ri]!;
      const t0 = start + k.slow(r.lag);
      if (tm < t0) continue;
      const q = clamp01((tm - t0) / SW);
      const head = 1 - (1 - q) ** 3; // hızlı girer, sonda yavaşlar
      const since = Math.max(0, tm - t0 - SW); // tırnak çıktıktan sonra geçen süre
      // açılma: tırnağın geçtiği yer kısa sürede tam genişliğe açılır; sönmede hafifçe kapanır
      const wAt = (s: number) => {
        const open = smooth(clamp01((head - s) / 0.28 + since / k.slow(70) + 0.25));
        const taper = clamp01(s / 0.1) ** 0.7 * clamp01((1 - s) / 0.38) ** 0.9;
        return r.w * taper * open * (1 - 0.35 * post);
      };
      const A = { x: r.A.x + fx, y: r.A.y };
      const B = { x: r.B.x + fx, y: r.B.y };
      const outer = rakePoly(A, B, bow, head, (s) => wAt(s) * 1.6, r.rag);
      const inner = rakePoly(A, B, bow, head, wAt, r.rag);
      const core = rakePoly(A, B, bow, head, (s) => wAt(s) * 0.45, r.rag);
      if (outer.poly.length < 4) continue;
      g.fillStyle(mixCol(cEdge, cDry, dry * 0.6), 0.82 * alpha).fillPoints(outer.poly, true);
      g.fillStyle(mixCol(mixCol(cWet, cFlesh, clamp01((tm - T) / k.slow(140))), cDry, dry * 0.75), 0.95 * alpha).fillPoints(inner.poly, true);
      g.fillStyle(mixCol(cDeep, cDry, dry * 0.8), 0.9 * alpha).fillPoints(core.poly, true);
      // ince soluk kenar ışığı: yalnızca taze izde, üst kenarda, çok düşük alfa
      const rimA = 0.14 * (1 - dry) * alpha;
      if (rimA > 0.01 && inner.top.length > 3) g.lineStyle(1.2, cRim, rimA).strokePoints(inner.top.slice(2, -3), false);
      // hareket bulanıklığı: tırnak ucunun hemen arkasında çok ince, kısa, soluk iz (yalnızca savuruş sırasında)
      if (q < 1) {
        const n = inner.mid.length;
        const tip = inner.mid[n - 1]!;
        const back = inner.mid[Math.max(0, n - 6)]!;
        const sa = 0.3 * Math.sin(Math.PI * q);
        g.lineStyle(1.6, cSmear, sa).lineBetween(back.x, back.y, tip.x, tip.y);
        g.lineStyle(3.5, cSmear, sa * 0.35).lineBetween(back.x, back.y, tip.x, tip.y);
      }
    }
    // izlerden aşağı süzülen birkaç damla (iz koyulaştıkça onlar da koyulaşır)
    for (const d of drips) {
      if (tm < d.t0) continue;
      const r = rakes[d.rake]!;
      const s = d.s;
      const bw = Math.sin(Math.PI * s) * bow;
      const Lr = Math.hypot(r.B.x - r.A.x, r.B.y - r.A.y) || 1;
      const px = r.A.x + (r.B.x - r.A.x) * s + (-(r.B.y - r.A.y) / Lr) * bw + fx;
      const py = r.A.y + (r.B.y - r.A.y) * s + ((r.B.x - r.A.x) / Lr) * bw + 3;
      const ts = (tm - d.t0) / k.slow(1000);
      const len = Math.min(d.max, d.v * ts * (1 + ts * 0.8)); // yavaş başlar, biraz hızlanır, boyu sınırlı
      const col = mixCol(mixCol(cWet, cFlesh, 0.4), cDry, dry * 0.65);
      // kalın damla (1x hızda okunsun): izde küçük birikinti, süzülen gövde, altta şişkin uç
      g.fillStyle(col, 0.95 * alpha).fillCircle(px, py, 3.6);
      g.lineStyle(5, col, 0.92 * alpha).lineBetween(px, py, px, py + len);
      g.fillStyle(col, 0.97 * alpha).fillEllipse(px, py + len + 1, 9, 11);
    }
    if (u >= 1) g.destroy();
  });

  // vuruş: mat kan / toz zerreleri tırmık yönünde savrulur, birkaç kıl-kumaş lifi kopar, koyu toz bulutu; parlama yok
  after(c, T, () => {
    const p = { x: mid0.x + dir * 6, y: mid0.y + 6 };
    const rakeA = Math.atan2(Math.sin(ang), dir * Math.cos(ang)); // tırmık yönü (aşağı, hedefin arkasına)
    const gore: Bit[] = Array.from({ length: 14 }, () => {
      const a = rakeA + k.rnd(-0.75, 0.45) * dir;
      const sp = k.rnd(120, 340);
      return { x: p.x + k.rnd(-26, 26), y: p.y + k.rnd(-30, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - k.rnd(60, 160), rot: k.rnd(0, 6), vr: k.rnd(-4, 4), pts: rockShape(k), size: k.rnd(2.5, 5.5), col: k.color(k.pick(GORE)), life: k.rnd(360, 620), delay: k.rnd(0, 30) };
    });
    debris(c, k, gore, depth + 3, 1300);
    // kopan kıl / kumaş: ince lifler, yavaş döner, hafif süzülür
    const fibers: Bit[] = Array.from({ length: 6 }, () => {
      const a = rakeA + k.rnd(-1.1, 0.3) * dir - 0.5 * dir;
      const sp = k.rnd(70, 190);
      return { x: p.x + k.rnd(-20, 20), y: p.y + k.rnd(-24, 18), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90, rot: k.rnd(0, 6), vr: k.rnd(-6, 6), pts: shardShape(k), size: k.rnd(6, 10), col: k.color(k.pick(FIBER)), life: k.rnd(560, 860), delay: k.rnd(0, 50) };
    });
    debris(c, k, fibers, depth + 3, 380);
    puffs(c, k, p, 3, { hex: ['#3a1612', '#4a2018', '#2e1410'], spreadX: 28, spreadY: 26, rise: 18, size: [34, 54], dur: [360, 520], alpha: 0.2, depth: depth + 1, drift: 26 });
  });
}

const REND_SHAKE_MS = 90; // kısa, kontrollü sarsıntı
const REND_SHAKE_MAG = 0.0028;

const rend: MobHandVfx = async (c, k, hitMs) => {
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  const t = c.targets[0];
  await c.lunge(t ? t.container.x : c.actor.container.x);
  const T = k.slow(hitMs);
  for (const v of c.targets) rendOn(c, k, v, T);
  after(c, T, () => k.shake(c.scene, REND_SHAKE_MS, REND_SHAKE_MAG));
  return land(c, T);
};

// ---------------------------------------------------------------------------------------------------------------------
// GLYPH OF BREAKING (Deep Runecaller): zemine kazınan camgöbeği rün, artı kolları boyunca çatlak, her hücrede taş fışkırması

const RUNE = ['#4fe3ff', '#9ff3ff', '#ffffff', '#1aa8d8'];
const STONE = ['#2a2624', '#3a3430', '#4a423a', '#332c28'];
const FLAT = 0.36; // zemin elipsi basıklığı

/** Çatlak: a'dan b'ye zikzak (dik sapma), iki küçük dal. Noktalar bir kez üretilir, her kare gelişme oranıyla çizilir. */
function crackPath(k: VfxKit, a: Pt, b: Pt): { main: Pt[]; branches: Array<{ at: number; pts: Pt[] }> } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const N = 8;
  const main = Array.from({ length: N + 1 }, (_, i) => {
    const s = i / N;
    const j = i === 0 || i === N ? 0 : k.rnd(-1, 1) * 11 * Math.sin(Math.PI * s);
    return { x: a.x + dx * s + nx * j, y: a.y + dy * s + ny * j * 0.6 };
  });
  const branches = [0.35, 0.7].map((at) => {
    const p = main[Math.round(at * N)]!;
    const side = k.pick([-1, 1]);
    const bl = L * k.rnd(0.16, 0.26);
    const bx = dx / L * 0.55 + nx * side * 0.85;
    const by = dy / L * 0.55 + ny * side * 0.85 * 0.6;
    return { at, pts: [p, { x: p.x + bx * bl * 0.5 + k.rnd(-4, 4), y: p.y + by * bl * 0.5 }, { x: p.x + bx * bl, y: p.y + by * bl }] };
  });
  return { main, branches };
}

/** Çoklu çizginin [0, g] kısmı (g 0-1, uzunluğa göre). */
function partial(pts: Pt[], g: number): Pt[] {
  if (g >= 1) return pts;
  if (g <= 0 || pts.length < 2) return [];
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  let left = seg.reduce((a, b) => a + b, 0) * g;
  const out: Pt[] = [pts[0]!];
  for (let i = 0; i < seg.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (left >= seg[i]!) {
      out.push(b);
      left -= seg[i]!;
    } else {
      const u = left / seg[i]!;
      out.push({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
      break;
    }
  }
  return out;
}

/** Hücrede taş fışkırması: taşlar, rün kıvılcımı, artı biçimli parlama, zemin halkası, toz. */
function glyphErupt(c: VfxCtx, k: VfxKit, p: Pt, big: boolean): void {
  const sc = c.scene;
  const depth = p.y + CELL_DEPTH + 1;
  const n = big ? 11 : 7;
  const rocks: Bit[] = Array.from({ length: n }, () => {
    const a = -Math.PI / 2 + k.rnd(-0.85, 0.85);
    const sp = k.rnd(260, big ? 640 : 520);
    return { x: p.x + k.rnd(-26, 26), y: p.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: k.rnd(0, 6), vr: k.rnd(-7, 7), pts: rockShape(k), size: k.rnd(big ? 14 : 11, big ? 28 : 21), col: k.color(k.pick(STONE)), life: k.rnd(480, 760), delay: k.rnd(0, 40), rim: k.color('#7fe9ff') };
  });
  debris(c, k, rocks, depth + 1, 1500);
  k.burst(sc, p.x, p.y - 10, { colors: RUNE, n: big ? 12 : 8, speed: [180, 480], angle: [-Math.PI + 0.2, -0.2], gravity: 500, life: [260, 520], size: [14, 24], depth: depth + 2 });
  // artı biçimli parlama (sheet'in hücre yıldızı): yatay uzun, dikey uzun ince ışık
  const key = glowKey(k, sc);
  const fy = p.y - (big ? 34 : 24);
  for (const [w, h] of (big ? [[380, 18], [18, 300]] : [[240, 12], [12, 170]]) as Array<[number, number]>) {
    const f = sc.add.image(p.x, fy, key).setDisplaySize(w * 0.25, h * 0.25).setTint(k.color('#bff6ff')).setBlendMode(ADD).setDepth(depth + 2);
    const sx = f.scaleX;
    const sy = f.scaleY;
    sc.tweens.add({ targets: f, scaleX: sx * 4, scaleY: sy * 4, duration: k.slow(120), ease: 'Quad.easeOut' });
    sc.tweens.add({ targets: f, alpha: 0, delay: k.slow(100), duration: k.slow(260), onComplete: () => f.destroy() });
  }
  glow(c, k, { x: p.x, y: p.y - 20 }, big ? 240 : 160, big ? 170 : 110, '#2fd8ff', { alpha: 0.75, dur: 340, grow: 1.4, depth: depth + 1 });
  groundRing(c, k, p, big ? 190 : 110, ['#1aa8d8', '#bff6ff'], big ? 460 : 360, k.FLOOR_FX + 4, FLAT);
  puffs(c, k, { x: p.x, y: p.y - 14 }, big ? 6 : 4, { hex: ['#4a5a5e', '#5e6e70', '#3a4446'], spreadX: 46, spreadY: 6, rise: 50, size: [44, 72], dur: [460, 700], alpha: 0.4, depth, drift: 50 });
}

const glyphOfBreaking: MobHandVfx = async (c, k, hitMs) => {
  const sc = c.scene;
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  await c.windUp('#4fe3ff', 'cast');
  const T = k.slow(hitMs);
  const cells = c.cells.length ? c.cells : c.targets.map((v) => k.feet(v));
  if (!cells.length) return land(c, T);
  // artının merkezi: seçilen merkez yuva (yoksa diğerlerine en yakın hücre); kenarda kırpılan artıda merkez ağırlık merkezinden farklıdır
  const C: Pt =
    c.center !== undefined && c.slots?.includes(c.center)
      ? k.cellMid(c.board, c.center)
      : cells.reduce((best, p) => (Math.max(...cells.map((q) => Math.hypot(q.x - p.x, q.y - p.y))) < Math.max(...cells.map((q) => Math.hypot(q.x - best.x, q.y - best.y))) ? p : best), cells[0]!);
  const arms = cells.filter((p) => Math.hypot(p.x - C.x, p.y - C.y) > 8);
  // çatlaklar hücrenin biraz ötesine taşar (artı okunsun)
  const cracks = arms.map((p) => crackPath(k, C, { x: C.x + (p.x - C.x) * 1.3, y: C.y + (p.y - C.y) * 1.3 }));
  const R = 128;
  const ell = (a: number, r: number): Pt => ({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r * FLAT });
  // taş zemin diski: dikenli, kırık kenarlı koyu leke (sheet'in ilk karesi)
  const diskPts = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    return { a, r: i % 2 ? k.rnd(0.95, 1.05) : k.rnd(1.12, 1.42) };
  });
  const runes = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2, kind: i % 3 }));
  const motes = Array.from({ length: 20 }, () => ({ a: k.rnd(0, Math.PI * 2), r: k.rnd(1.4, 2.1), h: k.rnd(10, 90), t0: k.rnd(0, 0.45) }));
  const disk = sc.add.graphics().setDepth(k.FLOOR_FX + 1);
  const lines = sc.add.graphics().setDepth(k.FLOOR_FX + 3).setBlendMode(ADD);
  const air = sc.add.graphics().setDepth(Math.max(...cells.map((q) => q.y)) + CELL_DEPTH + 2).setBlendMode(ADD);
  const plates = sc.add.graphics().setDepth(k.FLOOR_FX + 2).setBlendMode(ADD);
  const POST = k.slow(640);
  const total = T + POST;
  const cCyan = k.color('#2fd8ff');
  const cPale = k.color('#bff6ff');
  const cWhite = k.color('#ffffff');
  const cDeep = k.color('#1a7fa8');
  void k.counter(sc, total, (u) => {
    const tm = u * total;
    const pre = clamp01(tm / T); // vuruşa kadar 0-1
    const post = clamp01((tm - T) / POST); // vuruştan sonra 0-1
    const appear = smooth(clamp01(pre * 1.6));
    const fade = 1 - post ** 1.5;
    const pulse = tm < T ? 0.75 + 0.25 * Math.sin(tm / k.slow(28)) : 1;
    const flare = tm < T ? 0 : Math.max(0, 1 - (tm - T) / k.slow(220)); // vuruş anı fazladan parlaklık
    const rot = tm / k.slow(900);
    disk.clear();
    lines.clear();
    air.clear();
    plates.clear();
    // 1) kapsanan hücre plakaları hafifçe camgöbeği yanar (alanı okutur)
    if (c.slots?.length) k.fillCells(plates, c.board, c.slots, { fill: cCyan, fillA: (0.07 * appear + 0.18 * flare) * fade, edge: cCyan, edgeA: (0.22 * appear + 0.4 * flare) * fade, edgeW: 2, k: 0.94 });
    // 2) taş disk (normal karışım: koyu), vuruşta biraz büyür
    const dr = R * (0.55 + 0.45 * appear) * (1 + 0.12 * post);
    disk.fillStyle(k.color('#141c20'), 0.6 * appear * fade).fillPoints(diskPts.map((d) => ell(d.a, dr * d.r)), true);
    disk.fillStyle(k.color('#22323a'), 0.45 * appear * fade).fillPoints(diskPts.map((d) => ell(d.a, dr * 0.8 * (d.r > 1.1 ? 1.06 : 1))), true);
    // 3) çatlaklar: merkezden artı kolları boyunca (vuruşa doğru hızlanarak), vuruşta ak-mavi parlar
    const grow = clamp01((pre - 0.12) / 0.88) ** 1.3;
    for (const cr of cracks) {
      const pm = partial(cr.main, tm < T ? grow : 1);
      if (pm.length < 2) continue;
      const a = fade * (0.8 + 0.2 * pulse);
      disk.lineStyle(11, k.color('#0a1012'), 0.75 * fade).strokePoints(pm, false);
      lines.lineStyle(16, cDeep, a * 0.4).strokePoints(pm, false);
      lines.lineStyle(6, cCyan, a).strokePoints(pm, false);
      lines.lineStyle(2.2, cWhite, Math.min(1, a * (0.7 + flare))).strokePoints(pm, false);
      for (const br of cr.branches) {
        const bg = clamp01(((tm < T ? grow : 1) - br.at) / (1 - br.at));
        const pb = partial(br.pts, bg);
        if (pb.length < 2) continue;
        disk.lineStyle(6, k.color('#0a1012'), 0.6 * fade).strokePoints(pb, false);
        lines.lineStyle(3, cCyan, a * 0.85).strokePoints(pb, false);
      }
    }
    // 4) rün dairesi: dış/iç halka, dönen rün işaretleri, dönen yay parçaları, ortada baklava
    const ga = appear * fade;
    const rr = R * (0.6 + 0.4 * appear) * (1 + 0.28 * post);
    lines.lineStyle(14, cDeep, ga * 0.35).strokeEllipse(C.x, C.y, rr * 2, rr * 2 * FLAT);
    lines.lineStyle(4, cCyan, ga * pulse).strokeEllipse(C.x, C.y, rr * 2, rr * 2 * FLAT);
    lines.lineStyle(2, cPale, ga * (0.5 + flare)).strokeEllipse(C.x, C.y, rr * 1.96, rr * 1.96 * FLAT);
    lines.lineStyle(3, cCyan, ga * 0.9).strokeEllipse(C.x, C.y, rr * 1.24, rr * 1.24 * FLAT);
    for (const rn of runes) {
      const a = rn.a + rot;
      const p0 = ell(a, rr * 0.7);
      const p1 = ell(a, rr * 0.9);
      lines.lineStyle(3, cPale, ga * 0.9).lineBetween(p0.x, p0.y, p1.x, p1.y);
      const m = ell(a, rr * 0.8);
      const t = ell(a + 0.09, rr * (rn.kind === 0 ? 0.86 : rn.kind === 1 ? 0.74 : 0.8));
      lines.lineStyle(2.5, cCyan, ga * 0.85).lineBetween(m.x, m.y, t.x, t.y);
    }
    for (let i = 0; i < 3; i++) {
      const a0 = -rot * 1.6 + (i * Math.PI * 2) / 3;
      const pts = Array.from({ length: 10 }, (_, j) => ell(a0 + j * 0.09, rr * 1.12));
      lines.lineStyle(3, cCyan, ga * 0.7 * (tm < T ? 1 : 1 - post)).strokePoints(pts, false);
    }
    const dm = rr * 0.34;
    const dia = [ell(0, dm), ell(Math.PI / 2, dm * 1.25), ell(Math.PI, dm), ell(-Math.PI / 2, dm * 1.25)];
    lines.fillStyle(cCyan, ga * (0.18 + 0.5 * flare)).fillPoints(dia, true);
    lines.lineStyle(3, cPale, ga).strokePoints(dia, true);
    // 5) toplanan rün zerrecikleri: dışarıdan sarmal çizerek merkeze iner (vuruşa kadar)
    if (tm < T) {
      for (const mo of motes) {
        const q = clamp01((pre - mo.t0) / (1 - mo.t0));
        if (q <= 0 || q >= 1) continue;
        const e = q * q;
        const a = mo.a + e * 2.4;
        const p = ell(a, R * mo.r * (1 - e * 0.92));
        const y = p.y - mo.h * (1 - e);
        const al = Math.sin(Math.PI * q);
        air.fillStyle(cCyan, al * 0.5).fillCircle(p.x, y, 7);
        air.fillStyle(cWhite, al).fillCircle(p.x, y, 2.5);
      }
    }
    // 6) vuruş: merkezden göğe çakan ışık sütunu
    if (tm >= T && post < 0.34) {
      const q = post / 0.34;
      const h = 380 * (0.6 + 0.4 * (1 - (1 - q) ** 3));
      const w = 54 * (1 - q * 0.7);
      const a = (1 - q) ** 1.4;
      air.fillStyle(cDeep, a * 0.35).fillRect(C.x - w, C.y - h, w * 2, h);
      air.fillStyle(cCyan, a * 0.6).fillRect(C.x - w * 0.5, C.y - h * 0.96, w, h * 0.96);
      air.fillStyle(cWhite, a * 0.9).fillRect(C.x - w * 0.16, C.y - h * 0.9, w * 0.32, h * 0.9);
    }
    if (u >= 1) {
      disk.destroy();
      lines.destroy();
      air.destroy();
      plates.destroy();
    }
  });
  // hazırlıkta rün tozu (merkezden hafif yükselen camgöbeği zerreler)
  after(c, T * 0.4, () => k.burst(sc, C.x, C.y - 6, { colors: RUNE, n: 5, speed: [40, 120], angle: [-Math.PI + 0.5, -0.5], gravity: -120, life: [300, 460], size: [12, 20], depth: C.y + CELL_DEPTH + 2 }));
  // vuruş: her hücrede fışkırma (merkez büyük), kısa sarsıntı, vuruş sonrası süzülen zerreler
  after(c, T, () => {
    glow(c, k, { x: C.x, y: C.y - 30 }, 360, 220, '#2fd8ff', { alpha: 0.7, dur: 380, grow: 1.4, depth: C.y + CELL_DEPTH + 2 });
    glow(c, k, { x: C.x, y: C.y - 24 }, 120, 80, '#ffffff', { alpha: 0.9, dur: 180, grow: 1.6, depth: C.y + CELL_DEPTH + 3 });
    glyphErupt(c, k, C, true);
    for (const p of arms) glyphErupt(c, k, p, false);
    k.shake(sc, 170, 0.005);
    after(c, k.slow(120), () => k.burst(sc, C.x, C.y - 20, { colors: RUNE, n: 8, speed: [30, 110], angle: [-Math.PI + 0.4, -0.4], gravity: -160, life: [520, 820], size: [10, 18], depth: C.y + CELL_DEPTH + 2 }));
  });
  return land(c, T);
};

export const CLASSIC: Readonly<Record<string, MobHandVfx>> = { rend, glyph_of_breaking: glyphOfBreaking };
