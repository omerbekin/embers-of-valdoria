import { describe, expect, it } from 'vitest';
import { Battle, content, damageRange, describeSkill, previewSkill, type Combatant } from '../src/engine';
import { skillNumbers } from '../src/engine/skill-info';
import { skillRawValue } from '../src/engine/ai-value';
import { damageBonusRaw, damageSpecFor, type DamageEffect } from '../src/engine/spec';
import { attributePower } from '../src/engine/stats';
import { compileTree } from '../src/progression/skill-tree-compile';
import { treeOf } from '../src/progression/skill-tree-data';
import { buildWiki } from '../src/wiki/catalog';

// Düz taban + ölçek (Ömer 2026-11-25, form r46): damage.flat stat x power'a eklenen düz miktar (eksi olabilir). bonusScale ile aynı kanal
// (spec.ts > damageBonusRaw): çarpanlar (alan kademesi, split payı, havuz, skill gücü) flat'i de çarpar; zırh sonra düşer. Yoksa ifade birebir eski.

const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');
const dmgOf = (id: string) => content.skills[id]!.effects.find((e): e is DamageEffect => e.type === 'damage')!;

function duel(): { b: Battle; u: Combatant; foe: Combatant } {
  const b = new Battle(content.battleSetup('random-battle', 11, 'test', { party: cells({ 0: 'undead' }), enemies: cells({ 0: 'warrior' }) }, false));
  return { b, u: b.combatants.find((c) => c.defId === 'undead')!, foe: b.combatants.find((c) => c.side === 'enemy')! };
}

/** Testte geçici skill verisi (content.skills yerinde değişir, sonra geri konur). */
function withSkill<T>(id: string, patch: (e: DamageEffect) => DamageEffect, run: () => T): T {
  const orig = content.skills[id]!;
  content.skills[id] = { ...orig, effects: orig.effects.map((e) => (e.type === 'damage' ? patch(e) : e)) };
  try {
    return run();
  } finally {
    content.skills[id] = orig;
  }
}

describe('damage.flat: düz taban + ölçek', () => {
  it('damageBonusRaw = bonusScale eki + flat; ikisi de yoksa 0', () => {
    const s = content.classes.defender!.stats;
    expect(damageBonusRaw({}, s)).toBe(0);
    expect(damageBonusRaw({ flat: -7 }, s)).toBe(-7);
    expect(damageBonusRaw({ flat: 5, bonusScale: [{ stat: 'armor', pct: 0.5 }] }, s)).toBeCloseTo(5 + s.armor * 0.5, 9);
  });

  it('flat yoksa belirtim birebir eski (bonus alanı yok)', () => {
    const { u, foe } = duel();
    const e = dmgOf('bone_throw');
    const plain = { ...e };
    delete plain.flat;
    const spec = damageSpecFor(u, foe, plain, content.formulas);
    expect('bonus' in spec).toBe(false);
  });

  it('flat zırhtan önce eklenir; kısmi vuruşta (powerMult) flat de aynı oranda küçülür', () => {
    const { b, u, foe } = duel();
    const base = { ...dmgOf('bone_throw'), flat: undefined };
    const flat = 6;
    const withFlat = { ...base, flat };
    const atk = b.attackStats(u);
    const def = b.effectiveStats(foe);
    const a0 = damageRange(atk, def, damageSpecFor(u, foe, base, content.formulas), content.formulas);
    const a1 = damageRange(atk, def, damageSpecFor(u, foe, withFlat, content.formulas), content.formulas);
    expect(a1.avg).toBeGreaterThan(a0.avg);
    const half = damageSpecFor(u, foe, withFlat, content.formulas, 0.5);
    const full = damageSpecFor(u, foe, withFlat, content.formulas, 1);
    expect(half.bonus!).toBeCloseTo(full.bonus! * 0.5, 9);
    expect(half.power).toBeCloseTo(full.power * 0.5, 9);
  });

  it('eksi flat düşük statta en az minDamage verir', () => {
    const { b, u, foe } = duel();
    const e = { ...dmgOf('bone_throw'), flat: -1000 };
    const r = damageRange(b.attackStats(u), b.effectiveStats(foe), damageSpecFor(u, foe, e, content.formulas), content.formulas);
    expect(r.min).toBe(content.formulas.damage.minDamage);
    expect(r.max).toBe(content.formulas.damage.minDamage);
  });

  it('önizleme gerçek belirtimle aynı; skill yazısı ve sayı flat içerir; YZ ham değeri flat içerir', () => {
    withSkill('bone_throw', (e) => ({ ...e, flat: -4 }), () => {
      const { b, u, foe } = duel();
      const e = dmgOf('bone_throw');
      const want = damageRange(b.attackStats(u), b.effectiveStats(foe), damageSpecFor(u, foe, e, content.formulas, 1, false, b.damageTakenMult(foe, u, e.damageType, content.skills.bone_throw!, e.element ?? 'physical'), b.dealtDamage(u, foe, content.skills.bone_throw!)), content.formulas);
      const pv = previewSkill(b, u.uid, 'bone_throw', foe.uid).find((p) => p.uid === foe.uid)!.damage!;
      expect(pv.avg).toBe(want.avg);
      const stats = content.classes.undead!.stats;
      const n = Math.round(attributePower(stats, e.scale, content.formulas) * e.power - 4);
      const text = describeSkill(content.skills.bone_throw!, stats, content.formulas, content.summons, {}).lines.join('\n');
      expect(text).toContain(`Damage ${Math.round(e.power * 100)}% INT - 4 (${n})`);
      expect(skillNumbers(content.skills.bone_throw!, stats, content.formulas).find((x) => x.label === 'Damage')!.value).toBe(n);
      const raw = skillRawValue(b, u.stats, content.skills.bone_throw!);
      const rawNoFlat = withSkill('bone_throw', (x) => ({ ...x, flat: undefined }), () => skillRawValue(b, u.stats, content.skills.bone_throw!));
      expect(raw).toBeCloseTo(rawNoFlat - 4 * (u.stats.spellPowerMult ?? 1), 6);
    });
    withSkill('bone_throw', (e) => ({ ...e, flat: 3 }), () => {
      const text = describeSkill(content.skills.bone_throw!, content.classes.undead!.stats, content.formulas, content.summons, {}).lines.join('\n');
      expect(text).toContain(`Damage 3 + ${Math.round(dmgOf('bone_throw').power * 100)}% INT (`);
    });
  });

  it('ağaç: havuz "+% power" ve eksi yüzde flat\'i de aynı oranda çarpar', () => {
    const U = treeOf('undead')!;
    const pctOf = (k: string) => (U.nodes[k]!.fx as unknown as Array<{ k: string; f?: string; sel?: string; v?: number }>).find((x) => x.k === 'skill' && x.f === 'power')!.v!;
    // Wail of the Dead'e güç yaması yapan düğümler (veriden): biri artı, biri eksi
    const nodes = Object.keys(U.nodes).filter((k) => /Wail of the Dead/.test(U.nodes[k]!.text ?? '') && (U.nodes[k]!.fx as unknown as Array<{ f?: string }> | undefined)?.some((x) => x.f === 'power'));
    expect(nodes.length).toBeGreaterThan(0);
    withSkill('wail_of_the_dead', (e) => ({ ...e, flat: -8 }), () => {
      for (const k of nodes) {
        const got = compileTree(U, { v: U.version, r: { [k]: 1 } })!.skills!.wail_of_the_dead!.effects.find((e): e is DamageEffect => e.type === 'damage')!;
        const base = dmgOf('wail_of_the_dead');
        expect(got.power / base.power).toBeCloseTo(1 + pctOf(k), 5);
        expect(got.flat!).toBeCloseTo(-8 * (1 + pctOf(k)), 5);
      }
    });
  });

  it('Wiki Mechanics: flat\'li her skill "Skills with a flat damage base" maddesinde listelenir', () => {
    withSkill('bone_throw', (e) => ({ ...e, flat: -4 }), () => {
      const w = buildWiki({ sprites: {}, avatars: {} });
      const art = w.mechanics.find((a) => a.id === 'flat-base-damage')!;
      expect(art).toBeDefined();
      const items = art.blocks.flatMap((x) => (x.kind === 'list' ? x.items : []));
      for (const s of Object.values(content.skills)) if (s.effects.some((e) => e.type === 'damage' && e.flat)) expect(items.some((i) => i.startsWith(`${s.name}:`)), s.id).toBe(true);
      expect(items.some((i) => i.includes('Bone Throw:') && i.includes('INT - 4'))).toBe(true);
    });
  });
});
