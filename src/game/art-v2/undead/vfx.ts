/**
 * Undead - SÜRÜM 2 SKILL ANİMASYONLARI. Kılavuz: docs/design/art-v2.md
 *
 * 2026-10-29 YENİ SHEET SETİ (Ömer: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin
 * amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"). Kodla çizilen
 * eski efektler (turkuaz ruh ateşi, kodla halka/parçacık) yerine ChatGPT'nin çizdiği 9 sheet oynar: assets/vfx/undead/<NN-ad>.png
 * (asılları assets/source/undead-vfx, içe aktarma `node tools/import-class-vfx.mjs undead`; tasarım docs/anim-review/new-art/undead/brief.md,
 * inceleme docs/anim-review/notes/<skill>.md). Palet: kemik fildişi, nekrotik mor, koyu mor; kan/ruh işinde koyu kızıl; zehirde yeşil-mor.
 * Vuruş anları, motor olayları ve çağrı sırası eskisiyle aynıdır; yalnızca görüntü değişti.
 *
 * Sarma (`wrap`, Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor"; hayalet 0,45): Raise Dead
 * sütunu, Dark Bond mührü ve Wail mezar sisi birimi sarar (src/game/vfx-sheets.ts > SheetWrap).
 *
 * Bu class'ın skill'leri -> VFX anahtarları:
 *   bone_throw (Bone Throw) -> 'bonethrow'        01 mezar kıymığı uçar, 02 patlar (Slow tuttuysa mezar ayazı yere çöker)
 *   wail_of_the_dead (Wail of the Dead) -> 'wail'  03 atanın önünde hayalet çığlığı, 04 vurulan her hücrede çığlık atan hayalet + mezar sisi
 *   dark_bond (Dark Bond) -> 'darkbond'            06 dikenli damar teli atandan dosta gerilir (döngü), 05 dostun göğsünde kan mührü
 *   raise_dead (Raise Dead) -> 'raise'             07'nin ilk iki karesi (rün halkası) yuvada; olaylar 'corpsedrain' (08 ruh tutamları
 *                                                  cesetten yuvaya) ve 'summon_skeleton' (07 mezar patlaması, iskelet içinden yükselir)
 *   Vampiric Bite (pasif)                          08 kızıl ruh tutamı vurulandan Undead'e uçar; bağ şifası tutamı Undead'den dosta
 *   skeleton_strike (Bone Strike) -> 'bonestrike'  (değişmedi: paslı kılıç izi)
 *   skeleton_slash (Bone Slash) -> 'boneslash'     09 kemik tozu kesiği (dönüş vuruşu dikey aynalı)
 * Phaser'ı ve ../../vfx'i ÇALIŞMA ZAMANINDA içe aktarma (yalnızca import type); her şey k üzerinden gelir.
 */
import { FULL_W } from '../../../ui/viewport'; // geniş ekran: karartma görünen alanın tamamını kaplar
import type Phaser from 'phaser';
import { reducedMotion } from '../../../ui/motion-pref';
import type { CombatantView } from '../../combatant-view';
import type { VfxCtx } from '../../vfx';
import type { VfxKit } from '../../vfx-versions';
import type { SheetOpts } from '../../vfx-sheets';
import type { V2Vfx } from '../types';

type Pt = { x: number; y: number };
type Img = Phaser.GameObjects.Image;
type Spr = Phaser.GameObjects.Sprite;

// ---------------------------------------------------------------------------------------------------------------- sheet'ler

const SH_FLY = 'undead/01-bone-throw-fly';
const SH_HIT = 'undead/02-bone-throw-hit';
const SH_SCREAM = 'undead/03-wail-of-the-dead-scream';
const SH_GRAVE = 'undead/04-wail-of-the-dead-grave';
const SH_SIGIL = 'undead/05-dark-bond-sigil';
const SH_THREAD = 'undead/06-dark-bond-thread';
const SH_RAISE = 'undead/07-raise-dead';
const SH_WISP = 'undead/08-vampiric-bite-wisp';
const SH_SLASH = 'undead/09-bone-slash';

/** Sheet karesinin kenarı (px; tools/import-class-vfx.mjs FRAME). */
const FR = 320;
/** Zemin sheet'lerinde içeriğin tabanı (kare yüksekliğinin kesri; json pivot'u ile aynı): ayak çizgisine oturur. */
const BASE_Y = 0.94;
/** Birimi saran sütun efektlerinde öndeki hayalet kopyanın saydamlığı (Ömer 2026-10-29). */
const GHOST = 0.45;

/**
 * Sheet'i yerleştirir. `origin` sağa bakan çizimdeki dayanaktır; `flip` (sola dönük) verilince doku karenin İÇİNDE aynalanır (Phaser
 * flipX origin'i aynalamaz), bu yüzden dayanağın x'i 1 - ox olur.
 */
function sheetAt(c: VfxCtx, k: VfxKit, id: string, x: number, y: number, o: SheetOpts & { origin: [number, number]; flip?: boolean }): Spr | null {
  const { flip, origin, ...rest } = o;
  return k.sheet(c.scene, id, x, y, { ...rest, origin: [flip ? 1 - origin[0] : origin[0], origin[1]], flipX: !!flip });
}

// ---------------------------------------------------------------------------------------------------------------- ortak yardımcılar

/** Sahnenin motor/görünüm alanlarına güvenli erişim (yalnızca okuma; yoksa boş). */
interface SceneLike {
  battle?: { log?: Array<Record<string, unknown>> };
  views?: Map<string, CombatantView>;
}
const sceneOf = (c: VfxCtx): SceneLike => c.scene as unknown as SceneLike;

/** Bu skill kullanımının motor olayları (aynı kullanıcının son skillUsed olayından sonrakiler) + skillUsed'un kendisi. */
function useEvents(c: VfxCtx): { used: Record<string, unknown> | null; after: Array<Record<string, unknown>> } {
  const log = sceneOf(c).battle?.log ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e['type'] === 'skillUsed' && e['actor'] === c.actor.combatant.uid && e['skill'] === c.skill.id) return { used: e, after: log.slice(i + 1) };
  }
  return { used: null, after: [] };
}

const viewOf = (c: VfxCtx, uid: unknown): CombatantView | undefined => (typeof uid === 'string' ? sceneOf(c).views?.get(uid) : undefined);

/** Kullanıcının baktığı yön (oyuncu sağa, düşman sola). */
const facing = (v: CombatantView): number => (v.combatant.side === 'party' ? 1 : -1);
/** Sprite'ın ekrandaki genişliği (birim kutusu w daha geniş olabilir). */
const spriteW = (v: CombatantView): number => Math.abs(v.sprite.displayWidth * v.container.scaleX) || v.w * 0.6;
/** Lich'in büyü eli: v2 pozlu birimde silahın ucu / tılsımlı el (CombatantView.castPoint), yoksa sprite oranı. */
const handOf = (v: CombatantView): Pt => v.castPoint() ?? { x: v.container.x + facing(v) * spriteW(v) * 0.4, y: v.container.y - v.h * 0.64 };
/** Lich asasının kristali (arkadaki el, tepede). */
const staffOf = (v: CombatantView): Pt => ({ x: v.container.x - facing(v) * spriteW(v) * 0.4, y: v.container.y - v.h * 0.92 });
/** Göğüs (bağ / ruh çıkışı / gövde efektleri). */
const chestOf = (v: CombatantView): Pt => ({ x: v.container.x + facing(v) * v.w * 0.05, y: v.container.y - v.h * 0.62 });

/** Yumuşak ışıma dokusu (ADD karışımıyla; tint ile renklenir). */
const glowTex = (c: VfxCtx, k: VfxKit): string =>
  k.softTexture(c.scene, 'v2undead:glow', 48, 48, (x, y) => {
    const d = Math.hypot((x + 0.5 - 24) / 24, (y + 0.5 - 24) / 24);
    if (d >= 1) return null;
    return { c: d < 0.25 ? '#ffffff' : d < 0.55 ? '#e8e0f0' : '#c8b8e0', a: (1 - d) ** 1.4 };
  });

/** Bir noktada kısa ADD ışıması (varsayılan nekrotik mor). */
function glowAt(c: VfxCtx, k: VfxKit, x: number, y: number, size: number, life: number, depth = k.DEPTH + 30, tint = 0xb36bff): Img {
  const img = c.scene.add.image(x, y, glowTex(c, k)).setDisplaySize(size, size).setDepth(depth).setBlendMode(k.Phaser.BlendModes.ADD).setTint(tint);
  c.scene.tweens.add({ targets: img, alpha: 0, scaleX: img.scaleX * 1.4, scaleY: img.scaleY * 1.4, duration: k.slow(life), ease: 'Quad.easeOut', onComplete: () => img.destroy() });
  return img;
}

/** Soğuk ışık (ADD) noktası; kendini söndürmez (çağıran yönetir). */
function coldLight(c: VfxCtx, k: VfxKit, x: number, y: number, w: number, h: number, tint: number, alpha: number, depth: number): Img {
  return c.scene.add.image(x, y, glowTex(c, k)).setDisplaySize(w, h).setTint(tint).setAlpha(alpha).setDepth(depth).setBlendMode(k.Phaser.BlendModes.ADD);
}

/** Nesneyi söndürüp yok eder. */
function fadeOut(c: VfxCtx, k: VfxKit, obj: Phaser.GameObjects.GameObject, delay: number, dur: number, extra: Record<string, unknown> = {}): void {
  c.scene.tweens.add({ targets: obj, alpha: 0, delay: k.slow(delay), duration: k.slow(dur), ...extra, onComplete: () => obj.destroy() });
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** İki rengi karıştırır (toprak lekesinin temizlenmesi gibi tint geçişleri). */
function mixHex(a: number, b: number, t: number): number {
  const u = clamp01(t);
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * u;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * u;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * u;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

// ---------------------------------------------------------------------------------------------------------------- RUH TUTAMI (Vampiric Bite)

/** Tutam sheet'inde parlak çekirdeğin yeri (sola akan çizimde; kuyruk sağda). */
const WISP_CORE: [number, number] = [0.36, 0.5];

/**
 * Kızıl ruh tutamı `from`dan `to`ya kavisle uçar (08, döngü). Çizim SOLA akar: hedef sağdaysa aynalanır. Promise varışta çözülür.
 */
async function wispFly(c: VfxCtx, k: VfxKit, from: Pt, to: Pt, o: { size?: number; dur?: number; arc?: number; delay?: number; depth?: number } = {}): Promise<void> {
  if (o.delay) await k.wait(c.scene, k.slow(o.delay));
  const flip = to.x > from.x;
  const spr = sheetAt(c, k, SH_WISP, from.x, from.y, { size: o.size ?? 140, origin: WISP_CORE, flip, loop: true, depth: o.depth ?? k.DEPTH + 46 }); // Wail çığlığının (03, +40) ve Bone Throw patlamasının (+44) ÜSTÜNDE: altında kalınca tutam görünmüyordu
  if (!spr) return;
  spr.setAlpha(0);
  c.scene.tweens.add({ targets: spr, alpha: 1, duration: k.slow(90) });
  await k.travel(c.scene, spr as unknown as Img, to, o.dur ?? 460, { arc: o.arc ?? 70, ease: 'in' });
  c.scene.tweens.add({ targets: spr, alpha: 0, scaleX: spr.scaleX * 0.5, scaleY: spr.scaleY * 0.5, duration: k.slow(120), onComplete: () => spr.destroy() });
}

/**
 * Vampiric Bite (pasif): bu kullanımda Undead gerçekten can çaldıysa vurulanlardan Undead'in göğsüne kızıl ruh tutamı uçar, göğsünde kızıl
 * ışık parlar; Dark Bond şifası da varsa tutam Undead'den bağlı dosta sürer. Arka planda oynar (beklenmez).
 */
function vampiricEcho(c: VfxCtx, k: VfxKit, victims: CombatantView[]): void {
  const { after } = useEvents(c);
  const heals = after.filter((e) => e['type'] === 'heal' && e['source'] === e['target'] && !e['cause']);
  const drainHeal = heals.find((e) => viewOf(c, e['target'])?.combatant.passive?.effect.type === 'soulDrain');
  if (!drainHeal) return;
  const drainer = viewOf(c, drainHeal['target']);
  if (!drainer || !victims.length) return;
  const bond = after.find((e) => e['type'] === 'heal' && e['cause'] === 'dark_bond' && e['source'] === drainer.combatant.uid);
  const partner = bond ? viewOf(c, bond['target']) : undefined;
  void (async () => {
    await k.sheetsReady(c.scene, [SH_WISP]);
    await k.wait(c.scene, k.slow(140));
    c.sfx('soulDrain');
    const to = chestOf(drainer);
    const flights = victims.map((v, i) => wispFly(c, k, chestOf(v), to, { size: 180, arc: 100 + (i % 2) * 30, dur: 520, delay: i * 70 }));
    await Promise.race(flights);
    glowAt(c, k, to.x, to.y, 150, 520, k.DEPTH + 45, 0xd23a5a);
    if (partner) {
      await k.wait(c.scene, k.slow(160));
      await bondHealPulse(c, k, to, partner);
    }
  })();
}

/**
 * Bond şifası (cause 'dark_bond', ~0,4 sn, sık olabilir): Undead'den bağlı dosta küçük kızıl ruh tutamı uçar; varınca dostun göğsünde kısa
 * kızıl-siyah parlama (normal yeşil şifadan ayrı). Beklenebilir (Promise varışta çözülür).
 */
async function bondHealPulse(c: VfxCtx, k: VfxKit, from: Pt, partner: CombatantView): Promise<void> {
  const p = chestOf(partner);
  await wispFly(c, k, from, p, { size: 84, dur: 250, arc: 30 });
  const dark = c.scene.add.image(p.x, p.y, glowTex(c, k)).setDisplaySize(86, 86).setTint(0x1a0509).setAlpha(0.85).setDepth(k.DEPTH + 19);
  c.scene.tweens.add({ targets: dark, alpha: 0, displayWidth: 130, displayHeight: 130, duration: k.slow(260), ease: 'Quad.easeOut', onComplete: () => dark.destroy() });
  glowAt(c, k, p.x, p.y, 110, 240, k.DEPTH + 20, 0xb0304f);
}

// ---------------------------------------------------------------------------------------------------------------- BONE THROW

/** Kıymık sheet'inde kıymığın yeri (sağa uçan çizimde; mor duman şeritleri solda): uçuş noktası bu. */
const SHARD_AT: [number, number] = [0.72, 0.5];

/**
 * Bone Throw (tek hedef, büyü / dark + Slow 2 tur): lich'in elinde mor ışık toplanır; mezar kıymığı (01, kendi ekseninde döner, arkasında mor
 * duman şeritleri) kavisle hedefe uçar; göğüs hizasında patlar (02: mor flaş, kemik kıymıkları). Slow tuttuysa patlamanın devamında soluk mezar
 * ayazı aşağı kıvrılıp hedefin önüne çöker (02'nin 5-8. kareleri); tutmadıysa yalnız patlama oynar. Vampiric Bite: can çalındıysa ruh tutamı.
 */
const bonethrow: V2Vfx = async (c, k) => {
  await k.sheetsReady(c.scene, [SH_FLY, SH_HIT, SH_WISP]);
  const a = c.actor;
  const dir = facing(a);
  a.play('attack');
  const h = handOf(a);
  const hand = coldLight(c, k, h.x, h.y - 10, 30, 30, 0xb36bff, 0, k.DEPTH + 32);
  c.scene.tweens.add({ targets: hand, alpha: 0.9, displayWidth: 96, displayHeight: 96, duration: k.slow(200), ease: 'Sine.easeIn' });
  await k.wait(c.scene, k.slow(210));
  const { after } = useEvents(c);
  await Promise.all(
    c.targets.map(async (t) => {
      const ch = chestOf(t);
      const p = k.contact(c.actor, t, { x: t.container.x, y: ch.y });
      const start = { x: h.x + dir * 10, y: h.y - 20 };
      const flip = p.x < start.x;
      c.sfx('boneSpin');
      fadeOut(c, k, hand, 0, 200);
      c.scene.tweens.add({ targets: a.container, x: a.container.x + dir * 12, duration: k.slow(70), yoyo: true });
      const shard = sheetAt(c, k, SH_FLY, start.x, start.y, { size: 150, origin: SHARD_AT, flip, loop: true, depth: k.DEPTH + 40 });
      if (shard) {
        await k.travel(c.scene, shard as unknown as Img, p, 360, { arc: 80 });
        shard.destroy();
      } else await k.wait(c.scene, k.slow(360));
      // çarpma: göğüs hizasında mor patlama; Slow tuttuysa mezar ayazı aşağı çöker
      c.sfx('boneImpact');
      const slowed = after.some((e) => e['type'] === 'status' && e['status'] === 'slow' && e['target'] === t.combatant.uid);
      const size = Math.max(200, Math.min(300, t.h * 1.15));
      const hit = sheetAt(c, k, SH_HIT, p.x, p.y, { size, origin: [0.5, 0.52], flip: dir < 0, depth: k.DEPTH + 44, fps: 14, ...(slowed ? {} : { frames: [0, 1, 2, 3] }) });
      if (hit && !slowed) c.scene.tweens.add({ targets: hit, alpha: 0, delay: k.slow(200), duration: k.slow(110) });
      // mezar ayazı (s3-s8) patlamanın göğüs noktasında havada kalmasın: s2-s4 arasında hedefin ortasına ve ayak çizgisine çöker
      // (içeriğin tabanı karenin ~0,95'i; patlama dayanağı 0,52)
      if (hit && slowed) c.scene.tweens.add({ targets: hit, x: t.container.x, y: t.container.y - (0.95 - 0.52) * size + 6, delay: k.slow(150), duration: k.slow(220), ease: 'Sine.easeInOut' });
      glowAt(c, k, p.x, p.y, 150, 260, k.DEPTH + 45, 0xd9b8ff);
      k.shake(c.scene, 110, 0.004);
      c.scene.tweens.add({ targets: t.container, x: t.container.x + dir * 12, duration: k.slow(50), yoyo: true });
      if (slowed) {
        // ağırlaşma: hedef bir an çöker, geride kalan soluk izler
        void k.wait(c.scene, k.slow(300)).then(() => {
          c.sfx('graveGrip');
          c.scene.tweens.add({ targets: t.container, scaleY: 0.95, duration: k.slow(90), yoyo: true, hold: k.slow(160) });
          for (let i = 1; i <= 3; i++) void k.wait(c.scene, k.slow(i * 90)).then(() => t.afterimage(0xc8c0e8, 0.32 - i * 0.07, 520));
        });
      }
    }),
  );
  vampiricEcho(c, k, c.targets);
};

// ---------------------------------------------------------------------------------------------------------------- WAIL OF THE DEAD

/** Lich'in ağzı (başını geriye atıp çığlık attığı nokta). */
const mouthOf = (v: CombatantView): Pt => ({ x: v.container.x + facing(v) * spriteW(v) * 0.1, y: v.container.y - v.h * 0.84 });

/** Kurbanın tepkisi: çığlıkla başını tutup geri sarsılır (sprite yerel titreme + geriye eğilme) + mor ruh parıltısı. Ölmüş/silinmiş hedefte sessiz. */
function wailRecoil(c: VfxCtx, k: VfxKit, t: CombatantView, from: Pt, calm: boolean): void {
  if (!t.sprite?.active) return;
  const away = t.container.x >= from.x ? 1 : -1;
  if (!calm) {
    const sx = t.sprite.x;
    const sa = t.sprite.angle;
    c.scene.tweens.add({ targets: t.sprite, x: sx + 4, duration: k.slow(26), yoyo: true, repeat: 5, onComplete: () => t.sprite.active && t.sprite.setX(sx) });
    c.scene.tweens.add({ targets: t.sprite, angle: sa + away * 7, duration: k.slow(90), yoyo: true, hold: k.slow(140), ease: 'Quad.easeOut', onComplete: () => t.sprite.active && t.sprite.setAngle(sa) });
  }
  t.afterimage(0x9a6cff, 0.55, 380);
  const fx = t.sprite.postFX?.addGlow(k.color('#b872ff'), 6, 0, false, 0.1, 12);
  if (fx) c.scene.tweens.add({ targets: fx, outerStrength: 0, duration: k.slow(620), ease: 'Quad.easeIn', onComplete: () => t.sprite.postFX?.remove(fx) });
}

/** 04 mezar sisi havuzunun ortası (kare yüksekliğinin kesri; havuz ~0,86-0,94 arası). */
const GRAVE_POOL_Y = 0.9;

/**
 * Çığlığın bir hücreye çarpması: hücre plakası kısa morarır; yerden çığlık atan hayalet fırlar ve dağılır, geriye yere yapışan yeşil-mor mezar
 * sisi kalır (04; zehir zemini). Sheet hücredeki birimi SARAR: hayalet birimin arkasından yükselir (önünde 0,45 hayalet kopya), taban sisi
 * ayağının önünde. Boş hücrede aynı derinlik kuralı hücrenin zemin y'si ile. Hedefler sarsılır.
 */
function wailCell(c: VfxCtx, k: VfxKit, slot: number, victims: CombatantView[], from: Pt, o: { power: number; linger: number; calm: boolean }): void {
  const m = k.cellMid(c.board, slot);
  const q = k.quadOf(c.board, slot, 1);
  const cw = Math.abs(q[1]!.x - q[0]!.x) + Math.abs(q[3]!.x - q[0]!.x);
  // hücre plakası: kısa mor leke (vurulan alan okunsun)
  const g = c.scene.add.graphics().setDepth(k.FLOOR_FX + 1);
  k.fillCells(g, c.board, [slot], { fill: 0x2e1446, fillA: 0.45, edge: 0xb36bff, edgeA: 0.8, edgeW: 3, k: 0.94 });
  g.setAlpha(0);
  c.scene.tweens.add({ targets: g, alpha: 1, duration: k.slow(70), ease: 'Quad.easeOut' });
  c.scene.tweens.add({ targets: g, alpha: 0, delay: k.slow(260), duration: k.slow(Math.max(100, o.linger - 260)), ease: 'Quad.easeIn', onComplete: () => g.destroy() });
  const occ = victims[0];
  const unit = occ ? (): number => occ.container.depth : m.y;
  const size = cw * 1.05 * (o.power > 1 ? 1.12 : 1);
  // dayanak taban sisi havuzunun ORTASI (kare y 0,9; içeriğin alt kenarı BASE_Y 0,94): ayak havuzun içinde durur, havuz ayağın önüne taşar
  // (BASE_Y'de havuzun alt kenarı ayak çizgisindeydi, havuz ayağın arkasında kalıyordu)
  sheetAt(c, k, SH_GRAVE, m.x, m.y + 4, { size, origin: [0.5, GRAVE_POOL_Y], flip: from.x > m.x, fps: 12, wrap: { unit, ghost: occ ? GHOST : 0 } });
  for (const t of victims) wailRecoil(c, k, t, from, o.calm);
}

/**
 * Wail of the Dead (plus, aşamalı distance; büyü hasarı + 2 tur zehir zemini; bedel: mevcut canın %20'si). ~1,35 sn (normal hız):
 * 1) Bedel + nefes (0-0,2 sn): lich başını GERİYE atar (gövde geriye eğilir), ağzında kızıl-mor ışık.
 * 2) Çığlık (0,2-0,55 sn): baş öne savrulur; atanın önünde soluk ektoplazmadan çığlık atan yüz belirir, ağzından hedefe doğru mor ses
 *    halkaları açılır (03).
 * 3) Merkez çarpış (~0,55 sn): merkez hücrede yerden hayalet fırlar, mezar sisi çöker (04); hedef sarsılır. releaseStage(0) + hit().
 * 4) Kollar (~0,8 sn): dalga artının kollarına yayılır, kol hücrelerinde aynı mezar efekti. releaseStage(1).
 * 5) Kalan (~0,5 sn): sis hücrelerde söner. Vampiric Bite: çalınan can lich'e ruh tutamı olarak akar.
 * Kenar hücrede eksik kol(lar) atlanır. Azaltılmış hareket: ekran sarsıntısı ve kurban titremesi yok, parlama hafif.
 */
const wail: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_SCREAM, SH_GRAVE, SH_WISP]);
    const a = c.actor;
    const calm = reducedMotion();
    const stages = c.stages?.length ? c.stages : [{ slots: c.slots ?? [], cells: c.cells, targets: c.targets }];
    const midSlot = stages[0]?.slots[0] ?? c.center;
    const cell = midSlot !== undefined ? k.cellMid(c.board, midSlot) : (c.centerPos ?? stages[0]?.cells[0] ?? k.feet(a));
    const ang0 = a.container.angle;
    const sy0 = a.container.scaleY;
    const mouth = mouthOf(a);
    const dirX = cell.x >= mouth.x ? 1 : -1;
    // 1) can bedeli + başını geriye atma
    c.sfx('lifeTithe');
    a.play('cast');
    c.scene.tweens.add({ targets: a.container, angle: ang0 - dirX * 8, scaleY: sy0 * 1.04, duration: k.slow(180), ease: 'Quad.easeOut' });
    glowAt(c, k, mouth.x, mouth.y, 70, 260, k.DEPTH + 31, 0xd23a5a);
    await k.wait(c.scene, k.slow(190));
    // 2) çığlık: baş öne savrulur, hayalet yüz atanın önünde açılır ve ses halkaları hedefe doğru yayılır
    c.sfx('ghostWail');
    c.scene.tweens.add({ targets: a.container, angle: ang0 + dirX * 4, scaleY: sy0, duration: k.slow(70), ease: 'Back.easeOut' });
    c.scene.tweens.add({ targets: a.container, angle: ang0, delay: k.slow(420), duration: k.slow(200), ease: 'Sine.easeInOut' });
    sheetAt(c, k, SH_SCREAM, mouth.x + dirX * 10, mouth.y + 6, { size: 250, origin: [0.16, 0.5], flip: dirX < 0, fps: 14, depth: k.DEPTH + 40 });
    glowAt(c, k, mouth.x, mouth.y, 110, 360, k.DEPTH + 31, 0xc79bff);
    if (!calm) k.shake(c.scene, 120, 0.003);
    await k.wait(c.scene, k.slow(320));
    // 3) merkez çarpış
    k.flash(c.scene, '#2e1446', calm ? 0.14 : 0.3, 380);
    await k.wait(c.scene, k.slow(110));
    if (!calm) k.shake(c.scene, 200, 0.005);
    const linger = 620;
    for (const [si, st] of stages.entries()) {
      if (si > 0) {
        // dalga zeminde merkezden kollara yol alır (görünür gecikme)
        if (si === 1) c.sfx('graveMoan');
        await k.wait(c.scene, k.slow(200));
      }
      for (const s of st.slots)
        wailCell(c, k, s, st.targets.filter((t) => t.combatant.slot === s), cell, { power: si === 0 ? 1.25 : 1, linger: si === 0 ? linger + 200 : linger, calm });
      c.releaseStage(si);
      if (si === 0) hit();
    }
    a.play('idle');
    vampiricEcho(c, k, stages.flatMap((s) => s.targets));
    // 5) kalan: mezar sisi söner (sheet kendini yok eder); efekt ömrü sisi kapsar
    await k.wait(c.scene, k.slow(linger + 40));
    a.container.setAngle(ang0);
  }, c.actor);

// ---------------------------------------------------------------------------------------------------------------- DARK BOND

/** Tel sheet'inin ekrandaki kalınlığı (px): damar + çevresindeki koyu kızıl duman. */
const THREAD_H = 104;

/**
 * Dark Bond (tek dost, kendisi hariç; 4 tur bağ; YARIM TUR): lich'in elinde koyu kızıl ışık toplanır; dikenli kızıl damar teli (06, üstünde
 * nabız gibi akan ışık, döngü) elden dostun göğsüne gerilerek uzanır; varınca dostun göğsünde kan yemini mührü kapanır, kalp atar ve kilitlenir
 * (05). Mühür dostu SARAR: yatık halka, arka yarısı gövdenin arkasında (önünde 0,45 hayalet), ön yarısı önünde. Yarım tur: kum saati. ~0,9 sn.
 */
const darkbond: V2Vfx = (c, k) =>
  k.playUntilHit(async (hit) => {
    await k.sheetsReady(c.scene, [SH_SIGIL, SH_THREAD]);
    const a = c.actor;
    const { used } = useEvents(c);
    const turnCost = typeof used?.['turnCost'] === 'number' ? (used['turnCost'] as number) : 1;
    c.sfx('darkChant');
    a.play('cast');
    // 1) elde koyu kızıl ışık toplanır
    const h = handOf(a);
    const gather = coldLight(c, k, h.x, h.y, 20, 20, 0xb0304f, 0, k.DEPTH + 32);
    c.scene.tweens.add({ targets: gather, alpha: 0.95, displayWidth: 110, displayHeight: 110, duration: k.slow(230), ease: 'Sine.easeIn' });
    await k.wait(c.scene, k.slow(240));
    c.sfx('chainTether');
    for (const t of c.targets) {
      const from = handOf(a);
      const to = chestOf(t);
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      const ang = Math.atan2(to.y - from.y, to.x - from.x);
      // 2) tel elden dosta uzanır (sol uç elde, x ölçeği açılır)
      const thread = k.sheet(c.scene, SH_THREAD, from.x, from.y, { size: FR, origin: [0, 0.5], loop: true, rotation: ang, depth: k.DEPTH + 33 });
      const sx = len / FR;
      const sy = THREAD_H / FR;
      thread?.setScale(0.001, sy);
      if (thread) await k.counter(c.scene, k.slow(260), (u) => thread.setScale(Math.max(0.001, sx * u), sy), 'Quad.easeOut');
      else await k.wait(c.scene, k.slow(260));
      fadeOut(c, k, gather, 0, 160);
      if (thread) {
        // varıştan sonra tel elin GÜNCEL konumunu izler: lich asasını kaldırınca sol uç boşlukta asılı kalmasın (yakalama #46)
        const follow = (): void => {
          if (!thread.active) return;
          const p = handOf(a);
          thread.setPosition(p.x, p.y).setRotation(Math.atan2(to.y - p.y, to.x - p.x)).setScale(Math.max(0.001, Math.hypot(to.x - p.x, to.y - p.y) / FR), sy);
        };
        c.scene.events.on(k.Phaser.Scenes.Events.POST_UPDATE, follow);
        thread.once(k.Phaser.GameObjects.Events.DESTROY, () => c.scene.events.off(k.Phaser.Scenes.Events.POST_UPDATE, follow));
      }
      // 3) varış: dostun göğsünde mühür kapanır (sarar)
      c.sfx('bondPulse');
      const size = Math.max(170, Math.min(240, t.w * 1.5));
      // son karede (soluk halka) kalır ve yumuşakça söner (birden kaybolmasın; sönme animasyon bitişine bağlı, tween süresine değil)
      const sigil = sheetAt(c, k, SH_SIGIL, to.x, to.y, { size, squashY: 0.62, origin: [0.5, 0.5], fps: 12, keep: true, wrap: { unit: () => t.container.depth, split: 0.5, ghost: GHOST } });
      sigil?.once(k.Phaser.Animations.Events.ANIMATION_COMPLETE, () => fadeOut(c, k, sigil, 0, 320));
      glowAt(c, k, to.x, to.y, 140, 380, k.DEPTH + 20, 0xb0304f);
      hit();
      if (turnCost < 1) halfTurnGlass(c, k, turnCost);
      await k.wait(c.scene, k.slow(260));
      if (thread) c.scene.tweens.add({ targets: thread, alpha: 0, duration: k.slow(160), onComplete: () => thread.destroy() });
    }
    a.play('idle');
  }, c.actor);

/**
 * Yarım tur göstergesi (turnCost < 1): lich'in başının yanında kum saati belirir, kumun yalnızca bir kısmı (turnCost oranı) akar, saat yarım
 * döner ve yanında "½" parlar; tur sırası çubuğu da yarım tur ilerler. Arka planda oynar.
 */
function halfTurnGlass(c: VfxCtx, k: VfxKit, turnCost: number): void {
  const a = c.actor;
  void (async () => {
    c.sfx('sandHiss');
    const gx = a.container.x + facing(a) * (spriteW(a) * 0.5 + 36);
    const gy = a.container.y - a.h * 0.78;
    const glass = k.v2Sprite(c, 'halfglass', '#d9c9a3', gx, gy, 56, k.DEPTH + 62).setAlpha(0);
    k.grow(c.scene, glass, 0.5, 1, 160, 'Back.easeOut', { alpha: 1 });
    const sand = c.scene.add.graphics().setDepth(k.DEPTH + 63);
    await k.counter(c.scene, k.slow(Math.round(560 * turnCost)), (u) => {
      sand.clear();
      for (let i = 0; i < 5; i++) if ((i + Math.floor(u * 24)) % 2) sand.fillStyle(0xe3b983, 1).fillRect(k.snap(gx) - 1, gy - 1 + i * 3, 3, 3);
    });
    sand.destroy();
    c.scene.tweens.add({ targets: glass, angle: facing(a) * 90, duration: k.slow(150), ease: 'Back.easeOut' });
    const txt = c.scene.add
      .text(gx + facing(a) * 34, gy - 4, '½', { fontFamily: 'serif', fontSize: '30px', fontStyle: 'bold', color: '#f2e6c8', stroke: '#2a1a0e', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(k.DEPTH + 64)
      .setAlpha(0);
    c.scene.tweens.add({ targets: txt, alpha: 1, y: txt.y - 10, duration: k.slow(160) });
    await k.wait(c.scene, k.slow(380));
    c.scene.tweens.add({ targets: [glass, txt], alpha: 0, y: '-=20', duration: k.slow(240), onComplete: () => { glass.destroy(); txt.destroy(); } });
  })();
}

// ---------------------------------------------------------------------------------------------------------------- RAISE DEAD

/*
 * RAISE DEAD (2026-10-29 sheet seti). Üç parça art arda oynar (olay akışı değişmez):
 *  1) 'raise' (skill, ~0,7 sn): lich asasını kaldırır, kristalinde mor ışık toplanır; mezarın açılacağı yuvada mor mezar ateşinden rün halkası
 *     belirir ve toprak çatlar (07'nin ilk iki karesi).
 *  2) 'corpsedrain' (olay, yalnızca ceset tüketildiyse, ~1 sn): ölünün soluk hayaleti cesedinden yarı doğrulur ve aşınır; ondan kopan kızıl
 *     ruh tutamları (08) kavisle mezar yuvasına uçup toprağa siner.
 *  3) 'summon_skeleton' (olay): toprak yarılır, rün halkası açılır, iskelet elleri ve kemik parçaları soluk yeşil ruh ateşi sütunuyla
 *     fışkırır, sütun kemik tozuna dönüp çöker (07). Sütun iskeleti SARAR (arkasında tam, önünde 0,45 hayalet; taban halkası ayağının önünde);
 *     iskelet sütunun içinden sarsak hamlelerle yükselir. Beslenmişse gözleri soluk yeşil yanar; beslenmemiş: sütun soluk ve gri.
 */

/** Skeleton'un kafatası göz çukurları ve göğsü (sprite oranlarından: assets/sprites/skeleton/idle.png). */
const skullEyes = (v: CombatantView): Pt => ({ x: v.container.x + facing(v) * v.w * 0.08, y: v.container.y - v.h * 0.9 });
const ribs = (v: CombatantView): Pt => ({ x: v.container.x + facing(v) * v.w * 0.02, y: v.container.y - v.h * 0.64 });

/** Çağrının doğacağı yuvanın zemin noktası (kullanım özeti ya da skillUsed.slot); yoksa undefined. */
function graveSpot(c: VfxCtx, k: VfxKit, slot: unknown): Pt | undefined {
  if (typeof slot !== 'number') return undefined;
  return k.cellMid(c.actor.combatant.side === 'party' ? 'party' : 'enemy', slot);
}

/** Mezar patlamasının ekrandaki boyu (karenin kenarı): birimin hücresine göre. */
const raiseSize = (cellW: number): number => cellW * 1.8;
/** Çağrı hücresinin genişliği (iskeletin kutusuna göre; skill anındaki rün halkası da aynı boyda). */
const raiseCell = (w: number): number => Math.max(140, Math.min(200, w * 1.1));

/**
 * Raise Dead (skill): lich asasını kaldırır, kristalinde mor ışık toplanır; mezarın açılacağı yuvada mor rün halkası belirir, toprak çatlar
 * (07'nin 1-2. kareleri, kısa süre kalıp söner). Gerisi olay efektlerinde. ~0,7 sn.
 */
const raise: V2Vfx = async (c, k) => {
  await k.sheetsReady(c.scene, [SH_RAISE, SH_WISP]);
  const a = c.actor;
  const { used } = useEvents(c);
  c.sfx('graveMoan');
  a.play('cast');
  const st = staffOf(a);
  const halo = coldLight(c, k, st.x, st.y, 30, 30, 0xb36bff, 0, k.DEPTH + 32);
  c.scene.tweens.add({ targets: halo, alpha: 0.85, displayWidth: 120, displayHeight: 120, duration: k.slow(380), ease: 'Sine.easeIn' });
  fadeOut(c, k, halo, 420, 360);
  const f = k.feet(a);
  const to = graveSpot(c, k, used?.['slot']) ?? { x: f.x + facing(a) * 160, y: f.y };
  await k.wait(c.scene, k.slow(300));
  // rün halkası yuvada belirir, toprak çatlar (yalnız ilk iki kare; kalır ve söner)
  c.sfx('earthCrack');
  const ring = k.sheet(c.scene, SH_RAISE, to.x, to.y + 4, { size: raiseSize(raiseCell(0)), origin: [0.5, BASE_Y], frames: [0, 1], fps: 8, keep: true, depth: k.FLOOR_FX + 8 });
  if (ring) {
    ring.setAlpha(0);
    c.scene.tweens.add({ targets: ring, alpha: 0.9, duration: k.slow(160) });
    fadeOut(c, k, ring, 420, 260);
  }
  k.shake(c.scene, 160, 0.0015);
  await k.wait(c.scene, k.slow(380));
  a.play('idle');
};

/**
 * Raise Dead - ceset emme (olay corpseConsumed; yalnızca ceset tüketildiyse): ölünün soluk hayaleti cesedinden yarı doğrulur, titreyerek
 * aşınır; ondan kopan kızıl ruh tutamları kavisle mezar yuvasına uçar ve toprağa siner (orada mor ışık birikir). Promise tutamların çoğu
 * yuvaya varınca çözülür. ~1 sn.
 */
const corpsedrain: V2Vfx = async (c, k) => {
  await k.sheetsReady(c.scene, [SH_WISP]);
  const a = c.actor;
  const at = c.centerPos ?? k.feet(a);
  const uid = (c.event as { uid?: unknown } | undefined)?.uid;
  const dead = typeof uid === 'string' ? c.viewOf?.(uid) : undefined;
  const to = graveSpot(c, k, c.usage?.slot) ?? k.feet(a);
  c.sfx('soulDrain');
  const pool = coldLight(c, k, at.x, at.y, 160, 46, 0x8a1f3d, 0, k.FLOOR_FX + 7);
  c.scene.tweens.add({ targets: pool, alpha: 0.6, duration: k.slow(200) });
  fadeOut(c, k, pool, 500, 500);
  // ölünün hayaleti: kendi silueti, soluk kemik-mor ve yarı saydam; yarı doğrulup aşınır
  let box = { x: at.x, y: at.y - 80, w: 70, h: 140 };
  if (dead) {
    const sp = dead.sprite;
    const sc = Math.abs(sp.scaleX * dead.container.scaleX);
    const ghost = c.scene.add.image(dead.home.x, dead.home.y, sp.texture.key, sp.frame.name).setOrigin(0.5, 1).setScale(sc, sc * 0.2).setFlipX(sp.flipX).setTintFill(0xe0d0ff).setAlpha(0).setDepth(k.DEPTH + 20);
    box = { x: dead.home.x, y: dead.home.y - dead.h * 0.5, w: dead.w * 0.5, h: dead.h * 0.8 };
    c.scene.tweens.add({ targets: ghost, alpha: 0.5, scaleY: sc * 0.92, y: ghost.y - 10, duration: k.slow(260), ease: 'Sine.easeOut' });
    c.scene.tweens.add({ targets: ghost, scaleX: sc * 1.04, duration: k.slow(70), yoyo: true, repeat: 5, delay: k.slow(200) });
    c.scene.tweens.add({ targets: ghost, alpha: 0, scaleX: sc * 0.7, y: ghost.y - 30, delay: k.slow(520), duration: k.slow(480), ease: 'Quad.easeIn', onComplete: () => ghost.destroy() });
  }
  await k.wait(c.scene, k.slow(260));
  // ruh tutamları hayaletten yuvaya
  const sink = coldLight(c, k, to.x, to.y - 4, 60, 20, 0xb36bff, 0, k.FLOOR_FX + 7);
  const offs: Array<[number, number]> = [[-0.4, -0.2], [0.35, 0.1], [0, -0.45]];
  const flights = offs.map(([ox, oy], i) =>
    wispFly(c, k, { x: box.x + ox * box.w, y: box.y + oy * box.h * 0.5 }, { x: to.x, y: to.y - 10 }, { size: 96, dur: 560, arc: 90 + i * 40, delay: i * 90 }).then(() => {
      sink.setAlpha(Math.min(0.85, sink.alpha + 0.3)).setDisplaySize(sink.displayWidth + 50, sink.displayHeight + 12);
    }),
  );
  await Promise.all(flights);
  c.sfx('earthCrack');
  fadeOut(c, k, sink, 400, 900);
  await k.wait(c.scene, k.slow(160));
};

/**
 * Skeleton doğuşu (olay summon): `c.targets[0]` yeni iskelet (görünmez başlar, burada görünür olur), `c.event.empowered` beslenmiş mi; beslenmişte
 * aura sahne tarafından efekt bitince yakılır. Mezar patlaması (07) iskeletin ayak noktasında, iskeleti SARAR; iskelet sütunun içinden
 * yükselir. Promise iskelet tam çıkıp yere oturunca çözülür (~1,6 sn beslenmiş, ~1,8 sn beslenmemiş).
 */
const summon_skeleton: V2Vfx = async (c, k) => {
  const v = c.targets[0];
  if (!v) return;
  await k.sheetsReady(c.scene, [SH_RAISE]);
  const fed = (c.event as { empowered?: boolean } | undefined)?.empowered !== false;
  const f = { x: v.home.x, y: v.home.y };
  const cellW = raiseCell(v.w);
  v.container.setAlpha(0);
  // 0) karanlık çöker (yalnızca arka plan: birimlerin altında), yer derinden titrer
  const dim = c.scene.add.rectangle(960, 540, FULL_W, 1080, 0x04070b, 0).setDepth(k.FLOOR_FX - 6);
  c.scene.tweens.add({ targets: dim, alpha: fed ? 0.38 : 0.24, duration: k.slow(360) });
  c.sfx('earthCrack');
  k.shake(c.scene, 420, fed ? 0.0018 : 0.0012);
  // 1) mezar patlaması: rün halkası -> eller ve ruh ateşi sütunu -> kemik tozu (iskeleti sarar)
  const fps = fed ? 8 : 7;
  const col = sheetAt(c, k, SH_RAISE, f.x, f.y + 4, {
    size: raiseSize(cellW),
    origin: [0.5, BASE_Y],
    fps,
    ...(fed ? {} : { tint: 0xd8d4e0, alpha: 0.88 }),
    keep: true, // son kare kalır, aşağıda kemik tozuna dağılarak söner (ani kesilme yok)
    // hayalet ekranda hep 0,45 (Ömer): sarma çağıranın alfasıyla çarpar, beslenmemişin 0,88'ini geri böl
    wrap: { unit: () => v.container.depth, ghost: fed ? GHOST : GHOST / 0.88 },
  });
  const frameMs = 1000 / fps;
  await k.wait(c.scene, k.slow(frameMs * 1.5));
  c.sfx('thud');
  c.sfx('boneClatter');
  k.shake(c.scene, 200, fed ? 0.005 : 0.0035);
  // 2) iskelet sütunun içinden sarsak hamlelerle yükselir
  c.sfx('boneRattle');
  await clawRise(c, k, v, fed ? 640 : 760, {
    fed,
    onJerk: (i) => {
      if (i > 0 && i % 2 === 0) c.sfx(i === 2 ? 'boneClatter' : 'boneRattle');
      k.shake(c.scene, 90, fed ? 0.0025 : 0.0018);
    },
  });
  // 3) yere oturur
  c.sfx('thud');
  k.shake(c.scene, 160, fed ? 0.004 : 0.0025);
  if (fed) {
    // beslenmiş: göğüste ve gözlerde soluk yeşil ruh ateşi yanar
    c.sfx('soulDrain');
    const eyes = skullEyes(v);
    const eg = coldLight(c, k, eyes.x, eyes.y, 16, 16, 0xc8f0a0, 0, v.container.depth + 5);
    c.scene.tweens.add({ targets: eg, alpha: 1, displayWidth: 70, displayHeight: 46, duration: k.slow(120), ease: 'Quad.easeOut' });
    fadeOut(c, k, eg, 160, 500, { displayWidth: 30, displayHeight: 20 });
    const chest = ribs(v);
    const cg = coldLight(c, k, chest.x, chest.y, v.w * 0.6, v.h * 0.5, 0x9fd86a, 0.45, v.container.depth + 4);
    fadeOut(c, k, cg, 60, 600);
  }
  await k.sheetDone(col);
  // 4) sütun kemik tozuna dağılır: son kare yerinde söner (taban ayak çizgisinde kalır), fildişi toz zerreleri sütundan dağılır (beklenmez)
  if (col?.active) fadeOut(c, k, col, 0, 420);
  boneDust(c, k, f, raiseSize(cellW), fed);
  fadeOut(c, k, dim, 0, 600);
};

/**
 * Raise Dead sütununun sonu: sütunun boyunca fildişi kemik tozu zerreleri belirir, yukarı-dışa süzülüp söner (~0,7 sn). `f` ayak noktası,
 * `size` sütun karesinin kenarı. Beslenmemişte daha az ve daha gri.
 */
function boneDust(c: VfxCtx, k: VfxKit, f: Pt, size: number, fed: boolean): void {
  const tex = glowTex(c, k);
  const n = reducedMotion() ? 4 : fed ? 18 : 13;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const x = f.x + (((i * 37) % 11) / 10 - 0.5) * size * 0.42;
    const y = f.y - size * (0.12 + 0.62 * ((i * 53) % 13) / 12);
    const s = 10 + ((i * 29) % 5) * 3;
    const d = c.scene.add.image(x, y, tex).setDisplaySize(s, s).setTint(fed ? 0xe6dcc4 : 0xcfcac4).setAlpha(0).setDepth(k.DEPTH + 26);
    const dx = (x - f.x) * 0.35 + (i % 2 ? 8 : -8);
    c.scene.tweens.add({ targets: d, alpha: 0.85, duration: k.slow(90), delay: k.slow(t * 160) });
    c.scene.tweens.add({ targets: d, x: x + dx, y: y - 30 - (i % 4) * 10, delay: k.slow(t * 160), duration: k.slow(620), ease: 'Sine.easeOut' });
    fadeOut(c, k, d, 220 + t * 160, 420, { displayWidth: s * 0.4, displayHeight: s * 0.4 });
  }
}

/**
 * İskelet topraktan pençeleyerek çıkar: birim zemin çizgisinin altında maskelenir (gömülü kısım görünmez), sarsak hamlelerle (çek -
 * dur - çek) yükselir, her hamlede yana yalpalar; gövdedeki koyu toprak lekesi yükseldikçe temizlenir. Beslenmemişte hamleler daha çok ve daha
 * zayıf (titrek). Promise birim tam çıkınca çözülür.
 */
function clawRise(c: VfxCtx, k: VfxKit, v: CombatantView, ms: number, o: { fed: boolean; onJerk: (i: number, p: number) => void }): Promise<void> {
  const home = v.home;
  const mask = c.scene.make.graphics({ x: 0, y: 0 }, false);
  mask.fillStyle(0xffffff).fillRect(home.x - 500, home.y - 1000, 1000, 1004);
  v.container.setMask(mask.createGeometryMask());
  v.container.setAlpha(1);
  // can çubuğu / ad yazısı topraktan önce çıkmasın: yükseliş boyunca gizli, iskelet çıkınca belirir
  const ui = v.container.list.filter((ch) => ch !== v.sprite) as unknown as Array<Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject>;
  const uiAlpha = ui.map((ch) => ch.alpha);
  ui.forEach((ch) => ch.setAlpha(0));
  const start = home.y + v.h + 20;
  v.container.setY(start);
  v.sprite.setTint(0x3a3028);
  // [zaman, ilerleme]: hareketli parçalar ve araya giren kısa duraklamalar
  const KF: Array<[number, number]> = o.fed
    ? [[0, 0], [0.14, 0.2], [0.24, 0.22], [0.4, 0.48], [0.5, 0.5], [0.66, 0.78], [0.74, 0.8], [0.9, 0.99], [1, 1]]
    : [[0, 0], [0.12, 0.14], [0.22, 0.15], [0.33, 0.33], [0.42, 0.34], [0.54, 0.55], [0.6, 0.56], [0.72, 0.74], [0.8, 0.75], [0.93, 0.99], [1, 1]];
  let lastSeg = -1;
  return k
    .counter(c.scene, k.slow(ms), (u) => {
      let i = 0;
      while (i < KF.length - 2 && u > KF[i + 1]![0]) i++;
      const [u0, p0] = KF[i]!;
      const [u1, p1] = KF[i + 1]!;
      const t = clamp01((u - u0) / Math.max(0.001, u1 - u0));
      const moving = p1 - p0 > 0.05;
      const e = moving ? 1 - (1 - t) ** 2.4 : t;
      const p = p0 + (p1 - p0) * e;
      if (i !== lastSeg) {
        lastSeg = i;
        if (moving) o.onJerk(i, p0);
      }
      const jerk = moving ? Math.sin(t * Math.PI) : 0;
      const sideSign = i % 4 === 0 ? 1 : -1;
      v.container.setY(start + (home.y - start) * p);
      v.container.setX(home.x + (o.fed ? 2 : 4) * jerk * sideSign + (moving ? k.rnd(-1, 1) : 0));
      v.container.setAngle(sideSign * (o.fed ? 3.5 : 5) * jerk * (1 - p * 0.6));
      v.sprite.setTint(mixHex(0x3a3028, 0xffffff, clamp01((p - 0.25) / 0.75) ** 1.4));
    })
    .then(() => {
      v.container.setPosition(home.x, home.y).setAngle(0);
      v.container.clearMask(true);
      v.sprite.clearTint();
      ui.forEach((ch, i) => c.scene.tweens.add({ targets: ch, alpha: uiAlpha[i] ?? 1, duration: k.slow(260) }));
    });
}

// ---------------------------------------------------------------------------------------------------------------- SKELETON

/** Paslı kılıç izi: yay boyunca kalınlaşıp incelen gri-pas bant (beyaz kenar); `dir` yön, `from/to` açı (radyan). */
const RUST = ['#d7d0bf', '#a8a294', '#8c5a2b', '#6b4423'];

/** Paslı kılıç izi: yay boyunca kalınlaşıp incelen gri-pas bant (beyaz kenar); `dir` yön, `from/to` açı (radyan). */
function rustArc(c: VfxCtx, k: VfxKit, x: number, y: number, o: { r: number; from: number; to: number; dir: number; dur: number; flat?: number; width?: number; xs?: number }): Promise<void> {
  const g = c.scene.add.graphics().setDepth(k.DEPTH + 40);
  const width = o.width ?? 26;
  const N = 36;
  // hilal bant: dış kenar (kılıç ucu) parlak beyaz, gövde açık gri, iç kenar pas-kahve; kuyruk sönerek incelir
  return k
    .counter(c.scene, k.slow(o.dur), (u) => {
      g.clear();
      const head = Math.min(1, u * 1.3);
      const tail = Math.max(0, u * 1.3 - 0.55);
      const steps = Math.ceil((head - tail) * N * 2);
      for (let i = 0; i <= steps; i++) {
        const kk = tail + ((head - tail) * i) / Math.max(1, steps);
        const age = (head - kk) / 0.55;
        const ang = o.from + (o.to - o.from) * kk;
        const ox = Math.cos(ang);
        const oy = Math.sin(ang) * (o.flat ?? 1);
        const w = width * Math.max(0.15, 1 - age) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, kk)));
        for (let j = 0; j < w; j += 3) {
          const rr = o.r - j;
          const px = k.snap(x + o.dir * ox * rr * (o.xs ?? 1));
          const py = k.snap(y + oy * rr);
          const col = j < 4 ? 0xffffff : j < w * 0.55 ? 0xd7d0bf : j < w * 0.8 ? 0xa8a294 : 0x8c5a2b;
          g.fillStyle(col, Math.max(0.25, 1 - age * 0.7)).fillRect(px - 2, py - 2, 5, 5);
        }
      }
      if (u >= 1) g.clear();
    })
    .then(() => g.destroy());
}

/** Paslı demir darbesi: pas pulları, toz, hedef geri savrulur. */
function rustHit(c: VfxCtx, k: VfxKit, t: CombatantView, dir: number, size = 1): void {
  const p = k.spot(t);
  k.hit(c.scene, p.x, p.y, ['#fdfaf2', '#d7d0bf', '#a8a294'], 1.1 * size);
  for (let i = 0; i < 5; i++) {
    const r = k.v2Sprite(c, 'rustflake', '#8c5a2b', p.x, p.y, k.rnd(16, 26), k.DEPTH + 50).setRotation(k.rnd(0, 6));
    c.scene.tweens.add({ targets: r, x: p.x + dir * k.rnd(20, 120), y: p.y + k.rnd(-60, 80), rotation: r.rotation + k.rnd(-5, 5), alpha: 0, duration: k.slow(k.rnd(420, 700)), ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }
  k.burst(c.scene, p.x, p.y, { colors: RUST, n: 8, speed: [100, 320], angle: dir > 0 ? [-1.2, 0.6] : [Math.PI - 0.6, Math.PI + 1.2], gravity: 700, life: [300, 560], size: [6, 10] });
  c.scene.tweens.add({ targets: t.container, x: t.container.x + dir * 14 * size, duration: k.slow(55), yoyo: true });
}

/** İskelet hedefin yanına (takırdayarak) koşar; duruş noktası ve yön. */
async function skeletonRun(c: VfxCtx, _k: VfxKit, t: CombatantView): Promise<{ x: number; y: number; dir: number }> {
  const a = c.actor;
  const dir = t.container.x >= a.container.x ? 1 : -1;
  const stand = { x: t.container.x - dir * (t.w * 0.5 + a.w * 0.5 + 6), y: t.container.y, dir };
  c.sfx('boneRattle');
  await a.approach(stand.x, stand.y, 170);
  return stand;
}

/**
 * Skeleton - Bone Strike (tek hedef, yakın): iskelet takırdayarak hedefe koşar, paslı kılıcını başının üstüne kaldırıp (kemik eklemleri
 * gıcırdar) yukarıdan çapraz indirir; gri-pas kılıç izi, pas pulları ve toz saçılır, hedef sarsılır. Vampiric Bite: Skeleton'ın verdiği
 * hasardan Undead can çaldıysa hedeften Undead'e ruh akar.
 */
const bonestrike: V2Vfx = async (c, k) => {
  const t = c.targets[0];
  if (!t) return;
  const a = c.actor;
  const stand = await skeletonRun(c, k, t);
  a.play('attack');
  // kaldır
  await new Promise<void>((r) => c.scene.tweens.add({ targets: a.container, x: stand.x - stand.dir * 16, scaleY: 1.04, duration: k.slow(90), ease: 'Quad.easeOut', onComplete: () => r() }));
  c.sfx('rustySlash');
  c.scene.tweens.add({ targets: a.container, x: stand.x + stand.dir * 24, scaleY: 1, duration: k.slow(70), yoyo: true, hold: k.slow(60) });
  const p = k.spot(t);
  void rustArc(c, k, p.x - stand.dir * 70, p.y - 10, { r: 100, from: -1.25, to: 1.05, dir: stand.dir, dur: 170, width: 30 });
  await k.wait(c.scene, k.slow(70));
  rustHit(c, k, t, stand.dir, 1);
  k.shake(c.scene, 90, 0.003);
  void k.wait(c.scene, k.slow(220)).then(() => a.returnHome());
  vampiricEcho(c, k, [t]);
};

/**
 * Skeleton - Bone Slash (hedef + iki yanındaki şerit; cooldown 3): iskelet koşar, kılıcı geriye çeker (eklemler çatırdar), hedeflerin dikey
 * sırası boyunca kemik tozundan, kenarı mor ışıklı çentikli bir kesik iner (09: yukarı-arkadan aşağı-öne süpürür, sonra kemik tozuna dağılır).
 * Ana hedef hemen kesilir; yan şeritlerdeki hedefler (ikinci vuruş, kendi hasar rakamlarından hemen önce) dikey aynalı dönüş kesiğiyle kesilir
 * (VfxCtx.gate). Hedef sarsılır.
 */
const boneslash: V2Vfx = async (c, k) => {
  const t = c.targets[0];
  if (!t) return;
  await k.sheetsReady(c.scene, [SH_SLASH, SH_WISP]);
  const a = c.actor;
  const sides = c.targets.slice(1);
  const stand = await skeletonRun(c, k, t);
  const dir = stand.dir;
  a.play('attack');
  c.sfx('boneSlashCrack');
  await new Promise<void>((r) => c.scene.tweens.add({ targets: a.container, x: stand.x - dir * 26, angle: -dir * 4, duration: k.slow(100), ease: 'Quad.easeOut', onComplete: () => r() }));
  c.sfx('boneSlashWhoosh');
  c.scene.tweens.add({ targets: a.container, x: stand.x + dir * 30, angle: dir * 3, duration: k.slow(80), yoyo: true, hold: k.slow(40), onComplete: () => a.container.setAngle(0) });
  const spots = c.targets.map((u) => k.spot(u));
  const pad = sides.length ? 40 : 30;
  const yTop = Math.min(...spots.map((q) => q.y - t.h * 0.45)) - pad;
  const yBot = Math.max(...spots.map((q) => q.y + t.h * 0.35)) + pad;
  const cx = spots.reduce((s, q) => s + q.x, 0) / spots.length + dir * 22;
  const cy = (yTop + yBot) / 2;
  // kesiğin içeriği karenin ~%90'ı; Codex Tur 2-3: tam açıklık (302 px) hedefi ve atanı fazla örtüyordu -> ~%63 (tek hedefte 190 px)
  const size = Math.max(190, ((yBot - yTop) / 0.9) * 0.63);
  const slash = (flipY: boolean): void => {
    // vuruşta alfa 0,8, ardından (s3 sonrası, dağılma) 0,55: hedef efektin altında okunur kalır
    const s = sheetAt(c, k, SH_SLASH, cx, cy, { size, origin: [0.5, 0.5], flip: dir < 0, fps: 18, depth: k.DEPTH + 40, alpha: 0.8 });
    s?.setFlipY(flipY);
    if (s) c.scene.tweens.add({ targets: s, alpha: 0.55, delay: k.slow(200), duration: k.slow(120) });
  };
  slash(false);
  const knock = (u: CombatantView, s = 1): void => {
    c.scene.tweens.add({ targets: u.container, x: u.container.x + dir * 14 * s, duration: k.slow(55), yoyo: true });
    const p = k.spot(u);
    glowAt(c, k, p.x, p.y, 110 * s, 220, k.DEPTH + 42, 0xd9c8ff);
  };
  await k.wait(c.scene, k.slow(sides.length ? 60 : 85));
  c.sfx('boneSlashHit');
  knock(t, 1.15);
  k.shake(c.scene, 110, 0.0035);
  const finish = () => {
    void k.wait(c.scene, k.slow(160)).then(() => a.returnHome());
    vampiricEcho(c, k, c.targets);
  };
  if (!sides.length) {
    finish();
    return;
  }
  c.gate(
    1,
    async () => {
      c.sfx('boneSlashHit');
      a.play('attack');
      c.scene.tweens.add({ targets: a.container, x: stand.x + dir * 22, duration: k.slow(60), yoyo: true });
      slash(true);
      await k.wait(c.scene, k.slow(50));
      for (const s of sides) knock(s, 1);
      k.shake(c.scene, 110, 0.0035);
      finish();
    },
    () => finish(),
  );
};

export const VFX: Record<string, V2Vfx> = {
  bonethrow,
  wail,
  darkbond,
  raise,
  // olay efektleri (docs/design/art-v2.md > 3.1): Raise Dead ceset emme ve Skeleton doğuşu
  corpsedrain,
  summon_skeleton,
  bonestrike,
  boneslash,
};
