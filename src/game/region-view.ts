/**
 * Sefer haritası BÖLGE GÖRÜNÜMÜ (Harita 1 yeniden çizim, Ömer onayı 2026-10-22; mockup public/mockups/maps-2-3.html#v0, m.js > layout / clampView).
 * Saf hesaplar (Phaser'sız; tests/region-view.test.ts). Sahne: src/game/scenes/CampaignMapScene.ts.
 *
 * Kurallar (mockup ile aynı):
 *  - Bölgeye yakınlaşılır: bölgenin düğümleri (+ pay) görünüme sığar; yakınlaştırma görseli her zaman kaplar ("cover", kenarda siyah yok) ve
 *    REGION_VIEW.maxZoom'u aşmaz. Kaydırma / tekerlek / sürükleme haritanın çerçevesine kilitli kalır (map-view.ts > clampMid); HUD payları
 *    çerçeveyi genişletmez (Harita 2 playtest 2026-10-25), kenar durakları veride HUD'dan kurtarılabilecek kadar içeride (tests/region-camera.test.ts).
 *  - Bölgenin kendi düğümleri ve aralarındaki yollar görünür. Komşu bölgenin, bölgeye BAĞLANAN düğümü silik (REGION_VIEW.ghostAlpha) ve o yol
 *    REGION_VIEW.ghostRoadAlpha saydamlıkla; üstüne gelince yol hafif sarı vurgulanır. Cepler (isteğe bağlı çıkmaz dal) komşu olarak gösterilmez.
 *  - Kilitli (henüz açılmamış) bölgenin düğümü gösterilmez: sis altındaki düğüm (görülmemiş) komşu olarak çizilmez.
 *  - Bölgenin dışındaki diğer düğüm / yollar çizilmez.
 *  - Uzak görünüm (odak yok; Ömer 2026-10-23): düğüm / yol çizilmez, yalnız bölge işaretleri + aralarındaki ana yol. Bölgeye dokunmak ya da
 *    yakınlaştırmak o bölgeye girer; bölgede en küçük yakınlaştırmadan da uzaklaşmak (ya da üst ortadaki bölge adı) uzak görünüme döner.
 *  - Görülmemiş bölge (Ömer 2026-10-23, open-questions 403): uzak görünümde işareti kilitli ve adsız (ad / durak sayısı yok, madalyonda kilit),
 *    dokununca girilmez. "Görülmüş" = bölgenin en az bir düğümü sis altında değil (fog.ts > nodeVisibility: current/cleared/near/far); haritanın
 *    başlangıç bölgesi her zaman görülmüş.
 *  - Bölgedeyken boş harita alanına dokunmak (düğüm / etiket / arayüz değil, sürükleme değil) uzak görünüme döner (isEmptyMapPoint).
 *  - Sis bulutları görünümden BAĞIMSIZ: her zaman bütün haritanın sis durumuyla yerleşir (odak değişince bulut ne kalkar ne kayar).
 */
import type { CampaignMap, MapEdge } from '../campaign/types';
import type { NodeVis } from '../campaign/fog';
import { clampMid, midLimits, type Bounds } from './map-view';

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
  /** Uzak görünüm (bölge haritası; mockup m.js > farSvg): bölge işaretinin yüksekliği (oyun birimi, ölçek 1), işaretler arası en az boşluk,
   *  imleç bir işarete / düğüme bu kadar yakınsa o bölge vurgulanır (dokunuş her yerde en yakın bölgeyi açar). Süreler data/ui-motion.json > mapRegion. */
  markerH: 64,
  markerGap: 14,
  hoverR: 150,
  /**
   * Üst HUD bandı (sahne birimi; playtest U1, Ömer 2026-10-23): Valor mangalları (sol üst) ve bölge adı (üst orta, y 100) haritanın üst
   * kenarındaki düğüm etiketlerini örtüyordu (Iron Pass). Bölgeye girerken takımın durağı bu bandın dışında açılır (regionCamera). Kamera
   * harita görselinin DIŞINA ÇIKMAZ (Harita 2 playtest 2026-10-25: pay kadar taşan kamera panellerin arkasında siyah gösteriyordu).
   */
  hudTop: 140,
  /** Üst bandın ortadaki kutusunun (harita adı + bölge adı) yarı genişliği (sahne birimi, telefonda COL_K ile çarpılır). */
  hudTopHalfW: 260,
} as const;

/**
 * HUD'un ekran kenarlarından kapladığı pay (sahne birimi): sol sütun (Your party + Gear / Formation; tam yükseklik), üst bant, sağ alt düğmeler.
 * `topHalfW` verilirse üst bant yalnız ekran ortasındaki harita adı + bölge adı kutusudur (yarı genişlik); `bottomW` verilirse alt bant yalnız sağ
 * alttaki düğme kümesidir (genişlik). Verilmezse bant tam genişlik (uzak görünüm işaretleri, sığdırma).
 */
export interface HudInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
  topHalfW?: number;
  bottomW?: number;
}

/** Durak rozetinin HUD'dan uzaklığı (sahne birimi): rozet yarıçapı + biraz. */
export const HUD_CLEAR_MARGIN = 40;

/**
 * Dünya noktası `p`, kamera ortası `mid` ve toplam yakınlaştırma `Z` iken ekranda HUD'un dışında mı (saf): ekranın içinde, sol sütunun sağında,
 * üst orta kutunun ve sağ alt düğme kümesinin dışında (`margin` sahne birimi pay ile).
 */
export function hudClear(p: Pt, mid: Pt, Z: number, view1: { w: number; h: number }, ins: HudInsets, margin: number = HUD_CLEAR_MARGIN): boolean {
  const sx = (p.x - mid.x) * Z + view1.w / 2;
  const sy = (p.y - mid.y) * Z + view1.h / 2;
  if (sx < ins.left + margin || sx > view1.w - ins.right - margin || sy < margin || sy > view1.h - margin) return false;
  const inTop = sy < ins.top + margin && (ins.topHalfW === undefined || Math.abs(sx - view1.w / 2) < ins.topHalfW + margin);
  const inBottom = sy > view1.h - ins.bottom - margin && (ins.bottomW === undefined || sx > view1.w - ins.bottomW - margin);
  return !inTop && !inBottom;
}

/**
 * `p`'yi HUD dışında gösteren, `want`'a en yakın kamera ortası (saf; çerçeveye kısılı, ızgara araması). Yoksa null. Kamera hiçbir zaman
 * çerçevenin (harita görseli) dışını göstermez.
 */
export function clearMid(p: Pt, want: Pt, Z: number, frame: Bounds, view1: { w: number; h: number }, ins: HudInsets, margin: number = HUD_CLEAR_MARGIN): Pt | null {
  const v = { w: view1.w / Z, h: view1.h / Z };
  const w0 = clampMid(want, frame, v);
  if (hudClear(p, w0, Z, view1, ins, margin)) return w0;
  const l = midLimits(frame, v);
  const N = 24;
  let best: Pt | null = null;
  let bd = Infinity;
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++) {
      const m = { x: l.minX + ((l.maxX - l.minX) * i) / N, y: l.minY + ((l.maxY - l.minY) * j) / N };
      if (!hudClear(p, m, Z, view1, ins, margin)) continue;
      const d = Math.hypot(m.x - w0.x, m.y - w0.y);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
  return best;
}

/** Kamera ortası `mid`, toplam yakınlaştırma `Z` iken HUD'sız güvenli alanın dünyadaki kutusu. `view1` = yakınlaştırma 1'de görünen alan. */
export function safeRect(mid: Pt, Z: number, view1: { w: number; h: number }, ins: HudInsets): Bounds {
  return {
    left: mid.x - view1.w / (2 * Z) + ins.left / Z,
    right: mid.x + view1.w / (2 * Z) - ins.right / Z,
    top: mid.y - view1.h / (2 * Z) + ins.top / Z,
    bottom: mid.y + view1.h / (2 * Z) - ins.bottom / Z,
  };
}

/**
 * Bölgeye girerken kamera (saf). `pts` = bölgenin düğümleri (dünya), `view1` = yakınlaştırma 1'de görünen alan (sahne birimi), `mapZoom` =
 * oyuncu yakınlaştırması, `focus` = takımın durağı (bölgedeyse). Taban yakınlaştırma regionZoom gibi (görseli kaplar, maxZoom'u aşmaz), ama
 * sığdırma HUD'sız güvenli alana göre; orta: düğüm kümesi güvenli alanın ortasına, takımın durağı güvenli alanın içine (kenardan `margin`), sonra
 * harita çerçevesine kısılır (görselin dışı hiç görünmez; HUD görselin üstünde durur) ve durak HUD dışında kalacak şekilde (clearMid) düzeltilir;
 * kenar durağı için gerekirse taban yakınlaştırma biraz artar. Dönen `z` taban yakınlaştırmadır (oyuncu yakınlaştırması hariç).
 */
export function regionCamera(o: { pts: Pt[]; frame: Bounds; view1: { w: number; h: number }; ins: HudInsets; mapZoom: number; focus?: Pt | null; pad?: number; margin?: number; maxZoom?: number }): { z: number; mid: Pt } {
  const pad = o.pad ?? REGION_VIEW.pad;
  const xs = o.pts.map((p) => p.x);
  const ys = o.pts.map((p) => p.y);
  const box: Bounds = { left: Math.min(...xs) - pad, right: Math.max(...xs) + pad, top: Math.min(...ys) - pad, bottom: Math.max(...ys) + pad };
  const safe1 = { w: Math.max(1, o.view1.w - o.ins.left - o.ins.right), h: Math.max(1, o.view1.h - o.ins.top - o.ins.bottom) };
  const maxZoom = o.maxZoom ?? REGION_VIEW.maxZoom;
  const z = regionZoomIn(box, safe1, o.view1, o.frame, maxZoom);
  const Z = z * o.mapZoom;
  const mid = { x: (box.left + box.right) / 2 - (o.ins.left - o.ins.right) / (2 * Z), y: (box.top + box.bottom) / 2 - (o.ins.top - o.ins.bottom) / (2 * Z) };
  const view = (zz: number) => ({ w: o.view1.w / (zz * o.mapZoom), h: o.view1.h / (zz * o.mapZoom) });
  if (!o.focus) return { z, mid: clampMid(mid, o.frame, view(z)) };
  const f = o.focus;
  const s = safeRect(mid, Z, o.view1, o.ins);
  const m = Math.min(o.margin ?? 70, (s.right - s.left) / 2, (s.bottom - s.top) / 2);
  if (f.x < s.left + m) mid.x -= s.left + m - f.x;
  else if (f.x > s.right - m) mid.x += f.x - (s.right - m);
  if (f.y < s.top + m) mid.y -= s.top + m - f.y;
  else if (f.y > s.bottom - m) mid.y += f.y - (s.bottom - m);
  // takımın durağı HUD dışında: çerçeve içinde en yakın orta; olmazsa (kenar durağı) biraz yakınlaşılır (en çok maxZoom)
  for (let zz = z; ; zz = Math.min(maxZoom, zz * 1.08)) {
    const c = clearMid(f, mid, zz * o.mapZoom, o.frame, o.view1, o.ins);
    if (c) return { z: zz, mid: c };
    if (zz >= maxZoom) break;
  }
  return { z, mid: clampMid(mid, o.frame, view(z)) };
}

/**
 * Uzak görünümde (bölge haritası) işaretlerin durabileceği dünya kutusu (saf; Harita 2 playtest 2026-10-25: bölge I işareti Your party
 * sütununun altında kalıyordu). Kamera bütün haritayı kaplar (`z`, orta çerçeveye kısılmış), kutu = görünen alanın HUD'sız kısmı ∩ çerçeve.
 */
export function overviewSafe(frame: Bounds, view1: { w: number; h: number }, z: number, ins: HudInsets): Bounds {
  const mid = clampMid({ x: (frame.left + frame.right) / 2, y: (frame.top + frame.bottom) / 2 }, frame, { w: view1.w / z, h: view1.h / z });
  const s = safeRect(mid, z, view1, ins);
  return { left: Math.max(frame.left, s.left), right: Math.min(frame.right, s.right), top: Math.max(frame.top, s.top), bottom: Math.min(frame.bottom, s.bottom) };
}

/** regionZoom'un güvenli alanlı hâli: sığdırma `fitView`'a, kaplama `view1`'e göre. */
function regionZoomIn(b: Bounds, fitView: { w: number; h: number }, view1: { w: number; h: number }, frame: Bounds, maxZoom: number): number {
  const fit = Math.min(fitView.w / Math.max(1, b.right - b.left), fitView.h / Math.max(1, b.bottom - b.top));
  const cover = Math.max(view1.w / Math.max(1, frame.right - frame.left), view1.h / Math.max(1, frame.bottom - frame.top));
  return Math.max(1, cover, Math.min(fit, maxZoom));
}

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
      if (!inn || !out || inn.optional || out.optional || inn.spoke || out.spoke) continue; // cep / hub kolu komşu sayılmaz
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

// ------------------------------------------------------------ uzak görünüm (bölge haritası; Ömer 2026-10-23, mockup maps-2-3.html > farSvg)

type Pt = { x: number; y: number };

/** Bölge başlığından ad ("I · The Borderlands" -> "The Borderlands"). */
export const regionName = (title: string): string => title.replace(/^[^·]*·\s*/, '').trim() || title;

/** Bölge işaretinin alt satırı (mockup: "8 stops · 1 boss"). */
export function regionSub(map: CampaignMap, region: string): string {
  const ns = map.nodes.filter((n) => n.region === region);
  const bosses = ns.filter((n) => n.type === 'boss').length;
  return `${ns.length} stop${ns.length === 1 ? '' : 's'}${bosses ? ` · ${bosses} boss` : ''}`;
}

/** Görülmüş bölgeler: en az bir düğümü sis altında değil; haritanın başlangıç bölgesi her zaman. `revealAll` (debug sis kapalı) hepsi. */
export function seenRegions(map: CampaignMap, vis: Record<string, NodeVis>, revealAll = false): Set<string> {
  if (revealAll) return new Set(map.regions.map((r) => r.id));
  const out = new Set<string>();
  const start = map.nodes.find((n) => n.id === map.start);
  if (start) out.add(start.region);
  for (const n of map.nodes) if (seen(vis[n.id])) out.add(n.region);
  return out;
}

/** Kilitli (görülmemiş) bölge işaretinin ölçek 1'deki genişliği: yalnız madalyon. */
export const LOCKED_MARKER_W = 72;

/**
 * Bölge görünümünde boş alan mı: düğümün dokunma çemberi (`r`) ya da ad etiketi kutusu (`box`, dünya; `pad` kadar genişletilir) içinde değilse
 * boş. Boş alana dokunmak uzak görünüme döner (Ömer 2026-10-23).
 */
export function isEmptyMapPoint(x: number, y: number, spots: Array<{ x: number; y: number; r: number; box?: { x0: number; y0: number; w: number; h: number } }>, pad = 10): boolean {
  for (const s of spots) {
    if (Math.hypot(x - s.x, y - s.y) <= s.r) return false;
    const b = s.box;
    if (b && x >= b.x0 - pad && x <= b.x0 + b.w + pad && y >= b.y0 - pad && y <= b.y0 + b.h + pad) return false;
  }
  return true;
}

export interface OverviewMarker {
  id: string;
  /** Görülmemiş bölge: ad / alt satır boş, kilitli çizilir, dokununca girilmez. */
  locked: boolean;
  name: string;
  sub: string;
  /** Orta nokta (dünya). */
  x: number;
  y: number;
  /** Ölçekli genişlik / yükseklik (dünya). */
  w: number;
  h: number;
}

/**
 * Bölge işaretlerinin yeri: bölgenin `label` noktası (veri; yoksa düğümlerinin ortası), çerçeve içinde; çakışanlar en az kayacak eksende
 * ayrılır (mockup farLayout). `width(id)`: işaretin ölçek 1'deki genişliği; `scale`: dokunmatik büyütme; `size`: harita dünya boyu (pos 0-1 çarpanı).
 */
export function overviewMarkers(
  map: CampaignMap,
  P: (id: string) => Pt,
  width: (id: string) => number,
  frame: Bounds,
  scale = 1,
  size = { W: 1920, H: 1080 },
  /** Görülmüş bölgeler (seenRegions); verilmezse hepsi görülmüş sayılır. Kilitli işaret adsız ve dar (LOCKED_MARKER_W). */
  seenSet?: ReadonlySet<string>,
): OverviewMarker[] {
  const h = REGION_VIEW.markerH * scale;
  const out: OverviewMarker[] = map.regions.map((r) => {
    const ns = map.nodes.filter((n) => n.region === r.id).map((n) => P(n.id));
    const c = r.label
      ? { x: r.label[0] * size.W, y: r.label[1] * size.H }
      : ns.length
        ? { x: ns.reduce((a, p) => a + p.x, 0) / ns.length, y: ns.reduce((a, p) => a + p.y, 0) / ns.length }
        : { x: size.W / 2, y: size.H / 2 };
    const locked = !!seenSet && !seenSet.has(r.id);
    if (locked) return { id: r.id, locked, name: '', sub: '', x: c.x, y: c.y, w: LOCKED_MARKER_W * scale, h };
    return { id: r.id, locked, name: regionName(r.title), sub: regionSub(map, r.id), x: c.x, y: c.y, w: width(r.id) * scale, h };
  });
  const keep = (m: OverviewMarker) => {
    m.x = Math.max(frame.left + m.w / 2 + 8, Math.min(frame.right - m.w / 2 - 8, m.x));
    m.y = Math.max(frame.top + m.h / 2 + 8, Math.min(frame.bottom - m.h / 2 - 8, m.y));
  };
  out.forEach(keep);
  const gap = REGION_VIEW.markerGap;
  for (let it = 0; it < 80; it++) {
    let any = false;
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!;
        const b = out[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = (a.w + b.w) / 2 + gap - Math.abs(dx);
        const oy = (a.h + b.h) / 2 + gap - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        any = true;
        if (oy <= ox) {
          const m = (oy / 2 + 0.5) * (dy >= 0 ? 1 : -1);
          a.y -= m;
          b.y += m;
        } else {
          const m = (ox / 2 + 0.5) * (dx >= 0 ? 1 : -1);
          a.x -= m;
          b.x += m;
        }
      }
    out.forEach(keep);
    if (!any) break;
  }
  return out;
}

/** İki işaret kutusu çakışıyor mu. */
export const markersOverlap = (a: OverviewMarker, b: OverviewMarker): boolean => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

/**
 * Uzak görünümde bir dünya noktası hangi bölgeye ait: önce işaret kutusu, sonra en yakın düğüm / işaret. `near` verilirse en yakını bu mesafeden
 * uzaksa null (fare vurgusu); verilmezse her nokta bir bölge açar (dokunma: ölü alan yok).
 */
export function regionAt(map: CampaignMap, markers: OverviewMarker[], P: (id: string) => Pt, x: number, y: number, near?: number): string | null {
  for (const m of markers) if (Math.abs(x - m.x) <= m.w / 2 && Math.abs(y - m.y) <= m.h / 2) return m.id;
  let best: string | null = null;
  let bd = Infinity;
  for (const n of map.nodes) {
    const p = P(n.id);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = n.region;
    }
  }
  for (const m of markers) {
    const d = Math.hypot(Math.max(0, Math.abs(x - m.x) - m.w / 2), Math.max(0, Math.abs(y - m.y) - m.h / 2));
    if (d < bd) {
      bd = d;
      best = m.id;
    }
  }
  return near !== undefined && bd > near ? null : best;
}

/** Ana yol (işaretten işarete, veri sırasıyla): her parça tek yumuşak kavis (orta sapma uzunluğun %12'si, yön sırayla değişir). */
export function overviewRoad(markers: OverviewMarker[]): Array<{ a: Pt; c: Pt; b: Pt }> {
  const out: Array<{ a: Pt; c: Pt; b: Pt }> = [];
  for (let i = 1; i < markers.length; i++) {
    const a = markers[i - 1]!;
    const b = markers[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const o = d * 0.12 * (i % 2 ? 1 : -1);
    out.push({ a: { x: a.x, y: a.y }, c: { x: (a.x + b.x) / 2 - (dy / d) * o, y: (a.y + b.y) / 2 + (dx / d) * o }, b: { x: b.x, y: b.y } });
  }
  return out;
}
