/**
 * EL YAPIMI (TAMAMEN KODLA ÇİZİLEN) MOB EFEKTLERİ: yalnızca Debug > VFX frame test (in battle) > Version "Hand-coded" (Ömer 2026-10-18:
 * "aynı skilleri sıfırdan kendin kod yazarak yapıp aynı karşılaştırmaya koysana"). Sprite sheet YOK: parçacık, yay, yumuşak ışık, zemin halkası;
 * kahraman efektlerinin (src/game/vfx.ts, art-v2/<class>/vfx.ts) diliyle, her karede yeniden çizilir (tam kare hızında akıcı).
 * Gerçek savaşlar bunu KULLANMAZ: test paneli `mobVfxTest.hand` alanına koyar (src/game/mob-vfx.ts > build ilk satırı).
 *
 * ZAMANLAMA SÖZLEŞMESİ (asıl sheet ile birebir, hasar rakamları aynı anda): `hitMs` = asıl sheet'in vuruş karesine kadar geçen süre
 * (impact / fps x fpsScale). Akış sheet sürümüyle aynıdır:
 *   Dirge          (bolt)  c.windUp -> hitMs sonra vuruş (ilk ses başta, kalanlar vuruşta) -> Promise vuruşta çözülür
 *   Halberd Chop   (melee) c.lunge -> ağız hitMs anında yere değer: zemin kırıkları + kısa sarsıntı (110 ms) aynı anda
 *   Wall of Pikes  (cells, aşamalı) c.windUp -> mızrak uçları aşama i hücresine i x 180 ms + hitMs anında değer (c.releaseStage(i) + o hücrenin
 *                  toz/kıymık/kan zerreleri + kısa sarsıntı 70 ms aynı anda); Promise ilk aşamada çözülür
 *   Rend           (melee) c.lunge -> hızlı tırmık vuruştan hemen önce başlar (en uzun tırnak gövde ortasını ~hitMs'te geçer) ->
 *                  hitMs anında zerreler + kısa sarsıntı (90 ms); hedefin geri itilmesi motorun hasar olayındaki vuruş tepkisinden gelir
 *   Glyph of Breaking (center, artı alanı) c.windUp -> hitMs sonra tüm hücrelerde aynı anda fışkırma + kısa sarsıntı
 *
 * Görünüş (renkler asıl sheet'ten: assets/mob-vfx/<mob>/<skill>.png):
 *   Dirge: mor ses dalgası hilalleri (")))") hedefe akar, vuruşta mor parlama + 4 kollu yıldız ışıltısı + mor kırıklar; ardından hedefin
 *     gövdesine sarılarak YUKARI yükselen iki mor ağıt şeridi (sarmal; önden geçen kısmı birimin önünde, arkası arkasında), yükselen mor duman.
 *   Halberd Chop (Ömer 2026-10-18: Rend/Glyph dili, "fiziksel ve ağırlıklı"): saldırgan tarafında tepeden inen ağır çelik teber başı (koyu
 *     çelik hilal ağız, sivri uç, kanca, ahşap sap; ivmelenerek iner), yalnızca inişin son kısmında kısa, ince, soluk hareket izi (kenarında
 *     çok ince mat kor çizgisi: asıl sheet'in alevinden kalan tek iz). Hedefin ayağında yere gömülür (ağız zemin çizgisinin altına girer,
 *     önünü kalkık toprak dudağı örter), kısa titrer, sonra geri çekilip söner. Vuruşta koyu çukur + yayılan çatlaklar (dibinde kısa süre mat
 *     kor), mat toprak-taş kırıkları, alçak toz bulutu, ince duman teli; hedefe gerçekten hasar geldiyse koyu kan zerreleri. Parlama, ADD,
 *     ak-sıcak kenar, ışın yıldızı, şok halkası, kıvılcım YOK.
 *   Wall of Pikes (Ömer 2026-10-18: Rend/Glyph dili): saldırgan tarafından 5 mızrak (koyu ahşap sap, demir bilezik, mat çelik yaprak uç)
 *     sütun boyunca GERÇEKTEN ilerler (okçunun Pierce'ı gibi, ışınlanmaz); hafifçe sallanır, ucun arkasında kısa soluk hareket izi, sapın
 *     arkasında çok soluk duman ve ince mat kor çizgisi. Zeminde başlangıçtan duvarın önüne uzanan sürtünme izi (iki ince çizik + soluk
 *     sürtme), sonra söner. Her hücreye değişte uçlar kısa geri seker; o hücrede mat toz, toprak zerresi, ahşap kıymıkları, vurulan
 *     birimde koyu kan zerreleri ve kısa sarsıntı. Ateş patlaması, ışın yıldızı, parlama, zemin halkası YOK.
 *   Rend (Ömer 2026-10-18 yeniden: "daha gerçekçi, pençe izleri çok parlamasın"): atılan kurdun patisi hedefin gövdesine yelpaze gibi
 *     açılan 4 ince keskin tırmık atar (kurt tarafında yukarıdan başlar, hedefin arkasına doğru aşağı çapraz; tırnaklar birkaç ms arayla).
 *     İzler KOYU: kahverengi-siyah yırtık kenar, koyu kırmızı iç, daha koyu dip; yalnızca taze izin üst kenarında çok soluk ince ışık.
 *     ADD karışımı, ak-sıcak çizgi, kıvılcım, ışın, halka YOK. Tırnak ucunun arkasında çok ince, kısa hareket izi. Vuruşta mat koyu kan /
 *     toz zerreleri tırmık yönünde savrulur, birkaç kıl-kumaş lifi kopar, soluk koyu toz; izler hızla açılır, kısa kalır, koyulaşıp hafifçe
 *     kapanarak söner, birkaç kalın damla (1x hızda okunur) aşağı süzülür. İzler birimle birlikte kayar (geri itilince üstünde kalır).
 *   Glyph of Breaking: artının merkez hücresine camgöbeği rün dairesi kazınır (dikenli taş disk, iki halka, dönen rün işaretleri, ortada
 *     baklava; dışarıdan sarmalla toplanan zerreler), çatlaklar artı kolları boyunca her hücreye uzanır, hücre plakaları hafifçe yanar;
 *     vuruşta merkezden göğe ışık sütunu, her hücrede artı biçimli parlama + fışkıran dönen taşlar (camgöbeği kenarlı) + kıvılcım + zemin
 *     halkası + toz. AOE çizimi hücre merkezlerinde (c.cells / c.center); kenarda kırpılan artıda yalnızca var olan kollar çizilir.
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
const CELL_DEPTH = 8; // hücre zemini -> o hücredeki birimin hemen üstü (mob-vfx.ts ile aynı)

const PURPLE = ['#b872ff', '#8a5ad0', '#e0c8ff', '#5a2a9c'];

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
// HALBERD CHOP (Morvane Halberdier): ağır çelik teber ağzının inişi ve yere gömülmesi (Rend / Glyph dili)
// Katman disiplini: tek ana çizim (teber + kısa hareket izi; zemin çukuru + çatlaklar ayrı zemin derinliğinde, aynı karede), kısa vuruş
// katmanı (toprak-taş kırıkları, kan zerreleri, kor, toz). ADD karışımı / parlama / ak-sıcak kenar / ışın / halka YOK.

/** Teber çeliği ve sapı (mat; yalnızca ağız kenarında soluk açık çizgi). */
const STEEL = { dark: '#1c1f22', body: '#4c5157', mid: '#6e747a', edge: '#a9aeb3' };
const WOOD = { dark: '#22170e', body: '#664830', hi: '#8a6a48' };
/** Toprak / taş kırıkları (koyu, soğuk-kahve). */
const EARTH = ['#54473b', '#685848', '#40352c', '#76654f'];
/** Asıl sheet'in alev turuncusu, soldurulmuş: yalnızca ince mat kor. */
const EMBER = ['#7a3a1c', '#8a4824', '#5e2c16'];
const CHOP_SHAKE_MS = 110;
const CHOP_SHAKE_MAG = 0.0036;

/**
 * Teber başı: pivot `P` çevresinde `a` açısında (yarıçap R'de baş). Sap ucu (pivota doğru solar), hilal ağız (ilerleme yönüne bakar),
 * üst sivri uç, arka kanca. `groundY` altına inen noktalar zemine bastırılır: ağız yere gömülmüş görünür.
 */
function drawHalberd(g: Phaser.GameObjects.Graphics, k: VfxKit, P: Pt, dir: number, R: number, a: number, alpha: number, groundY: number): void {
  const rx = dir * Math.cos(a);
  const ry = Math.sin(a);
  const tx = -dir * Math.sin(a); // açı artınca ilerleme yönü: ağız bu yana bakar
  const ty = Math.cos(a);
  const at = (r: number, t: number): Pt => ({ x: P.x + rx * r + tx * t, y: Math.min(groundY, P.y + ry * r + ty * t) });
  // sap
  for (const [r0, r1, aa] of [
    [0.38, 0.56, 0.22],
    [0.56, 0.72, 0.6],
    [0.72, 0.96, 1],
  ] as Array<[number, number, number]>) {
    const A = at(R * r0, 0);
    const B = at(R * r1, 0);
    g.lineStyle(11, k.color(WOOD.dark), alpha * aa).lineBetween(A.x, A.y, B.x, B.y);
    g.lineStyle(6.5, k.color(WOOD.body), alpha * aa).lineBetween(A.x, A.y, B.x, B.y);
    const A2 = at(R * r0, -1.5);
    const B2 = at(R * r1, -1.5);
    g.lineStyle(1.4, k.color(WOOD.hi), alpha * aa * 0.8).lineBetween(A2.x, A2.y, B2.x, B2.y);
  }
  const bw = 44;
  const blade = [at(R * 0.71, 4), at(R * 0.65, bw * 0.5), at(R * 0.655, bw * 0.95), at(R * 0.77, bw * 1.2), at(R * 0.91, bw * 1.13), at(R * 1.0, bw * 0.78), at(R * 0.95, 4)];
  const edge = [at(R * 0.655, bw * 0.95), at(R * 0.77, bw * 1.2), at(R * 0.91, bw * 1.13), at(R * 1.0, bw * 0.78)];
  const bevel = [at(R * 0.675, bw * 0.84), at(R * 0.775, bw * 1.06), at(R * 0.9, bw * 1.0), at(R * 0.975, bw * 0.74)];
  // arka kanca + üst sivri uç
  g.fillStyle(k.color(STEEL.body), alpha).fillPoints([at(R * 0.77, -4), at(R * 0.72, -bw * 0.44), at(R * 0.86, -4)], true);
  g.fillStyle(k.color(STEEL.body), alpha).fillPoints([at(R * 0.95, -6), at(R * 1.17, 0), at(R * 0.95, 6)], true);
  g.lineStyle(1.2, k.color(STEEL.edge), alpha * 0.45).lineBetween(at(R * 0.96, -5).x, at(R * 0.96, -5).y, at(R * 1.16, 0).x, at(R * 1.16, 0).y);
  // ağız
  // gövde, sapa yakın koyu sırt, kenara doğru açık bileme şeridi, ince kenar çizgisi (mat; parlama yok)
  g.fillStyle(k.color(STEEL.body), alpha).fillPoints(blade, true);
  g.fillStyle(k.color(STEEL.dark), alpha * 0.7).fillPoints([blade[0]!, at(R * 0.68, bw * 0.34), at(R * 0.94, bw * 0.32), blade[blade.length - 1]!], true);
  g.fillStyle(k.color(STEEL.mid), alpha).fillPoints([...bevel, ...[...edge].reverse()], true);
  g.lineStyle(1.6, k.color(STEEL.edge), alpha * 0.75).strokePoints(edge, false);
  g.lineStyle(1.4, k.color(STEEL.dark), alpha).strokePoints(blade, true);
  // sap yuvası (demir bilezik)
  const s0 = at(R * 0.7, -7);
  const s1 = at(R * 0.7, 7);
  g.lineStyle(6, k.color(STEEL.dark), alpha).lineBetween(s0.x, s0.y, s1.x, s1.y);
}

/** Kısa hareket izi: ağzın geçtiği yayın son parçası, ince ve soluk (normal karışım); kenarında çok ince mat kor. */
function drawChopTrail(g: Phaser.GameObjects.Graphics, k: VfxKit, P: Pt, dir: number, R: number, a: number, span: number, alpha: number): void {
  if (span < 0.02 || alpha < 0.02) return;
  const n = 10;
  const arc = (r: number, t: number) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const aa = a - span + (span * i) / n;
      return { x: P.x + dir * Math.cos(aa) * r - dir * Math.sin(aa) * t, y: P.y + Math.sin(aa) * r + Math.cos(aa) * t };
    });
  const outer = arc(R * 0.86, 62);
  const inner = arc(R * 0.72, 30);
  // soluk geniş bant (iz yüzü)
  for (let i = 0; i < n; i++) {
    const f = ((i + 1) / n) ** 1.6;
    g.fillStyle(k.color('#6a6560'), 0.09 * alpha * f).fillPoints([inner[i]!, outer[i]!, outer[i + 1]!, inner[i + 1]!], true);
  }
  // ince iz çizgileri (ağız kenarı + uç), uca doğru belirginleşir
  for (const [pts, w, col, am] of [
    [outer, 2, '#8a847e', 0.3],
    [arc(R * 1.12, 0), 1.4, '#7a756f', 0.22],
    [arc(R * 0.8, 50), 1.2, EMBER[0]!, 0.28],
  ] as Array<[Pt[], number, string, number]>) {
    for (let i = n >> 1; i < n; i++) {
      const f = ((i + 1 - (n >> 1)) / (n >> 1)) ** 1.3;
      g.lineStyle(w, k.color(col), am * alpha * f).lineBetween(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
    }
  }
}

/** Hedefe bu kullanımda gerçekten hasar geldi mi (olaysız önizlemede: evet). */
function hurt(c: VfxCtx, v: CombatantView): boolean {
  return !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
}

function chopOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const sc = c.scene;
  const dir = v.container.x >= c.actor.container.x ? 1 : -1;
  const depth = v.container.depth;
  const R = Math.max(190, Math.min(280, v.h * 1.25));
  const foot = k.feet(v);
  // uç yolu: saldırgan tarafında, tepeden hedefin üstünden geçip ayağının hizasında yere iner
  const A1 = 0.22; // vuruş açısı (ileri, hafif aşağı)
  const A0 = -1.8; // başlangıç (dik yukarı, biraz geri)
  // ağız aşağı bakar ve sapın altında asılıdır: sap ayak hizasının biraz üstünde kalır, ağzın alt yarısı zemine gömülür
  const G = { x: v.container.x + dir * R * 0.12, y: foot.y - 24 }; // ucun indiği nokta
  const P = { x: G.x - dir * Math.cos(A1) * R, y: G.y - Math.sin(A1) * R }; // savuruş merkezi
  const groundY = foot.y + 4;
  // gömülme noktası: ağzın zemine girdiği yerin ortası
  const B = { x: P.x + dir * Math.cos(A1) * R * 0.8, y: groundY };
  const g = sc.add.graphics().setDepth(depth + 2);
  const floor = sc.add.graphics().setDepth(k.FLOOR_FX + 3);
  const HOLD = k.slow(230); // gömülü kalış
  const PULL = k.slow(200); // geri çekilip sönme
  const GROUND = k.slow(950); // çukur + çatlak ömrü (vuruştan sonra)
  const total = T + GROUND;
  const cracks = Array.from({ length: 5 }, (_, i) => {
    const th = (i % 2 ? Math.PI : 0) + (i % 2 ? -1 : 1) * dir * k.rnd(0.05, 0.6) + (i === 4 ? Math.PI / 2 : 0);
    const L = k.rnd(60, 130);
    return crackPath(k, B, { x: B.x + Math.cos(th) * L, y: B.y + Math.sin(th) * L * 0.32 });
  });
  const lip = Array.from({ length: 6 }, (_, i) => ({ x: B.x + (i - 2.5) * 16 + k.rnd(-5, 5), y: groundY + k.rnd(-2, 3), w: k.rnd(12, 22), h: k.rnd(5, 9), col: k.color(k.pick(EARTH)) }));
  const cDent = k.color('#18120d');
  const cCrack = k.color('#110d09');
  const cLit = k.color('#6a5a48');
  void k.counter(sc, total, (u) => {
    const tm = u * total;
    g.clear();
    floor.clear();
    // 1) iniş: ağır, ivmelenen; yalnızca son kısmında kısa iz
    if (tm < T) {
      const q = tm / T;
      const e = q ** 2.1;
      const a = A0 + (A1 - A0) * e;
      const appear = smooth(clamp01(q / 0.22));
      drawChopTrail(g, k, P, dir, R, a, 0.42 * q ** 1.4, appear * clamp01((q - 0.35) / 0.3));
      drawHalberd(g, k, P, dir, R, a, appear, groundY);
      return;
    }
    const t = tm - T;
    // 2) gömülü: kısa titreşim; sonra geri çekilip söner
    if (t < HOLD + PULL) {
      const qp = clamp01((t - HOLD) / PULL);
      const quiver = 0.014 * Math.sin(t / k.slow(16)) * Math.exp(-t / k.slow(70));
      const a = A1 + quiver - 0.32 * smooth(qp);
      drawChopTrail(g, k, P, dir, R, A1, 0.42 * (1 - clamp01(t / k.slow(70))), 1 - clamp01(t / k.slow(70)));
      drawHalberd(g, k, P, dir, R, a, (1 - qp) ** 1.3, groundY);
    }
    // 3) zemin: çukur, kalkık toprak dudağı (gömülen ağzın önü), çatlaklar (kısa sürede yayılır), çatlak dibinde sönen mat kor
    const gf = 1 - clamp01((t - k.slow(520)) / k.slow(430)) ** 1.4;
    const open = 1 - (1 - clamp01(t / k.slow(60))) ** 2;
    floor.fillStyle(cDent, 0.6 * gf).fillEllipse(B.x, groundY - 1, 120 * open, 24 * open);
    floor.fillStyle(k.color('#2a221c'), 0.5 * gf).fillEllipse(B.x, groundY - 3, 80 * open, 12 * open);
    const grow = 1 - (1 - clamp01(t / k.slow(110))) ** 2;
    const ember = (1 - clamp01(t / k.slow(480))) * gf;
    for (const cr of cracks) {
      const pm = partial(cr.main, grow);
      if (pm.length < 2) continue;
      floor.lineStyle(3.2, cCrack, 0.85 * gf).strokePoints(pm, false);
      floor.lineStyle(1.1, cLit, 0.35 * gf).strokePoints(pm.map((p) => ({ x: p.x, y: p.y - 2 })), false);
      if (ember > 0.02) floor.lineStyle(1.2, k.color(EMBER[0]!), 0.4 * ember).strokePoints(partial(pm, 0.55), false);
      for (const br of cr.branches) {
        const pb = partial(br.pts, clamp01((grow - br.at) / (1 - br.at)));
        if (pb.length >= 2) floor.lineStyle(2, cCrack, 0.7 * gf).strokePoints(pb, false);
      }
    }
    // toprak dudağı: gömülü ağzın zemine girdiği çizgiyi örter (teberle aynı katmanda, önünde)
    const lipA = (t < HOLD + PULL ? 1 : 0.7) * gf * open;
    for (const l of lip) g.fillStyle(l.col, 0.9 * lipA).fillEllipse(l.x, l.y, l.w, l.h);
    if (u >= 1) {
      g.destroy();
      floor.destroy();
    }
  });

  // vuruş katmanı: toprak-taş kırıkları, toz bulutu, mat kor kırıntısı; hedefe değdiyse koyu kan zerreleri
  after(c, T, () => {
    const rocks: Bit[] = Array.from({ length: 14 }, () => {
      const a = -Math.PI / 2 + k.rnd(-1.15, 1.15) + dir * 0.15;
      const sp = k.rnd(200, 470);
      return { x: B.x + k.rnd(-34, 34), y: groundY - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: k.rnd(0, 6), vr: k.rnd(-7, 7), pts: rockShape(k), size: k.rnd(6, 15), col: k.color(k.pick(EARTH)), life: k.rnd(440, 700), delay: k.rnd(0, 30), rim: k.color('#a48f78') };
    });
    const dirt: Bit[] = Array.from({ length: 12 }, () => {
      const a = -Math.PI / 2 + k.rnd(-1.3, 1.3);
      const sp = k.rnd(140, 380);
      return { x: B.x + k.rnd(-40, 40), y: groundY - 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: k.rnd(0, 6), vr: k.rnd(-5, 5), pts: rockShape(k), size: k.rnd(2, 4), col: k.color(k.pick(EARTH)), life: k.rnd(320, 560), delay: k.rnd(0, 40) };
    });
    debris(c, k, [...rocks, ...dirt], depth + 3, 1500);
    // çok az mat kor: ağır, yavaş yükselip söner (alev kimliğinin tek izi)
    const embers: Bit[] = Array.from({ length: 4 }, () => ({ x: B.x + k.rnd(-30, 30), y: groundY - 6, vx: k.rnd(-40, 40), vy: k.rnd(-90, -40), rot: 0, vr: k.rnd(-3, 3), pts: rockShape(k), size: k.rnd(1.6, 2.6), col: k.color(k.pick(EMBER)), life: k.rnd(380, 600), delay: k.rnd(20, 120) }));
    debris(c, k, embers, depth + 3, -30);
    if (hurt(c, v)) {
      const body = k.spot(v);
      const p = { x: body.x - dir * v.w * 0.08, y: body.y + v.h * 0.08 };
      const gore: Bit[] = Array.from({ length: 12 }, () => {
        const a = -Math.PI / 2 + k.rnd(-1.25, 1.25) - dir * 0.35;
        const sp = k.rnd(130, 330);
        return { x: p.x + k.rnd(-18, 18), y: p.y + k.rnd(-36, 36), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: k.rnd(0, 6), vr: k.rnd(-4, 4), pts: rockShape(k), size: k.rnd(2.5, 5.5), col: k.color(k.pick(GORE)), life: k.rnd(360, 600), delay: k.rnd(0, 30) };
      });
      debris(c, k, gore, depth + 3, 1300);
    }
    // toz: yere yayılan alçak bulut + biraz yükselen
    puffs(c, k, { x: B.x, y: groundY - 8 }, 6, { hex: ['#7e7062', '#8e8072', '#665a4e'], spreadX: 74, spreadY: 4, rise: 14, size: [60, 96], dur: [540, 780], alpha: 0.34, depth: depth + 1, drift: 70 });
    puffs(c, k, { x: B.x, y: groundY - 18 }, 3, { hex: ['#6a5e52', '#7e7062'], spreadX: 34, spreadY: 8, rise: 46, size: [40, 64], dur: [480, 700], alpha: 0.26, depth: depth + 1, drift: 30 });
    // ince duman teli: çatlaktan kısa süre süzülen koyu gri
    puffs(c, k, { x: B.x, y: groundY - 10 }, 2, { hex: ['#3e3a36', '#4a4440'], spreadX: 20, spreadY: 4, rise: 70, size: [24, 36], dur: [620, 820], alpha: 0.14, depth: depth + 1, drift: 16, delay: 80 });
  });
}

const halberdChop: MobHandVfx = async (c, k, hitMs) => {
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  const t = c.targets[0];
  await c.lunge(t ? t.container.x : c.actor.container.x);
  const T = k.slow(hitMs);
  for (const v of c.targets) chopOn(c, k, v, T);
  after(c, T, () => k.shake(c.scene, CHOP_SHAKE_MS, CHOP_SHAKE_MAG));
  return land(c, T);
};

// ---------------------------------------------------------------------------------------------------------------------
// WALL OF PIKES (Sworn Guard): sütun boyunca gerçekten ilerleyen mızrak duvarı (Rend / Glyph dili: ahşap + çelik, mat)
// Katman disiplini: tek ana çizim (mızraklar + kısa hareket izi + ince duman/kor; zeminde sürtünme izi aynı karede), her hücre değişinde
// kısa vuruş katmanı (toz, kıymık, kan zerresi). ADD / parlama / ateş patlaması / ışın yıldızı / halka YOK.

/** Mızrakların zeminden yüksekliği (px) ve uç kaydırması (bazıları önde): 5 mızrak. */
const PIKES: Array<{ h: number; lead: number }> = [
  { h: 36, lead: 4 },
  { h: 64, lead: 22 },
  { h: 92, lead: 0 },
  { h: 120, lead: 26 },
  { h: 148, lead: 10 },
];
const PIKE_LEN = 250;
const SPLINTER = ['#6e5638', '#86684a', '#4e3a26', '#5e4a32'];
/** Mızrak sapı ve ucu: küçük göründükleri için teberden biraz açık (yine mat). */
const PIKE_WOOD = { dark: '#24180d', body: '#7a5838', hi: '#a07c54' };
const PIKE_STEEL = { dark: '#202326', body: '#7a8086', edge: '#bfc3c7' };
const PIKE_SHAKE_MS = 70;
const PIKE_SHAKE_MAG = 0.0024;

/** Tek mızrak: sap (arkaya doğru solar), demir bilezik, yaprak uç; ilerlerken ucun arkasında ince soluk hareket izi + çok ince kor/duman. */
function drawPike(g: Phaser.GameObjects.Graphics, k: VfxKit, tx: number, ty: number, d: Pt, alpha: number, speed: number, flick: number): void {
  const nx = -d.y;
  const ny = d.x;
  const pt = (s: number, o = 0): Pt => ({ x: tx - d.x * s + nx * o, y: ty - d.y * s + ny * o });
  // ince duman: sapın arkasında soluk gri, çok ince kor çizgisi (asıl sheet'in alev izinin solmuş hali)
  if (speed > 0.05) {
    const s0 = pt(PIKE_LEN * 0.55);
    const s1 = pt(PIKE_LEN * 1.2);
    g.lineStyle(12, k.color('#3e3a36'), 0.07 * alpha * speed).lineBetween(s0.x, s0.y, s1.x, s1.y);
    const e0 = pt(40, -3);
    const e1 = pt(40 + 90 * speed, -3);
    g.lineStyle(1.1, k.color(EMBER[0]!), (0.22 + 0.08 * Math.sin(flick)) * alpha * speed).lineBetween(e0.x, e0.y, e1.x, e1.y);
    // hareket izi: ucun hemen arkasında kısa soluk çizgiler
    const m0 = pt(18, 4);
    const m1 = pt(18 + 70 * speed, 4);
    g.lineStyle(1.6, k.color('#9a948e'), 0.34 * alpha * speed).lineBetween(m0.x, m0.y, m1.x, m1.y);
    g.lineStyle(5, k.color('#8a847e'), 0.1 * alpha * speed).lineBetween(m0.x, m0.y, m1.x, m1.y);
  }
  // sap: arka uçta solar (duvarın arkası okunmasın diye)
  for (const [s0, s1, aa] of [
    [PIKE_LEN, PIKE_LEN * 0.72, 0.3],
    [PIKE_LEN * 0.72, PIKE_LEN * 0.4, 0.75],
    [PIKE_LEN * 0.4, 30, 1],
  ] as Array<[number, number, number]>) {
    const A = pt(s0);
    const B = pt(s1);
    g.lineStyle(7.5, k.color(PIKE_WOOD.dark), alpha * aa).lineBetween(A.x, A.y, B.x, B.y);
    g.lineStyle(4, k.color(PIKE_WOOD.body), alpha * aa).lineBetween(A.x, A.y, B.x, B.y);
    const A2 = pt(s0, -1.2);
    const B2 = pt(s1, -1.2);
    g.lineStyle(1.2, k.color(PIKE_WOOD.hi), alpha * aa * 0.85).lineBetween(A2.x, A2.y, B2.x, B2.y);
  }
  // demir bilezik
  const f0 = pt(34);
  const f1 = pt(26);
  g.lineStyle(8, k.color(PIKE_STEEL.dark), alpha).lineBetween(f0.x, f0.y, f1.x, f1.y);
  // yaprak uç: mat çelik, ortada sırt, üst kenarda soluk açık çizgi
  const leaf = [pt(-6), pt(12, 9), pt(30, 3.5), pt(30, -3.5), pt(12, -9)];
  g.fillStyle(k.color(PIKE_STEEL.body), alpha).fillPoints(leaf, true);
  g.lineStyle(1.2, k.color(PIKE_STEEL.dark), alpha).strokePoints(leaf, true);
  const r0 = pt(-4);
  const r1 = pt(28);
  g.lineStyle(1.4, k.color(PIKE_STEEL.dark), 0.55 * alpha).lineBetween(r0.x, r0.y, r1.x, r1.y);
  const top = ny < 0 ? 1 : -1; // ekranda yukarıda kalan kenar
  const h0 = pt(-4, 0);
  const h1 = pt(12, 8 * top);
  g.lineStyle(1.4, k.color(PIKE_STEEL.edge), 0.7 * alpha).lineBetween(h0.x, h0.y, h1.x, h1.y);
}

/** Hücreye değiş: toz + toprak zerresi (zeminde), kıymıklar (uç hizasında), vurulan birimde koyu kan zerreleri; kısa sarsıntı. */
function pikeHit(c: VfxCtx, k: VfxKit, p: Pt, d: Pt, victims: CombatantView[]): void {
  const sc = c.scene;
  const depth = p.y + CELL_DEPTH + 2;
  const fwd = Math.atan2(d.y, d.x);
  const splinters: Bit[] = Array.from({ length: 6 }, () => {
    const pk = k.pick(PIKES);
    const a = fwd + k.rnd(-0.9, 0.9) - 0.4;
    const sp = k.rnd(120, 300);
    return { x: p.x + k.rnd(-10, 10), y: p.y - pk.h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - k.rnd(40, 120), rot: k.rnd(0, 6), vr: k.rnd(-9, 9), pts: shardShape(k), size: k.rnd(5, 9), col: k.color(k.pick(SPLINTER)), life: k.rnd(420, 640), delay: k.rnd(0, 30) };
  });
  const dirt: Bit[] = Array.from({ length: 8 }, () => {
    const a = -Math.PI / 2 + k.rnd(-1.1, 1.1) + Math.sign(d.x || 1) * 0.3;
    const sp = k.rnd(110, 280);
    return { x: p.x + k.rnd(-30, 30), y: p.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: k.rnd(0, 6), vr: k.rnd(-5, 5), pts: rockShape(k), size: k.rnd(2, 4.5), col: k.color(k.pick(EARTH)), life: k.rnd(300, 520), delay: k.rnd(0, 30) };
  });
  const gore: Bit[] = [];
  for (const v of victims) {
    if (!hurt(c, v)) continue;
    const b = k.spot(v);
    for (let i = 0; i < 9; i++) {
      const a = fwd + k.rnd(-0.8, 0.8) - 0.3;
      const sp = k.rnd(140, 340);
      gore.push({ x: b.x + k.rnd(-16, 16), y: b.y + k.rnd(-40, 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - k.rnd(40, 140), rot: k.rnd(0, 6), vr: k.rnd(-4, 4), pts: rockShape(k), size: k.rnd(2.5, 5), col: k.color(k.pick(GORE)), life: k.rnd(340, 560), delay: k.rnd(0, 30) });
    }
  }
  debris(c, k, [...splinters, ...dirt, ...gore], depth, 1200);
  puffs(c, k, { x: p.x, y: p.y - 8 }, 3, { hex: ['#5e5248', '#6e6256', '#4a4038'], spreadX: 40, spreadY: 4, rise: 14, size: [44, 70], dur: [420, 620], alpha: 0.24, depth: depth - 2, drift: 50 });
  k.shake(sc, PIKE_SHAKE_MS, PIKE_SHAKE_MAG);
}

const wallOfPikes: MobHandVfx = async (c, k, hitMs) => {
  const sc = c.scene;
  const sfx = c.skill.sfx ?? [];
  if (sfx[0]) c.sfx(sfx[0]);
  await c.windUp('#c0392b', 'cast');
  const T = k.slow(hitMs);
  const STEP = k.slow(STAGE_STEP);
  const staged = !!c.stages && c.stages.length > 1;
  const groups = staged ? c.stages!.map((s) => ({ cells: s.cells, victims: s.targets })) : [{ cells: c.cells.length ? c.cells : c.targets.map((v) => k.feet(v)), victims: c.targets }];
  const nodes = groups
    .filter((gr) => gr.cells.length)
    .map((gr) => ({ x: gr.cells.reduce((a, p) => a + p.x, 0) / gr.cells.length, y: gr.cells.reduce((a, p) => a + p.y, 0) / gr.cells.length, victims: gr.victims }));
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
  const hitTimes = nodes.map((_, i) => T + (staged ? i * STEP : 0));
  nodes.forEach((p, i) => path.push({ x: p.x, y: p.y, t: hitTimes[i]! }));
  const last = path[path.length - 1]!;
  const OUT = k.slow(150);
  path.push({ x: last.x + d.x * 110, y: last.y + d.y * 110, t: last.t + OUT });
  const FADE = k.slow(220);
  const endT = path[path.length - 1]!.t;
  const SCUFF = k.slow(520); // sürtünme izinin sönmesi (mızraklar gittikten sonra)
  const total = endT + Math.max(FADE, SCUFF);
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
  const g = sc.add.graphics();
  const floor = sc.add.graphics().setDepth(k.FLOOR_FX + 3);
  const scuff0 = { x: path[0]!.x + d.x * 40, y: path[0]!.y + d.y * 40 };
  const cScuff = k.color('#1c140e');
  const cScuffW = k.color('#3a3026');
  let prevTip = at(0);
  let prevTm = 0;
  let speedS = 0;
  void k.counter(sc, total, (u) => {
    const tm = u * total;
    // değiş geri tepmesi: her hücreye değişte uçlar kısa an geri sekip yeniden ilerler (ağırlık hissi)
    let jolt = 0;
    for (const ht of hitTimes) if (tm >= ht) jolt += 8 * Math.min(1, (tm - ht) / k.slow(12)) * Math.exp(-(tm - ht) / k.slow(55));
    const base = at(Math.min(tm, endT));
    const tip = { x: base.x - d.x * jolt, y: base.y - d.y * jolt };
    const dt = Math.max(1, tm - prevTm);
    const v = Math.hypot(base.x - prevTip.x, base.y - prevTip.y) / dt; // px / ms (yavaşlatılmış zamanda)
    speedS = lerp(speedS, clamp01((v * k.slow(1000)) / 1000 / 1.4), 0.35);
    prevTip = base;
    prevTm = tm;
    const appear = clamp01(tm / k.slow(90));
    const alpha = tm <= endT ? appear : 1 - clamp01((tm - endT) / FADE);
    g.clear();
    floor.clear();
    // zeminde sürtünme izi: başlangıçtan duvarın önüne kadar iki ince koyu çizik + soluk geniş sürtme
    const sa = tm <= endT ? 1 : 1 - clamp01((tm - endT) / SCUFF);
    const s1 = { x: base.x - d.x * 30, y: base.y - d.y * 30 };
    if (sa > 0.01 && (s1.x - scuff0.x) * d.x + (s1.y - scuff0.y) * d.y > 0) {
      floor.lineStyle(16, cScuffW, 0.2 * sa).lineBetween(scuff0.x, scuff0.y + 1, s1.x, s1.y + 1);
      floor.lineStyle(2, cScuff, 0.6 * sa).lineBetween(scuff0.x, scuff0.y - 4, s1.x, s1.y - 4);
      floor.lineStyle(1.5, cScuff, 0.5 * sa).lineBetween(scuff0.x + d.x * 20, scuff0.y + 5, s1.x - d.x * 10, s1.y + 5);
    }
    if (alpha > 0.01) {
      g.setDepth(tip.y + CELL_DEPTH + 1);
      for (const [i, pk] of PIKES.entries()) {
        const bob = 1.5 * Math.sin(tm / k.slow(55) + i * 1.9);
        drawPike(g, k, tip.x + d.x * pk.lead, tip.y - pk.h + d.y * pk.lead + bob, d, alpha, speedS, tm / k.slow(40) + i * 2.1);
      }
    }
    if (u >= 1) {
      g.destroy();
      floor.destroy();
    }
  });
  nodes.forEach((p, i) => after(c, hitTimes[i]!, () => pikeHit(c, k, p, d, p.victims)));
  return land(c, T);
};

// ---------------------------------------------------------------------------------------------------------------------
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

/** skill id -> el yapımı efekt (yalnızca test paneli). */
export const MOB_HAND_VFX: Readonly<Record<string, MobHandVfx>> = {
  dirge,
  halberd_chop: halberdChop,
  wall_of_pikes: wallOfPikes,
  rend,
  glyph_of_breaking: glyphOfBreaking,
};
