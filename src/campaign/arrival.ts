// Varış bilgileri (saf; Phaser/DOM yok). Playtest 2026-10-23 seçimleri (docs/design/playtest-2026-10-23-picks.md):
// H3 = düğüm kartı varıştaki ön adımları ("Form your company", yeni yoldaş) önceden yazar, düğme "Continue" olur;
// H2 = tutorial kadrosunun Ashford'da kalacağı varmadan söylenir ("Temporary company");
// D6 = zafer sonrası toparlanma (rules.victoryHeal) haritada görünür bir not olur. Metinler data/campaign/campaign.json > texts.
import { CONFIG } from './data';
import { isDone, mapOf, nodeSteps, recruitOffer, rulesFor, victoryHealFor } from './state';
import { node } from './graph';
import type { CampaignState } from './types';

/** Varışta savaştan / kasabadan ÖNCE gelen kadro adımları (sırayla). */
export type PreStep = 'recruit' | 'farewell' | 'company';
const PRE: readonly PreStep[] = ['recruit', 'farewell', 'company'];

/** Düğüme varınca önce yapılacak kadro adımları (bitmemiş olanlar, veri sırasıyla). Devriye / yeniden ziyarette boş. */
export function arrivalPreSteps(s: CampaignState, nodeId: string): PreStep[] {
  const map = mapOf(s);
  const n = map.nodes.find((x) => x.id === nodeId);
  if (!n) return [];
  // zaferden sonraki katılım (recruit.when 'after', Mill Road) varışta değil: kartın "First" satırına girmez
  return nodeSteps(map, n).filter((k): k is PreStep => (PRE as readonly string[]).includes(k) && !isDone(s, nodeId, k) && !(k === 'recruit' && n.recruit?.when !== 'before'));
}

const STEP_TEXT: Record<PreStep, string> = { recruit: 'stepRecruit', farewell: 'stepFarewell', company: 'stepCompany' };

/** Kartın "First" satırı: ön adımların İngilizce cümleleri (campaign.json > texts.stepRecruit / stepFarewell / stepCompany). */
export function arrivalStepLines(s: CampaignState, nodeId: string, o: { skipRecruit?: boolean } = {}): string[] {
  return arrivalPreSteps(s, nodeId)
    .filter((k) => !(o.skipRecruit && k === 'recruit'))
    .map((k) => CONFIG.texts[k === 'company' && s.soloStart ? 'stepCompanyJoin' : STEP_TEXT[k]] ?? '')
    .filter(Boolean);
}

/**
 * Kasaba kartının haber satırları (Ömer 2026-11-02, taslak town-card A; yeni kural YOK, oyunun mevcut koşulları): "waiting" = kasabadan ayrılırken
 * gelen gönüllü henüz seçilmedi ve kasabanın bir recruit yeri (Barracks / Notice Board) açık; "join" = varışta bir gezginin katılma önerisi (recruit
 * adımı 'before') bekliyor. Metinler campaign.json > texts.townRecruitWaiting / townJoinWaiting.
 */
export function townCardFlags(s: CampaignState, nodeId: string, hotspotLabel: string | null): string[] {
  const out: string[] = [];
  const n = node(mapOf(s), nodeId);
  if (hotspotLabel && n.recruit?.when === 'leave' && !isDone(s, nodeId, 'volunteer') && recruitOffer(s, nodeId).length > 0) {
    out.push((CONFIG.texts['townRecruitWaiting'] ?? 'A recruit waits at the {place}').replace('{place}', hotspotLabel));
  }
  if (arrivalPreSteps(s, nodeId).includes('recruit')) out.push(CONFIG.texts['townJoinWaiting'] ?? 'Someone wants to join your company.');
  return out;
}

/** Tutorial kadrosu mu yürüyor (Ashford'da veda edecek kahramanlar kadroda)? Harita sütunu başlığı "Temporary company" olur. */
export const temporaryCompany = (s: CampaignState): boolean => s.roster.some((h) => h.tutorial);

/** Bulunulan düğümdeki zaferin toparlanma oranı (yaşayanlar, maks canın oranı): normal / elit / boss (rules.*VictoryHeal). */
export function victoryRecovery(s: CampaignState): number {
  return (s.lastVictoryHeal?.node === s.at ? s.lastVictoryHeal.ratio : undefined) ?? victoryHealFor(rulesFor(s), node(mapOf(s), s.at).type);
}

/** Zafer toparlanması notu (texts.victoryRecovery, {pct}; tam şifada texts.victoryRecoveryFull). Oran 0 ise null. */
export function victoryRecoveryNote(ratio: number): string | null {
  if (!(ratio > 0)) return null;
  if (ratio >= 1) return CONFIG.texts['victoryRecoveryFull'] ?? null;
  const t = CONFIG.texts['victoryRecovery'];
  return t ? t.replace('{pct}', String(Math.round(ratio * 100))) : null;
}
