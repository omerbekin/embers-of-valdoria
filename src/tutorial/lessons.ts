/**
 * Sefer tutorial'ı kuralları (saf: DOM / Phaser / window yok, testlenebilir). İçerik data/tutorial.json; tasarım docs/design/tutorial.md.
 * Hangi ders ne zaman açılır (savaş içi tetikler, ekran tetikleri), ilk savaşın zorunlu adımları, Bölüm III yenilgi ipuçları ve
 * Codex > Lessons maddeleri buradan gelir. Görülen dersler ve açık/kapalı ayarı src/tutorial/store.ts'te.
 */
import data from '../../data/tutorial.json';

export type ForcedAwait = 'next' | 'skill' | 'target';
export type BattleWhen = 'start' | 'turn' | 'skill' | 'status' | 'ground' | 'boss';
export type LessonScreen = 'town' | 'merchant' | 'company' | 'map' | 'event' | 'gear' | 'endless' | 'valor';

export interface LessonPage {
  title?: string;
  text: string;
  /** Vurgulanacak DOM öğesi (CSS seçicisi; yoksa vurgu yok). */
  focus?: string;
}

export interface BattleTrigger {
  node?: string[];
  region?: string[];
  when: BattleWhen;
  turn?: number;
  skill?: 'melee' | 'area';
  fallbackTurn?: number;
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

/** O anki savaş durumu (BattleScene her oyuncu kararında ve skill seçiminde doldurur). */
export interface BattleMoment {
  /** Bu savaşta kaçıncı oyuncu kararı (1'den). */
  turn: number;
  /** Oyuncu az önce bir skill seçti (yalnızca seçim anında). */
  skill?: { melee: boolean; area: boolean };
  hasStatus: boolean;
  hasGround: boolean;
  hasBoss: boolean;
}

const placeMatches = (t: BattleTrigger, ctx: BattleLessonCtx): boolean =>
  (!t.node || t.node.includes(ctx.node)) && (!t.region || t.region.includes(ctx.region)) && (!!t.node || !!t.region);

function whenMatches(t: BattleTrigger, m: BattleMoment): boolean {
  if (t.fallbackTurn !== undefined && !m.skill && m.turn >= t.fallbackTurn) return true;
  switch (t.when) {
    case 'start':
      return !m.skill && m.turn >= 1;
    case 'turn':
      return !m.skill && m.turn >= (t.turn ?? 1);
    case 'skill':
      return !!m.skill && (t.skill === 'melee' ? m.skill.melee : t.skill === 'area' ? m.skill.area : true);
    case 'status':
      return !m.skill && m.hasStatus;
    case 'ground':
      return !m.skill && m.hasGround;
    case 'boss':
      return !m.skill && m.hasBoss;
  }
}

/** Şimdi gösterilecek serbest (zorunlu olmayan) dersler, veri sırasıyla. Görülenler ve zorunlu adımlar hariç. */
export function dueBattleLessons(ctx: BattleLessonCtx, m: BattleMoment, seen: ReadonlySet<string>): Lesson[] {
  return LESSONS.filter((l) => {
    const t = l.trigger.battle;
    return !!t && !l.forced && !seen.has(l.id) && placeMatches(t, ctx) && whenMatches(t, m);
  });
}

/** İlk savaşın zorunlu adımları (sırayla; görülmüş olanlar dahil değil). */
export function forcedSteps(ctx: BattleLessonCtx, seen: ReadonlySet<string>): Lesson[] {
  return LESSONS.filter((l) => !!l.forced && !!l.trigger.battle && placeMatches(l.trigger.battle, ctx) && !seen.has(l.id));
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
