/**
 * Grafik bağlamı kaybı (WebGL context lost; Ömer 2026-10-16, 0.8.2 telefon çökmesi): telefon grafik belleği dolunca tarayıcı tuvalin
 * WebGL bağlamını alabilir. Phaser 3.90 bağlam geri gelince dokuları kendisi yeniden kurar; eskiden bu sırada ekran sessizce donuyordu.
 * Artık kısa bir not çıkar ("Restoring graphics..."), bağlam dönünce kendiliğinden kapanır; birkaç saniyede dönmezse Reload düğmesi
 * (sefer savaşı kayıtlı: Continue kaldığı yerden sürdürür). Tasarım kiti: `.el-dialog` + `.el-panel` + `.el-title` + `.el-status`
 * + `.el-btn primary` (src/ui/elegant.css). Debug > Speed & View > Display > Simulate graphics reset.
 */
import type Phaser from 'phaser';

/** Bağlam dönmezse Reload düğmesi bu kadar ms sonra görünür. */
const RELOAD_AFTER_MS = 6000;

type Emitter = { on: (ev: string, fn: () => void) => void; gl?: WebGLRenderingContext };

let note: HTMLElement | null = null;
let timer: number | undefined;

function host(): HTMLElement {
  return document.getElementById('ui-root') ?? document.body;
}

function show(): void {
  if (note) return;
  const overlay = document.createElement('div');
  overlay.className = 'el-dialog el-modal ctx-loss';
  overlay.style.zIndex = '60';
  const panel = document.createElement('div');
  panel.className = 'el-panel corners el-modal-panel';
  const title = document.createElement('div');
  title.className = 'el-title';
  title.textContent = 'Restoring graphics';
  const body = document.createElement('div');
  body.className = 'el-status';
  body.style.marginTop = '10px';
  body.textContent = 'Your device ran low on graphics memory. One moment...';
  const row = document.createElement('div');
  row.className = 'el-row';
  row.style.display = 'none';
  const reload = document.createElement('button');
  reload.className = 'el-btn primary';
  reload.textContent = 'Reload';
  reload.addEventListener('click', () => window.location.reload());
  row.append(reload);
  panel.append(title, body, row);
  overlay.append(panel);
  host().append(overlay);
  note = overlay;
  timer = window.setTimeout(() => {
    body.textContent = 'Graphics did not come back. Reload the game: your campaign continues from its last save.';
    row.style.display = '';
  }, RELOAD_AFTER_MS);
}

function hide(): void {
  window.clearTimeout(timer);
  note?.remove();
  note = null;
}

/** main.ts: oyun kurulduktan sonra bir kez. WebGL değilse (Canvas yedeği) bir şey yapmaz. */
export function installContextLossNotice(game: Phaser.Game): void {
  const r = game.renderer as unknown as Emitter;
  if (!r?.gl) return;
  r.on('losewebgl', show); // Phaser.Renderer.Events.LOSE_WEBGL
  r.on('restorewebgl', hide); // Phaser.Renderer.Events.RESTORE_WEBGL
}

/** Debug: bağlamı bilerek düşürür, `ms` sonra geri getirir (WEBGL_lose_context). Desteklenmiyorsa false. */
export function simulateContextLoss(game: Phaser.Game, ms = 2500): boolean {
  const gl = (game.renderer as unknown as Emitter).gl;
  const ext = gl?.getExtension('WEBGL_lose_context');
  if (!ext) return false;
  ext.loseContext();
  window.setTimeout(() => ext.restoreContext(), ms);
  return true;
}
