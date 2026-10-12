import { describe, expect, it } from 'vitest';
import {
  ENDLESS,
  bestHeroFor,
  buyItem,
  buybackItem,
  chooseReward,
  leaveShop,
  newRun,
  openShop,
  parseRun,
  rerollShop,
  saveRun,
  loadRun,
  sellItem,
  sellPriceOf,
  shopStock,
  statDelta,
  usableHeroes,
  type EndlessRun,
  type KV,
} from '../src/endless';
import { ITEMS, affixValues, itemDef, itemValue, sellValue, type ItemRoll } from '../src/progression';
import { SAVE_VERSION } from '../src/endless/save';

// Endless tüccarı (Odo the Peddler; Ömer 2026-10-09, taslak v1): 9 mal, satış (değerin yarısı), bu ziyaretin geri alımı, malları yenileme,
// kayıt gidiş-dönüşü, detay panelinin hesapları.

const PARTY = ['warrior', 'archer', 'mage', 'druid'];

class MemKV implements KV {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

/** 5. dalgadan sonra tüccarda duran koşu (torbada iki item). */
function atShop(gold = 100, seed = 11): EndlessRun {
  const base: EndlessRun = { ...newRun(seed, PARTY, '2026-10-09T00:00:00.000Z'), wave: 6, phase: 'reward', stats: { cleared: 5, turns: 0, kills: 0 }, offer: [{ kind: 'gold', amount: 0 }] };
  const run = chooseReward(base, 0);
  expect(run.phase).toBe('shop');
  return { ...run, gold, bag: [{ uid: 'b1', id: 'woodcutters_axe' }, { uid: 'b2', id: 'leather_coif' }], nextItem: 10 };
}

describe('endless tüccar: veri', () => {
  it('9 mal (3x3), yenileme 15 altın, satış değerin yarısı', () => {
    expect(ENDLESS.shop.size).toBe(9);
    expect(ENDLESS.shop.rerollCost).toBe(15);
    expect(ENDLESS.shop.buybackSize).toBeGreaterThan(0);
    expect(ITEMS.budget.sellRatio).toBe(0.5);
    const d = itemDef('woodcutters_axe')!;
    expect(sellValue(d)).toBe(Math.max(1, Math.round(itemValue(d) * 0.5)));
    const run = atShop();
    expect(run.shop!.length).toBeGreaterThan(3);
    expect(run.shop!.length).toBeLessThanOrEqual(9);
    expect(new Set(run.shop!.map((e) => e.itemId)).size).toBe(run.shop!.length);
  });
});

describe('endless tüccar: al / sat / geri al / yenile', () => {
  it('satın alma: altın düşer, item torbaya, satır SOLD; yetmezse olmaz', () => {
    const run = atShop(1000);
    const e = run.shop![0]!;
    const next = buyItem(run, 0);
    expect(next.gold).toBe(1000 - e.price);
    expect(next.shop![0]!.sold).toBe(true);
    expect(next.bag!.map((i) => i.id)).toContain(e.itemId);
    const poor = { ...run, gold: e.price - 1 };
    expect(buyItem(poor, 0)).toBe(poor);
  });

  it('satış: yalnızca dükkânda, altın += satış değeri, item geri alım listesine (aynı uid ve fiyat)', () => {
    const run = atShop(10);
    const price = sellValue(itemDef('woodcutters_axe')!);
    expect(sellPriceOf(run, 'b1')).toBe(price);
    const sold = sellItem(run, 'b1');
    expect(sold.gold).toBe(10 + price);
    expect(sold.bag!.map((i) => i.uid)).toEqual(['b2']);
    expect(sold.buyback).toEqual([{ item: { uid: 'b1', id: 'woodcutters_axe' }, price }]);
    expect(sellItem(sold, 'b1')).toBe(sold); // torbada yok
    const camp = { ...run, phase: 'ready' as const };
    expect(sellItem(camp, 'b1')).toBe(camp); // tüccar dışında satılmaz
  });

  it('geri alım: aynı fiyata aynı örnek torbaya döner; altın ya da yer yetmezse olmaz', () => {
    const sold = sellItem(atShop(0), 'b1');
    const price = sold.buyback![0]!.price;
    const back = buybackItem(sold, 0);
    expect(back.gold).toBe(sold.gold - price);
    expect(back.bag!.map((i) => i.uid)).toEqual(['b2', 'b1']);
    expect(back.buyback).toEqual([]);
    const poor = { ...sold, gold: price - 1 };
    expect(buybackItem(poor, 0)).toBe(poor);
    const full = { ...sold, bag: Array.from({ length: ENDLESS.bagSize! }, (_, i) => ({ uid: `x${i}`, id: 'leather_coif' })) };
    expect(buybackItem(full, 0)).toBe(full);
  });

  it('geri alım listesi buybackSize ile sınırlı (en eskisi düşer) ve tüccardan ayrılınca silinir', () => {
    let run: EndlessRun = { ...atShop(0), bag: Array.from({ length: ENDLESS.shop.buybackSize + 2 }, (_, i) => ({ uid: `s${i}`, id: 'leather_coif' })) };
    for (let i = 0; i < ENDLESS.shop.buybackSize + 2; i++) run = sellItem(run, `s${i}`);
    expect(run.buyback).toHaveLength(ENDLESS.shop.buybackSize);
    expect(run.buyback![0]!.item.uid).toBe('s2');
    const left = leaveShop(run);
    expect(left.phase).toBe('ready');
    expect(left.buyback).toBeUndefined();
    expect(left.shop).toBeUndefined();
    expect(left.shopRerolls).toBeUndefined();
  });

  it('yenileme: rerollCost altın, seed\'li yeni stok (her seferinde farklı ama tekrar edilebilir); altın yetmezse olmaz', () => {
    const run = atShop(100);
    const r1 = rerollShop(run);
    expect(r1.gold).toBe(100 - ENDLESS.shop.rerollCost);
    expect(r1.shopRerolls).toBe(1);
    expect(r1.shop!.length).toBeGreaterThan(0);
    expect(rerollShop(run)).toEqual(r1); // aynı girdi -> aynı stok
    expect(r1.shop).not.toEqual(run.shop);
    const r2 = rerollShop(r1);
    expect(r2.shopRerolls).toBe(2);
    expect(r2.gold).toBe(100 - 2 * ENDLESS.shop.rerollCost);
    const poor = { ...run, gold: ENDLESS.shop.rerollCost - 1 };
    expect(rerollShop(poor)).toBe(poor);
    // yenileme 0 = ilk stok (eski davranış), her yenileme numarası farklı stok
    expect(shopStock(run, ENDLESS, ITEMS.items, 0)).toEqual(shopStock(run));
    expect(shopStock(run, ENDLESS, ITEMS.items, 1)).not.toEqual(shopStock(run, ENDLESS, ITEMS.items, 2));
  });

  it('debug openShop: kamptaki koşuyu tüccara alır', () => {
    const camp = { ...newRun(3, PARTY, '2026-10-09T00:00:00.000Z') };
    const shop = openShop(camp);
    expect(shop.phase).toBe('shop');
    expect(shop.shop!.length).toBeGreaterThan(0);
    expect(openShop(shop)).toBe(shop);
  });
});

describe('endless tüccar: kayıt', () => {
  it('tüccar aşaması (stok, satılan satır, geri alım, yenileme sayacı) kaydedilip aynen yüklenir', () => {
    let run = atShop(200);
    run = buyItem(run, 0);
    run = sellItem(run, 'b2');
    run = rerollShop(run);
    const kv = new MemKV();
    expect(saveRun(kv, run)).toBe(true);
    expect(loadRun(kv)).toEqual(run);
  });

  it('bozuk geri alım satırları atılır, koşu bozulmaz; eski kayıt (alanlar yok) geçerli', () => {
    const run = sellItem(atShop(0), 'b1');
    const raw = JSON.stringify({ version: SAVE_VERSION, run: { ...run, buyback: [...run.buyback!, { item: { uid: 3 }, price: 'x' }], shopRerolls: -2 } });
    const back = parseRun(raw)!;
    expect(back.buyback).toEqual(run.buyback);
    expect(back.shopRerolls).toBeUndefined();
    const old = { ...atShop(0) };
    delete old.buyback;
    delete old.shopRerolls;
    expect(parseRun(JSON.stringify({ version: SAVE_VERSION, run: old }))).toEqual(old);
    // çok eski sürüm: zarsız item'ler en yakın affix biçimini alır (asla çökmez)
    const v1 = parseRun(JSON.stringify({ version: 1, run: old }))!;
    for (const it of v1.bag ?? []) expect(it.rolls?.affixes.length).toBeGreaterThan(0);
  });
});

describe('endless tüccar: detay paneli hesapları', () => {
  it('kim kullanır: silahta yalnızca ailesine izinli class\'lar, diğer yuvalarda herkes', () => {
    const run = atShop();
    const bow = itemDef('short_bow')!;
    expect(usableHeroes(run, bow).map((h) => h.class)).toEqual(['archer']);
    expect(usableHeroes(run, itemDef('leather_coif')!)).toHaveLength(4);
  });

  it('karşılaştırma ve BEST: takılıya göre stat farkı; en büyük IP kazancı olan kahraman', () => {
    const run = atShop();
    const cap: ItemRoll = { rarity: 'common', affixes: [{ id: 'c_hp', q: 0.5 }] };
    run.heroes[0]!.equipment = { helm: { uid: 'e1', id: 'iron_cap', rolls: cap } }; // warrior: Iron Cap (ilvl 5) +3 Max HP
    const coif = itemDef('leather_coif')!; // ilvl 2: +2 Max HP (zarsız teklif = orta değer)
    const rows = statDelta(run, run.heroes[0]!.id, coif, undefined, { rarity: 'common', affixes: [{ id: 'c_hp', q: 0.5 }] });
    const capHp = affixValues('c_hp', itemDef('iron_cap')!.ilvl, 0.5)[0]!;
    const coifHp = affixValues('c_hp', coif.ilvl, 0.5)[0]!;
    expect(coifHp).toBeLessThan(capHp);
    expect(rows.map((r) => [r.id, r.now, r.after, r.diff])).toEqual([['c_hp', capHp, coifHp, coifHp - capHp]]);
    // boş yuvalı kahramanlar kazanır; warrior'da kazanç yok (Iron Cap daha güçlü) -> BEST ilk boş yuvalı (archer)
    expect(bestHeroFor(run, coif, undefined, { rarity: 'common', affixes: [{ id: 'c_hp', q: 0.5 }] })).toBe(run.heroes[1]!.id);
    // kimse için yükseltme değilse BEST yok
    for (const h of run.heroes) h.equipment = { helm: { uid: `x${h.id}`, id: 'great_helm', rolls: { rarity: 'epic', affixes: [{ id: 'c_hp', q: 1 }, { id: 'c_armor', q: 1 }, { id: 'b_marmor', q: 1 }, { id: 'a_gdef', q: 1 }] } } };
    expect(bestHeroFor(run, coif, undefined, { rarity: 'common', affixes: [{ id: 'c_hp', q: 0.5 }] })).toBeNull();
  });
});

describe('tüccarın nadir malı (Legendary) dalganın seviyesinde', () => {
  it('taban seviyesiz: rolls ilvl = ilvlCap(temizlenen dalga), tabanın altında ya da üstünde (Ömer 2026-10-12)', async () => {
    const { ilvlCap } = await import('../src/endless/run');
    const run: EndlessRun = { ...newRun(5, PARTY, '2026-10-09T00:00:00.000Z'), wave: 11, phase: 'shop', stats: { cleared: 10, turns: 0, kills: 0 } };
    const cap = ilvlCap(10);
    const seen = { below: false, above: false };
    for (let reroll = 0; reroll < 400 && !(seen.below && seen.above); reroll++) {
      for (const w of shopStock(run, ENDLESS, ITEMS.items, reroll)) {
        const d = itemDef(w.itemId)!;
        if (d.rarity !== 'legendary') continue;
        const ilvl = w.rolls?.ilvl ?? d.ilvl;
        expect(ilvl, d.id).toBe(cap);
        if (d.ilvl > cap) seen.below = true;
        if (d.ilvl < cap) seen.above = true;
      }
    }
    expect(seen.below, 'tabanı dalga seviyesinin üstünde olan bir Legendary dalga seviyesinde geldi').toBe(true);
  });
});
