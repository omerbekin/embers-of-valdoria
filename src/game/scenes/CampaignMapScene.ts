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
  incoming,
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
  stopNumber,
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
  reviveAtCamp,
  reviveCost,
  recruitInTown,
  townRecruitOffer,
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
import { FULL_W, FULL_X0 } from '../../ui/viewport';
import { H, W, bodyText, classCard, crown, hpBar, openModal, type Modal } from '../campaign-ui';
import { MAP_SCENE, MENU_SCENE, checkPaused, current, loadEntry, markJourneyStart, save, session, setState, startCampaignBattle, storage } from '../campaign-session';
import { classAvatar, classLogoBadge, ensureGlow } from '../menu-ui';
import { sortByPrimary } from '../class-order';
import { debugState } from '../debug-state';
import { isSettingsOpen, setSettingsOpen } from '../../ui/settings';
import { isGameMenuOpen, setGameMenuOpen } from '../../ui/game-menu';
import type { MapMenuState } from '../session-flow';
import { campaignGearSource, openGearScreen, showHandover } from '../../ui/gear-screen';
import { openLootScreen } from '../../ui/loot-screen';
import { mountCampHud, type CampHud } from '../../ui/camp-hud';
import { showLevelBanner } from '../../ui/level-banner';
import { LEVELS } from '../../progression';
import { legendaryPreviewWanted } from '../../progression/items';
import { EL, elBack, elBadge, elBody, elButton, elGo, elIconButton, elLink, elPanel, elScreenIn, elText, elToast, fadeLine, fitW, hGradient, vGradient } from '../elegant-ui';
import { MAP_ZOOM, canPan, clampMid, clampZoom, wheelAction, worldToStageCss, zoomTowardMid, type Bounds } from '../map-view';
import { reducedMotion } from '../../ui/motion-pref';
import { drawNodeGlyph, graveMark, nodeGlyphImage, openFormation } from '../campaign-panels';
import { openSlotBrowser, type SlotBrowser } from '../campaign-slots-ui';
import { ensureIcon } from '../icons';
import { hasUiImage, uiIconName } from '../../ui/ui-icons';
import { hasMiscImage } from '../../ui/misc-icons';
import { WORLD_AUDIO, worldSound } from '../../ui/ui-sound';
import { sceneMusic } from '../../ui/music';

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
const NODE_R = 24;
const WALK_SPEED = 320; // px/sn
const FOLLOW_GAP = 55; // px
const PAN_STEP = 340;
/** Sütun genişlikleri (Ömer 2026-10-09: 16:9'da daralmasın): sol takım sütunu ve sağ düğüm sütunu aynı dilde, aynı genişlikte. */
const SIDE = { left: 48, top: 150, partyW: 420 };
/** Dokunmatikte düğüm bilgi kartı için uzun basış süresi (ms). */
const LONG_PRESS_MS = 420;
/** Zorunlu seçim pencereleri (Esc ile kapanmaz; Party / Formation bunların üstünde açılmaz). */
const FORCED: ReadonlyArray<NextStep['kind']> = ['hero', 'recruit', 'volunteer', 'farewell', 'company'];

type Pt = { x: number; y: number };

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
  /** Katılımdan sonra savaş bekliyor (Ravenwood): bu düğümde "Formation'ı düzenle, sonra savaşı başlat" kartı (sahne kapanınca söner). */
  private arrangeNotice: string | null = null;
  /** Global Gear + Formation ikonları (DOM, sol alt; src/ui/camp-hud.ts). */
  private campHud: CampHud | null = null;
  /** Açık ipucu kartı "Formation'ı düzenle" ipucu mu (Formation düğmesi o sürece parlar). */
  private tipIsArrange = false;
  private legendOpen = true;
  private panBtns: { left?: Phaser.GameObjects.Container; right?: Phaser.GameObjects.Container; minus?: Phaser.GameObjects.Container; plus?: Phaser.GameObjects.Container } = {};
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
    this.arrangeNotice = null;
    this.campHud = null;
    this.tipIsArrange = false;
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
    const step = nextStep(this.s);
    const options = step.kind === 'move' ? step.options : [];
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
    for (const n of this.map.nodes) this.drawNode(n, vis[n.id]!, options.includes(n.id));
    // 3) sis bulutları
    this.updateClouds(vis, animateFog);
  }

  /** Yol: yürünmüş = düz altın; gidilebilir = akan kor (parıltı altlığıyla); görünür = kesik altın; kapalı / sis = soluk kesik. */
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
      case 'walked':
        stroke(7, 0x0c0805, 0.4, false);
        stroke(3, EL.GOLD, 0.85, false);
        break;
      case 'open':
        if (part !== 'dash') {
          stroke(12, EL.EMBER, 0.18, false);
          stroke(7, 0x0c0805, 0.45, false);
        }
        if (part !== 'base') stroke(3.5, EL.EMBER2, 1, true, 16, 10);
        break;
      case 'visible':
        stroke(6, 0x0c0805, 0.35, false);
        stroke(2.5, EL.GOLD, 0.6, true);
        break;
      default:
        stroke(2, 0x8a8070, 0.28, true, 8, 10);
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

  /**
   * Düğüm: küçük madalyon + tür glifi. Durumlar: buradasın (kor dolgu + nabız), gidilebilir (açık altın halka + kor parıltı),
   * geçildi (soluk altın dolgu), ileride (koyu, altın halka), kapalı (çok soluk), hedef (sisli siluet). Ad Cinzel, alt yazı italik.
   */
  private drawNode(n: MapNode, v: NodeVis, option: boolean): void {
    if (v === 'fog') return;
    const p = this.P(n.id);
    const c = this.add.container(p.x, p.y);
    this.dyn.add(c);
    const big = n.final || n.type === 'boss';
    const r = NODE_R * (big ? 1.25 : 1);
    const here = v === 'current';
    const done = v === 'cleared';
    const goal = v === 'goal';
    const closed = v === 'closed';
    const actionable = option || (here && this.actionHere());
    if (actionable) {
      const glow = this.add.image(0, 0, ensureGlow(this)).setTint(EL.EMBER).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(r * 5.5, r * 5.5).setAlpha(0.5);
      c.add(glow);
      this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 0.85 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(0x000000, 0.4).fillCircle(2, 4, r + 3);
    const fill = here ? EL.EMBER : done ? 0x6e5a34 : 0x140e09;
    g.fillStyle(fill, goal ? 0.6 : 0.95).fillCircle(0, 0, r);
    const ring = here ? EL.EMBER2 : option ? EL.ON_N : EL.GOLD;
    g.lineStyle(here || option ? 2 : 1.5, ring, goal ? 0.35 : here || option ? 1 : done ? 0.6 : 0.7).strokeCircle(0, 0, r);
    if (big && !goal) g.lineStyle(1, EL.EMBER2, 0.7).strokeCircle(0, 0, r + 6);
    const glyphCol = here ? 0x1a0f06 : done ? 0x1e150c : goal ? 0x7d705a : closed ? 0x7d705a : option ? EL.ON_N : 0xd9c8a2;
    // boyalı düğüm ikonu (assets/misc-icons/node), yoksa ince çizgili glif; hedef (sisli siluet) koyu ve soluk
    // başlangıç düğümü boyalı 'start' ikonunu taşır (Ömer 2026-10-11); dinlenme / tüccar kendi boyalı ikonları
    const art = nodeGlyphImage(this, n.id === this.map.start && hasMiscImage('node', 'start') ? 'start' : n.type, 0, 0, r * 1.84);
    if (art) {
      if (goal) art.setTint(0x6a5e4c).setAlpha(0.6);
      c.add(art);
    } else drawNodeGlyph(g, n.type, glyphCol, big ? 1.25 : 1);
    if (n.type === 'treasure' && n.encounter) {
      // Korumalı hazine: sağ altta küçük çapraz kılıç madalyonu
      const gb = this.add.graphics();
      gb.fillStyle(0x140e09, 1).fillCircle(r * 0.8, r * 0.8, 11).lineStyle(1, EL.GOLD, 0.8).strokeCircle(r * 0.8, r * 0.8, 11);
      c.add(gb);
      const guard = nodeGlyphImage(this, 'battle', r * 0.8, r * 0.8, 20);
      if (guard) c.add(guard);
      else drawNodeGlyph(gb, 'battle', 0xd9c8a2, 0.45, r * 0.8, r * 0.8);
    }
    // Ad + alt yazı. Telefonda (Ömer 2026-10-11, A1-x kuralı) yalnızca bulunulan ve sıradaki (gidilebilir) düğümlerin adı yazar: kalabalık olmasın
    const above = n.label === 'above';
    const next = this.map.edges.some((e) => e.from === this.s.at && e.to === n.id); // savaş bitmeden de sıradaki duraklar
    const named = !this.compact() || here || option || (next && !closed);
    const nameCol = closed || goal ? EL.DIM : here || option ? EL.ON : EL.TXT;
    const name = elText(this, 0, 0, n.name, 15, nameCol, { em: 0.06 }).setOrigin(0.5, above ? 1 : 0).setShadow(0, 2, 'rgba(8,5,3,1)', 6, false, true);
    name.y = above ? -r - 12 : r + 10;
    // Okunurluk: yazının arkasında yumuşak koyu leke (harita üstünde)
    const back = this.add.image(0, name.y + (above ? -12 : 12), ensureGlow(this)).setTint(0x000000).setDisplaySize(name.width + 70, 54).setAlpha(closed || goal ? 0.25 : 0.55);
    if (named) c.add([back, name]);
    else {
      back.destroy();
      name.destroy();
    }
    const showSub = named && (here || option || v === 'near' || done);
    if (showSub) {
      const choice = outgoing(this.map, n.id).length > 1 && !done ? '  ·  choice' : '';
      const sub = elBody(this, 0, 0, `${n.subtitle}${choice}`, 15, EL.MUTED).setOrigin(0.5, above ? 1 : 0).setShadow(0, 2, 'rgba(8,5,3,1)', 6, false, true);
      sub.y = above ? name.y - 22 : name.y + 22;
      c.add(sub);
    }
    // Sis kuralı (Ömer 2026-10-14): bulunulan ve sıradaki (gidilebilir) düğüm, adı ve alt yazısı bulutsuz kalır
    if (here || option || v === 'near' || (next && !closed)) {
      const halfW = Math.max(r + 8, (name.width + 70) / 2);
      const textH = 12 + 22 + 30; // ad + alt yazı + leke payı
      this.clearZones.push({ x0: p.x - halfW, x1: p.x + halfW, y0: p.y - r - 8 - (above ? textH : 0), y1: p.y + r + 8 + (above ? 0 : textH) });
    }
    if (named && n.id === this.map.start && !here && !done) c.add(elText(this, 0, -r - (above ? 60 : 16), 'Start', 12, EL.MUTED, { em: 0.2 }).setOrigin(0.5, 1));
    if (incoming(this.map, n.id).length > 1 && !done) c.add(elText(this, -r - 14, 0, '›', 18, EL.MUTED, { em: 0 }).setOrigin(0.5));
    if (closed) c.setAlpha(0.45);
    else if (done) c.setAlpha(0.85);
    else if (goal) c.setAlpha(0.75);
    if (here && this.actionHere()) this.tweens.add({ targets: g, scale: { from: 1, to: 1.08 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const zone = this.add.zone(0, 0, 96, 96).setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(48, 48, 48), hitAreaCallback: Phaser.Geom.Circle.Contains });
    // Dokunuş = basış ve bırakış AYNI düğümde, arada sürükleme / sıkıştırma yok (sürükleme ya da başka yerden kayan parmak sayılmaz).
    // Dokunmatikte uzun basış (yürümeden) bilgi kartını gösterir; fareyle üstüne gelmek de aynı kartı gösterir.
    const busy = () => !!this.walking || !!this.modal || this.menuOpen || !!this.town;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.tapNode = n.id;
      this.longPressed = false;
      this.pressTimer?.remove();
      this.pressTimer = null;
      if (!p.wasTouch || busy()) return;
      this.pressTimer = this.time.delayedCall(LONG_PRESS_MS, () => {
        this.pressTimer = null;
        if (this.tapNode !== n.id || this.drag.moved || busy()) return;
        this.longPressed = true;
        this.showNodeTip(n.id, p);
      });
    });
    zone.on('pointerup', () => {
      const same = this.tapNode === n.id;
      const long = this.longPressed;
      this.tapNode = null;
      this.longPressed = false;
      this.pressTimer?.remove();
      this.pressTimer = null;
      if (long) return this.hideNodeTip();
      if (!same || this.drag.moved || busy()) return;
      this.hideNodeTip();
      this.onNodeTap(n.id, v);
    });
    zone.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || p.isDown || busy()) return;
      this.showNodeTip(n.id, p);
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch && this.nodeTip && !p.isDown) this.placeNodeTip(p);
    });
    zone.on('pointerout', () => {
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
      if (v === 'fog' || v === 'goal') want.set(n.id, v === 'goal' ? 0.45 : 0.78);
      else if (v === 'closed') want.set(n.id, 0.3);
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

  /** Kafileyi yol boyunca yürütür; dokunma ya da `finish` atlar. Kamera kafileyi izler (çerçeve içinde). */
  private walk(from: string, to: string, done: () => void): void {
    const c = this.curve(from, to);
    const len = c.getLength();
    const duration = (len / WALK_SPEED) * 1000;
    const state = { d: 0 };
    let finished = false;
    const pointAt = (d: number): Pt => {
      if (d <= 0) {
        // kafilenin arkası henüz başlangıç düğümünde: önceki yolun sonundan geriye uzanır
        const a = this.P(from);
        return { x: a.x + d * 0.6, y: a.y };
      }
      const pt = c.getPointAt(Math.min(1, d / len));
      return { x: pt.x, y: pt.y };
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

  /** ◂ ▸ düğmeleri yalnızca o yöne gidilebiliyorsa etkin; − + sınırlarda soluk. */
  private updatePanButtons(): void {
    const b = this.panBtns;
    if (!b.left) return;
    const can = canPan(this.mid, this.frame, this.viewSize());
    b.left.setAlpha(can.left ? 1 : 0.3);
    b.right?.setAlpha(can.right ? 1 : 0.3);
    b.minus?.setAlpha(this.mapZoom > MAP_ZOOM.min + 0.001 ? 1 : 0.3);
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
    // Kenar gölgeleri: sütunların altı okunur, orta harita açık (taslaktaki yatay degrade)
    const shade = this.add.graphics();
    hGradient(shade, left, 0, 620, H, 0x080604, [
      [0, 0.92],
      [0.7, 0.7],
      [1, 0],
    ]);
    vGradient(shade, left, 0, right - left, 120, 0x080604, [
      [0, 0.85],
      [1, 0],
    ]);
    // Sol alt: bölge / durak / mod / zorluk / altın bloğunun altı okunur kalsın
    vGradient(shade, left, H - 190, 820, 190, 0x080604, [
      [0, 0],
      [1, 0.8],
    ]);
    L.add(shade);
    // Sol üst: geri ikonu (ana menüye; Menu > Main Menu ile aynı yer). Esc haritada Menu'yü açar. renderHud her boyut değişiminde yeniden kurar.
    const back = elBack(this, () => this.leaveMap(), { isBusy: () => this.inputBusy(), left: () => left, manual: true });
    L.add(back.root);
    // Üst orta: harita adı (Ömer 2026-10-12)
    L.add(elText(this, (left + right) / 2, 52, this.map.title, 34, '#ffffff', { em: 0.16 }).setOrigin(0.5, 0.5).setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f));
    // Bulunulan düğümün bilgisi sol sütunda, takım panelinin hemen altında (yalnızca sol alttaki bilgi bloğuna yer kalırsa)
    const infoTop = this.renderInfo(left + SIDE.left);
    const partyEnd = this.renderParty(left + SIDE.left, SIDE.top);
    this.renderNodeCard(left + SIDE.left, partyEnd + 24, SIDE.partyW, infoTop - 16);
    this.renderControls();
    this.renderLegend();
    if (session.notice) {
      this.toast(session.notice);
      session.notice = '';
    }
  }

  /**
   * Sol alt bilgi bloğu (Ömer 2026-10-12): 1. satır bölge · Stop x / 21, 2. satır mod · zorluk · altın. Bloğun üst kenarını döndürür
   * (üstteki düğüm bilgisi oraya kadar iner). Alt orta harita düğmelerinin solunda kalır.
   */
  private renderInfo(x: number): number {
    const L = this.hud;
    const s = this.s;
    const c = this.compact();
    const big = c ? 28 : 21;
    const small = c ? 26 : 19;
    const gap = c ? 44 : 34;
    const lift = c ? 170 : 104; // sol alttaki global Gear + Formation ikonlarının üstünde
    const y2 = H - (c ? 40 : 34) - lift;
    const y1 = y2 - gap;
    const region = this.map.regions.find((r) => r.id === node(this.map, s.at).region);
    const r = elText(this, x, y1, region ? region.title : this.map.title, big, EL.ON, { em: 0.06 }).setOrigin(0, 0.5);
    L.add(r);
    L.add(elBody(this, x + r.width + 10, y1 + 1, `·  Stop ${stopNumber(s)} / ${this.map.stopsPerRun}`, small, EL.MUTED).setOrigin(0, 0.5));
    const diff = CONFIG.difficulties[s.difficulty]?.name ?? s.difficulty;
    const mode = elBody(this, x, y2, s.mode === 'ironman' ? 'Ironman' : 'Normal', small, s.mode === 'ironman' ? EL.BAD : EL.MUTED).setOrigin(0, 0.5);
    const d = elBody(this, mode.x + mode.width + 8, y2, `·  ${diff}  ·`, small, EL.MUTED).setOrigin(0, 0.5);
    const cx = d.x + d.width + 14;
    const coin = this.coin(cx + 6, y2, c ? 34 : 26); // boyalı altın yığını (assets/ui-icons/gold.png), yoksa kodla çizilen sikke
    const g = elText(this, cx + (c ? 30 : 24), y2, `${s.gold}`, big, EL.ON, { em: 0.04 }).setOrigin(0, 0.5);
    L.add([mode, d, coin, g, elBody(this, g.x + g.width + 6, y2 + 1, 'gold', small, EL.MUTED).setOrigin(0, 0.5)]);
    return y1 - big;
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

  /** Sol sütun: "Your party · n / 4", kahraman satırları (dokun = o kahramanın Gear sekmesi). */
  private renderParty(x: number, y: number): number {
    const L = this.hud;
    const team = activeHeroes(this.s);
    const lead = leaderOf(this.s);
    const w = SIDE.partyW;
    L.add(elText(this, x, y, `Your party · ${team.length}`, 14, 'rgba(217,178,106,0.85)', { em: 0.24 }).setOrigin(0, 0.5));
    const ln = this.add.graphics();
    fadeLine(ln, x, x + w, y + 18, EL.GOLD, 0.45, 'out');
    L.add(ln);
    team.forEach((h, i) => {
      const def = content.classes[h.class];
      if (!def) return;
      const ry = y + 44 + i * 112;
      const row = this.add.container(x, ry);
      const pic = this.add.graphics();
      pic.fillStyle(0x120c08, 1).fillRect(0, 0, 92, 92);
      const frame = this.add.graphics();
      const drawFrame = (on: boolean) => {
        frame.clear();
        frame.lineStyle(1, on ? EL.ON_N : EL.GOLD, on ? 1 : EL.LINE.a3).strokeRect(0.5, 0.5, 91, 91);
      };
      drawFrame(false);
      const face = classAvatar(this, def, 46, 46, 90);
      const badge = elBadge(this, 'gold', 13);
      badge.c.setPosition(90, 88);
      badge.set(h.level, false);
      // Düşmüş kahraman (Ömer 2026-10-11): soluk portre + mezar işareti; ceset olarak taşınır, dinlenme noktasında altınla kalkar
      const fallen = isFallen(h);
      const name = fitW(elText(this, 112, 18, def.name, 19, fallen ? EL.DIM : EL.ON, { em: 0.05 }).setOrigin(0, 0.5), w - 120);
      const roleText = fallen ? (this.s.valor !== undefined ? 'Fallen · revive at a town, a Rest camp or with Valor' : 'Fallen · revive at a town or Rest camp') : `${def.role ?? ''}${lead?.id === h.id ? ' · Leader' : ''}`;
      const role = fitW(elBody(this, 112, 44, roleText, 16, fallen ? '#d88a7e' : EL.MUTED).setOrigin(0, 0.5), w - 120);
      const bar = hpBar(this, 112, 64, w - 130, 6, h.hpRatio);
      const hp = elBody(this, 112, 82, session.showHp && !fallen ? `${Math.round(h.hpRatio * 100)}% health` : '', 14, EL.DIM).setOrigin(0, 0.5);
      if (fallen) face.setAlpha(0.32);
      row.add([pic, face, frame, badge.c, name, role, bar, hp]);
      if (fallen) row.add(graveMark(this, 46, 50, 58));
      if (lead?.id === h.id) row.add(crown(this, 14, 14, 0.55));
      const zone = this.add.zone(w / 2, 46, w + 8, 104).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        drawFrame(true);
        this.tweens.add({ targets: row, x: x + 6, duration: 180, ease: EL.EASE });
      });
      zone.on('pointerout', () => {
        drawFrame(false);
        this.tweens.add({ targets: row, x, duration: 180, ease: EL.EASE });
      });
      zone.on('pointerup', () => !this.drag.moved && this.openHero(h.id));
      row.add(zone);
      L.add(row);
    });
    // Formation / Gear artık sol alttaki global ikonlar (camp-hud.ts; Ömer 2026-10-18)
    return y + 44 + team.length * 112 + 16;
  }

  /**
   * Bulunulan düğümün kompakt bilgisi (Ömer 2026-10-12: tek dokunuşla yürüme geldi, "Selected road" kalktı; diğer düğümlerin bilgisi
   * hover kartında / savaş onayında): başlık "You are here" + ince çizgi, 64 px glif karosu, ad, tür.
   * `maxY` (sol alt bilgi bloğunun üstü) aşılacaksa blok çizilmez (telefonda 4 kahramanlı takım).
   */
  private renderNodeCard(x: number, y: number, w: number, maxY: number): void {
    if (y + 34 + 64 > maxY) return;
    const s = this.s;
    const L = this.hud;
    const n = node(this.map, s.at);
    L.add(elText(this, x, y, 'You are here', 14, 'rgba(217,178,106,0.85)', { em: 0.24 }).setOrigin(0, 0.5));
    const ln = this.add.graphics();
    fadeLine(ln, x, x + w, y + 18, EL.GOLD, 0.45, 'out');
    L.add(ln);
    const cy = y + 34;
    const T = 64;
    const tile = this.add.graphics();
    tile.fillStyle(0x120c08, 1).fillRect(x, cy, T, T).lineStyle(1, EL.GOLD, EL.LINE.a3).strokeRect(x + 0.5, cy + 0.5, T - 1, T - 1);
    tile.fillStyle(0x140e09, 0.95).fillCircle(x + T / 2, cy + T / 2, 22).lineStyle(1, EL.GOLD, 0.7).strokeCircle(x + T / 2, cy + T / 2, 22);
    L.add(tile);
    const tileArt = nodeGlyphImage(this, n.type, x + T / 2, cy + T / 2, 42);
    if (tileArt) L.add(tileArt);
    else drawNodeGlyph(tile, n.type, EL.ON_N, 0.95, x + T / 2, cy + T / 2);
    const tx = x + T + 16;
    const tw = w - T - 20;
    L.add(fitW(elText(this, tx, cy + 10, n.name, 19, EL.ON, { em: 0.05 }).setOrigin(0, 0.5), tw));
    L.add(fitW(elBody(this, tx, cy + 34, n.subtitle || TYPE_LABEL[n.type], 16, EL.NOTE).setOrigin(0, 0.5), tw));
    // Duraklatılmış savaş (Retreat to Map): düğüme dokununca aynı turdan sürer
    const paused = suspendedOf(s);
    if (paused) L.add(fitW(elBody(this, tx, cy + 56, `Battle paused · turn ${paused.turn + 1}`, 15, EL.BAD).setOrigin(0, 0.5), tw));
    // Yönerge satırı yok (Ömer 2026-10-13: "Click a glowing node to march" vb. bariz ipuçları kaldırıldı)
  }

  /** Düğüm bilgi satırları (hover kartı ve savaş onayı ortak): tür · durum, düşmanlar, sonraki duraklar. */
  private nodeFacts(id: string): { kind: string; foes: string; then: string; blurb: string; faces: string[] } {
    const s = this.s;
    const n = node(this.map, id);
    const step = nextStep(s);
    const vis = nodeVisibility(this.map, s, session.revealFog)[id];
    const option = step.kind === 'move' && step.options.includes(id);
    const state = id === s.at ? 'You are here' : vis === 'cleared' ? 'Cleared' : option ? 'Reachable' : vis === 'closed' ? 'Road closed' : vis === 'goal' ? 'Your goal' : 'Ahead';
    const kind = `${n.subtitle || TYPE_LABEL[n.type]}  ·  ${state}`;
    let foes = '';
    let faces: string[] = [];
    let blurb = '';
    if (n.encounter && vis !== 'goal') {
      const p = enemyPreview(n.encounter);
      const leader = p.leader && !p.names.includes(p.leader) ? `  (led by ${p.leader})` : '';
      foes = `${p.names.join(', ')}${leader}`;
      faces = p.classes.filter((c) => !!content.classes[c]).slice(0, 6);
    } else if (vis !== 'goal')
      blurb = n.type === 'town' ? 'Rest, recruit and trade. Your heroes recover here.' : n.type === 'treasure' ? 'A cache of gear and gold.' : n.type === 'event' ? 'A crossroads encounter.' : n.type === 'rest' ? 'Make camp for free and recover. The fallen can be revived here for gold.' : n.type === 'merchant' ? 'Odo the Peddler sells gear and buys yours.' : '';
    const after = vis === 'goal' ? [] : outgoing(this.map, id).map((a) => node(this.map, a));
    const then = after.map((a) => `${a.name} (${TYPE_LABEL[a.type]})`).join(' or ');
    return { kind, foes, then, blurb, faces };
  }

  /** Düğüm bilgi kartı (fare hover / dokunmatik uzun basış): ad, tür · durum, düşman portreleri + adlar, "Then". İmlecin yanında. */
  private showNodeTip(id: string, p: Phaser.Input.Pointer): void {
    this.hideNodeTip();
    if (nodeVisibility(this.map, this.s, session.revealFog)[id] === 'fog') return;
    const n = node(this.map, id);
    const f = this.nodeFacts(id);
    const c = this.compact();
    const w = c ? 600 : 420;
    const k = c ? 1.35 : 1;
    const pad = 20;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = pad;
    const title = fitW(elText(this, pad, y + 12 * k, n.name, Math.round(21 * k), EL.ON, { em: 0.05 }).setOrigin(0, 0.5), w - pad * 2);
    parts.push(title);
    y += 28 * k;
    const kind = elBody(this, pad, y, f.kind, Math.round(16 * k), EL.NOTE, true, w - pad * 2);
    parts.push(kind);
    y += kind.height + 10;
    if (f.faces.length) {
      const fs = Math.round(40 * k);
      f.faces.forEach((cid, i) => {
        const fx = pad + i * (fs + 8);
        const fr = this.add.graphics();
        fr.fillStyle(0x120c08, 1).fillRect(fx, y, fs, fs).lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(fx + 0.5, y + 0.5, fs - 1, fs - 1);
        parts.push(fr, classAvatar(this, content.classes[cid]!, fx + fs / 2, y + fs / 2, fs - 2, true));
      });
      y += fs + 8;
    }
    const line = (label: string, text: string) => {
      if (!text) return;
      const lab = elText(this, pad, y + 10 * k, label, Math.round(13 * k), 'rgba(217,178,106,0.85)', { em: 0.22 }).setOrigin(0, 0.5);
      const off = Math.round(64 * k);
      const t = elBody(this, pad + off, y, text, Math.round(16 * k), EL.TXT, true, w - pad * 2 - off);
      parts.push(lab, t);
      y += t.height + 6;
    };
    line('Foes', f.foes);
    if (f.blurb) {
      const t = elBody(this, pad, y, f.blurb, Math.round(16 * k), EL.NOTE, true, w - pad * 2);
      parts.push(t);
      y += t.height + 6;
    }
    line('Then', f.then);
    const h = y + pad - 6;
    const root = this.add.container(0, 0).setDepth(1500);
    root.add([elPanel(this, 0, 0, w, h, { alpha: 0.94 }), ...parts]);
    root.setData('size', { w, h });
    this.ui.add(root);
    this.nodeTip = root;
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

  /** Alt orta: ◂ ▸ (kaydır) − + (yakınlaştır); dokunma alanı >= 56 px. */
  private renderControls(): void {
    // Telefonda dokunma hedefi >= 44 gerçek px: düğmeler büyür
    const size = this.compact() ? 92 : 52;
    const step = size + 12;
    const y = H - 18 - size / 2;
    const mk = (label: string, x: number, run: () => void) => {
      const b = elIconButton(this, { label }, () => !this.modal && !this.menuOpen && run(), { size });
      b.root.setPosition(x, y);
      this.hud.add(b.root);
      return b.root;
    };
    this.panBtns.left = mk('◂', W / 2 - 60 - step, () => this.panBy(-PAN_STEP, 0));
    this.panBtns.right = mk('▸', W / 2 - 60, () => this.panBy(PAN_STEP, 0));
    this.panBtns.minus = mk('−', W / 2 + 60, () => this.setMapZoom(this.mapZoom - MAP_ZOOM.step));
    this.panBtns.plus = mk('+', W / 2 + 60 + step, () => this.setMapZoom(this.mapZoom + MAP_ZOOM.step));
    this.hud.add(elText(this, W / 2, y, 'Map', 12, EL.DIM, { em: 0.24 }).setOrigin(0.5));
    this.updatePanButtons();
  }

  /** Mevcut düğümde dokunarak açılacak bir eylem var mı (savaş, kasaba, olay, hazine, sefer sonu). */
  private actionHere(): boolean {
    return ['battle', 'town', 'story', 'event', 'treasure', 'rest', 'merchant', 'complete'].includes(nextStep(this.s).kind);
  }

  /** Lejant (sağ alt, katlanabilir): 6 düğüm türü, kit paneli. */
  private renderLegend(): void {
    const L = this.hud;
    const w = 300;
    const x = stageView.right - SIDE.left - w; // sağ alt (Ömer 2026-10-09; görünür DEBUG düğmesi yok)
    const open = this.legendOpen;
    const h = open ? 188 : 48;
    const y = H - 24 - h;
    L.add(elPanel(this, x, y, w, h, { alpha: 0.88 }));
    L.add(elText(this, x + 18, y + 24, 'Legend', 14, 'rgba(217,178,106,0.85)', { em: 0.24 }).setOrigin(0, 0.5));
    L.add(elBody(this, x + w - 18, y + 24, open ? 'hide' : 'show', 16, EL.MUTED).setOrigin(1, 0.5));
    const hit = this.add.zone(x + w / 2, y + 24, w, 52).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      this.legendOpen = !this.legendOpen;
      this.renderHud();
    });
    L.add(hit);
    if (!open) return;
    const types: NodeType[] = ['battle', 'elite', 'boss', 'town', 'treasure', 'event', 'rest', 'merchant'];
    types.forEach((t, i) => {
      const cx = x + 32 + (i % 2) * 140;
      const cy = y + 64 + Math.floor(i / 2) * 32;
      const g = this.add.graphics();
      g.fillStyle(0x140e09, 1).fillCircle(cx, cy, 12).lineStyle(1, EL.GOLD, 0.7).strokeCircle(cx, cy, 12);
      L.add(g);
      const legendArt = nodeGlyphImage(this, t, cx, cy, 26);
      if (legendArt) L.add(legendArt);
      else drawNodeGlyph(g, t, 0xd9c8a2, 0.5, cx, cy);
      L.add(elBody(this, cx + 20, cy, TYPE_LABEL[t], 17, EL.TXT, false).setOrigin(0, 0.5));
    });
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
    hud.setGlow('gear', this.s.roster.some((h) => (h.statPoints ?? 0) > 0));
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
      const h = openLootScreen(root, {
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
            points: (u.to - u.from) * LEVELS.statPointsPerLevel,
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
        if (choices.length) return this.choiceEvent(step.event, step.node, choices);
        this.modal = openModal(this, this.ui, { title: e.title, subtitle: node(this.map, step.node).subtitle, text: e.text, height: 500, buttons: [{ label: 'Continue', primary: true, run: () => this.commit(completeSimple(this.s, 'event')) }] });
        return;
      }
      case 'treasure': {
        const t = TREASURES[step.treasure] ?? { title: 'Treasure', text: 'You find a chest.', reward: 'Open the chest to claim its gear and gold.' };
        this.modal = openModal(this, this.ui, { title: 'Treasure', subtitle: t.title, text: `${t.text}\n\n${t.reward ?? ''}`, height: 500, buttons: [{ label: 'Open the chest', primary: true, run: () => this.commit(completeSimple(this.s, 'treasure')) }] });
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
        return this.townNote(h.label, h.note ?? 'No one here seeks to join you.');
      }
      case 'story':
        if (tn.story) this.storyScene(tn.story, tn.id, true);
        return;
      case 'rest':
        return this.townNote(h.label, CONFIG.texts.townRested ?? CONFIG.texts.townRest ?? '');
      case 'leave':
        return this.commit(completeSimple(this.s, 'town'));
    }
  }

  /** Kasaba ekranında kısa bilgi penceresi (ateş, adayı olmayan ilan panosu): Close, Esc ya da zemine dokunma kapatır. */
  private townNote(title: string, text: string): void {
    this.closeModal();
    this.modal = openModal(this, this.ui, {
      title,
      subtitle: node(this.map, this.s.at).name,
      text,
      fit: true,
      width: this.compact() ? 1300 : 980,
      buttons: [{ label: 'Close', primary: true, run: () => this.closeModal() }],
      onDismiss: () => this.closeModal(),
    });
  }

  /**
   * Kışla / ilan panosundan aday (Ömer 2026-10-12): ayrılırken gelecek gönüllü kasabadayken seçilebilir (zorunlu değil: Not now, Esc, zemin).
   * Seçilmezse kasabadan ayrılırken eskisi gibi sorulur.
   */
  private townRecruitModal(h: TownHotspot, offer: string[]): void {
    this.closeModal();
    let chosen = '';
    const m = openModal(this, this.ui, {
      title: h.label,
      text: CONFIG.texts.townRecruit ?? CONFIG.texts.volunteer ?? '',
      width: 1100,
      height: 660,
      buttons: [
        { label: 'Not now', run: () => this.closeModal() },
        {
          label: 'Join us',
          primary: true,
          run: () => {
            if (!chosen) return this.toast('Pick one companion first.');
            setState(recruitInTown(this.s, chosen));
            this.closeModal();
            this.town?.render();
            this.renderHud();
            this.toast(`${content.classes[chosen]?.name ?? chosen} joins your company`);
          },
        },
      ],
      onDismiss: () => this.closeModal(),
    });
    this.modal = m;
    const cards = this.classGrid(offer, m.area, (id) => {
      chosen = id;
      cards.forEach((c, k) => c.setSelected(k === id));
    }, m.root);
  }

  /**
   * Dinlenme noktası (Ömer 2026-10-11): ücretsiz dinlenme (yaşayanlar maks canın %50'si) + düşmüş kahramanı altınla diriltme (tüccar değil).
   * Kit diyaloğu; diriltme düğmeleri altın yetmezse soluk.
   */
  private restModal(nodeId: string, revisit = false): void {
    const s = this.s;
    const n = node(this.map, nodeId);
    const fallen = s.roster.filter((h) => isFallen(h) && !h.tutorial);
    const cost = reviveCost(s, nodeId);
    const heal = Math.round(restHealOf(s) * 100);
    // Yeniden giriş: dinlenme bir kez (ikinci kez iyileştirmez); diriltme ve Gear açık, Leave pencereyi kapatır
    const lines = [revisit ? 'Your company has already rested here.' : `Your company makes camp. Resting is free: every living hero recovers ${heal}% of their max HP.`];
    lines.push(fallen.length ? `Fallen heroes can be revived here for ${cost} gold each (they rise with ${Math.round(CONFIG.rest.reviveRatio * 100)}% HP). You have ${s.gold} gold.` : 'No one has fallen.');
    const revive = fallen.slice(0, 3).map((h) => ({
      label: `Revive ${content.classes[h.class]?.name ?? h.class} · ${cost}`,
      run: () => {
        if (this.s.gold < cost) return this.toast('Not enough gold');
        setState(reviveAtCamp(this.s, h.id));
        this.closeModal();
        this.renderHud(); // altın ve kahramanın canı hemen güncellensin
        this.restModal(nodeId, revisit);
      },
    }));
    this.modal = openModal(this, this.ui, {
      title: n.name,
      subtitle: n.subtitle,
      text: lines.join('\n\n'),
      height: 500,
      buttons: [
        ...revive,
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
      if (r.hint) this.modal!.root.add(elBody(this, a.x + 40 + bw + 34, y, r.hint, phone ? 26 : 21, EL.NOTE, true, a.w - bw - 110).setOrigin(0, 0.5));
    });
  }

  /** Seçenekli olay (N2): seçim -> sonuç metni (Continue ile kaydedilir) ya da olay savaşı. */
  private choiceEvent(eventId: string, nodeId: string, choices: EventChoice[]): void {
    const e = EVENTS[eventId]!;
    const n = node(this.map, nodeId);
    this.lessons('event');
    this.choiceModal({
      title: e.title,
      subtitle: n.name,
      text: e.text,
      rows: choices.map((c) => {
        const blocked = choiceBlocked(this.s, c);
        return {
          label: c.label,
          hint: `${c.hint ?? ''}${blocked ? ` (you have ${this.s.gold} gold)` : ''}`,
          dim: !!blocked,
          run: () => {
            if (blocked) return this.toast(blocked);
            const next = chooseEvent(this.s, c.id);
            if (next.eventChoice?.battle) return this.commit(next); // olay savaşı: harita savaş adımına geçer
            this.closeModal();
            this.modal = openModal(this, this.ui, { title: e.title, subtitle: c.label, text: c.result ?? '', height: 480, buttons: [{ label: 'Continue', primary: true, run: () => this.commit(next) }] });
          },
        };
      }),
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
    const body = elBody(this, 0, 0, text, 20, EL.NOTE, true, w - 110);
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
    if (step.kind === 'move' && step.options.includes(id)) return this.chooseRoad(id);
    if (id === this.s.at && step.kind === 'battle' && !this.s.suspended && this.formationDue()) return this.nudgeFormation();
    if (id === this.s.at && step.kind === 'battle') return this.s.suspended ? this.resumeBattle(id) : this.confirmBattle(id, () => void startCampaignBattle(this));
    if (id === this.s.at && this.actionHere()) return ['town', 'rest', 'merchant', 'event', 'treasure'].includes(step.kind) ? this.confirmPlace(id, () => this.advance()) : this.advance();
    // Adımları bitmiş kasaba / tüccar / kampa yeniden gir (Ömer 2026-10-13, "Ashford'a giremiyorum"): Leave sonrası da tekrar açılır
    if (id === this.s.at && step.kind === 'move') {
      const k = revisitKind(this.s);
      if (this.pausedBlocks()) return;
      if (k === 'rest') return this.confirmPlace(id, () => this.restModal(id, true));
      if (k) return this.confirmPlace(id, () => this.commit(revisitNode(this.s)));
    }
    const p = this.input.activePointer;
    if (p.wasTouch) {
      this.showNodeTip(id, p);
      const tip = this.nodeTip;
      this.time.delayedCall(2600, () => tip === this.nodeTip && this.hideNodeTip());
    }
  }

  /** Düğümde varışta savaş başlayacak mı (karşılaşması olan, henüz geçilmemiş düğüm; korumalı hazine dahil). */
  private fightsAt(id: string): boolean {
    return !!node(this.map, id).encounter && nodeVisibility(this.map, this.s, session.revealFog)[id] !== 'cleared';
  }

  /**
   * Yol seçimi: her düğümde aynı anchored kart (Ömer 2026-10-18): savaşta "Start battle?" (Fight = yürü + savaşı başlat), savaşsızda
   * düğümün kendi kartı (Enter / Rest / Trade / Open / Continue = yürü; kasaba / dinlenme / tüccar / olay ekranı varışta açılır).
   * Eski "Take this road?" (Yes/No) penceresi kalktı; "diğer yollar kapanır" notu da yok (Ömer).
   */
  private chooseRoad(id: string): void {
    if (this.pausedBlocks()) return;
    const step = nextStep(this.s);
    if (step.kind !== 'move' || !step.options.includes(id)) return;
    const fork = step.options.length > 1;
    if (this.fightsAt(id)) return this.confirmBattle(id, () => this.march(id, true));
    if (!fork) return this.march(id);
    const f = this.nodeFacts(id);
    this.modal = openModal(this, this.ui, {
      title: 'Take this road?',
      subtitle: `${node(this.map, id).name}  ·  ${f.kind}`,
      text: `${f.blurb ? `${f.blurb}\n` : ''}The other roads will close for this journey.`,
      fit: true,
      buttons: [
        { label: 'No', run: () => this.closeModal() },
        { label: 'Yes', primary: true, run: () => this.march(id) },
      ],
      onDismiss: () => this.closeModal(), // onay: zemin = No
    });
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
  private confirmPlace(id: string, go: () => void): void {
    const n = node(this.map, id);
    const t = PLACE_CARD[n.type] ?? { title: 'Continue?', action: 'Continue' };
    this.nodeCard(id, { title: t.title, actionLabel: t.action, fallback: { text: this.nodeFacts(id).blurb }, onGo: go });
  }

  private nodeCard(id: string, o: { title?: string; actionLabel?: string; foes?: FoeGroup[]; fallback?: { who?: string; text: string; quote?: boolean } | undefined; onGo: () => void }): void {
    const root = document.getElementById('ui-root');
    const n = node(this.map, id);
    if (!root) return;
    this.closeModal();
    const info = startCardInfo(n.lore, o.fallback?.text ? o.fallback : undefined);
    let card: StartBattleHandle | null = null;
    const close = (): void => {
      card?.close();
      card = null;
      this.modal = null;
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
    onStageResize(this, () => handle.place());
    // Esc / başka pencereler `this.modal.close()` ile kapatır; yalnızca close() kullanılır
    this.modal = { close, root: undefined, area: { x: 0, y: 0, w: 0, h: 0 } } as unknown as Modal;
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

  /** Yürüyüş. `fight`: varınca (onaylanmış) savaş kendiliğinden başlar; araya bekleyen kart / hikâye girerse oyuncu düğüme dokunur. */
  private march(to: string, fight = false): void {
    this.closeModal();
    this.hideNodeTip();
    const from = this.s.at;
    const before = node(this.map, from).region;
    this.update2(moveTo(this.s, to));
    this.tip?.destroy(true);
    this.tip = null;
    this.walk(from, to, () => {
      this.refresh(true);
      const region = node(this.map, to).region;
      const banner = region !== before;
      if (banner) this.regionBanner(region);
      // Onaylanmış savaş: varışta (ya da araya giren kart / aday / hikâye penceresi kapanınca) advance kendiliğinden başlatır
      this.pendingFight = fight ? { node: to, delay: banner ? 1400 : 250 } : null;
      this.advance();
    });
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
  private openHero(heroId: string, after?: () => void): void {
    if (!this.canOpenSide()) return;
    this.closeModal();
    this.openGear(heroId, false, after);
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

  private pickHeroModal(): void {
    let chosen = '';
    const m = openModal(this, this.ui, {
      title: 'Choose your hero',
      text: CONFIG.texts.intro,
      // 2 kart (Warrior / Archer; Ömer 2026-10-14): pencere aday penceresi gibi kısa; eski 1500x900 11 kart içindi
      width: 1300,
      height: 640,
      buttons: [
        {
          label: 'Begin the journey',
          primary: true,
          run: () => {
            if (!chosen) return this.toast('Pick a hero first.');
            this.update2(pickHero(this.s, chosen));
            markJourneyStart();
            this.commit(this.s);
          },
        },
      ],
    });
    this.modal = m;
    const cards = this.classGrid(this.sorted(CONFIG.starterPool), m.area, (id) => {
      chosen = id;
      cards.forEach((c, k) => {
        c.setSelected(k === id);
        c.setLeader(k === id);
      });
    }, m.root);
  }

  private recruitModal(step: Extract<NextStep, { kind: 'recruit' | 'volunteer' }>): void {
    let chosen = '';
    const m = openModal(this, this.ui, {
      title: step.kind === 'volunteer' ? 'A Volunteer' : 'A New Companion',
      text: step.kind === 'volunteer' ? CONFIG.texts.volunteer : CONFIG.texts.recruitBefore,
      width: 1100,
      height: 660,
      buttons: [
        {
          label: 'Join us',
          primary: true,
          run: () => {
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
    this.modal = m;
    const cards = this.classGrid(step.offer, m.area, (id) => {
      chosen = id;
      cards.forEach((c, k) => c.setSelected(k === id));
    }, m.root, (id) => (isAreaClass(id) && node(this.map, step.node).recruit?.requireArea ? 'Area attacks' : undefined));
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
