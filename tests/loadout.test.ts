import { describe, expect, it } from 'vitest';
import { applyUnitModifiers, Battle, content } from '../src/engine';
import {
  acknowledgeHandover,
  activeHeroes,
  addGold,
  addItem,
  autoResolve,
  battlePlan,
  debugTeleport,
  equipItem,
  farewell,
  formCompany,
  moveTo,
  heroLoadout,
  newCampaign,
  nextStep,
  pickHero,
  unequipItem,
  type CampaignState,
} from '../src/campaign';
import { emptyEquipment, ITEMS, loadout, starterPower, starterWeapon } from '../src/progression';
import { fightPlan } from '../src/sim/campaign';

// Güç toplama katmanı (roadmap.md 1.1, madde 278): temel + item -> UnitSetup.modifiers. Boş yükleme = bugünkü savaş birebir.

const f = content.formulas;

/** Valdoria'da savaşlı bir düğüme ışınlanmış sefer (kadro seed'li otomatik). */
const atBattle = (node = '5A', seed = 42): CampaignState => {
  // Işınlanırken kazanılan savaşların loot'u torbayı doldurur: bu testler boş torbayla başlar
  const s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed }), 'archer'), node);
  const { pendingLoot: _p, ...rest } = s;
  // Seviye şartı (Item Güçlendirme x6) bu testlerin konusu değil: kahramanlar yüksek seviyede
  return { ...rest, roster: rest.roster.map((h) => ({ ...h, level: 50 })), inventory: [], nextItemId: 1 };
};

const implicitClass = (c: string) => ['cutthroat', 'antimage', 'gambler', 'hexer'].includes(c);

describe('güç katmanı: boş yükleme', () => {
  it('hiçbir şey takılı değilse: başlangıç silahı olmayan (test) sınıfta modifiers yok; oynanabilir sınıf silahsızken silah çarpanı < 1', () => {
    expect(loadout({ class: 'aoe_tester', level: 1, equipment: emptyEquipment() })).toEqual({ recovery: 0, affixes: [], inactive: [], capped: [], missing: [], weaponPower: 0, weaponMult: 1 });
    expect(loadout({ class: 'aoe_tester' }).modifiers).toBeUndefined();
    // silahsız: 1 / (1 + başlangıç gücü / 100)
    const unarmed = loadout({ class: 'warrior', equipment: emptyEquipment() });
    expect(unarmed.modifiers).toEqual({ weaponMult: Math.round((1 / (1 + starterPower('warrior') / 100)) * 10000) / 10000 });
    expect(unarmed.weaponMult).toBeLessThan(1);
  });

  it('başlangıç silahı katlanır: silah çarpanı tam 1 (Quick Battle ile aynı güç); kurulumda yalnızca kendi ana affixi ve (hançer / tılsım) örtük statı', () => {
    for (const c of Object.keys(ITEMS.starterWeapons.classes)) {
      const w = starterWeapon(c, 'x')!;
      const l = loadout({ class: c, equipment: { ...emptyEquipment(), weapon: w } });
      expect(l.weaponMult).toBe(1);
      expect(l.modifiers?.weaponMult).toBeUndefined();
      const keys = Object.keys(l.modifiers ?? {}).sort();
      expect(keys).toEqual(['elemDamageAdd', ...(implicitClass(c) ? [c === 'gambler' || c === 'hexer' ? 'spdMult' : 'critAdd'] : [])].sort());
    }
  });

  it('battlePlan: başlangıç silahlı kahramanın kurulumu güç katmanıyla aynı, silah çarpanı yok; aynı seed aynı savaş', () => {
    let s = atBattle();
    s = { ...s, roster: s.roster.map((h, i) => (i === 0 ? { ...h, hpRatio: 0.5 } : h)) };
    expect(nextStep(s).kind).toBe('battle');
    const plan = battlePlan(s);
    for (const [cell, u] of Object.entries(plan.units.party)) {
      const h = s.roster.find((x) => x.id === s.active[Number(cell)])!;
      expect(h.equipment.weapon?.id).toBe(ITEMS.starterWeapons.classes[h.class]);
      expect(u.modifiers).toEqual(heroLoadout(h).modifiers);
      expect(u.modifiers?.weaponMult).toBeUndefined();
    }
    expect(fightPlan(plan, 'medium').log).toEqual(fightPlan(plan, 'medium').log);
  });
});

describe('güç katmanı: item -> modifiers', () => {
  it("affix'ler toplanır (veri eşlemesi): element hasarı, ana stat, düz ekler, yüzdeler oran; aynı alan iki item'den toplanır; tavan uygulanır", () => {
    const roll = (rarity: 'rare' | 'epic', ...ids: Array<[string, number]>) => ({ rarity, affixes: ids.map(([id, q]) => ({ id, q })) });
    const eq = {
      ...emptyEquipment(),
      weapon: { uid: 'i1', id: 'arming_sword', rolls: roll('epic', ['c_phys', 0.5], ['c_hp', 0.5], ['b_crit', 0.5], ['a_primary', 0.5]) },
      armor: { uid: 'i2', id: 'riveted_mail', rolls: roll('rare', ['c_armor', 0.5], ['c_hp', 1], ['b_marmor', 0]) },
    };
    const r = loadout({ class: 'warrior', equipment: eq });
    const m = r.modifiers!;
    expect(m.elemDamageAdd!.physical).toBeGreaterThan(0);
    expect(m.attrAdd).toEqual({ str: 3 }); // a_primary: warrior STR (item seviyesi 9, adım 1: 3)
    expect(m.hpAdd).toBe(r.affixes.filter((a) => a.id === 'c_hp').reduce((x, a) => x + a.values[0]!, 0)); // iki item'den toplanır
    expect(m.critAdd).toBe(r.affixes.find((a) => a.id === 'b_crit')!.values[0]! / 100);
    expect(m.magicArmorAdd).toBe(r.affixes.find((a) => a.id === 'b_marmor')!.values[0]!);
    // tavan: 4 eldivende kritik (test için aynı yuvaya değil, farklı yuvalara zorlanmış affix'ler) items.json > caps.crit'i (%25, Ömer 2026-10-12) aşmaz
    const crit = loadout({ class: 'warrior', equipment: { ...emptyEquipment(), weapon: { uid: 'a', id: 'arming_sword', rolls: { ...roll('epic', ['b_crit', 1], ['a_keen', 1]), ilvl: 30 } }, gloves: { uid: 'b', id: 'keen_gauntlets', rolls: { ...roll('epic', ['b_crit', 1], ['a_keen', 1]), ilvl: 30 } } } });
    expect(crit.modifiers!.critAdd).toBe(0.25);
  });

  it('veride olmayan item yok sayılır (eski kayıt çökmez)', () => {
    const r = loadout({ class: 'aoe_tester', equipment: { ...emptyEquipment(), helm: { uid: 'i9', id: 'no_such_item' } } });
    expect(r.modifiers).toBeUndefined();
    expect(r.missing).toEqual(['no_such_item']);
  });

  it("takılı item savaşa girer: birimin statları güç katmanının modifiers'ıyla aynı; aynı seed aynı savaş", () => {
    let s = atBattle();
    const hero = activeHeroes(s).find((h) => h.class !== 'mage' && h.class !== 'druid' && h.class !== 'undead') ?? activeHeroes(s)[0]!;
    let r = addItem(s, 'turnshoes');
    s = equipItem(r.state, hero.id, r.item.uid);
    r = addItem(s, 'bracers_of_the_fox');
    s = equipItem(r.state, hero.id, r.item.uid);
    const plan = battlePlan(s);
    const cell = s.active.indexOf(hero.id);
    expect(plan.units.party[cell]!.modifiers).toEqual(heroLoadout(s.roster.find((h) => h.id === hero.id)!).modifiers);
    const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
    const idx = plan.heroOrder.indexOf(hero.id);
    const unit = battle.combatants.find((c) => c.uid === `party-${idx}`)!;
    const want = applyUnitModifiers(content.classes[hero.class]!, plan.units.party[cell]!.modifiers, f);
    expect(unit.stats.evasion).toBe(want.stats.evasion);
    expect(unit.stats.evasion).toBeGreaterThan(content.classes[hero.class]!.stats.evasion); // Turnshoes + Bracers: ana affix Evasion
    expect(fightPlan(plan, 'medium').log).toEqual(fightPlan(plan, 'medium').log);
  });
});

describe('sefer ekipmanı: torba, kuşanma, altın', () => {
  it('kuşanma yuvaya gider, eski item torbaya döner; silah ailesi kuralı; çıkarma torbaya', () => {
    let s = atBattle();
    const team = activeHeroes(s);
    const mage = team.find((h) => h.class === 'mage');
    const warriorish = team.find((h) => ['warrior', 'antimage'].includes(h.class));
    let r = addItem(s, 'turnshoes');
    const h = team[0]!;
    s = equipItem(r.state, h.id, r.item.uid);
    expect(s.inventory).toEqual([]);
    expect(s.roster.find((x) => x.id === h.id)!.equipment.boots?.id).toBe('turnshoes');
    r = addItem(s, 'turnshoes');
    s = equipItem(r.state, h.id, r.item.uid);
    expect(s.inventory.map((i) => i.uid)).toEqual(['i1']); // eskisi torbaya döndü
    s = unequipItem(s, h.id, 'boots');
    expect(s.inventory).toHaveLength(2);
    expect(s.roster.find((x) => x.id === h.id)!.equipment.boots).toBeNull();
    r = addItem(s, 'woodcutters_axe');
    if (mage) expect(() => equipItem(r.state, mage.id, r.item.uid)).toThrow(/cannot use axes/);
    if (warriorish) expect(equipItem(r.state, warriorish.id, r.item.uid).roster.find((x) => x.id === warriorish.id)!.equipment.weapon?.id).toBe('woodcutters_axe');
    expect(() => addItem(s, 'nope')).toThrow();
    expect(addGold(addGold({ ...s, gold: 0 }, 50), -80).gold).toBe(0);
  });

  it('torba sınırı 30', () => {
    let s = atBattle();
    for (let i = 0; i < 30; i++) s = addItem(s, 'turnshoes').state;
    expect(() => addItem(s, 'turnshoes')).toThrow(/Bag is full/);
  });

  it("Ashford vedası: tutorial takımının item'leri torbaya düşer, yeni bölük takabilir (karar 7)", () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 3 }), 'warrior');
    const hero = s.roster[0]!;
    const r = addItem(s, 'woodcutters_axe');
    s = equipItem(r.state, hero.id, r.item.uid);
    for (let guard = 0; guard < 50 && nextStep(s).kind !== 'farewell'; guard++) {
      const st = nextStep(s);
      s = st.kind === 'move' ? moveTo(s, st.options[0]!) : autoResolve(s, st);
    }
    expect(nextStep(s).kind).toBe('farewell');
    const axeUid = r.item.uid;
    s = farewell(s);
    expect(s.roster.some((h) => h.id === hero.id)).toBe(false);
    expect(s.inventory.map((i) => i.uid)).toContain(axeUid); // tutorial savaşlarının loot'u da torbada
    expect(s.pendingHandover!.items).toContain(axeUid);
    expect(s.pendingHandover!.from[0]).toEqual({ heroId: hero.id, class: 'warrior' });
    expect(acknowledgeHandover(s).pendingHandover).toBeUndefined();
    expect(acknowledgeHandover(s).inventory).toEqual(s.inventory);
    s = formCompany(s, ['warrior', 'mage', 'archer']);
    const w = s.roster.find((h) => h.class === 'warrior')!;
    expect(w.level).toBe(1);
    s = equipItem(s, w.id, axeUid);
    expect(s.inventory.map((i) => i.uid)).not.toContain(axeUid);
  });
});
