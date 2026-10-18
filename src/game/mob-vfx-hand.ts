/**
 * EL YAPIMI (TAMAMEN KODLA ÇİZİLEN) MOB EFEKTLERİ: yalnızca Debug > VFX frame test (in battle) > Version "Hand-coded" (Ömer 2026-10-18:
 * "aynı skilleri sıfırdan kendin kod yazarak yapıp aynı karşılaştırmaya koysana"). Sprite sheet YOK: parçacık, yay, yumuşak ışık, zemin halkası;
 * kahraman efektlerinin (src/game/vfx.ts, art-v2/<class>/vfx.ts) diliyle, her karede yeniden çizilir (tam kare hızında akıcı).
 * Gerçek savaşlar bunu KULLANMAZ: test paneli `mobVfxTest.hand` alanına koyar (src/game/mob-vfx.ts > build ilk satırı).
 *
 * ZAMANLAMA SÖZLEŞMESİ (asıl sheet ile birebir, hasar rakamları aynı anda): `hitMs` = asıl sheet'in vuruş karesine kadar geçen süre
 * (impact / fps x fpsScale). Akış sheet sürümüyle aynıdır:
 *   Dirge          (bolt)  c.windUp -> hitMs sonra vuruş (ilk ses başta, kalanlar vuruşta) -> Promise vuruşta çözülür
 *   Halberd Chop   (melee) c.lunge -> hitMs sonra vuruş + kamera sarsıntısı
 *   Wall of Pikes  (cells, aşamalı) c.windUp -> aşama i, i x 180 ms + hitMs anında (c.releaseStage(i)); Promise ilk aşamada çözülür
 *
 * Görünüş (renkler asıl sheet'ten: assets/mob-vfx/<mob>/<skill>.png):
 *   Dirge: mor ses dalgası hilalleri (")))") hedefe akar, vuruşta mor parlama + 4 kollu yıldız ışıltısı + mor kırıklar; ardından hedefin
 *     gövdesine sarılarak YUKARI yükselen iki mor ağıt şeridi (sarmal; önden geçen kısmı birimin önünde, arkası arkasında), yükselen mor duman.
 *   Halberd Chop: tepeden, saldırgan tarafından hedefin ayağına inen ağır alevli teber yayı (ivmelenen; beyaz-sıcak ön kenar, turuncu iz),
 *     yere değince turuncu parlama, yassı şok halkası, yukarı fışkıran kıvılcımlar, uçan taş parçaları, toz, yanık iz.
 *   Wall of Pikes: saldırgan tarafından 5 mızrak (ahşap sap, çelik uç, alevli iz) sütun boyunca ilerler; her hücreye (aşamaya) değdiği
 *     anda uçlarda ateş patlaması (ışın yıldızı + kıvılcım + zemin halkası). Işınlanmaz: okçunun Pierce'ı gibi gerçekten geçer.
 *
 * Phaser'ı çalışma zamanında içe aktarmaz (yalnızca tip): yardımcılar `k` ile gelir.
 */
import type Phaser from 'phaser';
import type { CombatantView } from './combatant-view';
import type { VfxCtx } from './vfx';
import type { VfxKit } from './vfx-versions';
import type { MobHandVfx } from './mob-vfx';

type Pt = { x: number; y: number };
type Scene = Phaser.Scene;

const ADD = 1; // Phaser.BlendModes.ADD
const STAGE_STEP = 180; // aşamalı alan skill'inde aşamalar arası (ms): src/game/mob-vfx.ts ile aynı
const SHAKE_MS = 130; // yakın dövüş vuruş sarsıntısı (mob-vfx.ts ile aynı)
const SHAKE_MAG = 0.004;
const CELL_DEPTH = 8; // hücre zemini -> o hücredeki birimin hemen üstü (mob-vfx.ts ile aynı)

const PURPLE = ['#b872ff', '#8a5ad0', '#e0c8ff', '#5a2a9c'];
const FIRE = ['#ff4d1a', '#ff8a1f', '#ffd23f', '#ffffff'];
const ROCK = ['#4a2e1a', '#6b4a2e', '#2a1a10', '#8a6a48'];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => u * u * (3 - 2 * u);

/** Sahne zaman ölçeğine uyan bekleme (k.slow uygulanmış ms). */
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

/** Işın yıldızı: merkezden dışa fırlayan ince ışık çizgileri (patlama anı). */
function starBurst(c: VfxCtx, k: VfxKit, p: Pt, len: number, n: number, cols: [string, string], dur: number, depth: number, o: { flat?: number; dir?: number; spread?: number } = {}): void {
  const g = c.scene.add.graphics().setDepth(depth).setBlendMode(ADD);
  const rays = Array.from({ length: n }, (_, i) => {
    const base = o.dir !== undefined ? (o.dir > 0 ? 0 : Math.PI) + (i / Math.max(1, n - 1) - 0.5) * (o.spread ?? 2.2) : (i / n) * Math.PI * 2;
    return { a: base + k.rnd(-0.12, 0.12), l: len * k.rnd(0.55, 1) };
  });
  const c0 = k.color(cols[0]);
  const c1 = k.color(cols[1]);
  void k.counter(c.scene, k.slow(dur), (u) => {
    g.clear();
    const head = 1 - (1 - u) ** 3;
    const tail = clamp01(u * 1.6 - 0.25);
    const a = 1 - u * u;
    for (const r of rays) {
      const x0 = p.x + Math.cos(r.a) * r.l * tail;
      const y0 = p.y + Math.sin(r.a) * r.l * tail * (o.flat ?? 1);
      const x1 = p.x + Math.cos(r.a) * r.l * head;
      const y1 = p.y + Math.sin(r.a) * r.l * head * (o.flat ?? 1);
      g.lineStyle(6, c0, a * 0.7).lineBetween(x0, y0, x1, y1);
      g.lineStyle(2.5, c1, a).lineBetween(x0, y0, x1, y1);
    }
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

// ---------------------------------------------------------------------------------------------------------------------
// DIRGE (Grave Chanter): mor ağıt

/** Ses dalgası hilali: `dir` yönüne bombeli yay (")"), iç beyaz, dış mor. */
function drawCrescent(g: Phaser.GameObjects.Graphics, k: VfxKit, p: Pt, dir: number, r: number, a: number): void {
  const span = 1.05; // yarım açı (rad)
  const seg = 16;
  const pts = (rr: number, sx: number) =>
    Array.from({ length: seg + 1 }, (_, i) => {
      const t = -span + (2 * span * i) / seg;
      return { x: p.x + dir * (Math.cos(t) * rr * sx - rr * 0.55), y: p.y + Math.sin(t) * rr };
    });
  g.lineStyle(Math.max(3, r * 0.34), k.color('#5a2a9c'), a * 0.4).strokePoints(pts(r, 0.55), false);
  g.lineStyle(Math.max(2, r * 0.18), k.color('#a55cff'), a * 0.9).strokePoints(pts(r, 0.55), false);
  g.lineStyle(Math.max(1.5, r * 0.07), k.color('#f2e6ff'), a).strokePoints(pts(r * 0.98, 0.55), false);
}

function dirgeOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const sc = c.scene;
  const hitP = k.contact(c.actor, v);
  const body = k.spot(v);
  const foot = k.feet(v);
  const dir = v.container.x >= c.actor.container.x ? 1 : -1;
  const depth = v.container.depth;
  // 1) dalgalar: 4 hilal sırayla hedefe akar, büyüyerek; arkalarında hız çizgileri
  const waves = c.scene.add.graphics().setDepth(depth + 2).setBlendMode(ADD);
  const W = 4;
  const lines = Array.from({ length: 7 }, () => ({ y: k.rnd(-60, 60), l: k.rnd(40, 110), o: k.rnd(0, 0.4) }));
  const lead = 230; // dalgaların çıktığı uzaklık (hedefin önünden, saldırgan tarafı)
  void k.counter(sc, T + k.slow(90), (uRaw) => {
    const tNow = uRaw * (T + k.slow(90));
    waves.clear();
    for (let i = 0; i < W; i++) {
      const t0 = T * (i * 0.17);
      const t1 = T * (0.58 + i * 0.14);
      const u = clamp01((tNow - t0) / (t1 - t0));
      if (tNow < t0) continue;
      const fade = tNow > t1 ? clamp01(1 - (tNow - t1) / k.slow(90)) : Math.min(1, u * 4);
      if (fade <= 0) continue;
      const e = u * u * 0.4 + u * 0.6;
      const x = hitP.x - dir * lead * (1 - e);
      drawCrescent(waves, k, { x, y: hitP.y }, dir, lerp(48, 112, e), fade * (0.6 + 0.4 * e));
    }
    // hız çizgileri (sheet'in sol kenarındaki ince çizgiler)
    const lu = clamp01(tNow / T);
    for (const ln of lines) {
      const a = Math.sin(Math.PI * clamp01(lu * 1.2 - ln.o)) * 0.6;
      if (a <= 0.02) continue;
      const x1 = hitP.x - dir * lead * (1 - lu) * 0.9;
      waves.lineStyle(3, k.color('#c9a3ff'), a).lineBetween(x1 - dir * ln.l, hitP.y + ln.y * 0.7, x1, hitP.y + ln.y * 0.7);
    }
    if (uRaw >= 1) waves.destroy();
  });
  // hedefe yaklaşan ince ruh zerrecikleri
  after(c, T * 0.3, () => k.burst(sc, hitP.x - dir * 40, hitP.y, { colors: PURPLE, n: 6, speed: [40, 120], angle: dir > 0 ? [-0.6, 0.6] : [Math.PI - 0.6, Math.PI + 0.6], gravity: -80, life: [260, 420], size: [16, 26], depth: depth + 3 }));

  // 2) vuruş: mor parlama, 4 kollu yıldız ışıltısı, kırıklar, halka
  after(c, T, () => {
    glow(c, k, hitP, 240, 240, '#a55cff', { alpha: 0.85, dur: 360, grow: 1.7, depth: depth + 3 });
    glow(c, k, hitP, 80, 80, '#ffffff', { alpha: 0.9, dur: 200, grow: 1.4, depth: depth + 4 });
    // yıldız ışıltısı: yatay uzun, dikey kısa ışık çizgisi
    const key = glowKey(k, sc);
    for (const [w, h] of [[300, 16], [14, 150]] as Array<[number, number]>) {
      const f = sc.add.image(hitP.x, hitP.y, key).setDisplaySize(w * 0.3, h * 0.3).setTint(k.color('#e8d6ff')).setBlendMode(ADD).setDepth(depth + 4);
      const sx = f.scaleX;
      const sy = f.scaleY;
      sc.tweens.add({ targets: f, scaleX: sx / 0.3, scaleY: sy / 0.3, duration: k.slow(110), ease: 'Quad.easeOut' });
      sc.tweens.add({ targets: f, alpha: 0, delay: k.slow(90), duration: k.slow(220), onComplete: () => f.destroy() });
    }
    const ring = sc.add.graphics().setDepth(depth + 3).setBlendMode(ADD);
    void k.counter(sc, k.slow(300), (u) => {
      ring.clear();
      const r = 28 + 70 * (1 - (1 - u) ** 2);
      ring.lineStyle(Math.max(1.5, 6 * (1 - u)), k.color('#b872ff'), 1 - u).strokeCircle(hitP.x, hitP.y, r);
      if (u >= 1) ring.destroy();
    });
    k.burst(sc, hitP.x, hitP.y, { colors: PURPLE, n: 12, speed: [120, 340], gravity: 200, life: [300, 560], size: [22, 36], depth: depth + 3 });
  });

  // 3) ağıt: gövdeye sarılıp yükselen iki şerit (önü birimin önünde, arkası arkasında) + mor duman
  const H = Math.max(140, v.h * 1.25);
  const R0 = Math.max(46, v.w * 0.55);
  const back = sc.add.graphics().setDepth(depth - 1).setBlendMode(ADD);
  const front = sc.add.graphics().setDepth(depth + 2).setBlendMode(ADD);
  const RISE = k.slow(620);
  const cols = [k.color('#5a2a9c'), k.color('#a55cff'), k.color('#efe0ff')];
  after(c, T * 0.85, () => {
    void k.counter(sc, RISE, (u) => {
      back.clear();
      front.clear();
      const head = lerp(0.05, 1.35, smooth(u) * 0.75 + u * 0.25); // şeridin ucu (0 ayak, 1 baş üstü)
      const len = 0.75;
      const fadeAll = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
      for (let ribbon = 0; ribbon < 2; ribbon++) {
        const ph = ribbon * Math.PI + u * 3.2;
        const N = 30;
        let prev: { x: number; y: number; z: number } | null = null;
        for (let i = 0; i <= N; i++) {
          const s = head - len + (len * i) / N; // şerit boyunca yükseklik
          if (s < 0 || s > 1.3) {
            prev = null;
            continue;
          }
          const ang = s * Math.PI * 2 * 1.6 + ph;
          const rad = R0 * (1 - 0.35 * s) * (0.75 + 0.25 * Math.min(1, u * 3));
          const pnt = { x: body.x + Math.sin(ang) * rad, y: foot.y - s * H + Math.cos(ang) * rad * 0.18, z: Math.cos(ang) };
          if (prev) {
            const along = i / N; // uca yakın parlak, kuyruk soluk
            const a = fadeAll * along ** 1.2 * (s > 1 ? clamp01((1.3 - s) / 0.3) : 1);
            const g = pnt.z + prev.z > 0 ? front : back;
            const w = 4 + 13 * along;
            g.lineStyle(w * 1.8, cols[0]!, a * 0.5).lineBetween(prev.x, prev.y, pnt.x, pnt.y);
            g.lineStyle(w, cols[1]!, a * 0.85).lineBetween(prev.x, prev.y, pnt.x, pnt.y);
            g.lineStyle(Math.max(1.5, w * 0.3), cols[2]!, a).lineBetween(prev.x, prev.y, pnt.x, pnt.y);
          }
          prev = pnt;
        }
      }
      if (u >= 1) {
        back.destroy();
        front.destroy();
      }
    });
    puffs(c, k, { x: body.x, y: body.y + v.h * 0.15 }, 12, { hex: ['#7a4ab8', '#5a2a9c', '#9a6ad8'], spreadX: v.w * 0.4, spreadY: v.h * 0.3, rise: H * 0.75, size: [50, 90], dur: [520, 780], alpha: 0.5, depth: depth + 1, drift: 24 });
    // ağır düşen koyu mor kırıntılar
    k.burst(sc, body.x, body.y - v.h * 0.2, { colors: ['#5a2a9c', '#7a4ab8', '#b872ff'], n: 7, speed: [30, 90], angle: [-Math.PI, 0], gravity: 240, life: [500, 800], size: [20, 32], depth: depth + 2 });
  });
}

const dirge: MobHandVfx = async (c, k, hitMs) => {
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  await c.windUp('#a55cff', 'cast');
  const T = k.slow(hitMs);
  for (const v of c.targets) dirgeOn(c, k, v, T);
  return land(c, T);
};

// ---------------------------------------------------------------------------------------------------------------------
// HALBERD CHOP (Morvane Halberdier): ağır alevli teber yayı

/** Yay izi: pivot çevresinde [aFrom, aTo] açılarını kaplayan, ön kenara doğru parlayan bantlar. */
function drawArc(g: Phaser.GameObjects.Graphics, k: VfxKit, p: Pt, dir: number, r0: number, r1: number, aFrom: number, aTo: number, alpha: number): void {
  const n = 18;
  const bands: Array<[number, number, number, number]> = [
    // [iç yarıçap oranı, dış yarıçap oranı, renk, alfa çarpanı]
    [0.0, 1.04, k.color('#c8401a'), 0.55],
    [0.3, 1.0, k.color('#ff8a1f'), 0.8],
    [0.62, 0.97, k.color('#ffd23f'), 0.95],
    [0.85, 0.95, k.color('#fff6e0'), 1],
  ];
  const pt = (a: number, r: number) => ({ x: p.x + dir * Math.cos(a) * r, y: p.y + Math.sin(a) * r });
  for (let i = 0; i < n; i++) {
    const u0 = i / n;
    const u1 = (i + 1) / n;
    const a0 = aFrom + (aTo - aFrom) * u0;
    const a1 = aFrom + (aTo - aFrom) * u1;
    const fresh = u1 ** 1.8; // ön kenara yakın parlak
    for (const [ri, ro, col, am] of bands) {
      // izin kuyruğu incelir: iç kenar dışa kayar
      const rIn = r0 + (r1 - r0) * Math.min(0.97, ri + (1 - u1) * 0.45);
      const rOut = r0 + (r1 - r0) * ro;
      if (rOut <= rIn) continue;
      g.fillStyle(col, alpha * am * (0.08 + 0.92 * fresh)).fillPoints([pt(a0, rIn), pt(a0, rOut), pt(a1, rOut), pt(a1, rIn)], true);
    }
  }
  // ön kenar: beyaz-sıcak çelik çizgisi
  const A = pt(aTo, r0 + (r1 - r0) * 0.25);
  const B = pt(aTo, r1 * 1.03);
  g.lineStyle(5, k.color('#ffffff'), alpha).lineBetween(A.x, A.y, B.x, B.y);
}

function chopOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const sc = c.scene;
  const dir = v.container.x >= c.actor.container.x ? 1 : -1;
  const depth = v.container.depth;
  const R = Math.max(190, Math.min(280, v.h * 1.25));
  const foot = k.feet(v);
  // uç yolu: saldırganın tepesinden (yukarı) hedefin üstünden geçip ayağının önüne iner; merkez saldırgan tarafında, diz hizasında
  const A1 = 0.22; // vuruş açısı (ileri, hafif aşağı)
  const A0 = -1.8; // başlangıç (dik yukarı, biraz geri)
  const G = { x: v.container.x + dir * R * 0.12, y: foot.y }; // yere değdiği nokta (hedefin ayağı)
  const P = { x: G.x - dir * Math.cos(A1) * R, y: G.y - Math.sin(A1) * R }; // savuruş merkezi
  const g = sc.add.graphics().setDepth(depth + 2).setBlendMode(ADD);
  const TAIL = 1.45;
  let nextEmber = 0;
  // savuruş: ağır, ivmelenen (vuruşa kadar), sonra iz yerinde söner
  void k.counter(sc, T, (u) => {
    const e = u ** 2.1;
    const a = A0 + (A1 - A0) * e;
    g.clear();
    drawArc(g, k, P, dir, R * 0.5, R, Math.max(A0, a - TAIL * (0.4 + 0.6 * u)), a, Math.min(1, u * 5));
    // uçtan dökülen közler
    if (u * 1000 >= nextEmber) {
      nextEmber += 70;
      const tip = { x: P.x + dir * Math.cos(a) * R * 0.95, y: P.y + Math.sin(a) * R * 0.95 };
      k.burst(sc, tip.x, tip.y, { colors: FIRE, n: 1, speed: [30, 90], gravity: 300, life: [200, 360], size: [16, 26], depth: depth + 3 });
    }
  }).then(() => {
    void k.counter(sc, k.slow(260), (u) => {
      g.clear();
      drawArc(g, k, P, dir, R * 0.5, R, A1 - TAIL * (1 - u * 0.7), A1, (1 - u) ** 1.4);
      if (u >= 1) g.destroy();
    });
  });

  // vuruş: zemin parlaması, şok halkası, kıvılcım, taş, toz, yanık
  after(c, T, () => {
    glow(c, k, { x: G.x, y: G.y - 14 }, 280, 110, '#ff7a1a', { alpha: 0.85, dur: 320, grow: 1.35, depth: depth + 3 });
    glow(c, k, { x: G.x, y: G.y - 16 }, 80, 46, '#fff2cc', { alpha: 0.8, dur: 170, grow: 1.5, depth: depth + 4 });
    groundRing(c, k, G, 150, ['#ff6a1a', '#ffd23f'], 380, depth + 1, 0.28);
    starBurst(c, k, { x: G.x, y: G.y - 8 }, 120, 9, ['#ff8a1f', '#fff2cc'], 240, depth + 3, { flat: 0.75, dir: -dir, spread: 2.4 });
    k.burst(sc, G.x, G.y - 8, { colors: FIRE, n: 16, speed: [240, 580], angle: [-Math.PI + 0.3, -0.3], gravity: 1100, life: [320, 640], size: [20, 36], depth: depth + 3 });
    k.burst(sc, G.x, G.y - 6, { colors: ROCK, n: 9, speed: [180, 420], angle: [-Math.PI + 0.35, -0.35], gravity: 1500, life: [420, 700], size: [38, 64], depth: depth + 3 });
    puffs(c, k, { x: G.x, y: G.y - 10 }, 7, { hex: ['#8a7a6a', '#a8957f', '#6b5a4a'], spreadX: 60, spreadY: 6, rise: 40, size: [46, 76], dur: [480, 720], alpha: 0.45, depth: depth + 1, drift: 70 });
    // yanık iz: hedefin ayağında koyu kızıl, yavaş sönen leke (birimin arkasında)
    const scorch = sc.add.image(G.x, G.y, glowKey(k, sc)).setDisplaySize(180, 44).setTint(k.color('#ff4d1a')).setBlendMode(ADD).setAlpha(0.8).setDepth(depth - 1);
    sc.tweens.add({ targets: scorch, alpha: 0, duration: k.slow(700), ease: 'Quad.easeIn', onComplete: () => scorch.destroy() });
  });
}

const halberdChop: MobHandVfx = async (c, k, hitMs) => {
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  const t = c.targets[0];
  await c.lunge(t ? t.container.x : c.actor.container.x);
  const T = k.slow(hitMs);
  for (const v of c.targets) chopOn(c, k, v, T);
  after(c, T, () => k.shake(c.scene, SHAKE_MS, SHAKE_MAG));
  return land(c, T);
};

// ---------------------------------------------------------------------------------------------------------------------
// WALL OF PIKES (Sworn Guard): sütun boyunca ilerleyen alevli mızrak duvarı

/** Mızrakların zeminden yüksekliği (px) ve uç kaydırması (bazıları önde): 5 mızrak. */
const PIKES: Array<{ h: number; lead: number }> = [
  { h: 36, lead: 4 },
  { h: 64, lead: 22 },
  { h: 92, lead: 0 },
  { h: 120, lead: 26 },
  { h: 148, lead: 10 },
];
const PIKE_LEN = 250;

function drawPikes(g: Phaser.GameObjects.Graphics, k: VfxKit, tip: Pt, d: Pt, alpha: number, flick: number): void {
  const nx = -d.y; // dik yön (uç yaprağının genişliği)
  const ny = d.x;
  for (const [i, pk] of PIKES.entries()) {
    const tx = tip.x + d.x * pk.lead;
    const ty = tip.y - pk.h + d.y * pk.lead;
    const bx = tx - d.x * PIKE_LEN;
    const by = ty - d.y * PIKE_LEN;
    const fl = 0.85 + 0.15 * Math.sin(flick * 1.7 + i * 2.1);
    // alevli iz (ADD): dıştan içe kızıl, turuncu, sarı
    g.lineStyle(30, k.color('#c8401a'), alpha * 0.32 * fl).lineBetween(bx + d.x * 30, by + d.y * 30, tx, ty);
    g.lineStyle(17, k.color('#ff7a1a'), alpha * 0.5 * fl).lineBetween(bx + d.x * 80, by + d.y * 80, tx, ty);
    g.lineStyle(7, k.color('#ffd23f'), alpha * 0.85).lineBetween(bx + d.x * 140, by + d.y * 140, tx, ty);
    // sap: koyu ahşap (ADD'de koyu renk görünmez: sap için açık kor tonu)
    g.lineStyle(3, k.color('#ffb070'), alpha * 0.7).lineBetween(bx, by, tx - d.x * 18, ty - d.y * 18);
    // çelik uç: beyaz-sıcak yaprak
    const L = 26;
    const W = 8;
    g.fillStyle(k.color('#fff6e0'), alpha).fillPoints(
      [
        { x: tx + d.x * 4, y: ty + d.y * 4 },
        { x: tx - d.x * L * 0.45 + nx * W, y: ty - d.y * L * 0.45 + ny * W },
        { x: tx - d.x * L, y: ty - d.y * L },
        { x: tx - d.x * L * 0.45 - nx * W, y: ty - d.y * L * 0.45 - ny * W },
      ],
      true,
    );
  }
}

/** Mızrak duvarının uçlarında ateş patlaması (aşamanın hücresinde). */
function pikeBurst(c: VfxCtx, k: VfxKit, p: Pt, d: Pt): void {
  const sc = c.scene;
  const depth = p.y + CELL_DEPTH + 1;
  const mid = { x: p.x + d.x * 16, y: p.y - 92 };
  glow(c, k, mid, 220, 200, '#ff6a1a', { alpha: 0.9, dur: 320, grow: 1.3, depth });
  glow(c, k, mid, 90, 140, '#fff2cc', { alpha: 0.95, dur: 180, grow: 1.4, depth: depth + 1 });
  starBurst(c, k, mid, 130, 11, ['#ff8a1f', '#fff2cc'], 260, depth + 1, { dir: d.x >= 0 ? 1 : -1, spread: 2.6, flat: 1.2 });
  const fwd = Math.atan2(d.y, d.x);
  k.burst(sc, mid.x, mid.y, { colors: FIRE, n: 14, speed: [200, 520], angle: [fwd - 1.0, fwd + 1.0], gravity: 700, life: [280, 560], size: [20, 34], depth: depth + 1 });
  groundRing(c, k, p, 120, ['#ff5a1a', '#ffd23f'], 360, depth - 1, 0.3);
  puffs(c, k, { x: p.x, y: p.y - 60 }, 4, { hex: ['#5a3a2a', '#7a4a2a'], spreadX: 40, spreadY: 40, rise: 50, size: [40, 64], dur: [420, 620], alpha: 0.35, depth: depth - 1, drift: 30 });
}

const wallOfPikes: MobHandVfx = async (c, k, hitMs) => {
  const sc = c.scene;
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  await c.windUp('#c0392b', 'cast');
  const T = k.slow(hitMs);
  const STEP = k.slow(STAGE_STEP);
  const staged = !!c.stages && c.stages.length > 1;
  const groups = staged ? c.stages!.map((s) => s.cells) : [c.cells.length ? c.cells : c.targets.map((v) => k.feet(v))];
  const nodes = groups
    .filter((cells) => cells.length)
    .map((cells) => ({ x: cells.reduce((a, p) => a + p.x, 0) / cells.length, y: cells.reduce((a, p) => a + p.y, 0) / cells.length }));
  if (staged) c.stages!.forEach((_, i) => after(c, k.slow(i * STAGE_STEP + hitMs), () => c.releaseStage(i)));
  if (!nodes.length) return land(c, T);
  // ilerleme yönü: ilk hücreden sonrakine; tek hücrede saldırgandan hedefe
  let d: Pt = { x: nodes[0]!.x >= c.actor.container.x ? 1 : -1, y: 0 };
  if (nodes.length > 1) {
    const dx = nodes[nodes.length - 1]!.x - nodes[0]!.x;
    const dy = nodes[nodes.length - 1]!.y - nodes[0]!.y;
    const L = Math.hypot(dx, dy);
    if (L > 1) d = { x: dx / L, y: dy / L };
  }
  // yol düğümleri: başlangıç (ilk hücrenin saldırgan tarafı) -> her aşama hücresi (vuruş anında) -> biraz ileri
  const START = 260;
  const path: Array<Pt & { t: number }> = [{ x: nodes[0]!.x - d.x * START, y: nodes[0]!.y - d.y * START, t: 0 }];
  nodes.forEach((p, i) => path.push({ ...p, t: T + (staged ? i * STEP : 0) }));
  const last = path[path.length - 1]!;
  const OUT = k.slow(150);
  path.push({ x: last.x + d.x * 110, y: last.y + d.y * 110, t: last.t + OUT });
  const FADE = k.slow(220);
  const total = path[path.length - 1]!.t + FADE;
  const at = (tm: number): Pt => {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      if (tm <= b.t) {
        const u = clamp01((tm - a.t) / Math.max(1, b.t - a.t));
        const e = i === 1 ? u ** 1.6 : i === path.length - 1 ? 1 - (1 - u) ** 2 : u; // ilk itiş ivmelenir, son kısım yavaşlar
        return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
      }
    }
    return { x: last.x + d.x * 110, y: last.y + d.y * 110 };
  };
  const g = sc.add.graphics().setBlendMode(ADD);
  // duvarı saran ateş: mızrak demetinin arkasında giden yumuşak turuncu ışık
  const aura = sc.add.image(0, 0, glowKey(k, sc)).setDisplaySize(PIKE_LEN * 1.3, 200).setTint(k.color('#ff5a1a')).setBlendMode(ADD).setAlpha(0);
  let nextEmber = 0;
  void k.counter(sc, total, (u) => {
    const tm = u * total;
    const tip = at(tm);
    const endT = path[path.length - 1]!.t;
    const appear = clamp01(tm / k.slow(90));
    const alpha = tm <= endT ? appear : 1 - clamp01((tm - endT) / FADE);
    g.setDepth(tip.y + CELL_DEPTH + 1);
    aura.setPosition(tip.x - d.x * PIKE_LEN * 0.45, tip.y - 92 - d.y * PIKE_LEN * 0.45).setDepth(tip.y + CELL_DEPTH).setAlpha(alpha * (0.42 + 0.06 * Math.sin(tm / 30)));
    g.clear();
    drawPikes(g, k, tip, d, alpha, tm / 40);
    if (tm >= nextEmber && alpha > 0.2) {
      nextEmber += k.slow(45);
      const pk = k.pick(PIKES);
      k.burst(sc, tip.x - d.x * k.rnd(20, 140), tip.y - pk.h, { colors: FIRE, n: 1, speed: [20, 80], angle: [-Math.PI * 0.85, -Math.PI * 0.15], gravity: -60, life: [220, 420], size: [16, 26], depth: tip.y + CELL_DEPTH + 2 });
    }
    if (u >= 1) {
      g.destroy();
      aura.destroy();
    }
  });
  nodes.forEach((p, i) => after(c, T + (staged ? i * STEP : 0), () => pikeBurst(c, k, p, d)));
  return land(c, T);
};

/** skill id -> el yapımı efekt (yalnızca test paneli). */
export const MOB_HAND_VFX: Readonly<Record<string, MobHandVfx>> = {
  dirge,
  halberd_chop: halberdChop,
  wall_of_pikes: wallOfPikes,
};
