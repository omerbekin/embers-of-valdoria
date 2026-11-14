/**
 * Endless "Choose your company" (EndlessScene, pick görünümü): Ömer 2026-11-10 seçimi. Solda tahta + altında renk açıklaması (src/ui/spot-legend.ts, hep görünür),
 * SAĞDA portre karolu kadro paneli (DOM). Kahramanı tahtaya SÜRÜKLE (hücre uygunluk noktaları tahtada görünür) ya da TIKLA (önerilen hücreye ekler / takımdaysa
 * çıkarır); tahtadan panele sürüklemek çıkarır. Oyun kuralı sahnede: bu dosya yalnızca görünüm + işaretçi (sahne `actDrop` / `actTogglePick` çağrılır).
 */
import '../ui/endless-roster.css';
import layout from '../../data/battle-layout.json';
import { content } from '../engine';
import { avatarUrl } from '../ui/character-panel';
import { spotLegendHtml } from '../ui/spot-legend';
import { classBoardHero, trackPointer, worldToCss, type SceneBoard } from './scene-board';
import { groupColor, sortByPrimary } from './class-order';

interface SceneLike {
  scene: { isActive: () => boolean };
  view: string;
  draft: { classes: string[] };
  rosterRect: { x: number; y: number; width: number; height: number };
  pickBoard: SceneBoard | null;
  actDrop: (cls: string, from: number, target: number) => void;
  actTogglePick: (id: string) => void;
}

const COLORS = layout.colors.primaryGroup as Record<string, string>;
let active = false;

/** Sahne (dünya) noktasına yerleşen yüzen öge; her 250 ms yeniden konumlanır, `alive` false olunca kaldırılır. */
function worldBox(cls: string, html: string, at: () => { x: number; y: number; w: number }, alive: () => boolean, refresh?: (el: HTMLElement) => void): HTMLElement {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  (document.getElementById('ui-root') ?? document.body).append(el);
  const place = (): void => {
    const p = at();
    const c = worldToCss(p.x, p.y);
    el.style.left = `${c.left}px`;
    el.style.top = `${c.top}px`;
    el.style.width = `${p.w}px`;
    el.style.transform = `scale(${c.gu})`;
  };
  place();
  const t = window.setInterval(() => {
    if (!alive()) {
      window.clearInterval(t);
      el.remove();
      return;
    }
    place();
    refresh?.(el);
  }, 250);
  return el;
}

function rosterHtml(inTeam: readonly string[]): string {
  const defs = sortByPrimary(content.randomPool.map((id) => content.classes[id]!).filter(Boolean));
  const items = defs
    .map((def) => {
      const col = groupColor(COLORS, def.primary);
      const on = inTeam.includes(def.id) ? ' on' : '';
      const av = avatarUrl(def.id) ?? '';
      return `<div class="er-t${on}" data-cls="${def.id}" style="--c:${col}">${av ? `<img src="${av}" alt="" draggable="false">` : ''}<div class="n">${def.name}</div><div class="r">${def.role ?? ''}</div></div>`;
    })
    .join('');
  return `<div class="er-ros"><div class="h">Roster<span>Drag a hero onto the board, or click to add / remove</span></div><div class="er-grid">${items}</div></div>`;
}

/** `legendAt` = renk açıklamasının sol üst köşesi (dünya px, tahtanın hemen altı). */
export function mountEndlessRoster(sc: SceneLike, legendAt: () => { x: number; y: number }): void {
  if (active) return;
  active = true;
  let ghost: HTMLImageElement | null = null;
  const alive = (): boolean => {
    const ok = sc.scene.isActive() && sc.view === 'pick';
    if (!ok) {
      ghost?.remove();
      active = false;
    }
    return ok;
  };
  worldBox('spot-lg-abs on', spotLegendHtml(), () => ({ ...legendAt(), w: 542 }), alive);
  let last = '';
  const rect = (): { x: number; y: number; w: number } => ({ x: sc.rosterRect.x, y: sc.rosterRect.y, w: sc.rosterRect.width });
  const key = (): string => `${sc.draft.classes.join(',')}|${sc.rosterRect.x}`;
  const el = worldBox('er-abs', rosterHtml(sc.draft.classes), rect, alive, (e) => {
    if (key() === last) return;
    last = key();
    e.innerHTML = rosterHtml(sc.draft.classes);
  });
  last = key();
  el.style.height = `${sc.rosterRect.height}px`;

  el.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cls]');
    const cls = t?.dataset['cls'];
    if (!t || !cls) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    const hero = classBoardHero(cls);
    trackPointer(
      (cx, cy) => {
        if (!moved && Math.hypot(cx - sx, cy - sy) > 8) {
          moved = true;
          ghost = document.createElement('img');
          ghost.className = 'er-ghost';
          ghost.src = avatarUrl(cls) ?? '';
          document.body.append(ghost);
        }
        if (!moved) return;
        if (ghost) {
          ghost.style.left = `${cx}px`;
          ghost.style.top = `${cy}px`;
        }
        // hücre uygunluk noktaları (tahtadaki ortak sürükleme önizlemesi)
        sc.pickBoard?.board.extPreview(hero ? { ...hero, id: `${cls}~x` } : null, cx, cy);
      },
      (cx, cy) => {
        ghost?.remove();
        ghost = null;
        sc.pickBoard?.board.extPreview(null, 0, 0);
        if (!moved) return sc.actTogglePick(cls);
        const cell = sc.pickBoard?.board.cellAt(cx, cy) ?? -1;
        if (cell >= 0) sc.actDrop(cls, -1, cell);
      },
    );
  });
}
