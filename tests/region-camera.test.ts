// Bölge kamerası ve HUD (Harita 2 playtest 2026-10-25):
//  - dr1 "The Long Stair" telefonda Your party sütununun altında kalıyordu -> girişte takımın durağı HUD dışında açılır.
//  - HUD payı kadar harita dışına taşan kamera panellerin arkasında siyah gösteriyordu -> kamera HİÇBİR görünümde harita görselinin dışını
//    göstermez; HUD görselin üstünde durur (Harita 1 gibi). Kenar durakları kaydırma / yakınlaştırma ile HUD dışına getirilebilir.
import { describe, expect, it } from 'vitest';
import { getMap } from '../src/campaign';
import { MAP_ZOOM, clampMid } from '../src/game/map-view';
import { placeArt, FULL_REGION } from '../src/game/wide-map';
import { REGION_VIEW, clearMid, hudClear, markersOverlap, regionAt, overviewMarkers, overviewSafe, regionCamera, regionName, regionSub, regionZoom, type HudInsets } from '../src/game/region-view';

const W = 1920;
const H = 1080;
// CampaignMapScene > hudInsets ile aynı: sol sütun (36 + 360) x COL_K (telefon 1,45), üst orta kutu (hudTopHalfW x k), sağ alt düğme kümesi
// (36 + 3 x touchUnits(56) + 2 x 8; yükseklik 36 + touchUnits(56) + 12). markerScale: renderOverview ile aynı (telefonda COL_K 1,45).
const screen = (name: string, cw: number, ch: number, phone: boolean, size: number) => {
  const k = phone ? 1.45 : 1;
  const ins: HudInsets = { left: 396 * k, top: REGION_VIEW.hudTop, right: 0, bottom: 36 + size + 12, topHalfW: REGION_VIEW.hudTopHalfW * k, bottomW: 36 + 3 * size + 16 };
  return { name, view1: { w: (H * cw) / ch, h: H }, ins, mapZoom: phone ? 1.2 : 1, markerScale: k };
};
const SCREENS = [
  screen('phone 800x372', 800, 372, true, 128),
  screen('phone 844x390', 844, 390, true, 128),
  screen('phone 800x491', 800, 491, true, 97),
  screen('desktop 1920x1080', 1920, 1080, false, 56),
  screen('wide 2000x837', 2000, 837, false, 56),
  screen('wide 2580x1080', 2580, 1080, false, 56),
];
// sahne > drawTerrain: görselin dünyadaki kapsamı (geniş görsel varsa onunla). Görsel boyutları assets/campaign/*.webp.
const ART: Record<string, [number, number]> = { 'valdoria-bg-wide': [2195, 941], 'valdoria-bg': [1672, 941], 'drowned-reach-bg': [1672, 941] };
const frameOf = (mapId: string) => {
  const map = getMap(mapId);
  const wide = map.backgroundWide;
  const [iw, ih] = ART[wide ? wide.image : map.background]!;
  const p = placeArt(iw, ih, wide ? wide.region : FULL_REGION, { x: 0, y: 0, w: W, h: H });
  return { left: Math.min(0, p.left), right: Math.max(W, p.right), top: Math.min(0, p.top), bottom: Math.max(H, p.bottom) };
};
const visible = (mid: { x: number; y: number }, Z: number, view1: { w: number; h: number }) => ({ left: mid.x - view1.w / (2 * Z), right: mid.x + view1.w / (2 * Z), top: mid.y - view1.h / (2 * Z), bottom: mid.y + view1.h / (2 * Z) });
const within = (v: ReturnType<typeof visible>, f: ReturnType<typeof frameOf>) => v.left >= f.left - 0.5 && v.right <= f.right + 0.5 && v.top >= f.top - 0.5 && v.bottom <= f.bottom + 0.5;

describe('bölge kamerası: harita dışı görünmez, duraklar HUD altında kalmaz', () => {
  for (const mapId of ['valdoria', 'drowned-reach']) {
    const map = getMap(mapId);
    const frame = frameOf(mapId);
    const P = (id: string) => {
      const n = map.nodes.find((x) => x.id === id)!;
      return { x: n.pos[0] * W, y: n.pos[1] * H };
    };
    for (const sc of SCREENS)
      it(`${mapId} · ${sc.name}`, () => {
        for (const r of map.regions) {
          const nodes = map.nodes.filter((n) => n.region === r.id);
          const pts = nodes.map((n) => P(n.id));
          // odaksız giriş (takım başka bölgede): görsel dışı yok
          const free = regionCamera({ pts, frame, view1: sc.view1, ins: sc.ins, mapZoom: sc.mapZoom });
          expect(within(visible(free.mid, free.z * sc.mapZoom, sc.view1), frame), `${r.id} free`).toBe(true);
          const Zmax = free.z * MAP_ZOOM.max;
          for (const n of nodes) {
            // girişte takım bu duraktaysa: durak HUD dışında ve görsel dışı görünmez
            const cam = regionCamera({ pts, frame, view1: sc.view1, ins: sc.ins, mapZoom: sc.mapZoom, focus: P(n.id) });
            const Z = cam.z * sc.mapZoom;
            expect(within(visible(cam.mid, Z, sc.view1), frame), `${r.id} ${n.id} entry in frame`).toBe(true);
            expect(hudClear(P(n.id), cam.mid, Z, sc.view1, sc.ins), `${r.id} ${n.id} entry clear`).toBe(true);
            // takım başka duraktayken bu durak kaydırma (+ en çok MAP_ZOOM.max yakınlaştırma) ile HUD dışına getirilebilir. Telefonda sol sütun
            // ekranın ~%25'i: kenar durakları (Harita 1 hoard, Harita 2 dr1-dr3, dr75-dr77) yalnız takım oradayken (giriş yakınlaşması) tam açık.
            if (sc.markerScale !== 1) continue;
            const got = clearMid(P(n.id), free.mid, Zmax, frame, sc.view1, sc.ins);
            expect(got, `${r.id} ${n.id} reachable`).not.toBeNull();
            expect(within(visible(got!, Zmax, sc.view1), frame), `${r.id} ${n.id} reach in frame`).toBe(true);
          }
        }
        // uzak görünüm: bütün harita, görsel dışı yok
        const z = regionZoom(frame, sc.view1, frame, 1);
        const mid = clampMid({ x: W / 2, y: H / 2 }, frame, { w: sc.view1.w / z, h: sc.view1.h / z });
        expect(within(visible(mid, z, sc.view1), frame), 'overview').toBe(true);
      });
  }

  it('Harita 2 başlangıcı: The Long Stair telefonda ve geniş pencerede sol sütunun sağında, görsel dışı yok', () => {
    const map = getMap('drowned-reach');
    const frame = frameOf('drowned-reach');
    const pts = map.nodes.filter((n) => n.region === 'I').map((n) => ({ x: n.pos[0] * W, y: n.pos[1] * H }));
    const dr1 = { x: map.nodes[0]!.pos[0] * W, y: map.nodes[0]!.pos[1] * H };
    for (const sc of [SCREENS[0]!, SCREENS[4]!]) {
      const cam = regionCamera({ pts, frame, view1: sc.view1, ins: sc.ins, mapZoom: sc.mapZoom, focus: dr1 });
      const Z = cam.z * sc.mapZoom;
      expect((dr1.x - cam.mid.x) * Z + sc.view1.w / 2).toBeGreaterThan(sc.ins.left + 30);
      const v = visible(cam.mid, Z, sc.view1);
      expect(v.left).toBeGreaterThanOrEqual(-0.5);
      expect(v.top).toBeGreaterThanOrEqual(-0.5);
    }
  });

  it('hudClear: sol sütun tam yükseklik, üst bant yalnız ortada, alt bant yalnız sağda', () => {
    const view1 = { w: 1920, h: 1080 };
    const ins: HudInsets = { left: 400, top: 140, right: 0, bottom: 100, topHalfW: 260, bottomW: 220 };
    const at = (sx: number, sy: number) => hudClear({ x: sx, y: sy }, { x: 960, y: 540 }, 1, view1, ins);
    expect(at(300, 540)).toBe(false);
    expect(at(960, 80)).toBe(false);
    expect(at(1500, 80)).toBe(true);
    expect(at(1800, 990)).toBe(false);
    expect(at(1000, 1000)).toBe(true);
    expect(at(1000, 540)).toBe(true);
  });

  // Uzak görünüm (bölge haritası): her işaret (etiketiyle) HUD'sız güvenli alanda ve işaretler üst üste binmez
  for (const mapId of ['valdoria', 'drowned-reach']) {
    const map = getMap(mapId);
    const frame = { left: 0, right: W, top: 0, bottom: H };
    for (const sc of SCREENS)
      it(`uzak görünüm ${mapId} · ${sc.name}`, () => {
        const z = regionZoom(frame, sc.view1, frame, 1);
        const ins = { left: sc.ins.left, top: sc.ins.top, right: sc.ins.right, bottom: sc.ins.bottom };
        const safe = overviewSafe(frame, sc.view1, z, ins);
        // renderOverview genişliği: 30x2 + 16 + max(ad, alt satır) + 26; yazı genişliği kabaca (ad 22 px büyük harf, alt satır 17 px)
        const width = (id: string) => {
          const r = map.regions.find((x) => x.id === id)!;
          return 60 + 16 + Math.max(regionName(r.title).length * 16, regionSub(map, id).length * 9) + 26;
        };
        const P = (id: string) => {
          const n = map.nodes.find((x) => x.id === id)!;
          return { x: n.pos[0] * W, y: n.pos[1] * H };
        };
        const ms = overviewMarkers(map, P, width, safe, sc.markerScale, { W, H });
        for (const m of ms) {
          expect(m.x - m.w / 2, `${m.id} left`).toBeGreaterThanOrEqual(safe.left);
          expect(m.x + m.w / 2, `${m.id} right`).toBeLessThanOrEqual(safe.right);
          expect(m.y - m.h / 2, `${m.id} top`).toBeGreaterThanOrEqual(safe.top);
          expect(m.y + m.h / 2, `${m.id} bottom`).toBeLessThanOrEqual(safe.bottom);
        }
        for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) expect(markersOverlap(ms[i]!, ms[j]!), `${ms[i]!.id}-${ms[j]!.id}`).toBe(false);
        // dokunma = çizim: işaretin (madalyon, ad, alt satır) her yerine dokunuş o bölgeyi seçer (sahne: renderOverview > pick = regionAt)
        for (const m of ms)
          for (const [fx, fy] of [[0, 0], [-0.45, 0], [0.45, 0], [-0.45, -0.4], [0.3, 0.4]] as const)
            expect(regionAt(map, ms, P, m.x + fx * m.w, m.y + fy * m.h), `${m.id} @${fx},${fy}`).toBe(m.id);
      });
  }
});
