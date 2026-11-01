import { describe, expect, it } from 'vitest';
import { SAVE_KEY, addItem, memoryKV, newCampaign, pickHero, readSaves, writeSave } from '../src/campaign';
import { Rng } from '../src/engine';
import { newRun, parseRun } from '../src/endless';
import { ITEMS, instanceRoll, itemDef, migrateRemovedAffixes, rollItem, rolledAffixes, tierPool, type ItemInstance } from '../src/progression/items';
import { loadout } from '../src/progression/loadout';

// Gold find + Experience item'lerden kalktı (Ömer 2026-11-01, karar B4): veri ve besleyici kod yok; eski kayıtta item kaybolmaz, affix aynı kademe ve
// yuva havuzundan uid'den seed'li yenisiyle değişir.

const REMOVED = ['c_gold', 'c_xp'];
const old = (uid: string, id: string, affixes: Array<{ id: string; q: number }>, rarity = 'uncommon'): ItemInstance => ({ uid, id, rolls: { rarity, ilvl: 10, affixes } } as ItemInstance);
const ids = (i: ItemInstance): string[] => instanceRoll(i).affixes.map((a) => a.id);

describe('veri', () => {
  it('iki affix ve hedefleri veride yok, yeni zar onları çekmez', () => {
    for (const id of REMOVED) expect(ITEMS.affixDefs[id]).toBeUndefined();
    const targets = Object.values(ITEMS.affixDefs).flatMap((a) => a.parts.map((p) => p.to));
    expect(targets).not.toContain('prog:gold');
    expect(targets).not.toContain('prog:xp');
    const rng = new Rng(7);
    for (const d of ITEMS.items.filter((x) => x.slot === 'trinket' || x.slot === 'helm')) {
      for (let i = 0; i < 10; i++) for (const a of rollItem(d, rng, { rarity: 'epic' }).affixes) expect(REMOVED).not.toContain(a.id);
    }
  });

  it('loadout sonucunda altın / XP bonusu alanı yok', () => {
    const l = loadout({ class: 'warrior', equipment: { trinket: old('t', 'copper_ring', [{ id: 'c_gold', q: 1 }]) } }) as unknown as Record<string, unknown>;
    expect(l.goldBonus).toBeUndefined();
    expect(l.xpBonus).toBeUndefined();
  });
});

describe('eski kayıt: okurken', () => {
  it('kaldırılmış affix aynı kademe ve yuva havuzundan yenisiyle değişir; sıra, değer zarı ve diğer affix korunur', () => {
    const d = itemDef('copper_ring')!;
    const keep = tierPool('C', d.slot)[0]!;
    const inst = old('u1', 'copper_ring', [{ id: keep, q: 0.3 }, { id: 'c_gold', q: 0.8 }]);
    const r = instanceRoll(inst);
    expect(r.affixes).toHaveLength(2);
    expect(r.affixes[0]).toEqual({ id: keep, q: 0.3 });
    const fresh = r.affixes[1]!;
    expect(REMOVED).not.toContain(fresh.id);
    expect(fresh.id).not.toBe(keep);
    expect(tierPool('C', d.slot)).toContain(fresh.id);
    expect(fresh.q).toBe(0.8);
    expect(r.rarity).toBe('uncommon');
    expect(r.ilvl).toBe(10);
  });

  it('aynı uid = aynı sonuç; farklı uid farklı affix verebilir', () => {
    const of = (uid: string) => ids(old(uid, 'copper_ring', [{ id: 'c_gold', q: 0.5 }]));
    expect(of('a')).toEqual(of('a'));
    expect(new Set(Array.from({ length: 40 }, (_, i) => of(`u${i}`)[0])).size).toBeGreaterThan(1);
  });

  it('iki kaldırılmış affix aynı item\'de: iki ayrı yeni affix; tek affix\'li item boş kalmaz', () => {
    const two = ids(old('d', 'copper_ring', [{ id: 'c_gold', q: 0.5 }, { id: 'c_xp', q: 0.5 }]));
    expect(two).toHaveLength(2);
    expect(new Set(two).size).toBe(2);
    expect(ids(old('s', 'leather_coif', [{ id: 'c_xp', q: 0.5 }]))).toHaveLength(1);
  });

  it('takılıyken çökmez, affix ipucu ve güç katmanı yeni affix\'i görür', () => {
    const inst = old('e', 'copper_ring', [{ id: 'c_gold', q: 0.5 }]);
    expect(rolledAffixes(inst).map((a) => a.id)).toEqual(ids(inst));
    expect(loadout({ class: 'warrior', equipment: { trinket: inst } }).affixes.map((a) => a.id)).toEqual(ids(inst));
  });

  it('listede olmayan bilinmeyen affix eskisi gibi atılır', () => {
    expect(ids(old('z', 'copper_ring', [{ id: 'c_hp', q: 0.5 }, { id: 'nope', q: 0.5 }]))).toEqual(['c_hp']);
  });
});

describe('eski kayıt: göç', () => {
  it('her yerdeki zarı yazar (uid\'li örnek okumayla aynı sonuç; teklif, Spoils), ikinci geçiş dokunmaz', () => {
    const item = old('u9', 'copper_ring', [{ id: 'c_gold', q: 0.5 }]);
    const expected = ids(item);
    const tree = {
      inventory: [item, old('clean', 'copper_ring', [{ id: 'c_hp', q: 0.5 }])],
      offer: [{ itemId: 'leather_coif', heroId: 'h', rolls: { affixes: [{ id: 'c_xp', q: 0.5 }] } }],
      pendingLoot: { left: ['copper_ring'], leftRolls: [{ affixes: [{ id: 'c_gold', q: 0.5 }] }] },
    };
    expect(migrateRemovedAffixes(tree)).toBe(3);
    expect(tree.inventory[0]!.rolls!.affixes.map((a) => a.id)).toEqual(expected);
    expect(tree.inventory[1]!.rolls!.affixes.map((a) => a.id)).toEqual(['c_hp']);
    expect(REMOVED).not.toContain(tree.offer[0]!.rolls.affixes[0]!.id);
    expect(REMOVED).not.toContain(tree.pendingLoot.leftRolls[0]!.affixes[0]!.id);
    const snap = JSON.stringify(tree);
    expect(migrateRemovedAffixes(tree)).toBe(0);
    expect(JSON.stringify(tree)).toBe(snap);
  });

  const suspendedStub = (node: string) => ({ node, seed: 1, turn: 0, hash: 'x', setup: 's', actions: [] });

  it('sefer kaydı: item kalır, affix değişir; takılı item değiştiyse yarım savaş atılır, yalnız torbadaysa kalır', () => {
    const save = (mutate: (st: Record<string, unknown> & { roster: Array<{ equipment: Record<string, unknown> }>; inventory: ItemInstance[]; at: string }) => void) => {
      const kv = memoryKV();
      writeSave(kv, addItem(pickHero(newCampaign({ mode: 'normal', seed: 9, campaignId: 'm1' }), 'warrior'), 'copper_ring').state, 'manual', 't');
      const raw = JSON.parse(kv.getItem(SAVE_KEY)!);
      mutate(raw.slots[0].saves[0].state);
      kv.setItem(SAVE_KEY, JSON.stringify(raw));
      const r = readSaves(kv);
      expect(r.corrupt).toBe(false);
      return r.file.slots[0]!.saves[0]!.state;
    };
    const inBag = save((st) => {
      st.inventory[0]!.rolls = { rarity: 'common', affixes: [{ id: 'c_gold', q: 0.5 }] } as never;
      st.suspended = suspendedStub(st.at);
    });
    expect(inBag.inventory).toHaveLength(1);
    const uid = inBag.inventory[0]!.uid;
    expect(inBag.inventory[0]!.rolls!.affixes.map((a) => a.id)).toEqual(ids(old(uid, 'copper_ring', [{ id: 'c_gold', q: 0.5 }])));
    expect(inBag.suspended).toBeDefined();
    const worn = save((st) => {
      st.roster[0]!.equipment.trinket = old('w1', 'copper_ring', [{ id: 'c_xp', q: 0.5 }]);
      st.suspended = suspendedStub(st.at);
    });
    expect(worn.roster[0]!.equipment.trinket!.uid).toBe('w1');
    expect(worn.roster[0]!.equipment.trinket!.rolls!.affixes.map((a) => a.id)).not.toContain('c_xp');
    expect(worn.suspended).toBeUndefined();
  });

  it('Endless kaydı: aynı kural', () => {
    const run = newRun(5, ['warrior', 'mage', 'archer', 'paladin'], '2026-11-01T00:00:00.000Z');
    const suspended = { wave: 1, seed: 1, actions: [], turn: 0, hash: 'x' };
    const bag = parseRun(JSON.stringify({ version: 7, run: { ...run, bag: [old('b1', 'copper_ring', [{ id: 'c_gold', q: 0.5 }])], suspended } }))!;
    expect(bag.bag![0]!.rolls!.affixes.map((a) => a.id)).toEqual(ids(old('b1', 'copper_ring', [{ id: 'c_gold', q: 0.5 }])));
    expect(bag.suspended).toBeDefined();
    const heroes = run.heroes.map((h, i) => (i === 0 ? { ...h, equipment: { ...h.equipment, trinket: old('t1', 'copper_ring', [{ id: 'c_gold', q: 0.5 }]) } } : h));
    const worn = parseRun(JSON.stringify({ version: 7, run: { ...run, heroes, suspended } }))!;
    expect(worn.heroes[0]!.equipment.trinket!.rolls!.affixes.map((a) => a.id)).not.toContain('c_gold');
    expect(worn.suspended).toBeUndefined();
  });
});
