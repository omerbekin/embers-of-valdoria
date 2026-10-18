import { undirectedDistances } from './graph';
import type { CampaignMap, MapEdge } from './types';

/**
 * Sis ve görünürlük (campaign.md 2.1; serbest dolaşım roadmap 2.4). Mesafe = bulunulan düğümden İKİ YÖNLÜ grafta kenar sayısı.
 *  - d = 1 ('near'): ad, alt başlık, tür ve (savaşsa) düşman önizlemesi.
 *  - 2 <= d <= visibility ('far'): yalnızca tür rozeti + ad.
 *  - Keşfedilen kalır: ayak basılan herhangi bir düğümün görüş mesafesinde kalmış düğüm sise geri dönmez ('far').
 *  - daha uzak: sis ('fog'); `alwaysVisible` düğümleri (Castle Morvane) sis altında adıyla/silüetiyle ('goal').
 *  - temizlenmiş düğümler 'cleared', bulunulan 'current'. Kapanan dal YOK (eski 'closed' kalktı).
 */
export type NodeVis = 'current' | 'cleared' | 'near' | 'far' | 'fog' | 'goal';
export type EdgeVis = 'walked' | 'open' | 'visible' | 'fog';

export interface FogInput {
  at: string;
  /** Yürüyüş günlüğü (yürünmüş yollar ardışık çiftlerden). */
  path: string[];
  /** Ayak basılan düğümler (yoksa path). */
  visited?: string[];
  /** Temizlenmiş düğümler (yoksa path'teki, bulunulan hariç). */
  cleared?: string[];
}

/** Ayak basılan düğümlerin görüş mesafesindeki düğümler (keşfedilen; src/campaign/state.ts > discoveredNodes ile aynı kural). */
function discovered(map: CampaignMap, visited: string[]): Set<string> {
  const out = new Set<string>();
  for (const v of visited) for (const [id, d] of undirectedDistances(map, v)) if (d <= map.visibility) out.add(id);
  return out;
}

export function nodeVisibility(map: CampaignMap, s: FogInput, revealAll = false): Record<string, NodeVis> {
  const dist = undirectedDistances(map, s.at);
  const cleared = new Set(s.cleared ?? s.path.filter((id) => id !== s.at));
  const seen = discovered(map, s.visited ?? s.path);
  const out: Record<string, NodeVis> = {};
  for (const n of map.nodes) {
    if (n.id === s.at) out[n.id] = 'current';
    else if (cleared.has(n.id)) out[n.id] = 'cleared';
    else {
      const d = dist.get(n.id) ?? Infinity;
      if (revealAll || d === 1) out[n.id] = 'near';
      else if (d <= map.visibility || seen.has(n.id)) out[n.id] = 'far';
      else out[n.id] = map.alwaysVisible.includes(n.id) ? 'goal' : 'fog';
    }
  }
  return out;
}

/** Yürüyüş günlüğünde iki düğüm ardışık mı (hangi yönde olursa olsun)? */
function walkedPair(path: string[], a: string, b: string): boolean {
  for (let i = 1; i < path.length; i++) {
    const x = path[i - 1];
    const y = path[i];
    if ((x === a && y === b) || (x === b && y === a)) return true;
  }
  return false;
}

/** Kenarın görünümü: yürünmüş, bulunulan yerden açık (tek hamle), görünür ya da sisli. */
export function edgeVisibility(_map: CampaignMap, s: FogInput, vis: Record<string, NodeVis>, e: MapEdge): EdgeVis {
  if (walkedPair(s.path, e.from, e.to)) return 'walked';
  const a = vis[e.from];
  const b = vis[e.to];
  if ((e.from === s.at && b === 'near') || (e.to === s.at && a === 'near')) return 'open';
  const seen = (v: NodeVis | undefined) => v === 'current' || v === 'cleared' || v === 'near' || v === 'far';
  return seen(a) && seen(b) ? 'visible' : 'fog';
}

/** Düşman önizlemesi gösterilir mi (yalnızca d = 1, ya da sis kapalıyken). */
export const showsEnemies = (v: NodeVis | undefined): boolean => v === 'near' || v === 'current';
/** Ad ve tür rozeti görünür mü? */
export const showsName = (v: NodeVis | undefined): boolean => v !== 'fog' && v !== undefined;
