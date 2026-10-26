/**
 * Düğüm tehlike göstergesi (Ömer 2026-10-26): düğümün seviyesi ile aktif takımın ortalama seviyesi arasındaki fark bant verir
 * (normal / danger "Dangerous" / deadly "Deadly"). Eşikler ve renkler veri: campaign.json > levelGap. Saf: Phaser / DOM yok.
 */
import { CONFIG } from './data';
import { isCleared, patrolAvailable } from './state';
import { nodeLevel } from './power';
import { forwardDistances } from './graph';
import { getMap } from './data';
import type { CampaignMap, CampaignState } from './types';

export type GapBand = 'normal' | 'danger' | 'deadly';

/** Aktif takımın ortalama seviyesi (aktif dizilim; yaşayan ve ceset dahil, Inn'dekiler ve yedek hariç). Takım yoksa 0. */
export function companyAvgLevel(s: CampaignState): number {
  const hs = s.active.filter(Boolean).map((id) => s.roster.find((h) => h.id === id)).filter((h): h is NonNullable<typeof h> => !!h);
  return hs.length ? hs.reduce((a, h) => a + h.level, 0) / hs.length : 0;
}

/** Düğüm seviyesi - takım ortalaması (ondalıklı). */
export const nodeLevelGap = (s: CampaignState, nodeId: string): number => nodeLevel(s.mapId, nodeId) - companyAvgLevel(s);

/** Farktan bant (eşikler campaign.json > levelGap). */
export function gapBand(gap: number, cfg: { warnAt: number; deadlyAt: number } = CONFIG.levelGap): GapBand {
  return gap >= cfg.deadlyAt ? 'deadly' : gap >= cfg.warnAt ? 'danger' : 'normal';
}

export const BAND_NAME: Record<GapBand, string> = { normal: '', danger: 'Dangerous', deadly: 'Deadly' };

export interface NodeThreat {
  band: GapBand;
  gap: number;
  /** Düğümün (önerilen) seviyesi ve takım ortalaması. */
  level: number;
  company: number;
}

/** Tutorial düğümü mü: tutorial'ı bitiren kasabanın (endsTutorial) gerisindeki, başlangıçtan o kasabaya kadar olan düğümler. */
function isTutorialNode(map: CampaignMap, nodeId: string): boolean {
  const end = map.nodes.find((n) => n.endsTutorial);
  if (!end) return false;
  const d = forwardDistances(map, map.start);
  const a = d.get(nodeId);
  const b = d.get(end.id);
  return a !== undefined && b !== undefined && a < b;
}

/**
 * Düğümün tehlike bilgisi; savaşmayan (karşılaşması yok), tutorial ya da artık savaşılmayan (temizlenmiş, devriyesi kapalı) düğümde null.
 * Devriye açık temizlenmiş düğüm de sayılır (devriye düşmanı aynı seviyede).
 */
export function nodeThreat(s: CampaignState, nodeId: string): NodeThreat | null {
  const map = getMap(s.mapId);
  const n = map.nodes.find((x) => x.id === nodeId);
  if (!n || !n.encounter || isTutorialNode(map, nodeId)) return null;
  if (isCleared(s, nodeId) && !patrolAvailable(s, nodeId)) return null;
  const level = nodeLevel(s.mapId, nodeId);
  const company = companyAvgLevel(s);
  const gap = level - company;
  return { band: gapBand(gap), gap, level, company };
}

/** Kart satırı: "Recommended level 9 · Your company 6.7". */
export const threatLine = (t: NodeThreat): string => `Recommended level ${t.level} · Your company ${(Math.round(t.company * 10) / 10).toFixed(1)}`;
