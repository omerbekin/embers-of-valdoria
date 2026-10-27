import { describe, expect, it } from 'vitest';
import { Battle, Rng, applyUnitModifiers, content } from '../src/engine';
import { damageSpecFor, type DamageEffect } from '../src/engine/spec';
import { outgoingDamageMult } from '../src/engine/stats';
import {
  ITEMS,
  affixValues,
  baseBlockChance,
  baseIP,
  baseLineTexts,
  instanceBaseBlockChance,
  bestMoves,
  emptyEquipment,
  equippedWeaponPower,
  giveStarterIfUnarmed,
  implicitDefOf,
  implicitValues,
  instanceBaseLines,
  instanceIP,
  isPlanError,
  itemDef,
  levelRequirement,
  loadout,
  meetsLevel,
  planEquip,
  starterOffhand,
  starterOffhandId,
  starterPower,
  starterWeapon,
  starterWeaponId,
  validateItems,
  classUsesOffhand,
  offhandWeapon,
  weaponMultFor,
  weaponPowerOf,
  blocksOffhand,
  canEquip,
  instanceRarity,
  rollItem,
  rollLoot,
  type Equipment,
  type ItemInstance,
  type ItemsData,
} from '../src/progression';
import { SAVE_KEY, addItem, autoResolve, debugTeleport, equipItem, memoryKV, newCampaign, nextStep, pickHero, readSaves, recruit, type CampaignState } from '../src/campaign';
import { equipFromBag, newRun, parseRun, upgradePairs } from '../src/endless';
import { heroItemLine } from '../src/ui/gear-hover';
import { leveledCampaign, leveledRun } from './level-helpers';

// Item Güçlendirme (Ömer onayı 2026-10-17, items.md 1.12): silah taban gücü hasarı çarpar, tutuş / aile farkı, kalkan zırhı, başlangıç silahı
// (katlama: Quick Battle aynı), seviye şartı (ilvl - 3), kayıt göçü. Sayılar veriden okunur.

const W = ITEMS.weaponPower;
const inst = (id: string, ilvl?: number, uid = 'x'): ItemInstance => ({ uid, id, rolls: { rarity: 'common', ...(ilvl !== undefined ? { ilvl } : {}), affixes: [{ id: itemDef(id)!.slot === 'weapon' ? 'c_phys' : (itemDef(id)!.main ?? 'c_hp'), q: 0.5 }] } });
const eq = (o: Partial<Equipment>): Equipment => ({ ...emptyEquipment(), ...o });
const snap = (v: number) => Math.round(v / W.step) * W.step;

describe('veri ve formül', () => {
  it('items.json geçerli; bozuk güç / örtük / şart / başlangıç verisi yakalanır', () => {
    expect(validateItems()).toEqual([]);
    const bad = structuredClone(ITEMS) as ItemsData;
    bad.weaponPower.grip.two = bad.weaponPower.grip.one;
    bad.levelReq.offset = -1;
    delete bad.starterWeapons.classes['mage'];
    bad.implicits['nope'] = { name: 'x', text: 'x', parts: [] };
    const errs = validateItems(bad).join('\n');
    expect(errs).toMatch(/two-handed must be stronger/);
    expect(errs).toMatch(/levelReq/);
    expect(errs).toMatch(/class mage has no starter weapon/);
    expect(errs).toMatch(/implicit nope/);
  });

  it('silah gücü = (base + perIlvl x ilvl) x tutuş x aile; çift el / yay tek elden güçlü, hançer zayıf, tılsım arada', () => {
    const axe = itemDef('woodcutters_axe')!;
    for (const L of [1, 10, 30, 50]) expect(weaponPowerOf(axe, L)).toBe(snap(W.base + W.perIlvl * L));
    const L = 20;
    const one = weaponPowerOf(axe, L);
    const two = weaponPowerOf(itemDef('dane_axe')!, L);
    const bow = weaponPowerOf(itemDef('short_bow')!, L);
    const dagger = weaponPowerOf(itemDef('rondel_dagger')!, L);
    const charm = weaponPowerOf(itemDef('worn_deck')!, L);
    const staff = weaponPowerOf(itemDef('ash_staff')!, L);
    expect(two / one).toBeCloseTo(W.grip.two, 1);
    expect(two / one).toBeGreaterThan(1.3);
    expect(bow).toBe(snap((W.base + W.perIlvl * L) * W.grip.bow)); // yay kendi tutuş çarpanıyla (Ömer 2026-10-19: yalnızca çift el 1,45)
    expect(bow).toBeGreaterThan(one);
    expect(staff).toBe(two); // x2: asa da güç taşır (çift el)
    expect(dagger).toBeLessThan(one);
    expect(charm).toBeGreaterThan(one);
    expect(charm).toBeLessThan(two);
    // nadirlik taban gücünü değiştirmez; kalkan / zırh güç taşımaz (x4)
    expect(weaponPowerOf(itemDef('emberbrand')!, L)).toBe(one);
    expect(weaponPowerOf(itemDef('oak_shield')!, L)).toBe(0);
  });

  it('örtük statlar: hançer kritik, tılsım hız % (seviyeyle büyür); kalkan blok şansı (taban başına sabit %15-20, seviyeyle büyümez); IP ve fiyata girer', () => {
    expect(implicitDefOf(itemDef('rondel_dagger')!)!.parts[0]!.to).toBe('mod:critAdd');
    expect(implicitDefOf(itemDef('worn_deck')!)!.parts[0]!.to).toBe('mult:spdMult');
    expect(implicitDefOf(itemDef('oak_shield')!)!.parts[0]!.to).toBe('fx:blockChance');
    expect(implicitDefOf(itemDef('woodcutters_axe')!)).toBeUndefined();
    const dg = implicitDefOf(itemDef('rondel_dagger')!)!;
    expect(implicitValues(dg, 30)[0]!).toBeGreaterThan(implicitValues(dg, 1)[0]!);
    // Kalkan (Ömer 2026-10-18): taban blok şansı her kalkanda %15-20, item seviyesiyle DEĞİŞMEZ (items[].implicitBase)
    const shields = ITEMS.items.filter((d) => d.slot === 'offhand');
    expect(shields.length).toBeGreaterThan(0);
    for (const d of shields) {
      const sh = implicitDefOf(d)!;
      const v = implicitValues(sh, 1, d)[0]!;
      expect(v, d.id).toBeGreaterThanOrEqual(15);
      expect(v, d.id).toBeLessThanOrEqual(20);
      expect(implicitValues(sh, 50, d)[0], d.id).toBe(v);
      expect(instanceBaseLines(inst(d.id, 30)).block, d.id).toBe(v);
      expect(baseBlockChance(d, 40), d.id).toBe(v);
      expect(instanceBaseBlockChance(inst(d.id, 5)), d.id).toBe(v);
      expect(instanceBaseLines(inst(d.id, 30)).implicit, d.id).toBeUndefined();
    }
    // IP: taban değeri örneğin IP'sine eklenir
    const a = inst('woodcutters_axe', 30);
    expect(baseIP(itemDef('woodcutters_axe')!, 30)).toBeCloseTo(weaponPowerOf(itemDef('woodcutters_axe')!, 30) * W.ip, 3);
    expect(instanceIP(a)).toBeGreaterThan(instanceIP(inst('woodcutters_axe', 1)));
    // ipucu satırları
    expect(instanceBaseLines(a).power).toBe(weaponPowerOf(itemDef('woodcutters_axe')!, 30));
    expect(baseBlockChance(itemDef('woodcutters_axe')!, 10)).toBe(0);
    expect(baseLineTexts(instanceBaseLines(inst('oak_shield', 10)))).toEqual([`Block chance ${itemDef('oak_shield')!.implicitBase![0]}%`]);
    expect(instanceBaseLines(inst('oak_shield', 10)).power).toBeUndefined();
  });
});

describe('motor: hasar = stat x skill gücü x silah çarpanı', () => {
  const melee = content.skills['melee_attack']!.effects.find((e) => e.type === 'damage') as DamageEffect;
  const fight = (mode: 'turns' | 'test', mult?: number) => {
    const units = mult !== undefined ? { party: { 0: { modifiers: { weaponMult: mult } } }, enemies: {} } : undefined;
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 7, mode, { party: ['warrior'], enemies: ['warrior'], ...(units ? { units } : {}) }, false));
    const me = b.combatants.find((c) => c.side === 'party')!;
    const foe = b.combatants.find((c) => c.side === 'enemy')!;
    return { me, spec: damageSpecFor(me, foe, melee, content.formulas) };
  };

  for (const mode of ['turns', 'test'] as const)
    it(`${mode} modu: silah çarpanı hasar belirtimini çarpar; 1 iken birim aynen (kurulum yok)`, () => {
      const base = fight(mode);
      const strong = fight(mode, 1.5);
      expect(strong.me.stats.weaponMult).toBe(1.5);
      expect(strong.spec.power).toBeCloseTo(base.spec.power * 1.5, 6);
      expect(base.me.stats.weaponMult).toBeUndefined();
      expect(fight(mode, 1).me.stats).toEqual(base.me.stats);
    });

  it('Global damage ile çarpımsal; şifa / kalkan çarpanlarına dokunmaz', () => {
    const st = applyUnitModifiers(content.classes['paladin']!, { weaponMult: 1.2, damageAdd: 0.1 }, content.formulas).stats;
    expect(outgoingDamageMult(st, 'holy')).toBeCloseTo(1.2 * 1.1, 6);
    expect(st.healPowerMult).toBeUndefined();
    expect(st.shieldPowerMult).toBeUndefined();
  });
});

describe('güç katmanı: katlama, tutuş, ikinci el, kalkan', () => {
  it('her oynanabilir sınıfın Common, ilvl şartı 1 başlangıç silahı var; çarpanı tam 1 (Quick Battle L1 dengesi aynı)', () => {
    for (const c of content.randomPool) {
      const id = starterWeaponId(c)!;
      expect(id, c).toBeDefined();
      const d = itemDef(id)!;
      expect([d.slot, d.rarity]).toEqual(['weapon', 'common']);
      const w = starterWeapon(c, 'u')!;
      expect(levelRequirement(ITEMS.starterWeapons.ilvl)).toBe(1);
      expect(weaponMultFor(c, { weapon: w })).toBe(1);
      expect(starterPower(c)).toBe(weaponPowerOf(d, ITEMS.starterWeapons.ilvl));
      expect(isPlanError(planEquip(c, emptyEquipment(), w, undefined, { level: 1 }))).toBe(false);
    }
    expect(starterWeapon('warrior', 'u')!.id).toBe('greataxe'); // Ömer 2026-10-23: Warrior çift el başlangıç
    expect(starterWeapon('mage', 'u')!.id).toBe('ash_staff');
    expect(starterWeapon('archer', 'u')!.id).toBe('short_bow');
    expect(starterWeapon('gambler', 'u')!.id).toBe('worn_deck');
  });

  it('çarpan = (1 + güç/100) / (1 + başlangıç gücü/100); silahsız < 1; çift el aynı seviyede tek elden ~%35 güçlü', () => {
    const L = 20;
    const one = weaponMultFor('warrior', { weapon: inst('arming_sword', L) });
    const two = weaponMultFor('warrior', { weapon: inst('dane_axe', L) });
    const fold = 1 + starterPower('warrior') / 100;
    expect(one).toBeCloseTo((1 + weaponPowerOf(itemDef('arming_sword')!, L) / 100) / fold, 3);
    expect(two).toBeGreaterThan(one);
    expect(weaponMultFor('warrior', {})).toBeCloseTo(1 / fold, 3);
    // güç toplamı: ikinci eldeki hançer payı kadar sayılır, kalkan güç vermez
    const d1 = inst('misericorde', L, 'a');
    const d2 = inst('rondel_dagger', L, 'b');
    expect(equippedWeaponPower({ weapon: d1, offhand: d2 })).toBeCloseTo(weaponPowerOf(itemDef('misericorde')!, L) + W.offhandShare * weaponPowerOf(itemDef('rondel_dagger')!, L), 3);
    expect(equippedWeaponPower({ weapon: inst('arming_sword', L), offhand: inst('oak_shield', L) })).toBe(weaponPowerOf(itemDef('arming_sword')!, L));
  });

  it('kalkanın tabanı blok şansı (x4, Ömer 2026-10-18): takan blok kazanır, zırhı yalnızca ana Armor affixinden; hasar değil; hançer örtüğü kritik verir', () => {
    const L = 10;
    const noShield = loadout({ class: 'warrior', equipment: eq({ weapon: inst('arming_sword', L) }) });
    const shield = loadout({ class: 'warrior', equipment: eq({ weapon: inst('arming_sword', L), offhand: { uid: 's', id: 'oak_shield', rolls: { rarity: 'common', ilvl: L, affixes: [{ id: 'c_armor', q: 0.5 }] } } }) });
    const imp = implicitValues(implicitDefOf(itemDef('oak_shield')!)!, L, itemDef('oak_shield')!)[0]!;
    expect(noShield.itemEffects?.blockChance).toBeUndefined();
    expect(shield.itemEffects!.blockChance).toBeCloseTo(imp / 100, 6);
    // zırh yalnızca ana affix'ten (c_armor), örtük zırh yok
    expect((shield.modifiers!.armorAdd ?? 0) - (noShield.modifiers?.armorAdd ?? 0)).toBeCloseTo(affixValues('c_armor', L, 0.5)[0]!, 6);
    expect(shield.weaponMult).toBe(noShield.weaponMult);
    // kalkan C affix'i (c_block) tabana eklenir; toplam items.json > caps.block ile kırpılır ("max")
    const withAffix = loadout({ class: 'warrior', equipment: eq({ weapon: inst('arming_sword', L), offhand: { uid: 's', id: 'oak_shield', rolls: { rarity: 'uncommon', ilvl: L, affixes: [{ id: 'c_armor', q: 0.5 }, { id: 'c_block', q: 0.5 }] } } }) });
    expect(withAffix.itemEffects!.blockChance).toBeCloseTo((imp + affixValues('c_block', L, 0.5)[0]!) / 100, 6);
    const big = loadout({ class: 'warrior', equipment: eq({ weapon: inst('arming_sword', L), offhand: { uid: 's', id: 'wardens_pavise', rolls: { rarity: 'uncommon', ilvl: 400, affixes: [{ id: 'c_armor', q: 0.5 }, { id: 'c_block', q: 1 }] } } }) });
    expect(big.itemEffects!.blockChance).toBeCloseTo(ITEMS.caps.block! / 100, 6);
    expect(big.capped).toContain('block');
    const cut = loadout({ class: 'cutthroat', equipment: eq({ weapon: inst('rondel_dagger', L) }) });
    expect(cut.modifiers!.critAdd).toBeCloseTo(implicitValues(implicitDefOf(itemDef('rondel_dagger')!)!, L)[0]! / 100, 6);
  });

  it('Equip best güçlü silahı seçer (aynı affix); çift eli silah + kalkana karşı tartar', () => {
    const moves = bestMoves({ class: 'warrior', equipment: eq({ weapon: inst('woodcutters_axe', 1, 'w0') }), level: 50 }, [inst('arming_sword', 25, 'hi'), inst('bearded_axe', 5, 'lo')]);
    expect(moves).toEqual([{ slot: 'weapon', uid: 'hi' }]);
  });
});

describe('seviye şartı (x6): ilvl - 3, en az 1', () => {
  it('saf fonksiyon ve veri', () => {
    expect(levelRequirement(12)).toBe(12 - ITEMS.levelReq.offset);
    expect(levelRequirement(1)).toBe(ITEMS.levelReq.min);
    expect(levelRequirement(ITEMS.levelReq.offset)).toBe(ITEMS.levelReq.min);
    expect(meetsLevel(9, inst('arming_sword', 12))).toBe(true);
    expect(meetsLevel(8, inst('arming_sword', 12))).toBe(false);
    expect(meetsLevel(undefined, inst('arming_sword', 12))).toBe(false); // seviyesiz kahraman = 1
  });

  it('planEquip / Equip best / sefer kuşanması / Endless: seviye yetmezse takılamaz (mesaj), yetince takılır', () => {
    const hi = inst('arming_sword', 12, 'hi');
    const p = planEquip('warrior', emptyEquipment(), hi, undefined, { level: 1 });
    expect(isPlanError(p) && p.error).toBe(`Requires Level ${levelRequirement(12)}`);
    expect(isPlanError(planEquip('warrior', emptyEquipment(), hi, undefined, { level: levelRequirement(12) }))).toBe(false);
    expect(bestMoves({ class: 'warrior', equipment: emptyEquipment(), level: 1 }, [hi])).toEqual([]);
    // sefer: L1 kahraman (ışınlanma yolda XP verir: level sistemi; burada L1'e çekilir)
    const t0 = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 3 }), 'warrior'), '5A');
    let s: CampaignState = { ...t0, roster: t0.roster.map((h) => ({ ...h, level: 1, xp: 0 })), inventory: [] };
    const w = s.roster[0]!;
    expect(w.level).toBe(1);
    const lowId = ITEMS.items.find((d) => d.slot === 'boots' && levelRequirement(d.ilvl) === 1)!.id;
    const highId = ITEMS.items.find((d) => d.slot === 'boots' && levelRequirement(d.ilvl) > 1)!.id;
    let r = addItem(s, highId);
    expect(() => equipItem(r.state, w.id, r.item.uid)).toThrow(/Requires Level/);
    expect(equipItem(leveledCampaign(r.state), w.id, r.item.uid).roster.find((h) => h.id === w.id)!.equipment.boots?.id).toBe(highId);
    r = addItem(s, lowId);
    s = equipItem(r.state, w.id, r.item.uid);
    expect(s.roster.find((h) => h.id === w.id)!.equipment.boots?.id).toBe(lowId);
    // Endless: L1 kahraman takamaz, öneri de almaz
    const run = { ...newRun(4, ['warrior', 'archer', 'mage', 'druid'], 't'), bag: [inst('arming_sword', 12, 'b0')] };
    const hw = run.heroes.find((h) => h.class === 'warrior')!;
    expect(() => equipFromBag(run, hw.id, 'b0')).toThrow(/Requires Level/);
    expect(equipFromBag(leveledRun(run), hw.id, 'b0').heroes.find((h) => h.id === hw.id)!.equipment.weapon?.id).toBe('arming_sword');
    expect(upgradePairs(run, 20).every((x) => levelRequirement(x.def.ilvl) <= 1)).toBe(true);
    expect(upgradePairs(leveledRun(run), 20).some((x) => levelRequirement(x.def.ilvl) > 1)).toBe(true);
  });

  it('kahraman kartı: takılamaz ama karşılaştırma gösterilir ("Requires Level X" önde)', () => {
    const h = { id: 'h1', class: 'warrior', level: 1, equipment: eq({ weapon: starterWeapon('warrior', 'w')! }) };
    const line = heroItemLine(h, inst('arming_sword', 20, 'n'));
    expect(line.tone).toBe('no');
    expect(line.parts[0]!.text).toBe(`Requires Level ${levelRequirement(20)}`);
    expect(line.parts.length).toBeGreaterThan(1); // fark satırları (DMG...) yine var
    expect(heroItemLine({ ...h, level: 50 }, inst('arming_sword', 20, 'n')).tone).not.toBe('no');
  });
});

describe('başlangıç ikinci eli (Ömer 2026-10-23)', () => {
  const ALL = Object.keys(ITEMS.starterWeapons.classes);

  it('tek el silahla başlayan ve ikinci el kullanabilen her sınıf sınıfına uygun Common ikinci el alır (Warrior bilerek hariç); çift el / yay / tılsım almaz', () => {
    expect(starterOffhandId('defender')).toBe('iron_buckler');
    expect(starterOffhandId('paladin')).toBe('iron_buckler');
    expect(starterOffhandId('cutthroat')).toBe('rondel_dagger');
    expect(starterOffhandId('antimage')).toBe('rondel_dagger');
    for (const c of ALL) {
      const w = itemDef(starterWeaponId(c)!)!;
      const id = starterOffhandId(c);
      if (blocksOffhand(w) || !classUsesOffhand(c)) expect(id, c).toBeUndefined();
      else if (c !== 'warrior') expect(id, `${c}: ikinci el boş`).toBeDefined();
      if (!id) continue;
      const d = itemDef(id)!;
      expect(d.rarity).toBe('common');
      expect(canEquip(c, d)).toBe(true);
      expect(d.slot === 'offhand' || offhandWeapon(d)).toBe(true);
      const o = starterOffhand(c, 'o')!;
      expect(levelRequirement(o.rolls?.ilvl ?? d.ilvl)).toBe(1);
    }
    expect(starterOffhandId('warrior')).toBeUndefined();
  });

  it('veri denetimi: Common olmayan / sınıfın takamadığı / çift el başlangıç silahlı sınıfa ikinci el yakalanır', () => {
    const bad = structuredClone(ITEMS) as ItemsData;
    bad.starterOffhands = { classes: { defender: 'kite_shield', mage: 'iron_buckler', archer: 'rondel_dagger' } };
    const errs = validateItems(bad).join('\n');
    expect(errs).toMatch(/kite_shield \(defender\): must be a Common/);
    expect(errs).toMatch(/iron_buckler \(mage\): not usable/);
    expect(errs).toMatch(/rondel_dagger \(archer\)/);
  });

  it('yeni sefer kahramanı ve yeni Endless koşusu ikinci eliyle başlar; silah çarpanı kalkanla 1, ikinci hançerle biraz üstünde', () => {
    // sefer: Mill Road zaferinden sonra (archer liderine) Cutthroat katılır; lider okçunun ikinci eli boş (yay iki eli kapatır)
    let s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 1 }), 'archer'), '1');
    for (let i = 0; i < 20 && nextStep(s).kind !== 'recruit'; i++) s = autoResolve(s);
    s = recruit(s, 'cutthroat');
    expect(s.roster[0]!.equipment.offhand ?? null).toBeNull();
    expect(s.roster.find((h) => h.class === 'cutthroat')!.equipment.offhand?.id).toBe('rondel_dagger');
    const run = newRun(4, ['defender', 'cutthroat', 'mage', 'paladin'], 't');
    expect(run.heroes.map((h) => h.equipment.offhand?.id ?? null)).toEqual(['iron_buckler', 'rondel_dagger', null, 'iron_buckler']);
    expect(run.heroes[2]!.equipment).not.toHaveProperty('offhand'); // boş yuva kayda yazılmaz
    expect(new Set(run.heroes.flatMap((h) => Object.values(h.equipment).map((i) => i!.uid))).size).toBe(7);
    const d = run.heroes[0]!;
    expect(loadout({ class: d.class, equipment: d.equipment }).weaponMult).toBe(1);
    expect(loadout({ class: d.class, equipment: d.equipment }).itemEffects?.blockChance).toBeGreaterThan(0);
    const c = run.heroes[1]!;
    const m = loadout({ class: c.class, equipment: c.equipment }).weaponMult;
    expect(m).toBeGreaterThan(1);
    expect(m).toBeLessThan(1.05);
  });

  it('eski kayıt: ikinci eli boş kahramana sonradan ikinci el verilmez (göç yok)', () => {
    const run = newRun(4, ['defender'], 't');
    const old = { ...run, heroes: run.heroes.map((h) => ({ ...h, equipment: { weapon: h.equipment.weapon } })) };
    expect(parseRun(JSON.stringify({ version: 5, run: old }))!.heroes[0]!.equipment.offhand).toBeUndefined();
  });
});

describe('kayıt göçü: başlangıç silahı', () => {
  it('yeni sefer ve Endless kahramanları başlangıç silahıyla başlar', () => {
    const s = newCampaign({ mode: 'normal', seed: 1 });
    const t = pickHero(s, 'archer');
    for (const h of t.roster) expect(h.equipment.weapon?.id).toBe(starterWeaponId(h.class));
    const run = newRun(4, ['warrior', 'archer', 'mage', 'gambler'], 't');
    for (const h of run.heroes) expect(h.equipment.weapon?.id).toBe(starterWeaponId(h.class));
  });

  it('sefer dosyası v7 -> 8: silahsız kahraman başlangıç silahını alır (duraklatılmış savaş atılır); silahlı kahramana dokunulmaz; v8 tekrar vermez', () => {
    const s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 5, campaignId: 'c5' }), 'warrior'), '3');
    const armed = s.roster[0]!;
    const old = JSON.parse(JSON.stringify(s)) as CampaignState;
    // v7 kaydında başlangıç ikinci eli yoktu (Ömer 2026-10-23'te geldi): silahsız kahramanın ikinci eli de boş
    old.roster = old.roster.map((h, i) => (i === 0 ? { ...h, equipment: { ...h.equipment, weapon: { uid: 'i50', id: 'bearded_axe' } } } : { ...h, equipment: { ...h.equipment, weapon: null, offhand: null } }));
    (old as unknown as Record<string, unknown>).suspended = { node: old.at, seed: 1, turn: 0, hash: 'x', setup: 'y', actions: [] };
    const file = (version: number, st: CampaignState) => JSON.stringify({ version, counter: 1, lastSlot: 0, slots: [{ campaignId: st.campaignId, mode: 'normal', difficulty: st.difficulty, startedAt: 't', lastPlayed: 't', saves: [{ id: 's1', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: st.campaignId, summary: {}, state: st }] }, null, null] });
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, file(7, old));
    const r = readSaves(kv);
    expect(r.migrated).toBe(true);
    const back = r.file.slots[0]!.saves[0]!.state;
    expect(back.roster[0]!.equipment.weapon?.id).toBe('bearded_axe');
    for (const h of back.roster.slice(1)) expect(h.equipment.weapon?.id).toBe(starterWeaponId(h.class));
    expect(back.suspended).toBeUndefined();
    expect(armed.id).toBe(back.roster[0]!.id);
    // güncel sürüm: oyuncunun çıkardığı silah geri gelmez
    kv.setItem(SAVE_KEY, file(8, old));
    expect(readSaves(kv).file.slots[0]!.saves[0]!.state.roster[1]!.equipment.weapon).toBeNull();
  });

  it('Endless kaydı v4 -> 5: silahsız kahramana başlangıç silahı, silahlıya dokunulmaz; v5 tekrar vermez; giveStarterIfUnarmed idempotent', () => {
    const run = newRun(4, ['warrior', 'archer', 'mage', 'cutthroat'], 't');
    const old = { ...run, heroes: run.heroes.map((h, i) => ({ ...h, equipment: i === 0 ? { weapon: { uid: 'e9', id: 'dane_axe' } } : {} })) };
    const back = parseRun(JSON.stringify({ version: 4, run: old }))!;
    expect(back.heroes[0]!.equipment.weapon?.id).toBe('dane_axe');
    for (const h of back.heroes.slice(1)) expect(h.equipment.weapon?.id).toBe(starterWeaponId(h.class));
    expect(parseRun(JSON.stringify({ version: 5, run: old }))!.heroes[1]!.equipment.weapon).toBeUndefined();
    const h = { id: 'h1', class: 'mage', equipment: {} as Partial<Equipment> };
    expect(giveStarterIfUnarmed(h)).toBe(true);
    expect(giveStarterIfUnarmed(h)).toBe(false);
    expect(giveStarterIfUnarmed({ id: 'h2', class: 'aoe_tester', equipment: {} })).toBe(false); // başlangıç silahı olmayan test sınıfı
  });
});

describe('çift el yakın dövüş tabanları: Greataxe, Greatsword, War Maul (Ömer 2026-10-17)', () => {
  const NEW = ['greataxe', 'greatsword', 'war_maul'] as const;

  it('çift el silah, Axes & Swords / Maces & Shields ailesi kuralı; ikinci eli kapatır; güç = çift el x1,35', () => {
    for (const id of NEW) {
      const d = itemDef(id)!;
      expect(d, id).toBeDefined();
      expect(d.slot).toBe('weapon');
      expect(d.grip).toBe('two');
      expect(blocksOffhand(d)).toBe(true);
      expect(d.rarity).not.toBe('legendary');
      expect(weaponPowerOf(d, 10)).toBe(weaponPowerOf(itemDef('dane_axe')!, 10));
    }
    for (const id of ['greataxe', 'greatsword']) {
      expect(itemDef(id)!.family).toBe('axes');
      expect(canEquip('warrior', itemDef(id)!)).toBe(true);
      expect(canEquip('antimage', itemDef(id)!)).toBe(true);
      expect(canEquip('defender', itemDef(id)!)).toBe(false);
      expect(canEquip('mage', itemDef(id)!)).toBe(false);
    }
    const maul = itemDef('war_maul')!;
    expect(maul.family).toBe('maces');
    for (const c of ['warrior', 'defender', 'paladin']) expect(canEquip(c, maul), c).toBe(true);
    expect(canEquip('archer', maul)).toBe(false);
  });

  it('her Legendary dışı nadirlikte zarlanır (Common..Epic) ve sefer loot\'unda düşer', () => {
    for (const id of NEW)
      for (const r of ['common', 'uncommon', 'rare', 'epic'] as const) {
        const inst = { uid: `${id}-${r}`, id, rolls: rollItem(itemDef(id)!, new Rng(3), { rarity: r, forClass: 'warrior' }) };
        expect(instanceRarity(inst), `${id} ${r}`).toBe(r);
      }
    const seen = new Map<string, Set<string>>();
    const party = [{ class: 'warrior' }, { class: 'defender' }, { class: 'paladin' }, { class: 'antimage' }];
    for (let seed = 1; seed <= 4000 && NEW.some((id) => (seen.get(id)?.size ?? 0) < 4); seed++) {
      const res = rollLoot({ rng: new Rng(seed), kind: 'battle', chapter: 2, ilvl: 20, party }); // normal savaş: boss'un nadirlik tabanı Rare (TUR 1 madde 8)
      res.items.forEach((id, i) => {
        if (!(NEW as readonly string[]).includes(id)) return;
        if (!seen.has(id)) seen.set(id, new Set());
        seen.get(id)!.add(res.rarities[i]!);
      });
    }
    for (const id of NEW) expect([...(seen.get(id) ?? [])].sort(), id).toEqual(['common', 'epic', 'rare', 'uncommon']);
  });
});
