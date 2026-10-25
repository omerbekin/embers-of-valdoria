// Bölge kamerası HUD payları (Harita 2 playtest 2026-10-25): dr1 "The Long Stair" telefonda Your party sütununun altında kalıyordu.
// Her haritanın her bölgesinde: girişte takımın durağı HUD'sız güvenli alanda; her durak kaydırılarak güvenli alana getirilebilir.
import { describe, expect, it } from 'vitest';
import { getMap } from '../src/campaign';
import { clampMid } from '../src/game/map-view';
import { REGION_VIEW, insetFrame, markersOverlap, regionAt, overviewMarkers, overviewSafe, regionCamera, regionName, regionSub, regionZoom, safeRect, type HudInsets } from '../src/game/region-view';

const W = 1920;
const H = 1080;
const frame = { left: 0, right: W, top: 0, bottom: H };
// CampaignMapScene > hudInsets ile aynı: sol sütun (36 + 360) x COL_K (telefon 1,45), üst bant, alt düğme şeridi (36 + touchUnits(56) + 12)
// markerScale: renderOverview ile aynı (telefonda COL_K 1,45)
const SCREENS: Array<{ name: string; view1: { w: number; h: number }; ins: HudInsets; mapZoom: number; markerScale: number }> = [
  { name: 'phone 800x372', view1: { w: (H * 800) / 372, h: H }, ins: { left: 396 * 1.45, top: REGION_VIEW.hudTop, right: 0, bottom: 36 + 128 + 12 }, mapZoom: 1.2, markerScale: 1.45 },
  { name: 'phone 800x491', view1: { w: (H * 800) / 491, h: H }, ins: { left: 396 * 1.45, top: REGION_VIEW.hudTop, right: 0, bottom: 36 + 97 + 12 }, mapZoom: 1.2, markerScale: 1.45 },
  { name: 'desktop 16:9', view1: { w: W, h: H }, ins: { left: 396, top: REGION_VIEW.hudTop, right: 0, bottom: 36 + 56 + 12 }, mapZoom: 1, markerScale: 1 },
];
const inside = (p: { x: number; y: number }, b: { left: number; right: number; top: number; bottom: number }) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;

describe('bölge kamerası: duraklar HUD altında kalmaz', () => {
  for (const mapId of ['valdoria', 'drowned-reach']) {
    const map = getMap(mapId);
    const P = (id: string) => {
      const n = map.nodes.find((x) => x.id === id)!;
      return { x: n.pos[0] * W, y: n.pos[1] * H };
    };
    for (const sc of SCREENS)
      it(`${mapId} · ${sc.name}`, () => {
        for (const r of map.regions) {
          const nodes = map.nodes.filter((n) => n.region === r.id);
          const pts = nodes.map((n) => P(n.id));
          // girişte takım bölgenin her durağında olabilir: o durak güvenli alanda
          for (const n of nodes) {
            const cam = regionCamera({ pts, frame, view1: sc.view1, ins: sc.ins, mapZoom: sc.mapZoom, focus: P(n.id) });
            const Z = cam.z * sc.mapZoom;
            expect(inside(P(n.id), safeRect(cam.mid, Z, sc.view1, sc.ins)), `${r.id} ${n.id} entry`).toBe(true);
            // kaydırma çerçevesi her durağı güvenli alanın ortasına getirebilir (clampMid kısmaz)
            const pf = insetFrame(frame, r.id, Z, sc.ins);
            const want = { x: P(n.id).x + (sc.view1.w / 2 - (sc.ins.left + (sc.view1.w - sc.ins.right)) / 2) / Z, y: P(n.id).y + (sc.view1.h / 2 - (sc.ins.top + (sc.view1.h - sc.ins.bottom)) / 2) / Z };
            const got = clampMid(want, pf, { w: sc.view1.w / Z, h: sc.view1.h / Z });
            expect(inside(P(n.id), safeRect(got, Z, sc.view1, sc.ins)), `${r.id} ${n.id} pan`).toBe(true);
          }
        }
      });
  }

  it('Harita 2 başlangıcı: The Long Stair telefonda sol sütunun sağında', () => {
    const map = getMap('drowned-reach');
    const sc = SCREENS[0]!;
    const pts = map.nodes.filter((n) => n.region === 'I').map((n) => ({ x: n.pos[0] * W, y: n.pos[1] * H }));
    const dr1 = { x: map.nodes[0]!.pos[0] * W, y: map.nodes[0]!.pos[1] * H };
    const cam = regionCamera({ pts, frame, view1: sc.view1, ins: sc.ins, mapZoom: sc.mapZoom, focus: dr1 });
    const Z = cam.z * sc.mapZoom;
    const screenX = (dr1.x - cam.mid.x) * Z + sc.view1.w / 2;
    expect(screenX).toBeGreaterThan(sc.ins.left + 60);
  });

  it('uzak görünümde çerçeve aynen; payların dünya karşılığı yakınlaştırmaya bölünür', () => {
    const ins = { left: 400, top: 140, right: 0, bottom: 100 };
    expect(insetFrame(frame, null, 2, ins)).toEqual(frame);
    expect(insetFrame(frame, 'I', 2, ins)).toEqual({ left: -200, right: W, top: -70, bottom: H + 50 });
  });

  // Uzak görünüm (bölge haritası): her işaret (etiketiyle) HUD'sız güvenli alanda ve işaretler üst üste binmez
  for (const mapId of ['valdoria', 'drowned-reach']) {
    const map = getMap(mapId);
    for (const sc of SCREENS)
      it(`uzak görünüm ${mapId} · ${sc.name}`, () => {
        const z = regionZoom(frame, sc.view1, frame, 1);
        const safe = overviewSafe(frame, sc.view1, z, sc.ins);
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
