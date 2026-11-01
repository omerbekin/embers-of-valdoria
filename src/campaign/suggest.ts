/**
 * Yoldaş önerisi (Ömer 2026-11-01): "Choose a companion" penceresinde takımın eksik rolüne göre tek kahraman önerilir. Saf mantık (Phaser/DOM yok, rastgelelik yok).
 * Roller (ön saf > arka saf > takımı besleyen) ve metinler data/campaign/campaign.json > companySuggest. Öneri seçimi zorlamaz: pencere başka kahramanı serbestçe seçtirir.
 */
import { CONFIG } from './data';
import { activeHeroes } from './state';
import type { CampaignState, CompanySuggestCfg, SuggestRole } from './types';

export interface CompanySuggestion {
  /** Önerilen sınıf id'si. */
  hero: string;
  /** Doldurduğu eksik rol. */
  role: SuggestRole;
  /** İpucunun altın satırı (gerekçe). */
  line: string;
}

export interface SuggestAt {
  mapId: string;
  nodeId: string;
  /** Yeni (tek kişilik başlangıç) kayıt. Eski kayıt yapısında öneri yok. */
  soloStart: boolean;
}

/**
 * Takım (sınıf id'leri) + aday havuzu (pencerenin sunduğu sınıflar, öncelik sırasıyla) + düğüm -> öneri ya da null.
 * Takımdaki ilk eksik rolün (cfg.order) kahramanı: havuzda o rolü sayan, takımda olmayan ilk sınıf. O rolün adayı havuzda yoksa sıradaki eksik role bakılır.
 * Üç rol da doluysa, düğüm listede değilse (King's Bridge) ya da eski kayıtta null.
 */
export function suggestCompanion(team: string[], pool: string[], at: SuggestAt, cfg: CompanySuggestCfg = CONFIG.companySuggest): CompanySuggestion | null {
  if (!at.soloStart || !cfg.nodes[at.mapId]?.includes(at.nodeId)) return null;
  const have = new Set<SuggestRole>(team.flatMap((c) => cfg.roles[c] ?? []));
  for (const role of cfg.order) {
    if (have.has(role)) continue;
    const hero = pool.find((c) => !team.includes(c) && (cfg.roles[c] ?? []).includes(role));
    if (hero) return { hero, role, line: cfg.lines[role] };
  }
  return null;
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
