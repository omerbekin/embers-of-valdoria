// Ring ve Trinket ayrı yuva + iki yeni çift el topuz (Ömer 2026-11-01, docs/design/progression/item-design-plan.md T3, T5).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Rng } from '../src/engine/rng';
import {
  addItem,
  campaignStock,
  debugOpenSlot,
  equipBest,
  equipError,
  equipItem,
  grantGift,
  grantLoot,
  getMap,
  newCampaign,
  pickHero,
  noDropSlots,
  normalizeState,
  readSaves,
  SAVE_KEY,
  SAVE_VERSION,
  slotLocks,
  slotOpen,
  slotOpenedNote,
  type CampaignState,
  type KV,
} from '../src/campaign';
import { ITEMS, affixAllowed, canEquip, emptyEquipment, gripOf, isTwoHandMelee, itemDef, itemSubtitle, makeItem, migrateRingSlot, rollDropBase, rollItem, rollLoot, rollRareDrop, SLOT_IDS, tierPool, type ItemInstance } from '../src/progression';
import { newRun } from '../src/endless/run';
import { parseRun } from '../src/endless/save';
import { heroItemCount, idleHeroLine } from '../src/ui/gear-hover';
import { SLOT_ICON } from '../src/game/item-icons';

const RINGS = ['copper_ring', 'pilgrims_token'];
const TRINKETS = ['saints_medal', 'ashen_locket', 'rabbits_foot', 'wolf_tooth', 'flashpowder_locket', 'clapper_of_the_sunken_bell', 'heart_of_the_forge'];
const REEDGATE = 'dr12';

const inst = (id: string, uid: string): ItemInstance => makeItem(id, uid, new Rng(7));
const map1 = (seed = 3): CampaignState => pickHero(newCampaign({ mode: 'normal', seed }), 'warrior');
const onMap2 = (extra: Partial<CampaignState> = {}): CampaignState => ({ ...map1(), mapId: 'drowned-reach', at: 'dr1', path: ['dr1'], visited: ['dr1'], cleared: [], replays: {}, ...extra });
const memoryKV = (): KV & { store: Map<string, string> } => {
  const store = new Map<string, string>();
  return { store, getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) };
};
/** Eski kaydın kahraman yuvasını kurar: bugünkü kayıt biçiminden `ring` alanı silinir, Ring item'i eski `trinket` yuvasına konur. */
const oldEq = (s: CampaignState, id: string): CampaignState => {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  const eq = t.roster[0]!.equipment as unknown as Record<string, unknown>;
  delete eq.ring;
  eq.trinket = inst(id, 'old1');
  return t;
};

describe('yuva ve item dağılımı', () => {
  it('iki yuva: ring + trinket; ağırlıklar eşit', () => {
    expect(SLOT_IDS).toContain('ring');
    expect(SLOT_IDS).toContain('trinket');
    const w = (id: string) => ITEMS.slots.find((s) => s.id === id)!;
    expect(w('ring')).toMatchObject({ name: 'Ring', weight: 0.8 });
    expect(w('trinket')).toMatchObject({ name: 'Trinket', weight: 0.8 });
  });

  it('item listesi: Ring ve Trinket doğru yuvada, Pilgrim\'s Band adı, id korunur', () => {
    for (const id of RINGS) expect(itemDef(id)?.slot, id).toBe('ring');
    for (const id of TRINKETS) expect(itemDef(id)?.slot, id).toBe('trinket');
    expect(itemDef('pilgrims_token')?.name).toBe("Pilgrim's Band");
    expect(ITEMS.items.filter((d) => d.slot === 'ring').map((d) => d.id).sort()).toEqual([...RINGS].sort());
    expect(ITEMS.items.filter((d) => d.slot === 'trinket').map((d) => d.id).sort()).toEqual([...TRINKETS].sort());
    expect(itemSubtitle(itemDef('copper_ring')!)).toContain('Ring');
  });

  it('trinket\'e izinli her affix ring\'e de izinli; her kademede havuz dolu', () => {
    for (const id of Object.keys(ITEMS.affixDefs)) if (affixAllowed(id, 'trinket')) expect(affixAllowed(id, 'ring'), id).toBe(true);
    for (const t of ['C', 'B', 'A'] as const) expect(tierPool(t, 'ring').sort()).toEqual(tierPool(t, 'trinket').sort());
    const r = rollItem(itemDef('copper_ring')!, new Rng(1), { rarity: 'epic', ilvl: 12 });
    expect(r).toBeTruthy();
  });

  it('boş yuva simgeleri: Ring yüzük, Trinket yüzük değil', () => {
    expect(SLOT_ICON.ring).toBe('ring');
    expect(SLOT_ICON.trinket).not.toBe('ring');
    const panel = readFileSync('src/ui/character-panel.ts', 'utf8');
    expect(panel).toContain("ring: 'Ring', trinket: 'Trinket'");
  });
});

describe('Trinket kilidi (sefer)', () => {
  it('Harita 1 ve Reedgate\'ten önce kilitli; Reedgate\'te açılır; sonraki haritalarda açık; debug açar', () => {
    expect(getMap('drowned-reach').nodes.find((n) => n.opensSlot === 'trinket')?.name).toBe('Reedgate');
    expect(slotOpen(map1(), 'trinket')).toBe(false);
    expect(slotLocks(map1()).trinket).toBe('Opens at Reedgate');
    expect(slotLocks(map1()).ring).toBeUndefined();
    expect(slotOpen(onMap2(), 'trinket')).toBe(false);
    expect(slotOpen(onMap2({ visited: ['dr1', REEDGATE] }), 'trinket')).toBe(true);
    expect(slotOpen(onMap2({ at: REEDGATE }), 'trinket')).toBe(true);
    expect(slotOpen({ ...map1(), mapId: 'hollow-crown' }, 'trinket')).toBe(true);
    expect(slotOpen(debugOpenSlot(map1(), 'trinket'), 'trinket')).toBe(true);
  });

  it('Reedgate tek yol: başlangıçtan haritanın sonuna onu atlayan yol yok', () => {
    const m = getMap('drowned-reach');
    const seen = new Set<string>([REEDGATE]);
    const stack = [m.start];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const e of m.edges) {
        if (e.from === id) stack.push(e.to);
        else if (e.to === id) stack.push(e.from);
      }
    }
    expect(m.nodes.filter((n) => n.type === 'boss' && seen.has(n.id)).map((n) => n.id)).toEqual([]);
  });

  it('bildirim yalnız açan hamlede, tek satır', () => {
    const before = onMap2();
    const after = onMap2({ at: REEDGATE, visited: ['dr1', REEDGATE] });
    const note = slotOpenedNote(before, after);
    expect(note).toMatch(/Trinket/);
    expect(note).not.toContain('\n');
    expect(slotOpenedNote(after, after)).toBeNull();
    expect(slotOpenedNote(before, before)).toBeNull();
  });

  it('kilitliyken takılamaz, Equip best atlar; Ring takılır; açılınca takılır', () => {
    let s = { ...map1(), roster: map1().roster.map((h) => ({ ...h, level: 30 })) };
    const a = addItem(s, 'rabbits_foot');
    const b = addItem(a.state, 'copper_ring');
    s = b.state;
    const hero = s.roster[0]!;
    expect(equipError(hero, a.item, undefined, slotLocks(s))).toMatch(/Reedgate/);
    expect(() => equipItem(s, hero.id, a.item.uid)).toThrow(/Reedgate/);
    const best = equipBest(s, [hero.id]);
    expect(best.roster[0]!.equipment.trinket).toBeNull();
    expect(best.roster[0]!.equipment.ring?.id).toBe('copper_ring');
    expect(best.inventory.map((i) => i.uid)).toContain(a.item.uid);
    const open = debugOpenSlot(s, 'trinket');
    expect(equipItem(open, hero.id, a.item.uid).roster[0]!.equipment.trinket?.id).toBe('rabbits_foot');
    expect(equipBest(open, [hero.id]).roster[0]!.equipment.trinket?.id).toBe('rabbits_foot');
  });

  it('item sayacı kilitli yuvayı saymaz', () => {
    const h = { id: 'h', class: 'warrior', level: 1, equipment: emptyEquipment() };
    expect(idleHeroLine(h).text).toBe('Level 1 · 0/8 items');
    expect(heroItemCount({ ...h, locks: { trinket: 'Opens at Reedgate' } }).total).toBe(7);
  });
});

describe('kayıt göçü: hiçbir item kaybolmaz', () => {
  it('Ring item\'i eski yuvadan ring yuvasına geçer (sefer, her haritada)', () => {
    const got = normalizeState(oldEq(map1(), 'copper_ring'), 0)!;
    expect(got.roster[0]!.equipment.ring?.uid).toBe('old1');
    expect(got.roster[0]!.equipment.trinket).toBeNull();
    expect(got.inventory.some((i) => i.uid === 'old1')).toBe(false);
    expect(normalizeState(got, 0)).toEqual(got); // idempotent
  });

  it('kilitliyken takılı Trinket torbaya döner, yarım savaş atılır; torba dolu olsa da kaybolmaz', () => {
    const s = oldEq(map1(), 'rabbits_foot');
    s.inventory = Array.from({ length: 200 }, (_, i) => inst('flanged_mace', `b${i}`));
    const got = normalizeState({ ...s, suspended: { node: s.at } } as unknown as CampaignState, 0)!;
    expect(got.roster[0]!.equipment.trinket).toBeNull();
    expect(got.inventory.filter((i) => i.uid === 'old1')).toHaveLength(1);
    expect(got.inventory).toHaveLength(201);
    expect(got.suspended).toBeUndefined();
    expect(got.nextItemId).toBeGreaterThan(0);
  });

  it('Reedgate geçilmiş kayıtta Trinket yerinde kalır; sonraki haritada da', () => {
    const open = normalizeState(oldEq(onMap2({ visited: ['dr1', REEDGATE] }), 'rabbits_foot'), 0)!;
    expect(open.roster[0]!.equipment.trinket?.uid).toBe('old1');
    const before = normalizeState(oldEq(onMap2(), 'rabbits_foot'), 0)!;
    expect(before.roster[0]!.equipment.trinket).toBeNull();
    expect(before.inventory.some((i) => i.uid === 'old1')).toBe(true);
  });

  it('yedek ve Inn kahramanları da taşınır', () => {
    const base = map1();
    const hero = JSON.parse(JSON.stringify({ ...base.roster[0]!, id: 'res1' })) as CampaignState['roster'][number];
    const eq = hero.equipment as unknown as Record<string, unknown>;
    delete eq.ring;
    eq.trinket = inst('copper_ring', 'res-ring');
    const inn = JSON.parse(JSON.stringify({ ...hero, id: 'inn1' })) as CampaignState['roster'][number];
    (inn.equipment as unknown as Record<string, unknown>).trinket = inst('wolf_tooth', 'inn-t');
    const got = normalizeState({ ...base, reserve: [hero], inn: [{ hero: inn, mapId: 'valdoria', town: 'x', day: 1 }] }, 0)!;
    expect(got.reserve![0]!.equipment.ring?.uid).toBe('res-ring');
    expect(got.inn![0]!.hero.equipment.trinket).toBeNull();
    expect(got.inventory.some((i) => i.uid === 'inn-t')).toBe(true);
  });

  it('dosya sürüm 13 okunur, yeniye taşınmış sayılır', () => {
    expect(SAVE_VERSION).toBe(14);
    const kv = memoryKV();
    const s = oldEq(map1(), 'pilgrims_token');
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 13, counter: 1, lastSlot: 0, slots: [{ campaignId: s.campaignId, mode: 'normal', difficulty: 'medium', startedAt: 't', lastPlayed: 't', saves: [{ id: 'y', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: s.campaignId, summary: {}, state: s }] }, null, null] }));
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    expect(r.file.slots[0]!.saves[0]!.state.roster[0]!.equipment.ring?.uid).toBe('old1');
  });

  it('migrateRingSlot: ring doluysa taşınan torbaya', () => {
    const eq = { ...emptyEquipment(), ring: inst('copper_ring', 'a'), trinket: inst('pilgrims_token', 'b') };
    const over: ItemInstance[] = [];
    expect(migrateRingSlot(eq, over)).toBe(1);
    expect(eq.ring!.uid).toBe('a');
    expect(eq.trinket).toBeNull();
    expect(over.map((i) => i.uid)).toEqual(['b']);
    expect(migrateRingSlot(eq, over)).toBe(0);
  });

  it('Endless: Ring taşınır, Trinket yerinde kalır (kilit yok)', () => {
    const run = newRun(4, ['warrior', 'mage', 'archer', 'paladin'], 't');
    run.heroes[0]!.equipment.trinket = inst('copper_ring', 'er');
    run.heroes[1]!.equipment.trinket = inst('rabbits_foot', 'et');
    const got = parseRun(JSON.stringify({ version: 7, run }))!;
    expect(got.heroes[0]!.equipment.ring?.uid).toBe('er');
    expect(got.heroes[0]!.equipment).not.toHaveProperty('trinket');
    expect(got.heroes[1]!.equipment.trinket?.uid).toBe('et');
  });
});

describe('düşüş kuralları', () => {
  const party = [{ class: 'warrior', equipment: {} }, { class: 'mage', equipment: {} }];
  const slotsOf = (rules: Parameters<typeof rollDropBase>[4], ilvl = 10, n = 6000): Record<string, number> => {
    const rng = new Rng(11);
    const out: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const p = rollDropBase(rng, party, ilvl, undefined, rules)!;
      out[p.def.slot] = (out[p.def.slot] ?? 0) + 1;
    }
    return out;
  };

  it('Harita 1 yasağı: Trinket hiç düşmez, Ring düşer (düşük seviyedeki yedek yollar dahil)', () => {
    expect(noDropSlots('valdoria')).toEqual(['trinket']);
    expect(noDropSlots('drowned-reach')).toEqual([]);
    for (const ilvl of [1, 2, 4, 10, 30]) {
      const got = slotsOf({ banned: ['trinket'] }, ilvl, 3000);
      expect(got.trinket ?? 0, `ilvl ${ilvl}`).toBe(0);
      if (ilvl >= 4) expect(got.ring ?? 0, `ilvl ${ilvl}`).toBeGreaterThan(0);
    }
  });

  it('akıllı yuva kilitli yuvayı hedeflemez: tüm yuvalar doluyken bile en zayıf olarak seçilmez', () => {
    // Trinket dışındaki yuvalar dolu, Trinket boş: kilit yoksa akıllı seçim hep Trinket'i bulur
    const eq = { ...emptyEquipment() };
    for (const k of SLOT_IDS) if (k !== 'trinket') eq[k] = inst(ITEMS.items.find((d) => d.slot === k && d.rarity !== 'legendary' && (k !== 'weapon' && k !== 'offhand' ? true : canEquip('warrior', d)))!.id, `e-${k}`);
    const p = [{ class: 'warrior', equipment: eq }];
    const count = (rules: Parameters<typeof rollDropBase>[4]) => {
      const rng = new Rng(5);
      let n = 0;
      for (let i = 0; i < 4000; i++) if (rollDropBase(rng, p, 12, undefined, rules)!.def.slot === 'trinket') n++;
      return n;
    };
    const free = count(undefined);
    const locked = count({ locks: { trinket: 'x' } });
    expect(free).toBeGreaterThan(2000); // %50 akıllı + rastgele pay
    expect(locked).toBeLessThan(600); // yalnız rastgele pay (1/8)
    expect(locked).toBeGreaterThan(0); // Harita 2 başı: rastgele düşebilir, yasak yalnız Harita 1
  });

  it('sefer Harita 1: grantLoot, hediye ve tüccar Trinket vermez; Legendary havuzunda da yok', () => {
    let trinkets = 0;
    let rings = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const s = map1(seed);
      const t = JSON.parse(JSON.stringify(s)) as CampaignState;
      t.inventory = [];
      const party = t.roster;
      const node = getMap('valdoria').nodes.filter((n) => n.type === 'boss').at(-1)!.id;
      grantLoot(t, node, 'boss', party);
      grantGift(t, node, party, `g${seed}`, 'common');
      for (const it of t.inventory) {
        const sl = itemDef(it.id)?.slot;
        if (sl === 'trinket') trinkets++;
        if (sl === 'ring') rings++;
      }
    }
    expect(trinkets).toBe(0);
    expect(rings).toBeGreaterThan(0);
    const town = getMap('valdoria').nodes.filter((n) => n.merchant);
    expect(town.length).toBeGreaterThan(0);
    const wares: string[] = [];
    for (const n of town) for (let r = 0; r < 30; r++) wares.push(...campaignStock(map1(), n.id, r).map((w) => w.itemId));
    expect(wares.filter((id) => itemDef(id)?.slot === 'trinket')).toEqual([]);
    expect(wares.filter((id) => itemDef(id)?.slot === 'ring').length).toBeGreaterThan(0);
    // Harita 1 bölümünde Legendary Trinket çıkmaz (minChapter 2 / 3, eventOnly)
    const rng = new Rng(9);
    for (let i = 0; i < 5000; i++) {
      const r = rollRareDrop({ rng, kind: 'boss', misses: 999, chapter: 1 });
      if (r.item) expect(itemDef(r.item)?.slot).not.toBe('trinket');
    }
  });

  it('eski Harita 1 kaydının rafındaki Trinket atılır', () => {
    const s = map1();
    const w = { itemId: 'rabbits_foot', price: 10, since: 0 };
    const k = { itemId: 'copper_ring', price: 10, since: 0 };
    const got = normalizeState({ ...s, merchantStock: { 'valdoria:x': { wares: [w, k], rerolls: 0, day: 0 } } }, 0)!;
    expect(got.merchantStock!['valdoria:x']!.wares.map((x) => x.itemId)).toEqual(['copper_ring']);
  });

  it('sefer Harita 2 başı: yasak yok, akıllı seçim kilitli yuvayı atlar (rollLoot kurallı çalışır)', () => {
    const r = rollLoot({ rng: new Rng(2), kind: 'boss', chapter: 2, ilvl: 12, party, rules: { locks: slotLocks(onMap2()), banned: noDropSlots('drowned-reach') } });
    expect(r.items.length).toBeGreaterThan(0);
  });

  it('Endless: iki yuva da baştan açık, Trinket ve Ring takılabilir', () => {
    const run = newRun(4, ['warrior', 'mage', 'archer', 'paladin'], 't');
    expect(run.heroes.length).toBe(4);
    const got = slotsOf(undefined);
    expect(got.ring ?? 0).toBeGreaterThan(0);
    expect(got.trinket ?? 0).toBeGreaterThan(0);
  });
});

describe('çift el topuzlar', () => {
  it('veri ve kural', () => {
    expect(itemDef('great_mace')).toMatchObject({ name: 'Great Mace', slot: 'weapon', family: 'maces', grip: 'two', rarity: 'common', ilvl: 4 });
    expect(itemDef('long_hafted_mace')).toMatchObject({ name: 'Long-Hafted Mace', slot: 'weapon', family: 'maces', grip: 'two', rarity: 'rare', ilvl: 10 });
    for (const id of ['great_mace', 'long_hafted_mace']) {
      const d = itemDef(id)!;
      expect(isTwoHandMelee(d), id).toBe(true);
      expect(gripOf(d)).toBe('two');
      expect(canEquip('warrior', d)).toBe(true);
    }
  });

  it('ilvl 10: Warrior silahlarında çift el payı bellidir (ölçüm grip-drops; gripWeight değişmedi)', () => {
    const rng = new Rng(77);
    const party = [{ class: 'warrior', equipment: {} }];
    let two = 0;
    let one = 0;
    for (let i = 0; i < 60000; i++) {
      const d = rollDropBase(rng, party, 10)!.def;
      if (d.slot === 'weapon' && canEquip('warrior', d)) {
        if (d.grip === 'two') two++;
        else one++;
      }
    }
    const share = two / (two + one);
    expect(share).toBeGreaterThan(0.6);
    expect(share).toBeLessThan(0.75);
  });
});
