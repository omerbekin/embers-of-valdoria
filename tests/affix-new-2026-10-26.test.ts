import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleMode, type ItemEffects, type Teams, type UnitSetup } from '../src/engine';
import { affixFit } from '../src/progression/affix-fit';
import { affixLines } from '../src/progression/item-text';
import { ITEMS, affixDef, affixValues, validateItems, type ItemInstance } from '../src/progression/items';
import { itemGoldBonus, itemWoundSoft, itemXpBonus, loadout, partyGoldMult } from '../src/progression/loadout';
import { applyWounds, woundHpFactor } from '../src/progression/wounds';
import { waveXp } from '../src/endless/run';

// 17 yeni affix (c_res_light: Ömer 2026-10-26) (Ömer onayı 2026-10-26, form econ/main): veri eşlemesi (loadout) + motor kancaları. Sayılar provizyon; testler yalnızca
// kuralı denetler (deterministik: debug iska kapalı, test modu).

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, enemyUnits: Record<number, UnitSetup> = {}, mode: BattleMode = 'test', seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: enemyUnits } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const fx = (e: ItemEffects, extra: UnitSetup = {}): UnitSetup => ({ ...extra, itemEffects: e });
const at = (b: Battle, side: 'party' | 'enemy', slot: number) => b.combatants.find((c) => c.side === side && c.slot === slot && !c.summoned)!;
const warriorAttack = content.classes.warrior!.skills[0]!;
const NEW = ['c_lightning', 'c_res_fire', 'c_res_ice', 'c_res_holy', 'c_res_dark', 'c_res_nature', 'c_res_light', 'c_gold', 'c_xp', 'b_front', 'b_back', 'b_thorns', 'b_tier_def', 'b_wound_soft', 'a_column', 'a_pierce', 'a_steady'];
/** Tek affix'li örnek (ilvl 10, orta zar). */
const inst = (base: string, affix: string, uid = 'x'): ItemInstance => ({ uid, id: base, rolls: { rarity: 'common', ilvl: 10, affixes: [{ id: affix, q: 0.5 }] } });
const v = (affix: string, i = 0) => affixValues(affix, 10, 0.5)[i]!;

describe('yeni affix verisi', () => {
  it('17 affix veride, kademe ve yuvalar doğru, doğrulayıcı temiz, yuva başına en çok 3 yuva', () => {
    for (const id of NEW) expect(affixDef(id), id).toBeDefined();
    expect(validateItems().filter((e) => /affix (c_lightning|c_res|c_gold|c_xp|b_front|b_back|b_thorns|b_tier_def|b_wound_soft|a_column|a_pierce|a_steady)/.test(e))).toEqual([]);
    expect(ITEMS.affixDefs.c_res_fire!.slots).toEqual(['helm', 'armor', 'offhand']);
    expect(ITEMS.affixDefs.a_steady!.slots).toEqual(['gloves', 'boots']);
    expect(ITEMS.affixDefs.c_gold!.slots).toEqual(['trinket']);
  });

  it('ipucu metni şablondan (bonus yazım kuralı: direnç ayrı çarpan): "Takes 13% less Fire damage", "Your wounds lower your Max HP X% less"', () => {
    expect(affixLines(inst('leather_coif', 'c_res_fire'))[0]!.text).toBe(`Takes ${v('c_res_fire')}% less Fire damage`);
    expect(affixLines(inst('leather_coif', 'b_wound_soft'))[0]!.text).toBe(`Your wounds lower your Max HP ${v('b_wound_soft')}% less`);
    expect(affixLines(inst('work_gloves', 'a_steady'))[0]!.text).toBe(`Each turn you don't move: ${v('a_steady')}% more damage, up to ${Number((3 * v('a_steady')).toFixed(2))}% more after 3 turns`);
  });

  it('Equip best uyumu: Thorns yakın dövüşçüye, Rearguard bane menzilliye tam; diğer yeni affix\'ler herkese', () => {
    const fit = (cls: string, id: string) => affixFit(cls, { id, def: affixDef(id)! });
    expect(fit('warrior', 'b_thorns')).toBe(1);
    expect(fit('mage', 'b_thorns')).toBeLessThan(1);
    expect(fit('archer', 'b_back')).toBe(1);
    expect(fit('warrior', 'c_res_fire')).toBe(1);
    expect(fit('warrior', 'a_pierce')).toBe(1);
  });
});

describe('loadout eşlemesi (yeni hedefler)', () => {
  it('res:<element> -> itemEffects.elemResist; prog:gold / xp / woundSoft -> sonuç alanları; fx kancaları', () => {
    const l = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'c_res_fire', 'h'), armor: inst('padded_gambeson', 'c_res_fire', 'a'), trinket: inst('copper_ring', 'c_gold', 't') } });
    expect(l.itemEffects?.elemResist?.fire).toBeCloseTo(1 - (1 - v('c_res_fire') / 100) ** 2, 4); // "×0.87" iki kaynak ÇARPILIR (2026-10-27)
    expect(l.goldBonus).toBeCloseTo(v('c_gold') / 100, 6);
    expect(loadout({ class: 'warrior' }).goldBonus).toBeUndefined();
    const src = { class: 'warrior', equipment: { helm: inst('leather_coif', 'c_xp', 'h'), armor: inst('padded_gambeson', 'b_wound_soft', 'a'), gloves: inst('work_gloves', 'a_steady', 'g') } };
    expect(itemXpBonus(src)).toBeCloseTo(v('c_xp') / 100, 6);
    expect(itemWoundSoft(src)).toBeCloseTo(v('b_wound_soft') / 100, 6);
    expect(loadout(src).itemEffects?.steadyDamage).toBeCloseTo(v('a_steady') / 100, 6);
    const w = loadout({ class: 'warrior', equipment: { weapon: { uid: 'w', id: 'woodcutters_axe', rolls: { rarity: 'common', ilvl: 10, affixes: [{ id: 'c_lightning', q: 0.5 }, { id: 'a_pierce', q: 0.5 }] } } } });
    expect(w.modifiers?.elemDamageAdd?.lightning).toBeCloseTo(v('c_lightning') / 100, 6);
    expect(w.itemEffects?.pierceBehind).toBeCloseTo(v('a_pierce') / 100, 6);
  });

  it('altın: takımın toplamı çarpan; XP yalnızca takan (Endless dalga XP\'si)', () => {
    const rich = { class: 'warrior', equipment: { trinket: inst('copper_ring', 'c_gold', 't') } };
    expect(itemGoldBonus(rich)).toBeGreaterThan(0);
    expect(partyGoldMult([rich, rich, { class: 'mage' }])).toBeCloseTo(1 + 2 * itemGoldBonus(rich), 4);
    expect(partyGoldMult([{ class: 'mage' }])).toBe(1);
    const heroes = [
      { id: 'a', class: 'warrior', level: 1, equipment: { helm: inst('leather_coif', 'c_xp', 'h') } },
      { id: 'b', class: 'warrior', level: 1, equipment: {} },
    ] as never;
    const xp = waveXp({ heroes }, 3, { units: [{ heroId: 'a' }, { heroId: 'b' }], kills: 3 } as never);
    expect(xp.a).toBe(Math.round(xp.b! * (1 + v('c_xp') / 100)));
  });

  it('yara yumuşatma: yara başına kayıp soften oranı az; verilmezse eskisiyle aynı', () => {
    const r = { riseRatio: 0.1, maxHpLoss: 0.2, lethal: 3 };
    expect(woundHpFactor(2, r)).toBe(0.6);
    expect(woundHpFactor(2, r, 0.5)).toBe(0.8);
    expect(woundHpFactor(2, r, 5)).toBe(1); // en çok %100 yumuşar
    expect(applyWounds({}, 2, r, 0.25).modifiers?.hpMult).toBe(0.7);
  });
});

describe('motor kancaları', () => {
  it('Element direnci: o elementin skill / tik hasarı az; başka element ve fiziksel aynı', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ elemResist: { fire: 0.2 } }) });
    const w = at(b, 'party', 0);
    const foe = at(b, 'enemy', 0);
    expect(b.damageTakenMult(w, foe, 'magic', null, 'fire')).toBeCloseTo(0.8, 9);
    expect(b.damageTakenMult(w, foe, 'magic', null, 'ice')).toBe(1);
    // Holy ve Lightning direnci ayrı (Ömer 2026-10-26)
    const l = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'c_res_light', 'h') } }).itemEffects?.elemResist;
    expect(l?.lightning).toBeCloseTo(v('c_res_light') / 100, 6);
    expect(l?.holy).toBeUndefined();
    expect(affixLines(inst('leather_coif', 'c_res_light'))[0]!.text).toBe(`Takes ${v('c_res_light')}% less Lightning damage`);
    const z = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ elemResist: { lightning: 0.3 } }) });
    expect(z.damageTakenMult(at(z, 'party', 0), at(z, 'enemy', 0), 'magic', null, 'lightning')).toBeCloseTo(0.7, 9);
    expect(z.damageTakenMult(at(z, 'party', 0), at(z, 'enemy', 0), 'magic', null, 'holy')).toBe(1);
    const plain = make({ 0: 'warrior' }, { 0: 'mage' });
    const tick = (x: Battle) => x.tickDamage('fire', 'magic', 100, at(x, 'party', 0));
    expect(tick(b)).toBeLessThan(tick(plain));
    expect(b.tickDamage('ice', 'magic', 100, w)).toBe(plain.tickDamage('ice', 'magic', 100, at(plain, 'party', 0)));
  });

  it('Giantward: yalnızca elit / boss saldırandan alınan hasar az', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'archer' }, { 0: fx({ tierDamageTakenReduce: 0.25 }) }, { 0: { tier: 'elite' } });
    const w = at(b, 'party', 0);
    expect(b.damageTakenMult(w, at(b, 'enemy', 0), 'magic', null, 'fire')).toBeCloseTo(0.75, 9);
    expect(b.damageTakenMult(w, at(b, 'enemy', 1), 'physical', null, 'physical')).toBe(1);
  });

  it('Column ward: aynı şeritteki dostlar az hasar alır; taşıyan ve başka şerit almaz', () => {
    // yuva = sıra x 3 + şerit: 0 ve 3 aynı şerit (0), 1 başka şerit
    const b = make({ 0: 'warrior', 3: 'paladin', 1: 'archer' }, { 0: 'mage' }, { 3: fx({ columnGuard: 0.1 }) });
    expect(b.damageTakenMult(at(b, 'party', 0))).toBeCloseTo(0.9, 9);
    expect(b.damageTakenMult(at(b, 'party', 3))).toBe(1);
    expect(b.damageTakenMult(at(b, 'party', 1))).toBe(1);
  });

  it('Vanguard / Rearguard bane: ön sıradaki ya da gerisindeki düşmana hasar fazla', () => {
    const enemies = { 0: 'mage', 3: 'archer' };
    const plain = make({ 0: 'warrior' }, enemies);
    const ratio = (e: ItemEffects, slot: number) => {
      const b = make({ 0: 'warrior' }, enemies, { 0: fx(e) });
      return b.dealtDamageMult(at(b, 'party', 0), at(b, 'enemy', slot)) / plain.dealtDamageMult(at(plain, 'party', 0), at(plain, 'enemy', slot));
    };
    expect(ratio({ frontRowDamage: 0.2 }, 0)).toBeCloseTo(1.2, 9);
    expect(ratio({ frontRowDamage: 0.2 }, 3)).toBeCloseTo(1, 9);
    expect(ratio({ backRowDamage: 0.2 }, 3)).toBeCloseTo(1.2, 9);
    expect(ratio({ backRowDamage: 0.2 }, 0)).toBeCloseTo(1, 9);
  });

  it('Steady stance: Move olmayan her eylem bir yığın (en çok 3); Move sıfırlar', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ steadyDamage: 0.05 }) });
    const w = at(b, 'party', 0);
    const foe = at(b, 'enemy', 0);
    const base = b.dealtDamageMult(w, foe);
    const note = (kind: string) => (b as unknown as { noteAction: (u: string, k: string) => void }).noteAction(w.uid, kind);
    note('skill');
    expect(b.dealtDamageMult(w, foe) / base).toBeCloseTo(1.05, 9);
    note('rest');
    note('skill');
    note('skill');
    expect(b.dealtDamageMult(w, foe) / base).toBeCloseTo(1.15, 9);
    note('move');
    expect(b.dealtDamageMult(w, foe)).toBeCloseTo(base, 9);
  });

  it('Thorns: yakın dövüş skill vuruşunda hasarın oranı saldırana döner; menzilli tetiklemez', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, {}, { 0: fx({ thorns: 0.5 }) });
    b.debug.dodge = 'never';
    const w = at(b, 'party', 0);
    const hp0 = w.hp;
    b.useSkill(w.uid, warriorAttack, at(b, 'enemy', 0).uid);
    expect(b.log.some((e) => e.type === 'passive' && e.passive === 'thorns')).toBe(true);
    expect(w.hp).toBeLessThan(hp0);
    const r = make({ 0: 'archer' }, { 0: 'defender' }, {}, { 0: fx({ thorns: 0.5 }) });
    r.debug.dodge = 'never';
    const shot = content.classes.archer!.skills.find((id) => content.skills[id]!.motion !== 'melee' && content.skills[id]!.target === 'single_enemy')!;
    r.useSkill(at(r, 'party', 0).uid, shot, at(r, 'enemy', 0).uid);
    expect(r.log.some((e) => e.type === 'passive' && e.passive === 'thorns')).toBe(false);
  });

  it('Piercing blows: temel saldırı arkadaki düşmana da vurur; başka skill ve kancasız birim vurmaz', () => {
    const run = (setup: UnitSetup, skill = warriorAttack) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender', 3: 'mage' }, { 0: setup });
      b.debug.dodge = 'never';
      const back = at(b, 'enemy', 3);
      const hp0 = back.hp;
      b.useSkill(at(b, 'party', 0).uid, skill, at(b, 'enemy', 0).uid);
      return { lost: hp0 - back.hp, passive: b.log.some((e) => e.type === 'passive' && e.passive === 'piercing_blows') };
    };
    const hit = run(fx({ pierceBehind: 0.5 }));
    expect(hit.passive).toBe(true);
    expect(hit.lost).toBeGreaterThan(0);
    expect(run({})).toEqual({ lost: 0, passive: false });
    const other = content.classes.warrior!.skills.slice(1).find((id) => content.skills[id]!.target === 'single_enemy' && content.skills[id]!.effects.some((e) => e.type === 'damage') && !content.skills[id]!.initialCooldown);
    if (other) expect(run(fx({ pierceBehind: 0.5 }), other).passive).toBe(false);
  });
});
