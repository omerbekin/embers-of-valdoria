/**
 * Şimşek hasar sapması ±%50, ortalama aynı (Ömer 2026-11-01; iki taraf, tüm şimşek skill'leri). Veri formulas.damage.elementVariance; tek yol formulas.ts > damageVariance:
 * zar, önizleme, skill metni ve YZ öldürme tahmini oradan okur. Diğer elementler ve RNG tüketimi değişmez.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, damageRange, damageVariance, describeSkill, explainChoice, previewSkill, type AiConfig, type BattleSetup, type Combatant, type Teams } from '../src/engine';
import { rollDamage } from '../src/engine/formulas';
import { Rng } from '../src/engine/rng';

const createRng = (seed: number) => new Rng(seed);

const f = content.formulas;
const stats = { ...content.classes.mage!.stats, int: 100, str: 100, armor: 0, magicArmor: 0 };
const spec = (element?: string) => ({ damageType: 'magic' as const, scale: 'int' as const, power: 1, ...(element ? { element } : {}) });
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');

describe('şimşek sapması: formül', () => {
  it('veri: şimşek 0.5, diğerleri genel sapma', () => {
    expect(f.damage.elementVariance).toEqual({ lightning: 0.5 });
    expect(damageVariance({ element: 'lightning' }, f)).toBe(0.5);
    for (const e of ['fire', 'ice', 'nature', 'holy', 'physical', undefined]) expect(damageVariance({ element: e }, f), String(e)).toBe(f.damage.variance);
  });

  it('aralık: şimşek ±%50, ortalama aynı; şimşek olmayan aralık aynı kalır', () => {
    const plain = damageRange(stats, stats, spec(), f);
    const bolt = damageRange(stats, stats, spec('lightning'), f);
    expect(bolt.avg).toBe(plain.avg);
    expect(bolt.min).toBe(Math.round(plain.avg * 0.5));
    expect(bolt.max).toBe(Math.round(plain.avg * 1.5));
    const noVar = { ...f, damage: { ...f.damage, variance: 0 } };
    expect(damageRange(stats, stats, spec('fire'), noVar)).toEqual({ min: plain.avg, max: plain.avg, avg: plain.avg });
    expect(damageRange(stats, stats, spec('lightning'), noVar).max).toBe(bolt.max); // genel sapma şimşeğe dokunmaz
  });

  it('zar: dağılım aralıkta, ortalama korunur, iki uca da gider', () => {
    const rng = createRng(12345);
    const r = damageRange(stats, stats, spec('lightning'), f);
    let sum = 0;
    let lo = Infinity;
    let hi = -Infinity;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const v = rollDamage(stats, stats, spec('lightning'), f, rng);
      sum += v;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBeGreaterThanOrEqual(r.min);
    expect(hi).toBeLessThanOrEqual(r.max);
    expect(lo).toBeLessThan(r.avg * 0.55);
    expect(hi).toBeGreaterThan(r.avg * 1.45);
    expect(Math.abs(sum / N - r.avg) / r.avg).toBeLessThan(0.01);
  });

  it('şimşek olmayan: aynı seed aynı sayı, zar başına aynı RNG tüketimi (şimşek de bir zar)', () => {
    const a = createRng(77);
    const b = createRng(77);
    for (let i = 0; i < 50; i++) expect(rollDamage(stats, stats, spec('fire'), f, a)).toBe(rollDamage(stats, stats, spec(), f, b));
    const c = createRng(5);
    const d = createRng(5);
    for (let i = 0; i < 50; i++) {
      rollDamage(stats, stats, spec('lightning'), f, c);
      rollDamage(stats, stats, spec('fire'), f, d);
    }
    expect(c.next()).toBe(d.next());
  });

  it('küçük taban: min hasar kırpması tutarlı', () => {
    const weak = { ...spec('lightning'), power: 0.001 };
    const r = damageRange(stats, stats, weak, f);
    expect(r.min).toBeGreaterThanOrEqual(f.damage.minDamage);
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) expect(rollDamage(stats, stats, weak, f, rng)).toBeGreaterThanOrEqual(f.damage.minDamage);
  });
});

describe('şimşek sapması: savaş', () => {
  const duel = (party: string, foe: string, formulas = f, slot = 0): Battle => {
    const teams: Teams = { party: cells({ [slot]: party }), enemies: cells({ [slot]: foe }) };
    const setup: BattleSetup = content.battleSetup('random-battle', 3, 'test', teams, false);
    const b = new Battle({ ...setup, formulas });
    b.debug.crit = 'never';
    b.debug.dodge = 'never';
    b.freeMp = true;
    return b;
  };
  const foeOf = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
  const meOf = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;

  it('Bog Spark, Wisp Spark, Rune Spark şimşek; önizleme aralığı ±%50 ve her vuruş bunun içinde', () => {
    for (const [mob, id] of [['marsh_light', 'bog_spark'], ['will_o_wisp', 'wisp_spark'], ['deep_runecaller', 'rune_spark']] as const) {
      expect(content.mobs[mob]!.skills, id).toContain(id);
      expect(content.skills[id]!.effects.find((e) => e.type === 'damage')).toMatchObject({ element: 'lightning' });
      const b = duel(mob, 'warrior');
      const me = meOf(b);
      const foe = foeOf(b);
      foe.maxHp = foe.hp = 100000;
      const d = previewSkill(b, me.uid, id, foe.uid)[0]!.damage!;
      expect(d.max / d.min, id).toBeGreaterThan(2.5);
      expect(Math.abs((d.min + d.max) / 2 - d.avg), id).toBeLessThanOrEqual(1);
      const hits: number[] = [];
      for (let i = 0; i < 80; i++) {
        foe.hp = foe.maxHp;
        foe.statuses = [];
        me.cooldowns = {};
        const r = b.useSkill(me.uid, id, foe.uid);
        expect(r.ok, id).toBe(true);
        if (r.ok) for (const e of r.events) if (e.type === 'damage' && e.target === foe.uid && e.source === me.uid) hits.push(e.amount + e.absorbed);
      }
      expect(hits.length, id).toBeGreaterThan(20);
      for (const h of hits) {
        expect(h, id).toBeGreaterThanOrEqual(d.min);
        expect(h, id).toBeLessThanOrEqual(d.max);
      }
      expect(Math.max(...hits) - Math.min(...hits), id).toBeGreaterThan(d.avg * 0.4);
    }
  });

  it('hasar sapması şimşek olmayan skill önizlemesinde aynı', () => {
    const b = duel('mage', 'warrior');
    const d = previewSkill(b, meOf(b).uid, 'fire_bolt', foeOf(b).uid)[0]!.damage!;
    expect(d.max / d.min).toBeLessThan(1.3);
  });

  it('skill metni sapmayı söyler; şimşek olmayanda yok', () => {
    const line = 'Each hit rolls within plus or minus 50% of this';
    expect(describeSkill(content.skills.bog_spark!, stats, f).lines.join('\n')).toContain(line);
    expect(describeSkill(content.skills.fire_bolt!, stats, f).lines.join('\n')).not.toContain('plus or minus');
  });

  it('YZ öldürme tahmini geniş aralığı okur: ortalamanın üstünde cana şimşekle öldürme ihtimali var, sapmasızda yok', () => {
    const ai: AiConfig = { ...content.aiConfig, global: undefined };
    const killTerm = (formulas: typeof f): number => {
      const b = duel('marsh_light', 'warrior', formulas);
      const me = meOf(b);
      const foe = foeOf(b);
      foe.stats.resilience = 0;
      me.stats.critChance = 0; // kritik de öldürürdü: yalnız zar aralığı ölçülsün
      foe.hp = foe.maxHp = 100000;
      const d = previewSkill(b, me.uid, 'bog_spark', foe.uid)[0]!.damage!;
      foe.hp = Math.round(d.avg * 1.3);
      foe.maxHp = foe.hp * 3;
      const c = explainChoice(b, me.uid, ai)!.candidates.find((x) => x.skill === 'bog_spark');
      expect(c).toBeDefined();
      return c!.terms?.kill ?? 0;
    };
    expect(killTerm(f)).toBeGreaterThan(0);
    expect(killTerm({ ...f, damage: { ...f.damage, elementVariance: {} } })).toBe(0);
  });
});
