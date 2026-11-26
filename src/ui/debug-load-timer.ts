/**
 * Debug > Setup > Owner tests > Endless load timer: Endless sahnesine geçişin süresini ölçüp köşede "Loaded in X.X s" gösterir.
 * Sayım: Endless sahnesi açılırken başlar (arkasından tıklama / tuş son 2,5 sn içindeyse O ANDAN: kararma ve yükleme dahil, oyuncunun beklediği süre),
 * Endless sahnesi gerçekten çalışır hale gelince biter. Oyun koduna dokunmaz: 40 ms'de bir sahne durumunu okur. Kapatınca her şey (dinleyici, sayaç, kutu) kalkar.
 */
import type Phaser from 'phaser';
import './debug-owner-tests.css';

const KEY = 'EndlessScene';
const INPUT_WINDOW_MS = 2500;
const SHOW_MS = 10_000;

let stop: (() => void) | null = null;

export function setLoadTimer(game: Phaser.Game, on: boolean): void {
  stop?.();
  stop = null;
  if (!on) return;
  let lastInput = -Infinity;
  const onInput = (): void => void (lastInput = performance.now());
  window.addEventListener('pointerdown', onInput, true);
  window.addEventListener('keydown', onInput, true);
  let box: HTMLDivElement | null = null;
  let hide: ReturnType<typeof setTimeout> | undefined;
  let t0: number | null = null;
  let wasActive = false;
  let poll: ReturnType<typeof setInterval> | undefined;
  const show = (text: string): void => {
    if (!box) {
      box = document.createElement('div');
      box.className = 'ot-timer';
      (document.getElementById('ui-root') ?? document.body).append(box);
    }
    box.textContent = text;
    clearTimeout(hide);
    hide = setTimeout(() => {
      box?.remove();
      box = null;
    }, SHOW_MS);
  };
  const tick = (): void => {
    const scene = game.scene.getScene(KEY);
    // Phaser durumları: 2 START, 3 LOADING (dosya indirme), 4 CREATING, 5 RUNNING; başlama = 2-5'e girmek, hazır = gerçek sahne RUNNING
    const st = scene?.sys.settings.status ?? 0;
    const active = st >= 2 && st <= 5;
    const ready = st === 5 && !('isLoading' in scene!);
    const now = performance.now();
    if (active && !wasActive && t0 === null) {
      t0 = now - lastInput < INPUT_WINDOW_MS ? lastInput : now;
      show('Loading Endless...');
    }
    if (t0 !== null && ready) {
      show(`Loaded in ${((now - t0) / 1000).toFixed(1)} s`);
      t0 = null;
    }
    wasActive = active;
  };
  poll = setInterval(tick, 40); // rAF değil: sekme gizliyken de çalışsın
  stop = (): void => {
    clearInterval(poll);
    clearTimeout(hide);
    window.removeEventListener('pointerdown', onInput, true);
    window.removeEventListener('keydown', onInput, true);
    box?.remove();
  };
}
