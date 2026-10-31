import { describe, expect, it } from 'vitest';
import {
  buyWare,
  campaignDay,
  campaignRerollCost,
  campaignStock,
  campaignTeamLevel,
  closeShop,
  debugJumpDrownedReach,
  getMap,
  newCampaign,
  node,
  nodeIlvl,
  nodeLevel,
  openCampaignShop,
  outgoing,
  rerollCampaignShop,
  shopCeiling,
  townLevel,
  debugTeleport,
  autoResolve,
  completeSimple,
  moveTo,
  nextStep,
  memoryKV,
  normalizeState,
  readSaves,
  SAVE_KEY,
  SAVE_VERSION,
  sellToMerchant,
  type CampaignState,
} from '../src/campaign';
import { instanceIlvl, itemDef, levelRequirement, type ItemRoll } from '../src/progression';

// Kasaba level'ı ve dükkân tavanı (Ömer 2026-10-31): tavan = bir sonraki kasabaya kadarki yollarda çıkan en güçlü mobun level'ı.
const valdoria = (): CampaignState => newCampaign({ mode: 'normal', seed: 7 });
const reach = (): CampaignState => debugJumpDrownedReach(valdoria());
const levelOf = (w: { itemId: string; rolls?: ItemRoll }): number => instanceIlvl({ id: w.itemId, ...(w.rolls ? { rolls: w.rolls } : {}) });
/** Bütün kadroyu verilen level'a getirir (yalnız level alanı: stok bunu okur). */
const atLevel = (s: CampaignState, level: number): CampaignState => ({ ...s, roster: s.roster.map((h) => ({ ...h, level })) });
/** Kasaba adımına kadar çözülmüş durum (hikâye bitmiş; torba boş, kese dolu). */
const townAt = (id: string, level: number): CampaignState => {
  let s = debugTeleport(valdoria(), id);
  for (let i = 0; i < 20 && nextStep(s).kind !== 'town'; i++) s = autoResolve(s);
  return atLevel({ ...s, gold: 99999, inventory: [] }, level);
};
const passDays = (s: CampaignState, n: number): CampaignState => ({ ...s, day: campaignDay(s) + n });
const sameWare = (a: { itemId: string; rolls?: unknown }, b: { itemId: string; rolls?: unknown }): boolean => a.itemId === b.itemId && JSON.stringify(a.rolls) === JSON.stringify(b.rolls);
const changedShelves = (a: CampaignState['shop'], b: CampaignState['shop']): number => a!.wares.filter((w, i) => !sameWare(w, b!.wares[i]!)).length;

/** Bağımsız hesap: ileri yollarda sonraki kasabaya kadarki savaşlı düğümler (testin kendi yürüyüşü, fonksiyonu tekrar etmez: DFS). */
function battlesAhead(mapId: string, from: string): string[] {
  const map = getMap(mapId);
  const seen = new Set<string>();
  const out: string[] = [];
  const walk = (id: string): void => {
    for (const o of outgoing(map, id)) {
      if (seen.has(o)) continue;
      seen.add(o);
      const n = node(map, o);
      if (n.type === 'town') continue;
      if (n.encounter) out.push(o);
      walk(o);
    }
  };
  walk(from);
  return out;
}

// Veriden hesaplanan beklenen tablo: harita verisi değişirse bilinçli güncellenir.
const TABLE: Array<[string, string, number, number]> = [
  ['valdoria', '4', 1, 2],
  ['valdoria', '7', 3, 10],
  ['valdoria', 'camp', 8, 10],
  ['drowned-reach', 'dr12', 13, 14],
  ['drowned-reach', 'dr16', 13, 14],
  ['drowned-reach', 'dr28', 15, 16],
  ['drowned-reach', 'dr54', 17, 20],
];

describe('dükkân tavanı', () => {
  it.each(TABLE)('%s %s: kasaba level %i, tavan %i', (mapId, id, level, ceiling) => {
    expect(townLevel(mapId, id)).toBe(level);
    expect(shopCeiling(mapId, id)).toBe(ceiling);
    expect(shopCeiling(mapId, id)).toBe(Math.max(...battlesAhead(mapId, id).map((b) => nodeLevel(mapId, b))));
  });

  it('dallanma: tavan, sonraki kasabaya giden bütün yolların en yükseği; sınır kasabasının ötesi sayılmaz', () => {
    const ahead = battlesAhead('valdoria', '4');
    expect(ahead).not.toContain('12');
    expect(ahead.length).toBeGreaterThan(1);
    // Son kasabadan sonra başka kasaba yok: harita sonunun mobları (final L10)
    expect(battlesAhead('valdoria', '7')).toContain('12');
  });

  it('her tüccarlı düğümde: tavan kasaba level\'ından düşük değil; kasaba hediyesinin seviyesi (düğüm item seviyesi) tavanı aşmaz', () => {
    for (const mapId of ['valdoria', 'drowned-reach', 'hollow-crown']) {
      for (const n of getMap(mapId).nodes.filter((x) => x.merchant || x.type === 'merchant')) {
        expect(shopCeiling(mapId, n.id)).toBeGreaterThanOrEqual(townLevel(mapId, n.id));
        expect(nodeIlvl(mapId, n.id)).toBeLessThanOrEqual(shopCeiling(mapId, n.id));
      }
    }
  });

  it('stok: tavan üstü çıkmaz, boş kalmaz, gün ve yenilemede de; raf sayısı tam', () => {
    const cases: Array<[CampaignState, string]> = [
      [debugTeleport(valdoria(), '4'), '4'],
      [debugTeleport(valdoria(), '7'), '7'],
      [debugTeleport(valdoria(), 'camp'), 'camp'],
      [reach(), 'dr12'],
      [reach(), 'dr16'],
      [reach(), 'dr28'],
      [reach(), 'dr54'],
    ];
    for (const [s, id] of cases) {
      const ceiling = shopCeiling(s.mapId, id);
      const size = node(getMap(s.mapId), id).merchantSize ?? 0;
      for (let day = 0; day < 15; day++) {
        for (const reroll of [0, 1, 2]) {
          const wares = campaignStock({ ...s, day } as CampaignState, id, reroll);
          expect(wares.length).toBeGreaterThan(0);
          if (size) expect(wares.length).toBe(size);
          for (const w of wares) expect(instanceIlvl({ id: w.itemId, ...(w.rolls ? { rolls: w.rolls } : {}) })).toBeLessThanOrEqual(ceiling);
        }
      }
    }
  });

  it('tezgâh yenilemesi de aynı tavana uyar', () => {
    const s = openCampaignShop({ ...debugTeleport(valdoria(), 'camp'), gold: 99999 });
    const r = rerollCampaignShop(atLevel(s, 40));
    for (const w of r.shop!.wares) {
      expect(itemDef(w.itemId)!.ilvl).toBeLessThanOrEqual(shopCeiling(r.mapId, 'camp'));
      expect(levelOf(w)).toBe(shopCeiling(r.mapId, 'camp'));
    }
  });

  it('eski kayıt: tezgâhta tavan üstü mal varsa bugünlük kalır, satın alınabilir; alınan item durur; ertesi gün stok tavana uyar', () => {
    let s: CampaignState = { ...debugTeleport(valdoria(), 'camp'), gold: 99999, inventory: [] };
    s = openCampaignShop(s);
    const first = s.shop!.wares[0]!;
    const over = { ...first, rolls: { ...first.rolls!, ilvl: shopCeiling(s.mapId, 'camp') + 5 } };
    s = { ...s, shop: { ...s.shop!, wares: [over, ...s.shop!.wares.slice(1)] } };
    expect(openCampaignShop(s)).toBe(s); // kayıttaki tezgâh aynen
    const bought = buyWare(s, 0);
    expect(instanceIlvl(bought.inventory[0]!)).toBe(shopCeiling(s.mapId, 'camp') + 5);
    const next = openCampaignShop({ ...bought, day: campaignDay(bought) + 1 } as CampaignState);
    expect(next.inventory).toEqual(bought.inventory);
    for (const w of next.shop!.wares) expect(instanceIlvl({ id: w.itemId, ...(w.rolls ? { rolls: w.rolls } : {}) })).toBeLessThanOrEqual(shopCeiling(s.mapId, 'camp'));
  });
});

// Dükkân kuralı (Ömer 2026-10-31): ilk stok kasaba level'ında, geçen gün başına 2 raf takım level'ında, Reroll hepsi takım level'ında; tavan aşılmaz; raflar kayıtta.
describe('dükkân rafları', () => {
  const ashford = (level = 1): CampaignState => townAt('4', level);
  const valdren = (level = 3): CampaignState => townAt('7', level);

  it('ilk varış: raflar kasabanın level\'ında, takım level\'ı fark etmez', () => {
    for (const lv of [1, 3, 8]) {
      for (const w of openCampaignShop(ashford(lv)).shop!.wares) expect(levelOf(w)).toBe(townLevel('valdoria', '4'));
      for (const w of openCampaignShop(valdren(lv)).shop!.wares) expect(levelOf(w)).toBe(townLevel('valdoria', '7'));
    }
  });

  it('her tüccarlı düğüm: ilk stok kasaba level\'ında ve tam raf; Harita 2 ve 3 de', () => {
    const cases: Array<[CampaignState, string]> = [
      [debugTeleport(valdoria(), 'camp'), 'camp'],
      [reach(), 'dr12'],
      [reach(), 'dr28'],
      [reach(), 'dr54'],
    ];
    for (const [s, id] of cases) {
      const wares = campaignStock(s, id);
      expect(wares.length).toBe(node(getMap(s.mapId), id).merchantSize ?? 9);
      for (const w of wares) expect(levelOf(w)).toBe(townLevel(s.mapId, id));
    }
  });

  it('geçen gün başına 2 raf; yeni mallar takım level\'ında, kalanlar eski level\'ında', () => {
    const s = openCampaignShop(valdren(5));
    const next = openCampaignShop(passDays(s, 1));
    expect(changedShelves(s.shop, next.shop)).toBe(2);
    next.shop!.wares.forEach((w, i) => expect(levelOf(w)).toBe(sameWare(w, s.shop!.wares[i]!) ? townLevel('valdoria', '7') : 5));
  });

  it('uzun ara: gün x 2, en çok raf sayısı; aynı gün ikinci açılış değiştirmez', () => {
    const s = openCampaignShop(valdren(5));
    expect(changedShelves(s.shop, openCampaignShop(passDays(s, 3)).shop)).toBe(6);
    expect(changedShelves(s.shop, openCampaignShop(passDays(s, 40)).shop)).toBe(9);
    const a = ashford(1);
    const o = openCampaignShop(a);
    expect(changedShelves(o.shop, openCampaignShop(passDays(o, 2)).shop)).toBe(4); // Ashford 5 raf: 2 gün x 2 = 4, 3 gün tamamı
    expect(changedShelves(o.shop, openCampaignShop(passDays(o, 3)).shop)).toBe(5);
    const one = openCampaignShop(passDays(o, 1));
    expect(changedShelves(o.shop, one.shop)).toBe(2);
  });

  it('sıra: önce alınmış raflar, sonra en eski mallar; iki gün üst üste bakılınca aynı rafa dönülmez', () => {
    let s = openCampaignShop(valdren(5));
    s = buyWare(s, 6);
    const d1 = openCampaignShop(passDays(s, 1));
    expect(d1.shop!.wares[6]!.sold).toBeUndefined();
    expect(changedShelves(s.shop, d1.shop)).toBe(2);
    const d2 = openCampaignShop(passDays(d1, 1));
    const renewed = d1.shop!.wares.flatMap((w, i) => (sameWare(w, d2.shop!.wares[i]!) ? [] : [i]));
    expect(renewed).toHaveLength(2);
    for (const i of renewed) expect(d1.shop!.wares[i]!.since).toBe(campaignDay(s)); // yeni gelen raflar değil, eskiler
  });

  it('takım level\'ı ortalamadır, yarım yukarı yuvarlanır; tavan aşılmaz', () => {
    const s = valdren(1);
    const mixed = { ...s, roster: s.roster.map((h, i) => ({ ...h, level: i === 0 ? 4 : 5 })) };
    const team = campaignTeamLevel(mixed);
    expect(team).toBeGreaterThanOrEqual(4);
    const r = rerollCampaignShop(openCampaignShop(mixed));
    for (const w of r.shop!.wares) expect(levelOf(w)).toBe(Math.round(team));
    const one = { ...s, active: s.active.map((id, i) => (i === 0 ? id : null)), roster: s.roster.map((h) => ({ ...h, level: 4 })) } as CampaignState;
    expect(campaignTeamLevel(one)).toBe(4);
    // Ashford tavanı 2: L8 takıma bile en çok 2
    const high = rerollCampaignShop(openCampaignShop(ashford(8)));
    for (const w of high.shop!.wares) expect(levelOf(w)).toBe(shopCeiling('valdoria', '4'));
    const day = openCampaignShop(passDays(openCampaignShop(ashford(8)), 10));
    for (const w of day.shop!.wares) expect(levelOf(w)).toBeLessThanOrEqual(shopCeiling('valdoria', '4'));
  });

  it('düşük level\'lı takıma düşük level mal: takılabilir, fiyat level\'dan; yuva çeşidi kısıtlanmaz', () => {
    const r = rerollCampaignShop(openCampaignShop(valdren(1)));
    for (const w of r.shop!.wares) {
      expect(levelOf(w)).toBe(1);
      expect(levelRequirement(levelOf(w))).toBe(1);
    }
    const dear = rerollCampaignShop(openCampaignShop(valdren(8)));
    const avg = (x: CampaignState): number => x.shop!.wares.reduce((a, w) => a + w.price, 0);
    expect(avg(dear)).not.toBe(avg(r));
  });

  it('küçük takım: raflar takılabilir mallarla ve tam dolu', () => {
    for (const cls of ['warrior', 'mage', 'archer', 'priest', 'rogue', 'druid', 'paladin', 'hexer']) {
      const a = ashford(1);
      const h = { ...a.roster[0]!, class: cls };
      const solo = { ...a, roster: [h], active: [h.id, ...a.active.slice(1).map(() => null)] } as CampaignState;
      const wares = campaignStock(solo, '4');
      expect(wares.length).toBe(5);
      expect(new Set(wares.map((w) => w.itemId)).size).toBe(5);
    }
  });

  it('Reroll: bütün raflar, alınmış raf da; bedel +%50; gün ve kayıt bozulmaz', () => {
    let s = buyWare(openCampaignShop(valdren(8)), 2);
    const r = rerollCampaignShop(s);
    expect(r.shop!.wares.some((w) => w.sold)).toBe(false);
    expect(changedShelves(s.shop, r.shop)).toBe(9);
    expect(r.gold).toBe(s.gold - campaignRerollCost(s));
    expect(campaignRerollCost(valdren(1))).toBe(23); // 15 + 7,5 x 1 (eski 15)
    expect(campaignRerollCost(valdren(3))).toBe(38); // 15 + 7,5 x 3 (eski 25)
    expect(campaignRerollCost(valdren(8))).toBe(75); // 15 + 7,5 x 8 (eski 50)
    s = { ...r };
    closeShop(s);
    const back = openCampaignShop(s);
    expect(back.shop!.wares).toEqual(r.shop!.wares);
    expect(back.shop!.rerolls).toBe(1);
  });

  it('raflar kayıtta: kapanıp aynı gün aynı, alınan sold, geri alım listesi boşalır; başka düğüme gidip dönünce de aynı', () => {
    let s = openCampaignShop(valdren(3));
    s = buyWare(s, 1);
    s = sellToMerchant(s, s.inventory[0]!.uid);
    expect(s.shop!.buyback).toHaveLength(1);
    const wares = s.shop!.wares;
    const t = JSON.parse(JSON.stringify(s)) as CampaignState;
    closeShop(t);
    expect(t.shop).toBeUndefined();
    expect(t.merchantStock!['valdoria:7']!.wares).toEqual(wares);
    const back = openCampaignShop(t);
    expect(back.shop!.wares).toEqual(wares);
    expect(back.shop!.buyback).toEqual([]);
    expect(back.merchantStock).toBeUndefined(); // açıkken tek yerde
    // yola çıkınca tezgâh kayda döner (moveTo > closeShop), başka tüccardan sonra aynı gün aynı raflar
    let road = completeSimple(back, 'town');
    for (let i = 0; i < 20 && nextStep(road).kind !== 'move'; i++) road = autoResolve(road);
    const step = nextStep(road);
    if (step.kind !== 'move') throw new Error('move bekleniyordu');
    const away = moveTo({ ...road, shop: back.shop! }, step.options[0]!);
    expect(away.shop).toBeUndefined();
    expect(away.merchantStock!['valdoria:7']!.wares).toEqual(wares);
  });

  it('belirlenim: aynı kayıt + aynı gün = aynı mallar; JSON gidiş-dönüşü değiştirmez', () => {
    const s = openCampaignShop(valdren(5));
    const later = passDays(s, 2);
    const a = openCampaignShop(later);
    const b = openCampaignShop(JSON.parse(JSON.stringify(later)) as CampaignState);
    expect(a.shop).toEqual(b.shop);
    expect(openCampaignShop(valdren(5)).shop).toEqual(s.shop);
    const other = openCampaignShop({ ...valdren(5), seed: 8 });
    expect(other.shop!.wares).not.toEqual(s.shop!.wares);
  });

  it('tavan üstü eski mal: gün dönünce 2 rafa sayılmadan gider', () => {
    let s = openCampaignShop(valdren(3));
    const over = s.shop!.wares.map((w, i) => (i < 4 ? { ...w, rolls: { ...w.rolls!, ilvl: 50 } } : w));
    s = { ...s, shop: { ...s.shop!, wares: over } };
    const next = openCampaignShop(passDays(s, 1));
    for (const w of next.shop!.wares) expect(levelOf(w)).toBeLessThanOrEqual(shopCeiling('valdoria', '7'));
    expect(changedShelves(s.shop, next.shop)).toBe(6);
  });

  it('harita geçişi tezgâh kayıtlarını siler', () => {
    const s = valdren(3);
    const t = JSON.parse(JSON.stringify(openCampaignShop(s))) as CampaignState;
    closeShop(t);
    expect(t.merchantStock).toBeDefined();
    expect(debugJumpDrownedReach(t).merchantStock).toBeUndefined();
  });
});

describe('kayıt göçü (sürüm 13)', () => {
  const file = (state: unknown, version: number): string =>
    JSON.stringify({ version, counter: 1, lastSlot: 0, slots: [{ campaignId: 'c', mode: 'normal', difficulty: 'medium', startedAt: 'x', lastPlayed: 'x', saves: [{ id: 'y', kind: 'auto', savedAt: 'x', mode: 'normal', campaignId: 'c', summary: {}, state }] }, null, null] });
  const load = (raw: string): { state: CampaignState; migrated: boolean; corrupt: boolean } => {
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, raw);
    const r = readSaves(kv);
    return { state: r.file.slots[0]!.saves[0]!.state, migrated: r.migrated, corrupt: r.corrupt };
  };

  it('sürüm 12: kapanan tezgâh kayda taşınır, merchantSold silinir, malları aynı; aynı gün aynı raflar', () => {
    const s = { ...townAt('7', 3), gold: 500 };
    const opened = openCampaignShop(s);
    const old = { ...s, closedShop: { ...opened.shop!, wares: opened.shop!.wares.map((w) => { const { since: _since, ...rest } = w; return rest; }), buyback: [] }, merchantSold: { 'valdoria:7': { 2: campaignDay(s) } } };
    const r = load(file(old, 12));
    expect(r.migrated).toBe(true);
    expect(r.corrupt).toBe(false);
    expect(r.state.closedShop).toBeUndefined();
    expect((r.state as unknown as { merchantSold?: unknown }).merchantSold).toBeUndefined();
    expect(r.state.merchantStock!['valdoria:7']!.wares.map((w) => w.itemId)).toEqual(opened.shop!.wares.map((w) => w.itemId));
    expect(openCampaignShop(r.state).shop!.wares.map((w) => w.itemId)).toEqual(opened.shop!.wares.map((w) => w.itemId));
    const later = openCampaignShop({ ...r.state, day: campaignDay(r.state) + 1 });
    expect(later.shop!.wares.filter((w, i) => w.itemId !== opened.shop!.wares[i]!.itemId || JSON.stringify(w.rolls) !== JSON.stringify(opened.shop!.wares[i]!.rolls))).toHaveLength(2);
  });

  it('sürüm 12: tezgâh kaydı yok: ilk girişte kurulur; açık tezgâh aynen kalır', () => {
    const s = townAt('7', 3);
    const a = load(file(s, 12));
    expect(a.state.merchantStock).toBeUndefined();
    expect(openCampaignShop(a.state).shop!.wares).toEqual(openCampaignShop(s).shop!.wares);
    const open = openCampaignShop(s);
    expect(load(file(open, 12)).state.shop).toEqual(open.shop);
  });

  it('bozuk merchantStock çökertmez: bozuk girdiler atılır, geçerliler kalır; idempotent', () => {
    const s = townAt('7', 3);
    const w = openCampaignShop(s).shop!.wares;
    const bad = { ...s, merchantStock: { 'valdoria:7': { wares: [w[0], { itemId: 'nope', price: 5 }, { itemId: w[1]!.itemId, price: 'x' }, null], day: 'z', rerolls: -1 }, 'valdoria:camp': { wares: 'junk' }, 'x:y': null } };
    const r = load(file(bad, SAVE_VERSION));
    expect(r.corrupt).toBe(false);
    expect(Object.keys(r.state.merchantStock!)).toEqual(['valdoria:7']);
    expect(r.state.merchantStock!['valdoria:7']).toEqual({ wares: [w[0]], rerolls: 0, day: 0 });
    expect(normalizeState(JSON.parse(JSON.stringify(r.state)))).toEqual(r.state);
    // eksik raflar gün dönünce dolar
    expect(openCampaignShop(r.state).shop!.wares.length).toBe(9);
    const none = load(file({ ...s, merchantStock: 'junk' }, SAVE_VERSION));
    expect(none.state.merchantStock).toBeUndefined();
  });
});
