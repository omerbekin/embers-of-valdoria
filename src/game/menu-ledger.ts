import Phaser from 'phaser';
import { uiSound } from '../ui/ui-sound';
import { motion } from '../ui/motion';
import { EL, diamondPts, elBody, elDiamond, elGlow, elText, fitW } from './elegant-ui';
import { touchUnits } from './touch-hit';

/**
 * Ana menü kart "defteri" (Ömer 2026-11-07, taslak menu-card-buttons-2 A "Ledger"; görünüm Ömer 2026-11-09 mockup B "kutusuz satırlar"):
 * kartın altında satırlar; ilk satır öne çıkan eylem (kor elması), diğerleri kendi bilgisiyle. Satır plakası/kutusu YOK: satırların
 * arkasında hafif kararma, aralarında uçları sönen ince altın çizgi; hover (ve klavye seçimi) = soldan kor ışık süpürmesi + elmas + yazı
 * parlar. Üç kart (Campaign, Quick Battle, Multiplayer) aynı parçayı kullanır. Satırlar kapalıyken gizli; fare kartın üstüne gelince /
 * klavye odağında / dokunmada açılır. Satırın tamamı dokunma alanı; italik yok.
 */
export interface LedgerRow {
  id: string;
  name: string;
  /** Sağdaki bilgi (satır sonu = ikinci satır); yalnız gerçek veri. */
  meta: string;
  /** Öne çıkan satır: daha yüksek, kor elması, açık yazı. */
  primary: boolean;
  enabled: boolean;
  run: () => void;
}

export interface Ledger {
  root: Phaser.GameObjects.Container;
  /** Açıkken defterin toplam yüksekliği (dünya birimi). */
  height: number;
  isOpen(): boolean;
  setOpen(open: boolean, animate?: boolean): void;
  /** Satır üstüne gelme / çıkma (kart üstünde fare takibi için). */
  onHover(cb: (over: boolean) => void): void;
  /** Satırlar şu an dokunulabilir mi (açılış büyük ölçüde bitti). */
  active(): boolean;
  /** Klavye seçimi: satır hover gibi görünür (-1 = yok). */
  select(i: number): void;
  selected(): number;
  /** Seçili satırı çalıştırır (pasifse sallanır); seçim yoksa false. */
  runSelected(): boolean;
  readonly count: number;
}

const phone = (): boolean => document.documentElement.classList.contains('short');

export function ledgerHeight(rows: Array<{ primary: boolean }>): number {
  return rows.reduce((a, r) => a + rowHeight(r.primary), 0);
}

function rowHeight(primary: boolean): number {
  if (!phone()) return 60; // B: tüm satırlar eşit
  const base = primary ? 76 : 58;
  return Math.max(base, touchUnits(base));
}

/** Kök (0,0) = defterin alt orta noktası; satırlar yukarı doğru dizilir. */
export function buildLedger(scene: Phaser.Scene, width: number, rows: LedgerRow[], ready: () => boolean, onProgress?: (p: number) => void): Ledger {
  const root = scene.add.container(0, 0);
  const small = phone();
  const heights = rows.map((r) => rowHeight(r.primary));
  const total = heights.reduce((a, b) => a + b, 0);
  const hoverCbs: Array<(over: boolean) => void> = [];
  let progress = 0;
  let open = false;
  let tw: Phaser.Tweens.Tween | null = null;
  const items: Array<{ c: Phaser.GameObjects.Container; zone: Phaser.GameObjects.Zone; y: number }> = [];
  let yTop = -total;
  // Satırların arkasında hafif kararma (okunurluk; kutu çizgisi yok): üstte 30 birimlik yumuşak giriş
  const wash = scene.add.graphics();
  wash.fillGradientStyle(0x0a0704, 0x0a0704, 0x0a0704, 0x0a0704, 0, 0, 0.55, 0.55).fillRect(-width / 2 - 24, -total - 30, width + 48, 30);
  wash.fillGradientStyle(0x0a0704, 0x0a0704, 0x0a0704, 0x0a0704, 0.55, 0.55, 0.75, 0.75).fillRect(-width / 2 - 24, -total, width + 48, total);
  root.add(wash);
  let sel = -1;
  const draws: Array<(on: boolean) => void> = [];
  const hovered = new Set<number>();
  const redraw = (i: number) => draws[i]?.(hovered.has(i) || sel === i);
  rows.forEach((r, i) => {
    const h = heights[i]!;
    const yc = yTop + h / 2;
    yTop += h;
    const c = scene.add.container(0, yc);
    const plate = scene.add.graphics();
    const nameSize = small ? (r.primary ? 40 : 36) : 23;
    const metaSize = small ? 30 : 20;
    const nameColor = !r.enabled ? EL.DIM : r.primary ? EL.ON : EL.TXT;
    const metaColor = !r.enabled ? EL.DIM : EL.MUTED;
    const textX = -width / 2 + 34;
    const name = elText(scene, textX, 0, r.name, nameSize, nameColor, { em: 0.1, pad: true }).setOrigin(0, 0.5);
    const meta = elBody(scene, small ? textX : width / 2 - 6, 0, r.meta.replace(/\n/g, ' · '), metaSize, metaColor).setOrigin(small ? 0 : 1, 0.5).setAlign(small ? 'left' : 'right');
    const dia = elDiamond(scene, small ? 7 : 5);
    const nameW = () => (name.width - EL.PAD * 2) * name.scaleX;
    const avail = width - 34 - 6;
    dia.setPosition(-width / 2 + 14, small ? -h * 0.2 : 0);
    name.setX(textX - EL.PAD);
    if (small) {
      fitW(name, avail + EL.PAD * 2);
      name.setY(-h * 0.2);
      meta.setY(h * 0.22);
      fitW(meta, avail);
    } else {
      fitW(name, avail * 0.62 + EL.PAD * 2);
      fitW(meta, Math.max(80, avail - nameW() - 14));
    }
    const draw = (hover: boolean) => {
      plate.clear();
      const on = hover && r.enabled;
      // soldan kor ışık süpürmesi (yalnız hover / klavye seçimi)
      if (on) plate.fillGradientStyle(EL.EMBER, EL.EMBER, EL.EMBER, EL.EMBER, 0.28, 0, 0.28, 0).fillRect(-width / 2, -h / 2 + 1, width, h - 2);
      // alt ayırıcı: uçları sönen ince altın çizgi
      const ly = h / 2;
      const f = width * 0.15;
      plate.fillGradientStyle(EL.GOLD, EL.GOLD, EL.GOLD, EL.GOLD, 0, 0.45, 0, 0.45).fillRect(-width / 2, ly, f, 1);
      plate.fillStyle(EL.GOLD, 0.45).fillRect(-width / 2 + f, ly, width - 2 * f, 1);
      plate.fillGradientStyle(EL.GOLD, EL.GOLD, EL.GOLD, EL.GOLD, 0.45, 0, 0.45, 0).fillRect(width / 2 - f, ly, f, 1);
      dia.setVisible(on || (r.primary && r.enabled)).setAlpha(on ? 1 : 0.75).setScale(on ? 1.2 : 1);
      name.setColor(on ? EL.ON : nameColor);
      meta.setColor(on ? '#f3dfae' : metaColor);
      elGlow(name, on);
    };
    draws.push(draw);
    draw(false);
    const zone = scene.add.zone(0, 0, width, h).setInteractive({ useHandCursor: r.enabled });
    c.add([plate, dia, name, meta, zone]);
    zone.on('pointerover', () => {
      if (progress < 0.6) return;
      hovered.add(i);
      redraw(i);
      if (r.enabled) uiSound('hover');
      hoverCbs.forEach((f) => f(true));
    });
    zone.on('pointerout', () => {
      hovered.delete(i);
      redraw(i);
      hoverCbs.forEach((f) => f(false));
    });
    zone.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation(); // kartın kendi tıklaması tetiklenmesin
      if (progress < 0.6 || !ready()) return;
      fire(i);
    });
    root.add(c);
    items.push({ c, zone, y: yc });
  });
  function fire(i: number): void {
    const r = rows[i]!;
    const it = items[i]!;
    if (!r.enabled) {
      scene.tweens.add({ targets: it.c, x: { from: -10, to: 0 }, duration: 260, ease: 'Bounce.easeOut' });
      return;
    }
    uiSound(r.primary ? 'confirm' : 'select');
    r.run();
  }
  const apply = () => {
    items.forEach((it, i) => {
      // Satırlar alttan yukarı sırayla açılır (en alttaki ilk)
      const k = items.length - 1 - i;
      const a = Phaser.Math.Clamp((progress - k * 0.14) / 0.6, 0, 1);
      it.c.setAlpha(a).setY(it.y + (1 - a) * 22).setVisible(a > 0.001);
      if (it.zone.input) it.zone.input.enabled = progress >= 0.6;
    });
    wash.setAlpha(Math.min(1, progress * 1.6)).setVisible(progress > 0.001);
    onProgress?.(progress);
  };
  apply();
  const api: Ledger = {
    root,
    height: total,
    isOpen: () => open,
    active: () => progress >= 0.6,
    onHover: (cb) => void hoverCbs.push(cb),
    count: rows.length,
    selected: () => sel,
    select: (i) => {
      const prev = sel;
      sel = i >= 0 && i < rows.length ? i : -1;
      if (prev !== sel) {
        redraw(prev);
        redraw(sel);
        if (sel >= 0 && rows[sel]!.enabled) uiSound('hover');
      }
    },
    runSelected: () => {
      if (sel < 0 || progress < 0.6) return false;
      fire(sel);
      return true;
    },
    setOpen: (want, animate = true) => {
      if (want === open && (!animate || tw === null)) return;
      open = want;
      tw?.stop();
      tw = null;
      const to = want ? 1 : 0;
      const m = motion('endlessTab');
      const dur = want ? m.inMs + 120 : m.outMs;
      if (!animate || dur <= 0) {
        progress = to;
        apply();
        return;
      }
      const from = progress;
      tw = scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: dur * Math.abs(to - from),
        ease: 'Cubic.easeOut',
        onUpdate: (t) => {
          if (!root.active) return void t.stop();
          progress = from + (to - from) * (t.getValue() ?? 1);
          apply();
        },
        onComplete: () => {
          tw = null;
          progress = to;
          if (root.active) apply();
        },
      });
    },
  };
  return api;
}

export { diamondPts };
