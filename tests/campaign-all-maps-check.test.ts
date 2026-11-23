// 1.0 öncesi kontrol (2026-11-23): üç haritanın tamamı, başlangıçtan ulaşılabilirlik + bağlı verilerin geçerliliği + harita geçişleri.
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { CONFIG, ENCOUNTERS, EVENTS, STORIES, TREASURES, finalNode, getMap, incoming, mainOutgoing, outgoing, validateMap, type CampaignMap } from '../src/campaign';
import { content } from '../src/engine';
import { itemDef } from '../src/progression';
import musicTracks from '../data/audio-music-tracks.json';
import bossTracks from '../data/audio-music-bosses.json';

const hasBg = (id: string) => ['webp', 'png', 'jpg'].some((e) => existsSync(`assets/backgrounds/${id}.${e}`));
const hasTown = (id: string) => ['webp', 'png', 'jpg'].some((e) => existsSync(`assets/towns/${id}.${e}`));
const trackIds = new Set([...Object.keys(musicTracks.tracks), ...Object.keys(bossTracks as Record<string, unknown>)]);

const KNOWN_HIDDEN = new Set(['shepherds_fold/search']);

/** İleri yönde (kenar yönünde) başlangıçtan ulaşılanlar; cep ve Kharduin kolları da kenarla bağlı. */
function forwardReach(map: CampaignMap): Set<string> {
  const seen = new Set([map.start]);
  const q = [map.start];
  while (q.length) for (const o of outgoing(map, q.shift()!)) if (!seen.has(o)) { seen.add(o); q.push(o); }
  return seen;
}

describe.each(CONFIG.maps)('harita %s: bütünlük ve bağlar', (mapId) => {
  const map = getMap(mapId);

  it('doğrulama temiz; her düğüm başlangıçtan ileri yönde ulaşılır; son düğüm tek', () => {
    expect(validateMap(map)).toEqual([]);
    expect(forwardReach(map).size).toBe(map.nodes.length);
    expect(map.nodes.filter((n) => n.final)).toHaveLength(1);
    expect(finalNode(map)).toBe(map.nodes.find((n) => n.final)!.id);
  });

  it('çıkmaz yalnız bilerek: cep, Kharduin kolu ya da son düğüm; yetim (girişsiz) yalnız başlangıç', () => {
    for (const n of map.nodes) {
      if (n.id !== map.start) expect(incoming(map, n.id).length, `${n.id} yetim`).toBeGreaterThan(0);
      if (!n.final && !n.optional && !n.spoke) expect(mainOutgoing(map, n.id).length, `${n.id} çıkmaz`).toBeGreaterThan(0);
    }
  });

  it('savaş / elit / boss düğümü karşılaşma ister; karşılaşma, olay, hazine, hikâye, arka plan, kasaba, müzik bağları çözülür', () => {
    for (const n of map.nodes) {
      if (['battle', 'elite', 'boss'].includes(n.type)) expect(n.encounter, `${n.id} karşılaşmasız`).toBeDefined();
      if (n.encounter) {
        const enc = ENCOUNTERS[n.encounter];
        expect(enc, `${n.id}: ${n.encounter}`).toBeDefined();
        const all = [...enc!.units, ...(enc!.waves ?? []).flatMap((w) => w.units ?? [])];
        expect(all.length, `${n.encounter} düşmansız`).toBeGreaterThan(0);
        for (const u of all) expect(content.classes[u.class] ?? content.encounterUnit(u.class), `${n.encounter}: ${u.class}`).toBeDefined();
        if (enc!.background) expect(hasBg(enc!.background), `${n.encounter} arka plan ${enc!.background}`).toBe(true);
      }
      if (n.event) expect(EVENTS[n.event], `${n.id} olay ${n.event}`).toBeDefined();
      if (n.treasure) expect(TREASURES[n.treasure], `${n.id} hazine ${n.treasure}`).toBeDefined();
      if (n.story) expect(STORIES[n.story], `${n.id} hikâye ${n.story}`).toBeDefined();
      if (n.battleBackground) expect(hasBg(n.battleBackground), `${n.id} arka plan ${n.battleBackground}`).toBe(true);
      if (n.scene) expect(hasTown(n.scene.background), `${n.id} kasaba ${n.scene.background}`).toBe(true);
      if (n.type === 'event') expect(n.event ?? n.treasure, `${n.id} olaysız`).toBeDefined();
    }
    for (const r of map.regions) if (r.battleBackground) expect(hasBg(r.battleBackground), `bölge ${r.id}`).toBe(true);
    for (const t of Object.values(map.music ?? {})) expect(trackIds.has(t), `müzik ${t}`).toBe(true);
  });

  it('olay seçenekleri: savaş kimlikleri, relic item, katılan sınıf geçerli; her seçenekten çıkış var', () => {
    for (const n of map.nodes) {
      const ev = n.event ? EVENTS[n.event] : undefined;
      if (!ev) continue;
      for (const c of ev.choices ?? []) {
        // Savaş listesi: sırayla ilk VAR OLAN oynanır; hiçbiri yoksa seçenek gizlenir (bilinen boşluk: shepherds_fold/search > fold_flock, campaign.md açık iş).
        if (c.battle?.length && !KNOWN_HIDDEN.has(`${n.event}/${c.id}`)) expect(c.battle.some((b) => ENCOUNTERS[b]), `${n.event}/${c.id}: ${c.battle}`).toBe(true);
        if (c.relic) expect(itemDef(c.relic), `${n.event}/${c.id} relic ${c.relic}`).toBeDefined();
        if (c.join) expect(content.classes[c.join], `${n.event}/${c.id} join ${c.join}`).toBeDefined();
      }
      if (ev.choices?.length) expect(ev.choices.some((c) => !c.cost && !c.needFaction), `${n.event} bedelsiz seçenek yok (altınsız oyuncu takılır)`).toBe(true);
    }
  });
});
