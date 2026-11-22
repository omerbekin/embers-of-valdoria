// Jenerik verisi (data/credits.json; TASLAK, Ömer düzeltecek). Saf: DOM yok (Node testi tests/game-ending.test.ts). Görünüm src/ui/credits.ts.
import creditsJson from '../../data/credits.json';

export interface CreditsSection {
  heading: string;
  lines: string[];
}
export interface CreditsData {
  title: string;
  pageMs: number;
  sections: CreditsSection[];
  closing: string;
}
/** Ekrandaki sayfa: başlık sayfası (heading yok, yalnız oyun adı), bölüm sayfaları, kapanış sayfası. */
export interface CreditsPage {
  kind: 'title' | 'section' | 'closing';
  heading: string;
  lines: string[];
}

export const CREDITS = creditsJson as unknown as CreditsData;

/** Sayfalar: oyun adı, satırı olan her bölüm (boş bölüm çizilmez: Ömer doldurunca görünür), kapanış cümlesi. */
export function creditPages(d: CreditsData = CREDITS): CreditsPage[] {
  const lines = (s: CreditsSection): string[] => (Array.isArray(s.lines) ? s.lines.filter((l) => typeof l === 'string' && l.trim()) : []);
  return [
    { kind: 'title', heading: '', lines: [d.title] },
    ...d.sections.filter((s) => lines(s).length).map((s) => ({ kind: 'section' as const, heading: s.heading, lines: lines(s) })),
    ...(d.closing ? [{ kind: 'closing' as const, heading: '', lines: [d.closing] }] : []),
  ];
}
