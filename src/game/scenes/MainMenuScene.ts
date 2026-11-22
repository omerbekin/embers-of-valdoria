import Phaser from 'phaser';
import { menuMusic } from '../../ui/music';
import type { SaveEntry } from '../../campaign';
import { backgroundKey, hasBackground, loadRestInBackground, preloadAssets } from '../assets';
import { campaignArtKey, hasCampaignArt, preloadCampaignArt } from '../campaign-art';
import { cardArt, hasCardArtFile, preloadCardArt } from '../card-art';
import { MenuBackdrop, hasMenuLayers, preloadMenuLayers } from '../menu-backdrop';
import { onReducedMotionChange, reducedMotion } from '../../ui/motion-pref';
import { motion } from '../../ui/motion';
import { blurredTexture, edgeFillers, mapArt } from '../map-art';
import { coverShift, focusCrop, placeArt } from '../wide-map';
import layout from '../../../data/battle-layout.json';
import { onStageResize, stageView } from '../stage';
import { FULL_W, FULL_X0, MENU_COL_X, menuColumnShift } from '../../ui/viewport';
import type { Modal } from '../campaign-ui';
import { storage } from '../kv-storage';
import { subscribe as onCloudEvent } from '../../cloud/cloud';
import { ensureGlow, fitText, goldText, serif } from '../menu-text';
import { mp, MP_SCENE } from '../mp-client';
import { addLogo, hasLogo, preloadLogo } from '../branding';
import { setSettingsOpen } from '../../ui/settings';
import { DISPLAY_VERSION } from '../../ui/display-version';
import { isInputLocked, lockInput, unlockInput } from '../../ui/input-lock';
import { promptCode } from '../../ui/mp-overlay';
import { normalizeLobbyCode } from '../../net/lobby-code';
import { openWiki } from '../../wiki/open';
import { BODY_FONT, DISPLAY_FONT } from '../../ui/menu-style';
import { menuFontsReady, whenMenuFontsReady } from '../../ui/menu-fonts';
import { markBootReady, setBootProgress } from '../../ui/boot-loader';
import { buildLedger, ledgerHeight, type Ledger, type LedgerRow } from '../menu-ledger';
import { EL, elBack, elGo, elScreenIn, elBody } from '../elegant-ui';
import { trackChunkLoad } from '../../ui/boot-loader';
import type { LazySceneKey } from '../lazy-scenes';
import { MAIN_ITEMS, backTarget, backdropFor, campaignButtons, endlessBestWave, initialView, moveSelection, timeAgo, type MenuItemKey, type MenuView } from '../main-menu-flow';

export interface MainMenuData {
  /** 'load': Load Game penceresi açık başlar (yenilgi sonrası "Load Game"); 'new': New Campaign penceresi. İkisi de Play kartlarının üstünde açılır. */
  open?: 'load' | 'new';
  /** Doğrudan bir görünümle aç (debug menüsü). */
  view?: MenuView;
}

// --- Yerleşim (1920x1080) ---
// Oyun birimi (1920x1080; src/game/campaign-ui.ts ile aynı, onu içe aktarmadan: hızlı açılış)
const W = layout.width;
const H = layout.height;
// Sahne anahtarları (sahnelerin kodu ayrı parçalarda: src/game/lazy-scenes.ts)
const MAP_SCENE: LazySceneKey = 'CampaignMapScene';
const ENDLESS_SCENE: LazySceneKey = 'EndlessScene';
/** Sefer yuva ekranı + sefer oturumu (ayrı kod parçası; ilk kullanımda indirilir). */
const loadCampaignUi = () =>
  trackChunkLoad(Promise.all([import('../campaign-slots-ui'), import('../campaign-session')]).then(([slots, session]) => ({ slots, session })));
/**
 * Sefer çekirdeği (kayıt okuma: Continue / Load düğmeleri, kayıt göçü; harita verisi). Motorun tamamını çektiği için açılış yolunda DEĞİL
 * (Ömer 2026-10-17 yükleme performansı): menü onsuz görünür, modül menü hazır olunca iner; Play kartları ve kayıt notları gelince kurulur.
 * Doğrudan açılışlar (yenilgi sonrası Load Game, debug görünümü) önce bunu bekler.
 */
type CampaignCore = typeof import('../../campaign');
let campaignCore: CampaignCore | null = null;
let campaignCoreChunk: Promise<CampaignCore> | null = null;
const loadCampaignCore = (): Promise<CampaignCore> =>
  (campaignCoreChunk ??= import('../../campaign').then(
    (m) => (campaignCore = m),
    (e: unknown) => {
      campaignCoreChunk = null; // ağ hatası: sonraki denemede yeniden
      throw e;
    },
  ));
/** Patch Notes kod parçası (Ömer 2026-10-16): menü hazır olunca birkaç saniye sonra boşta önceden indirilir; inmişse sürüme dokununca
 *  yükleme ekranı çıkmadan anında açılır. */
type PatchNotesModule = typeof import('../../ui/patch-notes');
let patchNotesChunk: Promise<PatchNotesModule> | null = null;
let patchNotesLoaded: PatchNotesModule | null = null;
const loadPatchNotes = (): Promise<PatchNotesModule> =>
  (patchNotesChunk ??= import('../../ui/patch-notes').then(
    (m) => (patchNotesLoaded = m),
    (e: unknown) => {
      patchNotesChunk = null; // ağ hatası: sonraki dokunuşta yeniden denenir
      throw e;
    },
  ));
/** Menü hazır olduktan PATCH_PREFETCH_MS sonra, tarayıcı boşta kalınca indirir. */
const PATCH_PREFETCH_MS = 3000;
function prefetchPatchNotes(): void {
  window.setTimeout(() => {
    const go = (): void => void loadPatchNotes().catch(() => undefined);
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(go, { timeout: 4000 });
    else go();
  }, PATCH_PREFETCH_MS);
}
const COL_X = MENU_COL_X; // sol sütunun yazı başlangıcı (ayarlar ekranı DOM sütunu da aynı: src/ui/viewport.ts)
const COL_W = 560; // ana menü yazı satırlarının genişliği
const SHADE_W = 980; // soldan sağa açılan gölge
/** Ana menü logosunun kutusu (orta x/y, en fazla genişlik/yükseklik; oran korunur). */
const LOGO_BOX = { x: COL_X + 153, y: 372, w: 408, h: 263 }; // Ömer 2026-10-13: taç logosu (680x440'tan %30, %20 küçük, sonra %7 büyük); sol kenarı satırların elmasıyla hizalı, alt kenarı ile Play arasında ~70 birim
/** Menü ölçüleri (zarif stil: Cinzel + EB Garamond; eski "classic" dal 2026-11-09'da silindi). */
const LOOK = {
  rowH: 92, // ince satırlar (dokunma alanı satırın tamamı)
  itemY0: 600, // logo v3 (2026-10-13) ~1,56:1 ve uzun: satırlar logonun altına iner
  mainSize: 30, // Cinzel 600, büyük harf, harf aralığı 0,05em
  panelSize: 28,
  panelY0: 470,
  titleY: 350,
  titleSize: 52,
  valueSize: 26,
  stepSize: 34,
  backSize: 30,
  cardTitle: 40,
  cardLine: 26,
};
const ROW_H = LOOK.rowH; // satır aralığı = dokunma alanı yüksekliği (telefonda ~40-44 gerçek px)
const ITEM_Y0 = LOOK.itemY0;
/** Zarif stilde satır yazısının iç boşluğu (parıltı gölgesi kesilmesin); yazı x'i bu kadar sola alınır. */
const TPAD = 18;
const SHADOW_DARK = 'rgba(12,8,5,0.95)';
/** Ana menünün açılışta istediği arka planlar (Play kartları; yedekleriyle). */
/** Play kartları artık kendi görsellerini kullanır (assets/cards, src/game/card-art.ts): menü açılışında arena arka planı yüklenmez. */
const MENU_BACKGROUNDS: string[] = [];
/** Kart hover ışığının kaynağı (kart görselindeki ışık; kartın kesri) ve rengi: Campaign kale yangını, Quick Battle gökyüzü, Multiplayer ay. */
const CARD_LIGHT: ReadonlyArray<{ x: number; y: number; tint: number }> = [
  { x: 0.75, y: 0.12, tint: 0xe0702a },
  { x: 0.5, y: 0.06, tint: 0xf0a040 },
  { x: 0.8, y: 0.12, tint: 0x96b4ff },
];
/** Quick Battle kartındaki Endless mode anahtarı (localStorage). */
const ENDLESS_TOGGLE_KEY = 'eov.qbEndless';
const SHADOW_GLOW = 'rgba(240,140,40,0.85)';
const CARD_W = 460;
const CARD_H = 640;
const CARD_GAP = 46;
const CARD_CY = 572;
const EMBER = 0xe0702a;
const TXT = '#d9c8a2';
const TXT_ON = '#f3d999';
const PIVOT = { x: W * 0.62, y: H * 0.48 }; // haritanın yaklaştığı nokta (taslaktaki transform-origin)
const EASE_SLIDE = 'Cubic.easeInOut';

/** Canvas dokusu (bir kez üretilir). */
function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) return key;
  draw(t.getContext());
  t.refresh();
  return key;
}

/** Bir sütun satırı (menü maddesi ya da ayar satırı): önünde kor rengi elmas, seçilince/üstüne gelince parıltı. */
interface Row {
  root: Phaser.GameObjects.Container;
  setOn(on: boolean): void;
  run: () => void;
  /** Sol/sağ tuşu (ses kaydırıcısı). */
  adjust?: (d: number) => void;
}

/**
 * Ana menü (Ömer 2026-10-08, taslak menu-flow.html (onaydan sonra silindi), animasyon 1 "March to the map"; saf kararlar `src/game/main-menu-flow.ts`):
 *  - Menü: arkada sefer haritası + soldan sağa açılan gölge; sol sütunda logo ve kutusuz yazı listesi Play · Settings · Codex (Multiplayer Play kartlarında, 2026-10-08)
 *    (seçili satırın önünde kor rengi elmas + hafif parıltı; fare, dokunma, klavye yukarı/aşağı/Enter). Açıklama yazısı yok.
 *  - Play: harita yaklaşır, menü sola kayar, üç kart (Campaign · Quick Battle · Multiplayer) aşağıdan yükselir; sol üstte '◂ Back' / Esc.
 *    Campaign kartı: Continue (kayıt varsa) · New (yuva -> mod + zorluk) · Load (yuva -> kayıtlar; kayıt yoksa pasif).
 *  - Settings / Multiplayer: menü sola çekilir, harita kararıp bulanıklaşır, aynı sütunda satırlar belirir. Lobi kurulunca MultiplayerScene.
 *  - Görünüm stili (2026-10-09): `LOOK` / `ELEGANT` (src/ui/menu-style.ts; ?menu=new önizleme). Elegant: Cinzel satırlar + EB Garamond alt yazılar,
 *    fontlar hazır olmadan çizilmez (create bekler ve sahneyi yeniden kurar), kartlar hover'da yükselir + görsel yakınlaşır. Akış iki stilde aynı.
 */
export class MainMenuScene extends Phaser.Scene {
  static readonly KEY = 'MainMenuScene';
  private modalLayer!: Phaser.GameObjects.Container;
  private modal: Modal | null = null;
  private modalBack: (() => void) | null = null;
  private openOnStart: MainMenuData['open'];
  private startView: MenuView = 'menu';

  private view: MenuView = 'menu';
  private cameFrom: MenuView | null = null;
  private busyUntil = 0;
  private bg: Phaser.GameObjects.Image | null = null;
  /** Katmanlı canlı arka plan (src/game/menu-backdrop.ts); görselleri yoksa eski harita arka planı. */
  private backdrop: MenuBackdrop | null = null;
  private bgBase = 1;
  /** Arka plan merkezinin taban konumu (yakınlaşmasız; geniş ekranda boşluk kalmayacak kadar kaydırılmış). */
  private bgCenter = { x: W / 2, y: H / 2 };
  private bgPlace: { cx: number; cy: number; w: number } | null = null;
  private placeFillers: ((img: Phaser.GameObjects.Image) => void) | null = null;
  private vignette!: Phaser.GameObjects.Image;
  /** Sol sütunun yatay kayması: geniş ekranda sütun ekranın sol kenarına doğru kayar (16:9'da 0). */
  private colX = 0;
  private look = { zoom: 1, dark: 0, blur: 0 };
  private darkRect!: Phaser.GameObjects.Rectangle;
  private bgBlur: Phaser.GameObjects.Image | null = null;
  private lookTween: Phaser.Tweens.Tween | null = null;

  private menuCol!: Phaser.GameObjects.Container;
  private menuRows: Row[] = [];
  private menuSel = 0;
  private back!: Phaser.GameObjects.Container;
  /** Sağ alttaki küçük sürüm yazısı (DISPLAY_VERSION). */
  private version: Phaser.GameObjects.Text | null = null;
  private cards: Array<{ c: Phaser.GameObjects.Container; focus: (on: boolean, kb?: boolean) => void; run: () => void; rowMove?: (d: number) => void; toggle?: () => void; closeLedger?: () => void }> = [];
  private outsideTapBound = false;
  private cardSel = 0;
  private cleanups: Array<() => void> = [];
  private promptOpen = false;

  constructor() {
    super(MainMenuScene.KEY);
  }

  private initData: MainMenuData = {};

  init(data: MainMenuData): void {
    this.initData = data ?? {};
    this.coreBuilt = false;
    this.warmed = false; // dönüşte (savaş sprite'ları bıraktı) Play yeniden ısıtır
    this.openOnStart = data?.open;
    this.startView = initialView(data?.open, data?.view);
    this.modal = null;
    this.modalBack = null;
    this.view = 'menu';
    this.cameFrom = null;
    this.menuRows = [];
    this.cards = [];
    this.outsideTapBound = false;
    this.menuSel = 0;
    this.cardSel = 0;
    this.busyUntil = 0;
    this.bgBlur = null;
    this.bg = null;
    this.backdrop = null;
    this.lookTween = null;
    this.cleanups = [];
    this.promptOpen = false;
    this.version = null;
  }

  preload(): void {
    // Açılış hızı: yalnızca menünün ihtiyacı (kart görselleri, harita, logo); avatarlar, sprite'lar ve diğer arka planlar menü
    // görününce arka planda gelir (loadRestInBackground). İlerleme açılış yükleme ekranına bağlıdır (src/ui/boot-loader.ts).
    preloadAssets(this, { sprites: false, avatars: false, items: false, backgrounds: MENU_BACKGROUNDS });
    // Katmanlı arka plan (assets/menu) varsa geniş harita görseli menüde gerekmez: yalnızca Campaign kartının görseli
    preloadMenuLayers(this);
    // Play kartlarının görselleri (~1 MB) açılış yolunda değil: menü görününce arka planda (loadPlayArt); doğrudan açılışta hemen
    if (this.startView !== 'menu' || this.openOnStart) this.queuePlayArt();
    preloadLogo(this);
  }

  create(): void {
    // Zarif stil: Phaser yazıları çizildiği andaki fontla kalır; fontlar hazır değilse bekle ve sahneyi yeniden kur (yedek fontla çizilmesin)
    if (!menuFontsReady()) {
      this.cameras.main.setBackgroundColor('#0d0a07');
      setBootProgress(0.92);
      void whenMenuFontsReady().then(() => {
        if (this.sys.isActive()) this.scene.restart(this.initData);
      });
      return;
    }
    // Doğrudan açılış (Load Game, debug görünümü): kayıt bilgisi hemen gerekir; sefer çekirdeğini bekle ve sahneyi yeniden kur
    if (!campaignCore && (this.startView !== 'menu' || this.openOnStart)) {
      this.cameras.main.setBackgroundColor('#0d0a07');
      void trackChunkLoad(loadCampaignCore()).then(
        () => this.sys.isActive() && this.scene.restart(this.initData),
        () => undefined,
      );
      return;
    }
    this.playReady = null;
    if (mp.active || mp.state === 'connecting') mp.leave(); // ana menüye dönmek multiplayer lobisinden ayrılmaktır (ağ kodu inerken de)
    this.buildMenuColumn();
    if (campaignCore && this.playArtLoaded()) this.campaignCoreReady(campaignCore);
    this.buildBack();
    this.buildVersion();
    this.buildBackground(); // geniş ekran yerleşimi sütunu ve Back'i de konumlar (onStageResize)
    this.modalLayer = this.add.container(0, 0).setDepth(1000);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    // Lobi kurulmaya başlayınca (Host / Join) mevcut multiplayer ekranı devralır
    const offMp = mp.onChange(() => {
      if (this.scene.isActive() && (mp.state !== 'idle' || mp.active)) this.scene.start(MP_SCENE);
    });
    this.cleanups.push(offMp);
    // Bulut kaydı indirildi (src/cloud/cloud.ts; yalnızca ana menüdeyken uygulanır): Campaign kartındaki Continue / Load yenilenir
    this.cleanups.push(onCloudEvent((e) => e.type === 'applied' && this.coreBuilt && this.sys.isActive() && this.refreshCards()));
    // Ana menü müziği (src/ui/music.ts): ilk kullanıcı hareketinden sonra yükselir. Çıkışta durdurulmaz: sonraki sahne kendi parçasını seçer
    // (sceneMusic: harita / kasaba / kamp / savaş) ve yumuşak geçişle (crossfade) ona geçilir; takım seçimi ve multiplayer menü müziğinde kalır.
    menuMusic(true);
    this.events.once('shutdown', () => {
      for (const fn of this.cleanups) fn();
      this.cleanups = [];
      if (this.promptOpen) unlockInput('main-menu-prompt');
    });

    // Doğrudan açılış (debug görünümü ya da yenilgi sonrası Load Game): animasyonsuz
    if (this.startView !== 'menu') this.setView(this.startView, true);
    if (this.openOnStart === 'load' && campaignCore?.slotSummaries(storage()).some((x) => x && x.saveCount > 0)) this.loadSlots();
    if (this.openOnStart === 'new') this.chooseSlot();
    elScreenIn(this); // ortak ekran geçişi (data/ui-motion.json > screen)
    markBootReady(); // açılış yükleme ekranı kapanır (ilk menü hazır; ölçüm: performance 'menu-ready')
    if (!this.coreBuilt) {
      const scene = this.sys;
      this.playReady = Promise.all([loadCampaignCore(), this.loadPlayArt()]).then(([m]) => {
        if (scene.isActive()) this.campaignCoreReady(m);
      });
      this.playReady.catch(() => (this.playReady = null));
    }
    if (!patchNotesChunk) prefetchPatchNotes(); // sürüm yazısına dokununca Patch Notes anında açılsın
  }

  /**
   * Sınıf / çağrı / tüccar görselleri (takım seçimi, harita, Endless kampı çizer) artık menü açılır açılmaz DEĞİL, oyuncu Play'e girince
   * arka planda iner (Ömer 2026-10-17 yükleme performansı: yavaş bağlantıda menüden hemen sonra Codex / Quick Battle ile yarışıyordu).
   * Gelmeden sahne açılırsa o sahnenin preload'u eksikleri yükler (kısa yükleyici). Sprite listesi motor içeriğine bağlı: ayrı parçadan.
   */
  private warmCharacterArt(): void {
    if (this.warmed) return;
    this.warmed = true;
    // sahne saati font beklemesinden sonraki yeniden kuruluşta hemen işlemeyebiliyor: tarayıcı zamanlayıcısı
    window.setTimeout(() => {
      void import('../sprite-needs').then((m) => this.sys.isActive() && loadRestInBackground(this, m.classSpriteIds())).catch(() => this.sys.isActive() && loadRestInBackground(this));
    }, 50);
  }
  private warmed = false;

  // ------------------------------------------------------------ arka plan

  private buildBackground(): void {
    this.cameras.main.setBackgroundColor('#0d0a07');
    // Katmanlı canlı sahne (Ömer 2026-10-10): yanan kale, yıkık kule, soldaki koyu çamlar; paralaks + ortam animasyonu
    if (hasMenuLayers(this)) {
      this.backdrop = new MenuBackdrop(this);
      this.backdrop.setReduced(reducedMotion());
      this.cleanups.push(onReducedMotionChange((on) => this.backdrop?.setReduced(on)));
    }
    // Geniş (21:9) harita görseli varsa o (eski 16:9 haritanın bölgesi eski yerine oturur; geniş ekranda yanları görünür), yoksa 16:9 görsel
    const art = this.backdrop || !campaignCore ? null : mapArt(this, campaignCore.getMap('valdoria'));
    if (art) {
      this.bg = this.add.image(W / 2, H / 2, art.key).setDepth(0);
      // Eski kural: 16:9 harita ekranı %4 taşarak kaplar. Aynı dikdörtgen geniş görselin bölgesine uygulanır.
      const [x0, y0, x1, y1] = art.region;
      const rw = (x1 - x0) * this.bg.width;
      const rh = (y1 - y0) * this.bg.height;
      const k = Math.max(W / rw, H / rh) * 1.04; // taslaktaki -%4 taşma
      const p = placeArt(this.bg.width, this.bg.height, art.region, { x: W / 2 - (rw * k) / 2, y: H / 2 - (rh * k) / 2, w: rw * k, h: rh * k });
      this.bgBase = p.scale;
      this.bgPlace = { cx: (p.left + p.right) / 2, cy: (p.top + p.bottom) / 2, w: p.right - p.left };
      this.placeFillers = edgeFillers(this, art.key, 0).place;
      this.bg.setScale(this.bgBase);
      // Bulanıklık: önceden bulanıklaştırılmış kopya üstte, saydamlığı 'blur' ile (WebGL preFX büyük görselde kayık/kırpık çiziyordu)
      this.bgBlur = this.add.image(W / 2, H / 2, blurredTexture(this, art.key, 6)).setDepth(0).setAlpha(0);
    }
    const vign = canvasTex(this, 'mm-vign', 480, 270, (ctx) => {
      const g = ctx.createRadialGradient(288, 135, 0, 288, 135, 300);
      g.addColorStop(0, 'rgba(20,14,8,0.25)');
      g.addColorStop(1, 'rgba(8,6,4,0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 480, 270);
    });
    this.vignette = this.add.image(W / 2, H / 2, vign).setDisplaySize(W, H).setDepth(1);
    this.darkRect = this.add.rectangle(FULL_X0, 0, FULL_W, H, 0x000000, 0).setOrigin(0, 0).setDepth(2);
    onStageResize(this, () => this.layoutStage());
  }

  /** Geniş ekran yerleşimi (sahne kurulunca ve ekran boyutu değişince): arka plan kayması, vinyet, sol sütun ve Back konumu. */
  private layoutStage(): void {
    const { left, right, viewW } = stageView;
    this.backdrop?.layout({ left, right });
    if (this.bgPlace) {
      const half = this.bgPlace.w / 2;
      const dx = coverShift({ left: this.bgPlace.cx - half, right: this.bgPlace.cx + half }, left, right);
      this.bgCenter = { x: this.bgPlace.cx + dx, y: this.bgPlace.cy };
    }
    this.vignette.setDisplaySize(viewW, H);
    this.colX = menuColumnShift(left); // sütun ekranın soluna yaklaşır ama kenara yapışmaz (16:9'da 0)
    if (!this.tweens.isTweening(this.menuCol)) this.menuCol.setX(this.view === 'menu' ? this.colX : this.hiddenColX());
    this.version?.setPosition(right - 34, H - 22);
    this.applyLook();
  }

  /** Gizli sütun konumu: gölgesiyle birlikte görünen alanın solunda. */
  private hiddenColX(): number {
    return stageView.left - (SHADE_W + 40);
  }

  private applyLook(): void {
    const { zoom, dark, blur } = this.look;
    if (this.bg) {
      this.bg.setScale(this.bgBase * zoom);
      this.bg.setPosition(PIVOT.x + (this.bgCenter.x - PIVOT.x) * zoom, PIVOT.y + (this.bgCenter.y - PIVOT.y) * zoom);
      this.placeFillers?.(this.bg);
      this.bgBlur?.setPosition(this.bg.x, this.bg.y).setDisplaySize(this.bg.displayWidth, this.bg.displayHeight).setAlpha(blur);
    }
    // Katmanlı sahne: yakınlaşma sahnenin hafif ileri itilmesi; bulanıklık yerine (Settings / Multiplayer) biraz daha koyuluk
    this.backdrop?.setZoom(zoom, PIVOT);
    this.darkRect.setFillStyle(0x000000, this.backdrop ? Math.min(0.85, dark + blur * 0.18) : dark);
  }

  private tweenLook(view: MenuView, instant: boolean): void {
    const to = backdropFor(view);
    this.lookTween?.stop();
    if (instant || (this.backdrop && reducedMotion())) {
      this.look = { ...to };
      this.applyLook();
      return;
    }
    const from = { ...this.look };
    this.lookTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 1;
        this.look = { zoom: from.zoom + (to.zoom - from.zoom) * k, dark: from.dark + (to.dark - from.dark) * k, blur: from.blur + (to.blur - from.blur) * k };
        this.applyLook();
      },
    });
  }

  // ------------------------------------------------------------ sol sütun: ana menü

  /** Sütunun arkasındaki gölge: solda koyu, sağa doğru açılır (sütunla birlikte kayar). */
  private columnShade(w = SHADE_W): Phaser.GameObjects.Graphics {
    // Köşe renkli dolgu (doku değil): eski 256 px doku gölgenin bittiği yerde ince koyu bir çizgi bırakıyordu
    const g = this.add.graphics();
    const c = 0x080604;
    const mid = Math.round(w * 0.7);
    g.fillGradientStyle(c, c, c, c, 0.85, 0.55, 0.85, 0.55).fillRect(0, 0, mid, H);
    g.fillGradientStyle(c, c, c, c, 0.55, 0, 0.55, 0).fillRect(mid, 0, w - mid, H);
    return g;
  }

  /** Gölgenin sola uzantısı (geniş ekranda sütun sağa kayınca sol kenara kadar aynı koyuluk; 16:9'da ekran dışı). */
  private shadeExtension(): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(-800, 0, 800, H, 0x080604, 0.85).setOrigin(0, 0);
  }

  // ------------------------------------------------------------ yazı stilleri 

  /** Satır yazısı (menü maddesi, ayar satırı): classic kalın serif + kontur; elegant Cinzel 600, büyük harf, 0,05em, koyu gölge (seçilince kor parıltısı). */
  private rowText(x: number, y: number, label: string, size: number, color: string): Phaser.GameObjects.Text {
    return serif(this, x - TPAD, y, label.toUpperCase(), size, color, { font: DISPLAY_FONT, weight: '600', spacing: size * 0.05, stroke: 0 })
      .setPadding(TPAD, TPAD, TPAD, TPAD)
      .setShadow(0, 2, SHADOW_DARK, 4, false, true);
  }

  /** Açıklama / alt yazı: classic ince serif; elegant EB Garamond. */
  private noteText(x: number, y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    return serif(this, x, y, text, size + 2, color, { font: BODY_FONT, weight: 'normal', stroke: 0 }).setShadow(0, 1, SHADOW_DARK, 3, false, true);
  }

  /** Altın başlık (Settings / Multiplayer sütunu, kart başlıkları). */
  private titleText(x: number, y: number, text: string, size: number, _spacing: number, weight = '600'): Phaser.GameObjects.Text {
    return goldText(this, x, y, text.toUpperCase(), size, size * 0.05, { font: DISPLAY_FONT, weight, stroke: Math.max(2, Math.round(size / 16)) });
  }

  /** Kutusuz yazı satırı: elmas + yazı (+ isteğe bağlı sağ taraf) + ince ayırıcı çizgi. Dokunma alanı satırın tamamı. */
  private makeRow(y: number, label: string, size: number, run: () => void, o: { right?: Phaser.GameObjects.GameObject[]; enabled?: boolean; onHover?: () => void; width?: number; h?: number; x?: number; color?: string } = {}): Row {
    const rw = o.width ?? COL_W;
    const rh = o.h ?? ROW_H;
    const enabled = o.enabled !== false;
    const base = o.color ?? TXT;
    const root = this.add.container(o.x ?? COL_X, y);
    const glow = this.add.image(0, 0, ensureGlow(this)).setTint(0xf08c28).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const text = this.rowText(34, 0, label, size, enabled ? base : '#7d705a').setOrigin(0, 0.5);
    glow.setDisplaySize(text.width * 1.5 + 80, size * 2.2).setPosition(text.x + text.width / 2, 0);
    const diamond = this.add.graphics();
    const line = this.add.graphics();
    line.lineStyle(1, 0xd9b26a, 0.16).lineBetween(0, rh / 2 - 2, rw, rh / 2 - 2);
    const zone = this.add.zone(rw / 2 - 20, 0, rw + 40, rh).setInteractive({ useHandCursor: enabled });
    root.add([glow, line, diamond, text, ...(o.right ?? []), zone]);
    // Sağ taraftaki etkileşimli parçalar (kaydırıcı, düğme) satırın dokunma alanının üstünde kalsın
    if (o.right) for (const r of o.right) root.bringToTop(r);
    let isOn: boolean | null = null;
    const setOn = (v: boolean): void => {
      diamond.clear();
      if (v) {
        diamond.fillStyle(EMBER, 1).fillPoints([{ x: 10, y: -8 }, { x: 18, y: 0 }, { x: 10, y: 8 }, { x: 2, y: 0 }], true);
        diamond.lineStyle(2, 0xffb35a, 0.9).strokePoints([{ x: 10, y: -8 }, { x: 18, y: 0 }, { x: 10, y: 8 }, { x: 2, y: 0 }], true);
      }
      text.setColor(!enabled ? '#7d705a' : v ? TXT_ON : base);
      this.tweens.killTweensOf(glow);
      this.tweens.add({ targets: glow, alpha: v && enabled ? 0.22 : 0, duration: 150 });
      // Elegant: seçili satır hafif sağa kayar (taslaktaki padding-left geçişi) + kor parıltısı (yazı gölgesi)
      if (isOn !== v) text.setShadow(0, v && enabled ? 0 : 2, v && enabled ? SHADOW_GLOW : SHADOW_DARK, v && enabled ? 14 : 4, false, true);
      const first = isOn === null;
      isOn = v;
      const to = (v ? 46 : 34) - TPAD;
      this.tweens.killTweensOf(text);
      if (first) text.x = to;
      else this.tweens.add({ targets: text, x: to, duration: 180, ease: 'Cubic.easeOut', onUpdate: () => (glow.x = text.x + text.width / 2) });
      glow.x = text.x + text.width / 2;
    };
    setOn(false);
    zone.on('pointerover', () => o.onHover?.());
    zone.on('pointerup', () => {
      if (!this.ready() || !enabled) return;
      run();
    });
    return { root, setOn, run: () => enabled && run() };
  }

  private buildMenuColumn(): void {
    const col = (this.menuCol = this.add.container(0, 0).setDepth(20));
    col.add([this.shadeExtension(), this.columnShade()]);
    // Logo v3 (Ömer 2026-10-13; kale + ateş halkası + başlık, ~1,56:1): sütunun üst yarısında büyük; satırlar altında (ITEM_Y0)
    if (hasLogo(this)) col.add(addLogo(this, LOGO_BOX.x, LOGO_BOX.y, LOGO_BOX.w, LOGO_BOX.h)); // assets/branding/logo.webp (asıl PNG ve üretici: tools/make-logo.mjs)
    else col.add(fitText(this.titleText(LOGO_BOX.x, LOGO_BOX.y, 'EMBERS OF VALDORIA', 64, 4).setOrigin(0.5), 600));
    MAIN_ITEMS.forEach((it, i) => {
      const row = this.makeRow(ITEM_Y0 + i * ROW_H, it.label, LOOK.mainSize, () => this.pickMain(it.key), { onHover: () => this.selectMain(i) });
      col.add(row.root);
      this.menuRows.push(row);
    });
    this.selectMain(0);
  }

  /** Sefer çekirdeği hazır (menü onsuz kurulmuş olabilir): kayıt göçü, kayıt notları ve Play kartları. */
  private campaignCoreReady(m: CampaignCore): void {
    if (this.coreBuilt) return;
    this.coreBuilt = true;
    m.migrateSaves(storage()); // eski tek-liste kayıtlar Slot 1'e taşınır
    const col = this.menuCol;
    const saves = m.readSaves(storage());
    // Daha yeni sürümün kaydı (eski sekme): okunmaz ve yazılmaz (save.ts > write); "damaged" değil, yenileme önerisi
    if (col && saves.corrupt) col.add(fitText(this.noteText(COL_X, H - 60, saves.newer ? m.NEWER_SAVE_TEXT : 'A damaged save file was ignored.', 22, '#d88a7e').setOrigin(0, 0.5), 600));
    // Valdoria A1-x (kayıt sürümü 6): eski haritanın seferleri yeniden başlar; yuva kalır, yeni sefer kaydedilene kadar uyarı (campaign/save.ts)
    if (col && saves.file.slots.some((sd) => sd?.mapChanged))
      col.add(fitText(this.noteText(COL_X, saves.corrupt ? H - 96 : H - 60, 'The Valdoria map has changed; this campaign must restart.', 22, '#d8b27e').setOrigin(0, 0.5), 600));
    this.buildCards();
    if (this.view === 'play') this.showCards(true, true);
  }
  private coreBuilt = false;
  /** Play kartları için beklenen iş (sefer çekirdeği + kart görselleri); kartlar kurulunca / yoksa null. */
  private playReady: Promise<void> | null = null;

  /** Kart görsellerini (yoksa Campaign kartının harita yedeği) yükleyiciye ekler. Dönen: kuyruğa giren dosya. */
  private queuePlayArt(): number {
    const before = this.load.list.size;
    preloadCardArt(this);
    if (!hasCardArtFile('campaign')) preloadCampaignArt(this, ['valdoria-bg']);
    return this.load.list.size - before;
  }

  /** Tüm kart görselleri yüklü mü (dosyası olmayan kart yedek görsele düşer). */
  private playArtLoaded(): boolean {
    return ['campaign', 'quick-battle', 'quick-battle-endless', 'multiplayer'].every((id) => !hasCardArtFile(id) || !!cardArt(this, id));
  }

  /** Kart görsellerini menü görününce arka planda yükler; en geç 20 sn sonra (yavaş / kopuk bağlantı) kartlar yedek görselle kurulur. */
  private loadPlayArt(): Promise<void> {
    if (this.queuePlayArt() === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        this.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
        resolve();
      };
      const onComplete = (): void => {
        if (this.playArtLoaded() || !this.load.isLoading()) finish(); // inmeyen dosya (ağ hatası): kart yedek görselle kurulur
      };
      this.load.on(Phaser.Loader.Events.COMPLETE, onComplete);
      this.time.delayedCall(20000, finish);
      if (!this.load.isLoading()) this.load.start();
    });
  }


  private selectMain(i: number): void {
    this.menuSel = i;
    this.menuRows.forEach((r, k) => r.setOn(k === i));
  }

  private pickMain(key: MenuItemKey): void {
    if (this.view !== 'menu') return;
    if (key === 'play') {
      // sefer çekirdeği daha inmediyse (çok yavaş bağlantı) kartlar onunla kurulur: bekle (kısa yükleyici), sonra aç
      if (!this.coreBuilt)
        void trackChunkLoad(this.playReady ?? loadCampaignCore().then((m) => this.campaignCoreReady(m))).then(
          () => this.sys.isActive() && this.view === 'menu' && this.setView('play'),
          () => undefined,
        );
      else this.setView('play');
    }
    else if (key === 'settings') this.setView('settings');
    else if (key === 'mp') this.setView('mp');
    else if (key === 'credits') {
      // Jenerik (src/ui/credits.ts; data/credits.json): menünün üstünde tam ekran, X / Esc ile kapanır
      const root = document.getElementById('ui-root');
      if (root) void import('../../ui/credits').then((m) => m.openCredits(root));
    } else openWiki(); // Codex = wiki (sağ üstteki kitap simgesiyle aynı pencere)
  }

  // ------------------------------------------------------------ görünüm geçişleri

  /** Kısa geçiş kilidi (çift dokunma / geçiş sırasında tıklama yeni geçiş başlatmasın). */
  private ready(): boolean {
    return this.time.now >= this.busyUntil && !this.modal && !isInputLocked();
  }

  private setView(next: MenuView, instant = false): void {
    // Ayrı Multiplayer sütunu kaldırıldı (Ömer 2026-11-08): Host / Join Multiplayer kartının defterinde; eski 'mp' isteği kartlara düşer
    if (next === 'mp') next = 'play';
    // Settings: tek DOM ekranı (src/ui/settings.ts, sol sütun görünümü); menü sola çekilir, kapanınca geri gelir. Account sayfası burada tam (giriş düğmeleri)
    if (next === 'settings') {
      this.slideMenu(false, false);
      this.tweenLook('settings', false);
      return void setSettingsOpen(true, () => {
        this.slideMenu(true, false);
        this.tweenLook('menu', false);
      }, { fullAccount: true });
    }
    const prev = this.view;
    if (prev === next && !instant) return;
    if (next !== 'menu' && next !== 'play') this.cameFrom = prev;
    this.view = next;
    if (next === 'play') this.warmCharacterArt();
    this.busyUntil = this.time.now + (instant ? 0 : 450);
    this.tweenLook(next, instant);
    this.slideMenu(next === 'menu', instant);
    this.showCards(next === 'play', instant);
    this.showBack(next !== 'menu', instant);
    if (next === 'menu') this.selectMain(this.menuSel);
  }

  private goBack(): void {
    const to = backTarget(this.view, this.cameFrom);
    if (!to) return;
    if (to === 'menu') this.cameFrom = null;
    this.setView(to);
  }

  private slideMenu(shown: boolean, instant: boolean): void {
    this.tweens.killTweensOf(this.menuCol);
    const x = shown ? this.colX : this.hiddenColX();
    if (shown) this.menuCol.setVisible(true);
    if (instant) {
      this.menuCol.setPosition(x, 0).setAlpha(shown ? 1 : 0).setVisible(shown);
      return;
    }
    this.tweens.add({
      targets: this.menuCol,
      x,
      alpha: shown ? 1 : 0.4,
      duration: 700,
      delay: shown ? 150 : 0,
      ease: EASE_SLIDE,
      onComplete: () => this.menuCol.setVisible(shown),
    });
  }

  private showBack(shown: boolean, instant: boolean): void {
    this.tweens.killTweensOf(this.back);
    if (shown) this.back.setVisible(true);
    if (instant) {
      this.back.setAlpha(shown ? 1 : 0).setVisible(shown);
      return;
    }
    this.tweens.add({ targets: this.back, alpha: shown ? 1 : 0, duration: shown ? 400 : 200, delay: shown ? 500 : 0, onComplete: () => this.back.setVisible(shown) });
  }

  /** Sol üst geri ikonu (tasarım kiti: src/game/elegant-ui.ts > elBack; geri / menu kuralı CLAUDE.md). */
  private buildBack(): void {
    this.back = elBack(this, () => this.ready() && this.goBack()).root.setAlpha(0).setVisible(false);
  }

  /** Sağ alt köşede küçük sürüm yazısı (tasarım kiti: soluk EB Garamond düz; konum layoutStage'de, görünen alanın sağ kenarına göre). */
  private buildVersion(): void {
    const v = DISPLAY_VERSION; // patch notes'un en üst sürümü (alt sürüm olabilir: 0.6.11.1; src/ui/display-version.ts)
    if (!v) return;
    const t = (this.version = elBody(this, stageView.right - 34, H - 22, `v${v}`, 22, EL.MUTED).setOrigin(1, 1).setAlpha(0.75).setDepth(45));
    // Dokununca Patch Notes (Ömer 2026-10-11; src/ui/patch-notes.ts, data/patch-notes.json; ayrı kod parçası). Dokunma alanı yazıdan
    // geniş (telefonda en az ~44 px), köşeye doğru taşar.
    t.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-70, -60, t.width + 104, t.height + 82), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    t.on('pointerover', () => t.setColor(EL.ON).setAlpha(1));
    t.on('pointerout', () => t.setColor(EL.MUTED).setAlpha(0.75));
    t.on('pointerup', () => {
      if (!this.ready()) return;
      if (patchNotesLoaded) patchNotesLoaded.openPatchNotes(); // önceden indi: anında, yükleme ekranı yok
      else void trackChunkLoad(loadPatchNotes()).then((m) => this.sys.isActive() && m.openPatchNotes());
    });
  }

  /** Quick Battle kartının üstündeki Endless sekmesinin durumu (açıkken kart Endless'ı açar); seçim tarayıcıda saklanır. */
  private endlessOn(): boolean {
    try {
      return window.localStorage?.getItem(ENDLESS_TOGGLE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private setEndlessOn(on: boolean): void {
    try {
      window.localStorage?.setItem(ENDLESS_TOGGLE_KEY, on ? '1' : '0');
    } catch {
      /* depolama yok: yalnızca bu oturum */
    }
  }

  // ------------------------------------------------------------ Play: üç kart

  private buildCards(): void {
    const touchOpen = new Map<number, Ledger | null>();
    if (!this.outsideTapBound) {
      this.outsideTapBound = true;
      // Dokunmada kartların dışına dokunmak açık defteri kapatır
      this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (!p.wasTouch && !window.matchMedia?.('(pointer: coarse)').matches) return;
        const inCard = over.some((o) => {
          let n: Phaser.GameObjects.GameObject | null = o;
          while (n) {
            if (this.cards.some((k) => k.c === n)) return true;
            n = (n as Phaser.GameObjects.GameObject & { parentContainer?: Phaser.GameObjects.Container }).parentContainer ?? null;
          }
          return false;
        });
        if (!inCard) this.cards.forEach((k) => k.closeLedger?.());
      });
    }
    const core = campaignCore;
    if (!core) return; // sefer çekirdeği gelince campaignCoreReady kurar
    const latest = core.latestSave(storage());
    const anySaves = core.slotSummaries(storage()).some((x) => x && x.saveCount > 0);
    // Campaign kartı (Ömer 2026-10-10): assets/cards/campaign.webp (uçurumdan Valdoria'ya bakan takım); yoksa harita
    const campaignArt = cardArt(this, 'campaign') ?? (hasCampaignArt(this, 'valdoria-bg') ? campaignArtKey('valdoria-bg') : null);
    // Kart görselleri (Ömer 2026-10-08): Quick Battle = Proving Grounds (öğleden sonra), Multiplayer = Duelling Ring (ay ışığı); yoksa eskileri
    const art = (id: string) => (hasBackground(this, id) ? backgroundKey(id) : null);
    const camp = campaignButtons(!!latest, anySaves);
    const runCamp = (id: 'continue' | 'new' | 'load') => (id === 'continue' && latest ? this.loadSave(latest) : id === 'new' ? this.chooseSlot() : this.loadSlots());
    // Defter satırları (Ömer 2026-11-07, Ledger): yalnız gerçek veri gösterilir
    const hero = latest ? core.activeHeroes(latest.state) : [];
    const lvl = hero.length ? Math.max(...hero.map((h) => h.level)) : 0;
    const latestInfo = latest ? `${latest.summary.node}
Lv ${lvl} · ${timeAgo(latest.savedAt)}` : '';
    const latestLine = latest ? `${latest.summary.node} · Lv ${lvl}` : '';
    const nSaves = core.slotSummaries(storage()).reduce((a, x) => a + (x ? x.saveCount : 0), 0);
    const campRows: LedgerRow[] = camp.map((b) => ({
      id: b.id,
      name: b.id === 'continue' ? 'Continue' : b.id === 'new' ? 'New campaign' : 'Load',
      meta: b.id === 'continue' ? latestInfo : b.id === 'new' ? 'Start over' : anySaves ? `${nSaves} save${nSaves === 1 ? '' : 's'}` : 'No saves yet',
      primary: b.primary,
      enabled: b.enabled,
      run: () => runCamp(b.id),
    }));
    const best = endlessBestWave(storage()?.getItem('eov.endless.scores.v1') ?? null);
    const goQb = (endless: boolean) => {
      this.setEndlessOn(endless);
      elGo(this, endless ? ENDLESS_SCENE : 'TeamSelectScene');
    };
    const qbRows: LedgerRow[] = [
      { id: 'qb', name: 'Quick Battle', meta: 'Pick two teams', primary: !this.endlessOn(), enabled: true, run: () => goQb(false) },
      { id: 'endless', name: 'Endless', meta: best > 0 ? `Best wave ${best}` : 'No runs yet', primary: this.endlessOn(), enabled: true, run: () => goQb(true) },
    ];
    // Multiplayer kartı defteri (Ömer 2026-11-08): ayrı Multiplayer sütunu yerine Host / Join; ad kayıtlı addır (değiştirme lobide),
    // IP uyarısı Join kutusunda ve lobide (bağlantı o adımlarda kurulur)
    const mpOk = !!mp.serverUrl();
    const mpRows: LedgerRow[] = [
      { id: 'host', name: 'Host', meta: mpOk ? 'Open a lobby, share the code' : 'Server not set up', primary: true, enabled: mpOk, run: () => mp.host() },
      { id: 'join', name: 'Join', meta: mpOk ? "Enter a friend's code" : 'Server not set up', primary: false, enabled: mpOk, run: () => void this.askCode() },
    ];
    const focusOf = (key: string | null): readonly [number, number] | null => {
      const id = key?.startsWith('bg:') ? key.slice(3) : key?.startsWith('card:') ? key.slice(5) : null;
      return (id && (layout.backgrounds.cardFocus as unknown as Record<string, [number, number]>)[id]) || null;
    };
    // Kart görselleri (Ömer 2026-10-10): assets/cards (Quick Battle gündüz / Endless mode açıkken alacakaranlık, Multiplayer ay ışığı);
    // dosya yoksa eski arena arka planları. Kart görseli (`card:`) kart için çizildi: daha az karartılır.
    const specs: Array<{ name: string; art: string | null; altArt?: string | null; rowArt?: Array<string | null>; line?: string; endless?: boolean; buttons?: typeof camp; rows?: LedgerRow[]; run: () => void }> = [
      { name: 'Campaign', art: campaignArt, buttons: camp, rows: campRows, rowArt: camp.map((b) => (b.id === 'new' ? cardArt(this, 'new-campaign') : null)), line: latest ? latestLine : 'Begin a new campaign', run: () => runCamp(camp[0]!.id) },
      {
        name: 'Quick Battle',
        art: cardArt(this, 'quick-battle') ?? art('proving-grounds-sunny-afternoon') ?? art('castle-hall'),
        altArt: cardArt(this, 'quick-battle-endless'),
        line: 'Pick two teams',
        endless: true,
        rows: qbRows,
        rowArt: [cardArt(this, 'quick-battle'), cardArt(this, 'quick-battle-endless')],
        run: () => (this.endlessOn() ? elGo(this, ENDLESS_SCENE) : elGo(this, 'TeamSelectScene')),
      },
      { name: 'Multiplayer', art: cardArt(this, 'multiplayer') ?? art('duelling-ring-moon') ?? art('kings-bridge'), line: 'Fight a friend online', rows: mpRows, rowArt: [cardArt(this, 'mp-host'), cardArt(this, 'mp-join')], run: () => (mpOk ? mp.host() : undefined) },
    ];
    specs.forEach((s, i) => {
      const cx = W / 2 + (i - 1) * (CARD_W + CARD_GAP);
      const outer = this.add.container(cx, CARD_CY).setDepth(30).setAlpha(0).setVisible(false);
      // Kart içeriği iç kapta (hover'da hafif yükselir)
      const c = this.add.container(0, 0);
      outer.add(c);
      const hw = CARD_W / 2;
      const hh = CARD_H / 2;
      const base = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x241a11, 1);
      c.add(base);
      /** Görsel yakınlaşması (elegant hover): kırpma bölgesi merkezde daralır, ölçek aynı oranda büyür (kart dışına taşmaz). */
      const zooms: Array<(k: number) => void> = [];
      let curZoom = 1;
      const extra = new Map<Phaser.GameObjects.Image, number>(); // görsel değişiminde yeni görselin oturma ölçeği
      const zoomImg = (k: number) => {
        curZoom = k;
        zooms.forEach((z) => z(k));
      };
      /** Kart görseli: odak noktası (battle-layout.json > backgrounds.cardFocus) kartın ortasında, kart boşluksuz dolar. */
      const addArt = (key: string): Phaser.GameObjects.Image => {
        const img = this.add.image(0, 0, key).setAlpha(key.startsWith('card:') ? 0.92 : 0.6);
        const fc = focusCrop(img.width, img.height, CARD_W, CARD_H, focusOf(key));
        img.setCrop(fc.cropX, fc.cropY, fc.cropW, fc.cropH).setScale(fc.scale);
        img.setOrigin((fc.cropX + fc.cropW / 2) / img.width, (fc.cropY + fc.cropH / 2) / img.height);
        c.add(img);
        zooms.push((k0) => {
          const k = k0 * (extra.get(img) ?? 1);
          const w = fc.cropW / k;
          const h = fc.cropH / k;
          img.setCrop(fc.cropX + (fc.cropW - w) / 2, fc.cropY + (fc.cropH - h) / 2, w, h).setScale(fc.scale * k);
        });
        return img;
      };
      // Görsel seti (Ömer 2026-11-09): her satırın kendi kart görseli; hover / odakta kısa çapraz geçiş, dosya yoksa kartın varsayılanı.
      // Dinlenme görseli: Endless mode açıkken Quick Battle'da alacakaranlık, değilse varsayılan.
      const imgs = new Map<string, Phaser.GameObjects.Image>();
      const imgFor = (key: string | null | undefined) => {
        if (!key) return null;
        let im = imgs.get(key);
        if (!im) imgs.set(key, (im = addArt(key).setAlpha(0)));
        return im;
      };
      const mainImg = imgFor(s.art);
      imgFor(s.altArt);
      (s.rowArt ?? []).forEach((k) => imgFor(k));
      const baseAlpha = (img: Phaser.GameObjects.Image) => (img.texture.key.startsWith('card:') ? 0.92 : 0.6);
      let restKey: string | null = s.art;
      let hoverKey: string | null = null;
      let artTw: Phaser.Tweens.Tween | null = null;
      let shownKey: string | null = null;
      const applyArt = (animate: boolean) => {
        const next = hoverKey ?? restKey;
        // Hedef zaten bu (sürüyor ya da bitti): dokunma. (Önceden tween önce durdurulup sonra çıkılıyordu: Continue/New/Load arasında hızlı
        // geçişte aynı görsel için gelen ikinci çağrı yarım solmayı donduruyordu.)
        if (next === shownKey && animate) return;
        artTw?.stop();
        artTw = null;
        const m = motion('cardArt');
        const prev = shownKey;
        shownKey = next;
        const set = (a: Map<Phaser.GameObjects.Image, number>) => {
          for (const [im, v] of a) im.setAlpha(v);
        };
        // Hedef durum: yeni görsel tam, gerisi 0. Geçişte: yeni önce belirir (0..0.75), eski bir miktar sonra söner (0.25..1);
        // ikisi birden görünür, aradan karanlık (arka zemin) geçmez. İptal güvenli: her çağrı mevcut alfa değerlerinden devam eder.
        const from = new Map<Phaser.GameObjects.Image, number>();
        const to = new Map<Phaser.GameObjects.Image, number>();
        for (const [k, im] of imgs) {
          from.set(im, im.alpha);
          to.set(im, k === next ? baseAlpha(im) : 0);
        }
        const inc = next ? imgs.get(next) : undefined;
        if (!animate || m.ms <= 0 || !prev) {
          set(to);
          extra.clear();
          zoomImg(curZoom);
          return;
        }
        if (inc) extra.set(inc, m.scaleFrom);
        for (const im of [...extra.keys()]) if (im !== inc) extra.delete(im);
        const sFrom = inc ? extra.get(inc) ?? 1 : 1;
        const ease = Phaser.Math.Easing.Sine.InOut;
        const clamp = (v: number) => Math.min(1, Math.max(0, v));
        artTw = this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: m.ms,
          onUpdate: (tw) => {
            if (!c.active) return void tw.stop();
            const t = tw.getValue() ?? 1;
            for (const [im, a0] of from) {
              const a1 = to.get(im)!;
              if (a1 === a0) continue;
              const u = a1 > a0 ? clamp(t / 0.75) : clamp((t - 0.25) / 0.75);
              im.setAlpha(a0 + (a1 - a0) * ease(u));
            }
            if (inc) extra.set(inc, sFrom + (1 - sFrom) * ease(t));
            zoomImg(curZoom);
          },
          onComplete: () => {
            artTw = null;
            set(to);
            extra.clear();
            if (c.active) zoomImg(curZoom);
          },
        });
      };
      const showAlt = (on: boolean, animate: boolean) => {
        if (!s.altArt || !mainImg) return;
        restKey = on ? s.altArt : s.art;
        applyArt(animate);
      };
      applyArt(false);
      if (s.endless) showAlt(this.endlessOn(), false);
      const shadeKey = canvasTex(this, 'mm-cardshade', 4, 256, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0.3, 'rgba(10,7,4,0)');
        g.addColorStop(1, 'rgba(10,7,4,0.95)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 4, 256);
      });
      c.add(this.add.image(0, 0, shadeKey).setDisplaySize(CARD_W, CARD_H));
      // Hover ışığı (Ömer 2026-11-09, mockup B): görselin kendi ışık kaynağından (Campaign kale yangını, Quick Battle gökyüzü, Multiplayer ay)
      // kartın içine çapraz yumuşak parıltı; kart sınırında kalır (doku kart boyunda), odakta belirir
      const src = CARD_LIGHT[i] ?? CARD_LIGHT[0]!;
      const lightKey = canvasTex(this, `mm-cardlight-${i}`, CARD_W / 2, CARD_H / 2, (ctx) => {
        const sx = (CARD_W / 2) * src.x;
        const sy = (CARD_H / 2) * src.y;
        const g = ctx.createRadialGradient(sx, sy, 5, sx, sy, (CARD_W / 2) * 0.9);
        g.addColorStop(0, 'rgba(255,255,255,0.42)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CARD_W / 2, CARD_H / 2);
      });
      const cardLight = this.add.image(0, 0, lightKey).setDisplaySize(CARD_W, CARD_H).setTint(src.tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      c.add(cardLight);
      const glow = this.add.image(0, 0, ensureGlow(this)).setTint(0xf0a040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDisplaySize(CARD_W * 1.5, CARD_H * 1.3);
      c.addAt(glow, 0);
      const frame = this.add.graphics();
      const drawFrame = (on: boolean) => {
        frame.clear();
        // Tasarım kiti: 1 px ince altın çerçeve (odakta açık altın) + içte ince koyu çizgi
        frame.lineStyle(1, 0x1b120a, 0.9).strokeRect(-hw + 2.5, -hh + 2.5, CARD_W - 5, CARD_H - 5);
        frame.lineStyle(1, on ? EL.ON_N : EL.GOLD, on ? 1 : EL.LINE.a3).strokeRect(-hw + 0.5, -hh + 0.5, CARD_W - 1, CARD_H - 1);
      };
      drawFrame(false);
      c.add(frame);
      const titleObj = this.titleText(0, hh - 112, s.name, LOOK.cardTitle, 2, '700').setOrigin(0.5);
      c.add(titleObj);
      // Kartın kendisi (görsel) birincil eylemi açar; Campaign'de kayıt varsa Continue, yoksa New (Ömer 2026-10-13). Düğmeler kendi
      // tıklarını alır (düğme şeridi aşağıda ayrıca dışlanır).
      const zone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      c.add(zone);
      let lineText: Phaser.GameObjects.Text | null = null;
      if (s.line) c.add((lineText = this.noteText(0, hh - 52, s.line, LOOK.cardLine - 2, '#cdb88d').setOrigin(0.5)));
      let toggleEndless: (() => void) | null = null;
      if (s.endless) {
        // Endless durumu (Ömer 2026-11-08: kartın üstündeki Endless sekmesi kaldırıldı; seçim artık defterdeki Quick Battle / Endless
        // satırlarından ya da klavyede E'den). Açıkken kartın çerçevesi kor renginde yanar, görsel alacakaranlığa geçer, kart Endless'ı açar.
        const lineFor = () => (this.endlessOn() ? 'Endless waves - how far can you go?' : s.line!);
        lineText?.setText(lineFor());
        const emberGlow = this.add.image(0, 0, ensureGlow(this)).setTint(EMBER).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(CARD_W * 1.4, CARD_H * 1.25);
        c.addAt(emberGlow, 0);
        const emberFrame = this.add.graphics();
        c.add(emberFrame);
        const drawEmber = () => {
          const v = this.endlessOn();
          emberGlow.setAlpha(v ? 0.22 : 0);
          emberFrame.clear();
          if (v) emberFrame.lineStyle(2, EMBER, 0.95).strokeRect(-hw + 1, -hh + 1, CARD_W - 2, CARD_H - 2);
        };
        toggleEndless = () => {
          this.setEndlessOn(!this.endlessOn());
          lineText?.setText(lineFor());
          showAlt(this.endlessOn(), true);
          drawEmber();
        };
        drawEmber();
      }
      let ledger: Ledger | null = null;
      let ledgerTop = Infinity; // yerel (sol-üst köşeli) y: bunun altı satır bölgesi
      let setLedgerFocus: ((kb: boolean) => void) | null = null;
      if (s.rows) {
        // Defter (menu-ledger.ts): fare karta gelince / klavye odağında / dokunmada açılır; kapalıyken yalnız başlık + tek satır
        const ledgerBottom = hh - 24;
        const chev = this.add.graphics();
        chev.lineStyle(2, EL.GOLD, 0.8).strokePoints([{ x: -9, y: -4 }, { x: 0, y: 4 }, { x: 9, y: -4 }], false);
        chev.setPosition(0, hh - 20);
        c.add(chev);
        const closedTitleY = hh - 112;
        const lh = ledgerHeight(s.rows);
        ledgerTop = CARD_H - 24 - lh - 6; // yüksekliği kurulumda sabitle (telefonda ölçek değişse de başlık satırlarla çakışmasın)
        ledger = buildLedger(this, CARD_W - 48, s.rows, () => this.ready(), (p) => {
          const openTitleY = ledgerBottom - lh - 54;
          titleObj.setY(closedTitleY + (openTitleY - closedTitleY) * p);
          lineText?.setAlpha(1 - Math.min(1, p * 2.5));
          chev.setAlpha(1 - Math.min(1, p * 3));
        });
        ledger.root.setPosition(0, ledgerBottom);
        c.add(ledger.root);
        const lg = ledger;
        const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
        let cardHover = false;
        let rowHover = false;
        let kbFocus = false;
        let leaveEv: Phaser.Time.TimerEvent | null = null;
        const refresh = () => {
          leaveEv?.remove(false);
          leaveEv = null;
          if (cardHover || rowHover || kbFocus) return lg.setOpen(true);
          leaveEv = this.time.delayedCall(motion('endlessTab').leaveDelayMs, () => {
            leaveEv = null;
            if (!(cardHover || rowHover || kbFocus) && !tapOpen) lg.setOpen(false);
          });
        };
        let tapOpen = false;
        zone.on('pointerover', (p: Phaser.Input.Pointer) => {
          if (coarse || p.wasTouch) return;
          cardHover = true;
          refresh();
        });
        zone.on('pointerout', () => {
          cardHover = false;
          refresh();
        });
        lg.onActive((ri) => {
          const k = ri >= 0 ? s.rowArt?.[ri] ?? null : null;
          hoverKey = k && imgs.has(k) ? k : ri >= 0 ? s.art : null;
          applyArt(true);
        });
        lg.onHover((over) => {
          rowHover = over;
          refresh();
        });
        setLedgerFocus = (kb) => {
          kbFocus = kb;
          refresh();
        };
        // Dokunma: karta dokununca açılır; açıkken boş yere / karta tekrar dokunmak kapatır
        zone.on('pointerup', (p: Phaser.Input.Pointer, _lx: number, ly: number) => {
          if (!(coarse || p.wasTouch)) return;
          if (lg.isOpen() && ly >= ledgerTop) return; // satır bölgesi: satırlar kendi tıkını alır
          tapOpen = !lg.isOpen();
          lg.setOpen(tapOpen);
          touchOpen.set(i, tapOpen ? lg : null);
          if (tapOpen) {
            for (const [j, o] of touchOpen) if (j !== i && o) { o.setOpen(false); touchOpen.set(j, null); }
          }
        });
        if (!coarse) lg.setOpen(false, false);
      }
      const look = { lift: 0, zoom: 1 };
      let lookTw: Phaser.Tweens.Tween | null = null;
      const focus = (on: boolean, kb = false) => {
        setLedgerFocus?.(on && kb);
        if (!on || !kb) ledger?.select(-1); // klavye satır seçimi yalnız klavye odağında
        drawFrame(on);
        this.tweens.killTweensOf([glow, cardLight]);
        this.tweens.add({ targets: glow, alpha: on ? 0.12 : 0, duration: 160 });
        this.tweens.add({ targets: cardLight, alpha: on ? 1 : 0, duration: on ? 260 : 200, ease: 'Sine.easeOut' });
        // Odaklanan kart hafif yükselir, görseli hafif yakınlaşır
        lookTw?.stop();
        const from = { ...look };
        const to = { lift: on ? -10 : 0, zoom: on ? 1.04 : 1 };
        lookTw = this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 260,
          ease: 'Cubic.easeOut',
          onUpdate: (tw) => {
            if (!c.active) return void tw.stop(); // kartlar yenilendi (kayıt silindi)
            const t = tw.getValue() ?? 1;
            look.lift = from.lift + (to.lift - from.lift) * t;
            look.zoom = from.zoom + (to.zoom - from.zoom) * t;
            c.y = look.lift;
            zoomImg(look.zoom);
          },
        });
      };
      zone.on('pointerover', () => this.focusCard(i));
      // Düğmeli kartta (Campaign) düğme şeridi görsel tıkı sayılmaz (düğmeler arasındaki boşluğa / kenarına basış yanlışlıkla Continue
      // açmasın); şerit = düğme sırasının dokunma yüksekliği + pay.
      zone.on('pointerup', (p: Phaser.Input.Pointer, _lx: number, ly: number) => {
        if (ledger && (!!window.matchMedia?.('(pointer: coarse)').matches || p.wasTouch)) return; // dokunmada kart yalnız defteri açar / kapatır
        if (ledger?.isOpen() && ly >= ledgerTop) return; // satır bölgesinde görsel tıkı sayılmaz
        if (this.ready()) s.run();
      });
      // Klavye (Ömer 2026-11-09): yukarı/aşağı odaktaki kartın satırlarında dolaşır (hover gibi görünür), Enter seçili satırı çalıştırır
      const rowMove = (d: number) => {
        if (!ledger) return;
        ledger.setOpen(true);
        const cur = ledger.selected();
        ledger.select(cur < 0 ? (d > 0 ? 0 : ledger.count - 1) : moveSelection(cur, d, ledger.count));
      };
      this.cards.push({ c: outer, focus, run: () => (ledger?.runSelected() ? undefined : s.run()), rowMove, toggle: toggleEndless ?? undefined, closeLedger: () => ledger?.setOpen(false) });
    });
  }

  private focusCard(i: number, kb = false): void {
    this.cardSel = i;
    this.cards.forEach((k, j) => k.focus(j === i, kb));
  }

  private showCards(shown: boolean, instant: boolean): void {
    this.cards.forEach(({ c }, i) => {
      this.tweens.killTweensOf(c);
      if (shown) c.setVisible(true);
      if (instant) {
        c.setPosition(c.x, CARD_CY).setScale(1).setAlpha(shown ? 1 : 0).setVisible(shown);
        return;
      }
      if (shown) {
        c.setPosition(c.x, CARD_CY + 60).setScale(0.96).setAlpha(0);
        this.tweens.add({ targets: c, y: CARD_CY, scale: 1, alpha: 1, duration: 650, delay: 350 + i * 140, ease: 'Cubic.easeOut' });
      } else if (c.visible) {
        this.tweens.add({ targets: c, y: CARD_CY + 60, scale: 0.96, alpha: 0, duration: 320, delay: (this.cards.length - 1 - i) * 70, ease: 'Cubic.easeIn', onComplete: () => c.setVisible(false) });
      }
    });
    if (shown) this.focusCard(this.cardSel);
  }

  /** DOM giriş kutusu açıkken sahne tıklama/tuş almaz. */
  private async withPrompt<T>(ask: () => Promise<T>): Promise<T> {
    this.promptOpen = true;
    lockInput('main-menu-prompt');
    try {
      return await ask();
    } finally {
      this.promptOpen = false;
      unlockInput('main-menu-prompt');
    }
  }

  private async askCode(): Promise<void> {
    if (!mp.serverUrl()) return;
    const code = await this.withPrompt(() => promptCode(normalizeLobbyCode));
    if (code && this.scene.isActive()) mp.join(code);
  }

  // ------------------------------------------------------------ klavye

  private onKey(e: KeyboardEvent): void {
    if (isInputLocked() || this.promptOpen) return; // ayarlar ekranı, wiki, giriş kutusu açık
    const k = e.key;
    if (k === 'Escape') {
      if (this.modal) this.modalBack?.();
      else if (this.time.now >= this.busyUntil) this.goBack();
      return;
    }
    if (this.modal || this.time.now < this.busyUntil) return;
    const enter = k === 'Enter' || k === ' ';
    const up = k === 'ArrowUp' || k === 'w' || k === 'W';
    const down = k === 'ArrowDown' || k === 's' || k === 'S';
    const left = k === 'ArrowLeft' || k === 'a' || k === 'A';
    const right = k === 'ArrowRight' || k === 'd' || k === 'D';
    if (this.view === 'menu') {
      if (up || down) this.selectMain(moveSelection(this.menuSel, up ? -1 : 1, this.menuRows.length));
      else if (enter) this.pickMain(MAIN_ITEMS[this.menuSel]!.key);
    } else if (this.view === 'play') {
      if (left || right) this.focusCard(moveSelection(this.cardSel, left ? -1 : 1, this.cards.length), true);
      else if (up || down) {
        const card = this.cards[this.cardSel];
        if (card?.rowMove) {
          this.focusCard(this.cardSel, true);
          card.rowMove(up ? -1 : 1);
        } else this.focusCard(moveSelection(this.cardSel, up ? -1 : 1, this.cards.length), true);
      }
      else if (k === 'e' || k === 'E') this.cards[this.cardSel]?.toggle?.(); // Quick Battle odaktayken Endless anahtarı
      else if (enter) this.cards[this.cardSel]?.run();
    }
  }

  // ------------------------------------------------------------ kayıt pencereleri (eski akış aynen)

  private closeModal(): void {
    this.modal?.close();
    this.modal = null;
    this.modalBack = null;
  }

  private loadSave(entry: SaveEntry): void {
    void loadCampaignUi().then(({ session }) => {
      session.loadEntry(entry);
      elGo(this, MAP_SCENE);
    });
  }

  /** Sefer yuvaları "Column" ekranı (src/game/campaign-slots-ui.ts): New = yuva -> mod + zorluk, Load = yuva -> kayıtlar. */
  private openSlots(flow: 'new' | 'load'): void {
    this.closeModal();
    // yuva ekranı ve sefer oturumu ayrı kod parçasında (hızlı açılış): menü hazır olunca arka planda iner, yoksa burada (kısa yükleyici)
    void loadCampaignUi().then(({ slots, session }) => {
      if (this.scene.isActive() && !this.modal) this.showSlots(flow, slots.openSlotBrowser, session.startNewCampaign);
    });
  }

  private showSlots(
    flow: 'new' | 'load',
    openSlotBrowser: typeof import('../campaign-slots-ui').openSlotBrowser,
    startNewCampaign: typeof import('../campaign-session').startNewCampaign,
  ): void {
    // Yuva ekranı menü sahnesinin üstünde yarı saydam açılır (Ömer 2026-10-10): arkadaki kartlar / menü sütunu / Back o sürece çekilir
    const wasPlay = this.view === 'play';
    const colShown = this.menuCol.visible;
    if (wasPlay) this.showCards(false, false);
    this.back.setVisible(false);
    this.menuCol.setVisible(false);
    const restore = () => {
      if (!this.sys.isActive()) return;
      if (wasPlay && this.view === 'play') this.showCards(true, false);
      this.back.setVisible(this.view !== 'menu');
      this.menuCol.setVisible(colShown);
    };
    const b = openSlotBrowser(this, this.modalLayer, {
      flow,
      onClose: () => {
        this.closeModal();
        restore();
      },
      onStart: (mode, diff, slot) => {
        startNewCampaign(mode, diff, slot);
        elGo(this, MAP_SCENE);
      },
      onLoad: (e) => this.loadSave(e),
      onChanged: () => this.refreshCards(),
    });
    this.modal = { root: b.root, close: () => b.close(), area: { x: 0, y: 0, w: 0, h: 0 } };
    this.modalBack = () => b.back();
  }

  private chooseSlot(): void {
    this.openSlots('new');
  }

  private loadSlots(): void {
    this.openSlots('load');
  }

  /** Kayıt silinince Campaign kartındaki Continue / Load durumu yenilensin. */
  private refreshCards(): void {
    const shown = this.view === 'play' && !this.modal; // yuva ekranı açıkken kartlar arkada gizli kalır
    for (const { c } of this.cards) c.destroy(true);
    this.cards = [];
    this.buildCards();
    this.showCards(shown, true);
  }
}
