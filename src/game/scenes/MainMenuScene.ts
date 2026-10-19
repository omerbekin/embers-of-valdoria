import Phaser from 'phaser';
import { loadSfxLevel, onSfxLevelChange, setSfxLevel } from '../../ui/sfx-volume';
import { loadUiSoundLevel, onUiSoundLevelChange, previewUiSound, setUiSoundLevel, uiSound } from '../../ui/ui-sound';
import { loadMusicLevel, menuMusic, onMusicLevelChange, setMusicLevel } from '../../ui/music';
import type { SaveEntry } from '../../campaign';
import { backgroundKey, hasBackground, loadRestInBackground, preloadAssets } from '../assets';
import { campaignArtKey, hasCampaignArt, preloadCampaignArt } from '../campaign-art';
import { cardArt, hasCardArtFile, preloadCardArt } from '../card-art';
import { MenuBackdrop, hasMenuLayers, preloadMenuLayers } from '../menu-backdrop';
import { onReducedMotionChange, reducedMotion, setReducedMotion } from '../../ui/motion-pref';
import { motion } from '../../ui/motion';
import { cyclePerfSetting, onPerfSettingChange, onShowFpsChange, perfSetting, perfSettingLabel, setPerfSetting, setShowFps, showFps } from '../../ui/perf-mode';
import { onTutorialChange, resetTutorials, setTutorialsOn, tutorialsOn } from '../../tutorial/store';
import { blurredTexture, edgeFillers, mapArt } from '../map-art';
import { coverShift, focusCrop, placeArt } from '../wide-map';
import layout from '../../../data/battle-layout.json';
import { onStageResize, stageView, worldXY } from '../stage';
import { growTouchZone } from '../touch-hit';
import { FULL_W, FULL_X0, MENU_COL_X, menuColumnShift } from '../../ui/viewport';
import type { Modal } from '../campaign-ui';
import { storage } from '../kv-storage';
import { ensureGlow, fitText, goldText, serif } from '../menu-text';
import { GOLD } from '../ui-frame';
import { mp, MP_SCENE } from '../mp-client';
import { addLogo, hasLogo, preloadLogo } from '../branding';
import { loadVolume, setSettingsVolume } from '../../ui/settings';
import { VOLUME_STEPS, volumeLabel } from '../../ui/volume-steps';
import { DISPLAY_VERSION } from '../../ui/display-version';
import { SPEED_STEPS, battleSpeed, battleSpeedLabel, onBattleSpeedChange, setBattleSpeed, speedAt, speedIndex } from '../../ui/battle-speed';
import { openDebugMenu } from '../../ui/debug-entry';
import { currentSupport, IOS_HINT, isStandalone, onFullscreenChange, toggleFullscreen } from '../../ui/fullscreen';
import { isInputLocked, lockInput, unlockInput } from '../../ui/input-lock';
import { promptCode, promptName } from '../../ui/mp-overlay';
import { normalizeLobbyCode } from '../../net/lobby-code';
import { sanitizeName } from '../../net/protocol';
import { openWiki } from '../../wiki/open';
import { BODY_FONT, DISPLAY_FONT, menuStyle } from '../../ui/menu-style';
import { menuFontsReady, whenMenuFontsReady } from '../../ui/menu-fonts';
import { markBootReady, setBootProgress } from '../../ui/boot-loader';
import { EL, elBack, elButton, elDiamond, elGlow, elGo, elScreenIn, elText, elBody } from '../elegant-ui';
import { trackChunkLoad } from '../../ui/boot-loader';
import { copyDiagLog, diagConsent, diagReportId, onDiagConsentChange, setDiagConsent } from '../../diag/diag';
import { openDiagNotice } from '../../diag/diag-notice';
import { PRIVACY_LINE, reportIdLine, SETTINGS_LABELS, SETTINGS_PAGES, type SettingsPageKey, pageIndex, pageOf, setSettingsPage, settingsPage, stepPage } from '../../ui/settings-pages';
import type { LazySceneKey } from '../lazy-scenes';
import { MAIN_ITEMS, backTarget, backdropFor, campaignButtons, initialView, moveSelection, type MenuItemKey, type MenuView } from '../main-menu-flow';

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
const PANEL_W = 760; // Settings / Multiplayer satırlarının genişliği (sağda değer/denetim)
const SHADE_W = 980; // soldan sağa açılan gölge
/** Ana menü logosunun kutusu (orta x/y, en fazla genişlik/yükseklik; oran korunur). */
const LOGO_BOX = { x: COL_X + 153, y: 372, w: 408, h: 263 }; // Ömer 2026-10-13: taç logosu (680x440'tan %30, %20 küçük, sonra %7 büyük); sol kenarı satırların elmasıyla hizalı, alt kenarı ile Play arasında ~70 birim
/** Settings açıkken sahnenin genel koyuluğu (settings-backdrop v2; DOM .st-overlay ile aynı). */
const SETTINGS_DARK = 0.52;
/** Settings yerleşimi (Ömer 2026-10-16, sayfalı düzen; DOM style.css > html.menu-elegant .st-col / .st-cats / .st-page aynı ölçüler):
 *  başlık ortası y, kategori sütunu ve sayfanın üst kenarı, satır yüksekliği (telefonda ~44 px dokunma), kategori sütunu genişliği + boşluk,
 *  sayfa başlığı yüksekliği, satırların başlıktan içeri kayması, kategori / satır / başlık yazı boyları, satır yazısı rengi (başlıktan yumuşak). */
const SETTINGS_LAYOUT = { titleY: 140, top: 222, rowH: 132, catW: 360, gap: 40, headH: 90, indent: 30, catSize: 30, rowSize: 26, headSize: 34, rowColor: '#c4b18b' };
/** Settings açıkken sütun gölgesinin genişliği (sayfa satırları kategori sütununun sağında). */
const SETTINGS_SHADE_W = 1400;
/**
 * Görünüm stili (src/ui/menu-style.ts): 'classic' bugünkü menü; 'elegant' ilk taslağın zarif stili (?menu=new önizleme). Onaylanınca
 * yalnızca DEFAULT_MENU_STYLE değişir; aşağıdaki ölçüler aynı kalır (önizleme = onaylanan görünüm).
 */
const ELEGANT = menuStyle === 'elegant';
const LOOK = ELEGANT
  ? {
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
    }
  : { rowH: 112, itemY0: 600, mainSize: 50, panelSize: 38, panelY0: 470, titleY: 330, titleSize: 66, valueSize: 32, stepSize: 40, backSize: 36, cardTitle: 50, cardLine: 24 };
const ROW_H = LOOK.rowH; // satır aralığı = dokunma alanı yüksekliği (telefonda ~40-44 gerçek px)
const ITEM_Y0 = LOOK.itemY0;
/** Zarif stilde satır yazısının iç boşluğu (parıltı gölgesi kesilmesin); yazı x'i bu kadar sola alınır. */
const TPAD = ELEGANT ? 18 : 0;
const SHADOW_DARK = 'rgba(12,8,5,0.95)';
/** Ana menünün açılışta istediği arka planlar (Play kartları; yedekleriyle). */
/** Play kartları artık kendi görsellerini kullanır (assets/cards, src/game/card-art.ts): menü açılışında arena arka planı yüklenmez. */
const MENU_BACKGROUNDS: string[] = [];
/** Quick Battle kartındaki Endless mode anahtarı (localStorage). */
const ENDLESS_TOGGLE_KEY = 'proto.qbEndless';
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
  private panel: Phaser.GameObjects.Container | null = null;
  private panelRows: Row[] = [];
  private panelSel = 0;
  /** Sütunda bir sonraki öğenin üst kenarı (satır ROW_H, bölüm başlığı SETTINGS_LAYOUT.heading yer kaplar). */
  private panelTop = 0;
  /** Sütun satır yüksekliği (Settings: SETTINGS_LAYOUT.rowH; Multiplayer ROW_H). */
  private panelRowH = ROW_H;
  /** Sütun satırlarının x'i (Multiplayer COL_X; Settings sayfası kategori sütununun sağında, başlıktan içeride). */
  private panelX = COL_X;
  /** Settings: kategori satırları (SETTINGS_PAGES sırası), açık sayfa, sayfa kabı, klavye odağı (kategori / satır). */
  private catRows: Row[] = [];
  private settingsKey: SettingsPageKey = 'sound';
  private pageBox: Phaser.GameObjects.Container | null = null;
  private panelZone: 'cat' | 'row' = 'row';
  /** Açık panelin / sayfanın olay aboneliklerinden çıkış (sayfa değişince ve panel kapanınca). */
  private panelOffs: Array<() => void> = [];
  private back!: Phaser.GameObjects.Container;
  /** Sağ alttaki küçük sürüm yazısı (DISPLAY_VERSION). */
  private version: Phaser.GameObjects.Text | null = null;
  private cards: Array<{ c: Phaser.GameObjects.Container; focus: (on: boolean, kb?: boolean) => void; run: () => void; toggle?: () => void }> = [];
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
    this.panel = null;
    this.panelRows = [];
    this.catRows = [];
    this.pageBox = null;
    this.panelOffs = [];
    this.cards = [];
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
    if (ELEGANT && !menuFontsReady()) {
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
    // Ana menü müziği (src/ui/music.ts): ilk kullanıcı hareketinden sonra yükselir. Çıkışta durdurulmaz: sonraki sahne kendi parçasını seçer
    // (sceneMusic: harita / kasaba / kamp / savaş) ve yumuşak geçişle (crossfade) ona geçilir; takım seçimi ve multiplayer menü müziğinde kalır.
    menuMusic(true);
    this.events.once('shutdown', () => {
      for (const fn of this.cleanups) fn();
      this.cleanups = [];
      this.flushPanelOffs();
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
    if (this.panel && !this.tweens.isTweening(this.panel)) this.panel.setX(this.colX);
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

  // ------------------------------------------------------------ yazı stilleri (classic / elegant)

  /** Satır yazısı (menü maddesi, ayar satırı): classic kalın serif + kontur; elegant Cinzel 600, büyük harf, 0,05em, koyu gölge (seçilince kor parıltısı). */
  private rowText(x: number, y: number, label: string, size: number, color: string): Phaser.GameObjects.Text {
    if (!ELEGANT) return serif(this, x, y, label, size, color, { spacing: 2, stroke: 3 });
    return serif(this, x - TPAD, y, label.toUpperCase(), size, color, { font: DISPLAY_FONT, weight: '600', spacing: size * 0.05, stroke: 0 })
      .setPadding(TPAD, TPAD, TPAD, TPAD)
      .setShadow(0, 2, SHADOW_DARK, 4, false, true);
  }

  /** Sağdaki değer yazısı (ses, Enter/Exit, ad, Host/Join). Elegant: Cinzel 600 (küçük harfler Cinzel'de küçük büyük harftir). */
  private valueText(x: number, y: number, text: string, color: string, size = LOOK.valueSize): Phaser.GameObjects.Text {
    if (!ELEGANT) return serif(this, x, y, text, size, color, { stroke: 3 });
    return serif(this, x, y, text, size, color, { font: DISPLAY_FONT, weight: '600', spacing: size * 0.05, stroke: 0 }).setShadow(0, 2, SHADOW_DARK, 4, false, true);
  }

  /** Açıklama / alt yazı: classic ince serif; elegant EB Garamond. */
  private noteText(x: number, y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    if (!ELEGANT) return serif(this, x, y, text, size, color, { bold: false, stroke: 2 });
    return serif(this, x, y, text, size + 2, color, { font: BODY_FONT, weight: 'normal', stroke: 0 }).setShadow(0, 1, SHADOW_DARK, 3, false, true);
  }

  /** Altın başlık (Settings / Multiplayer sütunu, kart başlıkları). */
  private titleText(x: number, y: number, text: string, size: number, spacing: number, weight = '600'): Phaser.GameObjects.Text {
    if (!ELEGANT) return goldText(this, x, y, text, size, spacing);
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
      if (!ELEGANT) {
        text.x = v ? 44 : 34;
        glow.x = text.x + text.width / 2;
        return;
      }
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
    if (col && saves.corrupt) col.add(this.noteText(COL_X, H - 60, 'A damaged save file was ignored.', 22, '#d88a7e').setOrigin(0, 0.5));
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
    else openWiki(); // Codex = wiki (sağ üstteki kitap simgesiyle aynı pencere)
  }

  // ------------------------------------------------------------ görünüm geçişleri

  /** Kısa geçiş kilidi (çift dokunma / geçiş sırasında tıklama yeni geçiş başlatmasın). */
  private ready(): boolean {
    return this.time.now >= this.busyUntil && !this.modal && !isInputLocked();
  }

  private setView(next: MenuView, instant = false): void {
    const prev = this.view;
    if (prev === next && !instant) return;
    if (next !== 'menu' && next !== 'play') this.cameFrom = prev;
    this.view = next;
    if (next === 'play') this.warmCharacterArt();
    this.busyUntil = this.time.now + (instant ? 0 : 450);
    this.tweenLook(next, instant);
    this.slideMenu(next === 'menu', instant);
    this.showCards(next === 'play', instant);
    this.showPanel(next === 'settings' || next === 'mp' ? next : null, instant);
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

  /** Sağ alt köşede küçük sürüm yazısı (tasarım kiti: soluk EB Garamond italik; konum layoutStage'de, görünen alanın sağ kenarına göre). */
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
    const focusOf = (key: string | null): readonly [number, number] | null => {
      const id = key?.startsWith('bg:') ? key.slice(3) : key?.startsWith('card:') ? key.slice(5) : null;
      return (id && (layout.backgrounds.cardFocus as unknown as Record<string, [number, number]>)[id]) || null;
    };
    // Kart görselleri (Ömer 2026-10-10): assets/cards (Quick Battle gündüz / Endless mode açıkken alacakaranlık, Multiplayer ay ışığı);
    // dosya yoksa eski arena arka planları. Kart görseli (`card:`) kart için çizildi: daha az karartılır.
    const specs: Array<{ name: string; art: string | null; altArt?: string | null; line?: string; endless?: boolean; buttons?: typeof camp; run: () => void }> = [
      { name: 'Campaign', art: campaignArt, buttons: camp, run: () => runCamp(camp[0]!.id) },
      {
        name: 'Quick Battle',
        art: cardArt(this, 'quick-battle') ?? art('proving-grounds-sunny-afternoon') ?? art('castle-hall'),
        altArt: cardArt(this, 'quick-battle-endless'),
        line: 'Pick two teams',
        endless: true,
        run: () => (this.endlessOn() ? elGo(this, ENDLESS_SCENE) : elGo(this, 'TeamSelectScene')),
      },
      { name: 'Multiplayer', art: cardArt(this, 'multiplayer') ?? art('duelling-ring-moon') ?? art('kings-bridge'), line: 'Fight a friend online', run: () => this.setView('mp') },
    ];
    specs.forEach((s, i) => {
      const cx = W / 2 + (i - 1) * (CARD_W + CARD_GAP);
      const outer = this.add.container(cx, CARD_CY).setDepth(30).setAlpha(0).setVisible(false);
      // Elegant: kart içeriği iç kapta (hover'da hafif yükselir); classic'te doğrudan dış kap
      const c = ELEGANT ? this.add.container(0, 0) : outer;
      if (ELEGANT) outer.add(c);
      const hw = CARD_W / 2;
      const hh = CARD_H / 2;
      const base = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x241a11, 1);
      c.add(base);
      /** Görsel yakınlaşması (elegant hover): kırpma bölgesi merkezde daralır, ölçek aynı oranda büyür (kart dışına taşmaz). */
      const zooms: Array<(k: number) => void> = [];
      const zoomImg = (k: number) => zooms.forEach((z) => z(k));
      /** Kart görseli: odak noktası (battle-layout.json > backgrounds.cardFocus) kartın ortasında, kart boşluksuz dolar. */
      const addArt = (key: string): Phaser.GameObjects.Image => {
        const img = this.add.image(0, 0, key).setAlpha(key.startsWith('card:') ? 0.92 : 0.6);
        const fc = focusCrop(img.width, img.height, CARD_W, CARD_H, focusOf(key));
        img.setCrop(fc.cropX, fc.cropY, fc.cropW, fc.cropH).setScale(fc.scale);
        img.setOrigin((fc.cropX + fc.cropW / 2) / img.width, (fc.cropY + fc.cropH / 2) / img.height);
        c.add(img);
        zooms.push((k) => {
          const w = fc.cropW / k;
          const h = fc.cropH / k;
          img.setCrop(fc.cropX + (fc.cropW - w) / 2, fc.cropY + (fc.cropH - h) / 2, w, h).setScale(fc.scale * k);
        });
        return img;
      };
      const mainImg = s.art ? addArt(s.art) : null;
      // Endless mode açıkken Quick Battle kartı alacakaranlık görseline yumuşakça geçer (çapraz geçiş)
      const altImg = s.altArt ? addArt(s.altArt) : null;
      const baseAlpha = (img: Phaser.GameObjects.Image | null) => (img?.texture.key.startsWith('card:') ? 0.92 : 0.6);
      const showAlt = (on: boolean, animate: boolean) => {
        if (!altImg || !mainImg) return;
        this.tweens.killTweensOf([mainImg, altImg]);
        const a = on ? baseAlpha(altImg) : 0;
        const m = on ? 0 : baseAlpha(mainImg);
        if (!animate) {
          altImg.setAlpha(a);
          mainImg.setAlpha(m);
          return;
        }
        this.tweens.add({ targets: altImg, alpha: a, duration: 420, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: mainImg, alpha: m, duration: 420, ease: 'Sine.easeInOut' });
      };
      if (s.endless) showAlt(this.endlessOn(), false);
      const shadeKey = canvasTex(this, 'mm-cardshade', 4, 256, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0.3, 'rgba(10,7,4,0)');
        g.addColorStop(1, 'rgba(10,7,4,0.95)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 4, 256);
      });
      c.add(this.add.image(0, 0, shadeKey).setDisplaySize(CARD_W, CARD_H));
      const glow = this.add.image(0, 0, ensureGlow(this)).setTint(0xf0a040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDisplaySize(CARD_W * 1.5, CARD_H * 1.3);
      c.addAt(glow, 0);
      const frame = this.add.graphics();
      const drawFrame = (on: boolean) => {
        frame.clear();
        if (ELEGANT) {
          // Tasarım kiti: 1 px ince altın çerçeve (odakta açık altın) + içte ince koyu çizgi
          frame.lineStyle(1, 0x1b120a, 0.9).strokeRect(-hw + 2.5, -hh + 2.5, CARD_W - 5, CARD_H - 5);
          frame.lineStyle(1, on ? EL.ON_N : EL.GOLD, on ? 1 : EL.LINE.a3).strokeRect(-hw + 0.5, -hh + 0.5, CARD_W - 1, CARD_H - 1);
          return;
        }
        frame.lineStyle(4, 0x1b120a, 1).strokeRect(-hw + 4, -hh + 4, CARD_W - 8, CARD_H - 8);
        frame.lineStyle(on ? 4 : 2, on ? GOLD.bright : 0xd9b26a, 1).strokeRect(-hw, -hh, CARD_W, CARD_H);
      };
      drawFrame(false);
      c.add(frame);
      c.add(this.titleText(0, hh - (s.buttons ? 130 : 112), s.name, LOOK.cardTitle, 2, '700').setOrigin(0.5));
      // Kartın kendisi (görsel) birincil eylemi açar; Campaign'de kayıt varsa Continue, yoksa New (Ömer 2026-10-13). Düğmeler kendi
      // tıklarını alır (düğme şeridi aşağıda ayrıca dışlanır).
      const zone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      c.add(zone);
      let lineText: Phaser.GameObjects.Text | null = null;
      if (s.line) c.add((lineText = (ELEGANT ? this.noteText(0, hh - 52, s.line, LOOK.cardLine - 2, '#cdb88d') : serif(this, 0, hh - 50, s.line, 24, '#cdb88d', { bold: false, stroke: 3 })).setOrigin(0.5)));
      let tabFocus: ((kb: boolean) => void) | null = null;
      let toggleEndless: (() => void) | null = null;
      if (s.endless) {
        // Endless sekmesi (Ömer 2026-10-18, taslak endless-toggle C): kartın üst kenarına asılı küçük sekme; fare kartın/sekmenin üstüne gelince
        // karttan yukarı kayar, gidince geri girer. Açıkken (kapalı sekmeyle bile) kartın çerçevesi kor renginde yanar. Açıkken kart Endless'ı açar.
        const lineFor = () => (this.endlessOn() ? 'Endless waves - how far can you go?' : s.line!);
        lineText?.setText(lineFor());
        const TAB_H = 52;
        const tab = this.add.container(0, 0);
        const tabGlow = this.add.image(0, 0, ensureGlow(this)).setTint(EMBER).setBlendMode(Phaser.BlendModes.ADD);
        const plate = this.add.graphics();
        const dOn = elDiamond(this, 7);
        const dOff = elDiamond(this, 7, true);
        const tabLabel = elText(this, 0, 0, 'Endless', 19, EL.TXT, { em: 0.16, pad: true }).setOrigin(0, 0.5);
        const tabState = elBody(this, 0, 1, '', 19, EL.MUTED, false).setOrigin(0, 0.5);
        const tabZone = this.add.zone(0, 0, 10, TAB_H).setInteractive({ useHandCursor: true });
        const growTab = growTouchZone(this, tabZone, 10, TAB_H, { growY: 'up' }); // telefonda alan yukarı (kartın dışına) büyür; görünüm aynı
        tab.add([tabGlow, plate, dOn, dOff, tabLabel, tabState, tabZone]);
        c.addAt(tab, 0); // kartın görselinin ARKASINDA: gizliyken kartın içinde kalır
        // Kartın kor çerçevesi (Endless açıkken sürekli; hover/odaktan bağımsız)
        const emberGlow = this.add.image(0, 0, ensureGlow(this)).setTint(EMBER).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(CARD_W * 1.4, CARD_H * 1.25);
        c.addAt(emberGlow, 0);
        const emberFrame = this.add.graphics();
        c.add(emberFrame);
        let tabHover = false;
        const drawTab = (hover: boolean) => {
          const v = this.endlessOn();
          dOn.setVisible(v);
          dOff.setVisible(!v);
          tabState.setText(v ? 'on' : 'off').setColor(v ? EL.ON : EL.MUTED);
          tabLabel.setColor(hover || v ? EL.ON : EL.TXT);
          elGlow(tabLabel, hover);
          const tw = tabLabel.width - EL.PAD * 2;
          const inner = 14 + 14 + tw + 12 + tabState.width;
          const w = inner + 60;
          const x0 = -inner / 2;
          dOn.setPosition(x0 + 7, 0);
          dOff.setPosition(x0 + 7, 0);
          tabLabel.setX(x0 + 28 - EL.PAD);
          tabState.setX(x0 + 28 + tw + 12);
          growTab(w, TAB_H);
          plate.clear();
          plate.fillStyle(v ? 0x2a190d : 0x17100a, 1).fillRect(-w / 2, -TAB_H / 2, w, TAB_H);
          plate.lineStyle(1, v || hover ? EL.ON_N : EL.GOLD, v || hover ? 1 : EL.LINE.a3).strokePoints([{ x: -w / 2 + 0.5, y: TAB_H / 2 }, { x: -w / 2 + 0.5, y: -TAB_H / 2 + 0.5 }, { x: w / 2 - 0.5, y: -TAB_H / 2 + 0.5 }, { x: w / 2 - 0.5, y: TAB_H / 2 }], false);
          tabGlow.setDisplaySize(w * 1.7, TAB_H * 3).setAlpha(v ? 0.3 : 0);
        };
        const drawEmber = () => {
          const v = this.endlessOn();
          emberGlow.setAlpha(v ? 0.22 : 0);
          emberFrame.clear();
          if (v) emberFrame.lineStyle(2, EMBER, 0.95).strokeRect(-hw + 1, -hh + 1, CARD_W - 2, CARD_H - 2);
        };
        // Kayma: 0 = kartın içinde gizli, 1 = tamamen çıkmış. Sekmenin ortası gizliyken -hh+TAB_H/2, çıkınca -hh-TAB_H/2.
        let slide = 0;
        let slideTw: Phaser.Tweens.Tween | null = null;
        const place = () => {
          tab.setY(-hh + TAB_H / 2 - slide * TAB_H).setVisible(slide > 0.001);
          if (tabZone.input) tabZone.input.enabled = slide > 0.5;
        };
        const slideTo = (to: number) => {
          if (to === slide && !slideTw) return;
          slideTw?.stop();
          slideTw = null;
          const m = motion('endlessTab');
          const dur = to > slide ? m.inMs : m.outMs;
          if (dur <= 0) {
            slide = to;
            place();
            return;
          }
          const from = slide;
          slideTw = this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: dur * Math.abs(to - from),
            ease: 'Cubic.easeOut',
            onUpdate: (tw) => {
              if (!c.active) return void tw.stop(); // kartlar yenilendi
              slide = from + (to - from) * (tw.getValue() ?? 1);
              place();
            },
            onComplete: () => {
              slide = to;
              slideTw = null;
              place();
            },
          });
        };
        const coarse = !!window.matchMedia?.('(pointer: coarse)').matches; // dokunmatik: fareyle gelme yok, sekme hep dışarıda
        let cardHover = false;
        let kbFocus = false;
        let leaveEv: Phaser.Time.TimerEvent | null = null;
        const refresh = () => {
          const want = coarse || cardHover || tabHover || kbFocus;
          leaveEv?.remove(false);
          leaveEv = null;
          if (want) return slideTo(1);
          leaveEv = this.time.delayedCall(motion('endlessTab').leaveDelayMs, () => {
            leaveEv = null;
            if (!(cardHover || tabHover || kbFocus)) slideTo(0);
          });
        };
        zone.on('pointerover', () => {
          cardHover = true;
          refresh();
        });
        zone.on('pointerout', () => {
          cardHover = false;
          refresh();
        });
        tabZone.on('pointerover', () => {
          tabHover = true;
          drawTab(true);
          refresh();
        });
        tabZone.on('pointerout', () => {
          tabHover = false;
          drawTab(false);
          refresh();
        });
        toggleEndless = () => {
          this.setEndlessOn(!this.endlessOn());
          lineText?.setText(lineFor());
          showAlt(this.endlessOn(), true);
          drawTab(tabHover);
          drawEmber();
        };
        tabZone.on('pointerup', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
          ev?.stopPropagation(); // kartın kendi tıklaması (Endless / takım seçimi) tetiklenmesin
          if (this.ready()) toggleEndless?.();
        });
        tabFocus = (kb) => {
          kbFocus = kb; // klavye odağı sekmeyi gösterir; fareyle odak değişince (kb=false) kapanır
          refresh();
        };
        drawTab(false);
        drawEmber();
        place();
        if (coarse) slideTo(1);
      }
      if (s.buttons) {
        const gap = 22; // kit düğmelerinin yan elmasları birbirine değmesin
        const widths = s.buttons.map((b) => (b.id === 'continue' ? 168 : s.buttons!.length > 2 ? 112 : 160));
        let bx = -(widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)) / 2;
        s.buttons.forEach((b, k) => {
          const bw = widths[k]!;
          // Tasarım kiti düğmesi (primary = Continue / ilk eylem, diğerleri secondary); pasif düğme soluk, dokununca sallanır
          const btn = elButton(this, b.label, () => {
            if (!this.ready()) return;
            if (!b.enabled) return btn.shake();
            runCamp(b.id);
          }, { kind: b.primary ? 'primary' : 'secondary', w: bw - 8, h: b.primary ? 60 : 52, size: b.primary ? 20 : 17, ready: b.enabled, touch: { growY: 'up', maxW: bw + gap - 4, minPx: 48 } }); // kart düğmeleri: telefonda alan yukarı büyür
          btn.root.setPosition(bx + bw / 2, hh - 58);
          bx += bw + gap;
          c.add(btn.root);
        });
      }
      const look = { lift: 0, zoom: 1 };
      let lookTw: Phaser.Tweens.Tween | null = null;
      const focus = (on: boolean, kb = false) => {
        tabFocus?.(on && kb);
        drawFrame(on);
        this.tweens.killTweensOf(glow);
        this.tweens.add({ targets: glow, alpha: on ? 0.12 : 0, duration: 160 });
        if (!ELEGANT) return;
        // Elegant: odaklanan kart hafif yükselir, görseli hafif yakınlaşır
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
      const btnStrip = s.buttons ? CARD_H - 100 : Infinity;
      zone.on('pointerup', (_p: Phaser.Input.Pointer, _lx: number, ly: number) => {
        if (ly >= btnStrip) return;
        if (this.ready()) s.run();
      });
      this.cards.push({ c: outer, focus, run: s.run, toggle: toggleEndless ?? undefined });
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

  // ------------------------------------------------------------ Settings / Multiplayer sütunu

  private showPanel(kind: 'settings' | 'mp' | null, instant: boolean): void {
    const old = this.panel;
    this.panel = null;
    this.panelRows = [];
    this.catRows = [];
    this.pageBox = null;
    this.flushPanelOffs();
    if (old) {
      this.tweens.killTweensOf(old);
      if (instant) old.destroy(true);
      else this.tweens.add({ targets: old, alpha: 0, x: old.x - 30, duration: 220, onComplete: () => old.destroy(true) });
    }
    if (!kind) return;
    const p = (this.panel = this.add.container(this.colX, 0).setDepth(25));
    // Settings zemini (Ömer 2026-10-10, taslak settings-backdrop v2 "Darkening everywhere"): her yerde aynı, bulanıklık yok; sahne
    // %52 kararır + sütunun arkasında soldan sağa açılan gölge (oyun içi DOM Settings'le aynı: style.css > .st-overlay)
    if (kind === 'settings') p.add(this.add.rectangle(FULL_X0 - this.colX - 200, 0, FULL_W + 400, H, 0x000000, SETTINGS_DARK).setOrigin(0, 0));
    const settings = kind === 'settings';
    p.add([this.shadeExtension(), this.columnShade(settings ? SETTINGS_SHADE_W : SHADE_W)]);
    this.panelTop = settings ? SETTINGS_LAYOUT.top : LOOK.panelY0 - ROW_H / 2;
    this.panelRowH = settings ? SETTINGS_LAYOUT.rowH : ROW_H;
    this.panelX = COL_X;
    p.add(this.titleText(COL_X, settings ? SETTINGS_LAYOUT.titleY : LOOK.titleY, settings ? 'Settings' : 'Multiplayer', LOOK.titleSize, 3).setOrigin(0, 0.5));
    if (kind === 'settings') this.buildSettings(p);
    else {
      this.buildMultiplayer(p);
      this.panelZone = 'row';
      this.panelSel = 0;
      this.selectPanel(0);
    }
    if (instant) return;
    p.setAlpha(0).setX(this.colX - 30);
    this.tweens.add({ targets: p, alpha: 1, x: this.colX, duration: 450, delay: 250, ease: 'Cubic.easeOut' });
  }

  private selectPanel(i: number): void {
    this.panelSel = i;
    if (i >= 0) this.panelZone = 'row';
    this.panelRows.forEach((r, k) => r.setOn(k === i));
  }

  private flushPanelOffs(): void {
    for (const fn of this.panelOffs.splice(0)) fn();
  }

  private addPanelRow(p: Phaser.GameObjects.Container, label: string, run: () => void, o: { right?: Phaser.GameObjects.GameObject[]; enabled?: boolean; adjust?: (d: number) => void } = {}): Row {
    const i = this.panelRows.length;
    const inSettings = this.view === 'settings';
    const row = this.makeRow(this.panelTop + this.panelRowH / 2, label, inSettings ? SETTINGS_LAYOUT.rowSize : LOOK.panelSize, run, {
      ...o,
      width: PANEL_W,
      h: this.panelRowH,
      x: this.panelX,
      color: inSettings ? SETTINGS_LAYOUT.rowColor : undefined,
      onHover: () => this.selectPanel(i),
    });
    this.panelTop += this.panelRowH;
    row.adjust = o.adjust;
    p.add(row.root);
    this.panelRows.push(row);
    return row;
  }

  /** Sayfa başlığı (Sound / Gameplay / Display / Privacy): kor tonunda Cinzel büyük harf + sağa sönen ince çizgi; satırlar ondan içeride
   *  (DOM .st-page-head ile aynı). */
  private pageHeading(p: Phaser.GameObjects.Container, x: number, label: string): void {
    const L = SETTINGS_LAYOUT;
    const base = L.top + L.headH - 14;
    const t = elText(this, x, base, label, L.headSize, '#e0904a', { em: 0.14 }).setOrigin(0, 1);
    const x0 = t.x + t.width + 16;
    const right = x + L.indent + PANEL_W;
    const line = this.add.graphics();
    line.fillGradientStyle(0xe0904a, 0xe0904a, 0xe0904a, 0xe0904a, 0.55, 0, 0.55, 0).fillRect(x0, base - 13, Math.max(0, right - x0), 1);
    p.add([line, t]);
  }

  /** Seviye satırı (− [kaydırıcı] + değer; 0..max adım): tüm Settings kaydırıcıları aynı görünüm ve dokunma alanları. */
  private levelRow(p: Phaser.GameObjects.Container, label: string, initial: number, apply: (n: number, preview: boolean) => void, fmt: (n: number) => string, onChange?: (fn: (n: number) => void) => () => void, max = 10): void {
    let level = initial;
    const trackX = 410; // değer yazısı "100%" / "0.25x" + düğmesine binmesin
    const trackW = 200;
    const g = this.add.graphics();
    const value = this.valueText(PANEL_W - 6, 0, fmt(level), TXT_ON).setOrigin(1, 0.5);
    const draw = () => {
      g.clear();
      g.fillStyle(0x120c07, 0.9).fillRect(trackX, -5, trackW, 10);
      g.fillStyle(0xd9b26a, 1).fillRect(trackX, -5, (trackW * level) / max, 10);
      g.lineStyle(1, GOLD.edge, 1).strokeRect(trackX - 0.5, -5.5, trackW + 1, 11);
      g.fillStyle(0xf3d999, 1).fillCircle(trackX + (trackW * level) / max, 0, 13);
      g.lineStyle(2, 0x5a3a10, 1).strokeCircle(trackX + (trackW * level) / max, 0, 13);
      value.setText(fmt(level));
    };
    const set = (v: number, preview: boolean) => {
      const n = Math.min(max, Math.max(0, Math.round(v)));
      if (n === level && !preview) return;
      level = n;
      apply(n, preview);
      draw();
    };
    const step = (t: string, x: number, d: number) => {
      const tx = this.valueText(x, 0, t, TXT_ON, LOOK.stepSize).setOrigin(0.5);
      const z = this.add.zone(x, 0, 64, this.panelRowH - 8).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => set(level + d, true));
      return [tx, z];
    };
    const track = this.add.zone(trackX + trackW / 2, 0, trackW + 40, this.panelRowH - 8).setInteractive({ useHandCursor: true });
    const fromPointer = (ptr: Phaser.Input.Pointer) => {
      let ox = 0;
      for (let c: Phaser.GameObjects.Container | null = track.parentContainer; c; c = c.parentContainer) ox += c.x;
      const lx = worldXY(this, ptr).x - ox - trackX;
      set((lx / trackW) * max, false);
    };
    let dragging = false;
    track.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      dragging = true;
      fromPointer(ptr);
    });
    track.on('pointermove', (ptr: Phaser.Input.Pointer) => dragging && ptr.isDown && fromPointer(ptr));
    const stopDrag = () => {
      if (dragging) apply(level, true); // bırakınca deneme sesi
      dragging = false;
    };
    track.on('pointerup', stopDrag);
    track.on('pointerout', stopDrag);
    draw();
    if (onChange) {
      const off = onChange((n) => {
        if (!g.active) return;
        level = n;
        draw();
      });
      this.panelOffs.push(off);
    }
    this.addPanelRow(p, label, () => undefined, { right: [g, ...step('−', trackX - 46, -1), track, ...step('+', trackX + trackW + 42, 1), value], adjust: (d) => set(level + d, true) });
  }

  /** Ayarlar (Ömer 2026-10-16, sayfalı düzen; oyun içi DOM Settings ile aynı liste: src/ui/settings-pages.ts): solda kategori sütunu
   *  (Sound · Gameplay · Display · Privacy; seçili olanın önünde kor elması, en altta soluk Developer tools), sağda o sayfanın satırları.
   *  Son seçilen sayfa oturum boyunca hatırlanır (DOM ekranıyla ortak). Değerler aynı yerde saklanır. */
  private buildSettings(p: Phaser.GameObjects.Container): void {
    const L = SETTINGS_LAYOUT;
    SETTINGS_PAGES.forEach((pg, i) => {
      const row = this.makeRow(L.top + L.rowH / 2 + i * L.rowH, pg.label, L.catSize, () => {
        if (this.settingsKey !== pg.key) uiSound('tab');
        this.showSettingsPage(pg.key);
        this.panelZone = 'cat';
      }, { width: L.catW, h: L.rowH });
      p.add(row.root);
      this.catRows.push(row);
    });
    // Gizli debug girişinin yedeği (src/ui/debug-gesture.ts): kategori sütununun altında küçük, soluk "Developer tools"
    const dev = elBody(this, COL_X, L.top + SETTINGS_PAGES.length * L.rowH + 50, 'Developer tools', 26, 'rgba(168,151,122,0.55)').setOrigin(0, 0.5);
    dev.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-10, -(66 - dev.height) / 2, dev.width + 20, 66), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    dev.on('pointerover', () => dev.setColor(EL.NOTE));
    dev.on('pointerout', () => dev.setColor('rgba(168,151,122,0.55)'));
    dev.on('pointerup', () => openDebugMenu());
    p.add(dev);
    this.panelZone = 'cat';
    this.showSettingsPage(settingsPage(), true);
  }

  /** Settings sayfasını kurar (eski sayfa kısa solmayla gider). */
  private showSettingsPage(key: SettingsPageKey, instant = false): void {
    const p = this.panel;
    if (!p) return;
    const L = SETTINGS_LAYOUT;
    this.settingsKey = key;
    setSettingsPage(key);
    this.catRows.forEach((r, i) => r.setOn(i === pageIndex(key)));
    this.flushPanelOffs();
    this.pageBox?.destroy(true);
    this.panelRows = [];
    this.panelSel = -1;
    const box = (this.pageBox = this.add.container(0, 0));
    p.add(box);
    const x0 = COL_X + L.catW + L.gap;
    this.pageHeading(box, x0, pageOf(key).label);
    this.panelX = x0 + L.indent;
    this.panelTop = L.top + L.headH;
    this.panelRowH = L.rowH;
    // Satırların altında tek kısa not (Replay onayı, iPhone tam ekran ipucu, Copy log / Error reports onayı)
    const note = this.noteText(this.panelX + 34, 0, '', 22, '#cdb88d').setOrigin(0, 0.5);
    const val = (text: string, color = TXT_ON): Phaser.GameObjects.Text => this.valueText(PANEL_W - 6, 0, text, color).setOrigin(1, 0.5);
    for (const item of pageOf(key).items) {
      const label = SETTINGS_LABELS[item];
      switch (item) {
        case 'master':
          // Master Volume: skill sesleri, arayüz sesleri ve müzik bununla çarpılır (setSettingsVolume -> DOM Settings applyVolume)
          this.levelRow(box, label, loadVolume(), (n, preview) => setSettingsVolume(n, preview), volumeLabel, undefined, VOLUME_STEPS);
          break;
        case 'music':
          // Music: ana menü müziği (0 = tamamen kapalı; src/ui/music.ts). Burada canlı duyulur
          this.levelRow(box, label, loadMusicLevel(), (n) => setMusicLevel(n), volumeLabel, onMusicLevelChange, VOLUME_STEPS);
          break;
        case 'sfx':
          // Sound Effects: savaş / skill sesleri (0 = kapalı; src/ui/sfx-volume.ts; Master ile çarpılır). Bırakınca deneme sesi
          this.levelRow(box, label, loadSfxLevel(), (n, preview) => {
            setSfxLevel(n);
            if (preview) setSettingsVolume(loadVolume(), true);
          }, volumeLabel, onSfxLevelChange, VOLUME_STEPS);
          break;
        case 'ui':
          // UI sounds: menü sesleri (0 = kapalı; src/ui/ui-sound.ts)
          this.levelRow(box, label, loadUiSoundLevel(), (n, preview) => {
            setUiSoundLevel(n);
            if (preview) previewUiSound('select');
          }, volumeLabel, onUiSoundLevelChange, VOLUME_STEPS);
          break;
        case 'speed':
          // Battle speed: 20 adım 0.25x-4x (1x çevresinde ince; src/ui/battle-speed.ts)
          this.levelRow(box, label, speedIndex(battleSpeed()), (i) => setBattleSpeed(speedAt(i)), (i) => battleSpeedLabel(speedAt(i)), (fn) => onBattleSpeedChange((v) => fn(speedIndex(v))), SPEED_STEPS);
          break;
        case 'motion': {
          // Reduced motion: ana menü sahnesinde paralaks ve parçacık yok (src/ui/motion-pref.ts; kayıt yoksa işletim sistemi tercihi)
          const motion = val(reducedMotion() ? 'On' : 'Off');
          this.panelOffs.push(onReducedMotionChange((on) => motion.active && motion.setText(on ? 'On' : 'Off')));
          this.addPanelRow(box, label, () => setReducedMotion(!reducedMotion()), { right: [motion] });
          break;
        }
        case 'tutorials': {
          // Tutorials: mentor dersleri açık / kapalı (src/tutorial/store.ts). Replay (Ömer 2026-10-14, b_reset): görülen dersleri unutur,
          // dersleri açar; onay yok, kısa onay yazısı
          const tut = val(tutorialsOn() ? 'On' : 'Off');
          this.panelOffs.push(onTutorialChange(() => tut.active && tut.setText(tutorialsOn() ? 'On' : 'Off')));
          const replay = this.textLink(PANEL_W - 96, 'Replay', () => {
            resetTutorials();
            replay.setVisible(false);
            replayed.setVisible(true);
            this.time.delayedCall(2600, () => {
              if (!replay.active) return;
              replayed.setVisible(false);
              replay.setVisible(true);
            });
          });
          const replayed = this.noteText(PANEL_W - 96, 0, 'Tutorials will play again.', 22, '#cdb88d').setOrigin(1, 0.5).setVisible(false);
          this.addPanelRow(box, label, () => setTutorialsOn(!tutorialsOn()), { right: [tut, replay, replayed] });
          break;
        }
        case 'perf': {
          // Performance mode: Auto / On / Off (src/ui/perf-mode.ts; DOM Settings ile aynı kaynak)
          const perf = val(perfSettingLabel(perfSetting()));
          this.panelOffs.push(onPerfSettingChange((v) => perf.active && perf.setText(perfSettingLabel(v))));
          const stepPerf = (d: number): void => setPerfSetting(cyclePerfSetting(perfSetting(), d));
          this.addPanelRow(box, label, () => stepPerf(1), { right: [perf], adjust: stepPerf });
          break;
        }
        case 'fps': {
          // Show FPS: sol üstte küçük FPS göstergesi (varsayılan kapalı; src/ui/fps-meter.ts)
          const fps = val(showFps() ? 'On' : 'Off');
          this.panelOffs.push(onShowFpsChange((on) => fps.active && fps.setText(on ? 'On' : 'Off')));
          this.addPanelRow(box, label, () => setShowFps(!showFps()), { right: [fps] });
          break;
        }
        case 'fullscreen': {
          // Fullscreen (API yoksa satır yok; iPhone'da ipucu)
          const support = currentSupport();
          if (support === 'none' || isStandalone()) break;
          const state = val('Enter');
          this.panelOffs.push(onFullscreenChange((on) => state.active && state.setText(on ? 'Exit' : 'Enter')));
          this.addPanelRow(box, label, () => {
            if (support === 'ios') note.setText(IOS_HINT);
            else void toggleFullscreen();
          }, { right: [state] });
          break;
        }
        case 'reports': {
          // Error reports (Ömer 2026-10-16; src/diag/; DOM Settings ile aynı kaynak): opt-in, varsayılan Off
          const rep = val(diagConsent() ? 'On' : 'Off');
          this.panelOffs.push(onDiagConsentChange((on) => rep.active && rep.setText(on ? 'On' : 'Off')));
          this.addPanelRow(box, label, () => {
            setDiagConsent(!diagConsent());
            note.setText(diagConsent() ? 'Anonymous crash reports on. Kept 30 days.' : '');
          }, { right: [rep] });
          break;
        }
        case 'copyLog':
          // Copy log: izleri panoya (onay kapalıyken de çalışır, bir şey göndermez)
          this.addPanelRow(box, label, () => void copyDiagLog().then((ok) => note.active && note.setText(ok ? 'Log copied.' : 'Could not copy the log.')), { right: [val('Copy', TXT)] });
          break;
        case 'info':
          // Info: gizlilik metni + aynı anahtar (DOM penceresi src/diag/diag-notice.ts)
          this.addPanelRow(box, label, () => openDiagNotice('info'), { right: [val('Open', TXT)] });
          break;
      }
    }
    let y = this.panelTop + 30;
    if (key === 'privacy') {
      box.add(this.noteText(this.panelX + 34, y, PRIVACY_LINE, 22, '#a8977a').setOrigin(0, 0.5));
      y += 40;
      // Raporlar açıkken rapor kimliği (kısa; KVKK başvurusunda raporları bulmak için)
      const idText = this.noteText(this.panelX + 34, y, reportIdLine(diagReportId()), 22, '#cdb88d').setOrigin(0, 0.5);
      this.panelOffs.push(onDiagConsentChange(() => idText.active && idText.setText(reportIdLine(diagReportId()))));
      box.add(idText);
      y += 44;
    }
    note.setY(y);
    box.add(note);
    if (instant) return;
    box.setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 160, ease: 'Cubic.easeOut' });
  }

  /** Satırın sağındaki küçük yazı düğmesi (Replay): satır boyunda dokunma alanı. */
  private textLink(rightX: number, label: string, run: () => void): Phaser.GameObjects.Text {
    const t = this.valueText(rightX, 0, label, TXT).setOrigin(1, 0.5).setAlpha(0.8);
    t.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-14, -(this.panelRowH - 8) / 2 + t.height / 2, t.width + 28, this.panelRowH - 8), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    t.on('pointerover', () => t.setAlpha(1).setColor(TXT_ON));
    t.on('pointerout', () => t.setAlpha(0.8).setColor(TXT));
    t.on('pointerup', run);
    return t;
  }

  /** Multiplayer: mevcut lobi akışının ilk adımı (ad, Host, kodla Join). Lobi kurulmaya başlayınca MultiplayerScene devralır. */
  private buildMultiplayer(p: Phaser.GameObjects.Container): void {
    const ok = !!mp.serverUrl();
    const name = this.valueText(PANEL_W - 6, 0, mp.names().local, TXT_ON).setOrigin(1, 0.5);
    fitText(name, 260);
    this.addPanelRow(p, 'Your name', () => void this.askName(name), { right: [name] });
    this.addPanelRow(p, 'Host a lobby', () => mp.host(), { enabled: ok, right: [this.valueText(PANEL_W - 6, 0, 'Host', ok ? TXT_ON : '#7d705a').setOrigin(1, 0.5)] });
    this.addPanelRow(p, 'Join with code', () => void this.askCode(), { enabled: ok, right: [this.valueText(PANEL_W - 6, 0, 'Join', ok ? TXT_ON : '#7d705a').setOrigin(1, 0.5)] });
    if (!ok) {
      p.add(this.valueText(COL_X, LOOK.panelY0 + 3 * ROW_H, 'Server not configured', '#e08a7a', ELEGANT ? 26 : 30).setOrigin(0, 0.5));
      p.add(this.noteText(COL_X, LOOK.panelY0 + 3 * ROW_H + 44, 'The multiplayer server address has not been set up yet.', 20, '#a8977a').setOrigin(0, 0.5));
    }
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

  private async askName(label: Phaser.GameObjects.Text): Promise<void> {
    const n = await this.withPrompt(() => promptName(mp.session?.localName ?? '', sanitizeName));
    if (n !== null && this.scene.isActive()) {
      mp.setName(n);
      if (label.active) fitText(label.setScale(1).setText(mp.names().local), 260);
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
      if (left || right || up || down) this.focusCard(moveSelection(this.cardSel, left || up ? -1 : 1, this.cards.length), true);
      else if (k === 'e' || k === 'E') this.cards[this.cardSel]?.toggle?.(); // Quick Battle odaktayken Endless anahtarı
      else if (enter) this.cards[this.cardSel]?.run();
    } else if (this.view === 'settings' && (this.panelZone === 'cat' || k === 'Tab')) {
      // Kategori sütunu: yukarı/aşağı sayfa değiştirir, sağ / Enter satırlara geçer; Tab her yerde sonraki sayfa
      if (k === 'Tab' || up || down) {
        e.preventDefault();
        uiSound('tab');
        this.showSettingsPage(stepPage(this.settingsKey, k === 'Tab' ? (e.shiftKey ? -1 : 1) : up ? -1 : 1));
        this.panelZone = 'cat';
      } else if ((right || enter) && this.panelRows.length) this.selectPanel(0);
    } else {
      const row = this.panelRows[this.panelSel];
      if (this.view === 'settings' && left && !row?.adjust) {
        this.selectPanel(-1);
        this.panelZone = 'cat';
      } else if (up || down) this.selectPanel(this.panelSel < 0 ? 0 : moveSelection(this.panelSel, up ? -1 : 1, this.panelRows.length));
      else if ((left || right) && row?.adjust) row.adjust(left ? -1 : 1);
      else if (enter) row?.run();
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
