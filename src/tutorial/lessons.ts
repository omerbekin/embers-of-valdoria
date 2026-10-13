/**
 * Sefer tutorial'ı kuralları (saf: DOM / Phaser / window yok, testlenebilir). İçerik data/tutorial.json; tasarım docs/design/tutorial.md.
 * Hangi ders ne zaman açılır (savaş içi tetikler, ekran tetikleri), ilk savaşın zorunlu adımları, Bölüm III yenilgi ipuçları ve
 * Codex > Lessons maddeleri buradan gelir. Görülen dersler ve açık/kapalı ayarı src/tutorial/store.ts'te.
 */
import data from '../../data/tutorial.json';

export type ForcedAwait = 'next' | 'skill' | 'target';
/**
 * Savaş dersinin tetik durumu (Ömer 2026-10-14: Mill Road'dan sonra her ders DURUMLA tetiklenir; saf tespit src/tutorial/situations.ts).
 * start = yalnızca ilk savaşın zorunlu adımları. Karar başı (sırası gelen kahraman için): rest, move, skip, ultimate, spent, status, ground,
 * telegraph. Skill seçilince: reach, area.
 */
export type BattleWhen = 'start' | 'rest' | 'move' | 'skip' | 'ultimate' | 'spent' | 'status' | 'ground' | 'telegraph' | 'reach' | 'area';
/** Eylem dersini tamamlayan oyuncu eylemi (yoksa ders bilgi dersidir: bir kez gösterilince biter). */
export type LessonAction = 'rest' | 'move' | 'skip' | 'ultimate';
export type LessonScreen = 'town' | 'merchant' | 'company' | 'map' | 'event' | 'gear' | 'endless' | 'valor';

export interface LessonPage {
  title?: string;
  text: string;
  /** Vurgulanacak DOM öğesi (CSS seçicisi; yoksa vurgu yok). */
  focus?: string;
}

export interface BattleTrigger {
  /** Yalnızca zorunlu adımlar: ilk savaşın düğümü. */
  node?: string[];
  when: BattleWhen;
}

export interface ScreenTrigger {
  screen: LessonScreen;
  node?: string[];
  /** Harita dersleri: bu düğüm geçildikten (yoldan) sonra. */
  after?: string;
  minParty?: number;
}

export interface Lesson {
  id: string;
  group: string;
  title: string;
  text?: string;
  codex?: string;
  focus?: string;
  pages?: LessonPage[];
  forced?: ForcedAwait;
  /** Eylem dersi: oyuncu bu eylemi yapınca tamamlanır (yapmazsa durum yeniden oluşunca, en çok actionRepeats savaşta, yeniden çıkar). */
  done?: LessonAction;
  /** Kutunun yeri: üst orta (varsayılan) ya da alt (Gear: torbayı kapatmasın). */
  place?: 'top' | 'bottom';
  trigger: { battle?: BattleTrigger; screen?: LessonScreen; node?: string[]; after?: string; minParty?: number };
}

export interface TutorialData {
  version: number;
  mentor: { name: string; title: string; avatar: string };
  opening: { node: string; text: string };
  groups: string[];
  lessons: Lesson[];
  defeatHints: { regions: string[]; minDefeats: number; byEncounter: Record<string, string>; default: string };
  /** Eylem dersi tamamlanmadan en çok kaç savaşta gösterilir. */
  actionRepeats: number;
}

export const TUTORIAL = data as unknown as TutorialData;
export const MENTOR = TUTORIAL.mentor;
export const LESSONS: readonly Lesson[] = TUTORIAL.lessons;

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** Dersin sayfaları (tek metinli ders = tek sayfa). */
export function lessonPages(l: Lesson): LessonPage[] {
  if (l.pages?.length) return l.pages;
  return [{ text: l.text ?? '', ...(l.focus ? { focus: l.focus } : {}) }];
}

/** Codex'te yeniden okunan metin (codex alanı, yoksa sayfalar art arda). */
export function lessonCodexText(l: Lesson): string[] {
  if (l.codex) return [l.codex];
  return lessonPages(l).map((p) => (p.title ? `${p.title}: ${p.text}` : p.text));
}

// ---------------------------------------------------------------- savaş içi tetikler

/** Savaşın tutorial bağlamı (sefer): düğüm, bölge, karşılaşma, bu düğümdeki yenilgi sayısı. */
export interface BattleLessonCtx {
  node: string;
  region: string;
  encounter: string;
  defeats: number;
}

/** Şu an oluşan bir durum (saf tespit: src/tutorial/situations.ts). `skill`: dersin göstereceği skill (odak seçicisindeki {skill}). */
export interface Situation {
  when: BattleWhen;
  skill?: string;
}

/** Ders ilerlemesi: görülen (Codex), tamamlanan eylem dersleri, eylem dersinin gösterildiği savaş sayısı, bu savaşta gösterilenler. */
export interface LessonProgress {
  seen: ReadonlySet<string>;
  done: ReadonlySet<string>;
  shows: (id: string) => number;
  thisBattle: ReadonlySet<string>;
}

/** Ders bitti mi: bilgi dersi bir kez görülünce; eylem dersi eylem yapılınca ya da actionRepeats savaşta gösterilince. */
export function lessonComplete(l: Lesson, p: Pick<LessonProgress, 'seen' | 'done' | 'shows'>): boolean {
  if (!l.done) return p.seen.has(l.id);
  return p.done.has(l.id) || p.shows(l.id) >= TUTORIAL.actionRepeats;
}

/** Ders tetiklenen (durum dersi) bir savaşta mı: ilk savaş (açılış düğümü) adım adım senaryodur, orada durum dersi çıkmaz. */
export function situationLessonsIn(ctx: BattleLessonCtx): boolean {
  return ctx.node !== TUTORIAL.opening.node;
}

/**
 * Şimdi gösterilecek TEK durum dersi (veri sırası = öncelik) ve göstereceği skill; yoksa null. Bitmiş, bu savaşta zaten gösterilmiş,
 * zorunlu ya da durumu oluşmamış dersler atlanır. Aynı anda birden çok durum varsa yalnızca ilki: oyuncu her kararda en çok bir yeni şey okur.
 */
export function dueBattleLesson(ctx: BattleLessonCtx, found: readonly Situation[], p: LessonProgress): { lesson: Lesson; skill?: string } | null {
  if (!situationLessonsIn(ctx) || !found.length) return null;
  for (const l of LESSONS) {
    const t = l.trigger.battle;
    if (!t || l.forced || p.thisBattle.has(l.id) || lessonComplete(l, p)) continue;
    const hit = found.find((f) => f.when === t.when);
    if (hit) return { lesson: l, ...(hit.skill ? { skill: hit.skill } : {}) };
  }
  return null;
}

/** İlk savaşın zorunlu adımları (sırayla; görülmüş olanlar dahil değil). */
export function forcedSteps(ctx: BattleLessonCtx, seen: ReadonlySet<string>): Lesson[] {
  return LESSONS.filter((l) => !!l.forced && !!l.trigger.battle?.node?.includes(ctx.node) && !seen.has(l.id));
}

/** Açılış sözü (hikâye ile birleşik ilk savaş): yalnızca açılış düğümünde, zorunlu adımlar daha görülmemişse. */
export function openingLine(ctx: BattleLessonCtx, seen: ReadonlySet<string>): string | null {
  if (ctx.node !== TUTORIAL.opening.node) return null;
  return forcedSteps(ctx, seen).length ? TUTORIAL.opening.text : null;
}

/** Bölüm III: aynı savaş minDefeats kez kaybedildiyse duruma özel ipucu; değilse null. */
export function defeatHint(ctx: BattleLessonCtx): string | null {
  const d = TUTORIAL.defeatHints;
  if (!d.regions.includes(ctx.region) || ctx.defeats < d.minDefeats) return null;
  return d.byEncounter[ctx.encounter] ?? d.default;
}

// ---------------------------------------------------------------- ekran tetikleri

export interface ScreenCtx {
  node?: string;
  /** Geçilen düğümler (harita dersleri için). */
  path?: readonly string[];
  partySize?: number;
}

/** Bu ekranda gösterilecek dersler (veri sırasıyla, görülmemiş). */
export function dueScreenLessons(screen: LessonScreen, ctx: ScreenCtx, seen: ReadonlySet<string>): Lesson[] {
  return LESSONS.filter((l) => {
    const t = l.trigger;
    if (t.screen !== screen || seen.has(l.id)) return false;
    if (t.node && (!ctx.node || !t.node.includes(ctx.node))) return false;
    if (t.after && !(ctx.path ?? []).includes(t.after)) return false;
    if (t.minParty !== undefined && (ctx.partySize ?? 0) < t.minParty) return false;
    return true;
  });
}

// ---------------------------------------------------------------- Codex > Lessons

export interface CodexLesson {
  id: string;
  title: string;
  group: string;
  paragraphs: string[];
}

/** Codex'te görünen dersler: yalnızca görülenler, veri sırasıyla (grup sırası `groups`). */
export function codexLessons(seen: ReadonlySet<string>): CodexLesson[] {
  const order = (g: string) => {
    const i = TUTORIAL.groups.indexOf(g);
    return i < 0 ? TUTORIAL.groups.length : i;
  };
  return LESSONS.filter((l) => seen.has(l.id))
    .map((l, i) => ({ l, i }))
    .sort((a, b) => order(a.l.group) - order(b.l.group) || a.i - b.i)
    .map(({ l }) => ({ id: l.id, title: l.title, group: l.group, paragraphs: lessonCodexText(l) }));
}
