// Kalkan ham hasar kuralının muafiyeti (Ömer 2026-11-21, form r40): YALNIZ iki Redtithe düğümü, Spell-Proof Vein (3.f3, büyü) ve Warded Steps
// (bar[3], fiziksel), kendi yüzdesini Mirror Vein kalkanı altındaki dosta gelen ilgili türdeki vuruşa kalkana çarpmadan ÖNCE uygular. Zırh ve öbür
// azaltmalar yine yalnız cana inen kısma. Önizleme gerçek sonuçla aynı. Sayılar veriden (düğüm mul, formulas.json > armor.k).
import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import { armorReduction } from '../src/engine/stats';

const F = content.formulas;
const K = F.armor.k; // zırh = k => savunma oranı 0,5
const MODES: BattleMode[] = ['turns', 'test'];
const A = treeOf('antimage')!;
type Dmg = Extract<BattleEvent, { type: 'damage' }>;
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');

/** Yalnız verilen düğüm / bar fx'iyle derlenen Redtithe ağacı (öbürleri boş). */
function only(ranks: Record<string, number>, bar?: number): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(A)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b, i) => {
    if (i !== bar) b.fx = null;
  });
  const r: Record<string, number> = { ...ranks };
  if (bar !== undefined) r['zz.fill'] = (bar + 1) * 5;
  return compileTree(t, { v: t.version, r });
}
const WARDED = (A.mastery.bar[3]!.fx![0] as unknown as { mul: number }).mul;
const SPELLPROOF = (A.nodes['3.f3']!.fx![0] as unknown as { mul: number }).mul;
const RANK = 5;

/** Saldıran (party) ön sırada, Redtithe (enemy) ön sırada; sapma / iska / kritik yok. turns: saldıranın sırası gelene dek pas. */
function make(by: string, mode: BattleMode, tree?: UnitSetup['tree']): Battle {
  const setup = content.battleSetup('random-battle', 11, mode, { party: cells({ 0: by }), enemies: cells({ 0: 'antimage' }), units: { party: {}, enemies: tree ? { 0: { tree } } : {} } }, false);
  setup.formulas = { ...setup.formulas, damage: { ...setup.formulas.damage, variance: 0, elementVariance: {} } };
  const b = new Battle(setup);
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  const me = b.combatants.find((c) => c.side === 'party' && c.slot === 0)!;
  if (mode === 'turns') for (let i = 0; i < 80 && b.currentUid !== me.uid; i++) b.skipTurn();
  return b;
}
const at = (b: Battle, side: 'party' | 'enemy'): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === 0)!;

/** Redtithe zırhlı (iki zırh = k), dayanıklı, kendi Mirror Vein kalkanı altında (`shield` puan). */
function prep(t: Combatant, shield: number): void {
  t.stats = { ...t.stats, armor: K, magicArmor: K };
  t.maxHp = 100000;
  t.hp = 100000;
  t.shield = shield;
  t.magicShield = 0;
  t.shieldHooks = shield > 0 ? [{ skill: 'spell_ward', caster: t.uid, magic: false, amount: shield, onAbsorb: {}, turns: 2 }] : [];
}

/** Önizleme + gerçek vuruş (kalkandan düşen, cana inen). */
function run(mode: BattleMode, sk: { by: string; id: string }, shield: number, tree?: UnitSetup['tree']) {
  const b = make(sk.by, mode, tree);
  const t = at(b, 'enemy');
  prep(t, shield);
  const me = at(b, 'party');
  me.stats = { ...me.stats, str: 800, int: 800, dex: 800 }; // büyük vuruş: oran 2 basamak
  me.mp = me.maxMp;
  const pv = previewSkill(b, at(b, 'party').uid, sk.id, t.uid).find((p) => p.uid === t.uid)!.damage!;
  const r = b.useSkill(at(b, 'party').uid, sk.id, t.uid);
  if (!r.ok) throw new Error(r.reason);
  const d = r.events.filter((e): e is Dmg => e.type === 'damage' && e.target === t.uid && e.origin === 'skill');
  return { pv, absorbed: d.reduce((s, e) => s + e.absorbed, 0), hpLost: d.reduce((s, e) => s + e.amount, 0) };
}

const PHYS = { by: 'archer', id: 'quick_shot' }; // tek vuruş
const PHYS2 = { by: 'warrior', id: 'melee_attack' }; // iki vuruş: kalkan ilk vuruşta kırılırsa ikinciye düğüm işlemez
const MAGIC = { by: 'mage', id: 'fire_bolt' };
const CASES = [
  { name: 'Warded Steps (fiziksel)', sk: PHYS, other: MAGIC, tree: () => only({}, 3), mul: WARDED },
  { name: 'Spell-Proof Vein (büyü)', sk: MAGIC, other: PHYS, tree: () => only({ '3.f3': RANK }), mul: SPELLPROOF * RANK },
] as const;

describe('kalkan muafiyeti: Spell-Proof Vein ve Warded Steps kalkana çarpan vuruşu da azaltır', () => {
  for (const c of CASES) {
    it.each(MODES)(`${c.name}: kalkan tamamen emer, kalkandan düşen düğüm yüzdesi kadar az; savunma oranı değişmez (%s)`, (mode) => {
      const base = run(mode, c.sk, 100000);
      const node = run(mode, c.sk, 100000, c.tree());
      expect(base.hpLost).toBe(0);
      expect(node.hpLost).toBe(0);
      expect(base.absorbed).toBeGreaterThan(200);
      // kalkana çarpan = ham vuruş x (1 + mul); zırh (oran 0,5) kalkana işlemez
      expect(node.absorbed / base.absorbed).toBeCloseTo(1 + c.mul, 2);
      // düğüm yüzdesi savunma oranına (keep) girmez: oran yalnız zırh (büyüde Redtithe'in kan barı büyü zırhı da)
      expect(node.pv.keep).toBeDefined();
      expect(node.pv.keep).toBeCloseTo(base.pv.keep!, 6);
      if (c.sk === PHYS) expect(node.pv.keep).toBeCloseTo(1 - armorReduction(K, F), 6);
    });

    it.each(MODES)(`${c.name}: kalkan kırılınca kalan kısım cana zırhla iner; öbür türde fark yok (%s)`, (mode) => {
      const full = run(mode, c.sk, 100000, c.tree()).absorbed; // düğümlü ham vuruş (kalkana çarpan)
      const S = Math.floor(full / 3);
      const part = run(mode, c.sk, S, c.tree());
      expect(part.absorbed).toBe(S);
      const keep = part.pv.keep!;
      expect(Math.abs(part.hpLost - (full - S) * keep)).toBeLessThanOrEqual(2); // yuvarlama
      // öbür tür (fiziksel düğümde büyü, büyü düğümünde fiziksel): kalkan aynı yer
      expect(run(mode, c.other, 100000, c.tree()).absorbed).toBe(run(mode, c.other, 100000).absorbed);
    });

    it.each(MODES)(`${c.name}: önizleme gerçek sonuçla aynı (tam / kısmi / kalkansız; çok vuruşlu skill dahil) (%s)`, (mode) => {
      for (const [sk, shield] of [[c.sk, 100000], [c.sk, 37], [c.sk, 0], [PHYS2, 100000], [PHYS2, 37], [PHYS2, 0]] as const) {
        const r = run(mode, sk, shield, c.tree());
        expect(r.pv.absorbed ?? 0).toBe(r.absorbed);
        expect(r.pv.hpLoss).toBe(r.hpLost);
      }
    });
  }

  it('muafiyet yalnız bu iki düğümde: kalkan koşullu (shield) damageTaken kancası başka hiçbir ağaçta yok', () => {
    const found: string[] = [];
    for (const id of Object.keys(content.classes)) {
      const t = treeOf(id);
      if (!t) continue;
      const fxs: Array<[string, unknown[] | null | undefined]> = [...Object.entries(t.nodes).map(([k, n]) => [k, n.fx] as [string, unknown[] | null | undefined]), ...t.mastery.bar.map((b, i) => [`bar[${i}]`, b.fx] as [string, unknown[] | null | undefined])];
      for (const [k, fx] of fxs) for (const f of fx ?? []) {
        const h = f as { k?: string; h?: string; on?: string; shield?: string };
        if (h.k === 'hook' && h.on === 'damageTaken' && h.shield) found.push(`${id}:${k}`);
      }
    }
    expect(found.sort()).toEqual(['antimage:3.f3', 'antimage:bar[3]']);
  });

  it('Wiki Shields makalesi muafiyeti iki düğümün adıyla yazar', async () => {
    const { buildMechanics } = await import('../src/wiki/catalog');
    const text = JSON.stringify(buildMechanics().find((x) => x.id === 'shields')?.blocks ?? null);
    expect(text).toContain(A.nodes['3.f3']!.name);
    expect(text).toContain(A.mastery.bar[3]!.name);
    expect(text).toContain(content.skills.spell_ward!.name);
  });
});
