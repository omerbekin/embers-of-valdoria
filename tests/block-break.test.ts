import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, previewSkill, type Teams, type UnitSetup } from '../src/engine';
import { ITEMS, SLOT_IDS, affixAllowed, affixValues, emptyEquipment, itemDef, itemIP, rollItem } from '../src/progression/items';
import { loadout } from '../src/progression/loadout';
import { heroPanel } from '../src/progression/item-text';
import { Rng } from '../src/engine/rng';
import { buildMechanics } from '../src/wiki/catalog';

// Block Break + kalkanlı moblar (Ömer 2026-10-31, #17): Block tavanı yok; saldırganın Block Break'i hedefin Block şansından doğrudan çıkar (en az 0).

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, partyUnits: Record<number, UnitSetup> = {}, enemyUnits: Record<number, UnitSetup> = {}, seed = 1): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: partyUnits, enemies: enemyUnits } };
  const b = new Battle(content.battleSetup('random-battle', seed, 'test', teams, false));
  b.debug.dodge = 'never';
  return b;
};
const shield = (chance: number): UnitSetup => ({ itemEffects: { blockChance: chance } });
const breaker = (v: number): UnitSetup => ({ itemEffects: { blockBreak: v } });
const PHYS = 'venom_edge';
const physEffect = () => {
  const e = content.skills[PHYS]!.effects.find((x) => x.type === 'damage')!;
  if (e.type !== 'damage') throw new Error('damage');
  return e;
};

/** Beklenen liste: görselinde ya da kitinde kalkan olan moblar (docs/design/open-questions.md, Block Break varsayımları). */
const SHIELD_MOBS: Record<string, number> = { risen_skeleton: 0.15, drowned_knight: 0.15, inquisition_brother: 0.15, deserter_captain: 0.15, guild_enforcer_bastion: 0.18, thane_of_the_deep: 0.18, shieldwarden: 0.2, cinder_gatewarden: 0.2, sworn_guard: 0.2 };

describe('Block Break: motor kuralı', () => {
  it('doğrudan çıkarma: Block - Block Break, en az 0; tavan yok', () => {
    const chance = (block: number, brk: number) => {
      const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: breaker(brk) }, { 0: shield(block) });
      return b.blockChance(b.get('party-0')!, b.get('enemy-0')!, physEffect());
    };
    expect(chance(0.2, 0.06)).toBeCloseTo(0.14, 9);
    expect(chance(0.2, 0.2)).toBe(0);
    expect(chance(0.2, 0.5)).toBe(0);
    expect(chance(0.6, 0)).toBeCloseTo(0.6, 9);
    expect(chance(1.2, 0.3)).toBeCloseTo(0.9, 9); // önce çıkarma; %100'ü aşan Block boşa gitmez
    expect(chance(1.5, 0.1)).toBe(1); // olasılık 1'i aşmaz
  });

  it('kırılan Block zar atmaz: olay akışı kalkansız savaşla birebir', () => {
    const run = (units: Record<number, UnitSetup>, enemy: Record<number, UnitSetup>) => {
      const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, units, enemy, 7);
      const r = b.useSkill('party-0', PHYS, 'enemy-0');
      return JSON.stringify(r.ok ? r.events : r);
    };
    expect(run({ 0: breaker(0.5) }, { 0: shield(0.3) })).toBe(run({}, {}));
  });

  it('aynı seed aynı sonuç; Block Break blok oranını düşürür', () => {
    const blocks = (brk: number) => {
      let n = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: breaker(brk) }, { 0: shield(0.5) }, seed);
        const r = b.useSkill('party-0', PHYS, 'enemy-0');
        if (r.ok && r.events.some((e) => e.type === 'block')) n++;
      }
      return n / 400;
    };
    const a = blocks(0.3);
    expect(blocks(0.3)).toBe(a);
    expect(a).toBeGreaterThan(0.12);
    expect(a).toBeLessThan(0.28);
    expect(blocks(0)).toBeGreaterThan(0.4);
  });

  it('önizleme: isabet x (1 - (Block - Block Break))', () => {
    const hit = (u: Record<number, UnitSetup>, e: Record<number, UnitSetup>) => previewSkill(make({ 0: 'cutthroat' }, { 0: 'defender' }, u, e), 'party-0', PHYS, 'enemy-0')[0]!.damage!.hitChance;
    expect(hit({ 0: breaker(0.1) }, { 0: shield(0.3) })).toBeCloseTo(hit({}, {}) * 0.8, 9);
    expect(hit({ 0: breaker(0.5) }, { 0: shield(0.3) })).toBeCloseTo(hit({}, {}), 9);
  });

  it('Force block (debug) Block Break ile kırılmaz', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: breaker(1) }, {}, 3);
    b.debug.block = true;
    const r = b.useSkill('party-0', PHYS, 'enemy-0');
    expect(r.ok && r.events.some((e) => e.type === 'block')).toBe(true);
  });

  it('birim kartı değerleri', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'defender' }, { 0: breaker(0.07) });
    expect(b.unitBlockBreak(b.get('party-0')!)).toBeCloseTo(0.07, 9);
    expect(b.unitBlockBreak(b.get('enemy-0')!)).toBe(0);
  });
});

describe('kalkanlı moblar', () => {
  it('Block şansı veride, liste tam; değerler kalkan tabanı aralığında', () => {
    const got = Object.fromEntries(Object.values(content.mobs).filter((m) => m.blockChance).map((m) => [m.id, m.blockChance]));
    expect(got).toEqual(SHIELD_MOBS);
    const bases = ITEMS.items.filter((d) => d.slot === 'offhand' && d.implicitBase?.length).map((d) => d.implicitBase![0]! / 100);
    for (const v of Object.values(SHIELD_MOBS)) {
      expect(v).toBeGreaterThanOrEqual(Math.min(...bases));
      expect(v).toBeLessThanOrEqual(Math.max(...bases));
    }
  });

  it('Deserter Captain: Bandit Chief kitinin birebir kopyası, tek fark Block ve görünüş; Bandit Chief kalkansız kalır', () => {
    const { id: _a, name: _b, spriteId: _c, blockChance, _not: _d, ...cap } = content.mobs['deserter_captain']! as unknown as Record<string, unknown>;
    const { id: _e, name: _f, spriteId: _g, _not: _h, ...chief } = content.mobs['bandit_chief']! as unknown as Record<string, unknown>;
    expect(blockChance).toBe(0.15);
    expect(cap).toEqual(chief);
    expect(content.mobs['bandit_chief']!.blockChance).toBeUndefined();
    for (const id of ['stonebound_warden', 'drowned_champion', 'morvane_halberdier']) expect(content.mobs[id]?.blockChance, id).toBeUndefined();
  });

  it('kalkanlı mob fiziksel vuruşu bloklar, büyüyü bloklamaz; güçlendirme Block değerini değiştirmez', () => {
    const plain = make({ 0: 'cutthroat' }, { 0: 'shieldwarden' });
    const strong = make({ 0: 'cutthroat' }, { 0: 'shieldwarden' }, {}, { 0: { modifiers: { hpMult: 2, statMult: 2, powerMult: 2 } } });
    expect(plain.unitBlockChance(plain.get('enemy-0')!)).toBeCloseTo(0.2, 9);
    expect(strong.unitBlockChance(strong.get('enemy-0')!)).toBeCloseTo(0.2, 9);
    let seen = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const b = make({ 0: 'cutthroat' }, { 0: 'shieldwarden' }, {}, {}, seed);
      const r = b.useSkill('party-0', PHYS, 'enemy-0');
      if (r.ok && r.events.some((e) => e.type === 'block' && e.target === 'enemy-0')) seen++;
    }
    expect(seen).toBeGreaterThan(0);
    const m = make({ 0: 'mage' }, { 0: 'shieldwarden' });
    const mage = content.classes.mage!.skills.find((id) => content.skills[id]!.effects.some((e) => e.type === 'damage' && e.damageType === 'magic'))!;
    const e = content.skills[mage]!.effects.find((x) => x.type === 'damage')!;
    if (e.type === 'damage') expect(m.blockChance(m.get('party-0')!, m.get('enemy-0')!, e)).toBe(0);
  });

  it('kalkansız mob ve kahraman: Block 0', () => {
    const b = make({ 0: 'defender' }, { 0: 'road_thug' });
    expect(b.unitBlockChance(b.get('party-0')!)).toBe(0);
    expect(b.unitBlockChance(b.get('enemy-0')!)).toBe(0);
  });
});

describe('Block Break affix (b_blockbreak)', () => {
  const inst = (uid: string, id: string, ilvl: number, q: number) => ({ uid, id, rolls: { rarity: 'rare' as const, ilvl, affixes: [{ id: 'b_blockbreak', q }] } });

  it('veri: B kademesi, silah + eldiven; IP değeri var; seviyeyle büyür', () => {
    const a = ITEMS.affixDefs.b_blockbreak!;
    expect(a.tier).toBe('B');
    for (const s of SLOT_IDS) expect(affixAllowed('b_blockbreak', s), s).toBe(s === 'weapon' || s === 'gloves');
    expect(a.parts[0]!.ip).toBeGreaterThan(0);
    expect(affixValues('b_blockbreak', 30, 0.5)[0]).toBeGreaterThan(affixValues('b_blockbreak', 1, 0.5)[0]!);
    expect(itemIP(itemDef('arming_sword')!, 'rare')).toBeGreaterThan(0);
  });

  it('loadout: iki yuva toplanır, motora gider, panelde satır', () => {
    const L = 20;
    const one = affixValues('b_blockbreak', L, 0.5)[0]!;
    const gloves = ITEMS.items.find((d) => d.slot === 'gloves')!.id;
    const src = { class: 'warrior', equipment: { ...emptyEquipment(), weapon: inst('w', 'arming_sword', L, 0.5), gloves: inst('g', gloves, L, 0.5) } };
    expect(loadout(src).itemEffects!.blockBreak).toBeCloseTo((one * 2) / 100, 6);
    expect(heroPanel(src).find((p) => p.id === 'blockBreak')!.value).toBeCloseTo((one * 2) / 100, 6);
    expect(heroPanel({ class: 'warrior', equipment: emptyEquipment() }).find((p) => p.id === 'blockBreak')!.value).toBe(0);
  });

  it('normal item üretiminde çıkar, yalnızca silah ve eldivende', () => {
    const rng = new Rng(11);
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      const d = ITEMS.items[i % ITEMS.items.length]!;
      if (d.rarity === 'legendary') continue;
      const roll = rollItem(d, rng, { rarity: 'epic' });
      if (roll.affixes.some((a) => a.id === 'b_blockbreak')) seen.add(d.slot);
    }
    expect([...seen].sort()).toEqual(['gloves', 'weapon']);
  });
});

describe('YZ: Block ve Block Break', () => {
  it("saldırı değeri kalkanı görür: yüksek Block'lu hedeften kaçar, Block Break varken ona döner", () => {
    const target = (units: Record<number, UnitSetup>) => {
      const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage' }, units, { 0: { ...shield(0.95), startHpRatio: 0.4 } }, 5);
      const act = chooseAction(b, 'party-0', content.aiConfig);
      return act?.targetUid ?? null;
    };
    expect(target({})).toBe('enemy-1');
    expect(target({ 0: breaker(0.95) })).toBe('enemy-0');
  });

  it("kalkanlı mobun Block'u önizlemede", () => {
    const p = previewSkill(make({ 0: 'cutthroat' }, { 0: 'shieldwarden' }), 'party-0', PHYS, 'enemy-0')[0]!.damage!;
    const q = previewSkill(make({ 0: 'cutthroat' }, { 0: 'shieldwarden' }, { 0: breaker(1) }), 'party-0', PHYS, 'enemy-0')[0]!.damage!;
    expect(p.hitChance).toBeCloseTo(q.hitChance * 0.8, 9);
  });
});

describe('Block Break: Codex', () => {
  it('kural ve mob listesi Mechanics metninde; toplam sınır cümlesi yok', () => {
    const text = JSON.stringify(buildMechanics());
    expect(text).toContain('Block break: an attacker');
    expect(text).toContain('Shieldwarden 20%');
    expect(text).toContain('Sworn Guard 20%');
    expect(text).not.toMatch(/at most \d+% in total/);
    expect(text).not.toContain('block chance (shields)');
  });
});
