import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine';
import { activeHeroes, applyBattle, debugTeleport, latestSave, memoryKV, newCampaign, normalizeState, pickHero, writeSave, type CampaignState } from '../src/campaign';
import {
  ITEMS,
  affixAllowed,
  affixLines,
  affixValues,
  instanceIP,
  instanceLines,
  instanceRarity,
  instanceRoll,
  itemDef,
  itemIP,
  legacyRoll,
  loadout,
  makeItem,
  partRange,
  rarityDef,
  rolledAffixes,
  rollItem,
  SLOT_IDS,
  tierPool,
  validateItems,
  type ItemsData,
} from '../src/progression';
import { chooseReward, newRun } from '../src/endless';

// Affix kademeleri (Ömer onayı 2026-10-11; items.md 1.3b): nadirlik = affix sayısı (C / C,C / C,C,B / C,C,B,A / Legendary + etki), kalite
// statı güçlendirmez (değer yalnızca item seviyesiyle büyür), zarlar seed'li ve görünür, yuva sınırları, eski kayıt göçü.

const copy = (): ItemsData => JSON.parse(JSON.stringify(ITEMS)) as ItemsData;

describe('nadirlik = affix sayısı', () => {
  it('Common C / Uncommon C,C / Rare C,C,B / Epic C,C,B,A / Legendary C,C,B,A + etki; D yok', () => {
    const t = Object.fromEntries(ITEMS.rarities.map((x) => [x.id, x.tiers.join(',')]));
    expect(t).toEqual({ common: 'C', uncommon: 'C,C', rare: 'C,C,B', epic: 'C,C,B,A', legendary: 'C,C,B,A' });
    expect(rarityDef('legendary').effect).toBe(true);
    expect(Object.values(ITEMS.affixDefs).every((a) => ['C', 'B', 'A'].includes(a.tier))).toBe(true);
  });

  it("havuzlar Ömer'in seçimi: C 26 (c_block: Ömer 2026-10-18, yalnızca kalkan; +9 Ömer 2026-10-26), B 17 (+5), A 22 (+3) affix (id'ler aynen)", () => {
    const ids = (t: string) => Object.keys(ITEMS.affixDefs).filter((k) => ITEMS.affixDefs[k]!.tier === t);
    expect(ids('C')).toEqual(['c_armor', 'c_hp', 'c_phys', 'c_fire', 'c_ice', 'c_holy', 'c_arcane', 'c_nature', 'c_dark', 'c_acc', 'c_eva', 'c_mp', 'c_hpregen', 'c_mpregen', 'c_shield', 'c_dot', 'c_block', 'c_lightning', 'c_res_fire', 'c_res_ice', 'c_res_holy', 'c_res_dark', 'c_res_nature', 'c_res_light', 'c_gold', 'c_xp']);
    expect(ids('B')).toEqual(['b_crit', 'b_critdmg', 'b_speed', 'b_marmor', 'b_tier', 'b_pen', 'b_mpen', 'b_mpcost', 'b_leech', 'b_manaleech', 'b_initiative', 'b_resil', 'b_front', 'b_back', 'b_thorns', 'b_tier_def', 'b_wound_soft']);
    expect(ids('A')).toEqual(['a_primary', 'a_allattr', 'a_gdmg', 'a_gdef', 'a_speedpct', 'a_hppct', 'a_auradmg', 'a_auradef', 'a_recovery', 'a_ultcd', 'a_allelem', 'a_keen', 'a_potency', 'a_immunity', 'a_mana', 'a_support', 'a_summon', 'a_resource', 'a_endure', 'a_column', 'a_pierce', 'a_steady']);
    expect(Object.keys(ITEMS.affixDefs).some((k) => k === 'might' || k.includes('might'))).toBe(false); // Might kalktı
  });

  it('kalite statı güçlendirmez: aynı affix her nadirlikte aynı değer; değer yalnızca item seviyesiyle büyür', () => {
    const d = itemDef('padded_gambeson')!;
    const v = (r: 'common' | 'epic') => rolledAffixes({ id: d.id, rolls: { rarity: r, affixes: [{ id: 'c_armor', q: 0.5 }] } })[0]!.values[0];
    expect(v('common')).toBe(v('epic'));
    expect(affixValues('c_hp', 20, 0.5)[0]).toBeGreaterThan(affixValues('c_hp', 2, 0.5)[0]!);
    expect(affixValues('a_ultcd', 1, 0)).toEqual(affixValues('a_ultcd', 40, 1)); // sabit -1, seviyeyle büyümez
    // Rarity çarpanı yok: Epic'in beklenen IP'si = Common'ınki + kademe ortalamaları (çarpılmaz)
    expect(itemIP(d, 'epic')).toBeGreaterThan(itemIP(d, 'common'));
    expect(ITEMS.rarities.some((r) => 'mult' in r)).toBe(false);
  });

  it('yuva kimliği (Ömer 2026-10-13, itemfix): her stat 2-3 yuvada; genel A affix\'leri her yerde; zarlar havuz dışına çıkmaz', () => {
    const only = (id: string, slots: string[]) => {
      for (const s of SLOT_IDS) expect(affixAllowed(id, s), `${id} ${s}`).toBe(slots.includes(s));
    };
    for (const id of ['c_phys', 'c_fire', 'c_holy', 'b_critdmg', 'b_pen', 'b_mpen', 'b_tier']) only(id, ['weapon']);
    only('b_crit', ['gloves']);
    only('b_leech', ['gloves']);
    only('b_manaleech', ['gloves']);
    only('a_keen', ['weapon', 'gloves']);
    only('c_acc', ['gloves', 'weapon']);
    only('c_eva', ['boots', 'gloves']);
    only('c_shield', ['offhand', 'trinket']);
    only('c_block', ['offhand']);
    only('b_speed', ['boots', 'trinket']);
    only('b_initiative', ['boots', 'trinket']);
    for (const id of ['a_auradmg', 'a_auradef']) only(id, ['armor', 'offhand']);
    for (const id of ['a_primary', 'a_allattr', 'a_recovery', 'a_ultcd', 'a_immunity', 'a_endure']) only(id, [...SLOT_IDS]);
    // rastgele affix'ler en çok 3 yuvada (genel A affix'leri hariç)
    for (const [id, a] of Object.entries(ITEMS.affixDefs)) if (a.slots) expect(a.slots.length, id).toBeLessThanOrEqual(3);
    // her yuvada her kademe için seçenek var; zar hiç boş kalmaz
    for (const s of SLOT_IDS) for (const t of ['C', 'B', 'A'] as const) expect(tierPool(t, s).length, `${t} ${s}`).toBeGreaterThanOrEqual(t === 'C' ? 3 : 2);
    // 1000 zar: rastgele affix'ler yuva havuzunda (ana affix tabanın örtük statı, havuzdan muaf), aynı affix iki kez olmaz, Epic hep 4 affix
    const pool = ITEMS.items.filter((d) => d.rarity !== 'legendary');
    for (let i = 0; i < 1000; i++) {
      const d = pool[i % pool.length]!;
      const r = rollItem(d, new Rng(i), { rarity: 'epic' });
      const ids = r.affixes.map((a) => a.id);
      expect(ids.length, d.id).toBe(4);
      expect(new Set(ids).size, d.id).toBe(ids.length);
      for (const id of ids.slice(1)) expect(affixAllowed(id, d.slot), `${d.id} ${id}`).toBe(true);
    }
    // kalkanların ana affix'i Armor; Common / Uncommon / Rare / Epic kalkan tabanı var
    const shields = ITEMS.items.filter((d) => d.slot === 'offhand' && d.rarity !== 'legendary');
    expect(new Set(shields.map((d) => d.rarity))).toEqual(new Set(['common', 'uncommon', 'rare', 'epic']));
    for (const d of shields) expect(rollItem(d, new Rng(1)).affixes[0]!.id, d.id).toBe('c_armor');
  });

  it('silahın ana affix\'i hasar türü (C): fiziksel / element; kimin için zarlandıysa onun elementi', () => {
    for (const f of ITEMS.weaponFamilies) for (const m of f.mains) expect(ITEMS.affixDefs[m]!.parts[0]!.to.startsWith('elem:'), m).toBe(true);
    const staff = itemDef('ash_staff')!;
    for (let i = 0; i < 30; i++) {
      expect(rollItem(staff, new Rng(i), { forClass: 'druid' }).affixes[0]!.id).toBe('c_nature');
      expect(['c_fire', 'c_ice']).toContain(rollItem(staff, new Rng(i), { forClass: 'mage' }).affixes[0]!.id);
    }
    expect(rollItem(itemDef('short_bow')!, new Rng(1)).affixes[0]!.id).toBe('c_phys');
  });

  it('doğrulayıcı yakalar: ana affix yok / yanlış kademe, yasak yuva, Legendary affix listesi, etki yalnızca Legendary, kademe dizisi', () => {
    const d = copy();
    d.items = [
      { id: 'a', name: 'A', slot: 'gloves', rarity: 'common', ilvl: 2 },
      { id: 'b', name: 'B', slot: 'armor', rarity: 'common', ilvl: 4, main: 'b_crit' },
      { id: 'c', name: 'C', slot: 'armor', rarity: 'common', ilvl: 4, main: 'c_eva' },
      { id: 'd', name: 'D', slot: 'helm', rarity: 'rare', ilvl: 9, main: 'c_hp', effect: 'retort' },
      { id: 'e', name: 'E', slot: 'helm', rarity: 'legendary', ilvl: 9, affixes: ['c_hp', 'b_crit', 'b_resil', 'a_gdef'], effect: 'laststand' },
    ];
    d.rarities[2]!.tiers = ['C', 'B'];
    // yuvanın havuzunda ana affix dışında C kalmazsa zar boş kalırdı: yakalanır
    d.items.push({ id: 'f', name: 'F', slot: 'gloves', rarity: 'common', ilvl: 2, main: 'c_acc' });
    d.affixDefs = { ...d.affixDefs, c_eva: { ...d.affixDefs.c_eva!, slots: ['boots'] }, c_mpregen: { ...d.affixDefs.c_mpregen!, slots: ['trinket'] } };
    const errs = validateItems(d).join(' | ');
    expect(errs).toMatch(/item f: its slot pool has no second C affix/);
    expect(errs).toMatch(/item a: needs a C main affix/);
    expect(errs).toMatch(/item b: needs a C main affix/);
    expect(errs).not.toMatch(/item c:/); // ana affix tabanın örtük statı: yuva havuzundan muaf (itemfix)
    expect(errs).not.toMatch(/item e: affix .* is not allowed/); // Legendary'nin sabit affix'leri de muaf
    expect(errs).toMatch(/item d: only Legendary items carry an effect/);
    expect(errs).toMatch(/item e: affix 2 must be tier C/);
    expect(errs).toMatch(/rarity rare: one more affix per rarity/);
  });
});

describe('affix zarları', () => {
  it('aralık: orta değer ± %15, adıma yuvarlanır, en az bir adım; satır "+4 Max HP (3–5)" biçiminde, kademe etiketi önde', () => {
    const p = ITEMS.affixDefs.c_hp!.parts[0]!;
    const [lo, hi] = partRange(p, itemDef('riveted_mail')!.ilvl, ITEMS.affixRules.rollFloorByRarity!.uncommon); // Uncommon: aralığın üst kısmı
    expect(lo).toBeLessThan(hi);
    expect(lo).toBeGreaterThanOrEqual(p.step);
    const inst = { uid: 'x', id: 'riveted_mail', rolls: { rarity: 'uncommon' as const, affixes: [{ id: 'c_armor', q: 0.5 }, { id: 'c_hp', q: 1 }] } };
    const lines = affixLines(inst);
    expect(lines.map((l) => l.tier)).toEqual(['C', 'C']);
    expect(lines[1]!.text).toBe(`+${hi} Max HP`);
    expect(instanceLines(inst)[1]).toBe(`[C] +${hi} Max HP (${lo}–${hi})`);
    // Ömer: aralıklar görünsün => zarlı (sabit olmayan) her affix'in aralığı en az iki değer (item seviyesi 10'da)
    for (const [id, a] of Object.entries(ITEMS.affixDefs)) {
      const p0 = a.parts[0]!;
      if (p0.fixed || p0.noRoll || p0.floor) continue;
      const [l, h] = partRange(p0, 10);
      expect(l, id).toBeLessThanOrEqual(h);
    }
  });

  it('belirleyici, aralık içinde; ortalama IP beklenen IP\'ye yakın (zar dengesi)', () => {
    const d = itemDef('twin_stilettos')!;
    expect(rollItem(d, new Rng(5))).toEqual(rollItem(d, new Rng(5)));
    let ipSum = 0;
    for (let i = 0; i < 400; i++) {
      const inst = makeItem(d.id, `u${i}`, new Rng(i));
      expect(instanceRarity(inst)).toBe(d.rarity);
      expect(inst.rolls!.affixes).toHaveLength(rarityDef(d.rarity).tiers.length);
      for (const a of rolledAffixes(inst))
        a.values.forEach((v, j) => {
          expect(v).toBeGreaterThanOrEqual(a.ranges[j]![0]);
          expect(v).toBeLessThanOrEqual(a.ranges[j]![1]);
        });
      ipSum += instanceIP(inst);
    }
    expect(Math.abs(ipSum / 400 - itemIP(d)) / itemIP(d)).toBeLessThan(0.15);
  });

  it('Legendary: dört affix katalogda sabit (C, C, B, A), değerleri zarlanır; Legendary olmayan taban Legendary olamaz', () => {
    const d = itemDef('mantle_of_valdren')!;
    const r = rollItem(d, new Rng(3), { rarity: 'common' });
    expect(r.rarity).toBe('legendary');
    expect(r.affixes.map((a) => a.id)).toEqual(d.affixes);
    expect(rollItem(itemDef('turnshoes')!, new Rng(3), { rarity: 'legendary' }).rarity).toBe('epic');
  });

  it('Immunity tek durum zarlar (Stun, Slow, Silence...); tur sayısı 2, seviyeyle biraz artar', () => {
    const crown = itemDef('crown_of_the_ashen_king')!;
    const a = rolledAffixes({ id: crown.id, rolls: rollItem(crown, new Rng(9)) }).find((x) => x.id === 'a_immunity')!;
    expect(ITEMS.affixDefs.a_immunity!.choices).toContain(a.x);
    expect(affixValues('a_immunity', 5, 0.3)).toEqual([2]);
    expect(affixValues('a_immunity', 30, 0.3)[0]).toBeGreaterThan(2);
  });

  it('güç katmanı zarı kullanır: affix eşlemesi motor alanlarına (ek, çarpan, kanca, element, ana stat)', () => {
    const eq = {
      weapon: { uid: 'w', id: 'short_bow', rolls: { rarity: 'epic' as const, affixes: [{ id: 'c_phys', q: 0.5 }, { id: 'c_acc', q: 0.5 }, { id: 'b_pen', q: 0.5 }, { id: 'a_primary', q: 0.5 }] } },
      armor: { uid: 'a', id: 'riveted_mail', rolls: { rarity: 'epic' as const, affixes: [{ id: 'c_armor', q: 0.5 }, { id: 'c_hp', q: 0.5 }, { id: 'b_tier', q: 0.5 }, { id: 'a_hppct', q: 0.5 }] } },
    };
    const l = loadout({ class: 'archer', equipment: eq });
    const m = l.modifiers!;
    expect(m.elemDamageAdd!.physical).toBeGreaterThan(0);
    expect(m.accuracyAdd).toBeGreaterThan(0);
    expect(m.attrAdd!.dex).toBeGreaterThan(0); // archer'ın ana statı
    expect(m.armorAdd).toBeGreaterThan(0);
    expect(m.hpMult).toBeGreaterThan(1);
    expect(l.itemEffects!.armorPen).toBeGreaterThan(0);
    expect(l.itemEffects!.tierDamageMult).toBeGreaterThan(1);
  });
});

describe('eski kayıt göçü (en yakın yeni biçim; asla çökmez)', () => {
  it('eski stat zarları -> ana affix + eski statlara karşılık gelen affix\'ler; değerler orta; aynı uid = aynı sonuç', () => {
    const r = legacyRoll(itemDef('keen_gauntlets')!, { crit: 5, evasion: 2, critDmg: 15 }, 'i9');
    expect(r.rarity).toBe('rare');
    expect(r.affixes.map((a) => a.id)).toEqual(['c_acc', 'c_eva', 'b_crit']);
    expect(r.affixes.every((a) => a.q === 0.5)).toBe(true);
    expect(legacyRoll(itemDef('keen_gauntlets')!, { crit: 5 }, 'i9')).toEqual(legacyRoll(itemDef('keen_gauntlets')!, { crit: 5 }, 'i9'));
    // silah: takan sınıfın elementi
    expect(legacyRoll(itemDef('ash_staff')!, { might: 3 }, 'u', 'druid').affixes[0]!.id).toBe('c_nature');
    // Epic eski etki düşer, A affix'i gelir
    expect(legacyRoll(itemDef('dane_axe')!, { might: 5, crit: 5, critDmg: 30 }, 'u').affixes.map((a) => ITEMS.affixDefs[a.id]!.tier)).toEqual(['C', 'C', 'B', 'A']);
  });

  it('bozuk / bilinmeyen zar: yine de geçerli örnek (instanceRoll onarır)', () => {
    expect(instanceRoll({ uid: 'x', id: 'riveted_mail', rolls: 'junk' as never }).affixes.length).toBe(2);
    expect(instanceRoll({ uid: 'x', id: 'riveted_mail', rolls: { affixes: [{ id: 'nope', q: 2 }] } as never }).affixes.length).toBe(2);
    expect(instanceRoll({ uid: 'x', id: 'riveted_mail', rolls: { affixes: [{ id: 'c_hp', q: 7 }] } }).affixes).toEqual([{ id: 'c_hp', q: 1 }]);
    expect(instanceRoll({ uid: 'x', id: 'gone_item' }).affixes).toEqual([]);
  });

  it('tier havuzu her yuvada dolu (doğrulayıcı da denetler)', () => {
    for (const t of ['C', 'B', 'A'] as const) for (const s of ['weapon', 'helm', 'armor', 'gloves', 'boots', 'trinket'] as const) expect(tierPool(t, s).length).toBeGreaterThan(0);
    expect(validateItems()).toEqual([]);
  });
});

describe('zarlar kayıtta: sefer ve Endless', () => {
  const won = (seed = 31): CampaignState => {
    const s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed }), 'archer'), '5A');
    return applyBattle({ ...s, inventory: [] }, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })) });
  };

  it("sefer loot'u zarlı gelir; aynı sefer + aynı düşüş = aynı zarlar (yükleyip yeniden kazanmak değiştirmez)", () => {
    const a = won();
    const b = won();
    expect(a.inventory.length).toBeGreaterThan(0);
    for (const it of a.inventory) expect(it.rolls?.affixes.length).toBeGreaterThan(0);
    expect(a.inventory).toEqual(b.inventory);
  });

  it("kayıt round-trip zarları korur; zarsız eski item okunurken seed'li en yakın biçimi alır; bozuk zar alanı item'i atar", () => {
    const s = won();
    const kv = memoryKV();
    writeSave(kv, s, 'auto');
    expect(latestSave(kv)!.state.inventory).toEqual(s.inventory);
    const old = JSON.parse(JSON.stringify(s)) as CampaignState;
    old.inventory = old.inventory.map(({ rolls: _r, ...it }) => it);
    const n = normalizeState(old)!;
    for (const it of n.inventory) expect(rolledAffixes(it).length).toBe(rarityDef(itemDef(it.id)!.rarity).tiers.length);
    const bad = JSON.parse(JSON.stringify(s)) as CampaignState & { inventory: unknown[] };
    (bad.inventory[0] as unknown as Record<string, unknown>).rolls = 'junk';
    expect(normalizeState(bad)!.inventory).toHaveLength(s.inventory.length - 1);
  });

  it("Endless: ödül item'i koşu seed'iyle zarlanır; aynı koşu = aynı zar", () => {
    const run = { ...newRun(77, ['warrior', 'mage', 'archer', 'gambler'], 't'), phase: 'reward' as const, offer: [{ kind: 'item' as const, itemId: 'riveted_mail', heroId: 'h1' }] };
    const a = chooseReward(run, 0);
    const b = chooseReward(run, 0);
    expect(a.bag![0]!.rolls?.affixes.length).toBeGreaterThan(0);
    expect(a.bag).toEqual(b.bag);
  });
});

describe('nadirliğe göre zar tabanı (Ömer 2026-10-11)', () => {
  it('yüksek nadirlik aralığın üst kısmından zarlar; tavan aynı; aralık nadirliğe göre; eski zar korunur', () => {
    const floors = ITEMS.affixRules.rollFloorByRarity!;
    expect(floors).toEqual({ common: 0, uncommon: 0.25, rare: 0.375, epic: 0.5, legendary: 0.625 });
    const d = itemDef('riveted_mail')!;
    for (const r of ['common', 'uncommon', 'rare', 'epic'] as const)
      for (let i = 0; i < 200; i++) for (const a of rollItem(d, new Rng(i), { rarity: r }).affixes) expect(a.q).toBeGreaterThanOrEqual(floors[r]!);
    // Epic aralığı: alt uç = q 0,5 değeri, üst uç Common'la aynı
    const p = ITEMS.affixDefs.c_hp!.parts[0]!;
    const epic = rolledAffixes({ id: d.id, rolls: { rarity: 'epic', affixes: [{ id: 'c_hp', q: 1 }] } })[0]!;
    const common = rolledAffixes({ id: d.id, rolls: { rarity: 'common', affixes: [{ id: 'c_hp', q: 1 }] } })[0]!;
    expect(epic.ranges[0]).toEqual([partRange(p, d.ilvl, 0.5)[0], common.ranges[0]![1]]);
    // kayıtlı eski zar (taban altında) değerini korur, aralık onu da gösterir
    const old = rolledAffixes({ id: d.id, rolls: { rarity: 'epic', affixes: [{ id: 'c_hp', q: 0 }] } })[0]!;
    expect(old.values[0]).toBe(partRange(p, d.ilvl)[0]);
    expect(old.ranges[0]![0]).toBe(old.values[0]);
  });
});
