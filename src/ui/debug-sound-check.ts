/**
 * Debug > Setup > Owner tests > Sound check: küçük panel, listeden tek tuşla ses çalar (liste `src/game/owner-tests.ts > SOUND_GROUPS`, adlar ses motorundaki adlardır).
 * Ses seviyesi 0 ise (Settings > Master Volume) üstte uyarı. Tembel yüklenir; kapalıyken DOM'da iz yok. Oyun girişini kilitlemez.
 */
import type Phaser from 'phaser';
import { audioSettings, playSfxDef } from '../game/audio';
import { SOUND_GROUPS, resolveSound, volumeWarning } from '../game/owner-tests';
import './debug-owner-tests.css';

let panel: HTMLDivElement | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function closeSoundCheck(): void {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  panel?.remove();
  panel = null;
}

export function toggleSoundCheck(game: Phaser.Game): void {
  if (panel) return closeSoundCheck();
  const ctxOf = (): AudioContext | undefined => {
    const c = (game.sound as unknown as { context?: AudioContext }).context;
    return c;
  };
  const root = document.getElementById('ui-root') ?? document.body;
  panel = el('div', 'ot-panel');
  const head = el('div', 'ot-head');
  head.append(el('b', '', 'Sound check'));
  const close = el('button', 'ot-btn ot-close', 'Close');
  close.type = 'button';
  close.addEventListener('click', closeSoundCheck);
  head.append(close);
  const warn = el('div', 'ot-warn');
  const sync = (): void => {
    const w = volumeWarning(audioSettings);
    warn.textContent = w ?? '';
    warn.hidden = !w;
  };
  sync();
  timer = setInterval(sync, 1000);
  const body = el('div', 'ot-body');
  for (const g of SOUND_GROUPS) {
    const sec = el('div', 'ot-group');
    sec.append(el('div', 'ot-title', g.title), el('div', 'ot-sub', g.hint));
    const row = el('div', 'ot-row');
    for (const s of g.sounds) {
      const def = resolveSound(s);
      const b = el('button', 'ot-btn', s.label);
      b.type = 'button';
      b.title = def ? `${s.id} (${s.from})` : `${s.id}: not found in the sound engine`;
      b.disabled = !def;
      b.addEventListener('click', () => {
        sync();
        playSfxDef(ctxOf() ?? new AudioContext(), def);
      });
      row.append(b);
    }
    sec.append(row);
    body.append(sec);
  }
  panel.append(head, warn, body);
  root.append(panel);
}
