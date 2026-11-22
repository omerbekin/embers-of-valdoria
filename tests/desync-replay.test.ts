/**
 * Güvenlik ağı (denetim r39 madde 11.1 / 11.2): aynı seed + aynı girdi = birebir aynı savaş. Her kompozisyon YZ'yle iki kez oynatılır
 * (arada BAŞKA bir savaş koşar: YZ / motor modül önbellekleri bir savaştan ötekine sızarsa yakalanır). Karşılaştırılan iki özet:
 * - olay akışı özeti: bütün `log`un FNV-1a özeti (desync özeti `stateHash`in kapsamadığı RNG, seri, durum gücü gibi alanların etkisi olaya yansır),
 * - adım adım `stateHash` (çok oyunculu desync denetiminin kullandığı özet).
 * Ayrışmada ilk farklı olayın sırası ve iki olay yazılır. Ağaçsız + ağaçlı (iki evolve'lu odak kurulumu) kompozisyonlar, `turns` modu.
 */
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, type Teams, type UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { focusBuild } from '../src/progression/skill-tree';
import { fnv1a, stateHash } from '../src/net/state-hash';

const MAX_STEPS = 160; // savaş çoğunlukla daha erken biter; erken çık (yük altında süre sınırı)
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');

interface Comp {
  name: string;
  seed: number;
  party: Record<number, string>;
  enemies: Record<number, string>;
  /** Ağaçlı kurulum: yuva -> [ön satır, ikinci satır] (focusBuild, level 50: iki evolve). */
  trees?: Record<number, [number, number]>;
}

const COMPS: Comp[] = [
  { name: 'ağaçsız: warrior/paladin/mage/archer vs defender/hexer/gambler/druid', seed: 7, party: { 0: 'warrior', 1: 'paladin', 6: 'mage', 7: 'archer' }, enemies: { 0: 'defender', 6: 'hexer', 7: 'gambler', 8: 'druid' } },
  { name: 'ağaçsız: skald/vesper/cutthroat/antimage vs undead/defender/archer/mage', seed: 23, party: { 0: 'cutthroat', 1: 'skald', 6: 'vesper', 7: 'antimage' }, enemies: { 0: 'undead', 1: 'defender', 6: 'archer', 7: 'mage' } },
  {
    name: 'ağaçlı: warrior/hexer/druid/gambler (evolve) vs ağaçsız karışık',
    seed: 41,
    party: { 0: 'warrior', 6: 'hexer', 7: 'druid', 8: 'gambler' },
    enemies: { 0: 'defender', 1: 'paladin', 6: 'mage', 7: 'vesper' },
    trees: { 0: [1, 2], 6: [3, 1], 7: [2, 3], 8: [1, 3] },
  },
  {
    name: 'ağaçlı: undead/skald/mage/antimage (evolve) vs ağaçsız karışık',
    seed: 97,
    party: { 0: 'undead', 1: 'skald', 6: 'mage', 7: 'antimage' },
    enemies: { 0: 'warrior', 1: 'cutthroat', 6: 'hexer', 7: 'archer' },
    trees: { 0: [2, 3], 1: [1, 2], 6: [1, 3], 7: [3, 2] },
  },
];

function build(c: Comp): Battle {
  const units: Record<number, UnitSetup> = {};
  for (const [slot, rows] of Object.entries(c.trees ?? {})) {
    const cls = c.party[Number(slot)]!;
    const tree = treeOf(cls)!;
    units[Number(slot)] = { tree: compileTree(tree, focusBuild(tree, rows, 50))! };
  }
  const teams: Teams = { party: cells(c.party), enemies: cells(c.enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', c.seed, 'turns', teams, false));
}

interface Run {
  steps: string[];
  log: string[];
  hash: string;
  winner: string | null;
}

function play(c: Comp): Run {
  const b = build(c);
  const steps: string[] = [stateHash(b)];
  for (let i = 0; i < MAX_STEPS && !b.winner; i++) {
    const actor = b.currentUid!;
    const r = b.applyChoice(actor, chooseAction(b, actor, content.aiConfig));
    if (!r.ok) throw new Error(`${c.name}: adım ${i} geçersiz (${JSON.stringify(r)})`);
    steps.push(stateHash(b));
  }
  const log = b.log.map((e) => JSON.stringify(e));
  return { steps, log, hash: fnv1a(log.join('\n')), winner: b.winner ?? null };
}

/** İlk ayrılan olay (yoksa null): kök sebebi gösterir. */
function firstDiff(a: string[], b: string[]): string | null {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return `olay ${i}: ${a[i] ?? '(yok)'}  <>  ${b[i] ?? '(yok)'}`;
  return null;
}

describe('desync özeti: aynı seed + aynı girdi iki koşuda birebir aynı', () => {
  it('ağaçlı kompozisyonlar gerçekten ağaç kancası taşıyor (test boşa dönmesin)', () => {
    for (const c of COMPS.filter((x) => x.trees)) {
      const b = build(c);
      for (const slot of Object.keys(c.trees!)) {
        const u = b.combatants.find((x) => x.side === 'party' && x.slot === Number(slot))!;
        expect(u.treeHooks?.length ?? 0, `${c.name} yuva ${slot}`).toBeGreaterThan(0);
        const rows = c.trees![Number(slot)]!;
        const r = focusBuild(treeOf(u.defId)!, rows, 50).r;
        expect([r[`${rows[0]}.v`], r[`${rows[1]}.v`]], `${c.name} yuva ${slot}: iki evolve`).toEqual([1, 1]);
      }
    }
  });

  for (const [i, c] of COMPS.entries()) {
    it(c.name, () => {
      const a = play(c);
      play(COMPS[(i + 1) % COMPS.length]!); // araya başka savaş: modül önbelleği sızıntısı
      const b = play(c);
      expect(a.log.length, 'olay akışı boş olmamalı').toBeGreaterThan(20);
      expect(firstDiff(a.log, b.log), 'ilk ayrılan olay').toBeNull();
      expect(b.hash).toBe(a.hash);
      expect(b.steps).toEqual(a.steps);
      expect(b.winner).toBe(a.winner);
    });
  }
});
