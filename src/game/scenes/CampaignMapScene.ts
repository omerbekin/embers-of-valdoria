import Phaser from 'phaser';
import { perfLite } from '../../ui/perf-mode';
import { basePuffs, placePuffs, roadRects, type Rect } from '../fog-clouds';
import { content } from '../../engine';
import {
  CONFIG,
  EVENTS,
  STORIES,
  chooseEvent,
  choiceBlocked,
  completeStory,
  eventChoices,
  restHealOf,
  townRestCount,
  townRestPrice,
  storyLiked,
  type EventChoice,
  TREASURES,
  acknowledgeHandover,
  grantAllLegendaries,
  acknowledgeLevelUps,
  activeHeroes,
  autoFormation,
  canSaveManually,
  completeSimple,
  edgeVisibility,
  enemyPreview,
  foeGroups,
  startCardInfo,
  type FoeGroup,
  nodeLevel,
  farewell,
  formCompany,
  getMap,
  hasUnsavedProgress,
  isAreaClass,
  leaderOf,
  markTipSeen,
  moveHero,
  pausedLock,
  suspendedOf,
  PAUSED_BROKEN,
  moveTo,
  newCampaign,
  nextStep,
  node,
  nodeVisibility,
  outgoing,
  pendingTip,
  pickHero,
  recruit,
  recruitHoldsBattle,
  formationGate,
  markFormationOpened,
  saveCount,
  chapterOf,
  clearedProgress,
  edgeEither,
  neighbors,
  nextReplayMult,
  replayMult,
  patrolAvailable,
  patrolRetreatMaxLoss,
  isDone,
  isCleared,
  startPatrol,
  travelRoute,
  travelRoutes,
  type CampaignMap,
  type CampaignState,
  type EdgeVis,
  type MapNode,
  type NextStep,
  type NodeType,
  type NodeVis,
  isFallen,
  leaveMerchant,
  openCampaignShop,
  restAtCamp,
  revisitKind,
  revisitNode,
  recruitInTown,
  townRecruitOffer,
  townScene,
  townScreenNode,
  type TownHotspot,
  reviveWithValor,
  valorReviveBlocked,
  rulesFor,
} from '../../campaign';
import { instanceRarity } from '../../progression/items';
import { dueScreenLessons, type LessonScreen } from '../../tutorial/lessons';
import { markLessonSeen, seenLessons, tutorialsOn } from '../../tutorial/store';
import { closeAllLessons, dismissLesson, showLesson } from '../../ui/lesson-box';
import { ValorMeter, isValorReviveOpen, openValorRevive, otherDialogOpen, rememberShown } from '../../ui/valor-braziers';
import { isInputLocked } from '../../ui/input-lock';
import { avatarUrl } from '../../ui/character-panel';
import { TownScreen } from '../town-screen';
import { openCampaignMerchant } from '../campaign-merchant';
import { characterTexture, MENU_ONLY_TEXTURES, preloadAssets, releaseTextures } from '../assets';
import { classSpriteIds } from '../sprite-needs';
import { preloadCampaignArt } from '../campaign-art';
import { edgeFillers, mapArt } from '../map-art';
import { placeArt } from '../wide-map';
import { onStageResize, stageView } from '../stage';
import { openStartBattle, type StartBattleHandle } from '../../ui/start-battle';
import { choiceStyle, openMapWindow, windowArt, type MwCard, type MwHandle, type MwSpec } from '../../ui/map-window';
import { choiceChips, nodeTags, paragraphs, resultChips } from '../../ui/map-window-data';
import { FULL_W, FULL_X0 } from '../../ui/viewport';
import { H, W, bodyText, classCard, crown, hpBar, openModal, type Modal } from '../campaign-ui';
import { MAP_SCENE, MENU_SCENE, checkPaused, current, loadEntry, markJourneyStart, save, session, setState, startCampaignBattle, storage } from '../campaign-session';
import { classAvatar, classLogoBadge, ensureGlow } from '../menu-ui';
import { avatarTexture } from '../assets';
import { bandTip, type PhLine, type PhSection } from '../band-tip';
import { sortByPrimary } from '../class-order';
import { debugState } from '../debug-state';
import { isSettingsOpen, setSettingsOpen } from '../../ui/settings';
import { isGameMenuOpen, setGameMenuOpen } from '../../ui/game-menu';
import type { MapMenuState } from '../session-flow';
import { campaignGearSource, openGearScreen, showHandover } from '../../ui/gear-screen';
import { openLootScreen, sampleLootXp, type LootXp } from '../../ui/loot-screen';
import { mountCampHud, type CampHud } from '../../ui/camp-hud';
import { showLevelBanner } from '../../ui/level-banner';
import { statPointsBetween } from '../../progression/levels';
import { legendaryPreviewWanted } from '../../progression/items';
import { EL, elBack, elBody, elButton, elGo, elIconButton, elLink, elPanel, elScreenIn, elText, elToast, fadeLine, fitW, hGradient, vGradient } from '../elegant-ui';
import { MAP_ZOOM, clampMid, clampZoom, wheelAction, worldToStageCss, zoomTowardMid, type Bounds } from '../map-view';
import { reducedMotion } from '../../ui/motion-pref';
import { drawBadge, drawFrame, drawLoopIcon, frameColor, frameSpec } from '../map-frames';
import { drawNodeGlyph, graveMark, nodeGlyphImage, openFormation } from '../campaign-panels';
import { openSlotBrowser, type SlotBrowser } from '../campaign-slots-ui';
import { ensureIcon } from '../icons';
import { hasUiImage, uiIconName } from '../../ui/ui-icons';
import { hasMiscImage } from '../../ui/misc-icons';
import { WORLD_AUDIO, worldSound } from '../../ui/ui-sound';
import { sceneMusic } from '../../ui/music';
import { MIN_TOUCH_PX, touchUnits } from '../touch-hit';

/**
 * Sefer haritası, "War table" (Ömer 2026-10-09, taslak 2; tasarım kiti):
 *  - Harita tam ekran; solda takım sütunu (portre + seviye + can; dokununca kahraman paneli: seviye / XP, 6 yuva, statlar -> Gear),
 *    altında ALT ALTA Formation / Gear (büyük ikon, telefonda >= 44 px dokunma alanı), onun altında bulunulan düğümün kompakt bilgisi.
 *  - Düğüme TEK dokunuş = eylem (Ömer 2026-10-12): gidilebilir düğüme yürür; savaş düğümünde önce "Start battle?" onayı (Cancel / Fight;
 *    düşmanlar ve sonraki duraklar onayda); kasaba / dinlenme / tüccar / olay yürüyüşten sonra doğrudan açılır. Sürükleme / sıkıştırma yürütmez.
 *    Fareyle düğümün üstüne gelince bilgi kartı (ad, tür, düşmanlar, sonraki duraklar); dokunmatikte uzun basış aynı kartı gösterir.
 *  - Sol üstte ◂ Back (ana menüye; Normal modda kaydedilmemiş ilerleme varsa onay), üst ortada harita adı, sol altta bölge, durak, mod,
 *    zorluk, altın; sağ üstte Menu (DOM, Esc): Resume / Save / Settings / Main Menu.
 *  - Düğümler: tür başına ince glif (savaş, elit, boss, kasaba, hazine, olay); durumlar geçildi / buradasın / gidilebilir (kor parıltı) / kapalı.
 *    Gidilebilir yollar akan kor çizgi, yürünmüş yol düz altın, ötesi kesik.
 *  - Kaydırma / yakınlaştırma (src/game/map-view.ts): 21:9 harita çerçevesinden asla çıkmaz; dokunma / fare sürükleme, fare tekerleği,
 *    Ctrl + tekerlek (trackpad) ve iki parmak sıkıştırma = imlece / parmakların ortasına doğru yakınlaştırma (Ömer 2026-10-11; kısa geçiş,
 *    Reduced motion anlık), yatay tekerlek kaydırır, ok tuşları, + / - tuşları, alttaki ◂ ▸ − + düğmeleri. Yakınlaştırma 1,0-1,4x.
 * Kurallar src/campaign/ içindedir; bu sahne yalnızca çizer ve oyuncunun seçimlerini kurallara iletir.
 * İki kamera: ana kamera haritayı, arayüz kamerası sabit katmanı gösterir (customStageCamera; gerçek yakınlaştırma = render ölçeği x harita).
 */

/** Savaşsız düğüm kartı: başlık + birincil eylem (eski pencerelerdeki fiiller). */
const PLACE_CARD: Partial<Record<NodeType, { title: string; action: string }>> = {
  town: { title: 'Enter town?', action: 'Enter' },
  rest: { title: 'Make camp?', action: 'Rest' },
  merchant: { title: 'Visit the merchant?', action: 'Trade' },
  treasure: { title: 'Open the chest?', action: 'Open' },
  event: { title: 'Look closer?', action: 'Continue' },
};
const TYPE_LABEL: Record<NodeType, string> = { town: 'Town', battle: 'Battle', elite: 'Elite', event: 'Event', treasure: 'Treasure', boss: 'Boss', rest: 'Rest point', merchant: 'Merchant' };
/** Varışta kartın onayını bekleyen adımlar (Ömer 2026-10-19: kart çıkıp onaysız girmesin; hikaye / askerleme / veda / yeni takım dahil). */
const CONFIRM_STEPS: readonly string[] = ['town', 'rest', 'merchant', 'event', 'treasure', 'story', 'recruit', 'volunteer', 'farewell', 'company'];
const WALK_SPEED = 320; // px/sn
const FOLLOW_GAP = 55; // px
const PAN_STEP = 340;
/** Sol sütun (Sakin etiket, Ömer 2026-10-19; mockup map-calm V1): kenardan boşluk, üst boşluk, içerik genişliği. Telefonda içerik COL_K kat büyür. */
const SIDE = { left: 36, top: 124, partyW: 360 };
const COL_K = 1.45;
/** Dokunmatikte düğüm bilgi kartı için uzun basış süresi (ms). */
const LONG_PRESS_MS = 420;
/** Zorunlu seçim pencereleri (Esc ile kapanmaz; Party / Formation bunların üstünde açılmaz). */
const FORCED: ReadonlyArray<NextStep['kind']> = ['hero', 'recruit', 'volunteer', 'farewell', 'company'];

type Pt = { x: number; y: number };
/** Yürüyüşte seçilen düğüm; `action` = varışta yapılacak iş (devriye / kasabaya yeniden giriş), yoksa düğümün adımı. */
type Arrival = { node: string; requested: boolean; action?: () => void };

/** Düğüme göre göreli etiket dikdörtgeni. */
type Side = 'below' | 'above' | 'right' | 'left' | 'belowR' | 'belowL' | 'aboveR' | 'aboveL';
type Box = { x0: number; y0: number; x1: number; y1: number };
type LabelPlace = { x0: number; y0: number; w: number; h: number; sub: boolean; side: Side };
/** Düğüm etiketi: `q` = kalıcı küçük ad (yalnızca masaüstü, bulunulan / gidilebilir olmayanlarda), `b` = ad + alt yazı şeridi (bulunulan / gidilebilir hep açık; diğerlerinde üstüne gelince / dokununca). */
type LabelSlot = { q: LabelPlace | null; b: LabelPlace; hot: boolean };

export class CampaignMapScene extends Phaser.Scene {
  static readonly KEY = 'CampaignMapScene';
  /** Kameraları stage.ts değil bu sahne kurar (iki kamera + harita yakınlaştırması). */
  readonly customStageCamera = true;
  /** Oyuncunun harita yakınlaştırması (MAP_ZOOM); kameranın gerçek yakınlaştırması bunun render ölçeğiyle çarpımı. */
  private mapZoom = 1;
  /** Son çizimdeki telefon düzeni: değişirse (döndürme / pencere) düğüm adları yeniden çizilir (telefonda yalnızca bulunulan + sonraki). */
  private drawnCompact = false;
  /** Harita görselinin dünyadaki kapsamı (21:9 çerçeve; kaydırma sınırı). */
  private frame: Bounds = { left: 0, right: W, top: 0, bottom: H };
  /** Harita kamerasının baktığı nokta (kısılmadan önce). */
  private mid: Pt = { x: W / 2, y: H / 2 };

  private map!: CampaignMap;
  private world!: Phaser.GameObjects.Container;
  private dyn!: Phaser.GameObjects.Container;
  private ui!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private curves = new Map<string, Phaser.Curves.QuadraticBezier>();
  private openEdges: Array<{ g: Phaser.GameObjects.Graphics; pts: Pt[] }> = [];
  private clouds = new Map<string, Phaser.GameObjects.Image[]>();
  /** Bulut yerleşiminin imzası (açık alanlar değişince bulut yeniden kurulur). */
  private cloudSig = new Map<string, string>();
  /** Sisin ASLA örtmeyeceği alanlar (gidilebilir düğüm + adı + yolu, bulunulan düğüm); renderMap her çizimde doldurur. */
  private clearZones: Rect[] = [];
  private caravan: Phaser.GameObjects.Image[] = [];
  private walking: { finish: () => void } | null = null;
  private modal: Modal | null = null;
  /** Menu > Load: bu yuvanın kayıt listesi (src/game/campaign-slots-ui.ts "Column"). */
  private slotBrowser: SlotBrowser | null = null;
  /** Kahraman paneli ya da Formation penceresi açık (Menu düğmesi gizlenir; pencerenin kendi Close / Done'ı yeter). */
  private sideOpen = false;
  /** Sağ üstteki DOM "Menu" düğmesi. */
  private tip: Phaser.GameObjects.Container | null = null;
  private dashT = 0;
  private drag = { down: false, moved: false, x: 0, y: 0 };
  /** Basışın başladığı düğüm (dokunuş = aynı düğümde basıp bırakmak). */
  private tapNode: string | null = null;
  /** Düğüm bilgi kartı (fare hover / dokunmatik uzun basış). */
  private nodeTip: Phaser.GameObjects.Container | null = null;
  /** Dokunmatik uzun basış zamanlayıcısı; `longPressed` = bu basış kart gösterdi (bırakınca yürümez). */
  private pressTimer: Phaser.Time.TimerEvent | null = null;
  private longPressed = false;
  /** Onaylanmış ("Fight") ama araya giren adım yüzünden henüz başlamamış savaş: düğüm + başlatma gecikmesi (ms). */
  private pendingFight: { node: string; delay: number } | null = null;
  /** Açık düğüm kartının konum yenileyicisi (yürürken kamera kayar; kart hedef düğümde kalır) ve son kamera imzası. */
  private cardPlace: (() => void) | null = null;
  private cardCam = '';
  /** Yürüyüşte seçilen düğüm: kartın eylemine varıştan önce basıldıysa `requested` (yürüyüş atlanır, eylem varışta hemen çalışır). */
  private arrival: Arrival | null = null;
  /** Düğüm kartının eylemi hazine / seçeneksiz olayı doğrudan verir (varış penceresi açılmaz; Ömer 2026-10-18, madde 357). */
  private directAt: string | null = null;
  /** Katılımdan sonra savaş bekliyor (Ravenwood): bu düğümde "Formation'ı düzenle, sonra savaşı başlat" kartı (sahne kapanınca söner). */
  private arrangeNotice: string | null = null;
  /** Global Gear + Formation ikonları (DOM, sol alt; src/ui/camp-hud.ts). */
  private campHud: CampHud | null = null;
  /** Açık ipucu kartı "Formation'ı düzenle" ipucu mu (Formation düğmesi o sürece parlar). */
  private tipIsArrange = false;
  /** Gear düğmesinin parlaması "gördüm" kaydı: kahraman -> Gear'ı açtığımızda ulaştığı level (yeni level atlama parlamayı yeniden kurar; yalnızca oturum, kayıt değişmez). */
  private gearSeen = new Map<string, number>();
  /** Lejanda ? düğmesine basılıp açık bırakıldı (üstüne gelince geçici de açılır). */
  private legendOpen = false;
  private panBtns: { minus?: Phaser.GameObjects.Container; plus?: Phaser.GameObjects.Container } = {};
  private toastFn: ((msg: string) => void) | null = null;
  /** Kasaba ekranı (Ömer 2026-10-12): kasaba düğümünde tam ekran kasaba; açıkken harita girdisi kilitli, harita kamerası gizli. */
  private town: TownScreen | null = null;

  constructor() {
    super(CampaignMapScene.KEY);
  }

  private get s(): CampaignState {
    return current()!;
  }

  init(): void {
    this.curves = new Map();
    this.openEdges = [];
    this.clouds = new Map();
    this.cloudSig = new Map();
    this.caravan = [];
    this.walking = null;
    this.modal = null;
    this.slotBrowser = null;
    this.sideOpen = false;
    this.tip = null;
    this.mapZoom = 1;
    this.frame = { left: 0, right: W, top: 0, bottom: H };
    this.mid = { x: W / 2, y: H / 2 };
    this.panBtns = {};
    this.toastFn = null;
    this.panTween = null;
    this.panTarget = null;
    this.town = null;
    this.nodeTip = null;
    this.pressTimer = null;
    this.longPressed = false;
    this.pendingFight = null;
    this.cardPlace = null;
    this.arrival = null;
    this.arrangeNotice = null;
    this.campHud = null;
    this.tipIsArrange = false;
    this.routeG = null;
    this.routesFor = { s: null, routes: new Map() };
  }

  preload(): void {
    // yalnızca sınıf / çağrı / tüccar görselleri (moblar yalnızca savaşta; item görselleri yalnızca Endless): telefon belleği, src/game/sprite-needs.ts
    const sprites = classSpriteIds();
    preloadAssets(this, { sprites, avatars: sprites, items: false });
    releaseTextures(this, (key) => MENU_ONLY_TEXTURES.some((p) => key.startsWith(p))); // ana menü kartları / logo haritada gösterilmez
    preloadCampaignArt(this);
  }

  create(): void {
    elScreenIn(this); // ortak ekran geçişi (data/ui-motion.json > screen; Reduced motion = anında)
    if (!current()) {
      // ?campaign=1 (geliştirme) ya da kayıtsız açılış: yeni Normal sefer
      setState(newCampaign({ mode: 'normal', seed: Math.floor(Date.now() % 1_000_000_000) }));
    }
    this.map = getMap(this.s.mapId);
    this.events.once('shutdown', () => closeAllLessons()); // mentor kutuları sahneyle kapanır (docs/design/tutorial.md)
    this.cameras.main.setBackgroundColor('#0b0705');
    this.world = this.add.container(0, 0);
    this.ui = this.add.container(0, 0).setDepth(1000);
    this.uiCam = this.cameras.add(0, 0, stageView.canvasW, stageView.canvasH);
    this.cameras.main.ignore(this.ui);
    this.uiCam.ignore(this.world);

    this.drawTerrain();
    this.dyn = this.add.container(0, 0);
    this.world.add(this.dyn);
    this.renderMap(false);
    this.placeCaravan(this.s.at);
    this.hud = this.add.container(0, 0);
    this.ui.add(this.hud);
    this.toastFn = elToast(this, 150, this.ui); // bildirim arayüz katmanında
    this.renderHud();
    this.syncValor();
    this.mountCampHud();
    this.bindCamera();
    const compact = document.documentElement.classList.contains('compact') || document.documentElement.classList.contains('short');
    if (compact) this.mapZoom = 1.2;
    const at = this.P(this.s.at);
    this.mid = { x: at.x, y: at.y };
    this.layoutCameras(true);
    onStageResize(this, () => this.layoutCameras(false));
    this.events.on('update', (_t: number, dt: number) => {
      this.animateDashes(dt);
      this.updatePanButtons();
      this.syncOverlays();
      if (this.cardPlace) {
        const c = this.cameras.main;
        const sig = `${c.scrollX.toFixed(1)}|${c.scrollY.toFixed(1)}|${c.zoom.toFixed(3)}`;
        if (sig !== this.cardCam) {
          this.cardCam = sig;
          this.cardPlace(); // yürürken kamera kayar: kart hedef düğümü göstermeye devam eder
        }
      }
    });
    this.events.once('shutdown', () => setSettingsOpen(false));
    // Ses (2026-10-13): harita parşömeni açılır / dürülür; müzik advance > syncTown'da (harita yolculuğu ya da kasaba)
    worldSound('map_unroll');
    this.events.once('shutdown', () => worldSound('map_roll'));
    this.input.keyboard?.on('keydown-ESC', () => this.onEscape());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.advance();
  }

  // ------------------------------------------------------------ oyun menüsü (sağ üst Menu düğmesi / Esc)
  //
  // Ömer 2026-10-10: harita Menu'sü savaştakiyle AYNI ortak bileşen (src/ui/game-menu.ts; içerik src/game/session-flow.ts > menuItems
  // 'campaign'): Resume / Save (elle kayıt) / Load (Normal) / Codex / Settings / Main Menu. Sağ üstteki Menu düğmesini de o bileşen yönetir;
  // sahne yalnızca anlık durumu (menuState) ve Save / Load eylemlerini verir.

  /** Ortak Menu'nün okuduğu durum: düğme görünür mü, Save yazısı, Load var mı. */
  menuState(): MapMenuState {
    const gear = !!document.querySelector('#ui-root .gr-overlay');
    const cover = !!this.slotBrowser || this.sideOpen || gear || !!this.walking;
    const s = this.s;
    return {
      available: !cover,
      save: canSaveManually(s) && !this.modal ? `Save  ${saveCount(storage(), s.slot)}/${CONFIG.rules.maxSaves.normal}` : null,
      load: s.mode === 'normal',
    };
  }

  /** Menu > Save. */
  menuSave(): void {
    save('manual');
    this.renderHud(); // "Game saved" bildirimi
  }

  /** Menu > Load. */
  menuLoad(): void {
    this.openLoad();
  }

  /** Ortak Menu açık mı (harita girdisi o sırada kilitli). */
  private get menuOpen(): boolean {
    return isGameMenuOpen();
  }

  /** Katman düzeni (her karede): açık bir pencere / menü / yuva ekranı / Gear varken alttaki ipucu kartı gizlenir (pencerelerin üstüne çizilmesin). */
  private syncOverlays(): void {
    const gear = !!document.querySelector('#ui-root .gr-overlay');
    const cover = !!this.slotBrowser || this.sideOpen || gear;
    // Valor mangalları: pencere / menü / Gear açıkken gizli (DOM, Phaser pencerelerinin üstünde kalmasın)
    if (this.valorMeter) {
      const hide = cover || this.menuOpen || !!this.modal || isValorReviveOpen() || otherDialogOpen();
      if (this.valorMeter.el.hidden !== hide) this.valorMeter.el.hidden = hide;
      this.valorMeter.el.classList.toggle('vl-town', !!this.town);
    }
    if (this.tip) {
      const show = !cover && !this.menuOpen && !this.modal;
      if (this.tip.visible !== show) this.tip.setVisible(show);
    }
  }

  private closeMenu(): void {
    setGameMenuOpen(false);
  }

  private openMenu(): void {
    if (this.walking || this.slotBrowser) return;
    setGameMenuOpen(true);
  }

  /** Menu > Load: bu yuvanın kayıtları; Back menüye döner, bir kayıt yüklenince harita o kayıtla yeniden kurulur. */
  private openLoad(): void {
    this.slotBrowser = openSlotBrowser(this, this.ui, {
      flow: 'load',
      slot: this.s.slot,
      onlySlot: true,
      onClose: () => {
        this.slotBrowser = null;
        this.openMenu(); // ortak Menu'ye geri döner
      },
      onLoad: (e) => {
        loadEntry(e);
        this.scene.start(MAP_SCENE);
      },
    });
  }

  /** Esc: önce açık ayarlar paneli / menü / kart / ipucu kapanır; hiçbiri yoksa menü açılır. */
  private onEscape(): void {
    if (debugState.uiPaused) return; // wiki açık: Esc wiki'nindir
    if (isSettingsOpen()) return setSettingsOpen(false);
    if (this.slotBrowser) return this.slotBrowser.back();
    if (this.menuOpen) return this.closeMenu();
    if (this.cardPlace && this.modal) return this.closeModal(); // yürürken açık düğüm kartı: Esc önce kartı kapatır (yürüyüş sürer)
    if (this.walking) return this.walking.finish();
    const step = nextStep(this.s).kind;
    // zorunlu seçim pencereleri (kahraman, aday, veda, yeni takım) Esc ile kapanmaz: menü üstlerine açılır. Kasaba ekranında ilk giriş akışı
    // (hikâye sahnesi) da kapanmaz: kasabanın arkasındaki harita düğümüne dokunup yeniden açmak mümkün değil
    if (this.modal && !FORCED.includes(step) && !(this.town && step !== 'town')) {
      this.closeModal();
      this.renderHud();
      return;
    }
    if (this.tip && !this.modal) return this.dismissTip();
    this.openMenu();
  }

  /** Ok tuşları = kaydırma, + / - = yakınlaştırma (pencere / menü açıkken değil). */
  private onKey(e: KeyboardEvent): void {
    if (this.hotkey(e)) return;
    if (this.modal || this.menuOpen || this.town || debugState.uiPaused || isSettingsOpen()) return;
    if (e.key === 'ArrowLeft') this.panBy(-PAN_STEP, 0);
    else if (e.key === 'ArrowRight') this.panBy(PAN_STEP, 0);
    else if (e.key === 'ArrowUp') this.panBy(0, -PAN_STEP * 0.6);
    else if (e.key === 'ArrowDown') this.panBy(0, PAN_STEP * 0.6);
    else if (e.key === '+' || e.key === '=') this.setMapZoom(this.mapZoom + MAP_ZOOM.step);
    else if (e.key === '-' || e.key === '_') this.setMapZoom(this.mapZoom - MAP_ZOOM.step);
  }

  /**
   * Oyun geneli kısayollar (Ömer 2026-10-18): C = Gear / karakter ekranı (açıkken Gear kendisi C ile kapatır), F = Formation aç / kapat.
   * Harita ve kasabada çalışır; yazı alanına yazarken, menü / ayarlar / başka pencere / onay / loot / tüccar açıkken çalışmaz.
   */
  private hotkey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return false;
    const k = e.key.toLowerCase();
    if (k !== 'c' && k !== 'f') return false;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return false;
    if (debugState.uiPaused || isSettingsOpen() || this.menuOpen || this.slotBrowser || this.walking) return false;
    if (k === 'f' && this.formationOpen) {
      this.closeFormation();
      return true;
    }
    if (this.modal || isInputLocked() || otherDialogOpen() || document.querySelector('#ui-root .gr-overlay')) return false;
    if (!activeHeroes(this.s).length || !this.canOpenSide()) return false;
    if (k === 'c') this.openGear();
    else this.openFormation();
    return true;
  }

  // ------------------------------------------------------------ geometri

  private P(id: string): Pt {
    const n = node(this.map, id);
    return { x: n.pos[0] * W, y: n.pos[1] * H };
  }

  /** Kenarın eğrisi: hafif kavisli (kavis yönü kimliklerden belirleyici). */
  private curve(from: string, to: string): Phaser.Curves.QuadraticBezier {
    const key = `${from}>${to}`;
    let c = this.curves.get(key);
    if (c) return c;
    const a = this.P(from);
    const b = this.P(to);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const bend = (h % 2 ? 1 : -1) * len * 0.1;
    c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2(mx + (-dy / len) * bend, my + (dx / len) * bend), new Phaser.Math.Vector2(b.x, b.y));
    this.curves.set(key, c);
    return c;
  }

  // ------------------------------------------------------------ arazi (sabit)

  private drawTerrain(): void {
    const art = mapArt(this, this.map);
    if (art) {
      const img = this.add.image(0, 0, art.key).setOrigin(0, 0);
      // Eski 16:9 haritanın bölgesi dünyada 0-1920 x 0-1080'e oturur (düğüm konumları bu bölgeye göre)
      const p = placeArt(img.width, img.height, art.region, { x: 0, y: 0, w: W, h: H });
      img.setPosition(p.x, p.y).setScale(p.scale);
      this.frame = { left: Math.min(0, p.left), right: Math.max(W, p.right), top: Math.min(0, p.top), bottom: Math.max(H, p.bottom) };
      const fill = edgeFillers(this, art.key, 0);
      fill.place(img);
      this.world.add([...fill.items, img]);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0xd9c497, 0xd9c497, 0xb59a68, 0xb59a68, 1).fillRect(FULL_X0, 0, FULL_W, H);
      this.world.add(g);
    }
    // Ashen Plain: arka planda kül rengi ova yok, kodla gri-kül ton
    const ash = this.map.nodes.find((n) => n.id === '10');
    if (ash) {
      const a = this.add.image(ash.pos[0] * W, ash.pos[1] * H, ensureGlow(this)).setTint(0x8a8580).setAlpha(0.55).setScale(4.2, 3);
      this.world.add(a);
    }
  }

  // ------------------------------------------------------------ yollar, düğümler, sis (duruma göre yeniden çizilir)

  private renderMap(animateFog: boolean): void {
    this.drawnCompact = this.compact();
    this.dyn.removeAll(true);
    this.openEdges = [];
    this.clearZones = [];
    const vis = nodeVisibility(this.map, this.s, session.revealFog);
    const options = this.moves();
    // 1) yollar (altta koyu iz: harita üstünde okunur kalsın), gidilebilenler ayrı katmanda akar
    const lines = this.add.graphics();
    this.dyn.add(lines);
    for (const e of this.map.edges) {
      const ev = edgeVisibility(this.map, this.s, vis, e);
      const pts = this.curve(e.from, e.to).getPoints(48).map((p) => ({ x: p.x, y: p.y }));
      if (ev === 'open') {
        // parıltı altlığı ve koyu iz bir kez çizilir; her karede yalnızca üstteki akan kesik çizgi yenilenir (Ömer 2026-10-11, performans)
        const base = this.add.graphics();
        this.drawRoad(base, pts, 'open', 0, 'base');
        const g = this.add.graphics();
        this.dyn.add([base, g]);
        this.openEdges.push({ g, pts });
        this.clearZones.push(...roadRects(pts));
        continue;
      }
      this.drawRoad(lines, pts, ev, 0);
    }
    this.animateDashes(0);
    // 2) düğümler
    // Üst üste binen etiketlerde bulunulan ve gidilebilir düğüm en üstte kalsın: önce uzaklar, sonra gidilebilirler, en son bulunulan
    const rank = (id: string) => (vis[id] === 'current' ? 2 : options.includes(id) ? 1 : 0);
    this.planLabels(vis, options);
    for (const n of [...this.map.nodes].sort((a, b) => rank(a.id) - rank(b.id))) this.drawNode(n, vis[n.id]!, options.includes(n.id));
    // 3) sis bulutları
    this.updateClouds(vis, animateFog);
  }

  /** Tek hamlede gidilebilen komşular (serbest dolaşım: ileri + geri; src/campaign/state.ts > moveOptions). Yola çıkılamıyorsa boş. */
  private moves(): string[] {
    const step = nextStep(this.s);
    return step.kind === 'move' ? [...step.options, ...(step.back ?? [])] : [];
  }

  /** Bulunulan düğüme tek kenarla bağlı mı (iki yönlü)? */
  private adjacent(id: string): boolean {
    return neighbors(this.map, this.s.at).includes(id);
  }

  private routesFor: { s: CampaignState | null; routes: Map<string, string[]> } = { s: null, routes: new Map() };

  /** Yolculuk hedefleri ve yolları (serbest dolaşım; src/campaign/state.ts > travelRoutes): aynı durum için bir kez hesaplanır. */
  private travelTargets(): Map<string, string[]> {
    if (this.routesFor.s !== this.s) this.routesFor = { s: this.s, routes: travelRoutes(this.s) };
    return this.routesFor.routes;
  }

  private routeG: Phaser.GameObjects.Graphics | null = null;

  /** Yolculuk rotası vurgusu (hover ya da yürüyüş boyunca): bulunulan yerden hedefe yollar kor rengiyle; null = kaldır. */
  private routeHint(to: string | null, route?: string[]): void {
    this.routeG?.destroy();
    this.routeG = null;
    if (!to) return;
    const hop = route ? undefined : this.travelTargets().get(to);
    const full = route ?? (hop ? [this.s.at, ...hop] : []);
    if (full.length < 2) return;
    const g = this.add.graphics();
    for (let i = 1; i < full.length; i++) {
      const e = edgeEither(this.map, full[i - 1]!, full[i]!);
      if (!e) continue;
      const pts = this.curve(e.from, e.to).getPoints(48).map((p) => ({ x: p.x, y: p.y }));
      this.drawRoad(g, pts, 'open', 0, 'base');
      this.drawRoad(g, pts, 'open', 0, 'dash');
    }
    this.world.add(g);
    this.routeG = g;
  }

  /** Yol: yürünmüş = düz altın; gidilebilir = akan kor (parıltı altlığıyla); görünür = kesik altın; sis = soluk. */
  private drawRoad(g: Phaser.GameObjects.Graphics, pts: Pt[], ev: EdgeVis, offset: number, part: 'all' | 'base' | 'dash' = 'all'): void {
    const stroke = (w: number, col: number, a: number, dashed: boolean, dash = 14, gap = 10) => {
      g.lineStyle(w, col, a);
      if (!dashed) {
        g.beginPath();
        pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
        g.strokePath();
      } else this.dashed(g, pts, dash, gap, offset);
    };
    switch (ev) {
      // Çift ince çizgi (Ömer 2026-10-18, mockup path=1): koyu kenar + açık gövde + ortada koyu iz = iki paralel çizgi görünümü
      case 'walked':
        stroke(9, 0x080503, 0.5, false);
        stroke(6.5, 0xf0c25a, 1, false);
        stroke(3.2, 0x2a1d10, 1, false);
        break;
      case 'open':
        if (part !== 'dash') {
          stroke(14, EL.EMBER, 0.16, false);
          stroke(11, 0x0a0603, 0.55, false);
        }
        if (part !== 'base') stroke(3.6, EL.EMBER2, 1, true, 12, 9);
        break;
      case 'visible':
        stroke(9, 0x080503, 0.5 * 0.6, false);
        stroke(6.5, 0xeadcb4, 0.6, false);
        stroke(3.2, 0x2a1d10, 0.6, false);
        break;
      default:
        stroke(9, 0x080503, 0.5 * 0.25, false);
        stroke(6.5, 0xeadcb4, 0.25, false);
        stroke(3.2, 0x2a1d10, 0.25, false);
    }
  }

  /** Kesik çizgi (yay uzunluğuna göre); `offset` akış animasyonu. */
  private dashed(g: Phaser.GameObjects.Graphics, pts: Pt[], dash: number, gap: number, offset: number): void {
    const period = dash + gap;
    let dist = -((offset % period) + period) % period;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      let t = 0;
      while (t < seg) {
        const phase = (((dist + t) % period) + period) % period;
        const inDash = phase < dash;
        const left = inDash ? dash - phase : period - phase;
        const t2 = Math.min(seg, t + left);
        if (inDash) g.lineBetween(a.x + ((b.x - a.x) * t) / seg, a.y + ((b.y - a.y) * t) / seg, a.x + ((b.x - a.x) * t2) / seg, a.y + ((b.y - a.y) * t2) / seg);
        t = t2 + 0.001;
      }
      dist += seg;
    }
  }

  private dashAcc = 0;

  /** Gidilebilecek yollarda akan kor çizgi. */
  private animateDashes(dt: number): void {
    if (!this.openEdges.length) return;
    this.dashT += dt * 0.035;
    // Performans modu: akan yol çizgileri her karede değil ~15 kez/sn yeniden çizilir (Graphics yeniden çizimi haritanın boşta en büyük işi)
    if (perfLite()) {
      this.dashAcc += dt;
      if (this.dashAcc < 66) return;
      this.dashAcc = 0;
    }
    for (const { g, pts } of this.openEdges) {
      g.clear();
      this.drawRoad(g, pts, 'open', -this.dashT, 'dash');
    }
  }

  private labelPlan = new Map<string, LabelSlot>();

  /** Koruma savaşı kazanılmış korumalı hazine / olay düğümünde yenilen karşılaşmanın adı (kafatası işareti); yoksa null. */
  private guardDefeated(n: MapNode, v: NodeVis): string | null {
    if (n.encounter && (n.type === 'treasure' || n.type === 'event') && (v === 'cleared' || isDone(this.s, n.id, 'battle'))) return enemyPreview(n.encounter).name;
    return null;
  }

  /** Şeridin alt satırı (yalnızca bulunulan / gidilebilir / üstüne gelinen düğümde görünür): tür · alt başlık, devriye yüzdesi, yenilen koruma. */
  private labelSub(n: MapNode, v: NodeVis): string {
    if (v === 'goal') return '';
    const done = v === 'cleared';
    const choice = outgoing(this.map, n.id).length > 1 && !done ? '  ·  choice' : '';
    const parts = [`${n.subtitle}${choice}`];
    if (done && patrolAvailable(this.s, n.id)) parts.push(`Patrol ${Math.round(nextReplayMult(this.s, n.id) * 100)}%`);
    const guard = this.guardDefeated(n, v);
    if (guard) parts.push(`${guard} defeated`);
    return parts.filter(Boolean).join('  ·  ');
  }

  /**
   * Etiket yerleşimi (Ömer 2026-10-18; Sakin etiket 2026-10-19): her düğüm için kalıcı küçük ad (`q`, yalnızca masaüstü ve bulunulan / gidilebilir
   * olmayanlarda) ve ad + alt yazı şeridi (`b`). Aday yönler (veride yön varsa önce o): düğüm madalyonları ve önceden yerleşen adlarla çakışmayan
   * ilk aday seçilir. Çakışırsa bulunulan / gidilebilir şeritte alt satır gizlenip yeniden denenir. Sabit sıra = her açılışta aynı.
   */
  private planLabels(vis: Record<string, NodeVis>, options: string[]): void {
    this.labelPlan = new Map();
    const compact = this.compact();
    type Item = { n: MapNode; hot: boolean; sub: boolean; subW: number; nameW: number };
    const items: Item[] = [];
    const meds: Box[] = [];
    for (const n of this.map.nodes) {
      const v = vis[n.id]!;
      if (v === 'fog') continue;
      const p = this.P(n.id);
      const m = frameSpec(n.type).R + 6;
      meds.push({ x0: p.x - m, y0: p.y - m, x1: p.x + m, y1: p.y + m });
      const hot = v === 'current' || options.includes(n.id);
      const subTxt = this.labelSub(n, v);
      const t1 = elText(this, 0, 0, n.name.toUpperCase(), 15, '#fff', { em: 0.06 });
      const t2 = subTxt ? elBody(this, 0, 0, subTxt, 13, '#fff', false) : null;
      items.push({ n, hot, sub: !!t2, nameW: t1.width, subW: t2?.width ?? 0 });
      t1.destroy();
      t2?.destroy();
    }
    const prio = (id: string) => (vis[id] === 'current' ? 0 : options.includes(id) ? 1 : this.adjacent(id) ? 2 : 3);
    items.sort((a, b) => prio(a.n.id) - prio(b.n.id));
    const placed: Box[] = [];
    const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const at = (side: Side, R: number, w: number, h: number) => ({
      x0: side === 'right' ? R + 8 : side === 'left' ? -R - 8 - w : side === 'belowR' || side === 'aboveR' ? R * 0.3 : side === 'belowL' || side === 'aboveL' ? -w - R * 0.3 : -w / 2,
      y0: side.startsWith('below') ? R + 8 : side.startsWith('above') ? -R - h - 8 : -h / 2,
    });
    for (const it of items) {
      const n = it.n;
      const p = this.P(n.id);
      const R = frameSpec(n.type).R;
      const pref: Side[] = n.label === 'above' ? ['above', 'below', 'right', 'left', 'aboveR', 'aboveL', 'belowR', 'belowL'] : ['below', 'above', 'right', 'left', 'belowR', 'belowL', 'aboveR', 'aboveL'];
      const own = { x0: p.x - (R + 6), y0: p.y - (R + 6) };
      const bandSize = (sub: boolean) => ({ w: Math.max(it.nameW, sub ? it.subW : 0) + 24, h: sub ? 38 : 24 });
      if (compact && !it.hot) {
        // telefon: kalıcı ad yok; şerit dokununca açılır (çakışma aranmaz)
        const sz = bandSize(it.sub);
        this.labelPlan.set(n.id, { q: null, b: { ...at(pref[0]!, R, sz.w, sz.h), ...sz, sub: it.sub, side: pref[0]! }, hot: false });
        continue;
      }
      let chosen: LabelPlace | null = null;
      let bestScore = Infinity;
      let bestRect: Box | null = null;
      // bulunulan / gidilebilir: önce alt satırlı tüm yönler, sonra yalnızca ad; diğerleri: yalnızca küçük ad. Hiçbiri temiz değilse en az çakışan
      for (const sub of it.hot && it.sub ? [true, false] : [false]) {
        for (const side of pref) {
          const sz = it.hot ? bandSize(sub) : { w: it.nameW + 12, h: 22 };
          const o = at(side, R, sz.w, sz.h);
          const rect = { x0: p.x + o.x0 - 4, y0: p.y + o.y0 - 3, x1: p.x + o.x0 + sz.w + 4, y1: p.y + o.y0 + sz.h + 3 };
          let score = 0;
          for (const m of meds) if (!(m.x0 === own.x0 && m.y0 === own.y0)) score += area(rect, m);
          for (const q of placed) score += area(rect, q);
          if (it.hot && !sub && it.sub) score += 1; // alt satırı gizlemek küçük ceza: eşit temizlikte alt satırlı kazanır
          if (score < bestScore) {
            bestScore = score;
            chosen = { ...o, ...sz, sub, side };
            bestRect = rect;
          }
          if (score === 0) break;
        }
        if (bestScore === 0) break;
      }
      if (!chosen || !bestRect) continue;
      placed.push(bestRect);
      if (it.hot) this.labelPlan.set(n.id, { q: null, b: chosen, hot: true });
      else {
        const sz = bandSize(it.sub);
        this.labelPlan.set(n.id, { q: chosen, b: { ...at(chosen.side, R, sz.w, sz.h), ...sz, sub: it.sub, side: chosen.side }, hot: false });
      }
    }
  }

  /**
   * Düğüm (Ömer 2026-10-18, mockup map-nodes varyant C; Sakin etiket 2026-10-19, map-calm V1): ikon bugünkü boyda, çevresinde tür çerçevesi (`map-frames.ts`).
   * Durumlar: gidilebilir (kor parıltı), üstüne gelince / dokununca yumuşak ışık (çerçeve / kutu vurgusu yok), buradasın (altın halka), geçildi (soluk,
   * onay rozeti yok; devriye = küçük döngü simgesi), korumalı düğümde yenilen koruma = küçük kafatası, hedef/sisli (kilit). Boss hafif nabız ışığı (tween).
   * Ad: küçük gölgeli yazı; şerit (ad + alt yazı) yalnızca bulunulan / gidilebilir / üstüne gelinen düğümde.
   */
  private drawNode(n: MapNode, v: NodeVis, option: boolean): void {
    if (v === 'fog') return;
    const p = this.P(n.id);
    const c = this.add.container(p.x, p.y);
    this.dyn.add(c);
    const fs = frameSpec(n.type);
    const r = fs.icon / 1.84; // ikon yarıçapı eşdeğeri (bugünkü NODE_R: 24, boss 30)
    const R = fs.R;
    const here = v === 'current';
    const done = v === 'cleared';
    const goal = v === 'goal';
    const actionable = option || (here && this.actionHere());
    if (actionable || (fs.boss && !goal)) {
      const glow = this.add.image(0, 0, ensureGlow(this)).setTint(fs.boss ? 0xff6a1c : EL.EMBER).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(fs.glowR * 2.6, fs.glowR * 2.6).setAlpha(0.5);
      c.add(glow);
      this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 0.9 }, duration: fs.boss ? 1800 : 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (here) {
      const gold = this.add.image(0, 0, ensureGlow(this)).setTint(EL.ON_N).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(fs.glowR * 2.8, fs.glowR * 2.8).setAlpha(0.4);
      c.add(gold);
    }
    // Üstüne gelince / dokununca yumuşak ışık (kor / altın, ince; yavaşça açılıp söner). Çerçeve ya da kutu vurgusu YOK.
    const halo = this.add.image(0, 0, ensureGlow(this)).setTint(0xffbe6a).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(fs.glowR * 3.4, fs.glowR * 3.4).setAlpha(0);
    c.add(halo);
    const body = this.add.container(0, 0);
    c.add(body);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4).fillCircle(2, 4, R - 6);
    body.add(shadow);
    const g = this.add.graphics();
    body.add(g);
    drawFrame(g, n.type);
    // boyalı düğüm ikonu (assets/misc-icons/node), yoksa ince çizgili glif; başlangıç düğümü 'start' ikonunu taşır (Ömer 2026-10-11)
    const art = nodeGlyphImage(this, n.id === this.map.start && hasMiscImage('node', 'start') ? 'start' : n.type, 0, 0, fs.icon);
    if (art) {
      if (goal) art.setTint(0x6a5e4c).setAlpha(0.6);
      else if (done) art.setTint(0xb4a890);
      body.add(art);
    } else drawNodeGlyph(g, n.type, done ? 0x9a8c70 : goal ? 0x7d705a : 0xd9c8a2, fs.boss ? 1.25 : 1);
    const bx = R * 0.72;
    if (goal) {
      const bg = this.add.graphics();
      drawBadge(bg, 'lock', bx, bx);
      body.add(bg);
    }
    // Geçilen düğüm soluk (tik yok)
    if (done) body.setAlpha(0.74);
    // Devriye (serbest dolaşım, roadmap 2.10): temizlenmiş savaş düğümünde küçük döngü simgesi (yüzde şeritte: "Patrol 60%")
    const patrol = done && patrolAvailable(this.s, n.id);
    if (patrol) {
      const lg = this.add.graphics();
      drawLoopIcon(lg, R * 0.74, -R * 0.74);
      c.add(lg);
    }
    // Yolculuk hedefi (temizlenmiş düğümler üzerinden; tek dokunuşla yürünür)
    const travel = !option && !here && this.travelTargets().has(n.id);
    if (here) {
      const ring = this.add.graphics();
      ring.lineStyle(3, EL.ON_N, 0.95).strokeCircle(0, 0, fs.glowR + 4).lineStyle(1.5, EL.ON_N, 0.4).strokeCircle(0, 0, fs.glowR + 8);
      body.add(ring);
    }
    if (n.type === 'treasure' && n.encounter) {
      // Korumalı hazine: sol altta küçük çapraz kılıç madalyonu (sağ alt işaret için boş kalsın)
      const gb = this.add.graphics();
      gb.fillStyle(0x140e09, 1).fillCircle(-r * 0.8, r * 0.8, 11).lineStyle(1, EL.GOLD, 0.8).strokeCircle(-r * 0.8, r * 0.8, 11);
      body.add(gb);
      const guard = nodeGlyphImage(this, 'battle', -r * 0.8, r * 0.8, 20);
      if (guard) body.add(guard);
      else drawNodeGlyph(gb, 'battle', 0xd9c8a2, 0.45, -r * 0.8, r * 0.8);
    }
    // Koruma savaşı kazanılan (düğüm henüz temizlenmemiş olsa da) korumalı hazine / olay: sağ altta küçük kafatası (ad şeritte: "<ad> defeated")
    if (this.guardDefeated(n, v)) {
      const sg = this.add.graphics();
      sg.fillStyle(0x1a0c08, 1).fillCircle(R * 0.78, R * 0.78, 11.5).lineStyle(1.6, 0xb8402f, 0.9).strokeCircle(R * 0.78, R * 0.78, 11.5);
      c.add([sg, this.add.image(R * 0.78, R * 0.78, ensureIcon(this, 'skull', '#e9a58f', false)).setDisplaySize(15, 15)]);
    }
    // Ad (küçük, gölgeli) + şerit (ad + alt yazı). Yerleşim renderMap > planLabels'te (çakışmasız, sabit)
    const nameCol = goal ? EL.DIM : here || option ? EL.ON : '#f0e2c0';
    const slot = this.labelPlan.get(n.id);
    let quiet: Phaser.GameObjects.Text | null = null;
    let bandC: Phaser.GameObjects.Container | null = null;
    if (slot) {
      const plan = slot.b;
      const sub = plan.sub ? elBody(this, 0, 0, this.labelSub(n, v), 13, goal ? EL.DIM : '#b9a883', false).setOrigin(0.5, 0.5) : null;
      const name = elText(this, 0, 0, n.name.toUpperCase(), 15, nameCol, { em: 0.06 }).setOrigin(0.5, 0.5);
      const band = this.add.graphics();
      band.fillStyle(0x0d0906, goal ? 0.6 : 0.88).fillRect(plan.x0, plan.y0, plan.w, plan.h);
      band.lineStyle(1, 0xd9b26a, 0.28).strokeRect(plan.x0, plan.y0, plan.w, plan.h);
      band.fillStyle(frameColor(n.type), goal ? 0.5 : 1).fillRect(plan.x0, plan.y0, 4, plan.h);
      const cx = plan.x0 + plan.w / 2 + 2;
      name.setPosition(cx, plan.y0 + (sub ? 13 : plan.h / 2));
      sub?.setPosition(cx, plan.y0 + 29);
      bandC = this.add.container(0, 0, sub ? [band, name, sub] : [band, name]);
      bandC.setAlpha(slot.hot ? 1 : 0);
      c.add(bandC);
      if (slot.q) {
        const q = slot.q;
        quiet = elText(this, q.x0 + q.w / 2, q.y0 + q.h / 2, n.name.toUpperCase(), 14, goal ? EL.DIM : '#e6d8b4', { em: 0.08 }).setOrigin(0.5, 0.5);
        quiet.setStroke('#060402', 5).setAlpha(done || goal ? 0.82 : 1);
        c.add(quiet);
      }
    }
    // Sis kuralı (Ömer 2026-10-14): bulunulan ve sıradaki (gidilebilir) düğüm, adı ve alt yazısı bulutsuz kalır
    const next = this.adjacent(n.id);
    if (here || option || v === 'near' || next) {
      const place = slot?.hot ? slot.b : null;
      const x0 = Math.min(-R - 8, place ? place.x0 - 10 : 0);
      const x1 = Math.max(R + 8, place ? place.x0 + place.w + 10 : 0);
      const y0 = Math.min(-R - 8, place ? place.y0 - 10 : 0);
      const y1 = Math.max(R + 8, place ? place.y0 + place.h + 10 : 0);
      this.clearZones.push({ x0: p.x + x0, x1: p.x + x1, y0: p.y + y0, y1: p.y + y1 });
    }
    if (goal) c.setAlpha(0.75);
    if (here && this.actionHere()) this.tweens.add({ targets: shadow, scale: { from: 1, to: 1.12 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Üstüne gelince / dokununca: ışık yumuşakça açılır / söner; şerit (yoksa) belirir, kalıcı ad çekilir. Yolculuk hedefinde rota da vurgulanır.
    let fx: Phaser.Tweens.Tween[] = [];
    const setHover = (on: boolean) => {
      if (travel) this.routeHint(on ? n.id : null);
      if (on) this.dyn.bringToTop(c);
      for (const t of fx) t.stop();
      const dur = reducedMotion() ? 0 : on ? 220 : 320;
      fx = [this.tweens.add({ targets: halo, alpha: on ? 0.5 : 0, duration: dur, ease: 'Sine.easeInOut' })];
      if (bandC && !slot?.hot) fx.push(this.tweens.add({ targets: bandC, alpha: on ? 1 : 0, duration: dur, ease: 'Sine.easeInOut' }));
      if (quiet) fx.push(this.tweens.add({ targets: quiet, alpha: on ? 0 : done || goal ? 0.82 : 1, duration: dur, ease: 'Sine.easeInOut' }));
    };
    // Telefonda dokunma alanı >= 44 gerçek px (görünüm aynı): yarıçap anlık büyür (cssScale x harita yakınlaştırması) ve en yakın komşu düğüme
    // olan yarı mesafeyle sınırlıdır (komşular çakışmaz). Taban alandan küçülmez.
    let nearest = Infinity;
    for (const o of this.map.nodes) if (o.id !== n.id) nearest = Math.min(nearest, Math.hypot(o.pos[0] * W - p.x, o.pos[1] * H - p.y));
    const hitR = (): number => Math.max(52, Math.min(touchUnits(104, MIN_TOUCH_PX / this.mapZoom) / 2, nearest / 2 - 2));
    const zone = this.add.zone(0, 0, 104, 104).setInteractive({
      useHandCursor: true,
      hitArea: { r: 52 },
      hitAreaCallback: (_a: unknown, x: number, y: number) => Math.hypot(x - 52, y - 52) <= hitR(),
    });
    // Dokunuş = basış ve bırakış AYNI düğümde, arada sürükleme / sıkıştırma yok (sürükleme ya da başka yerden kayan parmak sayılmaz).
    // Dokunmatikte basılı tutarken ışık + şerit açılır; uzun basış (yürümeden) bilgi kartını gösterir; fareyle üstüne gelmek de aynı kartı gösterir.
    const busy = () => !!this.walking || !!this.modal || this.menuOpen || !!this.town;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.tapNode = n.id;
      this.longPressed = false;
      this.pressTimer?.remove();
      this.pressTimer = null;
      if (!p.wasTouch || busy()) return;
      setHover(true);
      this.pressTimer = this.time.delayedCall(LONG_PRESS_MS, () => {
        this.pressTimer = null;
        if (this.tapNode !== n.id || this.drag.moved || busy()) return;
        this.longPressed = true;
        this.showNodeTip(n.id, p);
      });
    });
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const same = this.tapNode === n.id;
      const long = this.longPressed;
      this.tapNode = null;
      this.longPressed = false;
      this.pressTimer?.remove();
      this.pressTimer = null;
      if (p.wasTouch) setHover(false);
      if (long) return this.hideNodeTip();
      if (!same || this.drag.moved || busy()) return;
      this.hideNodeTip();
      this.onNodeTap(n.id, v);
    });
    zone.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || p.isDown || busy()) return;
      setHover(true);
      this.showNodeTip(n.id, p);
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch && this.nodeTip && !p.isDown) this.placeNodeTip(p);
    });
    zone.on('pointerout', () => {
      setHover(false);
      this.pressTimer?.remove();
      this.pressTimer = null;
      if (!this.longPressed) this.hideNodeTip();
    });
    c.add(zone);
  }

  private updateClouds(vis: Record<string, NodeVis>, animate: boolean): void {
    const want = new Map<string, number>();
    for (const n of this.map.nodes) {
      const v = vis[n.id];
      if (v === 'fog' || v === 'goal') want.set(n.id, v === 'goal' ? 0.3 : 0.5);
    }
    // Parçalar açık alanlardan itilir (src/game/fog-clouds.ts); yerleşim değiştiyse bulut yeniden kurulur
    const plans = new Map<string, ReturnType<typeof placePuffs>>();
    for (const id of want.keys()) {
      const p = this.P(id);
      plans.set(id, placePuffs(basePuffs(id, p.x, p.y), this.clearZones));
    }
    const sigOf = (id: string) => JSON.stringify(plans.get(id)!.map((q) => [Math.round(q.x), Math.round(q.y), q.sx.toFixed(2)]));
    for (const [id, imgs] of this.clouds) {
      if (want.has(id) && this.cloudSig.get(id) === sigOf(id)) continue;
      this.clouds.delete(id);
      this.cloudSig.delete(id);
      for (const im of imgs) {
        this.tweens.killTweensOf(im);
        if (animate) this.tweens.add({ targets: im, alpha: 0, duration: 600, onComplete: () => im.destroy() });
        else im.destroy();
      }
    }
    const tex = this.cloudTexture();
    for (const [id, a] of want) {
      const existing = this.clouds.get(id);
      if (existing) {
        existing.forEach((im) => im.setAlpha(a));
        continue;
      }
      const imgs = plans.get(id)!.map((q, k) => {
        const im = this.add.image(q.x, q.y, tex).setAlpha(a).setScale(q.sx, q.sy).setTint(0xeeeae2);
        this.tweens.add({ targets: im, x: im.x + q.drift * 26, duration: 9000 + k * 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.world.add(im);
        return im;
      });
      this.clouds.set(id, imgs);
      this.cloudSig.set(id, sigOf(id));
    }
  }

  private cloudTexture(): string {
    const key = 'cmap-cloud';
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, 256, 160);
    if (!tex) return key;
    const ctx = tex.getContext();
    let seed = 4242;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 12; i++) {
      const x = 50 + rnd() * 156;
      const y = 50 + rnd() * 60;
      const r = 30 + rnd() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 160);
    }
    tex.refresh();
    return key;
  }

  // ------------------------------------------------------------ kafile (lider + silüetler)

  private placeCaravan(at: string): void {
    this.caravan.forEach((c) => c.destroy());
    this.caravan = [];
    const team = activeHeroes(this.s);
    const lead = leaderOf(this.s);
    const order = lead ? [lead, ...team.filter((h) => h.id !== lead.id)] : team;
    const p = this.P(at);
    order.forEach((h, i) => {
      const def = content.classes[h.class];
      if (!def) return;
      const tex = characterTexture(this, def.spriteId, def.color);
      const img = this.add.image(p.x, p.y, tex.key, tex.real && this.textures.get(tex.key).has('0') ? '0' : undefined).setOrigin(0.5, 1);
      const height = i === 0 ? 96 : 96 * 0.85;
      img.setScale(height / img.height);
      if (i > 0) img.setTint(0x2a1a10).setAlpha(0.55);
      img.setPosition(p.x - 34 - i * 28, p.y - 4);
      this.world.add(img);
      this.caravan.push(img);
    });
    // lider önde (en üstte çizilir)
    this.caravan.slice().reverse().forEach((im) => this.world.bringToTop(im));
  }

  /**
   * Kafileyi yol boyunca yürütür; dokunma ya da `finish` atlar. Kamera kafileyi izler (çerçeve içinde). `route` = [çıkış, ..., varış]:
   * yolculukta (serbest dolaşım) aradaki temizlenmiş düğümlerde durmadan tek akışta yürür. Geri yönde yürünen yol, haritada çizilen eğrinin
   * tersidir (aynı kavis).
   */
  private walk(route: string[], done: () => void): void {
    const from = route[0]!;
    const to = route[route.length - 1]!;
    const legs = route.slice(1).map((b, i) => {
      const a = route[i]!;
      const e = edgeEither(this.map, a, b);
      const rev = !!e && e.from === b;
      const c = rev ? this.curve(b, a) : this.curve(a, b);
      return { c, rev, len: c.getLength() };
    });
    const len = legs.reduce((x, l) => x + l.len, 0);
    const duration = (len / WALK_SPEED) * 1000;
    const state = { d: 0 };
    let finished = false;
    const pointAt = (d: number): Pt => {
      if (d <= 0) {
        // kafilenin arkası henüz başlangıç düğümünde: önceki yolun sonundan geriye uzanır
        const a = this.P(from);
        return { x: a.x + d * 0.6, y: a.y };
      }
      let rest = Math.min(d, len);
      for (const l of legs) {
        if (rest <= l.len || l === legs[legs.length - 1]) {
          const t = Math.min(1, rest / Math.max(1, l.len));
          const pt = l.c.getPointAt(l.rev ? 1 - t : t);
          return { x: pt.x, y: pt.y };
        }
        rest -= l.len;
      }
      return this.P(to);
    };
    const place = () => {
      this.caravan.forEach((im, i) => {
        const d = state.d - i * FOLLOW_GAP;
        const p = pointAt(d);
        const ahead = pointAt(d + 4);
        const bob = Math.abs(Math.sin((state.d / 26) * Math.PI + i * 0.8)) * 4;
        im.setPosition(p.x, p.y - 4 - bob);
        if (Math.abs(ahead.x - p.x) > 0.5) im.setFlipX(ahead.x < p.x);
      });
      const lead = this.caravan[0];
      if (lead) this.setMid({ x: lead.x, y: lead.y });
    };
    const tween = this.tweens.add({ targets: state, d: len, duration, ease: 'Sine.easeInOut', onUpdate: place, onComplete: () => finish() });
    // yürüyüş sesi: toprak yolda adımlar (sol/sağ dönüşümlü), arada araba gıcırtısı (data/audio-world.json > march)
    const march = WORLD_AUDIO.march;
    let steps = 0;
    const stepper = this.time.addEvent({
      delay: march.stepMs,
      loop: true,
      callback: () => {
        worldSound('march_step', march.stepGain[steps % march.stepGain.length] ?? 1);
        if (steps++ % march.wagonEvery === 0) worldSound('wagon_creak', march.wagonGain); // ilk adımda ve her wagonEvery adımda
      },
    });
    const skip = this.add.zone(FULL_X0, 0, FULL_W, H).setOrigin(0, 0).setInteractive();
    this.ui.add(skip);
    const hint = elBody(this, W / 2, 1030, 'Tap to skip', 20, EL.NOTE).setOrigin(0.5).setAlpha(0.85);
    this.ui.add(hint);
    const finish = () => {
      if (finished) return;
      finished = true;
      tween.stop();
      stepper.remove();
      skip.destroy();
      hint.destroy();
      this.walking = null;
      this.routeHint(null);
      this.placeCaravan(to);
      this.setMid(this.P(to)); // atlanınca da kamera varılan düğüme ortalı (taslak kuralı)
      done();
    };
    skip.on('pointerdown', finish);
    this.walking = { finish };
  }

  // ------------------------------------------------------------ kamera: kaydırma + yakınlaştırma (21:9 çerçevede)

  private bindCamera(): void {
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      if (this.modal || this.menuOpen || this.town) return;
      const ev = p.event as WheelEvent | undefined;
      // birkaç piksellik dikey pay tekerleği yutmasın: dikey kaydırma yalnızca belirgin yer varsa
      ev?.preventDefault(); // tekerlek sayfayı kaydırmasın
      this.hideNodeTip();
      const a = wheelAction({ dx, dy, ctrl: !!ev?.ctrlKey });
      // Tekerlek / Ctrl + tekerlek (trackpad sıkıştırması): imlece doğru yakınlaştırma, kısa geçişle (Ömer 2026-10-11)
      if (a.zoom) this.zoomAt(this.zoomGoal() + a.zoom * (ev?.ctrlKey ? 0.5 : 1), p.x, p.y, true);
      if (a.panX || a.panY) this.setMid({ x: this.mid.x + a.panX / this.camZoom(), y: this.mid.y + a.panY / this.camZoom() });
    });
    // Ctrl + tekerlek (trackpad sıkıştırması) tarayıcıyı yakınlaştırmasın
    const canvas = this.game.canvas;
    const stopZoom = (e: WheelEvent) => {
      if (this.sys.isActive()) e.preventDefault(); // tekerlek ne tarayıcıyı yakınlaştırsın ne sayfayı kaydırsın
    };
    canvas.addEventListener('wheel', stopZoom, { passive: false });
    this.events.once('shutdown', () => canvas.removeEventListener('wheel', stopZoom));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // İkinci parmak (sıkıştırma başlangıcı) dokunuş sayılmaz: süren hareketi sıfırlamaz, hareket olarak işaretler
      const multi = [this.input.pointer1, this.input.pointer2].filter((q) => q.isDown).length > 1;
      if (multi) {
        this.drag.moved = true;
        return;
      }
      this.drag = { down: !this.modal && !this.menuOpen && !this.town, moved: false, x: p.x, y: p.y };
    });
    // İki parmakla sıkıştırma = yakınlaştırma
    this.input.addPointer(1);
    let pinch = 0;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const a = this.input.pointer1;
      const b = this.input.pointer2;
      if (a.isDown && b.isDown) {
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        // İki parmakla sıkıştırma: iki parmağın ortasına doğru yakınlaştırma (anlık; parmak izler)
        if (pinch > 0 && !this.modal && !this.town) this.zoomAt(this.mapZoom * (d / pinch), (a.x + b.x) / 2, (a.y + b.y) / 2, false, true);
        pinch = d;
        if (!this.drag.moved) this.hideNodeTip();
        this.drag.moved = true;
        this.drag.x = p.x;
        this.drag.y = p.y;
        return;
      }
      pinch = 0;
      if (!this.drag.down || !p.isDown) return;
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (!this.drag.moved && Math.hypot(dx, dy) < 10) return;
      if (!this.drag.moved) this.hideNodeTip(); // sürükleme başladı: kart kapanır, yürüyüş tetiklenmez
      this.drag.moved = true;
      this.setMid({ x: this.mid.x - dx / this.camZoom(), y: this.mid.y - dy / this.camZoom() });
      this.drag.x = p.x;
      this.drag.y = p.y;
    });
    this.input.on('pointerup', () => {
      // Sıkıştırmadan kalkan son parmak da dokunuş sayılmasın: hareket bayrağı tüm parmaklar kalkınca sıfırlanır
      if (this.input.pointer1.isDown || this.input.pointer2.isDown) return;
      this.drag.down = false;
      this.time.delayedCall(0, () => (this.drag.moved = false));
    });
  }

  private camZoom(): number {
    return stageView.zoom * this.mapZoom;
  }

  /** Görünen dünya alanı (tuval / gerçek yakınlaştırma). */
  private viewSize(): { w: number; h: number } {
    const z = this.camZoom();
    return { w: (stageView.canvasW || W) / z, h: (stageView.canvasH || H) / z };
  }

  /** Kamera ortasını ayarlar (çerçeveye kısılır). */
  private setMid(p: Pt): void {
    this.mid = clampMid(p, this.frame, this.viewSize());
    this.cameras.main.centerOn(this.mid.x, this.mid.y);
  }

  /** Düğmeler / ok tuşları: yumuşak kaydırma (art arda basışlar hedefe eklenir). */
  private panBy(dx: number, dy: number): void {
    const base = this.panTween?.isPlaying() && this.panTarget ? this.panTarget : this.mid;
    const from = { ...this.mid };
    const to = clampMid({ x: base.x + dx, y: base.y + dy }, this.frame, this.viewSize());
    this.panTarget = to;
    this.panTween?.stop();
    const o = { t: 0 };
    this.panTween = this.tweens.add({ targets: o, t: 1, duration: 280, ease: EL.EASE, onUpdate: () => this.setMid({ x: from.x + (to.x - from.x) * o.t, y: from.y + (to.y - from.y) * o.t }) });
  }
  private panTween: Phaser.Tweens.Tween | null = null;
  private panTarget: Pt | null = null;

  /** Süren yakınlaştırma geçişinin hedefi (art arda tekerlek adımları üst üste eklenir). */
  private zoomGoal(): number {
    return this.zoomTween?.isPlaying() && this.zoomTarget !== null ? this.zoomTarget : this.mapZoom;
  }
  private zoomTween: Phaser.Tweens.Tween | null = null;
  private zoomTarget: number | null = null;

  /**
   * Ekrandaki (tuval pikseli) bir noktaya doğru yakınlaştırma: o noktanın altındaki dünya noktası yerinde kalır, orta çerçeveye kısılır
   * (src/game/map-view.ts > zoomTowardMid). `smooth`: kısa geçiş (Reduced motion: anlık); `raw`: 0,01 adımına yuvarlamadan (sıkıştırma).
   */
  private zoomAt(z: number, sx: number, sy: number, smooth: boolean, raw = false): void {
    const goal = raw ? Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.min, z)) : clampZoom(z);
    const cam = this.cameras.main;
    const world = cam.getWorldPoint(sx, sy);
    const off = { x: sx - cam.width / 2, y: sy - cam.height / 2 };
    const apply = (zz: number) => {
      this.mapZoom = zz;
      cam.setZoom(this.camZoom());
      this.mid = zoomTowardMid({ x: world.x, y: world.y }, off, this.camZoom(), this.frame, this.viewSize());
      cam.centerOn(this.mid.x, this.mid.y);
    };
    this.zoomTween?.stop();
    this.zoomTarget = goal;
    if (!smooth || reducedMotion() || Math.abs(goal - this.mapZoom) < 0.001) return apply(goal);
    const from = this.mapZoom;
    const o = { t: 0 };
    this.zoomTween = this.tweens.add({ targets: o, t: 1, duration: 140, ease: 'Sine.easeOut', onUpdate: () => apply(from + (goal - from) * o.t) });
  }

  private setMapZoom(z: number, raw = false): void {
    this.mapZoom = raw ? Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.min, z)) : clampZoom(z);
    this.cameras.main.setZoom(this.camZoom());
    this.setMid(this.mid);
  }

  /** − + düğmeleri sınırlarda soluk. */
  private updatePanButtons(): void {
    const b = this.panBtns;
    if (!b.minus) return;
    b.minus.setAlpha(this.mapZoom > MAP_ZOOM.min + 0.001 ? 1 : 0.3);
    b.plus?.setAlpha(this.mapZoom < MAP_ZOOM.max - 0.001 ? 1 : 0.3);
  }

  /**
   * Kameralar (kurulumda ve ekran boyutu değişince): tuval boyutu, render ölçeği; harita kamerası baktığı noktayı korur (çerçeveye kısılı);
   * arayüz kamerası 1920x1080 arayüzü ortalar, sütunlar görünen alanın kenarlarına yeniden yerleşir.
   */
  private layoutCameras(first: boolean): void {
    const cam = this.cameras.main;
    cam.setSize(stageView.canvasW, stageView.canvasH);
    cam.setZoom(this.camZoom());
    this.setMid(this.mid);
    this.uiCam.setSize(stageView.canvasW, stageView.canvasH);
    this.uiCam.setZoom(stageView.zoom);
    this.uiCam.centerOn(W / 2, H / 2);
    if (!first) {
      if (this.compact() !== this.drawnCompact) this.renderMap(false);
      this.renderHud();
      this.town?.render();
    }
  }

  private uiPoint(p: Phaser.Input.Pointer): Pt {
    const v = this.uiCam.getWorldPoint(p.x, p.y);
    return { x: v.x, y: v.y };
  }

  // ------------------------------------------------------------ arayüz (sabit katman): War table

  private renderHud(): void {
    this.hud.removeAll(true);
    this.panBtns = {};
    const L = this.hud;
    const left = stageView.left;
    const right = stageView.right;
    const k = this.compact() ? COL_K : 1;
    // Kenar gölgeleri (Sakin etiket): yalnızca sol sütunun altı ve üst şerit hafifçe kararır, harita açık kalır
    const shade = this.add.graphics();
    hGradient(shade, left, 0, 430 * k, H, 0x080604, [
      [0, 0.8],
      [0.7, 0.45],
      [1, 0],
    ]);
    vGradient(shade, left, 0, right - left, 110, 0x080604, [
      [0, 0.4],
      [1, 0],
    ]);
    L.add(shade);
    // Sol üst: geri ikonu (ana menüye; Menu > Main Menu ile aynı yer). Esc haritada Menu'yü açar. renderHud her boyut değişiminde yeniden kurar.
    const back = elBack(this, () => this.leaveMap(), { isBusy: () => this.inputBusy(), left: () => left, manual: true });
    L.add(back.root);
    // Üst orta: harita adı (Ömer 2026-10-12; Sakin etiket: biraz küçük ve soluk)
    L.add(elText(this, (left + right) / 2, 52, this.map.title, 30, '#ffffff', { em: 0.16 }).setOrigin(0.5, 0.5).setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f).setAlpha(0.72));
    this.renderColumn(left + SIDE.left, SIDE.top + (this.compact() ? 16 : 0)); // telefonda büyük Back düğmesinin altında kalsın
    this.renderControls();
    if (session.notice) {
      this.toast(session.notice);
      session.notice = '';
    }
  }

  /**
   * Sol sütun (Ömer 2026-10-19, Sakin etiket V1): "Your party" + kahraman satırları (portre, ad, Lv, ince can çubuğu, rol; dokun = o kahramanın Gear
   * sekmesi), harcanmamış puan için tek not + portrede küçük kor elması, "You are here" ve bölge / ilerleme / mod / altın. Telefonda sütun COL_K kat büyür;
   * sığmazsa önce "You are here" kalkar, sonra sütun küçülür.
   */
  private renderColumn(x: number, y: number): void {
    const s = this.s;
    const team = activeHeroes(s);
    const lead = leaderOf(s);
    const w = SIDE.partyW;
    const PITCH = 86;
    const HEAD = 34;
    const paused = suspendedOf(s);
    const hereH = 14 + 48 + (paused ? 24 : 0) + 12;
    const FOOT = 122;
    const rowsEnd = HEAD + team.length * PITCH;
    let k = this.compact() ? COL_K : 1;
    const maxH = H - (this.compact() ? 190 : 130) - y; // sol alttaki Gear + Formation ikonlarının üstü
    let showHere = true;
    if ((rowsEnd + hereH + FOOT) * k > maxH) showHere = false;
    if ((rowsEnd + FOOT) * k > maxH) k = maxH / (rowsEnd + FOOT);
    const col = this.add.container(x, y).setScale(k);
    this.hud.add(col);
    const MUTE_LINE = 0.2;
    // başlık + tek not
    col.add(elText(this, 0, 0, 'Your party', 14, 'rgba(217,178,106,0.85)', { em: 0.22 }).setOrigin(0, 0.5));
    const pts = (h: (typeof team)[number]) => (isFallen(h) ? 0 : (h.statPoints ?? 0));
    const unspent = team.map(pts).filter((n) => n > 0);
    if (unspent.length) {
      const same = unspent.every((n) => n === unspent[0]);
      const txt = same ? `${unspent[0]} point${unspent[0] === 1 ? '' : 's'} to spend${unspent.length > 1 ? ' each' : ''}` : 'Stat points to spend';
      const t = elText(this, 0, 0, txt, 12, '#ffb98a', { em: 0.06 }).setOrigin(0, 0.5);
      const cw = t.width + 36;
      const chip = this.add.graphics();
      chip.fillStyle(0x2a1608, 0.75).fillRect(w - cw, -14, cw, 28).lineStyle(1, EL.EMBER2, 0.7).strokeRect(w - cw + 0.5, -13.5, cw - 1, 27);
      chip.fillStyle(EL.EMBER, 1).fillPoints([new Phaser.Math.Vector2(w - cw + 14, -5), new Phaser.Math.Vector2(w - cw + 19, 0), new Phaser.Math.Vector2(w - cw + 14, 5), new Phaser.Math.Vector2(w - cw + 9, 0)], true);
      t.setPosition(w - cw + 28, 0);
      col.add([chip, t]);
    }
    team.forEach((h, i) => {
      const def = content.classes[h.class];
      if (!def) return;
      const row = this.add.container(0, HEAD + i * PITCH);
      const fallen = isFallen(h);
      const pic = this.add.graphics();
      pic.fillStyle(0x120c08, 1).fillRect(0, 0, 72, 72);
      const frame = this.add.graphics();
      const drawF = (on: boolean) => {
        frame.clear();
        frame.lineStyle(1, on ? EL.ON_N : EL.GOLD, on ? 1 : 0.42).strokeRect(0.5, 0.5, 71, 71);
      };
      drawF(false);
      const face = classAvatar(this, def, 36, 36, 70);
      if (fallen) face.setAlpha(0.32);
      const tx = 86;
      const crownW = lead?.id === h.id ? 26 : 0;
      const name = fitW(elText(this, tx + crownW, 12, def.name, 21, fallen ? EL.DIM : EL.ON, { em: 0.05 }).setOrigin(0, 0.5), w - tx - crownW - 56);
      const lv = elText(this, w, 13, `Lv ${h.level}`, 14, EL.MUTED, { em: 0.08 }).setOrigin(1, 0.5);
      const bar = hpBar(this, tx, 31, w - tx, 6, h.hpRatio);
      const hpTxt = session.showHp && !fallen ? ` · ${Math.round(h.hpRatio * 100)}%` : '';
      const meta = fallen ? (s.valor !== undefined ? 'Fallen · revive: town, Rest camp, Valor' : 'Fallen · revive: town, Rest camp') : `${def.role ?? ''}${hpTxt}`;
      const role = fitW(elBody(this, tx, 55, meta, 16, fallen ? '#d88a7e' : EL.MUTED, false).setOrigin(0, 0.5), w - tx);
      row.add([pic, face, frame, name, lv, bar, role]);
      if (fallen) row.add(graveMark(this, 36, 38, 44));
      if (lead?.id === h.id) row.add(crown(this, tx + 10, 12, 0.6));
      // Harcanmamış puan: portrenin köşesinde küçük kor elması (hafif nabız)
      if (pts(h) > 0) {
        const dia = this.add.graphics();
        dia.fillStyle(EL.EMBER, 1).lineStyle(1, EL.EMBER2, 1);
        const d = [new Phaser.Math.Vector2(-1, -9), new Phaser.Math.Vector2(8, 0), new Phaser.Math.Vector2(-1, 9), new Phaser.Math.Vector2(-10, 0)];
        dia.fillPoints(d, true).strokePoints(d, true);
        dia.setPosition(2, 2);
        row.add(dia);
        if (!reducedMotion()) {
          const tw = this.tweens.add({ targets: dia, alpha: { from: 0.55, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          row.once('destroy', () => tw.stop());
        }
      }
      const zone = this.add.zone(w / 2, 36, w + 8, PITCH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        drawF(true);
        this.tweens.add({ targets: row, x: 6, duration: 180, ease: EL.EASE });
      });
      zone.on('pointerout', () => {
        drawF(false);
        this.tweens.add({ targets: row, x: 0, duration: 180, ease: EL.EASE });
      });
      // puanı olan kahraman: dokununca Gear o kahramanın Sheet sekmesinde açılır (puan harcama)
      zone.on('pointerup', () => !this.drag.moved && this.openHero(h.id, undefined, pts(h) > 0 ? 'char' : undefined));
      row.add(zone);
      col.add(row);
    });
    let yy = rowsEnd + 6;
    const rule = (at: number) => {
      const ln = this.add.graphics();
      ln.lineStyle(1, EL.GOLD, MUTE_LINE).lineBetween(0, at, w, at);
      col.add(ln);
    };
    // Bulunulan düğüm
    if (showHere) {
      const n = node(this.map, s.at);
      rule(yy);
      const cy = yy + 14;
      const tile = this.add.graphics();
      tile.fillStyle(0x120c08, 1).fillRect(0, cy, 48, 48).lineStyle(1, EL.GOLD, 0.42).strokeRect(0.5, cy + 0.5, 47, 47);
      col.add(tile);
      const tileArt = nodeGlyphImage(this, n.type, 24, cy + 24, 34);
      if (tileArt) col.add(tileArt);
      else drawNodeGlyph(tile, n.type, EL.ON_N, 0.8, 24, cy + 24);
      col.add(elText(this, 62, cy + 8, 'You are here', 14, 'rgba(217,178,106,0.85)', { em: 0.22 }).setOrigin(0, 0.5));
      col.add(fitW(elText(this, 62, cy + 32, n.name, 20, EL.ON, { em: 0.05 }).setOrigin(0, 0.5), w - 62));
      // Duraklatılmış savaş (Retreat to Map): düğüme dokununca aynı turdan sürer
      if (paused) col.add(fitW(elBody(this, 62, cy + 58, `Battle paused · turn ${paused.turn + 1}`, 15, EL.BAD).setOrigin(0, 0.5), w - 62));
      yy += hereH + 6;
    }
    // Bölge / ilerleme / mod / altın (eskiden sol altta haritanın üstündeydi)
    rule(yy);
    const region = this.map.regions.find((r) => r.id === node(this.map, s.at).region);
    col.add(fitW(elText(this, 0, yy + 26, region ? region.title : this.map.title, 18, EL.ON, { em: 0.06 }).setOrigin(0, 0.5), w));
    const prog = clearedProgress(s);
    const pb = this.add.graphics();
    pb.fillStyle(EL.INK, 0.85).fillRect(0, yy + 44, w, 5).lineStyle(1, EL.GOLD, 0.28).strokeRect(0.5, yy + 44.5, w - 1, 4);
    pb.fillStyle(0xe8c47e, 1).fillRect(1, yy + 45, Math.max(2, (w - 2) * (prog.total ? prog.cleared / prog.total : 0)), 3);
    col.add(pb);
    col.add(elBody(this, 0, yy + 70, `Cleared ${prog.cleared}/${prog.total}  ·  Chapter ${chapterOf(s.mapId).chapter}`, 17, EL.MUTED).setOrigin(0, 0.5));
    const diff = CONFIG.difficulties[s.difficulty]?.name ?? s.difficulty;
    const mode = elBody(this, 0, yy + 96, s.mode === 'ironman' ? 'Ironman' : 'Normal', 17, s.mode === 'ironman' ? EL.BAD : EL.MUTED).setOrigin(0, 0.5);
    const d = elBody(this, mode.width + 8, yy + 96, `·  ${diff}`, 17, EL.MUTED).setOrigin(0, 0.5);
    const g = elText(this, w, yy + 96, `${s.gold}`, 20, EL.ON, { em: 0.04 }).setOrigin(1, 0.5);
    col.add([mode, d, this.coin(w - g.width - 18, yy + 96, 26), g]);
  }

  /** Harita girdisi meşgul mü (yürüyüş, pencere, menü, kasaba, ayarlar). */
  private inputBusy(): boolean {
    return !!this.walking || !!this.modal || this.menuOpen || !!this.town || !!this.slotBrowser || isSettingsOpen();
  }

  /** Zorunlu Formation kapısı açık mı (tutorial, Ravenwood; ayar kapalıysa yok). */
  private formationDue(): boolean {
    return formationGate(this.s, tutorialsOn());
  }

  /** Kapı açıkken savaşa dokunuldu: kısa not + ipucu kartı yeniden + Formation parıltısı bir kez güçlü çakar. */
  private nudgeFormation(): void {
    this.toast('Open Formation first.');
    this.arrangeNotice = this.s.at;
    this.showTip();
    this.campHud?.pulse('formation');
  }

  /** Kısa / dar ekran (telefon yatay): dokunma hedefleri büyür, kart DOM simgelerinin altına iner. */
  private compact(): boolean {
    const c = document.documentElement.classList;
    return c.contains('compact') || c.contains('short');
  }

  private coin(x: number, y: number, size = 26): Phaser.GameObjects.GameObject {
    if (hasUiImage('gold')) return this.add.image(x + 2, y, ensureIcon(this, uiIconName('gold'), '#e8c47e', false)).setDisplaySize(size, size);
    const g = this.add.graphics();
    g.fillStyle(0x3a2a10, 1).fillCircle(x, y, 8);
    g.fillStyle(0xc8902e, 1).fillCircle(x, y, 7);
    g.fillStyle(0xffe9a8, 0.9).fillCircle(x - 2, y - 2, 3);
    return g;
  }

  /** Düğüm bilgi satırları (hover kartı ve savaş onayı ortak): tür · durum, düşmanlar, sonraki duraklar. */
  private nodeFacts(id: string): { kind: string; state: string; foes: string; leader: string; then: string; next: Array<{ name: string; type: NodeType }>; blurb: string; faces: string[] } {
    const s = this.s;
    const n = node(this.map, id);
    const vis = nodeVisibility(this.map, s, session.revealFog)[id];
    const option = this.moves().includes(id) || this.travelTargets().has(id);
    const patrol = vis === 'cleared' && patrolAvailable(s, id);
    const state = id === s.at ? 'You are here' : patrol ? 'Patrol' : vis === 'cleared' ? 'Cleared' : option ? 'Reachable' : vis === 'goal' ? 'Your goal' : 'Ahead';
    const kind = n.subtitle || TYPE_LABEL[n.type];
    let foes = '';
    let leaderName = '';
    let faces: string[] = [];
    let blurb = '';
    if (n.encounter && vis !== 'goal') {
      const p = enemyPreview(n.encounter);
      leaderName = p.leader && !p.names.includes(p.leader) ? p.leader : '';
      foes = p.names.join(', ');
      faces = p.classes.filter((c) => !!content.classes[c]).slice(0, 6);
    } else if (vis !== 'goal')
      blurb = n.type === 'town' ? `Rest, recruit and trade. ${townRestCount(s, id) === 0 ? 'Your first arrival is a free rest: the living recover.' : `Your free rest here is spent: resting again costs ${townRestPrice(s, id)} gold.`}` : n.type === 'treasure' ? 'A cache of gear and gold.' : n.type === 'event' ? 'A crossroads encounter.' : n.type === 'rest' ? 'Make camp for free and recover. Resting heals the living only.' : n.type === 'merchant' ? 'Odo the Peddler sells gear and buys yours.' : '';
    const after = vis === 'goal' ? [] : outgoing(this.map, id).map((a) => node(this.map, a));
    const then = after.map((a) => `${a.name} (${TYPE_LABEL[a.type]})`).join(' or ');
    // Devriye: temizlenmiş savaş düğümüne dönülünce aynı düşmanlar, ödül azalan getiriyle (sıradaki oynanışın yüzdesi)
    if (patrol) blurb = `Patrols return here. Rewards: ${Math.round(nextReplayMult(s, id) * 100)}% of the first victory, no Valor.`;
    return { kind, state, foes, leader: leaderName, then, next: after.map((a) => ({ name: a.name, type: a.type })), blurb, faces };
  }

  /**
   * Düğüm bilgi kartı (fare hover / dokunmatik uzun basış): ortak "A - Band" ipucu (src/game/band-tip.ts; Ömer 2026-10-18). Ad + tür · alt başlık,
   * durum çipi (Cleared...), düşman portre çipleri (Foes), sonraki duraklar (Then). İmlecin yanında.
   */
  private showNodeTip(id: string, p: Phaser.Input.Pointer): void {
    this.hideNodeTip();
    if (nodeVisibility(this.map, this.s, session.revealFog)[id] === 'fog') return;
    const n = node(this.map, id);
    const f = this.nodeFacts(id);
    const c = this.compact();
    const glyph = (type: NodeType) => (scene: Phaser.Scene, cx: number, cy: number, size: number): Phaser.GameObjects.GameObject[] => {
      const art = nodeGlyphImage(scene, type, cx, cy, Math.round(size * 0.84));
      if (art) return [art];
      const g = scene.add.graphics();
      drawNodeGlyph(g, type, EL.ON_N, 0.95, cx, cy);
      return [g];
    };
    const sections: PhSection[] = [];
    const vis = nodeVisibility(this.map, this.s, session.revealFog)[id];
    if (n.encounter && f.foes && vis !== 'goal') {
      sections.push({
        label: 'Foes',
        faces: foeGroups(n.encounter).groups.slice(0, 6).map((g) => {
          const def = content.classes[g.cls];
          return {
            label: g.name,
            count: g.n,
            build: (scene, cx, cy, size) => {
              const av = avatarTexture(scene, g.sprite);
              if (av) return [scene.add.image(cx, cy, av).setDisplaySize(size, size).setFlipX(true)];
              return def ? [classAvatar(scene, def, cx, cy, size, true)] : [];
            },
            ...(g.tier ? { chip: { text: g.tier === 'boss' ? 'Boss' : 'Elite', tone: 'warn' as const } } : {}),
          };
        }),
      });
    }
    if (f.next.length) {
      sections.push({
        label: 'Then',
        faces: f.next.map((a) => ({ label: a.name, build: glyph(a.type), chip: { text: TYPE_LABEL[a.type], ...(a.type === 'elite' || a.type === 'boss' ? { tone: 'warn' as const } : {}) } })),
      });
    }
    const lines: PhLine[] = [];
    if (f.blurb) lines.push({ text: f.blurb });
    if (f.leader) lines.push({ text: `Led by ${f.leader}` });
    const stateTone = f.state === 'Cleared' || f.state === 'Patrol' ? ('ok' as const) : undefined;
    const tip = bandTip(this, {
      accent: '#c9953f',
      kind: f.kind,
      title: n.name,
      round: true,
      medal: glyph(n.type),
      asideChip: { text: f.state, ...(stateTone ? { tone: stateTone } : {}) },
      lines,
      sections,
      width: c ? 760 : 580,
      scale: c ? 1.35 : 1,
    });
    tip.container.setDepth(1500);
    this.ui.add(tip.container);
    tip.container.setData('size', { w: tip.width, h: tip.height });
    this.nodeTip = tip.container;
    this.placeNodeTip(p);
  }

  /** Kartı imlecin sağ altına koyar; görünür alandan taşacaksa sola / yukarı döner. */
  private placeNodeTip(p: Phaser.Input.Pointer): void {
    const t = this.nodeTip;
    if (!t) return;
    const { w, h } = t.getData('size') as { w: number; h: number };
    const u = this.uiPoint(p);
    const off = this.compact() ? 60 : 26;
    let x = u.x + off;
    let y = u.y + off;
    if (x + w > stageView.right - 16) x = u.x - off - w;
    if (y + h > H - 16) y = u.y - off - h;
    t.setPosition(Math.round(Math.max(stageView.left + 16, x)), Math.round(Math.max(16, y)));
  }

  private hideNodeTip(): void {
    this.nodeTip?.destroy(true);
    this.nodeTip = null;
  }

  /** Sağ alt küme (Sakin etiket): − + yakınlaştırma ve ? (lejant). Dokunma alanı >= 44 gerçek px; üstüne gelince / uzun basınca kısa ipucu. */
  private renderControls(): void {
    const size = touchUnits(56);
    const gap = 8;
    const right = stageView.right - 36;
    const y = H - 36 - size / 2;
    const hint = (x: number, text: string) => {
      const t = elBody(this, 0, 0, text, 17, EL.ON).setOrigin(0.5, 0.5);
      const w = t.width + 22;
      const bg = this.add.graphics();
      bg.fillStyle(0x0d0906, 0.92).fillRect(-w / 2, -16, w, 32).lineStyle(1, 0xd9b26a, 0.4).strokeRect(-w / 2 + 0.5, -15.5, w - 1, 31);
      const c = this.add.container(Math.min(x, right - w / 2), y - size / 2 - 26, [bg, t]).setVisible(false);
      this.hud.add(c);
      return c;
    };
    const mk = (label: string, x: number, tip: string, run: () => void, extra?: (on: boolean) => void) => {
      const h = hint(x, tip);
      const b = elIconButton(this, { label }, () => !this.modal && !this.menuOpen && run(), {
        size,
        onHover: (on) => {
          h.setVisible(on);
          extra?.(on);
        },
      });
      b.root.setPosition(x, y);
      this.hud.add(b.root);
      return b.root;
    };
    const step = size + gap;
    this.panBtns.minus = mk('−', right - 2 * step - size / 2, 'Zoom out', () => this.setMapZoom(this.mapZoom - MAP_ZOOM.step));
    this.panBtns.plus = mk('+', right - step - size / 2, 'Zoom in', () => this.setMapZoom(this.mapZoom + MAP_ZOOM.step));
    const legend = this.renderLegend(right, y - size / 2 - 12);
    mk(
      '?',
      right - size / 2,
      'Legend',
      () => {
        this.legendOpen = !this.legendOpen;
        legend.setVisible(this.legendOpen);
      },
      (on) => legend.setVisible(on || this.legendOpen),
    );
    this.updatePanButtons();
  }

  /** Mevcut düğümde dokunarak açılacak bir eylem var mı (savaş, kasaba, olay, hazine, sefer sonu). */
  private actionHere(): boolean {
    const k = nextStep(this.s).kind;
    return k === 'battle' || k === 'complete' || CONFIRM_STEPS.includes(k);
  }

  /** Sağ alttaki lejant kutusu (gizli; ? düğmesi üstüne gelince / basınca açılır): düğüm türleri + döngü simgesi (Patrol) + kafatası (yenilen koruma). */
  private renderLegend(right: number, bottom: number): Phaser.GameObjects.Container {
    const w = 300;
    const types: NodeType[] = ['battle', 'elite', 'boss', 'town', 'treasure', 'event', 'rest', 'merchant'];
    const rows = Math.ceil(types.length / 2) + 2;
    const h = 64 + rows * 32 + 6;
    const ps = this.compact() ? 1.6 : 1;
    const root = this.add.container(right, bottom).setScale(ps).setVisible(this.legendOpen);
    root.add(elPanel(this, -w, -h, w, h, { alpha: 0.92 }));
    root.add(elText(this, -w + 18, -h + 24, 'Legend', 14, 'rgba(217,178,106,0.85)', { em: 0.24 }).setOrigin(0, 0.5));
    types.forEach((t, i) => {
      const cx = -w + 32 + (i % 2) * 140;
      const cy = -h + 64 + Math.floor(i / 2) * 32;
      const g = this.add.graphics();
      g.fillStyle(0x140e09, 1).fillCircle(cx, cy, 12).lineStyle(1, EL.GOLD, 0.7).strokeCircle(cx, cy, 12);
      root.add(g);
      const legendArt = nodeGlyphImage(this, t, cx, cy, 26);
      if (legendArt) root.add(legendArt);
      else drawNodeGlyph(g, t, 0xd9c8a2, 0.5, cx, cy);
      root.add(elBody(this, cx + 20, cy, TYPE_LABEL[t], 17, EL.TXT, false).setOrigin(0, 0.5));
    });
    const py = -h + 64 + Math.ceil(types.length / 2) * 32;
    const loop = this.add.graphics();
    drawLoopIcon(loop, -w + 32, py);
    root.add(loop);
    root.add(fitW(elBody(this, -w + 52, py, `Patrol ${Math.round(replayMult(1) * 100)}%: cleared, fight again`, 17, EL.TXT, false).setOrigin(0, 0.5), w - 70));
    const sy = py + 32;
    const sk = this.add.graphics();
    sk.fillStyle(0x1a0c08, 1).fillCircle(-w + 32, sy, 11.5).lineStyle(1.6, 0xb8402f, 0.9).strokeCircle(-w + 32, sy, 11.5);
    root.add([sk, this.add.image(-w + 32, sy, ensureIcon(this, 'skull', '#e9a58f', false)).setDisplaySize(15, 15)]);
    root.add(fitW(elBody(this, -w + 52, sy, 'Guards defeated', 17, EL.TXT, false).setOrigin(0, 0.5), w - 70));
    this.hud.add(root);
    return root;
  }

  private toast(text: string): void {
    this.toastFn?.(text);
  }

  // ------------------------------------------------------------ global Gear + Formation ikonları (Ömer 2026-10-18)

  /** Sol alttaki DOM ikonları (harita, kasaba, tüccar ekranında aynı yer); sahne kapanınca kalkar. */
  private mountCampHud(): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    const hud = mountCampHud(root, {
      gear: () => {
        if (this.canOpenSide()) this.openGear();
      },
      formation: () => this.openFormationFromHud(),
    });
    this.campHud = hud;
    this.time.addEvent({ delay: 200, loop: true, callback: () => this.syncCampHud() });
    this.events.once('shutdown', () => {
      hud.destroy();
      if (this.campHud === hud) this.campHud = null;
    });
    this.syncCampHud();
  }

  /**
   * İkonların görünürlüğü ve parlaması. Gizli: takım yokken ya da bir pencere / menü / Gear açıkken. Gear parlar: harcanmamış stat puanı olan
   * kahraman var (Level Up şeridinin yönlendirmesi; puan harcanana dek). Formation parlar: "Formation'ı düzenle" ipucu açık ya da zorunlu
   * Formation kapısı (ipucu kapanınca / Formation açılınca söner; başka ipuçlarında parlamaz).
   */
  private syncCampHud(): void {
    const hud = this.campHud;
    if (!hud || !current()) return;
    const busy = !!this.modal || this.menuOpen || !!this.slotBrowser || isSettingsOpen() || !!this.walking || !!document.querySelector('#ui-root .gr-overlay');
    hud.setHidden(!activeHeroes(this.s).length || busy);
    // Gear parlaması: puanı olan ve Gear'a henüz bakılmamış level atlama (Gear açılınca söner; yeni level atlama yeniden kurar). Kahraman yer imi + sol liste işareti puan harcanana dek sürer.
    hud.setGlow('gear', this.s.roster.some((h) => (h.statPoints ?? 0) > 0 && h.level > (this.gearSeen.get(h.id) ?? 0)));
    hud.setGlow('formation', (!!this.tip && this.tipIsArrange) || this.formationDue());
  }

  // ------------------------------------------------------------ akış

  private refresh(animateFog = true): void {
    this.renderMap(animateFog);
    this.renderHud();
    this.syncValor();
  }

  // ------------------------------------------------------------ Valor (Ömer 2026-10-13)

  private valorMeter: ValorMeter | null = null;

  /**
   * Valor mangalları sol üst bantta (her ekranda aynı yer; Valdren Keep'ten sonra). Haritaya dönüşte (zafer sonrası) artış varsa korlar tek tek tutuşur.
   * Dokununca savaş dışı diriltme penceresi.
   */
  private syncValor(): void {
    const v = this.s.valor;
    if (v === undefined) {
      this.valorMeter?.destroy();
      this.valorMeter = null;
      return;
    }
    if (!this.valorMeter) {
      const root = document.getElementById('ui-root');
      if (!root) return;
      const m = new ValorMeter({ label: true, where: 'map', selfTip: true, onClick: () => this.openValor() });
      m.el.classList.add('vl-corner'); // her ekranda aynı yer: sol üst bant (valor.css > .vl-corner)
      root.append(m.el);
      this.valorMeter = m;
      this.events.once('shutdown', () => {
        m.destroy();
        if (this.valorMeter === m) this.valorMeter = null;
      });
      const prev = rememberShown('valor', v);
      if (prev !== undefined && prev < v) {
        m.set(prev);
        m.set(v, true); // zafer sonrası kazanç: korlar tek tek tutuşur
        return;
      }
    }
    rememberShown('valor', v);
    this.valorMeter.set(v);
  }

  /** Savaş dışı Valor diriltmesi penceresi (DOM, kit Diyalog): düşmüş kahramanlar, "Revive · 4". */
  openValor(): void {
    if (this.s.valor === undefined) return;
    openValorRevive({
      where: 'map',
      valor: () => this.s.valor ?? 0,
      fallen: () =>
        this.s.roster
          .filter((h) => isFallen(h))
          .map((h) => ({ id: h.id, name: content.classes[h.class]?.name ?? h.class, sub: this.s.active.includes(h.id) ? 'Fallen · in your party' : 'Fallen', ...(avatarUrl(h.class) ? { portraitUrl: avatarUrl(h.class)! } : {}) })),
      revive: (id) => {
        const why = valorReviveBlocked(this.s, id);
        if (why) return why;
        this.update2(reviveWithValor(this.s, id));
        rememberShown('valor', this.s.valor ?? 0);
        return null;
      },
      onClose: () => this.refresh(false),
    });
  }

  private closeModal(): void {
    this.modal?.close();
    this.modal = null;
    this.sideOpen = false;
    this.formationOpen = false;
  }

  /**
   * Bu ekranın görülmemiş mentor dersi (src/tutorial/lessons.ts; ayar kapalıysa hiçbiri). Bir kararda en çok BİR yeni ders (Ömer 2026-10-14):
   * aynı anda birden çok ders hazırsa veri sırasıyla ilki, kalanlar ekran yeniden açılınca. Metindeki sayılar zorluğun geçerli kuralından.
   */
  private lessons(screen: LessonScreen): void {
    const s = this.s;
    const vis = screen === 'map' ? nodeVisibility(this.map, s, session.revealFog) : {};
    const visibleTypes = Object.entries(vis)
      .filter(([, v]) => v === 'near' || v === 'far' || v === 'current')
      .map(([id]) => node(this.map, id).type);
    const items = [...s.inventory, ...s.roster.flatMap((h) => Object.values(h.equipment).filter((x): x is NonNullable<typeof x> => !!x))];
    const due = dueScreenLessons(
      screen,
      { node: s.at, path: s.path, partySize: activeHeroes(s).length, wins: s.stats.victories, visibleTypes, rarities: [...new Set(items.map((i) => instanceRarity(i)))], bagSize: s.inventory.length },
      seenLessons(),
    )[0];
    if (due) showLesson(due.id, { vars: { victoryHeal: Math.round(rulesFor(s).victoryHeal * 100), restHeal: Math.round(restHealOf(s) * 100) } });
  }

  private update2(s: CampaignState): void {
    setState(s);
  }

  /** Gear ekranını açar (kahraman paneli / takım sütunu / kasaba / Spoils / teslim kartından). Kapanınca HUD yenilenir, `after` çağrılır. */
  openGear(hero?: string, tutorial = false, after?: () => void, view?: 'char' | 'inv'): void {
    const root = document.getElementById('ui-root');
    if (!root || this.pausedBlocks()) return;
    if (legendaryPreviewWanted()) setState(grantAllLegendaries(this.s)); // ?legendary=1 önizlemesi (madde 296)
    for (const h of this.s.roster) this.gearSeen.set(h.id, h.level); // Gear'ın parlaması söner
    this.syncCampHud();
    openGearScreen(root, {
      get: () => this.s,
      set: (s) => setState(s),
      ...(hero ? { hero } : {}),
      ...(view ? { view } : {}),
      tutorial,
      onClose: () => {
        dismissLesson('gear'); // Gear dersleri Gear ekranıyla kapanır (haritada kalıp Farewell'in Continue düğmesini örtüyordu)
        dismissLesson('item_quality');
        this.renderHud();
        after?.();
      },
    });
    this.lessons('gear'); // ilk loot (torbada item: sürükle / karşılaştır / Equip best), sonra Item Quality (Uncommon ya da üstü)
  }

  /**
   * Bekleyen ekranlar: önce LOOT ekranı (zafer / sandık / hediye ganimeti; Ömer 2026-10-18: eski "Spoils" kartı ve "Level Up" kartı kalktı),
   * sonra Ashford teslimi (yeni bölük kurulduktan sonra; item takma tutorial'ı). Level atlama yalnızca kısa şerit gösterir (bloklamaz).
   * Bir ekran açıldıysa true: kapanınca advance yeniden çağrılır. Savaş zaferinde ganimet ekranı savaş sahnesinde açılır (campaign-session.ts);
   * buraya yalnızca sandık / hediye ya da yarım kalan (kayıttan yüklenen) ganimet gelir.
   */
  private showPendingCards(): boolean {
    const root = document.getElementById('ui-root');
    if (!root) return false;
    const s = this.s;
    if (s.pendingLoot) {
      // Debug (Open Loot screen with XP): uydurma XP satırları, yalnızca gösterim
      let dbgXp: LootXp[] | undefined;
      if (sessionStorage.getItem('proto.debugLootXp')) {
        sessionStorage.removeItem('proto.debugLootXp');
        dbgXp = sampleLootXp(activeHeroes(s).map((x) => ({ id: x.id, class: x.class, level: x.level, xp: x.xp, fallen: isFallen(x) })), (c) => content.classes[c]?.name ?? c);
      }
      const h = openLootScreen(root, {
        ...(dbgXp ? { xp: dbgXp } : {}),
        get: () => this.s,
        set: (x) => setState(x),
        gear: campaignGearSource(() => this.s, (x) => setState(x)),
        onDone: () => {
          this.renderHud();
          this.advance();
        },
      });
      this.events.once('shutdown', () => h.abort()); // sahne kapanırsa ganimet kayıtta bekler
      return true;
    }
    // Level atlama (Ömer 2026-10-18): açılır pencere yok; kısa şerit + Gear düğmesi / kahraman yer imi parlar (puan harcanana dek)
    if (s.levelUps?.length) {
      const ups = s.levelUps;
      showLevelBanner(
        root,
        ups.map((u) => {
          const hero = s.roster.find((h) => h.id === u.heroId);
          return {
            name: content.classes[hero?.class ?? '']?.name ?? 'A hero',
            to: u.to,
            gained: u.to - u.from,
            points: statPointsBetween(u.from, u.to),
            healed: !!hero && !isFallen(hero),
          };
        }),
      );
      setState(acknowledgeLevelUps(this.s));
    }
    if (s.pendingHandover && !FORCED.includes(nextStep(s).kind)) {
      showHandover(root, s, {
        equip: () => {
          setState(acknowledgeHandover(this.s));
          this.openGear(undefined, true, () => this.advance());
        },
        later: () => {
          setState(acknowledgeHandover(this.s));
          this.advance();
        },
      });
      return true;
    }
    return false;
  }

  /** Sıradaki adıma göre ekranı kurar (pencere ya da sağdaki düğüm kartı). */
  advance(): void {
    this.closeModal();
    this.syncTown();
    if (this.showPendingCards()) return;
    const s = this.s;
    const step = nextStep(s);
    // İpucu kartı yalnızca pencere açılmayan adımlarda (savaş / yol seçimi); diğerlerinde pencere kapanınca gelir
    if (step.kind === 'battle' || step.kind === 'move') this.showTip();
    if (step.kind === 'move') this.lessons('map'); // Formation / yollar dersleri (Ashford'dan sonra)
    else {
      this.tip?.destroy(true);
      this.tip = null;
    }
    switch (step.kind) {
      case 'hero':
        return this.pickHeroModal();
      case 'recruit':
      case 'volunteer':
        return this.recruitModal(step);
      case 'farewell':
        this.modal = openModal(this, this.ui, {
          title: 'Farewell',
          text: CONFIG.texts.farewell,
          height: 520,
          buttons: [
            {
              label: 'Continue',
              primary: true,
              run: () => {
                session.tutorialClasses = this.s.roster.filter((h) => h.tutorial).map((h) => h.class);
                this.commit(farewell(this.s));
              },
            },
          ],
        });
        this.addFarewellFaces();
        return;
      case 'company':
        this.companyModal(step.size);
        this.lessons('company');
        return;
      case 'town': {
        // Kasaba ekranı (Ömer 2026-10-12): syncTown tam ekran kasabayı kurdu; eylemler resimdeki yerlerden (onTownHotspot). Verisi olmayan
        // kasaba (scene yok) için yedek pencere: Gear / Trade / Leave (ücretsiz şifa varışta).
        this.lessons('town');
        if (this.town) return this.renderHud();
        const tn = node(this.map, step.node);
        this.modal = openModal(this, this.ui, {
          title: tn.name,
          subtitle: tn.subtitle,
          text: CONFIG.texts.townRest,
          height: 460,
          buttons: [
            { label: 'Gear', run: () => this.openGear() },
            ...(tn.merchant ? [{ label: 'Trade', run: () => this.openTownMerchant(tn) }] : []),
            { label: 'Leave', primary: true, run: () => this.commit(completeSimple(this.s, 'town')) },
          ],
        });
        return;
      }
      case 'story':
        return this.storyScene(step.story, step.node);
      case 'rest':
        return this.restModal(step.node);
      case 'merchant': {
        // Odo (Ömer 2026-10-11): tezgâh kurulur, ortak tüccar ekranı açılır (TEK giriş noktası: src/game/campaign-merchant.ts)
        const root = document.getElementById('ui-root');
        if (!root) return;
        setState(openCampaignShop(this.s));
        const closeShop = openCampaignMerchant(root, () => this.s, (x) => setState(x), { onLeave: () => this.commit(leaveMerchant(this.s)) });
        this.lessons('merchant');
        this.events.once('shutdown', closeShop); // sahne kapanırsa (Menu > Main menu) DOM tüccar ekranı da kapanır
        return;
      }
      case 'event': {
        const e = EVENTS[step.event] ?? { title: node(this.map, step.node).name, text: 'Nothing happens.' };
        const choices = eventChoices(step.event);
        if (choices.length) {
          this.directAt = null;
          return this.choiceEvent(step.event, step.node, choices);
        }
        if (this.directAt === step.node) {
          this.directAt = null;
          return this.commit(completeSimple(this.s, 'event'));
        }
        this.worldWindow(step.node, {
          title: e.title,
          art: windowArt(`event:${node(this.map, step.node).event ?? ''}`),
          paras: paragraphs(e.text),
          acts: [{ label: 'Continue', primary: true, run: () => this.commit(completeSimple(this.s, 'event')) }],
        });
        return;
      }
      case 'treasure': {
        if (this.directAt === step.node) {
          this.directAt = null;
          return this.commit(completeSimple(this.s, 'treasure')); // sandık: ganimet torbaya, LOOT ekranı advance'ta açılır
        }
        const t = TREASURES[step.treasure] ?? { title: 'Treasure', text: 'You find a chest.', reward: 'Open the chest to claim its gear and gold.' };
        // Hazine penceresi (Ömer 2026-10-19, taslak map-events A): "... defeated" çipi yok; temizlenen korumalı düğümün damgası haritada
        this.worldWindow(step.node, {
          title: t.title,
          art: windowArt(`treasure:${node(this.map, step.node).treasure ?? ''}`),
          paras: paragraphs(t.text),
          chipsCap: 'Inside',
          chips: [
            { tone: 'gain', icon: 'gear', text: 'Gear' },
            { tone: 'gain', icon: 'gold', text: 'Gold' },
          ],
          acts: [{ label: 'Open the chest', primary: true, run: () => this.commit(completeSimple(this.s, 'treasure')) }],
        });
        return;
      }
      case 'complete':
        this.modal = openModal(this, this.ui, {
          title: 'Valdoria Conquered',
          subtitle: 'Campaign Complete',
          text: `${CONFIG.texts.complete}\n\n${s.stats.victories} victories, ${s.stats.defeats} defeats.`,
          height: 520,
          buttons: [
            { label: 'Stay on the map', run: () => this.closeModal() },
            { label: 'Main Menu', primary: true, run: () => elGo(this, MENU_SCENE) },
          ],
        });
        return;
      default:
        // battle / move: sol alttaki düğüm bilgisi (ipucu satırı) ve nabız atan düğüm
        this.renderHud();
        if (step.kind === 'battle' && this.pendingFight?.node === s.at) this.startPendingFight();
        // Katılımdan sonra bekleyen savaş (Ravenwood): "Formation'ı düzenle, sonra savaşa dokun" kartı (yukarıdaki dal kartı kaldırır)
        // Zorunlu Formation kapısı kayıtta (yeniden yüklemede de kart gelir)
        if (step.kind === 'battle' && this.formationDue()) this.arrangeNotice = s.at;
        if (step.kind === 'battle' && this.arrangeNotice === s.at) this.showTip();
        return;
    }
  }

  /**
   * Kasaba ekranını adıma göre kurar / kaldırır (src/campaign/town.ts > townScreenNode): kasaba düğümünde veda, yeni bölük, hikâye sahnesi ve
   * kasaba adımı boyunca açık; ilk giriş akışı (pencereler) onun üstünde oynar. Açıkken harita kamerası ve takım sütunu gizlenir.
   */
  private syncTown(): void {
    const want = townScreenNode(this.s);
    if (this.town && this.town.nodeId !== want) {
      this.town.destroy();
      this.town = null;
    }
    if (want && !this.town) {
      // Arayüz katmanında takım sütununun hemen üstü: bildirim (toast), ipucu ve pencereler kasabanın üstünde kalır
      this.town = new TownScreen(this, this.ui, node(this.map, want), {
        state: () => this.s,
        busy: () => !!this.modal || this.menuOpen || !!this.slotBrowser || !!this.walking || isSettingsOpen() || !!document.querySelector('#ui-root .gr-overlay'),
        hotspot: (h) => this.onTownHotspot(h),
        hero: (id) => this.openGear(id, false, () => this.town?.render()),
        compact: () => this.compact(),
      }, this.ui.getIndex(this.hud) + 1);
    } else this.town?.render();
    this.cameras.main.setVisible(!this.town);
    this.hud.setVisible(!this.town);
    sceneMusic(this.town ? 'town' : 'map'); // kasaba ekranı: sıcak kasaba müziği; haritaya dönünce yolculuk müziği (yumuşak geçiş)
  }

  /** Kasaba ekranında bir yere dokunuldu (valdoria.json > scene.hotspots[].action). */
  private onTownHotspot(h: TownHotspot): void {
    if (nextStep(this.s).kind !== 'town') return;
    const tn = node(this.map, this.s.at);
    // kasaba yerinin sesi: binaya girerken meşe kapı, ocak başında ateş (çıkışta yürüyüş adımları kendiliğinden)
    if (h.action === 'rest') worldSound('hearth');
    else if (h.action !== 'leave') worldSound('door');
    switch (h.action) {
      case 'trade':
        if (tn.merchant) this.openTownMerchant(tn);
        return;
      case 'recruit': {
        const offer = townRecruitOffer(this.s);
        if (offer.length) return this.townRecruitModal(h, offer);
        return this.townNote(h, h.note ?? 'No one here seeks to join you.');
      }
      case 'story':
        if (tn.story) this.storyScene(tn.story, tn.id, true);
        return;
      case 'rest':
        return this.townNote(h, CONFIG.texts.townRested ?? CONFIG.texts.townRest ?? '');
      case 'leave':
        return this.commit(completeSimple(this.s, 'town'));
    }
  }

  /**
   * Harita penceresi (Ömer 2026-10-19, taslak map-events; src/ui/map-window.ts): DOM, A levha ya da C düğüm yanı kartı. Sahne girdisi açıkken
   * kilitli (`this.modal` yer tutucusu; Esc / başka pencereler `this.modal.close()` ile kapatır). Oyun kuralı değişmez: eylemleri çağıran verir.
   */
  private mapWindow(o: MwSpec): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    let h: MwHandle | null = null;
    const close = (): void => {
      h?.close();
      h = null;
      this.modal = null;
    };
    h = openMapWindow(root, o);
    const handle = h;
    if (o.variant === 'C') onStageResize(this, () => handle.place());
    this.events.once('shutdown', close); // sahne kapanırsa (Menu > Main menu) DOM pencere de kapanır
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
  }

  /** Düğümün pencere üst bilgisi: tür / yer çipi + bölge adı. */
  private winMeta(nodeId: string, title?: string): { kind: string; place?: string; region?: string } {
    const n = node(this.map, nodeId);
    const t = nodeTags(n.subtitle, TYPE_LABEL[n.type]);
    const region = this.map.regions.find((r) => r.id === n.region)?.title;
    return { kind: t.kind, ...(t.place && t.place !== title ? { place: t.place } : {}), ...(region ? { region } : {}) };
  }

  /** Düğüme ait A levha (olay, hazine, dinlenme, aday): üst bilgi düğümden gelir. */
  private worldWindow(nodeId: string, o: Omit<MwSpec, 'variant' | 'type' | 'kind' | 'region'> & { type?: string; kind?: string }): void {
    const { type, kind, ...rest } = o;
    const meta = this.winMeta(nodeId, o.title);
    this.mapWindow({ variant: 'A', type: type ?? node(this.map, nodeId).type, ...meta, ...(kind ? { kind } : {}), ...rest });
  }

  /** Sınıftan kahraman / aday kartı verisi (blurb, rol, ana stat: data/classes). */
  private mwCard(id: string, tag?: string): MwCard {
    const d = content.classes[id]!;
    return { id, classId: id, spriteId: d.spriteId, name: d.name, color: d.color, ...(d.role ? { role: d.role } : {}), ...(d.primary ? { stat: d.primary } : {}), ...(d.blurb ? { blurb: d.blurb } : {}), ...(tag ? { tag } : {}) };
  }

  /** Kasaba yerinin (hotspot) CSS piksel konumu + yarım genişliği: C kartı yanına açılır. */
  private townAnchor(h: TownHotspot): MwSpec['anchor'] {
    return () => {
      const c = this.town?.hotspotCenter(h.id);
      const root = document.getElementById('ui-root');
      if (!c || !root) return null;
      const cv = this.game.canvas;
      const stage = root.parentElement;
      let left = 0;
      let top = 0;
      for (let e: HTMLElement | null = cv; e && e !== stage; e = e.offsetParent as HTMLElement | null) {
        left += e.offsetLeft;
        top += e.offsetTop;
      }
      const p = worldToStageCss({ x: c.x, y: c.y }, this.uiCam, { left, top, cssW: cv.offsetWidth, cssH: cv.offsetHeight, pxW: cv.width, pxH: cv.height });
      if (!p) return null;
      return { ...p, hw: (c.hw * this.uiCam.zoom * cv.offsetWidth) / (cv.width || 1) };
    };
  }

  /** C kartı: kasaba ekranındaki yerin yanında küçük pencere (ateş, ilan panosu, kışla). Close, X, Esc ve zemine dokunma kapatır. */
  private townWindow(h: TownHotspot, o: Pick<MwSpec, 'paras' | 'body' | 'acts'>): void {
    const n = node(this.map, this.s.at);
    const bg = n.scene?.background ?? '';
    const kind = nodeTags(n.subtitle, 'Town').kind;
    const region = this.map.regions.find((r) => r.id === n.region)?.title;
    this.mapWindow({
      variant: 'C',
      type: 'town',
      kind,
      place: n.name,
      ...(region ? { region } : {}),
      title: h.label,
      art: windowArt(`hotspot:${h.id}`, `town:${bg}`),
      paras: o.paras,
      ...(o.body ? { body: o.body } : {}),
      acts: o.acts,
      onDismiss: () => this.closeModal(),
      anchor: this.townAnchor(h),
    });
  }

  /** Kasaba ekranında kısa not (ateş, adayı olmayan ilan panosu): C kartı. */
  private townNote(h: TownHotspot, text: string): void {
    this.townWindow(h, { paras: paragraphs(text), acts: [{ label: 'Close', primary: true, run: () => this.closeModal() }] });
  }

  /**
   * Kışla / ilan panosundan aday (Ömer 2026-10-12): ayrılırken gelecek gönüllü kasabadayken seçilebilir (zorunlu değil: Not now, Esc, zemin).
   * Seçilmezse kasabadan ayrılırken eskisi gibi sorulur. Görünüm: C kartı + kahraman kartları (büst + blurb).
   */
  private townRecruitModal(h: TownHotspot, offer: string[]): void {
    this.townWindow(h, {
      paras: paragraphs(CONFIG.texts.townRecruit ?? CONFIG.texts.volunteer ?? ''),
      body: { k: 'cards', cards: offer.map((id) => this.mwCard(id)) },
      acts: [
        { label: 'Not now', run: () => this.closeModal() },
        {
          label: 'Join us',
          primary: true,
          needPick: 'Pick one companion first.',
          run: (chosen) => {
            if (!chosen) return this.toast('Pick one companion first.');
            setState(recruitInTown(this.s, chosen));
            this.closeModal();
            this.town?.render();
            this.renderHud();
            this.toast(`${content.classes[chosen]?.name ?? chosen} joins your company`);
          },
        },
      ],
    });
  }

  /**
   * Dinlenme noktası (Ömer 2026-10-11): ücretsiz dinlenme (yaşayanlar maks canın %50'si); düşmüş kahramanı yalnızca Valor kaldırır.
   * A levha (taslak map-events): sahne şeridi, çipler, düşmüş kahramanlar, Gear solda / Rest sağda.
   */
  private restModal(nodeId: string, revisit = false): void {
    const s = this.s;
    const n = node(this.map, nodeId);
    const fallen = s.roster.filter((h) => isFallen(h) && !h.tutorial);
    const heal = Math.round(restHealOf(s) * 100);
    // Yeniden giriş: dinlenme bir kez (ikinci kez iyileştirmez); Gear açık, Leave pencereyi kapatır. Dinlenme DİRİLTMEZ (TUR 1 madde 10): yalnızca Valor
    const paras = [revisit ? 'Your company has already rested here.' : 'Your company makes camp. Resting is free.'];
    if (fallen.length) paras.push('Resting does not raise the fallen: only Valor can.');
    this.worldWindow(nodeId, {
      title: n.name,
      art: windowArt('rest'),
      paras,
      ...(revisit ? {} : { chipsCap: 'Rest', chips: [{ tone: 'heal' as const, icon: 'rest' as const, text: `Every living hero recovers ${heal}% max HP` }, { tone: 'info' as const, icon: 'gold' as const, text: 'Free' }] }),
      ...(fallen.length ? { body: { k: 'fallen' as const, rows: fallen.map((h) => ({ classId: h.class, spriteId: content.classes[h.class]?.spriteId ?? h.class, name: content.classes[h.class]?.name ?? h.class, note: 'Fallen. Only Valor can raise them.' })) } } : {}),
      acts: [
        { label: 'Gear', run: () => this.openGear() },
        revisit ? { label: 'Leave', primary: true, run: () => this.closeModal() } : { label: 'Rest', primary: true, run: () => this.commit(restAtCamp(this.s)) },
      ],
      ...(revisit ? { onDismiss: () => this.closeModal() } : {}),
    });
    if (!revisit) this.lessons('rest'); // Rest Camps dersi (ilk dinlenme noktası)
  }

  /** Kasabada Odo'nun tezgâhı (T1): ortak tüccar ekranı; ayrılınca kasaba penceresine dönülür (tezgâh kasabadan çıkınca kapanır). */
  private openTownMerchant(n: MapNode): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    setState(openCampaignShop(this.s));
    const closeShop = openCampaignMerchant(root, () => this.s, (x) => setState(x), { sub: `Odo's stall · ${n.name}`, leaveLabel: 'Back to town', onLeave: () => this.advance() });
    this.events.once('shutdown', closeShop);
    this.lessons('merchant');
  }

  /**
   * Seçenek penceresi (olay ve diyalog ortak): metin + alt alta seçenek satırları (kit secondary düğme + sağında açıklama). Zorunlu seçim:
   * zemine dokunmak kapatmaz.
   */
  private choiceModal(o: { title: string; subtitle?: string; text: string; rows: Array<{ label: string; hint?: string; dim?: boolean; run: () => void }> }): void {
    // Telefonda (html.short / compact) daha geniş pencere, daha büyük satırlar (dokunma hedefi) ve okunur açıklama
    const phone = this.compact();
    const w = phone ? 1500 : 1240;
    const probe = bodyText(this, 0, 0, o.text, w - 140);
    const textH = probe.height;
    probe.destroy();
    const anyHint = o.rows.some((r) => r.hint);
    const rowH = phone ? 100 : 80;
    const h = Math.min(H - 20, 96 + (o.subtitle ? 40 : 0) + textH + 40 + o.rows.length * rowH + 30);
    this.modal = openModal(this, this.ui, { title: o.title, ...(o.subtitle ? { subtitle: o.subtitle } : {}), text: o.text, width: w, height: h });
    worldSound('quill'); // olay / diyalog: tüy kalem parşömende
    const a = this.modal.area;
    const bw = anyHint ? (phone ? 560 : 470) : phone ? 1100 : 820;
    const bx = anyHint ? a.x + 40 + bw / 2 : W / 2;
    o.rows.forEach((r, i) => {
      const y = a.y + 6 + i * rowH + rowH / 2;
      const run = (): void => {
        if (!r.dim) worldSound('seal'); // seçim mühürlenir
        r.run();
      };
      const b = elButton(this, r.label, run, { kind: 'secondary', w: bw, h: phone ? 84 : 62, size: phone ? 24 : 19, ready: !r.dim });
      b.root.setPosition(bx, y);
      if (r.dim) b.root.setAlpha(0.5);
      this.modal!.root.add(b.root);
      if (r.hint) this.modal!.root.add(elBody(this, a.x + 40 + bw + 34, y, r.hint, phone ? 26 : 21, EL.NOTE, false, a.w - bw - 110).setOrigin(0, 0.5));
    });
  }

  /**
   * Seçenekli olay (N2): seçim -> sonuç (Continue ile kaydedilir) ya da olay savaşı. A levha (Ömer 2026-10-19, taslak map-events):
   * sahne şeridi, metin, 2x2 seçenek plakası (etiket, kısa açıklama, çipler); sonuç ekranı seçilen plaka + "What changed" çipleri.
   * Zorunlu seçim: zemine dokunmak kapatmaz.
   */
  private choiceEvent(eventId: string, nodeId: string, choices: EventChoice[]): void {
    const e = EVENTS[eventId]!;
    this.lessons('event');
    worldSound('quill'); // olay / diyalog: tüy kalem parşömende
    this.worldWindow(nodeId, {
      title: e.title,
      art: windowArt(`event:${eventId}`),
      paras: paragraphs(e.text),
      body: {
        k: 'plates',
        plates: choices.map((c) => {
          const blocked = choiceBlocked(this.s, c);
          const st = choiceStyle(eventId, c);
          return { id: c.id, label: c.label, desc: st.desc, tag: st.tag, acc: st.acc, chips: choiceChips(c), ...(blocked ? { dim: true, need: `Needs ${c.cost} gold (you have ${this.s.gold})` } : {}) };
        }),
        pick: (id) => {
          const c = choices.find((x) => x.id === id);
          if (!c) return;
          const blocked = choiceBlocked(this.s, c);
          if (blocked) return this.toast(blocked);
          worldSound('seal'); // seçim mühürlenir
          const next = chooseEvent(this.s, c.id);
          if (next.eventChoice?.battle) return this.commit(next); // olay savaşı: harita savaş adımına geçer
          const st = choiceStyle(eventId, c);
          this.worldWindow(nodeId, {
            title: e.title,
            art: windowArt(`event:${eventId}`),
            paras: paragraphs(c.result ?? ''),
            chipsCap: 'What changed',
            chips: resultChips(c),
            body: { k: 'chosen', plate: { id: c.id, label: c.label, desc: st.desc, tag: st.tag, acc: st.acc, chips: [] } },
            acts: [{ label: 'Continue', primary: true, run: () => this.commit(next) }],
          });
        },
      },
      acts: [],
    });
  }

  /** Kasaba hikâye sahnesi (T5): düz metin ya da diyalog (sorular, gizli beğeni sayacı, sevdiyse hediye item). Sis açma yok. */
  private storyScene(storyId: string, nodeId: string, replay = false): void {
    const n = node(this.map, nodeId);
    const def = STORIES[storyId] ?? { title: n.name, text: '' };
    const dialogue = def.dialogue ?? [];
    // Kasaba ekranındaki NPC (Ömer 2026-10-12): sahne yeniden okunabilir; ödül (hediye) yalnızca ilk girişte, tekrar ilerlemeyi değiştirmez
    const done = (answers?: number[]) => (replay ? this.closeModal() : this.commit(completeStory(this.s, answers)));
    // Sonsöz sayfası (Valdren Keep: komutan Valor'u anlatır; Ömer 2026-10-13): hikâyenin son sayfasından sonra; ilk girişte korlar 0'dan tutuşur
    const finish = (answers?: number[]): void => {
      const ep = def.epilogue;
      if (!ep) return done(answers);
      this.closeModal();
      this.modal = openModal(this, this.ui, {
        title: ep.title ?? def.title,
        subtitle: def.speaker ?? n.name,
        text: ep.text,
        height: 520,
        buttons: [
          {
            label: 'Continue',
            primary: true,
            run: () => {
              if (!replay && this.s.valor === undefined) rememberShown('valor', 0);
              markLessonSeen('valor'); // Valor dersi (komutanın anlatımı; ayrı kutu yok): Codex > Lessons'a girer
              done(answers);
            },
          },
        ],
        ...dismiss,
      });
    };
    const dismiss = replay ? { onDismiss: () => this.closeModal() } : {};
    if (!dialogue.length) {
      this.modal = openModal(this, this.ui, { title: def.title, subtitle: n.name, text: def.text, height: 600, buttons: [{ label: 'Continue', primary: true, run: () => finish() }], ...dismiss });
      return;
    }
    const answers: number[] = [];
    const ask = (i: number): void => {
      this.closeModal();
      if (i >= dialogue.length) {
        const liked = storyLiked(storyId, answers);
        const text = liked ? `${def.liked ?? ''}${def.gift && !replay ? '\n\nHe presses a small bundle into your hands.' : ''}` : (def.disliked ?? '');
        this.modal = openModal(this, this.ui, { title: def.title, subtitle: def.speaker ?? n.name, text, height: 460, buttons: [{ label: 'Continue', primary: true, run: () => finish(answers) }], ...dismiss });
        return;
      }
      const st = dialogue[i]!;
      this.choiceModal({
        title: def.title,
        subtitle: def.speaker ?? n.name,
        text: i === 0 ? `${def.text}\n\n${st.text}` : st.text,
        rows: st.choices.map((c, k) => ({
          label: c.label,
          run: () => {
            answers.push(k);
            ask(i + 1);
          },
        })),
      });
    };
    ask(0);
  }

  /** Yeni durumu kaydeder, haritayı yeniler, sonraki adıma geçer. */
  private commit(s: CampaignState): void {
    this.update2(s);
    this.closeModal();
    this.placeCaravan(s.at);
    this.refresh(true);
    this.advance();
  }

  /** İpucu kartı (kit paneli; alt ortada, harita düğmelerinin üstünde; sağ üstte kapama). */
  private showTip(): void {
    this.tip?.destroy(true);
    this.tip = null;
    const arrange = this.arrangeNotice === this.s.at && nextStep(this.s).kind === 'battle' ? (CONFIG.texts['recruitFormation'] ?? '') : '';
    if (!arrange) this.arrangeNotice = null;
    const tipText = pendingTip(this.s);
    const text = tipText ?? (arrange || null);
    if (!text) return;
    this.tipIsArrange = !tipText && !!arrange; // yalnızca "Formation'ı düzenle" ipucunda Formation düğmesi parlar
    const c = this.add.container(0, 0);
    this.tip = c;
    this.ui.add(c);
    const w = 760;
    const body = elBody(this, 0, 0, text, 20, EL.NOTE, false, w - 110);
    const h = Math.max(84, body.height + 52);
    const x = W / 2 - w / 2;
    const y = H - (this.compact() ? 140 : 96) - h;
    c.add(elPanel(this, x, y, w, h, { alpha: 0.92 }));
    c.add(elText(this, x + 24, y + 22, 'Tip', 13, 'rgba(217,178,106,0.85)', { em: 0.24 }).setOrigin(0, 0.5));
    body.setPosition(x + 24, y + 38);
    c.add(body);
    const close = elLink(this, '×', () => this.dismissTip(), { size: 22 });
    close.root.setPosition(x + w - 58, y + 24);
    c.add(close.root);
  }

  private dismissTip(): void {
    if (!this.tip) return;
    this.arrangeNotice = null;
    setState(markTipSeen(this.s));
    this.tip.destroy(true);
    this.tip = null;
    this.tipIsArrange = false;
    this.syncCampHud();
  }

  /**
   * Düğüme TEK dokunuş = eylem (Ömer 2026-10-12; eskiden seç + ikinci dokunuş): gidilebilir düğüme yürür (savaş düğümünde önce onay),
   * eylem bekleyen mevcut düğüm açılır (savaşta onay). Başka bir düğüme dokunmak (telefonda) bilgi kartını kısa süre gösterir.
   */
  private onNodeTap(id: string, v: NodeVis): void {
    if (v === 'fog') return;
    const step = nextStep(this.s);
    // Komşu (tek hamle) ya da temizlenmiş düğümler üzerinden uzak hedef (yolculuk): tek dokunuşla yürür
    if (step.kind === 'move' && id !== this.s.at && this.travelTargets().has(id)) return this.chooseRoad(id);
    if (id === this.s.at && step.kind === 'battle' && !this.s.suspended && this.formationDue()) return this.nudgeFormation();
    if (id === this.s.at && step.kind === 'battle') return this.s.suspended ? this.resumeBattle(id) : this.confirmBattle(id, () => void startCampaignBattle(this));
    if (id === this.s.at && this.actionHere()) return CONFIRM_STEPS.includes(step.kind) ? this.confirmPlace(id, () => this.openHere(id)) : this.advance();
    // Adımları bitmiş kasaba / tüccar / kampa yeniden gir (Ömer 2026-10-13, "Ashford'a giremiyorum"): Leave sonrası da tekrar açılır
    if (id === this.s.at && step.kind === 'move') {
      const k = revisitKind(this.s);
      if (this.pausedBlocks()) return;
      // Temizlenmiş savaş düğümü: devriye (yeniden oynama, azalan getiri)
      if (patrolAvailable(this.s)) return this.confirmPatrol(id, () => this.startPatrolBattle());
      if (k) return this.confirmPlace(id, () => this.reenter(id));
    }
    const p = this.input.activePointer;
    if (p.wasTouch) {
      this.showNodeTip(id, p);
      const tip = this.nodeTip;
      this.time.delayedCall(2600, () => tip === this.nodeTip && this.hideNodeTip());
    }
  }

  /** Düğümde varışta savaş başlayacak mı (karşılaşması olan, henüz temizlenmemiş düğüm; korumalı hazine dahil). */
  private fightsAt(id: string): boolean {
    return !!node(this.map, id).encounter && !isCleared(this.s, id);
  }

  /** Bulunulan (adımları bitmiş) kasaba / tüccar / kampa yeniden gir (kamp: yalnızca diriltme penceresi). */
  private reenter(id: string): void {
    if (this.s.at !== id || this.pausedBlocks()) return;
    const k = revisitKind(this.s);
    if (k === 'rest') return this.restModal(id, true);
    if (k) this.commit(revisitNode(this.s));
  }

  /** Devriye savaşını başlatır (bulunulan temizlenmiş savaş düğümünde; roadmap 2.2): aynı karşılaşma, seed oynama sayısını içerir. */
  private startPatrolBattle(): void {
    if (this.pausedBlocks() || nextStep(this.s).kind !== 'move' || !patrolAvailable(this.s)) return;
    this.update2(startPatrol(this.s));
    void startCampaignBattle(this);
  }

  /** "Fight the patrol?" kartı: "Start battle?" kartının aynısı, bilgi satırı devriye ödülünü yazar (sıradaki oynanışın yüzdesi). */
  private confirmPatrol(id: string, go: () => void): void {
    const n = node(this.map, id);
    if (!n.encounter) return;
    const pct = Math.round(nextReplayMult(this.s, id) * 100);
    this.nodeCard(id, { title: 'Fight the patrol?', foes: foeGroups(n.encounter).groups, info: { text: `Patrols return to cleared battlefields. Rewards: ${pct}% of the first victory, no Valor. Retreating costs each hero up to ${Math.round(patrolRetreatMaxLoss() * 100)}% HP.` }, onGo: go });
  }

  /**
   * Yol seçimi: her düğümde aynı anchored kart (Ömer 2026-10-18): savaşta "Start battle?" (Fight = yürü + savaşı başlat), savaşsızda
   * düğümün kendi kartı (Enter / Rest / Trade / Open / Continue = yürü; kasaba / dinlenme / tüccar / olay ekranı varışta açılır).
   * Eski "Take this road?" (Yes/No) penceresi kalktı; "diğer yollar kapanır" notu da yok (Ömer).
   */
  private chooseRoad(id: string): void {
    if (this.pausedBlocks()) return;
    const step = nextStep(this.s);
    if (step.kind !== 'move' || !this.travelTargets().has(id)) return;
    this.march(id);
  }

  /**
   * Varıştaki eylem (kartın birincil düğmesi ya da varışta bekleyen düğüme yeniden dokunma ile aynı iş): savaş başlar (Formation borcu varsa
   * önce ona yönlendirir), kasaba / kamp / tüccar / hazine / olay kendi ekranını açar, başka adım advance'a gider.
   */
  private runArrival(id: string): void {
    if (this.s.at !== id) return;
    const k = nextStep(this.s).kind;
    if (k === 'battle') {
      if (this.formationDue()) return this.advance();
      return void startCampaignBattle(this);
    }
    if (CONFIRM_STEPS.includes(k)) return this.openHere(id);
    this.advance();
  }

  /** Bulunulan düğümde bekleyen eylemi açar; hazine / olayda kartın eylemi ödülü doğrudan verir. */
  private openHere(id: string): void {
    if (['treasure', 'event'].includes(nextStep(this.s).kind)) this.directAt = id;
    this.advance();
  }

  /**
   * "Start battle?" kartı (Ömer 2026-10-18, taslak v3 "Anchored"; src/ui/start-battle.ts): düğümün yanında küçük DOM kartı, ok ucu düğümü gösterir.
   * Fight sağda birincil; X (Menu yerinde), Esc ve zemine dokunma = vazgeç. "Then" ve "diğer yollar kapanır" satırları yok (Ömer). Sahne
   * girdisi kart açıkken kilitli (`this.modal` yer tutucusu). Oyun kuralı değişmez: Fight yine `fight()` çalıştırır.
   */
  private confirmBattle(id: string, fight: () => void): void {
    const n = node(this.map, id);
    if (!n.encounter) return;
    const foes = foeGroups(n.encounter);
    this.nodeCard(id, { foes: foes.groups, fallback: foes.info, onGo: fight });
  }

  /**
   * Savaşsız düğümler için AYNI kart (Ömer 2026-10-18 "tüm nodelar için"): rozet + ad · tür + lore satırı + düğümün kendi eylemi (portre yok).
   * Eylem sözleri eski pencerelerdeki fiillerdir (Enter / Rest / Trade / Open / Continue). `go` kuralı değiştirmez: eskiden doğrudan
   * yapılan şeyi (yürü, ya da düğümü aç) yapar.
   */
  private confirmPlace(id: string, go: () => void, firstTown = false): void {
    const n = node(this.map, id);
    const t = PLACE_CARD[n.type] ?? { title: 'Continue?', action: 'Continue' };
    // Kasaba kartı (karar 364): lore yerine dinlenme kuralı; ilk varışta bedava dinlenme verildi, sonraki varışlarda ateş başı ücretli
    const info = n.type === 'town' ? { text: this.townArrivalNote(id, firstTown) } : undefined;
    this.nodeCard(id, { title: t.title, actionLabel: t.action, fallback: { text: this.nodeFacts(id).blurb }, ...(info ? { info } : {}), onGo: go });
  }

  /** Kasaba kartının dinlenme satırı (karar 364): ilk varış bedava dinlenmedir; sonrası ateş başında ücretli (campaign.json > rest.price). */
  private townArrivalNote(id: string, firstTown: boolean): string {
    if (firstTown) return 'Your free rest here: the living recover to full health on arrival.';
    if (townRestCount(this.s, id) === 0) return 'Your first arrival is a free rest: the living recover to full health.';
    return `No free rest this time. Resting by the fire costs ${townRestPrice(this.s, id)} gold.`;
  }

  private nodeCard(id: string, o: { title?: string; actionLabel?: string; foes?: FoeGroup[]; fallback?: { who?: string; text: string; quote?: boolean } | undefined; /** Lore'un yerine geçen bilgi satırı (devriye). */ info?: { text: string }; onGo: () => void }): void {
    const root = document.getElementById('ui-root');
    const n = node(this.map, id);
    if (!root) return;
    this.closeModal();
    const info = o.info ?? startCardInfo(n.lore, o.fallback?.text ? o.fallback : undefined);
    let card: StartBattleHandle | null = null;
    const close = (): void => {
      card?.close();
      card = null;
      this.modal = null;
      this.cardPlace = null;
    };
    card = openStartBattle(root, {
      ...(o.title ? { title: o.title } : {}),
      ...(o.actionLabel ? { actionLabel: o.actionLabel } : {}),
      name: n.name,
      subtitle: n.subtitle || TYPE_LABEL[n.type],
      nodeType: n.type,
      level: nodeLevel(this.s.mapId, id),
      ...(o.foes ? { foes: o.foes } : {}),
      ...(info ? { info } : {}),
      anchor: () => this.nodeCssPoint(id, root),
      onFight: () => {
        this.closeModal();
        o.onGo();
      },
      onCancel: () => this.closeModal(),
    });
    const handle = card;
    this.cardPlace = () => handle.place();
    this.cardCam = '';
    onStageResize(this, () => handle.place());
    // Esc / başka pencereler `this.modal.close()` ile kapatır; yalnızca close() kullanılır
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
  }

  /**
   * Debug > Campaign > "Map windows": harita pencerelerini örnek veriyle açar (kural / kayıt değişmez; eylemler yalnızca bildirim gösterir, X / Esc /
   * zemin kapatır). hero, recruit, event-fold, event-witch, treasure, rest, hearth, board, barracks.
   */
  debugMapWindow(kind: string): void {
    if (this.inputBusy()) return;
    const close = (): void => this.closeModal();
    const note = (t: string) => () => this.toast(t);
    const eventWindow = (eventId: string, nodeId: string): void => {
      const choices = eventChoices(eventId);
      const e = EVENTS[eventId];
      if (!e || !choices.length) return this.toast('No such event on this map.');
      const open = (): void =>
        this.worldWindow(nodeId, {
          title: e.title,
          art: windowArt(`event:${eventId}`),
          paras: paragraphs(e.text),
          onDismiss: close,
          body: {
            k: 'plates',
            plates: choices.map((c) => {
              const st = choiceStyle(eventId, c);
              return { id: c.id, label: c.label, desc: st.desc, tag: st.tag, acc: st.acc, chips: choiceChips(c) };
            }),
            pick: (id) => {
              const c = choices.find((x) => x.id === id)!;
              if (c.battle) return this.toast('Debug: the fight would start here.');
              const st = choiceStyle(eventId, c);
              this.worldWindow(nodeId, {
                title: e.title,
                art: windowArt(`event:${eventId}`),
                paras: paragraphs(c.result ?? ''),
                chipsCap: 'What changed',
                chips: resultChips(c),
                onDismiss: close,
                body: { k: 'chosen', plate: { id: c.id, label: c.label, desc: st.desc, tag: st.tag, acc: st.acc, chips: [] } },
                acts: [{ label: 'Back to the choices', run: open }, { label: 'Continue', primary: true, run: close }],
              });
            },
          },
          acts: [],
        });
      open();
    };
    const byType = (t: string): string | undefined => this.map.nodes.find((n) => n.type === t)?.id;
    if (kind === 'hero' || kind === 'recruit') {
      const ids = kind === 'hero' ? this.sorted(CONFIG.starterPool) : ['paladin', 'hexer', 'druid'];
      const startNode = node(this.map, this.map.start);
      this.worldWindow(kind === 'hero' ? startNode.id : (byType('battle') ?? startNode.id), {
        type: kind === 'hero' ? 'start' : 'battle',
        kind: kind === 'hero' ? 'Journey' : 'Recruit',
        title: kind === 'hero' ? 'Choose your hero' : 'A New Companion',
        paras: paragraphs(kind === 'hero' ? CONFIG.texts.intro : CONFIG.texts.recruitBefore),
        onDismiss: close,
        body: { k: 'cards', ...(kind === 'hero' ? { leader: true } : {}), cards: ids.filter((id) => content.classes[id]).map((id) => this.mwCard(id)) },
        acts: [{ label: kind === 'hero' ? 'Begin the journey' : 'Join us', primary: true, needPick: 'Pick one first.', run: note('Debug: nothing happens.') }],
      });
    } else if (kind === 'event-fold') eventWindow('shepherds_fold', this.map.nodes.find((n) => n.event === 'shepherds_fold')?.id ?? this.s.at);
    else if (kind === 'event-witch') eventWindow('witchs_hut', this.map.nodes.find((n) => n.event === 'witchs_hut')?.id ?? this.s.at);
    else if (kind === 'treasure') {
      const n = this.map.nodes.find((x) => x.type === 'treasure' && x.treasure);
      const t = n?.treasure ? TREASURES[n.treasure] : undefined;
      if (!n || !t) return this.toast('No treasure stop on this map.');
      this.worldWindow(n.id, {
        title: t.title,
        art: windowArt(`treasure:${n.treasure}`),
        paras: paragraphs(t.text),
        chipsCap: 'Inside',
        chips: [
          { tone: 'gain', icon: 'gear', text: 'Gear' },
          { tone: 'gain', icon: 'gold', text: 'Gold' },
        ],
        onDismiss: close,
        acts: [{ label: 'Open the chest', primary: true, run: note('Debug: the chest would open.') }],
      });
    } else if (kind === 'rest') {
      const n = this.map.nodes.find((x) => x.type === 'rest');
      if (!n) return this.toast('No rest stop on this map.');
      const fallen = ['mage', 'archer']
        .filter((id) => content.classes[id])
        .map((id) => ({ classId: id, spriteId: content.classes[id]!.spriteId, name: content.classes[id]!.name, note: 'Fallen. Only Valor can raise them.' }));
      this.worldWindow(n.id, {
        title: n.name,
        art: windowArt('rest'),
        paras: ['Your company makes camp. Resting is free.', 'Resting does not raise the fallen: only Valor can.'],
        chipsCap: 'Rest',
        chips: [
          { tone: 'heal', icon: 'rest', text: `Every living hero recovers ${Math.round(restHealOf(this.s) * 100)}% max HP` },
          { tone: 'info', icon: 'gold', text: 'Free' },
        ],
        body: { k: 'fallen', rows: fallen },
        onDismiss: close,
        acts: [
          { label: 'Gear', run: note('Debug: Gear would open.') },
          { label: 'Rest', primary: true, run: note('Debug: the company would rest.') },
        ],
      });
    } else if (kind === 'hearth' || kind === 'board' || kind === 'barracks') {
      const want = kind === 'hearth' ? 'campfire' : kind;
      const tn = this.map.nodes.find((n) => townScene(n)?.hotspots.some((h) => h.id === want));
      const hs = tn ? townScene(tn)?.hotspots.find((h) => h.id === want) : undefined;
      if (!tn || !hs) return this.toast('No such town spot on this map.');
      const real = this.town?.nodeId === tn.id;
      const bg = tn.scene?.background ?? '';
      const region = this.map.regions.find((r) => r.id === tn.region)?.title;
      const rest: Pick<MwSpec, 'paras' | 'body' | 'acts'> =
        kind === 'barracks'
          ? {
              paras: paragraphs(CONFIG.texts.townRecruit),
              body: { k: 'cards', cards: ['paladin', 'hexer', 'druid'].filter((id) => content.classes[id]).map((id) => this.mwCard(id)) },
              acts: [
                { label: 'Not now', run: close },
                { label: 'Join us', primary: true, needPick: 'Pick one companion first.', run: note('Debug: nothing happens.') },
              ],
            }
          : { paras: paragraphs(kind === 'hearth' ? CONFIG.texts.townRested : (hs.note ?? 'No one here seeks to join you.')), acts: [{ label: 'Close', primary: true, run: close }] };
      this.mapWindow({
        variant: 'C',
        type: 'town',
        kind: nodeTags(tn.subtitle, 'Town').kind,
        place: tn.name,
        ...(region ? { region } : {}),
        title: hs.label,
        art: windowArt(`hotspot:${hs.id}`, `town:${bg}`),
        ...rest,
        onDismiss: close,
        anchor: real ? this.townAnchor(hs) : () => null,
      });
    }
  }

  /** Debug > Campaign > "Start card: <tür>": haritadaki ilk o türden düğüm için kartı açar (eylem yalnızca bildirim gösterir). */
  debugNodeCard(type: string): void {
    if (this.inputBusy()) return;
    const n = this.map.nodes.find((x) => x.type === type);
    if (!n) return this.toast(`No ${type} stop on this map.`);
    const note = () => this.toast('Debug card: the action does nothing here.');
    if (n.encounter) this.confirmBattle(n.id, note);
    else this.confirmPlace(n.id, note);
  }

  /**
   * Debug > Campaign > "Open Start battle card": bulunulan savaş düğümü, yoksa ilk gidilebilir savaş düğümü, yoksa haritadaki ilk karşılaşma
   * düğümü için kartı açar. Fight burada savaşı BAŞLATMAZ (yalnızca kartı kapatır).
   */
  debugStartBattleCard(elite = false): void {
    if (this.inputBusy()) return;
    const step = nextStep(this.s);
    const opts = step.kind === 'move' ? step.options : [];
    const withEnc = this.map.nodes.filter((n) => !!n.encounter);
    const pick = (elite ? withEnc.find((n) => n.type === 'elite') : undefined) ?? (this.fightsAt(this.s.at) ? node(this.map, this.s.at) : undefined) ?? withEnc.find((n) => opts.includes(n.id)) ?? withEnc[0];
    if (pick) this.confirmBattle(pick.id, () => this.toast('Debug card: Fight does nothing here.'));
  }

  /** Düğümün #ui-root içindeki CSS piksel konumu (harita kamerası + tuval -> sahne ölçeği); görünür alan dışındaysa null. */
  private nodeCssPoint(id: string, root: HTMLElement): { x: number; y: number } | null {
    // Tuval sahnede ortalanır (Phaser FIT): pencere 16:9'dan dar / 2580:1080'den genişse kenarda bant kalır; tuvalin #stage içindeki ofseti
    // ve CSS/piksel oranı tuvalin kendisinden ölçülür (sahne genişliğinden değil). Ofsetler dönüşümden etkilenmez (döndürülmüş dikeyde de doğru).
    const c = this.game.canvas;
    const stage = root.parentElement;
    let left = 0;
    let top = 0;
    for (let e: HTMLElement | null = c; e && e !== stage; e = e.offsetParent as HTMLElement | null) {
      left += e.offsetLeft;
      top += e.offsetTop;
    }
    const cam = this.cameras.main;
    return worldToStageCss(this.P(id), cam, { left, top, cssW: c.offsetWidth, cssH: c.offsetHeight, pxW: c.width, pxH: c.height });
  }

  /**
   * Duraklatılmış savaş (Ömer 2026-10-14, Retreat to Map): düğüme dokunmak "Resume battle?" sorar, savaş aynı turdan sürer. Kayıt
   * doğrulanamazsa (veri değişti / bozuk) silinir, not gösterilir ve normal "Start battle?" onayı açılır (savaş baştan).
   */
  private resumeBattle(id: string): void {
    if (!checkPaused()) {
      this.toast(PAUSED_BROKEN);
      this.renderHud();
      return this.confirmBattle(id, () => void startCampaignBattle(this));
    }
    const n = node(this.map, id);
    const turn = (suspendedOf(this.s)?.turn ?? 0) + 1;
    this.modal = openModal(this, this.ui, {
      title: 'Resume battle?',
      subtitle: `${n.name}  ·  ${n.subtitle || TYPE_LABEL[n.type]}`,
      text: `The battle is paused at turn ${turn}. It resumes where you left it.`,
      fit: true,
      buttons: [
        { label: 'Cancel', run: () => this.closeModal() },
        {
          label: 'Resume Battle',
          primary: true,
          run: () => {
            this.closeModal();
            startCampaignBattle(this);
          },
        },
      ],
      onDismiss: () => this.closeModal(),
    });
  }

  /** Duraklatılmış savaş varken kilitli eylem: notu gösterir, true döner (çağıran durur). */
  private pausedBlocks(): boolean {
    const lock = pausedLock(this.s);
    if (lock) this.toast(lock);
    return !!lock;
  }

  /**
   * Yürüyüş (Ömer 2026-10-18, "önce yürüsünler, yürürken fight arayüzü açık"): düğüme dokununca kafile HEMEN yürür, düğüm kartı yürüme
   * sürerken açıktır ve hedef düğümü gösterir. Kartın eylemine varıştan önce basılırsa yürüyüş atlanır ve eylem hemen çalışır; varış
   * önce olursa kart eylemi bekler. Kart kapatılırsa kafile yine varır (hamle `moveTo` ile dokunuşta işlenmiştir), düğümün ekranı kendiliğinden
   * açılmaz; düğüme yeniden dokunmak kartı açar.
   * Serbest dolaşım (roadmap 2.1): hedef temizlenmiş düğümler üzerinden uzaktaysa rota kor rengiyle vurgulanır ve kafile aradaki düğümlerde
   * durmadan yürür (içerikleri tetiklenmez). Temizlenmiş savaş düğümünde kart "Fight the patrol?" (devriye), temizlenmiş kasaba / tüccar / kampta
   * düğümün kendi kartı (yeniden giriş); başka temizlenmiş düğümde kart yok.
   */
  private march(to: string): void {
    this.closeModal();
    this.hideNodeTip();
    const from = this.s.at;
    const before = node(this.map, from).region;
    const route = [from, ...(travelRoute(this.s, to) ?? [to])];
    this.directAt = null;
    this.pendingFight = null;
    const firstTown = node(this.map, to).type === 'town' && townRestCount(this.s, to) === 0; // karar 364: ilk varış = bedava dinlenme
    this.update2(moveTo(this.s, to));
    this.tip?.destroy(true);
    this.tip = null;
    const fresh = !isCleared(this.s, to);
    const patrol = !fresh && patrolAvailable(this.s, to);
    const revisit = !fresh && !patrol && !!revisitKind(this.s);
    const action = patrol ? () => this.startPatrolBattle() : revisit ? () => this.reenter(to) : undefined;
    const arrival: Arrival = { node: to, requested: false, ...(action ? { action } : {}) };
    this.arrival = arrival;
    if (route.length > 2) this.routeHint(to, route); // yolculuk: rota vurgusu yürüyüş boyunca
    this.walk(route, () => {
      this.arrival = null;
      this.refresh(true);
      const region = node(this.map, to).region;
      const banner = region !== before;
      if (banner) this.regionBanner(region);
      const k = nextStep(this.s).kind;
      const waits = k === 'battle' || CONFIRM_STEPS.includes(k) || !!arrival.action;
      const run = () => (arrival.action ? arrival.action() : this.runArrival(to));
      if (arrival.requested) return void (banner && (k === 'battle' || patrol) ? this.time.delayedCall(1400, run) : run());
      if (!waits) return this.advance();
      this.renderHud(); // eylem düğümü: kart (açıksa) bekler, kapalıysa düğüme dokunulur
    });
    if (this.fightsAt(to)) this.confirmBattle(to, () => this.arrive(to));
    else if (patrol) this.confirmPatrol(to, () => this.arrive(to, action));
    else if (fresh || revisit) this.confirmPlace(to, () => this.arrive(to, action), firstTown);
  }

  /** Kartın birincil düğmesi yürüme sürerken: yürüyüşü atlar, eylem varışta hemen çalışır; yürüyüş bittiyse doğrudan çalışır. */
  private arrive(id: string, action?: () => void): void {
    const a = this.arrival;
    if (this.walking && a && a.node === id) {
      a.requested = true;
      this.walking.finish();
      return;
    }
    if (action) return action();
    this.runArrival(id);
  }

  /**
   * "Start battle?" onayından sonra yürünen düğümde savaşı başlatır (bölge afişi görünsün diye kısa bekleme). O arada pencere / menü /
   * Gear / ayarlar açıldıysa başlamaz; oyuncu düğüme dokunup yeniden onaylar.
   */
  private startPendingFight(): void {
    const f = this.pendingFight;
    if (!f) return;
    this.pendingFight = null;
    this.time.delayedCall(f.delay, () => {
      const ready = this.s.at === f.node && nextStep(this.s).kind === 'battle' && !this.modal && !this.menuOpen && !this.slotBrowser && !isSettingsOpen() && !document.querySelector('#ui-root .gr-overlay');
      if (ready && !this.formationDue()) startCampaignBattle(this);
    });
  }

  /**
   * Sol üst ◂ Back (Ömer 2026-10-12): ana menüye (Menu > Main Menu ile aynı yer). Normal modda son kayıttan beri ilerleme varsa onay
   * sorar; Ironman her adımda kendiliğinden kaydettiği için sormaz.
   */
  private leaveMap(): void {
    if (this.inputBusy()) return;
    const go = () => elGo(this, MENU_SCENE);
    if (!hasUnsavedProgress(storage(), this.s)) return go();
    this.modal = openModal(this, this.ui, {
      title: 'Leave the map?',
      text: 'Unsaved progress will be lost. Leave?',
      fit: true,
      buttons: [
        { label: 'Stay', run: () => this.closeModal() },
        {
          label: 'Leave',
          primary: true,
          run: () => {
            this.closeModal();
            go();
          },
        },
      ],
      onDismiss: () => this.closeModal(),
    });
  }

  private regionBanner(regionId: string): void {
    const r = this.map.regions.find((x) => x.id === regionId);
    if (!r) return;
    const c = this.add.container(0, 0);
    this.ui.add(c);
    const g = this.add.graphics();
    hGradient(g, FULL_X0, H / 2 - 80, FULL_W, 160, 0x0a0705, [
      [0, 0],
      [0.3, 0.85],
      [0.7, 0.85],
      [1, 0],
    ]);
    fadeLine(g, W / 2 - 420, W / 2, H / 2 - 80, EL.GOLD, 0.5, 'in');
    fadeLine(g, W / 2, W / 2 + 420, H / 2 - 80, EL.GOLD, 0.5, 'out');
    fadeLine(g, W / 2 - 420, W / 2, H / 2 + 80, EL.GOLD, 0.5, 'in');
    fadeLine(g, W / 2, W / 2 + 420, H / 2 + 80, EL.GOLD, 0.5, 'out');
    c.add(g);
    c.add(elText(this, W / 2, H / 2 - 18, r.title, 50, '#ffffff', { em: 0.12 }).setOrigin(0.5).setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f));
    c.add(elBody(this, W / 2, H / 2 + 38, r.tagline, 24, EL.NOTE).setOrigin(0.5));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 350, yoyo: true, hold: 1600, onComplete: () => c.destroy(true) });
  }

  // ------------------------------------------------------------ kahraman paneli ve dizilim

  /** Yan panel açılabilir mi: yürürken, menü açıkken ya da zorunlu bir seçim penceresi varken açılmaz. */
  private canOpenSide(): boolean {
    if (this.walking || this.menuOpen) return false;
    if (this.modal && FORCED.includes(nextStep(this.s).kind)) return false;
    return true;
  }

  /** Kahramana dokunma / "Hero details": ortak Gear o kahramanın sekmesinde açılır (eski kahraman paneli kalktı; Ömer 2026-10-18). */
  private openHero(heroId: string, after?: () => void, view?: 'char' | 'inv'): void {
    if (!this.canOpenSide()) return;
    this.closeModal();
    this.openGear(heroId, false, after, view);
  }

  private openFormationFromHud(): void {
    if (!this.canOpenSide()) return;
    this.openFormation();
  }

  /** Formation penceresi açık mı (F tuşu aç / kapat). */
  private formationOpen = false;

  private closeFormation(): void {
    this.closeModal();
    this.renderHud();
    this.placeCaravan(this.s.at);
  }

  /** Dizilim penceresi (sürükle ya da dokun-dokun; Auto arrange). Kapanınca harita kalır (önceki kart yeniden açılmaz). */
  private openFormation(): void {
    if (this.pausedBlocks()) return;
    // Zorunlu Formation (tutorial): açıldı = kapı kalkar (Done / zemin / Esc hangisiyle kapanırsa kapansın); kapanınca HUD yenilenir, parıltı söner
    if (this.s.formationDue !== undefined) setState(markFormationOpened(this.s));
    this.tipIsArrange = false; // dizilim ipucunun parlaması Formation açılınca söner
    this.syncCampHud();
    this.closeModal();
    this.sideOpen = true;
    this.formationOpen = true;
    this.modal = openFormation(this, this.ui, {
      get: () => this.s,
      move: (heroId, cell) => setState(moveHero(this.s, heroId, cell)),
      auto: () => setState(autoFormation(this.s)),
      done: () => this.closeFormation(),
      toUi: (p) => this.uiPoint(p),
      heroPanel: (id) => this.openHero(id, () => this.openFormation()),
    });
  }

  // ------------------------------------------------------------ pencereler: kahraman, aday, veda, yeni takım

  private classGrid(ids: string[], area: { x: number; y: number; w: number; h: number }, onTap: (id: string) => void, root: Phaser.GameObjects.Container, tag?: (id: string) => string | undefined) {
    const cols = Math.min(ids.length, 6);
    const rows = Math.ceil(ids.length / cols);
    const cw = Math.min(190, (area.w - 20) / cols - 14);
    const ch = Math.min(230, (area.h - 10) / rows - 14);
    const cards = new Map<string, ReturnType<typeof classCard>>();
    ids.forEach((id, i) => {
      const r = Math.floor(i / cols);
      const inRow = Math.min(cols, ids.length - r * cols);
      const col = i % cols;
      const x = W / 2 + (col - (inRow - 1) / 2) * (cw + 14);
      const y = area.y + ch / 2 + r * (ch + 14);
      const card = classCard(this, x, y, cw, ch, id, { tag: tag?.(id), onTap: () => onTap(id) });
      root.add(card.container);
      cards.set(id, card);
    });
    return cards;
  }

  private sorted(pool: string[]): string[] {
    return sortByPrimary(pool.map((id) => ({ id, name: content.classes[id]?.name ?? id, primary: content.classes[id]?.primary }))).map((c) => c.id);
  }

  /** "Choose your hero" (Ömer 2026-10-19, taslak map-events A): kahraman kartları (v2 büst + kısa açıklama), lider tacı, Begin the journey sağda. Zorunlu: zemin kapatmaz. */
  private pickHeroModal(): void {
    const startNode = node(this.map, this.map.start);
    const region = this.map.regions.find((r) => r.id === startNode.region)?.title;
    this.mapWindow({
      variant: 'A',
      type: 'start',
      kind: 'Journey',
      place: startNode.name,
      ...(region ? { region } : {}),
      title: 'Choose your hero',
      paras: paragraphs(CONFIG.texts.intro),
      body: { k: 'cards', leader: true, cards: this.sorted(CONFIG.starterPool).map((id) => this.mwCard(id)) },
      acts: [
        {
          label: 'Begin the journey',
          primary: true,
          needPick: 'Pick a hero first.',
          run: (chosen) => {
            if (!chosen) return this.toast('Pick a hero first.');
            this.update2(pickHero(this.s, chosen));
            markJourneyStart();
            this.commit(this.s);
          },
        },
      ],
    });
  }

  /** Yeni yoldaş / gönüllü (A levha): aday kartları (büst + kısa açıklama), Join us sağda. */
  private recruitModal(step: Extract<NextStep, { kind: 'recruit' | 'volunteer' }>): void {
    const needArea = isAreaClass;
    this.worldWindow(step.node, {
      kind: 'Recruit',
      place: node(this.map, step.node).name,
      title: step.kind === 'volunteer' ? 'A Volunteer' : 'A New Companion',
      paras: paragraphs(step.kind === 'volunteer' ? CONFIG.texts.volunteer : CONFIG.texts.recruitBefore),
      body: { k: 'cards', cards: step.offer.map((id) => this.mwCard(id, needArea(id) && node(this.map, step.node).recruit?.requireArea ? 'Area attacks' : undefined)) },
      acts: [
        {
          label: 'Join us',
          primary: true,
          needPick: 'Pick one companion first.',
          run: (chosen) => {
            if (!chosen) return this.toast('Pick one companion first.');
            const next = recruit(this.s, chosen);
            // Savaştan önce katılım (Ravenwood; Ömer 2026-10-16): savaş kendiliğinden başlamaz, önce Formation; düğüme dokununca "Start battle?"
            if (recruitHoldsBattle(this.s, next)) {
              this.pendingFight = null;
              this.arrangeNotice = next.at;
            }
            this.commit(next);
          },
        },
      ],
    });
  }

  private addFarewellFaces(): void {
    if (!this.modal) return;
    const team = activeHeroes(this.s);
    team.forEach((h, i) => {
      const def = content.classes[h.class]!;
      const x = W / 2 + (i - (team.length - 1) / 2) * 120;
      this.modal!.root.add(classAvatar(this, def, x, this.modal!.area.y + 70, 96));
      this.modal!.root.add(classLogoBadge(this, def, x - 36, this.modal!.area.y + 106, 14));
    });
  }

  private companyModal(size: number): void {
    const picks: string[] = [];
    let leader = 0;
    // Tutorial'da oynanan sınıflar (veda ettiler; yine seçilebilir): "Played in the tutorial" etiketi
    const tutorialClasses = new Set(session.tutorialClasses);
    const m = openModal(this, this.ui, {
      title: 'Form your company',
      subtitle: `Choose ${size} heroes. The first one you pick leads the company (tap a chosen hero again to make them the leader).`,
      width: 1500,
      height: 900,
      y: 90,
      buttons: [
        {
          label: 'Set out',
          primary: true,
          run: () => {
            if (picks.length !== size) return this.toast(`Pick ${size} heroes.`);
            this.commit(formCompany(this.s, picks, leader));
          },
        },
      ],
    });
    this.modal = m;
    const counter = elBody(this, W / 2, m.area.y + m.area.h - 40, '', 22, EL.ON).setOrigin(0.5, 0);
    m.root.add(counter);
    const update = () => {
      cards.forEach((c, k) => {
        c.setSelected(picks.includes(k));
        c.setLeader(picks[leader] === k);
      });
      counter.setText(`${picks.length} / ${size} chosen${picks.length ? `  ·  Leader: ${content.classes[picks[leader]!]?.name}` : ''}`);
    };
    const cards = this.classGrid(this.sorted(CONFIG.companyPool), { ...m.area, h: m.area.h - 20 }, (id) => {
      const i = picks.indexOf(id);
      if (i < 0) {
        if (picks.length >= size) return this.toast(`You already have ${size} heroes. Tap one to remove it.`);
        picks.push(id);
      } else if (i !== leader) leader = i; // seçili ama lider değil: lider yap
      else {
        picks.splice(i, 1); // liderse: çıkar
        leader = 0;
      }
      update();
    }, m.root, (id) => (tutorialClasses.has(id) ? 'Played in the tutorial' : undefined));
    update();
  }
}
