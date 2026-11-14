/**
 * Phaser sahnelerinde GLOBAL dizilim tahtası (Ömer 2026-11-10: tahta her yerde sefer tahtasıyla aynı): Quick Battle, Multiplayer ve Endless takım seçimi
 * ızgarayı Phaser'da çizmez; sefer Formation penceresinin gerçek DOM ızgarasını (src/ui/formation-board.ts, `gridOnly`) sahnenin üstüne koyar.
 * Burada: tahtayı sahne koordinatındaki bir yere yerleştirme, ekran <-> sahne dönüşümü ve sınıf (kadro) sürüklemesini tahtaya bağlama.
 * Kadro rafı Phaser'da kalır; sürüklerken fare DOM tahtasının üstüne girince Phaser olay almaz, bu yüzden pencere işaretçisi dinlenir.
 */
import type Phaser from 'phaser';
import { content } from '../engine';
import { avatarUrl } from '../ui/character-panel';
import { clientToLocal } from '../ui/formation-board-rules';
import { mountFormationBoard, type BoardAttr, type FormationBoard, type FormationBoardHero, type FormationBoardOpts } from '../ui/formation-board';
import { boardHints, boardIcons, boardRangeUi } from '../ui/formation-board-data';
import { stageView } from './stage-view';

/** Tahta ızgarasının mantıksal boyu (formation-board.ts: 4*128+3*10, 3*128+2*10). */
export const SCENE_BOARD_W = 542;
export const SCENE_BOARD_H = 404;

/** Hücre kimliği: ilk örnek sınıf kimliğinin kendisi, tekrarlar `sınıf~2`... (aynı sınıftan birden çok birim olabilir). */
export const baseClass = (cellId: string): string => cellId.split('~')[0] ?? cellId;

/** Hücre listesini (sınıf kimlikleri, '' = boş) tahta kimliklerine çevirir (tekrarlar benzersiz). */
export function boardCells(team: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return team.map((c) => {
    if (!c) return '';
    const n = (seen.get(c) ?? 0) + 1;
    seen.set(c, n);
    return n === 1 ? c : `${c}~${n}`;
  });
}

/** Sınıf tanımından tahtanın düz kahraman verisi (QB / MP / Endless'te ilerleme yok; panel gizli, ipucu yalnızca ad + portre + menzil okur). */
export function classBoardHero(cellId: string): FormationBoardHero | null {
  const id = baseClass(cellId);
  const def = content.classes[id];
  if (!def) return null;
  const plan = content.planUnitOf(id);
  const s = def.stats as unknown as Record<string, number>;
  return {
    id: cellId,
    name: def.name,
    role: def.role ?? '',
    range: Number.isFinite(plan.range) ? plan.range : null,
    primary: (def.primary as BoardAttr | undefined) ?? 'str',
    level: 1,
    hp: s['hp'] ?? 0,
    hpRatio: 1,
    mp: s['mp'] ?? 0,
    attr: { str: s['str'] ?? 0, dex: s['dex'] ?? 0, int: s['int'] ?? 0, luck: s['luck'] ?? 0 },
    avatar: avatarUrl(id) ?? '',
    classId: id,
    skills: [],
  };
}

type RootEl = HTMLElement;
const uiRoot = (): RootEl => (document.getElementById('ui-root') ?? document.body) as RootEl;
const cssNum = (name: string): number => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
const rotated = (): boolean => document.documentElement.classList.contains('rotated');

/** Ekran noktası -> sahne dünya koordinatı (döndürülmüş dikey dokunmatik dahil). */
export function clientToWorld(cx: number, cy: number): { x: number; y: number } {
  const host = uiRoot();
  const p = clientToLocal(cx, cy, host.getBoundingClientRect(), host.offsetWidth, rotated());
  const gu = stageView.cssScale || 1;
  return { x: stageView.left + (p.x - cssNum('--game-l')) / gu, y: (p.y - cssNum('--game-t')) / gu };
}

/** Sahne dünya noktası -> #ui-root içi CSS px (sol üst) ve 1 birimin CSS pikseli. */
export function worldToCss(wx: number, wy: number): { left: number; top: number; gu: number } {
  const gu = stageView.cssScale || 1;
  return { left: cssNum('--game-l') + (wx - stageView.left) * gu, top: cssNum('--game-t') + wy * gu, gu };
}

export interface SceneBoard {
  board: FormationBoard;
  /** Konumu / ölçeği yeniden hesapla (sahne yeniden yerleşince, ekran boyutu değişince). */
  place: () => void;
  setVisible: (on: boolean) => void;
  destroy: () => void;
}

export type SceneBoardOpts = Omit<FormationBoardOpts, 'gridOnly' | 'icons' | 'rangeUi' | 'hintsFor'> & {
  /** Hücre kimliği -> sınıf (varsayılan: `sınıf~n` biçimi). */
  classOf?: (id: string) => string;
};

/** Tahtayı sahnede `at()` (ızgaranın sol üst köşesi, dünya px) noktasına koyar. */
export function mountSceneBoard(scene: Phaser.Scene, o: SceneBoardOpts, at: () => { x: number; y: number }): SceneBoard {
  const host = document.createElement('div');
  host.className = 'scene-board';
  host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:6;transform-origin:0 0;';
  uiRoot().append(host);
  const classOf = o.classOf ?? baseClass;
  const { classOf: _c, ...rest } = o;
  void _c;
  const board = mountFormationBoard(host, { ...rest, gridOnly: true, icons: boardIcons(), rangeUi: boardRangeUi(), hintsFor: boardHints(classOf) });
  board.el.style.transformOrigin = '0 0';
  const place = (): void => {
    const p = at();
    const c = worldToCss(p.x, p.y);
    board.el.style.position = 'absolute';
    board.el.style.left = `${c.left}px`;
    board.el.style.top = `${c.top}px`;
    board.el.style.transform = `scale(${c.gu})`;
  };
  place();
  const off = (): void => {
    board.destroy();
    host.remove();
  };
  scene.events.once('shutdown', off);
  return {
    board,
    place,
    setVisible: (on) => {
      host.style.display = on ? '' : 'none';
    },
    destroy: off,
  };
}

/**
 * Kadro rafından (Phaser) bir sınıf sürüklenirken tahtaları besler: pencere işaretçisini dinler (fare DOM tahtasının üstüne girince Phaser olay almaz).
 * `move` her işaretçi hareketinde (ekran noktası), `up` bırakınca çağrılır. Dönen işlev dinleyicileri kaldırır.
 */
export function trackPointer(move: (cx: number, cy: number, e: PointerEvent) => void, up: (cx: number, cy: number, e: PointerEvent) => void): () => void {
  const onMove = (e: PointerEvent): void => move(e.clientX, e.clientY, e);
  const onUp = (e: PointerEvent): void => {
    stop();
    up(e.clientX, e.clientY, e);
  };
  const stop = (): void => {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
  };
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  return stop;
}
