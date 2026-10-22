import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, previewSkill, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 1a motor tarafı (docs/design/skill-tree-implementation.md 4.1): birim skill katmanı (aynı id, Battle.skill(id, who)),
// pasif yaması, bekçi testler (uid'siz this.skill( yok; aynada yalnızca ağaçlı birim değişir; ağaçsız savaş birebir aynı).

const W = treeOf('warrior')!;
const D = treeOf('defender')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, enemyUnits: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'turns'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: enemyUnits } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function alloc(tree: TreeData, level: number, steps: string[]): TreeAlloc {
  let a = emptyAlloc(tree);
  for (const s of steps) {
    const [key, times] = s.split('*');
    for (let i = 0; i < Number(times ?? 1); i++) {
      const r = take(tree, level, a, key!);
      if (!r.ok) throw new Error(`${key}: ${r.block.text}`);
      a = r.alloc;
    }
  }
  return a;
}
function playOut(b: Battle, maxMoves = 400): BattleEvent[] {
  let i = 0;
  for (let n = 0; n < maxMoves && !b.winner; n++) {
    let uid: string | undefined;
    if (b.mode === 'turns') uid = b.currentActor?.uid;
    else {
      const living = b.combatants.filter((c) => c.hp > 0);
      uid = living[i++ % living.length]?.uid;
    }
    if (!uid) break;
    const r = b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
    if (!r.ok && b.mode === 'turns') break;
  }
  return b.log;
}
const power = (b: Battle, id: string, who?: string | Combatant) => b.skill(id, who)!.effects.filter((e) => e.type === 'damage').map((e) => (e as unknown as { power?: number }).power); // yalnız hasar etkileri (Knee Cutter durum ekler)

/** Warrior: Notched Axe 5 (Double Strike 2. vuruş +%20 oransal) + Steady Spin 3 (Whirlwind lifesteal +0,06) + Headsman's Feast. */
const warriorTree = compileTree(W, alloc(W, 20, ['1.f1*3', '1.f2*5', '2.f1*3', '4.u1']))!;

describe('bekçi: battle.ts içinde uid\'siz this.skill( yalnızca izin listesinde', () => {
  // Yapısal yüklemler: ağaç bu alanları (hedef türü, alan şekli, ceset / dirilme / yakın dövüş, brand) Faz 1a'da yamalamaz.
  // Yeni bir uid'siz çağrı = birim katmanı atlanır (ağaç sayıları görünmez): ya uid geçir ya da gerekçesiyle buraya ekle.
  const ALLOW = new Set(['brandCells', 'needsSlotChoice', 'consumesCorpse', 'isReviveSkill', 'isMelee']);
  it('her this.skill(...) çağrısı ikinci argümanı (aktör) taşır ya da izinli yüklemin içindedir', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/engine/battle.ts'), 'utf8');
    const lines = src.split(/\r?\n/);
    const bad: string[] = [];
    const seen = new Set<string>();
    const re = /\bthis\.skill\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      let depth = 1;
      let commas = 0;
      for (let i = m.index + m[0].length; i < src.length && depth > 0; i++) {
        const ch = src[i]!;
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (ch === ',' && depth === 1) commas++;
      }
      if (commas > 0) continue;
      const line = src.slice(0, m.index).split('\n').length;
      let method = '?';
      for (let l = line - 1; l >= 0; l--) {
        const mm = /^ {2}(?:(?:private|public|protected|static|readonly|async|get|set)\s+)*(\w+)\s*[(<]/.exec(lines[l]!);
        if (mm) {
          method = mm[1]!;
          break;
        }
      }
      seen.add(method);
      if (!ALLOW.has(method)) bad.push(`battle.ts:${line} in ${method}`);
    }
    expect(bad).toEqual([]);
    expect([...ALLOW].filter((x) => !seen.has(x)), 'izin listesinde artık kullanılmayan ad (listeden sil)').toEqual([]);
  });
});

describe('birim skill katmanı (aynı id)', () => {
  it('ağaçlı birim kendi yamalı tanımını görür; karşıdaki aynı class ve id\'siz arama temel tanımı görür (Warrior aynası)', () => {
    const b = make({ 0: 'warrior' }, { 0: 'warrior' }, { 0: { tree: warriorTree } });
    const me = b.combatants.find((c) => c.side === 'party')!;
    const foe = b.combatants.find((c) => c.side === 'enemy')!;
    expect(Object.keys(me.skillDefs!).sort()).toEqual(['headsmans_blow', 'melee_attack', 'whirlwind']);
    expect(foe.skillDefs).toBeUndefined();
    const NA = (W.nodes['1.f2']!.fx![0] as unknown as { v: number }).v; // Notched Axe rank başı (veriden)
    const want = [0.4, 0.4 * (1 + 5 * NA)];
    power(b, 'melee_attack', me.uid).forEach((x, i) => expect(x).toBeCloseTo(want[i]!, 9));
    power(b, 'melee_attack', me).forEach((x, i) => expect(x).toBeCloseTo(want[i]!, 9)); // Combatant da kabul
    expect(power(b, 'melee_attack', foe.uid)).toEqual([0.4, 0.4]);
    expect(power(b, 'melee_attack')).toEqual([0.4, 0.4]);
    expect(content.skills.melee_attack!.effects.map((e) => (e as unknown as { power: number }).power)).toEqual([0.4, 0.4]);
    // önizleme (YZ ve arayüz aynı yol): ağaçlı birimin vuruşu daha güçlü, karşıdakininki temel
    const mine = previewSkill(b, me.uid, 'melee_attack', foe.uid).find((x) => x.uid === foe.uid)!.damage!;
    const plain = make({ 0: 'warrior' }, { 0: 'warrior' });
    const base = previewSkill(plain, plain.combatants[0]!.uid, 'melee_attack', plain.combatants[1]!.uid).find((x) => x.uid === plain.combatants[1]!.uid)!.damage!;
    expect(mine.max).toBeGreaterThan(base.max);
    const theirs = previewSkill(b, foe.uid, 'melee_attack', me.uid).find((x) => x.uid === me.uid)!.damage!;
    const baseBack = previewSkill(plain, plain.combatants[1]!.uid, 'melee_attack', plain.combatants[0]!.uid).find((x) => x.uid === plain.combatants[0]!.uid)!.damage!;
    expect(theirs).toEqual(baseBack);
  });

  it('ağaç yalnızca birimin kendi skill\'lerine yazılır; pasif yalnızca aynı id\'liyse değişir', () => {
    const base = content.classes.warrior!.passive!;
    const passive = { ...base, effect: { ...base.effect, maxBonus: 0.9 } } as typeof base;
    const foreign = { skills: { taunt: content.skills.taunt! }, passive: { ...content.classes.defender!.passive! } };
    const b = make({ 0: 'warrior', 1: 'warrior' }, { 0: 'defender' }, { 0: { tree: { passive } }, 1: { tree: foreign } });
    const [w0, w1] = b.combatants.filter((c) => c.side === 'party');
    expect((w0!.passive!.effect as unknown as { maxBonus: number }).maxBonus).toBe(0.9);
    expect(w0!.skillDefs).toBeUndefined();
    expect(w1!.skillDefs).toBeUndefined(); // Warrior'da taunt yok
    expect(w1!.passive!.id).toBe('berserker');
    expect((w1!.passive!.effect as unknown as { maxBonus: number }).maxBonus).toBe(0.8);
  });

  it('Defender: Ironbound Oath taunt\'u kırılmaz yapar (breakAt yok), Hollow Roar MP\'siz + 0,24 eşik; ağaçsız Defender 0,25', () => {
    const oath = compileTree(D, alloc(D, 30, ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '2.r*3', '2.ea', '2.fa']))!;
    const roar = compileTree(D, alloc(D, 30, ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '2.r*3', '2.eb', '2.fb']))!;
    const b = make({ 0: 'defender', 1: 'defender', 2: 'defender' }, { 0: 'warrior' }, { 0: { tree: oath }, 1: { tree: roar } }, {}, 11, 'test');
    const [d0, d1, d2] = b.combatants.filter((c) => c.side === 'party');
    for (const d of [d0!, d1!, d2!]) expect(b.act(d.uid, { kind: 'skill', skillId: 'taunt' }).ok, d.uid).toBe(true);
    const st = (uid: string) => b.get(uid)!.statuses.find((s) => s.kind === 'taunt') as unknown as { breakAt?: number; allyMult?: number; turns: number };
    expect(st(d0!.uid).breakAt).toBeUndefined();
    expect(st(d0!.uid).allyMult).toBe(1);
    expect(st(d0!.uid).turns).toBe(3);
    const roarRatio = (roar.skills!.taunt!.effects[0] as unknown as { breakRatio: number }).breakRatio; // Hollow Roar + Bellow 3 (veriden)
    expect(roarRatio).toBeCloseTo((D.nodes['2.fb']!.fx![2] as unknown as { v: number }).v + 3 * (D.nodes['2.f1']!.fx![0] as unknown as { v: number }).v, 9);
    expect(st(d1!.uid).breakAt).toBe(Math.max(1, Math.round(d1!.maxHp * roarRatio)));
    expect(st(d2!.uid).breakAt).toBe(Math.max(1, Math.round(d2!.maxHp * 0.25)));
    expect(st(d2!.uid).allyMult).toBe(0.9);
    expect(b.skill('taunt', d1!.uid)!.cost.amount).toBe(0);
  });

  for (const mode of ['turns', 'test'] as BattleMode[])
    it(`${mode}: ağaçlı birimlerle YZ savaşı sonuna kadar oynanır, aynı girdi = aynı savaş`, () => {
      const units = { 0: { tree: warriorTree }, 1: { tree: compileTree(D, alloc(D, 30, ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '2.r*3', '2.eb', '2.fb']))! } };
      const run = () => JSON.stringify(playOut(make({ 0: 'warrior', 1: 'defender' }, { 0: 'warrior', 1: 'defender' }, units, {}, 5, mode)));
      const a = run();
      expect(a).toBe(run());
      expect(JSON.parse(a).some((e: BattleEvent) => e.type === 'battleEnd' || e.type === 'turnStart')).toBe(true);
    });
});

describe('ağaçsız savaş birebir aynı', () => {
  for (const mode of ['turns', 'test'] as BattleMode[])
    it(`${mode}: tree yok / undefined / class'a ait olmayan skill = aynı kayıt (skillDefs yok)`, () => {
      for (const seed of [1, 7, 42]) {
        const party = { 0: 'warrior', 1: 'defender', 6: 'mage', 8: 'archer' };
        const enemies = { 0: 'warrior', 2: 'cutthroat', 6: 'druid', 7: 'hexer' };
        const plain = make(party, enemies, {}, {}, seed, mode);
        const undef = make(party, enemies, { 0: { tree: undefined } }, {}, seed, mode);
        const foreign = make(party, enemies, { 0: { tree: { skills: { taunt: content.skills.taunt! } } } }, {}, seed, mode);
        const logs = [plain, undef, foreign].map((b) => JSON.stringify(playOut(b)));
        expect(logs[1]).toBe(logs[0]);
        expect(logs[2]).toBe(logs[0]);
        expect(foreign.combatants.some((c) => c.skillDefs)).toBe(false);
        expect(logs[0]).not.toContain('skillDefs');
      }
    });
});
