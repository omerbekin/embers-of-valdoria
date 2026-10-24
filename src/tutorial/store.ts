/**
 * Tutorial kaydı (localStorage `eov.tutorial.v1`, sürümlü şema): dersler açık mı (Settings > Gameplay > Tutorials) ve görülen dersler
 * (Codex > Lessons bunları listeler). Sefer kaydından bağımsız ve genel: bir ders bir kez görülür (her seferde değil). Depolama yoksa
 * (gizli pencere, Node testi) yalnızca bellekte tutulur, oyun çökmez.
 */
import { storage } from '../game/kv-storage';

const KEY = 'eov.tutorial.v1';
const VERSION = 1;
/** Bulut senkronu (cloud/sync-core.ts) sürüm denetimi için. */
export const TUTORIAL_KEY = KEY;
export const TUTORIAL_VERSION = VERSION;

interface TutorialSave {
  v: number;
  on: boolean;
  seen: string[];
  /** Eylem dersleri (Rest, Move, Skip, Ultimate...): oyuncu önerilen eylemi yaptı ya da ders tekrar sınırına ulaştı (data/tutorial.json > actionRepeats). */
  done?: string[];
  /** Eylem dersi kaç savaşta gösterildi (tamamlanmadan). */
  shows?: Record<string, number>;
}

let mem: TutorialSave | null = null;
/** `mem`in okunduğu / yazıldığı ham dizgi. Depodaki dizgi değiştiyse (bulut indirmesi, başka yazım) önbellek yeniden okunur: eski önbellek
 * sonraki yazımda indirilen tutorial kaydını geri ezip buluta eski veriyi yüklüyordu (2026-10-25). undefined = depo yok / okunamadı. */
let memRaw: string | null | undefined;
const listeners = new Set<() => void>();

function readRaw(): string | null | undefined {
  try {
    const kv = storage();
    return kv ? kv.getItem(KEY) : undefined;
  } catch {
    return undefined;
  }
}

function load(): TutorialSave {
  const raw = readRaw();
  if (mem && (raw === undefined || raw === memRaw)) return mem;
  let s: TutorialSave = { v: VERSION, on: true, seen: [] };
  try {
    if (raw) {
      const p = JSON.parse(raw) as Partial<TutorialSave>;
      const strs = (a: unknown): string[] => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []);
      if (p && p.v === VERSION) {
        s = { v: VERSION, on: p.on !== false, seen: strs(p.seen) };
        const done = strs(p.done);
        if (done.length) s.done = done;
        const shows = Object.entries(p.shows && typeof p.shows === 'object' ? p.shows : {}).filter(([, n]) => typeof n === 'number' && n > 0);
        if (shows.length) s.shows = Object.fromEntries(shows);
      }
    }
  } catch {
    /* bozuk / erişilemez kayıt: varsayılan */
  }
  mem = s;
  memRaw = raw;
  return s;
}

function save(s: TutorialSave): void {
  mem = s;
  try {
    const raw = JSON.stringify(s);
    storage()?.setItem(KEY, raw);
    memRaw = raw;
  } catch {
    /* depolama yok: yalnızca bu oturum */
  }
  for (const fn of listeners) fn();
}

/** Dersler açık mı (varsayılan açık). */
export function tutorialsOn(): boolean {
  return load().on;
}

export function setTutorialsOn(on: boolean): void {
  save({ ...load(), on });
}

/** Ayar ya da görülen dersler değişince (Settings satırı, Codex, debug). */
export function onTutorialChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function seenLessons(): ReadonlySet<string> {
  return new Set(load().seen);
}

export function isLessonSeen(id: string): boolean {
  return load().seen.includes(id);
}

export function markLessonSeen(id: string): void {
  const s = load();
  if (s.seen.includes(id)) return;
  save({ ...s, seen: [...s.seen, id] });
}

/** Eylem dersi tamamlandı mı (önerilen eylem yapıldı ya da tekrar sınırı doldu). */
export function lessonDoneIds(): ReadonlySet<string> {
  return new Set(load().done ?? []);
}

/** Eylem dersi tamamlandı (oyuncu önerilen eylemi yaptı). */
export function markLessonDone(id: string): void {
  const s = load();
  if (s.done?.includes(id)) return;
  save({ ...s, done: [...(s.done ?? []), id] });
}

/** Eylem dersinin kaç savaşta gösterildiği. */
export function lessonShows(id: string): number {
  return load().shows?.[id] ?? 0;
}

/** Eylem dersi bir savaşta daha gösterildi. */
export function noteLessonShown(id: string): void {
  const s = load();
  save({ ...s, shows: { ...(s.shows ?? {}), [id]: (s.shows?.[id] ?? 0) + 1 } });
}

/** Debug: tüm dersler yeniden görünür (ayar açılır). */
export function resetTutorials(): void {
  save({ v: VERSION, on: true, seen: [] });
}

/** Test: bellek önbelleğini sıfırlar (depoyu yeniden okur). */
export function _resetTutorialMemory(): void {
  mem = null;
  memRaw = undefined;
}
