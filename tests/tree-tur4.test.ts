import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, type AiConfig } from '../src/engine';
import type { TreeData } from '../src/progression/skill-tree-data';
import { compileTree, treeOf } from '../src/progression';

// Ağaç tur 4 (Ömer form r41 tr8, 2026-11-22): sayıyla düzelmeyen düğümler var olan fx kalıplarıyla değişti.
// Derlenen skill tanımı = YZ'nin ve önizlemenin okuduğu değer; burada veriden okunur.
const comp = (cls: string, r: Record<string, number>) => {
  const t = treeOf(cls)!;
  return compileTree(t, { v: t.version, r })!;
};
const fx = (cls: string, key: string, i: number) => treeOf(cls)!.nodes[key]!.fx![i] as unknown as { v: number; effect?: { share: number } };
const S = content.skills;

describe('ağaç tur 4: derlenen skill değerleri', () => {
  it('Warrior Reckless Heat: Charge bekleme 3, Stun 1 tur', () => {
    const ch = comp('warrior', { '3.fb': 1 }).skills!.charge!;
    expect(ch.cooldown).toBe(fx('warrior', '3.fb', 2).v);
    expect(ch.cooldown).toBeLessThan(S.charge!.cooldown!);
    expect((ch.effects.find((e) => e.type === 'status' && e.status === 'stun') as { turns: number }).turns).toBe(1);
  });

  it('Gambler Smoke Cards: Card Trick hasarı silinmez, veriden azalır; Blind eklenir', () => {
    const ct = comp('gambler', { '3.fb': 1 }).skills!.card_trick!;
    const base = S.card_trick!.effects.find((e) => e.type === 'damage') as { power: number };
    const d = ct.effects.find((e) => e.type === 'damage') as { power: number };
    expect(d.power).toBeCloseTo(base.power * (1 + fx('gambler', '3.fb', 0).v), 6);
    expect(ct.effects.some((e) => e.type === 'status' && e.status === 'blinded')).toBe(true);
  });

  it('Skald Thunder Drum: War Drum Haste süresi +1 tur', () => {
    const wd = comp('skald', { '3.fb': 1 }).skills!.war_drum!;
    const base = S.war_drum!.effects.find((e) => e.type === 'status' && e.status === 'haste') as { turns: number };
    expect((wd.effects.find((e) => e.type === 'status' && e.status === 'haste') as { turns: number }).turns).toBe(base.turns + fx('skald', '3.fb', 2).v);
  });

  it('Redtithe Cloistered Ward: Mirror Vein kan bedeli veriden düşer', () => {
    const sw = comp('antimage', { '3.fb': 1 }).skills!.spell_ward!;
    expect(sw.cost.amount).toBe(S.spell_ward!.cost.amount + fx('antimage', '3.fb', 3).v);
  });

  it('Undead Blood Oath %10, Iron Oath %20: veri ve metin aynı', () => {
    const mb = treeOf('undead')!.nodes['3.mb']!;
    const fb = treeOf('undead')!.nodes['3.fb']!;
    const share = fx('undead', '3.mb', 0).effect!.share;
    expect(mb.text).toContain(`${+(share * 100).toFixed(3)}%`);
    expect(fb.text).toContain(`${+(fx('undead', '3.fb', 0).v * 100).toFixed(3)}% instead of ${+(share * 100).toFixed(3)}%`);
  });
});

// Tur 4 ek (Ömer form r41 t9, 2026-11-22): Reckless Heat 30 Rage (bekleme 3 aynı), Thunder Drum Haste %50 güçlü (statusPotency, Taut Skin kalıbı)
describe('ağaç tur 4 ek: Reckless Heat 30 Rage, Thunder Drum güçlü Haste', () => {
  const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
  const ai: AiConfig = { ...content.aiConfig, global: undefined };

  it('Reckless Heat: derlenen rage kancası veriden (30), Charge bekleme 3 kalır', () => {
    const t = comp('warrior', { '3.fb': 1 });
    const node = treeOf('warrior')!.nodes['3.fb']!;
    const gain = (node.fx!.find((x) => (x as { h?: string }).h === 'rage') as unknown as { gain: number }).gain;
    expect(gain).toBe(30);
    expect(node.text).toContain(`${gain} Rage`);
    expect((t.hooks ?? []).some((h) => h.node === 'warrior:3.fb' && (h as unknown as { gain?: number }).gain === gain)).toBe(true);
    expect(t.skills!.charge!.cooldown).toBe(3);
  });

  const skaldBattle = (tree: TreeData) => {
    const setup = content.battleSetup('random-battle', 3, 'test', { party: cells({ 4: 'skald' }), enemies: cells({ 1: 'warrior' }), units: { party: { 4: { tree: compileTree(tree, { v: tree.version, r: { '3.fb': 1 } })! } }, enemies: {} } }, false);
    const b = new Battle(setup);
    b.debugClearCooldowns();
    for (const c of b.combatants) c.hp = c.maxHp = 5000;
    return b;
  };
  const noPotency = (): TreeData => {
    const t = JSON.parse(JSON.stringify(treeOf('skald')!)) as TreeData;
    const n = t.nodes['3.fb']!;
    n.fx = n.fx!.filter((x) => !JSON.stringify(x).includes('statusPotency'));
    return t;
  };
  const sk = (b: Battle) => b.combatants.find((c) => c.side === 'party' && c.defId === 'skald')!;

  it('Thunder Drum: War Drum Skald\'a verdiği Haste\'i +%50 güçlü yapar (hız çarpanı 1,3 -> 1,45)', () => {
    const pot = (treeOf('skald')!.nodes['3.fb']!.fx!.find((x) => JSON.stringify(x).includes('statusPotency')) as unknown as { mod: { statusPotency: { speedMult: number } } }).mod.statusPotency.speedMult;
    const hasteMult = content.statuses.haste!.speedMult!;
    expect(pot / (hasteMult - 1)).toBeCloseTo(0.5, 9); // "50% stronger"
    const speedAfter = (t: TreeData) => {
      const b = skaldBattle(t);
      const me = sk(b);
      const base = b.speedOf(me);
      me.mp = me.maxMp;
      expect(b.useSkill(me.uid, 'war_drum', me.uid).ok).toBe(true);
      return b.speedOf(me) / base;
    };
    const withPot = speedAfter(treeOf('skald')!);
    const without = speedAfter(noPotency());
    expect(without).toBeCloseTo(hasteMult, 3);
    expect(withPot).toBeCloseTo(hasteMult + pot, 3);
  });

  it('YZ: güçlü Haste War Drum değerini artırır (derlenen ağaçtan okunur)', () => {
    const val = (t: TreeData) => {
      const b = skaldBattle(t);
      const me = sk(b);
      me.mp = me.maxMp;
      return Math.max(0, ...explainChoice(b, me.uid, ai)!.candidates.filter((c) => c.skill === 'war_drum').map((c) => c.terms?.control ?? 0));
    };
    expect(val(treeOf('skald')!)).toBeGreaterThan(val(noPotency()));
  });
});
