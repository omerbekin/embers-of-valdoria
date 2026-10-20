import { describe, expect, it } from 'vitest';
import { applyUnitModifiers, Battle, content, hasUnitModifiers, Rng } from '../src/engine';
import {
  acknowledgeLoot,
  activeHeroes,
  addItem,
  applyBattle,
  autoResolve,
  battlePlan,
  completeSimple,
  debugTeleport,
  discardItem,
  discardNeedsConfirm,
  takeLeftover,
  stashLoot,
  equipBest,
  newCampaign,
  nextStep,
  pickHero,
  type CampaignState,
} from '../src/campaign';
import { BAG_SIZE, ITEMS, RARITY_IDS, bestMoves, canEquip, emptyEquipment, instanceRarity, itemDef, loadout, primaryCheck, rollLoot, validateItems } from '../src/progression';

// Item MVP (madde 280): motorun toplamsal ekleri, loot (seed'li, zorluktan bağımsız, attempt'ten bağımsız, tekrarda azalan), Equip best.

const f = content.formulas;
const party4 = ['warrior', 'mage', 'archer', 'gambler'].map((c) => ({ class: c, equipment: emptyEquipment() }));

describe('motor: toplamsal ekler (UnitModifiers)', () => {
  it('hpAdd hpMult sonrası, kritik/isabet/kaçınma oran olarak, hız/MP/yenilenme düz; ek yoksa tanım aynen', () => {
    const w = content.classes.warrior!;
    const m = applyUnitModifiers(w, { hpMult: 2, hpAdd: 10, mpAdd: 5, spdAdd: 0.5, critAdd: 0.03, critMultAdd: 0.1, accuracyAdd: 0.02, evasionAdd: 0.04, hpRegenAdd: 1, mpRegenAdd: 1 }, f);
    expect(m.stats.hp).toBe(Math.round(w.stats.hp * 2) + 10);
    expect(m.stats.mp).toBe(w.stats.mp + 5);
    expect(m.stats.spd).toBe(w.stats.spd + 0.5);
    expect(m.stats.critChance).toBeCloseTo(w.stats.critChance + 0.03, 9);
    expect(m.stats.critMult).toBeCloseTo(w.stats.critMult + 0.1, 9);
    expect(m.stats.accuracy).toBeCloseTo(w.stats.accuracy + 0.02, 9);
    expect(m.stats.evasion).toBeCloseTo(w.stats.evasion + 0.04, 9);
    expect(m.stats.hpRegen).toBe(w.stats.hpRegen + 1);
    expect(m.stats.mpRegen).toBe(w.stats.mpRegen + 1);
    expect(applyUnitModifiers(w, { evasionAdd: 5 }, f).stats.evasion).toBe(f.attributes.evasionMax);
    expect(hasUnitModifiers({ critAdd: 0 })).toBe(false);
    expect(applyUnitModifiers(w, { hpAdd: 0 }, f)).toBe(w);
    // yalnızca hpMult: diğer türev değerler eskisiyle birebir (yuvarlama yok)
    const h = applyUnitModifiers(w, { hpMult: 1.5 }, f);
    expect([h.stats.critChance, h.stats.accuracy, h.stats.evasion, h.stats.mp]).toEqual([w.stats.critChance, w.stats.accuracy, w.stats.evasion, w.stats.mp]);
  });

  it("savaşta birimin maks canı ve MP'si eklerle başlar", () => {
    const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const b = new Battle(content.battleSetup('random-battle', 5, 'turns', { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'mage' }), units: { party: { 0: { modifiers: { hpAdd: 12, mpAdd: 10 } } } } }, false));
    const u = b.combatants.find((c) => c.uid === 'party-0')!;
    expect(u.maxHp).toBe(content.classes.warrior!.stats.hp + 12);
    expect(u.maxMp).toBe(content.classes.warrior!.stats.mp + 10);
  });

  it('güç katmanı affix değerlerini motora çevirir (yüzdeler oran)', () => {
    const roll = { rarity: 'epic' as const, affixes: [{ id: 'c_acc', q: 0.5 }, { id: 'c_eva', q: 0.5 }, { id: 'b_crit', q: 0.5 }, { id: 'a_keen', q: 0.5 }] };
    const inst = { uid: 'i1', id: 'hawkeye_gloves', rolls: roll };
    const r = loadout({ class: 'gambler', equipment: { ...emptyEquipment(), gloves: inst } });
    const v = (id: string, i = 0) => r.affixes.find((a) => a.id === id)!.values[i]!;
    expect(r.modifiers).toMatchObject({ accuracyAdd: v('c_acc') / 100, evasionAdd: v('c_eva') / 100, critMultAdd: v('a_keen', 1) / 100 });
    expect(r.modifiers!.critAdd).toBeCloseTo(Math.min(ITEMS.caps.crit, v('b_crit') + v('a_keen')) / 100, 6); // tavanlı
  });
});

describe('item içeriği (Valdoria)', () => {
  it("her yuvada ve her silah ailesinde Common..Rare bölüm 1 item'i var; Epic'ler var; bölüm 1'de yalnızca 2 Legendary (düşmez)", () => {
    expect(validateItems()).toEqual([]);
    const ch1 = ITEMS.items.filter((d) => d.ilvl <= 10);
    for (const slot of ['weapon', 'helm', 'armor', 'gloves', 'boots', 'trinket'] as const)
      for (const r of ['common', 'uncommon', 'rare', 'epic'] as const)
        if (slot !== 'weapon' || r !== 'epic') expect(ch1.some((d) => d.slot === slot && d.rarity === r), `${slot} ${r}`).toBe(true);
    for (const fam of ITEMS.weaponFamilies) for (const r of ['common', 'uncommon', 'rare'] as const) expect(ch1.some((d) => d.family === fam.id && d.rarity === r), `${fam.id} ${r}`).toBe(true);
    expect(ch1.filter((d) => d.rarity === 'legendary').map((d) => d.id)).toEqual(['emberbrand', 'mantle_of_valdren', 'pilgrims_road_boots']); // madde 296 (normal loot zarından düşmez)
    expect(ch1.filter((d) => d.rarity !== 'legendary').length).toBeGreaterThanOrEqual(40);
  });
});

describe('loot üretimi', () => {
  const roll = (kind: 'battle' | 'elite' | 'boss' | 'treasure', seed: number, extra: Partial<Parameters<typeof rollLoot>[0]> = {}) => rollLoot({ rng: new Rng(seed), kind, chapter: 1, ilvl: 6, party: party4, ...extra });

  it('belirleyici: aynı zar aynı loot', () => {
    expect(roll('battle', 7)).toEqual(roll('battle', 7));
  });

  it("beklenen sayı: savaş 0,5 x takım, boss / hazine en az 1 item (nadirlik garantisi yok: Ömer 2026-10-11); ilvl sınırı", () => {
    let battleItems = 0;
    for (let i = 0; i < 400; i++) battleItems += roll('battle', i).items.length;
    expect(battleItems / 400).toBeCloseTo(ITEMS.loot.perPartyMember.battle * 4 * (ITEMS.loot.dropMult ?? 1), 0); // sefer düşüşü x0,65 (TUR 1 madde 8)
    for (let i = 0; i < 100; i++) {
      for (const kind of ['boss', 'treasure'] as const) {
        const r = roll(kind, i);
        expect(r.items.length).toBeGreaterThanOrEqual(1);
      }
      for (const id of roll('battle', i, { ilvl: 3 }).items) expect(itemDef(id)!.ilvl).toBeLessThanOrEqual(3);
    }
  });

  it('tekrar oynamada altın / item düşüşü ve nadirlik tavanı ilk zaferle aynı (Ömer 2026-10-20); elit garantisi yalnızca ilk zaferde', () => {
    expect(ITEMS.loot.repeat.every((x) => x.items === 1 && x.gold === 1 && x.maxRarity === 'legendary')).toBe(true);
    const guard = ITEMS.loot.minItems.elite ?? 0;
    for (let i = 0; i < 300; i++) {
      const first = roll('elite', i, { ilvl: 10 });
      const rep = roll('elite', i, { ilvl: 10, replay: 3 });
      expect(rep.gold).toBe(first.gold);
      // aynı zar: tekrarın item'leri ilk zaferin ilk n item'i (tavan yok); fark yalnızca ilk zafer garantisinden gelebilir
      expect(rep.rarities).toEqual(first.rarities.slice(0, rep.rarities.length));
      expect(first.items.length).toBeGreaterThanOrEqual(Math.max(rep.items.length, guard));
    }
  });

  it('Rare pity yok (Ömer 2026-10-11): sayaç ne olursa olsun nadirlik yalnızca tablodan; aynı zar aynı sonuç', () => {
    expect(roll('battle', 3, { pity: 99 }).rarities).toEqual(roll('battle', 3, { pity: 0 }).rarities);
    expect((ITEMS.loot as unknown as Record<string, unknown>).pity).toBeUndefined();
    expect((ITEMS.loot as unknown as Record<string, unknown>).minRarity).toBeUndefined();
  });
});

describe('seferde loot', () => {
  const at5A = (difficulty: 'easy' | 'medium' | 'hard' = 'medium'): CampaignState => debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 77, difficulty }), 'archer'), '5A');
  const win = (s: CampaignState) => applyBattle(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })) });

  it("zafer loot'u torbaya + altın + Spoils kartı; zorluktan bağımsız (karar 6); deneme sayısından bağımsız", () => {
    const before = at5A();
    const after = win(before);
    const got = after.inventory.length - before.inventory.length;
    expect(after.pendingLoot!.items).toHaveLength(got);
    expect(after.gold).toBeGreaterThan(before.gold);
    expect(after.lootState.clears['5A:battle']).toBe(1);
    // aynı sefer, farklı zorluk: aynı loot
    const hard = win(at5A('hard'));
    expect(hard.inventory.map((i) => i.id)).toEqual(after.inventory.map((i) => i.id));
    expect(hard.gold).toBe(after.gold);
    // yenilgi (deneme sayacı artar) loot'u değiştirmez: loot yalnızca zaferde, zar attempt içermez
    expect(win(applyBattle(before, { victory: false, units: [] })).inventory.map((i) => i.id)).toEqual(after.inventory.map((i) => i.id));
    expect(acknowledgeLoot(after).pendingLoot).toBeUndefined();
  });

  it('hazine sandığı: en az 1 item; torba doluysa sığmayan altına ÇEVRİLMEZ, kartta bekler; yer açılıp alınabilir, kart kapanınca kaybolur', () => {
    let s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 9 }), 'archer'), '6B');
    while (nextStep(s).kind !== 'treasure') s = autoResolve(s);
    const open = completeSimple(s, 'treasure');
    const got = open.pendingLoot!.items.map((u) => open.inventory.find((i) => i.uid === u)).filter((x): x is NonNullable<typeof x> => !!x);
    expect(got.length).toBeGreaterThan(0);
    for (const it of got) expect(RARITY_IDS).toContain(instanceRarity(it));
    let full: CampaignState = { ...s, inventory: [] };
    delete full.pendingLoot;
    for (let i = 0; i < BAG_SIZE; i++) full = addItem(full, 'turnshoes').state;
    const o2 = completeSimple(full, 'treasure');
    const left = o2.pendingLoot!.left!;
    expect(o2.inventory).toHaveLength(BAG_SIZE);
    expect(left.length).toBeGreaterThan(0);
    expect(o2.gold - full.gold).toBe(o2.pendingLoot!.gold); // satış yok
    // yer yokken alınamaz
    expect(takeLeftover(o2, 0)).toBe(o2);
    // yer aç (at) ve al
    const freed = discardItem(o2, o2.inventory[0]!.uid);
    const took = takeLeftover(freed, 0);
    expect(took.inventory).toHaveLength(BAG_SIZE);
    expect(took.inventory.at(-1)!.id).toBe(left[0]);
    expect(took.pendingLoot!.left ?? []).toHaveLength(left.length - 1);
    // kart kapanınca geride kalanlar kaybolur
    expect(acknowledgeLoot(took).pendingLoot).toBeUndefined();
    expect(acknowledgeLoot(took).inventory).toEqual(took.inventory);
  });

  it('stashLoot (LOOT ekranı): torbaya giren düşüş ganimet alanına döner, miktar / zarlar aynı; almak torbaya koyar; boşsa değişmez', () => {
    let s0 = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 9 }), 'archer'), '6B');
    while (nextStep(s0).kind !== 'treasure') s0 = autoResolve(s0);
    let s: CampaignState = { ...s0, inventory: [] };
    delete s.pendingLoot;
    s = completeSimple(s, 'treasure');
    const drop = s.pendingLoot!;
    const n = drop.items.length;
    expect(n).toBeGreaterThan(0);
    const ids = drop.items.map((u) => s.inventory.find((i) => i.uid === u)!.id);
    const rolls = drop.items.map((u) => s.inventory.find((i) => i.uid === u)!.rolls);
    const st = stashLoot(s);
    expect(st.inventory).toHaveLength(s.inventory.length - n);
    expect(st.pendingLoot!.items).toEqual([]);
    expect(st.pendingLoot!.left).toEqual(ids);
    expect(st.pendingLoot!.leftRolls).toEqual(rolls);
    expect(st.gold).toBe(s.gold); // altın zaten kesede: değişmez
    expect(stashLoot(st)).toBe(st); // ikinci kez: alınacak yok
    const took = takeLeftover(st, 0);
    expect(took.inventory).toHaveLength(st.inventory.length + 1);
    expect(took.inventory.at(-1)!.id).toBe(ids[0]);
    expect(stashLoot({ ...s, pendingLoot: undefined })).toEqual({ ...s, pendingLoot: undefined });
  });

  it('atma: Rare ve üstü onay ister, altı istemez; torbada olmayan atılamaz', () => {
    expect(discardNeedsConfirm({ uid: 'a', id: 'turnshoes' })).toBe(false);
    expect(discardNeedsConfirm({ uid: 'b', id: 'brigandine' })).toBe(true);
    expect(discardNeedsConfirm({ uid: 'c', id: 'swift_sabatons' })).toBe(true);
    const s = addItem(at5A(), 'turnshoes');
    expect(discardItem(s.state, s.item.uid).inventory.some((i) => i.uid === s.item.uid)).toBe(false);
    expect(() => discardItem(s.state, 'nope')).toThrow();
  });

  it('Equip best: kullanılabilir, primary\'yi bozmayan, takılıdan iyi item; savaş planına yansır', () => {
    let s = at5A();
    for (const id of ['woodcutters_axe', 'bone_staff', 'yew_longbow', 'brigandine', 'arming_sword']) s = addItem(s, id).state;
    const t = equipBest(s);
    for (const h of activeHeroes(t))
      for (const inst of Object.values(h.equipment)) {
        if (!inst) continue;
        expect(canEquip(h.class, itemDef(inst.id)!)).toBe(true);
      }
    expect(t.inventory.length).toBeLessThan(s.inventory.length);
    const cells = Object.values(battlePlan(t).units.party).filter((u) => u.modifiers);
    expect(cells.length).toBeGreaterThan(0);
    // primary bozan item seçilmez: Paladin'e STR silahı (Arming Sword +1 STR) önerilmez
    const pal = { class: 'paladin', equipment: emptyEquipment() };
    const moves = bestMoves(pal, [{ uid: 'x1', id: 'arming_sword' }, { uid: 'x2', id: 'flanged_mace' }]);
    expect(primaryCheck(pal, { equip: { uid: 'x1', id: 'arming_sword' } }).lost).toBe(false); // 13/13 eşit: açık kalır
    expect(moves.map((m) => m.uid)).toEqual(['x2']); // Arming Sword ailesi (axes) Paladin'e uygun değil
  });
});

describe('loot tutuş ağırlığı (items.json > loot.gripWeight; Ömer 2026-10-19: çift el az düşüyordu)', () => {
  it('Axes & Maces silahlarında çift el payı ağırlıkla artar; ağırlık yokken eşit seçim', () => {
    const I = ITEMS;
    const def = itemDef;
    const party = [{ class: 'warrior', equipment: { weapon: { uid: 'a', id: 'woodcutters_axe' }, offhand: { uid: 'b', id: 'iron_buckler' } } }];
    const share = () => {
      let one = 0;
      let two = 0;
      for (let i = 0; i < 3000; i++)
        for (const id of rollLoot({ rng: new Rng(i + 1), kind: 'battle', chapter: 1, ilvl: 10, party: party as never }).items) {
          const d = def(id)!;
          if (d.slot !== 'weapon' || (d.family !== 'axes' && d.family !== 'maces')) continue;
          if (d.grip === 'two') two++;
          else one++;
        }
      return two / Math.max(1, one + two);
    };
    const w = I.loot.gripWeight;
    expect(w?.two ?? 1).toBeGreaterThan(1);
    const weighted = share();
    delete I.loot.gripWeight;
    try {
      const flat = share();
      expect(weighted).toBeGreaterThan(flat + 0.1);
    } finally {
      I.loot.gripWeight = w;
    }
  });
});
