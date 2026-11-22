import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import { droppedBy, procKind } from '../src/sim/tree-sim';

/**
 * r41 inceleme B (ölçüm kusurları): çalışan ama sayacı "hiç tetiklenmedi" gösteren düğümler. Düzeltme YALNIZ sayaç/işaret:
 * B1 'target' kancası (yan vuruş splash, zemin genişletme groundWide) derlemede düğüm işareti yazar, motor tetiklenince treeProc sayar;
 * B2 Endless Rattle (repeatChain kuralı) her ek tekrarda sayılır; B3 üst düğümün `drop`u ile yerine geçilen düğüm ölü sayılmaz (sim raporu).
 * Savaş sonucu değişmez: işaretli ve işaretsiz (işaretler silinmiş) derleme aynı seed'de birebir aynı olay akışı verir.
 */
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
function only(cls: string, ranks: Record<string, number>): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
/** Ölçüm işaretleri silinmiş kopya (düzeltme öncesi derlemenin eşi). */
const unmarked = (tree: UnitSetup['tree']): UnitSetup['tree'] => JSON.parse(JSON.stringify(tree, (k, v) => (k === 'treeNode' || k === 'treeWideNode' ? undefined : v)));

const strip = (log: BattleEvent[]): string => JSON.stringify(log, (k, v) => (k === 'treeNode' || k === 'treeWideNode' ? undefined : v));

const PARTY = { 0: 'skald', 1: 'paladin', 3: 'mage', 4: 'gambler' };
const FOES = { 0: 'warrior', 1: 'defender', 2: 'warrior', 3: 'archer', 4: 'cutthroat', 5: 'mage' };
const TREES = (): Record<number, UnitSetup> => ({
  0: { tree: only('skald', { '1.ea': 1 }) },
  1: { tree: only('paladin', { '1.eb': 1 }) },
  3: { tree: only('mage', { '4.u3': 1 }) },
  4: { tree: only('gambler', { '1.n0': 1 }) },
});
function battle(units: Record<number, UnitSetup>, seed: number): Battle {
  const teams: Teams = { party: cells(PARTY), enemies: cells(FOES), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
}
/** İki taraf da YZ ile oynar (en çok 400 hamle). */
function play(b: Battle): BattleEvent[] {
  for (let i = 0; i < 400 && !b.winner; i++) {
    const a: Combatant | undefined = b.currentActor;
    if (!a) break;
    const r = b.applyChoice(a.uid, chooseAction(b, a.uid, content.aiConfig));
    if (!r.ok) expect(b.skipTurn().ok).toBe(true);
  }
  return b.log;
}
const procsOf = (b: Battle): Record<string, number> => Object.fromEntries(b.treeProcs().filter((p) => p.uid.startsWith('party')).map((p) => [p.node, p.count]));

describe('ağaç ölçüm işaretleri (r41 B)', () => {
  it('B1: derleme yan vuruş ve zemin genişletmeye düğüm işareti yazar', () => {
    const skald = only('skald', { '1.ea': 1 })!;
    expect(JSON.stringify(skald)).toContain('"treeNode":"skald:1.ea"');
    expect(JSON.stringify(only('paladin', { '1.eb': 1 }))).toContain('"treeNode":"paladin:1.eb"');
    expect(JSON.stringify(only('mage', { '4.u3': 1 }))).toContain('"treeWideNode":"mage:4.u3"');
  });

  it('B1 + B2: savaşta yan vuruş, genişleyen zemin ve Double Hit zinciri sayılır; işaretler savaşı değiştirmez (aynı seed, aynı olay akışı)', () => {
    const want = ['skald:1.ea', 'paladin:1.eb', 'mage:4.u3'];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12 && seen.size < want.length; seed++) {
      const marked = battle(TREES(), seed);
      const plain = battle(Object.fromEntries(Object.entries(TREES()).map(([k, u]) => [k, { tree: unmarked(u.tree) }])), seed);
      // battleStart'taki skill tanımları işareti taşır (yalnız o alan farklı); onu atınca akış birebir aynı olmalı
      expect(strip(play(marked))).toBe(strip(play(plain)));
      expect(marked.winner).toBe(plain.winner);
      const p = procsOf(marked);
      for (const n of want) if (p[n]) seen.add(n);
      // işaretsiz derlemede B1 düğümleri sayılmaz (eski davranış: "hiç tetiklenmedi")
      const q = procsOf(plain);
      for (const n of ['skald:1.ea', 'paladin:1.eb', 'mage:4.u3']) expect(q[n] ?? 0).toBe(0);
    }
    expect([...seen].sort()).toEqual([...want].sort());
  });

  it('B2: Endless Rattle (1.n0) Double Hit zincirinin her ek tekrarında sayılır; sayaç savaşı değiştirmez', () => {
    const run = (tree: boolean) => {
      const teams: Teams = { party: cells({ 0: 'gambler' }), enemies: cells({ 0: 'defender' }), units: { party: tree ? { 0: { tree: only('gambler', { '1.n0': 1 }) } } : {}, enemies: {} } };
      const b = new Battle(content.battleSetup('random-battle', 5, 'test', teams, false));
      Object.assign(b.debug, { miss: 'never', dodge: 'never' });
      const me = b.combatants.find((c) => c.side === 'party')!;
      const foe = b.combatants.find((c) => c.side === 'enemy')!;
      foe.hp = foe.maxHp = 99999;
      // tekrar ve zincir neredeyse kesin (aynı şans her halkada); kopya: sınıf verisi paylaşılır, değiştirilmez
      const pas = me.passive!;
      me.passive = { ...pas, effect: { ...pas.effect, chance: 0.9 } as typeof pas.effect };
      const eff = me.passive.effect as unknown as { chance: number; skills: number[] };
      const skill = me.skills[eff.skills[0]!]!;
      me.cooldowns[skill] = 0;
      me.mp = me.maxMp;
      const from = b.log.length;
      expect(b.useSkill(me.uid, skill, foe.uid).ok).toBe(true);
      const hits = b.log.slice(from).filter((e) => e.type === 'damage' && e.source === me.uid && e.target === foe.uid).length;
      return { hits, procs: b.treeProcs().find((p) => p.node === 'gambler:1.n0')?.count ?? 0 };
    };
    const chain = run(true);
    // ilk vuruş + ilk tekrar zincir değil; sonrası (zincir halkası) sayılır
    expect(chain.procs).toBeGreaterThan(0);
    expect(chain.hits - 2).toBe(chain.procs);
    expect(run(false).procs).toBe(0);
  });

  it("B1: sim ölçüm türü: yan vuruş / zemin genişletme sayılır, skill'i kalıcı değiştiren öbür 'target' kancaları sürekli (static)", () => {
    const fx = (k: string, cls: string) => treeOf(cls)!.nodes[k]!.fx;
    expect(procKind(fx('1.ea', 'skald'))).toBe('proc');
    expect(procKind(fx('4.u3', 'mage'))).toBe('proc');
    expect(procKind([{ k: 'hook', h: 'target', area: { shape: 'plus' } } as never])).toBe('static');
    expect(procKind([{ k: 'hook', h: 'target', range: 2 } as never])).toBe('static');
  });

  it('B3: üst düğümün drop ettiği alt düğüm ölü sayılmaz (Hexer 4.u1, Druid 4.u1 / 4.u2, Cutthroat 1.eb)', () => {
    expect([...droppedBy('hexer', ['4.u1', '4.u2', '4.u3'])]).toContain('4.u1');
    const druid = droppedBy('druid', ['4.u1', '4.u2', '4.u3']);
    expect(druid.has('4.u1') && druid.has('4.u2')).toBe(true);
    expect([...droppedBy('cutthroat', ['1.eb', '1.mb'])]).toContain('1.eb');
    // yalnız alınmışsa: alt düğüm build'de yoksa liste boş, üst düğüm alınmamışsa alt düğüm düşmez
    expect(droppedBy('hexer', ['4.u2']).size).toBe(0);
    expect(droppedBy('hexer', ['4.u1']).size).toBe(0);
  });
});
