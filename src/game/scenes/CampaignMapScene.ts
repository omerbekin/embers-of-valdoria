import Phaser from 'phaser';
import { basePuffs, placePuffs, roadRects, type Rect } from '../fog-clouds';
import { content } from '../../engine';
import {
  CONFIG,
  continueToMap,
  nextMapFor,
  EVENTS,
  STORIES,
  epilogueUnlocksValor,
  storyGiftNote,
  chooseEvent,
  choiceBlocked,
  completeStory,
  eventChoices,
  eventChoicesFor,
  heroQuests,
  questBonusLine,
  questDef,
  shownMap,
  restHealOf,
  skipCamp,
  campaignSellValue,
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
  companyCard,
  startCardInfo,
  type FoeGroup,
  nodeLevel,
  farewell,
  formCompany,
  getMap,
  hasUnsavedProgress,
  isAreaClass,
  leaderOf,
  dueCinematic,
  cinematicSeen,
  markCinematicSeen,
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
  mainOutgoing,
  pendingTip,
  pickHero,
  skipTutorial,
  recruit,
  recruitHoldsBattle,
  formationGate,
  formationTapGated,
  markFormationOpened,
  saveCount,
  chapterOf,
  clearedProgress,
  edgeEither,
  neighbors,
  nextReplayMult,
  replayMult,
  patrolAvailable,
  patrolRetreatNote,
  woundRules,
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
  revisitKind,
  enterPit,
  fightPit,
  leavePit,
  pitBlocked,
  pitView,
  swearOath,
  swearBlocked,
  breakOath,
  breakOathBlocked,
  oathShrineHere,
  heroById,
  oathDef,
  oathPlusText,
  oathMinusText,
  OATHS,
  OATH_DATA,
  revisitNode,
  recruitInTown,
  swapHero,
  swapOffer,
  townRecruitOffer,
  townScene,
  townScreenNode,
  storyHeard,
  type TownHotspot,
  reviveWithValor,
  valorReviveBlocked,
  valorWoundHealBlocked,
  healWoundWithValor,
  rulesFor,
  type Hero,
  arrivalStepLines,
  joinLevel,
  temporaryCompany,
  victoryRecovery,
  victoryRecoveryNote,
  diveState,
  diveDeeper,
  diveChest,
  diveMax,
  shrineOf,
  caravelAt,
  caravelDef,
  encounterAt,
  nodeEncounter,
  nodeLock,
  passable,
} from '../../campaign';
import { instanceRarity } from '../../progression/items';
import { dueScreenLessons, type LessonScreen } from '../../tutorial/lessons';
import { markLessonSeen, seenLessons, tutorialsOn } from '../../tutorial/store';
import { closeAllLessons, dismissLesson, nudgeLesson, onLessonsTurnedOff, showGateLesson, showLesson, type LessonHandle } from '../../ui/lesson-box';
import { ValorMeter, isValorReviveOpen, openValorRevive, otherDialogOpen, rememberShown } from '../../ui/valor-braziers';
import { isInputLocked } from '../../ui/input-lock';
import { avatarUrl } from '../../ui/character-panel';
import { TownScreen } from '../town-screen';
import { openCampaignMerchant } from '../campaign-merchant';
import { MENU_ONLY_TEXTURES, preloadAssets, releaseTextures } from '../assets';
import { classSpriteIds } from '../sprite-needs';
import { preloadCampaignArt } from '../campaign-art';
import { campaignMapArt, campaignMapImage, edgeFillers } from '../map-art';
import { artFrames } from '../wide-map';
import { onStageResize, stageView } from '../stage';
import { setItemValueSource } from '../../ui/item-tip';
import { openCamp, type CampHandle } from '../../ui/camp-screen';
import { BAND_NAME, nodeThreat, threatLine } from '../../campaign/level-gap';
import { diveChainLine, pitChainLine } from '../../campaign/chain-info';
import { SIDE_DANGER_LINE, SIDE_DANGER_NAME, sideDanger } from '../../campaign/side-danger';
import { DayCounter } from '../../ui/day-counter';
import { openStartBattle, type StartBattleHandle } from '../../ui/start-battle';
import { openStoryDialog, type StoryDialogHandle } from '../../ui/story-dialog';
import { playCinematic, type CinematicHandle } from '../../ui/cinematic';
import { openCompanyWindow, type CompanyHandle } from '../../ui/company-window';
import { choiceStyle, openMapWindow, windowArt, type MwCard, type MwHandle, type MwSpec } from '../../ui/map-window';
import { choiceChips, nodeTags, paragraphs, resultChips } from '../../ui/map-window-data';
import { FULL_W, FULL_X0 } from '../../ui/viewport';
import { H, W, crown, hpBar, openModal, woundPips, woundScar, type Modal } from '../campaign-ui';
import { woundCount, woundHpFactor, woundTipData } from '../../progression/wounds';
import { taintHpFactor, taintOf } from '../../campaign/surge';
import { heroPanel } from '../../progression/item-text';
import { motion } from '../../ui/motion';
import { MAP_SCENE, MENU_SCENE, checkPaused, checkpoint, current, loadEntry, markJourneyStart, save, session, setState, startCampaignBattle, storage } from '../campaign-session';
import { classAvatar, classLogoBadge, ensureGlow } from '../menu-ui';
import { bandTip } from '../band-tip';
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
import { EL, elBack, elBody, elGo, elIconButton, elLink, elPanel, elScreenIn, elText, elToast, fadeLine, fitW, hGradient, vGradient } from '../elegant-ui';
import { MAP_ZOOM, clampMid, clampZoom, wheelAction, worldToStageCss, zoomTowardMid, type Bounds } from '../map-view';
import { REGION_VIEW, overviewSafe, regionCamera, type HudInsets, isEmptyMapPoint, overviewMarkers, seenRegions, overviewRoad, regionAt, regionName, regionSub, regionSets, regionZoom, type OverviewMarker, type RegionSets } from '../region-view';
import { reducedMotion } from '../../ui/motion-pref';
import { MapTraveller } from '../map-traveller';
import { drawBadge, drawFrame, drawLoopIcon, frameColor, frameSpec } from '../map-frames';
import { drawNodeGlyph, graveMark, nodeGlyphImage, openFormation } from '../campaign-panels';
import { openSlotBrowser, type SlotBrowser } from '../campaign-slots-ui';
import { ensureIcon } from '../icons';
import { hasUiImage, uiIconName } from '../../ui/ui-icons';
import { hasMiscImage } from '../../ui/misc-icons';
import { WORLD_AUDIO, worldSound } from '../../ui/ui-sound';
import { mapSceneTrack, sceneMusic } from '../../ui/music';
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
/** İki parmak arası en çok bu kadar ms önce basılmış olmalı (daha eskisi kaybolmuş touchend: takılı parmak). */
const PINCH_STALE_MS = 8000;
/** Liderin dinlenirken düğüme göre yeri (mockup W4: düğümün solunda, biraz aşağıda; ad etiketini örtmez). */
const TRAV_REST = { x: -76, y: 8 };
const PAN_STEP = 340;
/** Sol sütun (Sakin etiket, Ömer 2026-10-19; mockup map-calm V1): kenardan boşluk, üst boşluk, içerik genişliği. Telefonda içerik COL_K kat büyür. */
const SIDE = { left: 36, top: 124, partyW: 360 };
const COL_K = 1.45;
/** Zorunlu seçim pencereleri (Esc ile kapanmaz; Party / Formation bunların üstünde açılmaz). */
const FORCED: ReadonlyArray<NextStep['kind']> = ['hero', 'recruit', 'volunteer', 'farewell', 'company'];

type CompanyCard = NonNullable<ReturnType<typeof companyCard>>;
type PatrolTags = Array<{ text: string; tone?: 'gold' | 'dim' }>;
type Pt = { x: number; y: number };
/** Zafer toparlanması notu için son görülen zafer sayısı (seferin seed'i ile; oturum belleği, kayda girmez). */
let recoverySeen: { seed: number; wins: number } | null = null;
/** A5 görev bildirimi için son görülen bitmiş görev sayısı (seferin seed'i ile; oturum belleği, kayda girmez). */
let questSeen: { seed: number; ids: string[] } | null = null;
/** Yürüyüşte seçilen düğüm; `action` = varışta yapılacak iş (devriye / kasabaya yeniden giriş), yoksa düğümün adımı. */
type Arrival = { node: string; requested: boolean; action?: () => void };

/** Düğüme göre göreli etiket dikdörtgeni. */
type Side = 'below' | 'above' | 'right' | 'left' | 'belowR' | 'belowL' | 'aboveR' | 'aboveL';
type Box = { x0: number; y0: number; x1: number; y1: number };
const chainOpt = (c: string | null): { chain?: string } => (c ? { chain: c } : {});
type LabelPlace = { x0: number; y0: number; w: number; h: number; sub: boolean; side: Side };
/** Düğüm etiketi: `q` = kalıcı küçük ad (yalnızca masaüstü, bulunulan / gidilebilir olmayanlarda), `b` = ad + alt yazı şeridi (bulunulan / gidilebilir hep açık; diğerlerinde üstüne gelince / dokununca). */
type LabelSlot = { q: LabelPlace | null; b: LabelPlace; hot: boolean };

export class CampaignMapScene extends Phaser.Scene {
  static readonly KEY = 'CampaignMapScene';
  /** Kameraları stage.ts değil bu sahne kurar (iki kamera + harita yakınlaştırması). */
  readonly customStageCamera = true;
  /** Oyuncunun harita yakınlaştırması (MAP_ZOOM); kameranın gerçek yakınlaştırması bunun render ölçeğiyle çarpımı. */
  private mapZoom = 1;
  /** Bölge görünümünün taban yakınlaştırması (bölge sığar; bütün harita = 1). Kameranın gerçek yakınlaştırması: render ölçeği x bu x mapZoom. */
  private baseZoom = 1;
  /** Odaktaki bölge; null = uzak görünüm (bölge haritası: yalnız bölge işaretleri, düğümler gizli; Ömer 2026-10-23). Haritaya girişte kafilenin bölgesi. */
  private focus: string | null = null;
  /** Uzak görünüm katmanı (bölge işaretleri + ana yol; dünya kapsayıcısı, bulutların üstünde) ve son işaret yerleşimi. */
  private over: Phaser.GameObjects.Container | null = null;
  private markers: OverviewMarker[] = [];
  /** Uzak görünümde üstüne gelinen bölge (işaret vurgusu + bölge parıltısı). */
  private overHover: string | null = null;
  private overFx = new Map<string, (on: boolean) => void>();
  /** Görünüm geçişi (uzak <-> bölge) sürerken tekerlek / sıkıştırma yeni geçiş başlatmaz (bu zamana kadar). */
  private focusLockUntil = 0;
  /** Harita / bölge yeniden çizildikten sonra kısa süre boş alana dokunuş uzak görünüme atmaz (düğümler belirirken rozete basılır). */
  private emptyTapAt = 0;
  private fadeTweens: Phaser.Tweens.Tween[] = [];
  /** Sıkıştırma: uzak görünümde / en küçük yakınlaştırmada biriken oran (eşiği geçince görünüm değişir). */
  private pinchAcc = 1;
  /** Kafilenin son çizimdeki bölgesi (bölge değişince odak kafileyi izler). */
  private partyRegion: string | null = null;
  private regionTween: Phaser.Tweens.Tween | null = null;
  /** Komşu bağlantı düğümünün üstüne gelince yolun sarı vurgusu. */
  private ghostG: Phaser.GameObjects.Graphics | null = null;
  /** dyn içindeki yol katmanı sayısı (vurgu bunların üstüne). */
  private roadLayers = 1;
  /** Son çizimdeki telefon düzeni: değişirse (döndürme / pencere) düğüm adları yeniden çizilir (telefonda yalnızca bulunulan + sonraki). */
  private drawnCompact = false;
  /** Harita görselinin dünyadaki kapsamı (21:9 çerçeve; kaydırma sınırı). */
  private frame: Bounds = { left: 0, right: W, top: 0, bottom: H };
  /** Kameranın kayabileceği alan: görselin tamamı (kenar taşması dahil; drawTerrain). `frame` = asıl görsel (kaplama ölçeği). */
  private pan: Bounds = { left: 0, right: W, top: 0, bottom: H };
  /** Harita kamerasının baktığı nokta (kısılmadan önce). */
  private mid: Pt = { x: W / 2, y: H / 2 };

  /** Oyuncunun gördüğü harita (A5: gizli görev cepleri çıkarılmış; src/campaign/quests.ts > shownMap). Kadro değişince kendiliğinden güncel. */
  private get map(): CampaignMap {
    return shownMap(this.s);
  }
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
  private caravan: MapTraveller[] = [];
  private walking: { finish: () => void } | null = null;
  private modal: Modal | null = null;
  /** Bu sahnede Morvane final sinematiğinin kapanış kartı gösterildi: "Valdoria Conquered" penceresi aynı cümleyi (texts.complete) tekrar etmez. */
  private endCardShown = false;
  /** Menu > Load: bu yuvanın kayıt listesi (src/game/campaign-slots-ui.ts "Column"). */
  private slotBrowser: SlotBrowser | null = null;
  /** Kahraman paneli ya da Formation penceresi açık (Menu düğmesi gizlenir; pencerenin kendi Close / Done'ı yeter). */
  private sideOpen = false;
  /** Sağ üstteki DOM "Menu" düğmesi. */
  private tip: Phaser.GameObjects.Container | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private drag = { down: false, moved: false, x: 0, y: 0 };
  /** Basışın başladığı düğüm (dokunuş = aynı düğümde basıp bırakmak). */
  private tapNode: string | null = null;
  /** Düğüm bilgi kartı (fare hover / dokunmatik uzun basış). */
  /** Fare önizlemesi (sabitlenmemiş düğüm kartı; src/ui/start-battle.ts > preview). */
  private nodeTip: StartBattleHandle | null = null;
  private previewClosedFor: string | null = null;
  private previewId: string | null = null;
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
  /** Zorunlu Formation kilidi (Ömer 2026-10-27): kapının düğümüne dokunuldu, spot ışıklı ders açık; Formation açılana kadar başka girdi yok. */
  private formationLock: LessonHandle | null = null;
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
    this.baseZoom = 1;
    this.focus = null;
    this.over = null;
    this.markers = [];
    this.overHover = null;
    this.overFx = new Map();
    this.focusLockUntil = 0;
    this.emptyTapAt = 0;
    this.fadeTweens = [];
    this.pinchAcc = 1;
    this.partyRegion = null;
    this.regionTween = null;
    this.ghostG = null;
    this.frame = { left: 0, right: W, top: 0, bottom: H };
    this.pan = { ...this.frame };
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
    this.formationLock = null;
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
    // yalnız bu haritanın görseli (taşmalı > geniş > eski; diğer haritalarınki yüklenmez) + Menu > Load yuva kartlarının valdoria-bg'si
    const st = current();
    preloadCampaignArt(this, st ? [...campaignMapImage(getMap(st.mapId)), 'valdoria-bg'] : undefined);
  }

  create(): void {
    setItemValueSource(campaignSellValue); // ipucundaki "value" = tüccar satış fiyatı (2026-10-26)
    this.events.once('shutdown', () => setItemValueSource(null));
    elScreenIn(this); // ortak ekran geçişi (data/ui-motion.json > screen; Reduced motion = anında)
    if (!current()) {
      // ?campaign=1 (geliştirme) ya da kayıtsız açılış: yeni Normal sefer
      setState(newCampaign({ mode: 'normal', seed: Math.floor(Date.now() % 1_000_000_000) }));
    }
    this.events.once('shutdown', () => closeAllLessons()); // mentor kutuları sahneyle kapanır (docs/design/tutorial.md)
    this.events.once('shutdown', () => this.releaseFormationLock());
    const offLessons = onLessonsTurnedOff(() => this.releaseFormationLock()); // "Don't show again": kapı kalkar
    this.events.once('shutdown', offLessons);
    this.events.once('shutdown', () => { this.nodeTip?.close(); this.nodeTip = null; }); // hover kartı ana menüde asılı kalmasın
    this.cameras.main.setBackgroundColor('#0b0705');
    this.world = this.add.container(0, 0);
    this.ui = this.add.container(0, 0).setDepth(1000);
    this.uiCam = this.cameras.add(0, 0, stageView.canvasW, stageView.canvasH);
    this.cameras.main.ignore(this.ui);
    this.uiCam.ignore(this.world);

    this.drawTerrain();
    this.bindEmptyTap(); // düğüm katmanının ALTINDA: düğümler / etiket dokunuşları önce gelir
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
    this.events.on('update', () => {
      this.updatePanButtons();
      this.syncOverlays();
      if (this.cardPlace && !this.walking) { // yürürken kart yerinde durur (anchor varış kamerasına sabit); yürüyüş bitince bir kez oturur
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
    // Gün sayacı (Ömer 2026-10-26; sağ üst, Menu / tam ekranın solunda): Valor mangalları gibi pencere / menü açıkken gizli
    if (!this.dayCounter) {
      const root = document.getElementById('ui-root');
      if (root) {
        const d = new DayCounter(root);
        this.dayCounter = d;
        this.events.once('shutdown', () => {
          d.destroy();
          if (this.dayCounter === d) this.dayCounter = null;
        });
      }
    }
    this.dayCounter?.sync(this.s, cover || this.menuOpen || !!this.modal || isValorReviveOpen() || otherDialogOpen());
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
    if (this.formationLocked()) return this.nudgeFormationLock();
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
    if (!this.formationOpen && this.formationLocked()) return this.nudgeFormationLock(); // Zorunlu Formation: önce Formation
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
    else if (e.key === '+' || e.key === '=') this.zoomStep(1);
    else if (e.key === '-' || e.key === '_') this.zoomStep(-1);
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
    if (k === 'c' && this.formationLocked()) {
      this.nudgeFormationLock();
      return true;
    }
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
    // Elle kavis (kenar verisinde ctrl, görsel oranı; map-1-rework.md 4.2b): Iron Pass -> Valdren Keep Charcoal Camp'in üstünden dolanır
    const ctrl = this.map.edges.find((e) => e.from === from && e.to === to)?.ctrl;
    const cp = ctrl ? new Phaser.Math.Vector2(ctrl[0] * W, ctrl[1] * H) : new Phaser.Math.Vector2(mx + (-dy / len) * bend, my + (dx / len) * bend);
    c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), cp, new Phaser.Math.Vector2(b.x, b.y));
    this.curves.set(key, c);
    return c;
  }

  // ------------------------------------------------------------ arazi (sabit)

  private drawTerrain(): void {
    const art = campaignMapArt(this, this.map);
    if (art) {
      const img = this.add.image(0, 0, art.key).setOrigin(0, 0);
      // Eski 16:9 haritanın bölgesi dünyada 0-1920 x 0-1080'e oturur (düğüm konumları bu bölgeye göre). Taşmalı görselde (backgroundExt)
      // kamera taşma alanına da kayar (pan), bölge yakınlaştırması asıl görseli kaplar (frame).
      const f = artFrames(img.width, img.height, art.region, { x: 0, y: 0, w: W, h: H }, art.content);
      img.setPosition(f.place.x, f.place.y).setScale(f.place.scale);
      this.frame = f.content;
      this.pan = f.pan;
      const fill = edgeFillers(this, art.key, 0);
      fill.place(img);
      this.world.add([...fill.items, img]);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0xd9c497, 0xd9c497, 0xb59a68, 0xb59a68, 1).fillRect(FULL_X0, 0, FULL_W, H);
      this.world.add(g);
    }
    // (Eski çizimde kül ovası yoktu, kodla gri ton basılıyordu; 2026-10-22 yeni görselde kül ovası çizili, ton kaldırıldı.)
  }

  // ------------------------------------------------------------ yollar, düğümler, sis (duruma göre yeniden çizilir)

  private renderMap(animateFog: boolean): void {
    this.drawnCompact = this.compact();
    this.emptyTapAt = this.time.now + motion('mapRegion').fadeInMs + 500;
    this.dyn.removeAll(true);
    this.openEdges = [];
    this.clearZones = [];
    const vis = nodeVisibility(this.map, this.s, session.revealFog);
    const options = this.moves();
    // Bölge görünümü (src/game/region-view.ts): kafile başka bölgeye geçince (ve haritaya girişte) odak onun bölgesine geçer
    const pr = node(this.map, this.s.at).region;
    if (pr !== this.partyRegion) {
      const first = this.partyRegion === null;
      this.partyRegion = pr;
      this.setFocus(pr, !first);
    }
    const far = this.focus === null; // uzak görünüm: düğüm / yol yok, bölge işaretleri var
    const rv = this.focus ? regionSets(this.map, this.focus, vis) : null;
    const shown = (id: string) => !!rv && (rv.inside.has(id) || rv.ghosts.has(id));
    // Bölge dışında kalanlar çizilmez; drawNode için sis gibi sayılır. Etiket yerleşimi ve sisin açık alanları ise HER ZAMAN bütün haritadan
    // (Ömer 2026-10-23: bulutlar görünüm / yakınlaştırma değişince yerinde kalır, yalnız gerçek keşifle kalkar)
    const drawVis: Record<string, NodeVis> = Object.fromEntries(Object.entries(vis).map(([id, v]) => [id, shown(id) ? v : 'fog']));
    // 1) yollar (altta koyu iz: harita üstünde okunur kalsın), gidilebilenler ayrı katmanda akar; komşu bölgeye giden yol silik katmanda
    this.glowTween?.remove();
    this.glowTween = null;
    this.ghostG = null;
    const layer = (alpha: number) => {
      const g = this.add.graphics();
      const l = this.add.graphics();
      const box = this.add.container(0, 0, [g, l]).setAlpha(alpha);
      this.dyn.add(box);
      return { glow: g, lines: l };
    };
    const main = layer(1);
    this.roadLayers = rv && rv.ghostRoads.length ? 2 : 1;
    const ghost = rv && rv.ghostRoads.length ? layer(REGION_VIEW.ghostRoadAlpha) : null;
    const ghostSet = new Set(rv?.ghostRoads ?? []);
    for (const e of this.map.edges) {
      // M-J: kapalı deniz yolu gidilebilir görünmez (kor akışı yok)
      const ev0 = edgeVisibility(this.map, this.s, vis, e);
      const ev = ev0 === 'open' && !passable(this.map, this.s, e.from, e.to) ? 'visible' : ev0;
      const drawn = !!rv && (rv.roads.includes(e) || ghostSet.has(e));
      if (!drawn && ev !== 'open') continue;
      const pts = this.curve(e.from, e.to).getPoints(48).map((p) => ({ x: p.x, y: p.y }));
      if (ev === 'open') this.clearZones.push(...roadRects(pts)); // görünümden bağımsız
      if (!drawn) continue;
      const L = ghostSet.has(e) && ghost ? ghost : main;
      const pocket = e.sea ? 'sea' : e.style === 'dashed';
      if (ev === 'open') {
        this.drawRoad(L.glow, pts, 'open', 0, 'base', pocket);
        this.drawRoad(L.lines, pts, 'open', 0, 'dash', pocket);
        this.openEdges.push({ g: L.glow, pts });
        continue;
      }
      this.drawRoad(L.lines, pts, ev, 0, 'all', pocket);
    }
    if (this.openEdges.length) this.glowTween = this.tweens.add({ targets: [main.glow, ...(ghost ? [ghost.glow] : [])], alpha: { from: 1, to: 0.6 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 2) düğümler
    // Üst üste binen etiketlerde bulunulan ve gidilebilir düğüm en üstte kalsın: önce uzaklar, sonra gidilebilirler, en son bulunulan
    const rank = (id: string) => (vis[id] === 'current' ? 2 : options.includes(id) ? 1 : 0);
    this.labelObjs = [];
    this.planLabels(vis, options);
    this.fogClearZones(vis, options);
    if (!far) for (const n of [...this.map.nodes].sort((a, b) => rank(a.id) - rank(b.id))) this.drawNode(n, drawVis[n.id]!, options.includes(n.id), rv);
    this.syncLabels();
    // 3) sis bulutları: her zaman bütün haritanın sis durumu (görünümden bağımsız)
    this.updateClouds(vis, animateFog);
    // 4) uzak görünüm: bölge işaretleri + ana yol (bulutların üstünde)
    this.renderOverview();
  }

  /**
   * Sis kuralı (Ömer 2026-10-14): bulunulan ve sıradaki (gidilebilir) düğüm, adı ve alt yazısı bulutsuz kalır. Bütün haritadan hesaplanır
   * (Ömer 2026-10-23): uzak görünüm / bölge değişimi bulutları kaydırmaz.
   */
  private fogClearZones(vis: Record<string, NodeVis>, options: string[]): void {
    for (const n of this.map.nodes) {
      const v = vis[n.id];
      if (!v || v === 'fog') continue;
      if (!(v === 'current' || options.includes(n.id) || v === 'near' || this.adjacent(n.id))) continue;
      const p = this.P(n.id);
      const R = frameSpec(n.type).R;
      const slot = this.labelPlan.get(n.id);
      const place = slot?.hot ? slot.b : null;
      const x0 = Math.min(-R - 8, place ? place.x0 - 10 : 0);
      const x1 = Math.max(R + 8, place ? place.x0 + place.w + 10 : 0);
      const y0 = Math.min(-R - 8, place ? place.y0 - 10 : 0);
      const y1 = Math.max(R + 8, place ? place.y0 + place.h + 10 : 0);
      this.clearZones.push({ x0: p.x + x0, x1: p.x + x1, y0: p.y + y0, y1: p.y + y1 });
    }
  }

  /** Tek hamlede gidilebilen komşular (serbest dolaşım: ileri + geri; src/campaign/state.ts > moveOptions). Yola çıkılamıyorsa boş. */
  private moves(): string[] {
    const step = nextStep(this.s);
    // yola çıkma adımı değilse (ör. savaşılmamış savaş düğümü): geri çekilinebilen komşular (travelRoutes yalnız temizlenmiş komşuları verir)
    return step.kind === 'move' ? [...step.options, ...(step.back ?? [])] : [...this.travelTargets().keys()].filter((id) => this.adjacent(id));
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
      this.drawRoad(g, pts, 'open', 0, 'all', e.sea ? 'sea' : e.style === 'dashed');
    }
    this.world.add(g);
    this.routeG = g;
  }

  /**
   * Yol (Footpath, Ömer 2026-10-19; çizgi dili Harita 1 yeniden çizim 2026-10-22): yürünmüş = parlak çizgi; gidilebilir = üç katman kor (parıltı
   * 'base', çekirdek 'dash'); görünür = ince çizgi; sis = soluk çizgi. Çatallar dahil TÜM yollar düz; yalnız cep yolu (pocket, kenar style
   * 'dashed') her durumda uzun kesik çizgi. Deniz yolu (M-J, kenar sea true; pocket 'sea') her durumda mavi kesik çizgi (gidilebilirken kor).
   */
  private drawRoad(g: Phaser.GameObjects.Graphics, pts: Pt[], ev: EdgeVis, offset: number, part: 'all' | 'base' | 'dash' = 'all', pocket: boolean | 'sea' = false): void {
    const sea = pocket === 'sea';
    const stroke = (w: number, col0: number, a: number, dashed: boolean) => {
      const col = sea && col0 === 0xeadcb4 ? 0x7fb2dc : sea && col0 === 0xe8d6a4 ? 0x9cc6ea : col0;
      g.lineStyle(w, col, a);
      if (!dashed) {
        g.beginPath();
        pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
        g.strokePath();
      } else this.dashed(g, pts, 9, 7, offset);
    };
    const dashedLine = !!pocket;
    switch (ev) {
      case 'walked':
        stroke(3, 0xe8d6a4, 0.6, dashedLine);
        break;
      case 'open':
        if (part !== 'dash') {
          stroke(10, EL.EMBER, 0.1, false);
          stroke(6, EL.EMBER, 0.16, false);
        }
        if (part !== 'base') stroke(2.6, EL.EMBER2, 0.85, dashedLine);
        break;
      case 'visible':
        stroke(2.4, 0xeadcb4, sea ? 0.6 : 0.42, dashedLine);
        break;
      default:
        stroke(2.4, 0xeadcb4, sea ? 0.2 : 0.12, dashedLine);
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

  private labelPlan = new Map<string, LabelSlot>();
  /** Haritadaki bütün ad etiketleri (şerit + sakin ad); düğüm kartı / önizleme açıkken gizlenir (Ömer: iki etiket çıkmasın). */
  private labelObjs: Phaser.GameObjects.GameObject[] = [];

  /** Koruma savaşı kazanılmış korumalı hazine / olay düğümünde yenilen karşılaşmanın adı (kafatası işareti); yoksa null. */
  /**
   * Düğüm "geçildi" görünümünde mi (soluk + devriye döngüsü)? Sis 'current'ı 'cleared'ın önüne koyar; bulunulan düğüm temizlendiyse de
   * (ör. korumalı hazinenin son adımı bitip haritaya dönülünce) soluk görünüm hemen gelir, altın "buradasın" halkası korunur.
   */
  private doneLook(id: string, v: NodeVis): boolean {
    return v === 'cleared' || (v === 'current' && isCleared(this.s, id));
  }

  private guardDefeated(n: MapNode, v: NodeVis): string | null {
    if (n.encounter && (n.type === 'treasure' || n.type === 'event') && (v === 'cleared' || isDone(this.s, n.id, 'battle'))) return enemyPreview(n.encounter).name;
    return null;
  }

  /** Şeridin alt satırı (yalnızca bulunulan / gidilebilir / üstüne gelinen düğümde görünür): tür · alt başlık, devriye yüzdesi, yenilen koruma. */
  private labelSub(n: MapNode, v: NodeVis): string {
    if (v === 'goal') return '';
    const done = this.doneLook(n.id, v);
    // seçim noktası = ana yolda birden çok çıkış (cebe sapan yol seçim sayılmaz); cep düğümü 'optional' yazar
    const choice = mainOutgoing(this.map, n.id).length > 1 && !done ? '  ·  choice' : '';
    const parts = [`${n.subtitle}${n.optional ? '  ·  optional' : ''}${choice}`];
    if (done && patrolAvailable(this.s, n.id)) parts.push(`Patrol ${Math.round(nextReplayMult(this.s, n.id) * 100)}% XP`);
    const guard = this.guardDefeated(n, v);
    if (guard) parts.push(`${guard} defeated`);
    // M-J / M-K: deniz yolu kilidi, Caravel kapısı, Caravel'in şu anki yeri
    const lock = nodeLock(this.map, this.s, n.id);
    if (lock) parts.push(lock === 'ship' ? 'Needs a ship' : `Sink ${caravelDef(this.map)?.name ?? 'the ship'} first`);
    if (caravelAt(this.map, this.s) === n.id) parts.push(`${caravelDef(this.map)!.name} is here`);
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
    // dinlenen lider (ve flaması) hiçbir ad etiketini örtmesin: etiketler onun kutusundan kaçınır
    if (this.s.at && vis[this.s.at] === 'current') {
      const lp = this.P(this.s.at);
      // playtest U1 (Ömer 2026-10-23, Ashford etiketi liderin üstüne biniyordu): kutu flamayı da kapsar (direk ~154 birim yukarı, bez elin
      // önünde ~61 birim; lider dönünce bez öbür yana geçer, iki yan da)
      placed.push({ x0: lp.x + TRAV_REST.x - 64, y0: lp.y + TRAV_REST.y - 158, x1: lp.x + TRAV_REST.x + 64, y1: lp.y + TRAV_REST.y + 8 });
    }
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
  private drawNode(n: MapNode, v: NodeVis, option: boolean, rv: RegionSets | null = null): void {
    if (v === 'fog') return;
    // Bölge görünümünde komşu bölgenin bağlantı düğümü (silik; üstüne gelince yolu sarı, dokununca o bölgeye geçilir)
    const ghost = !!rv?.ghosts.has(n.id);
    const p = this.P(n.id);
    const c = this.add.container(p.x, p.y);
    this.dyn.add(c);
    const fs = frameSpec(n.type);
    const r = fs.icon / 1.84; // ikon yarıçapı eşdeğeri (bugünkü NODE_R: 24, boss 30)
    const R = fs.R;
    const here = v === 'current';
    const doneRaw = this.doneLook(n.id, v);
    // Kasaba ziyaret edilince de solmaz (Ömer 2026-10-27); devriye gibi diğer "geçildi" davranışları doneRaw ile sürer
    const done = doneRaw && n.type !== 'town';
    const goal = v === 'goal';
    const actionable = option || (here && this.actionHere());
    if (n.type === 'town' && !goal) {
      // Fener parıltısı: sıcak, yavaşça nabız atar (azaltılmış harekette sabit)
      const lamp = this.add.image(0, 0, ensureGlow(this)).setTint(0xffb44a).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(fs.glowR * 2.4, fs.glowR * 2.4).setAlpha(0.5);
      c.add(lamp);
      if (!reducedMotion()) this.tweens.add({ targets: lamp, alpha: { from: 0.38, to: 0.62 }, scale: { from: lamp.scale, to: lamp.scale * 1.06 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
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
    shadow.fillStyle(0x000000, 0.4).fillCircle(2, 4, n.type === 'town' ? R - 22 : R - 6);
    body.add(shadow);
    const g = this.add.graphics();
    body.add(g);
    drawFrame(g, n.type);
    // boyalı düğüm ikonu (assets/misc-icons/node), yoksa ince çizgili glif; başlangıç düğümü 'start' ikonunu taşır (Ömer 2026-10-11)
    const art = nodeGlyphImage(this, n.id === this.map.start && hasMiscImage('node', 'start') ? 'start' : n.type, 0, 0, fs.icon);
    if (art) {
      if (goal) art.setTint(0x6a5e4c).setAlpha(0.6);
      else if (done) art.setTint(0x8a8272);
      body.add(art);
    } else drawNodeGlyph(g, n.type, done ? 0x7a705e : goal ? 0x7d705a : 0xd9c8a2, fs.boss ? 1.25 : 1);
    const bx = R * 0.72;
    if (goal || nodeLock(this.map, this.s, n.id)) {
      const bg = this.add.graphics();
      drawBadge(bg, 'lock', bx, bx);
      body.add(bg);
    }
    // M-K: The Black Caravel'in bulunduğu düğümde üstte küçük yelken madalyonu
    if (caravelAt(this.map, this.s) === n.id) {
      const sg = this.add.graphics();
      const sy = -R - 16;
      sg.fillStyle(0x0d0906, 0.92).fillCircle(0, sy, 14).lineStyle(1.6, 0xb8402f, 0.95).strokeCircle(0, sy, 14);
      sg.lineStyle(1.6, 0xe9d9b0, 0.95).lineBetween(-1, sy - 9, -1, sy + 7);
      sg.fillStyle(0xe9d9b0, 0.95).fillTriangle(1, sy - 8, 1, sy + 3, 9, sy + 3);
      sg.fillTriangle(-3, sy - 6, -3, sy + 3, -9, sy + 3);
      sg.fillRect(-9, sy + 6, 18, 2.4);
      c.add(sg);
    }
    // Tehlike bandı (Ömer 2026-10-26; level farkı, campaign.json > levelGap): ince renkli halka + sol üstte küçük işaret (renk körlüğü için ünlem / kafatası)
    const threat = nodeThreat(this.s, n.id);
    if (threat && threat.band !== 'normal') {
      const hex = CONFIG.levelGap.colors[threat.band];
      const col = Phaser.Display.Color.HexStringToColor(hex).color;
      const tr = this.add.graphics();
      tr.lineStyle(2.5, col, goal ? 0.55 : 0.9).strokeCircle(0, 0, R + 3);
      tr.fillStyle(0x140e09, 1).fillCircle(-R * 0.78, -R * 0.78, 11).lineStyle(1.6, col, 0.95).strokeCircle(-R * 0.78, -R * 0.78, 11);
      body.add(tr);
      if (threat.band === 'deadly') body.add(this.add.image(-R * 0.78, -R * 0.78, ensureIcon(this, 'skull', hex, false)).setDisplaySize(15, 15));
      else body.add(elText(this, -R * 0.78, -R * 0.77, '!', 16, hex).setOrigin(0.5));
    }
    // Geçilen düğüm belirgin soluk (tik yok; Ömer 2026-10-28: yapılan / yapılmayan farkı net olsun)
    if (done) body.setAlpha(0.5);
    // Devriye (serbest dolaşım, roadmap 2.10): temizlenmiş savaş düğümünde küçük döngü simgesi (yüzde şeritte: "Patrol 60%")
    const patrol = doneRaw && patrolAvailable(this.s, n.id);
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
      if (n.type === 'town') band.lineStyle(1, 0xd9b26a, goal ? 0.4 : 0.85).strokeRect(plan.x0 - 3, plan.y0 - 3, plan.w + 6, plan.h + 6); // çift altın çizgi (kasaba)
      const cx = plan.x0 + plan.w / 2 + 2;
      name.setPosition(cx, plan.y0 + (sub ? 13 : plan.h / 2));
      sub?.setPosition(cx, plan.y0 + 29);
      bandC = this.add.container(0, 0, sub ? [band, name, sub] : [band, name]);
      bandC.setAlpha(slot.hot ? 1 : 0);
      c.add(bandC);
      this.labelObjs.push(bandC);
      if (slot.q) {
        const q = slot.q;
        quiet = elText(this, q.x0 + q.w / 2, q.y0 + q.h / 2, n.name.toUpperCase(), 14, goal ? EL.DIM : '#e6d8b4', { em: 0.08 }).setOrigin(0.5, 0.5);
        quiet.setStroke('#060402', 5).setAlpha(done ? 0.55 : goal ? 0.82 : 1);
        c.add(quiet);
        this.labelObjs.push(quiet);
      }
    }
    // (sisin açık alanı renderMap > fogClearZones: bütün haritadan, görünümden bağımsız)
    if (goal) c.setAlpha(0.75);
    if (ghost) c.setAlpha(REGION_VIEW.ghostAlpha);
    if (here && this.actionHere()) this.tweens.add({ targets: shadow, scale: { from: 1, to: 1.12 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Üstüne gelince / dokununca: ışık yumuşakça açılır / söner; şerit (yoksa) belirir, kalıcı ad çekilir. Yolculuk hedefinde rota da vurgulanır.
    let fx: Phaser.Tweens.Tween[] = [];
    const setHover = (on: boolean) => {
      if (travel) this.routeHint(on ? n.id : null);
      if (ghost && rv) this.ghostHint(on ? n.id : null, rv);
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
    const hitR = (): number => Math.max(52, Math.min(touchUnits(104, MIN_TOUCH_PX / (this.baseZoom * this.mapZoom)) / 2, nearest / 2 - 2));
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
      // komşu bölgenin bağlantı düğümü: gidilebiliyorsa her zamanki gibi yürünür, değilse o bölgeye bakılır
      if (ghost && !option && !this.travelTargets().has(n.id)) {
        this.ghostHint(null, rv!);
        return this.switchFocus(n.region);
      }
      this.onNodeTap(n.id, v);
    });
    zone.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || p.isDown || busy()) return;
      setHover(true);
      this.showNodeTip(n.id, p);
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
    // W4 (Ömer 2026-10-19): yalnızca lider görünür (parti sağlığı düğüm kartında / sol sütunda); tek poz, sabit flama
    const lead = leaderOf(this.s) ?? activeHeroes(this.s)[0];
    const def = lead ? content.classes[lead.class] : undefined;
    if (!lead || !def) return;
    const p = this.P(at);
    const t = new MapTraveller(this, this.world, lead.class, def.spriteId, def.color, p.x + TRAV_REST.x, p.y + TRAV_REST.y);
    this.caravan.push(t);
    this.world.bringToTop(t.root);
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
      const lead = this.caravan[0];
      if (!lead) return;
      const p = pointAt(state.d);
      const ahead = pointAt(state.d + 4);
      // kalkışta / varışta dinlenme yerinden (düğümün solu) yola yumuşakça süzülür
      const u = Math.max(0, Math.min(1, Math.min(state.d, len - state.d) / 70));
      const r = 1 - u * u * (3 - 2 * u);
      const dx = ahead.x - p.x;
      const face: 1 | -1 = r > 0.5 || Math.abs(dx) <= 0.5 ? lead.facing() : dx < 0 ? -1 : 1;
      const x = p.x + TRAV_REST.x * r;
      const y = p.y + TRAV_REST.y * r;
      lead.place(x, y, r > 0.5 ? 1 : face, state.d > 0.5 && state.d < len - 0.5, state.d);
      this.setMid({ x, y });
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
      if (a.zoom) {
        // uzak görünüm: yakınlaştırma imlecin altındaki bölgeye girer; bölgede en küçükten de uzaklaşmak uzak görünüme döner (zoomStep)
        if (this.focus === null || (a.zoom < 0 && this.zoomGoal() <= MAP_ZOOM.min + 0.001)) this.zoomStep(a.zoom > 0 ? 1 : -1, { sx: p.x, sy: p.y });
        else if (this.time.now >= this.focusLockUntil) this.zoomAt(this.zoomGoal() + a.zoom * (ev?.ctrlKey ? 0.5 : 1), p.x, p.y, true);
      }
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
      // Kaybolmuş bir touchend ile "basılı" kalmış eski parmak ikinci parmak sayılmaz (Harita 2 playtest 2026-10-25: her dokunuş sürükleme /
      // sıkıştırma sayılıp harita uzak görünüme düşüyor, sonra hiçbir dokunuş işlemiyordu)
      const multi = this.livePointers().length > 1;
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
      if (this.livePointers().length > 1) {
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        // İki parmakla sıkıştırma: iki parmağın ortasına doğru yakınlaştırma (anlık; parmak izler)
        if (pinch > 0 && !this.modal && !this.town) {
          const r = d / pinch;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          // uzak görünümde açma = bölgeye gir; bölgede en küçük yakınlaştırmada kapama = uzak görünüm (eşik: birikmiş oran, data değil dokunuş hissi)
          const atMin = this.focus !== null && this.mapZoom <= MAP_ZOOM.min + 0.001 && r < 1;
          if (this.focus === null || atMin) {
            this.pinchAcc *= r;
            if (this.focus === null && this.pinchAcc > 1.2) {
              this.pinchAcc = 1;
              this.zoomStep(1, { sx: mx, sy: my });
            } else if (atMin && this.pinchAcc < 0.83) {
              this.pinchAcc = 1;
              this.zoomStep(-1);
            }
          } else {
            this.pinchAcc = 1;
            if (this.time.now >= this.focusLockUntil) this.zoomAt(this.mapZoom * r, mx, my, false, true);
          }
        } else this.pinchAcc = 1;
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
      if (this.livePointers().length) return;
      this.drag.down = false;
      this.time.delayedCall(0, () => (this.drag.moved = false));
    });
  }

  /** Gerçekten basılı parmaklar (pointer1/2): basışı en yeni basıştan PINCH_STALE_MS'den eski olan "takılı" sayılmaz. */
  private livePointers(): Phaser.Input.Pointer[] {
    const down = [this.input.pointer1, this.input.pointer2].filter((q) => q?.isDown);
    const latest = Math.max(0, ...down.map((q) => q.downTime));
    return down.filter((q) => latest - q.downTime < PINCH_STALE_MS);
  }

  private camZoom(): number {
    return stageView.zoom * this.baseZoom * this.mapZoom;
  }

  /** Görünen dünya alanı (tuval / gerçek yakınlaştırma). */
  private viewSize(): { w: number; h: number } {
    const z = this.camZoom();
    return { w: (stageView.canvasW || W) / z, h: (stageView.canvasH || H) / z };
  }

  /** Kamera ortasını ayarlar (çerçeveye kısılır). */
  private setMid(p: Pt): void {
    this.mid = clampMid(p, this.panFrame(), this.viewSize());
    this.cameras.main.centerOn(this.mid.x, this.mid.y);
  }

  /** Düğmeler / ok tuşları: yumuşak kaydırma (art arda basışlar hedefe eklenir). */
  private panBy(dx: number, dy: number): void {
    const base = this.panTween?.isPlaying() && this.panTarget ? this.panTarget : this.mid;
    const from = { ...this.mid };
    const to = clampMid({ x: base.x + dx, y: base.y + dy }, this.panFrame(), this.viewSize());
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
      this.mid = zoomTowardMid({ x: world.x, y: world.y }, off, this.camZoom(), this.panFrame(), this.viewSize());
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

  // ------------------------------------------------------------ bölge görünümü (Harita 1 yeniden çizim, Ömer 2026-10-22; src/game/region-view.ts)

  /** Yakınlaştırma 1'de görünen dünya alanı (render ölçeğiyle). */
  private view1(): { w: number; h: number } {
    return { w: (stageView.canvasW || W) / stageView.zoom, h: (stageView.canvasH || H) / stageView.zoom };
  }

  /** Odağın taban yakınlaştırması ve ortası. Bölge: bölge sığar, görseli kaplar; uzak görünüm (null): bütün harita (görseli kaplayan en küçük ölçek, en az 1). */
  private regionTarget(region: string | null, mapZoom: number = this.mapZoom || this.regionMapZoom()): { z: number; mid: Pt | null } {
    if (!region) return { z: regionZoom(this.frame, this.view1(), this.frame, 1), mid: { x: W / 2, y: H / 2 } };
    // playtest U1 + Harita 2 (2026-10-25): bölge HUD'sız güvenli alana sığar, takımın durağı güvenli alanda (Your party sütununun altında değil)
    const pts = this.map.nodes.filter((n) => n.region === region).map((n) => this.P(n.id));
    const here = this.map.nodes.find((n) => n.id === this.s.at);
    return regionCamera({ pts, frame: this.frame, pan: this.pan, view1: this.view1(), ins: this.hudInsets(), mapZoom, focus: here?.region === region ? this.P(here.id) : null });
  }

  /** HUD payları (sahne birimi): sol sütun (Your party, Gear / Formation), üst bant (Valor, bölge adı), alt sağ düğmeler. */
  private hudInsets(): HudInsets {
    const k = this.compact() ? COL_K : 1;
    const size = touchUnits(56);
    // üst: ortadaki harita adı + bölge adı kutusu; alt: sağ alttaki − + ? kümesi (renderControls: 3 düğme, 8 boşluk, kenardan 36)
    return { left: (SIDE.left + SIDE.partyW) * k, top: REGION_VIEW.hudTop, right: 0, bottom: 36 + size + 12, topHalfW: REGION_VIEW.hudTopHalfW * k, bottomW: 36 + 3 * size + 2 * 8 };
  }

  /**
   * Kaydırma çerçevesi: harita görselinin kapsamı, kenar taşması dahil (Harita 2 playtest 2026-10-25: HUD payı kadar görsel dışına taşmak
   * panellerin arkasında siyah gösteriyordu; seçenek (a): görsel kenarlardan genişletildi, tools/make-map-ext.mjs).
   */
  private panFrame(): Bounds {
    return this.pan;
  }

  /** Bölgeye girerken oyuncu yakınlaştırmasının başlangıcı (telefonda biraz yakın; create ile aynı). Uzak görünümde hep MAP_ZOOM.min. */
  private regionMapZoom(): number {
    return this.compact() ? 1.2 : MAP_ZOOM.min;
  }

  /**
   * Odağı bir bölgeye (null = uzak görünüm) taşır: kamera bölgeye yakınlaşır, görsele kilitli kalır (clampMid). Haritayı yeniden çizmez
   * (çağıran çizer). Yürürken kamera kafileyi izlediği için yalnız yakınlaştırma değişir. Süre data/ui-motion.json > mapRegion.moveMs.
   */
  private setFocus(region: string | null, anim: boolean): void {
    const was = this.focus;
    this.focus = region;
    // uzak görünüm: oyuncu yakınlaştırması en küçükte; uzaktan bölgeye girerken başlangıç değerine döner (bölgeden bölgeye geçişte korunur)
    const mz = region === null ? MAP_ZOOM.min : was === null ? this.regionMapZoom() : this.mapZoom;
    const t = this.regionTarget(region, mz);
    const cam = this.cameras.main;
    this.regionTween?.stop();
    this.regionTween = null;
    this.zoomTween?.stop();
    this.zoomTarget = null;
    const follow = !!this.walking || !t.mid;
    const to = t.mid ?? this.mid;
    const apply = (z: number, m: number, x: number, y: number) => {
      this.baseZoom = z;
      this.mapZoom = m;
      cam.setZoom(this.camZoom());
      this.setMid(follow ? this.mid : { x, y });
    };
    const dur = motion('mapRegion').moveMs;
    if (!anim || dur <= 0) return apply(t.z, mz, to.x, to.y);
    this.focusLockUntil = this.time.now + dur;
    const from = { z: this.baseZoom, m: this.mapZoom, x: this.mid.x, y: this.mid.y };
    const o = { k: 0 };
    this.regionTween = this.tweens.add({
      targets: o,
      k: 1,
      duration: dur,
      ease: 'Sine.easeInOut',
      onUpdate: () => apply(from.z + (t.z - from.z) * o.k, from.m + (mz - from.m) * o.k, from.x + (to.x - from.x) * o.k, from.y + (to.y - from.y) * o.k),
    });
  }

  /**
   * Görünümü değiştirir (bölge ya da null = uzak görünüm; Ömer 2026-10-23, mockup maps-2-3): kamera kayarken düğüm katmanı / bölge işaretleri
   * kısa sönüp belirir (data/ui-motion.json > mapRegion), sonra harita ve üst ortadaki bölge adı yeniden çizilir. Yürürken uzak görünüme geçilmez.
   */
  private switchFocus(region: string | null, anim = true): void {
    const stale = region !== null && region === this.focus && this.markers.length > 0; // uzak görünüm çizili ama odak bölgede: onar
    if ((region === this.focus && !stale) || (region === null && this.walking)) return;
    if (region !== null && !this.map.regions.some((r) => r.id === region)) return;
    if (stale) this.focus = null;
    this.hideNodeTip();
    this.overHover = null;
    for (const t of this.fadeTweens) t.stop();
    this.fadeTweens = [];
    this.setFocus(region, anim);
    const m = motion('mapRegion');
    const layers = [this.dyn, ...(this.over ? [this.over] : [])];
    const redraw = () => {
      this.renderMap(false);
      this.renderHud();
    };
    if (!anim || m.fadeOutMs + m.fadeInMs <= 0) {
      layers.forEach((l) => l.setAlpha(1));
      return redraw();
    }
    this.fadeTweens.push(
      this.tweens.add({
        targets: layers,
        alpha: 0,
        duration: m.fadeOutMs,
        ease: 'Sine.easeIn',
        onComplete: () => {
          redraw();
          const now = [this.dyn, ...(this.over ? [this.over] : [])];
          now.forEach((l) => l.setAlpha(0));
          this.fadeTweens.push(this.tweens.add({ targets: now, alpha: 1, duration: m.fadeInMs, ease: 'Sine.easeOut' }));
        },
      }),
    );
  }

  /** Debug: belirli bir bölgeye bak (null = uzak görünüm, bölge haritası). */
  debugRegionView(region: string | null): void {
    this.switchFocus(region);
  }

  /** Yakınlaştırma adımı (− / + düğmesi, klavye, tekerlek): uzak görünümde + bölgeye girer; bölgede en küçük yakınlaştırmada − uzak görünüme döner. */
  private zoomStep(dir: 1 | -1, at?: { sx: number; sy: number }): void {
    if (this.time.now < this.focusLockUntil) return;
    if (this.focus === null) {
      if (dir < 0) return;
      const w = at ? this.cameras.main.getWorldPoint(at.sx, at.sy) : null;
      const hit = w && regionAt(this.map, this.markers, (id) => this.P(id), w.x, w.y);
      const locked = !!hit && !!this.markers.find((m) => m.id === hit)?.locked; // görülmemiş bölgeye girilmez: kafilenin bölgesi açılır
      return this.switchFocus((!locked && hit) || this.partyRegion);
    }
    if (dir < 0 && this.zoomGoal() <= MAP_ZOOM.min + 0.001) return this.switchFocus(null);
    if (at) this.zoomAt(this.zoomGoal() + dir * MAP_ZOOM.step, at.sx, at.sy, true);
    else this.setMapZoom(this.mapZoom + dir * MAP_ZOOM.step);
  }

  /**
   * Uzak görünüm katmanı (mockup maps-2-3 > farSvg): her bölge için sade işaret (altın halkalı madalyon + Roma rakamı, büyük harf ad, "N stops ·
   * 1 boss"), işaretler arası soluk ana yol, bölgenin düğümleri çevresinde hover'da belirginleşen yumuşak parıltı. Bölgeye dokunmak / tıklamak
   * o bölgeye girer (bütün harita tek dokunma alanı: en yakın bölge açılır). Odak varken katman boş.
   */
  private renderOverview(): void {
    if (!this.over) this.over = this.add.container(0, 0);
    const L = this.over;
    if (!this.world.exists(L)) this.world.add(L);
    L.removeAll(true);
    this.overFx = new Map();
    this.markers = [];
    this.overHover = null;
    this.world.bringToTop(L);
    if (this.focus !== null) return;
    const H0 = REGION_VIEW.markerH;
    // telefonda işaret büyür (yazı okunur kalsın); asıl dokunma hedefi bölgenin tamamı
    const scale = Math.min(2, Math.max(1, touchUnits(H0, 30) / H0, this.compact() ? COL_K : 1));
    const NAME = 22;
    const SUB = 17;
    const widthOf = new Map<string, number>();
    // görülmemiş bölge (Ömer 2026-10-23, open-questions 403): kilitli, adsız işaret; parıltısı yok (düğüm yerleri sızmasın), dokununca girilmez
    const seenSet = seenRegions(this.map, nodeVisibility(this.map, this.s, session.revealFog), session.revealFog);
    for (const r of this.map.regions) {
      if (!seenSet.has(r.id)) continue;
      const name = elText(this, 0, 0, regionName(r.title).toUpperCase(), NAME, '#fff', { em: 0.1 });
      const sub = elBody(this, 0, 0, regionSub(this.map, r.id), SUB, '#fff', false);
      widthOf.set(r.id, 30 * 2 + 16 + Math.max(name.width, sub.width) + 26);
      name.destroy();
      sub.destroy();
    }
    // işaretler HUD'sız güvenli alanda (sol sütun, üst bant, alt düğmeler; region-view.ts > overviewSafe)
    const safe = overviewSafe(this.frame, this.view1(), this.regionTarget(null).z * MAP_ZOOM.min, this.hudInsets());
    this.markers = overviewMarkers(this.map, (id) => this.P(id), (id) => widthOf.get(id) ?? 240, safe, scale, { W, H }, seenSet);
    const m = motion('mapRegion');
    // ana yol (mockup mainRoad: koyu gölge + açık iz + ince koyu çekirdek, ortada yön oku)
    const road = this.add.graphics();
    for (const seg of overviewRoad(this.markers)) {
      const c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(seg.a.x, seg.a.y), new Phaser.Math.Vector2(seg.c.x, seg.c.y), new Phaser.Math.Vector2(seg.b.x, seg.b.y));
      const pts = c.getPoints(40);
      for (const [w, col, a] of [[15, 0x060302, 0.32], [9, 0xeadcb4, 0.34], [3.4, 0x2a1d10, 0.3]] as const) {
        road.lineStyle(w * scale, col, a).beginPath();
        pts.forEach((p, i) => (i === 0 ? road.moveTo(p.x, p.y) : road.lineTo(p.x, p.y)));
        road.strokePath();
      }
      const at = c.getPoint(0.5);
      const tan = c.getTangent(0.5);
      const ang = Math.atan2(tan.y, tan.x);
      const rot = (x: number, y: number) => ({ x: at.x + (x * Math.cos(ang) - y * Math.sin(ang)) * scale, y: at.y + (x * Math.sin(ang) + y * Math.cos(ang)) * scale });
      const p1 = rot(-7, -8);
      const p2 = rot(5, 0);
      const p3 = rot(-7, 8);
      road.lineStyle(3 * scale, 0xf3d999, 0.6).beginPath().moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).strokePath();
    }
    L.add(road);
    // bölge parıltısı (mockup blob): düğümlerin çevresinde yumuşak altın ışık, hover'da belirginleşir
    for (const r of this.map.regions) {
      if (!seenSet.has(r.id)) continue;
      const glows = this.map.nodes
        .filter((n) => n.region === r.id)
        .map((n) => {
          const p = this.P(n.id);
          return this.add.image(p.x, p.y, ensureGlow(this)).setTint(0xf3d999).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(260, 260).setAlpha(0.1);
        });
      L.add(glows);
      this.overFx.set(r.id, (on) => {
        this.tweens.killTweensOf(glows);
        this.tweens.add({ targets: glows, alpha: on ? 0.24 : 0.1, duration: m.hoverMs, ease: 'Sine.easeInOut' });
      });
    }
    // bölge işaretleri
    for (const mk of this.markers) {
      if (mk.locked) {
        L.add(this.lockedMarker(mk, scale));
        continue;
      }
      const c = this.add.container(mk.x, mk.y).setScale(scale);
      const w = mk.w / scale;
      const h = H0;
      const xl = -w / 2;
      const g = this.add.graphics();
      g.fillStyle(0x0a0704, 0.84).fillRect(xl + 18, -h / 2, w - 18, h);
      g.lineStyle(1, 0xd9b26a, 0.55).strokeRect(xl + 18.5, -h / 2 + 0.5, w - 19, h - 1);
      g.lineStyle(1, 0xd9b26a, 0.2).lineBetween(xl + 66, -h / 2 + 5, xl + w - 8, -h / 2 + 5).lineBetween(xl + 66, h / 2 - 5, xl + w - 8, h / 2 - 5);
      const hl = this.add.graphics().setAlpha(0);
      hl.lineStyle(1.5, 0xf3d999, 0.95).strokeRect(xl + 18.5, -h / 2 + 0.5, w - 19, h - 1);
      const mx = xl + 30;
      const med = this.add.graphics();
      med.fillStyle(0x1c130b, 1).fillCircle(mx, 0, 30).fillStyle(0x4a3622, 0.55).fillCircle(mx, -3, 22);
      med.lineStyle(3, 0xf0c25a, 1).strokeCircle(mx, 0, 30).lineStyle(1, 0xf3d999, 0.35).strokeCircle(mx, 0, 25);
      const num = elText(this, mx, 1, mk.id, mk.id.length > 2 ? 17 : 22, '#f3d999', { em: 0.02, weight: '700' }).setOrigin(0.5, 0.5);
      const tx = mx + 30 + 16;
      const name = elText(this, tx, -10, mk.name.toUpperCase(), NAME, '#f3d999', { em: 0.1 }).setOrigin(0, 0.5);
      const sub = elBody(this, tx, 15, mk.sub, SUB, '#cfbf9a', false).setOrigin(0, 0.5);
      c.add([g, hl, med, num, name, sub]);
      L.add(c);
      const prev = this.overFx.get(mk.id);
      this.overFx.set(mk.id, (on) => {
        prev?.(on);
        this.tweens.killTweensOf([c, hl]);
        const lift = reducedMotion() ? 0 : m.lift;
        this.tweens.add({ targets: c, y: mk.y - (on ? lift : 0), duration: m.hoverMs, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: hl, alpha: on ? 1 : 0, duration: m.hoverMs, ease: 'Sine.easeOut' });
      });
    }
    // dokunma alanı: bütün çerçeve (ölü alan yok); dokunuş = basıp aynı bölgede bırakmak (sürükleme sayılmaz)
    const f = this.pan;
    const zone = this.add.zone((f.left + f.right) / 2, (f.top + f.bottom) / 2, f.right - f.left, f.bottom - f.top).setInteractive({ useHandCursor: true });
    const busy = () => !!this.walking || !!this.modal || this.menuOpen || !!this.town;
    const pick = (p: Phaser.Input.Pointer, near?: number) => {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      return regionAt(this.map, this.markers, (id) => this.P(id), w.x, w.y, near);
    };
    const hover = (id: string | null) => {
      if (id === this.overHover) return;
      if (this.overHover) this.overFx.get(this.overHover)?.(false);
      this.overHover = id;
      if (id) this.overFx.get(id)?.(true);
    };
    let downAt: string | null = null;
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || busy()) return;
      hover(pick(p, REGION_VIEW.hoverR));
    });
    zone.on('pointerout', () => hover(null));
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      downAt = busy() ? null : pick(p);
      if (p.wasTouch && downAt) hover(downAt);
    });
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const id = downAt;
      downAt = null;
      if (p.wasTouch) hover(null);
      if (!id || this.drag.moved || busy() || pick(p) !== id) return;
      if (this.markers.find((m) => m.id === id)?.locked) return this.toast('Not yet discovered');
      this.switchFocus(id);
    });
    L.addAt(zone, 0);
  }

  /**
   * Bölgedeyken boş harita alanına dokunmak / tıklamak uzak görünüme döner (Ömer 2026-10-23, open-questions 403; üst ortadaki bölge adıyla
   * aynı geçiş). Boş = düğüm dokunma çemberi, düğüm adı şeridi ve sol sütun dışında. Dokunuş = basış ve bırakış boş alanda, arada sürükleme /
   * sıkıştırma yok; yürürken, pencere / menü / kasaba açıkken ve bölge geçişi sürerken çalışmaz. Düğüm ipucu açıksa ilk dokunuş yalnız onu kapatır
   * (sabit düğüm kartının kendi karartması dokunuşu zaten yutar).
   */
  private bindEmptyTap(): void {
    const zone = this.add.zone(W / 2, H / 2, W * 8, H * 8).setInteractive();
    this.world.add(zone);
    let armed = false;
    const busy = () => this.focus === null || this.inputBusy() || isInputLocked() || this.time.now < Math.max(this.focusLockUntil, this.emptyTapAt);
    const empty = (p: Phaser.Input.Pointer): boolean => {
      const ui = this.uiPoint(p);
      if (ui.x < stageView.left + (SIDE.left + SIDE.partyW) * (this.compact() ? COL_K : 1)) return false; // sol sütun (kafile)
      if (!this.focus) return false;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      const rv = regionSets(this.map, this.focus, nodeVisibility(this.map, this.s, session.revealFog));
      // düğüm çevresinde geniş pay: rozete yakın dokunuş hiçbir zaman "boş alan" sayılmaz (uzak görünüme atmaz)
      const r = 1.6 * Math.max(60, touchUnits(104, MIN_TOUCH_PX / (this.baseZoom * this.mapZoom)) / 2 + 8);
      const spots = [...rv.inside, ...rv.ghosts].map((id) => {
        const c = this.P(id);
        const slot = this.labelPlan.get(id);
        const boxes = [slot?.b, slot?.q].filter((b): b is LabelPlace => !!b).map((b) => ({ x0: c.x + b.x0, y0: c.y + b.y0, w: b.w, h: b.h }));
        return boxes.length ? boxes.map((box) => ({ x: c.x, y: c.y, r, box })) : [{ x: c.x, y: c.y, r }];
      });
      return isEmptyMapPoint(w.x, w.y, spots.flat());
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      armed = false;
      if (p.button !== 0 || busy()) return;
      if (this.nodeTip) return this.hideNodeTip(); // açık ipucu: ilk dokunuş yalnız onu kapatır
      armed = empty(p);
    });
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const ok = armed;
      armed = false;
      if (!ok || this.drag.moved || busy() || !empty(p)) return;
      this.switchFocus(null);
    });
  }

  /** Görülmemiş bölgenin işareti: yalnız soluk madalyon + küçük kilit (ad, Roma rakamı, durak sayısı yok). */
  private lockedMarker(mk: OverviewMarker, scale: number): Phaser.GameObjects.Container {
    const c = this.add.container(mk.x, mk.y).setScale(scale).setAlpha(0.62);
    const g = this.add.graphics();
    g.fillStyle(0x0a0704, 0.9).fillCircle(0, 0, 30).lineStyle(2, 0x8a7246, 1).strokeCircle(0, 0, 30).lineStyle(1, 0x8a7246, 0.35).strokeCircle(0, 0, 25);
    // kilit: kemer + gövde + anahtar deliği
    g.lineStyle(3, 0xbfa477, 1).beginPath().arc(0, -5, 7, Math.PI, 0, false).strokePath();
    g.lineBetween(-7, -5, -7, -1).lineBetween(7, -5, 7, -1);
    g.fillStyle(0xbfa477, 1).fillRect(-10, -1, 20, 15);
    g.fillStyle(0x0a0704, 1).fillCircle(0, 5, 2.5).fillRect(-1, 5, 2, 5);
    c.add(g);
    return c;
  }

  /** Komşu bağlantı düğümünün üstüne gelince bölgeden ona giden yol(lar) hafif sarı (null = kaldır). */
  private ghostHint(id: string | null, rv: RegionSets): void {
    this.ghostG?.destroy();
    this.ghostG = null;
    if (!id) return;
    const g = this.add.graphics();
    for (const e of rv.ghostRoads) {
      if (e.from !== id && e.to !== id) continue;
      const pts = this.curve(e.from, e.to).getPoints(48);
      g.lineStyle(4, REGION_VIEW.hoverColor, REGION_VIEW.hoverAlpha).beginPath();
      pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.strokePath();
    }
    this.dyn.addAt(g, this.roadLayers); // yolların üstünde, düğümlerin altında
    this.ghostG = g;
  }

  /** − + düğmeleri sınırlarda soluk (uzak görünüm / bölge kuralı: zoomStep). */
  private updatePanButtons(): void {
    const b = this.panBtns;
    if (!b.minus) return;
    // uzak görünümde − soluk (zaten en uzak), + bölgeye girer; bölgede − en küçükte de açık (uzak görünüme döner)
    b.minus.setAlpha(this.focus !== null ? 1 : 0.3);
    b.plus?.setAlpha(this.focus === null || this.mapZoom < MAP_ZOOM.max - 0.001 ? 1 : 0.3);
  }

  /**
   * Kameralar (kurulumda ve ekran boyutu değişince): tuval boyutu, render ölçeği; harita kamerası baktığı noktayı korur (çerçeveye kısılı);
   * arayüz kamerası 1920x1080 arayüzü ortalar, sütunlar görünen alanın kenarlarına yeniden yerleşir.
   */
  private layoutCameras(first: boolean): void {
    const cam = this.cameras.main;
    cam.setSize(stageView.canvasW, stageView.canvasH);
    this.baseZoom = this.regionTarget(this.focus).z; // yeni ekran boyunda da bölge (uzak görünümde bütün harita) sığar, görsel kaplar
    cam.setZoom(this.camZoom());
    this.setMid(this.mid);
    this.uiCam.setSize(stageView.canvasW, stageView.canvasH);
    this.uiCam.setZoom(stageView.zoom);
    this.uiCam.centerOn(W / 2, H / 2);
    if (!first) {
      if (this.compact() !== this.drawnCompact) this.renderMap(false);
      else if (this.focus === null) this.renderOverview(); // işaret ölçeği ekran boyuna bağlı
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
    this.renderRegionCrumb((left + right) / 2, k);
    this.renderColumn(left + SIDE.left, SIDE.top + (this.compact() ? 16 : 0)); // telefonda büyük Back düğmesinin altında kalsın
    this.renderControls();
    if (session.notice) {
      this.toast(session.notice);
      session.notice = '';
    }
  }

  /**
   * Bölge adı / uzak görünüm ipucu (Ömer 2026-10-23, mockup maps-2-3 > .crumb / .back / .hint). Bölgedeyken üst ortada, harita adının altında
   * "‹ (madalyon) BÖLGE ADI": dokununca uzak görünüme döner (sol üst Back ana menünündür; mockup'taki "Back to map" bu yüzden buraya taşındı).
   * Uzak görünümde alt ortada "Pick a region to zoom in".
   */
  private renderRegionCrumb(cx: number, k: number): void {
    const m = motion('mapRegion');
    if (this.focus === null) {
      const t = elText(this, cx, H - 44 * k, 'Pick a region to zoom in', 15 * k, '#f3d999', { em: 0.22 }).setOrigin(0.5, 0.5).setAlpha(0);
      t.setStroke('#060402', 4);
      this.hud.add(t);
      this.tweens.add({ targets: t, alpha: 0.85, duration: m.fadeInMs, ease: 'Sine.easeOut' });
      return;
    }
    const r = this.map.regions.find((x) => x.id === this.focus);
    if (!r) return;
    const y = 100 + (this.compact() ? 6 : 0);
    const c = this.add.container(cx, y).setScale(k);
    const name = elText(this, 0, 0, regionName(r.title).toUpperCase(), 18, '#f3d999', { em: 0.14 }).setOrigin(0, 0.5);
    name.setStroke('#060402', 4);
    const R = 15;
    const w = 22 + 8 + R * 2 + 10 + name.width;
    const x0 = -w / 2;
    const chev = this.add.graphics();
    const drawChev = (on: boolean) => {
      chev.clear();
      chev.lineStyle(2.4, on ? 0xffe2a0 : 0xd9c8a2, 1).beginPath().moveTo(x0 + 14, -8).lineTo(x0 + 6, 0).lineTo(x0 + 14, 8).strokePath();
    };
    drawChev(false);
    const mx = x0 + 22 + 8 + R;
    const med = this.add.graphics();
    med.fillStyle(0x1c130b, 0.95).fillCircle(mx, 0, R).lineStyle(2, 0xf0c25a, 1).strokeCircle(mx, 0, R);
    const num = elText(this, mx, 1, r.id, r.id.length > 2 ? 11 : 14, '#f3d999', { em: 0.02, weight: '700' }).setOrigin(0.5, 0.5);
    name.setX(mx + R + 10);
    c.add([chev, med, num, name]);
    const hitH = Math.max(48, touchUnits(48) / k);
    const zone = this.add.zone(0, 0, w + 28, hitH).setInteractive({ useHandCursor: true });
    c.addAt(zone, 0);
    const lift = reducedMotion() ? 0 : m.lift;
    const hover = (on: boolean) => {
      drawChev(on);
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, y: y - (on ? lift : 0), duration: m.hoverMs, ease: 'Sine.easeOut' });
      name.setColor(on ? '#ffe2a0' : '#f3d999');
      tip.setVisible(on);
    };
    const tip = elBody(this, cx, y + 34 * k, 'Back to the whole map', 15 * k, EL.NOTE).setOrigin(0.5, 0.5).setVisible(false);
    tip.setStroke('#060402', 4);
    zone.on('pointerover', (p: Phaser.Input.Pointer) => !p.wasTouch && hover(true));
    zone.on('pointerout', () => hover(false));
    zone.on('pointerup', () => {
      if (this.modal || this.menuOpen || this.town || this.walking) return;
      hover(false);
      this.switchFocus(null);
    });
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: m.fadeInMs, ease: 'Sine.easeOut' });
    this.hud.add([c, tip]);
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
    // Tutorial kadrosu (playtest H2, Ömer 2026-10-23): "Temporary company" (Ashford'da veda edecekler; puan harcamak serbest kalır)
    const head = elText(this, 0, 0, temporaryCompany(s) ? (CONFIG.texts['tutorialCompany'] ?? 'Your party') : 'Your party', 14, 'rgba(217,178,106,0.85)', { em: 0.22 }).setOrigin(0, 0.5);
    col.add(head);
    let headRoom = w;
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
      headRoom = w - cw - 10;
    }
    fitW(head, headRoom); // uzun başlık ("Temporary company") puan çipiyle çakışmasın
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
      // Yara (V1 "Scar + dots"): çubuğun sağ ucunda yara bölümü (her yara = %20), rol satırının sağında 3 elmas nokta
      const wn = fallen ? 0 : woundCount(h);
      const wr = woundRules();
      const wf = wn ? woundHpFactor(wn, wr) : 1;
      const barW = w - tx;
      // Crown Surge Ashen Taint: maks canı düşürür (yaralarla çarpımsal); rol satırında "Taint ×N"
      const tn = fallen ? 0 : taintOf(h);
      const tf = taintHpFactor(tn);
      const bar = hpBar(this, tx, 30, barW, 8, h.hpRatio * wf * tf);
      const hpTxt = session.showHp && !fallen ? ` · ${Math.round(h.hpRatio * wf * tf * 100)}%` : '';
      const meta = fallen ? (s.valor !== undefined ? 'Fallen · revive: Valor' : 'Fallen') : `${def.role ?? ''}${hpTxt}${tn ? ` · Taint ×${tn}` : ''}`;
      const pipsW = wn ? (wr.lethal - 1) * 17 + 12 + 6 : 0;
      const role = fitW(elBody(this, tx, 55, meta, 16, fallen ? '#d88a7e' : EL.MUTED, false).setOrigin(0, 0.5), w - tx - pipsW);
      row.add([pic, face, frame, name, lv, bar, role]);
      let woundZone: Phaser.GameObjects.Zone | null = null;
      if (wn) {
        const sw = Math.round((barW - 2) * (1 - wf));
        row.add(woundScar(this, tx + barW - 1 - sw, 31, sw, 6, motion('card').inMs));
        row.add(woundPips(this, w - pipsW + 6, 55, wn, wr.lethal).g);
        // Üstüne gelince A Band ipucu (çubuk + noktalar); satırın kendi hover'ı ayrı kalır
        const hz = this.add.zone(tx + barW / 2, 43, barW + 8, 44).setInteractive();
        let wtip: Phaser.GameObjects.Container | null = null;
        const hideW = () => {
          wtip?.destroy(true);
          wtip = null;
        };
        hz.on('pointerover', () => {
          hideW();
          wtip = this.woundTipBox(h, wn, wr, () => {
            const m = col.getWorldTransformMatrix();
            return { x: m.tx + (w + 20) * k, y: m.ty + (row.y + 4) * k };
          });
        });
        hz.on('pointerout', hideW);
        hz.on('pointerup', () => !this.drag.moved && this.openHero(h.id, undefined, pts(h) > 0 ? 'char' : undefined));
        row.once('destroy', hideW);
        row.add(hz);
        woundZone = hz;
      }
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
      if (woundZone) row.bringToTop(woundZone); // çubuk / nokta bölgesi satırın üstünde: ipucu oradan açılır
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

  /**
   * Kapının düğümüne dokunuldu (Ömer 2026-10-27): savaş yerine ekran kararır, yalnızca Formation düğmesi aydınlık ve parlar, mentor kutusu
   * (ders formation_new_hero, düğmesiz) açıklar. Formation açılana kadar harita düğümleri, Gear, Menu ve diğer düğmeler çalışmaz
   * (formationLocked; DOM düğmeleri lesson-box.css > html[data-tut-lock='formation']). Kilit zaten açıksa kutu sallanır, düğme bir kez çakar.
   */
  private formationSpotlight(): void {
    if (this.formationLock) return this.nudgeFormationLock();
    this.closeModal();
    this.tip?.destroy(true); // ipucu kartı gizlenir (görüldü sayılmaz; kapı geçince yeniden gelir)
    this.tip = null;
    this.tipIsArrange = false;
    closeAllLessons(); // açık başka ders kutusu kapıyı bekletmesin
    const h = showGateLesson('formation_new_hero');
    if (!h) return; // ayar kapalı: kapı yok
    this.formationLock = h;
    document.documentElement.dataset.tutLock = 'formation';
    this.syncCampHud();
    this.campHud?.pulse('formation');
  }

  /** Kilit açık mı (kapı geçtiyse ya da ayar kapandıysa kendiliğinden kalkar). */
  private formationLocked(): boolean {
    if (this.formationLock && !this.formationDue()) this.releaseFormationLock();
    return !!this.formationLock;
  }

  private nudgeFormationLock(): void {
    nudgeLesson();
    this.campHud?.pulse('formation');
  }

  private releaseFormationLock(): void {
    const h = this.formationLock;
    this.formationLock = null;
    h?.done();
    if (document.documentElement.dataset.tutLock === 'formation') delete document.documentElement.dataset.tutLock;
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
    const enc = encounterAt(this.map, s, n);
    if (enc && vis !== 'goal') {
      const p = enemyPreview(enc);
      leaderName = p.leader && !p.names.includes(p.leader) ? p.leader : '';
      foes = p.names.join(', ');
      faces = p.classes.filter((c) => !!content.classes[c]).slice(0, 6);
    } else if (vis !== 'goal')
      blurb = n.type === 'town' ? 'Leave tired heroes at the inn, recruit and trade. The town itself does not heal you.' : n.type === 'treasure' ? 'A cache of gear and gold.' : n.type === 'event' ? 'A crossroads encounter.' : n.type === 'rest' ? (CONFIG.texts['camp'] ?? 'Make camp once: rest, tend a wound, sharpen a blade or train.') : n.type === 'merchant' ? 'Odo the Peddler sells gear and buys yours.' : '';
    const after = vis === 'goal' ? [] : outgoing(this.map, id).map((a) => node(this.map, a));
    const then = after.map((a) => `${a.name} (${TYPE_LABEL[a.type]})`).join(' or ');
    // Devriye: temizlenmiş savaş düğümüne dönülünce aynı düşmanlar, ödül azalan getiriyle (sıradaki oynanışın yüzdesi)
    if (patrol) blurb = `Patrols return here. Full gold and items, ${Math.round(nextReplayMult(s, id) * 100)}% of the first victory's XP, no Valor.`;
    return { kind, state, foes, leader: leaderName, then, next: after.map((a) => ({ name: a.name, type: a.type })), blurb, faces };
  }

  /**
   * Düğüm kartı içeriği (önizleme ve ulaşılamayan düğüm): savaş düğümünde düşman portreleri + lore, diğerlerinde düğümün kendi bilgisi
   * (eski hover kartının blurb'ü); devriyede mevcut devriye metni.
   */
  private cardInfoFor(id: string): { title?: string; actionLabel?: string; foes?: FoeGroup[]; fallback?: { text: string }; info?: { text: string; plain?: boolean }; tags?: PatrolTags; chain?: string; company?: CompanyCard } {
    const n = node(this.map, id);
    const f = this.nodeFacts(id);
    const vis = nodeVisibility(this.map, this.s, session.revealFog)[id];
    const enc = encounterAt(this.map, this.s, n);
    const lock = nodeLock(this.map, this.s, id);
    const lockInfo = lock === 'ship' ? 'Needs a ship. Charter one at the Ferry Office in Saltmere to cross the sea lanes.' : lock === 'caravel' ? `${caravelDef(this.map)?.name ?? 'The Black Caravel'} guards this water. Find it on the sea lanes and sink it first.` : '';
    const caravelHere = !!enc && enc !== nodeEncounter(n, this.s);
    if (enc && vis !== 'goal') {
      const patrol = f.state === 'Patrol' && !caravelHere;
      // B1 Salvage Dive: derinlik savaşı bekliyorsa kart o derinliğin düşmanlarını gösterir
      const st = id === this.s.at ? nextStep(this.s) : null;
      const depth = st?.kind === 'battle' && st.dive ? st : null;
      const g = foeGroups(depth ? depth.encounter : enc);
      // A1 Wayshrine: sınav kuralı + nimet; dalış düğümü: kısa kural (oyun içi metin)
      const sh = shrineOf(n);
      const side = lockInfo
        ? lockInfo
        : caravelHere
          ? `${caravelDef(this.map)!.name} lies here. Sail in and you must fight it. It moves one stop each time you move.`
          : depth
        ? `Depth ${depth.dive} of ${diveMax(n)}. If you fall here, the last chest you found sinks.`
        : sh
          ? `${sh.trial} Win the trial: ${sh.name} (${sh.effect}) for the rest of the campaign.${(this.s.boons ?? []).includes(n.shrine!) ? ' Already earned.' : ''}`
          : diveMax(n) > 1 && !patrol
            ? `Salvage Dive: after this fight you may dive up to ${diveMax(n) - 1} ${diveMax(n) - 1 === 1 ? 'depth' : 'depths'} deeper, one more fight each with no healing between, for better chests.`
            : '';
      const chain = depth ? diveChainLine(depth.dive ?? 0) : null;
      const company = patrol || depth ? undefined : companyCard(enc);
      return { ...(company ? { company } : {}), ...(patrol ? { title: 'Fight the patrol?', ...this.patrolCard(id) } : side ? { info: { text: side } } : {}), ...(chain ? { chain } : {}), foes: g.groups, ...(g.info ? { fallback: g.info } : {}) };
    }
    const t = PLACE_CARD[n.type];
    return { ...(t ? { title: t.title, actionLabel: t.action } : {}), ...(lockInfo ? { info: { text: lockInfo } } : {}), ...(f.blurb ? { fallback: { text: f.blurb } } : {}) };
  }

  /** Düğmenin yerine geçen düz not: ulaşılamayan düğümde "Not reachable yet", diğerlerinde durum. */
  private cardNote(id: string): string {
    const lock = nodeLock(this.map, this.s, id);
    if (lock) return lock === 'ship' ? 'Needs a ship' : `Sink ${caravelDef(this.map)?.name ?? 'the ship'} first`;
    const st = this.nodeFacts(id).state;
    return st === 'Ahead' || st === 'Your goal' ? 'Not reachable yet' : st;
  }

  /**
   * Fare önizlemesi (Ömer 2026-10-23, tek kart iki adım): üstüne gelince AYNI "Start battle?" kartı düğmesiz açılır (src/ui/start-battle.ts
   * preview); tıklayınca sabitlenir (nodeCard), fare çekilince kapanır. Dokunmatikte açılmaz (ilk dokunuş kartı sabit açar).
   */
  private showNodeTip(id: string, p: Phaser.Input.Pointer): void {
    this.hideNodeTip();
    if (p.wasTouch || this.modal || nodeVisibility(this.map, this.s, session.revealFog)[id] === 'fog') return;
    const root = document.getElementById('ui-root');
    if (!root) return;
    const n = node(this.map, id);
    const o = this.cardInfoFor(id);
    const info = o.info ?? startCardInfo(n.lore, o.fallback?.text ? o.fallback : undefined);
    const unreachable = this.nodeFacts(id).state === 'Ahead' || this.nodeFacts(id).state === 'Your goal';
    this.nodeTip = openStartBattle(root, {
      ...(o.title ? { title: o.title } : {}),
      ...(o.actionLabel ? { actionLabel: o.actionLabel } : {}),
      name: n.name,
      subtitle: n.subtitle || TYPE_LABEL[n.type],
      nodeType: n.type,
      level: nodeLevel(this.s.mapId, id),
      ...this.threatOpt(id),
      ...(o.chain ? { chain: o.chain } : {}),
      ...(o.foes ? { foes: o.foes } : {}),
      ...(info ? { info } : {}),
      ...(o.tags ? { tags: o.tags } : {}),
      ...(o.company ? { company: o.company } : {}),
      then: this.nodeFacts(id).next.map((a) => ({ name: a.name, kind: TYPE_LABEL[a.type] })),
      ...this.firstSteps(id),
      preview: true,
      ...(unreachable ? { note: 'Not reachable yet' } : {}),
      anchor: () => this.nodeCssPoint(id, root),
      onFight: () => undefined,
      onCancel: () => undefined,
    });
    this.previewId = id;
    this.syncLabels();
  }

  /** Kartın tehlike satırı (level farkı bandı); savaşmayan / tutorial / savaşılmayan düğümde boş. */
  private threatOpt(id: string): { threat?: { line: string; band: 'normal' | 'danger' | 'deadly'; name: string; color: string }; side?: { line: string; name: string; color: string } } {
    const t = nodeThreat(this.s, id);
    // Yan karşılaşma uyarısı (Ömer 2026-10-27): yol dışındaki savaş çevredeki ana yol savaşlarından belirgin güçlüyse (side-danger.ts)
    const sd = sideDanger(this.s, id);
    const side = sd ? { side: { line: SIDE_DANGER_LINE[sd.band], name: SIDE_DANGER_NAME, color: CONFIG.levelGap.colors[sd.band === 'much' ? 'deadly' : 'danger'] } } : {};
    if (!t) return side;
    return { threat: { line: threatLine(t), band: t.band, name: BAND_NAME[t.band], color: t.band === 'normal' ? '' : CONFIG.levelGap.colors[t.band] }, ...side };
  }

  /**
   * Düğüm kartı (sabit ya da fare önizlemesi) açıkken haritadaki BÜTÜN ad etiketleri gizlenir: kartın kendi adı var, düğümün şeridi altında
   * kalmasın, komşu etiketler kartın çevresinde görünmesin (Ömer: iki etiket çıkmasın). Kapanınca geri gelir. Her düğüm türü aynı yoldan geçer.
   */
  private syncLabels(): void {
    const hide = !!this.nodeTip || !!this.cardPlace;
    for (const o of this.labelObjs) if (o.scene) (o as Phaser.GameObjects.Text).setVisible(!hide);
  }

  private hideNodeTip(): void {
    if (!this.nodeTip) return;
    this.nodeTip.close();
    this.nodeTip = null;
    this.syncLabels();
    this.previewClosedFor = this.previewId;
    this.time.delayedCall(80, () => (this.previewClosedFor = null));
  }

  /** Yara ipucu (A Band; sayılar kuraldan: src/progression/wounds.ts > woundTipData). Satırın sağında belirir; görünür alandan taşmaz. */
  private woundTipBox(h: Hero, wn: number, wr: ReturnType<typeof woundRules>, at: () => { x: number; y: number }): Phaser.GameObjects.Container | null {
    const d = woundTipData(wn, wr, { baseHp: heroPanel(h).find((x) => x.id === 'hp')?.value, town: true });
    if (!d) return null;
    const c = this.compact();
    const tip = bandTip(this, {
      accent: '#c8503c',
      kind: 'Wounds',
      title: d.title,
      value: d.value,
      valueLabel: d.valueLabel,
      chips: [...(d.maxHp ? [{ text: d.maxHp, ...(d.maxed ? { tone: 'warn' as const } : {}) }] : []), ...(d.maxed ? [{ text: 'Maximum', tone: 'warn' as const }] : [])],
      lines: d.lines.map((text) => ({ text })),
      ...(d.foot ? { foot: d.foot } : {}),
      width: c ? 640 : 520,
      scale: c ? 1.3 : 1,
    });
    tip.container.setDepth(1500);
    this.ui.add(tip.container);
    const p = at();
    const x = Math.round(Math.max(stageView.left + 16, Math.min(stageView.right - tip.width - 16, p.x)));
    const y = Math.round(Math.max(16, Math.min(H - tip.height - 16, p.y)));
    tip.container.setPosition(x, y + 6).setAlpha(0);
    this.tweens.add({ targets: tip.container, alpha: 1, y, duration: motion('tooltip').inMs, ease: 'Cubic.easeOut' });
    return tip.container;
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
    // (Bölge görünümü düğmesi kaldırıldı, Ömer 2026-10-23: uzak görünüm / bölge geçişi − / + ve üst ortadaki bölge adıyla)
    this.panBtns.minus = mk('−', right - 2 * step - size / 2, 'Zoom out', () => !this.town && this.zoomStep(-1));
    this.panBtns.plus = mk('+', right - step - size / 2, this.focus === null ? 'Zoom in to your region' : 'Zoom in', () => !this.town && this.zoomStep(1));
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
    const rows = Math.ceil(types.length / 2) + 3;
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
    root.add(fitW(elBody(this, -w + 52, py, `Patrol ${Math.round(replayMult(1) * 100)}% XP: cleared, fight again`, 17, EL.TXT, false).setOrigin(0, 0.5), w - 70));
    const sy = py + 32;
    const sk = this.add.graphics();
    sk.fillStyle(0x1a0c08, 1).fillCircle(-w + 32, sy, 11.5).lineStyle(1.6, 0xb8402f, 0.9).strokeCircle(-w + 32, sy, 11.5);
    root.add([sk, this.add.image(-w + 32, sy, ensureIcon(this, 'skull', '#e9a58f', false)).setDisplaySize(15, 15)]);
    root.add(fitW(elBody(this, -w + 52, sy, 'Guards defeated', 17, EL.TXT, false).setOrigin(0, 0.5), w - 70));
    // Yol dili (2026-10-22): tüm yollar düz, yalnız cep (isteğe bağlı çıkmaz dal) yolu kesik
    const dy = sy + 32;
    const road = this.add.graphics();
    road.lineStyle(2.6, 0xeadcb4, 0.8);
    for (const x0 of [-w + 18, -w + 34]) road.lineBetween(x0, dy, x0 + 10, dy);
    root.add(road);
    root.add(fitW(elBody(this, -w + 52, dy, 'Dashed road: optional pocket', 17, EL.TXT, false).setOrigin(0, 0.5), w - 70));
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
        if (this.formationLocked()) return this.nudgeFormationLock();
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
  private dayCounter: DayCounter | null = null;

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
    // Nöbet penceresinin paneli yok: haritadaki takım figürü başlığın arkasından görünmesin (Ömer 2026-10-28)
    const showCaravan = (on: boolean): void => this.caravan.forEach((t) => t.root.setVisible(on));
    showCaravan(false);
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
        this.townSave();
        return null;
      },
      wounded: () =>
        this.s.roster
          .filter((h) => !isFallen(h) && woundCount(h) > 0 && this.s.active.includes(h.id))
          .map((h) => ({ id: h.id, name: content.classes[h.class]?.name ?? h.class, wounds: woundCount(h), blocked: valorWoundHealBlocked(this.s, h.id), ...(avatarUrl(h.class) ? { portraitUrl: avatarUrl(h.class)! } : {}) })),
      heal: (id) => {
        const why = valorWoundHealBlocked(this.s, id);
        if (why) return why;
        this.update2(healWoundWithValor(this.s, id));
        rememberShown('valor', this.s.valor ?? 0);
        this.townSave();
        return null;
      },
      onClose: () => {
        showCaravan(true);
        this.refresh(false);
      },
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
        this.townSave(); // kasabada takılan / satılan eşyalar kayda girsin (B1)
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
      if (sessionStorage.getItem('eov.debugLootXp')) {
        sessionStorage.removeItem('eov.debugLootXp');
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
    // Zafer toparlanması (playtest D6, Ömer 2026-10-23): zafer şifası (rules.victoryHeal / elit / boss) eskiden sessizdi; zafer sayısı arttıysa
    // haritaya dönüşte şeridin ikinci satırında yazar (oran veriden). Yeni yüklenen / başka seferde yazmaz.
    const recovery = this.takeRecoveryNote(s);
    const quest = this.takeQuestNote(s);
    if (quest) this.toast(quest); // A5: görev bitti (unvan + bonus)
    const ups = s.levelUps ?? [];
    if (ups.length || recovery) {
      // Tek birleşik şerit (playtest U3): "Company reached Lv 3 · 3 stat points each"; mentor ipuçları şerit sönünce sırayla gelir
      const lines = ups.map((u) => {
        const hero = s.roster.find((h) => h.id === u.heroId);
        return {
          name: content.classes[hero?.class ?? '']?.name ?? 'A hero',
          to: u.to,
          gained: u.to - u.from,
          points: statPointsBetween(u.from, u.to),
          healed: !!hero && !isFallen(hero),
        };
      });
      // level atlayan herkes tam şifa aldıysa toparlanma satırı gereksiz (yaşayan herkes atladıysa)
      const living = activeHeroes(s).filter((h) => !isFallen(h));
      const allHealed = living.length > 0 && living.every((h) => ups.some((u) => u.heroId === h.id));
      showLevelBanner(root, lines, undefined, { companySize: activeHeroes(s).length, ...(recovery && !allHealed ? { extra: recovery } : {}) });
      if (ups.length) setState(acknowledgeLevelUps(this.s));
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

  /**
   * Zafer toparlanması notu (playtest D6): son görülen zafer sayısından fazlaysa (aynı sefer) bulunulan düğümün zafer şifası oranıyla not
   * döner ve sayaç ilerler; ilk açılışta / başka seferde yalnızca sayacı kurar (kayıt yüklemesi not göstermez). Kayıt şeması değişmez.
   */
  private takeQuestNote(s: CampaignState): string | null {
    const ids = s.roster.concat(s.reserve ?? []).flatMap((h) => heroQuests(h).map((q) => q.id));
    const seen = questSeen;
    questSeen = { seed: s.seed, ids };
    if (!seen || seen.seed !== s.seed) return null;
    const q = questDef(ids.find((id) => !seen.ids.includes(id)));
    return q ? `Quest complete: ${q.title}. ${questBonusLine(q)}.` : null;
  }

  private takeRecoveryNote(s: CampaignState): string | null {
    const wins = s.stats.victories;
    const seen = recoverySeen;
    recoverySeen = { seed: s.seed, wins };
    if (!seen || seen.seed !== s.seed || wins <= seen.wins) return null;
    return victoryRecoveryNote(victoryRecovery(s));
  }

  /**
   * Sıradaki haritanın giriş penceresi (M-Q): başlık / alt başlık / giriş metni haritanın verisinden (drowned-reach.json > intro).
   * "Set out" geçişi yapar (state.ts > continueToMap), kaydeder (otomatik kayıt; Ironman da) ve sahneyi yeni haritayla yeniden kurar.
   */
  private mapIntro(mapId: string): void {
    const m = getMap(mapId);
    this.closeModal();
    this.modal = openModal(this, this.ui, {
      title: m.title,
      subtitle: m.subtitle,
      text: m.intro ?? m.blurb,
      height: 600,
      buttons: [
        // Ömer 2026-10-25 (form K6): geri dönüş yok, yalnız ilerleme düğmesi
        { label: 'Set out', primary: true, run: () => this.goToMap(mapId) },
      ],
    });
  }

  /** Harita geçişini uygular (kayıt + sahneyi yeniden kur). */
  private goToMap(mapId: string): void {
    setState(continueToMap(this.s, mapId));
    save('auto');
    this.closeModal();
    this.scene.restart();
  }

  /** Sıradaki adıma göre ekranı kurar (pencere ya da sağdaki düğüm kartı). */
  advance(): void {
    this.closeModal();
    this.syncTown();
    if (this.showPendingCards()) return;
    // Hikâye sinematiği (Ömer 2026-10-23; src/campaign/cinematics.ts): sefer başı (kahraman seçiminden önce), King's Bridge / Castle Morvane
    // zaferi (ganimetten sonra, haritaya dönüşte), Forward Camp ilk varışı (tüccar açılmadan önce). Her biri seferde bir kez.
    const cin = dueCinematic(this.s, 'map');
    if (cin) return this.playStoryCinematic(cin, () => this.advance());
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
        if (this.s.pit) return void (this.renderHud(), this.pitBetween()); // The Fighting Pit (B5): kademe arası (zorunlu seçim)
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
        const closeShop = openCampaignMerchant(root, () => this.s, (x) => setState(x), { onLeave: () => this.commit(leaveMerchant(this.s), true) });
        this.lessons('merchant');
        this.events.once('shutdown', closeShop); // sahne kapanırsa (Menu > Main menu) DOM tüccar ekranı da kapanır
        return;
      }
      case 'event': {
        const e = EVENTS[step.event] ?? { title: node(this.map, step.node).name, text: 'Nothing happens.' };
        const choices = eventChoicesFor(this.s, step.event); // A5: görev seçenekleri yalnız sınıfı kadrodayken
        if (choices.length) {
          this.directAt = null;
          return this.choiceEvent(step.event, step.node, choices);
        }
        if (this.directAt === step.node) {
          this.directAt = null;
          return this.commit(completeSimple(this.s, 'event'));
        }
        // A1 Wayshrine: kazanılan nimet çip olarak (side-content.json > wayshrines); A5 görev cebi (Archer): unvan + bonus çipi
        const sh = shrineOf(node(this.map, step.node));
        const qd = node(this.map, step.node).optional ? questDef(node(this.map, step.node).quest) : undefined;
        this.worldWindow(step.node, {
          title: e.title,
          art: windowArt(`event:${node(this.map, step.node).event ?? ''}`),
          paras: paragraphs(e.text),
          ...(sh ? { chipsCap: 'Blessing', chips: [{ tone: 'gain' as const, icon: 'check' as const, text: `${sh.name}: ${sh.effect}` }] } : {}),
          ...(qd && !sh ? { chipsCap: 'Quest complete', chips: [{ tone: 'gain' as const, icon: 'check' as const, text: `Title: ${qd.title}` }, { tone: 'gain' as const, icon: 'check' as const, text: questBonusLine(qd) }] } : {}),
          acts: [{ label: 'Continue', primary: true, run: () => this.commit(completeSimple(this.s, 'event')) }],
        });
        return;
      }
      case 'treasure': {
        // B1 Salvage Dive (maps-2-3.md 9): korunan hazinenin savaşından / bir derinlikten sonra "Dive deeper?" penceresi
        const dv = diveState(s);
        if (dv) {
          this.directAt = null;
          const chests = dv.won;
          const nextChest = diveChest(dv.won + 1);
          const reward = nextChest ? [...nextChest.gifts.map((r) => `${r[0]!.toUpperCase()}${r.slice(1)} item`), `${nextChest.gold} gold`].join(', ') : '';
          this.worldWindow(step.node, {
            title: dv.next ? 'Dive deeper?' : 'The bottom of the wreck',
            art: windowArt(`treasure:${node(this.map, step.node).treasure ?? ''}`),
            paras: dv.next
              ? [
                  `You have found ${chests === 1 ? 'a chest' : `${chests} chests`} (depth ${dv.won} of ${dv.max}). Deeper down, something guards a better one: ${reward}.`,
                  'Diving deeper is one more fight, with no healing in between. Surface now and you keep every chest. Fall down there and the last chest you found sinks.',
                ]
              : [`You have reached the deepest point (depth ${dv.max}). Take everything you found back up.`],
            ...chainOpt(dv.next ? diveChainLine(dv.won + 1) : null),
            chipsCap: 'Found',
            chips: [
              { tone: 'gain', icon: 'bag', text: `${chests} ${chests === 1 ? 'chest' : 'chests'}` },
              { tone: 'info', icon: 'hp', text: 'No healing between depths' },
            ],
            acts: [
              { label: 'Surface', primary: !dv.next, run: () => this.commit(completeSimple(this.s, 'treasure')) },
              ...(dv.next ? [{ label: 'Dive deeper', primary: true, run: () => this.commit(diveDeeper(this.s)) }] : []),
            ],
          });
          return;
        }
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
      case 'complete': {
        // Harita geçişi (M-Q, maps-2-3.md 5): sıradaki harita açıksa (campaign.json > mapFlags; debug / ?maps=1) "Continue to ..." birincil
        // düğme; Harita 1'in başlığı ve bitiş metni değişmez (alt başlık "Campaign Complete" yerine "Map Complete"). Harita kendi bitiş
        // penceresini verebilir (Harita 2: "To Be Continued").
        const next = nextMapFor(s);
        const nextMap = next ? getMap(next) : null;
        const end = this.map.complete;
        const lead = end?.text ?? CONFIG.texts.complete;
        this.modal = openModal(this, this.ui, {
          title: end?.title ?? 'Valdoria Conquered',
          subtitle: nextMap ? 'Map Complete' : (end?.subtitle ?? 'Campaign Complete'),
          // Final sinematiğinin kapanış kartı az önce aynı cümleyi gösterdiyse burada tekrar edilmez
          text: `${this.endCardShown && !end ? '' : `${lead}\n\n`}${s.stats.victories} victories, ${s.stats.defeats} defeats.`,
          height: 520,
          buttons: nextMap
            ? // Ömer 2026-10-25 (form K6): sıradaki harita açıksa haritada kalınmaz, doğrudan geçilir
              [{ label: `Continue to ${titleCase(nextMap.title)}`, primary: true, run: () => this.mapIntro(nextMap.id) }]
            : [
                { label: 'Stay on the map', run: () => this.closeModal() },
                { label: 'Main Menu', primary: true, run: () => elGo(this, MENU_SCENE) },
              ],
        });
        return;
      }
      default:
        // battle / move: sol alttaki düğüm bilgisi (ipucu satırı) ve nabız atan düğüm
        this.renderHud();
        if (step.kind === 'battle' && step.pit) return this.pitBetween(); // başlamamış arena kademesi (güvenlik ağı)
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
    sceneMusic(mapSceneTrack(getMap(this.s.mapId).music, this.town ? 'town' : 'map')); // kasaba ekranı: sıcak kasaba müziği; haritaya dönünce yolculuk müziği (yumuşak geçiş)
  }

  /** Kasaba ekranı açıkken otomatik kayıt (playtest B1; campaign-session > checkpoint). */
  private townSave(): void {
    if (townScreenNode(this.s)) checkpoint();
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
        // kışla değişimi (Saltmere; Ömer 2026-10-25 form K1 = b): takım 4'te kalır, aday birinin yerine geçer
        const swap = swapOffer(this.s);
        if (swap && (swap.recruits.length || swap.reserve.length)) return this.townSwapModal(h);
        const offer = townRecruitOffer(this.s);
        if (offer.length) return this.townRecruitModal(h, offer);
        return this.townNote(h, h.note ?? 'No one here seeks to join you.');
      }
      case 'story':
        // hikâye bir kez (Ömer 2026-10-23): dinlendiyse yer zaten gösterilmez; eski bir dokunuş gelirse de tekrar oynamaz
        if (tn.story && !storyHeard(this.s, tn)) this.storyScene(tn.story, tn.id, true);
        return;
      case 'rest':
        return this.townNote(h, CONFIG.texts.townRested ?? CONFIG.texts.townRest ?? '');
      case 'leave':
        return this.commit(completeSimple(this.s, 'town'));
      case 'pit':
        return this.pitModal(h);
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
  /** Aday kartının level etiketi (playtest D12, Ömer 2026-10-23): yoldaş takımın ortalama level'ında katılır (src/campaign/xp.ts > joinLevel). */
  private joinTag(): string {
    return `Joins at Lv ${joinLevel(this.s)}`;
  }

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
  private townWindow(h: TownHotspot, o: Pick<MwSpec, 'paras' | 'body' | 'acts' | 'chips' | 'chipsCap' | 'chain'> & { mandatory?: boolean }): void {
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
      ...(o.chain ? { chain: o.chain } : {}),
      ...(o.body ? { body: o.body } : {}),
      ...(o.chips ? { chips: o.chips, ...(o.chipsCap ? { chipsCap: o.chipsCap } : {}) } : {}),
      acts: o.acts,
      ...(o.mandatory ? {} : { onDismiss: () => this.closeModal() }),
      anchor: this.townAnchor(h),
    });
  }

  // ---------------------------------------------------------------- The Fighting Pit (B5; maps-2-3.md 9, open-questions 429)

  /** Arenanın kasaba yeri (veride action 'pit'); yoksa ekran ortasına açılan yer tutucu. */
  private pitHotspot(): TownHotspot {
    const n = node(this.map, this.s.pit?.node ?? this.s.at);
    return n.scene?.hotspots.find((x) => x.action === 'pit') ?? { id: 'pit', action: 'pit', label: pitView(this.s)?.name ?? 'The Fighting Pit', rect: [0, 0, 0, 0] };
  }

  /** Kademe çipleri: kazanılmış (rekor) kademe soluk + tik, ödüllü kademe altın (+ sandık). */
  private pitChips(v: NonNullable<ReturnType<typeof pitView>>): MwSpec['chips'] {
    return v.tiers.map((t, i) =>
      t.won ? { tone: 'dim' as const, icon: 'check' as const, text: `Bout ${i + 1}` } : { tone: 'gain' as const, icon: 'gold' as const, text: `Bout ${i + 1} · ${t.gold}${t.chest ? ' + chest' : ''}` },
    );
  }

  /** Arena girişi (kasaba yerinden): kural metni, kademe ödülleri, rekor; Enter the pit = 1. kademe savaşı hemen başlar. */
  private pitModal(h: TownHotspot): void {
    const v = pitView(this.s);
    if (!v) return;
    const record = v.best ? `Your record: ${v.best} of ${v.tiers.length} bouts. Only a new record pays.` : `${v.tiers.length} bouts. Each bout you win for the first time pays its purse.`;
    this.townWindow(h, {
      paras: [...paragraphs(v.text), record],
      chipsCap: 'Purses',
      chips: this.pitChips(v),
      ...chainOpt(pitChainLine(v)),
      acts: [
        { label: 'Not now', run: () => this.closeModal() },
        {
          label: 'Enter the pit',
          primary: true,
          run: () => {
            const why = pitBlocked(this.s);
            if (why) return this.toast(why);
            this.closeModal();
            this.update2(enterPit(this.s));
            this.launchBattle();
          },
        },
      ],
    });
  }

  /** Kademe arası (zorunlu; zemin kapatmaz): kazanılanlar, sıradaki kademenin ödülü; Leave the pit ya da sıradaki kademe. Şifa yok. */
  private pitBetween(): void {
    const v = pitView(this.s);
    if (!v || !this.s.pit) return;
    const h = this.pitHotspot();
    const wins = v.wins ?? 0;
    const lines = [wins >= v.tiers.length ? `Champion of the pit. You have won all ${v.tiers.length} bouts.` : `You have won ${wins} of ${v.tiers.length} bouts. No one tends your wounds between bouts.`];
    if (v.next !== null) lines.push(v.nextPays ? `Bout ${v.next} pays ${v.tiers[v.next - 1]!.gold} gold${v.tiers[v.next - 1]!.chest ? ' and a chest' : ''}.` : `Bout ${v.next} pays nothing: you have won it before.`);
    const leave = { label: 'Leave the pit', primary: v.next === null, run: () => this.commit(leavePit(this.s), true) };
    this.townWindow(h, {
      mandatory: true,
      paras: lines,
      chipsCap: 'Purses',
      chips: this.pitChips(v),
      ...chainOpt(pitChainLine(v)),
      acts:
        v.next === null
          ? [leave]
          : [
              leave,
              {
                label: `Fight bout ${v.next}`,
                primary: true,
                run: () => {
                  try {
                    if (!this.s.pit?.fight) this.update2(fightPit(this.s));
                  } catch (e) {
                    return this.toast((e as Error).message);
                  }
                  this.closeModal();
                  this.launchBattle();
                },
              },
            ],
    });
  }

  // ---------------------------------------------------------------- A4 Hero Oath (maps-2-3.md 9, open-questions 429)

  /** Temizlenmiş yemin tapınağının kartı (düğüme dokununca / varınca): Kneel = yemin penceresi. */
  private shrineCard(id: string, go: () => void): void {
    const sworn = this.s.oath ? oathDef(this.s.oath.id) : undefined;
    this.nodeCard(id, { title: 'Visit the shrine?', actionLabel: 'Kneel', info: { text: sworn ? `${sworn.name} binds one of your company.` : 'One hero may swear an oath to the Tide here.' }, onGo: go });
  }

  /** Temizlenmiş tapınakta yemin penceresi (yemin edilince kaydedilir). */
  private openShrine(id: string): void {
    if (this.s.at !== id || !oathShrineHere(this.s) || this.pausedBlocks()) return;
    this.oathWindow(id, { onSworn: (t) => this.commit(t, true), onBack: () => this.closeModal() });
  }

  /**
   * Yemin penceresi (A levha): yeminli biri varsa yemini ve bozma bedeli (Break the oath); yoksa 1) yemin seçimi (plakalar: artı / eksi), 2) kahraman
   * (kartlar). `onSworn` yeni durumu alır (olaydan: olay biter; yeniden girişte: kayıt), `onBack` vazgeçme.
   */
  private oathWindow(nodeId: string, o: { onSworn: (t: CampaignState) => void; onBack: () => void }): void {
    const title = 'The Saltspray Shrine';
    const art = windowArt(`event:${node(this.map, nodeId).event ?? ''}`);
    const nameOf = (heroId: string): string => content.classes[[...this.s.roster, ...(this.s.reserve ?? [])].find((x) => x.id === heroId)?.class ?? '']?.name ?? 'A hero';
    if (this.s.oath) {
      const od = oathDef(this.s.oath.id)!;
      const cost = OATH_DATA.breakCost;
      this.worldWindow(nodeId, {
        title,
        art,
        paras: [...paragraphs(OATH_DATA.swornText), `${nameOf(this.s.oath.hero)} is bound by the ${od.name}.`],
        chips: [
          { tone: 'gain', text: oathPlusText(od) },
          { tone: 'loss', text: oathMinusText(od) },
        ],
        acts: [
          { label: 'Leave', run: () => o.onBack() },
          {
            label: `Break the oath · ${cost} gold`,
            primary: true,
            run: () => {
              const why = breakOathBlocked(this.s);
              if (why) return this.toast(why === 'Not enough gold' ? `Needs ${cost} gold (you have ${this.s.gold})` : why);
              worldSound('seal');
              this.update2(breakOath(this.s));
              checkpoint();
              this.renderHud();
              this.toast(`The ${od.name} is broken`);
              this.oathWindow(nodeId, o);
            },
          },
        ],
      });
      return;
    }
    this.worldWindow(nodeId, {
      title,
      art,
      paras: paragraphs(OATH_DATA.text),
      body: {
        k: 'plates',
        plates: OATHS.map((x) => ({ id: x.id, label: x.name, desc: x.vow, tag: 'Oath', acc: 'violet' as const, chips: [{ tone: 'gain' as const, text: oathPlusText(x) }, { tone: 'loss' as const, text: oathMinusText(x) }] })),
        pick: (oathId) => this.oathHeroPick(nodeId, oathId, o),
      },
      acts: [{ label: 'Not now', run: () => o.onBack() }],
    });
  }

  /** Yeminin 2. adımı: yemin edecek kahraman (takımdaki ayaktakiler). */
  private oathHeroPick(nodeId: string, oathId: string, o: { onSworn: (t: CampaignState) => void; onBack: () => void }): void {
    const od = oathDef(oathId);
    if (!od) return;
    const heroes = activeHeroes(this.s).filter((x) => !swearBlocked(this.s, x.id, oathId));
    this.worldWindow(nodeId, {
      title: od.name,
      art: windowArt(`event:${node(this.map, nodeId).event ?? ''}`),
      paras: [od.vow, 'Who swears it?'],
      chips: [
        { tone: 'gain', text: oathPlusText(od) },
        { tone: 'loss', text: oathMinusText(od) },
      ],
      body: { k: 'cards', cards: heroes.map((x) => ({ ...this.mwCard(x.class, `Lv ${x.level}`), id: x.id })) },
      acts: [
        { label: 'Back', run: () => this.oathWindow(nodeId, o) },
        {
          label: 'Swear',
          primary: true,
          needPick: 'Pick who swears first.',
          run: (heroId) => {
            if (!heroId) return this.toast('Pick who swears first.');
            const why = swearBlocked(this.s, heroId, oathId);
            if (why) return this.toast(why);
            worldSound('seal');
            const name = content.classes[heroById(this.s, heroId)?.class ?? '']?.name ?? 'A hero';
            o.onSworn(swearOath(this.s, heroId, oathId));
            this.toast(`${name} swears the ${od.name}`);
          },
        },
      ],
    });
  }

  /** Kasaba ekranında kısa not (ateş, adayı olmayan ilan panosu): C kartı. */
  private townNote(h: TownHotspot, text: string): void {
    this.townWindow(h, { paras: paragraphs(text), acts: [{ label: 'Close', primary: true, run: () => this.closeModal() }] });
  }

  /**
   * Kışla değişimi (Ömer 2026-10-25, form K1 = b; state.ts > swapHero): 1) gelen: yeni adaylar + yedektekiler, 2) çıkan: takımdan biri.
   * Görünüm kasabanın aday kartıyla aynı (C kartı + kahraman kartları).
   */
  private townSwapModal(h: TownHotspot): void {
    const offer = swapOffer(this.s);
    if (!offer) return;
    const cards = [
      ...offer.recruits.map((id) => this.mwCard(id, this.joinTag())),
      ...offer.reserve.map((r) => ({ ...this.mwCard(r.class, `In reserve · Lv ${r.level}${r.alive ? '' : ' · Fallen'}`), id: r.id })),
    ];
    this.townWindow(h, {
      paras: paragraphs(CONFIG.texts.townSwap ?? ''),
      body: { k: 'cards', cards },
      acts: [
        { label: 'Not now', run: () => this.closeModal() },
        { label: 'Choose', primary: true, needPick: 'Pick who joins first.', run: (inc) => (inc ? this.townSwapOut(h, inc) : this.toast('Pick who joins first.')) },
      ],
    });
  }

  /** Kışla değişiminin 2. adımı: takımdan çıkacak kahraman. */
  private townSwapOut(h: TownHotspot, incoming: string): void {
    const name = (id: string) => {
      const r = this.s.reserve?.find((x) => x.id === id);
      return content.classes[r ? r.class : id]?.name ?? id;
    };
    const cards = this.s.roster.map((x) => ({ ...this.mwCard(x.class, `Lv ${x.level}${x.alive ? '' : ' · Fallen'}`), id: x.id }));
    this.townWindow(h, {
      paras: paragraphs(CONFIG.texts.townSwapOut ?? ''),
      body: { k: 'cards', cards },
      acts: [
        { label: 'Back', run: () => this.townSwapModal(h) },
        {
          label: 'Swap',
          primary: true,
          needPick: 'Pick who steps aside first.',
          run: (out) => {
            if (!out) return this.toast('Pick who steps aside first.');
            const gone = content.classes[this.s.roster.find((x) => x.id === out)?.class ?? '']?.name ?? out;
            setState(swapHero(this.s, incoming, out));
            this.townSave(); // değişim kayda girsin (B1)
            this.closeModal();
            this.town?.render();
            this.renderHud();
            this.toast(`${name(incoming)} joins your company · ${gone} waits at the barracks`);
          },
        },
      ],
    });
  }

  /**
   * Kışla / ilan panosundan aday (Ömer 2026-10-12): ayrılırken gelecek gönüllü kasabadayken seçilebilir (zorunlu değil: Not now, Esc, zemin).
   * Seçilmezse kasabadan ayrılırken eskisi gibi sorulur. Görünüm: C kartı + kahraman kartları (büst + blurb).
   */
  /** Kışla adayları (Ömer 2026-10-27): Ashford'daki "Form your company" penceresinin aynısı, tek seçim, lider yok; Not now / zemin kapatır. */
  private townRecruitModal(h: TownHotspot, offer: string[]): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    let w: CompanyHandle | null = null;
    const close = (): void => {
      w?.close();
      w = null;
      this.modal = null;
    };
    w = openCompanyWindow(root, {
      size: 1,
      cards: offer.map((id) => this.mwCard(id, this.joinTag())),
      tutorial: new Set(),
      title: h.label,
      sub: CONFIG.texts.townRecruit ?? CONFIG.texts.volunteer ?? '',
      goLabel: 'Join us',
      noLeader: true,
      toast: (m) => this.toast(m),
      onCancel: close,
      onSetOut: ([chosen]) => {
        if (!chosen) return;
        setState(recruitInTown(this.s, chosen));
        this.townSave(); // katılan kahraman kayda girsin (B1)
        close();
        this.town?.render();
        this.renderHud();
        this.toast(`${content.classes[chosen]?.name ?? chosen} joins your company`);
      },
    });
    this.events.once('shutdown', close);
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
  }


  /**
   * Kamp (Ömer 2026-10-26, taslak economy-ui A): dört kart (Rest / Tend wounds / Sharpen / Train), BİR seçim; DOM ekran src/ui/camp-screen.ts.
   * Kullanılmış kampa yeniden girişte (`revisit`) "used" görünümü. Seçim zorunlu: onaylanana dek ekran kapanmaz (`advance` kamp adımında yeniden açar).
   */
  private restModal(nodeId: string, revisit = false): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    const n = node(this.map, nodeId);
    let handle: CampHandle | null = null;
    let tearingDown = false;
    const destroy = (): void => {
      tearingDown = true;
      handle?.destroy();
      handle = null;
      this.modal = null;
    };
    handle = openCamp(root, () => this.s, {
      name: n.name,
      onUse: (next) => this.commit(next),
      // Chapel (open-questions 449): altınla Surge sayacı sıfırlandı; ekran açık kalır, HUD altını yenilenir
      onSet: (next) => {
        this.update2(next);
        this.syncCampHud();
      },
      onGear: () => this.openGear(undefined, false, () => handle?.refresh()),
      onClose: (usedNow) => {
        handle = null;
        this.modal = null;
        if (tearingDown) return;
        // Seçim yapmadan çıkıldı: adım biter, kamp kullanılmamış kalır (geri gelince yeniden açılır; Ömer 2026-10-26)
        if (!usedNow && nextStep(this.s).kind === 'rest') this.commit(skipCamp(this.s));
        else if (!revisit) this.lessons('rest'); // Rest Camps dersi: kamp ekranı kapanınca (panelin üstüne binmesin)
      },
    });
    this.events.once('shutdown', destroy); // sahne kapanırsa (Menu > Main menu) DOM ekran da kapanır
    this.modal = { close: destroy, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
  }

  /** Kasabada Odo'nun tezgâhı (T1): ortak tüccar ekranı; ayrılınca kasaba penceresine dönülür (tezgâh kasabadan çıkınca kapanır). */
  private openTownMerchant(n: MapNode): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    setState(openCampaignShop(this.s));
    const closeShop = openCampaignMerchant(root, () => this.s, (x) => setState(x), {
      sub: `Odo's stall · ${n.name}`,
      leaveLabel: 'Back to town',
      onLeave: () => {
        this.townSave(); // alışveriş kayda girsin (B1)
        this.advance();
      },
    });
    this.events.once('shutdown', closeShop);
    this.lessons('merchant');
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
          return { id: c.id, label: c.label, desc: st.desc, tag: st.tag, acc: st.acc, chips: questChips(c), ...(blocked ? { dim: true, need: `Needs ${c.cost} gold (you have ${this.s.gold})` } : {}) };
        }),
        pick: (id) => {
          const c = choices.find((x) => x.id === id);
          if (!c) return;
          // A5 "Walk away": olay açık kalır, pencere kapanır; kafile temizlenmiş komşulardan yola çıkabilir, düğüme dokununca olay yeniden açılır
          if (c.walkAway) {
            this.closeModal();
            this.renderMap(false);
            return void this.renderHud();
          }
          const blocked = choiceBlocked(this.s, c);
          if (blocked) return this.toast(blocked);
          // A4 Hero Oath: yemin penceresi; yemin edilince olay biter, geri dönülürse seçenekler yeniden
          if (c.oath)
            return this.oathWindow(nodeId, {
              onSworn: (t) => this.commit(chooseEvent(t, c.id)),
              onBack: () => this.choiceEvent(eventId, nodeId, choices),
            });
          worldSound('seal'); // seçim mühürlenir
          const next = chooseEvent(this.s, c.id);
          if (next.eventChoice?.battle) return this.commit(next); // olay savaşı: harita savaş adımına geçer
          const st = choiceStyle(eventId, c);
          this.worldWindow(nodeId, {
            title: e.title,
            art: windowArt(`event:${eventId}`),
            paras: paragraphs(c.result ?? ''),
            chipsCap: 'What changed',
            chips: [...resultChips(c), ...(c.quest && questDef(c.quest) ? [{ tone: 'gain' as const, icon: 'check' as const, text: `Title: ${questDef(c.quest)!.title}` }] : [])],
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
    // Sonsöz sayfası (Valdren Keep: komutan Valor'u anlatır, Ömer 2026-10-13; Harita 2 zincirleri, open-questions 450): hikâyenin son sayfasından sonra; ilk girişte korlar 0'dan tutuşur
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
              // Valor dersi (komutanın anlatımı; ayrı kutu yok): Codex > Lessons'a girer. Yalnız valorLesson bayrağıyla (open-questions 450)
              if (epilogueUnlocksValor(def)) {
                if (!replay && this.s.valor === undefined) rememberShown('valor', 0);
                markLessonSeen('valor');
              }
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
    // Diyalog: TEK DOM şeridi (src/ui/story-dialog.ts, taslak story-dialog C); adımlar arasında yeniden kurulmaz, içerik güncellenir
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    let sd: StoryDialogHandle | null = null;
    let at = 0;
    let finale = false;
    const close = (): void => {
      sd?.close();
      sd = null;
      this.modal = null;
    };
    const show = (i: number): void => {
      at = i;
      if (i >= dialogue.length) {
        finale = true;
        const liked = storyLiked(storyId, answers);
        const raw = liked ? (def.liked ?? '') : (def.disliked ?? '');
        const note = liked && def.gift && !replay ? storyGiftNote(def) : '';
        sd!.update({ said: raw, ...(note ? { note } : {}), choices: ['Continue'], step: dialogue.length, total: dialogue.length, done: true });
        return;
      }
      const st = dialogue[i]!;
      sd!.update({ ...(i === 0 && def.text ? { narr: def.text } : {}), said: st.text, choices: st.choices.map((c) => c.label), step: i, total: dialogue.length });
    };
    sd = openStoryDialog(root, {
      title: def.title,
      speaker: def.speaker ?? n.name,
      place: n.name,
      onPick: (k) => {
        if (finale) {
          close();
          return finish(answers);
        }
        answers.push(k);
        worldSound('seal'); // seçim mühürlenir
        show(at + 1);
      },
      ...(replay ? { onDismiss: () => this.closeModal() } : {}),
    });
    worldSound('quill'); // olay / diyalog: tüy kalem parşömende
    this.events.once('shutdown', close); // sahne kapanırsa (Menu > Main menu) DOM şerit de kapanır
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
    show(0);
  }

  /**
   * Sefer savaşını başlatır (haritadaki TEK giriş; src/game/campaign-session.ts > startCampaignBattle). Castle Morvane'de ilk denemeden önce
   * karşılaşma sinematiği (morvane_meets) oynar; görüldü işareti hemen yazılır ve yenilgide son kayda dönülünce taşınır (tekrar oynamaz).
   */
  private launchBattle(): void {
    const cin = dueCinematic(this.s, 'beforeBattle');
    if (cin) return this.playStoryCinematic(cin, () => void startCampaignBattle(this));
    void startCampaignBattle(this);
  }

  /**
   * Hikâye sinematiğini oynatır (src/ui/cinematic.ts; görünüm story-dialog şeridi + tam ekran sahne görseli). Görüldü işareti oynamaya
   * başlarken yazılır (kayda bir sonraki kayıtla geçer); bitince (ya da Skip) `then`. Sahne kapanırsa DOM katmanı da kapanır.
   */
  private playStoryCinematic(id: string, then: () => void): void {
    this.update2(markCinematicSeen(this.s, id));
    const root = document.getElementById('ui-root');
    if (!root) return then();
    this.closeModal();
    this.hideNodeTip();
    this.tip?.destroy(true);
    this.tip = null;
    let h: CinematicHandle | null = null;
    const close = (): void => {
      h?.close();
      h = null;
      this.modal = null;
    };
    const lead = leaderOf(this.s);
    h = playCinematic(root, id, {
      ...(lead ? { leaderClass: lead.class } : {}),
      map: this.map,
      onDone: (r) => {
        h = null;
        this.modal = null;
        if (r.endCard) this.endCardShown = true;
        then();
      },
    });
    if (!h) return then();
    this.events.once('shutdown', close);
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
  }

  /**
   * Yeni durumu kaydeder, haritayı yeniler, sonraki adıma geçer. Kasaba düğümündeki adımlar (veda, bölük, hikâye sonu, Castle Gate) ve
   * `autoSave` istenenler (Odo'nun tezgâhı) otomatik kayda girer (playtest B1: yenilgide Load Last Save kasabayı korusun).
   */
  private commit(s: CampaignState, autoSave = node(this.map, this.s.at).type === 'town'): void {
    this.update2(s);
    if (autoSave) checkpoint();
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
    if (this.formationLocked()) return this.nudgeFormationLock(); // Zorunlu Formation: harita kilitli
    if (v === 'fog') return;
    const step = nextStep(this.s);
    // Zorunlu Formation kapısı (yeni kahraman katıldı): sıradaki savaşa dokunmak savaş yerine spot ışıklı Formation dersini açar
    if (formationTapGated(this.s, id, tutorialsOn()) && !this.s.suspended) return this.formationSpotlight();
    // Komşu (tek hamle) ya da temizlenmiş düğümler üzerinden uzak hedef (yolculuk): tek dokunuşla yürür
    // (savaş düğümünde Fight'a basılmadıysa da: kafile temizlenmiş komşular üzerinden ayrılabilir; src/campaign/state.ts > canWithdraw)
    if (id !== this.s.at && this.travelTargets().has(id)) return this.chooseRoad(id);
    if (id === this.s.at && step.kind === 'battle') return this.s.suspended ? this.resumeBattle(id) : this.confirmBattle(id, () => this.launchBattle());
    if (id === this.s.at && this.actionHere()) return CONFIRM_STEPS.includes(step.kind) ? this.confirmPlace(id, () => this.openHere(id)) : this.advance();
    // Adımları bitmiş kasaba / tüccar / kampa yeniden gir (Ömer 2026-10-13, "Ashford'a giremiyorum"): Leave sonrası da tekrar açılır
    if (id === this.s.at && step.kind === 'move') {
      const k = revisitKind(this.s);
      if (this.pausedBlocks()) return;
      // Temizlenmiş savaş düğümü: devriye (yeniden oynama, azalan getiri)
      if (patrolAvailable(this.s)) return this.confirmPatrol(id, () => this.startPatrolBattle());
      if (k) return this.confirmPlace(id, () => this.reenter(id));
      if (oathShrineHere(this.s)) return this.shrineCard(id, () => this.openShrine(id)); // A4: yemin tapınağı (yemin / bozma)
    }
    // Ulaşılamayan / eylemsiz düğüm (Ömer 2026-10-23, tek kart): aynı kart sabitlenir, düğme yerine düz not; bilgi görünür kalır
    this.nodeCard(id, { ...this.cardInfoFor(id), note: this.cardNote(id), onGo: () => undefined });
  }

  /** Düğümde varışta savaş başlayacak mı (karşılaşması olan, henüz temizlenmemiş düğüm; korumalı hazine dahil). */
  private fightsAt(id: string): boolean {
    return (!!node(this.map, id).encounter && !isCleared(this.s, id)) || caravelAt(this.map, this.s) === id;
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
    this.launchBattle();
  }

  /** Devriye kartı içeriği (Ömer 2026-10-27: italik cümle yerine etiketler): PATROL · <sıradaki oynanışın XP yüzdesi> · FULL LOOT · NO VALOR + düz geri çekilme notu. */
  private patrolCard(id: string): { tags: PatrolTags; info: { text: string; plain: true } } {
    const pct = Math.round(nextReplayMult(this.s, id) * 100);
    return { tags: [{ text: 'Patrol' }, { text: `${pct}% XP`, tone: 'gold' }, { text: 'Full loot' }, { text: 'No Valor', tone: 'dim' }], info: { text: patrolRetreatNote(), plain: true } };
  }

  /** "Fight the patrol?" kartı: "Start battle?" kartının aynısı, bilgi satırı devriye ödülünü yazar (sıradaki oynanışın yüzdesi). */
  private confirmPatrol(id: string, go: () => void): void {
    const enc = nodeEncounter(node(this.map, id), this.s);
    if (!enc) return;
    this.nodeCard(id, { title: 'Fight the patrol?', foes: foeGroups(enc).groups, ...this.patrolCard(id), onGo: go });
  }

  /**
   * Yol seçimi: her düğümde aynı anchored kart (Ömer 2026-10-18): savaşta "Start battle?" (Fight = yürü + savaşı başlat), savaşsızda
   * düğümün kendi kartı (Enter / Rest / Trade / Open / Continue = yürü; kasaba / dinlenme / tüccar / olay ekranı varışta açılır).
   * Eski "Take this road?" (Yes/No) penceresi kalktı; "diğer yollar kapanır" notu da yok (Ömer).
   */
  private chooseRoad(id: string): void {
    if (this.formationLocked()) return this.nudgeFormationLock();
    if (formationTapGated(this.s, id, tutorialsOn())) return this.formationSpotlight();
    if (this.pausedBlocks()) return;
    if (!this.travelTargets().has(id)) return;
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
      return this.launchBattle();
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
    // bulunulan düğümde bekleyen savaşın karşılaşması (Caravel / taraf eliti / dalış), yoksa varışta oynanacak olan
    const st = id === this.s.at ? nextStep(this.s) : null;
    const enc = st?.kind === 'battle' ? st.encounter : encounterAt(this.map, this.s, n);
    if (!enc) return;
    const foes = foeGroups(enc);
    this.nodeCard(id, { foes: foes.groups, fallback: foes.info, onGo: fight });
  }

  /**
   * Savaşsız düğümler için AYNI kart (Ömer 2026-10-18 "tüm nodelar için"): rozet + ad · tür + lore satırı + düğümün kendi eylemi (portre yok).
   * Eylem sözleri eski pencerelerdeki fiillerdir (Enter / Rest / Trade / Open / Continue). `go` kuralı değiştirmez: eskiden doğrudan
   * yapılan şeyi (yürü, ya da düğümü aç) yapar.
   */
  private confirmPlace(id: string, go: () => void): void {
    const n = node(this.map, id);
    const t = PLACE_CARD[n.type] ?? { title: 'Continue?', action: 'Continue' };
    // Kasaba kartı (karar 364): lore yerine dinlenme kuralı (2026-10-26: kasaba iyileştirmez, Inn)
    const info = n.type === 'town' ? { text: this.townArrivalNote() } : undefined;
    this.nodeCard(id, { title: t.title, actionLabel: t.action, fallback: { text: this.nodeFacts(id).blurb }, ...(info ? { info } : {}), onGo: go });
  }

  /** Kasaba kartının dinlenme satırı (Ömer 2026-10-26): kasaba iyileştirmez; yorgun kahramanlar Inn'de dinlenir (campaign.json > texts.townRest). */
  private townArrivalNote(): string {
    return CONFIG.texts['townRest'] ?? 'Leave tired heroes at the inn: they heal a little each day.';
  }

  private nodeCard(id: string, o: { title?: string; actionLabel?: string; foes?: FoeGroup[]; fallback?: { who?: string; text: string; quote?: boolean } | undefined; /** Lore'un yerine geçen bilgi satırı (devriye). */ info?: { text: string; plain?: boolean }; tags?: PatrolTags; company?: CompanyCard; /** Düğme yerine düz not. */ note?: string; onGo: () => void }): void {
    const root = document.getElementById('ui-root');
    const n = node(this.map, id);
    if (!root) return;
    this.hideNodeTip();
    const instant = this.previewClosedFor === id; // önizlemeden sabitlenirken giriş animasyonu tekrar oynamaz
    this.closeModal();
    const info = o.info ?? startCardInfo(n.lore, o.fallback?.text ? o.fallback : undefined);
    let card: StartBattleHandle | null = null;
    let frozen: { x: number; y: number } | null | undefined;
    const close = (): void => {
      card?.close();
      card = null;
      this.modal = null;
      this.cardPlace = null;
      this.syncLabels();
    };
    card = openStartBattle(root, {
      ...(o.title ? { title: o.title } : {}),
      ...(o.actionLabel ? { actionLabel: o.actionLabel } : {}),
      name: n.name,
      subtitle: n.subtitle || TYPE_LABEL[n.type],
      nodeType: n.type,
      level: nodeLevel(this.s.mapId, id),
      ...this.threatOpt(id),
      ...(o.foes ? { foes: o.foes } : {}),
      ...(info ? { info } : {}),
      ...(o.tags ? { tags: o.tags } : {}),
      ...(o.company ? { company: o.company } : {}),
      then: this.nodeFacts(id).next.map((a) => ({ name: a.name, kind: TYPE_LABEL[a.type] })),
      ...this.firstSteps(id),
      ...(o.note ? { note: o.note } : {}),
      ...(instant ? { instant: true } : {}),
      anchor: () => {
        // Yürüyüş sürerken kamera kafileyi izler: kart imlecin altından kaçmasın diye düğümü VARIŞ kamerasına göre bir kez sabitler
        if (!this.walking) {
          frozen = undefined;
          return this.nodeCssPoint(id, root);
        }
        if (frozen === undefined) {
          const cam = this.cameras.main;
          const sx = cam.scrollX;
          const sy = cam.scrollY;
          const end = clampMid(this.P(id), this.panFrame(), this.viewSize());
          cam.centerOn(end.x, end.y);
          frozen = this.nodeCssPoint(id, root);
          cam.setScroll(sx, sy);
        }
        return frozen;
      },
      onFight: () => {
        this.closeModal();
        o.onGo();
      },
      onCancel: () => this.closeModal(),
      onScrimTap: (x, y) => this.travelFromCard(id, root, x, y),
    });
    const handle = card;
    this.cardPlace = () => handle.place();
    this.cardCam = '';
    this.syncLabels();
    onStageResize(this, () => {
      frozen = undefined;
      handle.place();
    });
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
      const choices = eventChoices(eventId, this.s);
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
    return this.worldCssPoint(this.P(id), root);
  }

  /** Dünya noktasının #ui-root içindeki CSS piksel konumu (nodeCssPoint'in genel hâli); görünür alan dışındaysa null. */
  private worldCssPoint(p: Pt, root: HTMLElement): { x: number; y: number } | null {
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
    return worldToStageCss(p, cam, { left, top, cssW: c.offsetWidth, cssH: c.offsetHeight, pxW: c.width, pxH: c.height });
  }

  /**
   * Kart açıkken kararan zemine dokunuş (playtest U8, Ömer 2026-10-23: "temizlenmiş düğümlere tek tıkla hızlı yolculuk"): dokunuş gidilebilir
   * başka bir düğümün üstündeyse kart kapanır ve kafile hemen oraya yürür (eskiden ilk dokunuş yalnız kartı kapatıyordu, ikinci dokunuş
   * gerekiyordu). Kural değişmez: hedefler travelRoutes'tan (yalnızca temizlenmiş düğümler üzerinden); yürürken / duraklatılmış savaşta yok.
   */
  private travelFromCard(cardId: string, root: HTMLElement, x: number, y: number): boolean {
    if (this.walking || pausedLock(this.s)) return false;
    let best: string | null = null;
    let bestD = Infinity;
    for (const id of this.travelTargets().keys()) {
      if (id === cardId) continue;
      const p = this.P(id);
      const c = this.worldCssPoint(p, root);
      const e = this.worldCssPoint({ x: p.x + 52, y: p.y }, root);
      if (!c || !e) continue;
      const r = Math.max(22, Math.hypot(e.x - c.x, e.y - c.y));
      const d = Math.hypot(x - c.x, y - c.y);
      if (d <= r && d < bestD) {
        best = id;
        bestD = d;
      }
    }
    if (!best) return false;
    this.closeModal();
    this.chooseRoad(best);
    return true;
  }

  /** Kartın "First" satırı (playtest H3 / H2): varışta önce gelen kadro adımları; varsa düğme "Continue" (sürpriz yok). */
  private firstSteps(id: string): { first?: string[]; actionLabel?: string } {
    if (this.s.patrol === id) return {};
    const first = arrivalStepLines(this.s, id);
    return first.length ? { first, actionLabel: 'Continue' } : {};
  }

  /**
   * Duraklatılmış savaş (Ömer 2026-10-14, Retreat to Map): düğüme dokunmak "Resume battle?" sorar, savaş aynı turdan sürer. Kayıt
   * doğrulanamazsa (veri değişti / bozuk) silinir, not gösterilir ve normal "Start battle?" onayı açılır (savaş baştan).
   */
  private resumeBattle(id: string): void {
    if (!checkPaused()) {
      this.toast(PAUSED_BROKEN);
      this.renderHud();
      return this.confirmBattle(id, () => this.launchBattle());
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
            this.launchBattle();
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
    this.update2(moveTo(this.s, to));
    this.tip?.destroy(true);
    this.tip = null;
    const fresh = !isCleared(this.s, to);
    const patrol = !fresh && patrolAvailable(this.s, to);
    const revisit = !fresh && !patrol && !!revisitKind(this.s);
    const shrine = !fresh && !patrol && !revisit && oathShrineHere(this.s); // A4: temizlenmiş yemin tapınağı
    const action = patrol ? () => this.startPatrolBattle() : revisit ? () => this.reenter(to) : shrine ? () => this.openShrine(to) : undefined;
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
    else if (fresh || revisit) this.confirmPlace(to, () => this.arrive(to, action));
    else if (shrine) this.shrineCard(to, () => this.arrive(to, action));
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
      if (ready && !this.formationDue()) this.launchBattle();
    });
  }

  /**
   * Sol üst ◂ Back (Ömer 2026-10-12): ana menüye (Menu > Main Menu ile aynı yer). Normal modda son kayıttan beri ilerleme varsa onay
   * sorar; Ironman her adımda kendiliğinden kaydettiği için sormaz.
   */
  private leaveMap(): void {
    if (this.formationLocked()) return this.nudgeFormationLock();
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
    this.releaseFormationLock(); // spot ışığı ve kilit kalkar
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
      // Prologue sinematiği hikâyeyi anlattıysa pencerede yalnızca oynanış cümleleri (texts.introRules) kalır
      paras: paragraphs(cinematicSeen(this.s, 'prologue') ? (CONFIG.texts['introRules'] ?? CONFIG.texts.intro) : CONFIG.texts.intro),
      body: { k: 'cards', leader: true, cards: this.sorted(CONFIG.starterPool).map((id) => this.mwCard(id)) },
      acts: [
        // Skip tutorial (Ömer 2026-10-23): ikincil, solda; kahraman gerekmez, Ashford'da "Form your company" ile sürer (state.ts > skipTutorial)
        ...(this.map.nodes.some((n) => n.newCompany) ? [{ label: 'Skip tutorial', run: () => this.skipTutorialNow() }] : []),
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

  /** Tutorial'ı atla: sefer bölük kurma düğümünde sürer (karavan oraya geçer), "Form your company" açılır. Debug menüsünden de çağrılır. */
  skipTutorialNow(): boolean {
    if (nextStep(this.s).kind !== 'hero') return false;
    session.tutorialClasses = []; // "Played in the tutorial" notu yok
    this.update2(skipTutorial(this.s));
    markJourneyStart();
    this.commit(this.s);
    return true;
  }

  /** Yeni yoldaş / gönüllü (A levha): aday kartları (büst + kısa açıklama), Join us sağda. */
  private recruitModal(step: Extract<NextStep, { kind: 'recruit' | 'volunteer' }>): void {
    const needArea = isAreaClass;
    this.worldWindow(step.node, {
      kind: 'Recruit',
      place: node(this.map, step.node).name,
      title: step.kind === 'volunteer' ? 'A Volunteer' : 'A New Companion',
      paras: paragraphs(step.kind === 'volunteer' ? CONFIG.texts.volunteer : CONFIG.texts.recruitBefore),
      body: { k: 'cards', cards: step.offer.map((id) => this.mwCard(id, [needArea(id) && node(this.map, step.node).recruit?.requireArea ? 'Area attacks' : '', this.joinTag()].filter(Boolean).join(' · '))) },
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

  /** "Form your company" (Ömer 2026-10-23, taslak form-company-v2 B): DOM penceresi (src/ui/company-window.ts); kural değişmez: 3 kişi, ilk seçilen lider, tekrar dokunmak lider yapar. */
  private companyModal(size: number): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    this.closeModal();
    const cards = this.sorted(CONFIG.companyPool).map((id) => this.mwCard(id));
    let h: CompanyHandle | null = null;
    const close = (): void => {
      h?.close();
      h = null;
      this.modal = null;
    };
    h = openCompanyWindow(root, {
      size,
      cards,
      // Tutorial'da oynanan sınıflar (veda ettiler; yine seçilebilir): "Played in the tutorial" notu
      tutorial: new Set(session.tutorialClasses),
      toast: (m) => this.toast(m),
      onSetOut: (picks, leader) => this.commit(formCompany(this.s, picks, leader)),
    });
    this.events.once('shutdown', close);
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
  }
}

/** "THE DROWNED REACH" -> "The Drowned Reach" (düğme yazısı; harita başlığı veride büyük harf). */
function titleCase(t: string): string {
  return t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
}

/**
 * Olay seçeneğinin plaka çipleri (map-window-data.ts > choiceChips) + A5 görev ekleri: savaşlı seçeneğin bedeli (Gambler'ın bahsi), görevin unvanı
 * ve bonusu, "Walk away" notu.
 */
function questChips(c: EventChoice): ReturnType<typeof choiceChips> {
  if (c.walkAway) return [{ tone: 'dim', text: 'Come back any time' }];
  const q = questDef(c.quest);
  const cost = c.battle && c.cost ? [{ tone: 'loss' as const, icon: 'gold' as const, text: `${c.cost} gold` }] : [];
  const quest = q ? [{ tone: 'gain' as const, icon: 'check' as const, text: `Title: ${q.title}` }, { tone: 'gain' as const, icon: 'check' as const, text: questBonusLine(q) }] : [];
  return [...cost, ...choiceChips(c), ...quest];
}
