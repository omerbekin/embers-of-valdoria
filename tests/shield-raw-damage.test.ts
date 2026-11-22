// Kalkan ham hasar kuralı (Ömer onayı 2026-11-21, form r38): hasar kalkana HAM hâliyle çarpar; zırh / büyü zırhı ve hedef tarafı hasar azaltmaları
// yalnız kalkanı aşıp cana giden kısma uygulanır. Saldıranın çarpanları (kritik, element, güç) ham hasarın parçasıdır. Fiziksel ve büyü kalkanı aynı.
// Sayılar veriden (formulas.json > armor.k); savunma oranı 0,5 olsun diye hedefin zırhı armor.k'ye eşitlenir.
import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, Side } from '../src/engine';
import { shieldAbsorb, shieldCoverOf, shieldSplit } from '../src/engine/battle';
import { armorReduction } from '../src/engine/stats';

const F = content.formulas;
const MODES: BattleMode[] = ['turns', 'test'];
const K = F.armor.k; // zırh = k => azalma %50, savunma oranı 0,5
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
type Dmg = Extract<BattleEvent, { type: 'damage' }>;

/** Sapmasız savaş (önizleme ortalaması = gerçek vuruş); iki taraf ön sırada, iska / kritik yok. */
function make(party: string, enemy: string, mode: BattleMode, noVariance = false): Battle {
  const setup = content.battleSetup('random-battle', 11, mode, { party: cells({ 0: party }), enemies: cells({ 0: enemy }) }, false);
  if (noVariance) setup.formulas = { ...setup.formulas, damage: { ...setup.formulas.damage, variance: 0, elementVariance: {} } };
  const b = new Battle(setup);
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  // turns: saldıranın (party) sırası gelene dek pas (kurulum pastan sonra yapılır)
  const me = b.combatants.find((c) => c.side === 'party' && c.slot === 0)!;
  if (mode === 'turns') for (let i = 0; i < 80 && b.currentUid !== me.uid; i++) b.skipTurn();
  return b;
}
const at = (b: Battle, side: Side): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === 0)!;

/** Hedefi zırhlı ve dayanıklı yapar (vuruş öldürmesin), kalkanları kurar. */
function prep(t: Combatant, shield: number, magicShield = 0): void {
  t.stats = { ...t.stats, armor: K, magicArmor: K };
  t.maxHp = 100000;
  t.hp = 100000;
  t.shield = shield;
  t.magicShield = magicShield;
}

/** Saldıranın skill'i hedefe; skill vuruşunun hasar olayı ve kalkan / can kaybı. */
function hit(mode: BattleMode, skill: { by: string; id: string }, shield: number, magicShield = 0, noVariance = false) {
  const b = make(skill.by, 'warrior', mode, noVariance);
  const actor = at(b, 'party');
  const t = at(b, 'enemy');
  prep(t, shield, magicShield);
  const r = b.useSkill(actor.uid, skill.id, t.uid);
  if (!r.ok) throw new Error(r.reason);
  const d = r.events.filter((e): e is Dmg => e.type === 'damage' && e.target === t.uid && e.origin === 'skill');
  // Olaylardan (turns: eylem sonrası sıradaki birimin tur başı yenilenmesi sonucu bozmasın)
  const last = d[d.length - 1];
  const amount = d.reduce((s, e) => s + e.amount, 0);
  return { b, t, hpLost: amount, shieldLost: shield - (last?.shieldAfter ?? shield), magicLost: magicShield - (last?.magicShieldAfter ?? magicShield), absorbed: d.reduce((s, e) => s + e.absorbed, 0), amount };
}

const PHYS = { by: 'warrior', id: 'melee_attack' };
const MAGIC = { by: 'mage', id: 'fire_bolt' };

describe('kalkan ham hasar: saf yardımcılar (tam sayı örnekleri)', () => {
  it('savunma oranı 1: eski kural birebir (kalkan önce, kalanı cana)', () => {
    expect(shieldAbsorb(30, 10, 1, 1)).toEqual({ used: 10, covered: 10 });
    expect(shieldAbsorb(5, 10, 1, 1)).toEqual({ used: 5, covered: 5 });
    expect(shieldSplit({ shield: 30, magicShield: 0 }, 20, false, 1)).toEqual({ magicUsed: 0, shieldUsed: 20, rest: 0 });
  });

  it('savunma oranı 0,5 (zırh %50): 20 azaltmalı hasar = 40 ham', () => {
    // tam emer: kalkan 100, 40 ham yer, can 0
    expect(shieldSplit({ shield: 100, magicShield: 0 }, 20, false, 1, 0.5)).toEqual({ magicUsed: 0, shieldUsed: 40, rest: 0 });
    // kısmen emer: kalkan 30 (30 ham), kalan 10 ham -> zırhla 5 cana
    expect(shieldSplit({ shield: 30, magicShield: 0 }, 20, false, 1, 0.5)).toEqual({ magicUsed: 0, shieldUsed: 30, rest: 5 });
    // kalkan yok: can 20 (zırhlı hasar aynen)
    expect(shieldSplit({ shield: 0, magicShield: 0 }, 20, false, 1, 0.5)).toEqual({ magicUsed: 0, shieldUsed: 0, rest: 20 });
    // büyü vuruşu: önce büyü kalkanı 10 (10 ham = 5 azaltmalı), sonra kalkan 10 (5), cana 10
    expect(shieldSplit({ shield: 10, magicShield: 10 }, 20, true, 1, 0.5)).toEqual({ magicUsed: 10, shieldUsed: 10, rest: 10 });
    // fiziksel vuruş büyü kalkanına dokunmaz
    expect(shieldSplit({ shield: 10, magicShield: 10 }, 20, false, 1, 0.5)).toEqual({ magicUsed: 0, shieldUsed: 10, rest: 15 });
  });

  it('Shocked çarpanı ham hasara: oran 0,5 + çarpan 2 -> kalkan 4 kat yer', () => {
    expect(shieldSplit({ shield: 1000, magicShield: 0 }, 10, true, 2, 0.5)).toEqual({ magicUsed: 0, shieldUsed: 40, rest: 0 });
    expect(shieldCoverOf({ shield: 40, magicShield: 0 }, true, 2, 0.5)).toBe(10);
  });

  it('shieldCoverOf = canı bitirmek için kalkanın durdurduğu azaltmalı hasar (oran 1: kalkan toplamı)', () => {
    expect(shieldCoverOf({ shield: 30, magicShield: 12 }, true, 1, 1)).toBe(42);
    expect(shieldCoverOf({ shield: 30, magicShield: 12 }, false, 1, 1)).toBe(30);
    expect(shieldCoverOf({ shield: 30, magicShield: 12 }, true, 1, 0.5)).toBe(15 + 6);
  });
});

describe('kalkan ham hasar: gerçek vuruş (iki mod)', () => {
  it.each(MODES)('fiziksel: tam emer / kısmen emer / kalkan yok (%s)', (mode) => {
    const keep = 1 - armorReduction(K, F);
    expect(keep).toBeCloseTo(0.5, 6);
    const bare = hit(mode, PHYS, 0);
    const A = bare.hpLost; // zırhlı hasar (kalkansız: eski ve yeni kural aynı)
    expect(A).toBeGreaterThan(1);
    expect(bare.absorbed).toBe(0);
    // tam emer: kalkan ham hasarı (A / oran) yer, can değişmez (eski kuralda kalkandan yalnız A düşerdi)
    const full = hit(mode, PHYS, 100000);
    expect(full.hpLost).toBe(0);
    expect(full.shieldLost).toBe(Math.round(A / keep));
    expect(full.absorbed).toBe(full.shieldLost);
    // kısmen emer: kalkan A puan (ham A), kalan ham A -> zırhla cana A - ceil(A x oran)
    const part = hit(mode, PHYS, A);
    expect(part.shieldLost).toBe(A);
    expect(part.hpLost).toBe(A - Math.ceil(A * keep - 1e-9));
    expect(part.amount).toBe(part.hpLost);
  });

  it.each(MODES)('büyü: önce büyü kalkanı, sonra kalkan; ikisi de ham hasara çarpar (%s)', (mode) => {
    const keep = 1 - armorReduction(K, F);
    const A = hit(mode, MAGIC, 0).hpLost;
    expect(A).toBeGreaterThan(1);
    const full = hit(mode, MAGIC, 0, 100000);
    expect(full.hpLost).toBe(0);
    expect(full.magicLost).toBe(Math.round(A / keep));
    const two = hit(mode, MAGIC, 100000, 2);
    expect(two.magicLost).toBe(2);
    expect(two.hpLost).toBe(0);
    expect(two.shieldLost).toBe(Math.round((A - Math.ceil(2 * keep - 1e-9)) / keep));
  });

  it('zırhsız hedefte eski kural birebir (kalkandan azaltmalı hasar kadar düşer)', () => {
    const b = make('warrior', 'warrior', 'test');
    const t = at(b, 'enemy');
    prep(t, 100000);
    t.stats = { ...t.stats, armor: 0, magicArmor: 0 };
    const r = b.useSkill(at(b, 'party').uid, PHYS.id, t.uid);
    if (!r.ok) throw new Error(r.reason);
    const ds = r.events.filter((e): e is Dmg => e.type === 'damage' && e.target === t.uid);
    expect(ds.reduce((s, e) => s + e.amount, 0)).toBe(0);
    const b2 = make('warrior', 'warrior', 'test');
    const t2 = at(b2, 'enemy');
    prep(t2, 0);
    t2.stats = { ...t2.stats, armor: 0, magicArmor: 0 };
    const r2 = b2.useSkill(at(b2, 'party').uid, PHYS.id, t2.uid);
    if (!r2.ok) throw new Error(r2.reason);
    expect(ds.reduce((s, e) => s + e.absorbed, 0)).toBe(r2.events.filter((e): e is Dmg => e.type === 'damage' && e.target === t2.uid).reduce((s, e) => s + e.amount, 0));
  });

  it('hedef tarafı azaltma (Fortified gibi damageTakenMult < 1) da yalnız cana giden kısma; artıran (Exposed gibi) ham kalır', () => {
    const b = make('warrior', 'warrior', 'test');
    const t = at(b, 'enemy');
    prep(t, 0);
    t.stats = { ...t.stats, armor: 0, magicArmor: 0 };
    const down = Object.entries(content.statuses).find(([, d]) => d.damageTakenMult !== undefined && d.damageTakenMult < 1 && d.type === 'buff');
    const up = Object.entries(content.statuses).find(([, d]) => d.damageTakenMult !== undefined && d.damageTakenMult > 1 && d.type === 'debuff');
    expect(down && up).toBeTruthy();
    const actor = at(b, 'party');
    expect(b.debugAddStatus(t.uid, down![0]).ok).toBe(true);
    expect(b.strikeKeep(actor, t, { damageType: 'physical' }, null, 'physical')).toBeCloseTo(down![1].damageTakenMult!, 6);
    b.debugClearStatuses(t.uid);
    expect(b.debugAddStatus(t.uid, up![0]).ok).toBe(true);
    expect(b.strikeKeep(actor, t, { damageType: 'physical' }, null, 'physical')).toBe(1);
  });
});

describe('kalkan ham hasar: önizleme = gerçek sonuç', () => {
  for (const [name, sk] of [['fiziksel', PHYS], ['büyü', MAGIC]] as const) {
    it.each(MODES)(`${name}: önizlemenin kalkan payı, can kaybı ve savunma oranı gerçek vuruşla aynı (%s)`, (mode) => {
      for (const [shield, magic] of [[100000, 0], [7, 0], [0, 0], [5, 3]] as const) {
        const b = make(sk.by, 'warrior', mode, true);
        const t = at(b, 'enemy');
        prep(t, shield, magic);
        const pv = previewSkill(b, at(b, 'party').uid, sk.id, t.uid).find((p) => p.uid === t.uid)!.damage!;
        if (shield + magic > 0) expect(pv.keep).toBeCloseTo(1 - armorReduction(K, F), 6);
        else expect(pv.keep).toBeUndefined(); // kalkansızda oran yazılmaz (sonucu değiştirmez)
        const real = hit(mode, sk, shield, magic, true);
        expect(pv.absorbed).toBe(real.absorbed);
        expect(pv.hpLoss).toBe(real.hpLost);
        // YZ öldürme eşiği: kalkanın durdurduğu azaltmalı hasar önizlemenin oranıyla
        expect(b.shieldCover(t, sk === MAGIC, undefined, pv.keep)).toBe(shieldCoverOf(t, sk === MAGIC, 1, pv.keep ?? 1));
      }
    });
  }
});

describe('kalkan ham hasar: tik hasarı (zemin tepkimesi) aynı kural', () => {
  it.each(MODES)('Explosion tepkimesi zırhlı + kalkanlı hedefte kalkandan ham karşılığını düşer (%s)', (mode) => {
    const run = (shield: number) => {
      const b = make('warrior', 'mage', mode);
      const me = at(b, 'party');
      prep(me, shield);
      const n0 = b.log.length;
      expect(b.debugGroundReaction(me.uid, 'explosion').ok).toBe(true);
      const d = b.log.slice(n0).filter((e): e is Dmg => e.type === 'damage' && e.target === me.uid && e.reaction === 'explosion');
      return { b, me, d };
    };
    const bare = run(0);
    expect(bare.d.length).toBeGreaterThan(0);
    const A = bare.d.reduce((s, e) => s + e.amount, 0);
    expect(bare.b.tickKeep('fire', 'magic', bare.me)).toBe(1); // kalkansızda oran hesaplanmaz
    const full = run(100000);
    const keep = full.b.tickKeep('fire', 'magic', full.me);
    expect(keep).toBeCloseTo(1 - armorReduction(K, F), 6);
    expect(full.d.reduce((s, e) => s + e.amount, 0)).toBe(0);
    expect(full.d.reduce((s, e) => s + e.absorbed, 0)).toBe(Math.round(A / keep));
  });
});

describe('kalkan ham hasar: DoT tiki (durum hasarı) aynı kural', () => {
  /** Zırhlı + kalkanlı hedefe Burning (tik miktarı elle), tik gelene dek pas; ilk Burning tikinin olayı ve tikten önceki beklenen değerler. */
  const tick = (mode: BattleMode, shield: number) => {
    const b = make('warrior', 'warrior', mode);
    const t = at(b, 'enemy');
    prep(t, shield);
    expect(b.debugAddStatus(t.uid, 'burning', 5).ok).toBe(true);
    const st = t.statuses.find((s) => s.kind === 'burning')!;
    st.amount = 200;
    st.source = at(b, 'party').uid;
    const dd = b.dotTickDamage('burning', 200, t);
    const keep = b.dotTickKeep('burning', t);
    const n0 = b.log.length;
    let ev: Dmg | undefined;
    for (let i = 0; i < 40 && !ev; i++) {
      b.skipTurn();
      ev = b.log.slice(n0).find((e): e is Dmg => e.type === 'damage' && e.target === t.uid && e.status === 'burning');
    }
    return { ev: ev!, dd, keep };
  };

  // DoT tiki taşıyanın tur başında gelir (turns); test modunda tur başı yok (tik yolu iki modda aynı tickKeep: yukarıdaki tepkime testi)
  it.each(['turns'] as const)('Burning tiki: tam emer / kısmen emer / kalkan yok (%s)', (mode) => {
    const bare = tick(mode, 0);
    expect(bare.ev).toBeDefined();
    expect(bare.ev.amount).toBe(bare.dd);
    const full = tick(mode, 100000);
    expect(full.keep).toBeCloseTo(1 - armorReduction(K, F), 6);
    expect(full.ev.amount).toBe(0);
    expect(full.ev.absorbed).toBe(Math.round(full.dd / full.keep));
    const part = tick(mode, 10);
    expect(part.ev.absorbed).toBe(10);
    expect(part.ev.amount).toBe(part.dd - Math.ceil(10 * part.keep - 1e-9));
  });
});

describe('kalkan ham hasar: Wiki Mechanics', () => {
  it('Shields makalesi kuralı yazar (kalkan ham hasar, zırh yalnız cana giden kısma)', async () => {
    const { buildMechanics } = await import('../src/wiki/catalog');
    const text = JSON.stringify(buildMechanics().find((a) => a.id === 'shields')?.blocks ?? null);
    expect(text).toContain('A shield takes the raw hit');
    expect(text).toContain('only cut the part that gets past the shield');
  });
});
