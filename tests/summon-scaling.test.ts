import { describe, expect, it } from 'vitest';
import { Battle, applySummonerScale, content } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, UnitSetup } from '../src/engine';
import { loadoutSetup, summonBaseOf } from '../src/progression/loadout';
import { LEVELS, statPointsAt } from '../src/progression/levels';

// Çağrı yeniden tasarımı (Ömer 2026-10-18, D1 + D2 + q1-q3): çağrının statları çağıranın item HARİÇ temel statından türer (Skeleton STR'den,
// Treant INT'ten; oranlar data/summons > summonerScale), level'ı çağıranın level'ı; çağrılar yine 2 kat hasar alır. L1'de Treant bugünküyle
// aynı, Skeleton vurucu (Ömer ikinci karar: can ~78, hız 17, STR ~48 = ilk tasarımın 40ının +%20si). Sayılar veriden okunur.

const f = content.formulas;
const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');
const SKILL_OF: Record<string, string> = { undead: 'raise_dead', druid: 'summon_treant' };
const UNIT_OF: Record<string, string> = { undead: 'skeleton', druid: 'treant' };

/** Çağıran (party yuva 3) karşısında tek düşman; çağıranın kurulumu `unit`. Çağrı yapılır, çağrılan birim döner. */
function summonWith(cls: string, unit?: UnitSetup, mode: BattleMode = 'test'): { b: Battle; owner: Combatant; summon: Combatant; events: BattleEvent[] } {
  const b = new Battle(content.battleSetup('random-battle', 3, mode, { party: cells({ 3: cls }), enemies: cells({ 0: 'warrior' }), ...(unit ? { units: { party: { 3: unit } } } : {}) }, false));
  const owner = b.combatants.find((c) => c.side === 'party' && c.defId === cls)!;
  if (mode === 'turns') {
    owner.cooldowns = {};
    for (let i = 0; i < 400 && b.currentUid !== owner.uid; i++) b.skipTurn();
  }
  const r = b.useSkill(owner.uid, SKILL_OF[cls]!);
  if (!r.ok) throw new Error(r.reason);
  const summon = b.combatants.find((c) => c.summoned && c.owner === owner.uid)!;
  return { b, owner, summon, events: r.events };
}

describe('çağrı statları çağırandan türer (veri)', () => {
  it('Skeleton STR, Treant INT ölçekli; dosyadaki taban statlar L1 çağıranın değerleri (çağıransız hazır çağrı bunları kullanır)', () => {
    const sk = content.summons.skeleton!;
    const tr = content.summons.treant!;
    expect(sk.summonerScale?.from).toBe('str');
    expect(tr.summonerScale?.from).toBe('int');
    for (const [cls, id] of Object.entries(UNIT_OF)) {
      const def = content.summons[id]!;
      const l1 = applySummonerScale(def, content.classes[cls]!.attributes, f);
      expect(l1.stats.hp, id).toBe(def.stats.hp);
      expect(l1.attributes, id).toEqual(def.attributes);
      expect(Math.round(l1.stats.hpRegen), id).toBe(Math.round(def.stats.hpRegen));
    }
  });

  it('D2 hedefleri (L1 Undead; Ömer 2026-10-18 ikinci karar: hasar +%20, can -%5): Skeleton canı ~78 (ilk tasarım 75, -%5 sonra +%10; eski 105), hızı 17 (eski 12), STR ~48 (ilk tasarım 40, eski 30); Treant L1 bugünküyle aynı (INT 27, can 105)', () => {
    const sk = applySummonerScale(content.summons.skeleton!, content.classes.undead!.attributes, f);
    expect(sk.stats.hp).toBeGreaterThanOrEqual(76);
    expect(sk.stats.hp).toBeLessThanOrEqual(80);
    expect(sk.stats.spd).toBe(17);
    expect(sk.stats.str / 40).toBeGreaterThanOrEqual(1.17);
    expect(sk.stats.str / 40).toBeLessThanOrEqual(1.23);
    const tr = applySummonerScale(content.summons.treant!, content.classes.druid!.attributes, f);
    expect(tr.stats.int).toBe(27);
    expect(tr.stats.hp).toBe(105);
    expect(tr.stats.hpRegen).toBeCloseTo(3.375, 2);
  });

  it('Skeleton yeni pasif / ölünce etkisi taşımaz (Ömer: yalnızca Undead pasifi)', () => {
    expect(content.summons.skeleton!.passive).toBeUndefined();
  });
});

describe('savaşta çağrı (iki mod)', () => {
  for (const mode of ['test', 'turns'] as const) {
    it(`L1 (${mode}): Raise Dead / Summon Treant çağıranın statından; level verilmezse tanımsız (L1)`, () => {
      for (const cls of ['undead', 'druid']) {
        const { summon, owner } = summonWith(cls, undefined, mode);
        const scale = content.summons[UNIT_OF[cls]!]!.summonerScale!;
        const src = owner.stats[scale.from];
        const key = Object.keys(scale.attributes)[0] as 'str' | 'int';
        // Raise Dead cesetsiz: beslenmemiş varyant (x unfed mult)
        const mult = cls === 'undead' ? content.summons.skeleton!.variants!.unfed.mult : 1;
        expect(summon.maxHp, cls).toBe(Math.max(1, Math.round(Math.round(src * scale.hp) * mult)));
        // beslenmemiş varyant STR/INT'yi summon.variantStatStep katına yuvarlar (stats.ts > applySummonVariant)
        const step = f.summon?.variantStatStep ?? 0.1;
        const raw = Math.round(src * scale.attributes[key]!) * mult;
        expect(summon.stats[key], cls).toBeCloseTo(mult === 1 ? raw : Math.round(raw / step) * step, 6);
        expect(summon.level).toBeUndefined();
      }
    });
  }

  it('L5 (L5 puanlarının hepsi ana stata): çağrı büyür; level = çağıranın level\'ı', () => {
    const pts = statPointsAt(5);
    for (const cls of ['undead', 'druid']) {
      const scale = content.summons[UNIT_OF[cls]!]!.summonerScale!;
      const src = { class: cls, level: 5, alloc: { [scale.from]: pts } };
      const setup = loadoutSetup(src);
      expect(setup.level).toBe(5);
      const l1 = summonWith(cls).summon;
      const l5 = summonWith(cls, setup).summon;
      const base = content.classes[cls]!.attributes[scale.from] + pts * LEVELS.statPerPoint;
      expect(summonBaseOf(src)![scale.from]).toBe(base);
      const mult = cls === 'undead' ? content.summons.skeleton!.variants!.unfed.mult : 1;
      expect(l5.maxHp, cls).toBe(Math.max(1, Math.round(Math.round(base * scale.hp) * mult)));
      expect(l5.maxHp).toBeGreaterThan(l1.maxHp);
      const key = Object.keys(scale.attributes)[0] as 'str' | 'int';
      expect(l5.stats[key]).toBeGreaterThan(l1.stats[key]);
      expect(l5.level).toBe(5);
    }
  });

  it('item statları çağrıya GEÇMEZ (q3): item eki çağıranı güçlendirir, summonBase verilince çağrı L1 ile aynı', () => {
    for (const cls of ['undead', 'druid']) {
      const from = content.summons[UNIT_OF[cls]!]!.summonerScale!.from;
      const l1 = summonWith(cls).summon;
      const withItem = summonWith(cls, { modifiers: { attrAdd: { [from]: 20 } }, summonBase: { ...content.classes[cls]!.attributes } });
      expect(withItem.owner.stats[from]).toBe(content.classes[cls]!.attributes[from] + 20);
      expect(withItem.summon.maxHp, cls).toBe(l1.maxHp);
      expect(withItem.summon.stats.str, cls).toBe(l1.stats.str);
      expect(withItem.summon.stats.int, cls).toBe(l1.stats.int);
      // summonBase yoksa (düşman: item yok, ek level büyümesi / zorluktur) birimin son statı kullanılır
      expect(summonWith(cls, { modifiers: { attrAdd: { [from]: 20 } } }).summon.maxHp).toBeGreaterThan(l1.maxHp);
    }
  });

  it('loadoutSetup: item yoksa summonBase verilmez (motor aynı statı kullanır); level yalnızca L2+', () => {
    const s1 = loadoutSetup({ class: 'undead', level: 1 });
    expect(s1.summonBase).toBeUndefined();
    expect(s1.level).toBeUndefined();
    expect(loadoutSetup({ class: 'undead', level: 3, alloc: { str: 6 } }).summonBase).toBeUndefined();
  });

  it('çağrılar yine 2 kat hasar alır (q1: formulas summon.damageTakenMultiplier korunur)', () => {
    expect(f.summon.damageTakenMultiplier).toBe(2);
    const hit = (summoned: boolean) => {
      const base = content.battleSetup('random-battle', 5, 'test', { party: cells({ 3: 'undead' }), enemies: cells({ 0: 'warrior' }) }, false);
      const b = new Battle({ ...base, formulas: { ...f, damage: { ...f.damage, variance: 0 } } });
      b.debug.crit = 'never';
      for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0 });
      const owner = b.combatants.find((c) => c.side === 'party')!;
      b.useSkill(owner.uid, 'raise_dead');
      const sk = b.combatants.find((c) => c.summoned)!;
      sk.summoned = summoned;
      sk.hp = sk.maxHp = 100000;
      const warrior = b.combatants.find((c) => c.side === 'enemy')!;
      const r = b.useSkill(warrior.uid, warrior.skills[0]!, sk.uid);
      if (!r.ok) throw new Error(r.reason);
      return r.events.filter((e) => e.type === 'damage' && e.target === sk.uid).reduce((s, e) => s + (e as { amount: number }).amount, 0);
    };
    const normal = hit(false);
    expect(normal).toBeGreaterThan(0);
    expect(Math.abs(hit(true) - normal * f.summon.damageTakenMultiplier)).toBeLessThanOrEqual(2); // iki ayrı yuvarlama
  });

  it('önizleme (summonPreview) ve skill açıklaması çağrılanla aynı statı gösterir', () => {
    const { b, owner } = summonWith('druid', { modifiers: { attrAdd: { int: 12 } } });
    const sp = b.summonPreview(owner.uid, 'summon_treant');
    const summon = b.combatants.find((c) => c.summoned)!;
    expect(sp.unit!.stats.hp).toBe(summon.maxHp);
  });
});
