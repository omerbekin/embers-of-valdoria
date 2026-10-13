import Phaser from 'phaser';
import type { CombatantDef } from '../engine';
import { EL } from './elegant-ui';
import { classAvatar, ensureGlow } from './menu-ui';
import { worldXY } from './stage';

/**
 * Yuva doldurma ekranlarının ORTAK sürükle-bırak parçaları (Phaser; CLAUDE.md > Sürükle-bırak, Ömer 2026-10-10; ortak kılavuz
 * docs/design/ui-reference.md). Kullananlar: Quick Battle takım seçimi (hayalet), Endless takım seçimi + dizilim, sefer Formation penceresi.
 * - `makeDragGhost`: sürüklenen karakter kartı (kor ışıması + alttaki GÖLGE + koyu kutu + portre + açık altın çerçeve).
 * - `SlotDrag`: fare + dokunma için tek sürükleme durumu: basınca `begin`, eşik (px) aşılınca hayalet çıkar (`onStart`), her harekette
 *   `onMove` (bırakma hedefi vurgusunu ekran çizer), bırakınca `onDrop`; eşik aşılmadıysa hiçbir şey yapmaz (dokunma/tıklama ekranın
 *   kendi pointerup'ında işlenir: sürükleme olduysa `moved` true döner, tık yok sayılır). Sahne girişlerini kendisi dinler; `destroy` kaldırır.
 */

/** Sürüklenen karakter kartı (Quick Battle görünümü). `flip`: portre ters yöne baksın (düşman tarafı). */
export function makeDragGhost(scene: Phaser.Scene, def: CombatantDef, o: { size?: number; flip?: boolean; depth?: number } = {}): Phaser.GameObjects.Container {
  const s = o.size ?? 112;
  const glow = scene.add.image(0, 0, ensureGlow(scene)).setTint(EL.EMBER).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(s * 1.7, s * 1.7).setAlpha(0.4);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.45).fillRect(-s / 2 + 4, -s / 2 + 12, s, s); // gölge
  g.fillStyle(0x120c08, 1).fillRect(-s / 2, -s / 2, s, s);
  const img = classAvatar(scene, def, 0, 0, s, o.flip);
  const f = scene.add.graphics();
  f.lineStyle(2, EL.ON_N, 1).strokeRect(-s / 2, -s / 2, s, s);
  return scene.add.container(0, 0, [glow, g, img, f]).setDepth(o.depth ?? 6000);
}

type Pt = { x: number; y: number };

export interface SlotDragOptions<T> {
  /** Sürüklemenin başlaması için gereken yol (oyun birimi). */
  threshold: number;
  /** İşaretçiden ekran noktası (varsayılan: dünya koordinatı `worldXY`; pencere içi düzenler kendi dönüşümünü verir). */
  toPoint?: (p: Phaser.Input.Pointer) => Pt;
  /** Eşik aşılınca hayalet kart (yoksa hayaletsiz sürükleme). */
  ghost?: (payload: T, at: Pt) => Phaser.GameObjects.Container | undefined;
  /** Hayalet parmağın ne kadar üstünde dursun (dokunmada kartı parmak kapatmasın). */
  lift?: number;
  /** Hayalet bu kaba eklenir (pencere içi; yoksa sahne kökü). */
  parent?: () => Phaser.GameObjects.Container | null | undefined;
  /** Eşik aşıldı (kaynağı soldur, ipucunu kapat...). */
  onStart?: (payload: T, at: Pt) => void;
  /** Sürüklerken her hareket (bırakma hedefi vurgusu). */
  onMove?: (payload: T, at: Pt) => void;
  /** Bırakıldı (yalnızca eşik aşıldıysa). `outside`: işaretçi oyun alanının dışında kalktı. */
  onDrop: (payload: T, at: Pt, outside: boolean) => void;
  /** Sürükleme bitti ya da iptal edildi (bırakmadan önce çağrılır: hayalet silindi, görsel geri gelsin, vurguyu temizle). */
  onEnd?: (payload: T, moved: boolean) => void;
}

export class SlotDrag<T> {
  private cur: { payload: T; sx: number; sy: number; moved: boolean; ghost?: Phaser.GameObjects.Container } | null = null;
  private readonly move = (p: Phaser.Input.Pointer): void => this.onMove(p);
  private readonly up = (p: Phaser.Input.Pointer): void => this.onUp(p, false);
  private readonly upOut = (p: Phaser.Input.Pointer): void => this.onUp(p, true);

  constructor(private readonly scene: Phaser.Scene, private readonly o: SlotDragOptions<T>) {
    scene.input.on('pointermove', this.move);
    scene.input.on('pointerup', this.up);
    scene.input.on('pointerupoutside', this.upOut);
  }

  /** Bir karta / yuvaya basıldı. */
  begin(payload: T, p: Phaser.Input.Pointer): void {
    this.cancel();
    const q = this.pt(p);
    this.cur = { payload, sx: q.x, sy: q.y, moved: false };
  }

  /** Eşik aşılmış bir sürükleme sürüyor mu (dokunma/tık işleyicileri bunu görünce tıkı yok sayar). */
  get moved(): boolean {
    return !!this.cur?.moved;
  }

  /** Sürüklenen yük (eşik aşıldıysa). */
  get payload(): T | undefined {
    return this.cur?.moved ? this.cur.payload : undefined;
  }

  /** Sürüklemeyi bırakmadan bitir (ekran yeniden çizilirken, pencere kapanırken). */
  cancel(): void {
    const c = this.cur;
    this.cur = null;
    if (!c) return;
    c.ghost?.destroy();
    this.o.onEnd?.(c.payload, c.moved);
  }

  /** Sahne dinleyicilerini kaldır. */
  destroy(): void {
    this.cancel();
    this.scene.input.off('pointermove', this.move);
    this.scene.input.off('pointerup', this.up);
    this.scene.input.off('pointerupoutside', this.upOut);
  }

  private pt(p: Phaser.Input.Pointer): Pt {
    return this.o.toPoint ? this.o.toPoint(p) : worldXY(this.scene, p);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const c = this.cur;
    if (!c) return;
    if (!p.isDown) return this.cancel();
    const q = this.pt(p);
    const lift = this.o.lift ?? 0;
    if (!c.moved) {
      if (Math.hypot(q.x - c.sx, q.y - c.sy) < this.o.threshold) return;
      c.moved = true;
      c.ghost = this.o.ghost?.(c.payload, q);
      if (c.ghost) {
        c.ghost.setPosition(q.x, q.y - lift);
        this.o.parent?.()?.add(c.ghost);
      }
      this.o.onStart?.(c.payload, q);
    }
    c.ghost?.setPosition(q.x, q.y - lift);
    this.o.onMove?.(c.payload, q);
    if (c.ghost?.parentContainer) c.ghost.parentContainer.bringToTop(c.ghost);
  }

  private onUp(p: Phaser.Input.Pointer, outside: boolean): void {
    const c = this.cur;
    if (!c) return;
    const q = this.pt(p);
    this.cancel();
    if (c.moved) this.o.onDrop(c.payload, q, outside);
  }
}
