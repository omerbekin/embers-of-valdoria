import { describe, expect, it } from 'vitest';
import { memoryKV, newCampaign, pickHero, readSaves, reforgeBlocked, reforgeChoices, reforgeItem, SAVE_KEY, temperItem, writeSave, type CampaignState } from '../src/campaign';
import { Rng } from '../src/engine';
import { affixFit } from '../src/progression/affix-fit';
import { ITEMS, SLOT_IDS, affixDef, drawAffix, drawEntries, instanceRoll, itemDef, legacyRoll, loadout, rolledAffixes, rollItem, tierPool, validateItems, type AffixTier, type ItemDef, type ItemInstance, type SlotId } from '../src/progression';

// Affix dağılımı (Ömer 2026-11-01, item-design-plan.md D1 D2 D3 D4): yuva tablosu birebir, direnç tek çekiliş, sınıf ağırlığı B ve A'da da, eski item affix'ini korur.

const RES = ['c_res_fire', 'c_res_ice', 'c_res_holy', 'c_res_dark', 'c_res_nature', 'c_res_light'];
const TABLE: Record<SlotId, Record<AffixTier, string[]>> = {
  weapon: {
    C: ['c_phys', 'c_fire', 'c_ice', 'c_holy', 'c_arcane', 'c_nature', 'c_dark', 'c_lightning', 'c_acc', 'c_dot'],
    B: ['b_critdmg', 'b_tier', 'b_pen', 'b_mpen', 'b_front', 'b_back', 'b_execute', 'b_shred', 'b_blockbreak'],
    A: ['a_primary', 'a_gdmg', 'a_allelem', 'a_keen', 'a_potency', 'a_summon', 'a_pierce', 'a_overkill'],
  },
  offhand: {
    C: ['c_armor', 'c_hpregen', 'c_shield', 'c_block', ...RES],
    B: ['b_marmor', 'b_resil', 'b_thorns', 'b_startshield'],
    A: ['a_gdef', 'a_hppct', 'a_auradef', 'a_support', 'a_column', 'a_immunity'],
  },
  helm: {
    C: ['c_armor', 'c_hp', 'c_mp', 'c_healrecv', ...RES],
    B: ['b_marmor', 'b_mpcost', 'b_resil', 'b_tier_def', 'b_wound_soft'],
    A: ['a_primary', 'a_gdef', 'a_hppct', 'a_ultcd', 'a_immunity', 'a_mana', 'a_resource', 'a_manashield', 'a_cdchance'],
  },
  armor: {
    C: ['c_armor', 'c_hp', 'c_hpregen', 'c_healrecv', ...RES],
    B: ['b_marmor', 'b_resil', 'b_thorns', 'b_tier_def', 'b_wound_soft', 'b_startshield', 'b_killheal'],
    A: ['a_allattr', 'a_gdef', 'a_hppct', 'a_auradmg', 'a_auradef', 'a_recovery', 'a_endure', 'a_column', 'a_manashield'],
  },
  gloves: {
    C: ['c_acc', 'c_eva', 'c_mpregen', 'c_armor', 'c_dot'],
    B: ['b_crit', 'b_leech', 'b_manaleech', 'b_execute', 'b_killmp', 'b_blockbreak'],
    A: ['a_gdmg', 'a_speedpct', 'a_keen', 'a_steady', 'a_cdchance'],
  },
  boots: {
    C: ['c_hp', 'c_eva', 'c_mp', 'c_armor', 'c_hpregen'],
    B: ['b_speed', 'b_initiative', 'b_resil', 'b_wound_soft'],
    A: ['a_allattr', 'a_speedpct', 'a_recovery', 'a_endure', 'a_steady'],
  },
  ring: {
    C: ['c_mp', 'c_mpregen', 'c_hpregen'],
    B: ['b_speed', 'b_mpcost'],
    A: ['a_primary', 'a_allattr', 'a_gdmg', 'a_allelem', 'a_mana', 'a_resource', 'a_summon', 'a_speedpct'],
  },
  trinket: {
    C: ['c_shield', 'c_dot', 'c_healrecv'],
    B: ['b_initiative', 'b_killmp', 'b_killheal', 'b_startshield'],
    A: ['a_support', 'a_potency', 'a_immunity', 'a_endure', 'a_recovery', 'a_cdchance', 'a_ultcd'],
  },
};

const base = (slot: SlotId, main?: string): ItemDef => ITEMS.items.find((d) => d.slot === slot && d.rarity !== 'legendary' && !d.effect && (!main || d.main === main))!;
/** Sayaç: her çekilişte yeni seed'li Rng (N kez). */
const tally = (n: number, draw: (rng: Rng) => string): Map<string, number> => {
  const m = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const id = draw(new Rng(1000 + i * 7));
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
};

describe('D1 + D3: yuva tablosu', () => {
  for (const slot of SLOT_IDS) {
    for (const tier of ['C', 'B', 'A'] as const) {
      it(`${slot} ${tier} havuzu tablodaki gibi`, () => {
        expect([...tierPool(tier, slot)].sort()).toEqual([...TABLE[slot][tier]].sort());
      });
    }
  }

  it('her affix açık yuva listesi taşır, hiçbir affix havuz dışı kalmaz, doğrulayıcı temiz', () => {
    for (const [id, a] of Object.entries(ITEMS.affixDefs)) {
      expect(a.slots?.length, id).toBeGreaterThan(0);
      expect(SLOT_IDS.some((s) => TABLE[s][a.tier].includes(id)), id).toBe(true);
    }
    expect(validateItems()).toEqual([]);
  });

  it('eskiden her yuvada çıkan 6 A affix artık 2-3 yuvada', () => {
    for (const id of ['a_primary', 'a_allattr', 'a_recovery', 'a_ultcd', 'a_immunity', 'a_endure']) {
      const n = affixDef(id)!.slots!.length;
      expect(n, id).toBeGreaterThanOrEqual(2);
      expect(n, id).toBeLessThanOrEqual(3);
    }
  });

  it('kat kat zar tablo dışına çıkmaz (ana affix hariç), aynı affix iki kez olmaz', () => {
    const pool = ITEMS.items.filter((d) => d.rarity !== 'legendary');
    for (let i = 0; i < 800; i++) {
      const d = pool[i % pool.length]!;
      const ids = rollItem(d, new Rng(i), { rarity: 'epic', forClass: 'mage' }).affixes.map((a) => a.id);
      expect(new Set(ids).size, d.id).toBe(ids.length);
      ids.slice(1).forEach((id, k) => expect(TABLE[d.slot][(['C', 'B', 'A'] as const)[k]!], `${d.id} ${id}`).toContain(id));
    }
  });

  it('Legendary sabit affix\'leri aynen: tablo onları kısmaz', () => {
    for (const d of ITEMS.items.filter((x) => x.rarity === 'legendary' && x.affixes?.length)) {
      expect(rollItem(d, new Rng(3)).affixes.map((a) => a.id), d.id).toEqual(d.affixes);
    }
  });
});

describe('D2: direnç tek çekiliş', () => {
  it('havuzdaki 6 direnç tek girdi; başka affix ayrı girdi; grup dışı havuz aynen', () => {
    const entries = drawEntries(tierPool('C', 'helm'));
    expect(entries).toHaveLength(5);
    expect(entries.find((e) => e.length > 1)!.sort()).toEqual([...RES].sort());
    expect(drawEntries(tierPool('C', 'ring')).every((e) => e.length === 1)).toBe(true);
  });

  it('Miğfer (ana Max HP): ikinci C çekilişinde direnç payı 4 girdiden biri (~%25), elementler eşit', () => {
    const d = base('helm', 'c_hp');
    const n = 6000;
    const m = tally(n, (rng) => rollItem(d, rng, { rarity: 'uncommon' }).affixes[1]!.id);
    const resist = RES.reduce((s, id) => s + (m.get(id) ?? 0), 0);
    expect(resist / n).toBeGreaterThan(0.22);
    expect(resist / n).toBeLessThan(0.28); // tek tek sayılsalardı 6/9 = %67 olurdu
    for (const id of RES) {
      expect((m.get(id) ?? 0) / resist, id).toBeGreaterThan(0.12);
      expect((m.get(id) ?? 0) / resist, id).toBeLessThan(0.22);
    }
    for (const id of ['c_armor', 'c_mp', 'c_healrecv']) expect((m.get(id) ?? 0) / n, id).toBeGreaterThan(0.22);
  });

  it('item\'de bir direnç varken başka element yine çıkabilir (o girdi 5 üyeyle sürer), aynısı çıkmaz', () => {
    const pool = tierPool('C', 'helm').filter((id) => id !== 'c_res_fire');
    expect(drawEntries(pool)).toHaveLength(5);
    const m = tally(1500, (rng) => drawAffix(pool, rng));
    expect(m.has('c_res_fire')).toBe(false);
    for (const id of RES.slice(1)) expect(m.get(id) ?? 0, id).toBeGreaterThan(0);
  });

  it('bütün yollar aynı çekilişten: eski kayıt onarımı ve Reforge da tek girdi sayar', () => {
    const d = base('helm', 'c_hp');
    const n = 2500;
    let resist = 0;
    for (let i = 0; i < n; i++) if (RES.includes(legacyRoll({ ...d, rarity: 'uncommon' }, null, `u${i}`).affixes[1]!.id)) resist++;
    expect(resist / n).toBeGreaterThan(0.2);
    expect(resist / n).toBeLessThan(0.3);
  });

  it('Reforge sıklığı: Helm C affix\'i değişince direnç payı ~%20 (seed\'li)', () => {
    const inst: ItemInstance = { uid: 'rf', id: base('helm', 'c_hp').id, rolls: { rarity: 'epic', ilvl: 6, affixes: [{ id: 'c_hp', q: 0.5 }, { id: 'c_armor', q: 0.5 }, { id: 'b_resil', q: 0.5 }, { id: 'a_gdef', q: 0.5 }] } };
    const s0 = stateWith([inst]);
    const n = 1200;
    let resist = 0;
    for (let i = 0; i < n; i++) {
      const t = reforgeItem({ ...s0, seed: 5000 + i }, 'rf', 1);
      if (RES.includes(instanceRoll(t.inventory[0]!).affixes[1]!.id)) resist++;
    }
    // Havuz: c_armor (kendisi), c_mp, c_healrecv + direnç (ana c_hp hariç) = 4 girdi, pay ~%25
    expect(resist / n).toBeGreaterThan(0.2);
    expect(resist / n).toBeLessThan(0.3);
  });
});

describe('D4: sınıf ağırlığı B ve A kademelerinde', () => {
  it('veri C, B, A; kat 2', () => {
    expect(ITEMS.affixRules.classFit).toEqual({ weight: 2, tiers: ['C', 'B', 'A'] });
  });

  const expectShare = (slot: SlotId, tier: AffixTier, cls: string) => {
    const pool = tierPool(tier, slot);
    const fit = pool.filter((id) => affixFit(cls, { id, def: affixDef(id)! }) >= 1);
    const unfit = pool.filter((id) => !fit.includes(id));
    expect(fit.length, 'uyan var').toBeGreaterThan(0);
    expect(unfit.length, 'uymayan var').toBeGreaterThan(0);
    const total = fit.length * 2 + unfit.length;
    const n = 9000;
    const m = tally(n, (rng) => drawAffix(pool, rng, tier, cls));
    const share = (ids: string[]) => ids.reduce((s, id) => s + (m.get(id) ?? 0), 0) / n;
    expect(share(fit)).toBeCloseTo((fit.length * 2) / total, 1);
    expect(share(unfit)).toBeCloseTo(unfit.length / total, 1);
    for (const id of pool) expect(m.get(id) ?? 0, `${id} kapanmaz`).toBeGreaterThan(0);
  };

  it('A: Ring + Warrior (çağrı, element, mana uymaz): uyan 2 kat, uymayan yine çıkar', () => expectShare('ring', 'A', 'warrior'));
  it('B: Gloves + Mage (Block break fiziksel ister, uymaz): uyan 2 kat, uymayan yine çıkar', () => expectShare('gloves', 'B', 'mage'));

  it('rollItem B ve A\'yı gerçekten ağırlıklı çeker: Summon mastery çağırana daha sık', () => {
    const d = itemDef('copper_ring')!;
    const share = (cls: string) => {
      let hit = 0;
      for (let i = 0; i < 4000; i++) if (rollItem(d, new Rng(i), { rarity: 'epic', forClass: cls }).affixes[3]!.id === 'a_summon') hit++;
      return hit / 4000;
    };
    expect(share('undead')).toBeGreaterThan(share('warrior') * 1.4);
  });

  it('sınıf verilmezse tekdüze', () => {
    const pool = tierPool('A', 'ring');
    const m = tally(8000, (rng) => drawAffix(pool, rng, 'A'));
    for (const id of pool) expect((m.get(id) ?? 0) / 8000, id).toBeCloseTo(1 / pool.length, 1);
  });
});

function stateWith(inventory: ItemInstance[]): CampaignState {
  const s = pickHero(newCampaign({ mode: 'normal', seed: 31, campaignId: 'dist' }), 'warrior');
  return { ...s, gold: 1_000_000, temperStones: 99, inventory };
}

describe('eski item: havuz dışı affix kalır', () => {
  // a_primary artık Boots'ta çıkmaz, c_shield Ring'de, c_mp Trinket'te yalnız ana affix olabilir
  const oldBoots: ItemInstance = { uid: 'ob', id: base('boots').id, rolls: { rarity: 'epic', ilvl: 2, affixes: [{ id: base('boots').main ?? 'c_eva', q: 0.5 }, { id: 'c_hp', q: 0.5 }, { id: 'b_speed', q: 0.5 }, { id: 'a_primary', q: 0.7 }] } };
  const oldRing: ItemInstance = { uid: 'or', id: 'copper_ring', rolls: { rarity: 'uncommon', ilvl: 2, affixes: [{ id: 'c_mp', q: 0.5 }, { id: 'c_shield', q: 0.4 }] } };

  it('okuyunca ve güç katmanında kalır', () => {
    expect(tierPool('A', 'boots')).not.toContain('a_primary');
    expect(tierPool('C', 'ring')).not.toContain('c_shield');
    expect(instanceRoll(oldBoots).affixes.at(-1)).toEqual({ id: 'a_primary', q: 0.7 });
    expect(instanceRoll(oldRing).affixes.map((a) => a.id)).toEqual(['c_mp', 'c_shield']);
    expect(rolledAffixes(oldRing).map((a) => a.id)).toContain('c_shield');
    expect(loadout({ class: 'warrior', equipment: { boots: oldBoots } }).affixes.map((a) => a.id)).toContain('a_primary');
  });

  it('kayıt yazılıp okununca kalır (göç dokunmaz)', () => {
    const kv = memoryKV();
    writeSave(kv, stateWith([oldBoots, oldRing]), 'manual', 't');
    expect(kv.getItem(SAVE_KEY)).toBeTruthy();
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    const inv = r.file.slots[0]!.saves[0]!.state.inventory;
    expect(inv.find((i) => i.uid === 'ob')!.rolls!.affixes.map((a) => a.id)).toContain('a_primary');
    expect(inv.find((i) => i.uid === 'or')!.rolls!.affixes.map((a) => a.id)).toContain('c_shield');
  });

  it('Temper çökmez, affix\'ler kalır', () => {
    const t = temperItem(stateWith([oldBoots]), 'ob');
    expect(t.inventory[0]!.rolls!.ilvl).toBe(3);
    expect(t.inventory[0]!.rolls!.affixes.map((a) => a.id)).toContain('a_primary');
  });

  it('Reforge çökmez: havuz dışı affix değiştirilebilir, yerine güncel havuzdan gelir, diğerleri kalır', () => {
    const s = stateWith([oldBoots]);
    expect(reforgeBlocked(s, 'ob', 3)).toBeNull();
    expect(reforgeChoices(oldBoots, 3)).not.toContain('a_primary');
    const after = instanceRoll(reforgeItem(s, 'ob', 3).inventory[0]!).affixes;
    expect(TABLE.boots.A).toContain(after[3]!.id);
    expect(after.slice(0, 3)).toEqual(instanceRoll(oldBoots).affixes.slice(0, 3));
  });

  it('Reforge başka satırda: havuz dışı affix yerinde kalır', () => {
    const after = instanceRoll(reforgeItem(stateWith([oldBoots]), 'ob', 1).inventory[0]!).affixes;
    expect(after[3]).toEqual({ id: 'a_primary', q: 0.7 });
  });
});
