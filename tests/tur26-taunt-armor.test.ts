/**
 * Ömer 2026-11-16 (form Tur 26): Defender Taunt, taunt süresince düz zırh eki verir (taunt effect'inin kendi alanı `armorBonus`; ayrı durum yok,
 * taunt bitince / kırılınca kalkar). Yalnız `taunt` skill'inde; başka type: "taunt" skill'leri değişmedi. Sayılar veriden okunur.
 * Aynı turda Hexer / Tremor Slam güç değerleri değişti (yalnız veri).
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewSkill } from '../src/engine';
import type { AiConfig, BattleMode } from '../src/engine';
import { splitPreviewStatuses } from '../src/game/preview-format';
import { statusCardText } from '../src/game/stat-delta';

type TauntFx = { type: 'taunt'; turns: number; armorBonus?: number };
const tauntFx = (id: string): TauntFx | undefined => content.skills[id]!.effects.find((e) => e.type === 'taunt') as TauntFx | undefined;
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
function mk(party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test'): Battle {
  const b = new Battle(content.battleSetup('random-battle', 1, mode, { party: cells(party), enemies: cells(enemies) }, false));
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    c.hp = c.maxHp;
    c.mp = c.maxMp;
    Object.assign(c.stats, { critChance: 0 });
  }
  return b;
}

describe('Tur 26 veri', () => {
  it('yalnız taunt skill\'inde armorBonus var; diğer taunt skill\'leri dokunulmadı', () => {
    expect(tauntFx('taunt')!.armorBonus).toBeGreaterThan(0);
    for (const [id, s] of Object.entries(content.skills)) {
      if (id === 'taunt') continue;
      const e = s.effects.find((x) => x.type === 'taunt') as TauntFx | undefined;
      if (e) expect(e.armorBonus, id).toBeUndefined();
    }
  });
  it('Tremor Slam hâlâ Hobbled (slow) verir', () => {
    expect(content.skills.tremor_slam!.effects.some((e) => e.type === 'status' && e.status === 'slow')).toBe(true);
  });
});

describe('Taunt zırhı (motor)', () => {
  it('taunt sürerken armorBonus kadar zırh; taunt kalkınca geri döner', () => {
    const bonus = tauntFx('taunt')!.armorBonus!;
    const b = mk({ 0: 'defender', 4: 'mage' }, { 0: 'warrior', 1: 'archer' });
    const d = b.get('party-0')!;
    const before = b.effectiveStats(d).armor;
    expect(b.useSkill(d.uid, 'taunt').ok).toBe(true);
    const t = d.statuses.find((s) => s.kind === 'taunt')!;
    expect(t.armorBonus).toBe(bonus);
    expect(b.effectiveStats(d).armor).toBeCloseTo(before + bonus, 6);
    d.statuses = d.statuses.filter((s) => s.kind !== 'taunt');
    expect(b.effectiveStats(d).armor).toBe(before);
  });
  it('birim kartı EFFECTS satırı taunt zırhını yazar', () => {
    const bonus = tauntFx('taunt')!.armorBonus!;
    expect(statusCardText(undefined, { kind: 'taunt', armorBonus: bonus })).toContain(`+${bonus} armor`);
    expect(statusCardText(undefined, { kind: 'taunt' })).toBe('');
  });
  it('taunt zırhı yalnız Defender\'a: komşu dostun aura zırhı değişmez', () => {
    const b = mk({ 0: 'defender', 1: 'warrior' }, { 0: 'warrior' });
    const ally = b.get('party-1')!;
    const before = b.effectiveStats(ally).armor;
    expect(b.useSkill('party-0', 'taunt').ok).toBe(true);
    expect(b.effectiveStats(ally).armor).toBeCloseTo(before, 6);
  });
});

describe('Taunt zırhı (metin, önizleme)', () => {
  it('ipucu ve önizleme "+N armor" yazar', () => {
    const bonus = tauntFx('taunt')!.armorBonus!;
    const b = mk({ 0: 'defender', 4: 'mage' }, { 0: 'warrior' });
    const d = b.get('party-0')!;
    const info = describeSkill(content.skills.taunt!, d.stats, content.formulas, {}, { statuses: content.statuses });
    expect(info.lines.some((l) => l.includes(`+${bonus} armor`))).toBe(true);
    const pv = previewSkill(b, d.uid, 'taunt', d.uid);
    expect(pv.some((p) => (p.statuses ?? []).some((s) => s.includes(`+${bonus} armor`)))).toBe(true);
    // Taunt satırı rozet olarak kalır, zırh satırı yazı olarak görünür
    const lines = pv.find((p) => (p.statuses ?? []).length)!.statuses!;
    const split = splitPreviewStatuses(lines, content.statuses);
    expect(split.icons.some((i) => i.kind === 'taunt')).toBe(true);
    expect(split.text.some((t) => t.includes(`+${bonus} armor`))).toBe(true);
  });
});

describe('Taunt zırhı (YZ)', () => {
  it('armorBonus Taunt değerini (protect) artırır', () => {
    const b = mk({ 0: 'defender', 4: 'mage' }, { 0: 'warrior', 1: 'archer', 2: 'cutthroat' });
    b.get('party-0')!.hp = Math.round(b.get('party-0')!.maxHp * 0.5);
    b.get('party-1')!.hp = Math.round(b.get('party-1')!.maxHp * 0.3);
    const protect = () => Math.max(...explainChoice(b, 'party-0', ai)!.candidates.filter((c) => c.skill === 'taunt').map((c) => (c.terms as Record<string, number>).protect ?? 0));
    const fx = tauntFx('taunt')!;
    const saved = fx.armorBonus;
    const on = protect();
    delete fx.armorBonus;
    let off: number;
    try {
      off = protect();
    } finally {
      fx.armorBonus = saved;
    }
    expect(on).toBeGreaterThan(0);
    expect(on).toBeGreaterThan(off);
  });
});
