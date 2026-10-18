import Phaser from 'phaser';
import { content, placementHintText } from '../engine';
import { hintBadge, hintColor } from './formation-hint-ui';
import type { NodeType } from '../campaign';
import { classAvatar } from './menu-ui';
import { SlotDrag, makeDragGhost } from './slot-drag';
import { EL, diamondPts, elBody, elButton, elText, fitW } from './elegant-ui';
import { crown, hpBar, openModal, type Modal } from './campaign-ui';
import { ensureIcon } from './icons';
import { hasMiscImage, miscIconName } from '../ui/misc-icons';

/**
 * Sefer haritası "War table" parçaları (Ömer 2026-10-09, taslak 2): düğüm glifleri, dizilim (formation) penceresi. Eski kahraman paneli
 * kaldırıldı (Ömer 2026-10-18): kahramana dokunmak / "Hero details" ortak Gear'ı o kahramanın sekmesinde açar. Kurallar src/campaign (moveHero, autoFormation); burası yalnızca çizer ve seçimi iletir.
 */

const W = 1920;

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
 * doğrudan uyar: `active` = hücre -> kahraman id ('' boş), `roster` = kahramanlar (yalnızca `active`tekiler çizilir).
 */
export interface FormationState {
  active: readonly string[];
  roster: ReadonlyArray<{ id: string; class: string; hpRatio: number; leader?: boolean }>;
}

const rosterHero = (s: FormationState, id: string) => (id ? s.roster.find((h) => h.id === id) : undefined);

export interface FormationHooks {
  get: () => FormationState;
  move: (heroId: string, cell: number) => void;
  auto: () => void;
  done: () => void;
  /** Arayüz kamerasında işaretçinin dünya noktası (pencere arayüz katmanında). */
  toUi: (p: Phaser.Input.Pointer) => { x: number; y: number };
  heroPanel?: (heroId: string) => void;
  /** Bitir düğmesinin yazısı (varsayılan 'Done'; Endless: 'Start Run'). */
  doneLabel?: string;
  /** Verilirse solda 'Back' düğmesi olur ve zemine dokunmak / pencereyi kapatmak bunu çağırır (Done yerine). Sefer vermez. */
  back?: () => void;
  /** Alt başlık (varsayılan seferin açıklaması). */
  subtitle?: string;
}

/**
 * Dizilim penceresi: 4 sıra x 3 şerit (ön sıra sağda, düşmana bakar). Bir kahramanı başka hücreye SÜRÜKLE ya da önce kahramana sonra
 * hücreye DOKUN: boşsa taşır, doluysa yer değiştirir (src/campaign > moveHero). Sağda seçilen kahramanın notu (yakın dövüş ön sıra ister).
 */
export function openFormation(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, on: FormationHooks): Modal {
  const m = openModal(scene, layer, {
    title: 'Formation',
    subtitle: on.subtitle ?? 'The front row faces the enemy.',
    width: 1360,
    height: 820,
    y: 120,
    buttons: [
      ...(on.back ? [{ label: 'Back', run: () => on.back?.() }] : []),
      { label: 'Auto arrange', run: () => (on.auto(), draw()) },
      { label: on.doneLabel ?? 'Done', primary: true, run: () => on.done() },
    ],
    onDismiss: () => (on.back ? on.back() : on.done()),
  });
  const cell = 128;
  const gap = 10;
  const gw = 4 * cell + 3 * gap;
  const gx = W / 2 - 360 - gw / 2 + 160; // ızgara solda, bilgi sağda
  const gy = m.area.y + 40;
  const layerC = scene.add.container(0, 0);
  m.root.add(layerC);
  let selected = '';
  /** Son taşınan kahraman: bilgi sütunu onu (ve dizilim ipucunu) gösterir. */
  let moved = '';
  // Sürükle-bırak: ortak yardımcı (src/game/slot-drag.ts; Quick Battle / Endless ile aynı hayalet kart + gölge); pencere kapanınca kaldırılır
  let drag: SlotDrag<{ id: string; from: number }>;
  const cellAt = (x: number, y: number): number => {
    for (let row = 0; row < 4; row++)
      for (let lane = 0; lane < 3; lane++) {
        const cx = gx + (3 - row) * (cell + gap);
        const cy = gy + lane * (cell + gap);
        if (x >= cx && x <= cx + cell && y >= cy && y <= cy + cell) return row * 3 + lane;
      }
    return -1;
  };
  let hot = -1;
  const draw = () => {
    layerC.removeAll(true);
    const s = on.get();
    // Dizilim ipuçları (formation-hints.ts; yalnızca öneri, yerleşimi engellemez)
    const hints = content.placementHintsForCells(s.active.map((id) => rosterHero(s, id)?.class ?? ''));
    // FRONT / BACK etiketleri + düşman yönü
    layerC.add(elText(scene, gx + gw + 26, gy + (3 * cell + 2 * gap) / 2, 'Front ▸', 16, EL.ON, { em: 0.2 }).setOrigin(0, 0.5));
    layerC.add(elText(scene, gx - 22, gy + (3 * cell + 2 * gap) / 2, 'Back', 14, EL.MUTED, { em: 0.2 }).setOrigin(1, 0.5));
    for (let row = 0; row < 4; row++)
      for (let lane = 0; lane < 3; lane++) {
        const slot = row * 3 + lane;
        const x = gx + (3 - row) * (cell + gap);
        const y = gy + lane * (cell + gap);
        const id = s.active[slot] ?? '';
        const h = rosterHero(s, id);
        const g = scene.add.graphics();
        const isSel = !!selected && id === selected;
        g.fillStyle(EL.INK, h ? 0.75 : 0.38).fillRect(x, y, cell, cell);
        if (slot === hot) {
          g.lineStyle(2, EL.EMBER, 1).strokeRect(x + 1, y + 1, cell - 2, cell - 2);
          g.fillStyle(EL.EMBER, 0.12).fillRect(x, y, cell, cell);
        } else if (isSel) g.lineStyle(2, EL.ON_N, 1).strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        else g.lineStyle(1, EL.GOLD, h ? 0.62 : row === 0 ? 0.42 : EL.LINE.a2).strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        if (!h) g.lineStyle(1, EL.GOLD, 0.22).strokePoints(diamondPts(x + cell / 2, y + cell / 2, 6.4), true);
        layerC.add(g);
        if (h) {
          const def = content.classes[h.class]!;
          const img = classAvatar(scene, def, x + cell / 2, y + cell / 2 - 6, cell - 18);
          if (drag?.payload?.id === id) img.setAlpha(0.3);
          layerC.add(img);
          const nm = scene.add.graphics();
          nm.fillGradientStyle(0x080604, 0x080604, 0x080604, 0x080604, 0, 0, 0.92, 0.92).fillRect(x + 1, y + cell - 42, cell - 2, 41);
          layerC.add(nm);
          layerC.add(fitW(elText(scene, x + cell / 2, y + cell - 22, def.name, 13, EL.ON, { em: 0.06 }).setOrigin(0.5), cell - 10));
          layerC.add(hpBar(scene, x + 14, y + cell - 9, cell - 28, 4, h.hpRatio));
          if (h.leader) layerC.add(crown(scene, x + cell - 18, y + 16, 0.62));
          const hint = hints[slot];
          if (hint) layerC.add(hintBadge(scene, x + 18, y + 18, hint));
        }
        const z = scene.add.zone(x + cell / 2, y + cell / 2, cell, cell).setInteractive({ useHandCursor: !!h || !!selected });
        z.on('pointerdown', (p: Phaser.Input.Pointer) => {
          if (h) drag.begin({ id, from: slot }, p);
        });
        z.on('pointerup', () => {
          if (drag.moved) return;
          drag.cancel();
          if (!selected) selected = id;
          else if (selected === id) selected = '';
          else {
            on.move(selected, slot);
            moved = selected;
            selected = '';
          }
          draw();
        });
        layerC.add(z);
      }
    // Bilgi (sağ): seçilen ya da lider kahraman
    const team = s.roster.filter((x) => s.active.includes(x.id));
    const focus = rosterHero(s, selected) ?? rosterHero(s, moved) ?? team.find((x) => x.leader) ?? team[0];
    const ix = gx + gw + 190;
    const iy = gy;
    const iw = W / 2 + 640 - 30 - ix;
    if (focus) {
      const def = content.classes[focus.class]!;
      const slot = s.active.indexOf(focus.id);
      const row = Math.floor(slot / 3);
      layerC.add(elText(scene, ix, iy, selected ? 'Selected' : 'Your company', 14, EL.MUTED, { em: 0.24 }).setOrigin(0, 0));
      const ln = scene.add.graphics();
      ln.lineStyle(1, EL.GOLD, EL.LINE.a1).lineBetween(ix, iy + 28, ix + iw, iy + 28);
      layerC.add(ln);
      layerC.add(classAvatar(scene, def, ix + 48, iy + 92, 92));
      layerC.add(fitW(elText(scene, ix + 112, iy + 70, def.name, 26, EL.ON, { em: 0.05 }).setOrigin(0, 0.5), iw - 120));
      layerC.add(elBody(scene, ix + 112, iy + 104, `${def.role ?? ''} · ${['Front row', '2nd row', '3rd row', 'Back row'][row] ?? ''}`, 18, EL.MUTED).setOrigin(0, 0.5));
      const hint = hints[slot];
      const note = hint ? placementHintText(def.name, hint) : 'Good spot: it reaches the enemy from here.';
      layerC.add(elBody(scene, ix, iy + 160, note, 20, hint ? hintColor(hint) : EL.NOTE, true, iw).setOrigin(0, 0));
      if (on.heroPanel) {
        const b = elButton(scene, 'Hero details', () => on.heroPanel?.(focus.id), { kind: 'secondary', w: 260, h: 54, size: 17 });
        b.root.setPosition(ix + 130, iy + 290);
        layerC.add(b.root);
      }
    }
  };
  drag = new SlotDrag<{ id: string; from: number }>(scene, {
    threshold: 10,
    toPoint: (p) => on.toUi(p),
    parent: () => m.root,
    ghost: (d) => {
      const h = rosterHero(on.get(), d.id);
      const def = h ? content.classes[h.class] : undefined;
      return def ? makeDragGhost(scene, def, { size: 112, depth: 0 }) : undefined;
    },
    onStart: () => draw(),
    onMove: (_d, q) => {
      const c = cellAt(q.x, q.y);
      if (c !== hot) {
        hot = c;
        draw();
      }
    },
    onEnd: (_d, moved) => {
      hot = -1;
      if (moved) draw(); // soluk kaynak ve hedef vurgusu geri gelsin
    },
    onDrop: (d, q) => {
      const c = cellAt(q.x, q.y);
      if (c >= 0 && c !== d.from) {
        on.move(d.id, c);
        moved = d.id;
      }
      selected = '';
      draw();
    },
  });
  const close0 = m.close;
  m.close = () => {
    drag.destroy();
    close0();
  };
  draw();
  return m;
}
