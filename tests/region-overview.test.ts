// Sefer haritası uzak görünümü (bölge haritası; Ömer 2026-10-23, mockup public/mockups/maps-2-3.html): bölge işaretleri, bölge seçimi,
// ana yol ve sisin görünümden bağımsız kalması (src/game/region-view.ts, src/game/scenes/CampaignMapScene.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getMap, newCampaign, node, nodeVisibility } from '../src/campaign';
import { LOCKED_MARKER_W, isEmptyMapPoint, markersOverlap, overviewMarkers, seenRegions, overviewRoad, regionAt, regionName, regionSub } from '../src/game/region-view';
import motion from '../data/ui-motion.json';

const map = getMap('valdoria');
const P = (id: string) => ({ x: node(map, id).pos[0] * 1920, y: node(map, id).pos[1] * 1080 });
const frame = { left: 0, right: 1920, top: 0, bottom: 1080 };

describe('uzak görünüm: bölge işaretleri', () => {
  it('her bölgenin bir işareti var, adı başlıktan, alt satırı durak / boss sayısı', () => {
    const ms = overviewMarkers(map, P, () => 300, frame);
    expect(ms.map((m) => m.id)).toEqual(map.regions.map((r) => r.id));
    expect(regionName('I · The Borderlands')).toBe('The Borderlands');
    for (const r of map.regions) {
      const n = map.nodes.filter((x) => x.region === r.id);
      expect(regionSub(map, r.id)).toContain(`${n.length} stops`);
      expect(regionSub(map, r.id).includes('boss')).toBe(n.some((x) => x.type === 'boss'));
    }
  });

  it('işaretler çakışmaz ve çerçeve içinde kalır (telefon ölçeği dahil)', () => {
    for (const scale of [1, 1.45, 2]) {
      const ms = overviewMarkers(map, P, () => 320, frame, scale);
      for (const m of ms) {
        expect(m.x - m.w / 2).toBeGreaterThanOrEqual(frame.left);
        expect(m.x + m.w / 2).toBeLessThanOrEqual(frame.right);
        expect(m.y - m.h / 2).toBeGreaterThanOrEqual(frame.top);
        expect(m.y + m.h / 2).toBeLessThanOrEqual(frame.bottom);
      }
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) expect(markersOverlap(ms[i]!, ms[j]!)).toBe(false);
    }
  });

  it('dokunuş: işaret kutusu o bölge; başka her nokta en yakın bölge (ölü alan yok); fare vurgusu yalnız yakında', () => {
    const ms = overviewMarkers(map, P, () => 300, frame);
    for (const m of ms) expect(regionAt(map, ms, P, m.x, m.y)).toBe(m.id);
    for (const n of map.nodes) {
      const p = P(n.id);
      expect(regionAt(map, ms, P, p.x, p.y)).toBe(n.region);
    }
    for (const [x, y] of [[0, 0], [1920, 1080], [960, 1079]] as const) expect(regionAt(map, ms, P, x, y)).not.toBeNull();
    expect(regionAt(map, ms, P, -5000, -5000, 150)).toBeNull();
  });

  it('ana yol bölgeleri veri sırasıyla bağlar', () => {
    const ms = overviewMarkers(map, P, () => 300, frame);
    const road = overviewRoad(ms);
    expect(road).toHaveLength(ms.length - 1);
    road.forEach((s, i) => {
      expect(s.a).toEqual({ x: ms[i]!.x, y: ms[i]!.y });
      expect(s.b).toEqual({ x: ms[i + 1]!.x, y: ms[i + 1]!.y });
    });
  });

  it('geçiş süreleri tek yerde (data/ui-motion.json > mapRegion)', () => {
    for (const k of ['moveMs', 'fadeOutMs', 'fadeInMs', 'hoverMs', 'lift'] as const) expect(motion.mapRegion[k]).toBeGreaterThan(0);
  });
});

describe('uzak görünüm: görülmemiş bölge kilitli ve adsız (Ömer 2026-10-23, open-questions 403)', () => {
  const s0 = newCampaign({ mode: 'normal', seed: 1 });
  const startRegion = node(map, map.start).region;
  it('görülmüş = en az bir düğümü sis altında değil; başlangıç bölgesi hep görülmüş; sis kapalıyken hepsi', () => {
    const vis = nodeVisibility(map, s0);
    const seen = seenRegions(map, vis);
    expect(seen.has(startRegion)).toBe(true);
    for (const r of map.regions) {
      const any = map.nodes.some((n) => n.region === r.id && ['current', 'cleared', 'near', 'far'].includes(vis[n.id]!));
      expect(seen.has(r.id)).toBe(any || r.id === startRegion);
    }
    expect(seen.size).toBeLessThan(map.regions.length); // başta en az bir bölge kilitli
    expect(seenRegions(map, vis, true).size).toBe(map.regions.length);
    // her şey sis altında olsa da başlangıç bölgesi görülmüş
    const allFog = Object.fromEntries(map.nodes.map((n) => [n.id, 'fog' as const]));
    expect([...seenRegions(map, allFog)]).toEqual([startRegion]);
  });

  it('kilitli işaret: ad ve durak satırı yok, dar (yalnız madalyon); görülmüş işaret aynen', () => {
    const seen = seenRegions(map, nodeVisibility(map, s0));
    const ms = overviewMarkers(map, P, () => 300, frame, 1, { W: 1920, H: 1080 }, seen);
    for (const m of ms) {
      expect(m.locked).toBe(!seen.has(m.id));
      if (m.locked) {
        expect(m.name).toBe('');
        expect(m.sub).toBe('');
        expect(m.w).toBe(LOCKED_MARKER_W);
      } else expect(m.name.length).toBeGreaterThan(0);
    }
    expect(overviewMarkers(map, P, () => 300, frame).every((m) => !m.locked)).toBe(true);
  });
});

describe('bölge görünümü: boş alana dokunmak uzak görünüme döner', () => {
  it('düğüm çemberi ve etiket kutusu boş değil; dışı boş', () => {
    const spots = [{ x: 100, y: 100, r: 60, box: { x0: 170, y0: 80, w: 200, h: 40 } }];
    expect(isEmptyMapPoint(100, 100, spots)).toBe(false);
    expect(isEmptyMapPoint(150, 120, spots)).toBe(false);
    expect(isEmptyMapPoint(300, 100, spots)).toBe(false); // ad şeridi
    expect(isEmptyMapPoint(375, 100, spots)).toBe(false); // şerit payı
    expect(isEmptyMapPoint(600, 600, spots)).toBe(true);
    expect(isEmptyMapPoint(5, 5, [])).toBe(true);
  });
  const src = readFileSync('src/game/scenes/CampaignMapScene.ts', 'utf8');
  it('sahne: boş dokunuş yalnız bölgede, sürüklemede / yürürken değil; ipucu açıksa önce o kapanır; kilitli bölgeye girilmez', () => {
    const body = src.slice(src.indexOf('private bindEmptyTap'), src.indexOf('private lockedMarker'));
    expect(body).toContain('this.focus === null');
    expect(body).toContain('this.inputBusy()'); // yürüyüş, pencere, menü, kasaba
    expect(body).toContain('this.drag.moved');
    expect(body).toContain('if (this.nodeTip) return this.hideNodeTip()');
    expect(body).toContain('this.switchFocus(null)');
    expect(src).toContain("this.toast('Not yet discovered')");
    expect(src.indexOf('this.bindEmptyTap()')).toBeLessThan(src.indexOf('this.dyn = this.add.container(0, 0)')); // düğüm katmanının altında
  });
});

describe('harita sahnesi: sis görünümden bağımsız, bölge düğmesi yok', () => {
  const src = readFileSync('src/game/scenes/CampaignMapScene.ts', 'utf8');
  it('bulutlar her zaman bütün haritanın sis durumuyla yerleşir (odak süzgeci yok)', () => {
    expect(src).toContain('this.updateClouds(vis, animateFog)');
    expect(src).not.toMatch(/updateClouds\(rv \?/);
    expect(src).toContain('this.planLabels(vis, options)');
  });
  it('sağ alttaki bölge görünümü düğmesi ve tercihi kaldırıldı', () => {
    expect(src).not.toContain('cmap-region-icon');
    expect(src).not.toContain('regionBtn');
    expect(src).not.toContain('proto.mapRegionView');
  });
});
