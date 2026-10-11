import { afterEach, describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type ItemEffects, type Teams, type UnitSetup } from '../src/engine';
import { activeHeroes, addItem, debugTeleport, equipItem, latestSave, memoryKV, newCampaign, pickHero, writeSave, battlePlan } from '../src/campaign';
import { ITEMS, effectLine, emptyEquipment, equipmentEffects, itemDef, itemLines, loadoutSetup, validateItems } from '../src/progression';
import { newRun, wavePlan } from '../src/endless';
import { itemStatLines } from '../src/endless/format';


// Item etkileri: eski Epic etkilerinin motor kancaları (genel; veride artık kullanılmıyor, Ömer 2026-10-11) + Legendary etkileri, metin, yığılmama, Endless yolu, kayıt.

const f = content.formulas;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, enemyUnits: Record<number, UnitSetup> = {}, seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: enemyUnits } };
  return new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
};
const fx = (e: ItemEffects): UnitSetup => ({ itemEffects: e });
const unit = (b: Battle, uid: string) => b.combatants.find((c) => c.uid === uid)!;
type Priv = { addStatus: (t: unknown, s: unknown, emit: (e: BattleEvent) => void) => void; applyHit: (a: unknown, t: unknown, n: number, ty: string, crit: boolean, emit: (e: BattleEvent) => void, red: boolean, meta: unknown) => number };

describe('veri: Epic etkileri kaldırıldı, Legendary etkileri kalır (Ömer 2026-10-11)', () => {
  it('etki kaydı yalnızca Legendary etkileri (10 eski + 8 yeni); Epic item etki taşımaz', () => {
    expect(validateItems()).toEqual([]);
    expect(Object.keys(ITEMS.effects)).toHaveLength(18);
    for (const k of ['opening_ward', 'mana_spring', 'second_wind', 'quick_start', 'steadfast', 'iron_will', 'giantslayer', 'wardens_oath', 'ember_heart', 'thrifty', 'bloodletter']) expect(ITEMS.effects[k], k).toBeUndefined();
    expect(ITEMS.items.filter((d) => d.rarity !== 'legendary').every((d) => !d.effect)).toBe(true);
    expect(ITEMS.effectRules).toEqual({ stack: false, endless: true });
    expect(ITEMS.effects.forge_heart!.value).toBe(0.06); // Heart of the Forge şifa oranı düşürüldü
  });

  it('metin: kart / ipucu satırı etki adı + tek cümle (Gear, Spoils, Endless, tüccar aynı yardımcıyı kullanır)', () => {
    expect(effectLine(itemDef('emberbrand')!)).toBe('Emberbrand: Your hits set the target Burning for 2 turns (fire damage each turn).');
    expect(effectLine(itemDef('flashpowder_locket')!)).toBe('Blinding Opener: Your first damaging skill each battle Blinds up to 3 enemies it hits for 1 turn.');
    expect(effectLine(itemDef('serrated_edge')!)).toBe('Serrated Edge: Your critical hits leave the target Wounded and Burning for 2 turns.');
    expect(effectLine(itemDef('turnshoes')!)).toBeNull();
    expect(itemLines(itemDef('heart_of_the_forge')!).at(-1)).toMatch(/^Heart of the Forge: .*6%/);
    expect(itemStatLines(itemDef('drummers_gauntlets')!).at(-1)).toBe('Battle Rhythm: On a kill, gain Haste for 2 turns and 20% of your max MP.');
  });
});

describe('motor kancaları (verilmezse birim aynı)', () => {
  it('Opening Ward: savaş başı kalkan = maks canın oranı', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ startShieldRatio: 0.08 }) });
    const w = unit(b, 'party-0');
    expect(w.shield).toBe(Math.round(w.maxHp * 0.08));
    expect(unit(make({ 0: 'warrior' }, { 0: 'mage' }), 'party-0').shield).toBe(0);
  });

  it('Quick Start: dolu sayaçla başlayan birim ilk turunu daha erken alır', () => {
    const firstTurn = (b: Battle, uid: string) => b.log.findIndex((e) => e.type === 'turnStart' && e.actor === uid);
    const playUntil = (b: Battle) => {
      for (let i = 0; i < 12 && !b.winner; i++) {
        const a = b.currentActor;
        if (!a) break;
        b.act(a.uid, { kind: 'global', id: 'skip_turn' });
      }
      return b;
    };
    const base = playUntil(make({ 0: 'defender', 6: 'mage' }, { 0: 'archer', 1: 'cutthroat' }));
    const quick = playUntil(make({ 0: 'defender', 6: 'mage' }, { 0: 'archer', 1: 'cutthroat' }, { 6: fx({ startCharge: 0.9 }) }));
    const at = (i: number) => (i < 0 ? Infinity : i);
    expect(firstTurn(quick, 'party-1')).toBeGreaterThanOrEqual(0);
    expect(at(firstTurn(quick, 'party-1'))).toBeLessThan(at(firstTurn(base, 'party-1')));
  });

  it('Steadfast: çekilemez / itilemez', () => {
    const b = make({ 0: 'warrior', 1: 'mage' }, { 0: 'mage' }, { 0: fx({ steadfast: true }) });
    expect(b.immuneToDisplacement(unit(b, 'party-0'))).toBe(true);
    expect(b.immuneToDisplacement(unit(b, 'party-1'))).toBe(false);
  });

  it('Iron Will: debuff 1 tur kısalır (Resilience ile toplanır, tavan); etkisiz birim aynı', () => {
    const debuff = Object.entries(content.statuses).find(([, d]) => d.type === 'debuff' && !d.maxStacks && !d.untilResolved && !d.cc)![0];
    const run = (setup: UnitSetup | undefined, cls = 'mage') => {
      const b = make({ 0: cls }, { 0: 'mage' }, setup ? { 0: setup } : {});
      const t = unit(b, 'party-0');
      (b as unknown as Priv).addStatus(t, { kind: debuff, turns: 3, source: 'enemy-0' }, () => {});
      return t.statuses.find((s) => s.kind === debuff)!.turns;
    };
    expect(run(fx({ debuffShorten: { chance: 1, cap: 1 } }))).toBe(2);
    expect(run(undefined)).toBe(3); // mage: Resilience yok
    expect(run(fx({ debuffShorten: { chance: 1, cap: 0 } }))).toBe(3); // tavan 0
  });

  it('Giantslayer: elit / boss hedefe hasar çarpanı; önizleme de görür', () => {
    const b = make({ 0: 'warrior' }, { 0: 'warrior', 1: 'mage' }, { 0: fx({ tierDamageMult: 1.08 }) }, { 0: { tier: 'elite' } });
    const w = unit(b, 'party-0');
    expect(b.dealtDamageMult(w, unit(b, 'enemy-0'))).toBeCloseTo(1.08 * b.hunterMarkMult(w, unit(b, 'enemy-0')), 9);
    expect(b.dealtDamageMult(w, unit(b, 'enemy-1'))).toBe(b.hunterMarkMult(w, unit(b, 'enemy-1')));
    const plain = make({ 0: 'warrior' }, { 0: 'warrior', 1: 'mage' }, {}, { 0: { tier: 'elite' } });
    const sk = content.classes.warrior!.skills[0]!;
    const hi = previewSkill(b, 'party-0', sk, 'enemy-0');
    const lo = previewSkill(plain, 'party-0', sk, 'enemy-0');
    expect(JSON.stringify(hi)).not.toEqual(JSON.stringify(lo));
  });

  it("Warden's Oath: ekranda yan komşu dost daha az hasar alır; komşu olmayan almaz", () => {
    const b = make({ 0: 'defender', 1: 'mage', 9: 'archer' }, { 0: 'mage' }, { 0: fx({ adjacentGuard: 0.05 }) });
    expect(b.damageTakenMult(unit(b, 'party-1'))).toBeCloseTo(0.95, 9);
    expect(b.damageTakenMult(unit(b, 'party-2'))).toBe(1);
    expect(b.damageTakenMult(unit(b, 'party-0'))).toBe(1); // kendisi değil
  });

  it('Ember Heart: can eşiğin üstündeyken tur başında ek MP', () => {
    const regenOf = (setup: UnitSetup) => {
      const b = make({ 0: 'mage' }, { 0: 'defender' }, { 0: { ...setup, startMpRatio: 0 } });
      for (let i = 0; i < 20 && !b.winner; i++) {
        const a = b.currentActor;
        if (!a) break;
        if (a.uid === 'party-0' && b.log.some((e) => e.type === 'turnStart' && e.actor === 'party-0')) break;
        b.act(a.uid, { kind: 'global', id: 'skip_turn' });
      }
      const ev = b.log.filter((e): e is Extract<BattleEvent, { type: 'mpRegen' }> => e.type === 'mpRegen' && e.actor === 'party-0' && !e.cause);
      return ev[0]?.amount ?? 0;
    };
    expect(regenOf(fx({ turnMp: { mp: 1, above: 0.5 } }))).toBe(regenOf({}) + 1);
    expect(regenOf({ ...fx({ turnMp: { mp: 1, above: 0.5 } }), startHpRatio: 0.3 })).toBe(regenOf({}));
  });

  it('Thrifty: savaştaki ilk skill MP bedelsiz, sonrakiler normal', () => {
    const b = make({ 0: 'mage' }, { 0: 'defender' }, { 0: fx({ firstSkillFree: true }) });
    const m = unit(b, 'party-0');
    const sk = content.classes.mage!.skills.find((id) => content.skills[id]!.cost.resource === 'mp' && content.skills[id]!.cost.amount > 0 && content.skills[id]!.target === 'single_enemy')!;
    b.debug.dodge = 'never';
    expect(b.thriftyFree(m, 'mp')).toBe(true);
    const before = m.mp;
    expect(b.useSkill('party-0', sk, 'enemy-0').ok).toBe(true);
    const echo = b.log.filter((e): e is Extract<BattleEvent, { type: 'mpRegen' }> => e.type === 'mpRegen' && e.actor === 'party-0').reduce((x, e) => x + e.amount, 0);
    expect(m.mp - echo).toBe(before); // bedel ödenmedi (Mana Echo geri dönüşü hariç)
    expect(b.thriftyFree(m, 'mp')).toBe(false);
    expect(b.log.some((e) => e.type === 'resource' && e.actor === 'party-0')).toBe(false);
  });

  it('Mana Spring: kendi kritik vuruşunda MP', () => {
    const cast = (setup: UnitSetup) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: setup });
      b.debug.crit = 'always';
      b.debug.dodge = 'never';
        b.useSkill('party-0', content.classes.warrior!.skills[0]!, 'enemy-0');
      return b.log.filter((e): e is Extract<BattleEvent, { type: 'mpRegen' }> => e.type === 'mpRegen' && e.cause === 'mana_spring').reduce((a, e) => a + e.amount, 0);
    };
    expect(cast({ ...fx({ critMp: 4 }), startMp: 0 })).toBe(4); // eylem başına bir kez (çok vuruşlu skill'de de 4)
    expect(cast({ startMp: 0 })).toBe(0);
  });

  it('Second Wind: savaşta bir kez, eşiğin altına inince şifa', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ secondWind: { below: 0.3, heal: 0.12 } }) });
    const w = unit(b, 'party-0');
    const e = unit(b, 'enemy-0');
    const hit = (n: number) => (b as unknown as Priv).applyHit(e, w, n, 'physical', false, () => {}, false, { origin: 'skill' });
    hit(Math.ceil(w.maxHp * 0.75));
    const healedTo = w.hp;
    expect(w.secondWindUsed).toBe(true);
    expect(healedTo).toBe(w.maxHp - Math.ceil(w.maxHp * 0.75) + Math.round(w.maxHp * 0.12));
    hit(Math.round(w.maxHp * 0.1));
    expect(w.hp).toBe(healedTo - Math.round(w.maxHp * 0.1)); // ikinci kez yok
  });

  it('Bloodletter: canı eşiğin altındaki düşmana vuruşta verilen can kaybının oranı şifa', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { ...fx({ executeLifesteal: { below: 0.3, ratio: 0.5 } }), startHpRatio: 0.5 } }, { 0: { startHpRatio: 0.2 } });
    b.debug.dodge = 'never';
    b.useSkill('party-0', content.classes.warrior!.skills[0]!, 'enemy-0');
    expect(b.log.some((e) => e.type === 'passive' && e.passive === 'bloodletter')).toBe(true);
    const healthy = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { ...fx({ executeLifesteal: { below: 0.3, ratio: 0.5 } }), startHpRatio: 0.5 } });
    healthy.debug.dodge = 'never';
    healthy.useSkill('party-0', content.classes.warrior!.skills[0]!, 'enemy-0');
    expect(healthy.log.some((e) => e.type === 'passive' && e.passive === 'bloodletter')).toBe(false);
  });
});

describe('güç katmanı: etkiler, yığılmama, Endless, kayıt', () => {
  afterEach(() => {
    ITEMS.effectRules.stack = false;
    ITEMS.effectRules.endless = true;
  });

  it("Legendary etkisi kuruluma girer; aynı etki iki item'den toplanmaz (stack kapalı), açılınca toplanır", () => {
    const eq = { ...emptyEquipment(), trinket: { uid: 'a', id: 'heart_of_the_forge' } };
    expect(loadoutSetup({ class: 'paladin', equipment: eq }).itemEffects?.critHealAlly).toBe(0.06);
    const twice = { ...eq, helm: { uid: 'b', id: 'heart_of_the_forge' } };
    expect(equipmentEffects(twice)).toEqual({ critHealAlly: 0.06 });
    ITEMS.effectRules.stack = true;
    expect(equipmentEffects(twice)!.critHealAlly).toBeCloseTo(0.12, 9);
    expect(loadoutSetup({ class: 'defender', equipment: emptyEquipment() }).itemEffects).toBeUndefined();
  });

  it('Endless: Legendary etkileri dalga kurulumuna girer; effectRules.endless kapalıysa girmez (affix kancaları yine girer)', () => {
    const run = newRun(5, ['warrior', 'mage', 'archer', 'defender'], 't');
    run.heroes[0]!.equipment = { weapon: { uid: 'e1', id: 'emberbrand', rolls: { rarity: 'legendary', affixes: [{ id: 'c_phys', q: 0.5 }, { id: 'c_fire', q: 0.5 }, { id: 'b_pen', q: 0.5 }, { id: 'a_primary', q: 0.5 }] } } };
    const units = () => Object.values(wavePlan(run).units.party);
    expect(units().some((u) => u.itemEffects?.onHitDot !== undefined)).toBe(true);
    ITEMS.effectRules.endless = false;
    expect(units().some((u) => u.itemEffects?.onHitDot !== undefined)).toBe(false);
    expect(units().some((u) => u.itemEffects?.armorPen !== undefined)).toBe(true);
  });

  it('sefer: affix kancalı item kayıt round-trip sonrası savaş planında kancasıyla gelir', () => {
    let s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 21 }), 'archer'), '5A');
    s = { ...s, inventory: [] };
    const hero = activeHeroes(s)[0]!;
    const r = addItem(s, 'great_helm');
    r.state.inventory = r.state.inventory.map((it) => (it.uid === r.item.uid ? { ...it, rolls: { rarity: 'epic', affixes: [{ id: 'c_hp', q: 0.5 }, { id: 'c_armor', q: 0.5 }, { id: 'b_resil', q: 1 }, { id: 'a_gdef', q: 0 }] } } : it));
    s = equipItem(r.state, hero.id, r.item.uid);
    const kv = memoryKV();
    writeSave(kv, s, 'auto');
    const back = latestSave(kv)!.state;
    const cell = back.active.indexOf(hero.id);
    const fxs = battlePlan(back).units.party[cell]!.itemEffects!;
    expect(fxs.debuffAvoid).toBeGreaterThan(0);
    expect(fxs.damageTakenReduce).toBeGreaterThan(0);
  });

  it('Quick Battle kurulumunda etki yok (units verilmezse birim aynı)', () => {
    const b = new Battle(content.battleSetup('random-battle', 3, 'turns', { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'mage' }) }, false));
    for (const c of b.combatants) expect(c.itemEffects).toBeUndefined();
    void f;
  });
});
