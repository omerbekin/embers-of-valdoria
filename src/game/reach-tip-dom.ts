/**
 * Dizilim menzil kutusu, Phaser sahneleri için (Ömer 2026-11-03): Sefer Formation penceresinin hover kutusuyla BİREBİR aynı DOM bileşeni
 * ("CURRENT POSITION / ADI · 3RD ROW", "From here: ...", "Enemy rows hit" 1-4 çubuğu). İçerik ve stil Formation ile ortak:
 * `formation-board-rules.ts > reachBandSpec` + `band-tip.ts > bandTipHtml` + `formation-board.css > .fb-tip`. Quick Battle / Multiplayer
 * (TeamSelectScene) ve Endless takım seçimi kullanır; kendi Phaser ipucu çizmez.
 * Fare: üstüne gelince açılır, çıkınca kapanır. Dokunma: kahramana dokunuş açar ve sabitler; BAŞKA yere dokununca (belgede ilk dokunma) kapanır; fare tıklaması kapatmaz.
 */
import '../ui/formation-board.css';
import type Phaser from 'phaser';
import type { PlacementHint } from '../engine';
import { bandTipHtml } from '../ui/band-tip';
import { avatarUrl } from '../ui/character-panel';
import { fitOfHint, reachBandSpec, reachRows } from '../ui/formation-board-rules';
import { boardRangeUi } from '../ui/formation-board-data';
import { classRange } from './formation-reach-tip';

export type WorldRect = { x: number; y: number; w: number; h: number };

let tipEl: HTMLElement | null = null;
let armed = false;

/** Açık menzil kutusunu kapatır (yoksa bir şey yapmaz). */
export function hideReachTip(): void {
  tipEl?.remove();
  tipEl = null;
}

/** Menzil sistemi açık mı (kapalıyken sahneler eski ipucuna döner). */
export const reachTipOn = (): boolean => boardRangeUi();

/** Dünya dikdörtgeninin ekrandaki (CSS piksel) karşılığı; işaretçi hem ekran hem dünya koordinatını verdiği için kamera dönüşümü yeniden yazılmaz. */
function clientRectOf(scene: Phaser.Scene, ptr: Phaser.Input.Pointer, r: WorldRect): { left: number; top: number; right: number; bottom: number } {
  const cam = scene.cameras.main;
  const cv = scene.game.canvas.getBoundingClientRect();
  const k = cv.width / scene.scale.gameSize.width;
  const pw = cam.getWorldPoint(ptr.x, ptr.y);
  const toX = (wx: number): number => cv.left + (ptr.x + (wx - pw.x) * cam.zoom) * k;
  const toY = (wy: number): number => cv.top + (ptr.y + (wy - pw.y) * cam.zoom) * k;
  return { left: toX(r.x), top: toY(r.y), right: toX(r.x + r.w), bottom: toY(r.y + r.h) };
}

/**
 * Hücredeki birim için menzil kutusunu açar (`cell` 0-11, sıra = cell / 3). Menzil sistemi kapalıysa false döner (çağıran eski ipucunu gösterir).
 * `rect` = hücrenin dünya dikdörtgeni; kutu hücrenin sağına (sığmazsa soluna) konur ve hücreyi örtmez.
 */
export function showReachTip(scene: Phaser.Scene, ptr: Phaser.Input.Pointer, o: { name: string; classId: string; cell: number; hint: PlacementHint | undefined; rect: WorldRect }): boolean {
  if (!boardRangeUi() || o.cell < 0) return false;
  hideReachTip();
  if (!armed) {
    armed = true;
    // dokunmada: başka yere dokunuş kapatır (Phaser aynı dokunuşta kendi pointerover'ını sonra çalıştırır, kutu yeniden açılır)
    document.addEventListener('pointerdown', (e) => e.pointerType !== 'mouse' && hideReachTip(), true);
  }
  scene.events.once('shutdown', hideReachTip);
  const n = reachRows(classRange(o.classId), Math.floor(o.cell / 3));
  const avatar = avatarUrl(o.classId);
  const el = document.createElement('div');
  el.className = 'fb-tip';
  el.innerHTML = bandTipHtml(reachBandSpec({ name: o.name, ...(avatar ? { avatar } : {}), cell: o.cell, here: true, n, fit: fitOfHint(o.hint) }));
  const cs = getComputedStyle(document.documentElement);
  const short = document.documentElement.classList.contains('short');
  // Formation penceresinin ölçeği: telefonda kısa ekrana sığdırılan ~0.58, masaüstünde oyun birimi (--gu)
  const k = short ? 0.58 : parseFloat(cs.getPropertyValue('--gu')) || 1;
  el.style.position = 'fixed';
  el.style.zIndex = '500';
  el.style.transformOrigin = '0 0';
  el.style.transform = `scale(${k})`;
  el.style.visibility = 'hidden';
  document.body.append(el);
  const c = clientRectOf(scene, ptr, o.rect);
  const tw = el.offsetWidth * k;
  const th = el.offsetHeight * k;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 8;
  let x = c.right + gap;
  if (x + tw > vw - 4) x = c.left - gap - tw;
  x = Math.max(4, Math.min(vw - tw - 4, x));
  const y = Math.max(4, Math.min(vh - th - 4, (c.top + c.bottom) / 2 - th / 2));
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  el.style.visibility = '';
  tipEl = el;
  return true;
}

