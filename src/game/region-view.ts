/**
 * Sefer haritası BÖLGE GÖRÜNÜMÜ (Harita 1 yeniden çizim, Ömer onayı 2026-10-22; mockup public/mockups/maps-2-3.html#v0, m.js > layout / clampView).
 * Saf hesaplar (Phaser'sız; tests/region-view.test.ts). Sahne: src/game/scenes/CampaignMapScene.ts.
 *
 * Kurallar (mockup ile aynı):
 *  - Bölgeye yakınlaşılır: bölgenin düğümleri (+ pay) görünüme sığar; yakınlaştırma görseli her zaman kaplar ("cover", kenarda siyah yok) ve
 *    REGION_VIEW.maxZoom'u aşmaz. Kaydırma / tekerlek / sürükleme haritanın çerçevesine kilitli kalır (map-view.ts > clampMid).
 *  - Bölgenin kendi düğümleri ve aralarındaki yollar görünür. Komşu bölgenin, bölgeye BAĞLANAN düğümü silik (REGION_VIEW.ghostAlpha) ve o yol
 *    REGION_VIEW.ghostRoadAlpha saydamlıkla; üstüne gelince yol hafif sarı vurgulanır. Cepler (isteğe bağlı çıkmaz dal) komşu olarak gösterilmez.
 *  - Kilitli (henüz açılmamış) bölgenin düğümü gösterilmez: sis altındaki düğüm (görülmemiş) komşu olarak çizilmez.
 *  - Bölgenin dışındaki diğer düğüm / yollar çizilmez.
 */
import type { CampaignMap, MapEdge } from '../campaign/types';
import type { NodeVis } from '../campaign/fog';
import type { Bounds } from './map-view';

export const REGION_VIEW = {
  /** Bölgeye sığdırırken düğüm kümesinin çevresine bırakılan pay (dünya pikseli; etiket şeritleri sığsın). */
  pad: 150,
  /** Bölge yakınlaştırmasının üst sınırı (oyuncunun MAP_ZOOM yakınlaştırması bunun üstüne çarpılır). Mockup: maxK 2,4. */
  maxZoom: 2.4,
  /** Komşu bölgenin bağlantı düğümü / yolu / üstüne gelince yol vurgusu (Ömer 2026-10-22: %65, %80, hafif sarı). */
  ghostAlpha: 0.65,
  ghostRoadAlpha: 0.8,
  hoverColor: 0xffb35a,
  hoverAlpha: 0.5,
  /** Bölgeler arası kamera geçişi (ms; Reduced motion = anında). */
  moveMs: 520,
} as const;

export interface RegionSets {
  region: string;
  /** Bölgenin düğümleri. */
  inside: Set<string>;
  /** Komşu bölgenin bağlantı düğümleri (silik). */
  ghosts: Set<string>;
  /** İki ucu bölgede olan yollar. */
  roads: MapEdge[];
  /** Bölgeden komşu bağlantı düğümüne giden yollar. */
  ghostRoads: MapEdge[];
}

const seen = (v: NodeVis | undefined): boolean => v === 'current' || v === 'cleared' || v === 'near' || v === 'far';

/** Bölge görünümünde ne çizilir. `vis`: sis durumu (src/campaign/fog.ts > nodeVisibility). */
export function regionSets(map: CampaignMap, region: string, vis: Record<string, NodeVis>): RegionSets {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const inside = new Set(map.nodes.filter((n) => n.region === region).map((n) => n.id));
  const ghosts = new Set<string>();
  const roads: MapEdge[] = [];
  const ghostRoads: MapEdge[] = [];
  for (const e of map.edges) {
    const a = inside.has(e.from);
    const b = inside.has(e.to);
    if (a && b) roads.push(e);
    else if (a || b) {
      const inn = byId.get(a ? e.from : e.to);
      const out = byId.get(a ? e.to : e.from);
      if (!inn || !out || inn.optional || out.optional) continue; // cep komşu sayılmaz
      if (!seen(vis[out.id])) continue; // kilitli (görülmemiş) bölgenin düğümü gösterilmez
      ghosts.add(out.id);
      ghostRoads.push(e);
    }
  }
  return { region, inside, ghosts, roads, ghostRoads };
}

/** Bölgenin düğümlerinin dünyadaki kutusu (+ pay). `P`: düğüm konumu (dünya). */
export function regionBounds(map: CampaignMap, region: string, P: (id: string) => { x: number; y: number }, pad: number = REGION_VIEW.pad): Bounds {
  const pts = map.nodes.filter((n) => n.region === region).map((n) => P(n.id));
  if (!pts.length) return { left: 0, right: 0, top: 0, bottom: 0 };
  return {
    left: Math.min(...pts.map((p) => p.x)) - pad,
    right: Math.max(...pts.map((p) => p.x)) + pad,
    top: Math.min(...pts.map((p) => p.y)) - pad,
    bottom: Math.max(...pts.map((p) => p.y)) + pad,
  };
}

/**
 * Bölge yakınlaştırması (oyuncu yakınlaştırmasından önceki taban). `view1` = yakınlaştırma 1'de görünen dünya alanı (tuval / render ölçeği),
 * `frame` = harita görselinin dünyadaki kapsamı. Sonuç: bölge sığar, en az görseli kaplayan ölçek (kenarda boşluk yok) ve en az 1, en çok maxZoom.
 */
export function regionZoom(b: Bounds, view1: { w: number; h: number }, frame: Bounds, maxZoom: number = REGION_VIEW.maxZoom): number {
  const fit = Math.min(view1.w / Math.max(1, b.right - b.left), view1.h / Math.max(1, b.bottom - b.top));
  const cover = Math.max(view1.w / Math.max(1, frame.right - frame.left), view1.h / Math.max(1, frame.bottom - frame.top));
  return Math.max(1, cover, Math.min(fit, maxZoom));
}

/** Bölge kutusunun ortası (kamera hedefi; çerçeveye kısma sahnede clampMid ile). */
export const boundsMid = (b: Bounds): { x: number; y: number } => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
