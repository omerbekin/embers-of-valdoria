import { describe, expect, it } from 'vitest';
import { Battle, content, type Teams } from '../src/engine';
import { treeOf } from '../src/progression';
import { TREES, type TreeData } from '../src/progression/skill-tree-data';
import { treePool } from '../src/progression/skill-tree';
import { normalizeTree, type TreeHero } from '../src/progression/skill-tree-hero';
import { carrySetup, cleanCarry } from '../src/endless/carry';

// Redtithe (id antimage, engine-dev 2026-11-17) kayıt uyumu: eski (sürüm 5, Anti-Mage) ağaç dağılımları ve eski Endless taşıma kaydı
// hata vermeden okunur. Pasif (inactive) düğümde puan varsa ağacın tamamı bedava iade edilir (treeReset); yalnız eşlenen düğümlerde puan
// varsa ağaç kalır ve bir kez bedava respec hakkı (freeRespec) gelir.

const T = treeOf('antimage')!;
// r36 (Ömer 2026-11-20): Redtithe ağacında pasif düğüm kalmadı; "pasif düğümde puan" yolu sentetik kopyayla (bir düğüm pasif) sınanır.
// Sürüm 6 kaldı: pasif düğümler v6'da alınamıyordu (ve arkalarındaki yol kapalıydı), v6 kayıtlarında bu düğümlerde puan yok.
const inactiveKey = '0.f2';
const withSynthetic = (fn: () => void): void => {
  const real = TREES.antimage!;
  const syn = JSON.parse(JSON.stringify(real)) as TreeData;
  syn.nodes[inactiveKey]!.inactive = true;
  TREES.antimage = syn;
  try {
    fn();
  } finally {
    TREES.antimage = real;
  }
};
const hero = (r: Record<string, number>, level = 20): TreeHero => ({ id: 'h1', class: 'antimage', level, skillPoints: 0, tree: { v: T.version - 1, r } });

describe('Redtithe kayıt uyumu', () => {
  it('ağaç sürümü 6 (eski kayıt bedava respec alır); r36 sonrası pasif düğüm yok', () => {
    expect(T.version).toBeGreaterThanOrEqual(6);
    expect(Object.values(T.nodes).some((n) => n.inactive)).toBe(false);
  });

  it('eski kayıt pasif düğümde puan taşıyorsa: hata yok, ağaç tamamen iade, treeReset (sentetik pasif düğüm)', () =>
    withSynthetic(() => {
      const h = hero({ '0.f1': 1, [inactiveKey]: 1 });
      expect(() => normalizeTree(h)).not.toThrow();
      expect(h.tree).toBeUndefined();
      expect(h.treeReset).toBe(true);
      expect(h.skillPoints).toBe(treePool(20));
      // idempotent: ikinci okuma bir şey değiştirmez
      const snap = JSON.stringify(h);
      normalizeTree(h);
      expect(JSON.stringify(h)).toBe(snap);
    }));

  it('eski kayıt yalnız eşlenen (etkin) düğümde puan taşıyorsa: ağaç kalır, sürüm güncellenir, bir kez bedava respec', () => {
    const h = hero({ '0.f1': 1 });
    normalizeTree(h);
    expect(h.treeReset).toBeUndefined();
    expect(h.tree).toEqual({ v: T.version, r: { '0.f1': 1 } });
    expect(h.freeRespec).toBe(true);
    expect(h.skillPoints).toBe(treePool(20) - 1);
  });

  it('eski Endless taşıma kaydı (mpRatio, kan alanı yok) Redtithe savaşını bozmaz: MP 0 kalır, kan başlangıç değerinde', () => {
    const carry = cleanCarry({ mpRatio: 0.4, cooldowns: { mana_burn: 1 } })!;
    expect(carry.mpRatio).toBe(0.4);
    const setup = carrySetup(carry, 'party-0', () => undefined);
    const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const teams: Teams = { party: cells({ 0: 'antimage' }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: setup }, enemies: {} } };
    const b = new Battle(content.battleSetup('random-battle', 1, 'test', teams, false));
    const rt = b.combatants.find((c) => c.side === 'party' && c.defId === 'antimage')!;
    expect(rt.maxMp).toBe(0);
    expect(rt.mp).toBe(0);
    expect(rt.blood).toBe(content.formulas.bloodBar!.start);
  });
});
