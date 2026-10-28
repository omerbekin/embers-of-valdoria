// Silah tipleri reworkü (Ömer 2026-10-27, open-questions 443; items.md 1.12): tip örtüğü, güç / hız profili, çift el yakın dövüş, çekiç Daze,
// spdVariance 0,05, eski War Maul kaydı ve sınıf kısıtı. Değerler veriden okunur (İLK DEĞER, sim yok); testler yalnızca kuralı denetler.
import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleMode, type Combatant, type ItemEffects, type Teams, type UnitSetup } from '../src/engine';
import {
  ITEMS,
  canEquip,
  implicitDefOf,
  implicitGripMult,
  implicitValues,
  isTwoHandMelee,
  itemDef,
  weaponPowerOf,
  weaponSpeedPenalties,
  weaponTypeOf,
  type ItemDef,
  type ItemInstance,
} from '../src/progression/items';
import { implicitResultHint, loadout } from '../src/progression/loadout';
import { instanceBaseLines } from '../src/progression/item-text';

const def = (id: string): ItemDef => itemDef(id)!;
const cellsOf = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const inst = (id: string, ilvl = 10): ItemInstance => ({ uid: `u-${id}`, id, rolls: { rarity: 'common', ilvl, affixes: [] } });
const W = ITEMS.weaponPower!;
const T = ITEMS.weaponTypes!;
const H2 = ITEMS.twoHandMelee!;
/** Tipsiz / gripsiz ham güç (kılıç = x1). */
const rawPower = (d: ItemDef, ilvl: number) => (W.base + W.perIlvl * Math.max(1, ilvl)) * (W.grip[d.grip ?? 'one'] ?? 1);

describe('silah tipi verisi', () => {
  it('her silahın bir tipi var; aile tipi ve taban tipi (kılıç) okunur', () => {
    for (const d of ITEMS.items.filter((x) => x.slot === 'weapon')) expect(weaponTypeOf(d), d.id).toBeDefined();
    expect(weaponTypeOf(def('arming_sword'))).toBe('sword');
    expect(weaponTypeOf(def('woodcutters_axe'))).toBe('axe');
    expect(weaponTypeOf(def('war_maul'))).toBe('hammer');
    expect(weaponTypeOf(def('war_hammer'))).toBe('hammer');
    expect(def('war_maul').family).toBe('hammers');
  });

  it('aynı ailede tip örtüğü ayrı: balta Biting edge (armorPen), kılıç Keen edge (critAdd)', () => {
    expect(def('woodcutters_axe').family).toBe(def('arming_sword').family);
    const axe = implicitDefOf(def('woodcutters_axe'))!;
    const sword = implicitDefOf(def('arming_sword'))!;
    expect(axe.name).toBe('Biting edge');
    expect(axe.parts[0]!.to).toBe('fx:armorPen');
    expect(sword.name).toBe('Keen edge');
    expect(sword.parts[0]!.to).toBe('mod:critAdd');
    const lAxe = loadout({ class: 'warrior', equipment: { weapon: inst('woodcutters_axe') } });
    const lSword = loadout({ class: 'warrior', equipment: { weapon: inst('arming_sword') } });
    expect(lAxe.itemEffects?.armorPen).toBeGreaterThan(0);
    expect(lSword.itemEffects?.armorPen ?? 0).toBe(0);
    expect(lSword.modifiers?.critAdd ?? 0).toBeGreaterThan(lAxe.modifiers?.critAdd ?? 0);
    const want: Record<string, string> = { sword: 'Keen edge', dagger: 'Quick hands', axe: 'Biting edge', mace: 'True strike', hammer: 'Daze', bow: 'Deadly draw', staff: 'Deep well', charm: 'Wellspring' };
    for (const [t, name] of Object.entries(want)) expect(ITEMS.implicits?.[t]?.name, t).toBe(name);
  });

  it('tip güç / hız profili: kılıç x1, hançer x0,85, balta x1,1 -%5, gürz x1,18 -%9, çekiç x1,05 -%2', () => {
    expect(T.sword?.power ?? 1).toBe(1);
    expect(T.dagger?.power).toBe(0.85);
    expect([T.axe?.power, T.axe?.spdLess]).toEqual([1.1, 5]);
    expect([T.mace?.power, T.mace?.spdLess]).toEqual([1.18, 9]);
    expect([T.hammer?.power, T.hammer?.spdLess]).toEqual([1.05, 2]);
    const step = W.step || 1;
    for (const id of ['arming_sword', 'woodcutters_axe', 'flanged_mace', 'war_hammer', 'rondel_dagger']) {
      const d = def(id);
      const tp = T[weaponTypeOf(d)!]?.power ?? 1;
      expect(Math.abs(weaponPowerOf(d, 10) - rawPower(d, 10) * tp), id).toBeLessThanOrEqual(step / 2 + 1e-9);
    }
    expect(weaponSpeedPenalties(def('arming_sword'))).toEqual([]);
    expect(weaponSpeedPenalties(def('woodcutters_axe')).map((p) => p.pct)).toEqual([5]);
    expect(weaponSpeedPenalties(def('flanged_mace')).map((p) => p.pct)).toEqual([9]);
    expect(weaponSpeedPenalties(def('war_hammer')).map((p) => p.pct)).toEqual([2]);
    // hız cezası spdMult'a çarpılarak girer (kişisel zardan önce)
    const sp = (id: string, cls: string) => loadout({ class: cls, equipment: { weapon: inst(id) } }).modifiers?.spdMult ?? 1;
    expect(sp('flanged_mace', 'paladin')).toBeCloseTo(0.91, 6);
    expect(sp('arming_sword', 'warrior')).toBe(1);
  });

  it('çift el yakın dövüş: güç x1,45 x1,15, örtük x1,6675, ek %5 hız cezası (Heavy grip); asa ve yay değişmez', () => {
    expect(H2.power).toBe(1.15);
    expect(W.grip.two).toBe(1.45);
    const ga = def('greataxe');
    expect(isTwoHandMelee(ga)).toBe(true);
    expect(isTwoHandMelee(def('ash_staff'))).toBe(false);
    expect(isTwoHandMelee(def('short_bow'))).toBe(false);
    expect(implicitGripMult(ga)).toBeCloseTo(1.45 * 1.15, 9);
    expect(implicitGripMult(def('ash_staff'))).toBe(1);
    expect(implicitGripMult(def('short_bow'))).toBe(1);
    const step = W.step || 1;
    expect(Math.abs(weaponPowerOf(ga, 10) - rawPower(ga, 10) * T.axe!.power! * H2.power)).toBeLessThanOrEqual(step / 2 + 1e-9);
    // asa: tip gücü yok, 2H çarpanı yok
    expect(Math.abs(weaponPowerOf(def('ash_staff'), 10) - rawPower(def('ash_staff'), 10))).toBeLessThanOrEqual(step / 2 + 1e-9);
    // örtük: kılıç 1H 1,5 + 0,1 x ilvl ; greatsword aynı x1,6675 (adıma yuvarlı)
    const imp = implicitDefOf(def('greatsword'))!;
    const one = implicitValues(imp, 10)[0]!;
    const two = implicitValues(imp, 10, def('greatsword'))[0]!;
    expect(Math.abs(two - one * 1.6675)).toBeLessThanOrEqual(imp.parts[0]!.step);
    expect(implicitValues(implicitDefOf(def('ash_staff'))!, 10, def('ash_staff'))).toEqual(implicitValues(implicitDefOf(def('ash_staff'))!, 10));
    // hız: tip cezası + Heavy grip, çarpılarak (balta 2H: 0,95 x 0,95)
    const pens = weaponSpeedPenalties(ga);
    expect(pens.map((p) => [p.pct, !!p.heavy])).toEqual([[5, false], [H2.spdLess, true]]);
    expect(loadout({ class: 'warrior', equipment: { weapon: inst('greataxe') } }).modifiers?.spdMult).toBeCloseTo(0.95 * 0.95, 6);
    expect(weaponSpeedPenalties(def('ash_staff'))).toEqual([]);
    const lines = instanceBaseLines(inst('greataxe'));
    expect(lines.heavy?.name).toBe('Heavy grip');
    expect(lines.heavy?.text).toBe('5% less Speed');
    expect(lines.implicit?.text).toContain('5% less Speed');
  });

  it('gürz: oransal Accuracy ("6% more Accuracy"), ipucunda soluk "(önce → sonra)"', () => {
    const l = loadout({ class: 'paladin', equipment: { weapon: inst('flanged_mace') } });
    expect(l.modifiers?.accuracyMult).toBeCloseTo(1.06, 6);
    const acc = (m?: { accuracyMult: number }) => {
      const units: Record<number, UnitSetup> = m ? { 0: { modifiers: m } } : {};
      const teams: Teams = { party: cellsOf({ 0: 'paladin' }), enemies: cellsOf({ 0: 'warrior' }), units: { party: units, enemies: {} } };
      return new Battle(content.battleSetup('random-battle', 1, 'test', teams, false)).combatants.find((c) => c.side === 'party')!.stats.accuracy;
    };
    expect(acc({ accuracyMult: 1.06 })).toBeCloseTo(acc() * 1.06, 3);
    expect(instanceBaseLines(inst('flanged_mace')).implicit?.text).toBe('6% more Accuracy, 9% less Speed');
    expect(implicitResultHint('paladin', l.modifiers, def('flanged_mace'), 10)).toMatch(/^\(.+ → .+\)$/);
    expect(implicitResultHint('paladin', l.modifiers, def('arming_sword'), 10)).toBeUndefined(); // toplamsal örtük: ipucu yok
  });

  it('çekiç sınıfları: Defender ve Paladin takar, Warrior takamaz', () => {
    for (const id of ['war_hammer', 'horsemans_hammer', 'templars_hammer', 'war_maul']) {
      expect(canEquip('defender', def(id)), id).toBe(true);
      expect(canEquip('paladin', def(id)), id).toBe(true);
      expect(canEquip('warrior', def(id)), id).toBe(false);
    }
  });

  it('eski kayıt: War Maul örneği yüklenir (Warrior elinde bile), çekiç örtüğü Daze verir', () => {
    const l = loadout({ class: 'warrior', equipment: { weapon: { uid: 'old', id: 'war_maul' } } });
    expect(l.itemEffects?.dazeChance).toBeGreaterThan(0);
    const d = loadout({ class: 'defender', equipment: { weapon: inst('war_hammer') } });
    expect(d.itemEffects?.dazeChance).toBeCloseTo(0.15, 6);
    // çift el çekiç x1,6675
    expect(loadout({ class: 'defender', equipment: { weapon: inst('war_maul') } }).itemEffects?.dazeChance).toBeCloseTo(0.25, 2);
  });
});

describe('Daze (çekiç örtüğü)', () => {
  const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
  const make = (seed: number, e: ItemEffects, mode: BattleMode = 'turns'): Battle => {
    const units: Record<number, UnitSetup> = { 0: { itemEffects: e } };
    const teams: Teams = { party: cells({ 0: 'defender' }), enemies: cells({ 0: 'warrior' }), units: { party: units, enemies: {} } };
    return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
  };
  const at = (b: Battle, side: 'party' | 'enemy'): Combatant => b.combatants.find((c) => c.side === side && !c.summoned)!;
  /** Defender'ın sırasına kadar geçer, ilk saldırısını düşmana vurur; olaylar + hedefin sayaç farkı. */
  const strike = (seed: number, e: ItemEffects, boss = false, mode: BattleMode = 'turns') => {
    const b = make(seed, e, mode);
    b.debug.dodge = 'never';
    const a = at(b, 'party');
    const t = at(b, 'enemy');
    if (boss) (t as { tier?: string }).tier = 'boss';
    t.hp = t.maxHp = 100000;
    if (mode === 'turns') for (let i = 0; i < 200 && b.currentUid !== a.uid; i++) b.skipTurn();
    const before = t.turnCounter;
    const r = b.useSkill(a.uid, content.classes.defender!.skills[0]!, t.uid);
    if (!r.ok) throw new Error(r.reason);
    const daze = r.events.filter((x) => x.type === 'daze');
    return { b, daze, delta: before - t.turnCounter, after: t.turnCounter, log: JSON.stringify(r.events) };
  };
  const F = content.formulas;

  it('veri: itme eşiğin %25i, boss yarısı', () => {
    expect(F.daze?.push).toBe(0.25);
    expect(F.daze?.bossMult).toBe(0.5);
  });

  it('şans 1: vuruş hedefin sayacını threshold x 0,25 geri iter, "daze" olayı', () => {
    const on = strike(3, { dazeChance: 1 });
    const off = strike(3, {});
    expect(on.daze.length).toBeGreaterThan(0);
    const push = F.turn.threshold * F.daze!.push;
    expect((on.daze[0] as { push: number }).push).toBeCloseTo(push, 3);
    expect(off.after - on.after).toBeCloseTo(push * on.daze.length, 3); // aynı seed, Daze'siz koşuya göre sayaç geride
  });

  it('boss yarı itme alır', () => {
    const { daze } = strike(3, { dazeChance: 1 }, true);
    expect((daze[0] as { push: number }).push).toBeCloseTo(F.turn.threshold * F.daze!.push * F.daze!.bossMult, 3);
  });

  it('şans 0: hiç Daze yok; test modunda Daze yok (yalnızca turns)', () => {
    expect(strike(3, {}).daze).toEqual([]);
    expect(strike(3, { dazeChance: 1 }, false, 'test').daze).toEqual([]);
  });

  it('şans %15: seed\'li zar, kabaca oranında ve deterministik', () => {
    let hits = 0;
    let n = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = strike(seed, { dazeChance: 0.15 });
      n += 1;
      if (r.daze.length) hits++;
    }
    expect(hits / n).toBeGreaterThan(0.06);
    expect(hits / n).toBeLessThan(0.3);
    expect(strike(17, { dazeChance: 0.15 }).log).toBe(strike(17, { dazeChance: 0.15 }).log);
  });
});
