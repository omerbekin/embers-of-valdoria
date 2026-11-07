import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import type { AiConfig, CombatantDef } from '../src/engine';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';

// Ömer 2026-11-07: (1) Run Down bedeli 24 MP, hasar -%10 (0,63) (şerit engeli kuralı Ömer'in seçimiyle EKLENMEDİ).
// (3) YZ: çağıranı öldürmek çağrılarını da öldürür (Ley Brand -> Grave Chanter zinciri): öldürme değerine çağrıların katkısı (summonsLost),
// Brand bedel yakımıyla ölecek çağıran kendi çağrısını boşa atmaz (selfLoss).

const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.bosses[id] ?? content.summons[id] ?? content.classes[id])!;
function arena(party: [string, number][], enemies: [string, number][], mode: 'test' | 'turns' = 'test', seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, mode, { party: [], enemies: [] }, false);
  return new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
}
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const L = content.formulas.formation.lanes;
const cell = (row: number, lane: number) => row * L + lane;

describe('Run Down bedeli (Ömer 2026-11-07)', () => {
  it('veri: 24 MP, güç 0,63, cooldown 3, menzil 3; erişim kuralı yok (her sıraya ulaşır); Rime / Molten Run Down değişmedi', () => {
    const s = content.skills.run_down!;
    expect(s.cost).toEqual({ resource: 'mp', amount: 24 });
    expect(s.effects.find((e) => e.type === 'damage')).toMatchObject({ power: 0.63 });
    expect(unitDef('ash_hound').stats?.mp ?? 32).toBeGreaterThanOrEqual(24);
    expect(s.cooldown).toBe(3);
    expect(s.range).toBe(3);
    expect(s.reachRule).toBeUndefined();
    expect(content.skills.rime_run_down!.cost.amount).toBe(9);
    expect(content.skills.rime_run_down!.effects.find((e) => e.type === 'damage')).toMatchObject({ power: 0.7 });
    expect(content.skills.molten_run_down!.cost.amount).toBe(9);
  });

  it('MP yetmeyince kullanılamaz; YZ onu aday yapmaz', () => {
    const b = arena([['warrior', cell(0, 1)]], [['ash_hound', cell(0, 1)]]);
    const h = b.get('enemy-0')!;
    h.mp = 23;
    expect(b.useSkill('enemy-0', 'run_down', 'party-0').ok).toBe(false);
    expect(explainChoice(b, 'enemy-0', ai)!.candidates.some((c) => c.skill === 'run_down')).toBe(false);
    h.mp = 24;
    expect(b.useSkill('enemy-0', 'run_down', 'party-0').ok).toBe(true);
  });
});

describe('YZ: çağıranı öldürmek çağrılarını da öldürür', () => {
  /** Grave Chanter (enemy-0) kendi iskeletini çağırmış; party-0 Archer. */
  function chanterWithSkeleton(): Battle {
    const b = arena([['archer', cell(0, 1)]], [['grave_chanter', cell(1, 1)]]);
    expect(b.useSkill('enemy-0', 'call_the_buried').ok).toBe(true);
    const sk = b.combatants.find((c) => c.summoned && c.owner === 'enemy-0');
    expect(sk).toBeDefined();
    return b;
  }

  it('motor: çağıran ölünce çağrısı da ölür (genel kural; Grave Chanter, Tide Caller, Druid, Undead aynı yoldan)', () => {
    const b = chanterWithSkeleton();
    const sk = b.combatants.find((c) => c.summoned && c.owner === 'enemy-0')!;
    b.debugKill('enemy-0', false);
    expect(sk.hp).toBe(0);
    for (const id of ['grave_chanter', 'tide_caller', 'druid', 'undead']) expect(unitDef(id).skills.some((s) => content.skills[s]?.effects.some((e) => e.type === 'summon'))).toBe(true);
  });

  it('summonsWorth: çağrının kalan katkısı; aynı hamlede ölecek çağrı düşülür; summonerKillShare veriden', () => {
    const b = chanterWithSkeleton();
    const ctx = new ValueContext(b, b.get('party-0')!, { ...DEFAULT_VALUE, ...content.aiConfig.value }, () => 'lowest_hp');
    const sk = b.combatants.find((c) => c.summoned && c.owner === 'enemy-0')!;
    const w = ctx.summonsWorth(b.get('enemy-0')!);
    expect(content.aiConfig.value?.summonerKillShare).toBe(1);
    expect(w).toBeCloseTo(ctx.contribution(sk), 6);
    expect(w).toBeGreaterThan(0);
    expect(ctx.summonsWorth(b.get('enemy-0')!, { [sk.uid]: 1 })).toBe(0);
    expect(ctx.summonsWorth(b.get('party-0')!)).toBe(0);
  });

  it('öldürülebilir çağırana saldırı adayı summonsLost terimi alır', () => {
    const b = chanterWithSkeleton();
    b.get('enemy-0')!.hp = 1;
    const ex = explainChoice(b, 'party-0', ai)!;
    const hit = ex.candidates.find((c) => c.skill === 'quick_shot' && !!c.target?.includes('Grave Chanter'));
    expect(hit, JSON.stringify(ex.candidates.map((c) => [c.skill, c.target, c.terms]))).toBeDefined();
    expect(hit!.terms!.summonsLost).toBeGreaterThan(0);
  });

  it('Ley Brand: bedel yakımı Brand\'li çağıranı öldürecekse Brand değeri artar; çağıran o çağrıyı yaparsa kayıp (selfLoss), çağrı değeri 0', () => {
    const mk = (hp: number) => {
      const b = arena([['antimage', cell(0, 1)]], [['grave_chanter', cell(1, 1)]]);
      const am = b.get('party-0')!;
      am.mp = am.maxMp;
      expect(b.useSkill('party-0', 'drain_field', undefined, cell(1, 1)).ok).toBe(true);
      const ch = b.get('enemy-0')!;
      expect(ch.statuses.some((s) => s.kind === 'branded')).toBe(true);
      ch.hp = hp;
      // 0.9.11 mana (mpPerInt 0,2): Brand'li Call the Buried bedeli (30 x costMult) Chanter'ın havuzunu aşar; senaryo çağrının YZ değerini ölçer
      ch.maxMp = Math.max(ch.maxMp, 60);
      ch.mp = ch.maxMp;
      return b;
    };
    const low = explainChoice(mk(1), 'enemy-0', ai)!.candidates.find((c) => c.skill === 'call_the_buried');
    expect(low).toBeDefined();
    expect(low!.terms?.selfLoss ?? 0).toBeLessThan(0);
    expect(low!.terms?.summon ?? 0).toBe(0);
    const full = mk(10000);
    full.get('enemy-0')!.maxHp = 10000;
    const high = explainChoice(full, 'enemy-0', ai)!.candidates.find((c) => c.skill === 'call_the_buried');
    expect(high!.terms?.selfLoss).toBeUndefined();
  });

  it('AM tarafı: Brand bedel yakımı düşük canlı çağıranı öldürecekse Brand terimi büyür (çağrının katkısı dahil)', () => {
    const build = (hp?: number) => {
      const b = arena([['antimage', cell(0, 1)]], [['grave_chanter', cell(1, 1)]]);
      expect(b.useSkill('enemy-0', 'call_the_buried').ok).toBe(true);
      b.debugClearCooldowns();
      const ch = b.get('enemy-0')!;
      ch.hp = hp ?? ch.maxHp;
      ch.mp = ch.maxMp;
      b.get('party-0')!.mp = b.get('party-0')!.maxMp;
      const c = explainChoice(b, 'party-0', ai)!.candidates.filter((x) => x.skill === 'drain_field').map((x) => x.terms?.brand ?? 0);
      return Math.max(0, ...c);
    };
    const lethal = build(1);
    const safe = build();
    expect(lethal).toBeGreaterThan(safe);
  });
});
