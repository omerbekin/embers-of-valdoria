/**
 * Önizleme = gerçek: kullanım ortasında oluşan ağaç bilgisi (2026-11-23, güvenlik ağı (a) / (b) düzeltmesi; yalnız önizleme, kural aynı).
 * (a) Wail of the Dead: Bloody Breath (Undead 2.f1) / Blood Banshee (2.ma) ödenen cana bağlı; önizleme kullanımın ÖDEYECEĞİ canı sayar.
 *     Can büyükken fark büyür (bedel mevcut canın oranı): eskiden 25000 canda gerçek ~600, önizleme ~20 idi.
 * (b) Whirlwind: Gore Wheel (Warrior 2.n0) Wound'u vuruştan önce koyar (preHit); Reaper's Spin (2.fb) Wound'suza hasarı düşürür.
 *     Önizleme Wound'u geçici sayar (eskiden 1 gösteriyordu) ve hedefin durumlarını değiştirmez.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { focusBuild } from '../src/progression/skill-tree';
import { stateHash } from '../src/net/state-hash';

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');

function arena(cls: string, rows: [number, number], dir: 'a' | 'b', actorHp: (c: Combatant) => number): { b: Battle; actor: Combatant } {
  const tree = treeOf(cls)!;
  const units: Record<number, UnitSetup> = { 1: { tree: compileTree(tree, focusBuild(tree, rows, 50, { dir }))! } };
  const teams: Teams = { party: cells({ 1: cls, 0: 'archer' }), enemies: cells({ 0: 'archer', 1: 'warrior', 4: 'mage' }), units: { party: units, enemies: {} } };
  const b = new Battle(content.battleSetup('random-battle', 1, 'turns', teams, false));
  b.debug.crit = 'never';
  b.debug.dodge = 'never';
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    Object.assign(c.stats, { surviveChance: 0 });
    if (c.side === 'enemy') c.maxHp = c.hp = 50000;
    c.mp = c.maxMp;
    if (c.maxRage !== undefined) c.rage = c.maxRage;
  }
  const actor = b.combatants.find((c) => c.side === 'party' && c.defId === cls)!;
  actor.hp = actorHp(actor);
  b.currentUid = actor.uid;
  return { b, actor };
}

/** Kullanıcının bu kullanımdaki doğrudan skill vuruşları (hedef başına toplam). */
function realHits(b: Battle, from: number, actor: string): Map<string, number> {
  const all = b.log.slice(from);
  const next = all.findIndex((e, i) => i > 0 && e.type === 'skillUsed');
  const m = new Map<string, number>();
  for (const e of next < 0 ? all : all.slice(0, next)) {
    const d = e as Extract<BattleEvent, { type: 'damage' }>;
    if (e.type !== 'damage' || d.source !== actor || d.redirected || d.status || d.cause || (d.origin !== undefined && d.origin !== 'skill')) continue;
    m.set(d.target, (m.get(d.target) ?? 0) + d.amount + d.absorbed);
  }
  return m;
}

describe('önizleme kullanım ortası ağaç bilgisini sayar', () => {
  it("(a) Wail of the Dead: ödenen cana bağlı bonus (büyük canda) önizleme aralığında", () => {
    // Undead 1+2 (a) kurulumu Bloody Breath + Blood Banshee içerir; bedel mevcut canın oranı, büyük can = büyük bonus
    const { b, actor } = arena('undead', [1, 2], 'a', (c) => (c.maxHp = c.hp = 25000));
    const tgt = b.validTargets(actor.uid, 'wail_of_the_dead')[0]!.uid;
    const hash = stateHash(b);
    const pv = previewSkill(b, actor.uid, 'wail_of_the_dead', tgt);
    expect(stateHash(b)).toBe(hash);
    expect(previewSkill(b, actor.uid, 'wail_of_the_dead', tgt)).toEqual(pv); // ödenecek can önizleme sonrası sızmadı
    const from = b.log.length;
    expect(b.useSkill(actor.uid, 'wail_of_the_dead', tgt).ok).toBe(true);
    const real = realHits(b, from, actor.uid);
    const shown = pv.filter((p) => p.damage);
    expect(shown.length).toBeGreaterThan(0);
    for (const p of shown) {
      const got = real.get(p.uid) ?? 0;
      expect(got, p.uid).toBeGreaterThanOrEqual(p.damage!.min);
      expect(got, p.uid).toBeLessThanOrEqual(p.damage!.max);
    }
  });

  it("(b) Whirlwind: preHit Wound (Gore Wheel + Reaper's Spin) önizlemede sayılır, hedef durumu değişmez", () => {
    // Tam can: Berserker (eksik cana bağlı) kullanım ortası şifayla oynamasın (bilinen yumuşak açık C)
    const { b, actor } = arena('warrior', [2, 3], 'b', (c) => c.maxHp);
    const tgt = b.validTargets(actor.uid, 'whirlwind')[0]!.uid;
    const before = b.combatants.map((c) => JSON.stringify(c.statuses));
    const hash = stateHash(b);
    const pv = previewSkill(b, actor.uid, 'whirlwind', tgt);
    // önizleme saf: durumlar ve desync özeti aynı, ikinci önizleme ilkinin aynısı (geçici Wound sızmadı)
    expect(b.combatants.map((c) => JSON.stringify(c.statuses))).toEqual(before);
    expect(stateHash(b)).toBe(hash);
    expect(previewSkill(b, actor.uid, 'whirlwind', tgt)).toEqual(pv);
    const from = b.log.length;
    expect(b.useSkill(actor.uid, 'whirlwind', tgt).ok).toBe(true);
    const real = realHits(b, from, actor.uid);
    const shown = pv.filter((p) => p.damage);
    expect(shown.length).toBeGreaterThanOrEqual(2);
    for (const p of shown) {
      const got = real.get(p.uid) ?? 0;
      expect(got, p.uid).toBeGreaterThan(1); // eskiden önizleme 1 gösteriyordu
      expect(got, p.uid).toBeGreaterThanOrEqual(p.damage!.min);
      expect(got, p.uid).toBeLessThanOrEqual(p.damage!.max);
    }
  });
});
