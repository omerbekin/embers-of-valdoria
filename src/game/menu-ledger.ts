import Phaser from 'phaser';
import { uiSound } from '../ui/ui-sound';
import { motion } from '../ui/motion';
import { EL, diamondPts, elBody, elDiamond, elGlow, elText, fitW } from './elegant-ui';
import { touchUnits } from './touch-hit';

/**
 * Ana menü kart "defteri" (Ömer 2026-11-07, taslak menu-card-buttons-2 A "Ledger"): kartın altında satırlar; ilk satır öne çıkan eylem
 * (kayıt bilgisiyle), diğerleri kendi bilgisiyle. Satırlar kapalıyken gizli; fare kartın üstüne gelince / klavye odağında / dokunmada açılır.
 * Satırın tamamı dokunma alanı. Boyama oyunun mevcut dilinde (elButton plakası: koyu degrade, ince altın çizgi, kor elması); italik yok.
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
}

const phone = (): boolean => document.documentElement.classList.contains('short');

export function ledgerHeight(rows: Array<{ primary: boolean }>): number {
  return rows.reduce((a, r) => a + rowHeight(r.primary), 0);
}

function rowHeight(primary: boolean): number {
  const base = primary ? 76 : 58;
  return phone() ? Math.max(base, touchUnits(base)) : base;
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
  rows.forEach((r, i) => {
    const h = heights[i]!;
    const yc = yTop + h / 2;
    yTop += h;
    const c = scene.add.container(0, yc);
    const plate = scene.add.graphics();
    const nameSize = small ? (r.primary ? 40 : 36) : r.primary ? 25 : 21;
    const metaSize = small ? 30 : 20;
    const nameColor = !r.enabled ? EL.DIM : r.primary ? EL.ON : EL.TXT;
    const name = elText(scene, -width / 2 + 18, 0, r.name, nameSize, nameColor, { em: 0.08, pad: true }).setOrigin(0, 0.5);
    const meta = elBody(scene, small ? -width / 2 + 18 : width / 2 - 18, 0, small ? r.meta.replace('\n', ' · ') : r.meta, metaSize, r.enabled ? (r.primary ? '#f3dfae' : EL.NOTE) : EL.DIM).setOrigin(small ? 0 : 1, 0.5).setAlign(small ? 'left' : 'right');
    const dia = r.primary && r.enabled ? elDiamond(scene, 6) : null;
    const nameW = () => (name.width - EL.PAD * 2) * name.scaleX;
    const avail = width - 36 - (dia ? 22 : 0);
    const textX = -width / 2 + 18 + (dia ? 22 : 0);
    dia?.setPosition(-width / 2 + 24, small ? -h / 2 + h * 0.3 : 0);
    name.setX(textX - EL.PAD);
    if (small) {
      fitW(name, avail + EL.PAD * 2);
      name.setY(-h * 0.2);
      meta.setX(textX);
      meta.setY(h * 0.22);
      fitW(meta, avail);
    } else {
      fitW(name, avail * 0.62 + EL.PAD * 2);
      fitW(meta, Math.max(80, avail - nameW() - 14));
    }
    const draw = (hover: boolean) => {
      plate.clear();
      const on = hover && r.enabled;
      plate.fillGradientStyle(r.primary ? 0x2a1d10 : 0x1e160e, r.primary ? 0x2a1d10 : 0x1e160e, 0x0c0906, 0x0c0906, 0.94).fillRect(-width / 2, -h / 2, width, h);
      if (r.primary && r.enabled) plate.fillGradientStyle(EL.EMBER, EL.EMBER, EL.EMBER, EL.EMBER, on ? 0.2 : 0.1, 0, on ? 0.2 : 0.1, 0).fillRect(-width / 2, -h / 2, width, h);
      else if (on) plate.fillStyle(EL.EMBER, 0.14).fillRect(-width / 2, -h / 2, width, h);
      plate.lineStyle(1, on ? EL.ON_N : EL.GOLD, on ? 0.9 : EL.LINE.a2).strokeRect(-width / 2 + 0.5, -h / 2 + 0.5, width - 1, h - 1);
      if (i === 0) plate.lineStyle(2, r.enabled || !r.primary ? EL.GOLD : EL.GOLD, 0.9).lineBetween(-width / 2, -h / 2 + 1, width / 2, -h / 2 + 1);
      name.setColor(on ? EL.ON : nameColor);
      elGlow(name, on);
    };
    draw(false);
    const zone = scene.add.zone(0, 0, width, h).setInteractive({ useHandCursor: r.enabled });
    c.add(dia ? [plate, dia, name, meta, zone] : [plate, name, meta, zone]);
    zone.on('pointerover', () => {
      if (progress < 0.6) return;
      draw(true);
      if (r.enabled) uiSound('hover');
      hoverCbs.forEach((f) => f(true));
    });
    zone.on('pointerout', () => {
      draw(false);
      hoverCbs.forEach((f) => f(false));
    });
    zone.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation(); // kartın kendi tıklaması tetiklenmesin
      if (progress < 0.6 || !ready()) return;
      if (!r.enabled) {
        scene.tweens.add({ targets: c, x: { from: -10, to: 0 }, duration: 260, ease: 'Bounce.easeOut' });
        return;
      }
      uiSound(r.primary ? 'confirm' : 'select');
      r.run();
    });
    root.add(c);
    items.push({ c, zone, y: yc });
  });
  const apply = () => {
    items.forEach((it, i) => {
      // Satırlar alttan yukarı sırayla açılır (en alttaki ilk)
      const k = items.length - 1 - i;
      const a = Phaser.Math.Clamp((progress - k * 0.14) / 0.6, 0, 1);
      it.c.setAlpha(a).setY(it.y + (1 - a) * 22).setVisible(a > 0.001);
      if (it.zone.input) it.zone.input.enabled = progress >= 0.6;
    });
    onProgress?.(progress);
  };
  apply();
  const api: Ledger = {
    root,
    height: total,
    isOpen: () => open,
    active: () => progress >= 0.6,
    onHover: (cb) => void hoverCbs.push(cb),
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
