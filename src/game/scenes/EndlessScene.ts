import { woundCount, woundsLine } from '../../progression/wounds';
import { closeAllLessons, showLesson } from '../../ui/lesson-box';
import Phaser from 'phaser';
import { uiSound, type UiSoundKind } from '../../ui/ui-sound';
import { sceneMusic } from '../../ui/music';
import layout from '../../../data/battle-layout.json';
import { content, placementHintText, primaryBonusInfo } from '../../engine';
import { hintBadge, hintColor } from '../formation-hint-ui';
import { hideReachTip, reachTipOn, showReachTip } from '../reach-tip-dom';
import type { CombatantDef } from '../../engine/types';
import { ValorMeter, isValorReviveOpen, openValorRevive, otherDialogOpen, rememberShown } from '../../ui/valor-braziers';
import { isInputLocked } from '../../ui/input-lock';
import { isSettingsOpen } from '../../ui/settings';
import { avatarUrl } from '../../ui/character-panel';
import { endlessWoundRules, reviveWithValor, valorReviveBlocked } from '../../endless';
import { rewardBlockedReason, takeRareDrop,
  ENDLESS,
  UI_TEXT as T,
  itemStatRows,
  type ItemRolls,
  chooseRelic,
  heroOf,
  relicDef,
  cardText,
  cardTitle,
  chooseReward,
  itemOptions,
  className,
  endlessBack,
  endlessView,
  gearScore,
  leaveShop,
  rarityColor,
  resumeLabel,
  bagOf,
  endlessBagSize,
  gearLockReason,
  suspendedOf,
  waveKind,
  wavePlan,
  type EndlessHero,
  type EndlessRun,
  type EndlessView,
  type RewardCard,
  type ScoreEntry,
  autoDraft,
  heroSlots,
  newDraft,
  emptyDraft,
  placeInDraft,
  removeFromDraft,
  draftClassAt,
  type FormationDraft,
} from '../../endless';
import { SLOT_IDS, TIER_COLOR, affixTip, canEquip, defaultEquipSlot, equipInto, clampRarity, effectLine, heroStats, itemDef, itemSubtitle, sellValue, slotDef, weaponPowerOf, type AffixLine, type ItemDef } from '../../progression';
import type { Stats } from '../../engine/types';
import { statIcon, statTip, statTipParts } from '../../ui/stat-tips';
import { bandTip, type BandTipSpec, type PhChip, type PhLine } from '../band-tip';
import { archetypeOf, rangeOf } from '../team-select-model';
import { ownerOfUnit } from '../asset-versions';
import { classLogoName } from '../../ui/misc-icons';
import { backgroundKey, hasBackground, preloadAssets } from '../assets';
import { classSpriteIds } from '../sprite-needs';
import { classAvatar, fitText } from '../menu-ui';
import { EL, diamondPts, elBack, elBody, elButton, elConfirm, elConfirmOpen, elGo, elHeading, elIconButton, elPanel, elScreenIn, elText, elToast, fadeLine, placeElTip, vGradient, type ElButton } from '../elegant-ui';
import { motion, MOTION } from '../../ui/motion';
import { SlotDrag, makeDragGhost } from '../slot-drag';
import { ensureGlow } from '../menu-ui';
import { feastEmblem, healEmblem, hexNum, itemEmblem, medallion, purseEmblem } from '../endless-emblems';
import { openEndlessGear } from '../endless-gear';
import { openEndlessMerchant } from '../endless-merchant';
import { endlessGearSource } from '../endless-gear';
import { openRewardBag, type RewardTile } from '../../ui/reward-bag';
import { ms as motionMs } from '../../ui/motion';
import { ensureIcon } from '../icons';
import { hasUiImage, uiIconName, type UiIconKind } from '../../ui/ui-icons';
import { paintedOr } from '../../ui/misc-icons';
import { onStageResize, stageView } from '../stage';
import { touchUnits } from '../touch-hit';
import { FULL_W, FULL_X0 } from '../../ui/viewport';
import { menuFontsReady, whenMenuFontsReady } from '../../ui/menu-fonts';
import { groupColor, sortByPrimary } from '../class-order';
import { ENDLESS_SCENE, abandon, commit, continueRun, endless, openPause, savedRun, scores, startRun, startWave } from '../endless-session';

/** Stat ipucundaki fark renkleri (DOM Gear ile aynı: gear.css > .gr-tip-d.up / .down). */
const TIP_UP = '#8fe39a';
const TIP_DOWN = '#ff8a7a';

/**
 * Örneğin nadirliğiyle görünüm tanımı (Ömer 2026-10-11: nadirlik örnekte, taban nadirlikten bağımsız): çerçeve rengi, ad rengi, alt başlık
 * örneğin nadirliğini gösterir. Zar yoksa / aynıysa tanım aynen.
 */
const viewDef = (d: ItemDef | undefined, rolls?: ItemRolls): ItemDef | undefined => (d && rolls?.rarity && rolls.rarity !== d.rarity ? { ...d, rarity: clampRarity(d, rolls.rarity) } : d);

/** Affix satırının yazısı (kademe etiketi ayrı çizilir): "+6% Crit chance (5–7)". */
const chipText = (l: AffixLine): string => `${l.text}${l.range ? ` (${l.range})` : ''}`;

export interface EndlessSceneData {
  /** 'title': başlık ekranıyla aç (ana menü / debug); 'pick': doğrudan takım seçimi. Yoksa bellekteki koşunun aşaması. */
  view?: 'title' | 'pick';
  /**
   * Sürekli akış (madde 300): ara verme panelleri savaş alanının (BattleScene) ÜSTÜNDE: arka plan resmi yok, hafif koyulaştırma; kamp görünümü
   * sade (kahramanlar savaş alanında görünür). Başlık / seçim / skor görünümüne geçince tam ekrana döner.
   */
  overlay?: boolean;
}

const W = layout.width;
const H = layout.height;
const CX = W / 2;
const PRIMARY_COLORS = layout.colors.primaryGroup as Record<string, string>;

/** Görünüm sabitleri (yeniden tasarımda yalnızca burası ve çizim yardımcıları değişir). Yazılar: src/endless/ui-text.ts. */
const LOOK = {
  bg: 'proving-grounds-sunset',
  shade: 0.72,
  /** Sürekli akış overlay'i: savaş alanının üstündeki koyulaştırma (kamp / diğer paneller). */
  overlayShade: { camp: 0.18, panel: 0.6 },
  color: { text: '#d9c8a2', dim: '#9c8a68', warn: '#e0806a', accent: '#e8c47e', bright: '#f3d999', sub: '#cdb88d', stat: '#f0e2bf', empty: '#5d5040' },
  headingY: 118,
  subY: 204,
  buttonY: 920,
  /** Seçim kartları (ödül + kalıntı): kart yüksekliği içinde alttaki `cta` bandı içeriğe AYRILMIŞTIR (içerik asla Take'e taşmaz). */
  card: { top: 262, h: 630, maxW: 440, gap: 40, cta: 86, medal: 54 },
} as const;
const C = LOOK.color;

/**
 * Telefon (html.short) yardımcısı, ÖDÜL ekranı: sahne ~0,36 küçüldüğü için ikincil yazı ~7 gerçek piksele düşüyordu. `phoneBoost()` çizim
 * başına BİR kez okunur (yeniden ölçeklenince yeniden çizilir); masaüstünde `PH_OFF` hiçbir şeyi değiştirmez.
 */
const PHONE = {
  /** En küçük gerçek piksel: ikincil yazı / en küçük etiket (kicker, USABLE BY). */
  textPx: 11.5,
  smallPx: 9.5,
  /** Ad satırı, ikincil yazıya göre bu kadar büyük (hiyerarşi korunsun). */
  nameBump: 4,
  /** Kart kutusu (üst, yükseklik, en çok genişlik): geniş telefon sahnesinde kartlar daha geniş; alt kenar View bag dokunma alanından önce biter. */
  card: { top: 268, h: 672, maxW: 560, medal: 40 },
  /** Kartların iki yanda bırakacağı boşluk (sahne birimi). */
  edge: 90,
  /** Stat satırı aralığı (yazı büyüyünce) ve harf aralığı (kicker / USABLE BY). */
  rowPitch: 40,
  em: 0.1,
  /** Alt başlık şeridi: koyu mürekkep + ince altın çizgi. */
  strip: { padX: 36, h: 52, alpha: 0.82 },
  /** Telefonda ödül ekranı düğmesi: genişlik ve yükseklik çarpanı (yazı büyüdü). */
  btnW: 1.5,
  btnH: 1.35,
  /** Telefonda düğme ve stat satırı ipucu alanı en az bu kadar gerçek piksel. */
  touchPx: 44,
  /** Kahraman satırı (iyileştirme kartı) en yüksek satır. */
  healRowMax: 70,
  /** Epic / legendary etki satırı telefonda en çok kaç satıra sarılır. */
  effectLines: 2,
  /** Alt başlığın tek satır yüksekliği (sarılınca ek yükseklik buna göre). */
  subLineH: 40,
} as const;

interface Ph {
  on: boolean;
  /** Sahne birimi yazı boyutu: telefonda en az `textPx` (ya da `small` ise `smallPx`) gerçek piksel. */
  fs(size: number, small?: boolean): number;
  /** Masaüstü değeri / telefon değeri. */
  pick<T>(desk: T, phone: T): T;
}
const PH_OFF: Ph = { on: false, fs: (n) => n, pick: (d) => d };
/**
 * Takım seçimi + dizilim ekranı (Ömer 2026-10-10): solda kadro kartları, sağda 4 sıra x 3 şerit ızgara (ön sıra sağda, düşmana bakar;
 * seferin Formation penceresiyle aynı düzen). 1920x1080 birimi; telefonda okunur olsun diye yazılar en az ~17.
 */
const PICK = {
  labelY: 272,
  roster: { x: 140, top: 326, cols: 6, step: 156, avatar: 116, rowH: 200 },
  grid: { x: 1196, top: 318, cell: 132, gap: 10 },
  dragPx: 12,
  ghostLift: 56,
} as const;

/** Takım seçiminde sürüklenen: class, kaynağı (hücre; -1 = kadro) ve kaynağın görseli (sürüklerken solar). */
interface PickDrag {
  cls: string;
  from: number;
  src?: Phaser.GameObjects.Image;
}

/** Seçim kartının çizim bağlamı: `add` kart içine, `addTop` kartın dokunma alanının üstüne (ipucu alanları). */
interface CardCtx {
  cx: number;
  w: number;
  top: number;
  bottom: number;
  x0: number;
  x1: number;
  add: (obj: Phaser.GameObjects.GameObject) => void;
  addTop: (obj: Phaser.GameObjects.GameObject) => void;
}

/** Tüccar ekranında seçili öğe: tezgâhtaki mal (sıra), torbadaki item (uid) ya da geri alım satırı (sıra). */

/**
 * Endless Lite ekranı (roadmap.md bölüm 3; open-questions madde 281). Görünümler: başlık (Continue / Resume / New Run / en iyi koşular), takım seçimi,
 * kamp (sıradaki dalga ya da yarım kalan savaşa devam), ödül kartları, dükkân, koşu sonu. Kurallar src/endless/ (saf), oturum
 * src/game/endless-session.ts, yazılar src/endless/ui-text.ts. Yapı: her görünüm `draw<Görünüm>()` içinde baştan çizilir; oyuncu eylemleri
 * `act*` yöntemlerinde (ekran düzeninden bağımsız); çizim yardımcıları (heading, note, label, button, panel, avatar, hpBar) ortak.
 */
export class EndlessScene extends Phaser.Scene {
  static readonly KEY = ENDLESS_SCENE;
  private view: EndlessView = 'title';
  private requested: EndlessSceneData['view'];
  private root!: Phaser.GameObjects.Container;
  private backBtn: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Image | null = null;
  /** Takım seçiminde ipucu gösterilen kahraman (fare: üstüne gelinen; dokunmatik: sabitlenen). src: kadro (r) ya da ızgara (g). */
  private tipHero: { id: string; src: 'r' | 'g'; pinned: boolean } | null = null;
  private confirm: { close(): void } | null = null;
  private pending = false;
  /** Açık tooltip (kalıntı ikonu). */
  private tip: Phaser.GameObjects.Container | null = null;
  /** İpucunu açan stat satırı alanı (dokunmatikte ikinci dokunuş kapatır). */
  private tipOwner: Phaser.GameObjects.Zone | null = null;
  /** Seçim kartları: seçili kart (dokunmatik: ilk dokunuş seçer, ikinci dokunuş / Take alır) ve kartların görünüm güncelleyicileri. */
  private cardSel = -1;
  private cards: Array<{ setState(hover: boolean, selected: boolean): void; take(): void; box?: Phaser.GameObjects.Container }> = [];
  /** Ödül ekranının açık DOM torbası (View bag; Ömer 2026-10-11) ve kapanınca kartların soldan geri gelme animasyonu. */
  private rewardBag: (() => void) | null = null;
  private cardsFromBag = false;
  /** Telefon yardımcısı (yalnız ödül / item seçimi çizerken kurulur; renderNow sıfırlar) ve onun çizildiği ölçek (yeniden ölçekleme denetimi). */
  private ph: Ph = PH_OFF;
  private phDrawn = '';
  /** Açık iki seçenekli item kartı (ödül kartının dizini; Ömer 2026-10-18, TUR 1 madde 13). Yoksa null. */
  private itemPick: number | null = null;
  /** Gear ekranı (DOM) açık mı. */
  private gearOpen = false;
  /** Açık DOM tüccar ekranının kapatıcısı (Ömer 2026-10-11: tüccar ortak Inventory ile DOM'da). */
  private shopDom: (() => void) | null = null;
  /** Karşılaması gösterilen son tüccar ziyareti (seed|dalga): aynı ziyarette yeniden çizimde karşılama tekrar etmez. */
  private static shopWelcomed = '';
  /** Bildirim (alt orta). */
  private toast: ((msg: string, sound?: UiSoundKind | null) => void) | null = null;
  /**
   * Takım seçimi + koşu başı dizilimi TEK ekranda (Ömer 2026-10-10; eski ayrı Formation penceresi kaldırıldı): seçilen class'lar ve hücreleri.
   * Sürükleme: ortak SlotDrag (src/game/slot-drag.ts), yük = PickDrag.
   */
  private draft: FormationDraft = emptyDraft();
  private drag: SlotDrag<PickDrag> | null = null;
  /** Bırakma hedefi: hücre, -2 = kadro (çıkar), -1 yok. */
  private dropHot = -1;
  /** Dokunarak taşıma: seçili ızgara kahramanı (sonra hücreye dokun). */
  private pickSel = '';
  /** Seçim ekranının hedef çizimi (sürüklerken yeniden çizilir). */
  private pickFx: Phaser.GameObjects.Graphics | null = null;
  /** Sürekli akış: savaş alanının üstünde açılan ara verme panelleri (EndlessSceneData.overlay). */
  private overlay = false;
  /** Koyulaştırma katmanı (overlay'de görünüme göre: kampta hafif, kart / tüccarda koyu). */
  private shade: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super(ENDLESS_SCENE);
  }

  init(data: EndlessSceneData): void {
    this.requested = data?.view;
    this.overlay = !!data?.overlay;
    this.draft = emptyDraft();
    this.drag = null; // create() kurar (sahne yeniden başlayınca eski dinleyiciler giriş eklentisiyle silinir)
    this.dropHot = -1;
    this.pickSel = '';
    this.tipHero = null;
    this.confirm = null;
    this.backBtn = null;
    this.bg = null;
    this.pending = false;
    this.toast = null;
  }

  preload(): void {
    // sınıf / çağrı / tüccar görselleri (Endless düşmanları da sınıf; moblar yalnızca sefer savaşında): telefon belleği, src/game/sprite-needs.ts
    const sprites = classSpriteIds();
    preloadAssets(this, { sprites, avatars: sprites });
  }

  create(): void {
    sceneMusic('camp'); // Endless başlığı / kamp / ödül / tüccar: gece kamp müziği (dalga başlayınca BattleScene savaş müziğine geçer)
    // Sürekli akış: koşu ara vermedeyse (kamp / ödül / tüccar / kalıntı) paneller savaş alanının üstünde açılır (BattleScene + overlay)
    if (!this.overlay && !this.requested) {
      if (!endless.run) continueRun();
      const v = endlessView(endless.run);
      if (v !== 'title' && v !== 'over' && openPause(this)) return;
    }
    if (!this.overlay) {
      elScreenIn(this); // ortak ekran geçişi (data/ui-motion.json > screen; Reduced motion = anında)
      this.cameras.main.setBackgroundColor('#0d0a07');
    }
    // Phaser yazıları çizildiği andaki fontla kalır: menü fontları hazır değilse bekle ve yeniden kur (ana menüyle aynı)
    if (!menuFontsReady()) {
      void whenMenuFontsReady().then(() => {
        if (this.sys.isActive()) this.scene.restart({ view: this.requested, overlay: this.overlay });
      });
      return;
    }
    if (!this.overlay && hasBackground(this, LOOK.bg)) this.bg = this.add.image(CX, H / 2, backgroundKey(LOOK.bg)).setDepth(0);
    this.shade = this.add.rectangle(FULL_X0, 0, FULL_W, H, 0x080604, LOOK.shade).setOrigin(0, 0).setDepth(1);
    this.root = this.add.container(0, 0).setDepth(10);
    // Takım seçimi sürükle-bırak: ortak yardımcı (src/game/slot-drag.ts; Quick Battle ile aynı hayalet kart + gölge). Sahne kapanınca
    // giriş eklentisi dinleyicileri siler.
    this.drag = new SlotDrag<PickDrag>(this, {
      threshold: PICK.dragPx,
      lift: PICK.ghostLift, // parmak altında kalmasın: biraz yukarıda
      ghost: (d) => {
        const def = content.classes[d.cls];
        return def ? makeDragGhost(this, def, { size: PICK.grid.cell - 24, depth: 50 }) : undefined;
      },
      onStart: (d) => {
        this.clearHeroTip();
        this.pickSel = '';
        d.src?.setAlpha(0.25);
        this.drawPickFx();
      },
      onMove: (_d, q) => {
        const t = this.view === 'pick' ? this.pickTarget(q.x, q.y) : -1;
        if (t !== this.dropHot) {
          this.dropHot = t;
          this.drawPickFx();
        }
      },
      onEnd: (d) => {
        this.dropHot = -1;
        if (d.src?.active) d.src.setAlpha(d.from < 0 && this.draft.classes.includes(d.cls) ? 0.4 : 1);
        this.drawPickFx();
      },
      onDrop: (d, q) => {
        if (this.view === 'pick') this.actDrop(d.cls, d.from, this.pickTarget(q.x, q.y, d));
      },
    });
    // Dokunmatik: sabitlenmiş kahraman ipucu, kahramana olmayan bir yere dokununca kapanır
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.view === 'pick' && this.tipHero?.pinned && !over.some((o) => o.getData('heroTip'))) this.clearHeroTip();
    });
    this.toast = elToast(this, 1046); // alt orta: tüccarın sekmeleri ve torba başlığıyla çakışmasın
    // Bellekte koşu yoksa kayıtlıyı yükle (sayfa yenilendi / ana menüden geldi); bitmiş koşu bellekte yalnızca skor ekranı için durur
    if (!endless.run) continueRun();
    this.view = endlessView(endless.run, this.requested);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.events.once('shutdown', () => {
      closeAllLessons();
      this.closeShopDom();
      this.rewardBag?.();
      this.rewardBag = null;
      this.valorMeter?.destroy();
      this.valorMeter = null;
    });
    // Valor mangalları: Gear / torba / pencere açıkken gizli
    this.events.on('update', () => {
      if (!this.valorMeter) return;
      const hide = this.gearOpen || !!this.rewardBag || isValorReviveOpen() || otherDialogOpen();
      if (this.valorMeter.el.hidden !== hide) this.valorMeter.el.hidden = hide;
    });
    onStageResize(this, () => {
      this.layoutStage();
      if (this.view === 'reward' && this.phoneKey() !== this.phDrawn) this.render();
    });
    this.renderNow();
  }

  // ============================================================ oyuncu eylemleri (düzenden bağımsız)

  private actStartPick(): void {
    this.draft = emptyDraft();
    this.pickSel = '';
    this.go('pick');
  }

  private actContinue(): void {
    continueRun();
    this.go(endlessView(endless.run));
  }

  /** Yarım kalan savaşa dön (kayıttaki tura). */
  private actResume(): void {
    if (!endless.run) continueRun();
    startWave(this, true);
  }

  private actFight(): void {
    startWave(this);
  }

  /** Yeni koşu: mevcut koşu (ve yarım savaşı) biter, skoru yazılır; onay ister. */
  private actNewRun(): void {
    const run = savedRun();
    if (!run) return this.actStartPick();
    this.ask(suspendedOf(run) ? T.confirmNewRunSuspended : T.confirmNewRun, () => {
      if (!endless.run) continueRun();
      abandon();
      endless.run = null;
      this.actStartPick();
    });
  }

  private actAbandon(): void {
    this.ask(T.confirmAbandon, () => {
      abandon();
      this.go('over');
    });
  }

  private actRandomize(): void {
    const pool = [...content.randomPool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    this.draft = newDraft(pool.slice(0, ENDLESS.partySize)); // önerilen (otomatik) dizilimle
    this.pickSel = '';
    this.render();
  }

  /** Kadrodaki karta dokunma: takımda değilse önerilen hücreye ekler (takım doluysa uyarır), takımdaysa çıkarır. */
  private actTogglePick(id: string): void {
    if (this.draft.classes.includes(id)) return this.setDraft(removeFromDraft(this.draft, id), 'back');
    const next = placeInDraft(this.draft, id, ENDLESS.partySize);
    if (next === this.draft) return this.pickFull();
    this.setDraft(next, 'select');
  }

  /** Izgara hücresine dokunma: önce kahramanı seç, sonra hücreye dokun (boşsa taşır, doluysa yer değiştirir); seçiliye yine dokunmak bırakır. */
  private actTapCell(cell: number): void {
    const here = draftClassAt(this.draft, cell);
    if (!this.pickSel) {
      if (!here) return;
      this.pickSel = here;
      uiSound('select');
      return this.render();
    }
    const sel = this.pickSel;
    this.pickSel = '';
    if (sel === here) return this.render();
    this.setDraft(placeInDraft(this.draft, sel, ENDLESS.partySize, cell), 'select');
  }

  /** Sürükleyip bırakma: hücreye (ekle / taşı / yer değiştir) ya da kadroya (çıkar). */
  private actDrop(cls: string, from: number, target: number): void {
    if (target === -2) return from >= 0 ? this.setDraft(removeFromDraft(this.draft, cls), 'back') : undefined;
    if (target < 0 || target === from) return;
    const next = placeInDraft(this.draft, cls, ENDLESS.partySize, target);
    if (next === this.draft) return this.pickFull();
    this.setDraft(next, 'select');
  }

  private actAutoArrange(): void {
    if (!this.draft.classes.length) return;
    this.pickSel = '';
    this.setDraft(autoDraft(this.draft), 'select');
  }

  private setDraft(d: FormationDraft, sound: UiSoundKind): void {
    if (d !== this.draft) uiSound(sound);
    this.draft = d;
    this.render();
  }

  private pickFull(): void {
    this.toast?.(T.pickFull(ENDLESS.partySize), 'error');
  }

  /** Start Run: koşu ekranda dizilen hücrelerle hemen başlar (ayrı dizilim penceresi yok). */
  private actBeginRun(): void {
    const d = this.draft;
    if (d.classes.length !== ENDLESS.partySize) return;
    startRun(d.classes, d.slots);
    this.go('camp');
  }

  private actTakeReward(run: EndlessRun, index: number, option?: number): void {
    // Çok seçenekli item kartı (TUR 1 madde 13; karar 364: 3 seçenek): kart açılır, item'ler kalıntı teklifi gibi yan yana; biri alınır
    const card = run.offer?.[index];
    if (option === undefined && card?.kind === 'item' && itemOptions(card).length > 1) {
      if (rewardBlockedReason(run, card)) return;
      uiSound('open');
      this.itemPick = index;
      this.render();
      return;
    }
    const next = chooseReward(run, index, undefined, undefined, option ?? 0);
    if (next === run) return;
    this.itemPick = null;
    commit(next);
    this.go(endlessView(next));
  }

  /** Item kartının seçenekleri (2-3; kalıntı seçimiyle aynı kart dili); "Back" ödül kartlarına döner. 1920 içinde yan yana sığar. */
  private drawItemPick(run: EndlessRun, index: number, special: 'elite' | 'boss' | null): boolean {
    const card = run.offer?.[index];
    if (!card || card.kind !== 'item') return false;
    const opts = itemOptions(card);
    if (opts.length < 2) return false;
    const n = opts.length;
    this.heading(T.itemPickTitle, T.itemPickSub(n));
    const gap = 60;
    const w = this.cardWidth(n, gap, this.ph.pick(520, PHONE.card.maxW));
    opts.forEach((o, i) => {
      const d = viewDef(itemDef(o.itemId), o.rolls);
      if (!d) return;
      const accent = hexNum(rarityColor(d));
      this.choiceCard({ index: i, cx: CX + (i - (n - 1) / 2) * (w + gap), w, rich: !!special, accent, tint: EndlessScene.TINT.item, kicker: T.kickerItem(special), take: () => this.actTakeReward(run, index, i), rarity: true }, (k) => {
        const R = this.cardBox().medal;
        const m = medallion(this, itemEmblem(this, d, rarityColor(d)), accent, R, { rich: !!special });
        m.setPosition(k.cx, k.top + R + 18);
        k.add(m);
        this.itemCardBody(run, d, k, k.top + R * 2 + this.ph.pick(52, 26), o.heroId, o.rolls);
        this.sellTag(sellValue({ id: d.id, ...(o.rolls ? { rolls: o.rolls } : {}) }), k.x1 - 18, k.top + 6, k.add);
      });
    });
    this.button(CX, 1000, 300, T.itemPickBack, () => {
      uiSound('back');
      this.itemPick = null;
      this.render();
    });
    return true;
  }

  /** Bekleyen nadir düşüşü torbaya al (yer açıldıysa). */
  private actTakeRare(): void {
    const run = endless.run;
    if (!run) return;
    const next = takeRareDrop(run);
    if (next === run) return uiSound('error');
    commit(next);
    this.render();
  }

  private actChooseRelic(run: EndlessRun, id: string): void {
    const next = chooseRelic(run, id);
    if (next === run) return;
    commit(next);
    this.go(endlessView(next));
  }

  private actLeaveShop(run: EndlessRun): void {
    const next = leaveShop(run);
    commit(next);
    this.go(endlessView(next));
  }

  private actMainMenu(): void {
    if (endless.run?.phase === 'over') endless.run = null;
    if (this.overlay) this.scene.stop('BattleScene'); // savaş alanı da kapanır (koşu kayıtlı)
    elGo(this, 'MainMenuScene');
  }

  private back(): void {
    if (this.confirm) return this.closeConfirm();
    const to = endlessBack(this.view);
    if (to === 'menu') this.actMainMenu();
    else if (to === 'title') {
      if (endless.run?.phase === 'over') endless.run = null;
      this.go('title');
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (this.gearOpen || elConfirmOpen(this)) return;
    // Takım seçimi: Esc önce dokunarak seçilen kahramanı bırakır
    if (e.key === 'Escape' && this.view === 'pick' && this.pickSel) {
      this.pickSel = '';
      return this.render();
    }
    if (e.key === 'Escape') return this.back();
    // C = Gear (Ömer 2026-10-18, oyun geneli): yalnızca kampta, başka pencere / ödül çantası / mağaza / ayar açık değilken (Gear kendisi C ile kapanır)
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      const run = endless.run;
      if (!typing && this.view === 'camp' && run && !gearLockReason(run) && !this.rewardBag && !isInputLocked() && !isSettingsOpen() && !otherDialogOpen()) this.actGear();
      return;
    }
    // Seçim kartları: 1-4 seçer, Enter alır, ←/→ dolaşır
    if (!this.cards.length) return;
    const n = Number(e.key);
    if (n >= 1 && n <= this.cards.length) this.selectCard(n - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.selectCard(Math.max(0, Math.min(this.cards.length - 1, (this.cardSel < 0 ? 0 : this.cardSel) + (e.key === 'ArrowLeft' ? -1 : 1))));
    else if (e.key === 'Enter' && this.cardSel >= 0) this.cards[this.cardSel]?.take();
  }

  private selectCard(i: number): void {
    this.cardSel = i;
    this.cards.forEach((c, k) => c.setState(false, k === i));
  }

  /** Kamp > Gear: seferin Gear ekranı, endless kaynağıyla (torba + kuşanma). */
  private actGear(hero?: string): void {
    const run = endless.run;
    const root = document.getElementById('ui-root');
    if (!run || !root || this.gearOpen) return;
    this.gearOpen = true;
    openEndlessGear(root, () => endless.run!, (r) => commit(r), () => {
      this.gearOpen = false;
      this.render();
    }, hero);
  }

  // ============================================================ görünüm döngüsü

  /** Telefon durumu + ölçek anahtarı (değişirse ödül ekranı yeniden çizilir). */
  private phoneKey(): string {
    return document.documentElement.classList.contains('short') ? `p${(stageView.cssScale > 0 ? stageView.cssScale : 1).toFixed(2)}` : 'd';
  }

  private phoneBoost(): Ph {
    this.phDrawn = this.phoneKey();
    if (this.phDrawn === 'd') return PH_OFF;
    const cs = stageView.cssScale > 0 ? stageView.cssScale : 1;
    return {
      on: true,
      fs: (n, small) => Math.max(n, Math.ceil((small ? PHONE.smallPx : PHONE.textPx) / cs)),
      pick: (_d, p) => p,
    };
  }

  /** Seçim kartı kutusu: masaüstünde LOOK.card, telefonda PHONE.card. */
  private cardBox(): { top: number; h: number; maxW: number; medal: number } {
    const desk: { top: number; h: number; maxW: number; medal: number } = LOOK.card;
    return this.ph.on ? PHONE.card : desk;
  }

  /** Kart genişliği: kart sayısına ve (telefonda geniş) sahneye uyar. */
  private cardWidth(n: number, gap: number, maxW: number): number {
    const room = this.ph.on ? Math.min(2560, stageView.right - stageView.left) - PHONE.edge * 2 : 1760;
    return Math.min(maxW, (room - (n - 1) * gap) / n);
  }

  private layoutStage(): void {
    if (this.bg) {
      const k = Math.max(stageView.viewW / this.bg.width, H / this.bg.height);
      this.bg.setScale(k).setPosition(CX, H / 2);
    }
  }

  private go(view: EndlessView): void {
    // Ara verme panelinden başlık / seçim / skor ekranına: savaş alanı kapanır, ekran tam ekran açılır
    if (this.overlay && (view === 'title' || view === 'pick' || view === 'over')) {
      this.scene.stop('BattleScene');
      this.scene.restart(view === 'over' ? {} : { view });
      return;
    }
    // Tam ekrandan ara verme görünümüne (yeni koşu, Continue): savaş alanı açılır, paneller üstte
    if (!this.overlay && view !== 'title' && view !== 'pick' && view !== 'over' && openPause(this)) return;
    if (view !== this.view) this.cardSel = -1;
    this.view = view;
    this.render();
  }

  /** Görünümü yeniden çizer. Dokunma olayının içinden çağrıldığında olayı veren nesne yok edilmesin diye bir sonraki kareye ertelenir. */
  private render(): void {
    if (this.pending) return;
    this.pending = true;
    this.time.delayedCall(0, () => {
      this.pending = false;
      if (this.sys.isActive()) this.renderNow();
    });
  }

  private renderNow(): void {
    this.cancelPickDrag();
    this.pickFx = null;
    this.pickRemoveText = null;
    this.cards = [];
    this.ph = PH_OFF;
    this.hideTip();
    this.closeConfirm();
    this.root.removeAll(true);
    if (this.view !== 'shop') this.closeShopDom();
    if (this.view !== 'reward') this.itemPick = null;
    if (this.view !== 'reward' && this.rewardBag) {
      this.rewardBag();
      this.rewardBag = null;
      this.gearOpen = false;
    }
    this.backBtn?.destroy();
    this.backBtn = null;
    const draw: Record<EndlessView, () => void> = {
      title: () => this.drawTitle(),
      pick: () => this.drawPick(),
      camp: () => this.drawCamp(),
      relic: () => this.drawRelic(),
      reward: () => this.drawReward(),
      shop: () => this.drawShop(),
      over: () => this.drawOver(),
    };
    draw[this.view]();
    // Overlay: kampta savaş alanı görünsün (hafif), kart / tüccar ekranında okunurluk için koyu
    if (this.overlay) this.shade?.setAlpha(this.view === 'camp' ? LOOK.overlayShade.camp : LOOK.overlayShade.panel);
    // Tüccar önizlemesi (?merchant=1): kaydedilmeyen, skora girmeyen koşu olduğu üstte açıkça yazar
    if (endless.run?.preview && this.view !== 'title' && this.view !== 'pick') this.add2(elText(this, CX, 22, T.previewRun, 16, C.warn, { em: 0.16 }).setOrigin(0.5));
    if (endlessBack(this.view)) this.drawBack();
    this.syncValor();
    this.layoutStage();
    // Görünüm değişince ortak panel geçişi (data/ui-motion.json > panel); aynı görünümün yeniden çizimi (seçim, satın alma) anında
    if (this.view !== this.shownView) {
      this.shownView = this.view;
      const m = motion('panel');
      if (m.ms > 0) {
        this.tweens.killTweensOf(this.root);
        this.root.setAlpha(0).setY(m.offset);
        this.tweens.add({ targets: this.root, alpha: 1, y: 0, duration: m.ms, ease: MOTION.ease.phaser });
      }
    }
  }

  // ============================================================ Valor (Ömer 2026-10-13)

  private valorMeter: ValorMeter | null = null;

  /**
   * Valor mangalları sol üstte (kamp, ödül, kalıntı ekranı; koşu sürerken). Zafer sonrası ödül ekranında artış korlar tek tek tutuşarak görünür.
   * Dokununca savaş dışı diriltme penceresi.
   */
  private syncValor(): void {
    const run = endless.run;
    const show = !!run && run.phase !== 'over' && (this.view === 'camp' || this.view === 'reward' || this.view === 'relic');
    if (!show) {
      this.valorMeter?.destroy();
      this.valorMeter = null;
      return;
    }
    const v = run!.valor ?? 0;
    if (!this.valorMeter) {
      const root = document.getElementById('ui-root');
      if (!root) return;
      const m = new ValorMeter({ label: true, where: 'camp', selfTip: true, onClick: () => this.openValor() });
      m.el.classList.add('vl-corner'); // sol üst bant, ◂ Back'in sağında (valor.css)
      root.append(m.el);
      this.valorMeter = m;
      const prev = rememberShown('valor', v);
      if (prev !== undefined && prev < v) {
        m.set(prev);
        m.set(v, true);
        return;
      }
    }
    rememberShown('valor', v);
    this.valorMeter.set(v);
  }

  private openValor(): void {
    if (!endless.run) return;
    openValorRevive({
      where: 'camp',
      valor: () => endless.run?.valor ?? 0,
      fallen: () =>
        (endless.run?.heroes ?? [])
          .filter((h) => h.hpRatio <= 0)
          .map((h) => ({ id: h.id, name: content.classes[h.class]?.name ?? h.class, sub: 'Fallen', ...(avatarUrl(h.class) ? { portraitUrl: avatarUrl(h.class)! } : {}) })),
      revive: (id) => {
        const run = endless.run;
        if (!run) return 'No run';
        const why = valorReviveBlocked(run, id);
        if (why) return why;
        commit(reviveWithValor(run, id));
        rememberShown('valor', endless.run?.valor ?? 0);
        return null;
      },
      onClose: () => this.render(),
    });
  }

  /** Son çizilen görünüm (görünüm geçişi yalnızca değişince oynar). */
  private shownView: EndlessView | null = null;

  // ============================================================ görünümler

  private drawTitle(): void {
    this.heading(T.title, T.titleSub);
    const saved = savedRun();
    const susp = suspendedOf(saved);
    const bx = CX - 380;
    let y = 400;
    if (saved) {
      if (susp) this.button(bx, y, 460, resumeLabel(susp.wave, susp.turn), () => this.actResume(), { primary: true });
      else this.button(bx, y, 460, T.continueRun(saved.wave), () => this.actContinue(), { primary: true });
      this.add2(this.note(bx, y + 52, saved.heroes.map((h) => className(h.class)).join(' · '), 20, C.dim).setOrigin(0.5, 0));
      y += 140;
    }
    this.button(bx, y, 460, saved ? T.newRun : T.startRun, () => (saved ? this.actNewRun() : this.actStartPick()), { primary: !saved });
    // "Main Menu" düğmesi kaldırıldı (Ömer 2026-10-09): sol üstteki ◂ Back aynı işi yapar
    this.panel(CX - 60, 300, 720, 600, 0.8);
    this.scoreList(CX - 20, 330, 640, scores());
    this.add2(this.note(CX + 300, 960, T.rules, 22, C.dim, true).setOrigin(0.5));
    // İlk girişte 3 kartlık kısa tanıtım (dalga, kamp, kalıntı; data/tutorial.json > endless; ayar kapalıysa / görüldüyse yok)
    showLesson('endless');
  }

  private drawPick(): void {
    const size = ENDLESS.partySize;
    const d = this.draft;
    const R = PICK.roster;
    const G = PICK.grid;
    this.heading(T.pickTitle, T.pickSub(size));
    // Kadro (sol): rastgele havuz (test class'ları yok), primary grubuna göre satırlar. Karta dokun = ekle / çıkar; sürükle = ızgaraya koy
    const defs = sortByPrimary(content.randomPool.map((id) => content.classes[id]!).filter(Boolean));
    const rows = Math.max(1, Math.ceil(defs.length / R.cols));
    const rowH = Math.min(R.rowH, 400 / rows);
    const av = Math.min(R.avatar, rowH - 84);
    // İki çalışma alanı ince kit panelleri üstünde (yoğun arka planda hücreler okunsun): kadro ve ızgara
    this.rosterRect = new Phaser.Geom.Rectangle(R.x - 12, R.top - 14, R.cols * R.step + 24, rows * rowH + 6);
    const gw = 4 * G.cell + 3 * G.gap;
    const gh = 3 * G.cell + 2 * G.gap;
    this.panel(this.rosterRect.x, this.rosterRect.y, this.rosterRect.width, this.rosterRect.height, 0.62);
    this.panel(G.x - 18, G.top - 18, gw + 36, gh + 36, 0.62);
    this.add2(elText(this, R.x, PICK.labelY, T.pickRoster, 17, EL.MUTED, { em: 0.24 }).setOrigin(0, 0.5));
    this.add2(elText(this, G.x, PICK.labelY, T.pickCompany(d.classes.length, size), 17, d.classes.length === size ? EL.ON : EL.MUTED, { em: 0.24 }).setOrigin(0, 0.5));
    let tipAnchor: { box: { x: number; y: number; w: number; h: number }; col: number } | null = null;
    defs.forEach((def, i) => {
      const x = R.x + R.step / 2 + (i % R.cols) * R.step;
      const y = R.top + av / 2 + 4 + Math.floor(i / R.cols) * rowH;
      const on = d.classes.includes(def.id);
      const col = Phaser.Display.Color.HexStringToColor(groupColor(PRIMARY_COLORS, def.primary)).color;
      this.add2(this.add.rectangle(x, y, av + 6, av + 6, 0x120c07, 1).setStrokeStyle(on ? 2 : 1, on ? EL.ON_N : col, on ? 1 : 0.8));
      // Takımdaki class kadroda soluk durur (ızgarada görünür); yine sürüklenebilir, dokunmak çıkarır
      const img = this.add2(classAvatar(this, def, x, y, av).setAlpha(on ? 0.4 : 1));
      this.add2(fitText(this.label(x, y + av / 2 + 10, def.name.toUpperCase(), 18, on ? C.bright : C.text).setOrigin(0.5, 0), R.step - 6));
      this.add2(this.add.rectangle(x, y + av / 2 + 44, 34, 3, col, 1));
      const z = this.add2(this.add.zone(x, y + 20, R.step - 6, av + 60).setInteractive({ useHandCursor: true }));
      z.on('pointerdown', (p: Phaser.Input.Pointer) => this.beginPickDrag(def.id, -1, p, img));
      const box = { x: x - (R.step - 6) / 2, y: y + 20 - (av + 60) / 2, w: R.step - 6, h: av + 60 };
      this.wireHeroTip(z, def.id, 'r', box, () => this.actTogglePick(def.id), i % R.cols);
      if (this.tipHero?.src === 'r' && this.tipHero.id === def.id) tipAnchor = { box, col: i % R.cols };
    });
    // Izgara (sağ): 4 sıra x 3 şerit, ön sıra (0) en sağda
    this.add2(elText(this, G.x + gw + 34, G.top + gh / 2, T.pickFront, 17, EL.ON, { em: 0.2 }).setOrigin(0, 0.5));
    this.add2(elText(this, G.x - 30, G.top + gh / 2, T.pickBack, 15, EL.MUTED, { em: 0.2 }).setOrigin(1, 0.5));
    // Dizilim ipuçları (formation-hints.ts; yalnızca öneri)
    const hints = content.placementHintsFor(d.classes, d.slots);
    for (let row = 0; row < 4; row++)
      for (let lane = 0; lane < 3; lane++) {
        const slot = row * 3 + lane;
        const x = G.x + (3 - row) * (G.cell + G.gap);
        const y = G.top + lane * (G.cell + G.gap);
        const id = draftClassAt(d, slot);
        const def = id ? content.classes[id] : undefined;
        const g = this.add2(this.add.graphics());
        g.fillStyle(EL.INK, def ? 0.75 : 0.38).fillRect(x, y, G.cell, G.cell);
        if (def && id === this.pickSel) g.lineStyle(2, EL.ON_N, 1).strokeRect(x + 1, y + 1, G.cell - 2, G.cell - 2);
        else g.lineStyle(1, EL.GOLD, def ? 0.62 : row === 0 ? 0.42 : EL.LINE.a2).strokeRect(x + 0.5, y + 0.5, G.cell - 1, G.cell - 1);
        if (!def) g.lineStyle(1, EL.GOLD, 0.22).strokePoints(diamondPts(x + G.cell / 2, y + G.cell / 2, 6.4), true);
        let img: Phaser.GameObjects.Image | undefined;
        if (def) {
          img = this.add2(classAvatar(this, def, x + G.cell / 2, y + G.cell / 2 - 8, G.cell - 18));
          const band = this.add2(this.add.graphics());
          band.fillGradientStyle(EL.INK, EL.INK, EL.INK, EL.INK, 0, 0, 0.92, 0.92).fillRect(x + 1, y + G.cell - 40, G.cell - 2, 39);
          const hint = hints[d.classes.indexOf(id)];
          this.add2(fitText(elText(this, x + G.cell / 2, y + G.cell - 20, def.name, 17, hint ? hintColor(hint) : EL.ON, { em: 0.04 }).setOrigin(0.5), G.cell - 10));
          if (hint) this.add2(hintBadge(this, x + 18, y + 18, hint));
        }
        const z = this.add2(this.add.zone(x + G.cell / 2, y + G.cell / 2, G.cell, G.cell).setInteractive({ useHandCursor: !!def || !!this.pickSel }));
        if (def) z.on('pointerdown', (p: Phaser.Input.Pointer) => this.beginPickDrag(id, slot, p, img));
        const box = { x, y, w: G.cell, h: G.cell };
        if (def) {
          this.wireHeroTip(z, id, 'g', box, () => this.actTapCell(slot), -1);
          if (this.tipHero?.src === 'g' && this.tipHero.id === id) tipAnchor = { box, col: -1 };
        } else {
          z.on('pointerup', () => {
            this.clearHeroTip();
            this.pickTap(() => this.actTapCell(slot));
          });
        }
      }
    // Sürükleme hedefi çizimi (ızgara ve kadro üstünde; yalnızca sürüklerken dolu) + kadroya bırakma yazısı
    this.pickFx = this.add2(this.add.graphics());
    this.pickRemoveText = this.add2(elText(this, this.rosterRect.centerX, this.rosterRect.bottom + 18, T.pickRemove, 17, EL.ON, { em: 0.2 }).setOrigin(0.5).setVisible(false));
    // Bilgi satırı kaldırıldı (Ömer 2026-11-01, mockup endless-pick varyant A): bilgi A Band ipucunda; çizim yenilenince açık ipucu geri gelir
    if (this.tipHero) {
      if (tipAnchor) this.showHeroTip(this.tipHero.id, tipAnchor.box, tipAnchor.col);
      else this.tipHero = null;
    }
    // Düğmeler: ikinciller solda, birincil (Start Run) en sağda
    this.button(CX - 450, LOOK.buttonY, 280, T.randomize, () => this.actRandomize());
    this.button(CX - 120, LOOK.buttonY, 300, T.autoArrange, () => this.actAutoArrange(), { enabled: d.classes.length > 0 });
    this.button(CX + 280, LOOK.buttonY, 360, T.startRunButton, () => this.actBeginRun(), { primary: true, enabled: d.classes.length === size });
  }

  // ------------------------------------------------------------ takım seçimi: sürükle-bırak (fare ve dokunma; Phaser işaretçisi)

  /** Kadronun dünya dikdörtgeni (ızgaradan kadroya bırakma = çıkar). */
  private rosterRect = new Phaser.Geom.Rectangle(0, 0, 0, 0);
  private pickRemoveText: Phaser.GameObjects.Text | null = null;

  /**
   * Kahraman ipucu bağı (kadro kartı ya da ızgara hücresi). Fare: üstüne gelince açılır, çıkınca kapanır. Dokunmatik: dokunuş eylemi yapar
   * (ekle / çıkar / seç) ve ipucunu sabitler; başka yere dokunmak kapatır. Sürüklerken ipucu yok.
   */
  private wireHeroTip(z: Phaser.GameObjects.Zone, id: string, src: 'r' | 'g', box: { x: number; y: number; w: number; h: number }, tap: () => void, col: number): void {
    z.setData('heroTip', true);
    z.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || this.drag?.moved || this.confirm || this.tipHero?.pinned) return;
      this.tipHero = { id, src, pinned: false };
      this.showHeroTip(id, box, col);
    });
    z.on('pointerout', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || this.tipHero?.pinned) return;
      this.clearHeroTip();
    });
    z.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.drag?.moved || this.confirm) return;
      if (p.wasTouch) {
        this.tipHero = { id, src, pinned: true };
        this.showHeroTip(id, box, col);
      } else this.clearHeroTip();
      this.pickTap(tap);
    });
  }

  private clearHeroTip(): void {
    this.tipHero = null;
    this.hideTip();
  }

  /** Kahramanın A Band ipucu (Quick Battle sınıf ipucuyla aynı bileşen): rol, Primary, blurb, pasif; sıra + menzil çipleri; uygunsuz hücrede uyarı alt şeridi. */
  private heroTipSpec(id: string): BandTipSpec | null {
    const def = content.classes[id];
    if (!def) return null;
    const i = this.draft.classes.indexOf(id);
    const slot = i >= 0 ? this.draft.slots[i] ?? -1 : -1;
    const hint = slot >= 0 ? content.placementHintsFor(this.draft.classes, this.draft.slots)[i] : undefined;
    const range = content.planUnitOf(id).range;
    const chips: PhChip[] = [];
    if (slot >= 0) chips.push({ text: T.heroRow(slot), tone: 'ac' });
    if (Number.isFinite(range)) chips.push({ text: 'Range', num: String(range), tone: 'v' });
    const lines: PhLine[] = [];
    if (def.blurb) lines.push({ text: def.blurb });
    const passive = (def as unknown as { passive?: { name?: string } }).passive?.name;
    if (passive) lines.push({ text: `Passive: ${passive}` });
    const spec: BandTipSpec = {
      accent: def.color,
      icon: ensureIcon(this, classLogoName(def), def.color, false, ownerOfUnit(def.id)),
      kind: `${archetypeOf(def)} · ${rangeOf(def)}`,
      title: def.name,
      width: 440,
      lines,
    };
    if (def.primary) spec.sub = `Primary: ${def.primary.toUpperCase()} · ${primaryBonusInfo(def.primary, content.formulas, true).name}`;
    if (chips.length) spec.chips = chips;
    if (hint) {
      spec.foot = placementHintText(def.name, hint);
      spec.footHex = hintColor(hint);
    }
    return spec;
  }

  /**
   * İpucunu açar. Masaüstü: kartın / hücrenin üstünde. Telefon (html.short): ızgarayı ASLA örtmez; her zaman kadro tarafında açılır
   * (kadro kartından açıldıysa kartın bulunduğu yarının karşı yarısında, parmak ve kart açık kalır).
   */
  private showHeroTip(id: string, box: { x: number; y: number; w: number; h: number }, col: number): void {
    this.showHeroTipBand(id, box, col);
    // Dizilimdeki (yerleşmiş) kahraman: sınıf ipucuna EK olarak Sefer Formation hover kutusuyla AYNI DOM menzil kutusu (reach-tip-dom.ts); içerik kaybı yok
    const idx = this.draft.classes.indexOf(id);
    const slot = this.tipHero?.src === 'g' && idx >= 0 ? this.draft.slots[idx] ?? -1 : -1;
    const def = content.classes[id];
    if (slot >= 0 && def && reachTipOn()) showReachTip(this, this.input.activePointer, { name: def.name, classId: id, cell: slot, hint: content.placementHintsFor(this.draft.classes, this.draft.slots)[idx], rect: box });
  }

  private showHeroTipBand(id: string, box: { x: number; y: number; w: number; h: number }, col: number): void {
    this.hideTip();
    const spec = this.heroTipSpec(id);
    if (!spec) return;
    const tip = bandTip(this, spec);
    this.tip = tip.container;
    if (!document.documentElement.classList.contains('short')) return placeElTip(this, tip, box, 'above');
    const r = this.rosterRect;
    let tx = r.centerX - tip.width / 2;
    if (col >= 0) tx = col >= 3 ? r.x + 8 : r.right - tip.width - 8;
    tx = Math.round(Math.max(stageView.left + 8, Math.min(stageView.right - tip.width - 8, tx)));
    const ty = Math.round(Math.max(8, Math.min(r.centerY - tip.height / 2, 860 - tip.height)));
    tip.container.setPosition(tx, ty + 6).setAlpha(0);
    this.tweens.add({ targets: tip.container, alpha: 1, y: ty, duration: 160, ease: EL.EASE });
  }

  /** Dokunma (sürüklenmediyse): sürükleme yeni bittiyse dokunma sayılmaz. */
  private pickTap(run: () => void): void {
    if (this.drag?.moved || this.confirm) return;
    this.drag?.cancel();
    run();
  }

  private beginPickDrag(cls: string, from: number, p: Phaser.Input.Pointer, src?: Phaser.GameObjects.Image): void {
    if (this.confirm) return;
    this.drag?.begin({ cls, from, ...(src ? { src } : {}) }, p);
  }

  private pickCellAt(x: number, y: number): number {
    const G = PICK.grid;
    const h = G.gap / 2;
    for (let row = 0; row < 4; row++)
      for (let lane = 0; lane < 3; lane++) {
        const cx = G.x + (3 - row) * (G.cell + G.gap);
        const cy = G.top + lane * (G.cell + G.gap);
        if (x >= cx - h && x <= cx + G.cell + h && y >= cy - h && y <= cy + G.cell + h) return row * 3 + lane;
      }
    return -1;
  }

  /** Bırakma hedefi: hücre; ızgaradan gelen kahraman için kadro alanı (-2); yoksa -1. */
  private pickTarget(x: number, y: number, d = this.drag?.payload): number {
    const c = this.pickCellAt(x, y);
    if (c >= 0) return c;
    return d && d.from >= 0 && this.rosterRect.contains(x, y) ? -2 : -1;
  }

  /** Sürüklemeyi bırak: hayalet silinir, kaynak görsel geri gelir, hedef çizimi temizlenir (SlotDrag > onEnd). */
  private cancelPickDrag(): void {
    this.drag?.cancel();
  }

  /** Hedef vurgusu: sürüklerken ızgara çevresi kor rengi ince çizgi, hedef hücre kor çerçeve + dolgu; ızgaradan gelende kadro alanı da hedef. */
  private drawPickFx(): void {
    const g = this.pickFx;
    if (!g?.active) return;
    g.clear();
    const dr = this.drag?.payload;
    this.pickRemoveText?.setVisible(!!dr && dr.from >= 0);
    if (!dr) return;
    const G = PICK.grid;
    const gw = 4 * G.cell + 3 * G.gap;
    const gh = 3 * G.cell + 2 * G.gap;
    g.lineStyle(2, EL.EMBER, 0.7).strokeRect(G.x - 7, G.top - 7, gw + 14, gh + 14);
    if (this.dropHot >= 0) {
      const row = Math.floor(this.dropHot / 3);
      const lane = this.dropHot % 3;
      const x = G.x + (3 - row) * (G.cell + G.gap);
      const y = G.top + lane * (G.cell + G.gap);
      g.fillStyle(EL.EMBER, 0.24).fillRect(x, y, G.cell, G.cell);
      g.lineStyle(3, EL.EMBER2, 1).strokeRect(x + 1.5, y + 1.5, G.cell - 3, G.cell - 3);
    }
    if (dr.from >= 0) {
      const r = this.rosterRect;
      const hot = this.dropHot === -2;
      if (hot) g.fillStyle(EL.EMBER, 0.08).fillRect(r.x, r.y, r.width, r.height);
      g.lineStyle(hot ? 2 : 1, hot ? EL.EMBER : EL.GOLD, hot ? 1 : 0.4).strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);
    }
  }

  private drawCamp(): void {
    const run = endless.run;
    if (!run) return this.go('title');
    const plan = wavePlan(run);
    const kind = waveKind(run.wave);
    const susp = suspendedOf(run);
    // Overlay: başlık savaş alanının gökyüzünde okunsun diye üstte ve altta (düğmeler) sönen koyu şerit
    if (this.overlay) {
      const g = this.add2(this.add.graphics());
      vGradient(g, FULL_X0, 0, FULL_W, 330, 0x080604, [[0, 0.78], [0.6, 0.55], [1, 0]]);
      vGradient(g, FULL_X0, 820, FULL_W, 260, 0x080604, [[0, 0], [0.45, 0.6], [1, 0.75]]);
    }
    this.heading(T.campTitle(run.wave), kind === 'normal' ? T.campFoes(plan.enemyNames) : T.campSpecial(kind === 'boss', plan.name));
    this.add2(this.note(CX, 246, T.campStats(run.gold, gearScore(run), run.stats.cleared), 24, C.accent).setOrigin(0.5));
    if (run.blessing) this.add2(this.note(CX, 280, T.campBlessing(run.blessing.hpMult, run.blessing.waves), 22, C.bright, true).setOrigin(0.5));
    // Overlay (sürekli akış): kahramanlar savaş alanında durur; kahraman kartları yalnızca tam ekran kampta
    if (!this.overlay) run.heroes.forEach((h, i) => this.heroPanel(h, CX + (i - (run.heroes.length - 1) / 2) * 420, 310));
    this.relicRow(run.relics ?? [], CX, 852);
    if (endless.notice) {
      this.add2(this.note(CX, 806, endless.notice, 22, C.accent, true).setOrigin(0.5));
      endless.notice = '';
    }
    this.button(CX - 560, LOOK.buttonY, 280, T.abandonRun, () => this.actAbandon());
    // Gear: torbadaki item'leri istenen kahramana tak (seferin Gear ekranı); yarım savaş varken kilitli (kurulumu değişmesin)
    const lock = gearLockReason(run);
    this.button(CX - 230, LOOK.buttonY, 300, `${T.gear} · ${T.campBag(bagOf(run).length, endlessBagSize())}`, () => this.actGear(), { enabled: !lock, icon: this.uiTex('gear') });
    if (lock) this.add2(this.note(CX - 230, LOOK.buttonY + 50, T.gearLocked, 18, C.dim, true).setOrigin(0.5, 0));
    // Yarım kalan savaş varsa yalnızca ona dönülür (aynı dalgayı baştan başlatmak yok: yeniden deneme hilesi olmasın)
    if (susp) this.button(CX + 330, LOOK.buttonY, 500, resumeLabel(susp.wave, susp.turn), () => this.actResume(), { primary: true });
    else this.button(CX + 330, LOOK.buttonY, 420, kind === 'boss' ? T.faceBoss : T.fightWave(run.wave), () => this.actFight(), { primary: true });
  }

  /** Sahip olunan kalıntılar: ikon sırası (kit ikon düğmesi), üstüne gelince / dokununca ad + etki tooltip'i. */
  private relicRow(ids: string[], cx: number, y: number): void {
    const defs = ids.map((id) => relicDef(id)).filter((d): d is NonNullable<typeof d> => !!d);
    if (!defs.length) return;
    const size = 44;
    const step = 56;
    const x0 = cx - ((defs.length - 1) * step) / 2;
    this.add2(this.label(x0 - size, y, T.relicsOwned, 18, C.dim).setOrigin(1, 0.5));
    defs.forEach((d, i) => {
      const x = x0 + i * step;
      const show = (on: boolean) => (on ? this.showRelicTip(d.id, x, y, size) : this.hideTip());
      const b = elIconButton(this, { icon: ensureIcon(this, paintedOr('relic', d.id, d.icon), d.color, false) }, () => show(true), { size, onHover: show });
      b.root.setPosition(x, y);
      this.add2(b.root);
    });
  }

  private showRelicTip(id: string, x: number, y: number, size: number): void {
    const d = relicDef(id);
    if (!d) return;
    this.hideTip();
    const tip = bandTip(this, { accent: d.color, kind: T.relicEffectLabel, icon: ensureIcon(this, paintedOr('relic', d.id, d.icon), d.color, false), title: d.name, lines: [{ text: d.text }], width: 440 });
    placeElTip(this, tip, { x: x - size / 2, y: y - size / 2, w: size, h: size }, 'above');
    this.tip = tip.container;
  }

  private hideTip(): void {
    hideReachTip();
    this.tip?.destroy();
    this.tip = null;
    this.tipOwner = null;
  }

  /** Boss sonrası kalıntı seçimi: teklif edilen kalıntılar seçim kartı olarak (zengin çerçeve, piksel ikon madalyonda); biri alınır. */
  private drawRelic(): void {
    const run = endless.run;
    if (!run?.relicOffer?.length) return this.go(endlessView(run));
    this.heading(T.relicTitle, T.relicSub);
    const offer = run.relicOffer;
    const n = offer.length;
    const w = 420;
    const gap = 60;
    offer.forEach((id, i) => {
      const d = relicDef(id);
      if (!d) return;
      this.choiceCard({ index: i, cx: CX + (i - (n - 1) / 2) * (w + gap), w, rich: true, accent: hexNum(d.color), tint: EndlessScene.TINT.relic, kicker: T.relicKicker, take: () => this.actChooseRelic(run, id) }, (k) => {
        const m = medallion(this, ensureIcon(this, paintedOr('relic', d.id, d.icon), d.color, false), hexNum(d.color), LOOK.card.medal, { rich: true, iconScale: 0.8 });
        m.setPosition(k.cx, k.top + LOOK.card.medal + 22);
        k.add(m);
        let y = k.top + LOOK.card.medal * 2 + 58;
        k.add(fitText(this.label(k.cx, y, d.name.toUpperCase(), 26).setOrigin(0.5, 0), k.w - 40));
        y += 50;
        k.add(this.note(k.cx, y, d.text, 22, C.text).setOrigin(0.5, 0).setWordWrapWidth(k.w - 60).setAlign('center'));
      });
    });
    if (run.relics?.length) this.relicRow(run.relics, CX, 1010);
  }

  private heroPanel(h: EndlessHero, cx: number, top: number): void {
    const def = content.classes[h.class];
    if (!def) return;
    const w = 390;
    this.panel(cx - w / 2, top, w, 480, 0.85);
    // Kampta kahraman paneline dokunmak Gear'ı o kahramanla açar (kilitli değilse)
    const run = endless.run;
    if (this.view === 'camp' && run && !gearLockReason(run)) this.tapZone(cx, top + 240, w, 480, () => this.actGear(h.id));
    this.avatar(def, cx, top + 78, 108);
    this.add2(this.label(cx, top + 142, def.name.toUpperCase(), 26).setOrigin(0.5, 0));
    this.hpBar(cx - 140, top + 186, 280, 16, h.hpRatio);
    // Dizilim (koşu başında seçildi, dalgadan dalgaya taşınır; düzenlenmez): sırası
    const cell = run ? heroSlots(run.heroes)[run.heroes.filter((x) => content.classes[x.class]).indexOf(h)] : undefined;
    this.add2(this.note(cx, top + 206, cell !== undefined ? `${T.heroHealth(h.hpRatio)}  ·  ${T.heroRow(cell)}` : T.heroHealth(h.hpRatio), 20, C.dim).setOrigin(0.5, 0));
    // Yara (Ömer 2026-10-19): en küçük işlevsel gösterim, sağlık satırının altında (yara arayüzü mockup'tan seçilecek)
    if (woundCount(h) > 0) this.add2(this.note(cx, top + 228, woundsLine(woundCount(h), endlessWoundRules()), 18, '#d88a7e').setOrigin(0.5, 0));
    SLOT_IDS.forEach((slot, k) => {
      const y = top + 250 + k * 28; // 8 yuva (Ring ve Trinket 2026-11-01) 480'lik panele sığar
      const inst = h.equipment[slot];
      const d = inst ? viewDef(itemDef(inst.id), inst.rolls) : undefined;
      this.add2(this.note(cx - w / 2 + 26, y, slotDef(slot).name, 20, C.dim));
      this.add2(fitText(this.note(cx - w / 2 + 120, y, d ? d.name : T.emptySlot, 20, d ? rarityColor(d) : C.empty), w - 150));
    });
  }

  private drawReward(): void {
    const run = endless.run;
    if (!run?.offer) return this.go('title');
    const kind = waveKind(run.stats.cleared);
    const special = kind === 'normal' ? null : kind;
    this.ph = this.phoneBoost();
    if (this.itemPick !== null && this.drawItemPick(run, this.itemPick, special)) return;
    this.itemPick = null;
    this.heading(T.rewardTitle, T.rewardSub(run.stats.cleared, special));
    // Kart genişliği kart sayısına uyar (normal 3, elit/boss 4)
    const n = run.offer.length;
    const w = this.cardWidth(n, LOOK.card.gap, this.cardBox().maxW);
    run.offer.forEach((card, i) => this.rewardCard(run, card, i, CX + (i - (n - 1) / 2) * (w + LOOK.card.gap), w, special));
    // Nadir düşüş duyurusu (madde 297): altın-turuncu parlayan satır. Torba doluyken düştüyse BEKLER: yer açılınca "Take", alınmadan devam = kaybolur
    const rd = run.rareDrop && run.rareDrop.wave === run.stats.cleared ? run.rareDrop : undefined;
    const rare = rd ? itemDef(rd.itemId) : undefined;
    if (rd && rare) {
      const t = this.add2(this.note(CX, this.cardBox().top - 34, rd.pending ? T.rareDropWaiting(rare.name) : T.rareDrop(rare.name), this.ph.fs(26), '#f0a830', false).setOrigin(0.5, 1));
      this.tweens.add({ targets: t, alpha: { from: 0.35, to: 1 }, scale: { from: 1.12, to: 1 }, duration: 520, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => t.setAlpha(1).setScale(1) });
    }
    // Torba: ödül seçerken açılır (Gear: at / tak; Ömer 2026-10-10); bekleyen nadir düşüş için Take (yer varsa)
    const bagN = bagOf(run).length;
    const max = endlessBagSize();
    const bx = this.ph.pick(230, 330);
    this.button(rd?.pending ? CX - bx : CX, 1000, 300, `View bag · ${bagN}/${max}`, () => this.actViewBag(), { icon: this.uiTex('bag') });
    if (rd?.pending && rare) this.button(CX + bx, 1000, 380, T.takeRare(rare.name), () => this.actTakeRare(), { primary: true, enabled: bagN < max });
    // Torbadan dönüş: kartlar soldaki küçük ikon yerlerinden kendi yerlerine büyüyerek gelir
    if (this.cardsFromBag) {
      this.cardsFromBag = false;
      this.cards.forEach((c, i) => {
        const b = c.box;
        if (!b) return;
        const [x, y] = [b.x, b.y];
        const [sx, sy] = this.bagSlot(i);
        b.setPosition(sx, sy).setScale(0.2).setAlpha(0);
        this.tweens.add({ targets: b, x, y, scale: 1, alpha: 1, duration: motionMs(460), ease: EL.EASE, delay: motionMs(i * 40) });
      });
    }
  }

  /** Torba açıkken küçük ödül ikonunun yeri (solda, yukarıdan aşağı; DOM ikonlarıyla aynı hiza). */
  private bagSlot(i: number): [number, number] {
    return [stageView.left + 170, 300 + i * 170];
  }

  /**
   * View bag (Ömer 2026-10-11): ödül kartları küçülüp sola, yukarıdan aşağı dizilir ve söner; ortak Inventory sağda açılır (DOM, küçük ödül
   * ikonları solda). İkona dokunmak ödülü alır; Close bag / Esc kartları geri getirir.
   */
  private actViewBag(): void {
    const run = endless.run;
    const root = document.getElementById('ui-root');
    if (!run?.offer || !root || this.rewardBag) return;
    uiSound('open');
    this.hideTip();
    this.cards.forEach((c, i) => {
      if (!c.box) return;
      const [sx, sy] = this.bagSlot(i);
      this.tweens.add({ targets: c.box, x: sx, y: sy, scale: 0.2, alpha: 0, duration: motionMs(420), ease: EL.EASE, delay: motionMs(i * 40) });
    });
    this.gearOpen = true;
    const tiles = (): RewardTile[] => {
      const r = endless.run;
      return (r?.offer ?? []).map((card): RewardTile => {
        const blocked = r ? rewardBlockedReason(r, card) : null;
        if (card.kind === 'item') {
          const d = itemDef(card.itemId);
          return { inst: { uid: `reward-${card.itemId}`, id: card.itemId, ...(card.rolls ? { rolls: card.rolls } : {}) }, title: d?.name ?? card.itemId, text: '', label: d?.name ?? card.itemId, blocked };
        }
        if (card.kind === 'gold') return { icon: uiIconName('gold'), accent: '#ecc878', title: `+${card.amount} gold`, text: cardText(card), label: `+${card.amount} gold`, blocked };
        if (card.kind === 'xp') return { icon: uiIconName('codex'), accent: '#8fb0d8', title: cardTitle(card), text: cardText(card), label: cardTitle(card), blocked };
        const label = card.kind === 'heal' ? `Heal ${Math.round(card.ratio * 100)}%` : card.kind === 'revive' ? 'Revive' : 'Feast';
        return { icon: paintedOr('emblem', card.kind === 'feast' ? 'feast' : 'heal', 'ankh'), accent: card.kind === 'feast' ? '#f0b860' : '#d96a5a', title: label, text: cardText(card), label, blocked };
      });
    };
    this.rewardBag = openRewardBag(root, endlessGearSource(() => endless.run!, (r) => commit(r)), {
      tiles,
      take: (i) => {
        this.rewardBag = null;
        this.gearOpen = false;
        const r = endless.run;
        if (r) this.actTakeReward(r, i);
      },
      onClose: () => {
        this.rewardBag = null;
        this.gearOpen = false;
        this.cardsFromBag = true;
        this.render();
      },
    });
  }

  /**
   * Seçim kartı (ödül / kalıntı; tasarım kiti): BÜTÜN KART düğmedir, ayrı Take yok (Ömer 2026-10-09). Fare: üstüne gelince yükselir + çerçeve
   * ve parıltı açılır, basınca hafifçe küçülür, tık = al. Dokunmatik: dokunuş = al (basma geri bildirimi aynı). Klavye: 1-4 / ←→ seçer, Enter alır.
   * `tint`: kart türünün çok hafif zemin rengi (item çelik, altın sıcak altın, şifa koyu kırmızı ...). İçerik `draw` ile `k.top .. k.bottom` arasına,
   * sağ üst köşe (ör. "Sell: 55") `corner` ile çizilir.
   */
  private choiceCard(
    o: { index: number; cx: number; w: number; rich: boolean; accent: number; tint: number; kicker: string; take: () => void; rarity?: boolean; blocked?: string | null },
    draw: (k: CardCtx) => void,
  ): void {
    // Telefon yalnızca ödül / item seçimi (ph kuruluyken) kart kutusunu büyütür; kalıntı kartları masaüstü ölçüsünde kalır
    const { top, h } = this.cardBox();
    const c = this.add2(this.add.container(o.cx, top + h / 2));
    // Engelli kart (Ömer 2026-10-10: torba doluyken item ödülü alınmaz): soluk, altta kısa ipucu; dokunuş = hata sesi + ipucu
    if (o.blocked) {
      const why = o.blocked;
      o = { ...o, take: () => {
        this.toast?.(why, 'error');
      } };
    }
    // Kart kabı kartın ortasında: basma / kalkma ölçeği ortadan; çizimler dünya koordinatından kaba göre kaydırılır
    const ox = -o.cx;
    const oy = -(top + h / 2);
    const at = <G extends Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject>(obj: G): G => {
      obj.x += ox;
      obj.y += oy;
      c.add(obj);
      return obj;
    };
    const x0 = o.cx - o.w / 2;
    const glow = at(this.add.image(o.cx, top + h / 2, ensureGlow(this)).setTint(o.accent).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDisplaySize(o.w * 1.5, h * 1.25));
    at(elPanel(this, x0, top, o.w, h, { alpha: 0.92, corners: o.rich, border: o.rich ? 0.6 : 0.42 }));
    // Tür rengi: üstten aşağı sönen çok hafif dolgu (kit paleti içinde)
    const tint = at(this.add.graphics());
    tint.fillGradientStyle(o.tint, o.tint, o.tint, o.tint, 0.1, 0.1, 0.02, 0.02).fillRect(x0 + 1, top + 1, o.w - 2, h - 2);
    const hl = at(this.add.graphics());
    // Üst satır: küçük Cinzel başlık (elit / boss / kalıntı kartında kor rengi) + iki yanda sönen çizgi
    // Telefon: yazı büyür (en az ~9,5 gerçek px), harf aralığı daralır, süs çizgileri düşer (yer yok); sığmazsa fitText küçültür
    const kick = at(elText(this, o.cx, top + this.ph.pick(26, 30), o.kicker, this.ph.fs(16, true), o.rich ? '#f0a860' : C.dim, { em: this.ph.pick(0.22, PHONE.em) }).setOrigin(0.5));
    if (this.ph.on) fitText(kick, o.w - 24);
    else {
      const orn = at(this.add.graphics());
      const half = kick.width / 2 + 14;
      fadeLine(orn, o.cx - half - 60, o.cx - half, top + 26, EL.GOLD, 0.5, 'in');
      fadeLine(orn, o.cx + half, o.cx + half + 60, top + 26, EL.GOLD, 0.5, 'out');
    }
    // `addTop`: kartın dokunma alanının ÜSTÜNE (stat satırlarının ipucu alanları); kart alanından önce eklenirse ipucu çalışmaz
    const late: Phaser.GameObjects.GameObject[] = [];
    draw({ cx: o.cx, w: o.w, top: top + this.ph.pick(48, 52), bottom: top + h - 22, x0, x1: x0 + o.w, add: (obj) => at(obj as Phaser.GameObjects.Image), addTop: (obj) => late.push(obj) });
    // Bütün kart: dokunma alanı (en üstte)
    const zone = at(this.add.zone(o.cx, top + h / 2, o.w, h).setInteractive({ useHandCursor: true }));
    for (const obj of late) at(obj as Phaser.GameObjects.Zone);
    let hover = false;
    let mouse = true; // son üstüne gelen fare mi (dokunmatikte yükselme yok)
    // Yeni hover (Ömer 2026-11-01, mockup endless-pick #rw; kural data/ui-motion.json > card): hoverMs, yalnızca fare için lift px, ince altın kenar
    // + dış halka + hafif parıltı; ölçek yok (yalnızca basma geri bildirimi). Seçili kartın kenarı altın (hareket yok).
    // Item kartında kenar nadirlik rengi (Ömer 2026-11-01), seçiliyken biraz açık.
    const setState = (hv: boolean, sel: boolean, pressed = false) => {
      hover = hv;
      const m = motion('card');
      hl.clear();
      if (hv || sel) {
        const edge = !o.rarity ? EL.ON_N : sel ? Phaser.Display.Color.ValueToColor(o.accent).lighten(20).color : o.accent;
        hl.lineStyle(1.5, edge, 1).strokeRect(x0 + 0.5, top + 0.5, o.w - 1, h - 1);
        hl.lineStyle(1, edge, 0.55).strokeRect(x0 - 0.5, top - 0.5, o.w + 1, h + 1);
      }
      this.tweens.killTweensOf([c, glow]);
      this.tweens.add({ targets: c, y: top + h / 2 + (hv && mouse ? -m.lift : 0), scale: pressed ? 0.975 : 1, duration: pressed ? 90 : m.hoverMs, ease: EL.EASE });
      this.tweens.add({ targets: glow, alpha: pressed ? 0.2 : hv && mouse ? 0.12 : sel ? 0.08 : 0, duration: m.hoverMs, ease: EL.EASE });
    };
    zone.on('pointerover', (p?: Phaser.Input.Pointer) => {
      mouse = !p?.wasTouch;
      setState(true, this.cardSel === o.index);
    });
    zone.on('pointerout', () => setState(false, this.cardSel === o.index));
    zone.on('pointerdown', () => !this.confirm && setState(true, this.cardSel === o.index, true));
    zone.on('pointerup', () => {
      if (this.confirm) return;
      setState(true, true);
      o.take();
    });
    this.cards[o.index] = { setState: (hv, sel) => setState(hv && hover, sel), take: o.take, box: c };
    if (this.cardSel === o.index) setState(false, true);
    if (o.blocked) {
      // Kart soluk (ad ve statlar okunur: atmaya değer mi?); ipucu altta "Usable by" satırının üstünde koyu şeritte, tam opak
      c.setAlpha(0.5);
      const y = top + h - 62;
      this.add2(this.add.rectangle(o.cx, y, o.w - 8, this.ph.pick(64, 120), 0x0b0806, 0.86).setStrokeStyle(1, 0xe8806a, 0.35));
      this.add2(this.note(o.cx, y, o.blocked, this.ph.fs(22), '#f09a80', false).setOrigin(0.5, 0.5).setWordWrapWidth(o.w - 40).setAlign('center'));
    }
  }

  /** Kahramanın şimdiki statları ve item (zarlarıyla) takılırsa statları (ipucunda önce -> sonra; takamıyorsa yalnızca şimdiki). */
  private tipStats(hero: EndlessHero | undefined, d: ItemDef, rolls?: ItemRolls): { now: Stats; after: Stats | null } | null {
    const now = hero ? heroStats(hero) : null;
    if (!hero || !now) return null;
    const prev = { uid: '_preview', id: d.id, ...(rolls ? { rolls } : {}) };
    const after = canEquip(hero.class, d) ? heroStats({ ...hero, equipment: itemDef(d.id) ? (equipInto(hero.equipment, prev, defaultEquipSlot(hero.equipment, d)).equipment as typeof hero.equipment) : { ...hero.equipment, [d.slot]: prev } }) : null;
    return { now, after };
  }

  /**
   * Affix satırı: kademe etiketi (C / B / A) + stat ikonu (savaş HUD'ı / Gear ile aynı kaynak: ui/stat-tips > statIcon) + "+6% Crit chance (5–7)". `align` center: x orta; left: x sol.
   * Dikey orta `cy`. Üstüne gelince / dokununca açıklama ipucu (describeStat; `stats` önce -> sonra). Dönen: genişlik.
   */
  private statChip(
    line: AffixLine,
    x: number,
    cy: number,
    size: number,
    align: 'center' | 'left',
    add: (o: Phaser.GameObjects.GameObject) => void,
    addTop: (o: Phaser.GameObjects.GameObject) => void,
    stats: () => { now: Stats; after: Stats | null } | null,
    zoneH?: number,
    maxW?: number,
  ): number {
    // Affix satırı (Ömer 2026-10-11): kademe etiketi (C / B / A) + ikon + zarlanmış değer + aralık: "B  +6% Crit chance (5–7)"
    const tag = elText(this, 0, cy, line.tier, Math.round(size * (this.ph.on ? 0.9 : 0.72)), TIER_COLOR[line.tier], { em: 0.06, weight: '700' }).setOrigin(0, 0.5);
    const t = this.note(0, cy, chipText(line), size, C.stat, false).setOrigin(0, 0.5);
    const ic = line.stat ? statIcon(line.stat) : null;
    const isz = Math.round(size * 1.05);
    const gap = ic ? 8 : 0;
    const tw = tag.width + 10;
    let w = tw + (ic ? isz + gap : 0) + t.width;
    // Telefonda büyüyen yazı kart genişliğine sığmazsa yalnızca yazı kısmı küçülür (en az ~9,5 gerçek px'e kadar; yoksa taşmaz diye üstte kalır)
    if (maxW && w > maxW) {
      const fixed = w - t.width;
      t.setScale(Math.max(0.5, (maxW - fixed) / t.width));
      w = fixed + t.width * t.scaleX;
    }
    const x0 = align === 'center' ? x - w / 2 : x;
    tag.setX(x0);
    add(tag);
    if (ic) add(this.add.image(x0 + tw + isz / 2, cy, ensureIcon(this, ic.kind, ic.color, false)).setDisplaySize(isz, isz));
    t.setX(x0 + tw + (ic ? isz + gap : 0));
    add(t);
    addTop(this.tipZoneFor(line, x0 + w / 2, cy, w + 12, zoneH ?? size + 14, stats));
    return w;
  }

  /** Stat ipucu alanı: üstüne gelince / dokununca describeStat açıklaması (önce -> sonra); ikinci dokunuş kapatır. */
  private tipZoneFor(key: string | AffixLine, cx: number, cy: number, w: number, h: number, stats: () => { now: Stats; after: Stats | null } | null): Phaser.GameObjects.Zone {
    // Stat kimliği olan affix (Armor, Crit...) stat açıklamasını (önce -> sonra) gösterir; diğerleri (element hasarı, delme...) affix açıklamasını
    const sk = typeof key === 'string' ? key : key.stat;
    const ic = sk ? statIcon(sk) : null;
    const z = this.add.zone(cx, cy, w, h).setInteractive();
    const show = () => {
      const st = stats();
      const info = sk ? (st ? statTip(sk, st.now, st.after) : null) : typeof key === 'string' ? null : affixTip(key);
      if (!info) return;
      this.hideTip();
      const parts = sk ? statTipParts(sk, info) : null;
      const tip = bandTip(this, { accent: parts?.accent ?? '#d9b26a', kind: parts?.kind ?? 'Affix', title: parts?.name ?? info.title, ...((info as { sub?: string }).sub ? { sub: (info as { sub?: string }).sub! } : {}), ...(ic ? { icon: ensureIcon(this, ic.kind, ic.color, false) } : {}), ...(parts?.value !== undefined ? { value: parts.value } : {}), ...(parts?.valueLabel ? { valueLabel: parts.valueLabel } : {}), ...(info.titleDiff ? { valueDiff: { text: info.titleDiff.text.replace(/^\((.*)\)$/, '$1'), hex: info.titleDiff.dir === 'up' ? TIP_UP : TIP_DOWN } } : {}), lines: info.lines.map((text) => ({ text })), width: 460 });
      const m = z.getWorldTransformMatrix();
      placeElTip(this, tip, { x: m.tx - z.width / 2, y: m.ty - z.height / 2, w: z.width, h: z.height }, 'above');
      this.tip = tip.container;
      this.tipOwner = z;
    };
    z.on('pointerover', show);
    z.on('pointerout', () => this.tipOwner === z && this.hideTip());
    z.on('pointerup', () => (this.tipOwner === z && this.tip ? this.hideTip() : show()));
    return z;
  }

  /**
   * Epic item etkisi satırı ("Thrifty: Your first skill each battle costs no MP."): küçük kor elmas + italik, sıcak vurgulu renk; `maxW`'a
   * sığmazsa "…" ile kısaltılır ve üstüne gelince / dokununca tam metin ipucu açılır. (x, cy): align center = orta, left = sol kenar.
   */
  private effectNote(text: string, x: number, cy: number, maxW: number, size: number, align: 'center' | 'left', add: (o: Phaser.GameObjects.GameObject) => void, addTop: (o: Phaser.GameObjects.GameObject) => void): void {
    const col = '#f0a860';
    const dia = 12;
    const t = this.note(0, cy, text, size, col, true).setOrigin(0, 0.5);
    // Telefon: yazı büyüdü, tek satıra sığmaz; en çok PHONE.effectLines satıra sarılır (üstten hizalı), hâlâ sığmazsa "…" + ipucu (tam metin)
    const wrapped = this.ph.on;
    if (wrapped) t.setOrigin(0, 0).setY(cy - size * 0.55).setWordWrapWidth(maxW - dia - 4, true).setAlign('center');
    let cut = false;
    while ((wrapped ? t.getWrappedText().length > PHONE.effectLines : t.width > maxW - dia - 4) && t.text.length > 4) {
      t.setText(`${t.text.slice(0, -2).trimEnd()}…`);
      cut = true;
    }
    const w = dia + t.width;
    const x0 = align === 'center' ? x - w / 2 : x;
    const g = this.add.graphics();
    g.fillStyle(EL.EMBER, 0.9).fillPoints(diamondPts(x0 + 4, wrapped ? t.y + size * 0.6 : cy, 4), true);
    add(g);
    t.setX(x0 + dia);
    // add() kartın yerel koordinatına kaydırır: ipucu alanının yerini önce hesapla
    const ty = t.y;
    add(t);
    if (!cut) return;
    const [name, ...rest] = text.split(': ');
    // Telefon: alan en az 44 gerçek piksel; yalnızca aşağı büyür (üstteki stat satırlarının alanını ezmesin)
    const zh = wrapped ? Math.max(t.height + 8, touchUnits(PHONE.touchPx)) : size + 14;
    const z = this.add.zone(x0 + w / 2, wrapped ? ty - 4 + zh / 2 : cy, w, zh).setInteractive();
    const show = () => {
      this.hideTip();
      const tip = bandTip(this, { accent: col, title: name ?? text, lines: rest.length ? [{ text: rest.join(': ') }] : [], width: 440 });
      const m = z.getWorldTransformMatrix();
      placeElTip(this, tip, { x: m.tx - z.width / 2, y: m.ty - z.height / 2, w: z.width, h: z.height }, 'above');
      this.tip = tip.container;
      this.tipOwner = z;
    };
    z.on('pointerover', show);
    z.on('pointerout', () => this.tipOwner === z && this.hideTip());
    z.on('pointerup', () => (this.tipOwner === z && this.tip ? this.hideTip() : show()));
    addTop(z);
  }

  /** Kart türlerinin hafif zemin renkleri (kit paleti içinde; çok düşük alfa). */
  private static readonly TINT = { item: 0x6f8aa8, gold: 0xd9b24a, heal: 0x9a3a32, feast: 0xc0782a, relic: 0x8a6ab0, revive: 0x7aa86a, xp: 0x5a7aa0 } as const;

  private rewardCard(run: EndlessRun, card: RewardCard, index: number, cx: number, w: number, special: 'elite' | 'boss' | null): void {
    const rich = !!special;
    const R = this.cardBox().medal;
    const ph = this.ph;
    const kicker = card.kind === 'item' ? (itemOptions(card).length > 1 ? `${T.kickerItem(special)} · ${T.itemCardChoice(itemOptions(card).length)}` : T.kickerItem(special)) : card.kind === 'gold' ? T.kickerGold(special) : card.kind === 'feast' ? T.kickerFeast : card.kind === 'revive' ? T.kickerRevive : card.kind === 'xp' ? T.kickerXp : T.kickerHeal(special);
    const d = card.kind === 'item' ? viewDef(itemDef(card.itemId), card.rolls) : undefined;
    const accent = d ? hexNum(rarityColor(d)) : card.kind === 'gold' ? 0xecc878 : card.kind === 'feast' ? 0xf0b860 : card.kind === 'revive' ? 0x9ad08a : card.kind === 'xp' ? 0x8fb0d8 : 0xd96a5a;
    const tint = EndlessScene.TINT[card.kind];
    this.choiceCard({ index, cx, w, rich, accent, tint, kicker, take: () => this.actTakeReward(run, index), rarity: !!d, blocked: rewardBlockedReason(run, card) }, (k) => {
      const emblem = d ? itemEmblem(this, d, rarityColor(d)) : card.kind === 'gold' ? purseEmblem(this) : card.kind === 'feast' ? feastEmblem(this) : card.kind === 'xp' ? (this.uiTex('codex') ?? healEmblem(this)) : healEmblem(this);
      const m = medallion(this, emblem, accent, R, { rich });
      m.setPosition(k.cx, k.top + R + 18);
      k.add(m);
      const y = k.top + R * 2 + ph.pick(52, 26);
      if (card.kind === 'item' && d) this.itemCardBody(run, d, k, y, card.heroId, card.rolls);
      else if (card.kind === 'gold') {
        k.add(elText(this, k.cx, y + 12, `+${card.amount}`, 52, EL.ON, { em: 0.04, weight: '700' }).setOrigin(0.5));
        k.add(this.label(k.cx, y + ph.pick(52, 62), 'GOLD', ph.fs(18, true), C.dim).setOrigin(0.5, 0));
        k.add(this.note(k.cx, y + ph.pick(96, 112), cardText(card), ph.fs(21), C.text).setOrigin(0.5, 0).setWordWrapWidth(k.w - ph.pick(60, 48)).setAlign('center'));
        k.add(this.note(k.cx, k.bottom - ph.pick(30, 46), T.purse(run.gold, run.gold + card.amount), ph.fs(20), C.accent).setOrigin(0.5, 0));
      } else if (card.kind === 'heal' || card.kind === 'feast') {
        const big = card.kind === 'heal' ? `+${Math.round(card.ratio * 100)}%` : T.fullHealth;
        k.add(elText(this, k.cx, y + 12, big, card.kind === 'heal' ? 48 : 34, EL.ON, { em: 0.04, weight: '700' }).setOrigin(0.5));
        const text = this.note(k.cx, y + 48, cardText(card), ph.fs(20), C.text).setOrigin(0.5, 0).setWordWrapWidth(k.w - ph.pick(56, 44)).setAlign('center');
        k.add(text);
        this.healRows(run, card.kind === 'heal' ? card.ratio : 1, k, y + 48 + text.height + 16);
      } else if (card.kind === 'xp') {
        // Veteran's Lesson (Ömer 2026-10-20): büyük oran + kart metni
        k.add(elText(this, k.cx, y + 12, `+${Math.round(card.ratio * 100)}%`, 48, EL.ON, { em: 0.04, weight: '700' }).setOrigin(0.5));
        k.add(this.label(k.cx, y + ph.pick(52, 62), 'XP', ph.fs(18, true), C.dim).setOrigin(0.5, 0));
        k.add(this.note(k.cx, y + ph.pick(96, 112), cardText(card), ph.fs(21), C.text).setOrigin(0.5, 0).setWordWrapWidth(k.w - ph.pick(60, 48)).setAlign('center'));
      } else if (card.kind === 'revive') {
        // Düşmüş kahraman: portre + ad, "0% → 50%" (Ömer 2026-10-10 takip)
        const hero = run.heroes.find((h) => h.id === card.heroId);
        const def = hero ? content.classes[hero.class] : undefined;
        const name = hero ? className(hero.class) : '';
        k.add(fitText(elText(this, k.cx, y + 12, T.revive(name), ph.fs(30), EL.ON, { em: 0.04, weight: '700' }).setOrigin(0.5), k.w - 40));
        if (def) {
          k.add(this.add.rectangle(k.cx, y + ph.pick(96, 92), 88, 88, EL.INK, 0.9).setStrokeStyle(1, EL.GOLD, EL.LINE.a2));
          k.add(classAvatar(this, def, k.cx, y + ph.pick(96, 92), 84));
        }
        k.add(this.note(k.cx, y + ph.pick(156, 152), cardText(card), ph.fs(20), C.text).setOrigin(0.5, 0).setWordWrapWidth(k.w - ph.pick(56, 44)).setAlign('center'));
        k.add(this.note(k.cx, k.bottom - ph.pick(30, 46), T.healPreview(0, card.ratio), ph.fs(20), C.accent).setOrigin(0.5, 0));
      }
      // Item kartı: sağ üst köşede satış değeri + küçük piksel sikke
      if (d && card.kind === 'item') this.sellTag(sellValue({ id: d.id, ...(card.rolls ? { rolls: card.rolls } : {}) }), k.x1 - 18, k.top + 6, k.add);
    });
  }

  /** "Sell: 55" + küçük piksel sikke (sağa yaslı; `right` = sağ kenar, `y` = dikey orta). */
  private sellTag(gold: number, right: number, y: number, add: (o: Phaser.GameObjects.GameObject) => void): void {
    const fs = this.ph.fs(18);
    const ic = this.ph.pick(24, fs);
    const coin = this.add.image(right - ic / 2 + 1, y, purseEmblem(this)).setDisplaySize(ic, ic);
    add(coin);
    add(this.note(right - ic - 4, y, T.sell(gold), fs, C.accent).setOrigin(1, 0.5));
  }

  /**
   * "Usable by" satırı (Ömer 2026-10-09, taslak v2): silahsa yalnızca takabilen takım üyelerinin küçük avatarları (ad yok); kimse
   * takamıyorsa kısa bir uyarı (class adı yok); silah değilse (herkes takar) "Any hero". Kural `canEquip` (silah aileleri).
   */
  private usableRow(run: EndlessRun, d: ItemDef, cx: number, y: number, add: (o: Phaser.GameObjects.GameObject) => void, o: { label?: boolean; av?: number; maxW?: number } = {}): void {
    const av = o.av ?? 40;
    if (o.label !== false) {
      add(elText(this, cx, y, T.usableBy, this.ph.fs(14, true), C.dim, { em: this.ph.pick(0.22, PHONE.em) }).setOrigin(0.5));
      y += this.ph.pick(22, 32) + av / 2;
    }
    if (d.slot !== 'weapon') {
      add(this.note(cx, y, T.anyHero, this.ph.fs(20), C.sub, true).setOrigin(0.5));
      return;
    }
    const ok = run.heroes.filter((h) => canEquip(h.class, d));
    if (!ok.length) {
      add(fitText(this.note(cx, y, T.noOneCanWield, this.ph.fs(20), C.warn, true).setOrigin(0.5), o.maxW ?? 400));
      return;
    }
    const gap = 10;
    const x0 = cx - ((ok.length - 1) * (av + gap)) / 2;
    ok.forEach((h, i) => {
      const def = content.classes[h.class];
      if (!def) return;
      const x = x0 + i * (av + gap);
      add(this.add.rectangle(x, y, av + 4, av + 4, EL.INK, 0.9).setStrokeStyle(1, EL.GOLD, EL.LINE.a3));
      add(classAvatar(this, def, x, y, av));
    });
  }

  /** Item kartı gövdesi: ad (nadirlik rengi), tür, statlar; altta "Usable by" satırı. */
  private itemCardBody(run: EndlessRun, d: ItemDef, k: CardCtx, y: number, heroId?: string, rolls?: ItemRolls): void {
    const ph = this.ph;
    k.add(fitText(this.label(k.cx, y - ph.pick(8, 14), d.name, ph.fs(26) + ph.pick(0, PHONE.nameBump), rarityColor(d)).setOrigin(0.5, 0), k.w - 40));
    // Alt başlık: örneğin seviyesi + (silahta) taban gücü (Item Güçlendirme 2026-10-17)
    const ilvl = rolls?.ilvl ?? d.ilvl;
    const pw = d.slot === 'weapon' ? ` · Power ${weaponPowerOf(d, ilvl)}` : '';
    const sub = this.note(k.cx, y + ph.pick(30, 40), `${itemSubtitle(d, clampRarity(d, rolls?.rarity), ilvl)}${pw}`, ph.fs(19), C.dim, true).setOrigin(0.5, 0);
    // Telefon: uzun alt başlık (Legendary Sword · One-handed · Item level 10 · Power 56) küçülmez, kart genişliğinde ortalı 2 satıra sarılır
    if (ph.on) sub.setWordWrapWidth(k.w - 40, true).setAlign('center');
    k.add(ph.on ? sub : fitText(sub, k.w - 40));
    const subExtra = ph.on ? Math.max(0, sub.height - PHONE.subLineH) : 0;
    // Stat satırları: ikon + yazı (Gear kartı gibi); üstüne gelince / dokununca açıklama, kartın önerdiği kahraman için önce -> sonra
    const hero = heroId ? heroOf(run, heroId) : undefined;
    let ly = y + ph.pick(85, 106) + subExtra;
    const rows = itemStatRows(d, rolls, run, heroId).slice(0, 4);
    const pitch = ph.pick(31, PHONE.rowPitch);
    // Telefon: tek satırda ipucu alanı 44 gerçek piksele çıkar; üst üste satırlarda komşuyu ezmesin diye satır aralığı kadar (birleşik)
    const zoneH = ph.on ? (rows.length === 1 ? touchUnits(PHONE.touchPx) : pitch) : undefined;
    for (const r of rows) {
      this.statChip(r, k.cx, ly, ph.fs(23), 'center', k.add, k.addTop, () => this.tipStats(hero, d, rolls), zoneH, k.w - 24);
      ly += pitch;
    }
    // Legendary etkisi (Gear kartıyla aynı metin: progression effectLine): statların altında ayrı, vurgulu tek satır; sığmazsa kısaltılır + ipucu
    const fx = effectLine(d);
    if (fx) this.effectNote(fx, k.cx, ly + ph.pick(4, 12), k.w - 48, ph.fs(21), 'center', k.add, k.addTop);
    this.usableRow(run, d, k.cx, k.bottom - ph.pick(78, 76), k.add, { maxW: k.w - 40 });
  }

  /** İyileştirme kartındaki kahraman satırları: avatar + ad + ince can çubuğu + "80% → 100%". Kalan yüksekliğe sığar (4 ve üstü kahraman). */
  private healRows(run: EndlessRun, ratio: number, k: { cx: number; w: number; bottom: number; x0: number; add: (o: Phaser.GameObjects.GameObject) => void }, y0: number): void {
    const n = run.heroes.length;
    if (!n) return;
    const rowH = Math.max(24, Math.min(this.ph.pick(46, PHONE.healRowMax), (k.bottom - y0) / n));
    const av = Math.max(20, rowH - 10);
    // Telefon: yazı en az ~11 gerçek px; sağdaki "80% → 100%" için daha çok yer ayrılır
    const fz = this.ph.on ? this.ph.fs(19) : Math.min(19, rowH * 0.5);
    const reserve = this.ph.pick(120, 210);
    const left = k.x0 + 30;
    const right = k.x0 + k.w - 30;
    run.heroes.forEach((hh, i) => {
      const cy = y0 + rowH * i + rowH / 2;
      const def = content.classes[hh.class];
      // Ceset şifayla kalkmaz (yalnızca Revive kartı): "Fallen"
      const dead = hh.hpRatio <= 0;
      const to = dead ? 0 : Math.min(1, hh.hpRatio + ratio);
      if (def) {
        k.add(this.add.rectangle(left + av / 2, cy, av + 4, av + 4, EL.INK, 0.9).setStrokeStyle(1, EL.GOLD, EL.LINE.a2));
        k.add(classAvatar(this, def, left + av / 2, cy, av));
      }
      const nameX = left + av + 12;
      k.add(fitText(this.note(nameX, cy - 2, className(hh.class), fz, C.dim).setOrigin(0, 1), right - nameX - reserve));
      // ince çubuk: şimdiki can + iyileşecek kısım (açık)
      const bw = right - nameX - reserve + 2;
      const g = this.add.graphics();
      g.fillStyle(EL.INK, 0.85).fillRect(nameX, cy + 3, bw, 5);
      g.fillStyle(0x7fb85a, 0.35).fillRect(nameX, cy + 3, bw * to, 5);
      g.fillStyle(0x7fb85a, 0.95).fillRect(nameX, cy + 3, bw * Math.max(0, hh.hpRatio), 5);
      k.add(g);
      k.add(this.note(right, cy, dead ? T.fallen : T.healPreview(hh.hpRatio, to), fz, to > hh.hpRatio ? C.text : C.dim).setOrigin(1, 0.5));
    });
  }

  // ============================================================ tüccar (Odo the Peddler; taslak v1 "Travelling cart")

  /**
   * Tüccar ekranı (Ömer 2026-10-09, taslak v1): solda tüccar figürü + konuşma balonu + kese; sağda Buy / Sell sekmeleri. Buy: 3x3 tezgâh
   * (nadirlik çerçeveli ikonlar, altta fiyat; alınamayan soluk + kırmızı fiyat; silahta köşede kullanabilenlerin avatarları), Sell: torba
   * (sayfalı 4x3) + bu ziyaretin geri alım satırı. En sağda seçilenin detay paneli: statlar, "Usable by" (yalnızca takabilenler, fark satırları,
   * BEST), takılıyla karşılaştırma (avatara dokununca kahraman değişir) ve tek eylem düğmesi. Kor elmas yalnızca seçili malda.
   */
  /**
   * Tüccar (Ömer 2026-10-11, g1): DOM ekranı (src/ui/merchant-screen.ts): solda tezgâh, sağda ortak Inventory, "Character" (C) karşılaştırma,
   * varışta karşılama (seçenek C, ziyaret başına bir kez). Phaser tarafı yalnızca zemini (savaş alanı + koyulaştırma) çizer.
   */
  private drawShop(): void {
    const run = endless.run;
    if (!run?.shop) return this.go('title');
    const root = document.getElementById('ui-root');
    if (!root || this.shopDom) return;
    const key = `${run.seed}|${run.wave}`;
    const welcome = EndlessScene.shopWelcomed !== key;
    EndlessScene.shopWelcomed = key;
    this.gearOpen = true; // sahne tuşları (Esc) DOM ekranına bırakılır
    this.shopDom = openEndlessMerchant(root, () => endless.run!, (r) => commit(r), {
      welcome,
      onLeave: () => {
        const r = endless.run;
        if (r) this.actLeaveShop(r);
      },
    });
  }

  private closeShopDom(): void {
    if (!this.shopDom) return;
    this.shopDom();
    this.shopDom = null;
    this.gearOpen = false;
  }

  private drawOver(): void {
    const run = endless.run;
    const last = endless.last;
    if (!run || !last) return this.go('title');
    const abandoned = run.end === 'abandoned';
    this.heading(T.overTitle(abandoned), T.overSub(abandoned, run.wave));
    const e = last.entry;
    this.add2(this.note(CX, 250, T.overStats(e.cleared, e.turns, e.kills, e.gearScore), 26, C.accent).setOrigin(0.5));
    this.add2(this.note(CX, 296, T.overRank(last.rank), 26, last.rank === 0 ? C.bright : C.text, true).setOrigin(0.5));
    this.panel(CX - 400, 350, 800, 520, 0.8);
    this.scoreList(CX - 360, 378, 720, scores(), last.rank);
    this.button(CX - 220, 950, 320, T.mainMenu, () => this.actMainMenu());
    this.button(CX + 220, 950, 320, T.newRun, () => {
      endless.run = null;
      this.actStartPick();
    }, { primary: true });
  }

  /** En iyi koşular listesi (yerel, ilk 10). `mark`: vurgulanacak satır. */
  private scoreList(x: number, y: number, w: number, list: ScoreEntry[], mark = -1): void {
    this.add2(this.label(x, y, T.bestRuns, 26));
    if (!list.length) {
      this.add2(this.note(x, y + 52, T.noRuns, 24, C.dim, true));
      return;
    }
    list.forEach((e, i) => {
      const ry = y + 52 + i * 44;
      const on = i === mark;
      if (on) this.add2(this.add.rectangle(x - 12, ry - 4, w + 24, 40, 0xe0702a, 0.16).setOrigin(0, 0));
      const col = on ? C.bright : C.text;
      this.add2(this.note(x, ry, `${i + 1}.`, 24, col));
      this.add2(this.label(x + 50, ry + 2, T.scoreWave(e.wave), 22, col));
      this.add2(fitText(this.note(x + 210, ry, e.classes.map(className).join(' · '), 22, col), w - 210 - 130));
      this.add2(this.note(x + w, ry, T.scoreTurns(e.turns), 22, C.dim).setOrigin(1, 0));
    });
  }

  // ============================================================ çizim yardımcıları

  /** Sol üst geri ikonu (tasarım kiti: elBack; geri / menu kuralı CLAUDE.md). */
  private drawBack(): void {
    this.backBtn = elBack(this, () => !this.confirm && this.back(), { depth: 20 }).root;
  }

  private add2<O extends Phaser.GameObjects.GameObject>(o: O): O {
    this.root.add(o);
    return o;
  }

  private tapZone(x: number, y: number, w: number, h: number, run: () => void): Phaser.GameObjects.Zone {
    const z = this.add2(this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }));
    z.on('pointerup', () => !this.confirm && run());
    return z;
  }

  /** Altın degradeli Cinzel başlık + süs çizgileri (kit: elHeading) ve EB Garamond italik alt yazı. */
  private heading(title: string, sub?: string): void {
    this.add2(elHeading(this, CX, LOOK.headingY, title, 46));
    if (!sub) return;
    const y = LOOK.subY - 14;
    const t = this.note(CX, y, sub, this.ph.fs(25), this.ph.pick(C.sub, C.bright), true).setOrigin(0.5);
    if (this.ph.on) {
      // Telefon: koyu mürekkep şeridi + ince altın çizgi (diğer ipuçları gibi); yazı arka planda kaybolmasın
      const w = t.width + PHONE.strip.padX * 2;
      const g = this.add2(this.add.graphics());
      g.fillStyle(EL.INK, PHONE.strip.alpha).fillRect(CX - w / 2, y - PHONE.strip.h / 2, w, PHONE.strip.h);
      g.lineStyle(1, EL.GOLD, EL.LINE.a3).strokeRect(CX - w / 2 + 0.5, y - PHONE.strip.h / 2 + 0.5, w - 1, PHONE.strip.h - 1);
    }
    this.add2(t);
  }

  /** EB Garamond açıklama yazısı (kit: elBody). */
  private note(x: number, y: number, text: string, size = 24, color: string = C.text, _italic = false): Phaser.GameObjects.Text {
    return elBody(this, x, y, text, size, color, false);
  }

  /** Cinzel küçük başlık (kit: elText). */
  private label(x: number, y: number, text: string, size = 26, color: string = C.bright): Phaser.GameObjects.Text {
    return elText(this, x, y, text, size, color, { em: 0.04, upper: false });
  }

  /** Kit düğmesi: primary (START dili) / secondary; pasifken soluk, dokununca sallanır. Merkez (cx, cy). */
  /** Boyalı arayüz ikonunun doku anahtarı (dosya yoksa undefined: ikonsuz düzen). */
  private uiTex(k: UiIconKind): string | undefined {
    return hasUiImage(k) ? ensureIcon(this, uiIconName(k), '#e8c47e', false) : undefined;
  }

  private button(cx: number, cy: number, w: number, label: string, run: () => void, o: { primary?: boolean; enabled?: boolean; h?: number; size?: number; icon?: string | undefined } = {}): ElButton {
    const enabled = o.enabled ?? true;
    const b = elButton(
      this,
      label,
      () => {
        if (this.confirm) return;
        if (!enabled) return b.shake();
        run();
      },
      {
        kind: o.primary ? 'primary' : 'secondary',
        w: this.ph.on ? Math.round(w * PHONE.btnW) : w,
        h: o.h ?? (o.primary ? 76 : 60) * (this.ph.on ? PHONE.btnH : 1),
        size: o.size ?? this.ph.fs(o.primary ? 24 : 19),
        ready: enabled,
        ...(o.icon ? { icon: o.icon } : {}),
        // Telefon: dokunma alanı en az 44 gerçek piksel (görünüm aynı kalır; yalnızca dikey büyür)
        ...(this.ph.on ? { touch: { minPx: PHONE.touchPx, maxExtraW: 0 } } : {}),
      },
    );
    b.root.setPosition(cx, cy);
    this.add2(b.root);
    return b;
  }

  private panel(x: number, y: number, w: number, h: number, alpha = 0.92): void {
    this.add2(elPanel(this, x, y, w, h, { alpha }));
  }

  /** Kafa portresi ("avatar") + primary grubu renginde ince çerçeve. */
  private avatar(def: CombatantDef, cx: number, cy: number, size: number): void {
    const col = Phaser.Display.Color.HexStringToColor(groupColor(PRIMARY_COLORS, def.primary)).color;
    this.add2(this.add.rectangle(cx, cy, size + 6, size + 6, 0x120c07, 1).setStrokeStyle(1, col, 0.8));
    this.add2(classAvatar(this, def, cx, cy, size));
  }

  private hpBar(x: number, y: number, w: number, h: number, ratio: number): void {
    const g = this.add2(this.add.graphics());
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    const col = r > 0.6 ? 0x7fb85a : r > 0.3 ? 0xd9b24a : 0xc4553f;
    // Kit: ince çubuk (koyu zemin + ince altın çizgi)
    g.fillStyle(EL.INK, 0.8).fillRect(x, y, w, h);
    if (r > 0) g.fillStyle(col, 0.95).fillRect(x + 1, y + 1, Math.max(2, (w - 2) * r), h - 2);
    g.lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  }

  /** Onay (kit: elConfirm). Yalnızca ilerleme kaybolacaksa sorulur (koşuyu bırakmak, yeni koşu). */
  private ask(text: string, yes: () => void): void {
    this.closeConfirm();
    const c = elConfirm(this, {
      text,
      yes: T.yes,
      no: T.no,
      onYes: () => {
        this.confirm = null;
        yes();
      },
      onNo: () => (this.confirm = null),
    });
    this.confirm = c;
  }

  private closeConfirm(): void {
    this.confirm?.close();
    this.confirm = null;
  }
}
