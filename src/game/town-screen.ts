import Phaser from 'phaser';
import { content } from '../engine';
import { CONFIG, activeHeroes, hotspotOffered, idleStartFrame, hotspotRect, leaderOf, nextStep, partySpots, smithHotspot, townCover, townScene, type CampaignState, type Cover, type MapNode, type TownHotspot } from '../campaign';
import { animKey, characterTexture } from './assets';
import { H, W, crown } from './campaign-ui';
import { checkpoint, setState } from './campaign-session';
import { openBlacksmith } from '../ui/blacksmith-screen';
import { openInn } from '../ui/inn-screen';
import { worldSound } from '../ui/ui-sound';
import { EL, elBody, elGlow, elText, fadeLine, vGradient } from './elegant-ui';
import { stageView } from './stage';
import { growTouchZone } from './touch-hit';
import { ensureIcon } from './icons';
import { loadTownArt, townArtKey } from './town-art';
import { reducedMotion } from '../ui/motion-pref';

/**
 * Kasaba ekranı (Ömer 2026-10-12, future-ideas "SIRADA" (1)): kasabaya girince tam ekran kasaba görseli (Ashford köy meydanı, Valdren Keep
 * kale avlusu), önde takım (dokun = Gear), resimdeki yerler tıklanabilir (valdoria.json > nodes[].scene.hotspots: tezgâh = Trade, ilan
 * panosu / kışla = aday, NPC = hikâye sahnesi yeniden, Inn (kahramanı bırak / geri al; 2026-10-26), demirci = Temper / Reforge
 * (TUR 1 madde 7; yeri campaign.json > blacksmith), yol / kapı = Leave). Formation düğmesi yok (haritanın takım
 * sütununda). Kurallar ve geometri saf: src/campaign/town.ts.
 *
 * Girdi: fare = üstüne gelince vurgu + etiket, tıklama = eylem. Dokunmatik = haritadaki düğüm kuralı: ilk dokunuş seçer (vurgu + "Tap again"),
 * aynı yere ikinci dokunuş eylemi yapar.
 * Sahne bu ekranı CampaignMapScene'in arayüz katmanına koyar (pencereler ve bildirimler üstünde açılır); ekran boyutu değişince `render()`.
 */
export interface TownScreenHooks {
  state: () => CampaignState;
  /** Pencere / menü / Gear açıkken ekran girdiyi yok sayar. */
  busy: () => boolean;
  hotspot: (h: TownHotspot) => void;
  hero: (heroId: string) => void;
  /** Kısa / dar ekran (telefon yatay): etiketler büyür. */
  compact: () => boolean;
}

/** Görsel yoksa (dosya eksik / yükleniyor) cover hesabı için varsayılan boyut: kaynak görsellerin boyutu. */
const FALLBACK_SIZE = { w: 1536, h: 1024 };

export class TownScreen {
  readonly root: Phaser.GameObjects.Container;
  /** Dokunmatikte seçili yer / kahraman (ikinci dokunuş eylem). */
  private selected: string | null = null;
  /** Yerlerin ekrandaki merkezi + yarım genişliği (arayüz katmanı koordinatı; harita pencereleri C kartı yanına açılır). */
  private spotCenters = new Map<string, { x: number; y: number; hw: number }>();
  /** Etiket plakası dokunma alanları (telefonda 44 px'e büyütülür; growLabelZones). */
  private labelZones: { zone: Phaser.GameObjects.Zone; x: number; y: number; w: number; h: number }[] = [];
  private hovered: string | null = null;
  private painters = new Map<string, (on: boolean) => void>();
  private destroyed = false;
  /** Açık Inn ekranı (DOM; Ömer 2026-10-26): kapatma işlevi. */
  private closeInn: (() => void) | null = null;
  /** Açık demirci ekranı (DOM; TUR 1 madde 7): kapatma işlevi. */
  private closeSmith: (() => void) | null = null;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    readonly node: MapNode,
    private hooks: TownScreenHooks,
    index?: number,
  ) {
    this.root = scene.add.container(0, 0);
    if (index !== undefined) layer.addAt(this.root, index);
    else layer.add(this.root);
    const def = townScene(node);
    const ready = def ? loadTownArt(scene, def.background, () => !this.destroyed && this.render(true)) : false;
    this.render(false);
    if (ready || reducedMotion()) return;
    this.root.setAlpha(0);
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 260, ease: EL.EASE });
  }

  get nodeId(): string {
    return this.node.id;
  }

  destroy(): void {
    this.destroyed = true;
    this.closeInn?.();
    this.closeInn = null;
    this.closeSmith?.();
    this.closeSmith = null;
    this.root.destroy(true);
  }

  /**
   * Yere dokunuldu. Inn (action 'inn'; Ömer 2026-10-26, eski ateş başı dinlenmesinin yerine) ve demirci (smith) bu ekranda çözülür: DOM ekranlar.
   * Diğer yerler sahneye gider (hooks.hotspot).
   */
  private onSpot(h: TownHotspot): void {
    if (h.action !== 'inn' && h.action !== 'smith') return this.hooks.hotspot(h);
    if (nextStep(this.hooks.state()).kind !== 'town') return;
    const root = document.getElementById('ui-root');
    if (!root || this.closeSmith || this.closeInn) return;
    if (h.action === 'inn') {
      worldSound('door');
      this.closeInn = openInn(root, () => this.hooks.state(), (x) => setState(x), {
        town: this.node.name,
        townId: this.node.id,
        onClose: () => {
          this.closeInn = null;
          checkpoint(); // bırakılan / alınan kahramanlar kayda girsin
          this.render();
        },
      });
      return;
    }
    this.closeSmith = openBlacksmith(root, () => this.hooks.state(), (x) => setState(x), {
      sub: this.node.name,
      onClose: () => {
        this.closeSmith = null;
        this.render();
      },
    });
  }

  /** Ekranı baştan çizer (ilk kurulum, görsel yüklenince, ekran boyutu değişince, Gear / aday sonrası takım güncellenince). */
  render(fadeArt = false): void {
    if (this.destroyed) return;
    const s = this.scene;
    this.root.removeAll(true);
    this.painters.clear();
    this.hovered = null;
    this.spotCenters.clear();
    this.labelZones = [];
    const def = townScene(this.node);
    const left = stageView.left;
    const right = stageView.right;
    const view = { x: left, y: 0, w: right - left, h: H };
    // Zemin: tüm görünür alanı kaplar ve alttaki haritaya giden dokunuşları yutar (boş yere dokunmak seçimi bırakır)
    const floor = s.add.rectangle(left, 0, right - left, H, 0x0b0705, 1).setOrigin(0, 0).setInteractive();
    floor.on('pointerup', () => this.select(null));
    this.root.add(floor);
    const key = def ? townArtKey(def.background) : '';
    let cover: Cover;
    if (def && s.textures.exists(key)) {
      const img = s.add.image(0, 0, key).setOrigin(0, 0);
      cover = townCover({ w: img.width, h: img.height }, view, def.focusY);
      img.setPosition(cover.x, cover.y).setScale(cover.scale);
      this.root.add(img);
      if (fadeArt && !reducedMotion()) {
        img.setAlpha(0);
        s.tweens.add({ targets: img, alpha: 1, duration: 320, ease: EL.EASE });
      }
    } else cover = townCover(FALLBACK_SIZE, view, def?.focusY);
    // Okunurluk: üstte başlık, altta takım adları için yumuşak koyulaşma
    const shade = s.add.graphics();
    vGradient(shade, left, 0, right - left, 190, 0x080604, [
      [0, 0.82],
      [1, 0],
    ]);
    vGradient(shade, left, H - 230, right - left, 230, 0x080604, [
      [0, 0],
      [1, 0.78],
    ]);
    this.root.add(shade);
    // Başlık (üst orta): kasaba adı + alt yazı; sağ üstte Menu (DOM) durur
    const title = elText(s, W / 2, 46, this.node.name, 38, '#ffffff', { em: 0.12 }).setOrigin(0.5).setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f);
    this.root.add(title);
    const lines = s.add.graphics();
    fadeLine(lines, W / 2 - 300, W / 2, 80, EL.GOLD, 0.45, 'in');
    fadeLine(lines, W / 2, W / 2 + 300, 80, EL.GOLD, 0.45, 'out');
    this.root.add(lines);
    this.root.add(elBody(s, W / 2, 104, this.node.subtitle, this.hooks.compact() ? 28 : 21, EL.MUTED).setOrigin(0.5));
    if (def) for (const h of def.hotspots) if (hotspotOffered(this.node, h, this.hooks.state())) this.addHotspot(h, cover); // dinlenmiş hikâyenin NPC'si yok
    // Demirci (TUR 1 madde 7): yeri campaign.json > blacksmith.hotspots'ta (kasabanın kendi verisi değil)
    const smith = smithHotspot(this.node);
    if (def && smith && smith.rect[2] > smith.rect[0]) this.addHotspot(smith, cover);
    this.growLabelZones();
    this.addParty();
    // Seçim yeniden çizimden sonra korunur (ör. ekran döndürülünce)
    if (this.selected) this.painters.get(this.selected)?.(true);
  }

  /** Yerin merkezi (arayüz katmanı koordinatı) ya da null. */
  hotspotCenter(id: string): { x: number; y: number; hw: number } | null {
    return this.spotCenters.get(id) ?? null;
  }

  private compactLabel(): number {
    return this.hooks.compact() ? CONFIG.townScreen.labelSizePhone : CONFIG.townScreen.labelSize;
  }

  /**
   * Telefonda etiket plakalarının dokunma alanını (görünüm aynı) en az 44 gerçek piksele büyütür. Üst üste binen komşu etiketle arasındaki boşluğu
   * paylaşır: iki alan birbirine en çok boşluk kadar yaklaşır, çakışmaz.
   */
  private growLabelZones(): void {
    for (const a of this.labelZones) {
      let free = Infinity;
      for (const b of this.labelZones) {
        if (a === b || Math.abs(a.x - b.x) >= (a.w + b.w) / 2) continue; // yatayda ayrık: dikey büyüme çakışmaz
        free = Math.min(free, Math.max(0, Math.abs(a.y - b.y) - (a.h + b.h) / 2));
      }
      growTouchZone(this.scene, a.zone, a.w, a.h, { maxExtraH: free });
    }
  }

  /** Bir yer: vurgu çerçevesi (gizli), her zaman görünen etiket plakası, dokunma alanı. */
  private addHotspot(h: TownHotspot, cover: Cover): void {
    const s = this.scene;
    const r = hotspotRect(h, cover);
    this.spotCenters.set(h.id, { x: r.x + r.w / 2, y: r.y + r.h / 2, hw: r.w / 2 });
    const id = `spot:${h.id}`;
    const glow = s.add.graphics().setAlpha(0);
    const pad = 6;
    glow.fillStyle(EL.EMBER2, 0.08).fillRoundedRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, 14);
    glow.lineStyle(6, EL.EMBER, 0.18).strokeRoundedRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, 14);
    glow.lineStyle(2, EL.ON_N, 0.75).strokeRoundedRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, 14);
    this.root.add(glow);
    // Etiket: yerin üst ortasında (başlığın altına taşmaz), ekranın kenarından içeride
    const size = this.compactLabel();
    const text = elText(s, 0, 0, h.label, size, EL.TXT, { em: 0.12 }).setOrigin(0.5);
    const tap = elBody(s, 0, 0, 'Tap again', Math.round(size * 0.82), EL.ON).setOrigin(0.5, 0).setAlpha(0);
    const ph = size * 1.9;
    // Inn yerinin etiketine yatak tabelası ikonu (Ömer 2026-10-26; assets/misc-icons/town/inn)
    const icoSize = h.action === 'inn' ? ph * 1.15 : 0;
    const pw = Math.max(text.width + size * 2.4, size * 6.2) + icoSize * 0.7; // kısa etiketler ("Road Out") dar kalmasın (playtest N1)
    const minX = stageView.left + pw / 2 + 12;
    const maxX = stageView.right - pw / 2 - 12;
    const lx = Phaser.Math.Clamp(r.x + r.w / 2, minX, maxX);
    const ly = Math.max(150 + ph / 2, r.y + ph / 2 + 4);
    const plate = s.add.graphics();
    const drawPlate = (on: boolean): void => {
      plate.clear();
      plate.fillStyle(0x0c0906, on ? 0.9 : 0.72).fillRoundedRect(lx - pw / 2, ly - ph / 2, pw, ph, ph / 2);
      plate.lineStyle(1.5, on ? EL.ON_N : EL.GOLD, on ? 0.9 : 0.4).strokeRoundedRect(lx - pw / 2, ly - ph / 2, pw, ph, ph / 2);
    };
    drawPlate(false);
    const tx = lx + icoSize * 0.35;
    text.setPosition(tx, ly);
    tap.setPosition(lx, ly + ph / 2 + 4);
    this.root.add([plate, text, tap]);
    if (icoSize) this.root.add(s.add.image(lx - pw / 2 + icoSize * 0.62, ly, ensureIcon(s, 'town:inn', '#ffffff', false)).setDisplaySize(icoSize, icoSize));
    const zone = s.add.zone(r.x, r.y, r.w, r.h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    // Etiket plakası da aynı yere götürür (telefonda küçük nesneler için daha büyük hedef)
    const labelZone = s.add.zone(lx, ly, pw, ph).setInteractive({ useHandCursor: true });
    this.labelZones.push({ zone: labelZone, x: lx, y: ly, w: pw, h: ph });
    this.root.add([zone, labelZone]);
    this.painters.set(id, (on) => {
      glow.setAlpha(on ? 1 : 0);
      drawPlate(on);
      text.setColor(on ? EL.ON : EL.TXT);
      elGlow(text, on);
      tap.setAlpha(on && this.selected === id ? 1 : 0);
    });
    for (const z of [zone, labelZone]) this.bindTap(z, id, () => this.onSpot(h));
  }

  /** Takım: alttaki açık alanda ayakta (gerçek sprite ya da yer tutucu), adı ayaklarının altında, liderin üstünde taç. */
  private addParty(): void {
    const s = this.scene;
    const st = this.hooks.state();
    const team = activeHeroes(st);
    const lead = leaderOf(st);
    const cfg = CONFIG.townScreen;
    const spots = partySpots(team.length, { cx: W / 2, feetY: H * (this.hooks.compact() ? cfg.feetYPhone : cfg.feetY), gap: cfg.gap });
    team.forEach((hero, i) => {
      const def = content.classes[hero.class];
      if (!def) return;
      const p = spots[i]!;
      const id = `hero:${hero.id}`;
      const shadow = s.add.ellipse(p.x, p.y - 4, cfg.heroHeight * 0.5, 26, 0x000000, 0.45);
      const ring = s.add.ellipse(p.x, p.y - 4, cfg.heroHeight * 0.62, 34).setStrokeStyle(2, EL.ON_N, 0.85).setFillStyle(EL.EMBER2, 0.12).setAlpha(0);
      this.root.add([shadow, ring]);
      const tex = characterTexture(s, def.spriteId, def.color);
      const frame = tex.real && s.textures.get(tex.key).has('0') ? '0' : undefined;
      const spr = s.add.sprite(p.x, p.y, tex.key, frame).setOrigin(0.5, 1);
      spr.setScale(cfg.heroHeight / spr.height);
      const anim = tex.real ? animKey(def.spriteId, 'idle', s) : null;
      if (anim && s.anims.exists(anim) && !reducedMotion()) spr.play({ key: anim, startFrame: idleStartFrame(i, s.anims.get(anim).getTotalFrames()) }); // tek kareli görselde 0 (0.7.7 Ashford donması)
      this.root.add(spr);
      const size = this.hooks.compact() ? 28 : 19;
      const name = elText(s, p.x, p.y + 10, def.name, size, EL.TXT, { em: 0.1 }).setOrigin(0.5, 0);
      this.root.add(name);
      if (lead?.id === hero.id) this.root.add(crown(s, p.x, p.y - cfg.heroHeight - 14, 1.1));
      const zone = s.add.zone(p.x - cfg.gap * 0.42, p.y - cfg.heroHeight, cfg.gap * 0.84, cfg.heroHeight + 10 + size * 1.4).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      this.root.add(zone);
      this.painters.set(id, (on) => {
        ring.setAlpha(on ? 1 : 0);
        if (on) spr.setTint(0xfff3dc);
        else spr.clearTint();
        name.setColor(on ? EL.ON : EL.TXT);
        elGlow(name, on);
      });
      this.bindTap(zone, id, () => this.hooks.hero(hero.id));
    });
  }

  /** Fare: üstüne gelince vurgu, tıklama eylem. Dokunmatik: ilk dokunuş seçer, aynı yere ikinci dokunuş eylem. */
  private bindTap(zone: Phaser.GameObjects.Zone, id: string, run: () => void): void {
    zone.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || this.busy()) return;
      this.hover(id);
    });
    zone.on('pointerout', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) return;
      if (this.hovered === id) this.hover(null);
    });
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.busy()) return;
      if (p.wasTouch && this.selected !== id) return this.select(id);
      this.select(null);
      run();
    });
  }

  /** Sahnenin meşguliyeti ya da bu ekranın kendi penceresi / demirci ekranı açık. */
  private busy(): boolean {
    return this.hooks.busy() || !!this.closeInn || !!this.closeSmith;
  }

  private hover(id: string | null): void {
    if (this.hovered && this.hovered !== this.selected) this.painters.get(this.hovered)?.(false);
    this.hovered = id;
    if (id) this.painters.get(id)?.(true);
  }

  private select(id: string | null): void {
    const prev = this.selected;
    this.selected = id;
    if (prev && prev !== id) this.painters.get(prev)?.(false);
    if (id) this.painters.get(id)?.(true);
  }
}
