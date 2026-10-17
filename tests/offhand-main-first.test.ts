import { describe, expect, it } from 'vitest';
import { bagOf, equipBestRun, equipFromBag, newRun as newRunBase, parseRun, unequipToBag, type EndlessRun } from '../src/endless';
import { equipBest, equipItem, newCampaign, normalizeState, pickHero, unequipItem, type CampaignState } from '../src/campaign';
import { ITEMS, bestMoves, canEquip, defaultEquipSlot, emptyEquipment, isPlanError, itemDef, makeItem, planEquip, type ItemInstance } from '../src/progression';
import { Rng } from '../src/engine';
import { leveledCampaign, leveledRun } from './level-helpers';

/** Seviye şartı (ilvl - 3; Item Güçlendirme x6) bu testlerin konusu değil: koşu kahramanları yüksek seviyede. */
const newRun = (...a: Parameters<typeof newRunBase>): ReturnType<typeof newRunBase> => leveledRun(newRunBase(...a));

// Ömer 2026-10-14 (0.7.11.2, telefonda sefer): ana el + ikinci el boşken silah ikinci ele gitmemeli; ana el önce dolar.

const isWeapon = (inst: ItemInstance | null | undefined) => !!inst && itemDef(inst.id)?.slot === 'weapon';
const BAGS: Record<string, string[][]> = {
  warrior: [['woodcutters_axe'], ['arming_sword', 'bearded_axe'], ['flanged_mace', 'oak_shield'], ['dane_axe', 'oak_shield']],
  hexer: [['worn_deck'], ['worn_deck', 'loaded_bones']],
  mage: [['ash_staff'], ['ash_staff', 'oak_staff']],
  antimage: [['rondel_dagger'], ['misericorde'], ['serrated_edge'], ['rondel_dagger', 'misericorde'], ['woodcutters_axe', 'rondel_dagger'], ['twin_stilettos', 'arming_sword']],
  cutthroat: [['rondel_dagger'], ['misericorde', 'rondel_dagger']],
};

describe('empty hands: a weapon fills the main hand first', () => {
  it('bestMoves always fills the empty main hand (fixed bags, several rolls)', () => {
    for (const [cls, bags] of Object.entries(BAGS))
      for (const ids of bags)
        for (let seed = 1; seed <= 12; seed++) {
          const bag = ids.map((id, i) => makeItem(id, `u${i}`, new Rng(seed * 31 + i)));
          const moves = bestMoves({ class: cls, equipment: emptyEquipment() }, bag);
          expect(moves.some((m) => m.slot === 'weapon'), `${cls} ${ids.join('+')} #${seed}`).toBe(true);
        }
  });

  it('random bags: Equip best never puts a weapon in the off-hand with an empty main hand', () => {
    for (const cls of ['warrior', 'hexer', 'antimage', 'mage', 'cutthroat']) {
      const pool = ITEMS.items.filter((d) => (d.slot === 'weapon' || d.slot === 'offhand') && canEquip(cls, d));
      for (let seed = 1; seed <= 40; seed++) {
        const rng = new Rng(seed);
        const bag = Array.from({ length: 1 + (seed % 3) }, (_, i) => makeItem(pool[Math.floor(rng.next() * pool.length)]!.id, `u${i}`, rng));
        const moves = bestMoves({ class: cls, equipment: emptyEquipment() }, bag);
        const o = moves.find((m) => m.slot === 'offhand');
        if (o && isWeapon(bag.find((b) => b.uid === o.uid))) expect(moves.some((m) => m.slot === 'weapon'), `${cls} #${seed}`).toBe(true);
      }
    }
  });

  it('default slot / planEquip without a slot: main hand', () => {
    for (const [cls, bags] of Object.entries(BAGS))
      for (const ids of bags)
        for (const id of ids) {
          const d = itemDef(id)!;
          if (d.slot !== 'weapon') continue;
          expect(defaultEquipSlot(emptyEquipment(), d), `${cls} ${id}`).toBe('weapon');
          const p = planEquip(cls, emptyEquipment(), { uid: 'x', id });
          expect(!isPlanError(p) && p.slot, `${cls} ${id}`).toBe('weapon');
        }
  });

  it('explicit off-hand drop with an empty main hand goes to the main hand; with a main weapon it dual-wields', () => {
    const p = planEquip('antimage', emptyEquipment(), { uid: 'x', id: 'rondel_dagger' }, 'offhand');
    expect(!isPlanError(p) && p.slot).toBe('weapon');
    const q = planEquip('antimage', { ...emptyEquipment(), weapon: { uid: 'a', id: 'woodcutters_axe' } }, { uid: 'x', id: 'rondel_dagger' }, 'offhand');
    expect(!isPlanError(q) && q.slot).toBe('offhand');
    // kalkan ikinci elde kalır (silah değil)
    const s = planEquip('warrior', emptyEquipment(), { uid: 'x', id: 'oak_shield' }, 'offhand');
    expect(!isPlanError(s) && s.slot).toBe('offhand');
  });
});

describe('campaign + Endless paths', () => {
  const camp = (cls: string, ids: string[]): { s: CampaignState; id: string } => {
    const s = leveledCampaign(pickHero(newCampaign({ mode: 'normal', seed: 7, campaignId: 'c7' }), 'warrior'));
    const h = s.roster[0]!;
    h.class = cls; // Anti-Mage başlangıç havuzunda değil: sınıfı elle
    h.equipment = emptyEquipment();
    s.inventory = ids.map((id, i) => ({ uid: `b${i}`, id }));
    return { s, id: h.id };
  };

  it('campaign Equip best / Equip / off-hand drop with one dagger: main hand', () => {
    for (const how of ['best', 'equip', 'drop'] as const) {
      const { s, id } = camp('antimage', ['rondel_dagger']);
      const t = how === 'best' ? equipBest(s, [id]) : equipItem(s, id, 'b0', how === 'drop' ? 'offhand' : undefined);
      const h = t.roster.find((x) => x.id === id)!;
      expect(h.equipment.weapon?.id, how).toBe('rondel_dagger');
      expect(h.equipment.offhand ?? null, how).toBeNull();
    }
  });

  it('removing the main weapon moves the off-hand dagger into the main hand; old saves are repaired', () => {
    const { s, id } = camp('antimage', ['woodcutters_axe', 'rondel_dagger']);
    let t = equipItem(s, id, 'b0');
    t = equipItem(t, id, 'b1');
    expect(t.roster[0]!.equipment.offhand?.id).toBe('rondel_dagger');
    t = unequipItem(t, id, 'weapon');
    expect(t.roster[0]!.equipment.weapon?.id).toBe('rondel_dagger');
    expect(t.roster[0]!.equipment.offhand).toBeNull();
    // kalkan ikinci elde kalır
    const w = camp('warrior', ['flanged_mace', 'oak_shield']);
    let u = equipItem(equipItem(w.s, w.id, 'b0'), w.id, 'b1');
    u = unequipItem(u, w.id, 'weapon');
    expect(u.roster[0]!.equipment.offhand?.id).toBe('oak_shield');
    // eski kayıt: hançer tek başına ikinci elde
    const raw = JSON.parse(JSON.stringify(camp('antimage', []).s)) as { roster: Array<{ equipment: Record<string, unknown> }> };
    raw.roster[0]!.equipment.offhand = { uid: 'i90', id: 'misericorde' };
    const back = normalizeState(raw)!;
    expect(back.roster[0]!.equipment.weapon?.id).toBe('misericorde');
    expect(back.roster[0]!.equipment.offhand).toBeNull();
  });

  it('Endless: Equip best / equip / unequip / old save', () => {
    const fresh = (): EndlessRun => newRun(41, ['warrior', 'hexer', 'antimage', 'mage'], '2026-10-14T00:00:00.000Z');
    const prep = (ids: string[]): { r: EndlessRun; id: string } => {
      const r = fresh();
      const h = r.heroes.find((x) => x.class === 'antimage')!;
      h.equipment = {};
      return { r: { ...r, bag: ids.map((id, i) => ({ uid: `b${i}`, id })), nextItem: ids.length + 1 }, id: h.id };
    };
    const hero = (r: EndlessRun, id: string) => r.heroes.find((x) => x.id === id)!;
    let { r, id } = prep(['rondel_dagger']);
    expect(hero(equipBestRun(r, [id]), id).equipment.weapon?.id).toBe('rondel_dagger');
    expect(hero(equipFromBag(r, id, 'b0', 'offhand'), id).equipment.weapon?.id).toBe('rondel_dagger');
    ({ r, id } = prep(['woodcutters_axe', 'rondel_dagger']));
    r = equipFromBag(equipFromBag(r, id, 'b0'), id, 'b1');
    r = unequipToBag(r, id, 'weapon');
    expect(hero(r, id).equipment.weapon?.id).toBe('rondel_dagger');
    expect(hero(r, id).equipment.offhand).toBeUndefined();
    expect(bagOf(r).map((i) => i.id)).toEqual(['woodcutters_axe']);
    const old = fresh();
    const h = old.heroes.find((x) => x.class === 'antimage')!;
    h.equipment = { offhand: { uid: 'o', id: 'misericorde' } };
    const back = hero(parseRun(JSON.stringify({ version: 4, run: old }))!, h.id);
    expect(back.equipment.weapon?.id).toBe('misericorde');
    expect(back.equipment.offhand).toBeUndefined();
  });
});
