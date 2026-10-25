import { textRes } from './stage-view';
import Phaser from 'phaser';
import { reducedMotion } from '../ui/motion-pref';
import { paintedOr } from '../ui/misc-icons';
import layout from '../../data/battle-layout.json';
import { content, type Combatant, type TargetPreview } from '../engine';
import { animKey, characterTexture, type AnimName } from './assets';
import { MobPosePlayer, mobPoseIdleAnim, mobPoseKey, setupMobPose, type MobPoseDef } from './mob-poses';
import { debugState } from './debug-state';
import { formatHit, hitColor } from './hit-format';
import { type DamageTags, FLOAT_ICON_TINT, damagePaintedIcon, floatStyle, floatTimes, placeFloatClear, rowLayout, type FloatKind } from './float-text';
import { ensureIcon } from './icons';
import { SHARED_KEY } from './asset-versions';
import { tierStyle, unitName } from './unit-label';
import { DISPLAY_FONT } from '../ui/menu-style';
import { ensureGlow } from './menu-ui';
import { SpriteGlow, bakeGlow } from './sprite-glow';
import { perfLite } from '../ui/perf-mode';
import { cycleFrames, gripFrames, itemPlacement, keyFrame, placementPoint, poseClass, poseSkill, resolvePose, skillPoses, statePose, POSES, type Grip, type PoseClassDef, type WeaponPick } from './poses';
import { bakePoseTexture, ensurePoseSources, poseDisplayScale } from './pose-rig';
import { HIT_REACTION, hitReaction, type HitReaction } from './hit-reaction';
import { POSE_TIMING, viewMotion, endDelay, holdEndDelay, idleRequestDelay, isHoldSkill, throwHoldDelay, type PoseHold } from './pose-timing';

/**
 * Poz kütüphanesi bağlantısı (src/game/poses.ts): pozlu sınıfta gövde + silah pişmiş atlası, şu anki poz ve skill bağlamı.
 * Yoksa (pozsuz sınıf / dosya yüklenmedi) görünüm bugünkü tek sprite davranışındadır.
 */
interface PoseRig {
  def: PoseClassDef;
  key: string;
  /** Sprite ölçeği (pişmiş doku pikseli -> oyun birimi). */
  scale: number;
  /** Ekran ölçeği (gövde tuvali pikseli -> oyun birimi). */
  display: number;
  weapon: WeaponPick | null;
  /** Şu anki poz adı (null = bugünkü idle sprite'ı: idleSprite açık sınıfta). */
  pose: string | null;
  /** Her poz değişiminde artar: bekleyen "idle'a dön" çağrıları eskidiyse atlanır. */
  token: number;
  /** Oynanan skill'in poz dizisi (BattleScene.useSkill). */
  skill: string[];
  /** Oynanan skill'in hareketi (melee / ranged / cast / sky ...): v2'de büyü / atış pozu skill bitene dek tutulur. */
  motion?: string;
  /** Şu anki pozun gösterildiği an (sahne zamanı): melee pozunun en kısa tutuluşu. */
  shownAt: number;
  /** Oynanan skill'in son poz isteğinin anı (skill başı, attack / cast isteği; sahne zamanı): büyü / atış pozunun en kısa tutuluşu. */
  lastReqAt: number;
  /** Oynanan skill'in id'si (kanallı skill: src/game/pose-timing.ts > holdSkills). */
  skillId?: string;
  /** v2: bu ana dek (sahne zamanı) idle isteği ertelenir (skill bittikten sonra pozun dönüş anı). */
  holdUntil: number;
  /** Biten skill'in poz dizisi ve bittiği an: vuruş anında dönen efekt (playUntilHit) sonradan 'attack' isterse skill'in pozu (Saltire Cut). */
  lastSkill?: string[];
  endedAt?: number;
  /**
   * v2: kanallı skill (pose-timing > holdSkills: ok şerit boyunca uçan Piercing Arrow) bitti ama efekti (playUntilHit) hâlâ sürüyor: poz
   * efekt bitene dek tutulur (`fxEnd` idle'a döndürür; 2026-10-13 denetim: "Piercing Arrow idle'da kaldı"). Kanallı olmayan skill'de efektin
   * kuyruğu (duman, sönen ışık) beklenmez: el vuruştan kısa süre sonra iner (Ömer 2026-10-13: "eli 1-2 sn havada kalıyor").
   */
  awaitFx?: boolean;
}
/** v2 poz takımı (tutuş takımlı sınıf: gerçek sınıflar ve Pose Tester'lar): skill pozu tutma ve efekt çıkış noktası yalnızca burada (debug v1 çiziminde Warrior v1 aynen). */
const isV2 = (def: PoseClassDef): boolean => !!def.grips;
/** Poz dönüş zamanları (data/battle-layout.json > animation.pose; saf hesap src/game/pose-timing.ts). */
const PT = POSE_TIMING;

/** floatText seçenekleri: tür (tipografi) ve rakamın solundaki/sağındaki küçük ikon (piksel ikon adı). */
export interface FloatOpts {
  kind?: FloatKind;
  leftIcon?: string;
  rightIcon?: string;
}

export const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const { spriteBox: box, hpBar, animation: timing, colors } = layout;

/** Skill animasyonları bu kat yavaş (Ömer: %20). */
export const SLOW = timing.skillSlowdown;
export const slow = (ms: number) => ms * SLOW;

/** Hasar / maks can oranından 0-1 arası vuruş şiddeti: ne kadar büyük vuruşsa efektler o kadar belirgin. */
export const hitLevel = (ratio: number) => Math.min(1, Math.max(0, ratio / timing.hitMaxRatio));
/** Hasar RAKAMI boyutu/rengi için seviye: kendi (daha düşük) barem değeri, can oranına göre. */
export const damageNumberLevel = (ratio: number) => Math.min(1, Math.max(0, ratio / timing.damageNumberMaxRatio));

export const textStyle = (px: number, fill: string = colors.text): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: layout.fontFamily,
  fontSize: `${px}px`,
  fontStyle: 'bold',
  color: fill,
  stroke: colors.textStroke,
  strokeThickness: Math.max(3, Math.round(px / 6)),
});

/** Tasarım kiti (dünya katmanı, Ömer 2026-10-09): ince altın çizgi, kor vurgu, düz rakamlı serif. */
const KIT = { gold: 0xd9b26a, on: 0xf3d999, ember: 0xe0702a, ember2: 0xffb35a, ink: 0x0c0806, back: 0x140d08 } as const;
/** Hedef parıltısı: yardımcı = yumuşak yeşil, zararlı = kor kırmızısı (eski saf yeşil / kırmızı yerine). */
const GLOW = { good: 0x6fe0a2, bad: 0xff5a32 } as const;
/** Rozet / önizleme rakamları: düz rakamlı serif, koyu kenar + yumuşak gölge. */
const NUM_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
export const numStyle = (px: number, fill: string = colors.text): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: NUM_FONT,
  fontSize: `${px}px`,
  fontStyle: 'bold',
  color: fill,
  stroke: '#140c06',
  strokeThickness: Math.max(3, Math.round(px / 6)),
  shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.8)', blur: 4, stroke: true, fill: true },
});

/** Şiddete göre hasar rengi: sarı -> turuncu -> kırmızı. */
const damageColor = (level: number) => (level < 0.34 ? colors.damage : level < 0.67 ? colors.damageMid : colors.damageHigh);

/** Zırh değerinden 0-1 belirginlik: zırh arttıkça ikon büyür ve daha opak olur. */
export const armorProminence = (armor: number) => Math.min(1, Math.max(0, armor / layout.armorIcon.maxArmor));

/** Sahnedeki tek bir karakter: sprite (veya placeholder), isim, can / MP çubuğu, kalkan çubukları, zırh ve durum ikonları. */
export class CombatantView {
  readonly container: Phaser.GameObjects.Container;
  /** Ölüm animasyonu bitti: birim sahnede görünmez (diriltme hedefi olarak hayalet gösterilebilir). */
  private fallen = false;
  private baseY: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  /** Ekranda kaplanan boyut (sprite, spriteBox içine oranı korunarak sığdırılır). */
  readonly w: number;
  readonly h: number;
  /** Zırh ikonları (fiziksel, büyü): sınıf zırhı yoksa yok. Boyut ve opaklık zırhla artar. */
  private readonly hpBox: Phaser.GameObjects.Container;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpGhost: Phaser.GameObjects.Rectangle;
  private readonly mpFill: Phaser.GameObjects.Rectangle;
  /** SPEED (sıra sayacı) çubuğu: mana çubuğunun altında, yalnızca turns modunda görünür. */
  private readonly speedBox: Phaser.GameObjects.Container;
  private readonly speedFill: Phaser.GameObjects.Rectangle;
  private readonly speedGlow: Phaser.GameObjects.Rectangle;
  private speedFull = false;
  /** SPEED çubuğu havası (Haste / Slow; Ömer 2026-10-10): dolgu rengi + Haste'te akan küçük » işaretleri. */
  private speedMood: 'haste' | 'slow' | null = null;
  private chevrons: Phaser.GameObjects.Text[] = [];
  private chevronTween: Phaser.Tweens.Tween | null = null;
  private readonly chevronPhase = { v: 0 };
  private readonly shieldFill: Phaser.GameObjects.Rectangle;
  private readonly magicShieldFill: Phaser.GameObjects.Rectangle;
  private readonly statusBox: Phaser.GameObjects.Container;
  private readonly sealBox: Phaser.GameObjects.Container;
  private glowFx?: SpriteGlow;
  private glowKey = '';
  /** Sırası gelen birim: adın üstünde küçük kor elmas (eski sarı ok yerine). */
  private readonly marker: Phaser.GameObjects.Graphics;
  /** Sırası gelen birimin ayaklarının altında kor / altın halka (yavaşça nabız atar). */
  private readonly footRing: Phaser.GameObjects.Graphics;
  /** Ctrl+tık seçimi: birimin çevresinde ince çerçeve. */
  private readonly selFrame: Phaser.GameObjects.Graphics;
  private readonly realSprite: boolean;
  private homeX: number;
  private readonly hpY: number;
  /** Ad yazısı (rozet yerleşimi engel olarak okur: badgeGeometry). */
  private nameText!: Phaser.GameObjects.Text;
  private readonly shieldY: number;
  private previewItems: Phaser.GameObjects.GameObject[] = [];
  /** Ad, can / MP / hız çubukları, durum ikonları, işaretler: sonuç ekranında birlikte söner (`setOverlayHidden`). */
  private overlayParts: Array<Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha> = [];
  private overlayAlpha: number[] | null = null;
  /** Yaşayan yüzen yazılar (çakışmasız yığınlama, float-text.ts > placeFloatClear): doğuş ofseti, punto, doğuş anı (gerçek ms). */
  private floats: Array<{ offset: number; px: number; born: number }> = [];

  /** Poz kütüphanesi (pozlu sınıf ve dosyaları yüklüyse); yoksa null = bugünkü davranış. */
  private rig: PoseRig | null = null;
  /** Bugünkü (idle.png) doku ve ölçeği: idleSprite açık pozlu sınıfta boşta buna döner. */
  private baseTex = '';
  private baseScale = 1;
  /** Mob / boss poz sayfası (data/mob-poses.json + assets/sprites/<id>/poses.png); yoksa null = tek görsel. */
  private mobPose: MobPoseDef | null = null;
  /** Poz sayfalı birimin kare durum makinesi (skill / darbe / boşta dönüşleri; src/game/mob-poses.ts > MobPosePlayer). */
  private mobPlayer: MobPosePlayer | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly combatant: Combatant,
    x: number,
    y: number,
    opts: { weapon?: WeaponPick | null; level?: number } = {},
  ) {
    this.homeX = x;
    this.baseY = y;
    const tex = characterTexture(scene, combatant.spriteId, combatant.color);
    this.realSprite = tex.real;

    this.sprite = scene.add.sprite(0, 0, tex.key).setOrigin(0.5, 1);
    // Çok kareli sheet'te ilk kare; tek resimde tüm resim
    if (tex.real && scene.textures.get(tex.key).has('0')) this.sprite.setFrame(0);
    const scale = Math.min(box.width / this.sprite.frame.width, box.height / this.sprite.frame.height) * (combatant.spriteScale ?? 1);
    this.sprite.setScale(scale);
    this.baseTex = tex.key;
    this.baseScale = scale;
    // Poz kütüphanesi: pozlu sınıfta gövde + silah pişmiş atlası (dosyalar yüklü değilse bugünkü sprite kalır)
    const def = tex.real ? poseClass(combatant.defId) : null;
    const baked = def ? bakePoseTexture(scene, combatant.defId, opts.weapon ?? { ...def.defaultWeapon }, combatant.spriteScale ?? 1) : null;
    if (def && baked) {
      const display = poseDisplayScale(def, combatant.spriteScale ?? 1);
      this.rig = { def, key: baked.key, scale: display / baked.density, display, weapon: opts.weapon ?? { ...def.defaultWeapon }, pose: null, token: 0, skill: [], shownAt: 0, lastReqAt: 0, holdUntil: 0 };
      this.w = def.figure.w * display;
      this.h = def.figure.h * display;
    } else {
      this.w = this.sprite.frame.width * scale;
      this.h = this.sprite.frame.height * scale;
      // Küçültülen illüstrasyon yumuşak, büyütülen pixel art/placeholder keskin görünür
      scene.textures
        .get(tex.key)
        .setFilter(scale < 1 ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
    }
    // Poz sayfalı mob / boss: gövde poz karelerinden çizilir (kutu ve ölçek idle.png'den; sayfa density katı çözünürlükte)
    if (!this.rig && tex.real) {
      this.mobPose = setupMobPose(scene, combatant.spriteId);
      if (this.mobPose) {
        this.sprite.setTexture(mobPoseKey(combatant.spriteId), this.mobPose.idle[0] ?? 0);
        this.baseScale = scale / this.mobPose.density;
        this.sprite.setScale(this.baseScale);
        scene.textures.get(mobPoseKey(combatant.spriteId)).setFilter(this.baseScale < 1 ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
        const idleKey = mobPoseIdleAnim(combatant.spriteId);
        this.mobPlayer = new MobPosePlayer(
          this.mobPose,
          {
            // stop() sonrası currentAnim hâlâ boşta döngüsünü gösterir: oynamıyorsa yeniden başlat
            loop: () => {
              if (this.scene.anims.exists(idleKey) && !(this.sprite.anims.isPlaying && this.sprite.anims.currentAnim?.key === idleKey)) this.sprite.play(idleKey);
            },
            frame: (n) => {
              this.sprite.stop();
              this.sprite.setFrame(n);
            },
            alive: () => this.alive && !this.fallen && !!this.sprite.scene,
            now: () => this.scene.time.now,
            after: (ms, fn) => void this.scene.time.delayedCall(ms, fn),
          },
          { hitMs: slow(timing.hitFlashMs) * 3 + slow(PT.hitHoldMs), lateMs: slow(PT.lateHoldMs), endMs: slow(320), dyingMs: slow(380) },
        );
      }
    }
    if (combatant.side === 'enemy') this.sprite.setFlipX(true);

    // Gerçek sprite'ların altına yer gölgesi (placeholder dokusunda zaten var)
    const shadow = tex.real ? scene.add.ellipse(0, -6, this.w * 0.8, 24, 0x000000, 0.35) : undefined;

    this.hpY = -this.h - hpBar.offsetY;
    const mpY = this.hpY + hpBar.height / 2 + hpBar.mpHeight / 2 + 3;
    this.shieldY = this.hpY - hpBar.height / 2 - 5;
    // Tasarım kiti: koyu zemin + ince altın çizgi; dışında yumuşak koyu kenar (parlak arenada çubuk seçilsin)
    const hpOuter = scene.add.rectangle(0, this.hpY, hpBar.width + 6, hpBar.height + 6, 0x050302, 0.55);
    const hpBack = scene.add.rectangle(0, this.hpY, hpBar.width, hpBar.height, KIT.back, 0.92).setStrokeStyle(1, KIT.gold, 0.6);
    // Hayalet çubuk: can düşünce bir süre eski seviyede kalıp yavaşça iner (büyük vuruşta daha uzun ve belirgin)
    this.hpGhost = scene.add.rectangle(-hpBar.width / 2, this.hpY, hpBar.width, hpBar.height, color('#ffd6a0')).setOrigin(0, 0.5);
    this.hpFill = scene.add
      .rectangle(-hpBar.width / 2, this.hpY, hpBar.width, hpBar.height, color(combatant.side === 'party' ? colors.hpFill : colors.hpFillEnemy))
      .setOrigin(0, 0.5);
    this.hpBox = scene.add.container(0, 0, [hpOuter, hpBack, this.hpGhost, this.hpFill]);
    const mpBack = scene.add
      .rectangle(0, mpY, hpBar.width, hpBar.mpHeight, KIT.back, 0.92)
      .setStrokeStyle(1, KIT.gold, 0.4)
      .setVisible(combatant.maxMp > 0);
    this.mpFill = scene.add
      .rectangle(-hpBar.width / 2, mpY, hpBar.width, hpBar.mpHeight, color(colors.mpFill))
      .setOrigin(0, 0.5)
      .setVisible(combatant.maxMp > 0);
    // SPEED çubuğu: mana çubuğunun altında ince bir şerit; sayaç dolunca (sıra bu karakterde) parlar
    const spdY = mpY + hpBar.mpHeight / 2 + hpBar.speedHeight / 2 + 3;
    const speedBack = scene.add.rectangle(0, spdY, hpBar.width, hpBar.speedHeight, KIT.back, 0.9).setStrokeStyle(1, KIT.gold, 0.32);
    this.speedFill = scene.add.rectangle(-hpBar.width / 2, spdY, 0, hpBar.speedHeight, color(colors.speedFill)).setOrigin(0, 0.5);
    this.speedGlow = scene.add.rectangle(0, spdY, hpBar.width + 6, hpBar.speedHeight + 6, 0xffffff, 0).setStrokeStyle(1.5, KIT.ember2).setVisible(false);
    this.speedBox = scene.add.container(0, 0, [speedBack, this.speedFill, this.speedGlow]).setVisible(false);
    // Kalkan çubukları: can çubuğunun hemen üstünde ince çizgiler (genel: açık mavi, büyü: mor)
    this.shieldFill = scene.add.rectangle(-hpBar.width / 2, this.shieldY, 0, 6, color(colors.shield)).setOrigin(0, 0.5);
    this.magicShieldFill = scene.add.rectangle(-hpBar.width / 2, this.shieldY - 7, 0, 6, color(colors.magicShield)).setOrigin(0, 0.5);
    // Ad plakası: sefer özel adı ('Bandit Chief') ya da class adı; elit altın, boss kızıl yazı + üstünde küçük rütbe rozeti
    const tier = tierStyle(combatant.tier);
    const isBoss = tier?.tier === 'boss';
    // Tasarım kiti: Cinzel 600 (kitin başlık yazısı), koyu kenar + yumuşak gölge (parlak arenada okunur)
    const nameStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: DISPLAY_FONT,
      fontSize: `${isBoss ? 32 : 26}px`,
      fontStyle: '600',
      color: tier?.hex ?? '#f4ead2',
      stroke: '#120a05',
      strokeThickness: 4,
      letterSpacing: 0.5,
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.85)', blur: 5, stroke: true, fill: true },
    };
    if (isBoss) {
      // Boss: kalın koyu kenar + ince kor/altın parıltı (BOSS rozetiyle uyumlu); tek ve büyük olduğu için geniş alan
      nameStyle.stroke = '#12060a';
      nameStyle.strokeThickness = 7;
      nameStyle.shadow = { offsetX: 0, offsetY: 0, color: '#f0a43a', blur: 10, stroke: true, fill: true };
    }
    const name = scene.add.text(0, this.hpY - hpBar.height - 4, unitName(combatant), nameStyle).setOrigin(0.5, 1);
    this.nameText = name;
    if (isBoss) {
      // Çok uzunsa iki satıra böl (orta boşluktan), hâlâ taşıyorsa ORANI KORUYARAK küçült
      const maxBossW = hpBar.width * 2.2;
      const full = unitName(combatant);
      if (name.width > maxBossW && full.includes(' ')) {
        const mid = full.length / 2;
        let cut = -1;
        for (let i = 0; i < full.length; i++) if (full[i] === ' ' && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
        name.setText(`${full.slice(0, cut)}\n${full.slice(cut + 1)}`).setAlign('center');
      }
      if (name.width > maxBossW) name.setScale(maxBossW / name.width);
    } else if (tier) {
      // Elit: oranı bozan sıkıştırma yok, orantılı küçült
      const maxNameW = hpBar.width * 2;
      if (name.width > maxNameW) name.setScale(maxNameW / name.width);
    } else {
      const maxNameW = hpBar.width * 1.7; // uzun özel adlar ('Bandit Chief') komşu hücrenin adına taşmasın
      if (name.width > maxNameW) name.setScale(maxNameW / name.width);
    }
    const tierBadge: Phaser.GameObjects.GameObject[] = [];
    // Level (levels.md; sefer / Endless): rütbeli birimde rozetin içinde ("ELITE · LV 7"), rütbesizde adın üstünde küçük soluk "Lv 7"
    // Kahramanlarda Lv şimdilik gizli (Ömer 2026-10-17; data/battle-layout.json > hpBar.showHeroLevel)
    const showLv = combatant.side !== 'party' || (hpBar as { showHeroLevel?: boolean }).showHeroLevel === true;
    const lv = showLv && opts.level && opts.level > 0 ? Math.floor(opts.level) : 0;
    if (tier) {
      // Rütbe rozeti (kit etiketi): koyu zemin + rütbe renginde ince çerçeve ve Cinzel yazı
      const text = lv ? `${tier.label.toUpperCase()} · LV ${lv}` : tier.label.toUpperCase();
      const label = scene.add.text(0, name.y - name.height * name.scaleY - 2, text, { fontFamily: DISPLAY_FONT, fontSize: '14px', fontStyle: '600', color: tier.hex, letterSpacing: 2 }).setOrigin(0.5, 1);
      const bg = scene.add.rectangle(0, label.y - label.height / 2, label.width + 16, label.height + 2, KIT.ink, 0.92).setStrokeStyle(1, color(tier.hex), 0.9);
      tierBadge.push(bg, label);
    } else if (lv) {
      const label = scene.add
        .text(0, name.y - name.height * name.scaleY + 2, `Lv ${lv}`, { fontFamily: DISPLAY_FONT, fontSize: '16px', fontStyle: '600', color: '#d8c79e', stroke: '#120a05', strokeThickness: 3, letterSpacing: 1 })
        .setOrigin(0.5, 1);
      tierBadge.push(label);
    }
    // Sırası gelen birim: adın üstünde kor elmas (eski sarı ok) + ayaklarının altında kor / altın halka
    const my = this.hpY - hpBar.height - 62 + 14;
    this.marker = scene.add.graphics().setVisible(false);
    const dpts = (r: number) => [new Phaser.Math.Vector2(0, my - r), new Phaser.Math.Vector2(r, my), new Phaser.Math.Vector2(0, my + r), new Phaser.Math.Vector2(-r, my)];
    this.marker.fillStyle(KIT.ember, 0.25).fillPoints(dpts(17), true);
    this.marker.fillStyle(KIT.ember, 1).fillPoints(dpts(11), true);
    this.marker.lineStyle(1.5, KIT.ember2, 1).strokePoints(dpts(11), true);
    this.marker.lineStyle(2, 0x1a0c04, 0.8).strokePoints(dpts(13), true);
    this.footRing = scene.add.graphics().setVisible(false);
    const rw = Math.max(110, this.w * 0.95);
    this.footRing.lineStyle(10, KIT.ember, 0.14).strokeEllipse(0, -6, rw + 8, 32);
    this.footRing.lineStyle(2, KIT.ember2, 0.9).strokeEllipse(0, -6, rw, 26);
    this.footRing.lineStyle(1, KIT.on, 0.55).strokeEllipse(0, -6, rw - 16, 19);

    // Ctrl+tık seçimi (debug birim araçları): ayakların altında ince açık mavi halka + üstte küçük köşe çizgileri (eski kutu yerine)
    this.selFrame = scene.add.graphics().setVisible(false);
    this.selFrame.lineStyle(2, 0x8ec9ff, 0.95).strokeEllipse(0, -6, rw + 22, 34);
    const bw = this.w / 2 + 10;
    const top = -this.h - 8;
    this.selFrame.lineStyle(2, 0x8ec9ff, 0.85);
    for (const sx of [-1, 1]) this.selFrame.beginPath().moveTo(sx * bw, top + 18).lineTo(sx * bw, top).lineTo(sx * (bw - 18), top).strokePath();

    // Durum ikonları (taunt, guard, regen) can çubuğunun solunda
    this.statusBox = scene.add.container(0, this.hpY);
    // Yığılan durum (Omen) mühür yuvaları: can çubuğunun SOL ucunun hemen üstünde
    this.sealBox = scene.add.container(-hpBar.width / 2, this.hpY - hpBar.height / 2 - 9);

    this.container = scene.add.container(x, y, [
      ...(shadow ? [shadow] : []),
      this.footRing,
      this.sprite,
      this.hpBox,
      mpBack,
      this.mpFill,
      this.speedBox,
      this.shieldFill,
      this.magicShieldFill,
      this.statusBox,
      this.sealBox,
      name,
      ...tierBadge,
      this.marker,
      this.selFrame,
    ]);
    this.container.setDepth(y); // öndeki sıra arkadakinin üstünde çizilir
    this.overlayParts = [this.hpBox, mpBack, this.mpFill, this.speedBox, this.shieldFill, this.magicShieldFill, this.statusBox, this.sealBox, name, ...tierBadge, this.marker, this.footRing, this.selFrame] as Array<Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha>;
    this.setHp(combatant.hp, false);
    this.setMp(combatant.mp, false);
    this.setShield(combatant.shield, combatant.magicShield, false);
    this.play('idle');
    if (combatant.empowered) this.setEmpowered(true); // beslenmiş çağrı (Raise Dead): kalıcı hafif mor aura
  }

  get alive(): boolean {
    return this.combatant.hp > 0;
  }

  /** Sonuç ekranı: ad plakası ve çubuklar yumuşakça söner (sprite kalır); false = eski hâline döner. */
  setOverlayHidden(hidden: boolean): void {
    const parts = this.overlayParts.filter((o) => o.active);
    this.scene.tweens.killTweensOf(parts);
    if (hidden) {
      if (!this.overlayAlpha) this.overlayAlpha = this.overlayParts.map((o) => o.alpha);
      this.scene.tweens.add({ targets: parts, alpha: 0, duration: 260 });
    } else if (this.overlayAlpha) {
      this.overlayParts.forEach((o, i) => o.active && o.setAlpha(this.overlayAlpha![i] ?? 1));
      this.overlayAlpha = null;
    }
  }

  /**
   * Targeting glow around the drawing itself (its outline, not a box): green = helpful effect, red = harmful one.
   * `strong` marks the unit(s) the effect will actually hit; weak marks units that can be chosen.
   */
  setGlow(kind: 'good' | 'bad' | null, strong = false): void {
    const key = kind ? `${kind}:${strong}` : '';
    if (key === this.glowKey) return;
    if (this.fallen) this.container.setAlpha(kind && strong ? 0.8 : 0); // düşmüş birim: yalnızca üstüne gelinen diriltme hedefi hayalet olur (yuvada ceset işareti durur; madde 222)
    this.glowKey = key;
    this.glowFx?.destroy();
    this.glowFx = undefined;
    if (!kind) return;
    const hex = kind === 'good' ? GLOW.good : GLOW.bad;
    // Weak: a thin, quiet rim. Strong: the pulsing glow around the unit that will be hit.
    // Önceden pişirilmiş hale dokusu (src/game/sprite-glow.ts): postFX Glow her karede tuval boyunda geçiş istiyordu (zayıf telefonda kare düşüşü)
    const fx = new SpriteGlow(this.scene, this.sprite, this.container, hex, strong ? 'wide' : 'thin');
    this.glowFx = fx;
    const [lo, hi] = strong ? [0.55, 1] : [0.6, 0.9];
    fx.img.setAlpha(perfLite() ? hi : lo);
    if (!perfLite()) this.scene.tweens.add({ targets: fx.img, alpha: hi, duration: strong ? 480 : 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Hedefleme parıltısı dokularını önceden pişirir (ilk skill seçiminde / üstüne gelişte takılma olmasın). */
  prewarmGlow(): void {
    if (!this.sprite.active) return;
    bakeGlow(this.scene, this.sprite, 'thin');
    bakeGlow(this.scene, this.sprite, 'wide');
  }

  /** Ctrl+tık ile seçili birimin çerçevesi (ince, açık mavi). */
  setSelected(on: boolean): void {
    this.selFrame.setVisible(on);
  }

  get selected(): boolean {
    return this.selFrame.visible;
  }

  /** Komut verilen (aktif) karakterin üstünde ok işareti. */
  setActive(on: boolean): void {
    const show = on && this.alive;
    if (show === this.marker.visible) return;
    this.marker.setVisible(show);
    this.footRing.setVisible(show);
    this.scene.tweens.killTweensOf([this.marker, this.footRing]);
    if (show) {
      this.footRing.setAlpha(1);
      this.marker.setY(0);
      if (perfLite()) return; // performans modu: süs niteliğindeki boşta nefes / sallanma yok (işaret sabit durur)
      this.scene.tweens.add({ targets: this.footRing, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.scene.tweens.add({ targets: this.marker, y: -6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /** Dokunma/tıklama alanı: karakterin tamamı; fare üstüne gelince onOver/onOut çağrılır. */
  makeTappable(onTap: (p?: Phaser.Input.Pointer) => void, onOver?: () => void, onOut?: () => void): void {
    // Vuruş alanı yalnızca gövde (A2, Ömer 2026-10-23): kenar payı yok, yanlardaki boşluk arka sıradaki birime dokunuşu yutmaz
    const zone = this.scene.add.zone(0, -this.h / 2, this.w * 0.72, this.h).setInteractive();
    zone.on('pointerdown', onTap);
    if (onOver) zone.on('pointerover', onOver);
    if (onOut) zone.on('pointerout', onOut);
    this.container.add(zone);
  }

  /**
   * Can çubuğunu günceller. Can düşüyorsa `hitRatio` (hasar / maks can) şiddeti belirler:
   * büyük vuruşta çubuk sarsılır, beyaza yanar ve hayalet çubuk daha uzun süre görünür.
   */
  setHp(hp: number, animate = true, hitRatio = 0): void {
    const target = hpBar.width * Math.max(0, hp / this.combatant.maxHp);
    if (!animate) {
      this.hpFill.width = target;
      this.hpGhost.width = target;
      return;
    }
    this.scene.tweens.killTweensOf([this.hpFill, this.hpGhost]);
    if (target < this.hpFill.width - 0.5) {
      const level = hitLevel(hitRatio);
      this.hpGhost.width = Math.max(this.hpGhost.width, this.hpFill.width);
      this.scene.tweens.add({ targets: this.hpFill, width: target, duration: slow(140), ease: 'Quad.easeOut' });
      this.scene.tweens.add({
        targets: this.hpGhost,
        width: target,
        delay: timing.hpGhostDelayMs * (1 + level),
        duration: timing.hpGhostBaseMs + timing.hpGhostPerLevelMs * level,
        ease: 'Quad.easeIn',
      });
      if (level > 0.15) this.flashHpBar(level);
    } else {
      this.hpGhost.width = target;
      this.scene.tweens.add({ targets: this.hpFill, width: target, duration: 300, ease: 'Quad.easeOut' });
    }
  }

  private flashHpBar(level: number): void {
    const original = this.combatant.side === 'party' ? colors.hpFill : colors.hpFillEnemy;
    this.hpFill.setFillStyle(0xffffff);
    this.scene.time.delayedCall(60 + 120 * level, () => this.hpFill.setFillStyle(color(original)));
    const amp = 3 + 14 * level;
    this.scene.tweens.add({ targets: this.hpBox, x: { from: amp, to: 0 }, duration: 120 + 260 * level, ease: 'Bounce.easeOut' });
  }

  setMp(mp: number, animate = true): void {
    if (this.combatant.maxMp <= 0) return;
    this.tweenWidth(this.mpFill, hpBar.width * Math.max(0, mp / this.combatant.maxMp), animate);
  }

  /**
   * SPEED çubuğu: `ratio` sıra sayacının eşiğe oranı (0-1); null = gizli (test modu, ölü birim).
   * Dolunca (1) çubuk açık sarıya döner ve parlayarak nabız atar: sıra bu karakterdedir.
   */
  setSpeed(ratio: number | null): void {
    if (ratio === null || !this.alive) {
      this.speedBox.setVisible(false);
      this.setSpeedFull(false);
      return;
    }
    this.speedBox.setVisible(true);
    this.speedFill.width = hpBar.width * Math.max(0, Math.min(1, ratio));
    this.setSpeedFull(ratio >= 1);
    this.placeChevrons();
  }

  /**
   * SPEED çubuğunun havası: Haste = daha parlak altın-yeşil dolgu + içinde akan küçük » işaretleri; Slow = soğuk mavi-gri, sönük dolgu,
   * işaret yok; null = normal. Bekleme sırasında farklı dolma hızı gerisini gösterir (src/game/turn-wait.ts). Dolu çubuk her zaman açık sarı.
   */
  setSpeedMood(mood: 'haste' | 'slow' | null): void {
    if (mood === this.speedMood) return;
    this.speedMood = mood;
    this.paintSpeedFill();
    this.chevronTween?.stop();
    this.chevronTween = null;
    for (const c of this.chevrons) c.destroy();
    this.chevrons = [];
    if (mood !== 'haste') return;
    const spdY = this.speedFill.y;
    for (let i = 0; i < 7; i++) {
      const t = this.scene.add.text(0, spdY, '»', { fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold', color: '#3d4a12' }).setOrigin(0.5, 0.55).setAlpha(0.75).setResolution(textRes());
      this.chevrons.push(t);
      this.speedBox.add(t);
    }
    this.chevronTween = reducedMotion()
      ? null
      : this.scene.tweens.add({ targets: this.chevronPhase, v: { from: 0, to: 1 }, duration: 900, repeat: -1, onUpdate: () => this.placeChevrons() });
    this.placeChevrons();
  }

  private placeChevrons(): void {
    if (!this.chevrons.length) return;
    const gap = hpBar.width / this.chevrons.length;
    const x0 = -hpBar.width / 2;
    const fill = this.speedFill.width;
    this.chevrons.forEach((c, i) => {
      const x = (i + this.chevronPhase.v) * gap;
      c.setX(x0 + x).setVisible(x > 3 && x < fill - 3);
    });
  }

  private paintSpeedFill(): void {
    const c = this.speedFull ? colors.speedFull : this.speedMood === 'haste' ? '#cfe06a' : this.speedMood === 'slow' ? '#7f93a6' : colors.speedFill;
    this.speedFill.setFillStyle(color(c), this.speedMood === 'slow' && !this.speedFull ? 0.75 : 1);
  }

  /**
   * Sırası gelen birim: kısa parıltı ve hafif öne adım, sonra yerine döner (turlar arası bekleme sonunda; Reduced motion'da çağrılmaz).
   * `ms` toplam süre, `px` adım (yüzdüğü yöne).
   */
  stepForward(ms: number, px: number): Promise<void> {
    if (!this.alive || ms <= 0) return Promise.resolve();
    const dir = this.combatant.side === 'enemy' ? -1 : 1;
    const glow = this.scene.add.image(0, -this.h * 0.5, ensureGlow(this.scene)).setTint(KIT.ember).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(this.w * 1.3, this.h * 1.1).setAlpha(0);
    this.container.addAt(glow, 0);
    this.scene.tweens.add({ targets: glow, alpha: 0.45, duration: ms / 2, yoyo: true, onComplete: () => glow.destroy() });
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this.sprite, x: dir * px, duration: ms / 2, ease: 'Sine.easeOut', yoyo: true, onComplete: () => {
        this.sprite.setX(0);
        resolve();
      } });
    });
  }

  private setSpeedFull(full: boolean): void {
    if (full === this.speedFull) return;
    this.speedFull = full;
    this.scene.tweens.killTweensOf(this.speedGlow);
    this.speedGlow.setVisible(full).setAlpha(1);
    this.paintSpeedFill();
    if (full) this.scene.tweens.add({ targets: this.speedGlow, alpha: 0.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  setShield(shield: number, magicShield: number, animate = true): void {
    this.tweenWidth(this.shieldFill, hpBar.width * Math.min(1, shield / this.combatant.maxHp), animate);
    this.tweenWidth(this.magicShieldFill, hpBar.width * Math.min(1, magicShield / this.combatant.maxHp), animate);
  }

  /**
   * Can çubuğunun yanındaki rozetler: durumlar (buff/debuff), üzerinde durulan yer etkileri (zehir, yanan zemin, holy fire)
   * ve zırh aurası gibi etkilerden gelen zırh bonusu. Her rozet ikon + kalan tur / değer.
   */
  setBadges(badges: Array<{ icon: string; owner?: string; color: string; text: string; debuff: boolean; turns: boolean }>, sizes: { left: number; right: number } = { left: layout.statusIcon.size, right: layout.statusIcon.size }, perRow = 4): void {
    this.statusBox.removeAll(true);
    const gapBar = layout.statusIcon.gapBar;
    const gapItem = layout.statusIcon.gapItem;
    const hourglass = ensureIcon(this.scene, 'hourglass', '#d9c9a3', false);
    // Buffs on the left of the HP bar, debuffs (and harmful ground effects) on the right; `perRow` per row (desktop 4, phone one row)
    for (const debuff of [false, true]) {
      badges
        .filter((bd) => bd.debuff === debuff)
        .forEach((bd, i) => {
          const dir = debuff ? 1 : -1;
          const size = debuff ? sizes.right : sizes.left; // telefonda büyüyen rozet (badge-layout.ts): yazı ve kum saati de aynı oranda
          const k = size / layout.statusIcon.size;
          const cx = dir * (hpBar.width / 2 + gapBar + size / 2 + (i % perRow) * (size + gapItem));
          const cy = Math.floor(i / perRow) * (size + 4) + (size - layout.statusIcon.size) / 2; // büyüyen rozet aşağı uzar (üst kenar yerinde: adın altında)
          const icon = this.scene.add.image(cx, cy, ensureIcon(this.scene, bd.icon, bd.color, false, bd.owner ?? SHARED_KEY)).setDisplaySize(size, size); // durum/zemin rozeti: sahibi (sınıfa özgü durum) ya da Shared sürümü
          const label = this.scene.add.text(cx + size / 2, cy + size / 2, bd.text, numStyle(Math.round(18 * k), bd.color)).setOrigin(1, 0.5);
          this.statusBox.add([icon, label]);
          if (bd.turns) this.statusBox.add(this.scene.add.image(label.x - label.width - 8 * k, label.y, hourglass).setDisplaySize(15 * k, 15 * k));
        });
    }
  }

  /**
   * TELEFON rozetleri (Ömer 2026-10-11, taslak B; plan src/game/badge-layout.ts > solvePhoneBadges): öncelik sırasındaki ilk `plan.shown` durum
   * planın yuvalarında, kalanı sonraki yuvada "+N" sayacı (rozetle aynı boy ve kit dili: koyu madalyon + ince altın halka; düğme değil).
   */
  setPhoneBadges(badges: Array<{ icon: string; owner?: string; color: string; text: string; debuff: boolean; turns: boolean }>, plan: { size: number; slots: Array<{ dir: -1 | 1; i: number }>; shown: number; more: number }): void {
    this.statusBox.removeAll(true);
    const { size } = plan;
    const k = size / layout.statusIcon.size;
    const gapBar = layout.statusIcon.gapBar;
    const gapItem = layout.statusIcon.gapItem;
    const hourglass = ensureIcon(this.scene, 'hourglass', '#d9c9a3', false);
    const cy = size / 2 - layout.statusIcon.size / 2; // üst kenar masaüstü rozetinin üst kenarında, büyük rozet aşağı uzar (badge-layout.ts > slotRect)
    const cxOf = (s: { dir: -1 | 1; i: number }) => s.dir * (hpBar.width / 2 + gapBar + size / 2 + s.i * (size + gapItem));
    plan.slots.slice(0, plan.shown).forEach((slot, n) => {
      const bd = badges[n];
      if (!bd) return;
      const cx = cxOf(slot);
      const icon = this.scene.add.image(cx, cy, ensureIcon(this.scene, bd.icon, bd.color, false, bd.owner ?? SHARED_KEY)).setDisplaySize(size, size);
      const label = this.scene.add.text(cx + size / 2, cy + size / 2, bd.text, numStyle(Math.round(18 * k), bd.color)).setOrigin(1, 0.5);
      this.statusBox.add([icon, label]);
      if (bd.turns) this.statusBox.add(this.scene.add.image(label.x - label.width - 8 * k, label.y, hourglass).setDisplaySize(15 * k, 15 * k));
    });
    const last = plan.slots[plan.shown];
    if (plan.more > 0 && last) {
      const cx = cxOf(last);
      const r = size * 0.46;
      const g = this.scene.add.graphics();
      g.fillStyle(0x0c0906, 0.92).fillCircle(cx, cy, r);
      g.lineStyle(2, 0xd9b26a, 0.8).strokeCircle(cx, cy, r);
      const t = this.scene.add.text(cx, cy, `+${plan.more}`, { fontFamily: DISPLAY_FONT, fontSize: `${Math.round(size * 0.48)}px`, fontStyle: '700', color: '#f3d999' }).setOrigin(0.5).setResolution(textRes());
      this.statusBox.add([g, t]);
    }
  }

  /**
   * Rozet yerleşimi için geometri (sahne koordinatı, birimin DURAN konumundan; badge-layout.ts): can çubuğu ortası, çubuğun yarı genişliği, kendi
   * çubuğu (+ MP / hız çubukları), adı ve gövde çekirdeği (sprite kutusunun orta %60'ı: boyalı figürün kendisi; kutunun saydam kenarları değil).
   */
  badgeGeometry(): { x: number; barY: number; barHalfW: number; ownBar: { x0: number; y0: number; x1: number; y1: number }; body: { x0: number; y0: number; x1: number; y1: number }; parts: Array<{ x0: number; y0: number; x1: number; y1: number }> } {
    const x = this.homeX;
    const barY = this.baseY + this.hpY;
    const ownBar = { x0: x - hpBar.width / 2 - 3, y0: barY - hpBar.height / 2 - 3, x1: x + hpBar.width / 2 + 3, y1: barY + hpBar.height / 2 + hpBar.mpHeight + hpBar.speedHeight + 9 };
    // ad: yazı kutusu değil harflerin kendisi (alt boşluk = inen harf payı ~%22 + gölge; kenar kalınlığının yarısı dahil)
    const n = this.nameText;
    const fs = parseFloat(String(n.style.fontSize)) || 26;
    const stroke = n.style.strokeThickness / 2;
    const name = { x0: x - n.displayWidth / 2, y0: this.baseY + n.y - n.displayHeight, x1: x + n.displayWidth / 2, y1: this.baseY + n.y - fs * 0.22 + stroke };
    const body = { x0: x - this.w * 0.3, y0: this.baseY - this.h, x1: x + this.w * 0.3, y1: this.baseY };
    return { x, barY, barHalfW: hpBar.width / 2, ownBar, body, parts: [ownBar, name, body] };
  }

  /**
   * Yığılan durumun (Omen) mühür yuvaları: can çubuğunun sol ucunda `max` küçük elmas; dolu = durum renginde mühür + açık iç ışık, boş = sönük
   * kemik konturu; yanında kalan tur (küçük rakam: süre dolunca patlar). null = gizli (yığın yok / Doom patladı). hexer.md bölüm 8.
   */
  setSeals(s: { stacks: number; max: number; turns: number; color: string } | null): void {
    this.sealBox.removeAll(true);
    if (!s || s.stacks <= 0) return;
    const g = this.scene.add.graphics();
    const r = 6;
    const step = 15;
    for (let i = 0; i < s.max; i++) {
      const x = r + i * step;
      const pts = [new Phaser.Math.Vector2(x, -r), new Phaser.Math.Vector2(x + r, 0), new Phaser.Math.Vector2(x, r), new Phaser.Math.Vector2(x - r, 0)];
      if (i < s.stacks) {
        g.fillStyle(color(s.color), 1).fillPoints(pts, true);
        g.fillStyle(0xc9d27a, 0.9).fillRect(x - 1.5, -1.5, 3, 3);
        g.lineStyle(2, 0x1a0a18, 1).strokePoints(pts, true);
      } else {
        g.fillStyle(0x000000, 0.45).fillPoints(pts, true);
        g.lineStyle(2, 0xb8ad94, 0.8).strokePoints(pts, true);
      }
    }
    const turns = this.scene.add.text(r + s.max * step - 2, 0, String(s.turns), numStyle(14, '#e9dfc4')).setOrigin(0, 0.5);
    this.sealBox.add([g, turns]);
  }

  /**
   * Beslenmiş (ceset tüketilerek çağrılmış, `combatant.empowered`) birimin kalıcı, hafif mor aurası: sprite'ın arkasında yumuşak mor ışıma
   * (yavaş nabız), Skeleton'da gözlerde mor ışık, arada gövdeden yükselen tek tük mor kıvılcım. Sprite sınırını çok az aşar; hedef seçim
   * parıltısıyla (setGlow, postFX) çakışmaz. Beslenmemiş birimde yok.
   */
  private empowerFx: { items: Phaser.GameObjects.GameObject[]; timer: Phaser.Time.TimerEvent } | null = null;

  setEmpowered(on: boolean): void {
    if (on === !!this.empowerFx) return;
    if (!on) {
      const old = this.empowerFx!;
      this.empowerFx = null;
      old.timer.remove();
      for (const it of old.items) {
        this.scene.tweens.killTweensOf(it);
        this.scene.tweens.add({ targets: it, alpha: 0, duration: 260, onComplete: () => it.destroy() });
      }
      return;
    }
    const scene = this.scene;
    const key = 'fx:empoweraura';
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, 32, 48);
      if (tex) {
        const ctx = tex.getContext();
        for (let y = 0; y < 48; y++)
          for (let x = 0; x < 32; x++) {
            const d = Math.hypot((x + 0.5 - 16) / 16, (y + 0.5 - 26) / 22);
            if (d >= 1) continue;
            ctx.globalAlpha = Math.round((1 - d) ** 1.6 * 6) / 6;
            ctx.fillStyle = d < 0.35 ? '#e3ccff' : d < 0.7 ? '#b872ff' : '#5a2a9c';
            ctx.fillRect(x, y, 1, 1);
          }
        tex.refresh();
      }
    }
    const aura = scene.add.image(0, -this.h * 0.5, key).setDisplaySize(this.w * 1.05, this.h * 1.02).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.container.addAt(aura, this.container.getIndex(this.sprite));
    scene.tweens.add({ targets: aura, alpha: { from: 0.5, to: 0.8 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // ayak dibinde yassı mor ölü ışığı (koyu zeminde aurayı okunur kılar)
    const pool = scene.add.ellipse(0, -6, this.w * 0.9, 22, 0x7d3fb0, 0.3).setBlendMode(Phaser.BlendModes.ADD);
    this.container.addAt(pool, this.container.getIndex(aura));
    scene.tweens.add({ targets: pool, alpha: { from: 0.22, to: 0.4 }, scaleX: { from: 0.95, to: 1.05 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const items: Phaser.GameObjects.GameObject[] = [aura, pool];
    // Skeleton gözleri (sprite'taki göz çukurları: genişliğin %58 ve %64'ü, yüksekliğin %10'u; düşmanda ayna)
    if (this.combatant.spriteId === 'skeleton' && this.realSprite) {
      const flip = this.sprite.flipX ? -1 : 1;
      for (const u of [0.577, 0.637]) {
        const eye = scene.add.ellipse(flip * (u - 0.5) * this.w, -this.h * 0.9, 9, 6, 0xd9a8ff, 0.95).setBlendMode(Phaser.BlendModes.ADD);
        this.container.add(eye);
        scene.tweens.add({ targets: eye, alpha: { from: 0.95, to: 0.5 }, scaleX: { from: 1, to: 1.4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        items.push(eye);
      }
    }
    // tek tük yükselen mor kıvılcım (kapta kalır: birim hareket edince birlikte gider)
    const timer = scene.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        if (!this.container.active || this.fallen) return;
        const m = scene.add.rectangle(Phaser.Math.Between(-this.w * 0.3, this.w * 0.3), -this.h * Phaser.Math.FloatBetween(0.2, 0.8), 4, 4, Phaser.Math.RND.pick([0xb872ff, 0xe3ccff, 0x7d3fb0]));
        this.container.add(m);
        scene.tweens.add({ targets: m, y: m.y - Phaser.Math.Between(30, 60), alpha: 0, duration: 900, onComplete: () => m.destroy() });
      },
    });
    this.empowerFx = { items, timer };
  }

  /**
   * Vine Snare ile yere bağlanan (status `cause: 'vines'`, Stun) birimin bacaklarındaki kalın kök-sarmaşık sargısı: arka kıvrımlar sprite'ın
   * arkasında, öndekiler önünde; yavaşça sıkışıp gevşer. Stun bitince (statusEnd) ya da ölünce çözülüp yere iner. Sprite'ın alt üçte birinde kalır.
   */
  private vineWrap: { back: Phaser.GameObjects.Graphics; front: Phaser.GameObjects.Graphics } | null = null;

  /**
   * GÖMÜLME (Salt Crab Burrow, Ömer 2026-10-25): sprite `frac` oranında zemine batar; zeminin altı kırpılır (setCrop, maske yok), ayakta küçük kum
   * yığını belirir. 0 = çıkar. BattleScene her karede durumdan (src/game/mob-vfx.ts > buryDepth) çağırır: aynı değerde etkisiz.
   */
  private bury = { v: 0, target: 0 };
  private buryTween?: Phaser.Tweens.Tween;
  private buryMound?: Phaser.GameObjects.Graphics;

  private buryHoldUntil = 0;

  /** Efekt gömdükten sonra bu süre durum beklenmeden gömülü kalır (durum rozeti olay kuyruğunda biraz geç görünür; test panelinde hiç görünmez). */
  get buryHeld(): boolean {
    return this.scene.time.now < this.buryHoldUntil;
  }

  setBuried(frac: number, holdMs = 0): void {
    if (holdMs > 0) this.buryHoldUntil = this.scene.time.now + slow(holdMs);
    if (frac === this.bury.target) return;
    this.bury.target = frac;
    this.buryTween?.stop();
    const down = frac > this.bury.v;
    if (down && !this.buryMound) {
      const g = this.scene.add.graphics();
      const w = this.w * 0.62;
      g.fillStyle(0x6b5434, 1).fillEllipse(0, 2, w + 8, 30);
      g.fillStyle(0xb59a6a, 1).fillEllipse(0, 0, w, 24);
      g.fillStyle(0xd8c393, 1).fillEllipse(-w * 0.12, -5, w * 0.55, 9);
      g.setScale(0.2, 0.2).setAlpha(0);
      this.container.addAt(g, this.container.getIndex(this.sprite) + 1);
      this.buryMound = g;
    }
    const mound = this.buryMound;
    if (mound) {
      this.scene.tweens.killTweensOf(mound);
      this.scene.tweens.add({
        targets: mound,
        scaleX: down ? 1 : 0.2,
        scaleY: down ? 1 : 0.2,
        alpha: down ? 1 : 0,
        duration: slow(down ? 260 : 320),
        ease: down ? 'Back.easeOut' : 'Quad.easeIn',
        onComplete: () => {
          if (!down && this.buryMound === mound) {
            mound.destroy();
            this.buryMound = undefined;
          }
        },
      });
    }
    this.buryTween = this.scene.tweens.add({
      targets: this.bury,
      v: frac,
      duration: slow(down ? 300 : 380),
      ease: down ? 'Quad.easeIn' : 'Back.easeOut',
      onUpdate: () => this.applyBury(),
      onComplete: () => this.applyBury(),
    });
  }

  private buryTop: { key: string; top: number } | null = null;

  /** Sprite karesinde ilk opak satır (kare pikseli; önbellekli). Okunamazsa 0. */
  private contentTop(): number {
    const fr = this.sprite.frame;
    const key = `${this.sprite.texture.key}#${fr.name}`;
    if (this.buryTop?.key === key) return this.buryTop.top;
    let top = 0;
    try {
      const cv = document.createElement('canvas');
      cv.width = fr.cutWidth;
      cv.height = fr.cutHeight;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      if (cx) {
        cx.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
        const px = cx.getImageData(0, 0, fr.cutWidth, fr.cutHeight).data;
        outer: for (let y = 0; y < fr.cutHeight; y++)
          for (let x = 0; x < fr.cutWidth; x += 2)
            if (px[(y * fr.cutWidth + x) * 4 + 3]! > 24) {
              top = y;
              break outer;
            }
      }
    } catch {
      top = 0;
    }
    this.buryTop = { key, top };
    return top;
  }

  private applyBury(): void {
    const v = Math.max(0, this.bury.v);
    if (v <= 0.001) {
      this.sprite.setY(0);
      this.sprite.setCrop();
      return;
    }
    const fh = this.sprite.frame.height;
    // oran görünür gövdeye göre (karenin üstündeki saydam pay hariç: yengeç karenin alt yarısında)
    const cut = (fh - this.contentTop()) * v;
    this.sprite.setY(cut * Math.abs(this.sprite.scaleY));
    this.sprite.setCrop(0, 0, this.sprite.frame.width, Math.max(1, fh - cut));
  }

  setVineWrap(on: boolean): void {
    if (on === !!this.vineWrap) return;
    if (!on) {
      const old = this.vineWrap!;
      this.vineWrap = null;
      for (const g of [old.back, old.front]) {
        this.scene.tweens.killTweensOf(g);
        this.scene.tweens.add({ targets: g, alpha: 0, scaleY: 0.2, duration: slow(320), ease: 'Quad.easeIn', onComplete: () => g.destroy() });
      }
      return;
    }
    const back = this.scene.add.graphics();
    const front = this.scene.add.graphics();
    const H = this.h * 0.3;
    const W = Math.max(24, this.w * 0.3);
    const turns = 2.1;
    const max = turns * Math.PI * 2;
    for (let a = 0; a <= max; a += 0.1) {
      const k = a / max;
      const x = Math.round(Math.cos(a) * W * (1 - 0.12 * k) / 2) * 2;
      const y = Math.round((-2 - k * H + Math.sin(a) * 6) / 2) * 2;
      const isFront = Math.sin(a) > 0;
      const g = isFront ? front : back;
      const th = isFront ? 12 : 9;
      g.fillStyle(0x2a1a0e, 1).fillRect(x - th / 2 - 1, y - th / 2 - 1, th + 2, th + 2);
      g.fillStyle(isFront ? (Math.round(a / 0.3) % 2 ? 0x8c5a2b : 0x6b4423) : 0x4a2e1a, 1).fillRect(x - th / 2, y - th / 2, th, th);
      const i = Math.round(a / 0.1);
      if (isFront && i % 4 === 0) g.fillStyle(0x62d04b, 1).fillRect(x - th / 2, y - th / 2, th, 3);
      if (isFront && i % 17 === 8) g.fillStyle(0xa8f08a, 1).fillRect(x - 7, y - 11, 14, 6).fillStyle(0x2c7a2b, 1).fillRect(x - 1, y - 9, 3, 3); // yaprak
    }
    const at = this.container.getIndex(this.sprite);
    this.container.addAt(back, at);
    this.container.addAt(front, at + 2);
    for (const g of [back, front]) {
      g.setScale(1, 0.1);
      this.scene.tweens.add({ targets: g, scaleY: 1, duration: slow(220), ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: g, scaleX: 0.94, duration: 900, yoyo: true, repeat: -1, delay: slow(300), ease: 'Sine.easeInOut' });
    }
    this.vineWrap = { back, front };
  }

  private tweenWidth(bar: Phaser.GameObjects.Rectangle, width: number, animate: boolean): void {
    if (!animate) {
      bar.width = width;
      return;
    }
    this.scene.tweens.add({ targets: bar, width, duration: 250, ease: 'Quad.easeOut' });
  }

  /** `hitPoseMs`: darbe pozunun toplam süresi (ham ms; hit-reaction kademesi), verilmezse hitFlashMs x 3 + hitHoldMs. */
  play(anim: AnimName, hitPoseMs?: number): void {
    if (!this.realSprite) return;
    if (this.mobPose) return this.playMobPose(anim, hitPoseMs);
    if (this.rig) {
      if (anim === 'idle' && this.holdSkillPose()) return;
      const rig = this.rig;
      const now = this.scene.time.now;
      const act = anim === 'attack' || anim === 'cast';
      // pozlu sınıf: genel durum -> poz; attack/cast oynanan skill'in vuruş pozu (skills.json > pose), yoksa sınıfın varsayılanı
      const late = anim === 'attack' && !rig.skill.length && now - (rig.endedAt ?? -1e9) < slow(PT.lateWindowMs) ? rig.lastSkill : undefined;
      const list = late ?? rig.skill;
      const skill = act ? list[list.length - 1] : undefined;
      this.showPose(skill ?? statePose(rig.def, anim, this.grip));
      if (act && rig.skill.length) {
        rig.lastReqAt = now;
        // büyü / atış skill'inde fırlatış (attack) pozu en çok throwHoldMs: zar / bomba havadayken el iner (kanallı skill hariç)
        const cap = anim === 'attack' && isV2(rig.def) ? throwHoldDelay(PT, { motion: rig.motion, skillId: rig.skillId }, SLOW) : null;
        if (cap !== null) this.returnToIdle(rig.token, cap);
      } else if (act) this.returnToIdle(rig.token, slow(PT.lateHoldMs)); // skill dışında (geç istek, olay efekti): kendi dönüşü yok
      if (anim === 'hit') this.returnToIdle(rig.token, hitPoseMs !== undefined ? slow(hitPoseMs) : slow(timing.hitFlashMs) * 3 + slow(PT.hitHoldMs));
      return;
    }
    const key = animKey(this.combatant.spriteId, anim, this.scene);
    if (key && this.scene.anims.exists(key)) this.sprite.play(key);
  }

  /** Poz sayfalı mob / boss: durum -> kare (src/game/mob-poses.ts > MobPosePlayer). Skill dışındaki her kare kendiliğinden boşta döngüsüne döner. */
  private playMobPose(anim: AnimName, hitPoseMs?: number): void {
    this.mobPlayer?.play(anim, hitPoseMs !== undefined ? slow(hitPoseMs) : undefined);
  }

  // --- Poz kütüphanesi (src/game/poses.ts; pozsuz sınıfta hepsi etkisiz) ---

  /**
   * v2 poz takımı: skill sürerken efektin `play('idle')` isteği (Ömer 2026-10-12: büyü / atış pozları çok hızlı sönüyordu; 2026-10-13: el
   * 1-2 sn havada kalıyordu) en kısa görünme süresi dolunca uygulanır (src/game/pose-timing.ts > idleRequestDelay): büyü / atış pozu son
   * poz isteğinden itibaren en az castMinMs, melee pozu en az meleeMinMs; kanallı skill'de skill bitene dek tutulur. true = istek ele alındı.
   */
  private holdSkillPose(): boolean {
    const rig = this.rig;
    if (!rig || !isV2(rig.def) || !this.alive) return false;
    const now = this.scene.time.now;
    if (!rig.skill.length) {
      if (rig.awaitFx && this.fxRuns > 0) return true; // kanallı skill'in efekti sürüyor: poz efektin sonunda (fxEnd) bırakılır
      // skill bitti, pozun dönüş anı gelmedi: idle o ana ertelenir (sonradan gelen idle istekleri de)
      const wait = rig.holdUntil - now;
      if (wait <= 0) return false;
      this.returnToIdle(rig.token, wait);
      return true;
    }
    const wait = idleRequestDelay(PT, this.poseHold(now), SLOW);
    if (wait === null) return true;
    if (wait <= 0) return false;
    this.returnToIdle(rig.token, wait);
    return true;
  }

  /** Pozun tutulduğu skill bağlamı (pose-timing hesapları için). */
  private poseHold(now: number, motion = this.rig?.motion, skillId = this.rig?.skillId): PoseHold {
    return { now, motion, skillId, lastRequestAt: this.rig?.lastReqAt ?? now, shownAt: this.rig?.shownAt ?? now };
  }

  /** Bu birim poz kütüphanesiyle mi çiziliyor. */
  get posed(): boolean {
    return !!this.rig;
  }

  /** Şu anki poz adı (pozsuz ya da idle sprite'ında null). */
  get currentPose(): string | null {
    return this.rig?.pose ?? null;
  }

  /** Çizilen silahın tutuşu (poz takımını seçer: tek el / çift el). */
  private get grip(): Grip | undefined {
    return this.rig?.weapon?.grip;
  }

  /** Pozlu sınıfın bu tutuştaki poz kareleri (debug poz seçici). */
  poseList(): string[] {
    return this.rig ? gripFrames(this.rig.def, this.grip) : [];
  }

  /** Pozlu sınıfın bu tutuştaki döngüleri (ör. spin1 -> spin1a..c). */
  poseCycles(): Record<string, string[]> {
    if (!this.rig) return {};
    const frames = new Set(gripFrames(this.rig.def, this.grip));
    return Object.fromEntries(Object.entries(this.rig.def.cycles).filter(([, f]) => f.every((x) => frames.has(x))));
  }

  /** Çizilen silah (pozsuz: null). */
  get poseWeapon(): WeaponPick | null {
    return this.rig?.weapon ?? null;
  }

  /**
   * BattleScene: bu birim şimdi bu skill'i oynuyor (null = bitti). attack/cast durumları ve `skillPose()` skill'in poz dizisini kullanır.
   */
  useSkill(skill0: { id?: string; pose?: string | string[]; motion?: string } | null): void {
    if (this.mobPlayer) {
      // poz sayfalı mob: skill sürerken vuruş karesi tutulur; bitince kısa süre sonra boşta döngüsüne döner
      const target = skill0?.id ? content.skills[skill0.id]?.target : undefined;
      this.mobPlayer.useSkill(skill0 ? { ...(skill0.id ? { id: skill0.id } : {}), ...(skill0.motion ? { motion: skill0.motion } : {}), ...(target ? { target } : {}) } : null);
      return;
    }
    if (!this.rig) return;
    // v2 gövdeli gerçek sınıf: Pose Tester kopyasının (pt_<id>) pozu (aynı eşleme; poses.ts > poseSkill)
    const skill = skill0 ? poseSkill(this.combatant.defId, skill0, (id) => content.skills[id]) : null;
    if (!skill && this.rig.skill.length) this.rig.lastSkill = this.rig.skill;
    const prev = { motion: this.rig.motion, skillId: this.rig.skillId };
    this.rig.skill = skill ? skillPoses(this.combatant.defId, skill) : [];
    this.rig.motion = viewMotion(skill as { motion?: string; viewMotion?: string } | null); // yalnızca sunum: skills.json > viewMotion (motor `motion`a bakar)
    this.rig.awaitFx = false;
    if (skill) {
      this.rig.lastReqAt = this.scene.time.now;
      this.rig.skillId = skill.id;
      this.rig.holdUntil = 0;
    }
    // açık pozu olan menzilli / büyü skill'i: efekt pozu kendisi çağırmasa da (yukarıdan düşen Judgment gibi) baştan skill'in ilk pozu
    if (skill?.pose !== undefined && this.rig.motion !== 'melee' && this.rig.skill.length) this.showPose(this.rig.skill[0]!);
    // küçük savunma hareketi (Guard; gerçek koruma pozu üretilene dek): geriye yaslanıp çöker, sonra toparlanır (data/poses.json > braceSkills)
    if (skill && 'id' in skill && POSES.braceSkills?.includes(String((skill as { id: string }).id)) && !reducedMotion()) {
      const dir = this.combatant.side === 'enemy' ? 1 : -1;
      const sy = this.sprite.scaleY;
      const braced = this.rig.pose;
      this.scene.tweens.add({ targets: this.sprite, angle: dir * 5, scaleY: sy * 0.95, duration: slow(160), yoyo: true, hold: slow(320), ease: 'Quad.easeOut', onComplete: () => {
        this.sprite.setScale(this.sprite.scaleX, sy);
        // savunma hareketi bitti: hâlâ skill'in pozundaysa boşta pozuna (efekt kendisi döndürmüyor: Guard bağı sürer)
        if (this.rig && this.rig.pose === braced && this.alive) this.showPose(null);
      } });
    }
    // skill bitti: efekt pozu boşta pozuna döndürmediyse (araya başka poz girmezse) kısa süre sonra boşta pozuna
    if (!skill) {
      const now = this.scene.time.now;
      this.rig.endedAt = now;
      // v2: vuruş anından releaseMs sonra idle (büyü / atış pozu son poz isteğinden itibaren en az castMinMs görünür; pose-timing > endDelay)
      const v2 = isV2(this.rig.def);
      const cast = v2 && prev.motion !== 'melee';
      const ms = v2 ? endDelay(PT, this.poseHold(now, prev.motion, prev.skillId), SLOW) : slow(500);
      this.rig.holdUntil = cast ? now + ms : 0;
      // kanallı skill'in efekti vuruş anından sonra da sürüyor (ok şerit boyunca uçar): poz efekt bitince (fxEnd) bırakılır; diğerlerinde
      // efektin kuyruğu (duman, sönen ışık) beklenmez
      if (cast && this.fxRuns > 0 && isHoldSkill(PT, prev.skillId)) this.rig.awaitFx = true;
      else this.returnToIdle(this.rig.token, ms);
    }
  }

  /**
   * Oynanan skill'in i'nci anahtar pozu (negatif = sondan; varsayılan son = vuruş anı). Ad döngüyse (spin) anahtar karesi. Dönen: gösterilen poz.
   */
  skillPose(i = -1): string | null {
    if (!this.rig || !this.rig.skill.length) return null;
    const list = this.rig.skill;
    const name = list[i < 0 ? Math.max(0, list.length + i) : Math.min(i, list.length - 1)]!;
    return this.showPose(name);
  }

  /** Oynanan skill'de döngü pozu var mı (ör. Whirlwind -> spin): adı, yoksa null. */
  skillCycle(): string | null {
    if (!this.rig) return null;
    return this.rig.skill.find((p) => (this.rig!.def.cycles[resolvePose(this.rig!.def, p, this.grip)]?.length ?? 0) > 1) ?? null;
  }

  /** Döngü pozunun `phase` (tur, 0..1 bir tam döngü) anındaki karesi; Reduced motion'da daima anahtar kare (kare döngüsü yok). */
  cycleFrame(name: string, phase: number): void {
    if (!this.rig) return;
    const frames = cycleFrames(this.rig.def, name, this.grip);
    if (!frames.length) return;
    if (reducedMotion()) {
      this.showPose(keyFrame(this.rig.def, name, this.grip), false);
      return;
    }
    const i = ((Math.floor(phase * frames.length) % frames.length) + frames.length) % frames.length;
    this.showPose(frames[i]!, false);
  }

  /**
   * Pozu gösterir (null = boşta: idle pozu ya da idleSprite sınıfında bugünkü idle.png). Ad döngüyse anahtar karesi. Değişimde önceki kare
   * kısa bir hayalet olarak söner (pozlar arası yumuşak geçiş; Reduced motion / Performance mode'da yok). Dönen: gösterilen poz.
   */
  showPose(name: string | null, fade = true): string | null {
    const rig = this.rig;
    if (!rig) return null;
    // mantıksal ad (slash, spin, idle...) tutuşun karesine çözülür; doğrudan kare adı (debug) olduğu gibi
    const frames = gripFrames(rig.def, this.grip);
    let pose = name ? (frames.includes(name) ? name : keyFrame(rig.def, name, this.grip)) : statePose(rig.def, 'idle', this.grip);
    if (pose && !frames.includes(pose)) pose = statePose(rig.def, 'idle', this.grip); // başka tutuşun karesi bu atlasta yok
    if (pose === statePose(rig.def, 'idle', this.grip) && rig.def.idleSprite) pose = null;
    rig.token++;
    if (pose === rig.pose && this.sprite.texture.key !== '__MISSING') return pose;
    const prevKey = this.sprite.texture.key;
    const prevFrame = this.sprite.frame.name;
    if (fade && !reducedMotion() && !perfLite() && this.sprite.visible && this.container.alpha > 0.05) {
      const g = this.scene.add
        .image(this.sprite.x, this.sprite.y, prevKey, prevFrame)
        .setOrigin(0.5, 1)
        .setScale(this.sprite.scaleX, this.sprite.scaleY)
        .setAngle(this.sprite.angle)
        .setFlipX(this.sprite.flipX);
      this.container.addAt(g, this.container.getIndex(this.sprite) + 1);
      // idle'a dönüş biraz daha yumuşak (v2: tutulan büyü pozundan çıkış)
      const toIdle = isV2(rig.def) && (!pose || pose === statePose(rig.def, 'idle', this.grip));
      this.scene.tweens.add({ targets: g, alpha: 0, duration: toIdle ? 200 : 110, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
    }
    // sprite'ın ölçeği tween'de olabilir (Whirlwind, kükreme): oranı koruyarak yeni dokunun ölçeğine geçer
    const from = pose ? rig.scale : this.baseScale;
    const was = rig.pose === null && prevKey === this.baseTex ? this.baseScale : rig.scale;
    const kx = this.sprite.scaleX / was;
    const ky = this.sprite.scaleY / was;
    this.sprite.anims?.stop();
    if (pose) this.sprite.setTexture(rig.key, pose);
    else this.sprite.setTexture(this.baseTex, this.scene.textures.get(this.baseTex).has('0') ? 0 : undefined);
    this.sprite.setScale(from * kx, from * ky);
    rig.pose = pose;
    rig.shownAt = this.scene.time.now;
    return pose;
  }

  /** Bu birimin şu an süren arka plan efektleri (vfx playUntilHit: vuruş anında çözülür, efekt sürer). */
  private fxRuns = 0;

  /** vfx playUntilHit başladı (efektin sahibi bu birim). */
  fxBegin(): void {
    this.fxRuns++;
  }

  /** vfx playUntilHit bitti: skill çoktan bittiyse ve kanallı skill'in pozu efekti bekliyorsa (awaitFx) kısa süre sonra idle'a döner. */
  fxEnd(): void {
    this.fxRuns = Math.max(0, this.fxRuns - 1);
    const rig = this.rig;
    if (this.fxRuns > 0 || !rig?.awaitFx || rig.skill.length) return;
    rig.awaitFx = false;
    this.returnToIdle(rig.token, holdEndDelay(PT, rig.holdUntil, this.scene.time.now, SLOW));
  }

  /** `token` hâlâ geçerliyse (araya başka poz girmediyse) `ms` sonra boşta pozuna döner. */
  private returnToIdle(token: number, ms: number): void {
    this.scene.time.delayedCall(ms, () => {
      if (this.rig && this.rig.token === token && this.alive && !this.fallen) this.showPose(null);
    });
  }

  /** Debug / önizleme: silahı değiştirir (atlas yeniden pişer; aynı silah önbellekten). */
  setPoseWeapon(pick: WeaponPick, retried = false): void {
    const rig = this.rig;
    if (!rig) return;
    const baked = bakePoseTexture(this.scene, this.combatant.defId, pick, this.combatant.spriteScale ?? 1);
    // kaynak gövdeler savaş kurulunca bırakıldı (telefon belleği, releasePoseSources): yeni silah için yeniden yükleyip bir kez daha dene
    if (!baked) {
      if (!retried) void ensurePoseSources(this.scene, [{ classId: this.combatant.defId, pick }]).then(() => this.scene && this.setPoseWeapon(pick, true));
      return;
    }
    rig.key = baked.key;
    rig.scale = rig.display / baked.density;
    rig.weapon = pick;
    const pose = rig.pose;
    rig.pose = '__';
    this.showPose(pose, false);
  }

  /**
   * Silahın dünyadaki çizgisi (efektler için: öfke izi, savuruş): kabza noktası, açı (vfx kuralı: 0 = ileri yüzdüğü yöne, negatif = yukarı)
   * ve kabzadan uca boy. Pozsuz ya da silahsız pozda null.
   */
  weaponLine(): { x: number; y: number; ang: number; len: number } | null {
    const rig = this.rig;
    if (!rig || !rig.pose || !rig.weapon) return null;
    // yerleşim (poz + aile ayarı, src/game/poses.ts > itemPlacement): v1 Warrior'da ayar yok, el noktası ve açı aynen
    const pl = itemPlacement(rig.def, rig.pose, rig.weapon, 'main');
    if (!pl) return null;
    const k = this.sprite.scaleY / rig.scale; // tween'deki ölçek oranı
    const flip = this.sprite.flipX ? -1 : 1;
    // gövde eğilmesi (sprite açısı, ayak noktası çevresinde) el noktasını ve silah açısını birlikte döndürür
    const { x, y } = this.poseToWorld(pl.x, pl.y);
    const a = ((pl.angle - 90) * Math.PI) / 180 + this.sprite.rotation * flip;
    return { x, y, ang: a, len: pl.grip.y * pl.k * rig.display * k };
  }

  /** Gövde tuvali noktası -> dünya (sprite aynası, tween ölçeği ve ayak çevresindeki eğilme dahil). */
  private poseToWorld(px: number, py: number): { x: number; y: number } {
    const rig = this.rig;
    if (!rig) return { x: this.container.x, y: this.container.y };
    const flip = this.sprite.flipX ? -1 : 1;
    const k = this.sprite.scaleY / rig.scale;
    const ox = flip * (px - rig.def.canvas.footX) * rig.display * k;
    const oy = (py - rig.def.canvas.footY) * rig.display * k;
    const r = this.sprite.rotation;
    return { x: this.container.x + this.sprite.x + ox * Math.cos(r) - oy * Math.sin(r), y: this.container.y + this.sprite.y + ox * Math.sin(r) + oy * Math.cos(r) };
  }

  /**
   * Büyü / atış ÇIKIŞ NOKTASI (yalnızca v2 poz takımı, Pose Tester'lar; Ömer 2026-10-12 poz denetimi): şu anki pozda asanın / kılıcın
   * UCU, yayın kavrama noktası, tılsımın ortası; açık el pozunda (point / throw) ya da eşya çizilmiyorsa (fırlatılan tılsım) açık el.
   * v1 / pozsuz birimde null: efekt eski el noktasını kullanır.
   */
  castPoint(): { x: number; y: number } | null {
    const rig = this.rig;
    if (!rig || !isV2(rig.def) || !this.alive) return null;
    // skill sürerken bırakış pozu (skill'in son pozu; efekt çoğu zaman noktayı pozdan önce okur), değilse şu anki poz
    const last = rig.skill[rig.skill.length - 1];
    const pose = last ? keyFrame(rig.def, last, this.grip) : rig.pose;
    const p = pose ? rig.def.poses[pose] : undefined;
    if (!pose || !p) return null;
    const pl = rig.weapon ? itemPlacement(rig.def, pose, rig.weapon, 'main') : null;
    // açık el pozu (point / throw: data/poses.json > open): büyü / fırlatılan şey açık elden çıkar (eşya o elde değilse)
    const open = p.open === 'off' ? p.offhand : p.open === 'main' ? p.anchor : undefined;
    if (!pl || (open && pl.hand !== p.open)) {
      const h = open ?? p.offhand ?? p.anchor;
      return this.poseToWorld(h.x, h.y);
    }
    const hold = POSES.weapons[pl.family]?.hold;
    const q = hold === 'bow' ? { x: pl.x, y: pl.y } : hold === 'charm' ? placementPoint(pl, pl.w / 2, pl.h / 2) : placementPoint(pl, pl.grip.x, 0);
    return this.poseToWorld(q.x, q.y);
  }

  /**
   * v2 bırakış pozunda (skill'in son pozu; yoksa şu anki) bir elin dünyadaki noktası: 'main' ana el, 'off' ikinci el. v1 / pozsuz: null.
   */
  handPoint(which: 'main' | 'off'): { x: number; y: number } | null {
    const rig = this.rig;
    if (!rig || !isV2(rig.def) || !this.alive) return null;
    const last = rig.skill[rig.skill.length - 1];
    const pose = last ? keyFrame(rig.def, last, this.grip) : rig.pose;
    const p = pose ? rig.def.poses[pose] : undefined;
    if (!p) return null;
    const h = which === 'off' ? (p.offhand ?? p.anchor) : p.anchor;
    return this.poseToWorld(h.x, h.y);
  }

  /**
   * Yayın dünyadaki noktaları (v2, ana elde yay çizilen pozda): kavrama, üst ve alt uç (kiriş uçları), kirişi çeken el (ikinci el
   * noktası). Archer efekti kirişi buraya çizer. Yoksa null.
   */
  bowPoints(): { grip: { x: number; y: number }; top: { x: number; y: number }; bot: { x: number; y: number }; draw: { x: number; y: number } } | null {
    const rig = this.rig;
    if (!rig || !isV2(rig.def) || !rig.pose || !rig.weapon || POSES.weapons[rig.weapon.family]?.hold !== 'bow' || !this.alive) return null;
    const last = rig.skill[rig.skill.length - 1];
    const pose = (last ? keyFrame(rig.def, last, this.grip) : null) ?? rig.pose;
    const pl = itemPlacement(rig.def, pose, rig.weapon, 'main');
    const p = rig.def.poses[pose];
    if (!pl || !p) return null;
    const sx = pl.w * 0.12; // kiriş görselin sol kenarına yakın (yay kesimde aynalandı: kiriş gövdeye dönük)
    const top = placementPoint(pl, sx, pl.h * 0.02);
    const bot = placementPoint(pl, sx, pl.h * 0.98);
    const off = p.offhand ?? p.anchor;
    return { grip: this.poseToWorld(pl.x, pl.y), top: this.poseToWorld(top.x, top.y), bot: this.poseToWorld(bot.x, bot.y), draw: this.poseToWorld(off.x, off.y) };
  }

  /** Hedefe doğru atılıp geri döner. Vuruş anında onHit çağrılır. */
  lunge(towardX: number, onHit: () => void): Promise<void> {
    this.play('attack');
    const dir = Math.sign(towardX - this.homeX) || 1;
    const reach = Math.min(timing.attackLungeDistance, Math.abs(towardX - this.homeX) - this.w);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x: this.homeX + dir * Math.max(0, reach),
        duration: slow(timing.attackDurationMs),
        ease: 'Quad.easeIn',
        yoyo: true,
        hold: slow(60),
        onYoyo: () => onHit(),
        onComplete: () => {
          this.play('idle');
          resolve();
        },
      });
    });
  }

  /**
   * Yerden çıkış: karakter zeminin altından yükselir; zemin çizgisinin altı bir geometri maskesiyle gizlenir (gömülü kısım görünmez).
   * `jitter`: yükselirken yanlara titreme (piksel). Çıkış bitince Promise çözülür.
   */
  riseFromGround(ms: number, jitter = 4): Promise<void> {
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff).fillRect(this.homeX - 500, this.baseY - 900, 1000, 900 + 4);
    this.container.setMask(g.createGeometryMask());
    this.container.setAlpha(1);
    this.container.setY(this.baseY + this.h + 16);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY,
        duration: slow(ms),
        ease: 'Cubic.easeOut',
        onUpdate: () => this.container.setX(this.homeX + Phaser.Math.Between(-jitter, jitter)),
        onComplete: () => {
          this.container.setX(this.homeX);
          this.container.clearMask(true);
          resolve();
        },
      });
    });
  }

  /** Karakterin durduğu (ev) zemin noktası. */
  get home(): { x: number; y: number } {
    return { x: this.homeX, y: this.baseY };
  }

  /** Hızla (x, y) noktasına koşar; `ghost` doluysa arkasında bu renkte hayalet izler bırakır. Varışta çözülür. */
  approach(x: number, y: number, ms: number, ghost?: number): Promise<void> {
    if (this.rig) this.showPose(this.rig.skill.length > 1 ? this.rig.skill[0]! : statePose(this.rig.def, 'step', this.grip)); // pozlu: koşarken adım (ya da skill'in ilk) pozu
    else this.play('attack');
    this.container.setDepth(3500);
    let next = 0;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x,
        y,
        duration: slow(ms),
        ease: 'Quad.easeIn',
        onUpdate: () => {
          const now = this.scene.time.now;
          if (ghost !== undefined && now >= next) {
            this.afterimage(ghost, 0.55, 260);
            next = now + 26;
          }
        },
        onComplete: () => resolve(),
      });
    });
  }

  /** Ev noktasına geri döner (isteğe bağlı hayalet izli). */
  returnHome(ms = 240, ghost?: number): Promise<void> {
    let next = 0;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x: this.homeX,
        y: this.baseY,
        duration: slow(ms),
        ease: 'Quad.easeOut',
        onUpdate: () => {
          const now = this.scene.time.now;
          if (ghost !== undefined && now >= next) {
            this.afterimage(ghost, 0.35, 200);
            next = now + 30;
          }
        },
        onComplete: () => {
          this.container.setDepth(this.baseY);
          this.container.setScale(1);
          this.play('idle');
          resolve();
        },
      });
    });
  }

  /** Karakterin anlık görüntüsü (renkli, sönen hayalet): hız izi. */
  afterimage(tint: number, alpha = 0.5, life = 240): void {
    const img = this.scene.add
      .image(this.container.x, this.container.y, this.sprite.texture.key, this.sprite.frame.name)
      .setOrigin(0.5, 1)
      .setScale(this.sprite.scaleX * this.container.scaleX, this.sprite.scaleY * this.container.scaleY)
      .setFlipX(this.sprite.flipX)
      .setTint(tint)
      .setAlpha(alpha)
      .setDepth(this.container.depth - 1);
    this.scene.tweens.add({ targets: img, alpha: 0, duration: slow(life), onComplete: () => img.destroy() });
  }

  /** Büyü / atış hazırlığı: hafif şişip halka bırakır. */
  windUp(hex: string, anim: AnimName = 'cast'): Promise<void> {
    this.play(anim);
    this.ring(hex, 0.7);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.07,
        scaleY: 1.07,
        duration: slow(140),
        yoyo: true,
        onComplete: () => {
          this.play('idle');
          resolve();
        },
      });
    });
  }

  /** Karakterin etrafında genişleyip sönen halka (şifa, kalkan, büyü hazırlığı, çağrı). */
  ring(hex: string, scale = 1): void {
    const ring = this.scene.add
      .ellipse(this.container.x, this.container.y - this.h / 2, this.w * 0.8 * scale, this.h * 0.8 * scale)
      .setStrokeStyle(8, color(hex))
      .setDepth(4200);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.7,
      scaleY: 1.5,
      alpha: { from: 1, to: 0 },
      duration: slow(450),
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Vuruş tepkisi, 3 kademe (Ömer 2026-10-14; src/game/hit-reaction.ts, sayılar battle-layout.json > animation.hitReaction):
   * light = poz değişmez, birkaç px geri tepme + kısa parlama; medium = darbe pozu + normal geri tepme; heavy = güçlü savrulma, eğilme,
   * uzun poz, kırmızı iz (+ en ağırında ekran sarsıntısı). Sayı verilirse (eski çağrı) oran olarak kademelenir.
   * Tek görselli mob / çağrılarda da geri tepme, parlama ve eğilme aynı kademeyle ölçeklenir.
   */
  private crouchTween?: Phaser.Tweens.Tween;
  private crouchBaseY = 1;

  hit(input: number | HitReaction = 0.1): void {
    const r = typeof input === 'number' ? hitReaction(HIT_REACTION, { amount: input * 1000, maxHp: 1000, calm: reducedMotion() || perfLite() }) : input;
    if (r.pose) this.play('hit', r.poseMs);
    const flash = slow(r.flashMs);
    this.sprite.setTintFill(color(r.flash));
    this.scene.time.delayedCall(flash, () => {
      if (r.tint) {
        this.sprite.setTint(color(r.tint));
        this.scene.time.delayedCall(r.tintMs, () => this.sprite.clearTint());
      } else this.sprite.clearTint();
    });
    const dir = this.combatant.side === 'enemy' ? 1 : -1;
    this.scene.tweens.add({
      targets: this.sprite,
      x: { from: r.recoilPx * dir, to: 0 },
      duration: slow(r.recoilMs),
      ease: r.tier === 'light' ? 'Quad.easeOut' : 'Bounce.easeOut',
    });
    if (r.knockPx > 0) {
      // evden (homeX) savrulup eve döner: üst üste darbede birim kaymasın
      this.scene.tweens.add({ targets: this.container, x: { from: this.homeX, to: this.homeX + dir * r.knockPx }, duration: slow(r.knockMs), yoyo: true, ease: 'Quad.easeOut' });
    }
    // pozlu sınıf (Ömer 2026-10-11): önden darbe okunsun diye saldırandan GERİYE eğilip hafifçe çöker (ölçüler data/poses.json > hitRecoil);
    // tek görselli mob / çağrı: yalnızca hafif eğilme (singleLeanDeg)
    const rec = this.rig ? (this.rig.def.hitRecoil ?? { leanDeg: 7, crouch: 0.05 }) : { leanDeg: HIT_REACTION.singleLeanDeg, crouch: 0 };
    const lean = rec.leanDeg * r.leanMult;
    const back = slow(r.recoilMs + (r.tier === 'heavy' ? 120 : 0));
    if (lean > 0) this.scene.tweens.add({ targets: this.sprite, angle: { from: dir * lean, to: 0 }, duration: back, ease: 'Quad.easeOut' });
    if (rec.crouch > 0) {
      // üst üste darbe: önceki çökme durdurulur ve ölçek tabana döner (ölçek kaymasın)
      if (this.crouchTween) {
        this.crouchTween.stop();
        this.sprite.scaleY = this.crouchBaseY;
      }
      const sy = this.sprite.scaleY;
      this.crouchBaseY = sy;
      const tw = this.scene.tweens.add({ targets: this.sprite, scaleY: { from: sy * (1 - rec.crouch * r.crouchMult), to: sy }, duration: back, ease: 'Quad.easeOut' });
      const done = () => {
        if (this.crouchTween === tw) this.crouchTween = undefined;
      };
      tw.on('complete', done).on('stop', done);
      this.crouchTween = tw;
    }
    if (r.shake) this.scene.cameras.main.shake(r.shake.ms, r.shake.intensity);
  }

  /** Fiziksel saldırıdan kaçınma: yana kayıp geri döner. */
  dodge(): void {
    const dir = this.combatant.side === 'enemy' ? 1 : -1;
    this.scene.tweens.add({ targets: this.sprite, x: dir * 46, duration: slow(120), yoyo: true, ease: 'Quad.easeOut' });
    this.floatText('Dodge', colors.dodge, 48, false, { kind: 'dodge' });
  }

  /**
   * Kalkan bloğu (Ömer 2026-10-18): fiziksel vuruş tamamen bloklandı; birim kalkanını kaldırır gibi hafifçe geri çekilir (sarsıntı yok, sayı yok),
   * üstünde çelik renkli "Block" (Dodge ile aynı yazı dili).
   */
  block(): void {
    const dir = this.combatant.side === 'enemy' ? 1 : -1;
    this.scene.tweens.add({ targets: this.sprite, x: dir * 14, duration: slow(70), yoyo: true, ease: 'Quad.easeOut' });
    this.floatText('Block', colors.block, 48, false, { kind: 'dodge' });
  }

  /** Saldıranın isabeti yetmedi (accuracy yüzünden iska): saldıranın üstünde soluk "MISS" yazısı; kendisi kıpırdamaz. */
  missText(): void {
    this.floatText('MISS', colors.miss, 46, false, { kind: 'miss' });
  }

  /**
   * Move Tile: birim yeni yuvaya kayar (kısa yürüyüş: küçük sıçrayışlarla, arkada hafif iz). Yeni yuva birimin yeni "evi" olur.
   * Çubuklar, gölge ve rozetler container'ın içinde olduğundan birlikte gelir. Varışta çözülür.
   */
  moveTo(x: number, y: number, ms = 520): Promise<void> {
    const dx = x - this.homeX;
    this.homeX = x;
    this.baseY = y;
    if (dx !== 0) this.sprite.setFlipX(dx < 0); // yürüdüğü yöne bakar
    this.container.setDepth(Math.max(y, this.container.y) + 2);
    if (this.rig) this.showPose(statePose(this.rig.def, 'step', this.grip));
    else this.play('attack');
    const hops = Math.max(2, Math.round(ms / 170));
    this.scene.tweens.add({ targets: this.sprite, y: { from: 0, to: -16 }, duration: slow(ms) / (hops * 2), yoyo: true, repeat: hops - 1, ease: 'Sine.easeOut' });
    let next = 0;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x,
        y,
        duration: slow(ms),
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const now = this.scene.time.now;
          if (now >= next) {
            this.afterimage(0xe8c47e, 0.28, 220);
            next = now + 55;
          }
        },
        onComplete: () => {
          this.sprite.setY(0);
          this.sprite.setFlipX(this.combatant.side === 'enemy');
          this.container.setDepth(y);
          this.play('idle');
          resolve();
        },
      });
    });
  }

  /**
   * Hasar sayısı: vuruş şiddetiyle büyür ve sarıdan kırmızıya döner; kritikte altın renk, daha iri ve rakamın solunda patlama ikonu;
   * hasarın elementi/kaynağı varsa rakamın sağında küçük element ikonu (ateş, buz, zehir...). Üst üste binmez.
   */
  damageText(amount: number, ratio: number, crit = false, tags: DamageTags = {}): void {
    const level = damageNumberLevel(ratio);
    const px = Math.round(timing.damageNumberMinPx + timing.damageNumberSpanPx * level) + (crit ? timing.damageNumberCritBonusPx : 0); // boyutlar data/battle-layout.json > animation
    const icon = damagePaintedIcon({ ...tags, crit });
    this.floatText(String(amount), crit ? colors.crit : damageColor(level), px, true, {
      kind: crit ? 'crit' : 'damage',
      ...(crit ? { leftIcon: paintedOr('fx', 'crit', 'burst') } : {}),
      ...(icon ? { rightIcon: icon } : {}),
    });
  }

  /**
   * Karakterin üstünde yukarı süzülüp kaybolan sayı/yazı (stil: float-text.ts). Aynı anda birden fazlası şeritlere dizilir (üst üste binmez);
   * ömür data/battle-layout.json > animation.damageNumberMs, son floatFadeMs solar. `opts`: tür (tipografi) ve rakamın yanındaki ikonlar.
   */
  floatText(text: string, hex: string, px = 64, pop = false, opts: FloatOpts = {}): void {
    if (debugState.hideNumbers) return; // debug: numbers and texts above units hidden
    // Yeni yazı, ömrü boyunca yaşayan hiçbir yazıyla çakışmayan en alçak yere (yaş tween zamanıyla: Battle speed / duraklatma)
    const now = this.scene.time.now;
    const ts = this.scene.tweens.timeScale;
    const offset = placeFloatClear(this.floats.map((f) => ({ offset: f.offset, px: f.px, age: (now - f.born) * ts })), px, { life: timing.damageNumberMs, rise: timing.damageNumberRise });
    const lane = this.floats.length;
    const slot = { offset, px, born: now };
    this.floats.push(slot);
    const startY = this.container.y - this.h - 60 - offset;
    const style = floatStyle(opts.kind ?? 'info', px, hex);
    const t = this.scene.add.text(0, 0, text, style).setOrigin(0.5);
    if (style.topLight) {
      try {
        const grad = t.context.createLinearGradient(0, 0, 0, t.height);
        grad.addColorStop(0, style.topLight);
        grad.addColorStop(0.55, hex);
        t.setFill(grad);
      } catch {
        /* düz renk yeter */
      }
    }
    const parts: Phaser.GameObjects.GameObject[] = [];
    const sizeOf = (o: Phaser.GameObjects.GameObject) => (o as Phaser.GameObjects.Image).displayWidth;
    const mk = (kind: string): Phaser.GameObjects.Image => {
      const img = this.scene.add.image(0, 0, ensureIcon(this.scene, kind, FLOAT_ICON_TINT[kind] ?? hex, false));
      const d = Math.round(px * (kind === 'burst' || kind.includes(':') ? 0.66 : 0.58)); // boyalı ikonlar (kenar paylı) patlama boyunda
      return img.setDisplaySize(d, d).setOrigin(0.5);
    };
    const left = opts.leftIcon ? mk(opts.leftIcon) : null;
    const right = opts.rightIcon ? mk(opts.rightIcon) : null;
    if (left) parts.push(left);
    parts.push(t);
    if (right) parts.push(right);
    const { lefts } = rowLayout(parts.map((o) => (o === t ? t.width : sizeOf(o))), -Math.round(px * 0.07));
    parts.forEach((o, i) => (o as Phaser.GameObjects.Image).setX(lefts[i]! + (o === t ? t.width : sizeOf(o)) / 2));
    if (opts.kind === 'crit') {
      // Kritik: rakamın arkasında yumuşak kor ışıması (tasarım kiti: kor vurgu)
      const glow = this.scene.add.image(0, 0, ensureGlow(this.scene)).setTint(KIT.ember).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(px * 3.4, px * 1.9).setAlpha(0.55);
      parts.unshift(glow);
    }
    const box = this.scene.add.container(this.container.x, startY, parts).setDepth(5000 + lane);
    const times = floatTimes(timing.damageNumberMs, timing.floatFadeMs);
    if (pop) {
      box.setScale(0.4);
      this.scene.tweens.add({ targets: box, scale: 1, duration: 220, ease: 'Back.easeOut' });
    }
    this.scene.tweens.add({ targets: box, y: startY - timing.damageNumberRise, duration: times.total, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({
      targets: box,
      alpha: 0,
      delay: times.fadeDelay,
      duration: times.fade,
      onComplete: () => {
        box.destroy();
        this.floats = this.floats.filter((f) => f !== slot);
      },
    });
  }

  // --- Hover önizlemesi: can çubuğunda hayalet parça + hasar/şifa/kalkan yazısı ---

  /** Bir skill'in bu karaktere tahmini etkisini çubukta ve yazıyla gösterir. */
  showPreview(p: TargetPreview): void {
    this.clearPreview();
    const W = hpBar.width;
    const curFrac = Math.max(0, this.combatant.hp / this.combatant.maxHp);
    const segment = (parent: Phaser.GameObjects.Container | null, x: number, y: number, w: number, h: number, hex: string) => {
      const r = this.scene.add.rectangle(x, y, Math.max(2, w), h, color(hex), 0.85).setOrigin(0, 0.5);
      (parent ?? this.container).add(r);
      this.scene.tweens.add({ targets: r, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });
      this.previewItems.push(r);
    };
    const lines: Array<[string, string, number]> = []; // [yazı, renk, punto]

    if (p.damage) {
      const d = p.damage;
      if (d.hpLoss > 0) {
        const newFrac = Math.max(0, (this.combatant.hp - d.hpLoss) / this.combatant.maxHp);
        segment(this.hpBox, -W / 2 + newFrac * W, this.hpY, (curFrac - newFrac) * W, hpBar.height - 4, colors.previewDamage);
      }
      const range = d.min === d.max ? '' : `${d.min}-${d.max}`;
      const blocked = d.absorbed > 0 ? `${range ? ' ' : ''}(${d.absorbed} blocked)` : '';
      if (d.lethal) {
        const skull = this.scene.add.image(0, -this.h / 2, ensureIcon(this.scene, 'skull', colors.lethal, false)).setDisplaySize(120, 120).setAlpha(d.lethal === 'sure' ? 0.95 : 0.55);
        this.container.add(skull);
        this.previewItems.push(skull);
        this.scene.tweens.add({ targets: skull, scale: skull.scale * 1.12, duration: 420, yoyo: true, repeat: -1 });
      }
      lines.push([d.hpLoss === 0 ? 'Blocked' : `-${d.avg}`, damageColor(damageNumberLevel(d.hpLoss / this.combatant.maxHp)), 46]);
      lines.push([formatHit(d.hitChance), hitColor(d.hitChance), 26]); // hasar satırının hemen altında
      if (blocked) lines.push([blocked.trim(), colors.muted, 24]);
      if (d.splash) lines.push(['splash', colors.muted, 22]);
    }
    if (p.heal && p.heal.avg > 0) {
      const newFrac = Math.min(1, (this.combatant.hp + p.heal.avg) / this.combatant.maxHp);
      segment(this.hpBox, -W / 2 + curFrac * W, this.hpY, (newFrac - curFrac) * W, hpBar.height - 4, colors.previewHeal);
      lines.push([`+${p.heal.avg}`, colors.heal, 46]);
    } else if (p.heal) {
      lines.push(['Full HP', colors.muted, 30]);
    }
    if (p.hot) {
      const newFrac = Math.min(1, (this.combatant.hp + p.hot.total) / this.combatant.maxHp);
      if (p.hot.total > 0) segment(this.hpBox, -W / 2 + curFrac * W, this.hpY, (newFrac - curFrac) * W, hpBar.height - 4, colors.previewHeal);
      lines.push([`+${p.hot.perTurn} x${p.hot.turns} turns`, colors.heal, 34]);
    }
    if (p.ground) lines.push([`-${p.ground.perTick} x${p.ground.turns} turns`, colors.burn, 34]);
    if (p.shield) {
      const bar = p.shield.magic ? this.magicShieldFill : this.shieldFill;
      const extra = Math.min(W - bar.width, (W * p.shield.amount) / this.combatant.maxHp);
      segment(null, -W / 2 + bar.width, bar.y, Math.max(4, extra), 8, p.shield.magic ? colors.magicShield : colors.shield);
      lines.push([`+${p.shield.amount} ${p.shield.magic ? 'magic shield' : 'shield'}`, p.shield.magic ? colors.magicShield : colors.shield, 34]);
    }
    if (p.burn) lines.push([`-${p.burn} MP`, colors.burn, 36]);
    // Drain Field (madde 260): manası bitecek hedefte zar: "50%: Silenced 1t + 12-15 dmg"
    if (p.emptyProc) lines.push([`${Math.round(p.emptyProc.chance * 100)}%: ${p.emptyProc.statusName} ${p.emptyProc.turns}t${p.emptyProc.damage ? ` + ${p.emptyProc.damage.min}-${p.emptyProc.damage.max} dmg` : ''}`, colors.burn, 30]);
    for (const s of p.statuses ?? []) lines.push([s, colors.targetHighlight, 30]);

    // Yazılar ismin üstünde, alttan yukarı dizilir (en önemli satır en altta durur)
    let y = this.hpY - hpBar.height - 44;
    for (const [text, hex, px] of [...lines].reverse()) {
      const t = this.scene.add.text(0, y, text, numStyle(px, hex)).setOrigin(0.5, 1);
      this.container.add(t);
      this.previewItems.push(t);
      y -= px * 1.05;
    }
  }

  clearPreview(): void {
    for (const item of this.previewItems) {
      this.scene.tweens.killTweensOf(item);
      item.destroy();
    }
    this.previewItems = [];
  }

  fadeIn(): void {
    this.container.setAlpha(0);
    this.ring(colors.heal, 1.2);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: slow(350) });
  }

  /** Süresi dolan çağrı: ölmez, sessizce solar. */
  vanish(): Promise<void> {
    this.setEmpowered(false);
    this.setVineWrap(false);
    this.setGlow(null);
    this.setActive(false);
    this.clearPreview();
    this.ring(colors.heal, 0.9);
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this.container, alpha: 0, duration: slow(500), onComplete: () => resolve() });
    });
  }

  die(): Promise<void> {
    this.setVineWrap(false);
    this.setEmpowered(false);
    this.play('death');
    this.setGlow(null);
    this.setActive(false);
    this.clearPreview();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        y: this.container.y + (this.rig ? 6 : 20),
        duration: timing.deathFadeMs,
        ...(this.rig ? { ease: 'Quad.easeIn' } : {}), // pozlu: diz çökme pozu sönmeden önce okunur (süre aynı)
        onComplete: () => {
          this.fallen = true;
          resolve();
        },
      });
    });
  }

  /** Savaş zaten bu birim düşmüşken başladıysa/yüklendiyse: ölüm animasyonu oynamadan sahneden kalkar (ceset işareti ayrıca çizilir). */
  markFallen(): void {
    this.fallen = true;
    this.setGlow(null);
    this.setActive(false);
    this.container.setAlpha(0);
  }

  /**
   * Diriltme: düşmüş birim canlanır. `at` verilirse (madde 257: Resurrection seçilen BOŞ hücreye diriltir) görünmezken o hücreye ışınlanır ve orası
   * yeni "evi" olur; verilmezse olduğu yerde.
   */
  revive(hp: number, mp: number, at?: { x: number; y: number }): void {
    this.fallen = false;
    this.setGlow(null);
    this.scene.tweens.killTweensOf(this.container);
    if (at) {
      this.homeX = at.x;
      this.baseY = at.y;
      this.container.setX(at.x).setDepth(at.y);
    }
    this.container.setY(this.baseY).setAlpha(0);
    this.setHp(hp, false);
    this.setMp(mp, false);
    this.setShield(0, 0, false);
    this.play('idle');
    this.ring(colors.heal, 1.2);
    this.floatText('Revived', colors.heal, 48, false, { kind: 'heal' });
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: slow(450) });
  }
}
