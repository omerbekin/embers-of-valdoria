/**
 * Gün sayacının saf görünüm verisi (Ömer 2026-10-26, taslak public/mockups/day-counter-6.html #I3 / R5): gün numarası, completionsPerDay ilerlemesi
 * ve "yaklaşan" kartlar. Yeni mekanik YOK: gün ve ilerleme sefer durumundan (src/campaign/state.ts > dayOf, dayProgressOf, completionsPerDay),
 * olay olarak yalnız bugün gerçekten var olan Inn şafağı gelir. Quest / Gate / Market / Threat kartları veri güdümlü: bir sistem
 * `registerDayEntries` ile sağlayıcı ekleyince kartlar kendiliğinden görünür; veri yoksa o kategori gizli (örnek olay yok).
 */
import { completionsPerDay, dayOf, dayProgressOf, type CampaignState } from '../campaign';

export type DayKind = 'quest' | 'gate' | 'market' | 'threat';

export const DAY_KIND_NAME: Record<DayKind, string> = { quest: 'Quest', gate: 'Gate', market: 'Market', threat: 'Threat' };

/** Gelecekteki bir sistemin yaklaşan olayı (geri sayım gün cinsinden; 0 = bugün). */
export interface DayEntry {
  id: string;
  kind: DayKind;
  title: string;
  sub: string;
  inDays: number;
}

export type DayEntryProvider = (s: CampaignState) => DayEntry[];

const providers: DayEntryProvider[] = [];

/** Bir sistemin gün olaylarını bağlar (mob güçlenmesi, görevler ...); dönen işlev bağlantıyı çözer. */
export function registerDayEntries(p: DayEntryProvider): () => void {
  providers.push(p);
  return () => {
    const i = providers.indexOf(p);
    if (i >= 0) providers.splice(i, 1);
  };
}

export interface DayView {
  day: number;
  /** Bu günde tamamlanan / gereken tamamlama. */
  steps: number;
  per: number;
  /** Günün bitmesine kalan tamamlama. */
  remaining: number;
  /** Bandın soluk satırı: sıradaki gerçek olay. */
  next: string;
  entries: DayEntry[];
  /** Inn'de dinlenen kahraman sayısı (şafakta iyileşirler); yoksa 0. */
  innGuests: number;
  foot: string;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function dayView(s: CampaignState): DayView {
  const per = completionsPerDay();
  const day = dayOf(s);
  const steps = Math.min(per - 1, Math.max(0, Math.round(dayProgressOf(s) * per)));
  const remaining = per - steps;
  const innGuests = (s.inn ?? []).length;
  const next = innGuests > 0 ? `Inn heals in ${plural(remaining, 'win', 'wins')}` : `${plural(remaining, 'win', 'wins')} to day ${day + 1}`;
  const entries = providers
    .flatMap((p) => p(s))
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 4);
  return { day, steps, per, remaining, next, entries, innGuests, foot: `${plural(per, 'win', 'wins')} = 1 day` };
}

/** Kartın geri sayım yazısı: "Now / today" ya da "3 days". */
export const countdown = (inDays: number): { n: string; unit: string } => (inDays <= 0 ? { n: 'Now', unit: 'today' } : { n: String(inDays), unit: inDays === 1 ? 'day' : 'days' });
