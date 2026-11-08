/**
 * Thunder Skald - SÜRÜM 2 SKILL ANİMASYONLARI (2026-11-08, Ömer: "kendi animasyonları, Paladin'e benzemesin, menzilini satsın, yaşlı olsun").
 * Çizen Terra 6.1 (Codex), kontrol eden Sol 6.1; sheet'ler assets/vfx/skald/<NN-ad>.png (asılları assets/source/skald-vfx, içe aktarma
 * `node tools/import-class-vfx.mjs skald`). Kılavuz: docs/design/art-v2.md, süreç docs/anim-review/.
 *
 * Dil: SOĞUK mavi-beyaz şimşek + çelik grisi toz (altın / kutsal ışık YOK: o Paladin / Vesper). Şimşek yalnız skill efektinde, kullandığı
 * araçta (çekiç başı, davul derisi, gök). Boşta hiçbir ışıma yok. Yaşlı adam: hazırlıklar uzun ve ağır, hareket yavaş ama sert iner.
 *   hammer_spark   YAKIN DÖVÜŞ görünümü (Ömer 2026-11-08: silahı gürz/çekiç, büyücü gibi durmasın): silah boyu mesafeye hızlı adım, ritimli iki vuruş:
 *                  ağır fiziksel darbe, sonra şimşek yarısı çekiç başından hedefe çatlar (yay 06 + patlama 04). Hasar 2. vuruşta.
 *   thunder_strike çekiç başının üstünde şimşek toplanır (07), yer çakışı: şimşek çekiç başından hedefe iner (yay 06) ve hedefte patlar (04); gökten yıldırım YOK.
 *   war_drum       davulu sırtından alır (drum_take ara pozu), silahın sapıyla üç vuruş (drum_a / drum_b); her vuruşta deride ses halkası (02) +
 *                  sap ucundan kıvılcım (07); son vuruşta 3x3 alanda zemin dalgası (01) ve her dostta kısa halka (Haste).
 *   stormcall      (büyücü duruşu KALIR, Ömer beğendi) iki kolu açık şarkı, gök kararır, ilk yıldırım hedefe, zırhlı düşmanlara zincir yay + yıldırım.
 * Sesler data/audio-v2/skald.json. Phaser'ı ve ../../vfx'i ÇALIŞMA ZAMANINDA içe aktarma; her şey k üzerinden.
 */
import { FULL_W, FULL_X0 } from '../../../ui/viewport';
import { reducedMotion } from '../../../ui/motion-pref';
import type { CombatantView } from '../../combatant-view';
import type { VfxCtx } from '../../vfx';
import type { VfxKit } from '../../vfx-versions';
import type { V2Vfx } from '../types';

type Pt = { x: number; y: number };

const SH_PULSE = 'skald/01-drum-pulse';
const SH_BEAT = 'skald/02-drum-beat';
const SH_WAVE = 'skald/03-hammer-wave';
const SH_IMPACT = 'skald/04-hammer-impact';
const SH_BOLT = 'skald/05-sky-bolt';
const SH_ARC = 'skald/06-stormcall-arc';
const SH_CHARGE = 'skald/07-hammer-charge';

const PALE_BLUE = 0xbfe3ff;

const facing = (v: CombatantView): number => (v.combatant.side === 'party' ? 1 : -1);
const spriteW = (v: CombatantView): number => Math.abs(v.sprite.displayWidth * v.container.scaleX) || v.w * 0.6;
const chestOf = (v: CombatantView): Pt => ({ x: v.container.x, y: v.container.y - v.h * 0.55 });
const feetOf = (v: CombatantView): Pt => ({ x: v.container.x, y: v.container.y - 4 });
/** Çekiç başı / yükselen el (poz noktası); yoksa önde omuz üstü. */
const toolOf = (v: CombatantView): Pt => v.castPoint() ?? { x: v.container.x + facing(v) * spriteW(v) * 0.35, y: v.container.y - v.h * 0.8 };
/** Davul derisi: göğüs önü (davul poz karesine boyalı, el noktası yok). */
const drumOf = (v: CombatantView): Pt => ({ x: v.container.x + facing(v) * spriteW(v) * 0.12, y: v.container.y - v.h * 0.63 });

function later(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Kısa ADD ışıması (soğuk mavi). */
function glow(c: VfxCtx, k: VfxKit, x: number, y: number, size: number, life: number, tint = PALE_BLUE, depth = k.DEPTH + 30): void {
  const tex = k.softTexture(c.scene, 'v2skald:glow', 48, 48, (px, py) => {
    const d = Math.hypot((px + 0.5 - 24) / 24, (py + 0.5 - 24) / 24);
    return d >= 1 ? null : { c: '#ffffff', a: (1 - d) ** 1.5 };
  });
  const img = c.scene.add.image(x, y, tex).setDisplaySize(size, size).setDepth(depth).setBlendMode(k.Phaser.BlendModes.ADD).setTint(tint);
  c.scene.tweens.add({ targets: img, alpha: 0, scaleX: img.scaleX * 1.35, scaleY: img.scaleY * 1.35, duration: k.slow(life), ease: 'Quad.easeOut', onComplete: () => img.destroy() });
}

/** Tüm ekranı kısa süre kaplayan beyaz-mavi parlama (yıldırım vuruşu). Reduced motion'da yok. */
function flash(c: VfxCtx, k: VfxKit, alpha: number, dur: number): void {
  if (reducedMotion()) return;
  const r = c.scene.add.rectangle(FULL_X0, 0, FULL_W, 1080, 0xdff0ff, alpha).setOrigin(0, 0).setDepth(k.DEPTH + 6).setBlendMode(k.Phaser.BlendModes.ADD);
  c.scene.tweens.add({ targets: r, fillAlpha: 0, duration: k.slow(dur), ease: 'Quad.easeOut', onComplete: () => r.destroy() });
}

/** Gök kararır (yıldırım öncesi); dönen fonksiyon söndürür. */
function veil(c: VfxCtx, k: VfxKit, alpha: number, dur: number): () => void {
  const r = c.scene.add.rectangle(FULL_X0, 0, FULL_W, 1080, 0x05060d, 0).setOrigin(0, 0).setDepth(k.DEPTH + 5);
  c.scene.tweens.add({ targets: r, fillAlpha: alpha, duration: k.slow(dur), ease: 'Sine.easeOut' });
  return () => c.scene.tweens.add({ targets: r, fillAlpha: 0, duration: k.slow(380), ease: 'Sine.easeIn', onComplete: () => r.destroy() });
}

/** Hedefin kısa sarsılışı (hasar tepkisi motor olayından; bu yalnız değme). */
function jolt(c: VfxCtx, k: VfxKit, t: CombatantView, dx: number): void {
  if (reducedMotion() || !dx) return;
  const x0 = t.container.x;
  c.scene.tweens.add({ targets: t.container, x: x0 + dx, duration: k.slow(50), yoyo: true, ease: 'Quad.easeOut', onComplete: () => t.container.setX(x0) });
}

// ---------------------------------------------------------------------------------------------------------------- ORTAK (yakın dövüş)

/** Vuruş mesafesi: gövde yarı genişlikleri + silah boyu. Menzilli yakın dövüşçü (range 3): hedefe yapışmaz, silah boyu kadar yaklaşır. */
const REACH = 10;

/**
 * Hedefe silah boyu kadar yaklaşır (zaten yakınsa yerinde kalır). Yürüyüş kısa ve hızlı: yaşlı ama ağır değil.
 * Dönüş için efekt sonunda `a.returnHome()` çağrılır.
 */
async function stepIn(c: VfxCtx, t: CombatantView | undefined, reach = REACH, ms = 150): Promise<void> {
  const a = c.actor;
  if (!t) return;
  const dir = facing(a);
  const stand = { x: t.container.x - dir * (a.w * 0.5 + t.w * 0.5 + reach), y: t.container.y + 4 };
  // zaten yeterince yakınsa (ya da hedefi aşıyorsa) yürümez
  if ((a.container.x - stand.x) * dir > -8) return;
  await a.approach(stand.x, stand.y, ms);
}

/** Overhead pozunda çekiç başı: başın hemen üstü (castPoint skill'in SON pozunu okur). */
const headUp = (v: CombatantView): Pt => ({ x: v.container.x - facing(v) * 8, y: v.container.y - v.h * 1.26 });

/** İki nokta arasına gerilmiş şimşek yayı (06 sheet; kare başına yol değişir, uçlar sabit). */
function arcBetween(c: VfxCtx, k: VfxKit, p: Pt, q: Pt, alpha = 0.95): void {
  const dist = Math.hypot(q.x - p.x, q.y - p.y);
  k.sheet(c.scene, SH_ARC, (p.x + q.x) / 2, (p.y + q.y) / 2, { size: Math.max(200, dist / 0.84), squashY: 0.55, fps: 22, depth: k.DEPTH + 33, rotation: Math.atan2(q.y - p.y, q.x - p.x), alpha });
}

// ---------------------------------------------------------------------------------------------------------------- HAMMER SPARK

/**
 * Hammer Spark (tek düşman, yakın dövüş görünümü, ritimli iki vuruş): silah boyu mesafeye hızlı adım, çekiç başının üstünden iner:
 * 1. vuruş = ağır fiziksel darbe (toz + sert çarpma halkası hedefin önünde), kısa nefes, 2. vuruş = şimşek yarısı çekiç başından hedefe
 * çatlar (yay çekiç başı -> hedef, ardından patlama). Hasar sayısı 1. vuruşun temasında (tek olay: fiziksel + şimşek yarısı birlikte), şimşek yarısı hemen ardından çekiç başından çatlar.
 */
const hammer_spark: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_CHARGE, SH_WAVE, SH_IMPACT, SH_ARC]);
    const a = c.actor;
    const t = c.targets[0];
    const dir = facing(a);
    await stepIn(c, t);
    // hazırlık: çekiç başının üstünde, şimşek henüz yok (yalnız silah yükselir)
    a.skillPose(0);
    c.sfx('skaldHeave');
    await k.wait(c.scene, k.slow(170));
    // 1. vuruş: fiziksel
    a.skillPose(-1);
    c.sfx('hammerThrow');
    const head = toolOf(a);
    // temas noktası = çekiç başı (adım mesafesi çekiç hedefe değecek kadar kısa); uzaktaysa hedefin gövdesine en çok 40 px yaklaşır
    const tc = t ? { x: t.container.x - dir * t.w * 0.2, y: t.container.y - t.h * 0.45 } : { x: head.x + dir * 120, y: head.y };
    const at = Math.hypot(tc.x - head.x, tc.y - head.y) <= 70 ? tc : { x: head.x, y: head.y };
    if (!reducedMotion()) c.scene.tweens.add({ targets: a.container, x: a.container.x + dir * 14, duration: k.slow(70), yoyo: true, ease: 'Quad.easeOut' });
    await k.wait(c.scene, k.slow(70));
    k.sheet(c.scene, SH_WAVE, at.x, at.y, { size: 210, frames: [0, 1, 2, 3], fps: 22, depth: k.DEPTH + 28, flipX: dir < 0, alpha: 0.9 });
    k.burst(c.scene, at.x, at.y + (t ? t.h * 0.3 : 20), { colors: ['#98a2b4', '#5b6579', '#ffffff'], n: 10, speed: [120, 320], angle: [-Math.PI * 0.95, -Math.PI * 0.05], gravity: 900, life: [260, 520], size: [5, 11] });
    if (t) jolt(c, k, t, dir * 6);
    k.shake(c.scene, 150, 0.0022);
    // hasar sayısı fiziksel darbede (1. vuruşun teması); şimşek yarısı ritmin ikinci vuruşunda arkadan gelir
    // motor bölünmüş hasarı İKİ olay yazar (fiziksel, sonra şimşek yarısı): ilk sayı bu temasta, ikincisi şimşek çatlayınca
    const physical = later();
    const lightning = later();
    physical.resolve();
    const done = later();
    let n = 0;
    void k.hitsAt({ ...c, targets: t ? [t, t] : [] }, () => (n++ === 0 ? physical.promise : lightning.promise), done.promise).then(hit);
    // nefes: ritmin ikinci vuruşu
    await k.wait(c.scene, k.slow(70));
    // 2. vuruş: şimşek yarısı çekiç başından çatlar
    c.sfx('sparkCrack');
    const head2 = toolOf(a);
    glow(c, k, head2.x, head2.y, 130, 220);
    arcBetween(c, k, head2, at);
    k.sheet(c.scene, SH_IMPACT, at.x, at.y, { size: 250, fps: 20, depth: k.DEPTH + 34, flipX: dir < 0 });
    glow(c, k, at.x, at.y, 170, 280);
    k.shake(c.scene, 190, 0.003);
    lightning.resolve();
    await k.wait(c.scene, k.slow(420));
    done.resolve();
    a.play('idle');
    void a.returnHome();
    await k.wait(c.scene, k.slow(260));
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- THUNDER STRIKE

/** Gökten tek yıldırım: hedefin zemininden yukarı doğru kurulur, kare yeterince büyüktür (üst ekran dışına çıkar). */
function dropBolt(c: VfxCtx, k: VfxKit, t: CombatantView, size: number): void {
  const f = feetOf(t);
  k.sheet(c.scene, SH_BOLT, f.x, f.y + 8, { size, fps: 14, depth: t.container.depth + 6, origin: [0.5, 0.94] });
  glow(c, k, f.x, f.y - 20, 190, 300);
  flash(c, k, 0.26, 200);
  k.shake(c.scene, 240, 0.0032);
}

/**
 * Thunder Strike (tek düşman, yakın dövüş görünümü): silah boyu mesafeye adım, çekiç başının üstüne kaldırılır ve şimşek ONUN üstünde toplanır;
 * yer çakışı: şimşek çekiç başından hedefe iner (yay) ve hedefte patlar (gökten ayrı yıldırım YOK: şimşek yalnız silahta). Gök kararır. Hasar çakışta.
 */
const thunder_strike: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_IMPACT, SH_CHARGE, SH_ARC]);
    const a = c.actor;
    const t = c.targets[0];
    await stepIn(c, t, REACH);
    a.skillPose(0);
    c.sfx('skaldCall');
    const undo = veil(c, k, 0.28, 300);
    const head = headUp(a);
    const charge = k.sheet(c.scene, SH_CHARGE, head.x, head.y, { size: 190, fps: 12, loop: true, depth: k.DEPTH + 30, alpha: 0.95 });
    glow(c, k, head.x, head.y, 140, 360);
    await k.wait(c.scene, k.slow(380));
    // çakış: kaldırılmış çekiç başından hedefe şimşek iner (yay), AYNI anda çekiç iner; hasar o an
    c.sfx('boltCrack');
    charge?.destroy();
    if (t) {
      arcBetween(c, k, head, chestOf(t));
      arcBetween(c, k, { x: head.x, y: head.y + 14 }, { x: chestOf(t).x, y: chestOf(t).y - 18 }, 0.8);
      const f = chestOf(t);
      k.sheet(c.scene, SH_IMPACT, f.x, f.y + t.h * 0.1, { size: 300, fps: 20, depth: k.DEPTH + 34, flipX: facing(a) < 0 });
      glow(c, k, f.x, f.y, 200, 300);
      flash(c, k, 0.2, 180);
      k.shake(c.scene, 240, 0.0032);
    }
    a.skillPose(-1);
    if (!reducedMotion()) c.scene.tweens.add({ targets: a.container, x: a.container.x + facing(a) * 12, duration: k.slow(70), yoyo: true, ease: 'Quad.easeOut' });
    hit();
    undo();
    await k.wait(c.scene, k.slow(480));
    a.play('idle');
    void a.returnHome();
    await k.wait(c.scene, k.slow(240));
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- WAR DRUM

/**
 * War Drum (kendi hücresi merkezli 3x3, Haste): davulu sırtından alır (drum_take) ve silahın sapıyla çalar: üç vuruş (kol kalkar, sap deriye iner).
 * Her vuruşta derinin üstünde ses halkası; vuruş anında sap ucundan deriye küçük şimşek çatlar. Son vuruşta 3x3 alanda şimşekli zemin dalgası,
 * alandaki her dostta kısa halka (Haste). Ritim canlı: vuruşlar arası 230 ms.
 */
const war_drum: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_PULSE, SH_BEAT, SH_CHARGE]);
    const a = c.actor;
    c.sfx('skaldChant');
    a.showPose('drum_take', false); // kayışı baş üstünden alır (ara poz, ani geçiş yok)
    await k.wait(c.scene, k.slow(300));
    a.showPose('drum_b', false);
    await k.wait(c.scene, k.slow(130));
    const BEAT = 230;
    for (let i = 0; i < 3; i++) {
      a.showPose('drum_a', false);
      const d = drumOf(a);
      c.sfx('drumThump');
      k.sheet(c.scene, SH_BEAT, d.x, d.y, { size: 130 + i * 40, fps: 20, depth: k.DEPTH + 30, alpha: 0.9 });
      k.sheet(c.scene, SH_CHARGE, d.x, d.y - 14, { size: 90 + i * 20, frames: [4, 5, 6, 7], fps: 24, depth: k.DEPTH + 31, alpha: 0.9 });
      glow(c, k, d.x, d.y, 90 + i * 30, 200);
      if (i < 2) {
        await k.wait(c.scene, k.slow(90));
        a.showPose('drum_b', false);
        await k.wait(c.scene, k.slow(BEAT - 90));
      }
    }
    // son vuruş: yuvarlanma sesi + zemin dalgası alan üstünde
    c.sfx('drumRoll');
    const cells = c.cells.length ? c.cells : [feetOf(a)];
    const xs = cells.map((p) => p.x);
    const ys = cells.map((p) => p.y);
    const mid = c.centerPos ?? { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    const width = Math.max(420, Math.max(...xs) - Math.min(...xs) + 220);
    k.sheet(c.scene, SH_PULSE, mid.x, mid.y + 8, { size: width / 0.9, fps: 14, depth: k.FLOOR_FX + 8, origin: [0.5, 0.86], alpha: 0.95 });
    k.shake(c.scene, 220, 0.0022);
    const arrivals = c.targets.map((t) => {
      const d = later();
      const wait = Math.min(300, Math.abs(t.container.x - a.container.x) * 0.45 + Math.abs(t.container.y - a.container.y) * 0.2);
      void k.wait(c.scene, k.slow(60 + wait)).then(() => {
        const p = chestOf(t);
        k.sheet(c.scene, SH_BEAT, p.x, p.y, { size: 170, fps: 20, depth: k.DEPTH + 32, alpha: 0.8 });
        glow(c, k, p.x, p.y, 110, 260);
        d.resolve();
      });
      return d.promise;
    });
    const done = later();
    void k.hitsAt(c, (t) => arrivals[c.targets.indexOf(t)] ?? Promise.resolve(), done.promise).then(hit);
    await k.wait(c.scene, k.slow(520));
    done.resolve();
    a.play('idle');
    await k.wait(c.scene, k.slow(220));
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- STORMCALL

/**
 * Stormcall (tek düşman, sonra en zırhlı iki düşmana zıplar): iki kol açık şarkı, gök kararır, ilk yıldırım hedefe iner; oradan zincir
 * şimşek yayı sıradaki hedefe atlar ve oraya da yıldırım düşer. Her hedefin hasarı kendi yıldırımı değdiğinde.
 */
const stormcall: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_BOLT, SH_ARC, SH_CHARGE]);
    const a = c.actor;
    c.sfx('skaldStormSong');
    const undo = veil(c, k, 0.45, 700);
    await k.wait(c.scene, k.slow(420));
    const hand = toolOf(a);
    const charge = k.sheet(c.scene, SH_CHARGE, hand.x, hand.y - 20, { size: 200, fps: 11, loop: true, depth: k.DEPTH + 30, alpha: 0.95 });
    c.sfx('stormRumble');
    await k.wait(c.scene, k.slow(760));
    charge?.destroy();
    const STEP = 360;
    const arrivals = c.targets.map(() => later());
    c.targets.forEach((t, i) => {
      void k.wait(c.scene, k.slow(i * STEP)).then(() => {
        if (i > 0) {
          const p = chestOf(c.targets[i - 1]!);
          const q = chestOf(t);
          const dist = Math.hypot(q.x - p.x, q.y - p.y);
          k.sheet(c.scene, SH_ARC, (p.x + q.x) / 2, (p.y + q.y) / 2, { size: Math.max(220, dist / 0.84), squashY: 0.55, fps: 20, depth: k.DEPTH + 33, rotation: Math.atan2(q.y - p.y, q.x - p.x), alpha: 0.95 });
        }
        c.sfx(i === 0 ? 'stormcallCrack' : 'boltCrack');
        dropBolt(c, k, t, Math.max(780, t.h * 4));
        void k.wait(c.scene, k.slow(110)).then(() => arrivals[i]!.resolve());
      });
    });
    const done = later();
    void k.hitsAt(c, (t) => arrivals[c.targets.indexOf(t)]?.promise ?? Promise.resolve(), done.promise).then(hit);
    await k.wait(c.scene, k.slow(Math.max(0, c.targets.length - 1) * STEP + 700));
    done.resolve();
    undo();
    a.play('idle');
    await k.wait(c.scene, k.slow(360));
  }, c.actor);

export const VFX: Record<string, V2Vfx> = {
  hammer_spark,
  thunder_strike,
  war_drum,
  stormcall,
};
