import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  autoResolve,
  completeSimple,
  completeStory,
  debugTeleport,
  getMap,
  hotspotAt,
  hotspotOffered,
  hotspotRect,
  newCampaign,
  nextStep,
  partySpots,
  recruitInTown,
  recruitOffer,
  revisitNode,
  storyHeard,
  townCover,
  townRecruitOffer,
  townScene,
  townScreenNode,
  type CampaignState,
  type TownAction,
} from '../src/campaign';

// Kasaba ekranı (Ömer 2026-10-12, future-ideas "SIRADA" (1)): eski kasaba penceresi (Formation / Gear / Trade / Leave) yerine tam ekran kasaba,
// resimdeki yerler (valdoria.json > nodes[].scene). Kurallar ve geometri src/campaign/town.ts, çizim src/game/town-screen.ts.

const base = (): CampaignState => newCampaign({ mode: 'normal', seed: 4242 });

function at(target: string, until: string): CampaignState {
  let s = debugTeleport(base(), target);
  for (let i = 0; i < 20 && nextStep(s).kind !== until; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe(until);
  return s;
}

const map = getMap('valdoria');
const towns = map.nodes.filter((n) => n.type === 'town');
const ACTIONS: TownAction[] = ['trade', 'recruit', 'story', 'rest', 'leave'];

describe('town scene data (valdoria.json > scene)', () => {
  it('every town has a scene with one place per action, rects inside the picture and not overlapping', () => {
    expect(towns.map((n) => n.id).sort()).toEqual(['4', '7']);
    for (const n of towns) {
      const def = townScene(n);
      expect(def, `${n.name}: scene yok`).not.toBeNull();
      expect(def!.hotspots.map((h) => h.action).sort()).toEqual([...ACTIONS].sort());
      expect(new Set(def!.hotspots.map((h) => h.id)).size).toBe(def!.hotspots.length);
      for (const h of def!.hotspots) {
        const [x0, y0, x1, y1] = h.rect;
        expect(x0 >= 0 && y0 >= 0 && x1 <= 1 && y1 <= 1 && x0 < x1 && y0 < y1, `${n.name} ${h.id}: ${h.rect}`).toBe(true);
        expect(h.label.length).toBeGreaterThan(0);
      }
      const rs = def!.hotspots;
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i]!.rect;
          const b = rs[j]!.rect;
          const overlap = Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0.001 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0.001;
          expect(overlap, `${n.name}: ${rs[i]!.id} / ${rs[j]!.id} üst üste`).toBe(false);
        }
    }
  });

  it('backgrounds are optimized webp game assets with their sources in assets/source/backgrounds-v2', () => {
    const onDisk = readdirSync('assets/towns');
    for (const n of towns) {
      const bg = townScene(n)!.background;
      expect(onDisk, `${bg}.webp yok`).toContain(`${bg}.webp`);
      expect(existsSync(`assets/source/backgrounds-v2/${bg}.png`), `${bg}.png aslı yok`).toBe(true);
    }
    // Bağlantısız dosya kalmasın: assets/towns altındaki her görsel bir kasabanın arka planı
    const used = new Set(towns.map((n) => `${townScene(n)!.background}.webp`));
    for (const f of onDisk) expect(used.has(f), `${f} bağlantısız`).toBe(true);
  });

  it('Odo trades and the story NPC appear only in towns that have them; texts and layout are data', () => {
    for (const n of towns) for (const h of townScene(n)!.hotspots) {
      if (h.action === 'trade') expect(hotspotOffered(n, h)).toBe(!!n.merchant);
      else if (h.action === 'story') expect(hotspotOffered(n, h)).toBe(!!n.story);
      else expect(hotspotOffered(n, h)).toBe(true);
    }
    expect(CONFIG.texts.townRested).toMatch(/fallen stay down/); // TUR 1 madde 10: dinlenme diriltmez
    expect(CONFIG.texts.townRecruit).toBeTruthy();
    expect(CONFIG.townScreen.heroHeight).toBeGreaterThan(0);
  });

  it('a town story plays once: after it is heard the NPC (Charcoal Burner, Keep Commander) leaves the town screen, also in old saves', () => {
    for (const id of ['4', '7']) {
      const n = map.nodes.find((x) => x.id === id)!;
      const npc = townScene(n)!.hotspots.find((h) => h.action === 'story')!;
      const before = at(id, 'story');
      expect(storyHeard(before, n)).toBe(false);
      expect(hotspotOffered(n, npc, before)).toBe(true); // hikâye adımı sırasında NPC duruyor
      const after = completeStory(before);
      expect(nextStep(after).kind).not.toBe('story');
      expect(storyHeard(after, n)).toBe(true);
      expect(hotspotOffered(n, npc, after)).toBe(false);
      // kasabadan çıkıp yeniden girince (revisit) de dönmez; hikâye adımı yeniden açılmaz (ödül ikinci kez alınamaz)
      const left = completeSimple(after, 'town');
      const back = revisitNode(left);
      expect(nextStep(back).kind).not.toBe('story');
      expect(hotspotOffered(n, npc, back)).toBe(false);
      expect(() => completeStory(back)).toThrow();
      // eski kayıt: hikâye kaydı yok ama kasaba adımı bitmiş -> dinlenmiş sayılır
      const legacy = { ...left, done: left.done.filter((d) => d !== `${id}:story`) };
      expect(storyHeard(legacy, n)).toBe(true);
      expect(hotspotOffered(n, npc, legacy)).toBe(false);
    }
  });
});

describe('town screen geometry (cover + percentage hotspots)', () => {
  const img = { w: 1536, h: 1024 };

  it('the picture covers the visible stage on 16:9, ultrawide and phone landscape (no gaps)', () => {
    for (const view of [
      { x: 0, y: 0, w: 1920, h: 1080 },
      { x: -330, y: 0, w: 2580, h: 1080 },
      { x: -208, y: 0, w: 2337, h: 1080 },
    ]) {
      const c = townCover(img, view, 0.5);
      expect(c.x).toBeLessThanOrEqual(view.x + 0.01);
      expect(c.y).toBeLessThanOrEqual(view.y + 0.01);
      expect(c.x + c.w).toBeGreaterThanOrEqual(view.x + view.w - 0.01);
      expect(c.y + c.h).toBeGreaterThanOrEqual(view.y + view.h - 0.01);
      expect(c.w / c.h).toBeCloseTo(1.5, 5);
    }
    const c = townCover(img, { x: 0, y: 0, w: 1920, h: 1080 });
    expect(c.scale).toBeCloseTo(1.25, 5);
    expect(c.y).toBeCloseTo(-100, 5); // ortadan kırpılır: üstten ve alttan 100
    expect(townCover(img, { x: 0, y: 0, w: 1920, h: 1080 }, 0).y).toBe(0);
    expect(townCover(img, { x: 0, y: 0, w: 1920, h: 1080 }, 1).y).toBeCloseTo(-200, 5);
  });

  it('hotspots scale with the picture: the centre of each place hits that place on every screen shape, and stays on screen', () => {
    for (const n of towns) {
      const def = townScene(n)!;
      for (const view of [
        { x: 0, y: 0, w: 1920, h: 1080 },
        { x: -208, y: 0, w: 2337, h: 1080 },
        { x: -330, y: 0, w: 2580, h: 1080 },
      ]) {
        const c = townCover(img, view, def.focusY);
        for (const h of def.hotspots) {
          const r = hotspotRect(h, c);
          expect(hotspotAt(def, c, r.x + r.w / 2, r.y + r.h / 2)?.id).toBe(h.id);
          // yer görünür alanın içinde (kırpılan üst / alt şeritte kaybolmaz)
          expect(r.y + r.h / 2, `${n.name} ${h.id}`).toBeGreaterThan(view.y);
          expect(r.y + r.h / 2, `${n.name} ${h.id}`).toBeLessThan(view.y + view.h);
          expect(r.x + r.w / 2).toBeGreaterThan(view.x);
          expect(r.x + r.w / 2).toBeLessThan(view.x + view.w);
        }
      }
      expect(hotspotAt(def, townCover(img, { x: 0, y: 0, w: 1920, h: 1080 }), 960, 1070)).toBeNull(); // alttaki açık alan: takımın yeri
    }
  });

  it('party of 1-4 stands centred in the open lower area', () => {
    expect(partySpots(1, { cx: 960, feetY: 970, gap: 230 })).toEqual([{ x: 960, y: 970 }]);
    const four = partySpots(4, { cx: 960, feetY: 970, gap: 230 });
    expect(four.map((p) => p.x)).toEqual([615, 845, 1075, 1305]);
  });
});

describe('town screen flow', () => {
  it('the town screen is up for the first-entry flow (farewell, company, story) and the town itself, gone after Leave', () => {
    let s = debugTeleport(base(), '4');
    const seen: string[] = [];
    for (let i = 0; i < 10 && nextStep(s).kind !== 'move'; i++) {
      const k = nextStep(s).kind;
      seen.push(k);
      expect(townScreenNode(s), `adım ${k}`).toBe('4');
      s = autoResolve(s);
    }
    expect(seen).toEqual(['farewell', 'company', 'story', 'town']);
    expect(townScreenNode(s)).toBeNull();
    expect(townScreenNode(at('3', 'battle'))).toBeNull(); // kasaba olmayan düğüm
  });

  it('Valdren barracks: recruits can be picked inside the town (same seeded offer); leaving then asks nothing more', () => {
    const s = at('7', 'town');
    const offer = townRecruitOffer(s);
    expect(offer).toEqual(recruitOffer(s, '7'));
    expect(offer.length).toBe(3);
    const size = s.roster.length;
    const t = recruitInTown(s, offer[1]!);
    expect(t.roster.length).toBe(size + 1);
    expect(t.roster.at(-1)!.class).toBe(offer[1]);
    expect(t.active).toContain(t.roster.at(-1)!.id);
    expect(townRecruitOffer(t)).toEqual([]); // ikinci kez yok
    expect(() => recruitInTown(t, offer[0]!)).toThrow();
    expect(nextStep(t).kind).toBe('town');
    expect(nextStep(completeSimple(t, 'town')).kind).toBe('move'); // gönüllü adımı zaten bitti
  });

  it('Valdren without a pick still asks for the volunteer at the gate; Ashford has no recruits in town', () => {
    const s = at('7', 'town');
    expect(nextStep(completeSimple(s, 'town')).kind).toBe('volunteer');
    expect(() => recruitInTown(s, 'nope')).toThrow();
    const ash = at('4', 'town');
    expect(townRecruitOffer(ash)).toEqual([]);
    expect(() => recruitInTown(ash, 'warrior')).toThrow();
  });
});
