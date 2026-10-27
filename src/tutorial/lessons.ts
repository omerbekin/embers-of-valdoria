/**
 * Sefer tutorial'ı kuralları (saf: DOM / Phaser / window yok, testlenebilir). İçerik data/tutorial.json; tasarım docs/design/tutorial.md.
 * Hangi ders ne zaman açılır (savaş içi tetikler, ekran tetikleri), ilk savaşın zorunlu adımları, Bölüm III yenilgi ipuçları ve
 * Codex > Lessons maddeleri buradan gelir. Görülen dersler ve açık/kapalı ayarı src/tutorial/store.ts'te.
 */
import data from '../../data/tutorial.json';
import campaignJson from '../../data/campaign/campaign.json';

export type ForcedAwait = 'next' | 'skill' | 'target';
/**
 * Savaş dersinin tetik durumu (Ömer 2026-10-14: Mill Road'dan sonra her ders DURUMLA tetiklenir; saf tespit src/tutorial/situations.ts).
 * start = yalnızca ilk savaşın zorunlu adımları. Karar başı (sırası gelen kahraman için): first (savaşın ilk oyuncu kararı), rest, move, skip,
 * ultimate, fallen (bir kahraman düştü), spent, status, ground, telegraph. Skill seçilince: preview (düşmana hasar veren skill: hedefin üstünde
 * hasar / isabet önizlemesi), ally (dostu hedefleyen skill), reach, area.
 */
export type BattleWhen = 'start' | 'first' | 'rest' | 'move' | 'skip' | 'ultimate' | 'fallen' | 'spent' | 'status' | 'ground' | 'telegraph' | 'preview' | 'ally' | 'reach' | 'area';
/** Eylem dersini tamamlayan oyuncu eylemi (yoksa ders bilgi dersidir: bir kez gösterilince biter). */
export type LessonAction = 'rest' | 'move' | 'skip' | 'ultimate';
export type LessonScreen = 'town' | 'merchant' | 'company' | 'map' | 'event' | 'gear' | 'endless' | 'valor' | 'rest';

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
  /** En az bu kadar sefer zaferi (Wounds Carry Over: ilk zaferden sonra). */
  minWins?: number;
  /** Haritada bu düğüm türlerinden biri görünür (Reading the Road). */
  visible?: string[];
  /** Torbada ya da takılıyken bu nadirliklerden biri var (Item Quality). */
  anyRarity?: string[];
  /** Torbada en az bir item (Gear dersi: ilk loot). */
  bag?: boolean;
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
  /** Zorunlu adım: ilk savaşın kaçıncı oyuncu kararında (varsayılan 1). */
  decision?: number;
  /** Zorunlu adım / Boss: ekran yumuşakça kararır, yalnızca vurgulanan öğe (ve kutu) aydınlık kalır. */
  spotlight?: boolean;
  /** Duruma göre metin (Situation.variant; ör. Valor açıksa). Codex `text` (ya da `codex`) gösterir. */
  variants?: Record<string, string>;
  /** Eylem dersi: oyuncu bu eylemi yapınca tamamlanır (yapmazsa durum yeniden oluşunca, en çok actionRepeats savaşta, yeniden çıkar). */
  done?: LessonAction;
  /** Kutunun yeri: üst orta (varsayılan) ya da alt (Gear: torbayı kapatmasın). */
  place?: 'top' | 'bottom';
  /** Zorunlu ekran dersi (kapı): düğme yerine bu bekleme yazısı; kutu beklenen eylem yapılınca dışarıdan kapanır. */
  awaitText?: string;
  /** gate: oyunun kendisi açar (ör. 'formation' = Zorunlu Formation kapısı, CampaignMapScene); ekran / savaş tetiği yok. */
  trigger: { battle?: BattleTrigger; gate?: 'formation' } & Partial<ScreenTrigger>;
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
export function lessonPages(l: Lesson, o: { variant?: string; vars?: LessonVars } = {}): LessonPage[] {
  const vars = { ...LESSON_VARS, ...(o.vars ?? {}) };
  if (l.pages?.length) return l.pages.map((p) => ({ ...p, text: fillVars(p.text, vars) }));
  const text = (o.variant && l.variants?.[o.variant]) || l.text || '';
  return [{ text: fillVars(text, vars), ...(l.focus ? { focus: l.focus } : {}) }];
}

/** Codex'te yeniden okunan metin (codex alanı, yoksa sayfalar art arda). */
export function lessonCodexText(l: Lesson): string[] {
  if (l.codex) return [fillVars(l.codex, LESSON_VARS)];
  return lessonPages(l).map((p) => (p.title ? `${p.title}: ${p.text}` : p.text));
}

// ---------------------------------------------------------------- metindeki sayılar (koda gömülmez: veriden)

/** Ders metnindeki {ad} yer tutucuları. */
export type LessonVars = Record<string, number | string>;

const pct = (v: number) => Math.round(v * 100);
/**
 * Varsayılanlar data/campaign/campaign.json'dan: victoryHeal (zafer sonrası toparlanma, %), restHeal (dinlenme noktası, %). Sefer ekranı
 * zorluğun geçerli kuralıyla üstüne yazar (CampaignMapScene.lessons).
 */
export const LESSON_VARS: LessonVars = {
  victoryHeal: pct(campaignJson.rules.victoryHeal),
  restHeal: pct(campaignJson.rest.heal),
};

/** {ad} -> değer (bilinmeyen ad olduğu gibi kalır; {skill} odak seçicisine aittir). */
export function fillVars(text: string, vars: LessonVars): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] !== undefined ? String(vars[k]) : m));
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
  /** Dersin metin seçeneği (Lesson.variants; ör. 'valor'). */
  variant?: string;
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
export function dueBattleLesson(ctx: BattleLessonCtx, found: readonly Situation[], p: LessonProgress): { lesson: Lesson; skill?: string; variant?: string } | null {
  if (!situationLessonsIn(ctx) || !found.length) return null;
  for (const l of LESSONS) {
    const t = l.trigger.battle;
    if (!t || l.forced || p.thisBattle.has(l.id) || lessonComplete(l, p)) continue;
    const hit = found.find((f) => f.when === t.when);
    if (hit) return { lesson: l, ...(hit.skill ? { skill: hit.skill } : {}), ...(hit.variant ? { variant: hit.variant } : {}) };
  }
  return null;
}

/** İlk savaşın zorunlu adımları (sırayla; görülmüş olanlar dahil değil). `decision`: kaçıncı oyuncu kararı (Lesson.decision, varsayılan 1). */
export function forcedSteps(ctx: BattleLessonCtx, seen: ReadonlySet<string>, decision = 1): Lesson[] {
  return LESSONS.filter((l) => !!l.forced && (l.decision ?? 1) === decision && !!l.trigger.battle?.node?.includes(ctx.node) && !seen.has(l.id));
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
  /** Sefer zaferleri. */
  wins?: number;
  /** Haritada görünen (sis dışı, geçilmemiş) düğüm türleri. */
  visibleTypes?: readonly string[];
  /** Torbadaki ve takılı item'lerin nadirlikleri. */
  rarities?: readonly string[];
  /** Torbadaki item sayısı. */
  bagSize?: number;
}

/** Bu ekranda gösterilecek dersler (veri sırasıyla, görülmemiş). Çağıran yalnızca İLKİNİ gösterir: bir kararda en çok bir yeni ders. */
export function dueScreenLessons(screen: LessonScreen, ctx: ScreenCtx, seen: ReadonlySet<string>): Lesson[] {
  return LESSONS.filter((l) => {
    const t = l.trigger;
    if (t.screen !== screen || seen.has(l.id)) return false;
    if (t.node && (!ctx.node || !t.node.includes(ctx.node))) return false;
    if (t.after && !(ctx.path ?? []).includes(t.after)) return false;
    if (t.minParty !== undefined && (ctx.partySize ?? 0) < t.minParty) return false;
    if (t.minWins !== undefined && (ctx.wins ?? 0) < t.minWins) return false;
    if (t.visible && !t.visible.some((x) => ctx.visibleTypes?.includes(x))) return false;
    if (t.anyRarity && !t.anyRarity.some((x) => ctx.rarities?.includes(x))) return false;
    if (t.bag && !(ctx.bagSize ?? 0)) return false;
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
