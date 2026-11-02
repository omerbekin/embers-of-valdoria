/**
 * Vesper - SÜRÜM 2 SKILL ANİMASYONLARI (2026-11-01, Ömer: "Vesper'ın 4 efekti yapılsın", "ödünç kalmasın"). Kılavuz: docs/design/art-v2.md,
 * inceleme docs/anim-review/notes/<skill>.md. Çizen Terra 6.1, kontrol eden Sol 6.1 (Codex); sheet'ler assets/vfx/vesper/<NN-ad>.png
 * (asılları assets/source/vesper-vfx, içe aktarma `node tools/import-class-vfx.mjs vesper`).
 *
 * Dil: çan sesi = holy (altın, bronz), gök gürültüsü = lightning (beyaz-mavi). Oynanış değişmez; hasar rakamları efektin değdiği anda akar
 * (`k.hitsAt`: hedef sırasıyla motorun hasar olayları).
 *   toll                   01 çan vuruşu Vesper'ın sırtındaki çandan halka olur, dalga düşman tahtasına yol alır, her hedefte kendi anında halka. Kısa.
 *   thunderpeal            02 hayalet çan atanın üstünde sallanır, tokmak vurur, şimşeğe döner; 03 sıranın HER hücresine yıldırım (boş hücre dahil).
 *   cracked_bell           04 çatlak çan hedefin başına iner, çatlaktan ışık fışkırır, ikiye ayrılır.
 *   great_bell_of_valdoria 05 dev çan düşman tahtasının üstünde iner, sallanır, vurur; 06 her hedefte önce kutsal sütun (holy hasarı), sonra şimşek çatalları (lightning hasarı).
 * Sesler data/audio-v2/vesper.json (skills.json > sfx ile aynı adlar). Phaser'ı ve ../../vfx'i ÇALIŞMA ZAMANINDA içe aktarma; her şey k üzerinden.
 */
import { FULL_W, FULL_X0 } from '../../../ui/viewport';
import { reducedMotion } from '../../../ui/motion-pref';
import type { CombatantView } from '../../combatant-view';
import type { VfxCtx } from '../../vfx';
import type { VfxKit } from '../../vfx-versions';
import type { V2Vfx } from '../types';

type Pt = { x: number; y: number };

const SH_RING = 'vesper/01-toll-ring';
const SH_THUNDER_BELL = 'vesper/02-thunder-bell';
const SH_BOLT = 'vesper/03-thunder-bolt';
const SH_CRACKED = 'vesper/04-cracked-bell';
const SH_GREAT = 'vesper/05-great-bell';
const SH_BURST = 'vesper/06-great-bell-burst';

const GOLD = 0xf2d48a;
const PALE_BLUE = 0xbfe3ff;

/** Baktığı yön (oyuncu sağa, düşman sola). */
const facing = (v: CombatantView): number => (v.combatant.side === 'party' ? 1 : -1);
const spriteW = (v: CombatantView): number => Math.abs(v.sprite.displayWidth * v.container.scaleX) || v.w * 0.6;
/** Sırtındaki çanın ağzı: gövdenin arkası, omuz hizası (yan görünüş pozlarında çanın ortası). */
const bellOf = (v: CombatantView): Pt => ({ x: v.container.x - facing(v) * spriteW(v) * 0.26, y: v.container.y - v.h * 0.74 });
/** Asanın ucu ya da açık el (poz noktası); yoksa önde göğüs hizası. */
const handOf = (v: CombatantView): Pt => v.castPoint() ?? { x: v.container.x + facing(v) * spriteW(v) * 0.35, y: v.container.y - v.h * 0.7 };
const chestOf = (v: CombatantView): Pt => ({ x: v.container.x, y: v.container.y - v.h * 0.55 });
const headOf = (v: CombatantView): Pt => ({ x: v.container.x, y: v.container.y - v.h * 0.92 });

/** Kısa ADD ışıması. */
function glow(c: VfxCtx, k: VfxKit, x: number, y: number, size: number, life: number, tint: number, depth = k.DEPTH + 30): void {
  const tex = k.softTexture(c.scene, 'v2vesper:glow', 48, 48, (px, py) => {
    const d = Math.hypot((px + 0.5 - 24) / 24, (py + 0.5 - 24) / 24);
    return d >= 1 ? null : { c: '#ffffff', a: (1 - d) ** 1.5 };
  });
  const img = c.scene.add.image(x, y, tex).setDisplaySize(size, size).setDepth(depth).setBlendMode(k.Phaser.BlendModes.ADD).setTint(tint);
  c.scene.tweens.add({ targets: img, alpha: 0, scaleX: img.scaleX * 1.35, scaleY: img.scaleY * 1.35, duration: k.slow(life), ease: 'Quad.easeOut', onComplete: () => img.destroy() });
}

/** Hedefin dalga geçerken kısa sarsılışı (hasar tepkisi motor olayından gelir; bu yalnız dalganın değmesi). */
function jolt(c: VfxCtx, k: VfxKit, t: CombatantView, dx: number): void {
  if (reducedMotion()) return;
  const x0 = t.container.x;
  c.scene.tweens.add({ targets: t.container, x: x0 + dx, duration: k.slow(45), yoyo: true, ease: 'Quad.easeOut', onComplete: () => t.container.setX(x0) });
}

/** Tüm ekranı kısa süre karartan örtü; dönen fonksiyon söndürür. */
function veil(c: VfxCtx, k: VfxKit, alpha: number, dur: number, depth = k.DEPTH + 5): () => void {
  const r = c.scene.add.rectangle(FULL_X0, 0, FULL_W, 1080, 0x05060d, 0).setOrigin(0, 0).setDepth(depth);
  c.scene.tweens.add({ targets: r, fillAlpha: alpha, duration: k.slow(dur), ease: 'Sine.easeOut' });
  return () => c.scene.tweens.add({ targets: r, fillAlpha: 0, duration: k.slow(420), ease: 'Sine.easeIn', onComplete: () => r.destroy() });
}

/** Bir Promise'in dışarıdan çözülmesi. */
function later(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// ---------------------------------------------------------------------------------------------------------------- TOLL

/**
 * Toll (tüm düşmanlar, ucuz, sık): Vesper tokmağı sırtındaki çana vurur; çandan altın halka açılır, ses dalgası düşman tahtasına yol alır, her
 * hedefte yakınlık sırasıyla küçük halka ve hasar. ~0,9 sn; sık çalındığı için ekranı kaplamaz, sarsmaz.
 */
const toll: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_RING]);
    const a = c.actor;
    const dir = facing(a);
    const bell = bellOf(a);
    a.play('cast');
    await k.wait(c.scene, k.slow(90));
    c.sfx('tollStrike');
    const staff = handOf(a);
    glow(c, k, staff.x, staff.y, 110, 260, GOLD); // tokmağın çana vurduğu an: asa ucunda da ışık
    glow(c, k, bell.x, bell.y, 170, 300, GOLD);
    k.sheet(c.scene, SH_RING, bell.x, bell.y, { size: 250, fps: 18, depth: k.DEPTH + 34 });
    await k.wait(c.scene, k.slow(70));
    c.sfx('tollWave');
    // dalga: çandan tahtanın ortasına doğru yol alır, büyüyüp seyrelir
    const boardMid = c.targets.length ? { x: c.targets.reduce((n, t) => n + t.container.x, 0) / c.targets.length, y: c.targets.reduce((n, t) => n + t.container.y - t.h * 0.5, 0) / c.targets.length } : { x: bell.x + dir * 500, y: bell.y };
    const FLY = 340;
    const wave = k.sheet(c.scene, SH_RING, bell.x + dir * 60, bell.y, { size: 260, frames: [2, 3, 4, 5, 6], fps: 14, depth: k.DEPTH + 33, alpha: 0.72 });
    if (wave) c.scene.tweens.add({ targets: wave, x: boardMid.x, y: boardMid.y, scaleX: wave.scaleX * 1.9, scaleY: wave.scaleY * 1.9, alpha: 0.18, duration: k.slow(FLY), ease: 'Sine.easeOut' });
    // her hedefe, çana uzaklığına göre kendi anında
    const dist = c.targets.map((t) => Math.abs(t.container.x - bell.x));
    const near = Math.min(...dist, 9999);
    const far = Math.max(...dist, 0);
    const arrivals = c.targets.map((t, i) => {
      const d = later();
      const at = k.slow(FLY * 0.55 + (far > near ? ((dist[i]! - near) / (far - near)) * FLY * 0.45 : FLY * 0.2));
      void k.wait(c.scene, at).then(() => {
        const p = chestOf(t);
        k.sheet(c.scene, SH_RING, p.x, p.y, { size: 170, fps: 20, depth: k.DEPTH + 36, alpha: 0.7 });
        glow(c, k, p.x, p.y, 110, 220, GOLD);
        jolt(c, k, t, dir * 5);
        d.resolve();
      });
      return d.promise;
    });
    const done = later();
    void k.hitsAt(c, (t) => arrivals[c.targets.indexOf(t)]!, done.promise).then(hit);
    await k.wait(c.scene, k.slow(FLY + 90));
    done.resolve();
    a.play('idle');
    await k.wait(c.scene, k.slow(240));
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- THUNDERPEAL

/**
 * Thunderpeal (bir düşman SIRASI, lightning + Blinded): atanın üstünde hayalet çan sallanır, tokmak vurur ve şimşeğe döner; sıranın her hücresine
 * (boş hücre dahil, alan okunsun) yakın şeritten uzağa sırayla yıldırım iner. Hasar her hedefin yıldırımı değdiği anda; beyaz parlama = kör edici ışık. ~1,2 sn.
 */
const thunderpeal: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_THUNDER_BELL, SH_BOLT]);
    const a = c.actor;
    const calm = reducedMotion();
    a.play('cast');
    c.sfx('thunderPeal');
    // çanın ağzı başın üstünde kalır: atanın yüzü ve kalkık asası okunur
    const over = { x: a.container.x + facing(a) * 24, y: a.container.y - a.h - 112 };
    k.sheet(c.scene, SH_THUNDER_BELL, over.x, over.y, { size: 270, fps: 15, depth: k.DEPTH + 34, flipX: facing(a) < 0 });
    glow(c, k, over.x, over.y, 170, 520, PALE_BLUE);
    await k.wait(c.scene, k.slow(390));
    c.sfx('thunderCrack');
    const undo = calm ? null : veil(c, k, 0.3, 120);
    if (!calm) k.shake(c.scene, 240, 0.006);
    // sıranın hücreleri ekranda yukarıdan aşağı; hedef olan her hücrenin vuruş anı kendi yıldırımının kare 2'si
    const slots = c.slots?.length ? c.slots : c.targets.map((t) => t.combatant.slot);
    const STEP = 70;
    const STRIKE = 60; // sheet'in 2. karesi
    const when = new Map<number, ReturnType<typeof later>>();
    slots.forEach((s, i) => {
      const arrive = later();
      when.set(s, arrive);
      const g = k.cellMid(c.board, s);
      void k.wait(c.scene, k.slow(i * STEP)).then(() => {
        k.sheet(c.scene, SH_BOLT, g.x, g.y, { size: 560, fps: 17, depth: BEHIND_UNITS });
        return k.wait(c.scene, k.slow(STRIKE)).then(() => {
          glow(c, k, g.x, g.y - 8, 150, 260, PALE_BLUE, BEHIND_UNITS);
          k.flash(c.scene, '#dcecff', calm ? 0.1 : 0.24, 170);
          arrive.resolve();
        });
      });
    });
    const done = later();
    void k.hitsAt(c, (t) => when.get(t.combatant.slot)?.promise ?? Promise.resolve(), done.promise).then(hit);
    await k.wait(c.scene, k.slow(slots.length * STEP + STRIKE));
    done.resolve();
    a.play('idle');
    await k.wait(c.scene, k.slow(260));
    undo?.();
    await k.wait(c.scene, k.slow(260));
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- CRACKED BELL

/** Sheet'te çanın ağzının vuruş karesindeki yüksekliği (kare yüksekliğinin kesri). */
const CRACK_RIM = 0.92;
/** Vuruş karesi (0'dan; sheet 14 fps). */
const CRACK_HIT_FRAME = 3;

/**
 * Cracked Bell (tek hedef, güçlü holy, %30 Stun): atan asayı kaldırır, çatlak bronz çan hedefin başına iner; vuruş anında hasar, altın parlama,
 * çatlaktan ışık demetleri, çan ikiye ayrılır. Gövde okunur: ağız başın üstünde durur. ~1,0 sn.
 */
const cracked_bell: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_CRACKED, SH_RING]);
    const a = c.actor;
    const t = c.targets[0];
    const calm = reducedMotion();
    a.play('cast');
    const hand = handOf(a);
    // asa kalkar (Sol: hazırlık geç okunuyordu): önce asa ucunda büyüyen halka + ışık, çan bundan SONRA düşmeye başlar
    glow(c, k, hand.x, hand.y, 130, 520, 0xe8c56a);
    k.sheet(c.scene, SH_RING, hand.x, hand.y, { size: 150, frames: [0, 1, 2, 3], fps: 9, depth: k.DEPTH + 36, alpha: 0.85 });
    c.sfx('crackedBellFall');
    await k.wait(c.scene, k.slow(420));
    const head = t ? headOf(t) : (c.centerPos ?? { x: a.container.x, y: a.container.y });
    const SIZE = 400;
    const FPS = 14;
    k.sheet(c.scene, SH_CRACKED, head.x, head.y - (CRACK_RIM - 0.5) * SIZE, { size: SIZE, fps: FPS, depth: k.DEPTH + 38, flipX: facing(a) < 0 });
    await k.wait(c.scene, k.slow((CRACK_HIT_FRAME / FPS) * 1000));
    c.sfx('crackedBellHit');
    glow(c, k, head.x, head.y, 240, 340, 0xffe7a0);
    k.flash(c.scene, '#fff3c8', calm ? 0.1 : 0.22, 180);
    if (!calm) k.shake(c.scene, 170, 0.006);
    hit();
    a.play('idle');
    await k.wait(c.scene, k.slow(((8 - CRACK_HIT_FRAME) / FPS) * 1000 + 40));
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- GREAT BELL OF VALDORIA

/** Dev çanın ekrandaki kare kenarı (px). */
const GREAT_SIZE = 620;
/** Çanın tepe halkasının kare yüksekliğindeki yeri: salınım ve yerleşim buradan. */
const GREAT_CROWN = 0.16;
/** İniş süresi ve salınım süresi / açısı (radyan). */
const GREAT_DESCEND = 420;
const GREAT_SWING_MS = 720;
const GREAT_SWING = 0.2;
/** Hücre plakaları (40-62) üstünde, karakterlerin (785+) ARKASINDA: dev çan hedefleri örtmez. */
const GREAT_DEPTH = 700;
/** Yıldırım ve sütun gibi hedefin üstüne inen uzun efektler: çanın önünde, karakterlerin arkasında; hedef ve hasar rakamı okunur. */
const BEHIND_UNITS = 770;
/** Karartma: çanın da altında, sahne geri çekilir; karakterler aydınlık kalır. */
const VEIL_DEPTH = 690;
const BURST_STEP = 80;
/** Burst sheet'inde kutsal sütunun (kare 2) ve şimşek çatalının (kare 3) anı, sheet başından ms (14 fps). */
const BURST_HOLY = 110;
const BURST_BOLT = 200;

/**
 * Great Bell of Valdoria (ult, tüm düşmanlar, holy + lightning): sahne kararır, zincirli dev çan düşman tahtasının üstünde iner, sallanır ve tokmak
 * vurur; altın şok halkası + şimşek, ekran titrer. Her hedefte yakınlık sırasıyla kutsal sütun (holy hasarı, motorun ilk tur olayları) ve şimşek
 * çatalları (lightning hasarı, ikinci tur olayları). Çan çözülerek söner. En heybetli efekt; ~2,3 sn.
 */
const great_bell_of_valdoria: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_GREAT, SH_BURST, SH_RING]);
    const a = c.actor;
    const calm = reducedMotion();
    const undo = veil(c, k, calm ? 0.22 : 0.42, 260, VEIL_DEPTH);
    a.play('cast');
    const hand = handOf(a);
    glow(c, k, hand.x, hand.y, 150, 700, GOLD);
    c.sfx('greatBellDescend');
    // tahtanın ortası: hedeflerden, yoksa hücrelerden
    const xs = c.targets.map((t) => t.container.x);
    const midX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : a.container.x;
    const SIZE = GREAT_SIZE;
    const crown = { x: midX, y: 62 };
    const mouth = { x: midX, y: crown.y + SIZE * 0.66 };
    const flip = facing(a) < 0;
    const placed = { size: SIZE, depth: GREAT_DEPTH, flipX: flip, origin: [0.5, GREAT_CROWN] as [number, number] };
    // iniş: açılan ışıkla yukarıdan gelir (kare 1-2)
    const come = k.sheet(c.scene, SH_GREAT, crown.x, crown.y - 150, { ...placed, frames: [0, 1], fps: 6, keep: true, alpha: 0.35 });
    if (come) c.scene.tweens.add({ targets: come, y: crown.y, alpha: 1, duration: k.slow(GREAT_DESCEND), ease: 'Sine.easeOut' });
    await k.wait(c.scene, k.slow(GREAT_DESCEND));
    // salınım: aynı çan tepesinden döner (her ekran karesinde akar; çizimdeki kare 4 sabit)
    const swing = k.sheet(c.scene, SH_GREAT, crown.x, crown.y, { ...placed, frame: 3, alpha: 0 });
    if (swing) {
      c.scene.tweens.add({ targets: swing, alpha: 1, duration: k.slow(110) });
      if (come) c.scene.tweens.add({ targets: come, alpha: 0, duration: k.slow(130), onComplete: () => come.destroy() });
      if (!calm) {
        const t1 = GREAT_SWING_MS * 0.32;
        const t2 = GREAT_SWING_MS * 0.44;
        c.scene.tweens.add({ targets: swing, rotation: -GREAT_SWING, duration: k.slow(t1), ease: 'Sine.easeOut' });
        c.scene.tweens.add({ targets: swing, rotation: GREAT_SWING * 0.8, delay: k.slow(t1), duration: k.slow(t2), ease: 'Sine.easeInOut' });
        c.scene.tweens.add({ targets: swing, rotation: 0, delay: k.slow(t1 + t2), duration: k.slow(GREAT_SWING_MS - t1 - t2), ease: 'Sine.easeIn' });
      }
    }
    await k.wait(c.scene, k.slow(calm ? 240 : GREAT_SWING_MS));
    // vuruş: kare 6-8
    swing?.destroy();
    const strike = k.sheet(c.scene, SH_GREAT, crown.x, crown.y, { ...placed, frames: [5, 6], fps: 7, keep: true });
    c.sfx('greatBellToll');
    c.sfx('greatBellThunder');
    k.flash(c.scene, '#fff1c0', calm ? 0.12 : 0.34, 260);
    if (!calm) k.shake(c.scene, 520, 0.012);
    glow(c, k, mouth.x, mouth.y, 520, 520, 0xffe7a0, GREAT_DEPTH + 1);
    k.sheet(c.scene, SH_RING, mouth.x, mouth.y, { size: 900, fps: 12, depth: GREAT_DEPTH + 2, alpha: 0.85 });
    const dist = c.targets.map((t) => Math.hypot(t.container.x - mouth.x, t.container.y - mouth.y));
    const order = c.targets.map((_, i) => i).sort((p, q) => dist[p]! - dist[q]!);
    const rank = new Map(order.map((idx, r) => [c.targets[idx]!, r]));
    const holy = c.targets.map(() => later());
    const bolt = c.targets.map(() => later());
    c.targets.forEach((t, i) => {
      const at = rank.get(t)! * BURST_STEP + 120;
      void k.wait(c.scene, k.slow(at)).then(() => {
        k.sheet(c.scene, SH_BURST, t.container.x, t.container.y, { size: 520, fps: 14, depth: BEHIND_UNITS });
        void k.wait(c.scene, k.slow(BURST_HOLY)).then(() => {
          glow(c, k, t.container.x, t.container.y - t.h * 0.5, 170, 260, 0xffe7a0);
          holy[i]!.resolve();
        });
        void k.wait(c.scene, k.slow(BURST_BOLT)).then(() => {
          glow(c, k, t.container.x, t.container.y - t.h * 0.5, 150, 220, PALE_BLUE);
          bolt[i]!.resolve();
        });
      });
    });
    // motor önce tüm hedeflere holy, sonra tüm hedeflere lightning yazar: olay zinciri = hedefler iki tur (ölen hedefin ikinci olayı gelmez, sonrakiler kendi anını zaten geçmiştir)
    const done = later();
    const twice = [...c.targets, ...c.targets];
    const n = c.targets.length;
    let idx = 0;
    void k.hitsAt({ ...c, targets: twice }, () => {
      const i = idx++;
      return i < n ? holy[i]!.promise : bolt[i - n]!.promise;
    }, done.promise).then(hit);
    await k.wait(c.scene, k.slow(n * BURST_STEP + 120 + BURST_BOLT));
    done.resolve();
    a.play('idle');
    // çan çözülür: son kare ışıkla yukarı süzülür
    strike?.destroy();
    const fade = k.sheet(c.scene, SH_GREAT, crown.x, crown.y, { ...placed, frame: 7 });
    if (fade) c.scene.tweens.add({ targets: fade, alpha: 0, y: crown.y - 60, duration: k.slow(640), ease: 'Sine.easeIn', onComplete: () => fade.destroy() });
    await k.wait(c.scene, k.slow(420));
    undo();
    await k.wait(c.scene, k.slow(320));
  }, c.actor);

export const VFX: Record<string, V2Vfx> = {
  toll,
  thunderpeal,
  cracked_bell,
  great_bell_of_valdoria,
};


