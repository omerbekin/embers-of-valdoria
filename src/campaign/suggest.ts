/**
 * Yoldaş önerisi (Ömer 2026-11-01): "Choose a companion" penceresinde takımın eksik rolünü dolduran kahramanların hepsi önerilir. Saf mantık (Phaser/DOM yok, rastgelelik yok).
 * Roller (ön saf > arka saf > takımı besleyen) ve metinler data/campaign/campaign.json > companySuggest. Öneri seçimi zorlamaz: pencere başka kahramanı serbestçe seçtirir.
 */
import { classes, skills } from '../engine/content';
import { CONFIG } from './data';
import { activeHeroes } from './state';
import type { CampaignState, CompanySuggestCfg, SuggestRole } from './types';

export interface CompanySuggestion {
  /** Önerilen sınıf id'leri (Ömer 2026-11-01: birden çok olabilir; sıra havuz sırası). */
  heroes: string[];
  /** Doldurduğu eksik rol. */
  role: SuggestRole;
  /** İpucunun altın satırı (gerekçe). */
  line: string;
  /** Diğer eksik roller için ek öneriler (Ömer 2026-11-07: birden çok öneri gösterilir); sıra cfg.order. */
  also: Array<{ heroes: string[]; role: SuggestRole; line: string }>;
}

/** Kahramanın dizilim satırı: ön / orta / arka (frontPriority; campaign.json > companySuggest.roles ile aynı eşikler). */
export function heroRow(classId: string): 'Front row' | 'Middle row' | 'Back row' {
  const p = classes[classId]?.frontPriority ?? 4;
  return p <= 4 ? 'Front row' : p >= 6.5 ? 'Back row' : 'Middle row';
}

/** Kahramanın hasar türü (skill kitindeki hasarlı skilllere göre): Physical / Magic / Physical and magic. */
export function heroDamage(classId: string): 'Physical' | 'Magic' | 'Physical and magic' {
  const kinds = new Set((classes[classId]?.skills ?? []).flatMap((id) => (skills[id]?.effects ?? []).flatMap((e) => (e.type === 'damage' ? [e.damageType] : []))));
  return kinds.has('physical') && kinds.has('magic') ? 'Physical and magic' : kinds.has('magic') ? 'Magic' : 'Physical';
}

/** İpucu satırı: "Front row · Physical damage". */
export const heroTraits = (classId: string): string => `${heroRow(classId)} · ${heroDamage(classId)} damage`;

export interface SuggestAt {
  mapId: string;
  nodeId: string;
  /** Yeni (tek kişilik başlangıç) kayıt. Eski kayıt yapısında öneri yok. */
  soloStart: boolean;
}

/**
 * Takım (sınıf id'leri) + aday havuzu (pencerenin sunduğu sınıflar, öncelik sırasıyla) + düğüm -> öneri ya da null.
 * Takımdaki ilk eksik rolün (cfg.order) kahramanları: havuzda o rolü sayan, takımda olmayan tüm sınıflar. O rolün adayı havuzda yoksa sıradaki eksik role bakılır.
 * Üç rol da doluysa, düğüm listede değilse (King's Bridge) ya da eski kayıtta null.
 */
export function suggestCompanion(team: string[], pool: string[], at: SuggestAt, cfg: CompanySuggestCfg = CONFIG.companySuggest): CompanySuggestion | null {
  if (!at.soloStart || !cfg.nodes[at.mapId]?.includes(at.nodeId)) return null;
  const have = new Set<SuggestRole>(team.flatMap((c) => cfg.roles[c] ?? []));
  const found: Array<{ heroes: string[]; role: SuggestRole; line: string }> = [];
  for (const role of cfg.order) {
    if (have.has(role)) continue;
    const heroes = pool.filter((c) => !team.includes(c) && (cfg.roles[c] ?? []).includes(role));
    if (heroes.length) found.push({ heroes, role, line: cfg.lines[role] });
  }
  const [first, ...also] = found;
  return first ? { ...first, also } : null;
}

/** Durumdan öneri: takım = etkin kadro, düğüm = bulunulan düğüm; adaylar veri listesinin (companyPool) sırasına dizilir (sunum sırası/seed etkilemez). */
export function companySuggestionFor(s: CampaignState, pool: string[]): CompanySuggestion | null {
  const rank = (c: string): number => {
    const i = CONFIG.companyPool.indexOf(c);
    return i < 0 ? CONFIG.companyPool.length : i;
  };
  return suggestCompanion(
    activeHeroes(s).map((h) => h.class),
    [...pool].sort((a, b) => rank(a) - rank(b)),
    { mapId: s.mapId, nodeId: s.at, soloStart: !!s.soloStart },
  );
}
