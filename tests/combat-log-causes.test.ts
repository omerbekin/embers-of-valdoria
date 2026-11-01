import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { CombatLog, type LogNames } from '../src/game/combat-log';
import { causeName } from '../src/game/log-cause';
import { compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// Ömer 2026-11-01: günlükte "X took 2 from" boş bitiyordu. Gerçek motorla: her hasar / şifa kaynağını adıyla yazar; yeni kaynak eklenince adı unutulmasın.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup>, seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
};
const only = (cls: string, ranks: Record<string, number>): UnitSetup['tree'] => {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  return compileTree(t, { v: t.version, r: { ...ranks } });
};
const logOf = (b: Battle, events: readonly BattleEvent[]): string[] => {
  const names: LogNames = {
    unit: (uid) => {
      const c = b.get(uid);
      return c ? { name: c.name, side: c.side } : undefined;
    },
    skill: (id) => content.skills[id]?.name ?? id,
    status: (id) => content.statuses[id]?.name ?? id,
    ground: (id) => content.grounds[id]?.name ?? id,
    globalKind: (id) => b.globalDef(id)?.kind ?? id,
    cause: causeName,
    rowOf: (slot) => b.rowOf(slot),
  };
  const log = new CombatLog(names);
  for (const e of events) log.push(e);
  return log.entries().map((x) => x.parts.map((p) => p.t).join(''));
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const runTo = (b: Battle, c: Combatant): void => {
  for (let i = 0; i < 30 && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
};

describe('combat log sources (real engine)', () => {
  // Ağacın ilk puanı (0.f1 Wrathful Glow): Divine Light'a smite ekler; hasar pasifin kendisinden çıkar (birden çok düğüm aynı smite'ı yamalar), adı "Divine Light"
  it("Paladin's first tree point: the smite and the heal both name Divine Light", () => {
    const b = make({ 0: 'paladin', 3: 'warrior' }, { 0: 'warrior' }, { 0: { tree: only('paladin', { '0.f1': 1 }) } });
    const me = P(b);
    const ally = P(b, 3);
    if (b.currentActor === me) expect(b.skipTurn().ok).toBe(true);
    ally.hp = Math.max(1, ally.hp - 40);
    const from = b.log.length;
    runTo(b, me);
    const lines = logOf(b, b.log.slice(from));
    expect(lines.join('|')).toMatch(/took \d+ from Divine Light/);
    expect(lines.join('|')).toMatch(/healed \+\d+ from Divine Light/);
    for (const l of lines) expect(l).not.toMatch(/ from\s*$/);
  });

  it('a tree trigger names its node (Mage Backdraft)', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, { 0: { tree: only('mage', { '0.ea': 1 }) } });
    const foe = E(b);
    const me = P(b);
    let lines: string[] = [];
    for (let i = 0; i < 12 && !lines.some((l) => l.includes('Backdraft')); i++) {
      runTo(b, foe);
      const from = b.log.length;
      const skill = foe.skills.find((id) => {
        const s = b.skill(id, foe);
        return s?.motion === 'melee' && s.effects.some((x) => x.type === 'damage');
      });
      expect(skill).toBeTruthy();
      expect(b.useSkill(foe.uid, skill!, me.uid).ok).toBe(true);
      lines = logOf(b, b.log.slice(from));
    }
    expect(lines.join('|')).toMatch(/Warrior took \d+ from Backdraft/);
  });

  it('a real Move says the direction', () => {
    const b = make({ 3: 'warrior' }, { 0: 'warrior' }, {});
    const me = P(b, 3);
    runTo(b, me);
    const from = b.log.length;
    expect(b.useGlobal(me.uid, 'move_tile', 0).ok).toBe(true);
    expect(logOf(b, b.log.slice(from))).toContain(`${me.name} moved forward`);
  });
});

describe('combat log sources (guards)', () => {
  const src = readFileSync(new URL('../src/engine/battle.ts', import.meta.url), 'utf8');
  const hits = src.split('\n').filter((l) => l.includes('applyHit(') && l.includes("origin: 'status'"));

  it("every origin:'status' hit in battle.ts carries a status or a cause", () => {
    expect(hits.length).toBeGreaterThan(10);
    for (const l of hits) expect(l, l.trim()).toMatch(/\b(status|cause): /);
  });

  it('every literal cause resolves to a real name, never the id', () => {
    const literals = new Set<string>();
    for (const l of hits) for (const m of l.matchAll(/cause: '([a-z_]+)'/g)) literals.add(m[1]!);
    for (const m of src.matchAll(/applyHeal\([^\n]*?emit, '([a-z_]+)'\)/g)) literals.add(m[1]!);
    expect(literals.size).toBeGreaterThan(10);
    for (const id of literals) {
      const name = causeName(id);
      expect(name, id).not.toBe('');
      expect(name, id).not.toBe(id);
    }
  });

  it('every data passive, tree node and mastery step has a name; unknown ids stay hidden', () => {
    for (const defs of [content.classes, content.summons, content.bosses, content.mobs]) {
      for (const d of Object.values(defs)) if (d.passive) expect(causeName(d.passive.id), d.passive.id).toBe(d.passive.name);
    }
    const t = treeOf('paladin')!;
    expect(causeName('paladin:0.f1')).toBe(t.nodes['0.f1']!.name);
    expect(causeName('paladin:bar[1]')).toBe(t.mastery.bar[1]!.name);
    expect(causeName('nobody')).toBe('');
    expect(causeName('paladin:nope')).toBe('');
  });

  // Sahne (BattleScene 'heal') cause bir zemin / durum adıysa yeşil sayının altına etiket yazar: yeni nedenler ekranı değiştirmesin
  it('new heal causes add no floating label on screen', () => {
    for (const id of ['lifesteal', 'second_wind', 'regen', 'bloodletter', 'forge_heart', 'divine_light', 'vampiric_bite']) {
      expect(content.grounds[id], id).toBeUndefined();
      expect(content.statuses[id], id).toBeUndefined();
    }
  });
});
