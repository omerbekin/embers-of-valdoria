import { describe, expect, it } from 'vitest';
import { autoResolve, debugTeleport, getMap, isCleared, moveTo, newCampaign, nextStep, node, nodeLevel, normalizeState, travelRoute, travelRoutes, type CampaignState } from '../src/campaign';
import encounters from '../data/campaign/encounters.json';

// Cairn Hill (Ömer 2026-10-19: "Ashford Village ile Valdren Keep arası çok kısa: araya 1 düğüm daha"): Windy Moor ile Iron Pass / Charcoal Camp
// çatalı arasına yeni normal savaş. Eski kayıtlarda bu düğüm yok: bozulmadan açılmalı, yol erişimi çalışmalı, düğüm kendiliğinden temizlenmiş sayılmaz.

const map = getMap('valdoria');
const fresh = (seed = 21) => newCampaign({ mode: 'normal', seed });

function finish(s: CampaignState): CampaignState {
  let t = s;
  for (let g = 0; g < 30 && nextStep(t).kind !== 'move' && nextStep(t).kind !== 'complete'; g++) t = autoResolve(t);
  return t;
}
function walk(s: CampaignState, ...ids: string[]): CampaignState {
  let t = finish(s);
  for (const id of ids) t = finish(moveTo(t, id));
  return t;
}
/** Eski (Cairn Hill öncesi) kayıt taklidi: düğüm kimliğini durumun her yerinden siler (diziler + anahtarlar), eski path'te moor -> 5B doğrudan. */
function stripNode(x: unknown, id: string): unknown {
  if (Array.isArray(x)) return x.filter((v) => v !== id && !(typeof v === 'string' && v.startsWith(`${id}:`))).map((v) => stripNode(v, id));
  if (x && typeof x === 'object')
    return Object.fromEntries(Object.entries(x).filter(([k]) => k !== id && !k.startsWith(`${id}:`)).map(([k, v]) => [k, stripNode(v, id)]));
  return x;
}
const oldSave = (s: CampaignState): CampaignState => normalizeState(stripNode(JSON.parse(JSON.stringify(s)), 'cairn'), 0)!;
const afterAshford = () => finish(debugTeleport(fresh(), '4'));

describe('Cairn Hill: harita yeri', () => {
  it('Windy Moor -> Cairn Hill -> [Iron Pass | Charcoal Camp]; normal savaş, bölge I (2026-10-22 bölge kayması), mevcut mob havuzundan', () => {
    const n = node(map, 'cairn');
    expect([n.type, n.name, n.region]).toEqual(['battle', 'Cairn Hill', 'I']);
    expect(map.edges.filter((e) => e.to === 'cairn').map((e) => [e.from, e.style])).toEqual([['moor', 'solid'], ['hills', 'solid']]); // 2026-10-22: Brackenridge kolu
    expect(map.edges.filter((e) => e.from === 'cairn').map((e) => e.to).sort()).toEqual(['5B', 'charcoal', 'hillcamp']); // hillcamp: Hillside Camp cebi (playtest D6)
    expect(map.edges.filter((e) => e.from === 'moor' && e.to !== 'cairn').map((e) => e.to)).toEqual(['hoard']); // yalnız cep (Raiders' Hoard)
    const enc = (encounters as unknown as Record<string, { units: Array<{ class: string; mods?: { hpMult?: number } }> }>)[n.encounter!]!;
    const pool = new Set(['windy_moor', 'charcoal_camp'].flatMap((k) => (encounters as unknown as Record<string, { units: Array<{ class: string }> }>)[k]!.units.map((u) => u.class)));
    for (const u of enc.units) expect(pool.has(u.class), u.class).toBe(true);
    // çarpan komşu karşılaşmaların arasında (provizyon; balance-tester)
    for (const u of enc.units) {
      expect(u.mods!.hpMult!).toBeLessThan(0.92);
      expect(u.mods!.hpMult!).toBeGreaterThan(0.75);
    }
  });

  it('rozetler komşulardan en az 120 px uzak (1920x1080 dünya; telefonda da aynı oran)', () => {
    const p = node(map, 'cairn').pos;
    for (const o of map.nodes) {
      if (o.id === 'cairn') continue;
      const d = Math.hypot((o.pos[0] - p[0]) * 1920, (o.pos[1] - p[1]) * 1080);
      expect(d, o.id).toBeGreaterThan(120);
    }
  });

  it('level rampası (levels.json > rampStartSteps 2): Cairn Hill L1 (Ashford sonrası 2. adım); Iron Pass / Charcoal Camp L2; final L10', () => {
    expect(nodeLevel('valdoria', 'moor')).toBe(1);
    expect(nodeLevel('valdoria', 'cairn')).toBe(1);
    expect(nodeLevel('valdoria', '5B')).toBe(2);
    expect(nodeLevel('valdoria', 'charcoal')).toBe(2);
    expect(nodeLevel('valdoria', '12')).toBe(10);
  });
});

describe('Cairn Hill: eski kayıt uyumluluğu', () => {
  it('Windy Moor\'da duran eski kayıt: ileri seçenek Cairn Hill (+ 2026-10-22 Raiders\' Hoard cebi), orada savaş', () => {
    const s = oldSave(walk(afterAshford(), 'moor'));
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['cairn', 'hoard'], back: ['4'] });
    const t = moveTo(s, 'cairn');
    expect(nextStep(t)).toEqual({ kind: 'battle', node: 'cairn', encounter: 'cairn_hill' });
  });

  it('çatalı geçmiş eski kayıt (Valdren Keep, Iron Pass yoluyla): açılır, ileri yol aynı; Cairn Hill temizlenmiş sayılmaz ama yürünerek girilir', () => {
    const s = oldSave(walk(afterAshford(), 'moor', 'cairn', '5B', '7'));
    expect(s.at).toBe('7');
    expect(isCleared(s, 'cairn')).toBe(false);
    expect(isCleared(s, '5B')).toBe(true);
    const step = nextStep(s);
    expect(step.kind).toBe('move');
    if (step.kind === 'move') expect(step.options.sort()).toEqual(['5A', '6A', '6B']);
    // geri yolculuk: temizlenmiş Iron Pass'tan geçerek Cairn Hill'e varılır (savaş orada); ötesine (Ashford) yolculuk Cairn Hill temizlenince açılır
    expect(travelRoute(s, 'cairn')).toEqual(['5B', 'cairn']);
    expect(travelRoutes(s).has('4')).toBe(false);
    let t = moveTo(s, 'cairn');
    expect(nextStep(t).kind).toBe('battle');
    t = finish(t);
    expect(isCleared(t, 'cairn')).toBe(true);
    expect(travelRoute(t, '4')).toEqual(['moor', '4']);
  });

  it('ileri bölgedeki eski kayıt (Ember Road) aynen açılır ve ilerler', () => {
    const s = oldSave(finish(debugTeleport(fresh(), 'road')));
    expect(s.at).toBe('road');
    expect(isCleared(s, 'cairn')).toBe(false);
    expect(nextStep(s).kind).toBe('move');
    const t = finish(moveTo(s, 'fold'));
    expect(t.at).toBe('fold');
  });
});
