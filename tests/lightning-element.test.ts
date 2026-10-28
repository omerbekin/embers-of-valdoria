import { describe, expect, it } from 'vitest';
import layout from '../data/battle-layout.json';
import { Battle, content } from '../src/engine';
import type { BattleEvent, CombatantDef } from '../src/engine';
import { outgoingDamageMult } from '../src/engine/stats';
import { ELEMENTS, MAGIC_ELEMENTS } from '../src/progression/items';
import { ELEMENT_ICON, FLOAT_ICON_TINT } from '../src/game/float-text';
import { elementIcon, skillElements } from '../src/ui/skill-tags';

// Lightning hasar türü (Ömer 2026-10-25): yalnız hasar türü; Shocked / zemin tepkileri yok (element reworkü hâlâ plan).

const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.classes[id])!;
function arena(party: [string, number][], enemies: [string, number][]): Battle {
  const base = content.battleSetup('random-battle', 1, 'test', { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
  b.debug.crit = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  for (const c of b.combatants) c.hp = c.maxHp = 5000;
  return b;
}

describe('lightning elementi', () => {
  it('element listelerinde, büyü elementlerinde ve renk tablosunda var; rengi diğerlerinden ayrı', () => {
    expect(ELEMENTS).toContain('lightning');
    expect(MAGIC_ELEMENTS).toContain('lightning');
    const colors = layout.colors.element as Record<string, string>;
    expect(colors.lightning).toMatch(/^#[0-9a-f]{6}$/i);
    const others = Object.entries(colors).filter(([k]) => k !== 'lightning').map(([, v]) => v.toLowerCase());
    expect(others).not.toContain(colors.lightning!.toLowerCase());
  });

  it('ikonu kodla çizilen şimşek (bolt), tonu element rengiyle aynı', () => {
    expect(ELEMENT_ICON.lightning).toBe('bolt');
    expect(FLOAT_ICON_TINT.bolt).toBe((layout.colors.element as Record<string, string>).lightning);
    expect(elementIcon('lightning')).toBe('bolt');
  });

  it('Spark (Will-o-Wisp) ve Rune Spark (Deep Runecaller) lightning; hasar türü büyü', () => {
    for (const id of ['wisp_spark', 'rune_spark']) {
      const s = content.skills[id]!;
      expect(skillElements(s), id).toEqual(['lightning']);
      const d = s.effects.find((e) => e.type === 'damage') as { damageType: string };
      expect(d.damageType, id).toBe('magic');
    }
  });

  it('kahraman yeteneklerinde lightning yok (yalnız mob)', () => {
    // Vesper (2026-10-28, Ömer brifi): Thunderpeal + Great Bell kahramanın ilk lightning skill'leri; diğer sınıflarda hâlâ yok
    for (const c of Object.values(content.classes)) if (c.id !== 'vesper') for (const id of c.skills) expect(skillElements(content.skills[id]!), `${c.id}/${id}`).not.toContain('lightning');
  });

  it('mob ve tür etiketlerinde lightning nötr (x1): zayıflık tablosunda girdi yok', () => {
    for (const m of Object.values(content.formulas.weaknesses)) expect((m as Record<string, number>).lightning).toBeUndefined();
  });

  it('hasar olayı lightning elementini taşır; element çarpanı lightning anahtarına işler', () => {
    const b = arena([['warrior', 1]], [['deep_runecaller', 6]]);
    const n = b.log.length;
    b.useSkill('enemy-0', 'rune_spark', 'party-0');
    const hits = b.log.slice(n).filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.element).toBe('lightning');
    expect(outgoingDamageMult({ elemDamageMult: { lightning: 1.2 } }, 'lightning')).toBeCloseTo(1.2);
    expect(outgoingDamageMult({ elemDamageMult: { arcane: 1.2 } }, 'lightning')).toBe(1);
  });
});
