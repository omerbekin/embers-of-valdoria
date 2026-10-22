import Phaser from 'phaser';
import type { NodeType } from '../campaign';
import type { Modal } from './campaign-ui';
import { openFormationWindow } from '../ui/formation-board';
import { boardHero, boardHints, boardIcons, boardRangeUi, boardTips, type BoardHeroSource } from '../ui/formation-board-data';
import { ensureIcon } from './icons';
import { hasMiscImage, miscIconName } from '../ui/misc-icons';

/**
 * Sefer haritası "War table" parçaları (Ömer 2026-10-09, taslak 2): düğüm glifleri, dizilim (formation) penceresi. Eski kahraman paneli
 * kaldırıldı (Ömer 2026-10-18): kahramana dokunmak / "Hero details" ortak Gear'ı o kahramanın sekmesinde açar. Kurallar src/campaign (moveHero, autoFormation); burası yalnızca çizer ve seçimi iletir.
 */


// ------------------------------------------------------------ düğüm glifleri

/**
 * Düğüm türünün boyalı ikonu (assets/misc-icons/node/<tür>.png; harita madalyonu, düğüm kartı, lejant). Görsel yoksa null: çağıran ince
 * çizgili glifi (drawNodeGlyph) çizer. `size` ekrandaki kenar.
 */
export function nodeGlyphImage(scene: Phaser.Scene, type: NodeType | 'start', x: number, y: number, size: number): Phaser.GameObjects.Image | null {
  if (!hasMiscImage('node', type)) return null;
  return scene.add.image(x, y, ensureIcon(scene, miscIconName('node', type), '#e8c47e', false)).setDisplaySize(size, size);
}

/** Düşmüş kahraman mezar işareti (Ömer 2026-10-11): boyalı `fx:corpse` (savaştaki ceset işaretiyle aynı), yoksa ince çizgili mezar taşı. */
export function graveMark(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.GameObject {
  if (hasMiscImage('fx', 'corpse')) return scene.add.image(x, y, ensureIcon(scene, miscIconName('fx', 'corpse'), '#e8c47e', false)).setDisplaySize(size, size);
  const g = scene.add.graphics();
  const w = size * 0.5, h = size * 0.62;
  g.fillStyle(0x2a2420, 0.95).lineStyle(2, 0xbfae8a, 0.9);
  g.beginPath();
  g.moveTo(x - w / 2, y + h / 2);
  g.lineTo(x - w / 2, y - h / 2 + w / 2);
  g.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, 0, false);
  g.lineTo(x + w / 2, y + h / 2);
  g.closePath();
  g.fillPath().strokePath();
  g.lineBetween(x, y - h * 0.18, x, y + h * 0.18).lineBetween(x - w * 0.22, y - h * 0.05, x + w * 0.22, y - h * 0.05);
  return g;
}

/** Düğüm türünün ince çizgili glifi (merkez ox, oy; s = ölçek, ~24 px kutu). Boyalı ikon yoksa yedek (nodeGlyphImage). */
export function drawNodeGlyph(g: Phaser.GameObjects.Graphics, type: NodeType, col: number, s: number, ox = 0, oy = 0, alpha = 1): void {
  const P = (x: number, y: number) => ({ x: ox + x * s, y: oy + y * s });
  const L = (x1: number, y1: number, x2: number, y2: number) => g.lineBetween(ox + x1 * s, oy + y1 * s, ox + x2 * s, oy + y2 * s);
  g.lineStyle(Math.max(1.5, 2.4 * s), col, alpha);
  switch (type) {
    case 'battle': // çapraz kılıçlar
      L(-9, -9, 9, 9);
      L(9, -9, -9, 9);
      L(-9, 4, -4, 9);
      L(9, 4, 4, 9);
      break;
    case 'elite': // kafatası
      g.strokeCircle(ox, oy - 2 * s, 8 * s);
      g.fillStyle(col, alpha).fillCircle(ox - 3 * s, oy - 3 * s, 1.8 * s).fillCircle(ox + 3 * s, oy - 3 * s, 1.8 * s);
      L(-4, 6, -4, 10);
      L(0, 6, 0, 10);
      L(4, 6, 4, 10);
      break;
    case 'boss': // taç
      g.strokePoints([P(-10, 7), P(-10, -5), P(-5, 1), P(0, -9), P(5, 1), P(10, -5), P(10, 7)], true);
      g.fillStyle(col, alpha).fillCircle(ox, oy + 3 * s, 1.8 * s);
      break;
    case 'town': // burç
      g.strokePoints([P(-9, 9), P(-9, -3), P(-9, -8), P(-5, -8), P(-5, -4), P(-1, -4), P(-1, -8), P(3, -8), P(3, -4), P(9, -4), P(9, 9)], true);
      g.strokePoints([P(-3, 9), P(-3, 3), P(3, 3), P(3, 9)], false);
      break;
    case 'treasure': // sandık
      g.strokeRect(ox - 10 * s, oy - 2 * s, 20 * s, 10 * s);
      g.strokePoints([P(-10, -2), P(-10, -6), P(-6, -9), P(6, -9), P(10, -6), P(10, -2)], false);
      L(-2, -2, -2, 2);
      L(2, -2, 2, 2);
      break;
    case 'event': // soru işareti (yol ayrımı / karşılaşma)
      g.beginPath();
      g.arc(ox, oy - 4 * s, 6 * s, Math.PI * 1.05, Math.PI * 0.45, false);
      g.strokePath();
      L(2.5, 1.5, 0, 4);
      g.fillStyle(col, alpha).fillCircle(ox, oy + 8.5 * s, 1.8 * s);
      break;
    case 'rest': // kamp ateşi (çapraz odunlar + alev)
      L(-9, 9, 9, 3);
      L(9, 9, -9, 3);
      g.strokePoints([P(0, -10), P(5, -2), P(3, 3), P(-3, 3), P(-5, -2)], true);
      break;
    case 'merchant': // kese
      g.strokeCircle(ox, oy + 3 * s, 8 * s);
      g.strokePoints([P(-4, -5), P(-6, -10), P(6, -10), P(4, -5)], false);
      L(-2, 3, 2, 3);
      break;
  }
}

// ------------------------------------------------------------ dizilim (formation)

/**
 * Pencerenin okuduğu dizilim (genel bağdaştırıcı; Endless koşu başı dizilimi 2026-10-10'dan beri takım seçimi ekranında, bu pencerede değil). CampaignState buna
 * doğrudan uyar: `active` = hücre -> kahraman id ('' boş), `roster` = kahramanlar (yalnızca `active`tekiler çizilir; level / ekipman / puan kahraman panelinin sayıları için).
 */
export interface FormationState {
  active: readonly string[];
  roster: ReadonlyArray<Omit<BoardHeroSource, 'leader'> & { leader?: boolean }>;
}

export interface FormationHooks {
  get: () => FormationState;
  move: (heroId: string, cell: number) => void;
  auto: () => void;
  done: () => void;
  /** Eski Phaser penceresinin işaretçi eşlemesi; DOM tahtada kullanılmaz (çağıranlar vermeye devam edebilir). */
  toUi?: (p: Phaser.Input.Pointer) => { x: number; y: number };
  heroPanel?: (heroId: string) => void;
  /** Bitir düğmesinin yazısı (varsayılan 'Done'; Endless: 'Start Run'). */
  doneLabel?: string;
  /** Verilirse solda 'Back' düğmesi olur ve zemine dokunmak / pencereyi kapatmak bunu çağırır (Done yerine). Sefer vermez. */
  back?: () => void;
  /** Alt başlık (varsayılan seferin açıklaması). */
  subtitle?: string;
}

/**
 * Dizilim penceresi (Ömer 2026-10-18, Formation A): ortak DOM tahtası (src/ui/formation-board.ts): 4 sıra x 3 şerit (ön sıra sağda, düşmana bakar), seçili / sürüklenen
 * kahraman için HER hücrede menzil uygunluk rengi, hücre hover kutusu, sağda kahraman paneli. Kahramana TIKLA = seç; seçiliyken BOŞ hücreye tıkla = taşı; takas yalnızca
 * bir kahramanı başka kahramanın üstüne SÜRÜKLEYİNCE (src/campaign > moveHero kuralı değişmedi). Phaser tarafı yalnızca kapatma işleyicisi için boş bir Modal kabuğu döner.
 */
export function openFormation(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, on: FormationHooks): Modal {
  const root = scene.add.container(0, 0);
  layer.add(root);
  const classOf = (id: string): string => on.get().roster.find((h) => h.id === id)?.class ?? '';
  const win = openFormationWindow({
    subtitle: on.subtitle ?? 'The front row faces the enemy.',
    heroes: () => {
      const s = on.get();
      return s.active.flatMap((id) => {
        const h = id ? s.roster.find((x) => x.id === id) : undefined;
        const b = h ? boardHero(h) : null;
        return b ? [b] : [];
      });
    },
    cells: () => on.get().active,
    hintsFor: boardHints(classOf),
    rangeUi: boardRangeUi(),
    icons: boardIcons(),
    tips: boardTips((id) => on.get().roster.find((h) => h.id === id)),
    move: (id, cell) => on.move(id, cell),
    ...(on.heroPanel ? { details: (id: string) => on.heroPanel?.(id) } : {}),
    auto: () => on.auto(),
    done: () => on.done(),
    ...(on.back ? { back: on.back } : {}),
    ...(on.doneLabel ? { doneLabel: on.doneLabel } : {}),
  });
  let closed = false;
  return {
    root,
    area: { x: 310, y: 216, w: 1300, h: 600 },
    close: () => {
      if (closed) return;
      closed = true;
      win.close();
      root.destroy(true);
    },
  };
}
