import { describe, expect, it } from 'vitest';
import { endlessBagSize, equipBestRun, equipFromBag, newRun as newRunBase, parseRun, bagOf, type EndlessRun } from '../src/endless';
import { newCampaign, normalizeState, pickHero } from '../src/campaign';
import {
  GRIP_IDS,
  ITEMS,
  LEGENDARY_LIMIT_MSG,
  bestMoves,
  canEquip,
  defaultEquipSlot,
  emptyEquipment,
  fitsSlot,
  gripOf,
  isPlanError,
  itemDef,
  itemSubtitle,
  migrateOffhand,
  planEquip,
  rollLoot,
  validateItems,
  type ItemInstance,
} from '../src/progression';
import { Rng } from '../src/engine';
import { dropAction } from '../src/ui/gear-drop';
import { heroItemLine } from '../src/ui/gear-hover';
import { buildMechanics } from '../src/wiki/catalog';
import { leveledRun } from './level-helpers';

/** Seviye şartı (ilvl - 3; Item Güçlendirme x6) bu testlerin konusu değil: koşu kahramanları yüksek seviyede. */
const newRun = (...a: Parameters<typeof newRunBase>): ReturnType<typeof newRunBase> => leveledRun(newRunBase(...a));

// Tutuş + ikinci el yuvası (Ömer onayı 2026-10-12, future-ideas 'Silah ve tutuş kuralları').

const it_ = (id: string, uid = id): ItemInstance => ({ uid, id });
const eq = (o: Partial<Record<string, ItemInstance>>) => ({ ...emptyEquipment(), ...o });

describe('grip data', () => {
  it('every weapon has a grip; the approved grips', () => {
    expect(validateItems()).toEqual([]);
    for (const d of ITEMS.items.filter((x) => x.slot === 'weapon')) expect(GRIP_IDS, d.id).toContain(d.grip);
    const g = (id: string) => itemDef(id)!.grip;
    for (const id of ['dane_axe', 'avengers_maul', 'ash_staff', 'oak_staff', 'bone_staff', 'rune_staff', 'staff_of_the_last_ember']) expect(g(id), id).toBe('two');
    for (const id of ['woodcutters_axe', 'arming_sword', 'emberbrand', 'flanged_mace', 'morning_star', 'rondel_dagger', 'twin_stilettos', 'serrated_edge']) expect(g(id), id).toBe('one');
    for (const id of ['short_bow', 'hunting_bow', 'yew_longbow', 'windrunner_longbow']) expect(g(id), id).toBe('bow');
    for (const id of ['worn_deck', 'loaded_bones', 'hex_doll', 'gamblers_last_coin', 'bones_of_the_quarry']) expect(g(id), id).toBe('charm');
    expect(itemDef('oak_shield')!.slot).toBe('offhand');
    expect(itemDef('oathkeepers_bulwark')!.slot).toBe('offhand');
    expect(itemSubtitle(itemDef('dane_axe')!)).toContain('Two-handed');
    expect(itemSubtitle(itemDef('oak_shield')!)).toContain('Off-hand');
  });

  it('a weapon without a grip fails validation', () => {
    const items = ITEMS.items.map((d) => (d.id === 'short_bow' ? { ...d, grip: undefined } : d));
    expect(validateItems({ ...ITEMS, items }).join()).toMatch(/short_bow: weapon needs a grip/);
  });
});

describe('off-hand rules', () => {
  it('shields: defender / paladin / warrior; daggers in the off-hand: cutthroat / antimage', () => {
    const shield = itemDef('oak_shield')!;
    for (const c of ['defender', 'paladin', 'warrior']) expect(canEquip(c, shield), c).toBe(true);
    for (const c of ['mage', 'archer', 'cutthroat']) expect(canEquip(c, shield), c).toBe(false);
    const dagger = itemDef('rondel_dagger')!;
    expect(fitsSlot(dagger, 'offhand')).toBe(true);
    expect(fitsSlot(itemDef('arming_sword')!, 'offhand')).toBe(false);
    expect(fitsSlot(itemDef('flanged_mace')!, 'offhand')).toBe(false);
    expect(isPlanError(planEquip('cutthroat', eq({ weapon: it_('misericorde') }), it_('rondel_dagger'), 'offhand'))).toBe(false);
    expect(isPlanError(planEquip('warrior', eq({ weapon: it_('arming_sword') }), it_('rondel_dagger'), 'offhand'))).toBe(true);
  });

  it('one-handed or empty main hand allows the off-hand; two-handed / bow / charm block it', () => {
    expect(isPlanError(planEquip('warrior', eq({}), it_('oak_shield')))).toBe(false);
    expect(isPlanError(planEquip('warrior', eq({ weapon: it_('arming_sword') }), it_('oak_shield')))).toBe(false);
    const blocked = planEquip('warrior', eq({ weapon: it_('dane_axe') }), it_('oak_shield'));
    expect(isPlanError(blocked) && blocked.error).toMatch(/two-handed: no hand free/);
    // çift el takılınca ikinci el çıkar
    const p = planEquip('warrior', eq({ weapon: it_('arming_sword'), offhand: it_('oak_shield') }), it_('dane_axe'));
    expect(isPlanError(p)).toBe(false);
    if (!isPlanError(p)) {
      expect(p.displaced.map((x) => x.id)).toEqual(['oak_shield']);
      expect(p.equipment.offhand).toBeNull();
      expect(p.replaced?.id).toBe('arming_sword');
    }
  });

  it('default slot: a dagger goes to the main hand first, then an empty off-hand', () => {
    const d = itemDef('rondel_dagger')!;
    expect(defaultEquipSlot(eq({}), d)).toBe('weapon');
    expect(defaultEquipSlot(eq({ weapon: it_('misericorde') }), d)).toBe('offhand');
    expect(defaultEquipSlot(eq({ weapon: it_('misericorde'), offhand: it_('serrated_edge') }), d)).toBe('weapon');
    expect(defaultEquipSlot(eq({}), itemDef('oak_shield')!)).toBe('offhand');
  });

  it('one Legendary per hero counts the off-hand, but not one the two-hander displaces', () => {
    const p = planEquip('cutthroat', eq({ weapon: it_('whisper_of_morvane') }), it_('serrated_edge'), 'offhand');
    expect(isPlanError(p) && p.error).toBe(LEGENDARY_LIMIT_MSG);
    const q = planEquip('paladin', eq({ offhand: it_('oathkeepers_bulwark') }), it_('avengers_maul'));
    expect(isPlanError(q)).toBe(false);
  });

  it('Equip best fills the off-hand and weighs a two-hander against weapon + shield', () => {
    const moves = bestMoves({ class: 'warrior', equipment: emptyEquipment() }, [it_('arming_sword', 'a'), it_('oak_shield', 'b')]);
    expect(moves).toEqual(expect.arrayContaining([{ slot: 'weapon', uid: 'a' }, { slot: 'offhand', uid: 'b' }]));
    const cut = bestMoves({ class: 'cutthroat', equipment: emptyEquipment() }, [it_('misericorde', 'a'), it_('rondel_dagger', 'b')]);
    expect(cut.map((m) => m.slot).sort()).toEqual(['offhand', 'weapon']);
    // çift el seçildiyse ikinci el önerilmez
    const two = bestMoves({ class: 'warrior', equipment: emptyEquipment() }, [it_('dane_axe', 'a'), it_('oak_shield', 'b')]);
    if (two.some((m) => m.uid === 'a')) expect(two.some((m) => m.slot === 'offhand')).toBe(false);
  });

  it('drag-and-drop: a dagger may drop on the off-hand slot, a sword may not', () => {
    const cls = () => 'cutthroat';
    expect(dropAction({ kind: 'bag', uid: 'x', itemId: 'rondel_dagger' }, { kind: 'slot', heroId: 'h', slot: 'offhand' }, cls)).toEqual({ kind: 'equip', heroId: 'h', uid: 'x', slot: 'offhand' });
    expect(dropAction({ kind: 'bag', uid: 'x', itemId: 'arming_sword' }, { kind: 'slot', heroId: 'h', slot: 'offhand' }, () => 'warrior')).toEqual({ kind: 'none', reason: 'Wrong slot' });
    expect(dropAction({ kind: 'bag', uid: 'x', itemId: 'oak_shield' }, { kind: 'slot', heroId: 'h', slot: 'offhand' }, () => 'warrior').kind).toBe('equip');
  });

  it('hero line: 7 slots, "Hands full" under a two-hander', () => {
    const h = { id: 'h', class: 'warrior', level: 1, equipment: eq({ weapon: it_('dane_axe') }) };
    expect(heroItemLine(h, null).text).toBe('Level 1 · 1/7 items');
    expect(heroItemLine(h, it_('oak_shield', 's')).text).toBe('Hands full');
  });

  it('loot can drop shields for a party with shield users', () => {
    let shields = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = rollLoot({ rng: new Rng(seed), kind: 'treasure', chapter: 1, ilvl: 10, party: [{ class: 'defender', equipment: { weapon: it_('flanged_mace') } }] });
      shields += r.items.filter((id) => itemDef(id)?.slot === 'offhand').length;
    }
    expect(shields).toBeGreaterThan(0);
  });

  it('Codex mentions grip and the off-hand', () => {
    const text = JSON.stringify(buildMechanics());
    expect(text).toContain('Off-hand slot');
  });
});

describe('Endless off-hand', () => {
  const fresh = (): EndlessRun => newRun(41, ['warrior', 'archer', 'mage', 'cutthroat'], '2026-10-12T00:00:00.000Z');
  const withBag = (run: EndlessRun, ids: string[]): EndlessRun => ({ ...run, bag: ids.map((id, i) => ({ uid: `b${i}`, id })), nextItem: ids.length + 1 });

  it('two-hander sends the shield back to the bag; full bag blocks with a message', () => {
    const w = fresh().heroes.find((h) => h.class === 'warrior')!;
    let r = withBag(fresh(), ['arming_sword', 'oak_shield', 'dane_axe']);
    r = equipFromBag(r, w.id, 'b0');
    r = equipFromBag(r, w.id, 'b1');
    expect(r.heroes.find((h) => h.id === w.id)!.equipment.offhand?.id).toBe('oak_shield');
    const after = equipFromBag(r, w.id, 'b2');
    const hw = after.heroes.find((h) => h.id === w.id)!;
    expect(hw.equipment.weapon?.id).toBe('dane_axe');
    expect(hw.equipment.offhand).toBeUndefined();
    expect(bagOf(after).map((i) => i.id).sort()).toEqual(['arming_sword', 'oak_shield', 'woodcutters_axe']); // başlangıç baltası ilk takışta torbaya döndü
    // dolu torba: kılıç + kalkan torbaya dönmeli (bir fazla) -> açık mesajla engel
    const size = endlessBagSize();
    const full = { ...r, bag: [...bagOf(r), ...Array.from({ length: size - bagOf(r).length }, (_, i) => ({ uid: `f${i}`, id: 'rondel_dagger' }))] };
    expect(() => equipFromBag(full, w.id, 'b2')).toThrow(/Bag is full: no room for Oak Tower Shield/);
  });

  it('Equip best (Endless) gives the cutthroat a second dagger', () => {
    const c = fresh().heroes.find((h) => h.class === 'cutthroat')!;
    const r = equipBestRun(withBag(fresh(), ['misericorde', 'rondel_dagger']), [c.id]);
    const hc = r.heroes.find((h) => h.id === c.id)!;
    expect([hc.equipment.weapon?.id, hc.equipment.offhand?.id].sort()).toEqual(['misericorde', 'rondel_dagger']);
  });

  it('old save: a shield in the weapon slot moves to the off-hand', () => {
    const w = fresh().heroes.find((h) => h.class === 'warrior')!;
    const run = fresh();
    run.heroes.find((h) => h.id === w.id)!.equipment = { weapon: { uid: 'old', id: 'oak_shield' } };
    const back = parseRun(JSON.stringify({ version: 4, run }))!;
    const hw = back.heroes.find((h) => h.id === w.id)!;
    expect(hw.equipment.offhand?.id).toBe('oak_shield');
    expect(hw.equipment.weapon).toBeUndefined();
    const e: Record<string, ItemInstance | null> = { weapon: it_('oak_shield'), offhand: it_('rondel_dagger') };
    const spill: ItemInstance[] = [];
    expect(migrateOffhand(e, spill)).toBe(1);
    expect(spill.map((x) => x.id)).toEqual(['rondel_dagger']);
    expect(migrateOffhand(e, spill)).toBe(0);
    expect(gripOf(itemDef('oak_shield')!)).toBeUndefined();
  });
});

describe('campaign off-hand save migration', () => {
  it('a shield equipped in the weapon slot moves to the off-hand; old heroes get an empty off-hand', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 7, campaignId: 'c7' }), 'warrior');
    const raw = JSON.parse(JSON.stringify(s)) as { roster: Array<{ equipment: Record<string, unknown> }> };
    const e = raw.roster[0]!.equipment;
    delete e.offhand; // eski kayıt: yuva yok
    e.weapon = { uid: 'i90', id: 'oak_shield' };
    const back = normalizeState(raw)!;
    expect(back).not.toBeNull();
    expect(back.roster[0]!.equipment.offhand?.id).toBe('oak_shield');
    expect(back.roster[0]!.equipment.weapon).toBeNull();
  });
});
